# Implementation Report — the trace player labels each card Said or Did (#496)

**Plan**: `.claude/plans/trace-player-said-did-496.md`   **Branch**: `feat/trace-said-did-496` (worktree `/Users/Berzins/wt-496`)   **Base**: c35c39a → c35c39a (origin/main unmoved at report time; no merge needed)   **Status**: COMPLETE

## Summary
`system/trace-player.mjs` now gives every card a first-child `Said` (text step) or `Did` (tool step) label that is also the card's accessible name via `aria-labelledby`, adds one header sentence citing Chen et al. 2025 (arXiv:2505.05410), and splits each act head into `N steps · S said · D did`. A new operator-run driver, `tooling/trace-journey.mjs`, proves it on `/trace.html` and `/roundtrip.html` across chromium, firefox and webkit, with every expected value taken from `parseTrace` over the trace fetched through the same server. No CSS changed.

## Tasks completed
- Task 1 — worktree `/Users/Berzins/wt-496` on `feat/trace-said-did-496` from origin/main c35c39a (the primary tree is dirty and on `fix/importer-reads-icon-name-449`); `npm ci` in `tooling/icons`, `tooling/style-dictionary`, `tooling/visual-regression`; plan, brief and patch copied across.
- Task 2 — `system/trace-player.mjs` (UPDATE) via the plan's fast path, `git apply .claude/plans/trace-player-said-did-496.patch` (applied clean, +33/−3).
- Task 3 — `tooling/trace-journey.mjs` (CREATE).
- Task 4 — `.claude/references/gates.md` (UPDATE, paragraph before `instance-journey.mjs`), `CLAUDE.md` (UPDATE, tooling map line after `catalog-journey.mjs`).
- Task 5 — `system/loc-summary.json` regenerated after staging (no change); `tooling/visual-regression/baselines/roundtrip-{neutral,saulera,verdant}.png` regenerated from a clean detached worktree of the branch tip (commit 699d70f).
- Task 6 — commits 699d70f (code, plan, brief, patch, gate prose) and 45216b6 (baselines); this report.

## Tests added
`tooling/trace-journey.mjs` — cases [0]–[8] per page, 37 assertions per engine (18 per page plus the final error check). Observed run on the final driver: `BASE=http://127.0.0.1:4791 node tooling/trace-journey.mjs all` → `chromium: 37 passed, 0 failed`, same for firefox and webkit, last line `trace-journey ✓  all assertions passed on chromium, firefox, webkit`, exit 0.

## Proving the checks
All mutations on chromium against the served working copy, the patched file restored by `cp` from a saved copy after each (`cmp` confirmed byte-identical at the end).

| Mutation | Assertions red (observed) | Notes |
|---|---|---|
| (first-version driver, 29 assertions per engine, for M0 and M2–M5; M1 re-run on the final driver) | | |
| M0 the unpatched player (`git show HEAD:system/trace-player.mjs`) — driver proof on known-bad input | [2], [3], [4], [5] ×2, [7] ×4, on both pages — 18 failed, 11 passed | the driver is not vacuous: it fails the code this ticket replaces |
| M1 swap the table `{ text: 'Did', tool: 'Said' }` | first driver: [3], [4], [5] ×2 on both pages, 8 failed, [7] GREEN. Final driver: the same plus [7]'s parseTrace kind check on 5 of 8 acts, 13 failed | the two `gate` acts are 1 said / 1 did, so a swap is invisible there; see Additions |
| M2 label text cards only | [4], [5] Did (got 0), [7] ×4 on both pages — 12 failed | |
| M3 `aria-hidden="true"` on every label | [6b] on both pages — 2 failed; [5] stays GREEN (27 passed) | the plan's point: role/name alone cannot see a hidden label |
| M4 tally `+ 2` | [7] ×4 on both pages — 8 failed (e.g. `12 steps · 6 said · 18 did`) | |
| M5 drop the `KINDS_NOTE` line | [2] on both pages — 2 failed | |

Positive control [0]: observed true on both traces (demo-notice 8 said / 15 did; pack-seed-verdant 6 / 8), printed in each case's header line.

