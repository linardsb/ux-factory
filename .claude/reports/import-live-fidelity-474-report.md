# Implementation Report — live import fidelity: render the candidate and measure ΔE-MIN (#474)

**Plan**: `.claude/plans/import-live-fidelity-474.md`   **Branch**: `feature/import-live-fidelity-474` (worktree `../wt-474b`)
**Base**: `1b43cee` (origin/main at start) → `9398860` (origin/main merged at `aa926a9`: #475, #481)   **Status**: COMPLETE

## Summary

The owner can press "Measure fidelity" on a Brilliant import in the canvas view. The route spawns
`tooling/measure-render.mjs`, which renders the importer's first composition under the neutral pack in headless
Chromium at the scale the reference was exported at. `portal/lib/import-measure.mjs` flattens both PNGs over white,
crops the candidate to the reference's size and measures it with `fidelity.mjs`'s rung 6. It then rebuilds the
record through `buildRecord` and writes the candidate PNG, a `measure` transcript line, the record and its markdown.
A mapping edit returns the record to `missing` and deletes the candidate. The owner's live pair is committed verbatim
under `import/fixtures/measure-live/`: faithful worst ΔE **1.3379**, wrong **29.7584**, against THRESHOLD 5.0
(AC 10 met). 43.16 replays the pair in CI. I12 passes on all three page engines; the candidate is always rendered by Chromium
(`measure-render.mjs` launches it), and each run measured 1.3379.

## Tasks completed

- Task 1 → `import/fidelity.mjs` (UPDATE): opt-in `{ over }` on `decodePng` and `measure`, checked on entry.
- Task 2 → `tooling/build-checks.mjs` (UPDATE): 42.15, plus a top-level SYNTHETIC `synthPng` encoder shared with 43.16.
- Task 3, Task 6 → `portal/lib/import-measure.mjs` (CREATE).
- Task 4 → `tooling/measure-render.mjs` (CREATE).
- Task 5 → `tooling/build-checks.mjs` 43.1 (UPDATE): pins `import-measure.mjs`'s import graph.
- Task 7 → `portal/lib/import-run.mjs` (UPDATE): `EXPORT_SCALE = 1` on the read's export; `underLock`, `sortKeys` and
  `jsonText` exported; `editMapping` deletes the candidate; `importView`'s label and `measurable`; invariant 5.
  `tooling/fake-brilliant-bridge.mjs` header: the fake does not model `scale`.
- Task 8 → `portal/server.mjs` (UPDATE): `POST /api/canvas/import/measure`.
- Task 9 → `portal/public/canvas-import.mjs` (UPDATE): the button, the verdict line, and the measurement's refusal and
  status in the view.
- Task 10 → the prose for 42.15, 43.1, 43.16 (SYNTHETIC half) and I12/I12b in all three copies: the `group()`
  strings, the group comment blocks and `gates.md` (canvas-journey: its header and success line).
- Task 12 (SYNTHETIC half) → `tooling/build-checks.mjs` 43.16.
- Task 13 → `tooling/canvas-journey.mjs` (UPDATE): `fp-measure` seed, I12, I12b, `withPortal`'s `extraEnv`.
- Task 11 → `import/fixtures/measure-live/` (CREATE): the owner drew the frames in Brilliant and pressed Import
  selection and Measure fidelity through a portal on this branch, on a scratch `JOBS_DIR`, with Jev suggestions on
  (the owner's call). The implementer copied the files verbatim and wrote the README.
- Task 12 (the replay) → `tooling/build-checks.mjs` 43.16 part 0.

## Tests added

- **42.15**: the committed live export decodes to 790×402 over white and still throws without `over`. A SYNTHETIC
  2×1 RGBA PNG composites to 255,255,255 and 178,127,127. A bad `over` is refused on RGBA and RGB input. `measure()`
  called with three arguments is unmoved.
- **43.1**: `import-measure.mjs` imports in CI. Its specifiers are pinned, with no `playwright` and no dynamic import.
- **43.16 (SYNTHETIC half)**:
  - faithful < THRESHOLD and wrong ≥ THRESHOLD; `checkRecord` passes; the verdict is derived; the render job is
    one stack at 320×82, scale 1; the PNG and exactly one `measure` line are written; the markdown carries the verdict.
  - an edit returns the record to `missing` and deletes the PNG.
  - these refusals each write nothing: no-reference, nothing-built, unknown-scale ×2, render-failed, no-renderer,
    render-timeout and stale.
  - O3b throws and writes nothing; busy under an import's lock.
  - a 319×81 reference is rendered at `ceil` and cropped.
  - the real child's no-renderer and timeout paths.
  - the pure helpers.
- **canvas-journey I12/I12b** — see Proving the checks.

## Task 11 — the decision rule (observed)

| Frame | worst ΔE (region) | root | title | subtitle | verdict |
|---|---|---|---|---|---|
| faithful | **1.3379** (text:Amara Okafor) | 0.7267 | 1.3379 | 1.0001 | red (WCAG 11/12, Q1) |
| wrong | **29.7584** (text:Amara Okafor) | — | 29.7584 | — | red |

faithful < 5.0 and wrong ≥ 5.0 → AC 10 met. The proxy predicted ≈ 2.3 and ≈ 30. The first attempt was imported but
never measured, and was discarded. Brilliant sent `pad(16:$spacing.lg)`, which the importer maps BY ROLE to the
contract's 24 px `--spacing-lg`. It also sent an unbound gap of 10, and the subtitle's grey as a text-range colour
over a black fill. The recipe changed to padding `spacing.sm` (8 in both systems), a typed gap of 4 (exact snap to
`--spacing-xs`), and layer fills. That attempt is kept in the session scratchpad only.

## Proving the checks

| Check | Mutation (restored after) | Red observed | Positive control |
|---|---|---|---|
| 42.15 | composite `Math.round` → `Math.floor` | `[101,0,0,128] over #ffffff decoded to 177,127,127 — expected 178,127,127` | clean tree `build import-record ✓` |
| 42.15 | `a` and `255 − a` swapped | `a fully transparent pixel … decoded to 0,0,0` (+ `178,128,128`) | 〃 |
| 42.15 | `over` branch deleted | `the committed live export flattened … decoded to nothing — expected 790x402` | 〃 |
| 42.15 | `over` check moved into the RGBA branch | `over: [256,0,0] on S3's RGB ref.png was not refused naming over` (and `"white"`) | 〃 |
| 42.15 | default `over = [255,255,255]` | `the committed live export decoded WITHOUT { over } — the default must still throw` | 〃 |
| 43.1 | `const pw = await import("@playwright/test")` in import-measure | `43.1: … imports dynamically or names playwright … (D1)` | clean `build import run ✓` |
| 43.1 | `import { withRunLock } from "./builder.mjs"` | `43.1: … imports [..., "./builder.mjs"] — node: built-ins, ../../import/*.mjs, ./import-run.mjs and ./env.mjs only` | 〃 |
| 43.16 | reference decoded without `{ over: BACKDROP }` | `measureImport(SYNTHETIC faithful) threw …: png: reference: alpha 0 at pixel 0 is not opaque` | SYNTHETIC faithful < 5 and wrong ≥ 5 in the same run |
| 43.16 | `cropTo` removed | `measureImport over a SYNTHETIC 319x81 reference threw …: image sizes differ — reference 319x81, candidate 320x82` | 〃 |
| 43.16 | `scaleOf` always 2 | `SYNTHETIC faithful measured {unknown-scale … 320 × 2 = 640}` (the plan predicted a `cropTo` throw — see AMENDMENTS) | 〃 |
| 43.16 | `editMapping`'s candidate `rmSync` removed | `after an edit, imports/i1.candidate.png is still on disk` | 〃 |
| 43.16 | stale re-read skipped (`if (false)`) | `a stale measurement answered "red" and wrote imports/i1.json` | 〃 |
| 43.16 | exit 3 not mapped to no-renderer | `the renderer child with no Playwright answered {render-failed…}` | 〃 |
| 43.16 | a zero-area box not pushed to `skipped` | `regionsFromBoxes answered {… skipped:[]}` | 〃 |
| 43.16 replay | `want.worst` read from the OTHER frame's measure.json | `the owner's faithful frame re-measured worst {…1.3379} — the committed faithful.measure.json says {…29.7584}` (+ both THRESHOLD lines, + wrong's pair) | faithful 1.3379 < 5 and wrong 29.7584 ≥ 5 re-measured in CI |
| 43.16 replay | reference decoded without `{ over }` | `measureImport(the owner's faithful frame) threw …: alpha 0 at pixel 0 is not opaque` | 〃 |
| 43.16 replay | candidate decoded without `{ over }` and uncropped | **no red on the replay** — Chromium writes RGB, so the candidate flatten is a no-op on this pair. It is kept for an RGBA candidate; the SYNTHETIC 319×81 case still reds on the crop | recorded as a check no mutation of this pair can redden |
| I12 | `spawnRender` pointed at `tooling/no-such-render.mjs` | `✗ I12 · the view left missing … The renderer failed.`, `✗ … candidate.png … missing`, `✗ I12b …` — the refusal's words, not a timeout | clean run: I12 5/5, I12b 2/2 ✓ |

Driver proof: the first stale mutation (`false && a || b || c`) did not take effect. Operator precedence kept `b` and
`c` live, and they still caught the change. It was redone as `if (false)` and then red. I12 has been run only against
a SYNTHETIC stand-in for the owner's frame (reference = the renderer's own output + 1 byte), which was deleted and
never committed. It proves the wiring from the page through the spawn to the record. It does not prove fidelity.

## Validation results

- `node tooling/build-checks.mjs` → `build ✓  all 46 groups pass` (observed; after `npm ci` in `tooling/icons`).
- `node tooling/regen-import-records.mjs --check` → `import records ✓  … 4 files, 187933 bytes, no drift`
  (observed, before and after Task 1).
- `node tooling/drift-check.mjs` → `drift-check ✓  syntax · token-css · … · group-count` (observed; after `npm ci` in
  `tooling/style-dictionary`).
- Task 1 VALIDATE → `790 402` then `default: png: x: alpha 215 at pixel 316789 is not opaque …` (observed).
- Task 3 VALIDATE → the expected regions, `{"scale":2}`, `{"scale":1}`, `unknown-scale`, `3 1 9` (observed).
- Task 4 VALIDATE → `chromium 640 140 2`, `chromium 320 70 2`, exit 3 with `UXF_MEASURE_VRDIR=/nonexistent`;
  a refused composition and a fractional width each exit 1, naming the reason (observed).
- Task 8 smoke (a free port, killed by PID) → `/api/health` ok; the measure route with name `../x` →
  `{"error":"name \"../x\" is not a component name"} 400` (observed).
- `node tooling/canvas-journey.mjs chromium`, SYNTHETIC stand-in → `101 passed, 1 failed`. The failure is I4, which
  fails identically with every change stashed (`94 passed, 1 failed`, base `1b43cee`) (observed).
- `node tooling/canvas-journey.mjs all`, real fixture → chromium `101 passed, 1 failed`, firefox `100/1`, webkit
  `100/1`. The failure is I4 in each engine; I12 and I12b are ✓ in all three, and each run's render (Chromium
  every time) measured `1.3379 at text:Amara Okafor` (observed).
- Final tree (`fb179c4` + report): build-checks `all 46 groups pass`, records `no drift`, drift-check ✓,
  `gen-loc-summary --check` `3 groups — no drift` after commit (observed).
- CodeQL 2.27.0 locally, with the repo's `codeql-config.yml` and the code-scanning suite: **0 results**.
  `measure-render.mjs`, `import-measure.mjs` and `canvas-import.mjs` are in the extraction log (observed).

- **After merging origin/main at `9398860` (#475, #481), observed:**
  - `build-checks` → `all 46 groups pass`, 0 ✗.
  - Import records → no drift; `drift-check` ✓; loc summary → no drift.
  - `canvas-journey all` → chromium 125/0, firefox 124/0, webkit 124/0, with I12's render (Chromium every time) reading 1.3379
    in each run.
  - #475 had taken case id 43.15, so this ticket's case is **43.16**.

## Not run

- **Q1**, the neutral-pack contrast fix: tracked as #482. Until it lands, every live verdict reads `red`.
- None beyond Q1. I4 was fixed on main by #481 (issue #480), and after the merge the journey is green on all three engines.

## Deviations from the plan

- **Task 3/6 `scaleOf`'s root width (plan error)**: read as `layout.size.w ?? style.size.w`. A node with no `al()`
  keeps its size on `style` (`import/brilliant.mjs:485-489`).
- **Task 12 split**: the SYNTHETIC half landed before Task 11, on SYNTHETIC measurable imports built with `synthPng`.
  The plan had driven the refusal battery off the owner's faithful replay. The replay itself still follows Task 11.
  The battery no longer depends on the owner's fixture.
- **Task 11 recipe (plan error)**: text sizes are bound to Brilliant font-size tokens; padding is `spacing.sm` (8),
  not 16; the gap of 4 is typed (Brilliant's gap field has no token); line height is a multiple (1.6 → Brilliant's
  1.63 token, 1.5); the subtitle is 12 px (`font.size.xs`), not 13; and Jev suggestions were on (the owner's call).
  See AMENDMENTS and the fixture README.
- **Task 8 smoke (plan error)**: `PORT=0` meets the origin guard as a 403; a chosen free port is used instead.
- **`importView`'s label** reads `threshold ${THRESHOLD}` (imported from `fidelity.mjs`), not a literal `5`, so the
  words cannot drift from the constant.
- **`cropTo(img, w, h, scale = 1)`**: the plan's "more than `scale` px larger" needs the scale, so it is a fourth
  argument.

## Assumptions carried

- `EXPORT_SCALE = 1` (D4). A missing `scale` on an export line means `LEGACY_SCALE` 2 (D4, R7).
- `BACKDROP` `#ffffff` on both sides (D5).
- The renderer is Chromium, whatever engine the page runs in (Non-goals).

## Additions beyond the plan

- **`spawnRender`'s detail line** prefers the child's own `measure-render:` line or the Node `Error` line. The raw last
  stderr line was Node's `Node.js v20.20.2` trailer, which names nothing.
- **`edit()` in canvas-import.mjs** clears the measurement's status and refusal, so a stale "Measured: …" line does
  not survive the edit that invalidated it.
- **`measure-render.mjs` checks the job by hand**: whole CSS px in 1–4000, scale ∈ {1,2,3}, `#rrggbb`. It
  `decodeURIComponent`s the path and refuses one outside the repo before any read.

## Issues encountered

- **I4 fails on base `1b43cee` without this ticket** ("the view's drop list grew by exactly one 11 → 11"). It
  predates this ticket and is not fixed here. Until it is fixed on main, the checklist's "`canvas-journey all` green"
  cannot be met.
- `wt-474` (branch `feat/import-fidelity-474`, unpushed) holds an earlier, superseded #474 plan with the opposite
  renderer decision (an operator tool). This work is in a fresh worktree, `wt-474b`. `wt-474` is left untouched for
  the owner to decide on.
