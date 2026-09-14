# Feature: correct the four (five) prose sites that describe the `codeql` gate as blocking on inherited alerts

**Ticket**: [#400](https://github.com/linardsb/ux-factory/issues/400) — raised as Q1 out of #388's plan.
**Type**: documentation correction (AI layer + one workflow comment). No behaviour change.
**Branch**: `docs/codeql-gate-prose-400`, cut from `main` at `8fbd46e`.

## Problem Statement

Four committed prose sites assert that the `codeql` gate has no baseline delta and therefore blocks a
PR on every open high or critical alert on its merge ref, inherited ones included. That model is false
both by measurement and by GitHub's own documentation. The gate is **diff-scoped**: GitHub shows an
alert on a pull request only when *all* the lines of code it identifies are in that PR's diff.

## Solution Statement

Route 1 of the two the issue offers: **correct the prose, leave the gate alone.** Confirmed by the
owner, 2026-09-14. Route 2 (fold a read of `main`'s push analysis into the PR gate, reinstating the
inherited-alert block) is a policy change, not a correction, and branch protection on `main` is
currently OFF, so it would buy a merge block nothing enforces. It is filed as a follow-up, not done here.

The correction is written against the **documented display rule**, not the overlay/diff-range mechanism:
whether *every* query participates in diff-informed analysis is stated nowhere, so the guarantee has to
rest on the sentence GitHub publishes, with the job log as corroboration only.

## Scope — five sites, not four

The issue names four. A fifth is live, and two further clauses inside `gates.md:133` are falsified by
the same measurement and would survive a minimal flip of that bullet's headline:

| # | Site | What is false |
|---|---|---|
| S1 | `.claude/references/gates.md:133` | "NO BASELINE DELTA … fails on every high or critical alert it finds, whether or not the PR introduced it"; **plus** "a genuine false positive is a **standing merge block**" (it blocks only PRs whose diff covers those lines); **plus** "the CodeQL bundle reproduces the gate exactly" (#388's F4: the parity was measured against `refs/heads/main`'s *push* analysis — the local scan is a strict superset, not the gate) |
| S2 | `.claude/references/gates.md:141` | "an alert inherited from `main` blocks **every** PR" — the whole bullet |
| S3 | `.claude/references/gates.md:142` | the cross-reference "#400, which also covers the inherited-alert bullet above" goes stale when S2 is replaced |
| S4 | `CLAUDE.md:162` | "blocks a PR on ANY open high or critical alert on its merge ref — not only a new one, because there is no baseline delta" |
| S5 | `.github/workflows/verify.yml:16-19` + the gate step's own comment | silent about diff scope while `audit` beside it is labelled DELTA, which implies `codeql` is not scoped; and the step's `state=open` query is the exact thing that was misread as the guarantee |
| S6 | `.claude/skills/piv-fix-review-findings/SKILL.md:342-345` | hedges — "Issue #400 settles which — until it does, say which reading you acted on". #400 settles it |

**S2 is replaced, not deleted.** `gates.md`'s security section is a cannot-reach list; the honest
replacement for "inherited alerts block every PR" is the cannot-reach it actually is — an open high
alert on `main` that no PR's diff touches blocks nothing and the gate stays green while it sits there.

**`CLAUDE.md:162` keeps an equivalent pin.** Its "it is deliberate — leave it" is what stops churn
today. Correcting the claim without re-pinning it leaves a true-but-unpinned line that the next session
reads as an invitation to implement route 2.

## Out of Scope / Non-Goals

- **Not changing `.github/workflows/verify.yml`'s `codeql` job logic.** Only its comments. The gate is
  what #400 decided to leave alone.
- **Not revising `.claude/plans/security-gate-387.md`, `.claude/reports/codeql-baseline-remediation-report.md`
  or `.claude/reports/security-remediation-loop-388-report.md`.** They record what was believed and
  measured at the time; a report that is rewritten stops being a record. #395's fourteen fixes were real
  defects — only its stated *urgency* rested on the false model, and the PR body says so.
- **Not `.claude/plans/security-remediation-loop-388.md`.** Same reason; it is in fact the document that
  first measured this, and its F1/F4/Q1 are the source of this ticket.
- **Not widening the `high`+`critical` threshold**, and not touching `.github/codeql/codeql-config.yml`.

## Step-by-step tasks

1. **S1** — rewrite `gates.md:133` as a diff-scoped bullet: the documented display rule first, the #394
   measurement as evidence, the undocumented half named, `audit`-vs-`codeql` restated (delta vs
   diff-scoped, near-identical effect), the false-positive consequence corrected, and the local-CLI
   clause corrected to superset-not-equal.
   → verify: the strings `NO BASELINE DELTA`, `standing merge block` and `reproduces the gate exactly`
   are gone from the file; `grep -c "diff-scoped" .claude/references/gates.md` ≥ 1.
2. **S2** — replace `gates.md:141` with the cannot-reach clause, including that the scope is GitHub's
   behaviour and can move with nothing here noticing.
   → verify: `grep -n "inherited from" .claude/references/gates.md` is empty.
3. **S3** — repoint `gates.md:142`'s parenthetical at the corrected bullets.
   → verify: no reference to an "inherited-alert bullet above" remains.
4. **S4** — rewrite `CLAUDE.md:162`'s CodeQL clause, keeping "leave it".
   → verify: `grep -n "leave it" CLAUDE.md` still hits line 162; `ANY open high` is gone.
5. **S5** — correct `verify.yml`'s header comment and add the diff-scope note to the gate step's own
   comment block, beside the `state=open` query it explains.
   → verify: `node -e` YAML sanity is not available zero-dep; instead `git diff` shows comment-only lines
   (`#`-prefixed) and the CI `verify` job parsing the workflow at all is the real check.
6. **S6** — collapse the skill's hedge to the settled answer.
   → verify: `grep -n "#400" .claude/skills/piv-fix-review-findings/SKILL.md` shows a settled reference,
   not a pending one. Confirm there is no live global mirror (`find ~/.claude -name SKILL.md -path "*fix-review*"`
   returns only the 2026-08-28 archive and two job scratch copies — none of them loaded).
7. **Validate** — `node tooling/build-checks.mjs`, `node tooling/drift-check.mjs`, `node agent-layer/gen-token-css.mjs --check`
   equivalent via the verify job's own commands, plus a portal boot smoke (owner requires `piv-validate`
   even on docs-only PRs).
   → verify: each prints its own pass line.
8. **Report + PR** — `.claude/reports/codeql-gate-prose-400-report.md`, PR body carries `Closes #400`,
   and a follow-up issue is opened for route 2 and linked.

## Validation commands

```
node tooling/build-checks.mjs          # all groups pass
node tooling/drift-check.mjs           # includes the group-count leg that READS CLAUDE.md and gates.md
cd portal && npm start & curl -s localhost:4747/api/health
```

`drift-check`'s group-count leg parses `CLAUDE.md` for `(\d+) PURE groups` and `build-checks' (\d+) groups`,
and `gates.md` for `(\d+) pure groups`. **None of those three strings may be reworded by this PR** — a
reworded claim makes that leg report "states no group count" and CI goes red.

## Acceptance criteria

1. No committed prose outside `.claude/plans/` and `.claude/reports/` states that the gate blocks on an
   alert the PR's diff does not cover.
2. `gates.md` states the diff-scoped behaviour against GitHub's documented display rule and names the
   undocumented half rather than asserting it.
3. `gates.md` carries a cannot-reach clause for the alert on `main` that blocks nothing.
4. `CLAUDE.md:162` is true and still pinned.
5. `verify.yml`'s header and its gate step both say diff-scoped; the job's logic is byte-identical.
6. The skill no longer hedges on #400.
7. `build-checks` and `drift-check` both green; portal `/api/health` answers.
8. Route 2 is filed as its own issue and referenced from the PR.

## Open questions / assumptions

- **Q1 — route 2's follow-up.** Assumption: file it and link it, do not implement. The owner chose
  route 1 explicitly; the issue itself calls route 2 "a bigger decision".
- **Q2 — `gates.md:126`'s one-line summary of the `codeql` job** ("plus a step of ours that reads the
  resulting alerts through the code-scanning API") is not false, only silent. Assumption: leave it —
  the corrected bullet is nine lines below it, and adding "diff-scoped" there makes a fourth copy of a
  claim this repo's own three-copies rule already warns about.
