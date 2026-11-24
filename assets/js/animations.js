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
      ".contact > .reveal:first-child",
      ".page-hero .crumbs",
      ".detail-section > nav",
      ".back-row"
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

  /* Parents whose children enter one after another (shares the .reveal-step styles). */
  function sequence(parent, childSelector, max) {
    var index = 0;
    parent.classList.add("reveal", "reveal-heading");
    Array.prototype.forEach.call(parent.children, function (child) {
      if (!child.matches(childSelector)) return;
      child.classList.add("reveal-step");
      child.style.setProperty("--reveal-step", String(Math.min(index++, max)));
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
        sequence(heading, ".eyebrow, h1, h2, .lead", 3);
      });
    });
    // Body copy: a gentle paragraph-by-paragraph rise, never word- or letter-level.
    document.querySelectorAll(".prose").forEach(function (prose) {
      if (prose.children.length > 1) sequence(prose, "p, ul, ol, blockquote", 4);
    });
  }

  var SETTLE_MS = 1500;   // longer than the slowest reveal (delay + duration)

  /* Once an element has finished revealing, drop the reveal classes so the element's own
     hover / focus transitions (lift, glow) apply again instead of the slow reveal timing. */
  function settle(item) {
    item.classList.remove("reveal", "reveal-heading", "is-visible");
    item.style.removeProperty("--stagger");
    item.querySelectorAll(".reveal-step").forEach(function (step) {
      step.classList.remove("reveal-step");
      step.style.removeProperty("--reveal-step");
    });
  }

  function show(item, order, immediate) {
    if (!immediate) item.style.setProperty("--stagger", String(Math.min(order, 6)));
    item.classList.add("is-visible");
    window.setTimeout(function () { settle(item); }, immediate ? 50 : SETTLE_MS);
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
      // Stagger by arrival: items that enter the viewport together cascade in reading order,
      // while one that scrolls in alone appears at once (no leftover delay from its grid index).
      var arriving = [];
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          arriving.push(entry.target);
        } else if (entry.boundingClientRect.top < 0) {
          show(entry.target, 0, true);          // already scrolled past: no animation needed
        } else {
          return;
        }
        observer.unobserve(entry.target);
      });
      arriving.sort(function (a, b) {
        var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return Math.abs(ra.top - rb.top) > 8 ? ra.top - rb.top : ra.left - rb.left;
      });
      arriving.forEach(function (item, order) { show(item, order, false); });
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
