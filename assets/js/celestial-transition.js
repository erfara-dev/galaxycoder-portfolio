/* celestial-transition.js — Sunrise / Sunset choreography.
   --------------------------------------------------------------------------
   A transition is a pure function of elapsed time:  sample(kind, t) → pose of every element.
   The runner just feeds it requestAnimationFrame time. Because it is pure it is deterministic,
   testable without a browser clock, and cannot "drift" or overlap with itself.

   kind "sunrise": Moon → Sun        kind "sunset": Sun → Moon        (same choreography, mirrored)

   TIMELINE (ms)                                   normal      reduced-motion
   1  Indicators vanish · status label appears     0 – 1300      0 – 300
   2  Outgoing body rotates, shrinks, exits RIGHT  1300 – 3100   (cross-fade, 300 – 1000)
   3  Incoming body enters from LEFT, grows, spins 2800 – 6000   (cross-fade, 300 – 1000)
   4  Incoming body completes rotation, settles    (ends 6000)   —
      digits become clearly readable               5000 – 6000   —
   5  Indicators return: Earth, Planet, Asteroid   6300 – 7320   1100 – 1500

   Guarantees (asserted in the tests):
     • indicators are fully gone (≤ 980 ms) BEFORE the outgoing body starts rotating (1300 ms)
     • indicators start returning (6300 ms) only AFTER the incoming rotation has ended (6000 ms)
     • Sun and Moon are never both visible for more than the 300 ms hand-over
     • indicators are never attached to Sun or Moon (they are separate elements, only fade)     */
