# PR #340 review — round 2, the F1–F8 fix commits (#290)

**Head** `3ae97842aa47db9fd62082efc6f8ade3c877e1a8` · **Base** `main` @ `8b6ee61ea359f632ff3a75ec181a8f86f7234a48`
· round 2 (round 1: `.claude/code-reviews/pr-340-review.md` at head `e54ec51`) · `mergeStateStatus` CLEAN

**Base is UNCHANGED since round 1** — same SHA — so no rebase happened and the guarantees pass is not triggered.

**Scope:** commits `3057f2c` and `3ae9784` only. `e54ec51` was reviewed in round 1.

**Disclosure:** the session writing this review also wrote these fix commits, so it is not fresh eyes on the
code. The deep code pass was dispatched to the `code-reviewer` agent in a clean context; findings F1, F2 and
F6 below originate there. **Every one was then reproduced independently against the real module** — the runs
are quoted inline. F3–F5 and F7 are this session's docs/numbers pass.

**Recommendation: request changes.** 1 High, 4 Medium, 2 Low.

Six of the eight round-1 findings are closed correctly and completely — F2, F4, F5, F6, F7, F8 all verified
against the code rather than against the claim. **F1 is not.** Its stated invariant — "an op param cannot open
a `## ` heading" — is false under ordinary Windows line endings, and the case written to prove it
(31.13) is structurally incapable of seeing the failure.

---

## Findings

### F1 (High) — `fold()` handles only LF, so CRLF and CR reopen the exact injection F1 closed

`discovery/prd-projection.mjs:79` · the gate's blindness: `tooling/build-checks.mjs:5856`, `:5858`

```js
const fold = (s) => String(s).replace(/\n/g, " ");
```

CommonMark defines a line ending as **a line feed, a carriage return not followed by a line feed, or a CRLF
pair**. `fold()` strips only the first of the three.

The CRLF case is worse than a miss: `fold()` *manufactures* the exploit. `"ok.\r\n\r\n## Smuggled"` →
`.replace(/\n/g, " ")` → `"ok.\r \r ## Smuggled"`. The `\n`s are gone, the `\r`s survive as bare line
endings, and the space `fold()` inserted becomes one leading space before `##` — which ATX headings tolerate
(up to three).

**Observed**, against the real module, one `record_decision` whose `wrong_if` carries the payload:

| `wrong_if` line endings | `## ` headings the payload opened |
|---|---|
| LF only (what F1 targets) | **0** — contained |
| bare CR | **3** — `## Smuggled CR` ×3 |
| ordinary CRLF | **3** — ` ## Smuggled CRLF` ×3 |

Three, not one, because a `wrong_if` renders at three sites (the ladder block, the hypothesis bullet, the
metrics table). This is not an adversarial string. It is what any answer pasted from Word, Outlook, a Windows
editor, or a CRLF-normalising clipboard contains, and `ops.mjs` forbids nothing content-wise —
`nonEmptyString` only, and the README says outright the applier judges "the text of anything" never.

**The gate cannot see this, so fixing only the regex would leave a check that cannot fail.** Two helpers are
LF-only:

- `fold` (`:5856`) — the gate's own copy, so `present()` builds its match set blind to CR;
- `headings()` (`:5858`) — `/^## (.+)$/gm`; JS multiline `^` anchors on `\n` **only**.

**Observed:**

```
what the gate 31.13 sees:     ["Real section"]
what a markdown reader sees:  [" ## Smuggled CRLF","## Real section"]
```

So 31.13 — the case added this round specifically to prevent op-param heading injection — reports green over
the entire CR/CRLF class. That is this repo's own "the check that cannot fail" pattern, in the case written to
prevent it.

**Also affected, pre-existing and untouched by either fix commit:** `blockquote()` (`:88-92`) splits on `\n`
only, so a *human answer* carrying a bare CR escapes the blockquote the same way. `blockquote()` is the
mechanism the module header names as the safe reference case for all arbitrary human text.

**Fix.** One shared line-ending regex, `/\r\n|\r|\n/g`, in `fold()`, in `blockquote()`'s split, and in the
gate's local `fold`; `headings()` split on the same. Then add a CR and a CRLF variant to 31.13's `SMUGGLE`
payload and re-run — it must go red before the module fix, green after.

### F2 (Medium) — `supersedes` is the one cross-reference F5's new pass does not cover, and F2 just made it load-bearing

`discovery/prd-projection.mjs:292-309` (the new `crossRef` pass) · `:276-277` · `:377-384` · `:434` · `:492`

