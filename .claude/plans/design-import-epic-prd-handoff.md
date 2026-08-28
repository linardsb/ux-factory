# PRD handoff — design-import epic (working name: the absorbing system)

Status: exploration summary, pre-PRD. Produced 2026-08-19 from the exploration session.
Input to `plan-create-prd`; open owner decisions are D1–D7 (§5), interview questions in §8.

## 1. The idea, narrowed

Import any design system, component set, or token export into ux-factory and present the
result to recruiters as portfolio items.

The exploration landed on a sharper thesis: **the product is not ported components — it is
the import pipeline as a visible, gated capability, with a small number of ports as its
proof.** The portfolio item is the port *run* (mapping report, contrast negotiations,
refusals, fidelity deltas), never the ported artifact alone. The recruiter-facing claim:
"my platform can absorb your design system, and here is the evidence trail."

Frames agreed during exploration:

- **Projection, not reproduction.** A port projects a foreign system onto the token
  contract's slots. Fidelity is achieved THROUGH the contract (exact values carried as
  pack tokens), never around it (literals). Token concepts the contract lacks drop — and
  the drop list is itself presentable content.
- **Mode 1 vs Mode 2 — every import answers this fork.** Mode 1: the component JOINS the
  system (token-only CSS, wears every pack, pixel-faithful under its own Brilliant/brand
  pack because the pack carries the exact values). Mode 2: it stays FROZEN as a
  brand-locked exhibit (iframe embed or instance, labelled as the original). Mode 2 is
  what a side-by-side fidelity exhibit wants anyway.
- **Recognition vs admission.** Recognition — their `ListItem` is my `list-row`, props map
  like so — is deterministic comparison against the vocabulary and CAN be automated, even
  as a committed-rules in-browser flow (the /build pattern). Admission — a genuinely novel
  shape entering the vocabulary — always costs judgement: spec, token-only CSS, renderer
  template. No accumulation removes that; it makes it rare.
- **The flywheel.** The vocabulary only grows. Each admission makes future imports
  cheaper; whole-system imports converge toward token-drop + recognition. Arguably the
  epic's strongest claim, and the reason the recognition matcher may deserve to be a
  shipped capability rather than tooling.
- **Attribution is non-negotiable** (honesty contract). "Their design, my contract"
  grammar, pack-header pattern extended. Proprietary systems appear only in unlisted
  per-company instances, never the public gallery.

## 2. Feasibility map (aligned)

Possible:

- **P1** — token porting, today: any name→value export → role-mapped, contrast-negotiated
  pack (`pack-import.mjs`). Colours, type, spacing, radii survive; missing contract
  concepts drop visibly.
- **P2** — "my catalog in their skin", today: a ported pack re-skins ~31 components, the
  catalog, the studio, both protos. Zero new code.
- **P3** — component porting, by hand or by build-time agent: the spec chain admits any
  shape the vanilla constraint allows; once admitted, catalog docs, studio placement and
  agentic composition are free by construction. A recorded port run is feasible with the
  existing `record-build.mjs` fenced-run machinery.
- **P4** — honest fidelity exhibits: the #40 ΔE/verdict pattern generalises to "what the
  port kept and lost".
- **P5** — reader-side demo: a recruiter drops THEIR tokens and watches ported components
  wear their brand (/build Act 0, exists).

Not possible:

- **N1 (refined)** — novel shapes cannot land unjudged. Bulk auto-conversion of
  components is out; recognition automates, admission never does.
- **N2** — view-time AI porting. No live LLM calls on shipped pages; porting runs at
  build time, committed, replayed.
- **N3 (refined)** — pixel reproduction OUTSIDE the contract. Literals in
  `components.css` are a red build; exact values via a pack are fine (Mode 1), a frozen
  original is fine as a labelled exhibit (Mode 2).
- **N4** — a hand-made port presented as an agent run. If the exhibit says the agent
  ported it, it must be a real recorded run.
