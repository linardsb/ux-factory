# Implementation Report — Scenario packages (Verdant + Fieldwork) + Worker mock API + fixture fallback

**Plan**: `.claude/plans/scenario-packages-worker-mock-api.md`   **Branch**: `feature/scenario-packages-worker-mock-api`   **Status**: COMPLETE

**Closes**: linardsb/ux-factory#4 (epic #1)

## Summary

Built the scenario-package format (documented in `scenarios/README.md`, hand-enforced by a
zero-dep validator) and authored both packages: Verdant (plant care — frequency filter passes,
verdict **habit-justified**/facilitator) and Fieldwork (B2B field-service scheduling — filter
fails, verdict **utility**), deliberately ruling differently at the ethics gate as the epic
requires. Built the one Cloudflare Worker (`GET /api/:scenario/:collection`, read-only,
CORS-open, fixtures bundled from the same committed files the fallback serves) and the client
fetch helper that degrades to static fixtures and reports `source` truthfully. Both degradation
states verified in a real browser.

## Tasks completed

- Format spec + registry → `scenarios/README.md`, `scenarios/index.json` (CREATE)
- Verdant package → `scenarios/verdant/{brief.md, intake.defaults.json, copy.json, proto.config.json, fixtures/{plants,care-tasks}.json}` (CREATE; 15 plants + 20 tasks)
- Fieldwork package → `scenarios/fieldwork/{brief.md, intake.defaults.json, copy.json, proto.config.json, fixtures/{jobs,technicians,schedule}.json}` (CREATE; 60 jobs + 10 techs + 30 schedule days, heavy-ops data for #13)
- Validator → `scenarios/validate.mjs` (CREATE)
- Worker → `worker/{wrangler.jsonc, fixtures.mjs, api.mjs}` (CREATE)
- Fetch helper → `system/scenario-data.mjs` (CREATE)
- Check page → `scenarios/check.html` (CREATE)
- Cache rule for `/scenarios/*` → `_headers` (UPDATE)
- Architecture map (`scenarios/`, `worker/`) + "New scenario" placement bullet → `CLAUDE.md` (UPDATE)

## Tests added

Project has no test suite by rule; "done" = run the surface touched:

- `node scenarios/validate.mjs` — both packages ✓ (8 questions · 2/3 collections · 35/100 records), verdicts-differ check ✓. Negative test: blanking one `reasoning` → exit 1 naming file + field ✓.
- Validator coherence checks (beyond plan): axes enums enforced against #3's engine contract; water-task due = lastWatered + interval; `done` ⟺ `completedAt`; `overdue` ⟹ lapsed SLA; date-window and calendar-date walks; `<thing>Id` cross-refs resolve at any depth.
- Worker curl battery under `wrangler dev`: health ✓ · verdant/plants 15 ✓ · fieldwork/jobs 60 ✓ · unknown scenario/collection 404 `{error}` ✓ · POST 405 ✓ · CORS + cache + content-type headers ✓.
- Real-browser verification (`scenarios/check.html` via agent-browser): Worker up → all 5 collections `source: worker`; Worker killed → all 5 `source: static`, data still renders; Worker restarted → back to `worker`. Fictional notices render for both scenarios.

## Validation results

- L1 syntax: `node --check` × 4 modules ✓; 12 JSON files parse ✓
- L2 content: `node scenarios/validate.mjs` ✓ (exit 0)
- L3 worker: full curl battery ✓ (see above)
- L4 manual: both fallback states verified in a real browser ✓ (screenshots in session scratchpad)
- L5 regression: `node agent-layer/gen-token-css.mjs --check` — no drift ✓; `index.html` serves 200 under `npx serve` ✓

## Deviations from the plan

All four are recorded in the plan's AMENDMENTS section (2026-07-17), triggered by the user's
mid-run "address all to fix from 8/10 to 10/10":

1. **Axes enums pinned now, not at #10** — #3's parallel plan (`.claude/plans/live-derivation-engine.md`) pins `derive(input)`'s vocabulary, so the packages align with it and `validate.mjs` enforces it. Fieldwork's `rewardType` is `hunt` (the plan's proposed `none` doesn't exist in the engine; the frequency filter failing is what gates habit patterns) and its `frequency` is `monthly`.
2. **Validator does per-scenario coherence proofs** (date arithmetic, status consistency) beyond the plan's generic checks.
3. **`compatibility_date: "2026-05-03"`** instead of "today" — the cached wrangler 4.86.0 runtime rejects dates newer than 2026-05-03 (exactly the syntax risk the plan flagged; comment in `wrangler.jsonc` explains).
4. **Helper fetches the Worker with `cache: "no-store"`** — found by real-browser testing: the Worker's `max-age=300` made the browser replay cached responses for 5 minutes after the Worker died, so `source: "worker"` lied. The honesty contract makes the indicator load-bearing, so the worker probe bypasses HTTP cache; the static path keeps normal caching.

Also: intake questions carry a `stage` field (discovery/behaviour/friction/success/ethics-gate) — implied by the PRD table, useful to #10's wizard grouping, documented in the README.

## Issues encountered

- **Branch hygiene**: started on `main` with pre-existing uncommitted changes (1-line `README.md` edit removing the live URL, plus untracked workspace files). Proceeded onto the feature branch rather than stopping (autonomous run); none of it is staged for this ticket.
- **Shared working tree with the parallel #3 session**: the tree also contains #3's outputs (`system/derive*.mjs`, `oklch.mjs`, `wcag.mjs`, `derive.html`, `system/specs/`, a modified `agent-layer/lib.mjs`, its plan + report). **The commit for this ticket must stage selectively**: `scenarios/`, `worker/`, `system/scenario-data.mjs`, `_headers`, `CLAUDE.md`, this plan + report — nothing else. Caveat: `CLAUDE.md` also contains #3's one-line map entry (`derive.mjs …`), so committing it wholesale carries that line; benign, but worth a note in the commit message if #3 hasn't landed first.
- `api.prod` in `scenarios/index.json` is `""` until the Worker's first `npx wrangler deploy` (out of scope per plan assumption #2) — the deployed site honestly runs on static fixtures until then, and the helper short-circuits without a failed request.

## Ready for the next step

All plan tasks complete, all validations pass. Next: `piv-commit` (selective staging per above), then `piv-create-pr` (`Closes #4`), then `piv-review-pr`.
