# Implementation Report — a whole-bank discovery depth and a Think-on-Opus posture

**Plan**: `.claude/plans/discovery-whole-bank-opus-posture.md`   **Branch**: `feat/discovery-full-bank-opus-posture` (off `origin/main` at `9c48054`; `origin/main` `234e776` (#345) merged in at `4fcbbaf`)   **Status**: COMPLETE, no run recorded (by design)
**Epic**: #279 · no ticket · **Fixture**: `discovery/instrument-loans-1/` — read by group 32, never edited

*Observed* means read from the named command's output on 2026-09-01, on this machine, Node v20.20.2,
SDK 0.1.77. *Derived* shows the arithmetic or the source line. *Expected* is an assumption.

## Summary

`discovery/bank.mjs` gains a fourth depth, `whole-bank`, whose ids are derived from `QUESTIONS`
(`Object.freeze(QUESTIONS.map((q) => q.id))`) — 65 in source order, which is stage order. The literal
65-id list lives in `tooling/build-checks.mjs` group 28 as `WHOLE_BANK`, beside `TWELVE`, `SCOPE_CHECK`
and `FULL_DISCOVERY`. `portal/lib/discovery-postures.mjs` gains a second posture, `think-opus`, on
`claude-opus-5` over the SAME `buildThinkTurn` as `think`; `THINK_MODEL` stays `claude-sonnet-5`, so this PR
does not move `POSTURES.think.fingerprint`. On the merged tree (`4fcbbaf`, after #345 inserted `EVIDENCE_RULE`)
it is `fba70f00…`, equal to the re-recorded fixture's 12 stamps (observed in group 32's line; it was
`df6fbc35…` before the merge). The drawer needed no change: it renders `discoveryConfig().depths` and
`.postures` from the modules.

## What changed

- `discovery/bank.mjs` — the depths comment says four and explains why whole-bank is derived and where
  its literal lives; the entry: label `Whole bank (stress test)`, when `comparing two postures on one
  answer set; a stress test of the bank, not an interview`. `full-discovery` untouched (#283 owns it).
- `tooling/build-checks.mjs` group 28 — `WHOLE_BANK` literal (65 ids); case 5 pins `selectDepth("whole-bank")`
  to it, pins it equal to `ids(BANK)` (source order), pins the label to `/stress test/` and not
  `/interview/`, and pins the depth MENU by name (`Object.keys(DEPTHS)` === the four). Group line updated.
- `tooling/build-checks.mjs` group 30 case 11 — `think-opus` pinned to `claude-opus-5`, same `build` as
  `think`, fingerprint differs from `think`'s and reproduces; every posture's key set pinned to
  `build · fingerprint · id · label · model`, and `maxThinkingTokens` / `thinking` pinned ABSENT.
- `portal/lib/discovery-postures.mjs` — header says two postures and why there is no per-posture SDK
  option (Opus 5: adaptive thinking on by default; `budget_tokens` removed, 400; the SDK's
  `maxThinkingTokens` is that shape); the fingerprint comment names the gap (a per-posture option would
  sit outside the hash) beside the existing "what sits outside" note; `THINK_OPUS_MODEL` + the posture.
- `.claude/references/gates.md` — group 28 and group 30 entries extended.

## Deviations from the ticket (additions, each one gate line — drop any on triage)

- D1 The depth MENU pin (`Object.keys(DEPTHS)` by name). The ticket said a new depth with no pin
  "fails by name"; observed on the unedited gate it would not — the per-depth loops are generic and a
  fifth depth with no literal passes them silently. The pin makes the ticket's claim true.
- D2 The label pin (`/stress test/i` and not `/interview/i` on `DEPTHS["whole-bank"].label`). The
  ticket's "LABEL IT HONESTLY" is now a gate, not a review fact. Mutation C proves it can fail.
- D3 The posture key-set pin + `maxThinkingTokens`/`thinking` absent. Encodes "do not add a thinking
  budget" and "a per-posture option would not move the fingerprint" as failures by name (mutation B).

No other deviation. Nothing under `discovery/<slug>/` was read for writing or edited.

## Validation (observed)

- Base moved during review: `origin/main` `234e776` (#345) merged in at `4fcbbaf`; every gate below was re-run
  on that merged tree (the pre-merge runs on `51359c1` were also green).
- `node tooling/build-checks.mjs` — `build ✓  all 32 groups pass`; group 32's line reads
  `every one stamped with the CURRENT prompt-surface fingerprint fba70f00` — #345's stamp, not moved by this PR.
- `node tooling/drift-check.mjs` — ✓ (`syntax · token-css · … · replay`); no generated file changed
  (`git status` shows only the four edited files). `loc-summary` counts `system/`, root/`proto/` pages
  and `agent-layer/` only, so `discovery/` and `portal/` edits cannot move it (derived from
  `agent-layer/gen-loc-summary.mjs` GROUPS).
- Mutations, each restored and the file's md5 checked equal to the pre-mutation hash:
  - A `ids: QUESTIONS.slice(1)…` → `build bank ✗ · whole-bank drifted from the documented 65: […]`
  - B `maxThinkingTokens: 1024` on think-opus → `build discovery ✗ · case 11: posture think-opus carries
    keys build,fingerprint,id,label,maxThinkingTokens,model — a per-posture option sits OUTSIDE
    fingerprintOf's hash …`
  - C label `Whole bank interview` → `build bank ✗ · whole-bank's label must read as a stress test, not an
    interview: "Whole bank interview"`
  - then `build ✓  all 32 groups pass`.
- Portal: `cd portal && PORT=4748 npm start`; `GET /api/health` → `{"ok":true,…}`;
  `GET /api/discovery/config` → four depths (`whole-bank`, count 65) and two postures
  (`think` claude-sonnet-5, `think-opus` claude-opus-5), 65 questions, no `weakAnswer` key.
- Drawer, headless Chromium (Playwright, `#btn-discovery` clicked): depth options
  `Whole bank (stress test) — 65 questions`; posture options `Think (claude-sonnet-5)` and
  `Think on Opus (claude-opus-5)`; whole-bank note `65 questions — for comparing two postures on one
  answer set; a stress test of the bank, not an interview.`; zero page errors.
- No visual-regression run: no shipped page touched, `portal/` is never deployed.

## Cost of a whole-bank run (not run here)

- Observed on the real run `<JOBS_DIR>/_discovery/my-product-name/run.json` (full-discovery, think, claude-sonnet-5; real provenance, never committed): $1.488 summed over its `costUsd` fields, 30 distinct turns = $0.0496/turn. The tracked fixture `discovery/instrument-loans-1/` (12 turns) sums to $0.637 = $0.053/turn, consistent.
- Derived: 65 sonnet turns ≈ $3.20.
- Expected: Opus 5 is 2.5× sonnet 5 per token ($5/$25 vs $2/$10 per Mtok) → 65 opus turns ≈ $8, more
  once adaptive thinking's output tokens land. A comparison is two runs, so ≈ $11 expected in total.

## Open

- A whole-bank run on either posture is the owner's paid decision. When one is recorded, `run.json`
  carries `"model": "claude-opus-5"` and every turn's `postureFingerprint` is think-opus's (`cda7390b…` on
  `4fcbbaf`, observed from the module; it follows the prompt surface, so it moves with every prompt edit),
  so the two postures' packages are distinguishable by name.
- `docs/epics/discovery-partner.architecture.md` says Think runs `claude-sonnet-5` and a heavier model
  gains nothing across thirty turns; `think` stays there. `think-opus` is the measurement that claim has
  not had. Not a contradiction; flagged so the doc can cite the comparison once it exists.
