# PR #410 review — the codeql gate's second leg (#408)

Reviewed after the first push, against a green CI run (34846737237: `verify`, `visual`, `codeql`,
`audit`, `gates-green` all pass).

## F1 (high, fixed in this PR) — the PR that clears an inherited alert cannot go green

Leg 2 reads `refs/heads/main`'s push analysis. That ref does not move until a PR **merges**. So the
one PR whose purpose is removing an inherited alert is red on leg 2 by construction: leg 1 goes
green (its diff covers those lines, the alert is gone) and leg 2 does not, until it lands.

This is not an implementation defect — it is what the owner's chosen option costs — but the prose
did not say so. `gates.md:141` promised "clearing it on `main` clears every PR at once" without
naming how you reach `main` when every route there is a red PR. Left as written, the next session
rediscovers it as a bug and "fixes" it by making leg 2 read the PR's own tree, which is the issue's
option 2 and was not chosen.

**Fixed** by naming the escape route in both places that make the promise: `gates.md`'s
inherited-alert bullet and the workflow's leg-2 comment. The sanctioned route is to merge that PR
past its own red leg 2, with leg 1's green as the evidence the fix works; `enforce_admins: false`
is what keeps that possible once branch protection goes on. The workflow comment additionally
refuses the wrong fix by name.

## F2 (low, checked, no change) — the renamed TSV artifacts

`$RUNNER_TEMP/codeql-blocking.tsv` became `codeql-pr.tsv` + `codeql-main.tsv`. Grepped `*.md`,
`*.yml` and `*.mjs` for the old path: no hits outside the plan and report records. Nothing dangles.

## What was checked and held

- **The `JQ_BLOCKING` block scalar.** One filter, two legs, so the queries cannot drift apart. The
  YAML `|` scalar's trailing newline is inert for jq; proven by the mutation run's correctly
  tab-separated rows, not by reading.
- **The accumulate-then-exit flow.** `set -e` does not abort after leg 1 sets `fail=1`, because the
  assignment is inside an `if` body — driven, not reasoned: run 3 printed both `::error::` lines.
- **Leg 2's positive control** reuses leg 1's `^[0-9]+$`-then-`-lt 1` shape verbatim, including the
  `[`-in-if-position exemption the existing comment documents. Driven against an unanalysed ref: it
  fails closed and names the ref.
- **`refs/heads/main` as a literal, not `base.ref`.** Correct: no other branch gets a push analysis
  under this workflow's `on:` block, so `base.ref` would red the gate for a missing scan rather than
  a finding. The comment states the reasoning.
- **The skill's fail-open.** `piv-fix-review-findings` step 4 read only the merge ref; after leg 2
  a red job can produce zero rows there. The second read and the routing note close it.
- **CI, under `secrets.GITHUB_TOKEN`.** The one thing the local PAT drive could not reach.
  Job 103984400963 printed both legs: `refs/pull/410/merge (1 analysis/analyses read)` and
  `refs/heads/main (11 analysis/analyses read)`. `security-events: write` is repo-scoped, so the
  branch-ref read needed no extra permission.

## Verdict

Approve after F1. The change does what #408 decided, its failure paths were reached by mutation
rather than inspection, and the cost the design carries is now written down where the next reader
will hit it.
