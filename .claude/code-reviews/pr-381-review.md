# PR #381 review — the re-ask brief reaches Think (#366)

**Head** `65c60bb` · **Base** `main` @ `700c052` · **State** OPEN · 5 files, +871 / −19
Reviewed in an isolated detached worktree (`wt-pr381`), not the shared working dir. Every mutation below
was driven against the real `tooling/build-checks.mjs` and reverted; the worktree was left clean.

**Recommendation: approve.** Three Medium findings, no Critical and no High. The shipped behaviour is
correct, all four gates are green, and every load-bearing figure in the PR body and the report re-derived
exactly. All three findings are corrections to *claims* — two of them to statements this PR newly writes
into the surfaces the project treats as specification (`discovery-postures.mjs`'s header, the group
description, `gates.md`). None affects what runs.

## Validation

| Check | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass` — observed on `65c60bb` |
| `node tooling/drift-check.mjs` | `drift-check ✓` — observed, after symlinking `tooling/style-dictionary/node_modules`. A fresh worktree lacks it; the report states this and it is an environment fact, not drift |
| `node tooling/token-lint.mjs` | `token-lint ✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` — observed |
| Portal smoke, `PORT=4793` | `/api/health` → `{"ok":true,…,"bootSha":"65c60bb…","stale":false}`; `/api/discovery/config` answers with the bank; killed by PID; `port 4793 clear` — observed |
| Visual regression | correctly not run — no shipped page changes, and the portal is not in the VR page set |

## The numbers pass — every figure re-derived

| Figure | Verdict |
|---|---|
| The five stamps `7efdde37 · cadb3811 · edc7c52d · 76b7847d · ba124c3c` unmoved | **observed, all five.** Computed from `POSTURES` on both `origin/main` and `65c60bb`: think `7efdde37441fbd2591ba4a7dfeecdb6b`, think-opus `cadb38117a2660c036d87e32323a8745`, create-prd `edc7c52db9d58d59213e93e65cd8d28c`, grill `76b7847d4ebbd9d8f16f9726ff0f4f0f`, and `resolvePosture({posture:'grill',model:'claude-opus-5'})` → `ba124c3c1edb19905101aceca7c12e22`. Identical both sides. The fifth is a real reachable stamp (`MODEL_SETTABLE = ['grill']`), not a phantom |
| `7efdde37` / `cadb3811` are what the recordings carry | **observed.** `bracket-trace-1`, `bracket-trace-2`, `graded-think-a`, `instrument-loans-1` → `7efdde37`; `graded-opus-a` → `cadb3811` |
| 142 paid turns | **derived, correct.** 12 + 65 + 65, from each `run.json`'s `turnStats` length |
| $7.561 | **derived, correct.** Summing `costUsd` over `turnStats`: 0.4240 + 3.2427 + 3.8938 = 7.5605. The report shows its own per-package arithmetic and it matches |
| "the obvious form (`\n\n${reask}`) moves Think's stamp" | **observed.** Applied on the head: think → `bc5b2de9e08713e583e1685e18e04705` |
| "the mutation proving it is green on `origin/main` today" | **observed — and this is the PR's most important claim.** `This is the second ask` → `This is the SECOND ask` on `origin/main`: `build ✓  all 34 groups pass`. The same mutation on `65c60bb`: `build ✗  1 failure(s)`, the wording pin by name. The hole was real and the pin closes it |
| M2 — "2 failures, both naming `think`" | **reproduced exactly.** Emptying the interpolation at `:306` while keeping the newline: 2 failures, both `think`, stamp unmoved at `7efdde37`. (Deleting the whole line gives 6 — it also moves the stamp; the report's scoping is the correct isolation and it says so) |
| "no committed recording has ever taken a second ask on any posture" | **observed.** Across all seven committed packages every `question_id` has exactly one closing op. `spine-meridian-1`'s single flag (`s4-rabbit-holes`, t2) was never re-asked — the session closed at t3 on another question. `graded-think-a` (11 flags) and `graded-opus-a` (14) are `whole-bank`, which never holds |
| "seven live prose sites corrected" | **verified.** `grep` for `stays blind`, `#366 stays open`, `for the two new postures only` returns nothing in live source. The two surviving `the two #286 postures` hits (`:312`, `:329`) mean the postures #286 *added*, which is still true |
| "the interpolation form copied verbatim" | **observed.** All three interview templates are identical in shape — `${ledgerBrief(ledger)}\n${reask ? `\n${reask}\n` : ''}\n<closing>` (`:305–306`, `:429–430`, `:471–472`). Empty branch collapses to the `\n\n` that was there; non-empty gives one blank line either side |
| "the audit carries none, **pinned separately by case 32**" (`build-checks.mjs:7136`, `gates.md:49`) | **FALSE — F1.** Case 32's assertion cannot fail |
| "a template BRANCH the fixed inputs never take … today that is **the re-ask brief alone**, on all four postures" (`:77`) | **FALSE — F2.** `PROVENANCE_RULE.real` is a second one, and it is not verbatim-pinned either |

