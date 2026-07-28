// tooling/build-checks.mjs — the committed unit gate for /build's pattern chain (epic #134,
// ticket #137; .claude/plans/build-pattern-render-keep-rail.md).
//
// Nine groups, one ✓ line each, exit 1 on any failure — the tooling/validate-trace.mjs shape.
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
//   7 vetting         the one-application-point invariant, across ALL the /build modules
//   8 operator path   the three committed rules that draft a composition question from the same
//                     ten answers, their guards, and the SSE projection's whitelist (#140)
//   9 origin          the portal's CSRF predicate: both loopback origins accepted, an absent
//                     Origin allowed, every near-miss of an allowed origin refused (#157)
//
//   node tooling/build-checks.mjs

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { hasTemplate, validateComposition } from "../system/agentic-renderer.mjs";
import { vetTokens } from "../system/pack-imported.mjs";
import { boardSvg, cardSvg } from "../system/build-card.mjs";
import { specMarkdown } from "../system/build-keep.mjs";
import { DEFAULT_ANSWERS, frequencyVerdictFor, quadrantFor, QUESTIONS } from "../system/build-questions.mjs";
import { decodeBuild, encodeBuild, MAX_DECODED_BYTES, MAX_PARAM_CHARS } from "../system/build-share.mjs";
import { draftBoard, LABEL_MAX, MAX_AFFORDANCES, MAX_PLACES } from "../system/breadboard.mjs";
import { compose, streamNote } from "../system/pattern-render.mjs";
import { affordanceCount, PATTERNS, patternFor, slotsFor, SLOT_MAX } from "../system/pattern-rules.mjs";
import {
  ACTION_STANCE, assertFictional, assertRunSlug, assertScenarioSlug, draftQuestion, isRunInFlight,
  listScenarios, QUESTION_INPUTS, runBuild, runOptions, SHAPE_QUESTION, slugFor, STEP_EVENT_TEXT_MAX,
  stepEvent, validateAnswers, withRunLock,
} from "../portal/lib/builder.mjs";
import { allowedOrigins, originAllowed } from "../portal/lib/origin.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
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
  // drift error agentic-renderer.mjs:360-363 throws — caught here under Node instead of by a
  // visitor watching the stage refuse itself.
  //
  // Scoped to what compose EMITS, deliberately not to every vocabulary key: the vocabulary carries
  // 10 components and the renderer 9 templates, because demo-notice has a spec and no template on
  // purpose. "Every vocabulary entry has a template" would be red on a correct tree.
  const names = new Set(emitted.map((n) => n.name));
  ok(names.size >= 3, `only ${names.size} distinct component(s) across all five patterns`);
  for (const name of names) {
    ok(Object.hasOwn(VOCAB.components, name), `${name} is not in the generated vocabulary`);
    ok(hasTemplate(name), `${name} is in the vocabulary but agentic-renderer.mjs has no template for it — renderer and vocabulary have drifted`);
  }

  for (const id of [null, "nonsense", undefined]) {
    ok(compose(id, [{ label: "x", value: "1" }]) === null, `compose("${id}") should refuse to compose`);
  }
  ok(compose("dashboard", null) === null, "compose with no slots should return null");
  ok(compose("dashboard", []) === null, "compose with an empty slot array should return null");

  group("composition", `all 5 patterns validate against handoff/verdant/vocabulary.json · ${names.size} components, each with a template`);
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

  group("codec", "both branches round-trip · the pattern recomputes to the sender's");
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
    ["v: 2", clone({ v: 2 })],
  ];
  for (const [label, payload] of cases) {
    const { state, reason } = await decodeBuild(pack(payload));
    ok(state === null, `${label} was ACCEPTED — it must reject the whole payload`);
    ok(typeof reason === "string" && reason.length > 0, `${label} rejected with no reason`);
  }

  // A `__proto__` key at the TOP level, and inside `b`, decodes fine and changes nothing. That is
  // accepted-but-inert, not a hole, so the honest assertion is non-pollution rather than a
  // rejection the decoder does not owe: every lookup is Object.hasOwn or a key-by-key build from
  // the trusted QUESTIONS list, there is no recursive merge, and vetTokens cannot write __proto__
  // because KEY_NAME demands a `--family-` prefix. Asserting a reject here would have been a test
  // asserting a behaviour the code correctly does not have.
  const polluting = JSON.parse(`{"__proto__":{"polluted":1},${JSON.stringify(good).slice(1)}`);
  const inert = await decodeBuild(pack(polluting));
  ok(inert.state !== null, "a top-level __proto__ key should be inert, not a rejection");
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
    ok((await decodeBuild(bomb)).state === null, "an over-cap decompressed payload was accepted");
  } else {
    console.log("build tamper         ·  CompressionStream is absent here, so the bomb case was skipped");
  }

  group("tamper", `${cases.length} hostile payloads + caps + transport, all rejected whole`);
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

  group("artifacts", `${svgs.length} SVG templates well-formed · hostile tokens fall back · label escaped once · no card or spec claims "not in the library"`);
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
  const MODULES = [
    "build-import.mjs", "build-keep.mjs", "build-card.mjs", "build-share.mjs",
    "build-questions.mjs", "breadboard.mjs", "pattern-render.mjs", "pattern-rules.mjs",
  ];
  let writes = 0;
  for (const file of MODULES) {
    const src = readFileSync(join(ROOT, "system", file), "utf8");
    const calls = (src.match(/\.setProperty\(/g) || []).length;
    if (calls) ok(file === "build-import.mjs", `system/${file} writes an inline style; applyToStage is meant to be the only one`);
    writes += calls;
    // No markup ever gets built from a string on this page: every node is created element by
    // element, and the two SVG paths go through DOMParser + importNode instead.
    //
    // Matched as member ACCESS (a leading dot), not as a bare word. Several of these modules
    // explain in prose why they do not use innerHTML, and a substring match reads those sentences
    // as violations — the same trap the .setProperty( check hit when its own header named the API.
    for (const sink of [".innerHTML", ".outerHTML", ".insertAdjacentHTML(", "document.write("]) {
      ok(!src.includes(sink), `system/${file} uses ${sink}; /build builds every node element by element`);
    }
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

  group("vetting", `${writes} inline-style write across ${MODULES.length} modules · no markup-from-string · pack-boot mirror intact`);
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
// .claude/reports/portal-origin-guard.md, and it has to be re-driven if the handler is restructured.
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

// --- the verdict ------------------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (failures) {
    console.error(`\nbuild ✗  ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\nbuild ✓  all 9 groups pass");
}
