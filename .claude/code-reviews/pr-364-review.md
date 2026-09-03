# Review — PR #364 · feature proposals from a finished discovery run package (#359)

**Head** `1434f93eed68127f79d7d94e1f4166cd5bbb49eb` · **Base** `main` @ `3dfcce313fe732e2ff025315788232ecc278868b` · first round, no prior report → the guarantees pass does not apply.
**Reviewer** `piv-review-pr` (fresh context) + the `code-reviewer` agent. **Verdict: request changes** — one High, see F1.

## Summary

The ticket's whole claim is structural, not disciplinary: a proposal can never appear in `prd.md`. I
did not take that on the PR's word. `readPackage` (`discovery/prd-projection.mjs:717`) opens exactly
`run.json`, `answers.jsonl` and `transcript.jsonl` and nothing else; the import edge runs one way only
(`proposals.mjs:74` imports `blockquote`, `cell`, `fold`, `readPackage` from the projection — the
projection imports nothing from `proposals.mjs`); and `projectPrd` takes `{run, answers, ops}`, so a
proposal line has no parameter to arrive on. **The claim holds by construction.**

Everything a reviewer would normally have to trust here was re-derived, and four mutations prove the
gate can go red. **One High blocks:** the `force` re-run path the route itself documents corrupts the
package it re-runs over, and the gate asserts the guarantee the code does not deliver.

## Issues

### F1 · High — a `force`d second proposal run permanently corrupts `proposals.jsonl`

`portal/lib/discovery-proposer.mjs:234` · `portal/server.mjs:270-273` · gate blind spot at
`tooling/build-checks.mjs:8007`.

`runProposalRun` seeds its in-memory store empty — `const state = { lines: [], ops, refusals: [] }` —
and the route hands it `root, run, ops, answers`, never `pkg.proposals`. The tool handler then
allocates with `nextProposalId(state.lines)` and validates with
`checkProposalLines([...state.lines, line], state.ops)` before appending **to the file**.

So the append-guard is scoped to memory while the file it guards is on disk. Its own comment states
the reason it exists:

> *"THE REFUSALS RUN BEFORE THE APPEND. proposals.jsonl is append-only, so an unchecked line reaching
> it cannot be taken back"*

**Reproduced with the repo's own functions** against the committed 8-proposal package:

```
nextProposalId(pkg.proposals)  ->  p9      # what a correct seed gives
nextProposalId([])             ->  p1      # what runProposalRun's seed gives
checkProposalLines(file+dup)   ->  THROWS  proposals: proposal line 8 repeats id "p1"
projectProposals(file+dup)     ->  THROWS  (same)
```

A forced second run therefore: passes its own in-memory check, appends a duplicate `p1`, and from
that moment **every** read of the package throws — `GET /api/discovery/proposals`, the `proposals.md`
download, `POST /api/discovery/verdict`, `writeProposalsMd` at the end of the run itself, and the CLI.
`proposals.jsonl` is append-only and hand-editing it is forbidden by CLAUDE.md, so there is no
sanctioned recovery. The tokens are spent and the package is unreadable.

**The gate states the guarantee it does not test.** `build-checks.mjs:8007`:

> *"nextProposalId after a gap answered … — it continues from the max, **so ids never collide after a
> re-run**"*

That sentence is true of the pure function and false of the path, because no case drives the seed.
34.12 pins `nextProposalId` by **name** in the SDK half (`:8410`) — a grep, not a behaviour. This is
the repo's own [[check that cannot fail]] shape: the case tests the function, the defect lives one
level up in its caller.

**Mitigations, which is why this is High and not Critical:** `force` is API-only — no drawer control
sends it (`grep force portal/public/` is empty) — and `--dry`'s DR5 row already fails red (exit 1) in
exactly this precondition, with CLAUDE.md making `--dry` mandatory before every paid attempt. An
operator following the documented protocol is warned first. But the route accepts `force: true` and
nothing in code stops it.

**Two fixes, and the choice is the owner's:**

