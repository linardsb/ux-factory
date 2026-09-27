# Implementation Report — Jev contradiction screen before the Grill audit (#453)

**Plan**: `.claude/plans/jev-contradiction-screen-453.md`   **Branch**: `feat/jev-contradiction-screen-453` (worktree `../ux-factory-453`)
**Base**: `a9918a9` at start → `a9918a9` at report (`git fetch` + `git merge origin/main`: already up to date)   **Head**: `e473451`
**Status**: PARTIAL — the code, the gate, the CLI screen and 20 of run 3's 23 turns are done. Run 3 stopped at t21 on
`Credit balance is too low`. Three turns, the close, the projection and the owner's labels remain (§Not run).

## Summary

Built the claims splitter (`discovery/claims.mjs`), the two-stage Jev screen (`portal/lib/discovery-screen.mjs`),
its operator CLI (`tooling/jev-screen.mjs`), the conditional tensions block in Grill's audit system prompt with
its own `screenFingerprint` (plan D1), the create-path screen in the session route plus its drawer status line,
the projection's Tensions section with `raisedBy`, and build-checks group 45. Grill's two stamps and all 11
committed packages' `prd.md` bytes are unmoved. **Both real screens missed all six scored MVP 13 findings at
stage 1**: every anchor claim picked `none` (0/3 contradiction-class, 0/3 tension-shaped, per screen). Each
screen kept three other pairs.

## Tasks completed

- Task 0: worktree `../ux-factory-453` off `origin/main`; `npm ci` in `tooling/icons`, `portal` and
  `tooling/style-dictionary`. The last one is not in the plan, but drift-check's sd leg needed it (observed).
  `TYPESAFE_API_KEY` copied from `../wt-454/portal/.env`; the primary tree's `.env` has none.
- Task 1 → `discovery/claims.mjs` (CREATE). 90 claims on the fixture (observed), not the planning estimate of 88.
- Task 2 → `tooling/jev-screen.mjs` `--claims` + `tooling/jev-screen/fixture-claims.json` (CREATE).
- Task 3 → `docs/epics/fixtures/discovery-partner.screen-rubric.md` (CREATE).
- Task 4 → `portal/lib/discovery-screen.mjs` (CREATE).
- Task 5 → `tooling/jev-screen.mjs` paid mode, `--smoke`, `--labels-template`.
- Task 6 → `portal/lib/discovery-postures.mjs` (UPDATE): `TENSION_RULE`, `tensionsBlock`, the guard, `SCREEN_FINGERPRINT_INPUTS`, `screenFingerprintOf`, and header bullet 5.
- Task 7 → `portal/lib/discovery-transport.mjs` (UPDATE).
- Task 8 → `portal/lib/discovery.mjs` (UPDATE).
- Task 9 → `portal/server.mjs`, `portal/public/portal.js` (UPDATE).
- Task 10 → `discovery/prd-projection.mjs` (UPDATE).
- Task 11 → `discovery/README.md` (UPDATE): §Files, the three/five-files paragraph, and §The contradiction screen. The §The screened audit section waits on run 3.
- Tasks 12–14 → `tooling/build-checks.mjs`: group 45 (45.1–45.11), 32.7, 34.5b.
- Task 15 → `CLAUDE.md`, `.claude/references/gates.md`, and the pass line (44 → 45).
- Task 16 → commits `f81236c` (pre-registration) and `e604f6d` (code), both before any answered call.
- Task 16b → smoke run; calibration commit `469d810`.
- Task 17 → `tooling/jev-screen/screen-run.json` (commit `a9a88be`).
- Task 18 → `discovery/partner-audit-3/` opened and recorded through the real drawer, t1–t20. **Uncommitted: the session is open.**
- Task 19 → `tooling/jev-screen/labels.json` template (commit `e473451`), every `real` null.

## Tests added

Group 45 in `tooling/build-checks.mjs`, 45.1–45.11 as the plan specifies, plus source pins in 45.7 on the
transport and `runTurn` wiring, which CI cannot import. It is green on every case except 45.9's real half,
which reds naming `discovery/partner-audit-3/prd.md` as missing (observed, final run). 32.7 now covers
`partner-audit-3` as an iff invariant (amendment, below). 34.5b takes `screen.jsonl`.

