# Implementation Report — options, not answers, at forks (#320, D5)

**Plan**: `.claude/plans/forks-two-options-320.md`   **Branch**: `feat/forks-two-options-320` (worktree `../wt-320`)   **Base**: `2bc65de` → `2bc65de` (origin/main unmoved at report time; `git fetch` observed)   **Status**: COMPLETE (the paid sitting row and the owner's issue checkboxes are out of scope; see Not run)

## Summary
A fork turn drafts two options of one screen, and the owner picks one. `screen.compose` gains a server-set
`alternative {turn, option a|b, fork}`, and the applier refuses a third option and a second option of one turn
landing. The store admits exactly the sibling proposal, requires a pick (accepted + refused) or Neither (refused +
refused) in ONE save, checks the same-`at` witness on committed ledgers, and derives "not picked" (`notPickedOf`).
The fork list (`forkList`) is a read over open questions no later decision closed plus decisions flagged at ask
time. The page shows the options as cards with Pick A / Pick B / Neither, chips the picked frame `Fork <seq> ·
option B`, and lands inbox fork rows on the fork input. The inbox gains a tenth kind, `fork`.

## Tasks completed
- Task 0 → worktree `../wt-320` off `origin/main` `2bc65de`; plan, brief and prototype copied in; `git apply` of
  `forks-two-options-320.proto.patch` clean; `npm ci` in portal, tooling/icons, tooling/visual-regression,
  tooling/style-dictionary.
- 1.1, 1.2 → `system/canvas-ops.mjs` (UPDATE): the `alternative` param + refusals, `ALTERNATIVE_KEYS`/`OPTIONS`,
  `forkFrame`, `forkList`, and the `FORKS (#320, D5)` header paragraph (added to the prototype).
- 2.1–2.6 → `portal/lib/canvas-store.mjs` (UPDATE, prototype reviewed as-is): `loadOpenQuestions`, the sibling rule,
  the same-save rule, `notPickedOf`, the `verifyBuild` witness + redo rule, the trace rule's tag projection.
- 3.1–3.5 → `portal/lib/canvas-session.mjs` (UPDATE, prototype reviewed as-is): `FORK_LEAD`, `FORK_ASK`,
  `FORK_MAX_TURNS`, `maxTurnsFor`, the fork ask's shape, option tagging, `notDraftedLine`, fork validation,
  `composeView`'s `options` / `forks` / `last.fork`.
- 3.6 → `tooling/fake-compose-agent.mjs` (UPDATE): the fork branch (prototype) + the header's three fork rows and a
  CANNOT REACH clause (added).
- 4.1 → `portal/lib/inbox.mjs` (UPDATE): the `fork` kind, `CANVAS_KEYS` + `fork`, "THE TEN KINDS" header row.
- 4.2 → `agent-layer/gen-build-handoff.mjs` (UPDATE): "— refused: not-picked" in `refusals.md`.
- 4.3 → `portal/server.mjs` (UPDATE): comment only; the 47.14-pinned call line untouched.
- 4.4 → `tooling/run-316-ready.mjs` (UPDATE): check 4 pins `"alternative"` by name; `SEGMENT_A_PARAMS` dropped.
- 5.1 → `portal/public/canvas.mjs` (UPDATE): fork input + datalist + "Ask for two options", option cards, Pick/Neither
  handlers (every check before the first push, both lines in one synchronous handler), accept/refuse guarded while
  options wait, the fork chip, `lastSentence`'s fork lines, `?fork=`, header call 6.
- 5.2 → `portal/public/portal.css` (UPDATE): `.cv-compose-options`, `.cv-compose-fork`, `.cv-chip-fork` (see Deviations).
- 6.1 → build-checks 35.20 · 6.2 → 36.16 · 6.3 → 47.2, 47.2b (re-pinned `32e186e7fedd687d`), 47.19 · 6.4 → 49.14 ·
  6.5 → 51.4 fork, 51.6 (ten), 51.9 → `tooling/build-checks.mjs` (UPDATE).
- 6.6 → `tooling/canvas-journey.mjs` (UPDATE): `seed()` + `seedPark` + `forkPass` F1–F8, header paragraph, final ✓ string.
- 6.7 → gate prose in three copies: group strings + fixture headers in build-checks, `.claude/references/gates.md`
  (groups 35, 36, 47, 49, 51 and canvas-journey), the fake's header.
- 7.1 → `docs/epics/canvas-design-import.architecture.md` (UPDATE): "D5 as built (#320 …)".
- 7.2 → `system/loc-summary.json` + approach baselines — see Validation results.

## Tests added
build-checks (observed `build ✓  all 51 groups pass`):
- **35.20** the tag stored/absent; six named refusals; the twin refusal + another-turn control; `forkList` on
  literal rows, the stand-in, `forkFrame`, five junk shapes; `PARAMS["screen.compose"]` six keys.
- **36.16** a: AC #3 cross-reader on later-not-never-1 `[17]`, partner-audit-1 `[3]`, graded-opus-a (loader =
  ledgerView = prd.md headings = forkList), the seeded park listed on a finished copy then omitted by a later
  decision while `loadOpenQuestions` keeps it; b: sibling rule + four refusals, bytes unchanged; c: same-save
  refusals + pick + Neither; d: witness mutations + redo control; e: `notPickedOf`; f: trace rule.
