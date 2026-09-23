// import/brilliant.mjs — hand-written canon (this repo; not generated). A BRILLIANT BLUEPRINT READ
// → the IR (epic #295 ticket #304; docs/epics/canvas-design-import.architecture.md:159-172;
// .claude/plans/import-ir-brilliant-recognise-304.md).
//
// A "blueprint read" is the structured text a Brilliant `lookup { format:"blueprint" }` returns: one
// line per element, two spaces of indent per depth level, of the shape
//   <id> <atoms…> "<name>" [#tag]
// The two committed fixtures under import/fixtures/ are verbatim reads from a real run (2026-08-27).
//
// PURE. It imports ./ir.mjs AND NOTHING ELSE — no fs, no network, no SDK anywhere in its import
// graph. The blueprint text is an argument; the caller owns reading it.
//
// ─── THE LIFT ────────────────────────────────────────────────────────────────────────────────────
// SPACING · ALIGN_LETTER · isBoundary · args · split · parseValue · parseAl · toAlign · parseSize ·
// mapSpacing · expandPad · PAD_SIDE · toStack · nodeName ARE LIFTED FROM SPIKE S2 (#299),
// `.claude/plans/canvas-spike-s2/layout-branch.txt`, frozen at import/fixtures/s2-layout-branch.baseline.txt
// and diffed against this file by build-checks group 40 case 2. Their comments come with them: they
// carry the reasoning, not decoration. THE FOUR INHERITED CONTRACTS, restated here because this is
// now the file that owns them:
//
//   1. SIGN CONVENTION: distance = contract − source. $spacing.md is 12 in Brilliant and 16 in the
//      contract, so its distance is +4px. A contract step SMALLER than the source is negative.
//   2. MAPPING IS BY ROLE, NEVER BY VALUE. $spacing.md resolves to 12, exactly equidistant from the
//      contract's sm (8) and md (16) — by-value here is ambiguous, not merely different.
//   3. A MISS RETURNS null AND THE CALLER RECORDS A DROP. Never 0, never undefined, never the input
//      unchanged.
//   4. A CONSUMER MUST REFUSE A `size` AXIS THAT IS NOT "fill" OR "hug". s(360,hug) puts the literal
//      360 on the axis and the value is NOT discarded — emitting `width: 360px` from it would put a
//      hardcoded literal on a token-contract surface, so the REFUSAL belongs to the consumer
//      (import/recognise.mjs), not to this converter.
//
// THREE DELIBERATE CHANGES TO THE LIFTED CODE, all stated so case 2's layout-only compare is read for
// what it is rather than as a weakened test:
//   · every drop row is built through `ir.drop()`, which derives its E1 class. S2's four `kind`s are
//     spelled exactly as S2 spells them; the fold is import/ir.mjs's DROP_CLASS_OF. This is why case 2
//     compares the `layout` OBJECT and not the whole return — the rows now carry a field S2's cannot.
//   · toStack's size-drop loop moved into `sizeDrops()` so the SAME rows fire for a node with no
//     `al()`. S2 only ever saw al() lines; #304 reads every line, and a fixed size on a plain frame
//     is the same loss as a fixed size on an auto-layout one.
//   · an UNBOUND spacing value (a gap or pad side read with no ref at all, `g(12)`) is carried as
//     `tok(value, null)` with NO drop row, so it reaches the snap step (import/snap-rules.mjs, #307,
//     architecture:168). S2 dropped it as `no-token`. A BOUND ref the contract lacks
//     (`$spacing.none`) is still a `no-token` drop exactly as before — mapping is by role for those.
//     Case 2's compare is unchanged because every committed al() value is bound; ON AN UNBOUND LINE
//     THE S2 BASELINE WOULD DIFFER, and that difference is this change, not a lift defect to "fix".
//
// ─── THE SCOPE LINE MOVES, AND THAT IS THIS FILE'S OWN CONTRIBUTION ──────────────────────────────
// At #299 every atom OUTSIDE al() was read past, unrecorded (layout-branch.txt:13) — correct for a
// layout-only branch. HERE THE CONVERTER READS THE WHOLE LINE, so an atom it does not understand is
// no longer out of scope: it becomes an `unread-atom` drop (E1 NEVER-READ) carrying the atom's
// verbatim text. Fixture 2's root stroke carries `dash(10,5)`, which has no slot in the IR and no
// prop in the vocabulary — that is the committed never-read row, and it is real rather than
// hypothetical. The record of what was never read starts here.
//
// ─── TWO CONVENTIONS THIS FILE DECIDES ───────────────────────────────────────────────────────────
//   · A `tok(color.text.primary,#454545,…)` atom normalises to ref `$color.text.primary`. Brilliant
//     writes $-prefixed refs for spacing/type/radius and bare ones inside tok(); one convention in
//     the IR beats two, and the prefix is the one the rest of the read already uses.
//   · A tokenisable slot read with no ref at all (fixture 2's raw `#7C6BF0` stroke and its `rd(16)`)
//     yields `tok(value, null)` and sets the root's `source.bound` false. NOTHING IS GUESSED — the
//     snap step is import/snap-rules.mjs (#307, architecture:168), run after this converter.

