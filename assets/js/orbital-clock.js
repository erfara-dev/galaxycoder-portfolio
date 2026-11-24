/* orbital-clock.js — the Dual Celestial Clock (home page).

   Model (all driven by ONE Date per frame — the browser's local wall clock):
     Sun / Moon   digital HH:MM:SS at the centre. The Sun is the clock by day, the Moon by night.
     Asteroid     seconds  — 1 revolution / 60 s   (with milliseconds)
     Planet       minutes  — 1 revolution / 60 min (with fractional seconds)
     Earth        hours    — 1 revolution / 24 h   (with fractional minutes — a 24 h ring, not 12 h)

   Angles are clockwise from 12 o'clock:   x = cx + r·sin θ     y = cy − r·cos θ
   With Celestial.CLOCK.hourZeroAt = 0 (default) 00:00:00 puts every indicator at the top.

   Time is read fresh from `new Date()` on every update (never accumulated), so the clock cannot
   drift; after a hidden tab, sleep or DST jump the next frame is simply correct again.

   This file is three layers, deliberately separate:
     1. Pure maths            (fractions / angles / position / formatTime)      — no DOM
     2. Rendering             (digits, indicator placement, body poses)         — DOM writes only
     3. Presenter             (turns phase changes into Sun/Moon choreography)  — uses celestial-transition.js

   The 12h/24h button changes the digital text ONLY; the orbit maths never reads it. */
