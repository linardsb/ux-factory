# Implementation Report — re-record a linked decision from the discovery drawer (#498)

**Plan**: `.claude/plans/re-record-decision-after-build-498.md`   **Branch**: `feat/re-record-decision-498` (worktree `../wt-498`)   **Base**: 1c6af29 → 1c6af29 (origin/main did not move; the implementation commit is 2fc425d)   **Status**: COMPLETE for the build. AC #1 is NOT met until the owner's paid turn (see Not run).

## Summary
A finished blank-idea run of real provenance now offers a **Re-record** button on each current banked decision in
the discovery drawer. The revisit turn `r<n>` appends an ordinary banked answer line and runs a fresh SDK session.
It files through `fileOp`, the one filing path the real tool and the fake share, and leaves `endedAt`, run.json's
`sessionId` and the cursor alone. `UXF_DISCOVERY_TRANSPORT` and `tooling/fake-discovery-agent.mjs` drive the real
path at $0. canvas-journey pass B now re-records decision 7 through the drawer instead of seeding it.

## Tasks completed
- 1.1 `isRevisitTurn` + `closersOf` exclusion → `portal/lib/discovery.mjs` (UPDATE)
- 1.2 `revisitView` + `sessionView.revisit` → `portal/lib/discovery.mjs` (UPDATE)
- 1.3 `fileOp` → `portal/lib/discovery.mjs` (UPDATE), placed after `opLine`
- 2.1 runTurn's revisit branch, `assertRevisit`, the #498 paragraph in the runTurn comment block → `portal/lib/discovery.mjs`
- 2.2 the env seam `loadTransport` + invariant 1's sentence → `portal/lib/discovery.mjs`
- 2.3 `buildOpServer` on `fileOp`, `fresh` in `runDiscoveryTurn` → `portal/lib/discovery-transport.mjs` (UPDATE)
- 2.4 `tooling/fake-discovery-agent.mjs` (CREATE)
- 3.1 `revisit: body.revisit === true` + the boot log → `portal/server.mjs` (UPDATE)
- 4.1 the drawer → `portal/public/portal.js`, `portal/public/index.html` (UPDATE)
- 5.1 case 12's pin replaced; 5.2–5.5 cases 30.59–30.63 and 30.57's `body.revisit` → `tooling/build-checks.mjs` (UPDATE)
- 5.6 pass B reworked, `seedSupersede` kept for the inbox pass → `tooling/canvas-journey.mjs` (UPDATE)
- 6.1 the three copies of the gate prose → `tooling/build-checks.mjs` group string, `.claude/references/gates.md` (group 30 and canvas-journey)
- 6.2 → `discovery/README.md` (§File shapes example + revisit paragraph, §Supersede sentence), `docs/epics/canvas-design-import.architecture.md` ("Re-record as built (#498)")
- 6.3 `gen-loc-summary --check` after staging → no drift

