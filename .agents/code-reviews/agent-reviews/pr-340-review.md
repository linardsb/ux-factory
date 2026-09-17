# Code review — PR #340, `discovery/prd-projection.mjs` (epic #279, ticket #290)

Branch `feat/290-prd-projection` · head `e54ec51` · base `main` @ `8b6ee61`

This repo is vanilla Node ESM with no TypeScript, no test suite, no linter by design (CLAUDE.md). The
gate is `node tooling/build-checks.mjs`. Judged against that standard, not Python/FastAPI conventions.

**Scope note.** The user directed me to two already-confirmed findings and asked me not to re-report
them, only to report what else is there:

- **(A, already confirmed)** `wrong_if` / `reason` / `missing[]` are validated by the applier as
  non-empty strings only, so a multi-line value interpolates raw markdown into the page via
  `renderDecision`'s `*Wrong if:*` line and `renderHypothesis`'s bullet. Confirmed: 15 headings instead
  of 11.
- **(B, already confirmed)** `renderMetrics` and `renderEvidence` read `state.decisions` (all) while
  every other section reads `state.visible` / `latestByQuestion`, so a superseded decision's kill
  criterion appears unmarked in the metrics table and a superseded decision is named in "Decisions
  resting on no evidence." Group 31 stays green when both are flipped to `visible`.

Everything below is new relative to (A) and (B), independently reproduced (scripts against the real
`discovery/ops.mjs` + `discovery/prd-projection.mjs`, or the real CLI/gate), not inferred from reading.

**A pre-existing independent review already sits at `.claude/code-reviews/pr-340-review.md`**, written
during this same session — evidently a concurrent/parallel pass (this repo's own notes document that
worktrees get shared across parallel sessions). Its F1 finding independently reproduces (A) plus the
same evidence-URL site as finding 1a below; its F2 finding is (B) with a sharper root-cause statement. I
read it only after finishing my own independent investigation (noticed on a routine `git status`), and
re-verified everything below myself rather than taking it on trust. It is not overwritten or altered by
this report. It also explains a flake noted below.

---

## Issues found

### Pure core (`projectPrd`, `checkOpLines`, the renderers)

#### 1a. (Critical) A `file_evidence.url` with an embedded newline injects real `## ` headings — a second, independently-exploitable site for the same defect as (A)

**File:** `discovery/prd-projection.mjs:364-368` (inside `renderDecision`)

```js
const refs = p.evidence_refs.map((s) => {
  const e = bySeq.get(s);
  if (!e) return `seq ${s} — not in this ledger`;
  const src = e.params.url !== null ? e.params.url : `answer ${e.params.ref}`;
  return `seq ${s} — ${e.params.provenance} — ${src}`;
});
```

`discovery/ops.mjs:190` validates a `file_evidence` url with `/^https?:\/\//.test(p.url)` only — prefix
check, nothing else — so a url containing `\n` is accepted. When a decision cites that evidence via
`evidence_refs`, this line puts the raw url into the `*Evidence:*` prose line with **no** `cell()`
(which folds `\n` → space, `discovery/prd-projection.mjs:65`) and **no** `blockquote()`. Different param,
different render site than (A) — fixing `wrong_if`/`reason`/`missing[]` does not close this one.

**Reproduced** (real `applyOps` + `projectPrd`, no repo files touched): a `file_evidence` op with
`url: "https://evil.test/x\n\n## INJECTED HEADING\n\nInjected body text..."`, cited by one decision:

```
headings found on the page: ["Problem","INJECTED HEADING","Evidence","Hypothesis", ...]
contains the injected heading text as a real '## ' line: true
```

12 `## ` headings instead of 11, from a single hostile citation. Case 31.9 exercises the pipe in its
`HOSTILE_URL` only through `renderEvidence`'s TABLE path (which `cell()`s it), never through this prose
citation line — the fixture's one hostile-URL decision happens to have `evidence_refs: [1]` too, but the
gate never asserts anything about how that citation line renders, so this path goes unchecked.

**Fix:** wrap `src` in `cell()` here, matching what `renderEvidence`'s table already does one function
up.

#### 1b. (High) `run.json` string fields reach the page through `field()`, which does not fold or escape

