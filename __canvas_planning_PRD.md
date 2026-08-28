# Canvas + design-import — what to know before writing the PRD

**Status:** pre-PRD briefing, written 2026-08-27; §11–§15 added the same evening after reading the Brilliant tool schemas and re-checking the tracker. Not a PRD. This exists so the PRD session starts from
what is already settled instead of re-deriving it.

**The one-line answer.** The PRD can be written **now**. Nothing blocks it — not epic #279, not spike C.
Spike C gates the *architecture* doc, not the intent.

---

## 1. The trigger

> **Nothing. Run `plan-create-prd` whenever you have the session in you.**

Not epic #279, not #223, not #271 — none shares a file, a gate or a dependency with this work, and
writing a PRD is a document rather than code.

**And not spike C either.** A PRD is intent; `plan-create-prd`'s own rule is *"A PRD is INTENT
(what/why), never engineering decisions (how) — those are the `plan-architecture` skill's spec."* What a
Brilliant capture returns is a how. Test it section by section — problem, evidence, hypothesis, users,
MVP, metrics, non-goals, open questions — and none is unwritable without it. The MVP simply reads
"Figma, with Brilliant pending a spike" instead of naming both, which is more honest rather than less
complete, and the unproven leg files under Evidence as an assumption needing validation. The discovery
PRD set that precedent: *"Skill discovery under the SDK is plausible but unproven… nothing depends on
it."*

**Spike C gates `plan-architecture`**, where the draft mechanism is actually decided. A vision path and
a structured-metadata path are different builds, and guessing between them is the expensive mistake.

The bounded risk of writing the PRD first: if Brilliant returns nothing usable, one MVP line changes and
Brilliant demotes from translation gate to later source. The Figma leg is untouched. A line edit, not a
rewrite.

**What waiting longer would buy, stated so it can be declined on purpose:**

- **Waiting for #288** (the discovery portal UI) informs **Q6** — operator canvas in the portal, or
  `studio.html` promoted? But Q6 is already an open question; it does not need answering to write a PRD.
- **Waiting for runs 1 and 2** buys evidence about *discovery*, which this epic is not about.
- **Waiting for #223's hallway round** buys the one genuinely useful thing on the list: whether the
  studio reads as a tool or an exhibit — problem 6 in §5 below. It is people-scheduling, so start
  recruiting now and it will likely land before the PRD is finished anyway.

---

## 2. Spike C — required before the architecture, not before the PRD

> **Superseded in part by §12 and §15.** `capture_ui` does not read designs, and the structured-vs-screenshot
> question is answered by schema. The placement argument below stands; the shape does not.

Nobody has run the Brilliant path. Its MCP is registered for this project (`~/.claude.json`,
`mcpServers.brilliant`), D7 names four tools — `capture_ui` · `lookup` · `create_html` · `render_ui` —
and no run exists.

**The question:** what does a Brilliant capture actually hand you? A screenshot means the draft path is
vision-based. Structured component metadata means something else entirely. D7's whole claim — *the agent
drafts spec + CSS block + renderer template from a capture, the human ratifies what a drawing cannot
carry* — rests on which of those it is.

**Shape:** one component captured through `capture_ui`/`lookup`, then drafted through the spec chain,
timed the way spike B was timed. Roughly an hour.

**Decision rule:** structured output → the draft path is a real mechanism and the MVP can commit to it ·
screenshot only → the draft path is vision-based, which is a different cost and a different honesty
statement (`record-derivation.mjs` is the vision-run precedent) · unusable → Figma `--from` carries the
MVP alone and Brilliant is named as a later source.

**Why it sits here and not before the PRD.** The handoff's §6 ran spikes A and B before its PRD step,
and that was right — they answered *scope* questions (does the engine work at all; what does one
component cost), which are intent-level. Spike C answers a *mechanism* question, which is architecture-
level. Same skill, different job.

---

## 3. What is already settled — do not re-ask these

### Spike A — Polaris v7 (238 tokens) through `system/pack-import.mjs`, zero new code

**No new converter engine is needed.** The engine reached a mapped pack in three runs. It needs five
named changes, all engine/report work:

1. **Value normalisation.** `rgba()` and `rem` — how Polaris and most current systems publish — read as
   nothing. 137 colours and 49 dimensions invisible, and the refusal then misdiagnoses: *"none of the
   238 styles read is a colour"* when 137 are. A mechanical shim fixed both in ~20 lines.
2. **Semantic-name recognition before ramp inference.** Polaris names *are* roles, several byte-identical
   to contract tokens (`color-bg-surface`, `color-border`), and the engine only ramps-and-rungs. The
   import that should be trivial is the one it cannot do.
3. **A provenance/licence block.** The header hard-codes "read from the Figma file" even for a non-Figma
   export; version, source URL and licence have no field.
4. **A total drop list.** 52 of 238 tokens (22%) appear nowhere in the report — the whole motion family,
   all z-index, all shadows. "The drop list is itself presentable content" is not yet true.
5. **A fidelity check.** Run 3 shipped **12/12 WCAG passing while visibly not Polaris** — green body
   text, a line-height ranked as the largest type size. Wrong-but-green has no detector.

Its own verdict: *"the engine's mapping DISCIPLINE is presentable today; the REPORT is not yet the
artifact."*

### Spike B — one foreign component (Polaris Avatar) through the full chain, timed

**5:32 wall-clock**, all 27 build-checks groups green after two designed tripwires named their own fixes.

The finding that shapes tooling: **the time concentrates in judgement** — what the projection drops, the
a11y model — **not plumbing**, which is seconds. So drafting tooling only attacks the right bottleneck
if it drafts the *prose* for human editing. Automating file writing buys nothing.

Bounds stated honestly: cold-session orientation excluded; an interactive component, a contract-token
addition, or the unpaid VR/journey costs would multiply it. Against D7's ≤10-minute target: plausible at
this grain, unproven at the harder one.

Also observed: recognition-over-admission decided itself cheaply — Polaris Badge was rejected in under a
minute because `status-chip` already covers the shape.

---

## 4. What the canvas decision already says (D6, revised 2026-08-26)

The canvas is **not** unplanned. It is specified in the vault thinking doc
(`2026-08-26-ux-factory-discovery-build-revamp`) and was never carried into a repo doc.

> *"So the binary-refusal call above was half wrong: the grid is not the grammar to keep, it is the
> ceiling to replace."*

