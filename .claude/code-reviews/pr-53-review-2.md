## PR #53 Re-review (pass 2, fresh eyes) — Public round-trip demo: Factory derivation stage + honest diff display (#42)

**Recommendation: ✅ Approve — recommend merge (unchanged from pass 1).** No Critical/High issues. This is an independent second pass in a clean context at the same head (`c33f6ca` — no commits since the first review); it **converges** with pass 1 on the one Medium a11y finding and adds **two new findings** (one Medium, one Low) the first pass noted but didn't flag, or missed. All remain non-blocking polish.

_Reviewed in an isolated worktree at the PR head (`c33f6ca`, base = current `origin/main` `1fb8833`). Deep pass dispatched to the `code-reviewer` agent with no access to the pass-1 review; convergence/divergence assessed afterwards. Pass 1 (posted earlier today) already re-ran the Docker VR gate faithfully at this same commit — 16/16 — so it was not re-run here._

---

### Issues by severity

No **Critical** or **High** issues.

#### 🟡 Medium — 2

**M1 (new) · `prepareDiff` promises named-field boundary errors but only checks top-level key presence** — `system/derivation-roundtrip.mjs:19-26`
The module header (lines 7-9) and the function's own comment promise that a malformed artifact "fails loud at the boundary" with an error naming the offending field. The actual check only verifies the 10 top-level keys are non-null. `renderRoundTrip` then reads deep unguarded paths — `verdict.passes.*` (:138-140), `Object.entries(type.checks / spacing.checks)` (:184, :201, :242-245), and `.map()` on `accentFamily`, `neutrals.tokens`, `type.scored`, `spacing.steps`, `radius.steps`, `aa.pairs`. Empirically verified: `prepareDiff({accent:{}, accentFamily:'not-an-array', neutrals:{}, …})` sails through, and the failure surfaces as a raw `TypeError` deep in render, not the promised `"verdant.diff.json: missing <path>"`.
*Mitigation (why not High):* the render call sits inside `init()`'s promise chain and the DOM is appended only at the very end, so a throw is still caught by `.catch()` → honest error card; no half-rendered exhibit, no uncaught exception today. The gap is contract-vs-implementation on a future malformed artifact.
*Fix:* either add the nested checks (`Array.isArray` on the six arrays + presence of `verdict.passes` / `type.checks` / `spacing.checks`), or soften the header comment to state the validation is shallow top-level (which is all the plan actually specified).

**M2 (confirms pass-1 M1) · Identical hardcoded `aria-label` on the two trace players now on one page** — `system/trace-player.mjs:106`
Independently re-found with no access to the first review — treat the convergence as high confidence. `factory.html` now mounts two `role="group"` players with the exact same accessible name ("Trace replay — use arrow keys to step"); a screen-reader user browsing groups can't tell Station 05 from the round-trip by name. The string came verbatim from the plan (plan line 188), so this is a plan gap, not an implementer error. *Fix:* derive the label from `meta.task` (in scope at :99), e.g. `` `Trace replay: ${meta.task || 'untitled run'} — use arrow keys to step` ``, or `aria-labelledby` the `h2.trace-task`.

#### 🟢 Low — 1 (new)

**L1 (new) · Backward heading jump inside the new section** — `factory.html:408` + `system/trace-player.mjs:110`
The section's `<h3>The recorded derivation run</h3>` sits directly above the `#roundtrip-player` mount, and `renderTracePlayer` unconditionally emits its task title as an `<h2 class="trace-task">` — producing h2 → h3 → **h2** while still nested under the h3's container: a backward jump in the document outline for heading-navigation AT users. Newly exposed by this PR (Station 05's mount sits under its own h2, siblings, no jump). *Fix:* drop the redundant h3 — the player supplies its own heading from `meta.task`, exactly as Station 05 does.

**Still open from pass 1 (not re-litigated):** L1 `trace.html:81` copy doesn't mention the new focus-first requirement · L2 raw camelCase check-keys ("bodyInRange", "multiplesOf4") shown as reader-facing labels · L3 unused `rt-acc` hook class.

---

### Validation (re-run independently this pass)

| Level | Check | Result |
|---|---|---|
| L1 Syntax | `node --check` both `.mjs` | ✅ PASS (2/2) |
| L2 Pure fn | `prepareDiff(verdant.diff.json)` | ✅ accent ΔE `0.05`, verdict `agent-proposed, human-approved`; throws `verdant.diff.json: missing accent` on `{}` |
| L3 Token discipline | grep new CSS diff for hex/rgb literals | ✅ clean — every colour is `var(--…)`; swatches are inline-from-data in JS only |
| VR wiring | `waitReady` selectors vs the `dataset.*` flags the module sets | ✅ byte-for-byte match; flags set only on success (fail-loud) |
| Baseline scope | which baselines changed | ✅ only `factory-neutral.png` + `factory-saulera.png` |
| Honesty contract | files touched under `traces/` / `tooling/round-trip/` | ✅ none — pure view-time consumption of #40's artifacts |
| Consumers of changed canon | importers of `trace-player.mjs` | ✅ only `factory.html`, `trace.html`, the new module — no other importer; `destroy()` symmetric, no leak |
| L5 VR gate (Docker Linux) | — | ✅ carried from pass 1: 16/16 at this same commit earlier today; nothing changed since |

---

### What's good (this pass's independent read)

- **Graceful degradation is real, not aspirational** — the fictional notice, caveat and provisional badge are static HTML entirely outside the fetch/render path; the two fetches are genuinely independent promise chains with `data-*="ready"` set only on success.
- **Untrusted-content posture is clean** — zero `innerHTML`/`insertAdjacentHTML` anywhere in the new module; the swatch hex-from-data exception uses only CSSOM property assignment (no attribute/markup injection surface).
- **Pass/fail never carried by colour alone** — glyph + word + underline on failures; calm-colour constraint held (ΔE in `--color-fg`).
- **The reviewer-identity handling is thoughtful** — `seedReview.by` (diacritics form) is never rendered; only action/date/corrections reach the page, keeping the no-diacritics site identity while the full record stays inspectable in the raw JSON.
- **The 9 documented deviations all check out as intentional decisions**, and the one comment the trace-player fix falsified was caught and corrected in the same PR.

---

### Decision

**Approve** (re-confirmed). Two passes in independent contexts agree: no Critical/High, validation green, matches the plan and the epic's public-layer intent. If any finding is folded in before merge, M2 (aria-label) is the best value-per-line; M1 can be settled either way (add nested checks *or* soften the comment). Note that touching `factory.html`'s h3 (L1) would invalidate the factory baselines — regen in the same commit if taken.

_Solo-repo note: author = reviewer, so GitHub blocks a formal `--approve`; posting this verdict as a comment. A human still makes the final merge call._
