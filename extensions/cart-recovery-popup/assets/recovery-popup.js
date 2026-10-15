/**
 * Cart Recovery Popup — storefront script (app embed asset).
 * No external dependencies. Respects prefers-reduced-motion.
 *
 * Flow:
 *  1. Fetch public popup config from the app proxy.
 *  2. Check the cart has items (skip on cart/checkout pages).
 *  3. Arm exit-intent (desktop) and/or timer (mobile-friendly).
 *  4. Show the overlay once per session; CTA applies the discount code.
 */
(function () {
  "use strict";

  var CONFIG_URL = window.__crpConfigUrl;
  if (!CONFIG_URL) return;

  var SESSION_KEY = "crp_shown";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function onCartPage() {
    return /^\/(cart|checkout)/.test(window.location.pathname);
  }

  function alreadyShown(oncePerSession) {
    if (!oncePerSession) return false;
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function markShown() {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch (e) {}
  }

  function buildPopup(cfg) {
    var overlay = document.createElement("div");
    overlay.id = "crp-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", cfg.heading);

    var sub = (cfg.subheading || "").replace("{percent}", String(cfg.discountPercent));

    overlay.innerHTML =
      '<div class="crp-card">' +
      '<button class="crp-close" aria-label="Close">&times;</button>' +
      '<h2 class="crp-heading"></h2>' +
      '<p class="crp-sub"></p>' +
      '<div class="crp-code" role="button" tabindex="0" title="Click to copy"></div>' +
      '<a class="crp-cta" href="/discount/' +
      encodeURIComponent(cfg.discountCode) +
      '"></a>' +
      '<p class="crp-copied" hidden>Copied!</p>' +
      "</div>";

    overlay.querySelector(".crp-heading").textContent = cfg.heading;
    overlay.querySelector(".crp-sub").textContent = sub;
    var codeEl = overlay.querySelector(".crp-code");
    codeEl.textContent = cfg.discountCode;
    overlay.querySelector(".crp-cta").textContent = cfg.buttonText;

    var style = document.createElement("style");
    style.textContent =
      "#crp-overlay{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;" +
      "background:rgba(0,0,0,.6);padding:20px;box-sizing:border-box;" +
      (reduceMotion ? "" : "animation:crpFade .25s ease;") +
      "}" +
      ".crp-card{position:relative;max-width:420px;width:100%;border-radius:16px;padding:36px 32px;text-align:center;" +
      "background:" +
      cfg.backgroundColor +
      ";color:" +
      cfg.textColor +
      ";box-shadow:0 24px 64px rgba(0,0,0,.45);" +
      (reduceMotion ? "" : "animation:crpPop .3s cubic-bezier(.2,.9,.3,1.2);") +
      "}" +
      ".crp-close{position:absolute;top:12px;right:14px;background:none;border:0;font-size:26px;cursor:pointer;color:" +
      cfg.textColor +
      ";opacity:.6}" +
      ".crp-close:hover{opacity:1}" +
      ".crp-heading{margin:0 0 12px;font-size:24px;line-height:1.25}" +
      ".crp-sub{margin:0 0 18px;font-size:15px;line-height:1.5;opacity:.85}" +
      ".crp-code{display:inline-block;font-size:22px;font-weight:800;letter-spacing:2px;padding:12px 24px;" +
      "border:2px dashed " +
      cfg.accentColor +
      ";border-radius:10px;margin-bottom:20px;cursor:pointer;color:" +
      cfg.accentColor +
      "}" +
      ".crp-cta{display:block;text-decoration:none;font-weight:700;font-size:16px;padding:14px 24px;border-radius:999px;" +
      "background:" +
      cfg.accentColor +
      ";color:#000}" +
      ".crp-copied{margin:10px 0 0;font-size:13px;color:" +
      cfg.accentColor +
      "}" +
      "@keyframes crpFade{from{opacity:0}}" +
      "@keyframes crpPop{from{transform:scale(.92);opacity:0}}";

    document.head.appendChild(style);

    function close() {
      overlay.remove();
      style.remove();
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }

    overlay.querySelector(".crp-close").addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", onKey);

    function copyCode() {
      var done = function () {
        overlay.querySelector(".crp-copied").hidden = false;
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cfg.discountCode).then(done, done);
      } else {
        done();
      }
    }
    codeEl.addEventListener("click", copyCode);
    codeEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        copyCode();
      }
    });

    return { overlay: overlay, close: close };
  }

  function show(cfg) {
    if (alreadyShown(cfg.showOncePerSession)) return;
    var p = buildPopup(cfg);
    document.body.appendChild(p.overlay);
    markShown();
  }

  function armExitIntent(cfg) {
    function onMouseOut(e) {
      if (!e.relatedTarget && e.clientY <= 0) {
        document.removeEventListener("mouseout", onMouseOut);
        show(cfg);
      }
    }
    document.addEventListener("mouseout", onMouseOut);
  }

  function armTimer(cfg) {
    var ms = Math.max(5, cfg.delaySeconds || 15) * 1000;
    setTimeout(function () {
      show(cfg);
    }, ms);
  }

  // Boot
  if (onCartPage()) return;

  fetch(CONFIG_URL, { credentials: "same-origin" })
    .then(function (r) {
      if (!r.ok) throw new Error("config " + r.status);
      return r.json();
    })
    .then(function (cfg) {
      if (!cfg || !cfg.enabled) return;
      // Only bother shoppers who actually have items in the cart
      return fetch("/cart.js", { credentials: "same-origin" })
        .then(function (r) {
          return r.json();
        })
        .then(function (cart) {
          if (!cart || !cart.item_count) return;
          if (cfg.trigger === "exit_only") armExitIntent(cfg);
          else if (cfg.trigger === "timed") armTimer(cfg);
          else {
            armExitIntent(cfg);
            armTimer(cfg); // mobile fallback: no mouse to track
          }
        });
    })
    .catch(function () {
      /* fail silently — never break the storefront */
    });
})();