1. **Seed the store from the file.** Route passes `proposals: pkg.proposals`; `runProposalRun` takes
   it and sets `const state = { lines: [...proposals], ops, refusals: [] }`. Ids then continue from
   the max, and the append-guard finally sees the file it guards. Add a group-34 case that drives
   `runProposalRun`'s seed, not just `nextProposalId` — otherwise `:8007`'s sentence stays unearned.
2. **Delete `force`.** The route's own refusal says a second run *"would interleave two runs'
   proposals with nothing on the page to tell them apart"* — and that stays true after fix 1, since
   `model` and `fingerprint` are the same constants both times. If the page cannot distinguish two
   runs, the honest move may be that a package gets one proposal run, full stop.

Fix 1 is the smaller change; fix 2 is the one the route's own comment argues for. Resolve the design
question before writing either.

### F2 · Medium — `proposal line N` is a 0-based array index, and the sibling file warns against exactly this

`discovery/proposals.mjs:150` (`lines.forEach((line, i) => …`), messages at `:152 :154 :165 :168 :172
:174 :178 :199 :201 :203` and `:221`.

`discovery/prd-projection.mjs:693` carries this comment, three lines above its own reader:

> *"Blank lines are skipped, so an array index is not a line number, and a refusal that named one
> would send an operator to the wrong line."*

`checkProposalLines` names the index anyway. **Observed:** POSTing a malformed verdict against the
committed 8-line `allergen-matrix-1` returned
`proposals: proposal line 8 (verdict) carries proposal_id (absent)…` — file line 9, and in the
verdict route's case not a file line at all, because the array is `[...pkg.proposals, line]`, built in
memory.

