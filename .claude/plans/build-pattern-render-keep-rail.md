# Feature: /build slice 1c — committed pattern rules → the agentic renderer → the keep rail

The following plan should be complete, but it's important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

## Feature Description

The fourth and last act of the public pattern builder. Everything before it is in place on
`feature/build-questions-ten-136`: Act 0 puts the visitor's design tokens on a scoped stage
(`system/build-import.mjs`), Acts 1–2 take ten method questions and both ethics gates
(`system/build-questions.mjs`), Act 3 drafts an editable breadboard from those answers
(`system/breadboard.mjs`). The page currently ends on an honest note that says the pattern, the
downloads and the share link are next.

This slice makes them exist:

1. **Committed rules** (`system/pattern-rules.mjs`) read the breadboard's shape and the answers and
   name one of five patterns — the definitions are in a file a reader can open, cited on the page
   the way `derive.html` cites `derive.rules.mjs`.
2. **A real render** (`system/pattern-render.mjs`) turns the named pattern plus board-derived slot
   content into a `{name, props, children}` composition and hands it to the EXISTING
   vocabulary-validated `agentic-renderer.renderComposition` — the same format and the same
   validator the real build-time agent runs use. Slice 1 ships **dashboard** (`metric-tile`) and
   **queue** (`list-row`). The other three patterns get a designed "not in the library yet" card
   with the breadboard front and centre — never a fake render.
3. **A keep rail** the visitor leaves holding: an SVG build card ("Rendered from your build"),
   `breadboard.json`, `breadboard.svg`, `pattern-spec.md`, the tokens.css Act 0 already offers, and
   a **share link** that rebuilds the entire state in a colleague's browser with no server involved.

## User Story

As a hiring manager who has just described my own product through this candidate's method
I want to see a real UI pattern assemble from my breadboard under my own design tokens, and leave
holding the artifacts and a link that rebuilds it for a colleague
So that I have verified the candidate's system end to end on my own problem, and I have something
to forward rather than a claim to remember.

## Problem Statement

/build stops one act short of its thesis. A visitor answers ten questions and edits a breadboard,
and then the page tells them the interesting part is coming. Nothing renders, nothing can be kept,
and nothing can be shared — so the surface that exists to be *verified* currently ends in prose.

The honesty risk is the reason it is not trivial: a page whose whole argument is "committed rules,
no model, checkable claims" cannot fake the render. Whatever assembles has to go through the real
renderer against the real generated vocabulary, and whatever cannot be built has to say so.

## Solution Statement

One chain, all deterministic, all committed:

```
BUILD_CHANGE state ── pattern-rules.patternFor(state) ──▶ pattern id + the reason it was chosen
   (answers, board,   pattern-rules.slotsFor(id, board) ─▶ slots derived FROM THE BOARD (no invented data)
    pack)                        │
                                 ▼
                pattern-render.compose(id, slots) ──▶ {name,props,children}
                                 │
                                 ▼          (validateComposition — refusal before any DOM)
                agentic-renderer.renderComposition(vocab, composition, bus)
                                 │
                                 ▼
                #pattern-stage — wearing the visitor's tokens, scoped (build-import applies to
                                 every [data-build-stage], never :root)
                                 │
                                 ▼
          keep rail: build card SVG · breadboard.json/.svg · pattern-spec.md · tokens.css · ?b= link
```

Three of the five patterns have no components in the library yet. That path is designed, not
degraded: the card names the pattern, says which components would be needed and why they are not
there, and puts the visitor's breadboard beside it as the artifact that IS real. The refusal is a
first-class affordance — the same argument `agentic-study.mjs` already makes about the boundary
probe.

**No new component spec.** `list-row` (`label`/`value`/`unit`/`meta`/`status`/`tone`) carries a
queue row, and `metric-tile` carries a dashboard tile; both are the cross-scenario `ds-` library
primitives, which is exactly what a stranger's product should be rendered in. `ds-queue-row` is
therefore NOT created (open question Q3 in the epic plan, decided against with the vocabulary in
hand), and no `gen-handoff`/`gen-vocabulary`/`gen-pack-bundle` regeneration is needed.

## Out of Scope / Non-Goals

