# Implementation Report — Floor into the instance: bespoke-prototype step + prototype-slot render + reader-adjust (#89)

**Plan**: `.claude/plans/floor-into-instance-prototype-slot-reader-adjust.md`
**Branch**: `feature/v3-floor-into-instance` (worktree `../ux-factory-wt-89`, cut from `origin/main`)
**Status**: COMPLETE

## Summary
#88's composed view now lands **inside** the private instance instead of behind a link placeholder.
`build-instance.mjs` gains an optional `--compositions <dir>` bespoke-prototype step that **copies**
a pre-recorded `record-composition` output dir (plus `handoff/verdant/vocabulary.json`) into the
deploy dir, stamps a `composition` ref into `INSTANCE_CONFIG`, and gates every copied proposal in
`validateAssembly` through `validateComposition` — the same refusal engine the reader's browser
renders it with. View-side, Station 5 gained a full-width prototype sub-surface that mounts the
SHARED `renderStudy` surface (ask → propose → adjust → refuse) over `agentic-renderer` +
`action-bus`, with no view-time model call. Copy-not-run throughout: no SDK in build-instance.

## Tasks completed
- [1] Parameterize `renderStudy`'s provenance subject → `system/agentic-study.mjs` (UPDATE)
- [2] Existing call site passes `subject: "the Fieldwork fixtures"` → `agentic-ui-study.html` (UPDATE)
- [3] Demo `INSTANCE_CONFIG` gains a `composition` ref (in-repo northwind) → `instance.html` (UPDATE)
- [4] Station 5 restructure + honest framing copy + capability badge → `instance.html` (UPDATE)
- [5] Port the `study-*` workbench CSS (35–76) → `instance.html` `<style>` (UPDATE)
- [6] `renderPrototype()` + `linkCard()` refactor + wire into `init()` → `system/instance.mjs` (UPDATE)
- [7] `--compositions` input + bespoke-prototype copy step → `agent-layer/build-instance.mjs` (UPDATE)
- [8] `stampShell` writes the `composition` block (present only when shipped) → same file (UPDATE)
- [9] `validateAssembly` refs + `validateComposition` gate → same file (UPDATE)
- [10] CLI wiring, usage string, success log → same file (UPDATE)
- [11] Validation + regen + docs → `system/loc-summary.json` (REGENERATED), `CLAUDE.md` (UPDATE)

## Tests added
No unit-test suite exists (CLAUDE.md: "run the surface you touched"). Testing = Node-parse + the
build-instance gate exercised for real + live cross-engine surface exercise.

**Cross-engine functional check** (scratchpad harness, Playwright chromium + firefox + webkit against
`python3 -m http.server`) — `/instance.html`, identical results on all three, **0 console errors**:

| check | result |
|---|---|
| `#instance-prototype[data-prototype]` | `ready` |
| real `.ds-metric-tile`s rendered | 5 (tab 1) / 4 (tab 2) |
| question tabs | 2, both switch |
| tone adjust | tile → `ds-metric-tile is-warn` |
| out-of-vocabulary probe | refuses: `composition[0].props.tone: "urgent" is not in enum [neutral \| warn \| critical]` |
| remove / reset | 5 → 4 → 5 |
| bus log rows | 4 |
| in-slot trace link | absent (by decision) |
| `#instance-links` | 1 card, kicker "Handoff pack" |
| `body[data-instance]` | `ready` |

**Independence (forced failure)** — aborting the composition `index.json` request: prototype
error-cards (`Could not load the composed view — Failed to fetch`), `data-prototype` unset, the
capability badge withdrawn, while `body[data-instance="ready"]` and
`#instance-player[data-trace="ready"]` still set and the handoff card renders. Chains are
genuinely independent.

**All four prototype-slot states served and read** (the check that catches deviation 9):

| state | badge | claim | slot |
|---|---|---|---|
| stamped, **no** `--compositions` | *removed* | "…**No composed view ships inside this instance** — when a prototype exists, it is linked below." | placeholder card |
| stamped, **with** `--compositions` | "Adjusts now · composed at build time" | composed-view claim | 5 tiles, `ready` |
| repo demo | same + the `data-when="demo"` sentence | composed-view claim | 5 tiles, `ready` |
| forced fetch failure | *removed* | — | error card |

