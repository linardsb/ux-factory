# Feature: Your-brand input + derived-pack persistence (D5b) — ticket #74

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing. Pay special attention to naming of existing utils/exports — import `derive` from `system/derive.mjs`, mirror the `isColorToken` + `setProperty` idiom in `system/spine.mjs`, and keep the `pack-boot.js` committed-pack path **byte-for-byte** as it is today.

## Feature Description

Beat 2b of the v3 spine ("try your brand", PRD §6.1 D3) plus the **D5b persistence mechanic** ("wear it while you explore"). A visitor enters a **brand colour** (and, optionally, a **company name for labeling only**) in the `#beat-brand` region of `index.html`. The real view-time `derive()` engine turns that colour into a full, WCAG-checked colour palette; the demo applies it **stage-side** (custom properties on `:root`) so the visitor watches their own product take the stage. A new module `system/pack-derived.mjs` serialises the derived colour set to `localStorage`, and one small guarded branch in the pre-paint `system/pack-boot.js` re-applies it on navigation **before first paint** — so the whole portfolio can wear the visitor's brand as they explore. The persistence is honestly labelled ("derived here, not an official `<label>` design system") and a visitor-entered name renders **only inside that label**, never as an affiliation claim.

**Scope note:** the owner's #74 comment had routed three deferred PR #91 `askedAxes` fixes here; per Open Questions #1 (resolved 2026-07-24) those **move to #81** — #74 stays purely the your-brand feature and branches independently off `main`.

## User Story

As a **hiring manager evaluating this candidate in the first 90 seconds**
I want to **drop in my own product's brand colour and watch the site rebuild itself around it, then keep wearing my brand as I click through the rest of the site**
So that **I experience the candidate's re-skin-from-one-value claim performed on my own product, continuously — not read a claim about it.**

## Problem Statement

The v3 spine's beat 2b currently ships only a **static placeholder** (`index.html:141-163`, the `.brand-try` affordance): oversized numeral, prompt copy, an empty swatch. There is no input, no derivation, and no persistence. Two capabilities are missing:
1. **The bounded input → live derivation → stage-side apply** (D3): the reader cannot yet pull their own product onto the stage.
2. **Site-wide persistence of a *derived* pack** (D5b) — the PRD's oldest-standing open question. Committed packs (saulera/verdant) persist across pages via the hard-allowlisted `pack-boot.js` line-swap, but a visitor-derived pack is **not a committed stylesheet**; carrying it across pages pre-paint (storage format, allowlist posture, VR implications, honest labelling) is an unresolved architecture decision — now decided (architecture "Your-brand persistence = (b)").

## Solution Statement

