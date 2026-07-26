# Feature: restore the colour a shared link displaced

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Opening a v3 share link (`/index.html?brand=…&name=…&density=…`) re-derives the sender's brand in the
recipient's browser and makes the whole site wear it. That write is destructive for one specific
visitor: someone who had already entered **their own** colour in `#beat-brand`. Their derived record is
overwritten and no backup is taken, so the appearance dock's **Reset to neutral** drops them to the
neutral pack instead of handing their colour back.

This ticket preserves the displaced record under a second storage key and gives the appearance dock a
**Restore the colour you entered** control that hands it back, plus one clause on the shared-link
arrival notice so the path is discoverable rather than buried in a closed disclosure.

## User Story

As a visitor who has already put my own brand colour into the demo
I want a shared link from a colleague not to destroy that colour
So that I can look at what they sent me and then get my own product's palette back

## Problem Statement

`hydrateFromSharedLink()` (`system/pack-derived.mjs:382-410`) calls `writeRecord(rec)` then `wear()`.

- `writeRecord` overwrites `factory-pack-derived` — and it **has to**: wearing across pages means
  writing the one record `system/pack-boot.js` reads pre-paint on every other page.
- `wear()` (`pack-derived.mjs:171-181`) writes its `PREWEAR_KEY` backup only on the
  `prev !== "derived"` transition, and a visitor wearing their own brand already has
  `factory-pack = "derived"`. So no backup is taken.

Measured in Chromium during #77 (`.claude/reports/v3-investment-close-report.md:196-208`):

| pre-wear selector | after arrival | after the dock's Reset to neutral |
| --- | --- | --- |
| `saulera` (committed) | shared brand `#b5322f` worn, `PREWEAR_KEY=saulera` | saulera handed back (`#F59E0B`) — reversible |
| `derived` (their own colour) | shared brand `#b5322f` worn, no `PREWEAR_KEY` | drops to neutral (`#2563eb`) — their colour is gone |

The owner's call on #77 was **accept and document**; the restore affordance belongs to #76's dock,
which #77 was forbidden to touch. This ticket is that follow-up.

Two secondary defects fall out of the same wiring and are in scope because the fix reaches them:

1. **The beat label will lie after a restore.** `wireBeatBrand`'s `fromSharedLink` is a closure-local
   flag (`pack-derived.mjs:252`) cleared **only** in the colour-input handler
   (`pack-derived.mjs:326`). A dock-driven restore fires `PACK_CHANGE_EVENT` → `syncFromRoot()`
   → `sharedLabel(...)`, so the beat would still say "This colour came from a shared link" about the
   visitor's own restored colour. That is the #103 class of bug (dock and beat disagreeing about
   ground truth), reachable through wiring that already exists.
2. **A sender's name lingers in the beat.** `syncFromRoot` sets `nameInput.value` only when
   `rec.label !== "your brand"` (`pack-derived.mjs:271`) and never clears it, so restoring an unnamed
   record leaves the sender's company name in the input.

## Solution Statement

Four moves, all view-time, no new dependencies:

1. **Record provenance.** `buildRecord()` gains an optional `origin` — set to `"shared"` only on the
   hydration path, absent otherwise. Both validators (`readRecord`, `pack-boot.js:31`) check
   `v` / `source` / `tokens` and ignore unknown fields, so the field is invisible to every existing
   consumer and an already-stored record without it reads as the visitor's own. Verified: the token
   key set `derive()` emits is a fixed object literal (`system/derive.mjs:144-169`), so records are
   interchangeable key-for-key and `clearRoot(A.tokens)` removes B's values.
