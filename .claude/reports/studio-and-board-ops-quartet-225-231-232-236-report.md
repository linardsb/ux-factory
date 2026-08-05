# Report — #225, #231, #232, #236 (epic #202)

Four deferred review findings fixed on one branch, one commit each. Two issues were folded first:
**#237 → #236** and **#226 → #225** (survivors retitled, folded bodies appended under their own
heading, folded issues closed as duplicates with a pointer). **#231 was NOT folded into #232**, as
instructed — same review and epic, different modules and different urgency.

## What each commit did

### `fix(236)` — the compile beat survives a teardown and a transient vocabulary failure

`destroyed` flag · `ac.signal` on the fetch · a liveness check after every await in `compile()` · a
pending `wait()` **resolved** rather than merely cleared · `loadVocabulary()` memoizing the success
only. `vocabError` was removed rather than left write-only, and the header now says what the code
does.

The order inside `destroy()` is load-bearing and is commented as such: flag, abort, release.

### `fix(225)` — the apostrophe, the envelope, the CLI

**The grammar option was taken, and the reason is cost.** A clause in `buildTask` /
`PIV_BUILD_SYSTEM` would make the committed trace's recorded `task` disagree with the code that
emits it, and could only land honestly with a paid re-record (`--force`, agent SDK, tokens).
`tokenize()` now models what bash does — a word is SEGMENTS concatenated (`'…'\''…'` is a quoted
run, an escaped apostrophe, another quoted run) — and needs no re-record. The escape read is exactly
`\'`; the allowlist is untouched, so brace/bracket expansion, `$`-expansion, chaining and every
other escape are still refused, and a group 11 case asserts that.

**The envelope check moved, and this is the finding inside the finding.** Putting it in `checkOp`
(the obvious reading of the issue) turned `node tooling/build-checks.mjs` red immediately:
`gen-replay`'s reproduce check applies the PROJECTED ops, and a projected op is `{op, params}`
wrapped in `atMs`, `phase` and `fromStep`. Strictness therefore belongs at the GRAMMAR boundary —
`parseOpCommand`, which every human- or agent-authored envelope passes through (the fence reads the
typed command, the CLI re-joins its argv through it, gen-replay projects from it) — while `applyOp`
stays permissive for its enriched callers. Group 11 pins BOTH halves, including the projected op
that must still apply, so the trap is now a gate rather than a memory.

**The CLI keeps its argv round-trip** through `parseOpCommand` — one grammar, no third opinion — and
re-joins with the grammar's own quoting (the newly exported `shellQuote`). That fixes the space AND
carries an apostrophe through argv intact, which the tokenizer fix alone would not have done: the
agent's escaped label arrives in argv raw and was re-wrapped in bare quotes.

### `fix(231)` — the handle's name follows a re-place, and a canvas alone arms nothing

L3 is the two-line move. **The workaround check the ticket asked for: `applySwap` CANNOT be
simplified.** It never calls `place()` — it renames a wrapper in place, because `place()` appends to
the stage (re-ordering it) and announces a placement the reader did not ask for. So its own
`aria-label` write is required, and the comment claiming `place()` writes the label "at CREATION
only" was corrected rather than deleted.

L2: the `.stx-grab` button is this module's structure and `studio-verbs.mjs`'s behaviour, so it is
born `disabled` with no `aria-describedby`, and `mountCanvasVerbs` arms it — passing `help.id`, so
the IDREF string is not literalled in two modules. Arming is idempotent and forward-acting. On both
shipped mounts placement precedes the verbs, so the settled DOM is byte-identical to before.

### `fix(232)` — `ui.move` carries the shape; the label gets its own key

The first of the issue's two acceptable outcomes, argued on the ground that `component` is read as
the vocabulary shape by four other emitters and would otherwise be a field whose meaning depends on
who sent it — with #209 about to become the second consumer. The shape is RECORDED by the placer
(`place({ component })` → `data-stx-component`), never derived, and OMITTED where there is none:
/factory moves fat-marker blocks, and naming one "stu-place" would invent a vocabulary entry. The
announcement still uses the label (three handles reading "Move metric-tile" would be
indistinguishable to a screen-reader user). `action-bus.mjs`'s header — the contract's documentation
— records which key means what; no behaviour in it changed.

## Every fix proven by mutation

| Mutation | Gate | Result |
|---|---|---|
| `destroy()` stops clearing → no `release()` | studio-journey | ✗ "compile() … parking its frame forever" (both teardown cases) |
| drop the liveness check after `await vocabReady` | studio-journey | ✗ "re-adds neither data-compile-state nor data-compile-step" (`state:"unavailable"` written into a torn-down viewport) |
| drop `{ signal }` from the fetch | studio-journey | ✗ "the teardown ABORTED the request" (0 aborted) |
| re-memoize the vocabulary error | studio-journey | ✗ both #237 cases (still `stu-place`, 1 request) |
| break the `\'` escape | build-checks g11 | ✗ exit 1, "unsupported escape" |
| disable the envelope check | build-checks g11 | ✗ 4 failures, each naming its envelope |
| un-quote the CLI re-join | build-checks g11 | ✗ "got 6 argument(s)" |
| put the `aria-label` back in the create branch | studio-journey | ✗ "Driven tile" / "Move Metric 1" |
| handle born armed (pre-#231) | studio-journey | ✗ dead tab stop + describedby |
| emit the label under `component` | studio-journey | ✗ all four #232 cases |

Two of those mutations also caught weak checks in the drafts and were fixed before they landed: the
first version of the second teardown case destroyed the beat while its last `wait()` was still
outstanding, so it re-proved case 1 instead of the post-fetch liveness (it now sleeps past that
wait, and the comment says why); and the first version of the #231 L3 case read "the first
`.stx-slot`", which is not the wrapper `place()` re-placed — `place()` appends, so the re-placed one
is last, and the case passed with and without the fix until it queried by name.

## Gates

- `node tooling/build-checks.mjs` — ✓ all 15 groups
- `node tooling/drift-check.mjs` — ✓ (after regenerating `loc-summary.json`)
- `node tooling/token-lint.mjs` — ✓ 64 contract tokens
- `node tooling/studio-journey.mjs all` — ✓ chromium · firefox · webkit
- `node tooling/vt-verify.mjs all` — ✓

## The one thing to know about baselines

`loc-summary.json`'s runtime group crossed a rounding boundary (23,000 → 23,200 lines, same 69
files) and `approach.html` renders that number, so this is the documented loc cascade. The two
approach pixel baselines were deliberately NOT re-taken: the change is one digit inside an existing
line of text (well under the gate's `maxDiffPixels` tolerance), and nothing in this branch moves
at-rest layout. If the visual gate does go red on approach, that digit is the expected cause and the
baselines are the fix; a red anywhere else means something moved that should not have.

## What is NOT covered, stated rather than implied

`build-checks` cannot reach `destroy()`, `loadVocabulary()` or `place()` — they need a DOM and a
`fetch`. Those three are studio-journey's, the same split groups 9, 11, 12 and 13 already live with,
and no source-grepping stand-in was added to make the pure layer look busier than it is.
