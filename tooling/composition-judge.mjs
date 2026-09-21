// tooling/composition-judge.mjs — a pure, LLM-free post-hoc JUDGE over committed compositions (#420).
//
// It evaluates NAMED PREDICATES over a composition's JSON — never the rendered page — and prints
// one line per expectation and a verdict. Every predicate is a rule the compose prompt already
// states (portal/record-composition.mjs's PIV_COMPOSE_SYSTEM, or the slot bound in a scenario's
// compose.json); the PR that added each one maps predicate → prompt line. The expectations live in
// scenarios/<slug>/evals.json, one entry per committed composition, shaped after shadcn's evals
// (a prompt → the expectations that restate the rules).
//
// THE HONESTY RULE IS tooling/fieldwork-kpis.mjs's, VERBATIM IN SPIRIT: this grades and is never
// fed to a prompt. A failing expectation is a finding about a run, and a run is fixed by tightening
// the prompt and RE-RECORDING — the committed compositions stay labelled as they are, and the next
// real runs re-record under the new prompt. Nothing here edits a composition.
//
// WHAT THE JUDGE CANNOT SEE, stated so a green run is not over-read: it does not render, so a
// label that is sentence-case and wrong is green; it does not know the fixtures' truth (that is
// fieldwork-kpis.mjs's), so a correct-shaped wrong number is green; and it has no opinion on
// whether a composition is DEFENSIBLE — which tiles answer the question is the agent's judgement
// and a human's read. It checks the rules, not the taste. Raw counts sit beside every total; there
// are no weights and no letter grade, because a score would invite optimising the judge.
//
// Zero-dep, standalone:  node tooling/composition-judge.mjs <scenario> [--json]
// Exit 1 on any failed expectation; an evals file naming a predicate this file does not define is
// REFUSED BY NAME before anything is graded (a typo must not read as a pass).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ---- the string surfaces a reader sees, per node -------------------------------------------
// `status` is a chip: components.css uppercases it, so its case is the stylesheet's and not the
// copy's — it is exempt from sentence-case and nothing else.
const COPY_PROPS = ["label", "title", "body", "detail", "meta", "footnote", "unit", "content"];
const CTA_NODES = new Set(["primary-button", "ghost-button"]);
const TONED = (tone) => tone != null && tone !== "neutral";

const walk = (nodes, path = "") => {
  const out = [];
  (nodes ?? []).forEach((n, i) => {
    const p = `${path}[${i}]`;
    out.push({ node: n, path: p });
    if (Array.isArray(n?.children)) out.push(...walk(n.children, `${p}.children`));
  });
  return out;
};
const isNumberish = (v) => /^[-+−]?[\d.,]+(\s?%)?$/.test(String(v).trim());
const words = (s) => String(s).trim().split(/\s+/).filter(Boolean);
const ACRONYM = /^[A-Z][A-Z0-9]{1,4}s?$/; // SLA, SKU, SKUs, EUR, 400% is caught by the digit rule below
const isCapitalised = (w) => /^[A-Z][a-z]/.test(w);
// Everything after an em/en dash is an entity name (the prompt's own example puts names there).
const beforeEntity = (s) => String(s).split(/\s[—–]\s/)[0];

