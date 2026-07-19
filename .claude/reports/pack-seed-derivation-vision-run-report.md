# Implementation Report — Pack-seed derivation (spike 1: Verdant round-trip)

**Plan**: `.claude/plans/pack-seed-derivation-vision-run.md`   **Branch**: `feature/pack-seed-derivation-vision-run` (worktree `ux-factory-wt-40`, off `main`)   **Status**: PARTIAL — all deterministic scaffolding + de-risk complete and validated; the real vision run + human gate + offline real-product test are user-gated (see Remaining).

## Summary
Built and proved the entire deterministic half of the capability that turns product screenshots into a proposed design-token pack: a reusable pack emitter, the canonical Verdant ground-truth pack, the perceptual-fidelity diff (the spike-1 measurement), the one-time round-trip screenshot capture, an image-hygiene hardening of the trace recorder, and the recorded vision-run harness itself. Phase-0 de-risk confirmed live: the Agent SDK's `Read` returns usable image blocks (vision viable) and auth works via the Mac's Claude CLI login. The `--dry` smoke exercises the real fence + a real screenshot Read + a denied ground-truth read + a seed Write + a gen-pack-css compile, cleanly (0 null-phase). What remains is the **real** token-spending run, its **human gate** (Linards approves/corrects values — cannot be self-satisfied without faking the "agent proposes, human decides" exhibit), and the **real-product** fidelity number.

