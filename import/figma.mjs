// import/figma.mjs — hand-written canon (this repo; not generated). A HOUSE-PLUGIN EXPORT → the IR
// (epic #295 ticket #310; docs/epics/canvas-design-import.architecture.md:315-320 (S5) and :208-214;
// .claude/plans/figma-plugin-s5-converter-310.md; S5's verdict .claude/plans/canvas-spike-s5/README.md).
//
// The export is the JSON tooling/figma/plugin/ writes (docs/figma-runbook.md § C): a fixed allow-list of
// node properties, dumped and never mapped, plus every variable the selection references as
// id → {name, collection, resolvedType}. Every rule that turns that dump into a design lives HERE, where
// build-checks group 40 drives it; the plugin decides nothing. NOT portal/lib/figma.mjs — that is the
// PACK drop's server module (a token export → system/tokens.<slug>.css), a different input with a
// similar name. Neither imports the other.
//
// PURE. It imports ./ir.mjs and ./brilliant.mjs AND NOTHING ELSE — no fs, no network, no SDK. The
// export text is an argument; the caller owns reading it. brilliant.mjs is imported for mapSpacing and
// sizeDrops so the two converters share ONE spacing-by-role rule and ONE size-loss rule
// (import/snap-rules.mjs imports SPACING from it for the same reason).
//
// S5 CHOSE BRANCH 1 (README Q3): the plugin reads auto-layout and resolves every variable to a name, so
// a bound slot's ref is filled deterministically, as Brilliant's are. The same code serves branch 2: an
// unresolved or absent binding is `tok(value, null)`, which is the IR's existing "unbound" shape and
// what the snap step consumes. There is one converter, not two.
//
// ─── THE DECISIONS, EACH WITH ITS REASON ─────────────────────────────────────────────────────────
//
// F1 · REFUSAL FIRST. readExport() throws, naming why, on anything that is not a house-plugin export:
//      not a string, not JSON, a Figma REST file read (a top-level `document`), a token export (no
//      `format`, and anywhere in the file a `$value` key — DTCG — or a `value` key beside a `type` key —
//      Tokens Studio; measured on tooling/figma/fixtures/scales-*.json), a wrong `format`, a version
//      other than 1, an empty selection, a node without `id` or `type`, and an instance whose `main` the
//      plugin marked `{unreadable}` (named by path, so the marker never reads as "no component name",
//      #461 F1). A token export is a PACK
//      input (runbook § A), and the refusal says so rather than "bad format".
//
// F2 · REFS. {type:"VARIABLE_ALIAS", id} → "$" + the variable's name with "/" read as ".", so
//      `spacing/md` is `$spacing.md` — brilliant.mjs's convention ("one convention in the IR beats
//      two"), which is what lets a bound spacing ref map by role through the same mapSpacing. An id the
//      export cannot resolve (a library variable the file cannot reach) gives `null` and is COUNTED in
//      the root's `source.unresolved`, never dropped silently. A paint's binding is read at the node
//      level (`boundVariables.fills[i]`) first and at the paint level (`paint.boundVariables.color`)
//      second; S5 observed Figma writing both, with one id (README Q2). An ARRAY binding (a text's
//      `fontSize`, one entry per styled range; README Q4) is read only when every entry is the same id;
//      a mixed array is `null` plus a `prop-shape` drop, because one slot cannot carry two tokens.
//
// F3 · FIGMA DEFAULTS THAT EQUAL THE STACK'S UNSET BEHAVIOUR ARE CARRIED AS ABSENT, NOT AS A DROP.
//      Figma writes a number on every frame where Brilliant writes nothing, so an absence has to be
//      told apart from a read: an UNBOUND all-zero pad → `pad: null`, an UNBOUND `itemSpacing: 0` →
//      `gap: null`, an UNBOUND `cornerRadius: 0` → no radius, and `primaryAxisAlignItems: "MIN"` →
//      `align.main: null` (a stack packs from the start, system/specs/stack.md). A BOUND zero (a
//      `spacing/none` variable) is a read and takes the `no-token` path exactly as Brilliant's
//      `pad(0:$spacing.none)` does. A pad with ONE non-zero side keeps all four sides. This departs
//      from ir.mjs invariant 4 in wording, not substance: nothing a designer set is read past. Without
//      it every auto-layout frame files four no-snap-target rows for values nobody chose (plan Q1).
//      The cross axis is NOT defaulted: `MIN` there is a real choice ("start") against CSS's stretch.
//
// F4 · KINDS. TEXT → text; ELLIPSE → shape with style.shape "circle" (Brilliant's `c`); RECTANGLE →
//      shape; a VECTOR / BOOLEAN_OPERATION / STAR / POLYGON / LINE → icon, and so is a FRAME / GROUP /
//      INSTANCE / COMPONENT whose every LEAF descendant is one of those (at least one) — a Phosphor
//      glyph arrives as a wrapper around its paths. An icon's `icon.name` is the LAYER name, read
//      verbatim and never normalised (plan Q2), and its children are not emitted: a glyph's paths
//      are artwork, not parts, so their own paints are not read either. INSTANCE → instance; COMPONENT
//      → instance with component.master (Brilliant's `comp`); FRAME / GROUP / COMPONENT_SET / SECTION
//      → frame. Any other type is not emitted and its parent (or the root) gets an `unread-atom` drop
//      naming the type.
//
// F5 · THE COMPONENT NAME IS THE SET'S. An instance of a variant has main.name "state=active";
//      component.name reads main.setName first. Reading main.name alone repeats the "Frame 1" defect
//      (recognise.mjs nameOf): name-match misses and the row reads NOT COVERED. `componentProperties`
//      of type VARIANT go into component.variant (Brilliant's at(state(active))). BOOLEAN, TEXT and
//      INSTANCE_SWAP are NOT losses: their effect is already in the tree as a hidden layer, a child's
//      characters or a child instance, so they are neither carried nor dropped.
//
// F6 · LAYOUT, for layoutMode HORIZONTAL / VERTICAL only: dir row / column; gap and the four pads
//      through brilliant.mjs's spacing rule (unbound → `tok(value, null)` for the snap step; bound →
//      by role, or a `no-token` drop); ALIGN_OF maps MIN / CENTER / MAX for both axes. A SPACE_* main
//      axis or a BASELINE cross axis is null plus a `prop-shape` drop naming the value; WRAP is a
//      `prop-shape` drop carrying counterAxisSpacing; GRID gives no layout and a `prop-shape` drop.
//
// F7 · SIZE. An axis reads HUG → "hug", FILL → "fill", and otherwise the node's width / height as a
//      number. It lands on `layout.size` when the node has a layout and on `style.size` when it does
//      not — brilliant.mjs's rule, keyed on whether a layout EXISTS — and its loss rows come from the
//      shared sizeDrops() with no qualifier (Figma has no hug:N).
//
// F8 · STYLE. Fill: the TOPMOST visible SOLID paint (Figma's paint array is bottom-up) → tok(hex, ref),
//      hex #RRGGBB uppercase. Every other visible paint, a non-SOLID paint, a paint opacity or a node
//      opacity below 1 → a `prop-shape` drop; the colour is carried without alpha. Stroke: {color,
//      width}; a dashPattern is an `unread-atom` drop (Brilliant's dash(10,5)). Radius: a number →
//      tok(r, ref), the ref counting only when all four corners share one variable; "mixed" → a
//      `prop-shape` drop. Effects: an `unread-atom` drop, because a shadow has no IR slot.
//
// F9 · TEXT. content = characters; size = tok(fontSize, ref); family = tok(fontName.family, ref);
//      weight is Figma's number and align is textAlignHorizontal lowercased — the spelling differs from
//      Brilliant's letter codes and nothing downstream reads either. lineHeight: AUTO → null (F3);
//      PERCENT → a ratio tok(value / 100, ref), Brilliant's lh(1.5) convention; PIXELS → a ratio too,
//      rounded to 4 dp. Any "mixed" text value → a `prop-shape` drop.
//
// F10 · HIDDEN. visible === false → the node is not emitted, and its parent (or the root) gets a
//      `hidden-layer` drop naming it.
//
// F11 · POSITION. {x, y} is read and recorded, never mapped (ir.mjs).
//
// O4 · LAYOUT INFERENCE (the owner's note on #310; email-hub tree_normalizer.py:192-242, ported, no
//      code borrowed). A FRAME / GROUP / COMPONENT / INSTANCE with no auto-layout and at least two
//      emitted children is given a layout when the children line up: every y within INFER_TOLERANCE of
//      the first child's → a row; every x → a column; otherwise nothing (a free drawing). The gap is the
//      median space between neighbours, UNBOUND (`tok(m, null)`) so the snap step reaches it, and F3
//      applies (a zero median is no gap). The layout carries `inferred: true`, an extra key nothing
//      enforces (checkIr reads size / gap / pad; stackShape ignores unknown keys), so #311 can refuse
//      or override a guessed layout. A node that declares layoutMode never goes through it.
//
// Every drop is a LITERAL `drop({ kind: "…" })` call: build-checks case 40.5 reads the kind roster
// out of the sources with a regex and cannot see a kind passed in a variable.

