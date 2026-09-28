# Feature: a composition missing a required prop is not emitted — every builder, `stack` included (#477)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

**Every code block in this plan was driven verbatim on a detached `origin/main` worktree at `c68a4ff`
(2026-09-28): full `build-checks.mjs` exit 0, and each REDDENS mutation observed red.** See NOTES § Pre-flight.

## Feature Description

`import/recognise.mjs`'s `build()` refuses a composition whose required prop is missing — but it tests the KEY
(`p in out.props`), not the VALUE. The `stack` builder always writes `direction: node.layout?.dir ?? null`, so on a
node with no layout the key is present, holds `null`, passes the check, and the composition reaches the renderer,
which throws `composition.props.direction: expected string, got object`. The import view then shows "Refused by the
renderer: …" instead of "not emitted — see drops".

Three changes:

1. **The rule** — the closing check reads the value (`out.props?.[p] == null`).
2. **The loss list stays total** — when a composition is refused, each child it had already built gets one
   `no-vocabulary-slot` row, so nothing leaves in silence (resolves R1).
3. **Two gate cases** — 40.29 sweeps every node of both committed spike C reads × every `BUILDERS` name
   (emitted ⇒ renderable, plus a positive control and the issue's named pair); 43.14 drives the REAL
   `applyMapping` through `runPipeline` on the issue's repro (resolves R2).

## User Story

As the owner using the #311 mapping editor
I want mapping a part to a builder it cannot fill to read "not emitted — see drops", with every lost piece named
So that a refusal is recorded as a loss with its reason, never surfaced as a renderer crash, and #474's live fidelity has an honest answer to work from

## Problem Statement

#311's mapping editor lets the owner send any node to any `BUILDERS` name (`portal/lib/import-run.mjs:179-180`).
That bypasses `recognise()`'s structural-fallback gate (`import/recognise.mjs:417`, `else if (ir.layout)`), which
was the only thing keeping a layout-less node away from the `stack` builder. The comment at
`import/recognise.mjs:484-486` still says this path is unreachable. And when `build()` does refuse a container, the
children it already built are discarded with no row — ir.mjs invariant 4 ("A MISS IS RECORDED, NEVER READ PAST",
`import/ir.mjs:41`) broken quietly.

## Solution Statement

`build()`'s closing check treats a present-but-`null`/`undefined` value as missing and, before returning `null`,
files one row per child it had built. The drop rows `stackShape` and `propsFor` already file
(`no-vocabulary-slot` slot `layout`, `unfillable-required-prop` slot `stack.direction`) stay. The UI already renders
the `null` case (`portal/public/canvas-import.mjs:299`, `"not emitted — see drops"`), so no UI change.

## Risks, and how this plan resolves each

| | Risk (from the first draft) | Resolution | Proven by |
|---|---|---|---|
| R1 | A refused container's valid built children vanish with no row | `build()` files one `no-vocabulary-slot` row per built child (slot `<path>.children`, value the child's name) before returning `null`; applies to every builder, `list` included | 40.29's named pair asserts rows for exactly `[stack, icon]`; mutation M3 reds it. No committed output moves (regen-expected + regen-import-records: no diff) |
| R2 | 40.29 mirrors `applyMapping`'s assign instead of calling it | New case 43.14 drives the real `applyMapping` via `runPipeline` on the issue's repro, in group 43 (which already imports `portal/lib/import-run.mjs`); 40.29's header points to it | Mutation M1 reds 43.14 with the renderer-bound composition |
| R3 | A fresh worktree lacks `tooling/icons/node_modules`, so 41.7 reds for a setup reason | Task 0 installs it when absent, before the baseline run | Observed: with deps, full gate exit 0 |

## Out of Scope / Non-Goals

- Not changing: the `stack` builder's `direction:` line (`recognise.mjs:530`). `propsFor` fills `direction` from
  `layout.dir` anyway (`fillProp`, `recognise.mjs:250`), so the line is redundant, but removing it reorders keys in
  every emitted `stack` and buys nothing. The fix is the rule, not the builder.
