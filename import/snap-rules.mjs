// import/snap-rules.mjs — hand-written canon (this repo; not generated). THE SNAP STEP: every UNBOUND
// tokenisable value in an IR (a raw `12px`, a raw `#0c3b2f` — `{value, ref: null}`) matched to the
// nearest contract token in its family, with the distance recorded (epic #295 ticket #307;
// docs/epics/canvas-design-import.architecture.md:168-173; the owner's O3a on #307, 2026-09-15;
// .claude/plans/import-record-snap-rules-307.md D4–D7).
//
// ─── O3a: ADMISSION BY EQUALITY. THREE OUTCOMES, AND NOTHING RESOLVES SILENTLY UNLESS IT IS EXACT ─
//   exact     distance 0 to exactly ONE token → the tok's `ref` is filled. Silent, because there is
//             nothing to decide.
//   proposed  inside the family's tolerance, OR a distance-0 tie across several tokens → `ref` STAYS
//             null and the row lists the candidates. A near match is a proposal a human accepts
//             (#311's editor), never a quiet substitution.
//   dropped   outside the tolerance, or a slot whose family the contract does not have → `ref` null
//             and a `no-snap-target` drop row (E1 read-then-dropped) on the node.
//   override  the owner's per-source fix, read back by the source file's hash (below).
// BOUND SLOTS (`ref !== null`) ARE NEVER TOUCHED. Those map by role in the converter
// (import/brilliant.mjs contract 2); by-value is only for a value that arrived with no name.
//
// ─── TIES ARE THE RULE WORKING, NOT A BUG ────────────────────────────────────────────────────────
// `candidates` lists every target at the minimum |distance|, each with its OWN signed distance. The
// row's `distance` is that signed distance when every candidate shares it, and `null` when the tie
// straddles the value (a 12px gap: --spacing-sm −4, --spacing-md +4) — rendered "tie — see
// candidates". EVERY CONTRACT COLOUR HEX IS SHARED BY AT LEAST TWO ROLES (#ffffff ×4, #1a1a1a ×3,
// #f4f4f5 ×2 — observed), so a colour that matches exactly is almost always a tie and therefore a
// proposal: a value cannot name a role, and pretending it can is the defect spike A shipped.
//
// ─── FAMILIES AND TOLERANCES (D5 — first values, moved when a real flow says so) ─────────────────
//   spacing  layout.gap, layout.pad[0..3]  brilliant.mjs SPACING         2px  (half the smallest step)
//   type     text.size                     TYPE_ROLE_PX → --type-*       1px
//   radius   style.radius                  the contract's radius group   2px
//   colour   style.fill, style.stroke.color  fg-surface/accent/inverse   ΔE2000 ≤ 2.3 (the JND)
//   none     text.lineHeight, style.stroke.width — the contract has no family; always dropped
// Sign convention `contract − source` (brilliant.mjs contract 1); colour distance is unsigned.
// TYPE SNAPS TO THE FOUR ROLES recognise.mjs fills from, NOT to the eight-step ramp, so the snap and
// the role fill give ONE answer for one value (12px → caption, not eyebrow). The plan's Q3.
//
// ─── OVERRIDES (D6) ──────────────────────────────────────────────────────────────────────────────
// Keyed by the full sha256 of the SOURCE FILE's bytes, at `<dir>/<hash>.json`. Same hash ⇒ identical
// tree ⇒ identical paths, so rows are keyed `path` + `slot`. A changed file (new hash) gets no
// overrides. An override naming a slot with no snap row, or a ref outside that slot's family, is
// refused by name. The owner's real overrides live in import/overrides/; the gate's fixture lives in
// import/fixtures/overrides/, because an override is the owner's decision and a fixture is not one.
//
// PURE except `readOverrides`, the one function that touches node:fs. `snap` returns a new tree and
// never mutates its input; snap rows go on the node as `node.snaps` (beside `node.drops`), added only
// to a node that has one. EVERY DISTANCE IS ROUNDED TO 4 DP AFTER TIES ARE DECIDED on the unrounded
// values — ΔE's last bits differ between Node 20 and Node 24 (import/fidelity.mjs's header).

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { SPACING } from "./brilliant.mjs";
import { deltaEHex, r4 } from "./fidelity.mjs";
import { checkIr, drop, tok, walk } from "./ir.mjs";
import { TYPE_ROLE_PX } from "./recognise.mjs";

export const FAMILIES = Object.freeze(["spacing", "type", "radius", "colour"]);
export const TOLERANCE = Object.freeze({ spacing: 2, type: 1, radius: 2, colour: 2.3 });

