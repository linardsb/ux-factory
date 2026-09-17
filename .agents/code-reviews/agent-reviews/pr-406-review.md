# PR #406 review — run 2, the pre-grill audit (#292)

Reviewed: `git diff d0e65fa..0e27afb` (base main @ d0e65fa, head 0e27afb on
`feature/discovery-pre-grill-audit-292`). Uncommitted working-tree changes to
`agent-layer/gen-decisions.mjs` and `docs/epics/discovery-partner.*.md` are NOT part of this diff
(confirmed: `git diff d0e65fa..0e27afb --stat` touches neither file) and were excluded per instruction.

Repo is plain-JS/zero-dep Node ESM; reviewed against `CLAUDE.md` and `.claude/references/gates.md`,
not FastAPI/Python conventions.

## ✅ Strengths

- **`tooling/run-2-ready.mjs`'s six checks are real, not decorative.** I mutation-tested three of them
  directly against the live tree (each mutation applied to a temp copy or restored byte-for-byte
  afterward — verified with `diff`):
  - Appended a byte to the frozen fixture → check 1 goes red naming the new md5.
  - Changed `MAIN_TOOLS = Object.freeze([])` to `Object.freeze(['Read'])` in
    `portal/lib/discovery-transport.mjs` → check 3 goes red by name.
  - Ran with `--model bogus-model` → check 6 goes red by name; `--model claude-opus-5` and
    `--model claude-sonnet-5` both go green with the correct resolved fingerprint.
  - Check 5 was observed live: `node tooling/run-2-ready.mjs` on the current tree correctly fails on
    check 5 (`run.json already exists`) with exactly the message the header promises — this is the
    gate's documented post-run behavior, not a bug.
  - Checks 1, 2, 6 all pull from real git plumbing (`git ls-files`, `git log --format=%cI %aI`,
    `git diff --quiet HEAD`) and real module state (`declareFacets`/`selectDepth` from
    `discovery/bank.mjs`, `resolvePosture` from `portal/lib/discovery-postures.mjs`) — no check is a
    tautology over its own inputs.
- **`build-checks.mjs` 30.46 and 32.7 pins are correct and non-vacuous.** I independently computed
  `POSTURES.grill.fingerprint` and `resolvePosture({posture:'grill', model:'claude-opus-5'}).fingerprint`
  live against the committed tree — both match the literals pinned in the diff exactly
  (`76b7847d…` / `ba124c3c…`). `discovery/partner-audit-2/run.json` genuinely carries 23 `turnStats`
  entries, all stamped `ba124c3c1edb19905101aceca7c12e22`, so 32.7's new `partner-audit-2` row is
  comparing a real committed recording against a live-resolved value, not an empty set. `node
  tooling/build-checks.mjs` runs fully green on the PR tree.
- **The committed package is internally consistent and looks genuinely server-written.**
  - `transcript.jsonl`'s 32 `op` lines have seq 1…32 with zero gaps, strictly increasing timestamps.
  - `discovery/prd-projection.mjs partner-audit-2 --stdout` (pure re-fold of the real ops) is
    **byte-identical** to the committed `prd.md` — no hand edits were applied after generation.
  - Every transcript line the README quotes as evidence for the rubric findings (seq 20, 22, 31) is a
    **verbatim** match against the actual transcript content, not a paraphrase.
  - `answers.jsonl` holds exactly one `kind: "document"` line, consistent with the header's own claim
    that `reads: []` and the fixture rides in the system prompt (#286), never on disk as a named read.
  - The `t21` "Credit balance is too low" line is left in place rather than scrubbed, and both README
    and the report describe it consistently with the transcript's own text lines — this is the honest
    behavior the honesty contract calls for (memory: "SDK error result wears success").
- **Doc drift is genuinely fixed, not merely reworded.** `partner-audit-1`'s README line changed from
  "the only committed existing-prd run" to "the first committed existing-prd run" now that
  `partner-audit-2` exists; I grep'd the repo for other stale "only committed" claims tied to this
  pairing and found none. `gates.md`'s group 32 prose and the new run-2 pre-run-gate paragraph both
  match what the code does.
- **Zero new dependencies, matches sibling style.** `tooling/run-2-ready.mjs` imports only `node:*`
  builtins plus existing repo modules; header/structure closely mirrors `tooling/run-1-ready.mjs`
  (same `fail(n, msg)` pattern, same `tracked`/`committedAt`/`matchesHead` triad, same CLI guard idiom).
  Errors are plain `Error` naming the offending path/check, consistent with the repo's no-error-taxonomy
  rule.

## ⚠️ Issues Found

- **Category: Documentation — Severity: Low.** `discovery/README.md` (§The pre-grill audit) states
  "every turn inside the prompt cache's five-minute window (the longest interval before a turn was
  171 s)". Reconstructing this from the committed `run.json.turnStats[].ts` values, the largest gap
  between consecutive turn-end timestamps is 178.0 s (`t20` → `t21`, across the credit-stop). Anchoring
  instead on the report's own "resumed 10:34:16Z" note (`.claude/reports/.../…-report.md`) gives ≈169 s.
  Neither reconstruction lands exactly on 171 s from the artifacts committed in this PR alone. This is
  very likely just a different (unreconstructable from committed files) internal anchor — e.g. an
  SDK-side request-sent timestamp rather than the op-recorded timestamp — and the surrounding claim
  (cache stayed warm) is independently verified true (`cacheReadTokens` is substantial and rising on
  every turn including `t21`, and every gap is well under 300 s). Not a credibility concern, just a
  number that isn't self-checking from what's in the repo. **Fix (optional):** either cite the anchor
  the 171 s figure was read from, or round the claim to "under 3 minutes" so it doesn't invite a
  fixture-vs-prose mismatch.

No Critical, High, or Medium issues found.

## 🔍 Questions/Clarifications

- 32.7's per-slug loop still `continue`s silently when a package's `run.json` is absent (pre-existing
  pattern, not introduced by this PR). Since `partner-audit-2/run.json` is committed in this same PR
  the check is not currently vacuous, but there's no companion assertion (parallel to 32.6's
  `sweptPackages >= 7`) that all four expected slugs were actually present and checked, rather than
  quietly skipped. Worth confirming this is intentionally out of scope for 32.7 (some other case may
  already cover "all four ran"), rather than a gap that reopens if a future run.json goes missing.

## ✨ Recommendations

- Consider a one-line citation for the 171 s figure's source (see Low issue above) so a future reader
  can reproduce it from committed artifacts without recomputing from a different anchor and getting a
  different number.

## 📋 Review Summary

- **Overall assessment: Ready to commit / merge.**
- Issues by severity: Critical 0 · High 0 · Medium 0 · Low 1.
- No critical blockers. The one Low finding is a documentation-precision nit on a number that is not
  independently verifiable from the committed artifacts, not a sign of a hand-edited or dishonest
  recording — every stronger check (seq density, timestamp order, prd.md byte-identity, transcript
  quote fidelity, mutation-tested gate checks, live-recomputed fingerprint pins) came back clean.

**Do not start fixing any of the above without the user's explicit approval.**
