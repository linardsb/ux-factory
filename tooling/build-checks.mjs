// tooling/build-checks.mjs — the committed unit gate for /build's pattern chain (epic #134,
// ticket #137; .claude/plans/build-pattern-render-keep-rail.md).
//
// Seven groups, one ✓ line each, exit 1 on any failure — the tooling/validate-trace.mjs shape.
// Committed rather than left in a shell-history line, because these ARE the ticket's named gate
// and a gate a reviewer cannot re-run is not a gate.
//
// It imports the SHIPPED modules directly. They are Node-import-safe by design (DOM references
// inside function bodies, self-boot behind a `typeof document` guard), so if an import here starts
// pulling `document`, the module has a bug and the module is what gets fixed.
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

// --- the verdict ------------------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (failures) {
    console.error(`\nbuild ✗  ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\nbuild ✓  all 7 groups pass");
}
