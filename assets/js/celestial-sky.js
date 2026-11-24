/* celestial-sky.js — the website's environment (runs on every page).
   --------------------------------------------------------------------------
   Builds one fixed, non-interactive layer behind the page:
     four gradient skies (Noon / Sunrise / Sunset / Night) that cross-fade by opacity,
     sun-ray beams, drifting clouds and tiny floating particles.
   Which one is visible is decided purely by CSS from <html data-phase>, so this file only creates
   the elements. Every moving part animates transform/opacity only (compositor, no layout/paint),
   and animations are paused while the tab is hidden. Stars are drawn by starfield.js. */
(function () {
  "use strict";

  var CLOUDS = 8;

  function el(tag, cls) {
    var n = document.createElement(tag);
    n.className = cls;
    return n;
  }

  function init() {
    if (init.done || document.querySelector(".sky")) return;
    init.done = true;

    var sky = el("div", "sky");
    sky.setAttribute("aria-hidden", "true");

    ["noon", "sunrise", "sunset", "night"].forEach(function (p) { sky.appendChild(el("div", "sky__layer sky__layer--" + p)); });
    sky.appendChild(el("div", "sky__rays"));

    var clouds = el("div", "sky__clouds");
    for (var i = 1; i <= CLOUDS; i++) clouds.appendChild(el("i", "cloud cloud--" + i));
    sky.appendChild(clouds);

    sky.appendChild(el("div", "sky__motes"));
    document.body.insertBefore(sky, document.body.firstChild);

    /* A hidden tab renders nothing anyway; pausing also stops timers on slow devices. */
    document.addEventListener("visibilitychange", function () {
      sky.classList.toggle("is-paused", document.hidden);
    });
  }

  window.CelestialSky = { init: init };
})();