import { checkIr, drop, node as irNode, root as irRoot, tok, walk } from "./ir.mjs";

// ═══ LIFTED FROM S2 (#299) — layout-branch.txt, comments included ════════════════════════════════

// The contract's spacing scale, verbatim from system/tokens.contract.css:55-62.
// There is NO zero step: `grep -rn "spacing-none|spacing-0\b" system/ agent-layer/ handoff/` → no
// matches (observed 2026-09-17). That absence is the whole of S2's question.
export const SPACING = {
  "spacing-xs": 4,
  "spacing-sm": 8,
  "spacing-md": 16,
  "spacing-lg": 24,
  "spacing-xl": 32,
  "spacing-2xl": 48,
  "spacing-3xl": 64,
  "spacing-4xl": 96,
};

// Brilliant's alignment letters. `c` is the only one this fixture exercises; `s`/`e` are the obvious
// reading and are marked UNTESTED in the README's Not-done section rather than claimed as passes.
const ALIGN_LETTER = { c: "center", s: "start", e: "end" };

const isBoundary = (c) => c === undefined || c === " " || c === "\t" || c === "," || c === "(";

// Extract head(...)'s argument string at depth 0.
//
// The boundary test: a bare `src.indexOf("g(")` matches the `g(` INSIDE `svg(icon:caret-right)`.
// Requiring start-of-string, space, comma or `(` before the head rules that out.
//
// ON THESE TWO FIXTURES IT IS DEFENSIVE, NOT LOAD-BEARING, and an earlier draft of this comment
// claimed otherwise. `grep -c 'svg('` is ONE line in each fixture (the Chevron) and that line
// carries no `al(`, so no committed line reaches the collision — build-checks group 40 case 11
// drives it on a SYNTHETIC line and says so. It is kept because the first differently-drawn source
// (an icon inside an auto-layout node) makes it live.
export const args = (src, head) => {
  const needle = head + "(";
  let i = -1;
  for (let k = src.indexOf(needle); k >= 0; k = src.indexOf(needle, k + 1)) {
    if (isBoundary(k === 0 ? undefined : src[k - 1])) { i = k; break; }
  }
  if (i < 0) return null;
  let d = 0, out = "";
  for (let j = i + head.length; j < src.length; j++) {
    const c = src[j];
    if (c === "(") { d++; if (d === 1) continue; }
    if (c === ")") { d--; if (d === 0) return out; }
    out += c;
  }
  throw new Error(`unterminated ${head}( in: ${src.trim()}`);
};

