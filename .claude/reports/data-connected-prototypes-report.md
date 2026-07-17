# Implementation Report — Data-connected prototypes (Verdant screen + Fieldwork hybrid canvas)

**Plan**: `.claude/plans/data-connected-prototypes.md`   **Branch**: `feature/data-connected-prototypes`   **Status**: COMPLETE

**Closes**: linardsb/ux-factory#8 (epic #1) — depends on #4 (branched off its PR #16 branch)

## Summary

The lego-brick claim, demonstrated: `proto/verdant.html` renders the "Plant overview" phone
screen from the six spec'd `vd-*` components (implemented this ticket, spec heads flipped
`spec → shipped`), fetching live from the Worker mock API and degrading to committed static
fixtures with a truthful source indicator. `proto/fieldwork.html` renders the "Dispatch board"
hybrid canvas — human-fixed `fw-*` chrome plus the two designated, bounded agentic slots
(`summary-strip`, `insight-panel`) as honestly-labeled placeholders for #13. The spec↔fixture
seam left by the parallel #4/#7 builds was reconciled in the honest direction: fixtures now
carry what the DataContracts promise (baked derived fields against the fictional today,
validator-proven), so the mock API genuinely serves contract-valid records.

## Tasks completed

- Verdant fixtures enriched (`plantName`, `status` on tasks; `status` on plants) → `scenarios/verdant/fixtures/{care-tasks,plants}.json` (UPDATE)
- New readings collection (8 records, moisture+light pairs) → `scenarios/verdant/fixtures/readings.json` (CREATE) + `proto.config.json` collections + `worker/fixtures.mjs` import (UPDATE)
- 4 unassigned jobs (techId null) → `scenarios/fieldwork/fixtures/jobs.json` (UPDATE)
- Coherence rules (plantName join · status-vs-due rule · plant worst-of-open-tasks · readings shape · ≥1 unassigned job) → `scenarios/validate.mjs` (UPDATE)
- Fixture-shape docs → `scenarios/README.md` (UPDATE)
- Contracts describe the real API (`type` enum from fixtures, `done`, date formats, full Plant shape, Reading `id`/`plantId`) → `system/specs/{care-task-row,plant-card,stat-tile}.contract.json` (UPDATE)
- Spec prose/tables/samples aligned; `status: "shipped"` ×6 → `system/specs/*.md` (UPDATE)
- Stale "GENERATED MIRROR — do not edit" header retired (architecture §Data model) + SCENARIO PROTOTYPE COMPONENTS section (`vd-*` ×6 to spec, `fw-*` board chrome, ~420 lines, token-only) → `system/components.css` (UPDATE)
- Prototype shell chrome (`.proto-head`, `.proto-source` indicator, `.proto-frame-phone/-board`, `.proto-slot`) → `system/proto.css` (UPDATE)
- Verdant page (approved-sketch layout, session-only Log-care interaction) → `proto/verdant.html` (CREATE)
- Fieldwork page (toolbar · Attention panel · lanes · Needs-assignment · 2 slots) → `proto/fieldwork.html` (CREATE)
- Handoff pack regenerated (status flips + amended contracts/prose) → `handoff/verdant/` (REGENERATE)
- Agentic-slot design call recorded → `docs/epics/ai-first-ux-factory.architecture.md` Open questions (UPDATE)
- `proto/` map line → `CLAUDE.md` (UPDATE) · `_headers` verified — no change needed (`/*.html` covers proto pages)

## Tests added

No test suite by ground rule; surfaces run:

- `node scenarios/validate.mjs` ✓ (verdant 3 collections · 43 records; fieldwork 3 · 104; verdicts differ). Negative test: corrupted one task status → exit 1 naming file + record + field ✓, restored.
- Worker under `wrangler dev`: `/api/verdant/readings` serves the new collection ✓; care-tasks carry `plantName`+`status` ✓; health ✓. Routes untouched.
- Real-browser (agent-browser), both pages × three states: Worker up → `data: live mock API`; killed → `data: static fixtures`, identical rendering; restarted → back to `worker`. Verdant interaction exercised: check row → `aria-checked` + button enables; commit → rows clear, button disables. Fieldwork: 7-row Attention panel (SLA AT RISK/URGENT/OVERDUE chips), 4-row Needs assignment, 10 lanes, both slots labeled.
- Regression: `scenarios/check.html` ✓ (now 6 rows — picks up readings automatically), `index.html` ✓, `gen-token-css.mjs --check` ✓ no drift.

## Validation results

- L1: `node --check` ×2 ✓ · all JSON parses ✓
- L2: validator ✓ · token drift-check ✓ · hand token-lint over both new CSS sections: no hex/rgb literals ✓ · `gen-handoff` deterministic (consecutive runs byte-stable) ✓
- L3: Worker curl battery ✓ (see above)
- L4: both pages × both fallback states in a real browser ✓ (screenshots in session scratchpad)
- L5: regression suite ✓ (check.html, index.html, generators)

## Deviations from the plan

1. **None in scope or approach** — the plan's tasks were executed as written, including the
   reconciliation direction (fixtures → contracts) and all assumption calls (§Open Questions 1–7).
2. **Two CSS fixes found by real-browser testing** (the plan's L4 exists for exactly this):
   `.vd-screen-body > * { flex: none; }` — a scrolling column flexbox compresses children below
   natural height once content overflows, squashing the plant card; and `.fw-job` moved from a
   2-col grid to flex-wrap so the side cluster (SLA/priority/chip) wraps in the narrow panel
   instead of overlapping the customer name.
3. **wrangler skill not loaded** before `npx wrangler dev` — the invocation is byte-identical to
   the one #4's report already validated (no new syntax); loading the full skill for a dev-server
   restart was skipped deliberately.
4. **Mid-run branch event (environment, not code):** a parallel session committed an epic
   snapshot (`4a3997b` — "#3, #7, #8 WIP, AI layer + plans") onto this branch while Phase 4 ran,
   sweeping in this ticket's Phase 1–3 work (verified present and correct in that commit). The
   remaining uncommitted delta for this ticket is: `proto/` (both pages), `system/components.css`
   (post-snapshot fixes), `system/specs/*.md` (status flips), `handoff/verdant/pack.json`
   (regen), `docs/epics/…architecture.md`, `CLAUDE.md`, this report. **The tree also carries two
   foreign in-progress files that must NOT be staged with this ticket:**
   `.claude/plans/portability-proofs.md` and `.claude/plans/site-shell-ia-analytics.md`
   (other sessions' active planning work).

## Issues encountered

- A stale wrangler process from an earlier session held port 8787, so this session's Worker
  bound to 8788 and the page truthfully reported `static` — diagnosed via the wrangler log,
  killed the stale process, restarted on 8787. (The honesty indicator caught a real
  environment fault — working as designed.)
- The old `components.css` line-1 header ("GENERATED MIRROR — do not edit") would have blocked
  the section addition; architecture §Data model explicitly retires it, so it was rewritten to
  a canon header (plan task).

## Ready for the next step

All plan tasks complete, all validations pass. Next: `piv-commit` — **stage by explicit path
only** (deviation 4: exclude the two foreign plan files), then `piv-create-pr` (`Closes #8`,
noting the branch carries the epic snapshot commit + #4's commit → coordinate with PR #16),
then `piv-review-pr`.
