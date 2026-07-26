# /build slice 1b — the questionnaire (Hooked + Shaping) and the editable breadboard

**Ticket:** #136 · **Epic:** #134 (`.claude/plans/hooked-shapeup-pattern-builder.md`, Phase 1.3)
**Satisfies:** AC4 (≤10 questions, three acts, defaults with reasoning, Manipulation-Matrix verdict)
· AC5 (breadboard drafts from answers, four edit verbs, keyboard-first, capped, no leaks)
**Depends on:** #135 (merged, PR #141 — `build.html` + `system/build-import.mjs` on `main`)

## What ships

Two new modules and the page sections that mount them:

- `system/build-questions.mjs` — the eight-question config + a stepped runner mirroring
  `factory-intake.mjs`'s `initIntake` (radiogroup a11y, focus-on-step-change, defaults with
  reasoning), plus the shared `BUILD_CHANGE` store both acts publish into.
- `system/breadboard.mjs` — the Shape Up breadboard: a drafted `{places, connections}` model,
  rendered as labelled place groups with affordance chips and an SVG connection overlay, with four
  keyboard-first edit verbs.
- `build.html` — the three bare act mounts become two real sections, and the page's own honesty
  copy is rewritten to match what now runs.

## Decisions taken before writing (assumptions, stated)

1. **Eight questions, not ten.** The ticket's scope line says "ten method-faithful questions" but
   its own enumeration is 6 (Act 1) + 2 (Act 2). AC4 says "ten questions **max**". Eight is the
   honest count; padding to ten would add ceremony the method does not ask for.

2. **No guess-then-reveal.** `factory-intake.mjs`'s Manipulation-Matrix widget compares the
   reader's placement against **the maker's** authored verdict — that device works because Verdant
   and Fieldwork have an author. On /build the product is the visitor's own; there is no second
   judgment to sit beside theirs. So the ethics pair is two ordinary questions in the flow, and the
   quadrant renders as a verdict panel. Mirroring `renderEthics` here would ship a two-column
   compare device with nothing in the right-hand column.

3. **The frequency filter is not asked.** The ticket's Act 1 is exactly six questions: the four
   loop stages plus the ethics pair. `derive()`'s other ethics gate (frequency → habit-justified /
   utility) needs a seventh question and belongs to the intake wizard, which already asks it. This
   act produces the **quadrant**, computed from `RULESET.ethics.matrix` — the same canon
   `factory-intake.mjs:165` reads, so the two surfaces can never disagree.

4. **Enum values come from `RULESET` wherever the ruleset owns them; labels stay local.** The
   variable-reward question's option VALUES are `Object.keys(RULESET.patterns)`
   (`factory-intake.mjs:134-138`'s rule: the wizard can never offer a value the engine would
   reject). Trigger / action / investment / appetite / shape are NOT ruleset concepts — they are
   this page's own enums, declared in the config and frozen.

5. **Quadrant meaning strings are duplicated, not imported.** `QUADRANT_MEANINGS`
   (`factory-intake.mjs:153-158`) is module-private and lifted verbatim from `__UX_UI_Research.md`
   §Layer B. Exporting it from a shared module to serve a new page is exactly what #135's decision
   2 refused for `brand-import.mjs`. The four strings are copied with a comment citing both the
   source line and the canon; the **quadrant name** still comes from `RULESET.ethics.matrix`.

6. **`BUILD_CHANGE` lives in `build-questions.mjs`, not a third module.** The event name, the state
   shape and the dispatch are ~25 lines; `breadboard.mjs` imports them, and slices 1c/1d
   (`pattern-rules`, `build-share`, `build-card`) will too. A `build-state.mjs` would be the
   cleaner shape if the store grew, but three consumers of twenty-five lines does not earn a file
   under CLAUDE.md's simplicity rule. The contract is documented in the module header so a later
   slice extends it rather than reinventing it:

   ```
   document.dispatchEvent(new CustomEvent("factory:build-change", { detail: {
     source: "questions" | "breadboard",   // who published
     answers: { trigger, action, rewardType, investment, improvesLives, wouldUseIt,
                appetite, shape },          // always complete — every question has a default
     quadrant: "facilitator" | "peddler" | "entertainer" | "dealer",
     board: { places: [{ id, label, affordances: [{ id, label, to }] }],
              connections: [[affordanceId, placeId]] },
     boardIsEdited: boolean,
   }}))
   ```

   Act 0's imported token values are **not** in this payload this slice. `build-import.mjs` holds
   its record in module state and publishes nothing; wiring it in is slice 1d's job (the share
   codec is the first consumer that needs it), and inventing the seam now would mean guessing at a
   shape with no reader.