// Split on TOP-LEVEL commas only. The naive s.split(",") is wrong because pad(4:$a,8:$b,4:$c,8:$d)
// sits inside al(...) — it shatters one four-value pad into four arguments. Control C4.
export const split = (s) => {
  const out = []; let d = 0, cur = "";
  for (const c of s) {
    if (c === "(") d++;
    if (c === ")") d--;
    if (c === "," && d === 0) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  // `if (cur)` would drop a TRAILING EMPTY segment — split("a,b,") → ["a","b"] where the native
  // "a,b,".split(",") gives ["a","b",""] — so an argument list ending in a comma would silently lose
  // its last slot and C4's arity assertion would read one short. Neither fixture ends an argument list
  // in a comma, so nothing here exercised it; the header says top-level commas only, so it splits on
  // all of them. An EMPTY input is still [] (out.length is 0), which keeps pad()'s 0-value throw live.
  if (cur !== "" || out.length) out.push(cur);
  return out;
};

// Every tokenisable slot in a blueprint READ is `<resolved>:<$ref>` — e.g. `12:$spacing.md`. The ref
// is what maps; the resolved value is what the distance is measured from.
export const parseValue = (s) => {
  const t = String(s).trim();
  const i = t.indexOf(":");
  if (i >= 0) {
    const left = t.slice(0, i).trim(), right = t.slice(i + 1).trim();
    const n = Number(left);
    if (!Number.isFinite(n)) throw new Error(`non-numeric resolved value in: ${t}`);
    return { value: n, ref: right || null };
  }
  if (t.startsWith("$")) return { value: null, ref: t };
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`unparseable value: ${t}`);
  return { value: n, ref: null };
};

// The SOURCE's shape, absolute axes, untranslated. dir is "h"|"v"; alignX/alignY are the letter
// inside x()/y() or null; gap is a parseValue result or null; pad is the arity AS READ (1, 2 or 4).
//
// Dispatch runs over split(args(line,"al")) — the al() argument list — never over the whole line.
// Scoping matters twice: it keeps g()/pad()/x()/y() away from the s()/t()/f[] atoms that follow on
// the same line, and it is what makes control C4 able to fail at all (a naive split changes the al
// argument COUNT, which is the thing C4 asserts).
export const parseAl = (line) => {
  const inner = args(line, "al");
  if (inner === null) return null;
  const parts = split(inner);
  const out = { dir: null, gap: null, pad: null, alignX: null, alignY: null, alArgs: parts.length, unknown: [] };
  for (const raw of parts) {
    const p = raw.trim();
    if (p === "h" || p === "v") { out.dir = p; continue; }
    if (p.startsWith("x(")) { out.alignX = args(p, "x").trim() || null; continue; }
    if (p.startsWith("y(")) { out.alignY = args(p, "y").trim() || null; continue; }
    if (p.startsWith("g(")) { out.gap = parseValue(args(p, "g")); continue; }
    if (p.startsWith("pad(")) { out.pad = split(args(p, "pad")).map(parseValue); continue; }
    // Anything else on an al() arg list is an argument this branch has NO MAPPING FOR. It is collected,
    // never read past: the caller turns each one into a drop. Reading it past would be the silent shape
    // the header forbids — Brilliant documents at least one such argument (wrap and its cross-axis gap,
    // 01-knowledge.md:606), so this is a live class of input, not a defensive branch.
    out.unknown.push(p);
  }
  if (!out.dir) throw new Error(`al() with no direction in: ${line.trim()}`);
  return out;
};

// The IR's align shape: {main, cross}. The architecture names the `align` slot (line 165) but not its
// contents, so this is S2's call and it is written down here rather than left implicit.
//
// x/y are ABSOLUTE axes, not main/cross. Observed in 04-htmlflex.html on the Status chip:
// al(h,x(c),y(c),…) → `justify-content: center; align-items: center`. So under dir "h", x is main and
// y is cross; under "v" the roles swap. The fixture NEVER exercises al(v,…) with an x() or y(), so the
// swap is implemented and recorded as unexercised.
export const toAlign = ({ dir, alignX, alignY }) => {
  const letter = (l) => (l == null ? null : (ALIGN_LETTER[l] ?? null));
  return dir === "h"
    ? { main: letter(alignX), cross: letter(alignY) }
    : { main: letter(alignY), cross: letter(alignX) };
};

// s(w,h) → each of "fill" | "hug" | Number. `hug:N` → "hug"; the dropped :N is recorded by the caller
// (spike C README:92 — "a converter must treat hug:N as hug").
export const parseSize = (line) => {
  const inner = args(line, "s");
  if (inner === null) return null;
  const one = (raw) => {
    const t = raw.trim();
    const base = t.includes(":") ? t.slice(0, t.indexOf(":")).trim() : t;
    const qual = t.includes(":") ? t.slice(t.indexOf(":") + 1).trim() : null;
    if (base === "fill" || base === "hug") return { axis: base, qualifier: qual };
    const n = Number(base);
    if (!Number.isFinite(n)) throw new Error(`unparseable size value "${t}" in: ${line.trim()}`);
    return { axis: n, qualifier: qual };
  };
  const parts = split(inner);
  if (parts.length !== 2) throw new Error(`s() with ${parts.length} values in: ${line.trim()}`);
  return { w: one(parts[0]), h: one(parts[1]) };
};

