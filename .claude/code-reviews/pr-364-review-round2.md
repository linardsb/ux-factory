# Review round 2 — PR #364 · feature proposals from a finished discovery run package (#359)

**Head** `d2cf3a45102d7546965bb04ccee8a8257ea19c0f` · **Base** `main` @ `3dfcce313fe732e2ff025315788232ecc278868b`
**Round 1** at `.claude/code-reviews/pr-364-review.md`, head `1434f93`, base `3dfcce3` — **the base did not
move**, so the guarantees pass does not apply. Scope is the fix commit `d2cf3a4` and the addendum's figures.
**Reviewer** `piv-review-pr` (fresh context). The `code-reviewer` agent was dispatched on the fix commit and
had not returned when this was posted; every question in its brief was answered by the runs recorded below, so
nothing here rests on it. Said plainly because round 1's report credited two readers and this one has one.

**Verdict: approve.** F1 is closed, and closed structurally rather than by discipline. Four Lows — F5–F7 below,
F8 in the addendum. None blocking.

## Round 1's four findings, re-verified

Each was re-derived by running the code, not by reading the fix.

### F1 (High) — closed, and the gate now earns the sentence it used to only state

Both halves landed. `seedProposalStore` is a new pure export; `runProposalRun` seeds from the package's own
lines; `force` is deleted from the propose route with no override left anywhere.

The part that matters is that round 1's specific complaint — *"the case tests the function, the defect lives
one level up in its caller"* — is answered. Three mutations, each in an isolated detached worktree at
`d2cf3a4`, each reverted green:

| mutation | result |
|---|---|
| `seedProposalStore` always returns `[]` | **RED, 4 named** at 34.1 — including *"an EMPTY seed and the package's own seed allocate the same id — the seed assertion above cannot fail and is proving nothing"*, so the case carries its own vacuity guard |
| `lines: []` put back inside `runProposalRun`'s body | **RED, 1 named** at 34.12, and `dryProposalRun`'s legitimate `lines: []` at `discovery-proposer.mjs:316` stays green — the window bounds the right function |
| the `seedProposalStore` call dropped, an equivalent seed shape kept | **RED, 1 named** at 34.12 — the *presence* of the seed helper is pinned as well as the absence of `lines: []`, so neither half of that case is carried by the other |
| `force` put back into the propose route as **real code** | **RED, 1 named** at 34.14 |

And the one that proves 34.14 is not a grep: **`force` put back as a comment only → all 34 groups still
pass.** The decommented read is real. That is the vacuity half, and it holds.

`force` is gone from every live surface — `discovery-proposer.mjs`, the propose route, `portal/public/`,
`discovery/README.md`, `CLAUDE.md`. The remaining hits (`prd-projection.mjs --force`, `/api/discovery/turn`'s
`runOptions`) are different tools.

### F2 (Medium) — closed, and the off-by-one a naive fix would give is gated too

`checkProposalLines(lines, ops, lineNums)` with the `where(i)` helper; `readProposalPackage` supplies the
reader's 1-based file numbers.

| mutation | result |
|---|---|
| `where()` returns the array index — F2 restored exactly | **RED, 5 named** at 34.15 |
| `where()` returns `i + 1` — the plausible wrong fix | **RED, 5 named** at 34.15 |
| the reader returns indices instead of file lines | **RED, 3 named** at 34.15 |

Observed through the real module: a whitespace-only reason on an in-memory append refuses as *"the proposal
line being appended (verdict on "p1")"* — no number that names nothing on disk.

### F3 (Low) — closed. All six probes 400, nothing written

Driven on a live portal at `PORT=4793`, booted at `d2cf3a4` (`bootSha === headSha`, not stale):

| probe | status | message names the value |
|---|---|---|
| `verdict: "p99"` | **400** | ✅ |
| `proposalId` absent | **400** | ✅ (`proposalId null`) |
| `proposalId` blank | **400** | ✅ |
| `proposalId: "p99"` (names no proposal) | **400** | ✅ |
| `reason` absent | **400** | ✅ (`reason null`) |
| `reason` whitespace-only | **400** | ✅ |

`discovery/allergen-matrix-1/proposals.jsonl` sha256 `e6ac2432b49f30c2` before and after all six —
byte-identical. The addendum's "all six probes" is enumerated in the report's own table, so it is observed,
not derived.

