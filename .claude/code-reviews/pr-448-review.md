# PR #448 review — the IR, the Brilliant converter and the deterministic matcher (#304)

**Head** `8a4afa2` · **Base** `main` @ `d04faac08bbd10b802ecf5c3805c55a10811d27e` · **Round** 1 (no prior report — guarantees pass skipped, base unmoved)
**Reviewer**: `piv-review-pr` (fresh context) + the `code-reviewer` agent · **Recommendation**: request changes

## Summary

Three Node-only modules under a new `import/`, a 15-case gate group, and the doc entries that go with them. Much
of the work is very good: the module headers are specification-grade rather than decorative, the drop taxonomy is
derived from a single fold that throws on an unclassified kind, and case 40.5's **source census** — reading every
`kind` literal out of `import/*.mjs` instead of iterating the table it is meant to check — is the right answer to
the repo's recurring "a check that cannot fail". The directory sweeps that replace three hardcoded filenames are
the same instinct applied twice. Validation is green on every gate in reach.

The findings split in two.

**Prose against code.** F1 states the margin that justifies the whole `stack`-exclusion decision **backwards**, in
the gate's own failure message. F6's module header claims a behaviour the entry point does not have. F12 and F5
describe reach the group does not have.

**And three places where the gate cannot see a break** — each proven by mutating a throwaway clone and running the
real `node tooling/build-checks.mjs`, not by reading the code. A total breakage of `build()`'s `list` path, a
silently mis-sourced prop, and a source text that vanishes with no drop row all leave **all 40 groups passing**.
That is this repo's own named defect class, in a group written specifically to avoid it.

Method note: the `code-reviewer` agent worked in an isolated `git clone --local` under `/private/tmp`. Its three
load-bearing mutations were **re-run and reproduced independently** before being written up here; the two I drove
in the primary tree were reverted and the tree verified clean each time (see Validation).

## Findings

### F1 · High — the R2 justification is reversed in the gate's own failure message
`tooling/build-checks.mjs:12145`

Case 40.14's message ends: *"as a candidate its always-fillable `direction` takes kind-fit + prop-fit on every
laid-out node and **the committed chip clears it by 0.025**"*.

Re-derived at this head by putting `stack` back in the contest and scoring the committed "Status chip" node
(`ir.children[0].children[2]`) through the real `scoreNode`:

```
stack          score=0.6    hits=kind-fit:layout | prop-fit:direction | child-fit:children
status-chip    score=0.575  hits=name-match:name | prop-fit:label
```

**`stack` wins by 0.025.** The chip does not clear it — it loses to it, and the ticket's own recognition case is
what the exclusion saves. The PR body has this right and says the plan's hand trace had it backwards; the
correction reached the PR body and not the gate.

Why High rather than cosmetic: this sentence is what a future reader meets **at the moment they are considering
putting `stack` back in the scored set**. Read as written, it says the exclusion is tidiness — the chip would win
anyway — which is an argument *for* removing R2. `recognise.mjs`'s R2 header predicts this reader by name ("A
LATER READER WILL WANT TO 'FIX' THIS"), and the gate message hands them the wrong number to do it with.

**Second home, same confusion.** `import/recognise.mjs:34` says the defect R2 prevents *"is invisible on the
committed fixture"*. It is not: with `stack` scored, the chip's verdict flips to `stack via scored`, which case
40.1's expected-JSON compare sees — the report's own mutation #15 row records four failures.

**Fix**: lead with the consequence, not the arithmetic — `…and the committed chip LOSES to it by 0.025, so
putting it back costs the ticket's own recognition case`. Then reword `recognise.mjs:34` to say what is actually
invisible: not the flip, but that `stack` is a *plausible* answer for a chip, so the flip reads as a judgement
call rather than as a defect.

### F10 · High — a source text can vanish with no drop row (absorption is text-ANY, not text-ALL)
`import/recognise.mjs:419-422`

