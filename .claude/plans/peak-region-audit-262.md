# Plan — audit the .peak-* region for builder-less rules after #216 (#262)

Ticket: linardsb/ux-factory#262. Deferred from PR #261's review-fix pass. Base: origin/main at 9cd9696.

## Premise check (the issue predates #222)

The issue's premise — "instance.html still renders .peak-note and the .peak-receipts* family" — is
**no longer true**. Verified mechanically on this branch (observed):

- instance.html post-#222 contains **no bare peak-\* class at all**. Its only `peak-` mentions are
  prose comments (lines 27, 308, 340, 398, 691–692) and its own `pi-peak-*` classes (styled in the
  page `<style>`, lines 314–332). The apparent `.peak-ethics` / `.peak-stage` consumers are
  substring false-positives from `pi-peak-ethics` / `pi-peak-stage` — the audit therefore
  exact-matches on the class token (no `[-\w]` on either side), never on a substring.
- **Nothing imports system/wcag-receipts.mjs** (the `.peak-receipts*` builder). The only mentions
  are comment references in brand-import.mjs:40 and build-import.mjs:59. So the receipts family is
  builder-less too — **wider** than the issue's premise.
- `@keyframes peak-assemble` + the `.peak-screen--live.discrete-render` block were **not** deleted
  by #261 — #261 only rewrote their comment to say DEAD (portfolio.css:1595–1622 still present at
  origin/main). They are pruned by this ticket.

## Method

Same discipline as #216's close-* prune (the surviving comment at portfolio.css:1710–1721 is the
format matched): enumerate every class defined in the region (portfolio.css 1477–1689), then check
each individually against every candidate consumer file, exact-matching the class token —
a match requires no `[-\w]` immediately before or after the name, which kills both the `pi-peak-*`
substring trap and `peak-screen` matching `peak-screen-bar` / `peak-screen--live`.

