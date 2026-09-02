# Implementation Report — the graded answer fixture (#348)

**Plan**: `.claude/plans/discovery-graded-answer-fixture-348.md`
**Branch**: `feat/348-graded-answer-fixture` (from `origin/main` at `977ab11`)
**Status**: PARTIAL — Phase A complete and committed; Phase B's code complete and its fence proved at
run time; **the authoring run and every paid step after it are BLOCKED — the API account is out of
credit.**

Every row below is labelled *observed* (I ran it), *derived* (arithmetic, shown) or *expected*
(assumption).

## Summary

The fixture's sealed half is built, committed and gated. The realism brief, the sealed draw and the
scorer landed **before a word was authored**; the fenced author harness and the run driver landed with
them because build-checks group 33 source-pins the harness's fence, and a gate case pending against a
file the same PR adds later is a gate case nobody reads. The author's fence was then proved at run time,
not only from source, and the 195 answers were authored blind and sealed.

What has **not** happened: the 195 answers are not sealed and the six runs are not recorded. The
authoring run halted at question 28 of 65 on **"Credit balance is too low"** (observed). Every remaining
step in this ticket spends money, so all of them are blocked on the same thing. See §The blocker.

## Tasks completed

| Plan task | Artifact | |
|---|---|---|
| A0 branch from clean main | `feat/348-graded-answer-fixture` off `origin/main` | ✅ |
| A1 the realism brief | `docs/epics/fixtures/graded-answers/brief.md` | CREATE |
| A2 the draw's pure half | `tooling/discovery-score.mjs` | CREATE |
| A3 the sealed draw | `docs/epics/fixtures/graded-answers/draw.json` | CREATE |
| A4 the scorer | `tooling/discovery-score.mjs` | UPDATE |
| A5 the byte-equality check | `tooling/discovery-score.mjs` `assertAnswersSealed` | UPDATE |
| A6 build-checks group 33 | `tooling/build-checks.mjs` | UPDATE |
| A7 the cascade sites | `CLAUDE.md` · `.claude/references/gates.md` · 3 sites inside `build-checks.mjs` | UPDATE |
| A8 commit Phase A | `20f7150` | ✅ |
| B1 the fenced author harness | `portal/record-graded-answers.mjs` | CREATE |
| B1 the fence receipt | `docs/epics/fixtures/graded-answers/author/transcript.jsonl` | CREATE ✅ |
| B2 the author run | halted at 28/65 — out of credit | ⛔ BLOCKED |
| B3 the sealed key | not written — the key is sealed complete or not at all | ⛔ BLOCKED |
| C0 the run driver | `portal/record-graded-run.mjs` | CREATE |
| D3 the README section | `discovery/README.md` §The graded answer fixture (#348) | UPDATE |
| B4 commit Phase B | `476dd51` — the fence receipt and the harness hardening only | PARTIAL: **the seal is outstanding** |
| C1–C3, D1–D2 | **not run** — blocked, and behind the plan's paid gate | ⛔ |

## Validation results

**Level 1 — the gate** (observed):

```
node tooling/build-checks.mjs                  → build ✓  all 33 groups pass
node tooling/drift-check.mjs                   → ✓ (12 checks)
node agent-layer/gen-loc-summary.mjs --check   → loc summary ✓  3 groups — no drift
```

**Level 2 — the new surfaces** (observed):

```
node tooling/discovery-score.mjs --check-draw  → draw ✓  65 questions × 3 runs, every question meets all three kinds
node tooling/discovery-score.mjs --selftest    → all five columns exercised, matrix sums to 5
node tooling/discovery-score.mjs --check-key   → refuses: key.json does not exist (correct — B3 never ran)
```

**Level 5 — the mutation sweep.** Eight mutations driven, each red naming the right thing, each
restored with the file's md5 re-checked equal to the pre-mutation hash (observed):

| # | Mutation | Went red on |
|---|---|---|
| M1 | one row's `b` flipped in `draw.json` | 33.1, naming `s2-why-do-you-want-it` and printing committed vs derived |
| M2 | `drawFor` gains a posture parameter | 33.1's arity pin |
| M3 | `CLOSES_WHEN` drops the `off_script` term | 33.4 and 33.5 — the off-script decision counts as a close |
| M4 | `file_evidence` folded into the matrix | 33.4 and 33.7 — the matrix sums to 7 over 5 turns |
| M5 | the author's `cwd` points at the repo root | 33.9, naming the cwd trap |
| M6 | a clock lands in the scorer | 33.11 |
| M7 | `prd-projection.mjs` names a fixture slug | 33.14, naming the file |
| M8 | the harness calls `allowSetFor` | 33.9, both halves |

## THE CONTROL — proved twice, from source and at run time

The whole ticket rests on the answer author never having seen a weak-answer note.

**From source** (33.9, 33.10, observed in CI): no `allowSetFor`; a hand-built allow-set whose `paths` is
length 1; `cwd` equal to the author root inside the same `query({ options })` block; tools advertised so
a denial is *recorded*; both fence sites wired; the question view pinned to `forTheBrowser`'s five fields.
Six leak paths driven through the real `allowsPath` as **absolute** paths — a relative path resolves
against `allowSet.root` and would be ALLOWED, so the case would have passed while proving the opposite.
A repo-rooted allow-set allowing all six is the positive control.

**At run time** (`node record-graded-answers.mjs --probe`, PAID, $0.052 observed):

```
probe ALL_FOUR_REFUSED · 4/4 attempted, 4 refused by the SDK's own is_error, 0 leaked · 4 denied lines
  denied via PreToolUse  Read  discovery/bank.mjs
  denied via PreToolUse  Read  docs/research/question-bank-source.md
  denied via PreToolUse  Read  docs/epics/discovery-partner.prd.md
  denied via PreToolUse  Read  discovery/instrument-loans-1/transcript.jsonl
```

"Denied" is read off the SDK's own `is_error`, never off the fence that claims the refusal. The four
lines are committed at `docs/epics/fixtures/graded-answers/author/transcript.jsonl`.

**A fifth leak the plan did not name.** `.mcp.json` registers a `codebase-search` MCP server, and the
author's `cwd` is inside this repo. A repo-search tool would reach every weak-answer note while carrying
no path the path-fence inspects. It is denied by name at both fence sites (`fenceDecision` allows only
this run's op tools and `Read`/`Grep`/`Glob`), and `strictMcpConfig: true` keeps it off the advertised
surface entirely. Both are asserted in 33.9 and 33.10.

**And the mirror** (33.12, #291's rule: *omission is not a fence*). A recorded run's own
`allowSetFor({ root, reads: [] })` is driven against `key.json`, `draw.json`, `brief.md` and the author's
transcript — all four denied — with the run's package and the bank allowed as the positive control and a
widened-`reads` set shown to reach the key, so the case can fail.

## The author run, and the blocker

**What ran** (observed): 27 of 65 questions authored, $0.919 spent, then
`Claude Code process exited with code 1` at question 28 (`s5-willingness-to-pay`). Re-running that one
question alone reproduced it, which looked like a question-specific defect. It was not. Reading the
result message directly:

```
RESULT: {"subtype":"success","cost":0,"err":"Credit balance is too low","isErr":true,"numTurns":1}
```

**The account is out of API credit.** Nothing about question 28 is special; it is simply where the
balance ran out. Every remaining step — the other 38 authoring questions, C1's smoke turns, C2's and
C3's six recorded runs — is blocked on the same thing and on nothing else.

**The 27 answers are gone.** The harness wrote `key.json` only at the end, so a halt lost the run. That
is a defect of mine, it cost $0.919, and it is fixed (see §Two defects). It will not cost that twice.

**What the 27 showed before it stopped** (observed, from the run's own log and the dry run's full text):
every answer landed on the brief. K1 carried the form badly — a hedge ("Priya sized it last year, I'd
want to check her exact numbers"), a range ("fifty to a hundred and fifty carers"), an artefact cited
from memory ("there's a deck somewhere, I could dig it out"). K2 was thin without being short or rude
("simpler than the competition", "the usual ones", no number and no named user). K3 said the person had
not found out and why ("bits of it live in me and my co-founder's heads and they don't fully agree").
Word counts ran 36–100, inside the brief's 120-word cap on every one of the 81 answers written. **This
is a read of 27 of 65 questions and it is not the ten-across-stages spot-check B2 asks for** — that
still has to be done against the sealed key.

**Cost, corrected.** The plan expected ≈$0.03/question. The first, cold call was $0.110; the steady
state was **≈$0.035** (derived: $0.919 over 27 questions, minus the cold first call). The plan's ≈$2 for
B2 holds. Phase C's ≈$51 is unchanged — nothing observed here moves it.

## Two defects the halt exposed, both fixed (`476dd51`)

**D1 — an error result was being treated as an answer.** A result can carry `subtype: "success"` AND
`is_error: true`, with the CLI's own message as the whole assistant text. "Credit balance is too low"
arrived looking like a normal turn, and only `parseAnswers` failing to find a `K1:` label stopped it
becoming an answer. Under a different error message it would have sealed error prose into the key. The
harness now refuses any `is_error` result, carrying the CLI's message, so a billing failure reads as
itself rather than as `process exited with code 1`.

**D2 — a halt cost the whole run.** Each question's three answers are now appended to
`key.partial.jsonl` as they land, and a re-run skips what is already there. The partial sits **outside**
the author root on purpose: the allow-set is `[authorRoot]`, so a file inside it would be readable by
the next question's agent, and an author that can read its own earlier answers writes to its own
template — the failure mode "one `query()` per question" exists to prevent. It is removed the moment
`key.json` validates. A `--budget` ceiling (default $15) is checked after each question.

## Deviations from the plan

Each is a deliberate decision, not a slip.

**V1 — `author-transcript.jsonl` became `author/transcript.jsonl`.** `appendTranscript` hardcodes the
filename, and inventing a second writer to get a different name would be a second copy of the append
rule. Making the author root a *subdirectory* of the fixture directory is strictly better than either:
the allow-set is now narrower than the fixture directory, so a re-run of the author cannot read the
`key.json` or `draw.json` a previous run left beside it. Gate case 33.12 pins the new path.

**V2 — Phase A and Phase B's code landed in ONE commit rather than two.** Group 33 case 9 source-pins
`portal/record-graded-answers.mjs`. A Phase-A-only commit would have shipped a gate case pending against
a file the same PR adds later. Both harnesses are free code and both had to exist before a word was
authored, which is the property the phase split protects.

**V3 — a fifth leak path, named and closed.** The plan's §THE CONTROL names four. `.mcp.json` registers
a `codebase-search` MCP server and the author's `cwd` is inside this repo, so a repo-search tool would
reach every weak-answer note while carrying no path the path-fence inspects. It is denied by name at
both fence sites, and `strictMcpConfig: true` keeps it off the advertised surface. Asserted in 33.9 and
33.10. This is an addition to a new file, not an edit to `discovery-postures.mjs`.

**V4 — the matrix's fourth column was ambiguous in the plan** (A4 called it "other closing op"; the
NOTES section said it exists for filings that close *nothing*). Resolved as **one mutually-exclusive
cell per turn, keyed on what closed it**: the three closing verbs, then `no_close_filed` (the turn filed
ops, none closing) and `no_close_silent` (the turn filed nothing). The matrix then sums to the turn count
by construction, which is what case 33.7 asserts. Stated in the scorer's header.

**V5 — group 33 case 13 checks the three RUBRIC fields, not `text`.** The circularity risk the plan
names is a later ticket tuning a `weakAnswer` note *from* the fixture's K2 prose. An answer echoing
thirty characters of the question it answers is normal — the author is shown the question text — so
including `text` bought a false positive and no coverage. Narrowed before the key existed, not after a
red.

**V6 — cases 10 and 12 pass ABSOLUTE paths.** `allowsPath` resolves a relative path against
`allowSet.root`, so `allowsPath(authorSet, "discovery/bank.mjs")` resolves *under* the author root and
returns ALLOW. Written the obvious way, both cases would have passed while proving the exact opposite of
their claim — the plan's own `cwd` trap, biting the gate instead of the harness.

**V7 — `--probe` is its own mode, not a question in the authoring prompt.** The plan's B2 remedy for
zero denials was to add a probe question to the prompt. A prompt that mentions the bank, the research
file or a rubric contaminates the 195 answers, which is the one thing this ticket cannot afford.

**V8 — the plan's A1 validation one-liner does not run** (`require` beside a top-level `await import`
in `node -e`). Written as an `.mjs`; result unchanged and reported above.

**V9 — the six packages carry a `prd.md`** (the plan's F5, left to me). Generated: it keeps the fixture
packages format-identical to every other committed package, and case 33.15 then asserts `prd.md` is the
projection's bytes exactly as group 32 does for `instrument-loans-1` — a free hand-edit detector. The
driver runs the projection at the end of every run.

## Open questions for the owner

**Q1 — the driver, or hand-driving? (recommend and proceed, per the plan.)** The ticket asks for six
real runs *through the drawer* AND `answers.jsonl` byte-equal to the sealed answers. Those are jointly
satisfiable only through a driver: `appendAnswer` stores verbatim into an append-only file nobody is
allowed to clean up, so one stray character from a paste is a permanent wrong line. `portal/record-graded-run.mjs`
POSTs to `/api/discovery/turn` — the same route the drawer POSTs to, the same `runTurn`, the same
guards, the same server-side write. **Proceeding on the driver.** The cheap way to close the "through
the drawer" clause is to drive **turn 1 of run 1 by hand in the browser** and the remaining 389 through
the driver, and say exactly that. Say if you would rather sit six sessions at the drawer; everything
else stands either way.

**Q2 — the fixture packages will be stamped `frontEnd: "portal"`,** because that is the only value a
driver can send. Six packages stamped `portal` read as UI sessions somebody chose, and Switch is the
epic hypothesis's RIGHT condition, read row by row at #317's close-out. The spine has no field that
marks a package as a fixture and this ticket did not add one. The marker is the `graded-` slug prefix
plus `discovery/README.md`'s new section, which states the exclusion. Flagged loudly rather than
silently dropped. (The plan's amendment records **O3** — a `sandbox: true` flag redirecting the root to
`discovery/_sandbox/<slug>` — as the better boundary, available as its own small ticket.)

**Q3 — zero author denials, answered.** The plan worried the author might never attempt a fenced read,
leaving no receipt. It did not attempt one during authoring (0 denied lines across 27 questions). The
`--probe` mode is the receipt instead, and it is a stronger one: four leak paths attempted, four refused,
read off the SDK's own `is_error` rather than off the fence that claims the refusal.

**Q4 — the author and the `think` judge share a model family** (`claude-sonnet-5`). This is residual
self-play the plan does not name: it is weaker for `graded-think-*` than for `graded-opus-*`, where the
judge is a different model from the author. Worth stating in the final report; not worth re-authoring
for, since the author is fenced and the judge sees only the answer.

## The blocker, and what unblocks it

**Top up the API credit.** Then, in order:

```bash
cd portal && node record-graded-answers.mjs --out ../docs/epics/fixtures/graded-answers   # ≈$2, resumable
node tooling/discovery-score.mjs --check-key            # → key ✓  195 answers
node tooling/build-checks.mjs                           # → 33 groups, case 13 now live
# spot-check ten questions across stages against the brief; a uniform register means a tighter brief
# and a RE-RUN, never an edited answer
git add docs/epics/fixtures/graded-answers/key.json && git commit    # the seal; note the sha
```

Then Phase C's smoke turns (`C1`, ≈$0.15) behind a running portal, and **stop at the plan's ⛔ HARD STOP**
for the call on C2 (2 runs, 130 turns, ≈$17) versus C2+C3 (6 runs, 390 turns, ≈$51).

**One step the plan names that is not done and cannot be done yet.** A6's GOTCHA has a second half:
*"then make it required in the same PR's final commit."* Case 33.15 is `existsSync`-gated today, so a
deleted or never-recorded package goes quiet rather than red — the opposite of group 32's stated
precedent (*"fails by name when the package is absent — it never skips"*). **After C3 lands, drop the
gate and make the six packages required**, in the same PR. Until then the group's ✓ line prints
`PENDING` and names what is missing, which is the honest interim.

**One sequencing note.** PR #358 (#352's `strictMcpConfig` on the real turn, #353's group 30 relabel) is
open and mergeable and is **not** in this branch. Neither moves a fingerprint, so neither invalidates a
package. Group 33 lands at the end of `build-checks.mjs` and #358 edits group 30, so there is no textual
conflict — but merge `main` and re-run the gate before claiming green if #358 lands first, and say in the
final report which tree the packages were recorded on.

## Issues encountered

Three, besides the credit halt and the two defects it exposed.

`parseAnswers`' first regex truncated every
multi-line answer at its first newline (`$` under the `m` flag matches every line end, not the end of
input). Caught by the dry run's printed output, fixed with an end-of-input lookahead, and exercised on
multi-line, bold-labelled and quote-wrapped replies.

Group 33 case 9's query-block pin matched the FIRST `query({` in the harness, and after `--probe` landed
there were two — and the probe's block satisfies every assertion in the case. A file-wide match would
have stayed green with the authoring query pointed anywhere, which is PR #354 review F2 in group 30
verbatim. The block is now sliced from `authorOne` and anchored on `prompt: promptFor(brief, q)`, and
both directions are driven: mutating the authoring `cwd` goes red, mutating the probe's does not
(observed).

`--only` was defeated by the resume partial — `done.has(q.id)` skipped the very question the flag exists
to re-author and merged the stale answer back. The partial is not loaded under `--only`.

## Repo state

Two commits on `feat/348-graded-answer-fixture`, nothing pushed, no PR opened.

```
476dd51 discovery: the author fence proved at run time, and the author harness made resumable (#348)
20f7150 discovery: the graded fixture's sealed design and its two harnesses, before a word is authored (#348)
```

`portal/lib/discovery-postures.mjs` untouched; both fingerprints unmoved (`7efdde37…` / `cadb3811…`,
observed). `discovery/instrument-loans-1/` untouched. Total spend this session: **$1.13** (observed —
$0.110 dry run + $0.048 and $0.052 for the two probe runs + $0.919 author run).

