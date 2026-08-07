# Feature: ST/UX Wave 1 — the strategy layer's copy (T1 + T2)

The following plan should be complete, but validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, classes and idioms. This is a **copy-only** ticket riding existing mechanisms — the moment a task here wants a new module, subsystem, or tracker, the epic's own guardrail has fired: cut back to the reframing.

## Feature Description

Land the strategy layer's copy on the current IA, in the outcomes-over-outputs register — zero new files, zero new subsystems:

- **T1** — a fifth cluster, "Strategy & systems," in `approach.html#sources`' existing `grid grid-2` of caption+prose clusters (currently 4). The 5-items-in-2-columns layout call (orphan vs spanning row) is decided in this PR and recorded in the PR body.
- **T2** — an outcome-reframing copy pass over approach's method section + the home and factory close cards: each method habit states the outcome it buys. Three industry-term namings each land **twice** — a one-sentence naming in the prose beside the exhibit that does the thing, AND a new entry in `system/glossary.mjs`'s `TERMS` map (`declarative-generative-ui`, `steering-layer`, `management-flight-simulator`) — a data edit that buys the WCAG 1.4.13 bubble UI and both page mounts (approach + factory) for free. "Management flight simulator" is labeled *illustrative*.

## User Story

As a hiring manager / design-leadership interviewer screening senior UXE candidates at the £70–80k band
I want the site to name its structure in the industry's own strategic vocabulary and state the outcomes its method buys
So that I can verify strategic capability (not just craft and method) and justify the senior band.

## Problem Statement

The site proves craft (token contract, gates, measured claims) and method (Hooked + Shape Up performed live) but never articulates *why* those habits buy business outcomes. The repo embodies at least nine named industry patterns — declarative generative UI, a steering layer, management flight simulators — without ever saying their names, so credit for them goes unclaimed and the profile reads as senior execution.

## Solution Statement

Name the structure and state the outcomes using only existing mechanisms: the sources grid gains a cluster, the glossary's `TERMS` map gains three entries (the bubble UI and both mounts come free), and the method/close copy is rewritten in the outcomes-over-outputs register. This is a Meadows-high intervention — information and goals level, no new subsystems.

## Out of Scope / Non-Goals

- **Not included: T3 (the leverage ladder)** — that's #245, blocked on #216's landed IA. No `<details>` rungs, no analytics tracker, no `analytics.mjs` edit whatsoever in this PR (the tracker named in the architecture doc belongs to T3).
- **Not included: T4** (mini flight simulator) — parked, possibly its own future epic.
- **Not changing: the method spine's mechanics** — /build's ten questions, the breadboard, the studio's verbs/canvas/replay. The epic *augments* Singer + Eyal; it renames and reframes nothing in the spine's mechanics.
- **Not changing: `build.html`** — the research note "management flight simulator beside /build & the replay" resolves to factory's replay prose; build.html has no glossary mount and is not in the ticket's files-touched list.
- **Not changing: quantifiable claims** — `loc-summary.json` / `param-count.json` numbers stay generated and JS-rendered; the pass rewords *around* them, never retypes them.
- **Not adding: `param-manifest.json` entries** — glossary bubbles are explicitly excluded by the manifest's counting rules ("glossary hover/focus bubbles (passive reading aids)"), and nothing here adds an operable control.
- **Not adding: any new tracked source file** — the loc-summary "new file" cascade never fires (line-count drift from edits is still checked; see Task 7).
- **Not touching: home's intake/brand/peak beats' copy** — #216 owns home's compression; this ticket touches only the close card (`#beat-close`).

## Feature Metadata

**Feature Type**: Enhancement (copy + one data-map edit)
**Estimated Complexity**: Low (mechanically) / Medium (authorially — the copy IS the work)
**Primary Systems Affected**: `approach.html`, `index.html`, `factory.html`, `system/glossary.mjs`, VR baselines (6 PNGs)
**Dependencies**: none new. Serialized against #216 (open, no active PR as of 2026-08-07 — the window is clear; re-verify before starting: `gh pr list --state open`).

## Related Work

