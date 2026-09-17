# PR #365 review — `feat/285-session-rules`

Branch `feat/285-session-rules`, HEAD `38adc90`, base `main` @ `a8db292`. Reviewed against `CLAUDE.md`
(vanilla shipped pages, zero-dep Node ESM, no TypeScript, no zod outside the SDK tool-schema adapter,
plain Errors naming the offending path, honesty contract) — not the Python/FastAPI default rubric.
Fresh-eyes review, verified against running code, not against the PR body or the implementation
report.

Scope: `portal/lib/discovery.mjs` (the rules layer: `LADDER`, `ESCALATES`, `DEPTH_PROPOSAL`,
`COMPOSES`, `NOT_A_FORM_MAX`, `declareFacets`, `deriveCursor`, `escalationFor`, `runMetrics`,
`openSession`, `sessionView`, `discoveryConfig`), `discovery/prd-projection.mjs` (`facetsLabel`),
`portal/server.mjs` (session route forwards `facets`), `portal/public/{portal.js,index.html}` (the
drawer), `tooling/build-checks.mjs` (cases 30.9, 30.11, 30.16, 30.27, 30.28, 30.29, 31.12),
`discovery/README.md`, `.claude/references/gates.md`, six `discovery/*/prd.md` fixtures. `bank.mjs`
and `ops.mjs` are unchanged and reviewed only as the contract `discovery.mjs` is bound to.

**Verification performed, not just read:**
- `node tooling/build-checks.mjs` → **all 34 groups pass**, exit 0.
- `node tooling/drift-check.mjs` → clean, no generated-file drift.
- `node --check` on all five touched `.mjs` files — no syntax errors.
- `grep -rn '\bbranch\b'` over `discovery.mjs`, `server.mjs`, `portal.js`, `prd-projection.mjs` —
  empty, confirming the AC2 removal claim independent of build-checks' own source pin.
- `git diff` line-count on each of the six touched `prd.md` fixtures — every one is exactly 4 lines
  (2 header + 1 removed + 1 added), confirming only the **Run** line moved, matching the report's
  narrower "every committed package reads exactly as it did" scope.
- Direct `node -e` execution against the real `deriveCursor`/`escalationFor`/`runMetrics` (not mocks)
  to probe the edge cases below — see Finding 1's repro.

---

## ✅ Strengths

- **`deriveCursor`/`escalationFor`/`runMetrics` are proven by real execution, not source pins.**
  Case 30.9 writes a synthetic `run.json`/`transcript.jsonl` to a temp root and drives `sessionView()`
  through the hold → settle → past-the-end sequence via the real `appendTranscript`/`opLine`, including
  the "record moved past reads as settled" shape `graded-think-a` actually carries (eleven weak flags).
  Cases 30.28/30.29 do the same for the facet-composed read side, D5's escalation, and all four
  counters. This is exactly the kind of behavioral proof the repo's `check-that-cannot-fail` history
  warns is easy to skip.
- **The four new tables are cross-checked against their vocabularies in both directions.** Case 30.27
  asserts `LADDER ∪ {whole-bank} === Object.keys(DEPTHS)` and `DEPTH_PROPOSAL` keys `===` `ENTRY_MODES`
  both ways, so a fifth depth or a second entry mode with no row fails by name rather than silently
  defaulting to one side.
- **The `branch` removal is genuinely complete, not aspirational.** Independently re-ran the grep the
  PR's own gate case runs (case 16) across all four touched runtime files — clean — and confirmed the
  drawer's `#discovery-escalation` uses the pre-existing global `[hidden]{display:none!important}`
  rule (portal.css:61) rather than a `display` override that would defeat `el.hidden` the way an
  earlier ticket got bitten by.
- **The read fence and turn-id (R2) invariants survive the new hold logic.** Traced the HELD scenario
  by hand and by execution: `deriveCursor`'s `turn` is always `t${closers.length+1}` — a pure function
  of closer *count*, never of question *position* — so a held-then-reasked question always gets a
  fresh turn id and `assertTurnWritable`/R2's "one closer per turn" never collides. `cursor.index` and
  `closers.length` deliberately diverge once a hold occurs (see Finding 1's related but distinct
  observation on `completion.settled` vs `turns`), and nothing downstream (`discovery-transport.mjs`,
  `discovery-postures.mjs`) references `cursor` at all, so no consumer assumes the old
  `index === closedTurns.size` identity.