- **47.19** a–h: ask shape, two/one/three options, two screens, fork validation (file_evidence seq, superseded
  decision, picked fork refused; current decision and parked question run), the pick's `last.fork` and
  `verifyBuild` `[]` with the trace rule on, the fork prompt.
- **49.14** not-picked suffix + Neither control. **51.4 fork**, **51.6** ten kinds, **51.9** fork href + frame/fork refusal.
canvas-journey pass **F1–F8** on three engines (results below).

## Proving the checks
Each mutation applied to the working tree by a driver that asserts the target string occurs exactly once, runs
`node tooling/build-checks.mjs`, greps the named failure line, and restores from a byte copy (observed; the
restored tree then printed `build ✓  all 51 groups pass`).

| # | Mutation | Case that went red (observed message, abridged) | Positive control |
|---|---|---|---|
| M1 | `ALTERNATIVE_OPTIONS` → `["a","b","c"]` | `35.20b option "c" must be refused … — option "c" was accepted — a fork offers two` | 35.20a tag stored |
| M2 | twin refusal disabled | `35.20b option b of c4 landed beside option a — NO THROW` | 35.20b other turn accepted |
| M3 | `forkList` closed-by-decision clause deleted | `35.20c seq 17 listed, closed by decision 20` | 35.20c seq 18 listed |
| M4 | `forkList` dedupe deleted | `35.20c seq 18 listed twice` | — |
| M5 | `appendAgentLine` back to `opens[0]` | `36.16b option b refused as still waiting` | — |
| M6b | `checkVerdict`'s whole sibling block removed | `36.16c accept b alone was saved … — NO THROW` (and refuse a alone) | 36.16c pick + Neither save |
| M7 | witness "another save" clause disabled | `36.16d an answer in another save passed — []` | 36.16d picked ledger `[]`, redo `[]` |
| M8 | `t?.alternative` dropped from `TOOL_PARAMS` | `36.16f two proposals whose op lines carry alternative must trace — got [...]` | — |
| M9 | `loadOpenQuestions` filters a wrong op name (substitute, see Deviations) | `36.16a later-not-never-1: loadOpenQuestions [], ledgerView [17], prd.md [17], forkList []` | 36.16a seeded park listed |
| M10 | `maxTurnsFor` always `MAX_TURNS` | `47.19b: stats.maxTurns 4, want 5` | — |
| M11 | tag built AFTER `applyOp` in `fileProposal` | `47.19d: want one agent refused ledger line for the third option — got ["agent:proposed","agent:proposed"]` | 47.19b two options |
| M12 | "neither … nor" guard disabled | `47.19f: fork "1" (a file_evidence seq) ran a turn … — NO THROW` | 47.19f current decision, parked question run |
| M13 | not-picked suffix dropped | `49.14 the unpicked option's line — refused: not-picked missing` | 49.14 Neither control |
| M14 | `"fork"` removed from `KINDS` | `51.6: KINDS is [...9 kinds...]` | 51.4 fork row appears before it clears |
| M15 | inbox `kind !== "open-question"` filter dropped | `51.4 fork: a stand-in listed a flagged fork — [... "fork fork:11"]` | 51.4 fork row listed on a finished copy |
| A4 | `"alternative"` → `"alternatives"` in `PARAMS` | `run-316 ✗  check 4 — #320 has not landed: … with no "alternative" param (D5)` | finished tree: `grep -c 'check 4'` → 0 |
| A1 | page: `await` between the accepted and the sibling refused push | journey chromium: `✗ F3 · the last two lines are accepted B and refused A … []`, F4×2, F5×3, 16 (a 500 on the half save) — `252 passed, 7 failed` | journey green on the restored file |

M6's first form (only the `!v` throw removed) reddened 36.16c through a TypeError on `v.status`; M6b, the plan's
"drop the sibling check", is the recorded proof.

