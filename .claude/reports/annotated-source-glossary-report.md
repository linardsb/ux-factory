# Implementation Report — Legibility surfaces: annotated source + glossary

**Plan**: `.claude/plans/annotated-source-glossary.md`   **Branch**: `feature/annotated-source-glossary`   **Status**: COMPLETE

## Summary

Two legibility surfaces on `approach.html` §05, per `docs/epics/annotated-source-glossary.architecture.md`:
(1) two annotated-source blocks showing real shipped code (the `.btn-primary` rule and the derive
engine's accent-contrast negotiation) extracted at build time by a new zero-dep generator into a
committed, drift-checked JSON artifact, rendered beside hand-written plain-English prose; (2) seven
technical terms in the existing copy marked with `<dfn data-term>`, given a WCAG 1.4.13-conformant
hover/focus definition bubble. Approach VR baselines regenerated in the same PR.

## Tasks completed

- Spec (snippet ids, anchors, author prose) → `agent-layer/annotated-source.spec.json` (CREATE)
- Extractor generator, check mode, standalone guard → `agent-layer/gen-annotated-source.mjs` (CREATE)
- Generated committed artifact → `system/annotated-source.json` (CREATE — generated, never hand-edited)
- Drift-check registration + summary line → `tooling/drift-check.mjs` (UPDATE)
- View-time render module (pure prepare + DOM render) → `system/annotated-source.mjs` (CREATE)
- Term-definition module (TERMS map + `initGlossary`) → `system/glossary.mjs` (CREATE)
- Exhibit + term + bubble styles (token-only, one noted mono-stack exception) → `system/portfolio.css` (UPDATE)
- Exhibit markup, 7 term wraps, module script → `approach.html` (UPDATE)
- `waitReady: '#asrc[data-asrc="ready"]'` on the approach entry → `tooling/visual-regression/visual.spec.mjs` (UPDATE)
- Regenerated `approach-neutral.png` + `approach-saulera.png` baselines (docker) — no other baseline changed
- Architecture-map line for the two modules → `CLAUDE.md` (UPDATE)

## Tests added

No test suite exists (repo convention). Proofs run per the plan's testing strategy:

- **Generator proofs** (all temp edits reverted): drift (edit inside anchored region → `--check` exit 1);
  anchor loss (broken anchor → throws naming anchor + spec file, exit 1); determinism (`--check`
  byte-compare green immediately after write; double-write stable).
- **Artifact integrity**: both `code` fields verified byte-identical to `system/components.css:169-174`
  and `system/derive.rules.mjs:39-55` (Node byte-compare).
- **Live browser walk-through** (Chromium via agent-browser, page served on 127.0.0.1): 2 blocks render
  real code · 7 terms wired · hover shows bubble + `aria-describedby` · bubble hoverable (stays when
  pointer moves onto it) · Esc dismisses + removes `aria-describedby` · focus shows, blur hides after
  timeout · flip-above near viewport bottom (bubble bottom 509 < term top 517) · scroll hides · bubble
  position clamped inside viewport · degrade (artifact removed → exhibit hidden, ready flag unset,
  page + glossary clean, restored after).

## Validation results

- Level 1 syntax: `node --check` on all 4 new/updated `.mjs` — pass.
- Level 2 generator: write `✓ 2 snippets` · `--check` exit 0 · both modules Node-import safe — pass.
- Level 3 gates: `node tooling/drift-check.mjs` → `✓ syntax · token-css · annotated-source · handoff · scenarios · traces` · `node tooling/token-lint.mjs` → `✓ 55 contract tokens` — pass.
- Level 4 live surface: walk-through above — pass.
- Level 5 VR (docker, authoritative): update run → exactly `approach-neutral.png` + `approach-saulera.png`
  regenerated; check run → 2/2 green.

## Deviations from the plan

1. **VR docker runs scoped with `-g "approach"`** instead of the blanket `npm run update:docker` /
   full-suite check. Reason: the shared working dir carries the parallel Phase 3 session's uncommitted
   `factory.html` / `trace-player.mjs` / `trace.html` / `factory-intake.mjs` edits; a blanket
   `--update-snapshots` would have baked another ticket's in-progress state into the factory baselines
   (exactly the leak the plan's Task 10 GOTCHA says to stop on). Scoping enforces "only the two approach
   baselines change" by construction. The full-suite green comes from CI on the PR, where the committed
   tree has no Phase 3 content.
2. **Glossary unknown-term error says `on ${location.pathname}`** instead of the plan's hardcoded
   `on approach.html` — the TERMS map is superset-ready for other pages, and the error convention is
   "name the offending path"; a hardcoded page name would lie on any future page.
3. **`initGlossary` validates all term keys before touching the DOM** (plan's step order implied
   bubble-first) — avoids leaving an orphan bubble node when the throw aborts the page script.

## Issues encountered

- `agent-browser find first … hover` doesn't trigger `mouseenter` (its event dispatch differs); direct
  selector `agent-browser hover "css"` works — noted for future sessions, not a product issue.
- The VR harness's `text-wrap: wrap !important` capture normalization makes the code blocks wrap in
  baselines instead of scrolling horizontally. Deterministic and harmless (real pages scroll; verified
  live); just don't be surprised reading the PNG.
- Remaining manual step for the user (per the plan's browser matrix): Safari + Firefox spot-check of the
  tooltips. All APIs used are baseline-supported; Chromium verified end-to-end.
- Prose in `agent-layer/annotated-source.spec.json` and the seven definitions in `system/glossary.mjs`
  are draft author-voice copy — the plan flags them for wording review at PR (a prose change in the spec
  requires artifact regen).

## Commit scoping (shared worktree — stage by EXPLICIT path only)

The dir also holds the parallel Phase 3 session's uncommitted work (`factory.html`,
`system/factory-intake.mjs`, `system/trace-player.mjs`, `trace.html`, its plan files,
`.claude/skills/piv-plan-implementation/SKILL.md`, `.claude/plans/portfolio-ux-uplift.md`) — do NOT stage those.
This ticket's files:

```
agent-layer/annotated-source.spec.json
agent-layer/gen-annotated-source.mjs
system/annotated-source.json
system/annotated-source.mjs
system/glossary.mjs
system/portfolio.css
approach.html
tooling/drift-check.mjs
tooling/visual-regression/visual.spec.mjs
tooling/visual-regression/baselines/approach-neutral.png
tooling/visual-regression/baselines/approach-saulera.png
CLAUDE.md
docs/epics/annotated-source-glossary.architecture.md
docs/epics/ai-first-ux-factory.architecture.md   (1-line back-link to the new architecture doc)
.claude/plans/annotated-source-glossary.md
.claude/reports/annotated-source-glossary-report.md
```
