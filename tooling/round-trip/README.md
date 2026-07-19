# Verdant round-trip — derivation-fidelity evidence (spike 1)

This folder is the **public, inspectable evidence** for the pack-seed derivation capability
(epic #38, ticket #40; architecture `docs/epics/per-company-brief.architecture.md` §Spikes 1).
It runs the capability as a **closed round-trip on the fictional Verdant scenario**:

> derive Verdant's design language *from screenshots of Verdant's own prototype* → diff the
> proposal against the **known** Verdant pack.

**This is a controlled, favourable case — read it as such.** The "ground truth" is the engine's
own `derive(Verdant axes)` output, and reading a solid accent off a clean render is close to a
colour-picker operation. A small accent ΔE here (measured **0.05**, right at the threshold — a
slightly-dark read, not a rigged near-zero) proves the **pipeline works end to end**,
*not* that derivation is high-fidelity in the wild. The fidelity claim rests on the **offline
real-product test** (real photography, real published tokens, real ambiguity) — recorded, with
numbers, in the architecture's §Spikes. The `verdant.diff.json.caveat` says the same.

## The pipeline (and how to regenerate each artifact)

| Artifact | What it is | Regenerate |
| --- | --- | --- |
| `input/verdant-*.png` | Vision input — `proto/verdant.html` rendered under the Verdant pack | `cd tooling/visual-regression && node capture-roundtrip.mjs` |
| `../../system/tokens.verdant.css` | **Ground truth** = `derive(Verdant axes)` (the canonical pack, by construction) | `node agent-layer/gen-pack-css.mjs --verdant` |
| `../../traces/pack-seed-verdant.{raw,}.jsonl` | The **real** recorded Agent SDK vision run (raw + curated) | `node portal/record-derivation.mjs` → `node tooling/curate-trace.mjs …` |
| `verdant.seed.json` | The agent's **proposed** pack seed (DTCG), carrying the human-gate `review` block | (the run writes it; never hand-edit trace content — re-run to change the proposal) |
| `tokens.verdant-proposed.css` | The proposed pack, emitted from the seed | `node agent-layer/gen-pack-css.mjs tooling/round-trip/verdant.seed.json tooling/round-trip/tokens.verdant-proposed.css` |
| `verdant.diff.json` | The **fidelity measurement**: proposed vs ground truth (OKLab ΔE + type/spacing usability) → labelled verdict | `node tooling/diff-pack-seed.mjs tooling/round-trip/verdant.seed.json tooling/round-trip/verdant.diff.json` |

## The human gate (agent proposes, human decides)

The recorded trace immutably preserves the agent's **raw** proposal (in its `implement` Write step).
The committed `verdant.seed.json` carries an explicit `review` block a human fills — approving or
correcting each value. The git history of this file (raw proposal → reviewed seed) **is the
receipt** that a human decided, not the agent. Nothing here ships until `review.approved` is true.

## What the diff measures (and deliberately excludes)

- **Accent** (`color-accent`) drives the verdict — perceptual OKLab ΔE vs ground truth (≤ 0.05).
- **Type** — intrinsic usability of the proposed ramp (monotonic · body ∈ [14,18] · sane ratios),
  scored viewport-robustly on the plain-px steps; the `vw`-sloped clamp steps are reported unscored
  (diffing rendered-px vs a clamp ceiling would log a viewport artifact as a fidelity miss).
- **Spacing** monotonic + on the 4px grid; **radius** monotonic.
- **Neutrals are reported but EXCLUDED from the verdict**: the engine tints them at sub-perceptual
  chroma (`bgSurface` cMax 0.006); a vision agent reads plain white/grey, so their ΔE looks large
  but is perceptually trivial. Keying the verdict on them would manufacture a failure the eye can't
  see — dishonest in the other direction.
