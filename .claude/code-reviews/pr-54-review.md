# PR #54 Review — legibility surfaces: annotated-source blocks + glossary term bubbles

**Verdict: REQUEST CHANGES** — one High issue: the branch fails its own CI `verify` gate at HEAD (`ad7c901`) because the committed `system/loc-summary.json` is stale. The fix is a one-file regen + commit, and it does **not** require another VR baseline run. Everything else in the PR held up under a full adversarial pass (extraction byte-exactness, XSS surface, WCAG 1.4.13 paths, bus contract, token discipline).

Reviewed per `piv-review-pr` (fresh context + `code-reviewer` agent dispatch). Implementation report read; its three documented deviations were treated as intentional decisions and are not flagged.

---

## Issues

### High

**H1 — `system/loc-summary.json` is stale; `drift-check` exits 1 at HEAD (CI `verify` job is red).**

- `node tooling/drift-check.mjs` → `drift ✗  loc-summary drift: system/loc-summary.json — regenerate` — reproduced locally **and** in CI on the clean committed tree (run 29750876884), and independently confirmed from a clean worktree checkout of `ad7c901`.
- Diff of committed vs clean regen: `groups[pages].linesApprox 2700 → 2600`, `total.linesApprox 11500 → 11400`. File counts and the `runtime` group are unchanged.
- **Root cause:** `genLocSummary()` (`agent-layer/gen-loc-summary.mjs:33-42`) takes its file list from `git ls-files` but reads file *contents* from the **working tree**. The artifact was generated in `f2b54d2` while the shared worktree held the parallel ticket's uncommitted `factory.html`/`trace.html` edits — root-level `.html` files land in the `pages` group, so ~100 phantom lines were baked into the committed JSON. This is the same shared-worktree leak the PR's deviation 1 correctly avoided for the VR baselines; it slipped through on this artifact because the local `--check` compared dirty-regen against dirty-generated (both 2700) and passed. (Also why `ad7c901` can't explain it: that commit only *added* lines, yet the clean regen comes out *lower*.)
- **Bounded impact (good news):** `approach.html:382-384` renders only the `runtime` group's numbers, which are identical in the committed artifact and a clean regen — so the on-page "measured, not estimated" claim is currently accurate (no live honesty-contract violation), and fixing the artifact changes no at-rest page text.
- **Fix:** on the clean tree, `node agent-layer/gen-loc-summary.mjs && git add system/loc-summary.json`, commit, push. **No VR baseline regen needed** (rendered text unchanged); the `visual` job is already green.

### Low

**L1 — Glossary bubble can hide while a term still holds keyboard focus** (`system/glossary.mjs:96-103`). Hover and focus share one `hideTimer`/`open` state: Tab to a term (`focusin` → show), then graze it with the pointer — `mouseleave` arms `armHide()` and `hide()` fires unconditionally ~120ms later, clearing `aria-describedby` while the term is still focused. Narrow mixed-modality edge case; the pure-hover and pure-focus paths are correct (verified, including the bubble-hoverable timer cancel). Fix if picked up: track hover-open and focus-open separately and hide only when both are false.

**L2 — `destroy()` doesn't remove the per-trigger listeners** (`system/glossary.mjs:111-116`). It removes the bubble and the document/window listeners but not the `mouseenter`/`focusin`/`mouseleave`/`focusout` handlers attached to each `[data-term]` node (lines 96-101). No live effect today (`initGlossary` runs once per page load and `destroy` is never called on approach.html); flagged for a future re-init caller.

**L3 (follow-up note, not this PR)** — `gen-loc-summary.mjs` is the one generator whose output a dirty shared worktree can silently poison, because it globs *all* tracked source but reads disk contents (`gen-annotated-source.mjs` is effectively immune — two fixed files). A durable mitigation for a future ticket: read committed/index blobs (`git show HEAD:<path>` or `:<path>`) instead of the working tree, or record "regen only on a clean tree" as a standing rule beside the VR-baseline one.

---

## Validation

| Gate | Result |
|---|---|
| `node tooling/drift-check.mjs` | ✗ — `loc-summary` stale (**H1**; CI `verify` red, local repro) |
| `node tooling/token-lint.mjs` | ✓ 55 contract tokens · 0 undeclared · 0 orphan |
| `node agent-layer/gen-annotated-source.mjs --check` | ✓ 2 snippets, no drift, idempotent |
| Extracted `code` fields vs live source | ✓ byte-identical (`components.css` `.btn-primary`, `derive.rules.mjs` accent-contrast) |
| Node-import safety (4 new/changed modules) | ✓ no self-init side effects |
| CI `visual` (VR gate, Linux baselines) | ✓ pass |
| Test suite / linter | none — repo convention ("run the surface you touched") |

## What's good

- **The extraction mechanism is the strongest part of the PR**: anchor-based with hard failure on missing *and* ambiguous anchors (`gen-annotated-source.mjs`), byte-verified against the live source — the "code shown cannot drift from the code that runs" claim is mechanically true, not asserted.
- **`derive-probe.mjs`** makes "the quoted code and the running code are one file" literally true: correct `derive()` signature, valid ruleset keys, a real `wcagPairs` entry, and the swatch style value is provably `#rrggbb` (traced through `oklch.mjs`) — no injection surface, no network/LLM calls at view time.
- **No XSS surface anywhere**: all four view-time renderers build DOM via the `el()`/`textContent` idiom; no `innerHTML` touches artifact or user data.
- **Bus pane is contract-clean** (`agentic-study.mjs`): `bus.on("*")` matches the documented wildcard tap, the 30-row cap is enforced, the real unsubscribe runs in `destroy()`, and it only observes — never mutates — the bus.
- **VR readiness contract is honest**: `data-asrc="ready"` is set only on full success, so a broken artifact fetch fails VR loudly instead of baselining an empty exhibit.
- **Scope and convention discipline held**: token-only CSS (the mono-stack exception was pre-declared), no touches to `components.css`/token files/handoff pack/`factory.html`, governing-doc headers on all five new files, drift-check steps wired exactly in the `checkTokenCss()` shape.

## Recommendation

**Request changes** — fix H1 (regen `loc-summary.json` on the clean tree + commit; CI `verify` goes green, `visual` stays green). L1/L2 are optional polish, cheap to take in the same pass or defer with a note; L3 is a follow-up ticket candidate. After H1, this merges cleanly.

Remaining manual step already flagged by the author (unchanged by this review): Safari + Firefox tooltip spot-check.

*Review: fresh-context pass + `code-reviewer` agent dispatch; posted as a comment because GitHub blocks formal request-changes on one's own PR (solo repo) — treat this comment's verdict as the review state.*
