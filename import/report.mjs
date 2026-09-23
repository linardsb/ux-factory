// import/report.mjs — hand-written canon (this repo; not generated). THE IMPORT RECORD: what an import
// read, how it mapped, everything it lost, and whether the result LOOKS like the source — plus the
// validator that refuses a record whose stored copy disagrees with what it is derived from, and the
// markdown fold engineers read (epic #295 ticket #307; docs/epics/canvas-design-import.architecture.md
// :159-164, G30; PRD MVP 8; the owner's O3b on #307; .claude/plans/import-record-snap-rules-307.md D3,
// D8, D9).
//
// THE RECORD IS BUILT SO IT CANNOT LIE. Spike A shipped a Polaris mapping that passed 12/12 WCAG with
// dark-green body text, and 52 of 238 tokens appeared nowhere in its report. So:
//   · `drops`, `snaps`, `unbound` and `fidelity.verdict` are DERIVED — from the verdict tree, the
//     build() rows, the mapping and the IR — and `checkRecord` recomputes each one and refuses a
//     record whose stored copy disagrees. A caller cannot hand in a shorter loss list.
//   · AN EMPTY MEASUREMENT READS `missing`, NEVER `green` (the architecture's line, E4's
//     self-deceiving shape). `fidelityVerdict` is total over any input and returns green only when
//     BOTH measurements exist.
//   · O3b: THE REFERENCE MUST BE INDEPENDENT OF THE OUTPUT. A record whose fidelity reference is any
//     record's candidate render (by sha256) is refused — measuring an output against itself is a
//     green nobody earned.
//
// ─── THE THREE VERDICTS (D3) ─────────────────────────────────────────────────────────────────────
//   missing  fidelity absent or {}, no deltaEMin, zero scored regions, no wcag, or wcag.total 0
//   red      the worst region's ink-colour ΔE ≥ THRESHOLD (5.0), or any WCAG pair fails
//   green    otherwise
// WRONG BUT GREEN is red with every WCAG pair passing: legible colours that are not the source's.
// There is no `unmeasured`: S3 (#300) took the red leg, so the detector exists (import/fidelity.mjs).
//
// ─── WHERE THE DROPS COME FROM, AND WHY NOT THE IR ───────────────────────────────────────────────
// recognise() copies every IR node's own drops into its verdict (recognise.mjs:375-378, "the ONE
// place a reader — and #307's record — looks for the loss list"), so the VERDICT TREE is walked and
// the IR is not: walking both would file every converter and snap row twice. Then build()'s rows,
// which exist nowhere else — the matcher's `no-vocabulary-slot` and `unfillable-required-prop` are
// most of E1's read-but-never-emitted class. The CALLER runs build() ONCE PER TOP-LEVEL CHILD (it
// recurses itself) and hands in `recognition = { verdict, buildDrops }`. Then the mapping's own drops.
//
// ─── THE MARKDOWN (D9) ───────────────────────────────────────────────────────────────────────────
// Written in the subset system/handoff-viewer.mjs's renderMarkdown renders faithfully, so #314 can carry
// it unchanged: NO `#` headings (there are none — a section opens with a bold line), NO nested lists
// (items are trimStart()ed), pipe tables only for fields with no free text (splitRow splits on every
// `|` with no escape, and drop reasons carry `{fill | hug}`), every table cell through `cell()`. Free
// text goes in bullets. No dates, no clocks, no locale formatting, and NO `%` of this file's own:
// progress is stated by defect class closed, never as a percentage. (A drop reason is carried
// VERBATIM, and one quotes a spec's example figure, "94%" — build-checks 42.6 therefore asserts the
// template adds none, with every reason removed.) 42.6 also renders both committed mds through the
// real renderMarkdown.
//
// PURE. Imports ./ir.mjs and ./fidelity.mjs only — no fs. The WCAG half is computed by the caller
// (system/wcag.mjs is outside import/, and build-checks 40.7 keeps import/'s graph inside itself) and
// handed in as data, which is also the seam #311's import-run needs.

