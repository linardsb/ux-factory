# Feature: Pack-seed derivation — recorded vision run + human gate (spike 1: Verdant round-trip)

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils/types/modules. Import from the right files (`system/oklch.mjs`, `system/derive.mjs`, `agent-layer/gen-token-css.mjs`) — do not reimplement color math or token emission.

## Feature Description

The first of two build-time capabilities that let a real company become a scenario package (epic #38): a **recorded Agent SDK vision run** that reads product screenshots (plus published design tokens, when they exist) and emits a **proposed pack seed** — palette, type scale, spacing, radius — mapped onto the existing token contract, landing as a seed record + generated `tokens.<company>.css`. The proposal is never shipped unreviewed: a human gate approves or corrects every value, recorded honestly (agent proposes, human decides).

This ticket also **folds spike 1 (derivation fidelity)**: run the capability as a closed round-trip on the fictional Verdant scenario — derive a proposed seed from screenshots of Verdant's own prototype rendered under its canonical pack, then diff the proposal against that known pack (perceptual OKLab colour delta + type/spacing/radius usability) with a committed deterministic script. Plus a lighter **offline real-product test** (one real product with a published design system, nothing committed, numbers only) — the two together gate how the capability is labelled per the architecture's decision rule.

## User Story

As **the portfolio author (Linards) preparing a per-company application**,
I want **a recorded agent run that proposes a design-token pack from a company's product screenshots, gated by my review, with its fidelity measured against a known-good pack**,
So that **a hiring manager can watch the factory derive their own design language from their own product — and I can label that claim honestly ("agent-proposed, human-approved" vs "human-authored with agent assistance") based on measured fidelity, not assertion.**

## Problem Statement

The per-company brief layer's headline moment is "the agent proposes your design language from your own product." But (1) no capability exists to turn screenshots into a token pack that feeds the existing re-skin engine; (2) an agent proposing a shipped artifact violates the layer-wide "human decides" boundary unless the gate is built in and visible; and (3) claiming "the agent derived this" is dishonest unless fidelity is measured — the architecture makes the labelling of the whole capability contingent on a fidelity spike (spike 1). All three must land together, or the capability is either missing, unsafe, or overclaimed.

## Solution Statement

A portal-side recorded run (`portal/record-derivation.mjs`) following the existing `record-trace.mjs` recorder pattern — a **real** Agent SDK run, four-phase PIV, tight fence, secret redaction, emitting a standard trace (raw + curated) — whose task is: read the committed Verdant screenshots, propose a full token seed keyed to the contract, write it, and self-validate that it *compiles* (via a new deterministic emitter). A small emitter (`agent-layer/gen-pack-css.mjs`, reusing `gen-token-css`'s exported `cssValue`) turns any flat token map — the agent's seed **and** `derive()`'s ground-truth output — into a `tokens.<slug>.css` pack. A deterministic diff script (`tooling/diff-pack-seed.mjs`) computes ground truth as `derive(Verdant axes)`, measures OKLab ΔE per colour + type/spacing/radius usability, and emits a verdict JSON. The human gate is honest-by-construction: the trace immutably records the agent's proposed seed; the committed seed file carries an explicit `review` block; the diff between them is the receipt. Finally the measured verdict (Verdant round-trip + offline real-product numbers) is written into the epic architecture doc's §Spikes with the labelling decision.

## Out of Scope / Non-Goals

- **Not included: the brief → scenario-package generator** (that's ticket #39 — the company-brief record + compiler). This ticket only produces the *derivation* capability and its fidelity evidence.
- **Not included: the public round-trip *display*** (Factory derivation stage + honest diff UI) — that's ticket #42, which depends on this ticket's diff artifact. This ticket produces the diff *data*, not the view.
- **Not included: the private-instance shell, per-company build, or unlisted deploy** (#43/#44).
- **Not included: any real company's data committed to this repo.** The offline real-product test runs locally, results (numbers) noted in §Spikes only — nothing real-brand is committed (privacy boundary, hard).
- **Not changing: `system/derive.mjs` / `system/derive.rules.mjs`** (the frozen view-time engine/ruleset). We *consume* `derive()` for ground truth; we do not extend it to accept custom type/spacing/radius.
- **Not changing: the default behaviour of `agent-layer/gen-token-css.mjs`** (contract + neutral from `tokens.source.json`). We only *export a helper* from it; the drift-checked default path stays byte-identical.
- **Not changing: the CI visual-regression gate** (8 pages × 2 packs). Round-trip screenshots are captured out-of-band, not added as new baselines.
- **Not building a brief-management UI in the portal** (deferred, epic notes it may come later).

## Feature Metadata

**Feature Type**: New Capability (build-time; folds a spike)
**Estimated Complexity**: High (real agent vision run + honesty contract + spike + new deterministic tooling; ~800–1500 lines incl. committed artifacts)
**Primary Systems Affected**: `portal/` (new recorder run + one recorder hardening), `agent-layer/` (new emitter + one export), `tooling/` (new diff script + round-trip capture), `system/` (committed ground-truth pack), `traces/` (committed real trace pair), `docs/epics/` (spike outcome)
**Dependencies**: `@anthropic-ai/claude-agent-sdk` (already the portal's sole dependency — **no new dependency**); `@playwright/test` already installed under `tooling/visual-regression/` (reused for the one-time capture); `portal/.env` `CLAUDE_CODE_OAUTH_TOKEN` (or the Mac's Claude CLI login) for the real run.

## Related Work

**Implements**: GitHub issue **#40** (`Closes #40`) · **Epic**: #38 — `docs/epics/per-company-brief.architecture.md` (inherited engineering decisions: §Stack "no new dependencies", §Data model "Derived pack seed", §Boundaries "agent proposes/human decides", §Spikes 1 question + decision rule).

**Back-references** (plans/decisions this builds on):

- `.claude/plans/trace-recorder-player.md` — Why: the recorder pattern (`portal/record-trace.mjs` + `portal/lib/trace-recorder.mjs`), the PIV phase contract, curation/validation tooling this run reuses wholesale.
- `.claude/plans/live-derivation-engine.md` — Why: `derive()` + the OKLCH/WCAG modules; ground truth is `derive(Verdant axes)`, colour math is `system/oklch.mjs`.
- `.claude/plans/portability-proofs.md` / `tooling/spike-palette.mjs` — Why: the precedent for a Node-side spike that imports the browser modules and applies an executable decision rule with a markdown report.

**Forward-references** (plans that extend this — append as follow-ups get created):

- #42 (public round-trip demo) will consume `tooling/round-trip/verdant.diff.json` + the two packs. #43/#44 reuse `gen-pack-css.mjs` + the seed+`review` shape for real companies.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: READ THESE BEFORE IMPLEMENTING

- `docs/epics/per-company-brief.architecture.md` (whole; esp. §Recommended approach L18–31, §Data model L39–42, §Boundaries L44–49, **§Spikes & experiments L58–67**) — Why: the inherited decisions and the spike-1 decision rule you must implement and then record the outcome into.
- `portal/record-trace.mjs` (whole) — Why: the exact recorder-run skeleton to clone. `PIV_SYSTEM` (L42–72), `TASK` (L74–92), `makeFence` (L97–127), `TOOLS`/`READONLY`/`SECRET_PATHS` (L34–40), `--dry` vs real `main()` (L158–197), the standalone guard + `pathToFileURL` (L199–203).
- `portal/lib/trace-recorder.mjs` (whole) — Why: `recordRun` signature (L39), `capResponse` (L29–33) — **the image-response hardening lands here**, `toolStep` artifact pairing (L76–84), hooks/fence wiring (L92–145), meta/redaction (L150–158), marker scan (L159–177).
- `portal/lib/redact.mjs` (whole) — Why: redaction runs at record time before any byte hits disk; the "truncated fragment" residual note (L6–9) is relevant to image responses.
- `tooling/curate-trace.mjs` (whole) — Why: curation = selection + truncation only; `CURATED_LABEL` (L12), caps (L13–14). You run it unchanged: `node tooling/curate-trace.mjs <raw> <out>`.
- `tooling/validate-trace.mjs` (whole) — Why: the drift guard your trace MUST pass. Four PIV phases in order (L87–88), successful Write ⇒ existing repo-relative `artifact.path` (L74–81), honesty label (L31–32), curated ⇒ raw sibling with matching `sessionId` (L43–52). **`drift-check.mjs` runs this over every `traces/*.jsonl` in CI (L69–73).**
- `traces/README.md` (whole) — Why: the Trace format + honesty rules (never hand-write/edit; a bad run is fixed by a tighter prompt + re-run).
- `traces/demo-notice.jsonl` + `traces/demo-notice.raw.jsonl` — Why: a concrete committed pair to model shape against (do not copy content — yours is a real run).
- `system/derive.mjs` (`derive()` L45–180; the 47-key `tokens` map L144–169) — Why: **ground truth = `derive(Verdant axes).tokens`**. Import it under Node exactly as `tooling/spike-palette.mjs` does (L14–17).
- `system/derive.rules.mjs` (RULESET; `scales.comfortable` L91; `palette.accent` L38–63; `statics` L203–222) — Why: shows which tokens are brand-derived vs static, and that neutrals are tinted at sub-perceptual chroma (`bgSurface cMax 0.006`, L68) — the reason neutral ΔE must not drive the verdict.
- `system/oklch.mjs` (`hexToRgb` L14, `rgbToOklab` L37, `hexToOklch` L76, `rgbToHex` L25) — Why: OKLab ΔE = Euclidean distance of `rgbToOklab(hexToRgb(x))`. Zero-dep, DOM-free, Node-safe.
- `system/wcag.mjs` (`contrastRatio` L16, `checkPairs` L26) — Why: the "usable" read of the proposed palette (report AA pass/fail per the ruleset pairs); reuse, don't reimplement.
- `tooling/spike-palette.mjs` (`checkCompleteness` L45–61, `runSpike` L75–80, `spikeMarkdown` L83–110, standalone guard L112–151) — Why: **the template for this ticket's Node-side spike** — imports browser modules, applies an executable decision rule, emits a paste-ready markdown report. Mirror its structure and header conventions.
- `agent-layer/gen-token-css.mjs` (`cssValue` L61–66 — **export this**, `emitCss` L107–128, `GENERATED_HEADER` L68–71, `loadSource` L36–57, `genTokenCss` L132–146) — Why: the emitter you reuse; the pack-CSS shape (`:root { --name: value; }`) to match.
- `scenarios/verdant/intake.defaults.json` (`axes` L76–84 — `brandColor "#2F7A4D"`, `density "comfortable"`, `rewardType "self"`, `frequency "daily"`) — Why: **the ground-truth Verdant seed**.
- `scenarios/verdant/brief.md`, `scenarios/verdant/copy.json`, `proto/verdant.html` (head L17–20 loads contract+neutral) — Why: the subject; the proto page you screenshot under the Verdant pack.
- `tooling/visual-regression/visual.spec.mjs` (re-skin route L55: `page.route('**/system/tokens.neutral.css', route => route.fulfill({ path: packPath }))`; hermetic `beforeEach` L37–47; `PACKS` L35) — Why: the exact re-skin mechanism the one-time capture reuses; do **not** add a `verdant` entry here (baseline churn).
- `tooling/visual-regression/serve.mjs` (whole) — Why: the zero-dep static server the capture reuses (import it to boot the server on `:4757`).
- `tooling/drift-check.mjs` (`checkTraces` L69–73, `checkTokenCss` L38–44, `checkHandoff` porcelain L49–61) — Why: CI runs it; know that your new pack CSS under `system/` is **not** drift-checked by default (only contract+neutral are), and your trace **is** validated.
- `tooling/token-lint.mjs` (orphan check excludes packs L59–76; undeclared scans only `components.css` L45–52) — Why: new `tokens.<slug>.css` packs and the seed do **not** trip token-lint. Safe.
- `.github/workflows/verify.yml` (jobs: drift-check + token-lint + visual) — Why: the three gates every change must survive.
- `CLAUDE.md` (§"Where new code goes", §"Ground rules", §"Honesty contract") — Why: conventions — file headers cite governing docs, zero-dep Node ESM, throw plain Errors naming the path, deploy = commit the artifacts.

### New Files to Create

- `agent-layer/gen-pack-css.mjs` — deterministic emitter: a **DTCG seed** `{tokens:{name:{$value,$type}}}` **or** a flat `{name:value}` map (`derive().tokens`), + any missing contract tokens auto-filled → `tokens.<slug>.css` in the pack shape. `genPackCss(seedOrTokens, { slug, dest })`. Standalone: `node agent-layer/gen-pack-css.mjs <seed.json> [dest.css]`. **Not registered in `build.mjs`** (see GOTCHA).
- `tooling/diff-pack-seed.mjs` — the spike-1 diff: ground truth `derive(Verdant axes)` vs a proposed seed → per-colour OKLab ΔE, type/spacing/radius usability, verdict + label + honesty caveat → prints a report and writes `verdant.diff.json`. Standalone: `node tooling/diff-pack-seed.mjs <seed.json> <out.diff.json>`.
- `tooling/round-trip/probe-vision.mjs` — **Phase 0 de-risk**: a ~2-minute standalone `query()` (no recorder) that reads one committed PNG and prints a description — proves the SDK's `Read` returns usable image blocks before anything is built.
- `portal/record-derivation.mjs` — the recorded vision run (clone of `record-trace.mjs`), `--dry` + real modes, tight per-run fence, PIV system prompt, vision task.
- `tooling/visual-regression/capture-roundtrip.mjs` — one-time Playwright capture: boot `serve.mjs`, re-skin `proto/verdant.html` with `tokens.verdant.css`, screenshot → `tooling/round-trip/input/verdant-*.png`. Not a CI script.
- `system/tokens.verdant.css` — GENERATED ground-truth Verdant pack (from `derive(Verdant axes)` via `gen-pack-css`). Committed (Verdant is fictional/public). Header notes it is generated + how.
- `tooling/round-trip/input/verdant-plant-overview.png` — committed vision input (green-skinned Verdant proto).
- `tooling/round-trip/verdant.seed.json` — the agent's proposed seed in **DTCG** shape (`{tokens:{name:{$value,$type}}}`), its Write artifact, carrying an explicit `review` block; the reviewed/approved copy.
- `tooling/round-trip/tokens.verdant-proposed.css` — GENERATED proposed pack CSS (from the seed). Committed (AC2: "the proposed seed lands as ... generated CSS").
- `tooling/round-trip/verdant.diff.json` — GENERATED diff/verdict artifact (AC3). Committed.
- `tooling/round-trip/README.md` — one page: what the round-trip is, that it is a **closed loop against the engine's own `derive()` output** (controlled/easy case), how to regenerate each artifact, and the pointer to the offline real-product numbers in §Spikes.
- `traces/pack-seed-verdant.raw.jsonl` + `traces/pack-seed-verdant.jsonl` — the committed real trace pair.

### Relevant Documentation

- W3C DTCG (design tokens) — https://tr.designtokens.org/format/ — Why: the seed/pack values profile the repo already uses (string profile); keep colours as `#rrggbb`, dimensions as px/`clamp()`.
- WCAG 2.2 SC 1.4.3 / 1.4.11 — https://www.w3.org/TR/WCAG22/#contrast-minimum — Why: the "usable" read of the proposed palette (already encoded in `system/wcag.mjs` + `RULESET.wcagPairs`).
- Björn Ottosson, OKLab — https://bottosson.github.io/posts/oklab/ — Why: OKLab is a perceptual space; Euclidean distance in Lab is a defensible ΔE. Constants already in `system/oklch.mjs`.
- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`, installed `^0.1.77` under `portal/`) — Why: confirm `query()` prompt can be a string vs async-iterable of `SDKUserMessage` (the prompt-embedded-image fallback), and that `Read` supports image files. **Verify against the installed `.d.ts` in `portal/node_modules`, not memory** (the recorder already cites SDK 0.1.77 semantics at `record-trace.mjs` L28–33).

### Patterns to Follow

**Node-side spike (mirror `tooling/spike-palette.mjs`):** module header cites the architecture §Spikes + ticket; paths resolve from the module (`resolve(dirname(fileURLToPath(import.meta.url)), "..")`), never cwd; import the *same* browser modules the site runs; end with a standalone guard that runs stages, prints ✓/✗ lines, and `process.exit`s on the decision rule.

**Emitter reuse (do not reimplement CSS emission):**
```js
// agent-layer/gen-pack-css.mjs
import { cssValue } from "./gen-token-css.mjs"; // <- export it first (currently module-private, L61)
// The seed is DTCG (repo shape, tokens.source.json): { tokens: { "color-accent": { "$value": "#2f7a4d", "$type": "color" }, … } }.
// Emit `  --${name}: ${cssValue(tok.$value)};` for each — cssValue takes the RAW $value (string/array),
// exactly as gen-token-css calls it (L123: cssValue(tok.$value)). NEVER cssValue({ $value }) — that
// stringifies to `[object Object]`.
// Auto-fill ANY of the 47 contract leaf tokens missing from the seed from tokens.source.json's
// contract defaults (covers the relative color-mix inverse tokens, shadows, maxw, AND gutter) —
// mirroring how derive.mjs splits derived vs ruleset.statics (derive.mjs L161–166).
```

**Ground truth + ΔE (mirror `spike-palette.mjs` L14–17 imports):**
```js
import { hexToRgb, rgbToOklab } from "../system/oklch.mjs";
import { derive } from "../system/derive.mjs";
const oklab = (hex) => rgbToOklab(hexToRgb(hex));
const deltaE = (a, b) => { const x = oklab(a), y = oklab(b);
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b); };
const truth = derive({ brandColor: "#2F7A4D", density: "comfortable",
  rewardType: "self", frequency: "daily" }).tokens; // the 47-key ground-truth map (flat CSS-ready strings)
const proposed = (name) => seed.tokens[name]?.$value;  // seed is DTCG: read the $value; truth[name] is flat
```

**Recorder run (clone `record-trace.mjs` structure):** `PIV_SYSTEM` + `TASK` are const strings in the file (the runner *is* the record of what produced the trace); real run vs `--dry`; `pathToFileURL` guard; fence is a `makeFence(root)`-style closure passed as `canUseTool` (and wired into `PreToolUse` by `recordRun`).

**Errors:** throw plain `Error`s whose message names the offending path (project convention — `gen-token-css.mjs` L44, `derive.mjs` L25). No taxonomy.

**File headers:** open every new feature/entry file with a header citing its governing doc (e.g. `// portal/record-derivation.mjs — pack-seed derivation vision run (epic #38, ticket #40). Architecture §Recommended approach (capability 1) + §Spikes 1.`).

---

## IMPLEMENTATION PLAN

Phases run top-to-bottom by default. The expensive real-token run is Phase 5; **every deterministic piece the agent depends on (emitter, screenshots, fence, diff) is built and proven in Phases 0–4 first**, so Phase 5 spends tokens against known-good scaffolding.

### Phase 0: De-risk (do first — cheapest thing that can invalidate the design)

**Independent of** all later phases; unblocks Phase 4/5.

- Confirm the SDK's `Read` returns usable image blocks: `tooling/round-trip/probe-vision.mjs` runs a bare `query()` that reads one PNG (reuse an existing committed PNG, e.g. a visual-regression baseline, for the probe only) and prints a one-line description. If it works → Read-based vision is viable. If not → pivot to prompt-embedded images (async-iterable `SDKUserMessage` with an image block) and note the recorder change.
- Confirm ground truth: `node -e "import('./system/derive.mjs').then(m => console.log(m.derive({brandColor:'#2F7A4D',density:'comfortable',rewardType:'self',frequency:'daily'}).tokens))"` prints a full 47-key map (accent a negotiated green). This is the diff's ground truth.

### Phase 1: Deterministic emitter + ground-truth pack

**Depends on:** nothing. **Independent of:** Phase 2.

- Export `cssValue` from `gen-token-css.mjs` (one-line change; default path untouched).
- Build `agent-layer/gen-pack-css.mjs`; unit-check it turns a flat map into a valid `:root` pack.
- Generate `system/tokens.verdant.css` from `derive(Verdant axes)` (a 3-line committed step or a `--verdant` flag on the emitter). Commit.

### Phase 2: The diff/spike script

**Depends on:** Phase 1 (imports `derive`, shares the seed shape). **Independent of:** Phase 3.

- Build `tooling/diff-pack-seed.mjs`. Prove it against a **fixture seed equal to ground truth** → all ΔE ≈ 0, verdict PASS, before any agent output exists.
- Bake in the honesty caveat + neutral-tint explanation (see NOTES).

### Phase 3: Round-trip screenshots (vision input)

**Depends on:** Phase 1 (`tokens.verdant.css` must exist to re-skin under). **Independent of:** Phase 2.

- Build + run `tooling/visual-regression/capture-roundtrip.mjs` → commit `tooling/round-trip/input/verdant-*.png`.

### Phase 4: Recorder run harness + image hygiene + `--dry`

**Depends on:** Phase 1 (emitter for the run's validate phase), Phase 3 (screenshots exist), Phase 0 (Read-vision confirmed).

- Harden `capResponse` in `trace-recorder.mjs` for image responses (placeholder, not a base64 blob).
- Build `portal/record-derivation.mjs` with the tight per-run fence + PIV vision task.
- `--dry` smoke: exercise the **real** fence + a **real** screenshot Read + a **tiny** seed Write (not a toy task) → prove hooks fire, image reads are clean, the fence allows what the agent needs and denies the ground truth.

### Phase 5: The real run + human gate + curate + validate

**Depends on:** Phase 4.

- Real run → proposed seed + proposed CSS + trace. Expect **2–3 tighten-and-re-run passes** (the seed is far larger than demo-notice's spec; the in-run `gen-pack-css` compile is the self-correction lever). Never hand-edit the JSONL.
- Human gate: review the proposed seed, fill the `review` block, correct values if needed (the trace preserves the raw proposal; the committed seed is the approved one).
- Curate + validate the trace.

### Phase 6: Diff the real proposal → verdict artifact

**Depends on:** Phase 5 + Phase 2.

- Run `diff-pack-seed.mjs` on the approved seed → commit `verdant.diff.json`. Generate `tokens.verdant-proposed.css` from the seed → commit.

### Phase 7: Offline real-product test + record the labelling decision

**Depends on:** Phase 6.

- Run the capability offline on **one real product with a published design system** (screenshots + its published tokens, locally, uncommitted). Record only the numbers.
- Apply the decision rule (Verdant round-trip + real-product) → write the outcome + label into `docs/epics/per-company-brief.architecture.md` §Spikes 1 (AC4).

---

## STEP-BY-STEP TASKS

Execute in order. Each task names a validation command.

### 0. CREATE `tooling/round-trip/probe-vision.mjs` (de-risk Read-vision)

- **IMPLEMENT**: a minimal standalone `query()` (from `@anthropic-ai/claude-agent-sdk`, resolved via `portal/`) that reads one PNG (`allowedTools: ['Read']`) and prints its description; log whether an image block was seen.
- **PATTERN**: `portal/lib/chat.mjs` L38–56 (how `query()` is configured + iterated).
- **IMPORTS**: `query` from the SDK; run with cwd = repo root; auth from `portal/lib/env.mjs` `HAS_TOKEN` (or CLI login).
- **GOTCHA**: the SDK lives in `portal/node_modules`; run this from `portal/` or resolve the module path. If `Read` returns no usable image → switch the recorder run (Task 6) to prompt-embedded images and note it in the plan's AMENDMENTS.
- **VALIDATE**: `cd portal && node ../tooling/round-trip/probe-vision.mjs` prints a real description of the image (proves vision works).
- **SATISFIES**: de-risks AC1 (the recorded run must actually see screenshots).

### 1. UPDATE `agent-layer/gen-token-css.mjs` — export `cssValue`

- **IMPLEMENT**: change `function cssValue(` → `export function cssValue(` (L61). Nothing else.
- **GOTCHA**: do not touch `loadSource`/`genTokenCss`/`OUTPUTS`/`emitCss` — the drift-check gate compares `genTokenCss({check:true})` byte-for-byte against disk (`drift-check.mjs` L38–44).
- **VALIDATE**: `node agent-layer/gen-token-css.mjs --check` → `✓ … — no drift`.
- **SATISFIES**: AC2 (reuse the gen-token-css path).

### 2. CREATE `agent-layer/gen-pack-css.mjs` — DTCG seed / token map → `tokens.<slug>.css`

- **IMPLEMENT**: `export function genPackCss(input, { slug, dest, sourceJson })`. `input` is either a **DTCG seed** `{ tokens: { "<name>": { "$value": …, "$type": … } } }` (the agent's output) or a flat `{name: value}` map (`derive().tokens`) — normalise both to `{name: $value}`. Emit one `:root { }` with `--${name}: ${cssValue($value)};` for every token (`cssValue` takes the **raw** `$value`, matching `gen-token-css` L123). **Auto-fill ANY** of the 47 contract leaf tokens missing from `input` from `system/tokens.source.json`'s contract group (covers the relative `color-mix` inverse tokens, shadows, `maxw`, **and** `gutter` — do not hardcode a "9 statics" list). Validate completeness: all 47 present after fill, else throw naming the missing token(s). A `GENERATED_HEADER`-style provenance comment. Standalone: `node agent-layer/gen-pack-css.mjs <seed.json> [dest.css]`.
- **PATTERN**: `gen-token-css.mjs` `emitCss` L107–128 (structure) + `cssValue(tok.$value)` L123 (exact call shape); completeness mirrors `spike-palette.mjs` `checkCompleteness` L45–61.
- **IMPORTS**: `cssValue` from `./gen-token-css.mjs`; `readFileSync/writeFileSync`; `fileURLToPath/pathToFileURL`.
- **GOTCHA**: **do NOT register this in `build.mjs`** — it is ledger-driven, this is seed-driven; registering + calling it with a ledger breaks the build. Keep it standalone like `spike-palette.mjs`. Do **not** pass `cssValue({ $value })` (an object → `[object Object]`); pass the raw `$value`. Colours `#rrggbb`; dims px/`clamp()`; fonts are stacks (`cssValue` re-joins arrays, L64).
- **VALIDATE**: `node agent-layer/gen-pack-css.mjs <a DTCG fixture seed> /tmp/probe.css` emits a `:root` with 47 `--` lines and real values (not `[object Object]`); a seed missing `color-accent` throws naming it.
- **SATISFIES**: AC2 (the DTCG half + the generated-CSS half).

### 3. GENERATE + COMMIT `system/tokens.verdant.css` (ground-truth pack)

- **IMPLEMENT**: emit `derive({brandColor:"#2F7A4D",density:"comfortable",rewardType:"self",frequency:"daily"}).tokens` through `genPackCss` with `slug: "verdant"`; header states it is the canonical Verdant pack, generated, and how to regenerate. Add a `--verdant` convenience path to `gen-pack-css.mjs` (or a one-line commit step) so regeneration is reproducible.
- **PATTERN**: `tokens.saulera.css` L1–15 (a committed reference pack's header register).
- **GOTCHA**: Verdant is fictional/public — committing is correct (deploy = commit the artifacts). This pack is **not** added to `gen-token-css`'s drift gate; its determinism is proven by regenerating and `git diff`.
- **VALIDATE**: regenerate → `git diff --stat system/tokens.verdant.css` shows no change; `node tooling/token-lint.mjs` still ✓ (packs excluded from orphan/undeclared).
- **SATISFIES**: spike-1 ground truth; feeds Phase 3 + the diff.

### 4. CREATE `tooling/diff-pack-seed.mjs` (the spike-1 diff)

- **IMPLEMENT**: load the DTCG seed; read each proposed value as `seed.tokens[name].$value`. Compute `truth = derive(Verdant axes).tokens` (flat CSS-ready strings). For every colour token that is `#rrggbb` in both → OKLab `deltaE`. **Type-scale usability, viewport-robust**: score only the plain-px steps (`type-h3/body/caption/eyebrow`) for per-step deltas + intrinsic checks (monotonic display→eyebrow across ALL steps, `body ∈ [14,18]`, adjacent ratios ∈ [1.1,1.6]); for the `vw`-sloped steps (display/h1/h2/lead) report the values **unscored** (see GOTCHA 1). Spacing: monotonic + multiples of 4. Radius: monotonic. **Verdict keys on `accentDeltaE ≤ 0.05` AND `typeUsable` AND `spacingUsable`** → `"agent-proposed, human-approved"`, else `"human-authored with agent assistance"`. Emit `verdant.diff.json` (per-token detail, verdict, mandatory `caveat`). Print a `spike-palette`-style markdown report.
- **PATTERN**: `spike-palette.mjs` (whole) — stage structure, decision rule, markdown, exit code. `wcag.checkPairs` (L26) for an AA "usability" table over the proposed palette.
- **IMPORTS**: `hexToRgb, rgbToOklab` from `../system/oklch.mjs`; `derive` from `../system/derive.mjs`; `contrastRatio/checkPairs` from `../system/wcag.mjs`.
- **GOTCHA 1 — viewport artifact (type)**: ground-truth vw steps are `clamp(min, N vw, max)`; at the 1280px capture width they render *below* max (`type-h1 clamp(32px,4vw,56px)` ≈ 51px). Diffing measured-px vs `clamp`-max logs a viewport artifact as a fidelity miss — so the verdict rests on the plain-px steps + ratios + monotonicity (all viewport-robust). (Alternative if vw steps must be scored: compute the ground-truth *rendered* px at the capture width and compare to that, not to the clamp max.)
- **GOTCHA 2 — neutrals**: `derive()` tints neutrals at sub-perceptual chroma (`bgSurface cMax 0.006`); the agent proposes plain `#ffffff`/greys, so neutral ΔE looks large but is perceptually trivial. Report neutral deltas for transparency, **exclude them from the verdict**, explain why in the JSON. The `caveat` must state: *Verdant is a closed round-trip against the engine's own `derive()` output (an easy, controlled case — reading a solid accent off a render is near colour-picking); the fidelity claim rests on the offline real-product test, not this ΔE.* Skip ΔE for non-hex (`color-mix`, font, dimension) tokens.
- **VALIDATE**: `node tooling/diff-pack-seed.mjs <DTCG fixture == truth> /tmp/x.json` → accent ΔE ≈ 0, PASS; a magenta-accent fixture → large accent ΔE, label flips.
- **SATISFIES**: AC3; AC4 (produces the labelled verdict).

### 5. CREATE + RUN `tooling/visual-regression/capture-roundtrip.mjs` (vision input)

- **IMPLEMENT**: import `./serve.mjs` (boots the `:4757` static server rooting the repo), `import { chromium } from '@playwright/test'`, `page.route('**/system/tokens.neutral.css', r => r.fulfill({ path: <repo>/system/tokens.verdant.css }))`, `goto('/proto/verdant.html')`, wait for `.vd-plant-card` + `document.fonts.ready`, screenshot the phone screen (and optionally the full page) → `tooling/round-trip/input/verdant-plant-overview.png`. Abort non-`:4757` requests (hermetic) so the proto hits the static fixture fallback, exactly like the gate (`visual.spec.mjs` L37–47, L55).
- **PATTERN**: `visual.spec.mjs` L37–99 (re-skin route + hermetic gate + proto waits).
- **IMPORTS**: `@playwright/test` from `tooling/visual-regression/node_modules` (already installed — no new dep).
- **GOTCHA**: run from `tooling/visual-regression/` so `@playwright/test` resolves. Do **not** add `verdant` to `visual.spec.mjs`'s `PACKS` — that would create new CI baselines (churn + cost). This capture is one-time authoring; commit the PNG output, not a baseline.
- **VALIDATE**: `cd tooling/visual-regression && node capture-roundtrip.mjs` → a green-accented Verdant screenshot exists under `tooling/round-trip/input/`; open it — accents are green (not neutral blue).
- **SATISFIES**: AC1 input.

### 6. HARDEN `portal/lib/trace-recorder.mjs` `capResponse` for image responses

- **IMPLEMENT**: in `capResponse` (L29–33), before `JSON.stringify`, detect an image-block tool_response (non-string, array/object containing an `image`/`source.data` shape) and return a clean placeholder `{ response: "[image tool_response: N block(s)]", responseTruncated: true }` instead of a base64 blob. Text responses (strings) are unaffected.
- **PATTERN**: the existing `capResponse` cap contract; `redact.mjs` L6–9 "truncated fragment accepted" register.
- **GOTCHA**: this only runs at record time — it does **not** alter already-committed traces (drift-check re-*validates*, never re-records). Keep the change tiny and text-path-identical, so the demo-notice trace's re-validation stays green. If Phase 0 forced prompt-embedded images instead, this hardening is still harmless (no image Reads occur) — keep it.
- **VALIDATE**: covered by Task 7's `--dry` (the smoke reads a real PNG; inspect the raw JSONL — the Read step's `response` is the placeholder, file is well-formed).
- **SATISFIES**: AC1 (a clean, public-shippable trace).

### 7. CREATE `portal/record-derivation.mjs` — the vision run (+ `--dry`)

- **IMPLEMENT**: clone `record-trace.mjs`. `SLUG = 'pack-seed-verdant'`. `MODEL` — a vision-capable model (e.g. `'claude-sonnet-5'`, matching the existing run; confirm vision support). `PIV_SYSTEM`: reuse the four-phase contract, adapted to a derivation task (plan = read the screenshots + the contract token list; gate = review the proposed mapping against the contract + honesty; implement = Write the seed; validate = run `gen-pack-css` on the seed and report). `TASK`: "Read the committed Verdant screenshot(s) under `tooling/round-trip/input/`. Propose a complete pack seed as **DTCG** — `{ tokens: { \"color-accent\": { \"$value\": \"#2f7a4d\", \"$type\": \"color\" }, … }, review: {approved:false,changedTokens:[],by:'',date:''} }` — giving every perceptual contract token (colours as `#rrggbb`, type ramp + spacing + radius as px or `clamp()`, fonts as a stack). Write it to `tooling/round-trip/verdant.seed.json`. Do NOT read the ground-truth pack, the scenario axes, or the ruleset — propose only from the pixels. Validate by running `node agent-layer/gen-pack-css.mjs tooling/round-trip/verdant.seed.json` (it throws on any missing/invalid token)." **A TIGHT per-run fence** (`makeDerivationFence(root)`): Read allowed ONLY for the screenshot dir + `system/tokens.source.json` (+ `system/tokens.contract.css`) — **deny reads of `scenarios/verdant/intake.defaults.json`, `system/tokens.verdant.css`, `system/derive.*`** (the answer); Write allowed only inside `tooling/round-trip/`; Bash allowed only `node …`; secret paths denied both directions (reuse `SECRET_PATHS`). **Build the read-allowlist from ABSOLUTE paths** — in `--dry`, cwd is a scratch dir but the screenshots sit at an absolute repo path, so a cwd-relative allowlist would wrongly deny them (demo-notice's `--dry` passes absolute paths for exactly this reason, `record-trace.mjs` L165–166).
- **PATTERN**: `record-trace.mjs` whole — `makeFence` L97–127, `TOOLS`/`READONLY` L34–35, real vs `--dry` `main()` L158–197, `pathToFileURL` guard L199–203.
- **IMPORTS**: `recordRun` from `./lib/trace-recorder.mjs`; `REPO_DIR, HAS_TOKEN` from `./lib/env.mjs`.
- **GOTCHA**: **do NOT copy the `tooling/style-dictionary/node_modules` guard** (`record-trace.mjs` L185–187) — that exists because demo-notice's validate runs `gen-handoff` (Style Dictionary). This run's validate runs `gen-pack-css` (zero-dep). The fence must ALLOW the paths the agent needs (screenshots, `tokens.source.json`, the `tooling/round-trip/` writes, `node`) — a misconfigured deny surfaces as a null-phase or failed run. The `--dry` must use the **real** fence + a **real** screenshot Read + a tiny seed Write (not a toy prompt) so fence/vision bugs surface cheaply.
- **VALIDATE**: `node portal/record-derivation.mjs --dry` → a clean 4-phase PIV smoke to a scratch dir; the raw JSONL is well-formed, the screenshot Read step carries the image placeholder, and (if the task provokes it) a fence denial is recorded as a step.
- **SATISFIES**: AC1.

### 8. RUN the real derivation + human gate (Phase 5)

- **IMPLEMENT**: `node portal/record-derivation.mjs` → `traces/pack-seed-verdant.raw.jsonl` + the proposed `tooling/round-trip/verdant.seed.json`. Inspect the ✓ summary (phases `plan→gate→implement→validate`, 0 null-phase). If not clean, **tighten `PIV_SYSTEM`/`TASK` and re-run with `--force`** — never hand-edit the JSONL. Then the human gate: review each proposed value, set `review.approved=true`, list any `changedTokens`, correct values in the seed file if needed.
- **PATTERN**: `record-trace.mjs` `summarize` L137–156 (the clean-run signal); `traces/README.md` honesty rules.
- **GOTCHA**: expect 2–3 passes — the seed (≈38 tokens) is much larger than demo-notice's single spec; a first run may miss a token or malformat a `clamp()`. The in-run `gen-pack-css` compile is the self-correction lever (spike-5 loop working, not a plan failure). The trace's Write-step input preserves the *raw* proposal even after you edit the committed seed — that diff is the human-gate receipt.
- **VALIDATE**: `node portal/record-derivation.mjs` prints `trace pack-seed-verdant ✓`; `gen-pack-css` on the final seed compiles.
- **SATISFIES**: AC1 + the human-gate boundary.

### 9. CURATE + VALIDATE the trace

- **IMPLEMENT**: `node tooling/curate-trace.mjs traces/pack-seed-verdant.raw.jsonl traces/pack-seed-verdant.jsonl` then `node tooling/validate-trace.mjs`.
- **PATTERN**: `traces/README.md` workflow L136–143.
- **GOTCHA**: curated must derive from the committed raw sibling (matching `sessionId`) — if you re-ran with `--force`, re-curate so raw+curated are the *same* session (`validate-trace.mjs` L43–52). Commit **both** files.
- **VALIDATE**: `node tooling/validate-trace.mjs` → `pack-seed-verdant ✓` for both raw + curated; `node tooling/drift-check.mjs` passes the `checkTraces` step.
- **SATISFIES**: AC1.

### 10. GENERATE the proposed pack CSS + the diff artifact (Phase 6)

- **IMPLEMENT**: `node agent-layer/gen-pack-css.mjs tooling/round-trip/verdant.seed.json tooling/round-trip/tokens.verdant-proposed.css` (commit) and `node tooling/diff-pack-seed.mjs tooling/round-trip/verdant.seed.json tooling/round-trip/verdant.diff.json` (commit). Write `tooling/round-trip/README.md`.
- **VALIDATE**: `verdant.diff.json` exists with per-token ΔE, verdict, label, and the honesty caveat; `tokens.verdant-proposed.css` is a valid `:root` pack.
- **SATISFIES**: AC2 (proposed seed → generated CSS) + AC3 (deterministic diff artifact).

### 11. Offline real-product test + record the labelling decision (Phase 7)

- **IMPLEMENT**: locally (uncommitted), run `record-derivation.mjs` variant on **one real product with a published design system** — its screenshots + published tokens as input. Note the accent ΔE + scale usability numbers only. Then edit `docs/epics/per-company-brief.architecture.md` §Spikes 1: record the Verdant round-trip result **and** the real-product numbers, state the chosen label per the decision rule, date it (2026-07-19), and explicitly note Verdant is the controlled case and the real-product test is what the fidelity claim rests on.
- **PATTERN**: the §Spikes entry register in the same doc (L58–67); the honesty-labelling boundary (L47).
- **GOTCHA**: **nothing real-brand is committed** (privacy boundary, hard) — the real-product run's inputs/outputs/trace stay local; only anonymised numbers land in §Spikes. If the real-product test can't be run before merge, flag it in Open Questions and land the labelling decision as provisional on the Verdant result **with the caveat stated** — do not silently drop it.
- **VALIDATE**: `git diff docs/epics/per-company-brief.architecture.md` shows the §Spikes 1 outcome + label + date; no real-brand files staged (`git status` clean of company data).
- **SATISFIES**: AC4.

### 12. Full gate + PR

- **IMPLEMENT**: run the three CI gates locally; open the PR with `Closes #40`, linking the trace pair, the diff JSON, and the §Spikes outcome.
- **VALIDATE**: `cd tooling/style-dictionary && npm ci` (once) → `node tooling/drift-check.mjs` ✓ · `node tooling/token-lint.mjs` ✓ · `cd tooling/visual-regression && npm ci && npx playwright test` ✓ (still 16 shots — no new baselines).
- **SATISFIES**: all ACs + no regressions.

---

## TESTING STRATEGY

No unit-test suite exists (project rule: "run the surface you touched"). "Tests" here = running each surface + the deterministic fixture checks below.

### Deterministic checks (before the real run)

- `gen-pack-css.mjs`: a flat map → valid 47-token `:root`; a seed missing a token throws naming it; the emitted `system/tokens.verdant.css` regenerates byte-identically.
- `diff-pack-seed.mjs`: fixture seed == ground truth → accent ΔE ≈ 0, `typeUsable`/`spacingUsable` true, label = "agent-proposed…"; a deliberately-wrong fixture (magenta accent, 30px body) → label flips. This proves the decision rule *before* any agent output.
- `record-derivation.mjs --dry`: hooks fire, image Read is a clean placeholder, JSONL well-formed, the fence denies the ground-truth paths + records a denial step, a tiny seed writes and compiles.

### Integration (the real workflow)

- The real run → curate → validate → diff → §Spikes chain, end to end, passing `validate-trace` + `drift-check`.

### Edge cases

- Agent proposes a non-hex/`color-mix` colour → diff skips ΔE for it (reports n/a), emitter passes it through `cssValue`.
- Agent omits a token → `gen-pack-css` throws in the run's own validate phase (self-correction), not at commit time.
- Re-run with `--force` → raw+curated `sessionId` match (re-curate); `validate-trace` L43–52 enforces it.
- Neutral tokens diverge (white vs tinted) → reported, excluded from verdict, explained.
- Playwright unavailable in the author's env → capture is one-time authoring; a manually-taken green screenshot is an acceptable input substitute (input provenance is not under the trace honesty contract; the *trace* is).

---

## VALIDATION COMMANDS

Run every command; zero errors expected.

### Level 1: Syntax & Style
- `node --check` is run over every tracked `.mjs` by `node tooling/drift-check.mjs` (step 1). Individually: `node --check portal/record-derivation.mjs agent-layer/gen-pack-css.mjs tooling/diff-pack-seed.mjs`.

### Level 2: Deterministic unit surfaces
- `node agent-layer/gen-token-css.mjs --check` → no drift (export didn't change output).
- `node agent-layer/gen-pack-css.mjs tooling/round-trip/verdant.seed.json /tmp/x.css` → 47-token pack.
- `node tooling/diff-pack-seed.mjs <fixture> /tmp/x.json` → expected verdict on fixtures.

### Level 3: Trace + repo gates (CI parity)
- `cd tooling/style-dictionary && npm ci` (once) then `node tooling/drift-check.mjs` → `✓ syntax · token-css · handoff · scenarios · traces` (includes the new trace).
- `node tooling/token-lint.mjs` → `✓` (packs excluded).
- `node tooling/validate-trace.mjs` → `pack-seed-verdant ✓` (raw + curated).

### Level 4: Manual validation
- Open `tooling/round-trip/input/verdant-plant-overview.png` → green-accented Verdant.
- Open `tooling/round-trip/verdant.diff.json` → per-token ΔE, verdict, label, honesty caveat.
- Read `traces/pack-seed-verdant.jsonl` → four PIV acts, the screenshot Read step, the seed Write artifact; raw preserves the un-gated proposal.
- `git diff docs/epics/per-company-brief.architecture.md` → §Spikes 1 outcome + label.

### Level 5: Visual gate
- `cd tooling/visual-regression && npm ci && npx playwright test` → 16 shots pass, **no new baselines** (round-trip stayed out-of-band).

---

## ACCEPTANCE CRITERIA

From the ticket, plus derived:

- [ ] A REAL recorded run committed under `traces/` (raw + curated pair) passing `node tooling/validate-trace.mjs` — no hand-written/hand-edited trace content.
- [ ] The proposed seed lands as a **DTCG** seed record (`{tokens:{name:{$value,$type}}}`) **and** generated `tokens.verdant-proposed.css` via `gen-pack-css` (the exported `gen-token-css` `cssValue` path).
- [ ] A deterministic diff artifact (`verdant.diff.json`: proposed vs `derive(Verdant axes)` ground truth) produced by a committed script (`tooling/diff-pack-seed.mjs`).
- [ ] The labelling decision, per the spike's rule (Verdant round-trip **and** offline real-product), recorded in `docs/epics/per-company-brief.architecture.md` §Spikes 1.
- [ ] The human gate is visible + honest: the trace preserves the raw proposal; the committed seed carries an explicit `review` block; the diff-vs-trace is the receipt.
- [ ] The verdict JSON + §Spikes entry state plainly that Verdant is a closed round-trip (controlled case) and the fidelity claim rests on the real-product result.
- [ ] All three CI gates pass; visual gate unchanged at 16 shots; `gen-token-css --check` shows no drift.
- [ ] No new runtime dependency; no real-brand content committed.

---

## COMPLETION CHECKLIST

- [ ] Phase 0 de-risk done (Read-vision confirmed OR fallback taken + noted).
- [ ] `cssValue` exported; `gen-pack-css.mjs` built + standalone-runnable, not in `build.mjs`.
- [ ] `system/tokens.verdant.css` generated + committed + regenerates identically.
- [ ] `diff-pack-seed.mjs` proven on fixtures (pass + fail cases) before the real run.
- [ ] Round-trip screenshots captured + committed; visual gate untouched.
- [ ] `capResponse` image hardening in; demo-notice trace still validates.
- [ ] `record-derivation.mjs` `--dry` clean (real fence + real image Read + tiny Write).
- [ ] Real run clean 4-phase PIV (after ≤ a few tighten-and-re-run passes); human gate filled.
- [ ] Trace curated + validated; raw + curated committed with matching `sessionId`.
- [ ] Proposed CSS + `verdant.diff.json` + `round-trip/README.md` committed.
- [ ] Offline real-product numbers taken; §Spikes 1 updated with outcome + label + caveat + date.
- [ ] drift-check + token-lint + visual all ✓.

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions (proceeding on these):**
- **Ground truth = `derive({brandColor:"#2F7A4D",…}).tokens`.** No human-authored Verdant pack exists, so the deterministically-derived pack is the only "known" pack. Documented; not blocking.
- **Vision via the `Read` tool** returns usable image blocks in SDK 0.1.77 (Phase 0 confirms; fallback = prompt-embedded images).
- **Model** `claude-sonnet-5` is vision-capable for this task (confirm in Phase 0; swap if not).
- **"Small perceptual delta" = accent OKLab ΔE ≤ 0.05** (≈ a small but noticeable shift; ΔE 0.02 ≈ JND). Tunable constant in `diff-pack-seed.mjs`; the spike records the actual number regardless.
- **Proposed/ground-truth artifacts live under `tooling/round-trip/` and `system/tokens.verdant.css`.** If #42 wants a different home for the public display, it can relocate the *display* copy; the diff data stays here.

**Questions (flag if they change the plan):**
- Can the offline real-product test complete before merge? If not, land the label provisionally on Verdant **with the controlled-case caveat stated**, and open a follow-up for the real-product number (do not drop it — AC4 depends on it).
- One Verdant screenshot (the single proto screen) limits type-scale observation. Acceptable for the spike (noted as a limitation); a second capture at a wider viewport is a cheap add if type usability reads poorly.

**Dependencies / hygiene (not blockers, but get these right before starting):**
- **`docs/epics/per-company-brief.architecture.md` is currently untracked** (`??` in git) and lives only on this working tree — Task 11 edits its §Spikes. On a clean branch off `main` it will not exist. It lands via epic #38/#39, or must be carried onto #40's branch. Confirm it is present (and committed) before Task 11.
- **Start #40 from its own branch off `main`, not the current `feature/factory-integration`** (which is mid-another-feature). Stage by explicit path and verify the branch right before committing (shared-worktree / parallel-session practice) — several of this ticket's files are new, so `git add <path>` each rather than `git add -A`.

---

## NOTES (open canvas)

**Why ground truth is `derive()`, not a static file.** The factory's thesis is derivation; Verdant is defined by `axes.brandColor "#2F7A4D"` + `density "comfortable"` in `scenarios/verdant/intake.defaults.json`. Running those axes through the frozen engine yields the canonical Verdant pack by construction — the same values `proto/verdant.html` would render under a Verdant skin. That is the honest "known pack" to diff against, and it means the ground truth is regenerable, never hand-authored.

**Why the seed is a full contract-keyed DTCG map, not compact axes.** Feeding a compact seed back through `derive()` would collapse type/spacing/radius into a density preset — but the architecture wants the agent to propose *palette, type scale, spacing, radius* independently (that is the exhibit), and AC2 requires the seed to be **DTCG** (`tokens.source.json` shape). So the agent proposes the full contract-keyed DTCG map; `gen-pack-css` completes any token the agent omits from the contract defaults (the relative `color-mix` inverse tokens, shadows, `maxw`, `gutter`), mirroring `derive.mjs`'s derived-vs-`ruleset.statics` split (`derive.mjs` L144–169). We deliberately do **not** re-run `derive()` on the proposal — the proposal is the agent's, gated by the human, not re-synthesised by the engine.

**The neutral-tint trap (why the verdict ignores neutrals).** `derive()` tints every neutral with the brand hue at sub-perceptual chroma (`bgSurface cMax 0.006`, `border cMax 0.01`). A vision agent reading a near-white card will propose plain `#ffffff`. The per-token ΔE on those neutrals will look alarming (a warm-grey vs pure white) but is perceptually trivial and not a fidelity failure. The verdict therefore keys only on **accent ΔE + type/spacing usability**; neutral deltas are reported for transparency with an inline explanation. Keying the verdict on the full-palette ΔE would manufacture a failure the eye can't see — the inverse of overclaiming, but still dishonest.

**The honesty ceiling on the Verdant round-trip.** Reading a solid green accent off a rendered screenshot is close to a colour-picker operation; the Verdant accent ΔE will almost certainly come back near-zero. Headlining that as "derivation is high-fidelity" would overclaim from a rigged-favourable, closed loop (the agent re-derives the engine's own output). That is precisely why the architecture pairs Verdant with an **offline real-product test** (uncontrolled: real product photography/screens, real published tokens, real ambiguity). The §Spikes entry and `verdant.diff.json.caveat` must both say: Verdant proves the *pipeline*; the *fidelity claim* rests on the real-product number. This keeps the labelling honest under the hard honesty contract.

**Expect 2–3 recorded-run passes.** demo-notice authored one small spec; this run authors ≈38 token values from pixels. A first pass may miss a token or malformat a `clamp()`. The run's own validate phase (`node agent-layer/gen-pack-css.mjs …`, which throws) is the self-correction lever — the spike-5 tighten-and-re-run loop working as designed. The fix is always a tighter `PIV_SYSTEM`/`TASK` + `--force` re-run, **never** a JSONL edit. Budget real-token cost for a few sonnet-5 vision runs.

**AC2 wording tension, resolved.** "via the existing `gen-token-css` path" — `gen-token-css.mjs` as written only emits contract+neutral from the hardcoded `tokens.source.json` and is guarded byte-for-byte by drift-check. Fully generalising `genTokenCss` to arbitrary sources would endanger that gate. The faithful, low-risk resolution: export its `cssValue` helper and add a thin sibling (`gen-pack-css.mjs`) that reuses it — the same emission path, no risk to the drift-checked default. Recorded here so a reviewer sees the choice was deliberate.

**Rejected alternatives.** (1) Deterministic colour-extraction library — rejected by the architecture (can't read type/spacing/radius; the *agent run is the exhibit*, a silent extraction demonstrates nothing) and would add a dependency. (2) Reusing the existing `proto-verdant-saulera.png` baseline as input + diffing vs the saulera pack — less work, but contradicts "Verdant round-trip" (the ticket title) and diffs against an unrelated brand. (3) Adding `verdant` to the CI visual `PACKS` — creates new baselines (churn + cost) and couples a demo artifact to the gate; the one-time out-of-band capture avoids both. (4) Prompt-embedded images instead of `Read` — simpler/robust but loses the "the agent read your screenshots" tool-step narrative and the fence story; kept as the documented fallback only if Phase 0 shows `Read`-vision is unusable.

**Confidence: 9.5/10** for one-pass success. The deterministic scaffolding (emitter, diff, ground truth, screenshots, fence) is fully specified against read code and proven on fixtures before any tokens are spent; the two residual unknowns are converted to cheap early probes (Phase 0 Read-vision; the `--dry` real-fence smoke). The remaining 0.5 is inherent to a *real* agent vision run — the proposal quality, and thus how many tighten-and-re-run passes Phase 5 needs, cannot be known until it runs (which is the spike's whole point).

## AMENDMENTS

- (none yet — created 2026-07-19)
