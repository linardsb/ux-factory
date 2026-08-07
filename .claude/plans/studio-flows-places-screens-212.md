# Feature: Studio flows — places become screens, connections become navigation (#212)

The following plan should be complete, but validate documentation and codebase patterns and task
sanity before you start implementing. Pay special attention to naming of existing utils and
exports — import from the right files.

## Feature Description

The second half of PRD §2's compile language, made structural on the one board. Today the compile
beat (#207) swaps /factory's fat-marker blocks for the components of ONE pattern, and the exporter
(#210) emits one screen. After this ticket:

- Each **place** on the board resolves to a **screen** by committed, commented rules extending
  `system/pattern-rules.mjs` — the same discipline the five patterns already obey (named by rules,
  slots counted, nothing invented).
- **Connections become navigation**: the board's only record of what-leads-where becomes real,
  announced, keyboard-operable navigation between the compiled screens on the canvas — and fragment
  navigation inside the exported single file.
- The compile beat compiles to a **2–4-screen flow** (the committed replay board has 4 places and
  7 connections — a genuine dispatch flow with return paths), and the exporter emits the whole
  flow, working cold from `file://` with no network and still **no script**.
- This resolves the epic PRD's open question *"how the five patterns map to flow screen types"* —
  inside the one-board model, with no second truth.

## User Story

As a hiring manager evaluating this portfolio,
I want to watch the recorded run's board compile into a connected multi-screen product I can click
through end to end (and leave with, as one runnable file),
so that "brief in, product out, by a real method" is something I experienced rather than read.

## Problem Statement

The compile beat's altitude shift stops at one screen: the board's places flatten into a single
pattern's components, the connections the run drew are displayed but never *do* anything, and the
export is a static arrangement. The board's richest fact — what leads where — is inert.

## Solution Statement

Extend the committed-rules pipeline, never fork it: `pattern-rules.mjs` gains a pure, import-free
`screensFor(board, answers)` that types every place by rule and derives per-screen slots and
navigation by counting; `studio-compile.mjs`'s swap becomes per-screen (1:1 with wrappers **by
construction**, which closes inherited finding L3 by deleting the branches it was about);
a new `system/studio-flow.mjs` renders a screen (heading + composed components + nav chrome) and
wires canvas navigation (scroll + focus + one announced sentence per navigation);
`studio-export.mjs` emits one `<section>` per screen with fragment-only anchor navigation and a
CSS-only one-screen-at-a-time presentation (`:target` + `:has()`, graceful stacked fallback) — the
export's **no-script claim survives**, stronger than the sanctioned seam required.

## Out of Scope / Non-Goals

- **Not changing `/build`**: `pattern-render.mjs`, `patternFor`, `slotsFor`, `compose`, the codec
  (`build-share.mjs`), and `/build`'s keep rail all stay byte-identical in behavior. The form
  fallback keeps rendering the single pattern — that page has no canvas and no flow claim.
- **Not changing the share codec**: #208's `g` field is where the canvas arrangement persists
  (epic PRD §3 assigns arrangement-persistence to the share link, not the export). No `v:3`.
- **Not changing the replay driver or the committed replay artifact**: the run plays exactly as
  recorded; compile stays visitor-triggered; the at-rest settled canvas stays fat-marker blocks.
- **Not adding analytics**: the win-metric virtual routes were #210's; navigation is not a route.
- **Not touching `specMarkdown`** (pattern-spec.md still describes the single pattern — it is
  /build-shared; a flow-aware spec is a follow-up if ever wanted).
- **No new bus verbs**: canvas navigation is plain buttons (pointer and keyboard converge natively
  on `click`); there is no agent path to navigation and no parity claim to construct, so a
  `ui.navigate` verb would be a bus verb with one emitter and one consumer invented for symmetry.
  Recorded in `studio-flow.mjs`'s header; revisit only when a replay records navigation.
- **No new screen-count cap**: screens = places, bounded by `MAX_PLACES` (6). "2–4 screens" is the
  shipped experience (the committed board has 4), not a rule that would truncate places.

## Feature Metadata

**Feature Type**: Enhancement (extends #207's compile beat + #210's exporter)
**Estimated Complexity**: High (~900–1200 lines across 8 files, per the ticket's estimate)
**Confidence**: 9.5/10 — every seam was pre-annotated "#212's" by #207/#210; the at-rest board is
already a genuine 4-screen flow; the three planning-review calls below are **decided** (rule
sentences, replacement copy, and the L3 edit targets are drafted in this plan, not left to
implementation); and the one residual risk — journey timing around the replay — is choreographed
step-by-step in the studio-journey task.
**Primary Systems Affected**: `system/pattern-rules.mjs`, `system/studio-flow.mjs` (new),
`system/studio-compile.mjs`, `system/studio-export.mjs`, `system/studio-keep.mjs`,
`system/studio.css`, `factory.html`, `tooling/build-checks.mjs`, `tooling/studio-journey.mjs`
**Dependencies**: none new (vanilla, zero-dep — hard constraint)

## Related Work

**Implements**: https://github.com/linardsb/ux-factory/issues/212 (`Closes #212` in the PR body)
**Epic**: #202 — `docs/epics/prototype-studio.prd.md` + `docs/epics/prototype-studio.architecture.md`
(§Recommended approach "one board stays the single source of truth… a 2–4-screen flow is a
*projection* of it"; §Data model → "Screen typing")

**Back-references** (plans this builds on / inherits decisions from):

- `.claude/plans/studio-compile-beat-207.md` — the beat's four load-bearing calls (import-never-fork,
  crossfade-not-VT, swap-touches-content-never-slots, determinism) are inherited whole.
- `.claude/plans/studio-single-file-export-keep-rail-210.md` — the export's serialization discipline
  (renderComposition's own output, `XMLSerializer`, vetTokens as the one application point) inherited.
- Inherited review finding: PR #235's L3 (posted on issue #212) — the EXTRA branch's id instability
  and missing occupancy scan. **Closed structurally by this plan** (see Phase 2).

**Forward-references**: #222 (instances re-shell onto the studio) consumes the flow; (none else yet).

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `system/pattern-rules.mjs` (whole file, 303 lines) — Why: the file this ticket extends. The
  discipline to mirror: DEFINITIONS-ONLY rules (:10-14), import-free purity (:16-17), `PATTERNS`
  (:29-65), `SLOT_MAX` + the feed-truncation argument (:66-79), `HUB_MIN_AFFORDANCES` (:100-103),
  `isHub` (:126-135), `patternFor`'s reason-is-the-rule contract (:137-175), `slotsFor`'s
  counted-never-invented derivations (:177-295), `affordanceCount` (:297-303).
- `system/breadboard.mjs` (:1-47, :96-153) — Why: the board model. **A connection is
  `[affordanceId, placeId]`** — its source is an affordance (:12-21, load-bearing); caps
  `MAX_PLACES`/`MAX_AFFORDANCES` = 6 (:38-39); `draftBoard`'s rules 5–6 (:96-106): entry
  affordances carry the connections, non-entry affordances act in place; `isBoard` (:151).
- `system/studio-compile.mjs` (whole file, 648 lines) — Why: the module this ticket most changes.
  `compileSteps` (:90-137), the swap + the `#212` branches to DELETE (:362-458 — note :38-49's
  header paragraph naming both branches as this ticket's), `revert` (:549-584), `composed()`
  (:606-613), the liveness rule (:489-493), the `finally` handle (:643-647).
- `system/studio-export.mjs` (whole file, 278 lines) — Why: the exporter. Call 5 (:50-52) names
  this ticket's seam ("the seam is one array; the nav script is that ticket's"); call 6 (:54) dies.
  `stripImports` (:100-121) unchanged; `placementRules` (:127-135) and the caps import (:65) are
  RETIRED by this plan; the provenance block (:246-277) is rewritten for the flow.
- `system/studio-keep.mjs` (:305-405) — Why: the export click handler this ticket rewires
  (per-screen serialization). Also `arrangement()` (:295-303) — stays, it feeds the SHARE link only.
- `system/studio.mjs` (:420-434, :459-534) — Why: how the beat and rail are mounted and fed
  (`getBoard`, `publishBoard`, `arrangementNow`). This file should need **zero changes** — verify,
  don't edit.
- `system/studio-canvas.mjs` (:38-39, :50-57, :296-334) — Why: `MAX_COLS`/`MAX_ROWS`, `clampSlot`,
  `place()` and the wrapper contract (`data-stx-id`, `.stx-grab` first child, `say()`).
- `system/pattern-render.mjs` (:41-97) — Why: `compose` (the ONE place a pattern id becomes
  components — reuse per screen), `streamNote`, `OUT_OF_LIBRARY`, `REFUSED`, `INSPECT_IDS`.
- `system/agentic-renderer.mjs` (:319-356) — Why: metric-tile / list-row / sequence-step are
  **non-interactive divs** (no bus) — navigation must be chrome, not composed components.
- `replay/build-fieldwork-dispatch.board.json` — Why: the at-rest board (4 places, 7 affordances,
  7 connections, return paths included). This IS the shipped flow and the new check group's
  real-file fixture.
- `tooling/build-checks.mjs` (:78-99 imports, :123-131 `ok`/`group`, :135-180 shared fixtures
  `HUB_BOARD`/`BOARD_FOR`/`FULL_BOARD`/`BARE_BOARD`, :2640-2803 group 15, :3003-3202 group 17) —
  Why: group 15 must be UPDATED, group 17 partially REWRITTEN, group 19 ADDED in their image.
- `tooling/studio-journey.mjs` (:1950 `compilePass`; :1768-1822 the take-over-then-compile pass) —
  Why: both assert the compiled DOM's current single-component shape and must be updated; the new
  flow pass lives beside `compilePass`.
- `factory.html` (:207-218) — Why: the at-rest sentence **"What compiles is one screen's
  components, not a flow between screens."** becomes false and must be rewritten (this is the
  known at-rest change that churns factory's two baselines).
- `system/param-manifest.json` (:78-93) — Why: the /factory entry precedent (one entry per control
  class, `note: "conditional — …"`).
- `system/studio.css` (:203-205 reduced-motion block, :365-410 `.stu-compile*`) — Why: where the
  canvas-side flow chrome styles land.

### New Files to Create

- `system/studio-flow.mjs` — screen DOM builder + canvas navigation wiring (hand-written canon,
  Node-import-safe, no self-boot; mounted only via `studio-compile.mjs`). ~350 lines with headers.
- `.claude/reports/studio-flows-places-screens-212.md` — execution report (same-PR rule).

### Relevant Documentation — READ BEFORE IMPLEMENTING

- `docs/epics/prototype-studio.architecture.md` §Recommended approach (:27-47) and §Data model
  (:86-100) — Why: "component order within a screen *is* the board's affordance order — no new
  bytes" and "screen typing is a committed-rules extension of pattern-rules.mjs" are decided there;
  inherit, don't re-decide.
- Issue #212 (`gh issue view 212`) — the ACs; its one comment carries the inherited L3 finding.
- `.claude/code-reviews/pr-235-review.md` (if present) — L3's original wording.

### Patterns to Follow

**Committed-rule voice** (pattern-rules.mjs:150-175): every rule returns a `reason` sentence that
IS the rule, rendered verbatim. New screen rules do the same, per screen.

**Counted, never invented** (pattern-rules.mjs:177-182): every slot value, count, and nav entry is
read off the board. A truncation is stated with its denominator (`streamNote`/`affordanceCount`).

**Import, never fork** (studio-compile.mjs:15-21): `patternFor`, `slotsFor`, `compose`,
`renderComposition`, `INSPECT_IDS`, the honesty sentences — all imported. The flow contributes
rules only in `pattern-rules.mjs`; no module re-derives another's answer.

**Total by contract** (studio-export.mjs:56-58, compileSteps:87-89): junk in → an honest empty
answer, never a throw. Every new pure function passes the nine junk boards.

**Refusals to the live region / the card, never a throw or console.error** (studio-compile.mjs
:532-539; studio-journey's no-page-errors contract is a real assertion).

**Fixed strings in anything that can settle into the DOM** (studio-compile.mjs:65-67): no
timestamp, counter, or run id; the settled canvas is a pixel baseline; exports are byte-identical.

**`el()` helper copied per module, never shared** (studio.mjs:124-127's note); **zero inline
styles, zero markup-from-string sinks** in studio modules (build-checks group 7 includes them with
no exception argued) — the exporter's string assembly is exempt because it writes to a Blob, never
the live document (studio-export.mjs:14-22).

**The check must be able to fail** (memory + group 17's design): every new check group carries a
mutation case proving its own predicate goes red.

---

## IMPLEMENTATION PLAN

### Phase 1: The committed rules (pure) — `pattern-rules.mjs`

**Independent of:** everything else; start here.

This phase ANSWERS the PRD's open question. The mapping is **DECIDED** (confirmed at planning
review, 2026-08-07 — not a proposal to re-open at implementation). The richer alternative
(onboarding boards typing non-entry places as `sequence-step` screens) was considered and
REJECTED for this ticket: it invents a sequence position for places the board never ordered as
steps, which is a number the page did not count. It remains a rule-table edit inside this
structure if a later ticket wants it.

The mapping:

> **The five patterns ARE the flow's screen types.** Which place gets which type is decided by
> three committed rules:
>
> - **Rule S1 — the entry screen wears the board's own pattern.** `patternFor({answers, board})`,
>   imported verbatim (reason included). Its slots are `slotsFor(patternId, board)` — the existing
>   whole-board read. The entry screen of a flow IS #207's single compiled screen, which is what
>   makes this ticket a strict extension. (Feed's SLOT_MAX truncation and `streamNote` are
>   inherited here — the one real truncation in the flow.)
> - **Rule S2 — a non-entry place shaped like a hub is a `settings` screen.** The hub rule's own
>   condition scoped to one place: ≥ `HUB_MIN_AFFORDANCES` (4) affordances, every one carrying a
>   connection. Same threshold, same argument (:100-103), stated per screen.
> - **Rule S3 — every other non-entry place with ≥1 affordance is a `queue` screen.** A list
>   worked through where the reader is: one row per affordance, `value` = the destination place's
>   label where a connection exists, else `"acts here"` (the queue/settings row shape, scoped to
>   the place; no `meta` — every row is in the same place, the settings derivation's argument :283-285).
> - **Rule S4 — a non-entry place with no affordances is still a screen** (it can be a
>   connection's destination): type `queue`, zero slots, and the screen's honest sentence is
>   "nothing to act on here" (the onboarding `detail` precedent :243-252) — a hole in the board is
>   shown as one, never mocked up.
> - **An empty board names no screens**: `screensFor` returns `null` (AC #4), exactly where
>   `patternFor` names no pattern.
>
> Navigation is counted from `connections` and from nothing else: per screen, one nav entry per
> affordance OF THAT PLACE that carries a connection —
> `{ affordanceId, label, targetId, targetLabel }`. An affordance without a connection navigates
> nowhere. On the fieldwork board this yields the entry dashboard + three queue screens and 7 nav
> links, every screen reachable from the entry (returns included).

**The reason sentences, drafted** (rendered VERBATIM per the file's reason-is-the-rule contract;
implementation may tighten grammar, never the substance — each names its rule and its counted
numbers):

- **S1 (entry)**: carry `patternFor`'s own reason verbatim, prefixed:
  `Rule S1: the entry place wears the board's own pattern. ${patternFor(...).reason}`
- **S2**: `` `Rule S2: this place carries ${n} affordances and every one of them leads to another place — a menu of destinations, which is the hub rule read on one place.` ``
- **S3**: `` `Rule S3: this place carries ${n} affordance${s} and the work happens here — a list worked through where you are, with each row saying where it leads or that it acts in place.` ``
- **S4**: `Rule S4: this place has nothing to act on. The board drew a destination with no work in it, and this screen says so rather than inventing content.`

**Tasks:**

- ADD `screensFor(board, answers)` to `system/pattern-rules.mjs` → `null` | array of
  `{ id, label, type, reason, slots, nav }` (id/label = the place's; `screens[0]` is the entry).
  Keep the file **import-free** and pure; every rule commented in the file's own voice.
- ADD the per-place slot derivation (S3/S2 row shape) and the per-screen `reason` sentences.
- Do NOT touch `PATTERNS`, `patternFor`, `slotsFor`, `compose` call sites — /build must not move.

### Phase 2: The beat compiles to screens — `studio-flow.mjs` (new) + `studio-compile.mjs`

**Depends on:** Phase 1.

- `studio-flow.mjs` exports `renderScreen(screen, { vocab, bus, index, total })` → a
  `.stf-screen` element: a heading carrying the place label (`tabindex="-1"`, the focus target),
  the composed components (`compose(screen.type, screen.slots)` → `renderComposition` — ONE
  validation per screen, the refusal naming which screen), the S4 honest sentence when slots are
  empty, and a nav list of real `<button class="stf-go">` chrome (built element-by-element; group 7
  applies). And `wireFlow(wrappers, screens, { say, reduceMotion })`: click → target wrapper
  `scrollIntoView` (smooth only without reduced motion) + focus the target screen's heading +
  `say(\`${targetLabel}, screen ${k} of ${N}.\`)` — a fixed, counted sentence.
- `compileSteps` gains `screens` (from `screensFor` + `compose` per screen); the top-level
  `slots`/`composition` stay the ENTRY screen's (minimizes churn in group 15 and `composed()`).
  Step `detail` sentences gain screen counts (post-interaction strings only — `AT_REST`'s "Four
  steps…" stays, so the beat row's at-rest chrome does not move).
- `applySwap` becomes per-screen and **closes inherited finding L3 by deletion** (decided at
  planning review, 2026-08-07): screens are 1:1 with wrappers by construction (screens = places;
  the driver placed one wrapper per place; the ?b= path arranges `places.length` wrappers; nothing
  on /factory adds or removes one — verified against studio.mjs: `arrangeBoard` breaks at
  MAX_COLS=12 > MAX_PLACES=6, no canvas verb creates or deletes a wrapper, and the
  sent-arrangement branch requires equal lengths). **The exact edits**:
  - DELETE `studio-compile.mjs` :369-370 (the `added` / `removed` declarations), :431-449 (the
    EXTRA loop and the SURPLUS loop, comments included), and revert's :570-579 (the `added`
    removal line, the indexed re-insertion loop, and the two `length = 0` resets).
  - ADD the counted tripwire at the top of `applySwap`, before anything is stashed — the
    `nodes.length !== composition.length` precedent (:390-398), same shape, drafted message:
    `` `the canvas holds ${wrappers.length} wrappers for ${screens.length} screens — one place is one wrapper is one screen, so the swap cannot align them` ``
    (thrown, caught by compile()'s existing handler, rendered as the refusal card).
  - REWRITE the header's :38-49 paragraph: the branches are gone; the 1:1 correspondence is a
    construction fact stated with its three grounds (driver, verbs, ?b=); the tripwire is named
    as the loud refusal for anything unforeseen.
  - The wrapper's `data-stx-name` (already the place label) is NOT renamed by the swap anymore;
    `data-stx-component` is not set (a screen has no single vocabulary shape) — stash/revert
    simplify accordingly, and the `#232` null-stash comment updates.
  - The PR body carries the close, drafted: *"Inherited finding L3 (PR #235, posted on #212) is
    closed structurally: the EXTRA/SURPLUS branches it described were written for a
    board-differs-from-canvas state that flows remove — screens are 1:1 with wrappers by
    construction — so the branches are deleted and a count mismatch now refuses loudly via the
    swap's tripwire instead of misaligning silently. The fallback (stash ids + occupancy scan)
    was considered and set aside with the reachability argument recorded in the plan."*
- `INSPECT_IDS` application is unchanged (the same three primitives, now inside screens).
- ADD `.stf-*` styles to `system/studio.css` (beside `.stu-compile*`), including the
  reduced-motion additions to the :203-205 block. Canvas chrome only — the export carries its own
  frame CSS (see Phase 3). **`components.css` stays untouched — decided** (planning review,
  2026-08-07): the ticket's files-touched line was an estimate, and putting studio-only chrome in
  the components layer would push it into `system-graph.json` → `inspect-data.json` → factory's
  exhibit baselines (the proto.css precedent, CLAUDE.md's `@container` note). Record the
  divergence from the estimate in the report's divergence section.

### Phase 3: The exporter emits the flow — `studio-export.mjs` + `studio-keep.mjs`

**Depends on:** Phase 1. **Independent of:** Phase 2 (parallel-safe; touches different functions —
but `composed()`'s consumers meet in studio-keep, so merge Phase 2 first if running sequentially).

- `exportHtml({ title, css, inlineTokens, screens, meta })` where
  `screens: [{ name, type, slots: [{ html }], nav: [{ label, target }] }]` (`target` = 1-based
  screen index). Emits one `<section class="sx-screen" id="s<k>">` per screen — heading, slots in
  **composition order** (the board's affordance order; the architecture's "no new bytes"), and a
  `<nav>` of `<a href="#s<j>">` links. **No script** (call 5 survives, stronger than the
  sanctioned seam): one-screen-at-a-time is CSS —
  `.sx-flow:has(:target) .sx-screen:not(:target){display:none}` — so a browser without `:has()`
  degrades to all screens stacked with working fragment jumps (never a blank page; this is why the
  rule is written in the has-hides direction, not the has-shows one).
- RETIRE `placementRules()`, `num()`, the `MAX_COLS/MAX_ROWS` import, and the `omitted` meta+note
  (1:1 by construction). REWRITE the provenance block: screen/place/affordance/connection counts
  (all from `meta`, counted by the caller); the coordinates sentence is REPLACED by "screens in the
  board's own order; each screen's components in the board's affordance order; the navigation is
  the board's connections — every link in this file leads to another screen in it" (the share link
  owns the arrangement, per epic PRD §3). Claim branch (`TWO_CLAIMS`/`NO_DESIGN_IMPORTED`),
  `stripImports`, `vetTokens`, `NOTHING_COMPOSED`, `FONT_NOTE`, determinism, totality: unchanged.
- `studio-keep.mjs` export click: `compile.composed()` → for EACH screen, render its composition
  into a detached fragment and serialize each node (`XMLSerializer`, the existing discipline);
  map nav `targetId` → screen index; pass `meta.screens`. `getArrangement` drops out of the export
  path (it still feeds `arrangement()` → the share link, untouched). Update `EXPORT_COPY` to name
  the flow honestly (at-rest string → factory baselines churn, expected). `NOT_COMPOSED`,
  `ANSWERS_NOTE`, `SHARE_NOTE`, the settledUrl discipline: unchanged.

### Phase 4: Gates — `build-checks` + `studio-journey` (+ vt-verify run)

**Depends on:** Phases 1–3.

- UPDATE group 15: the swap's unit is now the screen — assert `screens.length ===
  board.places.length` for every fixture; per-screen `composition.length === slots.length`; the
  entry screen's identity with the top-level result; determinism deep-compares include `screens`;
  totality unchanged. Rewrite the 15.2 cardinality commentary (the matchesPlaces/differs tripwire
  is about the SINGLE-pattern derivations and stays as a statement about `slotsFor`, not the swap).
- REWRITE group 17's screens-shaped cases: keep zero-request/strip/claims/determinism/junk cases
  verbatim in spirit; drop cases 4, 5, 7 (placement table, caps import, omitted note); add:
  N sections for N screens, every `href` a fragment resolving to an id in the document, the `:has`
  rule present, one-screen fixture emits no dead nav.
- ADD **group 19 "flow"** (after 18; register in the header's group list at :17-71):
  1. **The real committed board** (`readFileSync replay/build-fieldwork-dispatch.board.json` —
     group 16's precedent): 4 screens; entry type === `patternFor`'s id; nav total === the file's
     `connections.length` (7); **reachability** — BFS over `nav` from screen 1 reaches all 4
     ("clickable end to end", the pure half); types pinned as a tripwire histogram (1 dashboard +
     3 queue) the way group 16 pins the op histogram.
  2. **Screen-type coverage, the BOARD_FOR rule**: iterate `PATTERNS` (screen types ARE the
     patterns); for each `inLibrary` pattern a `FLOW_FIXTURE[type]` must exist whose flow contains
     a screen of that type — a missing fixture fails loudly. Fixtures: the four `BOARD_FOR` entry
     flows + `HUB_BOARD` (entry settings + S4 bare screens for free) + one new non-entry-hub board
     (S2) — every rule S1–S4 exercised.
  3. **Nav is counted from connections only**: remove one connection from a copy → that nav entry
     disappears and the reachability set changes; an unconnected affordance produces no nav.
  4. **Truncation stated**: `FULL_BOARD` + `shape: "stream"` → the entry feed screen shows
     `SLOT_MAX` of 36 with `streamNote`'s denominator; per-place slots are bounded by
     `MAX_AFFORDANCES === SLOT_MAX`, so no per-place truncation exists to go unstated (assert it).
  5. **Empty board**: `screensFor` → null; `compileSteps` → "empty"; `exportHtml` with no screens →
     the honest empty document (AC #4).
  6. **Every screen validates against the REAL generated vocabulary**: `validateComposition(VOCAB,
     …)` + `hasTemplate` per composed node, over every fixture's every screen (AC #6).
  7. **The mutation cases** (the check must be able to fail): tamper an exported document (drop a
     section) and assert the href-resolution predicate goes red; corrupt one screen's type in a
     copy and assert the pinned histogram compare fails.
  8. **Totality**: `screensFor` over group 15's nine junk boards + junk answers — never a throw.
  9. **State the boundary** (groups 9/11/13/16's discipline): clicking, focus, scroll, the live
     region, and the cold `file://` open are `tooling/studio-journey.mjs`'s and the manual check's.
- UPDATE `studio-journey.mjs`: `compilePass` (:1950) and the take-over-compile pass (:1768-1822)
  assert the compiled DOM's new shape (`.stx-slot` holds `.stf-screen` holding a `.ds-*`
  primitive). ADD the flow pass: compile → N screens on stage; **pointer** click a nav button →
  focus lands inside the target wrapper + the announcement sentence read from `.stx-live`;
  **keyboard** — Tab to a nav button, Enter → same result; walk the fieldwork chain end to end
  (p1→p2→p3→p4) counting one announcement per navigation; revert → the blocks return
  byte-identically; reduced motion → same end state, no smooth scroll.
- RUN `tooling/vt-verify.mjs` (no edits expected: the beat stays a crossfade, navigation opens no
  view transitions, at-rest counts unchanged) — if it moves, stop and reassess.

### Phase 5: Cascades, copy, baselines, docs

**Depends on:** Phases 2–4 (baselines regenerate last, from the finished tree).

- UPDATE `factory.html` :207-218: replace "What compiles is one screen's components, not a flow
  between screens." with the flow sentence (places → screens, connections → navigation, still
  validated against the generated vocabulary before any of it renders). No new `data-term` keys
  (an unknown key aborts the glossary mount and fails the VR gate loud).
- ADD one `system/param-manifest.json` entry:
  `{ "page": "/factory", "selector": "[data-studio-canvas] .stf-go", "label": "compiled flow navigation (one verb class)", "note": "added by #212; conditional — after compile" }`
  → regen `node agent-layer/gen-param-count.mjs`.
- Regen `node agent-layer/gen-loc-summary.mjs` (new tracked file `studio-flow.mjs`).
- UPDATE `CLAUDE.md`: a `studio-flow.mjs` architecture-map entry; amend the `studio-compile.mjs`
  and build-checks lines (group 19; the #212-pending phrasing).
- Regen baselines from a **clean detached worktree under /Users** (`cd tooling/visual-regression &&
  npm run update:docker`): factory ×2 (the copy change) + approach ×2 (loc-summary numbers), same PR.
- Write `.claude/reports/studio-flows-places-screens-212.md`; PR via `/piv-create-pr` with
  **`Closes #212`** in the body; plan + report + review committed in the same PR.

---

## STEP-BY-STEP TASKS

IMPORTANT: execute in order. Branch first: `git switch main && git pull && git switch -c
feat/212-studio-flows` (the worktree is shared across sessions — verify the branch immediately
before every commit and stage by explicit path).

### ADD `system/pattern-rules.mjs` — the screen rules

- **IMPLEMENT**: `screensFor(board, answers)` per Phase 1's rule set; per-place row derivation;
  per-screen `reason` sentences; nav counted from `connections`.
- **PATTERN**: `patternFor` :150-175 (reason-is-the-rule), `slotsFor` :183-295 (counted values,
  `String()` at the boundary), `isHub` :126-135 (reuse its predicate shape for S2 — factor the
  shared per-place core into a small helper rather than duplicating the condition).
- **IMPORTS**: none — the file stays import-free (:16-17). Everything it needs is local.
- **GOTCHA**: `targetOf`/`labelOf` exist inside `slotsFor` (:190-195) — hoist to module scope
  (they are pure) rather than writing a third copy. Empty board check is `isEmptyBoard` (:109).
- **VALIDATE**: `node -e "import('./system/pattern-rules.mjs').then(async m => { const b = JSON.parse((await import('node:fs')).readFileSync('replay/build-fieldwork-dispatch.board.json','utf8')); console.log(JSON.stringify(m.screensFor(b, null), null, 1)); })"`
  → 4 screens, entry `dashboard`, 7 nav entries total, `null` for `screensFor(null)`.
- **SATISFIES**: AC #1 (committed rule per place), AC #2 (slots counted), AC #4 (empty board).

### CREATE `system/studio-flow.mjs`

- **IMPLEMENT**: `renderScreen` + `wireFlow` per Phase 2. Header cites the epic architecture §Data
  model → Screen typing and this plan; records the no-bus decision.
- **PATTERN**: header + `el()` + reduced-motion helper copied per `studio-compile.mjs` :145-174;
  refusal-to-live-region discipline; Node-import-safe (no DOM at module scope, no self-boot).
- **IMPORTS**: `compose` from `./pattern-render.mjs`, `renderComposition` from
  `./agentic-renderer.mjs`, `INSPECT_IDS` if applied here (or leave application in applySwap —
  keep it in applySwap, one place).
- **GOTCHA**: the heading needs `tabindex="-1"` to be focusable; `scrollIntoView({ block:
  "nearest", behavior: reduceMotion() ? "auto" : "smooth" })`; announcements go through the
  injected `say`, never a second live region (studio-canvas :130-133's argument).
- **VALIDATE**: `node -e "import('./system/studio-flow.mjs').then(() => console.log('node-import safe'))"`
- **SATISFIES**: AC #3 (clickable + announced).

### UPDATE `system/studio-compile.mjs` — per-screen swap, L3 closed

- **IMPLEMENT**: Phase 2's compileSteps + applySwap + revert changes; header rewrite (:38-49 and
  call-site comments that name the extra/surplus branches).
- **PATTERN**: the tripwire's phrasing mirrors :390-398; the stash discipline :362-370.
- **GOTCHA**: `composed()`'s callers (studio-keep) get `result.screens` — keep `result.state`
  semantics identical so the rail's NOT_COMPOSED branch is untouched. Do not touch `getBoard`,
  `setEnabled`, the liveness checks, or the `finally` handle. `fade()` per swapped screen node.
- **VALIDATE**: `node tooling/build-checks.mjs` (group 15 will fail until Phase 4's update — run
  it to see ONLY the expected group-15 shape failures, nothing else).
- **SATISFIES**: AC #1/#3/#6 (the beat renders rule-typed screens through the validator); the
  inherited L3 close.

### UPDATE `system/studio.css` — `.stf-*` chrome

- **IMPLEMENT**: `.stf-screen` (frame, token-only), `.stf-screen-name`, `.stf-nav`, `.stf-go`,
  the S4 empty note class; reduced-motion additions beside :203-205.
- **PATTERN**: the `.stu-compile*` block :365-410 (token-only, `:empty` guards where useful).
- **VALIDATE**: `node tooling/build-checks.mjs` group 12 still green (no caps touched).
- **SATISFIES**: AC #3 (visible affordances).

### UPDATE `system/studio-export.mjs` — the multi-screen document

- **IMPLEMENT**: Phase 3's signature + markup + CSS + provenance rewrite; retire placement
  machinery and `omitted`.
- **PATTERN**: escape-once at the template (:68-78); FIXED strings; total-by-contract junk
  handling (:193-200's shape).
- **GOTCHA**: keep `stripImports` and the `vetTokens` call exactly where they are; the `:has()`
  rule must be written in the **has-hides** direction (no-`:has` engines must still show
  everything); section ids are generated integers (`s1…sN`) so nothing visitor-supplied reaches an
  id or an href.
- **VALIDATE**: `node -e` smoke: build a two-screen export, assert both `id="s1"`/`id="s2"`
  present, every `href` matches `/^#s\d+$/`, output identical across two calls.
- **SATISFIES**: AC #5.

### UPDATE `system/studio-keep.mjs` — per-screen serialization

- **IMPLEMENT**: Phase 3's export-click rewrite; `EXPORT_COPY` flow wording.
- **PATTERN**: the existing click handler's try/refusal/`handed` shape (:317-405) — keep it.
- **GOTCHA**: `trackFactoryExported()` still fires only on the handed path; nothing new is fetched
  at rest; the share-link path (`arrangement()`, `currentUrl`, `publishLink`) is NOT touched.
- **VALIDATE**: `npx serve .` → /factory → settle → Export downloads; open the file from
  `file://` in a real browser, click end to end (record engines in the report — spike-3 style).
- **SATISFIES**: AC #5.

### UPDATE `factory.html` — the honest copy

- **IMPLEMENT**: the sentence swap at :214-218, surgical, **replacement drafted** (decided at
  planning review — implementation may tighten grammar, never the claims). Current:
  > "What compiles is one screen's components, not a flow between screens. The compile runs
  > <dfn …>declarative generative UI</dfn>: the screen is proposed as data, then validated against
  > the generated component vocabulary before any of it renders."

  Replacement:
  > "What compiles is a connected flow: each place becomes a screen, and every connection the run
  > drew becomes a working navigation between them. The compile runs
  > <dfn …>declarative generative UI</dfn>: each screen is proposed as data, then validated against
  > the generated component vocabulary before any of it renders."
- **GOTCHA**: the `<dfn class="term" data-term="declarative-generative-ui" …>` element moves
  verbatim — no new `data-term` keys (an unknown key aborts the glossary mount and the VR gate
  fails loud). Every other clause in the paragraph (:207-214) stays true after flows and stays
  untouched.
- **VALIDATE**: page renders under neutral (`npx serve .`); no console errors; glossary mounts.
- **SATISFIES**: the honesty contract; AC #1's "a reader can open the file and follow".

### UPDATE `tooling/build-checks.mjs` — groups 15 + 17 + new 19

- **IMPLEMENT**: Phase 4's group work, including both mutation cases and the header list entry.
- **PATTERN**: group 16's real-file reads + pinned histogram; group 17's boundary statement;
  `deep()` canonical stringify (copy it into 19 the way 15 copied it from 13 — NEVER
  `JSON.stringify(v, keys)`).
- **GOTCHA**: read the committed board with `readFileSync(join(ROOT, "replay/…"))`, never a
  literal copy; iterate `PATTERNS` for fixtures (a sixth pattern with no flow fixture must fail);
  keep the group runnable when a prior group failed (no dereference of a possibly-null result —
  15's :2680-2684 anti-pattern note).
- **VALIDATE**: `node tooling/build-checks.mjs` → all groups green, including `flow`; then
  temporarily break one rule in pattern-rules (locally, unstaged) and confirm `flow` goes red;
  revert.
- **SATISFIES**: AC #7 (+ AC #6's CI half, AC #4, AC #2's pure half).

### UPDATE `tooling/studio-journey.mjs` — the flow pass

- **IMPLEMENT**: Phase 4's journey work (compilePass reshaping + the new flow pass).
- **PATTERN**: `compilePass` :1950's structure; announcements counted EXACTLY per path (the
  studio-journey discipline); reach the studio through `getStudio()`/`getCompile()` seams, never
  `window.__` globals.
- **THE CHOREOGRAPHY** (this is the plan's one residual risk, so it is spelled out rather than
  discovered): a fresh page per pass;
  `waitForSelector('[data-replay="settled"]', { timeout: 20000 })` **before** touching the compile
  button — the beat is `setEnabled(false)` until settle (#240/1, studio.mjs:503), so a click
  before settle silently no-ops and every later assertion reads the blocks;
  then click `.stu-compile-btn` and `waitForFunction` on
  `[data-studio-canvas]`'s `data-compile-state === "rendered"` (never a fixed sleep — the beat's
  step pacing is 4 × 420 ms plus a first-compile vocabulary round trip);
  read announcements by **waiting for `.stx-live`'s textContent to change** after each nav click
  (polling the same string twice counts one announcement as two);
  the end-to-end walk follows the fieldwork chain by clicking the nav button whose accessible name
  targets the next place, asserting after each hop that `document.activeElement` sits inside the
  target wrapper AND the live region carries the fixed `"<label>, screen k of N."` sentence;
  keyboard leg on a fresh compile: Tab from the wrapper's grab handle to the nav button, `Enter`,
  same two assertions;
  reduced-motion leg via `emulateMedia({ reducedMotion: "reduce" })` — same end state, and the
  scroll settles immediately (no smooth animation to race);
  UPDATE the two existing compiled-shape assertions — `compilePass`'s primitive-in-slot check and
  the take-over pass's `compiled9` selector (:1807-1810) — to `.stx-slot .stf-screen .ds-*`
  (a slot holds a screen holding a primitive).
- **VALIDATE**: `node tooling/visual-regression/serve.mjs &` then
  `node tooling/studio-journey.mjs all` (three engines green).
- **SATISFIES**: AC #3 (pointer + keyboard + announced), AC #1's running-page half.

### UPDATE `system/param-manifest.json` + regen counts

- **IMPLEMENT**: the one entry from Phase 5; run `node agent-layer/gen-param-count.mjs`.
- **VALIDATE**: `git diff system/param-count.json` shows the /factory + site totals moved by the
  expected amount; CI `verify` drift-checks it.
- **SATISFIES**: the standing new-control convention.

### Regen loc-summary + CLAUDE.md + baselines

- **IMPLEMENT**: `node agent-layer/gen-loc-summary.mjs`; CLAUDE.md map edits; then, from a clean
  detached worktree under `/Users` (NOT /private/tmp — Docker sharing), `cd
  tooling/visual-regression && npm run update:docker`; commit factory ×2 + approach ×2 baselines.
- **GOTCHA**: loc-summary counts **tracked** content — commit (or stage) `studio-flow.mjs` before
  trusting `--check`; `update:docker` screenshots the dirty tree, hence the clean worktree; a
  sub-perceptual diff may need the PNG `rm`-ed to force the rewrite.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` clean on the committed tree; the VR
  run green locally (16-failed-on-macOS = platform, check the Docker run, not the local one).
- **SATISFIES**: the baseline + loc cascades.

### Report, commit, PR

- **IMPLEMENT**: the execution report; atomic commits per phase (`feat(212): …`); `/piv-create-pr`
  with `Closes #212` and the L3-close paragraph in the body.
- **VALIDATE**: `gh pr view --json body | grep "Closes #212"`.

---

## TESTING STRATEGY

This repo has no test suite ("run the surface you touched"). The gates ARE the tests:

### CI (blocking)
`node tooling/build-checks.mjs` — groups 1–3 (untouched, must stay green: /build's contract),
15 (updated), 17 (rewritten cases), **19 (new)**; the `verify` job's drift checks (loc-summary,
param-count, handoff — no tokens change here so no handoff regen).

### Operator-run (recorded in the report)
`studio-journey.mjs all` (chromium + firefox + webkit) · `vt-verify.mjs` (run, expect no edits) ·
the manual cold `file://` open of the exported flow on all three engines, clicked end to end.

### Edge Cases (each owned by a named check above)
Empty board (19.5) · single-place board → one screen, zero nav, no dead links (17) · bare place
as a navigation destination (S4, via HUB_BOARD in 19.2) · unconnected affordance → no nav (19.3) ·
feed entry's 36→6 truncation stated (19.4) · junk boards/answers → never a throw (19.8) · wrapper
count ≠ screen count → the loud tripwire refusal (journey's take-over-compile pass keeps proving
compile works mid-flow) · reduced motion (journey) · hostile labels → text-only sinks + escape-once
(inherited; group 6/7 stay green).

---

## VALIDATION COMMANDS

### Level 1: Syntax & purity
- `node -e "import('./system/pattern-rules.mjs').then(()=>console.log('ok'))"` (and for
  `studio-flow.mjs`, `studio-compile.mjs`, `studio-export.mjs`) — Node-import safety.

### Level 2: The committed gate
- `node tooling/build-checks.mjs` — zero failures, `flow` group present in the output.

### Level 3: Cross-engine journeys
- `node tooling/visual-regression/serve.mjs &` then `node tooling/studio-journey.mjs all`
- `node tooling/vt-verify.mjs`

### Level 4: Manual
- `npx serve .` → `/factory`: settle → take over → Compile → click the flow end to end by pointer,
  then by keyboard; Back to blocks; Compile again (byte-identical re-run).
- Export → open from `file://` cold → every navigation works offline; DevTools network tab shows
  zero requests.

### Level 5: Baselines
- `cd tooling/visual-regression && npm run update:docker` (clean worktree) → commit the four PNGs;
  `gh pr checks` after push (local green ≠ CI green — the approach countUp flake is known).

---

## ACCEPTANCE CRITERIA

- [ ] AC1 — every place resolves to a screen type by a committed, commented rule (pattern-rules.mjs, readable top to bottom)
- [ ] AC2 — slots per screen counted from the board; SLOT_MAX truncation stated (streamNote inherited; per-place bound proven un-truncating)
- [ ] AC3 — 2–4-screen flow clickable end to end by pointer AND keyboard, each navigation announced (journey-proven, three engines)
- [ ] AC4 — empty board: no pattern, no screens, said honestly (group 19.5 + existing empty card)
- [ ] AC5 — exporter emits the whole flow; cold `file://`, every navigation works, zero network (group 17/19 static proof + manual cold open)
- [ ] AC6 — every composed screen validates against the real generated `handoff/verdant/vocabulary.json` (group 19.6 + the beat's own render path)
- [ ] AC7 — new build-checks group green, a board fixture per screen type, missing fixture fails loudly
- [ ] Inherited L3 closed (structurally) and recorded in the PR body
- [ ] /build unchanged in behavior (groups 1–6 green untouched)
- [ ] All cascades: param-manifest+count, loc-summary, factory ×2 + approach ×2 baselines, CLAUDE.md, `Closes #212`, plan+report+review in the PR

---

## COMPLETION CHECKLIST

- [ ] All tasks executed in order, each validation run at its step
- [ ] `node tooling/build-checks.mjs` fully green; mutation spot-check performed and reverted
- [ ] `studio-journey.mjs all` green on three engines; `vt-verify.mjs` unchanged-green
- [ ] Manual `file://` cold open recorded (engines + zero requests) in the report
- [ ] Baselines regenerated from a clean worktree, committed in the same PR
- [ ] Branch verified before every commit (shared worktree); staged by explicit path

---

## DECISIONS CONFIRMED AT PLANNING REVIEW (2026-08-07)

The three calls flagged at planning were reviewed with the owner and are **decided** — do not
re-open them at implementation; a genuine blocker against any of them goes to the owner, not into
silent divergence:

1. **The screen-typing rule set S1–S4 is final for this ticket** (entry wears the board's pattern;
   per-place hub → settings; other non-entry → queue; bare place → honest empty screen). The
   reason sentences are drafted in Phase 1. The richer onboarding mapping is recorded as rejected,
   with the counted-numbers argument, in Phase 1's preamble.
2. **Inherited L3 closes structurally** — exact deletions, the drafted tripwire message, the
   header rewrite, and the drafted PR-body paragraph are in Phase 2's applySwap task. The
   stash-ids + occupancy-scan fallback is recorded in NOTES and fires only if review finds a
   reachable mismatch state.
3. **The at-rest copy change is drafted** (factory.html task — the false "not a flow between
   screens" sentence and its replacement, `dfn` preserved), factory ×2 + approach ×2 baselines
   regenerate in the same PR, and **`components.css` stays untouched** (Phase 2 records why, with
   the baseline-cascade argument).

## OPEN QUESTIONS / ASSUMPTIONS

1. **Assumption**: wrappers === places on /factory in every reachable state (the basis for the L3
   structural close). Verified against studio.mjs (arrangeBoard breaks at MAX_COLS=12 >
   MAX_PLACES=6; no canvas verb adds/removes wrappers; the ?b= sent-arrangement path requires
   equal lengths). The tripwire refusal covers anything unforeseen.
2. **Assumption**: no vt-verify edits needed (crossfade stays, nav opens no transitions). If the
   run disagrees, stop and reassess before adding entries.
3. **Assumption**: `:has()` is available on the gate engines (baseline everywhere since 2023);
   the export CSS is written in the has-hides direction regardless, so absence degrades to a
   stacked, still-navigable document rather than a blank page — no open decision rides on it.

## NOTES (open canvas)

**Why the five patterns ARE the screen types** (vs a new type vocabulary): a second type table
would be a second truth beside PATTERNS, need its own inLibrary story, and re-open the
out-of-library contract. Reusing the patterns keeps `compose()` the one place a type becomes
components, keeps the refusal card's contract intact for a sixth pattern, and makes the PRD's
question answer itself: the mapping IS the identity, plus rules for which place gets which.

**Why navigation is chrome, not composed components**: the three primitives are deliberately
non-interactive (agentic-renderer.mjs:319-356). Making list-row clickable would change a shipped
vocabulary component's contract for every consumer (Fieldwork slots, /build, the study). Chrome
buttons beside the composed rows keep the vocabulary honest and the export's serialization rule
("no markup hand-written for the product") intact — the nav is the surface's furniture, like
`.sx-prov`, and says what it is.

**Why the export drops canvas coordinates**: the flow's product-layout is screens (board order) ×
slots (affordance order) — the architecture's "no new bytes" line. Canvas position persists in the
share link (`g`, #208), which the epic PRD §3 names as the arrangement carrier. The provenance
sentence changes so the file never claims geometry it no longer carries.

**Why L3 closes by deletion rather than by fix**: the finding's two defects (re-minted
`data-stx-id`s, no occupancy scan) live in branches whose reachability #212 itself removes —
screens are 1:1 with wrappers by construction. Fixing them would be building correctness into
dead code; the tripwire turns any unforeseen mismatch into a loud, honest refusal instead of a
silent misalignment. The alternative (stash ids + reuse the verbs' occupancy check) is recorded
here as the fallback if review finds a reachable mismatch state.

**Sequencing note**: Phases 1→2 and 1→3 can run as parallel tracks (different files) if two
sessions are available; Phase 4 needs both. Baselines strictly last.

**Risk register**: (a) group 15/17 churn is the widest blast radius — do those edits with the old
assertions open side-by-side, keep every predicate that still applies; (b) journey timing around
the replay (compile is blocked until settle — the flow pass must wait on `[data-replay="settled"]`
like compilePass does); (c) the factory copy edit is inside a `beat-lead` with a glossary `dfn` —
don't move the `data-term`.

## AMENDMENTS

<!-- append-only; newest at the bottom -->

- 2026-08-07 — planning-review revision (pre-implementation, owner-requested): the three flagged
  calls resolved into recorded decisions — (1) screen-typing rules S1–S4 final, reason sentences
  drafted, richer onboarding mapping rejected on the counted-numbers argument; (2) L3 structural
  close made concrete (exact line targets, drafted tripwire message, drafted PR-body paragraph);
  (3) factory.html replacement copy drafted with the `dfn` preserved, `components.css` untouched
  decided with the baseline-cascade argument. Journey-pass timing choreographed step-by-step
  (settle-gate, state-waits, live-region change-detection, the two reshaped compiled-DOM
  selectors). Confidence 9/10 → 9.5/10 on those grounds.
