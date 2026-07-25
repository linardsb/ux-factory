# Review — PR #97 · v3 built-screen peak (#75)

**Branch**: `feature/v3-peak` → `main` · **Reviewer**: `code-reviewer` agent (fresh context) + synthesis · **Verdict**: ✅ **Approve** (the one real defect was fixed; see below)

The deep pass ran in a clean context: read every changed file in full, plus the transitive imports (`spine.mjs`, `agentic-renderer.mjs`, `action-bus.mjs`, `derive.mjs`, `pack-derived.mjs`) and the real `vocabulary.json` to cross-check the composition + enums, and confirmed Node-import-safety empirically (`node --check` + a real `node -e "import(...)"`). Documented deviations from the implementation report were excluded from findings (intentional decisions).

## Findings

### Medium-High — FIXED (commit `00b2ec1`)
**A11y: the peak's two reveal moments were silent to screen readers** — landing exactly on the interaction the feature calls its "thesis".
- `system/peak.mjs` `enhanceEthics.reveal()` populated the `role=status` result **while hidden**, then unhid it already-full — the order the codebase itself treats as broken (`factory-intake.mjs:655` unhides first, on purpose). **Fix:** unhide before `replaceChildren`.
- `system/peak.mjs` `.peak-refusal` had **no `role`/`aria-live`** at all, so the out-of-vocabulary refusal never announced. **Fix:** added `role="status"` + `aria-live="polite"` (its `setRefusal` already unhides before appending).
- Verified fixed on the running surface: both regions now report `aria-live="polite"` (Chromium + WebKit driver, 21/21).

### Low — one fixed, two deferred with notes
- **`spine.mjs:39` comment stale — FIXED (`00b2ec1`).** My deviation #9 (firing `trackFactoryBuilt` from the effect, not the analytics slot) made the example false; corrected.
- **`peak.mjs` adjust-live `row` reference is fragile — DEFERRED (verified NOT a bug).** `row = working[idx].props` is captured once; `working[idx].props` is reassigned on each valid change and kept in sync via `row.status = v`. It stays correct by a hand-maintained invariant. Left as-is (surgical); a cleanup (read `working[idx].props.status` at the revert site) is a good follow-up, especially before #86 swaps the composition source.
- **`rerender()`/probe have no local try/catch — DEFERRED to #86.** Not triggerable today (`STATUS_ENUM` matches the vocabulary exactly; the example's rows carry no explicit `status-chip` child, so a valid pick can't throw). If #86's per-employer composition gives the adjustable row a `status-chip` child, a valid change could throw uncaught in the event handler (outside spine's effect-level try/catch). Worth a defensive wrap when #86 lands.

### Verified clean (no issues)
Node-import-safety (empirical) · honesty contract (example labeled committed, never "agent output") · token/colour discipline (zero colour literals; the one new token added to source first + regenerated) · build-then-swap ordering (still replaced only after vocab+derive+validate all succeed) · once-guard/fire-once (spine `activated` + IO `unobserve` + `builtFired`) · probe non-destructiveness · injection safety (no `innerHTML`; `textContent` only) · `EXAMPLE_COMPOSITION` cross-checked against `vocabulary.json`.

## Validation
| Check | Result |
|---|---|
| `drift-check` · `token-lint` (blocking) | ✅ clean (on the merged tree) |
| Parse + Node-import safety | ✅ clean |
| Peak driver — Chromium / WebKit (incl. a11y-region assertions) | ✅ 21/21 each |
| Headline ACs — fail-closed + density end-to-end | ✅ 7/7 |
| CI `verify` job | ✅ pass |
| CI `visual` job | ❌ fail, but **run is green** (D11 `continue-on-error` on `feature/v3-*`); the 4 failing snapshots are the expected `index` (peak now live → taller) + `approach` (loc-summary number bump) drift. #82 regenerates baselines. |

## Merge note
`main` advanced after the branch was cut (#80/#88/#95/#96). Merged `origin/main` in (`0c7b7f0`); the only conflicts were the two generated files (`loc-summary.json`, `system-graph.json`), resolved by **regeneration** (never hand-edited). Main's `components.css` change was re-verified against the peak's `vd-*` components — no regression (Chromium + WebKit 21/21, settled screenshot clean).

## What's genuinely well done
The layered fail-closed design holds up under adversarial tracing (three independent degrade-to-still stages + the spine's outer net); the honesty framing (committed example vs future agent-composed instance) is consistent everywhere; the fire-once guard was built for the exact race the review probed; and the pre-review cross-browser testing (Chromium/Firefox/WebKit) was thorough.

## Recommendation
**Approve.** The one real defect (a11y announcements) is fixed and verified; the merge conflict is resolved and re-validated; the `visual` failure is the documented, non-blocking D11 drift. Ready for a human to review + merge. Two Low items are logged as follow-ups (best paired with #86), not blockers.
