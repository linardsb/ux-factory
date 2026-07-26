# Implementation Report — public drop-to-re-skin (#130)

**Plan**: `.claude/plans/public-drop-to-reskin.md`
**Branch**: `feature/public-drop-reskin` (deliberately NOT `feature/v3-*`, so the visual gate blocks)
**Status**: COMPLETE

## Summary

A reader can drop their design system's JSON token export on home's beat 02 and the whole site
wears it — colour, spacing, radius, the type ramp and shadows — with the mapping report and WCAG
receipts on the page and the pack downloadable as `tokens.<slug>.css`. Nothing is uploaded; the
shipped site has no server.

Underneath, the mapping engine was extracted out of four Node files into one view-time-safe module,
`system/pack-import.mjs`, under a byte-parity gate. One engine, never a fork: the CLI, the portal
drawer and the browser now run the same contrast negotiation, so they cannot disagree about what a
design maps to. That extraction was the risk in this ticket and it landed first, as its own commit,
provably invisible.

## Tasks completed

**Phase 1–2 · the extraction** (commit `67b16bd`)
- export parsers moved (`rgbaToHex`, `entriesFromVariables`, `pluginShadow`, `leafEntry`,
  `entriesFromExport`) → `system/pack-import.mjs` (CREATE)
- mapping core moved (role table, scale families, `collectScales`/`fillScales`, `toRamps`/
  `deriveRamps`, `classifyRamps`/`pickRamps`, `negotiate`) → `system/pack-import.mjs` (UPDATE)
- contract + emitter moved (`cssValue`/`aliasPath`, `parseContract`, `emitPackCss`) (UPDATE)
- pack header builder moved; `Regenerate:` line became caller-supplied (UPDATE)
- `mapPack()` added; `runPull` re-expressed in terms of it (UPDATE)
- `tooling/figma/figma-pull.mjs`, `figma-read.mjs`, `agent-layer/gen-pack-css.mjs`,
  `gen-token-css.mjs` reduced to their disk/network/CLI halves (UPDATE)

**Phase 3 · the record and the apply path**
- `system/pack-imported.mjs` (CREATE) — record, per-entry validator, apply/clear, ground truth
- `system/pack-boot.js` (UPDATE) — sessionStorage-first branch, ahead of the localStorage read
- `system/spine.mjs` (UPDATE) — `isWearingDerived` → `isWearingVisitorPack`; hero stands down
- `system/dock.mjs` (UPDATE) — the fifth mode across `groundTruth` / `renderPacks` / `selectPack`
  (incl. its `:180` allowlist) / copy / `IMPORT_CHANGE_EVENT`
- `system/pack-derived.mjs` (UPDATE) — `syncFromRoot` yields to a worn import

**Phase 4 · the surface**
- `system/brand-import.mjs` (CREATE) — drop zone, pre-checks, pending state, report, refusal
  swatches, "Wear it", "Download"
- `index.html` (UPDATE) — drop-zone markup in `#beat-brand` + the module script tag
- `system/portfolio.css` (UPDATE) — drop zone, status, report, tables, swatches, disclosure
- `tooling/figma/fixtures/ambiguous-brand.json` (CREATE) — two brand candidates, so the refusal
  path is testable with no network and no real design

**Phase 5 · gates and docs**
- `docs/figma-runbook.md` (UPDATE) — §A3, the reader's path and what it is not
- `system/loc-summary.json`, `tooling/visual-regression/baselines/{index,approach}-{neutral,saulera}.png`
  (REGENERATED)

## Tests added

This repo has no suite, no linter, no type-checker (CLAUDE.md) — "done" means run the surface you
touched. Two harnesses were built in the scratchpad (not committed, they are gates not artifacts):

**Engine parity** (`parity.sh`) — 11 baseline artifacts captured *before* any code moved and
re-diffed after every extraction pass, on both the emitted `.css` and captured stdout:
3 committed fixtures · both `--map` fixtures (one resolving, one throwing) · the real `plusui`
plugin export. Result: **byte-identical throughout**, and the `plusui` run reproduces the committed
`system/tokens.plusui.css` byte for byte.

**Cross-engine functional** (`e2e.mjs`) — 30 checks in **Chromium and WebKit** (memory:
*cross-engine motion verify*): at-rest inertness, drop → report, the honesty statement, limits
leading, wear → re-skin, carry to `approach.html`, the dock row/attribution/checked state, switch
away and back, new-context no-op, the ambiguous refusal → swatches → completion, four honest
refusals (`.txt`, malformed JSON, colourless JSON, oversize), no horizontal overflow at 390px, no
uncaught page errors. Result: **30/30 in both engines**.

Plus: download vs CLI `:root` byte-diff, and a private-mode run with `sessionStorage` throwing.

## Validation results

| Gate | Result |
|---|---|
| `node tooling/drift-check.mjs` | ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ no drift (checked after `git add`) |
| Engine parity (11 artifacts, .css + stdout) | ✓ byte-identical |
| `tokens.plusui/verdant/contract/neutral.css` | ✓ no diff |
| Portal drawer (`/api/figma/pull`) | ✓ 64 tokens / 26 filled / 38 placed; `:root` byte-identical to the CLI |
| Browser download vs CLI | ✓ `:root` byte-identical; only the `Regenerate:` line differs, by design |
| Visual regression (Docker, Linux baselines) | ✓ 18/18 passed against regenerated baselines |
| Cross-engine functional | ✓ 30/30 in Chromium **and** WebKit |
| Throwaway packs/exports | ✓ none left in the tree |

