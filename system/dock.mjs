// system/dock.mjs — the appearance control: pack switcher + copy-tokens + scroll ruler
// (portfolio-ux-uplift §Phase 5; redesigned for v3 by epic #70 ticket #76). Hand-written canon,
// view-time only.
// The control performs the platform's core claim on the page the reader is looking at: picking a
// pack re-points the ONE tokens.<pack>.css line in this page's head — the same swap a company
// build ships and the CI gate performs (visual.spec.mjs:58). It is fixed side chrome on all eight
// pages on purpose: the pick follows the reader, so every page they open is another test of the
// same token contract. index.html's #beat-wear interstitial introduces it, so it is never an
// unexplained widget (#76; PRD §2 "weird colour selectors, for what").
// "Copy tokens" copies what is skinning the page RIGHT NOW: the committed artifact for a committed
// pack, the derived custom properties for "your brand".
// The panel is a non-modal disclosure (APG): location.hash === "#appearance" is the single source
// of truth, so the panel is deep-linkable and back-button honest.
// system/pack-boot.js (classic, pre-paint) restores the persisted choice; the three href-swap lines
// are deliberately duplicated there — sharing would force pack-boot into a deferred module (FOUC)
// or this file out of module hygiene.
//
// The fourth option, "your brand", is the visitor's own derived pack (#74). It is not a stylesheet
// but a set of inline --color-* props, so the two mechanisms coexist last-write-wins and every bug
// lives at their boundary — see selectPack() for the three rules that keep them honest.

import {
  readRecord, applyToRoot, clearRoot, wear,
  SELECTOR_KEY, PREWEAR_KEY, BRAND_CHANGE_EVENT,
} from "./pack-derived.mjs";

