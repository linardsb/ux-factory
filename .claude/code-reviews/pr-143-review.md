# Code review — PR #143 · `/build`: ten questions across two acts, and both ethics gates (#136)

**Branch:** `feature/build-questions-ten-136` → `main` · **Scope reviewed:** `system/build-questions.mjs` and
`system/breadboard.mjs` **in full**, plus `build.html` — not only this PR's diff, because #142 introduced both
modules and merged without review. #142 + #143 are treated as one surface.

**Recommendation: request changes.** Three findings to fix before merge: one visitor-facing contradiction this PR
introduced, and two defects in the code the widened scope exists to catch. Everything else is note-and-merge.

Reviewed against `CLAUDE.md` as the rubric, and against `.claude/plans/build-questions-breadboard.md` including its
`AMENDMENTS` section — decisions 1, 3 and 9 were superseded by the owner, and the implementation matches the
amendments (ten questions, 7 + 3, `#act-shape` as a real section with per-act prompt ids), so the superseded
originals are not treated as deviations.

Method note: this review was done twice independently — once directly, once by a separate `code-reviewer` agent with
no access to the first pass. The two converged on the same two High findings and the same four Low ones by different
routes, which is why they are stated with confidence. Findings 3 and 10 came only from the second pass. Every
mechanism below was then **confirmed by running the surface**, not by reading it; the harness scripts live in the
session scratchpad and are not proposed for commit (this repo has no test suite by design).

Working-tree note: 5 shipped HTML files (`derive`, `index`, `instance`, `roundtrip`, `trace`) carry uncommitted copy
edits from a parallel session. This review was made against `HEAD` (`fbf3d89`), not the dirty tree.

---

## Validation

| Gate | Result |
|---|---|
| `node --check` (both modules) | ✓ pass |
| `node tooling/drift-check.mjs` | ✓ pass — syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node tooling/token-lint.mjs` | ✓ pass — 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ pass — 3 groups, no drift |
| CI `verify` | ✓ pass |
| CI `visual` | ✓ pass — but see finding 4: it did not verify the number it was supposed to |
| Reviewer's own headless runs (Chromium) | 6 scripted scenarios · 5 defects confirmed · 0 console errors |

---

## High

### 1 · The `BUILD_CHANGE` store has no working write path, and `publishBuild({answers})` is a trap

`system/build-questions.mjs:81-88` · `:320-325` · `:402-446`

This answers the scope note's question 4. The payload **shape** is right for slices 1c/1d — flat, complete, every
answer a string, fully serialisable, derived fields recomputed rather than stored. The recompute itself is sound:
`quadrant` and `frequencyVerdict` are always derived from whatever `state.answers` is at call time, never from a
caller-supplied value, so no publisher can emit a payload whose quadrant disagrees with the answers *in that same
payload*. The problem is the **write** side, which is exactly where the share codec will arrive.

`publishBuild` accepts an `answers` patch, assigns it into `state`, recomputes the derived fields, and dispatches.
It looks precisely like the write path a share-link restore needs. It is not one, in two compounding ways:

- **Two of the three consumers ignore it.** `mountVerdict`'s listener fires on `BUILD_CHANGE` but its `render()`
  reads the module-scope `answers` object (`:404-405`, `:430`), never `e.detail.answers` — which is referenced
  nowhere in the file. `mountWizard` has no `BUILD_CHANGE` listener at all, so the radios keep their old `checked`
  state. Only `breadboard.mjs` (`:566-574`) actually honours the restore, so the board redrafts while the wizard and
  the verdict panel do not — the page visibly disagrees with itself.
- **The next click erases it.** `setAnswer` (`:322-325`) publishes `{ ...answers }` from that same stale module
  global, so one radio change reverts the entire restored set — the changed field plus nine stale defaults.

Confirmed. After `publishBuild({ source: "questions", answers: { …DEFAULT_ANSWERS, improvesLives: "no",
wouldUseIt: "no", frequency: "rarely" } })`:

```
payload quadrant        : dealer   | payload freq passes: false
panel quadrant before   : Facilitator -> after: Facilitator
panel freq data-passes  : true
DESYNC?                 : YES — payload says dealer, panel shows Facilitator

