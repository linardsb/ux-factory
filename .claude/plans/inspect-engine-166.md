# Feature: Inspect engine — hover/focus-to-inspect primitive + generated inspect data

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

A Figma-style inspect primitive for the shipped site, engine only. A reader toggles inspect mode
on; hovering or focusing any element carrying `data-inspect="<consumer-id>"` opens an anchored
popover showing four layers: (1) the tokens that component consumes with the CURRENT pack's
resolved values, (2) one spec-head line + a handoff-viewer link, (3) live computed measurements,
(4) one plain-English role sentence. The data behind layers 1, 2 and 4 is a GENERATED artifact
(`system/inspect-data.json`, drift-checked in CI) joining `system/system-graph.json` consumer
blocks with `system/specs/*` heads and a hand-authored role line per component. Layer 3 comes
from `getComputedStyle` live — no data file needed. One synthetic analytics path (`/tool/inspect`)
fires once per page visit from the first successful bubble open. One proving mount on a single
home component makes the engine testable; full per-surface mounts land in later tickets
(#168, #169, #171, #173–#175 all depend on this).

## User Story

As a senior UX engineer doing a deep verification pass (secondary persona, epic #164)
I want to hover/focus any instrumented component and see its real tokens, spec, measurements and role
So that I can verify the token contract and handoff claims under my own cursor instead of trusting copy.

## Problem Statement

The portfolio describes a token-contract system but a reader can't interrogate it in place.
Roughly 20 manipulable controls exist site-wide; the "working tool, not a brochure" claim is made
in copy. The inspect layer is the epic's core "tool feel" primitive and four later tickets block
on it.

## Solution Statement

Hand-write `system/inspect.mjs` as canon (no deps), following `system/glossary.mjs`'s proven
WCAG 1.4.13 bubble mechanics, upgraded to the Popover API + CSS anchor positioning with the
glossary's fixed-position math as the cross-engine fallback. Generate `system/inspect-data.json`
with a new `agent-layer/gen-inspect-data.mjs` following `gen-system-graph.mjs`'s exact shape
(check mode, determinism, standalone-run guard), registered in `tooling/drift-check.mjs`.
Extend `system/analytics.mjs` with `trackToolInspect()` in the `trackFactoryBuilt` shape
(simple flip — no `flipTo` machinery; per the architecture doc, these events don't navigate).
Prove the engine with one mount on home's sample-surface Primary button (`buttons` consumer block).

## Out of Scope / Non-Goals

- Not included: mounts on any page beyond the single home proving mount (defer to #169, #171,
  #173–#175 — each wave ticket instruments its own surfaces and adds role lines as needed).
- Not included: the ⌘K palette toggle for inspect (#168 — but export `setInspect()`/`toggleInspect()`
  so #168 can call it).
- Not included: shadow-DOM (`system/wc/` vd-*) inspect coverage — architecture doc flags it as a
  Wave-4 spike, not this ticket.
- Not included: spring entrance animation on the bubble (#165 owns spring motion; keep the bubble
  entrance unanimated here so the two tickets stay independent and VR stays quiet).
- Not changing: `system/glossary.mjs` (its bubble stays as-is), `system/dock.mjs` (toggle does NOT
  live in the dock — the ticket's files-touched list deliberately excludes it), `pack-boot.js`.
- Not changing: `system/system-graph.json` or its generator — inspect-data JOINS it, never edits it.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: `system/` view-time modules, `agent-layer/` generators, CI drift-check,
`portfolio.css`, home page, VR baselines (index ×2, approach ×2)
**Dependencies**: none (zero-dep hard constraint; browser APIs only)

## Related Work

**Implements**: linardsb/ux-factory#166 (PR body must carry `Closes #166`)
**Epic**: #164 — `docs/epics/prototyping-feel-uplift.prd.md` + `.architecture.md`
(§New pieces rows "Inspect engine", "Inspect data", "Analytics milestones"; §Browser-support
policy; §Constraints; §Risks "anchor-positioning fallback legibility"). NOTE: both epic docs are
currently UNTRACKED in the working tree — commit them (or confirm they land in a sibling PR)
before or with this ticket's PR so the header citations resolve.

**Back-references** (decisions inherited, not re-decided):

- Epic architecture doc: baseline + progressive extras; anchor positioning needs a legible
  un-anchored fallback (Firefox ≤146); hand-write everything, vendor nothing; one-shot
  success-path analytics; generated data + drift check; honesty contract (role line is copy,
  not a claim — the ONE hand-written field).
- `docs/epics/annotated-source-glossary.architecture.md` — the 1.4.13 bubble decisions
  glossary.mjs encodes; inspect inherits the same three-requirement mechanics.

**Forward-references**: #168 (palette toggles inspect), #169/#171/#173/#174/#175 (per-surface
mounts + role lines), #167 (the inspect toggle is itself a manipulable control — when the
param-count manifest lands, this toggle gets a manifest row there, not here).

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/glossary.mjs` (all 126 lines) — Why: THE pattern for the bubble. Copy its mechanics:
  `el()` DOM builder shape, validate-before-touching-DOM (unknown key throws), one shared bubble
  node, `armHide()` 120 ms hoverable timer, separate hover/focus tracking, one `AbortController`
  for all listeners, Esc-only-while-open, scroll-hides, `position()` flip/clamp math (lines
  67–74 — this IS the anchor fallback), `textContent` never `innerHTML`.
- `system/analytics.mjs` (lines 34–74 and 129–168) — Why: `trackFactoryBuilt` (61–74) is the
  exact shape for `trackToolInspect` (own module-level fired guard, static literal path,
  pushState + delayed replaceState restore). Lines 129–168 explain why the /build pair needed
  `flipTo` — read to understand why inspect does NOT (it never fires during another flip's
  window by design: fire on first bubble open, and if you're paranoid the simple shape's
  50 ms window is the same one all four /factory trackers accept). Note the file-header
  `typeof document` guard rationale — do not break it.
- `agent-layer/gen-system-graph.mjs` (all 122 lines) — Why: the generator template. Mirror:
  ROOT resolution from module dir, `{ check }` mode returning `{ counts, drifted }`, JSON with
  `$description` first key + 2-space indent + trailing newline, error messages naming the path,
  `pathToFileURL` standalone guard (repo path contains a space — the naive compare never
  matches), `✓`/`✗` log lines.
- `system/system-graph.json` — Why: the LEFT side of the join. Shape: `consumers[]` =
  `{ id, label, spec (path|null), tokens[] }`. The 9 spec-bearing consumers today:
  ds-metric-tile/-list-row/-sequence-step (…-cross-scenario-library-primitive suffixed ids) and
  vd-screen-header/-status-chip/-plant-card/-stat-tile/-care-task-row/-primary-button.
  `buttons` (17 tokens) and `cards` (9 tokens) have `spec: null`.
- `agent-layer/lib.mjs` (lines 63–103, `parseComponentSpec`) — Why: the RIGHT side of the join.
  Returns `{ head: { component, status, class, props{}, tokens[], states[], children[] }, sections, path }`.
  Use it — do not re-parse spec markdown.
- `agent-layer/gen-handoff.mjs` (lines 30–40) — Why: how `parseComponentSpec` is called over
  `system/specs/*.md` (readdirSync + filter + sort).
- `tooling/drift-check.mjs` (all ~120 lines) — Why: where the new check registers. Mirror
  `checkSystemGraph()` (lines 68–74): import the gen, call `{ check: true }`, throw naming the
  file + regen command. Add to the `try` sequence AND the final `✓` log line's list.
- `system/dock.mjs` (line 89) + `system/pack-derived.mjs` (lines 39–41) — Why: the persistence
  pattern the ticket AC names ("state persists like the dock's choice"): `localStorage` with
  try/catch swallow, exported key const.
- `system/portfolio.css` (lines 733–750, `dfn.term` + `.glossary-bubble`) — Why: the bubble's
  visual model — inverse pairing, `--type-caption`, `z-index: 90` (under `.skip-link`'s 100),
  token-only. New `.inspect-*` rules sit beside it.
- `index.html` (lines 104–128, the `#reskin-preview` sample surface; lines 402–415, the module
  script list) — Why: the proving-mount site. The sample "Buttons" card (line ~123) holds
  `<a class="btn btn-primary">Primary</a>` — a focusable element styled by the `buttons`
  consumer block. The new `<script type="module" src="/system/inspect.mjs">` joins the list.
- `agent-layer/gen-loc-summary.mjs` (lines 22–30) — Why: `system/inspect.mjs` matches the
  `runtime` group regex ⇒ `system/loc-summary.json` MUST be regenerated in this PR, and
  approach.html renders the runtime numbers ⇒ approach baselines churn.
- `tooling/visual-regression/visual.spec.mjs` (lines 18–45) — Why: home's capture handles
  (`waitReady` spine, `waitVisible` peak) — the mount must not disturb them; inspect is
  toggle-off by default and VR contexts have empty localStorage, so the bubble never opens
  under the gate.
- `tooling/token-lint.mjs` (lines 50–71) — Why: `portfolio.css` is in its ORPHAN scan scope;
  any token the new CSS references must be a declared contract token.

### New Files to Create

- `system/inspect.mjs` — the engine (hand-written canon; header cites epic #164 architecture
  §New pieces "Inspect engine" + ticket #166).
- `agent-layer/gen-inspect-data.mjs` — the generator (header cites the same + drift-check).
- `system/inspect-data.json` — GENERATED, committed (deploy = commit the artifacts).

### Files to Update

- `system/analytics.mjs` — add `TOOL_INSPECT_PATH` + `trackToolInspect()`.
- `system/portfolio.css` — `.inspect-bubble` + toggle-state styles + anchor/@supports rules.
- `index.html` — one `data-inspect="buttons"` attribute, one toggle button, one module script tag.
- `tooling/drift-check.mjs` — register `checkInspectData`.
- `system/loc-summary.json` — regenerated (never hand-edit).
- VR baselines: `index-neutral.png`, `index-saulera.png`, `approach-neutral.png`,
  `approach-saulera.png` — regenerated via `update:docker`.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `docs/epics/prototyping-feel-uplift.architecture.md` — §New pieces (the two inspect rows fix
  file names and the join), §Browser-support policy (anchor positioning: Chrome 125/Safari 26/
  Firefox 147 — fallback mandatory), §Constraints (VR, analytics discipline, honesty contract).
- [MDN Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) — use
  `popover="manual"` (no light-dismiss — the 1.4.13 timer owns hide), `showPopover()`/
  `hidePopover()`, and note a popover is top-layer: no z-index management needed while anchored.
- [MDN CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning/Using)
  — `anchor-name` on the trigger, `position-anchor` + `position-area: block-end` +
  `position-try-fallbacks: flip-block` on the bubble. Feature-detect with
  `CSS.supports("anchor-name: --a")`.
- WCAG 1.4.13 Content on Hover or Focus — the three requirements glossary.mjs's header restates;
  the bubble must satisfy all three (dismissible / hoverable / persistent).

### Patterns to Follow

**Generator determinism** (`gen-system-graph.mjs:92–102`): `$description` first, fixed iteration
order (system-graph file order), `JSON.stringify(obj, null, 2) + "\n"`, no timestamps.

**Loud unknown-key failure** (`glossary.mjs:53–57`): validate every `[data-inspect]` value
against the fetched data BEFORE wiring anything; unknown id throws naming the id + pathname.

**One-shot analytics** (`analytics.mjs:61–74`): module-level `let inspectFired = false`, guard
first line, static literal path, fire ONLY from the success path (the bubble actually shown),
never from the toggle or a settled-state flag.

**Storage** (`pack-derived.mjs:39` / `dock.mjs:89`): exported key const, `try { localStorage… }
catch { }` around every read/write.

**File headers**: entry-point files open with a governing-doc citation
(`epic #164 — docs/epics/prototyping-feel-uplift.architecture.md §New pieces; ticket #166`).

**Errors**: plain `Error` whose message names the offending path/id. No taxonomy.

---

## IMPLEMENTATION PLAN

### Phase 1: Generated data (generator + artifact + CI gate)

Node-only, independently verifiable before any browser work.

### Phase 2: Engine (`system/inspect.mjs` + CSS)

**Depends on:** Phase 1 (the engine fetches and validates against `inspect-data.json`).

### Phase 3: Analytics + proving mount + integration

**Depends on:** Phase 2.

### Phase 4: Regeneration cascade + validation (loc-summary, drift-check, VR baselines, cross-engine)

**Depends on:** Phase 3 (baselines capture the final at-rest page).

---

## STEP-BY-STEP TASKS

### CREATE agent-layer/gen-inspect-data.mjs

- **IMPLEMENT**: `export function genInspectData({ check = false } = {})`. Read
  `system/system-graph.json` (readFileSync + JSON.parse — do NOT re-run genSystemGraph; the
  committed artifact is the source and is itself drift-checked). Hand-author a `ROLES` const in
  this file: `{ [consumerId]: "one plain-English sentence" }` covering exactly these 11 ids:
  `buttons`, `cards`, and the 9 spec-bearing consumers (`ds-metric-tile-cross-scenario-library-primitive`,
  `ds-list-row-…`, `ds-sequence-step-…`, `vd-screen-header`, `vd-status-chip`, `vd-plant-card`,
  `vd-stat-tile`, `vd-care-task-row`, `vd-primary-button`). For each ROLES key: find the
  consumer in the graph (a key naming NO consumer throws — the drift guard for a renamed
  block); build the row `{ id, label, role, tokens: consumer.tokens, spec: null | { component,
  status, props: Object.keys(head.props).length, states: head.states.length, line } }` where
  spec-bearing consumers get `parseComponentSpec(join(ROOT, consumer.spec))` and
  `line = "${component} · ${status} · ${props} props · ${states} states"`. Emit rows in
  system-graph consumer order (NOT ROLES key order — determinism tied to the measured file).
  Output shape: `{ $description, components: rows[], counts: { components, withSpec } }`.
  Write to `system/inspect-data.json`; `{ check: true }` compares against disk, returns
  `{ counts, drifted }`. Standalone guard + `--check` flag + `inspect data ✓ …` /
  `✗ drift` lines — copy `gen-system-graph.mjs:114–122` verbatim in shape.
- **PATTERN**: `agent-layer/gen-system-graph.mjs:39–110` (whole flow), `gen-handoff.mjs:21`
  (`parseComponentSpec` import from `./lib.mjs`).
- **ROLE COPY**: plain-English dual register, hiring-manager first, no jargon-first phrasing.
  Example for `buttons`: "The site's buttons. One component, three emphasis levels — every
  colour it uses comes from the token contract, so a brand pack restyles it without touching
  this code." Run the 11 lines through `/no-ai-slop` + `/humanizer` before commit (epic rule).
- **GOTCHA**: role lines are COPY, not claims (honesty contract) — describe what the component
  is, never assert measurements or numbers here. Determinism: no Date, no randomness.
- **VALIDATE**: `node agent-layer/gen-inspect-data.mjs` prints `inspect data ✓ 11 components · 9 with spec (system/inspect-data.json)`;
  run twice → `git diff --stat system/inspect-data.json` empty on the second run.
- **SATISFIES**: AC #4 (artifact exists, deterministic).

### UPDATE tooling/drift-check.mjs

- **IMPLEMENT**: import `genInspectData`; add `checkInspectData()` mirroring `checkSystemGraph()`
  (lines 68–74) with message `inspect-data drift: … — regenerate: node agent-layer/gen-inspect-data.mjs`;
  call it right after `checkSystemGraph()` in the runner; append `inspect-data` to the final
  `✓` log line's gate list.
- **PATTERN**: `tooling/drift-check.mjs:68–74` and `:106–118`.
- **VALIDATE**: `node tooling/drift-check.mjs` → green. Then the mutation test (memory: "the
  check that cannot fail"): edit one role word in `system/inspect-data.json` by hand → drift-check
  goes RED naming the file → `node agent-layer/gen-inspect-data.mjs` → green again. Also prove
  the join is live: temporarily change a `states` entry in `system/specs/metric-tile.md`, re-run
  `node agent-layer/gen-inspect-data.mjs`, confirm the artifact changed, then revert both.
- **SATISFIES**: AC #4 (CI drift-check; spec/graph change changes the artifact).

### CREATE system/inspect.mjs

- **IMPLEMENT**: hand-written canon module, self-initializing like dock.mjs when loaded as a
  page script but Node-import safe (`typeof document !== "undefined"` guard around init; no
  top-level DOM access). Exports: `INSPECT_KEY = "factory-inspect"`, `initInspect(root = document)`
  returning `{ setInspect(on), toggleInspect(), destroy }`, so #168's palette can drive it.
  Behaviour:
  1. **Toggle + persistence**: wire every `[data-inspect-toggle]` button under root
     (`aria-pressed` reflects state). State persists as `localStorage["factory-inspect"] = "on"`
     (remove when off), try/catch both directions. On init, restore persisted state.
  2. **Activation**: on first turn-on (or persisted-on at load), `fetch("/system/inspect-data.json")`
     once, cache the promise. After fetch, validate: every `[data-inspect]` value under root
     must exist in `components[].id` — unknown id THROWS naming the id + `location.pathname`
     (glossary.mjs:53–57 pattern). While on, set `document.documentElement.dataset.inspect = "on"`
     (CSS hook for trigger affordance); while off, remove it and close the bubble — inert means
     NO listeners act (guard handlers on state, or attach/detach a per-activation
     AbortController).
  3. **Bubble**: ONE shared node built with glossary's `el()` builder shape, appended to body:
     `<div class="inspect-bubble" id="inspect-bubble" role="tooltip" popover="manual">` with
     four child sections — role sentence (plain text first), spec line + `<a href="/handoff.html">`
     (omit the line, keep the link, when `spec` is null — render "styled token-only in
     components.css · <label>" instead; never fabricate a spec), token list (`<dl>` of
     name → LIVE value via `getComputedStyle(trigger).getPropertyValue(name).trim()` resolved
     at open time — this is what makes the values "the current pack's", including derived and
     imported packs), measurements (from `getBoundingClientRect()` width×height rounded +
     `getComputedStyle` font-size/padding — live, generated data carries none of this). All text
     via `textContent`/`el()` — never innerHTML (inspect-data is trusted-committed, but the rule
     is the rule).
  4. **Positioning**: feature-detect once `CSS.supports("anchor-name: --a")`. Supported: set
     `trigger.style.anchorName = "--inspect-target"` on show (clear on hide/switch), bubble CSS
     does the rest. Unsupported (Firefox ≤146): glossary.mjs:67–74 fixed-position math verbatim
     (measure after content set + shown, flip above near viewport bottom, clamp 8px margins).
     `showPopover()`/`hidePopover()` in both branches (popover is position:fixed by default —
     the fallback math works unchanged; wrap in try/catch for ancient engines and fall back to
     `hidden` toggling only if showPopover is absent).
  5. **1.4.13 mechanics**: copy glossary.mjs wholesale — mouseenter/focusin show, mouseleave/
     focusout arm a 120 ms hide the bubble's own mouseenter cancels, separate `hovered` /
     `focusTrigger` tracking, Esc hides while open (bubble only — toggle state stays on),
     scroll hides. `aria-describedby="inspect-bubble"` on the active trigger.
  6. **Analytics**: on each successful `show()`, call `trackToolInspect()` (import from
     `./analytics.mjs`) — the tracker's own guard makes it once-per-visit; the call site fires
     only when the bubble is actually on screen (success path).
  7. Event delegation note: triggers are wired individually per activation (glossary pattern,
     AbortController per activation) — later mount tickets re-run wiring via `initInspect`'s
     returned handle or a re-init; keep `initInspect` idempotent-safe (destroy previous wiring
     if called twice).
- **PATTERN**: `system/glossary.mjs` throughout; `system/dock.mjs:89` storage; header citation
  per repo convention.
- **IMPORTS**: `import { trackToolInspect } from "./analytics.mjs";` — nothing else.
- **GOTCHA**: do NOT use `el.hidden` as the primary hide while a CSS rule might set display
  (memory: `hidden` defeated by author display) — popover's `hidePopover()` avoids the trap.
  Do not set `anchor-name` in a stylesheet (one shared name, many triggers — inline style on
  the ACTIVE trigger only). `body{overflow-x:clip}` breaks sticky, not fixed/top-layer — no
  action needed, just don't reach for sticky.
- **VALIDATE**: `node --check system/inspect.mjs` passes; `node -e "import('./system/inspect.mjs').then(()=>console.log('node-safe'))"`
  prints node-safe (proves the document guard).
- **SATISFIES**: AC #1, #2, #3, #5 (engine half).

### UPDATE system/analytics.mjs

- **IMPLEMENT**: after the `/build` pair, add:
  `const TOOL_INSPECT_PATH = "/tool/inspect"; let toolInspectFired = false;` and
  `export function trackToolInspect()` in the EXACT `trackFactoryBuilt` shape (lines 68–74):
  guard, flip, 50 ms restore — wrapped `try { history.pushState … } catch { return; }` like
  `flipTo` does, because inspect.mjs may run on file:// during dev. Comment states: static
  literal is the entire payload; fired once from the first successful bubble open; simple shape
  (not flipTo) because per the epic architecture §Analytics milestones these don't navigate —
  and note it inherits the same theoretical 50 ms collision the four /factory trackers accept
  (#149 left them unchanged deliberately).
- **PATTERN**: `system/analytics.mjs:61–74` + the guard from `:189–193`.
- **GOTCHA**: own fired guard (never share another tracker's); do NOT touch the `flipTo`/
  `pushedPaths` machinery or the four /factory trackers.
- **VALIDATE**: `node tooling/build-checks.mjs` still prints `build ✓ all 10 groups pass`
  (group 10 imports this module under Node — a top-level slip breaks it loudly).
- **SATISFIES**: AC #5.

### UPDATE index.html (proving mount)

- **IMPLEMENT**: three edits only:
  1. Line ~123: add `data-inspect="buttons"` to the sample `<a class="btn btn-primary" href="#beat-intake">Primary</a>`.
  2. In the same sample-surface card (or directly under `#reskin-preview`), add the toggle:
     `<button type="button" class="btn btn-ghost inspect-toggle" data-inspect-toggle aria-pressed="false">Inspect this surface</button>`
     — static markup so it renders with JS blocked (degrades to an inert button, same licence
     as the rest of the static sample).
  3. Script list (after `dock.mjs`, line ~406): `<script type="module" src="/system/inspect.mjs"></script>`.
- **GOTCHA**: the trigger is an `<a>` — already focusable, keyboard path free. Do not add
  `data-inspect` to the sample cards (not focusable; hover-only triggers would fail AC #2 —
  later tickets decide per-element focusability).
- **VALIDATE**: `npx serve .` → open home in a real browser: toggle on → hover AND Tab-focus
  the Primary button → 4-layer bubble; values change after switching pack in the appearance
  dock (#appearance) and re-opening the bubble; Esc dismisses; toggle off → nothing opens;
  reload → toggle state restored. DevTools Network: `/tool/inspect` history flip visible once
  (watch the address bar flicker or set a breakpoint in trackToolInspect); second open → no
  second fire.
- **SATISFIES**: AC #1, #2, #5.

### UPDATE system/portfolio.css

- **IMPLEMENT**: beside `.glossary-bubble` (line ~739):
  - `.inspect-bubble` — token-only, modeled on `.glossary-bubble` (inverse pairing,
    `--type-caption`, `--radius-sm`, `--shadow-md`) but wider (`max-width: 44ch`), with modest
    inner structure (`dl` grid for token rows, `--font-mono` for token names/values, a muted
    spec line). Popover UA styles reset: `.inspect-bubble { margin: 0; border: 0; }` (popovers
    get UA margin:auto + border).
  - Anchor branch: `@supports (anchor-name: --a) { .inspect-bubble { position-anchor: --inspect-target; position-area: block-end span-inline-end; position-try-fallbacks: flip-block; margin-block-start: var(--spacing-sm); } }` —
    the fallback branch needs no rules (JS sets left/top inline, glossary-style).
  - Trigger affordance while on: `:root[data-inspect="on"] [data-inspect] { outline: 1px dashed var(--color-accent); outline-offset: 2px; cursor: help; }`
    (visible-only-when-toggled ⇒ zero at-rest VR effect).
  - Toggle pressed state: `.inspect-toggle[aria-pressed="true"]` — reuse existing btn tokens
    (e.g. `border-color: var(--color-accent)`); no literals.
- **GOTCHA**: every `var(--…)` must be a declared contract token — `token-lint` scans
  portfolio.css for orphans/undeclared. No new tokens needed; if you find yourself wanting one,
  stop (that's a tokens.source.json + regen + pack cascade this ticket doesn't need).
- **VALIDATE**: `node tooling/token-lint.mjs` green.
- **SATISFIES**: AC #1, #3.

### Regenerate loc-summary + verify generators

- **IMPLEMENT**: strict order — the generator reads GIT-TRACKED content (memory: a `--check`
  on unstaged files false-passes):
  1. `git add system/inspect.mjs agent-layer/gen-inspect-data.mjs system/inspect-data.json`
  2. `node agent-layer/gen-loc-summary.mjs` (the runtime group now counts inspect.mjs)
  3. `git add system/loc-summary.json`
  4. Note whether the RUNTIME group's rendered numbers moved (lines round to the nearest 100)
     — this decides the approach-baseline branch in the VR task below. A grand-total-only
     change fails `verify` if stale but does NOT churn approach baselines (approach renders
     the runtime group only — memory).
- **VALIDATE**: `node tooling/drift-check.mjs` fully green (syntax · token-css ·
  annotated-source · loc-summary · system-graph · inspect-data · handoff · scenarios · traces);
  `node agent-layer/gen-loc-summary.mjs --check` green.
- **SATISFIES**: AC #4 + repo drift discipline.

### Cross-engine + fallback check (AC #3)

- **CONSTRAINT (measured 2026-07-30)**: the VR-pinned Playwright bundles Chromium 149.0.7827.55,
  Firefox **151.0**, WebKit 26.5 — ALL THREE support anchor positioning (Firefox gained it
  at 147). No bundled engine exercises the fallback naturally, so AC3 is proven by FORCING the
  fallback branch, and the engine must make that forcible: in `system/inspect.mjs`, route the
  feature-detect through one function (`const supportsAnchor = () =>
  CSS.supports("anchor-name: --a")`) called at ACTIVATION time (not module-eval time), so a
  test can stub `CSS.supports` via `page.addInitScript` before load and the engine honestly
  takes its fallback path.
- **IMPLEMENT**: drive chromium + firefox + webkit via Playwright resolved from
  `tooling/visual-regression/node_modules` (memory: cross-engine motion verify — serve the repo,
  `pw.firefox.launch()` etc.). Script (scratchpad, not committed) runs a shared assertion pass
  TWICE per engine — once natural (anchor), once with
  `page.addInitScript(() => { const o = CSS.supports.bind(CSS); CSS.supports = (...a) => String(a[0]).includes("anchor-name") ? false : o(...a); })`
  (forced fallback). Each pass: load home, click the toggle, focus the Primary button, assert
  the bubble is visible, within the viewport, overlapping-or-adjacent to the trigger's
  boundingBox, and contains a token row; press Escape, assert hidden. 3 engines × 2 branches
  = 6 green passes; log which branch each pass took (read a `data-inspect-pos="anchor|fallback"`
  attribute the engine sets on the bubble — add that one attribute for observability).
- **VALIDATE**: all 6 passes green; paste the script output into the PR/report. A real
  ≤146 Firefox spot-check is optional extra credit, not required — the forced branch runs the
  same code path.
- **SATISFIES**: AC #2, #3.

### Regenerate VR baselines (index ×2, approach ×2)

- **IMPLEMENT**: at-rest changes = the visible toggle button on home (always churns
  index ×2) + approach's rendered runtime loc numbers (churns approach ×2 ONLY if the rounded
  runtime numbers moved — read the answer off the loc-summary task's step 4, before running
  anything). From a CLEAN detached worktree under `/Users` (NOT /private/tmp — Docker file
  sharing; memory: VR gate reads the working tree, so a dirty tree bakes stray edits into
  baselines): `cd tooling/visual-regression && npm run update:docker`. Decision table:
  - runtime numbers moved + approach PNGs churned → expected, done.
  - runtime numbers moved + approach PNGs unchanged → sub-perceptual skip (memory):
    `rm` the two approach PNGs and re-run to force.
  - runtime numbers unchanged → approach PNGs unchanged is CORRECT; expect index ×2 only.
  - anything ELSE churned (any of the other 16 PNGs) → stop and diagnose before committing;
    the design keeps inspect invisible at rest (default-off, empty localStorage in gate
    contexts), so extra churn means a bug, not noise.
- **GOTCHA**: approach has a known countUp flake in CI (memory) — a red approach in CI that
  passes locally may be the flake; check `gh pr checks` details before churning further.
- **VALIDATE**: `npx playwright test` in the Docker image (update:docker run itself) → green;
  `git status` shows only the expected PNGs.
- **SATISFIES**: no-regression discipline; AC #1's at-rest additions are baselined.

### Commit + PR

- **IMPLEMENT**: branch `feature/inspect-engine-166` (verify branch right before committing —
  memory: shared worktree, parallel sessions; stage by explicit path). **Commit the two epic
  docs** (`docs/epics/prototyping-feel-uplift.prd.md` + `.architecture.md`) in this PR — as of
  2026-07-30 they are untracked with no sibling PR open (`gh pr list` empty), and this ticket's
  file headers cite them, so they must land no later than this PR. Re-check
  `git log --oneline -3 -- docs/epics/prototyping-feel-uplift*` first: if a parallel #165/#167
  session landed them meanwhile, skip and rebase instead of duplicating. One atomic commit; PR
  body carries **`Closes #166`** (a title "(#166)" closes nothing — memory), plus
  plan/report/review artifacts in the same PR per repo Git rules.
- **VALIDATE**: `gh pr checks` — verify (drift-check · token-lint · build-checks) green,
  visual green.
- **SATISFIES**: ticket closure discipline.

---

## TESTING STRATEGY

No suite, no linter (repo rule — don't invent one). "Done" = run the surface you touched:

### Node-level (deterministic)

- Generator ✓ line; byte-identical second run; `--check` green then RED under a hand-mutation
  and under a real spec edit (then reverted) — the mutation test is mandatory (memory: every
  #137 defect survived a green gate that skipped the thing it tested).
- `node tooling/drift-check.mjs`, `node tooling/token-lint.mjs`, `node tooling/build-checks.mjs`
  all green.
- Node-import safety of `system/inspect.mjs` (the analytics import chain reaches Node via
  build-checks — prove the new module itself imports cleanly too).

### Browser-level (manual + scripted)

- Manual pass on home (serve + real browser): the full AC walkthrough in the index.html task.
- Scripted cross-engine pass (chromium/firefox/webkit) for AC #2/#3 — anchor branch AND
  forced-fallback branch on every engine (all three bundled engines support anchor, so the
  fallback only runs when forced; see the cross-engine task).
- Pack interplay: switch to saulera via the dock, re-open bubble → token VALUES change (resolved
  live), token NAMES don't.

### Edge Cases

- Unknown `data-inspect` id → loud throw (test by temporarily mis-spelling the mount).
- `localStorage` blocked (private mode) → toggle still works for the session, no throw.
- Toggle on with fetch failing (offline file://) → engine stays off, no crash (catch + console.error;
  do not show an empty bubble).
- Esc with bubble closed → no-op (glossary already guards on `!bubble.hidden`; mirror with
  popover `:popover-open`/matches check).
- Two rapid trigger hovers → bubble re-targets, `anchor-name` cleared from the previous trigger.
- Reduced motion: nothing animated this ticket ⇒ nothing to gate; do not add entrances.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

- `node --check system/inspect.mjs && node --check agent-layer/gen-inspect-data.mjs`
- `node tooling/token-lint.mjs`

### Level 2: Generators & Gates

- `node agent-layer/gen-inspect-data.mjs && node agent-layer/gen-inspect-data.mjs --check`
- `node agent-layer/gen-loc-summary.mjs --check`
- `node tooling/drift-check.mjs`
- `node tooling/build-checks.mjs`

### Level 3: Integration (browser)

- `npx serve .` → manual AC walkthrough on http://localhost:3000 (or the port serve prints)
- scratchpad Playwright script across chromium/firefox/webkit (see task)

### Level 4: Manual Validation

- AC walkthrough incl. persistence across reload, dock pack-switch value refresh, one-shot
  `/tool/inspect`, Esc, keyboard-only pass (Tab to toggle → Enter → Tab to Primary → bubble).

### Level 5: VR

- `cd tooling/visual-regression && npm run update:docker` (clean worktree under /Users) →
  exactly 4 PNGs churn → CI `visual` job green on the PR.

---

## ACCEPTANCE CRITERIA

- [ ] AC1 — Toggle on → hover/focus `data-inspect` element shows the 4-layer bubble; toggle
      off → inert; state persists like the dock's (localStorage, restored on load).
- [ ] AC2 — Bubble keyboard-reachable (focus opens it) and Esc-dismissible; 1.4.13
      dismissible/hoverable/persistent all hold (glossary mechanics).
- [ ] AC3 — With `anchor()` unsupported (forced via `CSS.supports` stub — no bundled engine
      lacks it natively), the bubble is legible and adjacent to its target via the
      fixed-position fallback, on all three engines.
- [ ] AC4 — `gen-inspect-data.mjs` regenerates byte-identical in CI drift-check; a spec or
      system-graph change changes the artifact (proven by the mutation test).
- [ ] AC5 — `/tool/inspect` fires exactly once per page visit, only from a real successful
      bubble open (static literal, success path, own guard).
- [ ] All validation commands green; 4 VR baselines regenerated in the same PR; loc-summary
      regenerated; no other baselines churn.
- [ ] Role lines pass `/no-ai-slop` + `/humanizer`; headers cite governing docs; PR body
      carries `Closes #166`.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order, each task's VALIDATE run immediately
- [ ] Mutation test on the drift gate actually performed (not skipped as obvious)
- [ ] Cross-engine script run on all three engines, output captured
- [ ] `git status` clean of unexpected files; staged by explicit path; branch verified
- [ ] Plan + implementation report + review artifacts committed in the same PR

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Toggle placement (assumption)**: a static "Inspect this surface" button inside home's
  sample-surface exhibit — NOT in the dock (ticket's file list excludes dock.mjs) and NOT
  engine-injected chrome (would churn all 16 chrome baselines like #148). If the owner prefers
  a dock/chrome home for the toggle, that's a scope change — flag before implementing.
- **Assumption**: `inspect-data.json` covers 11 components now (the 2 home consumers + all 9
  spec-bearing) so AC4's spec-join is real and later mount tickets mostly add role lines only.
  Alternative (2 rows now) was rejected: the artifact would carry no spec data, making AC4's
  "a spec change changes it" vacuous.
- **Assumption**: `/tool/inspect` uses the simple tracker shape, not `flipTo` — matches the
  epic architecture's explicit note ("No flip/restore machinery needed — these don't navigate").
- **Risk, low**: `popover` attribute support — baseline since Chrome 114/Safari 17/Firefox 125,
  older than every other feature in play; the try/catch around `showPopover` is belt-and-braces.

### Risks resolved against facts (2026-07-30)

- **AC3/fallback**: pinned Playwright measured — Chromium 149 / Firefox 151 / WebKit 26.5, all
  anchor-capable. Resolved by the forced-fallback design in the cross-engine task (activation-
  time `supportsAnchor()` seam + `CSS.supports` stub + `data-inspect-pos` observability
  attribute; 3 engines × 2 branches).
- **Epic docs**: untracked, no open PRs (`gh pr list` empty) → committing them is now a
  definite step in the Commit + PR task, with a landed-meanwhile re-check.
- **Parallel #165/#167 friction**: no such branches exist yet (only an unrelated
  floor-runner spike branch) — theoretical today. Cheap guard kept: at implementation start,
  re-run `git branch -a | grep -i "165\|167"` + `gh pr list`; if either is in flight, take a
  dedicated worktree and expect small merges in `portfolio.css` / `index.html` /
  `analytics.mjs`.
- **VR cascade**: fully sequenced — loc-summary task stages files before regenerating and
  records whether the rounded runtime numbers moved; the VR task consumes that as a decision
  table (index ×2 always; approach ×2 conditional; any other churn = bug, stop).

## NOTES (open canvas)

- **Why consumer id (not spec name) as the `data-inspect` key**: the join's left side is the
  system-graph consumer block — the thing that MEASURABLY consumes tokens. Spec-less blocks
  (buttons, cards) are legitimately inspectable (tokens + measurements + role) and honest about
  having no spec; keying on spec names would exclude them or tempt a fake mapping (home's
  `.btn` is NOT `vd-primary-button` — mapping it to primary-button.md would violate the honesty
  contract).
- **Why values resolve live instead of shipping in the artifact**: system-graph's pack values
  are raw declared text (aliases unresolved, three committed packs only). The bubble promises
  "the CURRENT pack's resolved values" — which includes derived and imported packs that exist
  only in the visitor's browser. `getComputedStyle` on the trigger is the only honest source,
  and it makes the artifact smaller and stabler (names only).
- **VR safety reasoning**: default-off + empty localStorage in gate contexts ⇒ the bubble and
  the trigger outline never render under the gate; the only at-rest deltas are the static
  toggle button (home) and the loc numbers (approach) ⇒ exactly 4 baselines.
- **Rejected**: event delegation on document for triggers (would keep listeners live while
  "inert"; per-activation AbortController is cleaner and matches glossary); `light-dismiss`
  popover (fights the 1.4.13 hover timer); animating the bubble in (belongs to #165's spring
  vocabulary — a later ticket can add `@starting-style` with the reduced-motion off-ramp).
- Sequencing note: #165/#166/#167 are the epic's parallel Wave 0 — this plan touches
  `analytics.mjs`, `portfolio.css`, `index.html`, all likely touched by #165/#167 too.
  Verified 2026-07-30: neither has a branch or PR yet (see Risks resolved). Re-check at
  implementation start; if in flight, separate worktrees.

## AMENDMENTS

