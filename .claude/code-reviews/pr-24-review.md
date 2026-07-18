# PR #24 Review — Trace recorder + player (epic #1, ticket #5)

**Reviewer:** fresh-eyes pass (code-reviewer agent + independent verification) · reviewed at commit `82cea6b` in an isolated worktree · **Recommendation: ✅ Approve** (with recommended follow-ups — the shipped deliverable is honest, clean, and correct; the open items are hardening for future reuse, not defects in this PR).

## Summary
This ticket ships exactly what #5 asks for and the core engineering is strong: a build-time trace recorder (Agent SDK hooks + message loop), a deterministic curator, a format validator, and a **zero-dep, XSS-safe** view-time player, plus one genuinely real, self-correcting `claude-sonnet-5` run — raw + curated, honestly labeled. The honesty contract is *machine-enforced end to end* and I verified it holds (deterministic curation, curator structurally truncation-only, validator rejects drift with precise errors). No critical/high issues, validation is green, all ACs met → mergeable.

Two **Medium** follow-ups keep this from a clean bill, both about the *recorder's* guards rather than the shipped artifact: the recorded agent has broad read+exec access and the recorder writes tool I/O **verbatim** into files that are **committed unedited and served publicly**, with nothing scrubbing secrets on the way in; and the validator doesn't verify a curated trace derives from its raw sibling. Neither blocks this PR — the shipped `demo-notice` trace is **verified clean** (I enumerated everything it accessed — all benign public repo files) and the committed curated↔raw pair is correct — so these are hardening for future reuse, best tracked as a follow-up issue. The fixes are small and don't touch the design.

---

## Issues by severity

### 🟠 Medium — Recorder can commit secrets to a public, commit-verbatim artifact (shipped trace verified clean; harden before reuse)
**Where:** `portal/record-trace.mjs:26-31,105-106` · `portal/lib/trace-recorder.mjs:54,57` · `_headers:17-18` · `traces/README.md`

The recorded agent's read/exec surface is unfenced *by design*, and the recorder logs it verbatim:
- Read/Grep/Glob are in `allowedTools`, so per the SDK the fence (`canUseTool`) is **skipped** for them — the `if (tool === 'Read' …)` branch at `record-trace.mjs:105-106` is dead code, confirming no path/secret check ever runs on reads.
- Bash allows any `node …` command — and `node -e "…"` is itself full system access (`fs`/`net`/`child_process`), so exec is effectively unrestricted too.
- `trace-recorder.mjs:54,57` records `tool_input` + `tool_response` verbatim (≤4000 chars raw / ≤400 curated).
- Those files are committed **unedited** (`traces/README.md`: never hand-edit — the honesty contract actively discourages scrubbing) and served **publicly** (`_headers` `/traces/* → public`, fetched by `trace.html:113`, deployed via `wrangler pages deploy`).

**Failure scenario:** a future recording (the recorder is built for reuse — "new task const per run") whose task or exploration reads a secret file, or `node -e`-prints an env var, lands that value (≤4000 chars) in `traces/<slug>.raw.jsonl` → committed verbatim → live at a public URL, with the honesty contract discouraging its removal.