## Deviations from the plan

1. **The parity corpus gained the real `plusui` plugin export.** The plan's corpus was three
   synthetic fixtures, whose `git diff --stat system/tokens.plusui.css` check is vacuous because
   nothing on this branch regenerates that pack. The real export (gitignored, copied in from the
   `wt-figma` worktree) is the only input that exercises 20+ ramps, all four scale families, real
   `rgba()` shadow strings and **two multi-mode collections** — the note path no fixture reaches.
   It reproduces the committed pack byte for byte, which is the strongest parity anchor available.

2. **The download emits from `mapPack`'s full `values`, not the record's vetted `tokens`.** The
   plan contradicted itself here (Task 10 decision 5 vs Task 16 step 10). AC #6 demands byte
   identity with the CLI, and anything the validator drops would break that. Vetting now governs
   only what is *applied to this page*; it is not a claim about the design. Verified by diff.

3. **The record's key allowlist is by FAMILY, and the value regex was re-measured.** The plan's
   `VALUE_OK` (`/^[a-zA-Z0-9 #%(),.+-]{1,120}$/`) rejects every font stack (`"Segoe UI"` — quotes)
   and the three `linear()` easings, so **every import** would have told the reader "N values your
   design offered could not be applied safely" about tokens the design never offered. Fixed two
   ways: keys are limited to the five families that actually import
   (`color|spacing|radius|type|shadow`), and `vetTokens` returns `skipped` (never imports, by
   design — silent) apart from `rejected` (offered but unsafe — named to the reader). The charset
   was re-measured across all five committed packs: longest legitimate value is 63 chars, so the
   regex is `/^[a-zA-Z0-9 #%(),.\/+-]{1,160}$/`, with `/` admitted for the modern
   `rgb(0 0 0 / 10%)` form a design's shadow colour may use. Verified: a real design yields 44 worn
   tokens and **zero** false rejections; a `;}`-bearing value is still rejected and named.

4. **`clearInlineTokens()` added** (not in the plan). An inline `:root` property outranks a
   `<style>` rule, and the hero's canned re-skin can still be mid-hold when a reader wears an
   import — masking their design with the demo brand. `clearRoot` only knows the derived record's
   keys, so the imported branch clears by family instead. Caught by the cross-engine run, which
   read `#2f7a4d` (the demo green) where the design's `#4f46e5` belonged.

5. **Private mode now applies the pack to the current page.** The dock re-reads the record to
   decide the pick; with `sessionStorage` throwing it read `null` and declined, so nothing went on
   stage at all. The beat now detects the failed write and applies directly, and the status says
   the pack will not follow the reader — the honest degradation the plan asked for.

6. **`git diff --stat system/tokens.verdant.css` is empty because the file was left alone.**
   Running `gen-pack-css.mjs --verdant` rewrites it with 19 added lines — but that is **pre-existing
   staleness on `origin/main`**, not this branch: the contract gained motion tokens, `font-mono` and
   `color-accent-wash` after that pack was last generated. Proved against a pristine `origin/main`
   checkout, where the same command produces the same 19 lines, and the extraction's output is
   byte-identical to pristine main's. Regenerating it is unrelated to #130, so it is left for a
   follow-up. **Worth a ticket.**

7. **Open question #1 answered: un-wearing KEEPS the record** (`unwearImported` removes the style
   only), matching `pack-derived.mjs:182-188` so the row stays on offer without re-dropping.
   **#2: a second drop replaces the first** — one record key, one worn thing at a time.
   **#3: the runtime group grew more than budgeted** — 45→48 files but 11,900→**13,700** lines
   (the plan estimated ~12,900). The claim on `approach.html` is generated, so nothing is
   dishonest; the baseline churn is simply larger.

8. **The plan's "shadowing beats displacing" simplification was implemented as written** — no
   `factory-pack` selector write, no #108 displacement machinery. Flagged here and in the PR body
   as an intentional deviation from the mock-up the owner clicked.

## Issues encountered

- **A parallel session is editing this shared working directory.** Mid-run, `index.html`,
  `derive.html`, `instance.html`, `roundtrip.html` and `trace.html` gained unrelated hero/beat copy
  rewrites (memory: *shared worktree, parallel sessions*). Two consequences, both handled:
  everything is staged **by explicit path**, and `index.html` was rebuilt as `HEAD` + my two hunks
  so their four copy hunks stay uncommitted in the working tree; and the first VR run had baked
  their `roundtrip.html` copy into `roundtrip-{neutral,saulera}.png`, so the baselines were reset
  and regenerated against a my-changes-only tree. **Their work is untouched and still unstaged.**
- **The `approach` baselines needed forcing.** `update:docker` skipped them although the page
  demonstrably renders the new `48 files / 13,700 lines`; `rm`-ing the two PNGs and re-running
  wrote them (memory: *VR update skips sub-perceptual*).
- **Port 4747 was already serving the `wt-figma` worktree's portal**, so the first drawer test
  silently exercised that checkout and wrote `tokens.fixt2.css` there. Cleaned up, and the portal
  was re-run on a free port to test *this* tree.
- Stack-frame line numbers in the CLI's refusal output move when code moves; the refusal
  **messages** are verbatim, which is what the contract covers. The parity gate excludes `at …`
  frames and diffs everything else.

## Not done, and why

Nothing in scope was skipped. Per the plan's non-goals, there is deliberately no URL/Figma-API
field, no `instance.html` drop zone, no fonts or components in the import, no imported pack in a
share link, no portal-drawer download, and no Web Worker.
