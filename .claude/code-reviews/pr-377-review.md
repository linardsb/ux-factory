# PR #377 review — the cross-reader case proven red-able, six Low findings, no blocker

**Head** `7056441` · **Base** `main` @ `ea13a8fcd08cb8cc1f1d85b84fa0ddb428b522db` · **Reviewed** 2026-09-06
**Recommendation**: **APPROVE**. No critical, high or medium findings. Six Low, none blocking.

## Summary

Six fixes from `.claude/code-reviews/pr-372-review.md`, +136/-32 over six files. Every one was traced to the
running code rather than to the PR body, and every one does what it claims. The headline fix — group 29 case
28.10 made red-able — was **proven by mutation from both sides of the mirror**, and its stated blind spot was
reproduced on the old assertion and shown closed on the new one. That is the load-bearing result of this
review and it holds.

The six Low findings are all the same shape: the code is right and a sentence about it reaches further than
the code does. Given this PR's own F3 fix is a comment that claimed more than the page did, they are worth
closing — but in a follow-up, not here.

## The red proof (observed, mutations restored)

Baseline `node tooling/build-checks.mjs` → exit 0, `build ✓ all 34 groups pass`.

| # | Mutation | Case 28.10 | Failure text |
|---|---|---|---|
| 1 | `ledgerView`'s rule → `latest: true` (`discovery/ops.mjs:158`) | **RED** | `28.10: the projection omits a block for seq 1 and ledgerView reads latest true — the mirrored visible rule has drifted from indexOps` |
| 2 | the other reader — `visible = decisions` (`prd-projection.mjs:437`) | **RED** | `28.10: the projection renders a block for seq 1 and ledgerView reads latest false …` |
| 3 | **the blind spot** — `indexOps`' `latestByQuestion` made FIRST-wins (`prd-projection.mjs:435`) | **RED**, two seqs by name | old form on the same tree: `blocks=2 latestCount=2 assertion=PASS` — **green on a genuinely drifted mirror** |
| 4 | fixture edit — append a `weak()` row to `SUP` (`build-checks.mjs:5906`) | **GREEN**, exit 0 | old form on the same fixture: `blocks=3 latestCount=2 assertion=FAIL` — two spurious reds avoided |
| 5 | mutation 4 **plus** `latest: true` | **RED** | the fix neither reddens on a legal fixture edit nor goes blind because of one |
| 6 | negative control — revert `facetKey`'s `{}` guard | 28.10 **GREEN**, case 38 **RED** alone | `case 38: facetKey must answer "" for EVERY absent form … (#372 F4)` |

Mutation 3 is the one that matters: same cardinality, different seq set. The count assertion could not see
it; the per-seq loop names both drifted seqs. `ledgerView` is untouched there, so assertions 5911–5913 and
5925 stay green — the proof is isolated to the cross-reader assertion, which is exactly F1's subject.

## Validation

