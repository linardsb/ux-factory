# Feature: the pattern builder — Hooked + Shape Up as an interactive prototyper (/build)

The following plan should be complete, but it's important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

**Decided interactively with the owner, 2026-07-26 (12 questions, three rounds — decisions D1–D12
below). Supersedes ticket #130 (its token-drop exhibit becomes Act 0 of this flow) and absorbs the
intent of closed epic #86 (its build-time generative prototyper becomes this epic's operator path).**

## Feature Description

A sixth public surface, **/build**: a visitor imports their design tokens (a Figma variables/DTCG
export dropped on the page), answers a ~10-question interactive flow drawn from the two methods the
portfolio already cites — Nir Eyal's Hooked loop (trigger → action → variable reward → investment,
plus the Manipulation-Matrix ethics pair) and Ryan Singer's Shape Up (appetite + shaping, then
breadboarding: places · affordances · connections) — and watches a **breadboard of their product**
get drafted and become editable, then a **real UI pattern** render from the site's component
vocabulary under **their** brand. They leave holding: a download bundle (their tokens.css, the
breadboard, a pattern spec), a **share link** that rebuilds the whole state in a colleague's
browser, and an on-screen SVG **build card** — a designed miniature of what they built.

Everything on the shipped page is **deterministic** — committed rules, no model at view time —
per the honesty contract. The same questionnaire later feeds the **operator path** (slice 3):
answers + a company brief drive a real build-time Agent SDK run whose committed composition ships
in that company's private instance.

## User Story

As a hiring manager evaluating a senior UX engineer
I want to describe MY product through the same product-method questions the candidate works by, and
watch a credible UI pattern assemble under MY design tokens
So that I experience the candidate's method and judgment applied to my own problem — instead of
reading claims about it — and leave holding an artifact I can forward.

## Problem Statement

The portfolio *names* Hooked and Shape Up on the approach page and *uses* a 4-question Hooked-derived
intake on the home spine, but the methods are never performed on the visitor's own product. The
import capability (#116/#124) exists only in the operator's local portal — a recruiter never sees
it. #130 planned the re-skin half; this feature is the full thesis: **the visitor's tokens + the
visitor's product + the candidate's method = a built artifact.**

## Solution Statement

One page, four acts, one deterministic engine chain:

```
Act 0  Import      drop export.json → system/figma-map.mjs (extracted pure core) → pack values
                   applied as inline :root props (pack-derived model) — or skip: derive from a
                   brand colour, or continue neutral
Act 1  Hooked      trigger / action / variable reward / investment + the ethics pair (6 Qs,
                   each with a recommended default + reasoning — the intake-beat pattern)
Act 2  Shaping     appetite (small/big batch) + rough shape (2 Qs)
Act 3  Breadboard  engine drafts places · affordances · connections from Acts 1–2; visitor
                   renames / adds / removes / reconnects (generated + editable, keyboard-first)
Build              committed rules (pattern-rules.mjs, DEFINITIONS-ONLY like compose.json
                   computeRules) map breadboard shape + answers → one of 5 patterns → a
                   {name,props,children} composition → rendered by the EXISTING vocabulary-
                   validated agentic-renderer under the current tokens
Keep               build card (SVG miniature) + downloads + share link (state-in-URL, ~1 KB)
```

Reusing the agentic renderer for the final render is load-bearing honesty: the deterministic
mapper emits the *same composition format* the real agent runs emit, validated by the *same*
vocabulary — one contract, two authors, both inspectable.

## Out of Scope / Non-Goals

- **No live LLM/agent calls at view time** — hard honesty-contract rule. The public engine is
  committed rules; the agent path is build-time only (slice 3).
- **No URL/file-key Figma field** — measured constraint inherited from #116 (Enterprise gate,
  ~6 reads/month). Export file drop only, one line in the UI says why.
