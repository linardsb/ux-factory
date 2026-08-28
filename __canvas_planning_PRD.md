# Canvas + design-import — what to know before writing the PRD

**Status:** pre-PRD briefing, written 2026-08-27; §11–§15 added the same evening after reading the Brilliant tool schemas and re-checking the tracker; §22–§30 added 2026-08-28 from the Brilliant source read, an eleven-agent research pass and the email-hub converter. Not a PRD. This exists so the PRD session starts from
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

---

## 22. Brilliant, read from its source — what "the same capabilities" means (2026-08-28)

The playground DOM (screenshot, 09:26) says exactly what Brilliant is: Flutter web, `flt-renderer="skwasm"`
(Skia compiled to WebAssembly, rendering on a worker thread when the page ships COOP/COEP headers),
`flt-embedding="full-page"`, one GPU `<canvas id="brilliant-engine-canvas-0">` inside a `flt-platform-view`,
a `flt-semantics-placeholder` ("Enable accessibility") that builds a shadow ARIA tree only when a reader
opts in, a hidden `<textarea>` in `flt-text-editing-host` that every keystroke goes through, and a
browser-painted boot skeleton that prefetches the canvas YAML + styles concurrently with the wasm boot.
(The `eternl-dom-script` tag is a browser extension, not Brilliant.)

