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

One scope reduction, recorded after the PR review caught that it was not:

8. **Task 5 ran on one of its three named targets.** The plan named the close-card line *plus* two "light touch" edits — the handoff-pack takeaway (`index.html:314–317`) and the /build takeaway (`:328–334`). Only the close-card line changed (`git diff --stat index.html` → 1 insertion, 1 deletion). Nothing is broken by this: AC #2 is satisfied by the close-card line alone, and the plan itself scoped the page as "keep edits minimal; #216 will compress this page later using this copy as source text." But the reduction went unrecorded, and Task 11's post-merge note tells #216 that home's close card "is now outcome-framed" — which a reader could reasonably take to mean the whole page had been treated. **Stated explicitly so it isn't inherited as done: the two takeaways were deliberately left untouched, and #216 should pick them up fresh.**

Also worth noting, below the deviation line: the steering-layer naming sentence uses "where neither a person nor an AI agent can drift from it" rather than the draft's em-dash aside, because the same card already carries one em-dash pair.

## Issues encountered

- **`sips` crop failed silently** when spot-checking baselines (wrote a full-size copy rather than erroring). Substituted a stronger check: old-vs-new baseline heights (all positive, proportionate to the copy added) plus targeted live-page element screenshots of every changed region.
- **The DGUI naming is a capability claim, so it was verified rather than assumed** — `system/studio-compile.mjs:57` imports `renderComposition` from `agentic-renderer.mjs`, fetches `/handoff/verdant/vocabulary.json`, and labels its own step "Rendering through the vocabulary." The sentence is true of the compile step it sits beside.
- **No blockers.** `#216` had no open PR at start or finish, so the serialization window stayed clear throughout.

## Post-review fixes (PR #246 review, all six findings)

The review's own framing decided the scope: this is a copy-only ticket, so the copy *is* the deliverable, and `#216` inherits this prose as source text. All six were fixed rather than deferred — the two Highs force a VR regen either way, and one `update:docker` run writes every changed baseline, so the two Mediums cost nothing extra.

- **H1 · `factory.html` studio lead — the DGUI sentence moved to the end of the paragraph.** It had been wedged between "…in the slot you left it in." and "*Back to blocks* plays **it** again", ending on its own "it" with a different referent ("the screen"), so the nearer, wrong candidate won and you don't *play* a screen. Moving it restores the original adjacency and still keeps the naming beside the exhibit it names. **One wording change beyond the reorder:** the sentence opened "What that step runs is…", and the review's own proposed replacement kept that while moving it two sentences further from its antecedent — which would have traded a pronoun collision for a dangling demonstrative. Replaced with the explicit noun: "The compile runs…". "Runs" is kept deliberately over "is" — `studio-compile.mjs` is what was verified, and "is" would claim more than that check supports.
- **H2 · `factory.html` `#keep` lead — the outcome sentence moved to the end.** It sat between the three-artifact list and "Every one of them", leaving that phrase's nearest candidates "an engineer" and "what you just took", both singular. The reorder restores "them" next to its list and closes the card on its outcome, mirroring approach's "Shape it" card.
- **M1 · `approach.html:31` — the spanning cluster got a measure cap.** `grid-column: 1 / -1` removed the 560px ≈ 56ch the grid column had been supplying structurally, and nothing replaced it, so the prose set at 115ch. Added `max-width: 76ch` — the repo's widest existing per-component cap, against `.max-prose`'s 65ch. **Measured live rather than assumed**, because `ch` resolves against the element it is declared on and the prose is in a child `<p class="muted">`: `.muted` sets colour only, so div and `<p>` share 16px and the declaration lands as intended. At 1280px the cluster is now 788px against the four siblings' 560px — still visibly the widest, so the PR's recorded "the longest list gets the widest measure" rationale survives. At 390px all five are 342px with no horizontal overflow, so the cap stays a genuine no-op at the mobile breakpoint.
- **M2 · `approach.html:147` — the term's two landings now agree on scope, and the split continuity is repaired.** "The industry name for **a rule like this**" pointed at a bubble defining a *layer* — the token contract, the component rules, the checks, three things. Widened to "encoding intent this way". **The review's suggested reorder was tried and rejected:** moving the naming sentence to the end of the card leaves "this way" reaching back past "no framework, no build step: plain HTML and CSS", so the framework aside becomes the nearest referent — the same defect class the finding exists to fix. Kept the position and repaired the broken continuity in place instead: "**And** no framework…" → "No framework, no build step **either**: …", which no longer depends on continuing from the token sentence.
- **L1 · this report** — deviation 8 above.
- **L2 · `factory.html`** — the orphaned `it.` and the 116-column overrun are gone; both edited paragraphs re-wrapped into the file's 93–101 column band.

**Verification beyond the standard gates:** `data-term` counts re-asserted after the prose reorders (factory **7**, approach **9**) — a multi-line edit around a `<dfn>` can drop or duplicate a mark, and no build-time gate would see it, because `initGlossary` throws at *view* time and would surface only as a mysteriously red VR page later.