// Map ONE spacing value by role. Hit → the contract token, its px, and the signed distance.
// Miss → null, and the caller MUST push a drop row.
export const mapSpacing = ({ value, ref }) => {
  if (!ref || !ref.startsWith("$spacing.")) return null;
  const name = "spacing-" + ref.slice("$spacing.".length);
  if (!(name in SPACING)) return null;
  const contractValue = SPACING[name];
  return { token: `--${name}`, contractValue, distance: contractValue - value };
};

// CSS shorthand arity. 1 → all four sides; 2 → [v,h,v,h]; 4 → as read.
//
// The 2-value expansion is OBSERVED, not assumed: 02-fixture.dsl.txt:5 authors
// `pad($spacing.sm,$spacing.md)` and 03c-master-blueprint.txt:3 reads it back as
// `pad(8:$spacing.sm,12:$spacing.md,8:$spacing.sm,12:$spacing.md)` — Brilliant expands a 2-value pad
// in the read itself. It does NOT expand a 1-value one: 02-fixture.dsl.txt:7 authors
// `pad($spacing.none)` and 03-blueprint.txt:5 reads back `pad(0:$spacing.none)`, still one value.
// So the 1-value rule below is CSS convention applied to a read form the fixture cannot discriminate
// (its only 1-value pad is zero, and zero on one side is zero on four). Recorded as unconfirmed.
// `line` is carried in for the throw alone: every other Error in this file names the offending input
// (CLAUDE.md §Ground rules) and this was the one that could not — expandPad sees only the mapped array.
// Reachable: `pad()` with no arguments gives args(line,"pad") → "", split("") → [], and [] is truthy,
// so toStack's `if (padSrc)` is entered and this throws.
const expandPad = (pad, line) => {
  if (!pad) return null;
  if (pad.length === 1) return [pad[0], pad[0], pad[0], pad[0]];
  if (pad.length === 2) return [pad[0], pad[1], pad[0], pad[1]];
  if (pad.length === 4) return pad;
  throw new Error(`pad() with ${pad.length} values — 1, 2 or 4 expected — in: ${String(line).trim()}`);
};

const PAD_SIDE = ["top", "right", "bottom", "left"];

// THE AXIS KEEPS THE RAW VALUE (inherited contract 4). Extracted out of toStack so the SAME two rows
// fire for a node that carries no al() at all — a fixed px on a plain frame is the same loss.
const sizeDrops = (size, where) => {
  const out = [];
  if (!size) return out;
  for (const axis of ["w", "h"]) {
    const s = size[axis];
    if (s.qualifier != null) {
      out.push(drop({
        kind: "qualifier-dropped", slot: `${where}.${axis}`, value: Number(s.qualifier),
        reason: `${s.axis}:${s.qualifier} → ${s.axis} (spike C README:92)`,
      }));
    }
    if (typeof s.axis === "number") {
      out.push(drop({
        kind: "literal-size", slot: `${where}.${axis}`, value: s.axis,
        reason: `fixed ${s.axis}px — a size prop of {fill,hug} cannot carry it`,
      }));
    }
  }
  return out;
};

