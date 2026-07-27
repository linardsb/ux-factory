// system/build-share.mjs — the share codec for /build: a whole build in a URL, and nothing else
// (epic #134, ticket #137; .claude/plans/hooked-shapeup-pattern-builder.md Phase 1.4,
// .claude/plans/build-pattern-render-keep-rail.md).
//
// PURE: no DOM, no storage, no engine. The URL is the only persistence this page has, which is the
// same promise Act 0 makes — nothing is uploaded and nothing is written to storage, so a link is
// the only way a build can outlive a tab.
//
// TWO DIVERGENCES FROM system/share-state.mjs, and a reviewer who knows that file will look for
// both:
//
//  1. **It imports.** share-state.mjs refuses to import pack-derived.mjs because that would "pull a
//     self-booting DOM module into a pure codec, which is the one thing this module is for not
//     doing" — and it has to be importable from pages that carry no builder, so it mirrors its
//     enums by hand and says so. This codec ships on exactly ONE page, whose modules are already
//     loaded, and both of its imports are Node-import-safe by construction (DOM references inside
//     function bodies, self-boot behind a `typeof document` guard). Hand-mirroring ten questions'
//     option lists and three caps would be a drift bug with a certainty a shared import does not
//     have. Nothing here touches the DOM itself.
//
//  2. **It carries token VALUES.** share-state.mjs deliberately carries INPUTS only — a brand hex
//     the receiver re-derives — because re-running the engine beats trusting a colour set from a
//     stranger's URL. That option does not exist here: an imported export cannot be re-run from a
//     link, because the file is not in it. So the values travel, and the honest form of the same
//     argument is that every one of them is re-validated through the SAME `vetTokens` allowlist the
//     drop path uses, twice — once here on decode, and again at the single point where a value
//     reaches the DOM (build-import.mjs's applyToStage).
//
// THE PAYLOAD CARRIES NO PATTERN ID. patternFor() recomputes it from the restored answers and
// board, for the same reason publishState recomputes the quadrant: a link must not be able to claim
// a pattern its own board does not produce. There is no enum to validate because there is no field.
//
// IT ALSO CARRIES NO `label` AND NO `note`, and that is the same rule applied to provenance. Those
// two fields describe what happened in the SENDER's browser — the file that was dropped, and the
// pack header naming it and the command that reproduces the mapping. Replaying them on a browser
// that imported nothing would have the receiving page state, at rest, that it read a file it never
// saw. The build travels (answers, board, edited flag, token values, slug); the story of how the
// sender got there does not, and the receiving page says "the design in this link" instead.

import { DEFAULT_ANSWERS, QUESTIONS } from "./build-questions.mjs";
import { LABEL_MAX, MAX_AFFORDANCES, MAX_PLACES } from "./breadboard.mjs";
import { vetTokens } from "./pack-imported.mjs";

export const SHARE_PARAM = "b";
// The refusal ceiling, not the target. A full build measures ~1.1 KB encoded (64 token values, ten
// answers, a 6×6 board); 8000 is far above that and far below any practical URL limit, so a param
// this long is a payload nobody on this page produced.
export const MAX_PARAM_CHARS = 8000;
export const MAX_DECODED_BYTES = 32 * 1024;
export const SHARE_VERSION = 1;

// A pack maps at most the five families' contract tokens; 80 is comfortably above the real count
// (~64) and stops a link from carrying a dictionary.
const MAX_TOKEN_KEYS = 80;

const SLUG_OK = /^[a-z0-9-]{1,40}$/;
const PLACE_ID = /^p[0-9]{1,2}$/;
const AFF_ID = /^p[0-9]{1,2}a[0-9]{1,2}$/;

