# Architecture — Prototype Studio

Intent: [prototype-studio.prd.md](./prototype-studio.prd.md)
Platform decisions this builds on: [ai-first-ux-factory.architecture.md](./ai-first-ux-factory.architecture.md)

Decided 2026-08-03, interactively with the PRD holder. Grounded in a read of the /build chain
(~4.7k lines across 8 modules), the trace/composition substrate, the docs generation chain, epic
\#164's landed state, and the gate tooling. High-level decisions only — per-ticket implementation
plans come later.

## Problem & goals

An evaluator must *experience* "brief in, product out, by a real method" instead of reading about
it: one studio canvas where a replayed real agent run assembles the product, the visitor takes over
with prototype-tool affordances, and they leave with the artifact. Every decision below is judged
against that, under the standing hard constraints: vanilla shipped pages, no live LLM calls at view
time, the honesty contract, repo-as-inspectable-proof, and the full gate rigor riding along.

## Approaches considered

| | Approach | Trade-off | Verdict |
|---|---|---|---|
| A | **Absorb-and-arrange** — one canvas *surface* over the data layer /build already owns: same answer store, same board, same rules, same codec; the canvas is a new renderer, the replay a new driver | Most moving parts touch shipped code; but one source of truth, /build's form fallback stays honest for free, and every existing gate keeps guarding the shared layer | **Chosen** |
| B | **Parallel studio app** — the studio gets its own state model and grammar; /build migrates later | Clean slate for the canvas, but duplicates store/rules/codec into a second truth that drifts, and "/build survives as the form-mode fallback *over the same build data*" (PRD §1) stops being structurally guaranteed | Rejected |
| C | **Guided theater** — a chrome layer that sequences the existing exhibits and pages into one tour | Cheapest; but the visitor still watches rather than does — it restates the current site's failure mode with better transitions | Rejected |

## Recommended approach

The studio is a new render surface and a replay driver over the existing data layer — not a new
app. `/factory` — reserved from day one as the deep-linkable flagship — becomes the studio route;
its current exhibits become chapters and inspector panels of the one surface, and /build survives
as the form fallback because both import the same answer store and speak `BUILD_CHANGE`.

**One board stays the single source of truth.** A 2–4-screen flow is a *projection* of it: places
become screens, affordances become the components on them, connections become the navigation —
exactly the PRD's compile language, made structural. The compile beat is the already-committed pure
pipeline (`draftBoard` → `patternFor`/`slotsFor` → `compose` → `renderComposition`) performed
stepwise on stage. Most canvas gestures are existing board mutations wearing new clothes: reorder
within a screen = affordance order (already codec-encoded), move across screens = the re-point
verb, connect = the connect verb. Only *place position on the canvas* is new persisted data.

**The replay layer is re-recorded, not derived.** A fenced recorder (sibling of
`record-composition.mjs`) has the agent genuinely build the board through separate tool calls, so
the trace's steps *are* the build ops. A drift-checked generator projects each validated trace pair
into a small committed replay artifact the canvas plays over the action bus's reserved-but-unused
`agent.*` half, at the run's real pacing, with its real narration and real refusal beats. The
visitor grabs the wheel mid-replay; their verbs emit `ui.*` on the same bus.

## Key decisions

### Stack & libraries
- **Hand-written vanilla canvas — no library.** (interact.js / panzoom / off-the-shelf canvas kits
  rejected: runtime deps are a standing no-go, and "a prototype-tool surface in vanilla JS" is
  itself pitch material per the PRD.) Every 2-D affordance — drag, marquee, guides, undo, context
  menu — is honest greenfield; the repo's seeds are the `scrub.mjs` pointer idiom (pointer capture,
  rAF throttle, ARIA, AbortController teardown) and #173's drafted pan/zoom design.
