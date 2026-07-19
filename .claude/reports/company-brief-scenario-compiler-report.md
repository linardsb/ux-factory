# Implementation Report — Company-brief record + brief → scenario-package compiler (#39)

**Plan**: `.claude/plans/company-brief-scenario-compiler.md`   **Branch**: `feature/company-brief-scenario-compiler`   **Status**: COMPLETE

## Summary

Added the **company-brief kb record** (`parseCompanyBrief` in `agent-layer/lib.mjs`, a thin display
projection `parseBrief` in `portal/lib/kb.mjs`) and a deterministic **brief → scenario-package
compiler** (`agent-layer/gen-company-package.mjs`) that expands one brief into the exact
`scenarios/<slug>/` shape everything downstream already consumes — no engine changes. The scenario
validator was refactored to be callable **by path** and **provenance-aware**: `fictional: true`
packages keep the fictional notice; `fictional: false` (real-provenance) packages require a
`speculativeNotice` + linked `sources`. A path-containment **privacy guard** makes it impossible to
write a real-brand package inside this public repo. The no-arg registry run is behaviourally
byte-identical to before.

## Tasks completed

- Refactor validator (Phase 1) → `scenarios/validate.mjs` (UPDATE): extracted exported
  `validatePackage(dir, slug)`; `fictional` is now a required boolean; `checkCopy(dir, head)` is
  provenance-aware; added by-path CLI mode. Verdict-differ check stays in `validateScenarios`.
- Shared parser (Phase 2) → `agent-layer/lib.mjs` (UPDATE): added `parseCompanyBrief` mirroring
  `parseComponentSpec` (fence → head validation throwing named errors → `##` sections).
- Record docs → `.claude/references/kb-format.md` (UPDATE): added the `companies/<slug>/brief.md`
  record to "The shapes"; both-parsers sync rule restated.
- Provenance docs → `scenarios/README.md` (UPDATE): documented `fictional: false` mode
  (`speculativeNotice` + `sources`), the privacy boundary, and by-path validation.
- Portal sync → `portal/lib/kb.mjs` (UPDATE): `parseBrief(slug)` (thin projection via the existing
  `parseFencedJson`), surfaced as `card.brief` in `full` mode. `listCards` still keys off
  `intake.md` (unchanged).
- Compiler (Phase 3) → `agent-layer/gen-company-package.mjs` (CREATE): parse → expand five files
  (+ optional token copy-through) → privacy-guard → self-validate → `✓`.
- Fixtures (Phase 4) → `agent-layer/fixtures/acme/` (fictional happy path) and
  `agent-layer/fixtures/northwind-real/` (real-provenance test stub) — each with a `fixtures/items.json`.
- Epic bookkeeping → `docs/epics/ai-first-ux-factory.architecture.md` (UPDATE): flipped the
  "ledger → scenario-package unification?" open question to settled and cross-linked the new
  `docs/epics/per-company-brief.architecture.md`.

## Tests added

No unit framework (project rule: "run the surface you touched"). Tests are deterministic CLI runs
with asserted exit codes + `✓`/`✗` output, plus one scratch script for parser edge cases:

- Happy path: compile `acme` → `✓ fictional · 8 questions · 1 collections · 4 records`; independent
  `node scenarios/validate.mjs <dir>` → `✓`. Emitted `intake.defaults.json` = the 8 canonical ids in
  `id,stage,question,default,reasoning,bounds,asked` order + `axes` (the wizard-shape contract).
