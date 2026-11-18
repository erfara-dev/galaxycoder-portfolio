/* theme.js — dark (default) / light theme with localStorage persistence.
   The tiny inline script in each page's <head> applies the saved theme before
   first paint (no flash). This file wires up the toggle buttons.            */
(function () {
  "use strict";
  var KEY = "dito-theme";
  var root = document.documentElement;
  var META_COLORS = { dark: "#080b18", light: "#eef2fb" };

  function readSaved() {
    try {
      var v = window.localStorage.getItem(KEY);
      return v === "light" || v === "dark" ? v : null;
    } catch (e) {
      return null;
    }
  }

  function save(theme) {
    try {
      window.localStorage.setItem(KEY, theme);
    } catch (e) {
      /* storage unavailable (private mode, blocked) — theme still applies for this visit */
    }
  }

  function systemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", META_COLORS[theme]);
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      var next = theme === "dark" ? "light" : "dark";
      btn.setAttribute("aria-label", "Switch to " + next + " theme");
      btn.setAttribute("title", "Switch to " + next + " theme");
      btn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    });
  }

  function current() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function toggle() {
    var next = current() === "dark" ? "light" : "dark";
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      root.classList.add("theme-transition");
      window.setTimeout(function () { root.classList.remove("theme-transition"); }, 450);
    }
    apply(next);
    save(next);
  }

  function init() {
    apply(readSaved() || systemTheme());
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", toggle);
    });

    // Follow OS changes only while the visitor has not chosen a theme themselves.
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: light)");
      var onChange = function () { if (!readSaved()) apply(systemTheme()); };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }

    // Keep multiple open tabs in sync.
    window.addEventListener("storage", function (e) {
      if (e.key === KEY && (e.newValue === "light" || e.newValue === "dark")) apply(e.newValue);
    });
  }

  window.PortfolioTheme = { init: init, apply: apply, toggle: toggle };
})();
