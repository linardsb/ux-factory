# PR #183 review — ⌘K command palette (#168)

**Verdict: REQUEST CHANGES** — one High finding (a generated "measured, never hand-drawn"
artifact is silently wrong, and the PR/report's claim about it is factually incorrect); the
implementation itself is clean. Fix is small and mechanical. Everything else is optional polish.

Reviewed fresh-context per `/piv-review-pr`: PR fetched at head `e0cb3e1`, deep pass dispatched
to the `code-reviewer` agent, its Critical claim independently re-verified against the working
tree before being accepted.

## Validation (all run locally at PR head)

| Check | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ all 10 groups |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan |
| `node tooling/drift-check.mjs` | ✓ green — **but see H1: green here is the bug reproducing itself, not proof of correctness** |
| Cross-engine journey (author-run, report) | 3 × 105/105 (not independently re-run) |
| VR baselines | 16 chrome baselines regenerated, proto ×4 byte-identical (per report) |

## Findings

### High

**H1 — `system-graph.json` misattributes the palette's tokens to Fieldwork; the claimed `.cmdk` consumer block does not exist.**
`agent-layer/gen-system-graph.mjs:67` parses consumer headers with
`/^\/\* -{5,} (.+?) -{5,} \*\/$/gm` — the whole header must sit on ONE line ending `---------- */`.
The new `.cmdk` header (`system/components.css:2121–2128`) opens with the dashes but runs its
prose across eight lines before closing, so the generator never sees it. Verified consequences:

- `system-graph.json` still has **29 consumers — the same 29 as main**. No palette node exists
  (`grep -i "cmdk\|palette"` finds nothing).
- The palette's 7 new token references (`--spacing-lg`, `--shadow-lg`, `--motion-base`,
  `--motion-ease`, `--motion-ease-spring`, `--font-body`, `--type-body`) were appended to the
  **`fw-*` Fieldwork dispatch-board consumer** (the preceding block) — that is exactly what the
  PR's +9/−2 diff on this file is. Fieldwork's chrome does not use a spring ease or `--shadow-lg`.
- `factory.html`'s `#shape` exhibit — pitched as "the graph is measured, never hand-drawn" —
  will render this misattribution to readers.
- The PR body and report claim "`system-graph.json` (29 consumers — `.cmdk` is a new
  components.css consumer block)". 29 was main's count; a new block would have made it 30. The
  claim is wrong, and CI's drift-check can't catch it because the generator deterministically
  reproduces its own parse miss ("the check that cannot fail" pattern, again).

**Fix:** close the header comment on its own line —
`/* ---------- Command palette (⌘K / Ctrl-K) — system/palette.mjs (epic #164, ticket #168) ---------- */`
— and move the prose into a second, plain comment block below it. Then
`node agent-layer/gen-system-graph.mjs` (expect 30 consumers, fw back to 17 tokens) and commit the
regenerated `system-graph.json`. Optionally worth a follow-up ticket: make the generator warn on a
`/* ----------`-opening comment it fails to match, so the next multi-line header fails loudly.

### Low (optional polish, non-blocking)

- **L1** — `system/palette.mjs` (download-pack command): the temporary `<a download>` is
  `.click()`ed without being appended to the DOM — fine on current evergreen browsers, a known
  historical Safari footgun. Append/remove for robustness.
- **L2** — combobox ARIA nitpicks: `aria-expanded` hardcoded `"true"` and no
  `aria-haspopup="listbox"`. Harmless here (the listbox never collapses while the dialog is
  open) but deviates from the strict ARIA 1.2 combobox pattern.
- **L3** — no explicit `input.focus()` after `showModal()`; relies on dialog autofocus
  semantics. Spec-correct, historically quirky cross-browser. The journey suite passing on all
  three engines makes this near-theoretical.

## What's done well

- `palette.mjs` builds all DOM via an `el()` helper using `textContent` only — no `innerHTML`,
  no XSS surface, matching `inspect.mjs`/`glossary.mjs` convention.
- `trackToolPalette()` is byte-for-byte the `trackToolInspect()` shape: static literal path,
  once-per-visit, fired from the real success path after `showModal()` returns — exactly the
  analytics contract in CLAUDE.md.
- The Escape `stopPropagation` guard is correct and necessary — `dock.mjs` and `site.js` both
  listen for Escape on `document`; without it, closing the palette would also collapse the dock
  panel or mobile nav. The dock-collision journey scenario covers it.
- Presence gating is real: inspect command gated on `[data-inspect]`, copy-tokens on the mounted
  `.dock-copy`, hint shipped hidden by `site.js` and only claimed by `palette.mjs` — so
  `instance.html` and per-company builds get no dead button, with a journey assertion proving it.
- Token discipline holds: the one raw `rgba(0,0,0,0.35)` on `::backdrop` carries the existing
  Firefox-≤147 licence comment already established in `portfolio.css`.
- All five plan deviations are documented in the report with reasoning; none flagged — they're
  decisions, and sound ones (notably the lazy command-list build, which is what makes the
  `.dock-copy` gate reliable).
- The latent 50 ms hash-eat corner is disclosed honestly rather than papered over, with the
  architecture rationale for not importing `flipTo`.

## Recommendation

Fix H1 (one comment reshaped + one regen + updated PR/report claim), then this is an approve.
The palette module itself needed no changes.
