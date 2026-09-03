# Implementation Report — feature proposals from a finished discovery package (#359)

**Plan**: `.claude/plans/discovery-proposals-359.md`   **Branch**: `feat/359-proposals`   **Status**: PARTIAL — one AC is the owner's act, see §Deviations

## Summary

`discovery/proposals.mjs` is `prd-projection.mjs`'s sibling: two line shapes, four refusals, a
derived status and a second pure fold that writes `proposals.md` **beside** `prd.md` and never inside
it. `portal/lib/discovery-proposer.mjs` is the SDK half — one fenced `query()` over a finished
package, one in-process MCP tool. The fence is **not** duplicated: `portal/lib/discovery.mjs` gained
two defaulted opts so one predicate serves two kinds of run. Four portal routes and a verdict block in
the discovery drawer. One real `claude-opus-5` run over `discovery/allergen-matrix-1/` filed eight
proposals for $0.229; every proposal awaits the owner's verdict.

## Tasks completed

| task | file | action |
|---|---|---|
| T0 baseline | — | captured, see §Validation |
| T1 export the containment | `discovery/prd-projection.mjs` | UPDATE (3 `export` keywords + 3 comments) |
| T2–T6 the pure module | `discovery/proposals.mjs` | CREATE (555 lines) |
| T7 register group 34 | `tooling/build-checks.mjs` | UPDATE (all six count sites) |
| T8 group 34's cases | `tooling/build-checks.mjs` | UPDATE (13 cases, 34.1–34.13) |
| T8a one fence, two runs | `portal/lib/discovery.mjs` | UPDATE (`extraTools`, `write`) |
| T8a's group-30 cases | `tooling/build-checks.mjs` | UPDATE (six cases inside case 25) |
| T9 the SDK half | `portal/lib/discovery-proposer.mjs` | CREATE (352 lines) |
| T10 the routes | `portal/server.mjs` | UPDATE (4 routes) |
| T11 the verdict UI | `portal/public/portal.js` · `index.html` · `portal.css` | UPDATE |
| T12 the real run | `discovery/allergen-matrix-1/proposals.jsonl` · `proposals.md` | CREATE (recorded) |
| T13 the verdict chain | — | proven on a throwaway package, see §Deviations |
| T14 the format spec | `discovery/README.md` | UPDATE (§Feature proposals + 4 edits) |
| T15 the maps | `CLAUDE.md` · `.claude/references/gates.md` | UPDATE |
| T16 this report | `.claude/reports/discovery-proposals-359-report.md` | CREATE |

## Tests added

No suite exists and none was invented (CLAUDE.md §Ground rules). The gate is the test.

**build-checks group 34 — 13 cases**, over an inline fixture whose ops run through the **real
applier** while the proposal and verdict lines are hand-authored, because *they* are the subject.
Four proposals and four verdicts, so all four derived statuses have a live example and one proposal
carries two verdicts (the supersede path).

- 34.1 the vocabulary frozen **by mutation** at both levels, five distinct empty states, the id
  allocator counting from the max id (not the length), seven junk ids refused
- 34.2 `PROPOSAL_SECTIONS` ↔ `STATUSES` in **both** directions, with a synthetic sixth status proving
  the loop can go red
- 34.3 the positive control first: headings in table order, the honesty header's five clauses, the Run
  and Proposals lines pinned whole, every proposal rendered exactly once, both of p2's verdicts kept
  with the earlier one **marked** superseded
- 34.4 refusal 3 three ways (value · **executed** against `applyOp`/`applyOps` · source pin with a
  can-it-match mutation)
- 34.5 refusal 4 as a **byte compare**, with the concatenation mutation proving the compare can fail
- 34.6 refusal 1 over ten branches, refusal 2 over six, sixteen shape refusals, the happy proposal
  **accepted** as the positive control, and the returned array proven a copy
