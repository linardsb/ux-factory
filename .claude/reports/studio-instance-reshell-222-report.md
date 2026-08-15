# Implementation Report — Per-company instances re-shell onto the studio (#222)

**Plan**: `.claude/plans/studio-instance-reshell-222.md`   **Branch**: `feature/instance-reshell-studio-222` (fresh worktree off `origin/main` at 6eaaa9b — the plan's own instruction, since the shared worktree held four parallel-session staged files)   **Status**: COMPLETE

## Summary

The private instance's `#beat-built` band is now the studio — the same modules `/factory` mounts,
configured never forked. `mountStudio(root, opts)` gained an external stand-down
(`data-studio-mount="external"`, factory-intake's idiom) and threads `opts.replay` to the replay
driver's new default-preserving `source` option, so the instance plays its **own recorded run**.
One real bespoke run was recorded for the demo scenario (`build-northwind-restock`), `build-instance.mjs`
went to v2 (`--replay` required, generated per-instance chrome config closing #160, `validateAssembly`
refusing any reference that doesn't resolve in the deploy dir), and `agentic-ui-study.html` +
`system/agentic-study.mjs` retired with their full blast radius. Two new gates: build-checks
group 25 (pure, with mutations) and `tooling/instance-journey.mjs` (the built deploy dir driven
×3 engines).

## Tasks completed

1. `source` option + seven re-pointed sites → `system/replay-driver.mjs` (UPDATE)
2. `opts` threading + external stand-down → `system/studio.mjs` (UPDATE)
3. The bespoke brief → `replay/briefs/build-northwind-restock.md` (CREATE, human-authored input)
4. REAL RUN (recorder-written, never edited): `traces/build-northwind-restock.{raw.,}jsonl` +
   `replay/build-northwind-restock.board.json` (CREATE) + `replay/build-northwind-restock.json`
   (gen-replay-written). 48 steps · 4 phases · 0 null-phase · 8 fence denials · 5 places ·
   10 connections · reproduce check ✓ · fieldwork artifact byte-identical. ~$1.02 total (dry + real).
5. The re-shell → `instance.html` (UPDATE: studio.css+catalog.css links, studio shell DOM in the
   band, keep rail in-band, study-twin CSS deleted, data-when seams re-derived, INSTANCE_CONFIG v2,
   deploy-safe body links)
6. Studio boot in, renderStudy out → `system/instance.mjs` (UPDATE)
7. v2 → `agent-layer/build-instance.mjs` (UPDATE: `--replay`, run copy, docs-chain copy, generated
   chrome config, `stampShell`'s sixth anchor, `validateAssembly` v2 + exported `stampShell`/`auditRefs`)
8. Retirement → `git rm agentic-ui-study.html system/agentic-study.mjs`; refs cleaned in
   factory/work/index.html, vt-verify (2 rows), scenarios/README, fieldwork rubric note,
   param-manifest scope, serve.mjs comment, 6 module comments, CLAUDE.md
9. build-checks group 25 → `tooling/build-checks.mjs` (UPDATE; verdict line 24→25)
10. `tooling/instance-journey.mjs` (CREATE) + `tooling/fixtures/harborlight/` (CREATE: brief + 2 fixtures)
11. Cascades: loc-summary + param-count regens (drift-clean, run AFTER staging per
    `loc-summary-counts-tracked-only`); VR baselines via `update:docker` (see Validation)
12. Docs: CLAUDE.md map rewrites (instance.mjs/instance.html/build-instance/replay-driver/
    catalog.css/proto-compositions/build-checks + new instance-journey entry + Commands line),
    this report, `ticket-44-shell-stamp-seams` memory true-up

## Tests added

- **build-checks group 25** ("instance stamp"): `stampShell` over the REAL shell — residue,
  body-text greps, v2 config shape, chrome/pack anchors; MUTATIONS: extra demo region still
  stripped, two missing-anchor throws each naming the anchor, `auditRefs` accept/refuse table.
  Red-proof performed live (a smuggled `{{unknowntoken}}` in the shell → group red, restored).
- **tooling/instance-journey.mjs**: builds the Harborlight fixture via the real CLI (wrangler
  stdout asserted — AC #7), serves the deploy dir in-file, then per engine: settled bespoke
  replay, stage count from the served board via the page's own config chain, stamped pack link,
  residue on served bytes (comments included; config block carved out, stated), every internal
  `<a>` 2xx, take-over, compile end to end, ZERO non-2xx. **21/21 × chromium/firefox/webkit.**
  Mutation drill performed: `rm pack.json` from the built dir → the zero-404 row red naming it.
  **PR #270 review fixes raised it to 25/25 × 3 engines**: the docs chain's lazy fetches awaited
  before the accounting is read (M2 — the `rm pack.json` drill now reds deterministically, re-performed),
  and a declined-path step — the keep rail's own `?b=` link revisited, DECLINED asserted, and the
  note proven to name no `/factory` route on a built instance (M1's running-page proof; the
  route clause is now `/factory`'s alone, its text byte-identical there, red-proof performed by
  mutating the deploy dir's driver copy). M1/M2/L3 all fixed — L3 is the `_headers` `/replay/*`
  cache block, asserted present in the built dir.

## Validation results

- `node --check` on all 12 touched .mjs — pass; `instance.mjs` node-import safe with the full studio graph.
- `node tooling/build-checks.mjs` — **all 25 groups pass** (13/16 unedited — the seam proof).
- `node agent-layer/gen-replay.mjs` ✓ (2 runs → 43 ops; reproduce check re-runs in CI's drift check).
- `node tooling/validate-trace.mjs traces/build-northwind-restock.jsonl` ✓ · `node scenarios/validate.mjs` ✓.
- `tooling/studio-journey.mjs chromium` — **477 passed, 0 failed, zero edits** (factory behavior byte-identical).
- `tooling/instance-journey.mjs all` — green ×3 engines.
- `tooling/vt-verify.mjs` — green ×3 engines with the study rows removed.
- Browser smoke of the demo `/instance.html`: studio settles the northwind run (5 places), 3 tabs,
  method cards, keep rail, ethics gate, wizard, trace player, take-over → provenance "visitor",
  zero console errors, zero non-2xx.
- Fixture build + both plan mutations (`--replay nope` throws naming the path; a smuggled
  `/approach` link turns validateAssembly red naming it).
- VR baselines regenerated via `update:docker` from the clean committed worktree under /Users
  (see the baselines commit for the churn set — factory/work/approach expected).

## Deviations from the plan

1. **The peak WCAG-receipts machinery died with the band** (`renderPeakDerivation`, `seedReceipts`,
   the `derive`/`buildReceipts` imports, the wizard's `onAnswers` callback, the `beat-built` spine
   registration). The plan rebuilt the band's interior but did not name these; keeping them would
   have left ~70 lines wired to deleted DOM. Nothing measured is lost: beat 01's wizard narrative
   still renders the engine's checks table live, and `data-peak` had no consumer (verified by grep).
2. **Fixture brief path**: `tooling/fixtures/harborlight/brief.md`, not the plan's
   `tooling/fixtures/instance-brief.md` — `parseCompanyBrief` pins `head.slug` to the brief's
   parent DIRECTORY name, and `genCompanyPackage` requires a sibling `fixtures/` dir per screen
   collection (two small fixture JSONs added).
3. **`validateAssembly`'s stray-hidden check gained a stated exemption** for `[data-studio-notice]`
   — the studio's shared-link notice is hidden at rest by design (#210) and is not a stamp region.
   Group 25 carries the same exemption.
4. **The journey's name-greps carve out the INSTANCE_CONFIG `<script>` block** (stated in-file):
   the config names the copied run's files by slug, and the fixture deliberately reuses the
   committed demo run (copy-not-run — a second paid run per fixture build would buy nothing).
   Comments stay IN scope, which is what caught deviation 5's sibling: one of my own band comments
   said "labelled-fictional" and was reworded (the #44 view-source rule, now gate-enforced).
5. **Fixture pack is verdant's, not the plan's saulera**: `tokens.saulera.css` `@import`s
   `../fonts/fonts.css`, which this repo does not ship — a pre-existing saulera quirk (404s on the
   public site too when saulera is worn), surfaced by the journey's zero-404 row. A real company
   pack is derived and imports nothing, which verdant's stands in for. Possible follow-up: ship or
   drop the saulera fonts import (not this ticket's).
6. **The journey drives a COMPILE** (not in the plan's assert list): it is what puts the lazily
   fetched docs chain (pack.json/vocabulary.json) inside the zero-404 accounting — without it the
   plan's own pack.json mutation drill could never go red — and it exercises the built instance's
   compile beat end to end.
7. **Deploy-safe body links**: the close-card CTA became `mailto:`, and the verify row-list became
   one GitHub row (https). Implied by AC #4/the chrome-links scope but not enumerated as body
   edits; public-site routes now may exist only inside `data-when="demo"` regions (recorded in the
   shell's head comment).
8. **Two historical mentions of the retired surface remain** (index.html comment,
   instance.mjs header) — retirement records naming #222, not live references; the plan's
   "only agentic-renderer/action-bus/agentic.html hits" grep target was read as "no live references".
9. **work.html Exhibit renumber** also rewrote "Three demos/exhibits" → "Two" and `grid-3` → `grid-2`
   (the count claims and layout had to follow the removal).
10. **CLAUDE.md's build-checks entry said "23 groups"** — already stale before this ticket (group 24
   existed); updated to 25 with a group-25 clause.

## Issues encountered

- The recorded run has 8 fence denials, all early plan-phase orientation attempts (Bash/Glob/Read
  outside the fence) — kept as honest replay content (fence discipline is the surface's subject);
  every spike-1 bar met, so no re-run was spent.
- The keep-rail analytics routes firing on `/instance` are accepted metric noise (plan decision 6):
  deep-link-only page, and a deployed instance's beacon no-ops off the production host.
- `--public-origin` still throws its designed not-implemented error — untouched, per Out of Scope.

## Ready for the next step

All tasks complete, all gates green. Next: `piv-create-pr` (body must carry `Closes #222` and cite
#160 — the issue is already closed, so prose, not a trailer), then `piv-review-pr`.