F5's claim is true as written: it promised `parent_id` / `evidence_refs` / `claim_ref` and delivered all
three. The gap is adjacent. `supersedes` is the same kind of value — an applier-computed seq reference re-read
from a possibly corrupted transcript, which is precisely the remit `checkOpLines` states for itself — and
**F2, in the same round, made it drive the "superseded by seq N" markers** that Success metrics and the
Evidence gap list now render. The first pass checks only that it is `null` or an integer.

**Observed**, three ways against the real module:

| Ledger | `checkOpLines` | Page |
|---|---|---|
| `supersedes: 1` where seq 1 is a `file_evidence` | ACCEPTED | `*Replaces:* seq 1 (kept in the ops)` — a decision claiming to replace evidence |
| `supersedes: 999`, no such seq | ACCEPTED | `*Replaces:* seq 999 (kept in the ops)` |
| two records both claim `supersedes: 1` | ACCEPTED | see below |

The third is the sharp one. `supersededBy` is a `Map`, so `.set(1,2)` then `.set(1,3)` is last-write-wins:

```
| 1 | business | kill 1 — superseded by seq 3 |
| 2 | business | kill 2 |                       <- superseded per the ledger, marked as live
| 3 | business | kill 3 |
```

Seq 2's kill criterion sits in the table indistinguishable from a live one. **That is F2's own failure mode —
a retracted kill criterion beside its replacement with no marker — reappearing inside F2's fix**, reachable
through the one cross-reference field this round left unchecked.

For contrast, so this is not overstated: a *legitimate* chain (A←B←C as the real applier builds it) renders
correctly — each record names its direct successor and a reader can follow it. The defect is corruption and
collision, not chains.

**Fix.** Extend the same `crossRef` pass: resolve `supersedes` like `parent_id` (must be a `record_decision`,
dangling tolerated per the existing policy), and additionally refuse a `supersedes` value claimed by more than
one line.

### F3 (Medium) — the gate index does not know group 31 exists, and three group counts are stale

`.claude/references/gates.md:11` · `CLAUDE.md:110` · `CLAUDE.md:177`

The gate prints `all 31 groups pass`. Three claims disagree, and two of them are in a file this PR edits:

| Site | Says | Truth |
|---|---|---|
| `CLAUDE.md:110` (architecture map) | `29 PURE groups` | 31 |
| `CLAUDE.md:177` (on-demand context) | `build-checks' 27 groups` | 31 |
| `.claude/references/gates.md:11` | `29 pure groups` | 31 |

`gates.md` documents up to **Group 29** — group 30 (#284, already merged) and **group 31, this PR's own new
group**, are both absent. CLAUDE.md routes the reader there with "Read before adding or changing a gate", so
the index the convention names is two groups behind.

This is sharpened by F7: this round corrected exactly this drift at `build-checks.mjs:4`
("Twenty-three groups" → "Thirty-one") and left three further instances, two of them one screen away in a file
the PR already opens. Group 30's absence is #284's debt and out of scope; **group 31's entry and the three
counts are this PR's**.

### F4 (Medium) — the PR body is stale at HEAD, and one claim in it is now false

Round 1 verified every figure at `e54ec51` and passed them. Two commits have landed since. Re-derived at
`3ae9784`:

| PR body | Says | Now |
|---|---|---|
| module size | 639 lines | **722** |
| `build-checks.mjs` diff | +380/−1 | **+507/−2** |
| group 31 cases | twelve (31.1–31.12) | **thirteen** (31.13 added; 31.7.4 too) |
| gate fixture | 9 answers, 11 ops | **10 answers, 12 ops** |
| deviation 9 | 18 refusals | **23** |
| provenance line | "All observed at `e54ec51…` (this PR's head)" | `e54ec51` is **not** the head |

**The false claim:** the body's "Pre-existing, deliberately not fixed" paragraph still says `CLAUDE.md:148`
names the wrong group. **F8 fixed it in this PR.** A reader is told a defect is open that is closed — the
"check the claim's subject, not its digits" case, in the most-read surface and the only one not in the working
tree.

**Still true, re-derived rather than assumed:** the 94-line projection, `all 31 groups pass`, and all four
rows of the body's Observed mutation table (orphan re-derived → 1, `weakAnswer` leaked → 7, clock added → 2,
Problem renders all → 1) — each re-run at HEAD and each still exact.

### F5 (Medium) — the committed report repeats those, and its embedded projection no longer matches a real run

`.claude/reports/discovery-prd-projection-290-report.md:37` · `:51` · `:108` · `:211` · `:251` · `:268`

Same staleness: "twelve cases", "eighteen refusals" (twice), "31.1–31.12", and line 268's "Noted, not fixed"
for `CLAUDE.md:148`.

