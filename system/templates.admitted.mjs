// system/templates.admitted.mjs — the ADMITTED REGISTRY: every component a ratify has admitted, as DATA
// (epic #295 ticket #313; docs/epics/canvas-design-import.architecture.md § Boundaries "Ratify writes,
// gates, and stops at the diff (G6)"; .claude/plans/ratify-write-gate-diff-313.md D1).
//
// HAND-WRITTEN ABOVE THE BEGIN MARKER, MACHINE-WRITTEN BETWEEN THE MARKERS. portal/lib/ratify.mjs reads
// this file as TEXT, parses the JSON between the `deepFreeze(` line and the `);` line, inserts one entry
// and writes it back with its keys sorted. Nothing else writes here, and nobody edits the JSON by hand.
//
// INVARIANTS (asserted by build-checks group 50):
//   1. A DEFINITION IS DATA, NEVER CODE. `{ tag, class, slots, children, provenance }` — the one
//      interpreter, `admittedTemplate` in system/agentic-renderer.mjs, turns it into DOM. The owner's
//      form can therefore never put a function into a module every page loads through the renderer
//      (the owner's call, 2026-09-30: declarative over owner-typed JS templates).
//   2. THE SHAPE IS SMALL ON PURPOSE. A root element from ADMIT_TAGS (containers and inline text — no
//      a, button, input, img, script, style or iframe), text slots written through textContent, attr
//      slots limited to data-* (never RESERVED_ATTRS, which the renderer and canvas set), and children "none" or "many". A part this cannot express is admitted
//      by hand through the existing three-file chain, and the ratify form says so.
//   3. checkAdmitted IS THE ONE VALIDATOR, and it is pure: no DOM, no fs, no imports. The portal may
//      import it (a cached copy is still correct, because it holds no data); it must NEVER import this
//      module to read ADMITTED — the long-lived portal's ESM cache would answer the pre-ratify registry.
//   4. A HAND-WRITTEN TEMPLATE ALWAYS WINS. The renderer spreads an admitted name in only where its
//      TEMPLATES map holds none, and a collision is a build-checks red, never a silent swap.
//
// Node-import safe: data and one pure function, no import of its own — agent-layer/gen-vocabulary.mjs
// imports the renderer, which imports this, under Node.

export const ADMIT_TAGS = Object.freeze(["div", "span", "p", "li", "section", "article", "strong"]);
export const CHILDREN = Object.freeze(["none", "many"]);

const DEF_KEYS = Object.freeze(["tag", "class", "slots", "children", "provenance"]);
const TEXT_SLOT_KEYS = Object.freeze(["prop", "as", "tag", "class"]);
const ATTR_SLOT_KEYS = Object.freeze(["prop", "as", "attr"]);
const PROVENANCE_KEYS = Object.freeze(["from", "record", "run", "line"]);
export const ADMIT_CLASS_RE = /^(ds|vd)-[a-z][a-z0-9-]{1,39}$/;
const ATTR_RE = /^data-[a-z][a-z0-9-]*$/;
// Attributes the renderer and the canvas set on a rendered part themselves; a slot claiming one breaks selection.
const RESERVED_ATTRS = Object.freeze(["data-part", "data-stx-id", "data-stx-selected"]);
const RECORD_RE = /^i[1-9][0-9]*$/;
const RUN_RE = /^[a-z0-9-]{1,48}$/;