2. **Preserve, once, only what is the visitor's.** Before hydration overwrites the record, copy it to
   `factory-pack-derived-prewear` — but only when the outgoing record is **not** itself
   link-hydrated. That single condition is correct in every ordering, including link A → link B (the
   second link must not offer the first sender's colour as "the colour you entered").
3. **Hand it back from the dock.** A `.dock-restore-row` above the existing actions, shown only while
   a displaced record exists: one note line plus a **Restore the colour you entered** ghost button.
   Clicking it promotes the preserved record back to `factory-pack-derived`, spends the backup, and
   routes the re-skin through the dock's existing `selectPack(DERIVED_ID)` — the one transition that
   owns clear-first, neutral-base and the view-transition wrapper (#102).
4. **Make the path findable.** One extra clause on `close.mjs`'s shared-link arrival notice, gated on
   a displaced record existing **and** the dock actually being rendered (it is `display:none` below
   1100px — `portfolio.css:1046-1048`), so the copy never promises a control the reader cannot reach.

The beat's provenance flag is replaced by reading `rec.origin` in `syncFromRoot`, which fixes defect 1
by construction (the restored record has no `origin`, so the label falls back to `appliedLabel`) and
removes a duplicated piece of state rather than adding a second one.

## Out of Scope / Non-Goals

- **Not included: a restore affordance below 1100px.** The appearance dock itself is hidden there
  (`portfolio.css:1046-1048`) — that is #76's decision, inherited, not re-decided here. So on a phone
  or tablet this ticket preserves the record but exposes no way to restore it. `index.html:181-184`
  already sets the precedent of naming that width honestly. A mobile restore would need a second
  control inside `#beat-brand`; raise it as a separate ticket if the owner wants it. **Flagged in
  Open Questions — it is the one place this fix is partial.**
- **Not included: a confirm dialog on arrival.** #77's plan ruled it out ("clicking a shared link is
  an explicit act") and this ticket does not reopen that.
- **Not included: changing what Reset to neutral means.** It keeps meaning neutral. Restore is a
  separate control, per the issue.
- **Not changing: `PREWEAR_KEY` (`factory-pack-prewear`).** That is #76's committed-pack backup and
  its contract is untouched. The new key is a second, independent one.
- **Not changing: `system/pack-boot.js`.** The preserved record is never applied pre-paint, so the
  pre-paint no-op default (VR-critical) stays exactly as it is.
- **Not changing: the share-link codec** (`system/share-state.mjs`). Nothing new goes in the URL.
- **Not included: a "forget my brand" affordance.** `clearRecord()` remains the unused seam it is
  today (`pack-derived.mjs:156-162`).

## Feature Metadata

**Feature Type**: Bug Fix (with a new affordance)
**Estimated Complexity**: Medium — the logic is small; the correctness lives in event ordering,
provenance, and three regenerated artifacts.
**Primary Systems Affected**: `system/pack-derived.mjs` (record contract + beat), `system/dock.mjs`
(appearance control), `system/close.mjs` (arrival notice), `system/portfolio.css`
**Dependencies**: none — shipped pages are vanilla, no framework, no bundler (CLAUDE.md hard constraint)

## Related Work

**Implements**: [#108](https://github.com/linardsb/ux-factory/issues/108) — the PR body MUST carry
`Closes #108` as a trailer (CLAUDE.md git rule; a title mentioning `(#108)` closes nothing).
**Epic**: [#70 — portfolio v3](https://github.com/linardsb/ux-factory/issues/70), PRD §6.1 beat 2 /
beat 4 + D5b. `docs/epics/portfolio-v3-experience.prd.md` / `.architecture.md`.

**Back-references**:

- `.claude/plans/v3-your-brand-input-derived-pack-persistence.md` (#74) — Why: owns the derived record
  contract, `wear`/`unwear`, and `#beat-brand`. This ticket extends that contract with one field and
  one sibling key.
- `.claude/plans/v3-redesigned-pack-control.md` (#76) — Why: owns `dock.mjs`, `selectPack`'s three
  rules, and `PREWEAR_KEY`. The restore control is added to that surface and must reuse `selectPack`,
  never re-implement the transition.
- `.claude/plans/v3-investment-close.md` (#77) — Why: introduced `hydrateFromSharedLink`, `close.mjs`,
  and the measured table this ticket fixes. Its report records the owner's "accept and document" call.

**Forward-references**:

- (none yet — a mobile restore affordance would be the natural follow-up; see Open Questions)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/pack-derived.mjs` (all 413 lines) - Why: the file you change most. Key contract block at
  23-33, validators at 141-162, `wear`/`unwear` at 171-196, `wireBeatBrand` at 231-366 (provenance at
  252, `syncFromRoot` at 260-284, colour handler at 310-328), `hydrateFromSharedLink` at 382-410.
- `system/dock.mjs` (lines 25-28 imports, 101-113 `buildDock` head, 133-162 `renderPacks`/`syncChecked`,
  164-241 `selectPack`, 252-282 buttons + panel + listeners) - Why: the surface the restore control is
  added to; `selfEmit` (line 105) and `selectPack` are the two mechanisms you must reuse.
- `system/pack-boot.js` (lines 24-38) - Why: the pre-paint validator. Confirms an extra record field is
  ignored and that this ticket does not need to touch it. Its no-op default is VR-critical.
- `system/close.mjs` (lines 26-42 module-eval capture, 101-113 the arrival notice) - Why: where the
  discoverability clause goes; `ARRIVED_SHARED` is captured at module evaluation on purpose.
- `system/share-state.mjs` (lines 65-99) - Why: the decode contract and the "null is the load-bearing
  case" rule. Read it so you do not add a param; nothing changes here.
- `system/derive.mjs` (lines 144-169) - Why: proves the emitted colour-token key set is a fixed literal,
  which is what makes two records interchangeable for `clearRoot`.
- `system/portfolio.css` (lines 917-999 dock panel + actions, 1046-1048 the `max-width: 1099px` hide,
  1566-1567 the `.btn-ghost` 44px precedent) - Why: the styles you extend and the two rules that
  constrain the copy.
- `index.html` (lines 141-200 `#beat-brand` + the `#beat-wear` interstitial, 374-382 the module tags
  and the comment explaining why `dock.mjs`'s tag ordering makes hydration run first) - Why: the
  load-bearing script order, and the repo's precedent for naming the 1100px width honestly.
- `.claude/reports/v3-investment-close-report.md` (lines 190-215) - Why: the measured table that is
  this ticket's acceptance baseline, and the owner decision that created it.
- `agent-layer/gen-loc-summary.mjs` (lines 20-50) - Why: the group regex and the "read the git index,
  not the working tree" rule that makes `--check` before `git add` a false negative.
- `tooling/visual-regression/visual.spec.mjs` (lines 30-75) - Why: the page list, the hermetic route
  gate, and the neutral/saulera pack swap. Confirms the dock panel is never captured open.
- `.claude/skills/portfolio-design/references/CHECKLIST.md` - Why: run it before committing (house
  frontend skill; focus, target size, colour-independent state).

### New Files to Create

- `<scratchpad>/verify-108.mjs` — the headless verification drive. **Not committed** (there is no test
  suite in this repo; CLAUDE.md: "Done" = run the surface you touched). Put it in the session
  scratchpad directory.

No new committed source files. **This matters:** adding a tracked file to `system/` would change the
`files` count in `loc-summary.json` on top of the line count — keep the change to existing files.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [MDN — `Document.startViewTransition`](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition)
  - Specific section: `updateCallbackDone` vs `finished`
  - Why: `selectPack` resolves `settled` on `updateCallbackDone`; the restore path rides it and must
    not assume the crossfade has finished before `PACK_CHANGE_EVENT` fires.
- [MDN — `Window.getComputedStyle`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle)
  - Specific section: resolved values for `display`
  - Why: the arrival-notice clause asks the CSS whether the dock is actually rendered rather than
    duplicating the 1100px breakpoint in JS. `offsetParent` is **wrong** here — `.dock` is
    `position: fixed`, so `offsetParent` is null regardless of visibility.
- [MDN — `HTMLElement.hidden`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/hidden)
  - Why: the restore row is toggled by the property, matching the repo's attribute-free toggling.
- [WAI-ARIA APG — Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
  - Why: the dock panel is a non-modal disclosure; a control that removes itself must hand focus on,
    not drop it to `<body>`.

### Patterns to Follow

**Storage access is always `try/catch` with a comment naming private mode** (`pack-derived.mjs:141-162`):

```js
export function readRecord() {
  let raw;
  try { raw = localStorage.getItem(RECORD_KEY); } catch { return null; }
  ...
}
export function writeRecord(rec) {
  try { localStorage.setItem(RECORD_KEY, JSON.stringify(rec)); } catch { /* private mode — session-only */ }
  emitBrandChange();
}
```

**Same-tab change signalling** (`pack-derived.mjs:41-60`): `storage` events do not fire in the writing
tab, so every mutation announces itself on `BRAND_CHANGE_EVENT` and the dock's listener
(`dock.mjs:279-282`) REFLECTS state — it never re-applies. `selfEmit` (`dock.mjs:105`, used around
`wear()` at 227-230) is the existing way to suppress the dock's own recompute when it is the writer.
**Use it.**

**The dock builds DOM with `el()`, text via `textContent`, never `innerHTML`** (`dock.mjs:41-51`):

```js
const resetBtn = el("button", { type: "button", class: "btn btn-ghost dock-reset", text: "Reset to neutral" });
```

**Every mutation of `:root` + the pack line goes through `selectPack`** (`dock.mjs:164-241`) — its
three rules (clearRoot first · "your brand" always on the NEUTRAL base · everything inside the
view-transition callback) are why #102 exists. A new control **asks** `selectPack`; it does not
re-implement the transition.

**Feature files open with a header citing their governing doc** (CLAUDE.md). You are editing existing
files, so extend their headers where the contract changes — the key-contract block at
`pack-derived.mjs:23-33` gains the new key with the same comment grammar as its three siblings.

**Honesty copy is a contract, not styling.** `derivedNote` is duplicated verbatim in three places
(`dock.mjs:94-97`, `close.mjs:62-65`, mirroring `pack-derived.mjs:211-221`) with comments saying none
may be reworded alone. Do not touch it. New copy follows the same rules: plain words, active voice,
no em dashes, a visitor name only ever as capped `textContent` inside a sentence that denies the
affiliation.

**Mirrored constants get a comment naming both sites** (`pack-derived.mjs:66-72` ↔ `pack-boot.js:32`;
`share-state.mjs:25-34` ↔ `scenarios/validate.mjs`). This ticket adds none — the arrival-notice gate
reads computed style instead of copying the breakpoint, deliberately.

---

## IMPLEMENTATION PLAN

### Phase 1: The record contract

Teach the record where it came from, and add the preserved-record key with the same read/write/clear
grammar the existing record has. Nothing observable changes yet.

**Tasks:**

- Add `PREWEAR_RECORD_KEY` to the contract block and document it beside its three siblings.
- Factor the record validator so both keys share one implementation.
- Add `origin` to `buildRecord`, set only on the hydration path.
- Add `readDisplacedRecord` / `clearDisplacedRecord` / `restoreDisplacedRecord`.

### Phase 2: Preserve on arrival + stop the beat lying

**Depends on:** Phase 1.

Wire hydration to preserve, switch the beat's provenance to the record, and clear the backup when the
visitor authors a colour of their own.

**Tasks:**

- `hydrateFromSharedLink` preserves the outgoing record before overwriting it.
- `wireBeatBrand` reads `rec.origin` instead of the closure flag; clear the name input on the
  generic-label branch.
- The colour handler clears the preserved record before writing the new one.

### Phase 3: The dock control

**Depends on:** Phase 1 (needs `readDisplacedRecord` / `restoreDisplacedRecord`).
**Independent of:** Phase 2 — the two touch different functions in different files and could be built
in parallel, but Phase 2 is what makes Phase 3's result honest, so verify them together.

**Tasks:**

- Build the restore row (note + button), hidden by default, above the existing actions.
- Show/hide it wherever `renderPacks()` is already called.
- Wire the click: promote the record (inside `selfEmit`), then `selectPack(DERIVED_ID)`, then hand
  focus on.
- Style it in `portfolio.css`.

### Phase 4: Discoverability

**Depends on:** Phase 1.

One clause on the arrival notice, gated on the dock being real.

### Phase 5: Verification & generated artifacts

**Depends on:** Phases 1-4.

The drive script, the three gates, and the two artifacts that WILL churn.

**Tasks:**

- Write and run the headless drive that reproduces the issue's table plus the new rows.
- `drift-check` + `token-lint`.
- `git add` sources → regenerate `loc-summary.json` → regenerate the two approach baselines.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 0 — SETUP branch

- **IMPLEMENT**: Branch from an up-to-date `main`: `git fetch && git switch -c fix/shared-link-brand-restore origin/main`.
- **GOTCHA**: The session's starting branch is `chore/v3-merge-vr-reblock`, already merged as PR #119.
  Work from `origin/main` (`ed6cfa6` at time of writing).
- **GOTCHA**: Do **not** name the branch `feature/v3-*`. That prefix trips the D11 VR freeze
  (`.github/workflows/verify.yml:48`, still live on main) and would make the visual gate
  non-blocking — this ticket must prove its baselines instead of dodging them.
- **GOTCHA**: Parallel sessions share this working directory. Verify the branch immediately before
  committing and stage by explicit path.
- **VALIDATE**: `git branch --show-current && git log --oneline -1`
- **SATISFIES**: process precondition for AC #9

### Task 1 — UPDATE `system/pack-derived.mjs` (contract block)

- **IMPLEMENT**: Add to the exported key block a fourth key with a comment in the same grammar as its
  three siblings:
  ```js
  // factory-pack-derived-prewear — the visitor's OWN derived record, preserved when a shared link
  //                       (#77) overwrites it. The record key can hold only one record and a worn
  //                       brand must be THE record (pack-boot.js reads it pre-paint on every page),
  //                       so the arrival displaces what is there; this is where it is kept so the
  //                       dock can hand it back (#108). Never read pre-paint — pack-boot ignores it.
  export const PREWEAR_RECORD_KEY = "factory-pack-derived-prewear";
  ```
- **PATTERN**: `system/pack-derived.mjs:23-33`
- **GOTCHA**: Name it `PREWEAR_RECORD_KEY`, not `PREWEAR_KEY` — that export already exists
  (`factory-pack-prewear`, #76's committed-pack backup) and `dock.mjs:27` imports it.
- **VALIDATE**: `node --check system/pack-derived.mjs`
- **SATISFIES**: AC #1

### Task 2 — REFACTOR `system/pack-derived.mjs` (one validator, two keys)

- **IMPLEMENT**: Extract the body of `readRecord`'s validation into a module-private
  `parseRecord(raw)` returning the record or `null`, and have `readRecord()` call it. Add the sibling
  reader:
  ```js
  // The record shape check, shared by both keys so a preserved record can never be handed back on
  // looser terms than the live one (it becomes the live one on restore).
  function parseRecord(raw) {
    if (!raw) return null;
    let rec;
    try { rec = JSON.parse(raw); } catch { return null; }
    if (!rec || rec.v !== RECORD_VERSION || rec.source !== "derived" || !rec.tokens || typeof rec.tokens !== "object") {
      return null;
    }
    return rec;
  }
  export function readRecord() {
    let raw;
    try { raw = localStorage.getItem(RECORD_KEY); } catch { return null; }
    return parseRecord(raw);
  }
  // The record a shared link displaced, or null. Same validation as the live record, because a
  // restore promotes this straight into RECORD_KEY.
  export function readDisplacedRecord() {
    let raw;
    try { raw = localStorage.getItem(PREWEAR_RECORD_KEY); } catch { return null; }
    return parseRecord(raw);
  }
  ```
- **PATTERN**: `system/pack-derived.mjs:141-151`
- **GOTCHA**: Keep `readRecord`'s exported signature and behaviour byte-identical — `dock.mjs:26`,
  `close.mjs:27` and `peak.mjs:33` all import it. `peak.mjs:108` reads only `?.brandColor`.
- **GOTCHA**: Do **not** relax the validator to accept a missing `tokens`; a preserved record that
  fails the check must read as "nothing to restore" so the dock never offers a dead button.
- **VALIDATE**: `node --check system/pack-derived.mjs && node -e "import('./system/pack-derived.mjs').then(m=>console.log(m.readRecord===undefined?'MISSING':'ok', typeof m.readDisplacedRecord))"`
- **SATISFIES**: AC #1

### Task 3 — UPDATE `system/pack-derived.mjs` (`buildRecord` gains provenance)

- **IMPLEMENT**: Add an options third argument and set the field only when it is `"shared"`:
  ```js
  export function buildRecord(hex, name, { origin } = {}) {
    return {
      v: RECORD_VERSION,
      source: "derived",
      label: sanitizeName(name) || "your brand",
      ts: Date.now(),
      brandColor: hex,
      tokens: deriveBrandTokens(hex),
      // Provenance, written ONLY by the shared-link path. An ABSENT field means the visitor entered
      // this colour themselves — which is also what every record stored before #108 means, so an
      // existing record needs no migration. Both validators (readRecord above, pack-boot.js:31)
      // check v/source/tokens and ignore unknown fields, so this is invisible to every consumer
      // that does not ask for it.
      ...(origin === "shared" ? { origin: "shared" } : {}),
    };
  }
  ```
- **PATTERN**: the conditional-spread idiom already used at `system/derive.mjs:140`
- **GOTCHA**: Do **not** write `origin: "own"` on the normal path. Absent-means-own is what makes
  already-stored records read correctly without a version bump; `RECORD_VERSION` stays `1`.
- **GOTCHA**: The new field never reaches the clipboard or the handoff pack — copy-tokens serialises
  `rec.tokens` only, in both places that do it (`dock.mjs:298-301`, `close.mjs:78-83`). Verified;
  re-check if you touch either.
- **VALIDATE**: `node -e "import('./system/pack-derived.mjs').then(m=>{const a=m.buildRecord('#b5322f','Acme'),b=m.buildRecord('#b5322f','Acme',{origin:'shared'});console.log('own.origin=',a.origin,'shared.origin=',b.origin,'keys-equal=',JSON.stringify(Object.keys(a.tokens))===JSON.stringify(Object.keys(b.tokens)))})"`
  — expect `own.origin= undefined shared.origin= shared keys-equal= true`
- **SATISFIES**: AC #1, AC #2

### Task 4 — ADD the preserve / clear / restore primitives to `system/pack-derived.mjs`

- **IMPLEMENT**: Place them directly after `clearRecord` (`pack-derived.mjs:159-162`), keeping the
  read/write/clear section together:
  ```js
  // ------------------------------------------------- the record a shared link displaced (#108)
  // preserveDisplacedRecord — called by hydrateFromSharedLink BEFORE it overwrites the record.
  // Preserves ONLY a record the visitor authored: a second shared link must not offer the FIRST
  // sender's colour back as "the colour you entered", which would be an affiliation claim by the
  // back door. That one condition is correct in every ordering, because the visitor's own next
  // colour entry clears the backup (see the colour handler below), so there is never a stale one
  // to protect.
  function preserveDisplacedRecord() {
    const outgoing = readRecord();
    if (!outgoing || outgoing.origin === "shared") return;
    try { localStorage.setItem(PREWEAR_RECORD_KEY, JSON.stringify(outgoing)); } catch { /* private mode — session-only */ }
  }
  // The visitor authored a colour of their own, so the preserved one is spent — restoring it after
  // this would undo a pick they just made. Silent: the caller's writeRecord() emits the one change
  // event, and the dock re-reads both keys from it.
  export function clearDisplacedRecord() {
    try { localStorage.removeItem(PREWEAR_RECORD_KEY); } catch { /* private mode — session-only */ }
  }
  // Hand the preserved record back: it becomes THE record again and the backup is spent. Storage
  // only — the caller owns the :root transition (the dock's selectPack, which is the one place
  // allowed to move the page between packs). Returns the restored record, or null when there is
  // nothing preserved.
  export function restoreDisplacedRecord() {
    const rec = readDisplacedRecord();
    if (!rec) return null;
    // Remove BEFORE writeRecord: writeRecord emits BRAND_CHANGE_EVENT synchronously and the dock's
    // listener re-reads this key to decide whether to keep offering the restore. Emitting first
    // would leave the offer up over a spent backup.
    try { localStorage.removeItem(PREWEAR_RECORD_KEY); } catch { /* private mode — session-only */ }
    writeRecord(rec);
    return rec;
  }
  ```
- **PATTERN**: `system/pack-derived.mjs:152-162` (`writeRecord` / `clearRecord`)
- **GOTCHA**: `preserveDisplacedRecord` is module-private (only hydration calls it); the other three
  are exported because `dock.mjs` and the beat need them.
- **GOTCHA**: Ordering inside `restoreDisplacedRecord` is load-bearing. Do not reorder for tidiness.
- **VALIDATE**: `node --check system/pack-derived.mjs`
- **SATISFIES**: AC #1, AC #2, AC #4

### Task 5 — UPDATE `hydrateFromSharedLink` to preserve and to stamp provenance

- **IMPLEMENT**: In `hydrateFromSharedLink` (`pack-derived.mjs:382-410`):
  - build with provenance: `rec = buildRecord(shared.brandColor, shared.name, { origin: "shared" });`
  - call `preserveDisplacedRecord()` **after** the `buildRecord` try/catch (so a refused colour
    preserves nothing — "nothing fails on stage" means the visitor's record survives untouched) and
    **before** `writeRecord(rec)`.
  - extend the comment above `wear()` to say the record-level backup is a separate key from
    `PREWEAR_KEY`'s committed-pack backup.
- **PATTERN**: `system/pack-derived.mjs:382-410`
- **GOTCHA**: Order is exactly: `decode → buildRecord (catch → return null) → preserveDisplacedRecord()
  → applyToRoot → writeRecord → wear() → trackFactoryArrived() → setTimeout(PACK_REQUEST_EVENT)`.
  Preserving before the build would take a backup for a link that turns out to be refused.
- **GOTCHA**: This runs during `dock.mjs`'s import graph, so the preserved key exists **before**
  `buildDock()` runs — the dock's first render already sees it. No extra event is needed for the
  arrival case.
- **VALIDATE**: `node --check system/pack-derived.mjs` (behaviour proven by the Task 12 drive)
- **SATISFIES**: AC #1, AC #2

### Task 6 — REFACTOR `wireBeatBrand`'s provenance from a closure flag to the record

- **IMPLEMENT**: In `wireBeatBrand` (`pack-derived.mjs:231-366`):
  - **REMOVE** `let fromSharedLink = Boolean(sharedRec);` (line 252) and its comment block
    (lines 248-251), and **REMOVE** `fromSharedLink = false;` from the colour handler (line 326).
  - In `syncFromRoot`, replace `if (fromSharedLink)` with a read of the record that is actually on
    stage, and clear the name input on the generic-label branch:
    ```js
    if (rec.brandColor) colorInput.value = rec.brandColor;
    // Clear as well as set: restoring a record whose label is the generic fallback must not leave a
    // previous sender's company name sitting in the input (#108).
    if (nameInput) nameInput.value = rec.label && rec.label !== "your brand" ? rec.label : "";
    ...
    // Provenance now lives ON the record (buildRecord stamps origin only on the shared-link path),
    // so it survives a dock round trip, a page navigation, and a restore, and it cannot get out of
    // step with what :root is wearing the way a closure flag could (#103's failure mode).
    if (rec.origin === "shared") setLabel(label, "shared", sharedLabel(shownName));
    else setLabel(label, "applied", appliedLabel(shownName));
    ```
  - Keep the `sharedRec` parameter and the `stored || (apply ? sharedRec : null)` fallback exactly as
    they are — `sharedRec` carries `origin: "shared"`, so the blocked-storage arrival still labels
    correctly.
- **PATTERN**: `system/pack-derived.mjs:260-284`
- **GOTCHA**: `shownName` is computed from `nameInput.value` **after** the assignment above, so the
  clearing change also changes what `sharedLabel`/`appliedLabel` interpolate. That is correct: with no
  name the labels fall back to "not an official design system".
- **GOTCHA**: The colour handler's own `setLabel(label, "applied", …)` at line 327 stays — a
  freshly-built own record has no `origin`, so the two paths agree.
- **GOTCHA**: Do not delete the `sharedRec` parameter or `wireBeatBrand(hydrateFromSharedLink())` at
  line 413. The no-storage case depends on it.
- **NOTE — this also changes a path the ticket does not mention, and that is correct.** Today a
  visitor who typed their own company name and then opens a **nameless** shared link keeps that name
  in the input, so `sharedLabel(shownName)` renders "not *Mine*'s official design system" about the
  sender's colour. Clearing the input fixes that too. Call it out in the report so a reviewer does not
  read it as scope creep. VR-safe: no baseline loads a share link.
- **VALIDATE**: `node --check system/pack-derived.mjs && grep -n "fromSharedLink" system/pack-derived.mjs`
  — expect **no** matches
- **SATISFIES**: AC #5, AC #6

### Task 7 — ADD the backup clear to the beat's colour handler

- **IMPLEMENT**: In the `colorInput` `change` handler (`pack-derived.mjs:310-328`), immediately before
  `writeRecord(record);`:
  ```js
  clearDisplacedRecord(); // their own colour now — the preserved one is spent (#108)
  writeRecord(record);    // emits the one change event, so the dock drops the offer in the same tick
  ```
- **PATTERN**: `system/pack-derived.mjs:321-325`
- **GOTCHA**: Before, not after. `writeRecord` emits `BRAND_CHANGE_EVENT` synchronously and the dock's
  listener re-reads both keys; clearing afterwards would leave the restore offer up for one tick with
  a stale record behind it.
- **VALIDATE**: `node --check system/pack-derived.mjs`
- **SATISFIES**: AC #4

### Task 8 — ADD the restore row to `system/dock.mjs`

- **IMPLEMENT**:
  - Extend the import (`dock.mjs:25-28`) with `readDisplacedRecord, restoreDisplacedRecord`.
  - After the `resetBtn` / `copyBtn` declarations (`dock.mjs:252-253`), build the row:
    ```js
    // The restore offer (#108). A shared link overwrites the visitor's own derived record — it has to,
    // because a worn brand IS the record pack-boot reads pre-paint — so pack-derived preserves the
    // displaced one and this hands it back. It sits ABOVE the actions, not inside their stack: it is a
    // recovery that exists for one visitor in one situation, not a third standing action. The label
    // names the ACT, because the row above it already reads "your brand" and, while a shared colour is
    // worn, that row is describing someone else's colour.
    const restoreBtn = el("button", {
      type: "button", class: "btn btn-ghost dock-restore", text: "Restore the colour you entered",
    });
    const restoreRow = el("div", { class: "dock-restore-row" },
      el("p", { class: "dock-restore-note", text: "A shared link replaced the colour you entered. It is still here." }),
      restoreBtn);
    restoreRow.hidden = true;
    // Offered only while a preserved record exists. Called wherever renderPacks() is, because the two
    // read the same two storage keys and must never disagree.
    const renderRestore = () => { restoreRow.hidden = !readDisplacedRecord(); };
    ```
  - Insert `restoreRow` into the panel between `fieldset` and the `.dock-actions` div
    (`dock.mjs:254-261`).
  - Call `renderRestore()` right after the existing `renderPacks()` at `dock.mjs:265`, and again inside
    the `BRAND_CHANGE_EVENT` listener (`dock.mjs:279-282`) after its `renderPacks()`.
- **PATTERN**: `system/dock.mjs:252-265` (button + panel construction), `dock.mjs:133-154` (`renderPacks`)
- **GOTCHA**: Use the `hidden` **property** after construction. Passing `hidden: true` through `el()`
  works (`v === true` → bare attribute) but the toggle path must be the property, so set it the same
  way in both places.
- **GOTCHA**: `btn-ghost` matches "Reset to neutral"'s tier deliberately — restore must not outrank the
  pack choice above it.
- **VALIDATE**: `node --check system/dock.mjs`
- **SATISFIES**: AC #3, AC #7

### Task 9 — WIRE the restore click in `system/dock.mjs`

- **IMPLEMENT**: Beside the reset handler (`dock.mjs:274`):
  ```js
  // Restore: promote the preserved record back, then ask selectPack for the transition. selectPack
  // owns clear-first + the neutral base + the view transition (#102), so this control never touches
  // :root itself. Wrapped in selfEmit for the same reason wear() is (dock.mjs:227-230): writeRecord
  // fires BRAND_CHANGE_EVENT synchronously, and at that instant the restored record is in storage
  // while :root still holds the shared colours — so groundTruth() would read "neutral" and the radio
  // would flip off "your brand" a line before selectPack puts it back.
  restoreBtn.addEventListener("click", () => {
    selfEmit = true;
    const rec = restoreDisplacedRecord();
    selfEmit = false;
    if (!rec) { renderRestore(); return; } // nothing preserved — the row should not have been up
    selectPack(DERIVED_ID);
    renderRestore();
    // The control just removed itself, so hand focus to the pack it restored rather than dropping it
    // to <body> (APG disclosure; the same rule renderPacks() follows for a replaced row).
    const checked = fieldset.querySelector("input:checked");
    if (checked) checked.focus();
  });
  ```
- **PATTERN**: `system/dock.mjs:227-230` (`selfEmit` around a write), `dock.mjs:148-153` (focus handoff)
- **GOTCHA**: `selfEmit` suppresses only the `selection` recompute; the listener still calls
  `renderPacks()`, which is what refreshes the "your brand" row's note to the restored label. That is
  wanted.
- **GOTCHA**: `selectPack(DERIVED_ID)` re-reads the record itself (`dock.mjs:174`), so it picks up the
  restored one. When the recipient is already wearing derived, the href is unchanged and it takes the
  same-sheet branch (`dock.mjs:188-191`): `clearRoot` the restored keys, then `applyToRoot` them. The
  shared values are removed by that clear because both records carry the identical key set
  (`derive.mjs:144-169`).
- **GOTCHA**: When the recipient had toggled to saulera/verdant after arrival, `selectPack` swaps the
  sheet back to neutral first and applies on `load`. Do not shortcut it.
- **VALIDATE**: `node --check system/dock.mjs` (behaviour proven by the Task 12 drive)
- **SATISFIES**: AC #3, AC #5, AC #7

### Task 10 — ADD the restore styles to `system/portfolio.css`

- **IMPLEMENT**: Directly above the `.dock-actions` rule (`portfolio.css:998`):
  ```css
  /* The restore offer (#108) — shown only to a visitor whose own colour a shared link displaced, so
     it sits between the choice and the standing actions rather than becoming a third one. */
  .dock-restore-row { margin: 0 0 var(--spacing-md); }
  .dock-restore-note {
    margin: 0 0 var(--spacing-sm);
    font-size: var(--type-caption);
    color: var(--color-fg-muted);
    line-height: 1.5;
  }
  /* .btn-ghost is a text-height control, so lift it to the 44px target on its own (the same fix
     .close-tokens .btn-ghost takes at portfolio.css:1566-1567). */
  .dock-restore {
    width: 100%;
    min-height: 44px;
    padding: 10px 14px;
    font-size: var(--type-caption);
    text-align: center;
  }
  ```
- **PATTERN**: `system/portfolio.css:998-999`, `portfolio.css:1566-1567`
- **GOTCHA**: Token-only — a literal colour here is a bug (CLAUDE.md token discipline). `10px 14px`
  matches the existing `.dock-reset, .dock-copy` padding verbatim; do not "improve" it to a token.
- **GOTCHA**: Do not add the new classes to the `.dock-reset, .dock-copy` selector list — the restore
  button is full-width and the shared rule is not.
- **VALIDATE**: `node tooling/token-lint.mjs`
- **SATISFIES**: AC #3, AC #7

### Task 11 — ADD the discoverability clause to `system/close.mjs`

- **IMPLEMENT**:
  - Extend the import (`close.mjs:27`) to `import { readRecord, readDisplacedRecord } from "./pack-derived.mjs";`
  - Replace the arrival-notice block (`close.mjs:108-113`):
    ```js
    if (ARRIVED_SHARED) {
      // The appearance dock is the only surface that can hand the displaced colour back, and
      // portfolio.css:1046-1048 hides the whole rail below 1100px. So ask the CSS whether the control
      // is actually rendered instead of copying the breakpoint into JS or promising a control this
      // reader has not got (index.html:181-184 sets the same honesty precedent for #beat-wear).
      // getComputedStyle, not offsetParent: .dock is position:fixed, so offsetParent is null either way.
      const dock = document.querySelector(".dock");
      const canRestore = Boolean(readDisplacedRecord()) && Boolean(dock) &&
        getComputedStyle(dock).display !== "none";
      mount.appendChild(el("p", {
        class: "close-shared-note",
        text: "You opened a shared link. The colour and the answers came from the link, and this browser derived the palette again from them." +
          (canRestore ? " The colour you entered before is kept. The appearance control can put it back." : ""),
      }));
    }
    ```
- **PATTERN**: `system/close.mjs:105-113`
- **GOTCHA**: `close.mjs`'s beat is `activateOn: 'visible'` (line 202), so this reads storage long
  after hydration — correct by construction.
- **GOTCHA**: `ARRIVED_SHARED` is captured at module evaluation on purpose (line 33-42). Do not switch
  it to a live `location` read.
- **GOTCHA**: This is additive to a JS-built layer; with JS off the static close card is unchanged, so
  the documented degradation in the file header still holds.
- **VALIDATE**: `node --check system/close.mjs && node -e "import('./system/close.mjs').then(()=>console.log('import ok'))"`
- **SATISFIES**: AC #8

### Task 12 — CREATE the headless verification drive

- **IMPLEMENT**: Write `<scratchpad>/verify-108.mjs` (NOT committed). Serve the repo with the existing
  zero-dep server and drive Chromium through every row of the table below, asserting **both** the
  storage keys and the computed `--color-accent` on `:root`:

  | # | setup | act | expect |
  | --- | --- | --- | --- |
  | 1 | pristine | open `?brand=b5322f&name=Acme` | shared brand worn; **no** `factory-pack-derived-prewear`; beat label `data-state="shared"` |
  | 2 | selector `saulera` | open the link | shared brand worn; `factory-pack-prewear=saulera`; dock Reset hands saulera back (the #77 row, unregressed) |
  | 3 | own colour `#2e7d32` worn | open the link | shared brand worn; `factory-pack-derived-prewear` holds `#2e7d32` with no `origin` |
  | 4 | row 3, then dock restore | click **Restore the colour you entered** | `:root --color-accent` is `#2e7d32`'s negotiated accent; `factory-pack-derived` is the own record; backup key **gone**; restore row hidden; beat label `data-state="applied"` |
  | 5 | row 3, then open a SECOND link `?brand=1d4ed8` | — | backup still holds `#2e7d32`, **not** `#b5322f` |
  | 6 | row 3, then enter own colour `#7c3aed` in `#beat-brand` | — | backup key gone; restore row hidden |
  | 7 | row 3, then dock → saulera → restore | click restore | pack line back to `tokens.neutral.css`; own colour on `:root` |
  | 8 | bare `/index.html`, no storage | load | no backup key written; restore row hidden; hero's canned re-skin still runs and reverts |

- **PATTERN**: run the static server the VR gate uses —
  `node tooling/visual-regression/serve.mjs` (repo root on `http://127.0.0.1:4757`). Resolve Playwright
  from the home install: `const pw = await import(require.resolve('playwright', { paths: [process.env.HOME + '/node_modules'] }))` then `pw.default.chromium` (this repo has no root `node_modules`).
- **GOTCHA**: **One `browser.newContext()` per row.** Rows 1 and 8 assert on a pristine profile and are
  meaningless if they inherit an earlier row's storage — an implementer who shares one context will
  chase a leak that is not there. Rows 4–7 each build on row 3's setup **inside their own context**
  (enter the colour, wear it, then open the link, then act).
- **GOTCHA**: **How to assert "the restored colour is on stage".** `derive()` darkens the entered hex
  for contrast, so `#2e7d32` is never the applied accent and hardcoding it fails spuriously. Assert
  self-consistently instead: parse `localStorage["factory-pack-derived"]` and check
  `tokens["--color-accent"] === getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim()`,
  **and** that this value differs from the shared brand's accent captured before the restore. Do not
  loosen this to "some colour changed".
- **GOTCHA**: **Timing.** The hero re-skins `:root` and reverts (`spine.mjs`); a below-fold colour is
  not settled until `#beat-hero[data-spine="ready"]`. Wait on that handle (or poll `--color-accent`)
  before asserting any colour — roughly 3s after load. Asserting early gives a false failure.
- **GOTCHA**: Reaching beat 4's arrival notice means scrolling — the close beat is `activateOn:'visible'`.
- **GOTCHA**: The dock panel is `display:none` until `location.hash === "#appearance"`, and the dock
  itself is hidden below 1100px. Use a viewport ≥1280px wide and open the panel before clicking.
- **GOTCHA**: Opening the dock strips the query string (`stripHash()` → `pushState`). That is known and
  not a bug; `ARRIVED_SHARED` was already captured.
- **GOTCHA**: `ERR_CONNECTION_REFUSED` to the absent Worker is expected fixture degradation on these
  pages, not a failure.
- **VALIDATE**: `node <scratchpad>/verify-108.mjs` — every row prints `PASS`
- **SATISFIES**: AC #1 – AC #8

### Task 13 — VERIFY in a second engine

- **IMPLEMENT**: Re-run rows 3, 4 and 7 of the drive under WebKit (`pw.default.webkit`). WebKit is the
  no-`startViewTransition` path in `selectPack` (`dock.mjs:216-224`), so the restore takes the
  synchronous `swap()` branch there — a different code path, not a cosmetic difference.
- **PATTERN**: the cross-engine practice this repo adopted for v3 motion tickets
- **GOTCHA**: If `playwright` at `~/node_modules` has no WebKit build, say so in the report rather than
  claiming the check ran.
- **VALIDATE**: `node <scratchpad>/verify-108.mjs --engine=webkit`
- **SATISFIES**: AC #7

### Task 14 — RUN the repo gates

- **IMPLEMENT**: Run both non-visual CI gates locally as an early smoke test.
- **GOTCHA**: **Do not stage anything yet.** `gen-loc-summary` reads the git index, so with the sources
  unstaged its drift step compares the committed `loc-summary.json` against the committed sources and
  passes **vacuously**. This run proves syntax and token discipline, nothing about loc-summary. Task 17
  is the run that counts. An implementer who reflexively `git add -A` here will see a loc-summary
  failure, regenerate out of order, and lose the baseline step.
- **GOTCHA**: `drift-check` run mid-merge misreads staged merge changes as drift. The tree must be
  clean of merge state.
- **VALIDATE**: `node tooling/drift-check.mjs && node tooling/token-lint.mjs`
- **SATISFIES**: AC #9

### Task 15 — REGENERATE `system/loc-summary.json`

- **IMPLEMENT**: Stage the four source files first, then regenerate:
  ```bash
  git add system/pack-derived.mjs system/dock.mjs system/close.mjs system/portfolio.css
  node agent-layer/gen-loc-summary.mjs
  git add system/loc-summary.json
  ```
- **PATTERN**: `agent-layer/gen-loc-summary.mjs:40-48` — it reads `git show :<path>` (the index), not
  the working tree.
- **GOTCHA**: **`--check` before `git add` is a false "no drift".** The generator reads the index, so an
  unstaged edit is invisible to it and CI's `verify` job catches what you did not.
- **GOTCHA**: **The runtime group is at 11620 raw lines, 30 from the 11650 rounding boundary.** This
  change is comfortably larger than 30 lines, so `linesApprox` flips `11600 → 11700`. That is expected,
  not a mistake — and it is what makes Task 16 mandatory.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check && git diff --cached --stat system/loc-summary.json`
- **SATISFIES**: AC #9

### Task 16 — REGENERATE the two approach baselines

- **IMPLEMENT**: `approach.html:244` renders `runtime.linesApprox`, so the flip in Task 15 changes those
  two screenshots and only those two:
  ```bash
  cd tooling/visual-regression && npm ci && npm run update:docker
  ```
  Then `git status` and stage **only** `baselines/approach-neutral.png` and
  `baselines/approach-saulera.png`.
- **PATTERN**: the loc-summary → approach-baseline cascade this repo has hit before
- **GOTCHA**: If either PNG is not rewritten, its only change may be below pixelmatch's per-pixel
  threshold — `rm` the PNG and re-run to force it.
- **GOTCHA**: An `approach` failure reading "two consecutive stable screenshots" is the known live
  `countUp` rAF flake against `retries: 0`, not a regression. It fails a different pack each run.
- **GOTCHA**: If **any other** baseline changes, stop — the restore control must be invisible at rest.
  The panel is `display:none` (`portfolio.css:920`) and the row only renders with storage the VR
  contexts never have, so a third changed baseline means something leaked into the at-rest layer.
- **GOTCHA**: The branch is `fix/…`, so the VR job **blocks** (the D11 freeze keys on
  `feature/v3-*`). A green local run is not proof of CI green — check `gh pr checks` after pushing.
- **VALIDATE**: `cd tooling/visual-regression && npx playwright test` — 18/18 pass; `git status --short tooling/visual-regression/baselines` shows exactly two modified files
- **SATISFIES**: AC #9, AC #10

### Task 17 — RE-RUN the gates on the staged tree

- **IMPLEMENT**: With the four sources, `loc-summary.json` and the two baselines all staged, run the
  non-visual gates again.
- **GOTCHA**: This is the run that matters. CI executes `drift-check` against a tree where the sources
  **are** committed, so only a post-staging run exercises the loc-summary comparison the way CI will.
  Task 14's pass does not carry.
- **GOTCHA**: If loc-summary reports drift here, regenerate it (`node agent-layer/gen-loc-summary.mjs`),
  stage it, and **re-check whether the two approach baselines still match** — a second flip means Task
  16 must run again.
- **VALIDATE**: `node tooling/drift-check.mjs && node tooling/token-lint.mjs && node agent-layer/gen-loc-summary.mjs --check`
- **SATISFIES**: AC #9

### Task 18 — RUN the design checklist and commit

- **IMPLEMENT**: Work through `.claude/skills/portfolio-design/references/CHECKLIST.md` against the new
  control (focus visible, ≥44px target, state not signalled by colour alone, reduced motion honoured
  via the existing panel keyframe, copy in the house voice). Then one atomic commit whose message names
  what changed and its reference, e.g.
  `fix(dock): restore the colour a shared link displaced (#108)`.
- **GOTCHA**: Commit the plan, and later the report and review, **in the same PR**
  (`.claude/plans/shared-link-brand-restore.md`, `.claude/reports/…`,
  `.claude/code-reviews/pr-<N>-review.md`) — CLAUDE.md's git rule, after four artifacts were nearly
  lost in worktrees.
- **GOTCHA**: The PR body **must** carry a `Closes #108` trailer. A title mentioning `(#108)` closes
  nothing and leaves the ticket looking unplanned.
- **VALIDATE**: `git show --stat HEAD` lists exactly: 4 sources + `loc-summary.json` + 2 baselines + the
  plan
- **SATISFIES**: AC #9

---

## TESTING STRATEGY

This repo has **no test suite, no linter, no type-check** (CLAUDE.md — do not hunt for one or invent
one). "Done" means: run the surface you touched. So the strategy is a scripted browser drive plus the
three committed gates.

### Unit Tests

None. The nearest equivalent is the Node-import assertion the module header promises: importing
`system/pack-derived.mjs` in Node must stay clean (verified working today), which the `node -e` checks
in Tasks 2, 3 and 11 hold.

### Integration Tests

Task 12's headless drive **is** the integration test: real page, real storage, real derive engine, real
dock. Its eight rows are the acceptance evidence and they extend the issue's own measured table with
the four orderings the fix has to get right (link-then-link, restore, own-entry-clears, restore-from-a-
committed-pack).

### Edge Cases

- **Blocked storage (private mode).** Every access is `try/catch`. Nothing is preserved, no restore row
  appears, the arrival still labels correctly via the passed-in `sharedRec`.
- **Link A then link B.** The backup must still hold the visitor's own colour, never the first sender's.
- **Malformed / tampered backup value.** `parseRecord` rejects it and the row never appears.
- **Restore while a committed pack is selected.** `selectPack` swaps the sheet to neutral first.
- **Restore with no dock listening** — impossible: the button *is* the dock. But `restoreDisplacedRecord`
  returning `null` (a race with another tab) must not throw.
- **A record stored before this change** (no `origin`): reads as the visitor's own. Correct.
- **Below 1100px:** the record is preserved, no control is offered, and the arrival notice does not
  claim one. Deliberate, documented, and the one place this fix is partial.
- **Reduced motion / no `startViewTransition`:** `selectPack` takes the synchronous branch; Task 13
  covers it in WebKit.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
node --check system/pack-derived.mjs
node --check system/dock.mjs
node --check system/close.mjs
node tooling/token-lint.mjs
```

### Level 2: Unit Tests

```bash
# no suite — the module-import contract the file headers promise
node -e "import('./system/pack-derived.mjs').then(m=>console.log('exports:',Object.keys(m).sort().join(',')))"
node -e "import('./system/close.mjs').then(()=>console.log('close import ok'))"
```

### Level 3: Integration Tests

```bash
node <scratchpad>/verify-108.mjs                 # 8 rows, Chromium
node <scratchpad>/verify-108.mjs --engine=webkit # rows 3, 4, 7
```

### Level 4: Manual Validation

1. `node tooling/visual-regression/serve.mjs` (repo root at `http://127.0.0.1:4757`), window ≥1280px.
2. Open `/index.html`, scroll to beat 02, enter `#2e7d32`, tick **Wear it**. Confirm the site re-skins
   and the beat label reads "Your colour is on the stage…".
3. Open `/index.html?brand=b5322f&name=Acme` in the same browser. Confirm the red brand is worn and the
   beat label reads "This colour came from a shared link…".
4. Open `#appearance`. Confirm the note "A shared link replaced the colour you entered. It is still
   here." and the **Restore the colour you entered** button, both above Copy tokens / Reset to neutral.
5. Click it. Confirm: green comes back, the row stays on "your brand", the note and button disappear,
   focus lands on the checked radio, and the beat label returns to "Your colour is on the stage…".
6. Navigate to `/approach.html`. Confirm the restored green follows and the restore row is gone.
7. Scroll to beat 04 on a fresh shared-link load and confirm the arrival notice carries the extra
   sentence. Narrow the window below 1100px, reload the link, and confirm it does **not**.
8. Keyboard only: Tab to the appearance toggle, Enter, Tab to the restore button, Enter. Focus must be
   visible at every step and must not fall to `<body>`.

### Level 5: Additional Validation (Optional)

```bash
# run these LAST, with everything staged — drift-check's loc-summary step reads the git index,
# so a pre-staging pass proves nothing about it (Task 14 vs Task 17)
node tooling/drift-check.mjs                                  # blocking CI gate 1
node agent-layer/gen-loc-summary.mjs --check                  # only meaningful post-staging
cd tooling/visual-regression && npx playwright test           # blocking CI gate 3 (Docker image)
gh pr checks <N>                                              # local green ≠ CI green
```

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1 — the record is preserved.** Opening a shared link over a visitor's own worn derived
      brand writes that brand to `factory-pack-derived-prewear`, unchanged and valid.
- [ ] **AC #2 — only the visitor's own colour is ever preserved.** A second shared link does not
      replace the backup with the first sender's colour (`origin === "shared"` is never preserved).
- [ ] **AC #3 — the dock hands it back.** While a preserved record exists, the appearance panel shows
      the note plus **Restore the colour you entered**; clicking it puts that colour on `:root`, makes
      it the live record, spends the backup, and removes the offer.
- [ ] **AC #4 — the backup is spent, never stale.** It is removed on restore and when the visitor
      enters a colour of their own.
- [ ] **AC #5 — nothing lies after a restore.** The beat label returns to `data-state="applied"`, the
      dock row stays on "your brand" with the restored label's denial, and no sender name remains in
      the name input. Same fix, adjacent path: a **nameless** shared link opened over a named own
      record no longer renders the visitor's own company name inside the sender's denial sentence.
- [ ] **AC #6 — provenance is on the record.** The beat's shared/own label is decided by `rec.origin`,
      not a closure flag, and a record stored before this change reads as the visitor's own.
- [ ] **AC #7 — craft bar.** ≥44px target, visible focus, focus handed on when the control removes
      itself, state never signalled by colour alone, copy in the house voice, verified in a second
      engine.
- [ ] **AC #8 — the path is discoverable, honestly.** The shared-link arrival notice names the restore
      only when a preserved record exists **and** the dock is actually rendered.
- [ ] **AC #9 — gates green.** `drift-check` and `token-lint` pass; `loc-summary.json` regenerated
      **after** staging; plan (and later report + review) committed in the same PR; PR body carries
      `Closes #108`.
- [ ] **AC #10 — no at-rest regression.** Exactly two baselines change (`approach-neutral`,
      `approach-saulera`), and only because `loc-summary`'s runtime number flipped. A bare
      `/index.html` behaves exactly as before: no backup written, no restore row, hero re-skin still
      runs and reverts.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Task 12's eight rows all PASS; Task 13's WebKit rows PASS (or the absence of a WebKit build is
      reported honestly)
- [ ] `node --check` clean on all three edited modules; `token-lint` and `drift-check` green **on the
      staged tree** (Task 17, not just Task 14)
- [ ] Manual Level 4 walkthrough done, including the keyboard pass and the <1100px case
- [ ] `loc-summary.json` regenerated after staging; exactly two baselines regenerated
- [ ] Acceptance criteria all met
- [ ] `.claude/reports/shared-link-brand-restore-report.md` written and committed in the same PR
- [ ] PR body carries `Closes #108`

---

## OPEN QUESTIONS / ASSUMPTIONS

**Resolved with the owner before this plan was written:**

1. **Restore copy** → "Restore the colour you entered", with the note "A shared link replaced the
   colour you entered. It is still here." Chosen because the pack row above already reads "your brand"
   while describing the *sender's* colour, so a button saying "Restore your brand" would sit beside a
   contradiction.
2. **Discoverability** → add one clause to `close.mjs`'s arrival notice. A button inside a
   `display:none` disclosure is barely a restore *path*, which is what the ticket is named after.

**Assumptions this plan makes:**

- An extra field on the record needs no `RECORD_VERSION` bump, because both validators check
  `v` / `source` / `tokens` and ignore unknown keys (`pack-derived.mjs:147`, `pack-boot.js:31`) and
  absent-means-own is the correct reading of every record stored before today. **Verified by reading
  both validators**; re-confirm before writing Task 3.
- The colour-token key set is identical across records, so `clearRoot(restored.tokens)` removes the
  shared values. **Verified** — `derive.mjs:144-169` is a fixed object literal.
- `origin` never reaches the clipboard or the handoff pack: copy-tokens serialises `rec.tokens` only
  (`dock.mjs:298-301`, `close.mjs:78-83`). **Verified**; re-check if you change either.
- The preserved key is per-origin `localStorage`, so a private instance on its own domain
  (`instance.html`) is unaffected. `instance-pack.mjs` deliberately does not import `pack-derived.mjs`.

**Open — flag to the owner, do not silently decide:**

3. **There is no restore path below 1100px**, because the appearance dock itself is hidden there
   (`portfolio.css:1046-1048`, #76's decision). This ticket preserves the record on every viewport but
   can only offer it back on desktop. If mobile parity matters, it needs a second control inside
   `#beat-brand` — a separate ticket, not a silent widening of this one. The plan takes the honest
   route in the meantime: the arrival notice does not mention a control the reader cannot reach.
4. **The D11 VR freeze is still live on `main`** (`.github/workflows/verify.yml:48`) even though #82 was
   supposed to remove it and PR #119 merged. It does not block this ticket (a `fix/` branch is outside
   the `feature/v3-*` prefix, so VR blocks normally, which is what we want), but it means v3 branches
   are still shipping with a non-blocking visual gate. Worth a separate look.

---

## NOTES (open canvas)

### Why the backup is a second key and not a list

A stack of displaced records would be more general and worse. The visitor has exactly one "colour I
entered", and a share link is not a navigation history. One key, one slot, one rule for filling it
(only the visitor's own) and two for emptying it (restored, or superseded by their own new colour).
The whole state machine fits in a paragraph, which is the bar for a record that `pack-boot.js` has to
be able to reason about pre-paint.

### Why provenance moved onto the record rather than adding a second flag

The closure flag `fromSharedLink` was correct for #77's world, where the only two events were "a link
arrived" and "the visitor typed a colour". Restore adds a third transition that the flag cannot see,
and the obvious patch — clear the flag from the restore path — would mean the dock reaching into the
beat's closure, which is exactly the coupling `PACK_CHANGE_EVENT` was introduced to avoid (#103).
Putting provenance on the record makes every surface read the same ground truth from the same place,
which is the invariant #103 established. It also deletes state rather than adding it: the diff for
Task 6 is net-negative in `wireBeatBrand`.

### The ordering trap, written out

`writeRecord` dispatches `BRAND_CHANGE_EVENT` **synchronously**. The dock listens. So inside a restore:

```
restoreBtn click
  selfEmit = true
  restoreDisplacedRecord()
    localStorage.removeItem(PREWEAR_RECORD_KEY)   ← must be first
    writeRecord(rec)
      localStorage.setItem(RECORD_KEY, …)
      emitBrandChange()  ───► dock listener: selfEmit is true, so no groundTruth() recompute;
                              renderPacks() refreshes the row note; renderRestore() (called next,
                              from the listener) sees the key already gone
  selfEmit = false
  selectPack(DERIVED_ID)   ← the only thing allowed to move :root
  renderRestore()          ← belt and braces for the no-listener ordering
  focus handoff
```

Two orderings are load-bearing and both have comments in the plan's code: `removeItem` before
`writeRecord`, and `clearDisplacedRecord()` before `writeRecord` in the beat's colour handler. Get
either backwards and the offer survives one tick past its record — which is not a crash, just a button
that hands back something that no longer exists. The `if (!rec)` guard in the click handler catches it,
so the failure mode is a no-op rather than a throw. That is deliberate: "nothing fails on stage".

### Why not put the restore in the pack list as a fifth radio

Tempting — "your brand (before the link)" reads naturally. Rejected: selecting it would have to promote
the record as a side effect of a *selection*, so the list would contain one row that is a state and one
that is a command. The fieldset's whole contract is "these are the packs, exactly one is worn". A
recovery is a command, and commands live with Copy tokens and Reset to neutral.

### What could still go wrong

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| A third baseline churns | Low | The panel is `display:none` and the row needs storage the VR contexts never have. Task 16 stops if it happens. |
| `loc-summary` flips the grand total too | Certain-ish | Expected and harmless — `approach.html` renders the runtime group only, so the flip does not add baseline churn beyond the two. |
| `approach` VR flake on countUp | Medium | Known; re-run. It fails a different pack each time, which is the tell. |
| A parallel session's edits poison `loc-summary` | Low | The generator reads the git index; stage by explicit path (Task 15) and verify the branch before committing. |
| The restore fires while the sheet is still loading | Low | `selectPack`'s `swapGen` already makes last-swap-started win (`dock.mjs:109-112, 181-200`). |

### Size estimate

~55–75 added lines in `pack-derived.mjs` (mostly the comment density this repo runs at), ~30 in
`dock.mjs`, ~10 in `close.mjs`, ~14 in `portfolio.css`. Net of Task 6's deletions, comfortably over the
30-line headroom to the loc-summary boundary — which is why Tasks 15 and 16 are not optional.

## AMENDMENTS

<!-- Append-only. Newest at the bottom. Empty at creation. -->