## Tests added
Group 30, all in `tooling/build-checks.mjs`:
- **30.59** pure: `isRevisitTurn` over 10 values; `revisitView` null on an open and an audit head, `r1` and 20 questions on faster-payment (cross-read from `ledgerView`); cursor baseline `[22, 22, true, "t25"]`; a real-applier revisit closer on `r1` leaves the cursor, escalation and metrics equal while the same closer on `t25` moves the cursor; a revisit flag closes and advances to `r2`.
- **30.60** driven in a child process through the fake (JOBS_DIR + UXF_DISCOVERY_TRANSPORT): answer line, op line, run.json, turnStats, the returned view, a chained second revisit, onLine, seven refusals with both files' line counts unchanged, and (i) the fictional refusal in-process with its real-provenance control. Gated on the seam (see Additions).
- **30.61** `buildOpServer` pinned to `fileOp`; `fileOp` driven: valid op, applier refusal, throwing listener, failed append (transcript.jsonl as a directory).
- **30.62** the boot log, the fake's root guard + scratch control, the fake importing in this process, the transport's fresh session and runTurn's guard-before-append (decommented).
- **30.63** drawer source pins, each with its must-NOT.
- **30.57** adds `body.revisit`; **case 12** pins the seam (the plan's Task 5.1 block, verbatim).

Result: `node tooling/build-checks.mjs` → `build ✓  all 51 groups pass` (observed, final tree). Group run time with the child: whole gate 16.2 s wall (observed, `time`).

## Proving the checks
Driver: a Python script that applies one string replacement, runs `node tooling/build-checks.mjs`, reads **stdout and stderr**, requires a non-zero exit AND the named message, restores the file, and asserts `git diff | shasum` is back to its pre-run value. Proven first on M1 (the plan's own mutation), which reproduced the plan's observed cursor move.

| # | Mutation | Case that went red (observed message, abridged) |
|---|---|---|
| M1 | `closersOf` drops `!isRevisitTurn` | 30.59: a revisit closer moved the interview: cursor [4,22,false,"t26"] vs [22,22,true,"t25"] |
| M2 | regex `/^r\d+$/` | 30.59: isRevisitTurn reads … ["r0",true],["r01",true] |
| M3 | runTurn passes `fresh: false` | 30.60: the revisits' turnStats entries … sessionId "0f808208-…" (not fake-fresh-) |
| M4 | `recordSessionId` without `!revisit` | 30.60: run.json moved on a revisit — sessionId 0f808208-… → fake-fresh-2 |
| M5 | `assertRevisit` call removed | 30.60: the undecided revisit did NOT throw, answers grew on a refused revisit ([26,58] → [27,59]) |
| M5b | `assertRevisit` moved after `appendAnswer` | 30.60: the undecided revisit … answers grew on a refused revisit ([26,58] → [27,58]); open/audit refusals name no rule |
| M6 | open-run branch of `assertRevisit` deleted | 30.60: the open revisit threw "…existing-prd audit has no answer…" — must name "still open" |
| M7 | fictional branch deleted | 30.60: a revisit on the fictional package is not refused naming it — did not throw |
| M8 | `revisitView` ignores `endedAt` | 30.59: revisitView offers a revisit on an open run or an existing-prd audit |
| M9 | `revisitView` counts every closer | 30.59: revisitView on faster-payment reads {"turn":"r25",…} |
| M10 | `fileOp` holder before disk | 30.61: a failed append threw and the holder MOVED |
| M11 | listener try/catch removed | 30.61: a throwing listener made fileOp throw "socket closed" |
| M12 | handler re-inlined in `buildOpServer` | 30.61: buildOpServer files without fileOp |
| M13 | `resume: head.sessionId \|\| undefined` | 30.62: the transport does not start a revisit fresh |
| M14 | fake's `assertRoot` returns early | 30.62: the fake's root guard does not refuse discovery/faster-payment and / |
| M15 | boot log removed | 30.62: portal/server.mjs does not log a UXF_DISCOVERY_TRANSPORT override at boot |
| M16 | route drops `body.revisit` | 30.57: the turn route does not name body.revisit individually |
| M17 | `answerable` widened with `discovery.revisit` | 30.63: answerable was widened |
| M18 | revisit branch calls `guardVerdict` | 30.63: the submit handler's revisit branch must post … WITHOUT the Jev guard |
| M19 | button condition drops `!d.offScript` | 30.63: renderPackageView's Re-record button does not read … (green on the first try; fixed, see Issues) |
| M20 | cancel button removed from index.html | 30.63: index.html has no hidden #discovery-revisit-cancel |
| M21 | runTurn back to the literal import | case 12: … (2 dynamic import(s), seam true) |
| M22 | seam argument a bare literal | case 12: … (1 dynamic import(s), seam false) |

Positive controls (each passes on the clean tree, observed): 30.59's same closer on `t25` moves the cursor; 30.60(h) a plain turn on the closed run is still refused; 30.60(i) real provenance is not refused; 30.61's valid op lands once; 30.62's scratch dir is accepted.

Journey (each a temporary commit, `node tooling/canvas-journey.mjs chromium`, then `git reset --hard 2fc425d`):
- fake files `flag_weak_answer` → `✗ B2 · the drawer filed record_decision on r1 superseding 7`, then the canvas chip assertion red (exit 1, observed). The settled line read `Nothing superseded seq 7 — the agent filed a weak-answer flag on r1; the decision stands.`
- portal.js drops `revisit: true` → the server refused the plain turn; `✗ B2 · the drawer filed record_decision on r1 superseding 7` (exit 1, observed).

## Validation results
All observed on 2fc425d (= the final tree; origin/main did not move).
- L1 `node --check` on the seven files → clean.
- L2 `node tooling/build-checks.mjs` → `build ✓  all 51 groups pass`.
- L2 `node tooling/drift-check.mjs` → `drift-check ✓  syntax · token-css · … · group-count`.
- L2 `node tooling/token-lint.mjs` → `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`.
- L2 `cd portal && node lib/discovery-transport.mjs --preflight` → `pre-flight ✓  all 8 rows pass, zero tokens` (before and after the handler moved to `fileOp`).
- L3 `node tooling/canvas-journey.mjs chromium` → 234 passed, 0 failed. `all` → chromium 234/0, firefox 233/0, webkit 233/0, exit 0. Nothing else ran in the worktree during either run.
- L4 portal smoke on an OS-assigned port, killed by PID: `/api/health` ok true, stale false, bootSha 2fc425d; `GET /api/discovery/session?provenance=fictional&slug=faster-payment` → revisit `r1`, 20 questions, cursor done true; served portal.js holds `data-discovery-revisit`; the boot log holds no override line with the env var unset.
- 6.3 `node agent-layer/gen-loc-summary.mjs --check` after staging → `loc summary ✓  3 groups — no drift`.
- 6.1 grep for `scripted-agent seam|closed session refuses turns|re-recording … in the discovery drawer` across the three prose copies → 0 hits.

## Not run
- **The owner's paid revisit turn** (AC #1): one real turn on a `seedSpine` copy of faster-payment in the jobs folder, about $0.18 (expected, cold cache), at most 3 attempts. The owner's hand and the owner's words, so not run by me. It blocks closing #498; the PR carries `Refs #498` until it lands. Setup is in the plan's "Paid and owner-only steps".
- L5 CodeQL: runs on the PR.

## Deviations from the plan
- **Case 12 stays the seam's one home; 30.62 has no (a).** Task 5.5 said to move Task 5.1's three assertions into 30.62(a). A second copy of one pin drifts. 30.62's comment points at case 12, and M21/M22 red case 12 by name.
- **The settled line names the filed op by turn.** The plan said `Nothing superseded seq N — the agent filed <op>; the decision stands.`. Implemented as `… the agent filed <a decision | a weak-answer flag | an open question | nothing> on rN; …`, read from `s.ledger`'s rows whose `turn` is the revisit's (captured before the post). Observed under the flag mutation above.

## Assumptions carried
- Q4 (fictional refused), A1 (current banked decisions only), A2 (fresh session), A3 (banked prompt unchanged), all as closed in the plan.
- The spike diff was applied with `git apply` as a starting point, then every hunk was read and commented; the spike's `fileOp` placement (between `deniedLine`'s comment and `deniedLine`) was corrected.

## Additions beyond the plan
- **30.60 is gated on the seam.** Without it, a seam-bypass mutation makes 30.60's child start a real SDK turn on any machine with `portal/node_modules` (observed: four Claude Code sessions began on the scratch copies and stopped at "Credit balance is too low", 0 tokens, $0). Logged in the plan's AMENDMENTS. 30.60 now reds `NOT DRIVEN — …` instead.
- `runDiscoveryTurn` initialises `sessionId` to `null` when `fresh`, so a revisit whose init never arrives cannot report the run's old session as its own on its turnStats entry.
- `#discovery-revisit-cancel` joins `DISCOVERY_TURN_CONTROLS` (disabled while a turn runs) and `renderDiscoverySession` restores its `disabled` from `discovery.running`.
- The Start handler also resets `discovery.revisit` (the plan named it; the spike lacked it).
- B2 asserts the answer box is FOCUSED after pressing Re-record (plan step 4 named it; the spike lacked it).

## Issues encountered
- M19 passed on its first run: 30.63 read portal.js raw, and the new comment above the button condition named `!d.offScript`. 30.63 now drops whole-line comments (a full decomment would eat `//` inside portal.js's string literals). Re-run: red.
- The four session directories from the seam-bypass runs remain under `~/.claude/projects/*g30-revisit*` (a few lines each, no tokens). Not removed.
