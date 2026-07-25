# PR #94 Review — feat: v3 your-brand input + derived-pack persistence (#74)

**Reviewer:** `piv-review-pr` (fresh-eyes context + `code-reviewer` agent deep pass)
**Branch:** `feature/v3-your-brand` → `main` · **State:** OPEN · +373 / −32 · 10 files
**Plan:** `.claude/plans/v3-your-brand-input-derived-pack-persistence.md`
**Report:** `.claude/reports/v3-your-brand-input-derived-pack-persistence-report.md` (8 deviations, all documented)

## Recommendation: ✅ APPROVE (advisory)

No Critical or High issues. All blocking gates green. The diff matches the plan's intent and the report's 8 deviations are all intentional and documented (I only flag *undocumented* divergences below). Three Medium/Low findings, every one self-healing or non-exploitable — none block merge. Two owner-blessing items that the PR itself raises are handed to the human for the merge call.

> Posted via `--comment`, not `--approve`: `linardsb` authors this PR, and GitHub blocks self-approval on a solo repo (`[piv-review-pr-self-approve]`). This is the agentic gate; the human makes the final merge call.

## Issues by severity

### Critical — none
### High — none

### Medium

**M1 · `unwear()`'s comment claims a guarantee the code doesn't deliver — a *pre-existing* dock pack choice is silently lost.**
`system/pack-derived.mjs:113–123` (with `wear()` at `114–116`)

The comment says unwear "never clobbers a saulera/verdant choice a visitor made in the dock." That holds only for a pack chosen **after** wearing derived. For a choice made **before**:
1. Visitor picks `saulera` in the dock → `factory-pack="saulera"`.
2. On home, enters a colour + checks "Wear it" → `wear()` overwrites `factory-pack="derived"` (no backup of the prior value).
3. Unchecks "Wear it" → `unwear()` sees `"derived"` → deletes the key.
4. Reload → `pack-boot.js` finds no selector → **neutral, not saulera**. The earlier choice is gone and does **not** self-heal on reload (unlike the documented in-page transient).

The *behaviour* is defensible under the plan's explicitly-accepted **last-write-wins** selector model (NOTES §"Why one selector key"), and #76 owns the redesigned selector that would arbitrate this properly. So this is not a blocker — but the **comment overstates the guarantee**, and this exact flow isn't in the "known transients" list.
**Fix (pick one):** (a) narrow the comment to the actual guarantee; (b) add this case to the PR's known-transients as #76-owned; or (c) if cheap, snapshot the pre-wear selector (`factory-pack-prewear`) in `wear()` and restore it in `unwear()`. **Owner call — same bucket as the other flagged deviations.**

### Low

**L2 · On-load reflect applies a stored record without pack-boot's per-entry allowlist — inconsistent scrutiny of the same record.**
`system/pack-derived.mjs:93–103` (`readRecord`) → `160–167` (reflect) → `82–89` (`applyToRoot`)

`readRecord()` validates only the outer shape (`v`, `source`, `tokens` is an object); it does **not** check each `tokens` entry. `applyToRoot()` then `setProperty(k, v)` verbatim. `pack-boot.js:32–37` applies the exact same record but enforces `/^--color-[a-z0-9-]+$/` + `/^#[0-9a-fA-F]{3,8}$/` per entry. A top-level-valid record with a foreign inner entry (devtools edit / future writer) sails onto `:root` via the beat's on-load reflect but is correctly rejected by pack-boot on the next page. **Not exploitable** (custom properties are inert until `var()` substitution; values never reach markup — confirmed), and this code only ever writes clean records via `deriveBrandTokens`. It just violates pack-boot's own "storage content never reaches the DOM uninspected" principle for the sibling applier.
**Fix:** share one KEY/HEX predicate between `pack-boot.js`'s loop and `readRecord()`/`applyToRoot()`.

**L3 · The hero can briefly *overwrite* (not just strip) a colour entered in the pre-`ready` window — an undocumented sub-case of PR note #4.**
`system/spine.mjs:130–151` vs `system/pack-derived.mjs:172–185`

