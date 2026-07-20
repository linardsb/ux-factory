// system/dock.mjs — appearance dock: pack switcher + copy-tokens + scroll ruler
// (portfolio-ux-uplift §Phase 5). Hand-written canon, view-time only.
// The dock performs the platform's core claim on the page the reader is looking at:
// picking a pack re-points the ONE tokens.<pack>.css line in this page's head — the
// same swap a company build ships and the CI gate performs (visual.spec.mjs:58).
// "Copy tokens" copies the literal committed artifact currently skinning the page.
// The panel is a non-modal disclosure (APG): location.hash === "#appearance" is the
// single source of truth, so the panel is deep-linkable and back-button honest.
// system/pack-boot.js (classic, pre-paint) restores the persisted choice; the three
// href-swap lines are deliberately duplicated there — sharing would force pack-boot
// into a deferred module (FOUC) or this file out of module hygiene.

const PACKS = [
  { id: "neutral", note: "the no-brand default (generated)" },
  { id: "saulera", note: "reference client pack (hand-authored)" },
  { id: "verdant", note: "factory-derived — generated from the recorded pack-seed run" },
];
const PACK_IDS = PACKS.map((p) => p.id);
const PACK_RE = /\/system\/tokens\.(neutral|saulera|verdant)\.css$/;
const SVGNS = "http://www.w3.org/2000/svg";

// --- DOM builder (handoff-viewer.mjs shape) — text via textContent, attrs via setAttribute.
function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "text") node.textContent = v;
    else if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, String(v));
  }
  for (const c of children) if (c != null) node.appendChild(c);
  return node;
}

// The pack stylesheet line — NOT link[href*="/system/tokens."], which would match
// tokens.contract.css first (it precedes the pack line in every head). The href is
// ground truth for the active pack; storage is only the cross-page memory.
function packLink() {
  for (const link of document.querySelectorAll('link[rel="stylesheet"]'))
    if (PACK_RE.test(link.getAttribute("href") || "")) return link;
  return null;
}
const activePack = () => {
  const link = packLink();
  const m = link && PACK_RE.exec(link.getAttribute("href"));
  return m ? m[1] : "neutral";
};

function applyPack(pack) {
  if (!PACK_IDS.includes(pack)) return; // hard allowlist — never interpolate junk into an href
  const link = packLink();
  if (link) link.href = "/system/tokens." + pack + ".css";
  try { localStorage.setItem("factory-pack", pack); } catch { /* private mode — session-only */ }
}

// ---------- Appearance dock (right rail + disclosure panel) ----------