- **Not included**: the onboarding, feed and settings pattern templates and their build-card
  templates (slice 2, #139) — this slice names those patterns and ships the honest card.
- **Not included**: linking /build from the home close beat and work.html, the /build VR baselines,
  the cross-engine (firefox/webkit) functional pass, and the CLAUDE.md architecture-map entry —
  all slice 1d (#138). **Exception, non-negotiable**: `system/loc-summary.json` and the two
  `approach-*` VR baselines regenerate HERE, because adding tracked `system/*.mjs` files changes the
  runtime line counts approach.html renders, and `tooling/drift-check.mjs` is a blocking CI gate
  (memory: loc-summary baseline cascade; precedent: #136 did exactly this).
- **Not included**: the operator/agent path (slice 3, #140). No model is called at view time — hard
  honesty-contract rule.
- **Not included**: findings 7, 8, 9, 10, 12 from issue #144. Finding **13** (rename inputs have no
  `maxlength`) IS in scope — #144 says outright that the slice serialising labels into a share URL
  should own it.
- **Not changing**: `system/agentic-renderer.mjs`, `system/action-bus.mjs`,
  `handoff/verdant/vocabulary.json` (generated), `system/pack-import.mjs`,
  `system/pack-imported.mjs`, home's drop surface, the dock's committed packs. The builder consumes;
  it never forks.
- **Not storing anything**: no sessionStorage/localStorage write from /build (build-import.mjs:16-21
  argues why — `pack-boot.js` would make it site-wide on the next navigation). The share link is the
  only persistence and it lives in the URL.

## Feature Metadata

**Feature Type**: New Capability (epic slice)
**Estimated Complexity**: Medium-High
**Primary Systems Affected**: `build.html` + 5 new `system/*.mjs` modules; small seam edits to
`system/build-questions.mjs`, `system/build-import.mjs`, `system/breadboard.mjs`, `system/dock.mjs`;
`system/loc-summary.json` + two approach VR baselines regenerated.
**Dependencies**: none new — zero-dep vanilla, per CLAUDE.md.

## Related Work

**Implements**: #137 (`Closes #137` in the PR body — a title mentioning `(#137)` closes nothing) ·
**Epic**: #134 · **Plan**: `.claude/plans/hooked-shapeup-pattern-builder.md` (Phase 1.4 + the two
tasks "CREATE system/pattern-rules.mjs + pattern-render.mjs" and "CREATE system/build-card.mjs +
build-share.mjs + the keep rail")

**Back-references**:

- `.claude/plans/hooked-shapeup-pattern-builder.md` — the epic plan; its D-decisions, AC6/AC7/AC8,
  and the NOTES section ("why the renderer is the render path", "why scoped, not :root", the
  share-URL size budget) are inherited, not re-decided.
- `.claude/plans/build-page-import-act.md` (#135, PR #141) — Act 0; its scoped-stage model and its
  refusal ordering are the pattern this slice extends.
- `.claude/plans/build-questions-breadboard.md` (#136, PR #142/#143) — the BUILD_CHANGE store, the
  two write paths, and the board data model this slice reads.
- `.claude/code-reviews/pr-143-review.md` + issue #144 — finding 13 (label caps) lands here.
- `.claude/plans/ds-list-row-primitive.md` (PR #123) — why `list-row` is a cross-scenario primitive
  and can carry a stranger's queue rows honestly.

**Forward-references**:

- #138 (slice 1d) — links in + all gates; #139 (slice 2) — the remaining three patterns;
  #140 (slice 3) — the operator path.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

- `system/build-questions.mjs` (**whole file**, esp. lines 30-107) — the BUILD_CHANGE contract, the
  `state` object, `readBuild()`, `publishBuild()` and its **refusal of an `answers` patch**,
  `setAnswers()`. Lines 47-54 predict this slice by name: "Act 0's imported token values are NOT in
  here yet … the first consumer that actually needs those values is the share codec, so that slice
  wires the seam rather than this one guessing at its shape." That is the seam you are wiring.
- `system/breadboard.mjs` lines 1-136 (the data model + `draftBoard`, exported and pure), 185-197
  (`publish`/`commit`), 596-608 (the BUILD_CHANGE listener that redrafts when `edited === false` —
  **the reason a share restore needs its own source**), 620-630 (mount tail, `publish()`,
  `root.dataset.breadboard = "ready"`).
- `system/build-import.mjs` lines 91-143 (`last`, `applyToStage`, `clearStage`, `labelStage`,
  `restingLabel`), 295-336 (`offerDownload`, `download`, `succeed`), 393-423 (`deriveFromColour`,
  `resetToNeutral`), 437-448 (mount tail). Note it publishes NOTHING today and stores nothing.
- `system/agentic-renderer.mjs` — `validateComposition` (pure, throws naming the offending path) and
  `renderComposition(vocab, composition, bus)`. **Read lines 220-342**: the TEMPLATES map is the real
  ceiling. `demo-notice` is in the vocabulary but has NO template (line 360-363 turns that into a
  drift error) — never emit it. `stat-tile`/`plant-card`/`care-task-row` are Verdant-specific
  (enums `moisture|light`, `ok|due|overdue`) and are dishonest for a stranger's product.
- `handoff/verdant/vocabulary.json` (generated — NEVER hand-edit). The two components this slice
  uses, verbatim:
  - `metric-tile` — `label` (string, required), `value` (string, required), `unit` (string),
    `tone` (string, enum `neutral|warn|critical`); children: none.
  - `list-row` — `label` (string, required), `value` (string, required), `unit`, `meta`, `status`
    (all string), `tone` (enum `neutral|warn|critical`); children: none.
- `system/agentic-study.mjs` lines 1-45 — the DOM-free-at-top-level rule, the deep-clone discipline,
  `renderStudy`'s validate-then-render loop, and the refusal-as-primary-affordance framing.
- `agentic-ui-study.html:221` / `proto/fieldwork.html:182` / `handoff.html:193-194` — the three
  committed ways a page fetches `/handoff/verdant/vocabulary.json` and fails honestly when it 404s.
- `system/action-bus.mjs:37` — `createBus()`; `renderComposition` requires a bus even when nothing
  listens.
- `system/pack-imported.mjs` lines 44-88 — `KEY_NAME`, `VALUE_OK`, `vetTokens(map) → {tokens,
  rejected, skipped}`. **This is the decode-side allowlist for shared token values**; the share codec
  must not invent a second one.
- `system/share-state.mjs` (**whole file, 100 lines**) — the committed share-codec voice: bounded
  params, validate-and-drop at the boundary, `NAME_MAX`, hex regexes, the honesty argument in the
  header. This slice's codec is the payload-carrying sibling; read the header before writing yours,
  and read the divergence note in NOTES below (this one carries token VALUES, and must say why).
- `system/pack-derived.mjs` — `deriveBrandTokens`, the `BRAND_CHANGE_EVENT` naming precedent and the
  `history.replaceState` share-URL discipline.
- `system/dock.mjs:441-455` — the disclosure state machine. **`stripHash()` is
  `history.pushState(null, "", location.pathname)` — it drops the query string.** That is the
  query-string-strip bug class #137 asks you to verify; it is live today.
- `build.html` — lines 30-417 are the page-local `<style>` block (page-unique CSS lives HERE, not in
  portfolio.css; the block's own header comment says why); 419-546 Act 0 + the stage + `#build-keep`;
  555-615 Acts 1-2; 617-657 Act 3 + the "what is still missing" note you delete; 661-670 the module
  script tags in load order.
- `system/components.css:1474-1560` — `.ds-metric-tile` and `.ds-list-row`, the classes the renderer
  emits. Your stage CSS wraps them; it does not restyle them.
- `system/portfolio.css:1343+` — the committed `.brand-*` grammar Act 0 reuses. The keep rail's
  buttons are `.btn` variants, not new classes.
- `agent-layer/gen-loc-summary.mjs:22-24` — the `runtime` group regex `^system\/(wc\/)?[^/]+\.(css|mjs|js)$`.
  Every new module you add is inside it.
- `tooling/drift-check.mjs:60-66` — loc-summary drift is a hard CI failure with the exact
  regeneration command in the message.
- `CLAUDE.md` — ground rules (vanilla, no deps, token discipline, honesty contract, PR must carry
  `Closes #N`, plan+report+review committed in the same PR).

### New Files to Create

- `system/pattern-rules.mjs` (~170) — PURE. The committed DEFINITIONS-ONLY rules: the five patterns,
  the shape signatures that name one, and the slot derivations. No DOM, no imports beyond
  `build-questions.mjs`'s `DEFAULT_ANSWERS` if needed. Node-runnable — the `node -e` unit run is
  the ticket's gate.
- `system/pattern-render.mjs` (~220) — `compose(patternId, slots)` (pure) + the DOM shell that
  fetches the vocabulary, subscribes to BUILD_CHANGE, renders through `renderComposition`, and owns
  the out-of-library card and the refusal card.
- `system/build-card.mjs` (~260) — PURE SVG string builders: `cardSvg(state)` (per-pattern
  hand-authored template, parameterised by token values + labels) and `boardSvg(board)` (the
  breadboard as a standalone laid-out SVG for the download). No DOM — strings, escaped.
- `system/build-share.mjs` (~230) — PURE codec: `encodeBuild(state) → Promise<string>`,
  `decodeBuild(param) → Promise<state|null>`, `SHARE_PARAM`. Hand-validates EVERY field, rejects the
  whole payload on any invalid one.
- `system/build-keep.mjs` (~230) — the keep rail's DOM shell: mounts the rail, subscribes to
  BUILD_CHANGE, assembles `pattern-spec.md`, wires every download and the copy-link button, runs the
  `?b=` restore at boot, and keeps the URL current with `history.replaceState`.
- `tooling/build-checks.mjs` (~120) — the `node -e`-class unit runs as one committed script (three
  canned answer sets → expected pattern ids; codec round-trip; the tamper battery). Committed
  because the ticket names these checks as the gate and a gate that lives only in a shell-history
  line cannot be re-run by a reviewer.

### Relevant Documentation — READ BEFORE IMPLEMENTING

- Shape Up, breadboarding (basecamp.com/shapeup/1.3-chapter-04) — places / affordances /
  connections. `system/breadboard.mjs:5-15` already quotes the definitions; the pattern rules must
  not contradict them (an affordance is the source of a connection, not a place).
- MDN `CompressionStream` (developer.mozilla.org/en-US/docs/Web/API/CompressionStream) — `deflate-raw`
  vs `gzip`; Safari shipped it in 16.4, so **feature-detect and fall back to uncompressed**.
- MDN `history.replaceState` — updating the URL without navigating (pack-derived precedent).
- MDN `btoa`/`Uint8Array` — base64url is `btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')`;
  `btoa` throws on non-Latin-1, so encode to UTF-8 bytes FIRST (`TextEncoder`) and base64 the bytes.

### Patterns to Follow

**Module headers cite the governing doc** (CLAUDE.md ground rule). Every new file opens like its
siblings:

```js
// system/pattern-rules.mjs — the committed rules that turn a breadboard into a named pattern
// (epic #134, ticket #137; .claude/plans/hooked-shapeup-pattern-builder.md Phase 1.4,
// .claude/plans/build-pattern-render-keep-rail.md).
```

**Node-import-safe modules** (`build-questions.mjs:25`, `breadboard.mjs:27`): every `document`
reference inside a function body; self-boot behind `if (typeof document !== "undefined")` at the
bottom. This is what makes the unit runs possible.

**The private `el()` helper is duplicated per module on purpose** (`build-import.mjs:43-45` argues
it). Copy it; do not extract a shared DOM utility.

**Validate at the boundary and throw an Error naming the offender** (`agentic-renderer.mjs:39`,
`derive.mjs`). For the decode path, "reject the whole payload and say so once" — not a throw at the
reader (`share-state.mjs:69-71`: "nothing fails on stage").

**Committed-rules honesty device** — the page cites the rules file by link, the way build.html's
capability note already links `pack-import.mjs`, `derive.mjs`, `build-questions.mjs` and
`breadboard.mjs`. Add `pattern-rules.mjs` to that sentence.

**No entrance animation on continuously-rebuilt nodes** (memory: entrance-anim-continuous-rebuild).
The pattern stage re-renders on every breadboard edit; gate any transition behind a discrete-change
class or leave it out.

**The keep rail is structural, never `position: sticky`** — `body { overflow-x: clip }` on shipped
pages makes sticky a no-op for every descendant (memory: overflow-clip-breaks-sticky).

**Settled-state handles for the VR gate** — every mount ends with `root.dataset.<name> = "ready"`
(`build-import.mjs:447`, `build-questions.mjs:442`, `breadboard.mjs:629`). Slice 1d's baselines wait
on them; a mount without one either deadlocks the wait or baselines an empty surface.

---

## IMPLEMENTATION PLAN

### Phase 1 — the seam (state carries the pack, and can be restored)

Three small edits that everything else stands on, and the only edits to shipped modules:
`build-questions.mjs` gains `restoreBuild()` and a documented `pack` field; `build-import.mjs`
publishes its pack and applies tokens to every `[data-build-stage]`; `breadboard.mjs` adopts a
restored board. Verified before any new module exists: the page still behaves exactly as it does
today, and `readBuild()` now carries `pack`.

### Phase 2 — rules + render

**Depends on:** Phase 1 (the render reads `state.board`; the stage wears `state.pack`).
`pattern-rules.mjs` (pure, unit-run gated) then `pattern-render.mjs` + its section in `build.html`.

### Phase 3 — card + share codec

**Independent of:** Phase 2 — `build-card.mjs` and `build-share.mjs` are pure functions over the
state shape fixed in Phase 1, and can be written and unit-run before the stage renders. (Their
*wiring* needs Phase 2's pattern id, which is why the rail comes after.)

### Phase 4 — the keep rail + restore

**Depends on:** Phases 2 and 3. `build-keep.mjs`, the `#act-keep` section, the `#build-keep` move,
the dock query-string fix, and the `?b=` boot restore.

### Phase 5 — gates

**Depends on:** all. `node --check` every module, the committed unit runs, `token-lint`,
`loc-summary` regen, `drift-check`, the headless full-journey script, the two approach baselines.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently
testable. Work on a branch off `feature/build-questions-ten-136` **only if it is already merged to
main** — check first (`git log --oneline origin/main -3`, `gh pr list --state merged --search 136`);
if #136 has landed, branch from `origin/main`. Memory: the owner merges fast, and this worktree is
shared with parallel sessions — verify the branch immediately before committing and stage by
explicit path. The five HTML files currently dirty in the working tree (`derive.html`, `index.html`,
`instance.html`, `roundtrip.html`, `trace.html` — em-dash copy edits) belong to another session:
**do not stage them.**

### UPDATE `system/build-questions.mjs` — all four edits, in one pass

This shipped module is touched in exactly four places this slice. Do them together so nothing is
discovered late:

- **IMPLEMENT**: (a) extend the BUILD_CHANGE contract comment (lines 30-54) with `pack: { slug,
  label, fileName, tokens, note } | null` and the two new `source` values `"import"` and
  `"restore"`; delete the now-answered "Act 0's imported token values are NOT in here yet" paragraph
  and replace it with what the seam became. (b) add `pack: null` to the `state` seed. (c) export
  `restoreBuild({ answers, board, boardIsEdited, pack })`: hand-validate nothing here (the codec
  already did), assign the patch's answers into the module-scope `answers` object **through the same
  object `setAnswers` writes** (`Object.assign(answers, patch.answers)`), assign `board`,
  `boardIsEdited` and `pack` onto `state`, then `publishState({ source: "restore", answers: {
  ...answers } })` ONCE. One event, one atomic restore. (d) `export` the existing module-private
  `SUMMARY_TERM` map (line 279) — `build-keep.mjs` writes the same method terms into
  `pattern-spec.md`, and a second copy of "Internal trigger / Variable reward / Appetite" is a
  method-fidelity bug waiting to drift. `QUESTIONS` and `DEFAULT_ANSWERS` are already exported and
  are what `build-share.mjs` validates against.
- **PATTERN**: `setAnswers` (line 351-354) — move the module object first, then publish the whole
  set. `publishBuild`'s refusal (line 102-107) stays exactly as it is: `restoreBuild` is a *third*
  named path, not a hole in the second.
- **GOTCHA**: `publishState` recomputes `quadrant`/`frequencyVerdict` from `state.answers` — so a
  restore can never carry a verdict its own answers do not produce. Keep it that way (don't accept a
  quadrant from the URL).
- **VALIDATE**: `node --check system/build-questions.mjs` and
  `node -e 'import("./system/build-questions.mjs").then(m=>{console.log(Object.keys(m.readBuild()));})'`
  → prints a key list containing `pack`.
- **SATISFIES**: AC7

### UPDATE `system/build-import.mjs` — publish the pack, dress every stage, adopt a restore

- **IMPLEMENT**: (a) import `{ BUILD_CHANGE, publishBuild, readBuild }` from `./build-questions.mjs`.
  (b) replace the single `stage` const with `const stages = [...document.querySelectorAll("[data-build-stage]")]`
  (keep `document.getElementById("build-stage")` as the guard for "the page has an Act 0 at all");
  `applyToStage`/`clearStage` iterate `stages`. (c) `succeed()` also calls
  `publishBuild({ source: "import", pack: { slug: r.slug, label: r.fileName, fileName: r.fileName,
  tokens: r.record.tokens, note: r.mapped.note } })`; `deriveFromColour()` publishes
  `{ slug: "derived", label: hex, fileName: null, tokens, note: null }`; `resetToNeutral()` publishes
  `pack: null`. (d) a BUILD_CHANGE listener registered once at mount: on `detail.source ===
  "restore"`, if `detail.pack` → `clearStage(); applyToStage(detail.pack.tokens);
  labelStage(...)` and set the status line to the shared-link provenance sentence; if `detail.pack`
  is null → `clearStage()`.
  (e) **seed from the store at mount**: after wiring the listener, call `readBuild()` and, if it
  already carries a `pack`, run the same adopt path. That is the "pulled, not awaited" discipline
  `breadboard.mjs:169-171` already documents, and it is what makes the restore
  **order-independent** — a consumer that mounts *after* the restore published still lands on the
  right state, so correctness stops resting on one script tag's position (NOTES: "why restore
  ordering stopped being a risk").
- **PATTERN**: the listener discipline in `breadboard.mjs:596` (registered once, outside render,
  filtered by `source`).
- **GOTCHA — the one application point, and it is this module's invariant.** The restored token map
  came from a URL. `applyToStage` is the ONLY place in the codebase where a /build token value
  reaches `style.setProperty`, and every path into it — drop, candidate retry, derive, restore —
  goes through `vetTokens()` (already imported from `pack-imported.mjs`) first, even where the codec
  already validated. Two consequences to hold: (1) `applyToStage` itself calls `vetTokens` on its
  argument rather than trusting its callers, so the invariant is enforced at the choke point, not by
  four correct call sites; (2) `grep -n "setProperty" system/build-import.mjs` must return exactly
  one line at review time, and the review notes should say so. `VALUE_OK` excludes `:` `;` `{` `}`
  `<` `>` `"` `'` `\` `*` and `&`, which is why `url(javascript:x)` and any declaration break are
  rejected rather than escaped. Do NOT write sessionStorage (module header lines 16-21). Do NOT
  publish from `retry()` separately — it calls `succeed()`.
- **VALIDATE**: `npx serve .` → /build, drop `tooling/figma/fixtures/*.json` (or any DTCG export) →
  the Act 0 stage still re-skins, and `document.addEventListener('factory:build-change',e=>console.log(e.detail.pack))`
  logs the pack. Zero console errors. **Explicitly re-check the boot order**: importing
  `build-questions.mjs` from `build-import.mjs` makes build-questions' module body — including its
  self-boot — evaluate at build-import's import, i.e. BEFORE its own script tag at build.html:669.
  Modules evaluate once and the DOM is parsed by then, so this should be inert; prove it rather than
  assume it — both wizards and the verdict panel still render on first paint, and Act 0's
  `labelStage()`/`status()` still show the right resting copy.
- **SATISFIES**: AC7, AC8

### UPDATE `system/breadboard.mjs` — adopt a restored board, and cap rename inputs

- **IMPLEMENT**: (a) in the BUILD_CHANGE listener (line 596), before the `source !== "questions"`
  bail-out, handle `detail.source === "restore"`: `answers = detail.answers; board =
  structuredClone(detail.board); edited = Boolean(detail.boardIsEdited); connectFrom = null;
  render();` and **do not publish** (the store already holds this board — publishing would bounce the
  event). Guard on `detail.board` being a well-formed `{places, connections}`; if it is missing, fall
  through to the redraft path. (b) issue #144 finding 13: `maxlength="60"` on both rename inputs
  (`renderChip`, `renderPlace`) and a matching cap in the model on adopt — one number, exported as
  `LABEL_MAX` so `build-share.mjs` validates against the same constant instead of a second literal.
- **PATTERN**: `share-state.mjs:38` (`NAME_MAX` exported so consumers can't drift).
- **GOTCHA**: `structuredClone` the incoming board — the store hands out a clone already
  (`readBuild()`), but the event detail is shared across listeners.
- **VALIDATE**: `node --check system/breadboard.mjs`; in the browser, dispatch a hand-built restore
  event and watch the board adopt without a redraft.
- **SATISFIES**: AC7

### CREATE `system/pattern-rules.mjs`

- **IMPLEMENT**: pure, DEFINITIONS-ONLY, commented the way `derive.rules.mjs` and
  `breadboard.mjs:86-96` are — a reader opens this file and sees every rule.
  - `export const PATTERNS` — the five, frozen: `dashboard`, `queue`, `feed`, `onboarding`,
    `settings`. Each `{ id, label, definition, inLibrary: boolean, needs: "<what components it would
    take>" }`. Slice 1: `inLibrary` true for `dashboard` and `queue` only.
  - `export function patternFor({ answers, board })` → `{ id, reason }`. The rules, in order:
    1. The `shape` answer names the candidate: `overview → dashboard`, `worklist → queue`,
       `stream → feed`, `steps → onboarding`.
    2. **The hub override**: a board whose entry place has ≥4 affordances, every one of them
       connected to another place, and whose other places have no affordances of their own, is a
       menu of destinations — `settings`. Unreachable from a draft (every drafted non-entry place
       carries its own affordance — `breadboard.mjs:62-74`), so this only fires on a board the
       visitor deliberately edited into a hub. Say that in the comment.
    3. An empty board (zero places, or one place with no affordances) names no pattern:
       return `{ id: null, reason: "…" }` — the honest empty state, no render.
    `reason` is a sentence quoting the rule that fired, rendered verbatim on the page.
  - `export function slotsFor(patternId, board)` — the slot derivations, and the honesty rule is that
    **every value is COUNTED from the board, never invented**:
    - `dashboard`: one tile per place, capped at 6 — `{ label: place.label, value:
      String(place.affordances.length), unit: place.affordances.length === 1 ? "affordance" :
      "affordances", tone: place.affordances.length === 0 ? "warn" : "neutral" }`. The warn tone is a
      real reading: a place with nothing to act on is a hole in the board, not a decoration.
    - `queue`: rows from the **busiest place** (most affordances; ties → the entry place, then
      document order), capped at 6 — `{ label: affordance.label, meta: "in " + place.label,
      value: <the label of the place this affordance connects to> ?? "acts here" }`.
    - unknown/out-of-library pattern ids return `null` (there is nothing to derive until slice 2
      gives them components).
  - `export const SLOT_MAX = 6` — mirrors `breadboard.mjs`'s `MAX_AFFORDANCES`/`MAX_PLACES`.
- **PATTERN**: `system/derive.rules.mjs` (a rules file that IS the documentation) and
  `breadboard.mjs:41-96` (rules as named consts + a numbered comment).
- **GOTCHA**: DEFINITIONS-ONLY means the rules define *what a shape is*, never "these tiles answer
  this question" — the same discipline `compose.json` computeRules are held to (CLAUDE.md). No
  `document` reference anywhere in this file.
- **VALIDATE**: `node -e "import('./system/pattern-rules.mjs').then(async r=>{const {draftBoard}=await import('./system/breadboard.mjs');const a={shape:'overview',action:'check',rewardType:'self',investment:'data',appetite:'small',nogos:'none'};console.log(r.patternFor({answers:a,board:draftBoard(a)}))})"`
  → `{ id: 'dashboard', … }`. Full three-set check lands in `tooling/build-checks.mjs` below.
- **SATISFIES**: AC6

### CREATE `system/pattern-render.mjs` (+ the `#act-pattern` section in `build.html`)

- **IMPLEMENT**:
  - `export function compose(patternId, slots)` — PURE. `dashboard` → `slots.map(s => ({ name:
    "metric-tile", props: s }))`; `queue` → `slots.map(s => ({ name: "list-row", props: s }))`;
    anything else → `null`. Returns the array `renderComposition` accepts.
  - the mount (self-booting on `[data-pattern-stage]`, DOM guard at the bottom): fetch
    `/handoff/verdant/vocabulary.json` once and lazily (the page must not pay for it before the
    reader reaches Act 4); `createBus()` from `action-bus.mjs`; subscribe to BUILD_CHANGE **and seed
    from `readBuild()` at mount** (both, per `breadboard.mjs:169-171` — this is what makes the share
    restore order-independent); re-render on every state change; render one of four states:
    1. **rendered** — `renderComposition(vocab, compose(id, slots), bus)` into the stage, under a
       caption naming the rule that fired (`reason`) and the honesty line: *"Every number on this
       stage is counted from your breadboard. No data is invented, and no model was called."*
    2. **not in the library yet** — the majority path in slice 1 (two of four `shape` answers reach
       it), so it is designed, not degraded: `PATTERNS[id].label` as a heading, its method-faithful
       definition, `needs` ("a feed needs a post component with an author, a timestamp and a body —
       this library has none yet"), the breadboard rendered beside it via `boardSvg(board)`, and a
       closing line in the register the rest of the page uses: *"The rules named your pattern. The
       library doesn't have its components yet, so nothing is rendered here — a mock-up would be the
       one dishonest thing on this page. Your breadboard is the artifact, and it downloads below."*
       Same card chrome, same accent rule, same weight as a rendered pattern.
    3. **empty board** — nothing to render, one sentence, a link back to Act 3.
    4. **refusal** — `renderComposition` threw. Render the Error message VERBATIM in a
       refusal card, the way `agentic-study.mjs` treats the boundary probe: the validator naming
       the offending path is the feature, not a bug to hide. Never fall back to hand-built DOM.
       Copy: *"The renderer refused this composition. That refusal is the guardrail working — it
       accepts only components from the generated vocabulary, and it names exactly what failed:"*
       + the message in a `<code>` block. Log it too, so a reviewer sees it without reading pixels.
  - `root.dataset.patternStage = "ready"` when settled (and after the vocabulary resolves).
  - The vocabulary 404 path: the honest capability sentence `agentic.html:249` uses — name the file
    and the generator, render nothing else.
  - `build.html`: a new `<section class="band" id="act-pattern">` after Act 3 with beat numeral 04,
    a lead that cites `system/pattern-rules.mjs` by link, the mount
    `<div data-pattern-stage data-build-stage>` (**both** attributes — `data-build-stage` is what
    build-import dresses), and no-JS fallback copy inside it. Add `data-build-stage` to the existing
    `#build-stage` too. Add `#act-pattern`/`#act-keep` to the `scroll-margin-top` rule (line 39).
    Page-unique CSS for the tile grid / row stack goes in build.html's own `<style>` block, token
    values only (`var(--…)`; grid tracks and % are the allowed structural literals — the block's
    header comment states the rule).
- **PATTERN**: `agentic-ui-study.html:221` (vocabulary fetch + failure copy), `agentic-study.mjs`
  (validate→render→refuse loop), `instance.mjs:289` (scoped token application).
- **GOTCHA**: `renderComposition` returns a DocumentFragment for an array — append it, don't stringify.
  A `metric-tile` `value` must be a **string**; `String(n)` at the rules boundary, or the validator
  refuses with `expected string, got number` (which would be a correct refusal for an incorrect
  composition — don't "fix" it by loosening the spec). Never emit `demo-notice`
  (`agentic-renderer.mjs:360` turns it into a drift error) or the three Verdant-locked components.
- **VALIDATE**: `npx serve .` → /build, accept all defaults → the dashboard renders `ds-metric-tile`s;
  change Act 2's shape to "A list to work through" → the queue renders `ds-list-row`s; choose "A
  stream of what is new" → the honest card. Zero console errors. Drop a token export → the pattern
  stage wears it too.
- **SATISFIES**: AC6

### CREATE `system/build-card.mjs`

This is the one task where "correct" is a design judgment rather than a check, so the geometry,
the colour roles and the text budgets are **pinned here** — the implementer tunes within them, and
does not invent a layout mid-flight. Run this task under the `portfolio-design` skill
(`references/CRAFT.md` before writing, `references/CHECKLIST.md` before committing).

- **IMPLEMENT**: PURE — returns SVG **strings**, no DOM (so it is Node-runnable and both the
  download and the on-screen render come from one source).

  **Shared frame (all three templates).** `viewBox="0 0 640 400"`, `xmlns` on the root,
  `role="img"` + a `<title>`/`<desc>` pair naming the pattern and the product shape (the card is
  content, not decoration). Layout, in absolute units so no measurement is needed:
  - canvas: `x=0 y=0 640×400`, filled `surface`; a 1px `border` rect inset by 0.5 for crispness;
    corner radius `12`.
  - caption band: the bottom `56px` (`y=344..400`), filled `surfaceSubtle`, holding
    **"Rendered from your build"** at `x=24 y=372` (13px, `fgMuted`) and the pattern label
    right-aligned at `x=616` (13px, `fg`, `text-anchor="end"`).
  - content area: `x=24..616`, `y=64..320`; the header line sits at `x=24 y=40` (18px, `fg`) and
    carries the entry place's label.
  - an accent rule: a `4×28` rect at `x=24 y=16`, filled `accent` — the one place brand colour is
    unmissable at thumbnail size.

  **`export function cardSvg({ patternId, slots, board, tokens })`**, three hand-authored bodies:
  - `dashboard` — a 3-column × 2-row tile grid inside the content area: tile `184×116`, gutters
    `20`, so columns start at `x = 24, 228, 432` and rows at `y = 64, 200`. Each tile: `surface`
    fill, 1px `border`, radius `8`; label at `+16,+30` (12px `fgMuted`, budget **22 chars**); value
    at `+16,+72` (32px `fg`); unit after it (12px `fgMuted`). A `warn`-tone slot swaps the tile's
    label colour to `accent` — one signal, no invented iconography. Six slots max; a seventh is
    impossible (`SLOT_MAX`).
  - `queue` — up to 5 rows stacked in the content area: row `592×44`, gutter `8`, first at `y=64`.
    Each row: `surfaceSubtle` fill, radius `8`; label at `+16` baseline-centred (14px `fg`, budget
    **34 chars**); `meta` right-aligned at `-120` (12px `fgMuted`, budget **18 chars**); `value`
    right-aligned at `-16` (13px `fg`, budget **20 chars**).
  - out-of-library (`feed`/`onboarding`/`settings`/`null`) — the **board miniature** is the body:
    `boardSvg(board, { width: 592, height: 256 })` emitted as a nested `<svg x="24" y="64">`, under a
    header line that reads "Your breadboard · <pattern label> is not in the library yet". The card
    still carries the caption band and the accent rule: it is the same designed object, showing the
    part that is real.

  **`export function boardSvg(board, { width = 640, height = 400 } = {})`** — the breadboard as a
  standalone laid-out SVG, computed from the model, never measured from the DOM (it must run in
  Node and open as a file):
  - columns: the entry place (`places[0]`) in a left column of width `38%`; every other place
    stacked in a right column, `height / (places.length - 1)` each, capped so a box is never shorter
    than `72`.
  - a place box: `surface` fill, 1px `border`, radius `8`, label at `+12,+24` (13px `fg`, budget
    **26 chars**); affordance chips beneath at `+12`, each `18px` tall with a `1px` `border` and
    radius `4`, label 11px `fgMuted`, budget **20 chars**, max 6 (`MAX_AFFORDANCES`).
  - a connection: a single-bend path from the chip's right edge to the target box's left edge
    (`M x1 y1 C x1+40 y1, x2-40 y2, x2 y2`), stroke `border`, `stroke-width="1.5"`, plus an `r=3`
    dot at the source — the same visual grammar as `breadboard.mjs:560-595`, without its DOM
    measurement.
  - an empty board renders the honest empty frame plus the text "No places yet", never a blank file.

  **Token resolution — `resolveTokens(tokens)`, private, and the security seam of this module.**
  Roles: `accent ← --color-accent`, `fg ← --color-fg`, `fgMuted ← --color-fg-muted`,
  `surface ← --color-surface`, `surfaceSubtle ← --color-surface-subtle`, `border ← --color-border`.
  Every incoming value is tested against `pack-imported.mjs`'s exported `VALUE_OK`-equivalent
  predicate **and** a stricter colour shape (`/^#[0-9a-f]{3,8}$/i` or
  `/^(rgb|hsl|oklch)a?\([a-z0-9 %.,\/-]{1,60}\)$/i`); anything else falls back to the neutral pack's
  committed literal. A token value reaches an SVG *attribute*, which is a different context from a
  custom property, so it gets its own narrower gate rather than reusing the stage's.
  - a private `esc()` escaping `& < > " '` on **every** string that reaches text content or an
    attribute, and a `clip(s, n)` that truncates to the budgets above with `…`.
- **PATTERN**: `system/system-graph.mjs` (SVG built from a generated model) and
  `breadboard.mjs:540-595` (the connection curve idiom); the fallback-on-unvettable-value argument
  is `pack-imported.mjs:44-62`.
- **GOTCHA**: a downloaded SVG needs `xmlns="http://www.w3.org/2000/svg"` on the root or it will not
  open standalone. SVG text does not wrap — the character budgets above are not advisory. No
  external font: `font-family="system-ui, -apple-system, Segoe UI, sans-serif"` inline, because a
  downloaded file cannot reach the page's stylesheet. Do not emit `<style>` inside the SVG; put
  presentation on attributes so the file survives being embedded anywhere.
- **VALIDATE**: covered mechanically by `tooling/build-checks.mjs` group 6 (below): every template
  parses as XML, contains no unescaped `&`/`<`, and contains zero token values that failed the
  colour gate. Then the human check —
  `node -e "import('./system/build-card.mjs').then(async m=>{const {draftBoard}=await import('./system/breadboard.mjs');require('fs').writeFileSync('/tmp/board.svg',m.boardSvg(draftBoard({})))})"`
  and open `/tmp/board.svg` in a real browser: it renders standalone, nothing overflows, and the
  labels are legible at 25% zoom (the thumbnail case).
- **SATISFIES**: AC8

### CREATE `system/build-share.mjs`

- **IMPLEMENT**: no DOM, no storage — but NOT dependency-free, and that is a decision this file must
  argue in its header. `system/share-state.mjs:36-38` refuses to import `pack-derived.mjs` because
  that would "pull a self-booting DOM module into a pure codec, which is the one thing this module
  is for not doing". This codec **does** import `QUESTIONS`/`DEFAULT_ANSWERS` from
  `build-questions.mjs` and the label/place/affordance caps from `breadboard.mjs`, because
  hand-mirroring ten questions' option lists is a drift bug with a certainty a shared import does
  not have. The discriminator to write into the header: `share-state.mjs` has to be importable from
  pages that carry no builder, so it mirrors by hand and says so; this codec ships on exactly one
  page whose modules are already loaded, and both imports are Node-import-safe by construction
  (DOM refs inside function bodies, self-boot behind a `typeof document` guard). Nothing here
  touches the DOM itself.
  - `export const SHARE_PARAM = "b"`, `export const MAX_PARAM_CHARS = 8000`,
    `MAX_DECODED_BYTES = 32 * 1024`.
  - **The payload carries no pattern id.** The pattern is recomputed by `patternFor()` from the
    restored answers and board — the same argument that keeps the quadrant out of the URL: a link
    must not be able to claim a pattern its own board does not produce. The ticket's "enum pattern
    ids" validation clause is satisfied by the recompute rule, and the plan says so rather than
    validating a field that isn't there.
  - **the wire shape — pinned, so encode and decode cannot drift:**

    | key | holds | validated on decode as |
    |-----|-------|------------------------|
    | `v` | format version, `1` | `=== 1`, else reject whole |
    | `a` | answers, `{ <questionId>: <optionValue> }` | every key is a `QUESTIONS` id (`Object.hasOwn`), every value is one of that question's `options[].value`; **every question present** |
    | `b.p` | places, `[[id, label, [[affId, affLabel], …]], …]` | ids `/^p[0-9]{1,2}$/` and `/^p[0-9]{1,2}a[0-9]{1,2}$/`, unique; labels strings `1..LABEL_MAX`; ≤ `MAX_PLACES` places, ≤ `MAX_AFFORDANCES` affordances each |
    | `b.c` | connections, `[[affId, placeId], …]` | both ids exist in `b.p`; no affordance appears twice; an affordance never targets its own place |
    | `e` | board-was-edited, `0 \| 1` | `=== 0 \|\| === 1` |
    | `k` | token map, `{ "--color-accent": "#…", … }` | `vetTokens(k)` returns **zero** `rejected`, ≤ 80 keys; a non-empty `rejected` rejects the whole payload (a link whose values were partly dropped is not the build that was shared) |
    | `s` | pack slug, for the tokens.css filename | `/^[a-z0-9-]{1,40}$/`, or absent |

    Positional arrays for places/affordances rather than objects: it is the difference between ~600 B
    and ~1.1 KB on the board alone, and the shape is fixed by this table.
  - `export async function encodeBuild(state)` — compact per the table above,
    `JSON.stringify` → `TextEncoder` → **`CompressionStream("deflate-raw")` when available**, else
    the raw bytes → base64url. **A one-byte format flag leads the payload** (`0x00` uncompressed,
    `0x01` deflate-raw) so the decoder never guesses which branch produced a link — a Safari 16.3
    sender and a Chrome receiver have to interoperate. Feature-detect, never assume.
  - `export async function decodeBuild(param)` — the untrusted path, and the rules are absolute:
    1. reject on length > `MAX_PARAM_CHARS` before any work; 2. base64url → bytes → decompress (guard
    the decompressed size against `MAX_DECODED_BYTES`) → `JSON.parse` in a try/catch; 3. **hand-validate
    every field**: `v === 1`; every answer id is a known `QUESTIONS` id and its value is one of that
    question's `options` values; every place/affordance id matches `/^p[0-9]{1,2}(a[0-9]{1,2})?$/`;
    every label is a string ≤ `LABEL_MAX` (imported from `breadboard.mjs`, not re-literalled); place
    count ≤ `MAX_PLACES` and affordances per place ≤ `MAX_AFFORDANCES` (both module-private today —
    export them alongside `LABEL_MAX` rather than re-literalling 6); every connection is a `[affordanceId, placeId]` pair
    whose ids both exist in the payload; the token map passes `vetTokens` **and its key count is ≤
    80** with nothing rejected; the slug matches `/^[a-z0-9-]{1,40}$/`. 4. **Any** failure → return
    `null` plus a `reason` string. Never partially apply.
  - `export function shareUrl(base, encoded)` — builds the `?b=` URL preserving other params and the
    hash.
  - Header comment must state the divergence from `share-state.mjs` explicitly (see NOTES).
- **PATTERN**: `system/share-state.mjs` (the voice, the boundary discipline, the exported caps) and
  `pack-imported.mjs:64-88` (`vetTokens` as the one allowlist).
- **GOTCHA**: `btoa` throws on non-Latin-1 — base64 the **bytes**, not the string.
  `CompressionStream` exists in Node ≥ 18 and Safari ≥ 16.4; the fallback branch must be reachable
  and tested (force it with a flag arg in the unit run). `structuredClone` the decoded object before
  handing it to `restoreBuild`. A decoded object is a plain JSON object — use `Object.hasOwn` for
  every lookup so a `__proto__`/`constructor` key cannot resolve up the chain
  (`agentic-renderer.mjs:44` makes exactly this argument).
- **VALIDATE**: the round-trip and tamper battery in `tooling/build-checks.mjs` below.
- **SATISFIES**: AC7

### CREATE `system/build-keep.mjs` + MOVE the keep rail in `build.html`

- **IMPLEMENT**:
  - `build.html`: a new final `<section class="band" id="act-keep">` (beat numeral 05, kicker "Keep")
    holding the rail in **two rows with one owner each**:
    - *your design* — `[data-build-keep-actions]` + `[data-build-keep-empty]` **moved verbatim** from
      Act 0 (build-import queries both by attribute on `document`, so moving the nodes needs no JS
      change). **Rescope the empty copy to the design row only** — something like "No design
      imported yet. Import one in Act 0 and the stylesheet it produces appears here." It must NOT
      say "nothing to keep yet", because `build-import.clearKeep()` fires on a rejected `.txt` drop,
      on *Derive a palette* and on *Clear the stage*, and would then render "nothing to keep" *above*
      four live build downloads. (That is finding 12's bug class — a true sentence about one thing
      read as a claim about everything.)
    - *your build* — `[data-keep-card]`, `[data-keep-artifacts]`, `[data-keep-share]`,
      `[data-keep-provenance]`, and build-keep's OWN `[data-keep-empty]` for the case where the board
      is empty and there is no pattern. One node, one owner, in both directions.
    **Structural, not sticky** (memory). Delete the "What is still missing" note at
    build.html:651-655 and replace it with the link into Act 4.
  - `system/build-keep.mjs`: subscribe to BUILD_CHANGE; render the card (`cardSvg` → an
    `<img src="data:image/svg+xml,…">` or an inline-parsed SVG — inline via
    `DOMParser.parseFromString(svg, "image/svg+xml")` is preferred so it inherits nothing and injects
    nothing) and four download buttons:
    - `breadboard.json` — `JSON.stringify(board, null, 2)`
    - `breadboard.svg` — `boardSvg(board)`
    - `build-card.svg` — `cardSvg(state)`
    - `pattern-spec.md` — assembled client-side. **Structure pinned here (closes epic Q1): a
      mini-handoff, mirroring `system/specs/*.md`'s head → prose order rather than cloning
      `handoff-viewer`'s three projections**, because the visitor has one component set and no
      generated pack to project:

      ```markdown
      # <Pattern label> — a pattern spec built on <site name>
      Built <ISO date> in a browser, from ten answers and a breadboard. No model was called.

      ## The product, in the two methods
      | Term | Answer |            ← every QUESTIONS entry via the exported SUMMARY_TERM map
      ## The two ethics gates
      Manipulation Matrix: <quadrant> — <meaning, verbatim>
      Frequency filter: <RULESET verdict string, verbatim>
      ## Appetite
      <small|big batch, with Shape Up's definition>
      ## The breadboard
      - <Place>            ← nested list; affordances as sub-items, "→ <target place>" where connected
      ## The pattern
      <id> — named by this rule: <the `reason` string, verbatim>
      ## Components used
      - `metric-tile` × N — props: label, value, unit, tone   ← exact prop names, from the composition
      ## Tokens
      <the token map as a CSS block, or "No design imported — this used the site's neutral pack.">
      ## Provenance
      <what generated it · that it ran locally · that no file was uploaded · that the COMPONENTS are
       this site's system and the TOKEN VALUES are the visitor's, and the two are not the same claim>
      ```

      Every value comes from the state; nothing in it is a hand-written number.
    - the download mechanic is `build-import.mjs:315-326` verbatim (Blob → objectURL → click →
      `setTimeout(revoke, 0)`).
  - **the share control**: a "Copy the link that rebuilds this" button → `await encodeBuild(...)` →
    `history.replaceState(null, "", shareUrl(...))` → `navigator.clipboard.writeText` with a
    non-clipboard fallback (a readonly input the reader can select — clipboard is permissioned).
    Debounce the `replaceState` on BUILD_CHANGE (the breadboard fires per keystroke on rename).
  - **the boot restore**: on load, read `?b=`; if present, `await decodeBuild(...)`; on success call
    `restoreBuild(...)` and render the provenance line *"Built from a shared link — nothing was
    stored anywhere; your browser rebuilt it from the URL."*; on failure clear `?b=` with
    `replaceState`, leave the builder in its clean default state, and say once: *"That shared link
    could not be read, so this is a fresh builder."* (+ the reason).
  - `root.dataset.buildKeep = "ready"`.
  - Script tag last in `build.html` (after `breadboard.mjs` and `pattern-render.mjs`) so every mount
    exists before the restore publishes.
- **PATTERN**: `build-import.mjs`'s keep block (offer/clear/download) and mount-tail discipline.
- **GOTCHA**: the restore publishes exactly **once**, and it must be safe whenever it lands — every
  consumer seeds from `readBuild()` at its own mount as well as listening, so the last-script-tag
  position is a courtesy to the reader, not a correctness dependency (prove it: move this tag to the
  top of the module block once, re-run the restore journey, put it back). Do not `await` the
  vocabulary here. `history.replaceState` on a `file://` page throws — the headless check must serve
  over HTTP. The `?b=` scrub on a bad payload uses `replaceState` too, so a reader who reloads after
  a failed link does not hit the same failure twice.
- **SATISFIES**: AC7, AC8

### UPDATE `system/dock.mjs` — the disclosure must not eat the query string

- **IMPLEMENT**: `stripHash()` (line 443) becomes
  `history.pushState(null, "", location.pathname + location.search)`. One line, one comment naming
  why (a shared `?b=` link, and home's `?brand=` share params, must survive opening and closing the
  appearance panel).
- **PATTERN**: the existing comment's reasoning stays true — pushState is still what avoids the
  scroll-jump and the bare `#`.
- **GOTCHA**: this is a live bug on `index.html` too (share-state's params), so verify home as well.
  No visual change at rest ⇒ no baseline churn from this edit.
- **VALIDATE**: headless: load `/build.html?b=<valid>`, open `#appearance`, close it, assert
  `location.search` still carries `b`. Same on `/index.html?brand=2563eb`.
- **SATISFIES**: AC7

### CREATE `tooling/build-checks.mjs` — the committed unit runs

- **IMPLEMENT**: a zero-dep Node script, `node tooling/build-checks.mjs`, printing one `✓` line per
  group and exiting 1 on any failure (the `tooling/validate-trace.mjs` shape):
  1. **pattern ids** — three canned answer sets → expected ids: all-defaults (`overview` →
     `dashboard`), `shape: "worklist"` → `queue`, `shape: "stream"` → `feed` with `inLibrary ===
     false`; plus a hand-built hub board → `settings`, and an empty board → `id === null`.
  2. **slots** — the dashboard tile count equals the place count (capped at 6); the queue rows come
     from the busiest place and their `value` names the connected place or `"acts here"`; every
     `value` is a string.
  3. **composition validity** — `validateComposition(vocab, compose(id, slots))` passes for both
     in-library patterns, reading the REAL `handoff/verdant/vocabulary.json` from disk. This is the
     check that catches a vocabulary regeneration breaking the builder.
  4. **codec round-trip** — encode → decode deep-equals the input state, both with and without the
     compression branch.
  5. **tamper battery** — each must return `null`: a bad token key/value (`--color-accent:
     "url(javascript:x)"`, `--evil: "red"`), a 10 000-character label, 7 places, 7 affordances on one
     place, an answer value outside its question's options, an unknown answer id, a connection naming
     a missing affordance, a malformed place id, a truncated base64 payload, a payload over
     `MAX_PARAM_CHARS`, a decompressed payload over `MAX_DECODED_BYTES`, `{"__proto__":{"x":1}}`
     smuggled in the token map, and `v: 2`. (No "unknown pattern id" case — the payload carries no
     pattern id; assert instead that a restored state recomputes to the same pattern the sender saw.)
  6. **SVG well-formedness** — for both in-library patterns, the out-of-library card and
     `boardSvg`: the string starts with `<svg` carrying `xmlns`, parses without error (Node has no
     `DOMParser`; use a minimal tag/entity check plus a balanced-element scan — this catches the
     realistic failure, an unescaped `&` or `<` from a visitor label), contains no `<style`, and
     contains no substring from a hostile-token fixture (`</svg><script>`, `" onload="x`,
     `javascript:`) when those values are fed in as the token map. **Cover the label path too**: a
     label of `"</text><script>alert(1)</script>"` must appear escaped, once, as text.
  7. **the vetting invariant** — read `system/build-import.mjs` as text and assert
     `setProperty` occurs exactly once. Crude on purpose: it is the cheapest possible guard on the
     "one application point" invariant, and it fails loudly the day someone adds a second.
- **PATTERN**: `tooling/validate-trace.mjs` (a committed gate script, zero-dep, one ✓ line).
- **GOTCHA**: import the shipped modules directly (they are Node-import-safe by design — that is
  why). If any import pulls `document`, the module has a bug: fix the module, not the test.
- **VALIDATE**: `node tooling/build-checks.mjs` → all groups ✓, exit 0.
- **SATISFIES**: AC6, AC7

### UPDATE the gates — loc-summary, approach baselines, drift

**The churn is measured, not assumed.** `approach.html:237-247` renders `runtime.files` and
`runtime.linesApprox` verbatim. Today `system/loc-summary.json` reads `runtime: { files: 51,
linesApprox: 15300 }`. This slice adds **five** tracked `system/*.mjs` files (`tooling/build-checks.mjs`
is in `tooling/` and matches no group), so `files` becomes **56** and `linesApprox` lands near
**16400–16500**. Both numbers are rendered on approach.html ⇒ **both approach baselines will churn,
with certainty.** Budget the Docker run into this ticket; it is not a maybe.

- **IMPLEMENT**: `git add` every new/changed file **first** (memory: `gen-loc-summary` reads the git
  INDEX, so an unstaged file makes `--check` lie — and it reads *edits* too, not just new files),
  then `node agent-layer/gen-loc-summary.mjs`, then confirm the diff shows `files: 51 → 56` and a
  moved `linesApprox` before spending a Docker run. Then regenerate the two approach baselines:
  `cd tooling/visual-regression && npm ci && npm run update:docker`. If a baseline refuses to
  rewrite because the diff is sub-perceptual, `rm` the PNG and re-run (memory:
  vr-update-skips-subperceptual). /build itself gets no baseline here — that is slice 1d (#138).
- **GOTCHA**: only the two `approach-*` PNGs should change. Any other baseline moving means an
  unintended visual change — investigate, don't accept. Re-run `node tooling/drift-check.mjs` only
  on a clean tree (memory: drift-check mid-merge false positive). approach's shots are the known
  flaky pair (live `countUp` rAF vs `retries: 0`) — a "two consecutive stable screenshots" failure
  on a *different* pack each run is the flake, not a regression; `gh pr checks` is the arbiter
  (memory: vr-gate-approach-countUp-flake).
- **IF DOCKER IS UNAVAILABLE**: commit the regenerated `loc-summary.json` (it is the blocking gate —
  `drift-check` fails CI without it) and **stop**. Do not hand-edit a PNG, do not skip the JSON to
  keep the baselines matching, and do not merge with the visual job red. Say plainly in the report
  and the PR body that the two approach baselines are outstanding and why, and either finish the run
  when Docker is back or hand that single step to #138 with an explicit note on the ticket. A knowingly
  red gate that is named is recoverable; a silently red one costs the next session a debugging pass.
- **VALIDATE**: `node tooling/drift-check.mjs` ✓ · `node tooling/token-lint.mjs` ✓ ·
  `node agent-layer/gen-loc-summary.mjs --check` ✓ · `git status --short` shows only the intended
  files.
- **SATISFIES**: the blocking gate below (epic AC10, partial — the full sweep is #138's)

### RUN the headless full journey

- **IMPLEMENT**: a scratch script (NOT committed — `tooling/build-checks.mjs` is the committed gate)
  under the session scratchpad, driving Chromium via the Playwright already resolvable at
  `~/node_modules` (memory: headless-render notes): serve with `python3 -m http.server 8899` (it
  serves `.mjs` as `text/javascript`, which module imports require), then: load /build → assert the
  five `data-*="ready"` handles → dashboard renders → switch shape to worklist → queue renders →
  switch to stream → honest card → edit the board (rename + add) → the stage re-renders → copy link
  → open the URL in a **fresh context** → assert the serialised state deep-equals → open and close
  `#appearance` → `?b=` still present → each of the four downloads produces a non-empty Blob.

  Three further assertions, which exist to prove the mitigations rather than the feature:
  - **tamper → zero styles.** Load `/build.html?b=<payload carrying "--color-accent":"red;x{y:z}">`;
    assert the clean-builder message appears AND
    `document.getElementById('build-stage').style.length === 0`. The refusal must be visible *and*
    nothing may have reached the DOM.
  - **order independence.** Temporarily move `build-keep.mjs`'s script tag to the TOP of the module
    block, re-run the share round-trip, assert it still passes, then restore the tag. This is the
    point of the seed-at-mount design; if it fails, the design has regressed to positional luck.
  - **hostile label.** Rename a place to `</text><script>alert(1)</script>`, download
    `breadboard.svg`, assert the Blob's text contains no `<script` and exactly one escaped occurrence.
- **GOTCHA**: a static-served /build logs `ERR_CONNECTION_REFUSED` for the absent Worker on some
  pages — on /build there is no Worker call, so console errors here are real (memory:
  headless-render-data-pages-worker-refused).
- **VALIDATE**: the script exits 0 and prints each assertion.
- **SATISFIES**: AC6, AC7, AC8

### FINISH — plan, report, review, PR

- **IMPLEMENT**: commit this plan, write `.claude/reports/<name>.md`, run `/piv-review-changes` (or
  the code-reviewer agent) and commit `.claude/code-reviews/pr-<N>-review.md` **in the same PR**
  (CLAUDE.md: four artifacts were nearly lost to `git worktree remove`). PR body carries
  `Closes #137` as a trailer — a title mentioning `(#137)` closes nothing (memory:
  prs-dont-auto-close-tickets). Comment on #144 that finding 13 landed here.
- **VALIDATE**: `gh pr view --json body` shows the trailer.
- **SATISFIES**: epic hygiene AC11

---

## TESTING STRATEGY

No suite exists (CLAUDE.md). "Done" = run the surface you touched, plus the two committed gates.

### Unit (Node, committed)

`tooling/build-checks.mjs` — pattern ids, slot derivations, composition validity against the real
vocabulary, codec round-trip both branches, the tamper battery. This is the ticket's named gate.

### Integration (headless, scratch)

The full-journey Chromium script above. Firefox/WebKit are slice 1d's cross-engine pass — but run
**WebKit once on the codec** if it is cheap, because Safari's `CompressionStream` support is the one
feature-detect that matters.

### Edge cases that must be covered

- Accept-all-defaults speedrun: a dashboard renders with no interaction beyond scrolling.
- Board emptied to zero places → honest empty state, no render, no thrown error.
- Board edited into a hub → `settings` → the honest card (proves the override fires).
- No import: the pattern stage renders on the neutral pack and the spec/card say "no design imported".
- Import → render → clear the stage: the pattern survives, the tokens come off both stages.
- A shared link opened with JS modules blocked: the page shows its no-JS copy, nothing half-built.
- Tampered `?b=`: clean empty builder + one message; the URL is scrubbed.
- Dock opened mid-flow: state survives, `?b=` survives.
- A 10 000-character pasted label: capped at the input, capped again at the codec.
- Reduced motion: nothing on the new sections animates on rebuild.

## VALIDATION COMMANDS

- **L1 syntax/style**: `node --check` on each new/changed `.mjs` · `node tooling/token-lint.mjs`
- **L2 unit**: `node tooling/build-checks.mjs`
- **L3 generated-artifact drift**: `git add -A <paths>` then `node agent-layer/gen-loc-summary.mjs`
  · `node agent-layer/gen-loc-summary.mjs --check` · `node tooling/drift-check.mjs`
- **L4 manual/headless**: `python3 -m http.server 8899` + the full-journey script; eyeball /build at
  1440 and 720 under neutral, saulera, and an imported pack
- **L5 visual**: `cd tooling/visual-regression && npm run update:docker` → only `approach-neutral.png`
  and `approach-saulera.png` change; then `npx playwright test` green

## ACCEPTANCE CRITERIA

- [ ] **AC6** Dashboard and queue render through the EXISTING vocabulary-validated
      `renderComposition` from committed DEFINITIONS-ONLY rules in `system/pattern-rules.mjs`; the
      three out-of-library patterns get a designed card with the breadboard front and centre, never
      a fake render; a composition the validator refuses shows the refusal verbatim.
- [ ] **AC7** The share link rebuilds answers, board, edited flag, pattern and the full token values
      in a fresh browser with zero server involvement; every field is hand-validated on decode and
      any invalid field rejects the whole payload to a clean builder with a message; the dock's
      disclosure no longer strips the query string.
- [ ] **AC8** The keep rail hands back: the SVG build card ("Rendered from your build"),
      `breadboard.json`, `breadboard.svg`, `build-card.svg`, `pattern-spec.md`, and Act 0's
      `tokens.<slug>.css` — all client-generated, nothing uploaded, nothing stored.
- [ ] **BLOCKING GATE (not an epic AC — the epic's AC9 is slice 1d's "links in", and its AC10 is the
      full gate sweep)** `drift-check`, `token-lint` and `loc-summary --check` green;
      `system/loc-summary.json` and the two approach baselines regenerated in this PR; no other
      baseline churned. Cite it as "AC10, partial" if a PR body needs a label.
- [ ] No new component spec was needed (`list-row` + `metric-tile` carry both patterns), OR — if one
      genuinely was — it shipped spec-first with `gen-handoff` + `gen-vocabulary` + `gen-pack-bundle`
      regenerated in the same commit and drift-check green.
- [ ] Issue #144 finding 13 (rename `maxlength`) closed here; findings 7/8/9/10/12 explicitly left
      to #138.
- [ ] Every new module has a header citing this plan and is Node-import-safe.
- [ ] `Closes #137` in the PR body; plan + report + review committed in the same PR.

## COMPLETION CHECKLIST

- [ ] Phase 1 seam verified before any new module was written (the page behaved identically, both
      wizards and the verdict panel still render on first paint under the new import order)
- [ ] Each task validated immediately; the committed unit gate passes (all 7 groups)
- [ ] Headless full journey green on Chromium, including the fresh-context share round-trip
- [ ] The three mitigation assertions pass: tamper → zero styles · order independence (tag moved and
      restored) · hostile label escaped in the downloaded SVG
- [ ] `grep -n "setProperty" system/build-import.mjs` returns exactly one line
- [ ] `loc-summary.json` shows `runtime.files 51 → 56`; only `approach-*` baselines moved
- [ ] CLAUDE.md map entry deliberately NOT added here (slice 1d owns it) — or added if 1d slips
- [ ] Plan, report and review all committed in this PR

## OPEN QUESTIONS / ASSUMPTIONS

- **A1 — no new spec.** `list-row` carries a queue row and `metric-tile` a dashboard tile, both `ds-`
  cross-scenario primitives. This resolves the epic's open question Q3 with the vocabulary in hand
  and avoids the handoff-regeneration cascade. If implementation finds a genuine gap, the rule is
  spec-first + regenerate all three artifacts in the same commit — never bypass the renderer.
- **A2 — tile values are counted, not invented.** A dashboard tile shows the place's affordance
  count, and the stage says so. The alternative (an em-dash placeholder) is in NOTES; if the counted
  version reads as meta rather than as a dashboard during the eyeball pass, switch and say why in
  the report.
- **A3 — the share payload carries token VALUES**, unlike `share-state.mjs`, which deliberately
  carries inputs only. An imported export cannot be re-run from a URL (the file is not in it), so
  values must travel. Every value is re-validated through the SAME `vetTokens` allowlist the drop
  path uses, at the point of application — that is the honest form of the same argument. The module
  header must state this divergence; a reviewer who knows `share-state.mjs` will look for it.
- **A4 — the keep rail moves to its own final section**, taking Act 0's `[data-build-keep-actions]`
  node with it. build-import queries it on `document`, so no JS change. Act 0's copy is updated.
- **A5 — five modules, not four.** The ticket names four; splitting the DOM shell (`build-keep.mjs`)
  from the pure builders (`build-card.mjs`, `build-share.mjs`) is what makes the ticket's own
  `node -e` unit gate possible. Total lines stay inside the ticket's ~1000–1400 estimate.
- **Q1 — `pattern-spec.md` format: closed.** A mini-handoff mirroring `system/specs/*.md`'s head →
  prose order, NOT a clone of `handoff-viewer`'s three projections (the visitor has one component set
  and no generated pack to project). The full skeleton is pinned in the build-keep task; deviating
  from it is a plan amendment, not an implementation choice.
- **Q2 — branch base: resolved.** PR #143 merged 2026-07-26T20:50Z and `origin/main` is at `3a2a8d3`
  (that merge). Branch `feature/build-pattern-render-137` from `origin/main`. The five dirty HTML
  files in the shared worktree (em-dash copy edits) belong to another session — leave them alone.
  `CompressionStream` is present on the local Node (v20.20.2), so the unit gate can exercise both
  codec branches.

## NOTES (open canvas)

**Why the render path is the agentic renderer, restated for this slice.** The epic weighed bespoke
pattern DOM and web-component wrappers and chose the renderer because the deterministic mapper then
emits the *same composition format* the real build-time agent runs emit, validated by the *same*
generated vocabulary. That is the whole honesty argument of the page, and it has a concrete
consequence you will feel: when the composition does not validate, the correct behaviour is to show
the refusal, not to route around it. If a pattern needs a prop the spec does not have, the spec is
what changes.

**The state graph after this slice.** One event, one store, five publishers/consumers:

```
build-import ──publish(pack)──┐                       ┌──▶ build-import (dresses every [data-build-stage])
build-questions ─publish(answers)─▶  BUILD_CHANGE  ───┼──▶ breadboard   (redraft, or adopt on restore)
breadboard ────publish(board)──┘      state           ├──▶ pattern-render (rules → compose → render)
build-keep ────restoreBuild(all)──────────────────────┴──▶ build-keep   (card · downloads · ?b=)
```

Three named write paths, and they stay distinguishable: `setAnswers` (answers only), `publishBuild`
(everything but answers — it throws on an answers patch), `restoreBuild` (all of it, once, from a
validated payload). Adding the fourth would be the smell.

**Why `settings` is a board signature rather than an answer.** Four `shape` options name four
patterns; the fifth pattern has no question that produces it. Rather than bending an answer into it,
the rule reads the board: an entry place with ≥4 outgoing affordances and no affordances anywhere
else is a menu of destinations. It cannot fire on a drafted board (every drafted non-entry place
carries its own affordance, `breadboard.mjs:62-74`), so it only ever describes a board the visitor
deliberately shaped that way — which is the right relationship between an editable artifact and a
rule that reads it.

**The tile-value question, weighed.** (a) counted from the board — real, derivable, slightly meta;
(b) `"—"` placeholders — unimpeachable but empty; (c) plausible synthetic numbers — **excluded
outright**, that is invented data on the one page that promises none. (a) wins with an explicit
caption, and the `warn` tone on a zero-affordance place turns the honesty constraint into a genuine
design reading: your board has a place with nothing to do in it.

**Share-URL budget** (epic NOTES): ~64 token values (~800 B) + 10 answers (~100 B) + a 6×6 board
(~600 B) ≈ 1.6 KB raw → ~1.1 KB deflated + base64url. Comfortably inside every practical URL limit;
`MAX_PARAM_CHARS = 8000` is the refusal ceiling, not the target.

**Why restore ordering stopped being a risk.** The first draft of this plan guaranteed
"all mounts exist before the restore publishes" with a script-tag position — true, and fragile: it
would break the day someone reorders the tags or adds a sixth module. It is now guaranteed
*structurally* instead. Every consumer **seeds from `readBuild()` at its own mount** and **listens
for BUILD_CHANGE**, so a consumer that mounts before the restore hears the event, and one that
mounts after reads the state. `breadboard.mjs:169-171` already works this way and says why. The
script-tag position stays as a comment for the reader, but nothing depends on it any more — which
means the headless check can assert the invariant directly: **move `build-keep.mjs`'s tag to the
top of the module block, run the restore journey, and it must still pass.** Do that once during
implementation, then put the tag back.

**Risk register** — what remains after the mitigations above.

| # | Risk | Mitigation | Residual |
|---|------|-----------|----------|
| 1 | A decoded token map reaching `style.setProperty` unvalidated — the page's only injection path | `vetTokens` enforced **inside** `applyToStage` (choke point, not call sites); the 13-case tamper battery; check 7 asserts `setProperty` appears exactly once in the module | Low — an attack needs a value that passes `VALUE_OK` (no `:` `;` `{` `}` `<` `>` `"` `'` `\` `*` `&`) inside a custom property, which cannot break its own declaration |
| 2 | An SVG built from visitor labels + third-party token values | one `esc()` on every string, a narrower colour gate for attribute context, budgets that make overflow impossible, and check 6's hostile-label + hostile-token fixtures | Low |
| 3 | Restore arriving before/after a mount | seed-at-mount + listen, both; asserted by reordering the script tag once | **Eliminated** |
| 4 | approach baselines churn | measured, not assumed: `files 51 → 56` is certain; Docker run budgeted; named fallback if Docker is down | Low — cost, not correctness |
| 5 | The out-of-library card reads as unfinished | copy and layout pinned in the task; same card chrome as a rendered pattern; run under `portfolio-design` | Medium — the one judgment call left, and the eyeball pass is where it is caught |
| 6 | Label caps disagree between UI, model and URL | one exported `LABEL_MAX`, imported in all three places; no re-literalling | Low |
| 7 | A vocabulary regeneration silently breaks the builder | check 3 validates both compositions against the real `handoff/verdant/vocabulary.json` on every run of the committed gate | Low |

**Confidence for one-pass implementation: 9.5/10.** What moved it from 9: the SVG templates are
pinned to absolute geometry, colour roles and character budgets (they were the one "design it at
implement time" hole); `pattern-spec.md` and the out-of-library card's copy are written rather than
described; the codec's wire shape is a table both sides read from; restore ordering is structural
instead of positional; and the baseline churn is a measured `51 → 56` rather than a maybe. The
remaining half point is risk 5 — whether the out-of-library card *feels* like craft is a judgment
only the eyeball pass can settle, and two of four answer paths land there.

## AMENDMENTS

- (none yet)
