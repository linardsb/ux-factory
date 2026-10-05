# PR #535 review — Run 1, Faster Payment built on the canvas (#316)

**Head** `cc0e67d` · **Base** main @ `5e42472` · first round · reviewed 2026-10-05
**Reviewer**: the `code-reviewer` agent (fresh context, read-only), every finding re-checked against the package by the author session
**Recommendation**: comment (solo repo, no self-approval). Fix the report prose (F1–F5) before merge; no code or data change asked. Merge after #534.

## Summary

The PR carries the run package, ratify's `mj-button` admission, three VR baselines, the report and the sitting notes. The data shows no sign of hand-editing, and ratify's writes agree with each other. The review's main target was the prose. Every figure in the report and the PR body was re-derived from `discovery/faster-payment/build/`. One claim is wrong (Medium), and four are mislabelled or imprecise (Low). Nothing is Critical or High.

## Issues

### Medium

**F1 — `choice` is reported as used, but no accepted composition contains it** (`.claude/reports/faster-payment-build-run-316-report.md`, §Eleventh primitive, the Unused bullet). The only composition containing `choice` is seq 36, the fork's option A, which the owner refused at seq 39. The author's walk did not leave out owner lines with `status: refused`. Re-run with refused lines excluded, the used set is card, ghost-button, list, list-row, mj-button, modal-dialog, primary-button, screen-header, stack, text and text-field (observed). **Fix:** among the ten, both icon and choice are unused; within the pairs, nav-tabs and select-field are unused. Add a note that choice was proposed once and refused.

### Low

**F2 — A local time is labelled UTC.** The Sessions table gives "11:54–13:26Z". 13:26 is BST: `handoff/flow.md`'s mtime is 13:27:33 BST and seq 87 is 12:13:19Z. **Fix:** write 11:54–12:26Z.

**F3 — The median latency is rounded the wrong way.** The 20th and 21st of 40 sorted `durationMs` values are 14,223 and 14,409, so the median is 14,316 ms. **Fix:** write 14.3 s.

**F4 — c17's cost is attributed to the fork alone.** c17 opened the second session, about 4.5 h after c16, with `cacheCreationTokens` 60,928 (observed), so it was a cold cache like c36 and c37. **Fix:** add "and a cold cache".

**F5 — A cause comes from outside the package.** The "portal restart" named as part of c36's cost is in the session record, not in the package. Only the c36 → c37 gap (14 min 56 s) can be derived from it. **Fix:** label the restart as from the session record.

## Validation

| Gate | Result (observed) |
|---|---|
| `node tooling/build-checks.mjs` | `all 52 groups pass` |
| `node tooling/drift-check.mjs` · `node tooling/token-lint.mjs` | ✓ · ✓ (63 contract tokens, 0 orphan) |
| `gen-build-handoff --check` · `gen-loc-summary --check` | no drift · no drift |
| `verifyBuild` · `missingStates` lane A | `[]` · `[]` |
| portal smoke (OS-assigned port, own PID only) | `/api/health` ok, `bootSha` = head, `stale: false`; `canvas.html` 200 |
| `catalog-journey all` | ✓ chromium, firefox, webkit |
| `canvas-journey all` · `ratify-journey all` | red on 2 + X4 per engine and R4, the grown-package cases; green with #534's diff applied (258/257/257, ratify 52) |
| CI | pending at review time |

## The numbers pass

Re-derived and holding:
- **Turns and cost:** 40 turns, 0 failed, $7.5443 total, with sessions of $2.5954, $3.4103 and $1.5386.
- **Empty-yield turns:** c11, c13 and c28, $0.1584 in total.
- **Proposals and verdicts:** 38 agent lines, each with an owner verdict. Screens 8 (5 accepted, 3 refused); states 30 (25, 5).
- **Frame ids** in the Findings table.
- **Declared states:** seq 15 and seq 49.
- **Elapsed:** spans of 2:43.238 and 21:58.811, 1,482,049 ms in total, with the `d613b87` cross-check at 57.3 s.
- **Unbound slot outcomes:** both records.
- **Arrows:** one `connect` op, at seq 6.
- **Refusals:** no `refused` transcript line.
- **Lineage:** 1 / 0 / 0 / 35.
- **Line references:** `portal/lib/ratify.mjs:663` and `portal/lib/inbox.mjs:188-196`.
- **Arithmetic:** the $3.09 overrun.

Derived figures are labelled derived. The only closing keyword in the report and the PR body is `Closes #316`.

## What is done well

- The report leads with the two weak points (F12 no arrows, F13 the over-claimed admission), not burying them.
- Elapsed is split the way R3 planned, and the report says plainly that the gate chain's duration is not recorded instead of estimating it.
- The factory baseline regen was checked pixel by pixel and reverted as noise, not committed as a change.
- The owner's inbox reasons are quoted verbatim; nothing in the owner's half is drafted.

## Outcome

F1–F5 fixed in the report in the commit that adds this file (prose only; no data, code or gate touched).
After #534 merged (`7f01e0a`): build-checks all 52 groups, canvas-journey 258/257/257 passed and 0 failed, ratify-journey ✓ 52 (observed). build-journey's three arrangement reds reproduce on `main` `3c1817e`, so they are older than this PR: #536.