- **N5** — a ported skin reaching embedded frames automatically. Custom properties do not
  cross document boundaries (#219/#268); frames need their own pack line re-pointed.
- **N6** — framework-dependent components at view time. The WC/React story is export-side
  (wrappers), not import-side.

## 3. Repurposable capability inventory

Works today, unchanged:

- `system/pack-import.mjs` — the token port engine (four consumers already).
- `tooling/figma/figma-pull.mjs --from` — same engine from the CLI, no API quota.
- `agent-layer/build-instance.mjs --pack` — a ported pack ships inside an unlisted
  company instance.
- /build Act 0 + home drop zone (`brand-import.mjs`) — reader-side token drop with the
  WCAG mapping report.

One small edit each:

- `system/dock.mjs` — `PACKS` + `PACK_RE` per pack to make it switchable/persistent.
- A work.html entry per presented port.

Precedent only (code exists, shaped for something else):

- `tooling/figma/figma-parity.mjs` — the port-report pattern (diff a foreign source
  against the contract).
- `system/derivation-roundtrip.mjs` (#40) — the fidelity exhibit (ΔE, human gate,
  verdict).
- `system/pattern-render.mjs`'s out-of-library refusal card — the honest "does not map"
  outcome, currently unexercised and waiting for exactly this.
- `system/studio-frames.mjs` — side-by-side embeds (frozen to two committed proto pages
  today; FRAMES is a frozen descriptor list).
- `portal/record-build.mjs` + `traces/` + `replay/` — fenced, traced, replayable agent
  runs; the machinery for a recorded port run.

No capability, only the manual chain:

- Component admission: `system/specs/<name>.md` → token-only `components.css` block →
  `agentic-renderer.mjs` template → regen `gen-handoff` + `gen-vocabulary`. Gated by
  build-checks group 3 (every vocabulary entry needs a full render path).

## 4. Candidate workflows

- **W1 — wear their tokens.** Export → pack → mapping report → presented. ~90% exists;
  missing the committed port-report artifact and a presentation slot.
- **W2 — port one component.** One foreign component → spec against the contract →
  catalog presents it → fidelity exhibit beside the original. Missing: drafting tooling +
  the side-by-side surface.
- **W3 — refuse one honestly.** A component that does NOT map, shown as a reasoned
  refusal. Cheap; what makes W2 credible.
- **W4 — their system, their instance.** W1+W2 scoped to a target company, deployed
  unlisted via `build-instance.mjs`. Mostly assembly.

Narrowing recommendation: the recruiter-facing MVP exhibit is **one system, one
component, one refusal** (W1+W2+W3 told as a single story), with W4 as the
application-time payoff.

## 5. Open decisions (the PRD/architecture must settle)

- **D1** — canon vs scoped admission: are ported components first-class vocabulary
  citizens, mapped onto existing components by default, or a pack-scoped extension layer?
  (Exploration instinct: map-onto-existing is the default, canon admission is rare and
  priced, scoped layer only if a real application demands it.)
- **D2** — gallery vs per-company first: public "ported systems" shelf, target-company
  unlisted instances, or one epic where the gallery demos the per-company capability?
- **D3** — recognition matcher: shipped capability in MVP, later ticket, or never?
- **D4** — open-issue fold-ins: #268 (brand does not reach the frames — literally W1's
  presentation gap on /factory) and #271 (a11y gates — would vet every ported pack;
  arguably epic foundation).
- **D5** — VR/baseline policy for ported packs (VR currently captures neutral + saulera
  only; new packs churn nothing — is that kept deliberate?).
- **D6** — naming policy: do ported components keep foreign names or take system names?
- **D7** — the falsifiable hypothesis and its metric (what observable recruiter behaviour
  proves/kills this epic).

## 6. Pre-slice sequencing

1. Close epic #202 first (owner's recorded verdict: finish #214–#223 then re-judge):
   #223 epic close, #264 defect, #262 + #273 advisories batched in; triage #268 into this
   epic per D4.
2. **Spike A (zero-code):** port one real public system's tokens (Material / Polaris /
   Carbon) through the existing engine; harvest what the mapping report lacks as a
   recruiter-facing artifact.
3. **Spike B (costed):** hand-port ONE foreign component through the spec chain and time
   it; the per-component number decides epic scope and D1 concretely.
4. `plan-create-prd` (this file as input) → `plan-architecture` (D1 + D2 the named
   decisions) → `piv-slice-epic`.