```js
const absorbed = new Set(Object.values(out.props ?? {}).filter((v) => typeof v === "string"));
…
if (kidTexts.some((t) => absorbed.has(t))) continue;               // absorbed into a prop
```

A child is treated as fully absorbed — and therefore gets **no** drop row — the moment **any one** of its texts
matches **any** filled prop. Its other texts are neither emitted nor recorded.

**Driven** (observed): a third text `"SURPLUS_MARKER"` inserted beside "Amara Okafor" and "Last seen 2 min ago"
under the real "Text block" node, passed straight to `convert()` — no fixture file touched:

```
SURPLUS_MARKER drop rows: 0  (person row verdict: list-row)
  all drops: unfillable-required-prop@list-row.value
           | no-vocabulary-slot@ir.children[0].children[0]
           | no-vocabulary-slot@ir.children[0].children[3]
```

**Zero rows.** A text present in the source reaches neither a prop nor the loss list, and the count line reads
clean — which is `ir.mjs` invariant 4 verbatim ("A MISS IS RECORDED, NEVER READ PAST… the shape every #137 defect
had") broken by the module that cites it. It fires on any row with more texts than the entry has string-fillable
props: a label + a subtitle + a footnote loses the footnote in silence.

**Fix**: have `propsFor` return the text values it actually consumed, and drop each of the child's *remaining*
texts — not an all-or-nothing per-child skip keyed on "does this child contain any absorbed string anywhere".

### F6 · High — `BUILDERS.list` promises rows that never survive, and the gate cannot see that path at all
`import/recognise.mjs:386-393` (the header) · `:448-451` (`build()`'s closing refusal) · `tooling/build-checks.mjs:12114` (case 40.12)

*Raised from Low after the agent's mutation; the first pass had the behaviour and not the gate half.*

The builder's header says *"the container itself is refused by propsFor and **the rows are what survives** — the
honest answer, recorded, never invented copy."* Through the real entry point, nothing survives.

`build()`'s closing check applies unconditionally, `"list"` included:

```js
const missing = requiredOf(entry).filter(([p]) => !(p in (out.props ?? {})));
if (missing.length) return null;
```

`list.empty` is `required: true` and has no `PROP_SOURCES` row, so it is never fillable. `build()` therefore
computes the wrapper *and* all N correctly-built `list-row` children, then **discards the whole object, rows
included — for any input, always**. Observed: `BUILDERS.list(...)` called directly returns
`{name:"list", children:[3 rows]}`; `build(...)` on the identical verdict returns `null`.

**And the gate cannot tell.** Mutation in an isolated clone at `8a4afa2` — make `build()` throw unconditionally
on any `list` verdict — then the real gate:

```
positive control       build ✓  all 40 groups pass
MUT A (build() throws on any list verdict)
                       build ✓  all 40 groups pass
```

Case 40.12 calls `R1.BUILDERS.list(...)` **directly**; nothing in the file ever calls `R1.build()` with a list
verdict. A total breakage of that path is structurally invisible.

The refusal itself is disclosed in three places and is defensible. What is not disclosed is that the emission
shape the gate asserts is reached by no caller.

**Fix** — the direction is yours, the discrepancy is not optional:
- *(a)* If the rows are meant to survive, exempt a container whose only unfillable required prop is boilerplate
  copy from the blanket `missing.length` refusal (its rows are independently built and validated), **or**
- *(b)* if refusing the whole list is intended, correct the header sentence to say so.

Either way, add a case that calls `R1.build()` — not `BUILDERS.list` — on a list verdict and asserts what it
actually returns.

### F11 · High — no case asserts prop CONTENT, only drop presence
`tooling/build-checks.mjs:12010-12016` (case 40.6)

`fold("build over the person row", () => R1.build(...))` never assigns or inspects its return value. Nothing in
group 40 checks that `label` / `meta` / `status` land the **right** text — only that the avatar and chevron get
drop rows and that `value` is unfillable.

**Driven, with the confounds ruled out.** Breaking `PROP_SOURCES.label`, or swapping `label` ↔ `meta`, *is*
caught — but only as a side effect: `label` also feeds `list-row`'s required-prop count, so case 40.1's whole-tree
diff moves. Isolating that by mutating only the **optional** field, where fillability is unchanged:

```
MUT B  PROP_SOURCES.meta: "second-text" → "chip-text"
       build ✓  all 40 groups pass
```

The person row's secondary line would silently read the status chip's words ("On call") instead of the subtitle
("Last seen 2 min ago"), and the whole gate stays green. The group's detail line claims D5's absorption is
"asserted in BOTH halves"; the half it asserts is the drops, never the props.

**Fix**: one `ok()` in 40.6 asserting the built props against the fixture's own strings.

### F2 · Medium — the node R2 is argued on has no named assertion
`tooling/build-checks.mjs:11899-11918` (case 40.1)

40.1 pins the person row, the container and the label **by path**; 40.3 pins the Chevron. Nothing in group 40
asserts `at(v1, [0, 2]).name === "status-chip"` — yet that node is the subject of F1's margin and of the PR body's
R2 argument.

**Driven, not argued.** I mutated `recognise.mjs:250` to skip `status-chip` as a candidate — the shape of "a
weight moved and the chip fell below 0.5", which sends it to `stack` via the fallback — and ran the full gate:

```
build import-chain   ✗  1 failure(s)
    · the committed verdict and the run disagree
build ✗  1 failure(s)
```

**One failure, and it is the stale-baseline message.** Nothing names the chip, nothing says a recognition was
lost. That is exactly the message 40.1's own comment says it added the `component.name` field assertion to
avoid — the principle applied to three nodes and not to the one the R2 decision rests on. CI still reds, so this
is diagnostic quality rather than a missed regression; but the reader who sees that line will regenerate the
baseline, which is the wrong response and the one the message invites.

**Fix**: one `ok()` beside the other three — `chip.name === "status-chip" && chip.via === "scored"`, with the
margin in the message.

### F3 · Medium — a size lands on `layout` or on `style` by atom ORDER, and double-counts its drop row
`import/brilliant.mjs:462-479`

The `s(` branch is guarded by `sawSize`, a flag the `al(` branch sets; the `al(` branch has no such guard. The
`s(` branch's own comment says *"a size on a node with no `al()` is a canvas measurement"* — but the code tests
**which atom came first on the line**, not whether the line has an `al()`.

Driven on two synthetic lines carrying identical atoms in the two orders (observed, and independently reproduced
by the agent):

```
al-then-s: layout.size={"w":360,"h":"hug"}  style=null
  drops (1): literal-size@size.w=360
s-then-al: layout.size={"w":360,"h":"hug"}  style={"size":{"w":360,"h":"hug"}}
  drops (2): literal-size@style.size.w=360 | literal-size@size.w=360
```

One source atom, **two drop rows** — against the invariant stated twelve lines above `toStack`: *"A drop is
recorded ONCE PER SOURCE ATOM, not once per expanded side… so the unmapped count can be checked against an
independent grep."* The census that comment offers as a cross-check would double-count. The duplicate
`style.size` is inert downstream (`recognise.mjs:327` reads `layout.size` first), so the damage is the broken
promise, not a wrong render.

Latent, not live: both committed fixtures and the gate's synthetic line write `al(` first. It goes live the first
time a source emits atoms in another order — which is what #307's Figma converter is.

**Fix**, driven rather than proposed — `import/brilliant.mjs:453`:

```js
let sawSize = atoms.some((a) => a.startsWith("al("));   // was: false
```

Observed with that one line changed: both orders produce `layout.size={"w":360,"h":"hug"} style=null` and a
single `literal-size@size.w` row, and the gate stays `✓ all 40 groups pass`.

**Read that green run correctly**: the gate passing *both* ways is the finding, not the reassurance. No case
drives a reversed-order line, so the gate cannot tell the two behaviours apart. The fix wants a case beside it —
40.11's synthetic line with its atoms swapped, asserting one drop row and a null `style.size`.

### F12 · Medium — only `stack` and `text` ever survive `build()`, and the description overstates it
`tooling/build-checks.mjs:11958-11970` (case 40.4's `built` sweep) · `:12182` · `.claude/references/gates.md:70`

Printed every node's verdict against its actual `build()` result across both fixtures (observed):

```
spike-c-instance: list-row→NULL  notcovered→NULL  stack→stack  text→text  text→text
                  status-chip→NULL  text→text  notcovered→NULL
spike-c-master:   list-row→NULL  stack→stack  notcovered→NULL  stack→stack  text→text  text→text
                  status-chip→NULL  text→text  notcovered→NULL  stack→stack  …
```

Every `list-row` and every `status-chip` returns `null` — `list-row.value` is an unfillable required prop, and
`status-chip.value`'s enum is `ok|due|overdue` while the fixtures say "On call" / "Active" / "Away". So `built`
holds only the two structurally-driven primitives, and `ok(built.length > 0)` and `ok(f1built !== null)` are
satisfied entirely by those.

Two claims are wider than that:
- *"THE BUILT COMPOSITIONS validated through the real validateComposition"* — true of `stack` and `text` only.
  `validateComposition` is never exercised in this group against a component with a required content prop.
- *"the person row absorbs its label, meta and status into props"* — `propsFor` does fill them, and `build()`
  then discards the object. Nothing that survives carries them.

Neither is a false gate result; both are a reader over-reading a green run, which is the thing `gates.md` exists
to prevent.

**Fix**: assert which names appear in `built`, and say in both prose surfaces that `list-row` and `status-chip`
are expected to refuse on these two fixtures and why.

### F4 · Medium — the new gates.md paragraph swallows group 34's entry
`.claude/references/gates.md:70-71`

The Group 40 paragraph is inserted directly above the existing `PR #364's two review rounds added…` paragraph
**with no blank line between them**, so in rendered markdown group 34's guarantees (`seedProposalStore`, cases
34.1 / 34.12 / 34.14 / 34.15, the propose route's deleted `force`) read as a continuation of the import chain's
entry. The `**Group 40 …**` paragraph opens with a bold run, so the fusion is not visible in the source diff.

That the #364 paragraph is orphaned from its Group 34 home at `:57` is **pre-existing** and not this PR's to fix.

**Fix**: one blank line at `:71`.

### F5 · Medium — the tie-break is in neither prose surface, and "four synthetic cases" is five
`tooling/build-checks.mjs:12182` (the `group()` detail line) · `.claude/references/gates.md:70`

Group 40 ships 15 cases; both descriptions cover 14. The missing one is 40.15 — the three-rung tie-break, the
change made **beyond the plan**, and the rule that stops every unnamed text node reading `demo-notice`, a
fictional demo's honesty chrome.

Checked for paraphrase, not just for the word: neither surface contains **tie · ties · sort · order · ordering ·
specificity · rung · `ds-` · `demo-notice`**. The two hits on `candidate` are both R2's ("appears in NO candidates
list"). The case is described nowhere in either surface, under any of those names. An honesty-contract rule
guarded by three mutations (17–19) has no entry in the reference a future ticket reads before touching this gate.

Same paragraph: *"**Four** cases are synthetic and labelled synthetic in their own failure messages"*. **Five**
carry `SYNTHETIC` in their messages — 40.10 (mode/grain), 40.11 (`args()`), 40.12 (`list`), 40.13 (R3) and 40.15
(the tie-break). The count is short by exactly the case the sentence omits.

**Fix**: one clause in each surface naming 40.15 and its three rungs, and `Four` → `Five`.

### F7 · Low — the mutation-count figures disagree with each other
`.claude/reports/import-ir-brilliant-recognise-304-report.md:11` vs `:33` · PR body §Validation

| source | count |
|---|---|
| report `:11` Summary | "**nineteen** mutations were driven" |
| report `:33` + PR body | "**24** mutations, 24 reddened, 0 silent passes" |
| the table at `:35-58` | **25** (23 rows, `9a–c` being three) |
| "Row counts at the final HEAD" at `:60` | **24** — it omits **#8** (`git add system/probe.mjs` → 40.8) |

So the PR body's *"every row re-derived at this head"* is not what the report's own final-HEAD list shows: #8 is a
table row with an observed message and no final-HEAD row count. The likely reading is that #8 was deliberately
excluded from the scripted runner because it writes to the git index — a good reason, and one that should be
stated rather than left as a missing entry.

**Fix**: reconcile `:11`, and add a clause to `:60` saying why #8 sits outside the re-driven set.

### F8 · Low — `regen-expected.mjs` prints characters and calls them bytes
`import/regen-expected.mjs:39,41,50`

`out.length` is a UTF-16 code-unit count, and the artifact carries `·`, `—` and the typographic minus. Observed:

```
node import/regen-expected.mjs --check  →  … — 52900 bytes …
wc -c import/fixtures/spike-c-instance.expected.json  →  52922
```

The PR body quotes `52900 bytes` under **Validation** as an observed figure. The run is real; the unit is wrong.
**Fix**: `Buffer.byteLength(out)`.

### F13 · Low — `parseTree`'s header skip is positional, and one throw names depth `-1`
`import/brilliant.mjs:564` · `:569`

`if (i === 0 && raw.startsWith("lookup ")) continue;` keys off the raw split index, not "the first non-blank
line". A leading blank line before the provenance line sends it to `readLine`. Observed:

```
leading-blank-line roots: 2  ids=["lookup","abc123"]
  first child: id="lookup" name="(unnamed)" drops=7
```

`checkIr` accepts it silently and `"lookup"` lands in `source.ids` — the provenance the honesty contract turns
on. Separately, `:569`'s message computes `stack.length - 1` unconditionally, so an indented first content line
throws *"indent jumps from depth -1 to N"*. That one correctly refuses; only the wording is off.

**Fix**: key the skip off "nothing on the stack and no roots yet"; special-case `stack.length === 0` in the message.

### F9 · Low — the generator throws instead of generating when the artifact is absent
`import/regen-expected.mjs:38`

`readFileSync(DEST)` runs before the write path, so a tree where the expected verdict has been deleted gets
`ENOENT` from the script whose job is to create it. Trivial today; it matters the day #310's converter wants a
second fixture with the same generator shape. **Fix**: `existsSync(DEST) ? readFileSync(...) : null`, treated as
drift under `--check`.

## Validation

Every row observed at `8a4afa2` in the primary tree.

| command | result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `build ✓  all 40 groups pass` (exit 0) |
| `node tooling/drift-check.mjs` | ✅ `drift-check ✓  syntax · … · group-count` (exit 0) |
| `node tooling/token-lint.mjs` | ✅ `63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| `node import/regen-expected.mjs --check` | ✅ no drift (see F8 on the unit) |
| `node agent-layer/gen-loc-summary.mjs --check` | ✅ `3 groups — no drift` |
| portal smoke, `PORT=4791` | ✅ `/api/health` → `{"ok":true,…,"bootSha":"8a4afa2…"}`, port-scoped kill |
| CI (`gh pr checks 448`) | ✅ verify · visual · codeql · CodeQL · audit · gates-green — all pass |
| Level 5 (journey drivers, pixel gate, morph gates) | n/a — no shipped page, `system/` file, token, live control or baseline changed. Correctly stated as "no surface", not as a skip. |

**Tree state, since findings were proven by editing tracked files.** F2's and F3's mutations were applied in the
primary tree, run, reverted, with `git diff --stat import/` checked empty and the gate re-run green after each.
F6's and F11's mutations were run in a `git clone --local` under `/private/tmp` checked out at `8a4afa2`, with
`build ✓ all 40 groups pass` as the positive control before each and the clone restored after. This is a shared
working directory with sibling sessions live, so every restore was verified rather than assumed. Nothing in the
working tree carries a review edit.

**Re-derived independently, and correct**:

- the vocabulary is **24** entries with none at zero required props (the report's two claims, observed);
- `"List row"` ties `list`/`list-row` at **0.7**; an unnamed text node ties `text`/`demo-notice` at exactly **0.5**;
- group 40 carries **15** case headers, `40.1`–`40.15`;
- the four group-count claims (39 → 40) agree — `drift-check`'s group-count leg proves it, and it is green;
- **both fixtures are byte-identical to their spike-C sources** —
  `diff .claude/plans/design-import-spike-c/03c-master-blueprint.txt import/fixtures/spike-c-master.blueprint.txt`
  empty, and `03-blueprint.txt` matches the instance fixture;
- **"lifted verbatim, comments included" holds.** Every lifted symbol (`SPACING`, `args`, `split`, `parseValue`,
  `parseAl`, `toAlign`, `parseSize`, `mapSpacing`, `expandPad`, `nodeName`) is byte-identical to the frozen
  baseline. `toStack` is the one that differs, and its diff is **exactly** the two changes the header declares —
  drop rows routed through `ir.drop()`, and the size-drop loop extracted into `sizeDrops()`. No undeclared edit.

## What is good

- **Case 40.5's source census.** Iterating `DROP_CLASS_OF` catches a class that is wrong and is blind to one that
  is missing; reading every `kind` literal out of `import/*.mjs` catches both. The report records that the naive
  version stayed *fully green* under a deleted entry — found by driving it, not by reading it.
- **Both sweeps read the directory.** #307's `snap-rules.mjs` and #310's `figma.mjs` are covered the day they land
  instead of being skipped in silence behind a detail line that still claims the whole graph.
- **The freeze probe undoes itself**, and every constructive call routes through `fold()` — group 35's recorded
  lesson applied rather than re-learned, after it fired once for real in this ticket.
- **`stackShape` refuses a layout-less node by name** instead of reading `null.gap`. That is the difference
  between fourteen named failures and a stack trace.
- **The lift is verifiably a lift** (see Validation), and its two departures are declared in the header before a
  reviewer can find them.
- **The report is candid about its own instrument** — the runner that captured stdout only and reported 24/24
  "crash", proven on a known-bad input before anything it said was believed.

## Recommendation

**Request changes.** No security or data concerns, and the architecture is sound — R1/R2/R3 are arguments, not
fitted weights, and the honest refusals are real refusals.

Four Highs, and they are not the same kind of thing:

- **F1** ships a sentence that argues against the decision it guards. One line.
- **F10** loses a source text with no drop row — the one defect class every header in this PR cites.
- **F6** and **F11** are the gate not being able to see a break. `build()`'s entire `list` path can throw and a
  prop can be silently mis-sourced, both with **all 40 groups passing**.

Suggested order: **F1 F4 F5 F8** (prose and units, no behaviour) · **F10** (the silent loss) · **F6 F11 F2 F12**
(the gate's blind spots, which are one sitting) · **F3** (one pre-scan plus its case). F7/F9/F13 are notes — fix
or defer.

F6 is worth a conversation rather than a patch: whether `list` should emit its rows or refuse whole is a design
decision this ticket is entitled to make either way. What it is not entitled to is a header that says one and code
that does the other, on a path nothing can observe.

_Reviewed against `CLAUDE.md` and `.claude/references/gates.md`. A human now reviews the code and this review._