## Validation results
- `node --check system/trace-player.mjs && node --check tooling/trace-journey.mjs` → exit 0 (observed).
- `node -e 'import("./system/trace-player.mjs").then(m=>console.log(typeof m.parseTrace, typeof m.renderTracePlayer))'` → `function function` (observed, after the patch).
- `grep -n innerHTML system/trace-player.mjs` → no hits (observed).
- `node tooling/build-checks.mjs` → `build ✓  all 51 groups pass` (observed twice: on the staged tree before 699d70f, and on 4d3fe6b plus the staged [7] tightening, i.e. the final tree).
- `node tooling/drift-check.mjs` (both trees) → `drift-check     ✓  syntax · token-css · annotated-source · loc-summary · param-count · icons · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · build-handoff · group-count` (observed).
- `node tooling/token-lint.mjs` (both trees) → `token-lint      ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed).
- `node agent-layer/gen-loc-summary.mjs` after staging → `loc summary ✓  3 groups`, `git status` shows no change to `system/loc-summary.json` (observed) → approach baselines not regenerated, as the plan decides.
- `npm run update:docker` in a clean detached worktree of 699d70f → `33 passed (1.8m)`; `git status` there: only `roundtrip-{neutral,saulera,verdant}.png` modified; no `factory-*` or `approach-*` PNG moved (observed).
- Baseline heights (observed, `sips`): neutral 6773 → 6908, saulera 7086 → 7265, verdant 6762 → 6896 — identical to the plan's expected values.
- Two Did cards screenshotted on `/roundtrip.html` after Show all (chromium, 1280 px; observed): the DID eyebrow sits on its own line above the flex `.trace-step-head`, as SAID does; the card itself is block in all four hand-copied rule sets (`trace.html:43`, `roundtrip.html:45`, `instance.html:212`, `studio.css:1011`).
- Eyeball of `roundtrip-neutral.png` (observed): the note is four muted lines between the label line and the controls, a SAID eyebrow sits above the first card, the Plan head reads `6 steps · 2 said · 4 did`.
- `grep -c trace-journey` → CLAUDE.md 1, gates.md 1, the driver 5 (observed).

## Not run
- `node tooling/vt-verify.mjs` (plan: optional) — not run; the player's morph path is unchanged by the patch. Owner's call.
- Level 4 manual VoiceOver listen-through — owner's hand; [5] and [6b] cover the accessibility tree through Playwright's role/name query only.
- CI `visual` and the CodeQL gate — run after push; not yet observed.
- `tooling/studio-journey.mjs` (its `factoryPass` covers the /factory Traces panel mount) and `tooling/instance-journey.mjs` (the /instance.html mount) — not run. Plan A2's claim that both still pass (factoryPass counts `.trace-step` > 0 and reads `.trace-player` display; instance-journey asserts only the chrome's trace link) was verified by reading the code, not by running it. Owner's call.

## Deviations from the plan
- **[7] as specified could not see M1 (plan error).** The plan expected the table swap to redden [7]. On the plan's [7], it did not: the act tally reads the same `KIND_LABEL` table as the card labels, so a swapped table yields swapped labels and a swapped tally that agree and still sum to the total. Fixed by adding one [7] assertion that each head's said / did equal parseTrace's `text` / `tool` counts for the phase; M1 then reddens [7] (observed). Logged under the plan's AMENDMENTS.

## Assumptions carried
- Q1: label only, no visual demotion of Said cards (plan default).
- Q2: the drafted header sentence ships as written in the patch; the owner may reword it, and [2] stays green while the six checked tokens remain.
- A1: plain-text citation, no link.
- Worktree route (Task 1's alternative), because the primary tree was dirty and on another branch.

## Additions beyond the plan
- [7]'s parseTrace kind check (above), one assertion per act.
- M0 (the unpatched player as a known-bad driver input), per piv-implement's "a driver can lie" step.
- The driver prints each case's step, said and did totals in the case header, so a reader sees the positive control's inputs without reading code.

## Open question for the owner
- **Q3** A refused tool call (e.g. pack-seed-verdant's `Bash` denied by the fence, ✕ on the card) is labelled **Did**, because the label keys on `kind` alone as planned. `replay-driver.mjs` files refusals as a third class. Is "Did" right for an attempted-and-refused call, or should a refused call read e.g. "Refused"? Not changed here; it would be a follow-up touching the label table and [4]/[5]/[7].

## Issues encountered
- None. The served file was curl-verified (`KIND_LABEL` present) on private port 4791 before the first run; that server was started from this worktree and killed by its own PID.
