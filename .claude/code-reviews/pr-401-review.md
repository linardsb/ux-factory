# PR #401 review — `piv-fix-review-findings` reads a PR's CodeQL alerts (#388)

**Head** `1597941` · **Base** `main` @ `79f414e` · round 1 (no prior report — the guarantees pass does not apply)
**Reviewer** `piv-review-pr`, fresh context, plus the `code-reviewer` agent · **Verdict** request changes

> Posted to the PR as a **comment**, not a formal review: GitHub refuses `--request-changes` (and `--approve`)
> on one's own pull request, which on a solo repo is every PR. The verdict above is the review; the check state
> on the PR does not reflect it.

## Summary

The ticket is delivered and the demonstration is real. Every figure in the PR body and the report re-derives
against the API, including the one that reshaped the ticket. Eight defects, one of them in the mechanism the PR
itself calls "the hard part": the local A/B oracle is the only part of the file that is not runnable, and the
way it fails is the vacuous positive control the surrounding paragraph warns about.

The through-line: this file is proved by a run whose author had the whole ticket in context. The question it
has to survive is a **fresh agent executing §0.5 and §2 from the text alone**, and as written that agent must
invent a scratch-directory convention and a B-side procedure the file does not give it. All eight fixes are
prose edits in two files.

## Issues

### F1 · High — the fix oracle is the least runnable thing in the file

`.claude/skills/piv-fix-review-findings/SKILL.md:209-224`

The oracle is the skill's own answer to "a fix nothing can falsify is not a fix", and it is the one mechanism
left as prose:

- step 1 creates the worktree at `$S/pr-$N`; step 3 builds `dbA` from `--source-root="$S/treeA"`, a path
  nothing in the file creates;
- step 4 is one sentence — *"B-side. The same query on the post-fix tree. The alert must be gone."* — with no
  command, no source root and no database name. The **positive control gets two full bash lines; the step that
  actually proves the fix gets none**;
- `$S` (`:92`, `:212`, `:220`, `:221`, `:224`), `$CODEQL` (`:215`, `:220`, `:221`, `:242`) and `$DB` (`:181`,
  `:182`, `:242`) are used across five snippets and assigned in none. Confirmed: no assignment to any of the
  three anywhere in the file. The plan shows where it went wrong — `security-remediation-loop-388.md:299` uses
  `$SCRATCH`, `:305-306` switches to `$S`; the split was never reconciled and only the unassigned name shipped.

**Failure scenario.** An agent improvising the two sides it was not given builds A and B over the same tree —
the working tree, post-fix, both times. Both sides return zero, the B-side "the alert must be gone" is
satisfied, and the A-side positive control never fires. That is precisely what `:216-219` spends a paragraph
forbidding: *"a local zero out of a vacuous database looks exactly like a clean tree."* Nothing downstream
catches it — §2's pre-push full-suite scan is a different check, and the CI read is diff-scoped by the skill's
own argument, so the defect ships.

**PR #399's green demo does not cover this.** The implementing agent had full ticket context and evidently
supplied its own `$S`; the report's task 2 never mentions the variable.

**Fix.** Assign `S` and `CODEQL` once at the top of §0.5 (`S=$(mktemp -d)`; `CODEQL=${CODEQL:-$(command -v
codeql || echo ~/.codeql/<version>/codeql)}`), name the A-side tree `"$S/pr-$N"` at `:220` instead of the
dangling `treeA`, and give step 4 the two commands that derive `treeB`/`dbB` from the post-fix tree.

### F2 · Medium — "merge refs are not resolvable through the refs API" is false for the PRs this skill runs on

`.claude/skills/piv-fix-review-findings/SKILL.md:209`

Observed today, same token:

```
gh api repos/linardsb/ux-factory/git/ref/pull/401/merge → 200  be565fff60b946951802f4655ef3cee22a5922c9
gh api …/git/ref/pull/399/merge → 404      gh api …/git/ref/pull/394/merge → 404
gh api …/git/ref/pull/391/merge → 404
```

The refs API answers for an **open** PR and 404s once the PR is closed or merged. The measurement behind the
clause was taken on #399 *after* it was closed and its branch deleted, then written up as a property of merge
refs. §0 requires the PR to be OPEN before any of this runs, so the stated condition is the one case where the
call works.

The instruction is still right — you need the tree locally, so `git fetch` is what you want regardless. The
justification under it is wrong, and a future agent that needs the merge SHA will skip a working call on this
file's authority.

**Fix.** *"the refs API 404s once the PR is closed, and you need the tree on disk anyway — so fetch it."*

