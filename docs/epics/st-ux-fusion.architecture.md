# Architecture — Systems thinking × UX: name the structure, state the outcomes

Intent: [st-ux-fusion.prd.md](./st-ux-fusion.prd.md) · Research: `.claude/plans/st-ux-fusion-epic-research.md` · Decided: 2026-08-07 (plan-architecture session).

## Problem & goals

Hiring managers at the £70–80k band can verify craft and method on this site but not strategy — the repo embodies at least nine named industry patterns without ever saying their names, and the method copy states habits without the outcomes they buy. The epic makes that legible in the site's own register (performed, with receipts) at near-zero machinery cost. Every decision below is judged against the epic's own sizing test: Meadows' leverage hierarchy — prefer reframings over subsystems, at most ONE small interactive exhibit.

## Approaches considered

1. **Copy + platform-native micro-exhibit** *(chosen)* — T1/T2 are pure content edits riding existing mechanisms (the sources grid, the glossary's `TERMS` map); T3 is hand-written HTML rungs on native `<details>`/`<summary>` with a ~10-line tracker hook in approach's existing inline module block. Zero new files, zero new subsystems. Trade-off accepted: the ladder's interaction vocabulary is whatever `<details>` gives (expand/collapse), nothing richer.
2. **Exhibit-module family** — build T3 like trace-player / handoff-viewer: a `prepareLadder`/`renderLadder` module over a committed `leverage-ladder.json`, build-checks-testable. Rejected: those modules exist because their content is *generated or measured* and the JSON is what gets drift-checked; the ladder is authorial opinion, so the indirection adds a tracked module (loc-summary cascade), custom disclosure JS re-implementing the platform, and a JSON with nothing to verify. It fails the epic's own leverage test.
3. **A dedicated strategy surface** — a new page/essay presenting the position directly. Rejected by the PRD's non-goals and by the register argument: the site's whole differentiator is "a method performed, not described"; an essay page is the one shape that reads as describing.

## Recommended approach

Layer three content interventions onto existing surfaces, in the PRD's two waves around #216's IA surgery:

- **T1** — a fifth cluster ("Strategy & systems") in `approach.html#sources`' existing `grid grid-2` of caption+prose clusters. Copy + approach VR baselines; nothing else moves.
- **T2** — a copy pass over approach's method section (+ home/factory close cards): each habit states the outcome it buys, and the industry-term namings land **twice** — a one-sentence naming in the prose beside the exhibit that does the thing, AND the term added to `glossary.mjs`'s `TERMS` map (`declarative-generative-ui`, `steering-layer`, `management-flight-simulator`), which buys the WCAG 1.4.13 bubble UI and both page mounts (approach + factory, #173) for a data edit. Quantifiable claims stay generated (`loc-summary.json`, `param-count.json`) — the pass rewords around them, never retypes them.
- **T3** — the leverage ladder: a section of styled native `<details>` rungs (5 rungs: numbers → information flows → rules → goals → paradigm), each mapping a Meadows leverage point to a real, linkable decision in this repo. Content hand-written in the page HTML (authorial opinion — honest per the PRD); interactivity is the platform's; one virtual-route tracker fires once on first rung toggle.

**Wave 1 lands now against the current IA; Wave 2 (T3) lands after #216.** #216 is open, serialized, and rewrites the same pages — the coordination contract is below.

## Key decisions

- **Stack & libraries** — nothing new. Vanilla HTML + token-only CSS in `portfolio.css` (the ladder is an approach-page surface, not a reusable component — it never enters `components.css` or the vocabulary chain). The ladder's only JS rides approach.html's existing inline module block (where glossary/annotated-source already wire), so **no new tracked `system/*.mjs` file exists and the loc-summary cascade never fires**. Alternative considered: a `leverage-ladder.mjs` module per the "view-time behaviour = ES module" convention — rejected because the behaviour is one event listener; the convention exists for behaviour worth a file.
- **Content model (the data-model call)** — the ladder's content lives in the page HTML, hand-written. No JSON, no generator (PRD rule: no generator unless a claim becomes quantitative). The honesty mechanism for authorial content is the **receipt link**: every rung links the real file or issue it claims (e.g. #12 numbers → `tokens.source.json`; #6 information flows → the measured-claims artifacts; #5 rules → the fences/gates; #3 goals → the honesty contract in the PRD; #2 paradigm → the token contract). If a rung ever states a number, it reads an existing generated artifact the way `#loc-proof` does — never typed.
- **Interaction & counting contracts** — native `<details>`/`<summary>` is a deliberate boundary choice: `param-manifest.json`'s counting rules *explicitly exclude* details/summary disclosures and glossary bubbles, so T1–T3 add **zero manifest entries, zero `gen-param-count` regen, zero change to approach's rendered control total**. Rung receipt links are plain `<a>` navigation (also excluded). If T3's interaction ever grows past disclosure (drag, filter, input), it crosses that boundary and owes manifest entries — treat that as the overengineering tripwire firing.
- **Analytics** — one new virtual-route tracker in `analytics.mjs`: a single static literal path (exact literal decided at implementation; the path IS the payload), fired ONCE from the first genuine rung `toggle` — never from a settled-state flag. It follows the `/factory` four's per-flip snapshot pattern, not `flipTo` — #149's scope decision stands, and the same in-principle collisions it accepted there are accepted here.
- **VR / gate posture** — rungs closed at rest; no entrance animation and nothing gated only on `matchMedia('reduce')` (the gate captures under no-preference with animations disabled). Each touched page's baselines regenerate in the same PR (`update:docker`, clean detached worktree). T2's glossary terms are covered by the existing loud gate: an unknown `data-term` key aborts the glossary mount and VR fails red.
- **Sequencing vs #202 (the boundary that matters most)** — Wave 1 must not run concurrent with #216 (it rewrites the same pages and must run alone) or with anything regenerating the same baselines. **#216 inherits T2's outcome-framed copy as the source text for its trim** — a note goes on #216 when Wave 1 merges, so the trim compresses the reframed copy rather than resurrecting the old register. T3 waits for #216's landed shape by design.
- **T3 placement (default + decision rule)** — default: **approach's evidence layer**, as the capstone after the method/case sections ("where I intervene"). Rationale: #206 already made /factory the running tool, and a static authorial exhibit there would compete with the studio peak rather than frame it; #216 explicitly keeps approach as the evidence layer (probe, annotated source, glossary — the ladder is their sibling). Decision rule: confirm against #216's landed IA; move only if #216 reassigns approach's evidence role.
- **Attribution (content boundary, standing rules)** — the five-pillar AI-trust content never names its source speaker (cite Nielsen/Amershi/PAIR); "Yes, And" credits Leslie Jensen-Inman; Crawford material is Crawford-via-Wroblewski. These bind T1's cluster copy and T2's prose.
- **Security/auth/secrets** — nothing applies: no new services, no API surface, no secrets. Skipped, not overlooked.
- **T4 (mini flight simulator)** — outside the MVP and outside this doc. If it is ever sliced, it gets its own shape decision then (the Morecroft cockpit pattern is recorded in the research doc); parking it costs nothing.

## Missing pieces

- The copy itself — the fifth cluster, the outcome reframings, the 2–3 glossary definitions, the five rungs' authorial text. This is the epic's real work; everything structural already exists.
- The fifth-cluster layout call (5 items in a 2-column grid — orphan vs spanning row): implementation detail, decided in T1's PR.
- The tracker's path literal + its `analytics.mjs` block comment stating scope (the `/build` pair's precedent).
- A numeric engagement target for the ladder — needs a CF WA baseline read first (PRD open question 4; an operator dashboard look, not built work).

## Spikes & experiments

**None needed** — every call above is cheap and reversible, and the one genuinely uncertain thing (T3's final placement) is resolved by waiting for #216 rather than by building anything. The epic's falsification test is the PRD's hypothesis window itself.

## Open questions

Carried from the PRD, unchanged: the review window (§9-1), reviewer identities and timing (§9-3), the engagement numeric target (§9-4), T4's fate at slicing (§9-5). Settled here: T3's shape (native details + inline tracker) and its placement default (approach, rule above) — final placement confirmation still waits on #216's landed shape (§9-2).