File set swept (134 files, from `git ls-files`): every `*.html` (root, proto/, scenarios/,
portal/public/, tooling sandboxes), `system/*.mjs`, `system/*.js`, `agent-layer/*.mjs`,
`portal/public/*`, `proto/*`, `tooling/*.mjs`. Plus a repo-wide `grep -rl "peak-"` (excluding
node_modules/.git/.claude/docs/traces/baselines) as a straggler net: outside portfolio.css it hits
only instance.html (prose + pi-peak-*), tooling/style-dictionary/package-lock.json (npm noise), and
system/wcag-receipts.mjs itself. Bare-word `peak` in system/*.mjs, *.js and the VR tooling was also
swept: every hit is a prose comment about the deleted module, no code.

## The class-by-class result (all observed)

| # | class | consumers found | verdict |
|---|-------|-----------------|---------|
| 1 | .peak-stage | none | dead — prune |
| 2 | .peak-screen | none | dead — prune |
| 3 | .peak-screen-bar | none | dead — prune |
| 4 | .peak-screen-title | none | dead — prune |
| 5 | .peak-screen-dot | none | dead — prune |
| 6 | .peak-screen-tiles | none | dead — prune |
| 7 | .peak-tile (+ .n/.l descendants) | none | dead — prune |
| 8 | .peak-tag | none | dead — prune |
| 9 | .peak-note | none (issue's premise stale — #222 removed it) | dead — prune |
| 10 | .peak-ethics | none (pi-peak-ethics is a substring false-positive) | dead — prune |
| 11 | .peak-ethics-body | none | dead — prune |
| 12 | .peak-screen-col | none | dead — prune |
| 13 | .peak-screen--live | one PROSE comment, instance.html:308 | dead — prune |
| 14 | .peak-screen--live.discrete-render (entrance) | none; .discrete-render itself: zero consumers repo-wide | dead — prune (#261 declared, #262 deletes) |
| 15 | @keyframes peak-assemble | only rule 14 | dead — prune; orphans --motion-skeleton-to-content (see follow-ups) |
| 16 | .peak-receipts | built only by wcag-receipts.mjs:55 — module orphaned | builder-less — prune |
| 17 | .peak-receipts-headline (+ .is-flagged variant) | wcag-receipts.mjs:56 only — module orphaned | builder-less — prune |
| 18 | .peak-receipts-mark | wcag-receipts.mjs:57 only — module orphaned | builder-less — prune |
| 19 | .peak-receipts .wcag-pair (scoped rule) | scope dead with 16 | dead — prune (the scoped rule ONLY) |
| 20 | .peak-adjust | none | dead — prune |
| 21 | .peak-adjust-eyebrow | none | dead — prune |
| 22 | .peak-adjust-hint | none | dead — prune |
| 23 | .peak-adjust-control | none | dead — prune |
| 24 | .peak-adjust-label | none | dead — prune |
| 25 | .peak-adjust-select | none | dead — prune |
| 26 | .peak-refusal | none | dead — prune |
| 27 | .peak-refusal-tag | none | dead — prune |
| 28 | .peak-refusal-msg | none | dead — prune |
| 29 | .peak-ethics-intro | none | dead — prune |
| 30 | .peak-ethics-choices | none | dead — prune |
| 31 | .peak-ethics-choice (+ hover/focus/active/pressed/reduced-motion) | none | dead — prune |
| 32 | .peak-ethics-result | none | dead — prune |
| 33 | .peak-ethics-verdict (+ -label, -tag) | none | dead — prune |
| 34 | .peak-ethics-gloss, .peak-ethics-judge | none | dead — prune |

Co-located non-peak classes in the region — **kept**:

| class | consumers found | verdict |
|-------|-----------------|---------|
| .wcag-row (+ .is-fail variant) | wcag-receipts.mjs:65 only | kept — sole builder is the orphaned module; dies WITH the module in the follow-up |
| .wcag-pair (base rule) | wcag-receipts.mjs:66 only | kept — same |
| .wcag-pass | wcag-receipts.mjs:68 only | kept — same |
| .wcag-ratio | wcag-receipts.mjs:67 only | kept — same |
| .wcag-fail | wcag-receipts.mjs:68 only | kept — same |

Checked before touching anything mentioning `.wcag-pair` (the ticket's named trap): the
roundtrip surfaces do NOT use WCAG-pair markup — `grep -c wcag` over
system/derivation-roundtrip.mjs and roundtrip.html is 0 for both (observed); derivation-roundtrip
renders its own classes. No other stylesheet defines any `.wcag-*` rule (observed: repo-wide CSS
grep hits portfolio.css 1529–1543 and the scoped 1640 only).

## The prune (portfolio.css 1477–1689)

Delete every rule for classes 1–34 above, plus the Beat 03 header comment, the #75 region header
comment (its "instance.html still renders .peak-note and the .peak-receipts* family" claim is now
false), the #261 dead-entrance comment, and the receipts/adjust/refusal/ethics section comments.
Survives, in place: one audited-set comment in #216's close-* format, followed by the six `.wcag-*`
rules it explains.

## Deliberate non-prunes (both flagged as follow-ups, derived)

1. **system/wcag-receipts.mjs** — verified orphaned, but module deletion changes loc-summary's
   runtime group (approach.html renders those numbers → VR baseline cascade) and is beyond the
   ticket's CSS scope. The `.wcag-*` rules above are its only remaining styling and go with it.
2. **--motion-skeleton-to-content** (tokens.source.json) — `portfolio.css:1610` (peak-assemble)
   was its ONLY `var()` consumer in shipped code (observed); this prune orphans it. The #261
   comment proposed "#262 does the rules and the token in one piece", but dropping a contract
   token regenerates gen-token-css → gen-handoff → gen-system-graph, and the token is present in
   system-graph.json (observed), which factory.html renders — a factory pixel-baseline churn that
   a hand-verified CSS prune must not smuggle in. Deviation from the in-file note, stated in the
   PR body.

## Verification (instance.html is outside the VR page set — by hand, not by gate)

1. Serve the worktree: `PORT=4762 node tooling/visual-regression/serve.mjs`.
2. Full-page screenshots of instance.html and index.html BEFORE the prune and AFTER
   (Playwright from ~/node_modules; home waits for the hero re-skin settle; instance's
   ERR_CONNECTION_REFUSED to the absent Worker is expected fixture degradation).
   Compare — must be identical.
3. `node agent-layer/gen-loc-summary.mjs` — commit the regen if loc-summary.json drifts; note any
   GROUP flip (approach.html renders the runtime group).
4. `node tooling/build-checks.mjs` → 27/27.