- **Guard ordering is proven from source, not asserted by disk absence** (case 16's `guardAt` scan of
  `openSession`'s body against its first `mkdirSync(` call) — a deliberate, previously-learned defense
  against "a stale leftover with no defect behind it" (PR #339 F6, cited in the comment).

---

## ⚠️ Issues Found

### 1. `runMetrics`'s `askedWhatMattered` tally double-counts a held-then-settled question — Medium

**File:** `portal/lib/discovery.mjs:559-564` (`tally`) and `:586-589` (`askedWhatMattered`).

`tally(closers, ids)` counts raw **closers** (turns) against the id set, not distinct **questions**:

```js
const tally = (closers, ids) => {
  const set = new Set(ids);
  const mine = closers.filter((c) => set.has(c.params?.question_id));
  const decided = mine.filter((c) => c.op === 'record_decision').length;
  return { closed: mine.length, decided, rate: rateOf(decided, mine.length) };
};
```

`full-discovery` is the *only* depth `askedWhatMattered` is computed for (`COMPOSES.includes(depth)`),
and it is also on `LADDER` — so a question there **can** be held (one `flag_weak_answer`, then settled
by a second closer on a fresh turn). When that happens, the *same question* contributes **two** entries
to `tally`'s `mine` array, inflating `closed` (and `decided`, if the second closer is a decision)
relative to what `coverage` reports for the identical set of ops, because `coverage` dedupes by
`question_id` via a `Set` (discovery.mjs:577-578) while `tally` does not.

Verified by direct execution — one held-then-decided question on `full-discovery`:

```
deriveCursor: index 1 (settled past it)
askedWhatMattered.twelve: { closed: 2, decided: 1, rate: 0.5 }
coverage:                 { asked: 1, decided: 1, of: 12, missing: [...11 ids] }
```

`coverage.asked` (1, per-question) and `askedWhatMattered.twelve.closed` (2, per-turn) describe the
*exact same op sequence* but under different counting rules, inside the *same* `runMetrics()` return
value. `weak.rate` (session-wide, deliberately per-turn per the README: "the cobra check on an agent
that flags everything") is a reasonable place for per-turn counting; `askedWhatMattered`, read next to
`coverage` and framed by the README as "decision rate on the facet-selected tail against ... the
twelve", reads much more naturally as per-question. Case 30.29 does not exercise this interaction — no
op sequence in that case closes the same `question_id` twice — so this gap is currently unguarded by
the gate.

This has no control-flow or gating impact (`runMetrics` is "reported, never passed", per the module's
own comment), but it will surface directly in the PRD's success-metrics reporting and could produce a
misleading "rate" once a real full-discovery run holds and re-asks a twelve-set question. Suggest
either: (a) dedupe `tally()` by `question_id` (mirroring `coverage`'s semantics, keeping the *later*
closer's `op` per question so a held-then-decided question reads as decided), or (b) leave the
per-turn counting but document explicitly, beside `askedWhatMattered` and in `discovery/README.md`,
that `.closed` counts turns and a held question is counted at both its asks.

### 2. `declareFacets` duplicates `bank.mjs`'s private normalization arithmetic — Low/Medium (DRY, brushes AC2)

**File:** `portal/lib/discovery.mjs:506-510`.

```js
export function declareFacets(facets) {
  const plan = facetPlan(facets);
  if (!plan.declared) return null;
  return Object.freeze(Object.fromEntries(FACETS.map((f) => [f.id, Object.hasOwn(facets, f.id) && facets[f.id] === true])));
}
```

The reconstruction line is byte-for-byte the same formula as `bank.mjs`'s private `normaliseFacets`
(own-key boolean coercion over the same `FACETS`/`FACET_IDS` table) — `bank.mjs` doesn't export
`normaliseFacets`, so `declareFacets` can't call it directly and re-derives the same answer from the
original `facets` argument instead of from `plan`. AC2's text is "the facet vector resolves through
the bank's own modules — the session module holds no second copy of a module definition." The `FACETS`
*table* is correctly imported, never redefined, and `selectDepth`/`facetPlan` do the actual selection
— so the letter of AC2 holds. But the *normalization arithmetic* is now maintained in two places that
happen to agree today only because both read off the same `FACETS` table by hand; there is no test
that would catch the two diverging if `bank.mjs`'s `normaliseFacets` logic changed independently (e.g.
a future case-insensitive key match, or a different empty-vector rule). Low risk today, but worth
either a comment explicitly flagging the duplication as accepted, or exporting `normaliseFacets` (or
equivalent) from `bank.mjs` for `declareFacets` to call directly.

---

## 🔍 Questions/Clarifications

- Is `askedWhatMattered.*.closed` intended to mean "turns spent" or "questions closed"? The field name
  and the README's "decision rate ... on the twelve" wording both read as the latter; the
  implementation is the former. Worth a one-line decision either way (see Finding 1).
- `openSession`'s resume branch (portal/lib/discovery.mjs:616-617) silently ignores a POSTed `facets`
  that differs from what's already on disk — this matches the pre-existing #284 pattern for `depth`/
  `entryMode`/`frontEnd`/`posture` (disk is authoritative, invariant 2) and is not a regression this
  PR introduces, so it's not filed as an issue, but confirming that's still the intended behavior for
  `facets` specifically (rather than, say, a mismatch warning) would be useful given `facets` is a
  *width* decision a person might reasonably expect to be able to correct on a page reload before the
  first answer is recorded.

---

## ✨ Recommendations

- Add a group 30 case (or extend 30.29) that closes the *same* `full-discovery` twelve-set question
  twice (hold then decide) and asserts what `askedWhatMattered.twelve` should read in that case —
  whichever semantics Finding 1 lands on, pin it so a future edit can't silently flip it.
- Consider a short comment on `declareFacets` explicitly cross-referencing `normaliseFacets` by name
  (it already says "as the bank reads them" but doesn't name the function), so a future reader who
  changes one side knows to check the other.

---

## 📋 Review Summary

- **Overall assessment: Ready to commit**, with Finding 1 worth a decision (fix or document) before or
  shortly after merge — it's a reporting-only inconsistency, not a functional or gating defect, and
  every gate that exists today is green.
- **Issues by severity:** 0 Critical, 0 High, 1 Medium, 1 Low/Medium.
- **No critical blockers.** No zod/SDK static import found in `discovery.mjs`'s import graph
  (re-verified independently); no new dependencies; `branch` is fully removed; the read-fence, R2 and
  disk-authoritative invariants all hold under the new hold/settle logic by direct execution, not just
  by reading the comments.

**Do not start fixing anything in this report without the user's explicit approval.**
