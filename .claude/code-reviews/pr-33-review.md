# PR #33 Review — Visual-regression gate (ticket #9, gate 3/3)

**Branch**: `feature/visual-regression-gate` → `main` · **State**: OPEN · +819 / −4 · 25 files
**Recommendation**: ✅ **Approve** — no critical/high/medium issues; CI green on the PR; existing gates unaffected.

---

## Summary

Adds a dependency-isolated Playwright project (`tooling/visual-regression/`) that screenshots the 8 shipped
pages (6 IA + 2 data-connected proto) under the neutral pack **and** the saulera client pack — the pack applied
by route-swapping the single `tokens.neutral.css` link, i.e. the "re-skin from one line of CSS" claim executed —
and pixel-diffs each capture against a committed Linux-rendered PNG baseline. A `visual` job is added to
`verify.yml`, running local and CI inside the same pinned `mcr.microsoft.com/playwright:v1.61.1-jammy` image.

Well-scoped, honest, and matches the repo's isolate-the-dependency pattern (`tooling/style-dictionary/`). The
implementation report's 7 documented deviations are all intentional decisions (scope→8 pages was the plan's
flagged `★` user decision); deviations 2–5 are sound engineering that make the novel proto capture deterministic.

## Validation

| Check | Result |
|-------|--------|
| **CI `verify` job** (drift + lint) | ✅ pass (12s) — untouched, still green |
| **CI `visual` job** (this PR, ubuntu-latest, pinned image) | ✅ **pass (39s)** — byte-stability on the runner now empirically confirmed |
| `node --check` × 3 sources | ✅ serve / config / spec all parse |
| `node tooling/drift-check.mjs` (local) | ✅ exit 0 — existing gate unaffected |
| `node tooling/token-lint.mjs` (local) | ✅ 47 tokens · 0 undeclared · 0 orphan · DTCG valid |

**The one risk the PR body flagged as open — "a green CI run is pending" — is now closed.** The `visual` job
ran green on GitHub's `ubuntu-latest` in the identical container, confirming the rendering matches the committed
baselines byte-for-byte within the 100px cushion (which the accent positive-control proved is ~4 orders below a
real regression).

## Fresh-eyes verification of the mechanisms (not just the author's claims)

- **Re-skin route-swap** (`visual.spec.mjs:45`): the per-test `**/system/tokens.neutral.css` route is registered
  *after* the `beforeEach` catch-all, so last-registered-first ordering makes it win for that URL and everything
  else falls through to the hermetic gate. `route.fulfill({ path: packPath })` serves the saulera file in place.
  Logic is correct and the comment explains it faithfully.
- **Proto settle is genuinely self-guarding** (verified against `proto/verdant.html:70–86`): `dataset.source`
  is set *only after* `await Promise.all([...])` resolves. A real load failure hits the `catch`, never sets it,
  and `waitForSelector('#source[data-source="static"]')` times out → the test **fails loudly** rather than baking
  a bad baseline. Selectors `.vd-plant-card` / `.fw-lane` exist and render from fixture data. Claim holds.
- **Hermetic block** (`:8787` abort → static fallback): aborting the mock Worker forces every proto collection to
  `source: "static"`, which is exactly what `#source[data-source="static"]` waits on. Deterministic in any env.
- **Honesty note is accurate**: `system/tokens.saulera.css:19` does `@import url("../fonts/fonts.css")`; the
  `fonts/` dir is absent, so it 404s and named faces fall back deterministically. The PR discloses this rather
  than hiding it — the saulera baselines prove colour/radius/spacing/type-scale, not typography. Correct call.
- **Least privilege**: `visual` job carries `permissions: contents: read`, matching the pattern PR #31 set on
  `verify`. Traversal guard in `serve.mjs:20–22` mirrors `portal/server.mjs`. `.gitignore` correctly ignores run
  output but **not** `baselines/` (the baselines are the gate's committed contract — right per "deploy = commit
  the artifacts").

## Issues

### Critical / High / Medium
None.

### Low (advisory — non-blocking)

1. **CLAUDE.md architecture-map drift** — the map still reads *"`tooling/style-dictionary/` the one
   dependency-carrying tool"*, but this PR adds a second isolated dependency-carrying tool, and
   `tooling/visual-regression/` (a whole CI gate) doesn't appear in the map at all. The repo treats the map as
   "inspectable proof for technical readers," and there's a `rules-check-drift` skill for exactly this. Suggest a
   one-line map entry + softening "the one." Not required to merge; a quick follow-up is fine. (The ground-rule
   *"the portal's sole dependency is the Agent SDK"* stays literally true — visual-regression is separate tooling.)

2. **Dead `viewport: { height: 800 }`** — `playwright.config.mjs:14` sets a top-level viewport, but the
   `chromium` project spreads `devices['Desktop Chrome']` (1280×720), which overrides it at project level; and
   it's moot regardless because `visual.spec.mjs` sets the viewport explicitly before every capture. Harmless
   cosmetic dead value; mention only for tidiness.

## What's good

- **Honest to the bone** — CI-pending status, saulera-font fallback, and `Part of #9` (not `Closes`) all
  disclosed in the PR body; deviations fully documented in the report. This is the honesty contract lived, not
  claimed.
- **Determinism is engineered, not hoped for** — single-frame integer-viewport capture, `text-wrap` + `min-height`
  normalizations, `dvh`-cap pinning for the verdant phone screen, pinned image ↔ pinned version handshake. The
  two-run stability gate + positive control are the right validation shape for a screenshot gate.
- **Pattern-faithful** — dependency isolation mirrors `style-dictionary/`; zero-dep `serve.mjs` mirrors
  `portal/server.mjs`; least-privilege perms mirror PR #31. Nothing in `system/` product code, tokens, specs, or
  fixtures changed.

## Note on process

The `code-reviewer` agent (Phase 4) was **intentionally not dispatched**: it is Python/FastAPI/MyPy-tuned and
would mis-apply its rubric (pytest/ruff/SQLAlchemy patterns) to a JS/Playwright/YAML diff, adding noise. The deep
pass was done directly from a clean context (this review did not write the code) and every claim was verified
against the source and against a green CI run.

## Recommendation

**Approve.** No blocking issues; the sole open risk (CI) resolved green on the PR. The two Lows are advisory —
address the CLAUDE.md map drift in this PR or a fast follow-up, at the author's discretion. A human makes the
final merge call.
