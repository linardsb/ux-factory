# Implementation Report — approach.html names "start with concrete cases" (#487)

**Plan**: `.claude/plans/approach-concrete-cases-487.md`   **Branch**: `docs/approach-concrete-cases-487` (worktree `../wt-487`)   **Base**: `944ad01` → `944ad01` (origin/main did not move; `git merge-base --is-ancestor origin/main HEAD` true)   **Status**: COMPLETE

## Summary
One `<p class="muted max-prose mt-2xl">` after the `#method` grid in `approach.html`. It names Verdant, Fieldwork
and Faster Payment, labels all three fictional, says what each covers and leaves general, and gives Ryan Singer's
"start with concrete cases" advice as the reason, unlinked (Q1). The paragraph's three links get a page-scoped underline so they read
as links at rest. The three approach VR baselines are regenerated. No term, id or control added.

## Tasks completed
- Task 1 → branch `docs/approach-concrete-cases-487` from `origin/main` @ `944ad01`, in a sibling worktree (see Deviations)
- Task 2 → `approach.html` (UPDATE, +13 lines in `4675642`; +19 in total after `be6f6c0`, observed via `git diff --stat origin/main -- approach.html`)
- Task 3 → `system/loc-summary.json` verified unchanged (no file touched)
- Task 4 → `tooling/visual-regression/baselines/approach-{neutral,saulera,verdant}.png` (UPDATE) — commit `bf76825`, regenerated again in `8e10822` after the link rule
- (added) link underline rule in `approach.html`'s page `<style>` — commit `be6f6c0` (see Deviations)
- Task 5 → build-checks, drift-check, token-lint run
- Plan `.md` + `.html` committed with the change (22 `.html` plan companions are tracked on main, so this follows convention)

## Source trace for each clause (re-derivable)
| Clause | Source |
|---|---|
| all three fictional | `scenarios/verdant/copy.json:2` and `scenarios/fieldwork/copy.json:2` (`fictionalNotice`); `scenarios/verdant/brief.md:1`; `discovery/faster-payment/run.json:4` "Real run — fictional scenario" |
| Verdant: one plant owner | `scenarios/verdant/brief.md:28` (Rita, eleven plants) |
| one screen, the overview she opens for a daily check-in | `scenarios/verdant/proto.config.json:4` (`plant-overview`, the only screen); `brief.md:42` ("daily check-in: open the overview") |
| Fieldwork: one dispatcher, one screen, the dispatch board; technicians left general | `scenarios/fieldwork/brief.md:27`; `proto.config.json:4` (`dispatch-board`, the only screen) |
| Faster Payment: a real discovery run on a fictional bank | `discovery/faster-payment/run.json:4` |
| paying a new UK payee from the app | `discovery/faster-payment/prd.md:13` (pay someone new, in the app); `:66`, `:150-152` (Confirmation of Payee, Pay.UK, UK data centres) |
| international and business payments left out of this release | `prd.md:365` (seq 23 refusals) |

## Tests added
No suite (CLAUDE.md §Testing). One throwaway render probe (scratchpad, not committed): Playwright Chromium at 1280
and 390 px, finds the paragraph in `#method`, reads width, `max-width`, colour, link hrefs, horizontal scroll,
`#asrc[data-asrc]`, page errors.

Observed on wt-487 (python static server, OS-assigned port, killed by PID):
- 1280: found, width 674 px = `max-width` 674.039px (65ch), colour `rgb(105,112,126)`, 3 links, no hscroll, `asrc=ready`, 0 page errors
- 390: found, width 342 px, no hscroll, `asrc=ready`, 0 page errors
- `/proto/verdant.html` 200, `/proto/fieldwork.html` 200 (local); GitHub `prd.md` URL 200 (re-probed 2026-09-29)

## Proving the checks
| Check | Mutation | Result | Positive control |
|---|---|---|---|
| render probe | run against the primary tree (`34ffc82`, no paragraph) | `{"found":false}` at both widths (observed) | wt-487: `found:true` (observed) |
| `gen-loc-summary --check` on staged tree | 90 blank lines appended to `approach.html`, staged | `loc summary ✗  drift from tracked source` exit 1 (observed) | restored + staged: `loc summary ✓  3 groups — no drift` (observed) |
| VR regeneration | `rm` of the three PNGs before `update:docker` | three "snapshot doesn't exist … writing actual" lines; neutral height 6170 → 6423 px (observed, PNG IHDR) | cropped saulera baseline shows the paragraph under the method cards (observed) |

No new committed checks.

