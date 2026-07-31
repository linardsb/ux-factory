# Feature: ⌘K command palette — navigate + toggle inspect + run actions, with chrome hint (#168)

The following plan should be complete, but validate documentation and codebase patterns and task
sanity before implementing. Pay special attention to naming of existing utils and modules — import
from the right files. **All file:line references below are against `origin/main` at merge of
PR #180 (`401921e`)** — the working tree at planning time sat on the already-merged
`feature/param-count-167` branch, so branch fresh from `origin/main` first.

## Feature Description

A site-wide command palette (`system/palette.mjs`, hand-written canon): ⌘K / Ctrl-K opens a
`<dialog>`-backed palette on every one of the 10 shipped pages, with type-to-filter fuzzy matching
over a static command list. Commands v1: navigate (all pages + major exhibits/sections), toggle
inspect mode (driving #166's engine), and run actions (start a build → /build, copy tokens,
download the pack). A visible ⌘K hint lands in the site chrome via `system/site.js`. Entrance uses
#165's spring tokens + `@starting-style`, with a reduced-motion off-ramp. One new analytics
milestone: `/tool/palette`, fired ONCE from the first real palette open.

**No pack-switch command** (owner decision, epic round 4).

## User Story

As a hiring manager or senior UXE reviewing the portfolio
I want a keyboard-first command palette on every page
So that the site behaves like the working prototyping tool it claims to be — navigable and
operable under my own fingers, not just readable.

## Problem Statement

The epic's core finding: the site describes a live tool but mostly only responds to scrolling.
There is no site-wide, keyboard-first way to move between pages/exhibits or invoke the tool
surfaces (inspect, build, tokens, pack). A palette is the single strongest "this is a tool"
affordance, and the 2026 platform provides it natively (`<dialog>`, `@starting-style`) — ninja-keys
was evaluated and rejected (Lit runtime); the architecture decision is ~150–250 hand-written lines.

## Solution Statement

One new ES module `system/palette.mjs` loaded on all 10 shipped pages. Native `<dialog>` +
`showModal()` gives modality, Esc-close, and focus-return for free. A static command list is built
at mount: navigation commands are global; "toggle inspect" and "copy tokens" are presence-gated on
the page's actual capabilities (honesty: never offer a command that does nothing here). The ⌘K
hint is rendered by `site.js` **hidden** and revealed + wired by `palette.mjs` — so
`instance.html` and per-company builds (which load `site.js` but not `palette.mjs`) never show a
dead button. Palette dialog CSS goes in `system/components.css` (the ONE sheet all 10 pages load —
proto pages do not load `portfolio.css`), token-only; the hint's chrome CSS goes in
`portfolio.css`. `trackToolPalette()` joins `analytics.mjs` mirroring `trackToolInspect()`.

## Out of Scope / Non-Goals

- **No pack-switch command** — owner decision, round 4. Do not add one "for completeness".
- **Not on `instance.html`** or per-company builds: the palette's nav commands are the public IA,
  wrong on a private instance. The hidden-hint mechanism keeps `site.js` shared without leaking.
