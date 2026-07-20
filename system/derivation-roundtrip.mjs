// system/derivation-roundtrip.mjs — the Verdant derivation round-trip exhibit, hand-written canon (this repo; not generated).
// Spec: docs/epics/per-company-brief.architecture.md §Recommended approach (public layer) + §Spikes 1
//       (epic #38, ticket #42 — closes #42). View-time-safe: fetches ONLY committed static files
//       (#40's verdant.diff.json + the pack-seed-verdant trace) and degrades to honest error cards.
//       No live LLM, no runtime deps — the reader replays what the factory already ran and measured.
//
// Two exports mirror trace-player's pure/DOM split: prepareDiff(diff) validates + returns a
// render-ready model (pure, Node-runnable); renderRoundTrip(container, model) builds the diff DOM.
// Every diff-derived string is written with textContent, never innerHTML — the diff is real
// agent-derived output, treated as untrusted. Colour swatches are the ONE data-driven exception:
// a hex reaches the DOM only via element.style.background (the hex IS the data being shown), never markup.

import { parseTrace, renderTracePlayer } from "./trace-player.mjs";

// --- prepareDiff: pure boundary validation (no document, no fetch — runs under Node) -------------
// The committed diff is the single source of truth for every number on the exhibit; this only reads
// it. Throws a plain Error naming the offending field (project error convention) so a malformed
// artifact fails loud at the boundary rather than rendering a half-empty exhibit.
export function prepareDiff(diff) {
  if (!diff || typeof diff !== "object") throw new Error("verdant.diff.json: not an object");
  const required = ["accent", "accentFamily", "neutrals", "type", "spacing", "radius", "aa", "verdict", "seedReview", "caveat"];
  for (const key of required) {
    if (diff[key] == null) throw new Error(`verdant.diff.json: missing ${key}`);
  }
  return diff; // thin normalizer — the diff object is already the render-ready model
}

// --- DOM helpers (all diff text via textContent — untrusted) -------------------------------------
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

// A colour chip. The hex is set via .style.background (the data-driven exception) + surfaced as a
// text <code> beside it wherever it appears, so the value is never carried by colour alone.
const swatch = (hex) => {
  const s = el("span", "rt-swatch");
  if (hex) { s.style.background = hex; s.title = hex; }
  return s;
};
// A swatch + its hex, as one inline cell.
function swHex(hex) {
  const cell = el("span", "rt-sw-cell");
  cell.append(swatch(hex), el("code", "rt-hex", hex));
  return cell;
}
// A pass/fail token rendered as text (glyph + word) — state read from shape+word, not colour.
function verdictMark(ok, label) {
  const span = el("span", `rt-mark ${ok ? "is-ok" : "is-bad"}`);
  span.append(el("span", "rt-mark-glyph", ok ? "✓" : "✗"), el("span", null, label));
  return span;
}

// A small table builder. headers: string[]; rows: Array<Array<string|Node>>; rowCls applied to every
// body row (used to mute the excluded-neutrals rows).
function diffTable(headers, rows, rowCls) {
  const t = el("table", "rt-diff-table");
  const thead = el("thead");
  const htr = el("tr");
  headers.forEach((h) => htr.append(el("th", null, h)));
  thead.append(htr);
  t.append(thead);
  const tbody = el("tbody");
  rows.forEach((cells) => {
    const tr = el("tr", rowCls || null);
    cells.forEach((c) => {
      const td = el("td");
      if (c instanceof Node) td.append(c);
      else if (c != null) td.textContent = String(c);
      tr.append(td);
    });
    tbody.append(tr);
  });
  t.append(tbody);
  return t;
}

// A collapsed <details> accordion mirroring portfolio.css .cs-acc (summary = the claim, body = the data).
function accordion(summaryText, ...bodyNodes) {
  const wrap = el("div", "cs-acc rt-acc");
  const det = document.createElement("details");
  const sum = el("summary", null, summaryText);
  sum.append(el("span", "mark"));
  det.append(sum);
  const body = el("div", "acc-body");
  bodyNodes.forEach((n) => n && body.append(n));
  det.append(body);
  wrap.append(det);
  return wrap;
}

