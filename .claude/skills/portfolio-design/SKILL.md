---
name: portfolio-design
description: House frontend-design skill for the ux-factory portfolio. Activate when building or reviewing ANY shipped-page UI — v3 spine work, heroes, components, motion, evidence layers, per-company instance surfaces. Combines direction (Anthropic frontend-design lineage), numeric craft rules (references/CRAFT.md), and a correctness checklist (references/CHECKLIST.md) with this repo's token contract, spring motion vocabulary, and honesty contract. Read references/CRAFT.md before writing CSS; run references/CHECKLIST.md before committing.
---

# Portfolio design — the site is the work sample

You are designing the ux-factory portfolio: the artifact a hiring team grades as a live work sample for a senior UX-engineer candidate. Every surface is screened on the Cadence rubric (custom interactions · reasoned motion · from-scratch components · obsessive empty/error/loading states · real accessibility · performance) at 6/6, and the Vercel DE bar: polished interactions, no dropped frames, no cross-browser inconsistencies.

Governing docs: `docs/epics/portfolio-v3-experience.prd.md` (the demo-spine thesis, D1–D11) and `.claude/plans/ux-overhaul-v3-prd-research.md` (the Q1–Q6 feel bar + I1–I7 pattern vocabulary). If a design choice would contradict either, stop and flag it.

## Hard constraints (never trade away)

- **Vanilla shipped pages.** No framework, no build step, no animation libraries, no runtime deps, no view-time LLM.
- **Token discipline.** Components reference semantic tokens only; a literal in `components.css` is a bug. New token → `system/tokens.source.json` (both groups) → `node agent-layer/gen-token-css.mjs` AND `node agent-layer/gen-handoff.mjs`.
- **Colour rule (amended 2026-07-22, D5/D5b).** Chrome stays calm monochrome + one blue. The visitor's derived brand takes the demo stage — and the whole site when they select it from the pack control. Colour is demonstration, never decoration.
- **Honesty contract.** Fictional labels, "real run, curated" labels, truthful capability chips — visible at rest, outside all disclosures, never as headlines.
- **Copy.** Humanizer rules: no em/en dashes in visible copy, no "not X but Y", no aphorisms, no -ing padding, plain words, active voice. A control says exactly what it does ("Save changes", never "Submit"); errors say what went wrong and how to fix it, without apologizing; an empty state is an invitation to act.

## Direction (how to make it distinctive, not templated)

Work like the design lead whose client has already rejected two templated rounds — v1 and v2 of this very site. Deliberate, opinionated choices justified by THIS subject: a factory that builds design systems in front of the reader.

- **The hero is a thesis.** Open with the most characteristic thing in this subject's world: the system visibly building/re-skinning itself. Never a big number with a small label and a gradient accent.
- **One signature element per surface.** Spend all boldness in one place; keep everything around it quiet and disciplined. Boldness lands in motion and the signature moment — never in palette (the calm rule owns palette).
- **Structure is information.** Numbering, eyebrows, dividers, labels must encode something true. Our pipeline is genuinely ordered, so numbered beats/stations qualify; decorative numbering does not.
- **Anti-slop calibration.** The generic AI looks to actively avoid: cream + serif + terracotta; near-black + single acid accent; broadsheet hairlines + zero radius everywhere. Warning specific to us: dark bands + one blue can pattern-match the second cluster — execute dark sections with enough typographic and spatial specificity that they read authored. Also banned: excessive centered layouts, purple gradients, uniform rounded corners, gradient text, decoration without information.
- **Two-pass process.** (1) Plan before code: palette roles, type roles, layout concept (one-sentence prose + ASCII wireframe), and the signature element — then critique the plan: "would I have produced this for any similar brief?" If yes, revise before building. (2) Build, then critique with screenshots (serve on a fresh port each iteration — browser caching is aggressive), in real Safari AND Chrome, not just the VR gate's Chromium.
- **The feel bar (Q1–Q6):** decisiveness (one idea per screen, stated large) · instant legibility (purpose clear in a second) · unambiguous tactility (everything clickable announces itself) · chapter pacing (the page reads as acts) · system consistency (one button/heading/card grammar everywhere) · a confident quiet close (one action, not a pile of links).
- **The pattern vocabulary (I1–I7):** massive verb-first hero type · light/dark band rhythm · row-lists with arrow affordances · oversized numerals on dark cards · statement + interactive list splits · single-card close · one pill-button system. Adapt each into our tokens and motion — never clone the reference sites.

## Craft numbers

Read `references/CRAFT.md` before writing CSS: type scale and measure, spacing rhythm, the 60/30/10 colour discipline mapped to our tokens, motion curves and durations mapped to our tokens, state coverage, hit areas.

## Correctness gate

Run `references/CHECKLIST.md` before committing any UI change. It carries the accessibility MUSTs (contrast numbers, keyboard paths, reduced motion), the motion-correctness rules (compositor props only, no transition:all), this repo's recorded traps (VR baselines, entrance-anim rebuild trap, min-width:0, count-up discipline), and the regen pipeline.

## Lineage (who these rules come from)

Direction layer adapted from Anthropic's `frontend-design` skill (anthropics/claude-code plugin). Numeric craft layer synthesized from Dammyjay93/interface-design (type ratios, 60/30/10, easing discipline) — rated the strongest community craft skill 2026-07. Correctness layer synthesized from vercel-labs/web-interface-guidelines (MUST/SHOULD/NEVER a11y + motion correctness; Web-Interface-Guidelines lineage). Rules are re-expressed for this repo's vanilla + token constraints, not copied.
