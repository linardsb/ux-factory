# Code review — PR #405: run 1, the scored Faster Payment run (#291)

**Head** `cd80056a0a65cd7af6400257fcc5fdf73219d115` · **Base** `main` @ `7c50cbae7e2a8a50215abd88288e046dbe9aabc9`
**Round** 1 — an unposted local draft carried the same head and base, so the base has not moved and the guarantees pass is skipped. `mergeStateStatus: CLEAN`, six CI checks green.
**Reviewer** `piv-review-pr` (fresh context) + the `code-reviewer` agent on the four code files (its report: `.agents/code-reviews/agent-reviews/pr-405-review.md`).

## Recommendation

**Request changes — one High, three Medium, four Low. Nothing Critical.** The package is sound, every figure in the PR body re-derives at this head, and the AC #5 failure is reported the way the honesty contract asks. The High is a two-line logic gap in the new pre-run gate (F1): it says "committed" about a file whose working-tree content it never compares to HEAD. It did not fire on this run (verified), but the gate's own header calls its preconditions a one-way door. The three Mediums are gate prose in the places this repo says gate prose must live, plus a merge-button choice that decides whether the seal-predates-run receipt survives on `main` (F4). **Nothing here asks for a paid re-run.**

## Validation

All run at `cd80056` on the PR branch by the reviewer.

| Command | Result | |
|---|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass` | ✅ observed |
| `node tooling/drift-check.mjs` | `drift-check ✓  syntax · … · group-count` | ✅ observed |
| `node tooling/token-lint.mjs` | `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` | ✅ observed |
| `node agent-layer/gen-loc-summary.mjs --check` | `loc summary ✓  3 groups — no drift` | ✅ observed |
| `cd portal && node lib/discovery-transport.mjs --preflight` | `pre-flight ✓  all 8 rows pass, zero tokens` | ✅ observed |
| `node tooling/run-1-ready.mjs` | `run-1 ✗  check 5 — …run.json already exists` exit 1 | ✅ red by design, message as the header documents |
| `gh pr checks 405` | CodeQL · audit · codeql · gates-green · verify · visual all pass | ✅ observed |
| 30.46 mutated `=== 7` → `=== 6`, then reverted | `build discovery ✗ … 30.46: 7 recording(s) carry Think's two stamps … faster-payment (24 turns)` | ✅ the carrier assertion can go red at this head |

Paid probes were not re-run. Their committed stdouts carry the verdict and cost the PR body quotes: `BOTH_SITES_HOLD` $0.1407 · `FILED_A_SOURCE` $0.1462 with four URLs · two `FAILED` at $0.2145 and $0.1673.

## The numbers pass

Every figure in the PR body's re-derivation block was recomputed from the committed package through the real modules (`runMetrics`, `auditTraceability`, `selectDepth`), not read off the report.

| Figure | Claimed | Re-derived |
|---|---|---|
| turns · cost · per turn | 24 · $1.1638 · $0.0485 | 24 distinct turn ids · $1.163752 · $0.048490 |
| wall clock | 15.2 min | 912.03 s = 15.20 min |
| settled · coverage · notAForm | 22/22 · 12/12 · tripped false, longest 0 | `runMetrics` identical, driven live |
| answer lines | 24 banked, 0 off-script | 24 `banked`, no `intent` field, 22 distinct questions, two asked twice |
| `file_evidence` | 6 rows, 0 with a url | 6, 0; five `fictional-scenario`, seq 13 `secondary-source` |
| ops | 20 · 6 · 4 | 30 ops: 20 / 6 / 4 |
| levels | business 2 · stakeholder 3 · solution 8 · transition 7 | identical; the seven transition seqs are the seven the report names |
| `wrong_if` · `evidence_refs` | 20/20 · 5/20 (3, 4, 6, 14, 26) | identical |
| AC #2 traces | seq 3 business, seq 6 and 14 stakeholder | levels confirmed; seq 15's `wrong_if` names the scam-loss rate that m-008's `would_measure` counts |
| Think carriers · packages | 7 · 10 | 7 (bracket-trace-1/2, faster-payment, graded-opus-a, graded-think-a, instrument-loans-1, later-not-never-1) · 10 |
| seal predates run | 21 min 32 s | `9599d8a` `13:14:14+01:00` vs `startedAt 12:35:46.874Z` → 1292.9 s |
| warm/cold | 24 warm, 0 cold | every turn `cacheReadTokens > 0`; longest inter-turn gap 111 s |
| saving vs `later-not-never-1` | ~$0.86 | 31 turns, $2.6126, $0.0843/turn; 24 × (0.0843 − 0.0485) = $0.859 |
| Segment A · ticket total | $0.6687 · $1.8325 | 0.1407 + 0.1462 + 0.2145 + 0.1673 · + 1.1638 |
| diffstat | 22 files, +2,726 / −41 | identical against `7c50cba` |