7. **Connections are affordance → place, and the tuple stays a 2-tuple.** Shape Up's definition is
   exact: connection lines "show how the affordances take the user from place to place"
   (basecamp.com/shapeup/1.3-chapter-04, verified). So a connection's source is an **affordance**,
   not a place. The ticket's `connections:[[from,to]]` shape is preserved verbatim — it is
   `[affordanceId, placeId]`. Affordances therefore carry ids, which the ticket's `affordances:[…]`
   left open. A places-to-places model would have been a wrong definition rendered on a page whose
   subject is method fidelity.

8. **The connection lines are decoration; the text is the truth.** Every affordance chip that leads
   somewhere renders its target as text (`→ Library`), and that text is what `aria-live` announces
   and what a screen reader reads. The SVG overlay is `aria-hidden="true"` and redraws from
   measured rects. If measurement is unavailable the page loses nothing but the lines — which is
   also the epic's named circuit breaker (risk register #2: cut the lines, never the verbs).

9. **`#act-shape` is removed as an anchor.** Acts 1 and 2 are one stepped wizard — splitting eight
   questions across two scroll destinations adds ceremony and breaks the "accept-and-advance in
   seconds" target. The page is deep-link-only and unlinked from the IA (#135 decision 5), so no
   link anywhere resolves to `#act-shape` (grepped across `*.html`, `*.mjs`, `*.js` and `*.md`: the
   only hits are the epic plan's mount list, #135's plan, and this one). `#act-hooked` becomes the
   questionnaire section (both
   acts, act named on each step) and `#act-breadboard` the board. The page-local `scroll-margin`
   rule loses its `#act-shape` selector in the same edit.

10. **The board drafts live until the visitor edits it, then stops.** Every question carries a
    default, so `answers` is complete on mount and a board exists before the first click (the
    `factory-intake.mjs` live-preview model, and the rest state the VR gate needs in Phase 1.5).
    Once any edit verb fires, `boardIsEdited` latches and answer changes no longer redraft — a
    silent redraft would delete the visitor's work. A "Re-draft from answers" button appears in the
    toolbar instead, and the swap is announced.

11. **No entrance animations anywhere in this slice.** The breadboard re-renders on every edit, and
    the wizard card on every step (memory: `entrance-anim-continuous-rebuild` — animations on
    continuously rebuilt nodes restart and blank). The safe version of that memory is a
    discrete-render class; the safest is not to animate at all while the page has no VR baseline
    yet. Motion polish is Phase 1.5's call, made against a captured rest state.

12. **No new tokens, no new components.** Page-local `<style>` in `build.html` under the existing
    `bx-` prefix (#135 decision 6, the `factory.html` precedent). No `tokens.source.json` change ⇒
    no `gen-token-css` / `gen-handoff` cascade.

## Method fidelity — the definitions this copy is held to

Verified against the primary sources and the repo's own grounding doc (`__UX_UI_Research.md`
§Layer A / §Layer B — the same canon `system/derive.rules.mjs:8` cites):

- **Places** — "things you can navigate to, like screens, dialogs, or menus that pop up."
- **Affordances** — "things the user can act on, like buttons and fields."
- **Connection lines** — "show how the affordances take the user from place to place."
- **Appetite** — "the amount of time we want to spend on a project, as opposed to an estimate."
  **Small batch** = one designer and one or two programmers, one or two weeks. **Big batch** = the
  same-size team, a full six-week cycle.
- **Internal trigger** — an emotion or situation stored in memory that cues the behaviour on its
  own (as against an external cue in the environment).
- **Action** — the simplest behaviour done in anticipation of a reward; the lever is ability, not
  motivation (Fogg, B = MAP).
- **Variable reward** — tribe (social) · hunt (resources or information) · self (mastery or
  completion). These three are `RULESET.patterns`' own keys.
- **Investment** — a bit of work the user puts in that makes the product better for them and loads
  the next trigger.
