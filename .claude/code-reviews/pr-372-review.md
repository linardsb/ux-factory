# Code review — PR #372: the portal's width (#288)

**Head** `6571ac547fa15a14b2fbf9105fe852bdc9db6bbb` · **Base** `main` @ `7267b75ec12ff8e5c42bf3f9cb0b0215f13cf794`
**Round** 1 (no prior review report) — the guarantees pass is skipped: the base has not moved under this PR.
**Reviewer** `/piv-review-pr`, fresh context + the `code-reviewer` agent.

## Recommendation

**Approve.** No critical or high issues. Validation is green on all three CI legs, every re-derivable figure in
the PR body and the implementation report holds under independent re-derivation, and five of the twelve claimed
red-able mutations were reproduced from scratch. Nothing in the shipped `ops.mjs` / `discovery.mjs` / `portal.js`
/ `portal.css` code is wrong.

One **Medium** (F1) is a latent defect in one of this PR's *own new gate cases* — sound today, but one fixture
edit away from being unable to fail. It is a two-line change to a file already in this diff and worth taking in
this PR rather than after; it does not block the merge.

## Validation (observed, re-run at this HEAD)

| Leg | Command | Result |
|---|---|---|
| build-checks | `node tooling/build-checks.mjs` | **exit 0** · `build ✓ all 34 groups pass` |
| drift-check | `node tooling/drift-check.mjs` | **exit 0** · `✓ syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay` |
| token-lint | `node tooling/token-lint.mjs` | **exit 0** · `✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| portal smoke | `PORT=4793 node server.mjs` | `/api/health` **200**, `bootSha 6571ac54…` equal to HEAD, `stale:false` |

Visual-regression and the journey drivers were correctly **not** run: `git diff --name-only 7267b75..6571ac5`
touches nothing outside `.claude/`, `portal/`, `tooling/` and `discovery/`, so no shipped page changed and the
portal is in neither set. `drift-check` green covers the `loc-summary` / `param-count` half.

## The numbers pass

Every figure in the PR body and the report was re-derived independently at this HEAD. **All of them hold.**

| Figure claimed | How I re-derived it | Verdict |
|---|---|---|
| `10 files changed, 2348 insertions(+), 36 deletions(-)` | `git diff --stat 7267b75..6571ac5` | ✅ exact |
| `flow 3 \| facetPlans 33 \| modules 5` (+ `variants 1`) | drove `discoveryConfig()` in Node **and** off the live route | ✅ both |
| `POSTURE_FLOW` order 1 Think · 2 Create PRD · 3 Grill | drove the table | ✅ |
| presets: regulated **22** · b2b-saas **22** · internal-tool **28** · consumer **16** of 30 | `selectDepth('full-discovery', preset.facets).length` per preset | ✅ all four |
| unfaceted full discovery = **30** | `selectDepth('full-discovery', null).length` | ✅ |
| `AI interaction (7), Regulated (6) fits (29 of 30); Internal (6) does not` | `facetPlan({hasModel,regulated,internal})` → `count 29, budget 30, fits [hasModel,regulated], overflow [internal]`; `MODULES` budgets 7/6/6 | ✅ every term |
| `facetKey` bit order — "the 10000 row" | `facetKey({hasModel:true,…})` → `10000`; `facetPlans[facetKey(v)]` deep-equals `facetPlan(v)` | ✅ round-trips |
| ledger `{record_decision:12, flag_weak_answer:0, open_question:0, file_evidence:3}`, flags `{no-evidence:10, orphan:0}`, total **15** | `ledgerView` over `instrument-loans-1`'s transcript, **and** off `GET /api/discovery/session` | ✅ both |
| the projection's own Ledger line agrees | `projectPrd(readPackage(root))` → `15 op(s): record_decision 12 · flag_weak_answer 0 · open_question 0 · file_evidence 3 · flags: no-evidence 10 · orphan 0` | ✅ the two readers agree |
| POST `scope-check` → **409** · `opening-set + {regulated:true}` → **409** · `opening-set` → **200** | three live POSTs against the running portal, correct `Origin` | ✅ all three, messages verbatim |
| "the committed package is byte-untouched" | `git status --porcelain discovery/` after the smoke | ✅ empty |
| "the group count stays 34, `CLAUDE.md` not touched" | `grep -c "34 PURE groups" CLAUDE.md` → 1; `CLAUDE.md` absent from the diff | ✅ |
| `Closes #288` in the PR **body** | `gh pr view 372 --json body` line 170 | ✅ (CLAUDE.md's hard requirement met) |

