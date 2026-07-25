# Feature: v3 investment close (beat 4) — takeaway + shareable state

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Beat 4 of the v3 home spine (`#beat-close`) is currently a static card: one line of copy and two links. This ticket turns it into the **investment beat** of the Hook Model — the step where the visitor puts something in and takes something out, and the step the PRD ties to the "Forwarded internally" success metric.

Three functional pieces:

1. **Takeaway** — the close card offers the handoff pack the visitor can actually keep: the viewer (`/handoff.html`) and the one-file bundle download (`/handoff/verdant/pack.bundle.json`), plus — only when the visitor has derived a brand — a one-click copy of *their* derived token block, labelled as derived-here.
2. **Shareable state** — a "copy a link to this" control encodes the visitor's bounded inputs (brand colour + optional company-name label + the three wizard axes) into query parameters. Opening that link re-runs the **real** `derive()` engine on the shared colour, re-skins the site, wears it, and seeds the wizard so the peak assembles under the same answers. Nothing is uploaded; the link is the transport.
3. **Close** — "this is what I'd do for your team in week one" + the contact action, already static in the markup and preserved as the no-JS floor.

The share link carries **inputs, not outputs**. The visitor's link says "this colour, these three answers"; the receiving browser runs the engine itself. That is the platform's whole thesis performed on the share mechanism — and it is why the shared state cannot be applied pre-paint (see NOTES).

## User Story

As a hiring manager who has just watched a product screen assemble under my company's brand colour
I want to keep the artifact and send my colleague a link that reproduces exactly what I saw
So that the demo survives being forwarded, and the candidate's work reaches the rest of the panel intact

## Problem Statement

The spine currently ends with a dead end. A visitor reaches the peak, sees a screen built under their brand, and then hits a static card with two generic links — nothing they can keep, and no way to hand the moment to a colleague. The Hook Model's investment step is missing, and the PRD's "Forwarded internally" metric has no mechanism behind it: forwarding the URL today lands the recipient on a neutral, un-briefed home page that looks nothing like what the sender described.

## Solution Statement

Add a bounded, honest URL state codec and wire it into the beats that already own each piece of state:

- A new **pure, dependency-free** module `system/share-state.mjs` owns the encode/decode/validate contract. No DOM, no storage, no engine — so it is unit-testable under Node with `node -e`, which is this repo's only available form of automated test.
- `system/pack-derived.mjs` (which already owns the derived record, `:root` apply, and the `wear()` selector) gains one small `hydrateFromSharedLink()` step that runs **before** its existing `wireBeatBrand()`. Because `dock.mjs` imports `pack-derived.mjs` and its `<script>` tag precedes `spine.mjs`, this hydration lands before the hero's `isWearingDerived()` guard is evaluated — so the hero automatically skips its canned re-skin instead of overwriting and then stripping the shared brand. **No change to `spine.mjs` is required.**
- `system/intake-beat.mjs` decodes the same URL independently and passes the axes through a new additive `seedAnswers` option on `initIntake` (the shared wizard stays configured, never forked).
- A new `system/close.mjs` registers `#beat-close` on the spine seam and builds the JS-only share/takeaway layer on top of the static card.

The static markup stays the honest floor: with JS off or on a circuit-breaker trip, the close card is the handoff link + contact CTA, exactly as the ticket's degradation clause requires.

## Out of Scope / Non-Goals

- **Not included:** regenerating the handoff pack under the visitor's brand. The pack is Verdant's committed pack. Copy must say "the pack an engineer receives", never "your pack". The visitor's own tokens are offered separately and labelled derived-here.
- **Not included:** free-text product input of any kind. The URL carries a hex, three enum values, and a ≤40-char display label — nothing else (PRD §8 non-goal).
- **Not included:** a share-link expiry, a shortener, a server round-trip, or any upload surface. The link is the transport; nothing leaves the browser.
- **Not included:** a "forget the shared state" affordance. The dock's existing **Reset to neutral** (`dock.mjs:262`) already stops wearing and restores the pre-wear pack via `unwear()`.
- **Not included:** pre-paint application of shared state. Structurally impossible — see NOTES §"Why the shared brand cannot apply pre-paint".
- **Not changing:** `system/spine.mjs`, `system/peak.mjs`, `system/pack-boot.js`, `system/dock.mjs`. All four already do the right thing once the record is written early (verified — see Patterns to Follow).
- **Not changing:** the ethics-gate, WCAG receipts, or anything inside the peak. The peak reads seeded answers automatically through `getHomeAnswers()`.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: `system/` view-time modules (share codec, derived-pack record, home intake beat, shared wizard, analytics), `index.html` close region, `system/portfolio.css`
**Dependencies**: None new. Vanilla ES modules, no build step, no runtime deps (hard constraint, CLAUDE.md).

## Related Work

