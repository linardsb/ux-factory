# PR #340 review — the run package → PRD projection (#290)

**Head** `e54ec51d515c3eaeaa6dcf940e9ce2ab0cf3ea6e` · **Base** `main` @ `8b6ee61ea359f632ff3a75ec181a8f86f7234a48`
· round 1 (no prior review report) · `mergeStateStatus` CLEAN

**Recommendation: request changes.** 2 High, 3 Medium, 3 Low.

The build is green, every figure in the PR body re-derives correctly, and the pure/shell split is the right
shape. Two things block it. The module's stated invariant — eleven sections dispatched off a frozen
`SECTIONS` table, carrying only what the ops carry — is falsifiable at runtime by ordinary op params at seven
sites. And a single page of the projection can report **two different orphan counts for the same fact**.
Group 31 sees neither, because its fixture places adversarial content only where the code already handles it.

Every finding below was reproduced against the real module on a clean tree, and every mutation reverted with
`git diff --stat` clean and `build ✓  all 31 groups pass` re-confirmed afterwards.

---

## Findings

### F1 (High) — an op param can inject `## ` headings into the PRD; seven sites

`discovery/prd-projection.mjs:351` · `:364-368` · `:424` · `:472` · `:489` · `:550` · `:556-558`

`discovery/ops.mjs:141,168,180` validate `wrong_if`, `reason` and `missing[]` with `nonEmptyString` only, and
`:190` checks `url` for an `https?://` prefix and nothing more. No newline is stripped or folded anywhere.
Seven renderers then interpolate those values raw into markdown structure:

| Site | Line | Expression | Source |
|---|---|---|---|
| `renderDecision` | 351 | `` `*Wrong if:* ${p.wrong_if}` `` | op param |
| `renderDecision` (evidence citation) | 364-368 | `` `seq ${s} — ${e.params.provenance} — ${src}` ``, `src` = raw `url` | op param |
| `renderHypothesis` | 424 | `` `- **We'll know we're WRONG if** ${d.params.wrong_if} — seq ${d.seq}` `` | op param |
| `renderOpenQuestions` | 472 | `` `*Parked because:* ${p.reason}` `` | op param |
| `renderWeakAnswers` | 489 | `` p.missing.map((m) => `- ${m}`) `` | op param |
| `projectPrd` (title) | 550 | `` `# ${run.slug} — PRD, …` `` — not even through `field()` | `run.json` |
| `projectPrd` (header) | 556-558 | `field(run.root)`, `field(run.label)`, … — `field()` at `:81` never folds | `run.json` |

**Failure scenario, observed.** A `record_decision` whose `wrong_if` is
`"the rota is fine\n\n## Non-goals\n\nWe will never build a native app.\n\n## Smuggled section\n\n- a claim no op carries"`
is accepted by the applier and projects to **15 `## ` headings instead of 11** — a fabricated
`## Smuggled section` and a **duplicate `## Non-goals`**, each with content beneath it. Each of the other six
sites reproduces the same injection independently (12–13 headings in isolated probes).

This is not adversarial. Answers are verbatim human text and legitimately multi-line — the group's own
`HOSTILE` fixture answer is ten lines. An agent paraphrasing a multi-line answer into `wrong_if`, or citing a
URL it wrapped, is the expected path. The module's header says a blockquote "is HOW ALL ARBITRARY HUMAN TEXT
REACHES THE PAGE"; op params are agent-authored *from* that text and reach the page through neither
`blockquote()` nor `cell()`. A reader of the resulting PRD cannot tell the projection did not assign those
claims to those sections, which is the honesty property the module exists to hold.

**Fix.** `cell()` at `:65` already folds newlines and escapes pipes — that is the containment these sites
need, and folding suits the single-line `*Wrong if:* …` / `*Parked because:* …` idiom. It does not collide
with the no-truncation rule at `:40`: a `wrong_if` is the agent's filing, not a verbatim answer, and folding
removes no characters. **Apply it at all seven sites.** Patching only `wrong_if` leaves the page open through
`file_evidence.url` and the `run.json` header, which is why the table above is exhaustive.

### F2 (High) — the `visible`-vs-all split makes the page contradict itself

`discovery/prd-projection.mjs:560` vs `:510-511` · `:414` · `:432-445`

`indexOps` computes both `visible` (latest decision per question) and the raw `decisions`. Three surfaces
read the raw set while every other section reads `visible`/`latestByQuestion`, and nothing on the page marks
the difference.

**Failure scenario, observed.** Two decisions on `s3-user-need-map`, the second superseding the first, both
flagged `orphan` and `no-evidence` by the applier. One document, two answers:

```
**Ledger** — 2 op(s): record_decision 2 · … · flags: no-evidence 2 · orphan 2      ← :560, counts `checked`
…
## Requirement hierarchy
business 0 · stakeholder 1 · solution 0 · transition 0 · orphans 1                  ← :510-511, counts `visible`
```

A reader has no way to resolve `orphan 2` against `orphans 1`. The same split produces two more visible
effects: `renderMetrics` (`:445`) lists a **retracted kill criterion beside its live replacement with no
marker** — the `*Replaces:* seq N` line that resolves them sits three sections earlier — and `renderEvidence`
(`:414`) counts a retracted decision as an outstanding evidence gap.

