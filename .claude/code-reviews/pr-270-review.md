# PR #270 Review — feat(222): per-company instances re-shell onto the studio

**Verdict: APPROVE** ✅ (posted as a comment — GitHub refuses formal self-approval on a solo repo)

Fresh-context agentic review (piv-review-pr): the diff was reviewed by the code-reviewer agent
reading every changed file in full at the PR head (756ef71, 0 behind main, mergeState CLEAN), and
the project's gates were re-run independently in the PR worktree — not trusted from the PR body.

## Summary

The seam work is solid and provably non-invasive: `replay-driver.mjs`'s `source` option re-points
all seven constant-use sites (verified — `ARTIFACT_URL`/`TRACE_URL` survive only as declarations
and default fallbacks), `studio.mjs`'s external stand-down mirrors the `factory-intake.mjs:711`
precedent exactly with `opts` threaded through both `mountReplay` call paths, and build-checks
groups 1–24 are provably unedited (the only removed line in the file's diff is the "24 groups"
verdict string). The committed `build-northwind-restock` run checks out as genuinely real by
independent hand-parse: 5 places / 10 connections / 25 add-only ops / 8 real fence denials / 48
steps all phase-tagged — matching the report's claims, and `gen-replay` reproduces it
byte-identically. The retirement sweep is exceptionally clean: zero live imports, zero dangling
hrefs, zero orphaned `study-*` CSS; the two surviving mentions are the deviation-#8 retirement
records. All 10 documented deviations verified consistent with the implementation — none flagged.

**No Critical or High issues. 2 Medium + 1 Low, none blocking.**

## Issues

### Medium 1 — `system/replay-driver.mjs:113` — `DECLINED_NOTE` leaks `/factory` into a deployed instance

The declined-mount notice ends "…opening /factory without a link plays it from the start." It
renders verbatim (:861) whenever the driver mounts declined — reachable on a deployed instance,
since `studio.mjs:609-610` threads `declined` + `source: opts.replay` unconditionally and the
instance's in-band keep rail ships a working `?b=` share link. A real instance's visitor who
revisits their own share link is told to open `/factory`, which does not exist in the deploy dir.
This is the only public-route literal in user-facing prose across the whole mounted module graph
(grepped), and it's structurally invisible to `validateAssembly`, group 25's residue greps and the
journey's href-2xx check — none scan rendered prose for route mentions.

**Fix**: thread an optional `source.homeHref` (default `"/factory"`, keeping /factory's text
byte-identical) and have the instance pass its own — or drop the clause when `source` is set.

### Medium 2 — `tooling/instance-journey.mjs:223-228` — the zero-404 row can go green on a race

`waitForSelector('[data-compile-state="rendered"]')` resolves when `studio-compile.mjs`'s
`settle()` flips the attribute — which *starts* (doesn't await) the docs-chain fetches via
`docs?.refresh()`. Step [7] then reads `badResponses` with only one locator round-trip in between.
Loopback speed is why the `rm pack.json` mutation drill went red in practice, but the failure
direction the gap opens is the bad one: a genuinely missing artifact intermittently passing green.
This is the row the header calls the structural #160/asset-closure check.

**Fix**: before step [7], `await page.waitForResponse(r => r.url().endsWith("pack.json"))` (or
`waitForLoadState("networkidle")`).

### Low 3 — `agent-layer/build-instance.mjs:77-104` — `HEADERS` has no `/replay/*` cache block

The template enumerates per-directory cache rules for `/system/*`, `/scenarios/*`, `/traces/*`,
`/proto/*`, `/handoff/*`, `/assets/*` — but not `/replay/*`, the directory this PR is the first to
ship into a deploy dir. Harmless (the `/*` catch-all still carries security headers + noindex),
just inconsistent. One-line fix.

Two candidates were investigated and **rejected as pre-existing, not PR-introduced** (verified
against `origin/main`'s v1): the unescaped `slug` interpolation in `stampShell`'s pack href, and
`resolves()`'s lack of a path-containment check — both operate on operator-authored build-time
input, and the PR's own new `--replay` slug *is* regex-validated (the stricter pattern).

## Validation

| Gate | Result |
|---|---|
| CI: verify + visual | ✅ both green · mergeState CLEAN · 0 behind main |
| `node tooling/build-checks.mjs` | ✅ all 25 groups (group 25 mutations verified real, not vacuous) |
| `node tooling/validate-trace.mjs traces/build-northwind-restock.jsonl` | ✅ 48 steps · 4 phases · 0 artifacts (by-design) · curated |
| `node scenarios/validate.mjs` | ✅ |
| `node agent-layer/gen-replay.mjs` | ✅ 2 runs → 43 ops, byte-identical (clean tree after regen) |
| loc-summary + param-count `--check` | ✅ no drift |
| `node tooling/instance-journey.mjs chromium` (independent re-run) | ✅ 21/21 — fixture builds via real CLI, zero residue, bespoke replay settles under stamped pack, zero non-2xx |
| `node --check` on all touched .mjs | ✅ |

## What's done well

- The default-preserving `source` seam: byte-identical behavior with `source` absent, by construction.
- Groups 1–24 mechanically unedited — the strongest available proof the seam changed nothing on /factory.
- The honesty contract held under independent verification: the run artifacts are real, reproduce, and validate.
- The retirement is complete — no orphaned CSS (the PR-#261 trap), no dangling references.
- Group 25 and the journey both carry mutations that actually redden (performed live per the report).

## Recommendation

**Approve.** Nothing blocks the merge. The two Mediums are honest, narrow, and post-mergeable:
Medium 1 only bites a *deployed* instance visitor on the declined path (no real instance is
deployed by this PR), Medium 2 is gate flakiness in the safe-today direction. Suggested follow-up:
`piv-fix-review-findings` on this report — both fixes are small and neither churns a baseline.

A human now reviews the code + this review and merges.
