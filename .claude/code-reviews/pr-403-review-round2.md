# PR #403 review — the fix oracle runs end to end (#402) · round 2

**Head** `c5a7654` · **Base** `main` @ `27aef2e` · round 2 (round 1 reviewed `6c12f18` at the same base)
**Reviewer** `piv-review-pr` — `code-reviewer` agent for the deep pass, numbers pass by hand
**Verdict** request changes — one High (R1)

**Guarantees pass: not applicable.** `baseRefOid` is `27aef2e` in both rounds, so the base did not move and
round 1 set no rebase notes to discharge.

## Summary

Round 1 returned request-changes on F1–F5 and its central charge was that F1 had been *re-shaped rather than
fixed*. That did not happen again. All five blocking findings are genuinely closed, and the deep pass confirmed
each by reproduction in a throwaway repo rather than by re-reading the report — F2's worktree diff prints a real
stat where round 1's `FETCH_HEAD` call was fatal every time, and F5's two-condition check correctly routes a
`git mv` relocation back through the extraction door instead of exempting it. 17 of 18 findings closed, F18
deferred with an honest number.

The restructure that closed F1–F3 and F7 in one move is the right shape: A and B are worktrees at `$C^` and `$C`,
so "the fix and nothing else" holds by construction and there is no assertion left to fail.

One High survives, and it is in the file's own defect class: **`$N` is the only cross-call value in the file with
no executable guard, and the commands that consume it fail silently into the wrong PR.** Two Medium findings are
false evidence claims in the report — the same class round 1 filed as F11/F12, recurring.

## Issues

### R1 · High — `$N` is unguarded, and `gh pr view`/`gh pr checks` answer for the wrong PR when it is empty

`.claude/skills/piv-fix-review-findings/SKILL.md:47` assigns `N=$1` with no validation. The refusal exists only
as prose (`:66`, *"Empty `N` → refuse by name"*). It is consumed unguarded at `:92`, `:382` and `:391`.

Every other cross-call value in this file is guarded: `$HEAD` by `^[0-9a-f]{40}$` at `:392`, `$n`, `$RUN` and `$J`
by numeric checks. `$N` never is, anywhere.

Observed this session:

```
$ gh pr view "" --json number,headRefName --jq '"number=\(.number) head=\(.headRefName)"'
number=403 head=feature/oracle-runnable-402
exit=0
```

An empty PR argument is treated exactly like no argument: silent fallback to the PR for the current branch. No
error, exit 0.

**Failure scenario.** The agent runs §0.5's preamble in call 1 with `N=403`, works through triage and §2, pushes,
and waits on CI. At §4's read-back (`:391`) — the call furthest in time from the preamble, after a push and a
`--watch` — it pastes the block without restating `N`. The working directory is meanwhile checked out to a
different branch, which in this repo is routine: CLAUDE.md and this session's own history both record parallel
ticket sessions sharing one working directory. `gh pr view ""` returns *another* PR's head SHA. It is a
well-formed 40-hex string, so F4's guard at `:392` passes it; `$RUN` and `$J` resolve against it; the final
`.conclusion` prints a confident, wrong verdict for a PR nobody asked about.

This is precisely what the file exists to prevent — a green read off a ref that was never the subject. F4's guard
validates that `$HEAD` is *shaped* like a SHA, never that it came from PR `#N`.

**Fix** — one line in the preamble, in the idiom the file already uses:

```bash
[[ "$N" =~ ^[0-9]+$ ]] || { echo "empty or non-numeric PR number — nothing to judge"; exit 1; }
```

### R2 · Medium — the second-person bullet's stated command does not produce its stated numbers, and one of its claims is false

`.claude/reports/oracle-runnable-402-report.md:237-241`. Two separate defects in the bullet that corrects F10.

**(a) The command does not reproduce.** The report writes:

> `grep -ocE '\b(you|your|yours|yourself)\b'` gives 10 at base `27aef2e` and 17 at `6c12f18`

Run as written, that command gives **8** and **15** (observed at both commits). The figures 10 and 17 come from
the *case-insensitive* variant counting matches (`grep -oiE … | wc -l`), which the report never names. The
numbers are right for a method it does not state and wrong for the method it does. Round 1 filed exactly this as
F11 — *"the `bash -n` evidence is not reproducible"* — and the report's checklist marks that class closed at
`:293`.