Not a plan divergence: the plan specifies exactly this (`.claude/plans/…-290.md:471` "every decision
`flagged` `no-evidence`"; `:259` "plus every `wrong_if` as a kill criterion"). It is a gap in that spec — the
"every decision" sets were never reconciled against the supersede rule. The README's new rule ("the earlier
one gets no block of its own") holds literally, because a table row and a count are not blocks, which is
exactly why nothing caught it.

**Fix.** Keep every record — *nothing is removed* is the right rule — and make the split legible. Mark the
metrics row and the unbacked entry `— superseded by seq N`, and either label the Ledger line's counts as
over the whole ledger or count both surfaces the same way. Then one README sentence saying which sets are
over-all-ops and why.

### F3 (Medium) — group 31's fixture is built so five checks cannot fail

`tooling/build-checks.mjs:5878-5910` (the fixture) · `:5893` · `:5980` · `:6104-6105` · `:434` · `:558` · `:560`

One root cause: **the fixture places adversarial content only where the code already handles it, and pins
only the fields the code already gets right.** Five mutations, each leaving `build ✓  all 31 groups pass`:

| # | Mutation | Result |
|---|---|---|
| 1 | `renderMetrics` + `renderEvidence` flipped `decisions` → `visible` (removes every superseded record) | ✅ green |
| 2 | stage-7 filter at `:434` forced to match nothing, though the fixture holds a real stage-7 decision | ✅ green |
| 3 | Run line's `provenance` / `model` / `posture` / turn-count all replaced with wrong values (`:558`) | ✅ green |
| 4 | the whole `**Ledger**` line replaced with `"**Ledger** — 0 op(s): none at all"` (`:560`) | ✅ green |
| 5 | (F1's class) any op param carrying a newline — no fixture op does | not caught |

**The proof that it is the fixture, not the module.** Mutation 1 goes **red** the moment one word changes:
the fixture's superseding op (`:5893`) copies seq 5's `wrong_if` verbatim, so 31.6's
`present(doc, PRD_RECORDS[later.supersedes - 1].params.wrong_if)` — labelled *"the replaced decision vanished
from the page entirely"* — is satisfied by the **replacement's own block**.

| Fixture | Mutation 1 |
|---|---|
| as committed (identical `wrong_if`) | `build ✓  all 31 groups pass` |
| superseding op given a distinct `wrong_if` | `build prd projection ✗  2 failure(s)` |

The same shape covers the rest: `HOSTILE` (`:5880`) is assigned to answer `a5` and reaches the page through
`blockquote()`, so 31.3's heading equality (`:5980`) and 31.9's inert-text case (`:6104`) assert over the one
input class that was already safe. And `"Ledger"` appears **zero** times in `build-checks.mjs`, so the
document's own summary of the ledger is unread by the gate that certifies it.

**Fix.** Give the superseding op a distinct `wrong_if`. Pin the Run line's four unpinned fields and the
Ledger line's counts. Add a **separate** op carrying a multi-line param with its own assertion — do not bolt
a newline onto an existing fixture op, because `sectionBody()`/`blockOf()` slice on `\n## ` and `\n#### `, so
several other 31.x cases would report a missing claim rather than the injection and the failure would read as
the wrong bug.

### F4 (Medium) — `readPackage` silently drops a mistyped transcript line

`discovery/prd-projection.mjs:599-601`

`.filter((l) => l && l.type === "op")` discards anything whose `type` is not exactly `"op"` — before
`checkOpLines` ever sees it. A well-formed `record_decision` whose `type` reads `"opx"` is dropped with no
error and no count.

**Failure scenario, observed.** On a `mktemp -d` copy of `discovery/spine-meridian-1/`, appending one such
line: **3 decision blocks before, 3 after, exit 0, no output.** The PRD is missing a decision and nothing on
the page or in the console says so. Group 31 cannot reach this — it deliberately does not import
`readPackage` — and a silent drop is what 31.2's own message calls "the worst failure mode an honesty
artefact has".

**Fix.** In `readPackage`, refuse a transcript line whose `type` is outside the README's three
(`text` · `op` · `denied`), naming the line number and the type — the same idiom `checkOpLines` already uses
for a line that reaches it.

### F5 (Medium) — `checkOpLines` does not check that a cross-reference names the right kind of record

`discovery/prd-projection.mjs:229-268` (guard) · `:359` · `:367-368` (render)

`checkOpLines` validates seqs, verbs, param key sets and enums, but never that a `parent_id` or an
`evidence_refs` entry resolves to a record of the appropriate kind. The applier does — observed:
`record_decision: parent_id 1 names a file_evidence, not a record_decision`.

**Failure scenario, observed.** An op ledger whose `parent_id` points at a `file_evidence` and whose
`evidence_refs` points at a `record_decision` passes `checkOpLines` and renders:

```
*Parent:* seq 1 (undefined)
*Evidence:* seq 3 — undefined — undefined
```

Reachable only through a corrupted or mis-filtered transcript — but that is precisely the remit
`checkOpLines` states for itself at `:222-223` ("this guard only catches a file that has been corrupted or
mis-filtered"), and the guard's whole point is refusing by name rather than rendering nonsense.

*Correction to one claim you may hear elsewhere:* this does **not** falsify the module header's `undefined`
promise. That comment (`:76-79`) is scoped to `run.json` header fields, and 31.12 tests it only there. The
finding stands on the guard's own remit, not on a broken header claim.

**Fix.** Two lines in `checkOpLines`: after the seq pass, assert each `parent_id` and `evidence_refs` entry
resolves to a `record_decision` / `file_evidence` respectively, naming the offending seq and what it found.

### F6 (Low) — CLI argv edge cases

`discovery/prd-projection.mjs:620-628`

`--root` with no directory swallows the following flag as its value (`--root --stdout` errors about a
directory literally named `--stdout`), and passing both a slug and `--root` silently prefers `--root` and
drops the slug. Both observed. Operator-facing only, and the error still names a path.

### F7 (Low) — `tooling/build-checks.mjs:4` still says "Twenty-three groups"

The file now prints `all 31 groups pass`, and this PR edits the comment block **four lines below** the stale
line (`:137-142`). Pre-declared out of scope in the PR body; the cost has since dropped to one word.

### F8 (Low) — `CLAUDE.md:148` names the wrong group for a discovery op verb

It says a new verb needs "its build-checks group 28 fixture"; group 28 is the bank and the applier's
per-verb `VALID_FOR` fixture is group 29. This PR edits `CLAUDE.md:103`, so the file is already open. Also
pre-declared out of scope, same reasoning.

---

## Validation — all re-run at `e54ec51`, clean tree

| Check | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `build prd projection ✓` … `build ✓  all 31 groups pass`, exit 0 |
| `node tooling/drift-check.mjs` | ✅ green, nothing new listed |
| `node agent-layer/gen-loc-summary.mjs --check` | ✅ `loc summary ✓  3 groups — no drift` |
| `node --check` on both changed `.mjs` | ✅ clean |
| real package `--stdout` (`spine-meridian-1`) | ✅ 94 lines; `business 0 · stakeholder 0 · solution 2 · transition 0 · orphans 2` |
| determinism on the real package | ✅ two runs `diff` empty |
| write path on `mktemp -d` | ✅ write → refuse (exit 1) → hand-edit → `--force` → `grep -c 'a human edit'` = 0 → diffs clean vs `--stdout` |
| bad slug | ✅ `prd ✗` naming the path, exit 1 |
| `cd portal && import('./lib/discovery.mjs')` | ✅ loads |
| `git status --short discovery/spine-meridian-1/` | ✅ empty — no `prd.md` committed |
| shipped page / generated artifact / VR baseline | ✅ none touched |

## The numbers pass

Every figure in the PR body re-derived at `e54ec51` rather than read across: **639** lines (`wc -l`),
**+380/−1** (`git diff --numstat`), **12** cases (31.1–31.12), **9** answers × **11** ops, **18** refusals
(counted in `REFUSALS`), the **94**-line projection, the hierarchy counts line verbatim, **31** groups. All
correct. No figure sits under an "Observed" heading without a run behind it, and the six manual write-path
claims each reproduced independently above rather than being taken from the report. The four mutation results
are stated as reverted-and-reconfirmed and the tree is clean, consistent with that. **This is the cleanest
numbers pass of any PR in this epic** — the defects below are all in what the gate does not reach, not in
what the body claims.

The nine documented deviations are genuine intentional decisions and none is a finding. On **R12** (the
overwrite rule stated in both the module header and the README): keep both. It is the same
header-is-the-spec / README-is-the-operator-contract split `ops.mjs` already uses, and the header is what an
editor of the module actually sees.

## What's good

- The **`empty`-per-row** design is the best idea in the diff: 31.7.1 loops all four rungs with no
  `transition` special case, and a future rung with a bespoke empty state is covered the day it lands.
- **Flags read from `flagged`, proven by blanking the field** (31.5) — the drift this forecloses is an
  unbacked decision printed as backed, and the mutation is what makes the proof real rather than asserted.
- Building the fixture's **records with the real applier**, so `seq`/`closes`/`flagged`/`supersedes` cannot
  drift from `ops.mjs`.
- The **placement reasoning** is measurable (the `gen-loc-summary` regex → approach's VR baselines), not
  aesthetic, and it closes the architecture doc's open question rather than deferring it again.
- The **refusal message on `writePrd`** is genuinely the best documentation of the hand-edit rule in the repo.
- `pathToFileURL` for the space-in-path guard, and `checkOpLines`'s op-roster-check-first ordering so a
  `text`/`denied` line is refused by its `type`.

## Next

`piv-fix-review-findings` on **F1** (all seven sites, one containment helper) and **F3** (the fixture edits —
re-run mutation 1 afterwards to confirm the gate now goes red), then a call on **F2**, which is a spec
decision, not a patch. F4 and F5 are a few lines each in the two guards that already exist for exactly this.
F7/F8 are one-word edits in files this PR already touches.