- Not changing: `applyMapping` (`portal/lib/import-run.mjs:170-189`). Refusing "this node cannot fill this builder"
  there would be a second copy of `build()`'s check. `build()` is the one place.
- Not changing: the portal UI. `canvas-import.mjs:298-299` already has the state.
- Not included: #474's live fidelity itself.

## Feature Metadata

**Feature Type**: Bug Fix
**Estimated Complexity**: Low
**Primary Systems Affected**: `import/recognise.mjs` (`build()`, comments), `tooling/build-checks.mjs` groups 40 and 43, `.claude/references/gates.md`
**Dependencies**: none

## Related Work

**Implements**: #477 (`Closes #477`)   ·   **Epic**: #295 — `docs/epics/canvas-design-import.architecture.md`

**Back-references**:

- `.claude/plans/import-ir-brilliant-recognise-304.html` / #304 — `build()`, `BUILDERS`, the closing required-prop check
- `.claude/plans/import-run-live-read-311-pr-b.md` / #311 — the mapping editor that made the path reachable
- #456 — `BUILDERS.icon` and R4, the last change to `build()`'s emitted set

**Forward-references**:

- #474 — live fidelity; blocked on a mapping that emits a renderable candidate

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

All line numbers are `origin/main` at `c68a4ff`.

- `import/ir.mjs:41` — invariant 4, "A MISS IS RECORDED, NEVER READ PAST"; `:67-83` `DROP_CLASS_OF` (the closed kind set — `no-vocabulary-slot` is `read-but-never-emitted`); `drop()` right after it refuses an unknown kind
- `import/recognise.mjs:417` — the structural fallback's `ir.layout` gate
- `import/recognise.mjs:481-493` — `stackShape` and its stale "not reachable" comment (`:484-486`)
- `import/recognise.mjs:527-531` — `BUILDERS.stack`, the `direction: … ?? null` write
- `import/recognise.mjs:536-548` — `BUILDERS.list` header: "THE CONTAINER AND ITS ROWS ARE THEN REFUSED TOGETHER … What survives a design read of a list is the LOSS LIST"
- `import/recognise.mjs:551-553` — `build()`'s header comment
- `import/recognise.mjs:628-631` — the closing check to change:
  ```js
  // A required prop that could not be filled means the node was understood and cannot be emitted.
  const missing = requiredOf(entry).filter(([p]) => !(p in (out.props ?? {})));
  if (missing.length) return null;
  return out;
  ```
- `portal/lib/import-run.mjs:179-180` — `applyMapping`: validates `m.map` against `BUILDERS`, then `Object.assign(v, { name: m.map, covered: true, via: "mapping" })`
- `portal/public/canvas-import.mjs:298-301` — `null` → "not emitted — see drops"; a throw → "Refused by the renderer: …"
- `tooling/build-checks.mjs:325-338` — `ok(condition, message)` accumulates; `group(name, detail)` prints
- `tooling/build-checks.mjs:12268-12310` — group 40's setup: `B1`/`R1`/`IR`, `deep`, `threw`, `fold`, `at`, `flat`, `INSTANCE`, `MASTER`; `VOCAB` at `:320`; `validateComposition` in scope
- `tooling/build-checks.mjs:12592-12641` — case 40.12, the pattern mirrored (direct `R1.build`, drop rows by `kind`+`slot`)
- `tooling/build-checks.mjs:13008-13029` — case 40.28; 40.29 goes after it, before `group("import-chain", …)` at `:13031`
- `tooling/build-checks.mjs:13746` — group 43's `BLUEPRINT = fx("spike-c-instance.blueprint.txt")` (a Buffer — `.toString("utf8")`); `:13795-13801` — `M` (import-run), `vc`, `INPUTS = M.loadInputs()`; `:13935-13972` — 43.7 (maps the FIGMA export, whose root is laid out, so it never reached this bug); `:14019` — 43.9, the insertion point for 43.14
- `.claude/references/gates.md:70` (group 40) and the group 43 paragraph — both get a sentence

