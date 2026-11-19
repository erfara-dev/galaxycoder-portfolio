/* starfield.js — a theme-aware, decorative canvas galaxy. */
(function () {
  "use strict";

  var canvas, ctx, stars = [];
  var w = 0, h = 0, dpr = 1;
  var frame = null, last = 0, running = false, initialized = false;
  var shootingStar = null, nextShootingAt = 0;
  var pointerTargetX = 0, pointerTargetY = 0, pointerX = 0, pointerY = 0;
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var pointerQuery = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
  var hardwareThreads = navigator.hardwareConcurrency || 0;
  var deviceMemory = navigator.deviceMemory || 0;
  var lowPower = (hardwareThreads > 0 && hardwareThreads <= 4) || (deviceMemory > 0 && deviceMemory <= 4);
  var frameInterval = lowPower ? 1000 / 20 : 1000 / 30;
  var maxStars = lowPower ? 120 : 180;
  var localHost = window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]";
  var motionTest = localHost && new URLSearchParams(window.location.search).get("motionTest") === "1";

  function reduced() { return !!(motionQuery && motionQuery.matches); }
  function pointerEnabled() { return !!(pointerQuery && pointerQuery.matches && !reduced()); }
  function isLight() { return document.documentElement.getAttribute("data-theme") === "light"; }
  function randomBetween(min, max) { return min + Math.random() * (max - min); }

  function scheduleShootingStar(now) {
    nextShootingAt = now + (motionTest ? randomBetween(1200, 2400) : randomBetween(12000, 25000));
  }

  function seed() {
    var count = Math.min(maxStars, Math.max(50, Math.round((w * h) / 9500)));
    stars = [];
    for (var i = 0; i < count; i++) {
      var roll = Math.random();
      var layer = roll < 0.45 ? 0 : roll < 0.82 ? 1 : 2;
      var speed = layer === 0 ? 0.14 : layer === 1 ? 0.48 : 1.05;
      var angle = Math.random() * Math.PI * 2;
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: layer === 2 ? randomBetween(0.55, 1.3) : randomBetween(0.3, 0.9),
        base: randomBetween(0.2, 0.66),
        twinkle: randomBetween(0.18, 0.62),
        twinkleSpeed: randomBetween(0.0006, 0.0015),
        phase: Math.random() * Math.PI * 2,
        vx: Math.cos(angle) * speed * randomBetween(0.65, 1.35),
        vy: Math.sin(angle) * speed * randomBetween(0.65, 1.35),
        parallax: 0.2 + layer * 0.35,
        glow: Math.random() < 0.07,
        tint: Math.random() < 0.22
      });
    }
  }

  function drawShootingStar(t) {
    if (reduced()) return;
    if (!shootingStar && t >= nextShootingAt) {
      var angle = randomBetween(2.05, 2.4);
      var distance = Math.min(w, h) * randomBetween(0.24, 0.38);
      shootingStar = {
        x: w * randomBetween(0.48, 0.98),
        y: h * randomBetween(0.04, 0.34),
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        duration: randomBetween(850, 1450),
        started: t,
        tail: randomBetween(56, 94)
      };
      nextShootingAt = Infinity;
    }
    if (!shootingStar) return;

    var progress = (t - shootingStar.started) / shootingStar.duration;
    if (progress >= 1) {
      shootingStar = null;
      scheduleShootingStar(t);
      return;
    }

    var fade = Math.sin(Math.PI * progress);
    var headX = shootingStar.x + shootingStar.dx * progress;
    var headY = shootingStar.y + shootingStar.dy * progress;
    var length = Math.hypot(shootingStar.dx, shootingStar.dy);
    var tailX = headX - (shootingStar.dx / length) * shootingStar.tail;
    var tailY = headY - (shootingStar.dy / length) * shootingStar.tail;
    var gradient = ctx.createLinearGradient(tailX, tailY, headX, headY);
    var color = isLight() ? "44,58,134" : "161,228,255";
    gradient.addColorStop(0, "rgba(" + color + ",0)");
    gradient.addColorStop(1, "rgba(" + color + "," + (0.82 * fade) + ")");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    ctx.globalAlpha = 0.8 * fade;
    ctx.fillStyle = isLight() ? "#2c3a86" : "#c8f1ff";
    ctx.beginPath();
    ctx.arc(headX, headY, 4.6, 0, Math.PI * 2);
    ctx.globalAlpha = 0.16 * fade;
    ctx.fill();
    ctx.globalAlpha = 0.8 * fade;
    ctx.beginPath();
    ctx.arc(headX, headY, 1.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function draw(t, elapsed) {
    if (!ctx) return;
    var moving = !reduced();
    if (pointerEnabled()) {
      var ease = Math.min(1, elapsed * 2.5);
      pointerX += (pointerTargetX - pointerX) * ease;
      pointerY += (pointerTargetY - pointerY) * ease;
    } else {
      pointerX = 0;
      pointerY = 0;
    }

    ctx.clearRect(0, 0, w, h);
    var light = isLight();
    var seconds = moving ? elapsed : 0;
    for (var i = 0; i < stars.length; i++) {
      var star = stars[i];
      if (moving) {
        star.x += star.vx * seconds;
        star.y += star.vy * seconds;
        if (star.x < -2) star.x = w + 2;
        else if (star.x > w + 2) star.x = -2;
        if (star.y < -2) star.y = h + 2;
        else if (star.y > h + 2) star.y = -2;
      }

      var alpha = reduced()
        ? star.base * 0.85
        : star.base * (0.62 + star.twinkle * (0.5 + 0.5 * Math.sin(t * star.twinkleSpeed + star.phase)));
      var x = star.x + pointerX * star.parallax;
      var y = star.y + pointerY * star.parallax;
      ctx.fillStyle = light ? "#2c3a86" : (star.tint ? "#a1e4ff" : "#e5e8f5");
      if (star.glow) {
        ctx.globalAlpha = alpha * 0.12;
        ctx.beginPath();
        ctx.arc(x, y, star.r * 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawShootingStar(t);
  }

  function loop(t) {
    frame = null;
    if (!running) return;
    if (t - last >= frameInterval) {
      var elapsed = Math.min((t - last) / 1000, 0.1);
      last = t;
      draw(t, elapsed);
    }
    frame = window.requestAnimationFrame(loop);
  }

  function start() {
    if (running || reduced() || document.hidden) return;
    running = true;
    last = performance.now();
    if (!nextShootingAt) scheduleShootingStar(last);
    frame = window.requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (frame !== null) {
      window.cancelAnimationFrame(frame);
      frame = null;
    }
  }

  function resize() {
    if (!canvas || !ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.5);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    shootingStar = null;
    scheduleShootingStar(performance.now());
    draw(performance.now(), 0);
  }

  function init() {
    if (initialized || document.querySelector(".starfield")) return;
    initialized = true;
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
    }, { passive: true });

    if (pointerQuery) {
      window.addEventListener("pointermove", function (event) {
        if (!pointerEnabled() || !w || !h) return;
        pointerTargetX = ((event.clientX / w) - 0.5) * 8;
        pointerTargetY = ((event.clientY / h) - 0.5) * 8;
      }, { passive: true });
      window.addEventListener("pointerleave", function () {
        pointerTargetX = 0;
        pointerTargetY = 0;
      }, { passive: true });
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stop();
        shootingStar = null;
      } else {
        scheduleShootingStar(performance.now());
        start();
      }
    });

    new MutationObserver(function () { draw(performance.now(), 0); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    if (motionQuery) {
      var onMotionChange = function () {
        stop();
        shootingStar = null;
        pointerTargetX = pointerTargetY = pointerX = pointerY = 0;
        draw(performance.now(), 0);
        if (!reduced()) {
          scheduleShootingStar(performance.now());
          start();
        }
      };
      if (motionQuery.addEventListener) motionQuery.addEventListener("change", onMotionChange);
      else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);
    }
    if (pointerQuery && pointerQuery.addEventListener) {
      pointerQuery.addEventListener("change", function () {
        if (!pointerEnabled()) pointerTargetX = pointerTargetY = 0;
      });
    }

    start();
  }

  window.PortfolioStarfield = { init: init };
})();
