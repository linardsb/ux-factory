# Feature: Manipulable-parameter count — manifest + generator, rendered on approach

The following plan should be complete, but validate documentation and codebase patterns and task
sanity before implementing. Pay special attention to naming of existing utils and modules — import
from the right files.

## Feature Description

The epic's honesty-compliant capacity metric. A committed manifest (`system/param-manifest.json`)
lists every live-manipulable control on the shipped pages (page, selector, short label). A
build-time generator (`agent-layer/gen-param-count.mjs`) emits `system/param-count.json` with
per-page totals and a site-wide total, drift-checked in CI's `verify` job exactly like
`loc-summary`. approach.html renders the site-wide number from the generated file — a capacity
claim is never hand-written. A convention note in CLAUDE.md makes "ticket adds controls ⇒ same PR
updates the manifest" the standing rule.

## User Story

As a hiring manager verifying the "working tool, not a brochure" claim
I want the site's count of live controls to be a measured, CI-checked number rendered on the page
So that the capacity claim is verifiable, not marketing copy.

## Problem Statement

Epic #164's hypothesis is falsifiable on a manipulable-control count, but the current number (~20)
is a hand count at planning time. Nothing measures it, nothing guards it against drift, and the
site can't honestly render it.

## Solution Statement

Copy the `loc-summary` pattern end to end: committed input → deterministic generator → generated
JSON artifact → drift check in `tooling/drift-check.mjs` (already run by CI `verify`) → JS-rendered
number on approach.html inside the existing `#asrc` success path. The manifest is the one
hand-maintained input; the architecture doc already decided that an omitted control is a
review-catchable gap (convention note), not a silent undercount.

## Out of Scope / Non-Goals

- Not verifying selectors against rendered DOM — most controls are JS-rendered; the manifest is
  declarative and review-guarded (architecture §New pieces, decided).
- Not counting `instance.html` (deep-link-only, private), `agentic-ui-study.html`, or
  `handoff.html` (noindex, outside the VR 10) — scope is the 10 shipped pages + chrome. Record the
  exclusion in the manifest's `$description`.
- Not amending the epic's ≥40 target — the measured baseline will exceed the ~20 estimate (see
  OPEN QUESTIONS); surface it to the owner, don't silently rewrite the epic.
- Not registering in `agent-layer/build.mjs` — `gen-loc-summary` isn't either; this is a
  repo-self-contained generator, drift-check is its harness.
- No rounding — the count is small and every change is a deliberate manifest edit, so exact
  numbers don't churn (unlike loc's nearest-100).

## Feature Metadata

**Feature Type**: New Capability · **Estimated Complexity**: Low-Medium
**Primary Systems Affected**: agent-layer generators, tooling/drift-check, approach.html, CLAUDE.md, VR baselines (approach ×2)
**Dependencies**: none (node:fs only)

## Related Work

**Implements**: linardsb/ux-factory#167 (PR must carry `Closes #167` in the BODY)
**Epic**: #164 — `docs/epics/prototyping-feel-uplift.prd.md` + `.architecture.md` (§New pieces, param-count row — inherited, not re-decided)

**Back-references**: `agent-layer/gen-loc-summary.mjs` is the pattern source (not a plan, but the design authority here).
**Forward-references**: #174 (Wave 3 Approach) re-renders the number after new controls land; every wave ticket appends manifest entries.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ BEFORE IMPLEMENTING

- `agent-layer/gen-loc-summary.mjs` (all 79 lines) — Why: the exact pattern to mirror — ROOT
  resolution from `import.meta.url` (never cwd), `{check:true} → {drifted:[]}` contract,
  deterministic JSON + trailing newline, `pathToFileURL` standalone guard (repo path contains a
  space — the naive `file://${argv[1]}` comparison never matches, see its lines 69-71), the
  `✓`/`✗` console lines.
- `tooling/drift-check.mjs` (lines 13-21 imports, 58-65 `checkLocSummary`, 105-120 main) — Why:
  where the new check registers; mirror `checkLocSummary` exactly and extend the final `✓` log line.
- `approach.html` (lines 156-171 the `#asrc` block + `#loc-proof`, lines 219-257 the module
  script) — Why: the render seam. The param number joins the existing `Promise.all` and renders
  BEFORE `data-asrc="ready"` is set — that's what makes VR capture it deterministically
  (`visual.spec.mjs:35` waits on `#asrc[data-asrc="ready"]`).
- `system/loc-summary.json` — Why: the artifact shape to echo (`$description` self-documenting
  header, groups, total).
