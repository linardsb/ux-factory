// tooling/build-checks.mjs — the committed unit gate for /build's pattern chain (epic #134,
// ticket #137; .claude/plans/build-pattern-render-keep-rail.md).
//
// Twenty-three groups, one ✓ line each, exit 1 on any failure — the tooling/validate-trace.mjs shape.
// Committed rather than left in a shell-history line, because these ARE the ticket's named gate
// and a gate a reviewer cannot re-run is not a gate.
//
// It imports the SHIPPED modules directly. They are Node-import-safe by design (DOM references
// inside function bodies, self-boot behind a `typeof document` guard), so if an import here starts
// pulling `document`, the module has a bug and the module is what gets fixed.
//
// TWO NAMED EXCEPTIONS import portal/ code, which is build-time rather than shipped. Both are here
// because a second gate file would be a gate nobody runs, and both are SDK-free for the same
// reason: CI has no portal/node_modules, so an SDK import anywhere in either module's graph fails
// this job. Group 8's invariant is proven by that ABSENCE, which is why it cannot be checked by
// adding something (see group 8's own comment before "fixing" it by installing portal deps in CI).
//   · group 8 (#140) imports portal/lib/builder.mjs — it answers the SAME ten questions.
//   · group 9 (#157) imports portal/lib/origin.mjs — and see its own comment for what that does
//     NOT cover: the predicate is gated here, the WIRING is only ever proven against a running
//     portal, because server.mjs reaches the SDK and so can never be imported in this job.
//
//   1 pattern ids     the three rules, including the hub override and the empty board
//   2 slots           counted from the board, never invented; every value a string
//   3 composition     validated against the REAL handoff/verdant/vocabulary.json — this is the
//                     check that catches a vocabulary regeneration breaking the builder
//   4 codec           round-trip through BOTH the deflate and the uncompressed branch
//   5 tamper          32 hostile payloads, each of which must reject the WHOLE payload
//   6 artifacts       every card SVG + the downloaded pattern-spec.md: well-formed, escaped, no
//                     hostile token or label reaching markup, and no in-library pattern ever
//                     claiming "not in the library" (the bug #139 fixed)
//   7 vetting         the one-application-point invariant, across ALL the /build modules and
//                     the studio canvas, which joins it writing zero inline styles
//   8 operator path   the three committed rules that draft a composition question from the same
//                     ten answers, their guards, and the SSE projection's whitelist (#140)
//   9 origin          the portal's CSRF predicate: both loopback origins accepted, an absent
//                     Origin allowed, every near-miss of an allowed origin refused (#157)
//  10 analytics       /build's two virtual-route events: the module imports node-safe with the
//                     token FILLED (the launch break this job would otherwise take), both paths are
//                     bare static literals carrying none of the visitor's ?b= build, each fires
//                     once, and the URL comes back verbatim (#149)
//  11 replay          the studio's projection: gen-replay's PURE projectTrace driven over synthetic
//                     in-memory rows — the happy path, the corrupted-label MUTATION that decides
//                     whether the reproduce check is real, every refusal, real pacing, the honest
//                     label, and the curate-trace KEEP_WHOLE coupling proven by running curateTrace
//                     over a >700-char command rather than by grepping for the constant (#203)
//  12 canvas         the studio's canvas substrate: studio.css's scale table and slot rules mirror
//                     studio-canvas.mjs's exported caps EXHAUSTIVELY and in both directions (CSS
//                     cannot import, so the mirror is by hand and this is what pins it), plus
//                     clampSlot and fitLevel driven over their real edges (#204)
//  13 verbs          the canvas's manipulation layer, pure half: the history stack incl. #230's
//                     adopt, stepSlot and hitSlot (#205)
//  14 studio         the /factory orchestrator's pure layer: arrangeBoard over the REAL drafted
//                     board and nine junk ones, buildSummary's counts asserted against
//                     affordanceCount and patternFor rather than re-derived (#206)
//  15 compile        the compile beat's pure pipeline: compileSteps over the REAL drafted board and
//                     all five patterns' fixtures against the generated vocabulary, determinism by
//                     deep-comparing two whole runs, totality over junk (#207)
//  16 replay driver  the studio's replay driver, pure half: the committed artifact + trace joined,
//                     the reproduce claim restated at view time with the corrupted-label MUTATION
//                     that decides whether that compare is real, the schedule's gap RATIOS, and the
//                     ADD-ONLY op histogram pinned over the unexercised branches (#209)
//  17 export         the single-file export's pure layer: the document driven over the REAL
//                     committed stylesheets, the zero-request claim asserted on the OUTPUT, both
//                     honesty branches by IDENTITY, byte-identical across two runs (#210)
//  18 docs chain     the docs chain's two pure functions: validateExamples over every committed
//                     spec's example, plus the four-branch MUTATION that decides whether it can
//                     fail at all, and prepareHandoff's view-time join over the real pack,
//                     vocabulary and system-graph — the consumer set anchored on the PACK, since a
//                     graph-derived one moves in lockstep with the thing under test (#211)
//  19 flow           places become screens, connections become navigation: screensFor over the
//                     REAL committed replay board (reachability, the counted nav, the pinned type
//                     mix), a flow fixture per screen type via the BOARD_FOR rule, rules S1–S4
//                     each proven to fire, feed's truncation stated by streamNote identity on the
//                     canvas and in the exported file, the empty board, every screen against the
//                     real vocabulary, two mutations, and totality over the junk boards (#212)
//  20 method         the method band's pure layer: HOOK_STAGES pinned to the Hooked questions in
//                     loop order, assembleReducer's truth table (right/wrong stage, occupied slot,
//                     hostile inputs — refused, never thrown), hookComplete only at an exact 4/4,
//                     verdictFor by IDENTITY on the imported rules for all four quadrants and both
//                     frequency branches, the RENDER_SOURCES #193 tripwire, and the smuggled
//                     shaping-id mutation that proves the group can fail (#214)
//  21 catalog        the component catalog's pure layer: pack↔vocabulary set identity, the
//                     palette's static CATALOG_COMPONENTS pinned against the generated vocabulary,
//                     controlFor's bounds fidelity over every real prop (declared subsets only,
//                     nothing invented), tabsFor's 3/7 wrapper histogram pinned as the #220
//                     tripwire, WRAPPER_ATTRS pinned against each wrapper source's
//                     observedAttributes AND the vocabulary's props (with the type:"type" mutation
//                     that proves the fabricated-API refusal is real), reactSnippet's attribute
//                     projection + escaping, and a committed spec file behind every copy button (#215)
//  22 select         the canvas selection's pure half: one rectangle behind both input paths, one
//                     item list behind both menu open paths, menuAnchor's flips, and MENU_ITEMS
//                     frozen by mutation (#217)
//  23 studio docs    the studio's docked docs: docsIndex over the real pack with the collision
//                     throw and the class-rename mutation, every pack class asserted to be a class
//                     agentic-renderer.mjs actually emits (and every component the committed board
//                     really compiles asserted to be a doc trigger), headingTags, and the two
//                     invariants no other gate in this repo can see — loadDocsModel's THREE-argument
//                     join driven through a stub fetch with the graph-omitted mutation, and
//                     shouldLoad's truth table with COMPILED_SELECTOR pinned to studio-flow.mjs's
//                     own screen class (#218)
//  24 frames         the studio's device frames as DATA: FRAMES frozen at both levels by mutation,
//                     every src a real committed file (with the mutation that proves that check can
//                     fail, which matters because the pixel gate MASKS this content), both
//                     footprints on the grid by clampSpan's own definition, disjoint and clear of
//                     arrangeBoard's row 1, and packHref's contract-line trap over a stub
//                     document (#219)
//  25 instance stamp the per-company shell stamp: stampShell over the real committed shell,
//                     Mechanism A anchors thrown by name, Mechanism B as a global pass, and
//                     auditRefs' deploy-listing predicate (#222)
//  26 layers         the layers list's pure layer: order preservation (DOM order IS board order),
//                     the position sentences, selectable false exactly for a frame (the tripwire
//                     for the day the selection widens), toggleId's isolation, totality (#221)
//  27 minimap        the minimap's pure layer: mapView in three conditions (each the sole detector
//                     of one missing coordinate term), the far-edge clamps, jumpFrom's centering
//                     and both clamps, trackOffsets' gap rule, cellRect's footprint consistency,
//                     visibleRange's round-trip, and the no-timer source pin over both new
//                     modules (#221)
//  28 bank           the discovery question bank as data: the count and per-stage counts pinned,
//                     ids unique and stage-prefixed, every field on every entry, the twelve as an
//                     ORDER assertion, each depth's exact documented set, purity and frozenness by
//                     mutation, the C3 title-term list with its positive control, the zero-import /
//                     no-page source pin, and every weak-answer note pinned to the research file by
//                     its first thirty characters (#282)
//  29 discovery ops  the discovery applier (discovery/ops.mjs): OPS iterated against PARAMS and a
//                     VALID_FOR fixture per verb, the four named throws each driven by a broken
//                     op, both flag directions, R2 on the turn, the supersede rule, totality over
//                     junk, and the run-2 fixture's md5 pinned with the mutation that proves the
//                     compare can fail (#281)
//
//   node tooling/build-checks.mjs

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { hasTemplate, validateComposition } from "../system/agentic-renderer.mjs";
import { vetTokens } from "../system/pack-imported.mjs";
import { boardSvg, cardSvg } from "../system/build-card.mjs";
import { NO_DESIGN_IMPORTED, specMarkdown, TWO_CLAIMS } from "../system/build-keep.mjs";
import { exportHtml, stripImports } from "../system/studio-export.mjs";
import { DEFAULT_ANSWERS, frequencyVerdictFor, HOOK_STAGES, QUADRANT_MEANINGS, quadrantFor, QUESTIONS, SUMMARY_TERM } from "../system/build-questions.mjs";
import { assembleReducer, hookComplete, RENDER_SOURCES, verdictFor } from "../system/studio-method.mjs";
import { decodeBuild, encodeBuild, MAX_DECODED_BYTES, MAX_PARAM_CHARS } from "../system/build-share.mjs";
import { draftBoard, LABEL_MAX, MAX_AFFORDANCES, MAX_PLACES } from "../system/breadboard.mjs";
import { compose, streamNote } from "../system/pattern-render.mjs";
import { clampSlot, fitLevel, MAX_COLS, MAX_ROWS, ZOOM_LEVELS, ZOOM_REST } from "../system/studio-canvas.mjs";
import { createHistory, DIRS, groupDelta, groupOccupancy, groupStep, guidesFor, hitSlot, HISTORY_MAX, occupancyKey, SPOKEN_MAX, stepSlot } from "../system/studio-verbs.mjs";
import { extendSelection, idsInRange, marqueeRange, MENU_DESELECT, MENU_ITEMS, MENU_SELECT, menuAnchor, menuItems } from "../system/studio-select.mjs";
import { affordanceCount, PATTERNS, patternFor, screensFor, slotsFor, SLOT_MAX } from "../system/pattern-rules.mjs";
import {
  ACTION_STANCE, assertFictional, assertRunSlug, assertScenarioSlug, draftQuestion, isRunInFlight,
  listScenarios, QUESTION_INPUTS, runBuild, runOptions, SHAPE_QUESTION, slugFor, STEP_EVENT_TEXT_MAX,
  stepEvent, validateAnswers, withRunLock,
} from "../portal/lib/builder.mjs";
import { allowedOrigins, originAllowed } from "../portal/lib/origin.mjs";
import { applyOps, assertBoard, OPS, parseOpCommand } from "../system/board-ops.mjs";
import { runBoardOp } from "./board-op.mjs";
import { projectTrace } from "../agent-layer/gen-replay.mjs";
// #211's two pure functions. gen-vocabulary.mjs is zero-dep and its standalone-run guard means
// importing it writes nothing — but do NOT call genVocabulary() from a check, which writes to disk.
// handoff-viewer.mjs's top level is Node-safe (every DOM reference sits inside a function body);
// prepareHandoff is the pure half and is the only thing called here — never renderHandoffViewer.
import { validateExamples } from "../agent-layer/gen-vocabulary.mjs";
import { parseComponentSpec } from "../agent-layer/lib.mjs";
import { prepareHandoff } from "../system/handoff-viewer.mjs";
// #215's pure layer — DOM-free above the fold by design (vdMarkup's body is browser-only but is
// never called here). palette.mjs is Node-import-safe (self-boot behind typeof document) and is
// imported for the ONE static list group 21 pins against the vocabulary.
import { controlFor, reactSnippet, specPath, tabsFor, WRAPPER_ATTRS } from "../system/catalog.mjs";
import { CATALOG_COMPONENTS } from "../system/palette.mjs";
// #221's two pure layers — both modules are Node-import-safe (no DOM outside a function body, no
// self-boot; system/studio.mjs mounts them).
import { layerEntries, toggleId } from "../system/studio-layers.mjs";
import { cellRect, jumpFrom, mapView, trackOffsets, visibleRange } from "../system/studio-minimap.mjs";
// The recorder's FENCE — importable here for the same reason group 8 can import the operator path:
// portal/record-build.mjs loads the Agent SDK lazily, inside runBuild. CI's absence of
// portal/node_modules is what proves that, and this import now rides on it too.
import { makeFence } from "../portal/record-build.mjs";
import { auditRefs, stampShell } from "../agent-layer/build-instance.mjs";
import { curateTrace } from "./curate-trace.mjs";
// #282's bank — a zero-import data module (discovery/, not system/), so there is no SDK anywhere
// in its graph and CI's absence of portal/node_modules cannot touch it.
import { DEPTHS, OPENING_SET, questionById, questionsForStage, QUESTIONS as BANK, selectDepth, STAGES } from "../discovery/bank.mjs";
// #281's op grammar + applier — a zero-import module in discovery/ (not system/, so gen-loc-summary
// counts nothing), with no SDK anywhere in its graph. OPS and PARAMS are aliased because OPS above
// is board-ops.mjs's.
import { applyOp as applyDiscoveryOp, applyOps as applyDiscoveryOps, emptyRun, FLAGS, LEVELS, OPS as DISCOVERY_OPS, PARAMS as DISCOVERY_PARAMS, PROVENANCE, SOURCES } from "../discovery/ops.mjs";

const ROOT =resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VOCAB = JSON.parse(readFileSync(join(ROOT, "handoff/verdant/vocabulary.json"), "utf8"));

let failures = 0;
const failed = [];

function ok(condition, message) {
  if (condition) return;
  failures += 1;
  failed.push(message);
}
function group(name, detail) {
  if (failed.length) {
    console.error(`build ${name.padEnd(14)} ✗  ${failed.length} failure(s)`);
    for (const f of failed) console.error(`    · ${f}`);
    failed.length = 0;
    return;
  }
  console.log(`build ${name.padEnd(14)} ✓  ${detail}`);
}

const answersWith = (patch) => ({ ...DEFAULT_ANSWERS, ...patch });

// --- shared fixtures ------------------------------------------------------------------------------
// Hoisted out of the groups that first wrote them: #139 put all five patterns in the library, so
// four groups now need the same boards, and a second copy of a fixture is a second answer waiting
// to disagree with the first.

// A board no draft can produce: four connected affordances on the entry place and none anywhere
// else. Rule 2's hub override is the ONLY way `settings` is ever named, so this is the only board
// that reaches it.
const HUB_BOARD = {
  places: [
    { id: "p1", label: "Menu", affordances: [1, 2, 3, 4].map((n) => ({ id: `p1a${n}`, label: `Go ${n}` })) },
    ...[2, 3, 4, 5].map((n) => ({ id: `p${n}`, label: `Place ${n}`, affordances: [] })),
  ],
  connections: [1, 2, 3, 4].map((n) => [`p1a${n}`, `p${n + 1}`]),
};

// One board per pattern, each of which genuinely NAMES that pattern. Keyed by pattern id so the
// groups below can iterate PATTERNS rather than carry a hand-list that has to be edited whenever
// the library grows — the roster-shaped assertion this ticket is replacing everywhere.
const BOARD_FOR = {
  dashboard: draftBoard(answersWith({ shape: "overview" })),
  queue: draftBoard(answersWith({ shape: "worklist" })),
  feed: draftBoard(answersWith({ shape: "stream" })),
  onboarding: draftBoard(answersWith({ shape: "steps" })),
  settings: HUB_BOARD,
};

// Both caps at once: MAX_PLACES places each carrying MAX_AFFORDANCES affordances. 36 affordances,
// and the only board on which SLOT_MAX actually truncates anything (it truncates feed, and only
// feed — pattern-rules.mjs:61-72 says why).
const FULL_BOARD = {
  places: Array.from({ length: MAX_PLACES }, (_, i) => ({
    id: `p${i + 1}`,
    label: `P${i + 1}`,
    affordances: Array.from({ length: MAX_AFFORDANCES }, (_, j) => ({ id: `p${i + 1}a${j + 1}`, label: `A${j + 1}` })),
  })),
  connections: [],
};

// An in-library pattern with NOTHING to arrange: two places, every affordance removed. The board is
// not bare, so build-keep.mjs still renders the card — which is what made the bug #139 fixes
// reachable in two clicks rather than theoretical.
const BARE_BOARD = {
  places: [{ id: "p1", label: "Worklist", affordances: [] }, { id: "p2", label: "Progress", affordances: [] }],
  connections: [],
};

// --- 1 · pattern ids ------------------------------------------------------------------------------

{
  for (const [shape, expected] of [["overview", "dashboard"], ["worklist", "queue"], ["stream", "feed"], ["steps", "onboarding"]]) {
    const answers = answersWith({ shape });
    const { id } = patternFor({ answers, board: draftBoard(answers) });
    ok(id === expected, `shape "${shape}" named "${id}", expected "${expected}"`);
  }
  // The library claim as an INVARIANT over PATTERNS, not as a roster of five ids. A roster has to
  // be re-typed every time the library grows — which is exactly what happened to this check in
  // #139 — and an assertion that has to be edited is an assertion that eventually gets deleted.
  for (const p of Object.values(PATTERNS)) {
    if (p.inLibrary) {
      ok(p.needs === null, `${p.id} is in the library but still states what it needs`);
    } else {
      // VACUOUS TODAY, and kept deliberately: #139 put all five patterns in the library, so no
      // entry takes this branch. It is pattern SIX's contract — whoever adds one either has
      // components for it or writes down what it would take — and a later reader should not read a
      // vacuous clause as an oversight and delete it.
      ok(typeof p.needs === "string" && p.needs.length > 20, `${p.id} should say what it would need`);
    }
  }

  // THE PAGE COPY. build.html's prose has no other gate: the VR baseline's 100-pixel tolerance
  // swallows a handful of changed words, so a sentence that went false when the library completed
  // would have shipped unnoticed. Crude string matching, deliberately — it is the only thing
  // standing between a stale sentence and a reader. Watch it go red by reverting the copy.
  const buildHtml = readFileSync(join(ROOT, "build.html"), "utf8");
  for (const stale of ["Two of the five", "other three", "not in the library"]) {
    ok(!buildHtml.includes(stale), `build.html still says "${stale}", which the completed library made false`);
  }

  const hubbed = patternFor({ answers: answersWith({ shape: "overview" }), board: HUB_BOARD });
  ok(hubbed.id === "settings", `a hub board named "${hubbed.id}", expected "settings"`);
  ok(/Rule 2/.test(hubbed.reason), "the hub reason should quote rule 2");

  // ...and it must NOT fire on a drafted board, because every drafted non-entry place carries its
  // own affordance. That is the property the rule's comment claims, so it is checked.
  for (const shape of ["overview", "worklist", "stream", "steps"]) {
    for (const appetite of ["small", "big"]) {
      const answers = answersWith({ shape, appetite });
      const { id } = patternFor({ answers, board: draftBoard(answers) });
      ok(id !== "settings", `a drafted board (${shape}/${appetite}) fired the hub override`);
    }
  }

  const empty = patternFor({ answers: DEFAULT_ANSWERS, board: { places: [], connections: [] } });
  ok(empty.id === null, `an empty board named "${empty.id}", expected null`);
  const lone = patternFor({ answers: DEFAULT_ANSWERS, board: { places: [{ id: "p1", label: "One", affordances: [] }], connections: [] } });
  ok(lone.id === null, "one place with no affordances should name no pattern");

  group("pattern-ids", "4 shapes · hub override · never on a draft · 2 empty cases · library claim + page copy");
}

// --- 2 · slots ------------------------------------------------------------------------------------

{
  const answers = answersWith({ shape: "overview" });
  const board = draftBoard(answers);
  const tiles = slotsFor("dashboard", board);
  ok(tiles.length === board.places.length, `${tiles.length} tiles for ${board.places.length} places`);
  board.places.forEach((place, i) => {
    ok(tiles[i].label === place.label, `tile ${i} label is not the place's`);
    ok(tiles[i].value === String(place.affordances.length), `tile ${i} value is not the counted affordances`);
    ok(typeof tiles[i].value === "string", `tile ${i} value is not a string`);
    ok(tiles[i].tone === (place.affordances.length === 0 ? "warn" : "neutral"), `tile ${i} tone is wrong`);
  });

  // The cap, on a board at MAX_PLACES.
  const wide = { places: Array.from({ length: MAX_PLACES }, (_, i) => ({ id: `p${i + 1}`, label: `P${i + 1}`, affordances: [] })), connections: [] };
  ok(slotsFor("dashboard", wide).length <= 6, "the dashboard exceeded SLOT_MAX");

  const qBoard = draftBoard(answersWith({ shape: "worklist" }));
  const rows = slotsFor("queue", qBoard);
  const busiest = qBoard.places.reduce((a, b) => (b.affordances.length > a.affordances.length ? b : a), qBoard.places[0]);
  ok(rows.length === Math.min(6, busiest.affordances.length), "the queue did not come from the busiest place");
  rows.forEach((row, i) => {
    const aff = busiest.affordances[i];
    ok(row.label === aff.label, `row ${i} is not the affordance's label`);
    ok(row.meta === `in ${busiest.label}`, `row ${i} meta does not name its place`);
    const to = (qBoard.connections.find(([from]) => from === aff.id) || [])[1];
    const target = to ? qBoard.places.find((p) => p.id === to) : null;
    ok(row.value === (target ? target.label : "acts here"), `row ${i} value is neither its target nor "acts here"`);
    ok(typeof row.value === "string", `row ${i} value is not a string`);
  });

  // --- the three #139 derivations -------------------------------------------------------------
  //
  // The STRUCTURAL invariant first, over all five: a board with something on it derives a non-empty
  // array, and every value of every slot is a STRING. That is the counted-not-invented rule checked
  // by shape rather than pattern by pattern — the validator refuses a number, correctly, and the
  // fix is String() in the rules.
  for (const p of Object.values(PATTERNS)) {
    const slots = slotsFor(p.id, BOARD_FOR[p.id]);
    ok(Array.isArray(slots) && slots.length > 0, `${p.id} derived nothing from a board that names it`);
    for (const [i, slot] of (slots || []).entries()) {
      for (const [key, value] of Object.entries(slot)) {
        ok(typeof value === "string", `${p.id} slot ${i} prop "${key}" is a ${typeof value}, not a string`);
      }
    }
  }
  // The negatives that survive the flip: an unknown id and null still derive nothing.
  for (const id of [null, "nonsense", undefined]) {
    ok(slotsFor(id, qBoard) === null, `slotsFor("${id}") should derive nothing`);
  }

  // ONBOARDING — one step per place in board order, positions 1..n against a total that is what
  // was DRAWN.
  const oBoard = BOARD_FOR.onboarding;
  const steps = slotsFor("onboarding", oBoard);
  const stepCount = Math.min(oBoard.places.length, SLOT_MAX);
  ok(steps.length === stepCount, `${steps.length} steps for ${oBoard.places.length} places`);
  steps.forEach((step, i) => {
    ok(step.position === String(i + 1), `step ${i} position is "${step.position}", expected "${i + 1}"`);
    ok(step.total === String(stepCount), `step ${i} total is "${step.total}", expected the DRAWN count "${stepCount}"`);
    ok(step.label === oBoard.places[i].label, `step ${i} is not its place's label — board order is the sequence`);
    const affs = oBoard.places[i].affordances;
    ok(affs.length ? step.detail === affs[0].label : true, `step ${i} detail is not its first affordance`);
    ok(step.tone === (affs.length ? "neutral" : "warn"), `step ${i} tone does not read the place's emptiness`);
  });
  // A place with nothing on it gets the warn tone AND says so in words.
  const holed = structuredClone(oBoard);
  holed.places[1].affordances = [];
  const holedSteps = slotsFor("onboarding", holed);
  ok(holedSteps[1].tone === "warn", "a place with nothing to act on should give its step the warn tone");
  ok(typeof holedSteps[1].detail === "string" && holedSteps[1].detail.length > 0,
    "a warn step carries no detail, so its tone is the only thing distinguishing it — the spec forbids exactly that");

  // TONE IS NEVER THE SOLE SIGNAL — the promise all three ds- specs make, checked as an invariant
  // over every tone-bearing slot rather than trusted per pattern. A slot that reads identically to a
  // neutral one once its tone is stripped hands a screen reader byte-identical output for two
  // different states. This shipped broken in #139's first pass: the onboarding branch omitted
  // `detail` on empty places, so "Step 3 of 3, Settings" was both the warning and the all-clear.
  for (const p of Object.values(PATTERNS)) {
    for (const fixture of [BOARD_FOR[p.id], holed, BARE_BOARD]) {
      for (const [i, slot] of (slotsFor(p.id, fixture) || []).entries()) {
        if (!slot.tone || slot.tone === "neutral") continue;
        const spoken = Object.entries(slot).filter(([k]) => k !== "tone").map(([, v]) => v).join(" ");
        ok(/\b0\b|nothing|none|no /i.test(spoken),
          `${p.id} slot ${i} is "${slot.tone}" but reads "${spoken}" — strip the colour and it is indistinguishable from neutral`);
      }
    }
  }

  // FEED — every affordance on the WHOLE board, in the board's own order, each row naming the place
  // it came from. The meta assertion is what proves it reads the whole board rather than one place.
  const fBoard = BOARD_FOR.feed;
  const stream = slotsFor("feed", fBoard);
  ok(stream.length === Math.min(SLOT_MAX, affordanceCount(fBoard)),
    `the feed showed ${stream.length} of ${affordanceCount(fBoard)} affordances`);
  const flat = fBoard.places.flatMap((p) => p.affordances.map((a) => [p, a]));
  stream.forEach((row, i) => {
    ok(row.label === flat[i][1].label, `feed row ${i} is not the ${i}th affordance in board order`);
    ok(row.meta === `in ${flat[i][0].label}`, `feed row ${i} meta does not name its OWN place`);
  });
  ok(new Set(stream.map((r) => r.meta)).size > 1,
    "every feed row came from the same place; feed must read the whole board, not the busiest place");

  // SETTINGS — the entry place's affordances and where each leads, and NO meta: every row is in the
  // same place, so a field that says the same thing on every row says nothing.
  const menu = slotsFor("settings", HUB_BOARD);
  const entry = HUB_BOARD.places[0];
  ok(menu.length === Math.min(SLOT_MAX, entry.affordances.length), `${menu.length} rows for ${entry.affordances.length} entry affordances`);
  menu.forEach((row, i) => {
    const aff = entry.affordances[i];
    ok(row.label === aff.label, `settings row ${i} is not the entry affordance's label`);
    ok(!Object.hasOwn(row, "meta"), `settings row ${i} carries a meta; every row is in the same place`);
    const to = (HUB_BOARD.connections.find(([from]) => from === aff.id) || [])[1];
    const target = to ? HUB_BOARD.places.find((p) => p.id === to) : null;
    ok(row.value === (target ? target.label : "acts here"), `settings row ${i} value is not its destination`);
  });

  // THE CAP, on a board at both ceilings. Four patterns cannot reach it; feed can, and does.
  ok(affordanceCount(FULL_BOARD) === MAX_PLACES * MAX_AFFORDANCES, "the full-board fixture is not at both caps");
  for (const p of Object.values(PATTERNS)) {
    ok(slotsFor(p.id, FULL_BOARD).length <= SLOT_MAX, `${p.id} exceeded SLOT_MAX on a full board`);
  }
  ok(slotsFor("feed", FULL_BOARD).length === SLOT_MAX, "feed should fill the cap on a 36-affordance board");
  // ...and the surface states the drop rather than making it silently. This is the sentence that
  // stops SLOT_MAX becoming a working truncation nobody is told about.
  const note = streamNote(SLOT_MAX, affordanceCount(FULL_BOARD));
  ok(note.includes(`${SLOT_MAX} of the ${MAX_PLACES * MAX_AFFORDANCES}`), `the feed's note does not state what it dropped: ${note}`);
  ok(/order the board draws them/.test(note), "the feed's note does not say the order is the board's own");
  ok(!/recent|newest first/i.test(note.replace(/ordered by recency/, "")), "the feed's note claims a recency the board cannot record");

  group("slots", "5 patterns counted from the board · every value a string · capped · feed states its truncation");
}

// --- 3 · composition validity against the REAL vocabulary -------------------------------------------

{
  // Driven off PATTERNS, not off a hand-list of [shape, component-name] pairs. The old version had
  // to be re-typed the day the library grew, and the component names in it were a SECOND source of
  // truth about what compose emits — so the assertion below derives them from compose instead.
  const emitted = [];
  for (const p of Object.values(PATTERNS)) {
    if (!p.inLibrary) continue; // vacuous today; see group 1
    const board = BOARD_FOR[p.id];
    ok(board, `${p.id} has no fixture in BOARD_FOR — a pattern was added and this gate was not told which board names it`);
    if (!board) continue;
    // The hub fixture must actually fire rule 2, or every settings assertion in this file is about
    // a pattern no visitor can reach. The other four are named by their shape answer, which group 1
    // already proves shape by shape.
    if (board === HUB_BOARD) {
      const named = patternFor({ answers: answersWith({ shape: "overview" }), board });
      ok(named.id === "settings", `the hub fixture names "${named.id}", not settings`);
    }
    const composition = compose(p.id, slotsFor(p.id, board));
    ok(Array.isArray(composition) && composition.length > 0, `${p.id} composed nothing`);
    if (!composition) continue;
    emitted.push(...composition);
    try {
      validateComposition(VOCAB, composition);
    } catch (err) {
      ok(false, `${p.id} failed the real vocabulary: ${err.message}`);
    }
  }

  // Every component name the page can emit, DERIVED from compose rather than retyped, must be both
  // a generated-vocabulary entry and a template this renderer actually has. The second half is the
  // drift error agentic-renderer.mjs throws — caught here under Node instead of by a visitor
  // watching the stage refuse itself. Kept alongside the wider loop below, which does NOT subsume
  // it: this one asserts that compose() emits only vocabulary names, which is a claim about the
  // builder rather than about the vocabulary.
  const names = new Set(emitted.map((n) => n.name));
  ok(names.size >= 3, `only ${names.size} distinct component(s) across all five patterns`);
  for (const name of names) {
    ok(Object.hasOwn(VOCAB.components, name), `${name} is not in the generated vocabulary`);
    ok(hasTemplate(name), `${name} is in the vocabulary but agentic-renderer.mjs has no template for it — renderer and vocabulary have drifted`);
  }

  // Every vocabulary entry has a render path — WIDER than the emitted set on purpose (#211). A spec
  // and a vocabulary entry with no components.css block and no template is "documented but not
  // composable", which was demo-notice's state until #211 closed it. Asserting over the emitted names
  // alone let that hole sit behind a green gate — worse, the gate WROTE THE HOLE DOWN as intentional,
  // in a comment paragraph nobody re-read. Asserting over the whole vocabulary makes a render path a
  // precondition of being documented at all, which is the constraint #220's ten components inherit.
  for (const name of Object.keys(VOCAB.components)) {
    ok(hasTemplate(name), `${name} is in the generated vocabulary but agentic-renderer.mjs has no template for it — a spec without a render path is documented but not composable (#211)`);
  }

  for (const id of [null, "nonsense", undefined]) {
    ok(compose(id, [{ label: "x", value: "1" }]) === null, `compose("${id}") should refuse to compose`);
  }
  ok(compose("dashboard", null) === null, "compose with no slots should return null");
  ok(compose("dashboard", []) === null, "compose with an empty slot array should return null");

  group("composition", `all 5 patterns validate against handoff/verdant/vocabulary.json · ${names.size} components emitted by compose, each in the vocabulary · every one of ${Object.keys(VOCAB.components).length} vocabulary entries has a template — the whole vocabulary since #211, not just the emitted set`);
}

// --- 4 · codec round-trip ---------------------------------------------------------------------------

const sample = {
  answers: answersWith({ shape: "worklist", nogos: "social" }),
  board: draftBoard(answersWith({ shape: "worklist", nogos: "social" })),
  boardIsEdited: true,
  pack: {
    slug: "acme", label: "acme.json", fileName: "acme.json",
    tokens: { "--color-accent": "#ff6600", "--color-fg": "#101010", "--spacing-md": "16px" },
    note: "a pack header",
  },
};

{
  for (const compress of [true, false]) {
    const encoded = await encodeBuild(sample, { compress });
    ok(encoded.length <= MAX_PARAM_CHARS, `the ${compress ? "deflate" : "raw"} payload is over the param cap`);
    const { state, reason } = await decodeBuild(encoded);
    ok(state !== null, `the ${compress ? "deflate" : "raw"} branch failed to decode: ${reason}`);
    if (!state) continue;
    ok(JSON.stringify(state.answers) === JSON.stringify(sample.answers), "answers did not round-trip");
    ok(JSON.stringify(state.board) === JSON.stringify(sample.board), "the board did not round-trip");
    ok(state.boardIsEdited === true, "the edited flag did not round-trip");
    ok(JSON.stringify(state.pack.tokens) === JSON.stringify(sample.pack.tokens), "the token map did not round-trip");
    ok(state.pack.slug === "acme", "the slug did not round-trip");
    // No pattern id travels: the receiver RECOMPUTES it, and it must land where the sender was.
    ok(patternFor(state).id === patternFor(sample).id, "the restored state recomputed a different pattern");
  }
  const noPack = await decodeBuild(await encodeBuild({ ...sample, pack: null }));
  ok(noPack.state && noPack.state.pack === null, "a build with no imported design should restore with no pack");

  // --- the FROZEN v1 proof (#208) --------------------------------------------------------------
  // The codec grew a version, and PRD §1 guarantees /build survives as the form-mode fallback over
  // the same build data AND share links. These payloads were captured from the shipping v1 encoder
  // BEFORE this file's module learned v2 (tooling/share-v1-links.json states the commit), which is
  // the whole point: a fixture re-synthesised by the code under test is that code agreeing with
  // itself. The four build fields must restore identically, and no v1 link may acquire an
  // arrangement it never carried.
  const V1 = JSON.parse(readFileSync(join(ROOT, "tooling/share-v1-links.json"), "utf8"));
  const v1Fixtures = V1.entries;
  // A fixture file quietly reduced to one entry would leave every assertion below true and the
  // coverage claim in the group line false, so the coverage itself is asserted.
  ok(v1Fixtures.length >= 5, `share-v1-links.json carries ${v1Fixtures.length} entries, expected at least the 5 captured`);
  ok(v1Fixtures.some((e) => e.branch === "raw"), "the frozen v1 fixtures cover no raw-transport link");
  ok(v1Fixtures.some((e) => e.branch === "deflate"), "the frozen v1 fixtures cover no deflate-transport link");
  ok(v1Fixtures.some((e) => /chromium|firefox|webkit/i.test(e.capturedFrom)),
    "the frozen v1 fixtures carry no link captured from a real browser — a synthesised-only proof is the code agreeing with itself");
  const buildFields = (s) => JSON.stringify({ answers: s.answers, board: s.board, boardIsEdited: s.boardIsEdited, pack: s.pack });
  // The deflate branch's BYTES are implementation-dependent — Node's CompressionStream and Chrome's
  // need not emit identical streams for the same input — so byte-identity is claimed on the raw
  // branch and JSON-identity on deflate. Asserting bytes on a deflate fixture would be a check that
  // passes on one machine and, worse, could silently agree on another.
  const inflate = async (param) => {
    const { state } = await decodeBuild(param);
    return state;
  };
  for (const entry of v1Fixtures) {
    const { state, reason } = await decodeBuild(entry.param);
    ok(state !== null, `the frozen v1 link "${entry.label}" (${entry.branch}) no longer decodes: ${reason}`);
    if (!state) continue;
    ok(buildFields(state) === buildFields(entry.state),
      `the frozen v1 link "${entry.label}" (${entry.branch}) restores to a DIFFERENT build than it did under v1`);
    ok(state.arrangement === null,
      `the frozen v1 link "${entry.label}" acquired an arrangement (${JSON.stringify(state.arrangement)}) — a v1 payload carries none, not an empty one and not a default`);
    if (entry.branch === "raw") {
      ok(await encodeBuild(state, { compress: false }) === entry.param,
        `re-encoding the frozen v1 link "${entry.label}" is no longer byte-identical to the param v1 emitted`);
    } else {
      const again = await encodeBuild(state, { compress: true });
      const round = await inflate(again);
      ok(round !== null && buildFields(round) === buildFields(entry.state),
        `the deflate branch's re-encode of "${entry.label}" no longer carries the same build`);
    }
  }

  // --- the arrangement round-trip (#208) ---------------------------------------------------------
  // Slots chosen so the case is not accidentally the encoder's own default: two rows, not row 1.
  const arranged = {
    ...sample,
    arrangement: sample.board.places.map((place, i) => ({ id: place.id, col: i + 2, row: (i % 2) + 1 })),
  };
  {
    const param = await encodeBuild(arranged, { compress: false });
    const { state, reason } = await decodeBuild(param);
    ok(state !== null, `a build with an arrangement failed to decode: ${reason}`);
    if (state) {
      ok(JSON.stringify(state.arrangement) === JSON.stringify(arranged.arrangement),
        `the arrangement did not round-trip value-for-value: ${JSON.stringify(state.arrangement)}`);
      ok(await encodeBuild(state, { compress: false }) === param,
        "decoding and re-encoding an arrangement did not produce the identical param");
      // `g` in the payload must not disturb what the receiver RECOMPUTES.
      ok(patternFor(state).id === patternFor(arranged).id, "a payload carrying an arrangement recomputed a different pattern");
    }
    // The consistency rule, from the encoder's side: an arrangement for a board that is no longer
    // this board is DROPPED rather than realigned, and dropping it takes the payload back to v1.
    const shorter = { ...arranged, arrangement: arranged.arrangement.slice(0, 1) };
    const dropped = await encodeBuild(shorter, { compress: false });
    ok(dropped === await encodeBuild(sample, { compress: false }),
      "an arrangement whose length disagrees with the board must be omitted, leaving the byte-identical v1 param");
    const offGrid = { ...arranged, arrangement: arranged.arrangement.map((s, i) => (i ? s : { ...s, col: MAX_COLS + 1 })) };
    ok(await encodeBuild(offGrid, { compress: false }) === await encodeBuild(sample, { compress: false }),
      "an off-grid slot must make the encoder omit the whole arrangement — it repairs nothing");
  }

  group("codec", `both branches round-trip · the pattern recomputes to the sender's · ${v1Fixtures.length} frozen v1 links (both branches + a real browser capture) restore byte-identically and gain no arrangement · the arrangement round-trips, re-encodes identically, and is DROPPED whole when it stops describing the board`);
}

// --- 5 · the tamper battery ---------------------------------------------------------------------------

// Hand-built payloads: JSON → the 0x00 (uncompressed) flag → base64url. The decoder must reject
// every one of them WHOLE — never partially apply, never repair.
function pack(obj) {
  const body = new TextEncoder().encode(JSON.stringify(obj));
  const bytes = new Uint8Array(body.length + 1);
  bytes.set(body, 1);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

{
  const good = {
    v: 1,
    a: Object.fromEntries(QUESTIONS.map((q) => [q.id, q.default])),
    b: { p: [["p1", "Overview", [["p1a1", "Filter"]]], ["p2", "Progress", []]], c: [["p1a1", "p2"]] },
    e: 0,
  };
  // The fixture itself must pass, or every rejection below proves nothing.
  const baseline = await decodeBuild(pack(good));
  ok(baseline.state !== null, `the tamper baseline should decode: ${baseline.reason}`);

  const clone = (patch) => ({ ...structuredClone(good), ...patch });
  const cases = [
    ["a bad token value", clone({ k: { "--color-accent": "url(javascript:x)" } })],
    // The case the battery was MISSING, and its absence manufactured confidence: `url(javascript:x)`
    // above rejects on the COLON, so url() itself had never been tested. A protocol-relative URL
    // needs no colon, passes VALUE_OK character by character, and reaches the network through a
    // `background: var(--color-bg)` shorthand. Found by an adversarial review of PR #145.
    ["a colon-free url() beacon", clone({ k: { "--color-bg": "url(//attacker.example/beacon.png)" } })],
    ["a protocol-relative value with no url()", clone({ k: { "--color-bg": "image-set(//h/x.png)" } })],
    ["an off-family token key", clone({ k: { "--evil": "red" } })],
    ["an empty token map", clone({ k: {} })],
    // __proto__ everywhere it can appear, not only in the token map.
    ["__proto__ as an answer id", clone({ a: { ...good.a, ...JSON.parse('{"__proto__":{"x":1}}') } })],
    ["__proto__ as a place id", clone({ b: { p: [["__proto__", "P", []]], c: [] } })],
    // A label whose CHARACTERS, not length, make every SVG built from it XML-invalid.
    ["a NUL in a label", clone({ b: { p: [["p1", "a\u0000b", []]], c: [] } })],
    ["a C0 control in a label", clone({ b: { p: [["p1", "a\u0001b", []]], c: [] } })],
    ["a lone high surrogate in a label", clone({ b: { p: [["p1", "a\ud800b", []]], c: [] } })],
    ["a lone low surrogate in a label", clone({ b: { p: [["p1", "a\udc00b", []]], c: [] } })],
    ["a bidi override in a label", clone({ b: { p: [["p1", "a\u202Eb", []]], c: [] } })],
    ["a bidi isolate in a label", clone({ b: { p: [["p1", "a\u2066b", []]], c: [] } })],
    ["an invisible directional mark in a label", clone({ b: { p: [["p1", "a\u200Fb", []]], c: [] } })],
    // Type confusion, not just value-domain violations.
    ["v as a string", clone({ v: "1" })],
    ["a as an array", clone({ a: [] })],
    ["b.p as an object", clone({ b: { p: {}, c: [] } })],
    ["e as a boolean", clone({ e: true })],
    ["s as a number", clone({ k: { "--color-accent": "#111111" }, s: 7 })],
    ["a token value that is a number", clone({ k: { "--color-accent": 16711680 } })],
    ["a __proto__ key in the token map", clone({ k: JSON.parse('{"__proto__":{"x":1},"--color-accent":"#111111"}') })],
    ["a 10 000-character label", clone({ b: { p: [["p1", "x".repeat(10000), []]], c: [] } })],
    ["7 places", clone({ b: { p: Array.from({ length: MAX_PLACES + 1 }, (_, i) => [`p${i + 1}`, `P${i + 1}`, []]), c: [] } })],
    ["7 affordances on one place", clone({ b: { p: [["p1", "P", Array.from({ length: MAX_AFFORDANCES + 1 }, (_, i) => [`p1a${i + 1}`, `A${i + 1}`])]], c: [] } })],
    ["an answer outside its options", clone({ a: { ...good.a, shape: "spiral" } })],
    ["an unknown answer id", clone({ a: { ...good.a, favouriteColour: "blue" } })],
    ["a connection from a missing affordance", clone({ b: { p: good.b.p, c: [["p9a9", "p2"]] } })],
    ["a connection to a missing place", clone({ b: { p: good.b.p, c: [["p1a1", "p9"]] } })],
    ["an affordance leading to its own place", clone({ b: { p: good.b.p, c: [["p1a1", "p1"]] } })],
    ["a malformed place id", clone({ b: { p: [["place-one", "P", []]], c: [] } })],
    ["a malformed edited flag", clone({ e: 2 })],
    // v2 is REAL now (#208), so the hostile version moves up one. The accept side is asserted below
    // — a version family that only ever rejects would pass with a decoder that rejects everything.
    ["v: 3", clone({ v: 3 })],
    // The envelope audit (#208). v1 validated every field it knew about and ignored every field it
    // did not, which decoded a payload carrying anything extra as a build without it.
    ["an unknown top-level key", clone({ zz: 1 })],
    // The near-miss a future editor would actually type — the field is `g`, not its English name.
    ["the arrangement spelled out as a key", clone({ v: 2, arrangement: [[1, 1], [2, 1]] })],
  ];

  // --- the coordinate family (#208) ----------------------------------------------------------------
  // EVERY case here gets the same two-place `b` and a two-entry `g`, varying only the thing under
  // test — a `g` whose length disagrees with `b.p` rejects for the LENGTH reason and would prove
  // nothing about coordinates at all, which is the "check that cannot fail" shape one level down.
  const twoPlaces = { p: [["p1", "Overview", []], ["p2", "Progress", []]], c: [] };
  const g2 = (g) => clone({ v: 2, b: structuredClone(twoPlaces), g });
  const coordinateCases = [
    // magnitude
    ["a column of 1e9", g2([[1e9, 1], [2, 1]])],
    ["a row at MAX_SAFE_INTEGER", g2([[1, Number.MAX_SAFE_INTEGER], [2, 1]])],
    ["a zero column (the grid is 1-based)", g2([[0, 1], [2, 1]])],
    ["a negative column", g2([[-1, 1], [2, 1]])],
    // type — every one of these is a value clampSlot would happily COERCE, and this codec must not
    ["a string coordinate", g2([["1", "1"], [2, 1]])],
    ["a fractional coordinate", g2([[1.5, 1], [2, 1]])],
    ["a null coordinate", g2([[null, 1], [2, 1]])],
    ["a boolean coordinate", g2([[true, 1], [2, 1]])],
    ["an object where a pair belongs", g2([[{ col: 1, row: 1 }], [2, 1]])],
    ["a pair of length 3", g2([[1, 1, 1], [2, 1]])],
    ["g as an object", g2({ p1: [1, 1], p2: [2, 1] })],
    ["g as a string", g2("1,1 2,1")],
    // duplicate — two places in one cell is a stacking claim the canvas itself refuses
    ["two places in one cell", g2([[1, 1], [1, 1]])],
    // off-board, by exactly one on each axis
    [`a column of ${MAX_COLS + 1}`, g2([[MAX_COLS + 1, 1], [2, 1]])],
    [`a row of ${MAX_ROWS + 1}`, g2([[1, MAX_ROWS + 1], [2, 1]])],
    // length — an arrangement for a different board, in both directions, plus a flood
    ["g longer than b.p", g2([[1, 1], [2, 1], [3, 1]])],
    ["g shorter than b.p", g2([[1, 1]])],
    ["g of 1000 entries", g2(Array.from({ length: 1000 }, (_, i) => [(i % MAX_COLS) + 1, (i % MAX_ROWS) + 1]))],
    ["an empty g", g2([])],
    // envelope — a v1 link cannot carry a v2 field
    ["g on a v: 1 envelope", clone({ v: 1, b: structuredClone(twoPlaces), g: [[1, 1], [2, 1]] })],
  ];

  for (const [label, payload] of [...cases, ...coordinateCases]) {
    const { state, reason } = await decodeBuild(pack(payload));
    ok(state === null, `${label} was ACCEPTED — it must reject the whole payload`);
    ok(typeof reason === "string" && reason.length > 0, `${label} rejected with no reason`);
  }

  // The ACCEPT side of v2, without which the family above could pass on a decoder that refuses
  // everything: a well-formed arrangement decodes, and it decodes to the slots that were sent.
  const goodG = await decodeBuild(pack(g2([[1, 1], [2, 1]])));
  ok(goodG.state !== null, `a valid v: 2 arrangement should decode: ${goodG.reason}`);
  ok(goodG.state && JSON.stringify(goodG.state.arrangement) === JSON.stringify([{ id: "p1", col: 1, row: 1 }, { id: "p2", col: 2, row: 1 }]),
    `a valid arrangement decoded to ${JSON.stringify(goodG.state && goodG.state.arrangement)}`);
  // The ids come from the VALIDATED places, never from the payload — there is nowhere in `g` to put
  // one, which is the point of the positional shape.
  ok(goodG.state && goodG.state.arrangement.every((s, i) => s.id === goodG.state.board.places[i].id),
    "a decoded arrangement's ids must be the board's own, at the same index");

  // The grid boundary itself, both sides — the LABEL_MAX pair below, applied to coordinates.
  ok((await decodeBuild(pack(g2([[MAX_COLS, MAX_ROWS], [1, 1]])))).state !== null,
    `the far corner [${MAX_COLS}, ${MAX_ROWS}] should be accepted — it is on the grid`);
  ok((await decodeBuild(pack(g2([[MAX_COLS + 1, MAX_ROWS], [1, 1]])))).state === null,
    `[${MAX_COLS + 1}, ${MAX_ROWS}] should be rejected — one column past the grid`);

  // A `__proto__` key at the TOP level is now REFUSED, and this expectation FLIPPED in #208 — the
  // block used to argue, correctly, that asserting a rejection here would be "a test asserting a
  // behaviour the code correctly does not have". That was true of v1, which validated every field
  // it knew about and ignored the rest. It is false of v2: the envelope audit enumerates
  // Object.keys, JSON.parse creates `__proto__` as an own DATA property rather than invoking the
  // setter, so the audit sees it and refuses it as the unknown key it is.
  //
  // Both pollution assertions STAY, because they assert the thing that actually matters and it is
  // no less at stake on this path: a REJECTING decoder must not pollute on its way out either.
  const polluting = JSON.parse(`{"__proto__":{"polluted":1},${JSON.stringify(good).slice(1)}`);
  const inert = await decodeBuild(pack(polluting));
  ok(inert.state === null, "a top-level __proto__ key should be refused by the envelope audit");
  ok(typeof inert.reason === "string" && inert.reason.length > 0, "the __proto__ refusal carried no reason");
  ok({}.polluted === undefined, "a top-level __proto__ key polluted Object.prototype");
  ok(Object.prototype.polluted === undefined, "Object.prototype was polluted by a decoded payload");

  // A label at exactly the cap is legal; one character past it is not — the boundary itself.
  ok((await decodeBuild(pack(clone({ b: { p: [["p1", "x".repeat(LABEL_MAX), []]], c: [] } })))).state !== null,
    `a label of exactly ${LABEL_MAX} characters should be accepted`);
  ok((await decodeBuild(pack(clone({ b: { p: [["p1", "x".repeat(LABEL_MAX + 1), []]], c: [] } })))).state === null,
    `a label of ${LABEL_MAX + 1} characters should be rejected`);

  // Malformed transport, not malformed content.
  const truncated = pack(good).slice(0, 12);
  ok((await decodeBuild(truncated)).state === null, "a truncated payload was accepted");
  ok((await decodeBuild("z".repeat(MAX_PARAM_CHARS + 1))).state === null, "an over-length param was accepted");
  ok((await decodeBuild("")).state === null, "an empty param was accepted");
  ok((await decodeBuild(null)).state === null, "a non-string param was accepted");

  // The decompression bomb: highly compressible, tiny on the wire, over the cap once inflated.
  if (typeof CompressionStream === "function") {
    const fat = new TextEncoder().encode(JSON.stringify({ ...good, pad: "x".repeat(MAX_DECODED_BYTES * 2) }));
    const cs = new CompressionStream("deflate-raw");
    const writer = cs.writable.getWriter();
    writer.write(fat);
    writer.close();
    const deflated = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    const bytes = new Uint8Array(deflated.length + 1);
    bytes[0] = 0x01;
    bytes.set(deflated, 1);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    const bomb = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    ok(bomb.length < MAX_PARAM_CHARS, "the bomb fixture should be small on the wire");
    const bombed = await decodeBuild(bomb);
    ok(bombed.state === null, "an over-cap decompressed payload was accepted");
    // The REASON is asserted, not merely the rejection. The bomb's padding rides in a top-level
    // `pad` key, which #208's envelope audit would also refuse — so a size cap deleted from
    // inflateRaw would leave this case green for the wrong reason. The cap has to be what caught it,
    // and it has to catch it before the payload is in memory at all.
    ok(/size cap/.test(bombed.reason || ""),
      `the bomb was refused for "${bombed.reason}" rather than the size cap — the cap is what must catch it, before it is in memory`);
  } else {
    console.log("build tamper         ·  CompressionStream is absent here, so the bomb case was skipped");
  }

  group("tamper", `${cases.length + coordinateCases.length} hostile payloads (incl. ${coordinateCases.length} coordinate cases — magnitude, type, duplicate cell, off-board by one on each axis, a length for a different board, and g on a v1 envelope) + caps + transport, all rejected whole · v2 asserted on the ACCEPT side too, ids taken from the board and not the payload · the ${MAX_COLS}×${MAX_ROWS} boundary itself, both sides`);
}

// --- 6 · SVG well-formedness and escaping --------------------------------------------------------------

// Node has no DOMParser. This is the realistic failure — an unescaped & or < from a visitor label
// or a third-party token value — so it is checked directly: a balanced-element scan (possible only
// because every attribute value is escaped, so no raw ">" hides inside one) plus an entity check on
// every text run.
const ENTITY = /&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i;

function scanSvg(svg, label) {
  ok(svg.startsWith("<svg "), `${label}: does not start with <svg`);
  ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), `${label}: has no xmlns, so it will not open standalone`);
  ok(!svg.includes("<style"), `${label}: carries a <style> block`);

  const stack = [];
  let i = 0;
  while (i < svg.length) {
    const lt = svg.indexOf("<", i);
    const text = svg.slice(i, lt < 0 ? svg.length : lt);
    if (ENTITY.test(text)) ok(false, `${label}: an unescaped & in text content`);
    if (lt < 0) break;
    const gt = svg.indexOf(">", lt);
    if (gt < 0) { ok(false, `${label}: an unterminated tag`); return; }
    const tag = svg.slice(lt + 1, gt);
    if (tag.startsWith("/")) {
      const open = stack.pop();
      if (open !== tag.slice(1).trim()) { ok(false, `${label}: </${tag.slice(1)}> closes <${open}>`); return; }
    } else if (!tag.endsWith("/") && !tag.startsWith("?") && !tag.startsWith("!")) {
      stack.push(tag.split(/[\s/]/)[0]);
    }
    i = gt + 1;
  }
  if (stack.length) ok(false, `${label}: unclosed ${stack.join(", ")}`);
}

{
  const HOSTILE_TOKENS = {
    "--color-accent": "</svg><script>alert(1)</script>",
    "--color-fg": '" onload="x',
    "--color-bg": "url(javascript:alert(1))",
    "--color-border": "var(--color-accent)",
  };
  const HOSTILE_LABEL = "</text><script>alert(1)</script>";

  const board = BOARD_FOR.dashboard;

  const svgs = [
    // One card per pattern, each on the board that names it — five now, not two.
    ...Object.values(PATTERNS).map((p) => [`${p.id} card`, cardSvg({
      patternId: p.id, slots: slotsFor(p.id, BOARD_FOR[p.id]), board: BOARD_FOR[p.id], tokens: HOSTILE_TOKENS,
    })]),
    // The two bodies that draw the board instead of the pattern.
    ["nothing-to-arrange card", cardSvg({ patternId: "queue", slots: slotsFor("queue", BARE_BOARD), board: BARE_BOARD, tokens: HOSTILE_TOKENS })],
    ["empty card", cardSvg({ patternId: null, slots: null, board: { places: [], connections: [] }, tokens: HOSTILE_TOKENS })],
    ["board", boardSvg(board, { tokens: HOSTILE_TOKENS })],
    ["empty board", boardSvg({ places: [], connections: [] })],
  ];
  for (const [label, svg] of svgs) {
    scanSvg(svg, label);
    ok(!svg.includes("<script"), `${label}: a <script> reached the markup`);
    ok(!/\sonload=/.test(svg), `${label}: an onload attribute reached the markup`);
    ok(!svg.includes("javascript:"), `${label}: a javascript: URL reached the markup`);
    // Every hostile token value fell back to a committed neutral literal rather than being escaped
    // into an attribute: the colour gate is a shape check, not an escaping trick.
    ok(!svg.includes("var(--color-accent)"), `${label}: a var() token value reached an SVG attribute`);
  }

  // THE REGRESSION FOR THE BUG #139 FIXED, in both media a reader can walk away holding.
  //
  // cardSvg used to gate on `pattern && pattern.inLibrary && rows.length` with a single `else` that
  // hard-coded "is not in the library yet" — so an IN-LIBRARY pattern whose board gave it no slots
  // downloaded an SVG asserting something false, two clicks from the default build. specMarkdown
  // had the same shape at its `## Components used` fallback, where `pattern.needs` (null for every
  // in-library pattern) interpolated as the literal string "null".
  //
  // Which cases carry the proof, stated because it is not obvious: dashboard and onboarding derive
  // one slot per place, so they CANNOT be empty while places exist; queue, feed and settings can,
  // and those three are the ones that used to fall through. All five are swept for symmetry.
  const mdState = (board) => {
    const answers = answersWith({ shape: "worklist" });
    return { answers, quadrant: quadrantFor(answers), frequencyVerdict: frequencyVerdictFor(answers), board, pack: null };
  };
  for (const p of Object.values(PATTERNS)) {
    for (const [what, fixture] of [["a full board", BOARD_FOR[p.id]], ["a board with no affordances", BARE_BOARD]]) {
      const slots = slotsFor(p.id, fixture);
      const svg = cardSvg({ patternId: p.id, slots, board: fixture, tokens: {} });
      ok(!svg.includes("not in the library"),
        `the ${p.id} card on ${what} says "not in the library" — that is false for an in-library pattern`);
      scanSvg(svg, `${p.id} on ${what}`);

      const md = specMarkdown(mdState(fixture), patternFor({ answers: answersWith({ shape: "worklist" }), board: fixture }), compose(p.id, slots));
      const used = md.split("## Components used")[1].split("\n##")[0];
      ok(!/\bnull\b/.test(used), `the ${p.id} spec's "Components used" on ${what} interpolated a null: ${used.trim().slice(0, 90)}`);
      ok(!used.includes("not in the library"), `the ${p.id} spec's "Components used" on ${what} claims the pattern is not in the library`);
    }
  }

  // THE REGRESSION FOR #194: the <desc> may not claim more slots than the card draws. The list
  // bodies cap at ROW_MAX = 5 while SLOT_MAX admits 6, so a six-affordance place is one visitor
  // edit past every BOARD_FOR fixture — and the desc is the one line of the file a screen reader
  // is guaranteed to meet. Six slots: the desc states both numbers. Five: no drop note, because a
  // sentence that also appears when nothing was dropped teaches readers to ignore it.
  const placeWith = (n) => ({
    places: [{ id: "p1", label: "Entry", affordances: Array.from({ length: n }, (_, i) => ({ id: `p1a${i + 1}`, label: `act ${i + 1}` })) }],
    connections: [],
  });
  {
    const six = placeWith(6);
    const sixSlots = slotsFor("queue", six);
    ok(sixSlots.length === 6, `the six-affordance fixture derives ${sixSlots.length} queue slots, not 6`);
    const svg = cardSvg({ patternId: "queue", slots: sixSlots, board: six, tokens: {} });
    ok(svg.includes("assembled from 6 slot(s)"), "the six-slot desc lost the derived count");
    ok(svg.includes("The card draws the first 5."), "the desc claims six slots over a five-row drawing (#194)");
    scanSvg(svg, "six-slot queue card");
    const five = placeWith(5);
    const svg5 = cardSvg({ patternId: "queue", slots: slotsFor("queue", five), board: five, tokens: {} });
    ok(!svg5.includes("The card draws the first"), "a card that draws everything claims a drop anyway");
  }

  // The clip boundary, which needs no attacker at all. clip() counts CODE POINTS, so an astral
  // character sitting exactly on a budget's cut must not be split into a lone surrogate — a lone
  // surrogate makes the whole document XML-invalid, which surfaces as a build card that silently
  // disappears and a downloaded file no viewer will open. One case per budget that can cut one:
  // the chip (20), the dashboard slot label (22), the place label (26), and #139's step body — its
  // label (28) and its detail (20, already swept). The step's position/total budgets (2) take
  // digits derived by the rules and can never carry an astral character, so they are swept anyway
  // rather than argued about.
  const hasLoneSurrogate = (s) => {
    for (let i = 0; i < s.length; i += 1) {
      const c = s.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff) {
        const next = s.charCodeAt(i + 1);
        if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
        i += 1;
      } else if (c >= 0xdc00 && c <= 0xdfff) return true;
    }
    return false;
  };
  for (const at of [1, 2, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]) {
    const label = `${"x".repeat(at)}\u{1F4CA} tail that runs past every budget`;
    const astral = { places: [{ id: "p1", label, affordances: [{ id: "p1a1", label }] }], connections: [] };
    const built = [
      boardSvg(astral),
      // Every card body, not a sample of them: each one has its own budgets, and #139 added two.
      ...Object.values(PATTERNS).map((p) => cardSvg({ patternId: p.id, slots: slotsFor(p.id, astral), board: astral, tokens: {} })),
      cardSvg({ patternId: null, slots: null, board: astral, tokens: {} }),
    ];
    for (const svg of built) {
      ok(!hasLoneSurrogate(svg), `an emoji at index ${at} was split into a lone surrogate`);
    }
    scanSvg(built[0], `astral@${at}`);
  }

  // The label path. A hostile place name appears exactly once, escaped, as text — once, because
  // boardSvg's <title> summarises the board rather than repeating a visitor string into it.
  const evil = structuredClone(BOARD_FOR.dashboard);
  evil.places[0].label = HOSTILE_LABEL;
  const evilSvg = boardSvg(evil);
  scanSvg(evilSvg, "hostile label");
  ok(!evilSvg.includes("<script"), "a hostile label injected a <script>");
  // The label's own "</text>" must be escaped, not sitting raw beside the real closing tags the
  // file legitimately has (scanSvg above already proved every one of those is balanced).
  ok(evilSvg.includes("&lt;/text&gt;"), "the hostile label's closing tag is not escaped");
  ok(!evilSvg.includes("</text><script"), "a hostile label closed the text element it was inside");
  ok((evilSvg.match(/&lt;script&gt;/g) || []).length === 1, "the hostile label should appear escaped exactly once");

  // #210's export, over THE SAME hostile fixtures the SVG templates just faced. It is a different
  // medium with the same rule — escape once, at the template — and the categories are what make it
  // interesting: `title` and every provenance string are TEXT and must be escaped; `slots[].html` is
  // already-serialized DOM and must NOT be, because escaping it twice is the exact bug
  // build-card.mjs's "escaped once" note exists about.
  {
    // The screens shape since #212 — and richer for it: the hostile label now ALSO travels through
    // a section heading and a nav anchor's text, two more places escape-once has to hold.
    const hostileScreens = [{
      name: HOSTILE_LABEL,
      type: "queue",
      slots: [{ html: "<div class=\"ds-metric-tile\"><p>real &amp; serialized</p></div>" }],
      nav: [{ label: HOSTILE_LABEL, target: 1 }],
    }];
    const out = exportHtml({
      title: HOSTILE_LABEL,
      css: ":root{--x:1}",
      inlineTokens: { ...HOSTILE_TOKENS, "--color-accent": "#b5179e" },
      screens: hostileScreens,
      meta: { patternLabel: HOSTILE_LABEL, screens: 1, places: 1, affordances: 2, connections: 0, packLabel: HOSTILE_LABEL, hasVisitorTokens: true },
    });

    // 1 · the hostile label reaches nothing executable, in any of the three places it is used.
    ok(!out.includes("<script"), "a hostile label or token opened a <script> in the export");
    ok(!out.includes("</text><script>"), "a hostile label survived unescaped into the export");
    ok(out.includes("&lt;/text&gt;&lt;script&gt;"), "the hostile label's markup is not escaped in the export");

    // 2 · escaped ONCE, not twice. The label carries one `&` per escaped `<`; a double pass turns
    //     `&lt;` into `&amp;lt;`, which the reader then sees literally in their own file.
    ok(!out.includes("&amp;lt;"), "the export escaped a text field TWICE — the reader sees &lt; in their document");
    //     The AMPERSAND gets its own case, and it is not padding: HOSTILE_LABEL carries no `&`, so
    //     deleting the `&` replacement from esc() left every assertion above green — the mutation
    //     sweep for this group found exactly that. A raw `&` in a text field is also the ordinary
    //     case, not the adversarial one: place labels really do read "Jobs & routes".
    const amp = exportHtml({ title: "Jobs & routes <b>", css: "", screens: hostileScreens, meta: {} });
    ok(amp.includes("<title>Jobs &amp; routes &lt;b&gt;</title>"),
      "the export did not escape a bare ampersand in a text field — the entity that follows it in the same string is then broken");
    //     …and the serialized markup was NOT escaped at all: it is the renderer's own output.
    ok(out.includes("<div class=\"ds-metric-tile\">"), "the export escaped renderComposition's serialized output, which is already DOM");
    ok(out.includes("real &amp; serialized"), "the export re-escaped an entity that was already in the serialized markup");

    // 3 · not one value vetTokens rejected reached the document, and the good one did. THIS IS THE
    //     ONE APPLICATION POINT working: the exporter has no escaping opinion of its own, it relies
    //     on VALUE_OK excluding `< > : ; { } " '` — which is exactly why a </style> breakout is
    //     impossible — and this asserts the reliance rather than the regex.
    const rejected = vetTokens(HOSTILE_TOKENS).rejected;
    ok(rejected.length > 0, "the hostile token fixture is no longer hostile — this case would pass on any implementation");
    for (const r of rejected) {
      ok(!out.includes(r.value), `the export emitted a token value vetTokens rejected: ${r.key}: ${r.value}`);
    }
    ok(out.includes("--color-accent:#b5179e;"), "the export dropped a legitimate visitor token value");

    // 4 · no unescaped </style> ANYWHERE except the three the document legitimately closes, and the
    //     tag counts balance. DOMParser is not available under Node, so this is structural.
    ok((out.match(/<style>/g) || []).length === 3 && (out.match(/<\/style>/g) || []).length === 3,
      "the export's <style> blocks do not balance — a value broke out of one, or one was dropped");
    for (const tag of ["html", "head", "body", "footer", "main"]) {
      ok((out.match(new RegExp(`<${tag}[ >]`, "g")) || []).length === (out.match(new RegExp(`</${tag}>`, "g")) || []).length,
        `the export's <${tag}> elements do not balance`);
    }

    // 5 · an over-long label is carried whole rather than clipped into a lone surrogate. The export
    //     is HTML with no character budgets — clip() is the SVG templates' problem, not this one —
    //     so what matters is that the file stays valid text.
    const longLabel = `${"x".repeat(4000)}\u{1F4CA}`;
    const long = exportHtml({ title: longLabel, css: "", screens: hostileScreens, meta: { places: 0 } });
    ok(!hasLoneSurrogate(long), "the export split an astral character into a lone surrogate");
    ok(long.includes(longLabel), "the export clipped a long title — an HTML document has no such budget");

    // 6 · a token map vetTokens rejects WHOLE still produces a document, with an empty :root block.
    //     Built by FILTERING the hostile fixture through vetTokens rather than by hand, because
    //     HOSTILE_TOKENS is not wholly hostile — `var(--color-accent)` is a legitimate value the
    //     committed packs really use, and group 7 asserts it is accepted. A hand-listed "all bad"
    //     map would drift away from that the day either list moved.
    const wholly = Object.fromEntries(vetTokens(HOSTILE_TOKENS).rejected.map((r) => [r.key, r.value]));
    ok(Object.keys(vetTokens(wholly).tokens).length === 0,
      "the wholly-rejected fixture is not wholly rejected — this case would pass on any implementation");
    const allBad = exportHtml({ title: "t", css: "", inlineTokens: wholly, screens: hostileScreens, meta: {} });
    ok(allBad.includes("<style>:root{}</style>"), "a wholly-rejected token map did not leave the :root block empty");
    ok(allBad.includes("ds-metric-tile"), "a wholly-rejected token map took the components down with it");
  }

  group("artifacts", `${svgs.length} SVG templates well-formed · hostile tokens fall back · label escaped once · no card or spec claims "not in the library" · #210's HTML export over the same hostile fixtures: label escaped exactly once in all three uses, the renderer's serialized output NOT re-escaped, no vetTokens-rejected value emitted, <style> and five element pairs balanced, an astral title carried whole, and a wholly-rejected token map leaving an empty :root rather than taking the components with it`);
}

// --- 7 · the vetting invariant ----------------------------------------------------------------------

{
  // Crude on purpose, and that is the point: build-import.mjs's applyToStage is the ONE place a
  // /build token value reaches the DOM, and it vets its own argument rather than trusting its four
  // callers. This fails loudly the day someone adds a second write.
  //
  // Scoped across ALL the /build modules, not just build-import.mjs. The prose claim is repo-wide
  // ("the only place a /build token value reaches an inline style"), so a check that only counted
  // one file would have stayed green the day a second write appeared in build-keep.mjs or
  // pattern-render.mjs — a gap an adversarial review of PR #145 named explicitly.
  //
  // studio-canvas.mjs (#204) joins the list with NO exception argued, which is the whole reason its
  // zoom is a level table selected by an attribute rather than a scale written to an element: it
  // makes zero inline-style writes, so `writes === 1` below stays literally true and the
  // `file === "build-import.mjs"` assertion is never reached for it. Every exception is a sentence
  // a future reader has to trust.
  //
  // studio-verbs.mjs (#205) joins on the same terms, and it is the more interesting case because it
  // MOVES things: a move is two attribute writes, and the undo/redo travel is element.animate(),
  // which never touches .style at all. Neither form is an exception being argued — the regex below
  // simply has nothing to count. What this therefore guards for that module is the REPLACEMENT
  // shape: someone later swapping the FLIP for `node.style.transform = …`. The claim that the
  // running page carries no inline style is a different check with a different owner
  // (tooling/studio-journey.mjs's `inlineStyled`, asserted after a drag, an undo and a redo).
  //
  // studio-compile.mjs (#207) joins on the same terms, and its crossfade is the shape this check is
  // for: a fade is the one effect an implementer reaches for `.style.opacity` to write, and it uses
  // element.animate() instead — which touches no inline style at all, so the regex below has
  // nothing to count for it either. No exception is argued for it.
  //
  // replay-driver.mjs (#209) joins on the same terms. It is the module with the most reason to want
  // an exception — it draws a run in front of the reader over fourteen seconds — and it takes none:
  // the chrome is classes in system/studio.css, the blocks are studio.mjs's placeBlock, and the one
  // thing that moves is the seek input's own value. What this guards for it is the same REPLACEMENT
  // shape: a later implementer reaching for `.style.width` to draw a progress bar.
  //
  // studio.mjs (#206) joins on the same terms, and it is the module with the most opportunity to
  // break them: it is the one that mounts Act 0's stage on a public route and builds a block per
  // board place from labels the reader can eventually author. It writes zero inline styles (layout
  // is classes and data-* resolved in system/studio.css) and builds every node element by element,
  // so neither assertion below has anything to count for it. No exception is argued, and the phrase
  // is literal: every exception in this file is a sentence a future reader has to trust.
  const MODULES = [
    "build-import.mjs", "build-keep.mjs", "build-card.mjs", "build-share.mjs",
    "build-questions.mjs", "breadboard.mjs", "pattern-render.mjs", "pattern-rules.mjs",
    "studio-canvas.mjs", "studio-verbs.mjs", "studio.mjs", "studio-compile.mjs",
    "replay-driver.mjs", "studio-export.mjs", "studio-keep.mjs", "studio-flow.mjs",
    "studio-method.mjs", "catalog.mjs", "studio-select.mjs", "studio-docs.mjs",
    // studio-frames.mjs (#219) joins on the same terms, and for it the terms are the DESIGN rather
    // than a property it happens to have: #176's drafted device frame resized by writing a px
    // --frame-w, and the reason this one resizes in GRID SPANS instead is precisely that a studio
    // module cannot write an inline style and keep `writes === 1` true. Leaving it off this list to
    // keep the px mechanism would have been the "check that skipped the thing it tested" failure
    // this repo has a memory about, so the mechanism changed and the list grew.
    "studio-frames.mjs",
    // studio-layers.mjs + studio-minimap.mjs (#221) join on the same terms. The layers list is
    // classes and attributes end to end; the minimap is the case this gate SHAPED — its viewport
    // rectangle is continuous geometry, drawn as SVG PRESENTATION ATTRIBUTES (setAttribute on x/y/
    // width/height) for exactly this gate's reason: a studio module cannot write an inline style
    // and keep `writes === 1` true — the #219 spans-not-px forcing function, third application.
    "studio-layers.mjs", "studio-minimap.mjs",
  ];
  // Counted: `.setProperty(`, a direct `.style.<name> =` assignment, and `.style.cssText =`. Until
  // #171 it matched only `.setProperty(`, which meant a direct `el.style.color = untrusted` was
  // never checked at all — the same shape of gap the paragraph above describes, in the check that
  // exists to close it.
  //
  // What it does NOT count, stated rather than implied (pr-189-review.md L2), because the next
  // person reading this has to know where the line is: a computed key (`el.style[k] = x`),
  // `Object.assign(el.style, o)`, `el.setAttribute("style", s)`, a compound assignment
  // (`.style.color += x` — the `[^=]` cannot reach past the `+`), and aliasing
  // (`const s = el.style; s.color = x`), which is out of reach for any regex-based check at all.
  // None of those forms occur in the eight modules below; this is a tripwire for the ordinary
  // shapes, not a proof of absence, and the vetting invariant it guards is argued in prose above.
  //
  // `view-transition-name` is the one documented exception, and it is not a value: breadboard.mjs
  // writes a transition GROUP IDENTITY built from a place id, which is /^p[0-9]{1,2}$/ coming out
  // of nextId and re-validated by build-share.mjs's PLACE_ID on any restored board, so no
  // visitor-supplied string can reach it. It also paints nothing at rest. Every other
  // view-transition name and class on the page is a constant in build.html's stylesheet.
  const STYLE_WRITE = /\.setProperty\(|\.style\.[A-Za-z]\w*\s*=[^=]/g;
  const ALLOWED_DIRECT = /\.style\.viewTransitionName\s*=[^=]/g;
  let writes = 0;
  for (const file of MODULES) {
    const src = readFileSync(join(ROOT, "system", file), "utf8");
    const allowed = (src.match(ALLOWED_DIRECT) || []).length;
    const calls = (src.match(STYLE_WRITE) || []).length - allowed;
    if (calls) ok(file === "build-import.mjs", `system/${file} writes an inline style; applyToStage is meant to be the only one`);
    ok(allowed === 0 || file === "breadboard.mjs",
      `system/${file} writes an inline view-transition-name; breadboard.mjs's per-place group id is meant to be the only one`);
    writes += calls;
    // No markup ever gets built from a string on this page: every node is created element by
    // element, and the two SVG paths go through DOMParser + importNode instead.
    //
    // Matched as member ACCESS (a leading dot), not as a bare word. Several of these modules
    // explain in prose why they do not use innerHTML, and a substring match reads those sentences
    // as violations — the same trap the .setProperty( check hit when its own header named the API.
    for (const sink of [".innerHTML", ".outerHTML", ".insertAdjacentHTML(", "document.write("]) {
      // catalog.mjs (#215) READS outerHTML — its HTML and vd-* tabs ARE serializations of a live
      // render, which is this ban's own recorded line: document SINKS are banned, and a
      // serialization is a read. The exception swaps the substring check for the sharper one: the
      // ASSIGNMENT form must stay impossible, checked rather than assumed.
      if (file === "catalog.mjs" && sink === ".outerHTML") {
        ok(!/\.outerHTML\s*=[^=]/.test(src), `system/${file} ASSIGNS .outerHTML — serialization is a read, never a sink`);
        continue;
      }
      ok(!src.includes(sink), `system/${file} uses ${sink}; /build builds every node element by element`);
    }
    // NO RAW C0 CONTROL BYTE IN THE SOURCE, and this is a check about the REPO's own tooling rather
    // than about the browser. replay-driver.mjs's place signature separates fields with U+0000 and
    // U+0001, and they were written as literal bytes: `rg` then reports "binary file matches" and
    // returns nothing, and plain `grep` matches nothing at all, SILENTLY — on the one file in the
    // studio whose header is a numbered list of "this file never does X" invariants. Written as
    // `\u0000` escapes, the runtime behaviour is byte-identical and the file is text again. Tab and
    // the two newline forms are the only control characters a source file has any business carrying
    // (PR #240 review, finding 5).
    const raw = src.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g);
    ok(!raw, `system/${file} carries ${raw && raw.length} raw control byte(s) — grep and rg go silent on it; write them as \\u escapes`);
  }
  ok(writes === 1, `the /build modules make ${writes} inline-style writes in total; the invariant is exactly 1`);

  const importSrc = readFileSync(join(ROOT, "system/build-import.mjs"), "utf8");
  ok(/function applyToStage\(tokens\) \{\s*\n\s*const vetted = vetTokens\(/.test(importSrc),
    "applyToStage no longer vets its own argument at the choke point");

  // pack-boot.js is a classic script and cannot import, so its value predicate is mirrored BY HAND
  // from pack-imported.mjs. The two must agree exactly, or a value refused on the scoped stage
  // still reaches :root site-wide before paint.
  //
  // Checked THREE ways, because the first version of this check only pinned the regex declarations
  // — and a mutation sweep proved that deleting the guard's USE (`|| VALUE_BAD.test(value)`) left
  // it green while the guard was entirely dead. Pinning a constant is not pinning a behaviour. The
  // same family of mistake as the tamper battery's colon-only url() case: a check that could not
  // fail for the reason it existed.
  const vetted = readFileSync(join(ROOT, "system/pack-imported.mjs"), "utf8");
  const boot = readFileSync(join(ROOT, "system/pack-boot.js"), "utf8");

  // 1. the literals exist, and the mirrored pair is byte-identical (not merely "both present" —
  //    widening one side only was the other mutation that slipped through).
  const literal = (src, name) => {
    const m = src.match(new RegExp(`(?:const|var)\\s+${name}\\s*=\\s*(/.*/[a-z]*)\\s*;`));
    return m ? m[1] : null;
  };
  for (const [a, b, what] of [["KEY_NAME", "NAME", "the key allowlist"], ["VALUE_OK", "VAL", "the value charset"], ["VALUE_BAD", "BAD", "the url()/protocol-relative guard"], ["VALUE_HUGE", "HUGE", "the magnitude guard"]]) {
    const left = literal(vetted, a);
    const right = literal(boot, b);
    ok(left !== null, `pack-imported.mjs no longer declares ${a}`);
    ok(right !== null, `pack-boot.js no longer declares ${b}`);
    ok(left !== null && left === right, `${what} has drifted: pack-imported.mjs ${a} is ${left}, pack-boot.js ${b} is ${right}`);
  }

  // 2. ...and each one is actually USED, in the condition that decides whether a value is applied.
  ok(vetted.includes("!VALUE_OK.test(value) || VALUE_BAD.test(value) || VALUE_HUGE.test(value)"),
    "pack-imported.mjs declares its guards but vetTokens no longer tests one of them — a guard is dead");
  ok(boot.includes("VAL.test(v) && !BAD.test(v) && !HUGE.test(v)"),
    "pack-boot.js declares its guards but the pre-paint loop no longer tests one — a guard is dead");

  // 3. the guard still refuses what it was written for, and still admits what the packs really use.
  //    A source-text check cannot prove behaviour; this runs the shipped function.
  for (const bad of ["url(//h/x.png)", "URL(//h/x.png)", "url (//h/x.png)", "image-set(//h/x.png)", "//h/x.png",
    "99999999px", "10000px", "0px 4px 99999px", "50000%"]) {
    const r = vetTokens({ "--color-bg": bad });
    ok(Object.keys(r.tokens).length === 0 && r.rejected.length === 1, `vetTokens accepted ${bad}`);
  }
  for (const [key, good] of [["--color-accent", "#2563eb"], ["--color-bg", "rgb(0 0 0 / 10%)"],
    ["--color-fg", "color-mix(in srgb, black 50%, transparent)"], ["--color-bg", "var(--color-white)"],
    ["--spacing-md", "16px"], ["--type-h1", "clamp(28px, 4vw, 44px)"], ["--shadow-md", "0px 4px 8px #00000014"],
    ["--spacing-lg", "9999px"], ["--type-h2", "100%"], ["--radius-md", "1.5rem"]]) {
    const r = vetTokens({ [key]: good });
    ok(Object.keys(r.tokens).length === 1, `vetTokens rejected the legitimate value ${key}: ${good}`);
  }

  group("vetting", `${writes} inline-style write across ${MODULES.length} modules (incl. the studio canvas, its verbs, its orchestrator, its compile beat, its replay driver and #210's exporter + keep rail — the exporter BUILDS a markup string and hands it to a Blob, which is why it joins on the same terms with no exception argued: the ban is on document SINKS, and serialization is a read) · no markup-from-string · pack-boot mirror intact`);
}

// --- 8 · the operator path's committed rules --------------------------------------------------------
//
// The same ten answers, a second committed rule set: in the browser they name a pattern
// (pattern-rules.mjs), and at build time they draft the QUESTION a real agent answers
// (portal/lib/builder.mjs). Everything below CALLS the function — several mutate an input first,
// because a check that cannot fail is the failure mode this file has met repeatedly.
//
// DEP-FREEDOM. The import of portal/lib/builder.mjs at the top of this file IS an assertion, and it
// is the one that can only pass in CI: there is no portal/node_modules there, so a static
// @anthropic-ai/claude-agent-sdk import anywhere in that module's graph fails this job outright.
// Do not "fix" a red job by installing portal deps in CI — that deletes the check. Locally the deps
// exist, so prove it the only way that works on your machine:
//   mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; \
//     mv portal/node_modules.off portal/node_modules

{
  const SUBJECT = "the Northwind wholesale-stock dashboard";
  const questionById = (id) => QUESTIONS.find((q) => q.id === id);
  const valuesOf = (id) => questionById(id).options.map((o) => o.value);

  // Coverage, DRIVEN BY THE SHIPPED CONFIG rather than a hand-list: a fifth `shape` option added in
  // build-questions.mjs fails here loudly, exactly as a new PATTERNS entry without a BOARD_FOR
  // fixture does. That is the property that keeps the two rule sets in step as the config grows.
  for (const value of valuesOf("shape")) {
    ok(Object.hasOwn(SHAPE_QUESTION, value), `rule 1 has no question for the shipped shape "${value}"`);
  }
  for (const value of valuesOf("action")) {
    ok(Object.hasOwn(ACTION_STANCE, value), `rule 2 has no stance for the shipped action "${value}"`);
  }

  // Four distinct, non-empty questions, each naming the subject and ending with the stance clause.
  // Drafted only over the shapes the coverage loop above just confirmed, so an uncovered option
  // reports as that one clean failure rather than crashing this group mid-way and taking every
  // assertion after it down with it — a gate that dies is a gate that stops checking.
  const covered = (id, table) => valuesOf(id).filter((v) => Object.hasOwn(table, v));
  const byShape = covered("shape", SHAPE_QUESTION).map((shape) => draftQuestion(answersWith({ shape, action: "check" }), SUBJECT));
  ok(new Set(byShape).size === byShape.length, `rule 1 drafted ${new Set(byShape).size} distinct questions for ${byShape.length} shapes`);
  for (const q of byShape) {
    ok(typeof q === "string" && q.trim().length > 0, "a drafted question is empty");
    ok(q.includes(SUBJECT), `a drafted question does not name the subject: ${q}`);
    ok(q.endsWith(`Answer it for someone who ${ACTION_STANCE.check}.`), `a drafted question does not end with rule 2's clause: ${q}`);
  }

  // Rule 2 is LOAD-BEARING: changing only `action` changes the drafted question.
  const byAction = covered("action", ACTION_STANCE).map((action) => draftQuestion(answersWith({ shape: "overview", action }), SUBJECT));
  ok(new Set(byAction).size === byAction.length, `rule 2 drafted ${new Set(byAction).size} distinct questions for ${byAction.length} actions`);

  // RULE 3 IS TRUE, and this is the assertion that keeps the drawer's claim honest: change each of
  // the OTHER EIGHT answers, one at a time, and the drafted question is byte-identical. A surface
  // implying all ten answers reach the agent would be the kind of sentence #139 deleted.
  const baseline = draftQuestion(DEFAULT_ANSWERS, SUBJECT);
  const others = QUESTIONS.map((q) => q.id).filter((id) => !QUESTION_INPUTS.includes(id));
  ok(others.length === 8, `expected 8 non-input answers, found ${others.length}`);
  for (const id of others) {
    for (const value of valuesOf(id)) {
      const drafted = draftQuestion(answersWith({ [id]: value }), SUBJECT);
      ok(drafted === baseline, `changing "${id}" to "${value}" changed the drafted question — rule 3 is false`);
    }
  }

  // ...and QUESTION_INPUTS names real ids, and exactly the ids proven load-bearing above.
  for (const id of QUESTION_INPUTS) ok(questionById(id) !== undefined, `QUESTION_INPUTS names "${id}", which is not one of the ten questions`);
  ok(QUESTION_INPUTS.length === 2 && QUESTION_INPUTS.includes("shape") && QUESTION_INPUTS.includes("action"),
    `QUESTION_INPUTS is ${QUESTION_INPUTS.join(",")}, but shape + action are the two the rules read`);

  // validateAnswers refuses, each message naming the offender. An unknown key is REFUSED rather
  // than ignored: it means the caller and build-questions.mjs disagree about the ten questions.
  const throws = (fn, needle, what) => {
    try { fn(); ok(false, `${what} was accepted`); }
    catch (e) { ok(e.message.includes(needle), `${what} threw "${e.message}", which does not name ${needle}`); }
  };
  const { nogos: _dropped, ...missingOne } = DEFAULT_ANSWERS;
  throws(() => validateAnswers(missingOne), "nogos", "a missing answer");
  throws(() => validateAnswers(answersWith({ shape: "nonsense" })), "shape", "an out-of-enum value");
  throws(() => validateAnswers({ ...DEFAULT_ANSWERS, surprise: "x" }), "surprise", "an unknown key");
  // Built through JSON.parse, not an object literal: `__proto__:` in a literal is the
  // prototype-setting SYNTAX and creates no own key at all, so a literal-based fixture here passes
  // whatever the code does — a check that cannot fail. JSON.parse defines a real own property, and
  // JSON.parse is also exactly what server.mjs's readBody hands this function.
  const protoBody = JSON.parse(`{"__proto__":"x",${JSON.stringify(DEFAULT_ANSWERS).slice(1)}`);
  ok(Object.hasOwn(protoBody, "__proto__"), "the __proto__ fixture carries no own key — it proves nothing");
  throws(() => validateAnswers(protoBody), "questions", "a __proto__ key");
  // ...and an id that is only INHERITED is still missing. No own "__proto__" key here, so the
  // unknown-key branch above cannot answer this one for it: the object carries nine own answers and
  // gets the tenth from its prototype. It fails only if the read is Object.hasOwn(raw, id) rather
  // than `raw[id] !== undefined`, which is the distinction being checked.
  throws(() => validateAnswers(Object.assign(Object.create({ nogos: "none" }), missingOne)), "is missing", "an inherited answer");
  throws(() => validateAnswers("not an object"), "object", "a non-object");
  throws(() => validateAnswers(null), "object", "null");
  throws(() => validateAnswers([]), "object", "an array");

  // THE PRIVACY REFUSAL, at the function level with an IN-MEMORY head — no fake package is ever
  // written to disk. It demands `fictional === true`, so a head with the key missing refuses too.
  throws(() => assertFictional({ fictional: false }, "acme"), "scenarios/README.md", "a fictional:false head");
  throws(() => assertFictional({ name: "Acme" }, "acme"), "scenarios/README.md", "a head with no fictional key");
  throws(() => assertFictional(null, "acme"), "scenarios/README.md", "a missing head");
  ok(assertFictional({ fictional: true }, "northwind").fictional === true, "a fictional:true head was refused");

  // ...and the same refusal ON THE RUN PATH, not only the preview. /api/build/draft and
  // /api/build/run are separate routes, so a guard proven only on draftRun is a claim about a
  // function nobody has to call. No package in this repo says fictional:false (and writing one
  // would be a fake), so the run-path property is proven with the other refusal readScenario
  // raises — verdant, which has no compose.json. The DISCRIMINATOR is the message: it must name
  // the boundary, NOT "Cannot find package '@anthropic-ai/claude-agent-sdk'". That is what proves
  // the guard fired BEFORE the SDK was ever reached, and it is only meaningful in the dep-free
  // environment above — i.e. in CI, or under the node_modules.off dance.
  ok(listScenarios().some((s) => s.slug === "verdant" && !s.composable && s.reason.includes("compose.json")),
    "listScenarios no longer reports verdant as non-composable with its own refusal message");
  ok(listScenarios().every((s) => typeof s.name === "string" && s.name.length > 0),
    "a scenario was listed with no name");
  let runRefusal = null;
  try {
    await runBuild({ scenario: "verdant", answers: DEFAULT_ANSWERS, question: "x", slot: "summary-strip", slug: "gate-probe", dry: true });
  } catch (e) { runRefusal = e.message; }
  ok(runRefusal !== null, "runBuild started a run for a package with no compose.json");
  ok(runRefusal?.includes("compose.json"), `runBuild's refusal was "${runRefusal}", which does not name compose.json`);
  ok(isRunInFlight() === false, "a refused run left the run lock held");

  // `force` CANNOT BE SET FROM A CALLER, and this is the assertion that keeps it that way. In the
  // runner, force skips the "traces/<slug>.raw.jsonl exists" throw; past that throw a committed
  // proposal is rmSync'd and the committed raw trace is truncated to zero bytes BEFORE the SDK
  // query, so it lands even if the run then dies on auth. server.mjs POSTs into runBuild, so a
  // `{ ...body }` spread there — or a `force` back in the destructure here — would put that path
  // one HTTP body away. runOptions is checked rather than runBuild because it is PURE: calling
  // runBuild with force:true to watch it get dropped would be safe only while green, and on a
  // regression the gate itself would delete the committed proposal and start a paid run.
  const RUN_INPUT = {
    scenario: "northwind", answers: DEFAULT_ANSWERS, question: "What is the state of things?",
    slot: "insight-panel", slug: "gate-probe-options", dry: true,
  };
  ok(runOptions(RUN_INPUT).force === false, "runOptions did not pin force to false");
  for (const hostile of [true, 1, "yes", "false", {}]) {
    const opts = runOptions({ ...RUN_INPUT, force: hostile });
    ok(opts.force === false, `a caller-supplied force ${JSON.stringify(hostile)} survived into the run options`);
  }
  // ...and the option set is EXACTLY what the runner takes, so a parameter added to runComposition
  // later cannot start being caller-settable by being quietly forwarded. onStep is excluded on
  // purpose: runBuild adds the hook, and a hook is not data an HTTP body supplies.
  const RUN_OPTION_KEYS = ["scenario", "question", "slot", "slug", "isDry", "force"];
  ok(JSON.stringify(Object.keys(runOptions(RUN_INPUT)).sort()) === JSON.stringify([...RUN_OPTION_KEYS].sort()),
    `runOptions returned keys [${Object.keys(runOptions(RUN_INPUT)).join(",")}], expected [${RUN_OPTION_KEYS.join(",")}]`);
  // Every guard runs INSIDE runOptions, so the split did not leave runBuild guarding a path
  // runOptions has already returned from.
  throws(() => runOptions({ ...RUN_INPUT, slug: "../escape" }), "slug", "runOptions with a traversing slug");
  throws(() => runOptions({ ...RUN_INPUT, slot: "nonsense" }), "slot", "runOptions with an unknown slot");
  throws(() => runOptions({ ...RUN_INPUT, question: "   " }), "question", "runOptions with a blank question");
  throws(() => runOptions({ ...RUN_INPUT, answers: { ...DEFAULT_ANSWERS, shape: "nonsense" } }), "shape", "runOptions with an out-of-enum answer");
  ok(runOptions({ ...RUN_INPUT, dry: false }).isDry === false && runOptions(RUN_INPUT).isDry === true,
    "runOptions did not carry `dry` through to isDry");
  // ...and runBuild STILL ROUTES THROUGH IT. Every assertion above is about runOptions, and all of
  // them stay green if someone re-adds a `force` parameter to runBuild and hands it to
  // runComposition directly — the check would be testing the seam and not the caller, which is the
  // exact failure mode being fixed here. runBuild's whole body is runOptions + the lock + the run,
  // so `force` has no business appearing anywhere in it, param or not. Read off the LIVE function
  // object rather than the file: this is the function the route actually calls, and the repo has no
  // build step, so the source is the source. `runBuild.length` would be the tempting check and it
  // is a vacuous one — a destructured object parameter counts as 1 however many keys it names.
  ok(!/force/.test(runBuild.toString()),
    `runBuild names \`force\` in its own body — it must reach runComposition only through runOptions:\n${runBuild.toString()}`);
  ok(/runOptions\(/.test(runBuild.toString()), "runBuild no longer calls runOptions — its guards may have been inlined past the force pin");

  // The contract guards. Both values reach a filesystem path and both now arrive from an HTTP body.
  for (const bad of ["../escape", "/etc/passwd", "a/b", "", "Northwind", "a".repeat(41), null, undefined, 7]) {
    throws(() => assertScenarioSlug(bad), "scenario", `scenario slug ${JSON.stringify(bad)}`);
  }
  ok(assertScenarioSlug("northwind") === "northwind", "a legitimate scenario slug was refused");
  for (const bad of ["../escape", "a/b", "", "A-Slug", "a".repeat(49), null, undefined, 7]) {
    throws(() => assertRunSlug(bad), "slug", `run slug ${JSON.stringify(bad)}`);
  }
  ok(assertRunSlug("a".repeat(48)) !== undefined, "a 48-character run slug was refused");

  // SLUGS CANNOT COLLIDE ACROSS SCENARIOS. The drafted question is deterministic from ten enum
  // answers, so two scenarios sharing a `shape` produce byte-identical question text — and
  // slugify() alone would map them to ONE file in the FLAT traces/ namespace. The cross product is
  // what actually closes that, so the cross product is what is checked.
  const slugs = [];
  for (const s of listScenarios()) {
    for (const shape of valuesOf("shape")) {
      const slug = slugFor(s.slug, answersWith({ shape }), "insight-panel");
      ok(slug.startsWith(s.slug), `slugFor("${s.slug}", …) produced "${slug}", which is not scenario-prefixed`);
      assertRunSlug(slug); // throws (naming the offender) if the composed slug is not path-safe
      slugs.push(slug);
    }
  }
  ok(new Set(slugs).size === slugs.length, `slugFor produced ${new Set(slugs).size} distinct slugs across ${slugs.length} scenario × shape pairs`);

  // stepEvent is a WHITELIST, asserted as an exact key set so a field added to the recorder later
  // cannot start streaming by default. The fixture carries everything a real step line can carry.
  const fatStep = {
    type: "step", seq: 12, ts: "2026-07-27T00:00:00.000Z", phase: "implement", kind: "tool",
    tool: "Write", ok: true, denied: false, artifact: { path: "proto/compositions/northwind/x.json" },
    response: "R".repeat(5000), input: { file_path: "/Users/someone/.env", content: "sk-ant-SECRET" },
    toolUseId: "toolu_01ABC", responseTruncated: true, someFutureField: "must not stream",
  };
  const projected = stepEvent(fatStep);
  const EXPECTED_KEYS = ["type", "phase", "kind", "tool", "ok", "denied", "artifact", "text"];
  ok(JSON.stringify(Object.keys(projected).sort()) === JSON.stringify([...EXPECTED_KEYS].sort()),
    `stepEvent returned keys [${Object.keys(projected).join(",")}], expected [${EXPECTED_KEYS.join(",")}]`);
  const serialised = JSON.stringify(projected);
  for (const leak of ["RRRR", "sk-ant-SECRET", ".env", "toolu_01ABC", "must not stream"]) {
    ok(!serialised.includes(leak), `stepEvent leaked ${leak} into the SSE payload`);
  }
  ok(projected.artifact === "proto/compositions/northwind/x.json", "stepEvent dropped the artifact path");

  // ...and text is truncated to exactly STEP_EVENT_TEXT_MAX.
  const long = stepEvent({ type: "step", kind: "text", text: "t".repeat(STEP_EVENT_TEXT_MAX + 500) });
  ok(long.text.length === STEP_EVENT_TEXT_MAX, `stepEvent returned ${long.text.length} chars of text, expected ${STEP_EVENT_TEXT_MAX}`);
  ok(stepEvent({ type: "step", kind: "tool", tool: "Read" }).text === null, "stepEvent invented text for a step that carries none");

  // The NON-STEP lines are dropped. The meta line is the first thing write() emits and it carries
  // `cwd` — an absolute home-dir path — so returning it would put the operator's home directory on
  // the wire on every single run.
  ok(stepEvent({ type: "meta", version: 1, slug: "x", cwd: "/Users/someone/repo", sessionId: "abc" }) === null,
    "stepEvent did not drop the meta line (it carries cwd + sessionId)");
  ok(stepEvent({ type: "result", ok: true, totalCostUsd: 0.9 }) === null, "stepEvent did not drop the result line");
  ok(stepEvent(null) === null && stepEvent(undefined) === null, "stepEvent did not drop an empty line");

  // withRunLock REFUSES the second caller rather than queueing it: a queued run would spend real
  // tokens the operator did not knowingly ask for twice. This runs with no SDK, which is exactly
  // why the lock is exported rather than inline inside runBuild.
  let release;
  const held = new Promise((r) => { release = r; });
  const first = withRunLock(() => held);
  ok(isRunInFlight() === true, "withRunLock did not report the first run as in flight");
  let second = null;
  try { await withRunLock(async () => "second"); } catch (e) { second = e.message; }
  ok(second?.includes("already in flight"), `the second caller got "${second}", expected an "already in flight" refusal`);
  release("first");
  ok((await first) === "first", "withRunLock did not return the first call's value");
  ok(isRunInFlight() === false, "the lock stayed held after the first run resolved");
  // Each subsequent acquire is CAUGHT rather than awaited bare: a lock that failed to release
  // rejects here, and an uncaught rejection would kill this group before group() reports — the
  // gate would go red with a stack trace instead of naming which invariant broke.
  const acquire = async (label) => {
    try { return await withRunLock(async () => label); }
    catch (e) { return `refused: ${e.message}`; }
  };
  ok((await acquire("third")) === "third", "a third run was refused after the lock released");

  // ...INCLUDING the finally path: a run that THROWS must still release, or one failed run wedges
  // the portal until it is restarted.
  let threw = false;
  try { await withRunLock(async () => { throw new Error("boom"); }); } catch { threw = true; }
  ok(threw, "withRunLock swallowed the callback's throw");
  ok(isRunInFlight() === false, "the lock stayed held after the callback threw — the finally path is broken");
  ok((await acquire("fourth")) === "fourth", "a run was refused after a throwing run should have released the lock");

  group("operator-path", `3 rules over ${QUESTIONS.length} answers · 8 non-inputs inert · ${slugs.length} slugs distinct · stepEvent whitelist · run lock`);
}

// --- 9 · the portal's origin guard --------------------------------------------------------------
// SCOPE, stated plainly because the alternative is a check that cannot fail: this proves the
// PREDICATE, not the WIRING. server.mjs imports chat.mjs → the Agent SDK, so CI (no
// portal/node_modules, group 8's whole point) can never boot the server; nothing here can observe
// that the guard is CALLED. That is proven by driving the running portal, recorded in
// .claude/reports/portal-origin-guard-report.md, and it has to be re-driven if the handler is
// restructured.
//
// What this group is for is the trap the ticket names: the guard has to accept BOTH loopback
// origins, and it has to reject the near-misses of the ones it accepts. Both halves are string
// matching, which is exactly what rots when a port or a host is added.
{
  const PORT = 4747;
  const allowed = allowedOrigins(PORT);
  ok(allowed.length === 2, `allowedOrigins returned ${allowed.length} origins, expected localhost and 127.0.0.1`);

  // Both, or the drawer breaks for whichever host the operator typed.
  for (const origin of [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`])
    ok(originAllowed(origin, PORT), `${origin} was refused — the portal's own pages cannot POST`);

  // No Origin is not a browser cross-origin request: curl, the runbook's commands, every
  // same-origin GET.
  for (const absent of [undefined, null, ""])
    ok(originAllowed(absent, PORT), `an absent Origin (${JSON.stringify(absent)}) was refused — the runbook's curl commands would break`);

  // Every one of these reaches the handler in a real browser. Prefix and suffix cases are why the
  // match is ===: three of them START with an allowed origin.
  const hostile = [
    "null",                                  // sandboxed iframe, file:// page
    "http://evil.com",
    "https://evil.com",
    `http://localhost:${PORT}.evil.com`,     // suffix — starts with an allowed origin
    `http://localhost:${PORT}0`,             // port 47470 — also a prefix match
    `http://localhost:${PORT}/`,             // trailing slash — a real Origin never has one
    `http://localhost:${PORT}#`,
    `https://localhost:${PORT}`,             // scheme: the portal is http only
    `http://LOCALHOST:${PORT}`,              // case: browsers send the host lowercased
    `http://127.0.0.2:${PORT}`,
    `http://localhost:${PORT + 1}`,
    "http://localhost",                      // port 80
    `http://user@localhost:${PORT}`,
    `http://localhost:${PORT}, http://evil.com`, // duplicate header, joined by node
    ` http://localhost:${PORT}`,
    `http://localhost:${PORT} `,
  ];
  for (const origin of hostile)
    ok(!originAllowed(origin, PORT), `"${origin}" was ALLOWED — a page at that origin can drive the portal`);

  // The port is a parameter, not a baked constant: PORT is settable from portal/.env, and a guard
  // that only knows 4747 refuses the operator's own pages on any other port.
  ok(originAllowed("http://localhost:8080", 8080), "the guard ignored a non-default PORT — the portal's own pages break when PORT is set");
  ok(!originAllowed(`http://localhost:${PORT}`, 8080), "the guard allowed the default port while running on another");

  group("origin", `${allowed.length} loopback origins accepted · 3 absent forms pass · ${hostile.length} hostile origins refused · port is a parameter`);
}

// --- 10 · /build's two virtual-route analytics events -------------------------------------------
// Same split as group 9, and stated for the same reason: this proves the PREDICATE, not the WIRING.
// Nothing here can observe that trackBuildPattern() sits on renderPattern's success path rather
// than on the settled-state flag four non-rendering branches also set — that needs a running page,
// and it is tooling/build-journey.mjs check [17b], on all three engines.
//
// What this group is for is the pair of traps the ticket names. First, the LAUNCH trap: this very
// file imports build-keep.mjs and pattern-render.mjs, both of which import analytics.mjs (#149), so
// CI's verify job evaluates it under Node — where it survives today only because BEACON_TOKEN is ""
// and && short-circuits before `location`. Filling the token would break this job on launch day, so
// the module is imported here with BOTH constants filled, which is the only way that failure is
// visible before it happens. Second, the PAYLOAD trap: a virtual route IS the whole payload, and
// /build's promise is that nothing about the visitor's build leaves the browser — so the pushed
// paths are asserted against a location.search that is carrying a real ?b= payload.
{
  // 1 · the launch mutation, asserted before anything is concluded from it. Without this the group
  //     would silently be re-testing the empty-token file the other nine groups already import.
  const src = readFileSync(join(ROOT, "system/analytics.mjs"), "utf8");
  const mutated = src
    .replace('const BEACON_TOKEN = "";', 'const BEACON_TOKEN = "g10-public-token";')
    .replace('const PRODUCTION_HOST = "";', 'const PRODUCTION_HOST = "example.com";');
  ok(mutated !== src && !mutated.includes('BEACON_TOKEN = ""') && !mutated.includes('PRODUCTION_HOST = ""'),
    "the filled-token mutation did not land — the constants were renamed or reformatted, so this group is testing nothing");

  // 2 · imported while globalThis.location is STILL UNDEFINED. Order is load-bearing: defining the
  //     stubs first would mask a missing guard, because location.hostname would resolve.
  let bootErr = null;
  try { await import(`data:text/javascript,${encodeURIComponent(mutated)}`); } catch (err) { bootErr = err; }
  ok(!bootErr, `analytics.mjs throws under Node once the token is filled (${bootErr && bootErr.message}) — filling BEACON_TOKEN at launch would break this job at import, because build-keep.mjs and pattern-render.mjs import that module and this file imports both`);

  // 3 · the stubs. This location MOVES when history does, which is the whole reason the hash cases
  //     below say anything: the flip's window exists precisely because pushState replaces the
  //     pathname, query AND hash, and a stub that only recorded would make every one of them
  //     vacuous — the URL would never leave the state the assertion is checking for.
  const PAYLOAD = "eNqrVkrOL0pVslJQMlTSUcpMUbIy1FFKzs8rSc0rUdJRykxRsjLSUUrOzytJzStR0lHKTFGyMtZRAgArEw0k";
  const REAL = `/build.html?b=${PAYLOAD}`;
  let pushes = [];
  let restores = [];
  const moveTo = (url) => {
    const parsed = new URL(String(url), "https://build.test");
    globalThis.location.pathname = parsed.pathname;
    globalThis.location.search = parsed.search;
    globalThis.location.hash = parsed.hash;
  };
  const stub = (start) => {
    pushes = [];
    restores = [];
    globalThis.location = { ...start };
    globalThis.history = {
      state: null,
      pushState: (s, t, url) => { pushes.push(String(url)); moveTo(url); },
      replaceState: (s, t, url) => { restores.push(String(url)); moveTo(url); },
    };
  };
  // Comfortably past RESTORE_DELAY_MS rather than at it, so none of this is a timing race.
  const pastWindow = () => new Promise((r) => setTimeout(r, 200));
  const ANA = pathToFileURL(join(ROOT, "system/analytics.mjs")).href;

  // 4 · A · the ordinary contract, on a URL carrying a real ?b= build. The `?g10a` is not
  //     decoration: this file's own imports already pulled analytics.mjs in transitively, so
  //     without a fresh key this would inherit whatever fire-once state the process had spent.
  //     Each event gets its OWN window here, so that this case stays about the ordinary contract.
  //     The overlap is not hypothetical and is no longer waved off — this comment used to call it
  //     "an ordering no page produces", and a real drive falsified that (a copy click DOES land
  //     within 50ms of Act 4 rendering, because the click's own scroll is what starts the
  //     vocabulary fetch). It has its own scenario, case D.
  stub({ pathname: "/build.html", search: `?b=${PAYLOAD}`, hash: "" });
  const anaA = await import(`${ANA}?g10a`);
  ok(typeof anaA.trackBuildPattern === "function" && typeof anaA.trackBuildShared === "function",
    "analytics.mjs does not export both /build trackers — pattern-render.mjs and build-keep.mjs import them by name");

  if (typeof anaA.trackBuildPattern === "function" && typeof anaA.trackBuildShared === "function") {
    anaA.trackBuildPattern(); // twice each: a shared flag would let whichever fired first suppress
    anaA.trackBuildPattern(); // the other, which is why every event owns its guard
    await pastWindow();
    anaA.trackBuildShared();
    anaA.trackBuildShared();
    await pastWindow();
    ok(pushes.length === 2, `${pushes.length} virtual routes pushed, expected exactly 2 — a fire-once guard is missing or shared between the two events`);
    ok(pushes[0] === "/build/pattern", `the pattern event pushed "${pushes[0]}", not the literal /build/pattern`);
    ok(pushes[1] === "/build/shared", `the share event pushed "${pushes[1]}", not the literal /build/shared`);
    for (const p of pushes) {
      ok(/^\/build\/[a-z]+$/.test(p), `"${p}" is not a bare static path — a virtual route is the entire payload, so it carries no query, hash or id`);
      ok(!p.includes(PAYLOAD), `"${p}" carries the visitor's ?b= build payload into the analytics path`);
    }
    ok(restores.length === 2, `${restores.length} restores, expected 2 — a virtual path left in the address bar breaks refresh and bookmarking`);
    ok(restores.every((u) => u === REAL), `the URL was not restored verbatim: ${JSON.stringify(restores)} — the ?b= build must survive the flip`);
  }

  // 5 · B · the reader who ARRIVED with a hash and touched nothing. The snapshot is what has to come
  //     back here, and it is the case flipTo's live-hash fallback could regress, so it gets its own
  //     scenario rather than being assumed from A.
  stub({ pathname: "/build.html", search: `?b=${PAYLOAD}`, hash: "#appearance" });
  const anaB = await import(`${ANA}?g10b`);
  anaB.trackBuildPattern();
  await pastWindow();
  ok(restores.length === 1 && restores[0] === `${REAL}#appearance`,
    `a hash the reader arrived with was not restored: ${JSON.stringify(restores)} — they land somewhere they never navigated to`);

  // 6 · C · the collision itself: the appearance dock opened INSIDE the window. pushState carries no
  //     hash, so for RESTORE_DELAY_MS location.hash is "" — and restoring the snapshot over an
  //     #appearance written in that window leaves the dock open with nothing for its Escape handler
  //     to match (dock.mjs:455). Reproduced on all three engines before flipTo took the hash live;
  //     build-journey [17b] drives the same collision against a real dock.
  stub({ pathname: "/build.html", search: `?b=${PAYLOAD}`, hash: "" });
  const anaC = await import(`${ANA}?g10c`);
  anaC.trackBuildPattern();
  ok(globalThis.location.pathname === "/build/pattern" && globalThis.location.search === "" && globalThis.location.hash === "",
    "the stub did not follow the push, so the window this case is about does not exist in it — the assertion below would pass on any implementation");
  globalThis.location.hash = "#appearance"; // the dock toggle, inside the window
  await pastWindow();
  ok(restores.length === 1 && restores[0] === `${REAL}#appearance`,
    `a hash written inside the flip window was dropped by the restore: ${JSON.stringify(restores)} — the appearance dock is left open with no way to close it from the keyboard`);

  // 7 · D · two flips OVERLAPPING, which is the case A comment's claim turned into a scenario. The
  //     second flip reads location to snapshot it and finds the FIRST one's virtual path; restoring
  //     THAT is the page's last write, so the reader keeps /build/shared in the address bar and it
  //     404s on reload, bookmark and forward. Reproduced on the real page before the shared snapshot
  //     existed — 4 of 4 chromium runs — and driven there by build-journey [17c].
  stub({ pathname: "/build.html", search: `?b=${PAYLOAD}`, hash: "" });
  const anaD = await import(`${ANA}?g10d`);
  anaD.trackBuildPattern();
  ok(globalThis.location.pathname === "/build/pattern",
    "the stub did not follow the first push, so the overlap this case is about does not exist in it — the assertions below would pass on any implementation");
  anaD.trackBuildShared(); // inside the first window, by construction
  ok(globalThis.location.pathname === "/build/shared",
    "the stub did not follow the second push, so the two windows are not actually overlapping here");
  await pastWindow();
  ok(restores.length === 2 && restores.every((u) => u === REAL),
    `an overlapping flip restored to a VIRTUAL path: ${JSON.stringify(restores)} — whichever restore lands last is where the reader is left, and /build/shared 404s`);
  ok(globalThis.location.pathname === "/build.html" && globalThis.location.search === `?b=${PAYLOAD}`,
    `the page settled on ${globalThis.location.pathname}${globalThis.location.search} instead of the real URL — a reload from here is a 404 and the ?b= build is gone`);

  // 8 · E · the OTHER ordering, and the one that makes case D's rule a path test rather than an
  //     "is a window open" test. build-keep's copy handler writes the REAL link from inside the
  //     window — it owns its base, so what it writes is correct — and firefox and webkit sequence
  //     the copy click and the pattern render the opposite way from chromium. A flip that refused
  //     that write and reused the older snapshot would restore the reader to the URL from BEFORE
  //     the copy, wiping the ?b= out of the address bar on the click that promises it is there.
  stub({ pathname: "/build.html", search: "", hash: "" });
  const anaE = await import(`${ANA}?g10e`);
  anaE.trackBuildPattern(); // window opens over a URL with no ?b= yet
  moveTo(REAL);             // the copy handler's replaceUrl, landing inside that window
  ok(globalThis.location.search === `?b=${PAYLOAD}`,
    "the stub did not take the mid-window write, so this case cannot tell the two rules apart");
  anaE.trackBuildShared();  // must snapshot the REAL url just written, not reuse the stale one
  await pastWindow();
  ok(restores.length === 2 && restores[restores.length - 1] === REAL,
    `a real URL written inside the window was discarded: ${JSON.stringify(restores)} — the visitor is left without the ?b= the copy button just promised was in their address bar`);

  // 9 · F · /factory's take-over route (#209), on a URL carrying a hash this page really supports:
  //     #shape is one of the four inspector panels system/studio.mjs deep-links (:134-139) and
  //     system/palette.mjs registers a ⌘K command against, so a reader sitting on it is an ordinary
  //     visitor rather than a contrived one. Same three claims as every path above — static literal,
  //     no payload, fires once — plus the restore, hash included.
  //
  //     THE WIRING IS NOT PROVEN HERE, and this group says so the way groups 9, 11 and 13 do: that
  //     trackFactoryTookOver() sits on replay-driver.mjs's HANDOVER success path, and never fires on
  //     a canvas the replay failed to build, is a running-page fact. Its owner is
  //     tooling/studio-journey.mjs's replay pass, on all three engines.
  const FACTORY_REAL = "/factory.html#shape";
  stub({ pathname: "/factory.html", search: "", hash: "#shape" });
  const anaF = await import(`${ANA}?g10f`);
  ok(typeof anaF.trackFactoryTookOver === "function",
    "analytics.mjs does not export trackFactoryTookOver — system/replay-driver.mjs imports it by name");
  if (typeof anaF.trackFactoryTookOver === "function") {
    anaF.trackFactoryTookOver(); // twice: a shared flag would let another event suppress this one
    anaF.trackFactoryTookOver();
    ok(pushes.length === 1, `${pushes.length} virtual routes pushed for one take-over, expected exactly 1 — the fire-once guard is missing or shared`);
    ok(pushes[0] === "/factory/took-over", `the take-over event pushed "${pushes[0]}", not the literal /factory/took-over`);
    ok(/^\/factory\/[a-z-]+$/.test(pushes[0] || ""), `"${pushes[0]}" is not a bare static path — a virtual route is the entire payload, so it carries no slug, seq or board`);
    ok(!(pushes[0] || "").includes("?") && !(pushes[0] || "").includes("#"), `"${pushes[0]}" carries a query or a hash`);
    await pastWindow();
    ok(restores.length === 1 && restores[0] === FACTORY_REAL,
      `the real URL was not restored verbatim: ${JSON.stringify(restores)} — the reader lands on a path that 404s on reload, and loses the panel they deep-linked to`);
  }

  // 10 · G · the OVERLAP on /factory, in both orderings. #210 is about to put two more routes on
  //      this page, so the case flipTo exists for is reachable here for the same reason it is on
  //      /build: whichever restore lands last is where the reader is left, and /factory/took-over
  //      404s. Driven against trackBuildPattern because it is the other flipTo caller — the module
  //      has one window mechanism, not one per page.
  for (const [first, second, label] of [["took-over", "pattern", "take-over first"], ["pattern", "took-over", "pattern first"]]) {
    stub({ pathname: "/factory.html", search: "", hash: "" });
    const g = await import(`${ANA}?g10g-${first}`);
    const call = (which) => (which === "took-over" ? g.trackFactoryTookOver() : g.trackBuildPattern());
    call(first);
    ok(globalThis.location.pathname.startsWith("/factory/") || globalThis.location.pathname === "/build/pattern",
      `${label}: the stub did not follow the first push, so the overlap this case is about does not exist in it`);
    call(second); // inside the first window, by construction
    await pastWindow();
    ok(restores.length === 2 && restores.every((u) => u === "/factory.html"),
      `${label}: an overlapping flip restored to a VIRTUAL path: ${JSON.stringify(restores)}`);
    ok(globalThis.location.pathname === "/factory.html",
      `${label}: the page settled on ${globalThis.location.pathname} instead of the real URL — a reload from here is a 404`);
  }

  // 11 · H · the studio keep rail's two routes (#210), on a /factory URL carrying a real ?b= build —
  //      which /factory now restores from (system/studio.mjs's ?b= branch), so the payload trap is
  //      live on this page for the first time and is not borrowed from /build. Same four claims as
  //      every path above, plus the hash, because this page's dock and inspector both write one.
  const FACTORY_B_REAL = `/factory.html?b=${PAYLOAD}#shape`;
  stub({ pathname: "/factory.html", search: `?b=${PAYLOAD}`, hash: "#shape" });
  const anaH = await import(`${ANA}?g10h`);
  ok(typeof anaH.trackFactoryExported === "function" && typeof anaH.trackFactoryLinkCopied === "function",
    "analytics.mjs does not export both studio-rail trackers — system/studio-keep.mjs imports them by name");
  if (typeof anaH.trackFactoryExported === "function" && typeof anaH.trackFactoryLinkCopied === "function") {
    anaH.trackFactoryExported(); // twice each: a shared flag would let whichever fired first
    anaH.trackFactoryExported();  // suppress the other, which is why every event owns its guard
    await pastWindow();
    anaH.trackFactoryLinkCopied();
    anaH.trackFactoryLinkCopied();
    await pastWindow();
    ok(pushes.length === 2, `${pushes.length} virtual routes pushed for one export and one copy, expected exactly 2 — a fire-once guard is missing or shared between the two events`);
    ok(pushes[0] === "/factory/exported", `the export event pushed "${pushes[0]}", not the literal /factory/exported`);
    ok(pushes[1] === "/factory/link-copied", `the copy event pushed "${pushes[1]}", not the literal /factory/link-copied`);
    for (const p of pushes) {
      ok(/^\/factory\/[a-z-]+$/.test(p), `"${p}" is not a bare static path — a virtual route is the entire payload, so it carries no board, arrangement or pattern name`);
      ok(!p.includes(PAYLOAD) && !p.includes("?") && !p.includes("#"),
        `"${p}" carries the visitor's ?b= build (or a query or hash) into the analytics path — the studio's promise is that the board never leaves the browser`);
    }
    ok(restores.length === 2 && restores.every((u) => u === FACTORY_B_REAL),
      `the real URL was not restored verbatim: ${JSON.stringify(restores)} — the reader loses the ?b= board the rail just handed them, and the panel they deep-linked to`);
  }

  // 12 · I · the rail's own two buttons OVERLAPPING, in both orderings. Case G made this argument for
  //      the take-over against /build's pattern event; this is the one that is genuinely ordinary,
  //      because both flips here come from BUTTONS SITTING NEXT TO EACH OTHER on the same rail. A
  //      reader exporting and then copying 30 ms later is not a contrived interleaving.
  for (const [first, second, label] of [
    ["exported", "link-copied", "export then copy"],
    ["link-copied", "exported", "copy then export"],
  ]) {
    stub({ pathname: "/factory.html", search: `?b=${PAYLOAD}`, hash: "" });
    const g = await import(`${ANA}?g10i-${first}`);
    const call = (which) => (which === "exported" ? g.trackFactoryExported() : g.trackFactoryLinkCopied());
    call(first);
    ok(globalThis.location.pathname === `/factory/${first}`,
      `${label}: the stub did not follow the first push, so the overlap this case is about does not exist in it`);
    call(second); // inside the first window, by construction
    ok(globalThis.location.pathname === `/factory/${second}`,
      `${label}: the stub did not follow the second push, so the two windows are not actually overlapping here`);
    await pastWindow();
    ok(restores.length === 2 && restores.every((u) => u === `/factory.html?b=${PAYLOAD}`),
      `${label}: an overlapping flip restored to a VIRTUAL path: ${JSON.stringify(restores)} — whichever restore lands last is where the reader is left, and /factory/${first} 404s with the board gone`);
    ok(globalThis.location.search === `?b=${PAYLOAD}`,
      `${label}: the page settled on ${globalThis.location.pathname}${globalThis.location.search} — the ?b= the rail just wrote is gone from the address bar it promised it was in`);
  }

  // 13 · J · EVERY path this module can push, pairwise DISTINCT. This is the check that would have
  //      caught #210's real trap and the only one that could: the obvious names for the rail's two
  //      events are /factory/shared and /factory/built, both of which ALREADY EXIST here and both of
  //      which fire from HOME'S SPINE. A virtual route is the entire payload, so a reused literal
  //      makes two different events one row in CF Web Analytics — and every case above asserts a
  //      path is STATIC, which a duplicate passes happily.
  //
  //      Driven, not grepped (the "check that cannot fail" rule): each tracker is CALLED on a fresh
  //      module instance and the path it actually pushes is collected. `document` is defined for
  //      trackFactoryArrived alone, whose flip is held until readyState is "complete" — BEACON_TOKEN
  //      is "" in this unmutated import, so the beacon branch still short-circuits before it.
  //      Proven able to fail: pointing FACTORY_EXPORTED_PATH at /factory/shared turns this red while
  //      every other case in the group stays green.
  //
  //      DERIVED FROM THE MODULE, not hand-listed, and that distinction is the gap this case was
  //      written to close rather than to re-open one step later: a typed array cannot see a TWELFTH
  //      tracker — exactly the thing #210 just did twice — so a new path could collide with an
  //      existing one and fall outside the only check that looks. The pinned minimum stays, because
  //      derivation alone is satisfied by an empty module: a rename that DROPS a tracker must be as
  //      red as a duplicate one. (PR #241 review, Low 5.)
  //
  //      #216 DROPPED TWO — trackFactoryBuilt and trackFactoryShared — and this list is where that
  //      had to be said out loud. Both fired only from home's spine (the built-screen peak and the
  //      close beat), and #216 compressed home to the gate, deleting system/peak.mjs and
  //      system/close.mjs with their only call sites; the pin went red on the deletion commit
  //      exactly as designed, and dropping the two names here is what discharges it. Their paths
  //      /factory/built and /factory/shared are now free literals that NO code pushes — and must
  //      stay that way. The studio's successors are deliberately named differently
  //      (/factory/exported, /factory/link-copied, #210): CF WA is a time series, so a path that
  //      meant "reached home's peak" until #216 must never start meaning "exported from the studio"
  //      afterwards. Nine is the new floor; the duplicate-path check below is untouched.
  {
    const MIN = [
      "trackFactoryDriven", "trackFactoryArrived",
      "trackBuildPattern", "trackBuildShared", "trackToolInspect", "trackToolPalette",
      "trackFactoryTookOver", "trackFactoryLinkCopied", "trackFactoryExported",
    ];
    // Imported before the loop's first stub(), which is safe only because case 12 left `location`
    // and `history` defined and analytics.mjs is node-safe regardless — stated because it is an
    // ordering dependency this group did not have before, and reordering group 10 would fail here
    // confusingly rather than loudly.
    const roster = await import(`${ANA}?g10j-roster`);
    const TRACKERS = Object.keys(roster).filter((k) => k.startsWith("track"));
    ok(TRACKERS.length >= MIN.length && MIN.every((n) => TRACKERS.includes(n)),
      `analytics.mjs exports ${TRACKERS.length} track* functions (${TRACKERS.join(", ")}) — the pinned minimum ${MIN.join(", ")} is not a subset, so a tracker was renamed or dropped and this case would silently stop driving it`);
    const pushed = new Map(); // path → the tracker that pushed it
    const dupes = [];
    for (const name of TRACKERS) {
      stub({ pathname: "/factory.html", search: "", hash: "" });
      globalThis.document = { readyState: "complete" };
      const mod = await import(`${ANA}?g10j-${name}`);
      ok(typeof mod[name] === "function", `analytics.mjs no longer exports ${name} — this case is silently skipping a path`);
      if (typeof mod[name] !== "function") continue;
      mod[name]();
      await pastWindow();
      delete globalThis.document;
      ok(pushes.length === 1, `${name}() pushed ${pushes.length} paths, expected exactly 1 — this case cannot read a path it never saw`);
      const path = pushes[0];
      if (pushed.has(path)) dupes.push(`${path} is pushed by BOTH ${pushed.get(path)}() and ${name}()`);
      else pushed.set(path, name);
    }
    ok(pushed.size === TRACKERS.length && !dupes.length,
      `two virtual routes share a path literal: ${dupes.join("; ")} — CF Web Analytics has no custom events, so the path IS the payload and the two events are one indistinguishable row`);
  }

  // 14 · every other group runs without these; leaving them defined would change what "Node" means.
  delete globalThis.location;
  delete globalThis.history;
  delete globalThis.document;

  group("analytics", "imports node-safe with a filled token · 5 static virtual paths (2 /build + /factory/took-over + #210's exported and link-copied) · no ?b= payload in any, asserted on /factory against a real restorable board · fires once each · URL restored verbatim, hash included (arrived-with, written-inside-the-window) · two OVERLAPPING flips restore the real URL in both orderings, on /build, across the two pages, and between the studio rail's own two buttons · every track* export DRIVEN — the roster DERIVED from the module over a pinned minimum, so a twelfth one cannot fall outside it — and their pushed paths proven pairwise distinct, the check a merely-static assertion cannot be");
}

// --- 11 · the replay projection ------------------------------------------------------------------
// Drives gen-replay.mjs's PURE projectTrace over SYNTHETIC in-memory rows. Hand-built rows are
// legitimate here in a way a hand-built trace never is: they are test input, and nothing in this
// file is presented as a run. Nothing under traces/ or replay/ is read and no SDK is loaded —
// portal/record-build.mjs IS imported (case 8 drives its fence), which is safe only because that
// module's SDK import is lazy, and group 8's SDK-free invariant is what keeps it so.
{
  const RUN_START = "2026-08-04T12:00:00.000Z";
  const T0 = Date.parse(RUN_START);
  const BOARD_PATH = "replay/g11.board.json";
  const cmdFor = (op) => `node tooling/board-op.mjs ${BOARD_PATH} '${JSON.stringify(op)}'`;

  // seq is 1-based and shared with the meta/result lines' neighbours the way a real trace's is;
  // `at` is seconds from the run's start, so a case can state pacing in readable numbers.
  const step = (seq, cmd, { at = seq, ok = true, phase = "implement", noSeq = false } = {}) => {
    const s = {
      type: "step", seq, ts: new Date(T0 + at * 1000).toISOString(), phase, kind: "tool",
      tool: "Bash", input: { command: cmd }, ok, response: "{}", responseTruncated: false,
    };
    if (noSeq) delete s.seq;
    return s;
  };
  const traceOf = (steps) => [
    { type: "meta", version: 1, slug: "g11", task: "t", label: "Real run, curated for length", model: "claude-sonnet-5", sessionId: "g11-session", startedAt: RUN_START, durationMs: 60000 },
    ...steps,
    { type: "result", ok: true, numTurns: 9, durationMs: 60000, totalCostUsd: 0.1, endedAt: new Date(T0 + 60000).toISOString() },
  ];
  const threw = (fn) => { try { fn(); return null; } catch (e) { return e.message; } };

  // The four ops of a minimal but complete build: two places, one affordance, one connection.
  const OPS_4 = [
    { op: "place.add", params: { label: "Worklist" } },
    { op: "place.add", params: { label: "Results" } },
    { op: "affordance.add", params: { placeId: "p1", label: "Search" } },
    { op: "connect", params: { affordanceId: "p1a1", placeId: "p2" } },
  ];
  const EXPECTED_BOARD = {
    places: [
      { id: "p1", label: "Worklist", affordances: [{ id: "p1a1", label: "Search" }] },
      { id: "p2", label: "Results", affordances: [] },
    ],
    connections: [["p1a1", "p2"]],
  };

  // 1 · the happy path — four op calls project to four ops, in seq order, each carrying the step
  //     it came from and that step's phase and real offset.
  const happy = traceOf(OPS_4.map((op, i) => step(i + 1, cmdFor(op))));
  const { ops } = projectTrace(happy, { slug: "g11" });
  ok(ops.length === 4, `four op calls projected to ${ops.length} ops — the replay would play a different build from the one that was recorded`);
  ok(ops.map((o) => o.fromStep).join(",") === "1,2,3,4", `ops carry fromStep ${ops.map((o) => o.fromStep).join(",")}, expected 1,2,3,4 — an op that cannot be traced back to a step is unverifiable`);
  ok(ops.every((o) => o.phase === "implement"), "an op lost its phase — #209 reads phase as the act boundary");
  ok(ops.every((o) => OPS.includes(o.op)), "a projected op is not in the vocabulary system/board-ops.mjs defines");
  ok(ops[0].op === "place.add" && ops[0].params.label === "Worklist" && ops[3].op === "connect",
    "the projected ops are not the ops the commands carried — the extractor read the wrong argument");
  const rebuilt = applyOps(ops);
  ok(JSON.stringify(rebuilt) === JSON.stringify(EXPECTED_BOARD),
    `applying the projected ops built ${JSON.stringify(rebuilt)} — the replay does not reproduce the board the run built`);
  ok(threw(() => assertBoard(rebuilt)) === null, "the reproduced board is not well-formed");

  // 2 · ⚠ THE MUTATION THAT MAKES CASE 1 REAL. Corrupt ONE command's label and the reproduce check
  //     must go red against the CORRECT board. If this ever passes green the check is comparing
  //     the producer against itself and the whole group is theatre (memory: check-that-cannot-fail).
  const corrupted = traceOf(OPS_4.map((op, i) =>
    step(i + 1, cmdFor(i === 0 ? { ...op, params: { label: "TAMPERED" } } : op))));
  const fromCorrupt = applyOps(projectTrace(corrupted, { slug: "g11" }).ops);
  ok(JSON.stringify(fromCorrupt) !== JSON.stringify(EXPECTED_BOARD),
    "a corrupted label still reproduced the correct board — the reproduce check is vacuous, and gen-replay would ship a projection of ops nobody ran");
  ok(fromCorrupt.places[0].label === "TAMPERED",
    "the corruption did not reach the projected params, so this case proves nothing about what the extractor reads");

  // 3 · the refusals, one assertion each. Every message must name the offending seq, because
  //     "which step" is the only useful thing to know when a projection fails.
  const unparseable = threw(() => projectTrace(traceOf([
    step(1, cmdFor(OPS_4[0])),
    step(2, `node tooling/board-op.mjs ${BOARD_PATH} '{"op":"place.add",'`),
  ]), { slug: "g11" }));
  ok(unparseable && /step 2/.test(unparseable), `an op call whose JSON does not parse was projected anyway (${unparseable}) — a half-read command becomes a wrong op`);

  const unknownOp = threw(() => projectTrace(traceOf([
    step(1, cmdFor({ op: "place.teleport", params: { label: "X" } })),
  ]), { slug: "g11" }));
  ok(unknownOp && /step 1/.test(unknownOp) && /place\.teleport/.test(unknownOp),
    `an op outside the vocabulary was projected (${unknownOp}) — the driver would meet a verb it cannot apply`);

  const noSeq = threw(() => projectTrace(traceOf([
    step(1, cmdFor(OPS_4[0])),
    step(2, cmdFor(OPS_4[1]), { noSeq: true }),
  ]), { slug: "g11" }));
  ok(noSeq && /seq/.test(noSeq), `a step with no seq was projected (${noSeq}) — the op would claim a source step that does not exist`);

  const zeroOps = threw(() => projectTrace(traceOf([
    step(1, `node tooling/board-op.mjs ${BOARD_PATH} --validate`, { phase: "validate" }),
  ]), { slug: "g11" }));
  ok(zeroOps && /zero ops/.test(zeroOps), `a trace with no ops projected to an empty artifact (${zeroOps}) — an empty replay is a page claiming a build that never happened`);

  const outOfOrder = threw(() => projectTrace(traceOf([
    step(5, cmdFor(OPS_4[0])),
    step(2, cmdFor(OPS_4[1])),
  ]), { slug: "g11" }));
  ok(outOfOrder && /seq order/.test(outOfOrder), `a trace whose seqs run backwards projected anyway (${outOfOrder}) — the trace is true chronology and a replay must not silently reorder it`);

  // 4 · what is NOT an op. A --validate call changes no state; a failed or denied call changed
  //     nothing at all. Both stay in the trace and neither may become a replay beat.
  const mixed = projectTrace(traceOf([
    step(1, cmdFor(OPS_4[0])),
    step(2, cmdFor(OPS_4[1]), { ok: false }),
    step(3, `node tooling/board-op.mjs ${BOARD_PATH} --validate`, { phase: "validate" }),
    step(4, cmdFor(OPS_4[1])),
  ]), { slug: "g11" }).ops;
  ok(mixed.length === 2, `${mixed.length} ops came out of one --validate + one failed call + two real ops, expected 2 — a failed op that replays is a build step that never happened`);
  ok(mixed.map((o) => o.fromStep).join(",") === "1,4", `the wrong steps survived (${mixed.map((o) => o.fromStep).join(",")}) — the failed call or the validate call became an op`);

  // 5 · atMs is REAL PACING, derived from ts − startedAt, not an index. Two steps three seconds
  //     apart must be three seconds apart in the artifact, or the replay plays at a made-up speed
  //     while claiming to play the run's own.
  const paced = projectTrace(traceOf([
    step(1, cmdFor(OPS_4[0]), { at: 10 }),
    step(2, cmdFor(OPS_4[1]), { at: 13 }),
  ]), { slug: "g11" }).ops;
  ok(paced[0].atMs === 10000 && paced[1].atMs === 13000,
    `atMs came out ${paced.map((o) => o.atMs).join(",")}, expected 10000,13000 — the offsets are not the run's real timing`);
  ok(paced[1].atMs - paced[0].atMs === 3000, "two steps 3 000 ms apart are not 3 000 ms apart in the artifact");

  // 6 · the label is the honest one, and the artifact does not dress itself up as the recording.
  //     Asserted on the KEYS, not by hunting for the word "trace" — source.curatedTrace and
  //     source.rawTrace contain it by design, and they are the honest part.
  const artifact = JSON.parse(readFileSync(join(ROOT, "replay/build-fieldwork-dispatch.json"), "utf8"));
  ok(/^Projection of the real run /.test(artifact.label),
    `the artifact's label is "${artifact.label}" — the load-bearing sentence is that this is a projection, not a recording`);
  ok(artifact.type === undefined && artifact.curation === undefined && artifact.steps === undefined,
    "the artifact carries a trace's own keys (type/curation/steps) — it would read as the recording it is a projection of");
  ok(artifact.source?.curatedTrace && artifact.source?.rawTrace && artifact.source?.board && artifact.source?.brief,
    "the artifact does not name the run it projects — the trace pair is what a reader must be sent to");
  ok(/GENERATED by agent-layer\/gen-replay\.mjs/.test(artifact.$description) && /not a recording/.test(artifact.$description),
    "the artifact's $description no longer says it is generated and is not a recording");

  // 7 · THE KEEP_WHOLE COUPLING, proven by running the real function. truncateInput and KEEP_WHOLE
  //     are both module-private in curate-trace.mjs, so there is exactly one honest way to test
  //     this: curate a raw trace carrying a >700-char command and assert it comes back
  //     BYTE-IDENTICAL. Do not assert on the constant and do not grep the source — the whole
  //     projection depends on `command` surviving curation whole, and a check that reads the
  //     source instead of running it is the failure mode memory `check-that-cannot-fail` names.
  const dir = mkdtempSync(join(tmpdir(), "g11-curate-"));
  try {
    // Long by way of the board path, not the op JSON: the point is only that the VALUE under
    // `command` exceeds the cap, and asserting that first is what stops this case passing
    // vacuously on a command curation would never have touched.
    const padded = `node tooling/board-op.mjs replay/${"x".repeat(760)}.board.json '{"op":"place.add","params":{"label":"Worklist"}}'`;
    ok(padded.length > 700, `the synthetic command is ${padded.length} chars — under the 700-char cap, so this case would pass even if command WERE truncated`);
    const raw = join(dir, "g11.raw.jsonl");
    const out = join(dir, "g11.jsonl");
    writeFileSync(raw, traceOf([step(1, padded)]).map((r) => JSON.stringify(r)).join("\n") + "\n");
    curateTrace(raw, out);
    const curatedRows = readFileSync(out, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    const curatedCmd = curatedRows.find((r) => r.type === "step")?.input?.command;
    ok(curatedCmd === padded,
      `curation changed a ${padded.length}-char command (came back ${curatedCmd?.length} chars) — "command" left curate-trace.mjs's KEEP_WHOLE set, so every op JSON longer than 700 chars now truncates mid-string and gen-replay's reproduce check goes red with a confusing message`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  // 8 · THE SCRIPT PATH IS AN IDENTITY, ON BOTH SIDES OF THE GRAMMAR. `parseOpCommand` returns the
  //     path the agent typed and leaves identity to its two callers, exactly as it does for the
  //     board — so both callers are driven here: the PROJECTION (projectTrace, above) and the
  //     FENCE (makeFence, the predicate a paid run's canUseTool receives). A decoy ending in
  //     /tooling/board-op.mjs is the case that made this necessary; it must be refused by both,
  //     while the two paths a real run legitimately types stay accepted.
  //
  //     What CI cannot reach is the WIRING — that this predicate is what the SDK is handed. That
  //     is only ever proven on a real run, the same split group 9 lives with for origin.mjs.
  const DECOY = "/tmp/evil/tooling/board-op.mjs";
  const SCRIPT_ABS = join(ROOT, "tooling/board-op.mjs");

  // Both typed forms parse, and both carry the path back to the caller. If the parser ever
  // tightened this itself, --dry (absolute paths, scratch cwd) would stop working with no gate red.
  for (const typed of ["tooling/board-op.mjs", SCRIPT_ABS, DECOY]) {
    const p = parseOpCommand(`node ${typed} ${BOARD_PATH} --validate`);
    ok(p.scriptPath === typed, `parseOpCommand returned scriptPath ${JSON.stringify(p.scriptPath)} for "${typed}" — the callers cannot check an identity they are not given`);
  }

  const decoyProjected = threw(() => projectTrace(traceOf([
    step(1, cmdFor(OPS_4[0])),
    step(2, `node ${DECOY} ${BOARD_PATH} '${JSON.stringify(OPS_4[1])}'`),
  ]), { slug: "g11" }));
  ok(decoyProjected && /step 2/.test(decoyProjected),
    `a step running ${DECOY} projected as an op (${decoyProjected}) — a path merely ENDING in the tool's name is a different file, and the artifact would claim the build tool applied it`);

  // Brace expansion: one typed token, three argv items to a real shell. The old denylist let it
  // through and only a DIFFERENT check happened to catch it; an allowlist makes it false here.
  for (const bad of [`node tooling/board-op.mjs replay/{a,b}.board.json --validate`,
    `node tooling/board-op.mjs replay/[ab].board.json --validate`]) {
    ok(threw(() => parseOpCommand(bad)) !== null,
      `the grammar accepted "${bad}" — the shell would expand it into more arguments than the parser saw, so the fence's model of the command is not the shell's`);
  }

  // The fence itself, in both modes. Real: cwd IS the repo and the agent types relative paths.
  const briefAbs = join(ROOT, "replay/briefs/g11.md");
  const boardAbs = join(ROOT, BOARD_PATH);
  const fence = makeFence(ROOT, SCRIPT_ABS, boardAbs, briefAbs);
  const verdict = async (tool, input) => (await fence(tool, input)).behavior;
  const bash = (cmd) => verdict("Bash", { command: cmd });
  ok(await bash(`node tooling/board-op.mjs ${BOARD_PATH} '${JSON.stringify(OPS_4[0])}'`) === "allow",
    "the fence denied the exact command record-build.mjs's task prompt tells the agent to type — the run could not build anything");
  ok(await bash(`node tooling/board-op.mjs ${BOARD_PATH} --validate`) === "allow", "the fence denied the validate command the task prompt names");
  ok(await bash(`node ${DECOY} ${BOARD_PATH} --validate`) === "deny",
    `the fence allowed ${DECOY} — it verifies a filename suffix, not that the invoked file IS the build tool`);
  ok(await bash(`node ../tooling/board-op.mjs ${BOARD_PATH} --validate`) === "deny", "the fence allowed a traversal out of the run's root to something named like the tool");
  ok(await bash(`node tooling/board-op.mjs replay/other.board.json --validate`) === "deny", "the fence allowed a board that is not this run's");
  ok(await verdict("Write", { file_path: boardAbs }) === "deny", "the fence allowed a Write — the board must only ever be built through op calls");

  // Dry: cwd is a scratch dir and the same prompt hands the agent ABSOLUTE paths. The identity
  // check must accept those too, or --dry (the cheap proof before a paid run) dies.
  const dryDir = realpathSync(mkdtempSync(join(tmpdir(), "g11-fence-")));
  try {
    const dryBoard = join(dryDir, "board.json");
    const dryFence = makeFence(dryDir, SCRIPT_ABS, dryBoard, briefAbs);
    ok((await dryFence("Bash", { command: `node ${SCRIPT_ABS} ${dryBoard} --validate` })).behavior === "allow",
      "the fence denied the ABSOLUTE tool path --dry hands the agent — the dry smoke test could never reach the op CLI");
    ok((await dryFence("Bash", { command: `node ${DECOY} ${dryBoard} --validate` })).behavior === "deny",
      "the fence allowed the decoy in --dry mode");
  } finally {
    rmSync(dryDir, { recursive: true, force: true });
  }

  // 9 · #225 · THE APOSTROPHE, END TO END. A possessive is ordinary product copy, and the grammar
  //     could not represent the only way bash writes one inside a single-quoted string, so
  //     "Manager's Office" was denied on every attempt with nothing in the prompt warning the agent
  //     off it. Driven through EVERY layer that sees the command — the parser, the projection, the
  //     applier and the fence — because a fix in one of them alone still leaves the label unbuildable.
  const APOS = "Manager's Office";
  const aposOp = { op: "place.add", params: { label: APOS } };
  // Exactly what a shell hands the agent's own keystrokes: '…'\''…'.
  const aposCmd = `node tooling/board-op.mjs ${BOARD_PATH} '{"op":"place.add","params":{"label":"Manager'\\''s Office"}}'`;
  const aposParsed = parseOpCommand(aposCmd);
  ok(aposParsed.op?.params?.label === APOS,
    `the grammar read the label as ${JSON.stringify(aposParsed.op?.params?.label)} — bash's '…'\\''…' form is the only way an apostrophe reaches a single-quoted argument, and a label it cannot represent can never be built`);
  ok(applyOps([aposParsed.op]).places[0].label === APOS,
    "the apostrophe did not survive into the board the op built");
  const aposProjected = projectTrace(traceOf([step(1, aposCmd)]), { slug: "g11" }).ops;
  ok(aposProjected.length === 1 && aposProjected[0].params.label === APOS,
    `the projection read ${JSON.stringify(aposProjected[0]?.params?.label)} — a command the recorder allowed must be one the projector can read, or the run is paid for and unprojectable`);
  ok(await bash(aposCmd) === "allow",
    "the fence denied the escaped apostrophe — the agent would burn a denial and a retry on ordinary product copy");
  // …and the concatenation opened no hole. A word is still segments of QUOTED text, \' and BARE
  // characters and nothing else, so everything the allowlist refused before is still refused.
  for (const bad of [
    `node tooling/board-op.mjs replay/a'b.board.json --validate`,        // unbalanced
    `node tooling/board-op.mjs 'replay/a'$b.board.json --validate`,      // expansion glued to a quote
    `node tooling/board-op.mjs replay/a\\nb.board.json --validate`,      // an escape that is not \'
    `node tooling/board-op.mjs replay/g11.board.json --validate && rm -rf .`,
  ]) {
    ok(threw(() => parseOpCommand(bad)) !== null,
      `the grammar accepted "${bad}" — segment concatenation must not become a general escape rule, or the fence's model of the command stops being the shell's`);
  }

  // 10 · #226 · THE TYPED ENVELOPE IS EXACT TOO. `{op, params, extra}` used to parse with `extra`
  //      silently dropped, which is an op whose recorded text says more than the op that was
  //      applied. Driven at the GRAMMAR, because that is where the tightening lives and why: every
  //      envelope a human or an agent authors comes through parseOpCommand, while applyOp is fed
  //      the PROJECTED record by gen-replay and by #209's driver. Both halves of that split are
  //      asserted here — the second one is what stopped this fix from making the committed replay
  //      artifact unapplyable by its own reproduce check.
  for (const [envelope, why] of [
    [`{"op":"place.add","params":{"label":"X"},"extra":"anything"}`, "a stray key"],
    [`{"op":"place.add","params":{"label":"X"},"id":"p9"}`, "an id smuggled onto the envelope"],
    [`{"op":"place.add","params":{"label":"X"},"__proto__":"x"}`, "a __proto__ key (an inert own property via JSON.parse, still not an op key)"],
    [`{"op":"place.add","params":{"label":"X"},"atMs":0,"phase":"implement","fromStep":1}`, "the projection's own carrier keys, which a typed command never has"],
  ]) {
    const msg = threw(() => parseOpCommand(`node tooling/board-op.mjs ${BOARD_PATH} '${envelope}'`));
    ok(msg !== null && /unknown key/.test(msg),
      `${why} was accepted on a typed op envelope (${msg}) — "exact, not minimal" is the rule one level down and the envelope now keeps it`);
  }
  ok(threw(() => parseOpCommand(cmdFor(OPS_4[0]))) === null,
    "the envelope check refused the exact shape every typed op has — { op, params } must stay legal");
  // The other half of the split, stated as the thing that would break: a projected op still applies.
  ok(threw(() => applyOps(projectTrace(happy, { slug: "g11" }).ops)) === null,
    "a projected op no longer applies — the envelope check reached applyOp, and gen-replay's reproduce check feeds it { op, params, atMs, phase, fromStep }");

  // 11 · #226 · A BOARD PATH WITH A SPACE. runBoardOp re-joins its argv and reads it back through
  //      parseOpCommand on purpose (one grammar, no third opinion), and re-joining bare made a path
  //      with a space tokenize into two arguments — the CLI refusing its own invocation. Driven as a
  //      REAL run of the CLI against a REAL file, because the bug was in the round trip and not in
  //      anything either side of it believes about itself.
  const spaceDir = mkdtempSync(join(tmpdir(), "g11-cli-"));
  try {
    const spaced = join(spaceDir, "a board dir", "g11.board.json");
    const first = runBoardOp([spaced, JSON.stringify({ op: "place.add", params: { label: APOS } })]);
    ok(first.board.places[0].label === APOS,
      `the CLI built ${JSON.stringify(first.board.places[0]?.label)} — argv carries the apostrophe raw, so the re-join must quote it the way the grammar reads it back`);
    const second = runBoardOp([spaced, JSON.stringify({ op: "affordance.add", params: { placeId: "p1", label: "Open" } })]);
    ok(second.board.places[0].affordances[0]?.id === "p1a1",
      "the second op did not read the board the first one wrote — the path with a space did not survive the round trip");
    ok(runBoardOp([spaced, "--validate"]).counts.places === 1,
      "--validate could not reach a board under a path containing a space");
    ok(JSON.parse(readFileSync(spaced, "utf8")).places.length === 1,
      "the CLI wrote its board somewhere other than the path it was given");
  } finally {
    rmSync(spaceDir, { recursive: true, force: true });
  }

  group("replay", "4-op happy path + reproduce · corrupted-label mutation goes red · 5 refusals, each naming its seq · --validate and failed calls are not ops · atMs is real pacing · the honest label · KEEP_WHOLE proven by running curateTrace · script-path identity refused as a decoy by BOTH callers, both typed forms still accepted · brace/bracket expansion refused by the grammar · an apostrophe in a label parses, projects, applies and passes the fence in bash's own '…'\\''…' form while the allowlist still refuses every other escape · the op envelope is exact, not minimal · the CLI round-trips a board path containing a space");
}

// --- 12 · the studio canvas ---------------------------------------------------------------------

{
  // system/studio-canvas.mjs owns the caps and the zoom table; system/studio.css restates every one
  // of them as a literal, because CSS cannot import. That is the same hand-mirror the pack-boot.js ↔
  // pack-imported.mjs pair carries in group 7, and it gets the same treatment: pinned EXHAUSTIVELY
  // and IN BOTH DIRECTIONS, never by a count. "There are MAX_COLS [data-col] rules" passes happily
  // for a set with a duplicate and a gap, which is the check-that-cannot-fail shape this repo has
  // already paid for twice.
  //
  // Every regex below is asserted to have matched SOMETHING before its content is judged. A mirror
  // check that finds no rules at all and reports green is the same defect wearing a different hat.
  const css = readFileSync(join(ROOT, "system/studio.css"), "utf8");

  const declared = (name) => {
    const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
    return m ? m[1].trim() : null;
  };
  ok(declared("stx-cols") === String(MAX_COLS),
    `studio.css declares --stx-cols: ${declared("stx-cols")} but studio-canvas.mjs exports MAX_COLS ${MAX_COLS}`);
  ok(declared("stx-rows") === String(MAX_ROWS),
    `studio.css declares --stx-rows: ${declared("stx-rows")} but studio-canvas.mjs exports MAX_ROWS ${MAX_ROWS}`);

  // The grid rules, both directions: every index in range present, none twice, none out of range.
  //
  // THREE SELECTOR FAMILIES SINCE #217, not one. .stx-slot was the only grid child until this
  // ticket; .stx-guide and .stx-menu are placed by the same two attributes and therefore carry the
  // same 12 + 8 hand-mirror. Checking only the slots would let a cap move with one of the three
  // mirrors following it — precisely the drift the exhaustive pin exists to prevent, arriving
  // through the door the check does not watch.
  const axis = (selector, attr, max) => {
    const escaped = selector.replace(/[.]/g, "\\.");
    const found = [...css.matchAll(new RegExp(`${escaped}\\[${attr}="(\\d+)"\\]`, "g"))].map((m) => Number(m[1]));
    ok(found.length > 0, `studio.css has no ${selector}[${attr}] rules at all — the mirror check would pass vacuously`);
    for (let i = 1; i <= max; i += 1) {
      ok(found.filter((n) => n === i).length === 1,
        `studio.css declares ${found.filter((n) => n === i).length} ${selector}[${attr}="${i}"] rules; every index in 1..${max} needs exactly one`);
    }
    for (const n of found) ok(n >= 1 && n <= max, `studio.css declares ${selector}[${attr}="${n}"], outside the exported cap of ${max}`);
  };
  const GRID_FAMILIES = [".stx-slot", ".stx-guide", ".stx-menu", ".stx-frame"];
  for (const family of GRID_FAMILIES) {
    axis(family, "data-col", MAX_COLS);
    axis(family, "data-row", MAX_ROWS);
  }
  // #219's FOURTH family is the first that SPANS, so it carries two more hand-mirrors — and they get
  // the same exhaustive both-directions treatment for the reason axis() states: a count-based check
  // ("there are 12 span rules") passes happily for a set with a duplicate and a gap.
  axis(".stx-frame", "data-span-col", MAX_COLS);
  axis(".stx-frame", "data-span-row", MAX_ROWS);
  // Each row-span rule declares its index TWICE — once as the grid span, once as --stx-frame-rows,
  // which the height calc reads. A height and a span that disagree is a frame claiming grid area it
  // does not paint for a reason nobody chose, and nothing else in the repo can see it: the pixel gate
  // masks the frame's content and would re-baseline the wrong height without complaint.
  const spanRows = [...css.matchAll(/\.stx-frame\[data-span-row="(\d+)"\]\s*\{([^}]*)\}/g)];
  ok(spanRows.length === MAX_ROWS,
    `studio.css declares ${spanRows.length} .stx-frame[data-span-row] rule bodies for ${MAX_ROWS} rows`);
  for (const [, index, body] of spanRows) {
    ok(new RegExp(`grid-row-end:\\s*span\\s+${index}\\b`).test(body),
      `.stx-frame[data-span-row="${index}"] does not declare grid-row-end: span ${index}`);
    ok(new RegExp(`--stx-frame-rows:\\s*${index}\\s*;`).test(body),
      `.stx-frame[data-span-row="${index}"] declares a --stx-frame-rows that is not ${index} — the height calc and the span would disagree`);
  }
  const spanCols = [...css.matchAll(/\.stx-frame\[data-span-col="(\d+)"\]\s*\{([^}]*)\}/g)];
  ok(spanCols.length === MAX_COLS,
    `studio.css declares ${spanCols.length} .stx-frame[data-span-col] rule bodies for ${MAX_COLS} columns`);
  for (const [, index, body] of spanCols) {
    ok(new RegExp(`grid-column-end:\\s*span\\s+${index}\\b`).test(body),
      `.stx-frame[data-span-col="${index}"] does not declare grid-column-end: span ${index}`);
  }
  // THE SHORTHAND TRAP, pinned rather than remembered. `grid-column: N` is a shorthand and would
  // reset the span declared by an equal-specificity rule, silently leaving every frame one cell wide
  // — so the frame's POSITION rules must use the -start longhands. The three non-spanning families
  // above are free to use the shorthand and do.
  for (const [, index, body] of [...css.matchAll(/\.stx-frame\[data-col="(\d+)"\]\s*\{([^}]*)\}/g)]) {
    ok(/grid-column-start:/.test(body) && !/grid-column:/.test(body),
      `.stx-frame[data-col="${index}"] uses the grid-column SHORTHAND; it resets grid-column-end, so every frame would be one cell wide`);
  }
  for (const [, index, body] of [...css.matchAll(/\.stx-frame\[data-row="(\d+)"\]\s*\{([^}]*)\}/g)]) {
    ok(/grid-row-start:/.test(body) && !/grid-row:/.test(body),
      `.stx-frame[data-row="${index}"] uses the grid-row SHORTHAND; it resets grid-row-end, so every frame would be one row tall`);
  }
  // The frame row unit mirrors the AT-REST slot height. It cannot READ --stx-slot-h, because :638
  // flips that to 480px in the compiled state and a depicted device must not change size when a
  // board compiles — so the two are a hand-mirror and this is the pin behind it.
  // Read out of the .stx-viewport BLOCK rather than by first-match, deliberately: the sheet declares
  // --stx-slot-h twice (here, and again at the [data-compile-state="rendered"] flip), so a first-match
  // read is correct only while the at-rest block happens to come first. A reorder would silently
  // compare 140 against 480 and pass, which is the whole class of check this group exists to not be.
  const viewportBlock = css.match(/\.stx-viewport\s*\{([^}]*)\}/)?.[1] || "";
  const inViewport = (name) => viewportBlock.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim() ?? null;
  ok(inViewport("stx-slot-h") !== null && inViewport("stx-frame-unit") !== null,
    "studio.css's .stx-viewport block declares neither --stx-slot-h nor --stx-frame-unit — this pin would pass vacuously");
  ok(inViewport("stx-frame-unit") === inViewport("stx-slot-h"),
    `studio.css declares --stx-frame-unit: ${inViewport("stx-frame-unit")} but the AT-REST --stx-slot-h is ${inViewport("stx-slot-h")} — the frames' height unit is a hand-mirror of it, and it cannot read the variable because :638 flips that one to 480px once a board compiles`);
  // …and no FOURTH family placed by these attributes with no mirror behind it. Derived from the
  // sheet rather than typed, so a later ticket adding `.stx-thing[data-col="1"]` and stopping at
  // column 6 fails HERE — where the message says what to do — instead of at column 7 on a reader's
  // screen. The two flip attributes are deliberately not in this set: they are booleans, not
  // grid lines, and carry no per-index mirror to drift.
  const placed = new Set([...css.matchAll(/(\.stx-[a-z-]+)\[data-(?:col|row)="\d+"\]/g)].map((m) => m[1]));
  for (const family of placed) {
    ok(GRID_FAMILIES.includes(family),
      `studio.css places ${family} by data-col/data-row but group 12 does not mirror-check it — add it to GRID_FAMILIES or the ${MAX_COLS}×${MAX_ROWS} mirror drifts silently`);
  }

  // The scale table: one rule per level, each declaring exactly that level's scale, and no extras.
  const zoomRules = [...css.matchAll(/\.stx-viewport\[data-zoom="(\d+)"\]\s*\{\s*--stx-scale:\s*([^;]+);/g)]
    .map((m) => [Number(m[1]), m[2].trim()]);
  ok(zoomRules.length > 0, "studio.css has no [data-zoom] scale rules at all — the mirror check would pass vacuously");
  ok(zoomRules.length === ZOOM_LEVELS.length,
    `studio.css declares ${zoomRules.length} [data-zoom] rules for ${ZOOM_LEVELS.length} exported ZOOM_LEVELS`);
  for (let i = 0; i < ZOOM_LEVELS.length; i += 1) {
    const mine = zoomRules.filter(([idx]) => idx === i);
    ok(mine.length === 1, `studio.css declares ${mine.length} rules for [data-zoom="${i}"]; exactly one is the contract`);
    if (mine.length === 1) {
      ok(Number(mine[0][1]) === ZOOM_LEVELS[i],
        `studio.css sets --stx-scale: ${mine[0][1]} for [data-zoom="${i}"] but ZOOM_LEVELS[${i}] is ${ZOOM_LEVELS[i]}`);
    }
  }
  ok(ZOOM_LEVELS[ZOOM_REST] === 1, `ZOOM_REST points at ${ZOOM_LEVELS[ZOOM_REST]}; the at-rest level must be 1`);

  // clampSlot — the ONE place a slot is validated, so #205's mover and #208's decoder inherit these
  // answers rather than each clamping in its own way. A decoded "4" is a real input, not a synthetic one.
  for (const [given, want, why] of [
    [{ col: 0, row: 0 }, { col: 1, row: 1 }, "zero is off the grid, and the grid is 1-based"],
    [{ col: MAX_COLS + 5, row: MAX_ROWS + 5 }, { col: MAX_COLS, row: MAX_ROWS }, "past the cap clamps to the cap"],
    [{ col: -3, row: -3 }, { col: 1, row: 1 }, "negative clamps to 1"],
    [{ col: 2.7, row: 2.2 }, { col: 3, row: 2 }, "a fraction rounds to a real grid line"],
    [{ col: "4", row: "6" }, { col: 4, row: 6 }, "a decoded string is coerced, not refused"],
    [{ col: NaN, row: NaN }, { col: 1, row: 1 }, "NaN never reaches an attribute"],
    [{ col: Infinity, row: -Infinity }, { col: 1, row: 1 }, "non-finite never reaches an attribute"],
    [{}, { col: 1, row: 1 }, "an absent slot is the origin"],
  ]) {
    const got = clampSlot(given);
    ok(got.col === want.col && got.row === want.row,
      `clampSlot(${JSON.stringify(given)}) gave ${JSON.stringify(got)}, expected ${JSON.stringify(want)} — ${why}`);
  }
  ok(clampSlot().col === 1 && clampSlot().row === 1, "clampSlot() with no argument at all should be the origin, not a throw");

  // fitLevel — snapping DOWN is the contract, not an approximation of an exact fit: a level ABOVE
  // the ratio would not fit at all, it would only be closer.
  const exact = fitLevel(400, 400, 400 / ZOOM_LEVELS[1], 400 / ZOOM_LEVELS[1]);
  ok(exact === 1, `fitLevel on an exact ${ZOOM_LEVELS[1]} ratio gave index ${exact}, expected 1`);
  const between = fitLevel(1400, 1400, 1000, 1000); // ratio 1.4 — between levels 2 (1) and 3 (1.5)
  ok(between === 2, `fitLevel on a 1.4 ratio gave index ${between}, expected 2 — it must snap DOWN or the content overflows`);
  ok(fitLevel(100, 100, 10000, 10000) === 0, "fitLevel below the smallest level should floor at index 0");
  ok(fitLevel(10000, 10000, 100, 100) === ZOOM_LEVELS.length - 1, "fitLevel above the largest level should cap at the last index");
  for (const [w, h, cw, ch, why] of [
    [400, 300, 0, 600, "a zero content width is a hidden panel measured at call time, not a division by zero"],
    [400, 300, 800, 0, "a zero content height, likewise"],
    [0, 0, 800, 600, "a viewport with no box yet"],
    [400, 300, NaN, 600, "a non-finite measurement"],
  ]) {
    ok(fitLevel(w, h, cw, ch) === ZOOM_REST, `fitLevel(${w}, ${h}, ${cw}, ${ch}) should answer ZOOM_REST — ${why}`);
  }

  // The tripwire, DISCHARGED (#208). It was planted deliberately vacuous — "these caps stay finite
  // because one day a second module will import them rather than re-type a bound". That day is
  // here: system/build-share.mjs's decoder rejects an off-grid slot against these two exports. So
  // the assertion becomes the COUPLING rather than the constants' finiteness, and it greps by
  // design — a mirror check, the pack-boot.js idiom, with the regex asserted to have matched
  // something first so a renamed import cannot pass as an absent one.
  //
  // What it is really guarding is the tempting shortcut: a codec that wrote `col <= 12` inline
  // would pass every coordinate case in group 5 and drift silently the day the canvas widens.
  const codecSrc = readFileSync(join(ROOT, "system/build-share.mjs"), "utf8");
  const capImport = codecSrc.match(/import\s*\{([^}]*)\}\s*from\s*["']\.\/studio-canvas\.mjs["']/);
  ok(capImport !== null, "system/build-share.mjs no longer imports from ./studio-canvas.mjs — the grid bounds must come from the canvas, not a re-typed literal");
  if (capImport) {
    const named = capImport[1].split(",").map((s) => s.trim());
    ok(named.includes("MAX_COLS"), `system/build-share.mjs imports {${capImport[1].trim()}} from the canvas but not MAX_COLS`);
    ok(named.includes("MAX_ROWS"), `system/build-share.mjs imports {${capImport[1].trim()}} from the canvas but not MAX_ROWS`);
  }
  // No SECOND literal CAP for a grid axis anywhere in the codec. The 1-based ORIGIN is deliberately
  // not caught: `col >= 1` is a property of the grid's numbering, not of its size, and it does not
  // move when the canvas widens — so the filter keeps only comparisons against a number above 1,
  // which is exactly the shape a re-typed `col <= 12` would take. The regex is asserted to have run
  // over a file it actually found (the import check above), so an empty match is a real absence.
  const axisLiterals = (codecSrc.match(/\b(?:col|row)\b\s*(?:<=|>=|<|>|===|!==)\s*(\d+)/g) || [])
    .filter((m) => Number(m.match(/(\d+)$/)[1]) > 1);
  ok(axisLiterals.length === 0,
    `system/build-share.mjs compares a grid axis against a literal cap (${axisLiterals.join(", ")}) — the bound is ${MAX_COLS}×${MAX_ROWS} and it is IMPORTED, so a literal here is a second copy that will drift`);
  // The divergence, asserted rather than assumed: clampSlot still COERCES "4" (the loop above pins
  // that), and the codec REJECTS it (group 5 pins that). Both are correct for their caller — a
  // reader's own gesture versus a stranger's payload — and both files carry a sentence saying so.
  ok(clampSlot({ col: "4", row: "2" }).col === 4,
    "clampSlot must keep coercing a string — the codec's rejection of the same value is a different caller's rule, not a bug in this one");

  group("canvas", `studio.css mirrors ${MAX_COLS}×${MAX_ROWS} slots and ${ZOOM_LEVELS.length} zoom levels exactly, both directions, across all ${GRID_FAMILIES.length} grid families · #219's FOURTH family also mirrors both SPAN tables exhaustively, each row-span rule proven to declare its own index twice (the span and the --stx-frame-rows the height calc reads), every position rule proven to use the -start LONGHAND (the shorthand silently resets the span), and --stx-frame-unit pinned against the AT-REST --stx-slot-h it hand-mirrors · clampSlot over 8 hostile slots · fitLevel snaps down, floors, caps and survives a zero dimension · the #208 tripwire is DISCHARGED: build-share.mjs imports both caps and re-types neither, while clampSlot keeps coercing what the codec refuses`);
}

// --- 13 · the canvas verbs ----------------------------------------------------------------------

{
  // system/studio-verbs.mjs's PURE half: the history stack, the arrow resolver, the hit-test and the
  // occupancy key. Written in group 12's voice — every check RUNS the function, none greps for a
  // constant, and anything deliberately vacuous says so.
  //
  // THE BOUNDARY THIS GROUP DOES NOT REACH, stated rather than left to be assumed. AC #1 turns on
  // the SINGLE-CONSUMER invariant: that a pointer gesture, a keyboard gesture and an injected
  // source:"agent" action all commit through one bus consumer rather than through three code paths
  // that agree today. That is a running-page fact — it needs a real pointer, real focus and a real
  // bus — and nothing here can see it. Its owner is tooling/studio-journey.mjs's three-source
  // deep-equal proof, which runs the injected source on a FRESH page with no gesture performed
  // first, precisely so a mover that applied moves directly and merely emitted for observers would
  // fail there and only there. Groups 9 and 11 live with the same split; an unstated absence would
  // read as CI covering AC #1 when it does not.

  // --- createHistory: AC #3, as a CI gate rather than a driver assertion ---------------------
  // A canonical stringify — keys sorted RECURSIVELY, then compared. Honest at this shape and said
  // out loud rather than left implicit: every snapshot is a flat { id: {col, row} } of numbers, so
  // there is no undefined, no NaN and no cycle for it to be wrong about, and sorting removes the
  // only remaining variable, key order.
  //
  // Written by hand rather than as `JSON.stringify(v, Object.keys(v).sort())`, which is what this
  // check said first and which COULD NOT FAIL. An array in stringify's second position is a
  // replacer, and a replacer array filters property names at EVERY level — so `col` and `row` were
  // stripped and every arrangement compared equal as {"s1":{},"s2":{},"s3":{}}. It was caught by
  // the mutation duty: deleting push()'s redo-tail truncation left the group green twice.
  const deep = (v) => (v && typeof v === "object" && !Array.isArray(v)
    ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${deep(v[k])}`).join(",")}}`
    : JSON.stringify(v));
  const arrangement = (n) => Object.fromEntries(
    Array.from({ length: 3 }, (_, i) => [`s${i + 1}`, { col: i + 1, row: n }]));

  const a1 = arrangement(1);
  const h = createHistory(a1);
  ok(deep(h.current()) === deep(a1), "createHistory does not start on the arrangement it was seeded with");
  ok(h.canUndo() === false && h.canRedo() === false, "a fresh history claims an undo or a redo it cannot do");
  ok(h.depth() === 1, `a fresh history has depth ${h.depth()}, expected 1 (the seed)`);

  h.push(arrangement(2));
  h.push(arrangement(3));
  h.push(arrangement(4));
  ok(h.canUndo() && !h.canRedo(), "after three pushes the cursor is not at the top of the stack");
  h.undo();
  h.undo();
  ok(deep(h.current()) === deep(arrangement(2)), `undo ×2 from the top gave ${deep(h.current())}, expected the second push`);
  h.redo();
  h.redo();
  ok(deep(h.current()) === deep(arrangement(4)), `redo ×2 came back to ${deep(h.current())}, expected the third push`);

  // The bottom and the top are NO-OPS, never throws — the buttons are disabled there, and a driver
  // or an agent-sourced ui.undo must not be able to break the page by asking twice.
  const floorH = createHistory(a1);
  floorH.undo(); floorH.undo(); floorH.undo();
  ok(deep(floorH.current()) === deep(a1), "undo at the bottom of the stack moved off the seed");
  ok(floorH.canUndo() === false, "undo at the bottom left canUndo() true");
  floorH.redo(); floorH.redo();
  ok(deep(floorH.current()) === deep(a1), "redo at the top of the stack moved off the seed");

  // The redo tail is DISCARDED by a new move — the standard rule, and the one that makes
  // "undo, redo, then a new move" behave instead of resurrecting a branch the reader abandoned.
  const tailH = createHistory(a1);
  tailH.push(arrangement(2));
  tailH.push(arrangement(3));
  tailH.undo();                       // sits on arrangement(2), with arrangement(3) ahead
  ok(tailH.canRedo(), "the redo tail vanished before a new push was made — the setup is wrong");
  tailH.push(arrangement(7));
  ok(tailH.canRedo() === false, "a push after an undo left the redo tail intact; a new move must discard it");
  // …asserted on UNDO, not on canRedo(), because canRedo() alone CANNOT FAIL here. push() sets the
  // cursor to the top of the stack either way, so a version that never truncates leaves the
  // abandoned arrangement(3) BURIED behind the new entry rather than ahead of it — canRedo() is
  // false in both, and the only visible difference is where undo lands. Proven by mutation: deleting
  // the truncation left the canRedo() check green and this one red.
  ok(deep(tailH.undo()) === deep(arrangement(2)),
    `undo after a push-over-a-tail landed on ${deep(tailH.current())}, expected the arrangement the reader actually came from`);
  ok(deep(tailH.redo()) === deep(arrangement(7)), "redo after the tail was discarded moved somewhere other than nowhere");

  // The cap, and the index surviving the front-drop. Pushed past HISTORY_MAX, the stack holds the
  // cap and the cursor still points at the newest entry rather than off the end.
  const capH = createHistory(a1);
  for (let i = 2; i <= HISTORY_MAX + 20; i += 1) capH.push(arrangement(i));
  ok(capH.depth() === HISTORY_MAX, `the stack grew to ${capH.depth()}; HISTORY_MAX is ${HISTORY_MAX}`);
  ok(deep(capH.current()) === deep(arrangement(HISTORY_MAX + 20)),
    "after dropping from the front the cursor no longer points at the newest entry");
  ok(capH.canRedo() === false, "after the front-drop the cursor claims a redo above the newest entry");
  let walked = 0;
  while (capH.canUndo()) { capH.undo(); walked += 1; }
  ok(walked === HISTORY_MAX - 1, `undoing to the bottom of a capped stack took ${walked} steps, expected ${HISTORY_MAX - 1}`);

  // The structuredClone claim, proven by MUTATING a returned snapshot and reading history back —
  // never by grepping the source for the call. A stack that handed out live references would let a
  // caller rewrite the past, and every deep-compare above would still pass.
  const cloneH = createHistory(a1);
  cloneH.push(arrangement(2));
  const escaped = cloneH.current();
  escaped.s1.col = 999;
  escaped.injected = { col: 1, row: 1 };
  ok(deep(cloneH.current()) === deep(arrangement(2)),
    "mutating a snapshot returned by current() reached into history — the stack is handing out live references");
  const seedMutable = arrangement(5);
  const seedH = createHistory(seedMutable);
  seedMutable.s1.col = 999;
  ok(seedH.current().s1.col === 1, "mutating the object createHistory was seeded with reached into history");
  const pushedMutable = arrangement(6);
  seedH.push(pushedMutable);
  pushedMutable.s1.col = 999;
  ok(seedH.current().s1.col === 1, "mutating the object handed to push() reached into history");

  // --- adopt: ids the stack has never seen, taught to EVERY entry (#230) -----------------------
  // The phantom undo, as a pure fact: a component placed after mount is in no earlier entry, so
  // undo consumed a step and moved nothing. The MOUNT's half of this — that adopt is called at
  // pick-up and not only in the consumer, because a gesture previews before it commits — is a
  // running-page fact and belongs to tooling/studio-journey.mjs, which drives a real pointer drag
  // on a post-mount node. This group can only prove the stack.
  const adoptH = createHistory(arrangement(1));
  adoptH.push(arrangement(2));
  adoptH.push(arrangement(3));
  adoptH.adopt({ late1: { col: 5, row: 5 } });
  adoptH.undo(); adoptH.undo();
  ok(deep(adoptH.current().late1) === deep({ col: 5, row: 5 }),
    "an adopted id is missing from an entry that predates it — undo lands on an arrangement that cannot place it");
  ok(deep(adoptH.current().s1) === deep(arrangement(1).s1),
    "adopt rewrote an entry's EXISTING id — the past the reader is navigating must not move");

  // MISSING IDS ONLY, which is what lets the mount's two call sites compose: the pick-up adopts the
  // node at its origin, and the consumer's later adopt must find it present and leave it alone.
  // Mutating this to an unconditional write makes the check above red, which is the point.
  const keepH = createHistory({ s1: { col: 1, row: 1 } });
  keepH.adopt({ s1: { col: 9, row: 9 }, late1: { col: 2, row: 2 } });
  ok(deep(keepH.current()) === deep({ s1: { col: 1, row: 1 }, late1: { col: 2, row: 2 } }),
    "adopt overwrote a known id instead of filling only the missing one");

  // A no-op for the ordinary case, and it must not disturb the cursor: adopt runs on EVERY move.
  const quietH = createHistory(arrangement(1));
  quietH.push(arrangement(2));
  quietH.undo();
  const beforeAdopt = { current: deep(quietH.current()), canUndo: quietH.canUndo(), canRedo: quietH.canRedo(), depth: quietH.depth() };
  quietH.adopt(arrangement(1));
  ok(deep(quietH.current()) === beforeAdopt.current && quietH.canUndo() === beforeAdopt.canUndo
    && quietH.canRedo() === beforeAdopt.canRedo && quietH.depth() === beforeAdopt.depth,
    "adopt with nothing new to teach moved the cursor or the stack — it runs on every move and must be inert");

  // The clone discipline the seed and push already carry, extended to adopt: mutate the object
  // handed in, then read history back. A stack that stored the live reference would let the caller
  // rewrite the past, and every deep-compare above would still pass.
  const adoptMutable = { late2: { col: 3, row: 3 } };
  const cloneAdoptH = createHistory(arrangement(1));
  cloneAdoptH.adopt(adoptMutable);
  adoptMutable.late2.col = 999;
  ok(cloneAdoptH.current().late2.col === 3, "mutating the object handed to adopt() reached into history");
  const escapedAdopt = cloneAdoptH.current();
  escapedAdopt.late2.col = 999;
  ok(cloneAdoptH.current().late2.col === 3, "an id adopted into history is handed back as a live reference");

  // --- stepSlot: one arrow step, occupancy-aware and terminating ------------------------------
  const occ = (...cells) => new Set(cells.map(([col, row]) => occupancyKey({ col, row })));
  ok(occupancyKey({ col: 3, row: 4 }) === "3,4", `occupancyKey gave ${occupancyKey({ col: 3, row: 4 })}, expected "3,4"`);

  const STEP_CASES = [
    [{ col: 2, row: 2 }, "ArrowRight", occ(), { col: 3, row: 2 }, "a plain step moves one cell"],
    [{ col: 2, row: 2 }, "ArrowLeft", occ(), { col: 1, row: 2 }, "and in the other direction"],
    [{ col: 2, row: 2 }, "ArrowUp", occ(), { col: 2, row: 1 }, "rows step too"],
    [{ col: 2, row: 2 }, "ArrowDown", occ(), { col: 2, row: 3 }, "…and down"],
    [{ col: 2, row: 2 }, "ArrowRight", occ([3, 2]), { col: 4, row: 2 }, "one occupied cell is SKIPPED, not landed on"],
    [{ col: 2, row: 2 }, "ArrowRight", occ([3, 2], [4, 2], [5, 2]), { col: 6, row: 2 }, "a RUN of occupied cells is skipped whole"],
    [{ col: 1, row: 1 }, "ArrowLeft", occ(), { col: 1, row: 1 }, "a step into the grid edge returns `from` unchanged"],
    [{ col: 1, row: 1 }, "ArrowUp", occ(), { col: 1, row: 1 }, "…on the row axis too"],
    [{ col: MAX_COLS, row: MAX_ROWS }, "ArrowRight", occ(), { col: MAX_COLS, row: MAX_ROWS }, "the far corner is an edge in both axes"],
    [{ col: MAX_COLS, row: MAX_ROWS }, "ArrowDown", occ(), { col: MAX_COLS, row: MAX_ROWS }, "…likewise downward"],
    // THE TERMINATION PROOF, run rather than reasoned about: a naive `while (occupied)` walk hangs
    // here. What it proves is stepSlot's GRID-EDGE return, not its iteration bound — mutating the
    // bound to Infinity leaves both cases below green, because the edge is what the walk reaches.
    // Recorded in the module's own comment too, so the backstop is not mistaken for the mechanism.
    [{ col: 1, row: 3 }, "ArrowRight",
      occ(...Array.from({ length: MAX_COLS - 1 }, (_, i) => [i + 2, 3])),
      { col: 1, row: 3 }, "a fully occupied direction returns `from` unchanged instead of hanging"],
    [{ col: 4, row: 1 }, "ArrowDown",
      occ(...Array.from({ length: MAX_ROWS - 1 }, (_, i) => [4, i + 2])),
      { col: 4, row: 1 }, "…and on the row axis, whose bound is MAX_ROWS rather than MAX_COLS"],
    // THE CLAMP ON THE WAY IN, which nothing above could see: every case up to here hands an
    // ON-GRID `from`, so deleting stepSlot's `clampSlot(from)` left the whole group green. The
    // module's stated guarantee is "never returns an occupied or off-grid slot" — for ANY input,
    // not only for the ones its current callers happen to produce. Clamped first, {99,-3} is the
    // far-right cell of row 1, and one step left from there is a cell; UNclamped, the step walks
    // off the grid immediately and answers the off-grid `from` itself.
    [{ col: 99, row: -3 }, "ArrowLeft", occ(), { col: MAX_COLS - 1, row: 1 },
      "an off-grid `from` is clamped BEFORE the step, not carried into it"],
  ];
  for (const [from, key, taken, want, why] of STEP_CASES) {
    const got = stepSlot(from, DIRS[key], taken);
    ok(got.col === want.col && got.row === want.row,
      `stepSlot(${JSON.stringify(from)}, ${key}) gave ${JSON.stringify(got)}, expected ${JSON.stringify(want)} — ${why}`);
    // Every returned slot, in every case above: on the grid, and never a cell someone else holds.
    ok(got.col >= 1 && got.col <= MAX_COLS && got.row >= 1 && got.row <= MAX_ROWS,
      `stepSlot(${JSON.stringify(from)}, ${key}) returned ${JSON.stringify(got)}, off the ${MAX_COLS}×${MAX_ROWS} grid`);
    const landedOnAPeer = taken.has(occupancyKey(got)) && !(got.col === from.col && got.row === from.row);
    ok(!landedOnAPeer, `stepSlot(${JSON.stringify(from)}, ${key}) landed on the occupied cell ${JSON.stringify(got)}`);
  }
  ok(deep(stepSlot({ col: 2, row: 2 }, undefined, occ())) === deep({ col: 2, row: 2 }),
    "stepSlot with no direction should answer `from`, not throw");
  // …and the no-direction early return answers the CLAMPED `from` rather than the raw one — the
  // other half of the clamp, on the one path that never reaches the walk.
  ok(deep(stepSlot({ col: 99, row: -3 }, undefined, occ())) === deep({ col: MAX_COLS, row: 1 }),
    "stepSlot with no direction handed an off-grid `from` answered off the grid instead of clamping");

  // The caps come from ONE place, asserted BEHAVIOURALLY rather than by grepping the source for a
  // literal: a step off the right edge lands exactly on the module's exported MAX_COLS, so raising
  // the export moves this check with it instead of leaving a stale number to be discovered.
  const toEdge = stepSlot({ col: MAX_COLS - 1, row: 1 }, DIRS.ArrowRight, occ());
  ok(toEdge.col === MAX_COLS, `a step to the right edge landed on column ${toEdge.col}, not the exported MAX_COLS ${MAX_COLS}`);
  const toFloor = stepSlot({ col: 1, row: MAX_ROWS - 1 }, DIRS.ArrowDown, occ());
  ok(toFloor.row === MAX_ROWS, `a step to the bottom edge landed on row ${toFloor.row}, not the exported MAX_ROWS ${MAX_ROWS}`);

  // --- hitSlot: a point in the stage's unscaled local space → a slot ---------------------------
  // Synthetic geometry: three 100px tracks with a 20px gap, so every band edge is arithmetic a
  // reader can check by hand. The REAL geometry is studio-journey's to test — whether the CSS grid
  // still matches what hitSlot assumes is a layout fact, the same split group 12 carries for
  // --stx-slot-w. Tracks start at 0, 120, 240.
  const geom = { cols: [100, 100, 100], rows: [100, 100, 100], colGap: 20, rowGap: 20 };
  for (const [x, y, want, why] of [
    [10, 10, { col: 1, row: 1 }, "a point inside track 1"],
    [99, 99, { col: 1, row: 1 }, "…right up to the end of its 100px track"],
    // THE BAND BOUNDARY ITSELF, which is 120 and not 99: the gap belongs to the track before it, so
    // track 2's band starts where track 2 starts. Nothing else in this table sits ON an edge, and
    // without these two rows `n < edge` → `n <= edge` shifts EVERY track boundary by one pixel and
    // the group stays green.
    [119, 119, { col: 1, row: 1 }, "the last pixel before a track start still belongs to the track before"],
    [120, 120, { col: 2, row: 2 }, "…and the first pixel of a track belongs to that track"],
    [130, 130, { col: 2, row: 2 }, "a point inside track 2"],
    [250, 250, { col: 3, row: 3 }, "a point inside track 3"],
    // THE GAP RULE, decided in the module's doc comment rather than discovered here: a point in the
    // gap between tracks 2 and 3 (x in 220..239) resolves to the track BEFORE it.
    [230, 230, { col: 2, row: 2 }, "a point in the gap between tracks 2 and 3 resolves to the track BEFORE it"],
    [110, 110, { col: 1, row: 1 }, "…and the gap between 1 and 2 likewise"],
    // Past the last track clamps to the LAST TRACK, which on this synthetic geometry is 3 and not
    // MAX_COLS. Stated as the real rule rather than as the cap: hitSlot cannot invent tracks the
    // grid does not have, and a geometry shorter than the cap is exactly what an unoccupied stage
    // reported before #205 gave studio.css explicit grid-template-rows. The cap is asserted below,
    // over a geometry wide enough for it to be reachable.
    [99999, 99999, { col: 3, row: 3 }, "a point past the last track clamps to the last track"],
    [-500, -500, { col: 1, row: 1 }, "a negative point clamps to the origin"],
    [NaN, NaN, { col: 1, row: 1 }, "a non-finite point answers the origin rather than NaN — clampSlot's posture"],
    [Infinity, -Infinity, { col: 1, row: 1 }, "…including the infinities"],
  ]) {
    const got = hitSlot(x, y, geom);
    ok(got.col === want.col && got.row === want.row,
      `hitSlot(${x}, ${y}) gave ${JSON.stringify(got)}, expected ${JSON.stringify(want)} — ${why}`);
  }
  // A geometry with no tracks at all is a stage measured before layout, not a crash: the honest
  // reading of "I cannot measure this" is the origin, exactly as fitLevel answers ZOOM_REST.
  ok(deep(hitSlot(400, 400, {})) === deep({ col: 1, row: 1 }),
    "hitSlot over an unmeasured geometry should answer the origin, not NaN or a throw");
  ok(deep(hitSlot(400, 400, { cols: [100], rows: [100], colGap: 0, rowGap: 0 })) === deep({ col: 1, row: 1 }),
    "hitSlot past the end of a one-track geometry should clamp to that track");

  // Over a geometry the size of the real grid, the far corner IS the cap — and it is read from the
  // module's exports, so raising a cap moves this check with it rather than leaving a stale number.
  const full = {
    cols: Array.from({ length: MAX_COLS }, () => 100),
    rows: Array.from({ length: MAX_ROWS }, () => 100),
    colGap: 0, rowGap: 0,
  };
  ok(deep(hitSlot(99999, 99999, full)) === deep({ col: MAX_COLS, row: MAX_ROWS }),
    `hitSlot past the far corner of a full grid gave ${JSON.stringify(hitSlot(99999, 99999, full))}, expected the exported ${MAX_COLS}×${MAX_ROWS}`);

  // …and it NEVER answers off the grid, whatever it is handed. A geometry with MORE tracks than the
  // cap is what a drifted stylesheet would produce, and the clamp is what keeps it from reaching an
  // attribute through the preview path.
  const over = Array.from({ length: MAX_COLS + 40 }, () => 10);
  const got = hitSlot(99999, 99999, { cols: over, rows: over, colGap: 0, rowGap: 0 });
  ok(got.col <= MAX_COLS && got.row <= MAX_ROWS,
    `hitSlot over a geometry with more tracks than the cap gave ${JSON.stringify(got)}, past ${MAX_COLS}×${MAX_ROWS}`);

  // DIRS is the shared arrow vocabulary — four keys, each a unit step on exactly one axis. A
  // diagonal entry here would silently make stepSlot's single-axis bound the wrong bound.
  ok(Object.keys(DIRS).length === 4, `DIRS declares ${Object.keys(DIRS).length} directions, expected 4`);
  for (const [key, [dc, dr]] of Object.entries(DIRS)) {
    ok(Math.abs(dc) + Math.abs(dr) === 1,
      `DIRS.${key} is [${dc}, ${dr}] — every direction must be a UNIT step on ONE axis, or stepSlot's per-axis bound is wrong`);
  }

  // SPOKEN_MAX moved to module scope at #217 so system/studio-select.mjs can IMPORT the bound
  // rather than re-type it (the MAX_COLS / LABEL_MAX / SLOT_MAX precedent). Pinned here as an
  // export, and asserted to be a usable bound rather than to equal a number typed twice: a cap of 0
  // would make every group sentence say "and N more" with nothing named, and a huge one would
  // restore the unbounded sentence the cap exists to prevent.
  ok(Number.isInteger(SPOKEN_MAX) && SPOKEN_MAX >= 1 && SPOKEN_MAX <= 5,
    `SPOKEN_MAX is ${SPOKEN_MAX}; the live region's naming bound must be a small positive integer`);
  ok(/^export const SPOKEN_MAX/m.test(readFileSync(join(ROOT, "system/studio-verbs.mjs"), "utf8")),
    "SPOKEN_MAX is no longer a module-scope export of studio-verbs.mjs — studio-select.mjs imports it, and a re-declared copy there is a second bound that drifts");

  // --- the GROUP layer (#217): all-or-nothing steps and honest guides -------------------------
  // A group step is NOT a loop over stepSlot, and the cases below are shaped to prove exactly that:
  // stepSlot keeps walking past occupied cells, which for N nodes lands members at DIFFERENT
  // offsets and deforms the selection. Every "blocked" case is therefore asserted by DEEP EQUALITY
  // WITH THE INPUT rather than by "did anything move?", which a partial move passes happily.
  const members = (...pairs) => pairs.map(([id, col, row]) => ({ id, col, row }));
  const G3 = members(["a", 2, 2], ["b", 3, 2], ["c", 4, 2]);

  // groupOccupancy excludes EVERY member, not just an anchor. Its own case first, because the
  // group cases below are all built on it and a wrong set makes them fail for the wrong reason.
  const allSlots = [...G3, { id: "p", col: 6, row: 2 }, { id: "q", col: 2, row: 4 }];
  const occAll = groupOccupancy(allSlots, G3.map((m) => m.id));
  ok(deep([...occAll].sort()) === deep(["2,4", "6,2"]),
    `groupOccupancy gave ${deep([...occAll].sort())}; it must exclude EVERY member and keep every non-member — excluding only an anchor makes a group self-blocking`);
  ok(groupOccupancy(allSlots, []).size === allSlots.length,
    "groupOccupancy with no members should hold every slot — the empty selection is not a licence to overlap");

  const GROUP_CASES = [
    [G3, "ArrowDown", occAll, members(["a", 2, 3], ["b", 3, 3], ["c", 4, 3]),
      "a clean 3-member step moves every member by the same delta"],
    // THE CASE MUTATION 2 IS FOR: with an anchor-only occupancy set, b's origin blocks a's
    // destination and the group cannot move at all.
    [G3, "ArrowRight", occAll, members(["a", 3, 2], ["b", 4, 2], ["c", 5, 2]),
      "members do not block each other — a step INTO a cell another member is vacating is allowed"],
    // THE CASE MUTATION 1 IS FOR. c's destination is the non-member peer at 6,2 — so the WHOLE set
    // stays put. A partially-moved answer (a and b at 4,2/5,2 with c left behind) is the defect,
    // and only the deep-equality assertion below can see it.
    [members(["a", 3, 2], ["b", 4, 2], ["c", 5, 2]), "ArrowRight", occAll,
      members(["a", 3, 2], ["b", 4, 2], ["c", 5, 2]),
      "a step blocked by a NON-MEMBER peer returns the set unchanged, never partially moved"],
    [members(["a", 1, 1], ["b", 2, 1]), "ArrowLeft", new Set(),
      members(["a", 1, 1], ["b", 2, 1]),
      "a step blocked by the grid edge returns the set unchanged, even though only ONE member is at the edge"],
    [members(["a", MAX_COLS, MAX_ROWS]), "ArrowDown", new Set(),
      members(["a", MAX_COLS, MAX_ROWS]), "the far corner is an edge on the row axis too"],
    // R8: a selection of EVERY slot has nothing outside it to block, so only the edge can — which
    // is correct and silent, and is why the blocked sentence names the group (D12).
    [allSlots, "ArrowRight", groupOccupancy(allSlots, allSlots.map((m) => m.id)),
      allSlots.map((m) => ({ ...m, col: m.col + 1 })),
      "a whole-canvas selection moves freely — nothing outside it exists to block it"],
    // …and the edge is the ONLY thing that stops it. Shifted so the rightmost member sits exactly on
    // MAX_COLS with every cell still distinct — mapping them all to one column instead would make
    // this case a duplicate-cell fixture rather than an edge one, which the collision assertion in
    // the loop below catches (and did).
    [allSlots.map((m) => ({ ...m, col: m.col + (MAX_COLS - 6) })), "ArrowRight",
      groupOccupancy(allSlots, allSlots.map((m) => m.id)),
      allSlots.map((m) => ({ ...m, col: m.col + (MAX_COLS - 6) })),
      "…and is stopped only by the edge, with one member on MAX_COLS and the rest behind it"],
    // A 1-member "group" is the case that gets tried first and looks correct under every wrong
    // implementation, so it is pinned as the UNBLOCKED twin of stepSlot rather than left implied.
    [members(["solo", 5, 5]), "ArrowUp", new Set(), members(["solo", 5, 4]),
      "a 1-member group is exactly stepSlot's unblocked answer"],
  ];
  for (const [given, key, taken, want, why] of GROUP_CASES) {
    const got = groupStep(given, DIRS[key], taken);
    ok(deep(got) === deep(want),
      `groupStep(${deep(given)}, ${key}) gave ${deep(got)}, expected ${deep(want)} — ${why}`);
    // Every member of every answer: on the grid, and no two members on one cell.
    const cells = new Set(got.map((m) => occupancyKey(m)));
    ok(cells.size === got.length, `groupStep(${key}) put two members on one cell in ${deep(got)}`);
    for (const m of got) {
      ok(m.col >= 1 && m.col <= MAX_COLS && m.row >= 1 && m.row <= MAX_ROWS,
        `groupStep(${key}) returned ${deep(m)}, off the ${MAX_COLS}×${MAX_ROWS} grid`);
    }
  }
  // The blocked answer is the INPUT, identity included where it can be: returning a fresh
  // equal-looking array is fine, but returning a partially-moved one is the bug, and the case above
  // is the only thing that separates them.
  const blockedIn = members(["a", 3, 2], ["b", 4, 2], ["c", 5, 2]);
  ok(groupStep(blockedIn, DIRS.ArrowRight, occAll) === blockedIn,
    "a blocked groupStep should hand back the very set it was given, not a rebuilt copy of it");

  // groupDelta is the arbitrary-delta form the POINTER path uses; groupStep is written over it, so
  // the two are asserted to agree rather than tested twice.
  ok(deep(groupDelta(G3, 0, 1, occAll)) === deep(groupStep(G3, DIRS.ArrowDown, occAll)),
    "groupDelta and groupStep disagree on the same move — groupStep is meant to BE groupDelta, not a second rule");
  ok(deep(groupDelta(G3, 2, 1, occAll)) === deep(members(["a", 4, 3], ["b", 5, 3], ["c", 6, 3])),
    `a multi-cell delta moved to ${deep(groupDelta(G3, 2, 1, occAll))} — the pointer path translates by an arbitrary anchor delta, not by one cell`);
  ok(deep(groupDelta(G3, 0, 0, occAll)) === deep(G3), "a zero delta must be the identity, not a refusal");
  ok(deep(groupDelta(G3, 99, 0, occAll)) === deep(G3), "a delta that walks the whole set off the grid returns it unchanged");
  // THE MIXED-VALIDITY CASE, and the reason it is here rather than in the totality loop below: that
  // loop only ever feeds WHOLESALE-invalid arrays, which the empty-list return already catches, so
  // a set with SOME unreadable entries slipped between the two and came back TRUNCATED — three in,
  // two out, and the caller cannot tell that from a successful move (PR #263 review, finding 3).
  // Asserted by REFERENCE IDENTITY, not deep equality: a fix that filtered and returned a fresh
  // 3-entry copy would satisfy a deep compare while still not being the all-or-nothing contract.
  const mixed = [{ id: "a", col: 1, row: 1 }, { id: "b", col: NaN, row: 2 }, { id: "c", col: 3, row: 1 }];
  ok(groupDelta(mixed, 1, 0, new Set()) === mixed,
    `a mixed-validity set came back as ${deep(groupDelta(mixed, 1, 0, new Set()))} — groupDelta must hand back the very set it was given, never a partial move that looks like a whole one`);

  // Totality: junk in, never a throw, and never a half-answer.
  for (const junk of [null, undefined, 0, "x", [], {}, NaN, true, [{}], [{ col: "a", row: null }]]) {
    groupStep(junk, DIRS.ArrowUp, occAll);
    groupDelta(junk, junk, junk, junk);
    groupOccupancy(junk, junk);
    guidesFor(junk, junk);
  }
  ok(deep(groupStep(G3, "not a direction", occAll)) === deep(G3),
    "groupStep with no direction should answer the members, not throw or empty them");

  // --- guidesFor: a guide is a claim about an alignment that EXISTS -----------------------------
  const GUIDE_CASES = [
    [[{ col: 3, row: 2 }], [{ col: 3, row: 7 }], { cols: [3], rows: [] },
      "a peer in the same COLUMN draws a column guide and nothing else"],
    [[{ col: 3, row: 2 }], [{ col: 9, row: 2 }], { cols: [], rows: [2] },
      "…and a peer in the same ROW draws a row guide"],
    [[{ col: 3, row: 2 }], [{ col: 3, row: 2 }], { cols: [3], rows: [2] },
      "a peer aligned on both axes draws both"],
    [[{ col: 3, row: 2 }], [{ col: 9, row: 7 }], { cols: [], rows: [] },
      "a peer aligned on neither draws nothing — the empty answer is the common one"],
    // MUTATION 3's case. Dropping the peer requirement makes this return { cols: [3, 4] }: a guide
    // over a column holding ONLY carried members says nothing the reader cannot already see, and
    // one over a column holding neither is the lie AC #3 forbids.
    [[{ col: 3, row: 2 }, { col: 4, row: 2 }], [{ col: 3, row: 6 }], { cols: [3], rows: [] },
      "a column occupied ONLY by carried members draws NO guide — the peer half of the rule"],
    [[{ col: 3, row: 2 }], [], { cols: [], rows: [] }, "no peers at all draws nothing"],
    [[], [{ col: 3, row: 2 }], { cols: [], rows: [] }, "nothing carried draws nothing"],
    [[{ col: 3, row: 2 }], [{ col: 3, row: 5 }, { col: 3, row: 7 }, { col: 3, row: 8 }], { cols: [3], rows: [] },
      "three peers in one column are ONE guide — duplicates are deduped"],
    [[{ col: 5, row: 1 }, { col: 2, row: 1 }], [{ col: 5, row: 4 }, { col: 2, row: 4 }], { cols: [2, 5], rows: [] },
      "several aligned columns come back SORTED ascending, so the mount's choice is deterministic"],
  ];
  for (const [carried, peers, want, why] of GUIDE_CASES) {
    ok(deep(guidesFor(carried, peers)) === deep(want),
      `guidesFor(${deep(carried)}, ${deep(peers)}) gave ${deep(guidesFor(carried, peers))}, expected ${deep(want)} — ${why}`);
  }

  group("verbs", `history: undo/redo round-trip · no-ops at both ends · redo tail discarded · caps at ${HISTORY_MAX} with the index intact · clones in and out (proven by mutation) · adopt teaches every entry a post-mount id, fills MISSING ids only, stays inert and clones both ways — the pick-up call site is studio-journey's · stepSlot over ${STEP_CASES.length} cases incl. two termination proofs and the clamp on the way in, every result on-grid and unoccupied · hitSlot bands, the gap rule, both clamps and an unmeasured geometry · #217's GROUP layer: groupOccupancy excludes every member (not an anchor), groupStep/groupDelta over ${GROUP_CASES.length} cases with every blocked answer asserted by DEEP EQUALITY WITH THE INPUT — the only assertion a partially-moved set fails — incl. the whole-canvas selection, the edge, the member-vacating-a-cell case and the 1-member twin of stepSlot, plus groupStep proven to BE groupDelta rather than a second rule · guidesFor over ${GUIDE_CASES.length} cases incl. the carried-only column that must draw NOTHING · SPOKEN_MAX pinned as the exported bound studio-select.mjs imports · the single-consumer invariant, the group announcements and the guides on a running stage are studio-journey's, and say so`);
}

// --- 14 · the studio orchestrator's pure layer ----------------------------------------------------

{
  // system/studio.mjs's PURE half — arrangeBoard and buildSummary — driven over synthetic in-memory
  // boards. Same voice as groups 12 and 13: every check RUNS the function, none greps for a
  // constant, and anything deliberately vacuous says so out loud.
  //
  // Importing this module here is what proves its Node-import safety, which is not a side benefit:
  // studio.mjs statically imports the canvas, the verbs, the bus, the breadboard, the answer store,
  // the pattern rules, the glossary AND inspect.mjs, and every one of those has to keep its DOM
  // behind a `typeof document` guard for this line to work. The day one of them self-boots at
  // module scope, this group is where it surfaces.
  //
  // THE BOUNDARY THIS GROUP DOES NOT REACH, stated as groups 9, 11 and 13 state theirs. Everything
  // that makes the route real is a running-page fact and none of it is visible from here: that
  // mountStudio places the arrangement BEFORE mounting the verbs (so the history seeds on the real
  // stage), that the three exhibits mount on ACTIVATION and on a HASH rather than only on a click,
  // that the readiness handle resolves in a `finally`, and that initGlossary sitting OUTSIDE that
  // try is what keeps an unknown data-term key failing loud. Their owners are
  // tooling/studio-journey.mjs's /factory pass and the visual-regression gate. An unstated absence
  // would read as CI covering AC #1 when it does not.
  const { arrangeBoard, buildSummary } = await import("../system/studio.mjs");

  // Group 13's hand-written recursive canonical stringify, for the same reason it was written
  // there: `JSON.stringify(v, keys)` puts an array in the REPLACER position, which filters property
  // names at every level and makes every comparison silently vacuous.
  const deep = (v) => {
    if (Array.isArray(v)) return `[${v.map(deep).join(",")}]`;
    if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${deep(v[k])}`).join(",")}}`;
    return JSON.stringify(v);
  };

  // --- arrangeBoard ---------------------------------------------------------------------------
  // The board the page actually renders at rest: the store is in-memory and its answers initialise
  // to null, so /factory always draws draftBoard(DEFAULT_ANSWERS) on a cold load. Driving the REAL
  // drafter rather than a hand-built stand-in is what makes this a claim about the shipped page.
  const drafted = draftBoard(DEFAULT_ANSWERS);
  const arranged = arrangeBoard(drafted);
  ok(arranged.length === drafted.places.length,
    `arrangeBoard laid out ${arranged.length} of the drafted board's ${drafted.places.length} places`);
  ok(arranged.length > 0, "the drafted default board arranges to nothing — every later assertion here would be vacuous");
  // Along ROW 1, one column each, left to right, in board order — which is entry-place-first,
  // because breadboard.mjs builds the entry place first and every edit verb appends after it.
  ok(arranged.every((e, i) => e.col === i + 1 && e.row === 1),
    `arrangeBoard did not lay the board along row 1 in order: ${deep(arranged.map((e) => [e.col, e.row]))}`);
  ok(arranged[0].id === drafted.places[0].id && arranged[0].label === drafted.places[0].label,
    `arrangeBoard put ${JSON.stringify(arranged[0].label)} in column 1; the board's entry place is ${JSON.stringify(drafted.places[0].label)}`);
  // The affordances travel WHOLE. The block prints a count and then lists chips, and a slice here
  // would make the two disagree — the surface would print "3 affordances" over two chips.
  ok(arranged.every((e, i) => e.affordances.length === drafted.places[i].affordances.length),
    "arrangeBoard dropped or added affordances relative to the board it was given");
  ok(deep(arranged.map((e) => e.affordances.map((a) => a.label)))
     === deep(drafted.places.map((p) => p.affordances.map((a) => a.label))),
    "arrangeBoard's affordance labels are not the board's, in the board's order");
  // Every slot is on the grid, and it is on the grid by the CANVAS's definition — arrangeBoard
  // routes through clampSlot rather than clamping in its own way (studio-canvas.mjs:50's rule).
  for (const e of arranged) {
    ok(deep(clampSlot({ col: e.col, row: e.row })) === deep({ col: e.col, row: e.row }),
      `arrangeBoard produced ${deep({ col: e.col, row: e.row })}, which clampSlot does not agree is on the grid`);
  }

  // A board at MAX_PLACES — the widest board the codec will ever hand this function.
  const maxBoard = {
    places: Array.from({ length: MAX_PLACES }, (_, i) => ({
      id: `p${i + 1}`, label: `Place ${i + 1}`,
      affordances: Array.from({ length: MAX_AFFORDANCES }, (_, j) => ({ id: `p${i + 1}a${j + 1}`, label: `Do ${j + 1}` })),
    })),
    connections: [],
  };
  const maxArranged = arrangeBoard(maxBoard);
  ok(maxArranged.length === MAX_PLACES, `a board at MAX_PLACES arranged to ${maxArranged.length} slots, expected ${MAX_PLACES}`);
  ok(maxArranged.every((e) => e.row === 1 && e.col <= MAX_COLS),
    "a board at MAX_PLACES left row 1 or overran the column cap");

  // TOTAL, not merely tolerant. mountStudio resolves its readiness handle in a `finally`, but that
  // is a gate contract and not a licence to let a bad store take the page down before the canvas
  // exists — so every one of these has to come back with an array rather than a throw.
  for (const [given, why] of [
    [null, "null"],
    [undefined, "undefined"],
    [{}, "an object with no places"],
    [{ places: null, connections: null }, "places that are not an array"],
    [{ places: "nope" }, "places that are a string"],
    [{ places: [null, 7, "x"] }, "places that are junk entries"],
    [{ places: [{}] }, "a place with no id, label or affordances"],
    [{ places: [{ id: "p1", label: "A", affordances: "nope" }] }, "affordances that are not an array"],
    [{ places: [{ id: "p1", label: "A", affordances: [null, 3] }] }, "affordances that are junk entries"],
  ]) {
    let got;
    let threw = null;
    try { got = arrangeBoard(given); } catch (e) { threw = e; }
    ok(!threw, `arrangeBoard threw on ${why}: ${threw && threw.message}`);
    ok(Array.isArray(got), `arrangeBoard did not return an array for ${why}`);
  }
  // Every FOLLOW-UP call goes through this rather than calling arrangeBoard bare. The difference is
  // not cosmetic: an unguarded call on a hostile input turns a totality regression into an uncaught
  // TypeError that kills the whole run before group() prints, so the failures the loop above just
  // recorded are never reported and the operator reads a stack trace instead of the check that
  // caught it. Proven by mutation — removing arrangeBoard's places guard did exactly that.
  const arrange = (v) => { try { return arrangeBoard(v); } catch { return null; } };
  ok(deep(arrange(null)) === "[]", "arrangeBoard(null) should be the empty arrangement");
  ok(arrange({ places: [null, 7, "x"] })?.length === 0, "junk place entries should be skipped, not rendered");
  // Junk INSIDE a real place is coerced rather than dropped: the place is real, so the block is
  // real, and a label that is not a string still has to reach textContent as one.
  const coerced = arrange({ places: [{ id: 5, label: 7, affordances: [null, 3, { label: 9 }] }] }) || [];
  ok(coerced.length === 1 && typeof coerced[0].label === "string" && typeof coerced[0].id === "string",
    `a place with non-string id/label gave ${deep(coerced)}; both must reach the DOM as strings`);
  ok(coerced[0].affordances.length === 1 && coerced[0].affordances[0].label === "9",
    `junk affordance entries were not filtered down to the real one: ${deep(coerced[0].affordances)}`);

  // DELIBERATELY VACUOUS, and it says so rather than being left to read as live coverage. MAX_PLACES
  // is 6 and MAX_COLS is 12, and system/build-share.mjs validates a restored board against
  // MAX_PLACES — so no reachable board can overflow row 1, and this case is synthetic by
  // construction. It is kept for the same reason group 1 keeps its `inLibrary: false ⇒ needs`
  // clause: it is the contract a MAX_PLACES raise inherits, already written and already checked, so
  // the raise fails here rather than silently stacking places 13+ onto column 12. Truncation and not
  // a clamp, because a clamp would put two blocks in one cell, which the canvas explicitly refuses.
  ok(MAX_PLACES < MAX_COLS,
    `MAX_PLACES ${MAX_PLACES} is no longer below MAX_COLS ${MAX_COLS} — the truncation clause below has stopped being unreachable and now needs a real case`);
  const wide = arrange({
    places: Array.from({ length: MAX_COLS + 4 }, (_, i) => ({ id: `p${i + 1}`, label: `P${i + 1}`, affordances: [] })),
    connections: [],
  });
  ok(wide && wide.length === MAX_COLS, `an over-wide board arranged to ${wide.length} slots, expected the cap of ${MAX_COLS}`);
  ok(wide && wide.every((e) => e.row === 1), "the truncation spilled onto a second row instead of stopping at the cap");
  ok(deep((wide || []).map((e) => e.col)) === deep(Array.from({ length: MAX_COLS }, (_, i) => i + 1)),
    "the truncated arrangement is not a contiguous 1..MAX_COLS run — a clamp would stack the overflow on the last column");

  // --- buildSummary ---------------------------------------------------------------------------
  // EVERY NUMBER COUNTED FROM THE BOARD. The affordance total is asserted against affordanceCount's
  // own answer rather than against a re-count here: a second count is a second answer waiting to
  // disagree with the one the rest of /build already renders.
  const summary = buildSummary(drafted, DEFAULT_ANSWERS);
  ok(summary.places === drafted.places.length, `buildSummary counted ${summary.places} places, the board has ${drafted.places.length}`);
  ok(summary.affordances === affordanceCount(drafted),
    `buildSummary counted ${summary.affordances} affordances; affordanceCount says ${affordanceCount(drafted)}`);
  ok(summary.connections === drafted.connections.length,
    `buildSummary counted ${summary.connections} connections, the board has ${drafted.connections.length}`);
  ok(summary.affordances > 0 && summary.connections > 0,
    "the drafted default board has no affordances or no connections — the two counts above would be vacuously equal at zero");

  // The pattern reading is patternFor's, not a second opinion, and the label comes out of PATTERNS.
  const want = patternFor({ answers: DEFAULT_ANSWERS, board: drafted });
  ok(summary.patternId === want.id, `buildSummary named ${summary.patternId}; patternFor names ${want.id}`);
  ok(summary.reason === want.reason, "buildSummary paraphrased patternFor's reason instead of carrying it verbatim");
  ok(summary.patternLabel === PATTERNS[want.id].label,
    `buildSummary labelled the pattern ${JSON.stringify(summary.patternLabel)}, PATTERNS says ${JSON.stringify(PATTERNS[want.id].label)}`);

  // An empty board names NO pattern (rule 3) and the label has to come back null rather than a
  // plausible default — the panel prints "None yet" off exactly this.
  const empty = buildSummary({ places: [], connections: [] }, DEFAULT_ANSWERS);
  ok(empty.patternId === null && empty.patternLabel === null,
    `an empty board summarised as ${JSON.stringify(empty.patternId)} / ${JSON.stringify(empty.patternLabel)}, expected null and null`);
  ok(empty.places === 0 && empty.affordances === 0 && empty.connections === 0,
    `an empty board gave non-zero counts: ${deep(empty)}`);
  ok(empty.reason === patternFor({ answers: DEFAULT_ANSWERS, board: { places: [], connections: [] } }).reason,
    "an empty board's reason is not rule 3's own sentence");

  // Total on the same inputs arrangeBoard is total on, and specifically on the two the page can
  // genuinely hand it: a null board (nothing drafted yet) and null answers.
  for (const [board, answers, why] of [
    [null, DEFAULT_ANSWERS, "a null board"],
    [undefined, DEFAULT_ANSWERS, "an undefined board"],
    [{}, DEFAULT_ANSWERS, "a board with no places"],
    [{ places: "nope", connections: 3 }, DEFAULT_ANSWERS, "a board whose fields are junk"],
    [drafted, null, "null answers"],
    [drafted, undefined, "undefined answers"],
    [null, null, "nothing at all"],
  ]) {
    let got;
    let threw = null;
    try { got = buildSummary(board, answers); } catch (e) { threw = e; }
    ok(!threw, `buildSummary threw on ${why}: ${threw && threw.message}`);
    ok(got && typeof got.reason === "string" && got.reason.length > 0,
      `buildSummary returned no reason sentence for ${why} — the panel renders that string verbatim`);
    ok(got && Number.isInteger(got.places) && Number.isInteger(got.affordances) && Number.isInteger(got.connections),
      `buildSummary returned non-integer counts for ${why}: ${deep(got)}`);
  }
  // A board that is not the board SHAPE is treated as no board at all, which is isBoard's answer
  // and not a second one: places counted off a junk object would be a number with nothing behind it.
  ok(buildSummary({ places: "nope", connections: 3 }, DEFAULT_ANSWERS).places === 0,
    "a board whose places are not an array reported a non-zero place count");

  group("studio", `arrangeBoard lays the REAL drafted board along row 1 in board order, entry first, every slot on the grid by clampSlot's own definition · affordances travel whole (the block prints a count over the chips) · total over 9 junk boards, never a throw · the over-wide truncation is DELIBERATELY VACUOUS (MAX_PLACES ${MAX_PLACES} < MAX_COLS ${MAX_COLS}) and guarded by a tripwire that fails the day that stops being true · buildSummary counts places, affordances and connections from the board and asserts the affordance total against affordanceCount rather than re-counting · the pattern id, label and VERBATIM reason are patternFor's and PATTERNS' · an empty board names null · total over 7 shapes incl. null answers · the mount half is studio-journey's, and says so`);
}

// --- 15 · the compile beat's pure pipeline ----------------------------------------------------------
//
// #207 performs the committed pipeline stepwise on /factory's canvas. Everything about WHICH
// components a board becomes is decided before any DOM exists, and that is the half driven here:
// compileSteps over the real drafted board, over all five patterns' fixtures against the real
// generated vocabulary, twice for determinism, and over the nine junk boards group 14 already uses.
//
// THE BOUNDARY THIS GROUP DOES NOT REACH, stated as groups 9, 11, 13 and 14 state theirs. The beat
// itself is a running-page fact and none of it is visible from here: that the swap is POSITIONAL and
// IN PLACE (so data-stx-id, data-col and data-row survive it and the undo history stays coherent),
// that the settled DOM is byte-identical across a compile → revert → compile and across two page
// loads, that the vocabulary is fetched on FIRST COMPILE and never at load, that the crossfade opens
// no view transition, and that reduced motion reaches the same end state. Their owners are
// tooling/studio-journey.mjs's compile pass and tooling/vt-verify.mjs's /factory block. An unstated
// absence would read as CI covering AC #1 and AC #3 whole, when it covers one side of each.
{
  const { STEPS, compileSteps } = await import("../system/studio-compile.mjs");

  // Group 13's hand-written recursive canonical stringify, for the reason it was written there:
  // `JSON.stringify(v, keys)` puts an array in the REPLACER position, which filters property names
  // at every level and makes every comparison here silently vacuous.
  const deep = (v) => {
    if (Array.isArray(v)) return `[${v.map(deep).join(",")}]`;
    if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${deep(v[k])}`).join(",")}}`;
    return JSON.stringify(v);
  };

  // --- 15.1 the board the page actually compiles ------------------------------------------------
  // The store is in-memory (build-questions.mjs:65-73), so at rest /factory is always this board.
  // Asserted AGAINST THE BOARD, never against the literals 3 and "dashboard": a fixture that
  // silently stopped being drafted would pass a literal and fail nothing.
  const drafted = draftBoard(DEFAULT_ANSWERS);
  const run = compileSteps(drafted, DEFAULT_ANSWERS);
  ok(run.state === "rendered", `the drafted default board compiles to "${run.state}", not "rendered"`);
  ok(run.patternId === patternFor({ answers: DEFAULT_ANSWERS, board: drafted }).id,
    `compileSteps named ${run.patternId}; patternFor names ${patternFor({ answers: DEFAULT_ANSWERS, board: drafted }).id}`);
  ok(run.reason === patternFor({ answers: DEFAULT_ANSWERS, board: drafted }).reason,
    "compileSteps paraphrased patternFor's reason instead of carrying it verbatim");
  ok(run.slots.length === slotsFor(run.patternId, drafted).length,
    "compileSteps counted a different number of slots than slotsFor does");
  // READ THROUGH A DEFAULT, not off `run.composition` directly. A regression that makes the drafted
  // board compose nothing is exactly what the `ok()` above catches — and dereferencing `null` here
  // would throw out of module evaluation, so the recorded failure would never be REPORTED and 15.2,
  // 15.3 and the totality loop would never run at all. Group 14's own comment names this
  // anti-pattern; a group that aborts on its own failure is a partial gate the moment it goes red.
  const comp = run.composition || [];
  ok(comp.length === run.slots.length,
    `${comp.length} components composed for ${run.slots.length} slots — the DOM swap aligns them positionally`);
  ok(run.counted.places === drafted.places.length && run.counted.affordances === affordanceCount(drafted)
    && run.counted.connections === drafted.connections.length,
    `the counted numbers are not the board's: ${deep(run.counted)}`);
  // A TRIPWIRE on the measured shape of the DERIVATION — not of the swap, which since #212 is
  // per-SCREEN and 1:1 with places by construction: dashboard derives ONE SLOT PER PLACE, so this
  // fixture's entry screen holds one tile per place. If this moves, slotsFor moved.
  ok(run.slots.length === drafted.places.length,
    `dashboard is 1:1 with places, so ${run.slots.length} slots for ${drafted.places.length} places means the derivation moved`);
  // #212: THE FLOW. Screens are the places, 1:1 — the structural fact applySwap's tripwire enforces
  // on the running page — and the ENTRY screen is the top-level result, slots and composition both,
  // which is "a strict extension of the single compiled screen" as an assertion rather than prose.
  ok(Array.isArray(run.screens) && run.screens.length === drafted.places.length,
    `${run.screens && run.screens.length} screens for ${drafted.places.length} places — one place is one screen`);
  ok(run.screens && deep(run.screens[0].slots) === deep(run.slots)
    && deep(run.screens[0].composition) === deep(run.composition),
    "the entry screen is not the top-level result — the flow must be a strict extension of the single screen");
  // Every step carries a detail sentence, and none of them is empty — the readout renders them.
  ok(deep(run.steps.map((s) => s.id)) === deep(STEPS.map((s) => s.id)), "the run's steps are not STEPS, in order");
  ok(run.steps.every((s) => typeof s.detail === "string" && s.detail.length > 0),
    `a step carries no detail sentence: ${deep(run.steps)}`);
  // Nothing time-, counter- or run-dependent reaches a string the page settles on (call 4 in the
  // module header, checked rather than trusted).
  ok(!/\d{4}-\d{2}-\d{2}|\bT\d{2}:|\d{10,}/.test(deep(run.steps)),
    `a step string carries something that looks like a timestamp or a run id: ${deep(run.steps)}`);

  // --- 15.2 all five patterns, against the REAL generated vocabulary ----------------------------
  // Group 3's shape, reused over compileSteps rather than over compose directly — the point is that
  // the beat's own output is what validates, not a pipeline reassembled for the check.
  // MEASURED PER FIXTURE, not claimed per derivation. dashboard and onboarding derive one slot per
  // PLACE by rule; queue, feed and settings derive from AFFORDANCES and can differ from the place
  // count in either direction — queue happens to coincide on its fixture, which is exactly why this
  // is recorded as what the fixtures measured rather than as a statement about the rules. Since
  // #212 that split is a fact about slotsFor's derivations ONLY, never about the swap: renderScreen
  // renders one whole screen into one wrapper, so composition-vs-slots decides how many components
  // a SCREEN holds, and the canvas aligns screens to wrappers 1:1 whatever the slot count is.
  const matchesPlaces = [];
  const differs = [];
  for (const p of Object.values(PATTERNS)) {
    const board = BOARD_FOR[p.id];
    ok(board, `${p.id} has no fixture in BOARD_FOR — a pattern was added and this gate was not told which board names it`);
    if (!board) continue;
    // settings is only ever named by rule 2, so the fixture has to actually fire it or every
    // assertion about that pattern here is about a pattern no visitor can reach.
    const answers = board === HUB_BOARD ? answersWith({ shape: "overview" }) : answersWith({ shape: { dashboard: "overview", queue: "worklist", feed: "stream", onboarding: "steps" }[p.id] });
    const r = compileSteps(board, answers);
    ok(r.patternId === p.id, `the ${p.id} fixture compiles as ${r.patternId}`);
    if (!p.inLibrary) {
      // DELIBERATELY VACUOUS TODAY, and it says so rather than being left to read as live coverage —
      // group 1 keeps its `inLibrary: false ⇒ needs` clause on the same terms. All five patterns are
      // in the library as of #139, so nothing reaches this branch; it is the contract a SIXTH
      // pattern gets, already written and already checked, so the day one arrives without components
      // the beat refuses honestly here instead of shipping a mock-up (AC #6).
      ok(r.state === "out-of-library", `${p.id} is not in the library but compiles to "${r.state}"`);
      ok(typeof p.needs === "string" && p.needs.length > 0,
        `${p.id} claims inLibrary: false and writes no "needs" sentence — the refusal card has nothing honest to say`);
      continue;
    }
    ok(r.state === "rendered", `${p.id} compiles to "${r.state}", not "rendered"`);
    if (r.state !== "rendered") continue;
    // Composition and slots must agree per pattern — since #212 this decides how many components
    // the ENTRY SCREEN holds (renderScreen renders them as one screen in one wrapper), so a
    // disagreement is a derivation bug rather than a swap misalignment.
    ok(r.composition.length === r.slots.length,
      `${p.id} composed ${r.composition.length} components for ${r.slots.length} slots`);
    (r.slots.length === board.places.length ? matchesPlaces : differs).push(p.id);
    // #212: the swap's unit is the screen, so the per-fixture flow facts are asserted here where
    // every pattern already iterates: one screen per place, and per screen either a composition the
    // same length as its slots or — for a zero-slot S4 screen — none at all, honestly.
    ok(Array.isArray(r.screens) && r.screens.length === board.places.length,
      `${p.id}: ${r.screens && r.screens.length} screens for ${board.places.length} places`);
    for (const [si, screen] of (r.screens || []).entries()) {
      ok(screen.slots.length
        ? (screen.composition || []).length === screen.slots.length
        : screen.composition === null,
      `${p.id} screen ${si + 1} ("${screen.label}") composed ${(screen.composition || []).length} components for ${screen.slots.length} slots`);
    }
    try {
      validateComposition(VOCAB, r.composition);
    } catch (err) {
      ok(false, `${p.id} failed the real vocabulary: ${err.message}`);
    }
    for (const node of r.composition) {
      ok(Object.hasOwn(VOCAB.components, node.name), `${node.name} is not in the generated vocabulary`);
      ok(hasTemplate(node.name), `${node.name} is in the vocabulary but agentic-renderer.mjs has no template for it — renderer and vocabulary have drifted`);
    }
  }
  ok(matchesPlaces.length > 0 && differs.length > 0,
    `the fixtures no longer cover both cardinalities (slots === places: ${matchesPlaces.join(", ") || "none"}; slots !== places: ${differs.join(", ") || "none"}) — slotsFor's place-derived vs affordance-derived split is only a gated fact while both are covered`);

  // --- 15.3 determinism, by comparison rather than by inspection --------------------------------
  // AC #3's pure half. Two runs of the same board must be indistinguishable WHOLE — steps included,
  // because the steps are what the readout and the live region say and a settled readout is part of
  // the settled DOM.
  ok(deep(compileSteps(drafted, DEFAULT_ANSWERS)) === deep(compileSteps(drafted, DEFAULT_ANSWERS)),
    "two runs of compileSteps over the same board differ — the settled canvas is a baseline");
  for (const p of Object.values(PATTERNS)) {
    const board = BOARD_FOR[p.id];
    if (!board) continue;
    ok(deep(compileSteps(board, DEFAULT_ANSWERS)) === deep(compileSteps(board, DEFAULT_ANSWERS)),
      `two runs over the ${p.id} fixture differ`);
  }

  // --- 15.4 totality ----------------------------------------------------------------------------
  // The nine junk boards group 14 drives arrangeBoard over. Junk in → "empty", never a throw: the
  // beat is reader-triggered on a public page and a bad store must refuse, not crash the canvas.
  for (const [given, why] of [
    [null, "null"],
    [undefined, "undefined"],
    [{}, "an object with no places"],
    [{ places: null, connections: null }, "places that are not an array"],
    [{ places: "nope" }, "places that are a string"],
    [{ places: [null, 7, "x"] }, "places that are junk entries"],
    [{ places: [{}] }, "a place with no id, label or affordances"],
    [{ places: [{ id: "p1", label: "A", affordances: "nope" }] }, "affordances that are not an array"],
    [{ places: [{ id: "p1", label: "A", affordances: [null, 3] }] }, "affordances that are junk entries"],
  ]) {
    let got;
    let threw = null;
    try { got = compileSteps(given, DEFAULT_ANSWERS); } catch (e) { threw = e; }
    ok(!threw, `compileSteps threw on ${why}: ${threw && threw.message}`);
    ok(got && got.state === "empty", `compileSteps returned "${got && got.state}" for ${why}, expected "empty"`);
    ok(got && got.composition === null, `compileSteps composed something for ${why}`);
    ok(got && got.screens === null, `compileSteps built screens for ${why} — junk names no flow`);
    ok(got && got.steps.length === STEPS.length && got.steps.every((s) => s.detail),
      `compileSteps dropped its step sentences for ${why} — the readout renders them on every path`);
  }
  // ...and on junk ANSWERS, which is the other input the page can genuinely hand it.
  for (const answers of [null, undefined, { shape: 7 }, "nope"]) {
    let threw = null;
    try { compileSteps(drafted, answers); } catch (e) { threw = e; }
    ok(!threw, `compileSteps threw on answers ${JSON.stringify(answers)}: ${threw && threw.message}`);
  }
  ok(compileSteps(drafted, null).state === "rendered",
    "a board with no answers should still compile — patternFor falls back to dashboard and says so");

  group("compile", `the committed pipeline as data: the REAL drafted board compiles to ${run.patternId} with ${comp.length} components for ${run.slots.length} slots and ${run.screens.length} screens for ${drafted.places.length} places, every number counted from the board and the pattern read from patternFor rather than re-derived · the entry screen IS the top-level result, slots and composition both — the flow as a strict extension, deep-compared · all 5 patterns validate against handoff/verdant/vocabulary.json, every one has composition.length === slots.length, and every fixture's flow is one screen per place with per-screen compositions aligned (or honestly null on a zero-slot screen) · the cardinality split (slots === places for ${matchesPlaces.join(", ")}, slots !== places for ${differs.join(", ")}) stays gated as a fact about slotsFor's derivations · the out-of-library refusal is DELIBERATELY VACUOUS and guarded · determinism proven by deep-comparing two whole runs, screens and steps included · total over 9 junk boards and 4 junk answer sets, never a throw, screens null on junk · the beat itself — the per-screen in-place swap, the tripwire refusal, the byte-identical re-run, the lazy vocabulary fetch, the zero view transitions and the reduced-motion end state — is studio-journey's and vt-verify's, and says so`);
}

// --- 16 · the replay driver's pure layer ------------------------------------------------------------
// Group 11 proves the PROJECTION is faithful to the run at build time. This group proves the DRIVER
// reaches the same board at view time, out of the same two committed files — which is the whole
// reason a reader can be told that what assembles itself on /factory is the run's own work.
//
// Driven over the REAL committed pair, not fixtures: the artifact and the curated trace are the
// driver's actual inputs and a hand-built stand-in would only ever prove the stand-in.
//
// WHAT THIS GROUP CANNOT SEE, stated rather than implied (groups 9, 10, 11, 13, 14 and 15's
// discipline): the bus emission being agent.*-only, the single consumer, the announcements, the
// determinism of the SETTLED DOM, the take-over discriminator and the reduced-motion branch are all
// running-page facts. Their owner is tooling/studio-journey.mjs's replay pass.
{
  const { applyBeat, buildBeats, describeBeat, describeRun, paceBeats, PLAYBACK_MS, REPLAY_SLUG }
    = await import("../system/replay-driver.mjs");
  const { emptyBoard } = await import("../system/board-ops.mjs");

  // Group 13's hand-written recursive canonical stringify, for the reason it was written there:
  // `JSON.stringify(v, keys)` puts an array in the REPLACER position, which filters property names
  // at every level and made every comparison in that group silently vacuous until a mutation sweep
  // caught it.
  const deep = (v) => {
    if (Array.isArray(v)) return `[${v.map(deep).join(",")}]`;
    if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${deep(v[k])}`).join(",")}}`;
    return JSON.stringify(v);
  };

  const artifactText = readFileSync(join(ROOT, `replay/${REPLAY_SLUG}.json`), "utf8");
  const traceText = readFileSync(join(ROOT, `traces/${REPLAY_SLUG}.jsonl`), "utf8");
  const committedBoard = JSON.parse(readFileSync(join(ROOT, `replay/${REPLAY_SLUG}.board.json`), "utf8"));
  const artifact = JSON.parse(artifactText);

  const traceSteps = traceText.trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.type === "step");
  const wantNotes = traceSteps.filter((s) => s.kind === "text" && String(s.text || "").trim()).length;
  const wantRefusals = traceSteps.filter((s) => s.kind === "tool" && s.denied).length;

  // --- 1 · the join ------------------------------------------------------------------------------
  // Every count asserted against the FILES, never against a literal: a typed 18 would keep passing
  // the day the artifact is regenerated from a different run.
  const built = buildBeats(artifact, traceText);
  ok(!built.error, `buildBeats refused the committed pair: ${built.error}`);
  const kinds = (k) => built.beats.filter((b) => b.kind === k).length;
  ok(kinds("op") === artifact.ops.length,
    `${kinds("op")} op beats for ${artifact.ops.length} committed ops — the join dropped or invented one`);
  ok(kinds("note") === wantNotes, `${kinds("note")} note beats for ${wantNotes} narration steps in the trace`);
  ok(kinds("refusal") === wantRefusals, `${kinds("refusal")} refusal beats for ${wantRefusals} denied steps in the trace`);
  ok(built.skipped === traceSteps.length - built.beats.length,
    `${built.skipped} steps reported skipped, but ${traceSteps.length - built.beats.length} of the trace's steps became no beat — the surface would state a number that is not the drop`);
  ok(built.beats.every((b, i) => i === 0 || b.seq > built.beats[i - 1].seq),
    "the beats are not in seq order — narration would land away from the ops it explains");

  // --- 2 · the reproduce claim, restated at view time --------------------------------------------
  // gen-replay proves at BUILD time that applying the projected ops rebuilds the committed board.
  // This proves the DRIVER'S applier reaches the same board from the same beats, which is what makes
  // "the finished canvas is the run's real outcome" a checkable sentence rather than a claim.
  const playAll = (beats) => beats.reduce((b, beat) => applyBeat(b, beat).board, emptyBoard());
  const reproduced = playAll(built.beats);
  ok(deep(reproduced) === deep(committedBoard),
    "playing every op beat does NOT rebuild replay/<slug>.board.json — the canvas would settle on a board the run never built");

  // --- 3 · the mutation that decides whether case 2 is real ---------------------------------------
  // Without this the deep-compare could be vacuously true (the recorded memory "the check that cannot
  // fail": every #137 defect survived a green gate the same way). Group 11 case 2 does the same
  // thing to the same artifact one layer up.
  const corrupted = JSON.parse(artifactText);
  const firstAdd = corrupted.ops.find((o) => o.op === "place.add");
  firstAdd.params.label = `${firstAdd.params.label} (corrupted)`;
  const mutatedBuilt = buildBeats(corrupted, traceText);
  ok(!mutatedBuilt.error, `the corrupted-label mutation did not build beats at all (${mutatedBuilt.error}) — it must fail the COMPARE, not the join`);
  ok(deep(playAll(mutatedBuilt.beats)) !== deep(committedBoard),
    "a corrupted op label still reproduced the committed board — the comparison in case 2 is vacuous");

  // --- 4 · the pacing is real, not an index ------------------------------------------------------
  const pacing = paceBeats(built.beats, PLAYBACK_MS);
  const sum = pacing.beats.reduce((a, b) => a + b.delayMs, 0);
  ok(Math.abs(sum - PLAYBACK_MS) < 1, `the schedule totals ${sum.toFixed(2)} ms, not the ${PLAYBACK_MS} ms budget`);
  ok(pacing.beats[0].delayMs === 0, "the first beat waits before it plays — the run starts on arrival");
  // The RATIOS, which is what "the run's own pacing, proportionally" means. An index-derived
  // schedule (every gap equal) passes a sum check and fails this one.
  let ratioBad = 0;
  for (let i = 2; i < pacing.beats.length; i += 1) {
    const gapReal = built.beats[i].atMs - built.beats[i - 1].atMs;
    const gapPrev = built.beats[i - 1].atMs - built.beats[i - 2].atMs;
    if (!gapPrev) continue;
    const want = gapReal / gapPrev;
    const got = pacing.beats[i - 1].delayMs ? pacing.beats[i].delayMs / pacing.beats[i - 1].delayMs : want;
    if (Math.abs(want - got) > 1e-6) ratioBad += 1;
  }
  ok(ratioBad === 0, `${ratioBad} consecutive gaps do not keep the run's own ratio — the pacing is not the run's`);
  ok(pacing.scale !== 1 && pacing.scale > 0 && pacing.scale < 1,
    `scale is ${pacing.scale} — the committed run is longer than the playback budget, so it must be compressed and the chrome must have a computed factor to state`);
  // A RANGE, never the literal factor: the number moves the day the artifact or PLAYBACK_MS does,
  // and a typed 9.3 would then be a second place to edit that nothing points at.
  const run = describeRun(artifact, built.meta, pacing, pacing.beats);
  ok(Math.abs(run.compression - pacing.realMs / PLAYBACK_MS) < 1e-9,
    "the compression the chrome prints is not realMs / budgetMs — it is the gap multiplier, so the sentence would claim the run played at 0.1×");
  ok(run.compression > 2 && run.compression < 50,
    `the stated compression is ${run.compression.toFixed(1)}× — outside any range that reads as honest on the page`);

  // The wall-clock branch, built at the same time as the compressed one so the product call is one
  // constant rather than a re-plan (replay-driver.mjs's PLAYBACK_MS comment).
  const wall = paceBeats(built.beats, null);
  ok(wall.scale === 1, `PLAYBACK_MS = null gave scale ${wall.scale}, not 1 — "play the real gaps" is not reachable`);
  ok(Math.abs(wall.beats.reduce((a, b) => a + b.delayMs, 0) - wall.realMs) < 1,
    "the wall-clock schedule does not total the run's real span");
  ok(describeRun(artifact, built.meta, wall, wall.beats).compression === 1,
    "the wall-clock branch still states a compression factor");

  // --- 5 · determinism ---------------------------------------------------------------------------
  // The settled canvas is a pixel baseline (AC #2 and #7), so two independent parses must produce a
  // byte-identical beat list. A Date.now(), a counter or a random value anywhere in the pure layer
  // shows up here.
  ok(JSON.stringify(buildBeats(JSON.parse(artifactText), traceText))
    === JSON.stringify(buildBeats(JSON.parse(artifactText), traceText)),
    "two independent parses of the same committed pair produce different beats — something non-deterministic reaches the driver's output");

  // --- 6 · totality by contract ------------------------------------------------------------------
  // A bad fetch must not crash the page before the canvas exists (studio.mjs:78-88's call,
  // inherited). Eight junk inputs, each answering { beats: [] } with a NON-EMPTY error, never a
  // throw — the error is what the honest card prints.
  const backwards = [traceSteps[0], { ...traceSteps[1], seq: 0 }];
  const traceLines = traceText.trim().split("\n");
  const JUNK = [
    [null, traceText, "a null artifact"],
    [{}, traceText, "an artifact with no ops"],
    [{ ops: null }, traceText, "an artifact whose ops are not an array"],
    [undefined, traceText, "an undefined artifact"],
    ["not an artifact", traceText, "a string artifact"],
    [artifact, traceLines.slice(1).join("\n"), "a trace with no meta line"],
    [{ ...artifact, ops: [{ ...artifact.ops[0], fromStep: 9999 }] }, traceText, "an op whose fromStep matches no step"],
    [{ ...artifact, ops: [artifact.ops[0], { ...artifact.ops[1], fromStep: artifact.ops[0].fromStep }] }, traceText, "two ops claiming one step"],
    [artifact, [traceLines[0], JSON.stringify(backwards[1]), JSON.stringify(backwards[0]), traceLines[traceLines.length - 1]].join("\n"), "a trace whose seqs go backwards"],
    [artifact, "{ not json", "a trace that is not JSON"],
  ];
  for (const [a, t, why] of JUNK) {
    let got;
    let threw = null;
    try { got = buildBeats(a, t); } catch (e) { threw = e; }
    ok(!threw, `buildBeats threw on ${why}: ${threw && threw.message}`);
    ok(got && Array.isArray(got.beats) && got.beats.length === 0, `buildBeats built beats from ${why}`);
    ok(got && typeof got.error === "string" && got.error.length > 0,
      `buildBeats returned no error string for ${why} — the honest card has nothing to print`);
  }
  // The one degradation that is NOT an error: the trace fetch failed, the artifact did not. The ops
  // still play and the surface states that the words are missing.
  const traceless = buildBeats(artifact, null);
  ok(!traceless.error && traceless.beats.length === artifact.ops.length && traceless.traceless === true,
    "a missing trace is treated as a failure instead of an op-only degradation — a readable artifact would show nothing at all");
  ok(deep(playAll(traceless.beats)) === deep(committedBoard),
    "the op-only degradation does not reach the committed board — the fallback would draw a different run");

  // applyBeat is total too: a hostile beat answers a refusal change rather than throwing, because
  // action-bus.mjs:71-81 turns a thrown refusal into a console line the reader never sees.
  for (const bad of [null, {}, { kind: "op", op: "nope", params: {} }, { kind: "op", op: "place.rename", params: { placeId: "p9", label: "x" } }, { kind: "note" }]) {
    let threw = null;
    let got;
    try { got = applyBeat(committedBoard, bad); } catch (e) { threw = e; }
    ok(!threw, `applyBeat threw on ${JSON.stringify(bad)}: ${threw && threw.message}`);
    ok(got && deep(got.board) === deep(committedBoard), `applyBeat changed the board on ${JSON.stringify(bad)}`);
  }
  ok(applyBeat(committedBoard, { kind: "op", op: "nope", params: {} }).changes.some((c) => c.kind === "refused"),
    "a refused op produced no refusal change — the live region would say nothing");

  // --- 7 · the chrome copies, it does not compute ------------------------------------------------
  // Asserted by IDENTITY against the parsed files, never by re-typing the strings: a paraphrase of
  // meta.label or of the artifact's label is exactly what replay/README.md forbids.
  ok(run.label === artifact.label, "the chrome's label is not the artifact's, verbatim");
  ok(run.traceLabel === built.meta.label, "the chrome's honesty line is not the trace meta's label, verbatim");
  for (const [key, from] of [["model", "model"], ["sessionId", "sessionId"], ["startedAt", "startedAt"], ["durationMs", "durationMs"], ["tracePath", "curatedTrace"], ["briefPath", "brief"], ["boardPath", "board"]]) {
    ok(run[key] === artifact.source[from], `describeRun's ${key} is not artifact.source.${from}, verbatim`);
  }
  ok(run.opCount === artifact.ops.length && run.noteCount === wantNotes && run.refusalCount === wantRefusals,
    "the chrome's counts are not the beats' — a number on the page would be a claim rather than a count");
  // Every beat gets a sentence. A blank one is a beat the live region announces as silence.
  ok(pacing.beats.every((b) => describeBeat(b).trim().length > 0), "a beat has no announceable sentence");
  // THE TWO DURATIONS ARE DIFFERENT NUMBERS, and the panel prints both inches apart: `durationMs` is
  // the run's whole session and `realMs` is first beat to last, shorter by the steps that are not
  // played. The chrome sentence is DOM-side and out of reach here, so what is pinned is the reason
  // it has to name its span — the day a run's skipped steps take no measurable time these collapse,
  // and whoever sees this go red should read renderChrome's `span` before deleting it
  // (PR #240 review, finding 4).
  ok(built.skipped > 0 && run.realMs < run.durationMs,
    `the run's played span (${run.realMs} ms) is no longer shorter than its session (${run.durationMs} ms) over ${built.skipped} skipped steps — the panel's two durations are the same number now, so the "Of that" sentence is misleading rather than clarifying`);

  // --- 8 · the artifact's op histogram, as a TRIPWIRE ---------------------------------------------
  // The committed run is ADD-ONLY: 4 place.add, 7 affordance.add, 7 connect. The driver's
  // place-removed branch and the rename half of place-changed are written, correct and NOT exercised
  // by it — so this pins what the artifact reaches, and the day a second run carries a rename or a
  // remove it fails and forces someone to look at that branch instead of shipping it untested.
  // studio-compile.mjs:38-53 and group 1's vacuous in-library clause make the same move.
  const histogram = {};
  for (const op of artifact.ops) histogram[op.op] = (histogram[op.op] || 0) + 1;
  ok(deep(histogram) === deep({ "place.add": 4, "affordance.add": 7, connect: 7 }),
    `the committed artifact's op mix changed to ${JSON.stringify(histogram)} — the driver's rename/remove reflection branches were never exercised by the old one, so read them before this line is updated`);

  group("replay driver", `the committed pair joins into ${built.beats.length} beats (${kinds("op")} ops counted from the artifact, ${kinds("note")} narration and ${kinds("refusal")} refusals counted from the trace, ${built.skipped} steps stated as skipped) · playing every op beat REPRODUCES replay/${REPLAY_SLUG}.board.json exactly, and a corrupted-label mutation makes that compare go red · the schedule keeps the run's own gap RATIOS and totals the budget, PLAYBACK_MS = null plays the real gaps · the chrome's label, meta and paths are the committed files' verbatim, by identity · total over 10 junk pairs and 5 hostile beats, never a throw, and a missing trace degrades to ops-only rather than failing · the artifact's ADD-ONLY op mix is pinned as a tripwire over the unexercised rename/remove branches · the bus emission, the single consumer, the announcements and the take-over are studio-journey's, and say so`);
}

// --- 17 · the single-file export's pure layer (#210) ---------------------------------------------
// system/studio-export.mjs, driven under Node over the REAL COMMITTED STYLESHEETS. That is the whole
// design of this group rather than a detail: a synthetic CSS fixture would make the zero-request
// assertion a statement about a string this file wrote, and the one thing it has to be is a
// statement about what the four shipped packs actually contain.
//
// AND IT STATES ITS BOUNDARY, the way groups 9, 11, 13 and 16 do. Nothing here can open a file://
// document, count the requests a browser really makes, watch the rail hide both ways, or see a
// download happen. Those belong to tooling/studio-journey.mjs's #210 half and to spike 3, whose cold
// opens on all three engines are recorded in .claude/reports/studio-export-keep-rail-210-spike3.md.
// What this group owns is the STRING: what is in it, what is not, and that the same input always
// produces the same bytes.
{
  const CSS_DIR = join(ROOT, "system");
  const contractCss = readFileSync(join(CSS_DIR, "tokens.contract.css"), "utf8");
  const componentsCss = readFileSync(join(CSS_DIR, "components.css"), "utf8");

  // The shipped packs, taken from system/dock.mjs's HARD ALLOWLIST rather than typed here. dock.mjs
  // is a DOM module and cannot be imported under Node, so the allowlist is read out of PACK_RE —
  // which is the same constant the dock's own switcher is gated on, so a pack added to the dock
  // without being added there fails HERE too rather than silently going ungated.
  const dockSrc = readFileSync(join(CSS_DIR, "dock.mjs"), "utf8");
  const packRe = dockSrc.match(/const PACK_RE = \/\\\/system\\\/tokens\\\.\(([a-z0-9|-]+)\)\\\.css\$\/;/);
  ok(packRe !== null, "system/dock.mjs's PACK_RE could not be read — this group would be testing a hand-typed pack list");
  const PACK_IDS = packRe ? packRe[1].split("|") : [];
  ok(PACK_IDS.length >= 4, `only ${PACK_IDS.length} packs read out of PACK_RE — expected the four shipped ones`);

  // Comments are stripped before the @import assertion, and that is the honest predicate rather than
  // a loosening: the claim is "this document makes no network request", and prose inside a comment
  // makes none. tokens.neutral.css's header explains why it carries no @import, in a sentence
  // containing the word — a bare substring test would fail on the pack that is doing it right.
  const decommented = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

  const screensFixture = [{
    name: "Overview", type: "dashboard",
    slots: [{ html: "<div class=\"ds-metric-tile\">x</div>" }],
    nav: [],
  }];

  for (const pack of PACK_IDS) {
    const packCss = readFileSync(join(CSS_DIR, `tokens.${pack}.css`), "utf8");
    const out = exportHtml({
      title: "A prototype from ux factory",
      css: [contractCss, packCss, componentsCss].join("\n"),
      screens: screensFixture,
      meta: { screens: 1, places: 1, affordances: 0, connections: 0 },
    });
    const bare = decommented(out);

    // 1 · THE ZERO-REQUEST CLAIM, asserted on the produced string over real committed input. THIS
    //     CASE CAN FAIL WITH NO MUTATION AT ALL: system/tokens.saulera.css:19 carries a live
    //     `@import url("../fonts/fonts.css")` pointing at a directory that does not exist, and the
    //     dock offers saulera to every reader — so deleting the strip turns this red on committed
    //     bytes rather than on a fixture invented to catch it.
    ok(!bare.includes("@import"), `the export under the ${pack} pack emitted an @import — a file that reaches the network is not a file that runs anywhere`);
    ok(!/url\s*\(/i.test(bare), `the export under the ${pack} pack emitted a url() — same request, different at-rule`);
    ok(!bare.includes("<script"), `the export under the ${pack} pack emitted a <script>`);
    ok(!/\bfetch\s*\(/.test(bare) && !/\bhistory\./.test(bare) && !/\bimport\s/.test(bare),
      `the export under the ${pack} pack emitted a fetch, a history call or a module import — all three fail on file://`);

    // 2 · …AND THE PACK SURVIVED THE STRIP, which is the half that would have caught the real bug.
    //     The plan's own `/@import[^;]*;/g` matches the word inside saulera's HEADER COMMENT and
    //     consumes to the at-rule's semicolon three lines later, taking the closing `*/` with it —
    //     the comment then swallows `:root {` and the whole pack drops out, silently, leaving a
    //     document that passes case 1 and wears the contract's fallback colours. Measured during
    //     spike 3: 449 sheet rules → 447. `--color-amber` is saulera's own primitive and appears in
    //     NO other pack, so this pair is a genuine discriminator rather than a tautology.
    //     STRUCTURAL, not a substring hunt, and that distinction was earned by a mutation sweep: put
    //     the plan's regex back and `--color-amber` is STILL IN THE STRING — what it loses is the
    //     `:root {` that made those lines declarations rather than stray text, and the `*/` that
    //     kept the comment closed. A string test cannot see either. Comment markers and braces must
    //     BALANCE, and every `:root` the sources carried must still be there.
    const source = [contractCss, packCss, componentsCss].join("\n");
    const stripped = stripImports(source);
    const count = (s, re) => (s.match(re) || []).length;
    //     PRESERVED, not balanced. The sources do not balance to begin with — a comment that quotes
    //     `/*` in its prose adds an opener with no closer — so "equal counts" would be red on
    //     correct input. What must hold is that the strip removed NEITHER marker: the plan's regex
    //     eats a closing `*/`, and that is the whole of the bug.
    ok(count(stripped, /\/\*/g) === count(source, /\/\*/g) && count(stripped, /\*\//g) === count(source, /\*\//g),
      `the strip removed a comment marker under the ${pack} pack (${count(source, /\/\*/g)}→${count(stripped, /\/\*/g)} openers, ${count(source, /\*\//g)}→${count(stripped, /\*\//g)} closers) — an unclosed comment swallows every rule after it`);
    ok(count(stripped, /\{/g) === count(source, /\{/g) && count(stripped, /\}/g) === count(source, /\}/g),
      `the strip changed the brace count under the ${pack} pack — it removed a rule, not an at-rule`);
    ok(count(stripped, /:root/g) === count(source, /:root/g),
      `the strip lost a :root block under the ${pack} pack — this is exactly what the plan's own /@import[^;]*;/g did to saulera`);
    //     (A fourth assertion stood here — `out.includes(":root")` — and was removed as vacuous by
    //     PR #241's review, Low 4: exportHtml emits `<style>:root{…}</style>` unconditionally
    //     (studio-export.mjs:246), so it was true for every input including `css: ""` and could not
    //     go red under any mutation. The :root COUNT above is the check it was pretending to be.)
    if (pack === "saulera") {
      ok(/--color-amber:\s*#/.test(out),
        "the export under saulera lost --color-amber — saulera's primitives are the only pack values that prove the pack itself travelled");
    } else {
      ok(!/--color-amber:\s*#/.test(out),
        `--color-amber turned up under the ${pack} pack, so it no longer discriminates and case 2 proves nothing`);
    }
  }

  // 3 · stripImports itself, on the two shapes that matter and nothing else. Driven, not grepped.
  ok(stripImports('/* @import must precede all rules */\n@import url("x.css");\n:root{--a:1}').includes("--a:1"),
    "stripImports dropped a declaration that followed an @import preceded by a comment mentioning one");
  ok(!decommented(stripImports('/* @import prose */\n@import url("x.css");\n:root{--a:1}')).includes("@import"),
    "stripImports left a real @import at-rule behind");
  ok(stripImports("/* @import prose, never closed\n@import url(\"x.css\");").includes("@import prose"),
    "stripImports mangled an unterminated comment instead of copying it to the end, which is what a parser does");
  ok(stripImports(null) === "" && stripImports(undefined) === "" && stripImports(42) === "",
    "stripImports is not total over a non-string");

  // 4 · THE FLOW'S STRUCTURE (#212) — the studio's artifact is now a multi-screen document. One
  //     <section> per screen with GENERATED ids (s1…sN), every href a fragment resolving to a
  //     section id in the SAME document, and the one-screen-at-a-time rule present in the
  //     has-hides direction (the graceful-degradation half of AC #5: an engine without :has()
  //     hides nothing and stacks the screens with working fragment jumps).
  //     (#210's placement table, caps import and out-of-source-order cases retired with the
  //     coordinates themselves — the flow's layout is board order × affordance order, and the
  //     share link is the arrangement carrier per the epic PRD §3.)
  const everyHrefResolves = (doc) => {
    const ids = new Set([...doc.matchAll(/<section class="sx-screen" id="([^"]+)">/g)].map((match) => match[1]));
    return [...doc.matchAll(/href="([^"]+)"/g)].every(([, h]) => h.startsWith("#") && ids.has(h.slice(1)));
  };
  const flowFixture = [
    { name: "Overview", type: "dashboard", slots: [{ html: "<div class=\"ds-metric-tile\">a</div>" }], nav: [{ label: "Open the queue", target: 2 }] },
    { name: "Queue", type: "queue", slots: [{ html: "<div class=\"ds-list-row\">b</div>" }], nav: [{ label: "Back to overview", target: 1 }] },
  ];
  const flowDoc = exportHtml({ title: "t", css: "", screens: flowFixture, meta: { screens: 2 } });
  ok((flowDoc.match(/<section class="sx-screen" id="s\d+">/g) || []).length === 2,
    "two screens did not emit two sections");
  ok(flowDoc.includes('id="s1"') && flowDoc.includes('id="s2"'), "the section ids are not the generated s1…sN");
  ok((flowDoc.match(/href="#s\d+"/g) || []).length === 2, "the two nav entries did not become two fragment anchors");
  ok(everyHrefResolves(flowDoc), "an emitted href does not resolve to a section in the document");
  ok(!/href="(?!#)/.test(flowDoc), "the export emitted a non-fragment href — a link that leaves the file is a request");
  ok(flowDoc.includes(".sx-flow:has(:target) .sx-screen:not(:target){display:none}"),
    "the one-screen-at-a-time rule is missing or not written in the has-hides direction");

  // 5 · NO DEAD NAV, in both of the ways a link can die: a one-screen flow has nowhere to lead and
  //     must emit no anchors at all, and a nav entry pointing past the last section is dropped
  //     rather than emitted as an href to nowhere. A zero-slot screen (rule S4 — a destination the
  //     board drew no work in) still emits its section, carrying the honest sentence.
  const oneScreen = exportHtml({ title: "t", css: "", screens: [{ name: "Only", type: "queue", slots: [{ html: "<i>a</i>" }], nav: [] }], meta: {} });
  ok((oneScreen.match(/<section /g) || []).length === 1 && !oneScreen.includes("<a href"),
    "a one-screen flow emitted nav anchors — dead links in a single-screen file");
  const ghost = exportHtml({ title: "t", css: "", screens: [{ name: "Only", type: "queue", slots: [{ html: "<i>a</i>" }], nav: [{ label: "ghost", target: 4 }] }], meta: {} });
  ok(!ghost.includes("<a href"), "a nav entry past the last section was emitted anyway — an href to nowhere");
  const bareScreen = exportHtml({ title: "t", css: "", screens: [{ name: "Bare", type: "queue", slots: [], nav: [] }], meta: {} });
  ok(bareScreen.includes("sx-screen-empty") && bareScreen.includes("Nothing to act on here"),
    "a zero-slot screen did not carry the honest empty sentence");

  // 6 · THE HONESTY SENTENCES, BY IDENTITY against build-keep.mjs's exported constants — which is
  //     only possible because they ARE constants, and is why #210 lifted them out of specMarkdown
  //     rather than re-typing them here. BOTH DIRECTIONS: the two-claims paragraph says "the TOKEN
  //     VALUES above are yours", which is FALSE on a /factory at rest where nobody imported
  //     anything, so the negative half is the one that catches a regression to always-emit.
  //     The document is HTML and every text field goes through escape-once, so these sentences
  //     arrive entity-escaped ("site's" → "site&#39;s"). DECODED here rather than re-encoded in the
  //     assertion: re-encoding would make this a check against a second copy of the escaper, and
  //     decoding keeps it an identity against build-keep.mjs's own constant.
  const unesc = (s) => s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  const claimsOn = unesc(exportHtml({ title: "t", css: "", inlineTokens: { "--color-accent": "#b5179e" }, screens: screensFixture, meta: { hasVisitorTokens: true, packLabel: "your own derived palette" } }));
  for (const line of TWO_CLAIMS) {
    ok(claimsOn.includes(line), `the export's provenance block does not carry build-keep.mjs's line verbatim: "${line.slice(0, 50)}…"`);
  }
  ok(claimsOn.includes("Wearing: your own derived palette."), "the export does not name whose design values it is wearing");
  ok(!claimsOn.includes(NO_DESIGN_IMPORTED), "the export claims BOTH that a design was imported and that none was");
  const claimsOff = unesc(exportHtml({ title: "t", css: "", screens: screensFixture, meta: { hasVisitorTokens: false } }));
  ok(claimsOff.includes(NO_DESIGN_IMPORTED), "an export wearing the site's own pack does not say so");
  for (const line of TWO_CLAIMS) {
    ok(!claimsOff.includes(line), "an export with NO visitor tokens still claims \"the TOKEN VALUES above are yours\" — the one dishonest line this artifact could carry");
  }
  //     (#210's `omitted` truncation note retired with the branch that produced it: screens travel
  //     whole — there is no arrangement to cap them against — and the provenance block claims no
  //     geometry, so there is nothing left for the note to state.)

  // 8 · TOTAL BY CONTRACT over junk. Never a throw, always a document.
  const junk = [
    undefined, {}, { screens: null }, { screens: "nope" }, { screens: [null, 3, "x"] },
    { css: 42, screens: [{ name: {}, slots: "nope", nav: 7 }] },
    { title: {}, meta: "meta", inlineTokens: [1, 2] },
    { screens: [{ name: "a", slots: [{ html: 1 }], nav: [{ label: "x", target: 0 }] }] },
    { screens: [{ slots: [null, 3], nav: [null, "x"] }] },
    { screens: [{ name: "a", slots: [{}], nav: [{ target: 1.5 }] }] },
  ];
  for (const [i, input] of junk.entries()) {
    let doc = null;
    let threw = null;
    try { doc = exportHtml(input); } catch (err) { threw = err; }
    ok(!threw, `exportHtml threw on junk input ${i}: ${threw && threw.message}`);
    ok(typeof doc === "string" && doc.startsWith("<!doctype html>") && doc.includes("</html>"),
      `exportHtml did not produce a whole document for junk input ${i}`);
  }

  // 9 · DETERMINISM, and it is a real claim rather than a formality: two exports of the same board
  //     must be byte-identical, which is what makes the artifact a description of the board rather
  //     than of the moment it was pressed. specMarkdown interpolates a build date and is allowed to;
  //     this must not, which is why the drafted `builtOn` field was dropped rather than left unused.
  const once = exportHtml({ title: "t", css: contractCss, inlineTokens: { "--color-accent": "#b5179e" }, screens: screensFixture, meta: { screens: 1, places: 1, hasVisitorTokens: true } });
  const twice = exportHtml({ title: "t", css: contractCss, inlineTokens: { "--color-accent": "#b5179e" }, screens: screensFixture, meta: { screens: 1, places: 1, hasVisitorTokens: true } });
  ok(once === twice, "two exports of the same board differ — something in the document carries a time, a counter or an id");
  ok(!/\b20\d\d-\d\d-\d\d\b/.test(once), "the export carries a date — two exports of the same board would differ across midnight");

  group("export", `the document driven over the REAL committed stylesheets — the contract, components.css and each of the ${PACK_IDS.length} packs dock.mjs's own PACK_RE allowlists — with the zero-request claim asserted on the OUTPUT and the saulera pack proven to SURVIVE the strip, the pair that would have caught the plan's original regex eating :root (and case 1 goes red on committed bytes with no mutation, because tokens.saulera.css carries a live @import) · #212's flow structure: one section per screen with generated s1…sN ids, every href a fragment resolving inside the document, no non-fragment href at all, the has-hides :has() rule present, a one-screen flow emitting no dead nav, an over-range nav entry dropped, and a zero-slot S4 screen carrying the honest sentence · both honesty branches asserted by IDENTITY against build-keep.mjs's constants, including the negative half — an export with no visitor tokens must NOT claim the token values are theirs · total over ${junk.length} junk inputs · byte-identical across two runs. The cold file:// render, the ACTUAL request count, the rail's both-ways hide and the download are tooling/studio-journey.mjs's and spike 3's, and say so`);
}

// --- 18 · the docs chain ----------------------------------------------------------------------------
//
// #211's two pure functions, driven the way groups 11 and 16 drive theirs: over the REAL committed
// artifacts, with every count derived from the files rather than typed, and with the MUTATION that
// decides whether each compare is real rather than decorative.
//
// What this group does NOT reach: that the catalog RENDERS any of this. There is no catalog yet
// (#215) and this ticket deliberately adds no viewer block, so the join is gated as a pure function
// and its presentation is #215's — the same boundary statement groups 9, 11, 13 and 16 make about
// the running-page facts they cannot touch.
{
  const PACK = JSON.parse(readFileSync(join(ROOT, "handoff/verdant/pack.json"), "utf8"));
  const GRAPH = JSON.parse(readFileSync(join(ROOT, "system/system-graph.json"), "utf8"));
  let parserRefusals = 0;
  // The ✓ line names the refusals as well as counting them. DERIVED from the same array, never
  // re-typed beside it: a hand-listed set next to a computed count is the Low 4 shape one line down.
  let parserRefusalNames = "";

  // --- A · validateExamples -------------------------------------------------------------------
  //
  // The happy path first: every real spec's real example must pass against the real vocabulary.
  // `checked` is asserted against the count read from the PACK — not from vocabulary.json, which
  // deliberately carries no `example` at all (gen-vocabulary.mjs's comment says why), and not typed.
  const realSpecs = PACK.components.map((c) => ({ head: c, path: `system/specs/${c.component}.md` }));
  const packExamples = PACK.components.filter((c) => c.example).length;
  ok(packExamples > 0, "the pack carries no `example` at all — this whole group would be vacuous");
  let happy = null;
  try { happy = validateExamples(realSpecs, VOCAB); } catch (err) {
    ok(false, `every committed example should render, but validateExamples threw: ${err.message}`);
  }
  ok(happy && happy.checked === packExamples,
    `validateExamples checked ${happy && happy.checked} examples but the pack carries ${packExamples}`);

  // The MUTATION, and it is what decides whether this gate can fail at all. Four synthetic specs,
  // one per refusal branch of validateComposition, each asserted BOTH to throw AND to name its own
  // spec path — because a gate that throws the right number of times with the wrong messages is a
  // gate nobody can debug. AC #7 as a committed tripwire rather than an operator's one-time
  // observation (the `check-that-cannot-fail` lesson: every #137 defect survived a green gate the
  // same way — the check skipped the thing it tested).
  const broken = [
    { branch: "unknown prop", head: { component: "metric-tile", example: { label: "x", value: "1", nonsense: true } } },
    { branch: "missing required prop", head: { component: "metric-tile", example: { label: "x" } } },
    { branch: "wrong type", head: { component: "stat-tile", example: { kind: "moisture", value: "34", unit: "%", label: "Moisture" } } },
    { branch: "enum violation", head: { component: "status-chip", example: { value: "nonsense", label: "X" } } },
  ];
  for (const { branch, head } of broken) {
    const path = `system/specs/SYNTHETIC-${branch.replace(/ /g, "-")}.md`;
    let threw = null;
    try { validateExamples([{ head, path }], VOCAB); } catch (err) { threw = err; }
    ok(threw !== null, `validateExamples accepted a broken example (${branch}) — the gate cannot fail`);
    ok(threw && threw.message.includes(path),
      `the ${branch} refusal does not name its spec path — got: ${threw && threw.message}`);
    ok(threw && /does not render/.test(threw.message),
      `the ${branch} refusal does not say the example does not render — got: ${threw && threw.message}`);
  }

  // A spec with NO example is SKIPPED, not failed — the field is optional (AC #1). Asserted as a
  // `checked` count of zero rather than as "it did not throw", which an empty list also satisfies.
  const skipped = validateExamples([{ head: { component: "metric-tile" }, path: "system/specs/NO-EXAMPLE.md" }], VOCAB);
  ok(skipped.checked === 0, `a spec with no example was checked ${skipped.checked} times — the field is optional`);

  // Totality: a junk `example` value must produce a clean refusal or a clean skip, never an
  // uncaught crash — validateComposition's own guards are what make this true, and this is what
  // notices the day one of them stops holding.
  const junkExamples = [null, [], "x", 0, true, undefined];
  for (const [i, ex] of junkExamples.entries()) {
    let crashed = null;
    try { validateExamples([{ head: { component: "metric-tile", example: ex }, path: `system/specs/JUNK-${i}.md` }], VOCAB); }
    catch (err) { if (!/does not render/.test(err.message)) crashed = err; }
    ok(crashed === null, `a junk example (${JSON.stringify(ex)}) crashed the checker uncaught: ${crashed && crashed.message}`);
  }

  // --- B · prepareHandoff's join over the REAL committed files ---------------------------------
  const joined = prepareHandoff(PACK, VOCAB, GRAPH);
  ok(joined.components.length === PACK.components.length,
    `the join returned ${joined.components.length} components for a pack of ${PACK.components.length}`);

  for (const c of joined.components) {
    const spec = PACK.components.find((p) => p.component === c.name);
    // Every declared token resolved. A null `group` means a spec declares a token the contract does
    // not have — the join keeps it visible rather than dropping it, so this is the assertion that
    // sees it.
    ok(Array.isArray(c.tokens) && c.tokens.length === spec.tokens.length,
      `${c.name}: joined ${c.tokens && c.tokens.length} tokens for a spec declaring ${spec.tokens.length}`);
    const unresolved = (c.tokens || []).filter((t) => t.group === null).map((t) => t.name);
    ok(unresolved.length === 0, `${c.name}: declares token(s) the contract does not have — ${unresolved.join(", ")}`);
    // example: present exactly when the pack carries one.
    ok(Boolean(c.example) === Boolean(spec.example), `${c.name}: example presence disagrees with the pack`);
    // wrapper: derived from the pack's OWN portability list, never typed.
    const expected = PACK.portability.webComponents.files.includes(`wc/${spec.class}.mjs`) ? `wc/${spec.class}.mjs` : null;
    ok(c.wrapper === expected, `${c.name}: wrapper is ${c.wrapper}, expected ${expected}`);
    // consumer: EVERY pack component must have a components.css block that consumes contract tokens.
    //
    // Derived from the PACK, checked against the GRAPH — and this is the one place where the
    // house rule "derive the expected set from the file" is exactly WRONG. Deriving the expected
    // set from system-graph.json's own consumers[].spec produces a check that cannot fail: delete
    // demo-notice's CSS block, regenerate the graph, and the component leaves the join AND the
    // expectation together, both sides moving in lockstep, assertion green on a broken tree.
    // Anchoring on the pack means a deleted or suffix-less block goes red, and #220's ten additions
    // are covered here with no edit. The rule generalises: derive the expected set from a source
    // that does not move when the thing under test breaks.
    //
    // If a future component's block legitimately consumes NO contract token
    // (gen-system-graph.mjs drops zero-token blocks) or carries no `(system/specs/….md)` suffix,
    // name it as an explicit commented exception here — never widen back to a graph-derived set.
    ok(c.consumer !== null,
      `${c.name}: no components.css block consuming contract tokens for system/specs/${c.name}.md — a spec with no CSS block is documented but not styled (#211)`);
  }

  // What the per-component loop above actually asserted, summed — NOT GRAPH.counts.tokens, which is
  // the contract's 64 and a true number about a different thing (PR #242 review, Low 4).
  const joinedTokens = joined.components.reduce((n, c) => n + c.tokens.length, 0);
  const joinedWrappers = joined.components.filter((c) => c.wrapper).length;
  ok(joinedWrappers === PACK.portability.webComponents.files.length,
    `the join found ${joinedWrappers} wrappers but the pack ships ${PACK.portability.webComponents.files.length}`);
  ok(joined.components.filter((c) => c.example).length === packExamples,
    "the join's example count disagrees with the pack's");

  // The `head` projection is an explicit field PICK, not a spread — so an added optional key is
  // silently dropped unless it is named there. This is the assertion that catches that, and it is
  // the trap the five-pillar rubric ticket paid a review round for.
  const withExample = joined.components.find((c) => c.example);
  ok(withExample && withExample.head.example, "`example` reached the component but NOT the head projection — it was dropped by the explicit pick");
  // The negative half of the same claim: a spec with NO example must get NO `example` key in its
  // head projection — an injected `null` would make "Source (spec head)" a picture of a head that
  // does not exist. All ten committed specs carry an example (#211 authored them deliberately
  // totally), so this is driven over a SYNTHETIC pack rather than left as a vacuous `if` that
  // silently tests nothing the day it stops finding one.
  const strippedPack = { ...PACK, components: PACK.components.map(({ example, ...rest }) => rest) };
  const strippedJoin = prepareHandoff(strippedPack, VOCAB, GRAPH);
  ok(strippedJoin.components.every((c) => !("example" in c.head)),
    'the head projection injected an "example" key for a spec that carries none');
  ok(strippedJoin.components.every((c) => c.example === null),
    "a spec with no example should join as null, not undefined");
  ok(strippedJoin.components.every((c) => c.consumer !== null && c.tokens.length > 0),
    "stripping `example` disturbed the rest of the join");

  // The TWO-ARG call — the compatibility claim handoff.html:196 rests on. Full shape, joined graph
  // fields null, and `example` still present because it rides the pack rather than the graph.
  const twoArg = prepareHandoff(PACK, VOCAB);
  ok(twoArg.components.length === PACK.components.length && twoArg.composition !== null,
    "the two-arg call no longer returns the full { components, composition } shape");
  ok(twoArg.components.every((c) => c.tokens === null && c.consumer === null),
    "the two-arg call resolved graph fields it was given no graph for");
  ok(twoArg.components.filter((c) => c.example).length === packExamples,
    "the two-arg call lost `example`, which comes from the pack and not the graph");

  // Totality over junk graphs — degrade to null, never throw. The optionality is the whole reason
  // the shipped call site keeps working.
  const junkGraphs = [null, undefined, {}, { tokens: [] }, { consumers: "x" }, { tokens: "x", consumers: 7 }, []];
  for (const [i, g] of junkGraphs.entries()) {
    let threw = null;
    let out = null;
    try { out = prepareHandoff(PACK, VOCAB, g); } catch (err) { threw = err; }
    ok(threw === null, `prepareHandoff threw on junk graph ${i}: ${threw && threw.message}`);
    ok(out && out.components.length === PACK.components.length, `junk graph ${i} changed the component count`);
  }

  // --- C · the PARSER's own refusals ------------------------------------------------------------
  //
  // #211 added four throws to parseComponentSpec, and 18A/18B drive validateComposition's branches
  // rather than these — so without this half the parser's refusals would be exactly the shape 18B's
  // stripped-pack case had to be rewritten to escape: written, plausible, and never once observed
  // failing. The plan asks for them by name (TESTING STRATEGY edge cases 6 and 7).
  //
  // Driven over REAL FILES in a tmpdir, because parseComponentSpec takes a path and derives the
  // component name from the filename stem — there is no in-memory seam, and inventing one would be
  // a second parser. Each fixture must satisfy the WHOLE parser (stem === head.component, non-empty
  // --prefixed tokens, non-empty states, a children array, contract null, and the four `## `
  // sections IN ORDER), so the positive control below is also the proof that the fixture shape is
  // right — without it a typo'd fixture would make all four refusals pass for the wrong reason.
  {
    const dir = mkdtempSync(join(tmpdir(), "g18-spec-"));
    const SECTIONS = "\n\n## Usage\n\nu\n\n## States\n\ns\n\n## Data binding\n\nd\n\n## Accessibility\n\na\n";
    const write = (stem, head) => {
      const p = join(dir, `${stem}.md`);
      writeFileSync(p, "```json\n" + JSON.stringify({ ...head, component: stem }, null, 2) + "\n```" + SECTIONS);
      return p;
    };
    const BASE = {
      status: "spec", class: "x-thing", contract: null,
      tokens: ["--color-fg"], states: ["default"], children: [],
      props: { n: { type: "number", required: true }, s: { type: "string", required: true } },
    };

    // Positive control — a valid example AND valid bounds must PARSE, or the refusals below are
    // meaningless (anything throws if the fixture is malformed). Its `step: 1` and its in-range
    // `n: 1` are also what keep the two #242 rules from being satisfiable by refusing everything.
    let control = null;
    try {
      control = parseComponentSpec(write("ok-thing", {
        ...BASE,
        props: { n: { type: "number", required: true, min: 0, max: 100, step: 1 }, s: { type: "string", required: true } },
        example: { n: 1, s: "x" },
      }));
    } catch (err) { ok(false, `the positive-control fixture does not parse — the refusal cases below prove nothing: ${err.message}`); }
    ok(control && control.head.example.n === 1, "the control's example did not survive parsing");
    ok(control && control.head.props.n.min === 0 && control.head.props.n.step === 1, "the control's bounds did not survive parsing");

    // A spec with NO example and NO bounds must parse too — both keys are optional (AC #1).
    let bare = null;
    try { bare = parseComponentSpec(write("bare-thing", BASE)); } catch (err) { ok(false, `an optional key was made mandatory: ${err.message}`); }
    ok(bare && bare.head.example === undefined, "a spec with no example did not parse as undefined");

    // The four refusals, each asserted to throw AND to name its own path — same discipline as 18A.
    const refusals = [
      { why: "a bound on a non-numeric prop", stem: "bound-on-string",
        head: { ...BASE, props: { n: { type: "number", required: true }, s: { type: "string", required: true, min: 0 } } },
        expect: /min\/max\/step are numeric-control bounds/ },
      { why: "a non-finite bound", stem: "bound-not-finite",
        head: { ...BASE, props: { n: { type: "number", required: true, max: "100" }, s: { type: "string", required: true } } },
        expect: /must be a finite number/ },
      { why: "min > max", stem: "bound-inverted",
        head: { ...BASE, props: { n: { type: "number", required: true, min: 100, max: 0 }, s: { type: "string", required: true } } },
        expect: /min 100 > max 0/ },
      { why: "a non-object example", stem: "example-not-object",
        head: { ...BASE, example: ["n", 1] },
        expect: /must be an object of props/ },
      // The two the PR #242 review found accepted. `step: 0` is the numeric-only rule applied one
      // step further; the range case is the ONLY view of bounds anything has — validateComposition
      // checks type · enum · required and never range, so without this a spec could declare 0–100
      // and seed the playground at 500 with every gate green.
      { why: "a zero step", stem: "step-zero",
        head: { ...BASE, props: { n: { type: "number", required: true, step: 0 }, s: { type: "string", required: true } } },
        expect: /must be greater than 0/ },
      { why: "an example outside its prop's declared bounds", stem: "example-out-of-range",
        head: { ...BASE, props: { n: { type: "number", required: true, min: 0, max: 100 }, s: { type: "string", required: true } }, example: { n: 500, s: "x" } },
        expect: /outside its declared range 0–100/ },
    ];
    for (const { why, stem, head, expect } of refusals) {
      const p = write(stem, head);
      let threw = null;
      try { parseComponentSpec(p); } catch (err) { threw = err; }
      ok(threw !== null, `parseComponentSpec accepted ${why} — the refusal cannot fire`);
      ok(threw && threw.message.includes(p), `the "${why}" refusal does not name its spec path — got: ${threw && threw.message}`);
      ok(threw && expect.test(threw.message), `the "${why}" refusal does not say why — got: ${threw && threw.message}`);
    }
    rmSync(dir, { recursive: true, force: true });
    parserRefusals = refusals.length;
    parserRefusalNames = refusals.map((r) => r.why).join(" · ");
  }

  group("docs chain", `parseComponentSpec's ${parserRefusals} NEW refusals driven over real fixture files in a tmpdir — ${parserRefusalNames} — each asserted to throw AND to name its own spec path, behind a POSITIVE CONTROL that proves the fixture shape is right (without it a typo'd fixture makes every refusal pass for the wrong reason) and a bare fixture proving both keys stay optional · validateExamples over the ${realSpecs.length} REAL committed specs — ${packExamples} examples, the count read from pack.json rather than typed — plus the MUTATION that decides whether it can fail at all: ${broken.length} synthetic broken examples, one per refusal branch (unknown prop · missing required · wrong type · enum), each asserted to throw AND to name its own spec path, because a gate that throws the right number of times with the wrong messages is a gate nobody can debug · a spec with no example SKIPPED rather than failed, asserted as a checked count of 0 · total over ${junkExamples.length} junk example values · prepareHandoff's join driven over the real pack.json + vocabulary.json + system-graph.json with every count derived from those files: every spec's declared tokens joined 1:1 — ${joinedTokens} across the ${PACK.components.length} components, each resolving to a contract group (a null group would mean a spec declares a token the contract lacks), ${joinedWrappers} wrappers derived from the pack's OWN portability list, and a consumer block for every one of ${PACK.components.length} components — anchored on the PACK deliberately, since a graph-derived expected set moves in lockstep with the thing under test and can never go red · the head projection proven to carry `+ "`example`" + ` in both directions, the explicit-pick trap · the two-arg call still returning the full shape with graph fields null · total over ${junkGraphs.length} junk graphs. That the CATALOG renders any of this is #215's, and there is no catalog yet — this group gates the pure join and says so`);
}

// --- 19 · the flow: places become screens, connections become navigation (#212) ---------------------
//
// screensFor is the committed answer to the epic PRD's open question ("how the five patterns map to
// flow screen types"), and this group is its gate: driven over the REAL committed replay board the
// shipped page compiles (group 16's real-file discipline), over a fixture per screen type (the
// BOARD_FOR rule — an in-library pattern with no flow fixture fails loudly), with the two MUTATIONS
// that decide whether its own predicates can go red, and total over the same junk group 15 drives.
//
// AND IT STATES ITS BOUNDARY, the way groups 9, 11, 13 and 16 do. Nothing here can click a nav
// button, watch focus land on a heading, hear the live region, scroll a canvas, or open a file://
// document cold and count the requests a browser really makes. Those belong to
// tooling/studio-journey.mjs's flow pass and to the manual cold open recorded in the ticket's
// report. What this group owns is the DATA — which screen each place becomes, what navigates where
// — and the exported string's structure.
{
  const { compileSteps } = await import("../system/studio-compile.mjs");

  // Group 13/15's hand-written canonical stringify, copied for its standing reason:
  // JSON.stringify(v, keys) puts an array in the REPLACER position and silently filters every level.
  const deep = (v) => {
    if (Array.isArray(v)) return `[${v.map(deep).join(",")}]`;
    if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${deep(v[k])}`).join(",")}}`;
    return JSON.stringify(v);
  };

  // --- 19.1 the REAL committed board — the flow the shipped page compiles -----------------------
  const REPLAY_BOARD = JSON.parse(readFileSync(join(ROOT, "replay/build-fieldwork-dispatch.board.json"), "utf8"));
  const flow = screensFor(REPLAY_BOARD, DEFAULT_ANSWERS);
  ok(Array.isArray(flow) && flow.length === REPLAY_BOARD.places.length,
    `the committed board's ${REPLAY_BOARD.places.length} places became ${flow && flow.length} screens`);
  ok(flow[0].type === patternFor({ answers: DEFAULT_ANSWERS, board: REPLAY_BOARD }).id,
    `the entry screen's type is ${flow[0].type}; patternFor names ${patternFor({ answers: DEFAULT_ANSWERS, board: REPLAY_BOARD }).id} (rule S1)`);
  const navTotal = (screens) => screens.reduce((n, s) => n + s.nav.length, 0);
  ok(navTotal(flow) === REPLAY_BOARD.connections.length,
    `${navTotal(flow)} nav entries for ${REPLAY_BOARD.connections.length} connections — navigation is counted from connections and from nothing else`);
  // REACHABILITY — "clickable end to end", the pure half: a walk over nav from the entry reaches
  // every screen. A real graph walk rather than a chain check, because the committed board's return
  // paths make it one.
  const reach = (screens) => {
    const byId = new Map(screens.map((s, i) => [s.id, i]));
    const seen = new Set([0]);
    const queue = [0];
    while (queue.length) {
      const i = queue.shift();
      for (const entry of screens[i].nav) {
        const j = byId.get(entry.targetId);
        if (j != null && !seen.has(j)) { seen.add(j); queue.push(j); }
      }
    }
    return seen;
  };
  ok(reach(flow).size === flow.length,
    `only ${reach(flow).size} of ${flow.length} screens are reachable from the entry — the flow is not clickable end to end`);
  // The TYPE HISTOGRAM, pinned as a tripwire the way group 16 pins the artifact's op mix: the
  // committed board reads as 1 dashboard entry + 3 queue screens today, and a rule edit that
  // silently re-types one must go red HERE rather than ship unnoticed.
  const histogram = (screens) => screens.reduce((h, s) => ({ ...h, [s.type]: (h[s.type] || 0) + 1 }), {});
  ok(deep(histogram(flow)) === deep({ dashboard: 1, queue: 3 }),
    `the committed flow's type mix moved: ${deep(histogram(flow))} — expected 1 dashboard + 3 queue (a tripwire over the rules, not a rule)`);

  // --- 19.2 a flow fixture per screen type — the BOARD_FOR rule ---------------------------------
  // Screen types ARE the patterns, so the roster iterates PATTERNS: an in-library pattern with no
  // flow fixture fails loudly rather than being silently skipped. The four shape-named patterns are
  // ENTRY screens of their own BOARD_FOR fixtures (rule S1); settings is covered on both of its
  // routes — HUB_BOARD's entry (S1 through the hub override, with four S4 bare screens for free)
  // and a NON-ENTRY hub place (rule S2), which no draft can produce and S2_BOARD draws deliberately.
  const S2_BOARD = {
    places: [
      { id: "p1", label: "Overview", affordances: [{ id: "p1a1", label: "Open the menu" }] },
      { id: "p2", label: "Menu", affordances: [1, 2, 3, 4].map((n) => ({ id: `p2a${n}`, label: `Go ${n}` })) },
      { id: "p3", label: "Archive", affordances: [{ id: "p3a1", label: "Open a record" }] },
    ],
    connections: [["p1a1", "p2"], ["p2a1", "p1"], ["p2a2", "p3"], ["p2a3", "p1"], ["p2a4", "p3"]],
  };
  const FLOW_ANSWERS = {
    dashboard: answersWith({ shape: "overview" }),
    queue: answersWith({ shape: "worklist" }),
    feed: answersWith({ shape: "stream" }),
    onboarding: answersWith({ shape: "steps" }),
    settings: answersWith({ shape: "overview" }),
  };
  const flows = {};
  for (const p of Object.values(PATTERNS)) {
    if (!p.inLibrary) continue;
    ok(Object.hasOwn(BOARD_FOR, p.id) && BOARD_FOR[p.id],
      `${p.id} has no flow fixture — a pattern was added and this gate was not told which board's flow carries it`);
    if (!BOARD_FOR[p.id]) continue;
    const screens = screensFor(BOARD_FOR[p.id], FLOW_ANSWERS[p.id]);
    flows[p.id] = screens;
    ok(Array.isArray(screens) && screens.some((screen) => screen.type === p.id),
      `no screen of type ${p.id} anywhere in its own fixture's flow`);
  }
  // Every rule S1–S4 exercised, read off the REASON sentences — the reason IS the rule, so the
  // assertion reads what fired rather than re-deriving the condition beside it.
  const s2flow = screensFor(S2_BOARD, answersWith({ shape: "overview" }));
  ok(s2flow[1].type === "settings" && s2flow[1].reason.startsWith("Rule S2"),
    `the non-entry hub place read as ${s2flow[1].type} — rule S2 did not fire`);
  ok(s2flow[1].slots.length === 4 && s2flow[1].slots.every((row) => row.value !== "acts here"),
    "the S2 screen's rows are not the hub's four destinations");
  ok(Object.values(flows).every((screens) => screens[0].reason.startsWith("Rule S1")),
    "an entry screen's reason is not rule S1's");
  ok(flows.queue.some((screen, i) => i > 0 && screen.reason.startsWith("Rule S3")),
    "no S3 screen in the queue fixture's flow");
  ok(flows.settings.slice(1).every((screen) => screen.reason.startsWith("Rule S4")
    && screen.type === "queue" && screen.slots.length === 0),
  "HUB_BOARD's bare places did not read as S4 empty screens");

  // --- 19.3 navigation is counted from connections, and from nothing else -----------------------
  const cut = structuredClone(REPLAY_BOARD);
  cut.connections = cut.connections.filter(([from]) => from !== "p1a1");
  const cutFlow = screensFor(cut, DEFAULT_ANSWERS);
  ok(cutFlow[0].nav.length === 0 && navTotal(cutFlow) === REPLAY_BOARD.connections.length - 1,
    "removing one connection did not remove exactly its own nav entry");
  ok(reach(cutFlow).size === 1,
    `severing the entry's one outgoing connection should strand the entry, but ${reach(cutFlow).size} screens stay reachable — reachability is not being read off the connections`);
  const lone = {
    places: [
      { id: "p1", label: "A", affordances: [{ id: "p1a1", label: "Open B" }] },
      { id: "p2", label: "B", affordances: [{ id: "p2a1", label: "Act in place" }] },
    ],
    connections: [["p1a1", "p2"]],
  };
  const loneFlow = screensFor(lone, null);
  ok(loneFlow[1].nav.length === 0, "an unconnected affordance produced a nav entry");
  ok(loneFlow[1].slots[0].value === "acts here", "an unconnected affordance's row does not say it acts in place");

  // --- 19.4 the one truncation, stated — on the canvas AND in the exported file ------------------
  const feedRun = compileSteps(FULL_BOARD, answersWith({ shape: "stream" }));
  ok(feedRun.screens[0].type === "feed" && feedRun.screens[0].slots.length === SLOT_MAX,
    `the FULL_BOARD feed entry shows ${feedRun.screens[0].slots.length} slots, expected SLOT_MAX ${SLOT_MAX}`);
  ok(feedRun.screens[0].note === streamNote(SLOT_MAX, affordanceCount(FULL_BOARD)),
    "the feed entry screen does not carry streamNote's sentence by identity — the truncation is unstated");
  ok(feedRun.screens.slice(1).every((screen) => screen.note === undefined),
    "a non-feed screen grew a truncation note");
  ok(MAX_AFFORDANCES === SLOT_MAX,
    `MAX_AFFORDANCES ${MAX_AFFORDANCES} !== SLOT_MAX ${SLOT_MAX} — a per-place truncation now exists and no sentence states it`);
  const fullQueue = screensFor(FULL_BOARD, answersWith({ shape: "worklist" }));
  ok(fullQueue.slice(1).every((screen) => screen.slots.length === MAX_AFFORDANCES),
    "a full place's screen dropped rows — the per-place bound is truncating after all");
  // The sentence REACHES THE EXPORTED FILE (PR #248 review, H1): the same screens the keep rail
  // maps travel into exportHtml with the note threaded, and the document states the drop in
  // streamNote's own words — asserted by IDENTITY (esc() alters none of them), on the feed entry
  // alone. Before the fix the mapping returned {name, type, slots, nav} and the sentence never left
  // the canvas: 6 rows printed beside "Affordances: 7" with nothing saying one was dropped.
  const feedDoc = exportHtml({
    title: "t",
    css: "",
    screens: feedRun.screens.map((screen) => ({
      name: screen.label,
      type: screen.type,
      note: screen.note,
      slots: [{ html: "<i>row</i>" }],
      nav: [],
    })),
    meta: {},
  });
  ok(feedDoc.includes(`<p class="sx-note">${streamNote(SLOT_MAX, affordanceCount(FULL_BOARD))}</p>`),
    "the exported feed document does not carry streamNote's sentence — the truncation is silently dropped from the file");
  ok(feedDoc.split(`class="sx-note"`).length === 2,
    "sx-note appears a wrong number of times — a screen with no note grew one, or the feed entry lost its only one");

  // --- 19.5 the empty board names no screens, and every layer says so honestly (AC #4) ----------
  ok(screensFor({ places: [], connections: [] }, DEFAULT_ANSWERS) === null, "an empty board named screens");
  ok(screensFor({ places: [{ id: "p1", label: "A", affordances: [] }], connections: [] }, null) === null,
    "one bare place named screens — the emptiness reading is patternFor's, shared");
  const emptyRun = compileSteps({ places: [], connections: [] }, DEFAULT_ANSWERS);
  ok(emptyRun.state === "empty" && emptyRun.screens === null,
    "compileSteps did not carry the empty verdict through to the flow");
  const emptyDoc = exportHtml({ title: "t", css: "", screens: [], meta: {} });
  ok(emptyDoc.includes("did not compile to any components"),
    "an export with no screens does not say it is empty");

  // --- 19.6 every composed screen validates against the REAL generated vocabulary (AC #6) -------
  const everyFlow = [
    ["the committed board", compileSteps(REPLAY_BOARD, DEFAULT_ANSWERS)],
    ...Object.keys(flows).map((id) => [id, compileSteps(BOARD_FOR[id], FLOW_ANSWERS[id])]),
    ["the S2 board", compileSteps(S2_BOARD, answersWith({ shape: "overview" }))],
  ];
  let validated = 0;
  for (const [label, run] of everyFlow) {
    for (const [si, screen] of (run.screens || []).entries()) {
      if (!screen.composition) continue;
      try {
        validateComposition(VOCAB, screen.composition);
        validated += 1;
      } catch (err) {
        ok(false, `${label} screen ${si + 1} ("${screen.label}") failed the real vocabulary: ${err.message}`);
      }
      for (const node of screen.composition) {
        ok(hasTemplate(node.name), `${node.name} has no renderer template — a screen would refuse on stage`);
      }
    }
  }
  ok(validated > 0, "no screen was validated at all — this case went vacuous");

  // --- 19.7 the mutations — the checks above must be able to fail -------------------------------
  // (a) tamper the exported document: drop one section and the href-resolution predicate goes red.
  //     The predicate is group 17's, copied per the deep() rule (each group carries its own).
  const everyHrefResolves = (doc) => {
    const ids = new Set([...doc.matchAll(/<section class="sx-screen" id="([^"]+)">/g)].map((match) => match[1]));
    return [...doc.matchAll(/href="([^"]+)"/g)].every(([, h]) => h.startsWith("#") && ids.has(h.slice(1)));
  };
  const twoDoc = exportHtml({ title: "t", css: "", screens: [
    { name: "A", type: "queue", slots: [{ html: "<i>a</i>" }], nav: [{ label: "to B", target: 2 }] },
    { name: "B", type: "queue", slots: [{ html: "<i>b</i>" }], nav: [] },
  ], meta: {} });
  ok(everyHrefResolves(twoDoc), "the two-screen document should resolve before tampering, or the mutation proves nothing");
  const tampered = twoDoc.replace(/<section class="sx-screen" id="s2">[\s\S]*?<\/section>/, "");
  ok(tampered !== twoDoc && !everyHrefResolves(tampered),
    "dropping a section left every href 'resolving' — the resolution predicate cannot fail");
  // (b) corrupt one screen's type in a copy of the real flow: the pinned histogram compare fails.
  const corrupt = structuredClone(flow);
  corrupt[1].type = "settings";
  ok(deep(histogram(corrupt)) !== deep({ dashboard: 1, queue: 3 }),
    "re-typing a screen left the pinned histogram equal — the tripwire cannot fail");

  // --- 19.8 totality — group 15's nine junk boards × junk answers, never a throw ----------------
  for (const [given, why] of [
    [null, "null"],
    [undefined, "undefined"],
    [{}, "an object with no places"],
    [{ places: null, connections: null }, "places that are not an array"],
    [{ places: "nope" }, "places that are a string"],
    [{ places: [null, 7, "x"] }, "places that are junk entries"],
    [{ places: [{}] }, "a place with no id, label or affordances"],
    [{ places: [{ id: "p1", label: "A", affordances: "nope" }] }, "affordances that are not an array"],
    [{ places: [{ id: "p1", label: "A", affordances: [null, 3] }] }, "affordances that are junk entries"],
  ]) {
    for (const answers of [null, undefined, DEFAULT_ANSWERS, { shape: "worklist" }, { shape: 7 }, "nope"]) {
      let got;
      let threw = null;
      try { got = screensFor(given, answers); } catch (e) { threw = e; }
      ok(!threw, `screensFor threw on ${why} with answers ${JSON.stringify(answers)}: ${threw && threw.message}`);
      ok(got === null || Array.isArray(got), `screensFor answered a non-array non-null for ${why}`);
    }
  }

  group("flow", `screensFor over the REAL committed replay board: ${REPLAY_BOARD.places.length} places become ${flow.length} screens (entry type read from patternFor, rule S1), ${navTotal(flow)} nav entries counted from the file's ${REPLAY_BOARD.connections.length} connections and every screen reachable from the entry — clickable end to end, the pure half — with the 1-dashboard + 3-queue type mix pinned as a tripwire · a flow fixture per in-library screen type via the BOARD_FOR rule (a missing fixture fails loudly) and every rule S1–S4 proven to fire by its own reason sentence, S2 on a deliberate non-entry hub no draft can produce · navigation counted from connections ONLY: cutting one connection removes exactly its nav entry and strands the entry, an unconnected affordance navigates nowhere and says "acts here" · feed's SLOT_MAX truncation stated by streamNote IDENTITY — on the flow's screens AND carried into the exported document, exactly once (PR #248 review H1) — and the per-place bound proven un-truncating (MAX_AFFORDANCES === SLOT_MAX, asserted) · the empty board names null at every layer and the empty export says so · every composed screen of every fixture validates against the real vocabulary with a template per node · two mutations — a tampered document fails href resolution, a re-typed screen fails the pinned histogram · total over 9 junk boards × 6 junk answer sets · the click, the focus, the announcement, the scroll and the cold file:// open are tooling/studio-journey.mjs's flow pass and the manual check's, and say so`);
}

// --- 20 · the method band's pure layer (#214) --------------------------------------------------------
// system/studio-method.mjs: the on-canvas method cards' DOM-free half. THE BOUNDARY, stated like
// groups 9/11/13/16/19 state theirs: the running-page halves — the driver gating (disabled while
// the replay plays, enabled at settle, never disabled on declined), the redraft actually replacing
// the canvas, the announcements through the one live region, and the ?b= restore populating cards
// and verdict with zero interaction — are tooling/studio-journey.mjs's methodPass, and cannot be
// reached from a Node import. What CAN be reached is everything the band decides with: the stage
// list's coupling to the Hooked questions, the reducer, the completion read, the verdict
// composition's identity with the imported rules, and the listener filter as data.

{
  // 20.1 HOOK_STAGES is a projection of the Hooked questions, in loop order, frozen.
  ok(Array.isArray(HOOK_STAGES) && HOOK_STAGES.length === 4,
    `HOOK_STAGES holds ${HOOK_STAGES.length} stages; the Hook loop has exactly 4`);
  ok(HOOK_STAGES.join("·") === "trigger·action·rewardType·investment",
    `the loop order moved: ${HOOK_STAGES.join(" → ")}`);
  for (const id of HOOK_STAGES) {
    const q = QUESTIONS.find((x) => x.id === id);
    ok(Boolean(q) && q.act === "hooked", `HOOK_STAGES names "${id}", which is not a Hooked question`);
  }
  ok(Object.isFrozen(HOOK_STAGES), "HOOK_STAGES is not frozen");
  // The load-assert's own predicate proven ABLE to fail, over a tampered clone — pinning a
  // constant is not pinning a behaviour (memory: the check that cannot fail).
  const tamperedStages = [...HOOK_STAGES.slice(0, 3), "appetite"];
  ok(tamperedStages.some((id) => {
    const q = QUESTIONS.find((x) => x.id === id);
    return !q || q.act !== "hooked";
  }), "the hooked-question predicate passed a stage list carrying a shaping id — the coupling check cannot fail");

  // 20.2 assembleReducer's truth table — every refusal a fixed sentence, never a throw.
  const empty = {};
  const first = assembleReducer(empty, "trigger", 0);
  ok(first.accepted === true && first.placed[0] === "trigger" && first.reason === null,
    "the right stage in its own empty slot was not accepted");
  ok(!(0 in empty), "the reducer mutated its input map — it must return a NEW one every time");
  let loop = {};
  HOOK_STAGES.forEach((stage, i) => {
    const r = assembleReducer(loop, stage, i);
    ok(r.accepted, `${stage} was refused its own slot ${i + 1}`);
    loop = r.placed;
  });
  ok(hookComplete(loop) === true, "the loop the reducer itself built does not read complete");
  const wrong = assembleReducer({}, "investment", 0);
  ok(!wrong.accepted && wrong.reason.includes(SUMMARY_TERM.investment) && wrong.reason.includes("stage 1"),
    `a wrong-stage refusal must name the stage and the slot; got "${wrong && wrong.reason}"`);
  const misSlot = assembleReducer({}, "trigger", 2);
  ok(!misSlot.accepted, "the right stage in the wrong slot was accepted");
  const occupied = assembleReducer({ 0: "trigger" }, "trigger", 0);
  ok(!occupied.accepted && occupied.reason.includes("already"),
    `an occupied slot must refuse and say so; got "${occupied && occupied.reason}"`);
  for (const hostile of ["appetite", "shape", "<img src=x onerror=1>", "", null, undefined, 7, {}]) {
    let r; let threw = null;
    try { r = assembleReducer({}, hostile, 0); } catch (e) { threw = e; }
    ok(!threw, `assembleReducer threw on a hostile stage ${JSON.stringify(String(hostile))}: ${threw && threw.message}`);
    ok(r && r.accepted === false && typeof r.reason === "string", "a hostile stage id was not refused with a reason");
  }
  for (const slot of [-1, 4, 1.5, "x", null, undefined, Infinity]) {
    let r; let threw = null;
    try { r = assembleReducer({}, "trigger", slot); } catch (e) { threw = e; }
    ok(!threw, `assembleReducer threw on a hostile slot ${String(slot)}: ${threw && threw.message}`);
    ok(r && r.accepted === false, `a hostile slot ${String(slot)} was accepted`);
  }

  // 20.3 hookComplete: true at an exact 4/4 and nowhere else.
  ok(hookComplete({}) === false, "an empty map read complete");
  ok(hookComplete({ 0: "trigger", 1: "action", 2: "rewardType" }) === false, "3/4 read complete");
  ok(hookComplete({ 0: "action", 1: "trigger", 2: "rewardType", 3: "investment" }) === false,
    "a 4/4 map with two stages swapped read complete");
  ok(hookComplete(null) === false && hookComplete("nope") === false, "junk read complete");
  // THE MUTATION — a map smuggling a shaping id past the reducer (the plan's synthetic
  // stages-array-with-a-shaping-id, fed via the inputs): it can neither read complete nor be
  // completed, because the reducer refuses the id anywhere and the occupied guard holds slot 0.
  const smuggled = { 0: "appetite", 1: "action", 2: "rewardType", 3: "investment" };
  ok(hookComplete(smuggled) === false, "a smuggled shaping id read complete — the completion check cannot fail");
  ok(!assembleReducer(smuggled, "trigger", 0).accepted, "the occupied guard let the smuggled map be repaired in place");

  // 20.4 verdictFor: identity on the IMPORTED rules' outputs — all four quadrants, both frequency
  // branches. Never a re-derivation here: the point is that the band and /build cannot disagree.
  const seen = new Set();
  for (const patch of [
    { improvesLives: "yes", wouldUseIt: "yes" },
    { improvesLives: "yes", wouldUseIt: "no" },
    { improvesLives: "no", wouldUseIt: "yes" },
    { improvesLives: "no", wouldUseIt: "no" },
  ]) {
    for (const frequency of ["daily", "rarely"]) {
      const answers = { ...DEFAULT_ANSWERS, ...patch, frequency };
      const v = verdictFor(answers);
      const expectQ = quadrantFor(answers);
      const expectF = frequencyVerdictFor(answers);
      seen.add(v.quadrant);
      ok(v.quadrant === expectQ, `verdictFor named ${v.quadrant} where quadrantFor names ${expectQ}`);
      ok(v.meaning === QUADRANT_MEANINGS[expectQ], `the ${expectQ} meaning is not QUADRANT_MEANINGS' sentence by identity`);
      ok(v.frequency.passes === expectF.passes && v.frequency.verdict === expectF.verdict,
        `the frequency verdict for "${frequency}" is not frequencyVerdictFor's own`);
    }
  }
  ok(seen.size === 4, `the four ethics pairs named ${seen.size} distinct quadrants, expected 4`);
  for (const junk of [null, undefined, "nope", { improvesLives: 7 }]) {
    let threw = null;
    try { verdictFor(junk); } catch (e) { threw = e; }
    ok(!threw, `verdictFor threw on junk ${JSON.stringify(junk)}: ${threw && threw.message}`);
  }

  // 20.5 RENDER_SOURCES — the #193 tripwire as data.
  ok(RENDER_SOURCES.includes("questions") && RENDER_SOURCES.includes("restore"),
    "RENDER_SOURCES lost a source — filtering to \"questions\" alone is exactly the #193 regression");
  ok(RENDER_SOURCES.length === 2 && !RENDER_SOURCES.includes("breadboard"),
    "RENDER_SOURCES admits \"breadboard\" — the redraft's own publish would re-enter the listener");
  ok(Object.isFrozen(RENDER_SOURCES), "RENDER_SOURCES is not frozen");

  group("method", `the method band's pure layer: HOOK_STAGES pinned to the four Hooked questions in loop order (frozen, and the coupling predicate proven able to fail on a tampered clone) · assembleReducer's truth table — the right stage in its own empty slot accepted into a NEW map, a wrong stage refused with a sentence naming the stage and the slot, the right stage in a wrong slot refused, an occupied slot refused, 8 hostile stage ids and 7 hostile slots refused without a throw · hookComplete true at an exact 4/4 only — 3/4, a swapped 4/4, junk and the smuggled shaping-id mutation all false, and the smuggled map proven unrepairable through the reducer · verdictFor equal BY IDENTITY to quadrantFor + QUADRANT_MEANINGS + frequencyVerdictFor for all four quadrants × both frequency branches, total over junk · RENDER_SOURCES carries "questions" AND "restore" (the #193 tripwire) and refuses "breadboard" (the redraft loop-breaker). The driver gating, the on-page redraft, the announcements and the zero-interaction restore are tooling/studio-journey.mjs's methodPass, and say so`);
}

// --- 21 · catalog — the component catalog's pure layer (#215) ---------------------------------------
// system/catalog.mjs renders the docs the repo generates; this group gates everything about that
// which is decidable under Node — the set identity, the two pinned second copies (the palette's
// static list, WRAPPER_ATTRS), controlFor's bounds fidelity and the code-tab projections. What it
// STATES rather than reaches (the group 9/11/13/16 discipline): that the page RENDERS any of this
// — the deep link, the live serialization, the byte-identical copy, the ⌘K race, the refusal line —
// is tooling/catalog-journey.mjs's, on a running page across three engines.
{
  const PACK = JSON.parse(readFileSync(join(ROOT, "handoff/verdant/pack.json"), "utf8"));
  const GRAPH = JSON.parse(readFileSync(join(ROOT, "system/system-graph.json"), "utf8"));
  const model = prepareHandoff(PACK, VOCAB, GRAPH);

  // Group 13/15's hand-written canonical stringify, copied for its standing reason:
  // JSON.stringify(v, keys) puts an array in the REPLACER position and silently filters every level.
  const deep = (v) => {
    if (Array.isArray(v)) return `[${v.map(deep).join(",")}]`;
    if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${deep(v[k])}`).join(",")}}`;
    return JSON.stringify(v);
  };

  // --- 21.1 set identity — "renders every vocabulary component" made structural: the mount
  // iterates the pack's rows, the count line reads the vocabulary's keys, and this is what makes
  // those the same set.
  const vocabNames = Object.keys(VOCAB.components).sort();
  const packNames = PACK.components.map((c) => c.component).sort();
  ok(deep(vocabNames) === deep(packNames),
    `pack and vocabulary disagree about the component set — vocabulary [${vocabNames.join(", ")}], pack [${packNames.join(", ")}]`);

  // --- 21.2 the palette pin — CATALOG_COMPONENTS is a deliberate STATIC second copy (the palette
  // memoizes at first open, #188), allowed only with this identity assertion against the artifact
  // (the dock PACKS / bus-toggles TONES pattern). Edit either side alone → red. #220 lands here.
  ok(deep([...CATALOG_COMPONENTS].sort()) === deep(vocabNames),
    `palette.mjs CATALOG_COMPONENTS has drifted from the generated vocabulary — palette [${[...CATALOG_COMPONENTS].sort().join(", ")}] vs vocabulary [${vocabNames.join(", ")}]`);

  // --- 21.3 controlFor over EVERY real prop of every entry: an enum prop's options are the enum
  // itself, a boolean is a boolean, and a number's bounds are exactly the spec's own — present
  // when declared (compared field by field to the artifact, never typed twice) and ABSENT when
  // not (Object.hasOwn false — the AC-#3 mutation surface: a defaulted 0–100 range fails here).
  let propsChecked = 0;
  let boundedNumbers = 0;
  let unboundedNumbers = 0;
  for (const [name, entry] of Object.entries(VOCAB.components)) {
    for (const [propName, spec] of Object.entries(entry.props)) {
      const d = controlFor(propName, spec);
      propsChecked += 1;
      if (Array.isArray(spec.enum)) {
        ok(d.kind === "enum" && deep(d.options) === deep(spec.enum),
          `${name}.${propName}: enum descriptor drifted — got ${JSON.stringify(d)}`);
      } else if (spec.type === "boolean") {
        ok(d.kind === "boolean", `${name}.${propName}: boolean descriptor drifted — got ${JSON.stringify(d)}`);
      } else if (spec.type === "number") {
        ok(d.kind === "number", `${name}.${propName}: number descriptor drifted — got ${JSON.stringify(d)}`);
        let declared = 0;
        for (const k of ["min", "max", "step"]) {
          ok(Object.hasOwn(spec, k) === Object.hasOwn(d, k),
            `${name}.${propName}: descriptor ${Object.hasOwn(d, k) ? "invents" : "drops"} ${k} — the spec ${Object.hasOwn(spec, k) ? "declares" : "does not declare"} it`);
          if (Object.hasOwn(spec, k)) {
            declared += 1;
            ok(d[k] === spec[k], `${name}.${propName}: descriptor ${k} is ${d[k]}, the artifact says ${spec[k]}`);
          }
        }
        if (declared) boundedNumbers += 1; else unboundedNumbers += 1;
      } else {
        ok(d.kind === "text", `${name}.${propName}: expected a text descriptor, got ${JSON.stringify(d)}`);
      }
    }
  }
  // stat-tile's value is today's one bounded number and the reason the range control exists —
  // named so a regeneration that drops its bounds is a loud sentence, not a histogram shift.
  const statValue = VOCAB.components["stat-tile"]?.props?.value;
  ok(statValue && Object.hasOwn(statValue, "min") && Object.hasOwn(statValue, "max") && Object.hasOwn(statValue, "step"),
    "stat-tile.value no longer declares min/max/step — the bounded-control case has lost its real subject");
  // Partial bounds carry ONLY what was declared — the synthetic case the real artifact cannot
  // currently produce (its one number is fully bounded).
  ok(deep(controlFor("n", { type: "number", min: 5 })) === deep({ kind: "number", min: 5 }),
    `a partial-bounds number must carry exactly the declared subset — got ${JSON.stringify(controlFor("n", { type: "number", min: 5 }))}`);
  ok(deep(controlFor("n", { type: "number" })) === deep({ kind: "number" }),
    `an unbounded number must carry NO bounds keys — got ${JSON.stringify(controlFor("n", { type: "number" }))}`);

  // --- 21.4 tabsFor over the real prepared model: vd/react present IFF the pack ships a wrapper.
  // The histogram is a TRIPWIRE, deliberately: #220 tripped it as designed (3/7 → 3/17 — its ten
  // components ship wrapper-less, and the absent vd/react tabs are honest), and the next wrapper
  // or component moves it again — move it on purpose, with the vd tab's honesty note re-checked,
  // never by reflex.
  let withWrapper = 0;
  let withoutWrapper = 0;
  for (const c of model.components) {
    const tabs = tabsFor(c);
    ok(tabs[0] === "html" && tabs[tabs.length - 1] === "json",
      `${c.name}: tabs must open with html and close with json — got [${tabs.join(", ")}]`);
    ok((tabs.includes("vd") && tabs.includes("react")) === Boolean(c.wrapper),
      `${c.name}: vd/react tabs must be present IFF the pack ships a wrapper (wrapper: ${c.wrapper})`);
    if (c.wrapper) withWrapper += 1; else withoutWrapper += 1;
  }
  ok(withWrapper === 3 && withoutWrapper === 17,
    `the wrapper histogram moved — ${withWrapper} with / ${withoutWrapper} without (pinned 3/17; see the tripwire note above)`);

  // --- 21.5 WRAPPER_ATTRS — the one hand-written table, triple-pinned. Each wrapper source is
  // TEXT-PARSED for its observedAttributes literal (the group-12 "CSS cannot import" precedent,
  // stated: a wrapper calls customElements.define at module top and cannot run under Node); every
  // map VALUE must be observed by the element, every map KEY must be a prop of the vocabulary
  // entry, and the map's key set must be exactly the wrapper'd components.
  const wrapperNames = model.components.filter((c) => c.wrapper).map((c) => c.name).sort();
  ok(deep(Object.keys(WRAPPER_ATTRS).sort()) === deep(wrapperNames),
    `WRAPPER_ATTRS covers [${Object.keys(WRAPPER_ATTRS).sort().join(", ")}]; the pack ships wrappers for [${wrapperNames.join(", ")}]`);
  const observedOf = (className) => {
    const src = readFileSync(join(ROOT, `system/wc/${className}.mjs`), "utf8");
    const m = src.match(/static observedAttributes = (\[[^\]]*\])/);
    ok(m, `system/wc/${className}.mjs no longer declares a parseable observedAttributes literal`);
    return m ? JSON.parse(m[1]) : [];
  };
  const attrsValid = (map, observed, props) =>
    Object.entries(map).every(([prop, attr]) => Object.hasOwn(props, prop) && observed.includes(attr));
  for (const c of model.components.filter((x) => x.wrapper)) {
    const map = WRAPPER_ATTRS[c.name];
    const observed = observedOf(c.className);
    ok(attrsValid(map, observed, VOCAB.components[c.name].props),
      `WRAPPER_ATTRS["${c.name}"] drifted — every key must be a vocabulary prop and every value in ${c.className}'s observedAttributes [${observed.join(", ")}]`);
    // The CONVERSE, or the pin is sound but not complete (PR #257 review L4): every vocabulary
    // prop of a wrapped component must be mapped, because vdMarkup/reactSnippet iterate the MAP —
    // a regenerated wrapper gaining a prop would otherwise silently under-project the vd/react
    // tabs, the opposite failure direction from the fabrication the map exists to prevent.
    ok(deep(Object.keys(map).sort()) === deep(Object.keys(VOCAB.components[c.name].props).sort()),
      `WRAPPER_ATTRS["${c.name}"] is incomplete — it maps [${Object.keys(map).sort().join(", ")}] but the vocabulary declares props [${Object.keys(VOCAB.components[c.name].props).sort().join(", ")}]`);
  }
  // The MUTATION that decides whether the fabricated-API refusal is real: the mechanical
  // projection this map exists to prevent (`type` staying `type`) must FAIL the same predicate
  // the real maps just passed — vd-care-task-row observes `action`, not `type`.
  {
    const observed = observedOf("vd-care-task-row");
    const fabricated = { ...WRAPPER_ATTRS["care-task-row"], type: "type" };
    ok(!attrsValid(fabricated, observed, VOCAB.components["care-task-row"].props),
      "the type:\"type\" mutation passed the observedAttributes pin — the fabricated-API check cannot fail");
  }

  // --- 21.6 reactSnippet — the attribute projection over the real example, plus escaping.
  {
    const row = model.components.find((c) => c.name === "care-task-row");
    const snippet = reactSnippet(row, row.example);
    ok(snippet.includes('action="water"') && !snippet.includes('type="water"'),
      `reactSnippet must project type→action — got: ${snippet}`);
    ok(snippet.includes(`import "./wc/${row.className}.mjs";`),
      "reactSnippet lost the wrapper import line");
    const quoted = reactSnippet(row, { type: "water", plantName: 'say "hi"', status: "ok" });
    ok(!quoted.includes('plant-name="say "hi""') && quoted.includes('\\"'),
      `a quote in a prop value must arrive escaped — got: ${quoted}`);
    // present-when-true booleans: checked true is a bare attribute, false is absent.
    ok(reactSnippet(row, { ...row.example, checked: true }).includes(" checked"),
      "a true boolean must project as a bare attribute");
    ok(!reactSnippet(row, { ...row.example, checked: false }).includes("checked"),
      "a false boolean must be absent, not checked=\"false\"");
  }

  // --- 21.7 specPath + fs — a committed spec source behind every copy-as-Markdown button.
  let specFiles = 0;
  for (const name of vocabNames) {
    ok(existsSync(join(ROOT, specPath(name))), `copy-as-Markdown target missing: ${specPath(name)}`);
    specFiles += 1;
  }

  // --- 21.8 the baked fictional notice — components.html's honesty line is a deliberate STATIC
  // second copy of scenarios/verdant/copy.json's fictionalNotice (present even when catalog.mjs's
  // re-confirm fetch fails), and that fetch resolves OUTSIDE the data-catalog="ready" handle the
  // pixel gate waits on. Byte-identity is what keeps the late swap a guaranteed no-op — drift
  // would surface as an INTERMITTENT baseline flake, never a red — so pin it here, the
  // CATALOG_COMPONENTS/TONES second-copy pattern (PR #257 review L1).
  {
    const html = readFileSync(join(ROOT, "components.html"), "utf8");
    const baked = html.match(/<p class="cat-notice" id="fictional-notice">([^<]*)<\/p>/);
    ok(baked, "components.html no longer carries the baked #fictional-notice line for this pin to hold");
    const copy = JSON.parse(readFileSync(join(ROOT, "scenarios/verdant/copy.json"), "utf8"));
    if (baked) ok(baked[1] === copy.fictionalNotice,
      `the baked fictional notice drifted from scenarios/verdant/copy.json — the re-confirm swap is no longer a no-op and the pixel gate can flake. Baked: "${baked[1]}" · copy.json: "${copy.fictionalNotice}"`);
  }

  group("catalog", `pack↔vocabulary set identity over ${vocabNames.length} components · the palette's static list pinned against the artifact (the memoization is why it is static, #188) · controlFor over all ${propsChecked} real props — ${boundedNumbers} bounded number (stat-tile.value, fields compared to the artifact's own), ${unboundedNumbers} unbounded, bounds NEVER invented (hasOwn asserted both ways, plus the partial-bounds synthetic) · tabsFor's ${withWrapper}/${withoutWrapper} wrapper histogram pinned as the #220 tripwire · WRAPPER_ATTRS pinned in BOTH directions (wrapper source text · vocabulary props · exact component set · every prop mapped, so a regenerated wrapper cannot silently under-project) with the type:"type" mutation proving the fabricated-API refusal real · reactSnippet projects type→action, escapes quotes, booleans present-when-true · ${specFiles} committed spec files behind the copy buttons · the baked fictional notice byte-pinned to copy.json so the outside-the-ready-handle re-confirm stays a no-op. The running page — deep links, live serialization, the byte-identical copy, the ⌘K race, the refusal line — is tooling/catalog-journey.mjs's, and says so`);
}

// --- 22 · the canvas selection --------------------------------------------------------------------

{
  // system/studio-select.mjs's PURE half: the marquee's rectangle, the keyboard's rectangle, the
  // menu's item list and the menu's off-edge flip. Written in group 12's and 13's voice — every
  // check RUNS the function, none greps for a constant, and anything deliberately vacuous says so.
  //
  // THE BOUNDARY THIS GROUP DOES NOT REACH, stated rather than left to be assumed, the way groups 9,
  // 11, 13, 16 and 18 state theirs. AC #1's real claim is that the POINTER and the KEYBOARD select
  // THE SAME SET on a running page, and AC #4's is that the two menu OPEN PATHS produce identical
  // items with working arrow navigation. Both need real focus, real pointer capture and a real
  // engine's contextmenu event. What this group can do — and does, below — is prove that the two
  // paths are computed from ONE rectangle and the two menus from ONE item list, so that the
  // driver's identity assertion is checking a wiring rather than a coincidence. The wiring itself,
  // the announcements, the guides on a real stage, the take-over coupling and Escape's
  // non-interference are all tooling/studio-journey.mjs's selectPass.
  const deep = (v) => (v && typeof v === "object" && !Array.isArray(v)
    ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${deep(v[k])}`).join(",")}}`
    : (Array.isArray(v) ? `[${v.map(deep).join(",")}]` : JSON.stringify(v)));

  // --- 22.1 marqueeRange: one rectangle, whichever way the reader dragged ----------------------
  // All four drag directions over the SAME two cells must give the same normalized range, or the
  // pointer path selects a different set depending on which corner the reader started from.
  const corners = [{ col: 2, row: 3 }, { col: 5, row: 6 }];
  const [tl, br] = corners;
  const tr = { col: br.col, row: tl.row };
  const bl = { col: tl.col, row: br.row };
  const wantRange = { col1: 2, row1: 3, col2: 5, row2: 6 };
  for (const [a, b, why] of [
    [tl, br, "top-left to bottom-right"],
    [br, tl, "bottom-right to top-left"],
    [tr, bl, "top-right to bottom-left"],
    [bl, tr, "bottom-left to top-right"],
  ]) {
    ok(deep(marqueeRange(a, b)) === deep(wantRange),
      `marqueeRange dragged ${why} gave ${deep(marqueeRange(a, b))}, expected ${deep(wantRange)} — a marquee's set must not depend on which corner it started from`);
  }
  ok(deep(marqueeRange({ col: 4, row: 4 }, { col: 4, row: 4 })) === deep({ col1: 4, row1: 4, col2: 4, row2: 4 }),
    "a marquee that never left its origin cell is that ONE cell, not an empty range");
  // The clamp, which nothing above can see: a hit-test past the far corner of a drifted stylesheet
  // must not put a range off the grid. clampSlot is the one definition (studio-canvas.mjs:50).
  ok(deep(marqueeRange({ col: -9, row: -9 }, { col: 99, row: 99 }))
    === deep({ col1: 1, row1: 1, col2: MAX_COLS, row2: MAX_ROWS }),
    `an off-grid marquee must clamp to the exported ${MAX_COLS}×${MAX_ROWS}, not carry its own bounds`);

  // --- 22.2 idsInRange: inclusive on EVERY boundary ---------------------------------------------
  // A half-open range is the classic off-by-one here, and it is invisible in the middle of a
  // selection: only a component sitting exactly ON an edge can tell the two apart. So every one of
  // the four edges gets its own member, plus the four just-outside twins.
  const grid = [];
  for (let c = 1; c <= 6; c += 1) for (let r = 1; r <= 6; r += 1) grid.push({ id: `${c}-${r}`, col: c, row: r });
  const inner = { col1: 2, row1: 2, col2: 4, row2: 4 };
  const hit = idsInRange(grid, inner);
  ok(hit.length === 9, `idsInRange over a 3×3 rectangle found ${hit.length} ids, expected 9 — an inclusive range on both axes`);
  for (const id of ["2-2", "4-4", "2-4", "4-2", "3-3"]) {
    ok(hit.includes(id), `idsInRange dropped ${id}, which sits ON the rectangle's boundary — the range is INCLUSIVE`);
  }
  for (const id of ["1-3", "5-3", "3-1", "3-5"]) {
    ok(!hit.includes(id), `idsInRange picked up ${id}, one cell OUTSIDE the rectangle on one axis`);
  }
  ok(deep(idsInRange(grid.slice().reverse(), inner)) === deep(hit.slice().reverse()),
    "idsInRange must answer IN THE ORDER GIVEN — on the running page that order is DOM order, the studio's standing correspondence with board order");
  ok(idsInRange([], inner).length === 0 && idsInRange(grid, { col1: 9, row1: 9, col2: 9, row2: 9 }).length === 0,
    "a marquee over nothing is an empty list, which is what the mount turns into \"Nothing to select.\"");

  // --- 22.3 extendSelection: AC #1's PURE half --------------------------------------------------
  // The keyboard rectangle and the pointer rectangle must be THE SAME rectangle, so the set
  // identity the driver asserts on the running page is a property of one shared definition rather
  // than of two implementations that agree today. Two Shift+Arrow presses from the anchor, against
  // a marquee dragged over the same two corners.
  const anchor = { col: 2, row: 3 };
  const right = extendSelection(anchor, null, DIRS.ArrowRight);
  const down = extendSelection(anchor, right.cursor, DIRS.ArrowDown);
  ok(deep(down.cursor) === deep({ col: 3, row: 4 }), `two Shift+Arrow presses put the cursor at ${deep(down.cursor)}, expected {col:3,row:4}`);
  ok(deep(down.range) === deep(marqueeRange(anchor, { col: 3, row: 4 })),
    "extendSelection's rectangle is not marqueeRange's over the same corners — AC #1's identity claim rests on there being ONE rectangle");
  const bySet = (ids) => deep([...ids].sort());
  ok(bySet(idsInRange(grid, down.range)) === bySet(idsInRange(grid, marqueeRange(anchor, down.cursor))),
    "the keyboard path and the pointer path selected DIFFERENT id sets over the same corners — this is AC #1");
  // THE ANCHOR DOES NOT MOVE. Re-anchoring on the second press gives a 1×2 instead of a 2×2, which
  // is the defect the module header records: it looks like a feature bug at driver-assert time.
  ok(deep(extendSelection(anchor, down.cursor, DIRS.ArrowLeft).range) === deep(marqueeRange(anchor, { col: 2, row: 4 })),
    "extendSelection re-derived its rectangle from the cursor rather than from the unmoving anchor");
  // IT REPLACES, IT DOES NOT UNION — Task 2's recorded decision, and MUTATION 4's case. A union
  // implementation returns a range (or a set) that still contains the stray, so the assertion is
  // written on the resulting ID SET against a marquee's, from a start that HAS a stray.
  const strayThenKeyboard = idsInRange(grid, extendSelection(anchor, null, DIRS.ArrowRight).range);
  ok(!strayThenKeyboard.includes("6-6"),
    "extendSelection's rectangle reached a cell outside the anchor→cursor rectangle — it must REPLACE the selection, never union with a stray Shift-click");
  ok(bySet(strayThenKeyboard) === bySet(["2-3", "3-3"]),
    `one Shift+Right from {2,3} selected ${bySet(strayThenKeyboard)}, expected exactly the two cells of the anchor→cursor rectangle`);
  // Walking off the grid CLAMPS and never throws — the keyboard equivalent of a marquee dragged
  // past the edge, and a real thing a reader does by holding the key down.
  let walk = { cursor: { col: 1, row: 1 }, range: null };
  for (let i = 0; i < MAX_COLS + 5; i += 1) walk = extendSelection({ col: 1, row: 1 }, walk.cursor, DIRS.ArrowLeft);
  ok(deep(walk.cursor) === deep({ col: 1, row: 1 }), `Shift+Left held against the edge walked to ${deep(walk.cursor)} instead of clamping at column 1`);
  let walkR = { cursor: { col: 1, row: 1 } };
  for (let i = 0; i < MAX_COLS + 5; i += 1) walkR = extendSelection({ col: 1, row: 1 }, walkR.cursor, DIRS.ArrowRight);
  ok(walkR.cursor.col === MAX_COLS, `Shift+Right held down reached column ${walkR.cursor.col}, not the exported cap ${MAX_COLS}`);
  // A selection rectangle INCLUDES what it covers — the opposite of stepSlot's skip-the-occupied
  // rule, and the reason extendSelection is its own function rather than a call into that one.
  const overPeer = extendSelection({ col: 2, row: 2 }, null, DIRS.ArrowRight);
  ok(deep(overPeer.cursor) === deep({ col: 3, row: 2 }),
    "extendSelection skipped a cell — a selection rectangle covers what it covers; only a CARRY steps over an occupied cell");

  // --- 22.4 menuItems: one source for both open paths -------------------------------------------
  // MUTATION 6's case, asserted BOTH ways: a menu offering `Select this` AND `Deselect this` makes
  // the reader guess which one describes the current state.
  const onSelected = menuItems({ selected: true, anySelected: true, canUndo: true, canRedo: true });
  const onPlain = menuItems({ selected: false, anySelected: false, canUndo: false, canRedo: false });
  ok(onSelected[0].id === MENU_DESELECT.id, `the menu on a SELECTED node opens with ${onSelected[0].id}, expected ${MENU_DESELECT.id}`);
  ok(onPlain[0].id === MENU_SELECT.id, `the menu on an UNSELECTED node opens with ${onPlain[0].id}, expected ${MENU_SELECT.id}`);
  for (const [items, why] of [[onSelected, "selected"], [onPlain, "unselected"]]) {
    const ids = items.map((i) => i.id);
    ok(!(ids.includes(MENU_SELECT.id) && ids.includes(MENU_DESELECT.id)),
      `the ${why} node's menu offers BOTH ${MENU_SELECT.id} and ${MENU_DESELECT.id}; the item names what activating it will do, so exactly one of them is true at a time`);
  }
  ok(onSelected.map((i) => i.id).includes("clear"), "Clear selection is missing from a menu opened WITH a selection live");
  ok(!onPlain.map((i) => i.id).includes("clear"),
    "Clear selection appears with nothing selected — it is conditional rather than disabled, because a verb with nothing to act on is not a verb whose moment has not come");
  ok(onPlain.find((i) => i.id === "undo").disabled === true && onSelected.find((i) => i.id === "undo").disabled === false,
    "Undo's disabled flag does not follow canUndo — the menu would offer a verb the history cannot do");
  ok(onSelected.every((i) => typeof i.label === "string" && i.label.length > 0),
    "a menu item has no label — the driver compares the two open paths by ACCESSIBLE NAME");
  // No invented verbs. The pattern grammar has no delete, duplicate or z-order, and a menu item
  // that always refuses is a lie about capability rather than an honest refusal.
  const KNOWN = new Set([MENU_SELECT.id, MENU_DESELECT.id, ...MENU_ITEMS.map((i) => i.id)]);
  for (const i of [...onSelected, ...onPlain]) {
    ok(KNOWN.has(i.id), `the menu offers "${i.id}", which is not in MENU_ITEMS — every item must be a REAL verb, never one that always refuses`);
  }
  // FROZEN, both levels: a mutation attempt leaves it unchanged, so the two open paths cannot be
  // made to disagree at runtime. Run rather than grepped for Object.freeze.
  const beforeLen = MENU_ITEMS.length;
  const beforeLabel = MENU_ITEMS[0].label;
  try { MENU_ITEMS.push({ id: "evil", label: "Delete everything" }); } catch { /* strict mode throws; frozen is the point either way */ }
  try { MENU_ITEMS[0].label = "tampered"; } catch { /* ditto */ }
  ok(MENU_ITEMS.length === beforeLen && MENU_ITEMS[0].label === beforeLabel,
    "MENU_ITEMS is mutable at runtime — the menu's two open paths could then be made to disagree");
  // …and the items menuItems HANDS OUT are copies where they carry state, so a caller that stamps
  // `disabled` on one cannot poison the next menu.
  onSelected.find((i) => i.id === "undo").disabled = true;
  ok(menuItems({ selected: true, anySelected: true, canUndo: true, canRedo: true }).find((i) => i.id === "undo").disabled === false,
    "menuItems handed out the shared frozen item for a STATEFUL entry — one menu's disabled flag leaked into the next");

  // --- 22.5 menuAnchor: R5's off-edge flip, on both sides of each boundary -----------------------
  // MUTATION 5's case. An off-by-one here is invisible on every interior cell, which is exactly
  // where a menu gets tried — so the boundary is asserted from BOTH sides on BOTH axes.
  for (const [col, row, flipX, flipY, why] of [
    [1, 1, false, false, "the origin opens down and to the right, like every interior cell"],
    [MAX_COLS - 1, MAX_ROWS - 1, false, false, "one cell inside the far corner must NOT flip"],
    [MAX_COLS, MAX_ROWS - 1, true, false, "the last COLUMN flips only the X axis"],
    [MAX_COLS - 1, MAX_ROWS, false, true, "the last ROW flips only the Y axis"],
    [MAX_COLS, MAX_ROWS, true, true, "the far corner flips both"],
  ]) {
    const a = menuAnchor(col, row);
    ok(a.flipX === flipX && a.flipY === flipY,
      `menuAnchor(${col}, ${row}) gave flipX ${a.flipX} / flipY ${a.flipY}, expected ${flipX} / ${flipY} — ${why}`);
    ok(a.col === col && a.row === row,
      `menuAnchor(${col}, ${row}) moved the anchor to ${a.col}, ${a.row}; the menu is placed in the INVOKER's cell and flipped within it, never relocated`);
  }
  // The caps are PARAMETERS, so a narrower grid flips earlier — which is what proves the boundary
  // is read from the caps rather than from a literal 12 baked into the comparison.
  ok(menuAnchor(6, 4, 6, 4).flipX === true && menuAnchor(5, 4, 6, 4).flipX === false,
    "menuAnchor's flip boundary does not follow its cols/rows arguments — a hard-coded cap here drifts the day the canvas widens");
  ok(menuAnchor(99, 99).col === MAX_COLS && menuAnchor(-5, -5).col === 1,
    "menuAnchor must clamp an off-grid invoker through clampSlot rather than placing a menu off the stage");

  // --- 22.6 totality ---------------------------------------------------------------------------
  // Every export answers junk with a shape, never a throw. clampSlot's default parameter covers
  // `undefined` and NOT `null`, so a null slot destructures and throws — found by running this,
  // which is why the module coerces once rather than at four call sites.
  const junk = [null, undefined, 0, "x", [], {}, NaN, true, { col: "a" }, [{ id: null }]];
  for (const j of junk) {
    marqueeRange(j, j);
    idsInRange(j, j);
    extendSelection(j, j, j);
    menuAnchor(j, j);
    menuItems(j);
  }
  ok(deep(idsInRange(junk, null)) === deep([]), "idsInRange over junk must answer [], not throw");
  ok(deep(marqueeRange(null, null)) === deep({ col1: 1, row1: 1, col2: 1, row2: 1 }),
    "marqueeRange over nulls must answer the origin cell — clampSlot's posture, not a throw");
  ok(deep(extendSelection({ col: 4, row: 4 }, { col: 4, row: 4 }, [NaN, 1]).cursor) === deep({ col: 4, row: 4 }),
    "a non-finite direction must leave the cursor where it is; letting NaN reach clampSlot answers the ORIGIN, which is a jump rather than a refusal");

  group("select", `marqueeRange normalized identically from all 4 drag directions and clamped to the exported ${MAX_COLS}×${MAX_ROWS} · idsInRange inclusive on all four boundaries with the four just-outside twins refused, order preserved, empty over nothing · extendSelection is AC #1's PURE half — the keyboard rectangle asserted to BE marqueeRange's over the same corners and the resulting ID SETS compared, the anchor proven not to re-derive from the cursor (the 1×2-instead-of-2×2 defect), the REPLACE-not-union rule pinned on the id set, the held-key clamp on both edges, and a covered cell proven NOT skipped (a rectangle is not a carry) · menuItems' contextual pair asserted both ways and never both, Clear conditional, the disabled flags following canUndo/canRedo, no invented verb, MENU_ITEMS frozen BY MUTATION at both levels and its stateful items proven to be copies · menuAnchor's flips on BOTH sides of BOTH boundaries with the caps proven to be parameters · total over ${junk.length} junk inputs per export. The two input paths actually selecting the same set, the two menu open paths, the arrow navigation, Escape's non-interference and the take-over coupling are tooling/studio-journey.mjs's selectPass, and say so`);
}

// --- 23 · the studio's docked docs (#218) -----------------------------------------------------------
//
// system/studio-docs.mjs mounts system/catalog.mjs's renderComponentDocs a SECOND time, in
// /factory's inspector. Almost nothing about that is decidable under Node — but the two invariants
// the whole ticket rests on are, and both of them are invisible to every OTHER gate in this repo,
// which is exactly why they were extracted into pure functions rather than left as `if`s:
//
//   · THE JOIN'S ARITY. A regression to the two-argument prepareHandoff(pack, vocab) renders a
//     perfectly plausible panel — with `tokens`, `example`, `wrapper` and `consumer` silently null,
//     so the inspector is quietly poorer than /components. No console error, no pixel difference,
//     nothing for a reader to notice. Case 5 drives loadDocsModel with a stub fetch over the real
//     committed files and asserts the third argument's fields survived, with the graph-omitted
//     MUTATION that decides whether the assertion can fail at all.
//
//   · THE LAZY RULE. "At rest this page fetched nothing for the docs panel" is invisible to the
//     pixel gate (identical pixels either way), to drift-check (no artifact) and to this job (no
//     browser). Case 6 gates the RULE — shouldLoad's truth table, and COMPILED_SELECTOR pinned
//     against studio-flow.mjs's own class so a renamed screen turns the rule red rather than turning
//     the docs panel permanently empty.
//
// AND IT STATES ITS BOUNDARY, the way groups 9, 11, 13, 16, 18, 19 and 22 state theirs. That a click
// OPENS anything, that the panel and /components agree ON THE PAGE, that focus is not stolen from
// the canvas, that token values resolve live under a pack swap, and that refresh() actually consults
// shouldLoad rather than fetching anyway are all tooling/studio-journey.mjs's docsPass, on a running
// page across three engines. Cases 5 and 6 gate the RULES; docsPass assertions 1 and 5 gate the
// WIRING. Neither is sufficient alone, and saying so here is what stops a later editor deleting one
// as redundant.
{
  const { COMPILED_SELECTOR, DOCS_SOURCES, docsIndex, loadDocsModel, shouldLoad } =
    await import("../system/studio-docs.mjs");
  const { headingTags } = await import("../system/catalog.mjs");

  // Group 13/15/19/21's hand-written canonical stringify, copied for its standing reason:
  // JSON.stringify(v, keys) puts an array in the REPLACER position and silently filters every level.
  const deep = (v) => {
    if (Array.isArray(v)) return `[${v.map(deep).join(",")}]`;
    if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${deep(v[k])}`).join(",")}}`;
    return JSON.stringify(v);
  };

  const PACK = JSON.parse(readFileSync(join(ROOT, "handoff/verdant/pack.json"), "utf8"));
  const GRAPH = JSON.parse(readFileSync(join(ROOT, "system/system-graph.json"), "utf8"));
  const RENDERER_SRC = readFileSync(join(ROOT, "system/agentic-renderer.mjs"), "utf8");

  // --- 23.1 index integrity over the REAL artifacts ---------------------------------------------
  // One entry per pack component, so no class collision is being silently absorbed (docsIndex
  // throws on one; this asserts none occurred rather than trusting that it would have).
  const model = prepareHandoff(PACK, VOCAB, GRAPH);
  const index = docsIndex(model.components);
  ok(index.size === PACK.components.length,
    `docsIndex holds ${index.size} classes for ${PACK.components.length} pack components — a component was dropped or two share a class`);
  for (const [className, row] of index)
    ok(typeof className === "string" && className.length > 0 && typeof row.name === "string" && row.name.length > 0,
      `docsIndex key/row pair is not a usable (class, name): ${JSON.stringify([className, row && row.name])}`);

  // --- 23.2 THE CLICK TARGET IS REAL — the group's load-bearing case ----------------------------
  // The decoration scans the stage for `.<className>` and the RENDERER decides what class a
  // component actually gets. Those are two files that must agree, and nothing else in this repo
  // asserts that they do: group 21 pins the pack against the VOCABULARY, not against the templates.
  //
  // So: read the class literal out of agentic-renderer.mjs's source for every pack component, in
  // all three forms its templates use ( class: "x" · class: `x${…}` · class: `x is-…` ), and
  // require the pack's class to be one of them. A template rename, a pack rename or a spec rename
  // each break this from a different side, which is what makes it a drift detector rather than a
  // restatement. It is a SOURCE-TEXT check and says so: the alternative is a DOM, which this job
  // does not have.
  const emitsClass = (src, className) => {
    const esc = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`class: (?:"${esc}"|\`${esc}(?:\\$| ))`).test(src);
  };
  for (const c of PACK.components) {
    ok(index.has(c.class), `the docs index cannot resolve "${c.component}"'s class ${c.class}`);
    ok(emitsClass(RENDERER_SRC, c.class),
      `agentic-renderer.mjs emits no root class "${c.class}" for "${c.component}" — a rendered component the inspector's decoration would never find, so clicking it does nothing`);
  }

  // …and specifically over what the SHIPPED page really puts on the canvas: every component the
  // committed replay board's compiled screens render. Driven through compileSteps — the beat's own
  // pipeline, which is what actually decides the composition (screensFor stops at counted SLOTS) —
  // so the trigger set is asserted against the RENDERED set rather than against a literal.
  const { compileSteps: compileSteps23 } = await import("../system/studio-compile.mjs");
  const REPLAY_BOARD_23 = JSON.parse(readFileSync(join(ROOT, "replay/build-fieldwork-dispatch.board.json"), "utf8"));
  const rendered = new Set();
  for (const screen of compileSteps23(REPLAY_BOARD_23, DEFAULT_ANSWERS).screens || [])
    for (const node of screen.composition || []) if (node && node.name) rendered.add(node.name);
  ok(rendered.size > 0, "the committed board compiled to no components at all — case 23.2 would be vacuous");
  const classOf = new Map(PACK.components.map((c) => [c.component, c.class]));
  for (const name of rendered) {
    const className = classOf.get(name);
    ok(className && index.has(className) && emitsClass(RENDERER_SRC, className),
      `"${name}" is on the compiled canvas but is not a doc trigger — class ${className || "(absent from the pack)"}`);
  }

  // --- 23.3 THE MUTATIONS THAT PROVE 23.2 CAN FAIL ----------------------------------------------
  // Repo memory, "the check that cannot fail": mutate the source and RUN the function, never grep
  // for a constant. Two mutations, because 23.2 has two halves that fail from opposite sides.
  {
    const renamed = JSON.parse(JSON.stringify(PACK));
    const victim = renamed.components.find((c) => c.component === "metric-tile");
    victim.class = "ds-metric-tile-RENAMED";
    const mutated = docsIndex(prepareHandoff(renamed, VOCAB, GRAPH).components);
    ok(mutated.has(victim.class), "the mutation did not take — the clone is not being indexed");
    ok(!emitsClass(RENDERER_SRC, victim.class),
      `a renamed pack class still resolved against the renderer — case 23.2's drift detector cannot fail, and "${victim.component}" is what it would have named`);
  }
  {
    const collided = JSON.parse(JSON.stringify(PACK));
    collided.components[1].class = collided.components[0].class;
    let threw = null;
    try { docsIndex(prepareHandoff(collided, VOCAB, GRAPH).components); } catch (e) { threw = e; }
    ok(threw && threw.message.includes(collided.components[0].class)
      && threw.message.includes(collided.components[1].component),
      `two components claiming one class must throw and NAME both — silently keeping the last would open the wrong component's docs. Got: ${threw ? threw.message : "no throw"}`);
  }

  // --- 23.4 headingTags — the whole of what #218 spent renderComponentDocs's `opts` pocket on ----
  // Lives here rather than in group 21 (the function is catalog.mjs's, but it exists only for the
  // second mount and this is the group that owns the second mount). The section tag is ALWAYS
  // exactly one level below the name, at every input, which is the property the outline depends on.
  ok(deep(headingTags(2)) === deep({ name: "h2", section: "h3" }), `headingTags(2) → ${deep(headingTags(2))}`);
  ok(deep(headingTags(4)) === deep({ name: "h4", section: "h5" }), `headingTags(4) → ${deep(headingTags(4))}`);
  ok(deep(headingTags(5)) === deep({ name: "h5", section: "h6" }), `headingTags(5) must clamp the section at h6 — got ${deep(headingTags(5))}`);
  for (const junk of [undefined, null, NaN, Infinity, -3, 0, 1, 9, 99, "4", {}, []]) {
    const { name, section } = headingTags(junk);
    ok(/^h[2-5]$/.test(name) && section === `h${Number(name.slice(1)) + 1}`,
      `headingTags(${JSON.stringify(junk)}) → ${name}/${section}; the name must clamp to h2..h5 and the section must be exactly one below it`);
  }
  // Mount 1 stays byte-identical: an ABSENT opts.level must resolve to 2, which is the tag the
  // catalog page has always rendered.
  ok(deep(headingTags(({}).level)) === deep({ name: "h2", section: "h3" }),
    "an absent opts.level must resolve to h2/h3 — anything else silently rewrites /components' outline");

  // --- 23.5 THE JOIN'S ARITY, DRIVEN — the ticket's AC #3, as a gated fact ----------------------
  // A stub fetch serving the three committed artifacts off disk, recording what was asked for.
  const asked = [];
  const diskFetch = (only) => async (url) => {
    asked.push(url);
    const rel = url.replace(/^\//, "");
    if (only && !only.includes(url)) return { ok: false, status: 404 };
    const text = readFileSync(join(ROOT, rel), "utf8");
    return { ok: true, status: 200, json: async () => JSON.parse(text) };
  };
  const joined = await loadDocsModel(diskFetch(null));
  ok(deep(asked) === deep(DOCS_SOURCES),
    `loadDocsModel asked for ${deep(asked)}; it must ask for exactly DOCS_SOURCES ${deep(DOCS_SOURCES)} — a mount that fetched two of the three could never satisfy this`);
  // Snapshotted HERE, before the mutation below drives the same function again — the summary line
  // must print what the assertion actually saw, not a running total.
  const askedOnce = asked.length;
  // THE LOAD-BEARING HALF: the fields that exist ONLY because the third argument was passed.
  const tileRow = joined.model.components.find((c) => c.name === "metric-tile");
  ok(tileRow && Array.isArray(tileRow.tokens) && tileRow.tokens.length > 0 && tileRow.tokens.some((t) => t.group),
    "the joined rows carry no resolved token groups — the graph argument did not reach prepareHandoff, and the inspector is quietly poorer than /components");
  const withConsumer = joined.model.components.filter((c) => c.consumer).length;
  ok(withConsumer > 0, "no joined row carries a measured `consumer` — the graph argument did not reach prepareHandoff");
  // The `shared` model, asserted field by field against the ARTIFACTS — the same { vocab,
  // portability } shape mountCatalog builds on the other page, so renderComponentDocs receives an
  // identical second argument in both mounts rather than a lookalike assembled differently here.
  ok(joined.shared && deep(Object.keys(joined.shared).sort()) === deep(["portability", "vocab"]),
    `loadDocsModel's \`shared\` must carry exactly { vocab, portability } — got ${deep(joined.shared && Object.keys(joined.shared).sort())}`);
  ok(deep(joined.shared.vocab) === deep(VOCAB),
    "loadDocsModel's `shared.vocab` is not the committed vocabulary — renderComposition would validate against something else");
  ok(deep(joined.shared.portability) === deep(PACK.portability ?? null),
    "loadDocsModel's `shared.portability` is not the pack's own portability block — the wrapper tabs and the Figma path would drift from mount 1");
  ok(joined.index instanceof Map && joined.index.size === index.size,
    "loadDocsModel must return the index built from its own join, not a second one");
  // THE MUTATION: the same function against a stub whose graph 404s. prepareHandoff degrades every
  // joined field to null by design, so this is exactly the shape a two-argument regression takes —
  // and it must be VISIBLE here, or case 23.5 above is decoration.
  {
    let degraded = null;
    try { degraded = await loadDocsModel(diskFetch(DOCS_SOURCES.slice(0, 2))); } catch { /* the throw is the other honest answer */ }
    if (degraded) {
      const tile = degraded.model.components.find((c) => c.name === "metric-tile");
      ok(tile && tile.tokens === null && degraded.model.components.every((c) => !c.consumer),
        "a graph-less join still produced token groups and consumers — case 23.5's assertion cannot fail, so AC #3 is not gated here at all");
    } else {
      ok(true, "a graph-less join refused outright, which is the other honest answer");
    }
  }

  // --- 23.6 THE LAZY RULE — shouldLoad's truth table and the pinned discriminator ---------------
  for (const compiled of [false, true])
    for (const loaded of [false, true])
      for (const loading of [false, true]) {
        const want = compiled && !loaded && !loading;
        ok(shouldLoad({ compiled, loaded, loading }) === want,
          `shouldLoad({compiled:${compiled},loaded:${loaded},loading:${loading}}) must be ${want} — fetch only once the stage has compiled, only once, never while a load is in flight`);
      }
  // Total, like every other pure function in this file: junk answers false rather than throwing, so
  // a corrupted call site cannot turn the lazy rule into an eager one.
  for (const junk of [undefined, null, 0, "", [], "compiled", { compiled: "yes", loaded: 1 }, { loading: 0 }])
    ok(shouldLoad(junk) === false,
      `shouldLoad(${JSON.stringify(junk)}) returned ${shouldLoad(junk)}; junk is not a compiled canvas and must never open a fetch`);
  // …and the ONE positive control this table needs: without it every row above passes for a
  // function that returns false unconditionally, which is the eager rule's exact opposite and just
  // as wrong. (Repo memory: the check that cannot fail.)
  ok(shouldLoad({ compiled: true, loaded: false, loading: false }) === true,
    "shouldLoad never returns true — the docs panel would stay empty forever, and every negative row above would still pass");
  // COMPILED_SELECTOR pinned against studio-flow.mjs's OWN class, read out of its renderScreen
  // source rather than typed twice. A renamed screen class now turns this rule red instead of
  // turning the docs panel permanently empty — a failure mode with no other detector anywhere.
  {
    const flowSrc = readFileSync(join(ROOT, "system/studio-flow.mjs"), "utf8");
    const rootClass = flowSrc.match(/el\("section",\s*\{\s*class:\s*"([a-z-]+)"/);
    ok(rootClass, "studio-flow.mjs's renderScreen no longer opens with a literal section class for this pin to read");
    if (rootClass) ok(COMPILED_SELECTOR === `.${rootClass[1]}`,
      `COMPILED_SELECTOR is ${COMPILED_SELECTOR} but renderScreen emits .${rootClass[1]} — the studio would never notice it had compiled`);
  }

  group("studio docs", `docsIndex over the real pack — ${index.size} classes, one per component, collisions proven to THROW and to name both sides · every pack class asserted to be a class agentic-renderer.mjs actually emits (three template forms, source-text and says so), plus the ${rendered.size} components the COMMITTED replay board really compiles, each proven to be a doc trigger · the class-rename MUTATION proving that detector can fail · headingTags exact at 2/4/5 and total over 12 junk levels, with the absent-level default pinned so mount 1 stays byte-identical · loadDocsModel driven with a stub fetch: exactly ${askedOnce} requests equal to DOCS_SOURCES, the THIRD argument's fields (token groups, ${withConsumer} measured consumers) asserted present, and the graph-omitted MUTATION proving that assertion real — AC #3 gated rather than true by construction · shouldLoad's full 8-row truth table + totality, and COMPILED_SELECTOR pinned against studio-flow.mjs's own renderScreen class. The click, the opened panel, the cross-page agreement, the un-stolen focus, the live token values and the at-rest request count are tooling/studio-journey.mjs's docsPass, and say so`);
}

// --- 24 · the studio's device frames (#219) ----------------------------------------------------------
// system/studio-frames.mjs's pure layer: the two descriptors and the pack-line matcher.
//
// WHAT THIS GROUP CAN SEE, and it is a short list on purpose — the frames are two <iframe>s, and
// almost everything true about them is only true in a browser. It gates the DATA: that the two
// prototypes named here are files that exist, that their footprints are geometry the canvas can
// actually hold, and that the pack matcher answers the question the mount asks it.
//
// WHAT IT CANNOT REACH, stated as groups 9, 11, 13, 16, 18, 19, 21 and 23 all state theirs: that the
// frames RENDER, that their contents carry no nested dock / inspect toggle / palette (the AC #2
// assertion, which must be made on the frame's own contentDocument), that the pack FOLLOWS a
// mid-visit dock swap, that the resize gesture produces the same span from a pointer, a keypress and
// an injected source:"agent" action, and that the readiness handle resolves. Those are
// tooling/studio-journey.mjs's framesPass, on a running page across three engines.
{
  const { FRAMES, packHref, packLink } = await import("../system/studio-frames.mjs");
  const { MAX_COLS: FMAX_COLS, MAX_ROWS: FMAX_ROWS, clampSpan: fClampSpan, footprint: fFootprint } =
    await import("../system/studio-canvas.mjs");

  // --- 24.1 the descriptor list is DATA, and frozen at both levels -----------------------------
  // MENU_ITEMS' idiom (group 22): proven by MUTATION rather than by Object.isFrozen, because the
  // property that matters is that a caller cannot change it, not that a flag is set.
  ok(Array.isArray(FRAMES) && FRAMES.length === 2,
    `FRAMES should hold exactly the two committed prototypes; got ${Array.isArray(FRAMES) ? FRAMES.length : typeof FRAMES}`);
  {
    const beforeLen = FRAMES.length;
    try { FRAMES.push({ id: "smuggled" }); } catch { /* strict-mode frozen array throws */ }
    ok(FRAMES.length === beforeLen, "FRAMES accepted a pushed entry — a caller could add a third frame at runtime");
    const first = FRAMES[0];
    const beforeSrc = first.src;
    try { first.src = "/proto/smuggled.html"; } catch { /* frozen */ }
    ok(first.src === beforeSrc, "a FRAMES entry accepted a written src — the descriptors are not frozen at the second level");
  }

  // --- 24.2 every src and standalone is a REAL COMMITTED FILE ----------------------------------
  // A renamed proto page fails HERE, where the message says which descriptor to edit, rather than as
  // two empty boxes on a public canvas that no gate in this repo would notice: the pixel gate MASKS
  // the frames' content, so a 404 inside one compares cleanly against its own baseline forever.
  const frameFile = (url) => join(ROOT, String(url).split("#")[0].replace(/^\//, ""));
  for (const f of FRAMES) {
    ok(existsSync(frameFile(f.src)), `FRAMES["${f.id}"].src points at ${f.src}, which is not a committed file`);
    ok(existsSync(frameFile(f.standalone)), `FRAMES["${f.id}"].standalone points at ${f.standalone}, which is not a committed file`);
    // NEITHER URL CARRIES A FRAGMENT, and that is a property rather than tidiness: a `src` fragment
    // scrolls every ANCESTOR scroll container when the frame lands, which left the studio canvas
    // scrolled at rest (measured: .stx-scroll.scrollTop 313) and made the pixel baseline depend on
    // when a lazy frame happened to load. The anchoring is the module's own contentWindow.scrollTo.
    ok(!String(f.src).includes("#") && !String(f.standalone).includes("#"),
      `FRAMES["${f.id}"] carries a URL fragment; a src fragment scrolls the CANVAS as well as the frame, and studio-frames.mjs's anchorFrame exists to not do that`);
    // THE ANCHOR, pinned against the committed HTML. NOTHING depends on it resolving — a frame that
    // never scrolls shows the proto page's lede and the reader scrolls it — which is exactly why it
    // needs a check: a proto refactor renaming the id reverts both frames to their ledes with no
    // other symptom, and the pixel gate MASKS the content that would have shown the difference.
    ok(typeof f.anchor === "string" && f.anchor,
      `FRAMES["${f.id}"] declares no anchor — the frame would open at the proto page's lede rather than at the prototype`);
    if (f.anchor) {
      const html = readFileSync(frameFile(f.src), "utf8");
      ok(new RegExp(`id="${f.anchor}"`).test(html),
        `FRAMES["${f.id}"] anchors at #${f.anchor}, which is not an id in ${f.src} — the frame would silently show that page's lede instead`);
    }
    ok(typeof f.title === "string" && f.title.trim().length > 0, `FRAMES["${f.id}"] has no iframe title — an untitled frame is unnavigable by a screen reader`);
    ok(typeof f.caption === "string" && f.caption.includes("this site's pack"),
      `FRAMES["${f.id}"]'s caption must tell the reader the frame wears the SITE pack — that sentence is how the honesty contract discharges the "a dropped brand does not reach the frames" decision, and deleting it is how it would be lost`);
  }
  // THE MUTATION that decides whether the file check can fail at all. Over a CLONE of the data, so
  // the committed descriptors are untouched.
  {
    const broken = FRAMES.map((f) => ({ ...f, src: "/proto/nope.html" }));
    ok(broken.every((f) => !existsSync(frameFile(f.src))),
      "a descriptor pointed at /proto/nope.html still resolved to a file — case 24.2 cannot fail, so it proves nothing about the real ones");
  }

  // --- 24.3 both footprints are geometry the canvas can hold ------------------------------------
  // On the grid by clampSpan's OWN definition (a span the clamp would change is a span off the
  // grid), disjoint from each other, and CLEAR OF ROW 1 — which is where studio.mjs's arrangeBoard
  // puts every place, so a frame overlapping it would collide with a board the replay driver has not
  // built yet. The message says the reason, because the number alone reads as arbitrary.
  const cells = new Map();
  for (const f of FRAMES) {
    ok(f.col >= 1 && f.col <= FMAX_COLS && f.row >= 1 && f.row <= FMAX_ROWS,
      `FRAMES["${f.id}"] starts at ${f.col},${f.row}, off the ${FMAX_COLS}×${FMAX_ROWS} grid`);
    const clamped = fClampSpan({ col: f.col, row: f.row }, { cols: f.spanCol, rows: f.spanRow });
    ok(clamped.cols === f.spanCol && clamped.rows === f.spanRow,
      `FRAMES["${f.id}"] declares a ${f.spanCol}×${f.spanRow} span at column ${f.col}, row ${f.row}, which clampSpan would cut to ${clamped.cols}×${clamped.rows} — the footprint runs off the grid`);
    ok(f.row > 1, `FRAMES["${f.id}"] starts on row 1, where studio.mjs's arrangeBoard lays every board place — the frame and the replay's own blocks would collide`);
    for (const cell of fFootprint({ col: f.col, row: f.row }, { cols: f.spanCol, rows: f.spanRow })) {
      ok(!cells.has(cell), `FRAMES["${f.id}"] covers cell ${cell}, which FRAMES["${cells.get(cell)}"] already covers — two frames cannot share a cell`);
      cells.set(cell, f.id);
    }
  }
  ok(FRAMES.every((f) => !cells.has(`${f.col},1`)) && [...cells.keys()].every((k) => !k.endsWith(",1")),
    "a frame footprint reaches row 1 — arrangeBoard's row");

  // --- 24.4 packHref answers the question the mount asks it -------------------------------------
  // Driven over a STUB document, which is the whole reason it takes one: the mount calls it for the
  // top document AND for each frame's contentDocument, and neither exists in Node.
  const stubDoc = (hrefs) => ({
    querySelectorAll: () => hrefs.map((href) => ({ getAttribute: (k) => (k === "href" ? href : null) })),
  });
  ok(packHref(stubDoc(["/system/tokens.contract.css", "/system/tokens.neutral.css"])) === "/system/tokens.neutral.css",
    "packHref returned the CONTRACT line — it comes first in head order on every shipped page, which is the trap catalog.mjs:503-508 and dock.mjs:72 both record");
  ok(packHref(stubDoc(["/system/tokens.saulera.css"])) === "/system/tokens.saulera.css",
    "packHref did not match a pack line that is the only stylesheet");
  ok(packHref(stubDoc(["/system/components.css", "/system/tokens.contract.css"])) === null,
    "packHref must answer null on a document with no pack line, not throw and not guess");
  ok(packHref(stubDoc([])) === null, "packHref must answer null on a document with no stylesheets at all");
  ok(packLink(stubDoc(["/system/tokens.neutral.css"]))?.getAttribute("href") === "/system/tokens.neutral.css",
    "packLink must return the ELEMENT — the mount writes the new href onto it");
  // Total over junk, never a throw: contentDocument is NULL for a frame that has not loaded and for
  // one on another origin, and the mount's loop must not die on the first of them. `undefined` is
  // deliberately NOT in this list — it selects the default parameter, which is the top `document`,
  // and asserting that a no-argument call is safe under Node would be asserting the opposite of what
  // the browser call means.
  for (const junk of [null, {}, { querySelectorAll: null }, 7, "doc", []]) {
    let threw = null;
    try { packHref(junk); } catch (e) { threw = e; }
    ok(!threw, `packHref(${JSON.stringify(junk)}) threw: ${threw && threw.message}`);
  }
  // …and it must match by SHAPE rather than by an allowlist, so a pack that joins dock.mjs's PACK_RE
  // needs no second edit here. A pack name nothing has shipped yet still resolves.
  ok(packHref(stubDoc(["/system/tokens.notyetapack.css"])) === "/system/tokens.notyetapack.css",
    "packHref refused an unknown pack name — it is 'which line do I observe', not a security allowlist, and narrowing it to PACK_RE would make it a second copy of one");

  group("frames", `FRAMES holds the ${FRAMES.length} committed prototypes, frozen at BOTH levels by mutation (a pushed entry and a written src) · every src and standalone proven to be a real committed file, with the /proto/nope.html mutation that decides whether that check can fail — the pixel gate MASKS this content, so a 404 inside a frame compares cleanly against its own baseline forever · each descriptor's ANCHOR pinned as a real id in the committed proto HTML and NEITHER url allowed a fragment (a src fragment scrolls the canvas as well as the frame): nothing depends on the anchor resolving, which is exactly why a rename would revert both frames to their page ledes with no other symptom · every caption proven to carry the site-pack sentence, which is how the honesty contract discharges "a dropped brand does not reach the frames" · both footprints on the grid by clampSpan's OWN definition, disjoint cell by cell through footprint(), and clear of ROW 1 with arrangeBoard named as the reason · packHref over a stub document: the CONTRACT line refused (the head-order trap dock.mjs:72 records), a lone pack line matched, null rather than a throw on a document with no pack line, total over 6 junk documents because an unloaded frame's contentDocument is one, and an unshipped pack name still matched — this is "which line do I observe", not a second copy of PACK_RE. That the frames RENDER, that their contents carry no nested chrome (asserted on contentDocument), that the pack FOLLOWS a mid-visit swap, that the resize gesture agrees across pointer, keyboard and an injected agent action, and that the ready handle resolves are tooling/studio-journey.mjs's framesPass, and this group cannot reach them`);
}

// --- 25 · the instance stamp + chrome audit (#222) ---------------------------------------------------
// agent-layer/build-instance.mjs's pure half: stampShell (text in, text out) driven over the REAL
// committed instance.html, and auditRefs (the #160 deploy-safety predicate) driven over a synthetic
// deploy listing. SDK-free by construction — build-instance imports node builtins + lib.mjs +
// gen-company-package only, which is what lets CI (no portal/node_modules) import it here.
//
// WHAT IT CANNOT REACH, stated as groups 9, 11, 13, 16, 18, 19, 21, 23 and 24 all state theirs:
// the RUNNING built page — that the stamped instance renders, settles its bespoke replay, wears
// the stamped pack, serves zero 404s and answers every link 2xx — is tooling/instance-journey.mjs's,
// operator-run against a fixture build, and this group cannot reach any of it. validateAssembly's
// filesystem half (real copied files) is exercised by build-instance's own fixture runs, not here.
{
  const shellHtml = readFileSync(join(ROOT, "instance.html"), "utf8");
  const cfg = { name: "Harborlight", slug: "harborlight", traceBase: "derivation.jsonl", links: {}, replaySlug: "build-harborlight-berths" };
  const stamped = stampShell(shellHtml, cfg);

  // Residue: the same signatures validateAssembly greps, asserted here on the pure output so CI
  // sees them without a filesystem build. The [data-studio-notice] node is the ONE sanctioned
  // standalone hidden (#210's at-rest notice) — same exemption validateAssembly carries.
  ok(!/data-when=/.test(stamped), "stamped shell still carries a data-when= attribute");
  ok(!/\{\{/.test(stamped), "stamped shell still carries a {{ template token");
  const hiddenScan = stamped.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*\bdata-studio-notice\b[^>]*>/g, " ");
  ok(!/<[a-zA-Z][^>]*\shidden(?=[\s/>])/.test(hiddenScan), "a real-only region kept its hidden attribute after stamping");
  const bodyText = (stamped.match(/<body[\s\S]*<\/body>/) || [, ""])[0]
    .replace(/<!--[\s\S]*?-->/g, " ").replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  for (const word of ["Northwind", "demo", "fictional"])
    ok(!new RegExp(`\\b${word}\\b`, "i").test(bodyText), `stamped body text still contains "${word}"`);
  ok(bodyText.includes("Harborlight"), "the company name was not substituted into the stamped body");

  // The v2 INSTANCE_CONFIG: parses as pure JSON, replay in, composition/links.prototype out.
  const region = (stamped.match(/<!-- INSTANCE_CONFIG:start[\s\S]*?INSTANCE_CONFIG:end -->/) || [, ""])[0];
  const assignment = region && region.match(/window\.INSTANCE_CONFIG\s*=\s*([\s\S]*);\s*<\/script>/);
  ok(!!assignment, "stamped INSTANCE_CONFIG assignment not found between its markers");
  if (assignment) {
    let parsed = null;
    try { parsed = JSON.parse(assignment[1]); } catch { parsed = null; }
    ok(!!parsed, "stamped INSTANCE_CONFIG does not parse as pure JSON");
    if (parsed) {
      ok(parsed.replay && parsed.replay.artifact === "/replay/build-harborlight-berths.json"
        && parsed.replay.trace === "/traces/build-harborlight-berths.jsonl",
        "v2 config must carry replay { artifact, trace } derived from the slug");
      ok(!("composition" in parsed), "v2 config must NOT carry composition (retired at #222)");
      ok(!(parsed.links && "prototype" in parsed.links), "v2 config must NOT carry links.prototype (retired at #222)");
    }
  }
  ok(stamped.includes('src="/system/client.instance.config.js"'), "the chrome config <script> was not re-pointed (#160)");
  ok(!/client\.neutral\.config\.js/.test(stamped), "the stamped shell still loads client.neutral.config.js");
  ok(stamped.includes('href="/system/tokens.harborlight.css"'), "the pack <link> was not stamped to the company pack");

  // MUTATION (a): a synthetic EXTRA data-when="demo" region is still stripped — the toggling is a
  // global pass, not a list of known sites, so a new seam added to the shell needs no stamp edit.
  const withExtra = shellHtml.replace("</main>", '<p data-when="demo">an EXTRA demo region</p></main>');
  const extraStamped = stampShell(withExtra, cfg);
  ok(!/EXTRA demo region/.test(extraStamped) && !/data-when=/.test(extraStamped),
    "an extra data-when=\"demo\" region survived stamping — Mechanism B is not a global pass");

  // MUTATION (b): a missing Mechanism-A anchor is a HARD THROW naming the anchor — twice, once for
  // an original anchor and once for #222's new chrome-config anchor, because a throw with the wrong
  // name is a gate nobody can debug.
  let threw = null;
  try { stampShell(shellHtml.replace(/<span id="instance-name">[^<]*<\/span>/, ""), cfg); } catch (e) { threw = e; }
  ok(threw && /#instance-name/.test(threw.message), `a missing #instance-name anchor must throw naming it (got: ${threw && threw.message})`);
  threw = null;
  try { stampShell(shellHtml.replace('<script src="/system/client.neutral.config.js"></script>', ""), cfg); } catch (e) { threw = e; }
  ok(threw && /client\.neutral\.config\.js/.test(threw.message), `a missing chrome-config anchor must throw naming it (got: ${threw && threw.message})`);

  // MUTATION (c): the chrome predicate over a synthetic deploy listing — the public-site route the
  // old validateAssembly deliberately excluded is now refused BY NAME, and everything sanctioned
  // still passes: mailto, https, a fragment, an in-dir file (query suffix stripped), the dir root.
  const listing = new Set(["", "/system/tokens.contract.css", "/system/client.instance.config.js", "/replay/run.json"]);
  const resolves = (p) => listing.has(p.replace(/^\//, "")) || listing.has(p) || p === "/";
  const refused = auditRefs(["/approach"], (p) => p === "/" || listing.has(p));
  ok(refused.length === 1 && /\/approach/.test(refused[0]), "auditRefs must refuse /approach by name");
  ok(auditRefs(["mailto:linardsberzins@gmail.com", "https://github.com/linardsb/ux-factory", "#beat-brief",
    "/system/tokens.contract.css?v=2", "/replay/run.json", "/"], (p) => p === "/" || listing.has(p)).length === 0,
    "auditRefs must accept mailto / https / fragment / in-dir (query stripped) / the dir root");
  const hostile = auditRefs(["http://insecure.example", "//protocol.relative", "relative.html", "javascript:alert(1)", ""], resolves);
  ok(hostile.length === 5, `auditRefs must refuse http/protocol-relative/bare-relative/javascript/empty (refused ${hostile.length} of 5)`);

  group("instance stamp", `stampShell over the REAL committed shell with a synthetic company: zero data-when= / {{ / stray-hidden residue (the [data-studio-notice] at-rest notice exempted, the same sanction validateAssembly carries) · body text free of "Northwind"/"demo"/"fictional" with the company name proven substituted · the v2 INSTANCE_CONFIG parses as pure JSON with replay { artifact, trace } derived from the slug and composition + links.prototype proven ABSENT · the chrome config <script> re-pointed at the generated per-instance one (#160) and the pack <link> at the company pack · MUTATIONS: an extra data-when="demo" region still stripped (Mechanism B is a global pass, not a site list), a missing #instance-name anchor AND a missing chrome-config anchor each thrown with the anchor named, and auditRefs refusing /approach by name while accepting mailto / https / fragments / in-dir refs with query suffixes stripped and refusing http, protocol-relative, bare-relative, javascript: and empty refs. The RUNNING built page — settled bespoke replay, stamped pack, zero 404s, every link 2xx — is tooling/instance-journey.mjs's, operator-run, and this group cannot reach it`);
}

// --- 26 · the layers list's pure layer (#221) --------------------------------------------------------
//
// system/studio-layers.mjs's DOM-free half. Everything here CALLS the functions over hand-computed
// fixtures — the check-that-cannot-fail memory's rule — and the junk-row case is the mutation that
// proves the skipping rule is real rather than a comment.

{
  // ORDER PRESERVATION: DOM order is board order (studio.mjs's arrangementNow correspondence), so
  // input order must be output order — the list never sorts.
  const rows = layerEntries([
    { id: "s3", name: "Job Detail", col: 3, row: 1, kind: "slot", selected: false },
    { id: "s1", name: "Verdant prototype", col: 1, row: 3, kind: "frame", cols: 2, rows: 2 },
    { id: "s2", name: "Today Overview", col: 1, row: 1, kind: "slot", selected: true },
  ]);
  ok(rows.map((r) => r.id).join(",") === "s3,s1,s2",
    `layerEntries must preserve input order — DOM order IS board order (got ${rows.map((r) => r.id).join(",")})`);

  // The position sentences: a 1×1 slot, a spanning frame, and a 1×1 FRAME — the span text belongs
  // to the footprint, not the family, so a 1×1 frame gets the short sentence too.
  ok(rows[0].sentence === "column 3, row 1", `the 1×1 sentence drifted: ${rows[0].sentence}`);
  ok(rows[1].sentence === "column 1, row 3, 2 by 2", `the spanning sentence drifted: ${rows[1].sentence}`);
  const unitFrame = layerEntries([{ id: "f", name: "F", col: 4, row: 2, kind: "frame", cols: 1, rows: 1 }]);
  ok(unitFrame[0].sentence === "column 4, row 2", `a 1×1 frame must get the short sentence: ${unitFrame[0].sentence}`);

  // selectable IS false EXACTLY for kind "frame" — the pure statement of frames-outside-the-
  // selection (system/studio-frames.mjs call 5), and the tripwire for the day someone widens the
  // selection layer: widen it and this line is the one that says the layers list must follow.
  ok(rows[0].selectable === true && rows[2].selectable === true && rows[1].selectable === false
    && unitFrame[0].selectable === false,
    "selectable must be false exactly for kind \"frame\" — frames are outside the selection layer");
  // …and an UNKNOWN kind reads as a slot, never as a frame: the honest default is the selectable
  // family, because refusing selection is the frame-specific decision.
  ok(layerEntries([{ id: "u", col: 1, row: 1, kind: "mystery" }])[0].selectable === true,
    "an unknown kind must read as a selectable slot");

  // THE MUTATION that proves the gate can fail: one bad row among good ones. An id-less entry is a
  // wrapper mid-construction and must be SKIPPED, not rendered — counted, so a layerEntries that
  // stopped skipping (or started dropping good rows) goes red here.
  const mixed = layerEntries([{ id: "a", col: 1, row: 1 }, { name: "no id" }, { id: "", col: 2, row: 1 }, { id: "b", col: 2, row: 1 }]);
  ok(mixed.length === 2 && mixed[0].id === "a" && mixed[1].id === "b",
    `one junk row among good ones: expected exactly a,b — got ${mixed.map((r) => r.id).join(",")}`);

  // Totality over junk shapes, and non-finite geometry coerces to 1 (clampSlot's posture) so NaN
  // can never reach a rendered sentence.
  for (const junk of [null, undefined, 42, "rows", {}, () => {}]) {
    const r = layerEntries(junk);
    ok(Array.isArray(r) && r.length === 0, `layerEntries(${String(junk)}) must answer []`);
  }
  ok(layerEntries([{ id: "x", col: "junk", row: null }])[0].sentence === "column 1, row 1",
    "non-finite geometry must coerce to 1, never NaN in a sentence");
  ok(layerEntries([{ id: "x", col: 1, row: 1 }])[0].name === "Component",
    "a nameless entry must read as \"Component\" — place()'s own fallback label");

  // toggleId: both directions, and the answers are NEW ARRAYS — proven by mutating a result and
  // re-deriving (the createHistory clone-proof idiom). The caller hands it chosenIds() and passes
  // the answer to applySelection; an in-place mutation would edit a list another closure holds.
  const base = ["s1", "s2"];
  const added = toggleId(base, "s3");
  const removed = toggleId(base, "s2");
  ok(added.join(",") === "s1,s2,s3", `toggleId must add a missing id: ${added.join(",")}`);
  ok(removed.join(",") === "s1", `toggleId must remove a present id: ${removed.join(",")}`);
  added.push("EVIL");
  removed.push("EVIL");
  ok(base.join(",") === "s1,s2", "toggleId mutated its input array");
  ok(toggleId(base, "s3").join(",") === "s1,s2,s3" && toggleId(base, "s2").join(",") === "s1",
    "re-deriving after mutating a result must be unchanged — the answers must be new arrays");
  // Totality: junk lists read as empty, a null id toggles nothing, null members are dropped.
  ok(toggleId(null, "x").join(",") === "x", "toggleId(null, id) must answer [id]");
  ok(toggleId(["a"], null).join(",") === "a", "toggleId(list, null) must toggle nothing");
  ok(toggleId(["a", null, "b"], "c").join(",") === "a,b,c", "toggleId must drop null members");

  group("layers", "layerEntries preserves input order (DOM order IS board order) · the position sentences for a 1×1 slot, a spanning frame AND a 1×1 frame (span text belongs to the footprint, not the family) · selectable false EXACTLY for kind \"frame\" — the pure statement of frames-outside-the-selection and the tripwire for the day the selection layer widens — with an unknown kind reading as a selectable slot · the one-junk-row-among-good-ones mutation proving the skipping rule real · totality over 6 junk shapes with non-finite geometry coerced so NaN never reaches a sentence · toggleId both directions, proven to answer NEW arrays by mutate-and-re-derive, total over junk. The running list — the same-interaction reflection, selection parity both ways through the ONE applySelection, the roving tabindex, the announcements and the mid-replay non-take-over — is tooling/studio-journey.mjs's layersPass, and this group cannot reach it");
}

// --- 27 · the minimap's pure layer (#221) ------------------------------------------------------------
//
// system/studio-minimap.mjs's DOM-free half — studio-verbs.mjs's coordinate chain INVERTED, so the
// three mapView conditions below are that chain's two missing-term traps run in reverse: each is
// the SOLE detector of one term, and each looks correct in the other two conditions.

{
  const M = { clientW: 700, clientH: 640, scale: 1, contentW: 2816, contentH: 1232 };

  // 1 · at rest (0,0 @ 100%): the condition every broken chain still passes — the positive control.
  const rest = mapView({ scrollLeft: 0, scrollTop: 0, ...M });
  ok(rest.x === 0 && rest.y === 0 && rest.w === 700 && rest.h === 640,
    `mapView at rest drifted: ${JSON.stringify(rest)}`);

  // 2 · PANNED — the missing-scroll-term detector: the expected x/y are the scroll offsets
  //     themselves at scale 1, computed independently of the function.
  const panned = mapView({ scrollLeft: 260, scrollTop: 170, ...M });
  ok(panned.x === 260 && panned.y === 170 && panned.w === 700 && panned.h === 640,
    `the missing-scroll-term detector: ${JSON.stringify(panned)} (expected x 260, y 170)`);

  // 3 · ZOOMED AT 0,0 — the missing-divide detector: at 50% the visible fraction doubles, so w
  //     MUST equal clientW/scale — and h caps at the content box (640/0.5 = 1280 > 1232).
  const zoomed = mapView({ scrollLeft: 0, scrollTop: 0, ...M, scale: 0.5 });
  ok(zoomed.x === 0 && zoomed.y === 0 && zoomed.w === 1400 && zoomed.h === 1232,
    `the missing-divide detector: ${JSON.stringify(zoomed)} (expected w 1400, h capped at 1232)`);

  // The far-edge clamp: the view rect never exits the content box, however far the scroll claims.
  const far = mapView({ scrollLeft: 999999, scrollTop: 999999, ...M });
  ok(far.x === 2116 && far.y === 592, `the far-edge clamp drifted: ${JSON.stringify(far)}`);

  // Junk answers the PINNED honest whole view — { 0, 0, contentW, contentH }, unreadable content
  // reading as 0 — a contract, not an accident: the mount feeds this straight into attributes.
  ok(JSON.stringify(mapView({ scrollLeft: 1, scrollTop: 1, ...M, scale: 0 }))
    === JSON.stringify({ x: 0, y: 0, w: 2816, h: 1232 }), "scale 0 must answer the honest whole view");
  ok(JSON.stringify(mapView({ scrollLeft: NaN, scrollTop: 0, ...M }))
    === JSON.stringify({ x: 0, y: 0, w: 2816, h: 1232 }), "a non-finite scroll must answer the whole view");
  ok(JSON.stringify(mapView(null)) === JSON.stringify({ x: 0, y: 0, w: 0, h: 0 }),
    "mapView(null) must answer zeros, never a throw");

  // jumpFrom: CENTERING (the target puts the named content point mid-viewport), the 0 floor and
  // the max ceiling — the same clamp range the browser applies to a scrollLeft write, which is
  // what lets the journey assert computed target === settled scroll.
  const centered = jumpFrom({ fx: 0.5, fy: 0.5 }, M);
  ok(centered.left === 1058 && centered.top === 296, `jumpFrom centering drifted: ${JSON.stringify(centered)}`);
  ok(JSON.stringify(jumpFrom({ fx: 0, fy: 0 }, M)) === JSON.stringify({ left: 0, top: 0 }),
    "the 0 floor: a corner click must clamp at 0,0");
  ok(JSON.stringify(jumpFrom({ fx: 1, fy: 1 }, M)) === JSON.stringify({ left: 2116, top: 592 }),
    "the max ceiling: the far corner must clamp at content*scale − client");
  ok(JSON.stringify(jumpFrom(null, M)) === JSON.stringify({ left: 0, top: 0 })
    && JSON.stringify(jumpFrom({ fx: 0.5, fy: 0.5 }, { ...M, scale: -1 })) === JSON.stringify({ left: 0, top: 0 }),
    "jumpFrom must be total over junk fractions and a junk scale");

  // trackOffsets: the gap belongs to the track BEFORE the next start (hitSlot's band rule,
  // inverted) — against a hand-computed fixture, plus totality.
  ok(JSON.stringify(trackOffsets([220, 220, 220], 16)) === "[0,236,472]",
    `trackOffsets' gap rule drifted: ${JSON.stringify(trackOffsets([220, 220, 220], 16))}`);
  ok(trackOffsets(null, 16).length === 0 && JSON.stringify(trackOffsets(["x", 220], null)) === "[0,0]",
    "trackOffsets must be total over junk tracks and a junk gap");

  // cellRect: a 2×3 span equals the UNION of its six 1×1 rects — consistency with footprint()'s
  // definition, drawn instead of keyed. Computed from the six unit answers, never re-derived from
  // the span path under test.
  const geom = { cols: [220, 220, 220, 220], rows: [140, 140, 140, 140], colGap: 16, rowGap: 16 };
  const span = cellRect({ col: 2, row: 1 }, { cols: 2, rows: 3 }, geom);
  const units = [];
  for (let r = 1; r <= 3; r += 1) for (let c = 2; c <= 3; c += 1) units.push(cellRect({ col: c, row: r }, { cols: 1, rows: 1 }, geom));
  const minX = Math.min(...units.map((u) => u.x));
  const minY = Math.min(...units.map((u) => u.y));
  const maxR = Math.max(...units.map((u) => u.x + u.w));
  const maxB = Math.max(...units.map((u) => u.y + u.h));
  ok(span.x === minX && span.y === minY && span.w === maxR - minX && span.h === maxB - minY,
    `a 2×3 cellRect must equal the union of its six 1×1 rects: ${JSON.stringify(span)} vs union ${JSON.stringify({ x: minX, y: minY, w: maxR - minX, h: maxB - minY })}`);
  // A missing span reads as 1×1 — the UNIT_SPAN default that keeps a .stx-slot's answer exact.
  const unit = cellRect({ col: 3, row: 2 }, undefined, geom);
  ok(unit.x === 472 && unit.y === 156 && unit.w === 220 && unit.h === 140,
    `a spanless cellRect must be one track: ${JSON.stringify(unit)}`);
  ok(JSON.stringify(cellRect(null, null, null)) === JSON.stringify({ x: 0, y: 0, w: 0, h: 0 }),
    "cellRect must answer zeros over junk, never a throw");

  // visibleRange ROUND-TRIPS mapView's answer: a viewport mapView says covers cells 2–3 × 2–3
  // must announce exactly that range. contentW/H are the fixture grid's own (4 tracks + 3 gaps).
  const view = mapView({ scrollLeft: 236, scrollTop: 156, clientW: 456, clientH: 296, scale: 1, contentW: 928, contentH: 608 });
  const range = visibleRange(view, geom);
  ok(range.col1 === 2 && range.col2 === 3 && range.row1 === 2 && range.row2 === 3,
    `visibleRange must round-trip mapView's answer: ${JSON.stringify(range)} for view ${JSON.stringify(view)}`);
  // An edge-KISSING viewport does not claim the next column: a rect whose right edge lands exactly
  // on track 2's start (x 0, w 236) shows nothing of column 2.
  ok(visibleRange({ x: 0, y: 0, w: 236, h: 140 }, geom).col2 === 1,
    "a viewport whose edge kisses the next track's start must not claim that column");
  ok(JSON.stringify(visibleRange(null, null)) === JSON.stringify({ col1: 1, col2: 1, row1: 1, row2: 1 }),
    "visibleRange must answer the 1,1 cell over junk, never a throw");

  // THE NO-TIMER SOURCE PIN, over BOTH #221 modules: "tracks without a timer" as a tripwire.
  // rAF is allowed and used (coalescing, not scheduling); setInterval/setTimeout are not.
  for (const file of ["studio-layers.mjs", "studio-minimap.mjs"]) {
    const src = readFileSync(join(ROOT, "system", file), "utf8");
    ok(!src.includes("setInterval(") && !src.includes("setTimeout("),
      `system/${file} reaches for a timer — the tracking contract is events + rAF coalescing only`);
  }

  group("minimap", "mapView in THREE conditions — at rest (the positive control), panned (the missing-scroll-term detector, expected offsets computed independently) and zoomed at 0,0 (the missing-divide detector, w === clientW/scale with h capped at the content box) — each the sole detector of one coordinate term · the far-edge clamp keeping the rect inside the content box · junk pinned to the HONEST WHOLE VIEW as a contract · jumpFrom's centering with the 0 floor and the max ceiling equal to the browser's own scrollLeft clamp range · trackOffsets' gap-before-next-start rule against a hand-computed fixture · a 2×3 cellRect equal to the union of its six 1×1 rects (footprint()'s definition drawn, not keyed) with the spanless 1×1 default · visibleRange round-tripping mapView's answer and refusing an edge-kissing column · totality throughout · and the no-timer source pin over BOTH #221 modules (rAF coalescing allowed and used, setInterval/setTimeout refused). The running map — the view rect tracking a real pan, the zoom-at-0,0 observer wiring, click-to-jump against the settled scroll, the keyboard path's announcements and the mid-replay non-take-over — is tooling/studio-journey.mjs's minimapPass, and this group cannot reach it");
}

// --- 28 · the discovery question bank (#282) --------------------------------------------------------
//
// discovery/bank.mjs is DATA plus three pure selectors, so the group is mostly pins: the counts,
// the documented sets and the source file, each as a literal here so a bank edit that moves one of
// them has to move the gate in the same PR. The next ticket to add a group takes 29 (#281).

{
  const LABELS = new Set(["OBSERVED", "DERIVED", "THIN"]);
  const KEYS = new Set(["id", "stage", "text", "attribution", "label", "provenanceNote", "weakAnswer", "note"]);
  const TWELVE = [
    "s1-if-nobody-solves-this", "s1-how-addressed-today", "s6-process-as-it-runs",
    "s1-what-would-have-to-be-true", "s2-riskiest-assumption", "s5-pain-budget-same-person",
    "s4-appetite", "s4-rabbit-holes", "s4-out-of-bounds", "s6-accountable-when-wrong",
    "s7-what-would-make-us-stop", "s8-eval",
  ];
  const SCOPE_CHECK = [
    "s4-appetite", "s4-rabbit-holes", "s4-out-of-bounds",
    "s7-goals-signals-metrics", "s7-kill-state-and-date", "s7-what-would-make-us-stop",
  ];
  const FULL_DISCOVERY = [
    ...TWELVE,
    "s1-choice-cascade", "s1-premortem", "s2-more-than-one-way", "s2-last-time-show-me",
    "s2-switch-timeline", "s3-why-now", "s3-deliberately-not-doing", "s4-press-release",
    "s4-four-risks", "s4-circuit-breaker", "s5-value-metric", "s5-willingness-to-pay",
    "s6-audit-trail", "s6-coexist-with-incumbent", "s7-kill-state-and-date",
    "s7-goes-up-doing-nothing", "s8-failure-who-pays", "s9-strength-of-evidence",
  ];
  const ids = (qs) => qs.map((q) => q.id);

  // 1 · the count — 65 entries, 69 source bullets less two mottos, one cross-reference and one
  //     fold (the module header's D2/D3), per stage 6·7·6·7·8·8·7·12·4, nine stages.
  ok(BANK.length === 65, `the bank holds ${BANK.length} entries, not 65 — reconcile the docs and this pin with the module header`);
  const perStage = [6, 7, 6, 7, 8, 8, 7, 12, 4];
  perStage.forEach((n, i) => ok(questionsForStage(i + 1).length === n,
    `stage ${i + 1} holds ${questionsForStage(i + 1).length} entries, not ${n}`));
  ok(STAGES.length === 9 && STAGES.every((s, i) => s.n === i + 1), "STAGES must be 1–9 in order");
  for (const q of BANK) ok(STAGES.some((s) => s.n === q.stage), `${q.id}: stage ${q.stage} names no STAGES entry`);

  // 2 · ids — unique, stage-prefixed, and questionById answers the SAME object.
  ok(new Set(ids(BANK)).size === BANK.length, "bank ids must be unique");
  for (const q of BANK) {
    ok(/^s[1-9]-[a-z0-9-]+$/.test(q.id), `${q.id}: not of the form s<stage>-<slug>`);
    ok(Number(q.id[1]) === q.stage, `${q.id}: id prefix disagrees with stage ${q.stage}`);
    ok(questionById(q.id) === q, `questionById("${q.id}") must answer the bank's own entry by identity`);
  }
  ok(questionById("nope") === null && questionById(undefined) === null && questionById(42) === null,
    "questionById must answer null for anything the bank does not hold, never throw");

  // 3 · fields — every entry carries the rubric, and nothing outside the documented key set.
  const filled = (v) => typeof v === "string" && v.trim() === v && v.length > 0;
  for (const q of BANK) {
    ok(filled(q.text) && filled(q.attribution) && filled(q.weakAnswer),
      `${q.id}: text, attribution and weakAnswer must all be non-empty trimmed strings`);
    ok(LABELS.has(q.label), `${q.id}: label "${q.label}" is not OBSERVED | DERIVED | THIN`);
    ok(Object.keys(q).every((k) => KEYS.has(k)), `${q.id}: carries an undocumented key (${Object.keys(q).filter((k) => !KEYS.has(k)).join(", ")})`);
    ok(q.weakAnswer !== q.text, `${q.id}: weakAnswer is the text`);
    for (const k of ["provenanceNote", "note"]) if (k in q) ok(filled(q[k]), `${q.id}: ${k} present but empty`);
  }

  // 4 · the twelve — as an ORDER assertion, verbatim against the documented set.
  ok(OPENING_SET.length === 12 && new Set(OPENING_SET).size === 12, "OPENING_SET must be twelve unique ids");
  ok(OPENING_SET.every((id) => questionById(id) !== null), "every OPENING_SET id must resolve");
  ok(JSON.stringify(OPENING_SET) === JSON.stringify(TWELVE),
    `OPENING_SET drifted from the documented twelve: ${JSON.stringify(OPENING_SET)}`);

  // 5 · depths — each one's exact documented set, the twelve at the head of full discovery, no
  //     orphan reference, no repeat inside a depth, and the junk-depth throw naming the value.
  ok(JSON.stringify(ids(selectDepth("scope-check"))) === JSON.stringify(SCOPE_CHECK),
    `scope-check drifted: ${JSON.stringify(ids(selectDepth("scope-check")))}`);
  // DEPTHS["opening-set"].ids IS OPENING_SET today (bank.mjs aliases it); this guards a future de-aliasing.
  ok(JSON.stringify(ids(selectDepth("opening-set"))) === JSON.stringify(OPENING_SET),
    "opening-set must be OPENING_SET, same order");
  ok(JSON.stringify(ids(selectDepth("full-discovery"))) === JSON.stringify(FULL_DISCOVERY),
    `full-discovery drifted: ${JSON.stringify(ids(selectDepth("full-discovery")))}`);
  ok(JSON.stringify(DEPTHS["full-discovery"].ids.slice(0, 12)) === JSON.stringify(TWELVE), "full discovery must start with the twelve");
  for (const [k, d] of Object.entries(DEPTHS)) {
    ok(filled(d.label) && filled(d.when), `depth ${k} needs a label and a when`);
    ok(d.ids.every((id) => questionById(id) !== null), `depth ${k} references an id the bank does not hold`);
    ok(new Set(d.ids).size === d.ids.length, `depth ${k} asks a question twice`);
  }
  for (const junk of ["junk", "", undefined, 42]) {
    let msg = null;
    try { selectDepth(junk); } catch (e) { msg = e.message; }
    // "" is a substring of every message, so the empty case pins the throw's own wording instead.
    const names = msg !== null && (junk === "" ? msg.includes("unknown depth") : msg.includes(String(junk)));
    ok(names, `selectDepth(${JSON.stringify(junk) ?? "undefined"}) must throw naming the value, got ${JSON.stringify(msg)}`);
  }

  // 6 · purity + frozen — two calls agree, entries come back by identity, and a write is inert.
  for (const k of Object.keys(DEPTHS)) {
    ok(JSON.stringify(selectDepth(k)) === JSON.stringify(selectDepth(k)), `selectDepth("${k}") is not pure`);
    ok(selectDepth(k).every((q) => questionById(q.id) === q), `selectDepth("${k}") must answer the bank's own entries`);
  }
  for (let n = 1; n <= 9; n += 1) ok(questionsForStage(n).every((q) => BANK.includes(q)), `questionsForStage(${n}) must answer the bank's own entries`);
  ok(questionsForStage(10).length === 0 && questionsForStage("1").length === 0, "questionsForStage must answer [] for 10 and for \"1\" (strict number compare)");
  ok(Object.isFrozen(BANK) && BANK.every(Object.isFrozen), "QUESTIONS and every entry must be frozen");
  ok(Object.isFrozen(OPENING_SET) && Object.values(DEPTHS).every((d) => Object.isFrozen(d) && Object.isFrozen(d.ids)), "OPENING_SET and every DEPTHS[k].ids must be frozen");
  const before = JSON.stringify(BANK);
  try { BANK[0].text = "x"; } catch { /* strict mode throws on a frozen write; either way the compare below decides */ }
  try { DEPTHS["scope-check"].ids.push("s1-premortem"); } catch { /* same */ }
  ok(JSON.stringify(BANK) === before && DEPTHS["scope-check"].ids.length === 6, "a write to the bank must be inert");

  // 7 · C3 — no role or seniority title anywhere in the module's strings. Plain profession nouns
  //     inside a question's SUBSTANCE ("Can our engineers build…", "the support engineer who can
  //     impersonate", "radiologists") name people a question is about, not a title for who is
  //     asked, and are deliberately not listed. Positive control first: the regex must be able to
  //     fire before its silence means anything.
  const TITLE_TERMS = /\b(product manager|product owner|project manager|head of|chief \w+ officer|ceo|cto|cpo|cfo|coo|cxo|vp|vice president|director|senior|junior|mid-level|principal|staff (engineer|designer)|executive|leadership|founder|manager|designer|pm)\b/i;
  ok(TITLE_TERMS.test("a senior product manager signs off"), "C3 positive control: the title regex must match a planted title");
  ok(!TITLE_TERMS.test("can our engineers build it; the support engineer who can impersonate"), "C3: profession nouns inside a question's substance must NOT match");
  for (const q of BANK) for (const [k, v] of Object.entries(q)) {
    if (typeof v === "string" && TITLE_TERMS.test(v)) ok(false, `${q.id}.${k} carries a title: "${v.match(TITLE_TERMS)[0]}"`);
  }
  for (const s of STAGES) ok(!TITLE_TERMS.test(s.label), `STAGES ${s.n} label carries a title`);
  for (const [k, d] of Object.entries(DEPTHS)) ok(!TITLE_TERMS.test(d.label) && !TITLE_TERMS.test(d.when), `depth ${k} label/when carries a title`);

  // 8 · no page, no SDK, no DOM — the module has zero import lines and no DOM token, and nothing
  //     shipped (a tracked .html, anything under system/) reaches for it.
  const bankSrc = readFileSync(join(ROOT, "discovery/bank.mjs"), "utf8");
  ok(!/^import /m.test(bankSrc), "discovery/bank.mjs must have zero import lines");
  // A DOM REACH, not the word: the press-release note legitimately says "a document that…".
  ok(!/\b(document|window)\s*[.[]|typeof\s+(document|window)\b/.test(bankSrc), "discovery/bank.mjs must not reach for document or window");
  ok(/\b(document|window)\s*[.[]|typeof\s+(document|window)\b/.test("if (typeof document !== 'undefined') window.x = 1"), "DOM-reach positive control");
  const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
  const shipped = tracked.filter((p) => p.endsWith(".html") || p.startsWith("system/"));
  for (const p of shipped) {
    if (readFileSync(join(ROOT, p), "utf8").includes("discovery/bank")) ok(false, `${p} reaches discovery/bank — no page and no system/ module may read it`);
  }
  ok(shipped.length > 50, `the shipped-file sweep saw only ${shipped.length} files — is git ls-files answering?`);

  // 9 · the source pin (D13) — every weak-answer note's first thirty characters occur verbatim in
  //     the source file's stages 1–9 region, so a paraphrased or invented note goes red. Positive
  //     control: the region must be able to NOT contain a string.
  const source = readFileSync(join(ROOT, "docs/research/question-bank-source.md"), "utf8");
  // Both headings must exist first: an indexOf of -1 would make slice run to the end of the file
  // and the pin would get MORE permissive rather than red.
  ok(source.includes("## Stage 1") && source.includes("## The twelve"), "case 9: a source heading moved (\"## Stage 1\" or \"## The twelve\")");
  const region = source.slice(source.indexOf("## Stage 1"), source.indexOf("## The twelve"));
  ok(region.length > 10000, `the source region is ${region.length} chars — did the stage headings move?`);
  ok(!region.includes("a note nobody wrote"), "source-pin positive control: the region must be able to miss");
  for (const q of BANK) ok(region.includes(q.weakAnswer.slice(0, 30)), `${q.id}: weakAnswer's opening is not in the source — "${q.weakAnswer.slice(0, 30)}"`);

  group("bank", "65 entries pinned with the per-stage counts 6·7·6·7·8·8·7·12·4 and nine stages · ids unique, s<stage>-<slug>, prefix equal to stage, questionById by IDENTITY and null over junk · every entry's text + attribution + weak-answer note + label with the key set closed · the twelve as an ORDER assertion against the documented list · each depth's exact documented set, full discovery headed by the twelve, no orphan and no repeat, the junk-depth throw naming the value · purity by double call, entries by identity, frozenness at every level by an inert write · the C3 title-term list with its positive control and the profession-noun exemption stated · zero import lines, no DOM token, and no tracked page or system/ module reaching the bank · every weak-answer note's first thirty characters pinned to docs/research/question-bank-source.md. What it cannot reach: whether an entry's text, attribution, note or provenanceNote is the source's wording for its id (only weakAnswer is pinned), and whether the C2 slop pass was run — all review facts against that source file");
}

// --- 29 · the discovery applier -------------------------------------------------------------------
// Drives discovery/ops.mjs's PURE applyOp over SYNTHETIC in-memory answers (a1…a4) and a stub bank
// (q1, q2) — legitimate test input the way group 11's rows are, and nothing here is presented as a
// run. Nothing under discovery/<slug>/ is read (none exists and none may be hand-made) and no SDK
// is loaded: the module has no imports at all, so CI's absence of portal/node_modules PROVES the
// "no SDK in the graph" claim rather than asserting it. Every refusal below is driven by feeding a
// broken op behind a positive control, and the message is matched against the op, field or value
// it must name — a gate that throws the right number of times with the wrong messages is a gate
// nobody can debug.
{
  const threw = (fn) => { try { fn(); return null; } catch (e) { return e; } };
  const msg = (fn) => threw(fn)?.message ?? null;
  const names = (fn, ...needles) => {
    const m = msg(fn);
    if (m === null) return "did not throw";
    const missing = needles.filter((n) => !m.includes(n));
    return missing.length ? `threw "${m}", which does not name ${missing.map((n) => JSON.stringify(n)).join(" or ")}` : null;
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  const ANSWERS = [{ ref: "a1", text: "…" }, { ref: "a2", text: "…" }, { ref: "a3", text: "…" }, { ref: "a4", text: "…" }];
  const BANK = [{ id: "q1" }, { id: "q2" }];
  const ctx = (turn = null) => ({ answers: ANSWERS, bank: BANK, turn });
  // One minimal valid op per verb, each overridable for the refusal cases.
  const ev = (over = {}) => ({ op: "file_evidence", params: { url: "https://example.test/source", ref: null, provenance: "secondary-source", claim_ref: null, ...over } });
  const dec = (over = {}) => ({ op: "record_decision", params: { question_id: "q1", answer_ref: "a1", level: "business", parent_id: null, evidence_refs: [1], wrong_if: "the pilot cohort churns inside a quarter", off_script: false, ...over } });
  const weak = (over = {}) => ({ op: "flag_weak_answer", params: { question_id: "q2", answer_ref: "a2", missing: ["a number"], ...over } });
  const openq = (over = {}) => ({ op: "open_question", params: { source: "banked", question_id: "q2", answer_ref: "a3", reason: "needs a figure nobody in the room had", ...over } });

  // 29.1 — the roster, both directions, and frozen BY MUTATION (a module in strict mode throws on
  // a push into a frozen array, and the length is re-read so a swallowed push cannot pass).
  ok(DISCOVERY_OPS.length === 4 && Object.keys(DISCOVERY_PARAMS).length === DISCOVERY_OPS.length
    && DISCOVERY_OPS.every((v) => Array.isArray(DISCOVERY_PARAMS[v]))
    && Object.keys(DISCOVERY_PARAMS).every((v) => DISCOVERY_OPS.includes(v)),
  `OPS (${DISCOVERY_OPS.join(", ")}) and PARAMS (${Object.keys(DISCOVERY_PARAMS).join(", ")}) are not the same four verbs`);
  for (const [label, arr] of [["OPS", DISCOVERY_OPS], ["LEVELS", LEVELS], ["PROVENANCE", PROVENANCE], ["SOURCES", SOURCES], ["FLAGS", FLAGS], ...DISCOVERY_OPS.map((v) => [`PARAMS.${v}`, DISCOVERY_PARAMS[v]])]) {
    const n = arr.length;
    ok(Object.isFrozen(arr) && threw(() => arr.push("smuggled")) !== null && arr.length === n, `${label} is not frozen — a push landed`);
  }
  ok(Object.isFrozen(DISCOVERY_PARAMS) && threw(() => { DISCOVERY_PARAMS.fifth = ["x"]; }) !== null && !("fifth" in DISCOVERY_PARAMS), "PARAMS is not frozen — a fifth verb landed");
  ok(same(LEVELS, ["business", "stakeholder", "solution", "transition"]), "LEVELS is not the BABOK ladder in order");
  ok(FLAGS.length === 2 && FLAGS.includes("no-evidence") && FLAGS.includes("orphan"), "FLAGS is not exactly no-evidence + orphan");
  // The BOARD_FOR idiom: a fifth verb with no fixture fails here by name rather than being skipped.
  const VALID_FOR = {
    file_evidence: { ...ev(), turn: null },
    record_decision: { ...dec(), turn: "t1" },
    flag_weak_answer: { ...weak(), turn: "t2" },
    open_question: { ...openq(), turn: "t3" },
  };
  for (const verb of DISCOVERY_OPS) ok(VALID_FOR[verb], `no VALID_FOR fixture for "${verb}" — every verb needs one minimal valid op here, or the group iterates OPS in name only`);
  const HAPPY = ["file_evidence", "record_decision", "flag_weak_answer", "open_question"].map((v) => VALID_FOR[v]);
  ok(new Set(HAPPY.map((x) => x.op)).size === DISCOVERY_OPS.length, "the happy fold does not exercise every verb");
  const CLOSES = { file_evidence: false, record_decision: true, flag_weak_answer: true, open_question: true };
  const happy = applyDiscoveryOps(HAPPY, ctx());
  ok(happy.ops.length === HAPPY.length, `the happy fold recorded ${happy.ops.length} ops for ${HAPPY.length}`);
  happy.ops.forEach((r, i) => {
    ok(r.seq === i + 1, `record ${i} carries seq ${r.seq}, not ${i + 1} — seq is the address and must be 1-based and strictly increasing`);
    ok(r.op === HAPPY[i].op && r.turn === HAPPY[i].turn, `record ${i + 1} is ${r.op} on ${r.turn}, not ${HAPPY[i].op} on ${HAPPY[i].turn}`);
    ok(r.closes === CLOSES[r.op], `${r.op} recorded closes: ${r.closes}, the table says ${CLOSES[r.op]}`);
    ok(Array.isArray(r.flagged) && r.flagged.every((f) => FLAGS.includes(f)), `${r.op} carries a flag outside FLAGS: ${JSON.stringify(r.flagged)}`);
    ok("supersedes" in r && (r.supersedes === null || Number.isInteger(r.supersedes)), `${r.op} record has no supersedes field`);
    ok(same(Object.keys(r.params), DISCOVERY_PARAMS[r.op]), `${r.op}'s recorded params keys are ${Object.keys(r.params).join(", ")} — not exactly PARAMS' ${DISCOVERY_PARAMS[r.op].join(", ")}`);
  });
  ok(same(happy.ops.map((r) => r.flagged), [[], [], [], []]), `the happy fold flagged something: ${JSON.stringify(happy.ops.map((r) => r.flagged))}`);
  const s1 = applyDiscoveryOp(emptyRun(), ev(), ctx()); // seq 1 = one piece of evidence; the base for most cases below

  // 29.2 — the positive control: deterministic and pure. The refusals below mean nothing unless
  // the fixture applies cleanly first.
  ok(same(applyDiscoveryOps(HAPPY, ctx()), happy), "two folds of the same ops from emptyRun() differ — the applier is not deterministic");
  {
    const input = emptyRun();
    const before = JSON.stringify(input);
    const o = dec();
    const oBefore = JSON.stringify(o);
    const mid = applyDiscoveryOp(input, ev(), ctx());
    const midBefore = JSON.stringify(mid);
    const out = applyDiscoveryOp(mid, o, ctx("t1"));
    ok(JSON.stringify(input) === before && JSON.stringify(mid) === midBefore, "applyOp mutated its input state");
    ok(JSON.stringify(o) === oBefore, "applyOp mutated the op it was given");
    // The record must not alias the caller's objects in either direction.
    out.ops[1].params.wrong_if = "tampered";
    out.ops[1].params.evidence_refs.push(9);
    ok(JSON.stringify(o) === oBefore && JSON.stringify(mid) === midBefore, "mutating the returned record reached the op or the input state — the ledger aliases the caller's objects");
    o.params.evidence_refs.push(8);
    o.params.wrong_if = "rewritten";
    ok(same(out.ops[1].params.evidence_refs, [1, 9]) && out.ops[1].params.wrong_if === "tampered", "mutating the op after applying reached the ledger — a later push on the agent's argument object would rewrite history without a write");
  }

  // 29.3 — the four throws the architecture names, each driven by a broken op.
  ok(names(() => applyDiscoveryOp(s1, dec({ answer_ref: "a99" }), ctx("t1")), "record_decision", "a99", "does not resolve") === null,
    `throw 1 (unresolvable answer_ref): ${names(() => applyDiscoveryOp(s1, dec({ answer_ref: "a99" }), ctx("t1")), "record_decision", "a99", "does not resolve")}`);
  ok(names(() => applyDiscoveryOp(happy, weak(), ctx("t1")), "flag_weak_answer", 'turn "t1"', "op 2", "R2") === null,
    `throw 2 (second closing op on a closed turn): ${names(() => applyDiscoveryOp(happy, weak(), ctx("t1")), "flag_weak_answer", 'turn "t1"', "op 2", "R2")}`);
  ok(names(() => applyDiscoveryOp(s1, dec({ question_id: "q-not-in-bank" }), ctx("t1")), "record_decision", "q-not-in-bank") === null,
    `throw 3 (question the bank does not hold): ${names(() => applyDiscoveryOp(s1, dec({ question_id: "q-not-in-bank" }), ctx("t1")), "record_decision", "q-not-in-bank")}`);
  {
    const nullTwin = threw(() => applyDiscoveryOp(s1, dec({ question_id: null, off_script: true }), ctx("t1")));
    ok(nullTwin === null, `the null twin (question_id: null, off_script: true) was refused: ${nullTwin?.message} — null is legal and means off-script`);
    const rec = applyDiscoveryOp(s1, dec({ question_id: null, off_script: true }), ctx("t1")).ops[1];
    ok(rec.closes === false && rec.supersedes === null, "an off-script decision on no banked question closed the turn or superseded something");
  }
  ok(names(() => applyDiscoveryOp(s1, ev({ provenance: "vibes" }), ctx()), "file_evidence", "vibes", ...PROVENANCE) === null,
    `throw 4 (provenance outside the four): ${names(() => applyDiscoveryOp(s1, ev({ provenance: "vibes" }), ctx()), "file_evidence", "vibes", ...PROVENANCE)}`);

  // 29.4 — the further refusals, each by a broken op, each message naming what it must.
  const absent = dec();
  delete absent.params.evidence_refs;
  const REFUSALS = [
    ["an absent field", () => applyDiscoveryOp(s1, absent, ctx("t1")), ["record_decision", '"evidence_refs" is required']],
    ["an unknown param", () => applyDiscoveryOp(s1, dec({ extra: 1 }), ctx("t1")), ["record_decision", 'unknown param "extra"']],
    ["an unknown envelope key", () => applyDiscoveryOp(s1, { ...dec(), turn: "t1" }, ctx("t1")), ['unknown key "turn"', "envelope"]],
    ["a string evidence ref", () => applyDiscoveryOp(s1, dec({ evidence_refs: ["1"] }), ctx("t1")), ["evidence_refs", '"1"']],
    ["a dangling evidence ref", () => applyDiscoveryOp(s1, dec({ evidence_refs: [99] }), ctx("t1")), ["evidence_refs", "99"]],
    ["evidence_refs not an array", () => applyDiscoveryOp(s1, dec({ evidence_refs: 1 }), ctx("t1")), ['"evidence_refs" must be an array']],
    ["a parent naming a file_evidence", () => applyDiscoveryOp(s1, dec({ level: "stakeholder", parent_id: 1 }), ctx("t1")), ["parent_id 1", "file_evidence", "record_decision"]],
    ["a parent two rungs up", () => applyDiscoveryOp(happy, dec({ level: "solution", parent_id: 2, question_id: "q2" }), ctx("t9")), ["parent_id 2", "business", "solution", "stakeholder"]],
    ["a business decision with a parent", () => applyDiscoveryOp(happy, dec({ parent_id: 2, question_id: "q2" }), ctx("t9")), ["business decision has no parent", "2"]],
    ["a dangling parent", () => applyDiscoveryOp(s1, dec({ level: "stakeholder", parent_id: 7 }), ctx("t1")), ["parent_id 7", "seq 1…1"]],
    ["a level off the ladder", () => applyDiscoveryOp(s1, dec({ level: "vibes" }), ctx("t1")), ['level "vibes"', ...LEVELS]],
    ["a non-boolean off_script", () => applyDiscoveryOp(s1, dec({ off_script: "no" }), ctx("t1")), ['"off_script"']],
    ["a banked decision with no question", () => applyDiscoveryOp(s1, dec({ question_id: null, off_script: false }), ctx("t1")), ["record_decision", "question_id"]],
    ["an empty wrong_if", () => applyDiscoveryOp(s1, dec({ wrong_if: "  " }), ctx("t1")), ['"wrong_if"']],
    ["a banked open question with no question", () => applyDiscoveryOp(s1, openq({ question_id: null }), ctx("t1")), ["open_question", "question_id"]],
    ["a source off the list", () => applyDiscoveryOp(s1, openq({ source: "vibes" }), ctx("t1")), ['source "vibes"', ...SOURCES]],
    ["an empty reason", () => applyDiscoveryOp(s1, openq({ reason: "" }), ctx("t1")), ['"reason"']],
    ["a weak-answer flag with no question", () => applyDiscoveryOp(s1, weak({ question_id: null }), ctx("t1")), ["flag_weak_answer", "question_id"]],
    ["missing: []", () => applyDiscoveryOp(s1, weak({ missing: [] }), ctx("t1")), ['"missing"', "non-empty"]],
    ["missing: [\"\"]", () => applyDiscoveryOp(s1, weak({ missing: [""] }), ctx("t1")), ['"missing"']],
    ["evidence with neither url nor ref", () => applyDiscoveryOp(s1, ev({ url: null, ref: null }), ctx()), ["file_evidence", "neither"]],
    ["evidence with both url and ref", () => applyDiscoveryOp(s1, ev({ url: "https://x.test", ref: "a1" }), ctx()), ["file_evidence", "both"]],
    ["a non-http url", () => applyDiscoveryOp(s1, ev({ url: "ftp://x.test" }), ctx()), ["ftp://x.test", "http"]],
    ["a pasted source that does not resolve", () => applyDiscoveryOp(s1, ev({ url: null, ref: "a99" }), ctx()), ['ref "a99"', "does not resolve"]],
    ["a claim_ref naming a file_evidence", () => applyDiscoveryOp(s1, ev({ claim_ref: 1 }), ctx()), ["claim_ref 1", "file_evidence", "record_decision"]],
    ["a closing decision with no turn", () => applyDiscoveryOp(s1, dec(), ctx(null)), ["record_decision", "no banked turn is open"]],
    ["a closing flag with an empty turn", () => applyDiscoveryOp(s1, weak(), ctx("")), ["flag_weak_answer", "no banked turn is open"]],
    ["a banked open question with no turn", () => applyDiscoveryOp(s1, openq(), ctx(null)), ["open_question", "no banked turn is open"]],
  ];
  for (const [what, fn, needles] of REFUSALS) ok(names(fn, ...needles) === null, `${what}: ${names(fn, ...needles)}`);
  ok(REFUSALS.length >= 27, `${REFUSALS.length} refusals driven — the battery shrank`);
  // The fold names the failing item by index, and applyOps is where a { op, params, turn } item's
  // turn is lifted into ctx (the applier's exact envelope refuses it as a key, see above).
  ok(names(() => applyDiscoveryOps([{ ...ev(), turn: null }, { ...ev(), turn: null }, { ...dec({ answer_ref: "a99" }), turn: "t1" }], ctx()), "op 2 (record_decision):", "a99") === null,
    `applyOps did not rethrow with the index: ${names(() => applyDiscoveryOps([{ ...ev(), turn: null }, { ...ev(), turn: null }, { ...dec({ answer_ref: "a99" }), turn: "t1" }], ctx()), "op 2 (record_decision):", "a99")}`);
  // …and the ITEM envelope is exact as well: a transcript line fed whole (seq, closes, flagged beside
  // a valid op) is refused by name, so a hand-altered line cannot ride through the fold.
  ok(names(() => applyDiscoveryOps([{ ...ev(), turn: null, seq: 9 }], ctx()), "op 0 (file_evidence):", 'unknown key "seq"') === null,
    `applyOps accepted an item carrying seq: ${names(() => applyDiscoveryOps([{ ...ev(), turn: null, seq: 9 }], ctx()), "op 0 (file_evidence):", 'unknown key "seq"')}`);
  ok(threw(() => applyDiscoveryOps([{ op: "file_evidence", params: ev().params }], ctx())) === null, "an item with no turn key was refused — turn is optional on an item (null when absent)");

  // 29.5 — both flag directions: empty is RECORDED and flagged, never thrown; filled is not flagged.
  // A throw here is recorded as its own failure rather than crashing the group: s1 and happy are
  // shared fixtures, and a purity regression upstream would otherwise surface as a raw stack trace.
  const flagOf = (over, turn = "t1", from = s1) => {
    try { return applyDiscoveryOp(from, dec(over), ctx(turn)).ops.at(-1).flagged; }
    catch (e) { ok(false, `record_decision ${JSON.stringify(over)} was refused (${e.message}) — empty must be recorded and flagged, or a session deadlocks on evidence not findable yet`); return []; }
  };
  ok(flagOf({ evidence_refs: [] }).includes("no-evidence"), "evidence_refs: [] recorded without the no-evidence flag — an unbacked decision passed silently");
  ok(!flagOf({ evidence_refs: [1] }).includes("no-evidence"), "evidence_refs: [1] carries the no-evidence flag");
  ok(flagOf({ level: "stakeholder", parent_id: null }).includes("orphan"), "a stakeholder decision with parent_id: null recorded without the orphan flag");
  ok(!flagOf({ level: "business", parent_id: null }).includes("orphan"), "a business decision carries the orphan flag — the top of the ladder has no parent by definition");
  ok(!flagOf({ level: "stakeholder", parent_id: 2, question_id: "q2" }, "t9", happy).includes("orphan"), "a stakeholder decision naming its business parent carries the orphan flag");
  ok(same(flagOf({ level: "stakeholder", parent_id: null, evidence_refs: [] }), ["no-evidence", "orphan"]), "both flags at once are not recorded in FLAGS order");
  ok(same(flagOf({}), []), "the fully-backed business decision is flagged");

  // 29.6 — R2 keys on the TURN, not the question. happy has t1 closed by the q1 decision (seq 2).
  {
    const offScript = threw(() => applyDiscoveryOp(happy, dec({ off_script: true }), ctx("t1")));
    ok(offScript === null, `an off-script decision on the closed turn t1 was refused: ${offScript?.message} — off-script never closes, so R2 has nothing to refuse`);
    const after = applyDiscoveryOp(happy, dec({ off_script: true, wrong_if: "the revisit was wrong" }), ctx("t1"));
    const rec = after.ops.at(-1);
    ok(rec.closes === false && rec.turn === "t1", `the off-script decision recorded closes: ${rec.closes} on turn ${rec.turn}`);
    ok(rec.supersedes === 2, `the off-script decision on q1 supersedes ${rec.supersedes}, not the earlier q1 decision at seq 2`);
    ok(happy.ops.length === 4 && after.ops.length === 5, "the supersede rule removed a record — both must stay");
    // The LATEST earlier decision on the question, not the first.
    const third = applyDiscoveryOp(after, dec({ off_script: true, wrong_if: "third time" }), ctx("t1")).ops.at(-1);
    ok(third.supersedes === rec.seq, `a third decision on q1 supersedes ${third.supersedes}, not the latest (${rec.seq})`);
    // A decision on a DIFFERENT question supersedes nothing.
    ok(applyDiscoveryOp(happy, dec({ question_id: "q2", off_script: true }), ctx("t1")).ops.at(-1).supersedes === null, "a first decision on q2 claims to supersede something");
    // Evidence never closes and may fire many times on a closed turn, recording that turn.
    let s = happy;
    for (let i = 0; i < 3; i += 1) s = applyDiscoveryOp(s, ev(), ctx("t1"));
    ok(s.ops.length === 7 && s.ops.slice(4).every((r) => r.op === "file_evidence" && r.closes === false && r.turn === "t1"), "file_evidence ×3 on a closed turn did not record as three non-closing ops on t1");
    ok(applyDiscoveryOp(happy, ev(), ctx(null)).ops.at(-1).turn === null, "file_evidence with no turn did not record turn: null");
    // A new turn on the same question is a fresh slot — the counter keys on the turn.
    const revisit = threw(() => applyDiscoveryOp(happy, openq({ question_id: "q1", answer_ref: "a4" }), ctx("t9")));
    ok(revisit === null, `a banked open question for q1 on a NEW turn t9 was refused: ${revisit?.message}`);
    ok(applyDiscoveryOp(happy, openq({ question_id: "q1", answer_ref: "a4" }), ctx("t9")).ops.at(-1).closes === true, "the revisit on t9 did not close t9");
    // …and t9, once closed, refuses a second closer naming the first.
    const closed9 = applyDiscoveryOp(happy, openq({ question_id: "q1", answer_ref: "a4" }), ctx("t9"));
    ok(names(() => applyDiscoveryOp(closed9, dec({ question_id: "q1" }), ctx("t9")), 'turn "t9"', "op 5") === null, `a second closer on t9: ${names(() => applyDiscoveryOp(closed9, dec({ question_id: "q1" }), ctx("t9")), 'turn "t9"', "op 5")}`);
  }

  // 29.7 — the not-a-form arithmetic is possible from the record alone: reset on a closing
  // decision or flag, +1 on a banked open question, off-script ignored — read from record.op,
  // record.closes and record.params.source / params.off_script only. #285 owns the function; this
  // asserts the fields it needs are there.
  {
    const fold = applyDiscoveryOps([
      { ...ev(), turn: null },
      { ...dec(), turn: "t1" },
      { ...openq(), turn: "t2" },
      { ...openq({ source: "off-script", question_id: null }), turn: "t2" },
      { ...openq({ question_id: "q1", answer_ref: "a4" }), turn: "t3" },
      { ...dec({ question_id: null, off_script: true }), turn: "t3" },
      { ...weak(), turn: "t4" },
    ], ctx());
    let counter = 0;
    const trail = [];
    for (const r of fold.ops) {
      if (r.op === "file_evidence") continue;
      if (r.op === "open_question" && r.params.source === "off-script") continue;
      if (r.op === "record_decision" && r.params.off_script) continue;
      if (r.op === "open_question") counter += 1;
      else if (r.closes) counter = 0;
      trail.push(counter);
    }
    ok(same(trail, [0, 1, 2, 0]), `the not-a-form counter read ${JSON.stringify(trail)} from the records, not [0, 1, 2, 0] — a field #285 needs is missing or wrong`);
    ok(fold.ops.filter((r) => r.closes).length === 4 && same(fold.ops.filter((r) => r.closes).map((r) => r.turn), ["t1", "t2", "t3", "t4"]), "coverage cannot be read from the closers' turns");
  }

  // 29.8 — totality over junk: a plain Error with a message, never a TypeError from inside the switch.
  const plain = (fn, what) => {
    const e = threw(fn);
    ok(e instanceof Error && !(e instanceof TypeError) && typeof e.message === "string" && e.message.length > 0,
      `${what}: ${e === null ? "did not throw" : `threw ${e.constructor.name} "${e?.message}"`}`);
  };
  for (const junk of [null, 1, "x", [], {}, { op: "record_decision" }, { op: 7 }, { op: "record_decision", params: null }, { op: "record_decision", params: [] }, { op: "record_decision", params: "x" }, { op: "file_evidence", params: { url: 1, ref: null, provenance: "assumption", claim_ref: null } }])
    plain(() => applyDiscoveryOp(s1, junk, ctx("t1")), `junk op ${JSON.stringify(junk)}`);
  // A Symbol cannot be interpolated into a message — the one junk value that turns a refusal into a
  // TypeError unless it is typed BEFORE the message is built (PR #324 review, F1).
  plain(() => applyDiscoveryOp(s1, { op: Symbol("record_decision"), params: {} }, ctx("t1")), "junk op { op: Symbol() }");
  plain(() => applyDiscoveryOp(s1, dec({ answer_ref: Symbol("a1") }), ctx("t1")), "junk op { answer_ref: Symbol() }");
  plain(() => applyDiscoveryOp(s1, dec({ level: Symbol("business") }), ctx("t1")), "junk op { level: Symbol() }");
  plain(() => applyDiscoveryOp(s1, ev({ provenance: Symbol("assumption") }), ctx()), "junk op { provenance: Symbol() }");
  plain(() => applyDiscoveryOp(s1, dec({ answer_ref: "a99" }), { answers: [{ ref: Symbol("a1") }], bank: BANK, turn: "t1" }), "an answer store holding a Symbol ref, listed in the refusal message");
  for (const junkCtx of [undefined, null, {}, { answers: null }, { answers: [], bank: null }, { answers: [null], bank: [null], turn: 7 }, "x"])
    plain(() => applyDiscoveryOp(s1, ev(), junkCtx), `junk ctx ${JSON.stringify(junkCtx)}`);
  ok(threw(() => applyDiscoveryOp(s1, ev(), { answers: [null, { ref: "a1" }], bank: [null, { id: "q1" }], turn: null })) === null, "a null entry among the answers or the bank threw — entries are read with ?. so junk in the store cannot take the applier down");
  for (const junkState of [null, {}, { ops: "x" }, { ops: null }])
    plain(() => applyDiscoveryOp(junkState, ev(), ctx()), `junk state ${JSON.stringify(junkState)}`);
  for (const junkItems of [null, "x", [null], [1], [{}], [{ op: "record_decision" }]])
    plain(() => applyDiscoveryOps(junkItems, ctx()), `junk items ${JSON.stringify(junkItems)}`);

  // 29.9 — the frozen fixture. The PRD says run 2's input is byte-frozen at this md5 and nothing
  // checked it (the architecture's own finding). The mutation is what makes this a check rather
  // than a constant comparison: the same bytes plus one newline must hash differently.
  const FIXTURE = "docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md";
  const FIXTURE_MD5 = "ab6eb0ee6cdd3b7802ecfcbe90db2377";
  const bytes = readFileSync(join(ROOT, FIXTURE));
  const md5 = (b) => createHash("md5").update(b).digest("hex");
  ok(md5(bytes) === FIXTURE_MD5, `${FIXTURE} hashes to ${md5(bytes)}, not the frozen ${FIXTURE_MD5} — run 2's input was edited, and its score would mean nothing`);
  ok(md5(Buffer.concat([bytes, Buffer.from("\n")])) !== FIXTURE_MD5, "the fixture plus one trailing newline still matches the frozen md5 — the compare cannot fail");

  group("discovery ops", `OPS ↔ PARAMS the same four verbs in both directions, every list frozen BY MUTATION (a push refused and the length re-read), a VALID_FOR fixture per verb so a fifth verb with no fixture fails by name, the happy fold recording seq 1…4 with closes per the table and exact param key sets · determinism by deep-comparing two folds and purity by mutating the returned record and the op and re-reading both inputs · the four named throws each driven by a broken op — an unresolvable answer_ref naming the ref, a second closer naming the turn and the closing seq (R2), a question the bank lacks naming the id with its null twin ACCEPTED as off-script, a provenance outside the four naming all four · ${REFUSALS.length} further refusals (absent field, unknown param, exact envelope, string and dangling seqs, wrong-rung and wrong-kind parents, a parented business decision, both url/ref halves, empty strings and arrays, a closer with no turn) each matched on its message, and applyOps naming the failing index · both flag directions — [] and null RECORDED and flagged, filled not flagged, business never orphaned, both flags at once · R2 on the TURN: an off-script decision accepted on a closed turn with supersedes naming the LATEST earlier decision on its question and both records kept, evidence ×3 on a closed turn, a revisit on a new turn accepted and then guarded · the not-a-form counter and coverage derived from the records alone · totality over junk ops, junk ctx, junk state and junk items, a plain Error every time · the run-2 fixture pinned at md5 ${FIXTURE_MD5.slice(0, 8)} with the one-newline mutation that proves the compare can go red. The server that writes answers.jsonl, the transcript writer and the real bank are #284's and #282's, and this group cannot reach them`);
}

// --- the verdict ------------------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (failures) {
    console.error(`\nbuild ✗  ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\nbuild ✓  all 29 groups pass");
}
