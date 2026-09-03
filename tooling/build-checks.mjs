// tooling/build-checks.mjs — the committed unit gate for /build's pattern chain (epic #134,
// ticket #137; .claude/plans/build-pattern-render-keep-rail.md).
//
// Thirty-four groups, one ✓ line each, exit 1 on any failure — the tooling/validate-trace.mjs shape.
// Committed rather than left in a shell-history line, because these ARE the ticket's named gate
// and a gate a reviewer cannot re-run is not a gate.
//
// It imports the SHIPPED modules directly. They are Node-import-safe by design (DOM references
// inside function bodies, self-boot behind a `typeof document` guard), so if an import here starts
// pulling `document`, the module has a bug and the module is what gets fixed.
//
// THREE NAMED EXCEPTIONS import portal/ code, which is build-time rather than shipped. All are here
// because a second gate file would be a gate nobody runs, and all are SDK-free for the same
// reason: CI has no portal/node_modules, so an SDK import anywhere in any of their graphs fails
// this job. Group 8's invariant is proven by that ABSENCE, which is why it cannot be checked by
// adding something (see group 8's own comment before "fixing" it by installing portal deps in CI).
//   · group 8 (#140) imports portal/lib/builder.mjs — it answers the SAME ten questions.
//   · group 9 (#157) imports portal/lib/origin.mjs — and see its own comment for what that does
//     NOT cover: the predicate is gated here, the WIRING is only ever proven against a running
//     portal, because server.mjs reaches the SDK and so can never be imported in this job.
//   · group 30 (#284) imports portal/lib/discovery.mjs and portal/lib/discovery-postures.mjs — the
//     session module and the posture. Both are statically SDK-free AND zod-free; the SDK and zod
//     live in portal/lib/discovery-transport.mjs, which this graph never reaches because
//     discovery.mjs imports it LAZILY inside runTurn, after every guard.
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
//                     ORDER assertion, each depth's exact documented set with whole-bank pinned as a
//                     FROZEN LITERAL in both files and QUESTIONS minus it asserted to be exactly
//                     D7's ten, purity and frozenness by mutation, the C3 title-term list with its
//                     positive control, the zero-import / no-page source pin, and every source-backed
//                     weak-answer note pinned to the research file by its first thirty characters
//                     (#282) · the width (#283): the five facets, the five facet modules as
//                     documented literals with budgets, the four presets, selectDepth's TOTALITY
//                     driven over the three absent forms and all 32 vectors on all four depths, the
//                     composition and its budget overflow, and junk vectors refused by name
//  29 discovery ops  the discovery applier (discovery/ops.mjs): OPS iterated against PARAMS and a
//                     VALID_FOR fixture per verb, the four named throws each driven by a broken
//                     op, both flag directions, R2 on the turn, the supersede rule, totality over
//                     junk, and the run-2 fixture's md5 pinned with the mutation that proves the
//                     compare can fail (#281)
//  30 discovery      the discovery SESSION (portal/lib/discovery.mjs + discovery-postures.mjs): the
//     session       SSE projection's whitelist with its mutation and its cap, TOOL_SCHEMA against
//                     PARAMS by NAME rather than cardinality, the provenance roots and the privacy
//                     refusal, the slug guard, the ref allocator, the derived cursor, the three line
//                     constructors, the Think posture's three pinned strings, allowsToolName
//                     exhaustively, assertTurnWritable both directions, and the SDK/zod source pin
//                     (#284) · the READ FENCE (#287): allowSetFor + allowsPath over run 1's and
//                     run 2's shapes, fenceDecision by name and by path with WebSearch/WebFetch
//                     proven independent of the set, and BOTH call sites driven — each recording
//                     via itself, each failing closed on a throw, the transport pinned to hand one
//                     fence object to both
//  31 prd projection the run package → PRD fold (discovery/prd-projection.mjs): SECTIONS iterated
//                     against LEVELS and OPS in both directions, the happy projection over a fixture
//                     package built by running the REAL applier, byte-identical determinism, the
//                     vanishing-claim mutations (delete an op, watch its section empty), the bank's
//                     rubric and research notes proven ABSENT, hostile text kept inert through BOTH
//                     routes — a human answer in a blockquote and an op param folded onto one line —
//                     the Run and Ledger lines pinned whole, the whole-ledger surfaces proven to mark
//                     a superseded record, and the corrupted-ledger refusals each driven (#290)
//  32 parenting      the parenting fixture — discovery/instrument-loans-1/, a REAL opening-set run
//                     recorded through the drawer: auditParenting proven to DETECT a miss on synthetic
//                     records first, the package's op lines RE-FOLDED through the real applier and
//                     matched record by record, every turn stamped with the CURRENT prompt-surface
//                     fingerprint so a prompt edit makes the recording stale BY NAME, eligible ≥ 1
//                     and missed 0 with every named parent in its candidate set at the moment of
//                     filing, and the projected hierarchy carrying a real parent line. Fails by name
//                     when the package is absent — it never skips (#341)
//  33 graded fixture the graded answer fixture's PURE half (#348): the sealed draw over the real 65
//                     ids with drawFor's arity pinned so ONE table serves both postures, checkKey's
//                     refusal battery, EXPECTED and CLOSES_WHEN iterated against OPS in both
//                     directions, closingOpOf's five columns with the off_script and off-script
//                     non-closers, the matrix proven to sum to the turn count, assertAnswersSealed
//                     both ways, THE AUTHOR'S FENCE source-pinned and driven through the real
//                     allowsPath over ABSOLUTE leak paths, the mirror fence denying the key to the
//                     judge, the circularity guard and the no-other-reader sweep. The six recorded
//                     packages gate on existsSync and the line says pending until Phase C lands
//  34 proposals      feature proposals from a finished run package (discovery/proposals.mjs, #359):
//                     the vocabulary frozen at both levels, PROPOSAL_SECTIONS iterated against
//                     STATUSES in both directions, the four refusals each on its own message with
//                     the mutation that turns it red, the derived status with every verdict kept,
//                     the vanishing-claim loop over this fold, group 31's injection battery re-run
//                     as a CENSUS over PROPOSAL_KEYS and VERDICT_KEYS, prd.md proven byte-identical
//                     with and without proposal lines, and the SDK half read as TEXT
//
//   node tooling/build-checks.mjs

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
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
import { DEPTHS, FACETS, facetPlan, FULL_DISCOVERY_BUDGET, MODULES, NON_FUNCTIONAL_BLOCK, OPENING_SET, PRESETS, questionById, questionsForStage, QUESTIONS as BANK, selectDepth, STAGES } from "../discovery/bank.mjs";
// #281's op grammar + applier — a zero-import module in discovery/ (not system/, so gen-loc-summary
// counts nothing), with no SDK anywhere in its graph. OPS and PARAMS are aliased because OPS above
// is board-ops.mjs's.
import { applyOp as applyDiscoveryOp, applyOps as applyDiscoveryOps, auditParenting, emptyRun, FLAGS, LEVELS, OPS as DISCOVERY_OPS, PARAMS as DISCOVERY_PARAMS, parentCandidates, PROVENANCE, SOURCES } from "../discovery/ops.mjs";
// #284's session module + posture — the THIRD named portal/ exception (see the header). Both are
// statically SDK-free and zod-free; the SDK lives in discovery-transport.mjs, which discovery.mjs
// imports LAZILY inside runTurn. CI's absence of portal/node_modules is what PROVES that, the same
// way group 8's invariant is proven for builder.mjs — by ABSENCE, not by adding something.
import {
  allowSetFor, allowsPath, allowsToolName, appendTranscript, assertProvenanceRoot, assertRunSlug as assertDiscoverySlug, assertTurnWritable,
  BANK_PATH, deniedLine, denyReason, discoveryConfig, ENTRY_MODES, fenceCanUseTool, fenceDecision, fenceHooks, FRONT_ENDS, isMcpToolName, MCP_SERVER, nextRef, openSession, opLine,
  PROVENANCES, readAnswers, READ_TOOLS, readTranscript, resolveRunRoot, sessionView, textLine, TOOL_SCHEMA,
  TOOL_TYPES, toolNameFor, TURN_EVENT_TEXT_MAX, turnEvent,
} from "../portal/lib/discovery.mjs";
// #338 F2 — the boot stamp. Pure helper only; BOOT_SHA itself shells out to git and is source-pinned.
import { isStale } from "../portal/lib/version.mjs";
import { buildThinkTurn, EVIDENCE_RULE, FINGERPRINT_INPUTS, fingerprintOf, LADDER_BRIEF, ledgerBrief, MVP6_LINE, PARENT_RULE, POSTURES, PROVENANCE_RULE, TOOL_DESCRIPTIONS, YIELD_CONTRACT } from "../portal/lib/discovery-postures.mjs";
// #290's PRD projection — a zero-portal-dependency module in discovery/ (it imports only ops.mjs,
// bank.mjs and node:fs/path/url), so this group loads in an environment with no portal/node_modules.
// writePrd is deliberately NOT imported: group 31 stays in memory (see its closing line). readPackage
// is imported for group 32 alone, because its subject IS the on-disk package (#341).
import { checkOpLines, METRIC_STAGE, NON_GOAL_QUESTIONS, projectPrd, readPackage, SECTIONS } from "../discovery/prd-projection.mjs";
// #359's proposal half — the same zero-portal-dependency shape (it imports ops.mjs, bank.mjs,
// prd-projection.mjs and node built-ins, nothing else), so group 34 loads with no
// portal/node_modules. PROPOSAL_SECTIONS is named that way rather than SECTIONS precisely to avoid a
// sixth alias in this file. The SDK half (portal/lib/discovery-proposer.mjs) reaches the SDK and is
// read as TEXT by case 34.12, never imported.
import {
  checkProposalLines, foldProposals, LINE_TYPES, MAX_PROPOSALS, nextProposalId, OPS_DISJOINT,
  PROPOSAL_ID_RE, PROPOSAL_KEYS, PROPOSAL_SECTIONS, PROPOSED_BY_MODEL, projectProposals,
  proposalsView, readProposalPackage, STATUSES, statusCounts, statusOf, VERDICT_KEYS, VERDICTS,
} from "../discovery/proposals.mjs";
// #348's graded answer fixture — the sealed draw, the key's validator and the scorer. Zero-portal
// dependency for the same reason as the projection above: it imports only node built-ins plus
// discovery/bank.mjs and discovery/ops.mjs, both import-free. The FENCED author harness
// (portal/record-graded-answers.mjs) imports the SDK and is read as TEXT by group 33, never imported.
import {
  assertAnswersSealed, checkDraw, checkKey, closingOpOf, CLOSES_WHEN, COLUMNS, drawFor, EXPECTED,
  evidenceCountOf, KINDS, kindFor, mvp6Shortlist, readGradedPackage, RUNS, scorePackage,
} from "./discovery-score.mjs";

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
  // The whole bank as a LITERAL, in source order — SECOND copy: #283 froze the depth in bank.mjs
  // too, so the two literals are what can disagree, loudly, and a source entry added, dropped or
  // reordered has to move both in the same PR.
  const WHOLE_BANK = [
    "s1-choice-cascade", "s1-what-would-have-to-be-true", "s1-premortem", "s1-how-addressed-today",
    "s1-why-who-how-what", "s1-if-nobody-solves-this",
    "s2-more-than-one-way", "s2-why-do-you-want-it", "s2-riskiest-assumption", "s2-last-time-show-me",
    "s2-switch-timeline", "s2-four-forces", "s2-kano-pair",
    "s3-why-now", "s3-user-need-map", "s3-where-is-the-inertia", "s3-beachhead",
    "s3-deliberately-not-doing", "s3-what-winning-earns",
    "s4-appetite", "s4-breadboard-elements", "s4-rabbit-holes", "s4-out-of-bounds",
    "s4-circuit-breaker", "s4-press-release", "s4-four-risks",
    "s5-value-metric", "s5-willingness-to-pay", "s5-monetisation-failure", "s5-pain-budget-same-person",
    "s5-net-revenue-retention", "s5-gross-margin", "s5-pricing-model-story", "s5-free-tier-cost",
    "s6-process-as-it-runs", "s6-accountable-when-wrong", "s6-permission-model", "s6-audit-trail",
    "s6-where-data-lives", "s6-coexist-with-incumbent", "s6-edge-cases-or-refusals", "s6-integration-surface",
    "s7-goals-signals-metrics", "s7-north-star", "s7-counter-metric", "s7-kill-state-and-date",
    "s7-what-would-make-us-stop", "s7-abandonment", "s7-goes-up-doing-nothing",
    "s8-eval", "s8-validate-the-validators", "s8-system-or-model", "s8-failure-who-pays",
    "s8-human-in-the-loop", "s8-reversibility-blast-radius", "s8-cost-per-successful-action",
    "s8-latency-budget", "s8-product-or-feature", "s8-data-flywheel", "s8-trust-budget",
    "s8-source-opening-rate",
    "s9-customer-experience-backwards", "s9-eleven-star", "s9-strength-of-evidence", "s9-very-disappointed",
  ];
  // The ten #283 added OUTSIDE the source and OUTSIDE whole-bank (bank.mjs D7). Case 10 asserts
  // QUESTIONS minus WHOLE_BANK is exactly this list — the statement that can fail once whole-bank
  // is a literal.
  const ADDED_283 = [
    "s4-performance-budget", "s4-availability-expectation", "s4-accessibility-target", "s4-security-boundary",
    "s8-prompt-instruction", "s8-conversational-memory", "s8-agentic-controls", "s8-grounding-sources",
    "s8-response-patterns", "s8-safety-and-trust",
  ];
  const ids = (qs) => qs.map((q) => q.id);

  // 1 · the count — 75 entries: 65 source entries per stage 6·7·6·7·8·8·7·12·4 (69 source bullets
  //     less two mottos, one cross-reference and one fold — the module header's D2/D3), plus D7's
  //     four in stage 4 and six in stage 8, over the same nine stages.
  ok(BANK.length === 75, `the bank holds ${BANK.length} entries, not 75 — 65 source-backed plus the ten of D7`);
  const perStage = [6, 7, 6, 11, 8, 8, 7, 18, 4];
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
  // The whole bank: the literal above, equal to the FROZEN LITERAL bank.mjs now carries (#283) —
  // two copies in two files, which is the point: this one is what can disagree. The 65 source-backed
  // entries must also keep source order INSIDE QUESTIONS, and the depth must never go back to being
  // derived, because a derived depth moves the moment a question is added. Its label must say stress
  // test, never interview: it re-admits the Stage 9 exercises full discovery leaves out.
  ok(WHOLE_BANK.length === 65 && new Set(WHOLE_BANK).size === 65, "WHOLE_BANK must be 65 unique ids");
  ok(JSON.stringify(ids(selectDepth("whole-bank"))) === JSON.stringify(WHOLE_BANK),
    `whole-bank drifted from the documented 65: ${JSON.stringify(ids(selectDepth("whole-bank")))}`);
  ok(JSON.stringify(ids(BANK).filter((id) => WHOLE_BANK.includes(id))) === JSON.stringify(WHOLE_BANK),
    "the 65 source-backed entries must keep source order inside QUESTIONS");
  ok(!/QUESTIONS\.map\(\(q\) => q\.id\)/.test(readFileSync(join(ROOT, "discovery/bank.mjs"), "utf8")),
    "whole-bank must be a LITERAL in bank.mjs, never derived from QUESTIONS — a derived depth moves when a question is added and the graded fixture stops being scoreable");
  ok(/stress test/i.test(DEPTHS["whole-bank"].label) && !/interview/i.test(DEPTHS["whole-bank"].label),
    `whole-bank's label must read as a stress test, not an interview: ${JSON.stringify(DEPTHS["whole-bank"].label)}`);
  // The MENU pinned by name: the four depths above are each pinned to a literal, and a fifth with
  // no literal would otherwise pass the generic loops below silently.
  ok(JSON.stringify(Object.keys(DEPTHS)) === JSON.stringify(["scope-check", "opening-set", "full-discovery", "whole-bank"]),
    `the depth menu is ${JSON.stringify(Object.keys(DEPTHS))} — a depth was added, dropped or reordered without a literal pin here`);
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
  for (const f of FACETS) ok(!TITLE_TERMS.test(f.question) && !TITLE_TERMS.test(f.fires), `facet ${f.id} carries a title`);
  for (const [k, m] of Object.entries(MODULES)) ok(!TITLE_TERMS.test(m.label), `module ${k} label carries a title`);
  for (const p of PRESETS) ok(!TITLE_TERMS.test(p.label), `preset ${p.id} label carries a title`);

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

  // 9 · the source pin (D13) — every SOURCE-BACKED weak-answer note's first thirty characters occur
  //     verbatim in the source file's stages 1–9 region, so a paraphrased or invented note goes red.
  //     Scoped to whole-bank's 65 since #283: D7's ten are not from that file and are never asked to
  //     appear in it — and the loop under it proves that scoping is not doing nothing. Positive
  //     control: the region must be able to NOT contain a string.
  const source = readFileSync(join(ROOT, "docs/research/question-bank-source.md"), "utf8");
  // Both headings must exist first: an indexOf of -1 would make slice run to the end of the file
  // and the pin would get MORE permissive rather than red.
  ok(source.includes("## Stage 1") && source.includes("## The twelve"), "case 9: a source heading moved (\"## Stage 1\" or \"## The twelve\")");
  const region = source.slice(source.indexOf("## Stage 1"), source.indexOf("## The twelve"));
  ok(region.length > 10000, `the source region is ${region.length} chars — did the stage headings move?`);
  ok(!region.includes("a note nobody wrote"), "source-pin positive control: the region must be able to miss");
  for (const q of BANK) if (WHOLE_BANK.includes(q.id)) ok(region.includes(q.weakAnswer.slice(0, 30)), `${q.id}: weakAnswer's opening is not in the source — "${q.weakAnswer.slice(0, 30)}"`);
  for (const id of ADDED_283) ok(!region.includes(questionById(id).weakAnswer.slice(0, 30)), `${id}: a D7 entry's weak-answer opening is IN the source region — it is not from that file, so the scoping above is doing nothing`);

  // 10 · the added ten (D7) — QUESTIONS minus whole-bank is EXACTLY this list, both directions; each
  //      resolves, sits in the stage its prefix names, cites a primary source by URL, and the six
  //      AI-interaction entries name Amershi or PAIR. The block is the first four; the six the rest.
  const outside = ids(BANK).filter((id) => !WHOLE_BANK.includes(id));
  ok(JSON.stringify(outside) === JSON.stringify(ADDED_283), `QUESTIONS minus whole-bank is ${JSON.stringify(outside)}, not D7's ten — an entry was added without joining this list, or one of the ten fell into whole-bank`);
  ok(ADDED_283.every((id) => questionById(id) !== null && !WHOLE_BANK.includes(id)), "every D7 id must resolve and stay OUT of whole-bank");
  for (const id of ADDED_283) ok(/https:\/\/\S+/.test(questionById(id).attribution), `${id}: attribution carries no URL — D7 entries cite a primary source by URL`);
  const AI_SIX = ADDED_283.slice(4);
  ok(JSON.stringify(NON_FUNCTIONAL_BLOCK) === JSON.stringify(ADDED_283.slice(0, 4)), `NON_FUNCTIONAL_BLOCK is ${JSON.stringify(NON_FUNCTIONAL_BLOCK)}, not D7's first four`);
  for (const id of AI_SIX) ok(/Amershi|PAIR/.test(questionById(id).attribution) && questionById(id).label === "OBSERVED", `${id}: the AI-interaction module cites HAX (Amershi) or PAIR as a PRIMARY source, OBSERVED`);
  ok(/enforces nothing|enforced nowhere/i.test(bankSrc), "the block's header must state it elicits and records and enforces nothing");

  // 11 · the five facets, in the documented order, each with the intake question and a fires line;
  //      frozen at both levels by an inert write.
  ok(JSON.stringify(FACETS.map((f) => f.id)) === JSON.stringify(["hasModel", "regulated", "internal", "orgBuys", "replacesAProcess"]), `FACETS is ${JSON.stringify(FACETS.map((f) => f.id))} — the five, in D1's order`);
  for (const f of FACETS) ok(filled(f.question) && f.question.endsWith("?") && filled(f.fires), `facet ${f.id} needs a question ending in ? and a fires line`);
  ok(Object.isFrozen(FACETS) && FACETS.every(Object.isFrozen), "FACETS must be frozen at both levels");

  // 12 · the modules — keyed exactly by FACETS, each a documented literal with a declared budget equal
  //      to its length, every id resolving, DISJOINT from each other, from the twelve and from the
  //      block, and hasModel carrying the six. Budgets pinned so any two fit and any three overflow.
  const MODULE_IDS = {
    hasModel: ["s8-failure-who-pays", ...AI_SIX],
    regulated: ["s4-four-risks", "s6-audit-trail", "s6-permission-model", "s6-where-data-lives", "s6-edge-cases-or-refusals", "s9-strength-of-evidence"],
    internal: ["s1-why-who-how-what", "s2-why-do-you-want-it", "s2-last-time-show-me", "s6-integration-surface", "s7-abandonment", "s7-goes-up-doing-nothing"],
    orgBuys: ["s5-value-metric", "s5-willingness-to-pay", "s5-monetisation-failure", "s5-net-revenue-retention", "s5-gross-margin", "s5-pricing-model-story"],
    replacesAProcess: ["s1-premortem", "s2-switch-timeline", "s2-four-forces", "s3-where-is-the-inertia", "s3-deliberately-not-doing", "s6-coexist-with-incumbent"],
  };
  ok(JSON.stringify(Object.keys(MODULES)) === JSON.stringify(FACETS.map((f) => f.id)), `MODULES is keyed ${JSON.stringify(Object.keys(MODULES))}, not by FACETS`);
  for (const f of FACETS) {
    const m = MODULES[f.id];
    ok(m && filled(m.label) && Number.isInteger(m.budget) && Array.isArray(m.ids), `module ${f.id} needs label, budget and ids`);
    ok(JSON.stringify(m.ids) === JSON.stringify(MODULE_IDS[f.id]), `module ${f.id} drifted: ${JSON.stringify(m.ids)}`);
    ok(m.budget === m.ids.length && m.budget >= 6 && m.budget <= 7, `module ${f.id}: budget ${m.budget} must equal its ${m.ids.length} ids and sit in 6..7 (any two fit, any three overflow)`);
    ok(m.ids.every((id) => questionById(id) !== null), `module ${f.id} references an id the bank does not hold`);
    ok(m.ids.every((id) => !OPENING_SET.includes(id) && !NON_FUNCTIONAL_BLOCK.includes(id)), `module ${f.id} repeats a twelve or block id`);
    ok(Object.isFrozen(m) && Object.isFrozen(m.ids), `module ${f.id} must be frozen`);
  }
  const allModuleIds = FACETS.flatMap((f) => MODULES[f.id].ids);
  ok(new Set(allModuleIds).size === allModuleIds.length, "two modules share an id — a composition would ask it twice");
  ok(!MODULES.internal.ids.includes("s5-willingness-to-pay"), "internal must not carry willingness-to-pay (D1)");
  ok(Object.isFrozen(MODULES), "MODULES must be frozen");

  // 13 · the presets — the PRD's four names, each carrying all five keys, each composing without
  //      overflow; consumer is the declared all-false vector and is NOT the same as {}.
  ok(JSON.stringify(PRESETS.map((p) => [p.id, p.label])) === JSON.stringify([["regulated", "Regulated"], ["b2b-saas", "B2B SaaS"], ["internal-tool", "Internal tool"], ["consumer", "Consumer"]]), `PRESETS drifted: ${JSON.stringify(PRESETS.map((p) => [p.id, p.label]))}`);
  const ticked = (p) => FACETS.map((f) => f.id).filter((id) => p.facets[id]);
  ok(JSON.stringify(PRESETS.map(ticked)) === JSON.stringify([["regulated"], ["orgBuys"], ["internal", "orgBuys"], []]), `the presets tick ${JSON.stringify(PRESETS.map(ticked))}, not D1's combinations`);
  for (const p of PRESETS) {
    ok(JSON.stringify(Object.keys(p.facets).sort()) === JSON.stringify(FACETS.map((f) => f.id).sort()) && Object.values(p.facets).every((v) => typeof v === "boolean"), `preset ${p.id} must carry all five facets as booleans`);
    ok(facetPlan(p.facets).declared && facetPlan(p.facets).overflow.length === 0, `preset ${p.id} must compose without overflow`);
    ok(Object.isFrozen(p) && Object.isFrozen(p.facets), `preset ${p.id} must be frozen`);
  }
  ok(selectDepth("full-discovery", PRESETS[3].facets).length === 16 && selectDepth("full-discovery", {}).length === 30, "consumer (declared all-false) is twelve + block = 16; {} is NO vector and answers the unfaceted 30");

  // 14 · TOTALITY (D1b) — the three ABSENT forms and every one of the 32 vectors, driven against all
  //      four literals: the three non-composing depths never move, and no vector answers today's
  //      list on full-discovery except the absent forms. Byte-identical means JSON-identical here.
  const LITERALS = { "scope-check": SCOPE_CHECK, "opening-set": OPENING_SET, "full-discovery": FULL_DISCOVERY, "whole-bank": WHOLE_BANK };
  const vectors = [];
  for (let bits = 0; bits < 32; bits += 1) vectors.push(Object.fromEntries(FACETS.map((f, i) => [f.id, Boolean(bits & (1 << i))])));
  for (const k of Object.keys(DEPTHS)) {
    ok(JSON.stringify(ids(selectDepth(k))) === JSON.stringify(LITERALS[k]), `selectDepth("${k}") with ONE argument moved: ${JSON.stringify(ids(selectDepth(k)))}`);
    for (const absent of [undefined, null, {}]) ok(JSON.stringify(ids(selectDepth(k, absent))) === JSON.stringify(LITERALS[k]), `selectDepth("${k}", ${JSON.stringify(absent) ?? "undefined"}) must be byte-identical to today's list`);
    if (k !== "full-discovery") for (const v of vectors) ok(JSON.stringify(ids(selectDepth(k, v))) === JSON.stringify(LITERALS[k]), `depth ${k} moved under vector ${JSON.stringify(v)} — only full-discovery composes`);
  }
  ok(facetPlan(undefined).declared === false && facetPlan({}).declared === false && facetPlan(PRESETS[3].facets).declared === true, "facetPlan must read undefined and {} as NO vector and an all-false object as a declared one");

  // 15 · the COMPOSITION — for every vector: the stable prefix asserted for full-discovery ONLY (whole
  //      bank's first twelve are source order and are deliberately not asserted), the fired modules in
  //      FACETS order, the block LAST exactly once, no repeat, the count arithmetic; every pair fits,
  //      every triple / quad / quint overflows — reported by facetPlan and THROWN by selectDepth naming
  //      the facet that does not fit and the whole-bank escape.
  ok(JSON.stringify(ids(selectDepth("whole-bank")).slice(0, 12)) !== JSON.stringify(TWELVE), "positive control: whole-bank's first twelve are NOT the opening set, so the prefix assertion below must stay scoped to full-discovery");
  let pairs = 0, overflows = 0;
  for (const v of vectors) {
    const fired = FACETS.map((f) => f.id).filter((id) => v[id]);
    const plan = facetPlan(v);
    ok(JSON.stringify(plan.fired) === JSON.stringify(fired), `facetPlan fired ${JSON.stringify(plan.fired)} for ${JSON.stringify(fired)}`);
    const want = 12 + 4 + fired.reduce((s, id) => s + MODULES[id].budget, 0);
    if (fired.length <= 2) {
      ok(plan.overflow.length === 0 && plan.count === want && want <= FULL_DISCOVERY_BUDGET, `${fired.join("+") || "consumer"} must fit: plan ${JSON.stringify(plan)}`);
      const list = ids(selectDepth("full-discovery", v));
      ok(JSON.stringify(list.slice(0, 12)) === JSON.stringify(TWELVE), `full-discovery under ${fired.join("+") || "no facet"} does not start with the twelve in OPENING_SET's order`);
      ok(JSON.stringify(list.slice(12, 12 + want - 16)) === JSON.stringify(fired.flatMap((id) => MODULES[id].ids)), `the modules must follow the twelve in FACETS order under ${fired.join("+")}`);
      ok(JSON.stringify(list.slice(-4)) === JSON.stringify(NON_FUNCTIONAL_BLOCK) && list.filter((id) => NON_FUNCTIONAL_BLOCK.includes(id)).length === 4, `the block must be LAST, once, under ${fired.join("+") || "no facet"}`);
      ok(list.length === want && new Set(list).size === list.length, `full-discovery under ${fired.join("+") || "no facet"} is ${list.length} long with ${new Set(list).size} distinct — want ${want}`);
      ok(selectDepth("full-discovery", v).every((q) => questionById(q.id) === q), "a composed list must answer the bank's own entries");
      if (fired.length === 2) pairs += 1;
    } else {
      ok(plan.overflow.length >= 1 && plan.fits.length === 2 && plan.count <= FULL_DISCOVERY_BUDGET, `${fired.join("+")} must overflow with exactly two fitting: plan ${JSON.stringify(plan)}`);
      let msg = null;
      try { selectDepth("full-discovery", v); } catch (e) { msg = e.message; }
      ok(msg !== null && plan.overflow.every((id) => msg.includes(id)) && msg.includes("whole-bank") && msg.includes(String(FULL_DISCOVERY_BUDGET)), `an overflowing vector must THROW naming every facet that does not fit, the budget and the whole-bank escape — got ${JSON.stringify(msg)}`);
      overflows += 1;
    }
  }
  ok(pairs === 10 && overflows === 16, `drove ${pairs} pairs and ${overflows} overflowing vectors — want 10 and 16`);
  ok(JSON.stringify(selectDepth("full-discovery", { regulated: true })) === JSON.stringify(selectDepth("full-discovery", PRESETS[0].facets)), "a partial vector and the full-key preset it equals must compose the same list");

  // 16 · junk vectors refused BY NAME on every depth — a vector no run.json may ever carry.
  const JUNK_FACETS = [["x", "facets must be"], [[], "facets must be"], [42, "facets must be"], [{ marketplace: true }, "marketplace"], [{ hasModel: "yes" }, "hasModel"], [{ hasModel: 1 }, "hasModel"], [{ regulated: null }, "regulated"]];
  for (const k of Object.keys(DEPTHS)) for (const [junk, needle] of JUNK_FACETS) {
    let msg = null;
    try { selectDepth(k, junk); } catch (e) { msg = e.message; }
    ok(msg !== null && msg.includes(needle), `selectDepth("${k}", ${JSON.stringify(junk)}) must throw naming ${JSON.stringify(needle)}, got ${JSON.stringify(msg)}`);
  }

  // 17 · a key reached through the PROTOTYPE CHAIN is not a declaration. Every JUNK_FACETS entry above
  //      is own-keyed, which is why a green gate never saw this: Object.create(defaults) is an ordinary
  //      way to write a facet object (#285, #288), and a chain read would compose a module nobody
  //      ticked. Own-key reads make an inherited key MISSING — false, silently, and unvalidated, since
  //      validation walks Object.keys. All three drive the same own vector behind the same control.
  {
    const want = JSON.stringify(selectDepth("full-discovery", { hasModel: true }));
    for (const [label, proto] of [["a ticked boolean", { regulated: true }], ["a non-boolean", { regulated: "yes" }], ["an unknown facet", { marketplace: true }]]) {
      const inherited = Object.assign(Object.create(proto), { hasModel: true });
      ok(inherited.regulated !== undefined || inherited.marketplace !== undefined, `the ${label} fixture must actually inherit — otherwise this case cannot fail`);
      let msg = null, plan = null;
      try { plan = facetPlan(inherited); } catch (e) { msg = e.message; }
      ok(msg === null, `an inherited facet must not throw (${label}) — it is not an own key and so not a declaration, got ${JSON.stringify(msg)}`);
      ok(JSON.stringify(plan.fired) === JSON.stringify(["hasModel"]), `an inherited facet must not fire (${label}) — want ["hasModel"], got ${JSON.stringify(plan?.fired)}`);
      ok(JSON.stringify(selectDepth("full-discovery", inherited)) === want, `an inherited facet must compose the OWN vector's list (${label}) — a person may only get the modules they ticked`);
    }
  }

  // 18 · purity of the new surface — two calls agree, the plan is frozen, a write to a composed list's
  //      source arrays is inert, and the composition never aliases MODULES.
  ok(JSON.stringify(facetPlan(PRESETS[2].facets)) === JSON.stringify(facetPlan(PRESETS[2].facets)) && Object.isFrozen(facetPlan(PRESETS[2].facets)), "facetPlan must be pure and answer a frozen plan");
  ok(Object.isFrozen(NON_FUNCTIONAL_BLOCK) && Object.isFrozen(PRESETS), "NON_FUNCTIONAL_BLOCK and PRESETS must be frozen");
  { const before = JSON.stringify(MODULES); try { MODULES.hasModel.ids.push("s1-premortem"); } catch { /* strict-mode throw; the compare decides */ } ok(JSON.stringify(MODULES) === before, "a write to a module must be inert"); }

  group("bank", "75 entries — 65 source-backed pinned per stage 6·7·6·7·8·8·7·12·4 plus D7's four in stage 4 and six in stage 8 — over nine stages · ids unique, s<stage>-<slug>, prefix equal to stage, questionById by IDENTITY and null over junk · every entry's text + attribution + weak-answer note + label with the key set closed · the twelve as an ORDER assertion against the documented list · each depth's exact documented set, full discovery headed by the twelve, the whole bank as the 65 in source order (a FROZEN LITERAL in both files, with QUESTIONS minus whole-bank asserted to be exactly D7's ten) with its label pinned to stress test and the four-entry menu pinned by name, no orphan and no repeat, the junk-depth throw naming the value · the five facets in D1's order, each with its intake question and what it fires · the five modules as documented literals, budgets equal to their lengths and pinned to 6..7, every id resolving, disjoint from each other, from the twelve and from the block · the four presets ticking D1's combinations and composing without overflow, consumer as the declared all-false vector distinct from {} · TOTALITY driven over the three absent forms and all 32 vectors against all four literals · the composition per vector — the twelve first (asserted for full-discovery ONLY, with whole-bank as the positive control), the modules in FACETS order, the block LAST exactly once, the count arithmetic, ten pairs fitting and sixteen overflowing vectors THROWING by facet name with the budget and the whole-bank escape · seven junk vectors refused BY NAME on every depth, and a key reached through the PROTOTYPE CHAIN neither throwing, firing nor composing — behind a fixture control that proves it inherits · purity by double call, entries by identity, frozenness at every level by an inert write, over the new surface as well as the old · the C3 title-term list with its positive control and the profession-noun exemption stated, swept over the facet questions and the module and preset labels too · zero import lines, no DOM token, and no tracked page or system/ module reaching the bank · every SOURCE-BACKED weak-answer note's first thirty characters pinned to docs/research/question-bank-source.md, with D7's ten proven ABSENT from that region so the scoping is not vacuous. What it cannot reach: whether an entry's text, attribution, note or provenanceNote is the source's wording for its id (only weakAnswer is pinned), and whether the C2 slop pass was run — both review facts against that source file; whether a module's selection is the RIGHT selection for its facet — an editorial fact the second, faceted full-discovery run reads (decision doc D4); and whether a person can answer a facet box without having done the discovery (D2's wrong-if), which only a real intake can show");
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
  const ev = (over = {}) => ({ op: "file_evidence", params: { url: "https://example.test/source", ref: null, name: null, provenance: "secondary-source", claim_ref: null, ...over } });
  const dec = (over = {}) => ({ op: "record_decision", params: { question_id: "q1", answer_ref: "a1", level: "business", parent_id: null, evidence_refs: [1], wrong_if: "the pilot cohort churns inside a quarter", off_script: false, ...over } });
  const weak = (over = {}) => ({ op: "flag_weak_answer", params: { question_id: "q2", answer_ref: "a2", missing: ["a number"], ...over } });
  const openq = (over = {}) => ({ op: "open_question", params: { source: "banked", question_id: "q2", answer_ref: "a3", reason: "needs a figure nobody in the room had", ...over } });

  // 28.1 — the roster, both directions, and frozen BY MUTATION (a module in strict mode throws on
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

  // 28.2 — the positive control: deterministic and pure. The refusals below mean nothing unless
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

  // 28.3 — the four throws the architecture names, each driven by a broken op.
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

  // 28.4 — the further refusals, each by a broken op, each message naming what it must.
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
    // #347 — a name rides on a ref, never a url, and an empty name is a refusal, not a flag.
    ["a name beside a url", () => applyDiscoveryOp(s1, ev({ name: "the Q3 spreadsheet" }), ctx()), ["file_evidence", '"name"', "url"]],
    ["an empty name", () => applyDiscoveryOp(s1, ev({ url: null, ref: "a1", name: "" }), ctx()), ["file_evidence", '"name"', "non-empty"]],
    ["a non-string name", () => applyDiscoveryOp(s1, ev({ url: null, ref: "a1", name: 7 }), ctx()), ["file_evidence", '"name"']],
    ["a pasted source that does not resolve", () => applyDiscoveryOp(s1, ev({ url: null, ref: "a99" }), ctx()), ['ref "a99"', "does not resolve"]],
    ["a claim_ref naming a file_evidence", () => applyDiscoveryOp(s1, ev({ claim_ref: 1 }), ctx()), ["claim_ref 1", "file_evidence", "record_decision"]],
    ["a closing decision with no turn", () => applyDiscoveryOp(s1, dec(), ctx(null)), ["record_decision", "no banked turn is open"]],
    ["a closing flag with an empty turn", () => applyDiscoveryOp(s1, weak(), ctx("")), ["flag_weak_answer", "no banked turn is open"]],
    ["a banked open question with no turn", () => applyDiscoveryOp(s1, openq(), ctx(null)), ["open_question", "no banked turn is open"]],
  ];
  for (const [what, fn, needles] of REFUSALS) ok(names(fn, ...needles) === null, `${what}: ${names(fn, ...needles)}`);
  ok(REFUSALS.length >= 30, `${REFUSALS.length} refusals driven — the battery shrank`);
  // #347 — the positive half: a named artefact on a ref RECORDS its name, with the exact param key set,
  // so "the Q3 dispensing spreadsheet" has a row of its own rather than a pointer at a sentence.
  {
    const named = applyDiscoveryOp(s1, ev({ url: null, ref: "a1", name: "the Q3 dispensing spreadsheet" }), ctx()).ops.at(-1);
    ok(named.params.name === "the Q3 dispensing spreadsheet" && named.params.ref === "a1" && named.params.url === null && same(Object.keys(named.params), DISCOVERY_PARAMS.file_evidence),
      `a named artefact did not record as { url null, ref a1, name } with PARAMS' key order — got ${JSON.stringify(named.params)}`);
    ok(applyDiscoveryOp(s1, ev({ url: null, ref: "a1" }), ctx()).ops.at(-1).params.name === null, "a bare ref must record name: null, not undefined");
  }
  // The fold names the failing item by index, and applyOps is where a { op, params, turn } item's
  // turn is lifted into ctx (the applier's exact envelope refuses it as a key, see above).
  ok(names(() => applyDiscoveryOps([{ ...ev(), turn: null }, { ...ev(), turn: null }, { ...dec({ answer_ref: "a99" }), turn: "t1" }], ctx()), "op 2 (record_decision):", "a99") === null,
    `applyOps did not rethrow with the index: ${names(() => applyDiscoveryOps([{ ...ev(), turn: null }, { ...ev(), turn: null }, { ...dec({ answer_ref: "a99" }), turn: "t1" }], ctx()), "op 2 (record_decision):", "a99")}`);
  // …and the ITEM envelope is exact as well: a transcript line fed whole (seq, closes, flagged beside
  // a valid op) is refused by name, so a hand-altered line cannot ride through the fold.
  ok(names(() => applyDiscoveryOps([{ ...ev(), turn: null, seq: 9 }], ctx()), "op 0 (file_evidence):", 'unknown key "seq"') === null,
    `applyOps accepted an item carrying seq: ${names(() => applyDiscoveryOps([{ ...ev(), turn: null, seq: 9 }], ctx()), "op 0 (file_evidence):", 'unknown key "seq"')}`);
  ok(threw(() => applyDiscoveryOps([{ op: "file_evidence", params: ev().params }], ctx())) === null, "an item with no turn key was refused — turn is optional on an item (null when absent)");

  // 28.5a — parentCandidates and auditParenting (#341), the two pure reads beside the applier, and
  // the wrong-rung refusal turned into a CORRECTION. The rehearsal's agent was refused five times
  // naming the rung and re-filed null five times, because a rung is not a seq: the refusal now names
  // this run's seqs at the required rung (or says there are none yet and to pass null), and the
  // audit is what group 32 reads over the committed fixture — so it is proven here to DETECT a miss,
  // to keep a structural orphan structural after a later stakeholder lands (candidates at the MOMENT
  // OF FILING, never the final ledger), and to be total over junk. happy has one business decision
  // at seq 2 on t1.
  {
    ok(same(parentCandidates(happy.ops, "stakeholder"), [2]), `parentCandidates(happy, stakeholder) is ${JSON.stringify(parentCandidates(happy.ops, "stakeholder"))}, not [2] — the business decision at seq 2 is the one candidate`);
    ok(same(parentCandidates(happy.ops, "solution"), []), "parentCandidates(happy, solution) is not [] — no stakeholder decision exists yet");
    ok(same(parentCandidates(happy.ops, "business"), []), "parentCandidates(happy, business) is not [] — business has nothing above it by definition");
    ok(same(parentCandidates([], "stakeholder"), []), "parentCandidates over an empty ledger is not []");
    ok(names(() => parentCandidates(happy.ops, "vibes"), 'level "vibes"', ...LEVELS) === null, `parentCandidates on a level off the ladder: ${names(() => parentCandidates(happy.ops, "vibes"), 'level "vibes"', ...LEVELS)} — a silent [] would read as "no candidates" and license a null`);
    ok(names(() => parentCandidates(null, "solution"), "parentCandidates", "ops") === null, `parentCandidates(null): ${names(() => parentCandidates(null, "solution"), "parentCandidates", "ops")}`);
    // A stakeholder decision under the business one — seq 5 on t9.
    const withStake = applyDiscoveryOp(happy, dec({ level: "stakeholder", parent_id: 2, question_id: "q2" }), ctx("t9"));
    ok(withStake.ops.at(-1).seq === 5 && withStake.ops.at(-1).params.level === "stakeholder", "the stakeholder fixture did not land at seq 5");
    // The refusal WITH candidates names them and says re-file; WITHOUT candidates it says none yet, null.
    ok(names(() => applyDiscoveryOp(withStake, dec({ level: "solution", parent_id: 2, question_id: "q2" }), ctx("t10")), "parent_id 2", "business", "stakeholder", "seq 5", "re-file") === null,
      `the wrong-rung refusal with a candidate in the ledger: ${names(() => applyDiscoveryOp(withStake, dec({ level: "solution", parent_id: 2, question_id: "q2" }), ctx("t10")), "parent_id 2", "business", "stakeholder", "seq 5", "re-file")}`);
    ok(names(() => applyDiscoveryOp(happy, dec({ level: "solution", parent_id: 2, question_id: "q2" }), ctx("t9")), "parent_id 2", "no stakeholder decision yet", "null") === null,
      `the wrong-rung refusal with no candidate: ${names(() => applyDiscoveryOp(happy, dec({ level: "solution", parent_id: 2, question_id: "q2" }), ctx("t9")), "parent_id 2", "no stakeholder decision yet", "null")}`);
    // The refusal's candidate set IS the acceptance set: every seq it names is accepted as a parent.
    for (const seq of parentCandidates(withStake.ops, "solution"))
      ok(threw(() => applyDiscoveryOp(withStake, dec({ level: "solution", parent_id: seq, question_id: "q2" }), ctx("t10"))) === null, `parentCandidates named seq ${seq} for a solution decision and the applier refused it — the brief would lie by inclusion`);
    // auditParenting, all three lists, on applier-shaped records.
    ok(same(auditParenting(happy.ops), { eligible: [], missed: [], structural: [] }), `audit over one business decision is ${JSON.stringify(auditParenting(happy.ops))} — a business decision appears in no list`);
    ok(same(auditParenting(withStake.ops), { eligible: [5], missed: [], structural: [] }), `audit over business + parented stakeholder is ${JSON.stringify(auditParenting(withStake.ops))}`);
    const missedRun = applyDiscoveryOp(withStake, dec({ level: "solution", parent_id: null, question_id: "q2" }), ctx("t10"));
    ok(same(auditParenting(missedRun.ops), { eligible: [5, 6], missed: [6], structural: [] }), `THE MISS: a solution filed null with a stakeholder at seq 5 in the ledger audits as ${JSON.stringify(auditParenting(missedRun.ops))}, not missed [6] — the detector cannot detect`);
    const parented = applyDiscoveryOp(withStake, dec({ level: "solution", parent_id: 5, question_id: "q2" }), ctx("t10"));
    ok(same(auditParenting(parented.ops), { eligible: [5, 6], missed: [], structural: [] }), `a solution naming seq 5 audits as ${JSON.stringify(auditParenting(parented.ops))} — a named parent must clear the miss`);
    // The structural orphan: a solution filed before any stakeholder exists (cause B's shape).
    const orphanFirst = applyDiscoveryOp(s1, dec({ level: "solution", parent_id: null }), ctx("t1"));
    ok(same(auditParenting(orphanFirst.ops), { eligible: [], missed: [], structural: [2] }), `a solution with nothing above it audits as ${JSON.stringify(auditParenting(orphanFirst.ops))}, not structural [2]`);
    // The moment-of-filing rule: a stakeholder landing LATER does not make seq 2 a miss retroactively
    // (seq 3 is itself structural — no business decision exists in this ledger); a solution filed
    // AFTER it IS a miss, because seq 3 existed when it filed.
    const later = applyDiscoveryOp(orphanFirst, dec({ level: "stakeholder", parent_id: null, question_id: "q2" }), ctx("t2"));
    ok(same(auditParenting(later.ops), { eligible: [], missed: [], structural: [2, 3] }), `after a later stakeholder lands the audit reads ${JSON.stringify(auditParenting(later.ops))}, not structural [2, 3] — candidates must be read at the MOMENT OF FILING (ops.slice(0, i)), never from the final ledger`);
    const afterLater = applyDiscoveryOp(later, dec({ level: "solution", parent_id: null, question_id: "q2" }), ctx("t3"));
    ok(same(auditParenting(afterLater.ops), { eligible: [4], missed: [4], structural: [2, 3] }), `a solution filed null after seq 3 existed audits as ${JSON.stringify(auditParenting(afterLater.ops))}, not missed [4]`);
    ok(names(() => auditParenting(null), "auditParenting", "ops") === null, `auditParenting(null): ${names(() => auditParenting(null), "auditParenting", "ops")}`);
    ok(same(auditParenting([]), { eligible: [], missed: [], structural: [] }), "auditParenting([]) is not three empty lists");
    // Purity: the audit and the candidate read leave the ledger untouched.
    const before = JSON.stringify(afterLater);
    auditParenting(afterLater.ops); parentCandidates(afterLater.ops, "transition");
    ok(JSON.stringify(afterLater) === before, "auditParenting or parentCandidates mutated the ledger it read");
  }

  // 28.5 — both flag directions: empty is RECORDED and flagged, never thrown; filled is not flagged.
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

  // 28.6 — R2 keys on the TURN, not the question. happy has t1 closed by the q1 decision (seq 2).
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

  // 28.7 — the not-a-form arithmetic is possible from the record alone: reset on a closing
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

  // 28.8 — totality over junk: a plain Error with a message, never a TypeError from inside the switch.
  const plain = (fn, what) => {
    const e = threw(fn);
    ok(e instanceof Error && !(e instanceof TypeError) && typeof e.message === "string" && e.message.length > 0,
      `${what}: ${e === null ? "did not throw" : `threw ${e.constructor.name} "${e?.message}"`}`);
  };
  for (const junk of [null, 1, "x", [], {}, { op: "record_decision" }, { op: 7 }, { op: "record_decision", params: null }, { op: "record_decision", params: [] }, { op: "record_decision", params: "x" }, { op: "file_evidence", params: { url: 1, ref: null, name: null, provenance: "assumption", claim_ref: null } }])
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

  // 28.9 — the frozen fixture. The PRD says run 2's input is byte-frozen at this md5 and nothing
  // checked it (the architecture's own finding). The mutation is what makes this a check rather
  // than a constant comparison: the same bytes plus one newline must hash differently.
  const FIXTURE = "docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md";
  const FIXTURE_MD5 = "ab6eb0ee6cdd3b7802ecfcbe90db2377";
  const bytes = readFileSync(join(ROOT, FIXTURE));
  const md5 = (b) => createHash("md5").update(b).digest("hex");
  ok(md5(bytes) === FIXTURE_MD5, `${FIXTURE} hashes to ${md5(bytes)}, not the frozen ${FIXTURE_MD5} — run 2's input was edited, and its score would mean nothing`);
  ok(md5(Buffer.concat([bytes, Buffer.from("\n")])) !== FIXTURE_MD5, "the fixture plus one trailing newline still matches the frozen md5 — the compare cannot fail");

  group("discovery ops", `OPS ↔ PARAMS the same four verbs in both directions, every list frozen BY MUTATION (a push refused and the length re-read), a VALID_FOR fixture per verb so a fifth verb with no fixture fails by name, the happy fold recording seq 1…4 with closes per the table and exact param key sets · determinism by deep-comparing two folds and purity by mutating the returned record and the op and re-reading both inputs · the four named throws each driven by a broken op — an unresolvable answer_ref naming the ref, a second closer naming the turn and the closing seq (R2), a question the bank lacks naming the id with its null twin ACCEPTED as off-script, a provenance outside the four naming all four · ${REFUSALS.length} further refusals (absent field, unknown param, exact envelope, string and dangling seqs, wrong-rung and wrong-kind parents, a parented business decision, both url/ref halves, a name beside a url and an empty or non-string name (#347), empty strings and arrays, a closer with no turn) each matched on its message, a named artefact RECORDED on a ref with PARAMS' exact key set, and applyOps naming the failing index · both flag directions — [] and null RECORDED and flagged, filled not flagged, business never orphaned, both flags at once · R2 on the TURN: an off-script decision accepted on a closed turn with supersedes naming the LATEST earlier decision on its question and both records kept, evidence ×3 on a closed turn, a revisit on a new turn accepted and then guarded · the not-a-form counter and coverage derived from the records alone · totality over junk ops, junk ctx, junk state and junk items, a plain Error every time · the run-2 fixture pinned at md5 ${FIXTURE_MD5.slice(0, 8)} with the one-newline mutation that proves the compare can go red · parentCandidates by rung with the two junk throws and its candidate set proven to BE the applier's acceptance set, the wrong-rung refusal naming this run's candidate seqs (or "no … decision yet — re-file with parent_id null"), and auditParenting's three lists driven on applier-shaped records — a miss detected, a parent accepted, the structural orphan kept structural after a later stakeholder lands and the decision filed after it caught as a miss (#341). The server that writes answers.jsonl, the transcript writer and the real bank are #284's and #282's, and this group cannot reach them`);
}

// --- 30 · the discovery session -------------------------------------------------------------------
// Drives portal/lib/discovery.mjs and portal/lib/discovery-postures.mjs — the THIRD named portal/
// exception (see the header). Everything reachable with NO agent and NO token: the SSE projection,
// the schema table, the roots, the slug guard, the ref allocator, the derived cursor, the line
// constructors, the posture, the fence predicate, the fence hooks and the turn guard.
//
// It never imports portal/lib/discovery-transport.mjs, portal/server.mjs or the SDK, and that is
// proven the way group 8's invariant is proven — by ABSENCE. This job runs with no
// portal/node_modules, so if discovery.mjs's graph ever reached zod or the Agent SDK, this group
// would fail to import at all rather than fail an assertion. Do not "fix" that by installing portal
// deps in CI; the absence IS the check.
//
// Nothing under discovery/<slug>/ is read or written: every case that needs a package root uses a
// temp directory, because a real run package may only ever be written by a real session. The one
// repo-rooted call is case 16, which drives openSession's REFUSALS — each throws before mkdirSync,
// and that order is pinned from source in the same case rather than by looking for the directory, so
// a green run touches no disk and a stale directory of the reserved slug cannot go red on its own.
// A dropped guard (a red run) could write the reserved slug; the case removes exactly that path after.
{
  const threw = (fn) => { try { fn(); return null; } catch (e) { return e; } };
  const names = (fn, ...needles) => {
    const e = threw(fn);
    if (e === null) return "did not throw";
    const missing = needles.filter((n) => !e.message.includes(n));
    return missing.length ? `threw "${e.message}", which does not name ${missing.map((n) => JSON.stringify(n)).join(" or ")}` : null;
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const keys = (o) => Object.keys(o).sort().join(",");

  const TMP = mkdtempSync(join(tmpdir(), "g30-discovery-"));
  const tmpRoot = (name) => { const d = join(TMP, name); mkdirSync(d, { recursive: true }); return d; };

  // 30.1 — turnEvent, all four branches, each with its exact key set asserted.
  const textIn = { type: "text", ts: "2026-01-01T00:00:00.000Z", turn: "t3", text: "That names a duration." };
  const opIn = {
    type: "op", ts: "2026-01-01T00:00:00.000Z", seq: 4, turn: "t3", op: "record_decision",
    params: { question_id: "s4-appetite", answer_ref: "a3", level: "business", parent_id: null, evidence_refs: [], wrong_if: "the team runs past it", off_script: false },
    closes: true, flagged: ["no-evidence"], supersedes: 2,
  };
  const deniedIn = { type: "denied", ts: "2026-01-01T00:00:00.000Z", turn: "t3", tool: "Write", input: { file_path: "x" }, error: "Write is not one of this run's op tools" };

  const textEv = turnEvent(textIn);
  ok(keys(textEv) === "text,truncated,turn,type" && textEv.turn === "t3" && textEv.text === textIn.text && textEv.truncated === false,
    `case 1: the text projection is ${JSON.stringify(textEv)}`);
  const opEv = turnEvent(opIn);
  ok(keys(opEv) === "answerRef,closes,flagged,op,questionId,seq,supersedes,turn,type"
    && opEv.seq === 4 && opEv.op === "record_decision" && opEv.closes === true
    && same(opEv.flagged, ["no-evidence"]) && opEv.supersedes === 2
    && opEv.questionId === "s4-appetite" && opEv.answerRef === "a3",
  `case 1: the op projection is ${JSON.stringify(opEv)}`);
  const denEv = turnEvent(deniedIn);
  ok(keys(denEv) === "error,tool,turn,type" && denEv.tool === "Write" && denEv.error === deniedIn.error,
    `case 1: the denied projection is ${JSON.stringify(denEv)}`);
  for (const junk of [{ type: "meta", turn: "t1", sessionId: "x", cwd: "/Users/someone" }, null, undefined, "text", 7, [], { type: "result" }])
    ok(turnEvent(junk) === null, `case 1: turnEvent(${JSON.stringify(junk)}) must be null — WHITELIST, never blacklist`);

  // 30.2 — THE case that decides whether the whitelist is a whitelist. A field added to the
  // transcript later must not start streaming by default, and the op's prose params (wrong_if,
  // missing, reason) must never reach the wire — the surface reads the package after the turn, and
  // streaming the prose would put a second, divergent copy on it.
  const textSmuggled = turnEvent({ ...textIn, secret: "SMUGGLED" });
  ok(!JSON.stringify(textSmuggled).includes("SMUGGLED"), `case 2: an unknown field on a text line reached the projection — ${JSON.stringify(textSmuggled)}`);
  const opSmuggled = turnEvent({ ...opIn, secret: "SMUGGLED", params: { ...opIn.params, secret: "SMUGGLED" } });
  ok(!JSON.stringify(opSmuggled).includes("SMUGGLED"), `case 2: an unknown field on an op line reached the projection — ${JSON.stringify(opSmuggled)}`);
  ok(!JSON.stringify(opSmuggled).includes("the team runs past it"), "case 2: params.wrong_if reached the wire — the prose belongs in the package, not on the stream");
  const weakSmuggled = turnEvent({ type: "op", seq: 1, turn: "t1", op: "flag_weak_answer", params: { question_id: "q", answer_ref: "a1", missing: ["SMUGGLED"] }, closes: true, flagged: [], supersedes: null });
  ok(!JSON.stringify(weakSmuggled).includes("SMUGGLED"), "case 2: params.missing reached the wire");

  // 30.3 — the cap. 4000, not stepEvent's 400: the agent's pushback prose IS what the person has to
  // read, so a 400-char cap would break the loop rather than bound a progress log.
  const long = turnEvent({ type: "text", turn: "t1", text: "x".repeat(9000) });
  ok(long.text.length === TURN_EVENT_TEXT_MAX && long.truncated === true, `case 3: a 9000-char line projected ${long.text.length} chars, truncated ${long.truncated}`);
  const short = turnEvent({ type: "text", turn: "t1", text: "y".repeat(800) });
  ok(short.text.length === 800 && short.truncated === false, `case 3: an 800-char line projected ${short.text.length} chars, truncated ${short.truncated}`);
  ok(turnEvent({ type: "denied", turn: "t1", tool: "Read", error: "z".repeat(9000) }).error.length === TURN_EVENT_TEXT_MAX, "case 3: the denied error is not capped");

  // 30.4 — TOOL_SCHEMA against the grammar BY NAME, both directions. This exists because spike 1's
  // pre-flight P1 compared by CARDINALITY (enum.length === 4, required.length === 3) and would have
  // passed four WRONG enum values — the deferred F5 finding on #284. Compared here by member.
  ok(same(Object.keys(TOOL_SCHEMA).sort(), [...DISCOVERY_OPS].sort()), `case 4: TOOL_SCHEMA names ${Object.keys(TOOL_SCHEMA).join(", ")}, OPS names ${DISCOVERY_OPS.join(", ")}`);
  for (const op of DISCOVERY_OPS) {
    ok(same(Object.keys(TOOL_SCHEMA[op]), DISCOVERY_PARAMS[op]),
      `case 4: TOOL_SCHEMA.${op} keys [${Object.keys(TOOL_SCHEMA[op]).join(", ")}] != PARAMS.${op} [${DISCOVERY_PARAMS[op].join(", ")}] in order — the transport builds the zod shape from this order and the advertised "required" comes out in it`);
    for (const [field, code] of Object.entries(TOOL_SCHEMA[op]))
      ok(Array.isArray(code) ? code.length > 0 : TOOL_TYPES.includes(code), `case 4: ${op}.${field} type code ${JSON.stringify(code)} is not in TOOL_TYPES (${TOOL_TYPES.join(", ")})`);
  }
  ok(same(TOOL_SCHEMA.record_decision.level, LEVELS), `case 4: record_decision.level enum [${TOOL_SCHEMA.record_decision.level}] != LEVELS [${LEVELS}] BY MEMBER`);
  ok(same(TOOL_SCHEMA.open_question.source, SOURCES), `case 4: open_question.source enum != SOURCES by member`);
  ok(same(TOOL_SCHEMA.file_evidence.provenance, PROVENANCE), `case 4: file_evidence.provenance enum != PROVENANCE by member`);

  // 30.5 — the tool names and the server name, pinned.
  ok(MCP_SERVER === "discovery", `case 5: MCP_SERVER is "${MCP_SERVER}"`);
  for (const op of DISCOVERY_OPS) ok(toolNameFor(op) === `mcp__discovery__${op}`, `case 5: toolNameFor(${op}) is "${toolNameFor(op)}"`);

  // 30.6 — the roots and the provenance branch (R1). The privacy refusal is DRIVEN by handing it a
  // root inside the repo, not asserted by construction: assertProvenanceRoot takes the root as an
  // argument precisely so this case can exist (JOBS_DIR is an import-time const this job cannot
  // repoint, so a version that re-derived the root internally would be the check that cannot fail).
  ok(resolveRunRoot({ provenance: "fictional", slug: "x" }) === join(ROOT, "discovery", "x"),
    `case 6: a fictional root resolves to ${resolveRunRoot({ provenance: "fictional", slug: "x" })}`);
  ok(resolveRunRoot({ provenance: "real", slug: "x" }).endsWith(join("_discovery", "x")),
    `case 6: a real root resolves to ${resolveRunRoot({ provenance: "real", slug: "x" })}, which does not end _discovery/x`);
  ok(names(() => assertProvenanceRoot("real", join(ROOT, "discovery", "x")), "public", join(ROOT, "discovery", "x")) === null,
    `case 6: a real run rooted inside the repo must throw naming the path and the reason — ${names(() => assertProvenanceRoot("real", join(ROOT, "discovery", "x")), "public")}`);
  ok(assertProvenanceRoot("fictional", join(ROOT, "discovery", "x")) === join(ROOT, "discovery", "x"), "case 6: a fictional run inside the repo is the normal case and must be accepted");
  ok(assertProvenanceRoot("real", join(TMP, "outside")) === join(TMP, "outside"), "case 6: a real run outside the repo must be accepted");
  ok(names(() => resolveRunRoot({ provenance: "nope", slug: "x" }), "fictional", "real") === null,
    `case 6: an unknown provenance must throw naming both — ${names(() => resolveRunRoot({ provenance: "nope", slug: "x" }), "fictional", "real")}`);
  for (const [label, arr] of [["PROVENANCES", PROVENANCES], ["ENTRY_MODES", ENTRY_MODES], ["FRONT_ENDS", FRONT_ENDS], ["TOOL_TYPES", TOOL_TYPES]]) {
    const n = arr.length;
    ok(Object.isFrozen(arr) && threw(() => arr.push("smuggled")) !== null && arr.length === n, `case 6: ${label} is not frozen — a push landed`);
  }

  // 30.7 — the slug guard. It names the run package directory, so it is a path guard.
  ok(assertDiscoverySlug("spine-meridian-1") === "spine-meridian-1", "case 7: a good slug must come back");
  for (const junk of ["", "A", "a/b", "../x", "a".repeat(49), "a b", "a_b", null, undefined, 7, {}]) {
    const e = threw(() => assertDiscoverySlug(junk));
    ok(e !== null && e.message.includes("run slug"), `case 7: assertRunSlug(${JSON.stringify(junk)}) must be refused naming the value — got ${e ? e.message : "no throw"}`);
  }

  // 30.8 — the ref allocator. Stable over a store whose refs are out of order, because it counts
  // lines rather than parsing the refs it finds.
  ok(nextRef([]) === "a1", `case 8: nextRef([]) is ${nextRef([])}`);
  ok(nextRef([{ ref: "a1" }, { ref: "a2" }]) === "a3", `case 8: nextRef over two is ${nextRef([{ ref: "a1" }, { ref: "a2" }])}`);
  ok(nextRef([{ ref: "a2" }, { ref: "a1" }]) === "a3", "case 8: nextRef must count lines, not read the refs");

  // 30.9 — the cursor, DERIVED from the record and never stored. Synthetic transcripts, written to a
  // temp root: a real package may only be written by a real session.
  const cursorRoot = tmpRoot("cursor");
  writeFileSync(join(cursorRoot, "run.json"), JSON.stringify({
    slug: "cursor", provenance: "fictional", label: "Real run — fictional scenario", entryMode: "blank-idea",
    depth: "scope-check", branch: null, frontEnd: "portal", model: "claude-sonnet-5", posture: "think",
    sessionId: null, startedAt: "2026-01-01T00:00:00.000Z", endedAt: null, root: "discovery/cursor", turnStats: [],
  }, null, 2));
  writeFileSync(join(cursorRoot, "answers.jsonl"), "");
  writeFileSync(join(cursorRoot, "transcript.jsonl"), "");
  const depthIds = selectDepth("scope-check").map((q) => q.id);
  const c0 = sessionView(cursorRoot).cursor;
  ok(c0.index === 0 && c0.question.id === depthIds[0] && c0.turn === "t1" && c0.total === depthIds.length && c0.done === false,
    `case 9: an empty transcript must sit at index 0 on ${depthIds[0]} — got ${JSON.stringify({ i: c0.index, q: c0.question?.id, t: c0.turn, done: c0.done })}`);
  appendTranscript(cursorRoot, textLine({ turn: "t1", text: "a text line must not move the cursor" }));
  ok(sessionView(cursorRoot).cursor.index === 0, "case 9: a text line moved the cursor");
  appendTranscript(cursorRoot, opLine({ record: { seq: 1, turn: "t1", op: "file_evidence", params: { url: "https://example.test", ref: null, name: null, provenance: "assumption", claim_ref: null }, closes: false, flagged: [], supersedes: null } }));
  ok(sessionView(cursorRoot).cursor.index === 0, "case 9: a NON-closing op moved the cursor — only closed turns advance it");
  appendTranscript(cursorRoot, deniedLine({ turn: "t1", tool: "Write", input: null, error: "refused", via: "PreToolUse" }));
  ok(sessionView(cursorRoot).cursor.index === 0, "case 9: a denied line moved the cursor");
  appendTranscript(cursorRoot, opLine({ record: { seq: 2, turn: "t1", op: "flag_weak_answer", params: { question_id: depthIds[0], answer_ref: "a1", missing: ["a number"] }, closes: true, flagged: [], supersedes: null } }));
  const c1 = sessionView(cursorRoot).cursor;
  ok(c1.index === 1 && c1.question.id === depthIds[1] && c1.turn === "t2", `case 9: one closing op must advance exactly one — got ${JSON.stringify({ i: c1.index, q: c1.question?.id, t: c1.turn })}`);
  for (let i = 2; i <= depthIds.length; i += 1)
    appendTranscript(cursorRoot, opLine({ record: { seq: i + 1, turn: `t${i}`, op: "flag_weak_answer", params: { question_id: depthIds[i - 1], answer_ref: "a1", missing: ["a number"] }, closes: true, flagged: [], supersedes: null } }));
  const cEnd = sessionView(cursorRoot).cursor;
  ok(cEnd.done === true && cEnd.question === null && cEnd.index === depthIds.length,
    `case 9: past the end must read done with a null question — got ${JSON.stringify({ i: cEnd.index, q: cEnd.question, done: cEnd.done })}`);

  // 30.10 — the three line constructors, against discovery/README.md's documented shapes, and the
  // applier's fields copied through UNCHANGED. The alias check matters because applyOps refuses an
  // item carrying seq/closes/flagged back in, and that refusal is the drift detector: an op line
  // that aliased the caller's record could be rewritten without a write.
  ok(keys(textLine({ turn: "t1", text: "x" })) === "text,ts,turn,type", `case 10: textLine keys are ${keys(textLine({ turn: "t1", text: "x" }))}`);
  ok(keys(deniedLine({ turn: "t1", tool: "Read", input: {}, error: "e", via: "PreToolUse" })) === "error,input,tool,ts,turn,type,via", `case 10: deniedLine keys are ${keys(deniedLine({ turn: "t1", tool: "Read", input: {}, error: "e", via: "PreToolUse" }))}`);
  // `via` is REQUIRED (#287): a denied line that does not say which site refused the call would make
  // the two-site design uncheckable from the record it exists to produce.
  ok(names(() => deniedLine({ turn: "t1", tool: "Read", input: {}, error: "e" }), "via") === null, "case 10: deniedLine without via must be refused naming via");
  for (const junk of ["nowhere", "pretooluse", "", null, 7]) ok(names(() => deniedLine({ turn: "t1", tool: "Read", input: {}, error: "e", via: junk }), "via") === null, `case 10: via ${JSON.stringify(junk)} must be refused naming via`);
  for (const site of ["PreToolUse", "canUseTool", "PostToolUseFailure"]) ok(deniedLine({ turn: "t1", tool: "Read", input: {}, error: "e", via: site }).via === site, `case 10: via ${site} must be accepted`);
  const rec = { seq: 7, turn: "t2", op: "record_decision", params: { question_id: "q", answer_ref: "a1", level: "business", parent_id: null, evidence_refs: [], wrong_if: "w", off_script: false }, closes: true, flagged: ["no-evidence"], supersedes: 3 };
  const line = opLine({ record: rec });
  ok(keys(line) === "closes,flagged,op,params,seq,supersedes,ts,turn,type", `case 10: opLine keys are ${keys(line)}`);
  ok(line.seq === 7 && line.closes === true && same(line.flagged, ["no-evidence"]) && line.supersedes === 3, "case 10: opLine altered the applier's fields");
  rec.seq = 999; rec.closes = false; rec.flagged.push("smuggled"); rec.supersedes = null;
  ok(line.seq === 7 && line.closes === true && line.supersedes === 3, `case 10: the op line ALIASES the record — mutating it after the call changed the line to seq ${line.seq}`);

  // 30.11 + 30.16 — the Think posture. The three strings are exported SEPARATELY so spike 2's
  // decision-rule branch 2 ("tighten the yield contract and re-run") is a one-line diff the gate
  // notices, rather than an edit buried in a template literal.
  ok(POSTURES.think && POSTURES.think.model === "claude-sonnet-5", `case 11: the Think posture's model is ${JSON.stringify(POSTURES.think?.model)}`);
  ok(POSTURES.think.id === "think" && typeof POSTURES.think.build === "function", "case 11: the Think posture must carry its id and its builder");
  // Think on Opus: the SAME prompt under claude-opus-5, so the two can be compared on one answer set.
  // The model string is the whole difference — no per-posture SDK option exists, and the key set is
  // pinned so one cannot appear without moving this gate: fingerprintOf hashes model + prompt surface +
  // tool descriptions and nothing else, so an option added beside `model` would never move a fixture's
  // stamp (the gap discovery-postures.mjs's header names).
  ok(POSTURES["think-opus"] && POSTURES["think-opus"].model === "claude-opus-5", `case 11: the Think-on-Opus posture's model is ${JSON.stringify(POSTURES["think-opus"]?.model)}`);
  ok(POSTURES["think-opus"].id === "think-opus" && POSTURES["think-opus"].build === POSTURES.think.build, "case 11: think-opus must build with the SAME buildThinkTurn as think — a different prompt would make the comparison a reading of two prompts");
  ok(POSTURES["think-opus"].fingerprint !== POSTURES.think.fingerprint && fingerprintOf(POSTURES["think-opus"]) === POSTURES["think-opus"].fingerprint, "case 11: think-opus's fingerprint must differ from think's (the model is hashed) and reproduce from the posture");
  for (const [k, p] of Object.entries(POSTURES)) {
    ok(p.id === k && same(Object.keys(p).sort(), ["build", "fingerprint", "id", "label", "model"]),
      `case 11: posture ${k} carries keys ${Object.keys(p).sort().join(",")} — a per-posture option sits OUTSIDE fingerprintOf's hash, so widen the hash (and this pin) or do not add it`);
    ok(!("maxThinkingTokens" in p) && !("thinking" in p), `case 11: posture ${k} carries a thinking budget — budget_tokens is removed on claude-opus-5 and the SDK's maxThinkingTokens is that shape`);
  }
  const q0 = questionById(depthIds[0]);
  const built = buildThinkTurn({ question: q0, answer: { ref: "a1", text: "Six weeks, one person." }, turn: "t1", ledger: [], provenance: "fictional" });
  ok(built.systemPrompt.includes(YIELD_CONTRACT), "case 16: YIELD_CONTRACT does not appear VERBATIM in the built system prompt — a tightening would then be invisible to this gate");
  ok(built.systemPrompt.includes(MVP6_LINE), "case 16: MVP6_LINE does not appear VERBATIM in the built system prompt");
  ok(built.systemPrompt.includes(LADDER_BRIEF), "case 16: LADDER_BRIEF does not appear VERBATIM in the built system prompt");
  ok(built.systemPrompt.includes(PARENT_RULE), "case 16: PARENT_RULE does not appear VERBATIM in the built system prompt — the #341 tightening would be invisible to this gate");
  ok(built.systemPrompt.includes(EVIDENCE_RULE), "case 16: EVIDENCE_RULE does not appear VERBATIM in the built system prompt — the #338 F6 trigger would be invisible to this gate");
  for (const [label, s] of [["YIELD_CONTRACT", YIELD_CONTRACT], ["MVP6_LINE", MVP6_LINE], ["LADDER_BRIEF", LADDER_BRIEF], ["PARENT_RULE", PARENT_RULE], ["EVIDENCE_RULE", EVIDENCE_RULE]])
    ok(typeof s === "string" && s.trim().length > 40, `case 16: ${label} is empty or a stub`);
  ok(/may not say the answer is wrong/i.test(MVP6_LINE) && /may not supply what is missing/i.test(MVP6_LINE),
    "case 11: MVP6_LINE must state BOTH halves — the agent may not say the answer is wrong AND may not supply what is missing");
  // An INSTRUCTION, not a permission: the rehearsal ran on "if no such decision exists yet, pass null"
  // and read it as standing permission (18 of 18 eligible decisions filed null).
  ok(/one rung above/i.test(PARENT_RULE) && /re-file/i.test(PARENT_RULE) && /null only when/i.test(PARENT_RULE),
    "case 16: PARENT_RULE must instruct (one rung above · re-file on refusal · null ONLY when nothing above) — a permission is what the rehearsal ran on");
  // The #338 F6 trigger. Over 30 substantive answers the rehearsal filed ZERO file_evidence ops with
  // every pure gate green: the applier accepted `ref` throughout and the vocabulary was listed, so
  // what was missing was the TRIGGER — nothing said an answer naming a document is a file_evidence
  // call. Asserted to NAME both routes (url and ref) and to forbid inventing one, so a rewrite that
  // dropped either half goes red rather than quietly re-opening the finding.
  ok(/file_evidence/.test(EVIDENCE_RULE) && /\bref\b/.test(EVIDENCE_RULE) && /\burl\b/.test(EVIDENCE_RULE),
    "case 16: EVIDENCE_RULE must name file_evidence and BOTH of its routes — a rule that names only url leaves a prose citation with nowhere to go");
  ok(/do not invent/i.test(EVIDENCE_RULE) && /before your closing op/i.test(EVIDENCE_RULE),
    "case 16: EVIDENCE_RULE must say the evidence op comes BEFORE the closing op and that an absent one is not invented — MVP 6 forbids supplying what is missing");
  // ORDER IS LOAD-BEARING, and this is the assertion that keeps it. PARENT_RULE is last in the system
  // prompt because the last instruction is the one a model is most likely to act on, and #341 bought
  // that tail with a paid recording; a later prompt string APPENDED rather than inserted would take
  // it away silently, and only a re-record would find out.
  ok(built.systemPrompt.indexOf(EVIDENCE_RULE) < built.systemPrompt.indexOf(PARENT_RULE),
    "case 16: EVIDENCE_RULE sits AFTER PARENT_RULE in the system prompt — that displaces the parent rule's recency tail, which #341 paid for");
  // #347 — EVIDENCE_RULE names the third source, `name`, so an artefact with an identity of its own
  // is a filing rather than a pointer at the sentence that mentioned it.
  ok(/\bname\b/.test(EVIDENCE_RULE) && /never with a url/i.test(EVIDENCE_RULE), "case 16: EVIDENCE_RULE must name `name` and say it rides beside a ref, never a url (#347)");
  // #347, the #338 F8 half — THE RUN'S PROVENANCE IS IN THE SYSTEM PROMPT. Keyed by run.json's two
  // values; each rendered ONLY for its own run; each names the label that is true in that run and
  // forbids the one that is not; and it sits BEFORE EVIDENCE_RULE, which it qualifies, so the parent
  // rule keeps its tail.
  ok(Object.isFrozen(PROVENANCE_RULE) && same(Object.keys(PROVENANCE_RULE).sort(), ["fictional", "real"]), `case 16: PROVENANCE_RULE is keyed ${Object.keys(PROVENANCE_RULE).join(",")} — it must be exactly run.json's two provenances`);
  for (const k of Object.keys(PROVENANCE_RULE)) ok(typeof PROVENANCE_RULE[k] === "string" && PROVENANCE_RULE[k].trim().length > 40, `case 16: PROVENANCE_RULE.${k} is empty or a stub`);
  ok(/fictional-scenario/.test(PROVENANCE_RULE.fictional) && /never "real-interview"/.test(PROVENANCE_RULE.fictional), "case 16: the fictional rule must name fictional-scenario as the true label and forbid real-interview");
  ok(/real-interview/.test(PROVENANCE_RULE.real) && /"fictional-scenario" is never true/.test(PROVENANCE_RULE.real), "case 16: the real rule must name real-interview as the true label and forbid fictional-scenario");
  ok(built.systemPrompt.includes(PROVENANCE_RULE.fictional) && !built.systemPrompt.includes(PROVENANCE_RULE.real), "case 16: a fictional build must carry the fictional rule VERBATIM and not the real one");
  {
    const realBuilt = buildThinkTurn({ question: q0, answer: { ref: "a1", text: "Six weeks, one person." }, turn: "t1", ledger: [], provenance: "real" });
    ok(realBuilt.systemPrompt.includes(PROVENANCE_RULE.real) && !realBuilt.systemPrompt.includes(PROVENANCE_RULE.fictional), "case 16: a real build must carry the real rule VERBATIM and not the fictional one");
    ok(realBuilt.prompt === built.prompt, "case 16: the provenance must live in the SYSTEM prompt only — the turn prompt changed with it");
  }
  ok(built.systemPrompt.indexOf(PROVENANCE_RULE.fictional) < built.systemPrompt.indexOf(EVIDENCE_RULE), "case 16: PROVENANCE_RULE must sit BEFORE EVIDENCE_RULE, which it qualifies — and never after PARENT_RULE");
  ok(built.prompt.includes("a1") && built.prompt.includes("Six weeks, one person.") && built.prompt.includes(q0.weakAnswer) && built.prompt.includes("t1"),
    "case 11: the prompt must carry the answer's ref, the answer text, the question's weak-answer note and the turn");
  ok(!built.systemPrompt.includes("undefined") && !built.prompt.includes("undefined"), "case 11: the built prompt contains \"undefined\"");
  // The ledger is REQUIRED ([] on turn 1): a caller that forgets it must fail loudly rather than
  // quietly regress to the rehearsal's behaviour, where parenting was a recollection (#341).
  for (const junk of [{}, { question: q0 }, { question: q0, answer: {}, turn: "t1", ledger: [] }, { question: null, answer: { ref: "a1", text: "x" }, turn: "t1", ledger: [] }, { question: q0, answer: { ref: "a1", text: "x" }, turn: "", ledger: [] },
    { question: q0, answer: { ref: "a1", text: "x" }, turn: "t1" }, { question: q0, answer: { ref: "a1", text: "x" }, turn: "t1", ledger: "x" },
    // #347 — a build with no provenance, or one off run.json's two, is a hole: the agent would not know which evidence label is true.
    { question: q0, answer: { ref: "a1", text: "x" }, turn: "t1", ledger: [] }, { question: q0, answer: { ref: "a1", text: "x" }, turn: "t1", ledger: [], provenance: "vibes" }])
    ok(threw(() => buildThinkTurn(junk)) !== null, `case 11: buildThinkTurn(${JSON.stringify(junk).slice(0, 60)}) must throw rather than build a prompt with a hole in it`);
  // The rubric never reaches the browser — a property of the wire, not a comment in a render
  // function. The posture reads it server-side through questionById, so nothing is lost.
  const served = JSON.stringify(discoveryConfig());
  ok(!served.includes(q0.weakAnswer), "case 11: the config route serves the weak-answer note — that is the agent's rubric and showing it beside the question would tell the person the answer");
  ok(!served.includes("weakAnswer"), "case 11: the config route serves a weakAnswer key at all");
  ok(discoveryConfig().questions.length === BANK.length && discoveryConfig().depths.length === Object.keys(DEPTHS).length,
    "case 11: the config route must serve the whole bank and every depth");
  ok(same(Object.keys(discoveryConfig()).sort(), ["depths", "entryModes", "frontEnds", "hasToken", "ops", "postures", "provenances", "questions"]),
    `case 11: discoveryConfig keys are ${Object.keys(discoveryConfig()).sort().join(",")}`);
  ok(!JSON.stringify(discoveryConfig().postures).includes("systemPrompt"), "case 11: the config route serves a posture's prompt body");

  // 30.17 — the ledger brief (#341): this run's decisions by rung and the parent candidates per rung,
  // in the TURN prompt and never the system prompt (the system prompt is byte-stable across a session
  // so its cache holds). The ledger is built through the REAL applier over the REAL bank, so the seqs
  // and levels the brief reads are the applier's. The recency line names parent_id LAST.
  {
    const empty = ledgerBrief([]);
    ok(empty.includes("none") && empty.includes("pass parent_id null"), `case 17: the empty-ledger brief is "${empty}" — it must say none and tell the agent to pass null`);
    const decision = (question_id, answer_ref, level, parent_id, turn) => ({ op: "record_decision", params: { question_id, answer_ref, level, parent_id, evidence_refs: [], wrong_if: `wrong if ${question_id}`, off_script: false }, turn });
    const briefCtx = { answers: [{ ref: "a1" }, { ref: "a2" }, { ref: "a3" }], bank: BANK };
    const three = applyDiscoveryOps([
      decision("s1-if-nobody-solves-this", "a1", "business", null, "t1"),
      decision("s5-pain-budget-same-person", "a2", "stakeholder", 1, "t2"),
      decision("s4-appetite", "a3", "solution", 2, "t3"),
    ], briefCtx).ops;
    const brief = ledgerBrief(three);
    for (const line of ["business: seq 1 (s1-if-nobody-solves-this)", "stakeholder: seq 2 (s5-pain-budget-same-person)", "solution: seq 3 (s4-appetite)", "transition: none",
      "filing at stakeholder → parent_id one of 1", "filing at solution → parent_id one of 2", "filing at transition → parent_id one of 3"])
      ok(brief.includes(line), `case 17: the three-rung brief lacks "${line}" — got:\n${brief}`);
    const two = three.slice(0, 2);
    ok(ledgerBrief(two).includes("filing at transition → parent_id null (no solution decision yet)"), `case 17: with no solution decision the transition line must say null and why — got:\n${ledgerBrief(two)}`);
    const withOff = applyDiscoveryOps([decision("s1-if-nobody-solves-this", "a1", "business", null, "t1"), decision(null, "a2", "stakeholder", 1, "t1")].map((d, i) => (i === 1 ? { ...d, params: { ...d.params, off_script: true } } : d)), briefCtx).ops;
    ok(ledgerBrief(withOff).includes("stakeholder: seq 2 (off-script)"), `case 17: an off-script decision must render as (off-script) — got:\n${ledgerBrief(withOff)}`);
    ok(threw(() => ledgerBrief(null)) !== null && threw(() => ledgerBrief("x")) !== null, "case 17: ledgerBrief over junk must throw");
    const builtWithLedger = buildThinkTurn({ question: q0, answer: { ref: "a4", text: "Two weeks." }, turn: "t4", ledger: three, provenance: "fictional" });
    ok(builtWithLedger.prompt.includes(brief), "case 17: the built turn prompt does not carry the brief VERBATIM");
    ok(!builtWithLedger.systemPrompt.includes("Decisions in this run"), "case 17: the brief reached the SYSTEM prompt — it changes every turn and would break the cache the system prompt exists to hold");
    ok(/take parent_id from the "Parent candidates" line/.test(builtWithLedger.prompt), "case 17: the closing line does not name parent_id");
    ok(builtWithLedger.prompt.indexOf('take parent_id from the "Parent candidates" line') > builtWithLedger.prompt.indexOf(brief), "case 17: the parent instruction must sit AFTER the brief — the last instruction is the one a model is most likely to act on");
    // The brief's candidate line and the applier's refusal read ONE function: the seq the brief
    // offers is the seq the applier accepts, and the seq it does not offer is refused naming the same.
    const envelope = (parent_id) => { const { op, params } = decision("s4-rabbit-holes", "a3", "transition", parent_id, "t4"); return { op, params }; };
    ok(threw(() => applyDiscoveryOp({ ops: three }, envelope(3), { ...briefCtx, turn: "t4" })) === null, "case 17: the brief offered seq 3 for a transition decision and the applier refused it");
    ok(names(() => applyDiscoveryOp({ ops: three }, envelope(2), { ...briefCtx, turn: "t4" }), "seq 3", "re-file") === null, `case 17: the refusal for a wrong-rung parent must name the seq the brief offers — ${names(() => applyDiscoveryOp({ ops: three }, envelope(2), { ...briefCtx, turn: "t4" }), "seq 3", "re-file")}`);
  }

  // 30.18 — TOOL_DESCRIPTIONS (#341): prompt text the agent reads at call time, so it lives with the
  // rest of the prompt text where this group can pin it and the fingerprint can cover it. Frozen by
  // mutation; keyed as OPS in order; record_decision's names where parent_id comes from.
  {
    ok(Object.isFrozen(TOOL_DESCRIPTIONS) && threw(() => { TOOL_DESCRIPTIONS.fifth = "x"; }) !== null && !("fifth" in TOOL_DESCRIPTIONS), "case 18: TOOL_DESCRIPTIONS is not frozen — a fifth description landed");
    ok(same(Object.keys(TOOL_DESCRIPTIONS), [...DISCOVERY_OPS]), `case 18: TOOL_DESCRIPTIONS is keyed ${Object.keys(TOOL_DESCRIPTIONS).join(", ")}, not OPS ${DISCOVERY_OPS.join(", ")} in order`);
    for (const op of DISCOVERY_OPS) {
      ok(typeof TOOL_DESCRIPTIONS[op] === "string" && TOOL_DESCRIPTIONS[op].trim().length > 40, `case 18: TOOL_DESCRIPTIONS.${op} is empty or a stub`);
      ok(!TOOL_DESCRIPTIONS[op].includes("undefined"), `case 18: TOOL_DESCRIPTIONS.${op} contains "undefined"`);
    }
    ok(/parent_id[^.]*one rung above/.test(TOOL_DESCRIPTIONS.record_decision) && /candidates/.test(TOOL_DESCRIPTIONS.record_decision) && /null only when/i.test(TOOL_DESCRIPTIONS.record_decision),
      "case 18: record_decision's description must say parent_id is the seq one rung above, taken from the candidate line, null only when it says none");
  }

  // 30.19 — the prompt-surface fingerprint (#341). Deterministic; MOVED by mutation of the model, the
  // system prompt and the turn template; computed over FIXED inputs the bank cannot touch. Group 32
  // compares the committed fixture's per-turn stamps to this hash, so this case is what decides
  // whether that compare can go red.
  {
    const fp = POSTURES.think.fingerprint;
    ok(/^[0-9a-f]{32}$/.test(fp), `case 19: the Think fingerprint is ${JSON.stringify(fp)}, not a 32-hex md5`);
    ok(fingerprintOf(POSTURES.think) === fp, "case 19: fingerprintOf over the posture does not reproduce its own stored fingerprint — not deterministic");
    ok(fingerprintOf({ ...POSTURES.think, model: "other-model" }) !== fp, "case 19: a different model did not move the fingerprint");
    ok(fingerprintOf({ model: POSTURES.think.model, build: (a) => { const b = buildThinkTurn(a); return { ...b, systemPrompt: `${b.systemPrompt} ` }; } }) !== fp, "case 19: one trailing space on the system prompt did not move the fingerprint");
    ok(fingerprintOf({ model: POSTURES.think.model, build: (a) => { const b = buildThinkTurn(a); return { ...b, prompt: b.prompt.replace("Parent candidates", "Parent options") }; } }) !== fp, "case 19: a reworded turn template did not move the fingerprint");
    // #347 — the provenance rule's text is INSIDE the hash: a build under the other provenance differs.
    ok(fingerprintOf({ model: POSTURES.think.model, build: (a) => buildThinkTurn({ ...a, provenance: "real" }) }) !== fp, "case 19: the provenance rule is outside the fingerprint — an edit to it would leave the fixture green");
    ok(FINGERPRINT_INPUTS.provenance === "fictional", `case 19: FINGERPRINT_INPUTS.provenance is ${JSON.stringify(FINGERPRINT_INPUTS.provenance)} — the fixed inputs must name the fixture's provenance`);
    // Fixed inputs, exported frozen: the hash is over exactly these, and a bank edit cannot reach it.
    ok(Object.isFrozen(FINGERPRINT_INPUTS) && Object.isFrozen(FINGERPRINT_INPUTS.question) && Object.isFrozen(FINGERPRINT_INPUTS.ledger) && Array.isArray(FINGERPRINT_INPUTS.ledger) && FINGERPRINT_INPUTS.ledger.length === 3,
      "case 19: FINGERPRINT_INPUTS must be a frozen question + answer + turn + three-rung ledger");
    ok(BANK.every((q) => q.id !== FINGERPRINT_INPUTS.question.id), `case 19: the fingerprint's question id "${FINGERPRINT_INPUTS.question.id}" is IN the bank — a bank edit could then move the hash`);
    const recomputed = createHash("md5").update([POSTURES.think.model, buildThinkTurn(FINGERPRINT_INPUTS).systemPrompt, buildThinkTurn(FINGERPRINT_INPUTS).prompt, JSON.stringify(TOOL_DESCRIPTIONS)].join("\n \n")).digest("hex");
    ok(recomputed === fp, `case 19: the fingerprint recomputed from FINGERPRINT_INPUTS is ${recomputed.slice(0, 8)}, the module's is ${fp.slice(0, 8)} — the hash is not over the inputs it exports`);
    const altered = { ...FINGERPRINT_INPUTS, question: { ...FINGERPRINT_INPUTS.question, text: "A DIFFERENT question text." } };
    ok(buildThinkTurn(altered).prompt !== buildThinkTurn(FINGERPRINT_INPUTS).prompt && fingerprintOf(POSTURES.think) === fp,
      "case 19: the fingerprint must be built from the FIXED inputs only — a build over altered inputs differs, and the module's hash does not follow it");
  }

  // 30.20 — THE PROVENANCE HAS NO DEFAULT (#338 F3). The drawer's select used to open on `fictional`,
  // which is the COMMITTING one: a real product's discovery session written into a public repo, with
  // nothing but the operator's attention between the two. There are two lines of defence and this case
  // drives both.
  //
  // The SERVER is the one that can be run here, so it goes first: an empty provenance is not in
  // PROVENANCES, so resolveRunRoot refuses it BY NAME and no browser drift can open a session on a
  // blank. That refusal is what makes the placeholder safe rather than decorative.
  //
  // The BROWSER half is a SOURCE PIN, because portal.js touches the DOM at module scope and cannot
  // be imported into a Node gate. A source pin is weak, so it carries both controls: the pattern must
  // match a planted string, and it must NOT match the pre-change shape — otherwise a green here would
  // mean only that the regex is unfalsifiable.
  {
    for (const junk of ["", null, undefined]) {
      const e = threw(() => resolveRunRoot({ provenance: junk, slug: "x" }));
      ok(e !== null && e.message.includes("fictional") && e.message.includes("real"),
        `case 20: resolveRunRoot with provenance ${JSON.stringify(junk)} must refuse naming both provenances, got ${JSON.stringify(e?.message)}`);
    }
    const js = readFileSync(join(ROOT, "portal/public/portal.js"), "utf8");
    const PLACEHOLDER = /<option value=""[^>]*>[^<]*<\/option>/;
    ok(PLACEHOLDER.test('<option value="" selected>Choose one</option>'), "case 20: placeholder positive control — the pattern must match a planted empty-valued option");
    ok(!PLACEHOLDER.test('c.provenances.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`)'), "case 20: placeholder NEGATIVE control — the pattern must not match the pre-change shape, or a green here means nothing");
    ok(PLACEHOLDER.test(js), "case 20: portal.js builds no empty-valued placeholder option — the provenance select would open on a real value again, and the committing one is first in PROVENANCES");
    // The placeholder must be FIRST in the list it builds, or the select still opens on a value.
    const listAt = js.indexOf("$('#discovery-provenance').innerHTML");
    ok(listAt !== -1, "case 20: the provenance select's option list is not where this pin expects — re-pin before trusting it");
    const list = js.slice(listAt, listAt + 400);
    ok(list.indexOf('value=""') !== -1 && list.indexOf('value=""') < list.indexOf("c.provenances"), `case 20: the placeholder does not precede the provenances map — the select would still open on ${PROVENANCES[0]}`);
    // And the Start handler refuses a blank BEFORE it POSTs, so the refusal is prose in the drawer
    // rather than a 500 from the server's guard.
    const openAt = js.indexOf("$('#discovery-open').addEventListener");
    const postAt = js.indexOf("'/api/discovery/session'", openAt);
    const guardAt = js.indexOf("if (!provenance)", openAt);
    ok(openAt !== -1 && postAt !== -1, "case 20: the Start handler is not where this pin expects — re-pin before trusting it");
    ok(guardAt !== -1 && guardAt < postAt, "case 20: the Start handler POSTs without refusing a blank provenance first — the operator would meet the server's throw instead of a sentence naming the consequence");
    // The note is THREE-way. A two-branch ternary renders the `real` note under the placeholder and
    // tells the operator their package is safe outside the repo before they have chosen anything.
    const noteAt = js.indexOf("$('#discovery-provenance-note').textContent");
    ok(noteAt !== -1, "case 20: the provenance note is not where this pin expects — re-pin before trusting it");
    const note = js.slice(noteAt, noteAt + 700);
    ok((note.match(/\?/g) || []).length >= 2 && note.includes("p === 'real'"), "case 20: the provenance note is not three-way — with the placeholder selected a two-branch ternary falls through to the `real` note, which is the opposite of true");
  }

  // 30.21 — THE BOOT STAMP (#338 F2). Run 0's Phase A found the portal serving code from before two
  // review rounds, for two days, discoverable only by reading `ps` start times against a git log.
  // BOOT_SHA must be read at MODULE SCOPE: Node caches modules at import, so an import-time read is
  // the commit the process actually loaded, while a per-request rev-parse reports the TREE's HEAD and
  // would call the stale process fresh — the same lie with a version number on it. Source-pinned
  // because a gate cannot observe another process's import time; isStale is pure and is run.
  {
    ok(isStale("aaa", "bbb") === true, "case 21: two different shas must read as stale");
    for (const [b, h] of [["aaa", "aaa"], [null, "bbb"], ["aaa", null], [null, null]])
      ok(isStale(b, h) === false, `case 21: isStale(${JSON.stringify(b)}, ${JSON.stringify(h)}) must be false — unknown is not stale, or a checkout with no git raises a false alarm every boot`);
    const vsrc = readFileSync(join(ROOT, "portal/lib/version.mjs"), "utf8");
    ok(/^export const BOOT_SHA = sha\(\);$/m.test(vsrc), "case 21: BOOT_SHA is not a module-scope call — read per request it reports the TREE's HEAD, and a stale process reads as fresh");
    ok(/^export const headSha = sha;$/m.test(vsrc), "case 21: headSha is not the re-reading function — with both shas frozen at import, `stale` can never be true");
    const ssrc = readFileSync(join(ROOT, "portal/server.mjs"), "utf8");
    ok(/bootSha: BOOT_SHA/.test(ssrc) && /stale: isStale\(BOOT_SHA, head\)/.test(ssrc), "case 21: /api/health does not carry bootSha and stale — the finding was that nothing surfaced it");
    // The PRD route (#338 F1) READS. writePrd is the projection's only writer and it must not be
    // reachable from HTTP: a request that could overwrite a package's prd.md would discard the hand
    // edits the projection's own refusal exists to protect.
    ok(/import \{ projectPrd, readPackage \}/.test(ssrc), "case 21: server.mjs does not import the fold's read half");
    // A REACH, not the word: the route's own comment states the invariant ("writePrd is deliberately
    // not imported here"), and a substring match would make this case unable to tell the statement
    // from the thing it forbids — the same trap case 12 and group 28.8 already document.
    ok(!/^\s*import\b[^\n]*\bwritePrd\b/m.test(ssrc) && !/\bwritePrd\s*\(/.test(ssrc),
      "case 21: server.mjs imports or calls writePrd — no HTTP request may write into a run package");
    const prdAt = ssrc.indexOf("'/api/discovery/prd'");
    ok(prdAt !== -1, "case 21: the PRD route is not where this pin expects — re-pin before trusting it");
    const prdRoute = ssrc.slice(prdAt, prdAt + 900);
    ok(prdRoute.includes("resolveRunRoot(") && prdRoute.includes("assertProvenanceRoot("), "case 21: the PRD route skips the provenance guard pair every other discovery route runs — a `real` root must be refused here the same way");
  }

  // 30.12 — the source pin. Mirrors the bank group's zero-import pin. Matched on IMPORT LINES rather
  // than the bare strings, because both modules NAME the SDK in their headers — that prose is the
  // invariant being stated, and a substring match would make this case unable to distinguish it
  // from the thing it forbids.
  const DOM_REACH = /\b(document|window)\s*[.[]|typeof\s+(document|window)\b/;
  for (const rel of ["portal/lib/discovery.mjs", "portal/lib/discovery-postures.mjs"]) {
    const src = readFileSync(join(ROOT, rel), "utf8");
    ok(!/^\s*import\b[^\n]*claude-agent-sdk/m.test(src), `case 12: ${rel} imports the Agent SDK statically — CI has no portal/node_modules and group 30 would not load at all`);
    ok(!/^\s*import\b[^\n]*['"]zod['"]/m.test(src), `case 12: ${rel} imports zod statically`);
    // A DOM REACH, not the word — group 28.8's idiom, and for the same reason: EVIDENCE_RULE's
    // trigger list legitimately says "a document, a spreadsheet, a thread" (#338 F6), and a bare
    // word match cannot tell that prose from the thing it forbids. Positive control first.
    ok(DOM_REACH.test("if (typeof document !== 'undefined') window.x = 1"), "case 12: DOM-reach positive control");
    ok(!DOM_REACH.test(src), `case 12: ${rel} REACHES for document or window — these are Node-only modules`);
    ok(!/^\s*import\b[^\n]*discovery-transport/m.test(src), `case 12: ${rel} imports the transport STATICALLY — it must be reached only by the lazy import inside runTurn, after every guard`);
  }
  ok(/await import\(['"]\.\/discovery-transport\.mjs['"]\)/.test(readFileSync(join(ROOT, "portal/lib/discovery.mjs"), "utf8")),
    "case 12: portal/lib/discovery.mjs no longer reaches the transport by a lazy import — the three-layer split is the whole architecture in one file boundary");
  // The transport, read as TEXT and never imported (it is the one SDK import): the ledger reaches the
  // prompt, the tool text has ONE copy (the pinned one), and the fingerprint stamp is read off the
  // posture rather than recomputed (#341). A transport that dropped the ledger would regress to the
  // rehearsal's behaviour with every pure gate green.
  {
    const transportSrc = readFileSync(join(ROOT, "portal/lib/discovery-transport.mjs"), "utf8");
    ok(/posture\.build\(\{[^)]*\bledger:\s*state\.current\.ops\b/.test(transportSrc), "case 12: discovery-transport.mjs does not pass ledger: state.current.ops to posture.build — the brief would be built over nothing and parenting is a recollection again");
    ok(/posture\.build\(\{[^)]*\bprovenance:\s*head\.provenance\b/.test(transportSrc), "case 12: discovery-transport.mjs does not pass provenance: head.provenance to posture.build — the agent would not know which run it is in (#347)");
    ok(!/^\s*const DESCRIPTIONS\b/m.test(transportSrc), "case 12: discovery-transport.mjs still carries its own DESCRIPTIONS — two copies of the tool text drift, and only the postures copy is pinned and fingerprinted");
    ok(/^\s*import\b[^\n]*\bTOOL_DESCRIPTIONS\b[^\n]*discovery-postures/m.test(transportSrc), "case 12: discovery-transport.mjs does not import TOOL_DESCRIPTIONS from discovery-postures.mjs");
    ok(/postureFingerprint:\s*posture\.fingerprint/.test(transportSrc), "case 12: the turnStats stamp is not read off the posture (postureFingerprint: posture.fingerprint) — recomputing it here would be a second record of one fact");
    // The read fence's WIRING (#287): one fence object, both call sites, the allow-set rebuilt from
    // run.json, and no inline copy of the name check left behind.
    ok(/canUseTool:\s*fenceCanUseTool\(root, turn, onLine, fence\)/.test(transportSrc) && /hooks:\s*fenceHooks\(root, turn, onLine, fence\)/.test(transportSrc), "case 12: the transport must hand ONE fence object to BOTH call sites (#287) — canUseTool: fenceCanUseTool(root, turn, onLine, fence) and hooks: fenceHooks(root, turn, onLine, fence)");
    ok(/allowSetFor\(\{ root, reads: head\.reads \?\? \[\] \}\)/.test(transportSrc), "case 12: the transport must rebuild the allow-set from run.json's reads (allowSetFor({ root, reads: head.reads ?? [] })) — a fence held only in memory would silently widen on resume");
    // Scoped to the RUN query's own options block, not the whole file — --probe-fence carries a second
    // `cwd: root` further down, so a file-wide regex would match while the real turn ran anywhere at
    // all (observed: pointing line 157 at REPO_DIR left the file-wide form green). `resume:
    // head.sessionId` is the positive control that the block matched IS the resume-per-turn one.
    const runQuery = /const q = query\(\{[\s\S]*?\n {2}\}\);/.exec(transportSrc)?.[0] ?? "";
    ok(/resume:\s*head\.sessionId/.test(runQuery), `case 12: the block matched for the cwd pin below is not the real turn's query — it must carry resume: head.sessionId (got ${runQuery.slice(0, 120)})`);
    ok(/cwd:\s*root\b/.test(runQuery), "case 12: the real turn's query must set cwd to the run root (cwd: root) — fenceDecision substitutes '.' for a path-less Grep/Glob and allowsPath resolves it against the ALLOW-SET root, so a cwd that is not the run root silently widens the fence to everything under it (#287, PR #354 review F2)");
    ok(/strictMcpConfig:\s*true/.test(runQuery), "case 12: the real turn's query must set strictMcpConfig: true (#352) — a fictional run's cwd sits inside this repo, one directory below .mcp.json's codebase-search server, and without the flag whether the CLI merges that file into the advertised surface is the SDK's call, not ours");
    ok(!/canUseTool:\s*async/.test(transportSrc) && !/^\s*import\b[^\n]*\ballowsToolName\b/m.test(transportSrc), "case 12: the transport still carries an inline canUseTool or imports allowsToolName — a second copy of the fence is a second fence");
    ok(/tools:\s*MAIN_TOOLS/.test(transportSrc) && /const MAIN_TOOLS = Object\.freeze\(\[\]\)/.test(transportSrc) && /mainTools:\s*MAIN_TOOLS/.test(transportSrc), "case 12: the query's tools and the fence's mainTools must be ONE record (MAIN_TOOLS, frozen at [] for real runs)");
  }

  // 30.13 — purity. A projection that aliased its input could be rewritten without a write.
  ok(same(turnEvent(opIn), turnEvent(opIn)), "case 13: turnEvent is not deterministic over the same line");
  const mutable = turnEvent(opIn);
  mutable.flagged.push("smuggled"); mutable.op = "changed";
  ok(same(opIn.flagged, ["no-evidence"]) && opIn.op === "record_decision", "case 13: mutating turnEvent's return changed the input line");

  // 30.14 — the fence predicate, exhaustively. Built by mapping OPS, so a renamed server fails and a
  // fifth verb passes with no edit here. The PREDICATE is proven here and the HOOK in case 20; the
  // WIRING — whether a deny from canUseTool or the PreToolUse hook actually blocks an MCP call — stays
  // unobserved. What the deny branch does block at run time is the CLI's subagent warmup (#343), not
  // "nothing", as this comment used to say. #287 owns the wiring.
  for (const op of DISCOVERY_OPS) ok(allowsToolName(toolNameFor(op)) === true, `case 14: ${toolNameFor(op)} must be allowed`);
  for (const junk of ["Write", "Edit", "Read", "Bash", "Grep", "Glob", "WebSearch", "WebFetch",
    "mcp__discovery__record_stub", "mcp__other__record_decision", "mcp__discovery__", "mcp__discovery__record_decision ",
    "", null, undefined, 7, {}, []])
    ok(allowsToolName(junk) === false, `case 14: allowsToolName(${JSON.stringify(junk)}) must be false`);

  // 30.26 — the fence HOOKS, run (#343, re-gated by #349; labelled 30.20 until #353 — it collided with the provenance case). The deny branch's one real caller is the
  // CLI's own subagent warmup: every start pre-warms the built-in Explore, Plan and Bash agents
  // (cli.js p$9), and Explore runs pwd / ls / find / Glob on the cwd. Those hit the fence and were
  // recorded as the agent's refusals. #343 bracketed them between SubagentStart and SubagentStop;
  // #349's paid observation (discovery/bracket-trace-1) showed the CLI delivers SubagentStart on the
  // session's CREATE turn only — 0 of 11 resumed turns — while SubagentStop arrives every time, so
  // under resume-per-turn the bracket was never open. Since then BOTH recording hooks are gated by the
  // tool NAME: under `tools: []` the main session is advertised mcp__ tools and nothing else, and a
  // warmup agent runs with mcpClients: [] and the built-ins, so an mcp__ name is the discovery agent's
  // and a built-in is the CLI's — no hook ordering involved. Driven against the real writer over a
  // temp root, hook by hook; the on-disk line count and the listener's count are the assertions. The
  // "built-in with no SubagentStart ever" line below was RED under the bracket (the #349 report has
  // the run) — the case the bracket gate could never fail, because it always fired the start first.
  {
    const fenceRoot = tmpRoot("fence");
    const heard = [];
    const hooks = fenceHooks(fenceRoot, "t2", (l) => heard.push(l));
    ok(keys(hooks) === "PostToolUseFailure,PreToolUse", `case 26: fenceHooks must register exactly PreToolUse and PostToolUseFailure — never PostToolUse, and no SubagentStart/SubagentStop bracket (got ${keys(hooks)})`);
    for (const ev of Object.keys(hooks)) ok(hooks[ev].length === 1 && typeof hooks[ev][0].hooks?.[0] === "function", `case 26: ${ev} must carry one matcher with one hook function`);
    const fire = (ev, input) => hooks[ev][0].hooks[0]({ session_id: "s1", transcript_path: join(fenceRoot, "s1.jsonl"), cwd: fenceRoot, hook_event_name: ev, ...input });
    const denied = (r) => r?.hookSpecificOutput?.hookEventName === "PreToolUse" && r.hookSpecificOutput.permissionDecision === "deny";
    const onDisk = () => readTranscript(fenceRoot);

    // The predicate the gate rests on, driven: an mcp__ name of ANY server is one the main session
    // could carry; a built-in never is. Junk is false, not a throw.
    for (const n of [toolNameFor("record_decision"), "mcp__other__record_decision", "mcp__x__y", "mcp__"]) ok(isMcpToolName(n) === true, `case 26: isMcpToolName(${JSON.stringify(n)}) must be true`);
    for (const n of ["Bash", "Glob", "Grep", "Read", "ListMcpResourcesTool", "ReadMcpResourceTool", "MCP__discovery__x", " mcp__discovery__x", "", null, undefined, 7, {}, []]) ok(isMcpToolName(n) === false, `case 26: isMcpToolName(${JSON.stringify(n)}) must be false`);

    // The main session's own out-of-fence call: an MCP tool the fence does not allow — denied AND
    // recorded, with denyReason's text. The positive control for everything below.
    const r1 = await fire("PreToolUse", { tool_name: "mcp__other__record_decision", tool_input: { answer_ref: "a1" }, tool_use_id: "u1" });
    ok(denied(r1) && r1.hookSpecificOutput.permissionDecisionReason === denyReason("mcp__other__record_decision"), "case 26: a main-session call on a foreign MCP tool must be denied with denyReason's text");
    ok(onDisk().length === 1 && onDisk()[0].type === "denied" && onDisk()[0].tool === "mcp__other__record_decision" && onDisk()[0].turn === "t2" && same(onDisk()[0].input, { answer_ref: "a1" }) && onDisk()[0].error === denyReason("mcp__other__record_decision") && heard.length === 1,
      `case 26: a main-session denial must record exactly one denied line and reach the listener once (disk ${onDisk().length}, heard ${heard.length})`);

    // The warmup as the CLI actually delivers it on a resumed turn: NO SubagentStart, built-ins
    // calling tools. Denied — the fence stays closed — and NOT recorded. Red under the bracket.
    const r2 = await fire("PreToolUse", { tool_name: "Bash", tool_input: { command: "pwd" }, tool_use_id: "u2" });
    const r3 = await fire("PreToolUse", { tool_name: "Glob", tool_input: { pattern: "**/*.md" }, tool_use_id: "u3" });
    // Bash by NAME; Glob is a path tool since #287 and, with no allow-set handed to these hooks, fails
    // closed for want of one — denied either way, the fence stays closed.
    ok(denied(r2) && denied(r3) && r2.hookSpecificOutput.permissionDecisionReason === denyReason("Bash") && /fail closed/.test(r3.hookSpecificOutput.permissionDecisionReason), "case 26: a built-in call outside the fence must STILL be denied — Bash by name, Glob for want of an allow-set (fail closed) — the fence stays closed");
    ok(onDisk().length === 1 && heard.length === 1, `case 26: a built-in denied with no SubagentStart ever delivered must record NO line — it is the CLI's warmup, and the CLI does not deliver SubagentStart on a resumed turn (disk ${onDisk().length}, heard ${heard.length})`);
    for (const t of ["Grep", "Read", "ListMcpResourcesTool", "ReadMcpResourceTool"])
      ok(denied(await fire("PreToolUse", { tool_name: t, tool_input: {}, tool_use_id: `u3-${t}` })) && onDisk().length === 1, `case 26: ${t} (one of the six built-ins the 79-line recording named) must be denied and unrecorded (disk ${onDisk().length})`);
    const r4 = await fire("PostToolUseFailure", { tool_name: "Bash", tool_input: { command: "ls -la" }, tool_use_id: "u2", error: "denied" });
    ok(same(r4, { continue: true }) && onDisk().length === 1, `case 26: a built-in PostToolUseFailure must record no line either (disk ${onDisk().length})`);
    // The agent's OWN refusal while a warmup is in flight (PR #344 review F1): an op-tool
    // PostToolUseFailure is the discovery agent's — a warmup agent never calls the private in-process
    // server — and must be kept, verbatim.
    const r4b = await fire("PostToolUseFailure", { tool_name: toolNameFor("record_decision"), tool_input: { answer_ref: "a1" }, tool_use_id: "u2b", error: "answer_ref a1 does not resolve" });
    ok(same(r4b, { continue: true }) && onDisk().length === 2 && onDisk()[1].tool === toolNameFor("record_decision") && same(onDisk()[1].input, { answer_ref: "a1" }) && onDisk()[1].error === "answer_ref a1 does not resolve" && heard.length === 2,
      `case 26: an applier refusal must be recorded VERBATIM on PostToolUseFailure whatever the warmup is doing (disk ${onDisk().length}, heard ${heard.length})`);
    // A non-op failure leaves no line either: cli.js fires this event from the tool's execution catch
    // only, never for a PreToolUse deny, and a non-op call never reaches execution — so such a line
    // could only ever be a duplicate or a stranger's.
    const r6b = await fire("PostToolUseFailure", { tool_name: "mcp__other__record_decision", tool_input: { answer_ref: "a9" }, tool_use_id: "u6b", error: "denied" });
    ok(same(r6b, { continue: true }) && onDisk().length === 2, `case 26: a non-op PostToolUseFailure must record nothing — the hook records op-tool refusals only (disk ${onDisk().length})`);

    // An in-fence call passes and records nothing.
    for (const op of DISCOVERY_OPS) ok(same(await fire("PreToolUse", { tool_name: toolNameFor(op), tool_input: {}, tool_use_id: "u7" }), { continue: true }), `case 26: ${toolNameFor(op)} must pass the hook`);
    ok(onDisk().length === 2, `case 26: an allowed call must record nothing (disk ${onDisk().length})`);

    // The bracket hooks are gone, not merely idle: a recording rule that leans on their delivery is
    // the defect #349 closed, and a registered-but-unused hook invites one back. A later main-session
    // denial is still recorded.
    ok(!("SubagentStart" in hooks) && !("SubagentStop" in hooks), "case 26: SubagentStart/SubagentStop must not be registered");
    ok(denied(await fire("PreToolUse", { tool_name: "mcp__other__x", tool_input: {}, tool_use_id: "u8" })) && onDisk().length === 3 && onDisk()[2].tool === "mcp__other__x",
      `case 26: a later main-session denial must still be recorded (disk ${onDisk().length})`);
  }

  // 30.22 — THE FENCE TRACE (#349). The instrument that bought the observation above, and that the
  // verify criterion needs again on every future re-observation: a recorded run with ZERO built-in
  // denied lines proves nothing if the warmup happened to be quiet, so the trace shows the denials
  // that were NOT recorded. Off by default, harmless when its own write fails, and never a fourth
  // line type in the transcript.
  {
    const traceRoot = tmpRoot("trace");
    const tracePath = join(TMP, "fence-trace.jsonl");
    const before = process.env.DISCOVERY_FENCE_TRACE;
    const arm = (v) => { if (v === null) delete process.env.DISCOVERY_FENCE_TRACE; else process.env.DISCOVERY_FENCE_TRACE = v; };
    const bash = { tool_name: "Bash", tool_input: { command: "pwd" } };
    const foreign = { tool_name: "mcp__other__x", tool_input: {} };
    const drive = async (hooks, evs) => { for (const [ev, input] of evs) await hooks[ev][0].hooks[0]({ session_id: "s1", hook_event_name: ev, ...input }); };
    const lines = () => (existsSync(tracePath) ? readFileSync(tracePath, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);

    // OFF by default. An instrument that writes when nobody armed it is a new artifact in every run.
    arm(null);
    await drive(fenceHooks(traceRoot, "t1", () => {}), [["PreToolUse", bash], ["PreToolUse", foreign]]);
    ok(!existsSync(tracePath), "case 22: DISCOVERY_FENCE_TRACE unset must write no trace file — the instrument is off by default");
    // The path assertion above cannot see a fallback to some OTHER path, so the run root is listed
    // too: the regression that matters is an unarmed instrument defaulting into the package.
    ok(same(readdirSync(traceRoot), ["transcript.jsonl"]),
      `case 22: an unarmed turn left something other than transcript.jsonl in the run root (${readdirSync(traceRoot).join(", ")}) — the instrument must never default into the package`);

    // ARMED: every denial traced with its tool and whether it was recorded; an allowed call is not.
    arm(tracePath);
    await drive(fenceHooks(traceRoot, "t2", () => {}), [["PreToolUse", bash], ["PreToolUse", foreign], ["PreToolUse", { tool_name: toolNameFor("record_decision"), tool_input: {} }]]);
    const t = lines();
    const at = (i) => t[i] ?? {};
    ok(t.length === 2, `case 22: two denials and one allowed call must write exactly two trace lines (got ${t.length})`);
    ok(keys(at(0)) === "event,recorded,tool,ts,turn", `case 22: a trace line must carry event, tool, recorded, ts and turn (got ${keys(at(0))})`);
    ok(at(0).event === "PreToolUse.deny" && at(0).tool === "Bash" && at(0).recorded === false && at(0).turn === "t2", "case 22: a built-in's denial must trace recorded false — the line that shows the warmup called tools");
    ok(at(1).event === "PreToolUse.deny" && at(1).tool === "mcp__other__x" && at(1).recorded === true, "case 22: a foreign MCP tool's denial must trace recorded true");

    // ARMED, WITH AN ALLOW-SET (#287, PR #354 review F1). The read fence admits an in-root Read/Grep/
    // Glob, so a deny-only trace goes blind for exactly the warmup calls the instrument exists to catch
    // — bracket-trace-1's committed trace holds three of them, Globs on the cwd, which under a
    // deny-only rule would leave no line at all. Every decision on a tool that is NOT this run's own op
    // vocabulary must land, ALLOW as well as deny; the op calls themselves must not, or a normal run
    // buries the warmup. Nothing above this point can reach the allow branch — the earlier drives carry
    // no allow-set, so every path tool fails closed there.
    const allowPath = join(TMP, "fence-trace-allow.jsonl");
    const allowedRoot = tmpRoot("trace-allowed");
    arm(allowPath);
    await drive(fenceHooks(allowedRoot, "t3", () => {}, { allowSet: allowSetFor({ root: allowedRoot, reads: [] }), mainTools: [] }), [
      ["PreToolUse", { tool_name: "Read", tool_input: { file_path: join(allowedRoot, "answers.jsonl") } }],
      ["PreToolUse", { tool_name: "Glob", tool_input: { pattern: "**/*" } }],
      ["PreToolUse", { tool_name: toolNameFor("record_decision"), tool_input: {} }],
      ["PreToolUse", bash],
    ]);
    const a = existsSync(allowPath) ? readFileSync(allowPath, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    const seen = a.map((l) => `${l.event} ${l.tool}`);
    ok(same(seen, ["PreToolUse.allow Read", "PreToolUse.allow Glob", "PreToolUse.deny Bash"]),
      `case 22: two ALLOWED in-root built-ins and one denial must trace three lines naming each decision and its tool — an allowed read leaves no other evidence it ran (got ${JSON.stringify(seen)})`);
    ok(a.length === 3 && a.every((l) => keys(l) === "event,recorded,tool,ts,turn" && l.turn === "t3") && a[0]?.recorded === false && a[1]?.recorded === false,
      `case 22: an allow line must carry the same five keys with recorded false — nothing was written to the transcript (got ${JSON.stringify(a)})`);
    ok(!seen.some((l) => l.includes("mcp__")), "case 22: an op tool must NOT be traced, allowed or not — the agent's own calls are transcript.jsonl's job and would bury the warmup");
    ok(readTranscript(allowedRoot).length === 0, "case 22: an allowed call and an unrecorded built-in denial must leave transcript.jsonl empty — the trace is the only evidence either happened");
    arm(tracePath);

    // The trace is NOT a transcript line: transcript.jsonl has three typed shapes and the SSE
    // whitelist is asserted by mutation (case 2). Everything written above is `denied` and nothing else.
    ok(readTranscript(traceRoot).every((l) => l.type === "denied"), "case 22: the fence trace must never reach transcript.jsonl");

    // A broken instrument must not break the recording: an unwritable path still denies and records.
    rmSync(tracePath, { force: true });
    arm(traceRoot);
    const heardBroken = [];
    const broken = fenceHooks(traceRoot, "t4", (l) => heardBroken.push(l));
    let res = null, escaped = null;
    try { res = await broken.PreToolUse[0].hooks[0]({ session_id: "s1", hook_event_name: "PreToolUse", ...foreign }); }
    catch (e) { escaped = e.message; }
    ok(escaped === null, `case 22: a trace write that threw ESCAPED the hook (${escaped}) — a thrown hook can interrupt the agent, so the instrument must swallow its own failure`);
    ok(res?.hookSpecificOutput?.permissionDecision === "deny" && heardBroken.length === 1,
      "case 22: a trace write that throws must leave the denial and its recorded line intact — an observation may not disturb what it observes");
    arm(before ?? null);
  }

  // 30.23 — THE READ FENCE's predicate (#287): allowSetFor + allowsPath, driven over the two run
  // shapes the ticket names. PURE — no fs — so the roots are invented paths; what is asserted is the
  // arithmetic of "equal to an entry or under one (entry + sep)", resolved against the run root.
  {
    const JOBS = "/jobs";
    const run1 = allowSetFor({ root: `${JOBS}/_discovery/run-1`, reads: [] });
    const FIX = "docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md";
    const run2 = allowSetFor({ root: join(ROOT, "discovery", "run-2"), reads: [FIX] });
    const allow = (set, p) => allowsPath(set, p).allow === true;
    const deny = (set, p) => { const d = allowsPath(set, p); return d.allow === false && typeof d.reason === "string" && d.reason.length > 0; };
    // The shape of the set: the root first, the bank second, then reads resolved against the repo.
    ok(same(run1.paths, [`${JOBS}/_discovery/run-1`, BANK_PATH]) && run1.root === `${JOBS}/_discovery/run-1`, `case 23: run 1's allow-set is ${JSON.stringify(run1)}`);
    ok(same(run2.paths, [join(ROOT, "discovery", "run-2"), BANK_PATH, join(ROOT, FIX)]), `case 23: run 2's allow-set is ${JSON.stringify(run2.paths)}`);
    ok(BANK_PATH === join(ROOT, "discovery", "bank.mjs"), `case 23: BANK_PATH is ${BANK_PATH}`);
    ok(Object.isFrozen(run1) && Object.isFrozen(run1.paths), "case 23: the allow-set must be frozen at both levels");
    // Run 1's shape: its package and the bank allowed; the two scoring keys under JOBS_DIR denied.
    ok(allow(run1, `${JOBS}/_discovery/run-1/answers.jsonl`), "case 23: run 1 must read its own package");
    ok(allow(run1, "answers.jsonl") && allow(run1, "./transcript.jsonl"), "case 23: a relative path resolves against the run root");
    ok(allow(run1, BANK_PATH), "case 23: run 1 must read the bank");
    ok(deny(run1, `${JOBS}/_portfolio/decisions.json`), "case 23: run 1 must NOT read _portfolio/decisions.json — the run-1 key");
    ok(deny(run1, `${JOBS}/_portfolio/pre-registration.sealed.md`), "case 23: run 1 must NOT read the sealed pre-registration");
    ok(deny(run1, `${JOBS}/_discovery/run-2/answers.jsonl`), "case 23: run 1 must NOT read another run's package");
    ok(deny(run1, `${JOBS}/_discovery/run-1-evil/x`), "case 23: `<root>-evil/x` is not under `<root>` — the entry + sep rule");
    ok(deny(run1, `${JOBS}/_discovery`), "case 23: the run root's PARENT is not under the root");
    ok(deny(run1, "../x") && deny(run1, `${JOBS}/_discovery/run-1/../run-2/x`), "case 23: `..` is normalised before the compare, so a traversal out of the root is denied");
    // Run 2's shape: the fixture allowed; the PRD one directory above it — the run-2 key — denied,
    // and so is everything else beside the fixture.
    ok(allow(run2, join(ROOT, FIX)), "case 23: run 2 must read its fixture");
    // A RELATIVE path resolves against the run root — the cwd the SDK's Read resolves against — never
    // the repo: the repo-relative spelling of the fixture lands UNDER the package and is allowed for
    // that reason alone, which is why `reads` is resolved against REPO_DIR at build time instead.
    ok(allowsPath(run2, FIX).allow === true && allowsPath(run2, FIX).reason.includes(join(ROOT, "discovery", "run-2", FIX)), "case 23: a relative path resolves against the run root, not the repo");
    ok(deny(run2, join(ROOT, "docs/epics/discovery-partner.prd.md")), "case 23: run 2 must NOT read docs/epics/discovery-partner.prd.md — the findings list, one directory above the fixture");
    ok(deny(run2, join(ROOT, "docs/epics/fixtures")) && deny(run2, join(ROOT, "docs/epics/fixtures/other.md")), "case 23: a fixture entry admits that FILE, not its directory or its siblings");
    ok(deny(run2, join(ROOT, "discovery/run-2", "..", "..", "docs/epics/discovery-partner.prd.md")), "case 23: run 2's key reached through `..` from the root is still denied");
    ok(allow(run2, join(ROOT, "discovery/run-2/transcript.jsonl")) && allow(run2, BANK_PATH), "case 23: run 2 reads its package and the bank");
    ok(deny(run2, join(ROOT, "discovery/bank.mjs.bak")) && deny(run2, join(ROOT, "discovery/ops.mjs")), "case 23: the bank entry admits bank.mjs and nothing beside it");
    // The reason names the path and, on a denial, the set — the transcript's `denied` line is the
    // auditable record and "denied" alone would not say what was asked for.
    const d = allowsPath(run2, join(ROOT, "docs/epics/discovery-partner.prd.md"));
    ok(d.reason.includes(join(ROOT, "docs/epics/discovery-partner.prd.md")) && d.reason.includes(join(ROOT, FIX)), `case 23: a denial must name the path and the allow-set — "${d.reason.slice(0, 120)}"`);
    ok(allowsPath(run2, join(ROOT, FIX)).reason.includes(join(ROOT, FIX)), "case 23: an allow names the resolved path");
    // Junk denies, never throws — the predicate's own fail-closed. Every junk path against a real set,
    // then every junk set against a real path.
    for (const junk of ["", " ", null, undefined, 7, {}, [], true])
      ok(threw(() => allowsPath(run1, junk)) === null && deny(run1, junk) && /fail closed/.test(allowsPath(run1, junk).reason), `case 23: allowsPath(set, ${JSON.stringify(junk)}) must deny with "fail closed", not throw`);
    for (const junk of [null, undefined, {}, [], "x", 7, { root: "/x" }, { paths: ["/x"] }, { root: "/x", paths: [] }, { root: "relative", paths: ["/x"] }, { root: "/x", paths: "not-an-array" }])
      ok(threw(() => allowsPath(junk, "/x/y")) === null && deny(junk, "/x/y") && /fail closed/.test(allowsPath(junk, "/x/y").reason), `case 23: allowsPath(${JSON.stringify(junk)}, path) must deny with "fail closed", not throw`);
    // allowSetFor REFUSES by name — it runs at session start, before anything is written (case 16).
    ok(names(() => allowSetFor({ root: "discovery/x", reads: [] }), "absolute") === null, "case 23: a relative root must be refused naming absolute");
    for (const junk of ["x", null, [""], ["  "], [7], [null], [{}]])
      ok(names(() => allowSetFor({ root: "/x", reads: junk }), "reads") === null, `case 23: reads ${JSON.stringify(junk)} must be refused naming reads`);
    ok(threw(() => allowSetFor()) !== null && threw(() => allowSetFor({})) !== null, "case 23: allowSetFor with no root must throw");
    // Purity: two calls, one answer; the caller's array untouched.
    const reads = [FIX];
    const twice = [allowSetFor({ root: "/x", reads }), allowSetFor({ root: "/x", reads })];
    ok(same(twice[0], twice[1]) && same(reads, [FIX]), "case 23: allowSetFor must be deterministic and must not touch its input");
    ok(same(allowsPath(run2, FIX), allowsPath(run2, FIX)), "case 23: allowsPath must be deterministic");
  }

  // 30.24 — fenceDecision, the ONE decision both sites call (#287). Op tools by name under ANY
  // allow-set; path tools by allowsPath over READ_TOOLS' field; everything else by name, whatever
  // path it carries. WebSearch / WebFetch are proven independent of the allow-set — the assertion
  // that keeps MVP 7's look-it-up path out of reach of a later path tightening (AC #5).
  {
    const set = allowSetFor({ root: "/x/run", reads: ["docs/f.md"] });
    const EVERYTHING = allowSetFor({ root: "/", reads: [] });   // the whole filesystem is "under /"
    const EMPTY = { root: "/x/run", paths: [] };               // fails closed for every path
    for (const op of DISCOVERY_OPS) for (const s of [set, null, EMPTY]) ok(fenceDecision(s, toolNameFor(op), {}).allow === true, `case 24: ${toolNameFor(op)} must pass under ${JSON.stringify(s)}`);
    ok(same(Object.keys(READ_TOOLS).sort(), ["Glob", "Grep", "Read"]) && Object.isFrozen(READ_TOOLS), `case 24: READ_TOOLS names ${Object.keys(READ_TOOLS).join(",")} — adding a path tool here widens the path allow-list's reach, and WebFetch must never be one`);
    ok(READ_TOOLS.Read === "file_path" && READ_TOOLS.Grep === "path" && READ_TOOLS.Glob === "path", "case 24: READ_TOOLS' fields are the SDK's input names");
    ok(fenceDecision(set, "Read", { file_path: "/x/run/answers.jsonl" }).allow === true, "case 24: Read inside the root passes");
    ok(fenceDecision(set, "Read", { file_path: join(ROOT, "docs/f.md") }).allow === true, "case 24: Read of a reads entry passes");
    ok(fenceDecision(set, "Read", { file_path: "/x/other" }).allow === false, "case 24: Read outside the set is denied");
    ok(fenceDecision(set, "Read", {}).allow === false && /fail closed/.test(fenceDecision(set, "Read", {}).reason), "case 24: Read with no file_path is denied, fail closed");
    ok(fenceDecision(set, "Read", null).allow === false && fenceDecision(set, "Read", "junk").allow === false, "case 24: Read with junk input is denied");
    ok(fenceDecision(set, "Grep", { pattern: "x" }).allow === true && fenceDecision(set, "Glob", { pattern: "**/*" }).allow === true, "case 24: Grep and Glob with no path search the cwd, which is the root — allowed");
    ok(fenceDecision(set, "Grep", { pattern: "x", path: "/x" }).allow === false && fenceDecision(set, "Glob", { pattern: "*", path: "/x/other" }).allow === false, "case 24: Grep and Glob with a path outside the set are denied");
    ok(fenceDecision(set, "Glob", { pattern: "*", path: "sub" }).allow === true, "case 24: a relative Glob path resolves against the root");
    // No write tools, whatever path they carry — carried from the spine, re-asserted here (AC #6).
    for (const t of ["Write", "Edit", "MultiEdit", "NotebookEdit", "Bash"]) {
      const dd = fenceDecision(EVERYTHING, t, { file_path: "/x/run/answers.jsonl", command: "cat /x/run/answers.jsonl" });
      ok(dd.allow === false && dd.reason === denyReason(t), `case 24: ${t} must be denied BY NAME even under an allow-everything set and an in-root path (got ${JSON.stringify(dd)})`);
    }
    // WebSearch / WebFetch: not path tools; the decision is the SAME under an empty set, a real one,
    // the whole filesystem and no set at all, and it is the NAME gate's text — never allowsPath's. A
    // later tightening that put either in READ_TOOLS, or routed the web tools through allowsPath,
    // fails here by name.
    for (const t of ["WebSearch", "WebFetch"]) {
      ok(!Object.hasOwn(READ_TOOLS, t), `case 24: ${t} must not be a path tool`);
      const input = { query: "x", url: "https://example.test/x", prompt: "y" };
      const under = [EMPTY, set, EVERYTHING, null].map((s) => fenceDecision(s, t, input));
      ok(under.every((dd) => same(dd, under[0])), `case 24: ${t}'s decision must not depend on the allow-set (got ${under.map((dd) => dd.allow).join(",")})`);
      ok(under.every((dd) => dd.reason === denyReason(t) && !/fail closed|outside|\//.test(dd.reason)), `case 24: ${t} must be decided by NAME, never by the path allow-list (got "${under[0].reason.slice(0, 80)}")`);
    }
    // Junk tool names deny by name and never throw.
    for (const junk of ["", null, undefined, 7, {}, [], "read", "READ", " Read", "mcp__other__x"]) ok(threw(() => fenceDecision(set, junk, {})) === null && fenceDecision(set, junk, {}).allow === false, `case 24: fenceDecision(set, ${JSON.stringify(junk)}) must deny, not throw`);
    // The RAW predicate throws on a hostile set — so case 25's try/catch is proven to be doing the
    // catching, rather than nothing having thrown.
    const hostile = { root: "/x/run", get paths() { throw new Error("hostile allow-set"); } };
    ok(threw(() => fenceDecision(hostile, "Read", { file_path: "/x/run/a" }))?.message === "hostile allow-set", "case 24: the raw fenceDecision must THROW on a hostile allow-set (positive control for case 25's fail-closed)");
    ok(threw(() => fenceDecision(hostile, toolNameFor("record_decision"), {})) === null, "case 24: an op tool never reaches the allow-set");
  }

  // 30.25 — THE TWO CALL SITES (#287): fenceHooks' PreToolUse and fenceCanUseTool, driven over a temp
  // root with the SAME fence object the transport builds, and compared to each other on every input.
  // Each records a `denied` line naming ITSELF in `via`; each denies on a throw; each still passes an
  // op tool with no allow-set at all. What this case cannot reach — whether the SDK actually stops a
  // call either site denied, and whether the CLI consults canUseTool for a read at all — is the fence
  // probe's (discovery-transport.mjs --probe-fence), which observes each site holding ALONE.
  {
    const siteRoot = tmpRoot("sites");
    const OUT = "/x/outside/key.md";
    const IN = join(siteRoot, "answers.jsonl");
    const fence = { allowSet: allowSetFor({ root: siteRoot, reads: [] }), mainTools: ["Read"] };
    const heard = [];
    const hooks = fenceHooks(siteRoot, "t3", (l) => heard.push(l), fence);
    const pre = (input) => hooks.PreToolUse[0].hooks[0]({ session_id: "s1", transcript_path: join(siteRoot, "s1.jsonl"), cwd: siteRoot, hook_event_name: "PreToolUse", tool_use_id: "u1", ...input });
    const can = fenceCanUseTool(siteRoot, "t3", (l) => heard.push(l), fence);
    const onDisk = () => readTranscript(siteRoot);
    const denied = (r) => r?.hookSpecificOutput?.hookEventName === "PreToolUse" && r.hookSpecificOutput.permissionDecision === "deny";

    // Site 1, the hook: Read outside → denied AND recorded, via PreToolUse, the path kept in input.
    const h1 = await pre({ tool_name: "Read", tool_input: { file_path: OUT } });
    ok(denied(h1) && /outside this run's read allow-set/.test(h1.hookSpecificOutput.permissionDecisionReason), `case 25: the hook must deny a Read outside the set with allowsPath's reason (got ${JSON.stringify(h1)})`);
    ok(onDisk().length === 1 && onDisk()[0].type === "denied" && onDisk()[0].via === "PreToolUse" && onDisk()[0].tool === "Read" && onDisk()[0].input?.file_path === OUT && onDisk()[0].turn === "t3" && onDisk()[0].error === h1.hookSpecificOutput.permissionDecisionReason && heard.length === 1,
      `case 25: the hook's denial must be ONE denied line via PreToolUse carrying the path and the reason the SDK was given (disk ${JSON.stringify(onDisk())})`);
    ok(same(await pre({ tool_name: "Read", tool_input: { file_path: IN } }), { continue: true }) && onDisk().length === 1, "case 25: the hook must pass a Read inside the root and record nothing");
    ok(denied(await pre({ tool_name: "Bash", tool_input: { command: `cat ${OUT}` } })) && onDisk().length === 1, "case 25: the hook still denies Bash by name and still does not record it (the warmup rule)");
    // Site 2, canUseTool: the same battery, the SDK's PermissionResult shape, via canUseTool.
    const c1 = await can("Read", { file_path: OUT });
    ok(c1.behavior === "deny" && /outside this run's read allow-set/.test(c1.message) && onDisk().length === 2 && onDisk()[1].via === "canUseTool" && onDisk()[1].tool === "Read" && onDisk()[1].input?.file_path === OUT && onDisk()[1].error === c1.message && heard.length === 2,
      `case 25: canUseTool must deny a Read outside the set and record ONE denied line via canUseTool with the same reason (got ${JSON.stringify(c1)}, disk ${onDisk().length})`);
    const allowIn = { file_path: IN };
    const c2 = await can("Read", allowIn);
    ok(c2.behavior === "allow" && c2.updatedInput === allowIn && onDisk().length === 2, "case 25: canUseTool must allow a Read inside the root, hand the input back UNCHANGED (same object) and record nothing");
    const c3 = await can("Bash", { command: "pwd" });
    ok(c3.behavior === "deny" && c3.message === denyReason("Bash") && onDisk().length === 2, "case 25: canUseTool denies Bash by name, unrecorded");
    for (const op of DISCOVERY_OPS) ok((await can(toolNameFor(op), { a: 1 })).behavior === "allow", `case 25: canUseTool must allow ${toolNameFor(op)}`);
    // ONE predicate: on every input in the battery the two sites decide the same way, for the same reason.
    const battery = [["Read", { file_path: OUT }], ["Read", { file_path: IN }], ["Read", {}], ["Glob", { pattern: "*" }], ["Glob", { pattern: "*", path: "/x" }], ["Grep", { pattern: "k", path: OUT }], ["Write", { file_path: IN }], ["Bash", { command: "ls" }], ["WebFetch", { url: "https://e.test" }], [toolNameFor("file_evidence"), {}], ["mcp__other__x", {}], [undefined, {}]];
    for (const [t, i] of battery) {
      const viaHook = await pre({ tool_name: t, tool_input: i });
      const viaCan = await can(t, i);
      const hookAllows = !denied(viaHook);
      ok(hookAllows === (viaCan.behavior === "allow"), `case 25: the two sites disagree on ${JSON.stringify(t)} ${JSON.stringify(i)} — hook ${hookAllows ? "allows" : "denies"}, canUseTool ${viaCan.behavior}`);
      if (!hookAllows) ok(viaHook.hookSpecificOutput.permissionDecisionReason === viaCan.message, `case 25: the two sites give different reasons for ${JSON.stringify(t)}`);
    }
    // mainTools: []: the same Read denial is DENIED but not recorded — #349's warmup attribution,
    // unchanged for every real run today. An mcp__ denial is still recorded.
    const quietRoot = tmpRoot("sites-quiet");
    const quietHeard = [];
    const quietOpts = { allowSet: allowSetFor({ root: quietRoot }), mainTools: [] };
    const quiet = fenceHooks(quietRoot, "t4", (l) => quietHeard.push(l), quietOpts);
    const q1 = await quiet.PreToolUse[0].hooks[0]({ session_id: "s1", hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { file_path: OUT } });
    ok(denied(q1) && readTranscript(quietRoot).length === 0 && quietHeard.length === 0, "case 25: under mainTools: [] a Read denial is denied and NOT recorded — a built-in the main session is not advertised is the CLI's");
    const q2 = await fenceCanUseTool(quietRoot, "t4", (l) => quietHeard.push(l), quietOpts)("Read", { file_path: OUT });
    ok(q2.behavior === "deny" && readTranscript(quietRoot).length === 0, "case 25: canUseTool under mainTools: [] denies and does not record either");
    ok(denied(await quiet.PreToolUse[0].hooks[0]({ session_id: "s1", hook_event_name: "PreToolUse", tool_name: "mcp__other__x", tool_input: {} })) && readTranscript(quietRoot).length === 1 && readTranscript(quietRoot)[0].via === "PreToolUse", "case 25: an mcp__ denial is still recorded under mainTools: [] (#349's rule, byte-identical)");
    // FAIL CLOSED, both sites: a hostile allow-set makes the raw predicate throw (case 24); each site
    // must turn that into a denial that says so, and neither may let the exception escape.
    const hostile = { allowSet: { root: siteRoot, get paths() { throw new Error("hostile allow-set"); } }, mainTools: ["Read"] };
    const hostileRoot = tmpRoot("sites-hostile");
    let escaped = null, hr = null;
    try { hr = await fenceHooks(hostileRoot, "t5", null, hostile).PreToolUse[0].hooks[0]({ session_id: "s1", hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { file_path: IN } }); }
    catch (e) { escaped = e.message; }
    ok(escaped === null && denied(hr) && /fail closed/.test(hr.hookSpecificOutput.permissionDecisionReason) && /hostile allow-set/.test(hr.hookSpecificOutput.permissionDecisionReason),
      `case 25: the hook must DENY when the predicate throws, naming the throw and "fail closed", and must not let it escape (escaped ${escaped}, got ${JSON.stringify(hr)})`);
    let cEscaped = null, cr = null;
    try { cr = await fenceCanUseTool(hostileRoot, "t5", null, hostile)("Read", { file_path: IN }); }
    catch (e) { cEscaped = e.message; }
    ok(cEscaped === null && cr?.behavior === "deny" && /fail closed/.test(cr.message), `case 25: canUseTool must DENY when the predicate throws (escaped ${cEscaped}, got ${JSON.stringify(cr)})`);
    ok(readTranscript(hostileRoot).length === 2 && readTranscript(hostileRoot).every((l) => /fail closed/.test(l.error)), `case 25: both fail-closed denials must be recorded (disk ${readTranscript(hostileRoot).length})`);
    ok((await fenceHooks(hostileRoot, "t5", null, hostile).PreToolUse[0].hooks[0]({ session_id: "s1", hook_event_name: "PreToolUse", tool_name: toolNameFor("record_decision"), tool_input: {} })).continue === true, "case 25: an op tool passes even under a hostile allow-set — it never reaches it");
    // NO allow-set at all (opts omitted, as every pre-#287 caller passes): every path tool fails
    // closed, op tools pass, Bash is denied by name — the #349 fence, exactly.
    const bareRoot = tmpRoot("sites-bare");
    const bare = fenceHooks(bareRoot, "t6", null);
    for (const t of Object.keys(READ_TOOLS)) ok(denied(await bare.PreToolUse[0].hooks[0]({ session_id: "s1", hook_event_name: "PreToolUse", tool_name: t, tool_input: { file_path: IN, path: bareRoot } })), `case 25: with no allow-set ${t} must be denied even inside the root — fail closed`);
    ok((await fenceCanUseTool(bareRoot, "t6", null)("Read", { file_path: IN })).behavior === "deny", "case 25: with no allow-set canUseTool denies Read too");
    ok((await fenceCanUseTool(bareRoot, "t6", null)(toolNameFor("open_question"), {})).behavior === "allow", "case 25: with no allow-set an op tool still passes canUseTool");
    // The site is in the trace's event name, so an armed trace tells the two apart without a field.
    const traceFile = join(TMP, "sites-trace.jsonl");
    const beforeTrace = process.env.DISCOVERY_FENCE_TRACE;
    process.env.DISCOVERY_FENCE_TRACE = traceFile;
    await fenceHooks(tmpRoot("sites-traced"), "t7", null, fence).PreToolUse[0].hooks[0]({ session_id: "s1", hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { file_path: OUT } });
    await fenceCanUseTool(tmpRoot("sites-traced"), "t7", null, fence)("Read", { file_path: OUT });
    if (beforeTrace === undefined) delete process.env.DISCOVERY_FENCE_TRACE; else process.env.DISCOVERY_FENCE_TRACE = beforeTrace;
    // existsSync first: under a predicate that allows everything nothing is denied, nothing is traced,
    // and the assertion below must fail BY NAME rather than the gate dying on ENOENT (seen on the
    // allow-everything mutation in the #287 report).
    const traced = existsSync(traceFile) ? readFileSync(traceFile, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    ok(traced.length === 2 && traced[0].event === "PreToolUse.deny" && traced[1].event === "canUseTool.deny" && traced.every((l) => l.recorded === true && keys(l) === "event,recorded,tool,ts,turn"), `case 25: the trace must name the site in its event and keep case 22's key set (got ${JSON.stringify(traced)})`);

    // --- extraTools and write (#359): ONE fence, TWO KINDS OF RUN ---------------------------------
    // The proposal run cannot build its own predicate — case 12 already refuses exactly that on the
    // transport ("a second copy of the fence is a second fence"), and a duplicate would carry no
    // run-time proof, because whether a deny STOPS a call is a fact no CI group can see. So the
    // parameters are driven here, in the block that already drives both sites over a temp root, and
    // --probe-fence's existing paid observation covers the proposal run too.
    const PROPOSE_TOOL_NAME = "mcp__proposals__propose";

    // THE MIRROR CASE, and it is what makes "no existing behaviour changed" a RESULT rather than a
    // claim: over case 25's whole twelve-input battery, `extraTools` absent, [] and undefined must
    // agree with each other in DECISION and in REASON, at both sites.
    for (const [t, i] of battery) {
      const bare = fenceDecision(fence.allowSet, t, i);
      for (const [label, arg] of [["[]", []], ["undefined", undefined]]) {
        const with_ = fenceDecision(fence.allowSet, t, i, arg);
        ok(bare.allow === with_.allow && bare.reason === with_.reason, `case 25: extraTools ${label} changed fenceDecision on ${JSON.stringify(t)} — ${JSON.stringify(bare)} vs ${JSON.stringify(with_)}. A defaulted parameter must be byte-identical to its absence, or the fence widened silently`);
      }
    }
    // extraTools allows THAT NAME AND ONLY IT. A near-miss on either half of the mcp__ triple is
    // denied, and the write-and-shell tools stay denied by name whatever path they carry.
    const withExtra = [PROPOSE_TOOL_NAME];
    ok(fenceDecision(fence.allowSet, PROPOSE_TOOL_NAME, {}, withExtra).allow === true, `case 25: extraTools did not admit ${PROPOSE_TOOL_NAME} — a proposal run could not call its own tool`);
    ok(/one of this run's tools/.test(fenceDecision(fence.allowSet, PROPOSE_TOOL_NAME, {}, withExtra).reason), `case 25: the extraTools allow does not say why — ${JSON.stringify(fenceDecision(fence.allowSet, PROPOSE_TOOL_NAME, {}, withExtra).reason)}`);
    for (const near of ["mcp__proposals__other", "mcp__other__propose", "propose", "mcp__proposals__", ""])
      ok(fenceDecision(fence.allowSet, near, {}, withExtra).allow === false, `case 25: extraTools admitted ${JSON.stringify(near)} — it is an exact name list, not a prefix`);
    for (const op of DISCOVERY_OPS) ok(fenceDecision(fence.allowSet, toolNameFor(op), {}, withExtra).allow === true, `case 25: ${toolNameFor(op)} stopped passing under extraTools — the op tools are the name gate's, not the list's`);
    for (const t of ["Write", "Edit", "Bash"]) ok(fenceDecision(fence.allowSet, t, { file_path: IN, command: "ls", path: siteRoot }, withExtra).allow === false && fenceDecision(fence.allowSet, t, { file_path: IN }, withExtra).reason === denyReason(t), `case 25: ${t} must stay denied BY NAME under extraTools, whatever path it carries`);
    // allowsToolName itself is NOT widened — case 14's statement stays true.
    ok(allowsToolName(PROPOSE_TOOL_NAME) === false, "case 25: allowsToolName was widened to the proposal tool — case 14 drives it as the statement \"the discovery SESSION's vocabulary is the four op verbs\", and a per-call widening belongs on fenceDecision, not on the set");
    // Junk in extraTools DENIES rather than throwing — fenceDecision's own fail-closed.
    for (const junk of [null, "x", 7, {}, [1, 2], [null]])
      ok(threw(() => fenceDecision(fence.allowSet, PROPOSE_TOOL_NAME, {}, junk)) === null && fenceDecision(fence.allowSet, PROPOSE_TOOL_NAME, {}, junk).allow === false, `case 25: extraTools ${JSON.stringify(junk)} must DENY, not throw`);
    // isRecorded rests on the mcp__ PREFIX, so a rename that dropped it would make a proposal run's
    // refusals invisible. Pinned here so that fails by name instead.
    ok(isMcpToolName(PROPOSE_TOOL_NAME) === true, `case 25: ${PROPOSE_TOOL_NAME} is not an mcp__ name — isRecorded gates on that prefix, so a rename dropping it makes every proposal-run refusal invisible`);

    // `write` receives the line and appendTranscript is NOT called.
    const writeRoot = tmpRoot("sites-write");
    const streamed = [];
    const streamHeard = [];
    const streamFence = { allowSet: allowSetFor({ root: writeRoot, reads: [] }), mainTools: ["Read"], extraTools: withExtra, write: (l) => { streamed.push(l); return l; } };
    const w1 = await fenceHooks(writeRoot, "proposal", (l) => streamHeard.push(l), streamFence).PreToolUse[0].hooks[0]({ session_id: "s1", hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { file_path: OUT } });
    ok(denied(w1) && streamed.length === 1 && streamHeard.length === 1 && readTranscript(writeRoot).length === 0, `case 25: with a write the denial must be STREAMED and transcript.jsonl must stay empty (streamed ${streamed.length}, disk ${readTranscript(writeRoot).length}) — a proposal run appends nothing to the session's files`);
    // The POSITIVE CONTROL: the same denial with write: null lands in the transcript, so the case
    // above cannot be passing because nothing was denied at all.
    const controlRoot = tmpRoot("sites-write-control");
    await fenceHooks(controlRoot, "proposal", null, { allowSet: allowSetFor({ root: controlRoot, reads: [] }), mainTools: ["Read"], extraTools: withExtra, write: null }).PreToolUse[0].hooks[0]({ session_id: "s1", hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { file_path: OUT } });
    ok(readTranscript(controlRoot).length === 1 && readTranscript(controlRoot)[0].type === "denied", `case 25: with write: null the same denial must land in transcript.jsonl (disk ${readTranscript(controlRoot).length}) — otherwise the write case above proves nothing`);
    // THE TWO CALLERS HAND onLine THE SAME SHAPE, `ts` included. That is what the stamp-before-the-
    // branch rule buys, and asserting it is what stops a later edit undoing it silently.
    ok(same(keys(streamHeard[0]), keys(readTranscript(controlRoot)[0])), `case 25: a streamed line's keys are ${keys(streamHeard[0])} and a written line's are ${keys(readTranscript(controlRoot)[0])} — one shape on one wire, so ts is stamped BEFORE the write/append branch`);
    ok(typeof streamHeard[0].ts === "string" && streamHeard[0].ts.length > 0, `case 25: a streamed line carries no ts (${JSON.stringify(streamHeard[0].ts)}) — appendTranscript's own stamp is bypassed by write, so fenceSite stamps it`);
    // A PostToolUseFailure on the run's OWN tool is recorded (here: streamed) exactly as an op tool's
    // is — the schema-layer and handler refusals' only record point.
    const pf = await fenceHooks(writeRoot, "proposal", (l) => streamHeard.push(l), streamFence).PostToolUseFailure[0].hooks[0]({ tool_name: PROPOSE_TOOL_NAME, tool_input: { title: "x" }, error: "proposals: refused" });
    ok(pf.continue === true && streamed.length === 2 && streamed[1].via === "PostToolUseFailure" && streamed[1].error === "proposals: refused" && readTranscript(writeRoot).length === 0, `case 25: a PostToolUseFailure on the run's own tool must be recorded through write (streamed ${streamed.length}, disk ${readTranscript(writeRoot).length}) — a refused proposal is exactly the receipt the honesty contract keeps`);
    const pfNon = await fenceHooks(writeRoot, "proposal", null, streamFence).PostToolUseFailure[0].hooks[0]({ tool_name: "Bash", tool_input: {}, error: "boom" });
    ok(pfNon.continue === true && streamed.length === 2, `case 25: a PostToolUseFailure on a tool that is not this run's must record nothing (streamed ${streamed.length}) — it was never the main session's`);
  }

  // 30.15 — assertTurnWritable, both directions. The STRUCTURAL half of runTurn's
  // lock → guards → append → run ordering: a guard cannot enforce a call order, but it can refuse
  // the damage a wrong order causes. An answer landing on a closed turn is a phantom answer in an
  // append-only file the honesty contract forbids you to clean up.
  const closedByDecision = [{ type: "op", seq: 5, turn: "t4", op: "record_decision", closes: true, params: {} }];
  const closedByWeak = [{ type: "op", seq: 6, turn: "t5", op: "flag_weak_answer", closes: true, params: {} }];
  ok(assertTurnWritable([], "t1") === "t1", "case 15: an empty transcript must accept any turn");
  ok(assertTurnWritable([{ type: "text", turn: "t1", text: "x" }], "t1") === "t1", "case 15: a turn carrying only a text line must be writable");
  ok(assertTurnWritable([{ type: "op", seq: 1, turn: "t1", op: "file_evidence", closes: false, params: {} }], "t1") === "t1", "case 15: a turn carrying only a non-closing op must be writable");
  ok(assertTurnWritable(closedByDecision, "t9") === "t9", "case 15: a DIFFERENT turn's closer must not block this one");
  ok(names(() => assertTurnWritable(closedByDecision, "t4"), "t4", "5") === null,
    `case 15: a turn closed by a record_decision must be refused naming the turn and the closing seq — ${names(() => assertTurnWritable(closedByDecision, "t4"), "t4", "5")}`);
  ok(names(() => assertTurnWritable(closedByWeak, "t5"), "t5", "6") === null,
    `case 15: a turn closed by a flag_weak_answer must be refused naming the turn and the closing seq — ${names(() => assertTurnWritable(closedByWeak, "t5"), "t5", "6")}`);
  for (const junk of [null, "x", 7]) ok(threw(() => assertTurnWritable(junk, "t1")) !== null, `case 15: assertTurnWritable(${JSON.stringify(junk)}) must throw`);
  for (const junk of [null, "", 7]) ok(threw(() => assertTurnWritable([], junk)) !== null, `case 15: a junk turn id ${JSON.stringify(junk)} must throw`);

  // 30.16 — openSession's refusals, each of which throws BEFORE mkdirSync, so a refused slug never
  // becomes a package. The create/resume branch writes a real root (repo or JOBS_DIR) and stays out of
  // CI: a package may only be written by a real session. The slug below is RESERVED for this case —
  // a fictional run cannot be named it (see the header on why the path is removed, not asserted absent).
  const openArgs = { slug: "ci-refused-never-written", provenance: "fictional", entryMode: "blank-idea", depth: "scope-check", branch: null, frontEnd: "portal", posture: "think" };
  const refusedOpen = (patch) => threw(() => openSession({ ...openArgs, ...patch }))?.message ?? null;
  ok(refusedOpen({ entryMode: "existing-prd" })?.includes("entryMode"), "case 16: an unknown entryMode must be refused by name");
  ok(refusedOpen({ frontEnd: "cli" })?.includes("frontEnd"), "case 16: an unknown frontEnd must be refused by name");
  ok(refusedOpen({ posture: "shout" })?.includes("posture"), "case 16: an unknown posture must be refused by name");
  ok(refusedOpen({ depth: "no-such-depth" }) !== null, "case 16: an unknown depth must throw (the bank's own refusal)");
  ok(refusedOpen({ branch: "b2b" })?.includes("#283"), "case 16: a non-null branch must be refused naming #283");
  // The read fence's input (#287), refused by name before the package exists.
  ok(refusedOpen({ reads: "docs/x.md" })?.includes("reads") && refusedOpen({ reads: [""] })?.includes("reads") && refusedOpen({ reads: [7] })?.includes("reads"), "case 16: a junk reads must be refused naming reads");
  rmSync(join(ROOT, "discovery", openArgs.slug), { recursive: true, force: true });
  // The order, from SOURCE (case 12's method): every guard call in openSession's body indexes before
  // its first mkdirSync. This is what proves "refused before written" without reading the repo tree —
  // a disk assertion here went red on a stale leftover with no defect behind it (PR #339 F6).
  const discoverySrc = readFileSync(join(ROOT, "portal/lib/discovery.mjs"), "utf8");
  const openStart = discoverySrc.indexOf("export function openSession(");
  const openBody = openStart === -1 ? "" : discoverySrc.slice(openStart, discoverySrc.indexOf("\n}\n", openStart));
  const firstMkdir = openBody.indexOf("mkdirSync(");
  const guardAt = [...openBody.matchAll(/\b(?:bad|selectDepth|assertRunSlug|assertProvenanceRoot|allowSetFor)\(/g)].map((m) => m.index);
  ok(openStart !== -1 && firstMkdir !== -1, "case 16: openSession or its mkdirSync is not where the source pin expects — re-pin before trusting the six refusals above");
  ok(guardAt.length >= 8, `case 16: openSession's body carries ${guardAt.length} guard calls, fewer than the eight pinned (slug, root, reads, entryMode, frontEnd, posture, depth, branch)`);
  ok(guardAt.every((i) => i < firstMkdir), `case 16: a guard in openSession sits AFTER mkdirSync — a refused call would already have created the package (guards at ${guardAt.join(",")}, mkdirSync at ${firstMkdir})`);

  // The temp package never reaches the repo; the roots case above proved where a real one WOULD go.
  ok(readAnswers(tmpRoot("empty")).length === 0 && readTranscript(tmpRoot("empty")).length === 0, "case 9: an absent file must read as [] rather than throw");
  rmSync(TMP, { recursive: true, force: true });

  group("discovery", `the SSE projection's four branches with exact key sets and seven junk values answering null · the WHITELIST proven by mutation — an unknown field on a text line, on an op line and inside params never reaches the wire, and wrong_if / missing stay off it because the surface reads the package · the 4000 cap with its 800-char control and the denied error capped too, the reason stated (pushback prose IS the content, not a progress log) · TOOL_SCHEMA ↔ PARAMS by NAME AND ORDER in both directions with every enum compared BY MEMBER against LEVELS / SOURCES / PROVENANCE, closing spike 1's P1 cardinality gap, and every type code in TOOL_TYPES · the four tool names and the server name pinned · the provenance roots with the privacy refusal DRIVEN by a repo-rooted real run rather than asserted, an unknown provenance naming both, and four lists frozen by mutation · the slug guard over eleven junk values each refused by name · the ref allocator stable over an out-of-order store · the cursor DERIVED from closed turns only — a text line, a non-closing op and a denied line each proven not to move it, one closer advancing exactly one, and past-the-end reading done with a null question · the three line constructors against the README's shapes, with opLine's alias trap (mutate the record after the call and re-read) · the Think posture's model, both halves of MVP 6, the prompt carrying ref + text + weak-answer note, five junk builds throwing, and the rubric proven ABSENT from what the config route serves · the source pin on IMPORT LINES over both modules — no SDK, no zod, no DOM, no static transport import, plus the lazy import asserted PRESENT · purity by double call and by mutating the return · allowsToolName over four allowed and eighteen refused, built by mapping OPS · assertTurnWritable accepting three open shapes and refusing both closer kinds by turn and seq · openSession's five refusals (entryMode, frontEnd, posture, depth, non-null branch) each driven, with every guard call pinned from source to precede mkdirSync — nothing under discovery/ is read · PARENT_RULE pinned verbatim and asserted to INSTRUCT (one rung above, re-file on refusal, null only when nothing above) · ledgerBrief over an empty ledger, a three-rung applier-built ledger and an off-script decision, present VERBATIM in the turn prompt and ABSENT from the system prompt, the recency line naming parent_id LAST, a build lacking the ledger refused, and the brief's candidate line proven to be the applier's acceptance set with the refusal naming the same seq · TOOL_DESCRIPTIONS frozen, keyed as OPS, record_decision's naming the candidate line · the posture fingerprint deterministic and MOVED by mutation of the model, the system prompt and the turn template, and pinned to fixed inputs the bank cannot touch · the transport pinned from source to pass the ledger, import the one copy of the tool text and stamp the fingerprint off the posture (#341) · the fence HOOKS run hook by hook over a temp root, BOTH recording hooks gated by the tool NAME (#349, after #343's SubagentStart…SubagentStop bracket was observed to hold on the session's create turn only — 0 of 11 resumed turns delivered SubagentStart, every one delivered SubagentStop): isMcpToolName driven over four true and fourteen false, a main-session denial on a foreign MCP tool recorded once with denyReason's text, the six built-ins the 79-line recording named each DENIED and unrecorded with no SubagentStart ever delivered — the line that was red under the bracket — a built-in PostToolUseFailure unrecorded, an op-tool PostToolUseFailure recorded verbatim whatever the warmup is doing (PR #344 F1), a non-op PostToolUseFailure unrecorded, every op tool passing, the bracket hooks pinned ABSENT and PostToolUse pinned ABSENT (#343) · the FENCE TRACE (#349) proven off when unarmed by BOTH its path and a listing of the run root, when armed tracing every DECISION on a tool outside this run's op vocabulary — two in-root Read/Glob ALLOWS as well as a Bash denial, each with its tool and recorded flag, the op call itself never traced (PR #354 review F1: a deny-only trace goes blind for exactly the in-root path calls the read fence now admits, and bracket-trace-1's committed trace holds three of them) — absent from transcript.jsonl, and an unwritable path leaving the denial and its recorded line intact · EVIDENCE_RULE pinned verbatim, asserted to name file_evidence and BOTH of its routes and to forbid inventing one, and asserted to sit BEFORE PARENT_RULE — the recency tail #341 bought with a paid recording, which an APPENDED prompt string would take away silently (#338 F6) · the provenance's ABSENT DEFAULT driven on the server (an empty, null and undefined provenance each refused by name, so no browser drift opens a session on a blank) and source-pinned in the drawer with both controls — the placeholder present, FIRST in the list, the Start handler refusing a blank BEFORE it POSTs, and the note three-way so the placeholder cannot render the "real" note (#338 F3) · the boot stamp: isStale over four pairs with unknown proven NOT stale, BOOT_SHA source-pinned to module scope (read per request it reports the TREE's HEAD and a stale process reads as fresh) and /api/health pinned to carry it, plus the PRD route proven READ-ONLY — writePrd neither imported nor called, and the resolveRunRoot + assertProvenanceRoot pair present (#338 F1, F2) · PROVENANCE_RULE keyed by run.json's two provenances, each rendered VERBATIM only for its own run, each naming the true evidence label and forbidding the false one, sitting BEFORE EVIDENCE_RULE and inside the fingerprint (a real build moves it), the turn prompt unchanged by it, a build with no provenance or an unknown one refused, and the transport pinned from source to pass head.provenance; EVIDENCE_RULE naming the third source, name, beside a ref (#347) · THE READ FENCE (#287): allowSetFor + allowsPath driven over run 1's shape (its package and the bank allowed; _portfolio/decisions.json and the sealed file denied) and run 2's (the fixture allowed; docs/epics/discovery-partner.prd.md one directory above it denied, with the fixture's directory and siblings), the entry + sep rule and .. normalisation, eight junk paths and eleven junk sets each denying with "fail closed" and never throwing, allowSetFor refusing a relative root and seven junk reads by name, the set frozen and pure · fenceDecision — op tools by name under any set, Read/Grep/Glob by path with the cwd default, five write-and-shell tools denied BY NAME under an allow-everything set and an in-root path, READ_TOOLS pinned to Glob·Grep·Read, WebSearch/WebFetch proven INDEPENDENT of the allow-set and decided by the name gate's text, ten junk names denying, and the raw predicate proven to THROW on a hostile set · BOTH CALL SITES driven over a temp root with the transport's fence shape — the hook and fenceCanUseTool each denying a Read outside the set and recording ONE denied line via ITSELF with the path and the reason the SDK was given, each passing a Read inside the root unrecorded, agreeing on a twelve-input battery in decision and reason, denying and NOT recording under mainTools: [] (#349's attribution byte-identical) while an mcp__ denial still records, each DENYING on the hostile set with "fail closed" and letting nothing escape, each failing every path tool closed with no allow-set while op tools pass, and the trace naming the site in its event · deniedLine's via REQUIRED and pinned to the three sites · openSession refusing junk reads by name before mkdirSync · the transport pinned from source to hand ONE fence object to both sites, rebuild the allow-set from run.json, carry no inline canUseTool, keep tools and mainTools one record, set strictMcpConfig: true so the repo's .mcp.json never joins a run's advertised surface (#352), and run the real turn with cwd equal to the run root — scoped to that query's own block with resume: head.sessionId as the positive control, because --probe-fence carries a second cwd: root and a file-wide match stayed green with the real turn pointed elsewhere (PR #354 review F2) · ONE FENCE, TWO KINDS OF RUN (#359): extraTools and write, both defaulted, with the MIRROR case proving extraTools absent, [] and undefined byte-identical over case 25's whole twelve-input battery in DECISION and REASON, the proposal tool name admitted and only it (five near-misses denied, the op tools still passing by the name gate, Write/Edit/Bash still denied BY NAME, six junk values denying rather than throwing), allowsToolName proven NOT widened so case 14's statement still holds, the mcp__ prefix isRecorded rests on pinned, and write proven to STREAM a denial with transcript.jsonl left empty against the write: null positive control that lands one — plus the two callers proven to hand onLine the SAME key set with ts present, because the stamp sits before the write/append branch, and a PostToolUseFailure on the run's OWN tool streamed while one on a foreign tool records nothing. What it cannot reach: the transport, the SDK, any live run, openSession's create/resume branch (it writes a real root), whether tools: [] holds at run time — the tool-name gate rests on the main session being advertised mcp__ tools only, and that is the init message's tool list, which the preflight's PF1 compares to OPS and no CI group can see (the 79-line recording, the 4-line one and #349's bracket-trace-1 / bracket-trace-2 are the observations: every built-in denial the CLI's warmup, every mcp__ one the agent's) — and whether a fence DENY actually STOPS a call at either site, or whether the CLI consults canUseTool for a read at all: the fence probe (discovery-transport.mjs --probe-fence) observes each site holding alone in a paid run this group cannot make; and the DRAWER ITSELF — portal.js touches the DOM at module scope, so its half of the provenance rule is a source pin, not a run, and only the server's refusal is executed here`);
}

// --- group 31: the PRD projection (#290) -------------------------------------------------------------
// THE FIXTURE IS A GATE FIXTURE, NOT A RUN. Nothing produces a full-width run package until #289
// lands, so this group drives a HAND-AUTHORED one: the ops, the answers and the run header below are
// written by hand for this gate. It is NOT run output, it must never be presented as one, and it must
// never be copied into a run package — discovery/README.md forbids a hand-written answer, transcript
// or op, and that rule is why this fixture lives INLINE here rather than as a discovery/<slug>/
// directory on disk that could later be mistaken for a real package.
//
// Only the ops, the answers and run.json are hand-written. The RECORDS are produced by running the
// real applier over them, so seq / closes / flagged / supersedes are discovery/ops.mjs's output and
// this group cannot drift from the applier's flagging rules.
//
// It is in memory on purpose: the projection's pure half is the whole of what this group can reach,
// and readPackage / writePrd / the CLI are deliberately NOT imported (see the closing line).
{
  const threw = (fn) => { try { fn(); return null; } catch (e) { return e; } };
  const msg = (fn) => threw(fn)?.message ?? null;
  const names = (fn, ...needles) => {
    const m = msg(fn);
    if (m === null) return "did not throw";
    const missing = needles.filter((n) => !m.includes(String(n)));
    return missing.length ? `threw "${m}", which does not name ${missing.map((n) => JSON.stringify(n)).join(" or ")}` : null;
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  // A claim reaches a table cell with its pipes escaped and an op param reaches the page folded onto
  // one line, so "present" accepts every form. Absence assertions use !present for exactly the same
  // reason — an escaped or folded leak is still a leak.
  const esc = (s) => String(s).replace(/\|/g, "\\|");
  // CommonMark's three line endings, not just LF — the module folds on all three, so this copy has
  // to, or `present()` builds its match set blind to CR and reports a leak as contained.
  // Mirrors the module's fold EXACTLY — every line-ending CHARACTER, so a CRLF pair becomes TWO
  // spaces. A one-space copy here would build a match set the page never contains.
  const fold = (s) => String(s).replace(/[\r\n]/g, " ");
  const present = (md, s) => [String(s), esc(s), fold(s), esc(fold(s))].some((v) => md.includes(v));
  // `^` with /m anchors after CR as well as LF, so a bare-CR heading was already visible here. The
  // blindness this widening closes is the INDENT: a fold that replaces CRLF with one space leaves
  // " ## …", and ATX tolerates up to three leading spaces while /^## / does not see one.
  const headings = (md) => [...md.matchAll(/^ {0,3}## (.+)$/gm)].map((m) => m[1]);
  const sectionBody = (md, heading) => {
    const open = `\n## ${heading}\n`;
    const at = md.indexOf(open);
    if (at === -1) return null;
    const from = at + open.length;
    const next = md.indexOf("\n## ", from);
    return md.slice(from, next === -1 ? md.length : next).replace(/\nArchitecture: _TBD[^\n]*\n?$/, "").trim();
  };
  const blockOf = (md, seq) => {
    const head = `#### seq ${seq} · `;
    const at = md.indexOf(head);
    if (at === -1) return null;
    const rest = md.slice(at);
    const stops = [rest.indexOf("\n#### "), rest.indexOf("\n## ")].filter((n) => n !== -1);
    return rest.slice(0, stops.length ? Math.min(...stops) : rest.length);
  };

  // One answer carries hostile markdown on purpose (R7): a `|`, a line starting `# `, one starting
  // `## `, one starting `- `, and a fenced code block. All of it must render inert.
  const HOSTILE = [
    "We are deliberately not doing the shared-account half, and the committee agreed. Their note, pasted:",
    "# Not doing",
    "## Also not doing",
    "- shared logins",
    "- a native app",
    "Rota columns in their sheet: plot | holder | slot",
    "```",
    "const NOT_DOING = [\"shared logins\", \"a native app\"];",
    "```",
    "That list is the whole of it — anything not on it is in scope.",
  ].join("\n");
  // A URL the applier accepts (it prefix-checks http(s):// and nothing else) whose query string holds
  // pipes — the one route hostile text has into a TABLE cell.
  const HOSTILE_URL = "https://meridian.test/allotment-survey-2026?cols=plot|holder|slot";
  // THE OTHER ROUTE, and the one blockquote() cannot cover: an op param is AGENT-AUTHORED text that
  // reaches the page as markdown STRUCTURE rather than inside a quote. ops.mjs validates a `reason`
  // as a non-empty string and folds nothing, so an agent paraphrasing a multi-line answer is the
  // EXPECTED path here, not an attack. It rides its own op — bolting a newline onto an existing
  // fixture op would slice sectionBody()/blockOf() and report a missing claim instead of this.
  const INJECT_REASON = [
    "Raised off-script while answering something else, so it is parked rather than filed. Their words:",
    "",
    "## Smuggled section",
    "",
    "- away mode frees the slot for the week, or for the whole season",
  ].join("\n");

  const PRD_ANSWERS = [
    { ref: "a1", text: "Every spring the allotment committee re-types the same rota into a paper ledger, and by June nobody trusts it. Two plots were double-let last year and one holder gave up their plot over it." },
    { ref: "a2", text: "From the 2026 committee minutes: \"of 84 plots, 31 changed hands or slot mid-season and 9 of those were recorded late or not at all.\"" },
    { ref: "a3", text: "The plot holder wants to know, on their phone, which slot is theirs this week and who to swap with if they cannot make it. The secretary wants one place that is right." },
    { ref: "a4", text: "Out of bounds: no payments, no messaging between holders, and no change to how slots are allocated. Away mode only moves a slot, it does not reassign a plot." },
    { ref: "a5", text: HOSTILE },
    { ref: "a6", text: "By 1 March the paper ledger is retired and the secretary works from the digital rota only. If the digital rota is not live by then we go back to paper for the season and stop." },
    { ref: "a7", text: "Nothing new really, it is mostly a table and some dates. We will sort out whatever comes up as we go." },
    { ref: "a8", text: "I do not know what the one number is. Plots filled? Late records? Probably late records but I would be guessing." },
    { ref: "a9", text: "Actually, hold on — the out-of-bounds answer I gave sits under the holder's need, not under the appetite. I want to refile it there." },
    { ref: "a10", text: "One more before we stop: away mode. If a holder is away their slot frees up, but nobody has said whether it frees for that week only or for the rest of the season." },
  ];

  // Hand-authored ops, in filing order, using REAL bank ids so questionById resolves. Turn discipline:
  // every closing op gets its own turn (R2 refuses a second closer on a turn); file_evidence never
  // closes and an off-script op never closes, so t8 is legitimately shared by the last three.
  const PRD_OPS = [
    { turn: null, op: "file_evidence", params: { url: HOSTILE_URL, ref: null, name: null, provenance: "secondary-source", claim_ref: null } },
    { turn: "t1", op: "record_decision", params: { question_id: "s1-if-nobody-solves-this", answer_ref: "a1", level: "business", parent_id: null, evidence_refs: [1], wrong_if: "Plots stop being double-let without any software, because the committee's new paper process already fixed it.", off_script: false } },
    // A NAMED artefact (#347): the name reaches the page with the answer that named it in brackets.
    { turn: null, op: "file_evidence", params: { url: null, ref: "a2", name: "the committee's paper rota", provenance: "assumption", claim_ref: 2 } },
    { turn: "t2", op: "record_decision", params: { question_id: "s3-user-need-map", answer_ref: "a3", level: "stakeholder", parent_id: 2, evidence_refs: [3], wrong_if: "Holders never look at the rota between sessions, so a phone view changes nothing about late records.", off_script: false } },
    { turn: "t3", op: "record_decision", params: { question_id: "s4-out-of-bounds", answer_ref: "a4", level: "solution", parent_id: 4, evidence_refs: [1], wrong_if: "Holders cannot use the rota at all without messaging each other, so excluding messaging kills the swap.", off_script: false } },
    { turn: "t4", op: "record_decision", params: { question_id: "s3-deliberately-not-doing", answer_ref: "a5", level: "solution", parent_id: null, evidence_refs: [], wrong_if: "Shared logins turn out to be the only way the secretary can hand over at year end, and the exclusion blocks handover entirely.", off_script: false } },
    { turn: "t5", op: "record_decision", params: { question_id: "s7-kill-state-and-date", answer_ref: "a6", level: "transition", parent_id: 5, evidence_refs: [3], wrong_if: "The paper ledger is still in use on 1 March and nobody stops, so the date was never a real kill state.", off_script: false } },
    { turn: "t6", op: "flag_weak_answer", params: { question_id: "s4-rabbit-holes", answer_ref: "a7", missing: ["any named unknown in the slot-swap flow", "a decision settled in advance rather than deferred to build time", "whether a design solution is being assumed"] } },
    { turn: "t7", op: "open_question", params: { source: "banked", question_id: "s7-north-star", answer_ref: "a8", reason: "The holder could not name one number and said so — parked rather than recorded as a guess." } },
    { turn: "t8", op: "open_question", params: { source: "off-script", question_id: null, answer_ref: "a9", reason: "Raised off-script mid-turn: whether the out-of-bounds list belongs under the holder need rather than the appetite." } },
    // Its wrong_if is DELIBERATELY distinct from seq 5's: a verbatim copy would let 31.6's "the
    // replaced decision vanished from the page entirely" pass on the REPLACEMENT's own block.
    { turn: "t8", op: "record_decision", params: { question_id: "s4-out-of-bounds", answer_ref: "a4", level: "solution", parent_id: 4, evidence_refs: [1, 3], wrong_if: "The exclusions belong under the appetite after all, so refiling them under the holder need misplaces every one of them.", off_script: true } },
    { turn: "t8", op: "open_question", params: { source: "off-script", question_id: null, answer_ref: "a10", reason: INJECT_REASON } },
  ];

  const PRD_RUN = {
    slug: "gate-fixture",
    provenance: "fictional",
    label: "Gate fixture — hand-authored for build-checks group 31, not a run",
    entryMode: "blank-idea",
    depth: "full-discovery",
    branch: null,
    frontEnd: "portal",
    model: "claude-sonnet-5",
    posture: "think",
    sessionId: null,
    startedAt: "2026-08-29T09:00:00.000Z",
    endedAt: "2026-08-29T09:40:00.000Z",
    root: "discovery/gate-fixture",
    turnStats: [{ turn: "t1", numTurns: 2, durationMs: 1000, costUsd: 0.01, ok: true, ts: "2026-08-29T09:01:00.000Z" }],
  };

  const PRD_RECORDS = applyDiscoveryOps(PRD_OPS, { answers: PRD_ANSWERS, bank: BANK }).ops;
  const project = (ops = PRD_RECORDS) => projectPrd({ run: PRD_RUN, answers: PRD_ANSWERS, ops });
  const doc = project();
  const decisionsOf = (ops) => ops.filter((r) => r.op === "record_decision");
  const without = (level) => PRD_RECORDS.filter((r) => !(r.op === "record_decision" && r.params.level === level));

  // 31.1 — the table: frozen at BOTH levels by mutation, the exact key set, and eleven DISTINCT
  // declared empty states (a copy-pasted one would make 31.7.1 pass for the wrong reason).
  {
    const n = SECTIONS.length;
    ok(Object.isFrozen(SECTIONS) && threw(() => SECTIONS.push({ id: "smuggled" })) !== null && SECTIONS.length === n, "SECTIONS is not frozen — a push landed");
    const firstId = SECTIONS[0].id;
    ok(SECTIONS.every(Object.isFrozen) && threw(() => { SECTIONS[0].id = "tampered"; }) !== null && SECTIONS[0].id === firstId, "a SECTIONS row is not frozen — Object.freeze is shallow and a writable row lets the frozen case pass for the wrong reason");
    const KEYS = ["id", "heading", "axis", "from", "why", "empty"];
    for (const row of SECTIONS) {
      ok(same(Object.keys(row).slice().sort(), KEYS.slice().sort()), `SECTIONS row "${row.id}" carries ${Object.keys(row).join(", ")} — every row is exactly ${KEYS.join(", ")}`);
      ok(["ladder", "op-kind", "cross-ref", "derived"].includes(row.axis), `SECTIONS row "${row.id}" has axis "${row.axis}" — the axes are ladder · op-kind · cross-ref · derived`);
      ok(typeof row.why === "string" && row.why.length > 20, `SECTIONS row "${row.id}" has no real "why" sentence — the table is documentation as well as a dispatch map`);
      ok(typeof row.empty === "string" && row.empty.trim().length > 0, `SECTIONS row "${row.id}" has no declared "empty" string — an inferred empty state is what 31.7.1 exists to avoid`);
      ok(typeof row.heading === "string" && row.heading.trim().length > 0, `SECTIONS row "${row.id}" has no heading`);
    }
    ok(new Set(SECTIONS.map((r) => r.id)).size === n, "two SECTIONS rows share an id");
    ok(new Set(SECTIONS.map((r) => r.heading)).size === n, "two SECTIONS rows share a heading");
    ok(new Set(SECTIONS.map((r) => r.empty)).size === n, `two SECTIONS rows declare the same "empty" string — the eleven must be distinct or 31.7.1 cannot tell them apart`);
  }

  // 31.2 — the coverage rules, BOTH directions. A fifth rung or a fifth verb with no home fails here
  // BY NAME rather than being silently dropped from the artefact (the VALID_FOR idiom, group 29).
  {
    const ladder = SECTIONS.filter((r) => r.axis === "ladder");
    for (const level of LEVELS) {
      const rows = ladder.filter((r) => r.from === level);
      ok(rows.length === 1, `LEVELS holds "${level}" but ${rows.length} ladder row(s) claim it — every rung renders in exactly one section`);
    }
    for (const row of ladder) ok(LEVELS.includes(row.from), `ladder row "${row.id}" names rung "${row.from}", which is not in LEVELS (${LEVELS.join(" · ")})`);
    const opKind = SECTIONS.filter((r) => r.axis === "op-kind");
    for (const verb of DISCOVERY_OPS) {
      if (verb === "record_decision") {
        ok(ladder.length > 0, "no ladder row claims record_decision — decisions would be dropped from the projection entirely");
        continue;
      }
      const rows = opKind.filter((r) => r.from === verb);
      ok(rows.length === 1, `OPS holds "${verb}" but ${rows.length} op-kind row(s) claim it — a verb with no home is a silent drop, the worst failure mode an honesty artefact has`);
    }
    for (const row of opKind) ok(DISCOVERY_OPS.includes(row.from) && row.from !== "record_decision", `op-kind row "${row.id}" names "${row.from}", which is not one of the three non-decision verbs`);
    ok(NON_GOAL_QUESTIONS.length === 2 && Object.isFrozen(NON_GOAL_QUESTIONS), "NON_GOAL_QUESTIONS is not two frozen ids");
    for (const id of NON_GOAL_QUESTIONS) ok(questionById(id) !== null, `NON_GOAL_QUESTIONS names "${id}", which the bank does not hold — a rename would silently empty the Non-goals section`);
    ok(STAGES.some((s) => s.n === METRIC_STAGE), `METRIC_STAGE ${METRIC_STAGE} names a stage the bank does not hold — Success metrics would silently empty`);
  }

  // 31.3 — the positive control. Every refusal below means nothing unless the fixture projects first.
  {
    ok(typeof doc === "string" && doc.length > 500, `the fixture projected ${typeof doc} of length ${doc?.length} — nothing below is meaningful`);
    ok(doc.endsWith("\n") && !doc.endsWith("\n\n"), "the projection does not end in exactly one newline");
    ok(doc.startsWith("# gate-fixture — PRD, projected from a discovery run\n"), `the page does not open with its slug heading — it opens ${JSON.stringify(doc.slice(0, 60))}`);
    ok(same(headings(doc), SECTIONS.map((r) => r.heading)), `the "## " headings are ${JSON.stringify(headings(doc))} — SECTIONS says ${JSON.stringify(SECTIONS.map((r) => r.heading))}`);
    ok(doc.includes("**Projected, not authored.**") && doc.includes("`discovery/gate-fixture`") && doc.includes("refuses to overwrite it"), "the honesty header does not say it was projected, link the package, and say re-running refuses to overwrite (AC #5)");
    ok(doc.includes("Architecture: _TBD — see plan-architecture_"), "the house architecture cross-link placeholder is missing");
    ok(PRD_RECORDS.length === PRD_OPS.length && PRD_RECORDS.every((r, i) => r.seq === i + 1), "the applier did not record one seq-ordered record per fixture op");
  }

  // 31.4 — EVERY op reaches the page. Iterated over the RECORDS, so an op kind with no renderer fails
  // by name rather than being skipped.
  {
    const DISTINCT = {
      record_decision: (p) => p.wrong_if,
      flag_weak_answer: (p) => p.missing[0],
      open_question: (p) => p.reason,
      file_evidence: (p) => (p.url !== null ? p.url : p.name !== null ? `${p.name} (answer ${p.ref})` : `answer ${p.ref}`),
    };
    for (const verb of DISCOVERY_OPS) ok(DISTINCT[verb], `no DISTINCT projector for "${verb}" — every verb needs one here, or this case iterates OPS in name only`);
    ok(new Set(PRD_RECORDS.map((r) => r.op)).size === DISCOVERY_OPS.length, "the fixture does not exercise every verb");
    for (const r of PRD_RECORDS) ok(present(doc, DISTINCT[r.op](r.params)), `seq ${r.seq} (${r.op}) does not reach the page — ${JSON.stringify(String(DISTINCT[r.op](r.params)).slice(0, 60))} is absent`);
    ok(!doc.includes("is not in answers.jsonl"), "an answer_ref did not resolve in the happy projection");
    for (const r of PRD_RECORDS) {
      if (r.op === "flag_weak_answer") for (const m of r.params.missing) ok(present(doc, m), `seq ${r.seq}: missing[] entry ${JSON.stringify(m)} was dropped — nothing here is truncated (R3)`);
    }
    // Nothing is truncated: the longest verbatim answer reaches the page whole.
    const longest = PRD_ANSWERS.map((a) => a.text).sort((a, b) => b.length - a.length)[0];
    ok(doc.includes(longest.split("\n")[0]), "the longest answer's first line is not on the page — a verbatim answer must never be capped (R3)");
  }

  // 31.5 — the flags render INLINE on the record that carries them, and are READ from `flagged`
  // rather than re-derived. The mutation is what proves the read: blank the field, watch them vanish.
  {
    const both = PRD_RECORDS.find((r) => r.op === "record_decision" && r.flagged.includes("orphan") && r.flagged.includes("no-evidence"));
    ok(both, "the fixture has no decision carrying BOTH flags — parent_id: null with evidence_refs: [] is the case this proves");
    const block = blockOf(doc, both.seq);
    ok(block && block.includes("orphan") && block.includes("no-evidence"), `seq ${both.seq}'s block does not carry both flag markers inline — ${JSON.stringify(String(block).slice(0, 160))}`);
    for (const f of FLAGS) ok(doc.includes(f), `FLAGS member "${f}" never appears in the projection — a flag with no rendering is a dropped flag`);
    const blanked = PRD_RECORDS.map((r) => (r.seq === both.seq ? { ...r, flagged: [] } : r));
    const after = blockOf(project(blanked), both.seq);
    ok(after && !after.includes("orphan") && !after.includes("no-evidence"), `blanking seq ${both.seq}'s flagged left its markers on the page — the projection RE-DERIVES the flags instead of reading them (R2), and a second copy of the applier's rule drifts`);
  }

  // 31.6 — the hierarchy and the supersede READ. Nothing is removed: both seqs stay in the ops.
  {
    // sectionBody() answers null for a heading the page does not carry, and a `.find()` answers
    // undefined — ok() records a failure and RETURNS, so an unguarded dereference here throws before
    // group() prints and the whole gate reports nothing rather than one named failure.
    const body = String(sectionBody(doc, "Requirement hierarchy"));
    for (const level of LEVELS) ok(body.includes(`**${level}**`), `the Requirement hierarchy does not name the "${level}" rung`);
    const child = PRD_RECORDS.find((r) => r.op === "record_decision" && r.params.parent_id !== null);
    ok(child, "the fixture has no parented decision — the hierarchy's parent assertion below is then unreachable");
    ok(body.includes(`parent: seq ${child?.params.parent_id}`), `seq ${child?.seq} does not name its parent's seq in the hierarchy (AC #3)`);
    ok(body.includes("⚠ orphan"), "the hierarchy marks no orphan, although the fixture carries one");
    const counts = LEVELS.map((l) => `${l} ${decisionsOf(PRD_RECORDS).filter((d) => d.params.level === l && (d.params.question_id === null || !PRD_RECORDS.some((o) => o.op === "record_decision" && o.params.question_id === d.params.question_id && o.seq > d.seq))).length}`).join(" · ");
    ok(body.includes(counts), `the hierarchy's counts line is not "${counts}" — ${JSON.stringify(body.split("\n").pop())}`);
    const later = PRD_RECORDS.find((r) => r.op === "record_decision" && r.supersedes !== null);
    ok(later, "the fixture has no supersede pair — an off-script decision on an already-decided question is the case this proves");
    ok(doc.includes(`*Replaces:* seq ${later.supersedes}`), `seq ${later.seq} does not name the decision it replaced`);
    ok(blockOf(doc, later.seq) !== null, `the LATEST decision (seq ${later.seq}) does not render its own block`);
    ok(blockOf(doc, later.supersedes) === null, `the REPLACED decision (seq ${later.supersedes}) rendered its own block — a decision must appear in exactly one place`);
    const replaced = PRD_RECORDS[later.supersedes - 1];
    ok(replaced.params.wrong_if !== later.params.wrong_if, "the superseding op copies the replaced one's wrong_if — the assertion below would then pass on the REPLACEMENT's own block, and flipping renderMetrics to `visible` would stay green");
    ok(present(doc, replaced.params.wrong_if), "the replaced decision vanished from the page entirely — both records stay, nothing is removed (README §Supersede)");
    // Three surfaces count over the WHOLE ledger, not over `visible`: Success metrics, the Evidence
    // gap list and the Ledger line. Each must MARK a replaced record, or one page reports two
    // different numbers for the same fact with nothing to resolve them (the `orphan 2` / `orphans 1`
    // contradiction, driven below).
    const mark = `superseded by seq ${later.seq}`;
    const metricsRow = String(sectionBody(doc, "Success metrics")).split("\n").find((l) => l.startsWith(`| ${later.supersedes} |`));
    ok(metricsRow, `Success metrics has no row for the replaced seq ${later.supersedes} — every decision's kill criterion is listed, replaced ones included`);
    ok(String(metricsRow).includes(mark), `Success metrics lists the retracted kill criterion beside its live replacement with no marker — ${JSON.stringify(metricsRow)}`);
    // The fixture's replaced decision DOES carry evidence, so the Evidence half is driven by flagging
    // it rather than by bending the committed fixture into the one shape this needs.
    const flagged = PRD_RECORDS.map((r) => (r.seq === later.supersedes ? { ...r, flagged: [...r.flagged, "no-evidence", "orphan"] } : r));
    const md = project(flagged);
    ok(String(sectionBody(md, "Evidence")).includes(`seq ${later.supersedes} (${mark})`), `a replaced decision resting on no evidence is listed as an outstanding evidence gap with no marker — ${JSON.stringify(String(sectionBody(md, "Evidence")).split("\n").pop())}`);
    const ledger = md.split("\n").find((l) => l.startsWith("**Ledger**"));
    const hier = String(sectionBody(md, "Requirement hierarchy")).split("\n").pop();
    ok(String(ledger).includes("orphan 2") && String(hier).includes("orphans 1"), `the two counted sets did not diverge (${JSON.stringify(String(ledger).slice(-40))} / ${JSON.stringify(hier)}) — without a divergence the assertion below proves nothing`);
    ok(String(ledger).startsWith("**Ledger** (whole ledger"), `the Ledger line reports "orphan 2" against the hierarchy's "orphans 1" without naming its own set — ${JSON.stringify(String(ledger).slice(0, 60))}`);
  }

  // 31.7 — THE VANISHING CLAIM (AC #6). A claim not in the ops cannot appear, proven by deleting the
  // op and checking the WHOLE document — a leak into a different section is what this catches.
  {
    // 31.7.1 — section by section, all four ladder rungs, transition included. The comparison is
    // against the row's own declared `empty`, so this loop has no branch for the **n/a** paragraph.
    for (const row of SECTIONS.filter((r) => r.axis === "ladder")) {
      const gone = decisionsOf(PRD_RECORDS).filter((d) => d.params.level === row.from);
      const md = project(without(row.from));
      ok(sectionBody(md, row.heading) === row.empty, `with no ${row.from} decision, "${row.heading}" renders ${JSON.stringify(String(sectionBody(md, row.heading)).slice(0, 120))} — its row declares ${JSON.stringify(row.empty.slice(0, 120))}`);
      for (const d of gone) ok(!present(md, d.params.wrong_if), `seq ${d.seq}'s wrong_if survives ANYWHERE in the document after its op was deleted — a claim the ops do not carry reached the page`);
    }
    // 31.7.2 — the empty run. Every heading, and NO claim and NO answer, although every answer is
    // still passed in: an answer reaches the page only through an op that references it.
    {
      const md = project([]);
      ok(same(headings(md), SECTIONS.map((r) => r.heading)), "the empty-run projection lost a section heading");
      for (const r of PRD_RECORDS) {
        const p = r.params;
        for (const claim of [p.wrong_if, p.reason, p.missing?.[0], p.url].filter(Boolean)) ok(!present(md, claim), `the empty-run projection carries seq ${r.seq}'s ${JSON.stringify(String(claim).slice(0, 50))} — with no ops, no claim may survive`);
      }
      for (const a of PRD_ANSWERS) ok(!present(md, a.text.split("\n")[0]), `the empty-run projection carries answer ${a.ref}'s text — an answer reaches the page only through an op that references it`);
    }
    // 31.7.3 — the transition note, BOTH directions (AC #4).
    {
      const t = decisionsOf(PRD_RECORDS).find((d) => d.params.level === "transition");
      ok(t, "the fixture has no transition decision — AC #4 needs both directions");
      ok(String(sectionBody(doc, "Transition note")).includes(t.params.wrong_if) && !doc.includes("**n/a**"), "with a transition decision recorded, the note must render it and the **n/a** paragraph must not appear anywhere");
      const md = project(without("transition"));
      ok(md.includes("**n/a**") && md.includes("transition-level decision"), "with no transition decision, the note must be an explicit **n/a** naming the reason");
      ok(!present(md, t.params.wrong_if), "the transition decision's wrong_if survives after its op was deleted");
    }
    // 31.7.4 — Success metrics' STAGE filter, both directions. Its fallback is the one state nothing
    // else on the page can see: every other assertion over a stage-7 decision is satisfied by that
    // decision's own ladder block or by the all-decisions table below the staged one, so a filter
    // that matched nothing would render the fallback and stay green everywhere else.
    {
      const m = decisionsOf(PRD_RECORDS).find((d) => questionById(d.params.question_id)?.stage === METRIC_STAGE);
      ok(m, `the fixture has no decision against a stage ${METRIC_STAGE} question — the stage filter is then unreachable and this case proves nothing`);
      const fallback = `_No decision was recorded against a stage ${METRIC_STAGE}`;
      const q = questionById(m?.params.question_id);
      const body = String(sectionBody(doc, "Success metrics"));
      ok(present(body, `| ${m?.seq} | ${q?.text}`), `Success metrics has no stage ${METRIC_STAGE} row for seq ${m?.seq}, although the fixture holds one — the filter matched nothing`);
      ok(!body.includes(fallback), `Success metrics shows its no-stage-${METRIC_STAGE} fallback although the fixture holds a stage ${METRIC_STAGE} decision`);
      const md = project(PRD_RECORDS.filter((r) => r.seq !== m?.seq));
      ok(String(sectionBody(md, "Success metrics")).includes(fallback), `with the stage ${METRIC_STAGE} decision deleted, Success metrics must SAY there was none — the two states are the transition note's shape`);
      ok(!present(md, m?.params.wrong_if), `seq ${m?.seq}'s wrong_if survives ANYWHERE after its op was deleted`);
    }
  }

  // 31.8 — the bank's EXCLUDED fields. The rubric and the research commentary are about the question,
  // not about this product, so they have no route to a PRD. Positive control beside it, so this cannot
  // pass because the bank was never read. (Mirrors group 30 case 11's "the rubric never reaches the
  // browser".)
  {
    const ids = [...new Set(PRD_RECORDS.map((r) => r.params.question_id).filter((id) => typeof id === "string"))];
    ok(ids.length >= 5, `the fixture only names ${ids.length} banked question(s) — too few to prove an exclusion`);
    for (const id of ids) {
      const q = questionById(id);
      ok(q, `the fixture names "${id}", which the bank does not hold`);
      ok(!present(doc, q.weakAnswer), `"${id}"'s weakAnswer — the agent's scoring rubric — reached the PRD`);
      if (q.note) ok(!present(doc, q.note), `"${id}"'s note — the researcher's commentary about the question — reached the PRD`);
      if (q.provenanceNote) ok(!present(doc, q.provenanceNote), `"${id}"'s provenanceNote reached the PRD`);
      ok(present(doc, q.text) && present(doc, q.attribution) && doc.includes(q.label), `"${id}"'s text, attribution or label is ABSENT — the exclusions above would then pass because the bank was never read`);
    }
    ok(!doc.includes("weakAnswer") && !doc.includes("provenanceNote"), "a bank field NAME appears on the page — the projection is spilling the entry rather than narrowing it");
  }

  // 31.9 — hostile answer text stays inert. All human text renders as a blockquote, and the one route
  // into a table (a `|` inside an applier-accepted URL) keeps its column count.
  {
    const hostile = PRD_ANSWERS.find((a) => a.text === HOSTILE);
    ok(hostile, "the hostile answer is not in the fixture");
    ok(same(headings(doc), SECTIONS.map((r) => r.heading)), "the hostile answer's `# ` and `## ` lines became headings");
    for (const line of HOSTILE.split("\n")) ok(doc.includes(line === "" ? "\n>\n" : `> ${line}`), `the hostile answer's line ${JSON.stringify(line)} is not inside a blockquote — a fence or a heading could escape`);
    const evBody = String(sectionBody(doc, "Evidence"));
    const rows = evBody.split("\n").filter((l) => l.startsWith("|"));
    const cells = rows.map((r) => r.split(/(?<!\\)\|/).length);
    ok(rows.length >= 3 && new Set(cells).size === 1, `the Evidence table's rows split into ${JSON.stringify(cells)} cells — a pipe inside a URL added a column`);
    ok(evBody.includes(esc(HOSTILE_URL)), "the pipe-carrying URL is not escaped in the Evidence table");
  }

  // 31.10 — determinism and purity. The clock is the determinism trap, so every ISO date on the page
  // must be one run.json already carried.
  {
    ok(project() === project(), "two projections of the same package are not byte-identical");
    const runJson = JSON.stringify(PRD_RUN);
    for (const m of doc.match(/\d{4}-\d{2}-\d{2}T[\d:.]*Z?/g) ?? []) ok(runJson.includes(m), `the page carries the date ${m}, which run.json does not — a clock crept into the projection (R5)`);
    const before = [JSON.stringify(PRD_RUN), JSON.stringify(PRD_ANSWERS), JSON.stringify(PRD_RECORDS)];
    project();
    ok(same(before, [JSON.stringify(PRD_RUN), JSON.stringify(PRD_ANSWERS), JSON.stringify(PRD_RECORDS)]), "projectPrd mutated its input");
  }

  // 31.11 — the refusals and totality. Each broken line is matched against the value it must name; a
  // gate that throws the right number of times with the wrong messages is a gate nobody can debug.
  {
    const rec = (seq) => JSON.parse(JSON.stringify(PRD_RECORDS.find((r) => r.seq === seq)));
    const decSeq = PRD_RECORDS.find((r) => r.op === "record_decision").seq;
    const openSeq = PRD_RECORDS.find((r) => r.op === "open_question").seq;
    const evSeq = PRD_RECORDS.find((r) => r.op === "file_evidence").seq;
    const patch = (seq, over) => { const r = rec(seq); return { ...r, ...over, params: { ...r.params, ...(over.params ?? {}) } }; };
    const paramless = (seq, drop) => { const r = rec(seq); delete r.params[drop]; return r; };
    // A decision line free of BOTH other cross-references, so re-seqing it for the supersedes cases
    // below cannot make its own evidence_refs or parent_id resolve somewhere new and refuse first.
    const free = (seq, over = {}) => { const r = rec(decSeq); return { ...r, seq, supersedes: null, ...over, params: { ...r.params, parent_id: null, evidence_refs: [] } }; };
    // The two transcript line types readPackage filters out, copied from discovery/README.md §File shapes.
    const TEXT_LINE = { type: "text", ts: "2026-08-29T09:00:00.000Z", turn: "t7", text: "…what the agent said…" };
    const DENIED_LINE = { type: "denied", ts: "2026-08-29T09:00:00.000Z", turn: "t7", tool: "Read", input: { file_path: "…" }, error: "…the fence's message…" };
    const REFUSALS = [
      ["a seq of 0", [patch(evSeq, { seq: 0 })], ["op line 0", "seq 0"]],
      ["a repeated seq", [patch(evSeq, { seq: 1 }), patch(evSeq, { seq: 1 })], ["op line 1", "seq 1"]],
      ["a decreasing seq", [patch(evSeq, { seq: 2 }), patch(evSeq, { seq: 1 })], ["op line 1", "seq 1", "seq 2"]],
      ["a non-integer seq", [patch(evSeq, { seq: 1.5 })], ["op line 0", "1.5"]],
      ["an unknown verb", [patch(evSeq, { op: "record_vibes" })], ["op line 0", "record_vibes", ...DISCOVERY_OPS]],
      ["an absent param key", [paramless(decSeq, "wrong_if")], ["record_decision", "wrong_if", "absent"]],
      ["an extra param key", [patch(decSeq, { params: { smuggled: 1 } })], ["record_decision", "smuggled", "unknown"]],
      ["a level off the ladder", [patch(decSeq, { params: { level: "vibes" } })], ["record_decision", "vibes", ...LEVELS]],
      ["a provenance off the list", [patch(evSeq, { params: { provenance: "vibes" } })], ["file_evidence", "vibes", ...PROVENANCE]],
      ["a name beside a url", [patch(evSeq, { params: { name: "x" } })], ["file_evidence", "name", "url"]],
      ["an empty name", [patch(evSeq, { params: { url: null, ref: "a2", name: "" }, })], ["file_evidence", "name"]],
      ["a source off the list", [patch(openSeq, { params: { source: "vibes" } })], ["open_question", "vibes", ...SOURCES]],
      ["a smuggled flag", [patch(evSeq, { flagged: ["smuggled"] })], ["op line 0", "smuggled", ...FLAGS]],
      ["a non-array flagged", [patch(evSeq, { flagged: "orphan" })], ["op line 0", "flagged"]],
      ["a non-boolean closes", [patch(evSeq, { closes: "yes" })], ["op line 0", "closes"]],
      ["a string supersedes", [patch(evSeq, { supersedes: "1" })], ["op line 0", "supersedes"]],
      ["a real text line", [TEXT_LINE], ["op line 0", '"text"', "not one of"]],
      ["a real denied line", [DENIED_LINE], ["op line 0", '"denied"', "not one of"]],
      ["a non-object line", [null], ["op line 0"]],
      ["a non-array ledger", "nope", ["array"]],
      // The CROSS-REFERENCES. Rendering "*Parent:* seq 1 (undefined)" is the failure these forbid:
      // the guard's whole point is refusing by name rather than projecting nonsense.
      ["a parent_id naming a file_evidence", [rec(evSeq), patch(decSeq, { seq: 2, params: { parent_id: 1 } })], ["op line 1", "parent_id 1", "file_evidence", "record_decision"]],
      ["an evidence_ref naming a record_decision", [rec(evSeq), patch(decSeq, { seq: 2, params: { evidence_refs: [2] } })], ["op line 1", "evidence_ref 2", "record_decision", "file_evidence"]],
      ["a claim_ref naming a file_evidence", [rec(evSeq), patch(evSeq, { seq: 2, params: { claim_ref: 1 } })], ["op line 1", "claim_ref 1", "file_evidence", "record_decision"]],
      ["a string parent_id", [patch(decSeq, { params: { parent_id: "1" } })], ["record_decision", "parent_id", '"1"']],
      ["a non-array evidence_refs", [patch(decSeq, { params: { evidence_refs: "1" } })], ["record_decision", "evidence_refs", "array"]],
      // `supersedes` is the cross-reference that DRIVES the three whole-ledger surfaces' markers, so
      // it is checked like the three above plus two rules the others do not need: the applier builds
      // it from findLast over the ops already filed, so it is always strictly earlier, and no two
      // records can name the same one. The collision is the sharp case — supersededBy is a Map, so
      // last-write-wins would leave the loser's kill criterion in Success metrics unmarked, which is
      // the very failure the markers exist to prevent.
      ["a supersedes naming a file_evidence", [rec(evSeq), free(2, { supersedes: 1 })], ["op line 1", "supersedes 1", "file_evidence", "record_decision"]],
      ["a self-supersede", [free(1, { supersedes: 1 })], ["op line 0", "seq 1", "supersedes 1", "EARLIER"]],
      ["a forward supersedes", [free(1, { supersedes: 9 })], ["op line 0", "supersedes 9", "EARLIER"]],
      ["two records superseding the same seq", [free(1), free(2, { supersedes: 1 }), free(3, { supersedes: 1 })], ["op line 2", "seq 3", "supersedes 1", "seq 2 already supersedes"]],
    ];
    for (const [label, lines, needles] of REFUSALS) {
      const r = names(() => checkOpLines(lines), ...needles);
      ok(r === null, `checkOpLines must refuse ${label}: ${r}`);
    }
    ok(same(checkOpLines(PRD_RECORDS), PRD_RECORDS) && checkOpLines(PRD_RECORDS) !== PRD_RECORDS, "checkOpLines must return the same lines as a NEW array — the positive control for every refusal above");
    // An ABSENT seq stays tolerated: renderDecision's "not in this ledger" branch is deliberate and
    // this guard never re-derives history. Only the WRONG KIND is refused.
    ok(threw(() => checkOpLines([patch(decSeq, { params: { parent_id: 99, evidence_refs: [98] } })])) === null, "checkOpLines refused a DANGLING parent_id / evidence_ref — an absent seq renders as \"not in this ledger\" on purpose, and only a wrong-KIND reference is a corruption");
    // The POSITIVE CONTROLS for the four supersedes refusals, so the new rules cannot be silently
    // over-tight: the applier's own shape is a CHAIN (A←B←C, each naming its direct predecessor),
    // and a supersedes whose seq is absent but EARLIER is tolerated exactly as a dangling parent_id
    // is. Without these two, refusing everything would pass the battery above.
    const chain = [free(1), free(2, { supersedes: 1 }), free(3, { supersedes: 2 })];
    ok(threw(() => checkOpLines(chain)) === null, `checkOpLines refused a legitimate A←B←C supersede chain — each record naming its DIRECT predecessor is the chain the real applier builds from findLast, and these lines carry no parent_id or evidence_refs so only the supersedes rules are under test — ${threw(() => checkOpLines(chain))?.message}`);
    ok(threw(() => checkOpLines([free(1), free(7, { supersedes: 5 })])) === null, "checkOpLines refused a DANGLING supersedes — an absent-but-earlier seq is the same tolerated partial ledger as a dangling parent_id, and this guard never re-derives history");
    // Totality: junk in, a plain Error out. No taxonomy, no TypeError leaking from a destructure.
    const JUNK = [null, undefined, 0, "x", [], {}, { run: null }, { run: {} }, { run: { slug: "" } }, { run: { slug: "s" }, answers: null }, { run: { slug: "s" }, answers: [], ops: null }, { run: { slug: "s" }, answers: [], ops: [{}] }];
    for (const j of JUNK) {
      const e = threw(() => projectPrd(j));
      ok(e !== null && e.constructor === Error, `projectPrd(${JSON.stringify(j)}) ${e === null ? "did not throw" : `threw a ${e.constructor.name}, not a plain Error`}`);
    }
    // An unresolvable answer_ref is an explicit marker, never silence — silence would hide a
    // corrupted package behind a plausible PRD.
    {
      const md = projectPrd({ run: PRD_RUN, answers: [], ops: PRD_RECORDS });
      ok(md.includes("is not in answers.jsonl"), "an answer_ref that does not resolve rendered as silence rather than an explicit marker");
    }
  }

  // 31.12 — run.json is NOT a closed shape. The real spine package carries a `posture` the README does
  // not document, and branch / endedAt / sessionId are legitimately null. Interpolating a missing
  // field is the likeliest visible bug this module can ship (R6).
  {
    for (const key of ["posture", "branch", "endedAt", "model", "turnStats"]) {
      const run = { ...PRD_RUN };
      delete run[key];
      const md = projectPrd({ run, answers: PRD_ANSWERS, ops: PRD_RECORDS });
      ok(same(headings(md), SECTIONS.map((r) => r.heading)), `stripping run.${key} lost a section heading`);
      ok(!/\bundefined\b/.test(md), `stripping run.${key} put "undefined" on the page`);
    }
    ok(!/\bundefined\b/.test(doc), 'the happy projection carries "undefined" — the same one-line guard, on the happy path');
    for (const k of ["slug", "label", "entryMode", "depth", "frontEnd"]) ok(doc.includes(String(PRD_RUN[k])), `run.${k} is not on the page — the tolerance above would then pass because the header is never rendered`);
    ok(doc.includes("branch none") && doc.includes("ended 2026-08-29T09:40:00.000Z"), "a null branch must read `none` and a set endedAt must render — an `open` here would mean the field is not read");
    // The two summary lines pinned WHOLE, built from the fixture. Pinning five of the header's twelve
    // fields left provenance / model / posture / the turn count free to be replaced with anything,
    // and the document's own summary of its ledger was read by nothing at all.
    const line = (prefix) => doc.split("\n").find((l) => l.startsWith(prefix)) ?? null;
    const runLine = `**Run** — \`${PRD_RUN.slug}\` · ${PRD_RUN.provenance} (${PRD_RUN.label}) · entry ${PRD_RUN.entryMode}`
      + ` · depth ${PRD_RUN.depth} · branch none · front end ${PRD_RUN.frontEnd} · model ${PRD_RUN.model}`
      + ` · posture ${PRD_RUN.posture} · started ${PRD_RUN.startedAt} · ended ${PRD_RUN.endedAt} · ${PRD_RUN.turnStats.length} turn(s)`;
    ok(line("**Run**") === runLine, `the Run line is ${JSON.stringify(line("**Run**"))} — every field run.json carries must be on it: ${JSON.stringify(runLine)}`);
    const count = (fn) => PRD_RECORDS.filter(fn).length;
    const ledgerLine = `**Ledger** (whole ledger, superseded records included) — ${PRD_RECORDS.length} op(s): ${DISCOVERY_OPS.map((v) => `${v} ${count((r) => r.op === v)}`).join(" · ")}`
      + ` · flags: ${FLAGS.map((f) => `${f} ${count((r) => r.flagged.includes(f))}`).join(" · ")}`;
    ok(line("**Ledger**") === ledgerLine, `the Ledger line is ${JSON.stringify(line("**Ledger**"))} — the document's own summary of its ledger must count every op and every flag: ${JSON.stringify(ledgerLine)}`);
    ok(projectPrd({ run: { ...PRD_RUN, endedAt: null }, answers: PRD_ANSWERS, ops: PRD_RECORDS }).includes("ended open"), "a null endedAt must read `open`");
  }

  // 31.13 — AN OP PARAM CANNOT ADD A SECTION. blockquote() covers the human's answer; an op param is
  // AGENT-AUTHORED and reaches the page as markdown STRUCTURE (`*Wrong if:* …`, a `#### ` heading, a
  // table cell), so a newline inside one opens a heading the ops do not carry, and a reader cannot
  // tell the projection did not assign that claim to that section. Driven over EVERY string-ish param
  // of every record and every string field of run.json, so a renderer that interpolates a NEW value
  // raw fails here rather than shipping. Containment is a fold OR a refusal by name — both count.
  {
    // Driven over ALL THREE of CommonMark's line endings. A fold that strips only LF leaves CR and
    // CRLF opening real headings, and CRLF is worse than a miss: the space the fold inserts becomes
    // ONE leading space before `##`, which ATX tolerates. That is not an adversarial string — it is
    // what any answer pasted from Word, Outlook or a Windows editor carries, and ops.mjs validates
    // wrong_if / reason / missing[] as non-empty strings and judges their text never.
    const EOLS = [["LF", "\n"], ["CR", "\r"], ["CRLF", "\r\n"]];
    const smuggle = (eol) => `${eol}${eol}## Smuggled section${eol}${eol}#### seq 99 · a smuggled block${eol}${eol}- a claim no op carries`;
    const SMUGGLE = smuggle("\n");
    const WANT = SECTIONS.map((r) => r.heading);
    // Containment is EXACT and it is two-sided: none of the payload's lines may BEGIN a line of the
    // output (that is what makes it structure), and the payload must still be THERE (folding contains
    // a claim, it never deletes one — the no-truncation rule). Counting "## " headings alone is not
    // enough: a smuggled `#### ` would forge a decision block, and asserting the block COUNT is not
    // enough either, because injecting into a question_id legitimately re-keys the supersede rule.
    const STRUCTURE = ["## Smuggled section", "#### seq 99", "- a claim no op carries"];
    // Split on all three line endings and tolerate ATX's up-to-three leading spaces, for the same
    // reason `headings()` above does: a CRLF payload folded to " ## …" is structure a reader obeys,
    // and a splitter that only knows `\n` cannot see a bare-CR line at all.
    const opened = (md) => md.split(/\r\n|\r|\n/).filter((l) => STRUCTURE.some((x) => l.replace(/^ {1,3}/, "").startsWith(x)));
    ok(same(headings(doc), WANT) && opened(doc).length === 0 && doc.includes("## Smuggled section"), `the fixture's own multi-line reason is not contained-and-kept — headings ${JSON.stringify(headings(doc))}, opened ${JSON.stringify(opened(doc))}, present ${doc.includes("## Smuggled section")}. Every case below is meaningless until the happy page holds`);
    for (const [name, eol] of EOLS) {
      const PAYLOAD = smuggle(eol);
      let folded = 0;
      let refused = 0;
      PRD_RECORDS.forEach((r, i) => {
        for (const [k, v] of Object.entries(r.params)) {
          const hostile = typeof v === "string" ? `${v}${PAYLOAD}`
            : Array.isArray(v) && v.length && v.every((x) => typeof x === "string") ? [...v.slice(0, -1), `${v[v.length - 1]}${PAYLOAD}`]
              : null;
          if (hostile === null) continue;
          const ops = PRD_RECORDS.map((o, j) => (j === i ? { ...o, params: { ...o.params, [k]: hostile } } : o));
          let md;
          // A refusal BY NAME is containment; a renderer crashing is not, and counting one as the
          // other would make this case pass for exactly the reason it exists to rule out.
          try { md = project(ops); } catch (e) {
            ok(e.constructor === Error && String(e.message).startsWith("prd-projection:"), `seq ${r.seq}'s "${k}" (${name}) made the projection throw a ${e.constructor.name} that does not name itself — ${JSON.stringify(String(e.message).slice(0, 120))}. A crash is not containment`);
            refused += 1;
            continue;
          }
          folded += 1;
          ok(same(headings(md), WANT), `seq ${r.seq}'s "${k}" opened a "## " heading with ${name} line endings — ${JSON.stringify(headings(md))}. An op param must be folded onto one line before it reaches the page, and CommonMark has three line endings, not one`);
          ok(opened(md).length === 0, `seq ${r.seq}'s "${k}" put ${JSON.stringify(opened(md))} at the START of a line with ${name} line endings — folded text is inert, structure at column 0 (or under ATX's three-space indent) is not`);
          ok(md.includes("## Smuggled section"), `seq ${r.seq}'s "${k}" (${name}) lost the injected text entirely — the fold CONTAINS a claim, it never deletes one (R3)`);
        }
      });
      ok(folded >= 25 && refused >= 10, `with ${name} line endings only ${folded} param(s) reached a renderer and ${refused} were refused — this case ITERATES the params, so a new one must be driven (the three enums are the refusals)`);
      // run.json's header is the same class and is not an op at all: field() interpolates it raw, and
      // the title at the top of the page does not even go through field().
      for (const k of ["slug", "root", "label", "provenance", "entryMode", "depth", "frontEnd", "model", "posture"]) {
        const md = projectPrd({ run: { ...PRD_RUN, [k]: `${PRD_RUN[k]}${PAYLOAD}` }, answers: PRD_ANSWERS, ops: PRD_RECORDS });
        ok(same(headings(md), WANT) && opened(md).length === 0, `run.${k} opened ${JSON.stringify(opened(md))} with ${name} line endings — the run header is interpolated raw too, and the page title does not even go through field()`);
      }
    }
    // The human's ANSWER is the other half and it does NOT go through fold() — blockquote() is its
    // containment, and it split on `\n` alone for the same reason fold() did. A bare CR inside an
    // answer escaped the quote entirely.
    for (const [name, eol] of EOLS) {
      const hostile = PRD_ANSWERS.map((a, i) => (i === 0 ? { ...a, text: `${a.text}${smuggle(eol)}` } : a));
      const md = projectPrd({ run: PRD_RUN, answers: hostile, ops: PRD_RECORDS });
      ok(same(headings(md), WANT) && opened(md).length === 0, `an answer carrying ${name} line endings opened ${JSON.stringify(opened(md))} / headings ${JSON.stringify(headings(md))} — blockquote() is the containment for ALL arbitrary human text, on every line ending`);
      ok(md.includes("## Smuggled section"), `the ${name} answer lost its injected text — the blockquote CONTAINS text, it never deletes it`);
    }
  }

  group("prd projection", `SECTIONS frozen at BOTH levels by mutation with eleven DISTINCT declared empty states and an exact key set per row · the table iterated against LEVELS and OPS in both directions — a fifth rung or a fifth verb with no home fails BY NAME, and record_decision is claimed by the ladder rows collectively · NON_GOAL_QUESTIONS and METRIC_STAGE each resolved through the bank, so a rename goes red here instead of silently emptying a section · the positive control first: a fixture package built by running the REAL applier over hand-authored ops, projecting to one "## " heading per row in table order with the honesty header and the architecture placeholder · every record's distinguishing claim asserted present, iterated over the RECORDS so an op kind with no renderer fails by name, and nothing truncated · both flags proven INLINE on the record that carries them and proven READ rather than re-derived, by blanking one record's flagged and watching the markers vanish from its block · the hierarchy naming every rung, each child its parent's seq, the orphan marked and the counts line pinned · the supersede READ: the latest renders, the replaced is NAMED and gets no block of its own, and neither is removed, with the superseding op given a DISTINCT wrong_if so the assertion cannot pass on the replacement's own block · the three whole-ledger surfaces proven to KEEP the replaced record and MARK it, driven by flagging it so the "orphan 2" / "orphans 1" divergence is real and the Ledger line's own set-naming is load-bearing · THE VANISHING CLAIM — each of the four rungs deleted in turn, its section falling back to its own declared empty string and every deleted wrong_if gone from the WHOLE document, plus the empty-ops projection keeping every heading while carrying no claim and no answer although all nine answers were passed in, plus the transition note driven both directions, plus Success metrics' STAGE filter driven both directions — its fallback is the one state no other assertion on the page can see, so a filter matching nothing would stay green everywhere else · the bank's weakAnswer, note and provenanceNote proven ABSENT over every question the fixture names, with text / attribution / label present as the positive control · hostile answer text kept inert — a fence, a "# " and a "## " line inside a blockquote add no heading, and a pipe inside an applier-accepted URL does not add a table column · byte-identical determinism with every ISO date on the page pinned to run.json's own, and purity by JSON compare · 27 corrupted-ledger refusals each matched against the value it must name, the cross-references — parent_id, evidence_refs, claim_ref and supersedes — each naming the KIND it resolves to with a DANGLING one of each proven TOLERATED, and supersedes additionally refused when it names itself, names a later seq or is claimed by a second record, against a legitimate A←B←C chain proven to still pass, including a REAL text line and a REAL denied line refused by their type, twelve junk inputs each a plain Error, and an unresolvable answer_ref rendering an explicit marker rather than silence · run.json tolerated with five fields stripped in turn, "undefined" never on the page, with the Run line and the Ledger line each pinned WHOLE — every header field and every op and flag count — as the positive control · and AN OP PARAM CANNOT ADD A SECTION: a "## " / "#### " / "- " payload injected into every string-ish param of every record and every string field of run.json in turn, over ALL THREE of CommonMark's line endings (LF, CR and the CRLF pair — CRLF is the sharp one, because folding only its LF leaves the CR as a bare line ending AND inserts the single leading space ATX still reads as a heading), each contained by a fold or refused by name, asserted three ways (the heading list unchanged, no payload line at column 0 or under ATX's three-space indent, and the text still PRESENT because a fold contains a claim rather than deleting one), with one committed op carrying a real multi-line reason so the happy page holds it too, plus the human ANSWER half driven over the same three endings because blockquote(), not the fold, is its containment. What it cannot reach: the filesystem half (readPackage, writePrd, its refuse-to-overwrite rule and the CLI) — deliberately not imported, in-memory on purpose, and exercised by the ticket's mktemp -d run instead; and a projection of a FULL-WIDTH run package, which does not exist until #289 lands, so the fixture is hand-authored and labelled as such in the file`);
}

// --- 32 · the parenting fixture (#341) ------------------------------------------------------------
// THE FIXTURE IS ON DISK, where group 31's is inline, and the difference is the point. Group 31's
// fixture is hand-authored ops and must never look like a run, so it lives in this file. This one IS
// a run — discovery/instrument-loans-1/, a real opening-set session recorded through the portal's
// drawer over the answer sheet pre-registered in .claude/plans/discovery-parent-id-341.md — and
// hand-authoring it would be the honesty violation discovery/README.md forbids. Nothing here writes
// under discovery/; the group only reads.
//
// WHAT IT PROVES: in one recorded session, the agent named a parent every time one existed at the
// rung above (auditParenting's `missed` is empty and `eligible` is not), every named parent was in its
// candidate set at the moment of filing, the committed op lines are exactly what the applier
// produces over the committed answers, every turn ran under the prompt surface in the tree, and the
// projected Requirement hierarchy renders as a ladder from a real run. The rehearsal this ticket
// answers filed null on 18 of 18 eligible decisions with every pure gate green.
//
// WHAT IT CANNOT: the model's behaviour under an UNCHANGED prompt on a later date, or under a newer
// SDK. It observes ONE recording. The fingerprint (32.2a) makes a prompt edit fail here by name until
// the fixture is re-recorded; the operator-run probe (discovery-transport.mjs --probe-parenting) is
// the one-turn re-observation for everything the fingerprint cannot see. Re-record procedure:
// discovery/README.md §The parenting fixture.
{
  const threw = (fn) => { try { fn(); return null; } catch (e) { return e; } };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const FIXTURE_SLUG = "instrument-loans-1";
  const root = join(ROOT, "discovery", FIXTURE_SLUG);

  // 32.1 — the detector can fail: the audit over applier-shaped SYNTHETIC records, a miss reported
  // before the fixture is trusted (group 11 / 28.9's mutation idiom). Legitimate test input the way
  // group 29's rows are, and nothing here is presented as a run.
  {
    const ctx = { answers: [{ ref: "a1" }, { ref: "a2" }, { ref: "a3" }], bank: [{ id: "q1" }, { id: "q2" }] };
    const d = (question_id, answer_ref, level, parent_id, turn) => ({ op: "record_decision", params: { question_id, answer_ref, level, parent_id, evidence_refs: [], wrong_if: `wrong if ${turn}`, off_script: false }, turn });
    const missed = applyDiscoveryOps([d("q1", "a1", "business", null, "t1"), d("q2", "a2", "stakeholder", 1, "t2"), d("q1", "a3", "solution", null, "t3")], ctx).ops;
    ok(same(auditParenting(missed), { eligible: [2, 3], missed: [3], structural: [] }), `32.1: a solution filed null with a stakeholder at seq 2 in the ledger audits as ${JSON.stringify(auditParenting(missed))} — the detector cannot detect, so the fixture below proves nothing`);
    const parented = applyDiscoveryOps([d("q1", "a1", "business", null, "t1"), d("q2", "a2", "stakeholder", 1, "t2"), d("q1", "a3", "solution", 2, "t3")], ctx).ops;
    ok(same(auditParenting(parented), { eligible: [2, 3], missed: [], structural: [] }), `32.1: a solution naming seq 2 audits as ${JSON.stringify(auditParenting(parented))} — a named parent must clear the miss`);
  }

  // 32.2 — the package exists and describes itself as the fixture. FAILS BY NAME when absent — never
  // skips: a skipped fixture is the check that cannot fail.
  ok(existsSync(join(root, "run.json")), `no run package at discovery/${FIXTURE_SLUG} — record it through the drawer per .claude/plans/discovery-parent-id-341.md Phase 4; this group never skips`);
  const pkg = existsSync(join(root, "run.json")) ? readPackage(root) : null;
  if (pkg) {
    const run = pkg.run;
    ok(run.slug === FIXTURE_SLUG && run.provenance === "fictional" && run.root === `discovery/${FIXTURE_SLUG}` && run.depth === "opening-set" && run.frontEnd === "portal" && run.posture === "think" && typeof run.endedAt === "string",
      `32.2: run.json does not describe the fixture — want slug ${FIXTURE_SLUG} · fictional · opening-set · portal · think · ended; got ${JSON.stringify({ slug: run.slug, provenance: run.provenance, root: run.root, depth: run.depth, frontEnd: run.frontEnd, posture: run.posture, endedAt: run.endedAt })}`);
    // 32.2a — THE FRESHNESS TRIPWIRE. Every turn ran under the CURRENT prompt surface, or the
    // recording proves nothing about the prompt in the tree. Twelve turns closed, one hash. A
    // re-submit on a turn the agent yielded without closing (R2 permits it) adds an entry for the same
    // turn, so the count is of DISTINCT turns, not entries.
    const turnStats = run.turnStats ?? [];
    const wantTurns = selectDepth("opening-set").map((_, i) => `t${i + 1}`);
    ok(same([...new Set(turnStats.map((t) => t.turn))], wantTurns), `32.2a: the fixture's turnStats cover turns ${[...new Set(turnStats.map((t) => t.turn))].join(", ")}, not ${wantTurns.join(", ")} — a turn is missing or the run was not finished`);
    const stamps = turnStats.map((t) => t.postureFingerprint);
    ok(stamps.every((s) => s === POSTURES.think.fingerprint), `32.2a: the Think prompt surface changed since the fixture was recorded (fixture ${[...new Set(stamps)].map((s) => String(s).slice(0, 8)).join(", ")} vs current ${POSTURES.think.fingerprint.slice(0, 8)}) — run the probe, then re-record it (discovery/README.md §The parenting fixture)`);
    // 32.3 — the ledger is the applier's, not a hand's: re-fold { op, params, turn } through the REAL
    // applier over the package's own answers and the REAL bank, and compare record by record with
    // the committed op lines (the README's drift detector). It catches a line the applier would not
    // produce — a wrong-rung parent, a dangling ref, a derived field out of step with its params. A
    // valid-to-valid param edit re-folds clean and is NOT caught here: the applier reproduces what it
    // is handed, so that class is the server's write and the git history's to guard (PR #342 F1).
    const refold = threw(() => applyDiscoveryOps(pkg.ops.map(({ op, params, turn }) => ({ op, params, turn })), { answers: pkg.answers, bank: BANK }));
    ok(refold === null, `32.3: the committed op lines do not re-fold through the applier — ${refold?.message}`);
    if (refold === null) {
      const records = applyDiscoveryOps(pkg.ops.map(({ op, params, turn }) => ({ op, params, turn })), { answers: pkg.answers, bank: BANK }).ops;
      ok(records.length === pkg.ops.length, `32.3: the re-fold produced ${records.length} records for ${pkg.ops.length} op lines`);
      records.forEach((r, i) => ok(same(r, pkg.ops[i]), `32.3: committed op line ${i} (seq ${pkg.ops[i]?.seq}) is not what the applier produces over the committed answers — a line was edited into something the applier would not produce, or the applier changed under the fixture:\n      committed ${JSON.stringify(pkg.ops[i])}\n      applier   ${JSON.stringify(r)}`));
    }
    // 32.4 — the claim. Non-vacuous first, then zero misses, then every eligible parent in its
    // candidate set at the moment of filing, then enough decisions for the run to say anything.
    const audit = auditParenting(pkg.ops);
    ok(audit.eligible.length >= 1, "32.4: the fixture exercises no parenting at all (eligible 0) — every decision was business or filed before anything above it existed; re-record");
    ok(audit.missed.length === 0, `32.4: ${audit.missed.length} decision(s) filed null while a valid parent existed: seq ${audit.missed.join(", ")} — the prompt did not hold; tighten PARENT_RULE and re-record`);
    for (const seq of audit.eligible) {
      const i = pkg.ops.findIndex((r) => r.seq === seq);
      const rec = pkg.ops[i];
      ok(rec.params.parent_id === null || parentCandidates(pkg.ops.slice(0, i), rec.params.level).includes(rec.params.parent_id), `32.4: seq ${seq} names parent ${rec.params.parent_id}, not one of its candidates at the moment of filing (${parentCandidates(pkg.ops.slice(0, i), rec.params.level).join(", ")})`);
    }
    const decisions = pkg.ops.filter((r) => r.op === "record_decision").length;
    ok(decisions >= 6, `32.4: only ${decisions} record_decision op(s) in twelve turns — a run of weak-answer flags proves nothing about parenting`);
    // 32.5 — the ladder renders as a ladder from a REAL run: the projection's hierarchy carries at
    // least one "parent: seq N" line, and the committed prd.md IS the projection's bytes — the
    // README's "never edited by hand" is a gate fact, not a statement (group 31 proves the fold
    // byte-deterministic, so the compare is free).
    const md = threw(() => projectPrd(pkg)) === null ? projectPrd(pkg) : "";
    ok(md.length > 0, `32.5: the fixture does not project — ${threw(() => projectPrd(pkg))?.message}`);
    ok(/parent: seq \d+/.test(md), "32.5: the projected Requirement hierarchy has no parented decision");
    ok(existsSync(join(root, "prd.md")), `32.5: discovery/${FIXTURE_SLUG}/prd.md is missing — generate it with node discovery/prd-projection.mjs ${FIXTURE_SLUG}`);
    if (existsSync(join(root, "prd.md"))) ok(readFileSync(join(root, "prd.md"), "utf8") === md, `32.5: discovery/${FIXTURE_SLUG}/prd.md is not the projection's bytes — the fixture's prd.md is never edited by hand; regenerate it with node discovery/prd-projection.mjs ${FIXTURE_SLUG} --force`);
    // The denied lines are the receipt of any in-turn correction; counted for the ✓ line, never
    // asserted — zero corrections and one correction are both honest recordings.
    const corrections = readTranscript(root).filter((l) => l.type === "denied" && /parent_id/.test(l.error ?? "")).length;
    group("parenting", `auditParenting proven to DETECT a miss on synthetic applier-shaped records before the fixture is trusted · discovery/${FIXTURE_SLUG} read as a package (fictional, opening-set, portal, think, ended), its ${pkg.ops.length} op lines RE-FOLDED through the real applier over the committed answers and the real bank and matched record by record · ${turnStats.length} turnStats entries over ${wantTurns.length} distinct turns, every one stamped with the CURRENT prompt-surface fingerprint ${POSTURES.think.fingerprint.slice(0, 8)}, so a prompt edit makes this recording stale BY NAME · ${decisions} decisions filed, ${audit.eligible.length} eligible for a parent, ${audit.missed.length} missed, ${audit.structural.length} structural orphan(s) (seq ${audit.structural.join(", ") || "none"}), every named parent in its candidate set at the moment of filing, ${corrections} in-turn parent correction(s) receipted as denied lines · the projected hierarchy carrying a real "parent: seq" line, prd.md the projection's bytes. What it cannot reach: a valid-to-valid param edit to a committed op line (the applier reproduces what it is handed — the server's write and the git history are that guard), and the model's behaviour under an UNCHANGED prompt on a later date, or under a newer SDK — this is one recorded session; the operator-run probe (portal/lib/discovery-transport.mjs --probe-parenting) is the one-turn re-observation for that`);
  } else {
    group("parenting", "");   // unreachable on the ✓ path: the ok() above already recorded the failure
  }
}


// --- 33 · the graded answer fixture (#348) --------------------------------------------------------
// The PURE half of .claude/plans/discovery-graded-answer-fixture-348.md: the sealed draw, the sealed
// key's validator, the scorer, the byte-equality check, and — the part that is a control rather than a
// mechanism — the ANSWER AUTHOR'S FENCE, source-pinned, plus the mirror fence that keeps the key away
// from the judge.
//
// WHY A CONTROL NEEDS A GATE. The fixture's whole worth rests on the answer author never having seen a
// question's weak-answer note. An author who has seen it writes K2 answers thin in exactly the way the
// note names, and the score then measures the author rather than the judge. That is a property of a
// build-time script's wiring, which nothing else in this repo can see, so it is pinned here from
// source and driven through the real allowsPath.
//
// SDK-free like groups 8, 29 and 30, and for the same reason: tooling/discovery-score.mjs imports only
// node built-ins plus discovery/bank.mjs and discovery/ops.mjs, both import-free, so this group loads
// where portal/node_modules does not exist. portal/record-graded-answers.mjs DOES import the SDK and is
// therefore read here as TEXT, never as a module.
//
// WHAT IT CANNOT REACH: whether the author agent actually obeyed the brief, and whether a K2 answer is
// thin in the way its own weak-answer note names — both are review facts against the committed key. Nor
// whether a fence DENY stopped a call at run time: that is the author run's own `denied` lines, the same
// standard --probe-fence sets. Nor the MVP 6 verdict, which is a human read of the shortlist.
{
  const threw33 = (fn) => { try { fn(); return null; } catch (e) { return e; } };
  const same33 = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const IDS = selectDepth("whole-bank").map((q) => q.id);
  const FIXTURE = join(ROOT, "docs/epics/fixtures/graded-answers");
  const GRADED_SLUGS = ["graded-think-a", "graded-think-b", "graded-think-c", "graded-opus-a", "graded-opus-b", "graded-opus-c"];
  // Whole-line comments and block comments only — a trailing comment on a code line survives, so the
  // pinned tokens below are never written as trailing comments in the files they pin.
  const decomment = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  const pending33 = [];

  // 33.1 — THE DRAW IS A LATIN SQUARE AND IT IS SHARED ACROSS POSTURES. Over the real 65 ids: every
  //        row holds all three kinds (coverage), every column holds all three (no uniform stream the
  //        judge could read instead of the answer), and the committed draw.json re-derives from its own
  //        seed byte for byte. The ARITY pin is the load-bearing one: drawFor takes (seed, ids) and no
  //        posture, so graded-think-a and graded-opus-a resolve to the SAME column and therefore the
  //        same 65 answers — which is what makes the posture comparison a one-answer-set comparison.
  //        Mutations: change one row's `b` in draw.json → red naming the id; add a posture parameter →
  //        red here.
  ok(drawFor.length === 2, `33.1: drawFor takes ${drawFor.length} parameters, not 2 — one draw table serves BOTH postures, so a posture argument (or a default value, which stops Function.length) would give think and opus different answer sets and no gate downstream could see it`);
  {
    const d = drawFor("gate-seed", IDS);
    ok(d.table.length === IDS.length, `33.1: the draw over the real bank has ${d.table.length} rows, not ${IDS.length}`);
    for (const row of d.table) ok(new Set(RUNS.map((r) => row[r])).size === KINDS.length, `33.1: ${row.id} does not meet all three kinds across the three runs (${RUNS.map((r) => row[r]).join(", ")})`);
    for (const r of RUNS) ok(new Set(d.table.map((row) => row[r])).size === KINDS.length, `33.1: run column ${r} holds only ${[...new Set(d.table.map((row) => row[r]))].join(", ")} — a uniform column lets the judge read the stream rather than the answer`);
    ok(existsSync(join(FIXTURE, "draw.json")), "33.1: docs/epics/fixtures/graded-answers/draw.json is missing — generate it with node tooling/discovery-score.mjs --draw --seed <seed>");
    if (existsSync(join(FIXTURE, "draw.json"))) {
      const committed = JSON.parse(readFileSync(join(FIXTURE, "draw.json"), "utf8"));
      const e = threw33(() => checkDraw(committed, IDS));
      ok(e === null, `33.1: the committed draw does not match its own seed — ${e?.message}`);
      for (const row of committed.table) ok(new Set(RUNS.map((r) => row[r])).size === KINDS.length, `33.1: committed draw row ${row.id} does not meet all three kinds`);
      for (const r of RUNS) ok(new Set(committed.table.map((row) => row[r])).size === KINDS.length, `33.1: committed run column ${r} is uniform`);
    }
  }

  // 33.2 — deterministic and frozen at BOTH levels. Object.freeze is shallow, and a pushable row would
  //        make the frozen-by-mutation case pass for the wrong reason (ops.mjs PARAMS' own comment).
  {
    ok(same33(drawFor("s", IDS), drawFor("s", IDS)), "33.2: two calls with the same seed must be deep-equal — the draw is re-derived by the gate from a committed seed");
    ok(!same33(drawFor("s", IDS).table, drawFor("t", IDS).table), "33.2: two DIFFERENT seeds produced the same table — the seed does nothing");
    const d = drawFor("s", IDS);
    const before = JSON.stringify(d);
    try { d.table.push({ id: "x", a: "K1", b: "K1", c: "K1" }); } catch { /* strict mode throws on a frozen write; the compare below decides either way */ }
    try { d.table[0].a = "K9"; } catch { /* same */ }
    try { d.seed = "other"; } catch { /* same */ }
    ok(JSON.stringify(d) === before && d.table.length === IDS.length, "33.2: a write into the draw or one of its rows must be inert");
  }

  // 33.3 — checkKey REFUSES, each on its own message. The refusal battery style is group 29's.
  {
    const good = IDS.flatMap((id) => KINDS.map((k) => ({ question_id: id, kind: k, answer: `${id} ${k} answer`, expected: EXPECTED[k] })));
    const wrap = (entries) => ({ generatedFor: "#348", authoredAt: "2026-01-01T00:00:00.000Z", entries });
    ok(threw33(() => checkKey(wrap(good), IDS)) === null, `33.3: a well-formed key must validate — ${threw33(() => checkKey(wrap(good), IDS))?.message}`);
    ok(checkKey(wrap(good), IDS).size === IDS.length * KINDS.length, "33.3: checkKey must index every (question, kind) pair");
    const refusals = [
      ["a missing pair", wrap(good.slice(0, -1)), /entries, not 195|no entry for/],
      ["a duplicate pair", wrap([...good.slice(0, -1), { ...good[0] }]), /appears twice|no entry for/],
      ["an id not in the bank", wrap(good.map((e, i) => (i === 0 ? { ...e, question_id: "s9-not-a-question" } : e))), /is not in the bank/],
      ["a kind off KINDS", wrap(good.map((e, i) => (i === 0 ? { ...e, kind: "K4" } : e))), /is not one of K1/],
      ["an expected that disagrees", wrap(good.map((e, i) => (i === 0 ? { ...e, expected: "file_evidence" } : e))), /the expectation is never authored/],
      ["an empty answer", wrap(good.map((e, i) => (i === 0 ? { ...e, answer: "" } : e))), /must be a non-empty string/],
      ["a whitespace-only answer", wrap(good.map((e, i) => (i === 0 ? { ...e, answer: "   \n\t " } : e))), /must be a non-empty string/],
      ["a non-string answer", wrap(good.map((e, i) => (i === 0 ? { ...e, answer: 42 } : e))), /must be a non-empty string/],
      ["an unknown entry key", wrap(good.map((e, i) => (i === 0 ? { ...e, note: "x" } : e))), /unknown key "note"/],
      ["a missing entry key", wrap(good.map((e, i) => (i === 0 ? { question_id: e.question_id, kind: e.kind, expected: e.expected } : e))), /"answer" is required/],
      ["an unknown top-level key", { ...wrap(good), seed: "x" }, /unknown key "seed"/],
      ["a missing top-level key", { generatedFor: "#348", entries: good }, /missing "authoredAt"/],
      ["a bare array", good, /must be an object/],
    ];
    for (const [label, payload, want] of refusals) {
      const e = threw33(() => checkKey(payload, IDS));
      ok(e !== null, `33.3: ${label} must be refused`);
      if (e) ok(want.test(e.message), `33.3: ${label} was refused with the wrong message — ${e.message}`);
    }
  }

  // 33.4 — EXPECTED and CLOSES_WHEN are THE op table, iterated against OPS in both directions, so a
  //        fifth verb or a renamed one fails here BY NAME rather than silently. file_evidence is
  //        asserted as the one op no kind expects, by name.
  {
    ok(same33(Object.keys(EXPECTED), [...KINDS]), `33.4: EXPECTED is keyed ${Object.keys(EXPECTED).join(", ")}, not ${KINDS.join(", ")}`);
    for (const kind of KINDS) ok(DISCOVERY_OPS.includes(EXPECTED[kind]), `33.4: ${kind} expects "${EXPECTED[kind]}", which is not one of ${DISCOVERY_OPS.join(" · ")}`);
    ok(new Set(Object.values(EXPECTED)).size === KINDS.length, "33.4: two kinds expect the same op — the three kinds must map to three distinct closing verbs");
    ok(same33([...DISCOVERY_OPS].sort(), Object.keys(CLOSES_WHEN).sort()), `33.4: CLOSES_WHEN is keyed ${Object.keys(CLOSES_WHEN).sort().join(", ")}, not ${[...DISCOVERY_OPS].sort().join(", ")} — a verb with no closing rule would default to "does not close"`);
    const unexpected = DISCOVERY_OPS.filter((op) => !Object.values(EXPECTED).includes(op));
    ok(same33(unexpected, ["file_evidence"]), `33.4: the ops no kind expects are ${unexpected.join(", ")} — it must be exactly file_evidence, which is non-closing and is counted beside the matrix rather than in it`);
    ok(CLOSES_WHEN.file_evidence({}) === false, "33.4: file_evidence must never close a turn");
    ok(CLOSES_WHEN.flag_weak_answer({}) === true, "33.4: flag_weak_answer always closes");
    ok(CLOSES_WHEN.record_decision({ off_script: false }) === true && CLOSES_WHEN.record_decision({ off_script: true }) === false, "33.4: record_decision closes only when off_script is false");
    ok(CLOSES_WHEN.open_question({ source: "banked" }) === true && CLOSES_WHEN.open_question({ source: "off-script" }) === false, "33.4: open_question closes only from a banked source");
    ok(same33(COLUMNS, [...Object.values(EXPECTED), "no_close_filed", "no_close_silent"]), `33.4: COLUMNS is ${COLUMNS.join(", ")} — five columns, the three closing verbs plus the two ways a turn fails to close`);
  }

  // 33.5/33.6 — closingOpOf over a hand-built synthetic transcript covering every branch, and the
  //        `closes` disagreement throw. The synthetic records are applier-SHAPED and nothing here is
  //        presented as a run (group 29's rows and group 32's case 1 are the same shape of input).
  //        Mutation: drop the off_script term from CLOSES_WHEN → the off-script decision counts as a
  //        close → red.
  {
    const rec = (seq, turn, op, params) => ({ seq, turn, op, params, closes: CLOSES_WHEN[op](params), flagged: [], supersedes: null });
    const ops = [
      rec(1, "t1", "file_evidence", { url: null, ref: "a1", name: "a thread", provenance: "fictional-scenario", claim_ref: null }),
      rec(2, "t1", "record_decision", { question_id: "q1", answer_ref: "a1", level: "business", parent_id: null, evidence_refs: [1], wrong_if: "x", off_script: false }),
      rec(3, "t2", "flag_weak_answer", { question_id: "q2", answer_ref: "a2", missing: ["a number"] }),
      rec(4, "t3", "open_question", { source: "banked", question_id: "q3", answer_ref: "a3", reason: "not yet" }),
      rec(5, "t4", "record_decision", { question_id: null, answer_ref: "a4", level: "business", parent_id: null, evidence_refs: [], wrong_if: "y", off_script: true }),
      rec(6, "t4", "open_question", { source: "off-script", question_id: null, answer_ref: "a4", reason: "an aside" }),
      rec(7, "t5", "file_evidence", { url: "https://example.test/x", ref: null, name: null, provenance: "secondary-source", claim_ref: null }),
    ];
    ok(closingOpOf(ops, "t1") === "record_decision", "33.5: a banked record_decision closes its turn");
    ok(closingOpOf(ops, "t2") === "flag_weak_answer", "33.5: flag_weak_answer closes its turn");
    ok(closingOpOf(ops, "t3") === "open_question", "33.5: a banked open_question closes its turn");
    ok(closingOpOf(ops, "t4") === null, "33.5: an off_script decision and an off-script open_question close NOTHING — a turn holding only those did not close");
    ok(closingOpOf(ops, "t5") === null, "33.5: file_evidence never closes a turn");
    ok(closingOpOf(ops, "t6") === null, "33.5: a turn with no op lines at all closes nothing");
    ok(evidenceCountOf(ops, "t1") === 1 && evidenceCountOf(ops, "t2") === 0 && evidenceCountOf(ops, "t5") === 1, "33.5: file_evidence must be counted per turn");
    // 33.6 — the hand-edit detector, in both directions.
    const lie = ops.map((r) => (r.seq === 5 ? { ...r, closes: true } : r));
    const e1 = threw33(() => closingOpOf(lie, "t4"));
    ok(e1 !== null && /seq 5/.test(e1.message) && /hand edit/.test(e1.message), `33.6: a record whose closes disagrees with its params must throw naming its seq — got ${e1?.message ?? "no throw"}`);
    const lie2 = ops.map((r) => (r.seq === 3 ? { ...r, closes: false } : r));
    const e2 = threw33(() => closingOpOf(lie2, "t2"));
    ok(e2 !== null && /seq 3/.test(e2.message), `33.6: a flag_weak_answer recorded as not closing must throw — got ${e2?.message ?? "no throw"}`);
    const two = [...ops, rec(8, "t2", "open_question", { source: "banked", question_id: "q2", answer_ref: "a2", reason: "r" })];
    const e3 = threw33(() => closingOpOf(two, "t2"));
    ok(e3 !== null && /2 closing ops/.test(e3.message), `33.6: two closing ops on one turn breaks R2 and must throw — got ${e3?.message ?? "no throw"}`);
    ok(threw33(() => closingOpOf([{ seq: 1, turn: "t1", op: "record_hunch", params: {} }], "t1")) !== null, "33.6: an op line naming a verb outside OPS must throw");
  }

  // 33.7 — scorePackage's matrix SUMS TO THE TURN COUNT over a package covering all five columns, with
  //        file_evidence counted separately and ABSENT from the matrix. Mutation: fold file_evidence
  //        into the matrix → the sum exceeds the turn count → red.
  {
    const sids = IDS.slice(0, 5);
    ok(sids.length === 5 && new Set(sids.map((id) => BANK.find((q) => q.id === id)?.stage)).size >= 1, `33.7: the synthetic package needs five real bank ids (found ${sids.length}) — the per-stage breakdown resolves them through the bank`);
    const rec = (seq, turn, op, params) => ({ seq, turn, op, params, closes: CLOSES_WHEN[op](params), flagged: [], supersedes: null });
    const pkg = {
      run: { slug: "synthetic", depth: "whole-bank" },
      answers: sids.map((id, i) => ({ ref: `a${i + 1}`, turn: `t${i + 1}`, question_id: id, kind: "banked", text: `text ${i + 1}` })),
      ops: [
        rec(1, "t1", "file_evidence", { url: null, ref: "a1", name: "n", provenance: "fictional-scenario", claim_ref: null }),
        rec(2, "t1", "file_evidence", { url: "https://example.test/y", ref: null, name: null, provenance: "secondary-source", claim_ref: null }),
        rec(3, "t1", "record_decision", { question_id: sids[0], answer_ref: "a1", level: "business", parent_id: null, evidence_refs: [1], wrong_if: "x", off_script: false }),
        rec(4, "t2", "flag_weak_answer", { question_id: sids[1], answer_ref: "a2", missing: ["a number"] }),
        rec(5, "t3", "open_question", { source: "banked", question_id: sids[2], answer_ref: "a3", reason: "r" }),
        rec(6, "t4", "record_decision", { question_id: null, answer_ref: "a4", level: "business", parent_id: null, evidence_refs: [], wrong_if: "y", off_script: true }),
      ],
      texts: [], denied: [],
    };
    const draw = { seed: "synthetic", table: sids.map((id, i) => ({ id, a: KINDS[i % 3], b: KINDS[(i + 1) % 3], c: KINDS[(i + 2) % 3] })) };
    const keyIndex = new Map(sids.flatMap((id, i) => KINDS.map((k) => [`${id}::${k}`, { question_id: id, kind: k, answer: `text ${i + 1}`, expected: EXPECTED[k] }])));
    const score = scorePackage(pkg, keyIndex, draw, "a", sids);
    const cells = KINDS.reduce((s, k) => s + COLUMNS.reduce((t, c) => t + score.matrix[k][c], 0), 0);
    ok(cells === score.turns && score.turns === sids.length, `33.7: the matrix sums to ${cells} over ${score.turns} turns — every turn must land in exactly ONE cell, or an off_script decision and a silent turn vanish from the score`);
    ok(same33(score.rows.map((r) => r.column), ["record_decision", "flag_weak_answer", "open_question", "no_close_filed", "no_close_silent"]), `33.7: the synthetic package must exercise all five columns, got ${score.rows.map((r) => r.column).join(", ")}`);
    ok(score.evidence.ops === 2 && score.evidence.turnsWithAny === 1, `33.7: file_evidence must be counted (got ${score.evidence.ops} op(s) over ${score.evidence.turnsWithAny} turn(s))`);
    const evidenceCells = KINDS.reduce((s, k) => s + (score.matrix[k].file_evidence ?? 0), 0);
    ok(evidenceCells === 0 && !COLUMNS.includes("file_evidence"), "33.7: file_evidence must never appear in the matrix — it is non-closing, and folding it in makes the sum exceed the turn count");
    ok(score.totals.match + score.totals.mismatch + score.totals.no_close === score.turns, `33.7: the outcome totals sum to ${score.totals.match + score.totals.mismatch + score.totals.no_close}, not ${score.turns}`);
    ok(Object.values(score.byStage).reduce((s, b) => s + b.turns, 0) === score.turns, "33.7: the per-stage breakdown must cover every turn");
    // The MVP 6 shortlist is mechanical and reproducible; the verdict is a human read and this asserts
    // only the first half.
    const list = mvp6Shortlist([{ turn: "t1", text: "That answer is wrong. It names no number." }, { turn: "t2", text: "It names no user." }]);
    ok(list.hits.length === 1 && /wrong/.test(list.hits[0].sentence), `33.7: the MVP 6 shortlist must catch a planted "wrong" sentence and leave a clean one alone — got ${JSON.stringify(list.hits)}`);
    ok(same33(mvp6Shortlist([{ turn: "t1", text: "You should name a number." }]), mvp6Shortlist([{ turn: "t1", text: "You should name a number." }])), "33.7: the shortlist must be reproducible");
  }

  // 33.8 — assertAnswersSealed in BOTH directions. This is the check that makes the driver necessary
  //        rather than convenient: 390 hand-pastes cannot deliver byte-equality into an append-only
  //        file nobody is allowed to clean up.
  {
    const sids = IDS.slice(0, 4);
    const draw = { seed: "sealed", table: sids.map((id, i) => ({ id, a: KINDS[i % 3], b: KINDS[(i + 1) % 3], c: KINDS[(i + 2) % 3] })) };
    const keyIndex = new Map(sids.flatMap((id, i) => KINDS.map((k) => [`${id}::${k}`, { question_id: id, kind: k, answer: `${k} answer for ${i}`, expected: EXPECTED[k] }])));
    const answers = sids.map((id, i) => ({ ref: `a${i + 1}`, turn: `t${i + 1}`, question_id: id, kind: "banked", text: keyIndex.get(`${id}::${kindFor(draw, id, "a")}`).answer }));
    const good = { run: {}, answers, ops: [] };
    ok(threw33(() => assertAnswersSealed(good, keyIndex, draw, "a", sids)) === null, `33.8: a package whose texts equal the key must pass — ${threw33(() => assertAnswersSealed(good, keyIndex, draw, "a", sids))?.message}`);
    const oneByte = { run: {}, answers: answers.map((a, i) => (i === 2 ? { ...a, text: `${a.text} ` } : a)), ops: [] };
    const e1 = threw33(() => assertAnswersSealed(oneByte, keyIndex, draw, "a", sids));
    ok(e1 !== null && /a3/.test(e1.message) && /sealed/.test(e1.message), `33.8: one trailing space in one answer must throw naming its ref — got ${e1?.message ?? "no throw"}`);
    const extra = { run: {}, answers: [...answers, { ...answers[3], ref: "a5" }], ops: [] };
    const e2 = threw33(() => assertAnswersSealed(extra, keyIndex, draw, "a", sids));
    ok(e2 !== null && /append-only/.test(e2.message), `33.8: a duplicate answer line (a re-submitted turn) must be a HARD failure, not a warning — got ${e2?.message ?? "no throw"}`);
    const gap = { run: {}, answers: answers.map((a, i) => (i === 1 ? { ...a, ref: "a9" } : a)), ops: [] };
    ok(/positional and gapless/.test(threw33(() => assertAnswersSealed(gap, keyIndex, draw, "a", sids))?.message ?? ""), "33.8: a ref out of position must throw");
    const dupTurn = { run: {}, answers: answers.map((a, i) => (i === 1 ? { ...a, turn: "t1" } : a)), ops: [] };
    ok(threw33(() => assertAnswersSealed(dupTurn, keyIndex, draw, "a", sids)) !== null, "33.8: two answers on one turn must throw — the turn did not close and the answer was re-submitted");
    const wrongOrder = { run: {}, answers: [answers[1], answers[0], answers[2], answers[3]].map((a, i) => ({ ...a, ref: `a${i + 1}` })), ops: [] };
    ok(/walked a different question order/.test(threw33(() => assertAnswersSealed(wrongOrder, keyIndex, draw, "a", sids))?.message ?? ""), "33.8: an answer against the wrong question in the depth order must throw");
    const wrongColumn = threw33(() => assertAnswersSealed(good, keyIndex, draw, "b", sids));
    ok(wrongColumn !== null, "33.8: scoring a package against the WRONG draw column must throw rather than produce a wrong matrix — a mis-typed --run fails loudly");
  }

  // 33.9 — THE AUTHOR FENCE, SOURCE-PINNED. This is the control as a gate rather than a review fact.
  //        Read as TEXT (the file imports the SDK, which CI has not got). Comments are stripped first,
  //        so a header sentence explaining the rule cannot fail its own pin. Mutation: point cwd at the
  //        repo root → red naming the cwd; that is the trap that would silently void the whole ticket,
  //        because allowsPath resolves a relative path against allowSet.root while the SDK resolves it
  //        against options.cwd, so Read("discovery/bank.mjs") would be checked under the author root and
  //        ALLOWED while the SDK read the real bank.
  {
    const HARNESS = join(ROOT, "portal/record-graded-answers.mjs");
    ok(existsSync(HARNESS), "33.9: portal/record-graded-answers.mjs is missing — the fenced author harness is what the key's blindness rests on");
    if (existsSync(HARNESS)) {
      const src = decomment(readFileSync(HARNESS, "utf8"));
      ok(!/allowSetFor/.test(src), "33.9: the author harness must NOT call allowSetFor — that builder puts BANK_PATH into every set it makes, because a discovery RUN may read the bank. The author is not a discovery run");
      ok(/paths:\s*Object\.freeze\(\[\s*authorRoot\s*\]\)/.test(src), "33.9: the author's allow-set must be built by hand with paths of length 1 holding the author root and nothing else");
      ok(/root:\s*authorRoot/.test(src), "33.9: the author's allow-set root must be the author root");
      // SCOPED TO THE AUTHORING QUERY. The harness holds a SECOND query({ ... }) — probeAuthorFence's —
      // and it satisfies every assertion below, so a file-wide match would stay green with the
      // authoring query pointed anywhere. That is PR #354 review F2 in group 30, verbatim: --probe-fence
      // carried a second `cwd: root` and the real turn's pin stopped meaning anything. The prompt line
      // is the anchor that says WHICH query this is.
      const fn = src.indexOf("async function authorOne");
      ok(fn !== -1, "33.9: the harness must hold authorOne, the one fenced query per question");
      const at = src.indexOf("query({", fn);
      ok(at !== -1, "33.9: authorOne must call query({ ... })");
      const block = at === -1 ? "" : src.slice(at, src.indexOf("for await", at));
      ok(/prompt: promptFor\(brief, q\b/.test(block), "33.9: the pinned block must be the AUTHORING query — the probe's query satisfies every assertion below, so without this anchor the pin cannot say which one it read");
      ok(/cwd:\s*authorRoot/.test(block), "33.9: options.cwd MUST be the author root — allowsPath resolves against allowSet.root and the SDK resolves against cwd, so a mismatch green-lights the bank and records nothing (the cwd trap)");
      ok(/tools:\s*AUTHOR_TOOLS/.test(block), "33.9: the query must advertise AUTHOR_TOOLS — under tools: [] a denied Read is denied and UNRECORDED, and the fence's receipt would not exist (the receipts trap)");
      ok(/canUseTool:\s*fenceCanUseTool\(authorRoot/.test(block) && /hooks:\s*fenceHooks\(authorRoot/.test(block), "33.9: both fence sites must be wired, each rooted at the author root");
      ok(/allowedTools:\s*\[\]/.test(block), "33.9: nothing may be pre-approved, or canUseTool is never consulted");
      ok(/strictMcpConfig:\s*true/.test(block), "33.9: strictMcpConfig must be true — the author's cwd is inside this repo, below .mcp.json's codebase-search server, and a repo-search tool is a fifth route to the weak-answer notes");
      ok(/mainTools:\s*AUTHOR_TOOLS/.test(src), "33.9: the fence's mainTools must be the SAME array the query advertises, or the record gate and the tool surface disagree");
      ok(/const AUTHOR_TOOLS = Object\.freeze\(\['Read', 'Grep', 'Glob'\]\)/.test(src), "33.9: AUTHOR_TOOLS must be exactly ['Read', 'Grep', 'Glob']");
      ok(!/weakAnswer|provenanceNote/.test(src), "33.9: the harness must never name weakAnswer or provenanceNote — it interpolates forTheBrowser's field list and nothing else");
      ok(/const forTheAuthor = \(q\) => \(\{ id: q\.id, stage: q\.stage, text: q\.text, attribution: q\.attribution, label: q\.label \}\)/.test(src), "33.9: the author's view of a question must be exactly forTheBrowser's five fields");
    }
  }

  // 33.10 — THE AUTHOR'S ALLOW-SET DENIES EVERY LEAK PATH, driven through the REAL allowsPath rather
  //        than asserted. ABSOLUTE paths throughout: allowsPath resolves a RELATIVE path against
  //        allowSet.root, so a relative leak path would resolve UNDER the author root and be ALLOWED —
  //        the case would pass while proving the exact opposite of its claim. The positive control is
  //        the same four paths under a run's own allow-set rooted at the repo, which must ALLOW them:
  //        without it the case could pass because allowsPath denies everything.
  {
    const authorRoot = join(FIXTURE, "author");
    const authorSet = Object.freeze({ root: authorRoot, paths: Object.freeze([authorRoot]) });
    const LEAKS = {
      "the bank": BANK_PATH,
      "the notes upstream": join(ROOT, "docs/research/question-bank-source.md"),
      "the PRD": join(ROOT, "docs/epics/discovery-partner.prd.md"),
      "the architecture doc": join(ROOT, "docs/epics/discovery-partner.architecture.md"),
      "judged prose from a past run": join(ROOT, "discovery/instrument-loans-1/transcript.jsonl"),
      "the fixture directory above the author root": join(FIXTURE, "key.json"),
    };
    for (const [label, p] of Object.entries(LEAKS)) ok(allowsPath(authorSet, p).allow === false, `33.10: the author's allow-set ALLOWS ${label} (${p}) — the key's blindness rests on this denial`);
    ok(allowsPath(authorSet, authorRoot).allow === true && allowsPath(authorSet, join(authorRoot, "transcript.jsonl")).allow === true, "33.10: the author must be able to reach its own root, or the denials above prove only that allowsPath denies everything");
    const repoSet = allowSetFor({ root: ROOT, reads: [] });
    for (const [label, p] of Object.entries(LEAKS)) ok(allowsPath(repoSet, p).allow === true, `33.10 positive control: an allow-set rooted at the repo must ALLOW ${label} — otherwise the denials above are vacuous`);
    // The fifth route is a TOOL NAME, not a path: a repo-search MCP server is denied by name at both
    // fence sites whatever path it carries, the same way Write, Edit and Bash are.
    for (const tool of ["mcp__codebase-search__search", "Write", "Edit", "Bash", "NotebookEdit"])
      ok(fenceDecision(authorSet, tool, { file_path: join(authorRoot, "x") }).allow === false, `33.10: ${tool} must be denied BY NAME under the author's fence, whatever path it carries`);
    for (const tool of ["Read", "Grep", "Glob"])
      ok(fenceDecision(authorSet, tool, { file_path: join(authorRoot, "x"), path: authorRoot }).allow === true, `33.10: ${tool} inside the author root must be allowed, or the author cannot be REFUSED in a way the transcript records`);
    ok(fenceDecision(authorSet, "Read", { file_path: BANK_PATH }).allow === false, "33.10: a Read of the bank must be refused at the fence decision, not merely absent from the allow-set");
  }

  // 33.11 — THE PURITY PIN. tooling/discovery-score.mjs is imported by this file in CI, where
  //        portal/node_modules does not exist, and the draw must be re-derivable from its committed seed
  //        alone. Comments stripped first, for the reason 33.9 gives. Mutation: add a clock call → red.
  {
    const src = decomment(readFileSync(join(ROOT, "tooling/discovery-score.mjs"), "utf8"));
    const imports = src.split("\n").filter((l) => /^import /.test(l.trim()));
    ok(imports.length > 0, "33.11: the scorer's import lines must be readable");
    for (const line of imports) ok(/from "node:|from "\.\.\/discovery\//.test(line), `33.11: the scorer may import only node built-ins and discovery/ modules — found ${line.trim()}`);
    ok(!/@anthropic-ai|claude-agent-sdk|from "zod"|require\("zod"\)/.test(src), "33.11: the scorer must not reach the SDK or zod — it runs in CI where portal/node_modules does not exist");
    ok(!/Date\.now\(\)|new Date\(/.test(src), "33.11: the scorer must hold no clock — a judge whose output moves with the wall clock cannot be re-run against a committed package");
    ok(!/Math\.random\(\)/.test(src), "33.11: the scorer must hold no randomness — the draw is re-derived by this gate from a committed seed");
    ok(!/writeFileSync|appendFileSync|mkdirSync|rmSync/.test(src), "33.11: the scorer READS packages and never writes — its outputs are stdout and its return values");
    ok(/Date\.now\(\)/.test("const t = Date.now()"), "33.11 positive control: the clock pattern must be able to match");
  }

  // 33.12 — THE JUDGE'S FENCE DENIES THE KEY, driven rather than assumed (#291's rule verbatim:
  //        OMISSION IS NOT A FENCE). A recorded run's own allow-set is allowSetFor({ root: the package,
  //        reads: [] }) — its package and the bank and nothing else — so the sealed answers, the draw,
  //        the brief and the author's transcript are all outside it. Without this case the key's
  //        exclusion rests on reads happening to be empty. ABSOLUTE paths, for 33.10's reason.
  //        Mutation: add the fixture directory to `reads` → red.
  {
    const pkgRoot = join(ROOT, "discovery", GRADED_SLUGS[0]);
    const runSet = allowSetFor({ root: pkgRoot, reads: [] });
    const SEALED = {
      "the key": join(FIXTURE, "key.json"),
      "the draw": join(FIXTURE, "draw.json"),
      "the brief": join(FIXTURE, "brief.md"),
      "the author's transcript": join(FIXTURE, "author/transcript.jsonl"),
      "the fixture directory itself": FIXTURE,
    };
    for (const [label, p] of Object.entries(SEALED)) ok(allowsPath(runSet, p).allow === false, `33.12: a recorded run's own allow-set ALLOWS ${label} (${p}) — the judge must never be able to read the answers it is being scored against`);
    ok(allowsPath(runSet, pkgRoot).allow === true && allowsPath(runSet, BANK_PATH).allow === true, "33.12 positive control: the run's own package and the bank must be ALLOWED, or the denials above are vacuous");
    const widened = allowSetFor({ root: pkgRoot, reads: ["docs/epics/fixtures/graded-answers"] });
    ok(allowsPath(widened, join(FIXTURE, "key.json")).allow === true, "33.12: the mutation control — a run whose reads named the fixture directory WOULD reach the key, which is why reads stays empty and why this case drives it rather than assuming it");
  }

  // 33.13 — THE BANK NEVER LEARNS FROM THE FIXTURE (the circularity guard). If a later ticket
  //        "improves" a weak-answer note using the fixture's own K2 prose, the score becomes circular
  //        FOREVER and every future reading is void — and nobody would ever notice. Cheap, exact, and
  //        the mirror of the brief-leak check. Gated on the key existing, because the key is authored in
  //        Phase B and Phase A commits before it. Mutation: paste 40 characters of a K2 answer into a
  //        weakAnswer → red naming the question id.
  {
    const keyPath = join(FIXTURE, "key.json");
    if (!existsSync(keyPath)) {
      pending33.push("33.13 circularity guard PENDING — key.json is authored in Phase B");
    } else {
      const key = JSON.parse(readFileSync(keyPath, "utf8"));
      // FORTY characters, which is the plan's own mutation spec ("paste 40 chars of a K2 answer into a
      // weakAnswer"). Thirty was an arbitrary tightening and it produced exactly one false positive in
      // ~38,000 pairs: s5-willingness-to-pay's note and a K3 answer to it share
      // " willingness-to-pay conversation" (32 chars), which is the QUESTION'S OWN SUBJECT — the text
      // reads "What is the willingness to pay…", so both sides reach that compound innocently and the
      // author is fenced out of the note (four denied lines in this run's own transcript prove it).
      // Forty clears that with eight characters to spare and still fires on the mutation that matters.
      const SPAN = 40;
      const spans = new Set();
      for (const e of key.entries) for (let i = 0; i + SPAN <= e.answer.length; i += 1) spans.add(e.answer.slice(i, i + SPAN));
      ok(spans.size > 100, `33.13: only ${spans.size} spans came off the key — is it populated?`);
      // The three RUBRIC fields, and deliberately NOT `text`. The risk this guards is a later ticket
      // tuning a weak-answer note FROM the fixture's own K2 prose, which would make every future score
      // circular. An answer echoing thirty characters of the question it answers is normal — the author
      // is shown the question text — so including `text` would buy a false positive and no coverage.
      for (const q of BANK) for (const field of ["weakAnswer", "note", "provenanceNote"]) {
        const v = q[field];
        if (typeof v !== "string") continue;
        for (let i = 0; i + SPAN <= v.length; i += 1) {
          if (spans.has(v.slice(i, i + SPAN))) { ok(false, `33.13: ${q.id}.${field} shares a ${SPAN}-character span with a key answer — "${v.slice(i, i + SPAN)}". The bank must never be tuned from the fixture, or every future score is circular`); break; }
        }
      }
      const planted = "the fixture's own thin prose pasted straight into a note";
      ok(!spans.has(planted.slice(0, SPAN)), "33.13 positive control: the span set must be able to MISS a string");
    }
  }

  // 33.14 — NOTHING BUT THE SCORER TOUCHES A FIXTURE PACKAGE. Group 28's shape ("no tracked page or
  //        system/ module reaching the bank"), applied to the six graded packages: they are a fixture for
  //        one reading and must stay out of every future reader BY CONSTRUCTION rather than by everyone
  //        remembering. Comments stripped, so a usage line in a header is not a violation. Mutation:
  //        reference graded-think-a from discovery/prd-projection.mjs → red naming the file.
  {
    const SLUG_RE = /graded-(think|opus)-[abc]/;
    const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
    const readers = tracked.filter((p) => (p.endsWith(".mjs") || p.endsWith(".html") || p.endsWith(".js")) && p !== "tooling/discovery-score.mjs" && p !== "tooling/build-checks.mjs");
    ok(readers.length > 50, `33.14: the source sweep saw only ${readers.length} files — is git ls-files answering?`);
    for (const p of readers) {
      const abs = join(ROOT, p);
      if (!existsSync(abs)) continue;
      if (SLUG_RE.test(decomment(readFileSync(abs, "utf8")))) ok(false, `33.14: ${p} names a graded fixture slug in code — only tooling/discovery-score.mjs may read a fixture package, and it takes the slug as an argument`);
    }
    ok(SLUG_RE.test("const x = 'graded-opus-c'"), "33.14 positive control: the slug pattern must be able to match");
  }

  // 33.15 — THE RECORDED PACKAGES. Phase A commits before Phase C spends a penny, so these gate on the
  //        package existing and the group's line says pending until they land. Once a package is on
  //        disk this is the byte-equality claim, the matrix arithmetic, the one-fingerprint claim and the
  //        prd.md-is-the-projection's-bytes compare group 32 already runs for its own fixture.
  {
    const keyPath = join(FIXTURE, "key.json");
    const drawPath = join(FIXTURE, "draw.json");
    // REQUIRED vs OPTIONAL, and the difference is what C2 bought. graded-think-a and graded-opus-a are
    // recorded and committed, so they FAIL BY NAME when absent — group 32's rule ("it never skips"),
    // which is the whole point of A6's "make it required in the same PR's final commit". The other four
    // are C3's and were not run; they are checked in full IF present and named as absent otherwise, so
    // the ✓ line always says which of the six exist rather than going quiet.
    const REQUIRED = ["graded-think-a", "graded-opus-a"];
    const ready = existsSync(keyPath) && existsSync(drawPath);
    ok(ready, "33.15: the sealed key and draw must both exist — the packages are scored against them");
    for (const slug of REQUIRED) ok(existsSync(join(ROOT, "discovery", slug, "run.json")), `33.15: no run package at discovery/${slug} — C2's two recordings are committed and this case never skips them; re-record per .claude/plans/discovery-graded-answer-fixture-348.md Phase C`);
    const present = GRADED_SLUGS.filter((s) => existsSync(join(ROOT, "discovery", s, "run.json")));
    const missing = GRADED_SLUGS.filter((s) => !present.includes(s));
    if (missing.length) pending33.push(`C3 not recorded: ${missing.join(", ")}`);
    if (!ready || present.length === 0) {
      pending33.push("33.15 no package is readable");
    } else {
      const draw = checkDraw(JSON.parse(readFileSync(drawPath, "utf8")), IDS);
      const keyIndex = checkKey(JSON.parse(readFileSync(keyPath, "utf8")), IDS);
      for (const slug of present) {
        const root = join(ROOT, "discovery", slug);
        const run = slug.slice(-1);
        const posture = slug.includes("opus") ? "think-opus" : "think";
        const pkg = readGradedPackage(root);
        ok(pkg.run.slug === slug && pkg.run.provenance === "fictional" && pkg.run.depth === "whole-bank" && pkg.run.posture === posture && typeof pkg.run.endedAt === "string",
          `33.15: ${slug}/run.json does not describe the fixture — want ${slug} · fictional · whole-bank · ${posture} · ended; got ${JSON.stringify({ slug: pkg.run.slug, provenance: pkg.run.provenance, depth: pkg.run.depth, posture: pkg.run.posture, endedAt: pkg.run.endedAt })}`);
        const depthIds = selectDepth(pkg.run.depth).map((q) => q.id);
        const sealed = threw33(() => assertAnswersSealed(pkg, keyIndex, draw, run, depthIds));
        ok(sealed === null, `33.15: ${slug}'s answers are not the sealed ones — ${sealed?.message}`);
        const stamps = [...new Set((pkg.run.turnStats ?? []).map((t) => t.postureFingerprint))];
        ok(same33(stamps, [POSTURES[posture].fingerprint]), `33.15: ${slug} carries fingerprint(s) ${stamps.map((s) => String(s).slice(0, 8)).join(", ")}, not the current ${posture} surface ${POSTURES[posture].fingerprint.slice(0, 8)} — the prompt moved under the recording and the package is stale; re-record`);
        if (sealed === null) {
          const score = scorePackage(pkg, keyIndex, draw, run, depthIds);
          const cells = KINDS.reduce((s, k) => s + COLUMNS.reduce((t, c) => t + score.matrix[k][c], 0), 0);
          ok(cells === score.turns && score.turns === depthIds.length, `33.15: ${slug}'s matrix sums to ${cells} over ${score.turns} of ${depthIds.length} turns`);
        }
        const md = projectPrd(readPackage(root));
        ok(existsSync(join(root, "prd.md")) && readFileSync(join(root, "prd.md"), "utf8") === md, `33.15: discovery/${slug}/prd.md is not the projection's bytes — regenerate it with node discovery/prd-projection.mjs ${slug} --force`);
      }
    }
  }

  group("graded fixture", `the sealed draw over the REAL 65 ids — a Latin square with a per-question offset, every question meeting all three kinds and no column uniform, the committed draw.json re-derived from its own seed "${existsSync(join(FIXTURE, "draw.json")) ? JSON.parse(readFileSync(join(FIXTURE, "draw.json"), "utf8")).seed : "?"}" and compared row by row, drawFor's ARITY pinned at 2 so one table serves BOTH postures and graded-think-a and graded-opus-a answer the same 65 answers, deterministic and frozen at both levels by an inert write · checkKey's 13 refusals each matched against the value it names, with "expected" derived from the kind and never authored · EXPECTED and CLOSES_WHEN iterated against OPS in BOTH directions with file_evidence named as the one op no kind expects, so a fifth verb fails here rather than silently · closingOpOf over a synthetic transcript covering all five columns — an off_script decision and an off-script open_question proven NOT to close — plus the hand-edit detectors (a closes field disagreeing with its params, and two closers on one turn) · the matrix proven to sum to the turn count with file_evidence counted beside it and ABSENT from it · assertAnswersSealed in both directions: one trailing space throws naming its ref, a duplicate line is a HARD failure, a wrong draw column throws rather than scoring · THE AUTHOR'S FENCE source-pinned from portal/record-graded-answers.mjs (no allowSetFor, a hand-built allow-set of length 1, cwd EQUAL to the author root — the trap that would silently void the ticket — tools advertised so a denial is recorded, both sites wired, strictMcpConfig true, and the question view pinned to forTheBrowser's five fields) and DRIVEN through the real allowsPath: six leak paths denied as ABSOLUTE paths with an allow-set rooted at the repo allowing all six as the positive control, and a repo-search MCP name denied BY NAME · THE MIRROR: a recorded run's own allow-set proven to deny the key, the draw, the brief and the author's transcript, with the widened-reads mutation showing the case can fail — omission is not a fence · the circularity guard (no 40-character span shared between the bank's prose and any key answer) · and no tracked source file outside the scorer naming a fixture slug in code${pending33.length ? ` · PENDING: ${pending33.join(" · ")}` : ""}. What it cannot reach: whether the author obeyed the brief, whether a K2 answer is thin in the way its own weak-answer note names (both review facts against the committed key), whether a fence DENY stopped a call at run time (the author run's own denied lines are that receipt, the standard --probe-fence sets), and the MVP 6 verdict, which is a human read of a mechanical shortlist`);
}

// --- 34 · feature proposals (#359) ----------------------------------------------------------------
// THE FIXTURE IS A GATE FIXTURE, NOT A RUN, and it stays INLINE for group 31's reason (:6706-6711):
// discovery/README.md forbids a hand-written answer, transcript or op, and an on-disk hand-authored
// package could later be mistaken for a real one.
//
// Only the ops, the answers, run.json and the PROPOSAL LINES are hand-written. The op RECORDS are
// produced by running the REAL applier over the ops, so seq / closes / flagged / supersedes are
// discovery/ops.mjs's output and this group cannot drift from the applier's flagging rules. The
// proposal and verdict lines are hand-authored because THEY are the subject under test — the same
// exception group 33 case 33.5 makes for the same reason.
//
// This group imports discovery/ only. The SDK half is read as TEXT (case 34.12), never imported:
// importing it would pull @anthropic-ai/claude-agent-sdk into a CI job that has no
// portal/node_modules and take the whole job down.
{
  const threw = (fn) => { try { fn(); return null; } catch (e) { return e; } };
  const msg = (fn) => threw(fn)?.message ?? null;
  const names = (fn, ...needles) => {
    const m = msg(fn);
    if (m === null) return "did not throw";
    const missing = needles.filter((n) => !m.includes(String(n)));
    return missing.length ? `threw "${m}", which does not name ${missing.map((n) => JSON.stringify(n)).join(" or ")}` : null;
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  // Local copies, and the duplication is DELIBERATE (:6728-6734's reasoning): the assertion side has
  // to mirror the module's containment independently or it builds a match set the page never
  // contains. A one-space copy of fold here would make every leak read as contained.
  const esc = (s) => String(s).replace(/\|/g, "\\|");
  const fold = (s) => String(s).replace(/[\r\n]/g, " ");
  const present = (md, s) => [String(s), esc(s), fold(s), esc(fold(s))].some((v) => md.includes(v));
  // A multi-line value reaches the page through blockquote(), which prefixes every line with `> ` —
  // so it is never present as ONE string, and present() alone would report a rendered `why` as
  // absent AND a leaked one as contained. Every non-blank LINE of it must be there (or gone).
  const linesOf = (s) => String(s).split(/\r\n|\r|\n/).filter((l) => l.trim());
  const presentAll = (md, s) => linesOf(s).every((l) => present(md, l));
  const presentAny = (md, s) => linesOf(s).some((l) => present(md, l));
  const headings = (md) => [...md.matchAll(/^ {0,3}## (.+)$/gm)].map((m) => m[1]);
  const sectionBody = (md, heading) => {
    const open = `\n## ${heading}\n`;
    const at = md.indexOf(open);
    if (at === -1) return null;
    const from = at + open.length;
    const next = md.indexOf("\n## ", from);
    return md.slice(from, next === -1 ? md.length : next).trim();
  };
  const blockOf = (md, id) => {
    const head = `#### ${id} — `;
    const at = md.indexOf(head);
    if (at === -1) return null;
    const rest = md.slice(at);
    const stops = [rest.indexOf("\n#### "), rest.indexOf("\n## ")].filter((n) => n !== -1);
    return rest.slice(0, stops.length ? Math.min(...stops) : rest.length);
  };
  const decomment = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");

  const P_ANSWERS = [
    { ref: "a1", text: "Every spring the committee re-types the same rota and by June nobody trusts it. Two plots were double-let last year." },
    { ref: "a2", text: "The plot holder wants to know on their phone which slot is theirs this week, and who to swap with if they cannot make it." },
    { ref: "a3", text: "Out of bounds: no payments, no messaging between holders, and no change to how slots are allocated." },
    { ref: "a4", text: "Nothing new really, it is mostly a table and some dates. We will sort out whatever comes up as we go." },
  ];

  // The ledger the proposals rest on. It needs at least two record_decisions at DIFFERENT rungs (so a
  // proposal can name more than one), one file_evidence and one flag_weak_answer, so refusal 1's
  // wrong-kind branch has a real seq of each to name rather than a hypothetical one.
  const P_OPS = [
    { turn: null, op: "file_evidence", params: { url: "https://example.test/minutes?cols=plot|holder|slot", ref: null, name: null, provenance: "secondary-source", claim_ref: null } },
    { turn: "t1", op: "record_decision", params: { question_id: "s1-if-nobody-solves-this", answer_ref: "a1", level: "business", parent_id: null, evidence_refs: [1], wrong_if: "Plots stop being double-let with no software at all, because the committee's new paper process already fixed it.", off_script: false } },
    { turn: "t2", op: "record_decision", params: { question_id: "s3-user-need-map", answer_ref: "a2", level: "stakeholder", parent_id: 2, evidence_refs: [1], wrong_if: "Holders never look at the rota between sessions, so a phone view changes nothing about late records.", off_script: false } },
    { turn: "t3", op: "record_decision", params: { question_id: "s4-out-of-bounds", answer_ref: "a3", level: "solution", parent_id: 3, evidence_refs: [], wrong_if: "Holders cannot use the rota at all without messaging each other, so excluding messaging kills the swap.", off_script: false } },
    { turn: "t4", op: "flag_weak_answer", params: { question_id: "s4-rabbit-holes", answer_ref: "a4", missing: ["any named unknown in the slot-swap flow", "a decision settled in advance rather than deferred to build time"] } },
  ];

  const P_RUN = {
    slug: "gate-fixture-proposals",
    provenance: "fictional",
    label: "Gate fixture — hand-authored for build-checks group 34, not a run",
    entryMode: "blank-idea",
    depth: "full-discovery",
    frontEnd: "portal",
    model: "claude-sonnet-5",
    posture: "think",
    sessionId: null,
    startedAt: "2026-09-01T09:00:00.000Z",
    endedAt: "2026-09-01T09:40:00.000Z",
    root: "discovery/gate-fixture-proposals",
    turnStats: [],
  };

  const P_RECORDS = applyDiscoveryOps(P_OPS, { answers: P_ANSWERS, bank: BANK }).ops;
  // seq 1 file_evidence · seq 2 business · seq 3 stakeholder · seq 4 solution · seq 5 flag_weak_answer.
  const SEQ_EVIDENCE = 1;
  const SEQ_WEAK = 5;

  const FP = "0123456789abcdef0123456789abcdef";
  const proposal = (id, patch = {}) => ({
    type: "proposal", ts: `2026-09-01T10:0${id.slice(1)}:00.000Z`, id,
    title: `Proposal ${id}`, why: `Why ${id} — the model's prose.`, rests_on: [2],
    wrong_if: `${id} is wrong if nobody uses it.`, model: "claude-opus-5", fingerprint: FP, ...patch,
  });
  const verdict = (proposalId, v, patch = {}) => ({
    type: "verdict", ts: `2026-09-01T11:0${proposalId.slice(1)}:00.000Z`, proposal_id: proposalId,
    verdict: v, reason: `The owner's reason for ${v} on ${proposalId}.`, ...patch,
  });

  // FOUR proposals and FOUR verdicts, so every one of the four derived statuses has a live example on
  // the happy page (case 34.3's positive control would otherwise never see three of the five
  // sections' bodies), and so ONE proposal carries TWO verdicts and exercises the supersede marking.
  const P_LINES = [
    proposal("p1", { title: "Batch the season's slot changes", rests_on: [2], why: "The committee re-types the rota because nothing accumulates the changes.\n\nA batch view would.", wrong_if: "Holders change slots so rarely that a batch view is emptier than the single-change one." }),
    proposal("p2", { title: "A holder's own week view", rests_on: [3, 4], why: "The holder's need names one week and one slot.", wrong_if: "Holders want the whole season at once and a week view hides the swap they were looking for." }),
    proposal("p3", { title: "A swap request with no messaging", rests_on: [4], why: "The exclusion rules out messaging, so a swap needs a shape that is not a message.", wrong_if: "Every swap needs a conversation and a structured request is refused every time." }),
    proposal("p4", { title: "An away-mode toggle", rests_on: [3], why: "Away mode frees a slot without reassigning a plot.", wrong_if: "Nobody sets it in advance, so the slot frees only after the session it would have covered." }),
    verdict("p1", "accepted"),
    verdict("p2", "refused", { ts: "2026-09-01T11:20:00.000Z" }),
    verdict("p2", "parked", { ts: "2026-09-01T11:40:00.000Z", reason: "Parked after all — the exclusion may move." }),
    verdict("p3", "refused", { ts: "2026-09-01T11:50:00.000Z" }),
  ];

  const pkg = (proposals = P_LINES, ops = P_RECORDS, run = P_RUN) => ({ run, ops, proposals });
  const project = (proposals = P_LINES, ops = P_RECORDS, run = P_RUN) => projectProposals(pkg(proposals, ops, run));
  const doc = project();
  const WANT = PROPOSAL_SECTIONS.map((r) => r.heading);

  // 34.1 — THE TABLES, each frozen BY MUTATION (attempt a push, re-read the length), not by
  // Object.isFrozen: the frozen-ness that matters is the one a consumer would actually hit.
  {
    const frozenByMutation = (arr) => {
      const before = arr.length;
      try { arr.push("x"); } catch { /* strict mode throws; both outcomes are the same fact */ }
      return arr.length === before;
    };
    for (const [name, arr] of [["VERDICTS", VERDICTS], ["STATUSES", STATUSES], ["LINE_TYPES", LINE_TYPES], ["PROPOSAL_KEYS", PROPOSAL_KEYS], ["VERDICT_KEYS", VERDICT_KEYS], ["PROPOSED_BY_MODEL", PROPOSED_BY_MODEL], ["PROPOSAL_SECTIONS", PROPOSAL_SECTIONS]])
      ok(frozenByMutation(arr), `34.1: ${name} accepted a push — it must be frozen, or every roster assertion below can be widened by a consumer`);
    // Frozen at BOTH levels: Object.freeze is shallow, and a writable row would let this case pass
    // for the wrong reason.
    for (const row of PROPOSAL_SECTIONS) {
      const was = row.heading;
      try { row.heading = "mutated"; } catch { /* see above */ }
      ok(row.heading === was, `34.1: PROPOSAL_SECTIONS row "${row.id}" is writable — Object.freeze is shallow, so the rows must be frozen too`);
      ok(same(Object.keys(row).sort(), ["axis", "empty", "from", "heading", "id"]), `34.1: PROPOSAL_SECTIONS row "${row.id}" carries ${Object.keys(row).join(", ")} — a row is exactly axis, empty, from, heading, id`);
    }
    // FIVE DISTINCT empty strings. A copy-pasted one would make 34.8's fallback assertions pass for
    // the wrong reason — the same trap :6847-6865 names for SECTIONS.
    const empties = PROPOSAL_SECTIONS.map((r) => r.empty);
    ok(new Set(empties).size === empties.length, `34.1: PROPOSAL_SECTIONS has ${new Set(empties).size} distinct empty states over ${empties.length} rows — each section says what ITS OWN emptiness means, or 34.8 cannot tell one fallback from another`);
    ok(STATUSES[0] === "proposed" && !VERDICTS.includes("proposed"), `34.1: "proposed" must be STATUSES[0] and must NOT be a VERDICT — it is the ABSENCE of a verdict line and is never written to one (got STATUSES ${JSON.stringify(STATUSES)}, VERDICTS ${JSON.stringify(VERDICTS)})`);
    ok(MAX_PROPOSALS > 0 && Number.isInteger(MAX_PROPOSALS), `34.1: MAX_PROPOSALS is ${JSON.stringify(MAX_PROPOSALS)} — a named ceiling the prompt, the tool's refusal and this gate all read`);
    // The id allocator counts from the MAX ID, never the array length — the file interleaves two line
    // types, so a length-based counter collides the moment the first verdict lands.
    ok(nextProposalId(P_LINES) === "p5", `34.1: nextProposalId over 4 proposals + 4 verdicts answered ${JSON.stringify(nextProposalId(P_LINES))} — it must count from the max id (p5), not the array length (which would say p9)`);
    ok(nextProposalId([]) === "p1" && nextProposalId(null) === "p1", `34.1: nextProposalId over an empty and a junk store answered ${JSON.stringify(nextProposalId([]))} / ${JSON.stringify(nextProposalId(null))} — both are p1`);
    ok(nextProposalId([proposal("p7"), verdict("p7", "accepted")]) === "p8", `34.1: nextProposalId after a gap answered ${JSON.stringify(nextProposalId([proposal("p7"), verdict("p7", "accepted")]))} — it continues from the max, so ids never collide after a re-run`);
    for (const junk of ["p0", "p01", "P1", "p", "1", "p1a", ""])
      ok(!PROPOSAL_ID_RE.test(junk), `34.1: PROPOSAL_ID_RE accepted ${JSON.stringify(junk)} — an id is p<n> with n a 1-based integer and no leading zero, because the heading renders it UNFOLDED`);
    ok(PROPOSAL_ID_RE.test("p1") && PROPOSAL_ID_RE.test("p42"), "34.1: PROPOSAL_ID_RE rejected a legitimate id — the positive control for the seven refusals above");
  }

  // 34.2 — COVERAGE, BOTH DIRECTIONS. This is 31.2's rule applied to this fold: a fifth status with
  // no section home must fail BY NAME rather than being silently dropped from the page.
  {
    for (const s of STATUSES)
      ok(PROPOSAL_SECTIONS.some((r) => r.axis === "status" && r.from === s), `34.2: status "${s}" has no PROPOSAL_SECTIONS home — every status a proposal can hold renders somewhere, or a proposal vanishes from the page`);
    for (const row of PROPOSAL_SECTIONS.filter((r) => r.axis === "status"))
      ok(STATUSES.includes(row.from), `34.2: PROPOSAL_SECTIONS row "${row.id}" selects status "${row.from}", which is not one of ${STATUSES.join(" · ")}`);
    ok(PROPOSAL_SECTIONS.filter((r) => r.axis === "status").length === STATUSES.length, `34.2: ${PROPOSAL_SECTIONS.filter((r) => r.axis === "status").length} status rows for ${STATUSES.length} statuses — one each, so nothing renders twice`);
    // The mutation that proves the loop can go red: a sixth status with no home.
    const withSixth = [...STATUSES, "deferred"];
    ok(!withSixth.every((s) => PROPOSAL_SECTIONS.some((r) => r.axis === "status" && r.from === s)), "34.2: a synthetic sixth status found a section home — the coverage loop above cannot go red and is proving nothing");
    ok(PROPOSAL_SECTIONS.some((r) => r.axis === "cross-ref"), "34.2: no cross-ref row — the rested-on section is what makes a proposal's grounding visible on the page");
  }

  // 34.3 — THE POSITIVE CONTROL, FIRST. Every refusal below means nothing unless this passes.
  {
    ok(same(headings(doc), WANT), `34.3: the fixture projects headings ${JSON.stringify(headings(doc))} — it must be one "## " per PROPOSAL_SECTIONS row, in table order: ${JSON.stringify(WANT)}`);
    ok(doc.startsWith("# gate-fixture-proposals — feature proposals from a discovery run\n"), `34.3: the title line is ${JSON.stringify(doc.split("\n")[0])}`);
    ok(doc.endsWith("\n") && !doc.endsWith("\n\n"), "34.3: the page must end in exactly one newline");
    // The honesty header, clause by clause — it is the one paragraph not derived from a record, and
    // each clause is a promise the rest of the ticket keeps.
    for (const clause of ["OPTIONS, never truth", "`prd.md` does not carry them and never will", "accepted** proposal is NOT a decision", "REGENERATED on every verdict", "answer a banked question in a session"])
      ok(doc.includes(clause), `34.3: the honesty header does not carry ${JSON.stringify(clause)} — the header states who wrote each half, that these are options, that prd.md never carries them, that accepted is not a decision, and that a hand edit is lost`);
    // The run line and the proposals line, each pinned WHOLE.
    const line = (prefix) => doc.split("\n").find((l) => l.startsWith(prefix)) ?? null;
    ok(line("**Run**") === "**Run** — `gate-fixture-proposals` · fictional (Gate fixture — hand-authored for build-checks group 34, not a run) · depth full-discovery · ended 2026-09-01T09:40:00.000Z · package [`discovery/gate-fixture-proposals`](./)", `34.3: the Run line is ${JSON.stringify(line("**Run**"))}`);
    ok(line("**Proposals**") === "**Proposals** — 4: proposed 1 · accepted 1 · refused 1 · parked 1", `34.3: the Proposals line is ${JSON.stringify(line("**Proposals**"))} — it counts the fold, in STATUSES order`);
    // Every proposal renders EXACTLY ONCE, under its own status's section.
    const HOME = { p1: "Accepted", p2: "Parked", p3: "Refused", p4: "Awaiting a verdict" };
    for (const [id, heading] of Object.entries(HOME)) {
      const occurrences = doc.split(`#### ${id} — `).length - 1;
      ok(occurrences === 1, `34.3: ${id}'s block appears ${occurrences} time(s) — a proposal renders once, in its status's section and nowhere else`);
      ok((sectionBody(doc, heading) ?? "").includes(`#### ${id} — `), `34.3: ${id} is not under "${heading}" — the derived status selects the section`);
    }
    // Every field of every proposal is on the page, iterated over the LINES so a renderer that drops
    // one fails by name.
    for (const row of foldProposals(P_LINES)) {
      const block = blockOf(doc, row.proposal.id);
      ok(block !== null, `34.3: ${row.proposal.id} has no block at all`);
      for (const [k, v] of Object.entries(row.proposal)) {
        if (k === "type" || k === "id" || k === "rests_on") continue;
        ok(presentAll(block ?? "", v), `34.3: ${row.proposal.id}'s "${k}" (${JSON.stringify(String(v).slice(0, 40))}) is not in its block — every model-authored and server-assigned field renders, and nothing is truncated. A multi-line value reaches the page one line at a time through blockquote()`);
      }
      for (const seq of row.proposal.rests_on)
        ok((block ?? "").includes(`seq ${seq} (`), `34.3: ${row.proposal.id}'s rests_on seq ${seq} is not named in its block with the rung it resolves to`);
      for (const v of row.verdicts)
        ok(present(block ?? "", v.reason) && (block ?? "").includes(`**${v.verdict}**`), `34.3: ${row.proposal.id}'s ${v.verdict} verdict and its reason are not both in its block`);
    }
    // The supersede MARKING — p2 carries two verdicts, and the earlier one is marked rather than
    // dropped, the rule prd-projection.mjs states for a replaced decision.
    const p2 = blockOf(doc, "p2") ?? "";
    ok((p2.match(/\*Verdict:\*/g) ?? []).length === 2, `34.3: p2's block holds ${(p2.match(/\*Verdict:\*/g) ?? []).length} verdict line(s) — both are kept, because the owner changing their mind is part of the record`);
    ok(p2.includes("(superseded by the verdict of 2026-09-01T11:40:00.000Z)"), `34.3: p2's earlier verdict is not marked as superseded — marking, never dropping`);
    // The rested-on table, and the FOUR decisions in the ledger that no proposal rests on must NOT
    // appear in it (a table that listed every decision would not be a cross-reference).
    const rested = sectionBody(doc, "The decisions these rest on") ?? "";
    ok(rested.startsWith("| seq | Level | Question | Rested on by |"), `34.3: the rested-on section does not open with its table header — ${JSON.stringify(rested.slice(0, 80))}`);
    for (const seq of [2, 3, 4]) ok(rested.includes(`| ${seq} | `), `34.3: seq ${seq} is rested on by a proposal but has no row in the rested-on table`);
    ok(!rested.includes(`| ${SEQ_EVIDENCE} | `) && !rested.includes(`| ${SEQ_WEAK} | `), `34.3: the rested-on table names a seq no proposal rests on — it is a cross-reference over rests_on, not a dump of the ledger`);
  }

  // 34.4 — REFUSAL 3, THREE WAYS: a proposal can never become a record_decision. Structural, not a
  // runtime check, so it is asserted as a value, EXECUTED, and source-pinned.
  {
    // (a) the vocabularies are disjoint, and no proposal field is a record_decision param.
    ok(same(OPS_DISJOINT, []), `34.4a: LINE_TYPES ∩ OPS is ${JSON.stringify(OPS_DISJOINT)} — a line type that is also an op verb would give a proposal a name the applier answers to`);
    // `wrong_if` IS in both key sets, and that is the design rather than a leak: every claim in this
    // system carries a kill criterion, which is refusal 2's own argument. What must never be shared
    // are the six params that make a record_decision a record_decision — a proposal carrying any of
    // them would be an op wearing a proposal's type, and the exact-key-set check refuses each by
    // name (with refusal 3 quoted in the message).
    const DECISION_ONLY = DISCOVERY_PARAMS.record_decision.filter((k) => k !== "wrong_if");
    const overlap = PROPOSAL_KEYS.filter((k) => DECISION_ONLY.includes(k));
    ok(same(overlap, []), `34.4a: ${JSON.stringify(overlap)} is both a proposal key and a record_decision-only param — a shared field is the first step of a migration this ticket forbids`);
    ok(DECISION_ONLY.length === 6 && !DECISION_ONLY.includes("wrong_if"), `34.4a: the decision-only param list is ${JSON.stringify(DECISION_ONLY)} — six params, wrong_if excluded because it is deliberately shared`);
    for (const k of DECISION_ONLY)
      ok(names(() => checkProposalLines([{ ...proposal("p1"), [k]: null }], P_RECORDS), k, "refusal 3") === null, `34.4a: a proposal line carrying record_decision's "${k}" is not refused naming refusal 3 — ${names(() => checkProposalLines([{ ...proposal("p1"), [k]: null }], P_RECORDS), k, "refusal 3")}`);
    // (b) EXECUTED, not grepped — the repo's own rule: mutate the source, run the function.
    const ctx = { answers: P_ANSWERS, bank: BANK, turn: null };
    const line = proposal("p1");
    ok(names(() => applyDiscoveryOps([line], ctx), "unknown key") === null, `34.4b: applyOps accepted a proposal line as an item — ${names(() => applyDiscoveryOps([line], ctx), "unknown key")}`);
    ok(names(() => applyDiscoveryOp(emptyRun(), line, ctx), "op") === null, `34.4b: applyOp accepted a proposal line as an op envelope — ${names(() => applyDiscoveryOp(emptyRun(), line, ctx), "op")}`);
    // And the reverse: an op record fed to checkProposalLines is refused naming its type.
    ok(names(() => checkProposalLines([{ ...P_RECORDS[1], type: "op" }], P_RECORDS), "type", "op") === null, `34.4b: checkProposalLines accepted an op record as a proposal line — ${names(() => checkProposalLines([{ ...P_RECORDS[1], type: "op" }], P_RECORDS), "type", "op")}`);
    // (c) the source pin: no applier import, no exported name naming record_decision.
    const src = decomment(readFileSync(join(ROOT, "discovery/proposals.mjs"), "utf8"));
    ok(!/\bapplyOps?\b/.test(src), "34.4c: discovery/proposals.mjs names applyOp or applyOps — there is no route from a proposal into the applier, and an import is the first half of one");
    ok(!/^\s*export\b[^\n]*\b(record_decision|applyOp)/m.test(src), "34.4c: discovery/proposals.mjs exports a name matching record_decision or applyOp");
    ok(/from "\.\/ops\.mjs"/.test(src) && /\bPARAMS\b/.test(src), "34.4c: the pin above is vacuous — proposals.mjs must import from ops.mjs (it reads PARAMS to name refusal 3), so a regex that matched nothing would pass forever");
    // The MUTATION that turns the pin red, so it cannot pass because it never matched.
    ok(/\bapplyOps?\b/.test(`${src}\napplyOps(x);`), "34.4c: the applier-import regex does not match even when the name IS present — the pin is broken");
  }

  // 34.5 — REFUSAL 4, BYTE-IDENTICAL: a proposal never appears in prd.md.
  {
    const prdPkg = { run: P_RUN, answers: P_ANSWERS, ops: P_RECORDS };
    const before = projectPrd(prdPkg);
    // (a) the same package carrying proposal lines, then carrying verdicts too — byte-identical.
    const withProposals = projectPrd({ ...prdPkg, proposals: P_LINES.filter((l) => l.type === "proposal") });
    const withEverything = projectPrd({ ...prdPkg, proposals: P_LINES });
    ok(before === withProposals, "34.5a: prd.md's bytes moved when proposal lines were added to the package — prd.md is a fold over run.json, answers.jsonl and the transcript's op lines, and nothing else has a route");
    ok(before === withEverything, "34.5a: prd.md's bytes moved when verdict lines were added to the package");
    for (const l of P_LINES) {
      for (const k of ["title", "why", "wrong_if", "reason"]) {
        if (typeof l[k] !== "string") continue;
        ok(!presentAny(before, l[k]), `34.5a: a proposal's "${k}" (${JSON.stringify(l[k].slice(0, 40))}) is on the projected prd.md — refusal 4`);
      }
    }
    // (b) the source pin, over DECOMMENTED source: the three exported containment helpers are named
    // in prd-projection.mjs's comments by design (#359's T1), and a comment is not a route.
    const prdSrc = decomment(readFileSync(join(ROOT, "discovery/prd-projection.mjs"), "utf8"));
    ok(!/proposals/i.test(prdSrc), `34.5b: discovery/prd-projection.mjs's code names "proposals" — it must not import, read or render the proposal half in either direction`);
    ok(/readPackage/.test(prdSrc), "34.5b: the pin above is vacuous — prd-projection.mjs's decommented source must still hold its code");
    const filenames = [...prdSrc.matchAll(/join\(root, "([^"]+)"\)/g)].map((m) => m[1]);
    ok(same([...new Set(filenames)].sort(), ["answers.jsonl", "prd.md", "run.json", "transcript.jsonl"]), `34.5b: prd-projection.mjs reaches ${JSON.stringify([...new Set(filenames)].sort())} under the run root — it reads three files and writes one, and proposals.jsonl is not among them`);
    // (c) the MUTATION that turns the compare red, so 34.5a cannot be testing nothing — the exact
    // failure mode every #137 defect shared.
    ok(before !== `${before}${P_LINES[0].title}`, "34.5c: the byte compare cannot distinguish a page with a proposal's title concatenated onto it — 34.5a is proving nothing");
  }

  // 34.6 — REFUSAL 1 and REFUSAL 2, each on its own message, each with the mutation that turns it red.
  {
    const check = (patch) => () => checkProposalLines([proposal("p1", patch)], P_RECORDS);
    // THE POSITIVE CONTROL FIRST: the same proposal with one valid rests_on and a non-blank wrong_if
    // is ACCEPTED, so no refusal below can be passing because everything is refused.
    ok(threw(check({})) === null, `34.6: the happy proposal was refused — ${msg(check({}))}. Every refusal below is meaningless until this passes`);
    // REFUSAL 1 — five branches, each naming rests_on and its refusal.
    const R1 = [
      ["empty", { rests_on: [] }],
      ["absent", (() => { const p = proposal("p1"); delete p.rests_on; return p; })()],
      ["not an array", { rests_on: 2 }],
      ["a dangling seq", { rests_on: [99] }],
      ["a file_evidence seq", { rests_on: [SEQ_EVIDENCE] }],
      ["a flag_weak_answer seq", { rests_on: [SEQ_WEAK] }],
      ["seq 0", { rests_on: [0] }],
      ["a negative seq", { rests_on: [-1] }],
      ["a float seq", { rests_on: [1.5] }],
      ["a string seq", { rests_on: ["2"] }],
    ];
    for (const [label, patch] of R1) {
      const fn = patch.type === "proposal" ? () => checkProposalLines([patch], P_RECORDS) : check(patch);
      ok(names(fn, "rests_on") === null, `34.6: rests_on ${label} — ${names(fn, "rests_on")}`);
      // "absent" is caught one guard earlier, by the exact-key-set check, so it names rests_on but
      // not refusal 1. Every branch that reaches the rests_on validators names the refusal.
      if (label !== "absent") ok(names(fn, "rests_on", "refusal 1") === null, `34.6: rests_on ${label} does not name refusal 1 — ${names(fn, "rests_on", "refusal 1")}`);
    }
    // The wrong-kind branches must name the KIND they resolved to, not just the field.
    ok(names(check({ rests_on: [SEQ_EVIDENCE] }), "file_evidence", "not a record_decision", "refusal 1") === null, `34.6: a file_evidence seq's refusal does not name the kind — ${names(check({ rests_on: [SEQ_EVIDENCE] }), "file_evidence", "not a record_decision", "refusal 1")}`);
    ok(names(check({ rests_on: [SEQ_WEAK] }), "flag_weak_answer", "refusal 1") === null, `34.6: a flag_weak_answer seq's refusal does not name the kind — ${names(check({ rests_on: [SEQ_WEAK] }), "flag_weak_answer", "refusal 1")}`);
    ok(names(check({ rests_on: [99] }), "99", "does not carry", "refusal 1") === null, `34.6: a DANGLING seq must be REFUSED here, unlike checkOpLines' tolerated dangling parent_id — a proposal run reads a FINISHED package and every seq it names was in the brief. ${names(check({ rests_on: [99] }), "99", "does not carry", "refusal 1")}`);
    // REFUSAL 2 — wrong_if, six branches.
    for (const [label, v] of [["absent", undefined], ["null", null], ["empty", ""], ["blank", "   "], ["a number", 7], ["an array", ["x"]]]) {
      const p = proposal("p1");
      if (v === undefined) delete p.wrong_if; else p.wrong_if = v;
      const fn = () => checkProposalLines([p], P_RECORDS);
      ok(names(fn, "wrong_if") === null, `34.6: wrong_if ${label} — ${names(fn, "wrong_if")}`);
      if (v !== undefined) ok(names(fn, "wrong_if", "refusal 2") === null, `34.6: wrong_if ${label} does not name refusal 2 — ${names(fn, "wrong_if", "refusal 2")}`);
    }
    // The ordinary shape refusals, each naming the value.
    const shapes = [
      ["an unknown type", [{ ...proposal("p1"), type: "proposalx" }], ["type", "proposalx"]],
      ["an unknown key", [{ ...proposal("p1"), level: "business" }], ["level", "refusal 3"]],
      ["an absent key", [(() => { const p = proposal("p1"); delete p.model; return p; })()], ["absent", "model"]],
      ["a bad id", [proposal("p1", { id: "px" })], ["id"]],
      ["a repeated id", [proposal("p1"), proposal("p1")], ["repeats"]],
      ["ids out of order", [proposal("p2"), proposal("p1")], ["strictly increasing"]],
      ["a blank title", [proposal("p1", { title: "  " })], ["title"]],
      ["a blank why", [proposal("p1", { why: "" })], ["why"]],
      ["a blank fingerprint", [proposal("p1", { fingerprint: "" })], ["fingerprint"]],
      ["a non-string ts", [proposal("p1", { ts: 7 })], ["ts"]],
      ["a verdict naming no proposal", [proposal("p1"), verdict("p9", "accepted")], ["p9"]],
      ["a verdict outside VERDICTS", [proposal("p1"), verdict("p1", "maybe")], ["verdict", "maybe"]],
      ["a blank verdict reason", [proposal("p1"), verdict("p1", "accepted", { reason: " " })], ["reason"]],
      ["a verdict with an unknown key", [proposal("p1"), { ...verdict("p1", "accepted"), id: "p1" }], ["id"]],
      ["a non-array store", "x", ["array"]],
      ["a non-object line", [null], ["not an object"]],
    ];
    for (const [label, lines, needles] of shapes) {
      const fn = () => checkProposalLines(lines, P_RECORDS);
      ok(names(fn, ...needles) === null, `34.6: ${label} — ${names(fn, ...needles)}`);
      const e = threw(fn);
      ok(e !== null && e.constructor === Error && String(e.message).startsWith("proposals: "), `34.6: ${label} threw a ${e?.constructor?.name} whose message does not name the module — ${JSON.stringify(String(e?.message).slice(0, 90))}`);
    }
    // Total, and it returns a COPY: a caller cannot alias the checked array.
    const checked = checkProposalLines(P_LINES, P_RECORDS);
    ok(checked !== P_LINES && same(checked, P_LINES), "34.6: checkProposalLines returned its input array rather than a copy — a caller could rewrite the checked lines after the check");
    ok(threw(() => checkProposalLines([], [])) === null, "34.6: an empty store over an empty ledger was refused — an absent proposals.jsonl reads as [] and is a legitimate state");
  }

  // 34.7 — THE DERIVED STATUS. Never stored, the LAST verdict wins, and every verdict is kept.
  {
    const p = proposal("p1");
    ok(statusOf("p1", [p]) === "proposed", `34.7: no verdict answered ${JSON.stringify(statusOf("p1", [p]))} — "proposed" is the ABSENCE of a verdict`);
    for (const v of VERDICTS)
      ok(statusOf("p1", [p, verdict("p1", v)]) === v, `34.7: one ${v} verdict answered ${JSON.stringify(statusOf("p1", [p, verdict("p1", v)]))}`);
    const three = [p, verdict("p1", "accepted"), verdict("p1", "refused"), verdict("p1", "parked")];
    ok(statusOf("p1", three) === "parked", `34.7: three verdicts answered ${JSON.stringify(statusOf("p1", three))} — the LAST one wins`);
    const folded = foldProposals(three);
    ok(folded[0].verdicts.length === 3 && same(folded[0].verdicts.map((v) => v.verdict), ["accepted", "refused", "parked"]), `34.7: three verdicts folded to ${JSON.stringify(folded[0].verdicts.map((v) => v.verdict))} — all three are kept, in FILE ORDER, because the owner changing their mind is part of the record`);
    ok(statusOf("p9", three) === "proposed", `34.7: statusOf over an unknown id answered ${JSON.stringify(statusOf("p9", three))} — a selector answers over junk rather than throwing`);
    const counts = statusCounts(P_LINES);
    ok(same(Object.keys(counts), [...STATUSES]), `34.7: statusCounts' keys are ${JSON.stringify(Object.keys(counts))} — always all of STATUSES, in order, so a caller rendering a zero need not distinguish "none" from "absent"`);
    ok(STATUSES.reduce((n, s) => n + counts[s], 0) === foldProposals(P_LINES).length, `34.7: statusCounts sums to ${STATUSES.reduce((n, s) => n + counts[s], 0)} over ${foldProposals(P_LINES).length} proposals`);
    ok(same(foldProposals(P_LINES).map((r) => r.proposal.id), ["p1", "p2", "p3", "p4"]), `34.7: foldProposals answered ${JSON.stringify(foldProposals(P_LINES).map((r) => r.proposal.id))} — file order, never sorted`);
    ok(same(foldProposals(P_LINES).map((r) => r.seq), [1, 2, 3, 4]), "34.7: foldProposals' seq is not the 1-based file ordinal");
    // PURITY: call it twice and deep-compare, then mutate the return and re-read the input.
    ok(same(foldProposals(P_LINES), foldProposals(P_LINES)), "34.7: two folds of the same lines differ — foldProposals is not deterministic");
    const snapshot = JSON.stringify(P_LINES);
    const out = foldProposals(P_LINES);
    out[0].proposal.title = "mutated";
    out[0].proposal.rests_on.push(99);
    out[1].verdicts[0].reason = "mutated";
    out[1].verdicts.push(verdict("p2", "accepted"));
    ok(JSON.stringify(P_LINES) === snapshot, "34.7: mutating foldProposals' return changed the input lines — the fold must COPY the proposal, its rests_on and its verdicts, or a consumer can rewrite an append-only record without a write (group 30 case 13's trap)");
    ok(foldProposals(P_LINES)[0].proposal.title !== "mutated", "34.7: a second fold sees the first fold's mutation");
    ok(same(foldProposals(null), []) && same(foldProposals("x"), []), "34.7: foldProposals threw or answered non-[] over junk — every selector below checkProposalLines is total");
  }

  // 34.8 — THE VANISHING CLAIM, this fold's version. Delete a proposal and its claims leave the WHOLE
  // document; delete every one and every heading survives carrying no claim.
  {
    for (const target of foldProposals(P_LINES)) {
      const id = target.proposal.id;
      const without = P_LINES.filter((l) => !(l.type === "proposal" && l.id === id) && !(l.type === "verdict" && l.proposal_id === id));
      const md = project(without);
      ok(same(headings(md), WANT), `34.8: deleting ${id} changed the heading list to ${JSON.stringify(headings(md))} — the headings are PROPOSAL_SECTIONS' and nothing can add or remove one`);
      for (const k of ["title", "why", "wrong_if"])
        ok(!presentAny(md, target.proposal[k]), `34.8: ${id}'s "${k}" survives its deletion — a claim on the page must resolve to a line in proposals.jsonl and nothing else. presentAny, not present: a multi-line value leaks one line at a time`);
      for (const v of target.verdicts)
        ok(!presentAny(md, v.reason), `34.8: ${id}'s verdict reason survives its deletion`);
      ok(!md.includes(`#### ${id} — `), `34.8: ${id}'s block survives its deletion`);
      // The section it lived in falls back to its OWN declared empty string when it was the only one
      // there — five distinct strings (34.1), so this cannot pass on a neighbour's fallback.
      const row = PROPOSAL_SECTIONS.find((r) => r.axis === "status" && r.from === target.status);
      const others = foldProposals(without).filter((r) => r.status === target.status);
      if (!others.length) ok(sectionBody(md, row.heading) === row.empty, `34.8: "${row.heading}" did not fall back to its own declared empty state after ${id} left it — got ${JSON.stringify(sectionBody(md, row.heading))}, want ${JSON.stringify(row.empty)}`);
    }
    // Every proposal gone: every heading survives, every declared empty renders, no claim remains.
    const bare = project([]);
    ok(same(headings(bare), WANT), `34.8: the empty projection's headings are ${JSON.stringify(headings(bare))}`);
    for (const row of PROPOSAL_SECTIONS)
      ok(sectionBody(bare, row.heading) === row.empty, `34.8: "${row.heading}" over an empty store rendered ${JSON.stringify(sectionBody(bare, row.heading))} rather than its declared ${JSON.stringify(row.empty)}`);
    for (const l of P_LINES)
      for (const k of ["title", "why", "wrong_if", "reason"])
        if (typeof l[k] === "string") ok(!presentAny(bare, l[k]), `34.8: the empty projection carries a ${l.type}'s "${k}" although no line was passed in`);
    ok(bare.includes("**Proposals** — 0: proposed 0 · accepted 0 · refused 0 · parked 0"), "34.8: the empty projection's Proposals line does not read all zeroes");
    // The whole ledger empty too — the projection still renders every heading and no claim.
    const noLedger = project([], []);
    ok(same(headings(noLedger), WANT), `34.8: an empty LEDGER changed the heading list to ${JSON.stringify(headings(noLedger))}`);
  }

  // 34.9 — THE INJECTION BATTERY, re-run on this fold. Nothing model-authored may reach column 0 as
  // markdown STRUCTURE, over all three of CommonMark's line endings. CRLF is the sharp one: folding
  // only its LF leaves the CR as a bare line ending AND inserts the single leading space ATX still
  // reads as a heading.
  //
  // The assertion is a CENSUS over the KEY LISTS, not a floor. 31.13's `folded >= 25 && refused >= 10`
  // counts refusals that come from three closed-set enum params this shape does not have, so a copied
  // floor would be red on day one. Iterating the key lists is strictly stronger: a field added to
  // either list must land in one column or the case fails BY NAME.
  {
    const EOLS = [["LF", "\n"], ["CR", "\r"], ["CRLF", "\r\n"]];
    const smuggle = (eol) => `${eol}${eol}## Smuggled section${eol}${eol}#### p99 — a smuggled block${eol}${eol}- a claim no proposal carries`;
    const STRUCTURE = ["## Smuggled section", "#### p99", "- a claim no proposal carries"];
    const opened = (md) => md.split(/\r\n|\r|\n/).filter((l) => STRUCTURE.some((x) => l.replace(/^ {1,3}/, "").startsWith(x)));
    // The happy page holds a multi-line `why` already, so the machinery is proven on it first.
    ok(same(headings(doc), WANT) && opened(doc).length === 0, `34.9: the fixture's own multi-line why is not contained — headings ${JSON.stringify(headings(doc))}, opened ${JSON.stringify(opened(doc))}. Every case below is meaningless until the happy page holds`);
    // GUARD 1 — the key lists cover the fixture. Without it, a field present in the data but missing
    // from PROPOSAL_KEYS is never driven AND never counted, and the census still balances.
    for (const l of P_LINES) {
      const want = l.type === "proposal" ? PROPOSAL_KEYS : VERDICT_KEYS;
      ok(same(Object.keys(l).sort(), [...want].sort()), `34.9: fixture ${l.type} line carries ${Object.keys(l).join(", ")} but its key list is ${want.join(", ")} — a field in the data and not in the list is never driven here`);
    }
    const stringKeys = (line) => (line.type === "proposal" ? PROPOSAL_KEYS : VERDICT_KEYS).filter((k) => typeof line[k] === "string");
    const expected = P_LINES.reduce((n, l) => n + stringKeys(l).length, 0);
    // GUARD 2 — the census is non-trivial, so a fixture reduced to one line cannot pass it.
    ok(expected >= 20, `34.9: only ${expected} string fields across the fixture — the census needs a fixture wide enough to mean something`);
    for (const [name, eol] of EOLS) {
      const PAYLOAD = smuggle(eol);
      let folded = 0;
      let refused = 0;
      P_LINES.forEach((l, i) => {
        for (const k of stringKeys(l)) {
          const lines = P_LINES.map((x, j) => (j === i ? { ...x, [k]: `${x[k]}${PAYLOAD}` } : x));
          let md;
          // A refusal BY NAME is containment; a crash is NOT, and counting one as the other would
          // make this case pass for exactly the reason it exists to rule out.
          try { md = project(lines); } catch (e) {
            ok(e.constructor === Error && String(e.message).startsWith("proposals: "), `34.9: ${l.type} ${i}'s "${k}" (${name}) made the projection throw a ${e.constructor.name} that does not name itself — ${JSON.stringify(String(e.message).slice(0, 120))}. A crash is not containment`);
            refused += 1;
            continue;
          }
          folded += 1;
          ok(same(headings(md), WANT), `34.9: ${l.type} ${i}'s "${k}" opened a "## " heading with ${name} line endings — ${JSON.stringify(headings(md))}`);
          ok(opened(md).length === 0, `34.9: ${l.type} ${i}'s "${k}" put ${JSON.stringify(opened(md))} at the START of a line with ${name} line endings — folded text is inert, structure at column 0 (or under ATX's three-space indent) is not`);
          ok(md.includes("## Smuggled section"), `34.9: ${l.type} ${i}'s "${k}" (${name}) lost the injected text entirely — a fold CONTAINS a claim, it never deletes one`);
        }
      });
      ok(folded + refused === expected, `34.9: ${folded} folded + ${refused} refused of ${expected} string fields with ${name} line endings — this case ITERATES PROPOSAL_KEYS and VERDICT_KEYS, so a field added to either must be driven here`);
      ok(folded > 0 && refused > 0, `34.9: neither column may be empty — folded ${folded}, refused ${refused}. If refused is 0 the validators are not running; if folded is 0 nothing reached a renderer`);
      // run.json's header is the same class: field() interpolates it raw, and the page title does not
      // even go through field().
      for (const k of ["slug", "root", "label", "provenance", "depth", "endedAt"]) {
        const md = project(P_LINES, P_RECORDS, { ...P_RUN, [k]: `${P_RUN[k]}${PAYLOAD}` });
        ok(same(headings(md), WANT) && opened(md).length === 0, `34.9: run.${k} opened ${JSON.stringify(opened(md))} with ${name} line endings — the run header is interpolated raw too`);
      }
    }
    // The `|` route: a pipe in model-authored text must not add a column to any table row.
    const columnsOf = (md) => md.split("\n").filter((l) => l.startsWith("| ")).map((l) => l.split("|").length);
    const baseline = columnsOf(doc);
    for (const k of ["title", "why", "wrong_if", "model", "fingerprint"]) {
      const md = project(P_LINES.map((l, i) => (i === 0 && typeof l[k] === "string" ? { ...l, [k]: `${l[k]} a | b | c` } : l)));
      ok(same(columnsOf(md), baseline), `34.9: a pipe in a proposal's "${k}" changed the table shape from ${JSON.stringify(baseline)} to ${JSON.stringify(columnsOf(md))} — anything reaching a table cell goes through cell()`);
    }
    // The positive control for the pipe route: a pipe in the value that DOES reach a cell — the bank
    // question's text arrives through cell() — and the ledger's own url, which carries one already.
    ok(doc.split("\n").filter((l) => l.startsWith("| ")).length >= 3, "34.9: the rested-on table has fewer than three rows, so the pipe assertions above have almost nothing to protect");
  }

  // 34.10 — THE BANK'S EXCLUDED FIELDS. weakAnswer is the agent's rubric, note and provenanceNote are
  // the researcher's commentary about the question: none is a statement about this product.
  {
    const ids = P_RECORDS.filter((r) => r.op === "record_decision").map((r) => r.params.question_id).filter(Boolean);
    ok(ids.length >= 2, `34.10: the fixture's decisions name ${ids.length} banked question(s) — this case needs at least two, or the exclusions below are barely driven`);
    let checkedAny = false;
    for (const id of ids) {
      const q = questionById(id);
      ok(q, `34.10: the fixture names bank id ${JSON.stringify(id)}, which the bank does not hold — a bank rename must fail HERE by name`);
      if (!q) continue;
      for (const k of ["weakAnswer", "note", "provenanceNote"])
        if (typeof q[k] === "string" && q[k].trim()) { checkedAny = true; ok(!presentAny(doc, q[k]), `34.10: ${id}'s "${k}" is on proposals.md — it is the rubric or the researcher's commentary, never a claim about the product`); }
      // The POSITIVE CONTROL, so the absences above cannot pass because the bank was never read.
      ok(present(doc, q.text) && present(doc, q.attribution) && present(doc, q.label), `34.10: ${id}'s text / attribution / label are not all on the page — the exclusions above would then pass because nothing was rendered at all`);
    }
    ok(checkedAny, "34.10: not one excluded field was non-empty across the fixture's questions — the exclusion assertions never ran");
  }

  // 34.11 — DETERMINISM, PURITY, NO CLOCK, and the committed artefact.
  {
    ok(project() === project(), "34.11: two projections of the same package differ — the fold is not deterministic");
    const snapshot = JSON.stringify({ run: P_RUN, ops: P_RECORDS, proposals: P_LINES });
    project();
    ok(JSON.stringify({ run: P_RUN, ops: P_RECORDS, proposals: P_LINES }) === snapshot, "34.11: projectProposals mutated its input");
    // NO CLOCK: every ISO date on the page is one run.json or a line already carried.
    const known = new Set([P_RUN.startedAt, P_RUN.endedAt, ...P_LINES.map((l) => l.ts)]);
    for (const stamp of doc.match(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g) ?? [])
      ok(known.has(stamp), `34.11: ${stamp} is on the page and is not run.json's or any line's own ts — the fold calls no clock`);
    ok((doc.match(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g) ?? []).length >= 5, "34.11: fewer than five ISO stamps on the page — the no-clock loop above has almost nothing to check");
    // proposalsView — the portal's whitelist, driven here rather than left as a shape in the route.
    const view = proposalsView(pkg());
    ok(same(Object.keys(view).sort(), ["counts", "decisions", "head", "proposals"]), `34.11: proposalsView answers ${Object.keys(view).join(", ")} — it is a WHITELIST, so a field added to the package must not start reaching the browser by default`);
    ok(same(Object.keys(view.head).sort(), ["depth", "endedAt", "label", "provenance", "root", "slug"]), `34.11: proposalsView's head carries ${Object.keys(view.head).join(", ")} — turnStats, model, posture, sessionId and reads are deliberately not on the wire`);
    ok(view.decisions.length === 3 && same(view.decisions.map((d) => d.seq), [2, 3, 4]), `34.11: proposalsView's decisions are ${JSON.stringify(view.decisions.map((d) => d.seq))} — every record_decision, and only those`);
    for (const d of view.decisions)
      ok(same(Object.keys(d).sort(), ["level", "question", "question_id", "seq", "wrong_if"]), `34.11: a decision row carries ${Object.keys(d).join(", ")}`);
    for (const id of P_RECORDS.filter((r) => r.op === "record_decision").map((r) => r.params.question_id).filter(Boolean)) {
      const q = questionById(id);
      for (const k of ["weakAnswer", "note", "provenanceNote"])
        if (typeof q?.[k] === "string" && q[k].trim()) ok(!JSON.stringify(view).includes(q[k]), `34.11: proposalsView puts ${id}'s "${k}" on the wire — the rubric never reaches the browser (plan M6's rule)`);
    }
    ok(names(() => proposalsView({ run: P_RUN, ops: P_RECORDS, proposals: [proposal("p1", { rests_on: [] })] }), "rests_on", "refusal 1") === null, `34.11: proposalsView served a corrupted store without refusing — it calls checkProposalLines, so the route refuses by name rather than rendering junk`);
    // THE COMMITTED ARTEFACT, gated on existence the way case 33.15 does.
    const runRoot = join(ROOT, "discovery/allergen-matrix-1");
    if (existsSync(join(runRoot, "proposals.jsonl"))) {
      const committed = join(runRoot, "proposals.md");
      ok(existsSync(committed), "34.11: discovery/allergen-matrix-1/proposals.jsonl exists with no proposals.md beside it — the page is regenerated on every verdict, so it is always present");
      if (existsSync(committed)) {
        const want = projectProposals(readProposalPackage(runRoot));
        ok(readFileSync(committed, "utf8") === want, "34.11: discovery/allergen-matrix-1/proposals.md is not the projection's bytes — regenerate it with node discovery/proposals.mjs allergen-matrix-1");
      }
    }
  }

  // 34.12 — THE SDK HALF, SOURCE-PINNED. Read as TEXT and never imported: it reaches the SDK, and CI
  // has no portal/node_modules. Every regex carries a positive control, because a pin that never
  // matched passes forever.
  {
    const PROPOSER = join(ROOT, "portal/lib/discovery-proposer.mjs");
    if (!existsSync(PROPOSER)) ok(false, "34.12: portal/lib/discovery-proposer.mjs does not exist — the SDK half is what protects AC #4 and AC #5, and this case is its only CI-reachable guard");
    else {
      const src = decomment(readFileSync(PROPOSER, "utf8"));
      // MUST NOT: every one of these would move run.json, transcript.jsonl or a posture fingerprint.
      // A proposer importing recordTurnStats adds a turnStats entry, and projectPrd renders
      // run.turnStats.length as "N turn(s)" — AC #4, gone, with a green gate over it.
      for (const forbidden of ["recordTurnStats", "writeRun", "mutateHead", "closeSession", "appendTranscript", "appendAnswer", "allowsToolName", "TOOL_DESCRIPTIONS", "fingerprintOf", "FINGERPRINT_INPUTS", "POSTURES"])
        ok(!new RegExp(`\\b${forbidden}\\b`).test(src), `34.12: discovery-proposer.mjs names ${forbidden} — the proposal run writes NOTHING to run.json, transcript.jsonl or answers.jsonl, and it never touches the posture prompt surface`);
      // The positive control for the loop above: the same regex shape DOES match a name that is there.
      ok(/\bcheckProposalLines\b/.test(src), "34.12: the must-not loop is vacuous — its regex shape does not match even a name that IS present");
      // MUST: one fence object, wired to BOTH sites (case 12's rule, :6290 — a second copy of the
      // fence is a second fence), with `write:` so refusals stream instead of landing in the
      // transcript.
      for (const [needle, why] of [
        [/\bfenceHooks\b/, "the PreToolUse site"],
        [/\bfenceCanUseTool\b/, "the canUseTool site"],
        [/\bwrite:/, "the recorder that streams instead of appending to transcript.jsonl"],
        [/\bextraTools:/, "this run's own tool name, admitted through the ONE predicate"],
        [/\bcheckProposalLines\b/, "the refusals, called before the append"],
        [/\bnextProposalId\b/, "the server-assigned id"],
        [/\bMAX_PROPOSALS\b/, "the ceiling"],
        [/\bPROVENANCE_RULE\b/, "the imported provenance rule (#347), never a copy"],
        [/\bis_error\b/, "the result check [[sdk-error-result-wears-success]]"],
      ]) ok(needle.test(src), `34.12: discovery-proposer.mjs does not carry ${needle} — ${why}`);
      // ONE fence object handed to both sites, and both from the SAME variable.
      const fenceVar = src.match(/const\s+(\w+)\s*=\s*\{[^}]*\ballowSet\b[^}]*\bextraTools\b[^}]*\}/s)?.[1] ?? null;
      ok(fenceVar !== null, "34.12: no single object literal carries allowSet and extraTools together — one fence, two call sites, or the two sites can drift apart");
      if (fenceVar) {
        ok(new RegExp(`fenceCanUseTool\\([^)]*\\b${fenceVar}\\b`).test(src) && new RegExp(`fenceHooks\\([^)]*\\b${fenceVar}\\b`).test(src), `34.12: fenceCanUseTool and fenceHooks are not both handed ${fenceVar} — a second copy of the fence is a second fence (case 12's rule)`);
      }
      // strictMcpConfig, scoped to the query's own options block — a file-wide match stayed green on
      // the transport with the real turn pointed elsewhere (PR #354 review F2).
      const queryBlock = src.match(/query\(\{[\s\S]*?\n\s*\}\);/)?.[0] ?? "";
      ok(/strictMcpConfig:\s*true/.test(queryBlock), "34.12: strictMcpConfig: true is not inside the query's own options block — the repo's .mcp.json must never join this run's advertised surface (#352)");
      ok(/mcpServers:/.test(queryBlock) && /maxTurns:/.test(queryBlock), "34.12: the query-block match is vacuous — it did not capture the real options object");
      // The MCP server name is its OWN, not the session's, so the session's tool names stay the
      // session's and isRecorded's mcp__ prefix still holds for this run.
      ok(!new RegExp(`\\bMCP_SERVER\\b`).test(src), "34.12: discovery-proposer.mjs reads MCP_SERVER — the proposal run advertises its own server, never the session's");
      const serverName = src.match(/PROPOSER_MCP_SERVER\s*=\s*'([^']+)'/)?.[1] ?? src.match(/PROPOSER_MCP_SERVER\s*=\s*"([^"]+)"/)?.[1] ?? null;
      ok(serverName !== null && serverName !== MCP_SERVER, `34.12: the proposer's MCP server name is ${JSON.stringify(serverName)} — it must exist and must not be the session's ${JSON.stringify(MCP_SERVER)}`);
      // Exactly ONE tool, and its zod shape is exactly PROPOSED_BY_MODEL by name AND order.
      ok((src.match(/\btool\(/g) ?? []).length === 1, `34.12: ${(src.match(/\btool\(/g) ?? []).length} tool( calls — one proposal run advertises exactly one tool`);
      const shape = [...src.matchAll(/^\s*(\w+):\s*z\./gm)].map((m) => m[1]);
      ok(same(shape, [...PROPOSED_BY_MODEL]), `34.12: the zod shape is ${JSON.stringify(shape)} — it must be exactly PROPOSED_BY_MODEL ${JSON.stringify([...PROPOSED_BY_MODEL])}, by name AND order, because the advertised "required" array comes out in that order`);
      // `tools` and `mainTools` read ONE frozen record, as case 12 pins for the transport.
      const mainVar = src.match(/const\s+(\w+)\s*=\s*Object\.freeze\(\[\]\)/)?.[1] ?? null;
      ok(mainVar !== null, "34.12: no Object.freeze([]) main-tools record — the query's `tools` and the fence's record gate must read ONE list, or a widening moves one and not the other");
      if (mainVar) ok(new RegExp(`tools:\\s*${mainVar}`).test(src) && new RegExp(`mainTools:\\s*${mainVar}`).test(src), `34.12: tools: and mainTools: do not both read ${mainVar}`);
      // The refusal runs BEFORE the append — the ordering is the whole guarantee.
      const at = (needle) => src.indexOf(needle);
      ok(at("checkProposalLines") !== -1 && at("checkProposalLines") < at("appendFileSync"), `34.12: checkProposalLines is not called before the append (${at("checkProposalLines")} vs ${at("appendFileSync")}) — an unchecked line reaching an append-only file cannot be taken back`);
    }
  }

  // 34.13 — THE FINGERPRINTS CANNOT MOVE THROUGH THIS TICKET'S CODE. Deliberately NOT a hex literal:
  // group 32 case 2a and group 33 case 15 already compare a recording's stamps to the LIVE
  // POSTURES[...].fingerprint, so a legitimate future prompt edit is meant to fail THERE, by name. A
  // literal here would block it for no reason. Assert the CAUSE instead.
  {
    const PROPOSER = join(ROOT, "portal/lib/discovery-proposer.mjs");
    if (existsSync(PROPOSER)) {
      const src = decomment(readFileSync(PROPOSER, "utf8"));
      const postureImports = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]*discovery-postures\.mjs['"]/g)]
        .flatMap((m) => m[1].split(",").map((x) => x.trim()).filter(Boolean));
      ok(same(postureImports, ["PROVENANCE_RULE"]), `34.13: discovery-proposer.mjs imports ${JSON.stringify(postureImports)} from discovery-postures.mjs — exactly PROVENANCE_RULE and nothing else. fingerprintOf hashes JSON.stringify(TOOL_DESCRIPTIONS), so one added key moves BOTH shipped posture fingerprints and makes discovery/instrument-loans-1/ stale under group 32`);
      ok(postureImports.length > 0, "34.13: the import-line regex matched nothing — the pin would pass forever, and it is the only thing standing between a future edit and a silently broken AC #5");
      // The proposer's own fingerprint is its own: node:crypto and nothing borrowed.
      ok(/createHash/.test(src) && /node:crypto/.test(src), "34.13: discovery-proposer.mjs does not compute its own hash from node:crypto — its fingerprint must move when ITS prompt moves and never when the session's does");
    }
    // And the posture table itself is untouched by this ticket: both shipped fingerprints are still
    // computed from the live module, and the two are distinct (the model is the only difference).
    ok(POSTURES.think.fingerprint === fingerprintOf({ build: buildThinkTurn, model: POSTURES.think.model }), "34.13: POSTURES.think.fingerprint is not the live hash of its own build and model");
    ok(POSTURES["think-opus"].fingerprint !== POSTURES.think.fingerprint, "34.13: the two shipped postures share a fingerprint — the model is hashed, so they must differ");
    ok(same(Object.keys(POSTURES).sort(), ["think", "think-opus"]), `34.13: POSTURES holds ${Object.keys(POSTURES).join(", ")} — this ticket adds no third posture, because a proposal tool description in TOOL_DESCRIPTIONS would move both fingerprints (D2)`);
  }

  const pending34 = existsSync(join(ROOT, "discovery/allergen-matrix-1/proposals.jsonl")) ? [] : ["the recorded run: discovery/allergen-matrix-1/proposals.jsonl"];
  group("proposals", `the vocabulary — VERDICTS, STATUSES, LINE_TYPES, both key sets, PROPOSED_BY_MODEL and PROPOSAL_SECTIONS — each frozen BY MUTATION, the section rows frozen at BOTH levels with an exact key set and ${PROPOSAL_SECTIONS.length} DISTINCT declared empty states, "proposed" proven to be STATUSES[0] and NOT a verdict, and the id allocator counting from the MAX id rather than the array length (the collision the two interleaved line types would otherwise cause after the first verdict) with seven junk ids refused by the regex · PROPOSAL_SECTIONS iterated against STATUSES in BOTH directions, one row per status so nothing renders twice, and a synthetic sixth status proven to find no home so the loop can go red · the positive control FIRST: the fixture — hand-authored ops through the REAL applier, hand-authored proposal lines because THEY are the subject — projecting one "## " per row in table order, the honesty header's five clauses each present, the Run and Proposals lines pinned WHOLE, every proposal rendered EXACTLY ONCE under its derived status, every field of every line asserted present by iteration, both of p2's verdicts kept with the earlier one MARKED superseded, and the rested-on table proven to name only the seqs a proposal rests on · REFUSAL 3 three ways: LINE_TYPES ∩ OPS empty and no proposal key a record_decision param, EXECUTED — a real proposal line refused by applyOp AND applyOps and an op record refused by checkProposalLines — and source-pinned with the mutation that proves the pin can match · REFUSAL 4 byte-identical: prd.md's bytes unmoved with proposal lines and then with verdict lines added to the same package, every model-authored string proven absent from it, prd-projection.mjs's DECOMMENTED source proven never to name "proposals" and to reach exactly run.json · answers.jsonl · transcript.jsonl · prd.md under the run root, with the concatenation mutation proving the compare can fail · REFUSAL 1 over ten branches (empty, absent, not an array, a dangling seq, a file_evidence seq, a flag_weak_answer seq, seq 0, a negative, a float and a string) each naming rests_on, the two wrong-kind branches naming the KIND, the dangling one refused where checkOpLines tolerates it and the reason stated; REFUSAL 2 over six; sixteen ordinary shape refusals each naming its value and each a plain Error prefixed "proposals: "; the happy proposal ACCEPTED as the positive control; and the returned array proven a COPY · the DERIVED status: no verdict reading "proposed", one verdict reading itself, three verdicts reading the LAST with all three KEPT in file order, statusCounts summing to the fold, purity by double call and by mutating the return, and the ALIAS trap driven — mutating the returned proposal, its rests_on and its verdicts leaves the input lines untouched · THE VANISHING CLAIM: each proposal deleted in turn, its title, why, wrong_if and every verdict reason gone from the WHOLE document and its section falling back to its OWN declared empty string, plus the empty store and the empty LEDGER each keeping every heading and carrying no claim · THE INJECTION BATTERY re-run on this fold as a CENSUS: a "## " / "#### " / "- " payload injected into every string field of every proposal line, every verdict line and six run.json fields, over ALL THREE of CommonMark's line endings, each contained by a fold or refused by name, asserted three ways (the heading list unchanged, nothing at column 0 or under ATX's three-space indent, and the text still PRESENT because a fold contains a claim rather than deleting one) — and the count asserted as folded + refused === the fixture's own string-field total, iterated from PROPOSAL_KEYS and VERDICT_KEYS with two guards (the key lists cover the fixture; the total is at least 20) so a field added to either list must be classified or this case fails BY NAME, which is strictly stronger than 31.13's floors and is why they were not copied · the pipe route over five model-authored fields, proven not to change any table row's shape · the bank's weakAnswer, note and provenanceNote proven ABSENT with text / attribution / label present as the positive control · determinism, no mutation of the input, and NO CLOCK — every ISO stamp on the page pinned to run.json's or a line's own ts · proposalsView pinned as a WHITELIST by key set, its decisions rows exact, the rubric proven off the wire, and a corrupted store proven to refuse rather than render · and THE SDK HALF read as TEXT, never imported: eleven names proven ABSENT (recordTurnStats, writeRun, mutateHead, closeSession, appendTranscript, appendAnswer, allowsToolName, TOOL_DESCRIPTIONS, fingerprintOf, FINGERPRINT_INPUTS, POSTURES — the first six would move a package file and the last five would move a posture fingerprint), nine present, ONE fence object proven handed to BOTH call sites from the same variable, strictMcpConfig scoped to the query's own block, its own MCP server name, exactly one tool, its zod shape equal to PROPOSED_BY_MODEL by name and order, tools and mainTools reading one frozen record, checkProposalLines proven to precede the append, and the posture import pinned to PROVENANCE_RULE ALONE with both shipped fingerprints re-derived live${pending34.length ? ` · PENDING: ${pending34.join(" · ")}` : ""}. What it cannot reach: whether the SDK half BEHAVES at all — CI has no portal/node_modules, so case 34.12 is a source pin over text rather than a run, the proposer's --dry preflight is the substitute and the recorded run is the observation; whether a fence DENY actually STOPS a call at run time — --probe-fence is that standard, and after this ticket's extraTools/write parameters it covers the proposal run too, because there is ONE predicate at the same two sites; and whether the model's proposals are any GOOD, which is a human read of the verdict distribution and for which this ticket sets no target`);
}

// --- the verdict ------------------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (failures) {
    console.error(`\nbuild ✗  ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\nbuild ✓  all 34 groups pass");
}