// Every slot the snap step reads, in the order it reads them. `null` = no contract family.
// `layout.pad` is read PER SIDE as `layout.pad[i]`.
export const SLOT_FAMILY = Object.freeze({
  "layout.gap": "spacing",
  "layout.pad": "spacing",
  "text.size": "type",
  "text.lineHeight": null,
  "style.radius": "radius",
  "style.fill": "colour",
  "style.stroke.color": "colour",
  "style.stroke.width": null,
});

// recognise.mjs:112-118's four roles → the contract token each is pinned to.
export const TYPE_TOKEN = Object.freeze({ display: "--type-display", heading: "--type-h2", body: "--type-body", caption: "--type-caption" });

const COLOUR_GROUPS = Object.freeze(["fg-surface", "accent", "inverse"]);
const HEX = /^#[0-9a-f]{6}$/;

// The parsed tokens.source.json `contract` object → the four target lists, each [{ref, value}].
// Pure: the caller reads the file. Spacing comes from the converter's SPACING (build-checks 42.12
// pins it to the contract's spacing group), type from TYPE_ROLE_PX, radius and colour from the
// contract itself. A colour whose value is not a 6-digit hex (`color-mix(…)`) is skipped — it has no
// single value to measure from.
export function targetsFrom(contract) {
  const group = (g) => {
    const v = contract?.[g];
    if (!v || typeof v !== "object") throw new Error(`targetsFrom: contract group "${g}" is missing`);
    return Object.entries(v).filter(([k]) => !k.startsWith("$"));
  };
  const radius = group("radius").map(([k, t]) => {
    const m = /^(\d+(?:\.\d+)?)px$/.exec(String(t.$value));
    if (!m) throw new Error(`targetsFrom: contract.radius.${k} is ${JSON.stringify(t.$value)} — a px length expected`);
    return { ref: `--${k}`, value: Number(m[1]) };
  });
  const colour = COLOUR_GROUPS.flatMap((g) => group(g)
    .map(([k, t]) => ({ ref: `--${k}`, value: String(t.$value).toLowerCase() }))
    .filter((t) => HEX.test(t.value)));
  return {
    spacing: Object.entries(SPACING).map(([k, v]) => ({ ref: `--${k}`, value: v })),
    type: Object.entries(TYPE_ROLE_PX).map(([role, v]) => ({ ref: TYPE_TOKEN[role], value: v })),
    radius,
    colour,
  };
}

// The slot's family key: `layout.pad[2]` → `layout.pad`.
const familyKey = (slot) => slot.replace(/\[\d+\]$/, "");

// Every unbound tok on one node, as [slot, tok, write(newTok)]. A WRITE PUTS A FRESH tok INTO THE
// SLOT and never sets `.ref` on the existing object: the converter's expandPad repeats ONE object
// across four sides for a 1- or 2-value pad, and structuredClone keeps that sharing, so a write
// through the object would change every side at once.
function unboundSlots(n) {
  const out = [];
  const one = (slot, holder, key) => {
    const v = holder?.[key];
    if (v && typeof v === "object" && Object.hasOwn(v, "ref") && v.ref === null) {
      out.push([slot, v, (t) => { holder[key] = t; }]);
    }
  };
  one("layout.gap", n.layout, "gap");
  if (Array.isArray(n.layout?.pad)) n.layout.pad.forEach((_, i) => one(`layout.pad[${i}]`, n.layout.pad, i));
  one("text.size", n.text, "size");
  one("text.lineHeight", n.text, "lineHeight");
  one("style.radius", n.style, "radius");
  one("style.fill", n.style, "fill");
  one("style.stroke.color", n.style?.stroke, "color");
  one("style.stroke.width", n.style?.stroke, "width");
  return out;
}

const distanceOf = (family, target, value) => (family === "colour"
  ? deltaEHex(target.value, String(value).toLowerCase())
  : target.value - value);                                    // contract − source

