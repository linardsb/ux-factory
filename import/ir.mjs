// import/ir.mjs — hand-written canon (this repo; not generated). THE INTERMEDIATE REPRESENTATION
// every design-source converter emits and the one thing the matcher reads (epic #295 ticket #304;
// docs/epics/canvas-design-import.architecture.md:159-172 — the IR node shape, the drop taxonomy and
// the snapping boundary; .claude/plans/import-ir-brilliant-recognise-304.md).
//
// PURE. IT IMPORTS NOTHING — zero `import` statements, no node built-ins, no SDK anywhere in its
// import graph. That is what lets tooling/build-checks.mjs drive every branch of it in CI with no
// browser and no portal/node_modules, the same property discovery/ops.mjs and system/canvas-ops.mjs
// have and for the same reason.
//
// IT LIVES IN import/ AND NOT IN system/, and that is measured rather than stylistic:
// agent-layer/gen-loc-summary.mjs:22-27 counts `system/*.{css,mjs,js}` as the design system and
// approach.html renders the number to a reader. A converter is not a view-time module and must not
// move that total (architecture § Placement). It is not in tooling/ either: tooling/ holds gates and
// operator scripts, and this is product code THAT a gate drives — the same relationship discovery/
// has to build-checks group 29.
//
// FOUR INVARIANTS A FUTURE EDITOR MUST KEEP:
//
//   1. EVERY TOKENISABLE VALUE IS `{value, ref}` — `tok()`, and nothing else. `value` is what the
//      source resolved to; `ref` is the source's own token name when the slot is BOUND and `null`
//      when it is not. AN UNBOUND `ref` IS NEVER GUESSED HERE. Filling it by nearest value is the
//      snap step, import/snap-rules.mjs (#307, architecture:168), and a converter that guessed would make the
//      import record's fidelity block a claim nobody can check.
//
//   2. A DROP ROW CARRIES ITS E1 CLASS, DERIVED, NEVER PASSED. The architecture (`:159-160`) puts
//      imports/<id>.json's drops[] in three classes — never read · read then dropped · read but
//      never emitted. A converter's own `kind` is a FINER axis over the same rows (S2's four kinds,
//      .claude/plans/canvas-spike-s2/layout-branch.txt:219-232, which says in as many words: fold
//      `kind` into E1's classes, do not substitute one for the other). So DROP_CLASS_OF is the fold,
//      it is exported so the gate can iterate it, and `drop()` THROWS on a kind with no class —
//      a new kind cannot ship unclassified.
//
//   3. THE ROOT CARRIES MODE AND GRAIN, AND THEY ARE TWO DIFFERENT QUESTIONS. `mode` is the honesty
//      fork (docs/epics/canvas-design-import.prd.md:103): 1 = the component JOINS the system, 2 = it
//      stays FROZEN as a brand-locked exhibit, labelled as the original. `grain` is what was read
//      (the same PRD, "Two grains"): a component or a screen. G7's rule — a frozen exhibit never
//      inside a frame — is enforceable only against `mode: 2`, which is the argument for keeping the
//      two fields apart rather than collapsing them into one flag.
//
//   4. A MISS IS RECORDED, NEVER READ PAST. Nothing in this file returns a default for a value it
//      could not carry. That is S2's rule inherited whole and it is the shape every #137 defect
//      had: a value that vanishes silently while the count line reads clean.

// The IR's node kinds, verbatim from the architecture (`:165`).
export const KINDS = Object.freeze(["frame", "text", "icon", "instance", "shape"]);

// What was read. A component read is one part; a screen read is a whole view. Both converters emit
// the same tree — only the root's grain differs, and #311's placement is its only consumer.
export const GRAINS = Object.freeze(["component", "screen"]);

// The honesty fork (invariant 3). Numbers, not names, because the PRD and #307's
// `provenance.mode` both spell them as numbers.
export const MODES = Object.freeze([1, 2]);

// The ONE tokenisable-value shape (invariant 1). Two keys, always both present.
export const tok = (value, ref = null) => ({ value, ref });

// E1's three classes, spelled as the architecture spells them (`:159-160`).
export const DROP_CLASSES = Object.freeze(["never-read", "read-then-dropped", "read-but-never-emitted"]);

