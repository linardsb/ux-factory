// tooling/figma/figma-read.mjs — the shared Figma read: auth, rate budget, response cache and
// style/variable extraction, used by BOTH figma-parity.mjs (diff vs the contract) and
// figma-pull.mjs (import a pack). One copy of the budget machinery — a second would be the worst
// possible duplication, because the thing being conserved is a monthly quota (#110).
//
// Tries GET /v1/files/:key/variables/local (Enterprise-gated read); on a 403 gate it keeps Figma's
// exact error body as evidence and falls back to a PAGED read — GET /v1/files/:key?depth=1 for the
// page index, then one GET /v1/files/:key/nodes?ids=<page> per page — resolving local style values
// from the fills of nodes that reference them.
//
// Why paged, and not one GET /v1/files/:key: a real design system overflows V8's ~512 MB string
// cap. Streaming does not save you — res.text() AND JSON.parse each need the whole document as
// one string — so the payload has to be made smaller server-side. Splitting by page does that.
// GET /v1/files/:key/styles is NOT the way in: it lists PUBLISHED team-library styles only and
// answers 200 with an empty array on a non-Enterprise file (measured 2026-07-25).
//
// Secrets: FIGMA_TOKEN + FIGMA_FILE_KEY from the environment or portal/.env (gitignored).
// Rate budget: on a Starter-plan file, GET file is limited to ~6 requests/MONTH. Every response is
// streamed to tooling/figma/.raw/ (gitignored) and recorded BEFORE it is parsed, so a crash can
// never cost a request. A cached response is REUSED, never re-bought (`refresh` forces).

import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ENV_FILE = join(ROOT, "portal/.env");
const RAW_DIR = join(ROOT, "tooling/figma/.raw");
const MANIFEST = join(ROOT, "tooling/figma/.last-response.json");

// A JS string tops out near 512 MB and JSON.parse wants the document in one — stay well under,
// and report the overflow as a readable skip instead of an opaque "Invalid string length".
const SAFE_PARSE_BYTES = 128 * 1024 * 1024;

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

// portal/lib/env.mjs's .env parse (same regex, comments skipped, env never overridden).
function loadEnv() {
  if (!existsSync(ENV_FILE)) return;
  for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#") && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// Figma {r,g,b,a} floats → #rrggbb(aa) hex.
export function rgbaToHex({ r, g, b, a = 1 }) {
  const hex = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}${a < 1 ? hex(a) : ""}`;
}

// ── the request layer: every response is banked to disk before anything reads it ──────────
// One record per path, so a replay reruns the exact same call sequence for free.

let manifest = { fileKey: null, endpoint: null, gate: null, fetchedAt: null, requests: [] };
let offline = false;
let refresh = false;

const rawName = (path) => `${path.replace(/^\/v1\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.json`;

async function figmaGet(path, token, { optional = false } = {}) {
  const prior = manifest.requests.find((r) => r.path === path);
  if (offline) {
    // A replay reports what was actually banked: an uncached page is a skip the caller names,
    // not a crash — otherwise a replay only works for a run that already bought every page.
    if (!prior && optional) return null;
    if (!prior) throw new Error(`--offline: nothing cached for ${path} — run once without --offline first.`);
    return prior;
  }
  // A cached response is reused rather than re-bought: on a Starter file the whole month's
  // budget is ~6 GET-file requests, so widening a run must only pay for what it adds.
  if (prior && !refresh) {
    console.log(`  ${prior.status}  ${path}  ${mb(prior.bytes)}  (cached — --refresh to re-fetch)`);
    return prior;
  }

  const res = await fetch(`https://api.figma.com${path}`, { headers: { "X-Figma-Token": token } });

  mkdirSync(RAW_DIR, { recursive: true });
  const raw = join(RAW_DIR, rawName(path));
  // Stream the body straight to disk: a 500 MB payload must never become a JS string here,
  // or the request is spent on a crash — exactly how the 2026-07-25 run was lost.
  if (res.body) await pipeline(Readable.fromWeb(res.body), createWriteStream(raw));
  else writeFileSync(raw, "");

  const rec = {
    path,
    status: res.status,
    bytes: statSync(raw).size,
    raw: raw.slice(ROOT.length + 1),
    planTier: res.headers.get("X-Figma-Plan-Tier"),
    retryAfter: res.headers.get("Retry-After"),
  };
  manifest.requests = [...manifest.requests.filter((r) => r.path !== path), rec];
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2)); // bank it now, parse later
  console.log(`  ${res.status}  ${path}  ${mb(rec.bytes)}`);
  return rec;
}

const rawBody = (rec) => readFileSync(join(ROOT, rec.raw), "utf8");

