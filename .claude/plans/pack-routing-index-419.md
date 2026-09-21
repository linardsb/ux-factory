# #419 — T2d · llms.txt, the pack's routing index, generated

Epic #329 (the handoff seam), from the 2026-09-15 borrowability audit (O1).

## The concern
`handoff/verdant/` ships 17 files and no map. The 2026-08-28 fenced seam run logged
"landed in a directory of eight things with no map" as an absence: the engineer had to
open files to find out what they were. One generated `llms.txt` — `path · bytes · what it
is · read when` — answers it, and the byte column makes a stale line into drift rather
than into a wrong belief.

## Decisions

**D1 — the emitter is a new generator, `agent-layer/gen-pack-index.mjs`, not `gen-handoff.mjs`.**
The ticket names `gen-handoff`. It cannot be `gen-handoff`, and the reason is measurable:
the index measures `vocabulary.json` (written by `gen-vocabulary` AFTER `gen-handoff`) and
`pack.bundle.json` (written by `gen-pack-bundle`, last). An index emitted from `gen-handoff`
would carry two byte counts for files about to be rewritten, and the drift gate would be red
on a tree nobody touched. The index has to run LAST of the pack chain, so it is its own
generator — CLAUDE.md's prescribed shape for a machine-layer artifact. The name avoids
`gen-llms.mjs`, which already exists and emits the COMPANY SITE's llms.txt from a ledger.

**D2 — `pack.bundle.json` excludes `llms.txt`.**
The bundle inlines every file it lists; the index measures the bundle. Each would depend on
the other's byte count, and no single generation pass could be right (the pair only settles
after a second pass, and any pack change re-opens it). The bundle's own `files` keys are
already a file list; `llms.txt` is what says which of them to open, and it is fetched beside
the bundle rather than out of it. Both artifacts state this in their own text. This widens
the ticket's exclusion list from one file to two — recorded here and in the PR body.

**D3 — the routing table is TOTAL.**
`ROUTES` is an ordered list of rules over the relative path; a pack file no rule matches is a
throw naming the path. #332 adds `components.css` and `contracts/commands/log-care.json` to
the pack, so both already have a rule and both are DRIVEN as synthetic paths by the gate —
those tickets land into a green gate, and any later pack file forces its routing line in the
same edit rather than shipping undescribed.

**D4 — the group is `handoff-seam`.**
The name the epic reserved for #331, which has not landed. #419 creates it; #331/#332/#333
extend it as the epic intends rather than opening a second one.

## Tasks
1. `agent-layer/gen-pack-index.mjs` — `ROUTES`, `routeIndex`, `indexLine`, `renderIndex` (pure)
   and `genPackIndex()` (writes). → verify: `node agent-layer/gen-pack-index.mjs` writes 17 lines.
2. `gen-pack-bundle.mjs` — second exclusion + `$description` + header. → verify: re-running the
   pair twice is byte-stable.
3. `build.mjs` + `drift-check.mjs` — call `genPackIndex()` AFTER `genPackBundle()`.
   → verify: `node tooling/drift-check.mjs` clean on a committed tree.
4. `build-checks.mjs` group 39 `handoff-seam`, pure. → verify: five mutations each go red naming
   the path; the unmutated tree green.
5. Counts 38 → 39 in all four claim sites; `gates.md` gains the Group 39 entry.
   → verify: `drift-check`'s `checkGroupCount` passes.
6. `git add` the new `.mjs`, regenerate `system/loc-summary.json`. → verify: only the
   `generators` group and the total move, so `approach.html` (which renders `runtime` alone)
   keeps its baseline.

## Out of scope
No MCP server, no `llms-full.txt`, no concern slices — the pack is small, `pack.bundle.json`
is already the single-file form, and Mantine's static `mcp/index.json` is the precedent that a
static file is the contract.
