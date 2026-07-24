# Implementation Report — Private-instance shell (Factory-station variant)

**Plan**: `.claude/plans/private-instance-shell.md`   **Branch**: `feature/private-instance-shell`   **Status**: COMPLETE

## Summary

Built the generic, config-driven private-instance shell (`instance.html` + `system/instance.mjs`) — the page a hiring manager opens on an unlisted link, demonstrating the factory on a company's stated product vision. It opens a config seam in the shared wizard (`factory-intake.mjs` → exported `initIntake(config)`, factory.html byte-identical) so the wizard is configured, never forked; renders real-brand honesty labeling, the company's 8 curated intake answers with reasoning, the live-re-derivable design system, the embedded pack-seed derivation trace, and prototype/handoff link slots. The committed demo renders from a new hand-authored **fictional** test package (`scenarios/northwind/`) that additionally carries `speculativeNotice` + `sources`, so the real-provenance rendering path is exercised in-repo while the subject stays honestly labelled fictional.

## Tasks completed (plan tasks 1–9)

- **1–2. Wizard config seam** → `system/factory-intake.mjs` (UPDATE): extracted the module-level fail-fast enum check into `assertScenarioConfig(scenarios)` (still called at load on the inlined `SCENARIOS`); renamed `init()` → exported `initIntake({ scenarios = SCENARIOS, defaultScenario = DEFAULT_SCENARIO } = {})`, re-asserting on the supplied config; replaced all 9 body references (`SCENARIOS[...]`/`DEFAULT_SCENARIO` → `scenarios`/`defaultScenario`); auto-init now stands down when `#factory-wizard[data-intake="external"]` is present.
- **3. Fictional test package** → `scenarios/northwind/{brief.md, intake.defaults.json, copy.json, proto.config.json, fixtures/items.json}` (CREATE): 8 canon questions with Northwind's default/reasoning pairs, axes `#0A5C6B`/compact/hunt/monthly (no matrix booleans → makerMatrix-null path), verdict `utility`.
- **4. Registration** → `scenarios/index.json`, `worker/fixtures.mjs`, `scenarios/README.md` (UPDATE): registry entry, `FIXTURES.northwind` import+entry, and a §Provenance demo-instance-convention note.
- **5. Config module** → `system/instance.mjs` (CREATE): reads `window.INSTANCE_CONFIG`, two independent fetch chains (package · trace), notices + curated intake + wizard config → `initIntake` + link slots; records the screenshots-in-trace default-yes decision in its header (AC3).
- **6. Shell page** → `instance.html` (CREATE): head boilerplate (no pack-boot, commented why), ported `fw-*`/`trace-*`/motion CSS + new `pi-*` rules, hero, six stations, `window.INSTANCE_CONFIG`, bottom scripts.
- **7. Architecture map** → `CLAUDE.md` (UPDATE): `instance.mjs` line + off-nav `instance.html` line.
- **8. Generated artifacts + baselines** → `system/loc-summary.json` (regenerated: runtime 34→35 files, pages 13→14), two `approach-*.png` baselines (regenerated via docker).
- **9. Full gate pass + browser walkthrough** (below).

## Tests added

No test suite exists (project rule — "run the surface you touched"). Verification was the gate scripts + a real-browser walkthrough of both affected pages (Chromium via agent-browser against `python3 -m http.server`):

- **instance.html (happy path)**: chrome injected · no active nav item (off-nav) · both notices ("Fictional scenario" then "Speculative work") · 2 source links (`target=_blank`, `rel="noopener noreferrer"`, textContent=URL, scheme-guarded) · 8 curated accordions · wizard seeded `#0a5c6b` with per-axis reasoning · `#reskin-preview[data-reskin=ready]` · 4 narrative beats · 12 WCAG rows · utility verdict · 4 ethics quadrants · trace label "Real run, curated for length" verbatim · 2 link placeholders. **Console + page errors empty.**
- **Live re-derive**: overriding the brand colour to `#eeeeee` made the real engine darken the accent `#0a5c6b`→`#6f6f6f` with genuine negotiation notes (lightness-clamped / darkened-for-contrast). 
- **Ethics null path**: placing a quadrant → "Compare with the maker" shows the reader's quadrant left, "Not placed" + the frequency-filter line right (makerMatrix: null).
- **Edge case (chain independence)**: a bad package path error-cards `#instance-notices` (naming the path), the trace still mounts, the ready flag stays off, links still render — no uncaught errors.
- **factory.html (Phase-1 proof, functional)**: both scenarios in the toggle, seeds `#2f7a4d`/`#b4530a`, verdict swaps habit→utility on toggle, both trace players mounted. Console empty.

## Validation results