// One unbound value against its family → the row (without path) and whether it drops.
function snapOne(slot, value, targets) {
  const family = SLOT_FAMILY[familyKey(slot)];
  if (!family) {
    return { slot, family: null, value, outcome: "dropped", ref: null, distance: null, candidates: [],
      reason: `the contract has no ${familyKey(slot)} family — an unbound ${familyKey(slot)} has nothing to snap to` };
  }
  const list = targets?.[family];
  if (!Array.isArray(list) || !list.length) throw new Error(`snap: targets.${family} is empty — targetsFrom(contract) builds it`);
  if (family === "colour" ? !HEX.test(String(value).toLowerCase()) : !Number.isFinite(value)) {
    return { slot, family, value, outcome: "dropped", ref: null, distance: null, candidates: [],
      reason: `${JSON.stringify(value)} is not a ${family === "colour" ? "6-digit hex" : "finite number"} — nothing to measure from` };
  }
  const scored = list.map((t) => ({ ref: t.ref, value: t.value, d: distanceOf(family, t, value) }));
  const min = Math.min(...scored.map((s) => Math.abs(s.d)));
  const tied = scored.filter((s) => Math.abs(s.d) === min).sort((a, b) => (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0));
  const candidates = tied.map((s) => ({ ref: s.ref, value: s.value, distance: r4(s.d) }));
  const distance = tied.every((s) => s.d === tied[0].d) ? r4(tied[0].d) : null;
  const tol = TOLERANCE[family];
  if (min === 0 && tied.length === 1) {
    return { slot, family, value, outcome: "exact", ref: tied[0].ref, distance, candidates };
  }
  if (min <= tol) return { slot, family, value, outcome: "proposed", ref: null, distance, candidates };
  const near = candidates.map((c) => `${c.ref} (${c.distance})`).join(", ");
  return { slot, family, value, outcome: "dropped", ref: null, distance, candidates,
    reason: `no ${family} token within ${tol}${family === "colour" ? " ΔE2000" : "px"} of ${value} — nearest ${near}` };
}

// The IR → { ir, snaps }. `overrides` is the parsed override file (readOverrides) or null.
export function snap(ir, targets, overrides = null) {
  const out = structuredClone(ir);
  const snaps = [];
  const byKey = new Map();
  walk(out, (n, path) => {
    if (!n.kind) return;                                      // the root carries no slots
    const rows = [];
    for (const [slot, t, write] of unboundSlots(n)) {
      const { reason, ...row } = { path, ...snapOne(slot, t.value, targets) };
      if (row.outcome === "exact") write(tok(t.value, row.ref));
      if (row.outcome === "dropped") n.drops.push(drop({ kind: "no-snap-target", slot, value: t.value, reason }));
      rows.push(row);
      byKey.set(`${path} ${slot}`, { row, node: n, write, value: t.value });
    }
    if (rows.length) { n.snaps = rows; snaps.push(...rows); }
  });
  if (overrides) applyOverrides(overrides, byKey, targets);
  return { ir: checkIr(out), snaps };
}

// The owner's fixes, applied to the rows `snap` just computed. EXACTLY the named rows change —
// outcome, ref, the tok, and the slot's `no-snap-target` drop if it had one — and nothing else.
function applyOverrides(overrides, byKey, targets) {
  if (!Array.isArray(overrides?.snaps)) throw new Error("overrides.snaps: expected an array of { path, slot, ref }");
  for (const [i, o] of overrides.snaps.entries()) {
    const hit = byKey.get(`${o?.path} ${o?.slot}`);
    if (!hit) throw new Error(`overrides: no snap at ${o?.path} ${o?.slot} (overrides.snaps[${i}]) — the slot is bound, or the source changed`);
    const family = SLOT_FAMILY[familyKey(o.slot)];
    if (!family || !(targets[family] ?? []).some((t) => t.ref === o.ref)) {
      throw new Error(`overrides: ${o.ref} is not a ${family ?? "(no family)"} token, so it cannot fill ${o.path} ${o.slot} (overrides.snaps[${i}])`);
    }
    hit.row.outcome = "override";
    hit.row.ref = o.ref;
    hit.write(tok(hit.value, o.ref));
    const at = hit.node.drops.findIndex((d) => d.kind === "no-snap-target" && d.slot === o.slot);
    if (at >= 0) hit.node.drops.splice(at, 1);
  }
}

export const sourceHash = (bytes) => createHash("sha256").update(bytes).digest("hex");

// The override file for these source bytes, or null when there is none. The file name is BUILT FROM
// A HASH and refused if it is not one before it is joined to `dir` — the only path this module
// constructs. A file whose inner `source` disagrees with its own name is refused: a copied override
// must not silently apply to a different source.
export function readOverrides(bytes, dir) {
  const hash = sourceHash(bytes);
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error(`readOverrides: ${hash} is not a sha256 hex`);
  const file = join(dir, `${hash}.json`);
  if (!existsSync(file)) return null;
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  if (parsed?.source !== hash) throw new Error(`readOverrides: ${file} carries source ${JSON.stringify(parsed?.source)}, not its own hash ${hash}`);
  return parsed;
}