- `system/motion.mjs` (lines 45-56 `countUpOnVisible`) — Why: the number spans count up into view;
  writes the final measured string verbatim, instant under reduced motion.
- `docs/epics/prototyping-feel-uplift.architecture.md` (§New pieces param-count row, §Constraints)
  — Why: the inherited decisions (manifest fields, review-catchable-omission stance, honesty rule).
- `CLAUDE.md` (architecture map around `loc-summary.json`; "## Where new code goes" list) — Why:
  both edit sites for the convention note.

### New Files to Create

- `system/param-manifest.json` — committed, hand-maintained manifest (the ONE hand-written input)
- `agent-layer/gen-param-count.mjs` — generator, `genParamCount({check})`, standalone-runnable
- `system/param-count.json` — GENERATED artifact (committed, never hand-edited)

### Patterns to Follow

**File header convention** — generator opens with a comment citing the governing doc:
`// gen-param-count.mjs — the measured count of live-manipulable controls (epic #164 ticket #167; docs/epics/prototyping-feel-uplift.architecture.md §New pieces). ...`

**Check-mode contract** (from `gen-loc-summary.mjs:60-66`): build the output string in memory;
`check:true` compares against disk and returns `{ drifted: [...] }` without writing; otherwise
`writeFileSync` and return `{ drifted: [] }`.

**Error convention**: throw plain `Error` naming the offending path/entry
(`param-count: manifest entry 3 ("/build") missing "selector" — fix system/param-manifest.json`).

**Determinism**: no timestamps, stable ordering (emit pages in manifest order or sorted — pick
sorted-with-chrome-first and keep it fixed), `JSON.stringify(..., null, 2) + "\n"`.

---

## IMPLEMENTATION PLAN

### Phase 1: Manifest (the seed inventory)

**CREATE `system/param-manifest.json`.**

Counting rules — write them INTO the manifest's `$description` so the number is auditable:

- **Include**: any element the reader operates (click / drag / type / key) that runs behaviour
  beyond following a hyperlink — inputs, radios, checkboxes, selects, action buttons (copy /
  download / share included), drop zones, editable fields, steppable players, focusable graph
  nodes, tab switchers. Conditional controls (appear after a visitor action) count.
- **Exclude**: plain `<a>` navigation, `<details>/<summary>` content disclosures, glossary
  hover/focus bubbles (passive reading aids), inert specimens with no visible change, the injected
  chrome nav.
- **Granularity**: one entry = one distinct control per page. A radiogroup = 1. A per-item verb
  (e.g. "rename place", present once per board place) = 1. The dock cluster is listed ONCE under
  the pseudo-page `"chrome"` (it mounts on 8 of the 10 pages; per-page listing would inflate).
- **Scope**: the 10 VR-gated shipped pages (`visual.spec.mjs:17-68`) + `"chrome"`.

Entry shape: `{ "page": "/build", "selector": "[data-build-drop]", "label": "token-export drop zone" }`
(optionally `"note"` for conditionals). Group entries as a flat sorted array — the generator does
the per-page totalling.

**Seed inventory** (verified against source 2026-07-30; selectors quoted from what the JS actually
renders — spot-check any you touch):

- **chrome** (system/dock.mjs): pack switcher radiogroup (`input[name="pack"]`, dock.mjs:145-185);
  dock toggle (`.dock-toggle`); copy tokens (`.dock-copy`); reset (`.dock-reset`); restore,
  conditional (`.dock-restore`). → 5
- **/** (index.html): brand colour input `[data-brand-color]`; brand name `[data-brand-name]`;
  wear checkbox `[data-brand-wear]`; brand reset `[data-brand-reset]`; import drop zone
  `[data-import-drop]` (+ its `[data-import-file]` input = same control); report "wear it"
  (`.brand-import-report .btn-primary`); report download (`.brand-import-report .btn-secondary`);
  accent-swatch picker `.brand-import-swatch` (conditional); peak quadrant guess
  `.peak-ethics-choice` (4 buttons = 1 group); peak status select `.peak-adjust-select`; intake
  wizard radiogroups ×3 (`input[name="fw-density"]`, `fw-rewardType`, `fw-frequency`); wizard nav
  (`#factory-wizard .fw-footer button`); close copy-link (`.close-share-row .btn-secondary`);
  close copy-tokens (`.close-tokens .btn-ghost`, conditional). → ~16
- **/approach**: derive probe colour input `#asrc-probe-color`. → 1
- **/factory**: evidence tabs (`.ev-tab`, 3 = 1 switcher); trace player controls
  (`#agents-player .trace-controls button` — Prev/Next/Show all/Play = 1 player); graph nodes
  (`#system-graph .sg-node[tabindex="0"]` = 1). → 3