const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// checkAdmitted(name, def, spec) → true, or throws naming `templates.admitted: <name>.<field>`.
// `spec` is the component's parsed spec head ({ class, props, childrenCardinality, … }).
export function checkAdmitted(name, def, spec) {
  const at = (field) => `templates.admitted: ${name}.${field}`;
  if (!plain(def)) throw new Error(`templates.admitted: ${name} must be an object { ${DEF_KEYS.join(", ")} }`);
  if (!plain(spec)) throw new Error(`templates.admitted: ${name} has no spec head to check against`);
  for (const k of Object.keys(def)) {
    if (!DEF_KEYS.includes(k)) throw new Error(`${at(k)} is not a definition key — a definition is exactly ${DEF_KEYS.join(", ")}`);
  }
  for (const k of DEF_KEYS) if (def[k] === undefined) throw new Error(`${at(k)} is required`);
  if (!ADMIT_TAGS.includes(def.tag)) throw new Error(`${at("tag")} ${JSON.stringify(def.tag)} is not an admitted tag — one of ${ADMIT_TAGS.join(", ")}`);
  if (typeof def.class !== "string" || !ADMIT_CLASS_RE.test(def.class)) {
    throw new Error(`${at("class")} ${JSON.stringify(def.class)} is not a component class (ds-<name> or vd-<name>)`);
  }
  if (def.class !== spec.class) throw new Error(`${at("class")} ${JSON.stringify(def.class)} is not the spec's class ${JSON.stringify(spec.class)}`);
  if (!Array.isArray(def.slots)) throw new Error(`${at("slots")} must be an array`);
  const props = plain(spec.props) ? spec.props : {};
  const seen = new Set();
  def.slots.forEach((s, i) => {
    const sat = (f) => at(`slots[${i}]${f ? `.${f}` : ""}`);
    if (!plain(s)) throw new Error(`${sat()} must be an object`);
    if (s.as !== "text" && s.as !== "attr") throw new Error(`${sat("as")} ${JSON.stringify(s.as)} must be "text" or "attr"`);
    const keys = s.as === "text" ? TEXT_SLOT_KEYS : ATTR_SLOT_KEYS;
    for (const k of Object.keys(s)) if (!keys.includes(k)) throw new Error(`${sat(k)} is not a key of a ${s.as} slot — it takes ${keys.join(", ")}`);
    for (const k of keys) if (s[k] === undefined) throw new Error(`${sat(k)} is required`);
    if (typeof s.prop !== "string" || !Object.hasOwn(props, s.prop)) {
      throw new Error(`${sat("prop")} ${JSON.stringify(s.prop)} is not a prop the spec declares (${Object.keys(props).join(", ") || "none"})`);
    }
    if (seen.has(s.prop)) throw new Error(`${sat("prop")} ${JSON.stringify(s.prop)} is already slotted — one slot per prop`);
    seen.add(s.prop);
    if (s.as === "text") {
      if (!ADMIT_TAGS.includes(s.tag)) throw new Error(`${sat("tag")} ${JSON.stringify(s.tag)} is not an admitted tag — one of ${ADMIT_TAGS.join(", ")}`);
      if (typeof s.class !== "string" || !s.class.startsWith(`${def.class}-`) || !/^[a-z][a-z0-9-]*$/.test(s.class)) {
        throw new Error(`${sat("class")} ${JSON.stringify(s.class)} must be ${def.class}-<slot>`);
      }
    } else if (typeof s.attr !== "string" || !ATTR_RE.test(s.attr)) {
      throw new Error(`${sat("attr")} ${JSON.stringify(s.attr)} is not a data-* attribute`);
    } else if (RESERVED_ATTRS.includes(s.attr)) {
      throw new Error(`${sat("attr")} ${JSON.stringify(s.attr)} is reserved — the renderer and the canvas set it themselves`);
    }
  });
  if (!CHILDREN.includes(def.children)) throw new Error(`${at("children")} ${JSON.stringify(def.children)} must be "none" or "many"`);
  if ((def.children === "many") !== (spec.childrenCardinality === "many")) {
    throw new Error(`${at("children")} is ${JSON.stringify(def.children)} and the spec's childrenCardinality is ${JSON.stringify(spec.childrenCardinality ?? null)} — "many" exactly when the spec declares it`);
  }
  const pv = def.provenance;
  if (!plain(pv)) throw new Error(`${at("provenance")} must be an object { ${PROVENANCE_KEYS.join(", ")} }`);
  for (const k of Object.keys(pv)) if (!PROVENANCE_KEYS.includes(k)) throw new Error(`${at(`provenance.${k}`)} is not a provenance key`);
  if (pv.from !== "import") throw new Error(`${at("provenance.from")} ${JSON.stringify(pv.from)} must be "import"`);
  if (typeof pv.record !== "string" || !RECORD_RE.test(pv.record)) throw new Error(`${at("provenance.record")} ${JSON.stringify(pv.record)} is not an import record id (i1, i2, …)`);
  if (typeof pv.run !== "string" || !RUN_RE.test(pv.run)) throw new Error(`${at("provenance.run")} ${JSON.stringify(pv.run)} is not a run slug`);
  if (typeof pv.line !== "string" || !pv.line.trim() || pv.line.length > 200) {
    throw new Error(`${at("provenance.line")} must be a non-empty string of at most 200 characters`);
  }
  return true;
}

function deepFreeze(v) {
  if (v && typeof v === "object") {
    for (const x of Object.values(v)) deepFreeze(x);
    Object.freeze(v);
  }
  return v;
}

// ---- BEGIN ADMITTED (portal/lib/ratify.mjs rewrites the JSON below; never edit by hand) ----
export const ADMITTED = deepFreeze(
{}
);
// ---- END ADMITTED ----