// The wire shape, PINNED — encode and decode both read this table, so they cannot drift:
//
//   v    format version, 1                          → === 1, else reject the whole payload
//   a    { <questionId>: <optionValue> }             → every key a QUESTIONS id, every value one of
//                                                       that question's options, every question present
//   b.p  [[id, label, [[affId, affLabel], …]], …]    → ids /^p\d{1,2}$/ and /^p\d{1,2}a\d{1,2}$/,
//                                                       unique; labels 1..LABEL_MAX; ≤ MAX_PLACES,
//                                                       ≤ MAX_AFFORDANCES each
//   b.c  [[affId, placeId], …]                       → both ids present in b.p; no affordance twice;
//                                                       an affordance never targets its own place
//   e    0 | 1                                       → strictly one of the two
//   k    { "--color-accent": "#…", … }               → vetTokens(k) returns ZERO rejected AND ZERO
//                                                       skipped, ≤ 80 keys
//   s    pack slug, for the tokens.css filename      → /^[a-z0-9-]{1,40}$/, or absent
//
// Positional arrays for places and affordances rather than objects: ~600 B against ~1.1 KB on the
// board alone, and the shape is fixed by the table above rather than by a key a reader guesses.
//
// The `k` rule is the one place this file is stricter than it looks. vetTokens sorts a bad entry
// into one of two buckets: `rejected` (a token it maps, whose VALUE is unsafe) and `skipped` (a KEY
// outside the five imported families). Zero-rejected alone would let `{"--evil":"red"}` and a
// JSON-parsed `"__proto__"` key ride along as skipped. Requiring zero of BOTH means the decoded map
// is exactly the map that was sent, which is the only version of "this is the build that was
// shared" worth applying.

// --- base64url ----------------------------------------------------------------------------------
// btoa throws on anything outside Latin-1, so the bytes are what get base64'd, never the string.

function toBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// --- compression --------------------------------------------------------------------------------
// A ONE-BYTE FORMAT FLAG leads every payload: 0x00 uncompressed, 0x01 deflate-raw. The decoder must
// never guess which branch produced a link, because a Safari 16.3 sender and a Chrome receiver have
// to interoperate — CompressionStream shipped in Safari 16.4. Feature-detected, never assumed.

const FLAG_RAW = 0x00;
const FLAG_DEFLATE = 0x01;

const hasCompression = () => typeof CompressionStream === "function" && typeof DecompressionStream === "function";

async function deflateRaw(bytes) {
  const cs = new CompressionStream("deflate-raw");
  const writer = cs.writable.getWriter();
  writer.write(bytes);
  writer.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}

// Guarded chunk by chunk rather than by reading it all and measuring afterwards: a decompression
// bomb is only cheap to refuse before it is in memory.
async function inflateRaw(bytes) {
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  writer.write(bytes).catch(() => {});
  writer.close().catch(() => {});
  const reader = ds.readable.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_DECODED_BYTES) {
      await reader.cancel();
      throw new Error("the decompressed payload is over the size cap");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) { out.set(chunk, at); at += chunk.length; }
  return out;
}

// --- encode ---------------------------------------------------------------------------------------

// encodeBuild(state, { compress }) → Promise<string>. `compress` exists so the committed gate can
// force BOTH branches; nothing else passes it, and the default is "use it if this runtime has it".
export async function encodeBuild(state, { compress = hasCompression() } = {}) {
  const answers = { ...DEFAULT_ANSWERS, ...(state && state.answers) };
  const a = {};
  for (const q of QUESTIONS) a[q.id] = String(answers[q.id]);

  const board = state && state.board ? state.board : { places: [], connections: [] };
  const places = Array.isArray(board.places) ? board.places.slice(0, MAX_PLACES) : [];
  const p = places.map((place) => [
    String(place.id),
    String(place.label ?? "").slice(0, LABEL_MAX),
    (Array.isArray(place.affordances) ? place.affordances : []).slice(0, MAX_AFFORDANCES)
      .map((aff) => [String(aff.id), String(aff.label ?? "").slice(0, LABEL_MAX)]),
  ]);
  const known = new Set(p.flatMap(([, , affs]) => affs.map(([id]) => id)));
  const placeIds = new Set(p.map(([id]) => id));
  const c = (Array.isArray(board.connections) ? board.connections : [])
    .filter((pair) => Array.isArray(pair) && known.has(pair[0]) && placeIds.has(pair[1]))
    .map(([from, to]) => [String(from), String(to)]);

  const payload = { v: SHARE_VERSION, a, b: { p, c }, e: state && state.boardIsEdited ? 1 : 0 };

  // Only what the same allowlist the decoder runs would accept, so a link this page produced can
  // never be one this page refuses.
  const pack = state && state.pack;
  if (pack && pack.tokens) {
    const { tokens } = vetTokens(pack.tokens);
    const keys = Object.keys(tokens).slice(0, MAX_TOKEN_KEYS);
    if (keys.length) {
      payload.k = Object.fromEntries(keys.map((k) => [k, tokens[k]]));
      if (typeof pack.slug === "string" && SLUG_OK.test(pack.slug)) payload.s = pack.slug;
    }
  }

  const json = new TextEncoder().encode(JSON.stringify(payload));
  const body = compress && hasCompression() ? await deflateRaw(json) : json;
  const flagged = new Uint8Array(body.length + 1);
  flagged[0] = compress && hasCompression() ? FLAG_DEFLATE : FLAG_RAW;
  flagged.set(body, 1);
  return toBase64Url(flagged);
}