**Provenance labelling is correct throughout.** Nothing derived sits under an "Observed" heading. Two figures
deserve explicit credit for the honest framing the numbers pass is looking for:

- **AC #5's `[]`.** The PR body reports *both* numbers — `sub-44 by the hit target: []` **and** `six elements
  measure 22×22 by their own box` — and names the definitional choice (the `.discovery-check` label is the hit
  target) that makes the first one true. A bare `[]` would have been the misleading figure. This is the right
  shape for a measurement whose result depends on what you measure.
- **The un-run live turn.** Labelled `Not run, deliberately` rather than folded into the observed block, with
  the structural substitute stated. I verified that substitute independently: `renderDiscoverySession()` — which
  calls `renderPackageView()` — sits in the submit handler's `finally`, after `discovery.session` is re-read from
  disk (`portal/public/portal.js`, the `#discovery-form` submit handler). The argument holds.

### The mutation table, spot-checked

The PR claims 12 mutations, each proven to redden a specific case. Source-pinning cases (41, 42) are regexes over
source text, which is this repo's known "check that cannot fail" shape — so I reproduced **five rows from
scratch**, covering both source pins and both correctness-critical cases:

| Mutation I applied | Case | `build-checks` result |
|---|---|---|
| `latest: true` unconditionally in `ledgerView` | 29 / 28.10 | **exit 1** · `build ✗ 3 failure(s)` |
| `resumeMismatch` compares the RAW posted `facets` instead of `declareFacets(…)` | 30 / 37 | **exit 1** · `build ✗ 4 failure(s)` |
| deleted `if (mismatch) return json(res, 409, …)` from the session POST route | 30 / 40 | **exit 1** · `build ✗ 1 failure(s)` |
| changed the Start refusal to `if (plan.overflow.length)`, ungating it from `composes` | 30 / 41 | **exit 1** · `build ✗ 1 failure(s)` |
| dropped `min-width: 44px` from `#discovery-drawer .btn` | 30 / 42 | **exit 1** · `build ✗ 1 failure(s)` |

All five restored; `git status` clean afterwards. **The table is not hollow** — including the two greps, which
were my main suspicion going in.

### `ledgerView`'s four header claims, driven

The header states four rules a future editor must keep. I drove each of them directly rather than trusting the
gate:

| Claim | Driven | Result |
|---|---|---|
| "Every array is COPIED, never aliased" | pushed into `decisions[0].evidenceRefs` and `.flagged`, re-stringified the input | input unchanged ✅ |
| pure | two calls on the same input, deep-equal and distinct array identities | ✅ |
| "TOTAL OVER JUNK" | 16 shapes — `null`, `undefined`, `0`, `''`, `'x'`, `{}`, `[]`, `[null]`, `[{}]`, `[{op:'nope'}]`, a record with `params:null`, a record with a non-string `question_id`, … | **0 throws** ✅ |
| "NOTHING IS DROPPED: a superseded record is MARKED and still rendered" | a two-record superseding ledger | both kept; seq 1 → `latest false` / `supersededBy 2`, seq 2 → `latest true` / `supersedes 1` ✅ |

### The mirror claim, checked at the seam

`ledgerView` claims to **mirror** `prd-projection.mjs`'s visible/supersede rules without importing them. Read
side by side, the mirror is exact:

- `latestByQuestion` — both set last-wins per `question_id`, both skip `null`; `visible` / `latest` are the same
  predicate (`qid === null || latestByQuestion.get(qid)…seq === seq`).
- `supersededBy` — both invert `supersedes` into `replaced seq → replacing seq`. `ledgerView` guards on
  `!== null && !== undefined` where the projection guards `!== null`; that is a superset, and safe.
- flags counted over the **whole** ledger in both.

The one edge worth tracing by hand is an **off-script decision that carries a `question_id`** — the applier
permits it (`off_script` and `question_id` are independent fields, `discovery/ops.mjs:282`). `indexOps`
(`prd-projection.mjs:434-441`) keys `visible` purely on `question_id !== null` and never on `off_script`, and
its own comment says so. `ledgerView` does the identical thing. Both readers land on the same answer because
both independently made the choice the applier's own `supersedes` computation already makes. No divergence.

