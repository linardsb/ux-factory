# Implementation Report — Portability proofs (WC wrappers + Figma parity)

**Plan**: `.claude/plans/portability-proofs.md`   **Branch**: `feature/portability-proofs` (worktree `../ux-factory-wt-12`, base `d656f05` = #7's branch)   **Status**: COMPLETE (Task 9 ran as its designed Outcome B — see Deviations)

## Summary

Both portability prongs of ticket #12 landed. Three custom-element wrappers (`vd-status-chip`, `vd-plant-card`, `vd-care-task-row`) consume DataContract-shaped records, carry shadow-DOM CSS that references only spec-head tokens (audited, zero literals), and were proven live in a plain page and a React 19 import-map sandbox — spike 3 closed with the "clean → trajectory declared" branch, recorded on #12. The Figma prong shipped the zero-dep parity script with both spike-1 branches built in (variables → gate-evidence capture → GET-file styles fallback, `--offline` replay cache) plus the pack-facing import doc; no Figma token existed in `portal/.env` or the environment, so spike 1 closed as **Outcome B**: error paths validated, wording cites the researched gate facts, `pack.json.portability.figma.parity = null`, and #12 stays open on the real-run half only. `gen-handoff.mjs` now copies wrappers + docs into the pack and emits the `portability` block, deterministically.

## Tasks completed

- Task 1 (branch) → isolated worktree `../ux-factory-wt-12` on `feature/portability-proofs` from `feature/handoff-data-layer`; style-dictionary installed
- Task 2 → `system/wc/vd-status-chip.mjs` (CREATE — golden exemplar verbatim)
- Task 3 → `system/wc/vd-plant-card.mjs` (CREATE)
- Task 4 → `system/wc/vd-care-task-row.mjs` (CREATE)
- Task 5 → `system/wc/demo.html` (CREATE) + browser-driven validation
- Task 6 → `tooling/wc-sandbox/react.html` (CREATE) + browser-driven validation
- Task 7 → `system/wc/README.md` (CREATE) + spike-3 comment: issues/12#issuecomment-5003857284
- Task 8 → `tooling/figma/figma-parity.mjs` (CREATE) + `.gitignore` entry (UPDATE)
- Task 9 → **Outcome B**: spike-1 status comment: issues/12#issuecomment-5003882836
- Task 10 → `system/figma-import.md` (CREATE)
- Task 11 → `agent-layer/gen-handoff.mjs` + `agent-layer/build.mjs` (UPDATE); `handoff/verdant/` regenerated (wc/ ×4, figma-import.md, pack.json portability block)
- Task 12 → `CLAUDE.md` (UPDATE — map lines for `system/wc/`, `system/figma-import.md`, `tooling/figma/`, `tooling/wc-sandbox/`, handoff exception note; one "Where new code goes" bullet)

## Tests added

No test suite by ground rule; the two harness pages are the test rig, both driven end-to-end via agent-browser:

- **demo.html**: all spec states render; a11y tree = links "Name, STATUS" / checkboxes with `aria-checked`; monogram on no-photo record ("Z"); species line hidden on no-species record; chip `data` record renders "3 DAYS OVERDUE"; scoped override strip pierces shadow DOM (overdue border `#2563eb` → `#7c2d92`, radius 8px → 2px); `--type-eyebrow` resolves to 12px inside shadow; `vd-toggle` both directions + `vd-select` reach a `document` listener; checked state fills circle `--color-accent` and softens label to `--color-fg-muted`. Screenshot captured.
- **react.html**: single React 19.2.0 instance (no duplicate-React warning, zero console errors); string props → attributes; `data={record}` → real DOM property (`el.data.name === "Monstera"`); ref-attached `vd-toggle` listener drives `useState` count 0→1→2 with correct `detail`. Screenshot captured.
- **Parity script error paths**: no token → exit 1 naming `portal/.env`; bad token → variables 403 gate captured, fallback GET-file 403 surfaced as Figma's verbatim body (`{"status":403,"err":"Invalid token"}`), no stacktrace, no cache/artifact written.

## Validation results

- L1 syntax: `node --check` on 6 files — all pass; `pack.json` valid JSON.
- L2 generators: `gen-handoff` ✓ `6 specs + 3 token targets + 3 wc wrappers`; **two runs → identical `git status --porcelain handoff/` (deterministic)**; `gen-token-css --check` → no drift (46 contract + 53 pack).
- L3 full build: `build.mjs` from the jobs folder (trainline ledger) → every ✓ line incl. the extended handoff line.
- L4 manual: both harnesses pass (above); `/index.html` regression renders under the neutral pack, no errors.
- L5 Figma: real run pending token (Outcome B); error paths pass.

## Deviations from the plan

1. **Task 9 took Outcome B** — not a deviation but a planned branch: no `FIGMA_TOKEN`/`FIGMA_FILE_KEY` existed (`portal/.env` absent entirely; env unset), and the plan says "do NOT stall the ticket waiting". Everything Outcome B requires is done; commit deliberately omits `Closes #12`.
2. **`scenarios/validate.mjs` + `/scenarios/check.html` regression checks are N/A at this base** — the scenarios commit (`45a5207`) is not an ancestor of `d656f05` (it lives on the #4/#8 branches), so `scenarios/` does not exist in this worktree. The plan's context files (`check.html`, `copy.json`) were read from the main working tree instead; the fictional-notice wording was reused verbatim. No scenario surface was touched, so nothing to regress.
3. **`pack.json.portability.figma.parity` is computed** (`existsSync(figma-parity.json) ? path : null`) rather than hardcoded `null` — still deterministic for any committed repo state, and regeneration stays correct in both Outcome worlds without a code edit when the real run lands.
4. **Report committed on the branch** (amend into the atomic commit) — matches the in-tree precedent of `.claude/reports/` for #2/#3.

## Issues encountered

- `main` moved past the base (#15 merged) but #7 (`d656f05`) remains unmerged, so the branch is stacked on `feature/handoff-data-layer` exactly as the plan's assumption 5 anticipated — this PR will transiently contain #7's commit if opened first (note for the PR body).
- None otherwise; all plan-time-verified mechanics (P1–P7, E1–E7) held at implementation time.

## Remaining on #12 (deliberate)

The spike-1 **real run**: user adds `FIGMA_TOKEN` + `FIGMA_FILE_KEY` to `portal/.env` (prep per the spike-1 comment), runs `node tooling/figma/figma-parity.mjs`, commits `handoff/verdant/figma-parity.json`, regenerates the pack (parity field flips automatically), and posts the run's outcome on #12.