// --- decode ---------------------------------------------------------------------------------------

// The untrusted path. Returns { state, reason }: `state` is the object restoreBuild() takes, or
// NULL on any failure at all, and `reason` names what failed. Two return values rather than the
// bare `state|null` the plan sketched, because the surface has to SAY what went wrong once — the
// codec is the only thing that knows, and throwing at the reader is what "nothing fails on stage"
// (share-state.mjs:69) rules out.
//
// Validation is absolute and total: any invalid field rejects the WHOLE payload. A link whose token
// map was partly dropped is not the build that was shared, and half a restore is a page quietly
// lying about what it rebuilt.
export async function decodeBuild(param) {
  const fail = (reason) => ({ state: null, reason });
  if (typeof param !== "string" || !param) return fail("the link carried no build");
  if (param.length > MAX_PARAM_CHARS) return fail(`the link is ${param.length} characters, over the ${MAX_PARAM_CHARS} cap`);

  let raw;
  try {
    const bytes = fromBase64Url(param);
    if (!bytes.length) throw new Error("empty payload");
    const flag = bytes[0];
    const body = bytes.subarray(1);
    if (flag === FLAG_DEFLATE) raw = await inflateRaw(body);
    else if (flag === FLAG_RAW) {
      if (body.length > MAX_DECODED_BYTES) throw new Error("the payload is over the size cap");
      raw = body;
    } else throw new Error(`unknown format flag ${flag}`);
  } catch (err) {
    return fail(`the link could not be unpacked: ${err.message}`);
  }

  let data;
  try {
    data = JSON.parse(new TextDecoder().decode(raw));
  } catch (err) {
    return fail(`the link is not valid JSON: ${err.message}`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return fail("the payload is not an object");
  const has = (key) => Object.hasOwn(data, key);
  if (!has("v") || data.v !== SHARE_VERSION) return fail(`this link is format v${has("v") ? data.v : "?"}; this builder reads v${SHARE_VERSION}`);

  // --- answers: every question present, every value one of that question's own options
  const rawAnswers = has("a") ? data.a : null;
  if (!rawAnswers || typeof rawAnswers !== "object" || Array.isArray(rawAnswers)) return fail("the answers are missing");
  const answers = {};
  for (const q of QUESTIONS) {
    if (!Object.hasOwn(rawAnswers, q.id)) return fail(`the answer "${q.id}" is missing`);
    const value = rawAnswers[q.id];
    if (!q.options.some((o) => o.value === value)) return fail(`"${String(value)}" is not an option for "${q.id}"`);
    answers[q.id] = value;
  }
  for (const key of Object.keys(rawAnswers)) {
    if (!QUESTIONS.some((q) => q.id === key)) return fail(`"${key}" is not one of this builder's questions`);
  }

  // --- board: ids, labels, caps, then the connections against what the ids actually are
  const rawBoard = has("b") ? data.b : null;
  if (!rawBoard || typeof rawBoard !== "object" || !Array.isArray(rawBoard.p) || !Array.isArray(rawBoard.c)) {
    return fail("the board is missing or malformed");
  }
  if (rawBoard.p.length > MAX_PLACES) return fail(`the board carries ${rawBoard.p.length} places, over the cap of ${MAX_PLACES}`);

  const places = [];
  const placeIds = new Set();
  const affOwner = new Map(); // affordanceId → the place it sits in
  for (const entry of rawBoard.p) {
    if (!Array.isArray(entry) || entry.length !== 3) return fail("a place is not a [id, label, affordances] triple");
    const [id, label, affs] = entry;
    if (typeof id !== "string" || !PLACE_ID.test(id)) return fail(`"${String(id)}" is not a place id`);
    if (placeIds.has(id)) return fail(`the place id "${id}" appears twice`);
    if (typeof label !== "string" || !label.length || label.length > LABEL_MAX) {
      return fail(`a place name is empty or over ${LABEL_MAX} characters`);
    }
    if (!Array.isArray(affs) || affs.length > MAX_AFFORDANCES) {
      return fail(`"${label}" carries more than ${MAX_AFFORDANCES} affordances`);
    }
    const affordances = [];
    for (const aff of affs) {
      if (!Array.isArray(aff) || aff.length !== 2) return fail("an affordance is not an [id, label] pair");
      const [affId, affLabel] = aff;
      if (typeof affId !== "string" || !AFF_ID.test(affId)) return fail(`"${String(affId)}" is not an affordance id`);
      if (affOwner.has(affId)) return fail(`the affordance id "${affId}" appears twice`);
      if (typeof affLabel !== "string" || !affLabel.length || affLabel.length > LABEL_MAX) {
        return fail(`an affordance name is empty or over ${LABEL_MAX} characters`);
      }
      affOwner.set(affId, id);
      affordances.push({ id: affId, label: affLabel });
    }
    placeIds.add(id);
    places.push({ id, label, affordances });
  }

  const connections = [];
  const wired = new Set();
  for (const pair of rawBoard.c) {
    if (!Array.isArray(pair) || pair.length !== 2) return fail("a connection is not an [affordance, place] pair");
    const [from, to] = pair;
    if (!affOwner.has(from)) return fail(`a connection runs from "${String(from)}", which is not on this board`);
    if (!placeIds.has(to)) return fail(`a connection runs to "${String(to)}", which is not on this board`);
    if (wired.has(from)) return fail(`the affordance "${from}" is connected twice`);
    if (affOwner.get(from) === to) return fail(`the affordance "${from}" leads to the place it already sits in`);
    wired.add(from);
    connections.push([from, to]);
  }

  // --- the edited flag, strictly one of the two
  if (!has("e") || (data.e !== 0 && data.e !== 1)) return fail("the board's edited flag is not 0 or 1");

  // --- the token map: the same allowlist the drop path uses, and nothing dropped
  let pack = null;
  if (has("k")) {
    const k = data.k;
    if (!k || typeof k !== "object" || Array.isArray(k)) return fail("the design values are malformed");
    const keys = Object.keys(k);
    if (keys.length > MAX_TOKEN_KEYS) return fail(`the link carries ${keys.length} design values, over the cap of ${MAX_TOKEN_KEYS}`);
    const { tokens, rejected, skipped } = vetTokens(k);
    if (rejected.length) return fail(`a design value could not be applied safely: ${rejected[0].key}`);
    if (skipped.length) return fail(`"${skipped[0]}" is not a token this builder imports`);
    let slug = "shared";
    if (has("s")) {
      if (typeof data.s !== "string" || !SLUG_OK.test(data.s)) return fail(`"${String(data.s)}" is not a usable pack name`);
      slug = data.s;
    }
    // fileName stays null on purpose: no file was imported here, and naming one would be a claim
    // about a thing the receiving browser never saw.
    pack = { slug, label: slug, fileName: null, tokens, note: null };
  }

  return {
    state: { answers, board: { places, connections }, boardIsEdited: data.e === 1, pack },
    reason: null,
  };
}

// shareUrl(base, encoded) → the link, with every other param and the hash left alone. URL does the
// escaping; base64url's alphabet is entirely unreserved, so nothing is actually escaped.
export function shareUrl(base, encoded) {
  const url = new URL(base);
  url.searchParams.set(SHARE_PARAM, encoded);
  return url.toString();
}
