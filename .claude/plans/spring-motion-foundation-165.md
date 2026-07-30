# Feature: Spring motion foundation — linear() easing site-wide + @starting-style entrances (#165)

The following plan should be complete, but validate documentation and codebase patterns and task
sanity before you start implementing. Pay special attention to naming of existing tokens and
selectors. Import nothing — this is CSS-only plus one throwaway verification script.

## Feature Description

Site-wide motion upgrade with **zero at-rest change**: apply the repo's existing spring `linear()`
easing tokens to the hover/press/disclosure transitions that still run on plain `ease`, convert the
dock disclosure (and the /build keep-rail reveal) to `@starting-style` entrances, and close the
reduced-motion coverage gap on the proto pages.

**Critical reality check (discovered at planning, reconciles the ticket text):** the ticket says
"Add `--ease-spring-*` motion tokens" — but the contract **already carries three precomputed
spring `linear()` easings**: `--motion-ease-spring` (~1.9% overshoot, emphasis), `--motion-ease-bounce`
(~13% overshoot, things you touch), `--motion-ease-settle` (critically damped, things arriving) —
`system/tokens.source.json:74,77,78`, duplicated in the neutral pack group at `:152,155,158`. They are
already applied to `.btn` press, `.card` lift, the dock toggle/glyph/panel, `.btn-arrow`, hero, peak.
**This ticket therefore adds NO new tokens** (see Open Questions) — its real work is the
application sweep, the `@starting-style` entrances, and the reduced-motion off-ramps. AC #3 is
satisfied by running both generators and proving zero drift.

## User Story

As a hiring manager doing a 90-second first pass
I want every hover, press, and disclosure on the site to respond with physical, springy motion
So that the site feels like the working prototyping tool it claims to be, not a brochure.

## Problem Statement

Spring easing exists in the token contract but is applied to only ~8 of the ~75 transitions
site-wide; most hover/press/disclosure feedback still runs on generic `ease`. The dock disclosure
enters via a keyframe (entrance-only, instant close). The proto pages use hard-coded literal
easings and have no global reduced-motion kill-switch (they don't load `portfolio.css`, which
carries it).

## Solution Statement

Three surgical CSS passes, no JS changes, no token changes:
1. **Spring sweep** — upgrade transform/opacity transitions to the correct existing curve per the
   pairing rules already documented in the token descriptions (bounce = touched, spring = emphasis
   /lift, settle = arriving). Color/border/background stay on `--motion-ease` (overshoot on color
   is wrong; `linear()` values >1 on opacity clamp — never spring/bounce opacity, settle only).
