// system/palette.mjs — hand-written canon (this repo; not generated). The ⌘K command palette
// (epic #164 — docs/epics/prototyping-feel-uplift.architecture.md §New pieces "Command palette";
// ticket #168): a native <dialog>-backed, keyboard-first palette on every one of the 11 shipped
// pages — ⌘K / Ctrl-K opens it, type-to-filter fuzzy matching over a static command list,
// ArrowUp/Down + Enter runs a command, Escape closes with focus returned to the invoker
// (showModal()'s own semantics; no focus management is hand-rolled here).
//
// Commands v1: navigate (pages + major exhibits), toggle inspect mode (#166's engine, driven via
// its exported handle), and run actions (start a build, copy tokens, download the pack). Commands
// are PRESENCE-GATED on the page's actual capabilities — "toggle inspect" appears only where a
// [data-inspect] mount exists, "copy tokens" only where the dock's .dock-copy button does. The
// honesty contract: never offer a command that does nothing here. Wave tickets (#169+) light the
// inspect command up page by page with zero edits to this file.
//
// NO pack-switch command (owner decision, epic round 4).
//
// The chrome's ⌘K hint ships in site.js HIDDEN ([data-palette-open] hidden) and is revealed +
// wired here — instance.html and every build-instance.mjs deploy load site.js but not this
// module, so absence of palette.mjs IS the no-dead-button flag. Proto pages load no chrome at
// all: hint is null there, keyboard-only, still fully functional.
//
// Copy-tokens DELEGATES to the dock's own button (dock.mjs owns the pack-aware
// derived/imported/committed branching — the no-fork rule); its "Copied ✓" flip lands inside the
// closed dock, an accepted v1 tradeoff.
//
// Self-initializes when loaded as a page script; Node-import safe (no top-level DOM access).

import { trackToolPalette } from "./analytics.mjs";

// The catalog's component set (#215) — a STATIC second copy of the generated vocabulary's keys,
// deliberately: the palette memoizes its command list at first open (#188 measured a dynamic
// registration racing it by 17–134 ms), so the list is code, and build-checks group 21 pins it
// against handoff/verdant/vocabulary.json — the dock PACKS / bus-toggles TONES pattern. #220 adds
// components by editing this list, and the pin is what forces that edit.
export const CATALOG_COMPONENTS = [
  "care-task-row", "demo-notice", "list-row", "metric-tile", "plant-card",
  "primary-button", "screen-header", "sequence-step", "stat-tile", "status-chip",
];

// --- DOM builder (inspect.mjs / glossary.mjs shape) — text via textContent, never innerHTML.
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

// Normalize a path for current-page comparison — the site's nav is extensionless (CF Pages and
// `npx serve` both resolve /approach → approach.html), so "/approach.html", "/approach" and the
// index forms "/" and "/index.html" must compare equal.
const normalize = (p) => {
  let out = p.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
  return out === "" ? "/" : out;
};

// Fuzzy subsequence match, case-insensitive. Score favours word-start hits and earlier matches;
// null = no match. Empty query matches everything at score 0 (authored order preserved by the
// stable sort in render()).
function fuzzyScore(query, label) {
  const q = query.toLowerCase();
  const l = label.toLowerCase();
  if (!q) return 0;
  let score = 0;
  let li = 0;
  for (const ch of q) {
    const at = l.indexOf(ch, li);
    if (at === -1) return null;
    if (at === 0 || l[at - 1] === " " || l[at - 1] === ":") score += 8; // word-start bonus
    else if (at === li) score += 4; // consecutive run
    score += Math.max(0, 3 - at * 0.05); // earlier-match bonus
    li = at + 1;
  }
  return score;
}

