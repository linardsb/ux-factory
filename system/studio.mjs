// system/studio.mjs — hand-written canon (this repo; not generated). The studio's ORCHESTRATOR
// (epic #202 — docs/epics/prototype-studio.architecture.md §Recommended approach / §Other eng-lead
// calls "Route surgery"; ticket #206; .claude/plans/studio-route-surgery-orchestrator-206.md).
//
// /factory stops being a tabbed viewer of three read-only exhibits and becomes THE STUDIO: a canvas
// holding the drafted breadboard, a docked inspector beside it, and Act 0 above it. This file adds
// no capability. Everything it drives is already shipped and already gated:
//
//   · the canvas          system/studio-canvas.mjs   (#204, build-checks group 12)
//   · its verbs           system/studio-verbs.mjs    (#205, group 13, tooling/studio-journey.mjs)
//   · the board           system/breadboard.mjs      draftBoard over build-questions.mjs's store
//   · the pattern reading system/pattern-rules.mjs   patternFor + affordanceCount
//   · Act 0               system/build-import.mjs    which SELF-BOOTS on the page's mount attributes
//
// IMPORT, NEVER FORK. Act 0 appears here for the cost of markup because build-import.mjs boots on
// [data-build-import] rather than exposing a mount function — so pack-import.mjs stays the one
// mapping engine and vetTokens stays the one application point, both by not being touched. If this
// file ever needs to CALL a /build module rather than declare its mount, that is a missing seam in
// that module, not a licence to copy it here.
//
// THE BUS IS THE DRIVE PATH, AND THERE IS EXACTLY ONE MOVER. Movement belongs to
// mountCanvasVerbs's single ui.move consumer; #209's replay driver takes the canvas over through
// getVerbs()'s source:"agent" seam. A direct applySlot from here would give it a seam to fight.
//
// THIS FILE READS THE BUILD STORE AND NEVER WRITES IT. No publishBuild, no setAnswers. Writing it
// would make /build's state depend on having visited /factory, which no AC asks for and no gate
// covers. The store is in-memory (build-questions.mjs:65-73), so at rest the board here is always
// draftBoard(DEFAULT_ANSWERS) — deterministic for the pixel gate by construction.
//
// ZERO INLINE STYLES, ZERO MARKUP FROM A STRING. build-checks group 7 includes this file with no
// exception argued: layout is classes and data-* resolved in system/studio.css, and every node is
// built element by element. tooling/studio-journey.mjs's running-page hasAttribute("style") pass is
// the other half of that claim — grep proves the source, not the page.
//
// Node-import safe: no DOM outside a function body, and the self-boot at the bottom is behind a
// `typeof document` guard, because tooling/build-checks.mjs imports this file for its pure layer.

import { initStudioCanvas, MAX_COLS, clampSlot } from "./studio-canvas.mjs";
import { mountCanvasVerbs } from "./studio-verbs.mjs";
import { createBus } from "./action-bus.mjs";
import { draftBoard, isBoard } from "./breadboard.mjs";
import { DEFAULT_ANSWERS, readBuild } from "./build-questions.mjs";
import { affordanceCount, PATTERNS, patternFor } from "./pattern-rules.mjs";
import { initGlossary } from "./glossary.mjs";
import { refreshInspect } from "./inspect.mjs";

// ---- the pure layer ----------------------------------------------------------------------------
// Plain data in, plain data out, so build-checks group 14 drives it in CI with no browser — the
// same split studio-canvas.mjs:34-73 and studio-verbs.mjs:60-235 carry.

// arrangeBoard(board) → [{ id, label, affordances, col, row }].
//
// The board's places become canvas slots along row 1, in BOARD ORDER — which puts the entry place
// first, because draftBoard builds it first (breadboard.mjs:124) and every later edit verb appends.
// Reading the order rather than re-deriving "which one is the entry" keeps one answer to that
// question, in the module that owns the board.
//
// TOTAL BY CONTRACT: a null, a garbage object or a board whose places are junk returns [], never
// throws. mountStudio's `finally` resolves the readiness handle on every path, but that is a gate
// contract, not a licence to let a bad store crash the page before the canvas exists.
//
// Every slot goes through the canvas's own clampSlot, so "on the grid" has ONE definition
// (studio-canvas.mjs:50) rather than a second opinion here. The MAX_COLS truncation is a real
// break, not a clamp: clamping would pile places 13+ onto column 12, which is a stacking claim the
// canvas explicitly refuses. What is dropped is STATED by the surface — buildSummary counts the
// whole board, so the panel's place count and the arranged length disagree visibly when they
// disagree at all.
export function arrangeBoard(board) {
  const places = board && Array.isArray(board.places) ? board.places : [];
  const out = [];
  for (const place of places) {
    if (!place || typeof place !== "object") continue;
    const col = out.length + 1;
    if (col > MAX_COLS) break;
    const slot = clampSlot({ col, row: 1 });
    const affordances = (Array.isArray(place.affordances) ? place.affordances : [])
      .filter((aff) => aff && typeof aff === "object")
      .map((aff) => ({ id: String(aff.id ?? ""), label: String(aff.label ?? "") }));
    out.push({ id: String(place.id ?? `p${col}`), label: String(place.label ?? "Place"), affordances, ...slot });
  }
  return out;
}

