/* animations.js — progressive, viewport-based motion for page content. */
(function () {
  "use strict";

  var initialized = false;
  var staggerGroups = [
    [".projects-grid", ".project-card"],
    [".skills-grid", ".skill-card"],
    [".cards-3", ".info-card"],
    [".timeline", ".timeline__item"],
    [".gallery", ".gallery__item"],
    [".feature-list", ".feature"],
    [".stack-groups", ".stack-group"],
    [".about-interests__grid", ".about-interest"],
    [".about-facts", ":scope > div"]
  ];

  function addRevealTargets() {
    var selectors = [
      ".section-head",
      ".detail-grid > header",
      ".detail-grid > .prose",
      ".detail-grid > .stack-groups",
      ".detail-grid > .reveal",
      ".about-facts",
      ".about-developer__grid > *",
      ".about-interest",
      ".about-motto__inner",
      ".about-future__heading",
      ".about-future__copy",
      ".form-card",
      ".pager",
      ".contact > .reveal:first-child"
    ];
    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (item) {
        item.classList.add("reveal");
      });
    });

    staggerGroups.forEach(function (group) {
      document.querySelectorAll(group[0]).forEach(function (container) {
        container.querySelectorAll(group[1]).forEach(function (item, index) {
          item.classList.add("reveal");
          if (!item.style.getPropertyValue("--i")) item.style.setProperty("--i", String(index));
        });
      });
    });

    document.querySelectorAll(".not-found > *").forEach(function (item, index) {
      item.classList.add("reveal");
      if (!item.style.getPropertyValue("--i")) item.style.setProperty("--i", String(index));
    });
  }

  function prepareHeadingSequences() {
    var selectors = [
      ".section-head",
      ".detail-grid > header",
      ".about-motto__inner",
      ".about-future__heading",
      ".contact > .reveal:first-child"
    ];
    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (heading) {
        heading.classList.add("reveal", "reveal-heading");
        var index = 0;
        Array.prototype.forEach.call(heading.children, function (child) {
          if (!child.matches(".eyebrow, h1, h2, .lead")) return;
          child.classList.add("reveal-step");
          child.style.setProperty("--reveal-step", String(index++));
        });
      });
    });
  }

  function revealAll(items) {
    items.forEach(function (item) { item.classList.add("is-visible"); });
    document.documentElement.classList.add("motion-ready");
  }

  function init() {
    if (initialized) return;
    initialized = true;
    addRevealTargets();
    prepareHeadingSequences();

    var items = document.querySelectorAll(".reveal");
    var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (!items.length) {
      document.documentElement.classList.add("motion-ready");
      return;
    }
    if ((motionQuery && motionQuery.matches) || !("IntersectionObserver" in window)) {
      revealAll(items);
      return;
    }

    var io = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -5% 0px" });

    items.forEach(function (item) { io.observe(item); });
    document.documentElement.classList.add("motion-ready");

    if (motionQuery) {
      var onMotionChange = function () {
        if (!motionQuery.matches) return;
        io.disconnect();
        revealAll(items);
      };
      if (motionQuery.addEventListener) motionQuery.addEventListener("change", onMotionChange);
      else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);
    }
  }

  window.PortfolioAnimations = { init: init };
})();
