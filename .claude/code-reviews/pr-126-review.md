# Code Review — PR #126 · Read a plugin variables dump in the export path (#125)

**Branch**: `fix/figma-export-plugin-dump` · **Reviewer**: agentic gate (fresh-context code-reviewer agent, empirical reproduction against the real 178 KB Plus UI export) · **Scope**: `tooling/figma/figma-read.mjs`, `entriesFromExport`.

## Findings

1. **HIGH — FIXED in `a87d679`.** The blanket `typeof v.value === "object"` skip silently discarded all 23 effect variables, and the run then reported *"shadows NOT imported — the design offered 0"* — technically-true wording implying absence where there was loss; a direct honesty-contract violation. Now a drop-shadow effect converts to the DTCG composite shape `collectScales` already consumes (first layer only — the documented truncation), so the Plus UI dump imports the design's real shadows (3 of 6 composable, values verbatim, dropped ones named in the header); other composites (grids, typography objects) keep name parity like unvalued REST styles instead of vanishing.
2. **MEDIUM — FIXED in `a87d679`.** `modes[0]` was an unverified guess presented as "the default" — the plugin envelope declares no default mode (unlike the REST path's `defaultModeId`). A multi-mode collection now logs which mode it was read from (`"+Theme" — reading mode "Light" of Light / Dark`).
3. **LOW — verified fine**: `v.value == null` loose check correctly admits `0`/`false` (real `space-0`/`opacity-0` entries pass through).
4. **LOW — pre-existing, deferred**: bare-name flattening loses collection namespacing (cross-collection name collisions would clobber, last-wins) — identical characteristic in the sibling `entriesFromVariables`; zero collisions in the real fixture (380 unique names).
5. **LOW — pre-existing, deferred**: semantic-layer aliases can't be `--map` targets on any read path (they never carry literals); worth a runbook note someday.
6. **Shape-guard false positives — verified none**: DTCG/Tokens Studio never carry a top-level `collections` array; contrived empty matches fall through to the generic walker via the `fromCollections.length` gate.

## Validation

Real export: 380+ entries, 245 colours; the designed 12-candidate refusal; clean 64-token import with `--accent indigo`, 12/12 WCAG; shadows now imported 3-of-6 with verbatim values; mode reads logged. plusui `--offline` regeneration **byte-identical** after both commits. `node --check` ✓. Headless drawer round-trip (drop → 12 swatches → click indigo → pack + report) ✓.

## Recommendation

**Approve with the fixes applied** — the reviewer's request-changes items (1, 2) are both fixed on the branch and re-proven against the real export; the remaining lows are pre-existing characteristics shared with the sibling parsers, recorded here. The type-ramp misclassification visible in the same real run (font-weights as sizes) is engine scope tracked separately as #127, not this PR's.

*Solo-repo note: verdict posted as a comment — the human makes the final merge call.*
