# Implementation Report — Floor runner + Spike 1 (#88)

**Plan**: `.claude/plans/floor-runner-parameterize-composition-spike1.md`
**Branch**: `feature/floor-runner-parameterize-composition-spike1` (worktree `ux-factory-wt-88`, cut from `origin/main`)
**Status**: COMPLETE

## Summary
Generalized `portal/record-composition.mjs` from Fieldwork-hardwired to a scenario-parameterized floor
runner: everything domain-specific now comes from a new optional per-scenario `scenarios/<slug>/compose.json`
(open-Q #4's resolution), the Read fence + numbered file-list are rebuilt per-scenario, and output +
manifest are scoped to `proto/compositions/<scenario>/` so a non-Fieldwork run never touches the shared
root manifest. Then ran **Spike 1** end-to-end against an enriched fictional `northwind` scenario (22 SKUs):
two real, honesty-clean composition runs, rendered through the real components + tokens and eyeballed in
Chromium + WebKit. **Verdict: productize the floor** (gated to dashboard-shaped employers, + one bounded
generic list-row) — **vocabulary-extension count = 0** for both KPI/insight questions.

## Tasks completed
- **compose.json contract (open-Q #4)** → `scenarios/northwind/compose.json` (CREATE), `scenarios/fieldwork/compose.json` (CREATE). Shape: `subject · today · fixtures[{name,hint}] · copy · slots · computeRules(DEFINITIONS-ONLY) · questions[{slug,slot,question}]`. Fieldwork's restates its prior baked-in semantics verbatim (extracted programmatically from the pristine source to avoid transcription drift).
- **Enriched fixture** → `scenarios/northwind/fixtures/items.json` (UPDATE): 3 → 22 coherent SKUs (14 ok / 5 low / 3 oversold, balanced across 4 warehouses; `status` derived from the numbers so it can't contradict them; original 3 preserved).
- **Parameterized runner** → `portal/record-composition.mjs` (UPDATE): `loadComposeConfig()` + hand-validation; `buildTask`/`refsFor` templated from config; `SLOTS`/`READ_OK`/`FIXTURE_PATHS` removed (per-run); `makeFence(root,out,readOk)`; de-Fieldworked `PIV_COMPOSE_SYSTEM`; output + `dropShipped`/`upsertIndex` scoped to `proto/compositions/<scenario>/`; scenario is the first positional arg.
- **Two real compositions** → `proto/compositions/northwind/{stock-risk-state,oversell-exposure}.json` + `proto/compositions/northwind/index.json` + `traces/{stock-risk-state,oversell-exposure}.{jsonl,raw.jsonl}` (CREATE, real agent runs).
- **Verdict recorded** → `docs/epics/generative-prototyper.architecture.md` (UPDATE: open-Q #4 resolved + Spike-1 result block); `CLAUDE.md` (UPDATE: CLI signature + architecture-map annotation). Issue #88 verdict comment posted.

## Tests added
No unit suite (project rule: "run the surface you touched"). Gates exercised:
- `node scenarios/validate.mjs` → all 3 packages ✓ (northwind 22 records; `compose.json` ignored by the validator, as designed).
- `node tooling/validate-trace.mjs` → all committed traces ✓ (Fieldwork's 4 unchanged + northwind's 2 new).
- `validateComposition` over the 4 committed Fieldwork compositions ✓ (unchanged) and the 2 new northwind ones ✓.
- **Prompt-fidelity diff (strongest AC#3 proof):** captured `buildTask` for a committed Fieldwork question from the pristine source (`scratch/fieldwork-task.before.txt`) and again after the refactor (`.after.txt`). The **domain-semantics `computeRules` block is byte-identical**; the only diffs are the removed hardcoded "five" count (now variable) and fixture-list whitespace — intended templating, zero semantic drift.
- **Both `--dry` runs** (fieldwork regression + northwind pre-flight): auth ✓, rebuilt fence denies ✓, PIV mechanism ✓, `validateComposition` ✓.
- **Cross-engine render:** the two compositions rendered through the real `renderComposition` + components.css + token contract + neutral pack in Chromium **and** WebKit — 9 `ds-metric-tile`s, 0 console errors, identical layout (`scratch/northwind-{chromium,webkit}.png`).
- **Numbers hand-verified** against a post-hoc judge (never fed to the prompt): all 9 tile figures correct (oversold 3, low 5, at-risk 8/22, shortfall 195u, deepest 85u→correct SKU, most-exposed East=2).
- **No-leak:** `git diff --stat proto/compositions/index.json` empty after both real runs (root manifest byte-unchanged).

## Validation results
- `node --check portal/record-composition.mjs` → pass.
- `node scenarios/validate.mjs` → pass (3/3).
- `node tooling/validate-trace.mjs` → pass (all traces).
- `node tooling/drift-check.mjs` → pass (loc-summary counts only `system/` + root/proto `.html` + `agent-layer/*.mjs` — none of this ticket's changed paths; no generated-artifact input touched).
- 2 real paid runs shipped clean (plan→gate→implement→validate, 0 null-phase); ~$1.7 total incl. dry + one re-run.

## Deviations from the plan
- **`compose.json` shape refinements (intentional, within open-Q #4's mandate to *decide* the shape):** added `subject` (names the domain in the prompt intro line — honest, not a tile — which lets Fieldwork's intro stay byte-identical) and made `copy` a hint string (truthy → include copy.json in the fence) rather than a bare `true`. Both are firewall-safe and documented in each `compose.json`'s `$description`.
- **`today` made load-bearing:** the validator asserts `computeRules.includes(today)` so the declared date and the prompt prose cannot drift (the plan listed `today` as a key without a coherence check).
- **`PIV_COMPOSE_SYSTEM` keeps a Fieldwork-flavored tile-anatomy example** ("Busiest technician — Priya Nair") — the plan says keep structural rules verbatim, and this illustrates the *number-in-value / name-in-label* structural rule, not a question answer, so it stays inside the honesty firewall. Noted as a deliberate keep.
- **northwind's two committed slugs use `--slug`** (`stock-risk-state`, `oversell-exposure`) because the runner slugifies the free-form question by default; the compose.json `questions[].slug` are the reference list, passed explicitly. (traces/ is a flat namespace — slugs are globally unique, no Fieldwork collision.)
- **Fieldwork NOT migrated** to `proto/compositions/fieldwork/` — left at root (read-only) per the plan's assumption #3; migrating its single consumer `agentic-ui-study.html` is deferred to #89.

## Spike-1 verdict (the deliverable)
**PRODUCTIZE THE FLOOR**, gated to dashboard/data-tool-shaped employers, with **one bounded generic `ds-`
list-row** recorded as the next spec-first addition (NOT built in #88 — keeps the spike a spike).
- **Vocab-extension count = 0** — both views expressed with `metric-tile` alone.
- **Content fidelity high** (all figures correct, agent selected the metrics itself, firewall held).
- **Form fidelity generic** — reads as a competent KPI band, not visibly "their product"; a per-SKU list-row
  is what would lift it (the vocabulary has none; Verdant's row primitives are enum-locked). That's the
  "≤ small bounded extension → productize" branch, not "lean ceiling." **Unblocks #89**; **#90 (ceiling)**
  stays reserved for non-dashboard-shaped employers.

## Issues encountered
- One northwind `--dry` and one real run missed PIV marker-discipline (collapsed phases / one null-phase step
  before `[[piv:plan]]`) — a known stochastic miss the ship-gate (`validate-trace`) is designed to catch. A
  `--force` re-run shipped clean (variance, not a prompt defect — Fieldwork was clean on the same shared
  system prompt). Fixed per the honesty contract by re-running, never hand-editing.

## Not staged / cleanup
- Scratch harness, screenshots, generator scripts, before/after diffs, and the static server live under the
  worktree `scratch/` and are **not committed**. Orphaned artifacts from the failed long-slug run were removed.
- **Commit-scope note for the reviewer:** the epic docs `docs/epics/generative-prototyper.{architecture,prd}.md`
  are currently untracked (this is epic #86's first landed slice). This ticket updates the architecture doc; the
  PRD is unmodified. Whether to land both epic docs together here is a maintainer call (surfaced at commit).
