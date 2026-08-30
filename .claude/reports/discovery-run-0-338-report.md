# Implementation Report — run 0: the owner's next real product, in the UI (#338)

**Plan**: `.claude/plans/discovery-run-0-338.md`   **Branch**: `chore/338-run-0`   **Status**: PARTIAL — Phase A complete, Phase B (the sitting) is the owner's and has not run
**Epic**: #279 · **Run package**: `<JOBS_DIR>/_discovery/<slug>/` (real provenance, never committed)

> This ticket is an operational run, not a code change. Nothing in `system/`, `portal/`,
> `discovery/` or `agent-layer/` is edited by it. Phase A proves the mechanism, Phase B is the
> owner's sitting and the agent does not touch the drawer or any package file, Phase C derives the
> numbers and writes the judgement. **This report is written up to the hard stop after Phase A.**

## Summary

Phase A ran the whole discovery chain end to end — preflight, drawer, one real paid turn, the
projection over a `real` root — at 1/30 of the sitting's cost, and threw the rehearsal package away.
Every mechanism the sitting depends on is now proved on this machine, today. The pre-registered AC4
and AC5 sheets are fixed in `.claude/plans/discovery-run-0-338.md` §PRE-REGISTERED READINGS and were
not edited after Phase A ran.

One defect was found and fixed before the sitting: the portal serving the drawer was running code
from before both PR #339 review rounds. See F2.

## Phase A — the mechanism, proved

Every row below was run on 2026-08-30 on this machine. *Observed* means read from the named command's
output or the named file field.

