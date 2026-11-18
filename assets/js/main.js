/* main.js — boots the modules. Scripts are loaded with `defer`, so the DOM is ready. */
(function () {
  "use strict";

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  ["PortfolioTheme", "PortfolioNav", "PortfolioAnimations", "PortfolioContact", "PortfolioClock", "PortfolioStarfield"].forEach(function (name) {
    var mod = window[name];
    if (mod && typeof mod.init === "function") {
      try { mod.init(); } catch (err) { if (window.console) console.error("[" + name + "] init failed:", err); }
    }
  });
})();
