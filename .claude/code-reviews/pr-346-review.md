# PR #346 review — a whole-bank depth and a Think-on-Opus posture

**Head** 4fcbbaf (reviewed; findings fixed in eddedb1) · **Base** main @ `234e77676a08ff69b4ea79d7c6f193fb6cb0b000` · round 1 · 2026-09-01

Fresh-eyes pass by the `code-reviewer` agent in a clean context, plus the numbers pass done by hand. This
file replaces the author's self-review (which recorded Head 51359c1 · Base 9c48054, the pre-merge tip).

**Verdict on 4fcbbaf: REQUEST CHANGES, docs only** — the four source files (`discovery/bank.mjs`,
`portal/lib/discovery-postures.mjs`, `tooling/build-checks.mjs`, `gates.md`) are correct and both gates
are green on the merged tree; three prose surfaces carried figures written against the pre-merge tree.
**All three are fixed in eddedb1**, so the recommendation for the current head is **approve** (posted as a
comment: a solo repo cannot formally approve its own PR).

## Base moved

`origin/main` merged PR #345 (the #338 findings) after this PR branched: it inserted `EVIDENCE_RULE` into
the system prompt (so `POSTURES.think.fingerprint` moved `df6fbc35` → `fba70f00`) and re-recorded
`discovery/instrument-loans-1/`. Merged into the branch at 4fcbbaf; `build-checks` 32/32 and
`drift-check` ✓ re-run on the merged tree by both the author and the reviewer. The guarantees pass: this
PR's key-set pin (`build · fingerprint · id · label · model`) still holds because #345 changed only the
prompt text, not `POSTURES`' shape; the "not moved by this PR" claim about `think`'s fingerprint holds
by construction (`fingerprintOf` is computed at import, and this PR touches neither the prompt nor
`THINK_MODEL`).

## Findings

### F1 (medium) — stale fingerprint figures after the base moved — FIXED in eddedb1

PR body §Validation · report lines 16, 51, 83 · the old self-review lines 3, 46–47

All asserted `think` unchanged at `df6fbc35…` and `think-opus` at `593035e6…`. On 4fcbbaf, confirmed three
ways (module import, group 32's live line, the fixture's twelve `postureFingerprint` stamps):
`think` = `fba70f00…`, `think-opus` = `cda7390b…`. No source change needed. Now stated as "not moved by
this PR; `fba70f00` on the merged tree".

### F2 (medium) — the $1.488 / 30-turn cost baseline credited to the wrong run — FIXED in eddedb1

PR body §Cost · plan line 76 · report line 75

Labelled "Observed (prior fixture)" / "the sonnet parenting fixture", but that fixture
(`discovery/instrument-loans-1/`) is 12 turns summing to $0.637 ($0.053/turn); `1.488` appears nowhere
tracked. The author traced it: it is the real run `<JOBS_DIR>/_discovery/my-product-name/run.json`
(full-discovery, think, claude-sonnet-5, never committed), whose `costUsd` fields sum to $1.488 over 30
distinct turns = $0.0496/turn. So the digit was observed; the subject was wrong. Re-credited, with the
tracked fixture's per-turn figure beside it as the consistency check.

### F3 (low) — self-review header named the pre-merge tree — FIXED (this file)

### F4 (low, agreed with the author's own F1) — `think-opus` has never produced a turn

`portal/lib/discovery-postures.mjs` · `portal/lib/discovery-transport.mjs:395,411`

`claude-opus-5` round-tripping through SDK 0.1.77 is expected from the sonnet-5 precedent (architecture
§On newer model strings), not observed; `--probe-parenting` hardcodes `POSTURES.think` at both sites, so
there is no zero-code one-turn check. Not blocking (the ticket ships the capability, not a run). Cheapest
observation: one fictional scope-check turn on think-opus (≈ $0.12 expected), package deleted after; or a
`--posture` flag on the probe as a follow-up.

## Numbers pass

| Figure | Label | Checked against | Result |
|---|---|---|---|
| $1.488 / 30 turns / $0.0496 per turn | observed | `_discovery/my-product-name/run.json` costUsd sum, 30 distinct turns | PASS after F2 (subject corrected) |
| 65 sonnet turns ≈ $3.20 | derived | 65 × 0.0496 | PASS |
| 65 opus turns ≈ $8 | expected | 2.5× ($5/$25 vs $2/$10 per Mtok, claude-api skill table) | PASS |
| `build ✓ all 32 groups pass` | observed | re-run on 4fcbbaf by reviewer and author | PASS |
| `drift-check ✓` | observed | re-run on 4fcbbaf | PASS |
| group 32 stamp `df6fbc35` unchanged | observed | live line on 4fcbbaf says `fba70f00` | FAIL → fixed (F1) |
| think-opus stamp `593035e6` | observed | module on 4fcbbaf says `cda7390b` | FAIL → fixed (F1) |
| mutations A/B/C red by name, md5-restored | observed | the `ok()` lines exist and can fail; not re-executed by reviewer | consistent |
| portal health / config / drawer options | observed | not re-run by reviewer | not falsified |
| Opus 5 adaptive thinking, `budget_tokens` removed; SDK `maxThinkingTokens` is that shape | stated | claude-api skill; `runtimeTypes.d.ts:370` in sdk 0.1.77 | PASS |

## What is done well

- `whole-bank` derived from `QUESTIONS`; the one literal (`WHOLE_BANK`) is round-tripped against both
  `selectDepth("whole-bank")` and `ids(BANK)`, so it is not tautological — the reviewer diffed all 65
  programmatically, zero mismatches.
- The label is honest about re-admitting Stage 9's Jobs/Chesky exercises, and the C3 title regex is proven
  to run over the new `label`/`when` without a false positive.
- The depth-menu and posture key-set pins close real gaps (a fifth depth or a per-posture option would
  otherwise pass silently); the fingerprint-gap note lives in the file that owns `fingerprintOf`.
- No file assumes three depths or one posture; nothing under `discovery/<slug>/` touched; no run
  presented as agent output.

## Validation

| Gate | Result on 4fcbbaf |
|---|---|
| `node tooling/build-checks.mjs` | ✓ 32/32 (author + reviewer) |
| `node tooling/drift-check.mjs` | ✓, nothing regenerated |
| CI `verify` / `visual` | green on 51359c1..d44fbe0; re-running on the merged head |
