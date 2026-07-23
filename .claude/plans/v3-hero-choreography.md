# Feature: Hero choreography + one real re-skin beat (ticket #72 · P1b)

> The plan below should be complete, but **validate documentation and codebase patterns and task sanity before you implement.** Pay special attention to existing utils/tokens/module names — import from the right files (`derive` from `system/derive.mjs`, the `el()` DOM idiom shape from `dock.mjs`, the reduced-motion guard form from `motion.mjs`).
>
> **Build this ticket under the house `portfolio-design` skill** (`.claude/skills/portfolio-design/`). Read `references/CRAFT.md` before writing any CSS/motion; run `references/CHECKLIST.md` before commit.
>
> Closes **GitHub issue #72** (`Closes #72` in the PR). Part of **epic #70**. Depends on **#71** (its static spine is the animation target).

## Feature Description

Add the **live layer** over #71's static home-page spine as pure progressive enhancement. #71 shipped `index.html` as five static band-chaptered beats; the hero (`#beat-hero`) already assembles in on load via an inherited pure-CSS cascade (`components.css:995-1008`). This ticket adds:

1. **`system/spine.mjs`** — the hand-written, view-time **beat-orchestration seam**. It exposes the registration API the later beats plug their stage effects into (#73 intake · #75 peak · #77 close), observes/activates beats, and fires a beat's analytics once. The contract is **defined and dogfooded here** (the hero registers through it) even though the other consumers ship later.
2. **The hero's signature re-skin beat** — after the assembly settles, `spine.mjs` runs the **real** `derive.mjs` engine on a committed canned brand and flushes the derived palette across the **whole page** via the `:root` custom-property mechanism `derive.html` proves, holds briefly, then reverts to the committed pack state. This is the "watch an accessible design system get built in your browser" proof — the live derivation performed on arrival.

The at-rest end state stays **exactly** #71's neutral hero (`rest == final`): reduced-motion / no-JS render the assembled neutral hero with no re-skin; the animation settles back to that same state and never changes it.

**Owner steer (2026-07-23):** the re-skin is **whole-page (`:root`)**, not scoped — "100%." Frame the whole spine as a *prototyping sandbox* the hiring manager drives via Hooked (Nir Eyal) questions answerable in the UI. #72 builds the **backbone** for that (the seam) and previews it (the canned re-skin uses honest Hooked-aligned engine inputs); the interactive question loop itself is #73–#77.

## User Story

As a **hiring manager scanning a senior design-engineer's portfolio in the first 10 seconds**,
I want to **watch the site derive and apply a real design system live on arrival**,
So that **I experience the candidate's UX-engineering judgment performed on the page instead of reading claims about it — and understand the page is a sandbox I can drive.**

## Problem Statement

#71's hero is static: it states the thesis ("Turn a brand colour into a working design system") but does not *perform* it. The market bar for £70–80k London design-engineer roles treats the site itself as a graded work sample — a static hero forfeits the single highest-wow move already identified (D2: the live, self-building hero). There is also no orchestration backbone: the four downstream interactive beats (#73/#75/#77) need a shared, documented seam to register their stage effects and fire the spine-completion analytics, or they will each invent an ad-hoc mount and drift apart.

## Solution Statement

A single new view-time module, `system/spine.mjs`, that is both the **seam** and the **hero driver**:

- **Seam:** `registerBeat(id, { effect, analytics, activateOn })` + an `IntersectionObserver` that activates each registered beat once (immediately for the above-the-fold hero, on-scroll for later beats). Each `effect` runs inside `try/catch` → on any failure the page is left in / returned to the committed pack state ("nothing fails on stage"), then `analytics()` fires once. The hero registers through this API, proving it works.
- **Hero re-skin:** wait for the inherited CSS assembly cascade to settle (under `no-preference` only) → `derive({ brandColor: CANNED, density, rewardType, frequency })` → apply **only the `color-*` tokens** to `:root` via a guarded view-transition crossfade (the `dock.mjs` pack-crossfade idiom) → hold → revert via `removeProperty` (lands on whatever pack is active) → set a `data-spine="ready"` handle on `#beat-hero`.
- **VR safety made deterministic:** `visual.spec.mjs`'s `index` entry gets `waitReady: '#beat-hero[data-spine="ready"]'` so the screenshot waits until the transient re-skin has fully reverted — the capture can never race the branded flush (which would silently baseline the branded state).

No new engines, no dependencies, vanilla only. The spring/timing vocabulary already exists in the contract — **reuse it; add no new tokens** unless the choreography genuinely needs a value none of them provide.

## Out of Scope / Non-Goals

- **Not rebuilding the assembly in JS.** The inherited `hero-rise` cascade + `.hl` draw-in + pill `breathe` already deliver "components assemble with the spring vocabulary," rest==final, VR-safe. Keep them. Rebuilding them in JS would risk baseline churn and violate Simplicity. #72's *new* motion is the re-skin only.
- **Not the interactive question loop.** Stakeholder-worded intake, "your brand" visitor input, the built-screen peak, the investment close — all #73/#74/#75/#77. #72 provides the seam they plug into and one canned re-skin; it does **not** read visitor input (the canned brand is a committed constant — that independence is why #72 depends on #71 only).
- **Not visitor-brand persistence (D5b).** No `localStorage`, no cross-page carry of the derived pack. The re-skin is transient and reverts. Persistence is #74/#76.
- **Not `trackFactoryBuilt`.** The seam *supports* a per-beat analytics callback; the hero fires none. #75 adds `trackFactoryBuilt` to `analytics.mjs` and registers the peak with it (recipe recorded below).
- **Not implementing the D11 VR freeze.** #72 keeps baselines clean by regenerating them in-PR (see traps). Wiring `continue-on-error` onto the `visual` job is an epic/infra concern (flag for #82), not this ticket.
- **Not changing the hero's at-rest DOM/appearance.** No new persistent element, no id rename (`#beat-hero` is a frozen interface). Any element `spine.mjs` adds must be transient or non-rendering.

## Feature Metadata

**Feature Type:** New Capability (live layer + reusable seam)
**Estimated Complexity:** Medium–High (motion craft + VR determinism + a stable public seam three later tickets depend on)
**Primary Systems Affected:** `system/spine.mjs` (new) · `index.html` (one script tag) · `tooling/visual-regression/visual.spec.mjs` (one `waitReady`) · `system/loc-summary.json` + the two `approach.html` VR baselines (regenerated, not hand-edited)
**Dependencies:** none new. Consumes `system/derive.mjs`, the contract motion tokens (`tokens.contract.css:67-78`), the `document.startViewTransition` guard idiom (`dock.mjs:56-63`), the reduced-motion guard form (`motion.mjs:12`).

## Related Work

**Implements:** [issue #72](https://github.com/linardsb/ux-factory/issues/72) · **Epic:** [#70](https://github.com/linardsb/ux-factory/issues/70) — `docs/epics/portfolio-v3-experience.architecture.md` (inherited: "Hero liveness = (a)+(b) hybrid"; "spine.mjs for beat orchestration"; boundary "nothing fails on stage"; D11 VR strategy) + `docs/epics/portfolio-v3-experience.prd.md` §6.1 beat 1.

**Back-references** (decisions/patterns inherited):
- `.claude/plans/v3-spine-skeleton.md` (#71) — the region contract, the rest==final hero target, the git-add-then-regen loc-summary + Docker-VR procedure, "#72 owns new motion/scale tokens."
- `.claude/reports/v3-spine-skeleton-report.md` (#71) — closed PRD open question "hero at-rest contract"; the 14-baseline header-ripple precedent; the pending Safari/Chrome eyeball.
- `.claude/plans/ux-overhaul-v3-prd-research.md` — D2 (live hero: "one visible re-skin, reduced-motion gets final state instantly"), D5/D5b (colour rule), D11 (VR freeze).

**Forward-references** (plans that consume this seam — append as they land):
- #73 intake · #74 your-brand · #75 peak (fires `/factory/built` through the seam) · #77 close — all `registerBeat(...)` against `spine.mjs`.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: READ THESE BEFORE IMPLEMENTING

- `index.html` (lines 22-71) — the **region contract** + the exact hero DOM #72 animates to. `#beat-hero` at :53; the accent-bearing children the re-skin visibly changes: `.pill`, `h1 .hl`, `.btn-primary`. Script block at :268-272 (where the new tag goes); `pack-boot.js` at :17.
- `system/derive.mjs` (whole file, esp. 45-180) — `derive(input)` API. Input: `{ brandColor:'#rrggbb', density, rewardType, frequency, improvesLives?, wouldUseIt? }`; throws (plain `Error`) on bad input. Output `tokens` keys are **without** the `--` prefix and include `color-*`, `spacing-*`, `type-*`, `radius-*`, fonts, `maxw`, `gutter` — **the re-skin applies only the `color-*` subset** (spacing/type would reflow the hero).
- `derive.html` (the `<script type="module">`, ~lines 120-175) — the proven apply/reset mechanism to mirror exactly: `for (const [k,v] of Object.entries(result.tokens)) document.documentElement.style.setProperty("--"+k, v)`; reset = `removeProperty("--"+k)`; `derive(...)` wrapped in `try/catch` that logs and bails. Default demo input there: `#2563eb` / comfortable / hunt / weekly.
- `system/dock.mjs` (lines 49-66) — `applyPack`: the `document.startViewTransition(swap)` crossfade **guarded by `document.startViewTransition && !reduce`** ("witnessed, not snapped; without VT support or under reduced motion the swap stays instant"). Mirror this guard for the re-skin apply/revert. Also the `el()` DOM-builder shape (lines 23-33) if the hero needs any transient node.
- `system/motion.mjs` (whole file) — the reduced-motion guard form to reuse (`const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;`, line 12) and the "last frame writes the final value verbatim" honesty idiom. Node-import-safe form — use it so `spine.mjs` stays testable.
- `system/analytics.mjs` (lines 37-49) — `trackFactoryDriven()`: fire-once via a module-level flag, virtual-route pushState + delayed restore, fail-closed when the beacon token is empty. The seam's analytics hook mirrors this; #75's `trackFactoryBuilt` will need its **own** flag + its own `VIRTUAL_BUILT_PATH="/factory/built"` (do NOT reuse `fired`, or the two events suppress each other).
- `system/system-graph.mjs` / `system/trace-player.mjs` / `system/glossary.mjs` — module conventions to mirror: file-header format (`// system/<name>.mjs — hand-written canon (this repo; not generated).` + one-line what + governing-doc citation + export/boot contract), throw-plain-Error-naming-the-path, clear-before-render, the `{ destroy }` return, no `DOMContentLoaded` wrapper (ES modules are deferred; the mount already exists).
- `components.css` (lines 992-1008) — the **existing** hero entrance cascade (`hero-rise`, `--motion-slow` · `--motion-ease-spring`, staggered by `--motion-stagger`). Scoped `:is()` on purpose: **an animating `transform` on a hero child becomes a containing block** (comment :993-994) — the re-skin must NOT add transforms to hero children (use view-transitions on `:root`, which is fine).
- `system/portfolio.css` (lines 99-116) — the `.hl` underline `hl-draw` (`--motion-slow` · `--motion-ease-spring`, delayed, rest keeps a solid border → the at-rest hero contract). Lines 16-23 — the global reduced-motion kill-switch (`animation-duration:0.01ms!important`). Lines 978-987 — the v3-spine header block naming #72's scope.
- `system/tokens.contract.css` (lines 67-78) — the motion vocabulary #72 reuses: `--motion-slow:480ms`, `--motion-stagger:70ms`, `--motion-rise:20px`, `--motion-ease-spring` (~1.9% overshoot, entrances), `--motion-ease-settle` (no overshoot, "things that arrive"), `--motion-ambient:3s` (the pill), `--motion-fast/base/bounce`, `--motion-ease-bounce` (touch only, never entrances).
- `tooling/visual-regression/visual.spec.mjs` (lines 16-45 PAGES; 62-108 capture flow) — `index` at :17 has **no** `waitReady` (add one). `waitReady` is consumed at :79-80 via `waitForSelector(sel, {state:'attached'})` (an attribute selector resolves when the attribute appears). Capture is `toHaveScreenshot` (:108) with config defaults `{ animations:'disabled', maxDiffPixels:100 }` (`playwright.config.mjs:21`) under **no-preference** (the `reducedMotion:'reduce'` at config :15 is an empirically-proven no-op).
- `tooling/drift-check.mjs` (lines 59-65, 105-119) — `checkLocSummary()` is **blocking**; adding `spine.mjs` (a new tracked runtime file) drifts loc-summary unless regenerated after `git add`. `tooling/token-lint.mjs` (lines 68-86) — the ORPHAN gate: a new token must be referenced by `var()`/`getPropertyValue()` in a consumer file (which includes `system/*.mjs`) in the same PR.
- `agent-layer/gen-loc-summary.mjs` (lines 33-49) — reads the **committed index blob** (`git show :<path>`), so `git add` before regen; `system/spine.mjs` lands in the `runtime` group (regex `/^system\/(wc\/)?[^/]+\.(css|mjs|js)$/`), rounded to nearest 100.

### New Files to Create

- `system/spine.mjs` — the beat-orchestration seam + the hero re-skin beat. ~250–350 LOC.

### Relevant Documentation

- `.claude/skills/portfolio-design/references/CRAFT.md` — motion rules (verbatim): spring (~2%) for entrances / settle for things that arrive / **bounce never on page load** (:30-32); **ease-out only, never ease-in** (:33); durations micro 150–300ms, larger 300–500ms, longer only for the one authored moment (:34); **one authored moment per page** (:35); **compositor props only, never `transition:all`** (:36); every animation ends at the true at-rest state, entrances only under `no-preference`, reduced renders final instantly (:37); the discrete-render gate (:39, PR-#55 trap); 60/30/10 with the derived brand as the on-stage accent (:22); hit areas ≥44×44 (:45).
- `.claude/skills/portfolio-design/references/CHECKLIST.md` — the pre-commit gate. Load-bearing items: :10 (reduced-motion, final states instant), :19-22 (transform/opacity only; ends at at-rest; **never entrance anim on nodes rebuilt every input tick**), :20 (rest≠final == churn), :23 (`startViewTransition` in feature+reduced-motion guards), :28 (**eyeball real Safari AND real Chrome**), :48-50 (v3 VR: non-blocking-by-intent, regen via `npm run update:docker`, **gate captures under no-preference + animations:'disabled', zero-churn from rest==final**), :41-44 (token pipeline if a token is added).
- Playwright `toHaveScreenshot`: `animations:'disabled'` fast-forwards CSS animations, CSS transitions, **and WAAPI `element.animate()`** to their end frame; it does **not** affect raw `requestAnimationFrame`/`setTimeout` style mutations. Stabilization = repeat until two consecutive shots match, then diff — a JS transient that **plateaus** for ≥~2 samples can silently baseline the plateau (why the `waitReady` handle is mandatory here).

### Patterns to Follow

**File header (mirror `analytics.mjs:1-3` / `trace-player.mjs:1-5`):**
```js
// system/spine.mjs — hand-written canon (this repo; not generated).
// The v3 spine's beat-orchestration seam + Beat 1 (the hero re-skin): drives the
// home-page demo sequence and exposes the registration API later beats plug their
// stage effects into (#73 intake · #75 peak · #77 close; the peak fires /factory/built
// through it). (epic #70 ticket #72; PRD §6.1 beat 1; architecture "Hero liveness =
// (a)+(b) hybrid", boundary "nothing fails on stage".)
```

**The seam (concrete signatures — this is a deliverable the three later tickets depend on; keep it minimal but stable):**
```js
// registerBeat(id, spec) — a beat plugs its stage effect. Called by #73/#75/#77 (and the hero here).
//   id: string                         — matches a #beat-* mount id in index.html
//   spec.effect?: (ctx) => void|Promise — the stage logic; runs once, inside try/catch
//   spec.analytics?: () => void         — fired once after effect (e.g. #75 passes trackFactoryBuilt)
//   spec.activateOn?: 'load'|'visible'  — 'load' runs immediately (above the fold hero);
//                                         'visible' (default) runs on first IntersectionObserver hit
//   ctx: { el, reduce }                 — the beat's element + the current reduced-motion flag
// getBeat(id) -> { id, el, activated }  — read-only state (observe/advance)
export function registerBeat(id, spec) { ... }
export function getBeat(id) { ... }
```
Internal `activate(beat)`: `if (beat.activated) return; beat.activated = true;` then `try { await beat.effect?.(ctx) } catch (err) { console.error('spine: beat "'+beat.id+'" effect failed — committed pack retained', err) }` then `try { beat.analytics?.() } catch (err) { console.error(...) }`. The fallback IS the committed pack (the DOM default) — no undo needed beyond not-having-changed-it, plus the re-skin's own `removeProperty` revert.

**The hero re-skin — the mechanism is already in production.** `dock.mjs applyPack` (49-66) ships a whole-page color change via a guarded `startViewTransition` today, with the hero `h1`'s `view-transition-name` (`portfolio.css:50`) and the `nav-active` VT group present — so the "will a full-viewport VT behave?" question is already answered: it does. The re-skin **is `applyPack`** but with derived inline `:root` custom props instead of a stylesheet-line swap, plus an **auto-revert** (a second guarded `startViewTransition` that `removeProperty`s them). Mirror `derive.html`'s apply/reset for the props and `dock.mjs:56-63` for the guard:
```js
import { derive } from './derive.mjs';
const CANNED_BRAND = '#…';           // committed demo brand INPUT (a hex, not a token) — see Task 3
const isColor = ([k]) => k.startsWith('color-');
const root = () => document.documentElement;

async function heroBeat({ el, reduce }) {
  const ready = () => el.setAttribute('data-spine', 'ready'); // VR handle — reached in ALL paths
  try {
    if (reduce) return;                                       // reduced motion → no re-skin, final stays
    await assemblySettled(el);                                // animationend on last cascade child + timeout safety
    const { tokens } = derive({ brandColor: CANNED_BRAND, density: 'comfortable', rewardType: 'hunt', frequency: 'weekly' });
    const colors = Object.entries(tokens).filter(isColor);   // color-* ONLY — never spacing/type (reflow)
    await crossfade(() => colors.forEach(([k, v]) => root().style.setProperty('--' + k, v)));
    await hold(HOLD_MS);
    await crossfade(() => colors.forEach(([k]) => root().style.removeProperty('--' + k))); // → active pack
  } finally { ready(); }
}
function crossfade(mutate) {          // dock.mjs:56-63 — witnessed or snapped
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.startViewTransition && !reduce) return document.startViewTransition(mutate).finished.catch(() => {});
  mutate(); return Promise.resolve();
}
registerBeat('beat-hero', { effect: heroBeat, activateOn: 'load' });
```

**Wiring (mirror `index.html:271-272`):** a single `<script type="module" src="/system/spine.mjs"></script>` appended to the bottom script block. Self-boots (calls `registerBeat` on import); other beat modules `import { registerBeat } from './spine.mjs'` (module singleton shares the registry).

**Error/throw convention:** plain `Error` naming the offending path for programmer errors (`if (!id) throw new Error('spine: registerBeat needs a beat id')`); view-time failures are caught and fall back, never thrown to the user.

---

## IMPLEMENTATION PLAN

### Phase 0 — Spike 1: choreography perf (the first gate)
**Independent of:** everything (it informs Phase 2 but blocks nothing structurally).
Prototype the assembly-settle → `:root` re-skin crossfade → revert on a mid-tier machine under CPU throttle. Decision rule: **solid 60fps or simplify** to opacity/transform only, ≤8 simultaneously animating elements. A whole-viewport `startViewTransition` crossfade is the risk — if it drops frames, fall back to a lighter crossfade (or snap; reduced-motion already snaps). **Record the outcome in the PR** (it is an acceptance criterion).

### Phase 1 — The seam
**Depends on:** #71 (the `#beat-hero` mount + region contract).
Create `system/spine.mjs` with the header, `registerBeat`/`getBeat`, the `IntersectionObserver` activator, `activate()` with the try/catch fallback + once-guard + optional analytics. No hero logic yet — a bare, documented seam that no-ops when a beat's element is absent.

### Phase 2 — The hero beat (through the seam)
**Depends on:** Phase 1.
Add `heroBeat`, `assemblySettled`, `hold`, `crossfade`, `CANNED_BRAND`, and `registerBeat('beat-hero', { effect: heroBeat, activateOn: 'load' })`. Reuse the contract motion tokens; add none unless genuinely required. Apply the CRAFT rules (spring/settle eases, ease-out, compositor-only, no bounce on load).

### Phase 3 — Integration
**Depends on:** Phase 2.
Add the `<script type="module" src="/system/spine.mjs">` tag to `index.html`. Add `waitReady: '#beat-hero[data-spine="ready"]'` to the `index` entry in `visual.spec.mjs` (with an explaining comment).

### Phase 4 — Artifacts + validation
**Depends on:** Phase 3.
`git add` the changed paths → regen `loc-summary.json` → regen the affected VR baselines via `npm run update:docker` → run the blocking gates → manual cross-browser + reduced-motion + no-JS checks.

---

## STEP-BY-STEP TASKS

**Execute in order. Branch first:** `git checkout -b feature/v3-hero` **from the tip of `feature/v3-spine-skeleton`** (#71 is not yet merged to `main`; #72 needs its hero DOM + organisms). If #71 lands on `main` first, branch from `main` instead. Verify the branch right before committing (shared worktree — memory `shared-worktree-parallel-sessions`).

### 1 · SPIKE — choreography perf (record outcome in PR)
- **IMPLEMENT:** a throwaway prototype (a scratch branch or an inline snippet in a copy of `index.html`) of: assembly-settle wait → `startViewTransition` apply of the `color-*` derived set on `:root` → hold → `startViewTransition` revert. Throttle CPU 4–6× (DevTools Performance) on a mid-tier profile.
- **GOTCHA:** a whole-viewport view-transition snapshots the entire page twice — this is the frame-budget risk. **It is low-risk:** `dock.mjs applyPack` already does exactly this whole-page guarded VT in production; the spike is confirming perf under throttle, not proving the mechanism. If it stutters, simplify (lighter crossfade / fewer animating layers / shorter transition) and record the simplified form.
- **VALIDATE:** watch the frames in real Chrome; write "60fps ✓" or the documented simplification into the PR body.
- **SATISFIES:** AC "60fps under throttle (or documented simplified fallback) — spike 1 outcome in the PR."

### 2 · CREATE `system/spine.mjs` — the seam
- **IMPLEMENT:** the file header (governing doc + export/boot contract); `const beats = new Map()`; `export function registerBeat(id, { effect, analytics, activateOn = 'visible' } = {})` (guard `getElementById(id)`, no-op if absent; `activateOn === 'load'` → `activate` now, else `observe`); `export function getBeat(id)`; a lazily-created shared `IntersectionObserver` (`threshold: 0.35`, `unobserve` on first hit); `async function activate(beat)` with the once-guard, `try/catch` around `effect`, and `analytics?.()` once; the Node-safe `prefersReduce()` helper.
- **PATTERN:** module shape + header — `system-graph.mjs:1-15`, `trace-player.mjs:1-5`; reduced-motion guard — `motion.mjs:12`; no `DOMContentLoaded` (deferred module, mount exists).
- **IMPORTS:** none yet (Phase 2 adds `import { derive } from './derive.mjs'`).
- **GOTCHA:** the fallback for a failing `effect` is "the committed pack, unchanged" — do not build an undo system; the re-skin's own `removeProperty` revert is the only cleanup, and it lives in the hero effect's `finally`.
- **VALIDATE:** `node --check system/spine.mjs`; `node -e "import('./system/spine.mjs').then(m=>console.log(typeof m.registerBeat, typeof m.getBeat))"` → `function function` (proves it's Node-import-safe and self-boot doesn't crash without a DOM — guard `getElementById` behind `typeof document !== 'undefined'` if needed).
- **SATISFIES:** AC "`spine.mjs` exposes a documented beat-orchestration seam (register · observe/advance · fire analytics)."

### 3 · ADD the hero beat to `system/spine.mjs`
- **IMPLEMENT:** `import { derive } from './derive.mjs'`; `const CANNED_BRAND` (see gotcha); `heroBeat({ el, reduce })` per the Patterns sketch (reduce→bail; `assemblySettled`; `derive(...)`; filter `color-*`; `crossfade` apply; `hold(HOLD_MS)`; `crossfade` revert via `removeProperty`; `data-spine="ready"` in `finally`); `assemblySettled(el)` = resolve on `animationend` of the last `.page-hero > .container` child **or** a `setTimeout` safety (~1200ms), whichever first; `hold(ms)`; `crossfade(mutate)` with the `document.startViewTransition && !reduce` guard; `registerBeat('beat-hero', { effect: heroBeat, activateOn: 'load' })`.
- **PATTERN:** the whole thing is `dock.mjs applyPack` (49-66) with inline `:root` props + auto-revert; apply/reset props — `derive.html` `<script>`; crossfade guard (`startViewTransition && !reduce`) — `dock.mjs:56-63`.
- **IMPORTS:** `derive` from `./derive.mjs`.
- **GOTCHA (canned brand):** `CANNED_BRAND` is a hex **input** (not a token — a hex literal in a `.mjs` is fine; `derive.html` does the same). Choose a **non-blue** value (neutral's accent is blue → a blue barely re-skins) thematically tied to the spine's running fictional product (the plant-care "Verdant" green used in `#beat-intake`/`#beat-peak`). **Before committing, run it through `derive()` and confirm zero throws and the accent passes AA** (use `derive.html` locally, or `node -e "import('./system/derive.mjs').then(m=>console.log(m.derive({brandColor:'#…',density:'comfortable',rewardType:'hunt',frequency:'weekly'}).checks.every(c=>c.pass)))"` → `true`).
- **GOTCHA (color-only):** filter to `k.startsWith('color-')` — applying `spacing-*`/`type-*` reflows the hero mid-animation (layout shift + jank), breaking compositor-only discipline.
- **GOTCHA (no child transforms):** re-skin via `:root` custom properties + a `:root` view-transition only — never add a `transform` animation to a `.page-hero` child (`components.css:993` — it would create a containing block and can reparent sticky descendants).
- **GOTCHA (revert target):** revert with `removeProperty`, never by setting neutral literals — `removeProperty` correctly lands on the *active* pack (neutral/saulera/verdant), which is what keeps the saulera VR capture clean and stays out of #74/#76's persistence territory.
- **VALIDATE:** `node --check system/spine.mjs`; then Manual Validation (Level 4) — serve locally, watch the hero assemble then flush to brand then settle back; confirm reduced-motion and no-JS show the neutral hero with no flush.
- **SATISFIES:** AC "the re-skin beat applies a real derived pack (via `derive.mjs` on a committed brand) through `:root` custom properties" + "every live moment wraps try/catch → falls back to committed neutral; nothing fails on stage" + "hero animates from a designed start to the exact final state #71 ships; at-rest baseline unchanged."

### 4 · UPDATE `index.html` — wire the module
- **IMPLEMENT:** append `<script type="module" src="/system/spine.mjs"></script>` to the bottom script block (after `dock.mjs`, `index.html:272`).
- **GOTCHA:** do not add any at-rest DOM/attribute to `#beat-hero` in the static markup (the `data-spine` attribute is set by JS at runtime, so the no-JS/at-rest DOM is unchanged — rest==final holds). Do not rename `#beat-hero`.
- **VALIDATE:** load `/` locally — the hero choreography runs; `document.querySelector('script[src="/system/spine.mjs"]')` exists.
- **SATISFIES:** AC (hero animates on the live page).

### 5 · UPDATE `tooling/visual-regression/visual.spec.mjs` — deterministic capture
- **IMPLEMENT:** change the `index` entry (line 17) to `{ name: 'index', url: '/index.html', kind: 'ia', waitReady: '#beat-hero[data-spine="ready"]' }`, with a comment: "spine.mjs runs a transient live re-skin on load; it sets data-spine='ready' on #beat-hero only after the derived palette has fully reverted to the committed pack — wait so the capture cannot race (and silently baseline) the branded flush."
- **PATTERN:** the `approach`/`factory` `waitReady` entries (:21, :36) — same `state:'attached'` mechanism (:79-80).
- **GOTCHA:** because `heroBeat` sets `data-spine="ready"` in a `finally` (all paths, including derive failure and reduced-motion), the selector always resolves in a JS context; if `spine.mjs` fails to load entirely, the gate hangs to timeout and fails **loud** — the intended behavior (never baseline a broken/mid-transient hero).
- **VALIDATE:** covered by Task 8's Docker VR run (it must reach capture, not hang).
- **SATISFIES:** AC "at-rest baseline unchanged" (made deterministic).

### 6 · (CONDITIONAL) new motion token — only if the choreography truly needs one
- **IMPLEMENT:** only if a value none of `--motion-{slow,base,fast,stagger,rise,ambient,bounce,count}` / `--motion-ease-{spring,settle,bounce}` provides is required (e.g. a distinct re-skin hold/crossfade duration you cannot compose with `calc()`): add it to **both** the `contract` and `neutral` `motion` groups of `system/tokens.source.json`, then `node agent-layer/gen-token-css.mjs` **and** `node agent-layer/gen-handoff.mjs` **and** `node agent-layer/gen-pack-bundle.mjs`, and **consume it** from `spine.mjs` via `getComputedStyle(document.documentElement).getPropertyValue('--…')` (token-lint counts that as a reference).
- **GOTCHA:** skipping `gen-handoff`/`gen-pack-bundle` reddens the **blocking** drift-check (memory `token-change-regen-handoff-pack`); an unreferenced token reddens the **blocking** token-lint orphan gate (memory: commit `008c558` dropped `motion-settle` for exactly this). **Default: add nothing** and compose with `calc()` on existing tokens.
- **VALIDATE:** `node tooling/token-lint.mjs` → `0 orphan`; `node tooling/drift-check.mjs` → green.
- **SATISFIES:** token discipline (only if triggered).

### 7 · Regenerate `loc-summary.json` (git add FIRST)
- **IMPLEMENT:** `git add system/spine.mjs index.html tooling/visual-regression/visual.spec.mjs` (and `system/tokens.*` if Task 6 ran) **by explicit path**, **then** `node agent-layer/gen-loc-summary.mjs`, **then** `git add system/loc-summary.json`.
- **GOTCHA:** `gen-loc-summary` reads the **committed index blob** (`git show :<path>`), so regenerating before `git add` reads the old tree and misses `spine.mjs` → CI (clean checkout) goes red. `--check` before staging is a false "no drift." **Do not predict the numbers — run it and commit the result** (`spine.mjs` joins the `runtime` group; expect runtime `linesApprox` to move ~9100 → ~9400/9500).
- **VALIDATE:** `node agent-layer/gen-loc-summary.mjs --check` → "loc summary ✓ … no drift".
- **SATISFIES:** repo trap ("spine.mjs is a new tracked source file → regen loc-summary after git add").

### 8 · Regenerate VR baselines (Docker) and commit
- **IMPLEMENT:** `cd tooling/visual-regression && npm run update:docker` (Docker required — committed baselines are Linux/Chromium; a macOS local run mismatches). Commit whatever churns. Expect the **two `approach.html` baselines** (`approach-neutral.png`, `approach-saulera.png`) to move because `approach` renders the loc runtime number; the `index` baselines should be stable (rest==final + the `waitReady` revert) — if `index` churns, the re-skin is not reverting before capture: fix the ready handle, do not accept the churn.
- **GOTCHA:** if a baseline's only change is sub-perceptual, `update:docker` won't rewrite it — `rm` that PNG to force (memory `vr-update-skips-subperceptual`). VR is currently **blocking on all PRs** (D11's freeze is not implemented — Agent-C finding), so baselines must be clean in-PR.
- **VALIDATE:** the Docker run reports all pages pass after update; `git status` shows only expected PNG changes.
- **SATISFIES:** repo trap ("regen the two approach.html VR baselines") + "at-rest baseline unchanged."

### 9 · Manual validation (the real test)
- **IMPLEMENT / VALIDATE:** serve `npx serve .`; then:
  1. **Real Chrome + real Safari** (CHECKLIST:28) — hero assembles, flushes to the brand once, settles back to neutral; no dropped frames; the `:root` view-transition looks right in both (Safari snaps if it lacks VT — acceptable).
  2. **Reduced motion** (OS setting or DevTools emulate) — neutral hero, **no** re-skin, final state instant.
  3. **No-JS** (disable JS) — neutral assembled hero, no errors, all links resolve.
  4. **Pack interplay** — switch to saulera via the dock, reload: the re-skin flushes the canned brand then reverts to **saulera** (not neutral).
  5. **Fail-safe** — temporarily point `CANNED_BRAND` at an invalid hex; confirm the hero still settles to the committed pack (the `try/catch` swallows the `derive` throw) and `data-spine="ready"` is still set; revert the sabotage.
  6. **Seam smoke test (the untested paths #75 depends on)** — temporarily register a throwaway `'visible'` beat against an existing lower section (e.g. `registerBeat('verify', { effect: () => { window.__beatRan = (window.__beatRan||0)+1 }, analytics: () => { window.__beatFired = (window.__beatFired||0)+1 } })`), scroll it into view, and confirm in the console that `__beatRan === 1` and `__beatFired === 1` (and stay 1 on re-scroll — the once-guard). Remove the throwaway registration before commit. This is the only exercise the observer + analytics paths get.
- **SATISFIES:** AC "Craft bar §6.4; real Safari/Chrome frame check — no dropped frames" + "nothing fails on stage" + the seam's observe/activate/analytics contract that #73/#75/#77 consume.

---

## TESTING STRATEGY

There is no unit-test suite in this repo (CLAUDE.md: "run the surface you touched"). Testing = the gates + behavioural checks.

### The gates (must pass — blocking)
- `node tooling/drift-check.mjs` — syntax (covers `spine.mjs` via `node --check`), token-css, annotated-source, **loc-summary**, system-graph, handoff, scenarios, traces.
- `node tooling/token-lint.mjs` — undeclared / orphan / DTCG (only relevant if Task 6 added a token).

### Behavioural (the real test)
The Manual Validation checks in Task 9. The hero dogfoods `registerBeat` + the `'load'` path + the effect `try/catch`. But the hero does **not** exercise two seam behaviours that #73/#75/#77 depend on — `'visible'` (IntersectionObserver) activation and the `analytics` callback firing once — so those ship untested unless you add the **seam smoke test** (Task 9, check 6). Do it: a latent seam bug otherwise surfaces as #75's problem.

### Edge cases to verify
- `startViewTransition` **unsupported** (older Safari/Firefox) → apply/revert **snap** (still correct, just not crossfaded).
- `derive()` **throws** (bad canned hex) → caught; committed pack retained; `data-spine="ready"` still set.
- **Reduced motion** → no re-skin; ready set immediately.
- **User switches pack mid-flight** → `removeProperty` revert lands on the new active pack (benign).
- **VR context** (no-preference, `animations:'disabled'`) → capture blocks on `waitReady` until revert; captured frame == committed pack == baseline.

---

## VALIDATION COMMANDS

### Level 1 — Syntax
```bash
node --check system/spine.mjs
node -e "import('./system/spine.mjs').then(m => console.log(typeof m.registerBeat, typeof m.getBeat))"   # function function
```

### Level 2 — Artifact drift (blocking)
```bash
# after: git add system/spine.mjs index.html tooling/visual-regression/visual.spec.mjs  (+ tokens if Task 6)
node agent-layer/gen-loc-summary.mjs            # regenerate
node agent-layer/gen-loc-summary.mjs --check    # loc summary ✓  … no drift
node tooling/drift-check.mjs                     # drift-check ✓ …
node tooling/token-lint.mjs                      # token-lint  ✓ … 0 orphan
```

### Level 3 — Visual regression (Docker; blocking on this branch until D11 lands)
```bash
cd tooling/visual-regression && npm run update:docker   # regenerate Linux/Chromium baselines; commit churn
```

### Level 4 — Manual (behavioural)
`npx serve .` → the five checks in Task 9 (Chrome + Safari, reduced-motion, no-JS, pack interplay, fail-safe).

### Level 5 — Optional
`derive.html` locally to sanity-check the canned brand's palette + AA before committing `CANNED_BRAND`.

---

## ACCEPTANCE CRITERIA

- [ ] Hero animates from a designed start to the **exact** final state #71 ships; at-rest baseline unchanged (verified: `index` VR baseline stable).
- [ ] `system/spine.mjs` exposes a **documented** beat-orchestration seam — `registerBeat(id, {effect, analytics, activateOn})` + `getBeat(id)` + the observer/activator — that #73/#75/#77 can consume; the hero is registered through it.
- [ ] The re-skin beat applies a **real** derived pack (`derive.mjs` on a committed canned brand) across `:root` via custom properties (owner's whole-page choice), **color-`*` only**, then reverts to the active pack.
- [ ] Every live moment wraps `try/catch` and falls back to the committed pack state; nothing fails on stage (fail-safe check passes).
- [ ] Reduced-motion and no-JS render the neutral assembled hero with no re-skin.
- [ ] 60fps under CPU throttle, or the documented simplified fallback — **spike-1 outcome recorded in the PR**.
- [ ] Craft bar (`portfolio-design` CHECKLIST) green; **real Safari + real Chrome** eyeballed, no dropped frames.
- [ ] `loc-summary.json` regenerated after `git add`; the two `approach.html` baselines regenerated; blocking gates (drift-check, token-lint) green.
- [ ] No new motion token added (or, if unavoidable, the full `gen-token-css` + `gen-handoff` + `gen-pack-bundle` chain ran and the token is consumed).

## COMPLETION CHECKLIST

- [ ] Branch `feature/v3-hero` off #71's tip (or `main` if #71 merged).
- [ ] Spike 1 run + outcome in the PR body.
- [ ] `spine.mjs` created (seam + hero); `index.html` script tag added; `visual.spec.mjs` `waitReady` added.
- [ ] `CANNED_BRAND` verified through `derive()` (no throw, AA pass).
- [ ] `git add` (explicit paths) → `gen-loc-summary` → `git add` loc-summary → `update:docker` → commit baselines.
- [ ] Level 1–4 validation all pass; drift-check + token-lint green.
- [ ] Real Safari + Chrome + reduced-motion + no-JS checks done.
- [ ] Atomic commit: `feat: v3 hero choreography + live derive() re-skin + beat-orchestration seam (#72)`; PR with `Closes #72`, spike outcome, validation status.

## OPEN QUESTIONS / ASSUMPTIONS

**Resolved during planning (verified 2026-07-23):**
1. **Re-skin scope** → owner chose **whole-page (`:root`)** ("100%"), framing the spine as a prototyping sandbox driven by Hooked questions. #72 delivers the backbone (seam) + previews it (canned Hooked-aligned re-skin); the question loop is #73–#77.
2. **Re-skin permanence** → **transient** (settles to the committed pack). Evidence: D2 "one visible re-skin, reduced-motion gets final state instantly" + #71 closed the hero at-rest contract as neutral + acceptance "at-rest baseline unchanged" + region contract "must not change them."
3. **Build-in choreography** → the assembly **already exists** as inherited CSS (`components.css:995-1008` + `.hl` draw + pill `breathe`); #72 keeps it and adds only the re-skin + seam. No JS rebuild.
4. **New motion tokens** → **none** — the contract vocabulary already covers hero entrances; compose with `calc()` if a delta is needed.
5. **VR determinism** → a `data-spine="ready"` handle + `waitReady` on `index` (mandatory, because the whole-page transient can otherwise plateau-churn the baseline under `toHaveScreenshot`).

**Assumptions baked in:**
- #72 branches on top of #71 (unmerged) — rebase if #71 lands on `main` first.
- The canned brand is a committed green tied to the spine's fictional product; exact hex chosen at implementation and verified through `derive()`.
- `trackFactoryBuilt` is **not** added here (deferred to #75); the seam's analytics hook is defined and unused by the hero.
- D11's VR non-blocking is **not implemented** in CI (flag for the epic/#82); #72 keeps baselines clean in-PR rather than relying on the freeze.

**Flag for the epic (not blocking #72):** the architecture assumes VR is non-blocking on `feature/v3-*` (D11) but no `continue-on-error`/branch guard exists in `.github/workflows/verify.yml`. Recommend a tiny infra PR (or fold into #82) to wire it; until then every v3 ticket must regen baselines in-PR.

## NOTES (open canvas)

**Why the whole-page re-skin is VR-dangerous without the ready handle.** The VR gate captures under no-preference with `animations:'disabled'` (config `reducedMotion:'reduce'` is a proven no-op) and stabilizes via "two consecutive identical screenshots." `animations:'disabled'` fast-forwards CSS/transition/WAAPI animations to their end frame — but it does **not** touch a plain JS `setProperty` state. A whole-page brand that flushes and **holds** for ~1.2s presents two identical branded frames to the stabilizer → it can silently baseline the branded state (a branded `index` baseline that then "passes" forever). The `waitReady: '#beat-hero[data-spine="ready"]'` handle, set only after the `removeProperty` revert settles, moves the capture to the committed-pack state by construction. This is the single most important correctness detail in the ticket.

**Why keep the CSS assembly instead of driving it from `spine.mjs`.** The inherited `hero-rise` cascade is pure CSS, rest==final, `no-preference`-gated, and already VR-clean across 14 baselines. Re-authoring it in JS would (a) risk baseline churn, (b) duplicate motion the contract already tokenizes, (c) violate Simplicity for zero user-visible gain. `spine.mjs` sequences *after* it (assembly settles → re-skin) rather than replacing it. If the craft review finds the assembly too plain for the "self-building" thesis, enrich it **in CSS/WAAPI with rest==final** — do not move it into a raw rAF loop (unfast-forwardable → VR flake).

**The seam is a contract three tickets depend on — keep it small and stable.** `registerBeat` + `getBeat` + an observer is enough to satisfy "register · observe/advance · fire analytics." Resist adding lifecycle hooks, priorities, or a full state machine now; #73/#75/#77 will tell us what they actually need, and a wide API is expensive to change once three consumers exist. The per-beat optional `analytics` callback is the whole of "fire a beat's analytics" — #75 mirrors `trackFactoryDriven` (own `builtFired` flag + `VIRTUAL_BUILT_PATH="/factory/built"`) and passes it in.

**Prototyping-sandbox framing (owner vision).** The hero re-skin uses honest engine inputs from the Hooked model (`rewardType:'hunt'`, `frequency:'weekly'` — the same knobs `derive.html` exposes), so the canned beat is a truthful *preview* of the intake the visitor will drive in #73. The seam is deliberately the thing that lets a later beat turn a Hooked-question answer into a stage change — that's the "prototype the flow in the portfolio" backbone the owner described, staged one ticket at a time.

**What the whole-page flush actually looks like (calibrate the expectation).** `derive()` keeps `color-bg` white by design (its neutrals are the brand hue at near-zero chroma — a subliminal tint, not a wash). So the `:root` flush reads as **"every accent across the page snaps to the brand; backgrounds stay calm"** — the same visual class as switching packs in the dock, which the owner has already seen. That is consistent with the calm-colour rule and almost certainly what "100%" meant. If the owner instead pictured a bolder full-background color wash, that is a different (and calm-rule-breaking) design — surface it at review rather than assuming, but the default here is the accent-snap.

**Alternatives weighed & rejected.** (1) Scoped-to-`#beat-hero` re-skin — rejected by the owner in favour of whole-page. (2) Persisted brand — rejected: contradicts rest==final and steps on #74/#76's D5b job. (3) Rebuilding assembly in JS — rejected (above). (4) Adding `trackFactoryBuilt` now — rejected as speculative (Simplicity); the hook suffices.

## AMENDMENTS

<!-- append-only; newest at the bottom; empty at creation -->