- AC#4 privacy guard: `--out .` on the real stub → throws naming the refused path, exit 1, `git
  status` clean, no repo-root dir leaked.
- AC#3 provenance: real compile passes (templated `speculativeNotice` + `sources`); stripping
  `sources` from the emitted `copy.json` → validator fails naming the missing field, exit 1.
- Edge cases (`scratchpad/edge-test.mjs`, all PASS): missing intake id → throws `intake.friction`;
  `fictional` absent → throws `"fictional"`; real brief empty `sources` → throws `sources`; orphan
  collection → compiler self-validate throws `ghost` and discards the *freshly-created* output.
- Footgun proofs (all PASS): a pre-existing directory with a sentinel file **survives both a
  successful and a failed compile** into it — the discard-on-failure delete never touches a
  directory this compile did not create.

## Validation results

- **Level 1 — syntax**: `node --check` on all four `.mjs` → 4/4 pass.
- **Level 2 — parser + regression**: `parseCompanyBrief(acme)` → `parsed acme 8 ids 5 sections`;
  `node scenarios/validate.mjs` (no args) → **byte-identical to the pre-refactor baseline** (verdant
  + fieldwork `✓`, verdicts differ), exit 0; `node tooling/drift-check.mjs` → `✓ syntax · token-css
  · handoff · scenarios · traces`, exit 0.
- **Level 3 — integration**: acme compile `✓` + by-path validate `✓`, exit 0.
- **Level 4 — negative paths**: AC#4 exit 1 + git clean; AC#3 exit 1 naming `sources`.
- **Level 5 — portal smoke**: boots; `/api/health` → `{"ok":true,…,"cards":7}`.
- **Regression**: `build.mjs` untouched (grep confirms no import/call added); no `index.json` /
  `worker/fixtures.mjs` edits; no compiled-package leakage into the repo (only `agent-layer/fixtures/`
  committed).

## Deviations from the plan

1. **Two fixtures committed** (`acme` + `northwind-real`) though the ticket says "one." Per plan
   Assumption #5 — the negatives *are* the acceptance evidence for AC#3/#4. Both are fictional
   content; `northwind-real` only carries a real-provenance *label* and cannot, by the guard, be
   compiled into the repo.
2. **Compiler overwrites in place; guarded discard-on-failure.** The plan step 3 specified only
   `mkdirSync`. An earlier draft added an unconditional pre-write `rmSync(outAbs)` for clean
   regeneration — removed as a destructive footgun: `outAbs` is user-controlled (`--out` + `slug`)
   and a fictional brief has no containment guard, so `--out .` with a slug matching a repo dir
   (e.g. `system`) would recursively delete it. Files now overwrite in place; a dropped fixture on
   re-run surfaces as a named `validatePackage` error, not silent loss. The discard-on-failure
   `rmSync` (plan Open-Question #6) is kept but fires **only when this compile created `outAbs`**
   (`!preexisting`) — it never deletes a pre-existing directory it merely wrote into. Proven by the
   discard-on-failure + sentinel footgun tests.
3. **Fixtures-dir existence guard** (`existsSync` before `readdirSync`): a missing `fixtures/` now
   surfaces as `validatePackage`'s precise "collection X unbacked" named error instead of an unnamed
   `ENOENT`. Within the throw-naming-the-path convention.
4. **`SCRATCH` path corrected** to this session's scratchpad UUID (the plan text baked in a prior
   session's UUID — advisor-flagged; would have silently written outside this session's dir).
5. **`docs/epics/ai-first-ux-factory.architecture.md` included** in the ticket scope (not in the
   plan's code-focused files-touched list): it records the resolution of the very open question #39
   answers and cross-links the new architecture doc. Conscious decision, not a default sweep.

## Issues encountered

None blocking. A pre-commit review (advisor) caught a destructive `rmSync` footgun in an early
compiler draft (unconditional pre-write clean-slate on a user-controlled path); it was removed and
replaced with in-place overwrite + a create-gated discard — see Deviation #2, now covered by the
sentinel footgun tests. Note: the optional `head.publishedTokens` copy-through path is implemented
per spec but not exercised by either fixture (both omit it — pack derivation is ticket #40); it is
the documented copy-through of a pre-existing CSS file, no derivation.

## Staging note for the commit step (working tree carries unrelated changes)

`piv-commit` commits *all* uncommitted changes by design. Stage **#39's files by explicit path**:

**Include**: `scenarios/validate.mjs` · `agent-layer/lib.mjs` · `portal/lib/kb.mjs` ·
`.claude/references/kb-format.md` · `scenarios/README.md` ·
`docs/epics/ai-first-ux-factory.architecture.md` · `agent-layer/gen-company-package.mjs` ·
`agent-layer/fixtures/` · `docs/epics/per-company-brief.architecture.md` ·
`.claude/plans/company-brief-scenario-compiler.md`

**Exclude (other work, not #39)**: `.claude/skills/piv-plan-implementation/SKILL.md` (unrelated
edit) · `.claude/code-reviews/pr-45-review.md` (PR #45) ·
`.claude/plans/pack-seed-derivation-vision-run.md` (#40's plan).

## Ready for the next step

All tasks complete; all five validation levels + edge cases pass. Next: `piv-commit` (stage the
#39 paths above), then `piv-create-pr`, then `piv-review-pr`.