// ---- slot bounds, parsed from the scenario's own bound sentence ----------------------------
// "(3–5)" / "(typically 3–6" → [min, max]; "AT MOST 8" → max. Nothing invented: if the sentence
// states no number, the predicate says so and passes on count alone.
const boundsOf = (sentence) => {
  const range = /\(\s*(?:typically\s+)?(\d+)\s*[–-]\s*(\d+)/i.exec(sentence ?? "");
  const most = /AT MOST\s+(\d+)/i.exec(sentence ?? "");
  return { min: range ? Number(range[1]) : null, max: most ? Number(most[1]) : range ? Number(range[2]) : null };
};

// ---- the predicates: id → { rule, source, phrase, check(composition, ctx) → { pass, detail } } --
// `rule` quotes the prompt line (or slot bound) each predicate restates; `source` says where it
// lives (prompt · slot · copy) and `phrase` is the exact substring build-checks group 37 looks for
// there, so a predicate cannot grade a rule the agent was never told. ctx carries the entry
// ({ slug, question, slot }), the scenario's compose config, its copy.json and its fixture sizes.
export const PREDICATES = Object.freeze({
  "label-reads-state-without-tone": {
    rule: "PIV_COMPOSE_SYSTEM: a label must read the state without its tone (e.g. \"Overdue\" + \"4\", not a bare \"4\")", source: "prompt", phrase: "without its tone",
    check(nodes) {
      const bad = walk(nodes).filter(({ node }) => Object.hasOwn(node.props ?? {}, "label"))
        .filter(({ node }) => { const l = String(node.props.label ?? "").trim(); return !l || isNumberish(l) || !/[a-z]/i.test(l) || l === String(node.props.value ?? "").trim(); });
      const n = walk(nodes).filter(({ node }) => Object.hasOwn(node.props ?? {}, "label")).length;
      return { pass: bad.length === 0, detail: bad.length ? `bare or empty labels at ${bad.map((b) => b.path).join(", ")}` : `${n} labelled node(s), each reads a state` };
    },
  },
  "value-is-number-or-le-2-words": {
    rule: "PIV_COMPOSE_SYSTEM: each node's value is a NUMBER (or a ≤2-word phrase) — a sentence in the value slot breaks the node", source: "prompt", phrase: "≤2-word phrase",
    check(nodes) {
      const valued = walk(nodes).filter(({ node }) => Object.hasOwn(node.props ?? {}, "value"));
      const bad = valued.filter(({ node }) => !isNumberish(node.props.value) && words(node.props.value).length > 2);
      return { pass: bad.length === 0, detail: bad.length ? `sentence values at ${bad.map((b) => `${b.path} (${JSON.stringify(b.node.props.value)})`).join(", ")}` : `${valued.length} value(s), every one a number or ≤2 words` };
    },
  },
  "tone-on-at-most-two-tiles": {
    rule: "compose.json summary-strip bound: use tone sparingly for the one or two figures that carry urgency", source: "slot", phrase: "one or two figures",
    check(nodes, ctx) {
      if (ctx.entry.slot !== "summary-strip") return { pass: true, detail: `not a summary-strip (${ctx.entry.slot}) — the bound does not apply, 0 checked` };
      const toned = walk(nodes).filter(({ node }) => TONED(node.props?.tone));
      return { pass: toned.length <= 2, detail: `${toned.length} of ${walk(nodes).length} tiles toned${toned.length > 2 ? ` — ${toned.map((t) => t.path).join(", ")}` : ""}` };
    },
  },
  "tile-count-within-slot-bounds": {
    rule: "compose.json slot bound: the node count the slot sentence states (a range, or AT MOST n)", source: "slot", phrase: "(3–5)",
    check(nodes, ctx) {
      const { min, max } = boundsOf(ctx.config.slots?.[ctx.entry.slot]);
      const n = (nodes ?? []).length;
      if (min == null && max == null) return { pass: true, detail: `the ${ctx.entry.slot} bound states no count; ${n} node(s), unbounded` };
      const ok = (min == null || n >= min) && (max == null || n <= max);
      return { pass: ok, detail: `${n} node(s) against ${min ?? "–"}..${max ?? "–"} for ${ctx.entry.slot}` };
    },
  },
  "no-one-node-per-record": {
    rule: "PIV_COMPOSE_SYSTEM: report only the few named entities that carry the answer; never one node per record", source: "prompt", phrase: "never one node per record",
    check(nodes, ctx) {
      const smallest = Math.min(...Object.values(ctx.fixtureSizes));
      const n = walk(nodes).length;
      return { pass: n < smallest, detail: `${n} node(s) against the smallest fixture's ${smallest} record(s) (${Object.entries(ctx.fixtureSizes).map(([k, v]) => `${k} ${v}`).join(", ")})` };
    },
  },
  "copy-uses-scenario-labels": {
    rule: "compose.json copy: prefer the scenario's human-authored display labels for tile labels", source: "copy", phrase: "prefer",
    check(nodes, ctx) {
      // Every *Labels map in copy.json (at any depth) is a raw-key → display-label table. A visible
      // string carrying the RAW key as a whole word where the display differs is a miss.
      const tables = [];
      const dig = (v) => { if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { if (/Labels$/.test(k) && x && typeof x === "object") tables.push(x); dig(x); } };
      dig(ctx.copy);
      // A pair differing only in case ("priority" → "Priority") is an ordinary word in sentence
      // case, and sentence-case owns it; the pairs this predicate can see are the raw IDENTIFIERS
      // ("en-route" → "En route", "on-site" → "On site").
      const pairs = tables.flatMap((t) => Object.entries(t)).filter(([raw, disp]) => raw.toLowerCase() !== String(disp).toLowerCase());
      if (!pairs.length) return { pass: true, detail: "copy.json declares no *Labels table — nothing to prefer, 0 checked" };
      const misses = [];
      for (const { node, path } of walk(nodes)) for (const prop of COPY_PROPS) {
        const s = node.props?.[prop];
        if (typeof s !== "string") continue;
        for (const [raw, disp] of pairs) if (new RegExp(`(^|[^\\w-])${raw}([^\\w-]|$)`).test(s)) misses.push(`${path}.${prop} says "${raw}" where copy says "${disp}"`);
      }
      return { pass: misses.length === 0, detail: misses.length ? misses.join("; ") : `${pairs.length} label pair(s) checked, no raw key shown` };
    },
  },
  // ---- the five copy rules (#420, Atlassian DESIGN.md Do/Don't lineage) ----------------------
  "cta-is-imperative": {
    rule: "PIV_COMPOSE_SYSTEM: a button label is an imperative verb phrase (\"Save\", not \"Submit\"/\"OK\")", source: "prompt", phrase: "IMPERATIVE verb phrase",
    check(nodes) {
      const ctas = walk(nodes).filter(({ node }) => CTA_NODES.has(node.name));
      const BLOCK = /^(submit|ok|okay|yes|no|click here|go|continue|done)$/i;
      const bad = ctas.filter(({ node }) => { const l = String(node.props?.label ?? "").trim(); return !l || BLOCK.test(l) || words(l).length > 4 || /[?!.]$/.test(l); });
      return { pass: bad.length === 0, detail: bad.length ? `generic or non-imperative CTAs at ${bad.map((b) => `${b.path} (${JSON.stringify(b.node.props?.label)})`).join(", ")}` : `${ctas.length} CTA(s) checked` };
    },
  },
  "link-text-is-descriptive": {
    rule: "PIV_COMPOSE_SYSTEM: link and button text says where it goes — never \"Learn more\"", source: "prompt", phrase: "never \"Learn more\"",
    check(nodes) {
      const GENERIC = /^(learn more|read more|more|click here|here|link|details|see more)$/i;
      const all = walk(nodes).filter(({ node }) => CTA_NODES.has(node.name) || typeof node.props?.href === "string");
      const bad = all.filter(({ node }) => GENERIC.test(String(node.props?.label ?? node.props?.text ?? "").trim()));
      return { pass: bad.length === 0, detail: bad.length ? `generic link text at ${bad.map((b) => b.path).join(", ")}` : `${all.length} link/CTA node(s) checked` };
    },
  },
  "error-carries-reason": {
    rule: "PIV_COMPOSE_SYSTEM: an error reads reason + action — a critical row says why, not only that", source: "prompt", phrase: "reason + action",
    check(nodes) {
      // The vocabulary's critical-tone row kinds carry a secondary field (meta / detail); a critical
      // row with it empty is a tone with no reason. metric-tile has no such field and is exempt.
      const rows = walk(nodes).filter(({ node }) => node.props?.tone === "critical" && ["list-row", "sequence-step"].includes(node.name));
      const bad = rows.filter(({ node }) => !String(node.props.meta ?? node.props.detail ?? "").trim());
      return { pass: bad.length === 0, detail: bad.length ? `critical rows with no reason at ${bad.map((b) => b.path).join(", ")}` : `${rows.length} critical row(s) checked` };
    },
  },
  "empty-state-has-next-step": {
    rule: "PIV_COMPOSE_SYSTEM: an empty state carries a next step — a body sentence or a button", source: "prompt", phrase: "carries a next step",
    check(nodes) {
      const empties = walk(nodes).filter(({ node }) => node.name === "empty-state");
      const bad = empties.filter(({ node }) => !String(node.props?.body ?? "").trim() && !(node.children ?? []).some((c) => CTA_NODES.has(c.name)));
      return { pass: bad.length === 0, detail: bad.length ? `empty states with no next step at ${bad.map((b) => b.path).join(", ")}` : `${empties.length} empty state(s) checked` };
    },
  },
  "sentence-case": {
    rule: "PIV_COMPOSE_SYSTEM: sentence case — the first word capitalised, the rest lower unless a name or an acronym", source: "prompt", phrase: "SENTENCE CASE",
    check(nodes) {
      const bad = [];
      let n = 0;
      for (const { node, path } of walk(nodes)) for (const prop of COPY_PROPS) {
        const s = node.props?.[prop];
        if (typeof s !== "string" || !s.trim()) continue;
        n += 1;
        if (prop === "unit") continue; // a unit is a symbol or a noun the value reads with ("jobs", "%", "SKUs")
        const head = beforeEntity(s);
        const ws = words(head);
        const first = ws[0] ?? "";
        const startsWrong = !/^[A-Z0-9"'(]/.test(first) && !ACRONYM.test(first);
        // Two or more Title-Cased words after the first, none an acronym, none a digit-led token.
        const titled = ws.slice(1).filter((w) => isCapitalised(w) && !ACRONYM.test(w)).length;
        const shouting = ws.filter((w) => /^[A-Z]{2,}$/.test(w) && !ACRONYM.test(w)).length;
        if (startsWrong || titled >= 2 || shouting) bad.push(`${path}.${prop} ${JSON.stringify(s)}`);
      }
      return { pass: bad.length === 0, detail: bad.length ? `not sentence case: ${bad.join(", ")}` : `${n} string(s) checked` };
    },
  },
});

// ---- the run package: evals + compositions + the scenario's own config ---------------------
export function loadEvals(scenario) {
  const p = join(ROOT, "scenarios", scenario, "evals.json");
  if (!existsSync(p)) throw new Error(`scenarios/${scenario}/evals.json does not exist — the judge grades only what a scenario declares`);
  const evals = JSON.parse(readFileSync(p, "utf8"));
  if (!Array.isArray(evals.evals) || !evals.evals.length) throw new Error(`scenarios/${scenario}/evals.json: "evals" must be a non-empty array of { slug, question, slot, expectations }`);
  for (const e of evals.evals) {
    for (const k of ["slug", "question", "slot"]) if (typeof e[k] !== "string" || !e[k]) throw new Error(`scenarios/${scenario}/evals.json: eval "${e.slug ?? "?"}" needs a non-empty "${k}"`);
    if (!Array.isArray(e.expectations) || !e.expectations.length) throw new Error(`scenarios/${scenario}/evals.json: eval "${e.slug}" needs a non-empty "expectations" array`);
    for (const id of e.expectations) if (!Object.hasOwn(PREDICATES, id)) throw new Error(`scenarios/${scenario}/evals.json: eval "${e.slug}" names predicate "${id}", which the judge does not define — it defines ${Object.keys(PREDICATES).join(" · ")}`);
  }
  return evals.evals;
}

function scenarioContext(scenario) {
  const dir = join(ROOT, "scenarios", scenario);
  const config = JSON.parse(readFileSync(join(dir, "compose.json"), "utf8"));
  const copy = existsSync(join(dir, "copy.json")) ? JSON.parse(readFileSync(join(dir, "copy.json"), "utf8")) : {};
  const fixtureSizes = Object.fromEntries(readdirSync(join(dir, "fixtures")).filter((f) => f.endsWith(".json"))
    .map((f) => { const d = JSON.parse(readFileSync(join(dir, "fixtures", f), "utf8")); return [f.replace(/\.json$/, ""), Array.isArray(d) ? d.length : Object.keys(d).length]; }));
  return { config, copy, fixtureSizes };
}

// Fieldwork's compositions sit at proto/compositions/<slug>.json (the pre-#88 layout); every other
// scenario's at proto/compositions/<scenario>/<slug>.json. Both are read, the scenario dir first.
export function compositionPath(scenario, slug) {
  const nested = join(ROOT, "proto/compositions", scenario, `${slug}.json`);
  const flat = join(ROOT, "proto/compositions", `${slug}.json`);
  if (existsSync(nested)) return nested;
  if (scenario === "fieldwork" && existsSync(flat)) return flat;
  throw new Error(`no committed composition for ${scenario}/${slug} — looked at ${nested} and ${flat}`);
}

// PURE over an in-memory composition, so build-checks can mutate one and watch a predicate go red.
export function judgeComposition(nodes, entry, ctx) {
  return entry.expectations.map((id) => {
    const p = PREDICATES[id];
    if (!p) throw new Error(`predicate "${id}" is not defined — the judge defines ${Object.keys(PREDICATES).join(" · ")}`);
    const { pass, detail } = p.check(nodes, { ...ctx, entry });
    return { id, pass, detail };
  });
}

export function judgeScenario(scenario, { compositions } = {}) {
  const evals = loadEvals(scenario);
  const ctx = scenarioContext(scenario);
  return evals.map((entry) => {
    const nodes = compositions?.[entry.slug] ?? JSON.parse(readFileSync(compositionPath(scenario, entry.slug), "utf8"));
    return { slug: entry.slug, slot: entry.slot, results: judgeComposition(nodes, entry, ctx) };
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const scenario = args.find((a) => !a.startsWith("--"));
  if (!scenario) { console.error("usage: node tooling/composition-judge.mjs <scenario> [--json]"); process.exit(2); }
  const report = judgeScenario(scenario);
  if (args.includes("--json")) { console.log(JSON.stringify(report, null, 2)); }
  else {
    for (const c of report) {
      console.log(`${c.slug} (${c.slot})`);
      for (const r of c.results) console.log(`  ${r.pass ? "✓" : "✗"} ${r.id} — ${r.detail}`);
    }
  }
  const all = report.flatMap((c) => c.results);
  const failed = all.filter((r) => !r.pass).length;
  console.log(`${failed ? "composition-judge ✗" : "composition-judge ✓"}  ${scenario}: ${all.length - failed} of ${all.length} expectations pass across ${report.length} composition(s)${failed ? ` — ${failed} failed` : ""}`);
  process.exit(failed ? 1 : 0);
}
