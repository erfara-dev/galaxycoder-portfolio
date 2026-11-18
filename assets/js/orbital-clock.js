/* orbital-clock.js — the Galactic Clock.

   Model (all driven by ONE Date per frame, the browser's local clock):
     Sun     digital HH:MM:SS (centre)
     Mercury 1 revolution / 60 s     (seconds, with milliseconds)
     Venus   1 revolution / 60 min   (minutes, with fractional seconds)
     Earth   1 revolution / 24 h     (hours, with fractional minutes — a 24 h cycle, not 12 h)

   Angles are measured clockwise from 12 o'clock (00:00:00 puts every planet at the top):
     x = cx + r·sin θ      y = cy − r·cos θ        (SVG y grows downward ⇒ θ increasing = clockwise)

   Local wall-clock time is used on purpose: the planets always agree with the digits
   the visitor sees. On a daylight-saving change the wall clock jumps by an hour, and so
   does Earth — nothing special-cased.

   The 12h/24h button changes the digital text ONLY. Orbit maths never reads that setting. */
(function () {
  "use strict";

  var TAU = Math.PI * 2;
  var CX = 200, CY = 200;
  var ORBIT = { mercury: 82, venus: 126, earth: 170 };
  var BODY = { mercury: 5, venus: 7, earth: 8.5 };
  // Trail: three short arcs fading out behind each planet (visual cue for direction).
  var TRAIL_SEG = 9;                 // degrees per segment
  var TRAIL_GAP = 9;                 // degrees between segment starts
  var TRAIL_OPACITY = [0.6, 0.34, 0.15];

  /* ---------- Pure maths (no DOM) — also exposed for testing ---------- */

  /** Fractions of the current local time. `withMs=false` snaps to whole seconds. */
  function fractions(date, withMs) {
    var sec = date.getSeconds() + (withMs ? date.getMilliseconds() / 1000 : 0);
    var min = date.getMinutes() + sec / 60;
    var hour = date.getHours() + min / 60;            // 0 ≤ hour < 24
    return { sec: sec, min: min, hour: hour };
  }

  /** Orbital angles in radians, clockwise from the top. */
  function angles(date, withMs) {
    var f = fractions(date, withMs !== false);
    return {
      mercury: (f.sec / 60) * TAU,
      venus: (f.min / 60) * TAU,
      earth: (f.hour / 24) * TAU
    };
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

  /* ---------- DOM wiring ---------- */

  function init() {
    var root = document.querySelector("[data-galactic-clock]");
    if (!root || root.getAttribute("data-clock-initialized") === "true") return;
    var button = root.querySelector("[data-orbital-clock]");
    var timeEl = root.querySelector("[data-clock-time]");
    var suffixEl = root.querySelector("[data-clock-meridiem]");
    var hintEl = root.querySelector("[data-clock-hint]");
    var dateEl = root.querySelector("[data-clock-date]");
    var tzEl = root.querySelector("[data-clock-timezone]");
    if (!button || !timeEl) return;
    root.setAttribute("data-clock-initialized", "true");

    var planets = {};
    ["mercury", "venus", "earth"].forEach(function (name) {
      var g = root.querySelector('[data-planet="' + name + '"]');
      var trail = root.querySelector('[data-trail="' + name + '"]');
      var segs = trail ? Array.prototype.slice.call(trail.querySelectorAll("circle")) : [];
      var r = ORBIT[name], circ = TAU * r;
      // Planet-radius clearance so the trail starts behind the body, not under it.
      var clearance = (BODY[name] + 1.5) / r * (180 / Math.PI);
      segs.forEach(function (c, i) {
        c.setAttribute("stroke-dasharray", (circ * TRAIL_SEG / 360).toFixed(2) + " " + circ.toFixed(2));
        c.setAttribute("stroke-width", name === "earth" ? 2 : name === "venus" ? 1.7 : 1.4);
        c.setAttribute("opacity", TRAIL_OPACITY[i]);
      });
      planets[name] = { g: g, lit: g && g.querySelector("[data-lit]"), segs: segs, clearance: clearance };
    });

    var use24Hour = true;
    var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var reducedMotion = !!(motionQuery && motionQuery.matches);
    var dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    var zoneName = "";
    try { zoneName = new Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { /* ignore */ }

    var shownKey = null, shownDate = null;
    var frame = null, timer = null, visible = true;

    function place(name, theta) {
      var p = planets[name];
      if (!p || !p.g) return;
      var pos = position(theta, ORBIT[name]);
      var deg = theta * 180 / Math.PI;
      p.g.setAttribute("transform", "translate(" + pos.x.toFixed(2) + " " + pos.y.toFixed(2) + ")");
      // Rotate the shading so the lit side always faces the Sun (see maths note in README).
      if (p.lit) p.lit.setAttribute("transform", "rotate(" + (deg - 90).toFixed(2) + ")");
      for (var i = 0; i < p.segs.length; i++) {
        var back = p.clearance + i * TRAIL_GAP + TRAIL_SEG;      // far end of this segment, degrees behind planet
        p.segs[i].setAttribute("transform", "rotate(" + (deg - 90 - back).toFixed(2) + " " + CX + " " + CY + ")");
      }
    }

    function render(now) {
      var a = angles(now, !reducedMotion);
      place("mercury", a.mercury);
      place("venus", a.venus);
      place("earth", a.earth);

      var f = formatTime(now, use24Hour);
      var key = f.text + f.suffix;
      if (key !== shownKey) {
        timeEl.textContent = f.text;
        timeEl.setAttribute("datetime", toLocalDate(now) + "T" + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds()));
        if (suffixEl) suffixEl.textContent = f.suffix;
        shownKey = key;
      }
      var dateKey = toLocalDate(now);
      if (dateKey !== shownDate) {
        if (dateEl) { dateEl.textContent = dateFormatter.format(now); dateEl.setAttribute("datetime", dateKey); }
        shownDate = dateKey;
      }
      if (tzEl) tzEl.textContent = (zoneName ? zoneName + " · " : "") + utcOffsetLabel(now);   // offset can change with DST
    }

    function tick() {
      frame = null; timer = null;
      render(new Date());
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
      render(new Date());                // fresh absolute time on every resume — no drift
      schedule();
    }

    button.addEventListener("click", function () {
      use24Hour = !use24Hour;
      if (hintEl) hintEl.textContent = use24Hour ? "Switch to 12-hour display" : "Switch to 24-hour display";
      shownKey = null;
      render(new Date());                // orbits are untouched by this setting
    });

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

    start();
  }

  window.GalacticClockMath = { fractions: fractions, angles: angles, position: position, formatTime: formatTime, ORBIT: ORBIT };
  window.PortfolioClock = { init: init };
})();
