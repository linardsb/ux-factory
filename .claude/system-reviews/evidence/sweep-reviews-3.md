# Sweep 3 — review classification (files 73–107 of `.claude/code-reviews/pr-*.md` + the eight `.agents/code-reviews/agent-reviews/`)

Rules applied: one code per finding; items the review itself rules out ("not vacuous, no change needed", "observation, not scored", "documented, no action") are excluded from counts and named in the row. `[dev]` = a plan defect the IMPLEMENTER caught as a documented deviation — recorded, not counted. Round-2 column = a `pr-N-review-2.md` exists in `.claude/code-reviews/` (184, 339, 340 only among these PRs).

| file | PR | recommendation | severity (C/H/M/L) | R1–R9/N coded findings (id → code, evidence) | X | round 2? |
|---|---|---|---|---|---|---|
| pr-184-review-2.md | 184 | approve (round 2) | none new; prior H1/L1 fixed, L2 documented | — | 0 | this IS round 2 |
| pr-188-review.md | 188 | request changes | 0/0/2/3 | F2→R4 reduced-motion probe tested the already-covered dock, missed the new toggle · F5→R7 approach baselines not regenerated; stale 18,900/72 under tolerance · [dev] plan's "+3 / 65→68" stale, caught by implementer | 3 | no |
| pr-189-review.md | 189 | request changes | 0/1/1/3 | M1→R4 vt-stack-audit hazard A measures sample noise; false-positive 2/7 pages · L1→R4 "own group" labels unattributable; `places.length>1` under-enforces · L2→R4 STYLE_WRITE comment claims "BOTH ways"; four forms unmatched · L3→R6 CLAUDE.md "9 groups" vs 10 printed · Resolution→R9 branch DIRTY after #188; generated files conflicted, regenerated · Resolution→R7 approach renders 75, baselines at 73, pending CI · [dev] plan premise "view-transition-name has ZERO render effect" wrong | 1 | no |
| pr-191-review.md | 191 | request changes | 0/1/2/2 | H1→R2 plan :283-290 prescribed scrollIntoView after `morph()`; "inherited plan defect, not implementer slip" · note→R1 plan's VALIDATE step (Next/Prev/arrows) not run; no manual browser pass in report · M1→R4 site-wide vt-verify block cannot see an aborted transition; "no names anywhere" premise false · M2→N report's shared-flag justification "separate pages" factually wrong · [dev] wrapping at the listener as plan wrote would re-ship #171 stale paint | 2 | no |
| pr-224-review.md | 224 | request changes | 0/1/3/2 | F3→R6 replay/README "implement-phase ops only"; code projects any phase · Resolution→R4 group 11 drove projectTrace only; makeFence half of F1 uncovered | 5 | no |
| pr-227-review.md | 227 | approve | 0/0/2/0 | M1→R4 reduced-motion canvas sub-case could not fail ("100%" matches regex) · M2→R4 `readout===pct(zoom)` tautology | 0 | no |
| pr-228-review.md | 228 | approve (comment) | 0/0/5/5 | M1→R4 `clampSlot(from)` mutation survives group 13 · M2→R4 hitSlot boundary 120 unpinned · M3→R4 SC 2.5.7 gesture never driven; two driver comments claim it is · L4→N hand-written `${12}` count in gate summary | 6 | no |
| pr-234-review.md | 234 | approve | 0/0/0/2 | — | 2 | no |
| pr-235-review.md | 235 | request changes | 0/1/3/3 | H1→R1 plan-cited breadboard pattern "every verb placing focus"; focus dropped to body · M1→R4 group 15 throws on own failure, 15.2–15.4 never run; anti-pattern named in group 14 · M3→N report + CSS comment state a cause already ruled out · L3→R6 header "kept exact by revert()" overstates | 3 | no |
| pr-238-review.md | 238 | approve (ship) | 1 Low + 3 observations | O1–O3 recorded, not defects (excluded) | 1 | no |
| pr-239-review.md | 239 | approve | 0/0/0/2 + nit | note ③→R7 approach baselines carry 23,200 where page renders 23,300 (accepted) | 3 | no |
| pr-240-review.md | 240 | request changes | 0/1/2/3 | F3→R3 skip-to-end collapses announcements; sibling module's recorded lesson not carried, not in deviations · Resolution→N reviewer's prescribed fixes for F1 and F3 were wrong, re-derived | 5 | no |
| pr-241-review.md | 241 | request changes (advisory, post-merge) | 0/1/2/3 | H1→R3 export reads only the two paths spike 3 drove; #130 home-worn pack never reaches it → false honesty sentence · M3→R4 keepPass coordinates assertion cannot fail (default layout) · L4→R4 `out.includes(":root")` vacuous · L5→R4 tracker list hand-typed while comment claims "EVERY path" · L6→R6 stripImports header reads as parser-equivalence · header→N review run after merge; verdict cannot gate · [dev] spike found defect in plan's own @import regex | 1 | no |
| pr-242-review.md | 242 | approve | 0/0/0/4 | L4→N group 18 ✓ line prints 64, a true number about a different thing · Resolution→R7 `gen-loc-summary --check` before staging gave false "no drift"; CI red; regen 3cfde86 · folded-in fix(210)→R7 crossed a loc boundary without regenerating · [dev] plan contradicts itself on example count (Task 4/10A vs Task 3); stale "seven templates" header · L3 excluded (cleared "not vacuous") | 2 | no |
| pr-246-review.md | 246 | request changes | 0/2/2/2 | M1→R3 span rule loses measure cap → 115ch; "no number appears in the plan or the PR" · L1→R1 plan Task 5 named three index.html targets; one changed; report silent | 4 | no |
| pr-247-review.md | 247 | approve (with comments) | 0/0/3/1 | M1→R4 null latency passes 16 INP rows beside one calibration red · M2→R4 `violations()` only exercised by self-test; plan premise "proves comparator where used" doesn't hold · M3→R4 vt-verify summary claims reduced-motion coverage of samples inside `if (!reduced)` | 1 | no |
| pr-248-review.md | 248 | request changes | 0/1/0/2 | H1→R3 streamNote truncation sentence never threaded to export; deviation 4's pattern not applied; no feed fixture · Resolution→R6 file:line citations into studio-canvas.mjs stale pre-PR | 2 | no |
| pr-250-review.md | 250 | approve | 0/0/0/2 | L1→R4 self-test drives `violations()`, not `overLabels()` the gate calls · L2→N report "zero behavioural change" one clause too wide | 0 | no |
| pr-252-review.md | 252 | approve | 0/0/1/1 | M1→R6 in-source comment claims tripwire refuses same-count collision; report says it doesn't · Resolution→N PR merged before review landed; fixes in follow-up PR | 1 | no |
| pr-255-review.md | 255 | approve | 0/0/1/1 | M1→R4 carry case "node at origin" conjunct vacuous (gesture never moved) · Resolution→N merged before fix hunk pushed; review file left uncommitted | 1 | no |
| pr-257-review.md | 257 | approve | 0/0/0/4 | L3→R4 journey case [6] never drives the samePage branch it describes · L4→R4 WRAPPER_ATTRS pinned one direction; a gained prop is silent | 2 | no |
| pr-258-review.md | 258 | approve | 0/0/0/3 | L1→R6 comment cites :262; PR's own header edit moved it to :265 · L3→R6 "released at settle()" overstates · L2 excluded (documented in plan Open Questions, no action) | 0 | no |
| pr-261-review.md | 261 | request changes | 0/0/1/4 | M1→R3 deleting intake-beat.mjs left `.is-animated` never armed; crossfade dead; invisible to every gate · L1–L4→R6 ×4 comments describe behaviour/classes this diff deleted | 0 | no |
| pr-263-review.md | 263 | request changes | 0/1/1/4 | H1→R4 pointer-menu row passes on residue focus from keyboard row · M1→R3 pre-existing adoptBoard never cancels a live carry; #217 widens it · L4→R4 row asserts item count ≥4, claims "navigates and closes" · outstanding→R8 real-Safari/Chrome manual pass not run · Validation→R9 first vt-verify pass predated three fixes | 3 | no |
| pr-266-review.md | 266 | approve with notes | 0/0/2/3 | M1→R6 header cites group 22 ×6 after renumber to 23 · M2→R4 comment calls an assertion the "real detector" of a mutation the drill proved undetectable · L1→R6 new catalog.css text: wrong line, "only caller" false · L2→R6 studio.css cites factory.html:79 after PR moved it to :91 | 1 | no |
| pr-267-review.md | 267 | request changes | 0/1/2/0 | H1→R4 framesPass reads disabled + aria-describedby, never the name; twin `.stx-grab` is named · M2→R4 EXPECTED_NOISE "VERBATIM" false; unanchored CORS alternative masks genuine failures · M3→N comment + report deviation 2 justify API change with a `destroy()` caller that does not exist | 0 | no |
| pr-269-review.md | 269 | approve | 0/0/1/1 | L1→R5 report "50 props, 2 bounded" vs gate 66/3 | 1 | no |
| pr-270-review.md | 270 | approve | 0/0/2/1 | M2→R4 zero-404 row can go green before docs-chain fetches settle | 2 | no |
| pr-272-review.md | 272 | approve | 0/0/2/2 | M2→R4 deviation 8's compile→viewBox re-measure verified only by one-off probes; no repeatable gate · [dev] plan missed the /factory horizontal-axis constraint | 3 | no |
| pr-322-review.md | 322 | approve | 0/0/2/4 + Q1 | F1→R4 fence "both halves" claim: consultation shown, deny branch never exercised · F2→R5 README "CLI 2.1.245" not observed; run used bundled 2.0.77 · F3→R5 pid and line citations point at wrong evidence · F4→N which rows gate `works` stated only in the plan · F5→R4 P1 checks cardinality, not members · F6→R6 two architecture docs carry retired claims · Q1→N CLAUDE.md:150 and :153 both carry the zod clause (documented deviation) | 0 | no |
| pr-323-review.md | 323 | approve | 0/0/2/3 | F1→R4 case 9 `indexOf` unchecked; heading rename makes pin more permissive · F2→R6 gates.md "cannot reach" understates (attribution/note/provenanceNote unpinned) · F3→R4 `msg.includes("")` always true · F4→R4 opening-set asserts OPENING_SET against itself | 1 | no |
| pr-324-review.md | 324 | approve | 0/0/1/2 + Q1, R1 | F2→R5 report "181 lines"; file was 214 · F3→R6 header cites :22–24; only :23 is the regex · not-fixed→R8 plan Q2 must be settled before #284 records real runs | 3 | no |
| pr-339-review.md | 339 | approve once F1/F2 land (conditional) | 0/0/2/3 | F2→R4 report credits "PreToolUse fired per MCP call" to this run; only spike 1 observed it | 4 | yes |
| pr-339-review-2.md | 339 | approve once F6 lands (round 2) | 0/0/1/2 | F6→R4 case 16 writes to the real tree, not TMP; a stale dir reds the gate with no defect · F8→N report "naming the file and line" overclaims one word | 1 | this IS round 2 |
| pr-340-review.md | 340 | request changes | 0/2/3/3 | F2→R2 plan :471/:259 "every decision…" never reconciled with the supersede rule — "a gap in that spec" · F3→R4 group 31 fixture built so five checks cannot fail · F7→R6 build-checks.mjs:4 "Twenty-three groups", prints 31 · F8→R6 CLAUDE.md:148 names group 28; it is 29 | 4 | yes (outside slice) |
| agent/live-derivation-engine-pr15.md | 15 | report-only, no verdict (2 High) | 0/2/1/2 | H2→R6 comment premise "components never set accent text on dark" false; shipped nav does · L1→R6 comment says all pattern classes in components.css; `.card-kicker` is in portfolio.css | 3 | no |
| agent/pr-21-agentic-bridge-review.md | 21 | needs revision (request changes) | 0/1/1/0 + 1 unscored | H1→R3 prototype-chain lookups; identical bug already fixed with a comment in sibling commit — pre-existing twin · obs #3 excluded (unscored) | 1 | no |
| agent/pr-242-docs-chain-211-review.md | 242 | approve (ready to merge) | 0/0/0/2 | L2 excluded ("not vacuous, no change needed") | 1 | no |
| agent/pr-340-review.md | 340 | request changes (not ready) | 1/5/3/3 (H incl. pre-confirmed B) | 1d→R2 same visible-vs-all split as sibling review's F2, traced there to the plan spec gap · 3a→R4 stage-7 filter forced to nothing, gate green · 3b→R4 Run line four fields replaced, gate green · 3c→R4 Ledger line replaced wholesale, gate green · 4a→R6 CLAUDE.md:148 group 28→29 · in-passing→R6 build-checks.mjs:4 "Twenty-three groups" · flake note→N shared-worktree race: sibling review's mutation edit contaminated first gate run; two concurrent review passes on one PR | 5 | yes (outside slice) |
| agent/pr-342-review.md | 342 | approve pending two doc fixes | 0/1/0/1 (L/M) | F1→R4 README/gates.md/report claim "hand-edited op line goes red by name"; same-rung parent swap passes 32.3 and 32.4 · F2→R6 README fingerprint paragraph omits that TOOL_SCHEMA is outside the hash | 0 | no |
| agent/pr-364-review.md | 364 | needs revision (request changes) | 0/1/0/0 | F1→N documented `force` re-run path ships broken and untested end-to-end; upstream design question (accumulate or refuse?) unresolved | 0 | no |
| agent/pr-365-review.md | 365 | approve (ready to commit) | 0/0/1/1 (L/M) | — | 2 | no |
| agent/pr-369-review.md | 369 | approve (ready to commit) | 0/0/0/2 | F1→R2 plan :300 "New guards, all before mkdirSync" puts the document guard ahead of the resume check; resume demands a document it discards; tracked to #288 · F2→R4 case 16 guard floor `>= 9` vs 17 actual · summary→R8 `--probe-audit` owed; blocked by API usage limit until 2026-10-01 | 0 | no |

