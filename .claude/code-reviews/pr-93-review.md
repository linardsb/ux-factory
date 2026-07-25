## PR #93 review — v3 evidence home (factory.html tabbed viewer) · #78

**Verdict: ✅ Approve** (no critical/high issues; two non-blocking nits). Fresh-eyes pass + `code-reviewer` agent. This is the *agentic* gate — a human still merges.

Re-homes `factory.html` as the v3 evidence home: drops the duplicated intake wizard (now owned by the spine) and its script, and elevates the three committed-replay engines — recorded agent **traces**, the **round-trip** fidelity diff (carrying the 12 WCAG pairs), and the measured **system graph** — into a tabbed viewer with a CSS sliding pill (`--motion-tab-glide`) and an inline vanilla tab controller. Folds two #69 fixes.

### The acceptance test — non-silent retirements — independently verified
- `factory-intake.mjs` script tag **removed** from `factory.html`; `initIntake()` additionally self-guards on `#factory-wizard` (double-safe).
- Site-wide, the **only** inbound `/factory#` deep-link is `roundtrip.html:176 → /factory#round-trip`; that panel id is **preserved** and the controller activates its tab on load/hashchange.
- Retired ids (`#scenario-toggle`, `#factory-summary`, `#ethics-gate`) are read **only** in `factory-intake.mjs` (no longer loaded here) and on the separate `instance.html` / build layer — **zero unguarded readers remain on factory**.
- VR wait handle `#roundtrip-diff[data-diff="ready"]` is satisfied by `derivation-roundtrip.mjs:293`.

### Tab controller — reviewed hard, **correct**
- No race: `activate(0, false)` then `fromHash()` run synchronously before paint.
- APG-conformant: real `<button>`s, roving `tabindex`, `aria-selected`/`aria-controls`/`aria-labelledby` wired, all arrow keys + Home/End with automatic activation, `tabindex="0"` panels for AT.
- Pill `translateX(var(--ev-i) * 100%)` math is correct (100% = pill's own box, sized to one grid column); reduced-motion gating and the `.ev-panel:not([hidden]) + .ev-panel:not([hidden])` margin trick both work as intended.
- Progressive enhancement holds: no-JS shows all three panels; both engine mounts render regardless of `hidden` and gate `data-*="ready"` on real fetch success only (fails loud, never bakes a false-green baseline).

### Issues

| # | Sev | File:line | Issue | Fix |
|---|-----|-----------|-------|-----|
| 1 | Medium | `factory.html:466-468` | Dead code: the "open any nested `<details>`" hash-deeplink loop is now a no-op — `panels[idx]` is the `.ev-panel` container, and `.closest("details")` walks **up**, but the trace player's `<details>` are **descendants**, never ancestors. Worked pre-rewrite because the old code resolved the hash against any element on the page. No functional impact (the sole inbound hash link doesn't need it), but it's misleading. | Remove the `d = panels[idx].closest("details")` while-loop, or (if intended) open `<details>` *within* the activated panel via `panels[idx].querySelectorAll("details")`. |
| 2 | Low | `factory.html:45` | Token-discipline nit: `--ev-pad: 4px` exactly equals `--spacing-xs`; the block's own header says space comes from tokens. (`padding: 8px 12px` at :59 is only partly tokenizable — `8px`=`--spacing-sm` but `12px` is off-grid, so leave it.) | Optional: `--ev-pad: var(--spacing-xs)`. |

### Validation
| Check | Result |
|-------|--------|
| `token-lint` | ✓ 62 contract tokens · 0 undeclared · 0 orphan · DTCG valid (pill consumes `--motion-tab-glide`) |
| `drift-check` | ✓ for the PR's committed state — the local `✗ system-graph drift` is caused **entirely** by the parallel session's *uncommitted* `system/components.css` edit in the shared working tree. Verified: stash that edit (components.css = main) → `gen-system-graph.mjs` reproduces the committed JSON with **zero diff**. CI builds against main, so it will be green. |
| Files vs main | 15 files, +319 / −466, matches the PR body |
| VR | non-blocking on `feature/v3-*` (D11); baselines regenerated (both packs) for #82's clean re-block |

### What's good
- The retirement disposition is genuinely non-silent and grep-verifiable — every id got a verdict.
- Honesty contract intact: "Nothing runs live here" at rest, fictional-scenario label on the round-trip panel, capability chips state replay-not-live.
- Deviations (no pipeline numerals, inline controller, both proto figures, 130→96px scroll-padding, scoped inter-panel margin) are all documented in the report with sound reasoning — intentional decisions, not issues.
- `handoff.html` `data-page="work"` matches a real nav key; `agentic-ui-study.html` insight-panel wrap is a clean fix.

### Recommendation
**Approve.** Neither finding blocks merge. Optional follow-up: delete the dead `<details>` loop (#1) — a one-line cleanup — and optionally tokenize `--ev-pad` (#2). Both can also ride a later PR.
