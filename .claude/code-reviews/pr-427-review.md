# PR #427 review — `childrenCardinality: "many"` (#298)

**Head** `a5050ba` · **Base** `main` @ `d3cc161fa6e88dbbecb8614453498aba72f86940` · **Round** 1

`origin/main` is still `d3cc161`, so the base has not moved and there is no prior review report — the
guarantees pass is correctly out of scope for this round.

## Recommendation

**Approve with comment.** No critical, no high. Every gate green under my own run, and every figure in the PR
body re-derived rather than read.

Three Mediums and three Lows — all of them prose, cross-references and a test-fixture nicety. **Not one line
of shipped behaviour is in question.** F1 is the only one with a consequence beyond tidiness: the ticket that
most needs this grammar was never told it exists, because a wrong issue number was copied into five places.

## Validation

All run by me at `a5050ba`, on a private port (4793) curl-verified to be serving this tree.

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass` ✅ |
| `node tooling/drift-check.mjs` | `drift-check ✓  syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count` ✅ |
| `node tooling/token-lint.mjs` | `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` ✅ |
| `node agent-layer/gen-loc-summary.mjs --check` | `loc summary ✓  3 groups — no drift` ✅ |
| `BASE=…:4793 node tooling/catalog-journey.mjs all` | `catalog-journey ✓` — chromium **33**/0, firefox **32**/0, webkit **32**/0 ✅ |
| portal smoke (`PORT=4795`, port-scoped kill) | `/api/health` → `{"ok":true, … "bootSha":"a5050ba…","headSha":"a5050ba…","stale":false}` ✅ |

CI on `a5050ba`: `verify` · `visual` · `codeql` · `CodeQL` · `audit` · `gates-green` — **all six pass**,
`mergeStateStatus CLEAN`. The `visual` job passing is the independent confirmation of the no-regen decision:
the PR argued it from `loc-summary` arithmetic, and the pixel gate agrees.

## The numbers pass

Every figure in the PR body named a run, and I re-derived each one. Nothing was taken on trust.

| Figure | Claimed | Status |
|---|---|---|
| 34 groups pass | `build ✓` | **observed** — re-run |
| catalog-journey 33 / 32 / 32 | per engine | **observed** — re-run on all three; the `a5050ba` commit that corrected this figure was right |
| `handoff/` diff = 2 files, +3/−2 | `git diff --stat` | **observed** |
| vocabulary: 21 components · `composition.version 2` · 0 entries carry the key | | **observed** |
| the `components` block is byte-identical to `main` | derived in the report | **observed** — `JSON.stringify(a.components) === JSON.stringify(b.components)` against `git show d3cc161:…` → `true`. This is the load-bearing "the projection stayed conditional" claim and it holds |
| group 18's ✓ line reads `8 NEW refusals` | | **observed** — and derived from the array, not retyped |
| `a5050ba`'s tree ≡ `0640042` for every shipped file | derived | **observed** — `git diff --stat` shows only the report file |
| loc-summary: runtime 76 files / 30600 rounded, unchanged | | **observed** — `--check` green, and `approach.html:277,279` render exactly `runtime.files` and `runtime.linesApprox`, so the VR-skip decision is sound. Correctly decided by arithmetic and not by a pixel run |
| M1 mutation → `build composition ✗ 2 failure(s)` | | **observed** — re-applied, re-run, restored byte-identically (`git diff --stat` empty) |
| Deviation 4's `wt-292-restore` worktree | | **observed** — `0e27afb [feature/discovery-pre-grill-audit-292]` |
| M4b: a typo'd projected key goes green | | **derived, not re-run.** Structurally sound: `git grep childrenCardinality` shows the write side (`gen-vocabulary.mjs:82`), the read side (`agentic-renderer.mjs:90`) and the gate side (`build-checks.mjs`, synthetic entries only) — no gate reads the key off the **real** generated vocabulary, so the blind spot follows from the seam. Label it derived |

Attribution check: the PR credits the byte-identical `components` block to the projection *staying conditional*.
That is the right attribution — the conditional is the only thing in the diff that touches per-entry output,
and 0 entries carry the key, so nothing else could have produced it.

## Issues

### F1 — Medium · `list` is #303, not #305 — a wrong subject repeated in five places, one of them a CI-printed ✓ line

`tooling/build-checks.mjs:622` and `:668` (the group 3 `group()` string), plus the report, the plan and the
PR body all say the same thing:

> no committed spec declares `childrenCardinality: "many"` yet (**stack is #301, list is #305**)

Observed:

```
#301  stack + text through the chain, and renderMarkdown links — the two primitives the spine needs
#303  list through the chain — a container of list-rows with dividers, header and the empty case (G31)
#305  icon through the chain + gen-icons: a committed Phosphor subset by name, a missing name refused (G8)
```

`list` is **#303**. #305 is `icon`, and its own body says *"Declares no children"* — it is the one primitive
in that range that will never want this key. The plan knew the right number once: line 63 lists the consumers
as `(#301, #303, #305, #309)`; line 94 then writes *"#305 (`list`) — the second consumer"*, and the error
propagates from there into `build-checks.mjs:622`, the group 3 ✓ line, the report and the PR body.

This is the numbers pass catching a claim whose digits are fine and whose **subject** is wrong — the shape
the skill names. Both `#303` and `#305` are real open tickets, so nothing looks broken.

**Failure scenario — not hypothetical.** #303's body, verbatim:

> `list` through the full chain: a container of the existing `list-row`s … **Declares `children: many`**
> (allowed: `list-row`).

So #303 already carries the **old, wrong key spelling** — the one this PR replaced. And the hand-off that
corrects it went to the wrong ticket:

| | mentions of `childrenCardinality` in comments |
|---|---|
| #301 (`stack`) — got the hand-off | **8** |
| #303 (`list`) — the one whose body has the wrong key | **0** |
| #305 (`icon`) — declares no children | 0 |

#303's implementer opens their ticket, reads *"Declares `children: many`"*, writes that into
`system/specs/list.md`, and `parseComponentSpec` refuses with `head "children" must be an array` — an error
naming `children`, which is not the key they got wrong. The real name appears nowhere in the message, nowhere
in their ticket, and nowhere in the architecture doc (F2). The one artefact that would have told them was
posted on #301 instead.

The group 3 ✓ line also prints on every CI run and is the repo's own record of why the `many` side is proven
synthetically, so the wrong number is in the most-read place it could be.

**Fix:** `list is #303` in `tooling/build-checks.mjs:622` and `:668`, the report's line 15 and the PR body.
Then post #301's hand-off comment on **#303** as well, and correct its body's `children: many` — that is the
half with consequences, and it costs one `gh issue comment`.

### F2 — Medium · the governing architecture doc still specifies a key that does not exist

`docs/epics/canvas-design-import.architecture.md:49-52`

> The composition grammar grows once. `validateComposition` allows at most one child per node and enum-checks
> every prop key (observed, `agentic-renderer.mjs:79-96`), so `stack` and `list` cannot exist under it.
> Container entries declare `children: many` in the spec head …

Two things are now false in the doc CLAUDE.md names as governing, and the PR touches no file under `docs/`:

1. **The key name.** This PR ships `childrenCardinality: "many"`. Observed — a spec head written the doc's
   way is refused with `head "children" must be an array`, a message naming `children`, which is not the key
   the author got wrong; the real key appears nowhere in the error.
2. **The "observed" claim and its citation.** *"`validateComposition` allows at most one child per node …
   (observed, `agentic-renderer.mjs:79-96`)"* is no longer true, and lines 79-96 now hold the
   `childrenCardinality` guard that contradicts it — an evidence-tagged sentence pointing at its own
   refutation.

**Crediting what was done:** the rename is *correct* and it is *documented* — plan **A1** reasons it out
explicitly (*"`children: many` … cannot be the literal key (`children` is the allowed-names array)"*), and
plan task 12 posted a hand-off on #301 precisely so the first consumer learns the real spelling. That comment
exists and carries it. So this is not silent drift, and it is not a code change.

What is missing is the one-line correction to the doc itself, which is the surface every *later* reader
reaches — including #303 (see F1), which received no hand-off at all. CLAUDE.md §Working principles asks for
the flag; the plan flagged it, the PR body's five "documented deviations" do not, and the doc still says the
old thing.

**Fix:** edit `canvas-design-import.architecture.md:49-52` in this PR — name the key
`childrenCardinality: "many"`, and put the single-child sentence in the past tense or drop the line citation,
which will keep drifting regardless.

### F3 — Medium · the report says the projection blind spot is stated in `gates.md`; it is not

`.claude/reports/canvas-grammar-children-many-report.md` (Proving the checks, after the M4a/M4b split):

> That second sentence is the boundary now stated in group 3's own ✓ line, in `gates.md`, and in the hand-off
> posted on #301.

"That second sentence" is *"No gate covers the projected key's NAME."* Checked all three:

- group 3's ✓ line — **carries it**, verbatim: *"a typo in the key name there would be green here"* ✅
- the #301 hand-off comment — **carries it**, at its points 1 and 2 ✅
- `.claude/references/gates.md` — **does not.** Its one changed sentence carries the *synthetic-entry*
  boundary only (*"the one side the real vocabulary cannot show until a spec declares `many`"*), and
  `grep -n childrenCardinality .claude/references/gates.md` returns nothing ❌

This is the repo's own three-copies pattern: a "cannot reach" clause that lives in the `group()` string and
the report but not in the reference doc.

**Failure scenario:** `gates.md` is what CLAUDE.md points at for *"what each one states it CANNOT reach …
before trusting a green run"*. #301's planner consults it, finds the synthetic-entry caveat, and does not
find the one boundary that decides whether their regenerated vocabulary needs a gate of its own — the
boundary that matters precisely because #301 is the ticket that first makes the projection fire.

**Fix:** one clause appended to the groups-1–7 sentence in `gates.md` (*"…; that `gen-vocabulary` projects the
key is not reached — a typo in its name would be green here, first proved by #301's regenerated vocabulary"*),
or correct the report's sentence to say two places.

### F4 — Low · a false absolute claim in the comment that owns the invariant

`system/agentic-renderer.mjs:106-107`

> // competing states — the composition is wrong (status-chip's Usage prose). Per child,
> // so a `many` container holding two chips is caught on both.

**Not both — the first only.** `throw` inside a `forEach` callback aborts the whole loop.

Observed, driving the shipped `validateComposition` over a synthetic `many` entry with two competing
`status-chip` children:

```
threw once: composition[0].children[0].props.value: "WRONG-A" competes with the parent syn's …
mentions WRONG-B? false
```

CLAUDE.md §Ground rules makes the file's own comment the specification, so this is a spec sentence that is
wrong, in the one file a `many` container's author will read.

**Fix:** *"Per child, so a chip at any index is caught, not just the first"* — which is the true and useful
statement, and is what the move into the loop actually bought.

### F5 — Low · the group-3 mutation cannot distinguish an absent key from an undefined value

`tooling/build-checks.mjs:655`

```js
"syn-container": { ...MANY.components["syn-container"], childrenCardinality: undefined } } };
```

Behaviourally identical today, because the guard tests `entry.childrenCardinality !== "many"`. But the
mutation is meant to prove that *the cardinality* is what makes the many case pass, and the key is still
present on the entry — so a guard later rewritten as `"childrenCardinality" in entry` (a natural refactor
when a second cardinality value arrives) would stay green here while changing behaviour.

**Fix:** build the entry without the key rather than with an undefined one —
`const { childrenCardinality, ...noCard } = MANY.components["syn-container"];`

## What's good

- **The gate states its own blind spot in the ✓ line, unprompted.** Group 3 ends with *"What this cannot
  reach: that gen-vocabulary PROJECTS the key … a typo in the key name there would be green here."* Writing
  the limit of a check into the check, in the same PR that writes the check, is the `check-that-cannot-fail`
  discipline applied before anyone asked for it.
- **M4 was re-run after being found vacuous, and the correction was pushed to #301's planner** rather than
  quietly fixed in the report. The first version renamed the projected key with no spec declaring it, so the
  conditional's truthy branch never ran. The M4a/M4b split separates *correct* from *covered* cleanly, and
  that is the honesty contract working in the direction that costs something.
- **The byte-identical `components` block is the right evidence for the right claim**, and it survives an
  independent compare against `d3cc161`. A conditional projection that churned every entry would have been
  invisible in a diff stat; this is not.
- **The parse-time refusal of a cardinality on a leaf** (`lib.mjs:114-115`) is the correct call and cites its
  own precedent. A rule that can never fire is a parse error, not a silent no-op.
- **Absent ≡ one, with no second spelling.** No committed spec gains a key, no entry gains a line, and
  `pack.bundle.json` does not churn to say nothing. The grammar grew by exactly one optional key.
- **The refusals name the index.** `children[2]` rather than `children`, asserted in both directions
  (throws *and* says the right thing), which is what a six-part container actually needs from a validator.
- **The VR decision was made by arithmetic and says so** — `runtime.files` and `runtime.linesApprox` are the
  two numbers `approach.html` renders, both unchanged. Correctly *not* settled by a green pixel run, which
  `vr-tolerance-hides-text-changes` says proves nothing about digits.

### F6 — Low · the too-many refusal names one index while N children are in excess, and that string is read by an agent

`system/agentic-renderer.mjs:91`

```js
throw new Error(`${path}.children[1]: ${node.name} allows at most one child (got ${kids.length})`);
```

I first logged this as a consistency note. It earns a finding because the refusal string has a **consumer**,
verified verbatim at `portal/record-composition.mjs:199`:

> If it prints a refusal (naming a path like `composition[1].props.tone`), fix the composition and re-run
> until it prints "composition valid".

So the path is handed to a real composing agent and it is instructed to act on it. With four children the
message says `composition[0].children[1]: card allows at most one child (got 4)` — one index named, three in
excess. An agent that localises to the named index removes element 1 and re-runs still holding three. The
`(got N)` clause in the same sentence is the mitigation, which is why this is Low and not higher.

It is also inconsistent with its own sibling two lines up (`:88`, `${path}.children: … allows no children`),
which stays unindexed — both are aggregate complaints about the array, and only one of them now names a
position.

**Fix:** either revert this one refusal to `${path}.children:` (it is a cardinality complaint, not a
complaint about a specific child, and the new index-naming that `many` genuinely needs is the `forEach`
path, which is untouched by this), or name the whole excess range — `${path}.children[1..${kids.length - 1}]`.
Either way the `/children\[1\]/` assertion in group 3 moves with it.

## The two structural questions, both answered clean

**Does the render path deliver N children, now that validation accepts N?** Yes. `build()`
(`agentic-renderer.mjs:577`) dispatches `template(node.props ?? {}, node.children ?? [], bus, path)` — the
**whole** array. The `kids[0]` slicing lives inside the `card` and `empty-state` templates only
(`:403`, `:415`), which are single-child components by their own specs. So #301 adds a looping `stack`
template and it receives everything. Validation and dispatch are not out of step, and the PR is structurally
complete rather than half-landed. This was the one place a real defect could have hidden, because group 3
asserts every entry has a template while zero entries declare `many` — no gate could have seen it.

**Did the `forEach` rewrite change behaviour for the single-child case?** No. Old order: length-check →
`kids[0]` → shape → name → recurse → chip. New order: cardinality+length-check → `forEach`(shape → name →
recurse → chip). For one child the sequence is identical; for two under a single-child entry the too-many
refusal still fires first; `kids.length > 0` still short-circuits the empty array. Behaviour-preserving
except the intended change.

## Notes, not findings

- `system/handoff-viewer.mjs:239` renders the composition block through a three-key allowlist
  (`shape` · `childrenRule` · `chipRule`), so the new `composition.version` correctly does not leak into the
  pack viewer as prose. Nothing to do.
- `docs/epics/canvas-design-import.architecture.md` is the only place outside this PR that restates the
  single-child rule; `__TODO.md:106` names the `composition` keys but not the rule text, so it is not stale.
- **A trap worth adding to #301's hand-off:** both existing child-consuming templates pass `[]` as the
  grandchild array (`TEMPLATES[child.name](child.props ?? {}, [], bus, …)` at `:404` and `:416`), so a child's
  own children are validated and then never rendered. Correct under the single-child grammar and untouched
  here. But a `stack` template written by copying either one inherits the `[]` and silently drops a nested
  container's contents — which is exactly what `stack` is for. Pre-existing, not a defect in this PR.
- The dispatched `code-reviewer` agent returned after this review was first posted. It found no critical,
  high or medium issues, independently reached F2's key-name staleness, and confirmed by a side-by-side
  probe against the pre-PR function (7 adversarial inputs) that check ordering is byte-identical for the
  single-child case — only the `.children` → `.children[1]` path moved. **F6 is its finding**, verified here
  before being adopted. It also corrected one premise of my brief: `portal/record-build.mjs` is *not* a
  consumer of `childrenRule` — it drives `board-ops.mjs`, a different vocabulary (confirmed: 0 hits for
  `childrenRule|vocabulary.json` in that file). `record-composition.mjs` is the only agent-facing reader.