- **/roundtrip**: trace player (`#roundtrip-player .trace-controls button`). → 1
- **/work**: care-task checkbox specimens (`[data-lib] vd-care-task-row`, real role=checkbox). → 1
- **/build**: Act 0 — drop zone `[data-build-drop]`; colour `[data-build-color]`; derive button
  `[data-build-derive]`; reset `[data-build-reset]`; swatch picker (conditional); Act-0 download
  (`[data-build-keep-actions] button`, conditional). The 10 question radiogroups
  (`input[name="bx-q-trigger"]` … `bx-q-nogos`) = 10 entries. Wizard nav ×2
  (`[data-build-wizard] .bx-q-footer button`). Breadboard verbs = 10 entries: add place
  `[data-bb-add-place]`; re-draft (`.bx-bb-bar .bx-bb-btn`); cancel connect; rename place
  (`[data-place] .bx-bb-name`); remove place; add affordance (`[data-place] .bx-bb-add-aff`);
  rename affordance (`[data-aff] .bx-bb-chip-name`); connect (`[data-aff] .bx-bb-connect`);
  remove affordance; connect-here target (`[data-place] [data-bb-target]`). Keep rail — 4
  downloads + share-link copy (`[data-build-keep] .bx-keep-share .btn-primary`) = 5. → ~33
- **/proto/verdant**: task-row checkboxes (`.vd-care-task-row[data-task-id]`); "Log care"
  `#log-care`. → 2
- **/proto/fieldwork**, **/contact**, **/404**: 0 page-own controls (dock is chrome).

Expected seed total: **~62** (exact number falls out of the final entry list — commit whatever it
measures; do NOT tune entries to hit a target).

### Phase 2: Generator + drift check

**Depends on:** Phase 1.

`genParamCount({check})`: read + JSON.parse the manifest (error names the path), validate every
entry (`page`/`selector`/`label` non-empty strings; duplicate `page+selector` throws naming both
indices), total per page + site-wide, emit `system/param-count.json`:

```json
{
  "$description": "GENERATED by agent-layer/gen-param-count.mjs — do not edit. Counted from system/param-manifest.json (one entry per live-manipulable control). Regenerate: node agent-layer/gen-param-count.mjs",
  "pages": [ { "page": "chrome", "controls": 5 }, { "page": "/", "controls": 16 } ],
  "total": 62
}
```

Register in `tooling/drift-check.mjs`: import, `checkParamCount()` mirroring lines 58-65, call it
after `checkLocSummary()` in main, append ` · param-count` to the final `✓` string (line 115).

### Phase 3: approach.html render

**Depends on:** Phase 2.

Add `grab("/system/param-count.json")` to the existing `Promise.all` (approach.html:230), add a
hidden `<p class="loc-proof" id="param-proof" hidden>` sibling after `#loc-proof` (line 170, with
a matching provenance comment), render the total via a span + `countUpOnVisible`, unhide — all
BEFORE `wrap.dataset.asrc = "ready"`. A fetch failure keeps the whole exhibit hidden (existing
`.catch(() => {})` discipline: silent for visitors, loud for CI via waitReady timeout).

Copy (short, human, honesty-framed — keep to one sentence, e.g.): "N of the things on these pages
are live controls — inputs, switches and editable surfaces you can operate, counted from a
committed manifest and checked in CI." Run the line through `/no-ai-slop` sensibilities; no
em-dash chains, no "delve".

### Phase 4: CLAUDE.md convention + loc-summary cascade + VR baselines

**Depends on:** Phase 3 (baselines capture the rendered number).

- CLAUDE.md: architecture-map lines for `param-manifest.json` + `param-count.json` beside
  `loc-summary.json`; a "Where new code goes" bullet: **New live-manipulable control** → add its
  `system/param-manifest.json` entry in the same PR + regenerate
  `node agent-layer/gen-param-count.mjs` (CI verify drift-checks it).
- loc-summary cascade: `gen-param-count.mjs` is a new tracked `agent-layer/*.mjs` → the generators
  group changes. `git add` ALL new/edited files FIRST (gen-loc reads index blobs, not the working
  tree — memory), then `node agent-layer/gen-loc-summary.mjs`, commit the regenerated
  `system/loc-summary.json`. approach renders only the runtime group, so this alone doesn't churn
  approach baselines — the new `#param-proof` line does.