// One blueprint line (the read's node) → the architecture's IR `layout` object, plus the flat rows
// the driver tabulates and every value that could not map.
//
// `drops` is ONE list with a `kind`, because the classes carry different fields: a spacing miss has a
// `ref` to name, a dropped size qualifier has none, and a literal size has neither a ref nor a token
// to look for.
//   no-token          — a $spacing.* role the contract does not carry ($spacing.none)
//   qualifier-dropped — hug:N → hug, the :N discarded (spike C README:92)
//   literal-size      — s(360,hug): a fixed px on an auto-layout node, which a size ∈ {fill,hug}
//                       prop cannot carry at all
//   unread-al-arg     — an al() argument this branch has no mapping for (e.g. Brilliant's wrap and
//                       its cross-axis gap, 01-knowledge.md:606). IN SCOPE and not understood.
//
// `kind` is a DIFFERENT AXIS from the import record's own drop classes; import/ir.mjs's DROP_CLASS_OF
// is the fold, and `ir.drop()` applies it so no row can ship unclassified.
//
// A drop is recorded ONCE PER SOURCE ATOM, not once per expanded side. `pad(0:$spacing.none)` is one
// value in the read and is one drop row here, so the unmapped count can be checked against an
// independent `grep -o '\$spacing\.[a-z]*' | sort | uniq -c` over the same file.
export const toStack = (node) => {
  const al = parseAl(node);
  if (!al) return null;
  const emitted = [], drops = [];

  const spacing = (slot, v) => {
    // UNBOUND: carried for the snap step, never guessed and never dropped here (the third change).
    if (v.ref === null) return tok(v.value, null);
    const m = mapSpacing(v);
    if (!m) {
      drops.push(drop({
        kind: "no-token", slot, ref: v.ref, value: v.value,
        reason: `no contract token for role ${v.ref} (source value ${v.value}px)`,
      }));
      return null;
    }
    emitted.push({ slot, srcValue: v.value, srcRef: v.ref, ...m });
    return tok(m.contractValue, m.token);
  };

  // Every al() argument this branch has no mapping for gets a row. Without this the value is neither
  // mapped, nor dropped, nor reported, and the count line reads clean — the shape every #137 defect had.
  for (const u of al.unknown) {
    drops.push(drop({
      kind: "unread-al-arg", slot: "al", value: u,
      reason: `al() argument "${u}" has no mapping — read but not understood, so it reaches neither the IR nor a slot`,
    }));
  }

  const gap = al.gap ? spacing("gap", al.gap) : null;

  const padSrc = al.pad;
  let pad = null;
  if (padSrc) {
    // Map each SOURCE atom once, then expand the results to four sides.
    const arity = padSrc.length;
    const note = arity === 4 ? "" : ` (${arity}-value pad, expands to all four sides)`;
    const mappedAtoms = padSrc.map((v, i) => {
      const slot = arity === 4 ? `pad.${PAD_SIDE[i]}` : `pad[${i}]`;
      if (v.ref === null) return tok(v.value, null);          // unbound → the snap step (the third change)
      const m = mapSpacing(v);
      if (!m) {
        drops.push(drop({
          kind: "no-token", slot, ref: v.ref, value: v.value,
          reason: `no contract token for role ${v.ref} (source value ${v.value}px)${note}`,
        }));
        return null;
      }
      emitted.push({ slot: slot + note, srcValue: v.value, srcRef: v.ref, ...m });
      return tok(m.contractValue, m.token);
    });
    const four = expandPad(mappedAtoms, node);
    // Every side unmappable → no pad is emitted at all. That is the omission the verdict turns on.
    //
    // A PARTIALLY mappable pad emits a MIXED array, and a `null` side in it means "this side was read
    // and could not be mapped" — never "leave this side alone". Its drop row carries the ref and the
    // source value. A consumer MUST NOT read a null side as zero or as unset; the authorable shape is
    // real (01-knowledge.md:752), neither committed fixture happens to contain one, and `pad`
    // therefore has three shapes: a full four-side array, a mixed array with null holes, and null.
    pad = four.some((x) => x !== null) ? four : null;
  }

  const size = parseSize(node);
  const sizeOut = size ? { w: size.w.axis, h: size.h.axis } : null;
  drops.push(...sizeDrops(size, "size"));

  return {
    layout: {
      dir: al.dir === "h" ? "row" : "column",
      gap,
      pad,
      align: toAlign(al),
      size: sizeOut,
    },
    source: { dir: al.dir, alignX: al.alignX, alignY: al.alignY, alArgs: al.alArgs, padArity: padSrc ? padSrc.length : 0 },
    emitted,
    drops,
  };
};