### F3 · Medium — the guards are asymmetric, and the read-back cannot reach its own verdict

`.claude/skills/piv-fix-review-findings/SKILL.md:77-80`, `:283`, `:290-293`

Three instances of the same thing: the file argues hard for a readability guard in one place and omits it in
the next.

**(a) The currency check fails open.** Step 2 argues for four lines that `n` must be tested for being a number,
because *"`gh api` can exit 0 while its `--jq` stage prints nothing"*. Step 3 guards none of the three values it
compares:

```bash
HEAD=$(gh pr view "$N" --json headRefOid --jq .headRefOid)
A=$(gh api "…/analyses?ref=$REF&tool_name=CodeQL" --jq 'max_by(.created_at).commit_sha')
P=$(gh api "repos/$R/commits/$A" --jq '.parents[1].sha')
[ "$P" = "$HEAD" ] || { …; exit 1; }
```

A rate limit, an auth blip or a revoked scope empties both reads. `[ "" = "" ]` is **true**, the
stale-analysis refusal never fires, and the skill reads alerts off whatever analysis happens to be there. A
single failure fails closed; both failing together fails open — the shape step 2 forbids by name, in the guard
that exists to stop a stale read.

(The mechanism itself is sound — self-tested on this PR: newest analysis `be565fff`, `.parents[1]` =
`1597941` = head → pass.)

**(b) `J` is unguarded at `:292-293`** while `RUN` above it gets `[[ "$RUN" =~ ^[0-9]+$ ]]`.
`select(.status=="completed")` emits nothing while the job is still running, `J` goes empty, `gh api
"repos/$R/actions/jobs/"` 404s, and the step conclusion this whole section exists to print comes back blank
rather than refusing — a vacuous zero in the verdict line itself.

**(c) `:283`'s `gh pr checks "$N" --watch --fail-fast` exits non-zero exactly when a check fails** — the case
the loop exists for — and nothing says what to do with that status. Chained with `&&` by a literal-minded
agent, a red gate never reaches the read-back at all.

**Fix.** The same guard, at 40 hex, before the compare; the same for `J` at 10+ digits; and one clause at
`:283` saying a non-zero exit here is the expected red path, not an abort.

```bash
for v in "$HEAD" "$A" "$P"; do [[ "$v" =~ ^[0-9a-f]{40}$ ]] || { echo "unreadable sha: [$v] — cannot judge currency"; exit 1; }; done
```

### F4 · Medium — the gate-mechanism contradiction is unsignposted, and produces one divergent instruction

`.claude/references/gates.md:138` · `.claude/skills/piv-fix-review-findings/SKILL.md:245-248`

The new `gates.md` sentence — *"`piv-fix-review-findings` takes a PR number, **reads the blocking alerts off
the merge ref** and fixes them in code without suppression"* — states the read with no diff-scoping qualifier,
three bullets below `:137`'s *"an alert inherited from `main` therefore blocks **every** PR"*, which this PR's
own plan proves false. Leaving `:129`/`:137` to #400 is right and I am not asking for them here; but `:138` was
opened and spent, and as written the new sentence reads as support for the error beside it.

Re-derived independently, today:

```
PR #394 base                         73c49dd
analyses ref=refs/heads/main         73c49dd results=14      (09:46:00Z)
analyses ref=refs/pull/394/merge     71925e1 results=0       (10:46:37Z)
                                     f1ba81e results=0       (10:22:05Z)
alerts   ref=refs/pull/394/merge     open 0 · closed 0 · dismissed 0
PR #394 merged 10:53:07Z, while cd2aac6 on main still carried results=14 (10:54:55Z)
```

**The part that is not just prose.** `SKILL.md:245-248` says *"Findings outside the PR's diff belong on the
base branch: report them, spend no cycle on them."* That is correct under the measured behaviour and wrong
under `gates.md:137`'s — where such a finding still blocks the merge. It is the one place in the skill where
the two readings produce different **actions**, and the plan's own Q1 concedes the mechanism is unsettled
("whether every query participates in diff-informed analysis is undocumented"). So it is not safe to leave
unhedged on the strength of the display rule alone.

**Fix.** Five words at `gates.md:138` — *"off the merge ref (a diff-scoped read — see #400)"* — and a
conditional clause at `SKILL.md:245-248`: if the gate reads every open alert as `:137` describes, these still
block; see #400.

### F5 · Medium — the worktree is never removed, and its name collides on a second run

`.claude/skills/piv-fix-review-findings/SKILL.md:212`

```bash
git fetch origin "refs/pull/$N/merge" && git worktree add --detach "$S/pr-$N" FETCH_HEAD
```

