// system/site.js — hand-written canon (this repo; not generated).
// base — shared chrome (header, mobile nav, footer), injected from a per-client config.
//
// Brand-agnostic: every brand string, link and asset path comes from
// window.CLIENT_CONFIG (see client/<client>/client.config.js). No brand content
// lives in this file. Load the client config BEFORE this script.
//
// Pages opt in via the body dataset:
//   <body data-page="home">                  marks the matching nav item active (by key)
//   <body data-page="home" data-header="ocean">   dark "ocean" header variant
// Optional <... id="site-header"> / <... id="site-footer"> slots control placement;
// otherwise the header is prepended and the footer appended to <body>.

(function () {
  const cfg = window.CLIENT_CONFIG;
  if (!cfg) {
    console.warn("[site.js] window.CLIENT_CONFIG not found — load the client config before site.js.");
    return;
  }

  // Escape config text for safe injection via innerHTML.
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const brand = cfg.brand || {};
  const home = brand.homeHref || "/";
  const logo = brand.logo || {};
  const nav = cfg.nav || [];
  const cta = cfg.cta || null;
  const footer = cfg.footer || {};

  const page = document.body.dataset.page || "";
  const headerVariant = document.body.dataset.header || "stone";
  const onOcean = headerVariant === "ocean";

  // ------- HEADER -------
  const headerEl = document.createElement("header");
  headerEl.className = "site-header" + (onOcean ? " on-ocean" : "");
  headerEl.innerHTML = `
    <div class="container nav-row">
      <a class="nav-logo brand-lockup" href="${esc(home)}" aria-label="${esc(brand.name)} home">
        <img src="${esc(onOcean ? logo.onDark : logo.default)}" alt="${esc(brand.name)}" />
      </a>
      <button class="nav-toggle" type="button" aria-label="open menu" aria-expanded="false" aria-controls="nav-panel">
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </button>
      <div class="nav-panel" id="nav-panel">
        <nav class="nav-links" aria-label="primary">
          ${nav.map((n) => `
            <a href="${esc(n.href)}" class="${n.key === page ? "active" : ""}">${esc(n.label)}</a>
          `).join("")}
        </nav>
        ${cta ? `<a class="nav-cta" href="${esc(cta.href)}">${esc(cta.label)}</a>` : ""}
      </div>
    </div>
  `;

  const headerSlot = document.getElementById("site-header");
  if (headerSlot) headerSlot.replaceWith(headerEl);
  else document.body.prepend(headerEl);

  // ------- MOBILE MENU TOGGLE -------
  const toggle = headerEl.querySelector(".nav-toggle");
  const panel = headerEl.querySelector(".nav-panel");
  const openMenu = () => {
    panel.classList.add("open");
    toggle.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "close menu");
  };
  const closeMenu = () => {
    panel.classList.remove("open");
    toggle.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "open menu");
  };
  toggle.addEventListener("click", () => {
    if (panel.classList.contains("open")) closeMenu(); else openMenu();
  });
  panel.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("open")) closeMenu();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 640) closeMenu();
  });

  // ------- FOOTER -------
  const columnsHTML = (footer.columns || []).map((col) => {
    const tag = col.address ? "address" : "div";
    const items = (col.items || []).map((it) =>
      `<li>${
        it.href
          ? `<a href="${esc(it.href)}"${it.rel ? ` rel="${esc(it.rel)}"` : ""}>${esc(it.label)}</a>`
          : esc(it.label)
      }</li>`).join("");
    return `
        <${tag} class="footer-col"${col.address ? ' style="font-style: normal;"' : ""}>
          <h4>${esc(col.title)}</h4>
          <ul>${items}</ul>
        </${tag}>`;
  }).join("");

  const areas = footer.areas || null;
  const areasHTML = areas ? `
      <div class="footer-areas">
        <span class="footer-areas-label">${esc(areas.label)}</span>
        <nav class="footer-areas-links" aria-label="service areas">
          ${(areas.links || []).map((a) => `<a href="${esc(a.href)}">${esc(a.label)}</a>`).join("")}
          ${areas.all ? `<a href="${esc(areas.all.href)}" class="all">${esc(areas.all.label)} →</a>` : ""}
        </nav>
      </div>` : "";

  const footerEl = document.createElement("footer");
  footerEl.className = "site-footer";
  footerEl.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a class="brand-lockup lg" href="${esc(home)}" style="margin-bottom: var(--spacing-md);">
            <img src="${esc(logo.onDark)}" alt="${esc(brand.name)}" />
          </a>
          <p class="footer-tag">${esc(footer.tagline)}</p>
        </div>
        ${columnsHTML}
      </div>
      ${areasHTML}
      <div class="footer-bottom">
        <span>${esc(footer.copyright)}</span>
        ${footer.disclaimer ? `<span class="footer-disclaimer">${esc(footer.disclaimer)}</span>` : ""}
      </div>
    </div>
  `;

  const footerSlot = document.getElementById("site-footer");
  if (footerSlot) footerSlot.replaceWith(footerEl);
  else document.body.appendChild(footerEl);
})();