// The node's quoted name, for the driver's row headings. Not part of the IR.
//
// END-ANCHORED, and that matters far past a heading: fixture 1's root line ends
// `… inst("Spike List Row") … "Frame 1" #spikec_inst`, so this returns "Frame 1" and NOT the master's
// name. The master name is routed to `component.name` by readLine below, and import/recognise.mjs's
// name-match signal reads `component.name ?? node.name` for exactly this reason.
export const nodeName = (line) => {
  const m = line.match(/"([^"]*)"\s*(?:#\S+\s*)?$/);
  return m ? m[1] : "(unnamed)";
};

// ═══ #304's OWN GRAMMAR — the tree, the atoms, the never-read record ═════════════════════════════

// Split a line into TOP-LEVEL atoms. Quote-aware as well as bracket-aware, because `t("Amara
// Okafor",…)` carries a space inside quotes and `axes[state[active,away]]` carries brackets: S2's
// split() tracks parens only, which is right for an al() argument list and wrong for a whole line.
const atomise = (s) => {
  const out = []; let cur = "", d = 0, q = false;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === '"') q = false; continue; }
    if (ch === '"') { q = true; cur += ch; continue; }
    if (ch === "(" || ch === "[") d++;
    if (ch === ")" || ch === "]") d--;
    if (ch === " " && d === 0) { if (cur) out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
};

