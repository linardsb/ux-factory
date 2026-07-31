# Implementation Report — Wave 4: protos pack skin + dock + inspect coverage (#175)

**Plan**: `.claude/plans/protos-pack-skin-inspect-175.md`
**Branch**: `feature/protos-pack-skin-175` (worktree `ux-factory-wt-175`, off fresh `origin/main` @ 0224953)
**Status**: COMPLETE

## Summary

The two data-connected prototype pages join the site's re-skin and inspection story. `pack-boot.js`
restores the reader's pack pre-paint on both; `dock.mjs` mounts on both but only in the top window,
so `work.html`'s iframe embeds follow the reader's pack without carrying a nested appearance rail;
the #166 inspect engine instruments six vd- components on Verdant and the human-fixed fw- chrome on
Fieldwork; and the framing prose takes the epic's dual-register copy cut. The dock/ruler and inspect
CSS moved from `portfolio.css` into `components.css` (the #168 `.cmdk` precedent), which is what makes
any of it reachable from pages that never load `portfolio.css`.

## Tasks completed

| Task | File | Action |
|---|---|---|
| Move dock+ruler and inspect bubble+toggle blocks under one-line graph headers | `system/components.css` | UPDATE (+308 lines) |
| Remove the same two blocks; fix the now-false `.dock above` comment | `system/portfolio.css` | UPDATE (−295 lines) |
| Scoped reduced-motion kill-switch for the dock | `system/components.css` | UPDATE |
| `fw-…-human-fixed-canvas` ROLES line | `agent-layer/gen-inspect-data.mjs` | UPDATE |
| pack-boot in head, gated dock + inspect at body end, 6 `data-inspect` mounts, toggle, copy cut, post-render inspect re-init | `proto/verdant.html` | UPDATE |
| Same wiring; fw- id on `.fw-toolbar` + 3 `.fw-panel`s; copy cut | `proto/fieldwork.html` | UPDATE |
| `.proto-head-tools` group (badge + toggle travel together) | `system/proto.css` | UPDATE |
| Page-list header comments | `system/pack-boot.js`, `system/dock.mjs`, `system/palette.mjs` | UPDATE |
| Architecture-map lines for components.css / pack-boot / dock / proto | `CLAUDE.md` | UPDATE |
| +2 entries, `$description` corrections | `system/param-manifest.json` | UPDATE |
| Regenerated | `system-graph.json` (30→32 consumers, 347→388 edges), `inspect-data.json` (14→15), `param-count.json` (72→74), `loc-summary.json` (runtime 18,900→19,000) | GENERATED |
| 4 proto baselines re-captured | `tooling/visual-regression/baselines/` | UPDATE |

## Tests added

No test suite in this repo. Two throwaway Playwright drivers were run from the main checkout's
`tooling/visual-regression/node_modules` (never a repo dep) and kept in the session scratchpad:

- `proto-check.mjs` — 14 assertions × chromium/firefox/webkit. **42/42 pass.**
- `triage.mjs` / `ff.mjs` / `rm.mjs` / `digits.mjs` — targeted probes used to separate real defects
  from harness artifacts (see *Issues encountered*).

Covered: the empty-storage no-op on all 10 pages; dock mounts and ruler correctly does not; live
re-skin of vd- components on pack switch; pre-paint restore on reload; the pick following across
pages; fw-panel and fw-toolbar bubbles with resolved token values; Esc dismissal; all six Verdant
mounts opening for a reader who arrives with inspect *persisted on*; palette offering inspect +
copy-tokens on a proto; and no nested dock inside `work.html`'s two embeds while both still wear the
reader's pack.

## Validation results

| Check | Result |
|---|---|
| `node tooling/drift-check.mjs` (the CI `verify` gate) | ✓ all 11 groups, run on the **staged** tree |
| `gen-system-graph` / `gen-inspect-data` / `gen-param-count` / `gen-loc-summary` | ✓ each prints its line |
| Cross-engine functional (chromium + firefox + webkit) | 42/42 |
| VR `npm run update:docker` (pinned Linux container, clean tree) | 20 passed; 4 baselines rewritten |
| VR re-run in **compare** mode after the final iframe fix | 20 passed against the committed baselines; zero further churn |
| Reduced-motion rule proven by running it, not grepping | dock transitions = `1e-05s` under `reduce` on `/proto/verdant.html` (no portfolio.css) and on `/index.html`; full durations under no-preference on both |
| **Cascade: `proto.css` loads AFTER `components.css` on exactly these two pages** | `proto.css` contains one element/universal rule in the whole file — `* { box-sizing: border-box }` — and `components.css:18` already declares it identically. No other bare element, `::`-pseudo or universal selector, so nothing in it can reach the dock panel's or the bubble's new DOM (`fieldset`, `legend`, `input`, `label`, `dl`, `dt`, `dd`, `a`, `p`, `h2`) |
| **Dock panel + bubble RENDERED and measured, proto vs home** | panel `340×758`, padding `32px`, radius `16px`, toggle `44×44`, 4 pack rows — **identical on both**. Bubble `371px` wide, padding `16px`, background `rgb(26,26,26)` on both (height differs only by token count: 11 for `vd-plant-card` vs 18 for `buttons`) |

**VR churn set: `proto-{verdant,fieldwork}-{neutral,saulera}.png` — 4 PNGs. Every other baseline
byte-unchanged.**

## Deviations from the plan

1. **Factory ×2 did NOT churn** — the plan's pre-agreed deviation does not materialise. The owner
   accepted factory churn as the price of the `components.css` move. It costs nothing: `factory.html`'s
   `#shape` exhibit sits in a tab panel the gate captures **hidden**, so 30→32 consumers moves no
   pixels. Verified on both trees (`graphVisible=false panelHidden=true`), not assumed.
2. **Approach ×2 not regenerated.** Its rendered digits *do* change (param total 72→74, runtime lines
   18,900→19,000), but the diff falls inside the gate's declared `maxDiffPixels:100`, so
   `update:docker` declined to rewrite them and the gate is green. The plan sanctions this branch
   explicitly. I did not force a rewrite with `rm`: approach's numerals count up on visible and
   forcing a re-capture invites the known count-up flake (memory `vr-gate-approach-countup-flake`).
3. **Manifest is +2, not +3.** The plan said to add home's inspect toggle as a "control missed at
   #167". It was not missed — `{ "page": "/", "selector": "[data-inspect-toggle]" }` has been in the
   manifest since #166, and a duplicate page+selector throws in the generator. For the same reason the
   plan's "total 65 → 68" is stale: the real numbers are 72 → 74. The plan's NOTES also claim
   Verdant's `#log-care` and task-row checkboxes are missing from the manifest; both are already there.
4. **Verdant scaffolding mount skipped.** The plan listed
   `verdant-screen-scaffolding-layout-not-spec-d-components` as optional. Skipped: the only elements
   carrying it wrap the whole screen, so the mount would draw a dashed outline around everything and
   nest every other mount inside it. No ROLES line added for it either — a key naming a consumer
   nobody mounts is dead weight.
5. **Two additions the plan did not call for**, both forced by the move:
   - **Scoped reduced-motion rule for the dock.** `portfolio.css`'s global kill-switch (lines 16–23)
     is *not* loaded on the proto pages, and `proto.css` has no equivalent — so without this the dock
     would animate at full duration for reduced-motion readers on exactly the two pages this ticket
     adds it to, while the moved block's own comments claimed the kill-switch made it instant. Mirrors
     `.cmdk`'s rule; a no-op wherever `portfolio.css` loads (identical values). Proven by running it.
   - **`.proto-head-tools` wrapper** in `proto.css`. `.proto-head` is `justify-content: space-between`;
     a third child would have spread the source badge into the middle of the row. The badge and the
     toggle now travel together. Visible consequence: the group wraps to its own line under the
     description instead of sitting top-right. Deliberate, consistent across both pages, and in the
     regenerated baselines.
6. **Post-render inspect re-init on both pages** (raised by the advisor, not in the plan, and a real
   defect the plan would have shipped). `inspect.mjs` self-inits at script-tag time and wires its
   triggers **once**, at activation. Both proto pages build their components in `innerHTML` after an
   awaited fetch, so a reader arriving with inspect persisted on got a screen wired to **nothing** —
   silently. Each page now calls `import("/system/inspect.mjs").then((m) => m.initInspect())` right
   after its `innerHTML` lands. The assertion in `proto-check.mjs` touches no toggle and hovers all six
   mounts; it passes on all three engines.
7. **The inspect layer is gated to the top window too, not just the dock.** The plan gated only
   `dock.mjs`. Rendering `work.html`'s embeds **unmasked** (the VR spec masks them, so the green gate
   says nothing about their contents) showed each thumbnail carrying a second "Inspect this surface"
   button at rest, and — for any reader with `factory-inspect` persisted on, which is shared
   same-origin — dashed outlines over all 42 Verdant mounts plus a 44ch bubble clipped by the embed's
   fixed height. The plan's own justification for the dock gate ("chrome about the frame, not about
   the work") applies verbatim. Both the script tag and the post-render re-init are now gated, and the
   toggle is *removed* in an embed rather than left inert, because a control with no engine behind it
   is worse than no control. Measured after: `{dock: 0, inspectToggle: 0, inspectMode: "off",
   outlined: "none"}` in both frames, while both still wear the reader's pack. Deliberately still
   reachable: a reader who drives the ⌘K palette inside a frame gets the layer — the rule is about
   at-rest chrome, not about withholding a deliberate action. No baseline churn (re-verified by a
   compare-mode gate run).
