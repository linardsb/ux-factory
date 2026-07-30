# PR #180 review — inspect engine (#166)

**Verdict: REQUEST CHANGES** (posted as a comment — GitHub blocks formal request-changes on one's own PR). Two High, two Medium, no Critical. The engine itself is well-built and the review found no security or honesty-contract issues; the blockers are one stale generated artifact (CI-red the moment `verify` runs) and one real WCAG 1.4.13 defect in the shipped interaction.

Reviewed from a clean detached worktree at `acf3fe2` with fresh eyes (code-reviewer agent + independent validation run). Base `main` at `380c6cf` — #167 has not merged, so no cross-PR conflicts.

## Validation

| Gate | Result |
|---|---|
| `node --check` (inspect.mjs, gen-inspect-data.mjs) | ✓ |
| `gen-inspect-data.mjs --check` | ✓ 11 components · 9 with spec, no drift |
| `tooling/drift-check.mjs` | **✗ loc-summary drift** (see H1) |
| `tooling/token-lint.mjs` | ✓ 64 tokens · 0 undeclared · 0 orphan |
| `tooling/build-checks.mjs` | ✓ all 10 groups |
| Node-import safety of inspect.mjs | ✓ node-safe |
| CI on the branch | not yet run — `verify` will fail on H1 as-is |

## High

### H1 — committed `system/loc-summary.json` is stale on the PR's own tree (CI `verify` will go red)
`system/loc-summary.json:8` — committed runtime group says `17800` lines; regenerating on the PR head gives **17900** (total `25100` → `25200`). This is the known tracked-content trap: the artifact was regenerated mid-implementation, then a later edit pushed the raw runtime line count across a rounding boundary without a re-run. The report's "drift-check ✓ all nine gates" was true when run, but is not true of the final tree.

**Fix + cascade** (the cascade is the expensive part): regenerate loc-summary, **and re-churn the two approach baselines** — approach.html renders the runtime number, so the just-committed `approach-{neutral,saulera}.png` bake in the stale `17,800`. A digit-only change is sub-perceptual, so expect the rm-and-force path again (delete the two PNGs before `update:docker`). Index ×2 baselines are unaffected.

### H2 — Esc-dismissed bubble reappears without user intent (WCAG 1.4.13 "dismissible" fails; the file header claims it holds)
`system/inspect.mjs` — `hide()` clears `open` but not `focusTrigger`, and `armHide`'s timeout re-shows for `focusTrigger` unconditionally. Concrete sequence on the shipped mount (click = hover+focus together on the Primary `<a>`):

1. Click/Tab the trigger → bubble shows (`focusTrigger` set, `hovered` true).
2. Press Esc → `hide()` — user has dismissed.
3. Move the mouse off the trigger → `mouseleave` arms the 120 ms timer → timer fires: `hovered` false, `focusTrigger` still set → `reshow(focusTrigger)` — the dismissed bubble reappears with no new hover/focus act.

The pattern is inherited from `glossary.mjs` (same latent bug there — its `[data-term]` marks carry `tabindex="0"`, so it is reachable there too, though out of this PR's scope). Fix here: a `dismissed` flag set by the Esc handler, cleared on the next genuine `mouseenter`/`focusin`, checked before `rearm`. Don't clear `focusTrigger` in `hide()` — that would break Esc-then-Tab-back.

## Medium

### M1 — the unknown-id guard is not "loud in dev, red in CI" as the header claims
`system/inspect.mjs` — `wireTriggers` throws for an unknown `data-inspect` id, but the throw happens inside `fetchData().then(...)` and is swallowed by the `.catch` (`console.error` + quiet toggle-off). And the path only runs when inspect is actually toggled on — a default page load validates nothing, and no gate in `tooling/` exercises inspect. So a future mount ticket (#168/#169/#171/#173–#175 all build on this) shipping `data-inspect="typo"` sails through CI green and breaks only for readers with inspect persisted on — exactly the failure the header says can't happen. The report documents "engine backs off" honestly; the header's CI claim is the defect. Fix: a static check beside `checkInspectData` in `tooling/drift-check.mjs` — grep tracked HTML for `data-inspect="…"` values and assert each resolves in `inspect-data.json` (cheap, deterministic, and makes the claim true for every future mount ticket). Alternatively soften the header. The check is worth having before the mount wave.

### M2 — interactive link inside a `role="tooltip"` bubble is unreachable by keyboard/AT
`system/inspect.mjs` — the bubble is `role="tooltip"` + `aria-describedby`, i.e. exposed as a flattened description string; there is no keyboard path into a manual popover, so the "handoff pack" `<a>` is mouse-only. `glossary.mjs`'s bubble (the source pattern) deliberately carries no interactive content. Simplest fix consistent with the design's own reasoning (no focus management, the 1.4.13 timer owns hide): render the spec line as plain text and drop the link — `/handoff.html` is one click away in the IA regardless.

## What's good

- The per-activation `AbortController` design: "off" genuinely means zero listeners, and the toggle-mid-fetch / re-init / destroy transitions were all traced clean (`activation !== mine` guard is correct).
- Live `getComputedStyle` values instead of shipping resolved values in the artifact — the honest source under derived/imported packs, explicitly reasoned in both file headers.
- Generator + drift gate are textbook: deterministic ordering tied to the measured file, loud throws naming paths, check-mode compares in-memory regen vs disk, and the reported mutation tests were the real thing.
- `trackToolInspect` justifies its non-`flipTo` shape against the file's own collision discipline with a doc citation, instead of silently inheriting it.
- All six documented deviations are genuine improvements with clear rationale (the `data-inspect-mode` rename and the `data-inspect-pos`-gated anchor CSS both prevent real bugs the plan would have shipped).
- No `innerHTML` anywhere; token discipline in the new CSS is clean; VR at-rest safety reasoning holds (default-off + empty gate localStorage).

## Recommendation

Fix H1 (regen + approach ×2 re-churn) and H2 before merge. M1/M2 may land here or as an immediate follow-up — but should land before the mount tickets build on the engine. Then re-run: `drift-check` · `update:docker` (expect approach ×2 only) · the Esc sequence from H2 on at least chromium.
