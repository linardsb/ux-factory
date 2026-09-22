// import/recognise.mjs — hand-written canon (this repo; not generated). AN IR NODE × THE COMPONENT
// VOCABULARY → A SCORED VERDICT WITH AN EXPLICIT "NOT COVERED" FLOOR (epic #295 ticket #304;
// docs/epics/canvas-design-import.architecture.md:260-263, decisions D3/E3;
// .claude/plans/canvas-import-prd-briefing.md:991-993, the matcher shape).
//
// RECOGNITION RUNS IN CODE BEFORE ANY PROSE. Until this file existed, "this drawing is a `list-row`"
// was a human reading a blueprint in a session — spike B did it in under a minute, spike C in 0:16 —
// and neither judgement was repeatable or auditable. E3's shape is what makes it both: independent,
// NAMED signal predicates each appending a (slug, score) candidate → sort → threshold → an explicit
// floor. A verdict can therefore say WHICH signal fired and WHICH FIELD it read, which is what #307's
// import record has to show and what #311's side-by-side view has to argue with.
//
// PURE. It imports ./ir.mjs AND NOTHING ELSE — no fs, no network, no SDK. THE VOCABULARY IS AN
// ARGUMENT, never read here: that keeps the module pure and makes the "no portal/node_modules" CI
// shape trivially true instead of dependent on path resolution (this repo's checkout path contains
// a space).
//
// ─── THE THREE RULES, STATED BEFORE THE NUMBERS ──────────────────────────────────────────────────
// The one real risk in a matcher is weights fitted backwards from the answers you wanted. The
// defence is a principle argued first and numbers chosen to serve it. Both human recognitions above
// were made BY NAME, in under a minute; neither counted props. So:
//
//   R1 · "NOT COVERED" IS A REAL OUTCOME, NEVER A FORCED PICK. The floor never takes the top
//        candidate. A source part the system does not have is the finding, not a failure.
//
//   R2 · `stack` IS THE DECLARED STRUCTURAL FALLBACK AND IS EXCLUDED FROM SCORING ENTIRELY.
//        Its only required prop, `direction`, is always fillable from `layout.dir`, so as a
//        candidate it takes kind-fit + prop-fit = 0.5 on EVERY laid-out node and would win every
//        container unless a rival landed an exact name. Removing it from the contest replaces a
//        margin with a sentence: A LAID-OUT NODE WITH NO CANDIDATE ABOVE THE THRESHOLD IS A `stack`;
//        a node with NO layout and no candidate hits the floor. So a chip a designer called "Pill"
//        reads `stack` honestly — a laid-out box we could not name — with its drops beside it,
//        instead of by a coin flip. A LATER READER WILL WANT TO "FIX" THIS by putting `stack` back
//        in the scored set. WHAT THAT COSTS IS THE TICKET'S OWN RECOGNITION: with `stack` scored,
//        fixture 1's "Status chip" reads `stack` at 0.6 — kind-fit + prop-fit + child-fit — against
//        status-chip's 0.575, so the chip LOSES BY 0.025 and the first answer this matcher exists to
//        give is gone. The flip itself is not invisible: case 40.1 compares the whole committed
//        verdict and case 40.1 now names the chip. What IS invisible is that `stack` is a PLAUSIBLE
//        answer for a laid-out chip, so the diff reads as a judgement call rather than as a defect —
//        which is why the number is here, and why case 40.14 asserts the property.
//
//   R3 · A NAME ALONE NEVER CLEARS THE THRESHOLD. `name-match` is word-containment, so `{text}` ⊆
//        `{text, block}` fires on a node that is plainly not a `text`. A name is EVIDENCE; one
//        corroborating structural signal turns it into a verdict. That is why the weight is 0.45
//        against a threshold of 0.5 — and THE INVARIANT IS WHAT IS ASSERTED, NOT THE CONSTANT
//        (case 13, over every entry in the vocabulary at run time), so the weights stay movable.
//        READ THE LIMIT OF THAT, because it is easy to over-read: case 13 holds for any
//        `name-match < THRESHOLD`, so it pins neither 0.45 nor the fact that "Text block" lands on
//        the fallback. The second fact is pinned only by case 1's committed answer. Two independent
//        checks on the thing that matters — adequate, and named here so the next reader does not
//        assume either one covers the other.
//
// ─── WHAT A DESIGN READ CARRIES, AND WHAT IT DOES NOT ────────────────────────────────────────────
// STRUCTURE AND LABELS, NEVER DATA. PROP_SOURCES below says which slot of a read fills which prop,
// and A PROP WITH NO ROW IS NOT FILLABLE — the honest default, not a gap. `list-row.value` is "the
// row's primary computed figure" and is fillable only if the designer actually DREW a figure;
// `list.empty` is the copy for a state nobody drew, and `modal-dialog.body` and `nav-tabs.items`
// are the same shape. Those become `unfillable-required-prop` rows (E1 read-but-never-emitted).
// An importer that invented the copy would be writing the designer's words for them.
//
// ─── TYPE MAPS BY NEAREST VALUE; SPACING MAPS BY ROLE. IT IS NOT AN INCONSISTENCY ────────────────
// import/brilliant.mjs maps spacing by role because `$spacing.md` → `--spacing-md` is a role-to-role
// correspondence. Type has none: the source's `$font.size.md|sm|xs` names a STEP OF A SCALE and
// `text.role` names a PURPOSE (display / heading / body / caption). Different taxonomies, so this one
// slot maps by nearest value WITH THE DISTANCE RECORDED. This is NOT #307's snapping — the `ref` here
// is present and simply names something else.