- VR baselines: regen exactly the two approach baselines in the same PR. From a CLEAN detached
  worktree under `/Users` (not /private/tmp — Docker file sharing):
  `cd tooling/visual-regression && npm run update:docker`. Expect churn ONLY on
  `approach-neutral.png` + `approach-saulera.png`; if the diff is sub-perceptual and the runner
  skips a rewrite, `rm` the PNG to force it (memory). Known flake: approach's countUp rAF vs
  `retries:0` — a "two consecutive stable screenshots" failure that moves between packs across
  runs is the flake, not a regression.

---

## STEP-BY-STEP TASKS

### CREATE system/param-manifest.json

- **IMPLEMENT**: flat entry array + `$description` carrying the counting rules verbatim (Phase 1);
  seed every control from the Phase-1 inventory, spot-checking each selector against its source
  module before writing it.
- **GOTCHA**: don't tune the list toward any target number; conditionals get a `note`.
- **VALIDATE**: `node -e "const m=require('./system/param-manifest.json'); console.log(m.entries.length)"` (adjust to chosen shape)
- **SATISFIES**: AC #4 (measured baseline)

### CREATE agent-layer/gen-param-count.mjs

- **IMPLEMENT**: header comment citing epic #164 ticket #167 + architecture §New pieces; ROOT from
  `import.meta.url`; `genParamCount({check=false})` per Phase 2; standalone block with
  `pathToFileURL` guard printing `param count ✓  <total> controls (<DEST>)` /
  `--check` drift error naming the regenerate command.
- **PATTERN**: `agent-layer/gen-loc-summary.mjs:17-79` — mirror structure line for line where it fits.
- **IMPORTS**: `node:fs` (readFileSync, writeFileSync), `node:path`, `node:url`. No child_process needed.
- **GOTCHA**: deterministic ordering + trailing newline or CI drift-checks red forever.
- **VALIDATE**: `node agent-layer/gen-param-count.mjs && node agent-layer/gen-param-count.mjs --check` (✓ both; second run byte-identical)
- **SATISFIES**: AC #1

### UPDATE tooling/drift-check.mjs

- **IMPLEMENT**: import `genParamCount`; add `checkParamCount()` (mirror lines 58-65); call in
  main after `checkLocSummary()`; extend the `✓` summary string.
- **VALIDATE**: `node tooling/drift-check.mjs` (green); then the mutation proof — memory "the
  check that cannot fail": temporarily delete one manifest entry, `node tooling/drift-check.mjs`
  must go RED with the param-count message, restore, regen, green again.
- **SATISFIES**: AC #1 (drift-checked; a manifest edit changes the count)

### UPDATE approach.html

- **IMPLEMENT**: Phase 3 — third `grab()` in the Promise.all, `#param-proof` hidden `<p>` +
  provenance comment, span + `countUpOnVisible`, render before `data-asrc="ready"`.
- **PATTERN**: the `#loc-proof` block, approach.html:168-170 + 237-251.
- **GOTCHA**: render inside the same `.then` — a separate fetch chain would race the VR ready flag.
- **VALIDATE**: `npx serve .` → open `/approach.html` → the sentence renders with the measured
  number; DevTools: `#asrc[data-asrc="ready"]` present.
- **SATISFIES**: AC #2

### UPDATE CLAUDE.md

- **IMPLEMENT**: two architecture-map lines + the "Where new code goes" convention bullet (Phase 4).
- **GOTCHA**: surgical — match the map's existing style (lowercase annotations, ticket refs).
- **VALIDATE**: read the diff; nothing else touched.
- **SATISFIES**: ticket scope bullet 4

### REGENERATE system/loc-summary.json

- **IMPLEMENT**: `git add` all new/changed files, then `node agent-layer/gen-loc-summary.mjs`.
- **GOTCHA**: staging FIRST is load-bearing (index blobs); running before `git add` yields a false
  no-change.
- **VALIDATE**: `node tooling/drift-check.mjs` green on the staged tree.
- **SATISFIES**: keeps AC #1's CI byte-identical claim true for the whole PR

### REGENERATE approach VR baselines (×2)

- **IMPLEMENT**: commit everything, then from a clean detached worktree under `/Users`:
  `cd tooling/visual-regression && npm run update:docker`; copy back / commit only
  `approach-neutral.png` + `approach-saulera.png`.
- **GOTCHA**: update:docker screenshots the working tree — it must be clean; sub-perceptual skip →
  `rm` the PNG first; countUp flake ≠ regression.