## 7. Constraints the PRD must not contradict

- Shipped pages are vanilla: no framework, no build step, no runtime deps, no view-time
  LLM calls. Agent work is build-time, committed, replayed.
- Token discipline: `components.css` is token-only; new semantic tokens enter
  `tokens.source.json` (contract group) first, then regen.
- Honesty contract: attribution stated, agent-run claims backed by real recorded runs,
  fidelity deltas shown rather than hidden.
- Gates that will fire: build-checks group 3, VR baselines for any at-rest shipped-page
  change, `param-manifest.json` for new live controls, loc-summary regen for new tracked
  files.
- Fonts must be shipped/licensed; vector art travels as inline SVG content (allowed).

## 8. Interview questions for the PRD session

### Thesis and problem

1. What specific hiring conversation does this capability win that the current portfolio
   loses?
2. Which sentence goes on the page: "I can absorb your design system" or "I built a
   system with absorption capacity"? Whose voice is it in?
3. Who exactly is the reader this convinces — recruiter, design lead, staff UXE? Rank
   them.
4. What does the reader DO after seeing a port — what is the conversion action?
5. What does this add over the existing /build flow (their tokens, their product)? Why is
   a port more convincing than Act 0's re-skin?
6. Is the pain being solved "portfolio looks generic" or "claims are unverifiable" — or a
   third thing?
7. If a design lead's first reaction is "so you copied Material", what on the page
   pre-empts that in the first five seconds?

### Hypothesis and metrics

8. What observable outcome falsifies this epic (e.g. zero mentions across N
   applications)?
9. What is the measurable proxy — instance click-through, time on the port exhibit,
   replies referencing it?
10. Over what window and how many applications is the hypothesis judged?

### Scope and MVP

11. Which ONE public design system is the MVP subject, and why that one (licence,
    recognisability, token export quality)?
12. How many components does the MVP port — one, three, ten? What does Spike B's number
    change?
13. Is the refusal exhibit (W3) in MVP? Which component refuses, and on what stated
    ground?
14. Is the recognition matcher in MVP (D3), a later ticket, or out?
15. Is the MVP port hand-made with honest labelling, or a recorded agent run (N4 binds
    the labelling either way)?
16. Does the recruiter interact (drop THEIR tokens onto ported components) or is the MVP
    curated-only?
17. Where does it live — a new page, a /components extension, a work.html case study, a
    /factory station?
18. Does the studio present the port (side-by-side frames) in MVP, or is that a later
    exhibit?
19. What is explicitly deferred to post-MVP even if cheap?

### Admission policy (D1)

20. Are ported components first-class vocabulary citizens or a scoped layer?
21. What is the admission bar — who decides a foreign shape is "genuinely missing" from
    the vocabulary?
22. Who maintains a ported component when the contract evolves — and does the PRD accept
    that maintenance cost forever?
23. What stops the vocabulary becoming a junk drawer — a cap, a review gate, a removal
    policy?
24. Naming (D6): `material-chip` or a system name with provenance recorded in the spec?

### Presentation and honesty

25. What is the exact attribution grammar — the sentence pattern that states whose design
    work it is?
26. If an agent drafts a spec and a human edits it, what is the honest label?
27. Are fidelity deltas always shown, or only above a threshold? Who sets the threshold?
28. Does a port exhibit show the drop list (token concepts the contract lacks) as
    first-class content?
29. How is Mode 1 vs Mode 2 communicated to a non-technical reader?

### Per-company use (D2)

30. Gallery first, per-company first, or one epic where the gallery demos the
    per-company capability?
31. What is the legal/comfort line on using a target company's tokens and component
    shapes in an unlisted instance built for their application?
32. Does the per-company port fold into `build-instance.mjs` as a flag, or stay manual
    assembly?
33. Does a per-company port ever graduate to the public gallery (with permission), or
    never?

### Technical and gates

34. Do ported packs enter `dock.mjs`'s hard allowlist (an edit per port) or does the epic
    build a scoped switcher?
35. VR policy (D5): do ported packs get baselines, or is neutral+saulera-only kept
    deliberate and recorded?