function parseRaw(rec) {
  if (rec.bytes > SAFE_PARSE_BYTES) {
    throw new Error(
      `${rec.path} → ${mb(rec.bytes)} is past this script's ${mb(SAFE_PARSE_BYTES)} parse ceiling ` +
      `(a JS string caps near 512 MB and JSON.parse needs the whole document at once). ` +
      `The response is cached at ${rec.raw} — ask Figma for a narrower slice, don't reach for a bigger buffer.`,
    );
  }
  return JSON.parse(rawBody(rec));
}

const rateLimitNote = (rec) =>
  rec.status === 429
    ? ` — Retry-After: ${rec.retryAfter}, X-Figma-Plan-Tier: ${rec.planTier}. Starter files allow ~6 GET-file/month; re-parse the cache offline.`
    : "";

// ── entry extraction ──────────────────────────────────────────────────────────────────────

// Variables response → [{ name, type: "color"|"dimension"|other, value }].
// Values come from each variable's collection default mode; aliases stay unresolved
// (name parity is what matters for a chained variable).
function entriesFromVariables(data) {
  const collections = data.meta?.variableCollections ?? {};
  return Object.values(data.meta?.variables ?? {}).map((v) => {
    const mode = collections[v.variableCollectionId]?.defaultModeId;
    const raw = v.valuesByMode?.[mode];
    let type = null, value = null;
    if (raw && typeof raw === "object" && raw.type === "VARIABLE_ALIAS") type = "alias";
    else if (v.resolvedType === "COLOR" && raw) { type = "color"; value = rgbaToHex(raw); }
    else if (v.resolvedType === "FLOAT" && typeof raw === "number") { type = "dimension"; value = raw; }
    else value = raw ?? null;
    return { name: v.name, type, value };
  });
}

// Local styles are NAMED in a response's top-level `styles` map but only VALUED on the document
// nodes that reference them, so walk each returned subtree and read the first solid fill per id.
function collectStyleFills(node, out) {
  if (!node || typeof node !== "object") return;
  if (node.styles && node.fills) {
    const fillStyle = node.styles.fill ?? node.styles.fills;
    const solid = Array.isArray(node.fills) && node.fills.find((f) => f.type === "SOLID" && f.visible !== false);
    if (fillStyle && solid && !(fillStyle in out)) {
      out[fillStyle] = rgbaToHex({ ...solid.color, a: solid.opacity ?? solid.color.a ?? 1 });
    }
  }
  (node.children ?? []).forEach((child) => collectStyleFills(child, out));
}

// A plugin export (Tokens Studio, a variables dump, anything that walks the document in-app) is
// the way past BOTH walls at once: it reads variables the REST API gates behind Enterprise, and
// it costs no request. Rather than guess which tool wrote the file, flatten ANY nested JSON to
// path → value: DTCG `$value`/`$type` nodes, Tokens Studio's `{value,type}`, or bare strings.
// The REST variables envelope is delegated, so a raw API dump works too.
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const expandHex = (v) => (v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v).toLowerCase();

function leafEntry(name, value, declaredType) {
  if (typeof value === "string" && HEX.test(value.trim())) return { name, type: "color", value: expandHex(value.trim()) };
  if (typeof value === "number") return { name, type: "dimension", value };
  if (typeof value === "string" && /^-?\d+(\.\d+)?px$/.test(value.trim())) return { name, type: "dimension", value: parseFloat(value) };
  // Anything else (clamp(), a font stack, a shadow string) still counts for NAME parity.
  return { name, type: declaredType ?? null, value: value ?? null };
}

export function entriesFromExport(json) {
  if (json?.meta?.variables) return entriesFromVariables(json); // a raw REST variables dump
  if (Array.isArray(json?.collections)) {
    // A plugin variables dump (variables2json et al.): collections → modes → variables, all in
    // arrays the generic walker below deliberately skips. The first mode is the collection's
    // default set — a pack holds one value per token, so other modes (dark, compact) cannot come
    // across. Alias entries point at another variable instead of holding a literal; the ramp they
    // point into is already in the list, so they are skipped.
    const fromCollections = [];
    for (const col of json.collections) {
      for (const v of col?.modes?.[0]?.variables ?? []) {
        if (!v?.name || v.isAlias || v.value == null || typeof v.value === "object") continue;
        fromCollections.push(leafEntry(String(v.name), v.value, v.type ?? null));
      }
    }
    if (fromCollections.length) return fromCollections;
  }
  const out = [];
  (function walk(node, path) {
    if (node === null || typeof node !== "object") {
      if (path.length) out.push(leafEntry(path.join("/"), node));
      return;
    }
    if (Array.isArray(node)) return; // font stacks etc. — no token name of their own
    if ("$value" in node) return void out.push(leafEntry(path.join("/"), node.$value, node.$type));
    if ("value" in node && typeof node.value !== "object") return void out.push(leafEntry(path.join("/"), node.value, node.type));
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$") || key === "extensions") continue;
      walk(child, [...path, key]);
    }
  })(json, []);
  return out;
}