// THE FOLD (invariant 2). A converter's `kind` → the E1 class the import record reports.
// The first four kinds are S2's, unchanged; `unread-atom` is #304's widening of S2's scope line
// (layout-branch.txt:13 read every non-al() atom PAST, unrecorded — correct for a layout-only
// branch, and no longer correct once the converter reads the whole line); the last two are the
// matcher's, because a value can survive the whole read and still have nowhere to go.
export const DROP_CLASS_OF = Object.freeze({
  // Read and understood, and the contract cannot express it.
  "no-token": "read-then-dropped",            // a $spacing.* role the contract does not carry
  "qualifier-dropped": "read-then-dropped",   // hug:N → hug, the :N discarded
  "literal-size": "read-then-dropped",        // a fixed px on an axis whose prop is {fill,hug}
  "prop-shape": "read-then-dropped",          // the IR is richer than the prop (D1: a four-side pad, a main axis)
  "hidden-layer": "read-then-dropped",        // a layer the source hides (Figma visible:false) — read, understood, not a part (#310's)
  // Seen and not understood. The token reached the reader and no meaning came out of it.
  "unread-al-arg": "never-read",              // an al() argument with no mapping (S2's)
  "unread-atom": "never-read",                // any other atom the line grammar does not read
  // Understood, carried, and with nowhere to land.
  "unfillable-required-prop": "read-but-never-emitted",
  "no-vocabulary-slot": "read-but-never-emitted",
  // #307's three. The snap step and the import record's mapping half (import/snap-rules.mjs,
  // import/report.mjs) are the only producers.
  "no-snap-target": "read-then-dropped",      // an unbound value with no contract token inside its family's tolerance, or no family
  "unmapped-role": "read-then-dropped",       // the mapping chose not to carry a role the contract has a home for
  "no-contract-role": "read-but-never-emitted", // the contract has no home for the role
});

// One drop row. `class` is DERIVED from `kind` and is never a parameter: a caller that could pass
// its own class could file a row under a class the fold disagrees with, and the record would carry
// a total loss list that is total only by convention.
export const drop = ({ kind, slot, ref = null, value = null, reason }) => {
  if (!Object.hasOwn(DROP_CLASS_OF, kind)) {
    throw new Error(`drop(): kind "${kind}" has no E1 class — add it to DROP_CLASS_OF (classes: ${DROP_CLASSES.join(" | ")})`);
  }
  if (typeof slot !== "string" || !slot) throw new Error(`drop(): slot must be a non-empty string, got ${JSON.stringify(slot)}`);
  if (typeof reason !== "string" || !reason) throw new Error(`drop(): reason must be a non-empty string for kind "${kind}" at slot "${slot}"`);
  return { kind, class: DROP_CLASS_OF[kind], slot, ref, value, reason };
};

// One IR node. `id` and `position` are carried beside the architecture's list because a blueprint
// read gives both and #307's record needs to point back at the element it read: an id is the
// source's own handle and a position is a canvas coordinate, READ AND RECORDED, NEVER MAPPED —
// a coordinate is not a token and has no contract slot to land in.
export const node = ({
  kind, id = null, name = null, position = null, layout = null, style = null,
  text = null, icon = null, component = null, children = [], drops = [],
}) => {
  if (!KINDS.includes(kind)) throw new Error(`node(): kind "${kind}" is not one of ${KINDS.join(" | ")}`);
  return { kind, id, name, position, layout, style, text, icon, component, children, drops };
};

// The tree's root. `source` is the provenance the honesty contract turns on: which tool, which
// element ids, and whether every tokenisable slot in the read arrived BOUND.
export const root = ({ mode, grain, source, children = [], drops = [] }) => {
  if (!MODES.includes(mode)) throw new Error(`root(): mode ${JSON.stringify(mode)} is not one of ${MODES.join(" | ")}`);
  if (!GRAINS.includes(grain)) throw new Error(`root(): grain ${JSON.stringify(grain)} is not one of ${GRAINS.join(" | ")}`);
  if (!source || typeof source !== "object") throw new Error(`root(): source must be { tool, ids, bound }, got ${JSON.stringify(source)}`);
  for (const k of ["tool", "ids", "bound"]) {
    if (!Object.hasOwn(source, k)) throw new Error(`root(): source.${k} is missing — provenance is { tool, ids, bound }`);
  }
  return { mode, grain, source, children, drops };
};