import { THRESHOLD } from "./fidelity.mjs";
import { checkIr, DROP_CLASS_OF, DROP_CLASSES, drop, walk } from "./ir.mjs";

export const REQUIRED_KEYS = Object.freeze(["id", "source", "ir", "recognition", "mapping", "snaps", "drops", "unbound", "fidelity", "provenance", "elapsed"]);
export const VERDICTS = Object.freeze(["red", "green", "missing"]);

const num = (v) => typeof v === "number" && Number.isFinite(v);

// D3, total over any input: never throws, never green without both measurements.
export function fidelityVerdict(f) {
  if (!f || typeof f !== "object") return "missing";
  const dm = f.deltaEMin, w = f.wcag;
  if (!dm || typeof dm !== "object" || !dm.worst || !num(dm.worst.value) || !(num(dm.scored) && dm.scored > 0)) return "missing";
  if (!w || typeof w !== "object" || !num(w.pass) || !num(w.total) || w.total === 0) return "missing";
  if (dm.worst.value >= THRESHOLD || w.pass < w.total) return "red";
  return "green";
}

// Every WCAG pair passes and the colours are still visibly wrong.
export const wrongButGreen = (f) => fidelityVerdict(f) === "red" && f.wcag.pass === f.wcag.total;

// The mapping's own drop rows → drop kinds. `never-read` has no mapping-side meaning (a role the
// mapping lists was read by definition), so it and any unknown class throw by name.
export function mappingDrops(mapping) {
  if (!mapping || !Array.isArray(mapping.drops)) throw new Error("record.mapping.drops: expected an array (empty when the mapping dropped nothing)");
  return mapping.drops.map((row, i) => {
    if (row?.class !== "read-then-dropped" && row?.class !== "read-but-never-emitted") {
      throw new Error(`record.mapping.drops[${i}] (${row?.role}): class ${JSON.stringify(row?.class)} is not read-then-dropped or read-but-never-emitted`);
    }
    return drop({ kind: row.class === "read-but-never-emitted" ? "no-contract-role" : "unmapped-role",
      slot: `mapping.${row.role}`, value: row.literal ?? null, reason: row.why });
  });
}

// The verdict tree's rows in pre-order, each with its verdict's path, then build()'s rows.
export function collectDrops(recognition) {
  if (!recognition?.verdict || !Array.isArray(recognition.buildDrops)) {
    throw new Error("record.recognition: expected { verdict, buildDrops } — build() run once per top-level child");
  }
  const out = [];
  const go = (v) => {
    for (const d of v.drops ?? []) out.push({ ...d, path: v.path });
    (v.children ?? []).forEach(go);
  };
  go(recognition.verdict);
  for (const d of recognition.buildDrops) out.push({ ...d, path: "build" });
  return out;
}

// THE drop list: the verdict tree, then build(), then the mapping (whose rows carry `path: "mapping"`).
// buildRecord and checkRecord both call this, so there is one derivation and nothing to drift.
export const derivedDrops = (recognition, mapping) => [
  ...collectDrops(recognition),
  ...mappingDrops(mapping).map((d) => ({ ...d, path: "mapping" })),
];

// The snap rows the IR carries, in walk order.
const snapsOf = (ir) => { const out = []; walk(ir, (n) => { if (Array.isArray(n.snaps)) out.push(...n.snaps); }); return out; };

const unboundOf = (snaps) => ({
  slots: snaps.length,
  exact: snaps.filter((s) => s.outcome === "exact").length,
  proposed: snaps.filter((s) => s.outcome === "proposed").length,
  dropped: snaps.filter((s) => s.outcome === "dropped").length,
  overridden: snaps.filter((s) => s.outcome === "override").length,
});