… then one click on the `trigger` radio in Act 1:
state after one click   : {"improvesLives":"yes","frequency":"daily","quadrant":"facilitator"}
REVERTED?               : YES — the restored answers were silently overwritten
```

So the store can hold `dealer` / frequency-failed while the page displays `Facilitator` / passes, and the
disagreement resolves by discarding the store's value. On `build.html` as shipped this is **latent** — only
`setAnswer` ever publishes answers, and it always writes the global first, so nothing misbehaves today. It becomes
real the moment 1d restores answers from a URL, and at that point the fix spans three modules plus whatever the
codec already serialised. That is the trade the scope note called cheap now.

**Minimal fix:** make the module global the single source of truth and give it a real setter.

```js
export function setAnswers(patch) {
  Object.assign(answers, patch);
  publishBuild({ source: "questions", answers: { ...answers } });
}
```

`setAnswer` becomes `setAnswers({ [id]: value })`; `mountVerdict`'s listener renders from `e.detail.answers`; and
`mountWizard` re-renders its current step on a `BUILD_CHANGE` it did not itself cause (without stealing focus), so
the visible radio matches the restored answer. Declaring `publishBuild`'s `answers` key internal — or dropping it in
favour of `setAnswers` — removes the trap. Finding 11 (the boot double-render) collapses into the same edit.

### 2 · Renaming a place leaves four dependent labels stale — three of them accessible names

`system/breadboard.mjs:222-234` (place) · `:260-272` (affordance twin)

`renamePlace` deliberately skips a full re-render to protect the caret in the input being typed in — the right
instinct, and the comment explains it well. But it refreshes only the toolbar, the lines and the publish. Every
*other* node the label was already painted into keeps the old string until some unrelated verb happens to trigger a
full `render()`.

Plan decision 8 is explicit that the SVG overlay is decoration and **the text is the truth** — `aria-hidden` on the
lines is justified by the chip rendering its target as text. After a rename, that text is not the truth.

Confirmed. Default answers draft `Overview → Progress / Settings`; renaming place 2 to "Streak":

```
place p2 input value    : "Streak"            ← what the visitor sees they typed
chip p1a2 connect text  : "→ Progress"        ← STALE, visible on screen
chip p1a2 connect aria  : "Connected to Progress. Change or clear this connection."   ← STALE
place p2 section aria   : "Place 2: Progress"                                          ← STALE
place p2 remove aria    : "Remove the place \"Progress\""                              ← STALE
published board labels  : ["Overview","Streak","Settings"]   ← the model is correct; only the DOM lies
live region             : "Place renamed to \"Streak\"."     ← the announcement is correct
```

The visible `→ Progress` is the cheap half. The expensive half is the three accessible names: a screen-reader user
who renames a place is then told it is still called "Progress", and the remove button offers to remove "Progress" —
worse for them than for a sighted user, who at least sees the rename land on the place itself. `renameAffordance`
has the identical defect on its own chip's two aria-labels (`Connect "<old>" to a place` / `Remove the affordance
"<old>"`).

**Minimal fix:** a small `refreshLabels()` called from both rename verbs — for a place, its section `aria-label`, its
remove button's `aria-label`, and every `[data-aff]` chip whose connection targets it (button text + `aria-label`);
for an affordance, its own two `aria-label`s. Keeps the caret where it is; just stops leaving stale strings behind.

---

## Medium

### 3 · `build.html`'s hero still says "eight questions" — a contradiction this PR introduced

`build.html:430` · `:445` · `:17` · `:232`

This is the one finding that is a regression of **#143 itself**, not inherited from #142. Before this PR there were
genuinely eight questions and the copy was true. #143 made it ten and updated the beat titles ("Seven questions…",
"Three questions…") and the breadboard lead ("drafted from your ten answers") — but not the hero:

- `:430` — "…**Answer eight questions** about your product and it drafts a breadboard you can edit."
- `:445` — "`system/build-questions.mjs` **holds the eight questions** and the ethics verdict"

So the top of the page tells a visitor eight, and the two sections below it tell them seven and three. On a page
whose entire subject is working from a method faithfully, a reader who counts is the reader this page is built for.

Two more, lower-stakes, in the same family:

- `:17` — the page header comment still reads "This slice ships **ACT 0 only**: the import. The remaining three acts
  are bare mounts that later slices fill." Acts 1–3 now ship; the citation is also still `ticket #135`.