- **Level 1 — syntax**: `node --check` on `factory-intake.mjs` + `instance.mjs` ✓; both import clean under Node (inert, no DOM touch). Post-refactor grep confirms every remaining `SCENARIOS`/`DEFAULT_SCENARIO` is a declaration, the signature default, the load-time assert, or a comment — no bare body reference survived.
- **Level 2 — content gates**: `node scenarios/validate.mjs` → 3 packages ✓, verdicts differ (habit-justified vs utility vs utility) ✓; `node tooling/drift-check.mjs` → all 8 steps ✓ (syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces); `node tooling/token-lint.mjs` → 57 tokens, 0 undeclared, 0 orphan, DTCG valid ✓.
- **Level 3 — visual regression (docker, Linux baselines)**: `update:docker` after `rm`-ing the two approach baselines → 16/16 pass, **only** `approach-neutral.png` + `approach-saulera.png` rewritten (git confirms); a subsequent plain docker `playwright test` → **16/16 pass**. **factory neutral+saulera unchanged — the pixel-exact proof the Phase-1 refactor is behavior-preserving.**
- **Level 5 (optional)**: `worker/fixtures.mjs` resolves `FIXTURES.northwind.items` (3 records) ✓.

## Deviations from the plan

1. **`esc()` helper omitted from `instance.mjs`** — the plan's Task-5 PATTERN said "el()/esc() helpers copied per convention." `instance.mjs` uses `textContent` exclusively (no innerHTML from package data), exactly like `derivation-roundtrip.mjs` — the module I was told to mirror — which also carries no `esc()`. Shipping an unused `esc()` would be dead code. Intentional; consistent with the mirrored pattern and the "no innerHTML from package strings" gotcha.
2. **Trace-station capability badge = `Replays a real run` (non-"live"), not "Runs now"** — Task 6 point 5 said "capability wording matching factory Station 5's register" (whose badge is `capability live` "Runs now"), but the plan's OWN honesty audit (NOTES) says "'Runs now' only on the wizard + generated-result stations … trace station uses the replay register." A "Runs now" badge on a committed replay would overclaim. Resolved the plan's internal tension in favour of the honesty audit; the copy also states the demo embeds *Verdant's* run. **Counter-precedent acknowledged, badge kept as-is:** factory.html's own Station 5 ("Agents visible") is itself a committed trace replay yet ships `capability live` "Runs now" (with clarifying "nothing runs live here" copy) — so factory ships the looser register. instance.html is **deliberately more precise than factory Station 5** on the replay register; the divergence from factory is intended, not an oversight. (A future follow-up could tighten factory Station 5 to match, but that touches a VR-baselined page and is out of scope here.)
3. **Link slots render synchronously (config-driven), not inside the package `.then`** — they depend only on `INSTANCE_CONFIG`, so rendering them before the package fetch makes them survive a package-fetch failure (verified: links still render on a bad package). Same independent-surface principle the plan applies to the trace chain.
4. **Additive shell chrome** — a `.cs-jump` station nav (factory.html's station idiom; instance.html is explicitly a "Factory-station variant") and a short static framing paragraph above `#instance-notices` (so the labeling section isn't empty if JS fails). Token-only, off the VR set. Not specified line-by-line in the plan; consistent with its "designed Factory-station variant" intent.
5. **Ported the Phase-3 presentation-motion CSS** (factory.html:222–297) into `instance.html` in addition to the fw-*/trace-* families — the re-skin transition (`#reskin-preview.is-animated`) is armed by `initIntake`, and the wizard/trace entrance animations are part of the surface's design; all are `@media (prefers-reduced-motion: no-preference)` with rest==final (zero at-rest change), token-only. Keeps the shell a faithful variant; no VR concern (instance.html isn't in PAGES).

Assumptions #1 (fictional package carrying speculative keys — validator ignores extras; documented in `scenarios/README.md`) and #5 (analytics included for parity) were followed as written.

## Issues encountered

None blocking. agent-browser's `eval` persists scope between calls (a bare `const q` collided across evals) — worked around by wrapping interaction evals in an IIFE. The two approach baselines' diff is near-sub-perceptual, so the two PNGs were `rm`-ed before `update:docker` to force the rewrite (per the `vr-update-skips-subperceptual` memory).

## Not done (deliberate, per plan Out-of-Scope)

- `instance.html` NOT added to the VR `PAGES` list (matches `/agentic-ui-study` precedent; fetch-driven, `data-instance="ready"` handle exists for a future follow-up).
- No nav entry (deep-link-only, off-nav — contact.html precedent). No pack-boot/dock (a private instance pins its pack).
- `factory.html` unchanged (zero edits — VR baselines pass untouched).
- Files are staged but NOT committed — next steps are `piv-commit` → `piv-create-pr` (body: `Closes #43`) → `piv-review-pr`. Commit message should cite the ticket, e.g. `feat: private-instance shell — Factory-station variant (epic #38, #43)`.
- **Staging hygiene (important for `piv-commit`):** the 15 staged paths are exactly the change set — commit **that explicit set**, do NOT `git add -A`. Pre-existing untracked files predate this work and must stay out of the commit: `.claude/code-reviews/*.md`, `.claude/plans/*.md`, `.claude/reports/*.md` (incl. this report), and `__Final_phase.md`.