0 console errors in every state.

**Regression, `/agentic-ui-study.html`**: provenance line byte-identical —
`"Real run, curated for length: a real build-time agent run over the Fieldwork fixtures, replayable. View the committed trace"`;
6 tiles, 4 tabs, refusal works, 0 console errors.

## Validation results

**Level 1 — syntax**: `node --check` PASS on `system/agentic-study.mjs`, `system/instance.mjs`,
`agent-layer/build-instance.mjs`, `system/agentic-renderer.mjs`.

**Level 2 — pure gates**: `validateComposition importable ✓` (no DOM at import time);
CLI usage prints `--compositions`. PASS.

**Level 3 — build-instance smoke** (`--out` outside the repo, acme fictional fixture):

| run | expected | result |
|---|---|---|
| PASSING (slug-matched dir) | exit 0, stamped, validated | ✓ `build-instance acme ✓ fictional · … · prototype 2 composed views`; `grep -c '"composition"' index.html` → 1; `proto/compositions/acme/` (3 files) + `handoff/verdant/vocabulary.json` present |
| NEGATIVE — slug mismatch | named "referenced asset missing" | ✓ both proposals named; deploy dir discarded |
| NEGATIVE — out-of-vocab proposal (`tone:"urgent"`) | `validateComposition` refusal blocks deploy | ✓ `composed view /proto/compositions/acme/stock-risk-state.json is not renderable — stock-risk-state[0].props.tone: "urgent" is not in enum […]`; dir discarded |
| NEGATIVE — **no** `--compositions` (#43/#44 regression) | still builds, no composition key | ✓ exit 0; `"composition"` count 0; no `proto/` dir; prototype slot falls back to the honest placeholder |

**Serving the stamped deploy dir**: `/` renders 5 tiles, `data-prototype="ready"`, provenance reads
"…a real build-time agent run over **Acme's** data, replayable." No "demo"/"Northwind" leak in the
stamped HTML (the only `fictional` in rendered text is the acme package's own runtime honesty
notice in station #labeling — pre-existing, by design).

**Level 5 — drift-check**: `drift-check ✓ syntax · token-css · annotated-source · loc-summary ·
system-graph · handoff · scenarios · traces` (after regenerating `loc-summary.json`).

**AC #4 (VR)** — verified, not assumed:
- `instance.html` and `agentic-ui-study.html` are NOT in the baseline set (9 pages × 2 packs:
  404 / approach / contact / factory / index / proto-fieldwork / proto-verdant / roundtrip / work).
- No shared CSS touched — every CSS edit is inside `instance.html`'s own `<style>`.
- `loc-summary.json` DID drift (`pages` 3500→3600, `generators` 2000→2100, total 15700→15900) and is
  regenerated in this PR. `approach.html:236` renders the **`runtime`** group only, which is
  **unchanged** (10200 lines / same file count — no new tracked files) → **no approach baseline churn**.
- `annotated-source.json` regenerated: no change.

## Deviations from the plan

1. **`renderLinks` trimmed unconditionally to handoff-only; the prototype slot owns its own
   fallback** (plan Task 6 proposed a `skipPrototype` flag that suppresses the prototype card only
   when a composition is present). Why: Station 5 now carries per-slot headings ("Prototype screen"
   / "Handoff pack"). With the flag approach, an instance built *without* `--compositions` would
   render a prototype link card underneath the "Handoff pack" heading. Extracting a shared
   `linkCard()` helper lets `renderPrototype` render the composition → link → placeholder precedence
   itself, so the headings are honest in every configuration. Same precedence, same card markup.
2. **Ported `agentic-ui-study.html:35–76`, not `28–76`.** Lines 28–34 (`.study-notice`, `.study-cap`)
   are that page's own chrome, not classes `agentic-study.mjs` emits — porting them would ship dead CSS.
3. **Existing Station 5 copy rewritten, not just appended to.** The plan added a paragraph but left
   prose that the change makes false: the lead said "The **hand-crafted** prototype screen" (it is now
   agent-composed at build time, and that line survives Mechanism B into real instances), and the
   demo span said "this demo instance shows the honest placeholders" (it now shows a live composed
   view). Honesty-contract surface, so treated as required. The section comment (which asserted "No
   capability badge claims anything") was updated alongside the added badge.
4. **`.pi-links` → `repeat(auto-fit, minmax(280px, 1fr))`** (was a fixed `1fr 1fr`): the grid now holds
   one card, which would otherwise sit at half width. Shell-only CSS, inside `instance.html`.
5. **Took the plan's OPTIONAL capability badge** — `Adjusts now · composed at build time`, in the same
   visual grammar as Stations 2/3/4; it reinforces "no live model" where the reader is about to interact.
6. **`validateAssembly` step 6b guards per-file rather than on `problems.length`**, so a composition
   refusal is still reported when an unrelated problem exists, while a missing file is reported once
   (as "referenced asset missing") instead of twice.
7. **`buildInstance` returns `views`** (composed-view count) to feed the plan's optional success-log line.
8. **Module/CLI headers + `CLAUDE.md` (3 map lines + the command example) updated** — the plan called
   this out as "if warranted"; the `--compositions` flag and the new prototype slot both change the
   documented contract.
9. **The capability badge + its claim paragraph are WITHDRAWN by JS when no composed view is live.**
   Not in the plan, and it is a defect the plan's own AC #2 implies ("honest placeholder/link retained
   when absent" is only honest if the surrounding claim is too). Authored statically, Station 5 would
   tell a reader of a real instance built *without* `--compositions` "Adjusts now · composed at build
   time … Adjust it below" above an empty placeholder card — a live-capability claim for something
   that does not exist. The demo always ships a composition, so no view-time test would have caught
   it; `validateAssembly` can't either (the words are neither "demo" nor "fictional"). Fixed in
   `renderPrototype`'s synchronous fallback (and on fetch failure) via an `unclaim()` helper against
   `#prototype-capability` / `#prototype-claim`. It could NOT be a static hidden/`data-when` variant:
   `validateAssembly` step 1 fails on any surviving `hidden` attribute, and `data-when`'s axis is
   demo/real, not composition-present/absent.
10. **`_headers` gained `/proto/*` + `/handoff/*` cache rules** — the file carries one rule per copied
   asset dir; the two new dirs now match that pattern. Consistency, not correctness (Pages' defaults
   serve them either way).

## Issues encountered

- **The plan's "AC #4 — N/A, no baseline regen" was too broad.** It reasoned only about shared CSS and
  the 8 (actually 9) VR pages, and missed `loc-summary.json`, which counts lines of git-tracked source
  and gates `main` via the `verify` job's drift-check. It *did* drift. Caught by staging first and
  running `tooling/drift-check.mjs` (per repo memory, `--check` on an unstaged tree is a false
  negative). The runtime group approach renders is unchanged, so no baseline regen followed.
- **Worked in a new worktree** (`../ux-factory-wt-89`, the established `ux-factory-wt-<n>` pattern)
  rather than switching the main working dir: that dir is on `feature/v3-approach-work`, 9 commits
  behind `origin/main`, and holds ~44 staged-but-uncommitted doc files — three of which are STALE
  copies of files `origin/main` now has (`docs/epics/generative-prototyper.{prd,architecture}.md`,
  `.claude/plans/floor-runner-parameterize-composition-spike1.md`), so `git checkout` refused. The
  worktree left that session's state untouched.
- **Fresh worktree needed `cd tooling/style-dictionary && npm install`** before drift-check could run
  (known, per repo memory).
- **Operator contract confirmed by the negative test**: `record-composition` must run with
  `scenario == slug`, or the manifest's absolute proposal paths won't match where build-instance places
  them. Path rewriting stays out of scope; `validateAssembly` fails loudly and names each missing file.
  Logged as an open question in the plan.

## Not done (out of scope, per the plan)
- No `ds-` list-row primitive (#88 deferred it), no ceiling/vision engine (#90), no composition-index
  path rewriting, no in-slot composition-trace links, no change to the privacy posture.
