# Implementation Report — The component catalog at /components (#215)

**Plan**: `.claude/plans/component-catalog-appica-docs-215.md`   **Branch**: `feature/component-catalog-215`   **Status**: COMPLETE

## Summary

Built mount 1 of "Docs, two mounts of one source": `components.html` + `system/catalog.mjs` render
every vocabulary component from `prepareHandoff(pack, vocab, graph)` — a live playground on the
site's own vocabulary-validated renderer, API/token tables projected from the artifacts, code tabs
serialized from the live render, copy-as-Markdown fetching the committed spec byte-for-byte, and
token values resolved live via getComputedStyle. Chrome joined in the same PR (footer site index,
static ⌘K commands, VR page set, param-manifest, loc-summary, CLAUDE.md), gated by build-checks
group 21 and a new cross-engine driver, with the 18-PNG baseline churn regenerated and verified
exact. `renderComponentDocs` is exported as the #218 seam.

## Tasks completed

- Task 0 branch → `feature/component-catalog-215` off `origin/main` (45b9ab5)
- Task 1 export `renderMarkdown` → `system/handoff-viewer.mjs` (UPDATE, comment extended)
- Tasks 2–3 pure layer + renderer + mount → `system/catalog.mjs` (CREATE, ~500 lines)
- Task 4 the page → `components.html` (CREATE)
- Task 5 footer site index → `system/client.neutral.config.js` (UPDATE: "Components" page link;
  "Components" → "Component styles" rename in The system column)
- Task 6 ⌘K → `system/palette.mjs` (UPDATE: pages entry, `CATALOG_COMPONENTS` static export, the
  exhibits-idiom per-component commands; header count 10 → 11)
- Task 7 group 21 + group 7 join → `tooling/build-checks.mjs` (UPDATE: MODULES + argued
  `.outerHTML`-read exception, header roster, `all 21 groups pass`)
- Task 8 VR entry → `tooling/visual-regression/visual.spec.mjs` (UPDATE, 22 tests listed)
- Task 9 journey driver → `tooling/catalog-journey.mjs` (CREATE, 28 assertions/engine, incl. the
  stale-serve byte-match guard)
- Task 10 → `system/param-manifest.json` (4 `/components` entries, scope 10 → 11) +
  `system/param-count.json` regen (119 controls)
- Task 11 → `system/loc-summary.json` regen (staged-first — the generator counts tracked content
  only) + CLAUDE.md map entries (catalog.mjs block, components.html line) and count true-ups
- Task 12 baselines → clean detached worktree `/Users/Berzins/vr-215` at 4ffd8d8,
  `npm run update:docker`, 22/22 in-container, exactly 16 modified + 2 new PNGs, 4 proto PNGs
  untouched, copied back, worktree removed
- Task 13 → this report; PR is the next step (piv-create-pr; body carries `Closes #215`)

Commits: `4ffd8d8` (feature + gates + cascades), `fd9a878` (baselines + the pack-swap fix below).

## Tests added

- **build-checks group 21** (CI): pack↔vocab set identity · palette pin · `controlFor` over all 35
  real props with hasOwn asserted both ways + partial/no-bounds synthetics · 3/7 wrapper histogram
  tripwire · `WRAPPER_ATTRS` triple-pinned with the `type:"type"` mutation · `reactSnippet`
  projection/escaping/boolean cases · spec file existence ×10.
- **tooling/catalog-journey.mjs** (operator-run): 28 assertions × chromium/firefox/webkit — count
  from the fetched artifact, deep link cold + reload (scroll-settled), bounds from the artifact +
  attribute absence, HTML-tab re-serialization identity before/after a prop change, clipboard-stub
  byte-equality to `system/specs/stat-tile.md`, the held-route ⌘K race (commands present
  pre-render, page still reaches ready after release), 3/7 tab gating counted from the fetched pack
  + the paste-and-render shadow-root proof, refusal-as-content with the stage intact, pointer vs
  keyboard bus readout, zero console/page errors per run. **All 84 green** on the final tree.