import { mapSpacing, sizeDrops } from "./brilliant.mjs";
import { checkIr, drop, node as irNode, root as irRoot, tok, walk } from "./ir.mjs";

export const FORMAT = "ux-factory/figma-export";   // tooling/figma/plugin/code.js writes it; case 40.21 ties the two
export const VERSION = 1;

export const ALIGN_OF = Object.freeze({ MIN: "start", CENTER: "center", MAX: "end" });
export const ICON_TYPES = Object.freeze(["VECTOR", "BOOLEAN_OPERATION", "STAR", "POLYGON", "LINE"]);
export const SHAPE_TYPES = Object.freeze(["ELLIPSE", "RECTANGLE"]);
export const CONTAINER_TYPES = Object.freeze(["FRAME", "GROUP", "COMPONENT_SET", "SECTION", "INSTANCE", "COMPONENT"]);

const INFER_TOLERANCE = 5;   // px — O4: children within this of the first child's y (x) sit on one row (column)
const PAD_SIDES = [["top", "paddingTop"], ["right", "paddingRight"], ["bottom", "paddingBottom"], ["left", "paddingLeft"]];
const CORNERS = ["topLeftRadius", "topRightRadius", "bottomRightRadius", "bottomLeftRadius"];
const r4 = (n) => Math.round(n * 1e4) / 1e4;

