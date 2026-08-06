# PR #242 review — the docs chain (`example` spec-head field · demo-notice's render path · the view-time join)

**Branch**: `feat/211-docs-chain` → `main` · **Closes #211** · 31 files, +2007/−70
**Merge state at review time**: `CLEAN` — this review validates the merge-ready tree.
**Verdict: APPROVE.** 0 Critical · 0 High · 0 Medium · 4 Low (none blocking; Low 1 is worth carrying to #215).

---

## Summary

Three changes sized to exactly what the ticket needs, and the deliverable really is the *constraint*:
`build-checks` group 3 stops **documenting** `demo-notice`'s missing render path as an intentional
exception and starts asserting that **every generated vocabulary entry has a template**. `demo-notice`
is the proof that the widened line is satisfiable; #220's ten components inherit it as a hard gate.

The PR does what it says. Every claim I could verify independently held.

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ **all 18 groups pass** |
| `node tooling/drift-check.mjs` | ✓ all 12 steps · no drift · clean tree afterwards |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node scenarios/validate.mjs` | ✓ 3 scenarios · verdicts differ |
| CI `verify` | ✓ pass |
| CI `visual` | ✓ pass (20/20 against committed Linux baselines) |

Local macOS `playwright test` failing all 20 is the known Linux-baseline platform artefact, not a
regression — the container/CI run is authoritative, and it is green.

## Claims verified independently (not taken from the report's prose)

- **`demo-notice`'s example is byte-verbatim** from `scenarios/verdant/copy.json:2`'s `fictionalNotice`.
  Its own prop description forbids paraphrase, so an invented string would have documented the exact
  thing the prop refuses.
- **`example` is genuinely absent from `vocabulary.json`.** The whole artifact diff is `demo-notice`'s
  `status: spec → shipped` plus `stat-tile.value`'s three bounds. The stated reason holds: that file is
  a prompt input both recorders are fenced against being fed examples, and bounds are a constraint
  rather than a copy.
- **`handoff.html:196`'s two-arg `prepareHandoff` call is untouched**, and group 18B drives that
  compatibility claim directly (graph fields null, `example` still present because it rides the pack).
- **`.vd-demo-notice` paints on no page in the VR set** — the only reference outside the specs and
  generated artifacts is the new template itself. So "baseline churn is approach's two PNGs and nothing
  else" is a verified fact, not an assumption.
- **The join keys are real**: the pack's `portability.webComponents.files` holds exactly the 3 of 10
  wrappers the code joins on `class`, and the graph's `consumers[].spec` values match the
  `system/specs/<name>.md` form the lookup uses.
- **`agentic-renderer.mjs` is Node-safe at module scope** — every `document.*` reference sits inside a
  function body — so importing it into a build-time generator is sound, and the code says why.
- **The artifact cascade is complete and self-consistent**: `system-graph.json` 32→33 consumers
  (edges 388→393), `pack.json` + `pack.bundle.json`, `vocabulary.json`, `loc-summary.json`, approach's
  two baselines. `drift-check` regenerating all twelve steps on a clean tree is the proof.
- **No new tracked file and no resolved token value** anywhere in the artifact diff. Both central
  claims hold.

## What's genuinely well done

- **Deleting the written-down exception is the right instinct.** The most dangerous shape a check can
  have is one that documents its own blind spot in a comment paragraph nobody re-reads. Widening group 3
  to the whole vocabulary while **keeping** the emitted-names loop is correct — the two assert different
  things (one about the builder, one about the vocabulary) and neither subsumes the other.
- **The anti-lockstep anchoring in 18B is the sharpest call in the PR.** Deriving the expected consumer
  set from `system-graph.json`'s own `consumers[].spec` would produce a check that cannot fail: delete
  a CSS block, regenerate, and both sides move together. Anchoring on the pack is what makes it go red —
  and the comment states the generalised rule *and* the escape hatch for a future zero-token block.
- **`validateExamples` is exported rather than inlined, and 18A's four-branch mutation is committed.**
  Inline code can only be tested by editing files and reverting; the export is what makes a permanent
  tripwire possible. Each refusal is asserted both to throw *and* to name its own spec path — a gate
  that throws the right number of times with the wrong messages is a gate nobody can debug.
- **Group 18C exists because a prior review round asked for it**, and it is the honest version: the four
  new `parseComponentSpec` throws were written, plausible and never once observed failing. Driving them
  over real fixture files behind a **positive control** is the part most implementations skip — without
  it a typo'd fixture makes every refusal pass for the wrong reason.
- **18B's "no example" branch was rewritten from a guarded `if` to a synthetic stripped pack.** As first
  written it would have been silently vacuous the moment all ten specs carried an example. Catching that
  before commit is the `check-that-cannot-fail` lesson applied, not quoted.
- **The two validations are split on purpose and the split is recorded**: `parseComponentSpec` checks
  shape only, `validateExamples` decides whether it renders. Refusing to cross-check `example` against
  `head.props` in the parser avoids a second, weaker opinion that would drift from `validateComposition`.
- **`demo-notice`'s prose was rewritten rather than left stale**, and the rewritten `## Accessibility`
  sentence was narrowed after a fact-check (the `wcagPairs` entry governs *derived* packs, not
  hand-authored ones). That prose ships verbatim in `pack.json`, so an overclaim there is an
  honesty-contract failure — narrowing it was the right call, not pedantry.
- **The CSS block is token-only and uses exactly the five tokens the spec head declares.** The
  `line-height: 1.5` literal matches the file's established convention (36 other line-height literals);
  `--type-caption` is used as `font-size:` consistently with the other eight call sites.
- **The `example` head key had to be named in the explicit field *pick*** in `prepareHandoff`, and the
  gate asserts it in **both** directions — present when the pack has one, and *no injected `null` key*
  when it does not. That second half is the one people forget.

## Issues

### Low 1 · nothing gates the bounds against themselves, or the example against the bounds
This PR adds `min`/`max`/`step` **and** adds `example`, and the two never meet. Verified empirically
against tmpdir fixtures in the shape group 18C already builds, and against the real vocabulary:

| Case | Result |
|---|---|
| `step: 0` on a numeric prop | **accepted** by `parseComponentSpec` |
| `step: -1` on a numeric prop | **accepted** |
| `min: 0, max: 100` + `example: { value: 500 }` | **accepted** by `parseComponentSpec` *and* by `validateExamples` |

`agent-layer/lib.mjs` accepts any finite number for `step`, so a zero or negative step parses — a
control that cannot exist, which is exactly the reasoning the same block uses to reject a bound on a
string prop, applied one step short. And `validateComposition` validates type · enum · required, not
numeric range, so `validateExamples` has no view of bounds at all: a spec can declare a range and seed
the playground outside it, and every gate stays green. The playground would boot with its numeric
control out of its own declared range.

**This is not the documented "no second opinion about `head.props`" decision** — that call is about
*props shape*, which `validateExamples` genuinely covers. Bounds are a dimension neither validator
looks at. **Fix**: two lines in `lib.mjs`'s existing loop — require `step > 0`, and range-check a
numeric `example` value against its prop's `min`/`max` — plus two cases in group 18C, which already
has the fixture harness. Non-blocking today (the one committed bound, `stat-tile.value 0–100 step 1`,
is correct and its example is `34`), but **#215 is the consumer that turns this into a visible defect**
and should inherit it as a known gap.

### Low 2 · `graphConsumers` collides 23 spec-less entries onto one Map key
`system/handoff-viewer.mjs:66` — `new Map(graph.consumers.map((k) => [k.spec, k]))`. 23 of the graph's
33 consumers are structural blocks carrying `spec: ""`, so they collapse onto the key `""` and all but
the last are silently discarded at construction.

**Not reachable today**: the sole lookup is `graphConsumers.get(\`system/specs/${c.component}.md\`)`, never
`""`, and there is exactly one call site. Flagged as a smell rather than a defect — a future caller
(#215/#218) iterating `graphConsumers.values()` would find a wrong consumer silently winning the
collision. **Fix if you want it preempted**: `graph.consumers.filter((k) => k.spec)` before the map,
which costs nothing since spec-less consumers are never joined against.

### Low 3 · group 18A's happy path drives the pack, not the parsed specs
`tooling/build-checks.mjs` — `realSpecs` is built from `PACK.components` rather than from freshly
`parseComponentSpec`'d files, and `packExamples` is derived from the same object, so both sides of the
count assertion move together.

**Not vacuous**, and I checked why rather than assuming: `drift-check.mjs`'s `checkHandoff()` regenerates
`pack.json` from the specs and diffs it against the committed file on every CI run, so the pack is
provably what the specs produce. The genuinely spec-side gate is `validateExamples` running *inside*
`genVocabulary` — which `drift-check` also reaches. Anchoring on a committed, drift-checked artifact is
the same house pattern groups 16 and 18B use. No change needed; noted because the review brief asked.

### Low 4 · one number in group 18's ✓ line overstates what the loop asserts
The group summary interpolates `${GRAPH.counts.tokens}` and reads "all **64** contract tokens resolving
for every spec". 64 is the *total* contract-token count; the loop actually asserts, per component, that
`c.tokens.length === spec.tokens.length` (9–14 each) with no `group: null`. The assertion is right — only
the sentence describing it is loose, in a group line that is otherwise fastidiously precise. Cosmetic.

## Deviations from the plan — all documented, none flagged

All six deviations in the report are intentional decisions with stated reasoning, and I re-derived the
two that matter:

1. **The plan contradicts itself on the example count** (Task 4/10A read it from `vocabulary.json`, which
   Task 3's own DO-NOT-IMPLEMENT forbids populating). Resolving toward Task 3 is correct — the alternative
   would have shipped the regression the PR spends a section arguing against.
2. **A second `loc-summary` boundary was crossed** (25,700 → 25,800). Immaterial: approach reads the
   number from the artifact and the baselines regenerate from the final tree. No number is hand-written.

Deviations 2–4 and 6 (four group-count sites, the stale "seven templates" header, 18B's rewrite, the
fact-checked accessibility sentence) are all improvements over the plan's letter.

## The two folded-in `fix(210)` commits

`6061550` and `b28898b` sit between `origin/main` and this branch. The PR body's justification is sound
and verifiable: they moved the runtime line count past its rounding boundary without regenerating
`loc-summary.json`, and this branch's first commit (`0067665`) is that regeneration — so pushing them
alone would leave `main` red on `drift-check` until #211 merged.

**Ticket hygiene checked**: the PR body carries only `Closes #211`, so nothing here closes #210 — but
#210 is already `CLOSED` (by PR #241, 2026-08-06), so no ticket is left dangling. #211 is `OPEN` and
the `Closes #211` trailer is present in the body, which is what actually closes it on merge.

They carry their own PR #241 review trail and were not re-reviewed in depth. Spot-checked: `wornPack()`
reads through the modules that own the records and uses their own ground-truth predicates
(`importedOnPage`/`derivedOnRoot`) rather than reparsing, imported shadows derived matching
`pack-boot.js`'s order, and the `source` discriminator matches both record shapes. The single-writer
`publishLink` for the URL, the field and its aria-label is the right shape for the M2 finding it closes.
Both commits landed with build-checks + studio-journey coverage.

## Recommendation

**Approve and merge.** No blocking issues. The four Low notes are optional here. **Low 1 is the one worth carrying
forward** — it should land as a note on #215, whose playground is the surface that makes an
out-of-range seed or a `step: 0` visible. Low 2 is a one-line preempt, and only if #215/#218 will
iterate `graph.consumers` directly.

---
*Reviewed via `/piv-review-pr` — validation re-run locally against the merge-ready tree, deep pass by the
`code-reviewer` agent in a clean context.*