// Canonical JSON (sorted keys), for the derived-vs-stored compares.
const canon = (v) => (v && typeof v === "object" && !Array.isArray(v)
  ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`
  : (Array.isArray(v) ? `[${v.map(canon).join(",")}]` : JSON.stringify(v)));

export function buildRecord({ id, source, ir, recognition, mapping, fidelity, provenance, elapsed }) {
  const snaps = snapsOf(ir);
  const f = fidelity && typeof fidelity === "object" ? fidelity : {};
  return checkRecord({
    id, source, ir, recognition, mapping,
    snaps,
    drops: derivedDrops(recognition, mapping),
    unbound: unboundOf(snaps),
    fidelity: { ...f, verdict: fidelityVerdict(f) },
    provenance, elapsed,
  });
}

export function checkRecord(r) {
  if (!r || typeof r !== "object") throw new Error(`record: expected an object, got ${r === null ? "null" : typeof r}`);
  for (const k of REQUIRED_KEYS) if (!Object.hasOwn(r, k)) throw new Error(`record.${k}: missing — a record carries ${REQUIRED_KEYS.join(", ")}`);
  if (typeof r.id !== "string" || !r.id) throw new Error(`record.id: expected a non-empty string, got ${JSON.stringify(r.id)}`);
  checkIr(r.ir, "record.ir");
  if (r.source?.bound !== r.ir.source?.bound) throw new Error(`record.source.bound: ${JSON.stringify(r.source?.bound)} disagrees with the IR's ${JSON.stringify(r.ir.source?.bound)}`);
  if (!Array.isArray(r.drops)) throw new Error("record.drops: expected an array");
  const want = derivedDrops(r.recognition, r.mapping);
  const n = Math.max(want.length, r.drops.length);
  for (let i = 0; i < n; i++) {
    if (canon(r.drops[i]) !== canon(want[i])) {
      throw new Error(`record.drops[${i}]: ${r.drops.length} rows stored, ${want.length} derived from the verdict tree, build() and the mapping — the first difference is at index ${i} (stored ${canon(r.drops[i]) ?? "nothing"})`);
    }
  }
  r.drops.forEach((d, i) => {
    if (d.class !== DROP_CLASS_OF[d.kind]) throw new Error(`record.drops[${i}].class: "${d.class}" is not DROP_CLASS_OF["${d.kind}"] = "${DROP_CLASS_OF[d.kind]}"`);
  });
  if (canon(r.snaps) !== canon(snapsOf(r.ir))) throw new Error("record.snaps: disagrees with the snap rows the IR carries");
  if (canon(r.unbound) !== canon(unboundOf(r.snaps))) throw new Error(`record.unbound: ${canon(r.unbound)} is not the count derived from snaps, ${canon(unboundOf(r.snaps))}`);
  if (!r.fidelity || typeof r.fidelity !== "object") throw new Error("record.fidelity: expected an object ({} reads missing)");
  const verdict = fidelityVerdict(r.fidelity);
  if (r.fidelity.verdict !== verdict) throw new Error(`record.fidelity.verdict: "${r.fidelity.verdict}" stored, "${verdict}" derived — an empty measurement is missing, never a pass`);
  if (!r.provenance || ![1, 2].includes(r.provenance.mode) || r.provenance.mode !== r.ir.mode) {
    throw new Error(`record.provenance.mode: ${JSON.stringify(r.provenance?.mode)} — 1 or 2, and equal to ir.mode (${r.ir.mode})`);
  }
  const dm = r.fidelity.deltaEMin;
  if (dm?.reference?.sha256 && dm.reference.sha256 === dm.candidate?.sha256) {
    throw new Error(`record.fidelity.deltaEMin: the reference and the candidate are the same image (${dm.reference.sha256}) — O3b`);
  }
  return r;
}

// O3b across records: no record's reference may be any record's candidate output (itself included).
export function checkReferenceIndependence(records) {
  for (const a of records) {
    const ref = a.fidelity?.deltaEMin?.reference?.sha256;
    if (!ref) continue;
    for (const b of records) {
      if (b.fidelity?.deltaEMin?.candidate?.sha256 === ref) {
        throw new Error(`O3b: ${a.id}'s fidelity reference is ${b.id}'s candidate output (${ref})`);
      }
    }
  }
  return records;
}