// Top-level split that also respects quotes — t()'s first argument is a quoted string a designer
// may well put a comma in, which S2's split() would shatter.
const splitQ = (s) => {
  const out = []; let d = 0, q = false, cur = "";
  for (const ch of s) {
    if (q) { cur += ch; if (ch === '"') q = false; continue; }
    if (ch === '"') { q = true; cur += ch; continue; }
    if (ch === "(" || ch === "[") d++;
    if (ch === ")" || ch === "]") d--;
    if (ch === "," && d === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur !== "" || out.length) out.push(cur);
  return out;
};

// `head[…]` — args()'s square-bracket twin, for f[…] and st[…]. Same boundary test, same reason.
const bracket = (src, head) => {
  const needle = head + "[";
  let i = -1;
  for (let k = src.indexOf(needle); k >= 0; k = src.indexOf(needle, k + 1)) {
    if (isBoundary(k === 0 ? undefined : src[k - 1])) { i = k; break; }
  }
  if (i < 0) return null;
  let d = 0, out = "";
  for (let j = i + head.length; j < src.length; j++) {
    const c = src[j];
    if (c === "[") { d++; if (d === 1) continue; }
    if (c === "]") { d--; if (d === 0) return out; }
    out += c;
  }
  throw new Error(`unterminated ${head}[ in: ${src.trim()}`);
};

// `tok(color.success.container,#F1F7F2,dark(#003B12))` → tok("#F1F7F2", "$color.success.container").
// A bare `#RRGGBB` with no tok() wrapper is UNBOUND: tok("#7C6BF0", null), and the root's
// source.bound goes false. The dark()/high-contrast() variants are a pack concern, not the IR's —
// the contract's own packs carry them, so carrying a second copy here would be two sources of truth.
const readColour = (atoms) => {
  for (const raw of atoms) {
    const a = raw.trim();
    if (a.startsWith("tok(")) {
      const parts = splitQ(args(a, "tok"));
      const name = parts[0]?.trim();
      const hex = parts.slice(1).map((p) => p.trim()).find((p) => p.startsWith("#"));
      if (name && hex) return tok(hex, `$${name}`);
    }
    if (a.startsWith("#")) return tok(a, null);
  }
  return null;
};

// One line → one IR node, plus the rows for everything on it that could not be carried.
// EVERY top-level atom is either read or recorded: the else branch below is the scope line.
const readLine = (line) => {
  const atoms = atomise(line.trim());
  const id = atoms.shift();
  const name = nodeName(line);
  const drops = [];
  let kind = "frame";
  let position = null, text = null, icon = null, component = null;
  let layout = null;
  const style = {};
  // WHETHER THE LINE HAS AN al(), NOT WHICH ATOM CAME FIRST. toStack() reads the WHOLE line, s()
  // included, so an s( reached before the al( on the same line would expand its size onto `style`
  // AND emit its drop rows, then toStack would emit them again — two rows for one source atom,
  // against the "A drop is recorded ONCE PER SOURCE ATOM" invariant stated above toStack, and the
  // independent grep that invariant offers as a cross-check would double-count. Both committed
  // fixtures write al( first, so this is latent here and goes live at #310's converter (PR #448 F3).
  let sawSize = atoms.some((a) => a.startsWith("al("));

  for (const atom of atoms) {
    if (atom.startsWith('"')) continue;                       // the node's own name — nodeName() owns it
    if (atom.startsWith("#")) { style.tag = atom.slice(1); continue; }
    if (atom === "fr") continue;                              // "this is a frame" — the default kind
    if (atom === "comp") { kind = "instance"; component = { ...(component ?? {}), master: true }; continue; }
    if (atom === "c") { kind = "shape"; style.shape = "circle"; continue; }

    if (atom.startsWith("al(")) {
      const st = toStack(line);                               // the LIFT, over the whole line
      layout = st.layout;
      drops.push(...st.drops);
      sawSize = true;                                         // toStack read s() too
      continue;
    }
    if (atom.startsWith("s(")) {
      if (sawSize) continue;
      sawSize = true;
      const size = parseSize(atom);
      // NOT a layout: a size on a node with no al() is a canvas measurement, so it lands on `style`
      // and the SAME drop rows fire. Putting it on `layout` would give every drawn box a layout and
      // make import/recognise.mjs's structural fallback swallow the floor.
      style.size = size ? { w: size.w.axis, h: size.h.axis } : null;
      drops.push(...sizeDrops(size, "style.size"));
      continue;
    }
    if (atom.startsWith("p(")) {
      const [x, y] = split(args(atom, "p")).map((v) => Number(v.trim()));
      position = { x, y };                                    // READ AND RECORDED, NEVER MAPPED
      continue;
    }
    if (atom.startsWith("t(")) {
      kind = "text";
      const parts = splitQ(args(atom, "t"));
      const out = { content: null, family: null, size: null, weight: null, align: null, lineHeight: null };
      for (const raw of parts) {
        const p = raw.trim();
        if (p.startsWith('"')) { out.content = p.slice(1, p.lastIndexOf('"')); continue; }
        if (p.includes(":$font.family")) { out.family = tok(p.slice(0, p.indexOf(":")), "$font.family"); continue; }
        if (p.includes(":$font.size.")) { out.size = parseValue(p); continue; }
        if (p.startsWith("lh(")) { out.lineHeight = parseValue(args(p, "lh")); continue; }
        if (p.startsWith("align(")) { out.align = args(p, "align").trim(); continue; }
        if (/^[a-z]{1,3}$/.test(p)) { out.weight = p; continue; }
        drops.push(drop({ kind: "unread-atom", slot: "t", value: p, reason: `t() argument "${p}" has no reader — read but not understood` }));
      }
      text = out;
      continue;
    }
    if (atom.startsWith("svg(")) {
      kind = "icon";
      const inner = args(atom, "svg").trim();
      icon = { name: inner.startsWith("icon:") ? inner.slice("icon:".length) : inner };
      continue;
    }
    if (atom.startsWith("inst(")) {
      kind = "instance";
      component = { ...(component ?? {}), name: splitQ(args(atom, "inst"))[0].trim().replace(/^"|"$/g, "") };
      continue;
    }
    if (atom.startsWith("at(") || atom.startsWith("variant(")) {
      const head = atom.startsWith("at(") ? "at" : "variant";
      const inner = args(atom, head).trim();                  // state(active)
      const axis = inner.slice(0, inner.indexOf("("));
      component = { ...(component ?? {}), variant: { [axis]: args(inner, axis).trim() } };
      continue;
    }
    if (atom.startsWith("axes[")) {
      const inner = bracket(atom, "axes");                    // state[active,away]
      const axis = inner.slice(0, inner.indexOf("["));
      component = { ...(component ?? {}), axes: { [axis]: bracket(inner, axis).split(",").map((v) => v.trim()) } };
      continue;
    }
    if (atom.startsWith("f[")) {
      const inner = bracket(atom, "f");
      if (inner.trim()) style.fill = readColour(splitQ(inner.replace(/^\(|\)$/g, "")));
      continue;
    }
    if (atom.startsWith("st[")) {
      const parts = splitQ(bracket(atom, "st").replace(/^\(|\)$/g, ""));
      const colour = readColour(parts);
      const width = parts.map((p) => p.trim()).find((p) => p.startsWith("w("));
      style.stroke = { color: colour, width: width ? parseValue(args(width, "w")) : null };
      // Anything else inside st[…] is in scope and not understood — dash(10,5) is the committed one.
      for (const raw of parts) {
        const p = raw.trim();
        if (!p || p.startsWith("tok(") || p.startsWith("#") || p.startsWith("w(") || /^[0-9a-f]{8,}$/.test(p)) continue;
        drops.push(drop({ kind: "unread-atom", slot: "st", value: p, reason: `stroke atom "${p}" has no slot in the IR and no prop in the vocabulary` }));
      }
      continue;
    }
    if (atom.startsWith("rd(")) { style.radius = parseValue(args(atom, "rd")); continue; }

    // THE SCOPE LINE. Read, not understood, recorded — never read past (see the header).
    drops.push(drop({ kind: "unread-atom", slot: "line", value: atom, reason: `atom "${atom}" has no reader in this converter` }));
  }

  return irNode({
    kind, id, name, position, layout,
    style: Object.keys(style).length ? style : null,
    text, icon, component, children: [], drops,
  });
};

// Indentation → depth → parent. Two spaces per level; the `lookup { … }` provenance line and any
// whole-line `#` comment (fixture 1 line 3 is a read-only note Brilliant emits) are not nodes.
const parseTree = (blueprintText) => {
  const roots = [];
  const stack = [];                                           // stack[d] = the node at depth d
  for (const [i, raw] of blueprintText.split("\n").entries()) {
    if (!raw.trim()) continue;
    // THE FIRST CONTENT LINE, not split index 0. A leading blank line sent the provenance header to
    // readLine, which accepted it silently and put the literal "lookup" into source.ids — the field
    // the honesty contract turns on (PR #448 F13). `roots.length` is the test because the header can
    // only precede every node.
    if (!roots.length && !stack.length && raw.trimStart().startsWith("lookup ")) continue;
    const indent = raw.length - raw.trimStart().length;
    if (raw.trimStart().startsWith("#")) continue;
    if (indent % 2 !== 0) throw new Error(`line ${i + 1}: indent of ${indent} is not a multiple of 2 — in: ${raw.trim()}`);
    const depth = indent / 2;
    // `stack.length - 1` is the deepest node so far and reads -1 on an indented FIRST content line,
    // where there is no node at all. The refusal is correct either way; only the wording was.
    if (depth > stack.length) throw new Error(stack.length === 0
      ? `line ${i + 1}: the first content line is indented to depth ${depth} — a blueprint's first node sits at depth 0 — in: ${raw.trim()}`
      : `line ${i + 1}: indent jumps from depth ${stack.length - 1} to ${depth} — in: ${raw.trim()}`);
    const node = readLine(raw);
    if (depth === 0) roots.push(node); else stack[depth - 1].children.push(node);
    stack.length = depth;
    stack.push(node);
  }
  return roots;
};

// A blueprint read → an ir.root(). `mode` is the operator's honesty fork and `grain` is what they
// asked to read; `ids` and `bound` are DERIVED from the read itself and are not parameters, because
// a provenance field the caller asserts is a claim and a derived one is a fact.
export function convert(blueprintText, { mode = 1, grain = "component", tool = "brilliant" } = {}) {
  const children = parseTree(blueprintText);
  const ids = [];
  let bound = true;
  const scan = (n) => {
    if (n.id) ids.push(n.id);
    for (const v of [n.layout?.gap, n.style?.fill, n.style?.radius, n.style?.stroke?.color, n.style?.stroke?.width, n.text?.size, n.text?.lineHeight]) {
      if (v && v.ref === null) bound = false;
    }
    for (const side of n.layout?.pad ?? []) if (side && side.ref === null) bound = false;
  };
  const out = irRoot({ mode, grain, source: { tool, ids, bound }, children, drops: [] });
  walk(out, (n) => { if (n.kind) scan(n); });
  out.source.ids = ids;
  out.source.bound = bound;
  // Check its OWN output before returning: a malformed emit fails at the converter, not three
  // modules downstream in the matcher.
  return checkIr(out);
}