**Two layers.** Flow layer free: an infinite pannable zoomable canvas on native scroll, everything with
free x/y — frames (one per screen, sized by a per-frame mobile/desktop device mode), state variants
(empty/loading/error/partial/success as sibling frames fanned out), components, annotations, and flow
arrows between frames. **Positions are view state saved with the run, never an op and never part of the
honesty claim; arrows ARE ops** (the board's `connect`).

**Retires:** the 12×8 grid, spans-not-px, `clampSlot`/`stepSlot`.
**Keeps:** the bus as the drive path, the vocabulary refusal, visible refusals in the live region, the
catalog docs mount, one op per tool call with a twelve-op vocabulary (the eight board ops plus
`screen.compose` · `screen.set` · `annotate` · `component.propose`).

**Already decided, so do not re-litigate it:** *"The `writes===1` inline-style gate does not reach a
portal canvas; if shipped studio modules are reused, x/y ride custom properties through one write path."*

### What survives from the current canvas

`system/studio-canvas.mjs`'s header names three load-bearing calls. Two are grammar-agnostic:

| Call | Survives a coordinate-system change? |
|---|---|
| **The stage is DOM** — real token-skinned components, so the token contract, inspect bubbles and Tab order work by construction | Yes |
| **Pan is native scroll** — a translated stage breaks scroll-into-view for Tab, the scrollbar affordance, and touch panning | Yes |
| **Zoom and arrangement are attributes** — `data-col`/`data-row` select grid lines from `studio.css` rules | **No. This is the layer being replaced** |

The grid reaches 12 files. Beyond placement maths: share codec v2's `g` field goes to v3 and the tamper
battery's 20-case coordinate family needs rewriting (its "duplicate cell" case is meaningless in free
space) · the SC 2.5.7 keyboard path is `stepSlot`/`groupStep` · announcements say *"moved to column 2,
row 1"*, and free space has no announceable unit · build-checks groups `canvas`, `verbs`, `select` and
`minimap` all mirror the grid tables exhaustively.

Most of the ~7,470 lines across the studio modules do not care what the coordinates mean.

---

## 5. The six problems with the canvas as it stands

Named by the owner, 2026-08-27. They are not one epic, and three are cheap:

| # | Problem | Where it lands |
|---|---|---|
| 1 | Free pixel placement | **The canvas epic.** Coordinate-system swap; `writes===1` already resolved by D6 |
| 2 | 12×8 too coarse | `MAX_COLS`/`MAX_ROWS` are exported constants the codec imports rather than re-types. Near a two-constant change plus regenerated `studio.css` tables. **Standalone ticket today** |
| 3 | Zoom will not fit exactly | Already a recorded trade — `fit()` snaps to a level at or below the ideal ratio because zoom is a five-entry table. **Standalone ticket** |
| 4 | The feel | Tuning on the existing substrate. **Standalone** |
| 5 | The flow/compile model | A different layer — not the canvas |
| 6 | Reads as an exhibit, not a tool | The product question. **#223's hallway round is the only instrument that answers it** |

Problem 6 decides whether 1–5 are worth doing. That is the argument for running #223's hallway round
before or during the PRD session, not after it. **Update, evening: #223 closed with the round never run — see §11.
The instrument has to be re-homed in this PRD.**

---

## 6. Scope: one PRD, two waves

**One document covering canvas and import.** D15 already couples them — *"Wave 2: D6 canvas additions +
D7 import"* — and the systems map says why:

> *"Supply loop (reinforcing): the canvas is only as quick as the component supply; twenty entries cap
> ideation; an import path that still costs half an hour of ratification per component never closes the
> loop. The metric that matters is minutes-to-ratify, not components-in-vocabulary."*

Split them and you get an import epic with nowhere to put components and a canvas epic with nothing to
arrange. The supply loop is the thesis; it needs both halves in one document.

---

## 7. Open decisions the PRD must settle

**From the handoff's §5** (`.claude/plans/design-import-epic-prd-handoff.md`):

- **D1** — canon vs scoped admission: are ported components first-class vocabulary citizens, mapped onto
  existing components by default, or a pack-scoped extension layer?
- **D2** — gallery vs per-company first.
- **D3** — recognition matcher: shipped capability in MVP, later ticket, or never?
- **D4** — open-issue fold-ins. **Note: #268 was closed 2026-08-27** as a recorded limitation, so this
  decision has lost one of its two inputs; re-read it knowing that. #271 (a11y gates, which would vet
  every ported pack) is still open. **Update, evening: #271 closed too, unimplemented — see §11. D4 has lost
  both inputs.**
- **D5** — VR/baseline policy for ported packs.
- **D6** — naming policy: do ported components keep foreign names or take system names?
- **D7** — the falsifiable hypothesis and its metric.

**From the thinking doc:**

- **Q2b** — is drag-to-reorder within a frame's layout grammar enough, or must a component sit at an
  arbitrary pixel *inside* a frame? (D6 settled the flow layer; this is the frame's interior.)
- **Q6** — operator canvas in the portal mounting the studio modules, or `studio.html` promoted?
- **D18 — the base vocabulary.** *"the twenty components are Verdant/Fieldwork-flavoured and enum-locked…
  This, not the canvas, is the real ceiling for 'any product'."* A generic base (layout containers, text,
  the input family, button, list, card, nav, dialog, toast, table, media, chart slot) plus
  product-specific components arriving only through import or `component.propose`.

  **D18 does not block epic #279**, despite reading as though it might. It says the base is *"paid before
  Faster Payment runs"*, and Faster Payment is discovery run 1 (#291) — but that run **chooses no
  component**: the discovery PRD's non-goals state *"No prototype composition or screen rendering in this
  epic. The three buttons run before any component is chosen."* D18 was written when Faster Payment meant
  building the thing. The vocabulary ceiling binds here, in this epic, not there.

- **D20 / Q7 — platform.** The discovery questionnaire determines web / native / both, and that selects
  device frames, a conventions module (web nav · iOS tab bar and sheets · Android bottom sheet and FAB)
  and the pack targets. **Brilliant is the translation gate for both platforms; Figma is a source that
  holds web and native designs.** Note the handoff doc predates this by a week and does not reflect it.

---

## 8. Constraints the PRD must not contradict

From the handoff's §7, unchanged:

- Shipped pages are vanilla — no framework, no build step, no runtime deps, no view-time LLM calls.
  Agent work is build-time, committed, replayed.