(function () {
  "use strict";

  var C = window.Celestial || null;
  var TAU = Math.PI * 2;
  var CX = 200, CY = 200;
  var ORBIT = { asteroid: 82, planet: 126, earth: 170 };
  var BODY_R = { asteroid: 5.4, planet: 15, earth: 9.5 };
  var NAMES = ["earth", "planet", "asteroid"];
  var TRAIL_SEG = 9, TRAIL_GAP = 9, TRAIL_OPACITY = [0.6, 0.34, 0.15];
  var TRAIL_WIDTH = { earth: 2, planet: 1.7, asteroid: 1.4 };
  var FRAME_MS = 1000 / 30;          // orbit motion is capped at 30 fps; digits only change once a second

  /* ======================================================================
     1. PURE MATHS
     ====================================================================== */

  /** Fractions of the current local time. `withMs=false` snaps to whole seconds. */
  function fractions(date, withMs) {
    var sec = date.getSeconds() + (withMs ? date.getMilliseconds() / 1000 : 0);
    var min = date.getMinutes() + sec / 60;
    var hour = date.getHours() + min / 60;            // 0 ≤ hour < 24
    return { sec: sec, min: min, hour: hour };
  }

  /** Orbital angles in radians, clockwise from the top. `mercury`/`venus` are legacy aliases. */
  function angles(date, withMs, hourZeroAt) {
    var f = fractions(date, withMs !== false);
    var zero = hourZeroAt === undefined ? ((C && C.CLOCK && C.CLOCK.hourZeroAt) || 0) : hourZeroAt;
    var a = {
      asteroid: (f.sec / 60) * TAU,
      planet: (f.min / 60) * TAU,
      earth: ((((f.hour - zero) % 24) + 24) % 24 / 24) * TAU
    };
    a.mercury = a.asteroid;
    a.venus = a.planet;
    return a;
  }

  /** Position on an orbit of radius r around (cx, cy). */
  function position(theta, r, cx, cy) {
    cx = cx === undefined ? CX : cx;
    cy = cy === undefined ? CY : cy;
    return { x: cx + r * Math.sin(theta), y: cy - r * Math.cos(theta) };
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /** Digital text. Format only — never feeds the orbit maths. */
  function formatTime(date, use24Hour) {
    var h = date.getHours();
    var suffix = "24H";
    if (!use24Hour) {
      suffix = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
    }
    return { text: pad(h) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds()), suffix: suffix };
  }

  function toLocalDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  function utcOffsetLabel(d) {
    var off = -d.getTimezoneOffset();            // minutes east of UTC
    var sign = off >= 0 ? "+" : "−";
    off = Math.abs(off);
    return "UTC" + sign + pad(Math.floor(off / 60)) + ":" + pad(off % 60);
  }

  /* ======================================================================
     2 + 3. DOM WIRING
     ====================================================================== */

  function init() {
    var root = document.querySelector("[data-galactic-clock]");
    if (!root || root.getAttribute("data-clock-initialized") === "true") return;
    var stage = root.querySelector(".galaxy-clock__stage");
    if (!stage) return;
    root.setAttribute("data-clock-initialized", "true");

    var dateEl = root.querySelector("[data-clock-date]");
    var tzEl = root.querySelector("[data-clock-timezone]");
    var statusEl = root.querySelector("[data-clock-status]");
    var nameEl = root.querySelector("[data-clock-phase-name]");
    var noteEl = root.querySelector("[data-clock-note]");

    /* ---- celestial bodies (digital clock faces) ---- */
    var bodies = {};
    ["sun", "moon"].forEach(function (key) {
      var el = root.querySelector('[data-body="' + key + '"]');
      if (!el) return;
      bodies[key] = {
        el: el,
        art: el.querySelector(".gc-body__art"),
        ui: el.querySelector(".gc-body__ui"),
        time: el.querySelector("[data-clock-time]"),
        suffix: el.querySelector("[data-clock-meridiem]"),
        hint: el.querySelector("[data-clock-hint]"),
        button: el.querySelector("[data-orbital-clock]"),
        pose: ""                                       // last applied pose, to skip identical writes
      };
    });
    if (!bodies.sun || !bodies.moon) return;

    /* ---- indicators ---- */
    var planets = {}, inds = {};
    NAMES.forEach(function (name) {
      var g = root.querySelector('[data-planet="' + name + '"]');
      var trail = root.querySelector('[data-trail="' + name + '"]');
      var segs = trail ? Array.prototype.slice.call(trail.querySelectorAll("circle")) : [];
      var r = ORBIT[name], circ = TAU * r;
      var clearance = (BODY_R[name] + 1.5) / r * (180 / Math.PI);   // trail starts behind the body, not under it
      segs.forEach(function (c, i) {
        c.setAttribute("stroke-dasharray", (circ * TRAIL_SEG / 360).toFixed(2) + " " + circ.toFixed(2));
        c.setAttribute("stroke-width", TRAIL_WIDTH[name]);
        c.setAttribute("opacity", TRAIL_OPACITY[i]);
      });
      planets[name] = { g: g, lit: g && g.querySelector("[data-lit]"), segs: segs, clearance: clearance, lastDeg: null };
      inds[name] = { g: root.querySelector('[data-ind="' + name + '"]'), op: 1 };
    });

    var use24Hour = true;
    var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var reducedMotion = !!(motionQuery && motionQuery.matches);
    var dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    var zoneName = "";
    try { zoneName = new Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { /* ignore */ }

    var shownKey = null, shownDate = null;
    var frame = null, timer = null, visible = true, lastFrame = 0;
    var anim = null;

    /* ---------- rendering ---------- */

    function indicatorsVisible() {
      return inds.earth.op > 0.01 || inds.planet.op > 0.01 || inds.asteroid.op > 0.01;
    }

    function place(name, theta, force) {
      var p = planets[name];
      if (!p || !p.g) return;
      var deg = theta * 180 / Math.PI;
      /* Skip sub-0.1px movements: Earth (hours) barely moves, so it is rewritten only every few seconds. */
      if (!force && p.lastDeg !== null && Math.abs(deg - p.lastDeg) * (Math.PI / 180) * ORBIT[name] < 0.1) return;
      p.lastDeg = deg;
      var pos = position(theta, ORBIT[name]);
      p.g.setAttribute("transform", "translate(" + pos.x.toFixed(2) + " " + pos.y.toFixed(2) + ")");
      // Rotate the shading so the lit side always faces the centre.
      if (p.lit) p.lit.setAttribute("transform", "rotate(" + (deg - 90).toFixed(2) + ")");
      for (var i = 0; i < p.segs.length; i++) {
        var back = p.clearance + i * TRAIL_GAP + TRAIL_SEG;
        p.segs[i].setAttribute("transform", "rotate(" + (deg - 90 - back).toFixed(2) + " " + CX + " " + CY + ")");
      }
    }

    function render(now, force) {
      if (force || indicatorsVisible()) {
        var a = angles(now, !reducedMotion);
        place("asteroid", a.asteroid, force);
        place("planet", a.planet, force);
        place("earth", a.earth, force);
      }

      var f = formatTime(now, use24Hour);
      var key = f.text + f.suffix;
      if (key !== shownKey) {
        var iso = toLocalDate(now) + "T" + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
        ["sun", "moon"].forEach(function (k) {
          var b = bodies[k];
          b.time.textContent = f.text;
          b.time.setAttribute("datetime", iso);
          if (b.suffix) b.suffix.textContent = f.suffix;
        });
        shownKey = key;
      }
      var dateKey = toLocalDate(now);
      if (dateKey !== shownDate) {
        if (dateEl) { dateEl.textContent = dateFormatter.format(now); dateEl.setAttribute("datetime", dateKey); }
        shownDate = dateKey;
      }
      if (tzEl) tzEl.textContent = (zoneName ? zoneName + " · " : "") + utcOffsetLabel(now);   // offset can change with DST
    }

    function setIndicator(name, op) {
      var ind = inds[name];
      if (!ind.g || op === ind.op) return;
      ind.op = op;
      ind.g.style.opacity = op >= 0.999 ? "" : op.toFixed(3);
      ind.g.style.visibility = op <= 0.005 ? "hidden" : "";
    }

    /** Pose of a Sun/Moon face. x is a fraction of the clock's width (a face box is half the clock wide). */
    function setBody(key, v) {
      var b = bodies[key];
      var pose = v.op.toFixed(3) + "|" + v.x.toFixed(4) + "|" + v.s.toFixed(4) + "|" + v.r.toFixed(2) + "|" + v.ui.toFixed(3);
      if (pose === b.pose) return;
      b.pose = pose;
      var hidden = v.op <= 0.004;
      b.el.style.opacity = v.op >= 0.999 ? "1" : v.op.toFixed(3);
      b.el.style.visibility = hidden ? "hidden" : "visible";
      b.el.style.transform = "translate3d(" + (v.x * 200).toFixed(3) + "%,0,0) scale(" + v.s.toFixed(4) + ")";
      b.art.style.transform = "rotate(" + v.r.toFixed(2) + "deg)";
      b.ui.style.opacity = v.ui >= 0.999 ? "1" : v.ui.toFixed(3);
      /* A face that is hidden or still arriving must not be reachable by keyboard or screen reader. */
      var unreachable = hidden || v.ui < 0.9 || v.op < 0.9;
      b.el.toggleAttribute("inert", unreachable);
      b.el.setAttribute("aria-hidden", hidden ? "true" : "false");
    }

    var REST = { op: 1, x: 0, s: 1, r: 0, ui: 1 };
    var GONE = { op: 0, x: 0, s: 1, r: 0, ui: 0 };

    function setLabel(text, op) {
      if (!statusEl) return;
      if (text !== null && statusEl.textContent !== text) statusEl.textContent = text;
      statusEl.style.opacity = op <= 0.004 ? "0" : op.toFixed(3);
    }

    /** Show a settled phase instantly: right body, indicators on, no label. */
    function settle(phase) {
      if (anim) { anim.cancel(); anim = null; }
      stage.classList.remove("is-animating");
      var show = C.PHASES[phase].body, hide = show === "sun" ? "moon" : "sun";
      setBody(show, REST);
      setBody(hide, GONE);
      NAMES.forEach(function (n) { setIndicator(n, 1); });
      setLabel(null, 0);
      render(new Date(), true);
    }

    /* ---------- presenter: phase change → choreography ---------- */

    function present(from, to, ctx, done) {
      var fromBody = C.PHASES[from].body, toBody = C.PHASES[to].body;
      var bodyChange = fromBody !== toBody;

      /* Off-screen, or the same body remains active: settle and let the phase atmosphere fade. */
      if (!visible || !window.CelestialTransition || !bodyChange) {
        settle(to);
        C.env.fade(to, 1100);
        done();
        return;
      }

      var kind = toBody === "sun" ? "sunrise" : "sunset";        // Moon → Sun  /  Sun → Moon
      var outKey = kind === "sunrise" ? "moon" : "sun";
      var incKey = kind === "sunrise" ? "sun" : "moon";
      var preRoll = false;

      setLabel(kind === "sunrise" ? "DAYBREAK" : "NIGHTFALL", 0);
      stage.classList.add("is-animating");
      /* Without a pre-roll the outgoing body is already on stage; with one, the incoming-type body is. */
      setBody(preRoll ? incKey : outKey, REST);
      setBody(preRoll ? outKey : incKey, GONE);

      if (anim) anim.cancel();
      anim = window.CelestialTransition.run(kind, { preRoll: preRoll, reduced: reducedMotion }, {
        render: function (s) {
          setBody(outKey, s.out);
          setBody(incKey, s.inc.active ? s.inc : { op: s.pre.op, x: 0, s: 1, r: 0, ui: 1 });
          NAMES.forEach(function (n) { setIndicator(n, s.ind[n]); });
          setLabel(null, s.label);
          if (indicatorsVisible()) render(new Date(), false);
        },
        commit: function (what) {
          if (what === "sky") C.env.sky(to);
          else C.env.theme(to, true);
        },
        done: function () {
          anim = null;
          stage.classList.remove("is-animating");
          setBody(incKey, REST);
          setBody(outKey, GONE);
          setLabel(null, 0);
          render(new Date(), true);          // indicators come back at the *current* time
          done();
        }
      });
    }

    /* ---------- caption ---------- */

    function describe(phase) {
      var st = window.CelestialPhase ? window.CelestialPhase.getState() : { mode: "auto" };
      var p = C.PHASES[phase];
      if (nameEl) nameEl.textContent = p.label;
      if (noteEl) noteEl.textContent = (st.mode === "auto" ? "Automatic · " : "Manual · ") + p.note;
    }

    /* ---------- animation loop ---------- */

    function tick(ts) {
      frame = null; timer = null;
      if (reducedMotion || !ts || ts - lastFrame >= FRAME_MS - 1) {
        lastFrame = ts || 0;
        render(new Date(), false);
      }
      schedule();
    }

    function schedule() {
      if (!visible || document.hidden) return;
      if (reducedMotion) timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
      else frame = window.requestAnimationFrame(tick);
    }

    function stop() {
      if (frame !== null) { window.cancelAnimationFrame(frame); frame = null; }
      if (timer !== null) { window.clearTimeout(timer); timer = null; }
    }

    function start() {
      if (frame !== null || timer !== null) return;
      render(new Date(), true);          // fresh absolute time on every resume — no drift
      schedule();
    }

    /* ---------- events ---------- */

    function onToggle() {
      use24Hour = !use24Hour;
      ["sun", "moon"].forEach(function (k) {
        var b = bodies[k];
        if (b.hint) b.hint.textContent = (k === "sun" ? "Sun" : "Moon") + " clock: switch to " + (use24Hour ? "12" : "24") + "-hour display";
      });
      shownKey = null;
      render(new Date(), false);         // orbits are untouched by this setting
    }
    bodies.sun.button.addEventListener("click", onToggle);
    bodies.moon.button.addEventListener("click", onToggle);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });
    window.addEventListener("pagehide", stop);
    window.addEventListener("pageshow", function (e) { if (e.persisted) start(); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible) start(); else stop();
      }, { threshold: 0 }).observe(root);
    }

    if (motionQuery) {
      var onChange = function () { reducedMotion = motionQuery.matches; stop(); start(); };
      if (motionQuery.addEventListener) motionQuery.addEventListener("change", onChange);
      else if (motionQuery.addListener) motionQuery.addListener(onChange);
    }

    /* ---------- hook into the phase controller ---------- */

    var controller = window.CelestialPhase;
    if (controller && C) {
      controller.setPresenter({ present: present, settle: settle });
      controller.on("target", function (e) { describe(e.to); });
      controller.on("mode", function () { describe(controller.getState().phase); });
      var st = controller.getState();
      settle(st.settled);
      describe(st.phase);
    } else {
      /* No phase system: behave like the original clock — Sun at the centre. */
      setBody("sun", REST);
      setBody("moon", GONE);
    }

    start();
  }

  window.GalacticClockMath = { fractions: fractions, angles: angles, position: position, formatTime: formatTime, ORBIT: ORBIT };
  window.PortfolioClock = { init: init };
})();