// buildSummary(board, answers) → { patternId, patternLabel, reason, places, affordances, connections }.
//
// EVERY NUMBER IS COUNTED FROM THE BOARD, none is invented — pattern-rules.mjs's honesty rule,
// inherited rather than restated. `reason` is carried through because the surface renders the rule
// VERBATIM: patternFor's sentence is not a description of the rule, it IS the rule
// (pattern-rules.mjs:141-144), and paraphrasing a committed rule on the page that exists to be
// checkable would be the one sentence here that cannot be checked.
export function buildSummary(board, answers) {
  const b = isBoard(board) ? board : null;
  const pattern = patternFor({ answers: answers ?? null, board: b });
  const known = pattern.id && Object.hasOwn(PATTERNS, pattern.id) ? PATTERNS[pattern.id] : null;
  return {
    patternId: pattern.id,
    patternLabel: known ? known.label : null,
    reason: pattern.reason,
    places: b && Array.isArray(b.places) ? b.places.length : 0,
    affordances: affordanceCount(b),
    connections: b && Array.isArray(b.connections) ? b.connections.length : 0,
  };
}

// ---- the mount ---------------------------------------------------------------------------------

// Copied rather than imported, like every other hand-written canon module (studio-canvas.mjs:80,
// device-frame.mjs:33, scrub.mjs:104). A shared one would be a dependency between modules that are
// deliberately independent surfaces.
const el = (tag, attrs, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "text") n.textContent = v;
    else n.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids) if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return n;
};

let live = null;

// The driver's seam (studio-canvas.mjs:95's idiom). tooling/studio-journey.mjs reaches the studio
// through this, never through a window global.
export const getStudio = () => live;

// The inspector's panels, in order. THE LAST THREE IDS ARE FIXED BY FOUR INBOUND ENTRY POINTS and
// must not be renamed: system/palette.mjs:102-104 registers three ⌘K deep-link commands against
// them AND memoizes its command list at first open, and roundtrip.html:176 links back to
// /factory#round-trip. A rename here breaks all four silently — nothing throws, the links just stop
// resolving. `mount` names the panel's own mount node; `this-build` is rendered by this file and
// the other three are lazily imported exhibits.
const PANELS = [
  { id: "this-build", label: "This build" },
  { id: "agents", label: "Traces", mount: "agents-player" },
  { id: "round-trip", label: "Round-trip", mount: "roundtrip-diff" },
  { id: "shape", label: "Graph", mount: "system-graph" },
];

const errorCard = (mount, message) => {
  if (!mount) return;
  mount.textContent = "";
  mount.append(el("article", { class: "card trace-error-card stu-error-card" },
    // Classless: there is no .h4 utility in components.css, and the base h1-h4 rule (:48) is what
    // this wants. Inventing a class here would be a literal in a sheet that has none.
    el("h4", { text: "This part of the exhibit couldn’t load" }),
    el("p", { class: "muted", text: message })));
};