- Token discipline: `components.css` is token-only; new semantic tokens enter `tokens.source.json`
  (contract group) first, then regenerate.
- Honesty contract: attribution stated, agent-run claims backed by real recorded runs, fidelity deltas
  shown rather than hidden. **Projection, not reproduction** — fidelity is achieved *through* the
  contract (exact values carried as pack tokens), never around it (literals). Token concepts the
  contract lacks drop, and the drop list is presentable content.
- Gates that will fire: build-checks group 3, VR baselines for any at-rest shipped-page change,
  `param-manifest.json` for new live controls, loc-summary regen for new tracked files.
- Fonts must be shipped/licensed; vector art travels as inline SVG.

Two frames from the handoff's §1 worth carrying verbatim into the PRD:

- **Mode 1 vs Mode 2.** Every import answers this fork. Mode 1: the component JOINS the system
  (token-only CSS, wears every pack, pixel-faithful under its own brand pack because the pack carries
  the exact values). Mode 2: it stays FROZEN as a brand-locked exhibit, labelled as the original.
- **Recognition vs admission.** Recognition — their `ListItem` is my `list-row` — is deterministic
  comparison against the vocabulary and can be automated. Admission — a genuinely novel shape entering
  the vocabulary — always costs judgement. No accumulation removes that; it makes it rare.

---

## 9. Inputs for the PRD session

| Path | What it carries |
|---|---|
| `.claude/plans/design-import-epic-prd-handoff.md` | 435 lines: the narrowed thesis, feasibility map, capability inventory, candidate workflows, D1–D7, §8 interview questions, both spike write-ups |
| `.claude/plans/design-import-spike-a/` | Spike A's engine log, browser log, two refusal screenshots, the Polaris merge script |
| `~/…/thinking/2026-08-26-ux-factory-discovery-build-revamp.md` | D6 · D7 · D15 · D18 · D20 · Q2b · Q6 · Q7 — in the vault, not committed |
| `docs/epics/prototype-studio.architecture.md` | The current canvas's decisions and its § Closing note |
| `system/studio-canvas.mjs` | The three substrate calls, in the file that owns them |
| `system/pack-import.mjs` | The import engine spike A exercised |
| Spike C | **Does not exist yet. Run it first.** |

---

## 10. Sequence

1. **`plan-create-prd`** → `docs/epics/<slug>.prd.md`, fed everything in §9. **Start here — nothing
   blocks it.** Brilliant's viability files under Evidence as an assumption needing validation, and the
   MVP names Figma with Brilliant pending.
2. **Spike C** — one Brilliant component through `lookup`/`export`, timed (shape re-cut in §15). ~1 hour. Run it between the
   two, so the architecture decides the draft mechanism on evidence.
3. **`plan-architecture`** → `docs/epics/<slug>.architecture.md`, with D1, Q2b and Q6 as the named calls.
4. **`piv-slice-epic`** → the epic issue and its tickets, carrying the § For slicing conventions from
   `docs/epics/discovery-partner.architecture.md` (they generalise: the "every ticket carries" table,
   spike-verdict-before-dependent-planning, and the close-out ticket created at slicing rather than at
   the end).

Running alongside, not blocking: **#223's hallway round** answers problem 6 in §5, and the three cheap
canvas fixes (grid density, zoom fit, feel) can ship as standalone tickets against the existing
substrate at any time.

---

## 11. Corrections, 2026-08-27 evening (observed)

Facts that changed between this briefing being written and the PRD session:

- **#271 is CLOSED** (20:43, batch-closed with #202 and #223; no implementing PR — the two PRs `gh` matches
  on "271" are line-number hits). D4 has now lost **both** inputs. The a11y-gate policy for ported packs
  comes back into this PRD as an open decision; fold it into D5 as one "gating a ported pack" decision.
- **#223 is CLOSED with hallway round 3 never run.** Its last comment (17:37) lists Phase C as remaining,
  and `docs/hallway-notes/` still holds only `TEMPLATE.md` and two `README.md`s, last touched 2026-07-25.
  Problem 6 in §5 therefore has **no instrument**. The PRD carries it as *"Assumption — validate via
  hallway round"* and someone owns recruiting; otherwise problems 1–5 get built on an unverified premise.
- **The docs this session cites are unpushed.** `docs/discovery-partner-prd-grill` is 6 commits ahead of
  `origin/main`, no upstream, no PR; it holds the discovery PRD + architecture, the #223 close notes and
  the spike A/B parking. `.claude/skills/plan-create-prd/SKILL.md` carries an uncommitted retune (grill at
  every gate, the systems-loop question, the cobra check, `docs/epics/` as the write path) — that is the
  version that will run. Push, PR, merge before step 1 of §10 so the PRD's citations resolve on main.
  Local `main` is 5 behind `origin/main`.

---

## 12. The Brilliant tools, read from their schemas — D7 is mis-specified

The four tools' schemas were loaded this session (no capture run, no quota, nothing bound). What they are:

| Tool | What it actually does | Role in import |
|---|---|---|
| `capture_ui` | Screenshots **Brilliant's own chrome** — toolbars, command palette, panels — to a WebP. Desktop-only | **None.** A self-documentation tool |
| `render_ui` | Renders a **Brilliant UI stager** (e.g. `ai-chat-panel`) offscreen to an image | **None.** Same family |
| `lookup` | Finds/reads elements; `format:"blueprint"` returns the **full element tree** as Blueprint DSL text; `expandInstances:true` shows a component instance's derived children with real ids; `depth` bounds the subtree | **The read path.** Structured |
| `export` | `svg` raw markup · `htmlFlex` semantic-flexbox HTML/CSS snippet · `react` JSX · `html`/`htmlDoc` · png/jpeg/webp/pdf · mp4/mov | **The second read path** (three code shapes) + vector art as inline SVG |
| `create_html` | HTML + inline CSS → native auto-layout frames, text, shapes; hex/rgb colours only; returns a PNG preview | **The write direction** (us → Brilliant) |
| `create_modify_elements` | Blueprint DSL create/edit; needs `get_knowledge("blueprint/core")` first | Write direction, native |

Two consequences:

**D7 names two tools that do not read designs.** `capture_ui`/`lookup` was written as the capture pair;
only `lookup` is. The vault doc's D7 and the handoff's line 135 both carry the error. The PRD names
`lookup` + `export` as the read surface and drops `capture_ui`/`render_ui` from the conversation.

