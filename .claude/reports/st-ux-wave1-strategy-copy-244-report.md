# Implementation Report — ST/UX Wave 1: the strategy layer's copy (T1 + T2)

**Plan**: `.claude/plans/st-ux-wave1-strategy-copy-244.md`   **Branch**: `feat/244-st-ux-wave-1`   **Status**: COMPLETE (Task 11 is post-merge)

## Summary

Landed the strategy layer's copy on the current IA with zero new files and zero new subsystems. `approach.html#sources` gained a fifth cluster, "Strategy & systems," spanning the full final row of the existing two-column grid. Approach's four method habits, home's close card and factory's `#keep` lead were rewritten so each states the outcome it buys. Three industry terms — `declarative-generative-ui`, `steering-layer`, `management-flight-simulator` — land twice each: a naming sentence beside the exhibit that does the thing, and an entry in `system/glossary.mjs`'s `TERMS` map, which buys the WCAG 1.4.13 bubble and both page mounts for a data edit.

## Tasks completed

- Task 0 — branch off `origin/main`, `#216` window re-verified clear (`gh pr list --state open` empty)
- Task 1 — three `TERMS` entries → `system/glossary.mjs` (UPDATE)
- Task 2 — fifth cluster + `grid-column: 1 / -1` page-scoped rule + steering-layer naming → `approach.html` (UPDATE)
- Task 3 — four method cards' outcome reframing → `approach.html` (UPDATE)
- Task 4 — MFS + DGUI namings in the studio lead, `#keep` outcome sentence → `factory.html` (UPDATE)
- Task 5 — close-card line reframing → `index.html` (UPDATE)
- Task 6 — bidirectional term-key cross-check
- Task 7 — drift checks (`gen-loc-summary`, `gen-param-count`)
- Task 8 — `build-checks` + live render across all three pages
- Task 9 — copy commit `1771852`, baselines commit `d46f510`
- Task 10 — PR
- Task 11 — **post-merge, not yet done**: the inheritance note on #216

## Tests added

None — the repo has no suite and none was invented. The gates that cover this work already exist:

- **The loud glossary gate** is the integration test: `initGlossary` throws on an unknown `data-term` before any DOM is touched, and on both pages it runs upstream of the VR ready handle. A typo'd key means the handle never fires and CI goes red.
- **Task 6's bidirectional grep** is the mechanical pre-browser version of the same check (marks → `TERMS`, and each new `TERMS` key → at least one mark).

## Validation results

| Check | Result |
|---|---|
| `node --check system/glossary.mjs` | pass |
| `node -e "import('./system/glossary.mjs')"` | pass — module scope stays DOM-free |
| `node tooling/build-checks.mjs` | **18/18 groups pass** |
| `node agent-layer/gen-loc-summary.mjs --check` | no drift — runtime 25,763 lines, still rounds to the committed 25,800 (87 lines headroom) |
| `node agent-layer/gen-param-count.mjs` + `git diff` | **empty** — 102 controls, unchanged; zero manifest entries owed |
| Term cross-check, both directions | 13 marks all resolve; all 3 new keys marked |
| `data-term` counts (`grep -o … \| wc -l`) | approach **9**, factory **7**, index **0** — as planned |
| Live render, all three pages | approach `data-asrc=ready`; factory `data-studio=ready` + `data-replay=settled`; index `data-spine=ready`. Zero page errors (bar the expected `ERR_CONNECTION_REFUSED` fixture degradation on factory) |
| Bubbles by keyboard | all three new terms open on focus and dismiss on Esc |
| Cross-engine × responsive | chromium · webkit · firefox × 1280 / 900 / 390 px: cluster spans the full row at desktop, is a no-op at both mobile widths, no horizontal overflow anywhere |
| VR regen | `update:docker` from a clean detached worktree — **20/20 passed**, the 6 target baselines written fresh, the other 14 unchanged |
| Baseline count | exactly **6** modified, the expected 6 names |

Baseline height deltas (all positive → nothing truncated): approach +179/+224, factory +227/+256, index +73/+77 px.

## Deviations from the plan

The plan bound the authorial pass to *tightening only*, and named the register rules and the honesty contract as constraints. Six edits tightened the drafts against those constraints; each is a constraint the plan itself stated, not a loosening.

1. **`management-flight-simulator`'s definition rewritten to carry the literal word "illustrative."** The plan's draft said "honest **illustrations**" while the plan's own AC requires the word *illustrative* in both landings. As drafted the AC would have failed. Now greppable: `illustrative` appears once in `system/glossary.mjs` and once in `factory.html`.
2. **All three glossary entries tightened to the existing map's word band.** The drafts ran 48–55 words against the eleven existing entries' 19–37. Now 39 / 39 / 37, two sentences each — the architecture doc's register is "quiet clarification in place, no pedagogy framing," and length is where pedagogy leaks in.
3. **Method card 2 dropped "not one that just shipped."** That is a negative parallelism; the plan's register rule bans the shape. Replaced with "…a feature people come back to without being nudged," which also sets up the ethics sentence that follows.
4. **Method card 3 dropped the "Shipping is an output." opener.** A maxim, on a site whose differentiator is performing rather than describing. The reframe now runs in first person — "The outcome I'm after is what changed for the person using it, so before building I write down…" — and both `dfn` marks survive verbatim inside it.
5. **Home's close-card line dropped "not a deck about one."** X-not-Y plus a competitive dig; the one line on the page that would have read as selling. Now: "…and what you'd hold at the end of it: a system your engineers can build on."
6. **Factory's `#keep` dropped "with nothing left to ask me in a meeting."** That is a capability claim stronger than the pack can guarantee, and the honesty contract governs it. Matched to home's existing defensible ceiling instead: "an engineer can start building from what you just took."

One structural deviation:

7. **Factory's studio lead was split into two `<p class="beat-lead max-prose">`.** Both insertions pushed it to 228 words. The plan's Task-4 GOTCHA pre-authorized restructuring at exactly this point, offering "the namings may become their own short `<p>` directly after the lead" — I split the lead at its natural seam instead, because that keeps each naming beside the claim it names (the ticket's "beside the exhibit that does the thing" requirement) where the offered alternative would have pulled both into a two-term aside, which reads as describing rather than performing. Result: 75 + 154 words, both halves shorter than the 172 that shipped before. One pronoun changed so the second paragraph has its antecedent ("Each block **it** leaves behind" → "Each block **the run** leaves behind"). Verified no JS queries `.beat-lead` and no CSS uses a structural selector on it.

Also worth noting, below the deviation line: the steering-layer naming sentence uses "where neither a person nor an AI agent can drift from it" rather than the draft's em-dash aside, because the same card already carries one em-dash pair.

## Issues encountered

- **`sips` crop failed silently** when spot-checking baselines (wrote a full-size copy rather than erroring). Substituted a stronger check: old-vs-new baseline heights (all positive, proportionate to the copy added) plus targeted live-page element screenshots of every changed region.
- **The DGUI naming is a capability claim, so it was verified rather than assumed** — `system/studio-compile.mjs:57` imports `renderComposition` from `agentic-renderer.mjs`, fetches `/handoff/verdant/vocabulary.json`, and labels its own step "Rendering through the vocabulary." The sentence is true of the compile step it sits beside.
- **No blockers.** `#216` had no open PR at start or finish, so the serialization window stayed clear throughout.
