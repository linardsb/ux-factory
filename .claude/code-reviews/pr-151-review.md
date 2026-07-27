# Code review — PR #151 · /build slice 2: the full pattern library

**Ticket** #139 (epic #134) · `feature/build-full-pattern-library` → `main` · 24 files, +2154 / −120
**Reviewed at** `bb9d9d3`, **re-reviewed after fixes at** `eab6dae`
**Method**: fresh-eyes pass by the `code-reviewer` agent over the full diff (not just hunks), against
`CLAUDE.md`, the plan and the report's documented deviations — plus an independent verification pass
that ran the shipped functions rather than reading them.

## Recommendation: **APPROVE**

Three findings, all raised and all fixed on the branch. Zero Critical, zero High. The feature is
correct, the security seam holds, and the gates it ships are genuinely falsifiable — 16/16 mutations
caught, including three added to cover the review's own findings.

---

## Findings

### 1 · [Medium → FIXED in `eab6dae`] `warn` had no textual correlate — the spec and the code contradicted each other

`system/pattern-rules.mjs` (onboarding branch) omitted `detail` entirely for a place with no
affordances, leaving `tone: "warn"` as the only difference between two states:

```
tone=neutral  →  "Step 1 of 2, Get started, Filter"
tone=warn     →  "Step 2 of 2, Settings"          ← identical to a healthy step with no detail
```

A border colour and an 8% `color-mix` tint were carrying the whole signal. `system/specs/sequence-step.md:36`
forbids exactly that — *"Colour is never the sole signal: the position, label and detail must carry
the state on their own"* — and gives the missing sentence as its own example. Both files shipped in
the same commit, which is precisely the kind of contradiction an author's context rationalizes away.

It is also the odd one out: `dashboard`'s `warn` is backed by literal text (`value: "0"`,
`unit: "affordances"`), and `queue`/`feed`/`settings` never set `tone` at all.

**Fix**: the empty case now carries the spec's own sentence verbatim — `"nothing to act on here"`.
Still counted rather than invented: it is a branch on a counted zero, the same shape as the dashboard
tile's `unit`, which picks between two fixed words on a counted `n`. The card's detail budget widened
20 → 24 to fit it uncut, and the astral sweep gained 23/24.

**The gate now asserts the invariant, not the instance** — every tone-bearing slot of every pattern
must still read its state with the tone stripped. It generalizes: mutating the *dashboard*'s counted
zero away fails it too, and that code predates this ticket.

### 2 · [Low-Medium → FIXED] A new journey check could not fail

`tooling/build-journey.mjs` [4b] asserted "the ordinal is real text in the accessibility tree" via
`.textContent.includes("Step 1 of")` on the parent — but the assertion immediately above already
pins `.ds-sequence-step-position`'s exact `textContent`. Once that passes, the parent's aggregate
necessarily contains the substring, so the check could not go red for any reason already caught.

Verified empirically that `.textContent` never includes `::before`/`::after` content at all, so
phrasing this check over `textContent` cannot test the CSS-counter regression it names.

**Fix**: it now reads `getComputedStyle(el, "::before"/"::after").content` directly — the one thing
the other assertions structurally cannot see — plus a separate one-sentence reading-order assertion.

This is the same "check that cannot fail" family the ticket had already fixed once, in the very
commit whose message is about fixing another instance of it. Found by review, not by the gate.

### 3 · [Low, latent → FIXED at the root] A just-fixed wait was fragile in the other direction

`bb9d9d3` correctly caught that the new [4c] consumed `page`'s first share-link copy, silently
turning [6]'s `?b=`-presence wait into a no-op, and replaced it with a URL-changed predicate. But
once `linkLive` is set, `build-keep.mjs` rewrites the URL on a 400ms trailing edge after every later
state change — so a second copy on the same page has no reliable edge to wait on either, whichever
predicate is used.

**Fix**: [4c] moved to a context of its own and [6]'s original presence-wait restored. [6] genuinely
holds the page's first copy again, which is what made that wait real. `[16]` audited — it already
uses a fresh page, so its wait was never affected.

### Also addressed