// The slots whose value must be a `{value, ref}` pair, by path within a node. Listed rather than
// inferred, so a new tokenisable slot has to be declared here to be checked at all.
const TOKEN_SLOTS = Object.freeze([
  ["layout", "gap"], ["style", "fill"], ["style", "radius"], ["text", "size"], ["text", "lineHeight"],
]);

const isTok = (v) => !!v && typeof v === "object" && !Array.isArray(v)
  && Object.hasOwn(v, "value") && Object.hasOwn(v, "ref") && Object.keys(v).length === 2;

// Recurse and throw a plain Error naming the offending path (CLAUDE.md § Ground rules). Run by the
// converter over its OWN output before it returns, so a malformed emit fails at the converter
// rather than three modules downstream in the matcher.
export function checkIr(ir, path = "ir") {
  if (!ir || typeof ir !== "object") throw new Error(`${path}: expected an object, got ${ir === null ? "null" : typeof ir}`);
  const isRoot = Object.hasOwn(ir, "mode");
  if (isRoot) {
    if (!MODES.includes(ir.mode)) throw new Error(`${path}.mode: ${JSON.stringify(ir.mode)} is not one of ${MODES.join(" | ")}`);
    if (!GRAINS.includes(ir.grain)) throw new Error(`${path}.grain: ${JSON.stringify(ir.grain)} is not one of ${GRAINS.join(" | ")}`);
  } else {
    if (!KINDS.includes(ir.kind)) throw new Error(`${path}.kind: ${JSON.stringify(ir.kind)} is not one of ${KINDS.join(" | ")}`);
    if (ir.layout && ir.layout.size) {
      for (const axis of ["w", "h"]) {
        const a = ir.layout.size[axis];
        if (a === null || a === undefined) continue;
        // S2's consumer contract, at the boundary: an axis is "fill", "hug" or a raw Number the
        // source drew. A Number is LEGAL here and refused by the consumer (recognise.mjs), which is
        // why it survives the check — throwing it away would lose the value the drop row describes.
        if (a !== "fill" && a !== "hug" && !Number.isFinite(a)) {
          throw new Error(`${path}.layout.size.${axis}: ${JSON.stringify(a)} is not "fill", "hug" or a finite number`);
        }
      }
    }
    for (const [group, slot] of TOKEN_SLOTS) {
      const v = ir[group]?.[slot];
      if (v === null || v === undefined) continue;
      if (!isTok(v)) throw new Error(`${path}.${group}.${slot}: expected a { value, ref } pair, got ${JSON.stringify(v)}`);
    }
    if (ir.layout && Array.isArray(ir.layout.pad)) {
      ir.layout.pad.forEach((side, i) => {
        // A null SIDE means "read and could not be mapped" — never zero, never unset (S2's three
        // pad shapes, layout-branch.txt:294-301). It is legal and stays.
        if (side !== null && !isTok(side)) throw new Error(`${path}.layout.pad[${i}]: expected a { value, ref } pair or null, got ${JSON.stringify(side)}`);
      });
    }
  }
  for (const [i, d] of (ir.drops ?? []).entries()) {
    if (!Object.hasOwn(DROP_CLASS_OF, d?.kind)) throw new Error(`${path}.drops[${i}].kind: ${JSON.stringify(d?.kind)} has no E1 class`);
    if (d.class !== DROP_CLASS_OF[d.kind]) {
      throw new Error(`${path}.drops[${i}].class: "${d.class}" does not match DROP_CLASS_OF["${d.kind}"] = "${DROP_CLASS_OF[d.kind]}"`);
    }
  }
  (ir.children ?? []).forEach((c, i) => checkIr(c, `${path}.children[${i}]`));
  return ir;
}

// Pre-order, `(node, path)`. The ONE tree walk the converter, the matcher and the gate share, so
// "every node" means the same set of nodes in all three.
export function walk(ir, fn, path = "ir") {
  fn(ir, path);
  (ir.children ?? []).forEach((c, i) => walk(c, fn, `${path}.children[${i}]`));
}
