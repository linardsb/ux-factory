// tooling/figma/figma-parity.mjs — Figma ↔ token-contract parity read (authoring-time,
// standalone; epic #1, ticket #12; folds spike 1). Architecture §Boundaries "Figma boundary".
// Tries GET /v1/files/:key/variables/local (Enterprise-gated read); on a 403 gate it captures
// Figma's exact error body as evidence and falls back to ONE GET /v1/files/:key, resolving
// local style values by walking document nodes whose `styles` refs point at the file's
// top-level styles map. Diffs the result against system/tokens.source.json `contract` and
// writes handoff/verdant/figma-parity.json — the committed real-run parity artifact.
//
// Deliberately NOT registered in agent-layer/build.mjs: the generator chain stays
// deterministic and offline-runnable; this script needs a secret + network.
// Secrets: FIGMA_TOKEN + FIGMA_FILE_KEY from the environment or portal/.env (gitignored).
// Rate budget: on a Starter-plan file, GET file is limited to ~6 requests/MONTH — the raw
// response is cached to tooling/figma/.last-response.json (gitignored); re-parse with:
//   node tooling/figma/figma-parity.mjs --offline

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ENV_FILE = join(ROOT, "portal/.env");
const TOKENS_SOURCE = join(ROOT, "system/tokens.source.json");
const CACHE = join(ROOT, "tooling/figma/.last-response.json");
const ARTIFACT = join(ROOT, "handoff/verdant/figma-parity.json");

// portal/lib/env.mjs's .env parse (same regex, comments skipped, env never overridden).
function loadEnv() {
  if (!existsSync(ENV_FILE)) return;
  for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#") && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// Flatten the DTCG `contract` group to leaf name → { type, value }.
function flattenContract(node, out = {}) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    if (value && typeof value === "object" && "$value" in value) out[key] = { type: value.$type, value: value.$value };
    else if (value && typeof value === "object") flattenContract(value, out);
  }
  return out;
}

// Figma name ("color/accent", "Color Accent") ↔ token leaf ("color-accent").
const norm = (s) => String(s).toLowerCase().replace(/^--/, "").replace(/[\s/._]+/g, "-");

// Figma {r,g,b,a} floats → #rrggbb(aa) hex.
function rgbaToHex({ r, g, b, a = 1 }) {
  const hex = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}${a < 1 ? hex(a) : ""}`;
}

async function figmaGet(path, token) {
  const res = await fetch(`https://api.figma.com${path}`, { headers: { "X-Figma-Token": token } });
  if (res.status === 429) {
    throw new Error(
      `Figma 429 on ${path} — Retry-After: ${res.headers.get("Retry-After")}, ` +
      `X-Figma-Plan-Tier: ${res.headers.get("X-Figma-Plan-Tier")}. No retry (Starter files allow ~6 GET-file/month; use --offline against the cache).`,
    );
  }
  const body = await res.text();
  return { status: res.status, body };
}

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

// GET-file response → same entry shape, from published-locally styles: the top-level
// `styles` map names them; values only exist on document nodes that reference a style
// id, so walk the tree and read solid fills (docs' own guidance for local styles —
// the /styles endpoint lists published team-library styles only, empty on Starter).
function entriesFromFile(data) {
  const styleValues = {};
  (function walk(node) {
    if (!node || typeof node !== "object") return;
    if (node.styles && node.fills) {
      const fillStyle = node.styles.fill ?? node.styles.fills;
      const solid = Array.isArray(node.fills) && node.fills.find((f) => f.type === "SOLID" && f.visible !== false);
      if (fillStyle && solid && !(fillStyle in styleValues)) {
        styleValues[fillStyle] = rgbaToHex({ ...solid.color, a: solid.opacity ?? solid.color.a ?? 1 });
      }
    }
    (node.children ?? []).forEach(walk);
  })(data.document);

  return Object.entries(data.styles ?? {}).map(([id, s]) => ({
    name: s.name,
    type: s.styleType === "FILL" ? "color" : null,
    value: styleValues[id] ?? null,
  }));
}