function buildDock() {
  const toggle = el("button", {
    type: "button", class: "dock-toggle", "aria-label": "Appearance",
    "aria-expanded": "false", "aria-controls": "appearance",
  });
  // Appearance glyph: a half-filled circle (monochrome, decorative).
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const ring = document.createElementNS(SVGNS, "circle");
  ring.setAttribute("cx", "12"); ring.setAttribute("cy", "12"); ring.setAttribute("r", "9");
  ring.setAttribute("fill", "none"); ring.setAttribute("stroke", "currentColor"); ring.setAttribute("stroke-width", "1.5");
  const half = document.createElementNS(SVGNS, "path");
  half.setAttribute("d", "M12 3a9 9 0 0 1 0 18Z");
  half.setAttribute("fill", "currentColor");
  svg.append(ring, half);
  toggle.appendChild(svg);

  const fieldset = el("fieldset", { class: "dock-packs" },
    el("legend", { class: "dock-legend", text: "Token pack" }));
  for (const p of PACKS) {
    const input = el("input", { type: "radio", name: "pack", value: p.id, id: "dock-pack-" + p.id });
    fieldset.appendChild(el("div", { class: "dock-pack-row" },
      input,
      el("label", { class: "dock-pack-label", for: "dock-pack-" + p.id },
        el("span", { class: "dock-pack-name", text: p.id }),
        el("span", { class: "dock-pack-note", text: p.note }))));
  }

  const copyBtn = el("button", { type: "button", class: "btn btn-secondary dock-copy", text: "Copy tokens" });
  const panel = el("section", { class: "dock-panel", id: "appearance", role: "dialog", "aria-label": "Appearance" },
    fieldset,
    copyBtn,
    el("a", { class: "dock-dtcg", href: "/handoff/verdant/tokens.dtcg.json", text: "DTCG source →" }),
    el("p", { class: "dock-caption", text:
      "Choosing a pack swaps the one stylesheet line in this page's head — the same swap a company build ships and the CI gate performs." }));

  const dock = el("aside", { class: "dock" }, toggle, panel);
  document.body.appendChild(dock);

  // Reflect the ACTIVE pack (the href pack-boot may already have restored — ground truth).
  const current = fieldset.querySelector('input[value="' + activePack() + '"]');
  if (current) current.checked = true;

  fieldset.addEventListener("change", (e) => {
    if (e.target.name === "pack") applyPack(e.target.value);
  });

  // Copy the pack CSS the page is being skinned by RIGHT NOW (fetch the current href, so
  // the paste is the committed artifact verbatim). Any failure → honest "Copy failed".
  let copyTimer = null;
  copyBtn.addEventListener("click", () => {
    if (copyTimer) { clearTimeout(copyTimer); copyTimer = null; }
    const link = packLink();
    const done = (label) => {
      copyBtn.textContent = label;
      copyTimer = setTimeout(() => { copyBtn.textContent = "Copy tokens"; copyTimer = null; }, 1600);
    };
    if (!link) { done("Copy failed"); return; }
    fetch(link.href)
      .then((res) => { if (!res.ok) throw new Error("HTTP " + res.status); return res.text(); })
      .then((text) => navigator.clipboard.writeText(text))
      .then(() => done("Copied ✓"))
      .catch(() => done("Copy failed"));
  });

  // --- Disclosure state machine: the hash IS the state (deep link /#appearance works).
  let open = false;
  const focusPanel = () => {
    const checked = fieldset.querySelector("input:checked") || fieldset.querySelector("input");
    if (checked) checked.focus();
  };
  const setOpen = (next) => {
    if (next === open) return;
    open = next;
    panel.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      focusPanel();
    } else {
      toggle.focus();
    }
  };
  const sync = () => setOpen(location.hash === "#appearance");
  // pushState (not `location.hash = ""`) so closing neither scroll-jumps nor leaves a bare #.
  const stripHash = () => { history.pushState(null, "", location.pathname); sync(); };

  toggle.addEventListener("click", () => {
    if (location.hash === "#appearance") stripHash();
    else location.hash = "appearance"; // fires hashchange → sync
  });
  window.addEventListener("hashchange", sync);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && location.hash === "#appearance") stripHash(); // mirrors site.js:86-88
  });
  document.addEventListener("click", (e) => {
    if (location.hash === "#appearance" && !dock.contains(e.target)) stripHash();
  });
  sync(); // direct-load /#appearance → open on arrival
  // On that direct load the browser's fragment navigation (parse end, re-run at load) clears
  // focus back to <body> AFTER this module runs — re-assert the panel focus once, at load.
  window.addEventListener("load", () => { if (open) focusPanel(); }, { once: true });
}

// ---------- Scroll ruler (left rail, decorative minimap) ----------

function buildRuler() {
  const sections = document.querySelectorAll("main > section");
  if (sections.length < 3) return; // short pages (contact, 404) carry no ruler
  const ruler = el("aside", { class: "ruler", "aria-hidden": "true" }, el("div", { class: "ruler-fill" }));
  const ticks = [...sections].map(() => {
    const t = el("div", { class: "ruler-tick" });
    ruler.appendChild(t);
    return t;
  });
  document.body.appendChild(ruler);

  const place = () => {
    const total = document.documentElement.scrollHeight;
    sections.forEach((s, i) => { ticks[i].style.top = (s.offsetTop / total) * 100 + "%"; });
  };
  // rAF-throttled resize (portfolio.js:34-43 idiom); CSS media query owns visibility, so
  // resize never adds/removes the rail — it only re-measures tick positions.
  let tick = false;
  window.addEventListener("resize", () => {
    if (!tick) { tick = true; requestAnimationFrame(() => { place(); tick = false; }); }
  }, { passive: true });
  window.addEventListener("load", place); // re-measure after fonts/images settle layout
  place();
}

buildDock();
buildRuler();