const PACKS = [
  { id: "neutral", name: "neutral", note: "the no-brand default (generated)" },
  { id: "saulera", name: "saulera", note: "reference client pack (hand-authored)" },
  { id: "verdant", name: "verdant", note: "factory-derived, generated from the recorded pack-seed run" },
];
const PACK_IDS = PACKS.map((p) => p.id);
const PACK_RE = /\/system\/tokens\.(neutral|saulera|verdant)\.css$/;
const DERIVED_ID = "derived";
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
function svgEl(tag, attrs) {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
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

// Is the stored record's colour set the one actually sitting on :root right now? Same
// ground-truth-from-the-DOM rule as activePack() reading the href: the radio reflects what the
// page is WEARING, never a storage value that has not landed. It also rules out the hero's ~1.2s
// canned re-skin (spine.mjs:132), whose values are the demo brand's, not this record's.
function derivedOnRoot(rec) {
  const entries = rec && rec.tokens ? Object.entries(rec.tokens) : [];
  if (!entries.length) return false;
  const style = document.documentElement.style;
  return entries.every(([k, v]) => style.getPropertyValue(k) === v);
}

const selectorIsDerived = () => {
  try { return localStorage.getItem(SELECTOR_KEY) === "derived"; } catch { return false; }
};

// The selection the page is currently in: "your brand" only when the site is WEARING it (the
// selector says so AND its colours are the ones on :root), else the pack in the head. Both halves
// matter. Without the selector, a colour entered in #beat-brand and left unworn would read as the
// selection while the committed base is still saulera — so the row would show as already picked
// and clicking it (no change event) could never move the reader onto the honest neutral base.
// Without the :root check, a page that never applied the record would claim to wear it.
function groundTruth() {
  const rec = readRecord();
  return rec && selectorIsDerived() && derivedOnRoot(rec) ? DERIVED_ID : activePack();
}

// Honest label (architecture boundary "Honesty labeling for derived brands", mirroring the copy in
// pack-derived.mjs:150): the visitor's name may appear only inside a sentence that denies the
// affiliation, and only ever as inert textContent.
const derivedNote = (label) =>
  label && label !== "your brand"
    ? "derived here, not " + label + "'s official design system"
    : "derived here, not an official design system";

// ---------- Appearance dock (right rail + disclosure panel) ----------

function buildDock() {
  // The dock's own view of the selection. selectPack() sets it synchronously on an explicit pick,
  // so the radio never waits on the view transition's async callback to settle.
  let selection = groundTruth();
  // dispatchEvent is synchronous, so wear() re-enters our own BRAND_CHANGE_EVENT listener. This
  // flag keeps that listener to REFLECTING state (it must never re-apply, or it re-enters its caller).
  let selfEmit = false;

  const toggle = el("button", {
    type: "button", class: "dock-toggle", "aria-label": "Appearance",
    "aria-expanded": "false", "aria-controls": "appearance",
  });
  // Appearance glyph: a circle whose filled half sweeps to the other side when the panel opens —
  // the morph the --motion-icon-morph token exists for. CSS owns it, keyed on the DISCRETE
  // aria-expanded attribute (never a per-render keyframe — the PR-#55 restart-and-blank trap).
  const svg = svgEl("svg", { viewBox: "0 0 24 24", width: "18", height: "18", class: "dock-glyph", "aria-hidden": "true", focusable: "false" });
  svg.append(
    svgEl("circle", { cx: "12", cy: "12", r: "9", fill: "none", stroke: "currentColor", "stroke-width": "1.5" }),
    svgEl("path", { class: "dock-glyph-half", d: "M12 3a9 9 0 0 1 0 18Z", fill: "currentColor" })
  );
  toggle.appendChild(svg);

  const fieldset = el("fieldset", { class: "dock-packs" },
    el("legend", { class: "dock-legend", text: "Token pack" }));

  // Rebuild the option rows. The fourth row exists only while a derived record does, so the
  // control offers "your brand" the moment a colour is entered in #beat-brand, with no reload.
  function renderPacks() {
    const hadFocus = fieldset.contains(document.activeElement);
    for (const row of fieldset.querySelectorAll(".dock-pack-row")) row.remove();
    const rec = readRecord(); // null for a missing/malformed/foreign record → no row, no re-validation here
    const options = rec
      ? [...PACKS, { id: DERIVED_ID, name: "your brand", note: derivedNote(rec.label) }]
      : PACKS;
    for (const o of options) {
      const input = el("input", { type: "radio", name: "pack", value: o.id, id: "dock-pack-" + o.id });
      fieldset.appendChild(el("div", { class: "dock-pack-row" },
        input,
        el("label", { class: "dock-pack-label", for: "dock-pack-" + o.id },
          el("span", { class: "dock-pack-name", text: o.name }),
          el("span", { class: "dock-pack-note", text: o.note })))); // visitor name — textContent only
    }
    syncChecked();
    // The row holding focus was just replaced; hand focus to the checked one rather than <body>.
    if (hadFocus) {
      const checked = fieldset.querySelector("input:checked");
      if (checked) checked.focus();
    }
  }

  // Reflect `selection` on the radios (falling back to neutral if the selected row is gone —
  // e.g. the record was forgotten while "your brand" was picked). No interpolation into a selector.
  function syncChecked() {
    const inputs = [...fieldset.querySelectorAll('input[name="pack"]')];
    const target = inputs.find((i) => i.value === selection) || inputs.find((i) => i.value === "neutral");
    if (target) target.checked = true;
  }

  // The one transition. Three rules keep the inline/committed boundary honest:
  //   1. clearRoot FIRST — inline --color-* props outrank a pack sheet, so leaving a previous
  //      brand's colours would ghost it over the pack that just loaded.
  //   2. "your brand" always rides the NEUTRAL base — the committed packs each set 26 non-colour
  //      tokens (type/space/radius), so wearing a brand over saulera would blend saulera's
  //      typography into a palette that never asked for it.
  //   3. every mutation happens INSIDE the view-transition callback, so the two captured frames
  //      are "before" and "after" — mutating first would show a neutral flash mid-crossfade.
  function selectPack(target) {
    const derived = target === DERIVED_ID;
    const rec = readRecord();
    if (derived ? !rec : !PACK_IDS.includes(target)) return; // hard allowlist — junk never reaches an href
    const link = packLink();
    const href = "/system/tokens." + (derived ? "neutral" : target) + ".css";

    const swap = () => {
      // Gated on the record, not on the selector: a colour entered in #beat-brand WITHOUT "wear"
      // is on :root while the selector still says saulera, and those props must go too.
      if (rec) clearRoot(rec.tokens); // removeProperty on an unset key is a no-op
      if (!link || link.getAttribute("href") === href) {
        if (derived) applyToRoot(rec.tokens);
        return Promise.resolve(); // same sheet — re-assigning href never re-fires load, so never await one
      }
      return new Promise((resolve) => {
        const done = () => { if (derived) applyToRoot(rec.tokens); resolve(); };
        link.addEventListener("load", done, { once: true });
        link.addEventListener("error", done, { once: true });
        link.href = href;
      });
    };

    // pack-crossfade: the one-line re-skin is witnessed, not snapped. The view transition resolves
    // once the new sheet has loaded, so both captured frames are fully styled; without VT support
    // or under reduced motion the swap stays instant.
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && !reduce) {
      // A skipped transition (hidden document, engine bail-out) rejects; the swap itself still
      // runs, so swallow it rather than leave an unhandled rejection in the console. Firefox
      // rejects .ready in that case, so both handles are covered (spine.mjs:186 idiom).
      const vt = document.startViewTransition(swap);
      vt.ready.catch(() => {});
      vt.finished.catch(() => {});
    } else swap();

    selection = target;
    if (derived) {
      selfEmit = true;
      wear(); // owns the derived selector AND backs up the pack it displaces, so unwear() hands it back
      selfEmit = false;
    } else {
      try {
        localStorage.setItem(SELECTOR_KEY, target);
        localStorage.removeItem(PREWEAR_KEY); // an explicit pick supersedes the backup, so it spends it
      } catch { /* private mode — session-only */ }
    }
    syncChecked();
  }

  const resetBtn = el("button", { type: "button", class: "btn btn-ghost dock-reset", text: "Reset to neutral" });
  const copyBtn = el("button", { type: "button", class: "btn btn-secondary dock-copy", text: "Copy tokens" });
  const panel = el("section", { class: "dock-panel", id: "appearance", role: "dialog", "aria-label": "Appearance" },
    el("p", { class: "dock-eyebrow", text: "Appearance" }),
    el("h2", { class: "dock-title", text: "Pick the design system this site wears." }),
    fieldset,
    el("div", { class: "dock-actions" }, copyBtn, resetBtn),
    el("a", { class: "dock-dtcg", href: "/handoff/verdant/tokens.dtcg.json", text: "DTCG source →" }),
    el("p", { class: "dock-caption", text:
      "Your pick follows you to every page. Choosing a committed pack swaps the one stylesheet line in this page's head, the same swap a company build ships and the CI gate performs." }));

  const dock = el("aside", { class: "dock" }, toggle, panel);
  document.body.appendChild(dock);
  renderPacks();

  fieldset.addEventListener("change", (e) => {
    if (e.target.name === "pack") selectPack(e.target.value);
  });

  // Reset stops the site wearing anything and returns to the neutral base. It deliberately KEEPS
  // the derived record, so "your brand" stays on offer without re-entering a colour (#74 owns the
  // forget primitive; nothing in the acceptance set asks this control to forget).
  resetBtn.addEventListener("click", () => selectPack("neutral"));

  // Something outside this module changed the record or the selector (#beat-brand is the only
  // other writer today). storage events do not fire in the same tab, so this CustomEvent is the
  // only way to hear it. REFLECT ONLY — see `selfEmit`.
  window.addEventListener(BRAND_CHANGE_EVENT, () => {
    if (!selfEmit) selection = groundTruth();
    renderPacks();
  });

  // Copy what is skinning the page RIGHT NOW. For a committed pack that is the artifact itself
  // (fetch the live href, so the paste is verbatim); for "your brand" the committed sheet is only
  // the neutral base, so copying it would hand over the wrong thing — the derived custom
  // properties are what re-skins the page, and they are labelled as derived here, not shipped.
  let copyTimer = null;
  copyBtn.addEventListener("click", () => {
    if (copyTimer) { clearTimeout(copyTimer); copyTimer = null; }
    const done = (label) => {
      copyBtn.textContent = label;
      copyTimer = setTimeout(() => { copyBtn.textContent = "Copy tokens"; copyTimer = null; }, 1600);
    };
    if (selection === DERIVED_ID) {
      const rec = readRecord();
      if (!rec) { done("Copy failed"); return; }
      const body = Object.entries(rec.tokens).map(([k, v]) => "  " + k + ": " + v + ";").join("\n");
      const text = "/* your brand — derived in this browser from the colour you entered.\n" +
        "   Colour tokens only; every other token comes from the neutral pack. */\n" +
        ":root {\n" + body + "\n}\n";
      navigator.clipboard.writeText(text).then(() => done("Copied ✓")).catch(() => done("Copy failed"));
      return;
    }
    const link = packLink();
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