Nothing in the file removes it. Two consequences, both already on this project's record:

- the registration lives in **this** repo's `.git/worktrees/`, which every sibling session shares. Point `$S`
  at a reapable scratchpad (F1's likely fix) and the admin entry dangles for sessions that never ran the skill;
- `pr-$N` is a fixed name, so a second invocation against the same PR — the normal case, since the whole point
  is a repeated loop — fails on `git worktree add`.

The author knew this hazard mid-ticket: report task 2 relocates the 3.3 GB CodeQL CLI out of "a reapable
scratchpad" for exactly this reason. It was not generalised to the worktree.

**Fix.** `git worktree remove` at the end of the loop (or remove-before-add), and a durable location.

### F6 · Low — the honesty-contract defer bucket routes four trees CodeQL cannot raise an alert in

`.claude/skills/piv-fix-review-findings/SKILL.md:145-147`

The bullet routes *"a blocking alert whose fix would mean hand-editing a committed agent run (`traces/`,
`replay/`, `discovery/<slug>/`, `proto/compositions/`)"* to defer. By this repo's own
`.github/codeql/codeql-config.yml`, `traces/`, `replay/`, `discovery/<slug>/` and `handoff/` are outside the
allowlist entirely and `proto/compositions/**` is `paths-ignore`d — so no alert can arise in any of the four.
The `:148` generated-file bullet above it is thin for the same reason.

This matters only because of D3: the 3,479-word body is defended on the ground that *"every clause here is a
falsifiability guard sitting at the command it guards."* This clause guards nothing that can happen.

**Fix.** Keep it if you want the standing rule, but say what it is — a rule for if the allowlist ever widens —
rather than a live triage route.

### F7 · Low — door 5's extraction control reads a legitimate deletion as suppression

`.claude/skills/piv-fix-review-findings/SKILL.md:180-182`

*"After each fix, require the alert's file to still be extracted: `unzip -l "$DB/src.zip" | grep -F '<path>'`
must print a row."* A fix that deletes the offending file prints no row, and the control then classifies a real
fix as moving-code-out-of-scope. The demo itself fixed by deletion at statement level (`eval(q)` had no
legitimate version), and file-level deletion is the same call one step up.

**Fix.** Exempt "the file is gone from the tree" — `git ls-files --error-unmatch <path>` failing — from the
control. The door being closed is *code moved to a path the allowlist does not match*, not *code removed*.

### F8 · Low — the analyses read is unpaginated, and the naive fix is foreclosed by the file's own gotcha

`.claude/skills/piv-fix-review-findings/SKILL.md:78`

`max_by(.created_at)` runs over the default page only. The skill argues at `:83-84` that newest-first ordering
is observed but not contractual — which is why it uses `max_by` rather than `.[0]` — and then reads one page,
which is the same assumption wearing a different hat. `refs/pull/391/merge` already carries 9 analyses
(confirmed); a long-lived PR can pass 30.

**Stated precisely, because the direction matters:** this fails **closed**, not open. If the order ever
inverted, page 1's max would be an old analysis, the second-parent compare would mismatch, and the skill would
refuse. So it is a false-refusal risk, not a stale green — which is why it is Low and not F3's company.

`--paginate` is not the fix: `:110-112` already documents that an aggregating `--jq` under `--paginate` runs
per page, and `--slurp` cannot rescue it (`gh` refuses `--slurp` with `--jq`). Use `per_page=100`, as the
alerts query at `:89` already does, or pipe element-wise output to an external `jq -s 'max_by(.created_at)'`.

## Not filed

- **`SKILL.md:254`'s "a `codeql` job costs 80–87s (measured across four runs)"** is `observed` but does not
  generalise: across all eleven PR `codeql` jobs in this repo the range is 71–94s, including three of the four
  runs on the demo PR this report cites (76s, 81s, 83s). It names its own sample and gates nothing.
- **Second person in the body** (`:150`, `:156`) against `skill-standards.md:90`'s "imperative/infinitive, NOT
  second person". Pre-existing throughout the file at base (5 occurrences), so this PR continues a convention
  rather than breaking one.
- **The hand-mirrored global copy** — `diff`-clean, confirmed; already the PR's own open Q2. Worth knowing that
  the sibling `piv-plan-implementation` copies have *already* drifted (repo 3,563 words, global 2,678), which
  is the argument for settling Q2 rather than a finding against this PR.

## Validation

All `observed`, at head `1597941`, this working tree.

