/* theme.js — header sun/moon button.
   The site theme is now driven by the celestial phase (see celestial-core.js / celestial-phase.js):
   Noon uses the light theme; Sunrise, Sunset and Night use the dark theme.
   This button stays as a quick shortcut: it switches to Manual mode and jumps to Night (from a light
   phase) or Noon (from a dark one). Automatic mode can be restored from the clock's selector on the
   home page. The old `dito-theme` storage key is no longer used. */
(function () {
  "use strict";
  var root = document.documentElement;

  function label() {
    var light = root.getAttribute("data-theme") === "light";
    var text = light ? "Switch to Night (manual)" : "Switch to Noon (manual)";
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-label", text);
      btn.setAttribute("title", text);
      btn.setAttribute("aria-pressed", light ? "true" : "false");
    });
  }

  function toggle() {
    if (window.CelestialPhase) window.CelestialPhase.toggleDayNight();
  }

  function init() {
    label();
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) { btn.addEventListener("click", toggle); });
    new MutationObserver(label).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  }

  window.PortfolioTheme = { init: init, toggle: toggle };
})();