// ─── F1 · the boundary ──────────────────────────────────────────────────────────────────────────

const looksLikeTokens = (o) => {
  if (!o || typeof o !== "object") return false;
  if (!Array.isArray(o) && (Object.hasOwn(o, "$value") || (Object.hasOwn(o, "value") && Object.hasOwn(o, "type")))) return true;
  return Object.values(o).some(looksLikeTokens);
};

const checkNodes = (nodes, at) => nodes.forEach((n, i) => {
  const path = `${at}[${i}]`;
  if (!n || typeof n !== "object" || Array.isArray(n)) throw new Error(`figma export: ${path} is not a node object`);
  for (const key of ["id", "type"]) {
    if (typeof n[key] !== "string" || !n[key]) throw new Error(`figma export: ${path} has no ${key}`);
  }
  if (n.main && Object.hasOwn(n.main, "unreadable")) {
    throw new Error(`figma export: ${path}.main is unreadable (${n.main.unreadable}) — the instance's main component could not be reached (deleted, or a broken library link); relink it in Figma and export again`);
  }
  if (n.children !== undefined) {
    if (!Array.isArray(n.children)) throw new Error(`figma export: ${path}.children is not an array`);
    checkNodes(n.children, `${path}.children`);
  }
});

export function readExport(text) {
  if (typeof text !== "string") throw new Error(`figma export: expected the file's text, got ${text === null ? "null" : typeof text}`);
  let e;
  try { e = JSON.parse(text); } catch (err) {
    throw new Error(`figma export: not JSON (${err.message}) — a house-plugin export is the JSON tooling/figma/plugin/ writes (docs/figma-runbook.md § C)`);
  }
  if (e && typeof e === "object" && !Array.isArray(e) && Object.hasOwn(e, "document")) {
    throw new Error("figma export: this is a Figma REST file read, not a house-plugin export — export the selection with tooling/figma/plugin/ (docs/figma-runbook.md § C)");
  }
  if (!(e && typeof e === "object" && Object.hasOwn(e, "format")) && looksLikeTokens(e)) {
    throw new Error("figma export: this looks like a token export — that is a pack input (docs/figma-runbook.md § A), not a design read");
  }
  const format = e && typeof e === "object" ? e.format : undefined;
  if (format !== FORMAT) throw new Error(`figma export: "format" is ${JSON.stringify(format)}, expected "${FORMAT}"`);
  if (e.version !== VERSION) throw new Error(`figma export: version ${JSON.stringify(e.version)} is not supported — this converter reads ${VERSION}`);
  if (!Array.isArray(e.selection) || e.selection.length === 0) {
    throw new Error("figma export: the export carries no selection — select a component in Figma before exporting");
  }
  if (!e.variables || typeof e.variables !== "object" || Array.isArray(e.variables)) {
    throw new Error("figma export: the export carries no variables map — the plugin always writes one, even empty");
  }
  checkNodes(e.selection, "selection");
  return e;
}

