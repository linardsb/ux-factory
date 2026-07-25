// system/instance-pack.mjs — hand-written canon (this repo; not generated). The private instance's
// own appearance control (epic #70 ticket #81; PRD §6.2 "private = the capability applied to THIS
// company"; docs/epics/per-company-brief.architecture.md §Key decisions "on private instances the
// company pack is a real committed stylesheet in the deploy dir").
//
// Two options, no more: the COMPANY pack this instance was stamped with — read from the page's own
// head <link>, so it is pre-selected by construction and never by a hard-coded id — and `neutral`,
// the no-brand base. Picking one re-points that single <link>'s href inside a view transition: the
// same one-line swap a company build ships and the CI gate performs.
//
// Deliberately NOT system/dock.mjs: the dock hard-allowlists neutral|saulera|verdant, so a company
// pack would make its activePack() report "neutral" and the radio would show neutral checked while
// the page wears the company brand — a lying control. Deliberately NOT importing pack-derived.mjs
// either: that module's tail runs hydrateFromSharedLink() unguarded, which would let a forwarded
// ?brand=… query param override the company's pinned pack. This module imports nothing.
//
// NO localStorage. A private instance PINS its pack (#43); a reader's pick here is session-only and
// a reload returns to the stamped pack. The caption says so — the control must not imply otherwise.
//
// Boot: instance.mjs calls initInstancePack(config) from its own init(), so the instance owns the
// mount order. No self-boot, so a Node import of this module touches no DOM.

// The pack slug is generic here (a company slug is not knowable in advance), which makes the
// contract layer a live hazard: tokens.contract.css matches `tokens.<slug>.css` and PRECEDES the
// pack line in every head, so a first-match search would return it and this control would re-point
// the wrong stylesheet. dock.mjs avoids this with a three-id allowlist; a generic matcher has to
// exclude the one reserved name explicitly.
const PACK_RE = /\/system\/tokens\.([a-z0-9-]+)\.css$/;
const CONTRACT = "contract";
const NEUTRAL = "neutral";

// --- DOM builder (dock.mjs shape) — text via textContent, attrs via setAttribute -----------------
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

// The one pack stylesheet line. The href is ground truth for what the page is wearing.
function linkSlug(link) {
  const m = link && PACK_RE.exec(link.getAttribute("href") || "");
  return m && m[1] !== CONTRACT ? m[1] : null;
}
function packLink() {
  for (const link of document.querySelectorAll('link[rel="stylesheet"]'))
    if (linkSlug(link)) return link;
  return null;
}

// initInstancePack({ name }) — mount the control into #instance-pack-control. Inert (and silent) on
// any page without that mount or without a recognisable pack line.
export function initInstancePack({ name } = {}) {
  const mount = document.getElementById("instance-pack-control");
  if (!mount) return;
  const link = packLink();
  if (!link) return;

  // Capture the stamped company slug ONCE, before any swap: after a swap to neutral the href no
  // longer names the company, so re-deriving it later would lose the option entirely.
  const companySlug = linkSlug(link);
  if (!companySlug) return;

  // An unstamped shell (the committed demo, whose head link is still tokens.neutral.css — the
  // Mechanism A anchor build-instance.mjs rewrites) has exactly one pack and nothing to swap to.
  // Render one honest row and no control rather than a two-option choice that is really one.
  if (companySlug === NEUTRAL) {
    mount.replaceChildren(el("p", { class: "pi-pack-single muted", text:
      "This shell has not been stamped for a company, so it is wearing the neutral base pack. A stamped instance wears its company's own pack here, with the neutral base beside it to compare." }));
    return;
  }

  const options = [
    { id: companySlug, name: typeof name === "string" && name.trim() ? name.trim() : companySlug,
      note: "the pack derived from their brand — what this instance was built wearing" },
    { id: NEUTRAL, name: "neutral", note: "the no-brand base every pack is a skin over" },
  ];

  const fieldset = el("fieldset", { class: "dock-packs pi-pack-set" },
    el("legend", { class: "dock-legend", text: "Token pack" }));
  for (const o of options) {
    const input = el("input", { type: "radio", name: "instance-pack", value: o.id, id: "instance-pack-" + o.id });
    if (o.id === companySlug) input.checked = true;
    fieldset.appendChild(el("div", { class: "dock-pack-row" },
      input,
      el("label", { class: "dock-pack-label", for: "instance-pack-" + o.id },
        el("span", { class: "dock-pack-name", text: o.name }),   // company name — textContent only
        el("span", { class: "dock-pack-note", text: o.note }))));
  }

  // The one transition. `swap` re-points the single href and resolves on load/error, so the
  // crossfade's second frame is fully styled rather than an unstyled flash (dock.mjs:190-203).
  // There is no derived record to re-read here, so no generation counter is needed — the last
  // assignment simply wins, and every pending promise still resolves.
  const swap = (slug) => {
    const href = "/system/tokens." + slug + ".css";
    if (link.getAttribute("href") === href) return Promise.resolve(); // same sheet — no load event fires
    return new Promise((resolve) => {
      link.addEventListener("load", resolve, { once: true });
      link.addEventListener("error", resolve, { once: true });
      link.href = href;
    });
  };

  function selectPack(slug) {
    if (slug !== companySlug && slug !== NEUTRAL) return; // hard allowlist — junk never reaches an href
    // View Transitions are absent in Firefox and stood down under reduced motion; in both cases the
    // else branch runs the swap synchronously, so the re-skin always happens (spine.mjs:184-190).
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && !reduce) {
      const vt = document.startViewTransition(() => swap(slug));
      vt.ready.catch(() => {});     // a skipped transition rejects; the swap still ran
      vt.finished.catch(() => {});
    } else {
      Promise.resolve(swap(slug)).catch(() => {});
    }
  }

  fieldset.addEventListener("change", (e) => {
    if (e.target.name === "instance-pack") selectPack(e.target.value);
  });

  mount.replaceChildren(fieldset, el("p", { class: "pi-pack-caption muted", text:
    "Picking one re-points the single tokens stylesheet line in this page's head — the same swap a company build ships and the CI gate performs. Nothing is components-deep: the components do not change, only the tokens they read. Your pick lasts for this visit; reloading returns the instance to the pack it was built with." }));
  mount.dataset.instancePack = "ready";
}