import { drop, walk } from "./ir.mjs";

// E3's number (.claude/plans/canvas-import-prd-briefing.md:992).
export const THRESHOLD = 0.5;

// R2. `stack` is what a laid-out node falls back to, so it never competes.
export const STRUCTURAL_FALLBACK = "stack";

// The contract's type steps in px, each pinned to its token (system/tokens.contract.css:95-102):
//   --type-display  clamp(40px, 6vw, 76px)     --type-h2       clamp(24px, 2.5vw, 34px)
//   --type-body     16px                        --type-caption  13px
// DISPLAY AND HEADING ARE THE CLAMP MINIMA. Those two roles have no single px, so a choice had to be
// made and this is it, written down. Nothing in the committed fixtures is near either.
// Distance is `contract − source`, S2's pinned sign convention, carried into the hit's detail.
export const TYPE_ROLE_PX = Object.freeze({ display: 40, heading: 24, body: 16, caption: 13 });

// WHICH SLOT OF A DESIGN READ FILLS WHICH PROP. A prop with no row here is not fillable from a read
// (see the header). Two enums are resolved structurally BEFORE this table is consulted — a prop whose
// enum is exactly {row, column} fills from `layout.dir`, and one whose enum is exactly the four type
// roles fills from the nearest `text.size` — and any OTHER enum fills only from a string the source
// actually drew that is literally in it.
export const PROP_SOURCES = Object.freeze({
  content: "own-text",      // a `text`'s content IS its own words — never a descendant's, which is
  text: "own-text",         //   what keeps "Text block" (a frame of two texts) off the `text` entry
  label: "first-text",      // the visible name of the thing: the node's own words, else the first read under it
  title: "first-text",
  name: "first-text",
  meta: "second-text",      // the secondary line a row draws beneath its label
  status: "chip-text",      // the words inside a descendant this matcher recognised as a status-chip
  value: "drawn-figure",    // a COMPUTED figure — present only if the designer drew one
  total: "drawn-figure",
  position: "drawn-figure",
});

const ROW_ENUM = ["row", "column"];
const ROLE_NAMES = Object.keys(TYPE_ROLE_PX);
// A drawn figure: what a designer types into a cell when they draw a number. Leading sign (ASCII or
// the typographic minus the list-row spec's own example uses), digits, separators, optional percent.
const FIGURE = /^[+\-−]?\d[\d.,]*\s*%?$/;

const sameSet = (a, b) => a.length === b.length && a.every((v) => b.includes(v));
const words = (s) => String(s ?? "").toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);

// The name the matcher reads, AND THE FIELD IT CAME FROM. The fallback is load-bearing: S2's
// end-anchored nodeName() returns "Frame 1" for fixture 1's root line, whose master name sits inside
// inst(…) and is routed to component.name by the converter. Reading `node.name` alone makes
// {frame,1} ⊉ {list,row}, the person row reads NOT COVERED, and the ticket's first named answer is
// unreachable. The field travels with the hit so a refactor that drops this fails BY NAME.
const nameOf = (n) => (n.component?.name ? { field: "component.name", value: n.component.name }
  : { field: "name", value: n.name });