- **DOM stage, not SVG or `<canvas>`.** Placed components stay real token-skinned DOM, so the token
  contract, inspect bubbles, and focus order keep working by construction. Pan rides a native
  scroll substrate (Tab order and scroll-into-view survive, per #173's design); zoom is one
  transform on the stage, ⌘/ctrl-wheel only, with explicit in/out/fit controls as the keyboard
  path. Canvas movement animates via transforms/FLIP — **never view transitions**.
- **VT is reserved for discrete swaps, and the canvas names nothing for VT until #190 lands** and a
  studio state-matrix audit passes (the #171 lesson: naming changes stacking, and the pixel gate
  re-baselines that class of bug). The compile beat ships as a crossfade; the named-group morph is
  a gated upgrade, not a launch dependency.
- **Undo/redo is a snapshot stack** of the whole build state (board + arrangement ≈ 1 KB
  structured-cloned), not a command log. Simplest correct thing at this size.
- **Module seams** (shape, not final names): a studio orchestrator · a canvas engine (drag, marquee
  select, guides, context menu, keyboard verbs, undo, live-region announcements) · a replay driver
  (plays the replay artifact over the bus; pause/step/seek; take-over handoff) · the screen
  projection + flow nav (the compile beat) · a single-file export builder · a catalog module. All
  flat in `system/` as hand-written canon, Node-import-safe like their siblings. Portal side: the
  incremental recorder; agent-layer side: the replay generator.

### Data model
- **Replay artifact** (new, generated, drift-checked): `replay/<slug>.json` — ordered ops
  `{op, atMs, phase, params, fromStep}` plus meta naming the source trace pair, its `sessionId`,
  and an honest label ("projection of the real run <slug>", linking `/traces/<slug>.jsonl`). It is
  *not* a trace and never claims to be one; the trace pair itself is committed alongside under the
  standard labels. Generated only from a validated raw+curated pair; every op traces to a real
  step; a weak run is fixed by a tighter prompt + re-run, never an edit (standing rule).
- **Recorder contract:** the fenced agent builds the board incrementally — separate tool calls per
  place/affordance/connection, PIV-marked — with `record-composition.mjs`'s fence discipline (write
  only the declared outputs, read only declared inputs, no example anywhere). Ship-gate: trace
  validator + replay generator both pass, else nothing ships.
- **Arrangement is grid slots, never free pixels** (the PRD's grammar rule, and the repo's own
  disciplines: "moved to column 2, row 1" is announceable, the tamper surface is finite, and
  `data-col`/`data-row` + stylesheet rules keep the one-inline-style-write gate green). Bounds
  (`MAX_COLS`/`MAX_ROWS`) are exported from the canvas module and imported by the codec — the
  `LABEL_MAX` pattern. Component order within a screen *is* the board's affordance order — no new
  bytes.
- **Share codec v2:** one new field (`g`: per-place grid slots), emitted **only when arrangement is
  present** so every already-shared v1 link stays byte-identical; decode accepts `{1, 2}` with v1
  yielding no arrangement; unknown top-level keys become a rejection (closing the silent-partial-
  restore hole v1 has); the tamper battery grows a coordinate family (magnitude, type, duplicate,
  off-board, overflow) and the existing hostile `v:2` case re-points to `v:3`.
- **Screen typing** is a committed-rules extension of `pattern-rules.mjs`: each place's screen type
  is named from the board by rules, its slots counted from it, never invented — resolving the
  PRD's "patterns → flow screen types" question inside the one-board model. `build-checks` grows a
  group beside the existing pattern-rule groups.
- **Docs catalog carries no new generated artifact.** The join the catalog needs (pack ×
  vocabulary × system-graph × wrapper presence) is computed at view time, pure —
  `prepareHandoff`'s shape extended. One new *optional* spec-head field: `example` props (plus
  `min`/`max`/`step` on numeric props), CI-validated by running `validateComposition` against the
  component's own vocabulary entry. Token *values* resolve live via `getComputedStyle` only — they
  ship in no artifact (pack honesty, the inspect rule).
- **Export:** a runnable single-file HTML assembled client-side from the same sources the page
  renders (contract + pack + components CSS inlined, the composed screens, minimal nav script) —
  no build step, nothing uploaded, the URL stays the only persistence.

### Boundaries & contracts
- **No live LLM at view time** — unchanged. The studio replays committed runs; the visitor's own
  path is committed rules only.
- **Honesty surfaces, extended to the replay:** the replay chrome carries the run's real meta and a
  link to its trace; taking over visibly shifts provenance (the run's work vs the visitor's edits);
  exported artifacts state which is which. The replay artifact's "projection" label is load-bearing
  — it may never read as a recording it isn't.
- **The action bus is the studio's only drive contract:** replay emits `agent.*`, visitor verbs
  emit `ui.*`, both with honest `source` values — the voice-ready seam stays intact.
- **Analytics:** the win metrics get new one-shot virtual routes (share created · export downloaded
  · take-over), each a static literal path fired from its success path only — the standing
  discipline, including the overlapping-flip rules `analytics.mjs` already carries.
- Recorder secrets stay in `portal/.env`; nothing new ships client-side.