// The three absorbed exhibits, mounted on FIRST ACTIVATION rather than at load. That is the
// arrangement AC #2 asks for in its own words: factory's three at-load ready handles stop existing,
// and at rest — which is what the pixel gate captures — none of the three has fetched or rendered
// anything. Each is idempotent through the `mounted` set, and each swallows its own failure into an
// error card instead of rejecting, because an unhandled rejection is a console error and
// tooling/studio-journey.mjs's no-page-errors contract is a real assertion.
//
// The dynamic import()s take ROOT-ABSOLUTE urls, and so do the fetches. The static imports at the
// top of this file are relative because Node resolves those; nothing in here runs in Node
// (derivation-roundtrip.mjs:344-345 states the same split).
async function mountPanel(id) {
  if (id === "agents") {
    const mount = document.getElementById("agents-player");
    if (!mount) return;
    const path = "/traces/demo-notice.jsonl";
    try {
      const { parseTrace, renderTracePlayer } = await import("/system/trace-player.mjs");
      const res = await fetch(path);
      if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
      renderTracePlayer(mount, parseTrace(await res.text()));
      // Inspect mounts on the exhibit's own components. Applied here rather than inside
      // trace-player.mjs because that module also drives /roundtrip and /trace.html. The ids are
      // COPIED from system/inspect-data.json — an id absent from that file aborts the whole inspect
      // activation at runtime, for every mount on the page. tooling/drift-check.mjs's inspect-mounts
      // pass reads TRACKED HTML only, so it cannot see these (the site.js:40-42 rule).
      for (const c of mount.querySelectorAll(".trace-step")) c.setAttribute("data-inspect", "cards");
      for (const b of mount.querySelectorAll(".trace-controls .btn")) b.setAttribute("data-inspect", "buttons");
      syncInspect();
    } catch (err) {
      errorCard(mount, `Could not load ${path} — ${err.message}`);
    }
    return;
  }

  if (id === "round-trip") {
    // derivation-roundtrip.mjs self-boots at import (`if (typeof document !== "undefined") init()`)
    // and is inert without #roundtrip-diff, which this page carries from load. A dynamic import is
    // therefore the whole of the laziness needed: the module evaluates once, on first activation.
    try {
      await import("/system/derivation-roundtrip.mjs");
    } catch (err) {
      errorCard(document.getElementById("roundtrip-diff"), `Could not load the fidelity diff — ${err.message}`);
    }
    return;
  }

  if (id === "shape") {
    const mount = document.getElementById("system-graph");
    if (!mount) return;
    const path = "/system/system-graph.json";
    try {
      const { prepareGraph, renderSystemGraph } = await import("/system/system-graph.mjs");
      const res = await fetch(path);
      if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
      const json = await res.json();
      mount.textContent = "";
      renderSystemGraph(mount, prepareGraph(json));
    } catch (err) {
      errorCard(mount, `Could not load ${path} — ${err.message}`);
    }
  }
}

// refreshInspect, NEVER initInspect: this page imports inspect.mjs statically, and initInspect()
// would tear down the live handle system/palette.mjs:118 holds.
function syncInspect() {
  if (document.documentElement.dataset.inspectMode === "on") refreshInspect();
}

// One fat-marker block per place. PRE-COMPILE, and the copy on the page says so: at #206 these are
// the drafted breadboard's places, not real components. Blocks becoming components is #207 and this
// file must not write that sentence early.
//
// No affordance is invented and none is silently hidden: the count is the whole place's, and the
// chips clip in CSS (studio.css's .stu-place-affs) rather than being sliced here — a slice would
// make the rendered list disagree with the number printed above it.
function placeBlock(entry) {
  const chips = el("ul", { class: "stu-place-affs" });
  for (const aff of entry.affordances) {
    chips.appendChild(el("li", { class: "stu-place-aff", text: aff.label }));
  }
  const n = entry.affordances.length;
  return el("article", { class: "stu-place" },
    el("h4", { class: "stu-place-name", text: entry.label }),
    el("p", { class: "stu-place-count", text: n === 1 ? "1 affordance" : `${n} affordances` }),
    n ? chips : null);
}

// The "This build" panel — the at-rest panel, and the only one this file renders itself.
function renderSummary(mount, summary, arranged) {
  if (!mount) return;
  mount.textContent = "";

  const dl = el("dl", { class: "stu-facts" });
  const fact = (term, value) => {
    dl.appendChild(el("dt", { class: "stu-fact-term", text: term }));
    dl.appendChild(el("dd", { class: "stu-fact-value", text: value }));
  };
  fact("Pattern", summary.patternLabel || "None yet");
  fact("Places", String(summary.places));
  fact("Affordances", String(summary.affordances));
  fact("Connections", String(summary.connections));
  mount.appendChild(dl);

  // The rule VERBATIM. See buildSummary's note: this sentence is the rule, not a report about it.
  mount.appendChild(el("p", { class: "stu-reason", text: summary.reason }));

  // Only ever rendered when something really was dropped, so it can never read as a hedge on a
  // board that fits. arrangeBoard breaks at MAX_COLS; the count above is the whole board's.
  if (summary.places > arranged.length) {
    mount.appendChild(el("p", { class: "stu-note", text:
      `The canvas holds the first ${arranged.length} of ${summary.places} places — row 1 is ${MAX_COLS} columns wide.` }));
  }

  mount.appendChild(el("p", { class: "stu-note" },
    "These came from the recommended answers to the ten method questions. ",
    el("a", { href: "/build#act-hooked", text: "Answer them yourself" }),
    " and the board is drafted from what you said."));
}

