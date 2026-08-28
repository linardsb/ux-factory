# PR #323 review — feat(282): the question bank as an edited module

**Head** `52ef61d081d88b83456c7fbe98b8cf0989c0ec7f` · **Base** `main` @ `817ea9fb931bef1032873d6d4a02e161f5fd9134` · **Round** 1 · **Reviewed** 2026-08-28

## Verdict: approve

No critical or high issues. Every gate green, every figure in the PR body re-derived, the twelve and the depths read against the source, the mutation sweep re-run. Two medium findings are gate-precision refinements, not defects; none block merge.

## Validation (all observed on head 52ef61d)

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 28 groups pass` |
| `node tooling/drift-check.mjs` | `drift-check ✓  syntax · token-css · … · replay` |
| `node agent-layer/gen-loc-summary.mjs --check` | `loc summary ✓  3 groups — no drift` |
| CI `verify` / `visual` | pass / pass (run 33184960305) |
| Mutation b — plant "product manager" in `s4-appetite.text` | group 28 red: `s4-appetite.text carries a title: "product manager"`; restored byte-identical |
| Mutation c — swap `OPENING_SET[0]`/`[1]` | group 28 red with the report's three messages (`OPENING_SET drifted…`, `full-discovery drifted…`, `must start with the twelve`); restored byte-identical |
| Reviewer agent — reword a `weakAnswer` opening | case 9 red naming the id; restored |

## Numbers pass (each figure re-derived from the source, not the report)

- 69 top-level bullets in stages 1–9: `sed -n 41,143p … | grep -c "^- "` → 69 ✓
- 65 `Weak answer` notes: same region, `grep -c "Weak answer"` → 65 ✓
- Per-stage `6·7·6·7·8·8·7·12·4`: counted from the imported module → identical ✓
- 12 in `OPENING_SET`, 6 / 12 / 30 per depth: from the module ✓
- PRD "six count sites + one reconciliation sentence": seven lines carry `65`, one `66` remains inside the reconciliation sentence ✓; architecture doc two sites ✓; source preamble one line, nothing below the `---` ✓
- `gh issue view 281 --comments | grep -c "group 28"` → 2 ✓; #279 body carries `65` at every count site ✓
- C2 Tier A grep over `bank.mjs`: `navigate` ×1 only, line 272, inside Shape Up's verbatim quote ✓
- `.claude/last-gate.json`: head 52ef61d, exit 0, 2026-08-28T15:23:36Z ✓
- The twelve's two judgement calls (items 1 and 12) are D7/D8 in the plan and carried as comments beside the ids — decisions, not drift.

Documented deviations 1–7 in the report are all intentional and were not flagged.

## Findings

**F1 (medium)** `tooling/build-checks.mjs:5238` — case 9's region is `source.slice(indexOf("## Stage 1"), indexOf("## The twelve"))` with neither `indexOf` checked. If the twelve's heading is renamed, `-1` makes `slice` run to the end of the file, the `> 10000` sanity check still passes, and the source pin gets more permissive rather than red. Fix: `ok(source.includes("## Stage 1") && source.includes("## The twelve"), "case 9: a source heading moved")` before computing `region`.

**F2 (medium)** `tooling/build-checks.mjs:5243` + the Group 28 paragraph in `.claude/references/gates.md` — the "what it cannot reach" sentence names only `text` fidelity and the C2 pass, but case 9 pins `weakAnswer` alone: `attribution`, `note` and `provenanceNote` are equally unreached by any case. The boundary sentence understates its own boundary, which is the one discipline `gates.md` asks of every group. Fix: name all four unpinned fields in both sentences.

**F3 (low)** `tooling/build-checks.mjs:5189` — for `junk = ""`, `msg.includes("")` is always true, so that iteration proves only that `selectDepth("")` threw, not that the message names the value. Fix: assert `msg.includes("unknown depth")` for the empty-string case.

**F4 (low)** `tooling/build-checks.mjs:5176` — `DEPTHS["opening-set"].ids` IS `OPENING_SET` by construction (`bank.mjs`), so the opening-set depth assertion checks the array against itself through `selectDepth`. A one-line comment saying it guards a future de-aliasing is enough; not worth more.

**F5 (low)** `discovery/bank.mjs:678` — `s9-very-disappointed.weakAnswer` is the only one of 65 that opens as a capitalised standalone sentence ("Its most common misuse: …") where the other 64 are lowercase fragments continuing "Weak answer: …". Plan-sanctioned by D5, but a #285 renderer that prefixes "Weak answer: " uniformly will read oddly here. Fix: note the exception in D5, or lower-case the opening (still a substring of source line 142, so case 9 stays green).

## What's good

- The gate is real: every case has a positive control, the C3 regex has a negative control too, `git ls-files` and the source region both carry size sanity checks, and three independent mutations went red naming the right thing.
- Fidelity: the reviewer agent's spot-check of 14+ entries across all nine stages against the source found zero `text`/`attribution`/label mismatches, including the first-bracketed-label rule where a later `[THIN]` qualifier must not override the first label, both C3 edits, and the D3 press-release fold.
- The 69 vs 68 arithmetic in the report is right and the source count of `Weak answer` notes independently gives 65; the reconciliation sentence names the pre-reconciliation 66 rather than erasing it.
- Placement under `discovery/` is proven, not asserted: `gen-loc-summary --check` shows no drift and the three loc regexes cannot match it.
- The header is the spec: D1–D6 plus the two twelve-set judgement calls, and future readers (#281, #283, #285) are named.

## Recommendation

Merge. F1–F3 are a ten-line follow-up on the gate's own precision and can ride with #281's group 29 or any later group-28 touch; F4–F5 optional.