function compareRows(tokens, figmaEntries) {
  const byName = new Map(figmaEntries.map((e) => [norm(e.name), e]));
  return Object.entries(tokens).map(([name, t]) => {
    const figma = byName.get(norm(name));
    if (!figma) return { token: name, type: t.type, comparison: "missing", match: null, tokenValue: t.value, note: "no Figma variable/style under this name" };

    const isPlainHex = t.type === "color" && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(t.value);
    const isPlainPx = t.type === "dimension" && /^\d+(\.\d+)?px$/.test(t.value);
    if (isPlainHex && figma.type === "color" && figma.value) {
      const match = t.value.toLowerCase() === String(figma.value).toLowerCase();
      return { token: name, type: t.type, figmaName: figma.name, comparison: "value", match, tokenValue: t.value, figmaValue: figma.value };
    }
    if (isPlainPx && figma.type === "dimension") {
      const match = parseFloat(t.value) === figma.value;
      return { token: name, type: t.type, figmaName: figma.name, comparison: "value", match, tokenValue: t.value, figmaValue: `${figma.value}px` };
    }
    // Web-only values (clamp(), color-mix(), shadow strings, font stacks) and
    // unresolved aliases never match Figma numerically — name parity is the honest claim.
    return { token: name, type: t.type, figmaName: figma.name, comparison: "name-only", match: true, tokenValue: t.value, note: "web-only or non-plain value; name parity only" };
  });
}

export async function runParity({ offline = false } = {}) {
  let endpoint, gate = null, data, fileKey;

  if (offline) {
    if (!existsSync(CACHE)) throw new Error(`${CACHE}: no cached response — run once without --offline first`);
    ({ endpoint, gate, fileKey, data } = JSON.parse(readFileSync(CACHE, "utf8")));
  } else {
    loadEnv();
    const token = process.env.FIGMA_TOKEN;
    fileKey = process.env.FIGMA_FILE_KEY;
    if (!token) throw new Error(`${ENV_FILE}: FIGMA_TOKEN not set — add FIGMA_TOKEN=... (and FIGMA_FILE_KEY=...) there; it is gitignored.`);
    if (!fileKey) throw new Error(`${ENV_FILE}: FIGMA_FILE_KEY not set — the key of the Figma test file to diff against.`);

    const vars = await figmaGet(`/v1/files/${fileKey}/variables/local`, token);
    if (vars.status === 200) {
      endpoint = "variables";
      data = JSON.parse(vars.body);
    } else if (vars.status === 403) {
      // The gate itself is spike evidence — keep Figma's exact words for the honesty label.
      gate = { status: vars.status, body: vars.body.slice(0, 500) };
      const file = await figmaGet(`/v1/files/${fileKey}`, token);
      if (file.status !== 200) throw new Error(`Figma GET /v1/files/${fileKey} → ${file.status}: ${file.body.slice(0, 300)}`);
      endpoint = "file-styles";
      data = JSON.parse(file.body);
    } else {
      throw new Error(`Figma GET /v1/files/${fileKey}/variables/local → ${vars.status}: ${vars.body.slice(0, 300)}`);
    }
    // Cache the raw response first — GET file on a Starter-plan file is ~6/month.
    writeFileSync(CACHE, JSON.stringify({ endpoint, gate, fileKey, fetchedAt: new Date().toISOString(), data }, null, 2));
  }

  const source = JSON.parse(readFileSync(TOKENS_SOURCE, "utf8"));
  const tokens = flattenContract(source.contract);
  const figmaEntries = endpoint === "variables" ? entriesFromVariables(data) : entriesFromFile(data);
  const rows = compareRows(tokens, figmaEntries);

  const summary = {
    tokens: rows.length,
    figmaEntries: figmaEntries.length,
    valueMatch: rows.filter((r) => r.comparison === "value" && r.match).length,
    valueMismatch: rows.filter((r) => r.comparison === "value" && !r.match).length,
    nameOnly: rows.filter((r) => r.comparison === "name-only").length,
    missing: rows.filter((r) => r.comparison === "missing").length,
  };

  for (const r of rows) {
    const status = r.comparison === "missing" ? "—  missing" : r.comparison === "name-only" ? "≈  name-only" : r.match ? "✓  value" : "✗  MISMATCH";
    console.log(`${r.token.padEnd(28)} ${String(r.type).padEnd(11)} ${status.padEnd(14)} ${r.figmaValue ?? r.note ?? ""}`);
  }
  console.log(`\n${endpoint} · ${summary.valueMatch} value-match / ${summary.nameOnly} name-only / ${summary.missing} missing of ${summary.tokens} contract tokens`);

  const artifact = {
    note: "real run, from tooling/figma/figma-parity.mjs",
    ranAt: new Date().toISOString(),
    endpoint,
    gate,
    file: fileKey,
    rows,
    summary,
  };
  writeFileSync(ARTIFACT, JSON.stringify(artifact, null, 2) + "\n");
  console.log(`figma parity    ✓  ${ARTIFACT}`);
  return artifact;
}

// pathToFileURL, not `file://${argv[1]}`: this repo's path contains a space, which
// import.meta.url percent-encodes — the naive comparison never matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runParity({ offline: process.argv.includes("--offline") }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
