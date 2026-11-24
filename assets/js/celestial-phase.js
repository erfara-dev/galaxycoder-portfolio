/* celestial-phase.js — Dual Celestial Clock: phase controller (runs on every page).
   --------------------------------------------------------------------------
   Owns the question "which phase is the website in, and why?":

     Automatic  the phase follows the visitor's local time (schedule in celestial-core.js);
                a timer wakes at each boundary, and re-checks whenever the tab returns.
     Manual     the visitor picked a phase; local time is ignored for the environment
                (the digital clock itself always shows real local time).

   It never animates. When something should change it asks a registered *presenter* (the home
   page's clock supplies one) to show the change; pages without a clock apply it instantly.

   Events (CelestialPhase.on):
     "init"     { mode, phase }
     "target"   { from, to, cause }  a new phase was requested (UI should highlight `to` now)
     "settled"  { phase }            the environment finished arriving at `phase`
     "mode"     { mode }                                                              */
(function () {
  "use strict";

  var C = window.Celestial;
  if (!C) return;

  var root = document.documentElement;
  var listeners = {};
  var presenter = null;
  var timer = null;
  var watchdog = null;

  var state = {
    mode: "auto",
    phase: "noon",     // the phase most recently requested (what the UI shows as selected)
    settled: "noon",   // the phase the environment has fully arrived at
    busy: false,
    pending: null      // latest request made while a transition was running
  };

  /* ---------- tiny event emitter ---------- */
  function on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); }
  function emit(name, data) {
    (listeners[name] || []).forEach(function (fn) {
      try { fn(data || {}); } catch (err) { if (window.console) console.error("[CelestialPhase]", name, err); }
    });
  }

  function snapshot() {
    return { mode: state.mode, phase: state.phase, settled: state.settled, busy: state.busy, scheduled: C.phaseAt(new Date()) };
  }

  /* ---------- moving between phases ---------- */

  function finish(to) {
    if (watchdog) { window.clearTimeout(watchdog); watchdog = null; }
    state.busy = false;
    state.settled = to;
    emit("settled", { phase: to });
    if (state.pending) {
      var next = state.pending;
      state.pending = null;
      go(next.to, next.cause, next.opts);
    }
  }

  function go(to, cause, opts) {
    opts = opts || {};
    if (!C.PHASES[to]) return;

    if (state.busy) {                       // coalesce: only the most recent request matters
      state.pending = { to: to, cause: cause, opts: opts };
      state.phase = to;
      emit("target", { from: state.settled, to: to, cause: cause });
      return;
    }

    var from = state.settled;
    state.phase = to;
    if (to === from) {                      // already there (e.g. Manual → Automatic with no change)
      emit("target", { from: from, to: to, cause: cause });
      return;
    }
    emit("target", { from: from, to: to, cause: cause });

    var instant = opts.instant || document.hidden;
    if (instant || !presenter) {
      if (presenter) presenter.settle(to);
      if (instant) C.env.apply(to); else C.env.fade(to, 1100);   // pages without a clock still fade
      state.settled = to;
      emit("settled", { phase: to });
      return;
    }

    state.busy = true;
    watchdog = window.setTimeout(function () { if (state.busy) finish(to); }, 15000);   // never get stuck
    try {
      presenter.present(from, to, { cause: cause }, function () { finish(to); });
    } catch (err) {
      if (window.console) console.error("[CelestialPhase] presenter failed:", err);
      presenter.settle(to);
      C.env.apply(to);
      finish(to);
    }
  }

  /* ---------- Automatic mode: follow the schedule ---------- */

  function check() {
    timer = null;
    if (state.mode === "auto") {
      var want = C.phaseAt(new Date());
      var have = state.pending ? state.pending.to : state.phase;
      if (want !== have) go(want, "auto");
    }
    schedule();
  }

  function schedule() {
    if (timer !== null) { window.clearTimeout(timer); timer = null; }
    if (state.mode !== "auto" || document.hidden) return;
    var ms = C.nextBoundary(new Date()).at.getTime() - Date.now() + 250;
    /* Wake at the boundary, but never sleep long: a system clock change or DST shift is noticed within 30 s. */
    timer = window.setTimeout(check, Math.max(500, Math.min(ms, 30000)));
  }

  /* ---------- public actions ---------- */

  function setMode(mode) {
    if ((mode !== "auto" && mode !== "manual") || mode === state.mode) return;
    state.mode = mode;
    root.setAttribute("data-celestial-mode", mode);

    if (mode === "manual") {
      /* Automatic → Manual: keep the current visual phase; the visitor picks the next one. */
      C.savePrefs({ mode: "manual", phase: state.phase });
    } else {
      /* Manual → Automatic: recalculate from local time. go() is a no-op if nothing changes,
         and only plays a Sun/Moon transition when the visible clock body must change. */
      C.savePrefs({ mode: "auto" });
      go(C.phaseAt(new Date()), "mode");
    }
    emit("mode", { mode: mode });
    schedule();
  }

  function selectPhase(phase) {
    if (state.mode !== "manual" || !C.PHASES[phase]) return false;
    C.savePrefs({ mode: "manual", phase: phase });
    go(phase, "manual");
    return true;
  }

  /* Header sun/moon button: a quick day ↔ night switch (always a Manual choice). */
  function toggleDayNight() {
    var target = C.PHASES[state.phase].theme === "light" ? "night" : "noon";
    if (state.mode !== "manual") setMode("manual");
    selectPhase(target);
  }

  /* ---------- lifecycle ---------- */

  function syncFromStorage() {
    var prefs = C.loadPrefs();
    if (prefs.mode === "manual") {
      if (state.mode !== "manual") { state.mode = "manual"; root.setAttribute("data-celestial-mode", "manual"); emit("mode", { mode: "manual" }); }
      if (prefs.phase && prefs.phase !== state.phase) go(prefs.phase, "sync");
    } else if (state.mode !== "auto") {
      state.mode = "auto";
      root.setAttribute("data-celestial-mode", "auto");
      emit("mode", { mode: "auto" });
      go(C.phaseAt(new Date()), "sync");
    }
    schedule();
  }

  function init() {
    if (init.done) return;
    init.done = true;
    var prefs = C.loadPrefs();
    state.mode = prefs.mode;
    state.phase = state.settled = C.initialPhase();
    C.env.apply(state.phase);
    root.setAttribute("data-celestial-mode", state.mode);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (timer !== null) { window.clearTimeout(timer); timer = null; } }
      else check();                                   // catch up on anything missed while hidden
    });
    window.addEventListener("pageshow", function (e) { if (e.persisted) check(); });
    window.addEventListener("focus", function () { if (state.mode === "auto") check(); });
    window.addEventListener("storage", function (e) { if (e.key === C.STORAGE_KEY) syncFromStorage(); });

    schedule();
    emit("init", snapshot());
  }

  window.CelestialPhase = {
    init: init,
    on: on,
    getState: snapshot,
    setMode: setMode,
    selectPhase: selectPhase,
    toggleDayNight: toggleDayNight,
    setPresenter: function (p) { presenter = p; }
  };
})();