### Other eng-lead calls
- **Route surgery:** `/factory` is the studio, so pack-boot's allowlist, the VR page set, and
  param-manifest's scope clause all *already include it* — the studio regenerates factory's two
  baselines rather than adding a page, and manifest entries grow under the existing `/factory` key.
  `/build` keeps working over the same store and share links. `handoff.html` stays standalone
  (PRD). The raw harnesses stay off-nav. `agentic-ui-study.html` retires only when instances
  re-shell onto the studio (#86) — `instance.mjs` mounts `renderStudy` until then. Any new page
  (the catalog) joins the footer site index in the same PR — the footer claims to be the full
  index (#148).
- **At-rest = autoplay-to-completion.** The replay runs on arrival; the settled state — the
  finished canvas — is the VR baseline, behind a finally-set ready handle (the hero-beat
  precedent). Pause/step controls are visible (WCAG 2.2.2); reduced-motion jumps to the end state
  with manual stepping available. Strict determinism of the replay engine is therefore a
  requirement, not a nicety.
- **Mode entry = behavior gradient, no mode UI.** The running replay is watch mode; the first
  canvas interaction pauses it and takes over (that success path fires the take-over route);
  expert is the persisted inspector/gates toggle. No state machine, nothing to explain or count.
- **Docs, two mounts of one source:** a standalone hash-routed catalog page (`/components`,
  linkable per component) and the same generated docs rendered compactly in the studio inspector
  when a placed component is clicked (`refreshInspect` after every canvas re-render). ⌘K gains
  static, presence-gated commands only (the palette memoizes at first open — no dynamic
  registration). Copy-page-as-Markdown reassembles the committed spec source; the HTML code tab
  serializes `renderComposition`'s own live output so no markup is ever hand-written.
- **Protos on canvas are iframes of the existing proto pages**, which persist standalone. #175's
  top-window-only dock decision means frames inherit the reader's pack with no nested chrome —
  already decided there.
- **Gates the studio builds, not just obeys:** the INP instrumentation #164 never got to (#177
  folds in) — `PerformanceObserver('event')` asserted in a studio journey driver
  (`build-journey.mjs` as template), operator-run, against the INP ≤ 200 ms / no-dropped-frame-drag
  budget. `vt-verify` gains studio entries with honest expected boot counts. Every canvas verb has
  a keyboard path with a live-region announcement — the breadboard's discipline extended to 2-D
  (WCAG 2.5.7).
- **Sticky is a no-op site-wide** (`overflow-x: clip`) — the docked inspector, layers list, and
  minimap are structural layout, not pinned elements. Layers list + minimap are also the
  pre-agreed first cuts under the appetite.
- **The ~10 new components, candidate list** (final cut at slicing): text-field · select-field ·
  toggle-switch · search-input · nav-tabs · modal-dialog · notice (finishing `demo-notice`'s
  missing render path) · empty-state · progress-indicator · ghost-button. Alternates: card,
  segmented-control, identity-chip, table-row. Each is owner-authored through the **full chain** —
  spec → tokens → components.css → **renderer template** → handoff/vocabulary regen → checks, plus
  the loc/param/baseline cascades — because a spec without its CSS block and renderer template is
  documented but not composable, which is `demo-notice`'s exact gap today. Each candidate must be
  designed inside the composition model as it stands — scalar props, the single-child rule — the
  way queue/feed/settings decompose to `list-row` + CSS arrangement; a candidate that genuinely
  needs structured props would force a versioned vocabulary-schema call, and none of the ten is
  expected to. The whole batch is a pre-agreed scope cut under the appetite (the PRD's
  count-stated-honestly-either-way clause). Riding debt, same chain: the 7 missing wc wrappers
  (the `vd-*` code tab stays presence-gated until then).
- **Sequencing of in-flight work:** #174 finishes first on its branch (tasks 1–7 landed; approach
  survives as an evidence layer). #173 and #176 fold — their drafted designs migrate (pan/zoom →
  the canvas, device frame → the proto frames, bus toggles → superseded by the replay driver
  exercising `agent.*` for real). #177 folds into the studio gates. Epic #164 closes with an
  honest note.

## Missing pieces

The canvas engine (every 2-D affordance is greenfield) · the incremental recorder + first canned-
brief runs + the replay generator and artifact format · the replay driver over the `agent.*` bus ·
screen projection + typing rules + flow navigation + the compile-beat presentation · codec v2 +
tamper-battery growth · the single-file export builder + the grown keep rail · the catalog page +
inspector docs + `example` spec field + `demo-notice`'s render path · INP instrumentation + the
studio journey driver · the #190 fix (hard prerequisite for any VT naming) · the new virtual
routes · ~10 component specs through the full generation chain.

## Spikes & experiments

1. **Incremental-run recording quality** *(critical path — gates the whole replay layer; run first)*
   Question: does a fenced agent reliably build a board through separate, PIV-marked tool calls
   whose steps project 1:1 into replay ops?
   Spike: adapt the composition recorder's fence; one dry + one real run over an existing scenario
   — ~0.5 day, ~$0.25/run.
   Decision rule: clean projection → ship the pattern; noisy → tighten prompt/fence and re-run;
   still noisy → fall back to rules-derived ops spliced with real trace beats, labeled "derived",
   accepting the weaker claim.
