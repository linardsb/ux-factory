# Implementation Report — PR #16 review Lows (registry retry · no-store errors · en-route fixture)

**Plan**: `.claude/plans/pr16-review-lows.md`   **Branch**: `feature/pr16-review-lows`   **Status**: COMPLETE

## Summary
Closed out the three actionable Low-severity findings from the PR #16 review (issue #18) with three surgical edits: the shipped registry loader no longer memoizes a *rejected* `/scenarios/index.json` fetch (the next call retries), the public Worker now returns `cache-control: no-store` on every non-200 (so a mistyped 404 is not replayed for 5 minutes), and the board's `en-route` status — which existed in copy, CSS, and the DataContract but had no fixture — is now exercised by real data (`job-006` flipped to `en-route`, dated the fictional today, seated in tech-04's lane). Item 1 (pairwise-distinct verdicts for N>2) is deferred by decision, to be recorded as an issue comment at PR time.

## Tasks completed
- Registry retry (item 2) → `system/scenario-data.mjs` (UPDATE) — `.catch` resets `registryPromise = null` and rethrows; success path still memoized.
- Uncacheable errors (item 3) → `worker/api.mjs` (UPDATE) — `no-store` spread into the single `json()` choke point for `status !== 200`; `...extra` stays last so `allow: GET` survives on the 405.
- En-route job (item 4) → `scenarios/fieldwork/fixtures/jobs.json` (UPDATE) — `job-006`: `status` `scheduled`→`en-route`, `scheduledStart` `2026-07-17T10:30:00Z`→`2026-07-14T17:30:00Z`, `slaDue` `2026-07-20`→`2026-07-16`. Every other field untouched.
- Seat in lane (item 4) → `scenarios/fieldwork/fixtures/schedule.json` (UPDATE) — `slot-day-04` first slot `{start:"17:30", durationMin:60, jobId:"job-006"}`; slots 2–3 stay empty.

## Tests added
None — no suite exists and none is invented (CLAUDE.md: "don't hunt for or invent one"). "Done" = run the surface you touched; results below.

## Validation results
- **Level 1 — syntax & JSON**: `node --check` on both `.mjs` PASS; both fixture JSONs parse PASS.
- **Level 2 — registry retry**: Node memo one-liner prints `OK: next call retries` (was `FAIL` on old code). PASS.
- **Level 3 — coherence**: `node scenarios/validate.mjs` → `verdant ✓`, `fieldwork ✓` (104 records), `verdicts differ: habit-justified vs utility`. PASS.
- **Level 3 — Worker battery** (live `wrangler dev` :8787):
  - `/api/health` → `200 · public, max-age=300` ✓
  - `/api/fieldwork/jobs` → `200 · public, max-age=300` ✓; `en-route` served (count 1) ✓
  - `/api/nope/x`, `/api/verdant/__proto__`, `/api/verdant/nope` → `404 · no-store` ✓
  - `POST /api/health` → `405 · no-store · Allow: GET` ✓
- **Level 4 — board render** (static fallback, `npx serve` :3000, real browser via agent-browser):
  - Source indicator: `DATA: STATIC FIXTURES` ✓
  - Attention panel: `.fw-status-chip[data-status="en-route"]` renders once — "Copperworks Brewery | En route" with the SLA warning mark ✓ (exercises `components.css:1823`)
  - tech-04 lane slot chip: `17:30 Copperworks Brewery · En route` ✓
  - "Needs assignment" unchanged: `job-052, job-061, job-062, job-063, job-064` ✓
  - `/scenarios/check.html` green — single `✓`, all collections load (Fieldwork jobs 64), no `✗`/FAIL ✓

## Deviations from the plan
None. The four edits match the plan's specified diffs field-for-field; no additional files, checks, or schema changes. `job-006` was the plan's designated candidate and satisfies every validator constraint (start-day = today ±14d; not `done` so `completedAt` null; not `overdue` so `slaDue ≥ today`; south/south region-coherent; not previously slotted, so no double-booking).

## Issues encountered
None of substance. One process note: a crude `body.textContent.includes("FAIL")` probe on check.html gave a false positive (it matched a script-string constant, not a rendered failure); re-inspecting the rendered `main` innerText confirmed the page is green with no `✗`/FAIL marks.

## Remaining (handled by the PR/issue step, not piv-implement)
- Commit the four files (explicit paths — shared worktree), open the PR with `Closes #18`.
- Post the item-1 deferral comment on issue #18 (trigger: a third scenario in `scenarios/index.json`). No N>2 code was written.