The sharpest is `:108`. The report embeds "The full projection (94 lines)" as the artefact a reader diffs
against, and it still carries the pre-F2 line:

```
report:108  **Ledger** — 3 op(s): …
real run    **Ledger** (whole ledger, superseded records included) — 3 op(s): …
```

A tracked-tree sweep (`git grep` for `31.1–31.12`, `twelve cases`, `eighteen refus`, `group 28`, stale group
counts) found no other live instances — the remaining hits are prior tickets' historical reports and round 1's
own review file, which is correctly pinned to `e54ec51` and needs no change.

### F6 (Low) — two new gate assertions crash instead of failing by name

`tooling/build-checks.mjs:6123-6126` (31.7.4) · `:6080` (31.6)

`ok()` records a failure and **returns** — by design, so a broken assertion reports cleanly. Two new sites
dereference a lookup on the line after checking it, with no guard, so a falsy value throws an uncaught
TypeError that kills the run before `group("prd projection", …)` ever prints:

- `:6123-6126` — `const m = …find(…); ok(m, …);` then `questionById(m.params.question_id)`.
- `:6080` — `sectionBody(md, "Evidence").includes(…)`, where `sectionBody` can return `null`.

Neither fires today; both are latent. They are inconsistent with the correct pattern **two lines away in the
same new block** (`:6081-6084`), which wraps every such lookup in `String(…)` precisely so a falsy value
degrades to a named failure. This exact crash was hit and fixed once already while writing these commits.

### F7 (Low) — `discovery/README.md:211` understates what `visible` is

The new "Two counted sets" paragraph says the ladder sections and hierarchy counts are over "the LATEST
decision per question". The code (`:371-375`) is *the latest decision per **banked** question, plus **every
off-script decision**, each its own*. As written, the operator contract implies only one off-script decision
survives. The module header states it correctly; the README does not.

---

## Validation — all at `3ae9784`, clean tracked tree

| Check | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `build ✓  all 31 groups pass`, exit 0 |
| `node tooling/drift-check.mjs` | ✅ exit 0 |
| `node agent-layer/gen-loc-summary.mjs --check` | ✅ `3 groups — no drift` |
| `node --check` on both changed `.mjs` | ✅ clean |
| CI `verify` / `visual` | ✅ pass (22s / 1m6s) |
| Real package `--stdout` (`spine-meridian-1`) | ✅ 94 lines; only the Ledger line's label differs from `main` |
| Determinism | ✅ two runs byte-identical |
| Node-only invariant | ✅ no page, `system/`, `proto/` or `worker/` file reaches the module |
| `Closes #290` trailer | ✅ present |
| Base moved since round 1? | ✅ No (`8b6ee61` unchanged) — guarantees pass not triggered |

**Round-1 mutations, all re-driven at HEAD and all now red by name:** visible-vs-all → 5 failures ·
stage filter → 2 · Run line → 1 · Ledger line → 3 · an op param carrying an LF → 77. The fifth is the one F1
above shows is only half-covered.

## What's good

- **F5's cross-reference guard went one better than asked** — round 1's suggested fix named `parent_id` and
  `evidence_refs`; the implementation also covers `claim_ref`, and it deliberately keeps a **dangling** seq
  tolerated with a positive control asserting so, which is the right line between "corrupted" and "partial".
- **F2's gate assertions drive a real divergence** rather than asserting a coincidence: the superseded record
  is flagged to force `orphan 2` against `orphans 1`, so the Ledger line's set-naming is load-bearing instead
  of decorative. The `ok(replaced.wrong_if !== later.wrong_if, …)` guard directly forecloses round 1's
  "passes on the replacement's own block" trap.
- **F4's line numbers are the file's, not the array's.** `readJsonl` now carries `{n, value}` specifically
  because blank lines are skipped — verified on a package with a leading blank line, the refusal named line 2.
- **31.7.4 was found by asking what no assertion could see**, not by following the review text: the round-1
  report's Fix paragraph for F3 did not name mutation 2, and following it literally would have left the stage
  filter untested.
- **`cell()` rebuilt on `fold()` is byte-identical** — the two replacements commute — so no table assertion
  churned, and the real package's projection changed by exactly one line.

## Next

`piv-fix-review-findings` on **F1** (one shared line-ending regex across `fold`, `blockquote`, the gate's
`fold` and `headings()`, then a CR/CRLF payload in 31.13 — driven red before the module fix, green after) and
**F2** (extend `crossRef` to `supersedes` plus a collision refusal). **F3–F5** are documentation truth and
should land in the same commit: `gates.md`'s group 31 entry, the three counts, the PR body's six figures and
its now-false "not fixed" paragraph, and the report's embedded projection. **F6/F7** are one line each.