## Proving the checks

Every row was run once on the working tree, then restored from a scratch copy. The driver
(`scratchpad/mut.py`) first read stdout only and reported "NO MATCH" for all five of its first mutations. The
failures print to stderr. That false negative was fixed and every mutation re-run; the rows below are the
re-runs (observed).

| Check | Mutation | Observed failure |
|---|---|---|
| 45.1 | `import './discovery.mjs'` in the screen | `45.1: discovery-screen.mjs imports ["./discovery.mjs"] beyond [...]` |
| 45.2 | nested items become continuations | `45.2: splitClaims(fixture) differs from fixture-claims.json at c052` |
| 45.3 | the table header is kept as a claim | `45.3: the table header became a claim` |
| 45.4 | the target's own id is offered | `45.4: pick_c001 offers c001 itself` |
| 45.5 | `>` for `>=` on T2 | `45.5: a pair at contradicts 0.5 exactly was dropped` |
| 45.6 | `screenSession` rethrows | `45.6: screenSession threw on a 429 instead of writing unavailable (...)`, and the same for the other three failures |
| 45.7 | the block renders with an empty list | `45.7: Grill's audit prompt carries the tensions block with no tensions — Grill's prompt surface MOVED`, plus 30.46 ×2 and 32.7 ×2 |
| 45.8 | `K = 2` | `45.8: produced lines differ from screen-run.json at pair c035 ↔ c066` |
| 45.8 control | a kept pair's `contradicts` flipped in memory | built in; green means `kept` moved |
| 45.9 | the raised rule accepts either id | `45.9: a flag naming only c017 reads raised`; `45.9: an id matched inside a longer word` |
| 45.10 | temp roots under `discovery/`, never removed | `45.10: the group moved a tracked path — …` |
| 45.11 | one pair deleted from `labels.json` | `45.11: labels.json is missing c035 ↔ c066 from partner-audit-3` |
| 32.7 | `TENSION_RULE` edited by one character | `32.7: discovery/partner-audit-3 carries screenFingerprint ["1dd1b6e4"] but the current screened grill (claude-opus-5) surface is a6494eea …` |
| 32.7 | the gate expects the by-id stamp | `… surface is b0908cff …`: the recorded stamp is the Opus-resolved one |
| 34.5b | `screen.jsonl` removed from the expected list | `34.5b: prd-projection.mjs reaches [...,"screen.jsonl",...] …` |
| group-count | `gates.md` left at 44 | `drift ✗  group-count drift: .claude/references/gates.md: says 44 groups, build-checks defines 45` |

