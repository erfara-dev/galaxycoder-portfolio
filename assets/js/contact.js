/* contact.js — contact form validation + EmailJS delivery.
   Uses EmailJS's public REST endpoint directly (no third-party SDK needed).
   Credentials come from config.js. Success is shown ONLY after EmailJS
   confirms delivery (HTTP 200).                                              */
(function () {
  "use strict";

  var ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PLACEHOLDERS = ["EMAILJS_PUBLIC_KEY", "EMAILJS_SERVICE_ID", "EMAILJS_TEMPLATE_ID"];

  var form, status, submitBtn, sending = false;

  function cfg() {
    return window.PORTFOLIO_CONFIG || {};
  }

  function isConfigured() {
    var c = cfg();
    return ["EMAILJS_PUBLIC_KEY", "EMAILJS_SERVICE_ID", "EMAILJS_TEMPLATE_ID"].every(function (k) {
      var v = (c[k] || "").trim();
      return v && PLACEHOLDERS.indexOf(v) === -1;
    });
  }

  function showStatus(kind, html) {
    status.className = "form-status form-status--" + kind + " is-visible";
    status.innerHTML = html;
    status.setAttribute("role", kind === "error" ? "alert" : "status");
  }

  function clearStatus() {
    status.className = "form-status";
    status.innerHTML = "";
  }

  function setError(field, message) {
    var input = form.elements[field];
    var err = document.getElementById("err-" + field);
    if (!input || !err) return;
    if (message) {
      input.setAttribute("aria-invalid", "true");
      err.textContent = message;
    } else {
      input.removeAttribute("aria-invalid");
      err.textContent = "";
    }
  }

  function validateField(name) {
    var el = form.elements[name];
    if (!el) return true;
    var v = (el.value || "").trim();
    var msg = "";
    if (name === "first_name" && !v) msg = "Please enter your first name.";
    else if (name === "email") {
      if (!v) msg = "Please enter your email address.";
      else if (!EMAIL_RE.test(v)) msg = "That email address doesn't look right.";
    } else if (name === "subject" && !v) msg = "Please choose a subject.";
    else if (name === "message") {
      if (!v) msg = "Please write a message.";
      else if (v.length < 10) msg = "Your message is a little short — add a few more details.";
    }
    setError(name, msg);
    return !msg;
  }

  function validateAll() {
    var order = ["first_name", "email", "subject", "message"];
    var firstBad = null;
    order.forEach(function (n) {
      if (!validateField(n) && !firstBad) firstBad = n;
    });
    if (firstBad) form.elements[firstBad].focus();
    return !firstBad;
  }

  function setLoading(on) {
    sending = on;
    submitBtn.disabled = on;
    submitBtn.classList.toggle("is-loading", on);
    submitBtn.setAttribute("aria-busy", on ? "true" : "false");
    submitBtn.querySelector(".btn__label").textContent = on ? "Sending…" : "Send message";
  }

  function fallbackLink() {
    var mail = cfg().FALLBACK_EMAIL;
    return mail ? ' You can also email me directly at <a href="mailto:' + mail + '">' + mail + "</a>." : "";
  }

  function onSubmit(e) {
    e.preventDefault();
    if (sending) return; // prevent duplicate submissions

    // Honeypot: real visitors never see or fill this field. Bots do — drop silently.
    if (form.elements.website && form.elements.website.value) return;

    clearStatus();
    if (!validateAll()) return;

    if (!isConfigured()) {
      if (window.console) console.warn("[contact] EmailJS is not configured. Edit assets/js/config.js (see README.md).");
      showStatus("error",
        "<p><strong>The contact form isn't connected yet.</strong> Your message was not sent." + fallbackLink() + "</p>");
      return;
    }

    var c = cfg();
    var first = form.elements.first_name.value.trim();
    var last = form.elements.last_name.value.trim();
    var params = {
      first_name: first,
      last_name: last,
      from_name: (first + " " + last).trim(),
      reply_to: form.elements.email.value.trim(),
      email: form.elements.email.value.trim(),
      subject: form.elements.subject.value,
      message: form.elements.message.value.trim()
    };

    setLoading(true);
    showStatus("pending", "<p>Sending your message…</p>");

    var controller = "AbortController" in window ? new AbortController() : null;
    var timer = controller ? window.setTimeout(function () { controller.abort(); }, 20000) : null;

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: c.EMAILJS_SERVICE_ID,
        template_id: c.EMAILJS_TEMPLATE_ID,
        user_id: c.EMAILJS_PUBLIC_KEY,
        template_params: params
      }),
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        if (!res.ok) {
          return res.text().then(function (t) { throw new Error("EmailJS " + res.status + ": " + t); });
        }
        form.reset();
        ["first_name", "email", "subject", "message"].forEach(function (n) { setError(n, ""); });
        showStatus("success", "<p><strong>Message sent.</strong> Thanks for reaching out — I'll reply as soon as I can.</p>");
      })
      .catch(function (err) {
        if (window.console) console.error("[contact] send failed:", err);
        showStatus("error",
          "<p><strong>Something went wrong and your message wasn't sent.</strong> Please try again in a moment." + fallbackLink() + "</p>");
      })
      .then(function () {
        if (timer) window.clearTimeout(timer);
        setLoading(false);
      });
  }

  function init() {
    form = document.getElementById("contact-form");
    if (!form) return;
    status = document.getElementById("form-status");
    submitBtn = form.querySelector('button[type="submit"]');

    form.noValidate = true; // we show our own accessible messages
    form.addEventListener("submit", onSubmit);

    ["first_name", "email", "subject", "message"].forEach(function (name) {
      var el = form.elements[name];
      if (!el) return;
      el.addEventListener("blur", function () { validateField(name); });
      el.addEventListener("input", function () {
        if (el.getAttribute("aria-invalid") === "true") validateField(name);
      });
    });

    if (!isConfigured() && window.console) {
      console.info("[contact] EmailJS placeholders are still in assets/js/config.js — the form will show a 'not connected' message until configured.");
    }
  }

  window.PortfolioContact = { init: init };
})();
