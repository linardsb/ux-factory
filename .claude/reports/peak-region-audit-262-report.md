# Report — the .peak-* region audit and prune (#262)

Branch: chore/peak-region-audit-262, base origin/main 9cd9696. Plan and the class-by-class result
table: `.claude/plans/peak-region-audit-262.md`.

## What was pruned (observed)

All 34 `.peak-*` classes' rules in system/portfolio.css (the region formerly at lines 1477–1689),
226 lines changed (26 in, 200 out; the file drops 174 lines / 10,247 bytes):

- the Beat 03 still: `.peak-stage`, `.peak-screen`, `-bar`, `-title`, `-dot`, `-tiles`,
  `.peak-tile`, `.peak-tag`, `.peak-note`, `.peak-ethics`, `.peak-ethics-body`
- the #75 live half: `.peak-screen-col`, `.peak-screen--live` (+ child selectors),
  the `.peak-screen--live.discrete-render` entrance + `@keyframes peak-assemble`
  (NOT pruned by #261 — observed still present at origin/main; #261 only rewrote their comment
  to record them dead), `.peak-receipts`, `-headline`, `-mark`, the `.is-flagged` variant,
  the scoped `.peak-receipts .wcag-pair`, `.peak-adjust` ×6, `.peak-refusal` ×3,
  `.peak-ethics-intro/-choices/-choice/-result/-verdict/-verdict-label/-verdict-tag/-gloss/-judge`,
  and the region's reduced-motion line (`.peak-ethics-choice:active`).

Every class was verified dead individually: exact-match on the class token (no `[-\w]` on either
side — the `pi-peak-*` substring trap) across 134 files (every tracked `*.html`, `system/*.mjs`,
`system/*.js`, `agent-layer/*.mjs`, `portal/public/*`, `proto/*`, `tooling/*.mjs`), plus a
repo-wide straggler sweep. Zero consumers for all 34 (observed); the only non-rule mentions were a
prose comment at instance.html:308 and system/wcag-receipts.mjs (which builds the receipts family
and is itself orphaned — below). The issue's premise ("instance.html still renders .peak-note and
the .peak-receipts* family") was confirmed stale: post-#222 instance.html contains no bare peak-*
class at all, only its own pi-peak-* classes styled in the page `<style>` (observed).

## What was kept and why

- The six base `.wcag-*` rules (`.wcag-row`, `.wcag-pair`, `.wcag-pass`, `.wcag-ratio`,
  `.wcag-fail`, `.wcag-row.is-fail`), byte-verbatim. Their sole builder is
  system/wcag-receipts.mjs, still in the tree; they die with that module (follow-up 1). Checked
  before touching anything mentioning `.wcag-pair`: the roundtrip surfaces do NOT use WCAG-pair
  markup — zero `wcag` strings in system/derivation-roundtrip.mjs and roundtrip.html (observed),
  and no other stylesheet defines any `.wcag-*` rule (observed).
- The surviving comment records the audited set, the method, and both follow-ups, in the format of
  #216's close-* prune comment (now at portfolio.css ~1710, referenced as "above" by the new one).
- Line 918's "ONE dark band exists on the spine — the peak" is design-language prose about the
  band concept (now the studio beat), not a class reference — untouched (derived).

## Render evidence (by hand — instance.html is outside the VR page set)

Worktree served at PORT=4762 (serve verified byte-identical to the worktree's portfolio.css before
and after the edit). Full-page Chromium shots at 1440×900, animations disabled, home waited on
`[data-spine="ready"]` + 4 s:

- **instance.html: byte-identical PNGs before vs after** (observed). Expected
  ERR_CONNECTION_REFUSED noise to the absent Worker on both runs — fixture degradation, not a
  regression.
- **index.html: 8 pixels differ, each channel by exactly 1/255** (observed: 232→231, 218→217),
  all anti-aliased corner/edge pixels of the hero's "How I work" button border. Controls run:
  - same-tree noise floor is ZERO (two captures of the pruned tree: byte-identical) — capture is
    deterministic;
  - a recapture under the ORIGINAL css is byte-identical to the first before-shot — the diff is
    reproducible and css-correlated;
  - **the decisive control**: the pruned rules padded back to the original byte length with a pure
    trailing comment render byte-identical to the ORIGINAL capture (0 diff bytes). So the residual
    is a stylesheet byte-length rasterisation artefact, not any deleted rule (derived from the
    three controls). It is sub-perceptual — below pixelmatch's per-pixel threshold, the class of
    change `update:docker` does not even rewrite baselines for (repo memory: VR update skips
    sub-perceptual).

## Gates (observed)

- `node agent-layer/gen-loc-summary.mjs` after staging (it reads the INDEX blob, so the regen ran
  post-`git add` — an unstaged run falsely reported no drift): **runtime group 30,800 → 30,600,
  total 38,600 → 38,500**. Regen committed.
- `node tooling/build-checks.mjs` → all 27 groups pass.

## Flags

1. **approach.html renders the runtime group's linesApprox** (approach.html:279, observed), so its
   rendered number flips 30,800 → 30,600 and the two approach baselines are stale in principle.
   NOT regenerated here per ticket scope — flagged in the PR body. One changed digit may sit
   inside the gate's maxDiffPixels:100 tolerance (repo memory), but the honest state is flagged
   either way.
2. **system/wcag-receipts.mjs is verified orphaned** (no importer anywhere; only comment
   references at brand-import.mjs:40 and build-import.mjs:59 — observed). NOT deleted: module
   deletion moves loc-summary's runtime group further and is beyond the ticket's CSS scope.
   Follow-up candidate; the six kept `.wcag-*` rules go with it.
3. **--motion-skeleton-to-content is now consumer-less** (portfolio.css:1610 was its only `var()`
   consumer in shipped code — observed). The #261 in-file note proposed "#262 does the rules and
   the token in one piece"; deviated deliberately: the token is in tokens.source.json AND
   system-graph.json (observed), so dropping it regenerates gen-token-css → gen-handoff →
   gen-system-graph and churns factory.html's pixel baselines — a cascade a hand-verified CSS
   prune must not smuggle in. Follow-up candidate, ideally bundled with follow-up 2.
