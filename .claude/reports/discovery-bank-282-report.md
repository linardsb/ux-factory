# Implementation Report — The question bank as an edited module (`discovery/bank.mjs`)

**Plan**: `.claude/plans/discovery-bank-282.md`   **Branch**: `feature/discovery-bank-282`   **Status**: COMPLETE

## Summary

`docs/research/question-bank-source.md` stages 1–9 are now one frozen, zero-import data module, `discovery/bank.mjs`: 65 entries each with id, stage, text, attribution, label and weak-answer note (plus `provenanceNote`/`note` where the source gives one), the twelve-question opening set as ids, three depth selectors, and three pure selector functions. `tooling/build-checks.mjs` gained group 28, which pins the counts, the documented sets, purity, frozenness, C3 and the source file. The PRD, the architecture doc, the source preamble, `CLAUDE.md` and `gates.md` carry the reconciled count; #281 and #279 were updated on GitHub.

## Tasks completed

- The bank: header (D1–D6 + the two twelve-set judgement calls), `STAGES`, `QUESTIONS` (65), `OPENING_SET`, `DEPTHS`, `questionById`, `questionsForStage`, `selectDepth` → `discovery/bank.mjs` (CREATE)
- Group 28 (nine cases) + the `execFileSync` and bank imports + header index line + `all 28 groups` literal → `tooling/build-checks.mjs` (UPDATE)
- `66` → `65` at six sites + the reconciliation sentence in Inputs → `docs/epics/discovery-partner.prd.md` (UPDATE)
- `66` → `65` at lines 183 and 316 → `docs/epics/discovery-partner.architecture.md` (UPDATE)
- Preamble count line (line 17) → `docs/research/question-bank-source.md` (UPDATE; nothing below the `---` touched)
- `discovery/` map line + `28 PURE groups` → `CLAUDE.md` (UPDATE)
- Boundary list, `28 pure groups`, the Group 28 paragraph → `.claude/references/gates.md` (UPDATE)
- D11: comment posted on #281 (`issuecomment-5454294644`) before this PR opens — `gh issue view 281 --comments | grep -c "group 28"` → 2 (one is #281's own AC text, which pre-existed)
- D12: #279 body re-synced by the same substitutions as the PRD edit; diff read before editing — exactly the PRD's seven lines, the "Every ticket carries" table untouched; one `66` remains (the historical mention inside the reconciliation sentence)

## Tests added

No test framework (CLAUDE.md). Group 28 is the test — nine cases over the real module:

1. count 65 · per-stage `[6,7,6,7,8,8,7,12,4]` · nine stages, every entry's stage named
2. ids unique, `s<stage>-<slug>`, prefix = stage, `questionById` by identity, null over `"nope"`/`undefined`/`42`
3. every entry: `text`/`attribution`/`weakAnswer` non-empty trimmed, label ∈ the three, key set closed, `weakAnswer !== text`, optional keys non-empty when present
4. the twelve as an ORDER assertion (`JSON.stringify` equality)
5. each depth's exact documented set, full discovery headed by the twelve, no orphan, no repeat inside a depth, the junk-depth throw naming the value for `"junk"`, `""`, `undefined`, `42`
6. purity by double call, entries by identity, `questionsForStage(10)`/`("1")` → `[]`, frozen at every level, an inert write
7. C3 term list with a positive control AND a negative control (the profession-noun sentence must NOT match)
8. zero `import` lines, no DOM reach (with its own positive control), no tracked `.html` or `system/**` file reaching `discovery/bank`, sweep-size sanity
9. every `weakAnswer.slice(0, 30)` in the source's stages 1–9 region, with a positive control and a region-size sanity check

**Mutation sweep** (each restored after; `diff -q` identical):

