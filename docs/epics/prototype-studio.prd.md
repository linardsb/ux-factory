# PRD — Prototype Studio

**Status:** planned · **Owner:** Linards Berzins · **Created:** 2026-08-03
**Architecture:** [prototype-studio.architecture.md](./prototype-studio.architecture.md)
**Supersedes:** remaining scope of [prototyping-feel-uplift.prd.md](./prototyping-feel-uplift.prd.md) (epic #164) — see §Amendments.

## Problem

An employer evaluating this portfolio still mostly *reads about* the capability instead of experiencing
it. Three symptoms:

1. **The core concept is scattered.** "Brief in, product out, by a real method" spans six surfaces —
   home's drop zone + wizard, /build's questions/board/pattern, factory's trace/graph/round-trip
   exhibits, the study and trace pages, the protos. No single place shows the whole thing happening.
2. **Interaction tops out at forms.** After #164's shipped waves the site has 75 manipulable controls (`system/param-count.json`),
   but they are toggles, steppers and one editable list-board. None are the direct-manipulation
   gestures — drag, arrange, compose — that a prototyping tool is recognized by.
3. **The methods are answered ABOUT, not performed IN.** Singer's breadboard and Eyal's Hook model —
   the portfolio's stated backbone — appear as question forms and verdict panels, not as the working
   surface that produces the visible artifact.

Cost of not solving: the site's strongest claim stays a claim, the evaluator's skepticism survives the
visit, and the craft bar for the target roles ("the site itself is graded as a work sample") is not met.

## Evidence

- Owner's review across three iterations, verbatim trajectory: v2 "alright but nowhere near" →
  post-#164-waves "still nowhere near the look and feel of a prototyping tool" → 2026-08-03: "toggle
  this, toggle that and some colours change… I want to move components around… it has to feel like
  I'm actually in a prototype tool."
- The v3 hiring research (`.claude/plans/ux-overhaul-v3-prd-research.md`): the site is graded as a
  work sample; "interactive toys that map to no real capability" is a named disqualifier; peak-end
  rule demands one unmistakable peak. The current site's peak (the /build pattern reveal) is form-fed.
- Concept scatter is checkable: walking brief→product today requires visiting four or more pages.
- The documentation reference named by the owner: **appica.dev/ui** (reviewed 2026-08-03) — per-component
  live playground with prop controls, API tables, a11y sections, ⌘K search, copy-page-as-Markdown for
  AI agents. The gap it exposes here is presentation, not substance: this repo already *generates* specs,
  a handoff pack and an agent vocabulary; it never presents them at that grade.
- **Why now:** the substrate is real and shipped — committed agent runs, committed-rules-in-browser,
  generated docs layers, the token contract, the share codec. The missing piece is the *medium*, not
  the capability.

## Thesis

> **The portfolio becomes the tool it describes:** one studio canvas where a brief visibly becomes a
> product — first performed by a replayed real agent run, then continued by the visitor's own hands —
> with the method (breadboard, Hook loop) as the working surface rather than the subject matter.

Why this beats how evaluators cope today (reading and choosing whether to trust): direct manipulation
converts claims into experienced capability. The differentiation is specific: no portfolio — and no
component library — shows a product method *compiling into a working product* under the visitor's own
brand, with honesty-labeled real agent runs and appica-grade generated documentation of the system
underneath. The docs prove the system is real; the studio proves the method is real; the export proves
the product is real.

## Hypothesis

**We believe** rebuilding the core experience as one studio canvas — watch a real recorded run assemble
the product, take over with full prototype-tool affordances, leave with the artifact — **will cause**
hiring managers (with recruiters and technical deep-divers around them) **to** experience "brief in,
product out" instead of reading about it, **resulting in** more evaluators leaving with the artifact
and more first-round conversations.

- **RIGHT if:** the studio's keep/share virtual routes (share link created · runnable file or pack
  downloaded) fire above the current /build keep-rail baseline within 4 weeks of the first public wave,
  AND the take-over route (visitor edits the replayed build) fires in real sessions weekly.
- **WRONG if:** keep/share stays at or below the /build baseline after 4 weeks live; or hallway tests
  (3–5 people) show visitors watching without ever grabbing the wheel; or a guardrail moves — INP
  > 200 ms on studio interactions, dropped-frame drag on a base-spec laptop, or the keyboard path
  failing for any canvas verb.

