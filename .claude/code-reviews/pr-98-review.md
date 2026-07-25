# PR #98 Review — v3 component library grid (#79, epic #70 · P3b)

**Branch**: `feature/v3-library-grid` (worktree `../ux-factory-wt-79`, one commit `242646a` off `origin/main` @ 67b7ab2)
**Reviewed**: full read of `work.html` (490 lines, not just the diff) + `system/wc/*.mjs`, `system/components.css`, `system/portfolio.css`, `system/dock.mjs`, `system/pack-boot.js`, `system/agentic-renderer.mjs`, the plan and the implementation report.
**Method**: fresh-context review, deep pass dispatched to the `code-reviewer` agent, plus a real cross-engine functional check (Chromium · Firefox · WebKit).

## Recommendation: **APPROVE**

No Critical, High, or Medium issues. Two Low notes below, both informational — neither blocks merge, and one is an explicitly documented decision. Validation is green on real signal, not on a masked check.

---

## Validation

| gate | result | notes |
|---|---|---|
| CI `verify` | **pass** | 16s |
| CI `visual` | **pass — verified in the job log** | `Running 18 tests using 2 workers` → **`18 passed (15.4s)`** |
| `node tooling/token-lint.mjs` | **pass** | 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node tooling/drift-check.mjs` | **pass** | all eight checks: syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| cross-engine functional | **pass** | Chromium · Firefox · WebKit, independently re-run |
| `mergeStateStatus` | `CLEAN` | not the D11-frozen `UNSTABLE` case |

**On the visual gate specifically.** This branch matches `feature/v3-*`, so D11's job-level `continue-on-error` is in force — the check reports green whether Playwright passed or failed, which makes the check conclusion alone worthless as evidence. I pulled the step output rather than trusting the badge: the suite genuinely ran 18 tests and genuinely passed all 18. Combined with the author's clean non-update Docker run, the two regenerated baselines (`work-neutral.png`, `work-saulera.png`) are settled, not merely rewritten. **This was the one open item that could have changed the verdict**; it resolves in the PR's favour.

Independently re-verified in all three engines: all three custom elements register and `[data-lib]` reaches `"ready"`; clicking the real shadow anchor fires `vd-select` with `{id: "p-001"}`; three repeated presses never change `location.href` nor grow `history.length`; `vd-care-task-row`'s native `<button role="checkbox">` toggles correctly. The only console output is the 6 expected `ERR_CONNECTION_REFUSED` hits from the lazy proto iframes against the absent mock Worker — the recorded fixture-degradation pattern, not a regression. Zero page errors.

---

## Issues

### Critical — none
### High — none
### Medium — none

### Low 1 — `data-lib="ready"` has no runtime consumer (`work.html:265,474,490`)

Nothing in the shipped repo reads the flag: not CSS, not `visual.spec.mjs`, nothing else. Strictly it is one line ahead of YAGNI.

**Not a defect, and no action asked.** The plan pre-declares it as a deliberate live-surface/devtools signal (`.claude/plans/v3-component-library-grid.md:196`), and it is what the cross-engine validation scripts asserted against. Recorded so a future reader doesn't mistake it for dead code and delete the handle the validation depends on.

### Low 2 — the `::before` fallback text is not reliably announced (`work.html:141`)

`.lib-demo :not(:defined)::before { content: "Component not loaded" }` relies on CSS generated content, whose screen-reader support has historically been inconsistent. This surfaces only in the rare case a wrapper module 404s. Not worth acting on; noted for completeness.

**Correcting one thing the automated pass flagged:** it called the local `@media (prefers-reduced-motion: reduce)` block at `work.html:125-128` redundant against the global kill-switch at `system/portfolio.css:16`. Half true. The global rule zeroes `animation-duration` / `transition-duration` only — it never resets a `transform`. So `.lib-card:hover { transform: translateY(-4px) }` would still apply, instantly, under reduced motion without the local block. The `transition: none` half is redundant; the `transform: none` half is doing real work. **The block should stay as written.**

---

## Documented deviations — reviewed and accepted

All seven in `.claude/reports/v3-component-library-grid-report.md` §Deviations are intentional and correctly reasoned. Two are worth affirming explicitly:

- **Only 3 of 6 specimens press.** `system/specs/metric-tile.md` states the tile is read-only outright: *"No role, no tabindex … making a metric tappable is a new component decision, not a tone."* Faking a press would contradict the spec the handoff pack publishes. Deviating from issue AC 1 as literally worded is the **right** call here — the honesty contract outranks the acceptance criterion, and the two display-only cards say so in their caption rather than hiding the difference.
- **`system/loc-summary.json` is in the diff.** A required generated cascade (`pages` 3500 → 3800, total 15700 → 15900), not authored code. Correctly regenerated *after* `git add` — the recorded trap where `gen-loc-summary` reads tracked content and a pre-staging `--check` gives a false "no drift". It does not churn the `approach` baselines: `approach.html:237` renders only the unchanged `runtime` group.

---

## What's genuinely well done

- **The recorded traps were all avoided, by name.** `min-width: 0` on `.lib-card` / `.lib-demo` closes the PR #54 cross-engine grid blowout. `.stagger` reuse is correct — `card-rise` animates `translate`, not `transform`, precisely so it doesn't eat the hover lift, and the class already had precedent on this page at `work.html:183`.
- **Shadow-DOM event work is exactly right.** Retargeting makes `e.target.closest("vd-plant-card")` resolve to the host; `vd-select` dispatches synchronously from the shadow handler *before* the grid's bubble-phase `preventDefault()`, so navigation is swallowed while the component's contract stays intact. Verified, not assumed.
- **Degradation is atomic.** ES-module all-or-nothing linking means a failed wrapper import drops all three tags to the dashed placeholder together — never a partial, misleading half-mounted state. The fallback was *exercised* under route-blocking in three engines and screenshotted, not just asserted.
- **`ds-metric-tile` markup is byte-faithful** to `system/agentic-renderer.mjs:320-325` — the hand-written specimen and the generated one are the same component, which is the whole claim the band makes.
- **Token discipline is complete.** Zero colour literals in the new CSS; every duration and curve is a committed token; no new token, so none of the `gen-token-css` → `gen-handoff` → `gen-system-graph` cascade fires. The pack-switch claim holds: all three wrappers' shadow CSS uses only `var(--color-*)` (one `color-mix()` of two tokens), and `dock.mjs`'s `applyPack` only swaps the `<link>` href — it never calls `removeProperty`, so the recorded derived-pack-stripping trap does not apply.
- **A cross-engine finding changed the copy rather than being papered over.** Safari keeps links out of the tab order unless full keyboard access is on, so "Tab to it for its focus ring" was untrue there; the caption now names the condition. That is the honesty contract working as intended.
- **Scope discipline.** `work.html`-only authored code keeps this clear of the parallel #75 / #76 / #89 seams — including the deliberate non-edit of `visual.spec.mjs`, correctly reasoned as a one-shot upgrade that Playwright's built-in stabilization already waits out (unlike `approach`'s *continuous* countUp).

---

## Follow-ups for the owner — outside this PR, do not hold the merge

1. **A stranded token-discipline fix, currently on no open PR.** Commit `85b3689` on `feature/v3-approach-work` tokenizes `.factory-embed-cap { font-size: 13.5px }` → `var(--type-caption)` on `work.html`, but PR #95 merged ahead of it. `main` still carries the literal and **no open PR carries the fix** — it will be silently lost. Correctly out of scope here (it would muddy a `work.html`-only diff), but this needs a tracking issue, not a PR-body footnote.
2. **Docker cannot bind-mount under `~/Desktop` on this machine.** The colima VM lacks the macOS folder permission, which affects the main repo dir too, not just this worktree. The baselines here are genuine Linux/Chromium container output produced via an rsync workaround — but **#82's full regen will hit the same wall.** Fix before then: grant colima Desktop/Full Disk Access, or move the repo out of `~/Desktop`.

---

*Reviewed by `/piv-review-pr` in a clean context. Posted as a comment rather than a formal approval — GitHub does not permit approving one's own PR on a solo repo.*