Two figures do not survive re-derivation as labelled: the median latency (F6) and the "structural half, observed" line under AC #5 (F5). The cost-saving claim is a two-run comparison across different subjects and widths; the report says so and it is accepted as derived, not as an isolated experiment.

## Findings

### F1 (High) — `run-1-ready.mjs` says "committed" about content it never compares to HEAD

`tooling/run-1-ready.mjs:59-62` (`committedAt`), used at `:70` and `:76`.

`git log -1 --format=%cI -- <path>` answers the date of the last commit that touched the path. It says nothing about whether the file on disk is that commit's content. Reproduced on a throwaway repo (observed): commit a seal, edit it, `git add` it, and `committedAt()` returns the original commit's date while `git diff --quiet HEAD -- seal.md` exits 1. Checks 1 and 2 therefore pass on a seal that was committed once and then rewritten, and check 6 prints the old timestamp for the report to quote. The `b9d1324` fix closed "staged, never committed"; it did not close "committed, then changed".

**Did not fire here.** Both fixtures have exactly one commit each and are clean against HEAD (observed). It is still a hole in the one command that says the sitting may start, and its header calls the preconditions a one-way door.

Fix, two lines: in checks 1 and 2, after `committedAt()`, run `git diff --quiet HEAD -- <path>` and fail with "differs from its last commit — commit the change, or the printed timestamp describes a different file". While there, print `%aI` beside `%cI` (see F4).

### F2 (Medium) — the new gate has no ledger entry and asserts authorship it cannot read

`tooling/run-1-ready.mjs:72-73` and `.claude/references/gates.md`.

The header comment and check 2's failure message both say the sealed file is "the owner's own hand" and that "an agent writing it voids AC #3". Check 2 tests exists, tracked, non-empty and committed. None is authorship. The seal this run used says in its own provenance line that an agent wrote it, and checks 1 to 4 pass on today's tree. So the gate went green on the exact condition its own comment names, and nothing anywhere says it cannot see that: `run-1-ready.mjs` appears nowhere in `gates.md`, and `CLAUDE.md` names `gates.md` as the file to read before trusting a green run. An operator copying this gate for run 2 reads six green and "the OWNER writes it" as satisfied.

Fix, prose only: a `CANNOT REACH` line in the header ("who wrote the sealed file — checks 1 and 2 prove it exists, is committed and predates the run; authorship is a human read of the file's provenance line, and an agent-written seal passed all six on #291"), and a short entry under `gates.md` §The journey drivers beside the three probes, with the same clause and the post-run inversion of check 5.

### F3 (Medium) — the fence probe's ledger entry and usage line describe the pre-PR probe

`.claude/references/gates.md:90` and `portal/lib/discovery-transport.mjs:29-33`.

This PR gives `probeFence` a shape parameter, bounds every read with `limit: 5`, rewrites the verdict to read every attempt, and adds `--probe-fence-run-1`. Two of the three copies were updated (`discovery/README.md` §The read fence, and the `probeFence` docblock). `gates.md` was touched by one word (six → seven at line 49) and its fence-probe entry still reads "shaped like run 2 … the fixture, the bank, the key and its own `answers.jsonl`" with no second shape, no read bound, and no note that #287's committed run-2 receipt is no longer reproducible, which the PR body, the report and `README.md` all state. The transport's own usage list at lines 29 to 33 names five flags and not the sixth. This is the three-copies rule exactly.

Fix: fold the two shapes, the `limit: 5` bound, the per-attempt reading and the stale-receipt note into line 90; add the flag to the usage list.

### F4 (Medium) — the seal-predates-run receipt depends on the merge button

The report's central provenance claim is "provable from git: input `78d79f8`, seal `9599d8a`", and `run-1-ready.mjs:46-48` says git history is the receipt. `main` is merged both ways: `7c50cba` (#404) has one parent and a `(#404)` title, a squash; `d7de36d` (#403) is a merge commit (observed). If #405 is squashed, the seal and `run.json` land in the same commit on `main`, `git log -1 -- <seal>` on `main` answers a date after `startedAt`, and `9599d8a` is reachable only through GitHub's `refs/pull/405/head`. A rebase merge keeps the commits but rewrites `%cI`, which `committedAt()` reads; `%aI` survives a rebase.

