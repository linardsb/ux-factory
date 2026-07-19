# Implementation Report — Factory intake wizard → live re-skin (ticket 10.2)

**Plan**: `.claude/plans/factory-intake-wizard-reskin.md`  **Branch**: `feature/factory-shell`  **Status**: COMPLETE

## Summary
Stations 1 + 2 of the Factory page now genuinely run. A new view-time module
(`system/factory-intake.mjs`) renders a stepped 4-question guided wizard into Station 1 and, on
every answer change, runs the real derivation engine (`system/derive.mjs`) to (a) re-skin a sample
of real components live via inline custom properties **scoped to `#reskin-preview`** (page chrome +
wizard untouched), and (b) render a staged "how it's generated" narrative — brand→accessible palette
with a WCAG checks table, density→scales, reward→patterns, frequency→ethics verdict — from the
engine's own output. The moment is view-time-safe (approach B): `derive()` runs behind a try/catch
that falls back to the committed neutral pack on any throw. Both stations flip their capability badge
to `.capability live` "Runs now"; Station 1 carries a visible fictional-scenario label. Verdant only;
no toggle, no ethics guess-then-reveal (both deferred to later 10.x slices).

## Tasks completed
- Task 0 — confirmed branch `feature/factory-shell` (10.1's branch, this follow-on slice) + engine surface + the three enum lists.
- Task 1 — finalized intake cut recorded in the module header **and** posted to issue #10 (comment #5014971541). → AC1
- Task 2–6 — `system/factory-intake.mjs` (CREATE): header + cut record, inlined Verdant `WIZARD` config, `DEFAULTS`, `ENUM` (live from `RULESET`), `LABELS`, `esc()`, fail-fast asserts; stepped `renderWizard`; view-time-safe `run()`/`fallback`; four-beat `renderNarrative` + WCAG table; document-guarded self-init with fire-once analytics.
- Task 7 — `factory.html` (UPDATE): Station 1 = fictional-scenario label + wizard mount + honest "Loading…" seed; Station 2 = static sample surface (`#reskin-preview`) + `#factory-narrative` + demoted `/derive` pointer; both badges flipped to `.capability live`; page-scoped `.fw-*` CSS (token-only); module `<script>` added. → AC1, AC2, AC3, AC7
- Task 8 — `tooling/visual-regression/visual.spec.mjs` (UPDATE): `waitReady: '#reskin-preview[data-reskin]'` on the factory entry + a `.waitFor({ state:'attached' })` in the test body (runs for both packs). → AC8
- Task 9 — regenerated the two factory baselines via Docker; twice-regenerate byte-identical; full Docker suite green.

## Tests added
No unit/integration suite exists (CLAUDE.md). Verification was **run the surface + the three CI gates**:
- **Live browser harness** (Playwright, scratchpad `verify-factory.mjs`) — 22 functional checks pass: `data-reskin=ready`; loading seed replaced; wizard `1 / 4` + reasoning + colour input; narrative 4 beats; WCAG table 12 rows all-pass at defaults; verdict = habit-forming; **re-skin scoped** (preview accent `#2f7a4d→#d21966`, chrome accent `#2563eb` unchanged); **density re-scales the preview** (`--spacing-md` `16px→20px` comfortable→spacious); **no analytics fire on auto-render**; **fires exactly once** on first user change and does not re-fire; Next advances `1/4→2/4`; last step's primary reads "Review", **enabled** (not dead-ended); `monthly` flips verdict to Utility + gates a habit-mechanic pattern.
- A 23rd check (broad console scan) surfaced only 6 `net::ERR_CONNECTION_REFUSED` messages — Station 3's **embedded proto iframes** reaching the mock Worker (:8787) and degrading to static fixtures (pre-existing 10.1 behaviour). **Zero JS exceptions from page code** (confirmed by a separate pass that partitions `pageerror`/JS-error from network-error).
- **Fallback revert exercised** (AC5): reproducing the module's `fallback()` revert ops against the real `#reskin-preview` reverts its computed `--color-accent` from the derived `#2f7a4d` to the neutral pack's `#2563eb`, sets `data-reskin=fallback`, zero unhandled errors. Combined with the confirmed facts that `derive()` throws on bad input and the module wraps it in try/catch → `fallback()`, the "can't fail on stage" guarantee holds end-to-end (the throw itself is unreachable via the bounded UI).
- **AC2 verified against source**: `docs/epics/…prd.md §6.1` — "guided wizard, one decision at a time, each asked question carrying a recommended default *and its reasoning*, the reader overriding within bounds (defaulted questions accepted silently)" — matches the implementation clause-for-clause.

## Validation results
- **token-lint**: ✓ 47 contract tokens · 0 undeclared · 0 orphan · DTCG valid.
- **drift-check**: ✓ syntax · token-css · handoff · scenarios · traces.
- **visual-regression** (Docker, pinned image): plain test run (no `--update`) **16/16 pass** against committed baselines. Twice-regenerate diff **byte-identical** (neutral + saulera) → readiness gate deterministic by construction. `git status baselines/` lists **only** the two factory PNGs — shared shell unshifted.
- **Module Node-import**: `import('./system/factory-intake.mjs')` resolves clean (DOM behind `typeof document` guard; top-level asserts pass).
- **Sanity greps**: `class="capability"` (In build) = 1 (Station 5 header only); `factory-intake.mjs` script = 1; `Fictional` ≥ 1; all 3 anchors present.

## Deviations from the plan
1. **Sibling imports are relative (`./derive.mjs`), not root-absolute (`/system/derive.mjs`).** The plan's Task-2 IMPORTS text specified root-absolute, but that (a) contradicts the house convention — `derive.mjs` and `wcag.mjs` both use `./` sibling imports, which is why `derive.mjs` runs under both Node and the browser — and (b) makes the plan's **own** Task-2 Node-parse VALIDATE gate impossible (Node can't resolve `/system/...`). Relative paths resolve correctly in the browser (relative to the module URL `/system/factory-intake.mjs`) and pass the Node check. Browser-correct + house-consistent.
2. **`setAnswer` does not re-render the wizard step.** The plan's Task 6 says "run() + re-render the current step." Re-rendering on every change would rebuild the control DOM — stealing focus and, on the `<input type=color>` drag (which fires `input` continuously), closing the native picker. The changed control already reflects its own state natively (radio `checked`, colour `value`), and `renderWizard` always reads `answers` as the source of truth when stepping Back/Next, so state stays correct. `setAnswer` therefore updates state → fires-once → `run()` (preview + narrative only). Cleaner and avoids a real UX regression.
3. **`capability live` count is 5, not the plan's expected 4.** The plan's grep target (4) undercounted: the pre-existing Station-5 lineup badge ("A replayed agent run, raw · Runs now", shipped in 10.1 and still true) also matches. The honest count is 4 station-header "Runs now" (Intake, Generation, Prototypes, Handoff) + that 1 Station-5 raw-replay sub-link. The load-bearing honesty invariant holds: `class="capability"` (In build) = 1 — Station 5's **header** still says "In build".
4. **Preview `.feature-band` padding scoped down** (`var(--spacing-2xl) 0` vs the component's `4xl 0`) and a `.fw-band-inner` gutter added — page-scoped, token-only presentational tightening so the real component reads well as a compact embedded sample. No token or component change.
5. **Last-step "Review" scrolls to the result rather than dead-ending disabled.** The plan's Task 3 said the footer buttons "both just move step." Since the preview is always live there is no submit, so an initial pass left "Review" disabled — but a greyed-out primary CTA at the end of a flow reads as "broken" on the one page whose job is demonstrating UX craft. Final behaviour: "Review" stays enabled and `scrollIntoView({block:'start'})`s to `#reskin-preview` (instant → reduced-motion-safe; the preview gets `scroll-margin-top:90px` to clear the sticky header). Deliberate craft call, advisor-endorsed.

## Issues encountered
None blocking. Docker was confirmed running up front (AC8's critical path). The host-`npm test` path in the plan's Level 3 would fail by design (macOS rendering vs Linux baselines) — validated via the Docker test run instead, which is the actual CI gate.