The first attempt at the 45.7 mutation (rendering the block with the fingerprint's fixed tension) crashed at
import (TDZ) and proved nothing. It was replaced by the empty-list form above.

## Validation results

- `node tooling/build-checks.mjs` → `build ✗ 1 failure(s)`, which is 45.9's missing `prd.md`. Every other case of all 45 groups is green (observed, on `e473451`).
- `node tooling/drift-check.mjs` → `drift-check ✓ syntax · … · group-count` (observed).
- `node --check` on the three new `.mjs` files → clean (observed).
- Stamps after Task 6 (observed): Grill `76b7847d…`, Grill-on-Opus `ba124c3c…`, Think `7efdde37…`. All three are unchanged from the plan's printout.
- Screened stamp, Grill on Opus: `1dd1b6e4d0aaf43273190239ac74f18a` (observed). It is pinned in 45.7 and carried by all 20 recorded turns.
- Projection: the new module and `origin/main`'s give byte-identical `--stdout` on all 11 committed packages (observed, md5 compare).
- Portal smoke with no key (`.env` moved aside): `/api/health` ok. An audit open wrote one line, `{"type":"unavailable",…,"reason":"jev: TYPESAFE_API_KEY is not set in portal/.env"}`, and the route returned `screen: {status:"unavailable"}`. The throwaway package was deleted (observed).
- The drawer at run 3's open showed `Opened partner-audit-3. Contradiction screen: 3 pair(s) kept.` (observed, Playwright on the served page).

### The screens (Jev)

| | Smoke (never scored) | CLI screen (`screen-run.json`) | Run 3's screen (`partner-audit-3/screen.jsonl`) |
|---|---|---|---|
| Requests | 3 | 4 (stage 1: 3, stage 2: 1) | 4 |
| Input tokens, observed from `usage` | 12,688 + 1,114 + 38,875 = 52,677 | 119,075 | 119,490 |
| Cost, derived at $0.042/M | $0.0022 | $0.0050 | $0.0050 |
| Non-`none` picks · candidates · kept | — | 5 · 4 · 3 | 5 · 5 · 3 |
| Kept pairs (contradicts, same) | — | c005↔c061 (0.98, 0.85) · c029↔c030 (0.88, 0.88) · c035↔c066 (0.71, 0.78) | c005↔c061 (0.98, 0.86) · c029↔c030 (0.88, 0.88) · c035↔c066 (0.71, 0.77) |
| Latency | 490 / 278 / 621 ms | p50 517 ms, max 1,187 ms | not measured (the route does not time) |

### Scoring against the pre-registered rubric (per screen, never rounded up)

| Finding | Class | CLI screen | Run 3's screen |
|---|---|---|---|
| #2 transition note vs example | contradiction | MISSED | MISSED |
| #6 parity | contradiction | MISSED | MISSED |
| #8 ~30 / thirty / 10 stages | contradiction | MISSED | MISSED |
| **found / 3** | | **0 / 3** | **0 / 3** |
| #4 AI module, no run | tension-shaped | MISSED | MISSED |
| #5 existing-PRD entry | tension-shaped | MISSED | MISSED |
| #7 prefix vs solo user | tension-shaped | MISSED | MISSED |

Where each miss happened (CLI screen; `pick` lines): every anchor claim picked `none`. c054 0.74, c044 0.35,
c056 0.66, c043 0.61, c077 0.66, c018 0.57, c045 0.67, c048 0.36, c028 0.29, c033 0.45, c042 0.60, c049 0.59,
c034 0.46. This is the plan's R6 (indirection over 89 id-named options) observed. No stage-2 threshold was
reached, so D3's thresholds did not decide any miss. The next step is the plan's named follow-up, a
pre-registered text-criteria variant. It is not a change to this run.

**Precision** = owner-judged real / kept, from `tooling/jev-screen/labels.json`. Not yet labelled (n = 3 per
screen). The session does not judge whether the pairs are real.

**Raised by the audit (run 3, D4)**: after t20, none of the three kept pairs is raised. No
`flag_weak_answer` among the 15 filed names a claim id, and `raisedBy` returns null for all three (observed).
This is interim until t21–t23 run.

### What Jev saw (AC #3)

Every request body is in `screen-run.json` (`requests[i]`, with its question ids) and was built by
`stage1State` / `stage2Questions` from the fixture's claims and `QUESTION_TEMPLATES`, and from nothing else.
The MVP 13 answer key lives in `docs/epics/discovery-partner.prd.md` and in the two rubrics, and neither is in
any request. Jev is a classifier endpoint with no tools, so run 2's fence problem cannot recur.

### Run 3 (Claude)

`partner-audit-3`: fictional · existing-prd · full-discovery · facets `hasModel` only · Grill on `claude-opus-5`
· `frontEnd: portal` · fixture md5 `ab6eb0ee…` (observed). Every head field equals `partner-audit-2`'s except
`frontEnd` (`terminal` there), which D6 intends. t1–t20 are recorded, each `ok: true` and each stamped
`screenFingerprint 1dd1b6e4…` and `postureFingerprint ba124c3c…`. Cost is **$1.5402**, the sum of `turnStats`
`costUsd` (observed); run 2 cost $1.6152 over 23 turns. t21 wrote one transcript line,
`{"type":"text","turn":"t21","text":"Credit balance is too low"}`, and no stats entry. The portal answered
`Claude Code process exited with code 1`.

## Not run

| Step | Why | Tracker |
|---|---|---|
| Run 3 t21–t23, the close, `node discovery/prd-projection.mjs partner-audit-3`, and the package commit | The Anthropic credit balance ran out at t21 | Owner: top up, then resume from disk (below). 45.9 stays red until then |
| README §The screened audit (partner-audit-3) | Needs run 3's final numbers | Same |
| Owner labels (`real`, `by`, `at` in `labels.json`) | The owner's call | Owner |
| Confirming the kept-0 re-open rule | Never exercised: run 3's first open kept 3 | — |
| A resume re-screening nothing, observed through the route | The resume-path POST used for the check omitted the document and was refused by name; the `view.created` gate was verified by reading the code | 45.7 source pins cover `runTurn`'s read, not the route |
| CI (`gh pr checks`) | No PR opened yet | `piv-create-pr` |

**To resume run 3**: `cd ../ux-factory-453/portal && PORT=<free> node server.mjs`, then drive the drawer's
"Start or resume" with slug `partner-audit-3` and "Audit this question" three more times, then Finish. The
Playwright driver used for t1–t20 is `scratchpad/drawer.cjs` (`turns <port>`, then `finish <port>`). Answer
inside five minutes of each turn for the prompt cache. Then run `node discovery/prd-projection.mjs
partner-audit-3` and commit the package unedited.

## Deviations from the plan

- **The token estimator was calibrated after the pre-registration commit (plan error, amended in the plan
  before the full run).** `chars/3` was not conservative: a request it estimated at 55,580 tokens was refused
  `400 max_tokens_exceeded`. `CHARS_PER_TOKEN` was set once, from the smoke, to 1.5 (`469d810`, 10:08:02Z,
  before the CLI run's `ranAt` 10:08:02.317Z). Stage-1 batching moved from 2 requests to 3. `t1` stayed 0 on
  both screens, and no threshold or wording moved.
- **The smoke gained a third request** (full state, 30 questions) so the per-question token cost could be
  solved for. The plan's single stage-1 request mostly measured prose.
- **Task 5's free VALIDATE (plan error).** `TYPESAFE_API_KEY= node …` did not blank the key, because
  `env.mjs` refills an empty value. It sent a real full-screen request at about 09:52Z, before the
  pre-registration commit (09:56:14Z). The request was refused 400 with no answers. It is disclosed in the rubric
  and the amendments. The no-key checks were re-run with `portal/.env` moved aside.
- **45.8's mutation is `K = 2`**, not `K = 9`: three pairs were kept, so K = 9 cannot change a line.
- **The kept-0 branch was registered before run 3 opened** (plan amendment). 32.7 was rewritten as "a turn
  carries `screenFingerprint` iff the package's screen kept a pair", and 45.9's positive control branches on
  `summary.kept`.
- `chooseT1(picks, claims)` takes the claims too. Request size depends on the claim texts, so the plan's
  one-argument signature could not compute the proviso.
- `QUESTION_TEMPLATES` holds every word Jev is shown, and `questionsSha` hashes it. The plan named "the
  templates + criteria" without a home.

## Assumptions carried

- Q1 default: D1, a conditional block with a separate stamp. Q2 default: the rubric's classes as listed. The
  owner overrode neither before the cut-offs.
- The route runs the screen outside `withDiscoveryRunLock`, as the plan's snippet does. That lock refuses
  rather than waits, and the drawer holds the person on the status line while it runs.

## Additions beyond the plan

- 45.7 source pins on the transport's `posture.build({… tensions})` + stamp and on `runTurn`'s
  `tensionsOf(readScreen(root))`. The runtime path imports the SDK and is unreachable in CI, so without them
  a wiring removal would pass group 45.
- `tensionsGuard` refuses a malformed tension by name, not only a misplaced one.

## Issues encountered

- **The Anthropic credit ran out at t21** (above).
- **The driver was killed mid-turn by my misreading.** I read the Playwright driver's log while t2 was still
  running (32 s), took it as stuck, and killed it by PID during t3's wait. t3 finished server-side: one
  closing op, one `ok` stats entry, stamped (observed). The driver resumed from disk at t4. The record has no
  gap and no duplicate.
- The mutation driver's first stdout-only run gave false "NO MATCH" results for five mutations. It was fixed
  before any row above was recorded.
- `tooling/style-dictionary` also needs `npm ci` in a fresh worktree, or drift-check's sd leg reds.
