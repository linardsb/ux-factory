# PR #257 Review — feat(215): the component catalog at /components

**Verdict: APPROVE** (posted as a comment — solo repo, self-approval blocked by GitHub)

Fresh-context agentic review (piv-review-pr → code-reviewer agent). All changed files read in full
against `git diff origin/main...HEAD`; gates re-run on this tree rather than trusted from the PR body.
The ten deviations documented in `.claude/reports/component-catalog-215-report.md` were treated as
recorded decisions, not issues.

## Validation (re-run, this tree)

| Gate | Result |
|------|--------|
| `node tooling/build-checks.mjs` | **21/21 groups pass** (incl. new group 21) |
| `node tooling/drift-check.mjs` | all sections green |
| `tooling/catalog-journey.mjs` | **28/28 × chromium + firefox + webkit** (reviewer-run, fresh serve, byte-match guard confirmed serving this tree) |
| CI on the PR head | `verify` pass · `visual` pass |
| Baseline churn | exactly as claimed: 16 modified chrome-bearing + 2 new `/components`, 4 proto PNGs untouched |

Branch in sync with origin, 0 behind main, mergeState CLEAN.

## Issues

No Critical, High, or Medium findings. Four **Low** (non-blocking — latent tripwires or test-coverage
gaps, no live failure today):

### L1 — Fictional-notice re-confirm fetch sits outside the VR readiness handle
`system/catalog.mjs:499-505` fetches `/scenarios/verdant/copy.json` and swaps `notice.textContent`
on resolve, but that fetch is not in the `Promise.all` (:512-517) gating `data-catalog="ready"` —
the attribute the VR spec waits on. Inert today (the baked string at `components.html:197` is
byte-identical to `copy.json`'s `fictionalNotice`), but the day either side drifts it becomes an
*intermittent* pixel flake, not a systematic failure. The idiom was borrowed from `handoff.html`,
which is outside the VR set, so the "race doesn't matter" property didn't transfer.
**Fix**: fold the fetch into the `Promise.all`, or pin the baked string against `copy.json` in
build-checks group 21 (the `CATALOG_COMPONENTS`/`TONES` house pattern).

### L2 — `watchPackSwap` leaks one dead listener per pack swap
`system/catalog.mjs:482-490`: each swap adds both a `load` and an `error` listener with
`{ once: true }`; exactly one ever fires, so the other stays attached to the `<link>` forever —
an unbounded (if harmless, no-op handlers) accumulation across repeated dock toggles.
**Fix**: one `AbortController` per swap, `{ signal }` on both, `.abort()` at the top of `refresh()`.

### L3 — Journey case [6] never exercises the same-page hash-routing branch it describes
`tooling/catalog-journey.mjs:211-217` proves the palette commands are static pre-render (AC #6's
actual point), but `palette.mjs:125`'s `samePage` branch (`location.hash = hash` on
`/components` itself) is never driven anywhere. Verified by hand that `normalize()` maps
`/components.html` → `/components` so the branch does work — coverage gap, not a product bug.
**Fix**: one assertion in a components.html context — run the command, assert `location.hash`
changed with no navigation.

### L4 — `WRAPPER_ATTRS` pinned for soundness, not completeness
`tooling/build-checks.mjs:3965-3993` proves every entry is real (key = vocabulary prop, value = a
parsed `observedAttributes` literal, plus the `type:"type"` mutation) but never the converse: that
every prop of a wrapped component *has* an entry. Today's coverage is exactly 1:1 (hand-verified),
but a regenerated wrapper gaining a prop would silently under-project the vd/react tabs with no red
build — the opposite failure direction from the fabrication the pin exists to prevent.
**Fix**: one `deep()` compare of `Object.keys(WRAPPER_ATTRS[name]).sort()` vs the vocabulary's prop
keys per wrapped component.

## Risk areas checked and clean

- **XSS / sinks**: all DOM construction via `el()`/`createElement`/`setAttribute`/`textContent`;
  the two `.outerHTML` *reads* land via `.textContent =`. The group-7 exception regex
  (`/\.outerHTML\s*=[^=]/`) correctly distinguishes assignment from comparison — hand-traced both.
- **pack-boot last-in-head**: a `<style>` block follows the tag, but that matches approach/factory/
  build.html — the real invariant (no stylesheet below it re-pointing the pack) holds.
- **Palette staticness**: `CATALOG_COMPONENTS` genuinely static, pinned 1:1 by group 21.
- **Copy byte-identity**: clipboard capture byte-equals `system/specs/stat-tile.md` on all 3 engines.
- **Generated-artifacts-only**: every surfaced count read from the fetched artifact at runtime;
  the one hand-written table (`WRAPPER_ATTRS`) is the argued, triple-pinned exception.

## Done well

- The group-7 exception **sharpens** the gate (no-assignment-form assertion) instead of carving a
  hole — the repo's stated discipline, actually followed.
- `WRAPPER_ATTRS` pinned against text-parsed real wrapper sources, not a second hand-typed copy.
- The journey's stale-serve byte-match guard turns a remembered operator trap into a structural
  refusal — it genuinely refuses a wrong tree (exercised during review).
- `renderMarkdown` export is a pure visibility change; no fork, no behavioral edit, importer intact.
- Baseline churn exact and honest: 16 + 2, protos untouched, verified against the diff.

## Recommendation

**Merge.** The four Lows are follow-up material (L1 and L4 are the two worth a small ticket — both
are "the check that cannot fail" class gaps in waiting); none blocks. Validation passes everywhere
it was re-run, the diff matches the PR's stated intent, and every documented deviation checks out
as described.

## Resolution (2026-08-11, on this PR — piv-fix-review-findings)

All four Lows fixed on the branch, none deferred:

- **L1 — fixed** via the pin, not the Promise.all fold (zero runtime change, zero baseline risk):
  build-checks 21.8 byte-pins components.html's baked `#fictional-notice` against
  `scenarios/verdant/copy.json`'s `fictionalNotice`, so the outside-the-ready-handle re-confirm
  swap is provably always a no-op. Mutation-proven: a one-word drift in the baked line goes red
  naming both sides.
- **L2 — fixed**: `watchPackSwap` gets one `AbortController` per swap — the firing listener sweeps
  its dead sibling, a new swap sweeps a still-pending pair. Proven by new journey case [11]:
  chromium CDP counts settled load/error listeners on the pack link — 0 after one swap and 0 after
  three on the fix; the pre-fix code reads 1 and 3 there (run and confirmed red). The re-resolve
  behavior itself is asserted ×3 engines (swaps to verdant — saulera's fonts @import 404s under the
  static serve and would trip the console gate).
- **L3 — fixed**: new journey case [10] drives palette.mjs's `samePage` branch on /components
  itself — hash becomes `#status-chip`, a pre-command window marker survives (no navigation), and
  the section heading takes focus. ×3 engines.
- **L4 — fixed**: 21.5 gains the converse pin — per wrapped component,
  `Object.keys(WRAPPER_ATTRS[name])` deep-equals the vocabulary entry's prop keys, so a
  regenerated wrapper gaining a prop is a red build, not a silent under-projection.
  Mutation-proven: dropping `checked` from care-task-row's map goes red naming both key sets.

Gates on the fixed tree: build-checks 21/21 · drift-check all green (loc-summary unmoved) ·
catalog-journey 33/32/32 × chromium/firefox/webkit. No at-rest page change — no baseline churn.