**File:** `discovery/prd-projection.mjs:81-86` (`field()`), used at `:556` (`run.root`, inside a markdown
link), `:558` (`run.provenance`/`label`/`entryMode`/`depth`/`branch`/`frontEnd`/`model`/`posture`/
`startedAt`/`endedAt`), and `run.slug` raw (no `field()` at all) at `:550`.

`checkOpLines` never touches `run`; `projectPrd` only checks `run.slug` is a non-empty string
(`:542-543`) — no shape or content check on anything else. Reproduced directly: setting `run.label` or
`run.root` to a string containing `\n\n## X\n\nY` puts a real `## X` heading on the page, from either
field independently.

Lower confidence than 1a on *real-world* exploitability, since `run.json` is written by
`portal/lib/discovery.mjs`, outside this diff, and I can't see what constraints that module puts on
`label`/`root`/`slug`. But nothing in *this* diff constrains them either, and the module's own header
claims run.json is one of exactly five trusted "sources" a claim may resolve through — being an accepted
source is not the same as being rendered safely.

**Fix:** fold `field()`'s string branch the way `cell()` does, or route the header/Run-line string
fields through `cell()` directly. Note `run.slug` at `:550` (`` `# ${run.slug} — PRD, projected...` ``)
is raw, not even through `field()` — a fix scoped only to `:556`/`:558` would leave that site open. It's
the least exploitable of the three (portal likely restricts slug format at write time, and 31.3's own
`startsWith` on the fixture's clean slug would probably flag a badly-shaped one) but the code here treats
it no differently.

#### 1c. (High) A `parent_id`/`evidence_refs` entry that resolves to the *wrong kind* of record puts the literal string `undefined` on the page — falsifying the module's own header claim

**File:** `discovery/prd-projection.mjs:76-79` (the claim), `:359` (`parent_id` site), `:367-368`
(`evidence_refs` site); root cause is `checkOpLines` (`:229-268`), which never checks that a `parent_id`
names a `record_decision` or that an `evidence_refs` entry names a `file_evidence` — only that they're
present and (for `parent_id`) that the value integer resolves via `earlier()` inside the *applier*, a
check `checkOpLines` does not re-run.

The header states, in its own words:

> "...an absent field renders as an em dash and the string `"undefined"` never reaches the page (case
> 31.12)."

**Reproduced**, two ways, both against `checkOpLines` + `projectPrd` directly (simulating a corrupted
`transcript.jsonl` — precisely what `checkOpLines` says it exists to catch):

1. A `record_decision` (seq 2) whose `parent_id` points at seq 1, a `file_evidence`, not a
   `record_decision`. `checkOpLines` accepts it. Rendered: `` *Parent:* seq 1 (undefined) `` —
   `par.params.level` is undefined because `file_evidence`'s params have no `level`.
2. A `record_decision` (seq 2) whose `evidence_refs` includes seq 1, a `record_decision`, not a
   `file_evidence`. `checkOpLines` accepts it. Rendered: `` *Evidence:* seq 1 — undefined — undefined ``
   — `e.params.provenance` is undefined (no such param on `record_decision`), and
   `e.params.url !== null` is `true` when `e.params.url` is `undefined` (`undefined !== null`), so the
   *url branch* is taken and prints `undefined` too.

Both confirmed with `/\bundefined\b/.test(doc)` → `true`. Case 31.12's `!/\bundefined\b/.test(md)`
guarantee is real but only ever exercised over a *shape-stripped* run header — it never runs against a
ledger with a wrong-kind cross-reference, which is the corruption class `checkOpLines` is supposed to be
the guard against.