8. **Comment cross-references repaired**, since the move made them false: two
   `portfolio.css:16-23` kill-switch references, one `.close-tokens .btn-ghost … below`, and
   `portfolio.css`'s own "same licence as `.bento` and `.dock` above". Rule bodies moved
   **byte-identical** (verified by diffing the moved ranges against `git show HEAD:` — zero value edits).

## Issues encountered

- **Wrong branch at start.** The session's working directory was on `feature/build-vt-morphs-171`
  (a different ticket, sitting exactly at `origin/main`). Repo memory records that parallel ticket
  sessions share this directory, so rather than switch its branch I built #175 in a dedicated
  worktree, matching the repo's `ux-factory-wt-<N>` convention. Needed one `npm ci` in
  `tooling/style-dictionary` before `drift-check` would run.
- **`gen-loc-summary --check` gave a false pass before staging** (it reads git-tracked content), then
  drifted the moment changes were staged — exactly memory `loc-summary-counts-tracked-only`.
  Regenerated; the runtime group crossing 18,900→19,000 is what puts approach in the discussion above.
- **Four of five initial cross-engine failures were harness bugs, not product defects.** Each was
  separated from a real regression by re-running the same probe against an unmodified checkout of
  `origin/main` on a second port:
  - `work.html` frames=0 on firefox/webkit — the embeds are below the fold and lazy; they never
    instantiate without scrolling. frames=2, nested-docks=0 on all three engines once scrolled.
  - webkit "Fetch API cannot load … due to access control checks" — fetches aborted by the driver's
    next navigation. A clean single load reports **3 errors on both trees, identical**, all
    "Could not connect to the server" for the absent Worker at :8787 (AC4's expected degradation).
  - `fw-toolbar` bubble missing — the engine hides the bubble on scroll **by design** (1.4.13
    persistence), and hovering an off-screen trigger makes Playwright scroll. Waiting for `scrollY`
    to settle fixes it; instrumenting firefox directly showed the bubble shown with the correct role
    text on both hovers.
- **One genuine pre-existing wart, left alone.** A trigger→trigger hover (moving straight from one
  instrumented element to an adjacent one) can lose the bubble: `mouseleave` clears the engine's single
  `hovered` flag after the new `mouseenter` set it. Reproduced on **home's hero `.btn` pair at
  `origin/main`**, so it is #166 engine behaviour, not something this ticket introduced — chromium and
  firefox lose it, webkit keeps it. Recorded in `proto-check.mjs` as an INFO probe rather than an
  assertion. Worth its own ticket; fixing it here would mean touching the shared engine and re-opening
  home's baselines.
- **`vd-primary-button` is `disabled` at rest** (`#log-care` enables once a care task is ticked). The
  concern was that disabled controls swallow mouse events; measured, the bubble opens on all three
  engines, so the mount stays.
- **`vd-status-chip` nests inside `vd-plant-card` and `vd-care-task-row`.** Kept — it is a spec'd
  component and the nesting behaves exactly as home's `.btn`-inside-`.page-hero` mounts already do.

## Phase 0 — shadow-DOM spike findings (AC3)

Run at planning time (2026-07-31) against one `<vd-plant-card>` wrapper in a scratch harness, driven
over chromium/firefox/webkit. Verbatim:

```
chromium  pos=anchor tokens=11 empty=0 meas="420×68px · font 16px · padding 0px" sample=["16px","8px","#f4f4f5"] errors=none
firefox   pos=anchor tokens=11 empty=0 meas="420×68px · font 16px · padding 0px" sample=["16px","8px","#f4f4f5"] errors=none
webkit    pos=anchor tokens=11 empty=0 meas="420×68px · font 16px · padding 0px" sample=["16px","8px","#f4f4f5"] errors=none
```

1. **PASS on all three engines.** All 11 of the wrapper's spec-head tokens resolve to real values via
   `getComputedStyle(host)` — custom-property inheritance pierces the shadow boundary. Zero console
   errors; all three took the anchor-positioned branch.
2. **Bounded limitation:** measurements report the HOST box only (`padding 0px` while the
   shadow-internal `.card` carries real padding). A future wc mount's role copy must not imply
   shadow-internal measurements.
3. **Harness-only artifact:** without the `.inspect-bubble` anchor CSS the popover lands centred over
   the trigger and eats pointer events — which is precisely what Phase 1's move into `components.css`
   guarantees against for the protos.

`inspect.mjs` was not modified by this ticket, so no re-run was required. The committed mounts stay
light-DOM; no shipped page mounts the `wc/` wrappers, and instrumenting `wc/demo.html` would break its
"plain page, no components.css" claim.

## Acceptance criteria

- [x] **AC1** — pack switch on a proto re-skins vd-/fw- live (accent `#2563eb → #F59E0B`, card
      background `rgb(244,244,245) → rgb(244,241,234)`); persists via pack-boot on reload; follows to
      the other proto. 3/3 engines.
- [x] **AC2** — empty-storage no-op proven on all 10 pages, 3/3 engines; VR green (20 passed);
      regenerated baselines = proto ×4 (**not** proto ×4 + factory ×2 — see deviation 1); all others
      byte-unchanged.
- [x] **AC3** — bubbles work on fieldwork's fw- chrome and all six of verdant's vd- surfaces with
      resolved current-pack values and zero empty rows; shadow-wc spike findings recorded above.
- [x] **AC4** — worker-absent fixture degradation renders on both protos; the three
      connection-refused console errors are identical to `origin/main`'s.
- [x] Manifest updated (+2), param-count regenerated (74), copy passed `/no-ai-slop` + `/humanizer`,
      comments and CLAUDE.md current, plan + report committed in the PR. PR body must carry
      `Closes #175`.