(function () {
  "use strict";

  /* ---------- timing — the only place to retune the feel ---------- */
  var TIMING = {
    total: 7400,
    label: { inAt: 0, inEnd: 450, outAt: 6300, outEnd: 7000 },
    indOut: { earth: [0, 700], planet: [140, 840], asteroid: [280, 980] },
    indIn:  { earth: [6300, 7000], planet: [6460, 7160], asteroid: [6620, 7320] },
    preRoll: [0, 700],                    // only for previews: current body dissolves into the outgoing one
    out: { start: 1300, end: 3100, x: 0.46, scale: 0.36, rotate: 160 },      // x as a fraction of the clock's width
    inc: { start: 2800, end: 6000, x: -0.46, scale: 0.32, rotate: -250,
           digitsStart: 5000, digitsEnd: 6000 },
    commit: { sky: 2800, theme: 3800 }    // when the website environment starts changing / flips polarity
  };

  var TIMING_REDUCED = {
    total: 1500,
    label: { inAt: 0, inEnd: 200, outAt: 1250, outEnd: 1500 },
    indOut: { earth: [0, 300], planet: [0, 300], asteroid: [0, 300] },
    indIn:  { earth: [1100, 1500], planet: [1100, 1500], asteroid: [1100, 1500] },
    preRoll: [0, 300],
    out: { start: 300, end: 1000, x: 0, scale: 1, rotate: 0 },
    inc: { start: 300, end: 1000, x: 0, scale: 1, rotate: 0, digitsStart: 600, digitsEnd: 1000 },
    commit: { sky: 300, theme: 600 }
  };

  /* ---------- easing: CSS-style cubic-bezier ---------- */
  function bezier(x1, y1, x2, y2) {
    function cx(t) { return 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t; }
    function cy(t) { return 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * t * t * (1 - t) + t * t * t; }
    function dx(t) { return 3 * x1 * (1 - t) * (1 - t) + 6 * (x2 - x1) * (1 - t) * t + 3 * (1 - x2) * t * t; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var t = x, i, d;
      for (i = 0; i < 6; i++) {                        // Newton–Raphson
        d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= (cx(t) - x) / d;
      }
      if (t < 0 || t > 1 || Math.abs(cx(t) - x) > 1e-4) {   // fall back to bisection
        var lo = 0, hi = 1;
        t = x;
        for (i = 0; i < 24; i++) { var v = cx(t); if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
      }
      return cy(t);
    };
  }

  var EASE = {
    inOut:   bezier(0.65, 0, 0.35, 1),        // symmetrical, for fades and the exit
    exit:    bezier(0.55, 0, 0.7, 0.4),       // accelerates away
    enter:   bezier(0.3, 0, 0.12, 1),         // starts gently, decelerates into place — no abrupt stop
    spin:    bezier(0.3, 0.1, 0.2, 1),        // gentle start, long soft landing
    soft:    bezier(0.4, 0, 0.2, 1)
  };

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function progress(t, a, b) { return clamp01((t - a) / (b - a)); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function span(t, range, ease) { return (ease || EASE.inOut)(progress(t, range[0], range[1])); }

  /* ---------- the choreography ---------- */

  /** Pose of every element `t` ms into a transition.
      opts.preRoll  the visible body is the *incoming* one (a preview): dissolve it into the outgoing one first.
      opts.reduced  use the opacity-only timeline. */
  function sample(kind, t, opts) {
    opts = opts || {};
    var T = opts.reduced ? TIMING_REDUCED : TIMING;
    var moving = !opts.reduced;
    t = Math.max(0, Math.min(t, T.total));

    /* Phase number, for tests and debugging. */
    var phase = t < T.out.start ? 1 : t < T.inc.start ? 2 : t < T.inc.end ? 3 : t < T.indIn.earth[0] ? 4 : 5;
    if (opts.reduced) phase = t < 300 ? 1 : t < 1000 ? 3 : t < 1100 ? 4 : 5;

    /* Outgoing body */
    var po = progress(t, T.out.start, T.out.end);
    var out = {
      op: 1,
      x: moving ? EASE.exit(po) * T.out.x : 0,
      s: moving ? lerp(1, T.out.scale, EASE.inOut(po)) : 1,
      r: moving ? EASE.inOut(po) * T.out.rotate : 0,
      ui: 1 - EASE.soft(progress(t, T.out.start, T.out.start + (T.out.end - T.out.start) * 0.3))
    };
    if (moving) out.op = 1 - EASE.soft(progress(t, lerp(T.out.start, T.out.end, 0.4), T.out.end));
    else out.op = 1 - EASE.inOut(po);
    if (opts.preRoll) out.op *= EASE.inOut(progress(t, T.preRoll[0], T.preRoll[1]));   // fade in the outgoing body

    /* Incoming body */
    var pi = progress(t, T.inc.start, T.inc.end);
    var inc = {
      active: t >= T.inc.start,
      op: EASE.inOut(progress(t, T.inc.start, T.inc.start + (T.inc.end - T.inc.start) * 0.22)),
      x: moving ? lerp(T.inc.x, 0, EASE.enter(pi)) : 0,
      s: moving ? lerp(T.inc.scale, 1, EASE.enter(pi)) : 1,
      r: moving ? lerp(T.inc.rotate, 0, EASE.spin(pi)) : 0,
      ui: EASE.soft(progress(t, T.inc.digitsStart, T.inc.digitsEnd))
    };
    if (!moving) inc.op = EASE.inOut(pi);

    /* Pre-roll: the body that was showing (same type as the incoming one) dissolves away. */
    var pre = { op: opts.preRoll ? 1 - EASE.inOut(progress(t, T.preRoll[0], T.preRoll[1])) : 0 };

    /* Indicators: each fades with its own ring, ticks and trail. */
    var ind = {};
    ["earth", "planet", "asteroid"].forEach(function (name) {
      var down = 1 - span(t, T.indOut[name]);
      var up = span(t, T.indIn[name]);
      ind[name] = t < T.indIn[name][0] ? down : up;
    });

    /* Status label opacity, synchronized with the transition timeline. */
    var label = Math.min(span(t, [T.label.inAt, T.label.inEnd]), 1 - span(t, [T.label.outAt, T.label.outEnd]));

    return { kind: kind, t: t, phase: phase, done: t >= T.total, ind: ind, out: out, inc: inc, pre: pre, label: label,
             commitSky: t >= T.commit.sky, commitTheme: t >= T.commit.theme };
  }

  /* ---------- runner ---------- */

  /** Play a transition. hooks.render(sample) every frame, hooks.commit("sky"|"theme") once each,
      hooks.done() at the end. Returns { finish(), cancel() }. */
  function run(kind, opts, hooks) {
    opts = opts || {};
    var T = opts.reduced ? TIMING_REDUCED : TIMING;
    var start = null, raf = 0, ended = false, committed = { sky: false, theme: false };

    function apply(s) {
      hooks.render(s);
      if (s.commitSky && !committed.sky) { committed.sky = true; hooks.commit("sky"); }
      if (s.commitTheme && !committed.theme) { committed.theme = true; hooks.commit("theme"); }
    }

    function end() {
      if (ended) return;
      ended = true;
      window.cancelAnimationFrame(raf);
      apply(sample(kind, T.total, opts));
      hooks.done();
    }

    function step(now) {
      if (ended) return;
      if (start === null) start = now;
      var t = now - start;
      if (t >= T.total) { end(); return; }
      apply(sample(kind, t, opts));
      raf = window.requestAnimationFrame(step);
    }

    apply(sample(kind, 0, opts));
    raf = window.requestAnimationFrame(step);

    return {
      finish: end,
      cancel: function () { ended = true; window.cancelAnimationFrame(raf); }
    };
  }

  window.CelestialTransition = { TIMING: TIMING, TIMING_REDUCED: TIMING_REDUCED, EASE: EASE, sample: sample, run: run, bezier: bezier };
})();
