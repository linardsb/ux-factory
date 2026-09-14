# Report: #400 — the `codeql` gate's prose corrected to the diff-scoped behaviour

**Plan**: `.claude/plans/codeql-gate-prose-400.md` · **Branch**: `docs/codeql-gate-prose-400` off `main@8fbd46e`
**Route**: 1 of the two the issue offers — correct the prose, leave the gate. Owner's choice, 2026-09-14.

## What changed

Six edits across four files. No logic anywhere; the `codeql` job's steps are byte-identical.

| Site | Before | After |
|---|---|---|
| `.claude/references/gates.md:133` | "NO BASELINE DELTA … fails on every high or critical alert it finds, whether or not the PR introduced it" | "DIFF-SCOPED on a pull request, not a whole-tree read" — the documented display rule first, the #394 measurement as evidence, the undocumented half named |
| same bullet | "a genuine false positive is a **standing merge block**" | it blocks whichever PR's diff covers those lines, and returns each time they are touched; #388's routes unchanged |
| same bullet | "the CodeQL bundle reproduces the gate exactly" | it does not — whole tree, no diff ranges, a strict SUPERSET; #395's parity was against `refs/heads/main`'s PUSH analysis |
| same bullet | "#387's own merge scan … armed a trap for the next PR" | the fourteen were real defects and #395 fixed them; the trap was not there |
| `.claude/references/gates.md:141` | "an alert inherited from `main` blocks **every** PR" | replaced by the cannot-reach it actually is: an open alert on `main` no PR's diff touches blocks nothing and the gate stays green; the scope is GitHub's to move |
| `.claude/references/gates.md:142` | "see #400, which also covers the inherited-alert bullet above" | "the two bullets above" — the referent no longer exists |
| `CLAUDE.md:162` | "blocks a PR on ANY open high or critical alert on its merge ref — not only a new one, because there is no baseline delta … leave it" | "any high or critical alert that the PR's OWN DIFF raises … the threshold and the scope are both settled — leave it" |
| `.github/workflows/verify.yml:16-22` | silent on scope while `audit` beside it is labelled DELTA | says DIFF-SCOPED, and that an alert only the push scan finds blocks no PR |
| `.github/workflows/verify.yml` gate step | no note beside the `state=open` query | five comment lines saying that query is not a whole-tree read, and that changing it is #400 route 2, a policy decision |
| `.claude/skills/piv-fix-review-findings/SKILL.md:342-345` | "Issue #400 settles which — until it does, say which reading you acted on" | settled; a finding outside the PR's diff is reported, not fixed, and costs no cycle |

## Scope found beyond the issue's four

The issue names four sites. Two more falsified clauses sit **inside** `gates.md:133` and a minimal flip of that
bullet's headline would have left both standing — "standing merge block" and "reproduces the gate exactly". The
second is falsified by #388's own plan (F4) and is the more dangerous of the two: it tells a reader the local CLI
is the gate, when a local red does not predict a red gate at all.

One fifth live site: `.claude/skills/piv-fix-review-findings/SKILL.md`, which explicitly hedged pending #400.

## What was deliberately left alone

- **`.claude/plans/security-gate-387.md`, `.claude/plans/security-remediation-loop-388.md`,
  `.claude/reports/codeql-baseline-remediation-report.md`, `.claude/reports/security-remediation-loop-388-report.md`.**
  They record what was believed and measured at the time. A report rewritten after the fact stops being a record —
  and #388's plan is the document that first measured this, so overwriting it would erase the evidence for the fix.
- **The `codeql` job's logic and `.github/codeql/codeql-config.yml`.** Route 2 is filed separately.
- **`gates.md:126`'s one-line job summary.** Not false, only silent, and the corrected bullet is seven lines below
  it. Adding "diff-scoped" there makes a fourth copy of a claim this file's own three-copies problem already warns about.

## Validation (observed)

```
node tooling/build-checks.mjs   → build ✓  all 34 groups pass
node tooling/drift-check.mjs    → drift-check ✓  syntax · token-css · annotated-source · loc-summary ·
                                  param-count · system-graph · inspect-data · inspect-mounts · handoff ·
                                  scenarios · traces · replay · group-count
portal on PORT=4791             → {"ok":true,…,"bootSha":"8fbd46e…","stale":false}
```

`drift-check`'s group-count leg parses `CLAUDE.md` for `(\d+) PURE groups` / `build-checks' (\d+) groups` and
`gates.md` for `(\d+) pure groups`. None of the three strings was reworded, and the leg is green, which is the
mechanical proof of that.

No visual-regression run: this PR touches no shipped page, so no baseline can move.

## Deviations from the plan

None. Task 5's stated verify ("`git diff` shows comment-only lines") held — every workflow change is `#`-prefixed.

One correction made after the first draft: the gate-step comment said the false model reached "three prose sites";
it reached four, `verify.yml`'s own header among them. Fixed before commit.

## Follow-up

Route 2 — folding a read of `main`'s push analysis into the PR gate, so an inherited high alert blocks every PR —
is filed as its own issue and linked from the PR. It is a policy change, not a correction: it reinstates a merge
block that branch protection on `main`, currently OFF, would not enforce anyway.
