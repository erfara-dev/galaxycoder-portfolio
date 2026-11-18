/* ==========================================================================
   config.js — site configuration. EDIT THIS FILE before deploying.
   --------------------------------------------------------------------------
   These are the three values the contact form needs. They are intentionally
   left as placeholders: nothing is invented here. Copy the real values from
   your EmailJS dashboard (see README.md → "EmailJS configuration").

   The EmailJS *public key* is designed to be used in the browser. Never put
   your EmailJS *private key* (or any other secret) in this file.
   ========================================================================== */
window.PORTFOLIO_CONFIG = {
  EMAILJS_PUBLIC_KEY: "EMAILJS_PUBLIC_KEY",   // Account → General → Public Key
  EMAILJS_SERVICE_ID: "EMAILJS_SERVICE_ID",   // Email Services → Service ID
  EMAILJS_TEMPLATE_ID: "EMAILJS_TEMPLATE_ID", // Email Templates → Template ID

  // Shown to visitors if sending fails, so they still have a way to reach you.
  FALLBACK_EMAIL: "ditoerff@gmail.com"
};