**Implements**: [#77 — P2e · The investment close (beat 4)](https://github.com/linardsb/ux-factory/issues/77) · **Epic**: [#70 — portfolio v3](https://github.com/linardsb/ux-factory/issues/70) · `docs/epics/portfolio-v3-experience.architecture.md`

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/v3-spine-skeleton.md` (#71) — Why: owns the `#beat-close` region contract and the `.close-card` organism this fills.
- `.claude/plans/v3-hero-choreography.md` (#72) — Why: owns `registerBeat`, the `isWearingDerived()` hero guard this relies on, and the `crossfade()` idiom.
- `.claude/plans/v3-your-brand-input-derived-pack-persistence.md` (#74) — Why: owns the derived record, `applyToRoot`, `wear()`/`unwear()`, and the honesty-label copy this reuses verbatim.
- `.claude/plans/v3-intake-stakeholder-rewrite.md` (#73) — Why: owns `askedAxes`/`onAnswers`, the additive-config precedent `seedAnswers` follows.
- `.claude/plans/v3-built-screen-peak.md` (#75) — Why: owns `/factory/built`, `getHomeAnswers()`, and the fire-from-the-success-path analytics rule.
- `.claude/plans/v3-redesigned-pack-control.md` (#76) — Why: owns `PREWEAR_KEY`, `BRAND_CHANGE_EVENT`, `derivedNote()`, and the copy-tokens block this mirrors.

**Forward-references**:

- #82 (P4) — full baseline regen + VR re-block at final v3 merge.

---

## CONTEXT REFERENCES

> ⚠️ **Read against `origin/main`, not the local working tree.** `origin/main` is ahead: PR #99 (#76 pack control) and #79/#80 have landed. Every line number below is `origin/main`.

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/pack-derived.mjs` (whole file, 281 lines) — Why: **the primary integration point.** Owns `buildRecord` (88-97), `applyToRoot`/`clearRoot` (105-114), `readRecord`/`writeRecord` (118-132), `wear`/`unwear` (148-173), `BRAND_CHANGE_EVENT` (43-47), `sanitizeName` + `NAME_MAX` (32, 80-82), and the honest label copy (186-195). `wireBeatBrand()` self-boots at 280 behind a `typeof document` guard — the new hydration slots in immediately before it.
- `system/spine.mjs` (lines 32-34, 46-59, 93-110, 132-153) — Why: `isWearingDerived()` (32-34) is the guard that makes the hero skip its canned re-skin; `registerBeat` calls `activate()` **synchronously** at line 56, and `heroBeat` checks the guard at line 137 *before its first `await`*. This is why hydration ordering is load-bearing. `registerBeat`'s contract is documented at 36-45. **Do not modify this file.**
- `system/peak.mjs` (lines 26-33, 107-111, 342-349) — Why: the beat-registration + Node-import-safety pattern to mirror exactly; `readInputs()` (107-111) shows how the peak already picks up `readRecord()?.brandColor` and `getHomeAnswers()` — so seeded answers reach the peak with zero peak changes.
- `system/intake-beat.mjs` (whole file, 43 lines) — Why: the module `seedAnswers` is threaded through; `HOME_AXES` (22) and the `getHomeAnswers()` publish cache (29-32).
- `system/factory-intake.mjs` (lines 204-297) — Why: the `initIntake({ scenarios, defaultScenario, askedAxes, onAnswers })` seam (213), `answers = { ...scenarios[active].defaults }` (228) — the exact line `seedAnswers` merges over — and `run()`/`setAnswer()` (243-282).
- `system/dock.mjs` (lines 91-102, 169-238, 259-300) — Why: `groundTruth()` + `derivedOnRoot()` prove the dock reflects a hydrated record with no change; `derivedNote()` (99-102) is the honesty copy to reuse; the copy-tokens block (277-300) is the pattern the derived-token takeaway mirrors. **Do not modify this file.**
- `system/analytics.mjs` (whole file, 64 lines) — Why: the virtual-route event pattern; `trackFactoryBuilt` (58-64) is the exact shape `trackFactoryShared` copies, including the separate fire-once guard.
- `index.html` (lines 269-287 close region; 355-363 script tags) — Why: the static card to extend and the module load order to insert into.
- `system/portfolio.css` (lines 1044-1056 band/scroll-margin, 1500-1516 `.close-card`) — Why: the organism to extend; `#beat-close` is already in the `scroll-margin-top` list at 1045.
- `system/handoff-viewer.mjs` (lines 250-265) — Why: the second clipboard precedent (`Copied ✓` / `Copy failed` + timeout reset).
- `handoff.html` (line 153) — Why: the canonical bundle-download href and its full descriptive label.
- `scenarios/validate.mjs` (lines 21-25) — Why: **the authoritative axis enums** (`density` · `rewardType` · `frequency`) the codec allowlist must mirror.
- `system/derive.mjs` (lines 23-45) — Why: `derive()`'s throw contract — every message names the offending input; the codec must never let an invalid value reach it.
- `agent-layer/gen-loc-summary.mjs` (lines 22-26, 33-47) — Why: the `runtime` group regex matches `system/*.mjs`, and counts come from `git show :<path>` (the **index**), which fixes the staging order of the regen task.
- `tooling/visual-regression/visual.spec.mjs` (lines 15-46) — Why: `index` waits on `#beat-hero[data-spine="ready"]`; the VR run loads `/index.html` with **no query string**, so the decode must be a strict no-op on a bare URL.

### New Files to Create

- `system/share-state.mjs` — pure share-link codec: `SHARE_PARAMS`, `AXIS_ENUMS`, `encodeShareState()`, `decodeShareState()`, `hasSharedBrand()`. No DOM, no storage, no engine import. ~90 LOC.
- `system/close.mjs` — Beat 4: registers `#beat-close`, builds the share + takeaway layer over the static card. ~170 LOC.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [MDN — URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
  - Specific section: `get()` / `set()` / `toString()` percent-encoding behaviour
  - Why: the codec's whole transport. `toString()` already escapes the name label, so no hand-rolled escaping is needed (and hand-rolling it would be a bug).
- [MDN — Clipboard.writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)
  - Specific section: secure-context requirement and the returned Promise
  - Why: `navigator.clipboard` is undefined on plain-HTTP origins other than localhost. The share button must degrade (show the URL in a selectable field) rather than throw — both existing call sites only `.catch()`, which is not enough for a control whose entire job is handing over a link.
- [MDN — History.replaceState](https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState)
  - Specific section: same-document URL rewriting
  - Why: `analytics.mjs:44-48` already uses the pushState/replaceState pair; the share codec must not fight it (see GOTCHA on the analytics race).
- `docs/epics/portfolio-v3-experience.architecture.md` §"Boundaries (hard)" + §Analytics (lines 25-31)
  - Why: "nothing fails on stage", the derived-brand honesty rule, and the fact that **only** `/factory/built` is an inherited analytics decision.

### Patterns to Follow

**Module header citing its governing doc** (CLAUDE.md convention; every new file):

```js
// system/share-state.mjs — hand-written canon (this repo; not generated).
// The bounded share-link codec for the v3 investment close (epic #70 ticket #77; PRD §6.1
// beat 4 / §8 "the investment step is the takeaway/forward"). Pure: no DOM, no storage, no
// engine — so it is Node-testable and safe to import from anywhere in the graph.
```

**Mirrored predicates, kept identical by hand** (`pack-derived.mjs:53-59` ↔ `pack-boot.js`): when a value must be validated in two places that cannot share an import, duplicate the regex/enum and say so in a comment naming the other site. The axis enums are duplicated from `scenarios/validate.mjs:21-25` for exactly this reason (a shipped page cannot import a Node validator).

**Validate at the boundary and throw / drop** (CLAUDE.md "Types"): no schema library. The codec drops any axis whose value is outside its enum, per-axis, and falls through to the scenario default — it never throws at the reader. `initIntake` re-checks at its own boundary.

**Node-import-safe self-boot** (`pack-derived.mjs:279-280`, `peak.mjs:342-349`):

```js
if (typeof document !== "undefined") { hydrateFromSharedLink(); wireBeatBrand(); }
```

**Element builder, never `innerHTML` from data** (`peak.mjs:89-99`, `dock.mjs:39-49`): visitor-supplied strings reach the DOM only as `textContent`.

**Clipboard feedback** (`dock.mjs:276-300`, `handoff-viewer.mjs:250-265`):

```js
let copyTimer = null;
const done = (label) => {
  btn.textContent = label;
  copyTimer = setTimeout(() => { btn.textContent = "Copy the link"; copyTimer = null; }, 1600);
};
```

**Honest derived-brand copy** (`dock.mjs:99-102` — reuse the wording, do not invent new):

```js
const derivedNote = (label) =>
  label && label !== "your brand"
    ? "derived here, not " + label + "'s official design system"
    : "derived here, not an official design system";
```

`derivedNote` is **module-private in `dock.mjs`** and this plan forbids editing that file, so it cannot be imported. **Duplicate it verbatim in `close.mjs`** with a comment naming `dock.mjs:99-102` and `pack-derived.mjs:188-191` as the two sites it mirrors by hand. This is the same mirrored-copy trade `pack-derived.mjs:53-59` ↔ `pack-boot.js` already makes. Do **not** write new wording — AC #3 is a hard honesty contract, and three sites drifting apart is exactly how it breaks.

---

## IMPLEMENTATION PLAN

### Phase 0: Pre-flight — land the planning layer, then branch

**Blocking.** `docs/epics/portfolio-v3-experience.{prd,architecture}.md` and `.claude/skills/portfolio-design/` exist **only** on the local unpushed `feature/v3-approach-work` (commit `1078d43`). The epic's §6.4 craft bar requires build sessions run under the `portfolio-design` skill, and this ticket's acceptance cites it. An implementer branching off `origin/main` has neither.

**Tasks:**

- Push `1078d43` (the docs/planning-layer commit) to `main` first, then branch `feature/v3-close` off the updated `main`.
- Confirm `.claude/skills/portfolio-design/references/CRAFT.md` and `CHECKLIST.md` are present before writing any CSS.

### Phase 1: The codec (pure, testable, no consumers yet)

**Independent of:** every other phase — it has no imports and nothing imports it yet. Land and prove it standalone.

**Tasks:**

- Create `system/share-state.mjs` with the param contract, the mirrored axis enums, encode, decode, and `hasSharedBrand()`.
- Prove the round-trip and every rejection path with `node -e` assertions before wiring a single consumer.

### Phase 2: Arrival — hydrate the brand and seed the wizard

**Depends on:** Phase 1 (needs the decoder).

The receiving half. After this phase a hand-typed share URL already re-skins the site and re-briefs the wizard, with no UI to produce one yet — which makes it independently testable.

**Tasks:**

- `pack-derived.mjs`: add `hydrateFromSharedLink()`, called before `wireBeatBrand()` in the self-boot.
- `factory-intake.mjs`: add the additive `seedAnswers` config option with its own boundary validation.
- `intake-beat.mjs`: decode the URL and pass `seedAnswers` through.

### Phase 3: Departure — the close beat UI

**Depends on:** Phase 1 (encoder) and Phase 2 (so the produced link is provably round-trippable).

**Tasks:**

- `analytics.mjs`: add `trackFactoryShared()` (flagged as a scope decision — see Open Questions).
- `index.html`: extend the static close card (bundle download link + the JS mount point) and add the `close.mjs` script tag.
- Create `system/close.mjs`: register the beat, build the share row + derived-token takeaway, wire the shared-link arrival notice.
- `portfolio.css`: the `.close-*` share/takeaway organism styles, token-only.

### Phase 4: Regeneration, gates & manual validation

**Depends on:** Phases 1-3.

**Tasks:**

- Stage the two new modules, regenerate `loc-summary.json`, re-stage (order is load-bearing).
- Run the two blocking gates (`drift-check`, `token-lint`).
- Cross-engine functional check (Chromium + Firefox + WebKit) — the VR gate is Chromium-only and non-blocking on this branch.
- Regenerate the `index` and `approach` VR baselines.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### PUSH the planning layer, then CREATE the branch

- **IMPLEMENT**: Push commit `1078d43` (v3 epics, plans, `portfolio-design` skill) to `main`. Then `git fetch origin && git checkout -b feature/v3-close origin/main`.
- **PATTERN**: memory `shared-worktree-parallel-sessions` — verify the branch immediately before committing; stage by explicit path.
- **GOTCHA**: Do **not** branch off `feature/v3-approach-work`. It carries 11 unpushed merge commits that would pollute the PR diff and make the review dishonest about what changed.
- **VALIDATE**: `git log --oneline -1 && git status -sb && ls .claude/skills/portfolio-design/references/CRAFT.md docs/epics/portfolio-v3-experience.architecture.md`
- **SATISFIES**: AC #7 (craft bar §6.4 is auditable)

### CREATE `system/share-state.mjs`

- **IMPLEMENT**: The pure codec. Exports:
  - `SHARE_PARAMS = { brand: "brand", density: "density", reward: "reward", freq: "freq", name: "name" }`
  - `AXIS_ENUMS = { density: ["compact","comfortable","spacious"], rewardType: ["tribe","hunt","self"], frequency: ["multiple-daily","daily","weekly","monthly","rarely"] }` — with a comment naming `scenarios/validate.mjs:21-25` as the source of truth this mirrors by hand.
  - `NAME_MAX = 40` — mirrors `pack-derived.mjs:32` by hand (importing it would pull `derive.mjs` + a self-booting DOM module into a pure codec).
  - `encodeShareState({ brandColor, name, axes })` → a query string **without** the leading `?`. Drops `#` from the hex, lowercases it, omits any absent/invalid field, omits `name` when empty. Uses `URLSearchParams.toString()` — no hand-rolled escaping.
  - `decodeShareState(search)` → `{ brandColor: "#rrggbb" | null, name: string, axes: { density?, rewardType?, frequency? } }` or `null` when **no** known param is present. Per-axis drop on an out-of-enum value; `brandColor` null on a hex that fails `/^[0-9a-f]{6}$/i`; `name` trimmed and hard-capped to `NAME_MAX`.
  - `hasSharedBrand(search)` → boolean; true only when a **valid** brand hex is present.
- **PATTERN**: mirrored-predicate convention, `pack-derived.mjs:53-59`. Module header per CLAUDE.md.
- **IMPORTS**: none — this is the point.
- **GOTCHA**: `decodeShareState("")` must return `null`, not an empty object. The VR gate loads `/index.html` with no query string and every consumer branches on the null (memory `vr-gate-captures-no-preference`: a new at-rest behaviour that fires by default churns baselines and, worse here, would re-skin the VR capture).
- **GOTCHA**: accept the hex with or without a leading `#` on decode (a hand-shared link may carry `%23`), but **emit** without it — `#` in a query value is legal-but-confusing and the `#appearance` dock hash lives in the same URL.
- **VALIDATE**:
  ```bash
  node --check system/share-state.mjs && node -e "
  import('./system/share-state.mjs').then(m => {
    const a = (c, why) => { if (!c) { console.error('FAIL: ' + why); process.exit(1); } };
    const s = m.encodeShareState({ brandColor:'#2F7A4D', name:'Acme Ltd', axes:{ density:'compact', rewardType:'hunt', frequency:'weekly' }});
    const d = m.decodeShareState(s);
    a(d.brandColor === '#2f7a4d', 'hex round-trip');
    a(d.name === 'Acme Ltd', 'name round-trip');
    a(d.axes.density === 'compact' && d.axes.rewardType === 'hunt' && d.axes.frequency === 'weekly', 'axes round-trip');
    a(m.decodeShareState('') === null, 'empty search is null');
    a(m.decodeShareState('?utm_source=x') === null, 'unknown params only is null');
    a(m.decodeShareState('?brand=zzzzzz').brandColor === null, 'bad hex rejected');
    a(m.decodeShareState('?brand=2f7a4d&density=huge').axes.density === undefined, 'bad enum dropped per-axis');
    a(m.decodeShareState('?brand=2f7a4d&density=compact').axes.density === 'compact', 'valid axis survives a bad sibling');
    a(m.decodeShareState('?name=' + encodeURIComponent('x'.repeat(90))).name.length === 40, 'name capped');
    a(m.hasSharedBrand('?brand=2f7a4d') === true && m.hasSharedBrand('?density=compact') === false, 'hasSharedBrand');
    a(!m.encodeShareState({ brandColor:'#2f7a4d', name:'', axes:{} }).includes('name='), 'empty name omitted');
    console.log('share-state ✓ 11 assertions');
  })"
  ```
- **SATISFIES**: AC #2, AC #4

### ADD `hydrateFromSharedLink()` to `system/pack-derived.mjs`

- **IMPLEMENT**: Import `decodeShareState` from `./share-state.mjs`. Add a top-level function, placed immediately above the self-boot line:
  ```js
  // A shared link (#77) carries the sender's INPUTS, so the receiving browser re-derives the
  // palette with the real engine rather than trusting a colour set from a URL. Runs BEFORE
  // wireBeatBrand so the beat reflects the hydrated record, and before spine.mjs evaluates
  // (dock.mjs imports this module and its <script> precedes spine's) — so the hero's
  // isWearingDerived() guard (spine.mjs:32-34,137) sees the worn brand and skips its canned
  // re-skin instead of overwriting it and then stripping it on revert.
  function hydrateFromSharedLink() {
    const shared = decodeShareState(location.search);
    if (!shared?.brandColor) return;
    let rec;
    try { rec = buildRecord(shared.brandColor, shared.name); }
    catch (err) { console.error("pack-derived: shared link colour refused — committed pack retained", err); return; }
    applyToRoot(rec.tokens);
    writeRecord(rec);
    wear();
  }
  ```
  Have it **return the record** (or `null`), and change the self-boot to `if (typeof document !== "undefined") wireBeatBrand(hydrateFromSharedLink());`.
- **IMPLEMENT (honest arrival label — required for AC #3)**: `wireBeatBrand(sharedRec = null)` takes the hydrated record and uses a **variant label** on the shared-arrival path. The existing `appliedLabel()` (188-191) reads "**Your** colour is on the stage" — which is false when the colour came from someone else's link, and it is the label the recipient actually sees on arrival (the close card's note is below the fold, gated on `activateOn: "visible"`). Add beside it:
  ```js
  // A shared link (#77) puts the SENDER's colour on the stage. Saying "your colour" there would be
  // false, and this label is what a recipient sees on arrival — the close card's note is below the
  // fold. Same affiliation denial as appliedLabel; only the provenance clause changes.
  function sharedLabel(name) {
    const notOfficial = name ? `not ${name}'s official design system` : "not an official design system";
    return `This colour came from a shared link and was re-derived in this browser. It is a demo, ${notOfficial}.`;
  }
  ```
  In the load branch (211-220), when `sharedRec` is non-null use `setLabel(label, "shared", sharedLabel(...))` instead of the `"applied"` variant. Everything else in that branch is unchanged.
- **PATTERN**: `pack-derived.mjs:238-255` (the colour-change handler does the same build → apply → write → wear sequence); `pack-derived.mjs:186-195` for the label-copy shape; fail-closed logging mirrors `peak.mjs:225`.
- **IMPORTS**: `import { decodeShareState } from "./share-state.mjs";` beside the existing `derive` import.
- **GOTCHA**: `wear()` (148-158) backs up the pre-wear committed pack into `PREWEAR_KEY`, so the dock's **Reset to neutral** hands it back. Do not write the selector directly — that is the bug #74 shipped and #76 fixed.
- **GOTCHA**: `writeRecord` and `wear` each emit `BRAND_CHANGE_EVENT` (`pack-derived.mjs:44-47`). At hydration time `dock.mjs`'s listener is not yet attached (we are mid-import of its dependency) — that is fine and intended: `buildDock()` reads `groundTruth()` at build time (`dock.mjs:109`) and `derivedOnRoot()` (74-79) will already be true. Do **not** add a workaround for this.
- **GOTCHA**: hydration **overwrites** any existing derived record. That is correct — clicking a shared link is an explicit act — but it means the visitor's own earlier colour is replaced. Do not add a confirm dialog; the dock's reset is the out.
- **VALIDATE**: `node --check system/pack-derived.mjs && node -e "import('./system/pack-derived.mjs').then(()=>console.log('pack-derived imports clean under Node ✓'))"`
- **SATISFIES**: AC #2, AC #3, AC #5

### ADD `seedAnswers` to `initIntake` in `system/factory-intake.mjs`

- **IMPLEMENT**: Extend the signature at line 213 to `initIntake({ scenarios = SCENARIOS, defaultScenario = DEFAULT_SCENARIO, askedAxes = null, onAnswers = null, seedAnswers = null } = {})`. Change line 228 to merge a **validated** seed over the scenario defaults:
  ```js
  // seedAnswers (optional, #77): a host may seed a SUBSET of axes from outside — home passes the
  // values decoded from a shared link. Validated here at this boundary as well as in the codec
  // (project rule: validate at the boundary; the two checks mirror each other deliberately, like
  // applyToRoot/pack-boot.js). An axis absent from the scenario's defaults, or holding a value the
  // scenario does not define, is DROPPED — derive() must never see a value the ruleset lacks.
  let answers = { ...scenarios[active].defaults, ...validSeed(scenarios[active].defaults, seedAnswers) };
  ```
  Add a small module-scope helper `validSeed(defaults, seed)` returning `{}` for a null/non-object seed, and otherwise only those `[axis, value]` pairs where `axis in defaults`, `typeof value === "string"`, and `value !== ""`.
- **PATTERN**: the additive-config precedent set by `askedAxes` (#73) and `onAnswers` (#75) — documented at `factory-intake.mjs:206-212`. Extend that comment block with the `seedAnswers` line in the same voice.
- **GOTCHA**: `setScenario()` (285-297) re-seeds `answers` from the scenario defaults on a toggle. Leave it alone — a scenario toggle *should* clear a shared seed, and home is Verdant-only so no toggle renders there anyway.
- **GOTCHA**: do **not** seed `improvesLives`/`wouldUseIt`. Line 288's comment ("matrix booleans intentionally NOT seeded") is a deliberate honesty rule — the reader's ethics guess is never prefilled.
- **GOTCHA**: `validSeed` must gate on `axis in defaults`, not on a hard-coded axis list — the shell (`instance.mjs`) passes company-package scenarios with their own default sets.
- **VALIDATE**: `node --check system/factory-intake.mjs` then, in the browser, load `/index.html?brand=2f7a4d&density=compact&reward=hunt&freq=weekly` and confirm the three wizard radios read compact/hunt/weekly on first paint.
- **SATISFIES**: AC #2

### UPDATE `system/intake-beat.mjs` to pass the seed

- **IMPLEMENT**: Import `decodeShareState` from `./share-state.mjs`; inside the beat effect pass `seedAnswers: decodeShareState(location.search)?.axes || null` into `initIntake`. Extend the module header to name #77 as a second governing ticket.
- **PATTERN**: `intake-beat.mjs:34-43` — keep the config object flat and one-option-per-line.
- **GOTCHA**: decode independently here rather than importing state from `close.mjs` or `pack-derived.mjs`. `decodeShareState` is pure and idempotent, so two call sites cannot disagree — and threading shared mutable state between beats would recreate exactly the ordering fragility this design avoids.
- **VALIDATE**: `node --check system/intake-beat.mjs && node -e "import('./system/intake-beat.mjs').then(()=>console.log('intake-beat imports clean ✓'))"`
- **SATISFIES**: AC #2

### ADD `trackFactoryShared()` to `system/analytics.mjs`

- **IMPLEMENT**: Mirror `trackFactoryBuilt` (58-64) exactly: `const SHARED_EVENT_PATH = "/factory/shared";` a **separate** `sharedFired` guard, and the same pushState/replaceState pair. Header comment must state that this is #77 extending the epic's analytics call (the architecture doc names only `/factory/built`), and that it maps to the PRD §7 "Forwarded internally" metric.
- **PATTERN**: `analytics.mjs:51-64`.
- **GOTCHA**: a separate fire-once guard is mandatory — sharing `builtFired` would let whichever event fires first suppress the other (the comment at 55-57 says exactly this).
- **GOTCHA**: `trackFactoryShared` rewrites `location` for `RESTORE_DELAY_MS`. The share button must build its URL **before** calling it, or the copied link will be `/factory/shared`. Build first, copy, then track.
- **VALIDATE**: `node --check system/analytics.mjs`
- **SATISFIES**: AC #6

### UPDATE `index.html` — the static close card + the module tag

- **IMPLEMENT**: In the `#beat-close` region (269-287):
  - Add the bundle download beside the existing two links: `<a class="btn btn-secondary" href="/handoff/verdant/pack.bundle.json" download>Download the pack</a>`.
  - Add an empty JS mount after the CTA row: `<div class="close-extras" data-close-extras></div>`.
  - Update the region comment: `#77` is now implemented, not pending.
  - Reword `.close-card-line`'s surrounding copy only if needed to name what the takeaway *is* — the pack an engineer receives. **Never** "your pack".
  - Add `<script type="module" src="/system/close.mjs"></script>` after `peak.mjs` (line 363).
- **PATTERN**: `index.html:279-285` for the card, `handoff.html:153` for the download href.
- **GOTCHA**: the static card must remain a complete, honest close on its own — it is the no-JS floor **and** the ticket's documented circuit-breaker degradation ("handoff link + contact"). No dead JS-only affordance in static markup.
- **GOTCHA**: `close.mjs` imports `spine.mjs`, so placing its tag last is fine — but do **not** move it above `dock.mjs`. `dock.mjs` imports `pack-derived.mjs`, which is what makes hydration beat `spine.mjs`. Reordering the tags breaks the whole design.
- **VALIDATE**: `npx serve .` → load `/` with JS disabled; confirm three working links and no empty/dead controls.
- **SATISFIES**: AC #1, AC #8

### CREATE `system/close.mjs`

- **IMPLEMENT**: Beat 4. Structure:
  - Header comment citing epic #70 ticket #77, PRD §6.1 beat 4 + §8, and the honesty rule (the pack is Verdant's committed pack; the visitor's tokens are separate and labelled).
  - Imports: `registerBeat` from `./spine.mjs`; `encodeShareState` from `./share-state.mjs`; `readRecord`, `sanitizeName` from `./pack-derived.mjs`; `getHomeAnswers` from `./intake-beat.mjs`; `trackFactoryShared` from `./analytics.mjs`.
  - A local `el()` builder copied from `peak.mjs:89-99`.
  - `buildShareUrl()` — `location.origin + location.pathname + "?" + encodeShareState({ brandColor: readRecord()?.brandColor, name: readRecord()?.label, axes: getHomeAnswers() })`. When `encodeShareState` returns an empty string, return the bare page URL.
  - `closeEffect({ el: beatEl })`:
    1. Find `[data-close-extras]`; return if absent (unexpected markup → leave the static card).
    2. Build the share row: a "Copy the link" button + a `role="status" aria-live="polite"` node.
    3. On click: build the URL **first**, `navigator.clipboard?.writeText(url)` → `Copied ✓`, then `trackFactoryShared()`. On rejection **or** when `navigator.clipboard` is undefined (insecure origin), render a readonly `<input>` pre-filled with the URL, select it, and set the status to "Copy this link" — the control never dead-ends.
    4. When `readRecord()` returns a record: append a "Copy your derived tokens" button producing the same `:root { … }` block `dock.mjs:286-289` builds, plus a caption using `derivedNote(rec.label)` wording. Absent a record, append a single muted line saying the link carries the demo's own answers.
    5. When `hasSharedBrand(location.search)`: prepend a small note — "You opened a shared link. The colour and answers came from the link and were re-derived in this browser." — as `textContent`.
  - `registerBeat("beat-close", { effect: closeEffect, activateOn: "visible" })`.
- **PATTERN**: `peak.mjs` end-to-end (imports → constants → helpers → effect → register); `dock.mjs:276-300` for clipboard + the derived `:root` block; `peak.mjs:291-299` for the `role="status"` announce-before-fill idiom.
- **GOTCHA**: `activateOn: "visible"` — not `"load"`. The close is below the peak; `"load"` would fire `/factory/shared`-adjacent behaviour and build UI for readers who never arrive. (`spine.mjs:41-43`, `peak.mjs:343-348`.)
- **GOTCHA**: the visitor's company name reaches the DOM **only** via `textContent`, and only inside a sentence that denies affiliation (`dock.mjs:96-102`). Never in an attribute, never as a heading.
- **GOTCHA**: `getHomeAnswers()` returns `null` until the wizard has run once (`intake-beat.mjs:29`). `buildShareUrl` must tolerate null axes and still produce a brand-only link.
- **GOTCHA**: no CSS entrance animation on anything rebuilt per interaction — memory `entrance-anim-on-continuous-rebuild` (PR #55). The share row is built once, so a one-shot entrance is fine; the status node is not.
- **VALIDATE**: `node --check system/close.mjs && node -e "import('./system/close.mjs').then(()=>console.log('close imports clean under Node ✓'))"` — must not throw (registerBeat no-ops with no DOM, `spine.mjs:50`).
- **SATISFIES**: AC #1, AC #2, AC #3, AC #6

### ADD the `.close-*` styles to `system/portfolio.css`

- **IMPLEMENT**: Extend the I6 close-card block after line 1516: `.close-extras` (top border-hairline + `--spacing-xl` top margin/padding, only when populated — use `:empty { display: none }` so the no-JS card is unchanged), `.close-share-row` (flex, `--spacing-md` gap, wraps), `.close-share-status`, `.close-share-url` (readonly input fallback, `min-width: 0` per memory `vr-gate-single-engine-blindspot`), `.close-note` / `.close-shared-note` (muted, `--type-small`).
- **PATTERN**: `portfolio.css:1500-1516` — the existing `.close-card` block; token-only, no literals.
- **GOTCHA**: **no new tokens.** Everything needed exists (`--spacing-*`, `--color-border`, `--color-fg-muted`, `--type-small`, `--radius-*`, `--motion-fast`). A new token means the full regen chain (`gen-token-css` + `gen-handoff`) and `token-lint` rejects an orphan token that has no consumer — memory `token-change-regen-handoff-pack`. Avoid entirely.
- **GOTCHA**: any flex/grid child holding the URL string needs `min-width: 0`, or a long URL blows the layout out in Safari/Chrome-stable while the bundled Chromium looks fine (memory `vr-gate-single-engine-blindspot`, PR #54).
- **VALIDATE**: `node tooling/token-lint.mjs`
- **SATISFIES**: AC #7

### REGENERATE `system/loc-summary.json` (staging order is load-bearing)

- **IMPLEMENT**: In this exact order:
  ```bash
  git add system/share-state.mjs system/close.mjs system/pack-derived.mjs system/intake-beat.mjs \
          system/factory-intake.mjs system/analytics.mjs system/portfolio.css index.html
  node agent-layer/gen-loc-summary.mjs
  git add system/loc-summary.json
  ```
- **PATTERN**: `agent-layer/gen-loc-summary.mjs:44` — counts come from `git show :<path>` (the **index**), not the working tree.
- **GOTCHA**: running the generator before staging produces a **false** "no drift" that the blocking CI `drift-check` then catches (memory `loc-summary-counts-tracked-only`). The two new `system/*.mjs` files land in the `runtime` group (regex at line 23), whose file count and rounded line count `approach.html` renders — so this also invalidates the approach baselines (memory `loc-summary-baseline-cascade`).
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check`
- **SATISFIES**: AC #9

### RUN the two blocking gates

- **IMPLEMENT**: `node tooling/drift-check.mjs` then `node tooling/token-lint.mjs`.
- **GOTCHA**: `drift-check` needs `tooling/style-dictionary/node_modules` (it child-process-invokes Style Dictionary via `gen-handoff`). Run `npm ci` in that directory first on a fresh worktree (memory `local-agent-visual-gate-notes`).
- **GOTCHA**: run these on a **clean** tree with the merge (if any) completed — a mid-merge run misreads staged merge changes as drift (memory `drift-check-mid-merge-false-positive`).
- **GOTCHA**: `drift-check` also regenerates `system/annotated-source.json` from `agent-layer/annotated-source.spec.json`, whose extracts may pin **line ranges inside `factory-intake.mjs`, `pack-derived.mjs`, or `analytics.mjs`** — all files this ticket edits. If it flags, regenerate (`node agent-layer/gen-annotated-source.mjs`) and re-stage. Never hand-edit the artifact, and do not read the flag as a regression. If a spec extract's anchor genuinely moved, fix the range in `annotated-source.spec.json`, not the JSON.
- **VALIDATE**: both exit 0.
- **SATISFIES**: AC #9

### VERIFY across engines (Chromium · Firefox · WebKit)

- **IMPLEMENT**: Serve the repo (`python3 -m http.server 4757` — it serves `.mjs` as `text/javascript`) and drive all three engines with the locally installed Playwright (`require.resolve` at `~/node_modules`, `pw.default.chromium|firefox|webkit`). Per engine, assert:
  1. Bare `/index.html` — console clean; `#beat-hero[data-spine="ready"]`; the hero's canned re-skin **still runs** (no share params ⇒ decode returns null ⇒ nothing changed). Wait ~3s before reading settled colours (memory `hero-reskin-screenshot-trap`).
  2. `/index.html?brand=b5322f&density=compact&reward=hunt&freq=weekly&name=Acme%20Ltd` — `getComputedStyle(document.documentElement).getPropertyValue('--color-accent')` is non-empty and not neutral's blue; the hero does **not** flash the canned green; the three wizard radios read compact/hunt/weekly; the dock (`#appearance`) offers "your brand" checked with the "not Acme Ltd's official design system" note; the close card shows the shared-link note.
  3. Scroll to `#beat-close`, click "Copy the link", read back `navigator.clipboard.readText()` (grant `clipboard-read`/`clipboard-write` in Chromium; on WebKit/Firefox assert the button reaches its `Copied ✓`/fallback state instead) and confirm `decodeShareState` of that URL round-trips to the same inputs.
  4. `prefers-reduced-motion: reduce` — the shared brand still applies (it is not motion), and no entrance animation runs.
- **PATTERN**: memory `cross-engine-motion-verify`; memory `headless-render-data-pages-worker-refused` (only home renders truly 0-error — that is the page under test here, so 0 errors is the bar).
- **GOTCHA**: clipboard needs a secure context. `127.0.0.1` counts as secure — use it, not a LAN IP.
- **VALIDATE**: all four checks pass in all three engines; paste the console output into the PR body.
- **SATISFIES**: AC #2, AC #3, AC #5, AC #7

### REGENERATE the VR baselines

- **IMPLEMENT**: `cd tooling/visual-regression && npm ci && npm run update:docker`. Expect `index-*` (the JS-built close extras are now part of the at-rest state) and `approach-*` (the loc-summary numbers moved) to change.
- **PATTERN**: memory `visual-regression-baseline-trap` — regen in the same PR as the layout change.
- **GOTCHA**: the VR job is **non-blocking** on `feature/v3-*` (`verify.yml:48`, memory `v3-vr-freeze-live`), so the run can be green while the check shows red and the PR reads `UNSTABLE`. Regenerate anyway — #82 should inherit clean baselines, not a backlog.
- **GOTCHA**: if a baseline's only change is sub-perceptual, `update:docker` will not rewrite it; `rm` the PNG to force it (memory `vr-update-skips-subperceptual`).
- **GOTCHA**: an `approach` "two consecutive stable screenshots" failure is the live countUp rAF flake, not a regression (memory `vr-gate-approach-countup-flake`).
- **VALIDATE**: `git status --short tooling/visual-regression/baselines/` shows only the expected files; `npx playwright test` passes locally in Docker.
- **SATISFIES**: AC #9

---

## TESTING STRATEGY

This repo has **no test suite, no linter, no type-check** (CLAUDE.md: "don't hunt for or invent one"). "Done" = run the surface you touched. The testing strategy is therefore three concrete layers:

### Unit Tests

`system/share-state.mjs` is deliberately pure so it *can* be exercised without a browser. The `node -e` assertion block in its task is the unit test — 11 assertions covering round-trip, null-on-empty, bad hex, per-axis enum drop, name cap, and `hasSharedBrand`. Re-run it after any codec edit. `node --check` on every touched `.mjs` is the syntax layer, and `drift-check` runs the same check across every tracked `.mjs` in CI.

### Integration Tests

The cross-engine Playwright drive (its own task) is the integration layer: real modules, real engine, real storage, three browsers. It covers the two arrival paths (bare URL vs shared URL), the departure path (encode → clipboard → decode), and the reduced-motion variant.

### Edge Cases

- **No query string** — decode returns `null`; every consumer is a strict no-op. *(This is the VR-critical case.)*
- **Unknown params only** (`?utm_source=…`) — treated as no shared state.
- **Malformed hex** (`?brand=zzz`) — brand dropped, axes still honoured, no throw, no error UI.
- **One bad axis among three** — that axis falls back to the scenario default; the other two apply.
- **Name at 41+ chars / with markup** — capped at 40 and rendered as `textContent`; never becomes markup.
- **`localStorage` blocked (private mode)** — `applyToRoot` still re-skins home; `writeRecord`/`wear` no-op silently; the brand does not follow to other pages. Documented degradation, not a bug (`pack-derived.mjs:118-132` already swallows).
- **`navigator.clipboard` undefined (insecure origin)** — the readonly-input fallback; the control still hands over a link.
- **Wizard never touched** — `getHomeAnswers()` is `null`; the link carries brand only and still round-trips.
- **No derived brand at all** — the share link carries just the axes; the close card shows the muted "the demo's own answers" line instead of the derived-token copy button.
- **Shared link opened while already wearing a different derived brand** — the shared record wins; the dock's Reset restores the pre-wear pack.
- **Reduced motion** — brand and answers apply (they are state, not motion); no entrance runs.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
node --check system/share-state.mjs
node --check system/close.mjs
node --check system/pack-derived.mjs
node --check system/intake-beat.mjs
node --check system/factory-intake.mjs
node --check system/analytics.mjs
node tooling/token-lint.mjs
```

### Level 2: Unit Tests

```bash
# the 11-assertion codec block from the share-state task
node -e "import('./system/share-state.mjs').then(m => { /* … see task … */ })"

# every touched module imports cleanly with no DOM (Node-import-safety contract)
node -e "Promise.all(['share-state','close','pack-derived','intake-beat','factory-intake','analytics']
  .map(n => import('./system/' + n + '.mjs'))).then(() => console.log('all modules import clean under Node ✓'))"
```

### Level 3: Integration Tests

```bash
cd tooling/style-dictionary && npm ci && cd ../..
node tooling/drift-check.mjs
node agent-layer/gen-loc-summary.mjs --check
cd tooling/visual-regression && npm ci && npx playwright test
```

### Level 4: Manual Validation

```bash
python3 -m http.server 4757    # serves .mjs as text/javascript
```

1. `http://127.0.0.1:4757/index.html` — hero re-skins to green and reverts; console clean; close card has three links and JS extras.
2. Enter a colour in `#beat-brand`, answer the wizard, scroll to `#beat-close`, click **Copy the link**.
3. Open that link in a **fresh private window** — the site wears the colour, the wizard shows the same three answers, the peak assembles under them, `#beat-brand`'s label reads the **shared-arrival** variant ("This colour came from a shared link…", not "Your colour…"), the close card's shared-link note is present, and the dock offers "your brand".
   - **Not a bug:** opening and closing the appearance panel strips the query string from the URL bar. `dock.mjs:321`'s `stripHash()` does `pushState(null, "", location.pathname)`, which drops `location.search` by design. State already lives in storage and the close card rebuilds the link from storage + wizard, so nothing is lost — but it looks like the codec dropped the params, and it will be reported as a codec bug if not expected.
4. Disable JavaScript, reload `/` — the close card is a complete, honest close: handoff pack link, download, contact. No dead controls.
5. DevTools → Rendering → emulate `prefers-reduced-motion: reduce`; reload the shared link — brand and answers still apply, no entrances.

### Level 5: Additional Validation (Optional)

- `/code-review` on the working diff before opening the PR.
- Chrome DevTools MCP (`web-perf` skill) on `/index.html?brand=…` to confirm the arrival re-skin costs no layout-shift regression against a bare load.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — The close card offers a working takeaway (handoff-pack viewer link + bundle download) and the contact CTA. *(ticket acceptance 1)*
- [ ] **AC #2** — A shareable URL round-trips: opening it re-applies the sender's answers **and** derived brand, with the wizard, `:root`, and the peak all reflecting them. *(ticket acceptance 2)*
- [ ] **AC #3** — Honesty: shared state is labelled derived/speculative using the existing `derivedNote()` wording; no affiliation claim anywhere; the handoff pack is never described as generated for the visitor. *(ticket acceptance 3)*
- [ ] **AC #4** — The URL is bounded to colour + name label + the three axes. No free text, no encoded token set, no upload. *(PRD §8 non-goal)*
- [ ] **AC #5** — Nothing fails on stage: a bad hex, a bad axis, blocked storage, or an absent clipboard each degrade to the committed neutral state or a working fallback, never an error surface. *(architecture boundary)*
- [ ] **AC #6** — Documented degradation: with JS off (or the circuit breaker tripped) the close is handoff link + contact, and this is stated in the module header. *(ticket scope clause)*
- [ ] **AC #7** — Craft bar §6.4: custom interaction, reasoned motion, real accessibility (the share status is a live region; the fallback input is labelled and focusable), verified in Chromium + Firefox + WebKit.
- [ ] **AC #8** — `rest == final`: the at-rest state after the beat activates is what VR captures; nothing animates indefinitely.
- [ ] **AC #9** — `drift-check` and `token-lint` pass; `loc-summary.json` regenerated after staging; `index` + `approach` VR baselines regenerated in this PR.
- [ ] **AC #10** — No regressions: the bare `/index.html` path is byte-identical in behaviour (hero canned re-skin still runs, decode is a no-op).

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Codec unit assertions pass (11/11)
- [ ] `drift-check` + `token-lint` green
- [ ] Cross-engine manual pass (Chromium · Firefox · WebKit) recorded in the PR body
- [ ] `loc-summary.json` + VR baselines regenerated and staged
- [ ] Acceptance criteria all met
- [ ] `.claude/skills/portfolio-design/references/CHECKLIST.md` run before commit
- [ ] PR opened with `Closes #77`

---

## OPEN QUESTIONS / ASSUMPTIONS

**Flag before execution:**

1. **`/factory/shared` is a scope decision, not an inherited one.** The architecture doc (line 25) names **only** `/factory/built` as the added virtual route. A third route maps cleanly to the PRD §7 "Forwarded internally" metric and reuses the identical fail-closed pattern, so this plan implements it — but it is #77 extending the epic's analytics call, not executing it. **Recommendation: keep it.** If the owner objects, delete `trackFactoryShared` and its single call site; nothing else depends on it.
2. **Auto-wearing on arrival.** A shared link calls `wear()`, so the brand follows the recipient to every page and **overwrites** any derived record they already had. This is the reading of "re-hydrates the demo" that makes the link worth forwarding, and `wear()`'s `PREWEAR_KEY` backup plus the dock's Reset make it reversible. Flagged because it writes to a visitor's storage as a side effect of a click.

**Assumptions:**

3. **Shared state does not apply pre-paint.** Structurally forced — see NOTES. A recipient sees one frame of the committed pack before the modules re-skin. This is the "documented graceful degradation" the ticket's acceptance clause allows for.
4. **The epic open question "whether the derived record also persists the visitor's intake answers" stays open.** This ticket carries answers in the **URL** only; localStorage persistence of answers is not added. If the owner wants resume-where-you-were, that is a separate, larger call about storing behavioural answers.
5. **`work.html`/`factory.html` gain no share affordance.** The share link is a home-spine artifact; the ticket scopes it to beat 4.
6. **Phase 0 is assumed doable** — that the docs commit is safe to push to `main`. If it is not, the fallback is branching off `feature/v3-approach-work`, at the cost of a noisier PR diff.

---

## NOTES (open canvas)

### Why the shared brand cannot apply pre-paint

`system/pack-boot.js` is the only pre-paint hook, and it is a **classic parser-blocking script** — deliberately, so it can swap the pack line before first paint without a module's deferred execution. A classic script cannot `import` `derive.mjs`. A shared link carries the sender's *inputs* (a hex), so the recipient's palette must be **derived** before it can be applied — which cannot happen pre-paint.

The alternative would be encoding the ~20 derived colour tokens in the URL, which `pack-boot.js` could apply directly under the hard allowlist it already has (`KEY`/`HEX` regexes). Rejected on three grounds:

| | Encode inputs (chosen) | Encode derived tokens |
| --- | --- | --- |
| URL length | ~90 chars | ~600+ chars |
| Thesis | inputs → engine → outputs, performed on the share mechanism | ships outputs, inverting the platform's whole claim |
| Trust | recipient's own engine computes the palette | recipient trusts a colour set from a stranger's URL |
| Pre-paint | one frame of neutral | no flash |

Losing the pre-paint frame is the cheapest of those costs, and the ticket's acceptance explicitly permits documented degradation. Spike 2's decision rule ("imperceptible flash or fall back to stage-only application") is satisfied by falling back to stage-only, which is what this is.

### Why no `spine.mjs` change is needed (the ordering proof)

The obvious design — a `close.mjs` that decodes the URL and applies the brand — **fails**, and it fails silently in a way that looks fine locally:

1. `close.mjs` statically imports `registerBeat` from `spine.mjs`.
2. ESM evaluates depth-first: `spine.mjs`'s body runs to completion **before** `close.mjs`'s body starts.
3. `spine.mjs:193` calls `registerBeat("beat-hero", { activateOn: "load" })`, and `registerBeat` calls `activate(beat)` **synchronously** at line 56.
4. `heroBeat` checks `if (reduce || isWearingDerived()) return;` at line 137 — **before its first `await`**. So the guard is evaluated during `spine.mjs`'s module body.
5. Storage is empty at that instant ⇒ the guard is false ⇒ the hero proceeds, applies the canned `#2f7a4d` over the shared brand ~120ms later, holds 1200ms, then `removeProperty()`s **the same `--color-*` keys** — stripping the shared brand entirely (memory `derived-pack-inline-vs-stylesheet`).

Putting the hydration in `pack-derived.mjs` inverts the order for free:

- `index.html` loads `dock.mjs` (line 359) **before** `spine.mjs` (line 360).
- `dock.mjs:23-26` statically imports `pack-derived.mjs`.
- ⇒ `pack-derived.mjs`'s body — including the new `hydrateFromSharedLink()` — evaluates **before** `spine.mjs`'s body.
- ⇒ `wear()` has written `factory-pack = "derived"`, so `isWearingDerived()` returns **true** and the hero skips its canned re-skin, exactly as #72 designed it to for a worn brand.

Three further things fall out with no extra code: `wireBeatBrand()` (same module, called immediately after) reflects the hydrated record because its load branch already tests `readRecord() && selectorIsDerived()`; `dock.mjs`'s `groundTruth()` (91-94) reads `derivedOnRoot()` at build time and shows "your brand" checked; and `peak.mjs`'s `readInputs()` (107-111) already prefers `readRecord()?.brandColor`.

**Do not reorder the `<script type="module">` tags in `index.html`.** The whole design rests on `dock.mjs` preceding `spine.mjs`.

**And if a future ticket breaks that anyway, the failure is graceful — not silent.** `wireBeatBrand()` runs immediately after the hydration and, seeing `readRecord() && selectorIsDerived()`, sets `current = rec.tokens` and arms the existing `data-spine` MutationObserver (`pack-derived.mjs:227-235`) that re-applies the colour set the moment the hero's revert lands. So if hydration ever slips *after* `spine.mjs` — because someone drops dock's import or moves a script tag — the shared brand degrades to a ~1.2s canned-green flash and then self-heals. The ordering is what makes it clean; the observer is what makes it safe.

### Why the codec is its own module

`share-state.mjs` has no imports on purpose. Three payoffs: (1) it is the only part of this ticket that can be genuinely unit-tested, and this repo has no test runner — `node -e` over a pure module is the closest thing available; (2) `pack-derived.mjs` and `intake-beat.mjs` can both import it without either importing the other or a cycle forming; (3) importing it costs nothing at any point in the graph, so if a later ticket (#81, the private-instance spine) wants shared links it just imports the codec.

The duplicated axis enums are a deliberate mirrored-predicate, the same trade `pack-derived.mjs:53-59` and `pack-boot.js` already make: a shipped page cannot import `scenarios/validate.mjs` (a Node validator), so the enums are copied with a comment naming the source of truth. `initIntake`'s `validSeed` then re-checks against the *scenario's own* defaults, which is the stronger check — it is what actually protects `derive()`.

### Readable params over an opaque blob

`?brand=2f7a4d&density=compact&reward=hunt&freq=weekly&name=Acme%20Ltd` rather than `?s=eyJ2IjoxLCJi…`. A base64 blob is shorter and tamper-obscuring; readable params are self-documenting, which is what this site is about — a recipient can see exactly what was shared before clicking, and a reviewer can construct test URLs by hand. There is nothing secret in the payload and nothing to protect from tampering (every value is re-validated on arrival), so obscurity buys nothing. `URLSearchParams` handles all escaping; hand-rolling a codec would be the only place a real bug could hide.

### Sequencing risk

Phases 1 and 2 are independently testable without any UI: after Phase 2, a hand-typed URL already re-skins the site and re-briefs the wizard. If the appetite tightens, that is the shippable core — the ticket's "handoff link + contact" degradation is already the static markup, so Phase 3 can be cut to just the download link plus the static card and the beat still closes honestly. Phase 4 is not optional: `drift-check` blocks `main`.

## AMENDMENTS

<!-- Append-only; newest at the bottom. Leave empty at creation. -->