## Tasks completed
- Task 0 — de-risk vision + auth → `tooling/round-trip/probe-vision.mjs` (CREATE); ran ✓ (agent described the PNG, saw an image block).
- Task 1 — export `cssValue` → `agent-layer/gen-token-css.mjs` (UPDATE); `--check` shows no drift.
- Task 2 — DTCG/flat → pack emitter → `agent-layer/gen-pack-css.mjs` (CREATE); unit-tested (flat+DTCG identical CSS, auto-fill, throws on unknown/malformed).
- Task 3 — canonical ground-truth pack → `system/tokens.verdant.css` (CREATE, generated via `--verdant`); byte-stable regeneration; token-lint ✓.
- Task 4 — fidelity diff → `tooling/diff-pack-seed.mjs` (CREATE); proven on truth (PASS, accent ΔE 0) and wrong (label flips) fixtures.
- Task 5 — round-trip capture → `tooling/visual-regression/capture-roundtrip.mjs` (CREATE) → `tooling/round-trip/input/verdant-plant-overview.png` + `verdant-full.png` (CREATE); green re-skin visually confirmed.
- Task 6 — image-response hardening → `portal/lib/trace-recorder.mjs` (UPDATE `capResponse`); confirmed in `--dry` (Read step = `[image tool_response: 1 image block(s) — omitted]`, not a base64 blob).
- Task 7 — vision-run harness → `portal/record-derivation.mjs` (CREATE); `--dry` clean (plan→gate→implement→validate, 0 null-phase, fence denies the ground truth, seed compiles).
- Governing docs carried onto the branch: `docs/epics/per-company-brief.architecture.md` (was untracked; #40 owns it — not on any ref), `.claude/plans/pack-seed-derivation-vision-run.md`.

## Tests added
No unit-test suite (project rule: "run the surface you touched"). Deterministic checks, all green:
- `gen-pack-css`: flat `derive().tokens` and the equivalent DTCG seed emit **identical** 47-token `:root`; a partial seed auto-fills the remainder; unknown token name / missing `$value` / empty value each throw and name the token; no `[object Object]`.
- `diff-pack-seed`: fixture == ground truth → `agent-proposed, human-approved` (accent ΔE 0, type/spacing usable, AA 12/12); magenta-accent + 30px-body fixture → `human-authored with agent assistance` (accent ΔE 0.46, type unusable). Decision rule proven before any agent output.
- `record-derivation --dry` (real fence, real screenshot, real compile): 0 null-phase, 1 denial (ground truth), 1 artifact, image placeholder present, synthetic secrets redacted. ~$0.10.
- `probe-vision`: Read tool used, image block seen, real description returned → Read-based vision viable (no pivot to prompt-embedded images).

## Validation results
- `node agent-layer/gen-token-css.mjs --check` → ✓ no drift (export left the default path byte-identical).
- `node agent-layer/gen-pack-css.mjs --verdant` → 47 tokens; regenerate + `git diff` empty (byte-stable).
- `node tooling/token-lint.mjs` → ✓ (47 contract · 0 undeclared · 0 orphan; packs excluded).
- `node --check` on all new/edited `.mjs` → ✓.
- Trace/visual/style-dictionary CI gates (Task 12) not yet run end-to-end — deferred until the real trace exists (they need the committed trace pair). `validate-trace` logic reviewed against the harness output; `--dry` is clean by its rules apart from being scratch-only (not validated).

## Deviations from the plan
1. **`gen-pack-css` completeness semantics.** The plan is internally inconsistent: it says "auto-fill ANY missing token, don't hardcode a statics list" (3×) yet also "a seed missing color-accent throws." I followed the dominant instruction — auto-fill any of the 47 missing from contract defaults — and made the hard throw-guards **unknown token name** and **malformed value** instead. Honesty is preserved because the CLI **reports every auto-filled token**: an omitted *perceptual* token surfaces in that report (the run's self-correction signal), rather than being silently injected as a neutral default. This keeps the drift-checked `gen-token-css` default path untouched (AC2's "gen-token-css path" honored via the exported `cssValue`).
2. **Type-ratio usability band `[1.05, 1.7]`, not the plan's `[1.1, 1.6]`.** The engine's own comfortable ramp has adjacent ratios of **1.083** (13→12 tail) and **1.581** (49→31 head) — both outside `[1.1,1.6]`. A strict band would false-fail by-construction-usable ground truth (breaking the fixture==truth PASS test). Band calibrated so the engine's ramp passes with margin while still catching degenerate ramps (duplicate/inverted steps, wild jumps). Recorded in `diff-pack-seed.mjs` with the reason.
3. **Branch = isolated worktree off `main`, not `checkout -b` in the shared dir.** The plan said "off main, not `feature/factory-integration`." During orientation the shared working dir's branch changed under me (a live parallel session) — so a worktree (`ux-factory-wt-40`) is the safe realization of that instruction; it never touches the shared dir's HEAD.

## Issues encountered
- **First `--dry` had 1 null-phase step** — the agent ran `ls` to orient before `[[piv:plan]]`. Root cause was my task wording ("Glob first if needed"). Fixed by adding the "no orientation first" guard + naming the exact screenshot file (mirroring `record-trace.mjs`'s `--dry`). Re-run is clean. The real task got the same treatment (names both screenshot files) to keep the real trace null-phase-free.
- **No `portal/.env`** — auth falls back to the Mac's Claude CLI login, which the spawned SDK subprocess inherits (probe + `--dry` both succeeded). No token needed for this environment.

## Remaining work (user-gated — see the message accompanying this report)
- **Task 8 — the real vision run + human gate.** `node portal/record-derivation.mjs` spends real tokens (sonnet-5 vision, expect 2–3 tighten-and-re-run passes). Produces the raw proposal + trace. The **human gate** (fill `review.approved`/`by`/`changedTokens`, correct values) is Linards's decision — filling it as the agent would fake the exhibit (honesty contract).
- **Task 9** — curate + validate the trace (`curate-trace` → `validate-trace`).
- **Task 10 (real half)** — generate `tokens.verdant-proposed.css` + `verdant.diff.json` from the approved seed; write `tooling/round-trip/README.md`.
- **Task 11 — offline real-product test + §Spikes labelling decision (AC4).** Needs one real product's screenshots + published tokens (only the user has these; nothing real-brand is committed). Fallback per the plan: land the label provisionally on Verdant with the controlled-case caveat + a follow-up.
- **Task 12** — full CI gates (drift-check · token-lint · visual) + PR.