// ─── F2 · refs ──────────────────────────────────────────────────────────────────────────────────

// One alias → "$a.b.c", or null. `counter.unresolved` counts an alias that did not resolve.
export const refOf = (alias, variables, counter = null) => {
  if (!alias || alias.type !== "VARIABLE_ALIAS") return null;
  const v = variables[alias.id];
  if (!v || v.unresolved || typeof v.name !== "string") {
    if (counter) counter.unresolved += 1;
    return null;
  }
  return "$" + v.name.split("/").join(".");
};

// ─── the per-node readers ───────────────────────────────────────────────────────────────────────

const hexOf = ({ r, g, b }) => "#" + [r, g, b].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
const isLeafIconTree = (n) => {
  const kids = n.children ?? [];
  if (!kids.length) return false;
  return kids.every((c) => ICON_TYPES.includes(c.type) || (CONTAINER_TYPES.includes(c.type) && isLeafIconTree(c)));
};
const kindOf = (n) => {
  if (n.type === "TEXT") return "text";
  if (SHAPE_TYPES.includes(n.type)) return "shape";
  if (ICON_TYPES.includes(n.type)) return "icon";
  if (["FRAME", "GROUP", "INSTANCE", "COMPONENT"].includes(n.type) && isLeafIconTree(n)) return "icon";
  if (n.type === "INSTANCE" || n.type === "COMPONENT") return "instance";
  if (CONTAINER_TYPES.includes(n.type)) return "frame";
  return null;
};

