/* navigation.js — sticky header state, mobile menu and page-leave transition.
   Keyboard: Esc closes the menu and returns focus.                            */
(function () {
  "use strict";

  var header, toggleBtn, menu;
  var DESKTOP = window.matchMedia ? window.matchMedia("(min-width: 900px)") : null;

  function setMenu(open) {
    if (!menu || !toggleBtn) return;
    menu.classList.toggle("is-open", open);
    toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
    toggleBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    // Keep closed-menu links out of the tab order.
    if ("inert" in menu) menu.inert = !open;
    document.documentElement.classList.toggle("menu-open", open);
  }

  function isOpen() {
    return menu && menu.classList.contains("is-open");
  }

  function initMenu() {
    toggleBtn = document.querySelector("[data-menu-toggle]");
    menu = document.getElementById("mobile-menu");
    if (!toggleBtn || !menu) return;

    setMenu(false);
    toggleBtn.addEventListener("click", function () { setMenu(!isOpen()); });

    // Close after a navigation item is chosen.
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) {
        setMenu(false);
        toggleBtn.focus();
      }
    });

    // Click / tap outside closes the menu.
    document.addEventListener("click", function (e) {
      if (isOpen() && !menu.contains(e.target) && !toggleBtn.contains(e.target)) setMenu(false);
    });

    // Leaving the mobile breakpoint resets the menu.
    if (DESKTOP) {
      var reset = function () { if (DESKTOP.matches) setMenu(false); };
      if (DESKTOP.addEventListener) DESKTOP.addEventListener("change", reset);
      else if (DESKTOP.addListener) DESKTOP.addListener(reset);
    }
  }

  function initScrollState() {
    header = document.querySelector(".site-header");
    if (!header) return;
    var ticking = false;
    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* Subtle page transition: fade main out briefly before following same-site links. */
  function initPageTransitions() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      var url;
      try { url = new URL(a.href, window.location.href); } catch (err) { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // in-page anchor: native smooth scroll
      e.preventDefault();
      document.body.classList.add("is-leaving");
      window.setTimeout(function () { window.location.href = url.href; }, 180);
    });

    // Back/forward cache restores the page with .is-leaving still set — undo it.
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) document.body.classList.remove("is-leaving");
    });
  }

  function init() {
    initMenu();
    initScrollState();
    initPageTransitions();
  }

  window.PortfolioNav = { init: init };
})();
