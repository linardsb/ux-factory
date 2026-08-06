# Review — PR #242 "the docs chain" (ticket #211)

Branch: `feat/211-docs-chain`. Reviewed `git diff origin/main...HEAD` in full; scrutinized
`git diff b28898b..HEAD` (the #211 changes proper) line by line against
`.claude/plans/docs-chain-example-field-demo-notice-211.md` and
`.claude/reports/docs-chain-example-field-demo-notice-211-report.md`. Ran
`node tooling/build-checks.mjs` (18/18 green), `node tooling/drift-check.mjs` (clean),
`node tooling/token-lint.mjs` (clean), `node agent-layer/gen-annotated-source.mjs --check` (no drift)
against the current tree. No mutation left unrestored; all proofs were read-only greps/diffs.

## ✅ Strengths

- **The chain genuinely closes the hole it claims to.** `demo-notice` now has a `components.css`
  block, an `agentic-renderer.mjs` template, and group 3 is widened from "every name `compose()`
  emits" to "every vocabulary entry" — verified the old exception paragraph is gone and the new
  loop iterates `Object.keys(VOCAB.components)`.
- **`example` is correctly kept out of `vocabulary.json`.** Confirmed in the diff: `vocabulary.json`
  only picks up `demo-notice.status` and `stat-tile.value`'s `min/max/step` (which do belong there —
  they're constraints, not worked examples). No `example` key anywhere in the vocabulary diff. This
  protects the "no example ever fed to a recorder" honesty invariant correctly.
- **`prepareHandoff`'s backward compatibility is real, not asserted-and-hoped.** `handoff.html:196`
  still calls `prepareHandoff(pack, vocab)` two-arg, unedited; `graph = null` default plus optional
  chaining (`graph?.tokens`, `graph?.consumers`) makes every joined field degrade to `null` instead of
  throwing. Verified by reading the file and by group 18B's own two-arg + junk-graph cases.
- **`demo-notice`'s example is a genuine verbatim quotation.** `grep -h fictionalNotice
  scenarios/verdant/copy.json` returns a byte-for-byte match to the spec's `example.text`. The prop's
  own description ("rendered verbatim — never paraphrased") would have made an invented string a
  self-contradiction; the author checked this.
- **The anti-lockstep design in group 18B's `consumer` check is real and independently sound.**
  Anchoring the expected set on `pack.json` rather than the freshly-regenerated `system-graph.json`
  is the correct call — a graph-derived expected set moves with the thing under test and the check
  could never go red. The report's mutation proof 4 (remove the CSS block, regen the graph, still
  red) is exactly the right test for this and is documented as actually run.
- **Group 18A's four-branch mutation and 18C's four parser-refusal cases are real tripwires**, each
  asserted to both throw and name its own spec path — not just "did it throw." Ran `build-checks`
  myself; all pass, and reading the assertions confirms message-content checks, not just truthiness.
- **`agentic-renderer.mjs` is genuinely Node-safe at module scope.** Verified: every `document.*`
  reference in the file sits inside a function body (`el`, `icon`, `svg`, `path`, `resolveChip`'s
  `document.baseURI`); the `TEMPLATES` object at module scope holds only arrow functions, never
  invoked at import time. The `gen-vocabulary.mjs` → `system/agentic-renderer.mjs` import is safe.
- **`line-height: 1.5` in the new `.vd-demo-notice` block is not a discipline break.** Grepped the
  whole file: `components.css` has no `--line-height-*` token anywhere, and every other block uses a
  literal line-height (1.5, 1.6, 1.04, etc.) by established convention. The new block matches it.
- **The regeneration cascade is internally consistent.** `system-graph.json` 32→33 consumers,
  edges 388→393 (+5, matching the five tokens the new block declares); `loc-summary.json` runtime
  25,600→25,800 and total 33,500→33,800 (generators group also crossed a rounding boundary, which is
  consistent with `lib.mjs`/`gen-vocabulary.mjs`'s own +53 lines — not a discrepancy). `pack.json`,
  `pack.bundle.json`, `vocabulary.json` are mutually consistent on inspection. Task 13's grep for
  `#hex`/`oklch(`/`rgb(` in the staged artifact diff is empty when re-run today — no resolved token
  value leaked into any generated file.
- **`gen-handoff.mjs` genuinely needed no edit.** Confirmed via `git diff` — the file has zero
  changes in this PR, and `example`/`min`/`max`/`step` reach `pack.json` purely because of the
  existing `...s.head` spread.

## ⚠️ Issues Found

None at High or Critical severity. Two Low/informational points, both already effectively covered by
existing behavior and neither a functional bug:

- **Category**: Code Quality / Minor. **Severity**: Low.
  **`system/handoff-viewer.mjs:66`** — `graphConsumers = new Map(graph.consumers.map((k) => [k.spec, k]))`.
  23 of the graph's 33 consumers (the structural, non-component blocks — `type`, `layout`, `buttons`,
  `header`, `footer`, …) carry `spec: ""`, so they collide on the same Map key and all but the last
  are silently discarded when the Map is built. **This is not a real bug**: the only lookup is
  `graphConsumers.get(`system/specs/${c.component}.md`)`, a real component name, never `""`, so the
  collision is unreachable in practice — verified there's exactly one call site. Still, it's a small
  correctness smell (a `Map` silently dropping 22 of 23 entries under one key) that a future caller
  iterating `graphConsumers.values()` could trip over. No fix required now; if it bothers a future
  reader, filter `graph.consumers.filter(k => k.spec)` before building the map — costs nothing, since
  spec-less consumers are never joined against anyway.