Fix: merge this PR with a merge commit and say so in the PR body, or have the README section and the report name where the receipt lives when `main` cannot show it (the PR's own commits). Print `%aI` beside `%cI` in check 6 so a rebase does not invert the comparison silently.

### F5 (Low) — AC #5 fails on two of its three clauses; the report attributes it to one

`.claude/reports/discovery-faster-payment-run-291-report.md:154` and `discovery/README.md:784`.

The AC reads "every decision has an evidence link and a wrong-if; every evidence row has a provenance label; every checkable domain claim carries a `secondary-source` URL". The report's "Structural half, observed" line gives 20/20 `wrong_if`, 5/20 `evidence_refs`, and quotes `auditTraceability`'s `unrooted: []` and `parenting.missed: []`. It does not quote the same call's third reading, `unbacked`, which is 15 of 20 (business 0/2, stakeholder 1/3, solution 8/8, transition 6/7, driven live). So the first clause fails too, and the README's summary ("no orphans and no unrooted decisions") reads as a clean half. The verdict is unchanged and the pack is honest: `prd.md` carries sixteen `no-evidence` markers and a dedicated "Decisions resting on no evidence" line. One sentence naming `unbacked` beside the other two closes it, and the number is the mechanical companion to the AC #7 finding (14 of the 15 sit on the solution and transition rungs).

### F6 (Low) — "median 10.3 s" is the upper median, and was not read off `runMetrics`

Report `:60` and `README.md:770`, both under headings labelled observed. The 24 sorted `durationMs` values have `d[11] = 9582` and `d[12] = 10323`; the median of an even sample is 9952.5 ms, 9.95 s. Min 3.9 s and max 24.7 s are exact. The report's task list says "T9 metrics read off `runMetrics`, never counted by hand"; `runMetrics` takes no `turnStats` and computes no latency, so the latency row is a hand computation. Round to 10.0 s or say "upper median", and scope the T9 sentence to settled, coverage and notAForm.

### F7 (Low) — who drafted the 22 offline answers is not stated

The plan's T7 makes it a hard rule that the 22 drafted answers are the owner's own words (`README.md:23` is unqualified; no committed package carries agent-drafted answers). The report discloses that T6's equivalent rule was broken the same morning, and its additions list says an agent wrote a look-up procedure into the owner's answers file mid-session. The package cannot show authorship either way. One sentence in the report saying the 22 answers were the owner's words, or what was not, closes it. This is a question for the human reviewer, not a confirmed defect.

### F8 (Low) — two receipt names read the same and mean different things

`.claude/reports/discovery-read-fence-287/probe-fence.run1.*` is #287's first failed attempt (run number one). This PR adds `…-291/probe-fence.shape-run-1.*`, the run-1 shape. `discovery/README.md` names both within a few paragraphs. Nothing breaks; a reader conflating them mis-attributes a FAILED receipt. One clarifying clause.

## What is good

- **AC #5 is reported as a failure and not re-run**, and the stated reason is contamination, not cost. That is the honesty contract working in the direction that costs something.
- **The seal's agent authorship is disclosed by the artefact itself** and reported against the ticket's own plan, with the epic's metric declared untaken for run 1 rather than quietly re-based.
- **Two paid FAILED probe runs are committed beside the passing one, named for their causes.** The rewritten `held` / `leaked` / `controls` reading is asymmetric and fails closed: a key is held only if every attempt errored and `cs.length > 0` guards vacuity; a control passes only if some attempt returned the nonce. Strictly stronger than the first-call accessor it replaces (confirmed by reading; the run-2 shape is unchanged).
- **`run-1-ready.mjs` check 3 is the right check to have written.** It catches the one way precondition 3 can be void by construction rather than fail by name, and case 23 pins the same shape purely.
- **The 30.46 carrier assertion is non-vacuous at this head** (mutation above) and the six → seven edit is consistent at every site.
- **T12's inverted premise was reported, not repaired toward a green.** "Stayed green and stayed vacuous" is the correct read, and the plan named the branch in advance.
- The prompt-injection attempt inside a tool result during the first fence run was treated as untrusted file content and the transcript is committed.

## Deviations — checked, all documented

The eight deviations in the PR body each carry a reason and are intentional: `PRESETS` as an array is confirmed against `discovery/bank.mjs`; the `limit: 5` / per-attempt change is confirmed against the two committed FAILED receipts; the commit-not-`git add` tightening is confirmed by `committedAt()`; T12's non-execution is confirmed by the 32.6 sum holding at zero with build-checks green. Not counted as findings.

## Not counted against this PR

- AC #5 reported rather than re-run: the sanctioned handling.
- The look-up drawer gap, the transition-rung misuse and the marginal-reach metric: routed to #293.
- `--probe-affordance` has no `gates.md` entry either; that predates this PR.
- The three unstaged working-tree files belonging to another session, deliberately not staged under plan assumption A5.
- No VR baseline regeneration: no shipped page is in the diff.
