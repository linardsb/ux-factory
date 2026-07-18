# Implementation Report — Trace recorder hardening (ticket #25)

**Plan**: `.claude/plans/recorder-hardening.md`   **Branch**: `feature/recorder-hardening`   **Status**: COMPLETE

## Summary

Hardened the trace-recording pipeline against secret leakage before #13's composition runs reuse it. A new zero-dep redaction engine (`portal/lib/redact.mjs`, 9 named rules) now runs inside the recorder — the trace's only legal producer — over every trace-derived string before any byte hits disk, with the rule list stamped into `meta.redaction` (honesty-contract amendment made in `traces/README.md` itself). The fence now denies reads of secret paths and records every denial as a `denied: true` step, `--dry` runs fully in its scratch cwd, and the four review-Low polish items (token fallbacks, player stat guards, `destroy()` note) landed. Proven live: a clean `--dry` run shows the provoked denial recorded exactly once and a synthetic `TEST_TOKEN=…` reduced to `[redacted:secretlike-assignment]` with the raw value nowhere in the file.

## Tasks completed

- Redaction engine (named rules, `redactString`, `redactDeep`, `RULE_NAMES`) → `portal/lib/redact.mjs` (CREATE)
- Redact tool inputs/responses/errors + agent text, stamp `meta.redaction`, record fence denials as steps, thread `cwd` → `portal/lib/trace-recorder.mjs` (UPDATE)
- `SECRET_PATHS` read+write fence, dry `cwd`, provoked denial + synthetic redaction self-test in the dry task, denial count in the ✓ line → `portal/record-trace.mjs` (UPDATE)
- Guard `numTurns`/`totalCostUsd`, `destroy()` note in header → `system/trace-player.mjs` (UPDATE)
- Drop `1.3rem`/`0.72rem` token fallbacks → `trace.html` (UPDATE)
- Document `meta.redaction`, `step.redacted`, denied-step shape, dry-run denial → `traces/README.md` (UPDATE)
- Additive checks: `meta.redaction.rules` shape, denied-step well-formedness → `tooling/validate-trace.mjs` (UPDATE)

## Tests added

No test framework (project rule) — validation by running the surfaces:

- **Unit** (node one-liners): all 9 redaction rules hit their synthetic positives (`sk-ant-oat01-…`, `ghp_…`, fake PEM block, `MY_TOKEN=…`, JWT, Bearer, AWS, Slack, OpenAI-shaped); 4 negatives (prose, file paths, token names) untouched; deep walk redacts nested arrays; input object never mutated; `parseTrace` still pure under Node.
- **Integration** (live, sanctioned): `node portal/record-trace.mjs --dry` → clean run, exit 0 — 9 steps, phases plan→gate→implement→validate, 0 null-phase, **exactly one** `denied: true` step (the provoked `echo fence-check`; confirms a PreToolUse deny never double-records), `meta.cwd` = scratch dir, artifact path `smoke.md` scratch-relative, `meta.redaction.rules` (9) present, synthetic secret redacted end-to-end. Curated the dry output (scratch only): redaction meta, denied step and `[redacted:…]` spans all survive the spreads.
- **Negative** (validator, scratch fixtures): empty `redaction.rules`, `denied` with `ok: true`, `denied` without `error` — all three fail loudly naming `file:line: field`.
- **Browser** (agent-browser on a local static server): committed `demo-notice` renders 23 steps, header shows "22 turns · 2m 38s · ~$0.45", `.trace-task` = 20px and `.trace-act-head` = 12px (real token values after the fallback drop), no "undefined" anywhere; a minimal trace with no `numTurns`/`totalCostUsd` renders neither a turns span nor a "$" span; `destroy()` runs clean.

## Validation results

- Level 1 `node --check` × 5 touched .mjs — pass.
- Level 2 redact unit ladder — pass (9 positives, 4 negatives).
- Level 3 `node tooling/validate-trace.mjs` — both committed traces ✓ **unchanged** (additivity proof); live `--dry` ✓ clean; curation passthrough ✓.
- Level 4 browser render + portal boot (`/api/health` → `{"ok":true}`) — pass.
- Level 5 `git diff traces/*.jsonl` — empty (only `traces/README.md` changed, which the plan itself amends).

## Deviations from the plan

1. **`RULES` tuples carry an optional third element** (a replacement string) instead of strict `[name, regex]` pairs — `secretlike-assignment` needs its group-preserving replacement (`$1$2[redacted:…]$2`) and a per-rule replacement is cleaner than a special case inside `redactString`. `RULE_NAMES` destructuring is unaffected.
2. **The dry task prompt was tightened twice beyond the plan's wording.** Runs 1–2 showed the model `ls`-ing its (now empty, scratch) cwd alongside the first marker → an off-fence denial recorded pre-plan → `phase: null` → exit 1. This is the plan's own documented edge case with its prescribed remedy (tighten prompt, re-run — no special-casing), and notably the violation is only *visible* because denial recording now works. The final prompt leads with the prohibition; run 3 was clean.
3. **Added a synthetic redaction self-test to the dry task** (`TEST_TOKEN=synthetic1234567890` in the final narration): AC #1 wants a live "synthetic-secret dry run shows `[redacted:<rule>]`" proof, which the plan's integration list didn't otherwise provide. Dry output never ships.
4. **The denial step's `error` is redacted too** (the plan's snippet wrote `verdict.message` raw) — consistent with AC #1's "every string the recorder writes". Rule-name union includes it.
5. **The plan's `parseTrace` VALIDATE one-liner expects `trace: empty` for input `'x'`** — the actual error is `trace line 1: not JSON`; validated both messages explicitly instead.

## Issues encountered

- **Hook-vs-iterator chronology (worth knowing for #13):** when the model emits a text block and a tool call in the *same* assistant message, the PreToolUse hook fires (and records a denial) before the message loop writes the text step — run 1 showed a denial stamped 40ms before the `[[piv:plan]]` text that preceded it in the model's actual output, attributing the denial to `phase: null`. Not fixed: GOTCHA #3 forbids buffer-and-sort, the recorded order is the true write order, and a compliant run (no off-fence calls) never hits it.
- The portal was already running on 4747 during the boot check; my cleanup `pkill` briefly killed that pre-existing instance — restarted immediately, `/api/health` healthy.
- Dry runs cost ~$0.49 total across the three iterations (sanctioned by the plan; scratch only).

## Acceptance criteria

AC #1–#7 all verified (redaction + read-fence live-proven; single recorded denial; fallbacks gone; scratch cwd end-to-end; no undefined/fake-zero stats; `destroy()` note durable; contract documented, validator additive, committed traces byte-identical).