**Spike C's headline question is answered by schema: structured, not screenshot.** Three structured shapes
exist (Blueprint DSL, htmlFlex, react) plus SVG. What spike C must still answer is narrower and better:

- (a) does the blueprint carry **design-system token references** (Brilliant has tokens) or only resolved
  literals — token refs make role mapping deterministic; literals fall back to `pack-import.mjs`'s by-value
  discipline and spike A's five fixes;
- (b) which of blueprint vs htmlFlex is the better conversion input on a real component (auto-layout
  params, text styles, states/variants);
- (c) whether the portal's Agent SDK run can reach the Brilliant MCP at all — `~/.claude.json` registers it
  for Claude Code sessions, and the SDK does not read that file unless told to (expected; verify by passing
  it as `mcpServers` in the query options — the surface #280 is already probing).

---

## 13. "Is there a workaround?" — the conversion is the product, not a bypass

Asked 2026-08-27: Brilliant cannot be the canvas and raw exports cannot land on shipped pages — can we
build our own hooks/MCPs for a granular, customisable conversion into the ux-factory canvas?

**The constraint is not a limitation to route around; it is the thesis.** A raw `htmlFlex`/`react` export
is literals (hex, px, font names) with no props, states or behaviour. Landed as-is it fails token
discipline (`components.css` is token-only; build-checks refuses), wears one pack instead of every pack,
and breaks the honesty contract (an exhibit pretending to be a system component). The handoff's frame
already names the answer — **projection, not reproduction**: exact values travel as pack tokens, structure
becomes a spec + CSS block + renderer template, concepts the contract lacks drop, and the drop list is
presentable content. The "workaround" is a converter, and the converter is what makes it granular and
customisable.

**Yes to our own tooling — on the repo side, not the Brilliant side.** Every piece has a precedent in the
repo already:

| Piece | Precedent | What this epic adds |
|---|---|---|
| Reading Brilliant from an agent run | `portal/lib/trace-recorder.mjs:169-173` — the SDK query takes `tools`/`allowedTools`/`canUseTool` + a `PreToolUse` fence + a `PostToolUse` recorder | Brilliant's MCP passed as `mcpServers`; **no MCP server of our own is needed to read** |
| One fenced write tool; one call = one op = one trace step | `tooling/board-op.mjs` — the build agent's ONLY tool | `tooling/component-op.mjs`: applies one `component.propose` op; the draft spec/CSS/template lands as a **proposal**, never directly in `system/specs/` |
| The converter engine, ONE never a fork | `system/pack-import.mjs` (tokens) | `system/brilliant-import.mjs`: blueprint/htmlFlex text → `{roleMap, dropList, specDraft, cssDraft, templateDraft, notes}`; view-time-safe so the portal drawer and a CLI share it |
| Deterministic where it can be | D3 recognition — their `ListItem` is my `list-row` | Runs in code before any agent prose; Polaris Badge → `status-chip` in under a minute is the observed shape |
| Judgement drafted, never auto-written | Spike B: the cost is prose (what the projection drops, the a11y model); plumbing is seconds | The agent drafts the prose; the human ratifies in the portal (the owner prefers UI over CLI) |
| Customisable | `figma-pull --accent/--page`; `pack-import`'s `notes[]` | An **operator-editable role map** (rename, remap, drop) persisted with the run — **the operator edits the mapping, never the output** |
| Honest by construction | real run → trace → curated → labelled | `portal/record-import.mjs`, the third recorder beside `record-build`/`record-composition`, so every admitted component carries replayable provenance |

**Two grains, both in scope.** *Component grain*: one Brilliant element → recognition or admission →
vocabulary entry → renderable everywhere the agentic renderer runs. *Screen grain*: one Brilliant frame →
recognised components + positions → `screen.compose` ops on the free x/y canvas (D6); positions are view
state, unrecognised elements are visible refusals or `component.propose`. The screen grain is what
"conversion into the canvas" means, and it only works once the component grain exists.

**The write direction (`create_html`) is a later wave with a named caveat.** Pushing our token-skinned
components into Brilliant would seed a designer with recognisable parts — but `create_html` takes inline
CSS with hex/rgb only, so tokens flatten to literals on the way out and the return trip has to
re-recognise by value. Name it as an MVP non-goal and a candidate wave 3.

---

## 14. What goes in the PRD vs the architecture

**PRD (intent):**

- MVP direction is **read** (Brilliant → ux-factory); the write direction is a non-goal.
- The conversion is a **projection through the contract** with a human ratification step; the fidelity
  delta and the drop list are shown, never hidden.
- Two grains: component admission, and screen composition onto the canvas.
- **The operator edits the mapping, never the output.**
- Metric: minutes-to-ratify (≤10 per component, D7's bar) with the fidelity delta shown. Cobra check:
  12/12 WCAG green while visibly not the source is the observed failure mode (spike A, run 3).
- Non-goals: Brilliant as the canvas; a raw export on a shipped page; the write direction.
- Assumptions to validate: the blueprint carries token refs (spike C); the SDK run reaches the MCP
  (spike C); the studio reads as a tool (hallway round, §11).

**Architecture (how, after spike C):** converter module placement; SDK transport (in-process tool vs
CLI — take #280's verdict rather than re-running it); the recorder and its fence; the recognition
matcher's rules; the `component.propose` payload shape (a `board-ops.mjs` edit plus a build-checks group
11 case, never a generator special case); the ratification UI in the portal; where proposals live before
admission.

---

## 15. Spike C, re-shaped

One component drawn in Brilliant **with design-system tokens bound** (a card or a list row) → `init` →
`lookup(scope, format:"blueprint", expandInstances:true)` **and** `export(format:"htmlFlex")` **and**
`export(format:"svg")` on the same element → diff what each carries → draft through the spec chain →
time it against spike B's 5:32. Then one SDK query from the portal with the Brilliant MCP in
`mcpServers`, `--dry`, to prove the recorded-run path can reach it.

**Decision rule:** blueprint carries token refs → deterministic role mapping; commit to it · literals
only → by-value mapping through `pack-import.mjs` + spike A's five fixes, and the fidelity check is
mandatory · the SDK cannot reach the MCP → the read happens in a Claude Code session and the op file is
the handoff into the recorder (the CLI-shaped transport, #280's alternative) · nothing usable → Figma
`--from` alone.

**Result (real run, 2026-08-27 22:18–22:31; write-up at `.claude/plans/design-import-spike-c/README.md`):**

- **Q1 — token refs, yes.** The blueprint carries both the reference and the resolved value on every
  tokenisable slot (`$spacing.sm`, `tok(color.text.secondary,#575757,dark(#C6C6C6),…)`) — but only when the
  source was drawn under a design system (`designSystem:"default"`). The session default is sovereign, so
  an unbound source falls back to by-value mapping through `pack-import.mjs`.
- **Q2 — blueprint is the converter input.** Roles by name, auto-layout intent, `comp axes[state[…]]`,
  `inst … at()`, explicit `override`, icons by Phosphor name. `htmlFlex` is the fallback (semantic flex,
  literals, `data-component`/`data-instance-of`); `react` is absolute-positioned; `svg` is a 383 KB rendering.
- **Q3 — the SDK reaches the MCP.** `mcpServers:{brilliant}` passed explicitly, status `connected`, 17
  tools visible, `lookup` answered in 7.8 s, the fence denied nothing.
- **Decision rule → deterministic role mapping; the in-process recorded-run path; no CLI-shaped handoff.**
- **Draft cost:** recognition (0:16, not covered → `ds-person-row`) to all 27 build-checks groups green in
  **2:45** (spike B: 5:32), 1:45 of it prose. Run 1 was red on 7 groups: the two designed tripwires plus
  three regens `gen-handoff` does not run (gen-vocabulary, gen-pack-bundle, gen-system-graph) — a chain
  fact the architecture should record and the admission tool should run.
- **Also observed:** `create_html` is always sovereign (literals); `create_modify_elements` under
  `designSystem:"default"` writes token-bound elements, so a **token-preserving write direction exists**
  (wave 3's caveat in §13 is narrower than written). MCP mutations are at-least-once with a slow ack (the
  create timed out at 120 s but had applied — verify with `lookup`, never re-send). `capture_ui`/`render_ui`
  are desktop-only and stayed unused.
- **Not exercised:** interactive states, a contract-token addition, VR, the write direction. The fixture
  stays on canvas `playground` (instance `1db1b29957b949ca`); the draft was reverted, admission is the epic's.

---

## 16. Where the canvas is decided — the file map (2026-08-28)

Every place a decision or plan about the ux-factory canvas lives. Headers in code files are the
specification (CLAUDE.md § Ground rules); the docs carry intent and the decisions behind them.

### A. Governing docs — intent and decisions

| File | What it decides |
|---|---|
| `docs/epics/prototype-studio.prd.md` | Epic #202's intent, hypothesis, WRONG-if, and the § Epic close audit (2026-08-27) |
| `docs/epics/prototype-studio.architecture.md` | The canvas as built: grid slots, the bus as drive path, codec v2, replay, gates; the § Closing note |
| `docs/epics/ai-first-ux-factory.prd.md` + `.architecture.md` | The platform the canvas sits in; most "new" pieces are already-decided Missing pieces |
| `docs/epics/discovery-partner.prd.md` + `.architecture.md` | Wave 1 of the revamp; canvas (D6) and import (D7) named as non-goals; the owner's 2026-08-10 verdict recorded in its evidence table; § For slicing conventions |
| `docs/epics/prototyping-feel-uplift.prd.md` + `.architecture.md` | The feel layer — the precedent for problem 4 |
| `docs/epics/st-ux-fusion.prd.md` + `.architecture.md` | The systems-thinking layer over the Shape Up + Hooked spine the canvas compiles from |
| `docs/epics/generative-prototyper.prd.md` + `.architecture.md` | Parked epic #86 — build-time bespoke prototype; the canvas's upstream idea |
| `docs/epics/portfolio-v3-experience.*` | The v3 spine `/factory` lives in |
| `~/Desktop/claude-code-second-brain/Fredis/Memory/thinking/2026-08-26-ux-factory-discovery-build-revamp.md` | **Vault, not in repo.** D6 (free canvas), D7 (import), D15 (waves), D18 (base vocabulary), D20 (platform), Q2b, Q6, Q7 |

### B. The canvas as built — epic #202's plans, reports and reviews

`.claude/plans/studio-<slug>-<ticket>.md` with a matching `.claude/reports/studio-<slug>-<ticket>-report.md`,
and `.claude/code-reviews/pr-<N>-review.md` per PR. The canvas-critical ones:

| Ticket | Plan | Owns |
|---|---|---|
| #203 | `studio-replay-recorder-203.md` | the recorder + replay artifact (the honesty path) |
| #204 | `studio-canvas-stage-204.md` | **the substrate**: DOM stage, grid slots, pan by scroll, zoom table (`MAX_COLS`/`MAX_ROWS`, the five-entry zoom table — problems 2 and 3 start here) |
| #205 | `studio-canvas-manipulation-205.md` | the verbs: move/resize/undo/redo through the bus; `stepSlot`/`groupStep` keyboard path |
| #208 | `studio-share-codec-v2-208.md` | codec v2's `g` field + the tamper battery's coordinate family |
| #209 | `studio-replay-driver-takeover-209.md` | replay over `agent.*`, take-over |
| #212 | `studio-flows-places-screens-212.md` | places → screens, the flow surface |
| #213 | `studio-gates-inp-vt-a11y-213.md` | the studio gates + the INP gate |
| #217 | `studio-canvas-affordances-217.md` | marquee, guides, context menu (problem 4's surface) |
| #221 | `studio-layers-minimap-221.md` | layers list + minimap (mirror the grid tables) |
| #223 | `studio-epic-close-223.md` + `-report.md` | the desk audit; hallway round 3 never ran |
| follow-ups | `studio-and-board-ops-quartet-225-231-232-236.md` · `studio-compiled-screens-overflow-251.md` · `studio-compile-identity-tripwire-253.md` · `studio-249-inp-gate-review-fixes.md` · `studio-adoptboard-cancel-264.md` | the recorded defects and their fixes |

### C. The /build chain and the import path — epic #134 and #130

`.claude/plans/build-*.md` (+ reports) · `hooked-shapeup-pattern-builder.md` · `build-page-import-act.md`
(Act 0, the browser import) · `public-drop-to-reskin.md` (#130, `pack-import.mjs` as the ONE engine) ·
`figma-token-import-handover.md` · `figma-import-scales-and-dock.md` · `figma-drop-portal-ui*.md` ·
`docs/figma-runbook.md`.

### D. The next epic — canvas + import

`__canvas_planning_PRD.md` at the repo root (this file, the source of truth; `.claude/plans/canvas-import-prd-briefing.md` is a symlink to it) · `design-import-epic-prd-handoff.md` · `design-import-spike-a/` ·
`design-import-spike-c/`.

### E. Code whose header is the spec

`system/studio-canvas.mjs` (the three substrate calls) · `studio.css` (hand-mirrors the caps group 12
pins) · `studio-verbs.mjs` · `studio-select.mjs` · `studio-flow.mjs` · `studio-compile.mjs` ·
`studio-frames.mjs` · `studio-layers.mjs` · `studio-minimap.mjs` · `studio-keep.mjs` ·
`studio-export.mjs` · `studio-method.mjs` · `studio-docs.mjs` · `studio.mjs` · `board-ops.mjs` (the op
vocabulary + pure applier) · `build-share.mjs` (codec v2) · `replay-driver.mjs` · `action-bus.mjs` ·
`agentic-renderer.mjs` · `pack-import.mjs` · `tooling/build-checks.mjs` (groups `canvas`, `verbs`,
`select`, `minimap`, `analytics`, 11 for ops) · `tooling/studio-journey.mjs` · `replay/README.md` ·
`traces/README.md` · `.claude/references/gates.md` · `.claude/references/token-system.md`.

### F. Tracker

GitHub `linardsb/ux-factory`: epic #202 (closed 2026-08-27) with #203–#222 and the close #223; absorbed
follow-ups #225, #226, #229–#232, #236, #237, #249, #251, #253, #259, #262, #264, #273; #268 and #271
closed 2026-08-27 unimplemented; epic #134 (the /build chain); epic #279 (discovery, #280–#293, all
open); epic #86 (parked). PR #294 carries this briefing.

---

## 17. Session findings, 2026-08-27 → 28

- **Sequence.** Do not serialise behind #279: its 14 tickets are untouched and its PRD names the canvas
  a non-goal. Spike C ran first (§15) so the PRD cites facts instead of assumptions. Order now:
  merge PR #294 → `plan-create-prd` → `plan-architecture` → `piv-slice-epic`.
- **The PRD command.**
  `/plan-create-prd canvas + design-import epic · __canvas_planning_PRD.md
  .claude/plans/design-import-epic-prd-handoff.md .claude/plans/design-import-spike-c/README.md
  docs/epics/prototype-studio.architecture.md <vault thinking doc path>` — the interview asks only
  what the docs are silent on: D1, D2, D6 naming, Q2b, the hypothesis wording.
- **Architecture: yes.** `plan-architecture` with D1, Q2b, Q6 as the named calls; it records spike
  C's decisions (deterministic role mapping, in-process SDK transport, the three regens `gen-handoff`
  does not run) and takes #280's transport verdict rather than re-running it.
- **`/think` first: no.** The 2026-08-26 session, the handoff, the briefing and three spikes already
  did it; another pass re-derives what is settled. One exception: if the **thesis** is in doubt (supply
  loop / minutes-to-ratify vs "the studio reads as an exhibit"), that is a strategy question and a
  scoped `/think` is right, because the hypothesis depends on it.
- **Stripping redundant tech: as an evidence run, not a thinking session.** The canvas strip list is
  D6's retire list (§4) — the 12-file blast radius — and belongs in the architecture as an explicit
  deletion list with the baseline cascade named (loc-summary regen, the two approach baselines, VR).
  Beyond the canvas, do not guess: the raw harnesses and reference packs are kept by decision; the
  `.mcp.json` `tree-sister` entry, `tooling/wc-sandbox/` and `tooling/style-dictionary/` are
  candidates. A jcodemunch pass (`find_dead_code`, `find_unused_paths`, `get_dependency_graph`) over
  `system/`, `tooling/`, `portal/` plus `system-graph.json` gives a coded list labelled unused /
  reference / exhibit. Offered, not run.
- **Brilliant.** The four D7 tools are third-party and exist; only `lookup` + `export` read designs
  (§12). No MCP server of ours is needed to read; the conversion tooling is ours on the repo side
  (§13). Token-preserving writes exist via `create_modify_elements` under `designSystem:"default"`.
- **PR #294.** Docs-only: the discovery PRD + architecture, the #223 close notes, spike A/B/C parked,
  this briefing, the `plan-create-prd` retune. The branch was 5 behind main from the start; merged
  `origin/main` in (`.gitignore` union, `cede6d2`); build-checks all 27 pass on the merged tree.
- **Corrections carried (§11).** #271 closed unimplemented; #223 closed with the hallway round never
  run; the retuned skill is now committed.

---

## 18. The conversion pipeline end to end — what exists, what is missing (2026-08-28)

One picture of the whole path a design takes from Brilliant or Figma to the ux-factory canvas. "Today"
is observed in the repo; "this epic" is what the PRD scopes and the architecture places.

| # | Stage | Today | This epic adds | Owner file |
|---|---|---|---|---|
| 1 | **Read the source** | Figma: `tooling/figma/figma-pull.mjs --from <export.json>` (plugin export — no token, no quota, no Enterprise gate) or the API read (`figma-read.mjs`, ~6 GET-file/month budget, cache in the `wt-figma` worktree, `--offline` re-runs free). Brilliant: `lookup(format:"blueprint")` + `export(htmlFlex\|svg)` through the MCP, reachable from the portal's Agent SDK run (7.8 s, spike C) | the Brilliant read as a **recorded run** — `portal/record-import.mjs`, the third recorder | `tooling/figma/*` · `system/brilliant-import.mjs` (new) |
| 2 | **Tokens → a pack** | `system/pack-import.mjs` — ONE engine (CLI, portal drawer, home drop zone all import it); maps by ROLE, negotiates contrast, refuses with the CLI's message byte for byte; emits `system/tokens.<slug>.css` + a report | spike A's five fixes: `rgba()`/`rem` normalisation · semantic-name recognition before ramp inference · provenance/licence block · total drop list · wrong-but-green fidelity check | `system/pack-import.mjs` |
| 3 | **Recognition** — is this shape already in the vocabulary? | human judgement: 0:16 in spike C (`ds-person-row`, not covered), under a minute in spike B (Badge → `status-chip`) | the D3 matcher in code: deterministic comparison against `handoff/verdant/vocabulary.json`, before any agent prose | `system/brilliant-import.mjs` |
| 4 | **Admission draft** — spec `.md` (+ `.contract.json` if data-bound) + `components.css` block + `agentic-renderer.mjs` template (+ palette entry) | an agent writes them by hand: 1:45 of prose in spike C, nearly all of it the spec's Usage/Accessibility sentences | drafted FROM the blueprint by the recorder's agent, landing as a **proposal** through one fenced `component.propose` op — never directly in `system/specs/`; an **operator-editable role map** (rename, remap, drop) persisted with the run | `tooling/component-op.mjs` (new, the `board-op.mjs` shape) |
| 5 | **Ratify** — props, states, behaviour, a11y | editing files | a portal ratification UI (owner prefers UI over CLI); **minutes-to-ratify** measured per component, ≤10 is D7's bar | `portal/lib/*` + `portal/public/` |
| 6 | **Regenerate + gate** | `gen-handoff` (21 specs ✓) · `gen-vocabulary` · `gen-pack-bundle` · `gen-system-graph` · `build-checks` 27 groups (group 3: every vocabulary entry has a render path) | the admission tool runs **all four** regens — `gen-handoff` alone left three stale and turned 7 groups red (observed) | `agent-layer/*` |
| 7 | **Compose onto the canvas** | `agentic-renderer.mjs` renders `{name,props,children}` from the vocabulary and refuses the rest; the studio's eight board ops arrange places on the 12×8 grid | D6's free x/y flow layer; `screen.compose` · `screen.set` · `annotate` ops; a Brilliant **frame** → recognised components + positions (positions are view state, never an op) | `system/studio-*.mjs` · `system/board-ops.mjs` |
| 8 | **Provenance** | trace → `curate-trace` → `validate-trace`; `gen-replay` projects a build run | the import run committed and replayable, labelled "real run, curated" | `traces/` · `replay/` |

The honesty frame over all eight stages is §8's: **projection, not reproduction** — exact values ride as
pack tokens, structure becomes a spec, concepts the contract lacks drop, and the drop list is shown.
Every import answers Mode 1 (joins the system) vs Mode 2 (frozen exhibit, labelled).

---

## 19. Brilliant — the full inventory and the observed facts

**The 17 MCP tools**, by direction (the SDK saw exactly 17 in spike C):

| Direction | Tools | Notes |
|---|---|---|
| Session | `init` · `list_projects` · `get_selection` · `send_feedback` | `init` binds the session and returns the session id, canvas id and the knowledge-key list; `project:` binds a project that is not on screen, headlessly |
| **Read** | `lookup` · `export` | `lookup`: `format: summary\|blueprint`, `expandInstances`, `depth`, filters by name / text / type / fillColor / componentName. `export`: `svg` · `htmlFlex` · `react` · `html` · `htmlDoc` · png/jpeg/webp/pdf · mp4/mov |
| **Write** | `create_html` · `create_modify_elements` · `execute_commands` | `create_html` is always sovereign (hex/rgb literals). `create_modify_elements` takes Blueprint DSL and `designSystem: default\|new\|none` (sticky); under `default` elements are token-bound |
| Knowledge | `get_knowledge` | keys: `design-systems/{core,authoring,authoring-modes}` · `blueprint/{core,layout,layout-patterns,paint,text,styled-ranges,effects,vectors,components,libraries,lines,arcs,images,commands,directives}` · `design/*` · `design/blocks/*` · `effects/*` · `charts/*` · `images/*` · `recreation/*` · `svg/*` · `reference/*` · `webgl/*` (full list in `.claude/plans/design-import-spike-c/00-init.txt`) |
| Generative | `generate_image` · `generate_svg` · `vectorize_image` | Google raster · Quiver vector · raster→vector |
| Self-documentation, desktop-only, **irrelevant to import** | `capture_ui` · `render_ui` · `list_capture_targets` · `list_stagers` | screenshot Brilliant's own chrome / stagers — D7 named the first two by mistake |

**Binding and transport facts (observed across sessions):** `init` binds to the focused window; a 120 s
timeout means a stale binding — re-run `init` on a project switch. Mutations are at-least-once with a
slow ack (a create timed out at 120 s but had applied — verify with `lookup`, never re-send; reads are
fast). In the web editor `export` has no local filesystem: PNG returns inline, `outputPath` is refused
outside `/tmp`. The Agent SDK does **not** read `~/.claude.json`; pass the server as `mcpServers`
explicitly, and it connects in seconds.

**Design-system facts:** the project carries Brilliant's `default` DS; the session defaults to sovereign
(`none`), so a hand-drawn design is token-bound only if the designer chose the DS. Under `default`,
token discipline is enforced (`$color.surface`, `$spacing.md`, `$font.size.lg`, `typography.body.md`).

**Blueprint DSL, as read back (spike C):** `g(12:$spacing.md)` · `pad(8:$spacing.sm,12:$spacing.md,…)` ·
`rd(6:$radius.md)` · `t(…,Manrope:$font.family,16:$font.size.md,sb,lh(1.5:$font.lineHeight.normal))` ·
`w(1:$stroke.width.subtle)` · `tok(color.text.secondary,#575757,dark(#C6C6C6),high-contrast(#454545))` ·
`al(h,y(c),g,pad)` · `s(360,hug)` / `s(fill,hug)` · `comp axes[state[active,away]]` ·
`inst("…") at(state(active))` · `override(#id) t("…")` · `svg(icon:caret-right)`. Weight is a keyword,
not a token. A drawing carries no props, states or behaviour — D7's rule, observed.

**The three-way read of one instance** (`1db1b29957b949ca`):

| facet | blueprint (`lookup`) | htmlFlex (`export`) | react (`export`) | svg |
|---|---|---|---|---|
| colour | role + literal per mode: `tok(color.success.container,#F1F7F2,dark(#003B12))` | light literal only | same literal | literal |
| spacing | `g(12:$spacing.md)`, `pad(8:$spacing.sm,…)` | `gap:12px; padding:8px 12px…` | absolute `left/top` px | n/a |
| type | family/size/line-height as tokens, weight a keyword | literals | same | font attrs + 3 base64 `@font-face` blocks |
| layout | `al(h,y(c),g,pad)`, `hug`/`fill` — intent | semantic flex | `position:absolute` — geometry only | absolute |
| component / instance | `inst("Spike List Row") at(state(active))`; master readable with both variants | `data-instance-of` + `data-component` | same | none |
| override | explicit `override(#id) t("On call")` | resolved text | resolved | resolved |
| variants / states | master `comp axes[state[active,away]]`, both subtrees | exported state only | same | same |
| icon / vector | `svg(icon:caret-right)` — the Phosphor NAME | inline `<svg><path>` | same | path |
| props / behaviour | none | none | none | none |

---

## 20. The component chain and the vocabulary as it stands

**The vocabulary: 20 components in `system/specs/`, 4 with data contracts** — `card` · `care-task-row` ·
`demo-notice` · `empty-state` · `ghost-button` · `list-row` · `metric-tile` · `modal-dialog` ·
`nav-tabs` · `plant-card` · `primary-button` · `progress-indicator` · `screen-header` · `search-input` ·
`select-field` · `sequence-step` · `stat-tile` · `status-chip` · `text-field` · `toggle-switch`.
Verdant/Fieldwork-flavoured and enum-locked (the reason #13 added a generic `metric-tile`). **This, not
the canvas, is the ceiling for "any product"** — D18's base vocabulary (layout containers, text, the
input family, button, list, card, nav, dialog, toast, table, media, chart slot) is the one-off cost of
agnosticism; product-specific components arrive only through import or `component.propose`.

**The chain a component must complete** (CLAUDE.md § Where new code goes, restated so this file is
complete): a spec `system/specs/<name>.md` (+ `.contract.json` if data-bound, per
`.claude/references/kb-format.md`) → its `components.css` block (header
`/* ---------- <class> (system/specs/<name>.md) ---------- */`, token-only) → its
`agentic-renderer.mjs` template → `node agent-layer/gen-handoff.mjs` (+ `gen-vocabulary`,
`gen-pack-bundle`, `gen-system-graph`) → `build-checks` group 3 asserts every vocabulary entry has a
render path. A spec with no block and no template is *documented but not composable* and a red build.
The optional `example` head key must actually render. A new semantic token enters
`tokens.source.json` (contract group) first, then `gen-token-css` **and** `gen-handoff`, or the pack
goes stale and CI `verify` goes red. WC wrappers (`system/wc/vd-*`) are spec-first and ship in the pack.

**Gates that fire on admission:** the 27 build-checks groups · VR baselines for any at-rest shipped-page
change · `param-manifest.json` for a new live control · loc-summary regen for new tracked files (and the
two approach baselines) · the docs-chain histogram pin (3/17 → 3/18, observed in spike C) ·
`drift-check` syntax-checks every tracked `.mjs`, `.claude/plans/` included.

**Recognition vs admission:** recognition (their `ListItem` is my `list-row`) is deterministic and can
be automated; admission (a genuinely novel shape) always costs judgement — accumulation makes it rare,
never free.

---

## 21. The canvas as built — modules, the op vocabulary, and what D6 changes

**Modules** (roles from CLAUDE.md's index and the ticket plans; ~7,470 lines across them):

| Module | Role |
|---|---|
| `system/studio-canvas.mjs` | the SUBSTRATE — native-scroll stage, zoom table, `data-col`/`data-row` (#204) |
| `system/studio.css` | the studio's surface styles; hand-mirrors the caps group 12 pins |
| `system/studio-verbs.mjs` | the MANIPULATION verbs — move, resize, undo/redo, all through the bus (#205) |
| `system/studio-select.mjs` | selection, marquee, guides, context menu (#217) |
| `system/studio-flow.mjs` | the flow's screen surface — renderScreen + wireFlow (#212) |
| `system/studio-compile.mjs` | the compile beat; transform-only crossfades, no `view-transition-name` (#207, #171) |
| `system/studio-method.mjs` | the METHOD BAND — the ten questions as cards, Hook loop, ethics verdict (#214) |
| `system/studio-docs.mjs` | the DOCKED DOCS — mount 2 of `renderComponentDocs` (#218) |
| `system/studio-frames.mjs` + `device-frame.mjs` | the two prototypes as real iframes; Verdant's resizable device frame (#219) |
| `system/studio-layers.mjs` · `studio-minimap.mjs` | the LAYERS LIST and the MINIMAP with a live viewport rect (#221) |
| `system/studio-keep.mjs` · `studio-export.mjs` | the keep rail; single-file export (#210) |
| `system/studio.mjs` | the orchestrator behind `/factory` and `studio.html` (#206) |
| `system/replay-driver.mjs` | plays a committed projection over the `agent.*` half; take-over (#209) |
| `system/board-ops.mjs` | the BUILD-OP vocabulary + a pure applier (DOM-free; three layers need it) |
| `system/build-share.mjs` | the whole build in the URL — codec v2 (`g` grid field) + the tamper battery (#208) |
| `system/action-bus.mjs` | the one bidirectional action contract (agent / click / keyboard) |
| `system/agentic-renderer.mjs` | vocabulary-validated `{name,props,children}` → real components; refuses the rest |
| `system/bus-toggles.mjs` | Fieldwork's agentic-slot state commands — the only `agent.*` exerciser |
| `tooling/board-op.mjs` | the fenced build agent's ONLY tool — one call, one op, the board printed back |
| `tooling/build-checks.mjs` groups `canvas` · `verbs` · `select` · `minimap` · `analytics` · 11 (ops) | mirror the grid tables exhaustively |
| `tooling/studio-journey.mjs` | the studio ×3 engines + the INP gate |
| `studio.html` · `/factory` · `instance.html` | the raw harness · the shipped surface · the private-instance shell |

**The op vocabulary.** Eight board ops today: `place.add` · `place.rename` · `place.remove` ·
`affordance.add` · `affordance.rename` · `affordance.remove` · `connect` · `disconnect`. D6 adds four:
`screen.compose` · `screen.set` · `annotate` · `component.propose` — twelve, one op per tool call. A new
verb is a `board-ops.mjs` edit (the `OPS` list, its `PARAMS` entry and the switch, together) plus a
build-checks group 11 case, never a generator special case. Arrows between frames ARE ops (`connect`);
positions are view state saved with the run and never part of the honesty claim.

**What D6 changes** (§4 in full): retires the 12×8 grid, spans-not-px, `clampSlot`/`stepSlot`, codec v2's
`g` field (→ v3), the tamper battery's coordinate family, the "column 2, row 1" announcements and the
grid tables in four build-checks groups — the 12-file blast radius. Keeps the DOM stage, native-scroll
pan, the bus as the drive path, the vocabulary refusal, the live-region refusals, the docs mount, and
one op per tool call. The `writes===1` inline-style gate does not reach a portal canvas; reused studio
modules carry x/y as custom properties through one write path.
