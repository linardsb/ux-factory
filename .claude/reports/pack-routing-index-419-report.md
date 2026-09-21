# #419 — execution report

Plan: `.claude/plans/pack-routing-index-419.md`. Branch `feat/pack-routing-index-419`.

## What landed

| File | Change |
|---|---|
| `agent-layer/gen-pack-index.mjs` | NEW — 15 ordered routing rules, `routeIndex` (total, throws by path), `indexLine`, `renderIndex` (both pure), `genPackIndex()` |
| `agent-layer/gen-pack-bundle.mjs` | `llms.txt` as a second exclusion; `BUNDLE_NAME` exported; `$description` + header state the reason |
| `agent-layer/build.mjs`, `tooling/drift-check.mjs` | `genPackIndex()` called AFTER `genPackBundle()` |
| `tooling/build-checks.mjs` | group 39 `handoff-seam`; `statSync` added to the fs import |
| `handoff/verdant/llms.txt` | GENERATED — 17 lines |
| `handoff/verdant/pack.bundle.json` | regenerated (16 keys, `$description` changed) |
| `handoff.html` | one line linking the map beside the bundle download (see below) |
| `CLAUDE.md`, `.claude/references/gates.md` | 38 → 39 in all four claim sites; Group 39 entry |
| `system/loc-summary.json` | regenerated after staging the new `.mjs` |

## The absence, answered

The seam run's "landed in a directory of eight things with no map". The map now names every
file and says when to open it: `vocabulary.json` when composing, `pack.json` for the prose,
`contracts/*.contract.json` when binding records, `tokens/css/contract.css` for the CSS names,
`tokens.dtcg.json` for Figma or Style Dictionary, `wc/` for drop-in elements, `figma-import.md`
for the design-tool path, `pack.bundle.json` for one fetch. Two rules are pre-seeded for #332
(`components.css` for the executable form, `contracts/commands/*` for the write path) and are
driven by the gate as synthetic paths, so that ticket adds files into a green gate.

## Divergences from the ticket

**1. The emitter is `gen-pack-index.mjs`, not `gen-handoff.mjs`.** D1 in the plan. `gen-handoff`
runs FIRST of the pack chain; the index measures two artifacts written after it
(`vocabulary.json`, `pack.bundle.json`), so an index emitted there is one pass stale by
construction and reds the drift gate on an untouched tree. AC 1's command changes accordingly:
`node agent-layer/gen-pack-index.mjs` (and the whole chain via `node tooling/drift-check.mjs`).

**2. The exclusion list is two files, not one.** D2. The AC says "excluding `llms.txt` itself";
`pack.bundle.json` is still LISTED in the map with its measured size — the widening is on the
BUNDLE's side: it no longer inlines `llms.txt`. Stated in both artifacts' own text and pinned
in both directions by the gate.

**3. It ran first of the T2 set, not last.** #332 and #333 are open. Nothing in this ticket
needs them: the index is derived from the directory, so a file they add appears the moment the
chain re-runs. The forcing function inverts and is stronger for it — an unrouted pack file is a
throw naming the path, so whichever ticket adds one adds its routing rule in the same edit.

## The one consumer-visible consequence of D2

`handoff.html` offers `pack.bundle.json` as a download, so a reader who takes it now gets the
pack without its map. That is the only surface where the exclusion shows, and it gets one line
linking `/handoff/verdant/llms.txt` beside the button — pinned by the gate, because a future
edit could drop it silently. The page enumerates no pack files anywhere else (the download is a
single labelled link, and the viewer reads `pack.json` + `vocabulary.json`), so nothing else on
it went stale. `handoff.html` is NOT in the visual-regression page set, so the line costs no
baseline.

`pack.json`'s `portability` block names `wc/` files and `figma-import.md` by path, which is a
second index of pack contents living inside the pack. It is left alone deliberately: it indexes
the PORTABILITY PROOFS for the viewer's wrapper column, not the directory, and widening it to
the whole pack would put two generated file lists in one artifact with nothing forcing them to
agree. The map is the whole-directory index; the portability block stays what it is.

## Validation (observed, on the committed tree)

- `node tooling/build-checks.mjs` → `build ✓ all 39 groups pass`
- `node tooling/drift-check.mjs` → `drift-check ✓ syntax · … · handoff · … · group-count`
- `node tooling/token-lint.mjs` → `✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`
- portal smoke on port 4791 → `/api/health` 200
- `handoff.html` rendered headless (Chromium, static serve): the map link visible at 64×466, the
  sentence verbatim, `/handoff/verdant/llms.txt` served 200 `text/plain`, the viewer's 23
  component cards still rendering, zero console errors
- Regeneration is a FIXED POINT: `gen-pack-bundle` + `gen-pack-index` run twice, both files
  byte-identical (md5 compared).

## The gate proven able to fail

Five mutations, each run against the real tree with the unmutated tree as the control:

| Mutation | Result |
|---|---|
| a byte count in `llms.txt` moved by one | ✗ 2 failures, naming `handoff/verdant/vocabulary.json` |
| a line deleted | ✗ 2, naming `handoff/verdant/wc/vd-plant-card.mjs` |
| an UNROUTED file added to the pack (`NOTES.txt`) | ✗ 5, naming it, run not aborted |
| a ROUTED file added with no line (`components.css`) | ✗ 3, naming it, plus the bundle/index disagreement |
| `llms.txt` inlined into `pack.bundle.json` | ✗ 4, including the exclusion pin by name |
| control (unmutated) | ✓ green |

### Deletion, measured separately

"Can it be deleted?" was asked of the artifact, and the answer needed measuring rather than
asserting. Three files removed in turn, each now a named failure and exit 1:

| Deleted | Result |
|---|---|
| `handoff/verdant/llms.txt` | ✗ 4 named failures, first one "must exist" |
| `handoff/verdant/pack.bundle.json` | ✗ 8, including the unwitnessed rule and the two projections disagreeing |
| `handoff/verdant/wc/vd-plant-card.mjs` | ✗ 4, naming the wrapper |

All three were CRASHES on the first attempt, and all three are now fixed: the `llms.txt` read sat
above its own existence check (unnamed `ENOENT`, the remaining groups lost), the battery named
`vocabulary.json` as a literal path, and a rule with no witness fed `undefined` to `indexLine`.
Every existence check now sits before its read, the battery's subject is looked up, and the
witness list is filtered.

**One deletion still ends the run and it is not this group's:** `build-checks.mjs` reads
`handoff/verdant/vocabulary.json` at module top level (line ~311), so removing that file throws
before any group runs. Pre-existing, observed, left alone — widening it is a change to how the
whole file boots, not to this ticket.

The first pass of case 3 aborted the whole run (`routeIndex` threw inside a `.find()`); the
`renderIndex` call is now caught and the witness search filtered to routable paths, so an
unrouted file REPORTS rather than killing the remaining groups. The mutation battery was also
moved off the committed bytes onto what `renderIndex()` would write, so a drifted committed
file is one failure rather than five.

## What is NOT claimed

Whether a purpose or a read-when sentence is TRUE — that a file is what its line says, and that
an engineer's agent routed by it opens the right file first — is unmeasured. The gate pins
consistency and the epic's third fenced run is the only thing that can pin usefulness. Both the
`group()` string and the `gates.md` entry say so.

No shipped page changed (no HTML, no CSS). `loc-summary.json`'s `runtime` group is untouched —
only `generators` (20 → 21 files) and the total moved — and `approach.html` renders `runtime`
alone, so no visual-regression baseline is invalidated.