- **VALIDATE**: `git status` shows exactly the two approach PNGs changed; after commit,
  `gh pr checks` (visual job) once the PR is up — local Docker pass ≠ CI green.
- **SATISFIES**: AC #3

---

## TESTING STRATEGY

No suite in this repo — "done" = run the surface touched (CLAUDE.md). The load-bearing tests:

- **Generator determinism**: run twice, `git diff --stat` empty the second time.
- **Mutation test** (the check must be able to fail): remove a manifest entry → generator total
  changes AND drift-check goes red against the stale artifact; restore + regen → green.
- **Validation errors**: feed a manifest entry missing `label` → the thrown message names the
  entry and the file.
- **Edge cases**: duplicate `page+selector` throws; empty manifest array throws (a zero-control
  site is a generator bug, mirror loc-summary's empty-group throw); non-array / malformed JSON
  throws naming the path.
- **Render path**: served page shows the number; blocking `param-count.json` in DevTools keeps the
  exhibit hidden (visitor-silent degrade intact).

## VALIDATION COMMANDS

1. `node --check agent-layer/gen-param-count.mjs`
2. `node agent-layer/gen-param-count.mjs` → `param count ✓ …`
3. `node agent-layer/gen-param-count.mjs --check` → ✓ no drift
4. `node tooling/drift-check.mjs` → green, summary line includes `param-count`
5. Mutation proof (see Testing Strategy) — red then green
6. `npx serve .` → manual check on `/approach.html`
7. `node agent-layer/gen-loc-summary.mjs` after staging → drift-check still green
8. VR: `npm run update:docker` in tooling/visual-regression (clean worktree) → only approach ×2 churn

## ACCEPTANCE CRITERIA (from #167)

- [ ] AC1 — generator prints ✓; regeneration byte-identical in CI (drift-check); a manifest edit changes the count
- [ ] AC2 — approach.html renders the number from param-count.json, JS-rendered like loc's numbers
- [ ] AC3 — the two approach baselines regenerated in the same PR
- [ ] AC4 — seeded baseline count committed (measured, not estimated)
- [ ] Convention note in CLAUDE.md ("Where new code goes")
- [ ] PR body carries `Closes #167`

## COMPLETION CHECKLIST

- [ ] All tasks in order, each validation run at its step
- [ ] loc-summary regenerated after staging (cascade)
- [ ] `git status` clean of unexpected churn; only intended files in the PR
- [ ] Plan + report + review artifacts committed in the same PR (`.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/`)

## OPEN QUESTIONS / ASSUMPTIONS

1. **The measured baseline will contradict the epic's numbers — surface, don't hide.** The
   verified inventory yields ~62 controls under the bright-line rule above (the "~20" hand count
   apparently counted clusters). That means the epic's falsifiable target "≥40 from ~20" is
   already met before any wave ships, which breaks the metric as written. Recommendation: commit
   the honest number, then amend the epic PRD's metric to a coverage form (e.g. "every one of the
   10 pages carries ≥N page-own controls" — today 4 pages have zero) and/or a relative target
   (baseline ×1.5). Owner decision; flag on the epic issue when the PR opens.
2. **Counting methodology is a judgment call** (radiogroup=1, dock=chrome-once, downloads/copies
   included, disclosures/glossary excluded). It's recorded in the manifest `$description` so it's
   auditable and revisable; changing it later is one manifest edit + regen.
3. Assumes `verify.yml` needs no change (it already runs `tooling/drift-check.mjs` on Node 24) — verified.
4. Assumes exact (unrounded) counts are wanted — each change is a deliberate edit, no churn risk.

## NOTES (open canvas)

- Full verified control inventory with source line references lives in the planning session's
  research pass (2026-07-30); the Phase-1 seed list is its distillation. Notable exclusions with
  reasons: factory's 6 round-trip accordions + per-step response disclosures (`<details>`
  content), approach's 7 glossary `dfn` terms (passive reading aids), work's plant-card specimens
  (inert — `preventDefault`, no visible change), verdant's plant-card anchors (plain links),
  fieldwork (zero listeners — pure display).
- Rejected alternative: counting live DOM at capture time (VR-run counter). More "measured", but
  couples the metric to a browser run, misses conditional controls, and breaks the loc-summary
  symmetry; the architecture doc already decided manifest+review.
- Rejected: per-page dock repetition (would add ~30 phantom controls and drown page-own signal).

## AMENDMENTS

(none yet)