- **No inspect mounts on new pages** — `data-inspect` coverage is Wave 1–4 work (#169+). The
  toggle-inspect command simply appears wherever mounts exist (today: home only).
- **No new analytics machinery** — one static-literal synthetic path, `trackFactoryBuilt` shape,
  no flipTo (palette actions that navigate do a REAL navigation, not a virtual one).
- **Not changing** dock, nav, or footer behaviour; the hint is additive.
- **No command-list generator** — the list is static, hand-written in `palette.mjs`. (A generated
  list from the manifest is a plausible future ticket; not this one.)

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: `system/palette.mjs` (new), `system/site.js`, `system/analytics.mjs`,
`system/inspect.mjs` (one-line export), `system/components.css`, `system/portfolio.css`, all 10
shipped page HTML files, `system/param-manifest.json` (+ regen cascade), VR baselines ×16
**Dependencies**: none external. #166 (merged, PR #180) provides the inspect engine.

## Related Work

**Implements**: [issue #168](https://github.com/linardsb/ux-factory/issues/168) — PR body must
carry `Closes #168`.
**Epic**: #164 — `docs/epics/prototyping-feel-uplift.prd.md` + `.architecture.md` (§New pieces
"Command palette" row, §Research ninja-keys rejection, §Browser-support policy).

**Back-references**:
- `.claude/plans/inspect-engine-166.md` — the engine this drives; its cross-engine validation
  approach (scratchpad Playwright script over three engines) is mirrored here.
- `.claude/plans/param-count-manifest-generator.md` (#167) — manifest entry rules + regen.
- `.claude/plans/build-footer-site-index.md` (#148) — the precedent 16-baseline chrome churn.

**Forward-references**: #169–#176 wave tickets add `data-inspect` mounts, which automatically
surface the toggle-inspect command on more pages. (none created yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING (all on origin/main)

- `system/inspect.mjs` (head comment + lines 216–275) — Why: `setInspect`/`toggleInspect` handle
  shape, the module-level `current` handle, self-init at load, localStorage persistence. The head
  comment (line 33) already promises: "#168's palette drives it via the exported initInspect
  handle". You will ADD a one-line accessor (task below).
- `system/analytics.mjs` (lines 244–271, `trackToolInspect`) — Why: `trackToolPalette` is a
  near-verbatim mirror: fire-once flag, static literal path, guarded pushState, `RESTORE_DELAY_MS`
  restore. Read the block comment — it explains why NOT flipTo.
- `system/site.js` (lines 38–63 header build, 86–88 Escape handler) — Why: where the hint button
  goes (inside `.nav-row`, between `.nav-toggle` and `.nav-panel` markup-wise; visually right side
  of the row) and the classic-script IIFE style to match.
- `system/dock.mjs` (lines 302, 386–422 copy-tokens; 424–460 hash/Escape machinery) — Why: the
  pack-aware copy logic the palette DELEGATES to (click `.dock-copy`, never fork the logic), and
  the Escape listener at line 455 the palette's Escape must not trigger underneath (GOTCHA below).
- `system/portfolio.css` (lines 16–23 reduced-motion kill; 973–1010 `.dock-panel` entrance) — Why:
  THE `@starting-style` + `allow-discrete` + spring-token entrance pattern to mirror for the
  dialog, including the PR-#55 discrete-toggle comment. Also `.inspect-bubble` at 757 for
  bubble-ish styling vocabulary.
- `system/tokens.contract.css` (lines 75–89) — Why: the motion token names: `--motion-base`,
  `--motion-ease`, `--motion-ease-spring`, `--motion-ease-settle`, `--motion-fast`. Use tokens
  only; never inline a `linear()` literal in CSS.
- `system/param-manifest.json` — Why: the `$description` counting rules; the `chrome` pseudo-page
  precedent (dock entries) your three palette entries follow.
- `index.html` (line 131 inspect-toggle row; lines 405+ script block) + `approach.html` lines
  218–222 — Why: the script-tag ordering convention (`client.neutral.config.js` → `site.js` →
  `portfolio.js` → module scripts) each page follows when you add the palette tag.
- `proto/verdant.html` + `proto/fieldwork.html` (head links, lines ~17–22) — Why: proto pages load
  `tokens.contract.css` + `tokens.neutral.css` + `components.css` + `proto.css` — NO
  `portfolio.css`, NO `site.js`, NO analytics/dock. This is why dialog CSS must live in
  `components.css` and why the palette module imports its own analytics.
- `tooling/build-journey.mjs` (lines 1–45) — Why: the createRequire-from-VR-node_modules Playwright
  bootstrap pattern for the cross-engine check script.
- `tooling/visual-regression/visual.spec.mjs` (lines 17–69) — Why: the 10 pages × 2 packs matrix;
  which 16 are chrome-bearing (all but `verdant`/`fieldwork`); the waitReady handles per page.
- `agent-layer/gen-param-count.mjs`, `agent-layer/gen-loc-summary.mjs`, `agent-layer/gen-handoff.mjs`,
  `agent-layer/gen-pack-bundle.mjs` — Why: the regen cascade (run, don't read deeply).

### New Files to Create

- `system/palette.mjs` — the palette (hand-written canon; header cites epic #164 ticket #168 +
  the architecture §New pieces row, per the repo's file-header convention).
- `.claude/reports/command-palette-168.md` — implementation report (same PR, repo convention).
- `<scratchpad>/palette-journey.mjs` — cross-engine check script (NOT committed; #166 precedent).

### Relevant Documentation

- `docs/epics/prototyping-feel-uplift.architecture.md` §New pieces (palette row), §Browser-support
  policy (baseline + progressive extras), §Constraints — inherited, not re-decided.
- [MDN `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) — `showModal()`
  focus handling, `cancel`/`close` events, `::backdrop`. Native focus-return on close is the AC #1
  mechanism.
- [MDN `@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) —
  pair with `transition-behavior: allow-discrete` exactly as `.dock-panel` does.
- WAI-ARIA combobox pattern (input + listbox + `aria-activedescendant`) — the filter input keeps
  DOM focus; options are marked with `aria-selected`.

### Patterns to Follow

**DOM building** — `inspect.mjs` lines 42–52 `el()` helper: attributes object, `text` via
`textContent`, never `innerHTML` in module code. Copy the helper into `palette.mjs` (the repo
copies this ~10-liner per module rather than sharing it — see glossary/agentic-renderer note).

**Fire-once analytics** — `analytics.mjs:259` `trackToolInspect`: module-level boolean, static
literal path, `try { history.pushState } catch { return; }`, `setTimeout(restore, RESTORE_DELAY_MS)`.

**Entrance transition** — `portfolio.css:980` `.dock-panel`: base rule holds hidden state,
`.is-open`/`[open]` holds shown state, `@starting-style` supplies the entry frame,
`display ... allow-discrete` in the transition list, spring token on transform. For a modal
`<dialog>` the discrete toggle is the `[open]` attribute itself.

**Node-import safety** — every `system/*.mjs` guards top-level DOM access
(`if (typeof document !== "undefined") init()`), because `tooling/build-checks.mjs` imports
modules under Node. `palette.mjs` must self-init behind the same guard.

**Classic-script chrome** — `site.js` is an IIFE with template-string `innerHTML` + `esc()`; the
hint is static markup inside the existing header template literal, matching that style.

---

## IMPLEMENTATION PLAN

### Phase 0: Branch

`git fetch origin && git checkout -b feature/command-palette-168 origin/main`. The shared worktree
may hold other sessions' untracked files (`.claude/plans/*-165.md`, `-166.md`) — never `git add -A`;
stage by explicit path (memory: shared-worktree-parallel-sessions).

### Phase 1: The palette module + one-line inspect accessor

`system/palette.mjs` complete and working when loaded on one page, plus the `inspect.mjs` export
it drives.

### Phase 2: Chrome hint + CSS + page wiring

`site.js` hint, `components.css` dialog styles, `portfolio.css` hint styles, script tag on all 10
pages, `analytics.mjs` tracker.

### Phase 3: Regeneration cascade

**Depends on:** Phases 1–2 (files exist, at-rest page is final).
param-manifest entries → `gen-param-count` → `gen-loc-summary` → `gen-handoff` + `gen-pack-bundle`
(components.css ships in the pack — memory: token-change-regen-handoff-pack applies to ANY pack
file) → `tooling/drift-check.mjs` green.

### Phase 4: Validation + VR baselines

**Depends on:** Phase 3.
Cross-engine functional pass (chromium/firefox/webkit), then `update:docker` regen of the 16
chrome baselines from a clean worktree.

---

## STEP-BY-STEP TASKS

### ADD `system/inspect.mjs` — export the live handle

- **IMPLEMENT**: one line near `let current = null;` (line 56):
  `export const getInspect = () => current;` — the palette does
  `(getInspect() ?? initInspect()).toggleInspect()`. Do NOT have the palette call `initInspect()`
  unconditionally: it destroys and rebuilds the page's live handle (and hides an open bubble).
- **GOTCHA**: `initInspect()` self-runs on load only where the page includes the script tag
  (today: index.html). On other pages the palette lazy-imports the module, whose
  `if (typeof document !== "undefined") initInspect()` footer runs at import time — so after
  `await import("./inspect.mjs")`, `getInspect()` is already non-null. The `?? initInspect()` is
  belt-and-braces.
- **VALIDATE**: `node -e "import('./system/inspect.mjs').then(m => { if (typeof m.getInspect !== 'function') process.exit(1); })"`
  (Node-safe: no DOM touched at import).
- **SATISFIES**: AC #3.

### CREATE `system/palette.mjs`

- **IMPLEMENT** (~200–250 lines, header comment citing epic #164 ticket #168 + architecture
  §New pieces "Command palette" row):
  1. **Mount**: build a `<dialog class="cmdk" aria-label="Command palette">` via the `el()`
     helper: a search `<input class="cmdk-input" type="text" role="combobox" aria-expanded="true"
     aria-controls="cmdk-list" aria-activedescendant=…>`, a `<ul id="cmdk-list" role="listbox">`,
     an empty-state line ("No matching command"). Append to `document.body`. Self-init behind
     `typeof document !== "undefined"`.
  2. **Command list** (static array, built once at mount):
     - *Navigate — pages*: Home `/`, Approach `/approach.html`, Factory `/factory.html`,
       Work `/work.html`, Contact `/contact.html`, Build a pattern `/build.html`,
       Round-trip evidence `/roundtrip.html`, Verdant prototype `/proto/verdant.html`,
       Fieldwork prototype `/proto/fieldwork.html`. **Copy the exact hrefs from
       `client.neutral.config.js`'s nav + footer site index** (#148) — do not invent URL forms.
       Omit or mark the current page (compare `location.pathname`, treating `/` and
       `/index.html` as one).
     - *Navigate — exhibits* (page + hash, real ids verified on main): Approach → derive probe
       `#asrc-probe`, code-at-scale `#loc-proof`, live-control count `#param-proof`; Factory →
       agents trace `#agents`, round-trip `#round-trip`, system shape `#shape`; Work → library
       `#library`, handoff `#handoff`; Home → verify `#verify`. Cross-page hash nav = plain
       `location.assign("/factory.html#shape")`; same-page = set `location.hash` then `close()`.
     - *Toggle inspect* — **presence-gated**: include only if
       `document.querySelector("[data-inspect]")` exists (today: home). Handler: lazy
       `import("./inspect.mjs")`, then `(m.getInspect() ?? m.initInspect()).toggleInspect()`;
       close the dialog. Label reflects state via `document.documentElement.dataset.inspectMode`
       ("Turn inspect mode on/off") — re-read at each open, not cached.
     - *Start a build* — `location.assign` to /build (skip when already on it).
     - *Copy tokens* — **presence-gated** on `document.querySelector(".dock-copy")` (the 8
       chrome pages): handler clicks that button (dock.mjs:386 owns the pack-aware
       derived/imported/committed branching — delegating is the no-fork rule; its "Copied ✓"
       label flip happens inside the closed dock, accepted), then closes.
     - *Download the pack* — available everywhere: `el("a", { href: "/handoff/verdant/pack.bundle.json", download: "pack.bundle.json" })`,
       `.click()` (same-origin static file; the /handoff.html download's source of truth).
  3. **Open/close**: `window.addEventListener("keydown", …)` — `(e.metaKey || e.ctrlKey) &&
     e.key.toLowerCase() === "k"` → `e.preventDefault()`, toggle. Open = `dialog.showModal()`,
     clear input, render full list, select index 0, then `trackToolPalette()` — the tracker
     call sits AFTER `showModal()` succeeds, the one path that means the palette is really on
     screen (success-path discipline). Native dialog close returns focus to the invoker.
  4. **Filter**: `input` event re-renders the list through a fuzzy subsequence matcher
     (case-insensitive; score = subsequence match with word-start bonus + earlier-match bonus;
     ~15 lines, no dependency). Empty query = full list in authored order.
  5. **Keyboard**: ArrowDown/ArrowUp move the active option (wrap), Enter runs it, focus stays
     in the input (`aria-activedescendant` tracks the active option id). Click on an option runs
     it. Escape = native cancel.
  6. **GOTCHA — Escape underneath**: dock.mjs:455 and site.js:86 listen for Escape on
     document/window; a modal dialog does NOT stop propagation. Add
     `dialog.addEventListener("keydown", (e) => { if (e.key === "Escape") e.stopPropagation(); })`
     so closing the palette never also closes an open dock (`#appearance`) or the mobile menu.
     (The build-journey "dock mid-flow" scenario is exactly this collision.)
  7. **Hint wiring**: `const hint = document.querySelector("[data-palette-open]"); if (hint) {
     hint.hidden = false; hint.addEventListener("click", openPalette); }` — proto pages have no
     chrome, `hint` is null, keyboard-only there (AC #1 still holds).
  8. Import `trackToolPalette` from `./analytics.mjs` (node-safe module, fine on proto pages).
- **GOTCHA**: no `Math.random()`/`Date.now()` needs; no innerHTML; all visible text via
  `textContent`. Keep the module inert under Node import (all wiring inside the init function).
- **VALIDATE**: `node -e "import('./system/palette.mjs').then(() => console.log('node-safe ✓'))"`
  then serve (`node tooling/visual-regression/serve.mjs &`) and drive
  `http://127.0.0.1:4757/contact.html` in a real browser: ⌘K opens, type "fact", Enter lands on
  factory.html, ⌘K → Esc closes with focus back on body/hint.
- **SATISFIES**: AC #1, #3, #5 (mechanism), architecture "hand-write ~150 lines" decision.

### ADD `system/analytics.mjs` — `trackToolPalette()`

- **IMPLEMENT**: mirror `trackToolInspect` (lines 244–271) verbatim in shape:
  `const TOOL_PALETTE_PATH = "/tool/palette"; let toolPaletteFired = false;` + exported function
  with the same guarded pushState/replaceState pair and a block comment stating: fired once per
  page visit by palette.mjs's open success path (after `showModal()` returns), never from the
  keydown alone; static literal is the whole payload; simple shape not flipTo because opening the
  palette does not navigate (§Analytics milestones).
- **PATTERN**: `system/analytics.mjs:247–271`.
- **VALIDATE**: `node -e "import('./system/analytics.mjs').then(m => { if (typeof m.trackToolPalette !== 'function') process.exit(1); console.log('✓'); })"`
- **SATISFIES**: AC #5.

### UPDATE `system/site.js` — the ⌘K hint (hidden until palette.mjs claims it)

- **IMPLEMENT**: inside the header template literal (site.js:40–59), after the `.nav-toggle`
  button, add:
  `<button class="nav-palette-hint" type="button" data-palette-open hidden aria-label="Open the command palette (Ctrl+K / ⌘K)"><kbd>⌘K</kbd></button>`
  Static "⌘K" text on every platform (deterministic — the Linux VR baselines and a macOS visitor
  must render identical chrome; the aria-label carries both bindings).
- **GOTCHA**: `hidden` + author CSS — memory `hidden-defeated-by-author-display`: the
  `.nav-palette-hint` rule must NOT set `display` in its base selector (style via
  `.nav-palette-hint:not([hidden]) { display:inline-flex; … }` or keep the base rule display-free).
  This hidden-until-wired mechanism is what keeps `instance.html` (loads site.js, will NOT load
  palette.mjs) free of a dead button — do not "simplify" it away.
- **VALIDATE**: serve + open `/instance.html` → no visible hint; `/approach.html` → hint visible,
  click opens the palette.
- **SATISFIES**: AC #2.

### ADD `system/components.css` — palette dialog styles (token-only)

- **IMPLEMENT**: a `.cmdk` block at the end of components.css: fixed-width dialog
  (`width:min(560px, calc(100vw - 2*var(--spacing-lg)))`), top-aligned (`margin-top` ~15vh),
  `background: var(--color-bg-surface)`, `border: 1px solid var(--color-border)`,
  `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-lg)`; `::backdrop` with a
  translucent scrim; input row; `.cmdk-item` rows with `[aria-selected="true"]` marked by
  background + border (never colour alone); entrance mirroring `.dock-panel` (portfolio.css:980):
  base `[open]` state + `@starting-style { .cmdk[open] { opacity:0; transform:translateY(8px) scale(.98); } }`
  + `transition: opacity var(--motion-base) var(--motion-ease), transform var(--motion-base) var(--motion-ease-spring), overlay var(--motion-base) allow-discrete, display var(--motion-base) allow-discrete;`
  and a scoped reduced-motion off-ramp:
  `@media (prefers-reduced-motion: reduce) { .cmdk, .cmdk::backdrop { transition-duration: 0.01ms; } }`
  — components.css has no global kill-switch (portfolio.css:16–23 doesn't reach proto pages), so
  the palette carries its own.
- **WHY components.css, not portfolio.css** (ticket estimate said portfolio.css): proto pages
  load only contract/neutral/components/proto sheets — AC #1 ("every shipped page") is unmeetable
  from portfolio.css without loading it on protos (its global element rules would restyle them).
  components.css is layer 3, token-only, loaded by all 10; the palette qualifies. Consequence:
  the sheet ships in the handoff pack → regen cascade task below. Semantic-token discipline is a
  hard rule here — no brand literals.
- **PATTERN**: `.dock-panel` entrance portfolio.css:973–1010; row vocabulary `.dock-pack-row`.
- **VALIDATE**: `node tooling/token-lint.mjs` (if it lints components.css it must stay green);
  open the palette under the saulera pack (dock switch) — it re-skins with zero CSS edits.
- **SATISFIES**: AC #1 (styling everywhere), #165 inheritance (spring + @starting-style + off-ramp).

### ADD `system/portfolio.css` — hint chrome styles

- **IMPLEMENT**: `.nav-palette-hint` styled as a quiet keyboard chip in the nav row (caption-size
  `<kbd>`, `var(--color-fg-muted)`, 1px `var(--color-border)` border, min 44px hit target,
  `:hover`/`:focus-visible` per `.dock-pack-row` conventions); hidden below 640px
  (`@media (max-width:640px){ .nav-palette-hint { display:none; } }` — keyboard affordance,
  pointless in the mobile menu); an `on-ocean` variant if the ocean header needs contrast
  (check `index.html`'s `data-header` value and the existing `.on-ocean` rules).
- **GOTCHA**: base rule display-free or `:not([hidden])`-guarded (see site.js task).
- **VALIDATE**: eyeball `/` (ocean header?) and `/approach.html` at 1280px and 600px widths.
- **SATISFIES**: AC #2.

### UPDATE all 10 shipped pages — load the module

- **IMPLEMENT**: `<script type="module" src="/system/palette.mjs"></script>` added to the script
  block of: `index.html`, `approach.html`, `factory.html`, `work.html`, `contact.html`,
  `404.html`, `build.html`, `roundtrip.html`, `proto/verdant.html`, `proto/fieldwork.html`
  (absolute `/system/` path — proto pages live one dir down). Place after the existing module
  scripts, matching each page's ordering convention (e.g. approach.html:218–222). **NOT
  instance.html.**
- **VALIDATE**: `for p in / /approach.html /factory.html /work.html /contact.html /404.html /build.html /roundtrip.html /proto/verdant.html /proto/fieldwork.html; do …⌘K opens…; done`
  — concretely, the cross-engine script (task below) asserts open on all 10; spot-check two by
  hand now.
- **SATISFIES**: AC #1.

### UPDATE `system/param-manifest.json` + regen the counting cascade

- **IMPLEMENT**: three entries under the `chrome` pseudo-page (the dock precedent; add a note
  that the palette mounts on all 10 pages, hint on the 8 chrome-bearing):
  `{ "page": "chrome", "selector": "[data-palette-open]", "label": "command palette ⌘K hint" }`,
  `{ "page": "chrome", "selector": ".cmdk-input", "label": "command palette type-to-filter" }`,
  `{ "page": "chrome", "selector": ".cmdk-list", "label": "command palette command list (arrows + Enter = one control)", "note": "conditional — inside the ⌘K dialog" }`.
  Then regen, in order:
  1. `node agent-layer/gen-param-count.mjs` (approach renders the new total)
  2. `node agent-layer/gen-loc-summary.mjs` (new tracked file `system/palette.mjs` — memory:
     counts TRACKED content, so `git add system/palette.mjs` and every edited file FIRST, then
     regen; `--check` before staging lies)
  3. `node agent-layer/gen-handoff.mjs` && `node agent-layer/gen-pack-bundle.mjs` (components.css
     ships in the pack + bundle — skipping this turns the CI `verify` drift-check red)
  4. `node tooling/drift-check.mjs` → green.
- **GOTCHA**: memory `drift-check-mid-merge-false-positive` — run on a clean staged tree.
- **VALIDATE**: `node tooling/drift-check.mjs` exits 0; `git diff --stat` shows
  `param-count.json`, `loc-summary.json`, `handoff/verdant/*` regenerated, never hand-edited.
- **SATISFIES**: AC #4 precondition + CLAUDE.md "new live control → manifest entry same PR".

### CREATE scratchpad cross-engine journey script (not committed)

- **IMPLEMENT**: `<scratchpad>/palette-journey.mjs` following `tooling/build-journey.mjs:30–45`
  (createRequire from `tooling/visual-regression/node_modules` → `@playwright/test`; serve on
  :4757). Per engine (chromium, firefox, webkit) assert:
  1. On each of the 10 pages: Ctrl-K (use `Control+k` — Playwright on Linux/mac; also assert
    `Meta+k` on webkit) opens `dialog.cmdk[open]`; type a fragment → list filters; Escape closes
    AND `document.activeElement` returns to the invoker; focus trapped inside while open.
  2. On approach.html: hint button visible, `Enter`/click opens the dialog (AC #2).
  3. On index.html: run the toggle-inspect command → `document.documentElement.dataset.inspectMode === "on"`;
    run again → off (AC #3).
  4. Analytics one-shot: stub `history.pushState` counting calls to `/tool/palette`; open the
    palette twice → exactly one call; load a page, press only arrows/other keys → zero (AC #5,
    both directions — the check must be able to fail; memory: check-that-cannot-fail).
  5. Dock collision: open `#appearance`, then ⌘K, then Escape → palette closed, dock STILL open.
  6. Enter on a navigate command actually lands on the target pathname+hash.
- **GOTCHA**: memory `headless-render-data-pages-worker-refused` — proto/factory pages log
  Worker connection refusals under static serve; expected, not a failure.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs & node <scratchpad>/palette-journey.mjs`
  → every engine all-✓; paste the summary into the implementation report.
- **SATISFIES**: AC #6, and functionally AC #1/#2/#3/#5.

### Regenerate the 16 chrome-bearing VR baselines

- **IMPLEMENT**: from a CLEAN detached worktree under `/Users` (memories:
  vr-gate-reads-working-tree, visual-regression-baseline-trap):
  `git worktree add /Users/Berzins/vr-regen-168 <branch-head>` → `cd tooling/visual-regression`
  in that worktree → `npm ci` → `npm run update:docker`. Expect exactly the 16 chrome pages ×
  {neutral, saulera} to churn (hint in the header + approach's new param-count number); the two
  proto pages must NOT churn (no chrome, palette closed at rest — if they do, investigate before
  committing). Memory `vr-update-skips-subperceptual`: if a page's only change is the approach
  digits and the run skips it, `rm` that PNG and re-run.
- **GOTCHA**: memory `vr-gate-approach-countup-flake` — approach uses live countUp; a
  "two consecutive stable screenshots" failure there is the known flake, retry. Local macOS runs
  of the gate show 16-failed = platform, not regression (memory: local-agent-visual-gate-notes) —
  only the Docker/CI result counts.
- **VALIDATE**: the `update:docker` run's own `npx playwright test` pass is green; after commit +
  push, `gh pr checks` visual job green (memory: local Docker pass ≠ CI green — confirm on CI).
- **SATISFIES**: AC #4.

### Commit, PR, report

- **IMPLEMENT**: stage by explicit path. Atomic commit(s) per repo convention, e.g.
  `feat(palette): ⌘K command palette — navigate + inspect + actions, chrome hint (#168)`.
  Write `.claude/reports/command-palette-168.md` (cross-engine summary verbatim). PR body carries
  **`Closes #168`** (memory: prs-dont-auto-close-tickets). Plan + report + review artifacts in the
  same PR.
- **VALIDATE**: `gh pr view --json body | grep "Closes #168"`; CI `verify` + `visual` green.
- **SATISFIES**: repo git conventions.

---

## TESTING STRATEGY

No test suite exists (CLAUDE.md: "don't hunt for or invent one"). Validation is:

### Pure / Node level
- Node-import safety of `palette.mjs`, new exports on `analytics.mjs`/`inspect.mjs` (one-liners
  above). `tooling/build-checks.mjs` still green (it imports shipped modules — palette isn't in
  its groups, but the run proves no import graph broke).

### Browser level (the real gate)
- The scratchpad cross-engine journey (chromium + firefox + webkit) — assertions enumerated in
  its task, each phrased so it CAN fail (one-shot analytics asserted in both directions; Escape
  collision asserted with the dock genuinely open).

### Edge cases (drive by hand or fold into the journey)
- ⌘K pressed while focus is inside an input (build's question radios, home's brand colour) —
  palette still opens; the keydown must be intercepted globally, and Escape-stopPropagation must
  not break the input's own semantics after close.
- Query matching nothing → empty state visible, Enter does nothing.
- Open → filter → Escape → reopen: query cleared, selection reset to 0.
- Rapid double ⌘K (toggle) — no `showModal()` on an already-open dialog (throws
  InvalidStateError; guard with `dialog.open`).
- `prefers-reduced-motion: reduce` → instant open/close (DevTools emulation).
- Toggle-inspect command absent on contact.html (no `[data-inspect]`), present on index.html.
- Copy-tokens command absent on proto pages (no dock), present on the 8 chrome pages.
- instance.html: no hint, no palette (module not loaded) — nothing half-dead.

## VALIDATION COMMANDS

### Level 1: module sanity
```
node -e "import('./system/palette.mjs').then(()=>console.log('✓ node-safe'))"
node tooling/token-lint.mjs
node tooling/build-checks.mjs
```
### Level 2: generators + drift
```
git add <every touched path> && node agent-layer/gen-param-count.mjs && node agent-layer/gen-loc-summary.mjs && node agent-layer/gen-handoff.mjs && node agent-layer/gen-pack-bundle.mjs && node tooling/drift-check.mjs
```
### Level 3: cross-engine functional
```
node tooling/visual-regression/serve.mjs &
node <scratchpad>/palette-journey.mjs        # all three engines, all ✓
```
### Level 4: manual
Serve → on each of the 10 pages ⌘K/Ctrl-K; hint on the 8 chrome pages; saulera pack re-skin of
the open palette; reduced-motion emulation; instance.html shows nothing new.
### Level 5: VR
```
# in the clean /Users worktree:
cd tooling/visual-regression && npm ci && npm run update:docker
# after push:
gh pr checks
```

## ACCEPTANCE CRITERIA (from #168)

- [ ] 1. ⌘K/Ctrl-K opens on every shipped page; type-to-filter; Enter executes; Escape closes
      with focus returned (native dialog semantics).
- [ ] 2. Chrome hint visible and keyboard-activatable on all chrome-bearing pages.
- [ ] 3. Toggle-inspect command flips inspect mode live (on index.html, today's only mount).
- [ ] 4. All 16 chrome baselines regenerated in the same PR; VR green **on CI**.
- [ ] 5. `/tool/palette` fires exactly once, only on real use (asserted both directions).
- [ ] 6. Works in Chromium + Firefox + WebKit (journey script, summary in the report).
- Plus repo discipline: manifest entries + full regen cascade in the same PR; `Closes #168`.

## COMPLETION CHECKLIST

- [ ] All tasks executed in order, each validation run at the time
- [ ] drift-check green on the staged tree
- [ ] Cross-engine journey: 3 engines × all assertions ✓ (pasted into the report)
- [ ] VR: exactly 16 baselines churned, proto ×4 untouched, CI visual green
- [ ] No hand-edits to any generated file
- [ ] Plan + report (+ review) committed in the PR; body carries `Closes #168`

## OPEN QUESTIONS / ASSUMPTIONS

1. **Dialog CSS in `components.css`** (ships in the handoff pack) vs a new `system/palette.css`
   linked from all 10 pages. This plan chose components.css — single shared sheet, token-only
   discipline fits, regen cascade handled. If the owner objects to `.cmdk` appearing in the
   handoff pack's component sheet, switch to `system/palette.css` + one extra `<link>` per page
   (cascade shrinks: no gen-handoff/gen-pack-bundle, but loc-summary still regens).
2. **"Download the pack" =** `/handoff/verdant/pack.bundle.json` (the /handoff.html download).
   Assumed; if the intended artifact is the current pack's tokens CSS instead, that's the dock's
   copy path — do not fork it.
3. **Static "⌘K" hint text on all platforms** (aria-label names both bindings). Assumed for VR
   determinism; a platform-conditional label would make Linux baselines diverge from what a mac
   visitor sees.
4. **Copy-tokens delegates to `.dock-copy`** — its "Copied ✓" feedback lands inside the closed
   dock (invisible). Accepted tradeoff v1; visible palette-side feedback would mean forking the
   pack-aware branching, which the no-fork rule forbids.
5. Assumed the palette counts as 3 manifest entries under `chrome` per the granularity rules; if
   review reads the rules differently (e.g. the list isn't a control), regen shifts the total by
   1 — mechanical.

## NOTES (open canvas)

- **Why hidden-hint instead of site.js knowing about instances**: site.js is shared verbatim by
  instance.html and every `build-instance.mjs` deploy. Any palette awareness in site.js would
  need an instance escape hatch; a `hidden` attribute the palette module removes needs none —
  absence of palette.mjs IS the flag.
- **Why presence-gated commands**: the honesty contract. "Toggle inspect" on contact.html (zero
  mounts) would be a control that does nothing visible — the exact anti-pattern the epic exists
  to remove. Gating on `[data-inspect]` also means wave tickets #169+ light the command up page
  by page with zero palette edits.
- **Why not flipTo for /tool/palette**: flipTo exists because /build's virtual routes collide
  with hash-restoring disclosures and share-link building (#149/#162). Opening the palette
  doesn't navigate and builds no URLs; architecture §Analytics milestones pins the simple shape.
- **Rejected: committing the journey script as `tooling/palette-journey.mjs`.** #166 set the
  precedent (scratchpad script, results in the report); build-journey earned committed status
  because /build is ~1,300 lines of state machine. If a reviewer asks for it committed, it's a
  move, not a rewrite. Revisit at #177 (epic close) where an INP/journey harness may consolidate.
- **VR churn accounting**: hint churns all 16 chrome baselines (header, every page); approach's
  pair also carries the new param-count + loc-summary digits (within-tolerance risk → the
  `rm`-to-force note). Proto ×4 must stay byte-identical — that's the regression tripwire for
  "palette leaked at-rest pixels".
- **⌘K vs browser conflicts**: Ctrl-K is Chrome's search-bar shortcut only in the omnibox, not
  page context; Firefox's Ctrl-K focuses the address-bar search — `preventDefault()` on the
  page-level keydown wins while the page has focus. This is standard palette behaviour
  (GitHub/Linear do the same).

## AMENDMENTS

<!-- append-only; newest at the bottom -->
