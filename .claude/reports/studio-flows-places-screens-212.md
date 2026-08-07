# Implementation Report — Studio flows: places become screens, connections become navigation (#212)

**Plan**: `.claude/plans/studio-flows-places-screens-212.md`   **Branch**: `feat/212-studio-flows`   **Status**: COMPLETE

## Summary

The compile beat now compiles the board into a connected multi-screen flow: `pattern-rules.mjs`
gained `screensFor` (rules S1–S4 — the five patterns ARE the screen types; navigation counted from
`connections` and nothing else), a new `system/studio-flow.mjs` renders each place's screen and
wires real, announced, keyboard-operable canvas navigation, and the exporter emits one `<section>`
per screen with fragment-only anchors and a CSS-only `:has()` one-screen-at-a-time presentation —
the export's no-script claim survives, and it still opens cold from `file://` with zero network.
Inherited finding L3 (PR #235) is closed structurally: the extra/surplus swap branches are deleted,
screens are 1:1 with wrappers by construction, and a count mismatch refuses loudly via a tripwire.

## Tasks completed

- screensFor + S1–S4 + hoisted `targetOf`/`labelOf` + `isHubShaped` → `system/pattern-rules.mjs` (UPDATE)
- renderScreen + wireFlow (no-bus decision recorded) → `system/studio-flow.mjs` (CREATE)
- per-screen compileSteps/applySwap, L3 branches deleted, tripwire, stash/revert simplified → `system/studio-compile.mjs` (UPDATE)
- pan-vs-click seam: a press on a real control never starts a pan → `system/studio-canvas.mjs` (UPDATE — see Deviations)
- `.stf-*` chrome + reduced-motion off-ramp names → `system/studio.css` (UPDATE)
- flow-shaped `exportHtml` (sections, fragment nav, has-hides rule, placement machinery retired, provenance rewritten, `EMPTY_SCREEN` exported) → `system/studio-export.mjs` (UPDATE)
- per-screen serialization on the export click, `EXPORT_COPY` flow wording, arrangement out of the export path → `system/studio-keep.mjs` (UPDATE)
- honest copy swap (dfn preserved, no new data-term) → `factory.html` (UPDATE)
- group 19 "flow" + groups 6/7/15/17 reshaped → `tooling/build-checks.mjs` (UPDATE)
- flow pass + compilePass/take-over/keepPass/#237/shape-stream reshaping → `tooling/studio-journey.mjs` (UPDATE)
- `.stf-go` manifest entry → `system/param-manifest.json` + regen `system/param-count.json` (24→25, 102→103)
- regen `system/loc-summary.json` (runtime 72→73 files, ~25.8k→~25.9k)
- `studio-flow.mjs` map entry + 19-groups build-checks line → `CLAUDE.md`
- baselines: factory ×2 + approach ×2 regenerated in Docker from a clean detached worktree (same PR)

## Tests added

The gates are the tests (no suite, per CLAUDE.md):

- **build-checks group 19 "flow"** (new): the REAL committed replay board (4 places → 4 screens,
  entry type from `patternFor`, 7 nav ≡ 7 connections, BFS reachability, the 1-dashboard + 3-queue
  histogram pinned as a tripwire); a flow fixture per in-library screen type via the BOARD_FOR rule;
  rules S1–S4 each proven to fire by their reason sentences (S2 on a deliberate non-entry hub);
  nav-from-connections-only (cut one → exactly its entry disappears and the entry strands);
  feed truncation stated by `streamNote` identity + `MAX_AFFORDANCES === SLOT_MAX` asserted;
  empty board null at every layer; every screen validated against the real vocabulary; two
  mutations (tampered export fails href resolution; re-typed screen fails the histogram);
  totality over 9 junk boards × 6 junk answer sets.
- **groups 15/17/6/7 updated**: 15 asserts screens = places per fixture, per-screen composition
  alignment, entry-screen identity with the top-level result, screens-null-on-junk; 17's
  placement/caps/omitted cases retired, flow-structure cases added (N sections, resolving
  fragments, has-hides rule, no dead nav, S4 sentence); 6's hostile export fixtures moved to the
  screens shape; 7's roster gains `studio-flow.mjs`.
- **studio-journey flow pass** (new): one screen per place, one nav button per connection; pointer
  walk p1→p2→p3→p4 with focus on each target heading and EXACTLY ONE fixed counted announcement per
  navigation; keyboard leg (Tab from grab handle, Enter) on a fresh compile; byte-identical revert
  after navigating; reduced motion same end state. Reshaped: compilePass + take-over pass (slot →
  `.stf-screen` → `ds-*`), keepPass §2 (sections/anchors/resolution instead of cells/coordinates),
  #237 retry, and the shape:stream section now proves the M2 divergence GONE (wrapper count fixed,
  truncation on stage, link carries the arrangement).