## Findings

### F1 (Medium) — `tooling/build-checks.mjs:7224` · case 32's audit re-ask assertion cannot fail, and this PR newly cites it as the guard

Two of the PR's new sentences point at case 32:

- `tooling/build-checks.mjs:7136` (new) — "the audit carries none, pinned separately by case 32."
- `.claude/references/gates.md:49` (new) — "the audit still carries none (case 32)."

The assertion they name is `ok(!/second ask/i.test(a.prompt), …)` where `a = buildGrillTurn(AUDIT_FINGERPRINT_INPUTS)`.
`AUDIT_FINGERPRINT_INPUTS` spreads `FINGERPRINT_INPUTS`, whose ledger holds three `record_decision` rows
and no `flag_weak_answer` — so `reaskBrief` would return `''` for that build whether or not the audit
template calls it. The assertion is green on the code that has the brief and green on the code that does
not.

**Driven (M7, observed).** I gave `buildGrillTurn`'s audit branch (`portal/lib/discovery-postures.mjs:501–517`)
the same `const reask = reaskBrief(ledger, question.id)` + interpolation the three interview templates
carry, mirroring them exactly:

```
grill stamp: 76b7847d4ebbd9d8f16f9726ff0f4f0f      (unmoved — the empty branch collapses, same as Think's)
audit-over-flagged carries brief: true             (it really does interpolate now)
build ✓  all 34 groups pass
```

So the audit could acquire the brief and neither case 32, nor Grill's stamp, nor any other group would
say so. This is the project's own named anti-pattern — a check that skipped the thing it tested — and it
is now cited as a guard in the two surfaces most read as truth.

**Fix** — one positive control beside `:7224`, costing zero paid turns (it touches neither
`FINGERPRINT_INPUTS.ledger` nor `FINGERPRINT_INPUTS_FOR`, so no stamp moves):

```js
const auditFlagged = [...AUDIT_FINGERPRINT_INPUTS.ledger,
  { seq: 4, op: "flag_weak_answer", params: { question_id: AUDIT_FINGERPRINT_INPUTS.question.id, answer_ref: "a4", missing: ["a number"] } }];
ok(!/second ask/i.test(buildGrillTurn({ ...AUDIT_FINGERPRINT_INPUTS, ledger: auditFlagged }).prompt),
  "case 32: an audit build over a ledger holding a flag for the CURRENT question must still carry no re-ask brief (#366)");
```

**No behavioural consequence today.** The shipped audit branch has no `reaskBrief` call, and even under
the mutation it would stay inert in a real run: `RE_ASKS['existing-prd'] === false`
(`portal/lib/discovery.mjs:567`) means `deriveCursor` never holds a question for a second ask in audit
mode, so a question's own flag cannot be in the ledger when that question's turn is built. The defect is
the citation, not the audit.

### F2 (Medium) — `portal/lib/discovery-postures.mjs:76-78` · the new absolute claim is false, and a green mutation proves it

The PR adds to the header — which CLAUDE.md designates as this file's specification:

> A template BRANCH the fixed inputs never take sits outside the hash by construction — **today that is
> the re-ask brief alone, on all four postures**

`PROVENANCE_RULE.real` is a second such branch. `systemFor` (`:249`) and `sharedTail` (`:357`) select
`PROVENANCE_RULE[provenance]`; `FINGERPRINT_INPUTS.provenance === 'fictional'` (`:554`) and
`AUDIT_FINGERPRINT_INPUTS` spreads it (`:565`), so no posture's shipped stamp ever hashes
`PROVENANCE_RULE.real`'s text. It is a *broader* instance than the re-ask brief, because `sharedTail`
also runs in the audit template (`:501`), which the re-ask branch never reaches.

**It is also not verbatim-pinned.** `case 16:6275/6278` and `case 31:7160` assert
`systemPrompt.includes(PROVENANCE_RULE.real)` — self-referential, so they compare the built prompt
against the *edited* constant and can never see an edit to it. The only real content guards are two
regexes at `:6274` (`/real-interview/` and `/"fictional-scenario" is never true/`), covering two phrases.

**Driven (M5, observed).** Editing an unpinned phrase inside `PROVENANCE_RULE.real` —
*"something the person believes but has not checked is"* → *"a HUNCH the person has not checked is"*,
which neither regex names:

```
stamp think 7efdde37…  think-opus cadb3811…  create-prd edc7c52d…  grill 76b7847d…   (all unmoved)
build ✓  all 34 groups pass
```

That is the identical failure shape #366 was written to close, now denied by name in the file's own
header. Two statements in the same header also disagree: `:64` says of the provenance rule "the hash
covers the rule's text", true of the fictional rule only.

**Cost.** No committed artefact is at risk — real runs write to `<JOBS_DIR>/_discovery/` and are never
committed, so an edit here stales no recording. The cost is that the next editor reads the header,
believes the re-ask brief is the only place the hash is blind, and edits `PROVENANCE_RULE.real` under a
guarantee that does not hold.

**Fix** — either:
1. In scope for this PR: name both branches instead of "alone", and correct `:64` to say the hash covers
   the *fictional* rule's text. One sentence each.
2. Its own ticket, and it uses this PR's own instrument: add a verbatim pin on `PROVENANCE_RULE.real`
   beside case 16's regexes, after which the claim becomes "two branches, both pinned verbatim" and M5
   goes red.

What should not ship is the sentence as written.

### F3 (Medium) — `.claude/reports/discovery-re-ask-brief-366-report.md:163` · two fresh packages classed as stale, and the bill is a floor

The "Notes worth carrying" bullet reads: *"`allergen-matrix-1` carries `df6fbc35`, already stale against
the current `7efdde37`, with a green gate; `bracket-trace-1` and `-2` are in the same position."*

They are not in the same position. Observed:

- `allergen-matrix-1` → `df6fbc35a5d91537dc417288b67c123e` — **stale**, and ungated.
- `bracket-trace-1`, `bracket-trace-2` → `7efdde37441fbd2591ba4a7dfeecdb6b`, the current live `think` stamp — **fresh**, and ungated.

Ungated and stale are two properties and the note collapses them. The half that is right — "a green run
is not proof every recording matches the tree" — is worth keeping; the half that is wrong raises a false
alarm about two packages that match the tree exactly today.

**Why this is Medium and not Low.** The $7.561 / 142-turn figure is correct for its stated referent (the
three *gate-compared* packages, and "stale" for those three means gate-declared) — I am not calling the
number wrong. But folding the branch into the hash would move `bracket-trace-1` and `-2` from fresh to
stale with no group saying so, so $7.561 is a **floor**: 166 turns and $8.639 if both were re-recorded
(derived: +12t $0.5134, +12t $0.5649). Whether they *need* re-recording is a judgement the transcripts
cannot settle — they exist to prove #349's hook gating, not prompt bytes — and that is the owner's call,
but it should be a stated call rather than an omission. The Q1 decision this figure feeds is the owner's.

