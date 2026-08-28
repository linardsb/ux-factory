# canvas-design-import.prd.md

**Status:** intent, interviewed and grilled 2026-08-28 (G1–G33 below, all resolved), awaiting architecture · **Epic:** #295 (sliced 2026-08-28, 26 tickets #296–#321) · **Created:** 2026-08-28
**Inputs.** `__canvas_planning_PRD.md` (the pre-PRD briefing, §1–§30) · `.claude/plans/design-import-epic-prd-handoff.md` (D1–D7, spikes A and B) · `.claude/plans/design-import-spike-c/README.md` (spike C, observed) · `docs/epics/prototype-studio.architecture.md` (the canvas as built, and its closing note) · `docs/epics/discovery-partner.prd.md` + `.architecture.md` (wave 1, the run package this consumes) · the vault thinking doc `2026-08-26-ux-factory-discovery-build-revamp` (D6, D7, D15, D18, D19, D20, Q2b, Q6, Q7 — cited, not committed).
**Scope:** wave 2 of the revamp — the **build half**, in the portal, for the operator. Discovery (#279) produces a PRD and a run package; this epic turns that into a product flow with its states on a free canvas, using components that already exist when the build starts or arrive through import and in-canvas creation.

---

## Problem

The factory can decide what to build (discovery, #279) and can show a finished build replaying (the studio, #202). It cannot **build**: there is no surface where the owner takes a PRD and arranges a real product's screens, states and flow with their own hands.

Two ceilings, and they reinforce each other.

1. **The parts are the wrong parts.** The vocabulary is 20 components, all shaped for two fictional apps and, where they carry choices, locked to those apps' enums (`plant-card.status`, `care-task-row.type`, `stat-tile.kind`, `status-chip.value` — observed in `handoff/verdant/vocabulary.json`; the two field components are already generic and take any string). There is no plain layout box, no plain text, no generic button. A bank flow cannot be composed from them, and every new part is written by hand through a three-file chain that costs judgement each time.
2. **The canvas is a display case.** Arrangement is a 12×8 grid of slots, zoom is a five-step table that cannot fit the work to the window, and the surface autoplays on arrival. The owner's verdict (2026-08-10): `/factory` "feels random", not product-grade. It was built as an exhibit for a visitor and is being judged as a tool by its owner.

The loop that keeps both in place: a canvas is only as fast as its supply of parts; supply costs a hand-written chain per part; so the owner never imports, the vocabulary stays at 20, and there is nothing worth arranging freely. Fixing either half alone does not break the loop — an import path with nowhere to put parts, or a free canvas with nothing to place.

**Cost of leaving it.** The owner's next real product gets prototyped in Brilliant or on paper, the discovery run's PRD never reaches a screen, and the factory stays a platform that demonstrates building without ever being used to build.

## Evidence

**Observed**

| What | Where |
|---|---|
| The vocabulary is 20 components, Verdant/Fieldwork-flavoured and enum-locked; no layout container, text block or generic button | `system/specs/` (20 files); the reason #13 added a generic `metric-tile` |
| Arrangement is grid slots; zoom is a five-entry table; `fit()` snaps below the ideal ratio | `system/studio-canvas.mjs` header; `studio.css` zoom table; briefing §5 problems 2–3 |
| The grid reaches 12 files (codec field, tamper battery, keyboard path, announcements, four build-checks groups); ~7,470 lines across the studio modules, most coordinate-agnostic | briefing §4, §21 |
| The studio reads as an exhibit, not a tool | Owner's verdict, 2026-08-10 (recorded in `discovery-partner.prd.md` evidence) |
| A hand-ported foreign component costs **5:32** through the full chain, time concentrated in judgement prose, plumbing seconds | Spike B, Polaris Avatar, 2026-08-20 |
| An agent-drafted component from a Brilliant read costs **2:45** to all 27 gates green; recognition 0:16 | Spike C, 2026-08-27, `.claude/plans/design-import-spike-c/timings.txt` |
| A Brilliant design read carries token **references** and resolved values on every slot, auto-layout intent, variants, icons by name — when drawn under a design system | Spike C Q1/Q2, `03-blueprint.txt` |
| A drawing carries no props, states or behaviour | Spike C, every read shape; `docs/figma-runbook.md` ("a description of a drawing") |
| The portal's recorded agent run reaches the Brilliant MCP in **7.8 s** | Spike C Q3, `12-sdk-reach-output.txt` |
| A modern public token export (Polaris v7, 238 tokens) is refused twice by the token engine, then maps with fills that are formally green and visibly wrong (green body text, 12/12 WCAG) | Spike A runs 1–3, `.claude/plans/design-import-spike-a/` |
| 52 of 238 imported tokens (22%) appear nowhere in the import report | Spike A harvest item 1 |
| Recognition decides itself cheaply: Polaris Badge → `status-chip` in under a minute | Spike B step 0 |
| Faster Payment is the first real flow: four screens, the richest state space (CoP match / close / none / unavailable; safety stop; send pending / success / fail) | Vault Q5, screen counts fetched from linards.pages.dev 2026-08-26 |
| Discovery stops before any screen or component exists | `discovery-partner.prd.md` non-goals: "No prototype composition or screen rendering in this epic" |
| The agent can already run fenced, traced and replayed; one call = one op is the standing discipline | `portal/record-build.mjs`, `tooling/board-op.mjs`, `traces/README.md` |
| The grid substrate is shared: `factory.html` and `instance.html` import `system/studio-canvas.mjs`, so retiring the grid changes the public `/factory` too | grep, 2026-08-28 grill |
| Replay projections carry no coordinates (`ops[].params` has labels only), so the substrate swap needs no projection migration | `replay/build-fieldwork-dispatch.json`, 2026-08-28 grill |
| No share link carrying a grid field is committed outside `.claude/` plans and reviews; nothing shipped or documented holds one | `git grep`, 2026-08-28 grill |
| The pixel gate captures neutral + saulera only; verdant is not in `PACKS` | `tooling/visual-regression/visual.spec.mjs:143` |
| The Plus UI pack touches 11 live code files + the runbook and has no dedicated baselines | `git grep -il plusui`, 2026-08-28 grill |
| The handoff viewer already owns a markdown-subset renderer (paragraphs, soft breaks, bold, code, bullet lists; no links), exported as `renderMarkdown` | `system/handoff-viewer.mjs:18-21,163` |
| The Figma read budget is per FILE, not per account, and the variables endpoint is Enterprise-gated regardless of account; the export path has neither limit | `docs/figma-runbook.md:49-51,173`; `tooling/figma/figma-read.mjs:6-18` |

**Assumption — needs validation**

- That a free canvas is what makes the owner arrange a real flow here rather than in Brilliant. The 2026-08-10 verdict names the feeling; nothing has tested the fix. **Validate via the first real flow** (MVP 12).
- That ten generic primitives (five existing, five new — G24) are enough to compose Faster Payment's four screens without a hand-written component. Derived from the screens' content, not tried. **Validate via MVP 12**; a screen that needs an eleventh names it.
- That compose-and-name (a saved group of primitives) covers most "new component" needs and admission through the chain stays rare. Spike B/C both hit admission because no primitives existed; no data on the split once they do. **Validate by counting** admissions vs compositions over the first flow.
- That a designer-drawn Brilliant source is token-bound. Spike C's fixture was drawn under the design system by the spike; the session default is unbound, and an unbound source falls back to by-value mapping with spike A's five fixes. **Validate via the first import of a source the owner did not draw for the test.**
- That the discovery run's PRD (run 1, #291) exists before this epic's first real flow. **Not waited for** (G23): the Faster Payment brief written from the live page stands in, labelled a stand-in; when #291 runs, its PRD replaces the brief and the frame→decision links are filled then.
- That an unbound (raw-value) Brilliant source is common. Unknown until a real designer's file is imported; the count of unbound imports is **recorded** with each run (G18), not carried as a question.

## Thesis

**Why this.** Wave 1 gives the factory a way to decide; the studio gave it a way to show. What is missing is the half in between, and it is the half the owner's own next product needs: take the PRD, put real parts on real screens, fan out the states, draw the flow, hand it off. Everything below the component line already enforces the discipline this needs (spec → CSS → template → gate); the canvas only has to stop being a grid and the vocabulary only has to stop being Verdant's.

**Why now.** Three facts changed in the last ten days. Spike C turned Brilliant from a hope into an observed read path with token references, so import is a converter to write rather than a mechanism to guess. The discovery architecture settled the run package and the op grammar this canvas plugs into, so the seam is a link rather than a merge. And the studio epic closed with every substrate decision intact except the grid: DOM stage, native-scroll pan, the bus, the vocabulary refusal all survive a coordinate swap (briefing §4).

**Why it beats the cope.** The cope is Brilliant, or paper. Both are faster to draw in today and both stop at a picture: no token contract, no states as first-class things, no arrows that are real navigation, no handoff pack, no replay. What the canvas adds is not drawing ability, it is **structure the arrangement must fit**: every part on a screen is a real component wearing the pack, every state is a named sibling of its screen, every arrow is a recorded connection, and the pack that comes out can be audited against the decisions that went in. The owner only switches if arranging here is as quick as arranging there. That is the whole bet.

**What this epic decides, and what it hands on.** The product calls — one substrate for every page, states as base-plus-overrides, saved groups as instances, admission as full membership, arrows from parts, where ratify writes, what Figma supplies, where a run lives, which primitives are new, what a canvas holds — are made below (G1–G33). The mechanism for each is `plan-architecture`'s.

## Hypothesis

> **We believe** a free canvas with ten generic primitives, compose-and-name for new parts, and a draft-then-ratify import path from Brilliant and Figma **will cause** the owner **to** build a real product's flow with its states from a discovery PRD inside ux-factory, **resulting in** a handoff pack a stakeholder can audit against the decisions that produced it.
>
> **We'll know we're RIGHT if** Faster Payment (four screens, its CoP and send states) is arranged on the canvas from its PRD in one sitting, and at least one component reaches the canvas through import rather than by hand.
>
> **We'll know we're WRONG if** the next real flow is arranged outside the canvas after the canvas exists, or a component that Brilliant or Figma could have supplied gets built by hand instead.

The wrong condition is the switch, not a stopwatch. By-hand and Brilliant stay available and untouched as the comparison, the same way the terminal is the control for wave 1. **Import time is recorded, never judged** (owner's call, 2026-08-28): the earlier ≤10-minute bar was a guess written before any spike ran; the observed simple case is 2:45–5:32 and the interactive case is unmeasured. The number the first five imports produce becomes the documented fact.

**Signal timing:** run-triggered. The vault's review date, 2026-09-30, stands as a check-in rather than a gate.

## Target user and JTBD

**Primary: the owner as operator.** Solo, at a laptop, holding a discovery PRD (run 1's, or the Faster Payment brief) and a brand pack. Has Brilliant open in another window, which is the thing to beat.

> **When** I've finished discovery and know what to build, **I want** to put real components on real screens, fan out every state, and draw the flow between them as fast as I could sketch it, **so I can** hand a stakeholder a prototype and a pack that trace back to the decisions, instead of a picture.

**Secondary, named and out of scope: an invited guest** (a hiring manager) building their own product on an unlisted instance. The canvas is built so the same surface serves them; the deployment (auth, budget, abuse handling) is the guest epic's.

**Non-users**

- The public reader of the shipped site. `/factory` keeps replaying committed runs, now onto the same free canvas with an automatic layout (G1); it gains no live tool and the public IA gains no page.
- Anyone wanting a general design tool: pen, vectors, free styling, pixel placement inside a screen. That is Brilliant's job and stays it.
- Teams. No multiplayer, no comments, no shared sessions.
- The recruiter doing a 90-second scan. Existing gate, unchanged.

## Constraints

Carried from the handoff §7 and the discovery PRD, unchanged.

- **C1 — shipped pages stay vanilla.** No framework, no build step, no runtime dependency, no live model call at view time. The live canvas is an operator surface in the portal; the public site replays.
- **C2 — token discipline.** Component styling is token-only; a new semantic token enters the contract first. Fidelity is achieved **through** the contract (exact values ride as pack tokens), never around it (literals). Concepts the contract lacks drop, and the drop list is shown.
- **C3 — honesty contract.** Attribution stated on every ported part; agent-run claims backed by real recorded runs; nothing hand-made presented as an agent's work, nothing agent-made presented as the owner's. Every import answers **Mode 1** (joins the system, wears every pack) or **Mode 2** (frozen exhibit, labelled as the original).
- **C4 — no AI slop** anywhere a human reads it: spec prose, UI copy, import reports, this document.
- **C5 — the vocabulary refusal stays.** The agent composes within the vocabulary or proposes a part for the owner to ratify. It never emits free HTML, and a refusal is visible, never a silent fallback.

## MVP

The thinnest line that can trip the wrong condition: **one real flow, with its states, from its PRD, on this canvas, with one imported part on it.**

1. **The free canvas.** An infinite, pannable, zoomable surface where frames (one per screen), state variants (a screen's empty, loading, error, partial and success as siblings fanned out beside it), annotations and flow arrows all sit at a free position. Zoom fits the work to the window exactly. Positions are view state saved with the run, never a claim about the product; **arrows are real connections** and are recorded. Retires the 12×8 grid and everything that mirrors it.
   **One substrate for every page (G1).** The grid file is shared by `studio.html`, `/factory` and `instance.html`, so the swap happens once for all three; the public `/factory` lays its replay frames out automatically (T5's rank layout: entry frame left, one column per rank) so it is tidy and deterministic, and its baselines are regenerated once in the same PR. No second canvas is kept.
   **A state is its screen plus its differences (G2).** The ideal frame is the base; each sibling stores only what it overrides (a message, a hidden part, a dialog on top). A fix to the base propagates; the handoff can say exactly what differs between states.
   **What else sits on the canvas (G25).** Free-text sticky notes (the G21 text subset) at any position, and, for a frame linked to a decision (G15), that decision as a small read-only card pulled from the run's PRD so the "why" sits beside the screen. Evidence cards and the rest of discovery's research stay in the discovery view.
   **Tidying (G28).** One-button auto-arrange (T5's rank layout), snap-to-neighbour guide lines while dragging, keyboard nudge by a spacing token, multi-select, and a full align/distribute panel (left · centre · right · top · middle · bottom · distribute horizontally/vertically). Every verb has a keyboard path with an announcement, the standing discipline.
   **Variants of a flow (G33).** A canvas is one run, one flow. Within it a flow may carry named variants (A / B) as lanes on the same canvas — variant B stored as differences on A, the G2 mechanism a third time — so two versions of Faster Payment sit side by side for comparison; the state diagram, the completeness check and the handoff report per variant. A different flow (International) is its own run and its own canvas; the briefing's O3 (counterfactual replay) is this, made concrete.
   **The chessboard leaves the share codec entirely (G12).** The arrangement field and its tamper cases are deleted; a link carrying one is refused as "made with an older version"; plain `/build` links, which never carried positions, are unaffected. No translation, no compatibility shim.

2. **Composed screens, not painted ones.** Inside a frame, parts sit in the frame's layout flow: drag to reorder, drag between frames, no pixel-nudging of a part's internals, no free styling. This is the token-contract boundary kept, and it is what lets a screen export as a composition rather than a picture. **Q2b closed: reorder within the layout grammar** (owner, 2026-08-28; the briefing's T3 gives the technical reason — the source tools are auto-layout-first, so pixel placement would be *less* faithful, not more).

3. **Device mode per frame (G20).** Mobile or desktop as the two families, chosen per frame, not per screen or per canvas. Width comes from a small committed preset table (several common phone, tablet and desktop widths, extendable) and can also be set by dragging the frame's edge; height starts at the preset and grows with content. The width is recorded per frame; state siblings inherit the base frame's width unless overridden (G2's rule applied to size). Native platform conventions (tab bars, sheets) are a later module (D20).

4. **Ten generic primitives**, so any product's screens can be composed — **five existing, five new (G24).** Existing parts ARE the primitives where one exists, untouched: **button** = `primary-button` + `ghost-button` · **card** = `card` · **dialog** = `modal-dialog` · **nav** = `nav-tabs` + `screen-header` · **text field / dropdown** = `text-field` + `select-field` (already generic; any string). New through the chain: **stack** (the layout box: direction, gap, padding, alignment, every value a spacing token) · **text** · **list** (G31: a container of the existing `list-row`s that owns the dividers, an optional section header and the empty case; import maps a source list to list + N rows) · **icon** (the source tools name icons; nav, buttons and rows all want one) · **choice** (G32: one part, `kind = checkbox | radio` plus a group name for exclusivity; same label/hint/checked/disabled props; `toggle-switch` stays separate because a toggle is an action, not a choice). No generic part replaces or duplicates an existing one, so the Verdant protos, the pack and the catalog are untouched.
   **text (G21):** one part. A `role` picks the size step from the type scale (display · heading · body · caption, one type token each), and the content carries the same inline subset the handoff viewer already renders (bold, code, soft breaks, bullet lists) through the shared `renderMarkdown`, never a fork; links are the one extension, made in that renderer so both consumers get it. Import maps a source font size to the nearest role. No font size, no free styling.
   **icon (G8):** renders by Phosphor name from a committed, generated subset — a generator copies only the icons a flow uses from the Phosphor package (MIT, recorded once); a name not in the subset is a visible refusal and one command adds it. No runtime library, no full vendoring.
   **dialog (G19):** a small card over the dimmed screen with a title slot (why the flow stopped), a body slot (what to check) and actions. It appears as a **state** of its screen (G2), never as a toggle inside the base frame, so the flow diagram shows it as its own node with arrows in and out. Deferred until a flow needs them: toast · table · media · chart slot. Each goes through the full chain like any component. The count is stated honestly either way: if Faster Payment needs an eleventh, it is added and named; if a primitive goes unused across the first flow, that is recorded too.

5. **Compose-and-name.** Select a group of parts on a screen and save it as a named component: a form group, a confirmation summary (card + list), a header with back button (nav + button + icon), a bottom action bar, a banner. No new styling, no hand-written spec; it is a saved subtree that wears every pack and can be dragged in again. **This is the default way a new part comes to exist.**
   **A saved group is a definition; each placed copy is an instance (G3).** Edit the definition and every copy follows; a copy may override a text or two (the screen title in a shared header). Same difference mechanism as G2.
   **Groups live with the run; promotion is admission (G17).** A saved group is a file in the run package. "Promote" hands it to the same admission path an import takes: the agent drafts the spec from the group's parts, the owner ratifies props and states, and it lands in `system/` as a normal component with "composed in run X" as provenance. One admission path, two entrances.

6. **Admission through the chain**, the escape when a composition cannot express the shape: a novel interactive control, a data-bound widget. The agent drafts the spec, the token-only styling and the render template from a Brilliant read, a Figma export or a description; the owner ratifies in the portal what a drawing cannot carry — props, states, behaviour, the accessibility model. The draft lands as a **proposal**, never directly in the vocabulary; ratifying admits it. The time is recorded with the run.
   **Ratify writes the files, runs the gates, and stops short of git (G6).** The click writes the spec, the CSS block and the render template, runs the four regenerators and `build-checks`, and shows the result; the git diff is the review and the owner commits. The portal already writes `traces/` and `replay/` into the repo; this extends that precedent to code. Nothing is committed on the owner's behalf.

7. **Import, read direction only.** Brilliant (structured read, token references preserved) and Figma (**a plugin export file dropped on the portal**, G9 — the same drop-a-file mechanism packs use, so no token, no per-file read budget, no Enterprise gate, no account rotation on the record; a second converter beside Brilliant's, both feeding one recognition step; the API read path stays what it is today: packs) as sources.
   **Starting an import (G10):** "Import selection" is the default button — the portal asks Brilliant what is selected right now (`get_selection`, observed) and reads that; "Browse the page" is the fallback — the canvas's elements loaded on demand, cached for the session, with thumbnails and multi-select. Both hand the same ids to the same converter and the same report. No paste-an-id door. The panel shows which Brilliant project the binding reads and offers re-bind when stale.
   **Unbound sources (G18):** a drawing with raw values (no token references) imports by nearest value — every snap listed in the report with its distance and editable per part in the mapping editor — and the snapping is customisable at two levels: the rules (tolerance per token family) and a remembered override table per source file, so the second import from the same designer reuses the owner's fixes. Nothing is refused for being unbound; the count of unbound imports is recorded.
   **When Brilliant is not there (G29):** a visible refusal naming what failed ("not reachable" / "bound to project X — re-bind?") with the one action that fixes it, and beneath it the same drop zone the Figma export uses, accepting a hand-exported Brilliant blueprint file. No silent retry, no cached guess; import never depends on the live connection being up.
   **Mode 2 stays beside the canvas (G7).** A frozen original is a labelled reference exhibit next to the flow for comparison; it can never be placed inside a frame. "No pictures" stays absolute. Two grains: a **component** → recognition against the vocabulary first (their list item is my `list-row`, decided deterministically) → compose-and-name or admission → renderable everywhere; a **screen** → recognised parts placed into a frame, unrecognised ones as visible refusals or proposals. The owner **edits the mapping** (rename, remap, drop), never the output, and the mapping persists with the run.

8. **The import report is the artefact.** Per part: what mapped by role, what dropped and why (the total list, in three classes: never read, read then dropped, read but never emitted), the fidelity delta shown rather than hidden, provenance and licence, and a **wrong-but-green check** — spike A shipped 12/12 WCAG while visibly not Polaris, and the report must be able to say so. Progress is stated by defect class closed, never by a percentage.
   **Its form (G30):** `imports/<id>.json` is the truth (machine-checkable, so a gate can assert "drop list present, fidelity measured"); `imports/<id>.md` beside it is written for engineers — the tokens the part uses and its component structure, readable without the portal; the portal renders the same record with the original and the mapped result side by side; the handoff pack carries the markdown. One source, three views, nothing hand-written.

9. **Admission policy (D1).** Recognise first; admit rarely. An admitted part is a first-class member of the vocabulary with its source recorded, wearing every pack (Mode 1). No pack-scoped layer unless a real application forces one. **Naming (D6):** a system name with the foreign name kept as provenance — spike C's `ds-person-row` is the precedent. **Both confirmed by the owner at the grill (G4):** an admitted part is a full member, named in the system's words, with "ported from <source>, <licence>" in its spec header.

10. **The agent on the canvas.** From the run package's PRD and board, the agent proposes screens and parts through the same recorded, replayable, one-call-one-op path the /build chain uses. It may say a screen is missing its error state; it may not draw that state's content without an op the owner can see. Every proposal is validated against the vocabulary before the owner sees it; a failure is a visible refusal.
   **One screen at a time (G13).** The agent proposes a screen (frame + parts), pauses; the owner accepts, edits or refuses; then the next. The discovery partner's rhythm, and each step is a clean replay unit.
   **One undo history (G26).** Every op, the owner's or the agent's, lands on the same undo stack in order; an accepted proposal undoes like any move (its frames go), and the recording keeps the fact that it was proposed and then undone. No second stack, no special case.
   **A missing state (G27).** The completeness check flags it on the screen ("error: missing"); an "Ask for a proposal" action turns the gap into an ordinary one-screen proposal (G13) the owner accepts or refuses. No frame appears until the owner says so; no placeholder frames.
   **The frame→decision link is proposed with the screen (G15).** When the agent drafts a screen from the PRD it names the decision(s) it came from; the owner confirms or changes it in the frame's side panel; a screen with no decision is flagged, never blocked. Stored as a field on the frame and exported as an `embodies` edge in the canvas file (T15). Q8 closed.

11. **State completeness as a check, not a property.** Every screen's frames are diffed against the required minimum (ideal · empty · error · partial · loading), with permission, offline and owner-named states opt-in. A missing state is reported, the way a missing render path is reported today. No tool surveyed does this; the gate is the capability.

12. **Run 1 — Faster Payment, from its PRD.** Input: the discovery run's PRD (#291) or, if it has not run, the brief written from the live page and labelled as such. Four screens (add payee → Confirmation of Payee → scam-safety stop → send), with the CoP states (match / close match / no match / unavailable), the stop, and send (pending / success / fail). At least one part arrives by import: a Brilliant-drawn element the owner did not draw for a test. Output: the flow on the canvas, the handoff pack, the import report, the elapsed time.
   **The pack is neutral (G11).** The flow is arranged under the neutral pack; the dock's one-click switch to saulera or verdant is the live proof of "wears every pack". No bank-flavoured pack is invented; the label stays "fictional flow, neutral skin".
   **Run home (G22).** The build's files live inside the discovery run's folder: `discovery/<slug>/build/` holds the canvas file, `groups/`, `imports/` and the handoff pack, so the PRD and the screens sit side by side and lineage by id never crosses folders. A flow with no discovery run (the stand-in brief, G23) still gets `discovery/<slug>/` with its `prd.md` marked "hand-written stand-in".

13. **The handoff pack, extended.** What exists today plus: the flow as a state diagram in plain text, the drop list, the refusal ledger, and the link from each frame to the decision it embodies (the decision already carries its evidence). Lineage runs pixel → frame → decision → answer → evidence, by ids.
   **Arrows start from a part when there is one (G5).** Drag from a button and the arrow records `click` on that part id; drag from empty frame space and it records `load`, `timer` or `condition` (T6's triggers). The arrow still binds to the frame for routing (T5), so moving a frame re-routes it. The state diagram can therefore say "tapping Continue goes to Confirmation of Payee", and a screen with two exits reads unambiguously.

14. **First slice — one frame, one stack, three parts, one arrow, one state.** Everything above is width. The spine: a frame at a free position holding a `stack` with a text, a field and a button; a second frame as its error state **stored as an override on the first** (G2), with the pack's one-click switch proving it wears every pack; an arrow from the button to the error frame (G5); the whole thing saved under `discovery/<slug>/build/` (G22), reloaded, and replayed on `/factory` through the automatic layout (G1). That proves the substrate swap, the first primitive, the state model, the arrow model and the recording in one pass. Primitives, compose-and-name, import and the agent's proposals are added on top.

**Door check.** The grid retirement is the one-way door: 12 files, four gate groups, the share codec's field and its tamper cases (deleted, not translated — G12), the keyboard path and its announcements all change together, and `/factory`'s and `instance.html`'s baselines regenerate once (G1). Architecture names the deletion list and the baseline cascade explicitly. Everything else is two-way: primitives are additive through the normal chain, compose-and-name is a saved file, import lands as proposals, and the portal is local and undeployed.

**Two decisions that ride alongside, not inside, the epic:**

- **The Plus UI pack is removed (G11, owner: "its spacing and design are way out of whack").** Footprint observed: `tokens.plusui.css`, the dock row, `pack-boot.js`'s allowlist, `pack-import`/`pack-imported`/`pack-derived`, `brand-import`, `build-import`, `studio-frames`, `portal/lib/figma.mjs`, `studio-journey.mjs`, the runbook; no dedicated baselines. Its own small PR, before the first slice, so the epic starts with no ported pack on the board.
- **The pixel gate grows to neutral + saulera + verdant (G14).** Verdant is not in `PACKS` today; adding it is one more baseline per page (~10 PNGs) in the PR that does it. A ported pack, when one lands through the export path, gets its baselines and an accessibility vet in the same PR that adds it — a rule written into the pack-import path, not gate work done now for a pack that does not exist. D5 closed.

## Success metrics

| Metric | Target | How measured | Cobra check → guardrail |
|---|---|---|---|
| **Switch** | The next real flow after the canvas exists is arranged on it | Where the flow was built, recorded in the run package | Forced once out of loyalty → the **second** unprompted flow must be too. Brilliant and paper stay available |
| **Completion (run 1)** | Faster Payment's four screens and its named states arranged from the PRD in one sitting | The run package holds the frames, the states, the arrows and the pack | Gamed by thinning the states → the **state-completeness check** (MVP 11) reports coverage with it |
| **Supply** | ≥1 part on run 1's canvas arrived by import; the by-hand chain was not used for any part import could have supplied | Provenance per part in the run package (composed / imported / admitted / hand-written) | Gamed by importing only trivial parts → the imported part's grain (static / interactive / data-bound) is reported with it |
| **Import time** | _No target — recorded, not passed_ | Elapsed time per import, recognition → ratified, written with the run | The observed numbers become the documented cost; a number set beforehand was a guess (owner, 2026-08-28) |
| **Composition over admission** | _No target — reported_ | Count of compose-and-name vs chain admissions over run 1 | If admissions dominate, the primitive set is wrong, not the owner |
| **Honest fidelity** | Every import report shows a total drop list and a fidelity delta; a wrong-but-green mapping is caught | Report contents; one deliberately wrong mapping (spike A run 3's green body text) must read red | Gamed by measuring nothing and scoring perfect → an empty measurement scores as **missing**, never as pass |
| **No pictures** | Zero parts with free styling or pixel placement inside a frame | The existing token-only gate plus the layout grammar; a literal is a red build | Gamed by pushing styling into a pack → the pack header states its source; a pack is not a stylesheet |
| **Nothing faked** | Every agent-proposed screen or part traces to a recorded op; every ported part states its source and mode | Run package and trace | Standing contract, unchanged |

## Non-goals

- **No general design tool.** No pen, vectors, boolean ops, free styling, or pixel placement of a part's internals inside a frame. Brilliant does that; this canvas composes.
- **No Brilliant as the canvas, and no raw export on a shipped page.** A raw HTML/React export is literals with no props or states; landed as-is it fails the token gate and the honesty contract. The conversion **is** the product.
- **No write direction.** Pushing the vocabulary into Brilliant so a designer draws with ux-factory's parts is a real, cheaper-than-thought path (spike C observed token-preserving writes exist) and is wave 3 with its own decision.
- **No guest deployment.** No auth, per-guest budget, rate limiting, unlisted instance or server-side runtime. The guest epic.
- **No new shipped-page surface.** `/factory` keeps replaying, now on the free canvas with an automatic layout (G1); its baselines regenerate once and then stay stable. No live tool on a public page, no new page in the IA. The shipped replay of a build run is later, or never.
- **No hallway round.** The "does the studio read as an exhibit to anyone but the owner" test (#223, never run) is dropped on purpose (G16): the success metric is the owner's own switch, and outside reactions belong to the guest epic, where a hiring manager is the user.
- **No chessboard compatibility.** Share links carrying grid positions are refused, not translated (G12); nobody but the owner holds one.
- **No native platform conventions module.** Per-frame device size only; iOS/Android conventions arrive with D20 when a native flow exists.
- **No retiring the baked-in prototypes.** D19 is replace-then-remove; the replacement does not exist until run 1 has produced its own receipts.
- **No a11y gating work.** D11's axe-in-CI is its own epic. New portal UI is built to 44×44 targets; every canvas verb keeps a keyboard path with an announcement, the standing discipline.
- **No bulk auto-conversion.** Recognition automates; admission never does. A novel shape is judged, every time.
- **No quality-attribute enforcement** from discovery's non-functional block; recorded there, wired later.
- **No evidence database, no peer agents, no findings from the agent.** Unchanged from wave 1.

## Open questions

- [ ] **Q9, the eleventh primitive.** Which of toast · table · media · chart slot the first flow after Faster Payment forces. International (live-updating numbers) is the likely second run and may want the chart slot. Stays open by design: answered by a flow, not a meeting.

**Resolved at the 2026-08-28 grill (G1–G33; each is folded into the section it governs above):**

| # | Question, plainly | Call |
|---|---|---|
| G1 | The grid file is shared by three pages; what happens to the public page? | One canvas for all; `/factory` auto-arranged; baselines regen once |
| G2 | Fix a typo on the main screen: do its state siblings follow? | Yes — a state is the base plus its overrides |
| G3 | Rename a button in a saved group: do the placed copies follow? | Yes — definition + instances, with per-copy text overrides |
| G4 | What does an admitted foreign part become, and what is it called? | Full member, system name, source and licence in the header (D1 + D6 confirmed) |
| G5 | Where does an arrow start? | From the part when there is one, else from the frame; trigger recorded |
| G6 | What does "ratify" do to the repo? | Writes the three files, runs gates, shows the diff; the owner commits |
| G7 | Where may a frozen (Mode 2) original appear? | Beside the canvas only, never inside a frame |
| G8 | Where do icon drawings live? | A generated, committed subset of Phosphor, by name; a missing name is a refusal |
| G9 | What does Figma supply? | Packs (as today) plus components via a plugin export file; no API reads for components |
| G10 | How is a Brilliant import started? | Selection first; browse-the-page as fallback; one converter |
| G11 | What pack does run 1 wear? | Neutral; the Plus UI pack is removed in its own PR |
| G12 | Old links with grid positions? | Refused; the field and its tamper cases are deleted |
| G13 | How much does the agent draft before you react? | One screen at a time |
| G14 | Which packs get the pixel gate? | neutral + saulera + verdant now; a ported pack when it lands |
| G15 | Who links a frame to its decision? | The agent proposes with the screen, the owner confirms; a field on the frame (Q8 closed) |
| G16 | The hallway round? | Dropped on purpose |
| G17 | Can a saved group become a real component, and where do groups live? | Groups live with the run; promotion is one-click admission |
| G18 | A drawing with raw values, no token names? | Import by nearest value; every snap editable; rules and per-source overrides customisable |
| G19 | Is a dialog a part or a state? | A state of its screen, holding a dialog part; its own node in the diagram |
| G20 | Frame sizes? | Preset table (several common widths) + free edge-drag; width recorded per frame |
| G21 | What is "text"? | One part: a size role from the type scale + the shared inline markdown subset |
| G22 | Where does a build run save? | `discovery/<slug>/build/`, inside its discovery run |
| G23 | Wait for #291? | No; the labelled stand-in brief; the PRD replaces it when the run exists |
| G24 | Four "new" primitives already exist as parts; replace or reuse? | Existing parts are the primitives; only stack, text, list, icon, choice are new |
| G25 | What else sits on the canvas? | Sticky notes, and the linked decision as a read-only card |
| G26 | Does undo walk back an accepted AI screen? | Yes; one history for every op |
| G27 | What does the agent do about a missing state? | Flags it and offers a one-screen proposal; no placeholder frames |
| G28 | Tidying tools? | Auto-arrange, snap guides, nudge, multi-select, and a full align/distribute panel |
| G29 | Brilliant not reachable? | Visible refusal with the fix, plus a file drop for a hand-exported blueprint |
| G30 | What is the import report, physically? | JSON as truth + an engineer-facing .md beside it; the portal renders both |
| G31 | What is "list"? | A container of the existing list-rows: dividers, optional header, empty case |
| G32 | Checkbox and radio: one part or two? | One: `choice`, kind = checkbox or radio, with a group name |
| G33 | One flow per canvas, or many? | One run, one flow per canvas; named A/B variants as lanes within it |

**Closed during the 2026-08-28 interview:** the thesis (the build half after discovery, not a recruiter exhibit) · what "create a component" means (both compose-and-name and admission, compose-and-name the default) · the primitive set (eight plus icon and checkbox/radio; four deferred) · whether discovery composes anything (no; this epic does) · Q2b (reorder within grammar) · Q6 (the live canvas is a portal surface; `/factory` replays; `studio.html` stays the raw harness) · the import time bar (none; recorded, not judged) · the wrong condition (the switch, not a stopwatch) · D2 (moot: the owner's own product first; the public gallery is not this epic's).

**Addendum 2026-08-28, after the slice — the owner drives.** Product calls made after reading the NUU case study
(a designer driving Claude interactively, unrecorded) against this epic's posture (fenced, traced, one op per call,
owner ratifies). The bet stays; the owner's control becomes granular: **D1** one inbox of everything waiting on the
owner, across discovery and build · **D2** decisions have blast radius — re-record one and every screen built on it
says so until the owner re-confirms · **D3** the owner briefs each turn · **D4** every proposal carries its one-line
why, refused without it · **D5** at a fork the agent offers two and the owner picks · **B5** a written conventions
file for the agent if S6 shows the vocabulary alone is not enough. Run 1 exercises all five. Mechanisms in the
architecture doc's addendum; tickets #318–#321 plus amendments to #302, #308, #312, #316.

## Architecture

Architecture: [canvas-design-import.architecture.md](./canvas-design-import.architecture.md) (decided 2026-08-28)

Handed to it, deliberately not decided here: the grid retirement's deletion list and the baseline cascade for `/factory` + `instance.html` (G1) · the override format for states and group instances (G2, G3: one mechanism, two uses) · the two converters' placement and the shared recognition rules (G9) · the proposal format and where proposals live before admission · the ratification UI and the exact write-then-gate sequence (G6) · the third recorder and its fence · the op vocabulary additions (the briefing's twelve-op shape, plus the arrow's part id and trigger, G5) · the canvas file shape for frames, groups and research cards under `discovery/<slug>/build/` (G22, T15) · the icon subset generator (G8) · the device preset table (G20) · the snapping rules and the per-source override table (G18) · the variant-lane representation and how the diagram and the check iterate it (G33) · the align/distribute verbs and their keyboard path (G28) · the decision card's read path from `prd.md` (G25) · the import record's schema and its markdown projection (G30) · the state-completeness check's home · spike C's recorded facts (deterministic role mapping on token references; the in-process recorded-run transport; the four regenerators an admission must run, not one) · the briefing's T1–T16 technology verdicts and S1–S4 spikes, taken as named calls.

**Related:** [discovery-partner.prd.md](./discovery-partner.prd.md) (wave 1; the run package this consumes) · [prototype-studio.prd.md](./prototype-studio.prd.md) (§Non-goals "no free arrangement" is **amended** by MVP 1–2: the free canvas is the one substrate, the shipped `/factory` replays onto it with an automatic layout — G1) · [ai-first-ux-factory.prd.md](./ai-first-ux-factory.prd.md) (§8 unamended: no live model at view time on shipped pages) · `__canvas_planning_PRD.md` (the briefing; §18 is the pipeline picture, §24 the technology verdicts).