// ─── the markdown fold ───────────────────────────────────────────────────────────────────────────

// Every table cell passes through here: a `|` would split the row (splitRow has no escape), an empty
// cell would be dropped as a bounding pipe. The JSON keeps the original.
const cell = (v) => {
  const s = v === null || v === undefined ? "" : String(v).replace(/\s*\n\s*/g, " ").replace(/\|/g, "/").trim();
  return s === "" ? "—" : s;
};
const code = (v) => (v === null || v === undefined || v === "" ? "—" : `\`${String(v).replace(/`/g, "'")}\``);
const table = (head, rows) => [
  `| ${head.join(" | ")} |`,
  `| ${head.map(() => "---").join(" | ")} |`,
  ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`),
].join("\n");
const TOK_SLOTS = [["layout", "gap"], ["text", "size"], ["text", "lineHeight"], ["text", "family"], ["style", "radius"], ["style", "fill"]];

function tokenUses(r) {
  const contract = new Map(), source = new Map();
  const add = (m, ref, slot) => { if (!m.has(ref)) m.set(ref, new Set()); m.get(ref).add(slot); };
  const see = (t, slot) => {
    if (!t || typeof t !== "object" || typeof t.ref !== "string") return;
    if (t.ref.startsWith("--")) add(contract, t.ref, slot);
    else add(source, t.ref, slot);
  };
  walk(r.ir, (n) => {
    if (!n.kind) return;
    for (const [g, k] of TOK_SLOTS) see(n[g]?.[k], `${g}.${k}`);
    (n.layout?.pad ?? []).forEach((t, i) => see(t, `layout.pad[${i}]`));
    see(n.style?.stroke?.color, "style.stroke.color");
    see(n.style?.stroke?.width, "style.stroke.width");
  });
  for (const [role, token] of Object.entries(r.mapping?.roles ?? {})) add(contract, token, `mapping.${role}`);
  const rows = (m) => [...m.keys()].sort().map((ref) => [code(ref), [...m.get(ref)].sort().join(", ")]);
  return { contract: rows(contract), source: rows(source) };
}

export function projectRecord(r) {
  const out = [];
  const para = (s) => out.push(s, "");
  const bullets = (items) => { if (items.length) para(items.map((i) => `- ${i}`).join("\n")); };

  para(`**Import record — ${r.id}**`);

  para("**Source**");
  bullets([
    `tool: ${code(r.source.tool)}`,
    `project: ${r.source.project ? code(r.source.project) : "not recorded"}`,
    `element ids: ${r.source.ids?.length ? r.source.ids.map(code).join(", ") : "none"}`,
    `bound: ${r.source.bound ? "yes — every tokenisable slot arrived with a source token" : "no — at least one value arrived raw and went to the snap step"}`,
    `file: ${code(r.source.file)}`,
    `sha256: ${code(r.source.sha256)}`,
  ]);

  const uses = tokenUses(r);
  para("**Tokens used**");
  para("Contract tokens — bound spacing, snaps and the mapping's roles:");
  para(uses.contract.length ? table(["token", "slots"], uses.contract) : "None.");
  para("Source refs — the source's own token names on bound slots:");
  para(uses.source.length ? table(["ref", "slots"], uses.source) : "None.");

  // Structure: one row per verdict node in pre-order, with the IR node's name beside it.
  const names = new Map();
  walk(r.ir, (n, path) => { if (n.kind) names.set(path, n.name); });
  const rows = [];
  const go = (v) => {
    if (v.kind) {
      const as = v.covered ? `${code(v.name)} (${v.via})` : "NOT COVERED";
      rows.push([code(v.path), v.kind, names.get(v.path), as]);
    }
    (v.children ?? []).forEach(go);
  };
  go(r.recognition.verdict);
  para("**Structure**");
  para(table(["path", "kind", "name", "recognised as"], rows));

  para("**Snaps**");
  if (!r.snaps.length) para("Bound source — nothing to snap.");
  else {
    para(`${r.unbound.slots} unbound slots: ${r.unbound.exact} exact, ${r.unbound.proposed} proposed, ${r.unbound.dropped} dropped, ${r.unbound.overridden} overridden.`);
    para(table(["path", "slot", "value", "outcome", "ref", "distance", "candidates"], r.snaps.map((s) => [
      code(s.path), code(s.slot), s.value, s.outcome, s.ref ? code(s.ref) : "—",
      s.distance !== null ? String(s.distance) : (s.candidates.length > 1 ? "tie — see candidates" : "—"),
      s.candidates.map((c) => `${c.ref} (${c.distance > 0 ? "+" : ""}${c.distance})`).join(", "),
    ])));
  }

  para("**Drops**");
  for (const cls of DROP_CLASSES) {
    const rows = r.drops.filter((d) => d.class === cls);
    para(rows.length ? `**\`${cls}\` — ${rows.length} open**` : `**\`${cls}\` — closed**`);
    bullets(rows.map((d) => `${code(d.kind)} at ${code(d.path)} ${code(d.slot)} — ${d.value === null || d.value === undefined ? "no value" : code(d.value)} — ${d.reason}`));
  }

  const f = r.fidelity;
  const dm = f.deltaEMin;
  para("**Fidelity**");
  para(`Verdict: **${f.verdict}**.`);
  if (wrongButGreen(f)) {
    para(`**Wrong but green.** Every WCAG pair passes (${f.wcag.pass}/${f.wcag.total}) and the worst region reads ΔE ${dm.worst.value} against a threshold of ${THRESHOLD.toFixed(1)}: the colours are legible and not the source's.`);
  }
  if (dm) {
    para(dm.worst
      ? `Worst region: ${code(dm.worst.region)} at ΔE ${dm.worst.value} (${dm.rung}, CIEDE2000) against a threshold of ${THRESHOLD.toFixed(1)}; ${dm.scored} regions scored.`
      : "No region was scored — the measurement is missing.");
    para(table(["region", "ΔE", "excluded"], dm.regions.map((g) => [code(g.name), g.value === null ? "—" : String(g.value), g.excluded ?? "—"])));
    const ex = dm.regions.filter((g) => g.excluded);
    para(ex.length ? `Excluded, and named rather than dropped: ${ex.map((g) => code(g.excluded)).join(", ")}.` : "No region was excluded.");
    bullets([
      `reference sha256: ${code(dm.reference?.sha256)} — ${dm.reference?.source ?? "source not recorded"}`,
      `candidate sha256: ${code(dm.candidate?.sha256)} — ${dm.candidate?.source ?? "source not recorded"}`,
    ]);
  } else para("No ΔE measurement recorded.");
  if (f.wcag && num(f.wcag.total)) {
    para(`WCAG: ${f.wcag.pass}/${f.wcag.total} pairs pass.`);
    bullets((f.wcag.failing ?? []).map((p) => `failing: ${code(p)}`));
  } else para("No WCAG measurement recorded.");

  para("**Provenance**");
  const mode = r.provenance.mode === 1 ? "1 — the component joins the system" : "2 — frozen as a brand-locked exhibit, labelled as the original";
  bullets([
    `mode: ${mode}`,
    `licence: ${r.provenance.licence ?? "not recorded"}`,
    `attribution: ${r.provenance.attribution ?? "not recorded"}`,
  ]);

  para("**Elapsed**");
  bullets(Object.entries(r.elapsed ?? {}).map(([k, v]) => `${k}: ${v === null ? "not timed" : String(v)}`));

  while (out[out.length - 1] === "") out.pop();
  return `${out.join("\n")}\n`;
}
