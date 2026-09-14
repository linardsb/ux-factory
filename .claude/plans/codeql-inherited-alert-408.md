# #408 — the codeql gate blocks on an alert `main` already carries

Route 2 of #400, the route #409 deliberately did not take. Owner's call, asked and answered
2026-09-14: **fold `main` into the PR read** (the issue's option 1), not option 2's full-tree
re-scan, and not "defer until branch protection is on".

## What decides it, as the issue framed it

Two different promises: *"this PR introduced nothing high"* and *"`main` carries nothing high"*.
Only the second survives an alert nobody happens to touch. #387's prose claimed the second for
four months; #400 found the gate only made the first and corrected the prose. This ticket makes
the prose true again by changing the gate, not the claim.

## The change

One step, two legs, in `.github/workflows/verify.yml`'s `Require no high or critical alerts`:

1. **Leg 1** — `refs/pull/N/merge`, unchanged. Diff-scoped by GitHub's display rule (#400).
2. **Leg 2** — `refs/heads/main`, new. Its push analysis is the full-tree one, so reading its
   open high/critical alerts is what takes the reach back.

Design points the implementation is held to:

- **Both legs always run and both print**, then the step exits on an accumulated `fail` flag. A
  red gate naming only the first failure is half a diagnosis.
- **Two distinct `::error::` lines.** "this PR's diff raises N" vs "main already carries N — NOT
  this PR's doing. Fix them on main; that clears this leg for every open PR at once." Without the
  second wording the red check is unactionable in the PR it lands on, which is the issue's own
  stated cost.
- **Leg 2 gets its own positive control**, the same `^[0-9]+$` guard then `-lt 1` as leg 1, for
  the documented `-e`-exemption reason. Zero alerts because `main` is clean and zero because
  `main` was never analysed look identical, and leg 2 is the only thing watching that ref.
- **The ref is the literal `refs/heads/main`**, pinned to this workflow's own
  `on: push: branches: [main]`. NOT `base.ref`: a PR based on a feature branch has no push
  analysis, and the control would then red the gate for a missing scan rather than a finding.
- **One `JQ_BLOCKING` env var feeds both legs**, so the two queries cannot drift apart.

## Prose that moves with it

`.claude/references/gates.md` (the `codeql` summary bullet, the diff-scoped bullet, the
inherited-alert bullet — inverted — and the threshold bullet's cross-reference), `CLAUDE.md:162`,
`.github/workflows/verify.yml`'s header and gate-step comment, and
`.claude/skills/piv-fix-review-findings/SKILL.md`: its step 4 reads only the merge ref, which
after this lands is a fail-open (a red job whose cause is leg 2 reads as "clean").

## Validation

Four gates plus the mutation tests. The workflow step cannot run locally as CI runs it, so each
leg is driven against the real code-scanning API with `gh api`, and the failure paths are reached
by mutating the query rather than by reading the code.