// --- renderRoundTrip: build the diff DOM, return { destroy } -------------------------------------
export function renderRoundTrip(container, model) {
  container.textContent = "";
  const root = el("div", "rt");

  // (1) Headline metric — the accent read vs ground truth, ΔE, threshold. Stated calmly: the number
  // is shown and contextualized, never celebrated (the co-equal caveat panel is static HTML above).
  const metric = el("div", "rt-metric");
  metric.append(el("p", "rt-metric-label", "Accent fidelity — the agent's raw read vs ground truth"));
  const pair = el("div", "rt-swatch-pair");
  const proposedCell = el("span", "rt-sw-cell");
  proposedCell.append(swatch(model.accent.proposed), el("code", "rt-hex", model.accent.proposed), el("span", "rt-sw-tag", "proposed"));
  const truthCell = el("span", "rt-sw-cell");
  truthCell.append(swatch(model.accent.truth), el("code", "rt-hex", model.accent.truth), el("span", "rt-sw-tag", "ground truth"));
  pair.append(proposedCell, el("span", "rt-arrow", "→"), truthCell);
  metric.append(pair);
  const delta = el("p", "rt-metric-delta");
  delta.append(el("span", "rt-delta-num", `ΔE ${model.accent.deltaE}`));
  delta.append(el("span", "rt-delta-note", `${model.accent.within ? "within" : "outside"} the ${model.accent.threshold} accent threshold`));
  metric.append(delta);
  root.append(metric);

  // (2) The human gate — agent proposes, human decides (rendered as an action, not a name; the
  // reviewer identity stays in the inspectable JSON — memory: Site identity calls).
  const correction = model.seedReview.corrections && model.seedReview.corrections["color-accent"];
  const gate = el("div", "rt-gate");
  gate.append(el("p", "rt-gate-title", "The visible human gate"));
  const gateLine = el("p", "rt-gate-line");
  gateLine.append(el("span", null, "Agent proposed "), swHex(model.accent.proposed), el("span", null, "  →  human corrected to "), swHex(correction));
  gate.append(gateLine);
  const changed = (model.seedReview.changedTokens || []).length;
  gate.append(el("p", "rt-gate-note", `Approved ${model.seedReview.date} · ${changed} token${changed === 1 ? "" : "s"} changed (color-accent). The diff above measures the agent's raw proposal, never the corrected value.`));
  root.append(gate);

  // (3) The verdict panel — the measured label VERBATIM (no "provisional": that qualifier is authored
  // static copy citing the architecture, kept off the raw measured label). labelScope is rendered as
  // committed so the tier-earned vs seed-approved distinction is never collapsed.
  const verdict = el("div", "rt-verdict");
  const vhead = el("p", "rt-verdict-head");
  vhead.append(el("span", "rt-verdict-eyebrow", "Measured verdict"));
  vhead.append(el("span", "rt-verdict-label", model.verdict.label));
  verdict.append(vhead);
  verdict.append(el("p", "rt-verdict-rule", model.verdict.rule));
  const passes = el("div", "rt-passes");
  passes.append(verdictMark(model.verdict.passes.accentWithin, "accent within"));
  passes.append(verdictMark(model.verdict.passes.typeUsable, "type usable"));
  passes.append(verdictMark(model.verdict.passes.spacingUsable, "spacing usable"));
  verdict.append(passes);
  if (model.verdict.labelScope) verdict.append(el("p", "rt-verdict-scope", model.verdict.labelScope));
  root.append(verdict);

  // (4) Progressive disclosure — the exhaustive per-token evidence, one click away, calm by default.
  const acc = el("div", "rt-accordions");

  // Accent family (5)
  acc.append(accordion(
    `Accent family (${model.accentFamily.length})`,
    diffTable(
      ["Token", "Proposed", "Ground truth", "ΔE"],
      model.accentFamily.map((t) => [t.token, swHex(t.proposed), swHex(t.truth), String(t.deltaE)])
    )
  ));

  // Neutrals (10) — reported, excluded from the verdict (muted rows).
  acc.append(accordion(
    `Neutrals — reported, excluded from the verdict (${model.neutrals.tokens.length})`,
    el("p", "rt-note", model.neutrals.note),
    diffTable(
      ["Token", "Proposed", "Ground truth", "ΔE"],
      model.neutrals.tokens.map((t) => [t.token, swHex(t.proposed), swHex(t.truth), String(t.deltaE)]),
      "rt-excluded"
    )
  ));

  // Type ramp — scored steps + unscored (viewport-artifact) + intrinsic-usability checks.
  const typeScored = diffTable(
    ["Step", "Proposed", "Ground truth", "Δpx"],
    model.type.scored.map((s) => [s.step, s.proposed, s.truth, String(s.deltaPx)])
  );
  const typeUnscored = el("ul", "rt-list");
  model.type.unscored.forEach((s) => {
    const li = el("li");
    li.append(el("code", "rt-token", s.step), el("span", null, ` ${s.proposed} vs ${s.truth} — `), el("span", "rt-muted", s.note));
    typeUnscored.append(li);
  });
  acc.append(accordion(
    "Type ramp",
    typeScored,
    el("p", "rt-subhead", "Reported, not scored (viewport artifact):"),
    typeUnscored,
    checksRow(model.type.checks)
  ));

  // Spacing & radius — steps + checks. Radius is a good honest case: proposed differs from truth yet
  // stays usable (radius is not in the verdict rule), shown plainly.
  const spacingTable = diffTable(
    ["Step", "Proposed", "Ground truth"],
    model.spacing.steps.map((s) => [s.step, s.proposed, s.truth])
  );
  const radiusTable = diffTable(
    ["Step", "Proposed", "Ground truth"],
    model.radius.steps.map((s) => [s.step, s.proposed, s.truth])
  );
  acc.append(accordion(
    "Spacing & radius",
    el("p", "rt-subhead", "Spacing"),
    spacingTable,
    checksRow(model.spacing.checks),
    el("p", "rt-subhead", "Radius"),
    radiusTable
  ));

  // WCAG AA — 12 pairs (all measured on the proposed palette). Each row shows the actual contrast as a
  // mini sample (fg-on-bg), plus the ratio and a text result — pass never carried by colour alone.
  const tokenHex = {};
  [model.accent, ...model.accentFamily, ...model.neutrals.tokens].forEach((t) => { tokenHex[t.token] = t.proposed; });
  const aaRows = model.aa.pairs.map((p) => {
    const sample = el("span", "rt-aa-sample");
    const fgHex = tokenHex[p.fg], bgHex = tokenHex[p.bg];
    if (bgHex) sample.style.background = bgHex;
    if (fgHex) sample.style.color = fgHex;
    sample.textContent = "Aa";
    sample.title = `${p.fg} on ${p.bg}`;
    return [sample, p.usage, `${p.ratio} (min ${p.min})`, verdictMark(p.pass, p.pass ? "pass" : "fail")];
  });
  acc.append(accordion(
    `WCAG AA — ${model.aa.pairs.length} pairs`,
    el("p", "rt-note", model.aa.note),
    diffTable(["Sample", "Usage", "Contrast", "Result"], aaRows)
  ));

  // Optional (shown-not-asserted spirit, one line): what the agent did NOT propose — contract-filled.
  if (Array.isArray(model.notProposed) && model.notProposed.length) {
    const np = el("ul", "rt-list rt-list-inline");
    model.notProposed.forEach((tok) => np.append(el("li", null, tok)));
    acc.append(accordion(
      `Not proposed — filled from the contract (${model.notProposed.length})`,
      el("p", "rt-note", "The agent proposed only what it could read from the screenshots; these relative or structural tokens were completed from the contract defaults."),
      np
    ));
  }

  root.append(acc);
  container.append(root);
  return { destroy: () => { container.textContent = ""; } };
}

