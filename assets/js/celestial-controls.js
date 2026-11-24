/* celestial-controls.js — the Automatic / Manual switch and the four-phase selector
   that sit directly beneath the Dual Celestial Clock.

   Pure view + input: all decisions live in CelestialPhase (celestial-phase.js).
     • Automatic: the phase selector is hidden and phase buttons are disabled.
     • Manual:    the phase selector is shown; the chosen phase stays highlighted.
   State is exposed with aria-pressed, and changes are announced through a polite live region. */
(function () {
  "use strict";

  function init() {
    var box = document.querySelector("[data-celestial-controls]");
    var ctl = window.CelestialPhase, C = window.Celestial;
    if (!box || !ctl || !C || box.getAttribute("data-ready") === "true") return;
    box.setAttribute("data-ready", "true");

    var modeBtns = Array.prototype.slice.call(box.querySelectorAll("[data-mode-btn]"));
    var phaseBtns = Array.prototype.slice.call(box.querySelectorAll("[data-phase-btn]"));
    var group = box.querySelector("[data-phase-group]");
    var phaseWrap = box.querySelector("[data-phase-wrap]");
    var live = box.querySelector("[data-cc-live]");

    function paint() {
      var st = ctl.getState();
      var manual = st.mode === "manual";
      if (phaseWrap) {
        phaseWrap.setAttribute("aria-hidden", manual ? "false" : "true");
        if (manual) phaseWrap.removeAttribute("inert");
        else phaseWrap.setAttribute("inert", "");
      }
      modeBtns.forEach(function (b) {
        var on = b.getAttribute("data-mode-btn") === st.mode;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      phaseBtns.forEach(function (b) {
        var on = b.getAttribute("data-phase-btn") === st.phase;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.disabled = !manual;
      });
      if (group) {
        if (manual) group.removeAttribute("title");
        else group.setAttribute("title", "Switch to Manual to choose a phase");
      }
    }

    function say(text) { if (live) live.textContent = text; }

    modeBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        var mode = b.getAttribute("data-mode-btn");
        ctl.setMode(mode);
        say(mode === "auto" ? "Automatic mode. The sky follows your local time." : "Manual mode. Choose a phase.");
      });
    });

    phaseBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        var phase = b.getAttribute("data-phase-btn");
        if (ctl.selectPhase(phase)) say(C.PHASES[phase].label + " selected.");
      });
    });

    ctl.on("target", paint);
    ctl.on("mode", paint);
    ctl.on("settled", paint);
    paint();
  }

  window.CelestialControls = { init: init };
})();
