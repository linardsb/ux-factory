# Implementation Report — Manipulable-parameter count (manifest + generator, rendered on approach)

**Plan**: `.claude/plans/param-count-manifest-generator.md`   **Branch**: `feature/param-count-167`   **Status**: COMPLETE

## Summary

The epic's capacity metric is now measured, not claimed: a committed manifest
(`system/param-manifest.json`, 62 entries, counting rules recorded in its `$description`) feeds a
deterministic generator (`agent-layer/gen-param-count.mjs`) that emits `system/param-count.json`
(per-page totals + site-wide total), drift-checked in CI's `verify` job beside `loc-summary`.
approach.html renders the site-wide 62 as a JS-rendered sentence inside the existing `#asrc`
success path, counting up into view. CLAUDE.md carries the standing convention: a ticket that adds
a control updates the manifest in the same PR.

## Tasks completed

- Manifest, 62 entries (chrome 5 · / 16 · /approach 1 · /build 33 · /factory 3 · /proto/verdant 2 · /roundtrip 1 · /work 1) → `system/param-manifest.json` (CREATE)
- Generator `genParamCount({check})`, loc-summary pattern (ROOT from `import.meta.url`, `pathToFileURL` standalone guard, deterministic output + trailing newline) → `agent-layer/gen-param-count.mjs` (CREATE)
- Generated artifact → `system/param-count.json` (CREATE, committed)
- `checkParamCount()` registered after `checkLocSummary()`, summary line extended → `tooling/drift-check.mjs` (UPDATE)
- Third `grab()` in the `Promise.all`, `#param-proof` hidden `<p>` + provenance comment, span + `countUpOnVisible`, rendered before `data-asrc="ready"` → `approach.html` (UPDATE)
- Two architecture-map lines + "Where new code goes" convention bullet → `CLAUDE.md` (UPDATE)
- loc-summary cascade (new tracked generator file; staged first, then regenerated) → `system/loc-summary.json` (UPDATE)
- VR baselines regenerated from a clean detached worktree via `update:docker` → `tooling/visual-regression/baselines/approach-{neutral,saulera}.png` (UPDATE)

## Tests added

No suite in this repo (CLAUDE.md) — load-bearing checks run manually:

- **Determinism**: generator run twice; second run byte-identical, `--check` green between.
- **Mutation proof** (the check must be able to fail): removed the last manifest entry →
  `--check` went RED with the param-count drift message, exit 1; restored → green.
- **Validation errors** (each throws naming entry + file):
  - missing `label` → `param-count: manifest entry 3 ("chrome") missing "label" — fix system/param-manifest.json`
  - duplicate `page+selector` → `param-count: manifest entries 0 and 62 duplicate chrome input[name="pack"] — fix …`
  - empty `entries` → `… must be a non-empty array — a zero-control site is a generator bug`
- **Render path** (headless Chromium against `npx serve`): `#param-proof` renders
  "62 of the things on these pages are live controls…" and `#asrc[data-asrc="ready"]` is set.
- **Degrade path**: with `param-count.json` blocked, the whole exhibit stays hidden and
  `data-asrc` is never set (visitor-silent, CI-loud — unchanged discipline).

## Validation results

1. `node --check agent-layer/gen-param-count.mjs` — pass
2. `node agent-layer/gen-param-count.mjs` — `param count ✓  62 controls (system/param-count.json)`
3. `node agent-layer/gen-param-count.mjs --check` — ✓ no drift
4. `node tooling/drift-check.mjs` — green; summary line now `… loc-summary · param-count · system-graph …`
5. Mutation proof — red then green (above)
6. Served-page check — pass (headless, both success and degrade paths)
7. loc-summary regenerated after staging — drift-check green on the staged tree
8. VR `update:docker` from clean worktree — only the two approach baselines churned

## Deviations from the plan

- **Two seed selectors corrected against source**: the home mapping-report buttons live under
  `[data-import-report]` (the plan's `.brand-import-report` class doesn't exist), and the plan's
  single selector for /build's two wizard navs would have been a duplicate — split into
  `[data-act="hooked"]`/`[data-act="shaping"] .bx-q-footer button`. Similarly the breadboard's
  cancel-connect (`.bx-bb-connecting + .bx-bb-btn`) and remove-place (`.bx-bb-place-head
  .bx-bb-remove`) got distinct, source-accurate selectors, and the four keep-rail downloads use
  `[data-keep-artifacts] button:nth-of-type(1–4)`. Entry counts per page match the plan exactly;
  total 62 as projected.
- **drift-check comment numbering**: inserted as `2c2` between `2c` and `2d` rather than
  renumbering the existing sections (surgical-changes rule).
- Everything else per plan.

## Issues encountered

- None blocking. Note for the PR: the plan's OPEN QUESTION #1 stands — the measured 62 already
  exceeds epic #164's "≥40 from ~20" target, so the epic's metric needs an owner decision (flag on
  the epic issue when the PR opens; do not silently amend).
