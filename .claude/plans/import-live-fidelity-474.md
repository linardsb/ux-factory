# Feature: live import fidelity — render the candidate and measure ΔE-MIN (#474)

The following plan should be complete, but it is important that you validate documentation and codebase
patterns and task sanity before you start implementing. Pay special attention to naming of existing utils,
types and models. Import from the right files.

**Every line number below was read on `origin/main` at `1b43cee` (2026-09-28).** The session branch
`fix/importer-reads-icon-name-449` is BEHIND main (it predates #311 PR B, #455 and #477). Branch this ticket
from `origin/main`, never from that branch.

## Feature Description

A live Brilliant import (#311) writes an import record whose `fidelity` block carries WCAG only, so
`fidelityVerdict` answers `missing` and the canvas page says "missing — not measured, never a pass". This
ticket adds the measurement: on the owner's click, the importer's own composition for the first imported
part is rendered under the neutral pack in headless Chromium, at the reference's scale, and compared with
`imports/<id>.reference.png` by the existing wrong-but-green detector (`import/fidelity.mjs`, S3's rung 6,
ink-colour ΔE CIEDE2000, absolute threshold 5.0). The record then reads `green` or `red` in place of
`missing`, and `checkRecord` still holds. (Until Q1's
contrast fix, the neutral pack fails one WCAG pair, so every live verdict derives `red`; the measured ΔE
is what separates a faithful mapping from a wrong one.)

## User Story

As the owner importing a design from Brilliant
I want to press "Measure fidelity" on an import and see green or red with the worst part named
So that a mapping that is legible but visibly not the designer's colours reads red instead of "missing"

## Problem Statement

`portal/lib/import-run.mjs` invariant 5 (lines 22-24) records the gap: measuring ΔE needs a headless render,
and the portal cannot load one — its dependencies are the Agent SDK and `zod`, and CLAUDE.md § Ground rules
says "nothing else". Every live record therefore reads `missing`, and the epic's "honest fidelity" metric
(`docs/epics/canvas-design-import.prd.md` line 179) is unmet on the live path. Only the two committed fixture
records (`import/fixtures/records/`, S3's hand-authored harness candidates) carry a measurement.

## Solution Statement

Owner's calls, 2026-09-28 (this planning session):

- **D1 — where the renderer runs:** a portal button calls a new route; the route spawns
  `node tooling/measure-render.mjs` as a child process, which loads Playwright from
  `tooling/visual-regression/node_modules` the way every journey does (`createRequire(VRDIR)`). The portal
  gains no dependency and group 43 keeps importing the import path in CI with no `portal/node_modules`.
- **D2 — regions:** from the candidate DOM. Each rendered element that carries its own text, each `svg`,
  and the root, as bounding boxes scaled to image pixels. This is S3's own method: `capture.txt` read its
  eight regions off the faithful candidate's `[data-part]` boxes (`.claude/plans/canvas-spike-s3/capture.txt`
  lines 173-181).
- **D3 — the live proof blocks the PR:** an owner-run live import pair (one faithful, one wrong) is
  committed verbatim as the positive control. Every committed input today builds a `null` composition, so
  without it nothing real can reach a green or a red.

Decided at ticket level (this plan):

- **D4 — the scale is ours, not a default, and it is 1.** `readBrilliant`'s export call passes
  `scale: EXPORT_SCALE` explicitly, with `EXPORT_SCALE = 1`. Brilliant documents `scale` "Defaults to 2.0"
  (`import/fixtures/brilliant-live/tools-list.json` → `schemas.export.properties.scale`), and the committed
  capture shows it (`s(395,201)` exported as 790×402). Scale 1 is where `THRESHOLD = 5.0` was calibrated
  (S3, 361×221), and this session's proxy measured the lower floor there: faithful worst 2.3242 at scale 1
  against 3.3604 at scale 2 (NOTES, pre-flight 11). The candidate renders at the SAME scale the reference was
  exported at, read per record — never guessed (Task 3's `scaleOf`): the import transcript's own `export`
  tool line records the call's `input`, so a record made after this ticket says `scale: 1`, and a record
  made before it carries no `scale`, which means Brilliant's documented default, 2. A numeric source width
  that disagrees with the reference at that scale by more than 1 px is refused.
- **D4b — any reference size is measurable (crop, never refuse on parity).** The candidate renders at
  `ceil(ref / scale)` CSS px, so its PNG is at least the reference's size (a fractional CSS clip comes out
  short: 197.5×81.5 at DSF 2 → 394×162, observed). Both PNGs are decoded and the candidate is cropped
  top-left to the reference's exact size in memory before `measureImages`; no PNG encoder is needed. The
  record's candidate hash stays the hash of the child's raw bytes, and its source string says it was cropped.
- **D5 — alpha is flattened over a stated backdrop.** Brilliant exports with `background: "clear"`
  (documented default) and the committed 790×402 export carries alpha 215 at three pixels, so today's
  `decodePng` throws on it (observed). `decodePng` gains an opt-in `{ over: [r,g,b] }` that composites
  alpha onto that colour; the default still throws, so the committed fixture numbers cannot move. Both
  sides use `BACKDROP = #ffffff` — S3's reference page background (`capture.txt` line 157).
- **D6 — a measurement is invalidated by any mapping edit.** `editMapping` already rebuilds the record
  through `recordFor`, which writes WCAG only, so the verdict returns to `missing` by construction; the edit
  also deletes the stale `imports/<id>.candidate.png`. The view offers "Measure fidelity" again.
- **D7 — a null composition is a refusal, not a red.** Nothing was built, so there is nothing to render;
  the drop list already says why. The record stays `missing`.
- **D8 — the portal owns the record; the child only renders.** `tooling/measure-render.mjs` returns PNG
  bytes and CSS-pixel boxes on stdout and writes nothing. `portal/lib/import-measure.mjs` derives the
  regions, runs `measure()`, rebuilds the record through `buildRecord` and writes under the build root.

## Out of Scope / Non-Goals

- Not included: a threshold change. `THRESHOLD = 5.0` was calibrated at DSF 1 (`import/fidelity.mjs`
  lines 203-214). If the owner's live pair at DSF 2 does not separate (faithful ≥ 5.0 or wrong < 5.0),
  STOP and bring the numbers to the owner — switching the threshold or the rung is the owner's call
  (fidelity.mjs header, "WHY RUNG 6"), and tuning it until the pair comes out is forbidden (CLAUDE.md,
  design-import core bullet).
- Not included: measuring any part but the first. The read exports `ids: [read[0]]` only
  (`import-run.mjs` line 585), so `compositions[0]` ↔ `ir.children[0]` is the one pair with a reference.
- Not included: Firefox or WebKit candidates. The renderer is Chromium, stated in the record's candidate
  source string.
- Not included: a drop-entrance measurement. A dropped file has no `reference.png`; the route refuses it.
- Not included: showing the candidate PNG in the view. The Mapped column already renders the same
  composition live.
- Not changing: the two committed fixture records or `tooling/regen-import-records.mjs`. Their bytes must
  not move (group 42.6 compares them byte for byte).
- Not changing: `THRESHOLD`, `JND`, `MIN_AREA`, `DEGENERATE`, rung 6, `fidelityVerdict`, `checkRecord`.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High (a new child-process boundary, a pure decode change, an owner-run live proof)
**Primary Systems Affected**: `import/fidelity.mjs`, `portal/lib/import-run.mjs`, new
`portal/lib/import-measure.mjs`, new `tooling/measure-render.mjs`, `portal/server.mjs`,
`portal/public/canvas-import.mjs`, `tooling/build-checks.mjs` (groups 42, 43), `tooling/canvas-journey.mjs`
**Dependencies**: `@playwright/test` 1.61.1, already in `tooling/visual-regression/package.json`; nothing new

## Related Work

**Implements**: #474 · **Epic**: #295, `docs/epics/canvas-design-import.architecture.md` (§ Data model
"The import record", § Spikes S3)

**Back-references**:

- `.claude/plans/import-run-recorded-import-311.md` — Out of Scope line 63 deferred this ticket; invariant 5.
- `.claude/plans/import-run-live-read-311-pr-b.md` — the live read, `readBrilliant`, the fake bridge.
- `.claude/plans/import-record-snap-rules-307.md` — D1 (rung 6, absolute threshold), D2 (the no-ink fallback).
- `.claude/plans/canvas-spike-s3/` — `capture.txt` (regions from the candidate DOM), `compare.txt`.

**Forward-references**: (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `import/fidelity.mjs` (whole file, 295 lines) — `decodePng` :53-128 (the alpha throw at :123-125,
  `if (bpp === 3) return` at :120), `THRESHOLD` :214, `measureImages` :258-287, `measure` :292-295. The
  header's "ONE STATED FIX TO THE LIFT (D2)" block is the shape a second stated fix follows.
- `import/report.mjs` — `fidelityVerdict` :70-77, `buildRecord` :133-145, `checkRecord` :174-205 (O3b same-
  image refusal at :199-202), `checkReferenceIndependence` :208-218, `projectRecord` fidelity section
  :323-345 (already prints worst, regions table, both sources — no change needed).
- `portal/lib/import-run.mjs` — header invariants :9-29 (invariant 5 at :22-24 is rewritten),
  `recordFor` :207-221, `underRoot` :312-317, `writeImport` :321-342, `editMapping` :354-396,
  `importView` :474-508 (fidelity label :497), `withBridge`/`readBrilliant` export call :585,
  `underLock` :596-602 (module-private today).
- `portal/lib/builder.mjs` :244-248 — `withRunLock(fn, what)`; the throw text contains "already in flight".
- `portal/lib/brilliant-mcp.mjs` :34, :58 — the one existing `spawn` in `portal/lib/`, its stdio shape.
- `portal/server.mjs` :503-517 — the `/api/canvas/import/view` and `/mapping` routes to mirror.
- `portal/public/canvas-import.mjs` — `api` :49-53, `statusLine` :58, `showRefusal` :73-92, `edit` :231-239,
  `renderView` :291-331 (fidelity paragraph :309-311).
- `tooling/regen-import-records.mjs` :84-101 — how a `deltaEMin` block is assembled (`measure()` output plus
  `reference.source`, `candidate.source`, `candidate.file`).
- `tooling/canvas-journey.mjs` — `createRequire(VRDIR)` :65-79, `seed()` :213-230, `withPortal` :159-190,
  `importPass` :617-, I2's fidelity assertion :655, the success line :1025.
- `tooling/fake-brilliant-bridge.mjs` :55 — `export` answers `args.width ? thumb : png`; adding `scale`
  does not change which capture it serves.
- `tooling/build-checks.mjs` — group 42 block ends before :13767 (`group("import-record", …)`); group 43's
  preamble :13776-13840 (`fold`, `afold`, `threw`, `pkgCopy`, `gitSnap`, `INPUTS`), 43.1's import-graph pins
  :13812-13832, 43.5 :13947-13956, `group("import run", …)` :14264.
- `.claude/plans/canvas-spike-s3/capture.txt` :139-181 — one launch, `document.fonts.ready`, boxes read off
  the DOM relative to the root with `Math.round`.

### New Files to Create

- `portal/lib/import-measure.mjs` — the measurement: `BACKDROP`, `regionsFromBoxes`, `spawnRender`,
  `measureImport`. Node built-ins + `import/` + `./import-run.mjs` + `./env.mjs` only (no `./builder.mjs`:
  the lock comes through import-run's `underLock`).
- `tooling/measure-render.mjs` — the renderer child: stdin job → headless Chromium → one JSON line on stdout.
- `import/fixtures/measure-live/` — the owner's live pair, verbatim (Task 11): `README.md`,
  `mapping.json`, and per frame `<frame>.blueprint.txt`, `<frame>.reference.png`, `<frame>.candidate.png`,
  `<frame>.measure.json`, for `<frame>` ∈ {`faithful`, `wrong`}.

### Relevant Documentation

- Playwright `page.screenshot({ clip })` and `deviceScaleFactor` — https://playwright.dev/docs/api/class-page#page-screenshot
  and https://playwright.dev/docs/api/class-browser#browser-new-context (option `deviceScaleFactor`). Why:
  the candidate must come out at exactly the reference's pixel size.
- Playwright `page.route` / `route.fulfill` — https://playwright.dev/docs/api/class-route#route-fulfill.
  Why: the harness serves repo files from disk under a fake origin and aborts everything else (hermetic).
- Porter–Duff "over" with an opaque backdrop: `out = (c·a + o·(255−a)) / 255` per channel. Why: D5.

### Patterns to Follow

**Playwright from the tool dir** (`tooling/canvas-journey.mjs:65-79`):

```js
const VRDIR = path.join(HERE, "visual-regression");
const require = createRequire(`${VRDIR}${path.sep}`);
const pw = require("@playwright/test");
```

In `measure-render.mjs` guard it first with `existsSync(path.join(VRDIR, "node_modules", "@playwright", "test"))`
and exit **3** naming the install command (capture.txt's `vrDir()` refuses by name the same way).

**Refusal as data, one action** (`import-run.mjs:419`, `:596-602`):

```js
return { refused: { kind: "not-an-export", message: `…`, action: { label: "…" } } };
```

**Throws name the path** (`import-run.mjs:315`): `throw new Error(\`import-run: … — refused\`)`.

**Route shape** (`server.mjs:503-510`): `resolveRunRoot` → `assertProvenanceRoot` → `isProposalName` 400 →
`json(res, 200, await …)`.

**Header discipline**: a new module opens with `// <path> — hand-written canon (this repo; not generated).`,
cites `epic #295 ticket #474` and this plan, and lists its invariants as numbered lines, as
`import-run.mjs:1-29` does.

**Measured probe (observed, this session)** — the render path works as planned. A synthetic stack of two
texts, rendered from `/system/agentic-renderer.mjs` served off disk through `page.route` under
`http://measure.invalid`, at viewport 360×110 DSF 2, clip 320×70:

```
boxes: root 0,0 320x70 · text:Amara Okafor 16,16 288x25.59 · text:Last seen 2 min ago 16,45.59 288x19.5
page errors: []   png: 640x140, colour type 2 (RGB)
```

---

## IMPLEMENTATION PLAN

### Phase 1: The pure half (CI-reachable)

`decodePng`'s opt-in flatten, the region derivation, the scale rule, and the record rebuild. Everything here
runs in `build-checks` with no browser.

### Phase 2: The renderer child

**Independent of:** Phase 1 (it only emits PNG bytes and boxes). Can run in parallel.

### Phase 3: Integration

**Depends on:** Phases 1 and 2. The route, the button, the edit invalidation, the header and gate prose.

### Phase 4: The owner's live proof, then the gates that replay it

**Depends on:** Phase 3 (the owner needs the Measure button to produce the candidate). Task 11 is
owner-run and blocks the PR (D3); Tasks 12-13 replay its committed output.

---

## STEP-BY-STEP TASKS

### Task 1 — UPDATE `import/fidelity.mjs`: the opt-in alpha flatten (D5)

- **IMPLEMENT**:
  - `export function decodePng(buf, label = "png", { over = null } = {})`. When `over` is non-null it must be
    an array of three integers 0-255, else throw `png: ${label}: over must be [r, g, b] integers 0-255`.
    In the `bpp === 4` branch (:121-127): with `over`, each pixel becomes
    `Math.round((c * a + over[k] * (255 - a)) / 255)` per channel; without it, keep today's throw verbatim.
    Colour type 2 ignores `over` (already opaque).
  - `export function measure(refBytes, candBytes, regions, { over = null } = {})` passes `{ over }` to
    both `decodePng` calls. The returned `reference.sha256` / `candidate.sha256` stay the hashes of the RAW
    bytes (the file on disk), never of the flattened pixels.
  - Header: rename "ONE STATED FIX TO THE LIFT (D2)" to "TWO STATED CHANGES TO THE LIFT" and add a D5 (#474)
    paragraph: Brilliant's export is RGBA with `background: "clear"` by default; the throw stays the
    default so the committed fixtures cannot move; a caller that flattens names its backdrop in the
    record's source strings.
- **PATTERN**: the existing ct 6 branch, `import/fidelity.mjs:120-127`.
- **IMPORTS**: none new.
- **GOTCHA**: Integer math only (`Math.round` of an integer expression). No float colour space here, or the
  4 dp determinism note in the header stops holding across Node versions.
- **GOTCHA**: `measure()`'s third positional argument is `regions`. The option object is the FOURTH.
  `tooling/regen-import-records.mjs:85` calls it with three and must stay untouched.
- **VALIDATE**: `node tooling/regen-import-records.mjs --check` → observed on main before the change:
  `import records ✓  import/fixtures/records/ — 4 files, 187933 bytes, no drift`. Must print the same after.
  And (expected):
  `node --input-type=module -e 'import {decodePng} from "./import/fidelity.mjs"; import {parseExport} from "./portal/lib/brilliant-mcp.mjs"; import {readFileSync} from "fs"; const b=parseExport(JSON.parse(readFileSync("import/fixtures/brilliant-live/export-png.json"))).bytes; const d=decodePng(b,"x",{over:[255,255,255]}); console.log(d.w,d.h); try{decodePng(b,"x")}catch(e){console.log("default:",e.message.slice(0,60))}'`
  → `790 402` then `default: png: x: alpha 215 at pixel 316789 is not opaque …` (the default throw text
  observed this session).
- **SATISFIES**: AC 1 (a live reference can be measured at all), AC 5 (committed records unmoved).
- **REGENERATES**: none. The records must NOT change; if `--check` drifts, the change touched the default path.

### Task 2 — ADD build-checks case 42.15: the flatten, both ways

- **IMPLEMENT** (inside group 42's block, after 42.14, in group 42's voice with `fold`/`threw`):
  1. The committed `export-png.json` PNG (via `parseExport`, already imported by group 43 — import it here
     too, or read the base64 from the reply's `content[].data` directly) decodes with
     `{ over: [255,255,255] }` to 790×402, and **still throws** without it, naming "not opaque".
  2. A SYNTHETIC 2×1 RGBA PNG built in memory (`zlib.deflateSync` + a hand-written IHDR/IDAT/IEND with
     CRC32s — build-checks has no PNG encoder today, `grep deflateSync` → 0 hits) with pixel 0 =
     `[0,0,0,0]` and pixel 1 = `[101,0,0,128]`: over white → `[255,255,255]` and `[178,127,127]`
     (`(101·128 + 255·127) / 255 = 177.70` → 178 by `Math.round`, 177 by `Math.floor` — observed).
  3. `over: [256, 0, 0]` and `over: "white"` each throw naming `over`.
  4. `measure(ref, cand, regions)` with no options still equals the committed faithful record's
     `deltaEMin.worst` (reuse the S3 fixtures group 42 already reads) — the default path is unmoved.
- **PATTERN**: group 42's existing cases around `tooling/build-checks.mjs:13494-13510`.
- **GOTCHA**: Write the ~20-line encoder inline and label the fixture SYNTHETIC in the failure message (the
  group's convention for synthetic cases).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "import-record|✗"` → `build import-record  ✓` and
  no `✗` other than the known fresh-worktree `icons` 41.7 (see NOTES) if `tooling/icons/node_modules` is absent.
- **REDDENS**: (a) `Math.round` → `Math.floor` in the composite → `42.15: [101,0,0,128] over #ffffff decoded to 177,127,127 — expected 178,127,127 (round, not floor)`.
  (b) swap `a` and `255 - a` → pixel 0 decodes `0,0,0` → `42.15: a fully transparent pixel over #ffffff decoded to 0,0,0 — the composite weights are swapped`.
  (c) delete the `over` branch → case 1 throws "not opaque" with `over` passed → named failure through `fold`.
- **SATISFIES**: AC 1, AC 5.
- **REGENERATES**: none.

### Task 3 — CREATE `portal/lib/import-measure.mjs`: the pure helpers

- **IMPLEMENT** (pure exports first; `measureImport` is Task 6):
  - Header per the discipline above, with invariants:
    1. THE CHILD RENDERS, THIS MODULE MEASURES AND WRITES (D8). Playwright is never imported here, statically
       or lazily — the renderer is a spawned `node` process.
    2. NOTHING IS WRITTEN OUTSIDE THE BUILD ROOT — every target through `underRoot`.
    3. A MEASUREMENT IS OF THE RECORD IT WAS TAKEN FROM: the record, mapping and template are re-read
       after the render and compared; a change is a `stale` refusal and nothing is written.
    4. A REFUSAL IS DATA with one action; a bug (size mismatch, a record `checkRecord` refuses) throws.
  - `export const BACKDROP = Object.freeze([255, 255, 255]);` and `export const BACKDROP_HEX = "#ffffff";`
    with the reason (S3's `capture.txt:157` page background; any colour works so long as both sides use it).
  - `export function regionsFromBoxes(boxes, scale, imgW, imgH)` → `{ regions, skipped }`. For each box
    `{ name, x, y, w, h }` in CSS px relative to the root: `x = Math.round(b.x * scale)` (same for y, w, h —
    capture.txt's `Math.round`), clamp so `x + w ≤ imgW` and `y + h ≤ imgH`; a box whose clamped w or h is
    ≤ 0 goes to `skipped` by name (never silently). Names are de-duplicated in order: a second `text:Pay`
    becomes `text:Pay #2`. Throws naming the index on a non-finite coordinate or a non-string name.
  - `export const LEGACY_SCALE = 2;` — Brilliant's documented default, the scale of every reference read
    before this ticket (their export call passed none).
  - `export function scaleOf(transcriptLines, rootW, ref)` → `{ scale }` or `{ refused }`. The scale is the
    `input.scale` of the LAST `{ type: "tool", tool: "export", ok: true }` line in the import transcript
    (`import-run.mjs:549` writes `input: args`); a line with no `scale` → `LEGACY_SCALE`; no export line at
    all → `{ refused: { kind: "no-reference", … } }` (a drop). A `scale` that is not 1, 2 or 3 → refused
    `unknown-scale`. When `rootW` is a finite number and `Math.abs(ref.w - rootW * scale) > 1` → refused
    `unknown-scale`, naming both figures (`the reference is 790 px wide; the source says 360 × 2 = 720`).
    A non-numeric `rootW` (`fill`/`hug`) passes: the scale came from our own call (D4).
  - `export function cropTo(img, w, h)` → a new `{ w, h, data }` holding the top-left `w × h` of a decoded
    image (`decodePng`'s shape: `data` is RGB, 3 bytes a pixel). Throws naming both sizes when `img` is
    smaller than `w × h` on either axis, or more than `scale` px larger (a renderer bug, not a crop).
  - `export function withMeasurement(record, deltaEMin)` → `buildRecord({ id, source, ir, recognition,
    mapping, fidelity: { wcag: record.fidelity.wcag, deltaEMin }, provenance, elapsed,
    ...(Object.hasOwn(record, "suggestions") ? { suggestions: record.suggestions } : {}) })`. `buildRecord`
    re-derives snaps, drops and unbound and runs `checkRecord` (report.mjs:133-145), so a measurement
    cannot smuggle a stale derived field.
- **PATTERN**: `import-run.mjs` header and export style; `buildRecord` call shape at
  `tooling/regen-import-records.mjs:88-101`.
- **IMPORTS**: `node:child_process` (`spawn`), `node:fs`, `node:path`, `node:crypto`;
  `../../import/fidelity.mjs` (`decodePng`, `measureImages`, `sha256`);
  `../../import/report.mjs` (`buildRecord`, `checkReferenceIndependence`, `projectRecord`);
  `./import-run.mjs` (`underRoot`, `underLock`, `importView`, `isProposalName`, `sortKeys`, `jsonText`);
  `./env.mjs` (`REPO_DIR`).
- **GOTCHA — ORDER**: this module imports `underLock`, `sortKeys` and `jsonText` from
  `import-run.mjs`, which do not exist as exports until Task 7. A missing named export fails at LINK time,
  so the module will not load at all. Do Task 7's first two bullets (the constant and the three exports)
  before this task.
- **GOTCHA**: Do NOT import `./builder.mjs` directly for the lock; use `import-run`'s `underLock` (exported in
  Task 7) so the lock's busy refusal text stays one copy.
- **GOTCHA**: `withMeasurement` must NOT spread `record.fidelity` (it carries `verdict`); pass `wcag` and
  `deltaEMin` only and let `buildRecord` derive the verdict.
- **VALIDATE** (expected, after Task 7 exports exist):
  `node --input-type=module -e 'import * as M from "./portal/lib/import-measure.mjs"; console.log(JSON.stringify(M.regionsFromBoxes([{name:"root",x:0,y:0,w:320,h:70},{name:"t",x:16,y:16,w:288,h:25.59}],2,640,140)))'`
  → `{"regions":[{"name":"root","x":0,"y":0,"w":640,"h":140},{"name":"t","x":32,"y":32,"w":576,"h":51}],"skipped":[]}`.
  And (expected): `M.scaleOf([{type:"tool",tool:"export",ok:true,input:{format:"png"}}], 395, {w:790,h:402})`
  → `{"scale":2}`; with `input.scale: 1` and `{w:320,h:82}` for 320 → `{"scale":1}`; with `input.scale: 1`,
  360 and `{w:790,…}` → `refused.kind === "unknown-scale"`. `M.cropTo({w:4,h:2,data:Buffer.alloc(24,7)},3,1)`
  → `{w:3,h:1}` with 9 bytes.
- **SATISFIES**: AC 2 (regions from the candidate DOM), AC 3 (checkRecord still holds), AC 11 (any size).
- **REGENERATES**: none (portal/ is in no loc-summary group — `agent-layer/gen-loc-summary.mjs:22-26`).

### Task 4 — CREATE `tooling/measure-render.mjs`: the renderer child (D1, D8)

- **IMPLEMENT**:
  - Header: what/why, "spawned by portal/lib/import-measure.mjs; writes NOTHING; one JSON line on stdout;
    exit 3 = no Playwright, 1 = anything else, with one line on stderr naming it".
  - Read stdin to end; `JSON.parse` → job `{ composition, width, height, scale, backdrop }` (CSS px, DSF,
    `"#rrggbb"`). Validate by hand, throwing by field name.
  - `const VRDIR = process.env.UXF_MEASURE_VRDIR || path.join(HERE, "visual-regression")` — the env seam
    exists so a check can prove exit 3 without touching the shared `node_modules`.
  - Playwright guard → exit 3: `measure-render: no @playwright/test under <VRDIR>/node_modules — run: cd tooling/visual-regression && npm ci`.
  - One `pw.chromium.launch()`; `newContext({ viewport: { width: Math.ceil(width) + 40, height: Math.ceil(height) + 40 }, deviceScaleFactor: scale })`.
  - `page.route("**/*")`: origin `http://measure.invalid` only. `/` → the harness HTML: the three
    stylesheets `canvas.html:13-15` links (`/system/tokens.contract.css`, `/system/tokens.neutral.css`,
    `/system/components.css`), `html,body{margin:0;background:<backdrop>}`, and
    `#root{width:<width>px;height:<height>px;overflow:hidden}`. Any other path → the file under the repo
    root, refused (404) unless it resolves under it; content type by extension (`.css`, `.mjs`/`.js`,
    `.json`). Every other origin → `route.abort()`.
  - `page.on("pageerror")` collects; any page error → exit 1 naming the first.
  - `page.evaluate` (the probe above, verbatim in shape): import `/system/agentic-renderer.mjs`, fetch
    `/handoff/verdant/vocabulary.json`, `renderComposition(vocab, composition)` into `#root`,
    `await document.fonts.ready`, then boxes: `root` first (0,0,w,h), then every element under `#root`
    with a non-whitespace direct text node or `localName === "svg"`, named `data-part` ??
    `text:<first 24 chars of textContent.trim()>` ?? `icon`, relative to `#root`'s rect, UNROUNDED (rounding
    is `regionsFromBoxes`'s, one place).
  - `page.screenshot({ clip: { x: 0, y: 0, width, height } })` → assert the PNG's IHDR is exactly
    `width*scale × height*scale` (the parent sends whole CSS pixels, D4b); otherwise exit 1 naming both sizes.
  - stdout: one line `{"png":"<base64>","boxes":[…],"engine":"chromium","version":"<browser.version()>"}`.
  - `browser.close()` in `finally`.
- **PATTERN**: `.claude/plans/canvas-spike-s3/capture.txt:139-181`; `tooling/canvas-journey.mjs:65-79`.
- **IMPORTS**: `node:module` (`createRequire`), `node:fs`, `node:path`, `node:url`.
- **GOTCHA**: A `renderComposition` refusal throws inside `evaluate` — catch it and exit 1 with its message;
  never print a partial stdout line (the parent parses the ONE line).
- **GOTCHA**: `width`/`height` arrive as whole CSS pixels (`Math.ceil(ref / scale)`, Task 6), and the parent
  crops. The IHDR assertion stays: it is the only check that the clip really came out at the asked size.
- **GOTCHA**: This file lives under `tooling/`, so CI `verify` syntax-checks it (`node --check`) but never runs
  it. It must not import from `portal/`.
- **VALIDATE** (expected): `echo '{"composition":{"name":"stack","props":{"direction":"column","gap":"xs","pad":"md"},"children":[{"name":"text","props":{"role":"body","content":"Amara Okafor"}}]},"width":320,"height":70,"scale":2,"backdrop":"#ffffff"}' | node tooling/measure-render.mjs | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);const b=Buffer.from(j.png,"base64");console.log(j.engine,b.readUInt32BE(16),b.readUInt32BE(20),j.boxes.length)})'`
  → `chromium 640 140 2` (the shape observed in this session's probe). The same job with `"scale":1` →
  `chromium 320 70 2`. And with a bad `@playwright/test` resolution (run it with the env
  `UXF_MEASURE_VRDIR=/nonexistent`, a test seam the script reads before its default `tooling/visual-regression`)
  → exit code 3 — never move the real `node_modules` aside in a shared worktree (memory
  `shared-worktree-parallel-sessions`).
- **SATISFIES**: AC 1, AC 2.
- **REGENERATES**: none.

### Task 5 — UPDATE `tooling/build-checks.mjs` 43.1: pin the new module's import graph

- **IMPLEMENT**: beside the `brilliant-mcp.mjs` pin (:13824-13832): import
  `../portal/lib/import-measure.mjs` in a try (a failure is a named ok(false)); parse its static specifiers
  (the `bmFrom` regex) and require every one to be `node:*`, `../../import/*.mjs`, or one of
  `./import-run.mjs`, `./env.mjs`; and assert the stripped source matches none of
  `/playwright|claude-agent-sdk|\bzod\b|@modelcontextprotocol/` and has no dynamic `import(`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "import run|✗"`.
- **REDDENS**: add `const pw = await import("@playwright/test");` to import-measure.mjs → the dynamic-import
  assertion fails: `43.1: portal/lib/import-measure.mjs imports dynamically or names playwright — the renderer is a spawned child (D1)`.
- **SATISFIES**: AC 4 (the portal's dependency rule holds).
- **REGENERATES**: none.

### Task 6 — ADD `spawnRender` and `measureImport` to `portal/lib/import-measure.mjs`

- **IMPLEMENT**:
  - `const RENDER_TIMEOUT_MS = () => Number(process.env.UXF_MEASURE_TIMEOUT_MS) || 60_000;`
  - `export function spawnRender(job, { timeoutMs = RENDER_TIMEOUT_MS() } = {})` → Promise of
    `{ png: Buffer, boxes, engine, version }` or `{ refused }`. `spawn(process.execPath,
    [path.join(REPO_DIR, "tooling/measure-render.mjs")], { stdio: ["pipe","pipe","pipe"] })`; write
    `JSON.stringify(job)`, end stdin; collect stdout/stderr; on timeout `kill("SIGKILL")` →
    `{ refused: { kind: "render-timeout", message, action: { label: "Measure again", measure: true } } }`;
    exit 3 → `{ kind: "no-renderer", message: <stderr line>, action: { label: "Show the install command",
    hint: "cd tooling/visual-regression && npm ci" } }`; any other non-zero or unparseable stdout →
    `{ kind: "render-failed", message: "The renderer failed.", detail: <last stderr line>,
    action: { label: "Measure again", measure: true } }`.
  - `export async function measureImport({ pkgRoot, name, render = spawnRender })` →
    `underLock(async () => { … }, "a measurement")`:
    1. `isProposalName(name)` else throw. `buildRoot = path.join(pkgRoot, "build")`. Read
       `proposals/<name>/mapping.json` → `recordId`; `imports/<id>.json`; `proposals/<name>/template.txt`
       (`compositions`); keep the three raw strings for step 6.
    2. No `imports/<id>.reference.png` → `{ refused: { kind: "no-reference", message: "This import has no
       original render: a dropped file carries none, so there is nothing to measure against.", action:
       { label: "Import it from Brilliant to measure it", hint: "Select it in Brilliant, then Import selection" } } }`.
    3. `compositions[0] == null` → `{ refused: { kind: "nothing-built", message: "The importer built
       nothing for the first part, so there is no candidate to render. The drop list says why.", action:
       { label: "Map the part in the editor below", hint: "Choose a builder in the Mapping list" } } }` (D7).
    4. Reference size from IHDR (`readUInt32BE(16)`, `(20)`); read `imports/<id>.transcript.jsonl`;
       `scaleOf(lines, record.ir.children[0]?.layout?.size?.w, ref)` → a refusal is returned as is.
    5. `const t0 = Date.now(); const out = await render({ composition: compositions[0], width:
       Math.ceil(ref.w / scale), height: Math.ceil(ref.h / scale), scale, backdrop: BACKDROP_HEX })`;
       `out.refused` → return it.
    6. Re-read the three files; any differs from step 1 → `{ refused: { kind: "stale", message: "The
       mapping changed while measuring.", action: { label: "Measure again", measure: true } } }`, write nothing.
    7. `{ regions, skipped } = regionsFromBoxes(out.boxes, scale, ref.w, ref.h)`;
       `A = decodePng(refBytes, "reference", { over: BACKDROP })`;
       `B = cropTo(decodePng(out.png, "candidate", { over: BACKDROP }), A.w, A.h)`;
       `m = { ...measureImages(A, B, regions), reference: { sha256: sha256(refBytes) }, candidate: { sha256: sha256(out.png) } }`
       (the shape `measure()` returns, `import/fidelity.mjs:292-295`, built by hand because of the crop);
       `deltaEMin = { ...m, reference: { ...m.reference, source: \`Brilliant export(png) of ${ids[0]} at
       scale ${scale}, flattened over ${BACKDROP_HEX}\` }, candidate: { ...m.candidate, source:
       \`the importer's composition rendered by system/agentic-renderer.mjs under tokens.neutral.css in
       ${out.engine} ${out.version} at DSF ${scale} on ${BACKDROP_HEX}, cropped top-left to ${A.w}×${A.h}
       (tooling/measure-render.mjs)\`, file: \`imports/${id}.candidate.png\` } }`.
    8. `record2 = withMeasurement(record, deltaEMin)`; `checkReferenceIndependence` over every
       `imports/i*.json` in the build with `record2` replacing its own entry (throws on O3b).
    9. Write, in this order, all through `underRoot`: `imports/<id>.candidate.png` (the child's bytes),
       then APPEND one line to `imports/<id>.transcript.jsonl`: `{ type: "measure", ts, engine, version,
       scale, reference: { w, h, sha256 }, candidate: { sha256, bytes }, boxes: out.boxes, skipped,
       worst: m.worst, scored: m.scored, verdict: record2.fidelity.verdict, ms }`, then `imports/<id>.json`
       (sorted keys, 2-space, trailing newline — `writeImport`'s `jsonText(sortKeys(…))`) and
       `imports/<id>.md` (`projectRecord`).
    10. Return `{ measured: true, verdict, worst, view: importView(pkgRoot, name) }`.
- **PATTERN**: `import-run.mjs` `runImport` :404-466 (lock, order, refusal-as-data); `writeImport` :321-342.
- **GOTCHA**: `sortKeys`/`jsonText` are module-private in `import-run.mjs` (:306-309). Export them from
  import-run (one line each) rather than copying — a second copy of the canonical JSON writer is how two
  records stop comparing byte for byte.
- **GOTCHA**: the transcript is append-only: `appendFileSync`, never a rewrite.
- **GOTCHA**: the `measure` line's `boxes` are the CSS-px boxes the child returned, unrounded. They are the
  replay input Task 12 reads; rounding them here would make the replay test the rounding twice.
- **VALIDATE**: Task 12 drives it. Until then (expected):
  `node -e 'import("./portal/lib/import-measure.mjs").then(m=>console.log(Object.keys(m).sort().join(" ")))'`
  → includes `BACKDROP BACKDROP_HEX LEGACY_SCALE cropTo measureImport regionsFromBoxes scaleOf spawnRender withMeasurement`.
- **SATISFIES**: AC 1, AC 3, AC 6 (refusals).
- **REGENERATES**: none.

### Task 7 — UPDATE `portal/lib/import-run.mjs`: scale, exports, the edit invalidation, invariant 5

- **IMPLEMENT**:
  - `export const EXPORT_SCALE = 1;` beside `TIMEOUT_MS` (:512) with the D4 reason, and pass
    `scale: EXPORT_SCALE` in `readBrilliant`'s export call (:585):
    `s.call("export", { canvasId: s.canvasId, ids: [read[0]], format: "png", scale: EXPORT_SCALE }, project)`.
    Browse's thumbnail call (:635) keeps `width: 160` — `scale` and `width` are mutually exclusive.
    Side effect, wanted: the Original pane's `<img>` now shows the design at its real CSS size, beside the
    Mapped column, where a 2x export showed it twice as wide.
  - `export` on `underLock` (:596), `sortKeys` and `jsonText` (:306-309).
  - `editMapping` (:394, after `writeImport`): delete `imports/<prior.id>.candidate.png` if it exists
    (`underRoot` + `rmSync({ force: true })`) — D6.
  - `importView` (:497): when `record.fidelity.deltaEMin?.worst`, the label reads
    `fidelity: ${verdict} (worst ΔE ${worst.value} at ${worst.region}, threshold 5)`; `missing` keeps today's
    words exactly. Add `measurable: Boolean(existsSync(png))` to the returned view.
  - Header invariant 5 (:22-24) rewritten: "FIDELITY ON A LIVE RUN IS `missing` UNTIL THE OWNER MEASURES IT,
    AND NEVER A PASS WITHOUT A MEASUREMENT. runImport writes WCAG only; import-measure.mjs's measureImport
    adds the ΔE block on the owner's click (a spawned renderer — this module still loads no browser); any
    mapping edit rebuilds the record without it and deletes the candidate PNG, because a candidate of the
    previous mapping is not a measurement of this one (#474)."
- **GOTCHA**: the `scale` key reaches the transcript's `tool` line `input` and the fake's call log. Before
  trusting a green, grep group 43 for any deep-equality on the export call's arguments
  (`toolCalls(…, "export")`, `params.arguments`) — observed at :14215-14219 only for Browse's `width: 160`,
  which does not change. The fake picks its capture by `args.width` (`fake-brilliant-bridge.mjs:55`), so the
  2155-byte export still answers. Observed this session: `grep 'arguments' tooling/build-checks.mjs` finds
  only :14219 (`width === 160`) touching an export's arguments. The fake does not model `scale` (it answers
  the one 790×402 capture for any non-thumbnail export) — add that to its header's WHAT IT CANNOT REACH.
- **GOTCHA** (memory `gate-prose-has-three-copies`): invariant 5 has three prose copies — this header,
  group 43's `group()` string (:14264, "fidelity missing with WCAG computed"), and `gates.md` group 43.
  43.5's assertion itself (:13953) stays true (a fresh record is still `missing`). Update the prose in
  Task 10, all three.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "import run|✗"` → `build import run     ✓`.
- **SATISFIES**: AC 1, AC 7 (edit invalidates).
- **REGENERATES**: none.

### Task 8 — UPDATE `portal/server.mjs`: the measure route

- **IMPLEMENT** after the `/api/canvas/import/mapping` branch (:511-517):

  ```js
  if (p === '/api/canvas/import/measure' && req.method === 'POST') {
    const b = await readBody(req);
    const root = resolveRunRoot({ provenance: b.provenance, slug: b.slug });
    assertProvenanceRoot(b.provenance, root);
    if (!isProposalName(b.name)) return json(res, 400, { error: `name ${JSON.stringify(b.name ?? null)} is not a component name` });
    return json(res, 200, await measureImport({ pkgRoot: root, name: b.name }));
  }
  ```
  and `import { measureImport } from './lib/import-measure.mjs';` beside :37. A comment above it: it spawns a
  renderer, writes only under the build root, and runs only on the owner's click.
- **GOTCHA**: No `saveConflict` check — the measurement never touches `ops.jsonl`. Say so in the comment so a
  reviewer does not "add the missing 409".
- **VALIDATE**: portal smoke on a private port (memory `portal-smoke-port-scoped-kill` — OS-assigned port,
  kill `$!` only): `(cd portal && PORT=0 node server.mjs &) …` — mirror piv-validate's smoke; then
  `curl -s -X POST -H 'content-type: application/json' -d '{"provenance":"fictional","slug":"faster-payment","name":"../x"}' http://127.0.0.1:<port>/api/canvas/import/measure`
  → `{"error":"name \"../x\" is not a component name"}` (expected, 400).
- **SATISFIES**: AC 1.
- **REGENERATES**: none.

### Task 9 — UPDATE `portal/public/canvas-import.mjs`: the button and the verdict line

- **IMPLEMENT**:
  - **The measurement's messages live IN THE VIEW, not the panel.** `refusalBox` and `statusLine` are children
    of the import panel (`canvas-import.mjs:216-221`), and `[data-import-panel]` is hidden independently of
    `[data-import-view]` (`canvas.html:36,40`), so a refusal written there is invisible when the owner opened
    the view by `?import=`. Create two view elements at module scope, beside `refusalBox`:
    `measureRefusal = el("div", { class: "cv-import-refusal", role: "alert", "data-import-measure-refusal": true })`
    and `measureStatus = el("p", { class: "cv-import-status", role: "status", "data-import-measure-status": true })`.
  - `showRefusal(refused, box = refusalBox)` (:73-92): write into `box` instead of `refusalBox` (every
    existing caller passes nothing, so its behaviour is unchanged), and add `else if (a.measure)
    measureFidelity(currentName)` before the `a.hint` branch; the `a.hint` branch writes its `Run: …` line
    into `box === refusalBox ? statusLine : measureStatus`.
  - `async function measureFidelity(name)`: disable the button; `measureStatus.textContent = "Rendering the
    candidate and measuring…"`; `showRefusal(null, measureRefusal)`; POST `/api/canvas/import/measure` with
    `{ provenance, slug, name }` through `api`; non-200 → `showRefusal(httpRefusal(status, body), measureRefusal)`;
    `body.refused` → `showRefusal(body.refused, measureRefusal)`; else `renderView(body.view)` then
    `measureStatus.textContent = \`Measured: ${body.verdict}, worst ΔE ${body.worst?.value ?? "—"}\``.
    Re-enable in `finally`.
  - `renderView` (:309-311): the fidelity paragraph adds the worst region when present —
    `Fidelity: green · worst ΔE 1.23 at text:Amara Okafor (threshold 5) · WCAG 12/12 pairs pass` — `missing`
    keeps its exact words (the journey's I2 asserts them, `canvas-journey.mjs:655`). After it, when
    `view.measurable`, a button `el("button", { type: "button", class: "btn btn-secondary cv-btn",
    "data-import-measure": true, text: f.deltaEMin ? "Measure again" : "Measure fidelity" })`, then
    `measureStatus` and `measureRefusal` — all three inside `viewBox.replaceChildren(…)` after `fidelity`.
  - Every string via `textContent` (header call 3).
- **GOTCHA**: `renderView` REPLACES the view's children, so re-append `measureStatus` and `measureRefusal`
  (module-scope nodes) on every render, and set their text AFTER `renderView(body.view)`, never before.
- **GOTCHA**: the button must be ≥ 44×44 (I9 asserts the panel's targets; mirror `cv-btn`).
- **VALIDATE**: Task 13's journey leg. Manual: open a measured import in the portal, click, see the line change.
- **SATISFIES**: AC 1, AC 8 (owner-facing UI).
- **REGENERATES**: none (the portal has no VR baseline).

### Task 10 — UPDATE the gate prose: three copies each (memory `gate-prose-has-three-copies`)

- **IMPLEMENT**:
  - `tooling/build-checks.mjs` group 42 `group("import-record", …)` string (:13767): add 42.15's clause and
    replace the "cannot reach" clause "whether a live import's candidate render is faithful to its IR
    (#311's import-run — both fixture candidates are S3's hand-authored harness renders …)" with: the
    fixture candidates remain S3's harness renders; the LIVE candidate is the importer's own composition,
    reached by group 43's replay (43.15) and rendered for real only by `canvas-journey`'s I12.
  - group 43's comment block (:13770-13784, "WHAT THIS GROUP CANNOT REACH" at :13780) and its `group()` string
    (:14264): add 43.15; replace "pixels (the portal has no baseline)" with "a real render — 43.15 replays
    the committed candidate; the spawn and Playwright are canvas-journey I12's".
  - `.claude/references/gates.md` group 42 (:76) and group 43 (:78), same edits; the canvas-journey entry
    gains I12.
- **VALIDATE**: `grep -n "43.15\|42.15\|I12" tooling/build-checks.mjs .claude/references/gates.md tooling/canvas-journey.mjs`
  → each id in its code AND its prose.
- **SATISFIES**: AC 9 (gates state what they cannot reach).
- **REGENERATES**: none. Group COUNT is unchanged (46): no new group, so CLAUDE.md's "46 PURE groups" and
  the drift-check group-count leg stay as they are.

### Task 11 — OWNER-RUN: the live pair (D3, blocks the PR)

- **IMPLEMENT** (the implementer prepares; the owner does the Brilliant half; $0, a paired tab):
  1. In Brilliant, on a scratch canvas, the owner draws two frames the vocabulary can EXPRESS (a positive
     control must be a design the system can draw; this is not tuning). Each: auto-layout vertical,
     **fixed width 320 and fixed height 82** (the size this session's proxy measured; D4b's crop makes
     any size measurable, so this is for comparability with the proxy, not a requirement), padding 16 (`--spacing-md`),
     gap 4 (`--spacing-xs`), no fill; two text layers, both **regular weight** (the `text` builder keeps
     role and content only, so `.ds-text` renders weight 400):
     "Amara Okafor" **16 px, line height 25.6** (`--type-body`, `line-height: 1.6`) and "Last seen 2 min
     ago" **13 px, line height 19.5** (`--type-caption`, `1.5`). The font family is the one difference
     the owner cannot remove (Brilliant has no system-ui; A1).
     - `faithful`: title **#1a1a1a** (`--color-fg`), subtitle **#6b7280** (`--color-fg-muted`) — the
       neutral pack's own values (`parseCss(tokens.neutral.css)`, observed).
     - `wrong`: identical but the title **#1a7f37**.
  2. Start the portal with **`UXF_IMPORT_SUGGEST=off`** (a `real` import otherwise asks Jev about every
     unnamed node — a paid call; `SUGGEST_PROVENANCES` is `["fictional","real"]`,
     `portal/lib/import-suggest.mjs:42`). For each frame, in a real package under JOBS_DIR (not the
     committed spine): select it → Import selection → in the Mapping list set the root to `stack` →
     Measure fidelity.
  3. The implementer copies, per frame, VERBATIM: `proposals/<name>/source.json` `.text` →
     `import/fixtures/measure-live/<frame>.blueprint.txt`; `imports/<id>.reference.png` →
     `<frame>.reference.png`; `imports/<id>.candidate.png` → `<frame>.candidate.png`; the transcript's
     `measure` line → `<frame>.measure.json`; the import transcript's lines BEFORE the `measure` line (meta,
     the four tool lines including `export` with `input.scale: 1`, binding, suggest) →
     `<frame>.transcript.txt` (`.txt`, because 40.25 refuses a `.jsonl` fixture; one JSON object a line,
     byte for byte); the owner's `mapping.json` `parts` → `mapping.json` (one file,
     both frames share it). A `README.md` states: captured date, Brilliant bridge version, the owner drew
     both, "verbatim; a change is a re-capture, never an edit" (mirror `import/fixtures/brilliant-live/README.md`).
- **DECISION RULE** (write the observed numbers into the report). The rule is on ΔE, not on the verdict
  word: the neutral pack fails one WCAG pair today (11/12, observed — see Q1), so BOTH frames' verdicts read
  `red` whatever ΔE says. What separates them is `deltaEMin.worst.value` and `wrongButGreen` (false on both,
  since WCAG is not N/N):
  - faithful `worst.value < 5.0` AND wrong `worst.value ≥ 5.0` → AC 10 met; continue. EXPECTED from the
    proxy (NOTES 11): faithful ≈ 2.3 (the title), wrong ≈ 30 (the title) — a 2.15× margin under 5.0 and a
    6× margin over it.
  - faithful ≥ 5.0 or wrong < 5.0 → **STOP**. The proxy used Brilliant's own embedded Manrope in Chromium,
    so a miss means Brilliant's rasteriser differs from a browser's by more than the proxy's 2.7 of
    headroom. Do not change the threshold, the backdrop, the scale or the regions. Report both numbers and
    the per-region table to the owner; the options are theirs.
- **GOTCHA**: the transcript's `measure` line is server-written; copy it, never retype it.
- **GOTCHA**: memory `honesty-contract-mirror-direction` — the implementer never draws the frames or clicks
  on the owner's behalf with a hand-made reference. If the owner is unavailable, the PR stays open; the
  report says "Not run" with this row's tracker.
- **VALIDATE**: `ls import/fixtures/measure-live/` → `README.md faithful.blueprint.txt faithful.candidate.png faithful.measure.json faithful.reference.png faithful.transcript.txt mapping.json wrong.blueprint.txt wrong.candidate.png wrong.measure.json wrong.reference.png wrong.transcript.txt`;
  `grep -c '"scale":1' import/fixtures/measure-live/*.transcript.txt` → `1` each (the read really exported at scale 1);
  `node tooling/build-checks.mjs` 40.25 still green (every extension is `.txt/.json/.png/.md`).
- **SATISFIES**: AC 10.
- **REGENERATES**: none (import/ is in no loc-summary group; 40.26 asserts it).

### Task 12 — ADD build-checks case 43.15: the measurement, replayed and refused

- **IMPLEMENT** (group 43's voice: every constructive call through `afold`, scratch packages via `pkgCopy`):
  1. **Replay (the positive control), per frame of the owner's pair:** `pkg = pkgCopy("m-<frame>")`;
     `runImport({ pkgRoot: pkg, base: ledger(pkg).length, entrance: "selection", reader: async () => ({ text:
     <frame>.blueprint.txt, reference: <frame>.reference.png bytes, transcript: <frame>.transcript.txt parsed
     line by line, binding: null }),
     inputs: INPUTS, overridesDir: OV })` with `const OV = scratch("ov")` bound ONCE per frame and passed to
     both calls; `editMapping({ pkgRoot: pkg, provenance: "fictional", name, edit: { path: "ir.children[0]",
     map: "stack" }, inputs: INPUTS, overridesDir: OV })` (or every entry
     of the committed `mapping.json`); then `measureImport({ pkgRoot: pkg, name, render: async () => ({ png:
     <frame>.candidate.png, boxes: <frame>.measure.json.boxes, engine, version }) })`. Assert: the record
     passes `checkRecord`; its stored verdict equals `fidelityVerdict(record.fidelity)`; faithful's
     `worst.value < THRESHOLD` and wrong's `≥ THRESHOLD`; `worst` deep-equals the
     committed `measure.json`'s `worst` (determinism: the replay re-measures from the committed bytes);
     `imports/<id>.candidate.png`'s sha256 equals the committed candidate's; the transcript gained exactly
     ONE `measure` line; the markdown contains the verdict word.
  2. **The edit invalidates (D6):** one more `editMapping` (a rename) → verdict `missing`, the candidate PNG
     gone, `deltaEMin` absent.
  3. **Refusals, nothing written** (compare the `imports/` listing and every file's bytes before/after):
     `no-reference` (a drop of the same blueprint), `nothing-built` (the committed spike C blueprint via the
     reader, as recognised — composition `[null]`, observed), `unknown-scale` (a SYNTHETIC reference of the
     wrong width, labelled SYNTHETIC in the message), `stale` (a `render` stub that calls `editMapping` before
     returning), and the child's `render-failed`/`no-renderer`/`render-timeout` by stubbing `render` to return
     each refusal.
  4. **O3b:** a `render` stub returning the reference bytes as the candidate → `measureImport` throws naming
     O3b, and the record on disk is unchanged.
  5. **Lock:** a measurement started while `runImport` holds the lock answers `{ refused: { kind: "busy" } }`.
  6. `regionsFromBoxes`, `scaleOf` and `cropTo` on SYNTHETIC inputs: rounding, clamping, a zero-area box in
     `skipped`, a duplicate name suffixed `#2`, a non-finite coordinate throwing by index. `scaleOf`: an
     export line with no `scale` → 2 (the committed `brilliant-live` read's shape, 790 for 395); `scale: 1`
     with 320 for 320 → 1; a `hug` width → the line's scale; 790 against 360 × 2 → `unknown-scale` naming
     both; `scale: 5` → `unknown-scale`; no export line → `no-reference`. `cropTo`: 4×2 → 3×1 keeps the
     top-left bytes; asking 5×2 of 4×2 throws naming both sizes. And an ODD reference end to end: the
     faithful replay with its reference re-read at 319×81 (SYNTHETIC — a top-left crop of the committed
     reference, built in memory with the case's own encoder from 42.15) measures without throwing, the
     candidate cropped to 319×81.
  7. Add `import/fixtures/measure-live/` to the `gitSnap` scope's neighbours only if the case writes near it —
     it must not: it reads the fixtures and writes under `scratch()` only.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "import run|✗"`.
- **REDDENS** (run each once, restore, record in the report):
  - drop `{ over: BACKDROP }` from the reference's `decodePng` in measureImport → the replay throws "not
    opaque" (a clear-background export is transparent around every glyph) →
    `43.15: measureImport(faithful) threw instead of answering: png: reference: alpha … is not opaque`.
  - replace `cropTo(…)` with the uncropped candidate → the SYNTHETIC 319×81 case throws
    `fidelity: image sizes differ — reference 319x81, candidate 320x82` through `afold`.
  - make `scaleOf` ignore `input.scale` and always answer 2 → the faithful replay's render job asks 640×164
    of a 320×82 reference and `cropTo` throws "more than scale px larger" by name.
  - `worst` compared against the WRONG frame's measure.json → `43.15: faithful's worst … differs from the committed …`.
  - remove the candidate-PNG deletion from `editMapping` → `43.15: after an edit, imports/i1.candidate.png is still on disk`.
  - skip step 6's re-read in measureImport → the `stale` stub's case writes → `43.15: a stale measurement wrote imports/i1.json`.
  - positive control: the replay with the faithful fixture must score `worst.value < 5.0` and the wrong one
    `≥ 5.0` BEFORE any refusal case is trusted; if the committed pair did not separate, Task 11 stopped and
    this case does not exist yet.
- **SATISFIES**: AC 3, AC 6, AC 7, AC 10, AC 11.
- **REGENERATES**: none.

### Task 13 — ADD `canvas-journey` I12: the real spawn, the real render, the page

- **IMPLEMENT** in `tooling/canvas-journey.mjs`:
  - `seed()` (:213-230): add a fourth copy, `fp-measure`, exactly like `fp-import`.
  - A step `I12 · Measure fidelity renders the candidate; the faithful frame's worst ΔE is under 5` in the main leg after the import
    pass: in-process (the driver already imports from `portal/lib/`), seed the faithful frame into
    `fp-measure` with `runImport` (the Task 12 reader) + `editMapping` to `stack`, `overridesDir` under
    `scratch`; open `?provenance=real&slug=fp-measure&import=<name>`; click `[data-import-measure]`; wait
    for `[data-import-fidelity]` to leave `missing` (timeout 60 s); assert it names a worst region whose
    ΔE is under 5 and that its verdict word equals the record's derived one; `imports/i1.candidate.png` is a PNG of exactly the reference's IHDR size; the record passes
    `checkRecord`. Then change the mapping (rename) through the page and assert the line returns to
    `missing — not measured, never a pass` and the PNG is gone.
  - Report the measured `worst.value` in the step's detail (it may differ from the committed replay by
    platform; the ASSERTION is under/over 5 and the derived verdict word, not the digits).
  - `I12b · a refusal is visible in the view with the panel closed`: a `withPortal` side child whose env adds
    `UXF_MEASURE_VRDIR: "/nonexistent"` (the Task 4 seam; `withPortal` builds `env` from `process.env`, so
    add an `extraEnv` option to it). Open the same import with the panel NOT toggled open, click
    `[data-import-measure]`, and assert `[data-import-measure-refusal]` is visible (`isVisible()`), names
    `npm ci`, and the record on disk is unchanged (sha256 before and after).
  - Add I12 to the success line (:1025) and the header's list of passes.
- **GOTCHA** (memory `stale-serve-wrong-tree`): the portal child is asserted to be THIS worktree's
  (`withPortal`'s bootSha check). The renderer child resolves `tooling/measure-render.mjs` from the
  portal's `REPO_DIR`, so the same tree renders.
- **GOTCHA** (memory `local-agent-visual-gate-notes`): a fresh worktree needs `npm ci` in
  `tooling/visual-regression` AND `portal/` before this driver runs.
- **VALIDATE**: `(cd portal && npm ci) && node tooling/canvas-journey.mjs chromium` → the ✓ line including I12.
  Then `all` for the three page engines (the renderer is Chromium in every leg).
- **REDDENS**: point `spawnRender` at a non-existent script path → I12 fails with the `render-failed`
  refusal's text in its detail, not a timeout.
- **SATISFIES**: AC 1, AC 6, AC 8, AC 10.
- **REGENERATES**: none.

---

## TESTING STRATEGY

No suite (CLAUDE.md § Testing). The gates are `tooling/build-checks.mjs` (CI) and the operator-run
`tooling/canvas-journey.mjs`.

### Unit (build-checks, CI, no browser)

42.15 (the flatten both ways), 43.1 (import-measure's graph), 43.15 (replay, invalidation, refusals, O3b,
lock, the pure helpers). The replay is real pixels from the owner's run, re-measured in CI.

### Integration (operator-run)

`canvas-journey` I12: the button → route → spawned child → Playwright → the record → the page.

### Edge Cases

- Reference with transparent corners (rounded frame) → flattened, measured (D5).
- Root width `fill`/`hug` → accepted on the reference's own size; numeric width disagreeing by > 1 px →
  `unknown-scale`.
- Odd or fractional reference size → rendered at `ceil(ref / scale)` and cropped top-left (D4b), measured.
- A record imported before this ticket (2x reference, no `scale` in its export line) → measured at DSF 2.
- Composition `null` → `nothing-built`; dropped import → `no-reference`.
- A box clamped to zero area → `skipped`, named in the transcript line.
- Every region excluded (all < 256 px or degenerate) → `scored: 0` → `missing` by `fidelityVerdict`,
  written, and the markdown says "No region was scored".
- Mapping edited during the render → `stale`, nothing written.
- Two imports measured concurrently → the second `busy`.
- Renderer missing / crashing / hanging → `no-renderer` / `render-failed` / `render-timeout`.
- The candidate identical to the reference → O3b throw.

### Proving the checks

Every check above carries its REDDENS mutation. The positive control for 43.15 is the owner's faithful frame
reading green; for 42.15, the committed export decoding at 790×402.

---

## VALIDATION COMMANDS

### Level 1: Syntax

`node --check portal/lib/import-measure.mjs && node --check tooling/measure-render.mjs && node --check import/fidelity.mjs`

### Level 2: The CI gate

`node tooling/build-checks.mjs` → `all 46 groups pass` (EXPECTED, not observed: this session's run was a
fresh worktree — 45 ✓ and `icons` 41.7 ✗ on missing `tooling/icons/node_modules`. Run in the primary tree
or `npm ci` in `tooling/icons` first; do not read past a red).
`node tooling/regen-import-records.mjs --check` → `no drift`.
`node tooling/drift-check.mjs` (CI `verify`'s own step).
`node agent-layer/gen-loc-summary.mjs --check` AFTER `git add` (memory `loc-summary-counts-tracked-only`) →
`loc summary ✓  3 groups — no drift` (expected: no new file falls in a group).

### Level 3: Integration

`(cd portal && npm ci) && node tooling/canvas-journey.mjs all`.

### Level 4: Manual

Portal → a real package → Import selection (the owner's faithful frame) → map root to stack → Measure
fidelity → the line reads green with a worst region; rename a part → back to missing; Measure again → green.

### Level 5: CodeQL

The PR's CodeQL gate (#387/#408) runs on the diff. `measure-render.mjs` serves files by URL path: the
`startsWith(REPO + path.sep)` refusal is what a path-injection rule looks for — keep it before any read.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Task 11 — draw the two frames in Brilliant, import and measure each | $0 **only with `UXF_IMPORT_SUGGEST=off`** (else one paid Jev call per unnamed node); owner's hand, a paired tab, ~15 min | **Yes** (owner, D3) | none — the PR stays open |
| Task 11 decision rule, if the pair does not separate | owner's call | Yes | the owner decides scale/threshold; open a ticket then |
| Q1 — open the neutral-pack contrast ticket (`--color-fg-muted` on `--color-bg-surface`, 4.4 < 4.5) | $0, outward (a GitHub issue) — ask the owner before creating it | No | this row; the PR body links it |
| `canvas-journey all` (I12 needs Playwright + portal deps) | $0, local | Yes (the only reach of the real spawn) | — |

---

## ACCEPTANCE CRITERIA

- [ ] AC 1 — A live import with a reference and a built first part can be measured from the canvas page;
      the record's `fidelity.deltaEMin` is filled and its verdict is DERIVED from it and WCAG (`green` or
      `red`, the record's words for the ticket's "pass/fail") — never `missing` once measured with ≥ 1
      region scored. While the neutral pack fails 1 of 12 WCAG pairs (Q1), every live verdict is `red`.
- [ ] AC 2 — Regions come from the candidate DOM (root, own-text elements, svgs), scaled to the reference.
- [ ] AC 3 — `checkRecord` passes on every measured record; O3b holds across the build's records.
- [ ] AC 4 — The portal imports no browser: Playwright is loaded only by the spawned `tooling/` child; group
      43 still imports the import path in CI with no `portal/node_modules`.
- [ ] AC 5 — The two committed fixture records and every group-42 number are byte-identical.
- [ ] AC 6 — no-reference, nothing-built, unknown-scale, stale, busy, no-renderer, render-failed and
      render-timeout each answer a refusal with one action and write nothing.
- [ ] AC 7 — A mapping edit returns the record to `missing` and deletes the candidate PNG.
- [ ] AC 8 — The button, the verdict line and the refusals are on the canvas page (owner prefers UI).
- [ ] AC 9 — gates.md, the `group()` strings and the group comment blocks each state 42.15/43.15/I12 and
      what they cannot reach.
- [ ] AC 11 — Any reference size is measurable (a crop, never a parity refusal), and the candidate renders at
      the scale the reference was exported at, read from that import's own transcript.
- [ ] AC 10 — The owner's live pair is committed verbatim; CI replays it to the committed worst values,
      faithful `worst.value < 5.0` and wrong `≥ 5.0`; I12 reads the faithful frame's worst under 5.0 on the
      real render. (If Q1's token fix lands first, faithful also reads `green`; assert whichever
      `fidelityVerdict` derives, never a hard-coded word.)

---

## COMPLETION CHECKLIST

- [ ] Tasks 1-13 in order, each VALIDATE run and its output pasted in the report
- [ ] Every REDDENS mutation run once and restored
- [ ] `build-checks` all 46 green, `regen-import-records --check`, `drift-check`, loc `--check` after staging
- [ ] `canvas-journey all` green including I12
- [ ] Plan, report and review in the PR; body carries `Closes #474`

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 (owner, does not block this ticket; tracker opened before the PR)** — `tokens.neutral.css` fails one WCAG pair:
  `color-fg-muted` #6b7280 on `color-bg-surface` #f4f4f5, 4.4 < 4.5 ("captions on cards"), observed via
  `checkPairs`. `fidelityVerdict` reads `red` whenever WCAG is not N/N, so NO live record can read `green`
  until that pair passes. Recommendation: a separate ticket darkening `--color-fg-muted` (a token change —
  `gen-token-css`, `gen-handoff`, the fixture-record regen, VR baselines). This ticket keeps the verdict
  derivation untouched and states its ACs on ΔE.

- **A1 (measured, not assumed)** — Brilliant's Manrope against the neutral pack's system stack. S3's floors
  were same-font; this session's proxy put Brilliant's own embedded Manrope (from spike C's `06.svg`) on a
  clear background against the real render path: faithful worst **2.3242** at scale 1 (3.3604 at scale 2),
  wrong **30.3201** (36.2978). The font difference costs under half the threshold at scale 1. What the proxy
  cannot reach is Brilliant's own rasteriser; Task 11 measures that, with a STOP rule.
- **A2 (retired)** — the scale question is decided: new reads export at scale 1, where the threshold was
  calibrated and the proxy floor is lowest; older 2x records still measure, at 2x (D4).
- **A3** — Box names come from the text (`text:Amara Okafor`), so a record carries the drawing's words in
  region names. They are the owner's own drawing's words, already in the record's IR; no new exposure.
- **A4** — The measurement is Chromium-only, local (macOS). A future CI render would sit on Linux, where S3's
  planning measured Chromium's floor at 2.0709 (fidelity.mjs :207-213) — not this ticket.

## RISK REGISTER — each risk, and what retires it

| # | Risk | Retired by | Residual |
|---|---|---|---|
| R1 | The neutral pack fails 1/12 WCAG pairs, so no live record can read `green` | ACs stated on ΔE (AC 1, AC 10); assertions read the DERIVED verdict, never a hard-coded word; Q1 tracker | None for this ticket — the verdict word is correct either way |
| R2 | Threshold 5.0 at the live scale, and Manrope vs system font | D4 exports at scale 1 (the calibrated scale); the proxy measured faithful 2.3242 / wrong 30.3201 there (NOTES 11) | Brilliant's own rasteriser, measured by Task 11 with a STOP rule |
| R3 | Fractional or odd reference sizes | D4b: render at `ceil`, crop in memory; a SYNTHETIC 319×81 case in 43.15 | None |
| R4 | A paid Jev call during the owner's imports | `UXF_IMPORT_SUGGEST=off` in Task 11 and its paid-table row | None |
| R5 | A measure refusal written into the hidden panel | Task 9's view-local `measureRefusal`/`measureStatus`; I12b asserts visibility with the panel closed | None |
| R6 | Adding `scale` to the read moves a group-43 case | grep: only :14219 (`width === 160`) asserts export arguments (NOTES 13) | None |
| R7 | Records imported before this ticket (2x, no `scale`) | `scaleOf` reads the transcript; no `scale` → `LEGACY_SCALE` 2, Brilliant's documented default | None |
| R8 | The branch is behind `origin/main` | Every citation is to `1b43cee`; branch from `origin/main` | None |
| R9 | A mapping edit during the render writes a stale record | Task 6 step 6's re-read + `stale` refusal; 43.15's stub edits mid-render | None |
| R10 | The module does not load because Task 7's exports come later | Task 3's ORDER gotcha | None |

Confidence: **10/10** for the code (Tasks 1-10, 12-13): every mechanism in it ran in this session (the
hermetic render, DSF clip sizes, the alpha composite, ΔE over flattened RGBA, region derivation from DOM
boxes), and every citation was re-read at `1b43cee`. The one input no session can produce, Brilliant's own
raster of the owner's frames, is Task 11. It has a proxy prediction and a STOP rule, and it is the owner's step by D3.

## NOTES (open canvas)

### Pre-flight — what was run, what it said, what changed

Run against a detached worktree of `origin/main` at `1b43cee` (the session branch is behind main).

1. `node tooling/build-checks.mjs` (fresh worktree) → 45 groups ✓, `icons ✗ 41.7: … tooling/icons/node_modules/@phosphor-icons/core/assets/regular is missing`. Environmental; the plan's Level 2 says so.
2. `node tooling/regen-import-records.mjs --check` → `import records ✓ … 4 files, 187933 bytes, no drift`.
3. `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift`; groups are
   `system/`, root/proto pages and `agent-layer/` only, so no file this plan adds is counted.
4. **Every committed input builds a null composition** — spike C instance and master, the Figma export, both
   live lookups (`[null]`, observed). This is why D3 exists: no positive control reachable without the owner.
5. **A laid-out synthetic frame mapped to `stack` builds** (`{"name":"stack","props":{"direction":"column",
   "gap":"xs","pad":"md"},"children":[text body, text caption]}`), with one `size.w` drop row for the
   fixed 320. That is the owner's Task 11 recipe.
6. **The committed live export is RGBA and `decodePng` throws on it** — `alpha 215 at pixel 316789` (790×402),
   the thumbnail `alpha 150 at pixel 0`. Found only by running it; it created D5 and Tasks 1-2. The first
   draft of this plan had no flatten step.
7. **Brilliant's export schema** (`tools-list.json`): `scale` "Defaults to 2.0 … Mutually exclusive with
   width/height", `background` "Defaults to 'clear'". This turned D4 from an inference into an explicit
   argument.
8. **The render probe** (a scratch script, `createRequire` onto the primary tree's
   `tooling/visual-regression`, Playwright 1.61.1) — output pasted under Patterns to Follow. It proved the
   hermetic `page.route` serving, the module import in `evaluate`, DSF-2 clip size and RGB output.
9b. **WCAG over the neutral pack: 11/12** — the failing pair is `color-fg-muted` on `color-bg-surface`,
   4.4 < 4.5. Changed AC 1, AC 10, Task 11's rule, Task 12-13's assertions to ΔE, and added Q1.
9c. Token pixels for Task 11 (contract + neutral): `--type-body 16px`, `--type-caption 13px`,
   `--spacing-xs 4px`, `--spacing-md 16px`, `--font-body ui-sans-serif, system-ui, -apple-system, …`.
   The first recipe draft said 14 px semibold; the builder cannot express either.
9d. A fractional clip: 197.5×81.5 CSS at DSF 2 → **394×162** (observed), not 395×163. First answered with a
   parity refusal; replaced by D4b (render at `ceil`, crop in memory), so no size is refused.
9e. `SUGGEST_PROVENANCES = ["fictional","real"]` — a real import calls Jev; Task 11 sets
   `UXF_IMPORT_SUGGEST=off`.
9. Neutral pack values for Task 11: `--color-fg #1a1a1a`, `--color-fg-muted #6b7280`, `--color-bg #ffffff`
   (observed via `parseCss`). `.ds-text[data-role="caption"]` takes `--color-fg-muted`
   (`components.css:2476`).
11. **The floor proxy** (`.claude/plans/import-live-fidelity-474-probe/floor.txt`, run from the scratchpad
   against a detached `origin/main` worktree; its alpha flatten was a patched COPY of `fidelity.mjs`, the
   prototype of Task 1). Reference: 320×82, Manrope 400 from `06.svg`, 16/25.6 and 13/19.5, padding 16, gap
   4, `omitBackground` (RGBA, colour type 6), flattened over white. Candidate: the real `renderComposition`
   path under the neutral pack. Regions from the candidate DOM ×scale, `Math.round`:
   ```
   scale 2  faithful  root 2.6708 · title 3.3604 · subtitle 0.6508     wrong  root 23.1638 · title 36.2978
   scale 1  faithful  root 1.8555 · title 2.3242 · subtitle 0.4093     wrong  root 19.1693 · title 30.3201
   ```
   This moved D4 from 2 to 1 and turned A1/A2 from assumptions into numbers.
12. `canvas-import.mjs:216-221` puts `refusalBox` and `statusLine` inside the PANEL; `canvas.html:36,40`
   hides panel and view independently. Task 9 now gives the view its own two elements; I12b proves it.
13. Group 43's only assertion on export arguments is :14219 (`width === 160`, Browse) — adding `scale` to the
   read's call moves no case.
10. Landed-claim checks on `origin/main`: `EXPORT_SCALE`, `import-measure`, `measure-render`,
   `/api/canvas/import/measure`, `data-import-measure` — none exist (grep, 0 hits). `underLock`, `sortKeys`,
   `jsonText` exist and are module-private (import-run.mjs :596, :306, :309).

### Alternatives weighed

- **Lazy `import()` of Playwright in `portal/lib`** — simplest, rejected by the owner: contradicts CLAUDE.md's
  "SDK + zod, nothing else".
- **Measure automatically at import time** — every import would launch Chromium (~3-5 s) and every mapping
  edit would invalidate it anyway; the owner measures when the mapping is settled.
- **One whole-root region** — never misregistered, but one wrong small text is diluted by the rest. Rejected
  by the owner.
- **Keep the measurement across a rename** — a rename changes `data-part`, which names regions; simpler and
  honest to clear on every edit.

### Known traps carried in

`gate-prose-has-three-copies` (Task 7, 10) · `portal-smoke-port-scoped-kill` (Task 8) ·
`local-agent-visual-gate-notes` (Task 13) · `stale-serve-wrong-tree` (Task 13) ·
`loc-summary-counts-tracked-only` (Level 2) · `honesty-contract-mirror-direction` (Task 11) ·
`check-that-cannot-fail` (every REDDENS) · `drift-check-syntax-checks-parked-mjs` (the probe stays in the
scratchpad, never under `.claude/plans/` as `.mjs`).

## AMENDMENTS

- 2026-09-28 — risk pass (owner: "address all risks"): D4 scale 2 → 1 on a measured proxy floor; D4b crop replaces the parity refusal; view-local measure refusal (R5); per-record scale from the transcript (R7); risk register; confidence 10.
- 2026-09-28 — implementation (plan errors, found by running them):
  - Task 8's smoke used `PORT=0`: the origin guard (`portal/lib/origin.mjs`) answers only the configured port, so a
    POST to an OS-assigned port is a 403 "cross-origin request refused … localhost:0". Pick a free port first
    (`net.createServer().listen(0)`), then `PORT=<it>`; the 400 was observed that way.
  - Task 12's REDDENS "make `scaleOf` always answer 2 → `cropTo` throws": the replay's `render` is a stub returning
    fixed bytes, so no 640×164 render happens. With a numeric root width of 320 it reds as an `unknown-scale`
    refusal ("the source says 320 × 2 = 640"), observed.
  - Task 3/6's `scaleOf` input `record.ir.children[0]?.layout?.size?.w`: a node with no `al()` carries its size on
    `style.size` (`import/brilliant.mjs:485-489`), so the root width is read as `layout.size.w ?? style.size.w`.
  - Task 11's recipe: the converter reads a text's size only when it is bound to a Brilliant `$font.size.*` token
    (`import/brilliant.mjs` t() reader, `:$font.size.` branch). A bare size leaves `text.size` null, `text.role`
    unfillable, and the texts are not emitted — the candidate would be an empty padded stack (observed on a
    SYNTHETIC line). The owner binds both texts' sizes to Brilliant font-size tokens; the subtitle takes the
    nearest one Brilliant offers to 13 px, and the Mapped column must show both texts before Measure is pressed.
  - Task 12 was split: its SYNTHETIC half (refusals, invalidation, O3b, lock, odd size, the pure helpers, the real
    child's no-renderer and timeout paths) needs no owner fixture and landed first; the replay of the owner's pair
    lands after Task 11.