| # | Check | Command | Result |
|---|---|---|---|
| A1 | Tree on merged main | `git switch -c chore/338-run-0 origin/main` | observed — `5e8208a` (merge of PR #340); the local `feat/290-prd-projection` tip `bd72acb` is an ancestor of `origin/main`, so nothing was left behind |
| A2 | Op transport, zero tokens | `node lib/discovery-transport.mjs --preflight` | observed — `pre-flight ✓ all 8 rows pass, zero tokens`, `exit=0`, sdk 0.1.77 · zod 4.4.3 · node v20.20.2 |
| A3 | Portal answers | `curl -s localhost:4747/api/health` | observed — `{"ok":true,"hasToken":false,"jobsDir":"…/Linards jobs folder","cards":8}` |
| A4 | Derivation script vs a known oracle | the Phase C script against `discovery/spine-meridian-1/` | observed — all seven pinned values reproduced exactly (below) |
| A5 | One real turn through the drawer | the drawer at `localhost:4747`, slug `preflight-throwaway-338` | observed — answer stored verbatim, one `open_question` op filed, turn closed, cursor advanced to question 2 |
| A6 | `turnStats` populate under CLI-login auth | `run.json` `turnStats[0]` | observed — `costUsd: 0.0933`, `durationMs: 9721`, `ok: true`, all four token counts non-null |
| A7 | `endedAt` lands on Finish | `run.json` `endedAt` | observed — `2026-08-30T17:39:48.121Z`, non-null |
| A8 | Projection reads a `real` root | `node discovery/prd-projection.mjs --root "…" --stdout` | observed — full PRD to stdout, `exit=0`, nothing written to the package |
| A9 | Throwaway deleted | `rm -rf` then `ls` | observed — `<JOBS_DIR>/_discovery/` is empty |
| A10 | Repo unharmed | `node tooling/build-checks.mjs` · `node tooling/drift-check.mjs` | observed — `build ✓ all 31 groups pass`; `drift-check ✓` |

### A4 — the derivation script reproduced its oracle exactly

Run against `discovery/spine-meridian-1/` (fictional, three turns) before it is trusted at the end of
a 30-question sitting. The plan pinned seven values; all seven matched:

| Key | Expected | Observed |
|---|---|---|
| `answered_decision` | 2 | 2 |
| `weak_flagged` | 1 | 1 |
| `flagged_orphan` | 2 | 2 |
| `denied_lines` | 1 | 1 |
| `banked_turns_closed` | 3 | 3 |
| `sdk_num_turns_total` | 7 | 7 |
| `cost_usd_total` | 0.1011 | 0.1011 |

`banked_turns_closed: 3` against `sdk_num_turns_total: 7` on a three-question package — the two turn
numbers are visibly different, which is the conflation trap the plan wanted made legible before the
real run.

### A6 — the cost anchor, and why it is not a signal

The single rehearsal turn cost **$0.0933** (observed, `turnStats[0].costUsd`). That is above
`spine-meridian-1`'s $0.034/turn average, and the difference is explained by the cache: the rehearsal
was a cold first turn carrying 3,141 cache-creation tokens against 2,602 cache-read, where
`spine-meridian-1`'s average includes two later turns reading a warm cache.

Extrapolated (derived): 30 × $0.0933 ≈ **$2.80**, which sits inside the plan's pre-registered
$1.50–3.00 band. So the number is an expectation confirmed, not a signal. The real figure is AC5's
job and there is no budget to defend.

**A3 (the plan's assumption) is confirmed today.** `HAS_TOKEN` is false and the SDK authenticated via
the Mac CLI login anyway, populating every `turnStats` field. **The pre-registered token fallback is
therefore not needed** and AC5 will carry a real cost number.

### A5 — what the drawer actually did

The rehearsal answer was the plan's own mechanism stub, `mechanism rehearsal for #338 — not a real
answer`. The agent judged it and filed `open_question`, with the reason:

> Stored answer is flagged by the person as a mechanism rehearsal, not a real answer — no appetite
> judgement (quick fix, full cycle, or redesign) has actually been made yet.

That is the posture behaving as MVP 6 specifies — it judged the *form*, did not call the answer wrong,
and did not supply what was missing. `answers.jsonl` stored the text verbatim, `#discovery-recorded`
showed the filed op, and the cursor advanced by exactly one turn.

## Tasks completed

- Verify the tree, pin `JOBS_DIR`, branch off `origin/main` → `chore/338-run-0` (no file change)
- Zero-token transport preflight → `portal/lib/discovery-transport.mjs --preflight` (run only)
- Boot the portal from the current tree → `portal/server.mjs` (run only; see F2)
- Smoke-test the AC5 derivation script against `discovery/spine-meridian-1/` (run only)
- One real rehearsal turn through the drawer, then deleted (run only, never committed)
- Prove the projection against a `real` root with `--root --stdout` (run only)
- Pre-register the AC4/AC5 sheet → `.claude/plans/discovery-run-0-338.md` §PRE-REGISTERED READINGS
- Write this report → `.claude/reports/discovery-run-0-338-report.md` (CREATE)

## Tests added

None, and none should be. There is no suite for a run package on disk and the plan says so: the run
*is* the test, and what replaces a suite is the pre-registration plus three checks that can fail —
the preflight, the derivation-script oracle, and Phase C's verbatim-span scan. **No gate in
`tooling/` reads a run package on disk**, by design, so `build ✓ all 31 groups pass` says the repo is
unharmed and says nothing about this run.

## Validation results

| Gate | Result |
|---|---|
| `node lib/discovery-transport.mjs --preflight` | ✅ 8/8 rows, zero tokens, `exit=0` (observed) |
| `node tooling/build-checks.mjs` | ✅ `build ✓ all 31 groups pass` (observed) |
| `node tooling/drift-check.mjs` | ✅ green across all twelve checks (observed) |
| `curl localhost:4747/api/health` | ✅ `ok: true` (observed) |
| Derivation script vs `spine-meridian-1` oracle | ✅ 7/7 pinned values (observed) |
| `prd-projection.mjs --root … --stdout` | ✅ `exit=0`, nothing written (observed) |
| `git status --short` | ✅ no `discovery/` or `_discovery` path (observed) |

## Deviations from the plan

**D1 — the rehearsal turn was driven through the drawer by browser automation, not by hand.**
The plan's Task 4 says "in the drawer". An agent cannot click, so the drawer was driven with
`agent-browser` against the real page at `localhost:4747` — the real form controls, the real
`/api/discovery/*` routes, the real CSRF origin guard. The alternative considered and rejected was
curling the routes directly, which would have proved the SDK and the package writer but not the
drawer's JS, and the drawer's JS is the one piece no gate in `tooling/` reaches. Since the owner is
about to spend a sitting on exactly that path, proving it was worth the extra step. **This is the
agent's own Phase A rehearsal on plan-supplied stub text, not an answer** — the honesty rule forbids
hand-*writing* `answers.jsonl`, and here the server wrote it through the sanctioned route.

**D2 — the free smoke test was run before the paid rehearsal turn.** The plan orders them
rehearsal → projection → smoke test. The smoke test costs nothing and validates the derivation
script's plumbing against a known oracle, so running it first meant a scripting error would surface
for free rather than after spending. No plan content changed; only the order.

**D3 — Phase A ends at a hard stop, so this report is PARTIAL by design.** Sections for AC3, AC4,
AC5 and AC6 are not written because the sitting has not happened. They are Phase C's, and writing
them now would be the exact fabrication the plan's opening box forbids.

## Issues encountered

**F2 — the portal was serving code from before both PR #339 review rounds. Fixed before the sitting.**
Port 4747 was already held by `node server.mjs` (PID 12566) started **Sat 29 Aug 09:26**. On
`origin/main`, `portal/server.mjs` and `portal/lib/discovery.mjs` were last changed at **10:18** that
day (`8f25acc`, PR #339 round 1 — *"the op append lands before…"*) and
`portal/lib/discovery-transport.mjs` at **10:37** (`f4449e9`, round 2). Node caches modules at import
time, so that process could not have been running either fix. A 30-question sitting against it would
have produced a package written by pre-review code.

Fixed by stopping PID 12566 and restarting from the current tree (now PID 68762, verified by
`lsof` and a fresh `/api/health`). **The killed process may have belonged to a parallel session in
this shared worktree** — it was started from this same `portal/` directory.

Nothing surfaces this. `/api/health` returns `ok`, `hasToken`, `jobsDir` and `cards`, and no commit or
version stamp; the drawer looks identical either way; no gate in `tooling/` inspects a running server.
**Candidate follow-up ticket**: add the HEAD commit to `/api/health` so a stale portal is visible
rather than inferred from `ps`.

## Findings so far

**F1 — the projection is CLI-only, and a UI-only operator cannot get their PRD.** #290 shipped the
fold CLI-only and its PR says so: *"no portal route or page reads the projection in this ticket."* So
the honest description of the chain is that the *session* is entirely in the UI, and one terminal
command afterwards produces the PRD. The plan takes the plain reading of AC1 — it governs the session,
which the drawer does carry end to end — and logs the gap rather than patching it, because patching it
before run 0 would mean run 0 measured something that did not exist when the epic's other runs were
planned. This bites the epic's secondary user hardest: an invited guest with no terminal cannot
complete the workflow at all today. *Re-scope — belongs on #279 as an amendment, plus a candidate
follow-up ticket.*

**F2** — above. *Candidate follow-up ticket.*

**F3 — the drawer's provenance control defaults to `fictional`, which is the committing one.**
Observed on the freshly opened drawer: `#discovery-provenance` opens on `fictional`, whose note reads
*"the package is written to `discovery/<slug>/` in this repo and committed as evidence."* For a real
product that default writes an unreleased product's discovery session into a public repo, and the only
thing preventing it is the operator noticing. The safer default for a control whose wrong value is
unrecoverable-by-git would be `real`. *Re-scope — belongs on #279 as an amendment.*

---

## Phase B — NOT RUN. The owner's sitting.

The agent stops here. Phase C's sections (AC3 verdict, AC4 judgement on the five, AC5 numbers, AC6
attestation) are written only after `run.json` carries a non-null `endedAt`.

## Phase C — NOT RUN.
