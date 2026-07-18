# Feature: Trace recorder hardening (ticket #25 — PR #24 review follow-ups)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Harden the trace-recording pipeline (recorder → curation → validation → player) against secret leakage and polish the deferred Lows from the PR #24 review rounds, **before the next real agent run** — #13's build-time composition runs reuse this recorder, so the redaction layer must exist first. Five items, all scoped by issue #25:

1. **Secret-pattern redaction over recorder output** (the Medium): tool inputs AND responses (must cover Bash stdout) are scanned against a named-rule denylist before any line is written; the rules are recorded in `meta` (honesty contract). Plus: deny reads of secret paths (`.env` / `*.pem` / `.ssh` / `.aws` / `.sessions.json`) outright at the fence.
2. **Record fence denials as steps** — today a PreToolUse deny fires no PostToolUse/Failure hook, so "the agent tried something off-fence" is invisible in the trace. The governance story deserves the receipt.
3. **`trace.html` token fallbacks** — `1.3rem` / `0.72rem` don't match the real `--type-h3: 20px` / `--type-eyebrow: 12px`; drop them.
4. **`--dry` cwd threading** — `trace-recorder.mjs` hardcodes `cwd: REPO_DIR` even in dry mode; thread `cwd` through `recordRun`.
5. **Player result-stat guards** — `result.numTurns` / `totalCostUsd` render unguarded ("undefined turns" on a valid-but-minimal trace); plus the **`destroy()` note** for #10's embedding, made durable in the module header.

## User Story