**Where they stop agreeing, named as the skill asks:** exactly on the ledgers `checkOpLines` *refuses*. Two
concrete cases, both real:

1. **Two records claiming the same `supersedes` seq.** `checkOpLines` (`prd-projection.mjs:368-370`) throws
   ("one record is replaced by exactly one other"). `ledgerView`'s map (`ops.mjs:141-142`) is last-write-wins
   and does not throw — the overwritten claimant renders `latest: false` with `supersededBy: null`.
2. **Duplicate `seq` values.** `checkOpLines` (`prd-projection.mjs:299-300`) throws ("seqs are strictly
   increasing"). `ledgerView` has no such check; two decisions sharing a seq on one question could both read
   `latest: true`.

Both are **structurally impossible through the write path**: `supersedes` always comes from
`state.ops.findLast(…)` (`ops.mjs:278`), which by construction points at the record about to become latest, and
`seq = state.ops.length + 1` (`ops.mjs:336`) is strictly monotonic. No `transcript.jsonl` `openSession` or
`runTurn` writes can express either state, and no fixture the gate can hold can express it either — so this is
the seam the skill asks to be named rather than an actionable defect. `ledgerView`'s header would be stronger
for one line acknowledging it, the way `checkOpLines`' own comments explain why *it* guards against them.

The committed half of that cross-reader case is worth one caveat for a future reader: `instrument-loans-1`
carries **12 decisions, 12 latest, 0 supersedes**, so it exercises no supersede at all. The synthetic
superseding fixture in case 28.10 is what carries that half of the claim — and my `latest: true` mutation
producing **3** failures rather than 1 confirms it is live.

## Findings

**Critical 0 · High 0 · Medium 1 · Low 7 · nit 1.** Nothing blocks the merge; the Medium is a gate defect, not
a production one, and today's fixture does not trigger it.

### F1 (Medium) — `tooling/build-checks.mjs:5946`: the cross-reader `blocks` count can be made unable to fail

```js
const blocks = (md.match(/^#### seq /gm) || []).length;
ok(blocks === lv.decisions.filter((d) => d.latest).length, …);
```

That regex is not scoped to decisions. **Three** renderers emit a heading starting `#### seq N`:
`renderDecision` (`prd-projection.mjs:467`), `renderOpenQuestions` (`:596`) and `renderWeakAnswers` (`:612`).
`blocks` therefore counts open-question and weak-answer headings as decision blocks.

**It is sound today** — the `SUP` fixture holds three `record_decision`s and nothing else, and my `latest: true`
mutation reddened this case (3 failures). The defect is **latent, and triggered by a fixture edit**. I built the
scenario and ran it:

> fixture = 2 decisions on one question (seq 1 superseded by seq 2) + 1 `flag_weak_answer`
> `blocks` = **2** (1 decision heading + 1 weak-answer heading) · true decision headings = **1**
> · correct `filter(latest).length` = **1** → `2 === 1` **false → RED on correct code**
> · with the `latest: true` regression, `filter(latest).length` = **2** → `2 === 2` **true → GREEN, the
>   regression ships undetected**
> the anti-vacuity guard `blocks < lv.decisions.length` also goes **false** (2 < 2) — a second spurious red.

So the failure mode is worse than a silent hole: adding any weak-answer or open-question op to the fixture makes
the gate go red on **correct** code, twice. A maintainer chasing that red on code they know is right will reach
for the assertion — and the edit that makes it green again is exactly the one that also makes the `latest`
regression invisible. This is the repo's own "check that cannot fail" shape, one fixture edit away.

The second cross-reader block (against committed `instrument-loans-1`) does not check `blocks` at all, and that
package has `flag_weak_answer 0 · open_question 0`, so it cannot cover this either.

**Fix (one line, in a file already in this diff)** — scope the regex to the heading only `renderDecision`
emits, since only a decision heading ends in a ladder level:

```js
const blocks = (md.match(/^#### seq \d+ · .* — (business|stakeholder|solution|transition)$/gm) || []).length;
```

I verified this returns **1** on the scenario above, which is the correct decision count. (A format-independent
alternative: assert the seq *set* — every latest seq's heading present, every non-latest seq's absent — since
seqs are unique across all four op types.)

### F2 (Low) — `.claude/references/gates.md:51`: #288's paragraph is detached from its group

The new entry is a **standalone paragraph** between Group 30 (line 49) and Group 31 (line 53), opening
`#288 added THE WIDTH:` and naming no group. Every other per-ticket fragment in this file lives *inside* its
group's paragraph — group 30's own line 49 carries `#341 added to it:`, `#347 added:`, `#349 added:`,
`#287 added`, `#359 added`, `#352 added`, `#285 added` and `#286 added` exactly that way. A reader looking up
"what does group 30 prove?" reads line 49 and never reaches it; a reader scanning down attaches it to Group 31.

This also makes one sentence in the report and PR body imprecise: *"group 29 and group 30 entries extended"*.
Group 29's entry **was** extended (the diff shows a `-`/`+` pair on its line); **group 30's paragraph is
byte-unchanged** and a detached paragraph follows it.

**Fix:** fold line 51 into line 49's paragraph, or prefix it `Group 30 — #288 added THE WIDTH:`.

### F3 (Low) — `portal/public/index.html:194-196`: the "hidden is a no-op" rationale is false on this page

The new comment says:

> The buttons are DISABLED once a session is open, never hidden: `.btn` is display:inline-flex, so `hidden` on
> one is a silent no-op.

`portal/public/portal.css:57-61` disproves it, and its own comment names *this exact case* as the bug it fixes:

```css
/* Any author `display` beats the UA's [hidden] rule, and this page hides things that carry one —
   `.btn` is display:inline-flex, so `el.hidden = true` on a button is a silent no-op. […] this
   generalises them so the third case cannot ship broken. */
[hidden] { display: none !important; }
```

That rule is unscoped, so `hidden` on a `.btn` **works** here. The new comment reproduces the first half of that
two-part comment and drops the fix.

No runtime effect — disabling is the right choice anyway, and better for assistive tech than making a step
vanish. The cost is downstream: a future editor believes `hidden` is broken here and writes a workaround, or
concludes `portal.css:61` is dead and prunes it.

**Pre-existing twin:** `portal/public/portal.js:1020-1021` (#359) carries the same false claim
(*"`el.hidden` is a no-op wherever a CSS rule sets display and this drawer sets plenty"*). Not this PR's to fix,
but this PR adds a **second copy**, and CLAUDE.md §Ground rules is against a fact living in two places. Worth
correcting both now that both are known.

**Fix:** state the true reason — e.g. *"Disabled rather than hidden: `[hidden]{display:none!important}`
(portal.css:61) makes hiding work here, but a vanished step 2 would erase the flow this band exists to teach."*

### F4 (Low) — `portal/lib/discovery.mjs:867`: `facetKey({})` maps to the wrong plan row

`facetKey({})` returns `"00000"` — every key reads `undefined`, each coerced to `'0'` — which is the **declared
all-false** row (the consumer preset, 16 questions). But `facetPlan({})` treats a zero-key object as **no
vector** (undeclared, 30 questions). Driven:

| input | `facetKey` → row | `facetPlan` truth | |
|---|---|---|---|
| `{}` | `"00000"` → count 16, declared **true** | count 30, declared **false** | ❌ disagree |
| `null` | `""` → count 30, declared false | count 30, declared false | ✅ |
| `undefined` | `""` → count 30, declared false | count 30, declared false | ✅ |

**Unreachable today**: the only caller, `declaredVector()` (`portal.js:728-732`), returns either exactly `null`
or a full five-key object, never `{}`. The browser's `facetKeyOf` (`portal.js:738`) has the mirror-image gap —
it checks only `v === null`, not `undefined`, where the server's `facetKey` checks both. Neither is a live bug;
both become one the moment either function gains a second caller.

**Fix:** make `facetKey`'s guard match `facetPlan`'s own — treat an object with no own keys as `''`.

### F5 (Low) — `portal/public/portal.js:1080-1107`: six `seq ${…}` interpolations skip `esc()`

In `renderPackageView`: `seq ${r.seq}` (`at()`, 1080), `seq ${n}` (`refs()`, 1081), `seq ${d.supersededBy}`
(1088), `seq ${d.parentId}` and `seq ${d.supersedes}` (1090), `seq ${e.claimRef}` (1107) go into `innerHTML`
raw, while every sibling interpolation on the same lines uses `esc()`.

**Not exploitable as written.** `ops.mjs`'s `earlier()` enforces `Number.isInteger` on `parent_id`,
`evidence_refs[]` and `claim_ref` before recording, and `seq` is `state.ops.length + 1` — integers by
construction for any package the applier wrote. Worth a line anyway because `ledgerView` is *deliberately* total
over junk and `sessionView` reads the transcript verbatim off disk: the one surface built to survive a malformed
record is also the one that stops escaping.

**Pre-existing twin:** `portal.js:1052` (`renderDiscoveryRecorded`) already interpolates `seq ${o.supersedes}`
the same way, so this PR follows a local pattern rather than inventing one.

**Fix:** wrap the six in `esc()`, or say in `renderPackageView`'s header that these are applier-assigned
integers and why that is load-bearing.

### F6 (Low) — `portal/public/portal.js:838` and `:922`: the `btn.disabled` guard is inert

Both delegated click listeners guard with `if (!btn || btn.disabled) return;`. The `.disabled` **IDL property
does not reflect a disable inherited from an ancestor `<fieldset disabled>`** — only `:disabled` and native
click dispatch do — and these buttons never get `disabled` set on themselves. The guard is dead code for the
case it appears to cover. Harmless: the browser refuses to dispatch `click` on a fieldset-disabled descendant
before any JS runs, which is what actually protects the post-Start state. The PR's own report already notes
this IDL/pseudo-class distinction, so the guard reads as if it were relying on the half that does not work.

### F7 (Low) — `portal/public/portal.js:834` and `:1014`: two independent writers to `#discovery-flow-note`

`renderDiscoveryFlow()` writes the form-state message; `renderDiscoverySession()` writes the disk-state message
("This run is recorded at step N…"). Post-Start correctness holds only because every trigger of the former lives
inside the `#discovery-start` fieldset that gets disabled — true today, not structurally guaranteed. A control
added outside that fieldset, or a trigger moved, would silently flip a live session's note back to form text.

### F8 (Low) — a faceted resume costs one refused round trip after a reload

`discovery.vectorDeclared` resets to `false` on page load and the checkboxes clear, so `declaredVector()`
returns `null`. Resuming a run that recorded a vector therefore always 409s once before the operator can retype
it. Correct per D1b and the 409's whole point, and the message *names* the recorded vector, so recovery is
guided. Recording it as a consequence — it belongs with **Q2**, not as separate work.

### F9 (nit) — `portal/public/portal.js:947` and `portal/lib/discovery.mjs:746`: `bank.mjs:1098` is off by one

Both cite `bank.mjs:1098` as `selectDepth`'s own condition. Line 1098 is `const plan = facetPlan(facets);`; the
condition is 1099 and the throw is 1100-1101. Close enough to land a reader in the right function, but line
citations rot.

## Documented deviations — checked, not counted as issues

All six deviations in the report are genuine intentional decisions, and each is defensible:

1. **Q1 deferred to #289** — correct. `/api/discovery/turn` takes a banked `questionId`; an off-script input has
   nowhere to POST. Deferring the surface with its filing rules is the right cut.
2. **Q2 — the 409 compares depth and vector only** — correctly held open for the owner rather than decided in
   the plan. `resumeMismatch`'s comment names the gap by name. **This is the one open decision on this PR.**
3. **Think-on-Opus as a variant checkbox** — consistent with MVP 1's "three buttons"; the same `buildThinkTurn`
   on another model is a comparison, not a stance.
4. **Layout order in `index.html`** — a `<fieldset>` genuinely cannot sit in that grid row. I verified the thing
   the deviation actually depends on: `#discovery-start` **is** a `<fieldset>` (`index.html:159`), so
   `$('#discovery-start').disabled = true` propagates natively to all thirteen new controls.
5. **No per-control disable loop** — follows from (4). Correct, and the plan's own GOTCHA sanctions it.
6. **Case 39 doubly guarded** — kept with the reason stated rather than silently removed. The right call; the
   case as a whole is red-able by a different mutation.

Deviation 7 (the plan's `applyOps` argument order was wrong) and 8 (case 11 extended rather than a new case)
are corrections to the plan, recorded. Nothing undocumented was found.

## What's good

- **The fold lives where the gate can reach it.** `ledgerView` in `discovery/ops.mjs` rather than inline in the
  browser is the load-bearing decision of this PR, and the header says exactly why: *"a fold written inline in
  the browser is a claim-generating surface no gate can reach."* The drawer recomputes nothing — verified by
  reading `renderPackageView`, which reads `session.ledger` and derives no count, no chain and no flag.
- **Mirror-not-import, with the reason.** Importing `prd-projection.mjs` would have dragged the bank into
  `ops.mjs` and broken invariant 6 (CI loads it with no `portal/node_modules`). Mirroring instead, and then
  making the gate *compare the two readers on a real package*, is the right trade correctly paid for.
- **The 33-row lookup table.** Refusing to re-implement D1a's greedy walk in the browser, and citing
  `facetPlan`'s own warning that `fits` is not necessarily a prefix of `fired`, is exactly the discipline that
  prevents the second-copy drift this epic keeps guarding against. The one derived line (the bit-key join) is
  built from `config.facets`, and I confirmed `config.facets` is in `FACETS` order, so the key round-trips.
- **The `composes` gating.** The Start refusal matches `selectDepth`'s own condition rather than being wider.
  A wider refusal would have rejected a legal scope-check session the server opens happily — a subtle call, made
  correctly, and pinned by a gate case I proved can go red.
- **The 409 placed after `openSession`.** Every one of `openSession`'s guards refuses junk by name first, so a
  bad depth still gets the bank's own error rather than a confusing conflict. Source-pinned by case 40.
- **`resumeMismatch`'s normalised comparison.** I drove it over ten shapes: `{}`/`null`/`undefined` all read as
  no vector; a five-key preset agrees with the same vector spelled with one key; a declared all-false vector is
  correctly *distinguished* from no vector and says so in prose; junk heads return `null` rather than throwing.
  And the create case genuinely cannot fire — `writeRun` stores `facets: declareFacets(facets)`, the same
  function `resumeMismatch` recomputes with.
- **Token discipline holds.** Every new rule in `portal.css` uses semantic tokens; the only literals are geometry
  (`44px`, `22px`, `1px`, `0.6`). `token-lint` green.
- **The 409's client handling is right.** `api()` throws on the 409, the Start handler's `catch` renders
  `Refused: ${err.message}` via `.textContent`, and because the throw happens inside the awaited expression,
  `discovery.session = await api(…)` never runs — a refused resume cannot clobber the session state the client
  already held.
- **Event delegation done correctly.** All three new listeners bind once to stable parent containers
  (`#discovery-flow`, `#discovery-presets`, `#discovery-facets`) and survive `innerHTML` regeneration; no
  duplicate-binding risk. And the dead `#discovery-posture` listener was removed rather than left to throw at
  module scope and take the whole SPA down.
- **Honest about what no gate reaches.** `gates.md`'s new `*Cannot reach:*` clause names the drawer's rendered
  geometry and D2's wrong-if, rather than letting the group's ✓ imply more than it proves.

## For the owner

- **Q2 is the one decision waiting on you** — whether the 409 widens to `entryMode` and `posture`. Two lines plus
  one gate case either way. Nothing blocks the merge on it. One extra shape of the risk, beyond what the PR
  names: a **blank-idea** POST resuming an **existing-prd** session at the same depth and vector returns 200
  silently. The drawer itself renders correctly — `renderDiscoverySession` reads `entryMode` off the *returned*
  session, not the posted one — so this is a sharper statement of the same open question, not a new defect.
- **The owed paid turn.** No live SSE turn ran on this branch. AC #3's surface is verified structurally in both
  blank-idea and audit modes and the package-view refresh path is verified by reading the handler, so this is
  not a merge blocker — but it is an owed observation of the same kind #370 tracked for #286. Worth a follow-up
  ticket rather than a re-run gate.
- **No committed `existing-prd` package exists**, so the audit surface has no fixture. A future ticket that wants
  one should know.

---

Validation green · **0 critical · 0 high · 1 medium · 7 low · 1 nit**. **Approve.**

Recommended before merge (optional, both cheap): **F1**'s one-line regex scope, and **F3**'s comment correction.
Everything else is a note for the next editor.
