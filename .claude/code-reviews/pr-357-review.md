# Review — PR #357: the full-depth run lands (allergen-matrix-1)

**Head** `57fa9b61f3faed16f70a64e65522318ea2716864` · **Base** `main` @ `6ee6da7887e866a34252c15ed3b433762771d8ae`
· **Round** 1 (no prior report — the guarantees pass does not apply) · **State** OPEN, CLEAN

**Independence disclosure.** This PR was authored in the same session that is reviewing it, so the
author's context cannot be the gate. The deep pass and the numbers pass were each dispatched to a
separate agent with no knowledge of why any choice was made; both re-derived from the committed files
rather than reading the claims. Every finding below came from one of them or from a check run here
against the code. Two of the four are the author's own errors.

**Recommendation: request changes.** Two Medium findings, zero High or Critical. Both are one clause in
one file. Nothing functional, nothing about privacy, nothing about the package itself — which survived
everything thrown at it.

## Summary

Commits a real 30-question `full-discovery` drawer session recorded 2026-08-31 (`fictional`, so
`discovery/<slug>/` is its root under R1) plus its documentation. The package was interrogated hard and
holds:

- `prd.md` **re-projects byte-identical** from `prd-projection.mjs --stdout`, reproduced independently
  twice, and a mutation to `a1`'s text changed the output — so the projector genuinely folds the package
  rather than echoing the file.
- All 30 committed op lines **re-fold through the live `applyOps`** over the committed answers and the
  real bank with **zero mismatches**, and `auditParenting` reports `eligible 25 · missed 0 · structural 0`.
- The 30 `question_id`s are the exact `DEPTHS["full-discovery"]` set **in exact order** — a genuine
  full-discovery run, not a relabelled partial one.
- **The authenticity signal nobody thought to plant.** The 15 `denied` lines carry the *pre-#287* deny
  text ("no write tools **and no read tools**"). Today's `denyReason()` says something else entirely
  after the read-fence rewrite. A fabricated transcript does not incidentally get a retired sentence
  right, and it matches the same-era `instrument-loans-1` and `bracket-trace-1` packages.
- Timestamps monotonic throughout, with a cache-read/creation inversion at t4→t5 lining up against a
  >5-minute inter-turn gap — real prompt-cache TTL expiry, not simulated structure.
