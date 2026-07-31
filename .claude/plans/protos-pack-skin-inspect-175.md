# Feature: Wave 4 — Protos: pack skin + dock on Verdant/Fieldwork + inspect coverage (#175)

The following plan should be complete, but validate documentation and codebase patterns and task
sanity before you start implementing. Pay special attention to naming of existing utils and ids.
Import from the right files.

## Feature Description

The two data-connected prototype pages (`proto/verdant.html`, `proto/fieldwork.html`) join the
site's re-skin + inspection story: the appearance dock mounts on them (pack switch re-skins the
vd-/fw- components live — the proof the token contract holds), `pack-boot.js` restores the
reader's persisted pack pre-paint, the inspect engine (#166) instruments the proto components,
and the framing prose gets the epic's dual-register copy cut. A spike proves (or bounds) inspect
across one shadow-DOM wc wrapper before rollout.

## User Story

As a hiring manager or senior UXE doing a verification pass
I want to switch packs and inspect components on the prototype pages themselves
So that the "one line re-skins everything, including real prototypes" claim is demonstrated
under my own cursor instead of asserted in copy.

## Problem Statement

The proto pages are the site's most "product-like" surfaces, yet they are the only shipped pages
that neither wear the reader's pack pick nor expose the inspect layer. A reader who picked
saulera on home sees the protos snap back to neutral — the exact opposite of the contract's
claim. (This inconsistency is visible today even in work.html's proto iframes.)

## Solution Statement

Extend the existing primitives — never fork them: add `pack-boot.js` + `dock.mjs` to the two
proto heads/bodies (dock gated to top-window so work.html's embeds carry no nested chrome),
move the dock/ruler/inspect CSS from `portfolio.css` into `components.css` (the #168 `.cmdk`
precedent — proto pages already load `components.css`), instrument the proto templates with
`data-inspect` ids that already exist in the generated graph, add the two fw-/proto ROLES lines
+ regenerate `inspect-data.json`, add param-manifest entries, cut the framing copy dual-register,
and regenerate exactly the churned VR baselines.

## Out of Scope / Non-Goals

- Not included: action-bus state toggles + resizable device frame (that is #176, which depends
  on this ticket).
- Not included: instrumenting the agentic-slot *contents* on fieldwork (renderer output from
  `agentic-renderer.mjs` is untouched — mounts go on the human-fixed chrome only).
- Not changing: `agentic-renderer.mjs`, `action-bus.mjs`, the proto pages' data flow,
  `scenario-data.mjs` degradation, or the wc wrappers' shadow CSS.
- Not adding: a pack-switch command to the palette (owner decision, epic round 4).
- Not changing: `system/wc/demo.html` (its "plain page, no components.css" claim stands; the
  shadow spike runs in a scratch harness — see Phase 0).

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: proto pages, pack-boot/dock chrome, inspect engine + generated
inspect data, system-graph (regenerated), param manifest/count, VR baselines
**Dependencies**: none new (all vanilla; #166 inspect engine and #168 palette are merged)

## Related Work

**Implements**: [#175](https://github.com/linardsb/ux-factory/issues/175) — PR body must carry
`Closes #175`   ·   **Epic**: #164, `docs/epics/prototyping-feel-uplift.prd.md` +
`.architecture.md` (§"Constraints that shape implementation" → "Pack skin on protos (Wave 4
decision)"; §Risks → "Inspect on shadow-DOM wc/ components")

**Back-references**:
- #166 / PR #180 — inspect engine + `gen-inspect-data.mjs`; this ticket adds ROLES lines and mounts.
- #168 / PR #183 — palette already on proto pages; its `.cmdk` CSS in `components.css` is the
  delivery precedent this plan follows; its one-line graph-header fix (commit 54ab337) is the
  header format the moved blocks must use.
- #167 — param manifest counting rules (its `$description` is normative).

**Forward-references**:
- #176 (Wave 4b) builds directly on this ticket's dock/inspect presence on the protos.
- #173 (Factory) will churn factory baselines again — the factory churn this ticket causes
  (graph gains consumers) is documented, not hidden.

**Owner decisions taken at planning (2026-07-31, AskUserQuestion):**
1. **CSS delivery = move to `components.css`** (cmdk precedent; graph honesty). Accepted
   consequence: `system-graph.json` gains dock/ruler/inspect consumer blocks → factory.html's
   #shape exhibit changes → **factory ×2 baselines regenerate too**. This is a documented
   deviation from AC2's letter ("only proto baselines") — state it in the PR body and report.
2. **Dock suppressed inside iframes**: proto pages import `dock.mjs` only when
   `window.self === window.top`. `pack-boot.js` still runs in the work.html embeds, so they
   follow the reader's pick (fixes today's neutral-embed inconsistency) but carry no nested chrome.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `system/pack-boot.js` (whole file, esp. header comment lines 25–31) — Why: the LOAD-BEARING
  "last element in `<head>`" constraint; the committed-pack allowlist at line 69 (`saulera |
  verdant | plusui` — no change needed, no new packs); header says "eight pages" → becomes ten.
- `system/dock.mjs` (lines 1–50, 70–82, 195–290) — Why: self-mounts on import; `PACKS` +
  `PACK_RE` (line 47) already carry all four packs — **no edit needed** to either; `packLink()`
  finds the `tokens.neutral.css` line the protos already have; header comment lists the mounting
  pages (line 6–9) → update the list. `buildRuler()` bails under 3 `main > section` — protos
  have 1, so no ruler mounts (nothing to suppress).
- `system/inspect.mjs` (whole file) — Why: the engine; `data-inspect` triggers +
  `[data-inspect-toggle]` buttons; unknown id throws at activation; self-inits as page script.
- `agent-layer/gen-inspect-data.mjs` (ROLES map lines 26–49) — Why: ROLES keys must name
  system-graph consumer ids; vd-* keys already exist; fw- key to add is exactly
  `fw-fieldwork-dispatch-board-chrome-human-fixed-canvas` (verify against
  `system/system-graph.json` consumer ids after regen).
- `agent-layer/gen-system-graph.mjs` (lines 67–85) — Why: block-header regex
  `^\/\* -{5,} (.+?) -{5,} \*\/$` is **single-line**; a multi-line header is invisible and its
  rules get swallowed into the previous block (the exact bug commit 54ab337 fixed for `.cmdk`).
- `system/portfolio.css` (lines ~752–804 inspect bubble+toggle; ~925–1148 dock + ruler +
  `@media (max-width:1099px)` + `@media print` hiders) — Why: the exact rule ranges to MOVE.
  The dock section's prose comment documents the z-index ladder — move it along.
- `system/components.css` (lines 1736–2205: the vd-*/fw-*/cmdk blocks) — Why: header format
  `/* ---------- Label ---------- */` and where the moved blocks land (after cmdk, end of file).
- `proto/verdant.html` (head lines 19–22; templates lines ~88–145; toggle-target
  `.proto-head` lines ~30–40) — Why: `tokens.neutral.css` link already present (the pack line
  dock/pack-boot re-point); template literals where `data-inspect` attrs go.
- `proto/fieldwork.html` (head; board template lines ~85–165) — Why: same; fw- chrome elements
  (`fw-toolbar`, `fw-panel`) take the single fw- id; agentic slots stay untouched.
- `index.html` (lines 17, 123, 131, 409–420) — Why: the canonical wiring pattern — pack-boot in
  head, `data-inspect` on an element, the `.inspect-toggle-row` button markup to mirror, script
  order at body end (dock before inspect before palette).
- `tooling/drift-check.mjs` (lines 90–118) — Why: 2f scans **all tracked `*.html`** with a regex,
  so `data-inspect` inside the protos' inline template literals IS checked; every id must exist
  in `inspect-data.json`.
- `tooling/visual-regression/visual.spec.mjs` (lines 1–90, 120–177) — Why: PAGES rows 66–67
  (proto entries, `kind: 'proto'`), `PACKS` = neutral + saulera (4 proto baselines total), the
  pack swap keys on the **literal neutral URL** route intercept (line 89) — pack-boot's empty-
  storage no-op is what keeps this valid; proto pre-resize at line 124.
- `system/param-manifest.json` ($description + chrome entries) — Why: counting rules; dock note
  "(it mounts on 8 of the 10 pages…)" and "proto/fieldwork … zero controls" both become stale.
- `system/palette.mjs` (lines 116–131, 138–142) — Why: nothing to edit — "Toggle inspect" and
  "Copy tokens" commands light up automatically on the protos once `[data-inspect]` mounts and
  `.dock-copy` exist. Verify, don't wire.
- `system/wc/vd-plant-card.mjs` + `system/wc/demo.html` — Why: the spike subject (shadow DOM
  wrapper) and the markup to copy into the scratch harness.
- `CLAUDE.md` (architecture-map lines for pack-boot, dock, proto/) — Why: both entries encode
  the page lists ("six IA pages"; "five-page IA + 404 + roundtrip") — update in the same PR.

### New Files to Create

- `.claude/reports/protos-pack-skin-inspect-175.md` — execution report incl. the shadow-spike
  findings (AC3 requires them recorded).
- Scratchpad only (not committed): `spike-shadow-inspect.html` + a small Playwright driver —
  see Phase 0.

No new shipped files — everything extends existing ones.

### Relevant Documentation

- `docs/epics/prototyping-feel-uplift.architecture.md` — §"Pack skin on protos (Wave 4
  decision)" and §"Risks / spikes" (shadow-DOM inspect). Why: inherited constraints; the spike
  is mandated there.
- Repo memories that bite here: `visual-regression-baseline-trap`, `vr-gate-reads-working-tree`
  (update:docker from a **clean detached worktree under /Users**), `vr-update-skips-subperceptual`
  (rm a PNG to force rewrite), `vr-tolerance-hides-text-changes` (green ≠ unchanged),
  `headless-render-data-pages-worker-refused` (AC4: ERR_CONNECTION_REFUSED to :8787 is expected
  fixture degradation), `cross-engine-motion-verify` (3-engine functional checks via the VR
  worktree's Playwright), `loc-summary-counts-tracked-only` (run `--check`, CI verify gates it).

### Patterns to Follow

**Graph-visible CSS block header (single line, from components.css):**
```css
/* ---------- Appearance dock + scroll ruler — site chrome (system/dock.mjs) ---------- */
```
Prose/why comments go on separate lines *below* the header, never inside it.

**Top-window-gated module load (proto pages, dock only):**
```html
<script type="module">
  if (window.self === window.top) import("/system/dock.mjs");
</script>
```

**Inspect toggle markup (mirror index.html:131):**
```html
<button type="button" class="btn btn-secondary inspect-toggle" data-inspect-toggle aria-pressed="false">Inspect this surface</button>
```

**data-inspect in a template literal (drift-check-scannable — keep the attribute value a static
literal, never interpolated):**
```js
const plantCard = (p) => `
  <a class="vd-plant-card…" data-inspect="vd-plant-card" …>
```

**Head order on proto pages (pack-boot LAST in head — load-bearing):**
```html
  <link rel="stylesheet" href="/system/proto.css" />
  <script src="/system/pack-boot.js"></script>
</head>
```

---

## IMPLEMENTATION PLAN

### Phase 0: Spike — inspect across one wc wrapper's shadow boundary — ✅ RUN AT PLANNING

Architecture §Risks mandated this BEFORE rolling mounts across both pages. (Note the proto
pages themselves use **light-DOM vd-/fw- classes** — the shadow question only exists for the
`system/wc/` wrappers, which no shipped page mounts. The spike bounds the question; the rollout
path is light-DOM and unaffected.)

**Status: already executed during planning (2026-07-31)** — scratch harness
(`spike-shadow-inspect.html` + `spike-driver.mjs`, kept in the session scratchpad) mounting one
`<vd-plant-card>` (data via its `data` property, `data-inspect="vd-plant-card"` on the HOST) +
`[data-inspect-toggle]` + `/system/inspect.mjs`, driven by Playwright from
`tooling/visual-regression/node_modules` over `serve.mjs`. Results, verbatim:

```
chromium  pos=anchor tokens=11 empty=0 meas="420×68px · font 16px · padding 0px" sample=["16px","8px","#f4f4f5"] errors=none
firefox   pos=anchor tokens=11 empty=0 meas="420×68px · font 16px · padding 0px" sample=["16px","8px","#f4f4f5"] errors=none
webkit    pos=anchor tokens=11 empty=0 meas="420×68px · font 16px · padding 0px" sample=["16px","8px","#f4f4f5"] errors=none
```

**Findings (paste into the execution report — AC3):**
1. **PASS on all three engines.** All 11 of the wrapper's spec-head tokens resolve to real
   values via `getComputedStyle(host)` — custom-property inheritance pierces the shadow
   boundary exactly as the wrapper's own header claims. Zero console errors. All three engines
   took the anchor-positioned branch.
2. **Bounded limitation:** measurements report the HOST box only — `padding 0px` while the
   shadow-internal `.card` carries real padding. A future wc mount's role copy must not imply
   shadow-internal measurements; token values and outer box are honest, internals invisible.
3. **Harness-only artifact (not a bug):** without the `.inspect-bubble` anchor-positioning CSS
   the popover lands centered over the trigger and intercepts pointer events — confirming the
   bubble's CSS must travel with the engine wherever it mounts (exactly what Phase 1's move to
   `components.css` guarantees for the protos).

**Remaining task:** none, unless `inspect.mjs` changes during implementation — then re-run the
driver (one command; harness kept in the scratchpad).

### Phase 1: CSS move + graph regeneration

**Independent of:** Phase 0 (can run in parallel with the spike).

**Tasks:**
- MOVE from `system/portfolio.css` → end of `system/components.css`: the inspect bubble +
  toggle block (~lines 752–804) and the dock + ruler block (~lines 925–1148) **including**
  their `@media (max-width: 1099px)` and `@media print` `display:none` rules and the z-index-
  ladder prose comment. Rewrite each block's header as a ONE-LINE `/* ---------- … ---------- */`
  header (two blocks: dock+ruler chrome; inspect bubble+toggle). Rules move verbatim — zero
  value edits.
- **Cascade safety pre-verified at planning:** outside the two move ranges, `portfolio.css`
  contains ZERO `.dock`/`.ruler`/`.inspect*` selectors (one comment mention only), and
  `proto.css` contains none — so moving the rules to the earlier-loading sheet cannot change
  which rule wins anywhere. The only remaining check is visual (next task).
- Regenerate: `node agent-layer/gen-system-graph.mjs` then `node agent-layer/gen-inspect-data.mjs`
  (inspect-data consumer set grows; only ROLES-keyed components emit, so content changes only
  when Phase 3's ROLES land — running both again after Phase 3 is fine and idempotent).
- Run `node agent-layer/gen-loc-summary.mjs --check` — lines moved within the same "runtime"
  group should not drift the rounded totals; if it drifts anyway (rounding boundary), regenerate
  and note that approach baselines may join the churn set.
- Verify IA pages render identically: serve, load `/` and `/factory`, confirm dock + inspect
  visuals unchanged (the rules moved from a later sheet to an earlier one; nothing in
  `portfolio.css` overrides them — confirm no selector of the moved set also appears there).

### Phase 2: Pack skin on the protos

**Depends on:** Phase 1 (dock CSS must be reachable from `components.css`).

**Tasks:**
- `proto/verdant.html` + `proto/fieldwork.html`: add `<script src="/system/pack-boot.js"></script>`
  as the LAST element in `<head>` (after the `proto.css` link); add the top-window-gated dock
  import at the end of `<body>` (before `palette.mjs`, matching IA script order).
- Note (verified at planning): `buildRuler()` queries `main > section` — fieldwork's four
  `<section>` elements are all nested inside `.fw-board`, and both protos' `<main>` holds only a
  frame `<div>`, so the ruler correctly never mounts on either page. Nothing to suppress.
- Update header comments: `system/pack-boot.js` ("eight pages" → ten, name the protos),
  `system/dock.mjs` (mounting-pages list), and the `CLAUDE.md` architecture-map lines for
  `pack-boot.js` and `dock.mjs`.
- Prove AC1 by hand + Playwright: pick saulera in the dock on `/proto/verdant.html` → components
  re-skin live (token-only proof); reload → pack-boot restores it pre-paint; open
  `/proto/fieldwork.html` → the pick followed.
- Prove the no-op default (AC2's first half): with empty storage, assert on all 10 pages that
  the head's pack link still reads the literal `/system/tokens.neutral.css` (a small Playwright
  loop over the VR PAGES list).

### Phase 3: Inspect coverage

**Depends on:** Phase 1 (bubble CSS + regenerated graph). **Independent of:** Phase 2.

**Tasks:**
- `agent-layer/gen-inspect-data.mjs`: ADD ROLES lines (hand-authored plain-English copy — it
  describes, never asserts a measurement) for
  `fw-fieldwork-dispatch-board-chrome-human-fixed-canvas` and (optional, if instrumenting the
  scaffolding) `verdant-screen-scaffolding-layout-not-spec-d-components`. Regenerate.
- `proto/verdant.html`: add static `data-inspect="…"` attrs in the template literals —
  `vd-screen-header` (static markup line ~40), `vd-plant-card`, `vd-stat-tile`,
  `vd-care-task-row`, `vd-status-chip`, `vd-primary-button`. Add the inspect toggle button
  into `.proto-head` (beside the `#source` indicator) + `<script type="module"
  src="/system/inspect.mjs"></script>` at body end.
- `proto/fieldwork.html`: `data-inspect="fw-fieldwork-dispatch-board-chrome-human-fixed-canvas"`
  on the `fw-toolbar` and the three `fw-panel` sections (shared id — multiple triggers per id is
  supported; hover-only on non-focusable divs is accepted, matching the engine's design). Same
  toggle button + script tag. Slots and renderer output untouched.
- Verify the palette's "Turn inspect mode on" and "Copy tokens" commands now appear on both
  protos (presence-gated — zero palette edits).
- Cross-engine check (chromium/firefox/webkit): toggle on → hover a vd- card → bubble shows
  resolved current-pack values; switch pack → reopen → values change; Esc dismisses.

### Phase 4: Copy cut + param manifest

**Depends on:** Phases 2–3 (the controls must exist to be counted; the toggle row is at-rest copy).

**Tasks:**
- Dual-register cut on the framing prose of both pages: the `.sub` paragraphs, verdant's
  `.proto-slot-note`, fieldwork's slot placeholder notes, and the `.proto-legal` footers —
  first 1–2 sentences plain English, precise term kept alongside. Honesty labels (fictional,
  read-only, degradation) survive verbatim in meaning. Run every rewritten line through
  `/no-ai-slop` + `/humanizer` before commit.
- `system/param-manifest.json`: ADD `{ "page": "/proto/verdant.html", "selector":
  ".inspect-toggle", "label": "inspect-mode toggle" }` and the same for
  `/proto/fieldwork.html`; UPDATE the `$description` ("dock mounts on 8 of the 10" → all 10
  top-level; "proto/fieldwork … no entries" now stale) and the chrome dock/palette notes.
  Also ADD the home inspect toggle (`{ "page": "/", "selector": ".inspect-toggle", … }`) —
  it is a live control missed at #167 (review-catchable gap, fixed while touching the file).
- Regenerate `node agent-layer/gen-param-count.mjs` (total 65 → 68).

### Phase 5: Validation + VR baselines

**Tasks:**
- Full drift + generator pass, headless renders, cross-engine functional run (commands below).
- VR: from a **clean detached worktree under /Users** (not /private/tmp), `cd
  tooling/visual-regression && npm run update:docker`. Expected churn: `proto-verdant-{neutral,
  saulera}.png`, `proto-fieldwork-{neutral,saulera}.png` (dock toggle + inspect toggle + copy),
  `factory-{neutral,saulera}.png` (graph exhibit gained consumers). If approach's rendered
  param-count digits (65→68) exceed the pixel tolerance, approach ×2 join; if the update run
  skips them as sub-perceptual, leave them and say so in the report (`vr-update-skips-
  subperceptual`). Assert every other baseline is byte-unchanged (`git status` on the PNG dir).
- Commit plan + report + review artifacts in the same PR; PR body carries `Closes #175`.

---

## STEP-BY-STEP TASKS

Execute in order; each task is atomic.

### ~~CREATE scratch spike harness (Phase 0)~~ — DONE AT PLANNING
- **DONE**: harness built and run over chromium + firefox + webkit; 3× PASS (see Phase 0 for
  the verbatim results and the three findings). Remaining work: copy the findings into
  `.claude/reports/protos-pack-skin-inspect-175.md`.
- **VALIDATE**: findings section present in the report.
- **SATISFIES**: AC3 (shadow findings recorded).

### UPDATE system/components.css + system/portfolio.css (Phase 1)
- **IMPLEMENT**: move the two rule ranges (inspect ~752–804; dock+ruler+media hiders ~925–1148)
  verbatim to end of components.css under two single-line graph headers.
- **PATTERN**: `system/components.css:2121` (cmdk block); one-line header per commit 54ab337.
- **GOTCHA**: the `@media (max-width:1099px)` and `@media print` `.dock,.ruler{display:none}`
  rules MUST move too or the dock leaks into small viewports/print on protos while IA pages
  keep hiding it — a split-brain bug.
- **VALIDATE**: `grep -c "\.dock\|\.inspect-bubble" system/portfolio.css` → 0;
  `node agent-layer/gen-system-graph.mjs` prints `✓` with consumer count +2.
- **SATISFIES**: AC1 groundwork, AC3 groundwork.

### UPDATE agent-layer/gen-inspect-data.mjs (Phase 3 data)
- **IMPLEMENT**: add fw- ROLES line (+ verdant scaffolding line only if instrumented).
- **GOTCHA**: keys must exactly match regenerated `system-graph.json` consumer ids — a bad key
  throws (that's the guard, not a bug).
- **VALIDATE**: `node agent-layer/gen-inspect-data.mjs` → `inspect data ✓ … components`.
- **SATISFIES**: AC3.

### UPDATE proto/verdant.html
- **IMPLEMENT**: pack-boot script last in head; gated dock import + `inspect.mjs` script at body
  end (dock → inspect → palette order, matching index.html); `data-inspect` attrs (6 ids) as
  static literals in the templates + on the static `vd-screen-header`; inspect toggle in
  `.proto-head`; dual-register copy cut on `.sub` / slot note / legal.
- **PATTERN**: `index.html:17` (pack-boot), `index.html:131` (toggle), `index.html:409-420`
  (script order).
- **GOTCHA**: pack-boot must be the LAST head element (its own header comment: stylesheets
  above it, or an imported pack half-applies on this page alone).
- **VALIDATE**: `node tooling/drift-check.mjs` (inspect-mounts green); page renders under
  `npx serve .` with worker absent (fixture fallback, AC4).
- **SATISFIES**: AC1, AC3, AC4.

### UPDATE proto/fieldwork.html
- **IMPLEMENT**: same head/body wiring; fw- id on `fw-toolbar` + three `fw-panel`s; toggle;
  copy cut. Agentic slots untouched.
- **VALIDATE**: same as verdant.
- **SATISFIES**: AC1, AC3, AC4.

### UPDATE header comments + CLAUDE.md
- **IMPLEMENT**: pack-boot.js ("eight" → ten pages), dock.mjs mount list, CLAUDE.md map lines
  for both (and proto/ line mentions the pack skin).
- **VALIDATE**: `git diff` review — comment-only edits.
- **SATISFIES**: convention (docs match reality).

### UPDATE system/param-manifest.json + regenerate param-count
- **IMPLEMENT**: +3 entries (2 proto toggles + the missed home toggle), $description updates.
- **GOTCHA**: duplicate page+selector throws in the generator (that's the guard).
- **VALIDATE**: `node agent-layer/gen-param-count.mjs` → total 68; `node tooling/drift-check.mjs`.
- **SATISFIES**: ticket scope bullet 4.

### Run the copy skills on rewritten lines
- **VALIDATE**: `/no-ai-slop` then `/humanizer` over the changed prose; apply verdicts.
- **SATISFIES**: epic copy rule.

### Regenerate VR baselines
- **IMPLEMENT**: clean detached worktree under /Users → `cd tooling/visual-regression && npm
  run update:docker`; confirm the churn set (proto ×4 + factory ×2, possibly approach ×2).
- **GOTCHA**: the gate screenshots the WORKING TREE — a dirty tree bakes uncommitted noise into
  baselines; sub-perceptual changes are skipped (rm the PNG to force only if you *want* the
  rewrite).
- **VALIDATE**: gate run green; `git status tooling/visual-regression` shows exactly the
  expected PNGs changed.
- **SATISFIES**: AC2.

---

## TESTING STRATEGY

No test suite in this repo — "done" = run the surface you touched.

### Functional (cross-engine, Playwright from the VR node_modules)
- Pack swap live re-skin on both protos + reload persistence (AC1), chromium + firefox + webkit.
- No-op default: empty storage → pack link href is literally `/system/tokens.neutral.css` on all
  10 pages (AC2 first half).
- Inspect: toggle on → hover vd-plant-card / fw-panel → bubble with resolved values; pack switch
  changes the values on reopen; Esc dismisses; toggle off = no listeners.
- Palette on protos now offers "Turn inspect mode on" + "Copy tokens".
- Dock absent inside work.html's proto iframes; present top-level.

### Edge Cases
- Private mode (storage throws): pack-boot returns, dock still switches for the session.
- Worker absent: both protos render from static fixtures with the indicator saying so;
  `ERR_CONNECTION_REFUSED` to :8787 in the console is expected, not a regression (AC4).
- Viewport < 1100px: dock hidden on protos (moved media rule) — same as IA pages.
- Reader arrives with `factory-pack: verdant` persisted: proto re-skins pre-paint, no FOUC.

## VALIDATION COMMANDS

### Level 1: Generators + drift
```
node agent-layer/gen-system-graph.mjs
node agent-layer/gen-inspect-data.mjs
node agent-layer/gen-param-count.mjs
node agent-layer/gen-loc-summary.mjs --check   # regen only if it drifts
node tooling/drift-check.mjs                   # the CI verify gate, incl. inspect-mounts 2f
```
### Level 2: Pages render
```
npx serve .   # then load /proto/verdant.html + /proto/fieldwork.html + / + /factory
```
### Level 3: Cross-engine functional
Playwright scripts per the Testing Strategy (serve via `node tooling/visual-regression/serve.mjs`).
### Level 4: VR
```
# clean detached worktree under /Users, then:
cd tooling/visual-regression && npm run update:docker
```

## ACCEPTANCE CRITERIA

- [ ] AC1: pack switch on a proto page re-skins vd-/fw- live; persists via pack-boot on reload.
- [ ] AC2: empty-storage no-op proven on all 10 pages; VR green; regenerated baselines = proto ×4
      **+ factory ×2 (documented deviation — CSS-move decision)**, approach only if tolerance
      exceeded; all others byte-unchanged.
- [ ] AC3: inspect bubbles work on fieldwork's fw- chrome + verdant's vd- surfaces; shadow-wc
      spike findings recorded in the report.
- [ ] AC4: worker-absent fixture degradation renders on both protos.
- [ ] Manifest updated (+3), param-count regenerated, copy passes both skills, comments/CLAUDE.md
      current, PR body carries `Closes #175`, plan/report/review committed in the PR.

## COMPLETION CHECKLIST

- [ ] Spike run + findings in report
- [ ] All generators `✓`, drift-check green locally
- [ ] Cross-engine functional pass (3 engines)
- [ ] VR churn set exactly as declared; gate green
- [ ] Copy skills run on every rewritten line
- [ ] PR opened from `feature/protos-pack-skin-175` off fresh `main` with `Closes #175`

## OPEN QUESTIONS / ASSUMPTIONS

- **AC2 deviation is pre-agreed** (owner chose the components.css move knowing factory churns).
  Restate it in the PR body so review doesn't flag it as a surprise.
- **Approach baselines**: param total 65→68 changes rendered digits; pixel tolerance
  (maxDiffPixels:100) likely swallows it and update:docker may skip as sub-perceptual. Decision:
  accept whatever the gate honestly reports — regen approach if it fails, note if it passes.
- ~~Shadow-boundary uncertainty~~ **RESOLVED at planning**: the spike ran on all three engines
  and PASSED (Phase 0) — AC3's "one vd- wrapper" bubble-works evidence is in hand, with one
  bounded limitation recorded (host-box-only measurements). No shipped page mounts the wc
  wrappers and instrumenting `wc/demo.html` would break its "plain page, no components.css"
  claim, so the committed mounts stay light-DOM; a committed wc mount is a follow-up decision.
- Assumption: `data-inspect` on fieldwork's non-focusable `div`/`section` chrome is hover-only
  (no `tabindex` added — changing the board's tab order is out of scope; the engine's focus path
  is exercised by verdant's interactive elements).
- Assumption: no new analytics — `trackToolInspect`/`trackToolPalette` already cover the new
  surfaces via the engine/palette success paths.

## NOTES (open canvas)

**De-risked at planning (2026-07-31) — why confidence is 9.5/10:**
- **Shadow spike EXECUTED, 3× PASS** (Phase 0) — the epic's mandated risk item is closed before
  implementation starts; findings ready to paste into the report.
- **CSS-move cascade safety measured, not reasoned**: grep proves zero `.dock`/`.ruler`/
  `.inspect*` selectors exist in `portfolio.css` outside the move ranges and zero in
  `proto.css` — the move cannot flip any cascade outcome.
- **Ruler non-mount on both protos verified** structurally (`main > section` matches nothing).
- **Both decision forks pre-resolved with the owner** (components.css move + factory-churn
  deviation; dock suppressed in iframes) — no mid-implementation stops.
- **Wiring surface confirmed minimal**: `dock.mjs`/`pack-boot.js` need zero code edits; the
  palette lights up its inspect/copy commands presence-gated with zero edits; drift-check 2f
  provably scans the protos' inline template literals (regex over tracked `*.html`).
- Remaining 0.5: the VR docker run's exact churn set (approach's 65→68 digit render vs the
  pixel tolerance) is only knowable by running the gate — the plan handles both outcomes
  explicitly, so it's a branch, not a blocker.

- Rejected CSS-delivery alternatives: new `system/chrome.css` (keeps AC2's letter but invents a
  stylesheet + edits 8 heads); duplication into `proto.css` (forks styles — against the repo's
  never-fork discipline); loading `portfolio.css` on protos (element-level rules would restyle
  the pages wholesale).
- `dock.mjs` needs **zero code changes** — `PACKS`/`PACK_RE` already carry all four packs, and
  the ticket's "extend pack-boot's hard allowlist + PACK_RE" turns out to mean "put the script
  on the pages" (pack-boot's allowlist is pack *names*, unchanged; PACK_RE lives in dock and
  already matches). The real edit points are the two HTML heads + the CSS move.
- The work.html iframe embeds get pack consistency for free via pack-boot (today they're always
  neutral even when the surrounding page wears saulera) — worth one line in the PR body as a
  bonus fix. VR is unaffected: those figures are masked.
- Script order at body end: dock import before inspect.mjs before palette.mjs mirrors
  index.html; palette builds its command list lazily at first open, so ordering is belt-and-
  braces, not load-bearing.
- Verdant's `#log-care` button and task-row checkboxes are already-existing controls the #167
  manifest ALSO omitted (like home's inspect toggle). Left alone here: the ticket's manifest
  scope is the controls *this ticket adds*; sweeping the protos' pre-existing controls into the
  manifest is #176's natural companion (it touches the same templates). Noted so it isn't lost.

## AMENDMENTS

<!-- Append-only after approval; newest at the bottom. -->