2. **Drag/zoom responsiveness on the DOM stage**
   Question: does pointer-capture drag over ~30 token-skinned components inside a scaled stage hold
   the INP/frame budget on base-spec hardware, cross-engine?
   Spike: throwaway stage with representative DOM, CDP throttling, chromium+firefox+webkit — ~0.5 day.
   Decision rule: holds → DOM stage confirmed; drops → cut live work during drag (defer line
   redraws, `content-visibility`, simplify guides) before considering anything heavier.
3. **Single-file export fidelity**
   Question: does a client-assembled single HTML file faithfully reproduce the composed flow —
   screens, navigation, pack — opened cold in a fresh browser?
   Spike: hand-assemble one export from the fetched sources and click through it — ~0.5 day.
   Decision rule: faithful → the keep rail's headline artifact; gaps → scope the export to
   per-screen HTML + the pack download, stated honestly.

## Open questions

- Wave order beyond the MVP — decided at slicing against the 6-week appetite. Suggested spine:
  MVP (replay + take-over + share/export) → flows → method cards + Hook diagram → docs catalog →
  new components → protos-as-frames + full-tool extras → instance re-shell (#86).
- Final cut of the 10 components — at slicing.
- Whether replay steps drive `morph()` (making vt-verify's boot count = step count) or stay
  transform-only with crossfades at act boundaries — at implementation planning; either way the
  count must be deterministic.
- `agentic-ui-study.html` retirement timing — blocked on #86's instance re-shell.
- Hallway-test recruitment + script (PRD).
- Instance migration timing — which live application gets the first studio-shelled instance (PRD).

---
*Decisions made interactively with the PRD holder, 2026-08-03 — two rounds over the six areas the
PRD deferred (replay source · flow model · route · at-rest state · mode entry · in-flight
sequencing), on top of a four-agent exploration of the existing surfaces. Next: slice with
`piv-slice-epic` (feed this doc + the PRD), running spike 1 before or inside the first wave.*

---

## Closing note — 2026-08-27

Written as the mechanical half of [#223](https://github.com/linardsb/ux-factory/issues/223); the
hallway test and the live-site metric confirmation stay open there. What shipped, what was cut and
what carries forward is recorded once, in
[prototype-studio.prd.md § Epic close](./prototype-studio.prd.md#epic-close--audit-run-2026-08-27) —
this note resolves only the questions *this* document left open.

**Every decision above survived contact.** The chosen approach (A, absorb-and-arrange) held: one board
stayed the single source of truth, the canvas is a render surface rather than a second app, and
`/build` still works over the same store. No approach below the line was revisited.

**Wave order** — the suggested spine broadly held (MVP → flows → method → catalog → components →
frames + extras → instance re-shell), with three insertions the plan did not name: the studio gates
(#213, folding #177's INP half), the IA re-point (#216), and full canvas affordances (#217). The docs
chain (#211) landed before flows (#212) rather than after. Twenty tickets and fifteen follow-ups
closed between 2026-08-04 and 2026-08-20 — about two and a half weeks against a six-week appetite, so
the appetite never had to cut anything.

**Final cut of the 10 components** — no cut. All ten shipped through the full chain (#220); the
catalog reads 20. The alternates list went unused.

**`morph()` versus transform-only** — **transform-only with crossfades**, and the reservation in
§Stack & libraries stands permanently rather than as a launch deferral: no `view-transition-name` is
written anywhere in the studio, and both `system/studio-compile.mjs:22` and `system/studio.css:1120`
record that decision with #171 as its reason. The determinism requirement is met by the replay engine
itself, not by a boot count.

**`agentic-ui-study.html` retirement** — unblocked and taken by #222; `system/instance.mjs:22-23`
records `renderStudy` retiring with it, and the file is gone from disk. The sweep was clean, with no
residue: `agentic.html` is a **different** page — the raw agentic-bridge harness from epic #1 ticket
#11, which its own header distinguishes from the study page ("this is the workbench, not that"). It
remains a live sibling of `trace.html` and `derive.html` under this doc's own "the raw harnesses stay
off-nav" rule: noindex, no `site.js`, no chrome, and no `<a href>` to it anywhere in the repo.

**Hallway-test recruitment, instance migration timing** — both were the PRD's, and both stay with #223.

**Spikes** — all three were folded into their tickets rather than run standalone: incremental-run
recording quality into #203, drag/zoom responsiveness into #204, single-file export fidelity into #210.
Each shipped its decision rule's first branch; no fallback was taken.

*Gate state at close (observed 2026-08-27): `node tooling/build-checks.mjs` → all 27 groups pass.*