// A row of intrinsic-usability checks (monotonic / bodyInRange / …) as text pass marks.
function checksRow(checks) {
  const row = el("div", "rt-checks");
  Object.entries(checks).forEach(([name, ok]) => row.append(verdictMark(!!ok, name)));
  return row;
}

// --- errorCard + self-mount (graceful degradation; mirror factory.html:438-455) ------------------
function errorCard(mount, message) {
  mount.textContent = "";
  const card = el("article", "card trace-error-card");
  card.style.padding = "var(--spacing-md)";
  card.append(el("h3", "h3", "This part of the exhibit couldn’t load"));
  const p = el("p", "muted", message);
  p.style.marginTop = "var(--spacing-sm)";
  card.append(p);
  mount.append(card);
}

// The two fetches are independent — a diff failure must not block the trace mount, or vice-versa.
// [data-*="ready"] is set ONLY on success, so a real failure fails loud (the VR gate hangs) rather
// than baking a false-green baseline (same rule as factory.html:429-434). Fetch URLs are
// root-absolute (browser fetch); the module import is relative (Node-safe) — see the header.
function init() {
  const diffMount = document.getElementById("roundtrip-diff");
  if (!diffMount) return; // inert on any page without the exhibit
  const diffPath = "/tooling/round-trip/verdant.diff.json";
  fetch(diffPath)
    .then((r) => { if (!r.ok) throw new Error(`${diffPath} → HTTP ${r.status}`); return r.json(); })
    .then((diff) => { renderRoundTrip(diffMount, prepareDiff(diff)); diffMount.dataset.diff = "ready"; })
    .catch((err) => errorCard(diffMount, `Could not load the fidelity diff — ${err.message}`));

  const player = document.getElementById("roundtrip-player");
  if (player) {
    const tracePath = "/traces/pack-seed-verdant.jsonl";
    fetch(tracePath)
      .then((r) => { if (!r.ok) throw new Error(`${tracePath} → HTTP ${r.status}`); return r.text(); })
      .then((text) => { renderTracePlayer(player, parseTrace(text)); player.dataset.trace = "ready"; })
      .catch((err) => errorCard(player, `Could not load the derivation run — ${err.message}`));
  }
}

if (typeof document !== "undefined") init();