## Frequency (findings, not files; 43 files, 190 coded items)

| code | n |
|---|---|
| R1 plan-said-so-not-done | 3 |
| R2 plan-defect-copied | 4 |
| R3 plan-gap | 7 |
| R4 validation-hollow | 42 |
| R5 figure-wrong | 4 |
| R6 doc-drift | 25 |
| R7 generated-artefact-drift | 5 |
| R8 owed-step | 3 |
| R9 pre-merge-tree | 2 |
| N other | 15 |
| X ordinary-code-bug | 80 |

Plan defects caught by the implementer as documented deviations (`[dev]`, not counted): 188, 189, 191, 241, 242, 272 — six PRs.

## Recurring "N other"

1. Report or in-source comment states a false/overstated justification or cause (191 M2, 235 M3, 250 L2, 267 M3, 339-2 F8) — 5.
2. Review or its fixes landed after the merge — owner merged first (241, 252, 255) — 3.
3. Gate ✓ summary line hand-written or prints a true number about a different thing (228 L4, 242 L4) — 2.
4. Rationale/invariant lives only in the plan, or duplicated in CLAUDE.md as a second copy (322 F4, 322 Q1) — 2.
5. Reviewer's own prescribed fix wrong and re-derived in resolution (240); shared-worktree race contaminating a gate run + two concurrent review passes on one PR (agent 340); documented feature path shipped untested with an unresolved design question (364) — 1 each.
