# Review — PR #23 · round 2 (post-merge retrospective)

**PR** #23 `fix: agentic renderer hardening — PR #21 review findings (#11)` · **State: MERGED** (`808f517`, into `feature/data-connected-prototypes`; now on `main`)
**Head** `feature/agentic-bridge` → **Base** `feature/data-connected-prototypes` (stacked) · **This is a retrospective** — the PR is already merged, so this is posted as a **comment**, not approve/request-changes. Findings feed a follow-up PR (the repo's merge-then-review pattern, exactly how this PR itself began — "Follow-up to PR #21, merged before its round-1 review findings were applied").

**Net assessment: would-approve, with one mandatory follow-up.** The renderer hardening (the PR's stated purpose) is delivered, and its own round-1 blocker was fixed **before** merge. Validation is green on `main`. The fresh-eyes pass over the trace subsystem that rode in re-surfaced one **known** security gap (raised in `pr-24-review.md`, only partially closed — see §2) plus three minor net-new hardening nits. No new blocker.

---

## 0. Scope note (process, not code) — the PR body describes an earlier branch state

The body says *"Diff is one commit, two files."* The **merge landed 35 files / +2973 / −183**, including the *entire* trace recorder + player feature (ticket #5, `82cea6b`), the PR #24 review fixes, proto layout fixes (#8), the handoff/vocabulary regen, and the epic-landing docs.

This is a **stacked-branch artifact**, not smuggled code: `feature/trace-recorder-player` was merged into `feature/agentic-bridge` via PR #24 (with its own review) before #23 merged upward, and the base `feature/data-connected-prototypes` lagged behind. The body was accurate when written and went stale as the branch grew. The **substantive logic** that rode along was independently reviewed (`pr-24-review.md` + round 2 for the trace subsystem; `pr-21`/`pr-23` for the renderer), so the risk this creates — unreviewed *logic* entering on a "two-file" PR — did not materialize. (The #8 `components.css` lines and the regenerated `pack.json`/`vocabulary.json` rode in without a dedicated review of *those* lines, but they carry no new logic.)

**Recommendation (non-blocking):** when a stacked PR's base lags, state the true merged scope in the body (or update/rebase the base first). A reviewer trusting "two files" would have been handed 35. In a repo with a hard honesty contract, the PR body is part of the record.

---

## 1. Round-1 finding — RESOLVED before merge ✅

`pr-23-review.md` issued **REQUEST CHANGES** on `safePhotoUrl`: the hand-rolled regex normalization left two beacon-bypass classes (backslash variants, leading C0-control bytes) open. Commit `ead4896` replaced it with the **exact parser-based fix the review recommended** — `new URL(url, document.baseURI)` + `resolved.origin !== location.origin` (`system/agentic-renderer.mjs:192-203`). Verified against the file on `main`: no regex left to drift, same-origin closes all four beacon forms plus `http:`/`javascript:`/`data:`. The HIGH own-property fix (`Object.hasOwn` at the three lookup sites) is intact. **Both round-1 findings are closed.**

---

## 2. Issues by severity (fresh pass over the trace subsystem)

### MEDIUM (in-context) — Bash exec fence is a prefix test, not a boundary — *known; only partially closed*
`portal/record-trace.mjs:103-106`
```js
if (tool === 'Bash') {
  if (/^node /.test(input?.command || ''))
    return { behavior: 'allow', updatedInput: input };
```
`/^node /` only checks the command *starts with* `node ` — `node -e "require('child_process').execSync(...)"`, `node x && rm -rf …`, `node --version; cat portal/.env` all pass, and `node -e` grants full `fs`/`net`/`child_process` access, which makes the sibling Write/Edit `.env` secrets fence in the same function reachable-around.

**Severity note (why MEDIUM here, not the HIGH the fence-in-isolation would score):** this is a **build-time, author-invoked** tool — not shipped, not reader-facing — exploitable only via model misbehavior or a prompt-injected repo file; the `PreToolUse` belt-and-suspenders hook already closed the *fast-path bypass* (`pr-24-review-round2.md`); and the compensating control that actually bounds the blast radius (secret-pattern redaction over recorder output) is **tracked** as a deferred follow-up (`pr-24-review-round2.md:25`). The code-reviewer rated it HIGH for the fence's stated purpose *in isolation*; in this local-tool context the blast radius is MEDIUM.

**This is not new.** `pr-24-review.md` raised it in round 1 (`:19`, `:38` item 2: "`node -e`… is itself full system access… otherwise **document that Bash access is effectively unrestricted**"); round 2 fixed the fast-path bypass but **verified `node -e` still executes** (`pr-24-review-round2.md:14`) and left the fence-code disposition open — the deny message still **frames** node-only as a boundary ("may only run `node …`") while it is a nudge.

**Fix — close the fence-code disposition (the PR #24 review offered both branches; neither landed):**
- **Harden:** `spawn('node', args, { shell:false })` restricted to a named-script allowlist (the one command the task needs is `node agent-layer/gen-handoff.mjs`), or at minimum `/^node [\w./-]+\.mjs$/` to reject flags + shell metacharacters; **or**
- **Document honestly:** a one-line comment at `:103` stating the node-only rule is a convenience nudge, not a security boundary, because `node -e` is full system access.

This is the **one mandatory follow-up** — pick a branch. (The deferred redaction control is the *other* half and is already tracked; this item is specifically about the fence code no longer overstating itself.)

### MEDIUM — `validate-trace.mjs` phase-order check only verifies first-occurrence order, not monotonicity
`tooling/validate-trace.mjs:64`, `:78-79`
```js
if (!seen.includes(s.phase)) seen.push(s.phase);
...
if (seen.join('→') !== PHASES.join('→')) throw ...
```
`seen` records each phase's first appearance only, so a mid-run marker regression — `plan → gate → implement → gate → validate` — still yields `seen = [plan,gate,implement,validate]` and passes, though a later step reverted to an earlier act (which the README's "phases occur in PIV order" implies shouldn't happen). Mitigating: the recorder's `summarize()` already flags null-phase + misorder at record time, and curation is deterministic — so this is a gap in the *drift guard's* strictness, not a live bad trace. **Fix:** also track the max phase-index seen and require each step's phase-index to be `>=` it (never decrease).

### LOW — `parseTrace` doesn't validate the phase enum
`system/trace-player.mjs:37-38` (render fallback `:141`). `!s.phase` checks truthy, not membership in `plan|gate|implement|validate`. An unexpected phase falls through `(bodies[step.phase] || root).append(card)` — silently rendered outside all four acts instead of throwing the named error the project convention wants. Only pre-validated traces reach the player, so low impact; still an inconsistency with `validate-trace.mjs`, which enforces the enum strictly. **Fix:** validate `ACTS.some(([k]) => k === s.phase)` in `parseTrace` and throw naming the line.

### LOW — `curate-trace.mjs` has no guard against clobbering the raw file
`tooling/curate-trace.mjs:71`, CLI `:75-77`. `curateTrace(rawPath, outPath)` never checks `rawPath !== outPath`; a CLI typo could overwrite the raw JSONL the README calls the load-bearing verifiability anchor. **Fix:** `if (resolve(rawPath) === resolve(outPath)) throw new Error(...)`.

### LOW (forward-looking) — unscoped `keydown` in the player
`system/trace-player.mjs:165-169` `preventDefault()`s Arrow keys on `document` regardless of focus. Harmless on the bare `trace.html` harness; will need scoping (`document.activeElement` / container focus) once embedded in the richer Factory page (#10) alongside other inputs.

---

## 3. Validation (run on `main`)

| Check | Command | Result |
|---|---|---|
| Syntax | `node --check` on renderer, action-bus, trace-player, trace-recorder, record-trace, curate-trace, validate-trace | ✓ SYNTAX-OK (all) |
| Trace drift guard | `node tooling/validate-trace.mjs` | ✓ both `demo-notice` (curated) + `.raw` pass — 23 steps · 4 phases · 1 artifact |
| Renderer sibling | `node scenarios/validate.mjs` | ✓ verdicts differ (habit-justified vs utility) |
| Honesty diff | raw vs. curated JSONL, line-by-line (via code-reviewer) | ✓ curation = strip markers + truncate only; 0 text rewrites |
| Player DOM sinks | grep `innerHTML`/`insertAdjacentHTML`/`document.write` in `trace-player.mjs` | ✓ none — every trace string via `textContent` |
| Path traversal | `?trace=` slug regex `/^[a-z0-9-]+$/` (`trace.html`) | ✓ rejects `../`, absolute, non-slug before fetch |

No regressions surfaced.

---

## 4. What's genuinely good

- **Round-1 blocker fixed pre-merge**, with the reviewer's exact recommended parser-based `safePhotoUrl`. That's the review loop working.
- **The view-time player is clean by construction** — every trace-derived string (agent text, tool hints, responses, errors, and the honesty `label`) reaches the DOM only through the `el()` `textContent` helper; no `innerHTML`, no `fetch`, no live call in the shipped module. Trace content is treated as untrusted, as the header comment promises.
- **The honesty contract holds empirically, not just by assertion** — raw↔curated diffs to marker-strips + truncation, and `validate-trace.mjs` independently re-derives phase order + enforces `artifact.path` existence + raw/curated `sessionId` pairing. Real redundant verification.
- **The `tools` / `allowedTools` / `canUseTool` / `PreToolUse` layering is architecturally correct** — confirmed against the SDK's own `.d.ts` that `allowedTools` bypasses `canUseTool`, so gating Write/Edit/Bash through `canUseTool` (+ the `PreToolUse` belt-and-suspenders) is the right layer. The Write/Edit fence avoids the classic sibling-prefix bug (`target === realRoot || target.startsWith(realRoot + sep)`).

---

## 5. Recommendation

**COMMENT (post-merge). Net: would-approve, with one mandatory follow-up** — no new blocker; the stated work is delivered and validated; the top item is a previously-identified, MEDIUM-in-context gap on a build-time author tool whose fence code still overstates itself.

**Follow-up PR** (`piv-fix-review-findings` on this report), in priority order:
1. **Mandatory** — close the **Bash-fence disposition**: harden (`spawn` + named-script allowlist) or add the one-line "not a boundary" comment. *One* of the two must happen so the code stops framing a nudge as a boundary.
2. `validate-trace.mjs` phase **monotonicity** check.
3. `parseTrace` phase-enum + `curate-trace` self-clobber guard (batch as minor hardening).
4. Scope the player `keydown` before #10 embeds it.
