# Report — Figma token import (#110)

Continues `.claude/plans/figma-token-import-handover.md` §B. Two commits: the parity read hardened
into something that survives a real design system, then the import direction the repo was missing.

## What the handover assumed, and what the file actually said

The handover proposed replacing the oversized `GET /v1/files/:key` with
`GET /v1/files/:key/styles` → `node_id`s → `/nodes`. **`/styles` returns an empty array.** It lists
*published team-library* styles only, which a Community-kit duplicate on a non-Enterprise plan does
not have — and `figma-parity.mjs`'s own comment (then at line 84) already said so. Probing it first
cost nothing and killed the plan before any code was written around it.

Two more of the handover's open questions closed on measurement:

| Question | Answer |
|---|---|
| Does REST read access work? (inferred, "high-confidence, not proven") | **Proven.** `?depth=1` → `200`, 27.9 KB. |
| Which line threw `Invalid string length`? | Still unknown — the stack was discarded. Now printed, and moot: nothing materializes a giant string any more. |

The 403 gate body is now captured verbatim: `Invalid scope(s): current_user:read,
file_comments:read, file_content:read, …` — Figma listing the scopes the token *does* carry, none
of them `file_variables:read`. That is better evidence than the cited docs.

## The read (commit 1)

The single-request fallback cannot be made to work: a kit-sized document is past V8's ~512 MB string
cap, and `res.text()`, `JSON.parse` and the pretty-printed cache write each need it whole — so
streaming cannot rescue it and the payload has to shrink server-side. It now pages: `?depth=1` for
the index, then one `/nodes?ids=<page>` per page.

The budget discipline matters more than the paging. The file has **92 pages** against a Starter
allowance of ~6 GET-file requests *per month*, so:

- every response is streamed to `tooling/figma/.raw/` and recorded **before** it is parsed — a crash
  can no longer cost a request, which is exactly how the 2026-07-25 run was lost;
- a cached response is reused, never re-bought (`--refresh` forces);
- `--page <name|id>` and `--max-pages <n>` bound a run, and every page they decline is named in the
  output with the reason — a silent cap would read as full coverage.

Total spend for this whole session: **3 requests** (403 on variables, the page index, the `Color`
page). Everything after was `--offline`.

An empty read now throws instead of writing a "real run" artifact reporting "0 of 64 matched" from a
file it never saw.

## The import (commit 2)

`tooling/figma/figma-read.mjs` holds the shared read; `figma-parity.mjs` keeps only the diff, and
`figma-pull.mjs` is new. The extraction was mechanical and verified by parity's offline replay
printing an identical 258 entries / 1 page read / 91 skipped.

It targets a **pack**, never the contract — a Figma file holds brand values, and the contract layers
stay generated from `tokens.source.json`.

**Role mapping, not name mapping.** Ramps arrive as `gray/900`, `indigo/600`; the contract speaks
`color-fg`, `color-accent`. Name matching imports nothing (parity measured exactly that: 0/64). Each
contract token claims a nominal rung instead, and every emitted value is a real value from the file.

**Contrast negotiated inside the file's own ramps.** `RULESET.wcagPairs` — the same list `derive()`
is held to — is imported, not restated. A nominal rung is not automatically accessible, so a failing
token walks to the nearest rung *of the same ramp* where every pair it takes part in passes.

Testing `--accent yellow` (which fails at `/600`) caught a defect worth recording: the accent
negotiated to `yellow/700`, which was also `color-accent-hover`'s pinned rung — a hover state
identical to its rest state. Hover/active are now offsets from wherever the accent lands.

## Verification

- `drift-check` ✓ (syntax · token-css · annotated-source · loc-summary · system-graph · handoff ·
  scenarios · traces) · `token-lint` ✓ 64 contract tokens.
- Visual regression, Docker: **18 passed**, only the two approach baselines changed — a new tracked
  file under `system/` moves the runtime group (42→43 files, 11,100→11,200) and `approach.html`
  renders that number.
- `system/tokens.plusui.css`: 16 roles mapped, 12/12 WCAG pairs pass, no negotiation needed, 48
  tokens auto-filled from contract defaults. Same token set as the contract, emitted by the same
  `gen-pack-css` path as `tokens.verdant.css`.

## Decisions and what is deliberately not here

**The parity artifact stays unwritten** (owner's call this session). `portability.figma.parity`
remains `null`. Diffing a third-party kit against this repo's contract scores 0/64 by construction —
honest, and evidence of nothing. Landing it would put a headline "0 matched" on a pipeline that
works. It needs a Figma file seeded from this repo's own `tokens.dtcg.json`, which needs a step in
Figma: Tokens Studio → import → "Create styles" → apply to nodes (drag-and-drop DTCG import creates
*variables*, which REST cannot see on a non-Enterprise plan).

**The pack is not wired into the dock or `pack-boot.js`.** A fourth committed pack means touching
both allowlists and `PACK_RE`, and is its own change.

**`system/tokens.verdant.css` is stale** — it predates `--color-accent-wash`, `--font-mono` and the
15 `--motion-*` tokens, so it is missing 17 the current contract declares. `gen-pack-css` is not in
`build.mjs`, so no gate catches it. Not touched here; worth a `--verdant` regen.

**`FIGMA_TOKEN` appeared in a session transcript on 2026-07-25.** Rotating it in Figma is cheap
insurance, and is the owner's action.
