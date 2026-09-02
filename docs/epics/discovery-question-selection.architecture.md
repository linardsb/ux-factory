# Architecture — Question selection in a discovery session

**Status:** decided 2026-09-02 · **Epic:** [#279](https://github.com/linardsb/ux-factory/issues/279) —
[discovery-partner.prd.md](./discovery-partner.prd.md) · [.architecture.md](./discovery-partner.architecture.md)
**Decides:** how a session decides WHICH questions to ask for a given product.
**Amends:** #283 (bank width) · #285 (session rules) · #288 (portal width, one control) · #293 (close-out).
**Closes:** #360, folded — see §D5.
**Blocks:** #283 and #285 must not be built ahead of this doc. Both were specified against a taxonomy
this doc rejects; building either first turns a decision into a rewrite.

This is a sub-decision of epic #279's architecture, not a second architecture. Everything in
[discovery-partner.architecture.md](./discovery-partner.architecture.md) stands except where §D5 names
an amendment. Approach C is unchanged: the server owns the selection, the agent never chooses a question.

---

## The problem

A discovery session asks a hardcoded list in a fixed order, identically for every product.
`selectDepth(depth)` returns `DEPTHS[depth].ids` and nothing about the product reaches it.

Two open tickets would have fixed that and both are wrong in the same way.

**#283** adds four static buckets — B2B SaaS · internal tool · consumer · regulated. **#285** has a human
pick one from a dropdown before the first question is asked. But a company selling rota and compliance
software to home-care agencies is B2B SaaS **and** regulated, and the taxonomy has no cell for it.
#360 saw the collision and proposed inferring the bucket from the opening twelve instead. That fixes the
timing and keeps the taxonomy — which is the half that is actually broken.

**The bucket is a lossy encoding of facts the product has independently.** Four names cannot express a
conjunction, and every conjunction is real: an internal tool can be regulated, a consumer product can run
a model, a B2B product can replace a process. Inference does not help, because there is nothing to infer
*to*.

---

## D1 — The model: facets, not buckets

**Decided.** The four product types are retired as a selection mechanism and survive as **presets**.
The selection input is a **facet vector** — a small set of independent booleans recorded in `run.json`
beside `depth`. Each facet keys a **module** in the bank: a named, ordered group of question ids.

**Five facets.** Each is a fact about the product, not a category for it.

| Facet | The question the person answers | What it fires |
|---|---|---|
| `hasModel` | Does a model run in the user's path? | The AI-interaction module — #283's six HAX/PAIR areas |
| `regulated` | Can a regulator, auditor or statutory duty inspect what this does? | Stage 6's audit-trail and accountability tail |
| `internal` | Do the users work for the organisation that builds it? | Stage 6 process/workflow questions; drops willingness-to-pay |
| `orgBuys` | Is the payer someone other than the user? | Stage 5's value-metric and pain-budget tail; false ⇒ the consumer selection |
| `replacesAProcess` | Does it change how an organisation already works? | The transition-requirements tail |

**`replacesAProcess` is not new scope — it is an unelicited rule the PRD already carries.** MVP 10 makes
the transition note *"required when the product changes how an organisation works, and markable n/a with
a reason otherwise"*, and nothing in the session asks. That the facet vector supplies a rule the PRD
already wrote is the evidence this decomposition is the product's own, not a taxonomy invented here.

**The four PRD names survive as presets over the vector.** "Regulated" ticks `regulated`; "B2B SaaS"
ticks `orgBuys`; "internal tool" ticks `internal` + `orgBuys`; "consumer" ticks nothing. The person then
adjusts. MVP 4's language holds and its logic is fixed — a preset is a starting point, never a cell.

**Four are not enough, and five is not a claim that five are.** Marketplace stays deferred (PRD open
question). What changed is that a fifth *product type* would have been a fifth bucket colliding with the
other four; a sixth facet is additive by construction.

### D1a — The composition rule: a budget, and overflow is a choice the person makes

A union grows without limit, and MVP 5's **~30** is load-bearing — #283's own AC pins full discovery at
about thirty rather than letting width grow it. So the tail is a budget, not a union:

- **The twelve are fixed.** `OPENING_SET`, in its order, first, unconditionally.
- **The non-functional block is fixed** (4, per #283) — it is not facet-gated.
- **Each facet module carries its own budget**, declared in the bank beside its ids.
- **The twelve + the block + at most two facet modules fit inside ~30.** A third or fourth ticked facet
  overflows, and the overflow is **shown at intake, never resolved silently**: the person keeps the
  modules that matter or runs `whole-bank`. No silent truncation and no 45-question session.

**Wrong if:** a real product routinely ticks three or more facets. Then ~30 is the wrong ceiling for
full discovery and the ladder needs a rung between it and the whole bank — a menu change #283 and group
28 both pin by name, so it is a ticket, not a tweak. Run 1 (regulated, full depth) ticks one and will
not test this; the first that can is the second, faceted `full-discovery` run, on a real product with a
different vector.

### D1b — Which depths take facets: `full-discovery` only

`selectDepth(depth, facets)` is **total over all four depths**, and three of them ignore the second
argument entirely.

- **`full-discovery`** composes from facets. Its first twelve are `OPENING_SET` in order, so a facet can
  only ever extend the tail.
- **`opening-set`** is the twelve and has no tail — vacuously unbranched.
- **`scope-check`** is six Stage 4/7 ids and is not a prefix of the twelve. It does not branch.
- **`whole-bank`** is the bank by definition; a facet can neither narrow nor widen it.

**Wrong if:** an unfaceted call ever answers a different list. **`selectDepth(depth)`,
`selectDepth(depth, null)` and `selectDepth(depth, {})` must be byte-identical to today's four lists, for
every depth.** Every committed package predates facets and carries no `facets` field, and every existing
caller passes one argument — observed, `grep -rn selectDepth`, four files:

| Caller | What breaks |
|---|---|
| `portal/lib/discovery.mjs:463` | `openSession`'s depth validation |
| `portal/lib/discovery.mjs:515` | `sessionView` — the cursor's own list |
| `tooling/discovery-score.mjs:394, 436` | **The graded scorer.** `selectDepth(pkg.run.depth)` over every committed package, and `selectDepth("whole-bank")` for the 65 ids it scores against |
| `tooling/build-checks.mjs:5274-5311, 5820, 7148, 7220, 7603` | The four per-depth pins, the parenting fixture's turn ids, the graded run's ids, and the committed-package validation |

If `whole-bank` moves by one id, `graded-think-a` and `graded-opus-a` — 65 turns each, the epic's only
measurement of MVP 6 — stop being comparable and the 74% / 80% reading dies. The scorer is the third of
those callers and it is the one that produces that reading, which is what makes this the sharpest wrong-if
in the document. It is asserted by driving the absent and empty cases explicitly, never by construction.

---

## D2 — The decider: the person, at intake. No inference.

**Decided.** The facet vector is **declared by the person** in the session-start control, beside depth
and provenance. There is no `inferBranch`, no agent proposal, and no prompt instruction.

**Why not inference.** #360's own constraint kills its own mechanism. It requires *"a pure predicate,
not a prompt instruction"*, and the only material available after the twelve is free English prose in
`answers.jsonl`. A pure predicate over prose is a regex dialect list, and its gate is a fixture set the
same author writes — the failure mode this repo has already paid for and recorded: *every #137 defect
survived a green gate the same way, the check skipped the thing it tested.* An `inferBranch` gate would
pass on the day it shipped and say nothing about a real answer.

**The premise inference rests on does not hold.** *"Nobody can tell which questions matter until that
sentence exists"* is true of the bucket and false of the facets. "Which of these four boxes is my
product" needs discovery; "does a model run in the user's path", "can a regulator inspect this", "do the
users work here" do not. The person building the rota-and-compliance product answers all five in
seconds. The checkboxes are the machine-readable projection of the sentence they would have typed.

**Agent-proposes / human-confirms is kept where the PRD put it** — on **depth** (MVP 5), and on D5's
escalation. Width is declared, not proposed. The two mechanisms compose exactly as #360 said they should;
what does not survive is the wiring it proposed underneath.

**Wrong if:** a person cannot answer a facet box without having already done the discovery. That is the
bucket failure one level down, and it would mean facets need eliciting rather than declaring — which is a
question in the bank, a server-closed turn, and a spine change. Run 1 tests it: if the owner hesitates on
a box, record the hesitation in the run report rather than smoothing it over.

---

## D3 — The moment: once, at session start, recorded in `run.json`

**Decided.** `facets` lands in `run.json` at `openSession`, exactly as `depth` already does, and is
never re-decided. The question list stays `f(depth, facets)`, a pure function of what `run.json` records.

This is the whole of what invariant 4 requires. The cursor stays a fold over the transcript's closed
turns; the sequence never becomes state; nothing is recorded twice; disk stays authoritative on resume
(invariant 2). No projection change, no second fixture gate, no spine change.

**Not continuously, and not after the twelve.** Both would make the list a function of answers, which
makes the sequence state, which is the spine change #360 correctly refused to be. A mid-session facet
change would also let a confirmed vector drop a question already answered, leaving an answer in
append-only `answers.jsonl` against a question no longer in the walk.

**A facet the person got wrong is fixed by a new run, not an amendment.** No recorded decision is amended
anywhere in this epic (PRD §Door check) and this is not the exception.

**Wrong if:** run 1 reaches question twenty and the owner realises a facet is wrong. Then declaration is
too early after all, and the answer is not mid-session mutation but **append-only extension** — a
confirmation point that can only add a module to the tail, never remove one. That is a real ticket; it is
not built on speculation.

---

## D4 — The metric: "Asked what mattered"

None of §Success metrics' eight rows measures whether the questions asked were the right ones for the
product. Completion measures reaching a PRD; twelve-set coverage guards it against a shrunken bank; Not
a form measures consecutive empty turns. All three are satisfied by a session that asks thirty
well-formed irrelevant questions. **#293's close-out is silent on question relevance unless this row is
added**, and it is added here.

| Metric | Target | How measured | Cobra check → guardrail |
|---|---|---|---|
| **Asked what mattered** | _No target — reported, not passed._ Decision rate on the facet-selected tail, against decision rate on the twelve | Both computed from `transcript.jsonl`: a turn closed by `record_decision` counts; `flag_weak_answer` and `open_question` do not. Read on `full-discovery` runs only | A selection that picks only easy questions scores well → reported beside twelve-set coverage, the not-a-form counter (both #285) and **the facet modules the person dropped at intake overflow** (D1a). A module dropped by the person is the strongest single signal that it was not worth its budget |

Precedent for reported-not-passed is **Marginal reach (run 1)**, which sets no target for the same
reason: the number is an observation, and a target on it invites tuning the bank to the number.

**n = 1 in wave 1.** Run 1 is regulated, full depth — one vector, one reading, no comparison. The reading
that means something needs a second, faceted `full-discovery` run on a different vector, which no ticket
yet schedules — #338's Run 0 is unbranched. #293 records this row as **"not yet tested"** for the three
unexercised facets rather than inventing a proxy, which is the same call it already makes on Switch.

**Wrong if:** the tail's rate tracks the twelve's regardless of which facets fired. That says the facets
select nothing — and it would have been equally true of the four buckets, which is why no ticket before
this one would have caught it.

---

## D5 — #360 folds into #285's AC2 and is closed

**Decided:** option A of the two #360 offered. #360 is closed as folded, not as wrong.

**What folds** — every constraint it argued, all of which survive the reframe and none of which #285
carried:

- **Totality over all four depths**, with an unbranched depth answering today's list for every facet
  value and for the absent case (D1b).
- **The stable prefix, proven per depth, never "for every depth"** — `full-discovery`'s first twelve are
  `OPENING_SET`'s order under every vector; `whole-bank`'s first twelve are source order and would fail
  an unscoped version of the check for a reason that is not a defect.
- **Which depths branch at all**, answered outright: `full-discovery` only.
- **`discoveryConfig()`'s `count`** is branch-dependent before a vector exists, so the config route
  states the **unfaceted** count and says so, rather than reporting a number the vector will move.
- **The pinned refusal is replaced, not deleted.** Group 30 case 16's *"a non-null branch must be refused
  naming #283"* (`tooling/build-checks.mjs:6524`) becomes the acceptance rule for a facet vector; the
  eight-guard source pin at `:6537` keeps a guard for it; the group summary string stops advertising
  *"openSession's five refusals (… non-null branch)"*.

**What does not fold:** `inferBranch(answers, ops)` and its confidence / `because` / multi-branch
reporting. Under D1 a product is not one branch with a confidence, it is a vector the person states.
Multi-branch stops being a case to report and becomes the ordinary shape.

**Rebase is not the alternative.** #360 argued *"land #285 first and rebase this onto it"* on the
assumption that #285's wiring survives. It does not: `branch` stops existing as a parameter (`openSession`,
`run.json`, `discoveryConfig`, the drawer, three build-checks pins). #285's AC2 is **rewritten** — a
vector, not a value — rather than extended, so there is nothing to rebase onto.

---

## What this amends

**#283 — bank width.** Retitle from *four product-type branches* to *facet modules*.
- AC1: five facet modules, each returning bank ids in order with its own declared budget, replacing
  "four branch selectors". Selection, never new question text, unchanged.
- AC4: the AI-interaction module fires on `facets.hasModel` — a declared value, not a predicate over
  answers. #283's own precedent argument holds and gets simpler: there is one mechanism, not two.
- New AC: a `replacesAProcess` module carrying the transition-requirements tail MVP 10 already requires.
- New AC: the four PRD names ship as presets over the vector.
- AC5: group 28 extends to the facet modules and to D1b's totality — the absent and empty cases driven
  explicitly against all four of today's lists.
- AC6: the known-debt line in `discovery/README.md` is now *four unexercised facets*, not three branches.
- **Unchanged:** the non-functional block, C2/C3, the HAX/PAIR primary-source attribution, ~30.

**#285 — session rules.** AC2 rewritten: *"the facet vector resolves through the bank's own modules —
the session module holds no second copy"*, plus D1a's overflow confirmation, D1b's totality, the stable
prefix per depth, and the unfaceted config count. Depth stays agent-proposes / human-confirms. D5
escalation, both metric counters and twelve-set coverage are untouched — they are depth, and this doc is
width. **Drops:** every mention of `branch` as a scalar.

**#288 — portal width.** The session-start control grows one field: the facet vector as five checkboxes
with four preset buttons, beside depth and provenance. The overflow message (D1a) is part of it.

**#293 — close-out.** One more row in the metric read: *Asked what mattered*, reported not passed, with
"not yet tested" permitted for the unexercised facets.

**The PRD.** A §Amendments entry: MVP 4's four names survive as presets over an orthogonal facet vector;
MVP 5's depth table is unchanged; §Success metrics gains the row in D4. The MVP list, the thesis and the
non-goals stand as written.

**The architecture doc.** §Missing pieces' *"the session module (cursor, depth ladder, branch selection,
…)"* reads **facet selection**, and a link to this doc.

**#360.** Closed as folded, with a comment naming this doc and §D5.

---

## Slices

| | Ticket | What it is |
|---|---|---|
| S1 | amend **#283** | Facet modules replace branch selectors, per the list above. No new ticket — the body is edited before it is planned |
| S2 | amend **#285** | AC2 rewritten, the four folded constraints from #360 added, `branch` dropped |
| S3 | amend **#288** | One control: five checkboxes, four presets, the overflow message |
| S4 | amend **#293** + the two epic docs | The metric row, the §Amendments entry, §Missing pieces, the reverse links |
| S5 | close **#360** | Folded into S2, with the comment |

**S1, S3, S4 and S5 landed with this doc, 2026-09-02** — #283's body rewritten and retitled, #288 and #293
amended by comment, the PRD's metric row and §Amendments entry written, the architecture doc's header link
and §Missing pieces updated, #360 closed. **S2 landed as the ticket edit only**: #285's body carries the
rewritten AC2 and the four folded constraints, and the code it describes is unwritten. So the remaining
work is the ordinary one — plan and build #283, then #285, then #288.

Order: S1 before S2 (the modules exist before the session resolves them) — the dependency #285 already
records. S3 after S2. **No new ticket is created by this doc**, which is the test that it decided rather
than expanded.

---

## Deferred, with the gate hole named

**A classifier posture.** A one-shot SDK call with its own prompt surface and its own `POSTURES` entry
could read the twelve and *propose* a facet the person did not tick. It would not move
`POSTURES.think.fingerprint` (which hashes `buildThinkTurn` + `THINK_MODEL` only), so the graded fixtures
would survive it — the constraint #360 assumed was fatal is not, and this is why. **The reason it is
deferred is the gate, not the fingerprint:** build-checks is statically SDK-free and runs where
`portal/node_modules` does not exist, so it can drive the validator of the classifier's output and never
the classifier. That is a check that cannot fail on the part that matters. It is worth building only
after the second, faceted `full-discovery` run shows a person getting a facet wrong, and it would then
carry the gate hole in its own body.

**Not-applicable parking as a relevance signal.** A person marking a question "does not apply to my
product" is a cleaner relevance metric than D4's decision rate. It is expressible today as
`open_question` with a reason, but the reason is free prose so the read is not pure; making it pure needs
a param on `open_question`, which is the op-verb lock's neighbourhood (`PARAMS`, the switch, group 29,
group 31). #347 set the precedent for a param amendment under the lock, so this is a cost rather than a
prohibition. Revisit if D4's rate proves too coarse.

**A rung between full discovery and the whole bank**, for a product ticking three or more facets — D1a's
own wrong-if. It changes the depth menu, which group 28 pins by name.

---
*Decided 2026-09-02 against epic #279's PRD (MVP 4, MVP 5, §Success metrics) and its architecture
(§Recommended approach — approach C, "the server owns cursor, depth and branch"). Tickets read: #283,
#285, #360. Code read: `discovery/bank.mjs`, `portal/lib/discovery.mjs`, `tooling/build-checks.mjs`
groups 28 and 30. No implementation plan here — those are per-ticket, with `piv-plan-implementation`.*