2. **@starting-style entrances** — convert the dock panel from its entrance keyframe to a
   transition + `@starting-style` + `transition-behavior: allow-discrete` on `display` (gains a
   real exit animation in modern engines; older Safari's instant exit is the accepted degrade).
   Add entrance-only `@starting-style` to the /build keep-rail reveal and the dock restore row.
3. **Reduced-motion** — IA pages + /build are already covered by the global kill-switch
   (`portfolio.css:16-23`, `transition-duration: 0.01ms !important` on `*`). Extend
   `proto.css`'s scoped reduce block to cover every selector this ticket touches there.

## Out of Scope / Non-Goals

- **No new tokens** unless a genuinely missing curve surfaces mid-implementation (then: both
  groups of `tokens.source.json` + both regens; see Gotchas).
- **Not touching**: inline `<style>` disclosures in factory/roundtrip/trace/instance.html (they
  already use `allow-discrete` on `content-visibility`); the `.nav-panel` mobile menu's
  visibility-hack enter/exit (works, element stays in DOM — easing upgrade only); `motion.mjs`
  scroll reveals; View Transitions (`@view-transition` block) — that's ticket #171/#172.
- **No VR baseline regeneration** — the whole point (AC #1). If a baseline churns, the change was
  not motion-only; fix the change, don't regen.
- **No JS changes** to `dock.mjs` / `build-keep.mjs` — the class/attr toggles they already do are
  the discrete triggers the CSS keys on.
- Non-transform/opacity properties (e.g. `.skip-link`'s `top`) stay as they are.

## Feature Metadata

**Feature Type**: Enhancement · **Estimated Complexity**: Low-Medium
**Primary Systems Affected**: `system/components.css`, `system/portfolio.css`, `system/proto.css`
**Dependencies**: none (CSS-only; Playwright for verification resolved from
`tooling/visual-regression/node_modules`, never a repo dep)

## Related Work

**Implements**: [#165](https://github.com/linardsb/ux-factory/issues/165) · **Epic**: #164 —
`docs/epics/prototyping-feel-uplift.prd.md` + `.architecture.md` (§New pieces spring-tokens row,
§Constraints). NOTE: both epic docs are currently **untracked** — commit them with this PR or flag.

**Back-references**: the v3 motion work that landed the three spring tokens and their first
applications (hero, `.card`, `.btn`, dock); PR #55 (restart-and-blank trap), #138 (`[hidden]`
guard on /build).

**Forward-references**: #169–#176 wave tickets consume these curves; #171 does the View-Transition
spike this plan deliberately avoids.

**Unblocks on merge**: #170, #176 (and #169/#171 jointly with #166).

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ BEFORE IMPLEMENTING

- `system/tokens.source.json` (lines 65–81 contract motion group, 143–159 neutral pack duplicate)
  — Why: the three spring curves + the pairing rules in their `$description`s are the design law
  for the sweep. **Read-only for this ticket.**
- `system/portfolio.css` (lines 16–23) — the global reduced-motion kill-switch; (905–942) the dock
  glyph morph + dock panel keyframe entrance to be converted; (570–585) `.to-top`; (1854–1858)
  `.btn-arrow::after` spring override that becomes redundant once components.css upgrades.
- `system/components.css` (lines 165–174 `.btn` — the done pattern to mirror; 226–232
  `.btn-arrow::after`; 280–292 `.nav-toggle` bars; 380–395 `.nav-panel`; 530–538 `.card` — done;
  815–822 `.lp-proof`; 898–907 `.lp-faq .faq-mark` — the FAQ accordion ±-morph).
- `system/proto.css` (lines 51, 197, 255, 390, 446, 506, 528, 539, 592, 602, 621 — the literal
  easings; 672–675 the scoped reduce block — **verified at planning: it already lists every
  selector Task 4 touches** (`.ot-sheet, .ot-sheet-wrap, .ot-switch::after, .ot-notes, .ot-toast,
  .ot-btn`), so Task 7's proto half is verification-only).
- `system/dock.mjs` (lines 425–440 `setOpen` → `panel.classList.toggle("is-open", open)`) — the
  discrete trigger (deep-link `#appearance` also lands here after mount, so the entrance fires on
  load too — fine); (line 254) its own reduced-motion check for the pack-flip; (line 316)
  `restoreRow.hidden`.
- `system/build-keep.mjs` (lines 187–194 element creation, 307–310 the `hidden` flips). **Verified
  at planning:** the three tiers are `cardEl` (`.bx-keep-card` + `data-keep-card`), `artifactsEl`
  (**no class — `data-keep-artifacts` only**), `shareEl` (`.bx-keep-share` + `data-keep-share`) —
  so the entrance CSS MUST use the attribute selectors. Note `emptyEl.hidden = !bare` runs on
  every update: re-setting `hidden=false` when already false does NOT re-trigger
  `@starting-style` (no display change) — safe.
- `build.html` (line 58) — `[hidden] { display: none !important; }`; the `.bx-*` styles live in
  build.html's inline `<style>` block — keep-rail entrance CSS goes there, page-scoped.
- `tooling/visual-regression/visual.spec.mjs` (line ~25) — confirms capture uses
  `animations:'disabled'`: transitions are frozen at final frames, so easing/duration/entrance
  changes are invisible to the gate as long as at-rest == final.

### New Files to Create

- `/private/tmp/…/scratchpad/check-springs.mjs` (scratchpad, NOT committed) — cross-engine
  verification script, see Testing Strategy.
- No committed new files.

### Relevant Documentation

- Architecture doc §Constraints (repeats repo memory: VR captures no-preference; zero-churn =
  `animations:'disabled'` + rest==final; token change regenerates pack too).
- MDN `@starting-style` + `transition-behavior: allow-discrete` — pattern:
  base rule holds the hidden-state styles + the transition (incl. `display … allow-discrete`);
  the shown-state rule holds final styles; `@starting-style { .shown { …from… } }` supplies the
  entrance start. Exit animates automatically because removing the shown class transitions back
  to base styles while `allow-discrete` defers the `display` flip to transition end.

### Patterns to Follow

**The done pattern (mirror it)** — `components.css:168-174`:
```css
transition: background-color var(--motion-base) var(--motion-ease),
            color var(--motion-base) var(--motion-ease),
            transform var(--motion-bounce) var(--motion-ease-bounce);
```
Springs on transform only; colors keep `--motion-ease`; per-property durations.

**Curve pairing rules (from the token `$description`s — do not invent new rules):**
- `--motion-ease-bounce` + `--motion-bounce` (300ms): things you TOUCH — presses, toggles, glyph
  morphs. Never entrances.
- `--motion-ease-spring` + `--motion-base`: emphasis/lift — card hover, arrow nudges, dock panel.
- `--motion-ease-settle`: things ARRIVING — sheets, toasts, reveals; the only curve allowed on
  opacity.

**Discrete-toggle law (PR #55, memory `entrance-anim-continuous-rebuild`):** entrance styles key
ONLY on a discrete class/attr flip (`.is-open`, `[hidden]` removal), never on anything re-rendered
per input tick.

**Token discipline:** `components.css` may only use `var(--motion-*)` — a literal easing there is
a bug. `proto.css` currently holds literals; when touching a line there, migrate that line to
tokens (contract IS loaded on proto pages — verified: `proto/verdant.html:17`).

---

## IMPLEMENTATION PLAN

All phases sequential; each is independently verifiable and VR-invisible.

### Phase 1: Branch + baseline proof
Branch `feature/spring-motion-165` off up-to-date `main` (NOT off the current
`fix/ci-node-pin-154`). Run both generators before touching anything to prove the tree starts
drift-clean.

### Phase 2: Spring sweep (components.css → portfolio.css → proto.css)
Upgrade the transform/opacity legs of existing transitions per the pairing rules. Zero at-rest
values change — easing/duration only.

### Phase 3: @starting-style entrances
Dock panel conversion (keyframe → transition + `@starting-style` + `allow-discrete`), keep-rail
entrance in build.html's style block, dock restore row.

### Phase 4: Reduced-motion closure
Extend `proto.css`'s reduce block to every selector Phase 2 touched there. IA/build pages are
already covered by the global kill-switch — verify, don't duplicate.

### Phase 5: Validation + cross-engine check + PR
Generators (zero diff), page renders, the three-engine Playwright script, CI VR green with no
baseline change. PR body carries `Closes #165`.

---

## STEP-BY-STEP TASKS

### Task 1: CREATE branch + prove drift-clean start
- **IMPLEMENT**: `git checkout main && git pull && git checkout -b feature/spring-motion-165`.
  Then `node agent-layer/gen-token-css.mjs && node agent-layer/gen-handoff.mjs` — both print `✓`.
- **VALIDATE**: `git status --short` shows no changes to `system/tokens.*.css` or `handoff/`
  (if it does, STOP — pre-existing drift, flag to owner).
- **SATISFIES**: AC #3 (regenerated outputs committed ≡ regen run, zero drift).

### Task 2: UPDATE system/components.css — spring sweep
- **IMPLEMENT** (transform/opacity legs only; color/border/background legs untouched):
  - `:230` `.btn-arrow::after` → `transform var(--motion-base) var(--motion-ease-spring)`
    (this makes `portfolio.css:1854-1858`'s override redundant — remove that block in Task 3).
  - `:284` `.nav-toggle .bar` → transform leg to `var(--motion-bounce) var(--motion-ease-bounce)`
    (a thing you touch); opacity leg stays `--motion-ease` (bounce on opacity forbidden).
  - `:386` + `:392` `.nav-panel` closed/open pair → transform leg to
    `var(--motion-base) var(--motion-ease-settle)`; opacity leg to `--motion-ease-settle`;
    KEEP the `visibility 0ms linear …` legs byte-identical in both rules.
  - `:819` `.lp-proof` → transform leg to `var(--motion-base) var(--motion-ease-spring)`
    (mirrors `.card` at `:534`); border-color leg unchanged.
  - `:899-903` `.lp-faq .faq-mark::before/::after` (FAQ accordion ±-morph, a thing you touch) →
    `var(--motion-icon-morph) var(--motion-ease-bounce)` (mirrors the dock glyph at
    `portfolio.css:913`).
- **GOTCHA**: `:170 .btn`, `:534 .card` already correct — do not touch. No literals — tokens only.
- **VALIDATE**: `grep -n "motion-ease)" system/components.css` — remaining plain-ease transitions
  should be color/border/background/opacity-fast legs only; eyeball each hit.
- **SATISFIES**: AC #2 (springs on hover/press/disclosure).

### Task 3: UPDATE system/portfolio.css — spring sweep + remove redundant override
- **IMPLEMENT**:
  - `:319-325` `.lineup-item .go` arrow (nudges `translateX(4px)` on hover) → transform leg to
    `var(--motion-base) var(--motion-ease-spring)`; color leg unchanged.
  - `:448-452` `.cs-acc .mark::before/::after` (case-study accordion ±-morph — portfolio.css's
    own, distinct from components.css's `.lp-faq .faq-mark`) →
    `var(--motion-icon-morph) var(--motion-ease-bounce)`.
  - `:576` `.to-top` → transform + opacity legs to `var(--motion-fast) var(--motion-ease-settle)`;
    background leg unchanged. Keep `:584` `:active` press and `:588` reduce override as-is.
  - `:1685` (peak ethics choice) → transform leg only to
    `var(--motion-bounce) var(--motion-ease-bounce)`; the three color legs unchanged; `:1697`'s
    reduce override already handles it.
  - REMOVE `:1854-1858` (`.btn-arrow::after` override block + its comment) — redundant after
    Task 2; the comment's "zero at-rest change" rationale now lives in components.css behavior.
- **GOTCHA**: `:200`, `:896-913`, `:1842` already spring — untouched. `:36` `.skip-link` uses
  `top`, not transform — out of scope, leave.
- **VALIDATE**: `npx serve .` → open home + work in a real browser: hover a card, an arrow link,
  press the dock toggle — springs visible, nothing moved at rest.
- **SATISFIES**: AC #2.

### Task 4: UPDATE system/proto.css — tokenize + spring the touched lines
- **IMPLEMENT** (migrate each touched line's literals to tokens; contract is loaded on both proto
  pages):
  - `:255` `.ot-notes` mobile bottom-sheet slide (`transform 0.25s ease`, inside a media query) →
    `transform var(--motion-tab-glide) var(--motion-ease-settle)` (arriving).
  - `:390` `.ot-btn` press transform leg (`0.08s ease`) → `var(--motion-fast) var(--motion-ease-bounce)`; background leg → `var(--motion-fast) var(--motion-ease)`.
  - `:539` `.ot-switch::after` knob (`transform 0.15s ease`) → `var(--motion-fast) var(--motion-ease-bounce)` (touched).
  - `:602` `.ot-sheet` (`transform 0.22s ease`) → `var(--motion-base) var(--motion-ease-settle)`.
  - `:621` `.ot-toast` (`opacity 0.2s ease, transform 0.2s ease`) → both legs `var(--motion-base) var(--motion-ease-settle)`.
  - Leave the pure color/background/border lines (`:51,197,446,506,528`) and the `:592`
    `.ot-sheet-wrap` scrim fade (opacity-only overlay, not a spring moment) alone — surgical.
- **GOTCHA**: small duration shifts (0.25s→260ms, 0.08s→160ms, 0.15s→160ms, 0.22s→200ms, 0.2s→200ms)
  are fine — durations never affect at-rest frames. Do NOT add new duration tokens.
- **VALIDATE**: `npx serve .` → /proto/verdant.html: flip a switch, open the sheet — springs
  visible; page renders identically at rest. (Worker-refused console errors are expected fixture
  degradation — memory `headless-render-data-pages-worker-refused`.)
- **SATISFIES**: AC #2.

### Task 5: UPDATE system/portfolio.css — dock panel @starting-style conversion
- **IMPLEMENT**: replace the keyframe entrance (`:917-942`) with:
  ```css
  /* Non-modal disclosure (hash-routed by dock.mjs). Hidden = display:none; entrance/exit are
     transitions keyed on the DISCRETE .is-open toggle (no continuous rebuild — the PR-#55 trap),
     with @starting-style supplying the entry frame and allow-discrete holding display through
     the exit. Engines without @starting-style/allow-discrete get today's instant open/close.
     The reduced-motion kill-switch (portfolio.css:16-23) makes both truly instant. */
  .dock-panel {
    display: none;
    opacity: 0;
    /* … existing box/position declarations unchanged, EXCEPT transform gains the exit offset: */
    transform: translateY(-50%) translateX(8px);
    transition: opacity var(--motion-base) var(--motion-ease),
                transform var(--motion-base) var(--motion-ease-spring),
                display var(--motion-base) allow-discrete;
  }
  .dock-panel.is-open {
    display: block;
    opacity: 1;
    transform: translateY(-50%);
  }
  @starting-style {
    .dock-panel.is-open { opacity: 0; transform: translateY(-50%) translateX(8px); }
  }
  ```
  Delete `@keyframes dock-panel-in`.
- **GOTCHA**: (1) at rest closed = `display:none` either way — VR-identical; at rest open =
  `opacity:1, translateY(-50%)` — byte-identical to today's post-keyframe state. (2) Do NOT drop
  the `translateY(-50%)` centering from any transform value. (3) No JS change —
  `dock.mjs:433` already toggles the class discretely. (4) `transition-behavior: allow-discrete`
  via the shorthand's `allow-discrete` keyword, exactly as the four HTML pages already do it.
- **VALIDATE**: `npx serve .` → open/close the dock on home in Chrome AND Firefox AND Safari (or
  the Task-8 script): entrance slides in with spring; exit fades out (or is instant on older
  Safari — accepted); with OS reduced-motion on, both instant. Escape still closes (hash routing
  untouched).
- **SATISFIES**: AC #2 (disclosure spring), AC #4, ticket's @starting-style requirement.

### Task 6: UPDATE build.html inline style block — keep-rail entrance
- **IMPLEMENT**: in build.html's `<style>`, add an entrance for the keep-rail tiers that
  `build-keep.mjs:307-310` un-hides. **Attribute selectors, verified against build-keep.mjs:187-189
  — `artifactsEl` has no class at all:**
  ```css
  [data-keep-card], [data-keep-artifacts], [data-keep-share] {
    transition: opacity var(--motion-base) var(--motion-ease-settle),
                transform var(--motion-base) var(--motion-ease-settle);
  }
  @starting-style {
    [data-keep-card]:not([hidden]), [data-keep-artifacts]:not([hidden]),
    [data-keep-share]:not([hidden]) {
      opacity: 0; transform: translateY(8px);
    }
  }
  ```
  Entrance-only: exit stays instant (`[hidden]{display:none!important}` wins immediately — do NOT
  add `display` to this transition; that would fight the #138 guard).
- **GOTCHA**: (1) memory `hidden-defeated-by-author-display` — add no `display` declarations to
  these selectors. (2) `hidden` is re-assigned `false` on every update — no display flip, no
  re-entrance, safe. (3) settle on opacity is the allowed pairing.
- **VALIDATE**: `npx serve .` → /build: answer to a non-bare board → keep rail rises in; empty the
  board → tiers vanish instantly; `node tooling/build-checks.mjs` still all-green.
- **SATISFIES**: ticket's "panels" @starting-style requirement.

### Task 7: UPDATE system/portfolio.css + proto.css — reduced-motion closure
- **IMPLEMENT**:
  - Verify (don't duplicate) the global kill-switch `portfolio.css:16-23` covers Tasks 2/3/5/6:
    it sets `transition-duration: 0.01ms !important` on `*` — new transitions inherit instantly.
    `@starting-style` entrances under it run 0.01ms = imperceptible. No change expected.
  - `proto.css:672-675` reduce block: **verified at planning — all five Task-4 selectors
    (`.ot-notes, .ot-btn, .ot-switch::after, .ot-sheet, .ot-toast`) are already in its
    `transition: none` list.** This sub-task is a re-verification after Task 4 lands (guard
    against selector drift while editing), expected no-op.
- **VALIDATE**: in a real browser with OS reduced-motion ON (or DevTools emulation): dock
  open/close instant, keep rail instant, proto switch instant.
- **SATISFIES**: AC #4.

### Task 8: CREATE scratchpad cross-engine check (not committed)
- **IMPLEMENT**: `check-springs.mjs` in the scratchpad, mirroring the repo convention (memory
  `cross-engine-motion-verify`): resolve Playwright from `tooling/visual-regression/node_modules`
  (`createRequire` → `require.resolve('playwright', { paths: […] })`), serve the repo with
  `npx serve .`, then for each of chromium/firefox/webkit:
  1. home: assert `getComputedStyle(card).transitionTimingFunction` contains `linear(` for a
     `.card` and `.btn-arrow::after`'s parent scope (spot-check 2–3 selectors).
  2. click the dock toggle → `.dock-panel.is-open` visible AND (chromium/firefox)
     `panel.getAnimations().length > 0` immediately after open — the @starting-style entrance ran.
  3. re-run step 2 in a context with `reducedMotion: 'reduce'` → panel opens with no
     perceptible animation (assert visible; duration-0 animations acceptable).
  4. /build: seed a board (or drive the first question), assert keep-rail tier becomes visible.
- **GOTCHA**: webkit = the Safari check. **Verified at planning:** the bundled Playwright is
  `1.61.1` (`tooling/visual-regression/package.json`), whose WebKit build is far past Safari
  17.4/17.5 — `@starting-style` AND `allow-discrete` are supported, so run the FULL assertion on
  all three engines. The "instant exit" degrade note in the ticket applies only to older real
  Safari in the field, not to anything this script can or should test. If an assertion
  unexpectedly fails on webkit only, verify with `getComputedStyle(panel).transitionBehavior`
  before concluding regression.
- **VALIDATE**: `node <scratchpad>/check-springs.mjs` — three engines, all assertions pass; paste
  the output into the implementation report.
- **SATISFIES**: AC #2 (cross-engine per repo convention).

### Task 9: Final validation sweep + commit + PR
- **IMPLEMENT**: run the Validation Commands ladder below; commit as one atomic commit
  (`feat(motion): spring easing sweep + @starting-style entrances, reduced-motion off-ramps (#165)`
  + the Claude trailers); include the two untracked `docs/epics/prototyping-feel-uplift.*.md` files
  if the owner confirms (they're the epic's governing docs — flag if unsure). PR via the
  piv-create-pr flow; body MUST carry `Closes #165`.
- **VALIDATE**: `gh pr checks` — `verify` green (drift), `visual` green with **zero baseline
  files in the diff** (AC #1). Local macOS VR failures are platform noise (memory) — CI is the
  arbiter.
- **SATISFIES**: AC #1, #3.

---

## TESTING STRATEGY

No suite exists (CLAUDE.md: "done" = run the surface you touched). Testing is:
1. **At-rest invariance** (AC #1): CI visual-regression job on the PR, no baseline regeneration.
   The gate captures with `animations:'disabled'` → easing/duration/entrance changes are
   invisible IF at-rest == final. Every task above preserves at-rest values byte-for-byte.
2. **Cross-engine functional** (AC #2): the Task-8 scratchpad script over chromium + firefox +
   webkit.
3. **Drift** (AC #3): both generators run, zero diff.
4. **Reduced-motion** (AC #4): manual OS-level check + the script's `reducedMotion:'reduce'`
   context.

### Edge Cases
- Dock opened via deep link `#appearance` on page load — @starting-style fires on the initial
  render too (element first renders with `.is-open`); acceptable and pleasant, but verify no flash.
- Keep rail: rapid answer changes re-set `hidden=false` repeatedly — must NOT re-trigger entrance.
- Pack flip mid-dock-open (the #149 flipTo restore) — panel stays open; no interaction with the
  display transition (class never toggles during flip).
- Older Safari (no allow-discrete): dock close is instant — verify it still actually closes
  (display flips immediately when the transition shorthand's `display` leg is ignored — it is,
  unsupported legs are dropped per-property).

## VALIDATION COMMANDS

### Level 1: Generators / drift
```
node agent-layer/gen-token-css.mjs && node agent-layer/gen-handoff.mjs
git status --short system/ handoff/     # expect: only the 4 hand-edited files
```
### Level 2: Pure checks
```
node tooling/build-checks.mjs           # all 9 groups green (untouched, cheap regression net)
```
### Level 3: Cross-engine
```
node <scratchpad>/check-springs.mjs     # chromium + firefox + webkit assertions
```
### Level 4: Manual
```
npx serve .   # home: card hover, arrows, dock open/close; /build: keep rail; /proto/verdant: switch + sheet
              # repeat dock + keep rail with OS reduced-motion ON
```
### Level 5: CI (the arbiter for AC #1)
```
gh pr checks  # verify + visual green; git diff --stat must show zero baselines changed
```

## ACCEPTANCE CRITERIA

- [ ] AC #1 — VR gate green on CI with NO baseline regeneration (zero at-rest pixel change).
- [ ] AC #2 — springs visible on hover/press/disclosure in chromium, firefox, webkit (script output in report).
- [ ] AC #3 — `gen-token-css.mjs` + `gen-handoff.mjs` run; outputs committed ≡ zero drift proven; drift-check green.
- [ ] AC #4 — reduced-motion disables all added motion (global kill-switch on IA//build; proto.css block extended).
- [ ] No JS files changed; no tokens added; no literals introduced into components.css.
- [ ] PR body carries `Closes #165`.

## COMPLETION CHECKLIST

- [ ] Tasks 1–9 in order, each validation immediate
- [ ] `build-checks.mjs` green
- [ ] Cross-engine script passes on all three engines
- [ ] CI verify + visual green, zero baseline diffs
- [ ] Implementation report written (system-execution-report), review artifact in same PR

## OPEN QUESTIONS / ASSUMPTIONS

1. **Ticket text vs repo reality (the big one):** the ticket asks to "add `--ease-spring-*`
   tokens", but three spring curves already exist under the repo's `--motion-ease-*` naming and
   the ticket's AC are all satisfiable without any token change. **Assumption: extend nothing,
   add no parallel `--ease-spring-*` namespace** — a duplicate namespace would violate
   Simplicity First and churn the pack for no consumer. If the owner intended additional curve
   variants (e.g. a stiffer/looser spring family), that's a small additive follow-up: edit BOTH
   motion groups in `tokens.source.json`, regen both generators, expect `verify` to demand the
   pack update.
2. **Epic docs are untracked** — `docs/epics/prototyping-feel-uplift.{prd,architecture}.md` exist
   only in the working tree. Assumed they ride along in this PR (first epic ticket); confirm.
3. **Scope of "panels"** for @starting-style read as: dock panel (named in ticket) + /build
   keep rail + optionally the dock restore row. The four HTML-page disclosures already have
   `allow-discrete` transitions and are excluded. If the owner meant more surfaces, they're
   one-pattern-each additions.
4. **`.nav-toggle` bounce on the hamburger bars** may read as too playful on a nav control — if it
   looks wrong in the Task-2 eyeball, fall back to `--motion-ease-spring`; both satisfy AC #2.

## NOTES (open canvas)

- **Why no exit spring on the keep rail:** `[hidden]{display:none!important}` (build.html:58) is
  the #138 correctness guard; transitioning `display` there would need `allow-discrete` to defer
  the flip, which reopens the exact class of bug #138 closed (a tier visibly rendering while
  logically hidden). Entrance-only is the safe half.
- **Why settle (not spring) on opacity:** `linear()` overshoot yields opacity >1, which clamps —
  the overshoot silently disappears and the curve reads as a weird plateau. The settle curve is
  monotonic, so it's the only one of the three that behaves on opacity.
- **Why the VR gate can't catch a mistake here (and what can):** memory `check-that-cannot-fail` —
  the gate freezes animations, so it proves at-rest invariance but says nothing about motion
  running. That's why Task 8 asserts `getAnimations()`/computed timing functions on the live page
  rather than grepping the CSS.
- **Rejected:** converting the `.nav-panel` mobile menu to @starting-style (its visibility-hack
  already animates both directions cross-engine — a conversion is churn, not improvement);
  adding a proto.css global `*` kill-switch (the scoped selector list is the file's existing
  idiom; a `*` rule would also kill the fw-/vd- component transitions that components.css
  already governs — actually those ARE covered by nothing on proto pages… kept scoped anyway to
  stay surgical; revisit at Wave 4 when protos get the full site chrome).
- **Watch on review:** the dock panel conversion moves `opacity:0` + the offset transform into the
  base rule — the panel is `display:none` at rest so this is invisible, but any FUTURE style that
  shows the panel without `.is-open` would now show it transparent. The comment in Task 5's CSS
  states this.

## AMENDMENTS

<!-- append-only; newest at the bottom -->
