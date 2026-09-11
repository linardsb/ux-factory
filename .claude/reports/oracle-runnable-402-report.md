# Report — PR #401's review defects fixed (#402)

**Input** `.claude/code-reviews/pr-401-review.md` (verdict: request changes) · **Branch** `feature/oracle-runnable-402`
off `origin/main` @ `27aef2e`. PR #401 **merged at 2026-09-11T14:51:17Z** before the review was acted on, so these
fixes could not land on it — the landing was settled with the owner before any push: new issue (#402), new branch,
new PR.

Two files changed, prose only: `.claude/skills/piv-fix-review-findings/SKILL.md` and `.claude/references/gates.md`.
The hand-mirrored global copy at `~/.claude/skills/piv-fix-review-findings/SKILL.md` was updated in the same pass.

## Checklist — 8 of 8 filed findings fixed, plus 1 unfiled folded into F3

- [x] F1 · high — the fix oracle is not runnable end to end
- [x] F2 · medium — the refs-API justification is false for open PRs
- [x] F3 · medium — asymmetric guards; the read-back cannot reach its own verdict
- [x] F4 · medium — the gate-mechanism contradiction is unsignposted
- [x] F5 · medium — the oracle's worktree is never removed and its name collides
- [x] F6 · low — the honesty-contract bucket routes four trees CodeQL cannot alert in
- [x] F7 · low — door 5's extraction control reads a deletion as suppression
- [x] F8 · low — the analyses read is unpaginated
- [x] F3(d) · not filed by the review — `$HEAD` at the read-back is the pre-push head

8 of 8, and the ninth kept on the owner's call.

## F1 · high — the fix oracle is not runnable end to end

`SKILL.md` §2, "The fix oracle"

**What was wrong.** Three variables carried the oracle and none was assigned. `$S` appeared at five sites,
`$CODEQL` at four, `$DB` at three; the A-side built its database from `--source-root="$S/treeA"`, a path nothing
in the file created; and step 4 — the B-side, the half that actually proves a fix — was one sentence with no
command, no source root and no database name, while the positive control above it got two full bash lines.

**Evidence, before:**

```
$ grep -nE '^(S|CODEQL|DB)=' .claude/skills/piv-fix-review-findings/SKILL.md
(no output)
$ grep -c 'treeA' .claude/skills/piv-fix-review-findings/SKILL.md
1
```

**After:**

```
$ grep -nE '^(S|CODEQL|DB)=|^   DB=' .claude/skills/piv-fix-review-findings/SKILL.md
49:S=$(mktemp -d)   # scratch: worktrees, databases, SARIF. Every $S below is this one.
50:CODEQL=${CODEQL:-$(command -v codeql || echo "$HOME/.codeql/<the Action's bundle version>/codeql")}
262:   DB="$S/dbB"
$ grep -c 'treeA\|treeB' .claude/skills/piv-fix-review-findings/SKILL.md
0
```

**The part the review's own fix would not have reached.** "Give step 4 the two commands that derive `treeB`/`dbB`
from the post-fix tree" names a variable without deciding *which tree*. If the B-side is the working tree, the
A→B delta carries the sibling sessions' 28 untracked and 3 modified files, and any base drift between the merge
ref and the branch, alongside the fix — and neither side can say which of them cleared the alert. So step 4 now
**defines** the B-side rather than naming it: a second detached worktree of the same `FETCH_HEAD`, the fix
transferred onto it as a patch, and `git -C … diff --stat FETCH_HEAD` required to list the edited files and no
others. The pass condition is stated as both halves — present in `outA.sarif`, absent from `outB.sarif` — because
a B-side zero alone is what the vacuous-database paragraph already forbids.

**The patch is taken against `FETCH_HEAD`, not `HEAD`.** `git diff HEAD` is empty the moment the fix is
committed — on cycle 2 of a 3-cycle loop, or any run where §3's validation staged first — and an empty patch
transfers nothing, so the B-side becomes a rebuild of A, both sides show the alert, and the loop reads a working
fix as a failed one. That is F1's own failure class one level down, caught on review of this fix rather than in
the file. Diffing against `FETCH_HEAD` is commit-state independent, and the `--stat` assertion is stated as
*every file you fixed* rather than merely *no others*, so an empty stat fails loudly.

**`$DB` serves two readers, so it is built with the config.** Door 5's extraction control and the pre-push
full-suite scan both depend on the database's **scope**, which comes from `--codescanning-config`; the old
`dbA`/`dbB` `create` calls passed `--language` only. Both `create` calls now carry
`--codescanning-config=.github/codeql/codeql-config.yml`, so one `DB="$S/dbB"` honestly serves both.

**Classification:** a mechanism that could not be executed as written, not a style defect. The A/B is the file's
answer to its own "a fix nothing can falsify is not a fix", and an agent improvising the two sides it was not
given satisfies the B-side check while the positive control never fires.

**Test:** *(corrected in round 2 — see Round 2 below.)* The table originally recorded here was produced by a
harness that substituted placeholders in some blocks and not others, and the substitution list happened to cover
this PR's own new B-side block while missing §3's. Re-run with **zero** substitution — which is what an agent
pasting a block actually does — the round-1 tree gave:

```
block 8: SYNTAX ERROR  placeholders=['<the files you fixed>', '<resolved>']   <- ADDED BY ROUND 1
block 9: SYNTAX ERROR  placeholders=['<explicit paths>']                      <- called "pre-existing"
```

So *"Every block this PR touched parses"* was **false**, and the check that produced the clean 9 was a check that
could not fail — in the report of a PR about checks that cannot fail. Both blocks parse after round 2.

## F2 · medium — the refs-API justification is false for open PRs

`SKILL.md` §2, oracle step 1

**What was wrong.** *"`gh api repos/…/git/ref/pull/N/merge` 404s — merge refs are not resolvable through the refs
API"* was a property read off closed PRs and written up as a property of merge refs. §0 requires the PR to be
open before any of this runs, which is the one condition under which the call works.

**Evidence — the same PR in both states**, which is stronger than the review's cross-PR sample:

| Ref | While open | After merge |
|---|---|---|
| `git/ref/pull/401/merge` | `200` · `be565ff` (reviewer, observed) | `404` (observed today, post-merge) |
| `…/399`, `…/394`, `…/391` | — | `404`, all merged |

**Classification:** a true instruction resting on a false justification. The instruction is unchanged — you need
the tree on disk, and a SHA is not a tree — but the reason under it now states the open/closed split and says
plainly that the earlier clause was a reading taken on a closed PR.

## F3 · medium — asymmetric guards, and a read-back that cannot reach its own verdict

`SKILL.md` §0.5 step 3, §4 read-back

Four sites, one failure family.

**(a) The currency compare failed open.** Step 2 spends four lines arguing `n` must be tested for being a number;
step 3 then compared three unguarded values. A rate limit, an auth blip or a revoked scope empties the reads —
one empty fails closed, but **both** empty makes `[ "" = "" ]` true, the stale-analysis refusal never fires, and
alerts are read off whatever analysis happens to be there.

```bash
for v in "$HEAD" "$A" "$P"; do [[ "$v" =~ ^[0-9a-f]{40}$ ]] || { echo "unreadable sha: [$v] — cannot judge currency"; exit 1; }; done
```

**(b) `$J` was unguarded** where `$RUN` two lines above it carried `[[ "$RUN" =~ ^[0-9]+$ ]]`.
`select(.status=="completed")` emits nothing while the job still runs, the URL becomes `…/actions/jobs/`, that
404s, and the verdict line prints blank rather than refusing. Now `^[0-9]{6,}$`, refusing by name.

**(c) `gh pr checks "$N" --watch --fail-fast` exits non-zero exactly on a failing check** — the case the loop
exists for. Now stated: read the step conclusion anyway, and never chain the wait with `&&`.

**(d) Not filed by the review; kept on the owner's call.** `$HEAD` at the read-back was still §0.5's binding —
the **pre-push** head. The run query would match the previous head's run and report the stale green the section
is built to prevent. One line, re-read before `RUN=`:

```bash
HEAD=$(gh pr view "$N" --json headRefOid --jq .headRefOid)   # RE-READ: the push moved it
```

**Classification:** (a) and (d) are checks that could not fail in the direction they were written to catch;
(b) is a vacuous zero in the verdict line; (c) is a missing instruction, not a broken one.

## F4 · medium — the gate-mechanism contradiction, signposted where it changes an action

`gates.md:138` · `SKILL.md` §2, the full-tree-scan bullet

**What was wrong.** `gates.md:138` stated the merge-ref read with no diff-scoping qualifier, three bullets below
a claim (`:137`) that PR #401's own plan measured false. `:129`/`:137` are #400's and are untouched here — but
`:138` was opened by #401 and as written read as support for the error beside it.

The only place the two readings produce different **actions** is `SKILL.md`'s *"findings outside the PR's diff
belong on the base branch: report them, spend no cycle on them."* Correct under the measured behaviour; wrong
under `:137`'s, where such a finding still blocks this PR.

**Changed.** `gates.md:138` now reads *"reads the blocking alerts off the merge ref (a diff-scoped read — see
#400, which also covers the inherited-alert bullet above)"*. `SKILL.md` carries a conditional clause: the
routing depends on the read being diff-scoped, which is measured but undocumented; if the gate reads every open
alert the cycle is owed here; #400 settles it; until it does, say which reading you acted on.

**Classification:** one prose contradiction, plus the single divergent instruction hedged rather than asserted —
the plan's own Q1 concedes the mechanism is unsettled.

## F5 · medium — the worktree is never removed, and its name collides

`SKILL.md` §2, oracle step 1

**What was wrong.** `git worktree add --detach "$S/pr-$N" FETCH_HEAD`, with nothing removing it. `pr-$N` is a
fixed name and the whole point is a repeating loop, so a second run against the same PR fails on `add`. And the
registration lives in **this** repo's `.git/worktrees/`, which every sibling session shares — point `$S` at a
reapable scratch directory (which F1's fix does) and the entry dangles for sessions that never ran the skill.

F1 and F5 had to be reconciled in one edit rather than applied in sequence: `S=$(mktemp -d)` plus a worktree
under `$S` is precisely the dangle F5 warns about.

```bash
git worktree prune                                    # clear an entry a reaped scratch dir left dangling
git worktree remove --force "$S/pr-$N" 2>/dev/null    # `pr-$N` is a fixed name and this loop repeats
git fetch origin "refs/pull/$N/merge" && git worktree add --detach "$S/pr-$N" FETCH_HEAD
```

plus `git worktree remove --force "$S/pr-$N" "$S/pr-$N-fixed"` required at the end of the loop, with the shared
`.git/worktrees/` named as the reason it is not housekeeping.

**Classification:** an analyser-legible restructure with no security change — a usability and shared-worktree
hygiene defect that would have bitten on the second invocation.

## F6 · low — a standing rule, said to be one

`SKILL.md` §1, triage routing

**What was wrong.** The honesty-contract defer bullet routed `traces/`, `replay/`, `discovery/<slug>/` and
`proto/compositions/` as a live triage decision. Per `.github/codeql/codeql-config.yml` the first three plus
`handoff/` are outside `paths` entirely and `proto/compositions/**` is `paths-ignore`d, so no alert can arise in
any of them. The file's own D3 defends its length on the ground that every clause sits at the command it guards;
this one guarded nothing that can happen.

**Changed.** Kept as the standing rule it is, relabelled: *"In `ux-factory` this is a standing rule, not a live
triage route"*, with the config reason stated and the two conditions under which it becomes live — the allowlist
widening, or a repo whose config differs. Reordered below the generated-file bullet so the live route reads first.

## F7 · low — door 5's control read a deletion as suppression

`SKILL.md` §1, no-suppression door 5

**What was wrong.** *"require the alert's file to still be extracted: `unzip -l "$DB/src.zip" | grep -F '<path>'`
must print a row"* classifies a fix that **deletes** the offending file as moving-code-out-of-scope. #401's own
demo fixed by deletion at statement level; file level is the same call one step up.

**Changed.** The control now exempts a file the fix deleted — `git ls-files --error-unmatch <path>` failing means
the code is gone, not relocated — and names what the door actually closes: *code moved to a path the allowlist
does not match*, never *code removed*.

## F8 · low — the analyses read is unpaginated

`SKILL.md` §0.5 step 3

**What was wrong.** `max_by(.created_at)` ran over the default page of 30. The file argues two lines below that
newest-first ordering is observed but not contractual — which is why it uses `max_by` over `.[0]` — and then read
one page, the same assumption in a different hat. `refs/pull/391/merge` already carries 9 analyses (observed at
#401).

**Changed.** `&per_page=100` on the query, with the direction stated precisely because it decides the severity:
this fails **closed**, not open. An inverted order would make page 1's max an old analysis, the second-parent
compare would mismatch and the skill would refuse — a false-refusal risk, not a stale green. `--paginate` is
named as *not* the fix, citing the file's own per-page `--jq` gotcha and `gh`'s refusal of `--slurp` alongside
`--jq`; past 100, pipe element-wise output to an external `jq -s 'max_by(.created_at)'`.

## Cycles used

Not applicable — this was a prose review, not a CodeQL run. No `codeql` cycle was spent and no alert was read.

## Deferred, and why

- **`gates.md:129` and `:137`** — the two bullets that state the gate blocks on inherited alerts. #400's scope,
  explicitly left there by the review. `:138` was in scope only because #401 opened it.
- **Second person** against `skill-standards.md`'s imperative rule. The round-1 claim that *"this PR neither adds
  nor removes any"* was **false**. Counting matches, case-insensitively, over the committed blob —
  `git show <sha>:<SKILL.md> | grep -oiE '\b(you|your|yours|yourself)\b' | wc -l` — gives **10** at base
  `27aef2e` and **17** at `6c12f18`: seven added, six of them in round 1's own new prose. Round 2 and round 3 each
  add **0** (17 at `6c12f18`, `c5a7654` and `47f8229` alike). The convention is real and this PR is its largest
  single contributor; fixing it is a separate pass, but it is deferred as **a debt this PR incurred**, not as a
  pre-existing one it left alone.
- **The 80–87s `codeql` job figure** — `observed`, from a 4-run sample. It gates nothing and names its own
  sample, so it is left as written. The comparison number previously given here, "71–94s across eleven PR jobs",
  was inherited from #401's review and **does not re-derive**: over the 26 concluded PR `codeql` jobs before that
  review the range is **69–97s**. The argument stands without the comparison; the number is withdrawn.
- **Open Q2, the hand-mirrored global skill copy.** Mirrored here and proved `diff`-clean, but *whether* the two
  copies should be hand-mirrored at all is unsettled. The sibling `piv-plan-implementation` copies have already
  drifted (repo 3,563 words, global 2,678), which is the argument for settling Q2 rather than a finding here.

## Needs a human look

Nothing blocking. One judgement call worth a glance: **F1 step 4's patch-transfer B-side** is the design decision
that resolves the review's "derive `treeB`/`dbB`" instruction, and it constrains how a future agent runs the
oracle. If the owner prefers the fix applied directly inside the merge-ref worktree instead, the delta is equally
exact and the edit is three lines.

## Validation

All `observed`, on this branch, this working tree. **Round-2 table below is the live one** — the round-1 table
was labelled "at `de4eb40`" while the portal-smoke row inside it read `bootSha`==`headSha`==`27aef2e`, the base
commit, so no gate was actually recorded at the head the label named. Round 2 labels the real head.

| Gate | Command | Result |
|---|---|---|
| build-checks | `node tooling/build-checks.mjs` | exit 0 — all 34 groups pass |
| token-lint | `node tooling/token-lint.mjs` | exit 0 — 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| drift-check | staged, then `node tooling/drift-check.mjs` | exit 0 — 13 checks |
| portal smoke | `PORT=4793 node portal/server.mjs` | `/api/health` `{"ok":true,…,"stale":false}`, `bootSha`==`headSha`==`27aef2e`; `Origin: https://evil.test` → `403` |
| shell syntax | `bash -n` over all 10 fenced bash blocks | **withdrawn — substituted placeholders, see F11 above** |
| global mirror | `diff` repo copy vs `~/.claude/skills/…/SKILL.md` | exit 0 — identical |

No `loc-summary` regen and no visual-regression baseline is owed: the diff touches `.claude/` only, and
`gen-loc-summary` counts the runtime group that `approach.html` renders.

---

# Round 2 — PR #403's review (`.claude/code-reviews/pr-403-review.md`)

Round 1 was reviewed and came back **request changes** on F1–F5. This round answers all 18 findings.

**17 of 18 fixed. 1 recorded as deferred with its measured number (F18).**

- [x] F1 high — `$S`/`$CODEQL` cannot cross a Bash-tool-call boundary
- [x] F2 high — the B-side's only correctness assertion cannot run (`FETCH_HEAD` is per-worktree)
- [x] F3 high — the A→B delta is not "the fix and nothing else" (base drift · accumulation)
- [x] F4 high — §4's `$HEAD` re-read is unguarded; empty `head_sha=` returns everything
- [x] F5 high — door 5's deletion exemption opens the door it guards
- [x] F6 med — `git worktree remove` takes one worktree, not two
- [x] F7 med — `FETCH_HEAD` is shared mutable state across sibling sessions
- [x] F8 med — `--codescanning-config` is CWD-relative, so scope came from the wrong tree
- [x] F9 med — `$DB` was per-alert while the pre-push full-suite scan pointed at it
- [x] F10 med — the "neither adds nor removes any second person" claim was false
- [x] F11 med — the `bash -n` evidence was not reproducible and hid a defect in this PR's own block
- [x] F12 med — the validation table's label and its evidence named different commits
- [x] F13 low — `$CODEQL`'s fallback placeholder had no executable refusal
- [x] F14 low — `print-baseline-info` is not a subcommand
- [x] F15 low — F2's `200` was first-hand in the shipped text, second-hand in the report
- [x] F16 low — the `codeql` job range did not re-derive
- [x] F17 low — `per_page=100`'s evidence did not support its claim
- [ ] F18 low — body length against `skill-standards.md` → **deferred, recorded below with the number**

**F10–F12's ticks are about their own sites, not their class.** Round 3 found the false-evidence class alive at
two further sites in this report (R2, R3) and fixed both in place. A tick here means that finding's line was
corrected; it never meant the report had stopped making unreproducible evidence claims.

## The structural change F1–F3 and F7 all fall out of

Round 1's oracle transferred a patch onto a second worktree of `FETCH_HEAD`. Round 2 deletes that mechanism.
**A and B are now worktrees at two real commits — `$C^` and `$C`, the fix commit and its parent.** The A→B delta
is one commit's hunks *by construction*, so there is nothing left for a check to fail at, and the four defects
die together:

| finding | why it is gone |
|---|---|
| F2 | no `FETCH_HEAD` in the B-side at all; the `--stat` is between two commits |
| F3 | a commit's own hunks cannot carry base drift or an earlier alert's fix |
| F7 | `FETCH_HEAD` is read once, in the call that fetched it, and pinned to `$S/merge-sha` |
| F11 | the `<the files you fixed>` placeholder is now prose, not a pipeline — the block parses |

Base drift is caught instead by one executable precondition run before the first fix:
`tree($M) == tree(HEAD)`, with its remedy in the refusal and a "re-run after every push" note. It compares
commits, so uncommitted sibling work does not disturb it.

**Two consequences stated in the file rather than left to drift.** §2 now commits each fix (the A/B needs two
commits), so §4 pushes and does not commit again; and N fix commits is the reading CLAUDE.md's "one atomic commit
per phase/ticket" takes here, because squashing them destroys the `$C^`→`$C` pairs the evidence cites.

**Two defects found in round 2's own drafts and removed before the push.**

1. Step 3's block opened with `M=$(cat "$S/merge-sha"); C=$(cat "$S/fix-commit")` and used neither — an unused
   assignment reading as load-bearing, the exact class under review. Deleted.
2. **The first F13 fix was worse than F13.** `[ -x "$CODEQL" ]` was added beside an assignment that still
   carried the literal `<the Action's bundle version>` placeholder, and the first verification run substituted
   `2.27.0` before running it — testing a path the file does not ship. Run as shipped, unsubstituted:

   ```
   codeql on PATH? []
   REFUSED: no CodeQL CLI at [/Users/Berzins/.codeql/<the Action's bundle version>/codeql]   exit=1
   ls -d ~/.codeql/*/  ->  /Users/Berzins/.codeql/2.27.0/          # the CLI IS installed
   ```

   So the refusal fired **unconditionally**, on a machine that has the CLI. F13 asked for a refusal a placeholder
   cannot pass; the first attempt built one nothing can pass. Replaced with `V=${V:-2.27.0}` — a real default the
   agent is told to check against the `codeql` job log — and a refusal naming what to change. Re-run as shipped,
   no substitution: `PROCEEDED with /Users/Berzins/.codeql/2.27.0/codeql  (2.27.0)  exit=0`.

   The lesson is the round's own: **substituting a placeholder before testing a block is the same defect as
   round 1's `bash -n` table.** Both times the harness was kinder to the text than a fresh agent would be.

## The verification that discriminates

`bash -n` over every block is necessary but weak. The check that actually tests F1 is running the new block
sequence **literally on PR #403, one fenced block per Bash tool call** — separate calls being the entire point.
Four calls, `observed`:

```
call 1 (preamble):  S=/var/folders/.../T//codeql-pr-403   CODEQL ok
call 2 (preamble re-prepended, then the fetch block):
        S recomputed across the call boundary: /var/folders/.../T//codeql-pr-403   <- same path
        PASS: merge SHA c4b2955 pinned to $S/merge-sha; tree(M) == tree(HEAD)
call 3 (preamble, then the worktree block):
        pins survive: merge-sha=c4b29551fec4380a26d5f976831dffbde975a84a
        worktree A -> de4eb40   worktree B -> 6c12f18
        git -C "$S/B" diff --stat "$C^"  ->  2 files changed, 13 insertions(+), 3 deletions(-)
        config resolves inside each worktree (F8): $S/A/.github/... and $S/B/.github/...
call 4 (F6):
        git worktree remove --force "$S/A" "$S/B"  ->  usage: git worktree remove [-f] <worktree>
        still registered after the two-arg attempt: 2
        still registered after one path per call:   0
```

Round 1's `git -C <worktree> diff FETCH_HEAD` was fatal every time; round 2's `diff --stat "$C^"` printed a real
stat. That is the F2 before/after, measured.

**`bash -n` over all 12 blocks, zero substitution: 12 ok, 0 syntax errors.** The placeholders that remain
(`<the Action's bundle version>`, `<the offending construct>`, `<resolved>`, `<explicit paths>`) are all inside
quotes and parse.

**What this run does not prove.** No CodeQL database was built and no query was run: there is no JavaScript fix
in this PR, so there is no alert for an A/B to clear. The oracle's *plumbing* is measured end to end; its
*verdict* on a real alert is not exercised here, and round 1's CodeQL-side evidence still stands unrepeated.

## F5 — why one condition was not enough

`git ls-files --error-unmatch <path>` fails identically for a deleted file and a **relocated** one, so the
exemption added in round 1 passed the exact move door 5 exists to stop. Round 2 requires two conditions together:
the offending construct must be absent from B's whole tree (`git -C "$S/B" grep -nF`), and if it survives
anywhere, that file must appear in B's extracted set. Relocation is the one signature where content stays in the
tree while its file leaves the database; deletion satisfies both.

## F14 — a second copy left deliberately

`print-baseline` is the real subcommand (`codeql database --help`, bundle 2.27.0 — `observed`). `SKILL.md` is
fixed. `.claude/plans/security-remediation-loop-388.md:288` carries the same wrong name and is **left alone**: a
plan is a record of what was decided at the time, and editing it would rewrite that record rather than fix an
instruction. Nothing executes it.

## Deferred, and why

- **F18 — body length. Not deferred cleanly; the file is at its ceiling and the split is now owed.** `SKILL.md`
  is **5,006 words** (frontmatter stripped, `observed`) against `skill-standards.md`'s "Target 1,500–2,000 words,
  hard ceiling ~5k". Round 2 drafted at 5,048, trimmed to 4,969 by cutting real redundancy, then the F13
  regression fix (below) put it back to 5,006. **The last six words were not shaved off to report a 4,999**, in a
  round whose whole subject is evidence that says what it measured: at that point the number is being managed
  rather than the file.

  **It is not split into `references/` this round**, for the standard's own reason rather than scope:
  `references/` is for *occasionally-needed* detail, and these CodeQL mechanics are the run-time spine of CodeQL
  mode, read on every run of it — which is the content the same standard keeps inline. A structural split
  mid-request-changes would also make the re-review diff unreadable. But the trimming has hit diminishing
  returns: the file is 2.5× its target, every guard in it is load-bearing, and the next addition of any size
  breaches "~5k" outright. **The honest next step is a split of the justification prose — the "why this guard
  exists, here is the measurement" material — into `references/codeql-oracle.md`, keeping the blocks and the
  refusals inline.** That is a ticket, not a clause.
- **Second person** — see the corrected entry above. A debt this PR incurred, not one it inherited.
- **`gates.md:129`/`:137`** — #400's scope, unchanged.
- **Open Q2, the hand-mirrored global skill copy** — unchanged; the copy is re-mirrored and `diff`-clean below.

## Round-2 validation

All `observed`, run at `89f669f` — **and that citation is withdrawn, because `89f669f` is unreachable.** It is
the pre-amend version of `c5a7654` and survives only in this clone's reflog: `git branch --all --contains
89f669f` prints nothing and `git merge-base --is-ancestor 89f669f c5a7654` is false (both observed). F12 was the
table naming a commit no gate had run at; this was the same class one step worse — a commit nobody else can
reach. The numbers below stood at `89f669f` and are left visible rather than deleted, but the citation that makes
them checkable is **§Round-3 validation**, which re-runs all four gates at `47f8229`, a commit on this branch
whose `SKILL.md` is `c5a7654`'s plus R1's guard.

| Gate | Command | Result |
|---|---|---|
| build-checks | `node tooling/build-checks.mjs` | exit 0 — all 34 groups pass |
| token-lint | `node tooling/token-lint.mjs` | exit 0 — 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| drift-check | staged by explicit path, then `node tooling/drift-check.mjs` | exit 0 — 13 checks |
| portal smoke | `PORT=4790 node portal/server.mjs`, killed by PID | `/api/health` `{"ok":true,…,"stale":false}`, `bootSha`==`headSha`==`89f669f`; `Origin: https://evil.test` → `403` |
| shell syntax | `bash -n`, **zero substitution**, all 12 blocks | 12 ok, 0 syntax errors |
| oracle plumbing | the §2 sequence, one block per Bash call, on PR #403 | 4 calls, all pass — transcript above |
| preamble as shipped | the §0.5 block run **unsubstituted** | `PROCEEDED with ~/.codeql/2.27.0/codeql (2.27.0)` exit 0 |
| global mirror | `diff` repo copy vs `~/.claude/skills/…/SKILL.md` | exit 0 — identical (re-mirrored this round) |

# Round 3 — PR #403's review, round 2 (`.claude/code-reviews/pr-403-review-round2.md`)

Round 2 came back **request changes** on one High. This round answers all six findings: **3 fixed, 3 deferred**
with a line each, which is the reviewer's own recommendation.

- [x] R1 high — `$N` is unguarded, and `gh pr view`/`gh pr checks` answer for the wrong PR when it is empty
- [x] R2 med — the second-person bullet's stated command did not produce its stated numbers, and one claim was false
- [x] R3 med — the round-2 validation table cited `89f669f`, a commit unreachable from any ref
- [ ] R4 low — the preamble's recomputation rule is stated once and carries nine dependent blocks → **deferred**
- [ ] R5 low — the commit that defines the A/B is prose, and the no-op check is waived → **deferred**
- [ ] R6 low — no plan file for #402 → **deferred, it is a CLAUDE.md question**

**3 of 3 blocking-and-medium fixed.** R1 was the only blocker.

## R1 · high — `$N` is guarded where it is consumed

`SKILL.md` §0.5 preamble and §4 read-back.

**What was wrong.** `$N` names what the whole oracle is judging and was the one cross-call value in the file with
no executable guard — `$HEAD` had `^[0-9a-f]{40}$`, `$n`, `$RUN` and `$J` had numeric checks, `$N` had prose at
`:66` and nothing else. `gh` treats an empty argument exactly like no argument:

```
$ gh pr view "" --json number,headRefName --jq '"number=\(.number) head=\(.headRefName)"'
number=403 head=feature/oracle-runnable-402
exit=0
```

So a §4 read-back pasted with `$N` unset resolves `$HEAD` off **another** PR, that SHA passes F4's shape guard,
and `.conclusion` prints a confident verdict for a PR nobody asked about. Shape is not provenance.

**What changed.** One line, in the file's own idiom, at **both** consuming sites.

In the preamble it sits between `N=$1` and `REF=`/`S=`, so a degenerate `codeql-pr-` scratch root is never
created:

```bash
N=$1   # or: gh pr list --head "$(git branch --show-current)" --json number --jq '.[0].number // empty'
[[ "$N" =~ ^[0-9]+$ ]] || { echo "empty or non-numeric PR number [$N] — gh would fall back to the current branch's PR and judge one nobody asked about"; exit 1; }
REF="refs/pull/$N/merge"
```

**The second copy is the point, not duplication.** The review's failure scenario is explicit that the §4 block is
*"pasted without restating `N`"* — the preamble was not run. A guard living only in a block that was not run is
not a guard, so the same line opens the read-back block, which already guards three other values. §0.5 step 1's
prose was rewritten to point at the guard that now performs the refusal rather than describe one.

**Evidence — the guard executed, both directions, at both sites.** The twelve fenced blocks were extracted
verbatim (indentation stripped, **no substitution**) and run:

```
PREAMBLE, empty $1:
  empty or non-numeric PR number [] — gh would fall back to the current branch's PR and judge one nobody asked about
  exit=1
PREAMBLE, $1=403:                     exit=0
READ-BACK, $N unset:
  empty or non-numeric PR number [] — re-run the §0.5 preamble first
  exit=1
READ-BACK, N=403 (real API, end to end):
  success
  exit=0
```

The last line is the live `codeql` gate step on PR #403 read through the guarded block — the positive control
that proves the guard refuses the empty case without breaking the real one.

## R2 · medium — the stated command now produces the stated numbers, and the false claim is gone

`:237-241`. Two defects, both in the bullet that corrected F10.

**(a) `grep -ocE` does not give 10 and 17.** It gives **8** and **15** — `-c` overrides `-o` and counts *lines*,
and the pattern is case-sensitive, so a sentence-initial `You` is missed. 10 and 17 come from counting matches
case-insensitively. The bullet now states that method in full, including the `git show` it reads from, so it
re-derives as written. Re-measured at four commits:

| commit | `grep -oiE … \| wc -l` |
|---|---|
| `27aef2e` (base) | 10 |
| `6c12f18` (round 1) | 17 |
| `c5a7654` (round 2) | 17 |
| `47f8229` (round 3) | 17 |

**(b) "Round 2 adds more still" was false.** Under the stated method round 2's delta is **0**, and under the
case-sensitive method the review also ran it is **−1** (15 → 14). Round 3's delta is **0** as well. The sentence
is replaced by the measured zeros. What survives, and is true, is that base → head is 10 → 17, so this PR is the
convention's largest single contributor and the debt is its own.

## R3 · medium — the unreachable citation is withdrawn

`:417-423`. `89f669f` is the pre-amend version of `c5a7654` and exists only in this clone's reflog:

```
$ git branch --all --contains 89f669f            → (empty)
$ git merge-base --is-ancestor 89f669f c5a7654   → false
```

F12 was a table labelled with one commit and evidenced at another; this was worse, because the commit named could
not be fetched by anyone else. The round-2 table keeps its numbers with the citation marked withdrawn, and points
at §Round-3 validation, which re-runs all four gates at `47f8229` — on this branch, and carrying `c5a7654`'s
`SKILL.md` plus R1's guard.

**Why this round does not repeat the defect.** The gates ran at `47f8229`, a **SKILL.md-only** commit, and this
report is a separate commit on top, carrying this file and the review it answers
(`.claude/code-reviews/pr-403-review-round2.md`) — both `.md` under `.claude/`, and neither is any gate's
subject: `gen-loc-summary`'s three groups are `system/`, root and `proto/` `.html`, and `agent-layer/`, and
drift-check's syntax pass reads `.mjs`. So no gate's subject moved between the run and the citation. Round 2's structure was right and its SHA was not; this
round keeps the structure and pins it to a commit on the branch.

## Deferred, and why

- **R4 low — the preamble-recomputation rule carries nine blocks from one statement.** Left as the review filed
  it: the deep pass traced all nine with the preamble un-run and found they fail loud, so the cost of the defect
  is a refusal rather than a wrong answer. A restatement is prose in a file already over its length budget (F18,
  below), and R1's second guard is the one place where failing loud was not enough.
- **R5 low — the A/B's defining commit is prose, and the no-op check is waived.** Real: if `git commit` no-ops,
  `$C` is the previous alert's commit and `$C^`→`$C` measures the wrong delta. The manual "present in A" check
  catches the common case, which is why the review filed it Low. A fix belongs with the next substantive change
  to §2, not bolted on in a report-correction pass.
- **R6 low — no plan file for #402.** Not a violation but a convention gap: this ticket came straight out of PR
  #401's review through `piv-fix-review-findings`, which produces no plan. Settling it means narrowing CLAUDE.md
  §Git for remediation tickets, which is an owner call and a different file.
- **F18 low — body length, and the number got worse.** `SKILL.md` is now **5,139 words** at `47f8229`
  (`git show 47f8229:<path> | awk '<strip frontmatter>' | wc -w`), up from 5,006 at `c5a7654` — R1's guard, its
  two refusal strings and the prose that explains why the guard repeats cost 133 words. The file is over
  `skill-standards.md`'s ~5k ceiling, not near it. The split is owed and is not this pass's work; recorded here
  rather than trimmed, because trimming prose to hit a number is the same dishonesty as shaving six words to
  report a 4,999.

## Round-3 validation

All `observed`, run at **`47f8229`** — a `SKILL.md`-only commit on `feature/oracle-runnable-402`, reachable from
the branch and from `origin` after the push.

| Gate | Command | Result at `47f8229` |
|---|---|---|
| build-checks | `node tooling/build-checks.mjs` | exit 0 — all 34 groups pass |
| token-lint | `node tooling/token-lint.mjs` | exit 0 — 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| drift-check | `node tooling/drift-check.mjs` | exit 0 — 13 checks |
| portal smoke | `PORT=4799 node portal/server.mjs`, killed by PID | `{"ok":true,…,"stale":false}`, `bootSha`==`headSha`==`47f8229`; `Origin: https://evil.test` → `403` |
| shell syntax | `bash -n`, **zero substitution**, all 12 blocks | 12 ok, 0 syntax errors |
| the R1 guard | both blocks extracted verbatim and run, empty and with `403` | 2 refusals exit 1, 2 passes exit 0 — transcript above |
| global mirror | `diff` repo copy vs `~/.claude/skills/…/SKILL.md` | exit 0 — identical (re-mirrored this round) |

**What this round's validation cannot reach.** It does not re-run the CodeQL oracle — this was a prose review,
not a CodeQL run, so no `codeql` cycle was spent and no alert was read. R1's guard is proven to refuse and to
pass; that the *guarded* read then answers correctly for PR #403 is shown by the one live call above and by
nothing broader.

## CI, read back at `038e931`

`038e931` is the commit carrying R2 and R3's corrections on top of `47f8229`. All six checks pass. The `codeql`
gate's own step, read through the block R1 just guarded (`N=403`, `run=34627433939`, `job=103355826783`):

```
$ gh api "repos/linardsb/ux-factory/actions/jobs/103355826783" \
    --jq '.steps[]|select(.name=="Require no high or critical alerts")|.conclusion'
success
```

That is the gate's verdict, not this report's. `gates-green`, `verify`, `visual`, `audit`, `codeql` and the
Advanced Security `CodeQL` check are all `SUCCESS` on `038e931` (`gh pr checks 403`).

This section is a report-only commit on top of `038e931`, so the head it cites is reachable on this branch and
the diff between them touches this file alone — the same structure R3 asked for, and the reason the citation
does not chase its own tail.
