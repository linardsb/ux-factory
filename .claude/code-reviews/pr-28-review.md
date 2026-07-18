# PR #28 Review — trace recorder hardening (record-time secret redaction + fence denial steps)

**Verdict: APPROVE** (posted as comment — solo repo, GitHub rejects self-approval) · Critical 0 · High 0 · **Medium 2** · Low 0

Reviewed with fresh eyes via the code-reviewer agent (all 7 changed files read in full, plus the load-bearing unchanged `tooling/curate-trace.mjs` / `portal/lib/env.mjs` / committed traces), against `CLAUDE.md` + `traces/README.md` as the rubric. The implementation report's 5 documented deviations were treated as intentional decisions and verified as such — no undocumented divergences found.

## Summary

The PR does what it claims. Every trace-derived string write-site was traced by hand: the meta line carries only hardcoded/SDK-generated values, the result line only booleans/numbers/timestamps, and every other path (tool steps, text steps, denial steps, errors) runs through `redactDeep`/`redactString` before `write()`. The no-mutation claim, the `.replace()` lastIndex claim, the fail-closed fence flow, the no-double-record invariant, and validator additivity all held up under empirical test, not just reading.

## Issues

### Medium 1 — `secretlike-assignment` misses quoted-key and lowercase-key secrets
`portal/lib/redact.mjs:25-26`

The catch-all rule for generic/opaque secrets requires an *unquoted*, *UPPERCASE* key. Reproduced:

- `"TOKEN": "abcdefghij1234567890"` (JSON shape) → `rules: []` — the closing quote sits between key and separator.
- `password: hunter2longenough` / `apiKey: abcdefghij1234567890` → `rules: []` — no `i` flag.

No current leak: this repo's real secrets (`CLAUDE_CODE_OAUTH_TOKEN=`, `FIGMA_TOKEN=` in `portal/.env`) are SCREAMING_SNAKE + unquoted and ARE caught, and the 8 service-branded rules match values regardless of key shape. But JSON-shaped data (anything resembling `.sessions.json` content, JSON Bash output) is exactly what #13's wider read surface will hit, and this rule is the stated backstop for the fence's documented blind spots (`node -e`, pathless Grep). The dry-run self-test (`TEST_TOKEN=…`) only exercises the easy unquoted-uppercase case.

**Fix direction** (needs its own validation pass, not a drop-in): tolerate an optional quote between keyword and separator + add case-insensitivity, re-tested against a matrix including quoted keys, lowercase keys, and prose false-positives — both changes interact with the group-preserving replacement `$1$2[redacted:…]$2`. Extend the dry-run synthetic self-test to cover a quoted/lowercase case.

### Medium 2 — `github-token` misses fine-grained PATs (`github_pat_…`)
`portal/lib/redact.mjs:18`

`/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g` covers only classic prefixes. Reproduced: `github_pat_11AAAAAAA0abc…` → `rules: []` (classic `ghp_…` correctly redacts). Fine-grained PATs are GitHub's current default issue format, and this repo leans on the `gh` CLI — a plausible string in recorded Bash output.

**Fix**: add an alternative branch, e.g. `/\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/g`, and re-run the rule ladder.

Both Mediums are robustness gaps in a boundary explicitly built for #13's reuse — worth closing **before #13's composition runs**, but not defects in this PR's stated scope. Suggested handling: a small follow-up on issue #25's epic thread (or fold into #13's pre-work).

## Validation (all run fresh in this review)

| Check | Result |
|---|---|
| `node --check` × 5 touched .mjs | ✓ |
| `node tooling/validate-trace.mjs` — both committed traces (additivity proof) | ✓ · `traces/*.jsonl` byte-identical vs main |
| Redaction unit ladder — 9 synthetic positives, 4 negatives, deep-walk, no input mutation | ✓ |
| `grep '1.3rem\|0.72rem' trace.html` | 0 ✓ |
| `parseTrace` pure under Node | ✓ |
| Validator negatives (empty `redaction.rules` / `denied`+`ok:true` / `denied` w/o `error`) | all fail loudly naming file:line:field ✓ |
| Valid denied-step fixture | passes ✓ |
| Curation passthrough (`meta.redaction` + `denied` step survive spreads) | ✓ |
| Portal `/api/health` | `{"ok":true}` ✓ |
| Live `--dry` Agent SDK run | not re-run (real API cost); report documents 3 runs incl. the provoked-denial + synthetic-redaction proof |

## What's good

- **The security boundary is real**: all five `write()` call sites verified — no path where a run-derived string reaches disk unredacted.
- `redactDeep` provably doesn't mutate the hook's shared `tool_input`; artifact paths correctly computed from the ORIGINAL input so redaction can't break the validator's artifact-exists check.
- Fence control flow: fail-closed on throw, denial-recording wrapped so a recording bug can't turn a deny into an allow, chronology invariants (shared `seq`, append-only) preserved.
- Validator/README changes are genuinely additive — committed traces green and byte-identical; the contract amendment ("exactly as recorded" = post-redaction) is made in the contract itself, honesty-contract-consistent.
- Surgical diff, correct headers, one-concern-per-module, zero-dep discipline throughout; the hook-vs-iterator chronology note in the report is exactly the kind of hand-off knowledge #13 needs.

## Recommendation

**Approve.** Merge as-is; track the two Mediums as a follow-up before #13's runs. Non-blocking extra: consider defensively redacting `taskSummary`/`slug` in `recordRun` when #13 starts passing less-controlled inputs.

---
*Agentic review (piv-review-pr, fresh context + code-reviewer agent). A human makes the final call.*
