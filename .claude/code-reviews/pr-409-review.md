# Review: PR #409 — the `codeql` gate is diff-scoped, not a whole-tree read (#400)

**Verdict**: approve. Docs-only, no logic changed, all four local gates green.
**Reviewed at**: `706d8b2` + the two follow-up commits on `docs/codeql-gate-prose-400`.
**Base**: `main@8fbd46e`, merge state checked before triage (no divergence — the branch was cut from that SHA
today and `main` has not moved since).

## What this PR is

#400 measured that four committed prose sites describe a gate that does not exist. Route 1 corrects the prose.
The `codeql` job's steps are byte-identical; every workflow change is a `#`-prefixed comment.

## Findings

**F1 (was high, FIXED before merge) — the new gate-step comment recreated the ticket's own error class.**
The first draft read *"An alert inherited from main therefore does not appear here and does not block"*,
unqualified. That is false in the same way the old prose was false in the other direction: under the display
rule cited two lines above it, an inherited alert **does** appear and **does** block when the PR's diff happens
to cover all the lines it names. `gates.md:141` gets this right ("that no PR's diff touches") and the workflow
comment dropped the qualifier. A reader taking it literally concludes inherited alerts are unreachable — the
exact misreading class this ticket exists to correct. Fixed: the comment now says the alert does not appear
*unless this PR's diff happens to cover every line it names*.

**F2 (medium, addressed in the PR) — the issue's four sites are six.** Two further falsified clauses sit inside
`gates.md:133` and a minimal flip of that bullet's headline would have left both standing:
- *"a genuine false positive is a standing merge block"* — it blocks whichever PR's diff covers those lines.
  This is not cosmetic: #388's no-dismissal policy was budgeted against the standing-block shape.
- *"the CodeQL bundle reproduces the gate exactly"* — falsified by #388's own plan (F4); the parity was against
  `refs/heads/main`'s push analysis. This is the more dangerous of the two, because it tells a reader the local
  CLI **is** the gate, when a local red does not predict a red gate at all.

**F3 (medium, addressed) — a fifth live site.** `.claude/skills/piv-fix-review-findings/SKILL.md:342` hedged
explicitly pending #400 ("say which reading you acted on"). Left alone, the ticket would have closed with a
skill still routing on an open question it had settled. No live global mirror of that skill exists
(`find ~/.claude -name SKILL.md -path "*fix-review*"` returns the 2026-08-28 archive and two job scratch
copies; none is loaded), so the repo copy is the only one.

**F4 (low, accepted) — `gates.md:141` is replaced, not deleted.** Correct call. That section is a cannot-reach
list; deleting the bullet would have removed a true limitation along with the false claim. The replacement
states the limitation that actually holds and adds the one nothing else covers: the scope is GitHub's
behaviour, not a setting here, so it can move with nothing in this repo noticing.

**F5 (low, accepted) — `CLAUDE.md:162` keeps its pin.** "It is deliberate — leave it" is what stops churn on
that line. Correcting the claim without re-pinning it would leave a true-but-unpinned sentence that reads as an
invitation to implement route 2. The rewrite keeps an equivalent pin on a true claim.

**F6 (low, accepted) — the plans and reports are left as records.** `.claude/plans/security-gate-387.md`,
`.claude/plans/security-remediation-loop-388.md` and the two `.claude/reports/` files state the old model.
Revising them would erase the evidence for this PR — #388's plan is the document that first measured the
behaviour. The PR body says so explicitly rather than leaving the divergence unexplained.

**F7 (low, no action) — `gates.md:126`'s one-line job summary is silent on scope.** Not false. The corrected
bullet is seven lines below it, and this file's own three-copies problem is the argument against adding a
fourth statement of the same claim.

## Validation (observed on the branch)

```
node tooling/build-checks.mjs   → build ✓  all 34 groups pass
node tooling/drift-check.mjs    → drift-check ✓  syntax · token-css · annotated-source · loc-summary ·
                                  param-count · system-graph · inspect-data · inspect-mounts · handoff ·
                                  scenarios · traces · replay · group-count
node tooling/token-lint.mjs     → token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid
portal, PORT=4791               → {"ok":true,…,"bootSha":"8fbd46e…","stale":false}
```

`drift-check`'s group-count leg parses `CLAUDE.md` for `(\d+) PURE groups` / `build-checks' (\d+) groups` and
`gates.md` for `(\d+) pure groups`. None of the three was reworded; the green leg is the mechanical proof.

**What these cannot reach.** No local gate parses `.github/workflows/verify.yml`. The comment-only edits are
proved to parse by the `verify` job running at all on this PR — checked on CI, not locally. And
`.github/workflows/` is deliberately outside CodeQL's allowlist, so the `codeql` job cannot raise anything on
this diff; its green is not evidence about the workflow edit.

No visual-regression run: no shipped page is touched, so no baseline can move.

## Follow-up

Route 2 is [#408](https://github.com/linardsb/ux-factory/issues/408) — fold `main`'s push analysis into the PR
gate so an inherited alert blocks every PR. Filed with the evidence, including that branch protection on `main`
is off (verified 2026-09-14: `branches/main/protection` → 404, `rulesets` → `[]`), so today it would buy a merge
block nothing mechanically enforces.