- **Mutation drill (performed and reverted, per the plan's completion checklist)**:
  `WRAPPER_ATTRS` `type:"action"` → `"type"` ⇒ group 21 red with 2 failures naming the drift;
  `CATALOG_COMPONENTS` `"stat-tile"` → `"stat-tilex"` ⇒ red naming both sides. Reverted; 21/21.

## Validation results

- L1: `system/catalog.mjs` + `system/palette.mjs` import clean under Node — pass
- L2: `node tooling/build-checks.mjs` → **all 21 groups pass**; SDK-free invariant re-proven with
  `portal/node_modules` moved aside → still 21/21; `node tooling/drift-check.mjs` → all sections
  green (loc, param, handoff, replay …)
- L3: `catalog-journey all` → 28/28 ×3 engines; `build-journey all` (regression guard) →
  **157/157 ×3 engines**
- L4 (headless equivalents of the manual list): saulera under the dock re-resolves token cells both
  directions; ⌘K from /work lands focused on the target section; copy compared byte-equal;
  reload at a hash survives
- L5: `update:docker` in the clean worktree → 22/22; churn verified exactly 18 (16 chrome + 2 new,
  protos untouched)

## Deviations from the plan

1. **`portfolio.js` included in components.html's scripts** — the plan's script list omitted it,
   but build.html's real order (which the plan says to mirror) includes it, and it carries the
   skip link + back-to-top every chrome-bearing page has. Left out it would be the a11y odd-one-out.
2. **Group 7's `.outerHTML` ban needed a real exception, not just prose** — the sink check is a
   substring match, so catalog.mjs's legal serialization reads would have failed it. Added a
   file-scoped exception that swaps the substring check for the sharper assertion (no
   `.outerHTML =` assignment form), with the reasoning in a comment.
3. **Token swatch is an SVG `rect fill` attribute** — catalog.mjs joins group 7's zero-inline-style
   MODULES, so the swatch cannot be a style write; an SVG presentation attribute isn't one.
4. **Cleared inputs OMIT the prop instead of sending `""`** — an empty required text field would
   otherwise validate (a `""` string passes the type check) and the refusal path would be
   unreachable. Omitting lets the validator refuse in its own words — nothing invented either way.
5. **Journey case 8 uses stat-tile's required `unit` (text), not "stat-tile's number input"** — the
   plan's own no-invented-bounds rule makes stat-tile.value a *range*, which cannot be cleared;
   the artifact has no unbounded number. Same claim (refusal names the path, stage intact), real
   subject.
6. **Journey case 3's "numeric prop with NO bounds" has no real subject in today's artifact** — the
   driver searches the fetched artifact, states the absence out loud, and asserts attribute-absence
   on a boundless text prop instead; group 21 carries the synthetic no-bounds + partial-bounds cases.
7. **`watchPackSwap` fixed twice post-plan (commit fd9a878)** — the edge-case check caught (a) the
   first `link[href^="/system/tokens."]` is the CONTRACT sheet (dock.mjs:72's recorded trap), and
   (b) tokens.saulera.css's @import of a missing fonts file makes the sheet's settling report as
   `error` while still applying, so the refresh listens for load AND error — the dock's own pattern.
8. **CLAUDE.md build-checks count "19 groups" → "21"** — it was already stale at 19 (group 20
   predates this ticket); left alone it would have been doubly false.
9. **Shared-worktree incident, handled**: the parallel #253 session had *staged* its three studio
   files into the shared index; they were unstaged (`git restore --staged`) before committing, and
   both commits verified to contain only this ticket's paths. Their working-tree edits are intact.
10. **Commits landed during implement** (4ffd8d8, fd9a878) — Task 12's worktree regen requires a
    commit to check out; the plan sequences it this way explicitly.

## Issues encountered

- Port 4757 was held by another session's server (stale-serve memory) — all local runs used
  `PORT=4759`/`BASE` overrides, and the new journey driver now refuses to run unless the served
  `catalog.mjs` byte-matches the working tree, so this trap is structural for the next operator.
- The faint hero in a hand screenshot was entrance animation mid-run, not a defect — the committed
  baseline (animations disabled) renders it fully; verified by cropping the actual PNG.

## Ready for the next step

- All tasks complete, all validations pass, mutation drill recorded, 18-PNG churn exact.
- Next: `piv-create-pr` (body must carry `Closes #215`; this report + the plan are already
  committed on the branch), then `piv-review-pr`.
