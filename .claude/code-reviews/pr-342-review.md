# PR #342 review — parenting is a lookup (#341)

**Head** `06460ae` · **Base** `main` @ `5e8208ab14d6445bafd73efafe4ffce541ef0791` · **Round** 1 (no prior report; base unmoved — `origin/main` = baseRefOid, guarantees pass not triggered) · **Reviewer** piv-review-pr + code-reviewer agent (its full report: `.agents/code-reviews/agent-reviews/pr-342-review.md`, untracked), 2026-08-31

*Observed* = I ran it on this tree. *Derived* = arithmetic shown. *Expected* = assumption.

## Summary

Recommendation: **request changes** — one High finding, doc-only, no re-record needed. The code holds: the gate stack is green at this head (observed), every figure in the PR body and the report re-derives from the committed files, the fixture's answers are the pre-registered sheet and its `prd.md` is the projection's bytes. The High is that four surfaces claim group 32's re-fold makes "a hand-edited op line go red by name", and it does not for the one tamper class that matters — a valid-to-valid param edit — which I reproduced on a scratch copy. The fix is a paragraph in four places; none touches the prompt surface, so the fingerprint and the fixture stand.

## Findings

**F1 (high) — "a hand-edited op line goes red by name" is false for valid-to-valid edits, and the docs state it as the fixture's honesty guard.**
Sites: `discovery/README.md` §The parenting fixture ("a hand-edited line goes red by name"), `.claude/references/gates.md` group 32 entry ("so a hand-edited line goes red by name"), `.claude/reports/discovery-parent-id-341-report.md` §What the gate cannot reach ("a hand-edited op line is caught by name (the re-fold)"), and `tooling/build-checks.mjs:6587` (32.3's message: "a line was edited by hand, or the applier changed under the fixture"; its comment calls it "the README's drift detector").
What 32.3 does: re-folds `{ op, params, turn }` AS COMMITTED through the applier and compares the output to the committed line. So it catches an edit that makes a line INVALID (wrong-rung parent, dangling ref, junk level) or a derived field out of step with its params (`closes`, `flagged`, `seq`, `supersedes`). It cannot catch an edit that swaps one valid param value for another, because the applier reproduces exactly what it is handed.
Reproduced (observed, on a scratch copy under the session scratchpad — the repo's package was never touched):
- seq 3 `parent_id` 2 → 1 (both business, both candidates at filing): re-fold ok, 0 mismatches, audit `missed []`, candidates ok → **group 32 GREEN**.
- seq 3 `parent_id` 2 → null with `flagged` edited to `["no-evidence","orphan"]`: re-fold ok, 0 mismatches, audit `missed [3]` → RED via 32.4 — which means the REVERSE edit (a missed run's null turned into a candidate seq, `flagged` trimmed to match) re-folds clean and passes. That is exactly the fabrication the honesty contract exists to exclude, and the docs say the gate excludes it.
The committed fixture is not in question — its 12 answers are verbatim in the pre-registered sheet and the git history is the server's write — but the guarantee is overclaimed at the surface a reviewer reads to know what green proves.
Fix (doc-only, four sites, same sentence): "an edit that makes a line INVALID — a wrong-rung parent, a dangling ref, a derived field out of step with its params — goes red by name; a valid-to-valid param edit does not and cannot (the applier reproduces what it is handed), so the only guard for that is the server's write and the git history." Add the valid-to-valid case to gates.md's *Cannot reach* list, and change 32.3's message to "a line was edited into something the applier would not produce, or the applier changed under the fixture". No code mechanism is asked for — a record-time signature would be a new mechanism and out of scope.

**F2 (medium) — the fingerprint's coverage is overclaimed in the PR body and the docblock.**
`portal/lib/discovery-postures.mjs:172` ("What the agent READS, hashed") and the PR body ("an md5 over everything the agent reads"). The hash is `model + SYSTEM + turn prompt over FINGERPRINT_INPUTS + JSON.stringify(TOOL_DESCRIPTIONS)` (case 19 recomputes exactly that recipe, observed). Three things the agent also reads are outside it: the tool INPUT SCHEMAS (`TOOL_SCHEMA` → `zodFor`, param names, types and enum values — `portal/lib/discovery.mjs:113`), the fence's deny text (`denyReason`, `portal/lib/discovery-transport.mjs:131` — the model sees the reason on every denial), and the SDK's own preset. `gates.md` and the README name the four hashed terms precisely; the docblock and the PR body say "everything". Downstream use is "when must I re-record": an operator rewording `denyReason` or reordering an enum would not be told to. `TOOL_SCHEMA` is pinned by group 30 to PARAMS/LEVELS/SOURCES/PROVENANCE, so it moves only under the op-verb lock — low practical exposure, which is why this is medium not high. (The code-reviewer agent raised the schema half independently.)
Fix: one sentence in the docblock after "and for nothing else" naming the three surfaces as OUTSIDE the hash and why (schema pinned by group 30; deny text and SDK preset are the probe's), the same clause in the README's tripwire paragraph, and the PR body line edited to "an md5 over the prompt surface — system prompt, turn template, tool descriptions, model". Do NOT widen the hash by importing `TOOL_SCHEMA` into postures: `discovery.mjs` imports postures, so that is a cycle and `TOOL_SCHEMA` would be in TDZ when `POSTURES` computes the fingerprint at module load.

**F3 (low) — D5 is a stated fact the gate does not hold.**
`tooling/build-checks.mjs:6606` (32.5) asserts `prd.md` EXISTS; the report's D5 and the README's new section say it is "committed exactly as projected, unedited". Observed on this tree: `projectPrd(readPackage(root)) === readFileSync(prd.md)` is `true` (16914 bytes both), and group 31 proves the fold byte-deterministic, so the assertion is free.
Fix: `ok(readFileSync(join(root, "prd.md"), "utf8") === md, "32.5: prd.md is not the projection's bytes — the fixture's prd.md is never edited by hand; regenerate it")`. Makes D5 a gate fact.

**F4 (low) — the probe leaks its temp root on a pre-`try` throw.**
`portal/lib/discovery-transport.mjs:389–435`: `rmSync` runs only after the `try/catch` around `runDiscoveryTurn`. The three stub `file(...)` calls before it go through the real applier over `QUESTIONS`, so a bank rename of `s1-if-nobody-solves-this`, `s5-pain-budget-same-person` or `s4-rabbit-holes` throws before the `try` and leaves `discovery-probe-*` in `tmpdir()`. Not a repo write (the root is under `os.tmpdir()`), so low.
Fix: wrap everything after `mkdtempSync` in `try { … } finally { rmSync(root, { recursive: true, force: true }); }`.

**F5 (low) — "~$0.05" per probe is half the observed cold-cache cost.**
`portal/lib/discovery-transport.mjs:30` and `:378`, `.claude/references/gates.md` (the probe entry), `discovery/README.md` step 1. The report's own table: $0.1040 cold, $0.0409 warm. The first probe after a prompt edit is always the cold one — the case the docs are telling the operator to run.
Fix: "~$0.04–0.10 (the first run after a prompt edit is the cold one)". The README's "~$0.60 per re-record" is fine: 0.4129 + 0.1040 + 0.0409 = 0.5578 (derived).

Not counted (pre-existing, untouched by this diff, from the agent's pass): `preflightTransport` has no `rmSync` for its own temp root; group 30 reuses the "case 16" label for two different cases.

## The numbers pass

Every figure in the PR body and the report, and which run produced it.

| Figure | Where | Kind | Re-derived here |
|---|---|---|---|
| 18 of 18 eligible missed, structural [5] | PR body, report (the oracle) | observed (author) | ✓ `auditParenting` over the local rehearsal transcript at `<JOBS_DIR>/_discovery/…`: 30 ops, eligible 18, missed 18, structural [5] (observed; contents not quoted — real provenance) |
| eligible [3…12] · missed [] · structural [] | PR body, report, ✓ line | observed | ✓ over `discovery/instrument-loans-1/transcript.jsonl`; every named parent in its candidate set at the moment of filing (10/10) |
| 12 decisions · 0 flag · 0 open · 0 evidence | report | observed | ✓ 12 op lines, all `record_decision` |
| 3 denied — Bash ×2, Glob ×1, all t12; 0 naming `parent_id` | report, PR body | observed | ✓ (`error` field, matches `deniedLine`'s shape at `discovery.mjs:202`; the probe and 32 both read `l.error`) |
| 12 `turnStats` over 12 distinct turns, one fingerprint | report | observed | ✓ t1…t12, `df6fbc35a5d91537dc417288b67c123e` on all 12 |
| fingerprint `df6fbc35…` = current tree | PR body, ✓ line | observed | ✓ `POSTURES.think.fingerprint` on this tree is `df6fbc35a5d91537dc417288b67c123e` |
| $0.4129 over 12 turns | report | derived | ✓ Σ `costUsd` = 0.4129 |
| min 10.4 · median 13.1 · max 19.5 · Σ 2 m 46 s | report | derived | ✓ raw min 10350 ms (10.35 → 10.4), median (12579+13598)/2 = 13.1, max 19540, Σ 166 s |
| `endedAt` 11:22:02, ~4 min per re-record | report, README | observed / derived | ✓ startedAt→endedAt 268 s |
| 12 of 12 answers byte-identical to the sheet | report, PR body | observed (author, against scratch files) | ✓ as verbatim-in-plan: all 12 `answers.jsonl` texts appear verbatim in `.claude/plans/discovery-parent-id-341.md` |
| probe $0.1040 / $0.0409, 15.9 s / 18.4 s, PARENTED ×2 | report, PR body | observed (author) | not re-run — paid; `git diff 1f3cd95 06460ae -- portal/lib/discovery-transport.mjs` is empty (observed), so the transport it ran on is this one |
| `525e5316` after one word in `PARENT_RULE` | report, PR body | observed (author) | not re-run — a mutation demonstration whose input word is not recorded; 32.2a's compare is live against the module hash, so the mechanism is verified by construction |
| pre-flight 8 rows | report, README (7 → 8) | observed | ✓ 8 `row(` calls in `preflightTransport` — the README's 7 was stale before this PR |
| `build ✓ all 32 groups pass` at `06460ae` | PR body | observed | ✓ observed here, exit 0 |
| group 32 asserts `decisions ≥ 6` | gates.md | — | ✓ `build-checks.mjs:6600` |

Subject check: `grep -n "31 PURE\|31 groups\|Thirty-one"` over CLAUDE.md, gates.md, build-checks.mjs, README — no hits (observed). "everything the agent reads" — F2. "a hand-edited line goes red by name" — F1.

## Absolute claims re-derived

- "a hand-edited line goes red by name" (README, gates.md, report, 32.3's message) — **does not hold** for a valid-to-valid param edit; reproduced above. F1.
- "The candidate line is `parentCandidates`', so it can never disagree with the applier's refusal" (postures:59) — group 29 proves candidate set = acceptance set; case 17 drives brief ↔ refusal naming the same seq. Holds.
- "the system prompt stays byte-stable across the session" — `SYSTEM` is a module-level template with no per-turn term; `ledgerBrief` is asserted ABSENT from it (case 17). Holds.
- "Nothing here writes under discovery/; the group only reads" (build-checks:6529) — group 32 calls `readPackage`, `readTranscript`, `projectPrd`; no write. Holds.
- "Nothing imports it [`probeParenting`]" (transport:387) — grep: the two references are the definition and the CLI branch. Holds.
- "a bank edit must not move it" — the fingerprint question id is asserted not in the bank (case 19); the synthetic ledger's `question_id`s are rendered raw by `ledgerBrief`, never resolved through the bank. Holds.
- "Superseded decisions ARE candidates … the candidate list must equal the acceptance set" — `parentCandidates` does not filter on `supersedes`; the applier's `earlier(…)` does not either. Holds.
- "the committed op lines are exactly what the applier produces over the committed answers" (build-checks:6534) — holds, and is the precise statement F1 asks the other four sites to adopt.

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `build ✓ all 32 groups pass`, exit 0 (observed) |
| `node tooling/drift-check.mjs` | ✅ all twelve checks (observed) |
| `node agent-layer/gen-loc-summary.mjs --check` | ✅ `3 groups — no drift` (observed) |
| CI `verify` / `visual` | ✅ / ✅ — `mergeStateStatus: CLEAN` after `visual` finished (observed; UNSTABLE = pending at fetch time) |
| `--preflight`, `--probe-parenting` | not re-run — the probe is paid; the transport is unchanged since the author's runs (observed, diff empty) |
| Implementation report | present, `.claude/reports/discovery-parent-id-341-report.md`; D1–D7 read; none is an undocumented divergence |

## What's good

- The fix is three surfaces reading ONE function (`parentCandidates`): the refusal, the brief and the gate cannot disagree by construction, and case 17 drives the brief ↔ refusal agreement rather than asserting it.
- Group 32's mechanism is real: the detector is proven able to detect on synthetic records before the fixture is trusted (32.1), the re-fold does compare record by record (32.3), and the freshness compare is live against the module hash (32.2a) — all three were made to go red by name in the report, with the package restored `cmp`-identical. F1 is about what the re-fold is SAID to prove, not what it does.
- The ledger lands in the TURN prompt, not the system prompt, and case 17 asserts both halves — the cache-holding invariant is gated, not remembered.
- Honesty: `answers.jsonl` matches the pre-registered sheet, `prd.md` is the projection's bytes, the report discloses the agent-written answers and the transient one-byte mutation, and `run.json` says `Real run — fictional scenario`.
- No human-typed text reaches `ledgerBrief`: `question_id` is bank-validated by the applier and `seq` is a number, so the brief is not a prompt-injection surface.

## Recommendation

**Request changes** for F1: the same sentence in four places (README, gates.md, the report, 32.3's message), plus gates.md's *Cannot reach* list. Nothing in F1–F5 touches the prompt surface, so the fingerprint `df6fbc35…` and the fixture stand — no re-record. F2 is a sentence in two places and the PR body; F3–F5 are one-liners. After the edits: `node tooling/build-checks.mjs` (32.3's message string is not hashed) and `node tooling/drift-check.mjs`.