It is also internally inconsistent: PASS 2 names a **proposal** by `line.id` (`:214 :217`, "proposal
"p1" rests on seq 99") but names a **verdict** by the index (`:221`). The one file the operator cannot
tidy up afterwards is the one whose refusals point at the wrong line.

**Fix:** carry the file line number the way `prd-projection.mjs` does — have `readProposalLines`
return `{n, value}` and thread `n` into `bad()`; where there is no file line (the verdict route's
in-memory append), say so rather than printing an index. Cheaper interim: name the verdict by its
`proposal_id` in `:221` and `:201`, matching PASS 2's proposal half.

### F3 · Low — the verdict route validates one field and lets the other two fall to the catch-all

`portal/server.mjs:293-297`. `verdict` gets an explicit `400` naming the offending value; an absent or
blank `proposalId` and an absent `reason` reach `checkProposalLines`, throw, and surface through the
boundary catch-all as **HTTP 500**. **Observed** on a running portal: `400` for `verdict:"p99"`, `500`
for the other two. Nothing is written either way (`proposals.jsonl` byte-unchanged, verified).

The message still names the offending value, so this is a status-code and consistency wart, not a
correctness one. **Fix:** two more `return json(res, 400, …)` guards beside the `VERDICTS` one.

### F4 · Low — three figures in the PR body / report do not re-derive

| claim | where | observed |
|---|---|---|
| "six new group-30 cases (**13** call sites)" | PR body | **15** added `ok()` lines carrying `case 25:`, 0 removed |
| "All **six** places the group count lives were bumped" | PR body | **5** live sites (`build-checks.mjs:8486`, `CLAUDE.md:110`, `CLAUDE.md:178`, `gates.md:5` convention list, `gates.md:11` heading) |
| "`node --check` on all **four** new/edited `.mjs`" | report §Validation table | **six** `.mjs` changed; the PR body says six |

The substance of the second one holds — I grepped every tracked `.mjs`/`.md`/`.yml` and **no live
site still says 33**. These are miscounts, not false claims about a run. Recorded because this repo's
figures gate exists for exactly the copy-forward mechanism the author's own §Issues section documents
catching once already.

## The numbers pass — every figure re-derived

Each row is my own run at head `1434f93`, not a re-reading of the report.

| figure | claimed | observed |
|---|---|---|
| `build-checks` | all 34 groups pass | ✅ exit 0, twice (main tree + an isolated detached worktree) |
| same, no `portal/node_modules` | passes | ✅ the isolated worktree has none — it passed there |
| `drift-check` | ✓ twelve checks | ✅ exit 0 |
| `token-lint` | 63 contract tokens · 0 undeclared · 0 orphan | ✅ exit 0, verbatim |
| CI | — | ✅ `verify` pass · `visual` pass |
| `proposals.mjs` / `discovery-proposer.mjs` | 555 / 352 lines | ✅ 555 / 352 |
| group 34 `ok()` call sites | 137 | ✅ 137 |
| **AC #4** — 6 × `prd.md` byte-identical | before → after table | ✅ **hashed at `3dfcce3` and at `1434f93` — all six identical.** The PR's own table is a before/after within one tree; this is the same claim against the merge base |
| **T1** — the three `export`s moved zero bytes | 7 projections unmoved | ✅ ran `projectPrd` from the **base** `prd-projection.mjs` and the head one over all seven packages — byte-identical, `spine-meridian-1` included (it has no committed `prd.md`; the projection is computed, which the report's prose says and its table does not) |
| **AC #5** — posture fingerprints | `think` `7efdde…`, `think-opus` `cadb38…` | ✅ re-derived live via `fingerprintOf`; both reproduce. `discovery-postures.mjs` is **untouched by this PR** (empty diff), so the claim is structural |
| proposer fingerprint | `d37633011f127c85b560d333d26e3259` | ✅ printed by `--dry` DR7 and stamped on all 8 committed lines |
| `--dry` on `allergen-matrix-1` | **6/7**, DR5 failing | ✅ exactly that — DR5 `proposals.jsonl holds 8 line(s)`. The report's stale-figure disclosure is accurate |
| the run: 8 proposals, 0 refusals | — | ✅ 8 lines, all `type:"proposal"`, no verdict line |
| 21 distinct `rests_on` seqs of 30 | — | ✅ 21 distinct, ledger has 30 `record_decision` ops |
| "the only committed `full-discovery` package" | — | ✅ `allergen-matrix-1` alone; `graded-*` are `whole-bank`, the other three `opening-set`/`scope-check` |

### Mutations — the gate proven able to go red

The skill's rule is *mutate the source, run the function, don't grep it*. Four mutations, each in a
fresh detached worktree at `1434f93`, each reverted and re-run green.

| # | mutation | result |
|---|---|---|
| M1 | `projectPrd` renders `pkg.proposals[].title` | **RED, 3 named failures** — 34.5a ×2 + 34.5b. Reproduces the PR's claim exactly |
| M2 | delete refusal 1's dangling-seq branch (`proposals.mjs:212`) | **RED** — 34.6, naming the message divergence |
| M3 | `extraTools` defaults to `["Bash"]` on both `fenceDecision` and `fenceSite` | **RED, 8 failures** — group 30 cases 22 and 26. The "no existing decision run was widened" claim is gated |
| M4 | ignore `write`, always `appendTranscript` | **RED, 3 failures** — all naming **case 25**: *"a proposal run appends nothing to the session's files"* |

M3 and M4 are the ones that matter: `extraTools`/`write` are the only already-shipped code this PR
touches, and both halves of "nothing existing changed" fail loudly when broken.

### The verdict chain, driven end to end

The report's AC #7 note says the mechanism was proven on a throwaway the author then deleted, so
nobody had observed it. I re-ran it — a copy of `allergen-matrix-1` inside a detached worktree,
through the **real route** on a live portal, then discarded with the worktree:

- verdict → `200`, returns the view · a second verdict on the same id → `200`
- **append-only:** the first 8 lines are byte-unchanged after two appends (8 → 10)
- `proposals.md` regenerated and **byte-equal** to `projectProposals(readProposalPackage(root))`
- supersede: both verdicts kept, the earlier marked *(superseded by the verdict of …)*, the **last**
  one deciding the status — `proposed 7 · parked 1`. D-H's fix is real: each verdict carries its own `ts`

### The deviations that call the plan wrong

Both check out, so both are legitimate documented deviations rather than quiet narrowing:

- **D-D** — `wrong_if` **is** in both `PROPOSAL_KEYS` and `PARAMS.record_decision`. Observed
  intersection: `["wrong_if"]`. The plan's blanket disjointness assertion was false; narrowing it to
  the six decision-only params is the correct fix.
- **D-F** — no closed-set enum param of `record_decision` (`level`, `off_script`) appears on a
  proposal line, so 31.13's `refused >= 10` floor could not be met by this shape. Replacing the floors
  with `folded + refused === expected`, iterated from the key lists, is strictly stronger.

### Security + boundary smoke (live portal)

| probe | result |
|---|---|
| path traversal on `slug` (`../../../etc`) | refused, naming the value and the rule |
| foreign `Origin` on the verdict POST | refused by `origin.mjs` — the new routes are behind the CSRF guard |
| propose on a package that already has proposals, no `force` | refused as an SSE `error` event naming the count and append-only |
| `readProposalPackage` on an open session | guarded at `server.mjs:264` — `!pkg.run.endedAt` throws by name |
| run lock | `withDiscoveryRunLock` wraps the SDK call; the SDK is `await import`ed **inside** it, after every guard |
| verdict refusals | nothing written — `proposals.jsonl` byte-identical after all probes |
| model-authored text in the drawer | `esc()` applied consistently in `portal/public/portal.js` — no XSS seam |
| `proposals.jsonl` writes | `appendFileSync` at every site; no `writeFileSync` on that path |

The `code-reviewer` agent additionally re-ran `build-checks` with `portal/node_modules` renamed away
(proving the SDK/zod-free graph at run time, not by grep) and regenerated
`discovery/allergen-matrix-1/proposals.md` from its `.jsonl` byte-identical to the committed file.
The PR body notes it had no second reader; it has had two now.

## What's good

- **The structural claim is structural.** One-way import edge, a `projectPrd` signature with no
  parameter a proposal could arrive on, and a filename-set assertion (34.5b) that pins the projection
  to four paths. This is the rare invariant that a future refactor breaks *loudly*.
- **Case 34.5 carries its own vacuity mutation** (34.5c) and 34.5b carries a positive control against
  its own pin being empty. The `decomment` step is the right call — a comment is not a route, and the
  D-E note says so.
- **`extraTools`/`write` instead of a second fence.** A duplicate fence would have carried no run-time
  proof; M3/M4 show the reuse is genuinely gated at the same two sites.
- **The `--dry` preflight.** Seven rows, zero tokens, run before each paid attempt. DR5 going 7/7 → 6/7
  after the recorded run is the guard working, and the author caught and disclosed it rather than
  letting the old figure ride.
- **The honesty header is vacuously true, not false.** *"the owner wrote every verdict and its
  reason"* over `proposed 8 · accepted 0 · refused 0 · parked 0` claims nothing that did not happen.

## On AC #7 — not met, and that was the right call

`proposals.md`'s header asserts the owner authored every verdict. Writing eight verdicts to satisfy an
AC would have made the committed artefact's own honesty claim false, in an append-only file that
cannot be cleaned up — the honesty contract running in the owner's direction. The mechanism was proven
instead, and I re-proved it independently above.

**This does not block the merge.** Merging lands a package awaiting eight owner clicks in the discovery
drawer. Say so on the ticket rather than leaving it ambient.

## Recommendation

**Request changes**, on F1 alone.

Everything else in this PR is unusually well proven — four mutations go red, every figure re-derives,
the structural claim holds by construction, and the verdict chain works end to end. F1 is a single
seam: one uninitialised array, in the one path that writes to a file nothing can clean up.

Suggested order: **F1** (decide fix 1 vs fix 2, then a group-34 case that drives the seed) → **F2**
(one refusal-message pass) → **F3** (two guards) → **F4** (three numbers in the PR body and report).

None of it needs the paid proposal run repeated: the committed `allergen-matrix-1` package is
untouched by every fix above, and `--dry` covers the preflight for free.

Posted as a comment, not a formal review action: solo repo, own PR, `gh pr review --approve` and
`--request-changes` are both refused on one's own PR.