function readNode(n, variables, counter) {
  const drops = [];
  const bv = n.boundVariables ?? {};
  // A scalar binding: an alias, or a uniform array of one alias (F2).
  const bindingOf = (field, slot) => {
    const b = bv[field];
    if (!Array.isArray(b)) return refOf(b, variables, counter);
    if (!b.length) return null;
    if (b.every((a) => a?.id === b[0]?.id)) return refOf(b[0], variables, counter);
    drops.push(drop({ kind: "prop-shape", slot, value: b.map((a) => a?.id).join(","), reason: `${field} is bound to ${b.length} different variables across the node — one slot carries one token` }));
    return null;
  };
  // A paint binding: node-level fills[i] / strokes[i] first, the paint's own color second (F2).
  const paintRef = (field, i, paint) => {
    const nodeLevel = Array.isArray(bv[field]) ? bv[field][i] : null;
    return refOf(nodeLevel ?? paint.boundVariables?.color ?? null, variables, counter);
  };
  // The spacing rule, mirrored from brilliant.mjs's toStack (unbound → carried; bound → by role).
  const spacing = (slot, value, ref) => {
    if (ref === null) return tok(value, null);
    const m = mapSpacing({ value, ref });
    if (!m) {
      drops.push(drop({ kind: "no-token", slot, ref, value, reason: `no contract token for role ${ref} (source value ${value}px)` }));
      return null;
    }
    return tok(m.contractValue, m.token);
  };

  // F6 · layout
  let layout = null;
  if (n.layoutMode === "HORIZONTAL" || n.layoutMode === "VERTICAL") {
    const gapRef = bindingOf("itemSpacing", "layout.gap");
    const gap = typeof n.itemSpacing !== "number" ? null
      : (n.itemSpacing === 0 && gapRef === null ? null : spacing("gap", n.itemSpacing, gapRef));   // F3
    const sides = PAD_SIDES.map(([side, field]) => ({ side, value: n[field], ref: bindingOf(field, `layout.pad.${side}`) }));
    let pad = null;
    if (sides.every((s) => typeof s.value === "number") && !sides.every((s) => s.value === 0 && s.ref === null)) {   // F3
      const four = sides.map((s) => spacing(`pad.${s.side}`, s.value, s.ref));
      pad = four.some((x) => x !== null) ? four : null;
    }
    let main = null, cross = null;
    const pa = n.primaryAxisAlignItems, ca = n.counterAxisAlignItems;
    if (pa === "CENTER" || pa === "MAX") main = ALIGN_OF[pa];
    else if (pa && pa !== "MIN") drops.push(drop({ kind: "prop-shape", slot: "layout.align.main", value: pa, reason: `main-axis ${pa} distributes the children — the IR's align carries a position, not a distribution` }));
    if (Object.hasOwn(ALIGN_OF, ca)) cross = ALIGN_OF[ca];
    else if (ca) drops.push(drop({ kind: "prop-shape", slot: "layout.align.cross", value: ca, reason: `cross-axis ${ca} has no IR align value` }));
    if (n.layoutWrap === "WRAP") {
      drops.push(drop({ kind: "prop-shape", slot: "layout.wrap", value: n.counterAxisSpacing ?? null, reason: "a wrapping auto-layout (and its counter-axis gap) has no IR slot" }));
    }
    layout = { dir: n.layoutMode === "HORIZONTAL" ? "row" : "column", gap, pad, align: { main, cross }, size: null };
  } else if (n.layoutMode === "GRID") {
    drops.push(drop({ kind: "prop-shape", slot: "layout", value: "GRID", reason: "a grid auto-layout has no IR layout — only row and column are read" }));
  }

  // F8 · style
  const style = {};
  const fills = Array.isArray(n.fills) ? n.fills : [];
  if (n.fills === "mixed") drops.push(drop({ kind: "prop-shape", slot: "style.fill", value: "mixed", reason: "the node's fills differ across its ranges — one fill slot cannot carry them" }));
  const visible = fills.map((p, i) => ({ p, i })).filter(({ p }) => p && p.visible !== false);
  let top = null;
  for (let k = visible.length - 1; k >= 0; k--) if (visible[k].p.type === "SOLID") { top = visible[k]; break; }
  for (const { p, i } of visible) {
    if (top && i === top.i) continue;
    drops.push(drop({ kind: "prop-shape", slot: `style.fills[${i}]`, value: p.type, reason: `a second visible paint (${p.type}) under the topmost solid fill — the IR carries one fill` }));
  }
  if (top) {
    style.fill = tok(hexOf(top.p.color), paintRef("fills", top.i, top.p));
    if (typeof top.p.opacity === "number" && top.p.opacity < 1) {
      drops.push(drop({ kind: "prop-shape", slot: "style.fill.opacity", value: top.p.opacity, reason: `paint opacity ${top.p.opacity} — the fill is carried without alpha` }));
    }
  }
  if (typeof n.opacity === "number" && n.opacity < 1) {
    drops.push(drop({ kind: "prop-shape", slot: "style.opacity", value: n.opacity, reason: `node opacity ${n.opacity} has no IR slot` }));
  }
  const strokes = (Array.isArray(n.strokes) ? n.strokes : []).map((p, i) => ({ p, i })).filter(({ p }) => p && p.visible !== false);
  if (strokes.length) {
    const s = strokes[strokes.length - 1];
    let width = null;
    if (n.strokeWeight === "mixed") drops.push(drop({ kind: "prop-shape", slot: "style.stroke.width", value: "mixed", reason: "per-side stroke weights — one width slot cannot carry them" }));
    else if (typeof n.strokeWeight === "number") width = tok(n.strokeWeight, bindingOf("strokeWeight", "style.stroke.width"));
    style.stroke = { color: s.p.type === "SOLID" ? tok(hexOf(s.p.color), paintRef("strokes", s.i, s.p)) : null, width };
    if (s.p.type !== "SOLID") drops.push(drop({ kind: "prop-shape", slot: "style.stroke.color", value: s.p.type, reason: `a ${s.p.type} stroke — only a solid stroke colour is read` }));
    if (Array.isArray(n.dashPattern) && n.dashPattern.length) {
      drops.push(drop({ kind: "unread-atom", slot: "style.stroke", value: `dash(${n.dashPattern.join(",")})`, reason: "a dashed stroke has no slot in the IR and no prop in the vocabulary" }));
    }
  }
  if (n.cornerRadius === "mixed") {
    drops.push(drop({ kind: "prop-shape", slot: "style.radius", value: "mixed", reason: "per-corner radii — one radius slot cannot carry them" }));
  } else if (typeof n.cornerRadius === "number") {
    const ids = CORNERS.map((c) => bv[c]?.id ?? null);
    const ref = ids[0] && ids.every((id) => id === ids[0]) ? refOf(bv[CORNERS[0]], variables, counter) : null;
    if (n.cornerRadius !== 0 || ref !== null) style.radius = tok(n.cornerRadius, ref);   // F3
  }
  if (Array.isArray(n.effects) && n.effects.some((f) => f && f.visible !== false)) {
    drops.push(drop({ kind: "unread-atom", slot: "style.effects", value: n.effects.filter((f) => f && f.visible !== false).map((f) => f.type).join(","), reason: "an effect (shadow or blur) has no IR slot" }));
  }
  if (n.type === "ELLIPSE") style.shape = "circle";

  // F9 · text
  let text = null;
  if (n.type === "TEXT") {
    const mixed = (field, v) => {
      if (v !== "mixed") return false;
      drops.push(drop({ kind: "prop-shape", slot: `text.${field}`, value: "mixed", reason: `${field} differs across the text's ranges — one slot cannot carry it` }));
      return true;
    };
    const size = mixed("size", n.fontSize) || typeof n.fontSize !== "number" ? null : tok(n.fontSize, bindingOf("fontSize", "text.size"));
    const family = mixed("family", n.fontName) || !n.fontName?.family ? null : tok(n.fontName.family, bindingOf("fontFamily", "text.family"));
    const weight = mixed("weight", n.fontWeight) ? null : (n.fontWeight ?? null);
    let lineHeight = null;
    if (!mixed("lineHeight", n.lineHeight) && n.lineHeight && n.lineHeight.unit !== "AUTO") {
      const lhRef = bindingOf("lineHeight", "text.lineHeight");
      if (n.lineHeight.unit === "PERCENT") lineHeight = tok(r4(n.lineHeight.value / 100), lhRef);
      else if (n.lineHeight.unit === "PIXELS" && typeof n.fontSize === "number") lineHeight = tok(r4(n.lineHeight.value / n.fontSize), lhRef);
    }
    text = {
      content: typeof n.characters === "string" ? n.characters : null,
      family, size, weight,
      align: typeof n.textAlignHorizontal === "string" ? n.textAlignHorizontal.toLowerCase() : null,
      lineHeight,
    };
  }

  return { layout, style, text, drops };
}

