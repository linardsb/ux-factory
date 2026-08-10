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
//   · the compile beat    system/studio-compile.mjs  (#207, group 15)
//   · the board           system/replay-driver.mjs   (#209) — see below
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
// THE BOARD IS NO LONGER DRAFTED HERE, AND THAT IS #209. This file used to place
// draftBoard(DEFAULT_ANSWERS) in one synchronous loop, so /factory showed a board that was simply
// THERE on arrival. It now mounts the canvas EMPTY and hands it to system/replay-driver.mjs, which
// assembles it by playing a committed real agent run op by op over the bus's agent.* half. At rest —
// which is what the pixel gate captures — the canvas is that run's finished board, behind
// [data-replay="settled"]. `board`, `summary` and `arranged` are therefore MUTABLE here and are
// updated at settle; tooling/studio-journey.mjs reads all three off the running page.
//
// THIS FILE READS THE BUILD STORE AND WRITES IT IN EXACTLY ONE PLACE — restoreShared, on a ?b=
// arrival (#210). No publishBuild, no setAnswers, and nothing at all on an ordinary load. The rule
// the exception respects is the one it was written for: /build's state must not depend on having
// visited /factory. A shared link is the opposite case — the link IS the state, the visitor asked
// for it by following it, and every consumer on this page has to move together or they describe
// different builds. The store is in-memory (build-questions.mjs:65-73) and its board initialises
// absent, so a load with no link still reaches only the replay path — deterministic for the pixel
// gate by construction, which is what that gate depends on and what the restore must not disturb.
//
// Since #214 the PAGE writes the store on an ordinary visit — but not this file: the method band
// (system/studio-method.mjs) is the page's answer-writer, through setAnswers/publishBuild's own
// paths, and this file's store-write count stays exactly ONE. The determinism claim above survives
// because the cards only write on a visitor interaction, which the pixel gate never performs.
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
import { mountCompile } from "./studio-compile.mjs";
import { mountReplay } from "./replay-driver.mjs";
import { createBus } from "./action-bus.mjs";
import { isBoard } from "./breadboard.mjs";
import { decodeBuild, SHARE_PARAM } from "./build-share.mjs";
import { DEFAULT_ANSWERS, readBuild, restoreBuild } from "./build-questions.mjs";
import { affordanceCount, PATTERNS, patternFor } from "./pattern-rules.mjs";
import { initGlossary } from "./glossary.mjs";
import { refreshInspect } from "./inspect.mjs";
import { mountStudioKeep } from "./studio-keep.mjs";
import { mountStudioMethod } from "./studio-method.mjs";

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

// One fat-marker block per place: the drafted breadboard's places, not real components. This is the
// SHAPE FIDELITY, and since #207 it is a stage rather than the end of the story — the compile beat
// (system/studio-compile.mjs) swaps each of these blocks for the real component the committed
// pipeline names for its slot, in the same wrapper, and "Back to blocks" puts them back. This
// function keeps owning the block itself: what a place looks like before it compiles is this file's
// sentence, and the beat only ever replaces the node it returns.
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

// What the panel and the notice say once the method cards redraft the board (#214). ONE constant
// for both surfaces — restoreShared's two-places rule: canvas.say is transient, the notice stays
// put, and the panel's note re-renders; three places saying it in different words would drift.
const DRAFTED = "This board is drafted from your ten answers by the committed rules — the recorded run's board was set aside. Reload to watch the run again.";

