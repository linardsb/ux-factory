# #408 report — the gate now reads `main` too

Plan: `.claude/plans/codeql-inherited-alert-408.md`. One commit, five files.

## What landed

`.github/workflows/verify.yml` — the gate step is two legs behind one `JQ_BLOCKING` filter, each
with its own positive control, both printing before an accumulated `fail` decides the exit. Leg 2
reads `refs/heads/main`. The header and the step comment say so; #409's F1 comment, which told the
next reader that changing this was "a policy decision (#408), not a fix", is replaced by the
decision's outcome.

`.claude/references/gates.md` — four bullets. The `codeql` summary now says two legs. The
diff-scoped bullet keeps #400's whole measurement, because the display rule is still *why* leg 1
alone was insufficient, and adds what leg 2 does and does not depend on. The inherited-alert
bullet is inverted with its costs and three new cannot-reaches. The threshold bullet's pointer to
`piv-fix-review-findings` now says the skill routes leg 1 only.

`CLAUDE.md:162` — the "leave it" pin kept, on the new claim.

`.claude/skills/piv-fix-review-findings/SKILL.md` — step 4 gains the second read, and the
full-tree-oracle bullet gains leg 2's consequence. Without this the skill reports "clean" off a
merge-ref read of zero rows while the gate is red on leg 2 — its own documented fail-open shape.

## Observed

| what | result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ all 34 groups pass |
| `node tooling/drift-check.mjs` | ✓ 13 legs incl. `group-count`, which parses both edited docs |
| `node tooling/token-lint.mjs` | ✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| portal smoke (`PORT=4791`) | `/api/health` → 200, `{"ok":true,…}` |
| `yaml.safe_load` on `verify.yml` | parses; step env = `GH_TOKEN, REF, MAIN_REF, JQ_BLOCKING` |
| `bash -n` on the extracted step | OK |

## The step driven against the real API

The workflow cannot run locally as CI runs it, so the step's own `run:` body was extracted from
the parsed YAML and executed with `gh api`, `GITHUB_REPOSITORY=linardsb/ux-factory` and a real
`RUNNER_TEMP`. Four runs:

1. **Green, both legs.** `REF=refs/pull/409/merge`, `MAIN_REF=refs/heads/main` →
   `no high or critical alerts on refs/pull/409/merge (2 analysis/analyses read)` and
   `… on refs/heads/main (11 analysis/analyses read)`, exit 0.
2. **Leg 2 red.** Same, with `state=open` mutated to `state=fixed` — which resurfaces the fourteen
   #395-era high alerts on `main` → leg 1 still green, leg 2 printed
   `::error::main already carries 14 blocking alert(s) — NOT this PR's doing…` and the fourteen
   rows, exit 1.
3. **Both legs red.** Run 2 with `REF` also pointed at `refs/heads/main` → BOTH `::error::` lines
   printed, with their different wordings, exit 1. This is the one that proves the accumulate-then-
   exit control flow: `set -e` does not abort after leg 1 fails, so leg 2 still reports.
4. **Leg 2's positive control.** `MAIN_REF=refs/heads/no-such-branch-408` →
   `::error::no CodeQL analysis on refs/heads/no-such-branch-408 — this gate measured nothing`,
   exit 1. It fails closed and names the ref.

Run 2 and 3 are the mutation tests: the new leg has been observed going red on real alert data,
not only green on a clean tree.

## State it landed on

`main` carries **0** open alerts of any severity, and there are **0** open PRs (both `gh api`,
2026-09-14). Nothing was stalled by this.

Branch protection on `main` is still OFF (`branches/main/protection` → 404, `rulesets` → `[]`,
2026-09-14), so the new leg is a red check the owner can merge past rather than a mechanical
block. The owner took that sequencing knowingly; it is recorded in `gates.md` rather than left for
someone to rediscover.

## What this report cannot claim

The step has not run **in CI** yet — under `secrets.GITHUB_TOKEN` with `security-events: write`
rather than a local PAT. That is the one thing the local drive cannot reach, and the PR carrying
this change runs it. Read the PR's own `codeql` job log for the two new lines before treating the
leg as proven in place.