## Validation results
- L1 `node --check` on the plan's nine files → all ok (observed).
- `node tooling/token-lint.mjs` → `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed).
- `node tooling/build-checks.mjs` → `build ✓  all 51 groups pass` (observed, final tree).
- SDK-free: `mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs` → `build ✓  all 51 groups pass`, restored (observed).
- `node tooling/drift-check.mjs` → `drift-check ✓  syntax · token-css · … · build-handoff · group-count` (observed, before staging — its loc-summary leg reads the index; see Task 7.2 below).
- `node agent-layer/gen-build-handoff.mjs --check` → `build handoff  ✓  2 packages, 8 files — no drift` (observed).
- `node tooling/run-316-ready.mjs 2>&1 | grep -c 'check 4'` → `0` (observed).
- Task 1.1/1.2/2.1/3.1 VALIDATE one-liners → each printed the plan's expected output (observed): the tag JSON, "a
  third", "already landed as f1"; `[["18","open-question","z","open"],["11","flagged","s4","open"]]`;
  `[17]` `[3]` `[]`; `32e186e7fedd687d 5 4`.
- `node tooling/canvas-journey.mjs all` (run 1, before the layout change) → chromium 259/0, firefox 258/0, webkit
  258/0, 25 F assertions per engine (observed). Run 2 (final CSS and F2 layout assertion) → chromium 259/0, firefox 258/0, webkit 258/0, 75 F assertions in all (observed). The plan's 212/211/211 baseline is pre-#319/#498; the per-engine one-pass gap (chromium +1) predates this ticket.
- Portal smoke: `PORT=4931 … node server.mjs`, `/api/health` → `{"ok":true,…,"stale":false}`, killed by its PID (observed).
- Level 4 eyeball: chromium screenshots of the compose rail at 1440×900 (scratchpad, not committed): see Deviations.
- Task 7.2: after staging by path, `node agent-layer/gen-loc-summary.mjs` moved the runtime group's `linesApprox`
  33100 → 33200 (observed; the only line that changed), and `--check` → `loc summary ✓  3 groups — no drift`
  (observed, staged). Approach baselines: `rm` of the three PNGs then `npm run update:docker` from a clean detached
  worktree `../wt-320-vr` at `2d467df` — first run `32 passed, 1 failed` (approach · neutral: "generating new stable
  screenshot expectation … Timeout 5000ms", the known countUp flake), second run `33 passed` (observed); `git status`
  there listed exactly `approach-neutral.png`, `approach-saulera.png`, `approach-verdant.png`.

## Not run
- The paid row: a REAL fork turn (does a model file two options under `FORK_ASK` while `LOOP` says once?) and the
  owner's pick in that sitting — tracker #316 (T12 step 3), per the plan's paid table. Never drafted by an agent.
- The two #320 issue checkboxes (PR #495 F3, PR #499 F3) are not ticked: an outward-facing edit — owner's call.
- CI `visual` and CodeQL: run on the PR, not locally.

## Deviations from the plan
- **The option cards are STACKED in the rail, which departs from the owner's Q2 answer** (plan §OPEN QUESTIONS Q2,
  2026-10-02: "two side-by-side cards, 'Option A / Option B'") and from Task 5.2's `1fr 1fr`. The Level 4 eyeball
  showed the rail is ~240px wide: side by side gave ~115px cards, the screen previews clipped, and B's
  distinguishing hint wrapped one word per line (`.claude/reports/forks-two-options-320/rail-side-by-side.png`).
  The grid is `repeat(auto-fit, minmax(min(16rem, 100%), 1fr))`, which in today's rail ALWAYS stacks — the owner
  will not see the cards side by side unless the rail widens (`rail-stacked.png`). Even stacked, the screen-header
  title truncates ("Set…"); in the fake's options the hint is the only visible difference, so options a real model
  distinguishes by title would not compare at a glance. A first `minmax(16rem, 1fr)` overflowed the panel by its
  256px minimum (measured after the `min()` fix: grid right 1407 vs panel inner right 1408). F2 asserts "A before B,
  not overlapping" in either arrangement, and gates.md says the same. **Owner's call (Q1 in the hand-off):** keep
  stacked, or give the open pair a wider surface.
- `var(--space-sm)` → `var(--spacing-xs)` **(plan error)**: portal.css's spacing tokens are `--spacing-*`.
- 36.16a's REDDENS substitute **(plan error)**: "make `forkList` read questionCleared-style finish" cannot be
  expressed (`forkList` takes no `run.json`); M9 (`loadOpenQuestions` reading a wrong op) reds 36.16a by name instead.
- 51.4 open-question A gained an `alsoClears` predicate on `cleared`: the clearing decision now also clears the
  fork row, which the case names (one row, by subject). Widens #319's "every other row unchanged" by exactly that row.
- Staged by explicit path, not Task 7.2's `git add -A` (a shared tree; CLAUDE.md §Git).

## Assumptions carried
- Plan A2 (the agent picks the screen; one screenId across options), A3 ("on the frame" = the resolving frame's
  chip), A4 (`FORK_MAX_TURNS = 5`) and the owner's Q1/Q2/A1 answers, as written.
- The pick pushes accepted-then-refused (the plan's order); every check runs before the first push.
- `?fork=` fills and focuses the input and runs no turn; asking stays the owner's press.

## Additions beyond the plan
- `ui.proposal-accept` / `ui.proposal-refuse` return early while `compose.options` is set, so an Accept or Refuse
  emitted at a fork option (by a bus caller) cannot save half a pair.
- A one-option fork shows "The agent drafted one option; the alternative was not drafted. Pick it, or Neither …"
  and the pick sentence omits the not-picked clause when there is no sibling.
- `.cv-compose-fork` input styling (44px min height, focus ring) and `.cv-chip-fork` (accent border), token-only.
- PR #499 F3 (quadratic `staleOf` in `frameSig`): not needed — options render in the rail; no stage frames added.

## Issues encountered
- The fake's cwd guard refused a scratch package under `/tmp` during the eyeball run (macOS `os.tmpdir()` is
  `/var/folders/…`): the guard working; re-run under `os.tmpdir()`.