**Implements**: [#244](https://github.com/linardsb/ux-factory/issues/244) · **Epic**: [#243](https://github.com/linardsb/ux-factory/issues/243) + `docs/epics/st-ux-fusion.architecture.md` (inherited, not re-decided: stack = nothing new; T2's twice-landing mechanism; the attribution rules; the #216 coordination contract)

**Back-references**:

- `.claude/plans/st-ux-fusion-epic-research.md` — Why: the content source (§2's nine unnamed patterns; the Center Centre register; §1's attribution hazards)
- `docs/epics/st-ux-fusion.prd.md` — Why: §6 Wave 1 scope, §8 non-goals, §4 guardrail

**Forward-references**:

- #245 (T3, the leverage ladder) — plans just-in-time after #216 lands
- #216 — inherits T2's outcome-framed copy as the source text for its trim (post-merge note, Task 11)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `approach.html` (lines 19–26 inline `<style>`; 52–112 method section; 114–162 case-study cards; 188–215 sources section) — Why: T1's grid lives at 196–213; T2's method cards at 62–109; the steering-layer naming lands in "The one rule" card (131–139); the inline style block is the precedent home for the one page-scoped layout rule.
- `system/glossary.mjs` (lines 35–58 `TERMS`; 60–65 the loud validate) — Why: the three new entries go in `TERMS`; note the entry format (kebab key, author's-voice 1–2 sentence string) and that an unknown `data-term` key throws before any DOM is touched.
- `index.html` (lines 294–342, `#beat-close` `.close-card`) — Why: home's close-card copy is a T2 target. **Home has NO glossary mount** — see GOTCHA in Task 5.
- `factory.html` (lines 199–211 the studio lead paragraph; 351–377 `#keep`; 438–445 final CTA) — Why: the DGUI + MFS namings land in the studio lead; the factory "close card" resolves to `#keep`'s beat-lead (355–363).
- `system/studio.mjs` (lines 602–617) — Why: factory's `initGlossary(root)` runs here, deliberately OUTSIDE the try/finally, so an unknown key aborts before `data-studio="ready"` and VR fails red. Do not touch — just know this is the loud gate the AC leans on.
- `system/components.css` (lines 589–596) — Why: `.grid-2` is `repeat(2, 1fr)`, collapsing to `1fr` at the mobile breakpoint — so a `grid-column: 1 / -1` span rule is a harmless no-op on mobile. **Do not edit components.css** (its consumer blocks feed `system-graph.json`).
- `tooling/visual-regression/visual.spec.mjs` (lines 31, 35, 77–78) — Why: the three touched pages' capture entries and ready handles: index waits `#beat-hero[data-spine="ready"]` + waitVisible `#beat-peak[data-peak="ready"]`; approach waits `#asrc[data-asrc="ready"]`; factory waits `[data-studio="ready"]` + `[data-replay="settled"]` (90s timeout).
- `agent-layer/gen-loc-summary.mjs` (lines 23–25) — Why: group membership. `glossary.mjs` → runtime group (the one approach.html renders); the three HTMLs → pages group; nothing touched is in generators.
- `system/param-manifest.json` (`$description`) — Why: confirms glossary bubbles and plain `<a>` navigation are excluded — zero entries owed.

### New Files to Create

**None.** (This is itself an acceptance criterion — a new tracked source file means the guardrail fired.) The only new artifacts are the plan/report/review files under `.claude/` in the same PR, which loc-summary does not count (it matches only `system/`, root+proto `*.html`, and `agent-layer/`).

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `docs/epics/st-ux-fusion.architecture.md` — "Recommended approach" T1/T2, "Key decisions" (VR posture; attribution; sequencing vs #202), "Missing pieces" (the copy is the real work; the layout call is this PR's).
- `.claude/plans/st-ux-fusion-epic-research.md` — §1's per-source takeaways (the register source material), §2's shipped-pattern table (what each naming truthfully points at), the attribution-hazards paragraph.
- `docs/epics/annotated-source-glossary.architecture.md` — the glossary's design rules (register: "quiet clarification in place, not a glossary feature, no pedagogy framing") — the three new definitions must keep that voice.

### Patterns to Follow

**Glossary `TERMS` entry** (`system/glossary.mjs:36–37`): kebab-case key, flat string value, author's voice, 1–2 plain sentences, no markup (rendered via `textContent`):

```js
"design-token":
  "A named colour, size or timing value that components ask for by name instead of writing it out. Change the value in one place and everything that asks for it follows.",
```

**`<dfn>` term mark** (approach.html:91, factory.html:99): `<dfn class="term" data-term="<key>" tabindex="0">visible text</dfn>` — `tabindex="0"` is required (keyboard focus path for the 1.4.13 bubble).

**Sources cluster** (approach.html:197–200): `<div>` → `<h3 class="caption">` + `<p class="muted">` with names and one-breath context, comma-separated.

**Page-scoped one-off CSS** (approach.html:19–26): the inline `<style>` block with a comment stating why — the precedent for the span rule. (portfolio.css would also be legitimate, but the inline block keeps the runtime loc-summary group untouched and the rule next to the only markup that uses it.)

**Copy register** (the site's voice, per portfolio-design + the honesty contract): first person, short declarative sentences, concrete nouns, no promotional adjectives, no "isn't just X, it's Y" constructions, no rule-of-three padding. Outcomes-over-outputs means: say what changed for the user or the business, not what was produced. Never claim a number that isn't generated.

**Attribution rules (hard, bind every sentence here)**: the five-pillar AI-trust content never names its source speaker (cite Nielsen/Amershi/PAIR if it comes up — it should not in this ticket); "Yes, And" credits **Leslie Jensen-Inman**, not Spool; Crawford material is Crawford-via-Wroblewski (not used in this copy — the cluster lists Wroblewski for his own AI-UX material).

---

## IMPLEMENTATION PLAN

### Phase 1: Branch + the data edit (glossary terms)

Housekeeping, then the three `TERMS` entries — everything else validates against them.

### Phase 2: The copy (approach, home, factory)

**Depends on:** Phase 1 (the `data-term` marks must reference keys that exist, or both pages' mounts abort and every local render check fails).

All three page edits are independent of each other and could in principle be parallel, but they're small — do them sequentially in one sitting to keep the register consistent across pages.

### Phase 3: Drift checks + local validation

Loc-summary regen (after staging), param-count no-op assert, term-key cross-check, build-checks, live render of all three pages.

### Phase 4: VR baselines + PR

Commit the copy, regenerate the 6 baselines from a clean detached worktree, eyeball the PNGs, PR with the layout call recorded, post-merge note on #216.

---

## STEP-BY-STEP TASKS

### Task 0 — CLEAN + BRANCH

- **IMPLEMENT**: The three epic docs sit untracked in this shared worktree but are byte-identical to origin/main (verified 2026-08-07, commit f988228) — remove the untracked copies so the checkout is clean, then branch off origin/main:
  ```bash
  git fetch origin
  rm docs/epics/st-ux-fusion.prd.md docs/epics/st-ux-fusion.architecture.md .claude/plans/st-ux-fusion-epic-research.md
  git checkout -b feat/244-st-ux-wave-1 origin/main
  ```
  (After checkout the three files reappear as tracked content from main — that's correct.)
- **GOTCHA**: Shared worktree, parallel sessions — verify the branch immediately before every commit (`git branch --show-current`) and stage by explicit path, never `git add -A`. Re-verify the #216 window first: `gh pr list --state open` — if a #216 PR is open/active, STOP and coordinate (the ticket's hardest constraint is "never concurrent with #216").
- **VALIDATE**: `git status --short` shows clean (bar this plan file); `git branch --show-current` → `feat/244-st-ux-wave-1`
- **SATISFIES**: the coordination boundary (ticket "Coordination" section)

### Task 1 — UPDATE `system/glossary.mjs` (T2's data half)

- **IMPLEMENT**: Add three entries to `TERMS` (after `"contrast-pair"`, keeping the map's existing order style). Draft — refine wording in the author's voice, keep ≤2 sentences each, no pedagogy framing:
  ```js
  "declarative-generative-ui":
    "An interface proposed as data — which component, what it shows, what sits inside it — rather than written as code. A renderer checks every proposal against the list of components it is allowed to use, so an AI agent can compose a screen but cannot invent an element.",
  "steering-layer":
    "Design intent encoded where work actually happens — the token contract, the component rules, the checks — so that anyone contributing, person or AI agent, stays on brand without asking. The intent steers; it does not review after the fact.",
  "management-flight-simulator":
    "A model you operate instead of read: make a decision, run it, watch the consequences land, try again. The builders and replays on this site follow that pattern as honest illustrations — they demonstrate the method on fictional products, they do not simulate a real business.",
  ```
- **PATTERN**: `system/glossary.mjs:36–57` (existing entries' shape and voice)
- **GOTCHA**: The key strings must exactly match the `data-term` values used in Tasks 2/4 — a mismatch aborts the mount on that page and VR fails red (that's the loud gate working, but catch it locally, not in Docker). The `management-flight-simulator` definition must carry the illustrative caveat — the ticket labels this term *illustrative* and the definition is one of the two places that promise lands.
- **VALIDATE**: `node -e "import('./system/glossary.mjs').then(() => console.log('node-import safe ✓'))"` (module-scope must stay DOM-free)
- **SATISFIES**: AC #3 (terms exist for both mounts), ticket T2

### Task 2 — UPDATE `approach.html` (T1 cluster + span rule + steering-layer naming)

- **IMPLEMENT** (three edits):
  1. **The fifth cluster** — append inside the sources `grid grid-2` (after the "Design systems & tokens" div, line ~212):
     ```html
     <div class="sources-wide">
       <h3 class="caption">Strategy &amp; systems</h3>
       <p class="muted">Jared Spool and Center Centre on outcomes over outputs, Leslie Jensen-Inman's
       "Yes, And", Luke Wroblewski on AI product UX, Donella Meadows' Thinking in Systems, Daniel Kim's
       systems-thinking tools, John Morecroft on strategic modelling, Gothelf &amp; Seiden's Lean UX,
       Hartson &amp; Pyla's The UX Book.</p>
     </div>
     ```
  2. **The layout call** — one rule in the existing inline `<style>` block (lines 19–26), with a comment naming the decision:
     ```css
     /* Five clusters in the two-column sources grid: the fifth spans the full row rather than
        sitting as an orphan beside an empty cell. It is also the longest list, so it gets the
        widest measure. (Layout call recorded in this PR — st-ux-fusion T1.) */
     #sources .sources-wide { grid-column: 1 / -1; }
     ```
     Note the existing block's comment says "No at-rest visual effect, so the VR baselines don't churn" — that sentence is now false for the block as a whole; adjust that comment to scope its claim to the scroll rules (surgical: reword, don't delete).
  3. **The steering-layer naming** — one sentence appended to "The one rule" decision card (after "Those roles are semantic tokens." at line ~136):
     ```html
     The industry name for a rule like this is a
     <dfn class="term" data-term="steering-layer" tabindex="0">steering layer</dfn>: design
     intent encoded where no one — person or AI agent — can drift from it.
     ```
- **PATTERN**: cluster shape approach.html:197–200; dfn idiom approach.html:136; inline-style precedent approach.html:19–26
- **GOTCHA**: `grid-column: 1 / -1` is a no-op at the mobile breakpoint where `.grid-2` collapses to `1fr` (components.css:596) — no mobile special-case needed. Don't put the rule in components.css (system-graph coupling) — the inline block or portfolio.css only; inline chosen to keep loc-summary's runtime group untouched by CSS.
- **VALIDATE**: serve + open `/approach.html`, confirm the cluster renders full-width and `#asrc` still reaches `data-asrc="ready"` (proves the glossary mount didn't abort). Command in Level 4 below.
- **SATISFIES**: AC #1 (cluster + layout call), AC #3 (approach mount exercises a new term), T1's attribution rules (Jensen-Inman credited by name)

### Task 3 — UPDATE `approach.html` (T2's method-card reframing)

- **IMPLEMENT**: The four method cards (lines 62–109) each state the outcome the habit buys. Draft copy — the implementer refines in-voice; the structural requirement is one explicit outcome statement per card:
  - **Shape it** — append: `The outcome: bad bets die on paper, where they cost a conversation instead of a build cycle.`
  - **Design for behaviour** — after "…easier before trying to make it more motivating." insert: `The outcome is a feature people return to, not one that just shipped.` (The ethics sentence stays last, untouched — it's the card's spine.)
  - **Prove it** — reframe the opening to land the register's signature move: `Shipping is an output. The outcome is what changed for the person using it — so before building, I write down what would show it worked: an early signal like activation, and the slower outcome behind it like retention. After it ships, I go back and check. Most work never gets that second look. I make it a step.` (The two existing `<dfn>` marks survive verbatim inside the reworded sentence.)
  - **Ship it as a system** — fold the outcome into the close: `The outcome: change stays cheap. A rebrand is one file, and this site is built that way (see the case study).`
- **PATTERN**: the cards' existing voice (short declaratives, first person); Center Centre's four shifts (research §1, article 5) for the register — outcomes over outputs, experiences over products
- **GOTCHA**: Do NOT reword the two sentences carrying `data-term` marks except as drafted (the marks must survive with `class="term" data-term tabindex="0"` intact). Do not touch the `#loc-proof`/`#param-proof` JS-rendered sentences — the measured numbers are generated, and the copy pass rewords around them, never retypes them.
- **VALIDATE**: `grep -c 'data-term=' approach.html` → **9** (8 existing — counted 2026-08-07 — + 1 new from Task 2; Task 3 adds none)
- **SATISFIES**: AC #2 (method habits state outcomes), AC #4 (generated claims untouched)

### Task 4 — UPDATE `factory.html` (T2 namings + close reframing)

- **IMPLEMENT** (three edits):
  1. **The MFS naming** — in the studio lead (lines 199–211), after "…narration and refused calls included." insert one sentence:
     ```html
     The pattern has an industry name — a <dfn class="term" data-term="management-flight-simulator"
     tabindex="0">management flight simulator</dfn>, here an illustrative one: you watch decisions
     run and consequences land, then take the controls yourself.
     ```
  2. **The DGUI naming** — same paragraph, after "…in the slot you left it in." insert:
     ```html
     What the compile step runs is <dfn class="term" data-term="declarative-generative-ui"
     tabindex="0">declarative generative UI</dfn>: each screen proposed as data and validated
     against the components it is allowed to use before anything renders.
     ```
  3. **The close reframing** — the factory "close card" resolves to `#keep`'s beat-lead (lines 357–362; see Open Questions). Append one outcome sentence, e.g.: `That is the outcome the method points at: an engineer opens this pack and starts building, with nothing left to ask me in a meeting.`
- **PATTERN**: factory.html:99's existing dfn idiom; the lead's existing sentence rhythm
- **GOTCHA**: The word "illustrative" must appear in the MFS naming sentence (ticket: labeled *illustrative*) — it's a capability-honesty statement, same class as "replay-not-live". Both insertions go into an already-long paragraph — read the result aloud; if it overloads, the namings may become their own short `<p class="beat-lead max-prose">` directly after the lead (still "beside the exhibit"). Don't touch the `<strong>The moment you touch the canvas it is yours</strong>` sentence or anything the replay chrome renders (that text comes from the committed trace, not this page).
- **VALIDATE**: `grep -c 'data-term=' factory.html` → **7** (5 existing — counted 2026-08-07 — + 2 new). Then serve + open `/factory.html`, wait for `[data-studio="ready"]` AND `[data-replay="settled"]` (proves the glossary mount validated the two new keys), hover/focus both new dfn marks → bubble opens. Command in Level 4.
- **SATISFIES**: AC #2 (factory close), AC #3 (factory mount exercises two new terms), T2's illustrative label

### Task 5 — UPDATE `index.html` (home close card)

- **IMPLEMENT**: Outcome-frame the close card's copy (lines 308–338). Draft:
  - Line 309 `.close-card-line`: `This is what I'd do for your team in week one — and the outcome you'd hold at the end of it: a system your engineers build on, not a deck about one.`
  - The handoff-pack takeaway (314–317) and the /build takeaway (328–334): light touch — each already names an artifact; add/adjust so each states what the artifact buys (e.g. the pack: "…everything an engineer needs to build Verdant **without a kickoff meeting**: component specs, data contracts, tokens, and the agent vocabulary."). Keep edits minimal; #216 will compress this page later using this copy as source text.
- **PATTERN**: the card's existing plain-spoken close voice
- **GOTCHA**: **Home has no glossary mount** — `initGlossary` never runs on index.html, so a `data-term` mark there would be styled, focusable, and dead. NO `<dfn class="term">` marks on this page; industry terms, if mentioned at all, are plain text. Also: `close.mjs` appends into `[data-close-extras]` — don't move or rename that mount node.
- **VALIDATE**: `grep -c 'data-term=' index.html` → 0
- **SATISFIES**: AC #2 (home close card)

### Task 6 — CROSS-CHECK term keys (mechanical gate before any browser opens)

- **IMPLEMENT**: Both directions. Every `data-term` on the two glossary-mounted pages must exist in `TERMS` (a miss aborts a mount), AND each of the three new keys must be marked on at least one page (catches "added the definition, forgot the naming"):
  ```bash
  # marks → TERMS
  for t in $(grep -oh 'data-term="[^"]*"' approach.html factory.html | sed 's/data-term="\(.*\)"/\1/' | sort -u); do
    grep -q "\"$t\":" system/glossary.mjs && echo "ok  $t" || echo "MISSING FROM TERMS: $t";
  done
  # new TERMS → marks
  for t in declarative-generative-ui steering-layer management-flight-simulator; do
    grep -q "data-term=\"$t\"" approach.html factory.html && echo "marked  $t" || echo "NO MARK: $t";
  done
  ```
- **VALIDATE**: zero `MISSING`/`NO MARK` lines; expected placement: `steering-layer` in approach.html, the other two in factory.html
- **SATISFIES**: AC #3

### Task 7 — DRIFT-CHECK generated artifacts

- **IMPLEMENT**: Stage the edits FIRST (gen-loc reads git-tracked content — running it against unstaged edits is a false "no drift"), then regenerate:
  ```bash
  git add approach.html index.html factory.html system/glossary.mjs
  node agent-layer/gen-loc-summary.mjs
  git status --short system/loc-summary.json   # if modified → commit it in this PR
  node agent-layer/gen-param-count.mjs && git diff --stat system/param-count.json  # MUST be empty
  ```
- **GOTCHA**: **The runtime rounding cannot flip from this PR — measured, not guessed.** The runtime group counts exactly 25,757 lines by the generator's own method (`git show :<path>`, `split("\n").length` — verified against `gen-loc-summary.mjs:44–46` on 2026-08-07), which rounds to the committed 25,800 with **93 lines of headroom** before flipping up to 25,900 and 7 before flipping down. This PR only ADDS runtime lines (~9–12 in glossary.mjs; the span rule lives in approach's inline style, deliberately outside the runtime group), so the number approach.html renders is stable and there is no ordering hazard with the baselines. Run the check anyway — it's cheap, and the generator reads the **index**, which is why staging comes first (an unstaged edit is invisible to it; #56's recorded trap). A pages-group or grand-total flip fails CI `verify` but does not churn approach's baselines (approach renders the runtime group only). `param-count.json` changing at all means a counting-rule misread — stop and re-read the manifest's `$description`.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` → "no drift" after any regen is staged
- **SATISFIES**: AC #4, AC #5 (zero manifest entries)

### Task 8 — RUN the pure gates + live render

- **IMPLEMENT**:
  ```bash
  node tooling/build-checks.mjs          # all 18 groups green (glossary.mjs is imported by studio.mjs — Node-import safety matters here)
  node tooling/visual-regression/serve.mjs &   # then the Level-4 browser checks below
  ```
- **GOTCHA**: On factory, `ERR_CONNECTION_REFUSED` console noise against the absent Worker is expected fixture degradation, not a regression. Only home renders truly 0-error.
- **VALIDATE**: Level 4 script below exits 0 on all three pages
- **SATISFIES**: AC #3, AC #6 precondition

### Task 9 — COMMIT copy, then REGENERATE the 6 VR baselines

- **IMPLEMENT**: Commit the copy edits on the branch (one atomic commit, message per convention, e.g. `feat(244): the strategy layer's copy — sources cluster, outcome reframing, three glossary terms (st-ux-fusion T1+T2)`). Then, from a **clean detached worktree under /Users** (Docker file-sharing excludes /private/tmp; the VR gate screenshots the working tree, so it must be the committed state):
  ```bash
  git worktree add --detach /Users/Berzins/Desktop/Linards_current/wt-vr-244 feat/244-st-ux-wave-1
  cd /Users/Berzins/Desktop/Linards_current/wt-vr-244/tooling/visual-regression && npm ci
  rm baselines/approach-neutral.png baselines/approach-saulera.png \
     baselines/index-neutral.png    baselines/index-saulera.png \
     baselines/factory-neutral.png  baselines/factory-saulera.png
  npm run update:docker
  ```
  Copy the six regenerated PNGs back into the session worktree, then verify **exactly six** baselines changed before staging:
  ```bash
  git status --short tooling/visual-regression/baselines/        # exactly 6 modified lines, the expected 6 names
  ```
  Stage by explicit path, commit (`chore(244): regenerate the six touched VR baselines`). Remove the temp worktree (`git worktree remove /Users/Berzins/Desktop/Linards_current/wt-vr-244`).
- **GOTCHA** (four recorded traps): (1) `update:docker` skips baselines whose only change is sub-perceptual — the `rm` forces all six to be freshly written; (2) the pixelmatch tolerance swallows a few changed digits — a green run is NOT proof a page didn't change, which is why the rm-then-rewrite flow is used; (3) **eyeball all six PNGs** — confirm the fifth cluster is in the approach shots full-width, the new factory sentences render, and nothing truncated (the capture re-measures after waitVisible, but look anyway); (4) approach's countUp rAF can flake the "two consecutive stable screenshots" step — a fail there that names a different pack each run is the recorded flake, retry before diagnosing.
- **VALIDATE**: `cd tooling/visual-regression && npm test` (or the repo's gate invocation) green locally against the new baselines — noting local macOS vs Linux-baseline platform diffs mean the real confirmation is CI (`gh pr checks`)
- **SATISFIES**: AC #6 (baselines regenerated in the same PR)

### Task 10 — CREATE the PR

- **IMPLEMENT**: Push and open the PR. The body MUST carry:
  - `Closes #244` (a trailer — a title mention closes nothing)
  - **The layout call, recorded** (AC #1): "Fifth cluster spans both columns as the final row (`grid-column: 1 / -1`, page-scoped rule in approach's inline style block). Rationale: an orphan cell beside an empty sibling reads as an accident; the longest cluster gets the widest measure; the rule is a mobile no-op."
  - Validation status (build-checks, drift checks, VR regen, the term cross-check)
  - The plan/report/review artifacts committed in the same PR (`.claude/plans/st-ux-wave1-strategy-copy-244.md`, `.claude/reports/…`, `.claude/code-reviews/…`)
- **VALIDATE**: `gh pr view --json body | grep "Closes #244"`; `gh pr checks` — verify job (drift checks) and visual job both green
- **SATISFIES**: AC #1 (recorded call), repo git conventions

### Task 11 — POST-MERGE: the inheritance note on #216

- **IMPLEMENT**: When (and only when) the PR merges, comment on #216:
  ```bash
  gh issue comment 216 --body "Wave 1 of the ST/UX epic (#244) has merged: approach's method section, home's close card and factory's studio/keep copy are now outcome-framed, and three industry terms (declarative-generative-ui, steering-layer, management-flight-simulator) live in the glossary. **#216's trim inherits this copy as its source text** — compress the reframed register, don't resurrect the old one. (Epic #243 coordination contract.)"
  ```
- **GOTCHA**: The owner merges fast — verify the merge actually landed (`gh pr view --json state,mergeCommit`) before posting; don't post on an open PR's assumption.
- **VALIDATE**: comment visible on #216
- **SATISFIES**: the ticket's coordination requirement ("When this merges, post a note on #216")

---

## TESTING STRATEGY

No test suite exists and none is invented (repo rule). "Done" = run the surfaces touched:

### Unit-equivalent (pure gates)

- `node tooling/build-checks.mjs` — all 18 groups. Nothing here changes tested logic, but glossary.mjs sits on studio.mjs's import path and build-checks proves Node-import safety.
- The Task-6 term cross-check — the mechanical version of the glossary AC.

### Integration (live render)

The Level-4 browser script: all three pages reach their VR ready handles with the new copy in place. The ready handles ARE the integration test — approach's `data-asrc="ready"` and factory's `data-studio="ready"` both sit downstream of `initGlossary` validating every mark on the page.

### Edge Cases

- A typo'd `data-term` key → the loud gate: mount aborts, ready handle never fires, Level-4 script times out (and VR would fail red). Task 6 catches it pre-browser.
- Mobile viewport: the span rule collapses harmlessly (grid-2 → 1fr).
- Reduced motion / no-JS: all edits are static markup — no new JS, no new animation, nothing gated on `matchMedia`. The VR gate's no-preference capture posture is unaffected.
- Keyboard: each new `<dfn>` carries `tabindex="0"` → focusable, bubble opens on focus, Esc dismisses (existing 1.4.13 machinery, no new code).

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
node -e "import('./system/glossary.mjs').then(() => console.log('glossary node-import ✓'))"
node --check system/glossary.mjs
```

### Level 2: Pure gates

```bash
node tooling/build-checks.mjs
node agent-layer/gen-loc-summary.mjs --check     # after Task 7's staging+regen
node agent-layer/gen-param-count.mjs && git diff --exit-code system/param-count.json
```

### Level 3: Term-key cross-check

```bash
for t in $(grep -oh 'data-term="[^"]*"' approach.html factory.html | sed 's/data-term="\(.*\)"/\1/' | sort -u); do
  grep -q "\"$t\":" system/glossary.mjs || { echo "MISSING $t"; exit 1; }
done; echo "all term keys resolve ✓"
grep -c 'data-term=' index.html | grep -qx 0 && echo "home carries no dead marks ✓"
```

### Level 4: Manual/live validation

Run from the **repo root** (the `createRequire` path below depends on it). The serve default port is **4757** (`serve.mjs:11`, env-overridable); the installed browser package there is **`@playwright/test`** (verified in `tooling/visual-regression/package.json`).

```bash
node tooling/visual-regression/serve.mjs &
node - <<'EOF'
// Playwright resolved out of tooling/visual-regression/node_modules (repo pattern — never a root dep)
const { createRequire } = require('module');
const req = createRequire(process.cwd() + '/tooling/visual-regression/package.json');
const { chromium } = req('@playwright/test');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://127.0.0.1:4757/approach.html');
  await page.waitForSelector('#asrc[data-asrc="ready"]', { timeout: 30000 });
  await page.goto('http://127.0.0.1:4757/factory.html');
  await page.waitForSelector('[data-studio="ready"]', { timeout: 30000 });
  await page.waitForSelector('[data-replay="settled"]', { timeout: 90000 });
  await page.goto('http://127.0.0.1:4757/index.html');
  await page.waitForSelector('#beat-hero[data-spine="ready"]', { timeout: 30000 });
  if (errors.length) { console.error('PAGE ERRORS:', errors); process.exit(1); }
  console.log('all three pages reach their ready handles with the new copy ✓');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
EOF
```
Then by hand in a real browser: hover AND keyboard-focus each of the three new dfn marks; confirm the bubble text, Esc dismissal, and that the fifth cluster reads as a deliberate full-width row at desktop width. (Cross-engine eyeball per the VR single-engine blindspot memory: the gate's Chromium missed a real Safari grid blowout once — one Safari look at approach's spanning row costs a minute.)

### Level 5: The visual gate

Task 9's Docker regen + `gh pr checks` after push (local Linux-baseline diffs on macOS are platform noise; CI is the truth).

---

## ACCEPTANCE CRITERIA

(From the ticket, restated as checks)

- [ ] **AC1** — The fifth cluster renders in the sources grid; the layout call (spanning final row) is recorded in the PR body.
- [ ] **AC2** — Each method habit on approach + the home and factory close cards states the outcome it buys, in the outcomes-over-outputs register.
- [ ] **AC3** — The three glossary terms resolve on both mounts: all three exist in the shared `TERMS` map (so both mounts resolve any of them by construction), approach's mount validates its new mark, factory's validates its two, and the loud gate (unknown key → abort → VR red) stands untouched.
- [ ] **AC4** — `loc-summary.json` / `param-count.json` claims stay generated; copy rewords around them.
- [ ] **AC5** — Zero `param-manifest.json` entries; zero new tracked source files.
- [ ] **AC6** — All six touched baselines (approach/index/factory × neutral/saulera) regenerated in the same PR via `update:docker` from a clean detached worktree.
- [ ] Attribution rules hold: Jensen-Inman credited for "Yes, And"; no five-pillar speaker named anywhere; Wroblewski credited for his own material.
- [ ] "Management flight simulator" carries the word *illustrative* in both its landings (naming sentence + glossary definition).
- [ ] The method spine's mechanics untouched; no analytics.mjs edit; no new module.

## COMPLETION CHECKLIST

- [ ] Tasks 0–10 executed in order, each validation passing at the time
- [ ] build-checks 18/18 green; both drift checks clean; term cross-check clean
- [ ] Level-4 script green on all three pages; bubbles verified by hand (hover + focus + Esc)
- [ ] Six PNGs regenerated, eyeballed, committed; `gh pr checks` fully green
- [ ] PR body: `Closes #244` + the recorded layout call; plan/report/review artifacts committed in the PR
- [ ] Post-merge: the #216 inheritance note posted (Task 11)

---

## OPEN QUESTIONS / ASSUMPTIONS

**Decided during planning** (recorded here so the implementer executes rather than re-litigates; each is reversible at review for the cost of a sentence):

1. **"Resolve on both mounts" (AC3) = the shared-map reading.** The ticket's own parenthetical settles it: "(the existing loud gate covers this: an unknown `data-term` key aborts the glossary mount and VR fails red)" — the AC is about *resolution wherever marked*, which the shared `TERMS` map guarantees by construction on both mounts. Marks land where the exhibits are: steering-layer on approach (the token-contract story), DGUI + MFS on factory (the compile step, the replay) — so each mount also *exercises* at least one new key, which is what makes the loud gate a real test of this PR rather than a vacuous one. Forcing all three marks onto both pages would hang DGUI/MFS on exhibits approach doesn't have — contrived prose, rejected.
2. **Factory's "close card" = `#keep`'s beat-lead.** The epic was written 2026-08-07, against the post-#206 factory (already the studio), and that page's only close-card analog is the "Leave with it" keep beat — the final CTA section (lines 438–445) is two buttons with zero prose. Mapping the reframing anywhere else would mean *inventing* a close card, which is a structural change on a copy-only ticket.
3. **Layout call: fifth cluster last, spanning both columns.** The orphan alternative is cheaper by three lines but reads as an accident, and the longest cluster (8 names) wants the widest measure. The rule is a mobile no-op (grid-2 collapses to `1fr` at the breakpoint). Recorded in the PR body per the architecture doc's "decided in T1's PR".

**Remaining assumption:**

4. **The drafted copy is the approved default, not a sketch.** Apply the plan's sentences as written; the permitted authorial pass is *tightening* (fewer words, same claims) — never loosening a constraint term (*illustrative*, the Jensen-Inman credit, an outcome statement per habit, generated numbers untouched). Any edit that would drop or move a constraint term goes back through the ticket's AC list first. This bounds the one genuinely subjective part of the ticket to a mechanical check.

## NOTES (open canvas)

- **Why no analytics tracker here**: the architecture doc's tracker decision belongs to T3's ladder (fires on first rung toggle). Wave 1 has no new interaction to instrument — adding a tracker to a copy pass would itself be the guardrail firing.
- **Why the span rule lives in approach.html's `<style>`, not portfolio.css**: both are legitimate; the inline block wins because (a) the rule is page-scoped to a section only this page has, (b) portfolio.css edits sit in loc-summary's runtime group and would add noise to the drift check this PR already has to run for glossary.mjs, (c) the existing block already carries this page's one-off rules with explanatory comments — the precedent is exact.
- **Why home gets no dfn marks**: initGlossary runs on approach (inline module, approach.html:241) and factory (studio.mjs:617) only. A mark on home would be styled + focusable + dead — worse than no mark. If home ever wants glossary terms, that's a mount decision for a future ticket (superset-ready TERMS costs nothing meanwhile).
- **Sequencing note**: #216 is open with no active PR (checked 2026-08-07). If that changes mid-implementation, stop — this ticket's one hard external constraint is never running concurrent with #216 or with anything regenerating the same six baselines.
- **The copy sources, for the implementer's authorial pass**: research §1's table (Meadows: intervene high; Gothelf/Seiden: "a shipped feature is waste until its effect is measured"; Spool's four shifts) and §2's pattern table (what each naming truthfully points at in this repo: DGUI → agentic-renderer + vocabulary.json; steering layer → the token contract + CLAUDE.md + the design skills; MFS → /build's acts, the replay, the studio). Every naming sentence must stay TRUE of the thing beside it — these are capability claims, and the honesty contract applies.

### Measured facts this plan rests on (verified 2026-08-07, so the implementer doesn't re-derive them)

| Fact | Value | Where it matters |
|---|---|---|
| loc-summary runtime group, exact | 25,757 lines (generator's own method, `git show :<path>` + `split("\n").length`) → rounds to the committed 25,800 | Task 7 — 93 lines of upward headroom; adds-only PR cannot flip the number approach renders |
| `data-term` marks today | approach 8 · factory 5 · index 0 | Tasks 3/4/5 validation counts (9 · 7 · 0 after) |
| VR serve port | 4757 (`serve.mjs:11`, `PORT` env-overridable) | Level 4 script |
| Playwright package in tooling/visual-regression | `@playwright/test` 1.61.1 | Level 4 script's `createRequire` |
| factory glossary mount | `studio.mjs:617`, outside try/finally — abort precedes `data-studio="ready"` | AC3's loud gate, Level 4 wait |
| Epic docs on origin/main | f988228; local untracked copies byte-identical | Task 0's `rm` is safe |
| #216 state | open issue, **no open PR** (`gh pr list` empty) | The serialization window is clear; re-check at Task 0 |
| `.grid-2` mobile collapse | components.css:596 → `1fr` | The span rule is a mobile no-op |
| param-manifest exclusions | "glossary hover/focus bubbles (passive reading aids)", `<a>` navigation | AC5 — zero entries owed, verbatim from `$description` |

### Confidence: 9.5/10 for one-pass success

What moved it from 9: the three risks are now closed with evidence rather than mitigations. (1) VR mechanics — every recorded trap has a specific counter-step *and* a post-condition check (exactly-6-modified-baselines, eyeball list, the countUp-flake triage rule); (2) the loud-gate failure mode is caught twice before Docker (bidirectional Task 6 grep, Level 4 handles) and the validation counts are measured, not estimated; (3) copy variance is bounded — the drafts are the approved default and the authorial licence is tighten-only, with the constraint terms enumerated. The loc-summary rounding question is arithmetic now, not a risk. The remaining 0.5: Docker/CI environment flakiness outside the plan's control, and the small chance the owner overrides a decided call at review (each reversible for the cost of a sentence).

## AMENDMENTS

<!-- Append-only after first approval/execution. -->
