# PR #398 review — #384, the two verbatim pins

Reviewed at `401ebfe` on `feature/provenance-rule-pin-384`, base `main` at `739abbb`
(`mergeStateStatus: UNSTABLE` only because checks were still queuing; `mergeable: MERGEABLE`,
and every check settled green before the review landed).

**Verdict: approve with four prose fixes, applied on this branch.** The mechanism is correct and
proven. Everything that survived verification was prose, and all of it was introduced by this PR
rather than inherited.

## Method

Four independent lenses over the diff, each finding then adversarially verified by a separate
pass told to default to refuted:

1. *the check that cannot fail* — can each new assertion actually go red, and are its message's
   claims true?
2. *prose truth* — is every copy of the guard clause true after this diff?
3. *blast radius* — did anything move that the PR promised would not?
4. *scope and ticket* — does this do what #384 asked, and is the delivery honest?

11 findings raised, 8 survived verification, deduping to four distinct defects plus one the two
verifiers split on, which I adjudicated as real.

## What the review confirmed as sound

- **The pins can fail, and fail for the right reason.** Both literals match the module
  character-for-character (no lookalike em dash, apostrophe or non-breaking space — they were
  emitted from the module by script and spliced by exact anchor, never retyped), each is on one
  line, and neither compares a shadowed variable.
- **The failure messages' claims are true.** All five fixed input sets do pin
  `provenance: 'fictional'` and do carry a three-`record_decision` ledger, driven over the module.
- **The blast-radius promises hold.** Every changed line in `portal/lib/discovery-postures.mjs`
  is a comment. No posture stamp moved — the parenting group still reads `think 7efdde37`,
  `think-opus` and `grill` current-to-literal. No `group()` added. Nothing under `discovery/`
  touched. `loc-summary.json` and the VR baselines correctly untouched, confirmed by a green
  `drift-check` on the staged tree naming `loc-summary`.
- **The ticket is met**, including the `ledgerBrief` empty-form fold it asked for, and the PR body
  carries the `Closes #384` trailer.

## Findings (all fixed on this branch)

**F1 (medium) — `portal/lib/discovery-postures.mjs:99` and `.claude/references/gates.md:49`: two
new sentences each claiming sole custody of the same statement.**
The header bullet ended "until it lands this bullet is the only place that says so", and the same
commit added a `gates.md` *Cannot reach* clause that states the gap **and** names the header as
the one place that does. The gates.md sentence is self-refuting within itself. This is the exact
three-copies drift class PR #394 was spent correcting, introduced here rather than inherited, and
the failure is concrete: a later ticket widening the evidence-line guard reads the header, updates
the bullet alone, and leaves `gates.md` describing a guard that no longer matches the gate — in
the reference the repo tells readers to load before trusting a green run.
*Fixed:* both custody claims dropped, both gap statements kept. The header's own next line
("A NEW branch belongs on this list with its guard named…") already carries the register role.

**F2 (medium) — `.claude/references/gates.md:49`: case 17's prior guard called "two regexes".**
It is two `includes()` calls — `tooling/build-checks.mjs:6532`,
`empty.includes("none") && empty.includes("pass parent_id null")`. Only case 16's prior guard is
regexes. The same sentence's "mutating a phrase neither regex names" inherited the error. Note the
pre-existing header line said "Two regexes (case 17)" too and this PR had already corrected *that*
copy — so the wrong claim survived only in the copy the PR wrote fresh.
*Fixed:* each prior guard named for what it is, in both clauses.

**F3 (medium) — `.claude/plans/provenance-rule-pin-384.md:44`: "~142 paid turns" drops a hedge the
tree carries.** `tooling/build-checks.mjs:7415` says "142 paid turns, $7.561 — a FLOOR", and
`gates.md` says "at least 142 … a floor", because `bracket-trace-1`, `bracket-trace-2` and
`partner-audit-1` carry stamps no group compares and would stale silently. "~142" reads as an
estimate that could be lower; the tree's number cannot be. A later ticket weighing the
`provenance: 'real'` fold would budget from the wrong figure.
*Fixed:* "at least 142", with the reason named.

**F4 (low) — "the group count is pinned in four files".** It is four claim rows across **three**
files: `tooling/build-checks.mjs`, `CLAUDE.md` twice (the architecture map and the on-demand
context section), and `.claude/references/gates.md` — `tooling/drift-check.mjs:174-180` reads all
four. Low because drift-check names the stale row either way.
*Fixed:* in the plan and the report.

**F5 (low, adjudicated) — `tooling/build-checks.mjs:6480`: case 16's own new comment states the
gate is green on the mutation the assertion below reddens.** "a mutation of this string leaves all
four stamps unmoved and the gate green" was true before this PR and false after it. Two verifiers
split on whether a comment that does not substitute for a check counts as a tracked defect; I took
it as real, because a false present-tense claim in gate prose is cheap to fix and is what a reader
looking for the guard reads first.
*Fixed:* scoped to the past tense — "moves no stamp — and before this pin it left the gate green".

## Raised and refuted

- *Case 16's comment defect is not of the tracked class* — refuted as a dismissal; the underlying
  fact was true, and it is kept as F5 at low severity.
- *`ledgerBrief`'s null-parent-candidate arm is an unlisted fifth unhashed branch* — the arm is
  genuinely rendered by no fixed input set, but the finding's guard claims were false against the
  tree, so the severity did not survive. Worth a look in whatever ticket widens the evidence line.
- *Closing #384 leaves the evidence line with no tracked ticket* — #384's body never covered the
  evidence line; only the merged header claimed it did, and this PR corrects that claim.

## Not reachable from here

Whether a model USES either pinned string. Both remain unobserved prompt strings, the same
standing the re-ask brief has. The `name` and `ref` arms of the evidence line's fallback are still
uncovered, and the widening is still open.

## Gates after the fixes (observed)

```
build ✓  all 34 groups pass
token-lint      ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid
drift-check     ✓  syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count
```