## Validation results
- `grep -c 'Ryan' approach.html` → `2` (observed)
- `grep -n 'fictional' approach.html` → `:125`, `:131`, both inside the paragraph (observed; plan expected one, see AMENDMENTS)
- `<p>` balance → `p balanced 23` (observed)
- `git add approach.html && node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift` (observed, before and after commit)
- `npm run update:docker` (wt-487, clean tree) → `33 passed (58.8s)`, then after the link rule `33 passed (59.1s)`, three "snapshot doesn't exist … writing actual" lines each time (observed); `git status` after each → only the three approach PNGs modified
- Link rule: probe reads `textDecorationLine` `underline` on all three links at 1280 and 390 (observed); neutral baseline crop shows the three underlined words (observed); `awk` over `#method`…`#case` finds one `max-prose` element, so the selector matches only this paragraph (observed)
- `git diff --stat origin/main -- tooling/visual-regression/baselines/` → exactly the three `approach-*.png` (observed)
- Final tree `8e10822`, origin/main still `944ad01`:
- `node tooling/build-checks.mjs` → exit 0, `build ✓  all 48 groups pass` (observed, after `npm ci` in `tooling/icons`)
- `node tooling/drift-check.mjs` → exit 0, `drift-check ✓  syntax · … · group-count` (observed, after `npm ci` in `tooling/style-dictionary`)
- `node tooling/token-lint.mjs` → `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed)
- Contrast of `.muted` on the neutral band: `#69707e` on white ≈ 4.97:1 (derived from sRGB luminance 0.161; background read from the screenshot, not measured)

The first build-checks and drift-check runs failed on missing `node_modules` in the fresh worktree (group 41.7
`gen-icons … is missing`; `Style Dictionary build failed`). Environment only; both green after `npm ci`.

## Not run
- CI `visual` job: runs on the PR (AC #2 second half). Tracker: the PR.
- Level 4 manual pack switch via the dock in a real browser, and real Safari: not run. The three packs were
  checked through the VR baselines (Linux Chromium) and one saulera crop only; neutral at 390 px via the probe.
  Owner's call.
- Owner steps: Singer URL (Q1), wording approval. Tracker: the PR.

## Deviations from the plan
- **Task 1: worktree instead of `git switch` in the primary checkout.** The primary tree is on
  `fix/importer-reads-icon-name-449` with untracked files from other sessions; switching it would move a shared
  checkout. `git worktree add ../wt-487 -b docs/approach-concrete-cases-487 origin/main`. It also served as the
  clean, under-`/Users` tree for Task 4, so no second `~/wt-487-vr` worktree was needed.
- **Task 2: Verdant clause reworded.** Draft: "one screen, the daily check-in". Shipped: "one screen, the overview
  she opens for a daily check-in". The screen is `plant-overview`; the check-in is a behaviour on it (sources above).
- **Link underline added (plan error).** The plan said "no new CSS". The portfolio-design CHECKLIST MUST "no
  information carried by hover only or colour only" failed: `system/components.css:38` sets
  `a { color: inherit; text-decoration: none; }`, so the three links had no at-rest signal (observed in the 1280
  and 390 screenshots). Added one page-scoped rule, `#method .max-prose a { text-decoration: underline;
  text-underline-offset: 0.2em; }`, text colour kept (calm-colour constraint). Keyboard focus was already covered
  by the global `:focus-visible` in `system/portfolio.css:11`. The site-wide link treatment, including the existing
  "the case study" link in the fourth card, is left alone.
- **Task 2: indentation.** The paragraph is indented to the grid `<div>`'s level (8 spaces), which is what the plan
  text says; the plan's snippet showed 10.

## Assumptions carried
- Q2 default: Faster Payment links to its committed `prd.md` on GitHub.
- Q3 default: placement at the end of `#method`.
- Q1: Singer named, no link.

## Additions beyond the plan
- `npm ci` in `tooling/visual-regression`, `tooling/icons`, `tooling/style-dictionary` of the new worktree (gitignored; needed for the gates).

## Issues encountered
- **I1 (pre-existing, outside this ticket): prose links site-wide carry no at-rest signal.** The global `a` reset
  at `system/components.css:38` affects every inline link, e.g. "the case study" in the fourth `#method` card. This
  PR fixes only its own three links. A site-wide treatment moves every page's baselines: a separate ticket.
- **I2: plan `.html` companion predates the AMENDMENTS.** The committed `.claude/plans/approach-concrete-cases-487.html`
  was copied before the amendments were written into the `.md`; the `.md` is the record.
- **I3: stale untracked plan copies in the primary tree.** `.claude/plans/approach-concrete-cases-487.{md,html}`
  are untracked in `ux-factory/` (on `fix/importer-reads-icon-name-449`). Once this merges, checking out `main`
  there will refuse to overwrite them. Not deleted (not mine to remove without asking); the owner can delete them
  after the merge.
