# Implementation Report — the security gate's remediation loop (#388)

**Plan**: `.claude/plans/security-remediation-loop-388.md`
**Branch**: `feature/security-remediation-loop-388`
**Status**: COMPLETE

## Summary

`piv-fix-review-findings` gained a third input: a PR number. Given one it reads that PR's open CodeQL alerts
through the code-scanning API using the gate's own query, refuses four ways when the read would measure nothing,
triages `high`/`critical` as blocking and everything else as reportable, closes five suppression routes by name,
and proves each fix against a local CodeQL A/B that can say no. The loop is local and capped at three cycles; the
pushed CI scan is confirmation, never the oracle.

The whole thing was run end to end against a throwaway seeded PR (#399, closed and deleted). It went red, took two
cycles, and went green — and the second cycle exists because cycle 1's own fix raised a new alert the A/B could not
see. That finding is now a clause in the skill.

## Tasks completed

| # | Task | Where |
|---|---|---|
| 1 | Branch off `origin/main` | `feature/security-remediation-loop-388` |
| 2 | Durable CodeQL CLI | `~/.codeql/2.27.0` (relocated from a reapable scratchpad; `codeql version` → 2.27.0) |
| 3 | Frontmatter — third positional, `description` extended | `SKILL.md:1-5` (UPDATE) |
| 4 | §0.5 — the four-step CodeQL read and its refusals | `SKILL.md` §0.5 (CREATE) |
| 5 | CodeQL triage: severity mapping, scope inversion, strict boundary, tick-count checklist | §1 (UPDATE) |
| 6 | No suppression — five routes + the API assertion | §1 (CREATE) |
| 7 | The fix oracle — local single-query A/B + the pre-push full-suite scan | §2 (CREATE) |
| 8 | The loop, its budget, and the step read-back | §2, §4 (CREATE) |
| 9 | §3 Validate — the repo's four real gates inline | §3 (UPDATE) |
| 10 | Output — the CodeQL report shape | Output (UPDATE) |
| 11 | Mirror to the global copy | `~/.claude/skills/piv-fix-review-findings/SKILL.md` |
| 12 | End-to-end demonstration | PR #399 — closed, branch deleted |
| 13 | `gates.md:138` corrected; report; PR | `.claude/references/gates.md:138` (UPDATE) |

## Tests added

None, and none were to be invented — the repo has no suite (`CLAUDE.md` §Testing). A skill file has no unit test;
it is proved by running it. Task 12 is that run, and every check in it was chosen so it could fail:

| Check | How it was proven able to fail |
|---|---|
| analyses positive control | pointed at `refs/pull/386/merge` (predates the gate) → `0`, exit 0 → refuses |
| currency control | second-parent compare; on #399 it read `eb045cc == head`, and again `46c9c57 == head` after the push |
| A-side of the fix oracle | run on the **post**-fix database it lists nothing — which is the refusal, and is exactly what `dbB`/`dbC` returned |
| extraction control (door 5) | `unzip -l dbA/src.zip \| grep -F tooling/__tmp-seed.mjs` → 1 row; a file outside the allowlist prints none |
| step read-back | a push-to-main run reads `skipped`, not `success` (job `103281632701`) |

## Validation results

**The four repo gates, on this branch, staged:**

```
node tooling/build-checks.mjs   build ✓  all 34 groups pass
node tooling/token-lint.mjs     token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid
node tooling/drift-check.mjs    drift-check ✓  13 checks (syntax · token-css · … · group-count)
portal smoke (PORT=4788)        {"ok":true,…,"bootSha"=="headSha","stale":false};  Origin: evil.test → 403
```

`.claude/` matches no `gen-loc-summary` group, so no `loc-summary` regen and no visual-regression baseline is owed.

**Task 12, end to end on PR #399** — one PR, three `verify` runs, the gate's own step as the verdict:

```
run 34608824369   step "Require no high or critical alerts" = failure
                  #2 critical js/command-line-injection  tooling/__tmp-seed.mjs:9
                  #1 critical js/code-injection          tooling/__tmp-seed.mjs:10
run 34609227285   step = failure   (cycle 1)
                  #17 high js/reflected-xss              tooling/__tmp-seed.mjs:10
run 34609657133   step = success   (cycle 2)
```

`cycles used: 2 of 3.`  Checklist: **2 of 2 blocking alerts fixed**, plus the 1 the first fix introduced — 3 of 3
alerts ever raised, all closed in code.

**The local A/B (CodeQL 2.27.0, the Action's own bundle):**

```
dbA (pre-fix)   baselineLinesOfCode 43641   CodeInjection.ql + CommandInjection.ql
                js/code-injection          security-severity 9.3   __tmp-seed.mjs:10
                js/command-line-injection  security-severity 9.8   __tmp-seed.mjs:9
dbB (post-fix)  same two queries                      0 results
dbC (cycle 2)   FULL default suite, no query argument 0 results over 166 files
```

Both SARIF severities are ≥ 7.0, which is the gate's `high or critical` expressed on SARIF's numeric axis.

The plan's Q6(d) — driver or extensions — is settled for this query set and only for it. Read with the two paths
separated rather than merged: `runs[0].tool.driver.rules` carried **both** entries, and all three extensions
(`codeql/javascript-queries`, `codeql/javascript-all`, `codeql/threat-models`) carried **zero**; each result
references `rule.index` with `toolComponent` absent, i.e. the driver. The skill still requires reading both paths,
because one query set is not the general case and a parser that finds no rule entry scores every result 0.0.

**No suppression, asserted rather than claimed:**

```
CodeQL config files touched by the demo diff : 0
codeql[ / lgtm[ comments added               : 0
alerts state=open on refs/pull/399/merge     : 0
alerts state=dismissed                       : 0
alerts state=closed                          : #1, #2, #17 — every one state=fixed, fixed_at set,
                                               dismissed_at / _by / _reason / _comment all null
```

**The mirror:** `diff` of the repo copy against `~/.claude/skills/piv-fix-review-findings/SKILL.md` is clean.

## Deviations from the plan

**D1 — Phase order inverted.** The plan runs Phase 1 (the 3.3 GB bundle) before Phase 2 (the skill). The skill was
written, gated and ready to commit first; the bundle copy ran in the background beside it. Task 2's own SATISFIES
line serves AC #1's oracle, not the skill text, so nothing was gated on it.

**D2 — Two plan snippets picked the wrong end of a list, and one was a live defect.** Task 8's
`[.workflow_runs[]|select(.name=="verify")]|last|.id` takes the **oldest** run on a head SHA: measured,
`/actions/runs` returns newest-first, so `last` is the stale green that read exists to prevent — and it looks
correct whenever there is exactly one run, so a re-run breaks it silently. Task 4's `analyses?…--jq '.[0]…'` leans
on the same undocumented default in the other direction (there it happens to be right: on `refs/pull/391/merge`,
`.[0]` and `max_by(.created_at)` both returned `2026-09-11T09:43:37Z`). Both are `max_by(.created_at)` in the
skill, which is correct whichever way the API sorts.

**D3 — The body is 3,479 words against `skill-standards.md`'s 1,500–2,000 target, and there is still no
`references/` split.** The plan rejected the split on the premise that the body was 585 words with room to spare;
this edit falsifies that premise, so the decision was re-taken rather than inherited. It stands, on better
evidence: `piv-plan-implementation` is **3,563 words with no `references/`**, so an inline body past target is the
in-family precedent, and the ~5k hard ceiling is not near. The material reason is that every clause here is a
falsifiability guard sitting at the point of the command it guards; behind a `references/` link they become
optional reading, and each one of them is a silent-false-pass trap. Logged, not silently honoured.

**D4 — `--codescanning-config` is passed at `database create` after all.** The plan says the A/B "does not need the
config at all" because it passes an explicit query. True of query *selection* and false of *scope*: the config is
what makes the database match the gate's allowlist, which both the door-5 extraction control and D5's pre-push scan
read. The skill says so.

**D5 — A clause the plan does not contain, and the demo is why.** The single-query A/B cannot see a finding the fix
*introduces*. Cycle 1 replaced `eval(q)` with `res.end(String(q))`: both criticals cleared, the A/B went green, and
the push raised `js/reflected-xss` at the same line. The skill now requires one full-suite local scan on the
post-fix tree before the push (`database analyze "$DB"` with no query argument), reading the rows on the files the
fix touched. That is a cheap scan against a CI round trip and a spent cycle — the exact trade this loop exists to
make.

**D6 — §3 names this repo's four gates inline inside a skill that is mirrored globally.** Following the plan. It is
a real portability tension (`skill-standards.md` §Portability), mitigated by stating the generic rule first — run
the project's own gates — and labelling the four as `ux-factory`'s. Flagged as a finding, not resolved: the same
tension already runs through §0.5, which names this repo's gate, its allowlist and its committed-run trees.

**D7 — The demo cost two cycles, not one.** Not a deviation from the plan's budget (3), but the plan's Task 12
VALIDATE assumes one pass. The second cycle is D5's, and it is the more useful half of the demonstration.

**Not deviations, recorded so a reviewer reads them as decisions:** `gates.md:129` and `:137` were left alone
(Q1's issue, deliberately not this PR); `gates.md:11`'s literal "34 pure groups" was not touched; nothing was
staged with `git add -A`; `CLAUDE.md:162` was not edited.

## Issues encountered

**The cycle-1 regression (D5).** Described above. It cost one CI round trip and produced the best clause in the
file.

**The demo's three fixes were two deletions and one argv change, and the report shape's own rule applies to them.**
`exec(\`echo ${q}\`)` → `execFile("echo", [q])` is a genuine fix: the value becomes an argv element no shell
parses. The other two are not hardenings and are not described as any. `eval(q)` had no legitimate version, so it
was removed; `res.end(String(q))` was then removed for the same reason once it raised `js/reflected-xss`. A
throwaway seed affords that and a real finding usually does not — the classification the skill asks for
("genuinely exploitable / a check that could not fail / an analyser-legible restructure with no security change")
exists precisely so that the difference is stated rather than smoothed over.

**AC #2 is met against a replacement the owner has not ruled on.** The ticket's original — "the PR stays a draft" —
names a mechanism that does not exist here (`GITHUB_TOKEN` cannot mark a PR ready, and `main` carries no branch
protection). The plan proposes the gate's own step conclusion as the replacement and flags it as unsettled. The
demonstration delivers exactly that: `failure` → `failure` → `success`, read from the jobs API. **Reported as the
proposed AC met, not as the ticket's AC met.**

**What the demo does not prove.** The seed is a new file, so its lines sit inside the PR diff on every push — for
this demo the merge-ref read *would* have been a sound oracle. The diff-informed hazard the plan's F3 is built on
rests on the PR #394 measurement, not on anything observed here. The A/B is still the right oracle; this run did
not have to exercise its hardest case.

**Q1's follow-up is filed** as [#400](https://github.com/linardsb/ux-factory/issues/400): `gates.md:129`, `gates.md:137`, `CLAUDE.md:162` and
`verify.yml:16-19` all describe a gate with no baseline delta that blocks on inherited alerts, which the #394
measurement and GitHub's own documentation both contradict. Not corrected here — `CLAUDE.md:162` is pinned
"leave it", and that is the owner's call.

**Q2 — the two skill copies still do not sync.** Mirrored by hand, `diff` clean. There is no generator, and
`~/.claude` is not a git repo, so the mirror cannot ride in this PR. Owner's open decision.
