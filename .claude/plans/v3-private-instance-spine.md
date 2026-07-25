# Feature: P3d — Private-instance spine (instance.html via config)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

**Closes #81.** Branch: `feature/v3-instance-spine`.

## Feature Description

The public home page is now a five-beat product demo (spine: hero → brief → brand → peak → close → verify, tickets #71–#77). The per-company private-instance shell — `instance.html`, the unlisted page a hiring manager opens — is still organised as the #43 five-station archive (`01 Intake · 02 Wizard · 03 Generated · 04 Trace · 05 Materials`). This ticket gives the instance **the same spine experience, pre-seeded from the company brief**, so the public site demonstrates the capability and the private instance shows *the capability applied to this company*.

Every engine is reused **by configuration, never forked**: the shared wizard through `initIntake(config)` (already wired), the spine's beat-orchestration seam through `registerBeat`, the composed-view study surface through `renderStudy` (already wired), and the WCAG-receipt presentation through a small extraction from `peak.mjs`. The work is a **re-composition** of surfaces that already run, into the band/beat system, plus two new small pieces: an instance-local pack control and the peak band's receipt wiring.

## User Story

As a **hiring manager who received an unlisted link to a private instance built for my company**
I want to **watch the same guided demo the public site runs, with my own company as the subject from the first screen**
So that **I can judge the candidate's judgment on my own product instead of decoding an archive of stations**

## Problem Statement

The instance shell predates the spine. It ships the v2 information architecture: a jump-nav of five numbered *stations*, each a labelled exhibit, with the recorded derivation trace framed as "the headline exhibit". Three concrete failures against the v3 PRD:

1. **No peak.** The instance's most valuable artifact — a data-connected screen the factory composed from *this company's* own brief (#89) — sits in station 05 "Materials" below a link-card grid, presented as a deliverable rather than as the moment the reader came for. PRD §6.1 beat 3 requires it to be visually singular.
2. **Trace over-promoted.** The trace calls itself "the headline exhibit". PRD D8 re-homes traces one disclosure deep, *behind* the spine.
3. **No band chaptering, no beat seam.** The page uses `.section` throughout, so it reads as one flat scroll with no rhythm and no dark-band peak; and it never touches `spine.mjs`, so "the instance consumes the spine" is currently false.

The instance is also the **first cut** in the scope-hammer order (PRD §6.3), so the work must stay cleanly separable — no shared-engine change that home depends on.

## Solution Statement

Re-chapter `instance.html` into the spine's band/beat system and drive it from `spine.mjs`'s existing seam, with four beats mapped from home and every engine configured rather than forked:

| Home beat | Instance beat | Mechanism |
| --- | --- | --- |
| 1 · instant proof (`#beat-hero`) | `#instance-hero` — company-seeded hero | Inherited `.page-hero` CSS choreography (`hero-rise` stagger + `hl-draw`) + a `registerBeat` readiness handle. **No re-skin**: the page already wears the company's pack from its head link. |
| 01 · you brief it | `#beat-brief` — curated intake + the shared wizard | `initIntake(config)` — already wired, unchanged. Re-banded. |
| 02 · your brand | *(omitted)* | The instance's pack is a real committed stylesheet, pinned at build time. Replaced by ↓ |
| interstitial · wear it | `#instance-appearance` — instance-local pack control | New `system/instance-pack.mjs`: company pack (pre-selected) ↔ neutral. |
| 03 · the peak | `#beat-built` — the one dark band | `renderStudy` (already wired) promoted into the peak stage + real WCAG receipts + the Manipulation Matrix moved here. The derived token set is applied **scoped to the peak panel**, so the screen and its receipts always describe the same palette (see D1 below). |
| 04 · you keep it | `#beat-keep` | Week-one line + contact + handoff pack. No share control (owner decision). |
| 05 · verify | `#verify` | The derivation trace, demoted from "headline exhibit" to evidence, + the public-factory row-list. |

**D1 · The peak's palette must be self-consistent (decided, not left open).** The receipts are computed from the wizard's live axes, so a reader who overrides the brand colour in beat 01 would otherwise see receipts describing palette B beside a composed screen still wearing the committed pack's palette A — a contradiction inside the one band the PRD calls visually singular. Fix: **apply the full derived token set as inline custom properties scoped to `.pi-peak-panel`**, re-applied on every `onAnswers`, exactly as `peak.mjs:120-127` argues for its live screen and `factory-intake.mjs:280-283` does for `#reskin-preview`. Consequences, all intended: the panel is a *contained preview*, so density-driven spacing and type scales shift with the answers too; the pinned company pack outside the panel is never touched (no `:root` writes anywhere on this page); and the receipts are true of the screen beside them at every moment. The rejected alternative — deriving receipts once from the package's committed axes — keeps the receipts true of the pinned pack but loses the live update, which is the beat's whole point.

Three engine-level moves, all default-preserving:

1. **Extract `buildReceipts`** from `peak.mjs` into a new `system/wcag-receipts.mjs`, imported by both. `peak.mjs` keeps identical behaviour (3-line diff). This is *not* an import of `peak.mjs` on purpose — see the `pack-derived` trap below.
2. **`spine.mjs` is untouched.** The instance's beat ids differ from home's, so `spine.mjs`'s module-scope `registerBeat("beat-hero", …)` finds no element and registers inert (`spine.mjs:55`). Zero risk to index's VR baseline.
3. **`build-instance.mjs`'s stamp seams are preserved, not extended.** Every demo-only phrase stays inside a `<span|p data-when="demo">`; `{{name}}` substitution keeps working; `validateAssembly`'s eight residue/asset checks keep passing.

## Out of Scope / Non-Goals

- **Not included: a share-link control on the instance close.** Owner decision (2026-07-25): the instance's beat 4 is the week-one line + contact + the handoff pack. `close.mjs` and `share-state.mjs` encode a brand hex + three axes for a *derived* pack; against a pinned company pack those params are meaningless, and the unlisted URL is already forwardable as-is. `close.mjs` is **not** imported, **not** modified.
- **Not included: `dock.mjs` on the instance, and no change to `dock.mjs`'s pack allowlist.** Owner decision (2026-07-25): an instance-local control instead. `dock.mjs`'s `PACK_RE`/`PACK_IDS` hard-allowlist `neutral|saulera|verdant`; a company pack would make `activePack()` return `"neutral"` and the radio would show neutral checked while the page wears the company brand — a lying control. Generalising it would also edit `position: fixed` chrome captured in all 18 VR baselines while VR is frozen (D11), so zero-churn could not be confirmed until #82.
- **Not included: a brand-colour input beat.** The instance's pack is a real committed stylesheet in the deploy dir (architecture §Key decisions: "On private instances the company pack is a real committed stylesheet in the deploy dir — no derived record involved"). `pack-derived.mjs` and `pack-boot.js` stay off this page.
- **Not included: parameterising `peak.mjs`'s composition source.** `peak.mjs`'s header anticipates epic #86 swapping its composition source. That turns out to be the *wrong* reuse here: the instance already ships the richer `renderStudy` surface (ask-tabs, per-prop controls, refusal display, bus pane, provenance — #89), and driving the instance's peak through `peak.mjs` would **downgrade** it to one composition with one select. Only the receipt presentation is shared. Recorded as a conscious divergence from that header comment; **update the `peak.mjs` header note in the same PR** so it stops promising a seam this ticket decided against.
- **Not changing:** `spine.mjs`, `close.mjs`, `share-state.mjs`, `pack-derived.mjs`, `pack-boot.js`, `dock.mjs` (beyond one stale line-ref comment fix), `factory-intake.mjs`, `agentic-study.mjs`, `trace-player.mjs`, `index.html`, or any other shipped page.
- **Not changing: `peak.mjs`'s behaviour.** Its diff is the `buildReceipts` extraction + the header note. Home must stay byte-identical or index's VR baseline churns.
- **Not included: adding `instance.html` to the VR gate.** It is not in `visual.spec.mjs`'s nine pages today and this ticket does not add it (it is a deploy-time-stamped shell, not a committed shipped page; its baseline would capture demo config). Recorded as a deliberate non-goal; the `data-*="ready"` handles are added anyway so a later ticket can.

## Feature Metadata

**Feature Type**: Enhancement (re-composition of shipped surfaces onto the v3 spine)
**Estimated Complexity**: Medium — high **coordination** cost (six honesty/stamping invariants intersect), low algorithmic cost (no new engine)
**Primary Systems Affected**: `instance.html` · `system/instance.mjs` · new `system/instance-pack.mjs` · new `system/wcag-receipts.mjs` · `system/peak.mjs` (extraction only)
**Dependencies**: none new. Vanilla ES modules, zero runtime deps (hard constraint).

## Related Work

**Implements**: [#81](https://github.com/linardsb/ux-factory/issues/81) — P3d, Wave 6 · **Epic**: [#70](https://github.com/linardsb/ux-factory/issues/70) → `docs/epics/portfolio-v3-experience.architecture.md`

**Dependency status (verify before starting, don't stall on it):** the epic lists #81 as depending on #71–#78. All are **implemented**; #77 is implemented-but-OPEN on the tracker (shipped on `feature/v3-close`, commits `7fd50b3`→`d2b1026`) because PR titles carry `(#N)` with no `Closes` trailer. That is a tracker artifact, not a dependency gap — see `.claude/plans/` for each. **This PR must carry a `Closes #81` trailer** (CLAUDE.md, hard).

**Back-references** (plans this builds on / inherits decisions from):

- `.claude/plans/private-instance-shell.md` (#43) — Why: the shell being re-chaptered; its pinned-pack and honesty-labeling decisions.
- `.claude/plans/per-company-build-unlisted-deploy.md` (#44) — Why: the stamp seams and `validateAssembly` gate this must not break.
- `.claude/plans/floor-into-instance-prototype-slot-reader-adjust.md` (#89) — Why: `renderPrototype` / `renderStudy` in-slot rendering + the `unclaim` honesty discipline the peak inherits.
- `.claude/plans/v3-spine-skeleton.md` (#71) — Why: the band/beat region contract and class vocabulary being reused.
- `.claude/plans/v3-built-screen-peak.md` (#75) — Why: `buildReceipts`, the peak's craft bar, and the build-then-swap discipline.
- `.claude/plans/v3-intake-stakeholder-rewrite.md` (#73) — Why: `initIntake`'s `askedAxes`/`onAnswers` seams.

**Forward-references**:

- #82 (P4) — the final regen + VR re-block; picks up any baseline churn this PR defers.
- #90 (Spike 2, ceiling engine) — will supply per-company bespoke *specs*; the peak band this ticket builds is the surface those land in.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `instance.html` (all 528 lines) — Why: the file being restructured. Read the head comment (13–36: the stamp contract + the "no pack-boot, a private instance PINS its pack" decision) and the `<style>` block (42–296: the `fw-*` / `trace-*` / `study-*` families ported verbatim from `factory.html` + `agentic-ui-study.html`; new classes use the `pi-*` prefix).
- `system/instance.mjs` (all 313 lines) — Why: the module being extended. Note the three **independent** fetch chains (A package → notices+intake+wizard, B trace, C prototype), `mountWizard`'s `initIntake` call (139–158), `renderPrototype`'s `unclaim` honesty discipline (210–257), and `errorCard` (53–62).
- `index.html` (lines 180–302) — Why: the **structural** reference for the `#beat-wear` interstitial, the dark peak band, and the close card. **Copy the structure, author the copy fresh** — its strings would fail `validateAssembly` (see traps).
- `system/spine.mjs` (36–110 the seam, 193 the module-scope hero registration) — Why: `registerBeat(id, spec)` contract; `activateOn: 'load' | 'visible'`; `ctx = { el, reduce }`; the "registered but inert when the mount is absent" guarantee at line 55 that makes a different beat id safe.
- `system/peak.mjs` (76–81 `RECEIPT_USAGES`, 133–157 `buildReceipts`, 107–118 `readInputs`/`computeDerived`, 209–221 the `finally` readiness contract) — Why: the function being extracted, and the readiness-handle pattern to mirror.
- `system/factory-intake.mjs` (224–246 the `initIntake` signature + the six mount ids it looks up, 267–288 `run()` and the `onAnswers` publish, 563–600 + 646–700 `renderEthics`/`renderReveal`) — Why: `#factory-wizard`, `#reskin-preview`, `#factory-narrative` are **load-bearing ids** (line 239 returns early if any is missing); `#ethics-gate`, `#fw-scenario-notice`, `#scenario-toggle`, `#handoff-note`, `#factory-summary` are individually-guarded optional anchors; `onAnswers` is the seam the receipts hang off.
- `system/agentic-study.mjs` — Why: `renderStudy(mount, { vocab, entries, bus, subject })` — the signature `instance.mjs:245` already calls; the `study-*` classes it emits are styled with **light** tokens, which drives the light-panel-on-dark-band decision.
- `agent-layer/build-instance.mjs` (100–175 `stampShell`, 194–309 `validateAssembly`) — Why: **the hardest constraint in this ticket.** Mechanism A's five required anchors (throw on any miss), Mechanism B's `span|p`-only demo-delete regex at line 163, and `validateAssembly`'s residue checks at 199–204 + 238–239.
- `system/pack-derived.mjs` (375–413 `hydrateFromSharedLink` + the unguarded self-boot at 413) — Why: **the reason the receipts get their own module.** `hydrateFromSharedLink()` runs on any page that imports this file and, on a URL carrying `?brand=…`, applies derived colours to `:root`, writes the record and calls `wear()` — regardless of whether `#beat-brand` exists. Importing it (even transitively) onto the instance would let a stale/forwarded query param override the company's pinned pack.
- `system/dock.mjs` (28–34 `PACKS`/`PACK_RE`, 56–68 `packLink`/`activePack`, 162–239 `selectPack`'s three inline/committed rules) — Why: the **pattern** the instance-local control mirrors (href swap, view transition, hard allowlist), and the allowlist that makes reuse impossible here. Its line 8 comment cites a stale `instance.html:448` — fix it.
- `system/portfolio.css` (1048–1135 band/beat + intake-live, 1308–1470 the `peak-*` family) — Why: every class the new markup uses already exists here and is **inverse-token aware** (`.band--dark .beat-numeral`, `.peak-receipts-headline`, `.peak-note` use `--color-fg-on-inverse*`). `instance.html` already links `portfolio.css`, so nothing needs adding to the shared stylesheet.
- `system/components.css` (996–1005) — Why: the `.page-hero > .container > *` `hero-rise` stagger the instance's hero already inherits for free.
- `scenarios/northwind/copy.json` + `scenarios/northwind/intake.defaults.json` + `proto/compositions/northwind/index.json` — Why: the demo package's exact shape (`axes` = `#0A5C6B`/`compact`/`hunt`/`monthly`; **no** `improvesLives`/`wouldUseIt` → `makerMatrix: null` → the reveal's "Not placed" path; `ethicsReveal.verdict = "utility"`; two composed views).
- `tooling/visual-regression/visual.spec.mjs` (15–57 the `PAGES` array) — Why: confirms `instance.html` is **not** in the gate set, and shows the `waitReady`/`waitVisible` handle convention to mirror.
- `.claude/skills/portfolio-design/references/CRAFT.md` + `CHECKLIST.md` — Why: the craft bar (§6.4) this must pass. Read CRAFT before writing CSS, run CHECKLIST before committing.

### New Files to Create

- `system/wcag-receipts.mjs` — the WCAG-receipt presentation extracted from `peak.mjs`: `RECEIPT_USAGES` + `buildReceipts(checks)`. Pure + DOM-only, zero imports. ~45 LOC.
- `system/instance-pack.mjs` — the instance-local pack control: company pack (pre-selected, read from the head `<link>`) ↔ neutral, href swap + view transition, no storage. ~90 LOC.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `docs/epics/portfolio-v3-experience.architecture.md`
  - §Key decisions → "Wizard rewrite" row: the instance consumes the same `initIntake(config)` seam; wizard is shared, never forked (**recorded decision**).
  - §Key decisions → derived-pack record bullet: "On private instances the company pack is a real committed stylesheet in the deploy dir — no derived record involved."
  - §Build phases → P3 row: "instance.html gets the spine treatment via config (never forked)."
  - Why: the three sentences this ticket implements verbatim.
- `docs/epics/portfolio-v3-experience.prd.md` (= epic #70 body)
  - §6.1 beats 1–5 (the spine's shape and the peak's "visually singular" requirement) · §6.2 (the instance clause: "public = the capability demonstrated; private = the capability applied to *this company*") · §6.3 (scope-hammer: this is the **first cut** — keep separable) · **§6.4 the craft acceptance bar** · §8 (honesty contract unchanged).
- `docs/epics/per-company-brief.architecture.md` → §Stamping · §Boundaries (privacy · honesty labeling · no public upload surface)
  - Why: the stamp-seam contract and why nothing company-real is committed.
- `.claude/references/token-system.md` — Why: token discipline; a literal in shared CSS is a bug. New `pi-*` rules stay in `instance.html`'s own `<style>` (single-surface styling — the precedent that block's own header records).
- `.claude/references/frontend-component-best-practices.md` — Why: on-demand context for UI work per CLAUDE.md.

No external/library documentation applies: shipped pages are vanilla with no runtime dependency (hard constraint), and every API used here is in-repo.

### Patterns to Follow

**Beat registration** (`system/intake-beat.mjs:38-51`, `system/close.mjs:202`) — one `registerBeat` call per module tail, with the reason for the `activateOn` choice stated in a comment:

```js
registerBeat("beat-close", { effect: closeEffect, activateOn: "visible" });
// activateOn:'visible' — not 'load'. The close sits below the peak, so 'load' would build this
// layer, and arm its analytics, for readers who never reach the beat (spine.mjs:41-43).
```

**Readiness handle in a `finally` on every path** (`system/peak.mjs:215-221`) — the handle can never hang:

```js
async function peakEffect(ctx) {
  try { await buildPeak(ctx); }
  finally { ctx.el.setAttribute("data-peak", "ready"); }
}
```

**Element builder — never `innerHTML` from data** (`system/instance.mjs:41-46` is the shape to match in `instance.mjs`; `peak.mjs:89-99` is the richer variant for a new module):

```js
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
```

**The honesty `unclaim` discipline** (`system/instance.mjs:220-225`) — a capability badge + its claim paragraph are withdrawn the moment the capability turns out to be unavailable, for *any* reason:

```js
const unclaim = (replacementText) => {
  const badge = document.getElementById("prototype-capability");
  if (badge) badge.remove();
  const claim = document.getElementById("prototype-claim");
  if (claim && replacementText) claim.textContent = replacementText;
};
```

**Pack swap through a view transition, with reduced-motion + no-VT fallbacks** (`system/dock.mjs:206-222`, `system/spine.mjs:184-190`) — the swap always runs and the promise always resolves:

```js
const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
if (document.startViewTransition && !reduce) {
  const vt = document.startViewTransition(swap);
  vt.ready.catch(() => {}); vt.finished.catch(() => {});
} else swap();
```

**Node-import-safe self-boot behind a DOM guard** (`system/instance.mjs:313`, `system/pack-derived.mjs:413`) — every tracked `.mjs` goes through `node --check` **and** `drift-check` imports several, so no module may touch `document` at import time:

```js
if (typeof document !== "undefined") init();
```

**Error convention** (`agent-layer/lib.mjs`, `system/instance.mjs:49`) — throw a plain `Error` whose message names the offending path; no taxonomy, no wrapping:

```js
if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
```

**File header citing the governing doc** (every module in `system/`) — new files follow suit: what it is, which epic/ticket, which doc section, and the boot contract.

---

## IMPLEMENTATION PLAN

### Phase 1: Extractions (no behaviour change anywhere)

Pure moves that make the later phases possible without dragging dependencies onto the instance. Home must be byte-identical after this phase.

**Tasks:**

- Extract `RECEIPT_USAGES` + `buildReceipts` from `peak.mjs` into `system/wcag-receipts.mjs`; `peak.mjs` imports them.
- Correct `dock.mjs`'s stale `instance.html:448` line reference.
- Update `peak.mjs`'s header note about epic #86 swapping its composition source (this ticket decided against that seam for the instance).

### Phase 2: The instance-local pack control

**Independent of:** Phase 3 and Phase 4 (a new module + one new `<section>`; touches no shared engine and no existing instance markup). Could run in parallel in a separate worktree, though at this size it is not worth the setup.

**Tasks:**

- Create `system/instance-pack.mjs`: read the active pack from the head `<link>` (generic `tokens.<slug>.css`), offer it (pre-selected) ↔ `neutral`, swap the one href inside a view transition, no persistence.
- Mount it in `instance.html` as an unnumbered interstitial band, mirroring home's `#beat-wear`.

### Phase 3: The band/beat restructure of `instance.html`

**Depends on:** Phase 2 (the interstitial's markup slots between beat 01 and the peak) — ordering only, not logic.

The bulk of the diff, and where every stamping/honesty invariant lives.

**Tasks:**

- Re-chapter the five `.section` stations into `.page-hero` + four `.band` beats + the interstitial.
- Move `#instance-prototype` into the dark peak band inside a light panel; move `#ethics-gate` into the peak band's own light panel; add the receipts host.
- Move `#instance-player` (the trace) into the `#verify` beat and rewrite its copy so it no longer calls itself "the headline exhibit"; add the evidence row-list.
- Rewrite the close as the single-card `#beat-keep` beat.
- Update `.cs-jump`, the `scroll-margin-top` rule, and add the `pi-peak-*` rules to the page's own `<style>`.

### Phase 4: Wiring in `system/instance.mjs`

**Depends on:** Phase 1 (imports `wcag-receipts.mjs`) + Phase 3 (the mounts it targets).

**Tasks:**

- Register the hero + peak beats on the spine seam (new ids, so `spine.mjs` needs no change).
- Wire live WCAG receipts off `initIntake`'s `onAnswers` seam.
- Extend `renderPrototype`'s `unclaim` to the peak band's badge/claim/receipts so an instance with no composed view makes zero capability claims.

### Phase 5: Validation, honesty audit, and the regen cascade

**Depends on:** all of the above.

**Tasks:**

- Run the three CI gates locally; regen `loc-summary.json` and, if approach's rendered numbers moved, the two approach baselines.
- Run a real `build-instance.mjs` build against the committed fixture brief and prove `validateAssembly` passes **both** with and without `--compositions`.
- Cross-engine functional check (Chromium + Firefox + WebKit) per the recorded cross-browser MUST.
- Run the `portfolio-design` CHECKLIST.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task Format Guidelines

Use information-dense keywords for clarity:

- **CREATE**: New files or components
- **UPDATE**: Modify existing files
- **ADD**: Insert new functionality into existing code
- **REMOVE**: Delete deprecated code
- **REFACTOR**: Restructure without changing behavior
- **MIRROR**: Copy pattern from elsewhere in codebase

---

### 0 · PRECONDITION — branch from a clean, merged tree

- **IMPLEMENT**: Confirm the `origin/main` merge into `feature/v3-close` is **committed** (it is, as of `d2b1026` — the working tree was mid-merge earlier in the session). Then branch.
- **PATTERN**: CLAUDE.md §Git — one atomic commit per ticket; the plan/report/review live in the same PR.
- **GOTCHA**: A `drift-check` run against an uncommitted merge misreads staged merge changes as "drift after regeneration" (recorded trap). Never diagnose drift on a mid-merge tree.
- **GOTCHA**: Parallel sessions share this working directory (recorded trap) — verify the branch immediately before every commit and stage by explicit path, never `git add -A`.
- **VALIDATE**: `git rev-parse --short MERGE_HEAD 2>/dev/null && echo OPEN || echo clean` → `clean`; then `git switch -c feature/v3-instance-spine && git status --short` → empty.

---

### CREATE `system/wcag-receipts.mjs`

- **IMPLEMENT**: Move `RECEIPT_USAGES` (`peak.mjs:76-81`) and `buildReceipts(checks)` (`peak.mjs:133-157`) here **verbatim**, both `export`ed. Include the local `el()` builder `buildReceipts` needs (copy `peak.mjs:89-99` — it is a 10-line private helper; duplicating it keeps this module dependency-free, which is the whole point). Header: what it is, `epic #70 tickets #75 and #81`, "shared by the home peak (peak.mjs) and the private-instance peak (instance.mjs) — one receipt presentation, two hosts", and a note that it is pure/DOM-only with no imports.
- **PATTERN**: `system/share-state.mjs` — the precedent for a small pure module extracted so two hosts share one contract.
- **IMPORTS**: none. Do not import `derive.mjs` — the caller passes `checks`.
- **GOTCHA**: Keep `buildReceipts` byte-identical, including the "never hide a reject" loop (`peak.mjs:139`) and the `is-flagged` headline class. It is the honesty behaviour, not formatting.
- **GOTCHA**: The returned root carries `class="peak-receipts"` + `data-peak-receipts` — both are relied on by `peak.mjs`'s host-replacement logic (`peak.mjs:279-282`) and by the instance's. Do not rename.
- **VALIDATE**: `node --check system/wcag-receipts.mjs && node -e "import('./system/wcag-receipts.mjs').then(m=>console.log(Object.keys(m).sort().join(',')))"` → `RECEIPT_USAGES,buildReceipts`
- **SATISFIES**: AC #1 (enables the peak's receipts without importing `peak.mjs`) · AC #6

### UPDATE `system/peak.mjs`

- **IMPLEMENT**: (a) Replace the moved `RECEIPT_USAGES` const and `buildReceipts` function with `import { buildReceipts } from "./wcag-receipts.mjs";`, keeping the explanatory comment that sat above `RECEIPT_USAGES` **in the new file**. (b) Amend the header's epic-#86 paragraph: it currently promises "Epic #86 later swaps only the composition SOURCE (committed → per-employer agent-composed on a private instance); this render/receipt/adjust machinery is unchanged" — record that #81 instead reused only the *receipt* presentation, because the instance's richer `renderStudy` surface (#89) already owns compose-and-adjust, and cite `.claude/plans/v3-private-instance-spine.md`.
- **PATTERN**: `peak.mjs:26-32` — the existing import block; add the new import beside `derive`.
- **IMPORTS**: `import { buildReceipts } from "./wcag-receipts.mjs";`
- **GOTCHA**: `el()` stays in `peak.mjs` (still used by `enhanceEthics`, `buildPeak`, the adjust surface). It is now duplicated in `wcag-receipts.mjs` — deliberate, and worth one comment line in each file saying so.
- **GOTCHA**: **Behaviour must not change.** Home's `#beat-peak` output must be identical or index's VR baseline churns (and VR is frozen on this branch, so the churn would surface only at #82).
- **VALIDATE**: `node --check system/peak.mjs && grep -c "function buildReceipts" system/peak.mjs` → `0`; then load `/index.html` and confirm the peak's receipts render with the pass-count headline and per-pair ratios (see the manual-validation section).
- **SATISFIES**: AC #6 (no regression in existing functionality)

### UPDATE `system/dock.mjs` — stale line reference

- **IMPLEMENT**: Line 8 reads "the off-nav deep-link surfaces opt out — instance.html:448 says so". Line 448 is now inside the trace station; the pin decision lives in the head comment at `instance.html:34-36`. Retarget the reference (and prefer a section name over a line number, since this ticket is about to move those lines again).
- **PATTERN**: repo convention — headers cite their governing doc, and stale refs are corrected in the ticket that notices them.
- **GOTCHA**: **Comment only.** One character of behaviour change in `dock.mjs` risks all 18 VR baselines. Diff must be a single comment line.
- **VALIDATE**: `git diff --stat system/dock.mjs` → `1 file changed, 1 insertion(+), 1 deletion(-)`; `node --check system/dock.mjs`
- **SATISFIES**: AC #7 (documentation accurate)

---

### CREATE `system/instance-pack.mjs`

- **IMPLEMENT**: The instance-local pack control. Two options — the **company pack**, read from the page's own head `<link>` (so it is pre-selected by construction, never by a hardcoded id), and **neutral**, the no-brand base. Picking one re-points that single `<link>`'s href inside a view transition. Shape:
  - `PACK_RE = /\/system\/tokens\.([a-z0-9-]+)\.css$/` — generic slug, applied **only** to `link[rel="stylesheet"]` hrefs, never to storage or config (mirrors `dock.mjs:56-63`'s note that `link[href*="/system/tokens."]` would wrongly match `tokens.contract.css`).
  - `packLink()` → the one matching link, or `null`. `activeSlug()` → the captured slug.
  - **Capture the company slug once at boot**, before any swap, into a module-level const. After a swap to neutral the href no longer names the company, so re-deriving it later would lose the option.
  - Options list: `[{ id: companySlug, name: config.name || companySlug, note: "the pack derived from their brand" }, { id: "neutral", name: "neutral", note: "the no-brand default" }]`. If the captured slug **is** `neutral` (an instance built without a company pack — the committed demo shell before stamping), render a single honest row and no swap control.
  - Radio group, `<legend>`, `.dock-pack-row`/`.dock-pack-label`/`.dock-pack-name`/`.dock-pack-note` classes reused from `portfolio.css` so it inherits the dock's styling with no new CSS.
  - **No `localStorage`.** A private instance pins its pack (#43); the selection is session-only and resets on reload to the stamped pack. State that in a comment and in the caption copy.
  - Export `initInstancePack(config)`; call it from `instance.mjs`, not from a self-boot, so the instance owns its mount order.
- **PATTERN**: `system/dock.mjs:99-267` — `el()` builder, `renderPacks`/`syncChecked`, `selectPack`'s href swap, the `fieldset.addEventListener("change")` wiring, and the reduced-motion / no-View-Transition fallbacks at 206-222. **Simplify hard**: no derived record, no storage, no `PREWEAR`, no copy-tokens, no disclosure/hash state machine, no scroll ruler. Two radios in a static inline block, not fixed chrome.
- **IMPORTS**: none. Do **not** import `pack-derived.mjs` (see the trap below) or `dock.mjs`.
- **GOTCHA**: **Never import `pack-derived.mjs`.** Its module tail runs `wireBeatBrand(hydrateFromSharedLink())` unguarded (`pack-derived.mjs:413`), and `hydrateFromSharedLink` applies derived `--color-*` props to `:root`, writes the record and calls `wear()` for **any** URL carrying `?brand=…` — regardless of `#beat-brand`'s absence. On an instance that would let a forwarded query param silently override the company's pinned pack. This is also why the receipts got their own module rather than importing `peak.mjs` (which imports `pack-derived` transitively via `intake-beat.mjs`).
- **GOTCHA**: `document.startViewTransition` is unsupported in Firefox — the `else` branch must run `swap()` synchronously (`dock.mjs:222`). Verify in the cross-engine check.
- **GOTCHA**: The new `<link>` href must be awaited before the transition resolves, or the crossfade captures an unstyled frame (`dock.mjs:190-203` is the precedent: resolve on `load`/`error`). Simpler than the dock's `swapGen` generation counter is fine — there is no async record re-read to race here — but the `load` await is not optional.
- **GOTCHA**: Honesty — the caption must not imply the reader's choice persists, and must not call the company pack "official". Reuse the shape of `dock.mjs:258-259` ("swaps the one stylesheet line in this page's head, the same swap a company build ships and the CI gate performs") without the "follows you to every page" clause, which is false here.
- **VALIDATE**: `node --check system/instance-pack.mjs && node -e "import('./system/instance-pack.mjs').then(m=>console.log(typeof m.initInstancePack))"` → `function` (proves DOM-free at import)
- **SATISFIES**: AC #2

---

### UPDATE `instance.html` — the band/beat restructure

This is the largest single task. Do it in the order below; after each sub-step, load the page and confirm nothing has gone blank.

- **IMPLEMENT**:

  **(a) Hero → beat 1.** Give the existing `<section class="page-hero">` `id="instance-hero"`. Keep `.hero-eyebrow`/`#instance-name`/`h1`/`.hero-sub` exactly as they are (the `hero-rise` stagger keys on `.page-hero > .container > *`, so the choreography is already inherited — `components.css:996-1003`). Replace `.cs-jump` with the new four-beat anchor list. Tighten the `hero-sub` so the *company* is the subject in the first sentence, not "the page a hiring manager opens".

  **(b) Honesty labels — unchanged.** `#labeling` and `#instance-notices` keep their ids and their position immediately after the hero. This is honesty surface #1; it renders before anything else (architecture §Boundaries). Only the wrapper class changes (`.section` → `.band`) if the rhythm needs it.

  **(c) Beat 01 · You brief it** (`<section class="band" id="beat-brief">`). Merge today's `#curated-intake` + `#wizard` + `#generated` stations into one beat:
  - `.beat-head` with `.beat-numeral` `01`, `.beat-kicker` "You brief it", `.beat-title`, then `.beat-lead`.
  - `#instance-intake` (the curated accordions) stays.
  - `.intake-live` wrapping `.intake-ask > #factory-wizard[data-intake="external"]` and `.intake-stage > .intake-stage-cap + #reskin-preview` — mirror `index.html:98-130` structurally.
  - `.intake-evidence > .intake-stage-cap + #factory-narrative`.
  - Keep the `.capability.live` "Runs now" chip on this beat: the wizard **does** run live here.
  - `#reskin-preview`'s inner sample surface stays as-is.
  - **Move `#ethics-gate` OUT of this beat** → into the peak (step e).

  **(d) Interstitial · Appearance** (`<section class="band band--interstitial" id="instance-appearance">`). Mirror `index.html:185-199`: `.wear-intro` with `.beat-kicker` + `.beat-title` + `.beat-lead` (no `.beat-head`, so it carries no step number), then the mount `<div id="instance-pack-control">`. Copy states plainly that this instance is pinned to the company's pack and that the control lets the reader put it side by side with the neutral base.

  **(e) Beat 02 · It builds — the peak** (`<section class="band band--dark" id="beat-built">`). The signature moment:
  - `.beat-head` `02` / "It builds" / title naming the company's own screen; `.beat-lead`.
  - `.pi-peak-stage` (2-col grid, collapsing at 900px) containing:
    - `.pi-peak-panel` — a **light** card (`background: var(--color-bg)`) wrapping `<div id="instance-prototype">`. The panel is required: `agentic-study.mjs` emits `study-*` markup styled with light tokens (`--color-fg`, `--color-bg-surface`), which would be invisible directly on the dark band. This mirrors home, where `.peak-screen--live` is a light card on the dark ground.
    - `.peak-side` — the capability badge (`#prototype-capability`), the claim paragraph (`#prototype-claim`), a new `<div data-peak-receipts>` receipts host, and a `.peak-note`.
      - **The static receipts seed must state no contrast verdict.** `index.html:237-246` seeds two rows reading "Pass AA" — honest there because home's still is a committed Verdant example whose pairs were measured. Here that string would be an **unmeasured claim about the company's pack**, it would survive `stampShell` into a real instance, and it is what a no-JS reader sees. Nothing catches it: `validateAssembly` does not scan for it and the honesty audit script only greps demo/fictional/`hidden`/`{{`. Seed one line naming *what will be measured* ("every contrast pair on this screen is measured live") with **no** pass/fail token, no ratio, and no `.wcag-pass`/`.wcag-fail` class.
  - `.pi-peak-ethics` — a second light panel, full width below the stage, wrapping `<div id="ethics-gate">`. Light panel again: the ported `.fw-ethics-*` / `.fw-matrix` / `.fw-quadrant` / `.fw-reveal-*` rules in this page's `<style>` are all light-token. **This is why the ethics gate is not styled for the dark band** — a light panel needs zero override CSS, an inverse variant would need ~15 override rules on ported classes.
  - Add a short heading above the ethics panel so the moved gate is introduced rather than appearing without context.

  **(f) Beat 03 · You keep it** (`<section class="band" id="beat-keep">`). Mirror `index.html:274-302`'s single `.close-card`: `.beat-head` `03` / "You keep it", `.close-card-line` (the week-one line, company-seeded — see the `{{name}}` note below), `.hero-cta-row` with the contact CTA, then `.close-takeaway` holding the handoff-pack copy and `<div id="instance-links">`. **No `.close-extras` mount, no share control** (out of scope).

  **(g) Beat 04 · Verify** (`<section class="band" id="verify">`). `.beat-head` `04` / "Verify". Then:
  - The derivation trace: keep `#instance-player`, keep the `.capability` "Replays a real run" chip, keep both `data-when` prose variants — but **rewrite the lead so it no longer says "The headline exhibit"** (the peak is now the headline). Frame it as the evidence behind the pack the reader has been looking at.
  - A `.row-list` of evidence links (mirror `index.html:318-364`): the public factory, the round-trip check, how I work. **Do not** link the agentic study — that surface is now embedded in this page's own peak, and pointing at the public copy would read as duplication.
  - Drop the standalone trailing `.section` CTA row (`instance.html:489-496`) — the contact action now lives in beat 03, and two contact CTAs weakens both.

  **(h) `<style>` additions** — append a `pi-peak-*` block after the existing `pi-*` group (~236-246), token-only, structural literals only:
  ```
  .pi-peak-stage    grid, 1.6fr/1fr → 1fr at 900px, gap var(--spacing-2xl), > * { min-width: 0 }
  .pi-peak-panel    background var(--color-bg); border 1px solid var(--color-border);
                    border-radius var(--radius-md); padding var(--spacing-lg); min-width: 0
  .pi-peak-ethics   same light panel, margin-top var(--spacing-2xl)
  .pi-peak-head     the small heading above the ethics panel
  ```
  Add a comment saying **why** the two panels are light on a dark band (the ported `study-*` and `fw-ethics-*` families are light-token) — the next reader will otherwise "fix" it.

  **(i) `scroll-margin-top`** — update the selector list at line 53 to the new ids (`#labeling, #beat-brief, #instance-appearance, #beat-built, #beat-keep, #verify`). Keep the 90px value.

  **(j) Script tags** — no new tags. `instance.mjs` imports what it needs (the existing `<!-- instance.mjs imports … itself -->` comment stays true). Update that comment to name `spine.mjs`, `wcag-receipts.mjs` and `instance-pack.mjs`, and to keep saying **no `dock.mjs`, no `pack-boot.js`, no `pack-derived.mjs`** and why.

  **(k) Head comment** — extend it to describe the spine structure and the new beat ids, so `build-instance.mjs`'s maintainer sees the seams. It is stripped from a real instance by `stampShell` (`build-instance.mjs:114`), so its content is internal-only and safe.

- **PATTERN**: `index.html:180-366` for band/beat/close/row-list structure; `instance.html`'s own `pi-*` prefix convention and its `<style>` header rationale for new rules.

- **GOTCHA — `validateAssembly` check 5, the sharpest trap.** `\bdemo\b` and `\bfictional\b` are **rejected in rendered body text** (`build-instance.mjs:238-239`), where "rendered" = the body with comments/scripts/styles/tags stripped. Therefore:
  - **Author the peak's copy fresh. Do not port `index.html`'s peak strings.** `index.html:236` is `<span class="peak-tag">Fictional product</span>` and `index.html:247-252`'s `.peak-note` names the private-instance case explicitly. Both would fail.
  - Every demo-only phrase must sit inside a `<span data-when="demo">` or `<p data-when="demo">`.
  - After writing, run the audit command in the validation section over the *new* markup before wiring anything.
- **GOTCHA — Mechanism B's delete regex only matches `span|p`** (`build-instance.mjs:163`). A `data-when="demo"` on a `div`/`section` survives the delete, then loses its marker at line 170 → demo copy in a real instance, and check 5 catches it only if the words are literally there. **Every new demo region must be a `<span>` or a `<p>`.** If a whole block needs a demo variant, use several `<p data-when="demo">`, not a wrapper. Do not extend the regex in this ticket.
- **GOTCHA — no static `hidden` outside `<style>`.** `validateAssembly` check 1 (`build-instance.mjs:203-204`) fails any element carrying a bare `hidden`, and Mechanism B only un-hides elements carrying `data-when="real"`. So a new static `hidden` must be paired with `data-when="real"` or must not exist. (JS-created `hidden` — the ethics reveal panel, refusal rows — is fine: it never appears in the stamped HTML.)
- **GOTCHA — `{{name}}` only inside `data-when="real"` regions.** Check 1 rejects any residual `{{`. The demo shell shows no `{{name}}` (the demo variant carries a literal), so a company-seeded week-one line needs the `data-when="demo"` / `data-when="real"` pair, exactly as `instance.html:442-450` does today.
- **GOTCHA — the five Mechanism A anchors must survive verbatim** (`build-instance.mjs:124-157`, each a hard throw on miss): the `tokens.neutral.css` `<link>`, `<title>`, `<meta name="description">`, `<span id="instance-name">…</span>`, and the `INSTANCE_CONFIG:start`/`:end` marker pair with its `window.INSTANCE_CONFIG = …;` assignment. Do not reformat, re-quote, or move them.
- **GOTCHA — three load-bearing wizard ids.** `initIntake` returns early (`factory-intake.mjs:239`) unless `#factory-wizard`, `#reskin-preview` **and** `#factory-narrative` all exist. Moving `#ethics-gate` is safe (individually guarded, `factory-intake.mjs:242`), but it must still exist *somewhere* on the page before `initIntake` runs, or the Manipulation Matrix silently vanishes.
- **GOTCHA — recorded trap: `body { overflow-x: clip }` on shipped pages makes `position: sticky` a no-op for all descendants.** Do not reach for a sticky receipts rail in the peak stage; balance the two columns structurally.
- **GOTCHA — recorded trap: CSS entrance animations on elements rebuilt every tick restart-and-blank.** The receipts host is rebuilt on every wizard change (`onAnswers`). Do not give it an entrance keyframe; if one is wanted, gate it behind a discrete-render class the way `peak.mjs:268/298` does.
- **VALIDATE**:
  ```bash
  # structural: every id the engines look up still exists exactly once
  for id in instance-notices instance-intake factory-wizard reskin-preview factory-narrative \
            ethics-gate instance-prototype prototype-capability prototype-claim \
            instance-links instance-player instance-name instance-pack-control; do
    printf "%-22s %s\n" "$id" "$(grep -c "id=\"$id\"" instance.html)"; done   # every line → 1
  # the five stamping anchors
  grep -c 'href="/system/tokens.neutral.css"' instance.html   # → 1
  grep -c 'INSTANCE_CONFIG:start' instance.html               # → 1
  grep -c 'INSTANCE_CONFIG:end' instance.html                 # → 1
  # demo/fictional words appear ONLY inside span|p data-when="demo"
  node -e 'const h=require("fs").readFileSync("instance.html","utf8");
    const body=(h.match(/<body[\s\S]*<\/body>/)||[,""])[0]
      .replace(/<!--[\s\S]*?-->/g," ").replace(/<script[\s\S]*?<\/script>/gi," ")
      .replace(/<style[\s\S]*?<\/style>/gi," ")
      .replace(/\s*<(span|p)\b[^>]*\bdata-when="demo"[^>]*>[\s\S]*?<\/\1>/g," ")
      .replace(/<[^>]+>/g," ");
    for (const w of [/\bdemo\b/i,/\bfictional\b/i]) if (w.test(body)) throw new Error("leak: "+w+" outside a data-when=demo span|p");
    if (/\{\{/.test(h.replace(/<!--[\s\S]*?-->/g," "))) console.warn("note: {{ present — must be inside data-when=real");
    console.log("honesty audit ok")'
  # no static hidden outside <style>
  node -e 'const h=require("fs").readFileSync("instance.html","utf8").replace(/<style[\s\S]*?<\/style>/gi," ");
    const m=h.match(/<[a-zA-Z][^>]*\shidden(?=[\s\/>])/g)||[];
    console.log(m.length?("static hidden found: "+m.join(" | ")):"no static hidden ok")'
  ```
- **SATISFIES**: AC #1 · AC #3 · AC #4 · AC #5

---

### UPDATE `system/instance.mjs` — spine wiring + live receipts

- **IMPLEMENT**:

  **(a) Imports.** Add `import { registerBeat } from "./spine.mjs";`, `import { derive } from "./derive.mjs";`, `import { buildReceipts } from "./wcag-receipts.mjs";`, `import { initInstancePack } from "./instance-pack.mjs";`. Extend the header's "What it does" list with the spine beats, the receipts and the pack control, and add a **boot-contract** paragraph: importing `spine.mjs` self-registers `beat-hero`, which is **inert here** because this page has no `#beat-hero` element (`spine.mjs:55`) — the instance's hero id is `instance-hero`, so `spine.mjs` needs no change. Also state the deliberate **non**-imports (`pack-derived.mjs`, `close.mjs`, `dock.mjs`, `peak.mjs`) and why, naming `hydrateFromSharedLink`.

  **(b) Beat 1 · hero.** `registerBeat("instance-hero", { effect: heroEffect, activateOn: "load" })`. The effect sets `data-spine="ready"` on `ctx.el` in a `finally` and does nothing else — the entrance is the inherited `.page-hero` CSS cascade, and there is deliberately **no re-skin**: the page already wears the company's committed pack, so a derive-flush-revert would either be invisible (revert lands on the same palette) or would strip the company pack mid-visit. Say that in a comment. Register from inside `init()` (after the config guard) so a Node import never touches the DOM.

  **(c) Beat 2 · peak.** `registerBeat("beat-built", { effect: peakEffect, activateOn: "visible" })`, mirroring `peak.mjs:363`'s reasoning: the peak is below the fold and its readiness handle exists so a later VR addition cannot race the skeleton→content swap (recorded trap #105). The effect sets `data-peak="ready"` on `ctx.el` in a `finally` on **every** path. Because `renderPrototype`'s chain (C) is already independent and already sets `#instance-prototype[data-prototype="ready"]`, this beat's effect should **await nothing** it does not own — resolve the handle once the receipts are rendered (or once their honest fallback is), not once the composed view loads.

  **(d) Live WCAG receipts + the scoped peak palette (D1).** Pass `onAnswers` into the existing `initIntake` call in `mountWizard` (`instance.mjs:157`) — the seam `factory-intake.mjs:271` publishes on mount and on every change:
  ```js
  onAnswers: (axes) => renderPeakDerivation(axes),
  ```
  `renderPeakDerivation(axes)` does **two** things from one `derive(axes)` call, so the screen and its receipts can never disagree (D1):
  1. **Re-skin the panel.** Apply `result.tokens` as inline custom properties on `.pi-peak-panel`, clearing the previously-applied keys first. Mirror `factory-intake.mjs:280-283` exactly, including the module-level `appliedKeys` array — do **not** diff or merge, and do **not** apply to `:root` (that would strip the pinned company pack, the recorded inline-vs-committed trap).
  2. **Render the receipts.** `replaceWith(buildReceipts(result.checks))` on the live `[data-peak-receipts]` host.

  On a `derive()` throw: clear `appliedKeys` (so the panel falls back to inheriting the committed company pack), leave the static seed in place, and `console.error` — nothing fails on stage, the same shape as `factory-intake.mjs:289-295`'s `fallback`.

  - Read the receipts host **fresh each call**: `buildReceipts` returns a *new* element that `replaceWith` swaps in, so a cached node goes stale after the first render (the same `replaceWith` contract `peak.mjs:279-282` uses). Query `[data-peak-receipts]` inside the peak band each time.
  - `.pi-peak-panel` is a **stable** node (it wraps `#instance-prototype`; `renderStudy` replaces the mount's children, never the panel), so caching *that* reference is safe.
  - **Do not** re-implement `readInputs`: on the instance the wizard's own axes (already seeded from the company package, already including `brandColor`) are the complete input. There is no derived record and no `getHomeAnswers`.
  - **Do not** give the receipts host or the panel a CSS entrance keyframe — both are rebuilt on every `onAnswers` tick, and the recorded restart-and-blank trap applies (gate behind a discrete-render class if an entrance is ever wanted, as `peak.mjs:268/298` does).

  **(e) Extend `unclaim` to the peak band.** `renderPrototype`'s `unclaim` (`instance.mjs:220-225`) currently removes `#prototype-capability` and rewrites `#prototype-claim`. Those now live in the peak's `.peak-side`, so the existing calls keep working — **but** the peak band now also carries the receipts host and a `.peak-note` that describes an adjustable screen. Extend `unclaim` so both fallback paths (no `composition` configured; composed view failed to load) also neutralise the peak note. An instance built without `--compositions` must make **zero** capability claims in the peak band while still rendering the honest link/placeholder card. This is the sharpest honesty requirement in the ticket: unlike home, the instance has **no honest static still** to fall back to (home's `.peak-screen` mock is a Verdant still; the instance's screen only exists if a composed view shipped).
  - Receipts are **independent** of the composed view: they come from the wizard's live derive, so they stay valid and must **not** be withdrawn when the prototype fails.

  **(f) Pack control.** Call `initInstancePack({ name })` from `init()`, synchronously, right after `renderLinks(config.links)` — it depends only on the head `<link>` and `config.name`, never on the package fetch, so a package failure must not take the control down. Mirror the comment at `instance.mjs:280-281`.

- **PATTERN**: `system/peak.mjs:209-221` (the `finally` readiness contract) · `system/intake-beat.mjs:38-51` (registering a beat whose effect calls `initIntake`) · `system/instance.mjs:260-311` (`init()`'s existing independent-chain structure and its inline chain labels (A)/(B)/(C) — add (D) for the pack control and note the beats).
- **IMPORTS**: as listed in (a). All relative (Node-parse-safe).
- **GOTCHA**: `registerBeat` **throws** on a non-string id (`spine.mjs:47-49`) and returns `undefined` with no DOM (`spine.mjs:50`) — safe either way, but keep the calls inside `init()`.
- **GOTCHA**: `activateOn: "load"` calls `activate()` **synchronously** inside `registerBeat` (`spine.mjs:56`). Register the hero beat after the config guard so a malformed `INSTANCE_CONFIG` still produces exactly one honest error card and nothing else runs.
- **GOTCHA**: the peak beat's `'visible'` activation means the receipts may render **before** the beat activates (the wizard mounts on the package chain, which does not wait for scroll). That is correct and must not be "fixed" — the handle means "this beat has done its own work", not "the receipts are present".
- **GOTCHA**: `derive()` throws on an out-of-ruleset axis value (`derive.mjs:23-45`). The company package's axes are validated by `genCompanyPackage`, but `renderReceipts` still wraps `derive` in `try/catch` — the same fail-closed rule `factory-intake.mjs:289-295`'s `fallback` follows.
- **VALIDATE**: `node --check system/instance.mjs && node -e "import('./system/instance.mjs').then(()=>console.log('node-import clean'))"` (must print, and must not throw — proves nothing touches `document` at import; note this also imports `spine.mjs`, `factory-intake.mjs`, `trace-player.mjs`, `agentic-study.mjs`, `action-bus.mjs`, `derive.mjs`, `wcag-receipts.mjs`, `instance-pack.mjs`, so it is a real closure test)
- **SATISFIES**: AC #1 · AC #2 · AC #3

---

### VALIDATE the stamp path — a real `build-instance.mjs` run, both ways

- **IMPLEMENT**: Run the builder against the committed fixture brief, twice: **without** `--compositions` (the zero-claims path) and **with** it (the full peak). `--out` **must** be outside the repo — `insideRepo()` refuses any in-repo target by inode identity (`build-instance.mjs:43-55`), and CLAUDE.md makes this a hard rule. Use the scratchpad.
- **PATTERN**: CLAUDE.md §Commands — the per-company instance invocation; `agent-layer/fixtures/acme/brief.md` + `agent-layer/fixtures/northwind-real/brief.md` are the committed fixtures.
- **GOTCHA — the fixture brief's slug does NOT match the committed manifest. Fix it first, do not accept the guard firing as a pass.** `compositionRef` (`build-instance.mjs:184-190`) requires every `proposal` to read `/proto/compositions/<brief-slug>/…`. `proto/compositions/northwind/index.json`'s proposals read `/proto/compositions/northwind/…`, but `agent-layer/fixtures/northwind-real/brief.md`'s head declares **`"slug": "northwind-real"`** (verified). Pairing them fails the contract, so the **entire peak-with-composed-view path would never be built or walked** and AC #5 would go unverified. Recipe: copy that brief to the scratchpad and rewrite one field — `"slug": "northwind-real"` → `"slug": "northwind"`. It keeps `fictional: false`, which is what exercises the real-provenance notice + sources path; the privacy guard is satisfied because `--out` is outside the repo.
- **GOTCHA**: run from a directory that is **not** the repo (the command's contract is "from the jobs folder"); paths resolve from cwd.
- **VALIDATE**:
  ```bash
  SP=/private/tmp/claude-501/-Users-Berzins-Desktop-Linards-current-ux-factory/78c2308d-eb96-42a3-99e8-590658238308/scratchpad
  R=/Users/Berzins/Desktop/Linards_current/ux-factory
  cd "$SP" && rm -rf inst-a inst-b brief-northwind.md
  # slug-matched scratch brief (outside the repo) so --compositions satisfies compositionRef
  sed 's/"slug": "northwind-real"/"slug": "northwind"/' \
    $R/agent-layer/fixtures/northwind-real/brief.md > "$SP/brief-northwind.md"
  node -e 'import("'$R'/agent-layer/lib.mjs").then(m=>{
    const s=m.parseCompanyBrief("'$SP'/brief-northwind.md").head.slug;
    if(s!=="northwind") throw new Error("slug is "+s+" — --compositions will fail the path contract");
    console.log("slug ok: "+s)})'
  # (1) no composed view → must build, and must make ZERO capability claims in the peak
  node $R/agent-layer/build-instance.mjs "$SP/brief-northwind.md" \
    --out "$SP/inst-a" --pack $R/system/tokens.verdant.css --trace $R/traces/pack-seed-verdant.jsonl
  # (2) with the bespoke composed views
  node $R/agent-layer/build-instance.mjs "$SP/brief-northwind.md" \
    --out "$SP/inst-b" --pack $R/system/tokens.verdant.css --trace $R/traces/pack-seed-verdant.jsonl \
    --compositions $R/proto/compositions/northwind
  # BOTH must print "build-instance northwind ✓" (run 2 also "· prototype 2 composed views").
  # A failure here is a real failure — never read the path-contract guard firing as a pass.
  grep -c 'data-when=\|{{' "$SP"/inst-a/index.html "$SP"/inst-b/index.html   # → 0 each
  grep -ic '\bdemo\b\|\bfictional\b' "$SP"/inst-b/index.html                 # → 0
  # the pack link is the COMPANY pack in both — this is what makes the pack control's
  # pre-selection observable at all (the committed shell's link is still tokens.neutral.css)
  grep -c 'href="/system/tokens.northwind.css"' "$SP"/inst-b/index.html      # → 1
  # the static receipts seed states no verdict
  grep -c 'Pass AA\|Fails AA' "$SP"/inst-b/index.html                        # → 0
  ```
  Then serve **`inst-b`** and walk Level 4 steps 4–5 there (see the note in that section): the pack control shows `northwind` pre-selected ↔ neutral, and the peak shows the composed view + live receipts + the ethics gate. Serve **`inst-a`** and confirm its peak shows the honest placeholder with **no** badge, **no** "adjust it below" claim, and a neutralised peak note — while its receipts still render from the wizard.
- **SATISFIES**: AC #3 (stamp seams resolve, no contradictory copy) · AC #5

---

### RUN the three CI gates + the regen cascade

- **IMPLEMENT**: Run `drift-check` and `token-lint` locally, then regenerate `loc-summary.json` and decide whether the two approach baselines moved.
- **PATTERN**: `.github/workflows/verify.yml` — the exact commands CI runs. `drift-check` step 1 `node --check`s **every** tracked `.mjs` (`git ls-files "*.mjs"`), so both new modules are covered automatically.
- **GOTCHA — recorded trap:** `gen-loc-summary` reads **git-tracked** content, so a `--check` before staging is a false "no drift". **Stage first, then check.**
- **GOTCHA — recorded trap:** adding tracked source files ⇒ regen `loc-summary.json` **and**, if the numbers `approach.html` renders moved, the two approach baselines in the same PR. Two new `system/*.mjs` files plus a materially larger `instance.html`/`instance.mjs` will move the runtime group's rounded line count. A grand-total-only flip fails `verify` but does **not** churn the approach baselines (approach renders the runtime group only) — check which happened before regenerating any PNG.
- **GOTCHA — recorded trap:** `npm run update:docker` will not rewrite a baseline whose only change is below pixelmatch's per-pixel threshold; `rm` the PNG to force it.
- **GOTCHA**: `drift-check` needs `tooling/style-dictionary/node_modules` (`npm ci` there first in a fresh worktree).
- **VALIDATE**:
  ```bash
  cd tooling/style-dictionary && npm ci && cd ../..
  node agent-layer/gen-loc-summary.mjs                 # regenerate
  git add -A system/ instance.html                     # explicit paths — parallel sessions share this dir
  node agent-layer/gen-loc-summary.mjs --check         # AFTER staging
  node tooling/drift-check.mjs                         # exit 0
  node tooling/token-lint.mjs                          # exit 0
  git diff --cached --stat system/loc-summary.json     # did it move?
  # if approach's rendered numbers moved:
  cd tooling/visual-regression && npm ci && npm run update:docker   # then commit approach-{neutral,saulera}.png
  ```
- **SATISFIES**: AC #6 · AC #8

---

### VALIDATE cross-engine + the craft bar

- **IMPLEMENT**: Serve the repo and drive `/instance.html` in Chromium, Firefox and WebKit; then run the `portfolio-design` CHECKLIST over the new surfaces.
- **PATTERN**: recorded practice — v3 motion tickets get real Chromium + Firefox + WebKit functional checks locally via Playwright (`webkit` = Safari; Playwright resolves at `~/node_modules`, `require.resolve` + `pw.default.chromium`). Python's `http.server` serves `.mjs` as `text/javascript`, so module loading works.
- **GOTCHA — recorded trap:** static-serve headless checks of `instance.html` log `ERR_CONNECTION_REFUSED` to the absent Worker — that is expected fixture degradation, not a regression. Only `/index.html` renders truly zero-error.
- **GOTCHA**: the VR gate's bundled Chromium has missed a real Safari/Chrome-stable grid blowout before (recorded trap, PR #54). The new `.pi-peak-stage` grid holds a wide composed view and a receipts column — add `min-width: 0` to both children and **eyeball it in a real browser**, not only headless.
- **GOTCHA**: `document.startViewTransition` is absent in Firefox — confirm the pack swap still applies instantly there.
- **VALIDATE**: for each of the three engines, confirm: hero entrance plays and `#instance-hero[data-spine="ready"]` lands · the wizard mounts and a radio change re-skins `#reskin-preview` **and** updates the receipts · the peak's composed view renders and its adjust control refuses an out-of-vocabulary value · the ethics matrix places and reveals ("Not placed" on the maker side for a package with no matrix booleans) · the pack control swaps company↔neutral and the whole page re-skins · zero console errors other than the expected Worker refusal. Then: reduced-motion pass (`prefers-reduced-motion: reduce` — every entrance instant, rest == final), keyboard-only pass (every control reachable, visible focus), and 320px-width pass (no horizontal body scroll; wide content scrolls inside its own container).
- **SATISFIES**: AC #5 (craft bar §6.4) · AC #6

---

### COMMIT + PR

- **IMPLEMENT**: One atomic commit; message = what + doc reference. Then the PR with a **`Closes #81` trailer**.
- **PATTERN**: CLAUDE.md §Git — "A PR body MUST carry a `Closes #N` trailer" and "a ticket's plan, report and review belong in the same PR".
- **GOTCHA**: the plan (`.claude/plans/v3-private-instance-spine.md`), the report (`.claude/reports/v3-private-instance-spine-report.md`) and the review (`.claude/code-reviews/pr-<N>-review.md`) must all be **committed in this PR** — four of PRs #97–#100's artifacts were written and left uncommitted in their worktrees, one `git worktree remove` from being lost.
- **GOTCHA**: verify the branch immediately before committing (parallel sessions share this working directory) and stage by explicit path.
- **VALIDATE**: `git log --oneline -1` shows the ticket ref; `gh pr view --json body --jq .body | grep -c "Closes #81"` → `1`; `gh pr checks` — `verify` green, `visual` red-but-non-blocking is expected on `feature/v3-*` (D11 freeze is job-level, so the run is green while the check shows red and `mergeState` reads UNSTABLE, not CLEAN).
- **SATISFIES**: AC #7 · AC #8

---

## TESTING STRATEGY

This repo has **no test suite, no linter, no type-checker** — CLAUDE.md is explicit: don't hunt for or invent one. "Done" = run the surface you touched. The equivalents:

### Unit-level (the closest thing that exists)

- `node --check` on every changed/new `.mjs` — and `node tooling/drift-check.mjs` does this across all tracked `.mjs` as its step 1.
- **Node-import cleanliness** as the real unit test: `node -e "import('./system/instance.mjs')"` must resolve without touching `document`. This exercises the whole import closure (spine, factory-intake, trace-player, agentic-study, action-bus, derive, wcag-receipts, instance-pack) and is what catches an accidental self-boot or a stray top-level DOM read.
- `node -e` export-shape assertions on `wcag-receipts.mjs` and `instance-pack.mjs`.

### Integration-level

- **The `build-instance.mjs` round trip is the integration test.** `validateAssembly` runs eight checks over the assembled deploy dir (stamping residue, pack link, title, `INSTANCE_CONFIG` shape, demo/fictional body text, every referenced asset resolving, every composed view validating through the real refusal engine, `_headers` noindex). Run it **both** with and without `--compositions` — the two paths exercise the claim/unclaim honesty branch.
- **The generator-drift gate** (`node tooling/drift-check.mjs`) is the regression suite for the committed-artifact contract.
- **Manual page drive** in three engines, per the cross-engine task above.

### Edge Cases

Each must be exercised by hand and its behaviour confirmed honest:

| Edge case | Required behaviour |
| --- | --- |
| `INSTANCE_CONFIG` absent/malformed | One honest error card in `#instance-notices`; nothing else attempted (`instance.mjs:267-270`). |
| Package fetch 404 | Error card in the notices; the trace, prototype and **pack control** still work (independent chains). |
| Trace fetch 404 | Error card in `#instance-player` only; the peak and wizard unaffected. |
| **No `composition` in config** (an instance built without `--compositions`) | Peak band makes **zero** capability claims: badge removed, claim rewritten, peak note neutralised, honest link/placeholder card rendered. **Receipts still render** (they come from the wizard, not the composition). |
| Composed-view fetch fails / manifest empty | Same unclaim, plus an error card naming what broke (`instance.mjs:249-256`). |
| Company package with **no** `improvesLives`/`wouldUseIt` (northwind) | `makerMatrix: null` → the reveal shows the reader's quadrant on the left and "Not placed" + the frequency-filter explanation on the right (`factory-intake.mjs:673-678`). |
| `derive()` throws on a package axis | Receipts keep their static (verdict-free) seed; `.pi-peak-panel`'s applied keys are cleared so it inherits the committed company pack; `#reskin-preview` gets `data-reskin="fallback"` and the narrative shows the honest note. No blank surface, no stale palette. |
| Reader overrides the brand colour, then scrolls to the peak (**D1**) | The composed screen and its receipts describe the **same** palette — one `derive()` call feeds both. Page chrome and the dark band stay on the pinned company pack (scoped, never `:root`). |
| Reader overrides an answer **before** the peak beat has activated | Receipts and the panel palette are already correct when the beat activates — the wizard mounts on the package chain and does not wait for scroll. The `data-peak="ready"` handle means "this beat did its own work", not "the receipts exist". |
| No-JS reader | The static receipts seed names what *will* be measured and states no pass/fail verdict — so it is true with JS off, and true after `stampShell` ships it into a real instance. |
| Instance whose stamped pack **is** neutral (unstamped demo shell) | Pack control renders one honest row, no swap affordance. |
| `prefers-reduced-motion: reduce` | Every entrance instant; rest == final; the pack swap snaps rather than crossfades. |
| Firefox (no View Transitions) | Pack swap applies instantly via the `else` branch; no unhandled rejection. |
| `?brand=…` appended to an instance URL | **No effect** on the pinned pack — because `pack-derived.mjs` is never imported here. Verify explicitly: load `/instance.html?brand=ff0000` and confirm the company pack is untouched and no `factory-pack*` key is written. |
| 320px viewport | `.pi-peak-stage` collapses to one column; no horizontal body scroll; the composed view scrolls inside its own panel. |
| Keyboard only | Every radio, accordion, matrix quadrant, select and CTA reachable with a visible focus ring; the ethics reveal announced (`role="status"`). |

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
# every tracked .mjs (this is drift-check's own step 1, run standalone here)
git ls-files '*.mjs' | xargs -n1 node --check && echo "syntax ok"
node tooling/token-lint.mjs      # undeclared / orphan / DTCG-valid — exit 0
```

### Level 2: Unit Tests (module-shape + Node-import cleanliness)

```bash
node -e "import('./system/wcag-receipts.mjs').then(m=>{
  const k=Object.keys(m).sort().join(',');
  if(k!=='RECEIPT_USAGES,buildReceipts') throw new Error('exports: '+k);
  console.log('wcag-receipts ok')})"
node -e "import('./system/instance-pack.mjs').then(m=>{
  if(typeof m.initInstancePack!=='function') throw new Error('missing initInstancePack');
  console.log('instance-pack ok')})"
node -e "import('./system/instance.mjs').then(()=>console.log('instance import closure clean'))"
node -e "import('./system/peak.mjs').then(()=>console.log('peak import clean'))"
grep -c 'function buildReceipts' system/peak.mjs   # → 0 (extraction complete)
```

### Level 3: Integration Tests (drift + the stamp round trip)

```bash
cd tooling/style-dictionary && npm ci && cd ../..
node agent-layer/gen-loc-summary.mjs
git add -A system/ instance.html
node agent-layer/gen-loc-summary.mjs --check   # AFTER staging (recorded trap)
node tooling/drift-check.mjs                   # exit 0
# the stamp round trip, both ways — see the dedicated task above for the full block
```

### Level 4: Manual Validation

```bash
npx serve .        # or: python3 -m http.server 4757
# then open http://localhost:<port>/instance.html
```

**Two of these steps are NOT verifiable on the committed shell.** `instance.html`'s head link is still `tokens.neutral.css` (the Mechanism A anchor `stampShell` rewrites), so the pack control's captured slug is `neutral` → it renders the single-row no-swap path, and the demo config's `composition` is northwind's. **Steps 4 and 5 must be walked in the stamped `inst-b` deploy dir** built in the previous task (`cd $SP/inst-b && npx serve .`) — that is the only context where a company pack is pre-selected and swappable. Steps 1–3 and 6–8 are valid on both.

Walk the spine in order and confirm each:

1. **Hero** — eyebrow/h1/sub/jump-nav rise in a stagger; the `hl` underline draws; `#instance-hero[data-spine="ready"]` present after ~1s; the company name is the subject of the first sentence.
2. **Labels** — fictional notice, then speculative notice + the two source links (`target=_blank`, `rel=noopener noreferrer`), before any other content.
3. **Beat 01** — the eight curated accordions open to answer + reasoning; the wizard mounts pre-seeded (`#0A5C6B` / compact / hunt / monthly); changing an answer re-skins `#reskin-preview` and updates the narrative's WCAG table **and** the peak's receipts headline.
4. **Interstitial** *(in `inst-b` only)* — the pack control shows the company pack pre-selected and neutral below it; picking neutral re-skins the whole page (chrome included); picking the company pack restores it; a reload returns to the stamped pack (no persistence, by design).
5. **Peak** *(in `inst-b` only for the pack-agreement half)* — dark band; the composed view renders in its light panel with the ask-tabs; the receipts show the real pass-count and per-pair ratios; adjusting a prop re-renders; an out-of-vocabulary pick shows the verbatim path-naming refusal; the ethics matrix places and reveals.
   - **D1 check, the one an implementer is most likely to get wrong:** change the brand colour in beat 01, then scroll back to the peak. The composed screen's own colours **must** move with the receipts — same palette, one `derive()` call. If the screen still wears the pinned pack while the receipts describe the new one, the scoped `.pi-peak-panel` token application is missing or is being applied to the wrong node.
   - Confirm the re-skin is **scoped**: while the panel wears the overridden palette, the page chrome, the beat heads and the dark band itself stay on the committed company pack. Nothing on this page ever writes to `:root`.
6. **Beat 03** — one close card: the week-one line, the contact CTA, the handoff-pack copy and `#instance-links`. **No share control.**
7. **Beat 04** — the trace player replays with its "Real run, curated for length" label; the lead no longer says "headline exhibit"; the evidence row-list links out.
8. **Zero console errors** other than the expected absent-Worker refusal (recorded: expected on this page).

Then repeat 1–8 in Firefox and WebKit, plus the reduced-motion, keyboard-only, and 320px passes.

### Level 5: Additional Validation (Optional)

- `.claude/skills/portfolio-design/references/CHECKLIST.md` — run it over every new surface (required by AC #5, not optional).
- The VR gate is **frozen non-blocking** on `feature/v3-*` (D11): a red `visual` check is expected and does not block. `instance.html` is not in the gate set, so the only VR risk here is a *collateral* change to `peak.mjs`/`dock.mjs`/`portfolio.css` — which this plan forbids beyond a comment. If you want local confidence: `cd tooling/visual-regression && npm run update:docker` and confirm only the approach pair moved (and only because of `loc-summary`).
- Optional Chromium CDP throttle if the peak's assembly feels heavy on the composed view.

---

## ACCEPTANCE CRITERIA

Derived from the ticket, one line each, traced from every task's **SATISFIES**:

- [ ] **AC #1** — `instance.html` renders the spine (hero → brief → peak → keep → verify) pre-seeded from the scenario/company config, through the **shared** seams: `registerBeat` from `spine.mjs`, `initIntake(config)` from `factory-intake.mjs`, `renderStudy` from `agentic-study.mjs`. **No forked wizard, no forked spine** — `spine.mjs`, `factory-intake.mjs`, `agentic-study.mjs`, `close.mjs`, `pack-derived.mjs` and `dock.mjs` carry no behavioural diff.
- [ ] **AC #2** — the company pack is **pre-selected** in a pack control on the instance, alongside the neutral base, and picking either re-skins the whole page by swapping one stylesheet line. (Owner-decided implementation: an instance-local control, not `dock.mjs`.)
- [ ] **AC #3** — honesty notices intact and first: fictional → speculative → scheme-guarded sources, rendered from the package's `copy.json` exactly as a real instance renders them. Every capability claim in the peak band is withdrawn on both fallback paths. The static receipts seed states **no** contrast verdict. **The peak's screen and its receipts always describe the same palette (D1)** — a receipt that describes a palette the screen beside it is not wearing is an honesty failure, not a cosmetic one.
- [ ] **AC #4** — `build-instance.mjs`'s demo→real stamp seams still resolve: all five Mechanism A anchors present and verbatim; every demo-only phrase inside a `<span|p data-when="demo">`; `{{name}}` only inside `data-when="real"`; no contradictory copy.
- [ ] **AC #5** — craft bar §6.4: custom interactions · reasoned motion (token-derived springs, no copied keyframes) · from-scratch components · honest empty/error/loading states for all four chains · real accessibility (keyboard, focus, live regions, reduced motion) · no dropped frames or cross-engine inconsistency in Chromium + Firefox + WebKit. `portfolio-design` CHECKLIST run.
- [ ] **AC #6** — no regressions: `drift-check` and `token-lint` exit 0; `/index.html`'s peak renders identically after the `buildReceipts` extraction; every other shipped page untouched.
- [ ] **AC #7** — docs accurate: `instance.html`'s head comment, `instance.mjs`'s header, `peak.mjs`'s epic-#86 note and `dock.mjs`'s stale line-ref all describe what the code now does.
- [ ] **AC #8** — the regen cascade is complete in this PR: `loc-summary.json` regenerated (staged **before** `--check`), and the two approach baselines regenerated if approach's rendered numbers moved.
- [ ] **AC #9** — the PR carries a `Closes #81` trailer, and the plan + report + review are committed in it.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully (Levels 1–4; Level 5 CHECKLIST run)
- [ ] `drift-check` + `token-lint` exit 0 on a clean, staged tree
- [ ] `build-instance.mjs` validated **both** with and without `--compositions`, `--out` outside the repo, using a **slug-matched** scratch brief (both runs printed `✓` — a path-contract failure is not a pass)
- [ ] D1 verified by hand: overriding the brand colour moves the peak screen **and** its receipts together, scoped to the panel, with `:root` untouched
- [ ] Level 4 steps 4–5 walked in the stamped `inst-b` dir, not on the committed shell
- [ ] Cross-engine functional pass: Chromium + Firefox + WebKit
- [ ] Reduced-motion, keyboard-only and 320px passes done
- [ ] Honesty audit clean: no `demo`/`fictional` outside a `data-when="demo"` `span|p`; no static `hidden`; no residual `{{`
- [ ] `?brand=…` on an instance URL provably does **not** disturb the pinned pack
- [ ] `loc-summary.json` regenerated; approach baselines regenerated **if** their numbers moved
- [ ] Every acceptance criterion met
- [ ] Plan + report + review committed in the PR; `Closes #81` trailer present

---

## OPEN QUESTIONS / ASSUMPTIONS

**Resolved by the owner (2026-07-25), before this plan was written:**

1. **Pack control** → an **instance-local** control (company pack pre-selected ↔ neutral), not `dock.mjs`. Reason: `dock.mjs`'s `PACK_RE`/`PACK_IDS` allowlist would make the radio show "neutral" while the page wears the company brand, and generalising it edits `position: fixed` chrome captured in all 18 VR baselines while VR is frozen (D11).
2. **Instance close** → **pack + contact only**, no share control. Reason: `close.mjs`'s share params encode a derived-pack brand + axes, meaningless against a pinned company pack; the unlisted URL is already forwardable.

**Assumptions this plan makes** — each verifiable in the tree, each named so a reviewer can check it:

- **A1.** The instance's peak is the **existing** `renderStudy` surface promoted into a dark band with receipts and the ethics gate — *not* `peak.mjs` reused with a swapped composition source. Rationale: `renderStudy` (#89) is strictly richer than `peak.mjs`'s single-select adjust, so reusing `peak.mjs` would **regress** shipped work. This consciously diverges from `peak.mjs`'s own header note about epic #86; the note gets updated in the same PR rather than left contradicting the code. *If this is wrong, the peak's implementation changes substantially — flag before starting.*
- **A2.** The instance's hero carries **no** re-skin beat. The head `<link>` is stamped to the company pack (`validateAssembly` check 2 **fails** a build whose link still reads `tokens.neutral.css`), so a neutral→brand re-skin that persists is structurally impossible, and a flush-and-revert would land back on the same palette. The hero beat exists only to set the readiness handle and to make "the instance consumes the spine" literally true.
- **A3.** A **different beat id** (`instance-hero`, not `beat-hero`) is the right way to avoid touching `spine.mjs`. Verified: `spine.mjs:55` registers a beat whose mount is absent as inert and returns early, so importing `spine.mjs` on the instance never runs `heroBeat`'s canned re-skin.
- **A4.** The Manipulation Matrix **moves** into the peak band (PRD §6.1 beat 3: the peak is "the one guess-then-reveal beat"), inside a light panel so the ported `fw-ethics-*` light-token rules need zero overrides. The alternative — leaving it in beat 01 — is cheaper but leaves the peak without its guess-then-reveal.
- **A5.** The receipts derive from the **wizard's live axes** (via `onAnswers`), so they update as the reader overrides an answer and remain valid even when no composed view shipped. There is no derived record and no `getHomeAnswers` on this page.
- **A5b (D1).** Because the receipts are live, the peak's composed screen must be too: one `derive(axes)` call both re-skins `.pi-peak-panel` (scoped inline custom properties) and builds the receipts, so the two can never describe different palettes. Scoped, never `:root` — the pinned company pack survives untouched outside the panel. *If D1 were resolved the other way (receipts computed once from the package's committed axes), drop the `onAnswers` wiring entirely and render the receipts inside the peak beat's effect instead.*
- **A6.** `instance.html` stays **out** of the VR gate. The `data-*="ready"` handles are added regardless so a later ticket can add it without re-deriving them.
- **A7.** #77's OPEN tracker state is an artifact of missing `Closes` trailers, not an unmet dependency. Verified against `git log` on `feature/v3-close` (`7fd50b3`…`d2b1026`).

**Questions that remain open (do not block; answer differently and only the noted piece changes):**

- **Q1.** Should the instance's `#verify` beat also link the *public* agentic study? This plan says no — the study surface is embedded in this page's own peak, so pointing at the public copy reads as duplication. Cheap to add later.
- **Q2.** Does the instance want an analytics beat (`/factory/built`-equivalent) for reaching its peak? Home fires `trackFactoryBuilt` from `peak.mjs`'s success path. Deliberately **not** added: the PRD's spine-completion metric is about the public demo, per-instance volume is single-digit, and `analytics.mjs`'s `PRODUCTION_HOST` is empty so an unlisted `pages.dev` origin would not report anyway. Recorded rather than silently dropped.
- **Q3.** Should `pack-derived.mjs`'s unguarded `hydrateFromSharedLink()` self-boot become mount-gated? It is a latent cross-page hazard (any page importing that module inherits `?brand=…` handling). This plan **avoids** it rather than fixing it — a fix touches a module on the home critical path and belongs in its own ticket. Worth filing.

---

## NOTES (open canvas)

### Why this ticket is smaller than its ~600–1,000 LOC estimate suggests — and where the real cost is

Almost every capability the instance's spine needs **already runs on the page**: the wizard, the live re-skin, the narrative with its WCAG table, the Manipulation Matrix, the composed-view study surface with its adjust-and-refuse, the trace player, the honesty notices. The ticket is a **re-composition**, which is exactly what "consume the spine via configuration, never forked" should feel like when the seams were built right.

The cost is not in writing code, it is in **not breaking six invariants that intersect in one file**:

1. `initIntake`'s three load-bearing mount ids (`factory-intake.mjs:239` returns early without all three).
2. `stampShell`'s five Mechanism A anchors (each a hard throw).
3. Mechanism B's `span|p`-only demo-delete regex.
4. `validateAssembly`'s eight checks — especially `\bdemo\b` / `\bfictional\b` in rendered body text.
5. The honesty contract's claim/unclaim discipline, which is *harder* here than on home because the instance has no honest static still.
6. Home's byte-identical behaviour after the `buildReceipts` extraction (index's VR baseline).

That is why the task list front-loads structural validation commands and why the honesty audit is a scripted check rather than a reading pass.

### The dependency-avoidance chain — the plan's one non-obvious architectural move

```
peak.mjs  ──imports──▶  intake-beat.mjs  ──imports──▶  factory-intake.mjs
    │                          │
    │                          └──imports──▶  share-state.mjs
    └──imports──▶  pack-derived.mjs   ◀── the problem
                        │
                        └── module tail (line 413, UNGUARDED by any mount):
                            wireBeatBrand(hydrateFromSharedLink())
                                          │
                                          └─▶ on ?brand=… :  applyToRoot(:root)
                                                             writeRecord()
                                                             wear()
```

Importing `peak.mjs` on the instance to reuse `buildReceipts` would drag that whole chain in, and a forwarded instance URL carrying a stale `?brand=` param would silently override the company's pinned pack — the single worst failure this page can have, because the pinned company pack *is* the product being demonstrated. Extracting 45 lines into `wcag-receipts.mjs` costs one new file and removes the hazard structurally rather than by comment.

The same reasoning rejects "parameterize `close.mjs`": it imports `pack-derived.mjs` too.

### Alternatives weighed and rejected

| Alternative | Why rejected |
| --- | --- |
| Parameterize `peak.mjs` (composition source + vocab + subject + answers seam) and mount it on the instance | Its own header promises this, and the advisor's first read favoured it — but it **downgrades** the instance: `renderStudy` (#89) already gives ask-tabs, per-prop controls, a bus pane and provenance; `peak.mjs` gives one composition and one `<select>`. Regressing shipped work for seam purity is the wrong trade. Recorded as A1 and written into `peak.mjs`'s header. |
| Generalize `dock.mjs`'s pack allowlist and reuse the dock | Owner-rejected. Edits `position: fixed` chrome in all 18 baselines while VR is frozen; the payoff is one shared control on one off-nav page. |
| Instance hero re-skins neutral→company and stays | Structurally impossible: `validateAssembly` check 2 fails a build whose head link still reads `tokens.neutral.css`, so the page is *already* branded pre-paint. |
| Leave the Manipulation Matrix in beat 01 | Cheaper (no light-panel work) but leaves the peak without the PRD's "one guess-then-reveal beat". |
| Style the ethics gate for the dark band with inverse-token overrides | ~15 override rules on classes ported verbatim from `factory.html`; the ported-verbatim property is worth more than the visual purity. A light panel on a dark ground is also what home does with `.peak-screen--live`. |
| Add `instance.html` to the VR gate in this ticket | Its baseline would capture the *demo* config of a shell whose whole purpose is to be stamped per company. The readiness handles are added anyway so a later ticket can. |
| Keep the trace as "the headline exhibit" | Contradicts PRD D8 (evidence one disclosure deep) and competes with the peak for the reader's attention. |
| **D1 alt:** receipts computed once from the package's committed axes (no `onAnswers`) | True of the pinned pack and trivially self-consistent, but the receipts then stop responding to the reader's overrides — losing the "every answer visibly steers the stage" property that is beat 01's whole point (PRD §6.1). Chose the scoped panel re-skin instead. |
| **D1 alt:** apply the derived tokens to `:root` like home's hero does | Would strip the pinned company pack for the rest of the visit — the recorded inline-vs-committed trap, and the single worst failure this page can have (the company pack *is* the demonstration). |

### Sequencing / rollout risk

- **This is the scope-hammer's first cut** (PRD §6.3). Keeping it separable is a real constraint, and the design honours it: revert this PR and the instance falls back to the #43 five-station shell with zero effect on any other page. The only shared-file diffs are the `buildReceipts` extraction (mechanical, behaviour-preserving) and one comment in `dock.mjs`.
- **VR is frozen non-blocking on `feature/v3-*`** (D11, job-level `continue-on-error`), so a red `visual` check with a green run is expected, and `mergeState` reads UNSTABLE rather than CLEAN. #82 removes the freeze and does the full regen. The consequence for this ticket: a collateral pixel regression in `peak.mjs`/`portfolio.css` would **not** be caught here — which is why the plan forbids behavioural change in both.
- **Parallel-session hazard:** this working directory is shared. Verify the branch immediately before each commit and stage by explicit path.

### Data flow after this ticket

```
window.INSTANCE_CONFIG ──▶ instance.mjs init()
   │
   ├─(D) initInstancePack({name})  ──▶ head <link> swap        [sync, config-only]
   ├─(C) renderPrototype(config)   ──▶ #instance-prototype     [own chain; unclaim on failure]
   │                                    └─▶ renderStudy(vocab, entries, subject)
   ├─(A) package fetch ─▶ copy.json  ─▶ renderNotices          [#instance-notices]
   │                   └▶ intake.defaults.json
   │                        ├─▶ renderCuratedIntake            [#instance-intake]
   │                        └─▶ mountWizard ─▶ initIntake({ scenarios, onAnswers })
   │                                             │  └─▶ #reskin-preview · #factory-narrative · #ethics-gate
   │                                             └─▶ onAnswers(axes) ─▶ derive(axes)   ← ONE call, D1
   │                                                                    ├─▶ tokens ─▶ .pi-peak-panel
   │                                                                    │             (scoped inline props,
   │                                                                    │              NEVER :root)
   │                                                                    └─▶ buildReceipts(checks)
   │                                                                         └─▶ [data-peak-receipts]
   └─(B) trace fetch ─▶ parseTrace ─▶ renderTracePlayer         [#instance-player, in #verify]

spine.mjs seam:  instance-hero (load) ─▶ data-spine="ready"
                 beat-built  (visible) ─▶ data-peak="ready"
                 beat-hero            ─▶ registered INERT (no #beat-hero on this page)
```

Four chains stay independent — one failing never blanks another. That property is already in `instance.mjs` and must survive the restructure.

### Confidence

**9.5/10** for one-pass success. What earns it: every engine already runs on this page, every seam already exists and is exercised, both design ambiguities were resolved by the owner before writing, D1 is decided rather than left to the implementer's instinct, the fixture-slug mismatch that would have silently skipped the peak's validation is caught with a recipe, and the honesty/stamping traps are enumerated with scripted checks rather than left to a reading pass.

The residual 0.5 is the `.pi-peak-stage` grid holding a wide composed view — the recorded cross-engine grid trap (PR #54) says that specific shape has bitten before, so it needs a real-browser eyeball, not a headless pass. Second-order risk, cheap to check: the scoped D1 re-skin runs on every `onAnswers` tick, and the colour input fires on drag (`input`), so watch that the panel's repaint does not stutter under a continuous drag — `factory-intake.mjs`'s `run(false)` path is the precedent for keeping such a repaint static.

## AMENDMENTS

<!-- Append-only. Newest at the bottom. Leave empty at creation. -->
