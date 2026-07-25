# Implementation Report — drop a Figma export in the portal, get a token pack (no CLI)

**Plan**: `.claude/plans/figma-drop-portal-ui-implementation.md`
**Branch**: `feature/figma-drop-portal-ui` (cut from `origin/main` @ `1213d01`)
**Worktree**: `ux-factory-wt-116`
**Status**: COMPLETE
**Closes**: #116

## Summary

The portal gained a **Figma → pack** drawer. An operator drops a Figma token export, types a slug,
and the portal writes `system/tokens.<slug>.css` from the same `runPull()` engine the CLI uses,
then renders what the run actually did — ramps used, all 16 mapped tokens with provenance, the full
12-pair WCAG table, every contrast negotiation, collapsed state colours, the 48 auto-filled tokens
**by name**, and the pack header verbatim. An ambiguous file (more than one candidate brand ramp)
still refuses to guess, but the refusal now arrives as data: the drawer renders the candidates as
clickable swatches and a click re-runs off the export already on disk. CLI behaviour, stdout and
every error string are byte-identical.

## Tasks completed

| Task | File | |
|---|---|---|
| `classifyRamps` returns the mid-rung hex it already computed | `tooling/figma/figma-pull.mjs` | UPDATE |
| `err.candidates` on the ambiguous-accent throw, message untouched | `tooling/figma/figma-pull.mjs` | UPDATE |
| Header names the source repo-relatively (both sites — see deviations) | `tooling/figma/figma-pull.mjs` | UPDATE |
| `runPull` return widened with the report fields | `tooling/figma/figma-pull.mjs` | UPDATE |
| Slug guard · export persistence · one shape for both outcomes | `portal/lib/figma.mjs` | CREATE |
| `POST /api/figma/pull`, two modes | `portal/server.mjs` | UPDATE |
| `tooling/figma/exports/` ignored | `.gitignore` | UPDATE |
| Header button + drawer markup | `portal/public/index.html` | UPDATE |
| Drop handling, submit, report, candidate retry | `portal/public/portal.js` | UPDATE |
| Drop zone, swatches, WCAG table, `[hidden]` fixes | `portal/public/portal.css` | UPDATE |
| §A rewritten portal-first, CLI beneath | `docs/figma-runbook.md` | UPDATE |

## Tests added

No suite exists in this repo (CLAUDE.md), so "done" = run the surface. Fixtures were built in the
scratchpad and **not committed**, per decision 9:

- `good.json` — grey + coloured ramp + white → clean import (16 roles, 48 filled, 12/12 pass)
- `ambiguous.json` — two non-state coloured ramps → the 2-candidate refusal
- `derived.json` — 3-rung `Light/Base/Dark` → refuses **with no candidates** (Blue has 3 rungs,
  under the `rungs >= 5` bar; `Grey` is a STATE_RAMP name). Plan assumption confirmed, not assumed.
- `derived5.json` — 5-rung named ramps → derived rungs synthesised, imports cleanly, exercises the
  "rung numbers derived, not read" + collapsed-state reporting in the drawer
- `big.json` (5 MB), `oversize.json` (33 MB), `notes.txt`, `broken.json` — the boundary cases

Browser round-trip driven with Playwright (`scratchpad/drive-drawer.mjs`) against the real server.

## Validation results