**Why Medium, not blocking:** the shipped `demo-notice` run read only the four benign task files (`kb-format.md`, `primary-button.md`, `verdant/copy.json`, `tokens.source.json`) + inspected the public handoff pack; a secret-pattern + `KEY=VALUE` scan of both committed traces is clean. The trigger requires the agent to deviate from a fixed benign task, on the author's own machine, at build time, with zero external attack surface — and the completion checklist already requires reading each trace end-to-end before commit (a human gate sitting exactly on this failure mode). Downstream work doesn't run the recorder either (#10 consumes traces through the player; #9 through the validator), so nothing is gated on hardening it now. Net: a real gap worth a follow-up issue, but not a blocker for this clean, AC-complete PR.

**Fix:** have the recorder run a secret-pattern redaction/denylist over tool inputs **and** responses before writing (must cover Bash stdout too — fencing only Read/Grep/Glob won't help while `node` Bash is allowed). Optionally deny reads of `.env`/`*.pem`/`.ssh`/`.aws` outright.

### 🟠 Medium — Validator doesn't verify a curated trace derives from its raw sibling
**Where:** `tooling/validate-trace.mjs` (whole file)

`validateTrace` checks each file's internal structure independently; nothing cross-checks that `<slug>.jsonl` was curated from the adjacent `<slug>.raw.jsonl` (e.g. matching `sessionId`/`startedAt`). Re-running `record-trace.mjs --force` (a sanctioned step) and forgetting to re-curate leaves a raw file from run #2 next to a curated file describing run #1 — **both pass validation.** That silently breaks the contract's central promise (`traces/README.md`: "raw + curated are both committed, so a reader can diff them and see curation touched nothing but length").

**Fix:** for every `<slug>.jsonl`, assert a sibling `<slug>.raw.jsonl` exists and their `meta.sessionId` (or `slug` + `startedAt`) match; fail loudly otherwise.

### 🟡 Low
1. **`.env` write-fence regex is case-sensitive** — `record-trace.mjs:93` `/\.env|\.sessions\.json/`. Verified `/\.env/.test('.ENV') === false`; on the case-insensitive macOS filesystem this tooling targets, a Write to `.ENV` resolves to `.env` but bypasses the deny. One-char fix: add the `i` flag. (Minor: requires agent deviation; overwrite, not exfiltration.)
2. **Bash `node `-prefix "fence" is a nudge, not a boundary** — `record-trace.mjs:100-104`. Metacharacters pass (`node -e 1 && …`), but this is *moot* because the allowed `node -e` already grants full system access. If a real boundary is wanted, `spawn('node', args, { shell:false })` restricted to named scripts; otherwise document that Bash access is effectively unrestricted.
3. **`trace.html` token fallbacks don't match real tokens** — `trace.html:27,37`: `var(--type-h3, 1.3rem)` / `var(--type-eyebrow, 0.72rem)` vs the real `--type-h3: 20px` / `--type-eyebrow: 12px` (`system/tokens.contract.css`). Harmless today (contract.css always loads first) but a latent wrong-value trap. Drop the fallback or correct it.
4. **`--dry` isolation is partial** — `trace-recorder.mjs:84` hardcodes `cwd: REPO_DIR` even in dry mode, so Bash/relative-path resolution runs against the real repo though Write/Edit are fenced to the scratch dir. Low impact (the dry task never runs Bash). Thread `cwd` through `recordRun`, or note the scope in the header.
5. **Player renders result stats without guards** — `trace-player.mjs:105-108` renders `${result.numTurns} turns` / cost unguarded; a valid-but-minimal trace (validator doesn't require these) would show "undefined turns". The committed trace has them, so cosmetic only.

### ℹ️ Notes (not defects)
- **For #10:** `trace-player.mjs:169` adds a `document`-level `keydown` listener removed only via `destroy()`, which `trace.html` never calls — fine for a single render, but #10 embedding/re-rendering must call `destroy()` (returned) or the listener will stack.
- **Documented trade-off (deviation #7):** the committed JSONL carries 21 absolute home-dir paths (incl. `meta.cwd`), served publicly; the player relativizes at *display* only. Intentional (raw = inspectable anchor). Low exposure while the site is `noindex` and the author's identity is already public; revisit if the site goes public-indexed.

---

## Validation (run independently in a pristine worktree @ `82cea6b`)

| Check | Result |
|---|---|
| L1 `node --check` × 5 modules | ✅ |
| `validate-trace.mjs` (raw + curated) | ✅ 23 steps · 4 phases · 1 artifact each |
| Curation determinism (re-curate → diff) | ✅ byte-identical (pure fn) |
| Honesty diff (curated text == raw − markers) | ✅ 8 text steps, no rewriting |
| No `[[piv:` remnant in curated | ✅ |
| Negative validator (broken phase in a copy) | ✅ exit 1, names `file:line: field` |
| `parseTrace` (DOM-free, under Node) | ✅ label/phases/artifact/ok |
| XSS — DOM sinks | ✅ `textContent`/`createElement` only; no `innerHTML` of trace content |
| Path traversal — `?trace=` | ✅ `/^[a-z0-9-]+$/` before fetch; `../` rejected |
| Shipped trace secret scan | ✅ clean (enumeration + pattern + `KEY=VALUE` scans) |
| `_headers` `/traces/*` tier | ✅ matches `/scenarios/*` |

**Not run** (low risk / outside this diff's blast radius): portal boot + `/api/health` (server.mjs untouched — the recorder is a new, unimported CLI lib); full browser player (covered by the report's L5 agent-browser pass); `gen-handoff` token targets (needs `tooling/style-dictionary` deps). The implementation report documents these as green.

---

## What's done well
- **`system/trace-player.mjs` is a clean, `textContent`-only renderer** — every DOM sink checked; real untrusted agent output genuinely cannot execute. Zero deps, no imports — meets the hard vanilla constraint.
- **Honesty contract enforced in code, not prose:** curation is provably selection + truncation only (`KEEP_WHOLE` preserves `file_path`/`command`; verified byte-identical re-curation), and `validate-trace.mjs` independently re-derives phase order from each step's own tag rather than trusting the recorder — genuine redundant verification.
- **Write/Edit fence avoids the classic sibling-prefix bug** (`target === realRoot || target.startsWith(realRoot + path.sep)`) — verified.
- **Hooks are try/caught and always return `{ continue: true }`** — a recording bug can't interrupt the run it observes.
- `artifact.path` is correctly repo-relative (`path.relative(REPO_DIR, …)`) — no absolute leak in that field.
- Error messages consistently name `file:line: field`; all CLI entry points use the correct standalone-run guard.
- **Exemplary transparency:** headers cite governing docs; the plan AMENDMENTS + implementation report log the spike-5 tuning and all 7 deviations honestly (the `tools` vs `allowedTools` correction, marker-detection loosening, display-time relativization, etc.) — those are decisions, not defects, and were treated as such in this review.

---

## Recommendation
**Approve**, with recommended follow-ups. The shipped ticket-#5 exhibit is honest, clean, and correct; the view-time shipped code is fully clean; validation is green and all ACs are met — no critical/high issues, so the PR is mergeable. The two Mediums (secret redaction on recorder output; curated↔raw pairing in the validator) are hardening for future reuse, not defects in this delta — best tracked as a follow-up issue. The `.env` case-insensitive `/i` fix is a trivial, clearly-correct one-liner worth taking regardless; the other Lows are quick polish.

A human makes the final call. Natural next steps: open a follow-up issue for the recorder hardening (Mediums + Lows), or run `piv-fix-review-findings` on this report to take the cheap fixes now — either way #5 can land, given the verified-clean artifact and the build-time, author-run threat model.

_Post-merge follow-up (already flagged in the report): `demo-notice.md` is added but `handoff/verdant/pack.json` regen was deliberately deferred — run `node agent-layer/gen-handoff.mjs` once the spec changes land so the pack includes `demo-notice`._
