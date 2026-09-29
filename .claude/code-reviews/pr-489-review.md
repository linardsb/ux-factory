# PR #489 review: approach.html names "start with concrete cases" (#487)

**Head** 0a59d875dae14c92c50a1ca186430cce538245ce · **Base** main @ `944ad01dcce2bcf5ce66e7186d97355cbb04239f` · first round (no prior report, guarantees pass skipped)

**Recommendation: approve.** No Critical, High or Medium findings. Three Low findings: one fixed in this round, two left to the owner. Posted as a comment because the author cannot approve their own PR in this solo repo.

## Validation
| Gate | Result | Provenance |
|---|---|---|
| CI `verify`, `visual`, `codeql`, `audit`, `gates-green`, CodeQL | all pass on `0a59d87` | observed, `gh pr checks 489` |
| `node tooling/build-checks.mjs` | `build ✓  all 48 groups pass` | observed on `0a59d87`, wt-487 |
| `node tooling/drift-check.mjs` | `drift-check ✓` | observed on `0a59d87` |
| `node tooling/token-lint.mjs` | `63 contract tokens · 0 undeclared · 0 orphan` | observed on `0a59d87` |
| Baseline heights (neutral / saulera / verdant) | 6423 / 6729 / 6403 px | observed, PNG IHDR, matches the report |

## Findings
- **F1 (Low, owner step)** `approach.html:138-142`: the attribution to Ryan Singer's post is unlinked, and the quotation marks around "if" read as a direct quote. This is documented as plan Q1, with the owner supplying the URL. If the post can't be found, drop the quotation marks or cite Shape Up instead.
- **F2 (Low, optional)** `approach.html:134`: the reviewer said "the technicians' side is left general" asserts a scoping decision the sources don't record. Rebutted in part: `scenarios/fieldwork/intake.defaults.json:8` records "keeps the product a board, not a suite", and `proto.config.json` builds only `dispatch-board`. Rewording is the owner's call.
- **F3 (Low, fixed this round)** the report said `approach.html` grew "+13 lines". That was true of `4675642` only; after `be6f6c0` the total is +19 (observed, `git diff --stat origin/main -- approach.html`). Report corrected.

## Numbers pass
Every figure in the PR body and the report was traced to a run. The one figure no run produced, the ~4.97:1 contrast, is correctly labelled derived, and the report says its background was read from a screenshot. The PR body's "local, on `0a59d87`" is now observed, because the gates were re-run on that head during this review.

## What's good
- Every factual clause traces to a committed source line, and the report's table makes each one re-derivable.
- The honesty contract holds: all three examples are labelled fictional, Faster Payment is framed as a real run on a fictional scenario, and nothing implies Singer endorses the site.
- The link underline is page-scoped and uses no literal values. It matches only the paragraph's three links (checked: the only other `<a>` in `#method` sits outside `.max-prose`), and the regenerated baselines show it.