- **Manipulation Matrix** — two questions ("does it materially improve the user's life?", "would I
  use it myself?") → facilitator / peddler / entertainer / dealer.

Attribution follows `approach.html:185` — Shape Up as "Ryan Singer / Basecamp", the behaviour work
as "Nir Eyal" and "BJ Fogg's behaviour model". No other speaker is named anywhere (memory:
`five-pillar-talk-attribution`).

## The eight questions

Every question carries a recommended default and one line of reasoning, so the whole flow can be
accepted and advanced in seconds (`factory-intake.mjs`'s `reasoning` field is the pattern).

**Act 1 · Hooked** — asked as product questions, never as jargon.

| id | prompt | options (value) | default |
|---|---|---|---|
| `trigger` | What feeling brings someone back? | `anxious` · `unsure` · `stuck` · `restless` | `unsure` |
| `action` | What is the smallest thing they do when it hits? | `check` · `capture` · `find` · `respond` | `check` |
| `rewardType` | What do they get that keeps varying? | `tribe` · `hunt` · `self` (from `RULESET.patterns`) | `self` |
| `investment` | What do they put in that makes it better next time? | `content` · `data` · `social` · `track-record` | `data` |
| `improvesLives` | Does it materially improve the user's life? | `yes` · `no` | `yes` |
| `wouldUseIt` | Would you use it yourself? | `yes` · `no` | `yes` |

**Act 2 · Shaping**

| id | prompt | options (value) | default |
|---|---|---|---|
| `appetite` | How much time is this worth? | `small` · `big` | `small` |
| `shape` | What rough shape does the solution take? | `overview` · `worklist` · `stream` · `steps` | `overview` |

`shape` deliberately describes the **arrangement**, not a pattern name. Choosing the pattern is
slice 1c's rules file, from the breadboard's shape plus appetite — if this question named the
pattern directly, `pattern-rules.mjs` would have nothing to decide.

The verdict panel beside the wizard renders, live: the quadrant name (from
`RULESET.ethics.matrix[improvesLives][wouldUseIt]`), its meaning, and a running one-line summary of
the answers so far. It is never graded and never gated behind a reveal.

## The breadboard

**Model** — `{ places: [{ id, label, affordances: [{ id, label }] }], connections: [[affordanceId, placeId]] }`.
An affordance does not carry its own target as well: `connections` is the only record of what leads
where, because two places to write the same fact is two places for them to disagree. (This plan
first sketched a `to` mirror on each affordance; dropped while writing, for that reason.)

**Draft rules** (committed and commented in the module, the way `derive.rules.mjs` is):

- The entry place is named from `shape` (`overview` → "Overview", `worklist` → "Worklist",
  `stream` → "Latest", `steps` → "Get started").
- `action` adds the place the smallest behaviour needs: `check` → nothing extra (the entry place
  already answers it) · `capture` → "Add" · `find` → "Results" · `respond` → "Thread". `find`'s
  place is named "Results" deliberately, so the dedupe rule below collapses it with the hunt
  reward's place: searching for something and being rewarded by what you find land in one place.
- `rewardType` adds the reward's home: `tribe` → "People" · `hunt` → "Results" · `self` →
  "Progress".
- `investment` adds where the user's own work accumulates: `content` → "Library" · `data` →
  "Settings" · `social` → "Connections" · `track-record` → "Profile".
- `appetite` is the scope hammer: `small` keeps the first 3 places, `big` allows up to 6 (the cap).
- Affordances come from the same answers: the entry place always gets one affordance per other
  place (that is what connects them), plus the action's own verb.
- Duplicates collapse by label, so `find` + `hunt` do not produce two results places.

**Edit verbs** (the appetite; nothing beyond these four):

1. **Rename a place** — the label is a real `<input>` rendered in place, committed on `change`/Enter.
2. **Add / remove an affordance** — an "Add affordance" button per place appends an editable chip;
   each chip carries a remove button. Cap 6 per place.
3. **Add / remove a place** — a toolbar "Add place" button, a remove button per place. Cap 6.
   Removing a place drops every connection that pointed at it.
4. **Reconnect** — an affordance's "Connect" button enters connect mode; the next place picked
   becomes its target. Picking the current target clears the connection. Escape leaves connect
   mode. Every place is a real button while connect mode is on, so the pick is keyboard-reachable.

**Keyboard and a11y**: every editable is a real `<button>` or `<input>` in the tab order (APG's
rule for editor toolbars — no roving-tabindex grid here, because the places are a list of composite
groups, not a single-selection widget). Each place is a `<section>` with an accessible name from
its label. The connect-mode instruction is rendered as visible text, not a title attribute. A
single `aria-live="polite"` region **outside** the render root announces every edit
(`factory-intake.mjs:557-562` is the precedent — a live region inside a `replaceChildren` target
does not reliably announce).

**Focus**: `document.activeElement` is read *before* `replaceChildren` and a deliberate landing
spot restored *after* the new tree is in the document (`factory-intake.mjs:328-350, 453-458`) —
rename returns to the input with the caret at the end, add-place lands on the new place's rename
input, remove lands on the toolbar's Add button, reconnect lands back on the affordance's Connect
button.

**Listeners**: every listener on a stable node (document keydown for Escape, the container's
ResizeObserver, `document.fonts.ready`) is registered **once at mount**, outside the render
function (`guardArrows`, `factory-intake.mjs:685`, is the precedent). Listeners inside the
re-rendered subtree die with it, which is why `replaceChildren` does not leak.

**The SVG overlay**: one `<svg aria-hidden="true">` positioned over the places grid, redrawn from
`getBoundingClientRect()` after each render, on a `ResizeObserver` of the container, and once after
`document.fonts.ready`. Lines are drawn from each connected affordance chip to its target place.
Draw failures are silent — the text on the chip already carries the information.

Three things settled while drawing it, all visible only on a real screen: a connection that runs
vertically needs its bezier control points offset in Y, not X (a horizontal bend on a vertical run
throws the curve out sideways past the cards); a vertical connection whose target is ABOVE its
source enters that target's BOTTOM edge with the bend reversed (bending downward toward a target
that is up there sends the curve looping back over the very card it is meant to land on — reachable
in the wide layout by connecting one column-two place to another above it, which is the one path
every other check misses because they all source from the entry place in column one); and once the
places stack into one column the lines are not drawn at all. Stacked, they run down over the cards they pass, converge on the same few
pixels, and say nothing the chip's own "→ Place" text does not. The overlay is decoration, so the
narrow layout drops it rather than degrading it. The track count is read from the computed grid, so
the breakpoint stays in the CSS and is not duplicated in JS.

## Tasks

### 1. CREATE `system/build-questions.mjs`
- Header cites `.claude/plans/hooked-shapeup-pattern-builder.md` Phase 1.3 + this plan + ticket #136.
- `QUESTIONS` — frozen config array `{ act, id, prompt, control, options: [{value,label}], default,
  reasoning }`; `rewardType`'s values from `Object.keys(RULESET.patterns)`, asserted non-empty at
  load (`assertScenarioConfig`'s fail-loud discipline).
- The store: `BUILD_CHANGE`, `readBuild()`, `publishBuild(patch)` — merge, deep-copy, dispatch on
  `document`.
- `initQuestions()` — stepped runner: progress `n / 8`, act eyebrow, prompt as `<h3 id>` with
  `tabIndex = -1`, reasoning line, radiogroup with `aria-labelledby` pointing at the prompt, Back /
  Next footer; focus moves to the prompt on step change but never on the initial render.
- The verdict panel: quadrant from `RULESET.ethics.matrix`, meaning from the duplicated
  `QUADRANT_MEANINGS`, plus the running answer summary. Re-rendered on every answer.
- `root.dataset.buildQuestions = "ready"` at the end of mount.
- Self-boot behind `typeof document` + a `[data-build-questions]` querySelector.
- **VALIDATE**: `node --check`; headless keyboard-only pass through all eight steps; the
  `BUILD_CHANGE` payload logged complete; verdict flips to `dealer` on no/no.

### 2. CREATE `system/breadboard.mjs`
- Header cites the same docs; the draft rules block carries the Shape Up definitions verbatim with
  the chapter URL, so the rules a reader opens state what they are faithful to.
- `draftBoard(answers)` — pure, exported (slice 1c's rules file reads a board, and a pure drafter
  is what makes that testable from `node -e`).
- `initBreadboard()` — subscribes to `BUILD_CHANGE` (source `"questions"` only, or it would loop on
  its own publishes), renders, wires the four verbs, publishes `{ source: "breadboard", board,
  boardIsEdited }`.
- Caps enforced in the model, not the UI: `addPlace` / `addAffordance` refuse past 6 and announce
  why.
- `root.dataset.breadboard = "ready"`.
- **VALIDATE**: `node --check`; headless — draft appears from answers; each verb round-trips the
  model (read back from the `BUILD_CHANGE` payload, not from the DOM); 50 mixed edits leave the
  stable-node listener count unchanged and the place count ≤ 6.

### 3. UPDATE `build.html`
- Replace the "What comes next" interstitial and the three bare mounts with two real sections:
  `#act-hooked` (beat 01, the wizard + verdict in the existing `.bx-split`) and `#act-breadboard`
  (beat 02, toolbar + board + live region). Drop `#act-shape` from the section list and from the
  `scroll-margin-top` rule.
- Rewrite the copy that this slice makes false — each is a deliberate edit, not a sweep:
  - `:147` stamp `The builder · act 0 of 4` → the acts now built.
  - `:150-154` hero-sub — "Act 0 is built today." is no longer true.
  - `:160-167` `bx-caps-note` — it claims the rules are readable and then names only
    `pack-import.mjs` and `derive.mjs`. Two more rules files ship; name them, or the claim quietly
    narrows to less than the page does.
  - A new honest note naming what is still missing: the pattern that renders from the breadboard,
    the downloads and the share link.
  - `:256-259` `data-build-keep-empty` — **decided, not inherited**: it stays. Act 0's tokens.css
    is still the only thing this page hands back; the breadboard's downloads are slice 1d.
- Page-local `<style>` for the wizard, verdict panel, board, chips and overlay, under `bx-`.
- New module scripts at the end, after `build-import.mjs`.
- Run the session under the `portfolio-design` skill; `references/CHECKLIST.md` before committing.
- **VALIDATE**: `npx serve .` → /build renders both new sections, zero console errors.

### 4. Gates (the cascade, in this order)
- `git add` the two new modules FIRST — `gen-loc-summary` reads git-tracked content, so a `--check`
  before staging is a false "no drift" (memory: `loc-summary-counts-tracked-only`).
- `node agent-layer/gen-loc-summary.mjs` — both new files land in the **runtime** group, whose two
  numbers `approach.html` renders (49→51 files, 14,200→15,100 lines), so the approach baselines are
  the expected cascade (memory: `loc-summary-baseline-cascade`).
  **Outcome: no baseline rewrite was needed.** `update:docker` left both approach PNGs untouched and
  a targeted `--grep approach` run passes green against the committed tree, so the digit change is
  below the gate's diff threshold (memory: `vr-update-skips-subperceptual` predicted exactly this).
  Forcing a rewrite by deleting the PNGs would add two large binary diffs the gate does not ask for,
  so it was not done. Full suite: 18/18 green.
- **Regenerate baselines from a clean tree, not this one.** `npm run update:docker` mounts the repo
  ROOT, so it captures the five shipped `.html` files a parallel session is mid-edit on: the first
  run rewrote `index-*` and `roundtrip-*` from uncommitted work that is not this ticket's. Those
  were reverted, and the check was re-run in a throwaway `git worktree` at this branch's commit.
  Note the worktree has to live somewhere Docker Desktop shares (beside the repo, not under
  `/private/tmp`, where the mount silently comes up empty).
- `node tooling/token-lint.mjs` · `node tooling/drift-check.mjs`, on a clean tree, never mid-merge.
- **No /build VR baseline** — Phase 1.5 owns it, and baselining a page whose build stage fills in
  slice 1c is churn. The `data-*="ready"` handles are set now so 1.5 has something to wait on.
- Cross-engine functional pass: chromium + firefox + webkit (memory: `cross-engine-motion-verify`;
  Playwright resolves at `~/node_modules`).

### 5. Commit
- Stage by explicit path. Five shipped `.html` files carry an unrelated in-flight copy pass from a
  parallel session (`derive.html`, `index.html`, `instance.html`, `roundtrip.html`, `trace.html`) —
  they are not this ticket's and #135 left them alone for the same reason.
- Verify the branch immediately before staging (memory: `shared-worktree-parallel-sessions`).
- PR body carries `Closes #136` (memory: `prs-dont-auto-close-tickets`).

## Out of scope (named, so the next slice can claim them)

`pattern-rules.mjs` / `pattern-render.mjs` and the build stage rendering a real pattern (1c); the
build card, the downloads and the share codec (1d); wiring Act 0's imported token values into the
`BUILD_CHANGE` payload; the IA links from home and work; the /build VR baselines; the CLAUDE.md
architecture-map entry for /build and its modules (Phase 1.5's task, deferred by #135 too).

## Validation commands

- L1: `node --check system/build-questions.mjs system/breadboard.mjs` · `node tooling/token-lint.mjs`
- L2: `node -e` run of `draftBoard` over four canned answer sets → expected place counts and caps
- L3: `node tooling/drift-check.mjs` · `node agent-layer/gen-loc-summary.mjs --check` (after staging)
- L4: the headless act-1b script ×3 engines (keyboard pass · verdict · four verbs round-trip ·
  50-edit listener/dom check · zero console errors)
- L5: `npm run update:docker` in `tooling/visual-regression` → the two approach baselines only