const entriesFromStyles = ({ styles, values }) =>
  Object.entries(styles).map(([id, s]) => ({
    name: s.name,
    type: s.styleType === "FILL" ? "color" : null,
    value: values[id] ?? null,
  }));

// The paged fallback: page index first (a few KB), then one /nodes call per page. Each page is
// banked and parsed on its own, so one oversized page degrades to a recorded skip, not a crash.
async function readPagedStyles(fileKey, token, { maxPages, only }) {
  const index = await figmaGet(`/v1/files/${fileKey}?depth=1`, token);
  if (index.status !== 200) {
    throw new Error(`Figma GET /v1/files/${fileKey}?depth=1 → ${index.status}: ${rawBody(index).slice(0, 300)}${rateLimitNote(index)}`);
  }
  const idx = parseRaw(index);
  const all = (idx.document?.children ?? []).map((p) => ({ id: p.id, name: p.name }));

  // No page filter given: pick the pages that look like foundations rather than buying the whole
  // file. A design system keeps its values on a handful of pages, and the default has to be
  // budget-safe — an unbounded run on a 92-page kit would spend three months of quota at once.
  // If nothing matches, refuse and print the index rather than guess with the reader's requests.
  let autoPicked = null;
  if (!only.length) {
    const looksFoundational = /colou?r|palette|brand|foundation|token|theme|style/i;
    let auto = all.filter((p) => looksFoundational.test(p.name));
    // A small file has no budget to protect: a seeded fixture is usually one page called
    // "Page 1", which no name heuristic will ever match. Refusing there would break the
    // round-trip for the exact file this whole exercise is about.
    if (!auto.length && all.length <= 4) auto = all;
    if (!auto.length) {
      throw new Error(
        `no page in this file looks like a palette, so there is nothing safe to auto-select. ` +
        `Name one with --page <name|id>. Pages:\n${all.map((p) => `    - ${p.name} [${p.id}]`).join("\n")}`,
      );
    }
    only = auto.map((p) => p.id);
    autoPicked = auto.map((p) => p.name);
    if (maxPages === Infinity) maxPages = 4; // a cap the caller can lift with --max-pages
    console.log(`  auto-selected ${auto.length} foundation page(s): ${autoPicked.join(", ")}`);
  }

  const styles = { ...(idx.styles ?? {}) };
  const values = {};
  const read = [];
  const skipped = [];

  let bought = 0;
  for (const page of all) {
    // One request per page, so the budget has to be spent deliberately — a design system's
    // values live on a handful of foundation pages, not across all 92 of a kit's screens. Both
    // bounds are only honest because every page they decline is named in the caller's report.
    if (only.length && !only.some((q) => q === page.id || page.name.toLowerCase().includes(q.toLowerCase()))) {
      skipped.push({ ...page, reason: autoPicked ? "not requested — does not look like a foundations page" : `not requested — page filter ${only.join(",")}` });
      continue;
    }
    if (bought >= maxPages) {
      skipped.push({ ...page, reason: `not requested — max-pages ${maxPages}` });
      continue;
    }
    bought += 1;
    const rec = await figmaGet(`/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(page.id)}`, token, { optional: true });
    if (!rec) {
      skipped.push({ ...page, reason: "not cached — this offline replay never bought this page" });
      continue;
    }
    if (rec.status !== 200) {
      skipped.push({ ...page, reason: `HTTP ${rec.status}${rateLimitNote(rec)}` });
      // Budget gone: report what was actually read rather than pretend the rest were empty.
      if (rec.status === 429) {
        for (const rest of all.slice(all.indexOf(page) + 1)) skipped.push({ ...rest, reason: "not requested — rate limited earlier in this run" });
        break;
      }
      continue;
    }
    let node;
    try {
      node = parseRaw(rec);
    } catch (e) {
      skipped.push({ ...page, bytes: rec.bytes, reason: e.message });
      continue;
    }
    for (const entry of Object.values(node.nodes ?? {})) {
      Object.assign(styles, entry.styles ?? {});
      collectStyleFills(entry.document, values);
    }
    read.push(page);
  }

  return { styles, values, fileName: idx.name ?? null, pages: { read, skipped } };
}