// The "This build" panel — the at-rest panel, and the only one this file renders itself.
// `provenance` decides the closing note: the counted numbers above it are true of any board, but
// whose board they count is a claim, and it has three honest values (see boardProvenance).
function renderSummary(mount, summary, arranged, provenance) {
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

  // TWO SOURCES, AND THEY ARE NOT THE SAME ONE (#209) — until the visitor makes them one (#214).
  // On "run" the places were built by the recorded run and the PATTERN is named from the ten method
  // answers by rule 1, which is why the note offers the cards; on "restored" the board is the
  // sender's, and saying it was the run's would credit the run with a board it never built; on
  // "drafted" both sources ARE the visitor's answers, and the note is the DRAFTED sentence the
  // notice carries — the same constant, so the two surfaces cannot disagree.
  if (provenance === "drafted") {
    mount.appendChild(el("p", { class: "stu-note", text: DRAFTED }));
  } else if (provenance === "restored") {
    mount.appendChild(el("p", { class: "stu-note" },
      "This board came in on the link you followed — the sender's, not the recorded run's. The "
      + "pattern above is named from its restored answers. ",
      el("a", { href: "#method", text: "Answer the method cards below" }),
      " and the board is redrafted from what you say instead."));
  } else {
    mount.appendChild(el("p", { class: "stu-note" },
      "The board is the recorded run's. The pattern above is named from the ten method questions' "
      + "recommended answers. ",
      el("a", { href: "#method", text: "Answer them in the method cards below" }),
      " and the board is redrafted from what you say instead."));
  }
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
  //
  // Runs unconditionally, so a cold load on a deep-linked hash activates twice — this one, then
  // fromHash's. Harmless and left that way on purpose: both calls are synchronous, the `mounted`
  // guard makes the second mount a no-op, and this panel's own mountPanel("this-build") matches no
  // branch and returns immediately. Making it conditional would mean reading the hash before the
  // at-rest collapse, i.e. two places deciding which panel is first.
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

// The SYNCHRONOUS core: everything this page does once the board it starts from is known. Split out
// of mountStudio by #210 so that the ?b= restore — which must await a decode — can run in front of
// it without putting an await on the path a plain /factory load takes. Everything below this line is
// exactly what it was; what changed is who calls it and with what.
//
// `restored` is null on every ordinary load and is decodeBuild's validated state on a shared link.
function mountStudioCore(root, shell, restored) {
  const canvas = initStudioCanvas(root);
  if (!canvas) return null;

  // The store is in-memory and `state.answers` initialises to null (build-questions.mjs:67) —
  // only setAnswers/restoreBuild fill it, and neither runs on this page unless a link brought a
  // build (see restoreShared). The `??` is therefore not defensive padding: patternFor TOLERATES
  // null (pattern-rules.mjs:167 guards with `answers &&`) and silently falls through to dashboard
  // with named:false, which renders a fallback sentence where the reader should see an answered one.
  const stored = readBuild();
  // `let` since #214: adoptBoard re-points this at the visitor's answer set before it publishes,
  // so every later read — buildSummary here, the compile beat's getAnswers — sees current answers.
  let answers = stored.answers ?? DEFAULT_ANSWERS;
  // THE VISITOR'S OWN BOARD IS NEVER OVERWRITTEN BY A REPLAY, and since #210 that branch is LIVE
  // rather than recorded: restoreShared publishes a decoded board into the store before this runs,
  // so `own` is the sender's board on a ?b= arrival and null on every other load. What follows is
  // the requirement this file wrote down before anything reached it — place what the visitor
  // brought, and let the driver mount DECLINED rather than assembling over it.
  const own = isBoard(stored.board) ? stored.board : null;
  const declined = !!own;
  let board = own || { places: [], connections: [] };
  // WHOSE BOARD THE SUMMARY DESCRIBES (#214): "run" on an ordinary load, "restored" when a ?b=
  // link brought the sender's board, "drafted" once the method cards redraft it. The panel's
  // closing note renders from this, so it can never credit the run with a board it did not build.
  let boardProvenance = declined ? "restored" : "run";

  // THE SENDER'S ARRANGEMENT, WHEN THE LINK CARRIED ONE. decodeBuild returns [{ id, col, row }] in
  // board order with every id taken from the validated place at that index and never from the
  // payload (build-share.mjs:452), and every pair already inside the grid — so this is a lookup, not
  // a second validation. clampSlot all the same, because "on the grid" has ONE definition
  // (studio-canvas.mjs:50) and the day the caps move it is the only line that must be right.
  // Without a `g` the link still restores the board, laid out along row 1 like any other.
  let arranged = arrangeBoard(board);
  const sent = restored && Array.isArray(restored.arrangement) ? restored.arrangement : null;
  if (sent && sent.length === arranged.length) {
    arranged = arranged.map((entry, i) => ({ ...entry, ...clampSlot({ col: sent[i].col, row: sent[i].row }) }));
  }
  for (const entry of arranged) {
    canvas.place(placeBlock(entry), { col: entry.col, row: entry.row, name: entry.label });
  }

  // AFTER the placement loop, which since #209 usually places NOTHING: the canvas starts empty and
  // system/replay-driver.mjs builds it by playing a real recorded run. So createHistory's initial
  // snapshot is `{}` and every node the replay places is a POST-MOUNT placement — precisely the
  // case #230's `adopt` closes, from both of its call sites (studio-verbs.mjs:181-202, :382, :467).
  // It was the edge case; it is now the normal one, and nothing new is needed for it. The move
  // handles are fine for the same kind of reason: #231's armMoveHandles is FORWARD-ACTING, so
  // place() arms every handle it creates after this line (studio-canvas.mjs:278-287, :313-315).
  const bus = createBus();
  const verbs = mountCanvasVerbs(canvas, { bus });

  // AFTER the verbs, so createHistory's initial snapshot is still the FAT-MARKER arrangement — the
  // compile beat swaps a wrapper's contents and never its slot, so the history it inherits stays
  // true across the beat and an undo after a compile restores the arrangement, not the fidelity.
  // The beat shares this page's ONE bus rather than making a second: the primitives it renders are
  // non-interactive today, but a component that does emit ui.intent should reach the same
  // consumers everything else on this canvas reaches.
  // `getBoard` rather than `board`, which is #209's two-line seam in that file: the beat is
  // mounted HERE, at load, so its `finally` handle resolves where every gate already waits for it —
  // and it reads the board at call time, so pressing Compile after the replay settles compiles the
  // board the run built rather than the empty one this line was reached with.
  // `getAnswers` beside `getBoard`, the same two-line seam for the same reason (#214): the method
  // cards move `answers` after this mount, and the beat must compile the CURRENT set at call time.
  const compile = mountCompile(canvas, {
    getBoard: () => board,
    answers,
    getAnswers: () => answers,
    bus,
    onState: (next) => {
      // #251: the swap ("rendered") and its revert ("blocks") replace every wrapper's content —
      // a carry started over the old content is void, and its cached pick-up geometry predates
      // the compiled state's grown tracks. The other terminal states (empty, out-of-library,
      // refused, unavailable) leave the blocks untouched and cancel nothing. cancel() no-ops
      // without a live gesture, which is every ordinary compile.
      if (next === "rendered" || next === "blocks") verbs.cancel();
      syncInspect();
    },
  });

  let summary = buildSummary(board, answers);
  const summaryMount = document.getElementById("this-build-summary");
  // NOT rendered for an empty board. Every number in this panel is counted from the board, so on
  // the replay path there is nothing to count yet — and a panel reading "Places 0" for the first
  // five seconds would be a set of true numbers about nothing. factory.html's own markup says what
  // is coming instead, and onSettle below replaces it with the counted panel.
  if (arranged.length) renderSummary(summaryMount, summary, arranged, boardProvenance);

  const inspector = wireInspector(shell);

  // LAST, so it takes a canvas whose verbs and beat are already mounted. Everything it needs is a
  // seam something else already exposed: place() from #204, the single ui.move consumer it must
  // not become a second of from #205, and the board getter above.
  //
  // ALL THREE OF board / summary / arranged ARE UPDATED AT SETTLE, and that is not bookkeeping:
  // tooling/studio-journey.mjs:1218-1226 reads all three off the running page through getStudio()
  // and asserts slotCount === arranged === places. Leaving them at their mount-time values would
  // turn that assertion red for a page that is entirely correct.
  // THE BOARD IS PUBLISHED WHEREVER THE DRIVER HAS STOPPED FOR GOOD, and "for good" is the whole
  // point of the pair below rather than a third call on the driver's own Pause. Compile does a
  // positional in-place swap of every wrapper's contents; the driver's reflection replaces that
  // same child on every `place-changed` (replay-driver.mjs:499, seven of them in the committed
  // artifact). So a board published at a pause the driver can resume from would hand Compile a
  // stage the driver is going to keep authoring. SETTLE and TAKE-OVER are the two states nothing
  // resumes from — settle is terminal, and take-over kills the transport (PR #240 review,
  // finding 1).
  //
  // `finalBoard == null` is the driver's UNAVAILABLE path (a 404 artifact): there is no board to
  // publish and this page's own empty one is already correct, but the beat must still come back —
  // a degraded replay may not leave the page's primary control dead.
  // #210's rail. Declared here so publishBoard can reach it; mounted below, after the driver, for
  // the same reason the driver is mounted last — everything it needs is a seam something else has
  // already exposed, and it must take a canvas whose verbs and beat exist.
  let keep = null;
  // #214's method band, on the same terms: declared here so publishBoard can reach its setEnabled,
  // mounted below after the keep rail, so it takes a page whose canvas, beat and rail exist.
  let method = null;

  // WHERE EACH BLOCK SITS, read off the RUNNING canvas in DOM order, which is board order (the
  // studio's standing correspondence: studio-compile.mjs:377's positional swap and
  // replay-driver.mjs's rename-in-place both rest on it). This is the one thing /build's rail
  // structurally cannot produce, and it is what #208's `g` field carries. Read live rather than
  // tracked, for the reason the beat reads the board live: the verbs, the driver and an undo all
  // write these two attributes, and a mirror here would be a second copy of the arrangement that
  // could disagree with the canvas the reader is looking at.
  const arrangementNow = () => [...canvas.stage.querySelectorAll(".stx-slot")].map((w) => ({
    col: Number(w.getAttribute("data-col")),
    row: Number(w.getAttribute("data-row")),
  }));

  const publishBoard = (finalBoard, provenance) => {
    // Only a caller that CLAIMS a provenance moves it (#214's adoptBoard passes "drafted");
    // settle and take-over pass nothing and inherit whatever the board already was.
    if (provenance) boardProvenance = provenance;
    if (isBoard(finalBoard)) {
      board = finalBoard;
      arranged = arrangeBoard(board);
      summary = buildSummary(board, answers);
      // THE SAME GUARD THE MOUNT ABOVE CARRIES, and for the same sentence: a panel reading
      // "Places 0" is a set of true numbers about nothing. It was unreachable while settle() was
      // the only publisher — a settled run always has places — and a take-over is reachable from
      // the moment the driver is `ready`, which is several beats before the first place.add.
      if (arranged.length) renderSummary(summaryMount, summary, arranged, boardProvenance);
      if (live) { live.board = board; live.arranged = arranged; live.summary = summary; }
    }
    compile.setEnabled(true);
    // SYNCHRONOUS BESIDE THE COMPILE ENABLE — never behind a rAF, a timeout or an await. settle()
    // writes [data-replay="settled"] and then calls onSettle in the SAME task, so the pixel gate
    // can only ever capture settled-and-enabled cards; defer this one tick and the gate races it.
    method?.setEnabled(true);
    // THE RAIL REFRESHES WHEREVER THE BOARD IS PUBLISHED, and for the reason this pair exists at
    // all: settle and take-over are the two states nothing resumes from, so they are the two
    // moments the artifacts describe a board that has stopped changing. Refreshing it at a pause
    // the driver can resume from would hand a reader a spec and a link for a half-built board.
    keep?.update();
    syncInspect();
  };
  // BEFORE the mount, not inside it: mountReplay runs two awaited fetches, and the window between
  // this line and the driver's first beat is exactly the one a reader could press Compile in and
  // be told "No pattern named, so nothing compiled" about a canvas that is visibly filling up.
  //
  // NOT ON THE DECLINED PATH, and this is #240's first constraint on that branch rather than a
  // tidying. The disable exists for a window that only opens if the driver is going to PLAY; a
  // declined mount never reaches a first beat, and it never settles or hands over either — so the
  // three paths that re-enable the beat are all unreachable, and disabling here would leave the
  // page's PRIMARY CONTROL DEAD on the one route whose whole point is that the visitor brought a
  // board worth compiling. Not re-enabled after the fact: never disabled at all is one state fewer.
  if (!declined) compile.setEnabled(false);
  let replay = null;
  try {
    replay = mountReplay(canvas, {
      shell,
      renderPlace: placeBlock,
      bus,
      onSettle: publishBoard,
      // The driver already owns the board it built and already exposes it; there is no third
      // option to add here. It can only fire after start()'s awaits, so `replay` is bound.
      onTakeOver: () => publishBoard(replay ? replay.board : null),
      declined,
    });
  } catch (err) {
    // The driver reports a boundary failure by throwing (replay-driver.mjs:864-869) and leaves
    // [data-replay="unavailable"] behind, which the gates read. The beat must not go down with it:
    // re-enable, then re-throw, so the failure stays as loud as it was.
    compile.setEnabled(true);
    throw err;
  }

  // #210's keep rail, LAST — after the driver, so the board it reads is the one the driver is
  // about to fill, and so its own `finally` handle resolves where the gates already wait. Mounted
  // from here rather than self-booting on its own script tag: it takes the board, the arrangement,
  // the beat and the canvas, and all four are this file's, so a tag would have to reach them
  // through getStudio() and would race the ?b= branch below.
  keep = mountStudioKeep(root.querySelector("[data-studio-keep]"), {
    getBoard: () => board,
    getArrangement: arrangementNow,
    compile,
    canvas,
  });

  // #214's adoption point: the method band redrafts the WHOLE board from the visitor's answers and
  // this closure is the one place the canvas is made to match. It does NOT write the store — the
  // method module owns the page's store writes, so this file's restoreShared exception stays the
  // only one here — and it does not emit ui.move or call applySlot: authorship (place/remove) is
  // not movement, the same line replay-driver.mjs walks, so #205's one-mover invariant survives.
  const adoptBoard = (nextBoard, nextAnswers) => {
    answers = nextAnswers;
    // FIRST, before the stage is touched: the driver's post-settle seek would otherwise rebuild
    // the run's board over the drafted one — seek stays live at settle (replay-driver.mjs:612) and
    // the band lives outside canvas.scroll, so onTouch never sees a card. relinquish() is the
    // driver adopting its own declined-mount idiom: tookOver IS "this driver will not write to the
    // stage again", and it kills the transport for the reason that path gives (#214).
    replay?.relinquish();
    // A compiled stage goes back to blocks BEFORE the clear, so the beat's state machine and its
    // stash agree with the stage they describe and the drafted board arrives compilable. There is
    // nothing to revert mid-"compiling"; a redraft in that window leaves the in-flight swap to the
    // beat's count tripwire, which compares COUNTS only (studio-compile.mjs:409-411) — a mismatch
    // refuses loudly, but a draft with the SAME place count swaps the old board's screens onto the
    // new wrappers unrefused. Rare (a sub-2 s window), recoverable via "Back to blocks"; closing it
    // needs an identity/generation stamp in applySwap (#253).
    if (compile.state !== "blocks" && compile.state !== "compiling") compile.revert();
    // wrapper.remove() per slot, never a wipe of the stage node: the sizer and the stage are what
    // the canvas owns; the slots are what this board put there (studio-canvas.mjs:114-117).
    for (const wrapper of canvas.stage.querySelectorAll(".stx-slot")) wrapper.remove();
    for (const entry of arrangeBoard(nextBoard)) {
      canvas.place(placeBlock(entry), { col: entry.col, row: entry.row, name: entry.label });
    }
    publishBoard(nextBoard, "drafted");
    // Where the provenance sentence STAYS PUT — canvas.say is transient by design, and the panel's
    // note re-renders; all three surfaces print the one DRAFTED constant (restoreShared's rule).
    const notice = root.querySelector?.("[data-studio-notice]");
    if (notice) {
      notice.textContent = DRAFTED;
      notice.hidden = false;
    }
  };

  // #214's method band, LAST for the keep rail's reason: everything it takes is a seam something
  // above already exposed, and it must take a page whose canvas, beat and rail exist. Its cards
  // mirror the compile beat's gating asymmetry — disabled only when the driver will PLAY,
  // re-enabled inside publishBoard on every stopped-for-good path, never disabled on declined.
  method = mountStudioMethod(root, { canvas, adoptBoard, declined });

  // A reader who turned inspect on elsewhere arrives with it persisted; the blocks above were
  // built after inspect.mjs restored, so they need one refresh to be wired.
  syncInspect();

  live = { shell, canvas, bus, verbs, compile, replay, inspector, keep, method, board, summary, arranged };
  return live;
}

// The ?b= restore (#210), and the whole of the async half. It decodes, publishes ONCE through
// build-questions.mjs's own restoreBuild — one event, one atomic restore, exactly the contract
// build-keep.mjs:373 relies on — and then hands the core a board that is already in the store.
//
// PUBLISHING IS A DELIBERATE EXCEPTION to this file's "reads the store and never writes it" rule,
// and it is the only one. That rule exists so /build's state cannot depend on having visited
// /factory; a shared link is the opposite case — the link IS the state, the visitor asked for it by
// following it, and every consumer on this page has to move together or they describe different
// builds. It also buys the pack for the cost of nothing: system/build-import.mjs already listens for
// a `restore`-sourced BUILD_CHANGE and adopts the design onto the stage (:534-536), so Act 0's label,
// the canvas's skin and the keep rail's spec all agree without this file knowing how a pack is
// applied. IMPORT, NEVER FORK, working exactly as this file's header promises.
//
// A REFUSAL SCRUBS THE PARAM and says why — build-keep.mjs:356-377's pattern, refusal sentence
// included — so a reader who reloads after a bad link does not meet the same failure twice and the
// studio they are looking at is genuinely the clean one. No settledUrl wait here, and that is a
// stated absence rather than an omission: all three of this page's virtual routes fire from a
// visitor action (the take-over from a canvas touch, the other two from the keep rail's buttons), so
// at boot nothing has flipped location and there is no window to wait out.
const RESTORED = "This board came in on the link you followed. Nothing was stored anywhere; your browser rebuilt it from the URL.";
const REFUSED = "That shared link could not be read, so this is the studio as it comes.";

async function restoreShared(param, root, shell) {
  let restored = null;
  let refusal = null;
  try {
    const { state, reason } = await decodeBuild(param);
    if (state) restored = state;
    else refusal = reason;
  } catch (err) {
    refusal = err.message;
  }

  if (restored) {
    restoreBuild(restored); // ONE publish; every consumer on this page moves together
  } else {
    try {
      const url = new URL(location.href);
      url.searchParams.delete(SHARE_PARAM);
      history.replaceState(null, "", url.toString());
    } catch { /* file:// has no entry to replace, and no address bar to mislead */ }
  }

  const handle = mountStudioCore(root, shell, restored);
  const sentence = restored ? RESTORED : `${REFUSED} ${refusal}`;
  // TWO PLACES, and they are not redundant. canvas.say is the studio's ONE live region, so a screen
  // reader hears it — but that region is transient by design, and on the refused path the replay
  // then plays and narrates over it within a second. The notice node is where the sentence stays
  // put. Never a throw and never console.error — studio-journey's no-page-errors contract.
  if (handle) handle.canvas.say(sentence);
  const notice = root.querySelector?.("[data-studio-notice]");
  if (notice) {
    notice.textContent = sentence;
    notice.hidden = false;
  }
  return handle;
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
  initGlossary(root);

  const shell = root.querySelector("[data-studio]");

  // THE NO-LINK PATH STAYS SYNCHRONOUS, AND THAT IS A HARD CONSTRAINT RATHER THAN A PREFERENCE.
  // `data-studio="ready"` resolves at mount today and `[data-replay="settled"]` is the late handle;
  // the pixel gate and tooling/studio-journey.mjs both wait on them in that order. An await on the
  // common path would shift every gate's timing on a page where nothing actually changed — and the
  // pixel gate RE-BASELINES that class of drift rather than catching it. So the parameter is read
  // synchronously, before anything can await, and only its presence opens the async branch.
  let shared = null;
  try { shared = new URLSearchParams(location.search).get(SHARE_PARAM); } catch { shared = null; }

  if (!shared) {
    try {
      if (!shell) return null;
      return mountStudioCore(root, shell, null);
    } finally {
      settleHandles(root, shell);
    }
  }

  if (!shell) { settleHandles(root, shell); return null; }
  // The handles are withheld until the restore has settled — a gate that read them earlier would
  // capture and assert a page mid-restore (build-keep.mjs:382-384 makes the same call for the same
  // reason). `.finally` rather than a try/finally: the work is a promise now, and the handles must
  // resolve on the rejected path too.
  return restoreShared(shared, root, shell).finally(() => settleHandles(root, shell));
}

// Both readiness handles, in one place because both are now set from two call sites.
function settleHandles(root, shell) {
  // Every path, including both early returns and any throw below the glossary call.
  shell?.setAttribute("data-studio", "ready");
  // The rail's handle is set by its OWN `finally` on every path it reaches — but the early returns
  // above (no shell, no canvas) never reach it at all, and a gate waiting on it would then deadlock
  // to timeout on a page whose real failure is something else entirely. Same call the canvas and the
  // beat make: fail on the missing thing, loudly, rather than hang.
  const keepRoot = root.querySelector?.("[data-studio-keep]");
  // Tested on the VALUE, not on the attribute: [data-studio-keep] is both the mount hook and the
  // state, exactly as [data-build-keep] and [data-replay] are, so the attribute is always there
  // and only its value says whether anything mounted.
  if (keepRoot && !keepRoot.getAttribute("data-studio-keep")) keepRoot.setAttribute("data-studio-keep", "unavailable");
}

// Self-boot behind a DOM guard so a Node import stays clean; inert on every page without the shell.
if (typeof document !== "undefined") mountStudio(document);
