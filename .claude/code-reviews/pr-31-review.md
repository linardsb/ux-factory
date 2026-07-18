# PR #31 Review — feat: CI verification gates — drift-check + token lint (Part of #9)

**Verdict: APPROVE** — two thin orchestrator scripts + one workflow, purely additive; all six reused exports verified, both gates green first-hand, CI green on the PR; no Critical/High/Medium findings.

_Reviewed with fresh eyes (piv-review-pr + code-reviewer agent). This is the author's own PR in a solo repo, so GitHub blocks a formal `--approve`; the verdict is posted as a review comment instead._

## Summary

Turns ticket #9's "drift-proof design system" claim into a running gate — two zero-dep Node ESM scripts + one GitHub Actions workflow, no product/generator/token/spec/fixture touched:

1. `tooling/drift-check.mjs` — one in-process gate: `syntax · token-css · handoff · scenarios · traces`. Reuses the exported functions (`genTokenCss({check})`, `genHandoff`, `genVocabulary`, `validateScenarios`, `validateTrace`) — nothing re-implemented; `git` + `node --check` are the only child processes (the two CLAUDE.md-sanctioned no-importable-form exceptions). Uses `git status --porcelain -- handoff/` (not `git diff`) so a *new* untracked generated file is caught too.
2. `tooling/token-lint.mjs` — three contract checks: **undeclared** (`components.css` strict), **orphan** (full shipped/proto consumer set, packs excluded by design), **DTCG-valid** (reuses `loadSource()`, no schema library).
3. `.github/workflows/verify.yml` — both gates on push→`main` + every PR, Node 20 pinned, after `npm ci` of Style Dictionary (required — `genHandoff()` child-process-invokes SD).

Scope is correct: this is **Part of #9, not `Closes #9`** — the visual-regression (Playwright) gate is explicitly deferred to a follow-up. The two committed docs (`.claude/plans/…`, `.claude/reports/…`) match repo convention and don't overclaim.

## Validation (run first-hand, not trusted from the report)

| Check | Command | Result |
|-------|---------|--------|
| CI | `gh pr checks 31` | ✅ `verify` **pass** (pull_request trigger, 14s) — workflow YAML valid, both gates green in a clean runner |
| Syntax | `node --check` on both new scripts | ✅ pass |
| Token lint | `node tooling/token-lint.mjs` | ✅ exit 0 — `47 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| Drift check | `node tooling/drift-check.mjs` | ✅ exit 0 — `syntax · token-css · handoff · scenarios · traces`; `git status --porcelain` clean after |
| Reuse | grep exports of all 5 imported modules | ✅ `loadSource`, `genTokenCss({check})→{drifted:[]}` (writes nothing in check mode), `genHandoff`, `genVocabulary`, `validateScenarios`, `validateTrace(file)` all exist with matching signatures |
| Porcelain scope | drift-check stdout | ✅ SD writes its targets INTO `handoff/verdant/tokens/{css,ios,android}` — covered by the scoped porcelain path (no gap) |

The two failure modes the AC requires and the two drift mechanisms are demonstrated in the PR body (each reverted, tree stays green); the report's Phase-4 recipe correction is a **documented deviation** (intentional — no script changed), not a finding.

## Issues

### Critical / High / Medium

None found. Node version pin (v20.20.2 local == CI `node-version: 20`), determinism (verified byte-identical on Linux during planning), and the drift-detection logic all hold.

### Low (none blocking)

**L1 — `verify.yml` sets no `permissions:` block** — `.github/workflows/verify.yml`

The job only checks out code and runs local scripts (never calls the GitHub API), yet `GITHUB_TOKEN` gets the repo's default permission set. Least-privilege hardening — add under `jobs.verify`:
```yaml
permissions:
  contents: read
```
Worth doing before merge if you want tidy; safe as a fast-follow.

**L2 — `checkSyntax()` discards `node --check`'s stderr** — `tooling/drift-check.mjs:30-31`

The bare `catch` throws a file-named error but drops the piped stderr that pinpoints the *line/column*, so a red gate names the file but not the location. One-line DX win:
```js
} catch (e) {
  throw new Error(`syntax error in ${file} (node --check failed):\n${e.stderr}`);
}
```

**L3 — handoff orphan-file coverage gap (root cause out of scope)** — `tooling/drift-check.mjs:48-59` via `agent-layer/gen-handoff.mjs`

`genHandoff()`'s per-spec loops add/overwrite but never delete a `handoff/verdant/{contracts,wc}/<x>` whose source spec was removed. `pack.json`/`vocabulary.json` are fully rewritten (so a removal *is* caught there), but a stale already-committed sidecar file would stay byte-identical to HEAD forever → porcelain clean. Narrow precondition (a prior commit that forgot the cleanup); the obvious fix (`rm -rf handoff/verdant` before regen) would wrongly delete the deliberately-unwritten `figma-parity.json` — so this is an acknowledged limitation, not a quick fix. Not blocking.

**L4 — token-lint regexes ignore CSS comments** — `tooling/token-lint.mjs:17-20, 23-31`

`declaredTokens()`/`varsIn()` scan raw text, so a `var(--x)` inside a `/* … */` comment in the hand-written `components.css` would count as a live reference and mask a genuine orphan. Zero such comments in the repo today — purely latent. Handles `var(--x, var(--y))` fallbacks correctly (global regex catches both). No fix needed now.

## What's done well

- **Reuse-not-reimplement is real** — all six generator/validator functions are imported and called; only `git` and `node --check` shell out (array-args `execFileSync`, no shell). Matches CLAUDE.md verbatim.
- **`git status --porcelain` over `git diff --exit-code`** for handoff is the right call and correctly reasoned (catches newly-emitted untracked files), scoped to `handoff/` (the only tree these generators write).
- **`git ls-files "*.mjs"`** pathspec is passed as a literal argv element (no shell globbing) and correctly matches git's slash-free basename-anywhere semantics across nested dirs.
- Governing-doc headers, `pathToFileURL` guard, single catch-all → `process.exit(1)` idiom, zero new deps — all mirror the existing generator scripts.
- **Scope discipline**: `Part of #9` not `Closes #9`; company-projection chain (`build.mjs`) correctly excluded and stated in the header; orphan consumer set locked with the two edge tokens (`--shadow-lg` via proto, `--color-white` via contract self-ref) documented in the script.
- The gate is itself the portfolio evidence — the repo *proves* it can't silently drift, and all four failure modes were demonstrated live in the PR body.

## Recommendation

**Approve — ship as-is.** No Critical/High/Medium issues; both gates green first-hand and in CI. The four Lows are hardening/DX/latent notes; L1 (`permissions: contents: read`) is the only one worth a fast-follow if you want it tidy, and even that isn't blocking. A human now reviews the code + this review and merges.

---
*Review: full read-through of both new scripts + the workflow + cross-check against all 5 reused modules; `node --check` + both gates run first-hand (green, tree clean); CI status confirmed green on the PR. code-reviewer agent dispatched for the deep pass — findings converged (0 Critical / 0 High / 0 Medium / 4 Low).*
