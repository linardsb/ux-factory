# PR #20 Review — portability proofs: WC wrappers + Figma parity script/docs (ticket #12)

**Verdict: ✅ Approve** (posted as a comment — GitHub blocks self-approval on the author's own account). No Critical or High findings; all validation levels pass; the diff matches the PR's stated intent and every deviation is documented in `.claude/reports/portability-proofs-report.md`. One Medium and one Low finding below are follow-up material, not merge blockers.

Reviewed fresh-eyes at head `b2df328` in the PR's own worktree, with the deep pass dispatched to the code-reviewer agent (full-file reads of every changed file, audited against `CLAUDE.md` + the three spec heads + the plan).

## Issues

### Medium

**M1 — Accessible-name convention diverges between the two composite wrappers (and from the card spec's own example).**
`system/wc/vd-plant-card.mjs:132` builds `aria-label` from the derived all-caps chip label (`${name}, ${chipLabel}` → "Monstera, DUE"), while `system/wc/vd-care-task-row.mjs:117` uses the raw lowercase status enum (`${verb} ${plantName}, ${status}` → "Water Monstera, due"). The card spec's illustrative example (`system/specs/plant-card.md:51`) reads "Monstera, watering due" — richer and lowercase. The card's template is exactly what the plan's Task 3 pinned, so this is a **spec/plan inconsistency, not an implementation slip** — but #8 and #14 will pattern-match off one of these two conventions, so it's worth reconciling now. *Failure scenario:* a screen-reader user hears two different status registers ("DUE" spelled-out vs "due") across adjacent components on the same screen. *Minimal fix:* pick one convention (lowercase raw status reads more naturally for AT) and align the card's aria-label — or update `plant-card.md` §Accessibility if the derived-label form is the decision.

### Low

**L1 — `data` setter reassigned to `null` leaves stale attributes and render.**
All three wrappers (`vd-status-chip.mjs:45`, `vd-plant-card.mjs:105`, `vd-care-task-row.mjs:91`) follow `this.#data = record ?? null; if (!record) return;` — so `el.data = null` after a prior record nulls the property but leaves every reflected attribute and the rendered shadow DOM showing the old record. Unexercised by either harness; bites only a future consumer doing list-item recycling. *Minimal fix:* in the `!record` branch, remove the observed attributes instead of early-returning — or document last-write-wins for `null` in `wc/README.md` alongside the existing attribute-after-data note.

## Validation

| Check | Result |
|---|---|
| L1 `node --check` (6 changed modules + 3 pack copies) | ✅ all pass |
| L1 `pack.json` valid JSON | ✅ |
| L2 `gen-handoff` ✓ line + determinism (2 runs, `handoff/` porcelain clean vs committed) | ✅ byte-stable |
| L2 `gen-token-css --check` | ✅ no drift (46 contract + 53 pack) |
| L2 pack copy fidelity (`wc/`, `figma-import.md` vs `system/` sources) | ✅ byte-identical |
| L3 full `build.mjs` | not re-run (only change is the ✓-line text; report ran it green, gen-handoff verified standalone) |
| L4 `demo.html` (live, agent-browser) | ✅ zero console errors; all states; monogram; species hidden when absent; chip `aria-hidden`; card `aria-label`; row `role=checkbox` + `aria-checked` flip; composed `vd-toggle {id, checked}` at `document`; scoped override pierces shadow (radius 16px→2px) |
| L4 `react.html` (live) | ✅ clean console, no duplicate-React warning; string props → attributes; `data={record}` → real DOM property; ref-wired row drives `useState` 0→1 |
| L4 regression `/index.html` | ✅ serves under the neutral pack |
| L5 parity script, no token | ✅ exit 1 naming `portal/.env`; no stacktrace |
| ACs: spike comments on #12 | ✅ both live (spike 3 outcome; spike 1 Outcome-B status), matching the plan skeletons |

## What's good

- **Token discipline is airtight**: every `var()` in all three shadow-CSS templates names a spec-head token (9/9, 11/11, 9/9), zero color literals, zero `var()` fallbacks; the one `color-mix()` mixes two spec-head tokens with the in-repo precedent cited in its own comment.
- **No XSS surface**: record fields reach the DOM only via `textContent`/`setAttribute`/DOM properties/`replaceChildren` text nodes; the only `innerHTML` write is the static CSS template in the constructor, before any data exists.
- **Secret handling is correct**: token read via the `env.mjs` regex pattern, used only as the `X-Figma-Token` header, never logged, never written to the cache or the artifact; cache path gitignored.
- **Both spike-1 branches genuinely implemented**: variables attempt → verbatim 403 gate capture → single `GET /v1/files/:key` fallback (correctly not `/styles`); correct rgba→hex; 429 prints `Retry-After` + plan tier and stops — no retry loop; `--offline` replay works against the gitignored cache.
- **Honesty contract held everywhere**: fictional notices verbatim on both harnesses, `figma.parity: null` (no placeholder artifact), spike comments state exactly what awaits the token, and the trajectory wording claims only what the harnesses demonstrated.
- **Deterministic generated pack, committed**: regeneration is byte-stable and the committed artifacts match — the repo-as-proof rule holds.

## Documented deviations (accepted, not findings)

Task 9 as designed Outcome B (#12 stays open on the real run) · `scenarios/` N/A at this base · computed `existsSync` parity field · stacked on #7's branch (merge-order needs the human call flagged in the PR body).

## Recommendation

**Merge-ready.** Land M1 as a small follow-up (or a one-line spec edit) before #8/#14 copy a convention; L1 is a README note at minimum. Remaining on #12 is only the spike-1 real run (token in `portal/.env` → run script → commit artifact → parity field flips on regeneration).

🤖 Fresh-eyes review via code-reviewer agent + live harness validation · [Claude Code](https://claude.com/claude-code)