| Command | Result |
|---|---|
| `node tooling/build-checks.mjs` | exit 0 — `build ✓ all 34 groups pass` |
| `node tooling/token-lint.mjs` | exit 0 — `✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| `node tooling/drift-check.mjs` | exit 0 |
| portal smoke, `PORT=4795` | `{"ok":true,…}`, `bootSha` = `7056441` = PR head; `/api/discovery/config` answers |
| GitHub checks | `verify` pass · `visual` pass · `mergeStateStatus: CLEAN` |

## Findings — six Low

**L1 · `portal/public/portal.js:738` — the browser half of F4 has no gate.**
Reverting `facetKeyOf` to its pre-fix guard leaves `build-checks` at **exit 0** (observed). The server twin,
mutated the same way, reddens case 38 by name. Case 41 (`tooling/build-checks.mjs:7494-7497`) slices 260
chars from `const facetKeyOf` and asserts only `keyLine.includes("config.facets.map")` — satisfied with or
without the new guard. Unreachable today: `declaredVector()` returns exactly `null` or a full five-key
object. But the fix's own comment says the two functions "must never answer differently about the same
input", and only one of the two is enforced — a two-copy fix for a two-copy problem, half-pinned.
*Fix*: one `ok()` on the `keyLine` already in scope.

**L2 · `portal/lib/discovery.mjs:870` — the comment's closing absolute is false.**
"The absent forms mirror `normaliseFacets` EXACTLY" is true for the three enumerated forms. "The two
functions must never answer differently about the same input" is not: `facetKey` reads `v[f.id]` through the
prototype chain, `normaliseFacets` reads `Object.hasOwn(facets, id) && facets[id] === true`. Driven —
`Object.create({hasModel:true})` with own `regulated:true` gives `facetKey` `"11000"` against the bank's
`"01000"`; `facetKey('x')` gives `"00000"`, the declared all-false row F4 exists to stop, where
`normaliseFacets` throws. `bank.mjs:1047` states the rule the mirror drops. Unreachable today.
*Fix*: scope the clause to absent vectors, or make the guard total (`typeof v !== 'object' || Array.isArray(v) || …`) in both copies.

**L3 · `tooling/build-checks.mjs:6008` and `.claude/references/gates.md:47` — the coverage claim overstates.**
Both say the per-seq assertion runs "and again on the committed `instrument-loans-1`". The committed block
(`:5967-5974`) asserts `lv.total === pkg.ops.length` plus the Ledger line's per-verb and per-flag counts —
no `#### seq` regex of any kind. Driven: that package is 15 ops / 12 decisions / 12 latest / **0
supersedes**, so even if the loop ran there the case's own vacuity guard would reject it. The old wording
conflated the same way; the sentence was rewritten and the error kept.
*Fix*: attach "and again on the committed `instrument-loans-1`" to the Ledger-line comparison only, in both places.

**L4 · same two sites — "one fixture edit makes the case unable to fail".**
It doesn't. On the review's own scenario the old case **reddens on correct code** (`blocks 2 vs latest 1`,
and the old vacuity guard `2 < 2` also red). Only a maintainer's repair of that red hides a wrong `latest`.
The PR body has it right — "one fixture edit *away from* being unable to fail" — and the two gate-ledger
sites dropped the qualifier, as does the commit subject.
*Fix*: reuse the PR body's own wording at both sites.

**L5 · `tooling/build-checks.mjs:5961` — the anti-vacuity guard reads the function under test.**
`ok(lv.decisions.some((d) => !d.latest), "…the fixture must supersede something")` takes its condition off
`lv`. Under the `latest: true` regression it fires **blaming the fixture** for a code defect. It is
load-bearing (an all-latest `lv.decisions` makes the loop above it pass with zero assertions), which is
exactly why it should not depend on what it guards.
*Fix*: `ok(SUP.some((r) => r.supersedes !== null), …)` — one line, fixture-side, same property, no false attribution.

**L6 · `.claude/reports/discovery-portal-width-288-report.md:66` — the fifth description.**
Commit `7056441` fixed "the four descriptions that still said count". The committed report is the fifth and
is not in this diff: line 66 still reads "`#### seq` block count vs the fold, on a superseding fixture *and*
on committed `instrument-loans-1`" — now false in both halves. CLAUDE.md §Git keeps a ticket's plan, report
and review together; the review file got a Resolution section, the report did not.
*Fix*: one line at `:66`.

## Numbers pass — what did not survive re-derivation

Each is prose, none changes behaviour, all worth correcting where the text lands:

- **PR body, the F1 table**: the cell "under the `latest: true` mutation → old assertion **GREEN**, regression
  ships undetected" is right about the block-count assertion and wrong at the case level — the old vacuity
  guard was **still red**. Reproduced: `OLD blocks=2 latestCount=2 assertion=PASS vacuity(2<2)=FAIL`. The
  sharper true statement is that the regression produces a red *pointing at the fixture*, which is the
  failure mode F1's own prose argues is dangerous.
- **"F9 … there were five in tracked source and docs"**: `git grep 'bank\.mjs:1098' 227686d` returns
  **seven**; two survive at HEAD in `.claude/plans/discovery-portal-width-288.md:790` and `:944`. Leaving a
  frozen plan alone is right; the exhaustive framing is what is wrong.