## Users & JTBD

- **Primary — hiring manager (5–15 min):** "When I'm screening a senior AI-first UX-engineer candidate,
  I want to watch them run a real method from brief to working product, so I can justify an interview
  with evidence instead of claims." Default entry: the replay is already running; the wheel is
  visibly grabbable.
- **Recruiter (90 s):** watch mode — the replay as trailer. Role fit stays legible within 5 seconds
  via home's short gate.
- **Deep-dive UX engineer:** expert mode — the full tool, inspector docs, repo links, gates visible.
- The three are **entry modes of one surface**, not separate builds.
- **Non-users:** mobile visitors author nothing (they watch the replay and use the form path); anyone
  seeking a general-purpose design tool — the studio composes only this system's validated vocabulary
  within its pattern grammar.

## Scope (what the studio IS — from the 2026-08-03 interview, 10 rounds)

1. **The site IS the tool.** Home compresses to a short gate (billboard + live re-skin proof → studio).
   The studio absorbs /build's six acts, factory's exhibits (trace player, system graph, round-trip),
   and — as device frames on the canvas — the two protos. The handoff viewer stays standalone.
   Approach/work/contact trim to evidence layers. **/build survives as the form-mode fallback** over
   the same build data and share links.
2. **Hero mechanic and peak: the breadboard COMPILES into the product.** Places become screens,
   affordances become components, connections become navigation. Fat-marker first: rough low-fidelity
   blocks snap into real token-skinned components at the compile beat — the altitude shift performed live.
3. **Product out = a connected flow (2–4 screens),** clickable end to end, under the visitor's brand
   (imported tokens or one colour). The keep rail grows: runnable single-file HTML export + per-build
   handoff pack + the share link carrying the arrangement.
4. **Draggability principle:** everything component-like is draggable — staged so the process flows
   naturally, never cluttered. Position is **meaningful within the pattern grammar** (persists into the
   share artifact and exports), not free-pixel placement.
5. **Full prototype-tool affordances:** pan/zoom with snap, undo/redo, marquee multi-select, alignment
   guides, context menu, zoom-to-fit, hand tool, docked inspector, layers list, minimap. **Full keyboard
   parity for every canvas verb** (WCAG 2.5.7) with live-region announcements — the breadboard's
   existing discipline, extended.
6. **Method embodied:** the ten questions (Hooked ×7, Shape Up ×3) become on-canvas cards whose answers
   visibly alter the artifact beside them — the stepped wizard dies. The Hook loop is an assemblable
   four-node diagram (trigger → action → variable reward → investment) whose completion unlocks the
   ethics verdict.
7. **The brief:** canned briefs replay REAL pre-recorded agent runs on the canvas — ghost-cursor build
   through the PIV acts; the trace player and study surfaces merge into this replay layer — forkable by
   hand afterwards. The visitor's own path stays structured (tokens/colour + method cards, committed
   rules). No live model calls.
8. **Docs, appica-grade, generated:** click any placed component → its docs open in the inspector; the
   same generated source renders as a hash-routed, linkable catalog. Per component: live playground
   with prop controls, API/token tables, a11y notes, ⌘K searchable, copy-as-Markdown-for-AI, Figma
   link-out. Code tabs: HTML + token classes · vd-* elements · React via wrapper · vocabulary JSON.
   **The catalog grows by ~10 common UI components** (spec-first, through the full generation chain)
   on top of the existing real set — the count stated honestly either way.
9. **Per-company instances re-shell onto the studio** (pre-seeded with the company's derived pack and a
   bespoke recorded run) after the public studio ships; parked epic #86 lands here.
10. **Full gate rigor rides along (~⅓ of effort):** deterministic at-rest states, journey driver,
    transition verification, the a11y pass, the INP budget.

**Appetite:** one big batch (~6 focused weeks), shipped as waves behind the working site. Overruns cut
scope — pre-agreed first cuts: the Full-tool extras (layers list, minimap) and the 10 new components —
never extend time. Deadline is rolling: each landed wave strengthens the next application.

## MVP (thinnest end-to-end proof)