- The `.bx-pat-slots.is-settings` multi-column arrangement diverges from the plan's Task 10 sketch
  ("single column, hairline-separated"). The code carries its own rationale, but it was missing from
  the report's deviations list — added as item 11 for consistency with how everything else was
  disclosed.

---

## Validation

| gate | result |
|---|---|
| CI `verify` | ✓ pass |
| CI `visual` | ✓ pass — the six re-captured baselines hold on CI's Linux renderer |
| `node tooling/build-checks.mjs` | ✓ all 7 groups |
| **mutation sweep** | ✓ **16/16** (13 original + 3 covering this review's findings) |
| `node tooling/build-journey.mjs all` | ✓ **103 passed · 0 failed** × chromium + firefox + webkit |
| `token-lint` · `drift-check` · `loc-summary --check` | ✓ |
| VR re-run after the fixes | ✓ 20 passed, no further baseline movement |

**Independent verification** (running the shipped code, not reading it):

- **48 board×pattern combinations** — empty · lone-place · no-affordance · full 36-affordance · all
  four drafted boards × six pattern ids — **zero** emit `"not in the library"`. The live bug is
  comprehensively fixed, not just fixed on the reported path.
- **Escaping**: every visitor-supplied string in `stepsBody` is `esc(clip(…))`, clipped before
  escaped, in both attribute and text contexts. The only unescaped interpolations in `build-card.mjs`
  are `label` from the frozen `PATTERNS`, which pass through `frame()`'s own `esc()`.
- **Spec/CSS token agreement**: 14 claimed, 14 referenced, zero drift either way — matching both
  `ds-` siblings exactly.
- **AC1–AC3** re-derived by execution: five entries flipped with the field pair retained; every slot
  value a string; every branch capped on a 36-affordance board; all five compositions validate
  against the real generated vocabulary; each emitted name is both a vocabulary key and a template.
- **Rename is clean**: `queueBody` survives only in the comment explaining why it became `rowsBody`.
  The four new exports are consumed only by the gate and their own modules.

---

## What's good

- **The live bug is genuinely fixed and genuinely regressed.** The four-way `cardSvg` split and the
  parallel three-way `specMarkdown` split separate "nothing to arrange" from "not in the library",
  and the gate sweeps both media across every pattern × board shape. Reverting either split turns the
  gate red — proved, not assumed.
- **The derivations are honest.** `feed` slices *after* the flatMap so the cap lands on the stream;
  `onboarding`'s `total` is the drawn count, not `places.length`; every value is `String()`-boxed at
  the boundary. The gate reconstructs expected values from the fixtures rather than re-asserting the
  implementation's own output.
- **`SLOT_MAX`'s comment was corrected rather than left to rot** — it claimed to be a stated bound and
  not a working truncation, which `feed` made false. The amendment names the exception and the page
  states the drop with the real total.
- **`agentic-renderer.mjs` is provably additive** — `build()` and `validateComposition` byte-identical
  to `main`; one new `TEMPLATES` key and a `hasTemplate` predicate. Blast radius checked rather than
  asserted: the two Fieldwork slots via un-churned `proto-*` baselines, and the two surfaces with no
  pixel coverage driven headless.
- **Two exports added so assertions could RUN rather than grep** (`hasTemplate`, `specMarkdown`).
  That is the correct response to this repo's `check-that-cannot-fail` record.
- **Fixtures keyed off `PATTERNS`** — a sixth pattern with no board fails loudly rather than being
  silently skipped.
- **The baseline discipline is exemplary**: captured from a clean detached worktree because the shared
  tree carries another session's edits to two VR'd pages; `approach`/`factory` forced only after the
  underlying data was verified to have moved, not on the tooling's say-so.

## Note on severity

By the rubric this was approvable as first submitted — no Critical, no High, validation green. It was
worth fixing anyway: finding 1 is an accessibility promise the repo makes to itself in committed
prose, on a page whose entire argument is that it does not say false things, and finding 2 is the
exact failure class this repo has a named memory about.

---

*Reviewed by the `code-reviewer` agent plus an independent execution pass. A human still owns the
merge decision.*