**The finding that settles the rendering question:** those five things are the *price* Brilliant pays for
painting pixels, not features. A DOM stage gets each of them free by construction: real text editing, real
selection, real IME, a real accessibility tree, crawlable content, no SharedArrayBuffer headers. The two
design tools that stayed DOM at scale (Framer, tldraw) both use transform-only positioning plus viewport
culling; the ones that paint (Figma, Flutter, Excalidraw, Penpot's 2025 opt-in wasm path) all rebuild
accessibility as a parallel structure and still call it inconsistent
([Flutter web a11y](https://docs.flutter.dev/ui/accessibility/web-accessibility) ·
[Penpot render](https://penpot.app/blog/penpots-new-rendering-system/) ·
[Figma WebGPU](https://www.figma.com/blog/figma-rendering-powered-by-webgpu/)). `studio-canvas.mjs` call 1
("the stage is DOM") survives contact with the best-in-class competitor. Keep it.

**What Brilliant has that matters**, mapped to the substrate:

| Brilliant capability | ux-factory today (observed) | Gap | Right tech (§24) |
|---|---|---|---|
| Direct manipulation: drag, resize, marquee, guides, context menu, smooth zoom | #205/#217 verbs on a 12×8 grid; five-entry zoom table; `fit()` snaps | Free x/y (problem 1), continuous zoom (problem 3), feel (problem 4) | T2 · T4 · T7 |
| Auto-layout frames: `al(h,y(c),g,pad)`, `s(fill,hug)` | The board's affordance order inside a place; no layout container in the vocabulary | One base layout primitive | T3 |
| Components · variants · instances · overrides | 20 specs, enum-locked; `comp axes[state[…]]` has no equivalent | State variants as sibling frames (D6); D18 base vocabulary | T6 |
| Tokens bound to a DS with per-mode values (`tok(role,#light,dark(),high-contrast())`) | Three-layer contract, one pack at a time | Per-mode values on one token | T11 |
| Agent DSL + MCP (Blueprint, `lookup`, `export`, `create_modify_elements`) | `{name,props,children}` + twelve ops + the bus | Two-way projection between the vocabularies | T12 · T13 |
| Pen, boolean ops, vectors, shaders, generative images | None | **None by decision** — not a general design tool (prototype-studio.prd non-goals) | reject |

Everything in the first five rows is buildable on the existing substrate with zero dependencies. The
sixth row is Brilliant's job, and the seam (T12) is how a designer's work in Brilliant lands here.

---

## 23. What exists, what the PRD produces, what is still open

**Exists (observed, §21):** DOM stage · native-scroll pan · `transform: scale(var(--stx-scale))` with the
scale set by a `data-zoom` table (`system/studio.css:30-89`) · eight board ops with a pure applier · the bus
· the vocabulary-validated renderer · codec v2 · the replay driver · layers list, minimap, docked docs · the
INP gate ×3 engines · 27 build-checks groups. ~7,470 lines, most of them coordinate-agnostic (§4).

**The PRD produces (D6 + D7, settled):** the free flow layer (frames, state variants, annotations, arrows
as `connect` ops, positions as view state) · the composed screen layer (real components in a frame's layout
flow, no free styling) · twelve ops · the read-direction import (Brilliant `lookup` blueprint → recognition
→ `component.propose` → ratify ≤10 min) · the operator edits the mapping, never the output · minutes-to-
ratify as the metric.

**Still open, and now answerable from the research:** Q2b (T3 answers it: reorder within grammar, because
Brilliant itself is auto-layout-first) · Q6 (§25: the portal mounts the studio modules) · D1 · D2 · D6
naming · the hypothesis wording.

---

## 24. Technology verdicts — right tech for the purpose, nothing more (T1–T16)

Rule applied throughout: adopt only what the existing substrate cannot do; borrow ideas rather than
libraries; zero runtime dependencies on shipped pages; the portal may carry a dependency only when the
browser genuinely cannot do the job. Every "research" claim carries its source; "observed" means read in
this repo.

**T1 — Rendering: keep the DOM stage.** See §22. Reject Flutter/skwasm, CanvasKit, Vello (alpha), Rive,
PixiJS, Konva, Fabric: each is a paradigm swap that costs accessibility and text editing to buy a GPU the
stage does not need. The measured DOM mitigations are `content-visibility: auto` + `contain-intrinsic-size`
on off-viewport frames (one tested case: 732 ms → 54 ms of render work,
[web.dev](https://web.dev/articles/content-visibility)) and tldraw-style culling (`display: none`
off-screen). Lighthouse's 800/1,400-node warnings are the ceiling signal to watch on the stage alone.

**T2 — Zoom: continuous, one property.** The substrate already scales through `--stx-scale`
(observed). Write the property directly instead of selecting it from a five-entry table: `fit()` fits
exactly (problem 3), ⌘-wheel zooms to the cursor, and it stays compositor-only. Keep `transform: scale`,
not CSS `zoom` — `zoom` reflows the whole subtree every tick
([modern-css.com](https://modern-css.com/scaling-elements-without-transform-hacks/)). One known trap: a
transformed stage does not grow its scroll container, so the scrollable extent is sized from stage × scale
by the same write path. The `data-zoom` table survives as the keyboard's stepped path (SC 2.5.7).

**T3 — Auto-layout inside a frame: CSS flexbox is the engine, and it already runs.** Figma now documents
auto-layout as "a subset of flexbox" and reworked it toward flex semantics in July 2026
([Figma](https://help.figma.com/hc/en-us/articles/42031586813719-Use-auto-layout-with-CSS-Flexbox-in-mind));
Penpot's layout *is* CSS flex/grid. So Brilliant's `al(h,y(c),g,pad)` + `s(fill,hug)` converts losslessly:
hug → `fit-content`, fill → `flex: 1` / `align-self: stretch`, fixed → px, gap/padding/align 1:1; the
only partial cases are cross-axis fill inside wrap and absolute children, and CSS anchor positioning
(Baseline 2026) narrows the second. **What the vocabulary lacks is one base primitive**: a `stack`
(direction · gap · padding · align, every value a spacing token) — D18's "layout containers", the first
entry the base vocabulary pays for. Reject Yoga/Taffy: a layout engine outside the browser only earns its
keep for headless layout in Node, and nothing here needs that. **This closes Q2b:** reorder within the
frame's flex grammar; pixel placement inside a frame would turn a composition into a picture and would be
*less* faithful to Brilliant, not more.

**T4 — Free x/y at the flow layer: custom properties + translate.** Frames carry `--x`/`--y` through the
one write path D6 already allows; `transform: translate(var(--x), var(--y))` is compositor-only; native
scroll pan is kept. Positions stay view state saved with the run (D6). Zero code from outside.

**T5 — Connector arrows: Excalidraw's binding model, hand-written.** An arrow binds to a frame by id with
a normalised 0–1 anchor per side and a `boundElements[]` back-reference, so moving a frame re-routes it and
geometry is derived, never stored
([Excalidraw bindings](https://deepwiki.com/excalidraw/excalidraw/3.2-element-binding-system)). One SVG
overlay, ~100 lines. Arrows ARE the `connect` op (D6). Reject jsPlumb (GPL-dual) and leader-line
(unmaintained). **Auto-arrange:** a hand-written rank layout (BFS from the entry frame → column per rank,
row per index) covers 2–12 frames; dagre (MIT, ESM) is the portal-side fallback only if a real flow ever
outgrows that — it never ships. elkjs is EPL/GPL; reject.

**T6 — Frames, states, arrows: the data model.**
`frame {id, screenId, stateKey, device:{mode, preset, safeArea}, composition}` · `stateKey` is an open enum
whose required minimum is Scott Hurff's UI Stack (ideal · empty · error · partial · loading) with
permission/offline/user-named states opt-in per screen
([UI Stack](https://www.scotthurff.com/posts/why-your-user-interface-is-awkward-youre-ignoring-the-ui-stack/))
· arrow `{from, to, trigger: click|load|timer|condition, guard?}` as the `connect` op's params
(a `board-ops.mjs` edit + a group 11 case, never a generator special case) · **state completeness is a
derived check, not a canvas property** — a build-checks group diffs each screen's frames against its
required states, the way group 3 asserts render paths. No tool surveyed asserts this; the gate is the
capability. Export is Mermaid `stateDiagram-v2` text in the handoff pack (zero-dep, human-readable). Device
mode is per frame, not per screen (Figma's one-preset-per-page limit is not inherited).

**T7 — The feel (problem 4): five platform wins, all zero-dep, all Baseline or fallback-safe.**

| Feature | Buys | Support 2026 | Use as |
|---|---|---|---|
| Popover API + CSS anchor positioning | context menus, inspectors, handles pinned to elements; no position maths | Baseline (Chrome 125 · Safari 26 · Firefox 132/147) | primary |
| `Element.moveBefore()` | drag a frame's child into another frame without losing iframe/focus state | Chrome 133 · Firefox 144 · **no Safari** | enhancement over `insertBefore` |
| `scrollend` | "pan settled" for minimap sync, share-URL refresh | Baseline (Safari 26.2 closed it) | primary |
| `getCoalescedEvents` | smooth drag at input rate | Pointer Events L3 is a W3C Rec (June 2026) | primary, degrades to `pointermove` |
| `scheduler.yield()` | INP under long selection ops | Chrome 129 · Firefox · **no Safari** | enhancement only — WebKit is a gated engine |

Sources: [anchor](https://caniuse.com/css-anchor-positioning) · [moveBefore](https://caniuse.com/mdn-api_element_movebefore)
· [scrollend](https://webalur.com/en/blog/safari-version-26-2-introduces-scrollend) ·
[PE L3](https://www.w3.org/news/2026/pointer-events-level-3-is-now-a-w3c-recommendation/) ·
[yield](https://developer.chrome.com/blog/use-scheduler-yield). View Transitions stay reserved (#171 rule).

**T8 — Inline text on the canvas: `contenteditable="plaintext-only"`** with a plain-`contenteditable`
fallback for Firefox; a text edit re-emits the frame's `screen.compose` on blur (tldraw's "mark" batching:
one undo entry per gesture, not per keystroke). Reject `EditContext` (Chromium-only) — it is Flutter's
hidden-textarea problem, which a DOM stage does not have.

**T9 — Undo: keep the snapshot stack.** Already decided (≈1 KB structured clone). Borrow tldraw's
mark-batching. Origin-scoped undo (Yjs/Loro) only matters for concurrent agent + human edits, and take-over
pauses the replay, so there is no concurrency. **Reject CRDTs outright** (Yjs, Automerge, Loro): one
writer, one authoritative order — Figma's own model is LWW under a server-ordered log, which is what the
bus already is ([Figma multiplayer](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)).

**T10 — Share codec v3: `CompressionStream('deflate-raw')`** before any lz-string (Baseline since 2023,
zero-dep). The ceiling is Cloudflare's 16 KB URL, not the browser's 32–64 KB
([CF community](https://community.cloudflare.com/t/loadbalancing-url-length-16k-vs-32k/379870)). The
tamper battery is integrity detection, not anti-forgery — a client-only codec cannot HMAC; say so in the
codec header.

**T11 — Import: deterministic role mapping on token references.** Spike C observed the blueprint carries
`$spacing.md` and `tok(color.text.secondary,#575757,dark(#C6C6C6),high-contrast(#454545))`. The rules
that make mapping deterministic, from the DTCG 2025.10 stable spec and the naming taxonomies
([DTCG](https://www.designtokens.org/tr/2025.10/format/) ·
[Spectrum name object](https://opensource.adobe.com/spectrum-design-data/spec/token-format)):
match on the reference path, never the literal · require a type, never infer it from the value shape ·
map foreign paths into a structured role (`property · component · variant · state · scheme · scale`)
rather than whole-string similarity · carry the foreign name in `$extensions` as provenance · per-mode
values ride one token as `light-dark()` for two modes plus a `prefers-contrast` rule for the third (the
DTCG resolver module is still a draft; do not implement it). Unbound sources (session default is
sovereign) fall back to `pack-import.mjs` by value with spike A's five fixes. Figma Variables REST is
Enterprise-gated, so the Figma input contract stays a DTCG plugin export (`--from`), as today.

**T12 — The seam with Brilliant, both directions, one vocabulary.** Read: `lookup(blueprint)` → converter
(T11 + §28's matcher) → `component.propose`. Write: a `gen-blueprint.mjs` that projects the vocabulary
(spec + CSS block + tokens) into Blueprint DSL components and writes them with `create_modify_elements`
under `designSystem:"default"`, which spike C observed keeps token bindings. Then a designer draws in
Brilliant with ux-factory's own parts, and the return trip recognises by *reference*, not by value — the
match is exact-string. This is what "seamless" costs: one generator in the `gen-handoff` shape, not a
platform. Wave 3, and cheaper than §13 assumed. Mutations are at-least-once with a slow ack (verify by
`lookup`, never re-send — observed).

**T13 — Agent context generated from the system of record.** Generate the composing agent's prompt from
`vocabulary.json` (json-render's `catalog.prompt()` idea,
[json-render](https://json-render.dev/docs/ai-sdk)) and a `DESIGN.md` from `tokens.source.json` +
the specs (Google's Apr 2026 DESIGN.md format, machine YAML + human Markdown,
[Atlassian's write-up](https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice)),
both drift-checked in CI. Every example in the wild is hand-authored; a derived, verified one is the
honest version and makes the DS consumable by any agent (Claude Design, Stitch, Cursor) for free. Keep the
refusal: A2UI's `UNALLOWED_PARENT`/`UNALLOWED_CHILD` error codes are the published prior art for
"vocabulary-validated, visibly refused" ([A2UI](https://a2ui.org/specification/v1.0-a2ui/)). One test to
add now: a vocabulary without an explicit "not covered" escape forces a wrong-but-valid component name —
the "escape-less enum" failure. Streaming (A2UI's flat id list, json-render's JSONL patches) is not needed;
one op per call already is the increment.

**T14 — Guest sessions (D1 revised): Cloudflare primitives, composed, later.** AI Gateway spend limits
scoped by custom metadata (open beta June 2026) give the per-guest budget directly
([CF blog](https://blog.cloudflare.com/ai-gateway-spend-limits/)); a Worker holds the key; a signed
short-lived invite token + Turnstile at redemption; SSE from the Worker before any Durable Object. Nothing
first-party covers "invited but unauthenticated", so it is hand-composed — name it in the PRD, build it in
wave 3.

**T15 — One file shape for frames and research cards: JSON Canvas.** MIT, from Obsidian, four node fields
and `fromNode`/`toNode` edges ([jsoncanvas.org](https://jsoncanvas.org/)). Extend `type` with
`frame · evidence · decision · instrument` and edges with `relation: cites | embodies | tests` (IBIS's
vocabulary, the 1980s design-rationale notation built for exactly "this node cites what resolved it"). It
serialises the flow layer's view state and the discovery cards in one document, and no tool surveyed ships
both an open format and research↔design links — this is closer to novel than to adopting a standard. The
ops stay the truth; the canvas file is their arrangement.

**T16 — Accessibility of free space.** The keyboard path compiles to the same ops as the pointer path
(SC 2.5.7, already the discipline). Announcements move from "column 2, row 1" to tldraw's reading-order
model: position in a row-major order of frames, plus px offsets on nudge — the one documented prior art,
and it does not confirm move announcements, so this repo extends past it
([tldraw a11y](https://tldraw.dev/sdk-features/accessibility)). Axe in the VR tool, light and dark (D11).

---

## 25. The unified flow — Discovery partner and the canvas on one surface

`docs/epics/discovery-partner.architecture.md` already settled the discovery half in the same grammar as
the canvas: the server sequences, the agent acts through four ops (`record_decision` · `flag_weak_answer`
· `open_question` · `file_evidence`), the op carries `answer_ref` and never the answer, and the run
package is `answers.jsonl` + `transcript.jsonl` + a PRD folded from the ops. The canvas half is twelve ops
on the bus. **Unification is a link, not a merge:**

1. **One run package, one canvas file.** D16's `runs/<slug>/` gains `canvas.json` (T15): frames and
   cards with positions; ops stay in the transcript. Decision and evidence cards are read-only
   projections of `record_decision`/`file_evidence` — edited only through a discovery turn, so the
   honesty line holds on the canvas too.
2. **The link is `annotate`.** D6's `annotate` gains `kind: note | cites` and a `ref` (a decision or
   evidence id). A frame that embodies a decision is `annotate {frameId, kind:"cites", ref:"d12"}`; the
   decision already carries `evidence_refs`. Lineage is then pixel → frame → decision → answer → evidence,
   by ids, with no new verb. (**Q8** for the owner: `annotate` or a field on `screen.compose`? The
   recommendation is `annotate` — fewer verbs, and a link is not a composition.)
3. **The session is one arc, six phases (D4), one surface:** discover (interview; cards appear) → shape
   (the board: places/affordances, already the /build chain) → prototype (`compile` projects the board to
   frames, the operator fans out states and arranges freely; the agent proposes `screen.compose`,
   refusals visible) → test (instruments only — hallway script, screener; task-success sink as a Pages
   Function on a built prototype, no backend) → handoff (pack + PRD fold + Mermaid state diagram + drop
   list + refusal ledger).
4. **Q6 answered: the portal mounts the studio modules.** The gate-accumulation loop (every shipped
   surface adds a gate and a baseline) and the "no live LLM at view time" rule both point the same way:
   the live canvas is an operator surface in the portal (127.0.0.1, Agent SDK, no VR baseline), and
   `/factory` replays selected runs. `studio.html` stays the raw harness. The studio modules are already
   Node-import-safe and coordinate-agnostic (§4), so mounting them is a route in `portal.js`, not a port.
5. **What the agent may do on the canvas in-session** is unchanged from D10: compose within the
   vocabulary or propose a component; never free HTML; every op replayable. The Discovery partner's
   Bar-Raiser posture carries over: it can say a screen is missing its error state (the T6 check says so
   arithmetically); it cannot draw the content of that state without an op the human can see.

---

## 26. Outside the box — what no surveyed tool does, and this substrate can (O1–O9)

- **O1 The refusal ledger as an exhibit.** A first-class "no valid composition" state on the canvas and
  a published list of what the agent could not build against the vocabulary and why. Current tools
  silently retry or hallucinate; nobody surfaces declined generations as a trust signal.
- **O2 Lineage from a pixel to an interview answer** (§25 item 2). Checkpoint-restore tools (VS Code,
  Zed, Lovable, Bolt) roll state back; none trace forward causally.
- **O3 Counterfactual replay.** Re-run one brief with one answer changed; replay both runs side by side
  on `/factory`. The portal can afford a real run each; vendors offer revert, not branching comparison.
- **O4 The agent-context file generated and drift-checked** (T13), never hand-authored.
- **O5 Brilliant as a thin front end for the same DS** (T12): project the pack + vocabulary into a
  Brilliant design system, draw there, import by reference. Recognition becomes trivial because both
  sides speak one vocabulary.
- **O6 Wrong-but-green as a published method.** Mutate the source, prove which gate catches it, publish
  what each gate cannot reach — the repo's own discipline (`.claude/references/gates.md`), generalised
  into a shipped exhibit. No published method for this was found.
- **O7 State completeness as a gate** (T6). No tool asserts the UI Stack.
- **O8 Cross-engine visual proof bundled with the trace.** Every VLM-judge method found assumes one
  browser; this repo already runs three.
- **O9 Zero-LLM-at-view-time replay as the hiring proof itself.** Every tool surveyed needs a live model
  to demonstrate anything; two searches found no designer or UXE publishing replayable agent traces as
  proof of skill. Open ground.

---

## 27. Rejected, with the reason (R1–R10)

| # | Rejected | Why |
|---|---|---|
| R1 | Flutter/skwasm · CanvasKit · Vello · Rive · Pixi · Konva · Fabric as the stage | paradigm swap; pays a shadow a11y tree and a hidden textarea to buy a GPU the DOM stage does not need (§22) |
| R2 | tldraw · Excalidraw · xyflow · Penpot as engines | React peer deps; tldraw needs a commercial key since v4; Penpot is a ClojureScript app — a token-exchange neighbour at most |
| R3 | Yoga · Taffy | the browser is the layout engine; nothing needs headless layout |
| R4 | Yjs · Automerge · Loro | single writer, single order; take-over pauses the agent |
| R5 | `EditContext` · File System Access · scroll-driven animations · `scheduler.yield` as primary paths | Safari/Firefox gaps; WebKit is a gated engine — enhancements only |
| R6 | MCP Apps / MCP-UI raw-HTML iframes as a UI channel | the studio-frames dead end, standardised; the cited anti-pattern for "no free HTML" |
| R7 | Synthetic users as research | NN/g: shallow, sycophantic ([NN/g](https://www.nngroup.com/videos/ai-generated-users/)); EU AI Act Art. 50 transparency duties from 2 Aug 2026 — fixtures only, labelled |
| R8 | A VLM verification loop for import fidelity | email-hub built one and retired it (§28 E8); deterministic fixes closed the dominant defect class |
| R9 | Lighthouse or an LLM judge as a CI gate | machine-dependent; operator-run only (D11) |
| R10 | A second canvas app · an evidence database now | one board, one bus; the volume does not exist (D17) |

---

## 28. What email-hub gives us (E1–E9)

`~/Desktop/email-hub/app/design_sync/` is a design→email converter with the same problem shape — a
foreign design projected onto a constrained target with fidelity claims to keep honest. Ideas, not code:

- **E1 A loss taxonomy that makes the drop list total.** `.agents/plans/52-converter-foundation.md`
  names three classes: NEVER-PARSED · PARSED-THEN-DROPPED-AT-BRIDGE · CAPTURED-BUT-NEVER-EMITTED. Spike
  A's fix 4 ("52 of 238 tokens appear nowhere in the report") is the first class undiagnosed. The import
  report gets the three columns.
- **E2 Staged diagnostics.** `diagnose/models.py` records `DataLossEvent {type, node_id, stage, detail}`
  at every phase boundary — the trace shape for `portal/record-import.mjs`.
- **E3 The matcher shape (D3).** `component_matcher.py:339`: independent signal predicates each append a
  `(slug, score)` candidate → sort → threshold (0.5) → an explicit floor. The floor is the escape T13
  needs: "not covered" is a real outcome, never a forced pick. Slot fills by a slug→builder dispatch;
  default fills logged as warnings.
- **E4 The wrong-but-green detector spike A lacks.** `visual_scorer.py:137`: per-pixel CIEDE2000 ΔE in
  CIELAB (replacing grayscale SSIM, which scored a wrong brand colour at matching luminance as perfect),
  aggregated by **MIN across sections, never mean**, with origin correction and resize-to-reference. And
  the self-deceiving shape to avoid, verbatim from their retrospective: `sum(scores)/max(len,1)` scores
  1.0 exactly when nothing was measured. Compare against Brilliant's `export(png)` of the source; #40's ΔE
  exhibit is the repo's precedent.
- **E5 The learning loop, gated.** `traces/correction.py`: human corrections diffed → pattern-hashed →
  ≥5 occurrences and ≥0.9 agreement → a *suggested* rule with an explicit approve step; never auto-apply.
  Maps onto "the operator edits the mapping, never the output": persisted role-map edits become suggested
  matcher rules after N repeats. Later wave.
- **E6 Quality contracts.** `quality_contracts.py:279`: pure post-conversion assertions that count
  `<!-- section:ID -->` markers against the input — completeness by arithmetic, the build-checks idiom.
- **E7 The token gate records its own fixes.** `token_transforms.py:731` returns structured
  `TokenWarning {level, field, message, fixed_value}` — an `rgba()`→hex or `rem`→px normalisation (spike A
  fix 1) is a warning row, never silent.
- **E8 The retired loop.** `visual_verify.py` (render → ΔE pre-filter → VLM → allow-listed CSS
  corrections → revert on regression) was retired 2026-06-12: triple-dead on the default path and unable
  to fix the dominant defect class, which a deterministic pass then closed. Do not build a vision loop for
  import (R8).
- **E9 The contract on claims.** `docs/converter-fidelity-ceiling.md` voids every prior percentage:
  "express progress by defect-class closure, never by a percentage." Adopt for the import report and the
  minutes-to-ratify metric's presentation.

---

## 29. The answer in one paragraph

Keep the DOM stage and native scroll; make zoom continuous through the custom property the sheet already
reads; move frames with `--x/--y` + translate; add one base `stack` primitive so Brilliant's auto-layout
converts to flexbox losslessly (which closes Q2b: reorder within grammar); draw arrows as Excalidraw-style
bindings that emit the existing `connect` op; make state completeness a build-checks group over the UI
Stack; use Popover + anchor positioning, `moveBefore`, `scrollend` and coalesced events for the feel;
`CompressionStream` for the codec; JSON Canvas as the file shape for frames and research cards alike, with
`annotate {kind:"cites"}` as the one link between them; map Brilliant tokens by reference, deterministically;
take email-hub's matcher, ΔE-MIN fidelity and loss taxonomy for the converter; generate `DESIGN.md` and a
Blueprint projection from the vocabulary so the same parts exist on both sides of the seam. Zero runtime
dependencies on shipped pages; the portal hosts the live canvas; `/factory` replays. Nothing here is a
platform — it is one primitive, one op-param change, one build-checks group, three generators and a
handful of Baseline platform features.

---

## 30. Sequence and spikes (S1–S4), and what changes in §10

§10 stands (merge #294 → `plan-create-prd` → `plan-architecture` → `piv-slice-epic`). The architecture
step takes T1–T16 as named calls and runs four half-day spikes before slicing, each with a decision rule:

| # | Spike | Question | Decision rule |
|---|---|---|---|
| S1 | Continuous zoom + translated frames on the existing substrate, ×3 engines under the INP gate | does `--stx-scale` + `--x/--y` hold ≤200 ms INP with ~30 frames and culling? | holds → T2/T4 as written · drops → `content-visibility` first, then defer line redraws during drag |
| S2 | Blueprint → `stack` flex conversion on the spike C fixture (`1db1b29957b949ca`) | does `al(h,y(c),g,pad)` + `s(fill,hug)` land as one token-spaced flex container with no literal? | lossless → T3 + Q2b closed · a literal appears → name the token the contract lacks, drop it visibly |
| S3 | ΔE-MIN fidelity against `export(png)` of the same element | does a deliberately wrong role map (green body text, spike A run 3) score red while 12/12 WCAG stays green? | red → the detector exists · green → the aggregation is wrong, not the idea |
| S4 | `gen-blueprint` round trip: one vocabulary card → Brilliant under `designSystem:"default"` → `lookup` → recognised by reference | is the match exact-string? | yes → T12 is a generator, wave 3 · no → the write direction stays a non-goal |

Owner questions this adds to §7: **Q8** (the link verb, §25) · **Q9** the first base primitives beyond
`stack` (text · button · the input family · list · card · nav · dialog · toast · table · media · chart
slot, per D18 — which three ship with the canvas epic and which wait for import).

*Sources for §22–§30: eleven agent runs, 2026-08-28 — ten online (engines · GPU renderers · layout ·
tokens · design↔code bridges · generative-UI protocols · prototyping state · discovery tooling · op logs
and replay · the 2026 web platform · AI-native practice) and one local read of email-hub. URLs inline
where a claim depends on them; a claim marked observed was read in this repo or in email-hub.*