## Validation results

- `node tooling/build-checks.mjs` — **all 19 groups pass**. Mutation spot-check performed: re-typing
  rule S3 to `feed` turned `flow` red on the pinned histogram; reverted, green again.
- `node tooling/drift-check.mjs` — green (loc-summary, param-count, handoff, all 12 checks).
- `node tooling/token-lint.mjs` — green (0 undeclared, 0 orphan).
- `node tooling/studio-journey.mjs` — **chromium 265/265 · firefox 265/265 · webkit 265/265**, zero
  page/console errors.
- `node tooling/vt-verify.mjs` — unchanged-green on all three engines (no edits needed, as the plan
  assumed: the beat stays a crossfade, navigation opens no view transitions).
- **Cold `file://` open** (scripted with Playwright, per engine): the real downloaded export opens
  with zero network requests on chromium, firefox and webkit; 4 screens; clicked end to end
  s1→s2→s3→s4; all three engines support `:has()` and showed one screen at a time (the stacked
  fallback branch is covered by the has-hides direction + group 17's rule assertion).
- Node-import safety: `pattern-rules`, `studio-flow`, `studio-compile`, `studio-export`,
  `studio-keep` all import clean under Node.
- Baselines: factory ×2 + approach ×2 regenerated via `npm run update:docker` from a clean detached
  worktree under `/Users`, committed in this PR.

## Deviations from the plan

1. **`system/studio-canvas.mjs` gained a 1-condition fix the plan did not list** (its files-touched
   set said studio.mjs/studio-canvas need zero changes): the canvas pan's `pointerdown` captured the
   pointer for ANY left press inside the scroller, which retargets the pointerup and silently
   swallows the `click` of any control on the stage. The verbs' body-drag already yields to
   interactive elements *specifically so the control can work* — but the press then bubbled to the
   pan, which ate it. Latent for interactive components on the harness's stage; #212's nav buttons
   made it reachable on /factory, and the journey's flow pass caught it (pointer navigation
   timed out; focus landed, click never fired). Fix: the pan bails on
   `button, a, input, select, textarea` targets — the mirror image of the verbs' rule.
2. **`renderScreen` takes `{ vocab, bus }`, not `{ vocab, bus, index, total }`**: nothing consumed
   index/total (the announcement's "screen k of N" is wireFlow's, which has `screens` whole), so the
   unused options were dropped.
3. **`compose()` runs in `compileSteps`, not in `renderScreen`**: the plan named both call sites;
   one was chosen so the pure layer carries the per-screen compositions (group 15/19 assert them
   under Node) and `studio-flow.mjs` only renders. Its imports are therefore `renderComposition` +
   `EMPTY_SCREEN`, not `compose`.
4. **`EMPTY_SCREEN` lives in `studio-export.mjs`** and is imported by `studio-flow.mjs`: the S4
   sentence appears on the canvas AND in the exported file, and one constant keeps the two surfaces
   from drifting (the `VOCAB_UNAVAILABLE` precedent).
5. **`components.css` untouched** — per the plan's own recorded decision (the ticket's
   files-touched line was an estimate; studio-only chrome in the components layer would cascade
   into system-graph → inspect-data → factory's exhibit baselines).
6. **build-checks edits beyond groups 15/17/19**: group 6's #210 hostile-export cases called
   `exportHtml` with the old `slots` shape and were moved to `screens` (richer: the hostile label
   now also travels a heading and an anchor); group 7's MODULES roster gains the new file (the
   standing new-module rule).
7. **journey edits beyond the plan's list**: keepPass §2 (export cells/coordinates assertions),
   the #237 retry predicate, and the PR #241 shape:stream section all asserted the pre-#212 DOM or
   the deleted surplus state; each was reshaped to assert the new truth rather than deleted
   (the M2 caveat machinery in studio-keep stays, on the tripwire's only-speaks-when-it-happens
   terms — no known path reaches it now, and the journey would catch that changing).

## Issues encountered

- The rebase-vs-remote state at session start: local `main` carried two stale near-duplicate
  fix(210) commits whose content was already on `origin/main` (pushed from another session with
  extra polish); local main was reset to `origin/main` after verifying content equivalence
  file-by-file, and the branch was cut from there.
- Firefox reports no request at all for a `file://` navigation in Playwright, so the cold-open
  script asserts "no non-file request" rather than an exact count of one.