| Gate | Result |
|---|---|
| `node --check` × 3 (figma.mjs, server.mjs, figma-pull.mjs) | ✓ |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan |
| `node tooling/drift-check.mjs` | ✓ all 8 checks |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ 3 groups, no drift |
| **plusui `--offline` byte-identical** | ✓ (re-run after every engine edit) |
| **CLI stdout vs `HEAD`**, plusui `--offline`, diffed | ✓ byte-identical (34 lines) |
| Refusal messages vs Phase-1 recording | ✓ identical, both variants (diffed against `HEAD`'s file) |
| `git status --porcelain` | ✓ only the intended files; no throwaway pack or export |
| `readBody` / its 1 MB cap | ✓ untouched (`git diff` shows only a comment naming it) |

Edge cases exercised end to end:

- slugs `neutral` / `contract` / `plusui` → refused naming the slug, nothing written
- slugs `../x`, `../../etc/passwd`, `Bad`, `a_b`, ``, 41 chars → refused by the regex
- 5 MB export → **imports** (proves `readBody`'s cap was bypassed, not raised)
- 33 MB with `content-length` → refused naming the cap and the file's own size
- 33 MB **chunked**, no `content-length` → the streaming counter destroys the request; no partial
  file survives; server stays up (client sees a connection reset, which the client-side size check
  makes unreachable in the browser)
- malformed JSON → refused naming the path; partial removed
- retry for a slug with no persisted export → refused naming the expected path
- `.txt` / broken JSON dropped in the browser → refused client-side, **0 requests sent**
- **a refusal with no candidates, in the browser** (`derived.json`, imported straight after an
  ambiguous file so swatches were on screen) → the engine's message rendered verbatim, swatch
  count back to 0, `#figma-report` emptied. A design the tool has just said it cannot import is
  left with no affordance, and no stale one survives.
- `--from` outside the repo → header keeps the verbatim path (no `../../Users/…`)
- re-import same slug twice → export and pack overwritten, no error
- keyboard-only → file input focused on open, then slug → accent → neutral → Import → Cancel
- no horizontal overflow at 1440px or 720px; 0 JS console errors

## Deviations from the plan

1. **Base branch.** The plan says cut from `feature/figma-any-naming` @ `caf9d84` in
   `ux-factory-wt-figma`. By the time work started, that branch had **merged to `origin/main`
   (PR #118)** and moved 3 commits past it — `fe0a662` (scale import), `7fc66c5` (dock wiring),
   `1912b25` (pack regen), which are handover §C prompts 2+3 and in this plan's own Out of Scope.
   Cutting from that tip would have put dock and scale-import changes in this PR's diff. Cut from
   `origin/main` in a **new worktree** (`ux-factory-wt-116`) instead, leaving wt-figma's in-progress
   branch untouched. Precondition greps verified on the new base: `deriveRamps` present (5 hits),
   exactly **1** `--from ${` line (no merge artifact).

2. **The header baked an absolute path in TWO places, not one.** The plan's fix targets the
   Regenerate line's `--from`. Measured in Phase 1: on the `--from` path `fileKey` *is* the path
   handed in, so the header's `(key …)` printed the absolute path too. Both now use one
   `fromLabel`, and `runPull` returns the normalised value as `fileKey`. Without this, AC5's intent
   ("never bake a home directory into a committed file") was only half met.

3. **Two pre-existing CSS bugs fixed, because they blocked this feature.**
   `.portal-drawer { display: flex }` and `.portal-chat { display: flex }` are author rules, which
   beat the UA's `[hidden] { display: none }`. Every drawer and the chat dock were therefore
   rendering **permanently on screen** (`inset: 0; z-index: 40`) regardless of their `hidden`
   property — screenshot-confirmed before the fix. This pre-dates the ticket (it affects
   `#intake-drawer`, whose CSS I did not write), but the new drawer is unusable without it, so two
   one-line rules were added: `.portal-drawer[hidden]` and `.portal-chat[hidden]`. Side effect,
   worth knowing: the intake drawer and chat dock now actually hide.

4. **`pattern="[a-z0-9-]{1,40}"` (specified verbatim in the plan) is invalid.** HTML `pattern`
   compiles with the `v` flag, where a trailing bare `-` in a character class is a syntax error —
   the browser logged it and **voided the whole attribute**, so client-side slug validation was
   silently dead. Escaped to `[a-z0-9\-]{1,40}`.

5. **Focus on open goes to the file input, not the slug field** (the plan implied the slug). The
   file input precedes the slug in DOM order, so focusing the slug left the drop zone reachable
   only by Shift+Tab.

6. **`400` → `500` for validation errors** — recorded in the plan itself. CLAUDE.md forbids a
   per-route error taxonomy, so faults surface through the single catch-all as `500 { error }` and
   the drawer prints the message; a *refusal* is a `200` discriminated outcome.

7. **File-size display uses KB under 1 MB.** `mb()` rendered a 1 KB fixture as "0.0 MB".

8. **The plan and design note are not in this PR.** Both are committed on
   `chore/v3-merge-vr-reblock` and the plan explicitly forbids cherry-picking them (a second copy
   would conflict when that branch merges). They reach `main` by that route. This report and the
   review are in this PR. Noted so the AC10 check reads as intentional, not missing.

## Issues encountered

- **`drift-check` failed first on an environment gap**, not a regression: a fresh worktree has no
  `tooling/style-dictionary/node_modules`. `npm install` there, then ✓. Same for `portal/`.
- **The `.raw/` cache and `portal/.env` are gitignored**, so they exist only in the worktree that
  fetched them. Copied from `ux-factory-wt-figma` (including `.last-response.json`, which
  `--offline` needs and which the plan's setup notes don't mention) — no Figma request budget was
  spent, the plusui regression ran for free.
- **Merge note for whoever lands this second:** the `runPull` return-shape and header-label edits
  sit in the same regions `fe0a662` touches on the still-unmerged `feature/figma-any-naming`
  branch. That merge will need a conflict resolution there. Not pre-empted here.
- No VR run was needed or done: `portal/**` matches none of `gen-loc-summary`'s group regexes, no
  shipped page changed, and `PACK_FILES` is a hardcoded three-pack list. Only a *committed*
  `system/tokens.<slug>.css` would churn baselines — hence the cleanup step, which is verified.
