# Architecture — legibility surfaces: annotated source + term definitions

Intent: extends the **legibility layer** of [ai-first-ux-factory.prd.md](./ai-first-ux-factory.prd.md) (§6 — teach as it demonstrates, hard subtlety bar) under the platform architecture [ai-first-ux-factory.architecture.md](./ai-first-ux-factory.architecture.md). Decisions made interactively with the PRD holder, 2026-07-20. Pattern source (patterns borrowed, no code adopted): [zarazhangrui/codebase-to-course](https://github.com/zarazhangrui/codebase-to-course) — a Claude Code skill that generates interactive HTML courses over codebases.

## Problem & goals

The platform's thesis is "verify senior UXE skill instead of trusting claims," and its proof is the repo itself — but source code is only legible to the engineer half of the audience. A hiring manager cannot read `derive.mjs`, so for them the strongest evidence on the site is invisible. Goal: make the *actual shipped code* and the site's technical vocabulary legible on-page, in the register the PRD's legibility bar demands — no callouts, no pedagogy framing; success reads as unusual clarity. Judged against that lens under the standing constraints (vanilla shipped pages, token discipline, honesty contract, agents at build time only).

## Approaches considered

Three directions for using codebase-to-course:

| Direction | Trade-off | Verdict |
| --- | --- | --- |
| **A — Extract the two strongest patterns, implement natively** | Small scope; token-only; serves the thesis directly; forfeits the "generated course" wow | **Chosen** |
| **B — Run the skill at build time over this repo, commit the course as a factory artifact** | High meta-value ("the factory explains itself") but its foreign design system breaks token discipline unless rebuilt, it duplicates factory.html's narrative, and it ships AI prose about our own code on a site whose pitch is *verify, don't trust* | Rejected |
| **C — Take nothing** | Zero cost, but leaves a real gap: the proof stays illegible to non-engineer readers | Rejected |

Per-element triage of the source repo's 17 components:

- **Code ↔ English translation blocks** — **borrow.** Its own docs call this "the most important teaching element"; for us it converts "trust me, go read GitHub" into on-page legible proof.
- **Glossary tooltips** — **borrow.** The shipped pages are full of terms (DTCG, token contract, PIV, WCAG AA) a recruiter doesn't know; the source repo's one hard-won lesson (fixed-position bubbles that escape ancestor `overflow` clipping) comes with it.
- **Group-chat animation** (simulated component conversations) — **reject.** The trace player replays a *real* agent run; shipping the simulation beside it would dilute the differentiator and skirt the honesty contract.
- **Quizzes / spot-the-bug** — **reject.** Wrong register: quizzing the person evaluating you reads as gimmick.
- Remaining elements (file trees, step cards, callouts, layer toggles…) — already covered by shipped surfaces or below the subtlety bar.

## Recommended approach

Two native, token-only surfaces, both in the register the handoff viewer already established (one source rendered side by side, shown not told — platform architecture "UI surface," 2026-07-17):

1. **Annotated-source blocks.** Real code regions extracted **at build time** from the actual source files by a small agent-layer generator, rendered beside hand-written plain-English annotations in a two-column block on the portfolio pages. The extraction step is what elevates this above the source repo's version: the code shown *cannot drift* from the code that runs, making each block another verifiable factory artifact rather than a screenshot of code.
2. **Term definitions.** Explicitly marked terms get a quiet dotted underline and a hover/focus definition bubble fed from one shared glossary data source. No "glossary" feature framing anywhere — it's inline clarification, not a learning aid.

## Key decisions

- **Stack & libraries** — none new. Vanilla hand-written view-time modules beside `system/site.js`; zero-dep Node ESM generator in `agent-layer/` (platform constraints, reaffirmed not reopened).
- **Extraction over copying (the honesty call).** Snippets are never hand-copied into HTML. A hand-authored annotations spec names each region as *file + unique anchor strings* (start/end literals in the real source); `agent-layer/gen-annotated-source.mjs` (standalone-run, like `gen-handoff`) resolves anchors against the live files and emits one committed JSON artifact. A missing or ambiguous anchor is a **hard build failure** — that is the drift guard. Line numbers rejected (brittle); marker comments in shipped source rejected (pollutes the code being exhibited).
- **Data model (shape level).** Annotations spec: `[{ id, file, anchorStart, anchorEnd, annotations: [prose per region] }]`. Emitted artifact: the same plus the resolved code text. Glossary: one flat `term → definition` map. Both consumed by their view-time module; no schema library (validate by hand at the boundary, per convention).
- **Honesty posture.** The extracted code is the real source at authoring time (same regen discipline as the handoff pack — an edit inside an anchored region requires regen, else the committed artifact goes stale; candidate for the existing generator drift-check gate). The plain-English annotations are the author's human voice — the honesty contract forbids fabricated *agent* output, not human prose; nothing here is presented as agent output.
- **Styling boundary.** Styles live in `system/portfolio.css` (portfolio surface), **not** `system/components.css` — these blocks are exhibit chrome, not design-system components, and must not enter the token contract or the handoff pack. No new semantic tokens expected; if one proves necessary it follows the standard contract-first route.
- **Tooltip accessibility posture.** WCAG 1.4.13: triggered on hover *and* focus, dismissible (Esc), persistent, hoverable; fixed-position bubble (the borrowed clipping lesson). Marked-up explicitly in HTML (`<dfn>`/`data-term`) — no automatic text scanning.
- **Placement & sequencing.** Candidate hosts: `approach.html` and `factory.html` (annotated source beside the station whose code it shows), terms across shipped pages. Lands **after** motion Phase 3, which owns `factory.html` edits (`.claude/plans/portfolio-motion-phase03-factory-showpiece.md`). New at-rest content ⇒ **visual-regression baseline regen in the same PR** (`update:docker`), per the standing VR-churn contract.

## Missing pieces

Annotations spec file (format above, location beside the generator's other inputs) · `agent-layer/gen-annotated-source.mjs` · committed snippets artifact · `system/annotated-source.mjs` view-time module · `system/glossary.mjs` + glossary data · block/tooltip CSS in `portfolio.css` · page placements + copy · VR baseline regen.

## Spikes & experiments

None. Every piece mirrors a shipped idiom — generator family (`gen-handoff`), view-time module family (`trace-player`, `handoff-viewer`), the side-by-side one-source render precedent — and no call here is expensive to reverse.

## Open questions

- **Which regions to annotate first.** Candidates, strongest first: the derivation rule that produces a WCAG verdict (`system/derive.rules.mjs`), the agentic renderer's refusal branch (`system/agentic-renderer.mjs`), a token-contract excerpt (`system/tokens.source.json` → generated contract). Settled by a content pass when placing the blocks.
- **Glossary v1 term list** (likely DTCG, token contract, semantic token, PIV, WCAG AA, handoff pack, trace). Settled at implementation.
- **Whether the generator drift-check CI gate should also cover the snippets artifact.** Default yes, when convenient — same posture as the handoff pack.