- **"two pre-existing twins … `renderDiscoveryRecorded` (`:1053`, #359)"**: `git log -S` puts that line at
  `6b50181` (#284), last touched under #286. The second twin is genuinely #359.
- **"PR #372, which merged at `227686d`"**: `227686d` is the branch tip (second parent); the merge commit is
  `ea13a8f`.
- **One review item has no disposition row**: the review asked for a line on `ledgerView`'s header
  acknowledging the two ledgers `checkOpLines` refuses. `discovery/ops.mjs` is not in this diff and the item
  appears in neither the PR body nor the Resolution table. Defensible to skip — the table just shouldn't read
  as exhaustive.

Everything else re-derived and held, including the load-bearing figure: **three renderers emit `#### seq`** —
`prd-projection.mjs:467` (`renderDecision`), `:596` (`renderOpenQuestions`), `:612` (`renderWeakAnswers`),
and nothing else in the module. `facetPlans` is 33 rows, byte-identical between a `227686d` archive and a
HEAD archive (`cmp` clean at 4708 bytes each). `selectDepth` is the correct replacement for `bank.mjs:1098`:
the overflow throw is at `:1101`, inside `selectDepth`'s body declared at `:1095`.

## One residual gap, stated rather than filed

The per-seq loop is **presence-only** (`RegExp.test`), so a decision block rendered twice escapes it where
the deleted count caught it. Driven: duplicating `rungSection`'s rows leaves 28.10 green. The repo is not
blind — group 32.5 and 33.15 byte-compare the committed `prd.md` and go red — but 28.10's own header claims
the cross-reader comparison and the trade is not stated there. Counting *within* the per-seq loop would close
it without restoring the F1 shape; a total block count would reintroduce it, so don't.

## What is good

- **The fix took the review's second option, not its sketched regex.** `^#### seq ${d.seq} · ` is
  format-independent; the sketched `… — (business|stakeholder|solution|transition)$` would have pinned the
  gate to `renderDecision`'s heading tail, so a heading reformat would redden a correct gate. The better call,
  and the rationale is written into the case.
- **The premises hold in source.** `seq = state.ops.length + 1` (`ops.mjs:336`) is monotonic across all four
  verbs, so a `#### seq N · ` heading for a decision seq can only be `renderDecision`'s; and `SECTIONS`
  carries exactly one ladder row per `LEVELS` member, so every latest decision does emit one.
- **The new assertion is stronger in every direction that matters** — it names *which* decision drifted, and
  it catches the fold marking too many latest, too few, a superseded decision rendered, and a latest one
  omitted. The anti-vacuity guard now states its condition instead of inferring it from a count.
- **F2–F9 verified against primary source, not the PR body**: `portal.css:61` really does carry the unscoped
  `[hidden]{display:none!important}`, so the corrected comments in `index.html:194-198` and
  `portal.js:1019-1022` are now true where the old ones were false; `esc` is `String(s ?? '')` so `esc(0)`
  renders `0`; the `#288 added THE WIDTH` fragment really is folded into Group 30 with byte counts confirming
  nothing dropped (7547 + 1738 → 9293, the +8 being F9's rewording).
- **F5 went beyond its six named sites** to two pre-existing twins, and `discoveryLog:1190` correctly needed
  nothing — it writes `textContent`.
- **F6's "no change" is argued, not dodged**: a `<fieldset disabled>` descendant never receives `click`, so
  the guard is redundant there and correct for a directly-disabled button.
- **All four filed issues exist and match**: #373 (F7), #374 (F8/Q2), #375 (the owed paid turn), #376 (no
  committed existing-prd package).
- **No `Closes #N`, with a stated reason** (#288 already closed by PR #372) rather than a silent drop.
- **Both commit messages match their commits exactly**; commit 2's "No behaviour change" is true.

## Recommendation

**Approve and merge.** The six Low findings are prose and one ungated guard, none of them reachable and none
of them a reason to hold a green PR. Natural home for them is one follow-up touching
`tooling/build-checks.mjs` (case 41's pin, the two gate-ledger sentences, the vacuity guard's source),
`portal/lib/discovery.mjs` (the comment's closing clause) and `.claude/reports/discovery-portal-width-288-report.md:66`.

**Method note, for honesty**: this review ran seven independent lanes (a `code-reviewer` pass plus six
targeted) and a mutation lane that had the tree to itself. The mutation lane restored every file — verified
by `git diff --stat` showing only the three sibling-session files that were dirty before it started.