Case-insensitive is the defensible measure, since `You` at a sentence start is second person. The fix is to state
`-oiE … | wc -l` and keep 10 / 17.

**(b) "Round 2 adds more still" is false.** Measured `6c12f18` → `c5a7654`:

| Method | `6c12f18` | `c5a7654` | Round 2's delta |
|---|---|---|---|
| case-insensitive, match count | 17 | 17 | **0** |
| case-sensitive (`-ocE`, as stated) | 15 | 14 | **−1** |

Under neither method does round 2 add. The rest of the bullet holds and should stay: base `27aef2e` → head
`c5a7654` is 10 → 17, so "this PR is the convention's largest single contributor" is true, and the debt is
correctly booked as this PR's own.

### R3 · Medium — F12 recurs: the validation table cites a commit no one else can reach

`.claude/reports/oracle-runnable-402-report.md:417-423` records the four gates as *"All `observed`, run at
`89f669f`"*. That commit is not on the branch and not reachable from any ref — it is the pre-amend version of
`c5a7654`, surviving only in this one clone's reflog until the next `git gc`:

```
$ git branch --all --contains 89f669f      → (empty)
$ git merge-base --is-ancestor 89f669f c5a7654 → false
$ git log -g --oneline | grep 89f669f
89f669f HEAD@{1}: commit (amend): fix(ai-layer): A and B are two commits…
```

Round 1's F12 was that the table's label and its evidence named different commits. This is the same defect in a
worse form: round 1's mislabelled commit was at least reachable.

**Mitigated, and the fix is one line rather than a re-run.** `git diff 89f669f c5a7654` is 9 insertions and 4
deletions **inside the report only** — `SKILL.md` is byte-identical between the two, so no gate's subject moved.
The PR body also discloses the gap in its own words. Re-cite the table at `c5a7654` using the re-run below.

### R4 · Low — the preamble's recomputation rule is stated once and carries nine dependent blocks

`SKILL.md:55-59` is the only place "preamble"/"prepend" appears in the file. The instruction to recompute
`$S`/`$V`/`$CODEQL` before every later block is never restated before any of the nine blocks that need it
(`:72`, `:91`, `:115`, `:215`, `:253`, `:277`, `:293`, `:327`, `:390`), and §2 is separated from it by the whole
triage section.

Filed Low rather than as F1 recurring, because the deep pass traced all nine with the preamble un-run and found
they **fail loud**: an empty `$S` routes writes to filesystem root, an empty `$R`/`$REF` produces malformed
`gh api` paths that 404 into the existing guards. Round 1's version could place a worktree somewhere unintended
in silence; this one cannot. Worth a one-line reminder comment in §2's first block, not a restructure.

### R5 · Low — the commit that defines the A/B is prose, and the one check that would catch a no-op is explicitly waived

`SKILL.md:274` puts `git add <the files you fixed> && git commit` in inline prose outside any fenced block; the
block at `:277-284` then opens with `C=$(git rev-parse HEAD)` and trusts the commit happened. `:283` states
`# prints the delta; it does not have to police it`.

If the commit no-ops — wrong path staged, a no-op edit — `$C` resolves to the previous alert's fix commit, or to
pre-fix HEAD on alert 1, and `$C^`→`$C` measures the wrong delta or none. Round 1's F2 fix turned on catching
exactly this: *"An empty `--stat` is that failure, which is why the assertion is every file and not merely no
others."* Round 2 removed that tripwire and put nothing in its place. The manual "present in A" check still
catches the common case, which is why this is Low.

### R6 · Low — no plan file for #402 in this PR or any commit

CLAUDE.md §Git: *"A ticket's plan, report and review belong in the same PR."* The PR carries
`.claude/reports/oracle-runnable-402-report.md` and both review files, but `.claude/plans/` contributes nothing,
and no `*402*` plan exists in any commit on any branch.

Raised as Low, not a violation: #402 came straight out of PR #401's review findings through
`piv-fix-review-findings`, which produces no plan. If that is the intended shape for remediation tickets, the
convention is worth narrowing in CLAUDE.md so the gap stops reading as an omission.

## Validation — re-run at the reviewed head