### New Files to Create

None.

### Patterns to Follow

**Every constructive call goes through `fold()`** (`build-checks.mjs:12301-12303`) — an unguarded throw kills the
process before any named failure prints.

**Synthetic vs committed input is said in the case** (40.12's `SYNTHETIC:`). 40.29 runs on COMMITTED reads with a
SYNTHETIC mapping; its header says so.

**Case header style**: `// --- 40.N TITLE IN CAPS (#ticket) ----` then a short why.

**A refusal is `null` plus rows — never a throw** (`recognise.mjs:551-553`).

---

## IMPLEMENTATION PLAN

### Phase 1: The gate, red first

Tasks 0–2: branch, the two cases, watch them red on the unfixed line.

### Phase 2: The rule and the rows

**Depends on:** Phase 1 (so the red is observed before the fix).

Tasks 3–4: `build()`'s closing check, the three comments.

### Phase 3: Prose and the full run

Tasks 5–6.

---

## STEP-BY-STEP TASKS

### 0. SETUP the branch and the icons deps (R3)

- **IMPLEMENT**:
  ```
  git fetch origin && git switch -c fix/stack-refused-without-layout-477 origin/main
  [ -d tooling/icons/node_modules ] || (cd tooling/icons && npm ci)
  ```
  The primary tree carries unrelated dirty/untracked files from sibling sessions — stage by explicit path only, and
  re-check `git branch --show-current` right before committing.
- **GOTCHA**: without `tooling/icons/node_modules`, 41.7 reds: `gen-icons: tooling/icons/node_modules/@phosphor-icons/core/assets/regular is missing`. That is setup, not this ticket.
- **VALIDATE**: `node tooling/build-checks.mjs; echo exit $?` → observed exit 0 on `origin/main` with icons deps.
- **SATISFIES**: —  ·  **REGENERATES**: none

### 1. ADD case 40.29 to `tooling/build-checks.mjs`

- **IMPLEMENT**: insert after 40.28's closing `}` (`:13029`), immediately before `  group("import-chain",` (`:13031`):
  ```js
  // --- 40.29 ONE RULE FOR EVERY BUILDER: EMITTED MEANS RENDERABLE (#477) --------------------------
  // #311's mapping editor sends ANY node to ANY BUILDERS name (portal/lib/import-run.mjs:179-180), so
  // recognise()'s `ir.layout` gate on the fallback no longer keeps a layout-less node off `stack`. The
  // rule this case holds is build()'s: it returns null (with the rows) or a composition the renderer
  // accepts — never one it refuses. Swept over EVERY node of both committed reads × EVERY builder, the
  // mapping applied the way applyMapping applies it; the reads are committed, the mapping is synthetic.
  // The real applyMapping is driven over the same pair in group 43 (43.14).
  {
    const refused = [], emitted = [];
    for (const [fname, text] of [["instance", INSTANCE], ["master", MASTER]]) {
      const ir = fold(`convert the ${fname} read (40.29)`, () => B1.convert(text), null);
      const vt = ir && fold(`recognise the ${fname} read (40.29)`, () => R1.recognise(ir, VOCAB), null);
      if (!vt) continue;
      const go = (node, vd) => {
        if (vd.kind) for (const b of Object.keys(R1.BUILDERS)) {
          const mapped = { ...structuredClone(vd), name: b, covered: true, via: "mapping" };
          const out = fold(`build() over ${fname} ${vd.path} mapped to ${b} (40.29)`, () => R1.build(node, mapped, VOCAB, []), null);
          if (out === null) continue;
          emitted.push({ fname, path: vd.path, b, laidOut: !!node.layout });
          const why = threw(() => validateComposition(VOCAB, out));
          if (why) refused.push(`${fname} ${vd.path} → ${b}: ${why}`);
        }
        (vd.children ?? []).forEach((c, i) => go(node.children[i], c));
      };
      go(ir, vt);
    }
    ok(refused.length === 0,
      `40.29: build() emitted ${refused.length} mapped composition(s) the renderer refuses — a required prop present but null passed the closing check. It must return null and keep the rows (#477):\n      ${refused.join("\n      ")}`);
    // POSITIVE CONTROL — the rule must not refuse everything: a laid-out node mapped to stack still emits.
    ok(emitted.some((e) => e.b === "stack" && e.laidOut),
      `40.29: no laid-out node mapped to stack was emitted (${emitted.length} emitted in all) — the closing check now refuses what it should carry`);
    // THE ISSUE'S NAMED PAIR, by path: the person row (no layout) mapped to stack is not emitted, says
    // why, and names what it took with it — the inner stack and the icon it had built are rows, not silence.
    const pIr = fold("convert the instance read (40.29 pair)", () => B1.convert(INSTANCE), null);
    const pV = pIr && fold("recognise it (40.29 pair)", () => R1.recognise(pIr, VOCAB), null);
    const rows = [];
    const pOut = pV ? fold("build() the person row mapped to stack (40.29)", () => R1.build(pIr.children[0], { ...structuredClone(pV.children[0]), name: "stack", covered: true, via: "mapping" }, VOCAB, rows), "threw") : "threw";
    const took = rows.filter((d) => d.slot === "ir.children[0].children").map((d) => d.value);
    ok(pIr?.children?.[0] && !pIr.children[0].layout && pOut === null
      && rows.some((d) => d.kind === "unfillable-required-prop" && d.slot === "stack.direction")
      && rows.some((d) => d.kind === "no-vocabulary-slot" && d.slot === "layout")
      && deep(took) === deep(["stack", "icon"]),
      `40.29: ir.children[0] (the person row, no layout) mapped to stack built ${deep(pOut)} with rows [${rows.map((d) => `${d.kind}:${d.slot}`).join(", ")}] and took [${took.join(", ")}] — expected null, unfillable-required-prop:stack.direction, no-vocabulary-slot:layout, and one row each for the stack and icon it had built`);
  }

  ```
- **PATTERN**: 40.12 (`build-checks.mjs:12592-12641`).
- **IMPORTS**: none new.
- **GOTCHA**: `structuredClone(vd)` before overriding — `v1` and other cases' verdicts must not be mutated. The spread puts `name`/`covered`/`via` last, which is exactly `Object.assign` at `import-run.mjs:180`.
- **GOTCHA**: group 40 must not import `portal/` (its header: "no portal … in the loop") — which is why 43.14 exists.
- **SATISFIES**: AC 2, AC 3, AC 4  ·  **REGENERATES**: none (`tooling/` is in no loc-summary group — `gen-loc-summary --check` ✓ observed; groups are `system/`, root pages, `agent-layer/`)

### 2. ADD case 43.14 to `tooling/build-checks.mjs` (R2)

- **IMPLEMENT**: insert immediately before `    // --- 43.9 NAMES ---` (`:14019`), inside the `if (IR_ && BM)` block where `M`, `INPUTS`, `BLUEPRINT`, `fold`, `ok`, `deep` are in scope:
  ```js
    // --- 43.14 THE OWNER'S MAP, END TO END: a layout-less node mapped to stack is a loss (#477) --------
    // 40.29 mirrors applyMapping's assign; this drives the real one, through runPipeline, over the
    // committed spike C read whose person row carries no layout — the issue's own repro.
    {
      const pipe = fold("runPipeline with ir.children[0] mapped to stack (43.14)", () => M.runPipeline({ text: BLUEPRINT.toString("utf8"), tool: "brilliant", mapping: { parts: { "ir.children[0]": { map: "stack" } } }, ...INPUTS }), null);
      const slots = (pipe?.buildDrops ?? []).map((d) => `${d.kind}:${d.slot}`);
      ok(pipe && pipe.verdict.children[0].via === "mapping" && pipe.compositions.length === 1 && pipe.compositions[0] === null
        && slots.includes("unfillable-required-prop:stack.direction") && slots.includes("no-vocabulary-slot:layout"),
        `43.14: the owner's map of the layout-less person row to stack gave compositions ${deep(pipe?.compositions)} with rows [${slots.join(", ")}] — expected [null] (the view's "not emitted — see drops") and both rows, never a composition the renderer refuses`);
    }

  ```
  (Numbered 43.14 because 43.11–43.13 exist; it sits beside the pipeline cases, not at the end, because `M`/`INPUTS` are scoped to that block.)
