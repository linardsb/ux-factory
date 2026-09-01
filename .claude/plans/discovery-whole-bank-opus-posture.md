# Plan: a whole-bank discovery depth and a Think-on-Opus posture

Epic #279 · no ticket · branch `feat/discovery-full-bank-opus-posture` off `origin/main` at `9c48054`
(NOT off `fix/338-findings`, which holds an unpushed re-recorded fixture this work must not inherit).
Plan written before any code edit.

## What ships

Two capabilities, no run:

1. A fourth depth in `discovery/bank.mjs` holding all 65 question ids in source order (which is
   stage order), so one session can walk the entire bank.
2. A second posture in `portal/lib/discovery-postures.mjs`, `think-opus`, running `claude-opus-5`
   over the SAME `buildThinkTurn` prompt as `think` (`claude-sonnet-5`), so sonnet and opus can be
   compared on one answer set.

No 65-question session is recorded here. The capability is the deliverable; a run is the owner's
paid decision (§Cost).

## Why the depth is derived and the gate holds the literal

`DEPTHS["whole-bank"].ids` is `Object.freeze(QUESTIONS.map((q) => q.id))`. The depth IS the bank, so
a retyped list in the module would be a second copy that drifts. The literal 65-id list lives in
`tooling/build-checks.mjs` group 28 instead (`WHOLE_BANK`), beside `TWELVE`, `SCOPE_CHECK` and
`FULL_DISCOVERY`, so a bank edit that adds or reorders an entry has to move the gate in the same PR.
Group 28 also pins the depth MENU by name (`Object.keys(DEPTHS)` === the four ids): today a fifth
depth with no literal pin would pass the generic per-depth loops silently.

## Honest label

`bank.mjs`'s full-discovery comment says Stage 9's Jobs (`s9-customer-experience-backwards`) and Chesky
(`s9-eleven-star`) entries are exercises rather than interview questions and stay out of full
discovery. The whole-bank depth re-admits them, so its label and `when` read as a stress test:

- label `Whole bank (stress test)` → drawer option "Whole bank (stress test) — 65 questions"
- when `comparing two postures on one answer set; a stress test of the bank, not an interview`
  → drawer note "65 questions — for comparing two postures on one answer set; a stress test of the
  bank, not an interview."

The drawer renders `discoveryConfig().depths` and `.postures` straight from the modules
(`portal/lib/discovery.mjs:368-376`, `portal/public/portal.js:711-714`), so it needs no change.

## The posture

- `THINK_MODEL` stays `'claude-sonnet-5'` — `POSTURES.think.fingerprint` must not move, or group 32's
  parenting fixture (`discovery/instrument-loans-1/`) goes stale for no reason.
- `think-opus`: `{ id, label: 'Think on Opus', model: 'claude-opus-5', build: buildThinkTurn,
  fingerprint: fingerprintOf({ build: buildThinkTurn, model }) }`. The drawer's option renders
  `${label} (${model})` → "Think on Opus (claude-opus-5)".
- NO thinking budget. On Opus 5 thinking is adaptive and on by default; `budget_tokens` is removed
  (400). The Agent SDK's `maxThinkingTokens` (0.1.77) is that removed fixed-budget shape, so setting
  it risks a hard failure. The model string is the whole difference.
- `fingerprintOf` hashes `[model, systemPrompt, prompt, TOOL_DESCRIPTIONS]`. A per-posture SDK option
  would sit OUTSIDE the hash. None is added; the gap is named in the file header beside the existing
  "what sits outside" note, and group 30 pins every posture's key set to
  `build · fingerprint · id · label · model`, so a future option fails by name at the fingerprint gap.

`openSession` already refuses an unknown posture by name (`discovery.mjs:289`) and reads
`POSTURES[posture].model` into `run.json`, so a whole-bank + think-opus run records
`"model": "claude-opus-5"` with no further change.

## Gates

| Step | Verify |
|---|---|
| bank.mjs fourth depth | `node -e` prints 65 ids for `selectDepth("whole-bank")`, first `s1-choice-cascade`, last `s9-very-disappointed` |
| group 28 `WHOLE_BANK` + menu pin | `node tooling/build-checks.mjs` green; mutate the depth (drop one id) → red by name, then restore |
| postures + group 30 pins | `node tooling/build-checks.mjs` green; case 11 still pins `think` on sonnet; group 32 green with `POSTURES.think.fingerprint` unchanged (`df6fbc35…`) |
| drift | `node tooling/drift-check.mjs` ✓ (loc-summary does not count `discovery/` or `portal/`, so no regen expected) |
| portal | `cd portal && PORT=4748 npm start`; `/api/health` answers; `/api/discovery/config` lists four depths and two postures |

No shipped page changes and `portal/` is never deployed: no visual-regression run.

## Cost (for the owner, so nothing surprises)

- Observed on the real run `<JOBS_DIR>/_discovery/my-product-name/run.json` (full-discovery, think, claude-sonnet-5; real provenance, never committed): $1.488 summed over its `costUsd` fields, 30 distinct turns = $0.0496/turn. The tracked fixture `discovery/instrument-loans-1/` (12 turns) sums to $0.637 = $0.053/turn, consistent. (Corrected in review round 1: the plan first credited this figure to the parenting fixture, which is the 12-turn run.)
- Derived: 65 sonnet turns ≈ $3.20.
- Expected: Opus 5 is 2.5× sonnet 5 per token ($5/$25 vs $2/$10 per Mtok) → 65 opus turns ≈ $8,
  more once adaptive thinking's output tokens land. Not observed; no run in this PR.

## Not in scope

- Any re-tune of `full-discovery`: `bank.mjs`'s comment gives #283 ownership of keeping it "at about
  thirty". This PR adds a depth BESIDE it and does not touch its list.
- Grill / Create-PRD (#286). `discovery-partner.architecture.md` pins Think on `claude-sonnet-5`;
  `think` stays there. `think-opus` is the measurement that doc's "no gain from a heavier model"
  claim currently lacks, not a change of default.