// The panel switcher: click · APG arrow / Home / End keys · hashchange. Ported from the tab
// controller it replaces (the pre-#206 factory.html:404-455) rather than reinvented, with one
// addition — activation now also MOUNTS, so a deep link lands on a rendered panel rather than an
// empty one. A lazy mount wired only to the click handler is exactly the bug
// tooling/studio-journey.mjs's /factory pass exists to catch.
function wireInspector(shell) {
  const tablist = shell.querySelector("[data-studio-tablist]");
  if (!tablist) return null;
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
  const mounted = new Set();

  const activate = (i, moveFocus) => {
    tabs.forEach((tab, j) => {
      const on = j === i;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      if (panels[j]) panels[j].hidden = !on;
    });
    if (moveFocus) tabs[i]?.focus();
    const id = tabs[i]?.getAttribute("aria-controls");
    if (id && !mounted.has(id)) {
      mounted.add(id);
      // Fire-and-forget: mountPanel catches its own failures into an error card, so there is
      // nothing here to await and nothing that can reject.
      mountPanel(id);
    }
  };

  // JS is on → collapse to the at-rest panel. Without JS all four panels stay painted, which is why
  // none of them carries a `hidden` attribute in the markup.
  activate(0, false);

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => activate(i, false));
    tab.addEventListener("keydown", (e) => {
      const n = tabs.length;
      let next = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % n;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + n) % n;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = n - 1;
      if (next >= 0) { e.preventDefault(); activate(next, true); }
    });
  });

  const fromHash = () => {
    if (!location.hash) return;
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = location.hash.slice(1); }
    const idx = panels.findIndex((p) => p && p.id === id);
    if (idx < 0) return;
    activate(idx, false);
    shell.scrollIntoView();
  };
  fromHash();
  addEventListener("hashchange", fromHash);

  return { activate, tabs, mounted };
}

export function mountStudio(root = document) {
  // OUTSIDE THE try/finally, DELIBERATELY — and a future reader's instinct will be to tidy it
  // inward, which is why this paragraph is here. Two repo rules meet at this line. #173's
  // arrangement (docs/epics/annotated-source-glossary.architecture.md) puts initGlossary inside the
  // module that owns the VR ready handle, so an unknown data-term key ABORTS BEFORE the handle is
  // set: the gate then hangs and the run fails loud, instead of a typo shipping green. This
  // ticket's own AC says the handle is set in a `finally` on every path. Inside the try, the second
  // rule destroys the first — the finally would resolve the handle for a page whose glossary never
  // mounted. Before it, both hold exactly: a throw here means the finally never runs.
  //
  // The `finally` exists for BENIGN variation (a missing canvas, reduced motion, a failed fetch)
  // and a bad glossary key is not a variation, it is a broken build.
  //
  // Not at module scope either: that would touch the DOM at import and destroy the Node-import
  // safety build-checks depends on.
  initGlossary(root === document ? document : root);

  const shell = root.querySelector("[data-studio]");
  try {
    if (!shell) return null;

    const canvas = initStudioCanvas(root);
    if (!canvas) return null;

    // The store is in-memory and `state.answers` initialises to null (build-questions.mjs:67) —
    // only setAnswers/restoreBuild fill it, and neither runs on this page. The `??` is therefore
    // not defensive padding: patternFor TOLERATES null (pattern-rules.mjs:167 guards with
    // `answers &&`) and silently falls through to dashboard with named:false, which renders a
    // fallback sentence where the reader should see an answered one.
    const stored = readBuild();
    const answers = stored.answers ?? DEFAULT_ANSWERS;
    const board = isBoard(stored.board) ? stored.board : draftBoard(answers);

    const arranged = arrangeBoard(board);
    for (const entry of arranged) {
      canvas.place(placeBlock(entry), { col: entry.col, row: entry.row, name: entry.label });
    }

    // AFTER the placement loop, so createHistory's initial snapshot is the real arrangement rather
    // than an empty one, and so every wrapper's aria-describedby has its instructions element to
    // point at (studio.html:138-140's ordering rule, and #230's reason for it).
    const bus = createBus();
    const verbs = mountCanvasVerbs(canvas, { bus });

    const summary = buildSummary(board, answers);
    renderSummary(document.getElementById("this-build-summary"), summary, arranged);

    const inspector = wireInspector(shell);

    // A reader who turned inspect on elsewhere arrives with it persisted; the blocks above were
    // built after inspect.mjs restored, so they need one refresh to be wired.
    syncInspect();

    live = { shell, canvas, bus, verbs, inspector, board, summary, arranged };
    return live;
  } finally {
    // Every path, including both early returns and any throw below the glossary call.
    shell?.setAttribute("data-studio", "ready");
  }
}

// Self-boot behind a DOM guard so a Node import stays clean; inert on every page without the shell.
if (typeof document !== "undefined") mountStudio(document);