**Fix:** either have `checkOpLines` verify `parent_id`/`evidence_refs`/`claim_ref` resolve to the right
`op` kind (it already has `bySeq`-equivalent information available — it's iterating the same array), or
have `renderDecision` treat a wrong-kind resolution the same as a missing one (`"not in this ledger"`)
rather than reading `.level`/`.provenance`/`.url` off a record that may not carry them.

#### 1d. (High) The `**Ledger**` line's flag counts and the hierarchy's orphan tally use different denominators — proven to disagree, not just untested

**File:** `discovery/prd-projection.mjs:560` (`` flags: ${FLAGS.map((f) => `${f} ${checked.filter((r) => r.flagged.includes(f)).length}`)...} ``, counts over `checked` — every op line) vs. `:510-511`
(`` `orphans ${visible.filter((d) => d.flagged.includes("orphan")).length}` ``, counts over `visible` —
superseded decisions excluded). Same document, two tallies of "how many orphans," different sets, no
note explaining the difference.

**Reproduced**: extending the group-31-shaped fixture with one more op — an off-script `record_decision`
that supersedes the fixture's orphan (`parent_id: null`, `evidence_refs: []`) with a *non*-orphaned
refiling:

```
seq 6 flagged: [ 'no-evidence', 'orphan' ] | superseded by seq: 12

LEDGER LINE:
**Ledger** — 12 op(s): record_decision 7 · flag_weak_answer 1 · open_question 2 · file_evidence 2 · flags: no-evidence 1 · orphan 1

HIERARCHY ORPHANS LINE(S):
business 1 · stakeholder 1 · solution 2 · transition 1 · orphans 0
```

`orphan 1` and `orphans 0`, same page, same underlying fact, both about "the fixture's decisions." The
original group-31 fixture can't show this because its one orphan (seq 6) is never superseded — it stays
visible, so both counts happen to agree by construction, which is exactly the "adversarial content only
where the code already handles it" shape the other review's F2 names for a different pair of lines.

This is the same `visible`-vs-`all` split as the already-confirmed (B), on a third, independent line of
code (`projectPrd` itself, not a renderer) — whoever resolves (B) needs to also decide what the Ledger
line's flag counts mean once decided.

**Fix:** count the Ledger line's flags over `visible` decisions (plus non-decision ops, which don't carry
these flags at all today per `ops.mjs`), or explicitly label it as counting the *full ledger including
superseded records* if that's the intended meaning — either is fine, but they need to agree or be
visibly different claims.

### Filesystem shell (`readJsonl`, `readPackage`, `writePrd`, the CLI)

#### 2a. (High) `readPackage` silently drops any transcript line whose `type` isn't exactly `"op"`, including an otherwise well-formed `record_decision`

**File:** `discovery/prd-projection.mjs:599-601`

```js
const ops = readJsonl(join(root, "transcript.jsonl"))
  .filter((l) => l && l.type === "op")
  .map((l) => { const rec = { ...l }; delete rec.type; delete rec.ts; return rec; });
```

**Reproduced** with a real package on disk (`run.json` + `answers.jsonl` + a `transcript.jsonl` with two
otherwise-identical `record_decision` lines, one `type: "op"`, one `type: "opx"`):

```
ops read: 1 (transcript.jsonl has 2 op-shaped lines on disk)
no error thrown; PRD generated silently.
contains first decision's wrong_if: true
contains second (corrupted-type) decision's wrong_if: false
```

A transcript line whose `type` field is corrupted to anything other than the literal string `"op"` — a
partial write, a future writer bug, a bit flip — is silently excluded from `ops` and never reaches
`checkOpLines` at all, with no error anywhere. This is the mirror image of the property the module is
built around: case 31.7 proves a *deleted* claim correctly vanishes from the page; this shows a claim
that is *still in the file, unmutated* can also silently vanish, with none of the "never silently drop a
claim" discipline the rest of the module applies.

**Fix:** have `readPackage` throw on a transcript line whose `type` isn't one of the three documented
types (`text`/`op`/`denied`), rather than silently filtering to `"op"` only.

#### 2b/2c. (Low) CLI argv parsing: `--root` with a missing value, and slug+`--root` given together

**File:** `discovery/prd-projection.mjs:618-639`

Both reproduced against the real CLI:

- **`--root` with no directory (2b).** `node discovery/prd-projection.mjs --root --stdout` treats
  `--stdout` as `--root`'s value (`rootArg = argv[rootAt + 1]`, unchecked), then still matches
  `argv.includes("--stdout")` and takes that branch. Result: `` prd ✗  prd-projection: no run.json at
  .../--stdout/run.json — that is not a run package `` — a confusing error naming a directory literally
  called `--stdout`, instead of "‑‑root needs a directory."
- **slug and `--root` both given (2c).** `node discovery/prd-projection.mjs some-typo-slug --root
  <realdir> --stdout` exits 0 and silently uses `<realdir>`, discarding `some-typo-slug` with zero
  warning. The usage string frames these as alternatives (`<slug> ... | --root <dir> ...`); silently
  accepting both is a plausible typo/copy-paste trap with no signal to the operator.

