// system/glossary.mjs — hand-written canon (this repo; not generated). Inline term-definition
// bubbles for <dfn data-term> marks on approach.html
// (docs/epics/annotated-source-glossary.architecture.md; PRD §6 register — quiet clarification
// in place, not a glossary feature, no pedagogy framing).
//
// WCAG 1.4.13 Content on Hover or Focus — the bubble satisfies all three requirements:
//   dismissible — Esc hides it without moving pointer or focus;
//   hoverable   — the hide is a ~120ms timeout the bubble's own mouseenter cancels, so the
//                 pointer can travel from term to bubble;
//   persistent  — it stays until hover/focus leaves, Esc, or scroll (a fixed-position bubble
//                 would detach from scrolling text, so scroll hides it).
// The bubble is position:fixed so no ancestor overflow can clip it (the one hard-won lesson
// borrowed from the pattern source — patterns only, no code adopted).
//
// initGlossary(root) wires every [data-term] under root to ONE shared bubble node. An unknown
// term key throws before any DOM is touched — loud in dev, and on approach.html the page
// script aborts before setting the VR ready flag, so CI fails instead of baselining it.
// No self-init (Node-import safe). Returns { destroy }.

// --- DOM builder (agentic-renderer.mjs shape) — text via textContent, attrs via setAttribute.
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

// The v1 term map (author's voice). Superset-ready: keys unused on a given page cost nothing,
// so other pages can mark terms later without touching this module.
const TERMS = {
  "semantic-token":
    "A named design value that describes its role — --color-accent, --spacing-md — rather than a literal colour or size. Components reference the name; whichever brand pack is loaded supplies the value.",
  "token-contract":
    "The complete list of semantic tokens components are allowed to use, each with a neutral fallback. It's the interface between the components and any brand: satisfy the contract and the whole site re-skins.",
  "brand-pack":
    "One CSS file that assigns a brand's values to the token contract. Swapping that single file — one line in the page head — re-skins every component on the site.",
  "structured-data":
    "Machine-readable JSON-LD embedded in a page so software can read what the page is about, not just scrape its text.",
  "llms-txt":
    "A plain-text index of a site written for AI agents — the way sitemap.xml is written for search crawlers.",
  "activation":
    "The moment a new user first gets real value from a product — the early signal that predicts whether they'll stay.",
  "retention":
    "Whether people come back and keep using the thing after the first try — the slower, more honest measure that a feature worked.",
};

export function initGlossary(root = document) {
  // Validate every mark BEFORE touching the DOM — an unknown key aborts the whole init.
  const triggers = [...root.querySelectorAll("[data-term]")];
  for (const t of triggers)
    if (!TERMS[t.dataset.term])
      throw new Error(`glossary: unknown term "${t.dataset.term}" on ${location.pathname}`);

  const bubble = el("div", { class: "glossary-bubble", id: "glossary-bubble", role: "tooltip", hidden: true });
  document.body.appendChild(bubble);

  let open = null; // the trigger currently described, or null
  let hideTimer = 0;
  let hovered = false; // pointer is over a trigger or the bubble
  let focusTrigger = null; // the trigger holding keyboard focus, or null

  function position(trigger) {
    const r = trigger.getBoundingClientRect();
    // Measure after content is set and the bubble unhidden. Below the term by default; flip
    // above near the viewport bottom; clamp left to 8px margins so it never leaves the screen.
    const flip = window.innerHeight - r.bottom < Math.max(bubble.offsetHeight + 16, 120);
    bubble.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - bubble.offsetWidth - 8))}px`;
    bubble.style.top = `${flip ? r.top - bubble.offsetHeight - 8 : r.bottom + 8}px`;
  }

  function show(trigger) {
    clearTimeout(hideTimer);
    if (open && open !== trigger) open.removeAttribute("aria-describedby");
    bubble.textContent = TERMS[trigger.dataset.term]; // textContent — never innerHTML
    bubble.hidden = false;
    position(trigger);
    trigger.setAttribute("aria-describedby", "glossary-bubble");
    open = trigger;
  }

  function hide() {
    clearTimeout(hideTimer);
    bubble.hidden = true;
    if (open) { open.removeAttribute("aria-describedby"); open = null; }
  }

  // 1.4.13 hoverable: leaving the trigger only ARMS the hide; reaching the bubble cancels it.
  // Hover and focus are tracked separately — a pointer graze must not hide the bubble while
  // keyboard focus still holds a term, so the timer re-shows the focused term instead.
  function armHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (hovered) return;
      if (focusTrigger) show(focusTrigger);
      else hide();
    }, 120);
  }

  // One AbortController for every listener, so destroy() detaches the per-trigger handlers too.
  const wiring = new AbortController();
  const { signal } = wiring;
  for (const t of triggers) {
    t.addEventListener("mouseenter", () => { hovered = true; show(t); }, { signal });
    t.addEventListener("focusin", () => { focusTrigger = t; show(t); }, { signal });
    t.addEventListener("mouseleave", () => { hovered = false; armHide(); }, { signal });
    t.addEventListener("focusout", () => { focusTrigger = null; armHide(); }, { signal });
  }
  bubble.addEventListener("mouseenter", () => { hovered = true; clearTimeout(hideTimer); }, { signal });
  bubble.addEventListener("mouseleave", () => { hovered = false; armHide(); }, { signal });

  // 1.4.13 dismissible: Esc, only while open. Scroll hides too — a fixed bubble would detach.
  document.addEventListener("keydown", (e) => { if (!bubble.hidden && e.key === "Escape") hide(); }, { signal });
  window.addEventListener("scroll", () => { if (!bubble.hidden) hide(); }, { passive: true, signal });

  const destroy = () => {
    hide();
    bubble.remove();
    wiring.abort();
  };
  return { destroy };
}
