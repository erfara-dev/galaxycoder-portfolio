/* starfield.js — a light, decorative canvas starfield behind the page.
   - Static (drawn once) when prefers-reduced-motion is set.
   - Paused while the tab is hidden.
   - Theme-aware: light stars in dark theme, navy specks in light theme.
   - Purely decorative: aria-hidden, pointer-events none, no layout impact.   */
(function () {
  "use strict";

  var canvas, ctx, stars = [], w = 0, h = 0, dpr = 1;
  var frame = null, last = 0, running = false;
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  function reduced() { return !!(motionQuery && motionQuery.matches); }
  function isLight() { return document.documentElement.getAttribute("data-theme") === "light"; }

  function seed() {
    var count = Math.min(220, Math.max(60, Math.round((w * h) / 9000)));
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() < 0.08 ? 1.4 : Math.random() * 0.8 + 0.3,
        base: Math.random() * 0.5 + 0.25,
        speed: Math.random() * 0.0012 + 0.0004,
        phase: Math.random() * Math.PI * 2,
        tint: Math.random() < 0.22 ? 1 : 0   // 1 = cyan tint
      });
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    draw(performance.now());
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    var light = isLight();
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = s.base * (reduced() ? 0.85 : 0.65 + 0.35 * Math.sin(t * s.speed + s.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = light ? "#2c3a86" : (s.tint ? "#a1e4ff" : "#e5e8f5");
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function loop(t) {
    frame = null;
    if (!running) return;
    if (t - last > 66) { draw(t); last = t; }   // ~15 fps is plenty for a slow twinkle
    frame = window.requestAnimationFrame(loop);
  }

  function start() {
    if (running || reduced() || document.hidden) return;
    running = true;
    frame = window.requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (frame !== null) { window.cancelAnimationFrame(frame); frame = null; }
  }

  function init() {
    if (document.querySelector(".starfield")) return;
    canvas = document.createElement("canvas");
    canvas.className = "starfield";
    canvas.setAttribute("aria-hidden", "true");
    ctx = canvas.getContext("2d");
    if (!ctx) return;
    document.body.insertBefore(canvas, document.body.firstChild);
    resize();

    var timer = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(resize, 150);
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });

    // Redraw immediately when the theme flips (matters in static / reduced-motion mode).
    new MutationObserver(function () { draw(performance.now()); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    if (motionQuery) {
      var onChange = function () { stop(); draw(performance.now()); start(); };
      if (motionQuery.addEventListener) motionQuery.addEventListener("change", onChange);
      else if (motionQuery.addListener) motionQuery.addListener(onChange);
    }
    start();
  }

  window.PortfolioStarfield = { init: init };
})();