**Fix** — two sentences, no code: correct the classification, and add to the Q1 bullet (and to
`build-checks.mjs:7205`'s message if you want the gate to carry it) that the 142 are the gate-declared
turns and `bracket-trace-1`/`-2` carry the same stamp, so the bill is a floor.

## What is done well

- **The hole this PR closes was found, not inherited from the ticket.** The brief's wording sat outside
  every posture fingerprint on the two postures that already carried it, because `FINGERPRINT_INPUTS`'
  ledger holds no `flag_weak_answer` — so an edit to its text was invisible to the whole gate stack. The
  M1 control proves it: green on `main`, red here. That is the repo's "check that cannot fail" pattern
  caught and closed.
- **The widened loop is not vacuous for `think` — driven, both halves.** Emptying the interpolation (M2)
  reddens the two positive assertions naming `think`; making `reaskBrief` ignore `question_id` (M6)
  reddens the negative one — `· case 31: a flag on a DIFFERENT question must leave the think turn prompt
  byte-identical to a first ask`, alongside `create-prd` and `grill` (3 failures, observed). A widened
  loop that only *looks* like coverage was the obvious risk here and is not what shipped.
- **The stale ticket was stated, not quietly worked around.** `reaskBrief` already existed; the PR says
  so in its second paragraph and the plan opens with "do not reimplement it".
- **The interpolation form is treated as load-bearing.** Three forms were measured against Think's stamp
  before one was chosen, and the chosen one is Create PRD's verbatim rather than a fourth spelling. The
  obvious form does move the stamp — reproduced.
- **Both new pins are load-bearing, and one cross-validates.** Adding a flag to `FINGERPRINT_INPUTS.ledger`
  reddens the no-flag pin *and* moves Think's computed stamp off its pinned literal at `:7126` — exactly
  what the pin's own message predicts.
- **Exactly one assertion was deleted from case 31** — the old "Think must NOT carry the re-ask brief"
  negative control, precisely the one whose premise this ticket inverts. No collateral removal.
- **The unobserved-prompt limit is stated where a green run is read** — the group description's "cannot
  reach" tail and `gates.md` — not only in the PR body. `--probe-reask` is consistently framed as not yet
  built, in real contrast to `--probe-fence` / `--probe-audit`, which exist as flags
  (`portal/lib/discovery-transport.mjs:667-668`).
- **Zero new dependencies, zero new error paths.** `ledger` is already `Array.isArray`-validated at `:285`
  before the new `:293` call reaches it. CLAUDE.md compliance is clean.
- **Deviations documented as re-derivations, not silent drift** — the plan's line numbers were taken at
  `31a46e8` and every anchor string was re-checked against `700c052` before editing.

## Notes for the next round

- `reaskBrief`'s unguarded edges are all unreachable, so they need no case: `missing: []` renders an empty
  list, a non-array `missing` is coerced by `String(x ?? '')`, an absent `seq` renders `(seq undefined)`.
  `discovery/ops.mjs:291` refuses any `missing` that is not a non-empty array of non-empty strings, and
  `ops.mjs:336` always assigns `seq`, so no applier-produced ledger reaches any of them. Pre-existing
  (#286).
- `ops.find` vs `ops.findLast` is behaviourally inert today: `flag_weak_answer` never carries `supersedes`
  (only `record_decision` does — `ops.mjs:248`, `277–280`) and `deriveCursor`'s `asks < 2` caps a question
  at one re-ask (`discovery.mjs:613`), so at most one prior flag per `question_id` can exist when
  `reaskBrief` runs. Case 31's two-flag fixture exercises a ledger shape the real system cannot produce —
  which is fine as a pin, and worth knowing is not a live distinction.
- Guarantees pass skipped: no prior `pr-381-review*.md`, so this is round 1 and the base has not moved
  under an earlier review.
- A fresh worktree needs `tooling/style-dictionary/node_modules` (and `portal/node_modules` for the smoke)
  installed or symlinked, or `drift-check` fails on a Style Dictionary import and reads as drift.