One studio surface where ONE canned brief replays a real recorded run assembling the existing pattern
on the canvas; the visitor can take over (drag, with keyboard parity); and they can leave with the
artifact (share link + one export), instrumented with the win-metric routes. That alone tests the
hypothesis's heart — *experienced* vs *read* — before flows, the new components, the docs catalog, or
instances. Everything else ships as waves; slicing decides the order.

## Success metrics

| Metric | Target | Measured by |
|---|---|---|
| Keep/share | above the current /build keep baseline within 4 weeks of wave 1 | one-shot virtual routes (share created · export downloaded) |
| Take-over | the "visitor edited the replay" route fires weekly | one-shot virtual route on the edit success path |
| Responsiveness | INP ≤ 200 ms on studio interactions; no dropped-frame drag on a base-spec laptop | PerformanceObserver + tooling check (inherited from #164) |
| Accessibility | every canvas verb has a working keyboard path; zero WCAG 2.5.7 violations | journey driver + manual audit |
| Docs depth | every catalog component (existing + new) at full depth, generated, drift-checked | CI drift check |
| Hallway test | 3–5 real evaluators; the biggest observed confusion fixed before epic close | recorded hallway sessions |

## Non-goals

- No multiplayer/comments. No user accounts. No plugin API.
- No mobile AUTHORING parity — mobile watches the replay and uses the form path.
- No live LLM calls at view time — unchanged hard rule; the studio replays committed real runs.
- **Not a general-purpose design tool:** the canvas composes only the system's validated vocabulary
  within its pattern grammar — no arbitrary drawing, no free styling. (This boundary is what lets the
  original "No Figma-like canvas" non-goal be amended rather than deleted.)
- No hand-written docs, traces, or compositions — everything presented as system output is generated
  or a labeled real run.

## Amendments to recorded decisions

1. [ai-first-ux-factory.prd.md](./ai-first-ux-factory.prd.md) §8 non-goal "**No Figma-like canvas** —
   an in-browser design surface is a different product" — **AMENDED (2026-08-03):** a *method-bound
   composition studio* becomes the portfolio's centrepiece. The surviving boundary: no arbitrary
   drawing or styling; only the system's own components within the pattern grammar.
2. [prototyping-feel-uplift.prd.md](./prototyping-feel-uplift.prd.md) (epic #164) "**No rebuild**" —
   **SUPERSEDED:** #164 closes with an honest note; its unshipped scope folds into this epic
   re-targeted at the studio (pan/zoom exhibit → the canvas, inspect coverage → the inspector,
   proto pack skin → protos-as-frames, INP close → studio gates).
3. [portfolio-v3-experience.prd.md](./portfolio-v3-experience.prd.md) "demo spine" framing —
   **EVOLVED, not discarded:** the spine survives as home's short gate and as the replay's chaptered
   acts inside the studio.

**Invariants that survive untouched:** the honesty contract · neutral "ux factory" chrome + calm
palette · repo-as-inspectable-proof (committed artifacts, no build step) · the token contract as the
system's spine · vanilla shipped pages — the canvas is hand-written, and "a prototype-tool surface in
vanilla JS" joins the pitch itself.

## Open questions

- [ ] Which ~10 common UI components (candidate list drafted at architecture; each is spec-first
      through specs → tokens → components.css → handoff → vocabulary → checks).
- [ ] How the five patterns map to flow screen types, and which canned briefs/scenarios demo a
      2–4-screen flow best.
- [ ] Studio route name, and what remains at /factory and the merged exhibit routes (redirects vs stubs).
- [ ] Wave order beyond the MVP (flows vs docs catalog vs new components vs protos-as-frames) —
      decided at slicing against the 6-week appetite.
- [ ] Instance migration timing — which live application gets the first studio-shelled instance.
- [ ] Hallway-test recruitment (3–5 people) and script.
- [ ] Gate sequencing: #190 (stack-audit hazard-A false positives) lands before the studio names
      anything for view transitions.

## Architecture

Decided 2026-08-03 → [prototype-studio.architecture.md](./prototype-studio.architecture.md): one
canvas surface over /build's existing data layer (one board stays the truth; places become the
flow's screens), re-recorded incremental agent runs projected into a drift-checked replay artifact
played over the action bus's `agent.*` half, share-codec v2 grid-slot arrangement, a view-time-
joined docs catalog with one new `example` spec field, autoplay-to-completion as the gated at-rest
state, a no-mode-UI behavior gradient — shipped at `/factory`.
