# Implementation Report — Portfolio Phase 5: utility dock, copy-prompt handoff, system graph

**Plan**: `.claude/plans/portfolio-motion-phase05-utility-dock.md`
**Branches**: `feature/portfolio-phase05-dock` (A, `a3d9df6`) · `feature/handoff-copy-prompt` (B, `0039c11`) · `feature/system-graph` (C, `9c24d1a`, stacked on A)
**Status**: COMPLETE (one item pending human: Safari eyeball, see Issues)

## Summary

All three plan slices implemented and committed, one atomic commit per PR. PR A ships the
appearance dock (live neutral ⇄ saulera ⇄ verdant pack switching via the one head-link swap,
persisted + restored pre-paint), "Copy tokens", and the scroll-ruler left rail on the six IA
pages. PR B adds the per-component "Copy agent prompt" button to the handoff viewer. PR C ships
`gen-system-graph.mjs` (drift-checked generated artifact: 57 tokens × 28 consumers × 3 packs,
301 edges) and the `#shape` factory exhibit rendering it (edges on hover/focus only, pack
bindings verbatim).

## Tasks completed

**PR A** (`feature/portfolio-phase05-dock`, off `origin/main` @ `1a0b0a2`)
- A1 `system/pack-boot.js` (CREATE) — pre-paint pack restore, allowlisted, VR-safe no-op default
- A2 `system/dock.mjs` (CREATE) — dock + hash-routed `#appearance` disclosure + copy + ruler
- A3 `system/portfolio.css` (UPDATE) — dock/panel/ruler styles, `@supports (animation-timeline: scroll())` fill
- A4 six IA pages (UPDATE) — head `pack-boot.js` + tail `dock.mjs`; verified 6×1 each, zero leaks into proto/drivers
- A5+ `CLAUDE.md` map, `system/loc-summary.json` regen (see Deviations), 12 VR baselines
- A6 full Chromium click-through (all 9 script items observed) — details under Validation
- A7 Docker regen → exactly 12 changed PNGs, fill-state consistency verified programmatically

**PR B** (`feature/handoff-copy-prompt`, off `origin/main`)
- B1 `system/handoff-viewer.mjs` (UPDATE) — copy button riding the vocab eyebrow (contract-link idiom); `prepareHandoff`/`destroy` untouched
- B2 `handoff.html` (UPDATE) — compact `.hv-copy` style; zero baseline changes confirmed

**PR C** (`feature/system-graph`, stacked on A — see Deviations)
- C1 `agent-layer/gen-system-graph.mjs` (CREATE) — mirrors gen-loc-summary; counts.tokens = 57 exactly as planned
- C2 `tooling/drift-check.mjs` (UPDATE) — `checkSystemGraph()` registered; red/green drill passed
- C3 `system/system-graph.mjs` (CREATE) — pure `prepareGraph` + SVG `renderSystemGraph`, `createElementNS` discipline
- C4 `factory.html` (UPDATE) — `#shape` exhibit between `#agents` and the CTA; static honesty prose; `data-graph="ready"` gate handle; kept out of `cs-jump`
- C5 `visual.spec.mjs` waitReady + `CLAUDE.md` + regen → factory ×2 + approach ×2 PNGs

## Tests added

Repo has no test suite by design. Validation = run-the-surface (below) + the two CI gates.
Pure-function check: `prepareGraph` exercised under Node (57/28 counts, throws on bad shape).

## Validation results

- `node tooling/drift-check.mjs` ✓ on all three branches (incl. new system-graph step on C)
- `node tooling/token-lint.mjs` ✓ (57 contract tokens · 0 undeclared · 0 orphan)
- `node agent-layer/gen-system-graph.mjs` ✓ + `--check` idempotent ✓; drift drill RED→GREEN ✓
- VR baselines: A = exactly 12 changed, B = 0, C = 4 (2 planned + 2 cascade); proto PNGs untouched throughout
- Chromium (agent-browser) click-throughs, all passed: pack swap + persistence (reload & cross-page), copy-tokens = saulera/verdant CSS byte-identical, deep-link `#appearance` open + Escape/outside-click close + focus return, tab order (toggle → checked radio → copy → link), arrow-key pack switching re-skins live, contact/404 dock-without-ruler, both rails hidden < 1100px, reduced-motion instant panel (0.01 ms) with ruler still tracking, ruler fill scaleY == scroll progress (0.252 at 25.2 % scroll), handoff copy = valid `{composition, components:{one}}` JSON on all 8 cards, `#shape` 85 nodes / 0 edges at rest / 20 edges + verbatim three-pack detail on `--color-accent` hover / keyboard focus symmetric

## Deviations from the plan

1. **PR C branched from A's branch, not `main`.** The plan wants C after A is *merged* purely to
   serialize factory PNG regens; merging isn't possible mid-session, so C stacks on A — same
   serialization, correct final pixels. **Open PR C after PR A merges** (its diff then shrinks
   to C's commit; or rebase onto main).
2. **loc-summary cascade (A and C, not in plan).** New tracked source files change
   `loc-summary.json`, whose numbers approach.html renders → regenerated the JSON and the two
   approach baselines in both PRs. Hence C's "exactly 2 PNGs" is 4, and A includes
   `loc-summary.json`. Recorded as a memory (`loc-summary-baseline-cascade`).
3. **Baselines force-rewritten via `rm`.** The dock's light chrome diffs below pixelmatch's
   per-pixel threshold, so `--update-snapshots` alone rewrote nothing (known repo memory);
   deleted the target PNGs to force fresh captures.
4. **Pack-link selector.** The plan's sketch `link[href*="/system/tokens."]` would match
   `tokens.contract.css` (it precedes the pack line); dock.mjs matches
   `tokens.(neutral|saulera|verdant).css` explicitly for both the swap and the copy fetch.
5. **Deep-link focus re-assert.** On direct `/#appearance` loads Chrome's fragment navigation
   clears focus after deferred modules run; dock.mjs re-asserts the panel focus once on
   window `load` (verified in-browser).
6. **C2 drill mutation.** `/* x */` can't trip the scanner (it keys on block headers +
   `var()` refs, not bytes); the drill used a token-consuming fake block — RED confirmed, then
   GREEN.
7. **Panel entrance = keyframe on the discrete `.is-open` toggle** rather than a
   transition+visibility-delay, so the reduced-motion kill-switch makes it truly instant.

## Issues encountered

- **Safari eyeball not done** — no Safari automation available in this session; the plan calls
  for a real-Safari pass on A and C (VR single-engine blindspot). Layout risk is low (no wide
  code in grid cells; `.sg-scroll` has `overflow-x: auto; min-width: 0`), but please eyeball
  `/`, `/factory#shape`, and the open dock panel in Safari before merging.
- Saulera renders with fallback font stacks under the dock switch — expected (`/fonts/` 404s,
  identical to the committed saulera baselines).

## Next steps

`piv-create-pr` per branch: **A first**, B anytime, **C only after A merges** (stacked).