- **GOTCHA**: `pipe.verdict.children[0].via === "mapping"` is the proof the real `applyMapping` ran — without it, a `runPipeline` that ignored `mapping` would pass on the unmapped read (which is also `null`, via `list-row.value`).
- **VALIDATE** (Tasks 1+2 together, BEFORE Task 3): `node tooling/build-checks.mjs 2>&1 | grep -E "^    · (40\.29|43\.14)"` → red.
- **REDDENS** — M1, the unfixed line (observed): three lines —
  `40.29: build() emitted 16 mapped composition(s) the renderer refuses …` (6 instance + 10 master paths, every one `→ stack: composition.props.direction: expected string, got object`),
  `40.29: ir.children[0] (the person row, no layout) mapped to stack built {"children":[…` and
  `43.14: the owner's map of the layout-less person row to stack gave compositions [{"children":[…`.
- **SATISFIES**: AC 1, AC 5  ·  **REGENERATES**: none

### 3. UPDATE `import/recognise.mjs:628-631` — the rule and the rows (R1)

- **IMPLEMENT**: replace the four lines quoted in CONTEXT REFERENCES with:
  ```js
    // A required prop that could not be filled — ABSENT, OR PRESENT AND null — means the node was
    // understood and cannot be emitted. The VALUE is read, not the key: BUILDERS.stack writes `direction`
    // from layout.dir unconditionally, so on a layout-less node an owner mapped to stack (#311) the key
    // was there holding null, passed, and reached the renderer as a refusal instead of a loss (#477).
    const missing = requiredOf(entry).filter(([p]) => out.props?.[p] == null);
    if (missing.length) {
      // WHAT THE REFUSAL TAKES WITH IT IS RECORDED. A child built above (or by BUILDERS.list) was
      // emittable on its own and goes nowhere once its parent is refused; without a row it would leave
      // the loss list in silence — ir.mjs invariant 4. One row per emitted child, the child's subtree
      // travelling with it (#477).
      for (const kid of out.children ?? []) drops.push(drop({
        kind: "no-vocabulary-slot", slot: `${verdict.path}.children`, value: kid.name,
        reason: `${kid.name} was built and is not emitted: its parent ${verdict.name} is refused for ${missing.map(([p]) => `${verdict.name}.${p}`).join(", ")}, and everything under it goes with it`,
      }));
      return null;
    }
    return out;
  ```
