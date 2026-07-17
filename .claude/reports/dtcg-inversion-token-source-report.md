# Implementation Report — DTCG inversion: tokens.source.json becomes the token source of truth

**Plan**: `.claude/plans/dtcg-inversion-token-source.md`   **Branch**: `main` (see Deviations)   **Status**: COMPLETE

## Summary

`system/tokens.source.json` (DTCG, string profile) now holds all 99 tokens — the 46-token semantic contract and the 53-token neutral pack (primitives + semantic map as `{…}` aliases). A new zero-dep generator, `agent-layer/gen-token-css.mjs`, validates the source at the boundary and emits both CSS layers with section banners, tier banners, alignment, and inline comments; `--check` mode regenerates in memory and exits 1 on drift (the primitive ticket #9's CI gate wires up). Emitted CSS proved var-for-var identical to the pre-change files. Stale "GENERATED MIRROR … saulera-client-starter" headers retired from `tokens.contract.css` and `site.js`; `token-system.md` and `CLAUDE.md` updated to describe the inverted flow.

## Tasks completed

- Baseline snapshot → scratchpad `baseline/` (both CSS files)
- `system/tokens.source.json` (CREATE) — 46 contract + 53 neutral tokens, 9 + 10 sections, exact value transcription
- `agent-layer/gen-token-css.mjs` (CREATE) — loadSource/emitCss/genTokenCss + `--check` + standalone guard + `✓` line
- `agent-layer/build.mjs` (UPDATE) — import + call + `✓` log, placed before the per-company `genTokens` projection
- Equivalence proof (scratchpad `compare-vars.mjs`) — green first run
- `system/site.js` (UPDATE) — line 1 stale header replaced with hand-written-canon note
- `.claude/references/token-system.md` (UPDATE) — "Adding a token" + "Machine layer" paragraphs now describe the inverted flow
- `CLAUDE.md` (UPDATE ×4) — architecture map (`tokens.source.json` added, both CSS marked GENERATED), agent-layer artifact list, Component bullet, stale-header warning paragraph DELETED

## Tests added

None committed — the project deliberately has no test suite (CLAUDE.md ground rule). Executable validation ran in place via throwaway scratchpad scripts:

- `compare-vars.mjs` — baseline ≡ regenerated var maps: `tokens.contract OK 46 vars · tokens.neutral OK 53 vars` (run twice: after first generation and after the drift-proof regeneration)
- `test-failures.mjs` — 5/5 boundary failure modes throw with path-naming messages (unresolved alias · contract-alias ban · cross-group alias · duplicate leaf across sections · missing `$value`); source byte-restored after each

## Validation results

- **Syntax**: source valid JSON ✓ · `node --check` generator ✓
- **Generator**: `token css ✓ 46 contract + 53 pack tokens` ✓ · `--check` exit 0 ✓ · export shape consumed as build.mjs will (`{contract:46, neutral:53, drifted:[]}`) ✓
- **Equivalence**: 46 + 53 vars identical (whitespace-collapsed compare; only intentional normalization: one double-space inside a `color-mix()` value collapsed) ✓
- **Drift proof**: `sed` tamper → `--check` exit 1 naming `tokens.contract.css` → regenerate → `--check` exit 0 ✓
- **Stale headers**: `grep -c saulera-client-starter` = 0 in `site.js`, `tokens.contract.css`, `CLAUDE.md` ✓
- **Render surface**: served on `127.0.0.1:4321` — `index.html`, both token files, `components.css` all HTTP 200; render identity follows from var-map equality ✓
- **`git diff --stat`**: only planned files changed (`build.mjs +4`, `site.js 2`, contract 26, neutral 68) + 2 new files ✓

## Deviations from the plan

1. **Worked on `main`, no feature branch.** The piv-implement skill defaults to `feature/<slug>`, but project `CLAUDE.md` pins "work on `main`; one atomic commit per phase/ticket" — project rules win. The commit (next step) carries `Closes #2`, which auto-closes the issue when pushed to the default branch.
2. **Standalone guard uses `pathToFileURL(process.argv[1]).href`,** not the plan's cited `gen-tokens.mjs:61-64` pattern. The conventional pattern is silently broken on this machine: the repo path contains a space, which `import.meta.url` percent-encodes (`Linards%20current`), so `` `file://${argv[1]}` `` never matches and the guard no-ops. **Latent bug alert:** every other generator's guard (`gen-tokens.mjs`, `gen-decisions.mjs`, `gen-llms.mjs`, `gen-headers.mjs`, `inject-jsonld.mjs`) has the same issue when run standalone from a space-containing cwd — left untouched per the surgical rule; worth a tiny follow-up ticket.
3. **`site.js` line 2 kept as-is** ("base — shared chrome…") — only the stale line-1 mirror claim was replaced, per byte-surgical instruction; the "base" vocabulary is legacy but true.

## Issues encountered

Only the guard bug above (surfaced as the generator "running" but printing nothing on first invocation). Everything else went to plan; equivalence was green on the first regeneration.