Neither corrupts output (2c's PRD correctly names the `--root` package's own slug in its heading), which
is why these are Low — CLI ergonomics, not silent wrong content.

### Group 31 coverage gaps (mutation-tested against the real gate; not proven wrong today)

Per the task's instruction, each mutated in the actual source, gate re-run, reverted via `git checkout
--`, tree confirmed clean via `git diff --stat` after every one and again at the end of the session.
Unlike 1d above, I did **not** find a live disagreement for these — only that the gate cannot currently
tell if one becomes wrong.

#### 3a. (Medium) Success Metrics' stage-7 table has no assertion

`discovery/prd-projection.mjs:434` (the `staged` filter in `renderMetrics`). Changed `?.stage ===
METRIC_STAGE` to `?.stage === 999999`, forcing the "_No decision was recorded against a stage 7..._"
fallback even though the fixture carries a real stage-7 decision (`s7-kill-state-and-date`) —
`build ✓  all 31 groups pass`. No case checks this sub-table's rows or its fallback text; 31.4's "every
claim is present" check still passes only because the *second*, unconditional table in the same function
repeats the same `wrong_if` text regardless (the mechanism (B) already names).

#### 3b. (Medium) The Run line's `provenance`, `model`, `posture`, and turn count have no assertion

`discovery/prd-projection.mjs:558`. Replaced all four with hardcoded wrong values (`WRONG_PROVENANCE`,
`WRONG_MODEL`, `WRONG_POSTURE`, `9999 turn(s)`) — `build ✓  all 31 groups pass`. Case 31.12 tests
presence of 5 *other* fields (`slug`/`label`/`entryMode`/`depth`/`frontEnd`) plus `branch`/`endedAt`
null-handling; it never checks these four.

#### 3c. (Medium) The Ledger line's *op* counts have no assertion (separate from 1d's flag-count bug)

`discovery/prd-projection.mjs:560`. Replaced the entire line body with a hardcoded string — `build ✓  all
31 groups pass`. No assertion in group 31 references the string `"Ledger"` at all, so the `record_decision
N · flag_weak_answer N · ...` op-count breakdown is equally unverified, independent of 1d's proven
flag-count disagreement.

None of 3a-3c are proven wrong today. Given the fixture is otherwise unusually thorough (mutation-proven
in several places, e.g. 31.5's flag-blanking), these look like coverage that wasn't gotten to rather than
a deliberate choice — nothing in `SECTIONS` or the group's closing description claims to cover them.

### Documentation

#### 4a. (Low) `CLAUDE.md:148` names the wrong build-checks group for a new discovery op verb

**File:** `CLAUDE.md:148` — part of this PR's diff (confirmed via `git diff 8b6ee61 e54ec51 -- CLAUDE.md`,
which touches the same `discovery/` row two lines above).

> "a verb is a `discovery/ops.mjs` edit (`OPS`, its `PARAMS` entry, the switch case and its build-checks
> **group 28** fixture, together...)"

Per `tooling/build-checks.mjs`'s own authoritative top-of-file numbered list (`:122,128`): **group 28 is
`bank`** (`discovery/bank.mjs`), and **group 29 is `discovery ops`** (`discovery/ops.mjs`, the applier)
— confirmed both by that list and by locating the per-verb `VALID_FOR` fixture (`:5337-5344`), which sits
inside `group("discovery ops", ...)`, not `group("bank", ...)`. A contributor following this line when
adding a fifth op verb would edit the wrong group.

**Fix:** `group 28` → `group 29`. One word, in a file this PR already opens.

Finding 1c above is also, independently, a documentation-vs-code mismatch (the module's own header
claims "undefined" never reaches the page); listed under Pure core since the fix is a code fix, not a
doc fix.

*(Not part of this PR's changed lines, mentioned only in passing: `tooling/build-checks.mjs:4` still says
"Twenty-three groups" though the gate has run 31 since this PR — pre-existing drift this PR widens by
one, not introduced by it; owner's call whether it's worth a line.)*

---

## A note on gate flakiness — explained, not a finding

The first `node tooling/build-checks.mjs` run of this session failed group 31 with exactly two
failures: `seq 5 (record_decision) does not reach the page` and `the replaced decision vanished from the
page entirely — both records stay, nothing is removed (README §Supersede)`. The next 17 consecutive runs
passed.

That exact pair matches, verbatim, a row in the other concurrent review's F2 proof table: "one word
changed: superseding op given a distinct `wrong_if`" → `build prd projection ✗ 2 failure(s)` — "the
replaced decision vanished from the page entirely." Their file's mtime falls inside the window my first
run happened in. The most likely explanation is a real filesystem race in a working directory shared
across parallel sessions (documented as a live risk elsewhere in this repo's own operating notes, not
something I'm speculating into existence): my `node tooling/build-checks.mjs` invocation loaded
`discovery/prd-projection.mjs` off disk at a moment when their F2 verification edit (or its revert) was
mid-flight. I can't prove the timeline beyond the message match and the mtime overlap, so I'm not listing
this as a project defect — but it explains the observation better than "unexplained flake" would, in a
module whose headline claim is byte-identical purity.

I also ran the exact group-31 fixture 20,000 times in a single Node process (no process restart, no
filesystem) comparing every projection — zero mismatches — which independently rules out impurity inside
`projectPrd`/`applyOps` themselves, consistent with the race explanation rather than a code defect.

---

## What's good

- The pure/shell split is real: `projectPrd`/`checkOpLines`/the renderers touch no filesystem, clock, or
  network, which is what makes the 20,000-iteration purity check above possible at all.
- Building the group 31 fixture's records with the *real* applier (`applyDiscoveryOps`) rather than
  hand-authoring `seq`/`closes`/`flagged`/`supersedes` means those four fields cannot drift from
  `ops.mjs`'s own rules.
- The per-row `empty` string on `SECTIONS` (declared, not inferred) is a genuinely good design — it's
  why 31.7.1 needs no special case for the transition note's `**n/a**` paragraph, and a future rung with
  its own bespoke empty state is covered the day it lands.
- 31.5's flag-blanking mutation (proving flags are *read* from `flagged` rather than re-derived) and
  31.6's supersede-block checks are real, non-vacuous, mutation-resistant assertions — I tried to break
  the supersede-hiding logic in `indexOps` by reasoning through it and by mutation, and 31.6 catches that
  class of regression; I didn't find a hole there.
- `pathToFileURL` (not string comparison) for the CLI entry-point guard, specifically because this
  repo's path contains a space — a previously-bitten class of bug elsewhere in this codebase.
- The refusal message on `writePrd` (refuse to overwrite `prd.md` without `--force`) is genuinely clear
  about *why*, not just *that*.

## Questions / clarifications

- Is `run.json`'s `label`/`root`/`slug` operator-free-text, or format-constrained by
  `portal/lib/discovery.mjs`? That decides how live 1b is — I can't see that module from this diff.
- Findings 3a-3c: is the intent that group 31 eventually covers this content, or is some of it
  considered "presentation, not a claim" and deliberately out of scope? `SECTIONS`'s own
  "declare, don't infer, the empty state" discipline suggests the former, but I don't have visibility
  into that call.
- 1c/1d both stem from the same shape of gap: `checkOpLines` validates the envelope plus exactly three
  enum params (`level`/`source`/`provenance`) and leaves `parent_id`/`evidence_refs`/`claim_ref` target
  *kind* — and, per (B) and 1d, `visible`-vs-`all` set choice — otherwise unchecked. Worth deciding once
  whether `checkOpLines` should own more of that, rather than patching each site independently.

## Summary

**Not ready to merge as-is.**

- Critical: 1 (1a)
- High: 5 (1b, 1c, 1d, 2a — pure-core/shell correctness; plus (B) already confirmed, same tier)
- Medium: 3 (3a, 3b, 3c — group 31 coverage gaps, none proven wrong today)
- Low: 3 (2b/2c combined, 4a)

No refactor suggestions, no style notes, no test/type complaints — none apply under this repo's stated
conventions. **Do not start fixing any of this without the user's explicit approval.** In particular,
1a/1b's fix should land together with whatever fix is chosen for (A) — they're the same defect class,
and a fix scoped only to the three params already found (`wrong_if`/`reason`/`missing[]`) would still
leave the PRD open to markdown injection via `file_evidence.url` and `run.json` fields. Similarly, 1d
should be decided alongside (B), since both are the same `visible`-vs-`all` question asked of different
lines.