- **`system/pack-derived.mjs` (new)** — the D5b record helpers + the `#beat-brand` input wiring. It runs `derive()` on the entered colour with throwaway non-brand axes, keeps **only the `color-*` tokens** (`--`-prefixed), applies them to `:root`, and serialises them to a versioned `localStorage` record. Separable functions (`deriveBrandTokens` · `applyToRoot`/`clearRoot` · `readRecord`/`writeRecord`/`clearRecord` · `wear`/`unwear`) so the "apply" step and the "persist + select" step are independent — spike 2's outcome (persist vs stage-only) becomes a one-line change, and the three states below are explicit.
- **One guarded branch in `system/pack-boot.js`** — the committed-pack path (saulera/verdant line-swap) stays **byte-for-byte identical**; a new `"derived"` selector reads the record and applies its `--color-*` custom properties to `:root` **pre-paint**, under a **hard allowlist** (`^--color-` key + hex value). The **no-record / no-selector default remains a guaranteed no-op** (the VR gate and first paint depend on this).
- **`#beat-brand` region in `index.html`** — replace the static placeholder with the input control + optional name field + an explicit "wear it across the site" affordance + a reset + the honest derived-label region; add the `<script type="module">` tag for `pack-derived.mjs`.
- **Brand-input styling in `system/portfolio.css`** — token-only (no literals, no brand values), covering empty / focus / applied / error states (craft-bar requirement).
- *(The `askedAxes` hardening once routed here moved to #81 — Open Questions #1. Not part of #74.)*

**Three explicit persistence states** (the crux of the design):

| State | `factory-pack` | `factory-pack-derived` | `:root` on home | On navigation |
| --- | --- | --- | --- | --- |
| **never-derived** (default) | absent / `neutral` / committed | absent | untouched | pack-boot **no-op** (VR-critical) |
| **derived, not worn** | absent / committed | record present | derived props applied (this page) | neutral (or committed) — not re-applied |
| **derived, worn** | `"derived"` | record present | derived props applied | pack-boot **re-applies pre-paint** |

Entering a colour ⇒ *derived, not worn* (apply stage-side + store record). The explicit "wear it" affordance ⇒ *derived, worn* (set selector). Reset ⇒ stop wearing (clear selector + `:root` props), **record kept** so #76 can re-offer without re-entry. The VR no-op guarantee rides on *never-derived* — which is exactly what VR contexts have (no storage) — so keeping a record after reset is VR-safe.

## Out of Scope / Non-Goals

- **Not included: the redesigned pack control (the persistent dock utility).** That is **#76** — it reads/reset this record and elevates "wear it" into the redesigned dock. #74 ships the record + mechanism + a minimal in-beat wear/reset affordance so persistence is self-testable; #76 owns the polished global selector. Do **not** touch `system/dock.mjs`.
- **Not included: the built-screen peak combining brief + brand** (#75) and the investment close (#77).
- **Not included: applying `spacing-*` / `type-*` / patterns / ethics from the your-brand input.** Colour only (brand = colour, D5). Applying scales site-wide from a colour-only input would reflow every page and is wrong — mirror `spine.mjs`'s `isColorToken` filter.
- **Not included: free-text product input, file upload, or any network send of the entered colour/name.** The name is a display label only; nothing is sent anywhere (unchanged honesty + no-upload non-goals, PRD §8).
- **Not changing: the committed-pack (saulera/verdant) path in `pack-boot.js`.** It must stay byte-for-byte identical (VR-relied-upon, `visual.spec.mjs:58`).
- **Not changing: `#beat-hero` / `#beat-intake` at-rest states** (owned by #72/#73; rest == final).

## Feature Metadata

**Feature Type**: New Capability (spine beat 2b) — the `askedAxes` fold-in moved to #81 (Open Questions #1)
**Estimated Complexity**: Medium
**Primary Systems Affected**: `system/pack-derived.mjs` (new) · `system/pack-boot.js` · `index.html` (`#beat-brand`) · `system/portfolio.css` · `system/spine.mjs` (hero guard — **#72 scope crossing**, see task 4b) · `system/loc-summary.json` + VR baselines (cascade)
**Dependencies**: none new. Consumes `system/derive.mjs` (view-time, zero-dep). Vanilla throughout.

## Related Work

**Implements**: [#74](https://github.com/linardsb/ux-factory/issues/74) — P2b · Your-brand input + derived-pack persistence (D5b)   ·   **Epic**: [#70](https://github.com/linardsb/ux-factory/issues/70) — portfolio v3; architecture `docs/epics/portfolio-v3-experience.architecture.md` (row "Your brand persistence (D5b)"; "Derived-pack record (D5b), shape"; boundary "Honesty labeling for derived brands"; "VR mode (D11)").

**Back-references** (inherits decisions from):
- `docs/epics/portfolio-v3-experience.prd.md` §6.1 (beats, D3/D5/D5b), §8 (amendments), §9 (open questions this closes).
- #71 (`0750d3d`) — laid the `#beat-brand` mount id + static placeholder + the region contract (`index.html:22-50`). This fills that disjoint region.
- #72 (`7131975`) — `system/spine.mjs`: the `heroBeat` **is the mirror pattern** for `isColorToken` + `derive()` + `setProperty("--"+k, v)` on `:root` (`spine.mjs:115-140`). #74 deliberately does **not** import `spine.mjs` (keeps the parallel-design independence; wires its own beat under a DOM guard).
- #73 (`bf23597`) + #91 (`ef95f08`) — `system/factory-intake.mjs` + `system/intake-beat.mjs`; the `askedAxes` warn (`factory-intake.mjs:388-394`) is the code the fold-in refactors. **This is #74's base** (see Open Questions #1).

**Forward-references**:
- #76 — redesigned pack control: reads `factory-pack-derived`, offers "your brand", sets/reset `factory-pack="derived"`. Closes the in-page dock↔derived transition (NOTES §Known integration gaps).
- #75 — the peak composes a screen from **brief + brand** (consumes the same derived colour concept).

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: READ THESE BEFORE IMPLEMENTING

- `system/pack-boot.js` (all 15 lines) — **the file you extend.** Classic parser-blocking script; committed branch line 12-14. Its default no-op is VR-critical. The `link[href="/system/tokens.neutral.css"]` selector and the `factory-pack` key are the contract.
- `system/spine.mjs` (lines 109, 115-140, 168-177) — **mirror pattern AND a bug you must fix (task 4b).** `CANNED_AXES`, `isColorToken`, `heroBeat`'s `derive()` → filter `color-*` → `root().style.setProperty("--"+k, v)` → revert. Your apply/clear is the same mechanism (minus the auto-revert); you do **not** need the `crossfade`/View-Transition wrapper. **Critical:** `heroBeat`'s revert (`spine.mjs:130,136`) `removeProperty("--"+k)`s the exact `--color-*` keys pack-boot sets for a **worn brand** — its comment (`:134`) assumes the active pack is a *stylesheet* line-swap, which the derived pack is **not**. So on the home page a worn brand is **stripped** after the ~1.2s hero intro (every other page keeps it). Task 4b guards it.
- `system/derive.mjs` (lines 22-41 `validate`, 45-180 `derive`, return at 171-179) — **the engine.** `derive(input)` returns `{ input, tokens, notes, checks, ... }`. `tokens` keys are **un-prefixed** (`"color-accent"`), values are hex. It **throws** a plain `Error` naming the input on a non-`#rrggbb` `brandColor` (line 25) — that throw is your input-validation path (catch → honest inline error). Required input: `brandColor`, `density`, `rewardType`, `frequency` (supply throwaway defaults for the last three; only `color-*` is used).
- `system/factory-intake.mjs` (lines 204-216 `initIntake` boundary, 225-227 `active`/`answers`, 237-264 `run`/`fallback` — the apply/fallback pattern, 384-394 `renderWizard`'s `askedAxes` filter+warn) — **the fold-in target** + a second mirror for the "apply custom props, fall back on throw" idiom (scoped to a preview root; yours is `:root`).
- `system/dock.mjs` (lines 13-19 `PACKS`/`PACK_RE`, 49-66 `applyPack`, 113-119) — **do not edit**, but read: it writes the same `factory-pack` key (`applyPack:65`) and reflects the active pack from the stylesheet `href` (`activePack:43-47`). Explains the coexistence (NOTES §Known integration gaps).
- `index.html` (lines 13-17 head links + `pack-boot.js` tag, 22-50 region contract, 141-163 the `#beat-brand` placeholder you replace, 307-313 the module `<script>` block) — the surface you edit.
- `system/portfolio.css` — where the brand-input organism styles go (token-only; grep existing `.brand-try`, `.hero-*`, `.card` for the house idiom). ~975 LOC; append a small `#beat-brand` block.
- `agent-layer/gen-loc-summary.mjs` (lines 22-26 `GROUPS`, 32-49) — proves `system/pack-derived.mjs` lands in the **`runtime`** group (regex `^system/(wc/)?[^/]+\.(css|mjs|js)$`); reads the **git-index blob** (`git show :<path>`), so you must `git add` **before** regen.
- `approach.html` (lines 285-299) — renders `loc.groups.find(g => g.id === "runtime")` **`.files` and `.linesApprox`**. Adding `pack-derived.mjs` bumps the runtime file count (exact) ⇒ approach's rendered number changes ⇒ its two baselines churn.
- `tooling/drift-check.mjs` (lines 27-38 syntax, 59-65 loc-summary, 68-74 system-graph) + `.github/workflows/verify.yml` (lines 36-48) — the **blocking** gate (`drift-check` + `token-lint`) and the **non-blocking** `visual` gate on `feature/v3-*` (`continue-on-error`, line 48).
- `.claude/code-reviews/pr-91-review-2.md` (findings 1-3) — the exact spec for the fold-in.

### New Files to Create

- `system/pack-derived.mjs` — D5b record helpers + `#beat-brand` wiring (the one new module the ticket/architecture names).
- *(spike only, not committed)* a throwaway Playwright harness under the scratchpad for spike 2 (cross-engine no-flash confirm).

### Relevant Documentation — READ BEFORE IMPLEMENTING

- `docs/epics/portfolio-v3-experience.architecture.md`
  - Row **"Your brand persistence (D5b)"** + **"Derived-pack record (D5b), shape"** (line 24): `{ v: 1, source: "derived", label, ts, tokens: { "--color-accent": "…", … } }`. **This is the record contract — match it exactly** (note the `--` prefix on token keys).
  - Boundary **"Honesty labeling for derived brands"** (line 29) + **"Nothing fails on stage"** (line 28) + **"VR mode (D11)"** (line 31).
- `.claude/skills/portfolio-design/references/CRAFT.md` — read **before** writing CSS (numeric craft rules).
- `.claude/skills/portfolio-design/references/CHECKLIST.md` — run **before** commit (empty/error/loading/focus states, cross-browser, a11y). The epic mandates build sessions run under this skill (`Skill(portfolio-design)`).
- Memory traps that apply here: `overflow-clip breaks sticky`, `loc-summary baseline cascade`, `loc-summary counts tracked only`, `cross-engine motion verify`, `headless render: data pages Worker-refused`, `v3 VR-freeze live`.

### Patterns to Follow

**localStorage keys (the contract #76 consumes):**
- `factory-pack` — the **selector**, shared with `dock.mjs`/`pack-boot.js`. Values: absent / `"neutral"` (default no-op) · `"saulera"` · `"verdant"` · **`"derived"`** (new).
- `factory-pack-derived` — the **JSON record**, independent of the selector (survives a toggle away and back). Shape = the architecture's record contract.

**The record (build it, never hand-write it):**
```js
{ v: 1, source: "derived", label: "<sanitised name | 'your brand'>", ts: Date.now(), tokens: { "--color-accent": "#…", "--color-fg": "#…", … } }
// tokens = derive(colour).tokens filtered to color-* and re-keyed with a leading "--".
```

**Apply/clear on `:root`** (mirror `spine.mjs:115,128`):
```js
const isColorToken = ([k]) => k.startsWith("color-");           // from derive() output (un-prefixed)
Object.entries(tokens).filter(isColorToken).map(([k,v]) => ["--"+k, v]);   // record keys are --prefixed
root().style.setProperty(k, v);   // apply     root().style.removeProperty(k);   // clear
```

**Input validation = derive()'s throw** (mirror `factory-intake.mjs:241-264`): wrap `derive()` in try/catch; on throw, apply nothing and show an honest inline error — never blank the beat. The bounded UI never reaches the throw; it is the guarantee.

**Name sanitisation (XSS + honesty):** `String(name).trim().slice(0, 40)`, rendered via `textContent` **only** (never `innerHTML`), and only ever inside the honest label string. Empty → `"your brand"`.

**`pack-boot.js` hard allowlist** (mirror the committed branch's posture — storage content never applied uninspected): iterate the record's `tokens`; apply an entry only if `key` matches `/^--color-[a-z0-9-]+$/` **and** `value` matches `/^#[0-9a-fA-F]{3,8}$/`. `derive()` only ever emits hex for `color-*`, so this is exact, not defensive bloat.

**File header** (project convention): open `pack-derived.mjs` with a header citing `epic #70 ticket #74 · PRD §6.1 D3/D5b · architecture "Your-brand persistence = (b)"`.

---

## IMPLEMENTATION PLAN

### Phase 0: Isolated worktree + branch + spike 2 (the first gate)

**Depends on:** #73/#91 present in the base (see Open Questions #1 — the fold-in forces this).

- **Cut #74 in a FRESH git worktree** from the synced `origin` ref — do **not** work in the shared main worktree. It is dirty with a **parallel session's** uncommitted `approach.html`, `system/components.css`, `work.html` (session git status + PR #91 re-review both name these). This is the recorded `[shared-worktree-parallel-sessions]` trap, and it is **not optional here**: task 9 runs `npm run update:docker`, which **screenshots the working tree**, so any parallel edit would be baked into the regenerated baselines (and `gen-loc-summary` reads the git index, so an unstaged file yields a false "no drift"). A clean worktree is the only way to regenerate `index-*`/`approach-*` baselines truthfully.
- **Spike 2 (~0.5d, gate):** confirm the pre-paint `:root`-custom-property apply shows **no flash-of-neutral** on navigation across **Chromium · Firefox · WebKit**. Decision rule: imperceptible flash → proceed with persistence; otherwise ship **stage-only** (no `wear()`), keep the record + `pack-boot` branch dormant, and document the honest fallback in the beat copy + the plan's AMENDMENTS. (Low risk by construction: this is the same pre-paint mechanism as the committed line-swap, minus the stylesheet re-fetch.)

### Phase 1: The record module (`pack-derived.mjs`) — pure helpers

**Independent of:** Phase 4 (the fold-in). These two phases share no file and can be done in either order.

- Author the separable helper API (derive → color-only `--`-prefixed map · apply/clear on `:root` · read/write/clear record · wear/unwear selector · validate/sanitise). No DOM wiring yet — Node-import-safe (`node --check` clean; no top-level DOM/storage access).

### Phase 2: Pre-paint + on-load apply of the worn brand (`pack-boot.js` + hero guard)

**Depends on:** the record shape from Phase 1 (keys + validation).

- Add the `"derived"` branch to `pack-boot.js`: committed path first and **unchanged**; `"derived"` → parse record → hard-allowlisted `setProperty`. Default returns before touching the DOM.
- Guard `spine.mjs` `heroBeat` against the worn-derived state (task 4b) so the hero's revert doesn't strip a worn brand on home. **#72 scope crossing.**

### Phase 3: `#beat-brand` wiring + markup + CSS

**Depends on:** Phases 1-2.

- Wire the input in `pack-derived.mjs` (self-boot under `typeof document !== "undefined"`).
- Replace the `index.html` placeholder with the real control + honest label region; add the `<script type="module">` tag.
- Add token-only `#beat-brand` styles in `portfolio.css` (empty/focus/applied/error states).

### Phase 4: `askedAxes` fold-in — ⛔ DEFERRED TO #81 (not part of #74)

**Per Open Questions #1 (owner, 2026-07-24):** this moved to #81, where per-company `askedAxes` is actually generated. **Do not implement it in #74.** The spec is retained in task 8 below purely as the lift-ready block to paste into #81's plan (or a standalone PR against #73/#91 if landed sooner). `system/factory-intake.mjs` is untouched by #74.

### Phase 5: Generators + baselines cascade + validation

**Depends on:** Phases 1-4 (new tracked file must exist and be `git add`ed).

- `git add system/pack-derived.mjs` → regen `loc-summary.json` → regen VR baselines (index + approach, both packs) → run the full gate.

---

## STEP-BY-STEP TASKS

Execute in order, top to bottom.

### 1. CREATE `feature/v3-your-brand` in a fresh, isolated worktree
- **IMPLEMENT**: `git fetch origin` (updates refs, does **not** touch the dirty main worktree). Then cut a clean worktree from **`origin/main`** (per Open Questions #1 — the fold-in moved to #81, so #74 is independent; `main` already has #71+#72):
  ```
  git worktree add -b feature/v3-your-brand ../ux-factory-wt-74 origin/main
  ```
  (`origin/main` now has **#71+#72+#73+#91** — merged via PR #92 `f2b0316`, so the full v3 beat-2 incl. the live intake is present; the local `feature/v3-intake-stakeholder-rewrite` branch is stale, 6 behind — don't work in it.)
  Sync tooling deps in the new worktree (a fresh checkout has none): `npm ci` in `tooling/style-dictionary` (drift-check's gen-handoff child-invokes SD) and `tooling/visual-regression` (update:docker). Prefer `Skill(worktree-create)` to do the add + dependency sync + health check in one pass.
- **PATTERN**: memory `[shared-worktree-parallel-sessions]` ("temp worktree for off-branch commits") + `[local agent + visual gate notes]` ("fresh worktree needs npm ci in portal/visual-regression/style-dictionary").
- **GOTCHA**: Base needs **#71 (`#beat-brand` region) + #72 (`spine.mjs`)**, both on `main` — confirm: `test -f system/spine.mjs && grep -q 'beat-brand' index.html && echo OK`. (If the owner later chooses option 3 — standalone hardening — that ships on the #73 branch, not here.)
- **VALIDATE**: in `../ux-factory-wt-74`: `git status` is **clean** (no parallel edits); `git branch --show-current` = `feature/v3-your-brand`; `system/spine.mjs` + `#beat-brand` present.
- **SATISFIES**: prerequisite for all ACs; protects the VR-baseline regen (task 9).

### 2. SPIKE `pre-paint derived apply` (cross-engine, gate)
- **IMPLEMENT**: In the scratchpad, write a throwaway harness: serve the repo (`python3 -m http.server` from repo root — serves `.mjs` as `text/javascript`), pre-seed `localStorage` (`factory-pack="derived"` + a hand-built valid record), then in Playwright drive Chromium/Firefox/WebKit through a home→`/approach` navigation and (a) assert `getComputedStyle(document.documentElement).getPropertyValue("--color-accent")` is the derived value at `domcontentloaded`, and (b) capture a first-paint screenshot/video per engine to eyeball for a neutral flash.
- **PATTERN**: memory `cross-engine motion verify` (webkit=Safari; Playwright resolves at `~/node_modules` — `require.resolve` + `pw.default.chromium`).
- **GOTCHA**: this is a temporary prototype of the Phase-2 branch, not the shipped code — it exists only to make the persist-vs-stage-only decision before you wire the UI.
- **VALIDATE**: all three engines show the derived accent present pre-paint with no perceptible neutral flash → proceed with `wear()`. Otherwise record the stage-only fallback decision in AMENDMENTS.
- **SATISFIES**: AC0 (spike gate) → informs AC1.

### 3. CREATE `system/pack-derived.mjs` (helpers only)
- **IMPLEMENT**: header (governing-doc citation) + constants (`SELECTOR_KEY="factory-pack"`, `RECORD_KEY="factory-pack-derived"`, `RECORD_VERSION=1`, `NAME_MAX=40`, `DEFAULT_AXES={density:"comfortable",rewardType:"self",frequency:"daily"}`) + exports:
  - `deriveBrandTokens(hex)` → `derive({brandColor:hex, ...DEFAULT_AXES}).tokens` filtered to `color-*`, re-keyed `"--"+k`. (Throws exactly as `derive()` does on a bad hex — do not swallow here.)
  - `buildRecord(hex, name)` → the record object (`ts: Date.now()`, `label: sanitizeName(name) || "your brand"`).
  - `applyToRoot(tokens)` / `clearRoot(tokens)` — `document.documentElement.style.setProperty/removeProperty`.
  - `readRecord()` (parse + validate `v===1 && source==="derived" && tokens` object, else `null`) · `writeRecord(rec)` · `clearRecord()`.
  - `wear()` (`setItem(SELECTOR_KEY,"derived")`) · `unwear()` (remove **only if** current value is `"derived"` — never clobber a saulera/verdant selection).
  - `sanitizeName(name)` (`String→trim→slice(0,NAME_MAX)`; non-string → `""`).
  - All `localStorage` access in `try/catch` (private mode → session-only, mirror `dock.mjs:65`).
- **IMPORTS**: `import { derive } from "./derive.mjs";`
- **GOTCHA**: **no top-level DOM/storage access** — the module must import cleanly under Node (`drift-check`'s syntax step runs `node --check`, and any harness may `import()` it). Record `tokens` keys are `--`-prefixed; `derive()` output is not — re-key in `deriveBrandTokens`.
- **VALIDATE**: `node --check system/pack-derived.mjs` (clean) and `node -e "import('./system/pack-derived.mjs').then(m=>console.log(Object.keys(m).sort().join(',')))"` prints the exported names without throwing.
- **SATISFIES**: AC1 (derive + apply mechanism), AC4 (record format).

### 4. UPDATE `system/pack-boot.js` — add the guarded `"derived"` branch
- **IMPLEMENT**: keep the committed branch first and **byte-identical** (`saulera`/`verdant` → line-swap → return). Add: if `pack !== "derived"` return (preserves the default no-op for absent/`neutral`/unknown). Else read `factory-pack-derived`, `JSON.parse` in try/catch, validate `rec.v===1 && rec.source==="derived" && rec.tokens`, then for each own-property apply `setProperty(k, v)` **only if** `/^--color-[a-z0-9-]+$/.test(k)` and `/^#[0-9a-fA-F]{3,8}$/.test(v)`.
- **PATTERN**: `pack-boot.js:9-15` (classic IIFE, all storage reads in try/catch, hard allowlist). Keep it a classic script (no `import`).
- **GOTCHA**: the **default path must touch nothing** — empty storage ⇒ `pack` is `null` ⇒ not saulera/verdant ⇒ not derived ⇒ `return`, DOM untouched. This is the VR/first-paint guarantee (`visual.spec.mjs:58` keys on the literal neutral URL; VR contexts have no storage). Stay small (~15 added lines); do not pull in `pack-derived.mjs` (pre-paint classic script, no modules).
- **VALIDATE**: manual — with empty storage the file is a no-op (diff the rendered `:root` inline style = none). With a seeded `"derived"` record, `--color-accent` is set pre-paint. Covered end-to-end by the spike (task 2) and task 10.
- **SATISFIES**: AC1 (pre-paint re-apply), AC2 (no-record no-op).

### 4b. UPDATE `system/spine.mjs` — guard `heroBeat` against the worn-derived state (#72 scope crossing)
- **IMPLEMENT**: at the top of `heroBeat` (`spine.mjs:121`), extend the early-return guard so a **worn brand is never stripped**. Today `if (reduce) return;` skips the re-skin; add the worn-derived case: `if (reduce || (() => { try { return localStorage.getItem("factory-pack") === "derived"; } catch { return false; } })()) return;`. When derived is worn, pack-boot has already applied the brand to `:root`; the hero's on-arrival green-demo-then-revert would `removeProperty` those same `--color-*` keys and drop the brand on home. Skipping keeps the worn brand stable while the hero's CSS entrances (hero-rise/hl-draw) still play. The `finally` still sets `data-spine="ready"` in every path (unchanged).
- **PATTERN**: the existing reduced-motion early-return in `heroBeat` (`spine.mjs:124`) — same shape, same `finally` ready-signal.
- **GOTCHA**: this edits **#72's file** — surface it in the PR body as a deliberate scope crossing (the bug is introduced by #74's new worn state, so #74 owns the fix). **No VR impact:** VR contexts have no `localStorage`, so the guard is `false` there and `heroBeat` behaves exactly as today under the gate. `spine.mjs` is in the `runtime` loc group — the +1 line is picked up by task 9's regen. Consider factoring the check into a tiny local `isWearingDerived()` helper for readability; keep it storage-safe (try/catch).
- **VALIDATE**: headless Chromium — seed a worn derived record, load home, wait past the hero hold (~1.5s), assert `:root` still carries the derived `--color-accent` (brand not stripped). With no record, home behaves exactly as today (hero re-skins then reverts to neutral).
- **SATISFIES**: AC1 (brand persists on home too), AC8 (hero does not strip the worn brand).

### 5. ADD `#beat-brand` wiring to `system/pack-derived.mjs`
- **IMPLEMENT**: `wireBeatBrand()` — `getElementById("beat-brand")`; query the control nodes by `data-*` hooks (`[data-brand-color]`, `[data-brand-name]`, `[data-brand-wear]`, `[data-brand-reset]`, `[data-brand-label]`). Keep a `current` = the applied token map (for `clearRoot` on reset). On load, `readRecord()` → if present, reflect it into the UI (input value + label) and set `current` (pack-boot may already have applied it). Handlers:
  - colour `change` → `buildRecord` in try/catch (bad hex → honest inline error, apply nothing) → `clearRoot(current)` → `applyToRoot` → `writeRecord` → reflect label → if the wear affordance is on, `wear()`. **State: derived, not worn** (unless wear is on).
  - wear affordance `change` → `current ? (checked ? wear() : unwear()) : noop`.
  - reset `click` → `clearRoot(current)`, `current=null`, `unwear()`, reflect null, reset inputs. **Keeps the record** (per advisor; #76 owns "forget").
  - Self-boot: `if (typeof document !== "undefined") wireBeatBrand();` at file end.
- **PATTERN**: `intake-beat.mjs` (module beside `site.js`, DOM-guarded self-boot) — but **do not import `spine.mjs`** (keep #74's independence). `factory-intake.mjs:241-264` for the derive→apply→fallback shape.
- **GOTCHA**: the empty/error/applied/focus states are **craft-bar acceptance** — build them under `Skill(portfolio-design)`, run `CHECKLIST.md`. The name is visitor input → `textContent` only, capped, only inside the honest label.
- **VALIDATE**: home in headless Chromium — enter a colour ⇒ `:root` gains `--color-accent`; the honest label reads "…derived here, not an official … design system"; reset ⇒ props gone.
- **SATISFIES**: AC1, AC3 (honest label), AC4.

### 6. UPDATE `index.html` — replace the `#beat-brand` placeholder + add the script tag
- **IMPLEMENT**: inside `#beat-brand` (`index.html:141-163`), keep the numeral/kicker/title/lead, replace `.brand-try` with the real control: a colour input (recommend native `<input type="color" data-brand-color>` for a keyboard-accessible, no-free-text picker — see Open Questions #2), an optional `<input type="text" data-brand-name maxlength="40">` (labelled "company name — for the label only"), an explicit "Wear it across the site" control (`data-brand-wear`), a reset (`data-brand-reset`), and the honest label output region (`data-brand-label`, seeded with the at-rest prompt). Add `<script type="module" src="/system/pack-derived.mjs"></script>` to the block at `index.html:307-313`.
- **GOTCHA**: `body { overflow-x: clip }` on shipped pages makes `position: sticky` a no-op (memory `overflow-clip breaks sticky`) — lay the control out structurally, do not pin. The **static at-rest markup is the VR baseline** — its rest state must be complete and final (no mid-JS blank). This markup change **churns the index baselines** (both packs) — regen in task 9.
- **VALIDATE**: `npx serve .` → home renders the control at rest under the neutral pack with no JS errors; every existing anchor still resolves.
- **SATISFIES**: AC1, AC3.

### 7. ADD brand-input styles to `system/portfolio.css`
- **IMPLEMENT**: a small token-only `#beat-brand` block — the colour affordance, the name field, the wear/reset controls, the label, and their empty/focus/applied/error states. Semantic tokens only (`--color-*`, `--spacing-*`, `--radius-*`, type tokens); **no literals, no brand values**.
- **PATTERN**: grep `portfolio.css` for `.brand-try`, `.hero-cta-row`, `.card`, `.btn` for the house spacing/type/border idiom. Read `CRAFT.md` first.
- **GOTCHA**: adds lines to a `system/*.css` file → part of the `runtime` loc group (feeds task 9's regen). Token-only or `token-lint` fails (blocking).
- **VALIDATE**: `node tooling/token-lint.mjs` green; visual eyeball under neutral + saulera (dock swap) in a real browser.
- **SATISFIES**: AC1 (craft), AC3.

### 8. ⛔ DEFERRED TO #81 — `askedAxes` boundary hardening (NOT implemented in #74; lift-ready spec)
> Retained verbatim for #81's plan (or a standalone PR on #73/#91). **Skip this task when executing #74.**
- **IMPLEMENT**: after `active`/`answers` are set (~`factory-intake.mjs:227`), add a **once-per-mount** boundary check: `if (askedAxes !== null) { if (!Array.isArray(askedAxes)) throw new Error("initIntake: askedAxes must be an array or null, got "+typeof askedAxes); const available = scenarios[active].wizard.map(a=>a.axis); const unknown = askedAxes.filter(ax => !available.includes(ax)); if (unknown.length) console.warn("factory-intake: askedAxes ["+unknown.join(", ")+"] not in \""+active+"\" (has "+available.join(" | ")+") — those axes are ignored"); }`. Then in `renderWizard` **remove** the per-render warn (`factory-intake.mjs:390-393`), keeping `const wiz = asked.length ? asked : full;` (the widen fallback stays).
- **PATTERN**: `.claude/code-reviews/pr-91-review-2.md` findings 1 (per-axis warn), 2 (Array.isArray named throw), 3 (once, not per-render). `assertScenarioConfig` (line 212) is the sibling boundary-validation idiom.
- **GOTCHA**: no real caller trips either path (`intake-beat.mjs` passes a valid 3-axis array; `factory.html`/`instance.mjs` pass `null`) → zero console output at rest → **no VR-baseline impact** on any shipped page. Keep it a **separate commit** so it's liftable (Open Questions #1). The boundary validates `askedAxes` against the **default** scenario's axes (correct for every real caller, all single-scenario or `null`); the render-time widen still protects any multi-scenario config.
- **VALIDATE**: `node -e "import('./system/factory-intake.mjs').then(m=>m.initIntake({askedAxes:'brand'}))"` → in a DOM-less Node import `initIntake` returns early at the mount guard (no throw) — so validate the throw in a headless page instead, OR unit-check the logic; at minimum confirm home renders `"1 / 3"` with **0 console output** (PR #91's runtime check).
- **SATISFIES**: AC5, AC6, AC7.

### 9. REGEN generators + VR baselines (the cascade) — explicit-path staging only
- **IMPLEMENT**: stage **by explicit path** (never `git add -A` — even in a fresh worktree, make the discipline habitual and the diff auditable): `git add system/pack-derived.mjs system/pack-boot.js system/spine.mjs system/portfolio.css index.html`. **Then** `node agent-layer/gen-loc-summary.mjs` (rewrites `system/loc-summary.json` — the `runtime` file count +1 for `pack-derived.mjs`, lines +~1–2×100 from the new module + the `spine.mjs`/`portfolio.css` edits) and `git add system/loc-summary.json`. Then regen VR baselines: `cd tooling/visual-regression && npm run update:docker` (Docker → Linux baselines). Expect churn on **`index-neutral`/`index-saulera`** (the `#beat-brand` markup) **and `approach-neutral`/`approach-saulera`** (the loc number); `git add` **only those** PNGs by path.
- **PATTERN**: memory `loc-summary baseline cascade` + `loc-summary counts tracked only` (git-index blob → add before regen) + `visual-regression baseline trap` + `[shared-worktree-parallel-sessions]` (explicit-path staging).
- **GOTCHA**: `gen-loc-summary` reads the **git index** (`git show :<path>`), so an unstaged file yields a false "no drift" — **stage first**. In the clean worktree, `update:docker` screenshots only your changes, so `work-*` and any other page's baselines stay byte-identical — if `update:docker` rewrites a baseline you didn't touch, you are in a contaminated tree, stop and recheck. If it *skips* a sub-perceptual approach diff, `rm` that PNG to force it (memory `vr-update-skips-subperceptual`). VR is **non-blocking** on `feature/v3-*` (`verify.yml:48`), but regen in-PR so #82's re-block is clean.
- **NOTE (annotated-source)**: `agent-layer/annotated-source.spec.json` extracts only from `system/components.css` + `system/derive.rules.mjs` (verified) — **neither is edited by #74**, so `drift-check`'s annotated-source step needs no regen and stays green (the clean worktree also keeps the parallel `components.css` edit out of it).
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` → "no drift"; `git status` shows **only** #74's files + `loc-summary.json` + the `index-*`/`approach-*` PNGs staged (nothing from the parallel session).
- **SATISFIES**: AC2 (VR discipline), keeps the blocking gate green.

### 10. VALIDATE full gate + cross-engine functional pass
- **IMPLEMENT**: run the blocking gate + the cross-engine functional check (below). Fix any drift.
- **VALIDATE**: `node tooling/drift-check.mjs` ✓ (syntax·token-css·annotated-source·loc-summary·system-graph·handoff·scenarios·traces) and `node tooling/token-lint.mjs` ✓; Chromium/Firefox/WebKit functional pass (task 2's harness, now against the shipped code): enter brand → apply → navigate → pre-paint re-apply → reset → neutral.
- **SATISFIES**: AC1, AC2, AC5-7, "no regressions".

---

## TESTING STRATEGY

No unit-test suite exists (CLAUDE.md: "run the surface you touched"). Testing = generators print `✓`, gates pass, and the surface renders + behaves in real browsers.

### Unit-ish (module import + logic)
- `node --check` + `import()` of `pack-derived.mjs` and `factory-intake.mjs` (no throw; exports present).
- Optional throwaway node snippet exercising `deriveBrandTokens("#2f7a4d")` (all keys `--color-*`, values hex) and `buildRecord` (shape matches the architecture contract) and the record `valid()` guard (rejects `v:2`, missing `tokens`).

### Integration (the surface)
- Home in headless Chromium (0-error — memory `headless render: data pages Worker-refused`): enter colour → `:root` gains derived `--color-*`; honest label correct; wear → nav (`/approach`) re-applies pre-paint; reset → neutral.
- The blocking gate (`drift-check` + `token-lint`) green.

### Cross-engine (craft-bar MUST — the single-engine VR gate misses this)
- Chromium · Firefox · WebKit via Playwright (memory `cross-engine motion verify`): spike 2's no-flash gate + the full enter→apply→persist→nav→reset flow. WebKit is the Safari proxy the VR gate lacks.

### Edge cases
- Empty storage → pack-boot no-op (VR-critical); `:root` untouched.
- Malformed record (`v:2`, non-hex value, non-`--color-*` key, unparseable JSON) → pack-boot applies nothing (fail-closed to neutral).
- Bad/aborted colour input → `derive()` throws → inline error, nothing applied, no console blank.
- `localStorage` unavailable (private mode) → session-only, no throw (try/catch everywhere).
- Name with HTML (`<img onerror>`) → rendered as inert text (`textContent`, capped).
- Derived worn, then dock → saulera (in-page): documented transient (NOTES §Known integration gaps), resolves on reload / by #76.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
- `node --check system/pack-derived.mjs`
- `node tooling/token-lint.mjs`  *(blocking gate — 0 undeclared / 0 orphan / DTCG valid)*

### Level 2: Unit-ish
- `node -e "import('./system/pack-derived.mjs').then(m=>console.log(Object.keys(m).sort().join(',')))"`
- `node -e "import('./system/factory-intake.mjs').then(m=>console.log(typeof m.initIntake, typeof m.SCENARIOS))"`

### Level 3: Drift + generators (blocking)
- `git add <explicit #74 paths>` **then** `node agent-layer/gen-loc-summary.mjs` (regen) → `node agent-layer/gen-loc-summary.mjs --check` (no drift). **Never `git add -A`** — the shared worktree carries a parallel session's edits; stage by path (task 9).
- `node tooling/drift-check.mjs`  *(the umbrella: syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces)*

### Level 4: Manual / functional
- `npx serve .` (repo root) → home: enter a brand colour → the site stage re-skins; label honest; "wear it" → navigate to `/approach` → brand persists pre-paint (no neutral flash); reset → neutral. Confirm every nav target resolves.
- Cross-engine Playwright harness (Chromium/Firefox/WebKit) — spike 2 gate + full flow.

### Level 5: Visual regression (non-blocking on this branch)
- `cd tooling/visual-regression && npm run update:docker` → regen `index-*` + `approach-*` baselines (both packs); `git add` the PNGs. (The CI `visual` job runs `continue-on-error` on `feature/v3-*`; regen keeps #82's re-block clean.)

---

## ACCEPTANCE CRITERIA

Mapped to the ticket + the folded-in review findings:

- [ ] **AC0 (spike 2):** cross-engine pre-paint apply shows imperceptible flash-of-neutral (Chromium/Firefox/WebKit) — **or** the stage-only fallback is implemented and honestly documented in the beat copy + AMENDMENTS.
- [ ] **AC1:** entering a brand colour derives (via real `derive()`) + applies a colour pack **stage-side** on `:root`, and — when worn — **re-applies pre-paint on navigation** with no perceptible flash.
- [ ] **AC2:** reset returns to neutral; the **no-record / no-selector default is a byte-for-byte no-op** in `pack-boot.js` (VR-critical); committed-pack path unchanged.
- [ ] **AC3:** honesty label correct — "your brand — derived here, not an official `<label>` design system"; a visitor-entered name renders **only** inside that label (inert `textContent`, capped), never as an affiliation claim; nothing is sent anywhere.
- [ ] **AC4:** closes the PRD open questions — "try your brand" honest labelling + site-wide persistence of the derived pack (record format + pack-boot branch shipped).
- [ ] ~~**AC5–AC7 (askedAxes fold-in):**~~ **moved to #81** (Open Questions #1) — not #74's criteria.
- [ ] **AC8 (hero interaction):** on the home page a **worn brand is not stripped** by the hero — `heroBeat` skips its re-skin when derived is worn, so home wears the brand like every other page (task 4b).
- [ ] Craft bar §6.4 self-audit (Cadence 6/6 · book heuristics) + real Safari/Chrome eyeball; `CHECKLIST.md` run.
- [ ] Blocking gate (`drift-check` + `token-lint`) green; VR baselines regenerated in-PR.
- [ ] No regression to #72 hero / #73 intake at-rest states.

---

## COMPLETION CHECKLIST

- [ ] Working in a **fresh isolated worktree** (`../ux-factory-wt-74`), clean tree — not the shared main worktree with the parallel session's edits.
- [ ] Phase 0 spike run across three engines; persist-vs-stage-only decision recorded.
- [ ] `pack-derived.mjs` created (helpers + wiring), Node-import-safe.
- [ ] `pack-boot.js` derived branch added; committed path byte-identical; default no-op verified.
- [ ] `spine.mjs` `heroBeat` guarded against the worn-derived state (task 4b); PR body flags the #72 scope crossing.
- [ ] `#beat-brand` markup + script tag + token-only CSS shipped; empty/error/applied/focus states built under `portfolio-design`.
- [ ] `git add` (explicit paths) → `loc-summary.json` regen → `--check` clean; index + approach baselines regenerated (both packs).
- [ ] `drift-check` + `token-lint` green; cross-engine functional pass green.
- [ ] Honesty + XSS: name is inert, capped, label-only; no network send.
- [ ] Open Question #1 (fold-in home / branch base) confirmed with the owner before merge.

---

## OPEN QUESTIONS / ASSUMPTIONS

**1. ⏳ PENDING OWNER RE-CONFIRM (facts changed 2026-07-24) — where the `askedAxes` fold-in lives. Current default below = #81; flipping to #74 is trivial.**
The owner's #74 comment routed the three PR #91 `askedAxes` fixes here on the rationale that "#74 generates per-company `askedAxes`." It does not — #74 is the *public* your-brand colour input; per-company `askedAxes` is generated by `build-instance.mjs` / the instance spine (**#81**), the true seam where a generated typo can occur.
   - **The original structural objection is now VOID:** PR #92 (`f2b0316`) merged #73+#91 into `origin/main`, so the `askedAxes` warn is already on `main`. Including the fold-in **no longer forces a stack** — #74 branches from `main` and refactors code already there. So the choice is now **purely organizational**, not structural.
   - **Surviving reasons to still prefer #81:** single-concern-PR hygiene (the epic's own slicing principle — one testable concern per ticket) + topical fit; and the fixes have **no urgency** (no current caller trips them). **Reason to keep it in #74:** the owner explicitly asked, it's now cheap (a separable commit on `main`), and it lands sooner than #81 (Wave 6).
   - **Current default in this plan = #81** (Phase 4 / task 8 / ACs 5–7 struck from #74's critical path, retained as the lift-ready spec). **To flip to #74:** re-activate Phase 4 / task 8 as its own commit, restore ACs 5–7, add `system/factory-intake.mjs` back to task-9 staging + metadata — all trivial. Awaiting the owner's pick with these corrected facts.

**2. The exact colour-input control (design decision, under `portfolio-design`).**
"No free text" + the craft bar leave the control shape open. Recommendation: native `<input type="color">` (keyboard-accessible, zero custom-picker code, genuinely "pick a colour, not free text") for the picker, optionally mirrored to a read-only hex display. Alternative: a hand-built swatch/hex field (higher craft, more code, VR-variable). The derive→apply→fallback path is identical either way, so this is not a blocker — decide in the build session. Native color inputs render browser-default swatches (minor cross-engine visual variance; VR is non-blocking on-branch, #82 re-baselines).

**3. Auto-wear vs explicit "wear it" (bordering #76).**
Plan models three states and ships an **explicit** "wear it across the site" affordance (entering a colour applies stage-side but does **not** auto-persist site-wide) — matches D5b ("the pack control selects what the whole site wears") and the advisor's read, and keeps #74 self-testable. If the owner prefers "entering a brand = wearing it," that's a **one-line** change (`wear()` in the colour handler) thanks to the separable steps. Confirm the preferred UX.

**4. Does the record also persist the visitor's intake answers?** (architecture open question, line 66). **Assumption: no** — #74 stores colour tokens only; answer-persistence is out of scope (revisit in #75/#77 if "resume where you were" is wanted).

**Assumptions baked in:** (a) colour-only application (`color-*`), no scales/patterns site-wide; (b) one selector key `factory-pack` with a new `"derived"` value + a separate `factory-pack-derived` record; (c) reset keeps the record (stop-wearing, not forget); (d) `pack-derived.mjs` does **not** import `spine.mjs`.

## NOTES (open canvas)

**Why one selector key + a separate record (not a self-contained record with its own selected-flag).** Reusing `factory-pack` means `dock.mjs` and `pack-derived.mjs` are **last-write-wins** without knowing each other's keys — the visitor's most recent choice (a committed pack in the dock, or their brand in the beat) simply wins, no precedence rule to define. The record lives under its own key so it **survives** a toggle to saulera and back, letting #76 re-offer "your brand" without re-entry. A record-carries-its-own-flag design would force `pack-boot` to arbitrate between two keys pre-paint — more logic on the hottest path, for nothing.

**Why colour-only.** `derive()` also returns spacing/type/patterns/ethics, but the your-brand input only supplies a *colour* — the other axes are throwaway defaults. Applying `spacing-*`/`type-*` site-wide from a colour input would reflow every page and misrepresent what the visitor chose. The derived **neutrals** are "the brand hue at near-zero chroma" (`derive.mjs:52-53`) — so a colour-only re-skin is exactly the calm-chrome-plus-brand-accent D5 asks for: the chrome stays calm (subliminal tint), the accent carries the brand. Mirror `spine.mjs`'s `isColorToken`.

**Known integration gaps (closed by #76, not #74 blockers).** Between #74 and #76 the *un-redesigned* `dock.mjs`: (a) shows no active-pack highlight when `factory-pack==="derived"` (it only knows saulera/verdant/neutral) — cosmetic; (b) if a visitor wears their brand then picks a committed pack **in the same page load**, the dock's line-swap is overridden by the still-inline `:root` derived custom properties (inline beats stylesheet) — the committed pack won't fully apply **until reload** (each navigation re-decides cleanly via pack-boot). #76 redesigns the dock to clear the derived props on a committed-pack selection and to surface "your brand" as a first-class entry. Both are transient, in-page-only, self-heal on reload. Flag prominently in the PR body so the reviewer/owner accepts the transient (or pulls a 2-line mitigation forward — but that would touch `dock.mjs`, out of #74's scope).

**Interaction with the #72 hero (a real bug, fixed in task 4b).** `heroBeat` (`spine.mjs:121-140`) runs on load: `derive(CANNED_AXES)` → apply the green demo's `--color-*` to `:root` → hold 1.2s → **`removeProperty("--"+k)`** (`:130,136`). Those are the *same keys* pack-boot sets for a worn brand — and `removeProperty` deletes the inline value rather than restoring it, because the hero's comment assumes the "active pack" is a *stylesheet* (true for neutral/saulera/verdant, false for the derived pack, which lives as inline `:root` props). Net: a worn brand survives on every page **except home**, where the hero strips it ~1.2s in — the worst possible page to lose it (D5b: "every page they visit afterwards is proof"). Fix = skip the hero re-skin when derived is worn (task 4b); the hero's CSS entrances still play, the brand stays stable. Considered and rejected: *revert-to-brand* (re-apply the stored record after the hold) — more coupling (the hero would read pack-derived's record) and it would still flash the visitor's brand → green → brand, which reads worse than not re-skinning at all. Skip is both simpler and better UX.

**Interaction with the #73 intake preview.** `#beat-intake`'s preview sets its **own** scoped custom properties on `#reskin-preview` (`factory-intake.mjs:248-252`), which outrank `:root`. So when the visitor wears their brand, the whole home page re-skins **except** the intake preview card, which keeps showing the *wizard's* derivation (the Verdant scenario colour + the answered density). That's acceptable — beat 2a demonstrates "answers steer the system," beat 2b demonstrates "the site wears your brand"; combining brief **and** brand is beat 3's job (#75). Do not try to reconcile them in #74.

**Honesty invariants (hard).** The name is display-only: never fed to `derive()` (only the colour is), never sent anywhere, only ever rendered inside "…derived here, not an official `<name>` design system," as inert capped `textContent`. The derived pack is always labelled speculative/derived (architecture boundary, line 29). The fold-in's `console.warn` is dev-facing — no reader-facing honesty surface is touched.

**Data-flow sketch.**
```
[#beat-brand colour input] --change--> pack-derived.wireBeatBrand
      |  derive({brandColor, ...DEFAULT_AXES})  (system/derive.mjs, real engine, may throw)
      v  filter color-* , re-key "--"+k
  buildRecord ---> applyToRoot(:root)            [state: derived, not worn]
      |        \-> writeRecord(factory-pack-derived)
      |  [wear affordance on] --> wear()  ==> setItem(factory-pack,"derived")   [state: derived, worn]
      v
  navigate --> <head> pack-boot.js (classic, pre-paint)
      reads factory-pack; "saulera"/"verdant" -> line-swap (UNCHANGED)
                          "derived" -> parse factory-pack-derived -> allowlist setProperty(:root)
                          else -> return (NO-OP, VR-critical)
  reset --> clearRoot(:root) + unwear() (record kept)   [back toward neutral]
```

## AMENDMENTS

- 2026-07-24 — **`askedAxes` fold-in provisionally set to #81** (Open Questions #1), pending owner re-confirm. First cut recommended #81 partly to avoid a #73 stack; **that structural reason is now void** — PR #92 (`f2b0316`) merged #73+#91 into `origin/main`, so the fold-in refactors code already on `main` with no stack. The #81 default now rests only on single-concern-PR hygiene + topical fit; keeping it in #74 (owner's original ask) is equally cheap. Plan currently reflects #81 (Phase 4 / task 8 / AC5–7 struck, retained as lift-ready spec); flip to #74 is trivial. Branch base = `origin/main` either way.