**The seam I went looking for is not there.** The route rejects `b.reason.trim() === ''`; I expected the pure
core's `nonEmptyString` to be `length > 0`, which would have let a whitespace-only reason be 400 at the route
and accepted by `checkProposalLines` — two surfaces validating the same thing and disagreeing. Driven
directly: the core **also refuses** `"   "`. The surfaces agree.

### F4 (Low) — closed, all three re-derive

| corrected figure | observed |
|---|---|
| **15** `case 25:` `ok()` lines added | ✅ 15 |
| **five** live sites carry the group count | ✅ `CLAUDE.md:110`, `CLAUDE.md:178`, `gates.md:5`, `gates.md:11`, `build-checks.mjs:8596` |
| **six** changed `.mjs` | ✅ 6 |

No live site still says 33.

## New in round 2 — three Lows (a fourth, F8, is in the addendum)

### F5 · Low — one row of the report's own mutation table does not re-derive

`.claude/reports/discovery-proposals-359-report.md:300` claims 34.12's mutation goes **"RED, 2 named"**.
Observed at `d2cf3a4`: **1 named failure**, twice, counting every `·` line in the run.

```
build proposals      ✗  1 failure(s)
    · 34.12: runProposalRun still initialises `lines: []` — that IS the defect, whatever else the body also calls
```

Six of the table's seven rows re-derive exactly (34.1 → 4, 34.14 `force` → 1, 34.14 reason-guard → 2, 34.15
index → 5, 34.15 reader → 3). This one is a miscount of the same shape as F4, in the same document, one round
after F4 was raised for exactly this.

**I checked whether it was worse than a miscount, and it is not.** That row claims two things — the store is
pinned to `seedProposalStore`, *and* `lines: []` is absent — so one failure could have meant the first pin
never fires. It fires. Dropping the `seedProposalStore` call while keeping an equivalent seed shape:

```
· 34.12: runProposalRun's store is not initialised from seedProposalStore — an empty seed re-issues
  p1 over a package that already holds p1, and proposals.jsonl is append-only…
```

Both halves are independently red-able, at **1 named failure each**. The gate is sound; only the digit is
wrong.

**Fix:** `2 named` → `1 named` (or split the row in two, which is what it actually describes).

### F6 · Low — the PR body still calls `1434f93` "this PR's head"

PR body line 38: *"Recorded at `1434f93eed68127f79d7d94e1f4166cd5bbb49eb`, which is this PR's head"*. The head
is `d2cf3a4`. The figures under that heading were genuinely recorded at `1434f93` and still hold, so the table
is fine; the sentence around it is not.

This is the surface the numbers pass exists for — the PR body is the most-read artefact and the only one not
in the working tree. **Fix:** "which was this PR's head at round 1", or re-point it at `d2cf3a4`.

### F7 · Low — the store is now seeded, but three of its readers still treat it as this-run-only

All three are **dead in production today**, because the route refuses any second run so `seeded.length` is
always 0. They matter because 34.1 now deliberately drives *seeded* stores, so the seed is a real state the
gate exercises while these three consumers are unexamined.

1. **The slice is correct but ungated.** `discovery-proposer.mjs:299` returns
   `state.lines.slice(seeded.length).filter(…)`. **Mutation: delete the slice → all 34 groups still pass.**
   The slice *is* right — the handler reassigns `state.lines = next` (`:217`) rather than pushing, but
   `checkProposalLines` returns `[...lines]` in order, so the seed stays at the front. Nothing checks that.

2. **`filed` counts the seed, so a seeded store eats this run's budget.** `:198` reads
   `state.lines.filter((l) => l.type === 'proposal').length` and compares it to `MAX_PROPOSALS`. Seeded from
   an 8-proposal package, the ceiling refuses the *first* call of a run that has filed nothing — and its
   message says *"this run has already filed 8 proposals"*: a count of the **package**, reported as a count
   of the **run**. Refusing is arguably the safe direction; the sentence names the wrong subject.

3. **The run handler does not pass `lineNums`, where the verdict route does.** `:215` calls
   `checkProposalLines([...state.lines, line], state.ops)` with no third argument, so a refusal on a *seeded*
   line — one that is already on disk — reads *"the proposal line being appended"*. That is F2's defect in
   miniature, in the same file F2 was about. It cannot fire today: `seedProposalStore` already checked those
   lines with real numbers before the run started, so a seeded line that would fail here failed earlier.
   `server.mjs:311` passes `pkg.proposalLines`; these two writers to the same file differ.