- **GOTCHA**: `== null` (loose) on purpose — `null` and `undefined`. `0`, `""`, `false` still pass. Observed: `propsFor` never writes null (`recognise.mjs:447`); the only present-but-null required write in `BUILDERS` is `:530`; zero null leaves under any `props` in the six committed import fixtures.
- **GOTCHA**: the slot is `<path>.children`, not an index — `out.children` holds only the children that BUILT (`kept`, and `BUILDERS.list`'s `.filter(Boolean)`), so its index is not the IR's. The child's name is the value; two same-named children give two rows with the same slot, which `checkRecord` accepts (full gate observed green).
- **GOTCHA**: `drop` is already imported (`recognise.mjs:130`, `import { drop, walk } from "./ir.mjs"`) and `no-vocabulary-slot` is in `DROP_CLASS_OF` — a new kind would throw in `drop()`.
- **VALIDATE**:
  ```
  node --input-type=module -e '
  import {readFileSync} from "node:fs";import {runPipeline,loadInputs} from "./portal/lib/import-run.mjs";
  const p=runPipeline({text:readFileSync("import/fixtures/spike-c-instance.blueprint.txt","utf8"),tool:"brilliant",mapping:{parts:{"ir.children[0]":{map:"stack"}}},...loadInputs()});
  console.log(JSON.stringify(p.compositions));p.buildDrops.filter(d=>d.slot.endsWith("].children")).forEach(d=>console.log(d.slot,d.value))'
  ```
  Observed before: `[{…"props":{"direction":null}…}]`. Observed after: `[null]`, then `ir.children[0].children stack` and `ir.children[0].children icon`.
  Then `node tooling/build-checks.mjs; echo exit $?` → exit 0 (observed).
- **REDDENS**:
  - M2, over-refusal — replace `if (missing.length) {` with `if (true) {` → `40.29: no laid-out node mapped to stack was emitted (0 emitted in all) …` (and the named pair, `took []`) (observed).
  - M3, silent loss — replace `for (const kid of out.children ?? [])` with `for (const kid of [])` → only `40.29: ir.children[0] (the person row, no layout) mapped to stack built null with rows [… ] and took [] …` (observed).
  Run M1–M3 once each, record the messages in the report, restore.
- **SATISFIES**: AC 1, AC 3, AC 4  ·  **REGENERATES**: none — observed: `node import/regen-expected.mjs && node tooling/regen-import-records.mjs && git status --short import/` → nothing. The committed reads never refuse a container that had built children (the person row is `list-row`, a leaf; the Figma root's `list` builds no rows because each `list-row` refuses on `value`).

### 4. UPDATE the stale comments in `import/recognise.mjs`

- **IMPLEMENT**:
  - `:484-486` (`stackShape`): replace "is not reachable while the fallback tests for one — and it is exactly what a fallback that stopped testing would produce" with: reachable since #311 — the owner's `map` sends any node to `stack` without the fallback's `ir.layout` test (`portal/lib/import-run.mjs:180`); this row plus `propsFor`'s `unfillable-required-prop` are the record, and `build()`'s closing check (which reads the VALUE) returns null. Keep "Refuse it by name rather than read `null.gap` …" — still why the early return exists.
  - `:551-553` (`build()` header): "an unfillable required prop" → "a required prop absent or null"; add "a refused composition files one row per child it had built".
  - `:536-543` (`BUILDERS.list` header): "What survives a design read of a list is the LOSS LIST, not the rows" stays true; append "— and each row it built is on it by name (#477)".
- **VALIDATE**: `node --check import/recognise.mjs`
- **SATISFIES**: AC 6  ·  **REGENERATES**: none

### 5. UPDATE gate prose — every copy

- **IMPLEMENT**, the same facts in each copy's register:
  - `.claude/references/gates.md:70` (group 40), before the italic *What it cannot reach*: "**40.29 (#477)**: one rule for every builder — every node of both committed reads mapped to every `BUILDERS` name the way `applyMapping` maps it, and `build()` returns null with its rows or a composition `validateComposition` accepts, never one it refuses (on the unfixed line, 16 of 144 pairs — every one `stack` on a layout-less node); a laid-out node mapped to `stack` still emits, as the positive control; and the issue's own pair names the stack and icon it had built as rows." Then the closing clause "whether a built composition RENDERS, which is group 3's `renderComposition`" → "whether a built composition RENDERS in a page, which is group 3's `renderComposition` (40.29 validates every mapped build over these two reads, nothing wider)".
  - The `group("import-chain", …)` string (`build-checks.mjs:13031`): the same sentence; its tail "…group 3 owns renderComposition" gets the same parenthesis.
  - Group 40's section header comment (`build-checks.mjs:~12250-12266`): add 40.29 if it enumerates cases.
  - Group 43: `gates.md`'s group 43 paragraph and the `group("import run", …)` string (`:14195`) — after "THE MAPPING EDITOR on a SYNTHETIC unbound Figma export: …", add "· THE OWNER'S MAP over the committed spike C read (43.14): the layout-less person row mapped to stack through the real applyMapping gives `[null]` with `stack.direction` and `layout` rows (#477)".
- **GOTCHA**: gate prose has three copies per group — `grep -n "43.7\|group 3" .claude/references/gates.md tooling/build-checks.mjs | grep -iv "^.*// ---"` to find them all.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "import-chain|import run"` → both ✓.
- **SATISFIES**: AC 7  ·  **REGENERATES**: none

### 6. RUN the full gate stack

See VALIDATION COMMANDS. **SATISFIES**: AC 8.

---

## TESTING STRATEGY

No suite (CLAUDE.md § Testing). The tests are build-checks cases 40.29 and 43.14.

### Unit Tests

40.29: the sweep (no emitted-and-refused pair over 144), the positive control (a laid-out `stack` emits), the named
pair (null, both reason rows, the two taken-with rows).

### Integration Tests

43.14: the real `applyMapping` → `build()` via `runPipeline` → `[null]` with both rows. Group 43 already accepts
`null` entries in `compositions` (`build-checks.mjs:13953`, `if (c)`).

### Edge Cases

- A required prop present and falsy but valid (`0`, `""`, `false`) — still emits.
- A laid-out node with `layout.dir` absent — no converter produces one (`brilliant.mjs:355`, `figma.mjs:256`, `:349`), but `== null` covers it.
- `list` — already refused for every input (`list.empty`); now its built rows are named. On the synthetic 40.12 list the rows each refuse on `value`, so no rows are added there (40.12 green, observed).

### Proving the checks

| Mutation | Where | Reds (observed) |
|---|---|---|
| M1 key check restored | `recognise.mjs` closing check | 40.29 sweep (16 pairs) + 40.29 named pair + 43.14 |
| M2 refuse every composition | `if (missing.length) {` → `if (true) {` | 40.29 positive control + named pair |
| M3 no taken-with rows | the row loop over `[]` | 40.29 named pair only |

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```
node --check import/recognise.mjs && node --check tooling/build-checks.mjs
```

### Level 2: Unit Tests

```
node tooling/build-checks.mjs; echo exit $?
```
Expect exit 0 (observed on the prototype), `import-chain ✓`, `import-record ✓`, `import run ✓`, `import suggest ✓`.

### Level 3: Integration Tests

Task 3's repro → `[null]` + two `…children` rows. Then the drift checks CI `verify` runs:
```
node import/regen-expected.mjs && node tooling/regen-import-records.mjs && git status --short import/   # nothing
node agent-layer/gen-loc-summary.mjs --check                                                             # ✓ no drift
```

### Level 4: Manual Validation

Portal smoke on an OS-assigned port, killing only your own PID: start it in the background, `curl -s
localhost:<port>/api/health`, `kill $!`. Optional: in the import view, map the spike C person row to `stack` → the
part reads "not emitted — see drops", and the drops list names `stack.direction`, `layout`, and the stack and icon.

### Level 5: Additional Validation

`piv-validate` (CI verify: build-checks · drift-check · token-lint + portal smoke).

### Paid and owner-only steps

None. No agent run, no API call, no owner verdict.

---

## ACCEPTANCE CRITERIA

- [ ] AC 1 — the issue's repro prints `[null]`, and `buildDrops` carries `unfillable-required-prop:stack.direction` and `no-vocabulary-slot:layout`
- [ ] AC 2 — 40.29 asserts, over every node × every builder of both committed reads, that nothing is emitted that the renderer refuses; reds on M1
- [ ] AC 3 — 40.29's positive control: a laid-out node mapped to `stack` still emits; reds on M2
- [ ] AC 4 — a refused composition names each child it had built (`<path>.children` rows); reds on M3
- [ ] AC 5 — 43.14 drives the real `applyMapping` through `runPipeline`; reds on M1
- [ ] AC 6 — `recognise.mjs:484-486`, `:536-543`, `:551-553` and the closing check's comment say what the code does
- [ ] AC 7 — gates.md and both `group()` strings carry 40.29 and 43.14; the "cannot reach … group 3" clause no longer contradicts 40.29
- [ ] AC 8 — `spike-c-instance.expected.json` and group 42's records unmoved; `build-checks.mjs` exit 0

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] M1–M3 run and their messages recorded in the report
- [ ] All validation commands executed successfully
- [ ] Plan, report and review in the same PR; PR body carries `Closes #477`

---

## OPEN QUESTIONS / ASSUMPTIONS

- Assumption: the owner's "address all risks" (2026-09-28) authorises R1's behaviour change — rows for a refused container's built children — rather than only documenting the gap. It moves no committed output.
- Assumption: no up-front refusal in `applyMapping`. "Not emitted — see drops" plus the rows already explains the outcome; a second check there would duplicate `build()`'s.

## NOTES (open canvas)

### Pre-flight (2026-09-28, detached `origin/main` worktree at `c68a4ff`, `tooling/icons` deps installed)

- **Repro on main**: `{"direction":null}` — the bug is live.
- **Baseline**: `build-checks.mjs` exit 0 with icons deps; without them exit 1 on 41.7 only (R3's GOTCHA).
- **Sweep before/after** (40.29's logic, 2 reads × 24 nodes × 6 builders = 144 pairs): main — 35 emitted, **16 refused**, all `stack` on a layout-less node; fixed — 19 emitted, **0 refused**. No second instance of the bug in any other builder.
- **Every code block in this plan, inserted verbatim**: full gate exit 0. M1, M2, M3 each observed red with the messages quoted in Tasks 2–3; restored file diffed clean.
- **Regen**: `regen-expected.mjs` + `regen-import-records.mjs` on the prototype → `git status --short` shows only `recognise.mjs` and `build-checks.mjs`. `gen-loc-summary --check` ✓.
- **Plan changes from pre-flight**: the case became a sweep (the bug is exactly one builder, and the property covers a seventh builder the day it lands); 43.7 was checked as R2's home and rejected (it maps the Figma export, whose root is laid out); R1's rows use `<path>.children` because `out.children` indices are not the IR's; the gates.md "group 3" clause needed reconciling.
- A research agent reported "does not reproduce" — it had read my temporary patch in the scratch worktree. Disregarded; re-verified on a clean tree.

### Why `build()` and not the builder

Fixing `BUILDERS.stack` (omit `direction` when null) fixes one builder; the issue asks for the rule. The closing
check is the one place every builder passes through, and the sweep asserts the property over all of them.

## AMENDMENTS

- 2026-09-28 — owner asked to address all risks. R1: from "documented as the `list` precedent" to "rows for each built child" (Task 3, AC 4, M3). R2: added 43.14 driving the real `applyMapping` (Task 2, AC 5). R3: Task 0 installs icons deps when absent. All re-proven on a clean worktree; no committed output moves.
- 2026-09-28 (implementation) — plan error: Task 0 installs only `tooling/icons` deps, but a fresh worktree also
  needs `tooling/style-dictionary` deps (`drift-check` failed its first run: "Style Dictionary build failed — if
  node_modules is missing …") and `portal` deps for the Level 4 smoke. Task 0 should read:
  `for d in tooling/icons tooling/style-dictionary portal; do [ -d $d/node_modules ] || (cd $d && npm ci); done`.