`heroBeat`'s `isWearingDerived()` guard is checked once, before `assemblySettled()`. In the **non-worn** case, if a visitor commits a colour after load but before the hero's `derive(CANNED_AXES)` apply (spine.mjs:137–139), the hero's canned green overwrites the visitor's `--color-*` for `HOLD_MS` (1200ms) + revert, producing a visitor→green→visitor flicker. The `MutationObserver` restores the final state on `data-spine="ready"`, so **nothing is lost**. PR note #4 documents the *strip*; this *overwrite* sub-case (narrower window, needs a native-picker commit in ~the first 1.2s) is the same known-transient class. The reviewer and I agree: **not worth new coupling** — file it alongside note #4.

## Owner-blessing items the PR raises (not defects — the human's merge call)

- **Open Q #1 — `askedAxes` fold-in home (#74 vs #81).** Deferred to #81 (current plan default); `factory-intake.mjs` untouched. Branch base is `origin/main` either way, so flipping is cheap. **Re-confirm before merge.**
- **Deviation #4 — on-load reflect gated on WORN, not mere record presence.** A deliberate resolution of a real contradiction in the plan's state table ("reflect if present" can't coexist with "reset keeps the record but clears `:root`"). Effect: a *derived-but-not-worn* brand shows the empty beat on return to home; the record stays latent for #76. **Bless this one state-table cell.**

## Validation

| Check | Result |
|---|---|
| `node --check` (pack-derived · pack-boot · spine) | ✓ clean |
| `import()` exports | ✓ 15 named exports present |
| `node tooling/token-lint.mjs` | ✓ 61 tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node tooling/drift-check.mjs` | ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ no drift (runtime 38→39 files) |
| VR baselines | 4 regenerated (index + approach, both packs); non-blocking on `feature/v3-*` (D11), #82 re-blocks |
| Cross-engine (report) | spike 3/3 · functional 22/22 (Chromium · Firefox · WebKit) |

Both blocking gates green — matches the PR's own claims (re-run live in the worktree, not trusted from the report).

## What's good

- **`deriveBrandTokens` hex filter is exactly right** — 21 `color-*` keys = 16 hex + the 5 `color-mix()` relatives; the 5 correctly fail `HEX_VALUE` and self-heal off the hex bases in the always-loaded contract layer. The "16 of 21" claim verified against `derive.rules.mjs`.
- **`pack-boot.js` committed path provably unchanged** — a De Morgan inversion of the old early-return; DOM op identical; empty-storage no-op preserved (VR-critical). Positively re-checked, not just reasoned.
- **Derived branch is genuinely fail-closed** — every malformed shape (non-object rec/tokens, bad keys/values, unparseable JSON) traced; none throw, none leak past the KEY/HEX allowlist.
- **Honesty + XSS hold** — zero `fetch`/`XHR`/`sendBeacon`/`innerHTML`/`insertAdjacentHTML`/`document.write` in the changed JS; the name reaches the page only via `textContent`/`.value`, never markup, never an affiliation claim; only the colour hex is fed to `derive()`.
- **`data-spine="ready"` set in every `heroBeat` path** (incl. the new early return) — VR/sequencing safe; no localStorage in VR contexts so the guard is inert there.
- **Node-import safety verified live** (not just by reading the guard); classic-script purity of `pack-boot.js` preserved.
- **a11y solid** — every control is a native input in a `<label>`; targets ≥44px; the global `:focus-visible` (`portfolio.css:11`) already covers them.
- **Clean rename** — old `.brand-try/.brand-swatch/.brand-prompt/.brand-note` fully removed, no leftover refs; at-rest HTML label matches `emptyLabel()` byte-for-byte, so the empty path has no mid-JS repaint.
- **VR baseline hygiene correct** — `approach.html` is the only `loc-summary.json` consumer; the sub-perceptual skip trap was handled (rm + re-run).

## Next step
Posted on the PR. A human now reviews the code + this review, resolves the two owner-blessing items, and merges. If M1/L2 are worth acting on now, the natural follow-up is `piv-fix-review-findings` on this report; otherwise they're clean #76 candidates.