// F7 · one axis.
const axisOf = (sizing, px) => (sizing === "HUG" ? "hug" : sizing === "FILL" ? "fill" : (typeof px === "number" ? px : null));

// O4 · children already emitted (post-order) → a guessed row or column, or null.
export function inferLayout(n, kids) {
  if (!["FRAME", "GROUP", "COMPONENT", "INSTANCE"].includes(n.type)) return null;
  if (n.layoutMode && n.layoutMode !== "NONE") return null;
  if (kids.length < 2) return null;
  const within = (key) => kids.every((k) => Math.abs(k[key] - kids[0][key]) <= INFER_TOLERANCE);
  const dir = within("y") ? "row" : within("x") ? "column" : null;
  if (!dir) return null;
  const [pos, len] = dir === "row" ? ["x", "width"] : ["y", "height"];
  const sorted = [...kids].sort((a, b) => a[pos] - b[pos]);
  const gaps = sorted.slice(1).map((k, i) => k[pos] - (sorted[i][pos] + sorted[i][len])).sort((a, b) => a - b);
  const mid = gaps.length / 2;
  const median = r4(gaps.length % 2 ? gaps[Math.floor(mid)] : (gaps[mid - 1] + gaps[mid]) / 2);
  return { dir, gap: median === 0 ? null : tok(median, null), pad: null, align: { main: null, cross: null }, size: null, inferred: true };
}

