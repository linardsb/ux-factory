## PR #53 Review — Public round-trip demo: Factory derivation stage + honest diff display (#42)

**Recommendation: ✅ Approve — recommend merge.** No Critical/High issues. Every validation level passes, and I independently re-proved the load-bearing claims (VR gate, keyboard scoping, graceful degradation) in a fresh context rather than trusting the report. Four minor findings below are **non-blocking polish** — fold into this PR or a fast-follow, your call.

_Reviewed with fresh eyes in an isolated worktree at the PR head (`c33f6ca`, based on current `origin/main` `1fb8833`). Deep pass dispatched to the `code-reviewer` agent; behavioral claims driven in a real browser; VR gate re-run in the pinned Linux container._

---

### Summary
Adds an un-numbered "Verdant derivation round-trip" exhibit to the shipped `factory.html`: a view-time, vanilla rendering of #40's committed fidelity evidence (proposed-vs-ground-truth token diff + a real recorded agent-run trace replayed in a stepped player). Static honesty framing survives a JS/fetch failure; all numbers render from one committed source; no live LLM at view time. The PR also lands a small, correct a11y fix to shared `trace-player.mjs` canon (keydown scoped `document` → player root) so two players can coexist on one page. The implementation matches the plan and the epic's public-layer intent; the 9 documented deviations are all sound intentional decisions.

---

### Issues by severity

No **Critical** or **High** issues.

#### 🟡 Medium — 1