As the author running the next real recorded agent run (#13's composition spikes)
I want the recorder to redact secret patterns at write time, refuse secret-file reads, and record fence denials
So that a public, committed, honesty-locked trace can never carry a credential — and the fence's work is visible in the exhibit instead of invisible.

## Problem Statement

`portal/lib/trace-recorder.mjs` writes `tool_input` + `tool_response` verbatim (≤4000 chars) into files that are committed unedited and served publicly (`_headers:17` → `/traces/*` public, max-age=300). The recorded agent's read surface is broad (Read/Grep/Glob auto-approved via `allowedTools`; Bash `node -e` is full system access — review round 1, Low #2: the node-prefix fence is a nudge, not a boundary). A future run that reads a secret file or prints an env var lands it at a public URL, with the honesty contract ("never hand-edit a trace") actively discouraging removal. Four smaller latent traps (items 2–5) ship alongside.

## Solution Statement

Redact at the **only legal producer**, before any byte hits disk: a new `portal/lib/redact.mjs` (one concern per module) exports a named-rule engine; `trace-recorder.mjs` applies it to every trace-derived string (tool input values, responses, errors, agent text) and stamps the rule names into `meta.redaction` — so the raw file remains "exactly as recorded", where *recorded* now means *post-redaction*, and the reader can see precisely which rules ran. The existing PreToolUse fence hook gains two jobs: deny reads of secret paths (same `SECRET_PATHS` regex as the write fence), and write a `denied: true` step when it denies anything. Items 3–5 are small local fixes in `trace.html`, `recordRun`'s signature, and the player header strip. `traces/README.md` (the format contract — "written first, everything else conforms") and `tooling/validate-trace.mjs` (the drift guard) learn the new fields **additively** — the committed `demo-notice` pair must keep validating unchanged.

## Out of Scope / Non-Goals

- **Not re-recording `demo-notice`** — both committed traces were verified clean in review; they predate redaction and stay as-is. Validator changes must be additive (redaction meta optional).
- **Not building a real Bash sandbox** — review round 1 Low #2 declared the `node `-prefix fence moot while `node -e` is allowed; redaction-over-output is the chosen mitigation. No `spawn({shell:false})` rework.
- **Not touching `tooling/curate-trace.mjs` semantics** — curation stays selection + truncation only; it passes the new fields through untouched (spread already does).
- **Not restyling denied steps in the player** — they render through the existing `ok:false` fail path; #10 owns the designed surface.
- **Not changing `portal/lib/chat.mjs`** — it doesn't record traces.
- **Not bumping `meta.version`** — all changes are additive to version 1.

## Feature Metadata

**Feature Type**: Enhancement (security hardening + review-Low polish)
**Estimated Complexity**: Low–Medium (small diffs, but honesty-contract and format-contract surfaces)
**Primary Systems Affected**: `portal/lib/trace-recorder.mjs`, `portal/record-trace.mjs`, new `portal/lib/redact.mjs`, `system/trace-player.mjs`, `trace.html`, `traces/README.md`, `tooling/validate-trace.mjs`
**Dependencies**: none new — zero-dep Node ESM throughout (`@anthropic-ai/claude-agent-sdk` already present for the live smoke test)

## Related Work

**Implements**: [linardsb/ux-factory#25](https://github.com/linardsb/ux-factory/issues/25) — close with `Closes #25` on the PR   ·   **Epic**: #1 (`docs/epics/ai-first-ux-factory.architecture.md` — §Honesty and §Data model (Trace) are inherited, not re-decided)

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/trace-recorder-player.md` — the #5 plan that built this stack; its GOTCHAs (#2 hooks must never alter the run, #3 never buffer-and-sort, #4 keep failed steps) still govern.
- `.claude/code-reviews/pr-24-review.md` + `pr-24-review-round2.md` — the findings this ticket closes out; round 2 verified the PreToolUse fence live (deny works, `node` allowed).
- `.claude/plans/epic-1-remaining-plan.md` — Wave 0 ordering: this lands FIRST so #13 records under the hardened recorder.

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- #13 agentic-UI study — its composition runs reuse `recordRun` + the hardened fence pattern.
- #10 Factory page — consumes the `destroy()` contract this plan documents; #9 CI — `validate-trace.mjs` is a candidate gate, so keep it green.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `portal/lib/trace-recorder.mjs` (whole file, 149 lines) — Why: the core surface. `toolStep` (52–69) builds tool steps; `hook` (75–79) must never throw into the run; `fenceHook` (87–96) is where denials become visible and fails CLOSED; `query()` options (98–108) hardcode `cwd: REPO_DIR`; meta write (113–118); text-block handling + PIV marker scan (119–132).
- `portal/record-trace.mjs` (whole file, 181 lines) — Why: `makeFence` (91–112) is the fence to extend with read-denials (note the existing `/\.env|\.sessions\.json/i` write check at 96 — unify); the `allowedTools` vs `tools` semantics comment (26–32) explains WHY the PreToolUse hook is the only reliable read-deny point; `--dry` block (143–157) is where cwd threading + the dry task's paths change; `summarize` (122–140) gets the denial count.
- `system/trace-player.mjs` (lines 98–110) — Why: the unguarded stats. Line 105 `` `${result.numTurns} turns` `` and 108 cost are the two to guard (`fmtDuration` at 52 already shows the guard pattern). Header comment block (1–18) is where the `destroy()` note lands. `toolCard` (72–90) already renders `ok:false` + `error` — denied steps ride it for free.
- `trace.html` (lines 27, 37) — Why: the two wrong fallbacks (`1.3rem`, `0.72rem`). Leave every other fallback alone (surgical-changes rule).
- `tooling/validate-trace.mjs` (whole file, 103 lines) — Why: the drift guard to extend additively. Step loop (56–76) gains the `denied` check; meta checks (26–48) gain the optional `redaction` shape check. Error convention: every throw names `file:line: field`.
- `tooling/curate-trace.mjs` (lines 53–66) — Why: verify (don't change) that `{ ...step }` / `{ ...meta }` spreads pass `redacted`, `denied`, and `meta.redaction` through; denied steps have no `response` — line 62's `typeof step.response === 'string'` ternary already handles `undefined`.
- `traces/README.md` (whole file) — Why: "this contract — written first, everything else conforms." Every new field is documented HERE first; the honesty-rules block (13–24) must gain the redaction sentence.
- `portal/lib/env.mjs` — Why: `REPO_DIR` import pattern; the `.env` hand-parse this whole exercise protects.
- `.claude/code-reviews/pr-24-review-round2.md` (lines 8–25) — Why: the verified fence semantics (PreToolUse fires before EVERY execution, fast path included; `dontAsk` was rejected for breaking legitimate allows) — do not re-litigate.
- `_headers` (line 17) — Why: proof `/traces/*` is public — the reason redaction is record-time, not serve-time.

### New Files to Create

- `portal/lib/redact.mjs` — the redaction engine: named rules + deep string-walk. One concern per module (CLAUDE.md portal rule). #13 reuses it.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `traces/README.md` — the Trace format contract (schema, honesty rules, phase tagging). This plan amends it; read it whole first.
- `docs/epics/ai-first-ux-factory.architecture.md` §Honesty — surface #2 (trace labels) wording is load-bearing and must not change.
- Agent SDK hook semantics: already established in-repo — `portal/record-trace.mjs:26-32` comment + `.claude/code-reviews/pr-24-review-round2.md`. No external docs needed; SDK is pinned at `^0.1.77` and its `.d.ts` was verified during #5.

### Patterns to Follow

**Errors** (project rule): throw plain `Error` naming the offending path — `tooling/validate-trace.mjs:60` `` throw new Error(`${rel}:${ln}: step "seq" (${s.seq}) must strictly increase`) ``.

**Hook safety** (GOTCHA #2, `trace-recorder.mjs:71-74`): recording hooks are try/caught and always return `{ continue: true }` — a recording bug must never alter the run it observes. The fence hook is the one exception (blocking is its job) and fails closed.

**Chronology** (GOTCHA #3, `trace-recorder.mjs:54`): text and tool steps share one `seq` via `++seq`; `appendFileSync` line by line; never buffer and sort. Denied steps join the same counter.

**Named-rule constants recorded in meta** (`tooling/curate-trace.mjs:18` `RULES = ['strip-piv-markers', …]` → written into `meta.curation.rules`): the redaction engine mirrors this exactly — rule names are the audit trail.

**File headers**: feature files open citing their governing doc (`// portal/lib/redact.mjs — secret-pattern redaction (epic #1, ticket #25). Honesty contract: …`).

**Validation-by-running** (CLAUDE.md): no test framework — `node --check`, the validators' ✓ lines, and a `--dry` live run ARE the suite.

---

## IMPLEMENTATION PLAN

### Phase 1: Redaction engine (`portal/lib/redact.mjs`)

Foundational — everything else consumes it.

**Tasks:**
- Named rules list, replacement `[redacted:<rule>]`, deep walk over objects/arrays/strings, per-call hit-rule names returned.

### Phase 2: Recorder integration (`portal/lib/trace-recorder.mjs`)

**Depends on:** Phase 1

**Tasks:**
- Redact every trace-derived string before writing; stamp `meta.redaction`; record fence denials as steps; thread `cwd`.

### Phase 3: Runner fence + `--dry` (`portal/record-trace.mjs`)

**Depends on:** Phase 2 (new `recordRun` signature)

**Tasks:**
- `SECRET_PATHS` read+write denials in `makeFence`; pass `cwd` in dry mode; make the dry task provoke one denial (proves item 2 end-to-end); surface denial count in the ✓ line.

### Phase 4: View-time polish (`system/trace-player.mjs`, `trace.html`)

**Independent of:** Phases 1–3 (pure view-time; parallelizable, but same session is fine)

**Tasks:**
- Guard `numTurns`/cost; `destroy()` note in the header; drop the two wrong token fallbacks.

### Phase 5: Contract + drift guard (`traces/README.md`, `tooling/validate-trace.mjs`)

**Depends on:** Phases 1–3 (documents what they shipped)

**Tasks:**
- Document `meta.redaction`, `step.redacted`, denied steps; additive validator checks; committed traces stay green.

### Phase 6: Validation

**Tasks:**
- Full check ladder below, including one live `--dry` run.

---

## STEP-BY-STEP TASKS

### CREATE `portal/lib/redact.mjs`

- **IMPLEMENT**: Header comment citing ticket #25 + the honesty framing ("redaction happens at record time in the trace's only legal producer; rules are named in meta; a redacted span reads `[redacted:<rule>]`"). Export:
  - `RULES` — ordered `[name, regex]` pairs (order matters: block rules first, `anthropic-key` before any generic `sk-` rule):
    - `private-key-block` — `/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g`
    - `anthropic-key` — `/\bsk-ant-[A-Za-z0-9_-]{10,}\b/g` (covers `CLAUDE_CODE_OAUTH_TOKEN` values `sk-ant-oat01-…` — THE secret on this machine)
    - `openai-key` — `/\bsk-(?!ant-)[A-Za-z0-9_-]{20,}\b/g` (negative lookahead so anthropic wins by name)
    - `github-token` — `/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g`
    - `aws-access-key-id` — `/\b(?:AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}\b/g`
    - `slack-token` — `/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g`
    - `jwt` — `/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g`
    - `bearer-auth` — `/\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/g`
    - `secretlike-assignment` — `/\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY)[A-Z0-9_]*\s*[:=]\s*)(["']?)[^\s"']{8,}\2/g` with replacement keeping group 1+2 (`$1$2[redacted:secretlike-assignment]$2`) — the var NAME stays visible, the value goes.
  - `redactString(s) → { value, rules }` — apply every rule, collect names that hit.
  - `redactDeep(v) → { value, rules }` — recurse objects/arrays, redact string leaves, return a NEW structure (never mutate the hook's input object — GOTCHA #2 territory: mutating `tool_input` could alter what downstream hooks see).
  - `RULE_NAMES` — `RULES.map(([n]) => n)` for the meta stamp.
- **PATTERN**: named-rule constants → meta, exactly like `tooling/curate-trace.mjs:12-18`; plain-what/why helper header like `portal/lib/kb.mjs:1-2`.
- **IMPORTS**: none (pure, zero-dep — also trivially reusable by #13).
- **GOTCHA**: regexes with `g` flag keep `lastIndex` state — either reset `re.lastIndex = 0` before each use or call via `String.replace` only (replace resets it internally; `.test()` does NOT). Use `.replace()` and detect hits by comparing before/after or via a callback flag.
- **VALIDATE**: `node -e "const m = await import('./portal/lib/redact.mjs'); const r = m.redactString('CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-aaaaaaaaaaaaaaaaaaaaaa'); console.log(JSON.stringify(r)); if (r.value.includes('sk-ant-')) { console.error('LEAK'); process.exit(1); }" --input-type=module`
- **SATISFIES**: AC #1

### UPDATE `portal/lib/trace-recorder.mjs` — redact everything written

- **IMPLEMENT**:
  - Import `{ redactDeep, redactString, RULE_NAMES }` from `./redact.mjs`.
  - In `toolStep` (line 52): redact `input.tool_input` via `redactDeep` and the capped response string + `input.error` via `redactString`; union the hit rule names; if any, set `step.redacted = [...names]`.
  - In the text-block branch (line 130): redact `block.text` the same way — an agent narration can quote Bash stdout verbatim, so text is in scope too. (Redact AFTER the PIV-marker scan — markers never contain secrets and the scan must see the original block structure; in practice redaction can't produce a marker-shaped line, but keep the order deliberate.)
  - In the meta write (line 114–118): add `redaction: { rules: RULE_NAMES }` — recorded on EVERY run, hits or not (the honesty contract wants "what protection ran", which is static and known at init; per-step `redacted` arrays show where it fired).
  - Update the file's honesty header (lines 8–10): the only-producer sentence gains "…and redacts secret patterns (portal/lib/redact.mjs) before any line is written; rules recorded in meta."
- **PATTERN**: `capResponse` (26–30) — same shape: pure helper in, `{ value, flag }` out, applied inside `toolStep`.
- **GOTCHA**: do NOT redact `outFile` paths or the artifact `path` computation inputs — only the recorded strings. `step.artifact.path` derives from `tool_input.file_path` BEFORE redaction would matter (file paths shouldn't match secret rules, but compute the artifact from the ORIGINAL input, then store the redacted input — a `[redacted:…]` file_path would break the validator's artifact-exists check).
- **VALIDATE**: `node --check portal/lib/trace-recorder.mjs`
- **SATISFIES**: AC #1

### UPDATE `portal/lib/trace-recorder.mjs` — record fence denials as steps

- **IMPLEMENT**: In `fenceHook` (87–96), when the verdict is deny (and in the catch branch), write a step before returning the deny:
  ```js
  { type: 'step', seq: ++seq, ts: now(), phase: currentPhase, kind: 'tool',
    tool: input.tool_name, input: <redacted tool_input>, ok: false, denied: true,
    error: verdict.message /* or the fail-closed message */ }
  ```
  Increment `nullPhaseSteps` when `currentPhase === null` (same accounting as `toolStep`); count denials in a new `denials` counter; wrap the write in try/catch so a write failure still returns the deny (fence stays fail-closed, recording stays non-fatal). Return `denials` from `recordRun` (line 147).
- **PATTERN**: `toolStep` for the step shape; the deny return shape at 90–91 is already correct — only the step write is added.
- **GOTCHA**: PR #24 round 2 verified a PreToolUse deny means the tool never executes and **no PostToolUse/Failure hook fires** — so no double-record. But confirm in the `--dry` run: the provoked denial must appear exactly ONCE. Also: no `response`/`toolUseId` on denied steps — `curate-trace.mjs:62` and `toolCard` both tolerate `undefined`.
- **VALIDATE**: `node --check portal/lib/trace-recorder.mjs` (live proof comes with the `--dry` task below)
- **SATISFIES**: AC #2

### UPDATE `portal/lib/trace-recorder.mjs` — thread `cwd`

- **IMPLEMENT**: Add `cwd = REPO_DIR` to `recordRun`'s destructured params (line 35); use it in the `query()` options (line 101), the meta line (`cwd` field, line 117), and the artifact relativization (line 64: `path.relative(cwd, path.resolve(cwd, fp))`).
- **GOTCHA**: keep the default `REPO_DIR` so the real-run call site in `record-trace.mjs:169-173` needs no change.
- **VALIDATE**: `node --check portal/lib/trace-recorder.mjs`
- **SATISFIES**: AC #4

### UPDATE `portal/record-trace.mjs` — read-fence + dry cwd + denial provocation

- **IMPLEMENT**:
  - Hoist one `SECRET_PATHS = /(^|\/)\.env(\.|$)|\.pem$|(^|\/)\.ssh(\/|$)|(^|\/)\.aws(\/|$)|\.sessions\.json/i` const; use it in the existing Write/Edit branch (replacing the inline regex at line 96) AND in the Read/Grep/Glob branch (108–109): deny when `input.file_path` (Read) or `input.path` (Grep/Glob) matches — message names the path, e.g. `` `The recorded run may not read secret paths (${fp}).` ``. Unmatched/absent paths stay allowed.
  - `--dry` block (143–157): pass `cwd: dryDir` to `recordRun`; rewrite the dry task's `kb-format.md` reference to the absolute `path.join(REPO_DIR, '.claude/references/kb-format.md')` (with `cwd` now the scratch dir, the relative path would miss); extend the dry task's validate phase with one deliberate off-fence attempt — "then attempt exactly one Bash command `echo fence-check` (it will be denied — note the denial and continue)" — so every smoke run proves denial-recording live.
  - `summarize` (122–140): print the denial count in the ✓ line (`· N denied`), informational only — denials do not flip `clean` (the real-run task shouldn't provoke any; the dry task provokes exactly one by design, and dry output never ships).
  - Update the header comment's mode description (line 7) — the smoke test now also "proves the fence denies + records".
- **PATTERN**: the existing `makeFence` structure (91–112) — per-tool branches, deny messages in plain prose naming the constraint.
- **GOTCHA**: `allowedTools: READONLY` auto-approves Read/Grep/Glob and **skips `canUseTool`** — the read-deny only bites because `recordRun` wires the same fence into the PreToolUse hook (which fires before every execution). Do NOT remove read tools from `allowedTools` — that would route them through interactive permissions. Also: Bash `node -e` can still read anything (declared moot in review) — redaction is the layer that catches that; say so in the fence comment.
- **VALIDATE**: `node --check portal/record-trace.mjs`
- **SATISFIES**: AC #1 (deny reads), #2 (provoked denial), #4 (dry cwd)

### UPDATE `system/trace-player.mjs` — result-stat guards + destroy() note

- **IMPLEMENT**:
  - Line 105: append the turns span only when `Number.isFinite(result.numTurns)`.
  - Line 108: append the cost span only when `result.totalCostUsd != null && Number.isFinite(Number(result.totalCostUsd))` (drop the `?? 0` — "~$0.00" for a missing figure is a small honesty smell anyway).
  - Header comment (after line 17): one durable sentence — "Embedding surfaces (#10's Factory page) MUST call the returned `destroy()` before re-rendering or removing the player — the module adds a document-level keydown listener that otherwise stacks."
- **PATTERN**: `fmtDuration` + the `if (dur)` guard at 106–107 — exactly the conditional-append idiom to mirror.
- **GOTCHA**: `meta.model`/dates are safe (`el()` skips nullish text; `fmtDate` try/catches) — only the two template-literal spans need guards. Don't touch anything else in the header strip.
- **VALIDATE**: `node --check system/trace-player.mjs` then `node -e "const m = await import('./system/trace-player.mjs'); m.parseTrace('x')" --input-type=module 2>&1 | grep -q 'trace: empty' && echo parse-ok` (parseTrace still pure/Node-safe)
- **SATISFIES**: AC #5, #6

### UPDATE `trace.html` — token fallbacks

- **IMPLEMENT**: Line 27 `var(--type-h3, 1.3rem)` → `var(--type-h3)`; line 37 `var(--type-eyebrow, 0.72rem)` → `var(--type-eyebrow)`. (Drop, not correct: `tokens.contract.css` is always loaded first and guarantees values — a duplicated literal is a second drift trap.) Touch nothing else.
- **VALIDATE**: `grep -c '1.3rem\|0.72rem' trace.html` → `0`
- **SATISFIES**: AC #3

### UPDATE `traces/README.md` — the format contract

- **IMPLEMENT** (contract first — everything conforms to this file):
  - Honesty-rules block: add one bullet — the recorder redacts secret patterns before writing (`portal/lib/redact.mjs`); redaction is part of *recording*, not curation; the rule names are in every `meta.redaction`; redacted spans read `[redacted:<rule>]`. Traces recorded before ticket #25 predate this and carry no `redaction` record.
  - Meta schema example: add `"redaction": { "rules": ["private-key-block", "anthropic-key", "…"] }`.
  - Step schema: document optional `"redacted": ["<rule>", …]` on any step, and the denied-step shape (`"ok": false, "denied": true, "error": "<fence message>"` — no `response`/`toolUseId`/`artifact`; kept through curation like every failed step).
  - Workflow section: note the `--dry` smoke now provokes + records one denial.
- **VALIDATE**: proofread against the actual `--dry` output (next task) — the contract must describe what the recorder really writes.
- **SATISFIES**: AC #1, #2 (format documented)

### UPDATE `tooling/validate-trace.mjs` — additive drift-guard checks

- **IMPLEMENT**:
  - Meta: if `meta.redaction` is present → `rules` must be a non-empty array of non-empty strings (mirror the curation-rules check at 33–34). Absent is legal (pre-#25 traces).
  - Steps: if `s.denied` → `s.ok` must be `false` and `s.error` non-empty; a denied step must NOT carry `artifact` (throw naming `file:line: field`, per convention).
  - Do NOT add a "raw traces must have redaction" requirement — it would fail the committed `demo-notice.raw.jsonl`.
- **PATTERN**: the existing curated-meta check at 32–34; error message style throughout the file.
- **VALIDATE**: `node tooling/validate-trace.mjs` → both committed traces still ✓ (proves additivity)
- **SATISFIES**: AC #7

---

## TESTING STRATEGY

No test framework (project rule) — validation is running the surfaces touched:

### Unit-level (node one-liners)

- `redact.mjs`: feed each rule one synthetic positive (fake `sk-ant-oat01-…`, fake `ghp_…`, a fake PEM block, `MY_API_KEY=abcdef123456`) and one negative (prose, a file path, `tokens.source.json` content) — every positive must come back `[redacted:<rule>]`, every negative unchanged. Synthetic strings only — never a real credential in a shell command.
- `parseTrace` stays Node-pure (no DOM) after the player edit.

### Integration (live, cheap, sanctioned)

- `node portal/record-trace.mjs --dry` — one real Agent SDK smoke run (pennies, scratch dir, never ships). Assert on the emitted JSONL: `meta.redaction.rules` present; `meta.cwd` = the scratch dir (not the repo); exactly ONE `denied: true` step from the provoked `echo` (no double-record — this is the hook-semantics check); artifact path relative to the scratch dir; ✓ line shows the denial count.

### Edge Cases

- Secret at the truncation boundary: a response capped at 4000 chars could cut a token mid-pattern → the remaining prefix no longer matches. Acceptable residual (a truncated fragment) — note it in `redact.mjs`'s header rather than engineering around it.
- Denied step before the first `[[piv:plan]]` marker → `phase: null` → validator fails the trace. Correct and existing semantics (tighten prompt, re-run); no special-casing.
- `curate-trace.mjs` on a trace with denied/redacted steps: spreads pass fields through; denied steps (no response) hit the non-string ternary branch. Verify by curating the dry output into the scratch dir (scratch only — `traces/` holds only real shippable runs).
- Grep with no `path` (defaults to cwd) can't be path-denied — redaction over its response is the backstop; documented in the fence comment.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
node --check portal/lib/redact.mjs portal/lib/trace-recorder.mjs portal/record-trace.mjs system/trace-player.mjs tooling/validate-trace.mjs
```

### Level 2: Unit

```bash
node -e "const m = await import('./portal/lib/redact.mjs'); const cases = ['sk-ant-oat01-aaaaaaaaaaaaaaaaaaaa','ghp_abcdefghijklmnopqrstuv','MY_TOKEN=abcdefgh12345678']; for (const c of cases) { const r = m.redactString(c); if (!r.rules.length) { console.error('MISS: ' + c); process.exit(1); } } const clean = m.redactString('read system/tokens.source.json'); if (clean.rules.length) { console.error('FALSE POSITIVE'); process.exit(1); } console.log('redact ✓')" --input-type=module
```

### Level 3: Integration

```bash
node tooling/validate-trace.mjs          # committed demo-notice pair stays ✓ (additivity proof)
node portal/record-trace.mjs --dry      # live smoke: redaction meta + one denied step + scratch cwd
node tooling/curate-trace.mjs <scratch>/smoke.raw.jsonl <scratch>/smoke.jsonl   # new fields survive curation (scratch only)
```

### Level 4: Manual Validation

```bash
npx serve .   # then open http://localhost:3000/trace.html?trace=demo-notice
```
- Player renders; header shows turns + cost (fields present in the committed trace); type sizes unchanged after the fallback drop.
- Read the dry-run JSONL end-to-end (the completion-checklist habit from #5): denial step reads honestly, redaction touched nothing benign.
- Portal still boots (`cd portal && npm start` → `/api/health` answers) — convention check; `server.mjs` doesn't import the recorder, but the lib dir changed.

### Level 5: Additional Validation (Optional)

- `git diff traces/` must be EMPTY at the end — the honesty contract's hard line for this ticket.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — every string the recorder writes (tool inputs, responses, errors, agent text) passes the named-rule redaction; `meta.redaction.rules` recorded on every new run; fence denies reads of `.env`/`*.pem`/`.ssh`/`.aws`/`.sessions.json`; a synthetic-secret dry run shows `[redacted:<rule>]`, never the value.
- [ ] **AC #2** — a fence denial appears in the trace as exactly one `denied: true` step (proved live by the provoked denial in `--dry`).
- [ ] **AC #3** — `trace.html` carries no wrong token fallbacks (`1.3rem`/`0.72rem` gone).
- [ ] **AC #4** — `--dry` runs with `cwd` = scratch dir end to end (query cwd, `meta.cwd`, artifact relativization); real-run behaviour unchanged.
- [ ] **AC #5** — a result line missing `numTurns`/`totalCostUsd` renders no "undefined"/fake-zero stat.
- [ ] **AC #6** — the `destroy()` requirement is stated in `trace-player.mjs`'s header for #10.
- [ ] **AC #7** — `traces/README.md` documents all new fields; `validate-trace.mjs` enforces them additively; **both committed traces still validate unchanged** (`git diff traces/` empty).

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; each VALIDATE passed immediately
- [ ] Level 1–4 commands all green; `git diff traces/` empty
- [ ] Dry-run JSONL read end-to-end by a human eye
- [ ] Branch `feature/recorder-hardening`; PR body `Closes #25`; issue closed with the outcome recorded (per the epic recipe)

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Assumption:** a PreToolUse deny fires no PostToolUse/Failure hook (issue #25's wording + round-2 verification), so recording the denial in `fenceHook` cannot double-record. The `--dry` provoked denial is the guard; if it ever shows two steps, dedupe by recording only in `fenceHook` and dropping any hook-side duplicate by `toolUseId` — flag it in the PR if hit.
- **Assumption:** redaction-at-record-time is compatible with the honesty contract because it happens inside the only legal producer before any file exists, with rules named in meta — "exactly as recorded" now explicitly means post-redaction. This is a *contract amendment*, made in `traces/README.md` itself, not a silent reinterpretation. If the reviewer reads this as rewriting agent output, the fallback design (deny-only, no redaction) is weaker — Bash stdout can't be deny-fenced.
- **Assumption:** keeping `meta.version: 1` (additive fields) is right; bumping would orphan the committed traces. The validator's `version === 1` check stays.
- **Not asked, not done:** no redaction pass over the *committed* traces (verified clean in review; hand-editing them is forbidden anyway).

## NOTES (open canvas)

- **Why redact in the recorder, not curation:** the raw file is the verifiability anchor and is itself committed + public. Redaction in curation would leave the secret in raw — worthless. Record-time is the only point where the secret never touches disk.
- **Layered model** (worth restating in the PR body): fence read-denials stop the obvious paths (Read/Grep/Glob on secret files); redaction catches what the fence can't see (Bash `node -e` stdout, secrets embedded in read file content, agent narration quoting either). Neither alone is sufficient; review round 1 said exactly this.
- **Rejected: hits count in meta.** Meta is line 1, written at init (append-only file, GOTCHA #3 — never buffer); total hits are only known at the end. Per-step `redacted` arrays carry the where; the static rule list carries the what. A rewrite-line-1-at-end approach was rejected as needless complexity and a chronology smell.
- **Rejected: a distinct `kind: 'denied'`.** It would ripple through the player's card dispatch, curation's kind branch, and the validator for zero reader value — `kind: 'tool'` + `denied: true` + the existing fail styling says it all. Simplicity-first.
- **#13 hand-off:** `redact.mjs` + the hardened `recordRun` (cwd param, denial recording) are exactly the reusable pieces; the composition runner should import both rather than re-implementing a fence.
- Sequencing note: this is Wave 0 ticket 1 of 3 (#25 → #17 → #18); #17/#18 don't touch these files, so parallel sessions are safe, but shared-worktree discipline applies (verify branch before commit, stage by explicit path).

## AMENDMENTS

<!-- append-only; newest at the bottom -->