// Read a Figma file's design values. Returns { fileKey, fileName, endpoint, gate, entries, pages }
// where entries is [{ name, type, value }] — the shape both consumers diff or map against.
export async function readFigma({ from = null, offline: replay = false, refresh: force = false, maxPages = Infinity, only = [] } = {}) {
  // A file on disk short-circuits the network entirely: no token, no quota, no Enterprise gate.
  if (from) {
    const path = resolve(process.cwd(), from);
    const entries = entriesFromExport(JSON.parse(readFileSync(path, "utf8")));
    if (!entries.length) throw new Error(`${from}: no tokens found — expected DTCG ($value/$type), Tokens Studio ({value,type}), or a nested name→value map.`);
    console.log(`  export  ${from}  ${entries.length} tokens`);
    return { fileKey: from, fileName: basename(path), endpoint: "export-file", gate: null, entries, pages: null };
  }

  offline = replay;
  refresh = force;
  if (existsSync(MANIFEST)) manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));

  let token = null, fileKey, endpoint, gate = null, pages = null, data;

  if (offline) {
    if (!manifest.fileKey) throw new Error(`${MANIFEST}: no cached run — run once without --offline first.`);
    ({ fileKey, gate } = manifest);
  } else {
    loadEnv();
    token = process.env.FIGMA_TOKEN;
    fileKey = process.env.FIGMA_FILE_KEY;
    if (!token) throw new Error(`${ENV_FILE}: FIGMA_TOKEN not set — add FIGMA_TOKEN=... (and FIGMA_FILE_KEY=...) there; it is gitignored.`);
    if (!fileKey) throw new Error(`${ENV_FILE}: FIGMA_FILE_KEY not set — the key of the Figma file to read.`);
    // A different file invalidates every cached response — never mix two files' pages.
    if (manifest.fileKey !== fileKey) manifest = { fileKey, endpoint: null, gate: null, fetchedAt: null, requests: [] };
    manifest.fetchedAt = new Date().toISOString();
  }

  const vars = await figmaGet(`/v1/files/${fileKey}/variables/local`, token);
  if (vars.status === 200) {
    endpoint = "variables";
    data = parseRaw(vars);
  } else if (vars.status === 403) {
    // The gate itself is spike evidence — keep Figma's exact words for the honesty label.
    gate = { status: vars.status, body: rawBody(vars).slice(0, 500) };
    endpoint = "file-styles";
    data = await readPagedStyles(fileKey, token, { maxPages, only });
    pages = data.pages;
  } else {
    throw new Error(`Figma GET /v1/files/${fileKey}/variables/local → ${vars.status}: ${rawBody(vars).slice(0, 300)}${rateLimitNote(vars)}`);
  }

  if (!offline) {
    manifest.endpoint = endpoint;
    manifest.gate = gate;
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  }

  const entries = endpoint === "variables" ? entriesFromVariables(data) : entriesFromStyles(data);

  // An empty read is not a result. Reporting "0 matched" or emitting a pack from a file we never
  // actually saw would put a measured-looking number on nothing.
  if (entries.length === 0) {
    const skipped = pages?.skipped ?? [];
    throw new Error(
      `${endpoint}: Figma returned no variables or styles for file ${fileKey} — refusing to report a ` +
      `result from an empty read.\n` +
      (pages ? `  pages read: ${pages.read.length}, skipped: ${skipped.length}` + (skipped.length ? `\n${skipped.map((p) => `    - ${p.name}: ${p.reason}`).join("\n")}` : "") + "\n" : "") +
      `  On a non-Enterprise plan REST can only see LOCAL STYLES applied to nodes — variables ` +
      `(including drag-and-drop DTCG imports) are invisible to it. See system/figma-import.md ` +
      `Path 2: Tokens Studio → "Create styles", then apply them to nodes.`,
    );
  }

  return { fileKey, fileName: data.fileName ?? null, endpoint, gate, entries, pages };
}

// Shared CLI flag parsing, so both scripts spend the budget the same way.
export function readFlags(argv) {
  const maxPages = Number(argv[argv.indexOf("--max-pages") + 1]);
  return {
    // --from <export.json>: a plugin export instead of the API — no token, no quota, no gate.
    from: argv.includes("--from") ? argv[argv.indexOf("--from") + 1] : null,
    offline: argv.includes("--offline"),
    refresh: argv.includes("--refresh"),
    maxPages: argv.includes("--max-pages") && Number.isFinite(maxPages) ? maxPages : Infinity,
    // --page Color --page Spacing, or a comma list; matched against page name (substring) or id.
    only: argv.flatMap((a, i) => (a === "--page" ? String(argv[i + 1] ?? "").split(",") : [])).filter(Boolean),
  };
}