// Every text the node itself says, then every text underneath it in document order.
const textsUnder = (n) => {
  const out = [];
  walk(n, (m) => { if (m.text?.content) out.push(m.text.content); });
  return out;
};

const nearestRole = (px) => {
  if (!Number.isFinite(px)) return null;
  let best = null;
  for (const role of ROLE_NAMES) {
    const d = TYPE_ROLE_PX[role] - px;                       // contract − source
    if (best === null || Math.abs(d) < Math.abs(best.distance)) best = { role, distance: d };
  }
  return best;
};

// One prop → the value a design read can put in it, or null. `ctx` carries the reads the node offers.
// EVERY TEXT-SOURCED BRANCH RECORDS WHICH TEXT IT TOOK, by index into `ctx.texts`. That set is what
// lets build()'s absorption branch drop a descendant's REMAINING texts instead of skipping the whole
// descendant because one of its texts reached a prop — a source text that reaches neither a prop nor
// the loss list is ir.mjs invariant 4 broken, and it was: a row with a label, a subtitle and a
// footnote lost the footnote in silence. Indices, not values, so two descendants drawing the SAME
// words are two texts and consuming one does not absorb the other. `ctx.consumed` is absent on the
// scoring pass (recognise()), where nothing is emitted and nothing can be lost — hence `?.`.
function fillProp(node, propName, spec, ctx) {
  const take = (i) => { if (i >= 0) ctx.consumed?.add(i); };
  if (spec.enum && sameSet(spec.enum, ROW_ENUM)) return node.layout?.dir ?? null;
  if (spec.enum && sameSet(spec.enum, ROLE_NAMES)) {
    const near = node.text ? nearestRole(node.text.size?.value) : null;
    return near ? near.role : null;
  }
  if (spec.enum) {
    // The source has to have drawn the enum's own word. A design read carries the LABEL ("On call"),
    // not the code ("ok"), so this is usually a miss — and a miss is the finding.
    const at = ctx.texts.findIndex((t) => spec.enum.includes(String(t).toLowerCase()));
    if (at < 0) return null;
    take(at);
    return String(ctx.texts[at]).toLowerCase();
  }
  switch (PROP_SOURCES[propName]) {
    // The node's own text is `ctx.texts[0]`: textsUnder() is ir.mjs's pre-order walk, node first.
    case "own-text": { const v = node.text?.content ?? null; if (v !== null) take(0); return v; }
    case "first-text": { const v = ctx.texts[0] ?? null; if (v !== null) take(0); return v; }
    case "second-text": { const v = ctx.texts[1] ?? null; if (v !== null) take(1); return v; }
    case "chip-text": { const v = ctx.chipText ?? null; if (v !== null) take(ctx.chipIndex ?? -1); return v; }
    case "drawn-figure": {
      const at = ctx.texts.findIndex((t) => FIGURE.test(String(t).trim()));
      if (at < 0) return null;
      take(at);
      return ctx.texts[at];
    }
    default: return null;                                    // no slot in a design read
  }
}

const requiredOf = (entry) => Object.entries(entry.props).filter(([, s]) => s.required);