// The static command list, built once at first open (the dock and every other module have long
// mounted by then). Navigation hrefs are the exact forms the chrome uses: extensionless IA pages
// (client.neutral.config.js nav + footer site index, /build joined it in #148), .html for the
// proto pages (work.html's own links).
function buildCommands() {
  const here = normalize(location.pathname);
  const commands = [];

  const pages = [
    ["Go to Home", "/"],
    ["Go to Approach", "/approach"],
    ["Go to Factory", "/factory"],
    ["Go to Work", "/work"],
    ["Go to Contact", "/contact"],
    ["Go to Build a pattern", "/build"],
    ["Go to Components", "/components"],
    ["Go to Round-trip evidence", "/roundtrip"],
    ["Open the Verdant prototype", "/proto/verdant.html"],
    ["Open the Fieldwork prototype", "/proto/fieldwork.html"],
  ];
  for (const [label, href] of pages) {
    if (normalize(href) === here) continue; // never offer "go where you already are"
    commands.push({ label, run: () => location.assign(href) });
  }

  // Exhibits: page + hash, real ids verified against main. Same-page = set the hash (and close);
  // cross-page = one real navigation.
  const exhibits = [
    ["Home: verify it yourself", "/", "verify"],
    ["Approach: derive probe", "/approach", "asrc-probe"],
    ["Approach: code at scale", "/approach", "loc-proof"],
    ["Approach: live-control count", "/approach", "param-proof"],
    ["Factory: agents trace", "/factory", "agents"],
    ["Factory: round-trip diff", "/factory", "round-trip"],
    ["Factory: system shape", "/factory", "shape"],
    ["Work: component library", "/work", "library"],
    ["Work: handoff pack", "/work", "handoff"],
  ];
  // Per-component catalog commands (#215) — the same exhibits idiom, one per CATALOG_COMPONENTS
  // entry: same-page sets the hash (catalog.mjs's hashchange listener moves focus), cross-page
  // navigates to /components#<name>. Static like everything above — see CATALOG_COMPONENTS.
  for (const name of CATALOG_COMPONENTS) exhibits.push([`Components: ${name}`, "/components", name]);
  for (const [label, page, hash] of exhibits) {
    if (normalize(page) === here) {
      commands.push({ label, run: () => { location.hash = hash; }, samePage: true });
    } else {
      commands.push({ label, run: () => location.assign(`${page}#${hash}`) });
    }
  }

  // Toggle inspect — only where a mount exists (home, and both proto pages since #175). Lazy import: on pages without the
  // inspect script tag the module self-inits at import time, so getInspect() is already live;
  // the ?? initInspect() is belt-and-braces. Never call initInspect() unconditionally — it
  // destroys and rebuilds the page's live handle (and hides an open bubble).
  if (document.querySelector("[data-inspect]")) {
    commands.push({
      label: () =>
        document.documentElement.dataset.inspectMode === "on"
          ? "Turn inspect mode off"
          : "Turn inspect mode on",
      run: () =>
        import("./inspect.mjs").then((m) => (m.getInspect() ?? m.initInspect()).toggleInspect()),
      samePage: true,
    });
  }

  // Start a build — the one action about the READER's product (skip when already on it).
  if (here !== "/build") {
    commands.push({ label: "Start a build", run: () => location.assign("/build") });
  }

  // Copy tokens — delegate to the dock's pack-aware button (every page carrying the dock).
  const dockCopy = document.querySelector(".dock-copy");
  if (dockCopy) {
    commands.push({ label: "Copy tokens", run: () => dockCopy.click(), samePage: true });
  }

  // Download the pack — the /handoff.html download's source of truth, same-origin static file.
  commands.push({
    label: "Download the pack",
    run: () => {
      // In the DOM for the click — a detached anchor's download is a historical Safari footgun.
      const a = el("a", { href: "/handoff/verdant/pack.bundle.json", download: "pack.bundle.json" });
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    samePage: true,
  });

  return commands;
}

export function initPalette() {
  const input = el("input", {
    class: "cmdk-input",
    type: "text",
    role: "combobox",
    "aria-haspopup": "listbox",
    "aria-expanded": "false",
    "aria-controls": "cmdk-list",
    "aria-autocomplete": "list",
    "aria-label": "Search commands",
    placeholder: "Type a command…",
    autocomplete: "off",
    spellcheck: "false",
  });
  const list = el("ul", { class: "cmdk-list", id: "cmdk-list", role: "listbox" });
  const empty = el("p", { class: "cmdk-empty", text: "No matching command", hidden: true });
  const dialog = el("dialog", { class: "cmdk", "aria-label": "Command palette" }, input, list, empty);
  document.body.appendChild(dialog);

  let commands = null; // built at first open
  let shown = []; // the currently rendered (filtered) commands
  let active = 0; // index into shown

  const labelOf = (c) => (typeof c.label === "function" ? c.label() : c.label);

  const setActive = (i) => {
    active = i;
    const options = list.children;
    for (let n = 0; n < options.length; n++)
      options[n].setAttribute("aria-selected", String(n === i));
    input.setAttribute("aria-activedescendant", options[i] ? options[i].id : "");
    if (options[i]) options[i].scrollIntoView({ block: "nearest" });
  };

  const runCommand = (c) => {
    // Close FIRST for same-page commands so the palette is gone before the effect lands (hash
    // scroll, inspect toggle, dock copy). Navigations just go — the page teardown closes it.
    if (c.samePage) dialog.close();
    c.run();
    if (!c.samePage) dialog.close();
  };

  const render = (query) => {
    const scored = shown = commands
      .map((c, i) => ({ c, i, score: fuzzyScore(query, labelOf(c)) }))
      .filter((s) => s.score !== null)
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .map((s) => s.c);
    list.replaceChildren(
      ...scored.map((c, i) => {
        const li = el("li", { class: "cmdk-item", id: `cmdk-opt-${i}`, role: "option", text: labelOf(c) });
        li.addEventListener("click", () => runCommand(c));
        return li;
      })
    );
    empty.hidden = scored.length > 0;
    if (scored.length) setActive(0);
    else input.setAttribute("aria-activedescendant", "");
  };

  const openPalette = () => {
    if (dialog.open) return; // rapid double ⌘K — showModal() on an open dialog throws
    commands ??= buildCommands();
    input.value = "";
    render("");
    dialog.showModal();
    input.focus(); // explicit, not just dialog autofocus semantics
    input.setAttribute("aria-expanded", "true");
    // Success path only — the palette is really on screen. The tracker's own guard makes it
    // once-per-visit; a keydown that never got this far records nothing.
    trackToolPalette();
  };

  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault(); // beats Firefox's Ctrl-K search-bar focus while the page has focus
      if (dialog.open) dialog.close();
      else openPalette();
    }
  });

  input.addEventListener("input", () => render(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!shown.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((active + step + shown.length) % shown.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[active]) runCommand(shown[active]);
    }
  });

  // Escape closes the palette natively (dialog cancel) — but dock.mjs and site.js listen for
  // Escape on document/window underneath, and a modal dialog does NOT stop propagation. Without
  // this, closing the palette would also close an open dock (#appearance) or the mobile menu.
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") e.stopPropagation();
  });

  dialog.addEventListener("close", () => input.setAttribute("aria-expanded", "false"));

  // Chrome hint: site.js renders it hidden; this module claims it. Proto pages have no chrome —
  // hint is null there, keyboard-only.
  const hint = document.querySelector("[data-palette-open]");
  if (hint) {
    hint.hidden = false;
    hint.addEventListener("click", openPalette);
  }

  return dialog;
}

if (typeof document !== "undefined") initPalette();