**Fix (optional, author's call).** Either close them — pass `proposalLines` at `:215`, count `filed` from the
slice, and add one 34.12 sub-case asserting the returned length equals the run's own appends when
`seeded.length > 0` — or state in group 34's *"cannot reach"* clause that the seeded path is gated only at
`seedProposalStore` and never end-to-end. The repo's convention treats a named boundary as acceptable; an
unnamed one is what [[the check that cannot fail]] is about.

## Four seams checked and clean

Each of these was a plausible place for the fix to have leaked. None did:

- **`writeProposalsMd` threads the file line numbers.** It calls `readProposalPackage(root)` and hands the
  whole package to `projectProposals`, which destructures `proposalLines` — so the regeneration that runs
  *immediately after* every verdict append inherits F2's fix rather than reintroducing it.
- **`dryProposalRun`'s stated reason for not seeding is honest.** Its comment says `seedProposalStore` would
  throw on a corrupted file and abort the diagnostic. `readProposalPackage` — called one line above — only
  reads and parses; it does not call `checkProposalLines`. So the throw really would be new, and the comment
  describes the code rather than rationalising it.
- **No bare `${i}` survives in `checkProposalLines`.** All eleven locators go through `where(i)`.
- **The route and the pure core agree on a blank reason.** Both refuse whitespace-only (driven, above).

## Validation

Every row is my own run at `d2cf3a4`, not a re-reading of the report.

| gate | result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ **all 34 groups pass**, exit 0 |
| same, isolated detached worktree with **no `portal/node_modules`** | ✅ all 34 groups pass — the SDK-free graph holds at run time, not by grep |
| `node tooling/drift-check.mjs` | ✅ twelve checks, exit 0 |
| `node tooling/token-lint.mjs` | ✅ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid, exit 0 |
| CI | ✅ `verify` pass · `visual` pass — **run at `d2cf3a4`**, confirmed against the run's `head_sha` |
| portal smoke | ✅ `/api/health` 200 on `PORT=4793`, `bootSha === headSha`, not stale |
| `--dry` on `allergen-matrix-1` | ✅ **6/7**, DR5 the guard working, fingerprint `d37633011f127c85b560d333d26e3259` unmoved |
| the paid package untouched by the fix commit | ✅ `git diff 1434f93..d2cf3a4 -- discovery/allergen-matrix-1/` is empty |

### AC #4 re-derived at the new head

The fix commit touched `proposals.mjs`, which imports from `prd-projection.mjs`, so the headline structural
claim was re-run rather than assumed:

| package | projected | committed | |
|---|---|---|---|
| allergen-matrix-1 | `096643ee607a250c` | `096643ee607a250c` | **identical — and this is the one carrying `proposals.jsonl`**, so the claim is exercised, not vacuous |
| bracket-trace-1 | `bda06c6fc7765b41` | `bda06c6fc7765b41` | identical |
| bracket-trace-2 | `7e9454aee381bbb3` | `7e9454aee381bbb3` | identical |
| graded-opus-a | `303b0907a2a37feb` | `303b0907a2a37feb` | identical |
| graded-think-a | `b9bd322df0781ee9` | `b9bd322df0781ee9` | identical |
| instrument-loans-1 | `854edc1c47e3450b` | `854edc1c47e3450b` | identical |
| spine-meridian-1 | `71e5b099c42c9397` | — | computed only; no committed `prd.md` |

The import edge is still one-way: `prd-projection.mjs` names `proposals` **twice, both in comments**
(`:86`, `:101`), and imports nothing from `proposals.mjs`. 34.5's decommented read has something real to read.

## What's good

- **F1 was fixed at the level round 1 said it lived at.** The complaint was that the gate tested the function
  while the defect sat in its caller. `seedProposalStore` is a new *pure* export precisely so the seam itself
  is drivable, and 34.1 carries a vacuity guard that fails if the empty and seeded stores ever allocate the
  same id. That is the harder of the two available fixes.
- **`force` deleted rather than defaulted off.** The route's own comment had argued for one run per package
  since the first commit; the code now holds what the comment claimed. `--dry`'s DR5 message was updated in
  the same commit, so the preflight and the route say the same thing.
- **34.14's decommented read is proven, not asserted.** `force` as a comment stays green, as real code goes
  red. The author flagged this exact trap in their own commit message; it survives an independent test.
- **F2's fix anticipates its own wrong version.** Gating `i + 1` as well as `i` is the difference between
  testing a fix and testing the property.

## On AC #7 — unchanged, and still the right call

`proposals.md`'s honesty header states the owner wrote every verdict. Round 1 ruled that writing them to
satisfy an AC would make the committed artefact's own claim false in an append-only file. Nothing in the fix
commit changes that. **Merging lands a package awaiting eight owner clicks in the discovery drawer** — worth
saying on the ticket rather than leaving ambient.

## Recommendation

**Approve.** F1 is closed structurally and the fix is gated by mutations that go red by name, including the
vacuity control that proves the decommented read is not a grep. F2, F3 and F4 all re-derive. Every gate is
green at the actual head, and CI ran there too.

F5 and F6 are two-line documentation corrections. F7 is a gate boundary worth one sub-case or one sentence in
the group's *"cannot reach"* clause — the author's call which.

Posted as a comment, not a formal review action: solo repo, own PR, `gh pr review --approve` is refused on
one's own PR.

---

## Addendum — the `code-reviewer` agent's pass (landed after posting)

The agent finished after this review went up. **It changed no conclusion and modified nothing in the working
tree** — it ran its own mutations in disposable detached worktrees at `d2cf3a4`. It independently reached the
same verdict on F1–F4 and on every gate window (34.12 bound to `runProposalRun`, the propose-route window not
truncatable by a stray `'/api/discovery/` substring, and the verdict-route pin genuinely per-field rather than
a blanket "some 400 exists" check). It adds two things.

### F7.2 upgraded from a code-read to an observation

I reported the `MAX_PROPOSALS` accounting from reading `:198`. The agent **drove it**: seeding six existing
proposals against `MAX_PROPOSALS = 8`, a run got **two** tool calls before the ceiling refused it, with the
message *"this run has already filed 8 proposals"* — when it had filed two of its own.

That also sharpens why it is worth writing down. The same commit sliced `runProposalRun`'s **return** past the
seed with an explicit comment — *"a caller counting them would over-report what was just proposed"* — and did
not carry that reasoning down into the live ceiling one function below. The fix's own rationale already names
the defect; it just was not applied twice.

The agent also notes `seeded` is not in scope inside `buildProposalServer`, so the obvious one-line fix does
not compile: the seed length has to be threaded in (`seedCount`), or an effective cap
(`MAX_PROPOSALS - seeded.length`) passed to the handler. Worth knowing before anyone reaches for the quick edit.

### F8 · Low — group 34's own `gates.md` entry is stale, inside the PR that wrote it

`.claude/references/gates.md:57`. The group 34 entry was added by **this PR** (`40761ff`) and describes the
gate as it stood then. `d2cf3a4` did not touch `gates.md`, so the entry names none of what the fix added:

| the fix added | in the gates.md entry? |
|---|---|
| `seedProposalStore` and the seed it drives (34.1) | **absent** |
| `force` deleted, and 34.14 pinning it named nowhere | **absent** |
| the verdict route's two new `400` guards | **absent** |
| 34.15 and the file-line tracking (`proposalLines`) | **absent** |

This is not a general staleness complaint: the **neighbouring group 30 entry two lines above was kept current
by this same ticket**, carrying a "#359 added TWO KINDS OF RUN, ONE FENCE…" paragraph. So the file is
maintained per-ticket here, and group 34 is the one that fell behind — in the round that changed it most.

`gates.md` is the file `CLAUDE.md` sends a reader to *"before adding or changing a gate, or before trusting a
green run"*, which makes an entry describing a superseded gate the specific failure that file exists to
prevent. **Fix:** one sentence appended to the group 34 entry, the way #359's group 30 paragraph was written.

### Two clean results worth recording

- **The slice is airtight, by execution.** The agent enumerated every `state.lines` touch point (189 guard,
  198 read, 204 read, 215 read, **217 the only write**, 299 the slice) — no filter, splice or reset anywhere —
  then fired the real tool handler through the SDK's own `tools/call` dispatcher over a 6-proposal seed and
  watched it grow 6 → 7 → 8 one call at a time.
- **`writeProposalsMd` was driven, not just read.** A temp package with a blank line and a duplicate id at
  real file line 3 threw `proposal line 3 repeats id "p1"` — the file line, not the index, not "being
  appended". F2's fix survives the regeneration that runs immediately after every verdict append.

**Verdict unchanged: approve.** F8 joins F5 and F6 as documentation corrections; F7 keeps its severity and
gains better evidence.