36. Which build-checks groups must a port pass before it counts as landed — and does the
    epic add a "port gate" group?
37. Does #271 (a11y gates) land first as epic foundation, so every ported pack is vetted
    from day one?
38. What happens to #268 — close as the documented decision, or fix so a ported pack
    reaches the studio frames?
39. Does each port produce a standard committed artifact set (port report, spec, trace,
    fidelity diff) — the figma-parity generalisation?

### Flywheel and long-term

40. What is the target per-component port cost after tooling (hours), and at what library
    size does a whole-system import become token-drop-only in practice?
41. Is there a public "absorption capacity" indicator (N systems worn, M components
    recognised) — and is that honest or vanity?

### Risks and non-goals

42. What is the risk budget for this reading as gimmick vs craft — and who sanity-checks
    the exhibit before it ships?
43. Licensing check per named system's token export — who does it and where is it
    recorded?
44. Opportunity cost: this epic vs #243 (ST/UX) — which is the stronger next signal for
    the £70–80k bar, and why?
45. Confirm the non-goals: no view-time AI, no pixel reproduction outside the contract,
    no bulk auto-conversion, no framework components, no unattributed ports.

## §9 Spike results

Both spikes run 2026-08-20 in a clean worktree at origin/main `9cd9696` (#221). Spike
branch `spike/design-import-foreign-component`, commit `36d0259`, pushed and **kept
unmerged — no PR, nothing on main**. Every number below is observed from a real run;
quoted text is verbatim engine/page output (honesty contract). Raw outputs, harness
scripts and screenshots ride beside this doc in `design-import-spike-a/`.

### 9.1 Spike A — Polaris v7 tokens through the existing engine (zero code)

**Material.** Shopify Polaris v7.0.0's public token export — the 8 JSONs at
`cdn.jsdelivr.net/npm/@shopify/polaris-tokens@7.0.0/dist/json/` (border, breakpoints,
color, font, motion, shadow, space, zIndex), 238 tokens total, merged mechanically FLAT
(`design-import-spike-a/merge-polaris.mjs`): Polaris names are already globally unique and
self-prefixed, the engine's walker flattens either shape identically, and flat keeps every
name byte-identical to what Polaris publishes — the provenance story wants that.

**The runs** (engine-direct via `system/pack-import.mjs`'s exported API; full log in
`design-import-spike-a/spike-a-engine-output.txt`):

- **Run 1, the export as published → REFUSED** (observed): `figma-pull: none of the 238
  styles read is a colour, so there is no ramp to map roles onto…`. Cause: `leafEntry`
  recognises colours only as **hex strings** and dimensions only as **numbers or px
  strings**; Polaris publishes `rgba()` (137/137 colours) and `rem` (49 dimensions). A
  real modern public system's export reads as 238 name-parity-only entries.
- **Run 2, after a mechanical rgba→hex + rem→px pre-pass** (137 + 49 conversions,
  deterministic arithmetic, no judgement — the shim recorded as a deviation) **→
  REFUSED** (observed): `figma-pull: no near-grey ramp found for the neutral role — name
  one with --neutral <hue>. Ramps: color(chroma 0.149)`. Cause: Polaris v7's colour names
  are SEMANTIC (`color-bg-surface`, `color-text-critical`) — no `hue/step`, no `/` — so
  `deriveRamps` groups all 137 under the one prefix `color`: a single 137-rung mega-ramp
  ordered by lightness, mid-rung chroma 0.149, no neutral candidate.
- **Run 3, + explicit `neutral:"color", accent:"color"` overrides → MAPPED** (observed):
  64 contract tokens emitted, 29 auto-filled from contract defaults, **12/12 WCAG pairs
  pass** after 3 negotiations (`color-fg-muted color/500→/626`, `color-accent
  color/599→/626`, `color-accent-secondary color/599→/626`). But the lightness-ordered
  mega-ramp makes the fills semantically wrong while formally green: `color-fg ←
  color/897 = "color-text-success-strong"` — **a green as body text** — and `type-display
  ← "font-line-height-7"` — **a line-height ranked as the largest type size** (the #127
  weights-in-the-type-pool defect class; weights are excluded by name, line-heights are
  not).
- **The reader-facing surface** (/build Act 0, stock tree served on 4764, chromium):
  refusals identical to the engine **byte for byte** — the one-engine claim observed
  working. The mapping report never renders, the stage never re-skins, and the refusal
  speaks CLI flags (`--page Color`, `--neutral <hue>`) a /build reader has no way to
  type. The no-grey refusal carries no `err.candidates`, so unlike the ambiguous-accent
  refusal there are no swatch buttons — a dead end. Screenshots (observed):
  `design-import-spike-a/01-act0-raw-refusal.png`,
  `design-import-spike-a/02-act0-converted-refusal.png`.
- **`figma-pull --from` probe** (Polaris `color.json`): shape ACCEPTED (the generic
  walker parses any nested JSON — `137 tokens` read), refused at the mapping stage with
  the same no-colour message. The refusal is about values, not shape.

**What the report CAPTURES** (strong, worth presenting as-is): per-token provenance
(every placed role names its source token verbatim), derived-rung honesty ("The numbers
are this importer's; the colours are the file's"), the negotiation trail with from/to
rungs and hexes, WCAG receipts against the same pairs `derive()` is held to, per-family
drop lists with the rule stated, the auto-filled list, and the "IMPORTED, NOT DESIGNED"
attribution header baked into the pack bytes.

**What it LACKS as a recruiter-facing artifact** (the harvest §6.2 asked for):

1. **Silent drops: 52 of 238 tokens (22%, observed) appear NOWHERE in the report** — the
   whole motion family (23: durations, easings, keyframes), all 12 z-index, all 10
   shadows (published as CSS shadow strings, which `collectScales` never parses), both
   font stacks, 4 font weights, `space-0`. The report's unclassified list names only 11
   dimension-typed entries (border-widths, breakpoints, the pill sentinel). "The drop
   list is itself presentable content" (§1) is not yet true of the engine's report.
2. **No provenance block.** The header hard-codes "read from the Figma file …by
   tooling/figma/figma-pull.mjs" even for a non-Figma export driven by a different
   caller; version, source URL and licence have no field — the spike smuggled them into
   `fileName` as prose.
3. **The two most common modern value formats read as nothing.** `rgba()` and `rem` are
   how Polaris (and most current systems) publish; the refusal then misdiagnoses ("none
   of the 238 styles read is a colour" — 137 are). A mechanical normalisation shim fixed
   both in ~20 lines of harness code.
4. **Semantic exports defeat role mapping — the D3 recognition gap in token form.**
   Polaris's names ARE role declarations, several byte-identical to contract tokens
   (`color-bg-surface`, `color-bg-inverse`, `color-border`), yet the engine never reads
   names as roles — it only ramps-and-rungs. The one import that should have been
   trivial (their semantic token → my semantic token) is the one the engine cannot do.
5. **Wrong-but-green has no detector.** Run 3 ships 12/12 WCAG while being visibly not
   Polaris (green body text). The report has no fidelity dimension — P4's ΔE/verdict
   exhibit is exactly the missing organ, confirming §3's "precedent only" placement.
6. Fonts are read, never used, and the report doesn't say so per-token (the page states
   "components and fonts never do" up front; the artifact itself stays silent about
   `font-family-sans` specifically).

**Implication for W1:** the engine's mapping DISCIPLINE is presentable today; the
REPORT is not yet the artifact. W1 needs (a) a value-normalisation pass, (b) a
semantic-name recognition pass before ramp inference, (c) a provenance/licence block,
(d) the silent-drop list made total, (e) a fidelity check. All five are engine/report
work, none contradicts §7.

### 9.2 Spike B — one foreign component through the full spec chain, timed

**Choice** (judgement, and the first finding): Polaris **Badge** — the planned candidate
— was REJECTED in under a minute: `ls system/specs/` shows `status-chip` already covers
the status-pill shape. Recognition-over-admission decided itself cheaply, which is D1's
instinct observed working. **Polaris Avatar** chosen instead: no equivalent among the 20
(progress-indicator is a determinate bar, not a person disc).

**Per-step wall-clock** (observed `date` stamps, one agent-assisted session, repo
conventions already in context):

| step | start → end | delta | nature |
| --- | --- | --- | --- |
| 0 · pick + overlap check | 09:25:59 → 09:26:38 | 0:39 | judgement |
| 1 · `system/specs/avatar.md` (incl. reading the ghost-button model + enum syntax) | 09:26:38 → 09:28:06 | 1:28 | judgement (the port prose: what the projection drops, a11y model) |
| 2 · `components.css` block | 09:28:06 → 09:28:37 | 0:31 | mostly mechanical (one judgement: sizes as structural px with in-file precedent vs token calc) |
| 3 · renderer template + 2 stale "twenty" count comments | 09:28:37 → 09:29:06 | 0:29 | mechanical |
| 4 · regens ×4 (gen-handoff · gen-vocabulary · gen-pack-bundle · gen-system-graph) | 09:29:06 → 09:29:27 | 0:21 (≈0:20 of it a fresh-worktree `npm ci` in tooling/style-dictionary — environmental; the generators themselves ≈1s) | mechanical |
| 5 · build-checks red → fix ×2 → green | 09:29:35 → 09:30:35 | 1:00 | mechanical (each gate names its own fix) |
| 6 · loc-summary regen + stage | 09:31:07 → 09:31:08 | 0:01 | mechanical |
| commit + push | 09:31:16 → 09:31:31 | 0:15 | mechanical |
| **total** | 09:25:59 → 09:31:31 | **5:32** | |

**Gate trips on the 20→21 widening** (observed): exactly the two designed tripwires,
both in build-checks group 21 — `palette.mjs CATALOG_COMPONENTS has drifted from the
generated vocabulary` (the ⌘K static list, #188's memoization is why it exists) and
`the wrapper histogram moved — 3 with / 18 without (pinned 3/17)`. Each failure message
named its own fix; the histogram's comment directs "move it on purpose, with the vd
tab's honesty note re-checked" — avatar ships wrapper-less, absent vd/react tabs honest,
pin moved to 3/18 with the reason recorded in the comment. After the two fixes: **all 27
groups pass** (observed), including group 3's whole-vocabulary render-path assertion and
group 18's `validateExamples` over "the 21 REAL committed specs" (counts read from
pack.json, so they followed automatically). One un-gated drift class found by reading,
not by gates: `agentic-renderer.mjs`'s hand-written "twenty templates/specs" comments.

**Missing contract token: none — but only because the port dropped a concept.** Polaris
cycles avatar backgrounds through a name-keyed six-colour palette; the contract has no
"avatar palette" concept and a colour literal in components.css is a red build, so the
disc wears the accent wash and **the spec states the drop as first-class content**
(projection, not reproduction — §1 observed holding at component grain). Also absent:
any `radius-full` token; circle via `border-radius: 50%`, a shape constant with six
in-file precedents.

**Costs the spike did NOT pay, which a real port PR does:** VR baselines — avatar now
renders at rest on `/components`, so both its pack baselines churn and need
`update:docker` in the same PR (loc grand total moved 38600→38700 but the runtime group
approach.html renders did not, so no approach churn); `tooling/catalog-journey.mjs` ×3
engines (operator-run); review. No param-manifest entry needed — the playground-controls
manifest entry is per control CLASS, and non-emitting components stay out of the
specimens group by #220's own recorded note.

**The number for the build-vs-generate question (§8 Q12, Q40):** a minimal foreign
component — non-interactive, `contract: null`, wrapper-less, no new contract token —
cost **≈5½ minutes of agent wall-clock** through the whole chain with every CI-side gate
green, and the time concentrates in the judgement sentences (what the projection drops,
the a11y model), not the plumbing. Bounds on the number, stated: cold-session
orientation is not included; an interactive component (bus grammar, states), a
contract-token addition (tokens.source.json + two regens + pack churn) or the unpaid VR/
journey costs above would multiply it. Reading for D1/D3: admission's judgement cost is
real but small at this grain — N1 stands, and drafting tooling (P3/W2) only attacks the
right bottleneck if it drafts the judgement PROSE for human editing, not the file
plumbing, which is already minutes.