- **Category**: Testing / Design note. **Severity**: Low (informational, not a finding).
  **`tooling/build-checks.mjs`, group 18A's `realSpecs`** is built from `PACK.components` (the
  generated pack) rather than from freshly-`parseComponentSpec`'d files. This does make the "happy
  path" test the pack's copy of the examples rather than the specs' — but it is **not vacuous**:
  `drift-check.mjs`'s `checkHandoff()` regenerates `pack.json` via `genHandoff()` and diffs it against
  the committed file on every CI run, so `pack.json` is provably byte-identical to what the specs
  produce. Anchoring on the pack here is consistent with the same house pattern group 16 and 18B's
  `consumer` check both use ("derive from a committed, drift-checked artifact"). Flagging only because
  the review brief asked for scrutiny here — no change needed.

## 🔍 Questions/Clarifications

- None requiring the author's input — the plan and report already pre-empt the questions this diff
  would normally raise (the `head` explicit-pick trap, the anti-lockstep anchoring choice, why
  `example` doesn't ride into `vocabulary.json`). All are documented and verified true against the
  code, not just asserted in prose.

## ✨ Recommendations

- Nothing blocking. If a future ticket (#215/#218) starts iterating `graph.consumers` directly rather
  than through `prepareHandoff`'s per-component `consumer` field, revisit the empty-`spec`-key
  collision above — cheap to preempt now with a one-line filter, harder to debug later if a wrong
  consumer silently wins the collision in a new code path.

## 📋 Review Summary — the #211 changes proper (`b28898b..HEAD`)

**Ready to commit / merge.** 0 Critical, 0 High, 0 Medium, 2 Low (both informational, no fix required
to ship). Every claim in the plan and report that I could verify independently (byte-for-byte quote
match, drift-check/build-checks/token-lint green, no resolved token values in artifacts, backward
compatibility of the two-arg `prepareHandoff` call, Node-safety of the new
`agent-layer/gen-vocabulary.mjs` → `system/agentic-renderer.mjs` import) checked out. No undocumented
divergence from the plan found — the report's six documented deviations are the only ones, and each is
a reasonable, stated resolution of a stale plan detail rather than a silent drift.

---

## Separately: the two folded-in `fix(210)` commits (`6061550`, `b28898b`)

Out of scope for #211 proper — flagged separately as instructed. Both are post-merge fixes for
`.claude/code-reviews/pr-241-review.md`'s six findings (H1, M2, M3, L4, L5, L6) on `#210`'s single-file
export/keep-rail work, already carrying their own review trail and their own gate evidence
(`build-checks` 17/17, `studio-journey` 253/253 on three engines, quoted in the commit messages).
Skimmed both diffs (`system/studio-export.mjs`, `system/studio-keep.mjs`,
`tooling/build-checks.mjs`, `tooling/studio-journey.mjs`) — nothing jumped out as a new problem, and
each fix names a concrete prior defect with a stated mutation proof (e.g. commit `6061550`'s roster
now `Object.keys`-derived from `analytics.mjs` rather than hand-typed, closing the "a twelfth tracker
could fall outside the check" gap; commit `b28898b`'s single-writer fix for the share-link label so
the claim and the link can't be written apart). No independent re-review of #210's substance was done
beyond this skim — it already went through its own PR #241 review cycle.

---

**Do not start fixing anything above without the user's explicit approval** — this review found no
blocking issues, but any of the Low-severity notes above should only be acted on if the user decides
they're worth it.