- `answers.jsonl` read in full: fictional restaurant group, fictional product, fictional personas. The
  only real-world references are public ones (Natasha's Law, the FSA). **No PII, no real business detail.**

All sixteen numeric claims were re-derived and **all sixteen confirmed**, including the ones most likely
to be wrong: the 30 turn ids are distinct so the cost sum does not double-count (the trap this repo has
hit before), and the 15.5 s median holds under both the lower-middle and averaged-middle conventions.

## Issues

### F1 — Medium · a false inventory claim, ships into permanent prose

`discovery/README.md:352` (new) · repeated in the PR body

> "It is committed as the depth exhibit — **every other package is `opening-set`**"

False. `discovery/spine-meridian-1/run.json` is `"depth": "scope-check"`, tracked on `origin/main` since
`6b50181`, long before this PR. Depths of the five committed packages, re-derived:

| package | depth |
|---|---|
| allergen-matrix-1 | full-discovery |
| bracket-trace-1 · bracket-trace-2 · instrument-loans-1 | opening-set |
| **spine-meridian-1** | **scope-check** |

The PR body makes the same universal claim in its second paragraph and then, two paragraphs later,
names `spine-meridian-1` as a known gap. A single PR body contradicting itself is one thing; the
sentence is also going into a README that is the format contract, where a reader checking the one
sibling directory the PR itself names will find it false immediately.

**Fix:** scope the claim to what is true — "no other committed package reaches this depth", or "the only
full-discovery package". Both hold.

Judged and **not** a finding: leaving `spine-meridian-1` out of the "## Files" listing. It has no
`prd.md`, does not fully conform to the File-shapes contract, is a pre-#279 spike, and the README has
never mentioned it. That omission is pre-existing and not made worse here — the prose claim is the defect.

### F2 — Medium · the new section collides with §The parenting fixture, and only because it lands

`discovery/README.md:358-362` (new) against `:303-308` (pre-existing, untouched)

The existing text says the full-depth rehearsal "filed `parent_id: null` on **18 of 18** eligible
decisions" and had "0 `file_evidence` ops over **30 substantive answers** (#338 F6)". The new section
describes a full-depth run with **30 answers**, **zero `file_evidence`**, citing **#338 F6** — and
`parent_id` filled on **25 of 30** with zero orphans.

Same answer count, same citation, same evidence outcome, **opposite parenting result**. They are in fact
two different runs — the rehearsal is `my-product-name`, recorded before #341 and living under
`JOBS_DIR`, never committed — and the 18-eligible figure does not match this package's 25-eligible
audit. But nothing on the page says so, and the collision exists only once this section lands beside
the old one. A reader lands on a README that appears to contradict itself about whether parenting works.

**Fix:** one clause, e.g. "(not the pre-#341 rehearsal named in §The parenting fixture, which filed null
on 18 of 18 eligible and was never committed)".

### F3 — Low · four figures in the PR body sit under the wrong provenance

The PR body tags its table `(observed)` / `(derived)`. Four tags are wrong:

- **"39 min · $1.683 over 30 turns (observed)"** — both are *derived*. 39 min is `endedAt − startedAt`;
  $1.683 is a sum of 30 floats (`1.6829366`) rounded. Neither is stored anywhere.
- **"30 of 30 (observed)"** — the numerator is observed; the **denominator comes from `bank.mjs`**, a
  file outside the run package.
- **"30 turns"** — a unit choice stated as a fact. It is `turnStats.length`; every entry carries
  `numTurns: 2`, so the SDK turn count is **60**.
- **`df6fbc35`** — an 8-character truncation of `df6fbc35a5d91537dc417288b67c123e`, written as the value.
  (The truncation is a correct prefix, and "not today's" is right — the live fingerprint is `7efdde37`.)

Correctly tagged: the latency triple as `(derived)`, `Failed turns 0` as `(observed)`. Low rather than
Medium because every digit survived re-derivation and nothing downstream de-scopes work on them — but
the PR body is the most-read surface and the only one not in the working tree, which is exactly why this
gets written down rather than waved through.

### F4 — Low · "full-width" and "full-depth" are now one letter apart in meaning

`tooling/build-checks.mjs:6531` and group 31's description string

Both say a full-width run package "does not exist until #289 lands", which is why group 31's fixture is
hand-authored. That claim **survives** this PR — checked, not assumed: "full-width" means the op-verb
grammar, and #289 delivers the three affordances that file `open_question` and `file_evidence`. This
package is 30 × `record_decision` and nothing else, so it cannot exercise the projection's other
sections.

But the README now calls it "the FULL-DEPTH exhibit", and a later reader who reads the two terms as
synonyms may try to retire group 31's hand-authored fixture in favour of it. The swap would fail, and
the comment gives them no way to see why in advance.

**Fix (optional, in either file):** one clause distinguishing width (the verbs) from depth (the questions).

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `build ✓ all 32 groups pass` (observed, re-run on the PR head) |
| `node tooling/drift-check.mjs` | ✅ twelve checks (observed) |
| `prd.md` vs `prd-projection.mjs --stdout` | ✅ byte-identical, reproduced twice, mutation-tested (observed) |
| 30 op lines re-folded through the live applier | ✅ zero mismatches; `eligible 25 · missed 0 · structural 0` (observed) |
| question ids vs `DEPTHS["full-discovery"]` | ✅ exact set, exact order (observed) |
| all 16 numeric claims re-derived from the files | ✅ 16 of 16 confirmed (observed) |
| `answers.jsonl` read in full for PII / real detail | ✅ none found (observed) |
| GitHub `verify` / `visual` | ✅ both pass |

**No gate reads this package** and that was verified rather than inferred: `allergen` has zero hits in
all of `tooling/`; group 32 uses one slug literal, `instrument-loans-1`; there is no `readdirSync` over
`discovery/` anywhere in `tooling/`; and `gen-loc-summary`'s three group regexes were **executed**
against the four new paths (zero matches) behind passing positive controls, so no baseline moves.

One precision note on the README's wording: "group 32 names `instrument-loans-1` and nothing else" is
true *of group 32*. build-checks as a whole names four other slugs — all in slug-guard strings and
comment prose, never a read.

## Base

`main` has advanced to `db73ec9` since this PR opened (#355 and #356 merged). Both are documentation-only
and touch no file this PR touches; the PR is still CLEAN. No prior review round exists, so the
guarantees pass does not apply.

## Recommendation

**Request changes**, narrowly. F1 puts a false sentence into the format contract and F2 makes that
document read as self-contradicting — both ship, and both are one clause. F3 is PR-body only and F4 is a
note for whoever next touches group 31.

Everything the review was actually worried about came back clean: the package is a real server-written
session, its provenance genuinely routes it here, its numbers all hold, and it carries no private
information. The two defects are in prose the author wrote about it, not in the evidence itself — which
is the expected failure mode when the author of the artefact also writes its documentation, and the
reason this review was dispatched rather than self-performed.

---

## Round 1 outcome

**F1 and F2 fixed** on `discovery/README.md` in this PR:

- F1 — the universal claim is now scoped and names the exception: "no other committed package reaches
  this depth (three are `opening-set`, `spine-meridian-1` is `scope-check`)". The PR body's copy of the
  same sentence was corrected too.
- F2 — a new bullet says outright that this is **not** the rehearsal §The parenting fixture describes,
  and names what distinguishes them: that one ran before #341, filed `parent_id: null` on 18 of 18
  eligible, and lives under `JOBS_DIR` as `my-product-name`, never committed.

F3 (PR-body provenance tags) corrected in the body. F4 left as written — the "full-width" claim is true
as it stands, and rewording group 31's comment is a change to a file this PR does not otherwise touch.

Gates re-run after the fixes: `build-checks ✓ all 32 groups pass` · `drift-check ✓ twelve checks`.
