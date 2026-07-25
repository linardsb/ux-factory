# Implementation Report — v3 P4: hallway rounds + craft sweep + full regen + VR re-block

**Plan**: `.claude/plans/v3-hallway-regen-vr-reblock.md`   **Branch**: `chore/v3-merge-vr-reblock`   **Status**: PARTIAL — Phase A complete, stopped at the human gate

## Summary

Phase A of ticket #82 is built and committed: the hallway protocol (session script, notes template,
and the biggest-finding triage rule written before any notes exist), and the §6.4 craft sweep across
all ten v3 surfaces in three real engines. The sweep found and fixed three CHECKLIST layout MUST
failures, none of which churn a VR baseline — verified by a pinned Docker run, not assumed.

The ticket now waits on the owner. Phases B and C need cold human readers; the plan says so
explicitly ("this ticket cannot close in a single execution pass"), and the remaining work — the one
fix, the full regen and the freeze removal — is all downstream of round-1 notes existing on disk.

## Tasks completed

| Plan task | Result |
| --- | --- |
| Create branch outside `feature/v3-*` | `chore/v3-merge-vr-reblock` (CREATE) — verified `startsWith('feature/v3-') === false` |
| `docs/hallway-runbook.md` | CREATE — 8 sections + the triage rule |
| `docs/hallway-notes/TEMPLATE.md` | CREATE — fixed record shape, severity per finding |
| Biggest-finding triage rule | CREATE — runbook §7, three ordered keys, ties are an owner call |
| `.claude/reports/v3-craft-sweep-audit.md` | CREATE — the §6.4 sweep, measured |
| Cross-engine functional check | Chromium 147.0.7727.15 · Firefox 148.0.2 · WebKit 26.4, all 10 surfaces |
| Fix MUST failures the sweep surfaced | `system/portfolio.css`, `system/derivation-roundtrip.mjs`, `instance.html` (UPDATE) |
| `docs/hallway-notes/round-{1,2}/` | CREATE — one-line README each, so the owner has an unambiguous drop point |
| Commit Phase A and hand off | `e993990` |

## Tests added

None — this repo has no test suite, no linter and no type-checker, and CLAUDE.md forbids inventing
one. "Done" is running the surface you touched. Four throwaway Playwright harnesses did the running
and are reproducible from the audit's Method section; they are deliberately not committed as tooling.

## Validation results

