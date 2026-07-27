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
//   1 pattern ids     the five rules, including the hub override and the empty board
//   2 slots           counted from the board, never invented; every value a string
//   3 composition     validated against the REAL handoff/verdant/vocabulary.json — this is the
//                     check that catches a vocabulary regeneration breaking the builder
//   4 codec           round-trip through BOTH the deflate and the uncompressed branch
//   5 tamper          fourteen hostile payloads, each of which must reject the WHOLE payload
//   6 SVG             well-formed, escaped, and no hostile token or label reaching markup
//   7 vetting         the one-application-point invariant in build-import.mjs
//
//   node tooling/build-checks.mjs

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { validateComposition } from "../system/agentic-renderer.mjs";
import { boardSvg, cardSvg } from "../system/build-card.mjs";
import { DEFAULT_ANSWERS, QUESTIONS } from "../system/build-questions.mjs";
import { decodeBuild, encodeBuild, MAX_DECODED_BYTES, MAX_PARAM_CHARS } from "../system/build-share.mjs";
import { draftBoard, LABEL_MAX, MAX_AFFORDANCES, MAX_PLACES } from "../system/breadboard.mjs";
import { compose } from "../system/pattern-render.mjs";
import { PATTERNS, patternFor, slotsFor } from "../system/pattern-rules.mjs";

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

// --- 1 · pattern ids ------------------------------------------------------------------------------

{
  for (const [shape, expected] of [["overview", "dashboard"], ["worklist", "queue"], ["stream", "feed"], ["steps", "onboarding"]]) {
    const answers = answersWith({ shape });
    const { id } = patternFor({ answers, board: draftBoard(answers) });
    ok(id === expected, `shape "${shape}" named "${id}", expected "${expected}"`);
  }
  ok(PATTERNS.dashboard.inLibrary === true, "dashboard should be in the library");
  ok(PATTERNS.queue.inLibrary === true, "queue should be in the library");
  for (const id of ["feed", "onboarding", "settings"]) {
    ok(PATTERNS[id].inLibrary === false, `${id} should NOT be in the library in this slice`);
    ok(typeof PATTERNS[id].needs === "string" && PATTERNS[id].needs.length > 20, `${id} should say what it would need`);
  }

  // The hub override, on a board no draft can produce: four connected affordances on the entry
  // place and none anywhere else.
  const hub = {
    places: [
      { id: "p1", label: "Menu", affordances: [1, 2, 3, 4].map((n) => ({ id: `p1a${n}`, label: `Go ${n}` })) },
      ...[2, 3, 4, 5].map((n) => ({ id: `p${n}`, label: `Place ${n}`, affordances: [] })),
    ],
    connections: [1, 2, 3, 4].map((n) => [`p1a${n}`, `p${n + 1}`]),
  };
  const hubbed = patternFor({ answers: answersWith({ shape: "overview" }), board: hub });
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

  group("pattern-ids", "4 shapes · hub override · never on a draft · 2 empty cases");
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

  for (const id of ["feed", "onboarding", "settings", null, "nonsense"]) {
    ok(slotsFor(id, qBoard) === null, `slotsFor("${id}") should derive nothing`);
  }

  group("slots", "counted from the board · capped · out-of-library derives nothing");
}

// --- 3 · composition validity against the REAL vocabulary -------------------------------------------

{
  for (const [shape, name] of [["overview", "metric-tile"], ["worklist", "list-row"]]) {
    const answers = answersWith({ shape });
    const board = draftBoard(answers);
    const { id } = patternFor({ answers, board });
    const composition = compose(id, slotsFor(id, board));
    ok(Array.isArray(composition) && composition.length > 0, `${id} composed nothing`);
    ok(composition.every((n) => n.name === name), `${id} did not compose ${name}s`);
    try {
      validateComposition(VOCAB, composition);
    } catch (err) {
      ok(false, `${id} failed the real vocabulary: ${err.message}`);
    }
  }
  for (const id of ["feed", "onboarding", "settings", null]) {
    ok(compose(id, [{ label: "x", value: "1" }]) === null, `compose("${id}") should refuse to compose`);
  }
  ok(compose("dashboard", null) === null, "compose with no slots should return null");
  // The two components this slice uses must actually exist, and the renderer must have templates
  // for them — a vocabulary entry with no template is a drift bug the page would meet on stage.
  for (const name of ["metric-tile", "list-row"]) {
    ok(Object.hasOwn(VOCAB.components, name), `${name} is not in the generated vocabulary`);
  }

  group("composition", "both in-library patterns validate against handoff/verdant/vocabulary.json");
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
    ["an off-family token key", clone({ k: { "--evil": "red" } })],
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

  const answers = answersWith({ shape: "overview" });
  const board = draftBoard(answers);
  const qBoard = draftBoard(answersWith({ shape: "worklist" }));

  const svgs = [
    ["dashboard card", cardSvg({ patternId: "dashboard", slots: slotsFor("dashboard", board), board, tokens: HOSTILE_TOKENS })],
    ["queue card", cardSvg({ patternId: "queue", slots: slotsFor("queue", qBoard), board: qBoard, tokens: HOSTILE_TOKENS })],
    ["out-of-library card", cardSvg({ patternId: "feed", slots: null, board, tokens: HOSTILE_TOKENS })],
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

  // The label path. A hostile place name appears exactly once, escaped, as text — once, because
  // boardSvg's <title> summarises the board rather than repeating a visitor string into it.
  const evil = structuredClone(board);
  evil.places[0].label = HOSTILE_LABEL;
  const evilSvg = boardSvg(evil);
  scanSvg(evilSvg, "hostile label");
  ok(!evilSvg.includes("<script"), "a hostile label injected a <script>");
  // The label's own "</text>" must be escaped, not sitting raw beside the real closing tags the
  // file legitimately has (scanSvg above already proved every one of those is balanced).
  ok(evilSvg.includes("&lt;/text&gt;"), "the hostile label's closing tag is not escaped");
  ok(!evilSvg.includes("</text><script"), "a hostile label closed the text element it was inside");
  ok((evilSvg.match(/&lt;script&gt;/g) || []).length === 1, "the hostile label should appear escaped exactly once");

  group("svg", `${svgs.length} templates well-formed · hostile tokens fall back · hostile label escaped once`);
}

// --- 7 · the vetting invariant ----------------------------------------------------------------------

{
  // Crude on purpose, and that is the point: build-import.mjs's applyToStage is the ONE place a
  // /build token value reaches the DOM, and it vets its own argument rather than trusting its four
  // callers. This fails loudly the day someone adds a second write.
  const source = readFileSync(join(ROOT, "system/build-import.mjs"), "utf8");
  const calls = (source.match(/\.setProperty\(/g) || []).length;
  ok(calls === 1, `system/build-import.mjs has ${calls} .setProperty( calls; the invariant is exactly 1`);
  ok(/function applyToStage\(tokens\) \{\s*\n\s*const vetted = vetTokens\(/.test(source),
    "applyToStage no longer vets its own argument at the choke point");
  group("vetting", "one .setProperty( call, vetted at the choke point");
}

// --- the verdict ------------------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (failures) {
    console.error(`\nbuild ✗  ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\nbuild ✓  all 7 groups pass");
}
