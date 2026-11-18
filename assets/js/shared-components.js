/* shared-components.js — injects the shared site chrome on every page. */
(function () {
  "use strict";

  var body = document.body;
  var root = body.getAttribute("data-root") || "";
  var page = body.getAttribute("data-page") || "";
  var navItems = [
    ["home", "Home", "index.html"],
    ["work", "Work", "work.html"],
    ["about", "About", "about.html"],
    ["skills", "Skills", "skills.html"],
    ["journey", "Journey", "journey.html"]
  ];

  function pageLink(item) {
    var current = page === item[0] ? ' aria-current="page"' : "";
    return '<a class="nav__link" href="' + root + item[2] + '"' + current + ">" + item[1] + "</a>";
  }

  var icons = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
    '<symbol id="i-arrow-right" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>' +
    '<symbol id="i-arrow-left" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></symbol>' +
    '<symbol id="i-up-right" viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></symbol>' +
    '<symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></symbol>' +
    '<symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></symbol>' +
    '<symbol id="i-moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></symbol>' +
    '<symbol id="i-send" viewBox="0 0 24 24"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></symbol>' +
    '<symbol id="i-check" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></symbol>' +
    '<symbol id="i-alert" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></symbol>' +
    '<symbol id="i-github" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/></symbol>' +
    '<symbol id="i-linkedin" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></symbol>' +
    '</defs></svg>';

  var header = '<header class="site-header"><div class="container site-header__inner">' +
    '<a class="brand" href="' + root + 'index.html" aria-label="Dito Erfana — home">' +
    '<svg class="brand__mark" viewBox="0 0 36 36" aria-hidden="true" focusable="false"><defs><radialGradient id="bm-sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fffdf0"/><stop offset="0.55" stop-color="#f4eed4"/><stop offset="1" stop-color="#78c9e8"/></radialGradient></defs><circle class="brand__orbit" cx="18" cy="18" r="15" fill="none" stroke-width="1"/><circle cx="18" cy="18" r="5" fill="url(#bm-sun)"/><circle class="brand__planet" cx="31.4" cy="11.3" r="2.3"/></svg><span class="brand__text"><span class="brand__name">Dito Erfana</span><span class="brand__tag">Milky Way Observatory</span></span></a>' +
    '<nav class="nav" aria-label="Primary">' + navItems.map(function (item) { return pageLink(item, false); }).join("") + "</nav>" +
    '<div class="site-header__actions"><button class="icon-btn theme-toggle" type="button" data-theme-toggle aria-label="Switch theme" title="Switch theme" aria-pressed="false"><svg class="icon icon--sun" aria-hidden="true" focusable="false"><use href="#i-sun"/></svg><svg class="icon icon--moon" aria-hidden="true" focusable="false"><use href="#i-moon"/></svg></button>' +
    '<a class="btn btn--primary btn--sm btn--cta" href="' + root + 'contact.html"' + (page === "contact" ? ' aria-current="page"' : "") + '>Initiate Contact <svg class="icon icon--arrow" aria-hidden="true" focusable="false"><use href="#i-arrow-right"/></svg></a>' +
    '<button class="icon-btn menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu"><span class="menu-toggle__bars" aria-hidden="true"><span></span><span></span><span></span></span></button></div></div>' +
    '<div class="mobile-menu" id="mobile-menu"><nav class="container mobile-menu__inner" aria-label="Mobile">' +
    navItems.map(function (item) { return pageLink(item, true); }).join("") +
    '<a class="nav__link' + (page === "contact" ? '" aria-current="page' : "") + '" href="' + root + 'contact.html">Contact</a>' +
    '<a class="btn btn--primary" href="' + root + 'contact.html">Get in touch <svg class="icon icon--arrow" aria-hidden="true" focusable="false"><use href="#i-arrow-right"/></svg></a>' +
    "</nav></div></header>";

  var footer = '<footer class="site-footer"><div class="container"><div class="footer__top">' +
    '<div class="footer__brand"><p class="footer__wordmark">Dito Erfana<span>.</span></p><p class="lead">Turning Ideas Into Digital Experiences.</p><p class="footer__coord" aria-hidden="true">Deck 01 · Milky Way Observatory</p></div>' +
    '<nav class="footer__col" aria-label="Footer"><h2>Sector index</h2><ul>' +
    '<li><a href="' + root + 'index.html">Home</a></li><li><a href="' + root + 'work.html">Work</a></li><li><a href="' + root + 'about.html">About</a></li><li><a href="' + root + 'skills.html">Skills</a></li><li><a href="' + root + 'journey.html">Journey</a></li><li><a href="' + root + 'contact.html">Contact</a></li>' +
    '</ul></nav><div class="footer__col"><h2>Relays</h2><ul><li><a href="https://github.com/erfara-dev" target="_blank" rel="noopener noreferrer">GitHub</a></li><li><a href="https://linkedin.com/in/ditoerfana" target="_blank" rel="noopener noreferrer">LinkedIn</a></li><li><a href="mailto:ditoerff@gmail.com">Email</a></li></ul></div></div>' +
    '<div class="footer__bottom"><span>© <span data-year>2026</span> Dito Erfana. All rights reserved.</span><span class="footer__built">Built with HTML · CSS · JavaScript</span><a href="#top">Back to top ↑</a></div></div></footer>';

  document.querySelectorAll("[data-site-icons]").forEach(function (el) { el.outerHTML = icons; });
  document.querySelectorAll("[data-site-header]").forEach(function (el) { el.outerHTML = header; });
  document.querySelectorAll("[data-site-footer]").forEach(function (el) { el.outerHTML = footer; });
})();