- 34.7 the derived status, purity by double call, and the alias trap
- 34.8 the vanishing claim; each proposal deleted in turn, its section falling back to its **own**
  declared empty string
- 34.9 the injection battery as a **census** — see §Deviations for why the floors were not copied
- 34.10 the bank's `weakAnswer` / `note` / `provenanceNote` absent, with a positive control
- 34.11 determinism, no clock, `proposalsView`'s whitelist, and `proposals.md` byte-equal to the
  projection over the committed run
- 34.12 the SDK half read as **text**: eleven names absent, nine present, one fence object at both
  sites, the zod shape equal to `PROPOSED_BY_MODEL` by name and order
- 34.13 the posture import pinned to `PROVENANCE_RULE` alone, both shipped fingerprints re-derived live

**Six new group-30 cases** for `extraTools` / `write`, inside case 25's block.

## Validation results

Every figure below is **observed** unless labelled otherwise.

| gate | result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass` |
| same, with `portal/node_modules` moved aside | `build ✓  all 34 groups pass` |
| `node tooling/drift-check.mjs` | ✓ twelve checks |
| `node tooling/token-lint.mjs` | ✓ 63 contract tokens · 0 undeclared · 0 orphan |
| `node agent-layer/gen-loc-summary.mjs --check` (after `git add`) | see below |
| `node --check` on all four new/edited `.mjs` | clean |
| portal on `PORT=4791`, `/api/health` | answers |
| `discovery-proposer.mjs --dry` | 7/7 on a package with no proposals; **6/7 on `allergen-matrix-1` now**, DR5 reporting the 8 committed lines — the second-run guard working, not a regression. Zero tokens either way. |

**AC #4 — `prd.md` byte-identical across the proposal run.** T0's table, re-read after everything:

| package | sha256 (first 16) | after |
|---|---|---|
| allergen-matrix-1 | `096643ee607a250c` | `096643ee607a250c` |
| bracket-trace-1 | `bda06c6fc7765b41` | `bda06c6fc7765b41` |
| bracket-trace-2 | `7e9454aee381bbb3` | `7e9454aee381bbb3` |
| graded-opus-a | `303b0907a2a37feb` | `303b0907a2a37feb` |
| graded-think-a | `b9bd322df0781ee9` | `b9bd322df0781ee9` |
| instrument-loans-1 | `854edc1c47e3450b` | `854edc1c47e3450b` |

`git status --short discovery/allergen-matrix-1/` lists exactly `proposals.jsonl` and `proposals.md`.

**AC #5 — neither posture fingerprint moved.** `think` `7efdde37441fbd2591ba4a7dfeecdb6b`,
`think-opus` `cadb38117a2660c036d87e32323a8745`, identical at T0 and at T16. Group 32 green.

**T1's discriminating check.** The three `export` keywords moved **zero bytes** of output: all seven
projections (six committed packages plus `spine-meridian-1`) hash to T0's values.

## The real run (T12)

One paid attempt. The plan's five pass conditions were written down before anything was spent, and
all five held on the first run, so no prompt constant was tightened and no re-run was made.

| fact | observed |
|---|---|
| model | `claude-opus-5` |
| proposer fingerprint | `d37633011f127c85b560d333d26e3259` |
| proposals filed | 8 (the `MAX_PROPOSALS` ceiling) |
| refusals | **0** |
| turns | 9 |
| wall clock | 59.95 s |
| cost | **$0.229** |
| output tokens | 4,479 |
| `ok` (reading `is_error`, not only the subtype) | `true` |
| distinct `rests_on` seqs across the eight | 21 of the ledger's 30 decisions |

Pass conditions, one by one: (1) 8 ≥ 3 ✓ · (2) 0 refusals ≤ 8 filed ✓ · (3) no `why` asserts the
proposal as settled — scanned for "we will build" / "the product needs" / "the next step is" /
"we should build" / "must be built" / "we are building", zero hits, and the prose reads as options
grounded in named seqs ✓ · (4) `ok` true ✓ · (5) 21 distinct seqs ≥ 2 ✓.

**Every refusal the run hit: none.** Refusals are streamed and counted, never persisted (D6), so this
report is the only place they would be kept — and there were none to keep. The first paid attempt was
clean.

**The eight proposals** (titles only; the file is the record):

| id | title | rests on |
|---|---|---|
| p1 | Porter delivery-note capture: one photo, pending change, dishes marked unverified | 4, 5, 8, 3, 29 |
| p2 | Append-only substitution ledger, no edit path for anyone including the owner | 10, 25, 19, 7 |
| p3 | Diff-first chef confirmation that cannot be cleared without opening the change | 14, 28, 21, 10, 30 |
| p4 | Self-reprinting stamped laminate, with the print itself filed as evidence | 4, 9, 26, 25, 20 |
| p5 | Supplier-product to recipe-ingredient matching layer, unmatched surfaces as unverified | 8, 21, 29, 12, 22 |
| p6 | Chef-owned eval harness with an asymmetric, zero-missed-contains release gate | 12, 29, 30, 13 |
| p7 | Owner operating dashboard: capture rate, verified days, confirmation-lag distribution | 13, 23, 28, 14, 27 |
| p8 | Group may-contain policy as a versioned object, and a one-way menu import | 8, 4, 9, 26, 25 |

**The verdict distribution is `proposed 8`** — every proposal awaits the owner. See §Deviations.

**The open question the plan names, restated because it did not close.** #348 measured whether Opus
*judges* better than Sonnet. **Proposing is a different task and that number does not transfer.** This
run used Opus because the ticket recommended it; nothing here is evidence Opus proposes better than
Sonnet, and a comparison would be its own ticket (one const in
`portal/lib/discovery-proposer.mjs`).

## Deviations from the plan

**D-A · T13's verdicts were NOT written, and this is the one AC left open.** The plan asks the
implementer to give every proposal a verdict. `proposals.md`'s honesty header states *the owner wrote
every verdict and its reason* — so a verdict I wrote would make the committed artefact's own honesty
claim false, in exactly the mirror direction of the rule that forbids hand-writing agent output.
`proposals.jsonl` is append-only, so it could not be cleaned up afterwards either.

What was done instead: the **whole verdict chain was proven on a throwaway package**
(`discovery/verdict-smoke-1/`, a copy, never committed, deleted after) — one verdict recorded, a
second **superseding** verdict on the same id with both kept and the earlier one marked, a blank
reason refused by name, an unknown verdict refused by name, `proposals.md` regenerated and
byte-equal to the projection, and `answers.jsonl` / `transcript.jsonl` byte-identical throughout.

**AC #7 is therefore reported as NOT MET**, pending the owner. The path is one drawer session: start
the portal, open the Discovery drawer, resume `allergen-matrix-1` / `fictional`, and click a verdict
with a reason on each of the eight. Each click appends one server-written line and regenerates
`proposals.md`.

**D-B · `proposalsView` takes a read package, not a root.** The plan's T10 describes it as
`proposalsView(root)` *and* as "pure, gate-driven" in the same sentence — those cannot both hold. It
takes `{ run, ops, proposals }`; the route calls `proposalsView(readProposalPackage(root))`. The
filesystem stays in the shell, and case 34.11 drives the function in CI.

**D-C · a fourth route was added: `GET /api/discovery/proposals.md`.** The plan's T11 names a
"Download proposals" button but T10 lists three routes, so the button had no endpoint. Added on the
existing `/api/discovery/prd` route's shape (read-only, `projectProposals` over `readProposalPackage`,
`writeProposalsMd` not reachable from it) for the reason #338 F1 gives: an operator with no terminal
must still be able to get the artefact.

**D-D · 34.4's disjointness assertion was narrowed, because the plan's version is false.**
The plan says "no `PROPOSAL_KEYS` entry is a key of `PARAMS.record_decision`". `wrong_if` is in
**both**, by design — every claim in this system carries a kill criterion, which is refusal 2's own
argument. The case asserts disjointness against the **six decision-only** params instead
(`question_id`, `answer_ref`, `level`, `parent_id`, `evidence_refs`, `off_script`) and additionally
drives each of the six as an unknown key on a proposal line, refused **naming refusal 3**. The module
header was corrected to match.

**D-E · 34.5b's source pin runs over DECOMMENTED source.** T1 instructs the three helpers' comments
to name `discovery/proposals.mjs`; 34.5b pins that `prd-projection.mjs` never says "proposals". Both
hold once the pin reads code rather than comments — a comment is not a route. The pin carries a
positive control that the decommented source still holds its code.

**D-F · the injection battery's floors were replaced, as the plan itself directs.** 31.13's
`folded >= 25 && refused >= 10` counts refusals from three closed-set enum params a proposal line has
not got. The case asserts `folded + refused === expected`, with `expected` derived by iterating
`PROPOSAL_KEYS` and `VERDICT_KEYS` over the fixture, plus the plan's two vacuity guards. Observed
census: 20 refused + 32 folded = 52 string fields, per line ending.

**D-G · the run went through the portal's propose route rather than a browser click.** Same server
code path, same guards, same run lock; the drawer's own half is source-verified and its handler is the
one the route serves. No artefact differs — a proposal run records no `frontEnd`.

**D-H · a verdict's own `ts` now renders.** Not a plan deviation so much as a defect the gate caught:
the plan's rendering sketch puts a timestamp only on the *superseding* marker, so the last verdict —
the one that decides the status — had no date on the page at all. Each verdict line now carries its
own `ts`, and the marker still names the one that superseded it.

## Issues encountered

**Three defects the gate caught in code I had just written**, each fixed rather than accommodated:

1. **A wrong-kind `rests_on` refusal never named the field.** "…which is a `file_evidence`, not a
   `record_decision`" is useless to an operator grepping for `rests_on`. Both cross-reference
   messages now name it.
2. **A verdict's `ts` was unreachable on the page** unless a later verdict superseded it — D-H.
3. **Two of case 34.12's regexes were wrong, not the code.** The fence-object matcher used a
   `[^}]*` window that cannot cross `allowSetFor({ … })`'s own braces, and once widened it walked
   past a `;` into the fence object from an earlier `const`, naming the wrong variable. The ordering
   pin measured `indexOf` over the whole file, so it was comparing two *import* positions. Both are
   now bounded — no `;` crossing, and the ordering measured inside the tool handler, with an
   assertion that the handler slice is not the whole file.

**One wart, recorded rather than fixed.** `PROVENANCE_RULE.fictional` is the *session's* text and
talks about how to label evidence the person gives you — a proposal run files no evidence. The plan
requires it be **imported, never copied** (#347), and case 34.13 pins that, so the wart is the price
of one copy of the rule. It still carries the load-bearing fact: this run is fictional.

**A figure in this report went stale during the ticket, and the pre-PR audit caught it.** `--dry`
reported 7/7 at T9. After T12's run it reports **6/7** on `allergen-matrix-1`, because DR5 now sees
the eight committed proposal lines and says a second run needs `--force` — the guard doing its job.
The table above states both. Recorded because this is exactly the copy-forward mechanism the figures
gate exists to catch, and it caught it on the surface with the widest readership.

**`hasToken: false`** on this machine — there is no `portal/.env`, and the SDK authenticates through
the Mac CLI login. The run worked; the flag only reports the absence of a token file.

## Ready for the next step

`piv-commit` (phases 1–3 are already committed on the branch), then `piv-create-pr` with
`Closes #359` in the body, then `piv-review-pr`.

**The one thing the PR needs from the owner:** eight verdicts through the drawer, per D-A.