// One export node → one IR node, or null for a node that is not emitted (the caller records why).
function toIr(n, variables, counter) {
  const kind = kindOf(n);
  const { layout: declared, style, text, drops } = readNode(n, variables, counter);
  const icon = kind === "icon" ? { name: n.name ?? null } : null;

  let component = null;
  if (kind === "instance") {
    if (n.type === "COMPONENT") component = { master: true };
    else {
      component = { name: n.main ? (n.main.setName ?? n.main.name ?? null) : null };   // F5
      const variant = {};
      for (const [k, p] of Object.entries(n.componentProperties ?? {})) if (p?.type === "VARIANT") variant[k] = p.value;
      if (Object.keys(variant).length) component.variant = variant;
    }
  }

  // Children: hidden ones and unread types are recorded here, on this node (F10, F4).
  const children = [];
  const emittedSrc = [];
  if (kind !== "icon") {
    for (const c of n.children ?? []) {
      const out = emit(c, variables, counter, drops);
      if (out) { children.push(out); emittedSrc.push(c); }
    }
  }

  // An icon's wrapper layout is artwork, not a part's arrangement: its size stays on style.size, where R4 reads the glyph box.
  const layout = kind === "icon" ? null : (declared ?? inferLayout(n, emittedSrc));
  const size = { w: axisOf(n.layoutSizingHorizontal, n.width), h: axisOf(n.layoutSizingVertical, n.height) };
  const hasSize = size.w !== null || size.h !== null;
  if (hasSize) {
    drops.push(...sizeDrops({ w: { axis: size.w, qualifier: null }, h: { axis: size.h, qualifier: null } }, layout ? "size" : "style.size"));
    if (layout) layout.size = size; else style.size = size;
  }

  return irNode({
    kind, id: n.id, name: n.name ?? null,
    position: typeof n.x === "number" && typeof n.y === "number" ? { x: n.x, y: n.y } : null,
    layout, style: Object.keys(style).length ? style : null,
    text, icon, component, children, drops,
  });
}

function emit(n, variables, counter, parentDrops) {
  if (n.visible === false) {
    parentDrops.push(drop({ kind: "hidden-layer", slot: "children", value: n.name ?? n.id, reason: `layer "${n.name ?? n.id}" is hidden in the source — read, not emitted as a part` }));
    return null;
  }
  if (!kindOf(n)) {
    parentDrops.push(drop({ kind: "unread-atom", slot: "children", value: `node type ${n.type}`, reason: `a ${n.type} node has no reader in this converter` }));
    return null;
  }
  return toIr(n, variables, counter);
}

// A house-plugin export → an ir.root(). `ids`, `bound` and `unresolved` are DERIVED from the read and
// are not parameters; `ids` and `bound` by exactly brilliant.mjs's scan, so `bound` means the same
// thing for both converters.
export function convert(text, { mode = 1, grain = "component" } = {}) {
  const e = readExport(text);
  const counter = { unresolved: 0 };
  const drops = [];
  const children = e.selection.map((n) => emit(n, e.variables, counter, drops)).filter(Boolean);
  const ids = [];
  let bound = true;
  const scan = (n) => {
    if (n.id) ids.push(n.id);
    for (const v of [n.layout?.gap, n.style?.fill, n.style?.radius, n.style?.stroke?.color, n.style?.stroke?.width, n.text?.size, n.text?.lineHeight]) {
      if (v && v.ref === null) bound = false;
    }
    for (const side of n.layout?.pad ?? []) if (side && side.ref === null) bound = false;
  };
  const out = irRoot({ mode, grain, source: { tool: "figma", ids, bound, unresolved: 0 }, children, drops });
  walk(out, (n) => { if (n.kind) scan(n); });
  out.source.ids = ids;
  out.source.bound = bound;
  out.source.unresolved = counter.unresolved;
  return checkIr(out);
}
