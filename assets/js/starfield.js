/* starfield.js — a theme-aware, decorative canvas galaxy. */
(function () {
  "use strict";

  var canvas, ctx, stars = [];
  var w = 0, h = 0, dpr = 1;
  var frame = null, last = 0, running = false, initialized = false;
  var shootingStar = null, nextShootingAt = 0, firstShotPending = true;
  var pointerTargetX = 0, pointerTargetY = 0, pointerX = 0, pointerY = 0;
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var pointerQuery = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
  var hardwareThreads = navigator.hardwareConcurrency || 0;
  var deviceMemory = navigator.deviceMemory || 0;
  var lowPower = (hardwareThreads > 0 && hardwareThreads <= 4) || (deviceMemory > 0 && deviceMemory <= 4);
  var maxStars = lowPower ? 120 : 180;

  /* Adaptive quality. 0 = full, 1 = lighter (no halos/flares, 20 fps), 2 = minimal (12 fps,
     no shooting stars). It only ever steps down, so a struggling device never oscillates. */
  var FPS_BY_QUALITY = lowPower ? [20, 15, 12] : [30, 20, 12];
  var quality = 0, frameInterval = 1000 / FPS_BY_QUALITY[0];
  var costEma = 0, slowRun = 0, warmup = 0;

  /* Flags read every frame are cached instead of queried from the DOM each time. */
  var light = false, reducedNow = false, pointerOn = false;
  function readFlags() {
    reducedNow = !!(motionQuery && motionQuery.matches);
    pointerOn = !!(pointerQuery && pointerQuery.matches && !reducedNow);
    light = document.documentElement.getAttribute("data-theme") === "light";
  }
  function reduced() { return reducedNow; }
  function pointerEnabled() { return pointerOn; }
  function randomBetween(min, max) { return min + Math.random() * (max - min); }

  function scheduleShootingStar(now) {
    if (firstShotPending) {          // the first one comes early enough to be discovered
      firstShotPending = false;
      nextShootingAt = now + randomBetween(7000, 14000);
    } else {
      nextShootingAt = now + randomBetween(18000, 42000);
    }
  }

  /* A few stars at a time swell brighter and settle back. Fixed slots, no allocation. */
  var FLARE_SLOTS = 3;
  var flareStar = [-1, -1, -1], flareStart = [0, 0, 0], flareDur = [1, 1, 1], nextFlareAt = 0;
  function updateFlares(t) {
    var i, idx;
    for (i = 0; i < FLARE_SLOTS; i++) {
      idx = flareStar[i];
      if (idx < 0) continue;
      var p = (t - flareStart[i]) / flareDur[i];
      if (p >= 1) { stars[idx].boost = 0; flareStar[i] = -1; continue; }
      var s = Math.sin(Math.PI * p);
      stars[idx].boost = s * s;
    }
    if (quality > 0 || t < nextFlareAt || !stars.length) return;
    nextFlareAt = t + randomBetween(1400, 4200);
    for (i = 0; i < FLARE_SLOTS; i++) {
      if (flareStar[i] >= 0) continue;
      idx = (Math.random() * stars.length) | 0;
      if (stars[idx].layer === 0 || stars[idx].boost > 0) return;   // keep far stars calm
      flareStar[i] = idx;
      flareStart[i] = t;
      flareDur[i] = randomBetween(1500, 2800);
      return;
    }
  }

  function degrade() {
    if (quality >= 2) return;
    quality++;
    frameInterval = 1000 / FPS_BY_QUALITY[quality];
    costEma = 0; slowRun = 0; warmup = 0;
    for (var i = 0; i < FLARE_SLOTS; i++) {
      if (flareStar[i] >= 0) { stars[flareStar[i]].boost = 0; flareStar[i] = -1; }
    }
    if (quality >= 2) shootingStar = null;
  }

  /* Depth is read from motion, not noise: every star drifts the same slow way (like a
     slowly turning sky), and nearer layers drift faster. Far stars are practically still.
     A shared direction avoids the "falling snow" look of per-star random headings. */
  var DRIFT_X = -0.94, DRIFT_Y = 0.34;                // px/s unit vector: left, slightly down
  var LAYER_SPEED = [0.2, 0.7, 1.7];                  // px/s per depth layer

  function seed() {
    var count = Math.min(maxStars, Math.max(50, Math.round((w * h) / 9500)));
    stars = [];
    for (var i = 0; i < count; i++) {
      var roll = Math.random();
      var layer = roll < 0.45 ? 0 : roll < 0.82 ? 1 : 2;
      var speed = LAYER_SPEED[layer] * randomBetween(0.8, 1.2);
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        layer: layer,
        r: layer === 2 ? randomBetween(0.6, 1.3) : layer === 1 ? randomBetween(0.4, 0.95) : randomBetween(0.3, 0.7),
        base: layer === 2 ? randomBetween(0.35, 0.7) : randomBetween(0.2, 0.6),
        twinkle: randomBetween(0.18, 0.62),
        twinkleSpeed: randomBetween(0.00042, 0.00115),
        phase: Math.random() * Math.PI * 2,
        vx: DRIFT_X * speed,
        vy: DRIFT_Y * speed,
        parallax: 0.2 + layer * 0.35,
        glow: Math.random() < 0.07,
        tint: Math.random() < 0.22,
        boost: 0
      });
    }
    flareStar[0] = flareStar[1] = flareStar[2] = -1;
  }

  function drawShootingStar(t) {
    if (reducedNow || quality >= 2) return;
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
        tail: randomBetween(42, 76)
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
    var color = light ? "44,58,134" : "161,228,255";
    gradient.addColorStop(0, "rgba(" + color + ",0)");
    gradient.addColorStop(1, "rgba(" + color + "," + (0.72 * fade) + ")");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.25;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    ctx.globalAlpha = 0.8 * fade;
    ctx.fillStyle = light ? "#2c3a86" : "#c8f1ff";
    ctx.beginPath();
    ctx.arc(headX, headY, 4.2, 0, Math.PI * 2);
    ctx.globalAlpha = 0.12 * fade;
    ctx.fill();
    ctx.globalAlpha = 0.8 * fade;
    ctx.beginPath();
    ctx.arc(headX, headY, 1.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function draw(t, elapsed) {
    if (!ctx) return;
    var moving = !reducedNow;
    if (pointerOn) {
      var ease = Math.min(1, elapsed * 2.5);
      pointerX += (pointerTargetX - pointerX) * ease;
      pointerY += (pointerTargetY - pointerY) * ease;
    } else {
      pointerX = 0;
      pointerY = 0;
    }
    if (moving) updateFlares(t);

    ctx.clearRect(0, 0, w, h);
    var seconds = moving ? elapsed : 0;
    var haloOk = quality === 0;
    var ink = light ? "#2c3a86" : "#e5e8f5", tintInk = light ? "#2c3a86" : "#a1e4ff", lastFill = "";
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

      var alpha = moving
        ? star.base * (0.62 + star.twinkle * (0.5 + 0.5 * Math.sin(t * star.twinkleSpeed + star.phase)))
        : star.base * 0.85;
      if (star.boost > 0) alpha = Math.min(1, alpha + star.boost * 0.4);
      var x = star.x + pointerX * star.parallax;
      var y = star.y + pointerY * star.parallax;
      var fill = star.tint ? tintInk : ink;
      if (fill !== lastFill) { ctx.fillStyle = fill; lastFill = fill; }
      if (haloOk && (star.glow || star.boost > 0)) {
        ctx.globalAlpha = alpha * (star.boost > 0 ? 0.1 + star.boost * 0.16 : 0.12);
        ctx.beginPath();
        ctx.arc(x, y, star.r * (2.8 + star.boost * 1.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, star.r * (1 + star.boost * 0.25), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawShootingStar(t);
  }

  function loop(t) {
    frame = null;
    if (!running) return;
    if (t - last >= frameInterval) {
      var gap = t - last;
      var elapsed = Math.min(gap / 1000, 0.1);
      last = t;
      var began = performance.now();
      draw(t, elapsed);
      // Performance pressure: either drawing itself is slow, or the page keeps missing
      // its frame slot (a busy main thread). Ignore the first frames after (re)start.
      if (++warmup > 20) {
        var cost = performance.now() - began;
        costEma = costEma ? costEma * 0.9 + cost * 0.1 : cost;
        if (costEma > 5 || gap > frameInterval * 2.4) slowRun++; else if (slowRun > 0) slowRun--;
        if (slowRun > 45) degrade();
      }
    }
    frame = window.requestAnimationFrame(loop);
  }

  /* Noon has no stars: once they have faded out, stop the loop entirely (no wasted CPU/GPU). */
  var daylight = document.documentElement.getAttribute("data-phase") === "noon";
  var sleepTimer = null;
  function onPhase() {
    var noon = document.documentElement.getAttribute("data-phase") === "noon";
    if (noon === daylight) return;
    daylight = noon;
    window.clearTimeout(sleepTimer);
    if (noon) sleepTimer = window.setTimeout(function () { if (daylight) stop(); }, 3000);
    else start();
  }

  function start() {
    if (running || reducedNow || document.hidden || daylight) return;
    running = true;
    warmup = 0;
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
    var newW = window.innerWidth, newH = window.innerHeight;
    if (w && h && newW === w && newH === h) return;
    var oldW = w, oldH = h, areaRatio = oldW && oldH ? (newW * newH) / (oldW * oldH) : 0;
    dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.5);
    w = newW;
    h = newH;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (areaRatio > 0.6 && areaRatio < 1.6 && stars.length) {
      // Small change (e.g. a mobile URL bar collapsing): keep the same sky, just rescale it.
      for (var i = 0; i < stars.length; i++) {
        stars[i].x *= w / oldW;
        stars[i].y *= h / oldH;
      }
    } else {
      seed();
      shootingStar = null;
      scheduleShootingStar(performance.now());
    }
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
    readFlags();
    // A very slow, purely CSS drifting haze behind the stars (styled in animations.css).
    var haze = document.createElement("div");
    haze.className = "nebula";
    haze.setAttribute("aria-hidden", "true");
    document.body.insertBefore(haze, document.body.firstChild);
    document.body.insertBefore(canvas, haze.nextSibling);
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
      document.documentElement.addEventListener("mouseleave", function () {
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

    new MutationObserver(function () { readFlags(); draw(performance.now(), 0); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    new MutationObserver(onPhase).observe(document.documentElement, { attributes: true, attributeFilter: ["data-phase"] });

    if (motionQuery) {
      var onMotionChange = function () {
        readFlags();
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
        readFlags();
        if (!pointerOn) pointerTargetX = pointerTargetY = 0;
      });
    }

    start();
  }

  window.PortfolioStarfield = { init: init };
})();
