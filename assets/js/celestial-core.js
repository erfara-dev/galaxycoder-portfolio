/* celestial-core.js — Dual Celestial Clock: configuration, phase detection, preferences.
   --------------------------------------------------------------------------
   Loaded SYNCHRONOUSLY in <head> of every page (a few KB) so the correct sky and theme
   are on <html> before first paint — no flash of the wrong phase.

   This file is the single source of truth for:
     • the phase schedule (SCHEDULE below — the ONLY place time boundaries live)
     • phase metadata (theme polarity, which body is the digital clock)
     • preference storage (Automatic / Manual)
     • applying a phase to the document (data-phase = sky, data-theme = UI polarity)

   Nothing here animates. Animation lives in celestial-transition.js / orbital-clock.js. */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ======================================================================
     1. CONFIGURATION — edit this block to change when phases happen.
     ====================================================================== */

  /* Each entry starts at its local time (24-hour "HH:MM") and runs until the next entry
     starts; the last entry wraps past midnight into the first. Order does not matter.
       06:00–06:59  sunrise   Moon → Sun transition plays at 06:00
       07:00–17:59  noon      Sun
       18:00–18:59  sunset    Sun remains active and warms toward twilight
       19:00–05:59  night     Moon                                                   */
  var SCHEDULE = [
    { phase: "sunrise", start: "06:00" },
    { phase: "noon",    start: "07:00" },
    { phase: "sunset",  start: "18:00" },
    { phase: "night",   start: "19:00" }
  ];

  /* body   = which celestial object is the digital clock once the phase has settled.
     theme  = UI polarity (maps onto the existing light / dark design tokens).
     meta   = <meta name="theme-color"> for mobile browser chrome.                    */
  var PHASES = {
    noon:    { label: "Noon",    theme: "light", body: "sun",  meta: "#5fb0f5", note: "Solar noon" },
    sunrise: { label: "Sunrise", theme: "dark",  body: "sun",  meta: "#2b2f70", note: "Dawn transit · Moon → Sun" },
    sunset:  { label: "Sunset",  theme: "dark",  body: "sun",  meta: "#3a1f58", note: "Warm twilight · Sun remains active" },
    night:   { label: "Night",   theme: "dark",  body: "moon", meta: "#080b18", note: "Lunar night" }
  };

  /* Order of the buttons in the phase selector. */
  var ORDER = ["sunrise", "noon", "sunset", "night"];

  /* Clock geometry options. `hourZeroAt` is the hour that sits at 12 o'clock on Earth's ring:
     0 = midnight at the top (default, matches the original Galactic Clock), 12 = noon at the top. */
  var CLOCK = { hourZeroAt: 0 };

  var STORAGE_KEY = "dito-celestial";   // { mode: "auto" | "manual", phase?: <phase> }

  /* ======================================================================
     2. PHASE DETECTION (pure, DST-safe — uses the visitor's local wall clock)
     ====================================================================== */

  function parseStart(str) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(str));
    var h = m ? +m[1] : NaN, min = m ? +m[2] : NaN;
    return h >= 0 && h < 24 && min >= 0 && min < 60 ? h * 60 + min : NaN;
  }

  var slots = [];
  SCHEDULE.forEach(function (s) {
    var minutes = parseStart(s.start);
    if (PHASES[s.phase] && !isNaN(minutes)) slots.push({ phase: s.phase, minutes: minutes });
  });
  slots.sort(function (a, b) { return a.minutes - b.minutes; });
  if (!slots.length) slots.push({ phase: "noon", minutes: 0 });   // misconfigured schedule: never throw

  /** The phase that is active at `date` (default: now). */
  function phaseAt(date) {
    date = date || new Date();
    var m = date.getHours() * 60 + date.getMinutes();
    var active = slots[slots.length - 1];                          // before the first slot ⇒ yesterday's last phase
    for (var i = 0; i < slots.length; i++) if (slots[i].minutes <= m) active = slots[i];
    return active.phase;
  }

  /** The next moment the phase changes after `date`: { at: Date, phase }. */
  function nextBoundary(date) {
    date = date || new Date();
    var m = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
    var next = null, dayOffset = 0;
    for (var i = 0; i < slots.length; i++) if (slots[i].minutes > m) { next = slots[i]; break; }
    if (!next) { next = slots[0]; dayOffset = 1; }
    var at = new Date(date.getFullYear(), date.getMonth(), date.getDate() + dayOffset,
                      Math.floor(next.minutes / 60), next.minutes % 60, 0, 0);
    return { at: at, phase: next.phase };
  }

  /* ======================================================================
     3. PREFERENCES — storage is optional; failures fall back to memory.
     ====================================================================== */

  var memory = null;

  function loadPrefs() {
    var raw = null;
    try { raw = window.localStorage.getItem(STORAGE_KEY); } catch (e) { /* unavailable */ }
    if (raw) {
      try {
        var o = JSON.parse(raw);
        if (o && o.mode === "manual") return { mode: "manual", phase: PHASES[o.phase] ? o.phase : null };
        if (o && o.mode === "auto") return { mode: "auto" };
      } catch (e) { /* corrupted value: ignore */ }
    }
    return memory || { mode: "auto" };                             // first visit ⇒ Automatic
  }

  /* Only the MODE is a lasting preference. A phase is stored only alongside mode "manual" and is
     never read in Automatic mode, so a temporary manual choice cannot override Automatic. */
  function savePrefs(prefs) {
    var clean = prefs.mode === "manual" && PHASES[prefs.phase]
      ? { mode: "manual", phase: prefs.phase }
      : { mode: "auto" };
    memory = clean;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean)); } catch (e) { /* session-only */ }
  }

  /* ======================================================================
     4. APPLYING A PHASE TO THE DOCUMENT
        data-phase  → sky, clouds, stars, accent (celestial.css)
        data-theme  → UI polarity (existing dark / light tokens, main.css)
        They are separate so the transition engine can change the sky first and flip the UI
        polarity at the right moment mid-transition.
     ====================================================================== */

  var fadeTimer = null, classTimer = null;

  function setSky(phase) { if (PHASES[phase]) root.setAttribute("data-phase", phase); }

  /* `smooth` tweens the colour tokens (class phase-fade, see celestial.css) instead of snapping. */
  function setTheme(phase, smooth) {
    var p = PHASES[phase];
    if (!p) return;
    if (smooth && root.getAttribute("data-theme") !== p.theme && !reducedMotion()) {
      root.classList.add("phase-fade");
      window.clearTimeout(classTimer);
      classTimer = window.setTimeout(function () { root.classList.remove("phase-fade"); }, 1100);
    }
    root.setAttribute("data-theme", p.theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", p.meta);
  }

  function applyEnv(phase) { setSky(phase); setTheme(phase); }

  /* Sky now, UI polarity after `delay` ms — so the text flips while the sky is half way, not before. */
  function fadeEnv(phase, delay) {
    setSky(phase);
    window.clearTimeout(fadeTimer);
    fadeTimer = window.setTimeout(function () { setTheme(phase, true); }, delay || 0);
  }

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* ======================================================================
     5. FIRST PAINT
     ====================================================================== */

  function initialPhase() {
    var prefs = loadPrefs();
    return prefs.mode === "manual" && prefs.phase ? prefs.phase : phaseAt(new Date());
  }

  root.classList.add("js");
  var boot = initialPhase();
  applyEnv(boot);
  root.setAttribute("data-celestial-mode", loadPrefs().mode);

  window.Celestial = {
    SCHEDULE: SCHEDULE,
    PHASES: PHASES,
    ORDER: ORDER,
    CLOCK: CLOCK,
    STORAGE_KEY: STORAGE_KEY,
    phaseAt: phaseAt,
    nextBoundary: nextBoundary,
    loadPrefs: loadPrefs,
    savePrefs: savePrefs,
    initialPhase: initialPhase,
    env: { sky: setSky, theme: setTheme, apply: applyEnv, fade: fadeEnv },
    reducedMotion: reducedMotion
  };
})();