| # | Mutation | Result (observed) |
|---|---|---|
| a | blank `s3-why-now`'s `weakAnswer` | case 3 red: `s3-why-now: text, attribution and weakAnswer must all be non-empty trimmed strings` |
| b | append ` — ask the product manager` to `s4-appetite`'s `text` | case 7 red: `s4-appetite.text carries a title: "product manager"` |
| c | swap `OPENING_SET[0]` and `[1]` | case 4 red (`OPENING_SET drifted…`) plus two case-5 reds (full discovery drifted / must start with the twelve) |
| d | `DEPTHS["scope-check"].ids.push("x")` under ESM strict | `TypeError: Cannot add property 6, object is not extensible` — the throw case 6 tolerates |
| e | reword `s4-appetite`'s `weakAnswer` opening to "A weak answer is an estimate." | case 9 red: `s4-appetite: weakAnswer's opening is not in the source — "A weak answer is an estimate. "` |

## Validation results

All observed:

- `node --check discovery/bank.mjs` clean; import prints `65 12 [ 'scope-check', 'opening-set', 'full-discovery' ]`
- `node tooling/build-checks.mjs` → `build bank ✓ …` and `build ✓  all 28 groups pass`
- `node tooling/drift-check.mjs` → `drift-check ✓ syntax · token-css · …` (bank.mjs staged, so its syntax is in the sweep)
- `git add discovery/bank.mjs && node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift` (the `discovery/` placement claim, proven)
- Level 5: `mv portal/node_modules …off && node tooling/build-checks.mjs` → `all 28 groups pass`; restored
- Level 4: the three depth lists printed and read against the plan's tables — identical
- C2: the Tier A grep → `navigate` ×1 only (inside Shape Up's verbatim quote, exempt). The full `slop-blacklist.md` word list → `significant` ×1 (Cagan's verbatim "statistically significant results", exempt) and `strategic` ×1 (the name of Martin's "strategic choice structuring process", literal use, exempt). No editor's-own word hit.
- `grep -n "\b66\b"` over the architecture doc and the source → no hits; over the PRD → only the historical mention

## Deviations from the plan

1. **The source arithmetic is 69, not 68.** The plan says "68 top-level bullets … 68 − 2 − 1 = 65". Counted (`sed -n 41,143p … | grep -c "^- "`): 69, because Stage 9's "Three more from earlier stages…" line IS a bullet, not an unbulleted line as the plan describes it. 69 − 2 mottos − 1 cross-reference − 1 fold = 65 — the same count, the same 65 the source's `Weak answer` grep gives. The module header (D2), the PRD's reconciliation sentence and the source preamble state 69 with the cross-reference named; the gate pins 65 as planned.
2. **Case 8's DOM check is a DOM *reach*, not the bare word.** The plan's `document`/`window` token test fired on the press-release note's "a document that describes the build" (source prose, carried per D3). The check is now `/\b(document|window)\s*[.[]|typeof\s+(document|window)\b/` with its own positive control — which is what the invariant means.
3. **`note` carries the source's explanatory prose** (D5, stated in the header). The plan's shape allowed `note?` "only where the source gives one"; the source gives one for most bullets (Martin's "iterative, not a form", Shape Up's three elements, Husain's three levels…). Carrying it means a later reader judges an answer without opening the research file. Entries whose bullet is question + attribution + weak answer only have no `note`.
4. **First-person source phrases become "the researcher's".** "the framing is mine", "the fastest vanity-metric detector I know" → "the researcher's framing" / "the researcher's fastest vanity-metric detector", in `attribution`/`provenanceNote`. The bank is not written in the research agent's voice; the header records the rule.
5. **The `humanizer` skill was not loaded**; the C2 pass was run as the plan's VALIDATE grep plus a second grep over every word in `~/.claude/skills/_shared/slop-blacklist.md`. Three hits, all inside quotations or a proper name (above). The strings are the source's words by D5, so the pass had nothing of the editor's to rewrite.
6. **Extra gate cases beyond the plan's nine**: a negative control on the C3 regex, `selectDepth` junk over four values not one, no-repeat-inside-a-depth, optional keys non-empty when present, and two sanity checks (the shipped-file sweep saw >50 files; the source region is >10k chars) so a moved heading or a silent `git ls-files` cannot make cases 8–9 pass vacuously.
7. **`QUESTIONS` is imported as `BANK`** in build-checks — `QUESTIONS` already names `system/build-questions.mjs`'s export there.

## Issues encountered

- Line-number drift: the plan's source preamble "line 17" and CLAUDE.md "line 108" are right; my first pass used 18/109 (an offset from a prefixed shell line) and missed both — caught by the VALIDATE greps, fixed.
- The plan file `.claude/plans/discovery-bank-282.md` (and its `.html` sibling) is untracked on this branch; `piv-commit` should stage the `.md` by path so the plan rides in the PR. The `.html` is a scratch render and should not be committed.
