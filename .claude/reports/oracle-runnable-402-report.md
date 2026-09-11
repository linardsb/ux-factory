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

**`$DB` serves two readers, so it is built with the config.** Door 5's extraction control and the pre-push
full-suite scan both depend on the database's **scope**, which comes from `--codescanning-config`; the old
`dbA`/`dbB` `create` calls passed `--language` only. Both `create` calls now carry
`--codescanning-config=.github/codeql/codeql-config.yml`, so one `DB="$S/dbB"` honestly serves both.

**Classification:** a mechanism that could not be executed as written, not a style defect. The A/B is the file's
answer to its own "a fix nothing can falsify is not a fix", and an agent improvising the two sides it was not
given satisfies the B-side check while the positive control never fires.

**Test:** every fenced bash block in the file parsed with `bash -n`, placeholders substituted:

```
10 bash blocks
block 0: ok   block 1: ok   block 2: ok   block 3: ok   block 4: ok
block 5: ok   block 6: ok   block 7: ok   block 9: ok
block 8: SYNTAX ERROR  — `git add <explicit paths> && …`
```

Block 8 is §3's validation snippet, unchanged by this PR and carrying a deliberate `<explicit paths>`
placeholder. Every block this PR touched parses.

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
- **Second person at `SKILL.md:150`/`:156`** against `skill-standards.md`'s imperative rule. Pre-existing at base
  in 5 places; this PR neither adds nor removes any, and fixing the convention is a separate pass.
- **The 80–87s `codeql` job figure** — `observed` but from a 4-run sample where the repo-wide range is 71–94s.
  The review did not file it, it gates nothing, and it names its own sample. Left as written.
- **Open Q2, the hand-mirrored global skill copy.** Mirrored here and proved `diff`-clean, but *whether* the two
  copies should be hand-mirrored at all is unsettled. The sibling `piv-plan-implementation` copies have already
  drifted (repo 3,563 words, global 2,678), which is the argument for settling Q2 rather than a finding here.

## Needs a human look

Nothing blocking. One judgement call worth a glance: **F1 step 4's patch-transfer B-side** is the design decision
that resolves the review's "derive `treeB`/`dbB`" instruction, and it constrains how a future agent runs the
oracle. If the owner prefers the fix applied directly inside the merge-ref worktree instead, the delta is equally
exact and the edit is three lines.

## Validation

All `observed`, on this branch, this working tree.

| Gate | Command | Result |
|---|---|---|
| build-checks | `node tooling/build-checks.mjs` | exit 0 — all 34 groups pass |
| token-lint | `node tooling/token-lint.mjs` | exit 0 — 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| drift-check | staged, then `node tooling/drift-check.mjs` | exit 0 — 13 checks |
| portal smoke | `PORT=4793 node portal/server.mjs` | `/api/health` `{"ok":true,…,"stale":false}`, `bootSha`==`headSha`==`27aef2e`; `Origin: https://evil.test` → `403` |
| shell syntax | `bash -n` over all 10 fenced bash blocks | 9 ok; block 8 is §3's pre-existing `<explicit paths>` placeholder |
| global mirror | `diff` repo copy vs `~/.claude/skills/…/SKILL.md` | exit 0 — identical |

No `loc-summary` regen and no visual-regression baseline is owed: the diff touches `.claude/` only, and
`gen-loc-summary` counts the runtime group that `approach.html` renders.
