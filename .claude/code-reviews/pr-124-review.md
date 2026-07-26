# Code Review — PR #124 · Drop a Figma export in the portal, get a token pack (#116)

**Branch**: `feature/figma-drop-portal-ui` · **Base**: `main` · **Diff**: 9 files, +673/−8
**Reviewed from**: `ux-factory-wt-116` (clean checkout) · **Reviewer**: agentic gate — fresh-context code-reviewer agent over the full diff + every changed file, plus an independent re-run of the whole validation ladder.
**Plan**: `.claude/plans/figma-drop-portal-ui-implementation.md` · **Report**: `.claude/reports/figma-drop-portal-ui-report.md` — its 9 documented deviations were treated as intentional decisions, not findings.

## Validation (independently re-run, not taken from the report)

| Gate | Result |
|---|---|
| `node --check` figma.mjs / server.mjs / figma-pull.mjs | ✓ |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan |
| `node tooling/drift-check.mjs` | ✓ all 8 checks |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ 3 groups, no drift |
| plusui `--offline` regeneration through the modified engine | ✓ byte-identical |
| CI on the PR head | ✓ verify · ✓ visual |

Live route round-trip (real server, fresh fixtures): clean export → pack written (16 roles, 48 auto-filled, 12 WCAG checks), header names the export **repo-relatively in both places** (`--from …` and `(key …)`); ambiguous export → `200 { ok:false, needs:"accent" }` with chroma-sorted candidates carrying valid `#rrggbb` swatches; `x-figma-retry` re-runs off the persisted export; slug `neutral` and `../evil` refused naming the offender, nothing written; throwaways cleaned, worktree clean.

Cross-checks that held: `MAX_EXPORT_BYTES` identical in both files; the reserved-slug list matches the actual `system/tokens.*.css` + `tokens.source.json` set 1:1; every field `runPull()` returns lines up with what `portal.js` reads.

## Findings

1. **Medium — `portal/public/portal.js` (submit → `renderCandidates` → retry). FIXED in `7f43d0b`.**
   The swatch-retry path dropped the operator's typed `neutral` override: `renderCandidates(body, slug)` threaded only the slug, so a swatch click posted `{ slug, accent }` and the engine silently auto-detected the neutral ramp — a committed `system/tokens.<slug>.css` could carry a different neutral than the operator asked for, with nothing in the UI reporting the substitution. Exactly the silent-substitution class the honesty contract exists to prevent. Fix: the full submit `params` now thread through `renderCandidates`; the clicked swatch replaces only the accent. Proven in a headless browser run — the retry request URL carries `neutral=gray` and the written pack's Regenerate line prints `--neutral gray`.

2. **Medium (pre-existing, outside this diff) — `tooling/figma/figma-pull.mjs:407, 513-514`. DEFERRED.**
   `ramps[hue]` truthy-checks resolve `__proto__`/`constructor` through the prototype chain, after which `nearestRung`'s bare `reduce()` throws a raw TypeError instead of the friendly "no such ramp" message. Pre-existing engine behaviour, newly *reachable* through the drawer's free-text accent/neutral fields; ordinary typos still get the friendly error. Not fixed here because the engine is under a byte-identical-messages contract and the right home for a shape-check is `portal/lib/figma.mjs` — deferred as a follow-up note rather than expanding this PR.

3. **Low — `portal/public/portal.js` retry `catch`. FIXED in `7f43d0b`.**
   A faulting retry (e.g. server gone) updated `#figma-status` but left the stale swatches clickable. The catch now clears `#figma-report`, matching the submit path's no-stale-affordance behaviour.

4. **Low — cosmetic, DEFERRED**: server oversize message says "32 MB", client pre-check says "32.0 MB" (same constant, different formatting); Import-after-client-rejection masks the specific rejection reason with the generic "Drop an export first" message; `receiveExport`'s object check accepts a top-level JSON array (fails downstream with a less on-brand message). All polish-tier; none changes behaviour or honesty.

## What's good

The engineering is careful rather than plausible. `esc()` coverage is complete across every third-party string reaching innerHTML (ramp/style names, filenames, error messages, scale values); every swatch hex is regex-validated before touching a style attribute; the streaming `receiveExport` rejects oversize via `req.destroy()` → `pipeline` rejection with partial-file cleanup on every failure path (the historic "refuses a large file, badly" bug is genuinely closed, not papered over); the slug guard is airtight against traversal and generated-file clobbering; the `[hidden]` drawer fix works by specificity, not source-order luck; and the additive-only contract on the engine holds under field-by-field inspection — no removed logs, byte-identical messages, plusui byte-identical. The report's own claims all checked out against the code.

## Recommendation

**Approve with the fix applied** — finding 1 (the one substantive issue) and finding 3 are fixed on the branch in `7f43d0b` and re-proven live; findings 2 and 4 are pre-existing or polish and recorded above as deferred. Validation is fully green including both CI gates. Ready for the human merge.

*Solo-repo note: author and reviewer share one GitHub account, so this verdict is posted as a comment rather than a formal approval — the human makes the final merge call.*