Because R3 leaves the report's table pointing at an unreachable commit, all four gates were re-run here at
`c5a7654` itself. All `observed`.

| Gate | Command | Result at `c5a7654` |
|---|---|---|
| build-checks | `node tooling/build-checks.mjs` | exit 0 — all 34 groups pass |
| token-lint | `node tooling/token-lint.mjs` | exit 0 — 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| drift-check | `node tooling/drift-check.mjs` | exit 0 — 13 checks |
| portal smoke | `PORT=4793 node portal/server.mjs`, killed by port | `{"ok":true,…,"stale":false}`, `bootSha`==`headSha`==`c5a7654`; `Origin: https://evil.test` → `403` |

CI on the PR is green on all six checks (`CodeQL`, `audit`, `codeql`, `gates-green`, `verify`, `visual`).

## Numbers pass

Method stated so each line is checkable: word counts are `wc -w` over the committed blob at `c5a7654`, frontmatter
stripped with `awk 'NR==1&&/^---$/{fm=1;next} fm&&/^---$/{fm=0;next} !fm'`.

| Figure | Claimed | Re-derived at `c5a7654` | Verdict |
|---|---|---|---|
| `bash -n`, all blocks | 12 blocks, 12 ok, 0 errors | 12 blocks, 12 ok, 0 fail | confirmed |
| build-checks | 34 groups | 34 groups pass | confirmed |
| token-lint | 63 tokens · 0 undeclared · 0 orphan | identical | confirmed |
| drift-check | 13 checks | 13 named checks | confirmed |
| portal smoke | `ok:true`, `stale:false`, CSRF `403` | same, at the real head | confirmed |
| F18 body length | 5,006 words, frontmatter stripped | 5,006 | confirmed |
| merge-ref behaviour (F2) | 200 while open, 404 once merged | `pull/401/merge` → 404; `pull/403/merge` → `04ec9ca` | confirmed |
| validation-table head | `89f669f` | unreachable from any ref | **R3** |
| second-person counts | 10 / 17 via `grep -ocE` | that command gives 8 / 15 | **R2(a)** |
| "Round 2 adds more still" | an increase | 17 → 17, or 15 → 14 | **R2(b)** |

Two notes for whoever checks this next.

**The `bash -n` figure is exact, and easy to check wrongly.** An anchored `^```bash$` finds only **8** blocks —
four of the twelve are indented inside list items. A reviewer anchoring at column 0 will conclude the claim is
inflated by 50%. It is not. This review's first pass made that error.

**The commit message's F18 number is stale, the report's is right.** `c5a7654`'s message says *"4,969 words
against `skill-standards.md`'s ~5k ceiling"*. The report at `:396-408` says **5,006** and is materially more
candid — it states the file is *at* its ceiling and the split is now owed, rather than under it with headroom.
5,006 is what re-derives. Not filed: a pushed commit message cannot be corrected without a force-push, and the
authoritative artifact already has it right.

## What's good

- **F1–F5 closed by reproduction, not assertion.** The deep pass rebuilt F2's and F5's failure cases in a
  throwaway repo and confirmed both the old defect and the new fix. After round 1 found F1 re-shaped rather than
  fixed, that standard of proof is the right answer.
- **One structural change closed four findings.** A and B as worktrees at `$C^` and `$C` makes "the fix and
  nothing else" true by construction, which deletes the assertion that kept failing instead of hardening it.
- **The report corrects its own false evidence in place rather than dropping it** — F10, F11, F12 and F16 are
  each named, with the withdrawn numbers left visible. F16 withdrawing a figure outright is the harder call and
  the right one.
- **Two defects found in round 2's own drafts and recorded** rather than quietly fixed, including a first F13 fix
  the author judged worse than F13.
- **F18 is deferred honestly.** The report declines to shave six words to report a 4,999, and says so.

## Recommendation

**Request changes — R1.**

R1 is a one-line fix and it is the only blocking item. R2 and R3 are single-line corrections to the report and
belong in the same pass, since both are false-evidence defects of the class round 1 filed and this report marks
closed. R4, R5 and R6 are reasonable to defer with a line each in the report.

Nothing here suggests the approach is wrong. The oracle's mechanism is sound this round; what is missing is the
guard on the one input that names what the oracle is judging.
