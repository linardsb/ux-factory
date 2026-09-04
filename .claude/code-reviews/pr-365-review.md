# PR #365 review — the rules layer (#285)

**Head** `38adc90` · **Base** `main` @ `a8db2927783b1827b83b59040179fddefed80369` · round 1 · reviewer: fresh context + the `code-reviewer` agent (its own report: `.agents/code-reviews/agent-reviews/pr-365-review.md`)

## Summary

Approve. No critical or high issues. The rules layer does what the ticket and the decision doc ask: the cursor is read from the last closer (one re-ask on the ladder, never a third), the facet vector resolves through the bank with overflow as a value, D5's proposal is a value on the view, the counters are arithmetic over the closers, and `branch` is gone. Every figure in the PR body and the report re-derives (table below); one mutation was reproduced in a detached worktree; CI is green on both jobs. One Medium finding, all documentation: the hold rule also re-reads a real pre-#285 package, and neither the report nor the README says so.

## Findings

**F1 (Medium) — the hold rule re-reads a real package, and nothing documents it.** `portal/lib/discovery.mjs:534` applies the hold to every package on disk. Level 3 checked the seven committed packages only. The real jobs-folder package `negative-control-1` (scope-check, six consecutive first flags, closed 2026-08-31) read 6/6 done before this PR and now reads index 5/6, ask 2, `completion.done false`, with question six held (observed by running `sessionView` on it). It is closed, so no turn can run and the proposals route still accepts it; what changes is the drawer's closed line ("5 of 6 answered") and `metrics.completion`, which #293 will report. The rule is coherent, and this is the shape the plan's GOTCHA describes, but `discovery/README.md:231` says pre-#285 packages "read as the unfaceted list" and stops there. Fix: one sentence there stating that a pre-#285 package whose last closer is a first weak flag on a ladder depth reads as held, and a line in the report naming `negative-control-1`. No code change. Note for the owner: six different questions each weak once at scope check propose nothing, because D5 reads "repeated" as the same question on both asks (plan Q2). That matches MVP 6; state it once so the negative control's null escalation is not read as a miss.

**F2 (Low) — two counting bases inside one `runMetrics` return.** `coverage` dedupes by question; `tally` (`:559`) and `weak` count closers, so a held-then-decided question reads coverage 1/1 beside `twelve { closed 2, decided 1, rate 0.5 }` and `weak.rate 0.5` (observed). Per-turn is the PRD's own D4 wording ("a turn closed by record_decision counts"), so this is a decision to pin, not a bug: one sentence in the `runMetrics` header, and a case 29 assertion (`tooling/build-checks.mjs:~6879`) on a held-then-decided pair so the per-turn reading cannot drift silently. Case 29 exercises no repeated question id today.

**F3 (Low) — the PR body's validation block.** The command as written, `bash -c node tooling/drift-check.mjs && …`, hands only `node` to `bash -c`, so drift-check would not run from that line, and the code block beneath it is empty. The three summary lines that follow are real: I reproduced all three at the same head. Fix the body; the shape looks like `record-gate.sh` output that did not paste, worth a look in `piv-create-pr`.

**F4 (Low) — the re-ask is invisible to the agent.** `cursor.ask` reaches the drawer ("asked again") but not the turn prompt, and `ledgerBrief` lists decisions by rung only, so on the second ask the agent judges the new answer with no knowledge that it already flagged this question or what it said was missing. Deliberate scope (the plan excludes posture edits: fingerprint churn, stale group 32 fixture) and safe today because the cursor caps the asks. Log it for whichever ticket next touches `discovery-postures.mjs`.

**F5 (Low) — `declareFacets` (`:506`) re-implements `normaliseFacets`' expression** because the bank does not export it and `bank.mjs` is out of scope. AC2 holds (FACETS is imported, never redefined) and the copy iterates FACETS so a sixth facet flows through. Follow-up: export `normaliseFacets` and call it.

**F6 (Low, pre-existing) — resume ignores a differing POST.** Opening an existing slug with another depth or vector returns the disk state silently (observed: scope-check + `{ orgBuys }` posted over a full-discovery + `{ regulated }` run answered 22). Disk-is-authoritative is #284's design and the drawer cannot produce the mismatch; a 409 naming the recorded depth and vector would be kinder when #288 adds the checkboxes.

## The numbers pass

| Figure | Claimed as | Re-derived | Provenance |
|---|---|---|---|
| `drift-check ✓ · token-lint ✓ 63 tokens · build ✓ all 34 groups` | observed at 38adc90 | same three lines, exit 0 ×3 | observed |
| Level 3: allergen 30/30 · bracket-1/-2 12/12 · opus-a 65/65 weak 14 · think-a 65/65 weak 11 · loans 12/12 · meridian 3/6 weak 1 esc none · ask 1 ×7 | observed | identical on all seven | observed (`sessionView` per root) |
| `{ regulated: true }` → 22 questions | observed, port 4799 | 22 on port 4801; 12 + 6 + 4 | observed + derived |
| overflow message `hasModel + regulated fit (29); internal (6) does not` | observed | byte-identical from the route; 12 + 4 + 7 + 6 = 29 | observed + derived |
| eleven config keys | report | 11 | observed |
| eight guards before `mkdirSync` | case 16 pin | 8 counting `resolveRunRoot` | observed |
| six `prd.md` regenerated, one `**Run**` line each | body | six files, one hunk each | observed |
| mutation `asks < 2 → asks < 1` → `build discovery ✗ 2 failure(s)` | report | reproduced in a detached worktree: case 9 hold + case 28 pushback | observed |
| `#discovery-escalation` hidden | report | `portal.css:61` `[hidden]{display:none!important}`, nothing sets display on `.muted` | observed |

Subject check: `\bbranch\b` is absent from the four runtime files (observed); the README keeps it only where it describes pre-#285 packages, which is correct.

## Guarantees pass

Not triggered: no prior round, and `origin/main` is still `a8db292`.

## Validation

| Gate | Result |
|---|---|
| `node tooling/drift-check.mjs` | ✓, no tracked file dirtied |
| `node tooling/token-lint.mjs` | ✓ 63 contract tokens · 0 undeclared · 0 orphan |
| `node tooling/build-checks.mjs` | ✓ all 34 groups |
| CI `verify` · `visual` | pass · pass |
| Portal smoke, port 4801 | health ok · config 11 keys, `composes` true on full-discovery only · overflow refused, no directory · faceted open records five booleans + `proposedDepth`, no `branch` · resume answers 22 · throwaway removed, PID killed |
| Mutation spot-check | one of the report's three reproduced (above) |

## What is good

- The cursor is read from the last closer, not counted, and the plan proved that choice against all seven packages before a line was written. graded-think-a's eleven moved-past flags read as settled by construction.
- 23 `sessionView` drives against two source pins in the new cases, and the pins point the right way (`>= 8` guards fails on removal, not addition).
- Overflow is refused with the bank's own message and nothing trims a vector; `declareFacets` normalises through `facetPlan`, so no run.json can carry a vector the bank would not read.
- Each table cites its governing row and is iterated both ways against the menu it constrains, so a fifth depth or a second entry mode fails by name.
- The three `\bbranch\b` comment rewordings are listed as deviations rather than slipped in.

## Recommendation

Approve. F1 is a two-sentence docs fix and can land in this PR or the next; nothing here blocks the merge.