**M1 · Identical `aria-label` on both trace players now on one page** — `system/trace-player.mjs:106`
```js
root.setAttribute('aria-label', 'Trace replay — use arrow keys to step');
```
This line is new (part of the focus-scoping fix). `factory.html` now mounts **two** players simultaneously (`#agents-player` + the new `#roundtrip-player`), so a screen-reader user tabbing to either `role="group"` hears the exact same accessible name and can't tell them apart by label alone. Not High — the visible `h2.trace-task` heading (`meta.task`) disambiguates, `role="group"` isn't a landmark, and keyboard stepping works — but it's a concrete a11y gap this diff introduces, and the fix is trivial (the task is right there at line 110):
```js
root.setAttribute('aria-label', `Trace replay — ${meta.task || 'untitled run'} — use arrow keys to step`);
```
(`parseTrace` doesn't validate `meta.task`, hence the guard.)

#### 🟢 Low — 3

**L1 · `trace.html` copy no longer mentions the new focus requirement** — `trace.html:81`
"use Next/Prev (or ← →) to fill it in" — arrows now require the player to have focus first (click/Tab in). The behavior change is a **net improvement** (it retires a global `document` keydown hook that `preventDefault()`-ed every ←/→ site-wide), but the copy should note it: e.g. "Click into the player, then use Next/Prev (or ← →)…". `trace.html` isn't in the VR shot list, so no baseline catches this — I verified by hand it still steps after focus (see table).

**L2 · Raw camelCase check-keys surface as reader-facing labels** — `system/derivation-roundtrip.mjs:242-246` (`checksRow`), used at `:184` and `:201`. Renders the literal JSON keys — "monotonic", "bodyInRange", "ratiosInBand", "multiplesOf4" — as visible text, while the sibling `verdict.passes` marks three lines up (`:138-140`) use hand-authored labels ("accent within", "type usable", …). Inconsistent, and reads as jargon to the hiring-manager audience. Fix: a small `{key: "human label"}` map in `checksRow`.

**L3 · Unused CSS hook class** — `system/derivation-roundtrip.mjs:82` applies `el("div", "cs-acc rt-acc")`, but no rule targets `.rt-acc` in `portfolio.css` (only `.cs-acc` styles it; `.rt-accordions` is a different, real class). Harmless leftover — drop `rt-acc` or give it a rule.

---

### Validation (independently run — not from the report)

| Level | Check | Result |
|---|---|---|
| L1 Syntax | `node --check` both `.mjs` | ✅ PASS (2/2) |
| L2 Pure fn | `prepareDiff(verdant.diff.json)` | ✅ accent ΔE `0.05`, verdict `agent-proposed, human-approved`, correction `#2f7a4d`; throws `verdant.diff.json: missing accent` on `{}` |
| Data | 12 WCAG fg/bg tokens all colour-covered; every nested field the renderer reads is present | ✅ PASS (no blank samples) |
| **L5 VR (faithful, Docker Linux, pinned `playwright:v1.61.1-jammy`)** | `npm ci && playwright test` **vs committed baselines** (not `--update`) | ✅ **16/16 PASS** incl. `factory · neutral` + `factory · saulera` — baselines are truthful, exhibit renders under both packs, all 4 `waitReady` handles resolve |
| Baseline scope | which baselines changed | ✅ **only** `factory-neutral.png` + `factory-saulera.png` (valid PNGs; +570px taller — consistent with the new section) |
| Behavioral (real browser) | Two-player keyboard independence on `factory.html` | ✅ focus round-trip →→ steps it `1→3/14`, Station-05 stays `1/23`; focus Station-05 → steps it `1→2/23`, round-trip stays `3/14`; **neither** focused → neither steps |
| Behavioral (real browser) | `trace.html` (other consumer, not VR-guarded) | ✅ steps `1→3/23` after focus; inert when unfocused |
| Behavioral (real browser) | Graceful degradation — diff genuinely 404'd | ✅ error card shows; `data-diff` stays **unset** (fail-loud); caveat + fictional notice + **provisional** chip all survive; **trace still mounts** (fetch independence); restore → renders again |
| Honesty contract | files touched under `traces/` or `tooling/round-trip/` | ✅ **none** — pure view-time consumption of #40's committed artifacts, as required |

Note on robustness: `prepareDiff` validates the 10 top-level keys only; `renderRoundTrip` then reads deep nested fields unguarded. I confirmed all exist in the committed diff, and any malformed shape throws inside render → caught by `init()`'s `.catch` → error card. So robustness rests on #40's artifact staying well-formed — acceptable given the fail-loud/error-card path, worth stating explicitly.

---

### What's good
- **Correctness holds under adversarial testing, not just reading.** The deep pass ran `renderRoundTrip` against 8 mutated diffs (missing `seedReview.corrections`, missing `accent.deltaE`, unknown `aa.pairs` token refs, empty `checks`…) — every case rendered without a runtime error. The `if (bgHex)/if (fgHex)` guards and `(changedTokens || [])` are genuinely defensive.
- **Token discipline & untrusted-content posture are clean.** Zero hex/rgb literals in the new CSS; zero `innerHTML`/`document.write`/`eval` in the new module — every diff-derived string goes through `textContent`; the only inline styles are the licensed hex-from-data exception (swatches, WCAG mini-sample).
- **The trace-player fix is the right fix, minimally scoped.** It resolves a real latent bug (two `document`-level listeners would have stepped *both* players on one arrow press) with `root`-scoped listener + `tabIndex=0` + `role=group`, and updates `destroy()` symmetrically. Empirically verified above.
- **Reuse discipline.** Mirrors `handoff-viewer.mjs`'s pure/DOM two-export split; `init()`'s twin independent fetch chains with `data-*="ready"` set only on success matches Station-05's fail-loud convention; the input figures are the first real consumer of the pre-existing `.cs-fig`/lightbox path.
- **Honesty framing is load-bearing and correct.** Static caveat "co-equal" with the metric, calm colour (ΔE in `--color-fg`, not celebratory green), the `verdict.label` vs authored "provisional" capability distinction kept separate, fictional-subject notice present — and all of it survives a JS/fetch failure.

---

### Decision
Per the review rubric — no Critical/High, validation passes comprehensively, matches intent — this is an **Approve**. M1 (a11y) and the three Lows are optional polish that don't block merge.

_Solo-repo note: author = reviewer, so GitHub blocks a formal `--approve`; posting this verdict as a review comment. A human still makes the final merge call._