| Gate | Result |
| --- | --- |
| `node tooling/drift-check.mjs` | ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node agent-layer/gen-loc-summary.mjs --check` (after `git add`) | ✓ 3 groups — no drift |
| Docker VR, pinned `v1.61.1-jammy`, against committed baselines | **18 passed** (re-run after the second round of fixes — also 18 passed) |
| `.hl` breakpoint boundary, 9 widths incl. 641px, Chromium + WebKit | 18/18 clear |
| Scroll-region keyboard path, accordions opened, 3 engines | focusable only while overflowing (3 at 360, 0 at 1280); Tab lands on it with `outline: solid 2px` |
| Eyeball check, 360px WebKit at 2×, all three changed layouts | read and confirmed |
| Cross-engine console + layout, 10 surfaces × 3 engines | 30/30 pass |
| Pack-control + derived-pack seam checks | 28/28 pass (14 assertions × Chromium, WebKit) |
| Reduced-motion rest == final | 10/10 pass (frames byte-identical 3.1s apart) |
| Focus indicators across the real Tab order | 10/10 pass (one apparent failure disproved — shadow-DOM artifact) |

## Deviations from the plan

1. **The Phase A commit landed three code fixes, and that was budgeted.** The plan's "UPDATE any
   surface with a MUST failure found by the sweep" task anticipated this; the fixes are F-1/F-2/F-3
   in the audit. They are sweep-found defects, not hallway findings, so D10's one-fix budget is
   untouched.
2. **Ran the Docker VR gate now, in Phase A, in test mode rather than update mode.** The plan puts
   all VR work in Phase C. Running the gate as a *check* (not `update:docker`) proves the three
   fixes churn nothing, which is worth knowing before the owner spends testers — and it does not
   pre-empt Phase C's regen, which still has to run for whatever the hallway fix disturbs.
3. **Added `docs/hallway-notes/round-{1,2}/README.md`.** The plan lists the two directories as
   deliverables, and git cannot track an empty directory. One line each, naming the template and the
   fresh-tester rule.
4. **No PR opened.** The plan makes the PR Phase C's last action, and the branch name is load-bearing:
   `chore/…` sits outside the freeze pattern, so the `visual` job **blocks** on any PR from it. An
   early PR would go red on expected Phase-C churn, on the one branch where red is supposed to mean
   something.
5. **`.hl` fix is scoped to ≤640px rather than removing `white-space: nowrap`.** Measured every
   `.hl` on every page at 360px first: only instance.html crosses the line (+71px; the next worst is
   64px clear). A system-wide nowrap removal would risk 12 baselines to fix one surface.
6. **F-2 grew from one change to three, because the first version did not work.** The plan's task
   was "fix MUST failures the sweep surfaces"; what changed is the diagnosis, not the scope. The
   table wrapper alone left the defect in place — the real cause was the accordion grids' default
   `min-width: auto`, and the scroll region it finally created was not keyboard reachable in any
   engine. All three parts are in the audit's F-2.

## Issues encountered

- **A parallel session is working in this shared worktree.** `docs/figma-runbook.md` and
  `tooling/figma/figma-pull.mjs` are modified, and `.claude/plans/figma-any-design-handover.md`
  appeared mid-pass. Nothing of theirs is staged — every path in commit `e993990` was staged
  explicitly. Worth knowing before the PR: if that session commits onto this branch, its work joins
  this ticket's PR.
- **A geometry probe signed off a fix that had not worked.** A closed `<details>` reports layout
  from a `content-visibility: hidden` subtree — real-looking `clientWidth` and rects, measured
  without its container's constraint. The first F-2 fix made that probe report PASS while the defect
  survived; only re-measuring the way a reader meets it (click each accordion open) exposed the
  actual cause. The lesson is in the audit as O-3: filter layout probes through
  `checkVisibility({ contentVisibilityAuto: true })`, and drive the surface rather than the DOM.
- **Two further measurement traps cost a re-run each**, both now recorded in the audit so they don't recur:
  Chromium and WebKit put a failed resource's URL in `consoleMessage.location()` rather than in the
  message text (a text-only classifier reports the designed Worker-absent degradation as failures),
  and a Tab-order audit that reads `document.activeElement` alone sees every web component as having
  no focus ring — the indicator lives on `shadowRoot.activeElement`.
- **One observation left unfixed on purpose** (O-1): `proto/fieldwork.html` exposes zero focusable
  elements. Whether the hybrid canvas should be operable is a design call, and a fix would add
  interactive surface, which this ticket's non-goals exclude. Flagged for a follow-up ticket.

## What remains — the owner's next step

1. **Round 1.** 3–5 cold readers, `docs/hallway-runbook.md`, one filled `TEMPLATE.md` copy per
   tester into `docs/hallway-notes/round-1/`, committed **on this branch** (`chore/v3-merge-vr-reblock`),
   not on `main`. Line up round 2's testers now — a tester is spent after one session.
2. Then Phase C, agent-side: apply the triage rule, fix the one named finding, owner runs round 2,
   full generator regen, full baseline regen in Docker, delete the `continue-on-error` line from
   `.github/workflows/verify.yml`, open the PR with `Closes #82`.

Two open questions from the plan are still the owner's to answer, and neither blocks round 1:
whether the raw notes should be committed to a public repo at all (default taken: committed and
anonymised as `tester-NN`), and whether `main` should get a branch-protection rule — `main` has none
today, so "re-blocked" here means the visual job's failure is no longer swallowed, not that it can
stop a merge.
