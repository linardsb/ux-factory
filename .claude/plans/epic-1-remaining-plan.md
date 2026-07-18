# Epic #1 remaining plan — from landed substrate to finished MVP

**Companion to** `.claude/plans/epic-1-landing-plan.md` (executed 2026-07-18: everything through #12 is on `main` @ `1bd6bbf`; no open PRs; stranded branches deleted). This plan covers what's left: **#9, #10, #13, #14, #17, #18, #25** plus the user-gated #12 Figma real run, and the epic close-out.

## Current state (verified 2026-07-18)

Every remaining ticket's `Depends on` list is **fully satisfied on main** — ordering below is about risk and reuse, not unblocking:

| Ticket | What | Size (est.) | Deps | Status |
|---|---|---|---|---|
| #25 | Trace-recorder hardening (PR #24 review follow-ups) | small | — | ready |
| #17 | On-dark accent contract token (`color-accent-on-inverse`) | small | — | ready |
| #18 | PR #16 Lows (4 items) | small | — | ready; item 4 verified still open (no `en-route` job in `scenarios/fieldwork/fixtures/jobs.json` vs `copy.json` label) |
| #9 | CI gates: drift-check · token lint · visual regression | ~500–900 loc | #2 ✅ | ready |
| #14 | Handoff-pack viewer + download | ~500–900 loc | #7 ✅ #11 ✅ | ready |
| #13 | Agentic-UI study (folds spike 6) + Fieldwork slots | ~800–1400 loc | #8 ✅ #11 ✅ | ready — the risk ticket |
| #10 | Factory page: five stations, wizard, toggle, live re-skin | ~900–1500 loc | #3 #4 #5 #8 ✅ | ready — the flagship, do LAST |
| #12 tail | Figma parity REAL run | ~15 min | `FIGMA_TOKEN` + `FIGMA_FILE_KEY` in `portal/.env` | **user-gated** |

## Execution order and why

### Wave 0 — hygiene (three small tickets, one session each; parallelizable)

1. **#25 recorder hardening** — do FIRST in this wave: #13 reuses the trace-recorder pattern for its build-time composition runs, so secret-redaction over recorder output (+ recording fence denials as steps) must exist before the next real agent run. Items: redaction/denylist over tool inputs AND responses (rules recorded in meta — honesty contract), `trace.html` token fallbacks, `--dry` cwd threading, player result-stat guards, `destroy()` note for #10's embedding.
2. **#17 on-dark accent token** — contract extension exactly as the issue prescribes: add to `tokens.source.json`, teach `derive.rules.mjs` to emit it (lighten until ≥4.5:1 vs derived `bg-inverse`), add the `wcagPairs` entry, swap the five listed selectors, regenerate token CSS, add to each pack. Doing this before #9 means the token lint gates a *complete* contract.
3. **#18 PR #16 Lows** — items 2 (memoized rejected registry fetch) and 3 (`no-store` on Worker non-200s) are mechanical. Item 4: **decide now** — add one `en-route` job to the Fieldwork fixtures (the board exists since #8) or record the intent on the issue. Item 1 (N>2 verdicts check) stays deferred until a third scenario — note that on the issue, don't build it.

### Wave 1 — #9 CI gates

Do this BEFORE the big UI tickets so #10/#13/#14 are developed *under* the gates — baseline updates then appear inside their PR diffs, which is itself the demonstrated-workflow evidence the ticket wants. Content:
- **Drift-check** = CI-ified version of the landing plan's "full gate" (regenerate token CSS + handoff + vocabulary, fail on `git diff`; run `scenarios/validate.mjs` + `tooling/validate-trace.mjs` — the validator was built as candidate gate #9 from day one).
- **Token lint** = every token `components.css` references declared in `tokens.contract.css`, no orphans, DTCG source schema-valid (hand-rolled check, no schema lib — project rule).
- **Visual regression** = Playwright screenshots of the shipped pages under neutral + one client pack, pixel-diff vs committed baselines. Playwright is factory tooling only — never a shipped-page dep.
- Prove both token-lint failure modes and one intentional-CSS-diff once (record in the PR), then keep green. Wire as `.github/workflows/verify.yml` on push/PR; all three runnable locally as plain Node scripts.
- After merge: run `/rules-check-drift` — CLAUDE.md's architecture map gains the gates.

### Wave 2 — #14 and #13 (parallel worktrees if desired)

- **#14 handoff-pack viewer** (independent, small): vanilla ES module + page rendering spec head + prose side by side from committed pack artifacts, vocabulary entry linked per component; download bundles the full pack (generator addition in `agent-layer/`, registered in `build.mjs`). Zero pedagogy callouts.
- **#13 agentic-UI study** (the credibility-risk ticket): **run spike 6 FIRST, inside the ticket** — 3–5 build-time composition runs over distinct analytical questions, prompted only with the vocabulary + Fieldwork data, recorded with the (now-hardened) recorder pattern. Decision rule: defensible → ship as proposals; weak → tighten vocabulary/composition rules and re-run. NEVER hand-write a composition (honesty contract — same as traces). Only after the runs pass judgment build the page: ask → propose (precomputed) → adjust (live via renderer + action bus), plus filling the two Fieldwork canvas slots (summary-strip + insight-panel — bounds settled 2026-07-17, recorded in the architecture doc). Record the spike verdict on the issue.

### Wave 3 — #10 Factory page (the flagship, last on purpose)

Pure integration: by now every station has a real thing to perform. Stations: (1) guided intake wizard — resolve the PRD open question at 3–5 asked questions, rest defaulted, **record the cut on the issue**; (2) staged worked example + the genuinely-live re-skin via the derivation engine (fallbacks per architecture approach B — nothing can fail on stage); (3) embeds the data-connected prototypes incl. #13's filled Fieldwork canvas; (4) links the pack + #14's viewer; (5) replayed PIV traces via the trace player (**call `destroy()` when re-rendering** — #25's note). Scenario toggle swaps content end to end with the ethics-verdict guess-then-reveal moment; "factory driven" analytics event; station deep links; legibility nuggets with zero pedagogy callouts; all three honesty surfaces present.

### Unscheduled — #12 tail (user-gated, slot anywhere)

When `FIGMA_TOKEN` + `FIGMA_FILE_KEY` land in `portal/.env` (placeholders are in `.env.example`): `node tooling/figma/figma-parity.mjs` → commit `handoff/verdant/figma-parity.json` → regenerate the pack (parity field flips from null) → post outcome on #12 → close #12. Never a placeholder file.

### Epic close-out

1. Final full gate + portal boot on main.
2. **Deploy** — user-initiated: `npx wrangler pages deploy . --project-name factory-ux --branch main`. Revisit the `_headers` noindex decision (epic open question) at this moment.
3. Close remaining issues with outcomes recorded; epic #1 gets the MVP-complete summary.
4. Hypothesis measurement per PRD §4: ≥1 artifact-referencing interview invite within ~10 applications / ~8 weeks — tracked in the jobs folder, not this repo.

## Per-ticket execution recipe (the loop as practiced here)

1. Fresh session → read the ticket + its architecture section (most "new" pieces have format and placement already pinned — check `docs/epics/ai-first-ux-factory.architecture.md` first).
2. `/piv-plan-implementation #N` → plan doc in `.claude/plans/`.
3. Branch `feature/<slug>` — in a **separate worktree** if running tickets in parallel (shared-dir discipline: verify branch before every commit, stage by explicit path).
4. Implement. Validation = run the surface touched + the full gate (`gen-token-css --check` · handoff regen stable · `scenarios/validate` · `validate-trace` · `node --check` on touched `.mjs`; after #9: just run the gate scripts).
5. `/piv-commit` → `/piv-create-pr` → `/piv-review-pr N` (posts as comment review — self-approve is blocked on this repo) → fix findings → merge → close the issue **with the outcome recorded** (spike verdicts, decision cuts).

Hard rules that bite on these specific tickets: shipped pages stay vanilla (#10 #13 #14 are all view-time surfaces — ES modules beside `site.js`, no framework, no live LLM calls); generated files are regenerated, never edited (#14's download bundler, #17's token regen); honesty contract on every agent artifact (#13 compositions = re-run, never edit); Playwright/recorder are factory tooling, unrestricted but zero-dep-leaning.

## Rough effort

Wave 0 ≈ 3 short sessions · #9 ≈ 1–2 · #14 ≈ 1–2 · #13 ≈ 2–3 (spike runs dominate) · #10 ≈ 3–4. Total ≈ 10–13 focused sessions to MVP-complete.
