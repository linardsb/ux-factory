# PR #91 review — v3 home intake: 3 stakeholder questions on the shared wizard (#73)

**Recommendation: APPROVE** (posted as a comment — self-approval is blocked on your own PR). No critical/high/medium issues. All blocking gates green; the three runtime ACs verified **observed, not just traced** (headless Chromium). One operational note (stacked base) + three low heads-ups below.

Reviewed with fresh eyes in a clean context. The `code-reviewer` agent was deliberately **not** dispatched — it's Python/FastAPI-tuned and would only produce noise against a vanilla-JS/CSS change (per CLAUDE.md's "no linter/type-check" convention); this clean context is the fresh-eyes pass.

---

## Validation

| Check | Result |
|---|---|
| Parse — `factory-intake` / `intake-beat` / `instance` | ✓ all import; `factory-intake` exports `SCENARIOS, initIntake` |
| `token-lint` | ✓ 61 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `loc-summary --check` (this PR's generated file) | ✓ 3 groups — no drift |
| `system-graph --check` on **isolated committed HEAD** | ✓ 61 tokens · 28 consumers · 304 edges — no drift |
| **Runtime — home driven in headless Chromium** | ✓ **14/14** assertions (details below) |
| `index` VR baselines | regenerated in-PR (Docker); VR non-blocking on `feature/v3-*` per D11 |
| `factory` / `instance` VR baselines | **correctly not regenerated** — see "shared-wording" note below |

**On the local working-tree `drift ✗`:** the local drift-check reports `system-graph.json` drift, but this is **not this PR**. It's caused by a *parallel session's uncommitted* `system/components.css` edit (deletes the `.closing` CTA band — a consumer block `gen-system-graph` reads). Verified: this PR touches none of `system-graph`'s inputs; the committed `components.css` still has all 6 `.closing` rules; and on an isolated worktree at the clean PR HEAD, `system-graph --check` passes. CI (committed content only) will be green.

**Runtime observed** (`/` on a `python3` static server, Chromium): progress `"1 / 3"` · Q1 stakeholder-worded, raw param not surfaced · **no** scenario toggle · **no** Manipulation Matrix · 4 narrative beats · **density re-skins the preview** (`--spacing-lg` 24px→16px on `compact`) · **frequency daily→monthly flips the verdict** ("Habit-forming candidate…" → "Utility — …Habit mechanics rejected") · last-step CTA "Review" · fictional-scenario notice present at rest · **0 console/page errors**.

---

## Issues by severity

**Critical / High / Medium:** none.

### Low (all non-blocking — heads-ups, no change required to merge)

1. **`index` VR may flake once the D11 freeze lifts (merge-to-main).** `index.html:100 · #factory-narrative`
   Home now renders the WCAG-checks table, whose ratio cells animate via `countUp` (rAF JS, `renderNarrative(..., true)` on mount). Playwright's `animations:'disabled'` fast-forwards CSS but **not** rAF — this is exactly the known `approach.html` "two consecutive stable screenshots" flake. Harmless now (VR non-blocking on `feature/v3-*`), but when #73 lands on `main` and #82 removes the freeze, the `index` baseline inherits that flake. Not this PR's job to fix — flag it for the #82 / merge-to-main step (settle-wait or a test-time `countUp` no-op).

2. **`askedAxes` empty-result silently falls back to the full wizard.** `system/factory-intake.mjs:390`
   `const wiz = asked.length ? asked : full;` — if a host ever passes an `askedAxes` that matches no axis (typo, renamed axis), the wizard silently shows **all four** axes, surfacing the brand color-picker on home (brand is #74's beat). Correct for today's config (values are valid, verified at runtime); the fallback is defensive. Consider making a non-empty-but-fully-unmatched `askedAxes` `console.warn` rather than silently widen — a misconfig currently fails *open* (more questions), not loud.

3. **Nit — Fieldwork reasoning still leads with the bare engine term.** `system/factory-intake.mjs:106,111,116`
   Verdant's reasoning was reworded to stakeholder framing; Fieldwork's prompts changed but its reasoning still opens "Compact — …", "Hunt — …", "Monthly — …". Documented as intentional (report Deviation #10, "Fieldwork keeps its own reasoning prose") and **factory-only** (home is Verdant-only), so not a defect — but a reader toggling to Fieldwork on `/factory` sees a slightly less consistent voice than Verdant. Optional polish for a later factory pass (#78).

*Design nuance for the #74 pass (not an issue):* on home, narrative Beat 01 "Brand → accessible palette" still shows the seeded `#2F7A4D` palette even though brand isn't an asked question — coherent (the reader is briefing Verdant, whose brand is green), and it's the one beat that doesn't move with the three answers. Worth confirming the framing reads right once #74 makes brand interactive.

---

## Documented deviations — all sound

The report lists 11 deviations; per the review contract these are *intentional decisions*, not issues. Spot-checked the load-bearing ones and they hold up:

- **#3 `activateOn:'load'`** — plan's sanctioned VR-safe fallback (below-fold mount would race a `'visible'` observer). Verified the mount fires deterministically.
- **#6 structural layout, not sticky 2-col** — correct; `body{overflow-x:clip}` breaks descendant `position:sticky` (your `overflow-clip-breaks-sticky` memory). Good call to design the balance structurally.
- **#7 wizard CSS scoped under `#beat-intake`** — verified `factory.html` stays byte-identical (its `.fw-*` rules are inline; nothing in `portfolio.css` reaches it). Conscious safety-over-DRY; fine.
- **#11 PRD §9 write-back + `approach` baseline deferred** — the PRD doc is untracked and the `approach` re-baseline would bake in the parallel session's uncommitted `approach.html`; deferring is the right call (VR non-blocking on the branch). The §9 resolution is recorded in the PR body and issue #73.

**Shared-wording → other consumers' baselines (checked, no action):** the reworded prompts/`LABELS` live in a file `factory.html` and `instance.html` also render, but both pages' **at-rest** capture is wizard **step 0 = `brandColor`**, whose prompt/reasoning this PR does **not** touch (verified: it appears only as unchanged context in the diff; `instance.mjs:128`). The reworded density/reward/frequency text is on steps 1–3 (reached only by interaction, which VR doesn't capture), and the narrative renders from unchanged defaults. So the `factory`/`instance` baselines are genuinely unaffected — not regenerating them is correct.

---

## What's good

- **Clean "configured, not forked" seam.** `askedAxes` is a minimal, well-guarded addition; `answers` keeps seeding every default so `derive()` always gets `brandColor` even when it isn't asked — verified end-to-end (re-skin works with brand filtered out).
- **Home config no-ops correctly.** Toggle / ethics-matrix / summary each guard on their own anchor's presence; confirmed absent in `index.html` and confirmed not rendered at runtime.
- **Auto-init standdown is right.** `data-intake="external"` stands down the import-time `initIntake()` so `intake-beat.mjs` owns the single mount; `factory.html` (no marker) still auto-inits — regression preserved.
- **Motion discipline holds.** Entrance animations gated behind `@media (prefers-reduced-motion: no-preference)` with `both`/`forwards` fill (rest == final for VR); the `.fw-card` re-animates only on discrete step nav, never on the `run(false)` radio-change path — correctly avoids the PR #55 restart-and-blank. The reduced-motion check-draw path resolves to fully-drawn. No colour drag on home, so no continuous-rebuild exposure.
- **Honesty contract intact.** Fictional-scenario label is in the static seed, at rest, outside any disclosure.
- **Generated artifacts are honest and drift-clean** (`loc-summary`, `system-graph` on committed HEAD).

---

## For the human merging

- **This is a stacked PR** — base is `feature/v3-hero` (PR #85 / #72's `registerBeat` seam), not `main`. Diff correctly shows only the #73 commit. **Merge #85 first, then retarget #73 to `main`** (or rebase). The banner in the PR body says the same.
- Nothing blocks approval. The three Low items are heads-ups for #82 / the factory pass (#78), not changes required here.

_Reviewed 2026-07-23. Gates green; runtime observed in Chromium._