| Gate | Command | Result |
|---|---|---|
| build-checks | `node tooling/build-checks.mjs` | exit 0 — all 34 groups pass |
| token-lint | `node tooling/token-lint.mjs` | exit 0 — 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| drift-check | `node tooling/drift-check.mjs` | exit 0 — 13 checks |
| portal smoke | `PORT=4791 node portal/server.mjs` | `/api/health` `{"ok":true,…,"stale":false}`, `bootSha`==`headSha`==`1597941`; `Origin: https://evil.test` → `403` |
| CI | `gh pr checks 401` | `verify` · `visual` · `codeql` · `audit` · `gates-green` · `CodeQL` all SUCCESS; `mergeStateStatus` CLEAN |
| this PR's own gate | `alerts?ref=refs/pull/401/merge&state=open` | 0 high or critical |

No `loc-summary` regen or visual-regression baseline is owed — the diff touches `.claude/` only.

## The numbers pass

Every figure in the PR body and the report was re-derived. All of them hold.

| Figure | Re-derivation |
|---|---|
| runs `34608824369` / `34609227285` / `34609657133`, step = failure / failure / success | jobs API: `103293870304` failure, `103295209900` failure, `103296652768` success; step `Require no high or critical alerts` matches each |
| alerts `#1` `#2` critical, `#17` high, all `tooling/__tmp-seed.mjs` | exact match on rule ids, severities and lines |
| every alert closed `state=fixed`, `dismissed_*` all null | confirmed on all three; `fixed_at` `14:18:32Z` ×2, `14:22:56Z` |
| 0 open, 0 dismissed on `refs/pull/399/merge` | confirmed |
| `state=closed` is an alias returning `fixed` | confirmed — `state=closed` returns `#1 #2 #17`, each with `.state == "fixed"` |
| job `103281632701` → job `success`, step `skipped` | confirmed |
| `refs/pull/391/merge` carried 9 analyses | confirmed — `length` = 9 |
| the step-4 query is the gate's own | byte-for-byte `verify.yml:221-223` with `.number` prepended |
| `severity=bogus` fails open | confirmed — same result count as an unfiltered read |
| AC #3's premise: an unanalysed ref returns 200 `[]`, not 404 | confirmed on `refs/pull/386/merge` — `HTTP/2.0 200`, `length` 0, exit 0 |
| the #394 diff-informed measurement | re-derived in full, see F4 |
| body `585` → `3479` words; `piv-plan-implementation` `3563` with no `references/` | confirmed on the repo copies |

## What's good

- **The #394 measurement is the strongest thing in the PR**, and it re-derives exactly. Finding that the
  repo's own gate documentation was false, reshaping the ticket around it, and filing #400 rather than
  smoothing it over is the behaviour the evidence discipline is for.
- **D5 earned its clause.** Cycle 1's fix cleared both criticals and raised `js/reflected-xss` at the same
  line; the A/B went green anyway. The resulting "run the full default suite once before the push" rule is the
  best thing in the file, and it exists because the demonstration was allowed to fail.
- **The report states what the demo does not prove, unprompted** — the seed is a new file, so its lines sat
  inside the diff on every push, and for that demo the merge-ref read would have been a sound oracle.
- **The alert query is byte-verified against production**, not paraphrased, and the numeric-guard reasoning at
  `:58-65` is a faithful read of `verify.yml`'s own inline comment including its "review R1" history.
- **The `--slurp`/`--jq` mutual-exclusivity claim at `:112` is correct** — tested rather than assumed.
- **`.parents[1].sha` at `:79` is safe, not a latent bug**: it only ever runs on a `commit_sha` returned for
  `ref=…/merge`, and a mismatched checkout routes to `…/head` and answers `[]`, which the `n<1` guard catches.
- **The API assertion beats the loop.** Requiring `open` → `fixed` with every `dismissed_*` field null, plus
  zero touched config files and zero `codeql[`/`lgtm[` comments, is a verdict that does not depend on the
  model's account of itself.
- `max_by(.created_at)` over the plan's `| last |` is a real defect caught and documented rather than
  inherited (D2). Frontmatter is fully compliant with `skill-standards.md`.

## Recommendation

**Request changes** — F1 alone. The file's central oracle must be runnable end to end, or the first agent to
use it improvises the positive control away. F2–F5 are single-clause corrections; F6–F8 are polish.

Everything else — the demonstration, the figures, the deviations, the deferral to #400 — stands as written.

One housekeeping item: per `CLAUDE.md` §Git, this review file belongs in the same PR. It is written to
`.claude/code-reviews/pr-401-review.md` and is **not** committed — fold it into the F1 fix commit.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_014ndXfgiDENkeRZPqsvKWA5
