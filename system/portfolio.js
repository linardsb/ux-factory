// portfolio.js — site-level behaviour additions for the personal portfolio.
// base/site.js is a generated mirror and stays untouched; load THIS after it.
// Adds: a skip-to-content link, a back-to-top button, the header scroll state,
// speculative same-origin prefetch, and a native <dialog> lightbox for .fig-zoom figures.

(function () {
  // ------- SKIP LINK (site.js has already injected the header by now) -------
  var main = document.querySelector("main");
  if (main) {
    if (!main.id) main.id = "main";
    var skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#" + main.id;
    skip.textContent = "Skip to content";
    document.body.prepend(skip);
  }

  // ------- BACK TO TOP -------
  var toTop = document.createElement("button");
  toTop.type = "button";
  toTop.className = "to-top";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.textContent = "↑";
  document.body.appendChild(toTop);

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
  });

  // ------- HEADER SCROLL STATE (site.js has injected it; shadow CSS in portfolio.css) -------
  var header = document.querySelector(".site-header");

  var toTopTick = false;
  function updateToTop() {
    toTop.classList.toggle("show", window.scrollY > window.innerHeight);
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
    toTopTick = false;
  }
  window.addEventListener("scroll", function () {
    if (!toTopTick) { toTopTick = true; requestAnimationFrame(updateToTop); }
  }, { passive: true });
  updateToTop();

  // ------- SPECULATIVE PREFETCH (Chromium 109+; other browsers ignore the rule set) -------
  // Prefetch same-origin pages on link hover/visibility so navigation lands instantly.
  // Prefetch downloads the document only — no script runs, so analytics stay clean.
  if (window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules")) {
    var spec = document.createElement("script");
    spec.type = "speculationrules";
    spec.textContent = JSON.stringify({
      prefetch: [{ source: "document", where: { href_matches: "/*" }, eagerness: "moderate" }]
    });
    document.head.appendChild(spec);
  }

  // ------- LIGHTBOX -------
  var links = document.querySelectorAll("a.fig-zoom");
  if (!links.length || typeof HTMLDialogElement === "undefined") return;

  var dlg = document.createElement("dialog");
  dlg.className = "lightbox";
  var close = document.createElement("button");
  close.type = "button";
  close.className = "lightbox-close";
  close.setAttribute("aria-label", "Close full-size image");
  close.textContent = "×";
  var img = document.createElement("img");
  img.alt = "";
  dlg.append(close, img);
  document.body.appendChild(dlg);

  links.forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var inner = a.querySelector("img");
      img.src = a.getAttribute("href");
      img.alt = inner ? inner.alt : "";
      dlg.showModal();
    });
  });
  close.addEventListener("click", function () { dlg.close(); });
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg) dlg.close(); // backdrop click
  });
  dlg.addEventListener("close", function () { img.removeAttribute("src"); });
})();
