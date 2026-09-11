# #384 execution report — the two verbatim pins

Branch `feature/provenance-rule-pin-384`, off `main` at `739abbb`. Zero paid turns.

## What landed

**`tooling/build-checks.mjs` case 16** — `PROVENANCE_RULE.real` pinned VERBATIM, beside the two
regexes and before the two `includes()` assertions, which are kept because they prove ROUTING
(which build carries which rule) and the literal does not. The failure message names the branch's
position outside every fingerprint and says an intended re-tune updates the literal and nothing
else.

**`tooling/build-checks.mjs` case 17** — `ledgerBrief([])`'s produced string pinned VERBATIM,
beside the existing two-phrase assertion.

Both literals were emitted from the module by script and spliced by exact-anchor replacement, so
neither was retyped. Each assertion is one line: 1020 and 582 characters respectively (observed
by `awk length`).

**Prose, four copies** (five edit sites — case 16's and case 17's comments are separate blocks):

| Copy | What changed |
|---|---|
| `portal/lib/discovery-postures.mjs:74-100` | Both bullets now name their VERBATIM pin instead of "two REGEXES … not verbatim". The evidence-line bullet no longer claims #384 covers it. The PR #381 F2 paragraph now says the hole it describes was closed here. |
| `tooling/build-checks.mjs:6478-6483` | Case 16's new comment states why the branch is unhashed and why the neighbouring assertions cannot see an edit. |
| `tooling/build-checks.mjs:6533-6536` | Case 17's, same shape. |
| `tooling/build-checks.mjs` group-30 descriptor | Clauses 18 and 27 each gained the pin. |
| `.claude/references/gates.md:49` | A `#384 added:` sentence carrying both pins, how each was proven, and a *Cannot reach* naming the fourth branch. |

## What did NOT change

No prompt string. No fingerprint input set. No `group()` added — the group count is pinned in
four claim rows across three files (`build-checks.mjs`, `CLAUDE.md` twice, `gates.md`), all four
read by `drift-check`'s group-count leg. The `includes()` assertions were kept, not replaced. No posture stamp moved, so no
committed recording was staled: the parenting group still reads `think 7efdde37`, `think-opus`
and `grill` current-to-literal on a green run.

## Verification

**Pre-change baseline** (observed): `node tooling/build-checks.mjs` → `build ✓ all 34 groups pass`.

**Input sets driven** (observed) — all five fixed sets pin `provenance: "fictional"` and carry a
three-record ledger, which is what puts both branches outside every hash:

```
FINGERPRINT_INPUTS provenance= "fictional" ledger has file_evidence: false ledger len: 3
AUDIT_FINGERPRINT_INPUTS provenance= "fictional" ledger has file_evidence: false ledger len: 3
PARK_FINGERPRINT_INPUTS provenance= "fictional" ledger has file_evidence: false ledger len: 3
AFFORDANCE_FINGERPRINT_INPUTS provenance= "fictional" ledger has file_evidence: false ledger len: 3
LOOKUP_FINGERPRINT_INPUTS provenance= "fictional" ledger has file_evidence: false ledger len: 3
```

**Mutation 1 — `PROVENANCE_RULE.real`.** "something the person believes but has not checked is"
→ "a HUNCH the person has not checked is", a phrase neither regex names:

```
build discovery      ✗  1 failure(s)
    · case 16: PROVENANCE_RULE.real's WORDING moved — got "…a HUNCH the person has not checked is \"assumption\"…"
build ✗  1 failure(s)
```

Exactly ONE failure, and it is the new pin. The two regexes and both `includes()` assertions
stayed green — the discriminating read, because it confirms the self-referential premise the
ticket rests on. No case-30 or case-31 fingerprint assertion fired, which confirms the branch is
outside every stamp. Reverted; green.

**Mutation 2 — `ledgerBrief`'s empty-ledger form.** "A stakeholder, solution or transition
decision filed now has no parent candidate" → "A decision filed at any rung below business has
nothing above it yet", invisible to `includes("none")` and `includes("pass parent_id null")`:

```
build discovery      ✗  1 failure(s)
    · case 17: ledgerBrief's EMPTY-LEDGER WORDING moved — got "Decisions in this run so far: none. A decision filed at any rung below business has nothing above it yet — pass parent_id null."
build ✗  1 failure(s)
```

Same shape: one failure, named by case 17, the neighbouring assertion green. Reverted; green.

**Gates, on a STAGED tree** (observed):

```
build ✓  all 34 groups pass
token-lint      ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid
drift-check     ✓  syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count
```

`drift-check` names `loc-summary` and passes, so this PR needs no `loc-summary.json` regen and no
visual-regression baseline regen. Neither was touched.

## Deviations from the plan

None on the two pins. One scope decision carried from the plan: `ledgerBrief`'s rendered EVIDENCE
LINE (#289), the fourth unhashed branch, is NOT pinned here. The ticket body names two branches;
the merged header claimed #384 covered the third. That bullet is rewritten to say what #384
actually did and that widening the evidence line is still open, so the header ends this PR true.
Raised with the owner as an open question before work started.

## What this PR cannot reach

Whether a model USES either string. Both are unobserved prompt strings in the same sense the
re-ask brief is — a pin guards the text, not the behaviour. The `name` and `ref` arms of the
evidence line's url / name / ref fallback remain uncovered; `discovery-postures.mjs`'s header
branch list and `gates.md`'s group-30 *Cannot reach* clause both say so.

## Review fixes applied (PR #398 review, F1-F4)

An adversarial review over the diff raised 11 findings; 8 survived verification, deduping to four
distinct defects, all of them prose. Each was verified against the tree before the fix:

- **F1** `discovery-postures.mjs` and `gates.md` each gained a sentence nominating the header
  bullet as the *only* place recording that the #289 evidence line is still unpinned — and
  `gates.md`'s own sentence states the gap while claiming another file is the only one that does.
  Self-refuting within one sentence, and the same three-copies drift class PR #394 was spent
  correcting. Both custody claims dropped; both gap statements kept.
- **F2** `gates.md`'s new sentence called case 17's prior guard "two regexes". It is two
  `includes()` calls (`tooling/build-checks.mjs:6532`); only case 16's is regexes. Corrected, and
  the "a phrase neither regex names" clause with it.
- **F3** "~142 paid turns" dropped the hedge the tree carries nine lines from the constant this PR
  pins: `build-checks.mjs` says "142 paid turns, $7.561 — a FLOOR", because `bracket-trace-1`,
  `bracket-trace-2` and `partner-audit-1` carry gate-uncompared stamps that would stale silently.
  The plan now says "at least", and says why.
- **F4** "the group count is pinned in four files" is four claim rows across **three** files —
  `build-checks.mjs`, `CLAUDE.md` twice, and `gates.md` (`tooling/drift-check.mjs:174-180`).
  Corrected in the plan and above.
- **F5** (adjudicated: two verifiers split) case 16's new comment said a mutation of the string
  "leaves all four stamps unmoved and the gate green" — true before this PR, false after it,
  because the assertion six lines below is what reddens. Scoped to the past tense.

Three further findings were raised and refuted on verification: that case 16's comment defect was
a tracked-class defect (it is, at low severity — kept as F5), that `ledgerBrief`'s
null-parent-candidate arm is an unlisted fifth unhashed branch (its guard claim was false against
the tree), and that closing #384 leaves the evidence line untracked (#384's body never covered it).

Gate after the fixes (observed): `build ✓ all 34 groups pass`.