- `:232` — a CSS comment says "The **eight** answers as a definition list".

**Minimal fix:** "ten questions" in both visitor-facing lines, and refresh the two comments. Cheap, and it is the
honesty contract rather than polish.

### 4 · `approach.html`'s VR baselines are stale against `loc-summary.json`, and the gate did not catch it

`system/loc-summary.json` · `tooling/visual-regression/baselines/approach-{neutral,saulera}.png`

`approach.html:237-251` renders the measured runtime numbers, so per `CLAUDE.md`'s deploy-the-artifacts discipline a
`loc-summary` change gets its two approach baselines regenerated **in the same PR**. Provable facts:

- The approach baselines were last regenerated at `bab1553` (#135), where runtime was **49 files / 14,200 lines**.
- #142 moved it to 51 / 15,100 with no baseline regen; **#143** moves it to 51 / 15,200, also with no regen.
- The page really does render the new number — headless, under the gate's own conditions:
  `"…the design system this site ships is 51 files, about 15,200 lines."`
- The `visual` gate **blocks** on this branch (`continue-on-error` is scoped to `feature/v3-*` only) and **passes**.

I ruled out the two easy explanations: `still()` (`system/motion.mjs:15-17`) returns true under
`navigator.webdriver`, so the countUp is a no-op in the gate and the final string is captured deterministically; and
the D11 VR-freeze does not apply to this branch. The likely remaining mechanism is that three changed glyphs
("49"→"51", "14,200"→"15,200") fall inside `maxDiffPixels: 100` — **that part is inference, not measured.** What is
certain is the consequence: the gate is not verifying that number, and the committed baselines disagree with the page.

The drift **starts at #142**, not here; #143 adds 100 lines to an already-stale baseline. The fix is one regen
covering both (`cd tooling/visual-regression && npm run update:docker`). Worth noting that the 100-pixel budget is
documented as "~4 orders of magnitude below any real regression" — if real content drift is now consuming it, that
claim is weaker for this region than the comment says.

### 5 · A malformed `data-act` is a silent no-op that also withholds the VR ready handle

`system/build-questions.mjs:331-336` · `:394`

`mountWizard` returns early when `ACTS[actKey]` is missing — before `root.dataset.buildQuestions = "ready"`. The
module is otherwise scrupulously loud: `:294` **throws** at load if a *question* names an act with no section. The
mirror case — a *section* naming an act that does not exist — fails silently.

Confirmed by serving `build.html` with `data-act="shaping"` rewritten to `"shapingg"`:

```
bad data-act → { "readyHandle": "(unset)", "wizard": "These questions run in your browser…", "hooked": "ready" }
thrown errors: none (SILENT no-op)
```

Two consequences: the section keeps its no-JS fallback copy while JS is running and healthy (an honesty wrinkle,
since that copy promises the opposite), and Phase 1.5's VR wait on the `"ready"` handle would hang to timeout on
that mount — the failure mode `vr-visible-beats-need-post-resize-wait` already cost this repo once. Not reachable
via the committed markup, so this is latent.

**Minimal fix:** `if (!act) throw new Error(…)` alongside the existing load-time throws. The markup is committed, so
a bad `data-act` is an authoring bug that should break at load, not degrade quietly.

### 6 · The breadboard can publish a board with `answers: null`, contradicting the documented contract

`system/breadboard.mjs:171-172` · `:185-187` · `system/build-questions.mjs:81-88`

`mount()` falls back to `DEFAULT_ANSWERS` locally when `readBuild().answers` is null, drafts a board from them, and
publishes the board — but never publishes the answers it drafted from. On a page carrying `[data-breadboard]`
without any `[data-build-questions]` (plausible for 1d's build-card, or a share-link landing surface), the boot
publish at `build-questions.mjs:457` never fires. Confirmed, with the question mounts disabled:

```
{ "source": "breadboard", "answers": null, "quadrant": null, "frequencyVerdict": null,
  "boardIsEdited": false, "boardPlaces": ["Overview", "Progress", "Settings"] }
```

A fully drafted three-place board published beside `answers: null` — a consumer cannot tell what the board was
drafted from, even though it demonstrably came from `DEFAULT_ANSWERS`. The header contract at `:30-46` documents all
fields as populated together, so a 1c/1d consumer coded against the doc reads `null` where it expects a quadrant.
Not reachable on `build.html`, which mounts both.

**Minimal fix:** seed `state.answers` from `DEFAULT_ANSWERS` at module load, or have the breadboard publish the
answers it actually drafted from.

---

## Low

7. **Removing the entry place zeroes every connection, and the announcement doesn't say so** —
   `breadboard.mjs:211-220`. By construction only the entry place's affordances ever carry connections
   (`:123-133`), so removing it strips all of them. Confirmed: `connections: [["p1a2","p2"],["p1a3","p3"]]` → `[]`,
   leaving two mutually disconnected places, with the live region saying only `Removed the place "Overview". 2 of
   6.` The model behaviour is *correct* — the connectors lived on the removed place — and "Re-draft from answers"
   appears immediately as a recovery path, which is why this is Low. The gap is the announcement: for a
   screen-reader user the board's entire connective structure vanishes silently. One clause on the announce message
   ("…and the 2 connections that ran from it") closes it.

8. **The act-advance button scrolls without moving focus** — `build-questions.mjs:374-380`. Confirmed: after
   clicking "Go to shaping", `focus → {"tag":"BUTTON","text":"Go to shaping","inSection":"act-hooked"}` while the
   page scrolled to `#act-shape`, so a keyboard user's next Tab resumes in the act they just left. The module
   already has the tool for this (`tabindex="-1"` on the prompt heading, `:352`, `:388`) — it just isn't applied to
   the target section's heading on advance.

9. **The two ruleset-owned enums derive in opposite directions** — `build-questions.mjs:190-196` vs `:166`.
   `rewardType` *maps from* `Object.keys(RULESET.patterns)`, so a new ruleset key throws loudly at load (no label →
   the `:299` assert). `frequency` *filters a hardcoded list against* `RULESET.ethics.frequencyFilter`, so a newly
   added ruleset key is silently never offered. The comment at `:186-188` claims the question "can never offer a
   frequency the gate has no ruling for" — true, but only one direction is guarded, and the sibling question in the
   same file guards both. The two sets match exactly today (`derive.rules.mjs:148`), so nothing is live.

10. **Prompt ids *and* radio `name`s are keyed per-act, not per-mount** — `build-questions.mjs:338-340`, `:360`. The
    comment says "Ids have to be unique per mount"; the code keys both on `actKey` / question id. Equivalent today
    (one mount per act), but a page rendering the same act twice would get duplicate DOM ids — both radiogroups'
    `aria-labelledby` resolving to the first heading — and, more subtly, both mounts' radios would share a `name`
    with no `<form>` boundary between them, so browsers would treat them as one mutually exclusive group and
    checking a radio in one mount would silently uncheck its twin in the other. Either key both off a per-mount
    counter, or narrow the comment to what the code guarantees.

11. **The verdict panel renders twice at boot** — `build-questions.mjs:444` renders directly, then `:457`'s publish
    re-renders it through the listener. Measured: `verdict panel renders during boot: 2`. Harmless; finding 1's fix
    collapses it.

12. **The no-go count line can contradict an edited board** — `breadboard.mjs:344-347`. The toolbar keeps asserting
    "ruled out by your no-go: People, Connections" after the visitor has manually added a place named "People".
    Arguably correct as a record of what the *draft* ruled out, but it reads as a claim about the board in front of
    you.

13. **Rename inputs have no `maxlength`** — `breadboard.mjs:362-368`, `:407-412`. An arbitrarily long pasted string
    lands in a label, two `aria-label`s and the count line. Not a security issue (see below), but worth a cap given
    1d will serialise these into a URL.

---

## What's genuinely good

- **The connection model is right, and for the stated reason.** A connection's source is an *affordance*, not a
  place, matching Shape Up's actual definition, with `connections` as the single record of what leads where and the
  reasoning committed in the header before the code does it. On a page whose subject is method fidelity, getting
  this wrong would have been an honesty bug.
- **Untrusted-input discipline is clean** (scope question 5). No `innerHTML` anywhere in either file; visitor text
  reaches the DOM only via `textContent` (the `el` helper's `text` key) or `.value`, neither of which parses as
  markup, and `aria-label` interpolation is safely escaped by `setAttribute`. Ids come only from `nextId` or
  `draftBoard`'s literals (`p1`, `p1a1`, …), never from typed text, so every `[data-aff="…"]` / `[data-place="…"]`
  selector and every `pendingFocus` selector is structurally immune to injection or breakage. `:153-154` states the
  invariant explicitly. Only finding 13's unbounded length is outstanding.
- **Three permanent document listeners, and no feedback loop** (scope question 2). The reentrant case was traced
  explicitly: a `"questions"` publish synchronously triggers a nested `"breadboard"` publish inside the same
  `dispatchEvent`, and the `source` filter in both listeners terminates it in one hop — no loop, no double board
  render. Listeners are registered once on stable nodes outside `render()`, so `replaceChildren` cannot leak them,
  matching the `guardArrows` precedent the header cites.
- **Dangling connections are handled on both remove verbs**, including the non-obvious half: `removePlace` drops
  connections whose *source affordance* went with the place, not just those pointing at it, and clears `connectFrom`
  if the pending affordance was destroyed. That is more thorough than the plan's own wording, which mentions only
  connections that pointed at it.
- **`draftBoard`'s rule order follows the method** — dedupe → no-go subtraction → appetite cap
  (`breadboard.mjs:108-113`), i.e. declare-out-of-scope *then* scope-hammer, not the reverse. The `find` + `hunt` →
  one "Results" place dedupe is a genuinely nice catch.
- **Focus management after `replaceChildren` is solid** — `pendingFocus` set before `render()`, applied after, with
  caret-to-end for text inputs. Finding 2 is not a focus bug; focus lands correctly, the problem is stale content on
  nodes focus never visits.
- **Both ethics gates read `RULESET` directly** and render its verdict sentence verbatim, so this page and
  `factory-intake.mjs` structurally cannot disagree — and letting the two gates rule independently is the honest
  reading rather than the flattering one.
- **The load-time asserts** (`:293-302`) are the right shape: a ruleset edit that drops a key or a default breaks at
  load, not on stage. Finding 5 asks for one more of these, not a different approach.
- **The rename verbs' refusal to re-render** is the correct instinct; finding 2 is about finishing it, not reversing it.
- **`draftBoard` is pure and exported**, genuinely checkable from `node -e`, which is what slice 1c will want.

---

## Recommendation

**Request changes**, on findings 1, 2 and 3.

- **Finding 3** is a two-word edit and a visitor-facing contradiction introduced by this PR. It should not merge.
- **Finding 2** is a user-visible wrong label plus three wrong accessible names, on a page that stakes the
  `aria-hidden` on its lines on the text being the truth. One `refreshLabels()` helper.
- **Finding 1** is latent today and cannot misbehave on `build.html` as shipped — but it is a contract defect in the
  exact seam 1c/1d were told to build on, and fixing it after the codec exists costs three modules plus a migration.
  An exported `setAnswers` plus rendering from `e.detail.answers` is small and contained now.

Findings 4 and 5 are worth landing in the same pass (4 is a one-command baseline regen that also clears #142's
drift; 5 is a two-line throw). 6–13 are fine as follow-ups, or as deliberate no-ops with a comment.

Nothing here contradicts a decision recorded in the plan or the epic, and both amendments (A1 ten questions, A2
`#act-shape` as a real section) are implemented as written. The two High findings are inherited from #142 rather than
introduced here — which is the case for having widened the scope.