// THE FOUR SIGNALS. Independent, each named, each weighted, each returning `{score, field, detail}`
// or null. `field` is what lets a verdict show its working (D4).
export const SIGNALS = Object.freeze([
  Object.freeze({
    name: "name-match",
    weight: 0.45,
    test(node, entry, slug) {
      // WORD CONTAINMENT, not equality (which misses "Spike List Row" → list-row) and not substring
      // (which fires `text` on "Text block" — it fires here too, deliberately, and R3 is why that is
      // survivable). Every word of the SLUG must appear among the name's words.
      const n = nameOf(node);
      const have = words(n.value), want = words(slug);
      if (!want.length || !want.every((w) => have.includes(w))) return null;
      return { score: 1, field: n.field, detail: `${JSON.stringify(n.value)} contains every word of "${slug}"` };
    },
  }),
  Object.freeze({
    name: "kind-fit",
    weight: 0.25,
    test(node, entry) {
      // A container reads as a container; a text reads as a text-bearing leaf. An `icon` kind matches
      // NOTHING — and NOT because the vocabulary lacks an `icon` entry: #305 added one and this stayed
      // true, because there is no BRANCH here for node.kind === "icon". #449 is the ticket that
      // changes it, and it owes a defended weight rather than one chosen to clear the threshold.
      if (node.layout && entry.childrenCardinality === "many") {
        return { score: 1, field: "layout", detail: `a laid-out node against an entry that takes many children` };
      }
      if (node.kind === "text" && entry.children.length === 0
        && requiredOf(entry).some(([p]) => PROP_SOURCES[p] === "own-text")) {
        return { score: 1, field: "kind", detail: `a text node against a childless entry with a text-bearing required prop` };
      }
      return null;
    },
  }),
  Object.freeze({
    name: "prop-fit",
    weight: 0.25,
    test(node, entry, slug, ctx) {
      const req = requiredOf(entry);
      // An entry with no required props is no evidence either way — 0, never 0/0.
      if (!req.length) return null;
      const filled = req.filter(([p, s]) => fillProp(node, p, s, ctx) !== null).map(([p]) => p);
      if (!filled.length) return null;
      return {
        score: filled.length / req.length,
        field: filled.join("+"),
        detail: `${filled.length}/${req.length} required props fillable from the read (${filled.join(", ")})`,
      };
    },
  }),
  Object.freeze({
    name: "child-fit",
    weight: 0.1,
    test(node, entry, slug, ctx) {
      // FIRES ONLY ON AT LEAST ONE RECOGNISED CHILD. "No disallowed children" is vacuously true of a
      // childless node and is evidence of nothing — a signal that fires on the empty set would put
      // every name-only match at 0.55 and break R3 for the whole vocabulary.
      const kids = ctx.children.filter((c) => c.name);
      if (!kids.length) return null;
      if (!kids.every((c) => entry.children.includes(c.name))) return null;
      if (entry.childrenCardinality !== "many" && kids.length > 1) return null;
      return { score: 1, field: "children", detail: `${kids.length} recognised child(ren), all allowed: ${kids.map((c) => c.name).join(", ")}` };
    },
  }),
]);

// One node against one vocabulary entry. Weights are SUMS, not a normalised probability — only the
// threshold matters, and saying so here stops a later reader "fixing" a total above 1.
export function scoreNode(node, entry, slug, ctx = { texts: [], children: [], chipText: null }) {
  const hits = [];
  let score = 0;
  for (const sig of SIGNALS) {
    const hit = sig.test(node, entry, slug, ctx);
    if (!hit) continue;
    score += sig.weight * hit.score;
    hits.push({ signal: sig.name, field: hit.field, detail: hit.detail });
  }
  return { slug, score: Math.round(score * 1000) / 1000, hits };
}