- **Not changing** the home spine's intake beat, derive.mjs's public API, the dock's committed
  packs, or the portal drawer (#124) — the builder consumes, never forks.
- **No component imports from the visitor's design** (handover §B G3/G4: colour + scale only).
- **No server-side anything**: share links are state-in-URL; nothing is stored or hosted.
- **Not in slice 1**: patterns 3–5, the operator path, per-company instance wiring (staged below).
- **#130 is closed as superseded** by this plan (its constraints are inherited verbatim); **#86
  stays closed**, its intent recorded as this epic's slice 3.

## Feature Metadata

**Feature Type**: New Capability (epic — three slices)
**Estimated Complexity**: High (epic) / Medium per slice
**Primary Systems Affected**: new `build.html` + ~7 new `system/` modules, extraction refactor in
`tooling/figma/`, `system/components.css` + `tokens.source.json` (new ds-* primitives), VR
baselines, loc-summary cascade, portal (slice 3)
**Dependencies**: none new — zero-dep vanilla, per CLAUDE.md

## Related Work

**Implements**: the epic to be created from this plan (see Report) · **Supersedes**: #130 ·
**Absorbs intent of**: #86 (closed) — build-time-not-view-time direction confirmed by its memory note

**Back-references**:

- `.claude/plans/figma-drop-portal-ui-implementation.md` — the operator drop drawer this
  generalises; its §2 measured constraints are inherited verbatim
- `.claude/plans/figma-import-scales-and-dock.md` + AMENDMENTS — the scale import rules (even
  spread, weight + pill-sentinel exclusions) the extracted core must carry unchanged
- `.claude/plans/v3-your-brand-input-derived-pack-persistence.md` — the derived-pack apply/share
  model (`pack-derived.mjs`) the import act extends
- `.claude/plans/ds-list-row-primitive.md` (PR #123) — the ds-* library-primitive precedent the
  pattern components follow
- v3 epic #70 (closed) — the spine this page links from; D8: evidence one disclosure deep

**Forward-references**: (none yet — slices become tickets via piv-slice-epic)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

- `tooling/figma/figma-read.mjs` — `entriesFromExport` (~L169: DTCG/Tokens-Studio walker + the
  collections→modes→variables plugin branch + `pluginShadow`), `rgbaToHex`, HEX/expandHex
  (~L158). **The pure extraction source.** Everything above it (request layer, cache, fs) stays.
- `tooling/figma/figma-pull.mjs` — `classifyRamps`, `pickRamps` (+ `err.candidates`),
  `deriveRamps`, `nearestRung`, `classifyDimension` + `isNotASize` (~L147), `collectScales`
  (~L184, incl. pill-sentinel rule), `fillScales` (~L250, even-spread rule), `toRamps` (~L314),
  the contrast negotiation in `runPull`. **Read the whole file** — the plan splits it into
  pure-core vs node-shell.
- `system/pack-derived.mjs` — the apply/persist/share model: inline `:root` props, records,
  `BRAND_CHANGE_EVENT`, share-URL building, the hex allowlist (~L80). The import act extends
  this; the share codec mirrors its validation discipline.
- `system/factory-intake.mjs` — `initIntake(config)` seam, radiogroup a11y, defaults-with-
  reasoning copy pattern, focus management on step change. The questionnaire mirrors this.
- `system/derive.mjs` + `system/derive.rules.mjs` — `RULESET.wcagPairs`, the ethics/Manipulation-
  Matrix verdict logic (Act 1's ethics pair reuses it), the "committed rules, no model" framing.
- `system/agentic-renderer.mjs` + `system/action-bus.mjs` — `renderComposition`, vocabulary
  validation, `safePhotoUrl`, refusal messages. The pattern render target.
- `handoff/verdant/vocabulary.json` + `agent-layer/gen-vocabulary.mjs` — the vocabulary the new
  ds-* primitives must be added to (generated from specs — never hand-edit).
- `system/agentic-study.mjs` — `renderStudy`, the metric-tile ds- primitive precedent, deep-clone
  discipline, capability-badge honesty copy.
- `system/specs/stat-tile.md` (+ `.contract.json`) and the ds-list-row spec (PR #123) — the spec
  format every new primitive needs BEFORE its CSS/wrapper (kb-format.md).
- `system/dock.mjs` (~L31 PACKS) + `system/pack-boot.js` (~L19 allowlist) — /build loads BOTH;
  allowlists unchanged (the imported pack applies via inline props, not a stylesheet swap —
  see memory: derived-pack-inline-vs-stylesheet).
- `index.html` close beat (`system/close.mjs`) + `work.html` — the two link sources to /build.
  NOTE close.mjs's known one-shot-snapshot bug (audit 2026-07-25, MAJOR #2) — do not clone that
  pattern; subscribe to state events.
- `system/site.js`, `portfolio.css`, an existing IA page's `<head>` (e.g. `factory.html:1-40`) —
  the page skeleton to mirror (contract → neutral → components → portfolio + pack-boot first).
- `tooling/visual-regression/visual.spec.mjs` + `playwright.config.mjs` — where /build's shots
  get added; memories: `animations:'disabled'` + rest==final is what keeps baselines stable;
  visible-beats need a `data-*="ready"` handle + waitVisible.
- `agent-layer/gen-loc-summary.mjs` (~L22 group regexes) — new `system/*.mjs` files land in the
  runtime group ⇒ approach baselines churn ⇒ regen in the same PR (memory: loc-summary cascade).
- `portal/record-composition.mjs` + `scenarios/*/compose.json` (slice 3) — the build-time runner
  the operator path parameterises; computeRules are DEFINITIONS-ONLY (hard rule).
- `CLAUDE.md` — ground rules; `.claude/skills/portfolio-design/` — run build sessions under it;
  `.claude/references/token-system.md` — how to add the new component tokens.

### New Files to Create

**Slice 1**
- `build.html` — the page: four acts + build stage + keep rail; `data-page="build"`.
- `system/figma-map.mjs` — **extracted pure mapping core** (no fs/network/process): entry
  extraction, ramp classification/derivation, role mapping, contrast negotiation, scale fill
  (spread + exclusions), returning `{ values, checks, stepped, failures, scales, candidates? }`.
  Consumed by BOTH `tooling/figma/figma-pull.mjs` (node shell keeps I/O, cache, header emission,
  CLI) and the browser. CLI stdout and pack bytes must stay byte-identical after the split.
- `system/build-import.mjs` — the drop act: file input + drag, JSON/size checks, calls figma-map,
  candidate-swatch refusal UI, applies via pack-derived-style inline props, offers tokens.css
  download (client-side gen — the pack header states "browser build, not the committed generator").
- `system/build-questions.mjs` — the 10-question three-act config + wizard runner (initIntake-
  patterned); ethics pair scores via the derive.rules verdict.
- `system/breadboard.mjs` — data model `{places:[{id,label,affordances:[…]}],connections:[[from,to]]}`,
  draft-from-answers rules, editable SVG/DOM render (rename/add/remove/reconnect), keyboard +
  `aria` per APG; emits `BUILD_CHANGE`.
- `system/pattern-rules.mjs` — committed DEFINITIONS-ONLY mapping rules (breadboard shape +
  appetite → pattern id + slot content derivation). A rules file a reader can open — cite it in
  the UI the way derive.html cites derive.rules.
- `system/pattern-render.mjs` — pattern id + state → `{name,props,children}` composition →
  `agentic-renderer.renderComposition` under a scoped mount (peak-style scoped tokens, NOT
  `:root`, so the page chrome stays calm — instance.mjs's scoped `--color-accent` is the model).
- `system/build-card.mjs` — state → designed SVG miniature (finite pattern set ⇒ hand-authored
  per-pattern SVG templates parameterised by tokens/labels); "Rendered from your build" label.
- `system/build-share.mjs` — state ⇄ URL codec: compact JSON → base64url; decode side hand-
  validates EVERY field (hex regexes, enum pattern ids, label length caps, place/affordance count
  caps) — a share URL is untrusted input; render text via textContent only.
- `system/specs/ds-queue-row.md` (+ contract) if the queue pattern needs more than ds-list-row +
  metric-tile — spec first, then CSS, then `gen-handoff`/`gen-vocabulary` regen.
- VR: baselines for /build under neutral + saulera (added page count 8→9).

**Slice 2**: pattern templates + any new specs for onboarding / feed / settings
(`ds-step`, `ds-feed-item`, `ds-settings-row` — spec-first, vocabulary regen), build-card
templates for the three, motion polish per the spring vocabulary.

**Slice 3**: `portal/lib/builder.mjs` + a portal drawer (answers → agent-run composition via the
record-composition seam), `scenarios/<slug>/compose.json` parameterisation, instance.mjs slot
wiring, epic-notes update recording #86 absorption.

### Relevant Documentation — READ BEFORE IMPLEMENTING

- Hooked/Shape Up: cite only as the portfolio already does (approach page framing). Shape Up
  breadboarding chapter (basecamp.com/shapeup/1.3-chapter-04) — places/affordances/connections
  definitions; Hooked model (nirandfar.com/hooked) — loop stage definitions. Method fidelity in
  copy matters: a wrong definition is an honesty bug on a portfolio about method.
- MDN Drag and Drop (`dragover` preventDefault gotcha) — already proven in `portal/public/portal.js`.
- MDN `history.replaceState` — share-URL writing without nav (pack-derived precedent).
- APG patterns for the breadboard editor (listbox/toolbar keyboard models).

### Patterns to Follow

- **File headers cite the governing doc** — every new module opens
  `// system/<name>.mjs — … (hooked-shapeup-pattern-builder plan §…)`.
- **Hand-validate at boundaries and throw Errors naming the offender** (decode, drop, rules).
- **Committed-rules honesty framing** — copy the derive.html device: "the mapping is a rules
  file, not a model — read it" + link to the module.
- **Scoped re-skin** — the built pattern wears imported tokens inside its mount (instance.mjs
  peak model); site-wide wear stays the dock's job.
- **Defaults with reasoning** on every question (intake pattern) — accept-and-advance in seconds.
- **No entrance animations on continuously-rebuilt nodes** (memory: entrance-anim-continuous-
  rebuild); breadboard edits re-render — gate transitions behind discrete-change classes.
- **overflow-x: clip on body breaks sticky** (memory) — the keep-rail must be structural, not sticky.

---

## IMPLEMENTATION PLAN

### Slice 1 — the public builder core (page · import · questions · breadboard · 2 patterns · keep)

Ships whole and honest: dashboard + queue patterns; feed/onboarding/settings answer-paths get an
honest "not in the library yet — here's its breadboard" card (never a fake render).

**Phase 1.1 — extraction (the #130 debt).** Split the pure mapping core out of
`tooling/figma/{figma-read,figma-pull}.mjs` into `system/figma-map.mjs`; re-point the CLI.
Gate: `tokens.plusui.css` regenerates **byte-identically** via the re-pointed CLI (both `--from`
and `--offline` paths), all refusal messages byte-identical, drift-check green.
**Independent of:** everything below — do it first and alone; it's the riskiest diff.

**Phase 1.2 — the page + import act.** `build.html` skeleton (chrome, acts rail, mounts) +
`build-import.mjs` (drop → figma-map → candidates/apply → tokens.css download). Degrades: no
drop → brand-colour input (derive path) → neutral.

**Phase 1.3 — questionnaire + breadboard.** `build-questions.mjs` (3 acts, 10 Qs, ethics verdict)
→ `breadboard.mjs` (draft + edit). **Depends on:** 1.2 only for page mounts.

**Phase 1.4 — rules + render + keep.** `pattern-rules.mjs` → `pattern-render.mjs` (via
agentic-renderer; new spec/vocab regen if ds-queue-row is needed) → `build-card.mjs` +
`build-share.mjs` + downloads.

**Phase 1.5 — gates.** loc-summary + approach baselines regen; /build VR baselines (neutral +
saulera); cross-engine functional pass (memory: chromium+firefox+webkit locally); a11y pass;
links from close beat + work.html (VR: those pages' baselines re-capture).

### Slice 2 — the full pattern library (3 more patterns + polish)

**Depends on:** slice 1 merged. New specs → components.css tokens → vocabulary regen → pattern
templates + build-card templates + rules extensions; motion per spring vocabulary; hallway-test
the flow once.

### Slice 3 — the operator path (absorbs #86)

**Depends on:** slice 1; **independent of:** slice 2. Portal drawer: same question config, answers +
company brief → a REAL `record-composition`-seam agent run → committed composition + PIV trace →
instance slot renders it (`build-instance.mjs --compositions`). Honesty: never hand-fed examples;
computeRules DEFINITIONS-ONLY; a weak run is re-run with tighter committed prompts.

---

## STEP-BY-STEP TASKS (slice 1 — execute top to bottom)

### REFACTOR `tooling/figma/figma-read.mjs` + `figma-pull.mjs` → CREATE `system/figma-map.mjs`
- **IMPLEMENT**: move the pure functions (entry extraction incl. plugin/DTCG/TS branches +
  `pluginShadow`, `rgbaToHex`/hex utils, `classifyRamps`, `pickRamps`, `deriveRamps`,
  `nearestRung`, `toRamps`, `classifyDimension`/`isNotASize`, `collectScales`, `fillScales`,
  contrast negotiation, `SCALE_ROLES`/`FAMILY_*`/RULESET wiring) into `system/figma-map.mjs`
  exporting one `mapExport(json, { accent, neutral })` plus the granular functions; tooling files
  import from it (relative `../../system/figma-map.mjs`). No `node:` imports in the new module.
- **PATTERN**: `system/derive.mjs` — a pure engine module consumed by both a page and tooling.
- **GOTCHA**: keep every message string byte-identical; `figma-pull`'s header emission and
  `genPackCss` call stay in tooling (they touch fs). Do NOT move the request/cache layer.
- **VALIDATE**: `node tooling/figma/figma-pull.mjs --slug plusui --neutral gray --accent indigo --offline && git diff --exit-code system/tokens.plusui.css`
  and the same via `--from tooling/figma/exports/plusui.json`; `node tooling/drift-check.mjs`
- **SATISFIES**: AC1

### CREATE `build.html`
- **IMPLEMENT**: head mirrors `factory.html:1-40` (contract → neutral → components → portfolio,
  `pack-boot.js`, noindex, theme-color); body `data-page="build"`; act sections with mount ids
  (`#act-import`, `#act-hooked`, `#act-shape`, `#act-breadboard`, `#build-stage`, `#build-keep`),
  honest capability strip up top ("committed rules run in your browser — nothing is uploaded,
  no model is called; the rules are readable: …"), module scripts at the end.
- **PATTERN**: factory.html structure; capability chips from the v3 evidence pages.
- **VALIDATE**: `npx serve .` → /build renders chrome + empty mounts, zero console errors.
- **SATISFIES**: AC2

### CREATE `system/build-import.mjs` (+ wire into build.html)
- **IMPLEMENT**: drop zone + keyboard-reachable file input (mirror `portal/public/index.html`
  drawer semantics, restyled per portfolio-design); client checks (name `.json`, ≤ 32 MB
  mirroring `MAX_EXPORT_BYTES`, `JSON.parse`); `figmaMap.mapExport` → success applies values as
  inline props on the **stage mount** (scoped, instance.mjs model) + stores the record
  (pack-derived-compatible shape so the dock's "your brand" row can offer it) + enables a
  `tokens.<slug>.css` client-side download whose header opens "BROWSER BUILD — generated in your
  browser from your export by system/figma-map.mjs; the committed generator is …"; candidates →
  swatch buttons (hex regex before any style attr); no-candidate refusal → verbatim message, no
  affordance. Also: brand-colour fallback input driving `derive()`.
- **GOTCHA**: `esc()`/textContent everything from the file (ramp names are third-party text);
  keep `figma.file` for re-import; refusal ordering per the drawer.
- **VALIDATE**: headless drop of a real export → swatches → click → stage re-skins; a `.txt`
  and broken JSON refused client-side; zero page errors.
- **SATISFIES**: AC3

### CREATE `system/build-questions.mjs`
- **IMPLEMENT**: config array (act, id, prompt, control, options, default, reasoning) — Act 1:
  internal trigger · action (the smallest behaviour) · variable-reward type · investment asked as
  product questions; ethics pair scored to the Manipulation-Matrix verdict via derive.rules'
  logic (facilitator/peddler/entertainer/dealer verdict shown with the same honest copy as the
  intake); Act 2: appetite (small/big batch) · rough shape. Runner mirrors `initIntake`'s
  radiogroup/a11y/focus pattern; every answer fires `BUILD_CHANGE` with the full state.
- **GOTCHA**: method fidelity in copy (see docs refs); defaults-with-reasoning mandatory; ≤ 10
  questions total (D10).
- **VALIDATE**: keyboard-only pass through all acts; verdict renders; state object logged
  complete.
- **SATISFIES**: AC4

### CREATE `system/breadboard.mjs`
- **IMPLEMENT**: draft rules (e.g. reward=social ⇒ a feed/people place; investment=content ⇒ a
  library place; appetite=small ⇒ ≤3 places) — committed and commented; render places as labeled
  groups with affordance chips + connection lines (SVG lines, DOM chips); edit verbs: rename
  (inline input), add/remove affordance, add/remove place (caps: 6 places × 6 affordances),
  reconnect (pick-source → pick-target, keyboard reachable); emits `BUILD_CHANGE`.
- **GOTCHA**: no entrance animation on re-rendered nodes (memory); every editable is a real
  button/input; `aria-live` announce for edits.
- **VALIDATE**: headless: draft appears from answers; rename/add/remove/reconnect each round-trip
  the model; zero listener leaks over 50 edits (count via `getEventListeners` in CDP or re-mount).
- **SATISFIES**: AC5

### CREATE `system/pattern-rules.mjs` + `system/pattern-render.mjs`
- **IMPLEMENT**: rules (DEFINITIONS-ONLY: shape signatures → pattern id; slot derivations like
  "queue rows = affordances of the busiest place") → composition in the renderer's
  {name,props,children} format; render via `renderComposition` into the stage under the scoped
  tokens; dashboard uses `metric-tile` (+ existing enum components where honest), queue uses
  `ds-list-row` (+ NEW `ds-queue-row` spec ONLY if the existing row can't carry it — spec first,
  then `gen-handoff`/`gen-vocabulary`/`gen-pack-bundle` regen in the same commit); unsupported
  shapes → the honest "not in the library yet" card with the breadboard kept front and centre.
- **GOTCHA**: the composition must VALIDATE against vocabulary.json — if a needed prop isn't in a
  spec, extend the spec, never bypass the renderer; that refusal path is the feature's honesty.
- **VALIDATE**: `node -e` unit run: three canned answer-sets → expected pattern ids; headless:
  full flow renders dashboard AND queue; an out-of-library shape shows the honest card.
- **SATISFIES**: AC6

### CREATE `system/build-card.mjs` + `system/build-share.mjs` + the keep rail
- **IMPLEMENT**: per-pattern SVG template (hand-authored, parameterised by token values + labels,
  "Rendered from your build" caption) shown as the final card + downloadable; downloads:
  tokens.css (from import act), breadboard.json + breadboard.svg, pattern-spec.md (components +
  tokens + the Hooked/appetite summary — assembled client-side); share: state → compact JSON →
  base64url in `?b=`; on load with `?b=`, decode → **hand-validate every field** (hex, enum ids,
  caps) → rebuild all acts answered + stage rendered + a provenance line "built from a shared
  link — nothing was stored anywhere; your browser rebuilt it."
- **GOTCHA**: decode is untrusted input — reject on ANY invalid field (no partial applies);
  `history.replaceState` after edits keeps the URL current (pack-derived precedent); dock
  query-string-strip bug class (audit finding) — verify #appearance open/close on /build
  preserves `?b=`.
- **VALIDATE**: headless: build → copy link → fresh context opens link → identical state
  (compare serialised state deep-equal); tampered payloads (bad hex, unknown pattern, 10k-char
  label) all rejected to a clean empty builder with a message.
- **SATISFIES**: AC7, AC8

### UPDATE `index.html`/`system/close.mjs` + `work.html` — the links in
- **IMPLEMENT**: close beat gains the "now build yours" action → /build; work.html proof index
  lists it. Subscribe to nothing new (avoid the close-beat one-shot bug class).
- **VALIDATE**: links resolve; home + work VR diffs are the expected copy change only.
- **SATISFIES**: AC9

### UPDATE gates — loc-summary, VR, docs
- **IMPLEMENT**: `node agent-layer/gen-loc-summary.mjs` (+ the two approach baselines — memory:
  cascade); add /build to `tooling/visual-regression/visual.spec.mjs` (both packs, rest==final,
  `data-build="ready"` handle set only at settled state); `cd tooling/visual-regression && npm
  run update:docker`; cross-engine functional pass (chromium/firefox/webkit local per memory);
  CLAUDE.md architecture-map entry for the new modules + /build.
- **VALIDATE**: `node tooling/drift-check.mjs` · `node tooling/token-lint.mjs` ·
  `node agent-layer/gen-loc-summary.mjs --check` · `npx playwright test` (in the VR dir) all ✓.
- **SATISFIES**: AC10

---

## TESTING STRATEGY

No suite exists (CLAUDE.md): fixtures + real surfaces, honestly.

- **figma-map extraction**: the plusui byte-identity regression (both read paths) is the
  refactor's proof; plus the drawer fixtures (good/ambiguous) through the CLI.
- **Flow**: one headless script per act + one full-journey script (import → 10 answers →
  breadboard edits → render → card → share round-trip), run under chromium/firefox/webkit.
- **Edge cases**: skip-import path; accept-all-defaults speedrun (≤ 60 s to a render); ethics
  "dealer" verdict copy; breadboard emptied to zero places (honest empty state, no render);
  share-link tampering battery; 33 MB file client-refusal; reduced-motion pass; the dock opened
  mid-flow (state survives; `?b=` survives).

## VALIDATION COMMANDS

- L1: `node --check` every new/changed .mjs · `node tooling/token-lint.mjs`
- L2: `node -e` unit runs (pattern-rules canned sets; share codec encode/decode/tamper)
- L3: plusui byte-identity (both paths) · `node tooling/drift-check.mjs` ·
  `node agent-layer/gen-loc-summary.mjs --check`
- L4: the headless full-journey script ×3 engines; manual eyeball at 1440/720 under neutral +
  saulera + an imported pack
- L5: VR `npx playwright test` with the new baselines

## ACCEPTANCE CRITERIA

- [ ] **AC1** The mapping core lives in `system/figma-map.mjs` (no node imports); the CLI
      re-pointed; `tokens.plusui.css` byte-identical via both read paths; drawer (#124) unaffected.
- [ ] **AC2** /build ships in the IA (linked from close beat + work), chrome + dock + pack-boot
      present, noindex, capability strip states the no-model/no-upload facts.
- [ ] **AC3** A real variables/DTCG export dropped on /build re-skins the stage scoped (not the
      chrome), with candidate-swatch refusal and a browser-built tokens.css download whose header
      says what built it; no-drop paths (brand colour / neutral) work.
- [ ] **AC4** Ten questions max, three acts, every question carrying a recommended default with
      reasoning; the ethics pair produces the Manipulation-Matrix verdict with method-faithful copy.
- [ ] **AC5** The breadboard drafts from answers and supports rename/add/remove/reconnect,
      keyboard-first, capped, with no stale-state or listener-leak over repeated edits.
- [ ] **AC6** Dashboard + queue render via the EXISTING vocabulary-validated renderer from
      committed DEFINITIONS-ONLY rules; out-of-library shapes get the honest card, never a fake.
- [ ] **AC7** The share link rebuilds the full state (answers, breadboard, pattern, full token
      values) in a fresh browser with zero server involvement; tampered links reject cleanly.
- [ ] **AC8** The keep rail: SVG build card ("Rendered from your build"), tokens.css, breadboard
      (json+svg), pattern-spec.md — all client-generated.
- [ ] **AC9** Home close + work link in; their baselines re-captured knowingly.
- [ ] **AC10** All gates green: drift-check, token-lint, loc-summary (+ approach baselines), VR
      incl. /build under both packs; cross-engine functional pass done.
- [ ] **AC11 (epic hygiene)** #130 closed as superseded with a pointer here; the epic issue
      carries slices 2–3; PR bodies carry `Closes #<slice-ticket>`.

## COMPLETION CHECKLIST

- [ ] Phase 1.1 extraction proven byte-identical BEFORE any page work
- [ ] Every task validated immediately; full-journey headless pass ×3 engines
- [ ] VR baselines: /build added, approach + home + work regenerated knowingly, nothing else churned
- [ ] CLAUDE.md map updated; plan + report + review in the slice PRs
- [ ] Slices 2–3 ticketed with this plan as their base

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 — pattern-spec.md format**: mini-handoff style (spec head · tokens · components) assumed;
  confirm at build time whether it should mirror `handoff-viewer`'s three projections exactly.
- **Q2 — dock integration of the imported pack**: assumed the import act ALSO offers "wear it
  site-wide" via the existing derived-record seam (pack-derived shape). If that record shape
  can't carry full scale values yet, slice-1 falls back to stage-scoped only + a note; extending
  the record is a small follow-up.
- **Q3 — ds-queue-row need**: decided at build time against ds-list-row's real props; spec-first
  either way.
- **A1**: The 5-pattern set is fixed as dashboard · queue/list · onboarding · feed · settings
  (D6); slice 1 ships the first two.
- **A2**: Slice 3 reuses the record-composition seam mostly as-is; if the questionnaire needs new
  compose.json fields, that's a scenario-format PR with both parsers updated (kb-format rule).

## NOTES (open canvas)

**Why the renderer is the render path** — three alternatives weighed: (a) bespoke pattern DOM
(fast, but a second component path to keep honest), (b) wc wrappers (shadow DOM complicates
scoped token application), (c) the agentic renderer (chosen: same composition format and the same
validator as the real agent runs — the strongest honesty story on the page, and slice 3 gets
"the operator's agent proposes into the exact surface you played with" for free).

**Why scoped, not :root** — the v3 dock already owns site-wide wear; a builder that hijacks the
chrome mid-flow fights it (and the #108 restore machinery). Stage-scoped wear + an explicit
"wear it site-wide" handoff to the dock keeps one owner per concern.

**Share-URL size** — state budget: 64 token values (~800 B) + ≤10 answers (~100 B) + breadboard
caps 6×6 (~600 B) + pattern id ⇒ ~1.6 KB raw, ~1.1 KB base64url-deflated (CompressionStream is
in all evergreen browsers; feature-detect and fall back to uncompressed — still fine).

**Risk register** — (1) the figma-map extraction is the highest-regression-risk diff: do it
first, alone, behind the byte-identity gate; (2) breadboard editor scope creep: the caps and the
three edit verbs are the appetite — circuit-break there; (3) method-fidelity copy: have the
review gate check quotes against the cited chapters; (4) VR flake on an interactive page: the
`data-build="ready"` settled-state handle + animations-disabled is the known-good recipe;
(5) the "not in the library yet" card must feel like craft, not failure — design it properly.

**Slice-1 appetite** (Shape Up on ourselves): ~2 weeks. If the circuit breaker trips: cut the
queue pattern (ship dashboard only + honest cards), never cut the ethics pair, the share link,
or the byte-identity gate.

## AMENDMENTS

- **2026-07-26, at slicing (piv-slice-epic), post-PR #133:** Phase 1.1 is already shipped — #130
  did not stay planned. PR #133 merged today and extracted the pure mapping core into
  `system/pack-import.mjs` (view-time safe, no `node:` imports, CLI re-pointed, byte-identity gate
  run in that PR), plus `system/brand-import.mjs` (home beat-02 drop surface: mapping report +
  site-wide "wear it" + tokens.css download) and `system/pack-imported.mjs` (the imported-pack
  record, `pack-derived.mjs`'s sibling — full scale values, which answers open question Q2).
  Deltas to this plan: the module is named `pack-import.mjs`, not `figma-map.mjs` (keep the
  shipped name); the plan's `mapExport` surface is the shipped `mapPack` + `emitPackCss`; slice 1
  therefore starts at Phase 1.2, with `build-import.mjs` consuming the shipped engine and reusing
  brand-import's drop semantics **scoped to the stage** (site-wide wear stays brand-import/dock's
  job). AC1 is satisfied on main — slice-1 tickets verify and consume, never re-extract. "#130 is
  closed as superseded" is amended to: #130 shipped and closed (PR #133); this epic **extends**
  it — its drop surface is Act 0's foundation. (AC11's "#130 pointer" becomes a comment on #130
  linking the epic.)