// A verdict tree PARALLEL TO THE IR — one verdict per node, never a consumed subtree. Who consumes
// whom is #311's mapping editor; this file answers "what is this node" and nothing else.
//
// Children are recognised FIRST (post-order), because child-fit reads their verdicts.
export function recognise(ir, vocab, path = "ir") {
  const children = (ir.children ?? []).map((c, i) => recognise(c, vocab, `${path}.children[${i}]`));
  if (!ir.kind) {
    return { path, mode: ir.mode, grain: ir.grain, source: ir.source, children, drops: [...(ir.drops ?? [])] };
  }

  const texts = textsUnder(ir);
  const chip = children.find((c) => c.name === "status-chip");
  const ctx = { texts, children, chipText: chip ? (textsUnder(ir.children[children.indexOf(chip)])[0] ?? null) : null };

  const candidates = [];
  for (const [slug, entry] of Object.entries(vocab.components)) {
    if (slug === STRUCTURAL_FALLBACK) continue;               // R2 — excluded from scoring entirely
    const c = scoreNode(ir, entry, slug, ctx);
    if (c.score > 0) candidates.push(c);
  }
  // THE TIE-BREAK IS EXPLICIT, IN THREE RUNGS, because a stable sort over equal scores would
  // otherwise inherit Object.keys order and silently depend on gen-vocabulary's emission order — and
  // because both ties below are REAL, not theoretical. Each rung was added by a tie that had a wrong
  // answer, and each says what evidence it is reading:
  //
  //   1. MORE OF THE SOURCE'S NAME EXPLAINED, and only among candidates whose name-match FIRED.
  //      A row a designer called "List row" scores identically against `list` and `list-row`, since
  //      name-match is word containment and both {list} and {list,row} are subsets of the name.
  //      `list-row` explained the whole name and `list` explained half, which is strictly more
  //      evidence. Gated on the signal having fired, because an entry's slug length is evidence of
  //      nothing when no name was matched — ungated, it made every unnamed text node read
  //      `demo-notice` (two slug words) over `text` (one).
  //   2. A LIBRARY-GENERIC PRIMITIVE BEFORE A SCENARIO COMPONENT. `ds-` marks a cross-scenario
  //      primitive and `vd-`/`fw-` mark one component of one fictional demo — this repo's own
  //      convention, stated in the specs' Usage prose. An importer reading a stranger's drawing
  //      should reach for the primitive, never for a demo's chrome. This is the rung that puts an
  //      unnamed text node on `text` rather than on `demo-notice`, which ties it exactly at 0.5.
  //   3. SLUG ASC, so the order is total and nothing is left to Object.keys.
  const named = (c) => c.hits.some((h) => h.signal === "name-match");
  const generic = (c) => (vocab.components[c.slug]?.class ?? "").startsWith("ds-");
  candidates.sort((a, b) => (b.score - a.score)
    || (named(a) && named(b) ? words(b.slug).length - words(a.slug).length : 0)
    || (generic(b) - generic(a))
    || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

  const top = candidates[0] ?? null;
  const drops = [];
  let name = null, via = "floor", covered = false, score = top ? top.score : 0, hits = top ? top.hits : [];

  // THREE OUTCOMES, RESOLVED IN THIS ORDER AND NO OTHER.
  if (top && top.score >= THRESHOLD) {
    name = top.slug; via = "scored"; covered = true;
  } else if (ir.layout) {
    name = STRUCTURAL_FALLBACK; via = "structural-fallback"; covered = true; score = 0; hits = [];
  } else {
    drops.push(drop({
      kind: "no-vocabulary-slot", slot: "node", value: nameOf(ir).value,
      reason: `no vocabulary entry scored at or above ${THRESHOLD}${top ? ` (best: ${top.slug} at ${top.score})` : ""} and the node carries no layout — not covered`,
    }));
  }

  // The node's OWN drops travel with its verdict, so the verdict tree is the ONE place a reader (and
  // #307's record) looks for the loss list. A total list assembled from three places is total by
  // remembering; assembled here it is total by construction.
  return { path, kind: ir.kind, name, score, via, covered, hits, candidates, drops: [...(ir.drops ?? []), ...drops], children };
}

// E3's "a slot fills by slug → builder". One builder per slug the fixtures reach, plus `list`, which
// the ticket names and neither committed fixture contains (group 40 case 12 drives it on a synthetic
// IR node and says so).
//
// THE ABSORPTION RULE, which decides what happens BELOW a scored node: AN ENTRY DECLARING
// `children: []` ABSORBS A DESCENDANT INTO AN UNFILLED PROP WHERE ONE FITS AND DROPS IT OTHERWISE —
// IT NEVER EMITS IT AS A CHILD. `list-row.label` ← "Amara Okafor", `.meta` ← "Last seen 2 min ago",
// `.status` ← the chip's words; the avatar disc, the chevron and the nested fallback-`stack` have no
// prop to land in and are recorded as `no-vocabulary-slot`. `stack` lists itself among its allowed
// children, so a fallback-`stack` under another `stack` IS legal and IS emitted; under a leaf entry
// it is not. That asymmetry is this rule, not a special case.
const propsFor = (entry, node, verdict, ctx, drops) => {
  const props = {};
  for (const [p, spec] of Object.entries(entry.props)) {
    const v = fillProp(node, p, spec, ctx);
    if (v !== null) { props[p] = v; continue; }
    if (spec.required) {
      drops.push(drop({
        kind: "unfillable-required-prop", slot: `${verdict.name}.${p}`,
        reason: `${verdict.name}.${p} is required and a design read carries nothing that fills it — ${spec.description ?? "no source slot"}`,
      }));
    }
  }
  // S2's consumer contract, enforced HERE: an axis that is not "fill" or "hug" is refused rather than
  // passed through as a length. Emitting `width: 360px` from it would put a hardcoded literal on a
  // token-contract surface (CLAUDE.md § Ground rules, token discipline).
  const size = node.layout?.size ?? node.style?.size ?? null;
  if (size && Object.hasOwn(entry.props, "size")) {
    for (const axis of ["w", "h"]) {
      const a = size[axis];
      if (a === "fill" || a === "hug" || a === null || a === undefined) continue;
      drops.push(drop({
        kind: "literal-size", slot: `size.${axis}`, value: a,
        reason: `a numeric ${axis} axis (${a}) is refused: ${verdict.name}.size is {fill | hug} and a length here would be a hardcoded literal on a token surface`,
      }));
    }
    if (size.w === "fill" || size.w === "hug") props.size = size.w;
  }
  return props;
};

// The IR is RICHER than the props, and the difference is recorded rather than coerced (D1).
// `stack.pad` is a SINGLE enum value and `stack.align` is CROSS-AXIS ONLY; the IR carries a
// four-side pad and `{main, cross}`. Neither can be carried, so each becomes a `prop-shape` row
// naming its slot. Widening `stack`'s props would reopen a merged prop set and take the /components
// baseline lock — it needs evidence from a REAL source, which arrives with #311, not from a fixture.
const stackShape = (node, drops) => {
  const out = {};
  const L = node.layout;
  // A `stack` verdict on a node with no layout is not reachable while the fallback tests for one —
  // and it is exactly what a fallback that stopped testing would produce. Refuse it by name rather
  // than read `null.gap`: a TypeError here would kill a gate run before a single named failure spoke.
  if (!L) {
    drops.push(drop({
      kind: "no-vocabulary-slot", slot: "layout",
      reason: `a node with no layout cannot be emitted as ${STRUCTURAL_FALLBACK} — stack.direction is required and layout.dir is the only thing that fills it`,
    }));
    return out;
  }
  const step = (t) => (t?.ref ? t.ref.replace(/^--spacing-/, "") : null);
  if (L.gap) out.gap = step(L.gap);
  if (Array.isArray(L.pad)) {
    const steps = L.pad.map(step);
    if (steps.every((s) => s !== null && s === steps[0])) out.pad = steps[0];
    else drops.push(drop({
      kind: "prop-shape", slot: "layout.pad", value: steps.join(","),
      reason: `stack.pad is ONE value for all four sides; the read is [${steps.join(", ")}] and cannot be carried`,
    }));
  }
  if (L.align?.cross) out.align = L.align.cross;
  if (L.align?.main) drops.push(drop({
    kind: "prop-shape", slot: "layout.align.main", value: L.align.main,
    reason: `stack.align is the CROSS axis only; the read's main-axis "${L.align.main}" has no prop`,
  }));
  return out;
};

export const BUILDERS = Object.freeze({
  stack: (node, verdict, entry, ctx, drops) => ({
    name: "stack",
    props: { direction: node.layout?.dir ?? null, ...stackShape(node, drops), ...propsFor(entry, node, verdict, ctx, drops) },
  }),
  text: (node, verdict, entry, ctx, drops) => ({ name: "text", props: propsFor(entry, node, verdict, ctx, drops) }),
  "list-row": (node, verdict, entry, ctx, drops) => ({ name: "list-row", props: propsFor(entry, node, verdict, ctx, drops) }),
  "status-chip": (node, verdict, entry, ctx, drops) => ({ name: "status-chip", props: propsFor(entry, node, verdict, ctx, drops) }),
  // The ticket's "a source list maps to `list` + N `list-row`s". The rows are built from the node's
  // own children and each one validates. THE CONTAINER AND ITS ROWS ARE THEN REFUSED TOGETHER, and
  // this builder is not where that happens: `list.empty` has no slot in any design read, so propsFor
  // records it unfillable and build()'s closing required-prop check discards this whole object —
  // rows included, for any input, always. What survives a design read of a list is the LOSS LIST,
  // not the rows. That is the honest answer: an importer that emitted the rows under an invented
  // empty-state copy would be writing the designer's words for them. Case 40.12 asserts BOTH halves
  // — what this builder computes, and what build() emits through the only entry point a source has.
  list: (node, verdict, entry, ctx, drops) => ({
    name: "list",
    props: propsFor(entry, node, verdict, ctx, drops),
    children: verdict.children.map((cv, i) => build(node.children[i], cv, ctx.vocab, drops)).filter(Boolean),
  }),
});

// Dispatch through BUILDERS. An uncovered verdict, a missing builder, or an unfillable required prop
// returns null WITH THE DROP RECORDED — never a guess. Descendant drops are pushed BEFORE the null
// return, so the loss list stays total whatever the outcome.
export function build(node, verdict, vocab, drops = []) {
  if (!verdict.covered || !verdict.name) return null;
  const entry = vocab.components[verdict.name];
  const builder = BUILDERS[verdict.name];
  if (!entry || !builder) {
    drops.push(drop({
      kind: "no-vocabulary-slot", slot: verdict.path,
      reason: `no builder for "${verdict.name}" — recognised but not emittable at this ticket`,
    }));
    return null;
  }
  const texts = textsUnder(node);
  // Each child's texts occupy a CONTIGUOUS RUN of `texts`, because textsUnder() is ir.mjs's
  // pre-order walk: the node's own text, then child 0's run, then child 1's. So a child's offset is
  // the sum of the runs before it, and `consumed` (indices, filled by fillProp) maps straight back
  // onto the children below without a value comparison.
  const kidTexts = verdict.children.map((_, i) => textsUnder(node.children[i]));
  const offsets = [];
  { let off = node.text?.content ? 1 : 0; kidTexts.forEach((t, i) => { offsets[i] = off; off += t.length; }); }
  const chipAt = verdict.children.findIndex((c) => c.name === "status-chip");
  const ctx = {
    texts, children: verdict.children, vocab, consumed: new Set(),
    chipText: chipAt >= 0 ? (kidTexts[chipAt][0] ?? null) : null,
    chipIndex: chipAt >= 0 && kidTexts[chipAt].length ? offsets[chipAt] : -1,
  };

  const out = builder(node, verdict, entry, ctx, drops);

  if (verdict.name !== "list") {
    // Everything below a leaf entry is absorbed into a prop or dropped — never emitted as a child.
    if (entry.children.length === 0) {
      for (const [i, cv] of verdict.children.entries()) {
        // ABSORPTION IS PER TEXT, NOT PER CHILD. A child whose every text reached a prop is carried
        // whole and needs no row; a child that landed SOME of its texts loses the rest, and those
        // are the rows. Keying the skip on "does this child contain any absorbed string anywhere"
        // made a label + subtitle + footnote row lose its footnote with no drop row and a clean
        // count line — ir.mjs invariant 4, broken by the module that cites it (PR #448 F10).
        const left = kidTexts[i].map((t, k) => [offsets[i] + k, t]).filter(([ix]) => !ctx.consumed.has(ix));
        if (kidTexts[i].length && left.length === 0) continue;             // absorbed into props, whole
        if (left.length < kidTexts[i].length) {
          for (const [, t] of left) drops.push(drop({
            kind: "no-vocabulary-slot", slot: `${verdict.path}.children[${i}]`, value: t,
            reason: `${verdict.name} absorbed part of a descendant read as ${cv.name ?? "not covered"} into its props; "${t}" has no prop left to land in and is not emitted`,
          }));
          continue;
        }
        drops.push(drop({
          kind: "no-vocabulary-slot", slot: `${verdict.path}.children[${i}]`, value: cv.name,
          reason: `${verdict.name} declares children: [] — a descendant read as ${cv.name ?? "not covered"} has no prop to land in and is not emitted`,
        }));
      }
    } else {
      // A recognised child the entry does not allow is RECORDED, never filtered away. `stack` allows
      // eleven names and `status-chip` is not among them, so fixture 2's Frame 1 loses its chip here —
      // silently, if this branch only filtered. That is the shape every #137 defect had.
      const kept = [];
      for (const [i, cv] of verdict.children.entries()) {
        if (!entry.children.includes(cv.name)) {
          drops.push(drop({
            kind: "no-vocabulary-slot", slot: `${verdict.path}.children[${i}]`, value: cv.name,
            reason: `${cv.name ?? "not covered"} is not an allowed child of ${verdict.name} (allowed: ${entry.children.join(" | ")})`,
          }));
          continue;
        }
        const built = build(node.children[i], cv, vocab, drops);
        if (built) kept.push(built);
      }
      if (kept.length) out.children = kept;
    }
  }

  // A required prop that could not be filled means the node was understood and cannot be emitted.
  const missing = requiredOf(entry).filter(([p]) => !(p in (out.props ?? {})));
  if (missing.length) return null;
  return out;
}
