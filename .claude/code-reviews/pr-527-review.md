# PR #527 review — every claim on approach.html reaches its proof in at most two steps (#497)

**Head** `229d8157d21037126e8ddb875c91a023389fb898` · **Base** main @ `ec35d6dafcfd14e2cb1bd8a905bd87bc78edc799`
**Round** 1 (no earlier review; guarantees pass not triggered) · **Reviewed in** a detached worktree at the PR head

## Verdict

**Approve (advisory comment — own PR, so no formal approval). F1 and F2 are non-blocking**: each is one manifest row
or one owner copy decision, suitable for a follow-up ticket. No Critical or High issues. Validation is green locally
and in CI. The three Medium findings are about whether individual proof targets show what their sentence says, which
the gate states it cannot check.

## Validation

| Check | Result | Provenance |
|---|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 52 groups pass` | observed (first run red on `icons` only because the fresh worktree lacked `tooling/icons` and `tooling/style-dictionary` node_modules; green after `npm ci` in both) |
| `node tooling/drift-check.mjs` | `drift-check ✓ … group-count` | observed |
| `node tooling/token-lint.mjs` | `63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` | observed |
| CI: verify · visual · codeql · CodeQL · audit · gates-green | all pass | observed (`gh pr checks 527`) |
| `tooling/ratify-journey.mjs`, Firefox/WebKit walk | not run | stated as not run in the PR body; the R7 literal change is a one-string edit |

## Numbers pass

Every figure in the PR body and report was re-derived from the head tree:

| Figure | Re-derived | Status |
|---|---|---|
| 45 blocks, 77 sentences | `node` count over `system/claim-manifest.json` → 45, 77 | matches |
| 34 claims: 3 at 0 steps, 27 at 1, 4 at 2 | → `{0:3, 1:27, 2:4}` | matches |
| 27 labels, 6 attributions, 5 definitions, 5 stances | → same | matches |
| 17 in-memory mutation cases | `grep -c 'fires("52'` → 17 | matches |
| 11 proof links added; `<a` in `<main>` 19 vs 8 | `grep -oE '<a[ >]'` inside `<main>`: 8 at base, 19 at head; 11 `+<a href` lines in the diff | matches |
| Group count 51 → 52 in five places | `CLAUDE.md:151`, `CLAUDE.md:237`, `build-checks.mjs:4`, pass line, `ratify-journey.mjs:228`; no stale `51` found | matches |

The on-disk mutation table in the report quotes real gate output shapes; not re-run here.

## Issues

### Medium

**F1 — two `card-system` claims are "proven" by a link that belongs to a different sentence** (`system/claim-manifest.json`, block `card-system`).
"Accessible markup, motion with a reason, and nothing hard-coded…" and "Colour and spacing can't drift, because there
is nowhere for them to drift to." both target `#case` at 1 step via the link in "This site is built that way (see the
case study)." Read against the page: the `#case` band does say "Nothing in the markup is allowed to name a colour"
(nothing hard-coded) and links `components.css` for accessibility defaults, but that is a second hop (2 steps, not
the recorded 1), the band's sentences are themselves claims, and nothing in it shows "motion with a reason". Fix: point them at something that shows
the claim (for example `system/components.css` on GitHub for "nothing hard-coded", the token-lint gate for "can't
drift"), or reclassify the parts that have no proof as stances.

**F2 — before/after claim proven by an "after"-only target** (`claim-manifest.json`, block `case-outcome` S1).
"Re-theming went from edits on every page to one line in each page's `<head>`." is a claim at 1 step to
`blob/main/approach.html`, which shows only the one-line `<head>`. Meanwhile `case-problem` labels the matching
"would have meant hand-editing CSS on every page" as a stance, with the reason that no pre-contract version was
committed. The two rows treat the same "before" inconsistently. Fix: either point the target at something showing
the "before" or narrow the sentence to what the target shows ("Re-theming is one line in each page's `<head>`").
Changing copy needs the owner, since P1–P14 were signed off.

**F3 — the first-click check is block-scoped, not sentence-scoped** (`tooling/build-checks.mjs:19567`,
`from.hrefs.includes(s.target)`). Any sentence can borrow a link sitting in another sentence of the same block;
F1 is exactly this case passing the gate. The PR body describes the scope as "inside the claim's own block", so this
is the stated design, not a bug, but the CANNOT REACH clause does not name it. Sweep over all 27 claims with a
non-control target at 1+ steps (`approach.html` read by hand per block): 13 own their link, 6 use a link in a named
`via` block, and 6 borrow a link from another sentence in the same block (method-lead S1, card-shape S2, card-prove S4,
method-scope S1, card-system S1 and S3). Four of the six say so in their `how` and the target does show the claim;
only the two `card-system` rows (F1) do not. So the scope is a latent gap, not a current falsehood beyond F1. Fix: add "which sentence in a block
the link sits in" to the CANNOT REACH clause (all four copies), or tighten to require the link inside the sentence's
own text range.

### Low

**F4 — `control:` targets get no page-DOM check** (`build-checks.mjs`, the `!s.target.startsWith("control:")`
branch). The control is confirmed in `param-manifest.json` only. Covered in spirit by "clicks after the first",
but a renamed `name="pack"` would leave the manifest row green. Fix: assert the selector's attribute literal exists
in `approach.html` or the module that injects it.

**F5 — `BOUNDARY_RE` splits only before an uppercase letter, quote or bracket** (`build-checks.mjs:19434`). A manifest
row that merges "Foo. 3× faster." passes the one-sentence-per-row check. Page edits are still caught by join
equality; the gap is a manifest author merging two sentences to share a proof.

**F6 — a stray close tag empties the walker's stack** (`build-checks.mjs:19466`, `while (stack.length &&
stack.pop().tag !== tag);`). An unmatched `</p>` pops every open owner, so later loose text has no owner. Plausible,
not run. Fix: `if (!stack.some(n => n.tag === tag)) continue;` before the pop.

**F7 — attribute text (`aria-label`, `title`, `alt`) is outside the walker and not named in CANNOT REACH.** Fix: add
it to the clause.

**F8 — small anchor-matching looseness.** `headingSlugs` strips `_` (GitHub keeps it, so a valid `#foo_bar` is
refused; fails closed), and the site-path fragment test uses `includes('id="frag"')`, which also matches
`data-id="frag"`.

## Documented deviations (not findings)

The `llms-txt` dfn removal, the `.claude/system-reviews` on-disk mutation instead of `prd.md`, the amended CodeQL
command, and the owner's Q1 "Retarget two, flag rest" are all in the report and the PR body. The group 47 TypeError
on a missing `prd.md` (`build-checks.mjs:17775`) is pre-existing and worth its own ticket, as the report says.

## What is done well

- Targets are repo-scoped: GitHub URLs are pinned to `linardsb/ux-factory/(blob|tree)/main/`, `.md` anchors are
  checked against real headings (fenced code skipped), and line-range anchors are refused.
- The `mutate` helper fails a case by name when its mutation does not apply, so no positive control can go vacuous.
- 52.10 pins the walker's block count to the manifest's, and `p`, `li`, headings, `figcaption`, `summary` and table
  cells each need their own `data-claim`.
- `maxSteps` lives in the gate, not only in data; non-claim rows must carry a reason and no target.
- The CANNOT REACH clause is identical across its four copies.
- The underline widening to `main p a` does not reach the CTA buttons (they sit in `div.hero-cta-row`).

## Recommendation

Mergeable as is; F1 and F2 do not block. They are the ones worth a follow-up, because this ticket's purpose is that
each claim lands on its proof; F1 is a manifest retarget, F2 needs the owner's call on copy. F3 is a one-line clause
addition in four places and pairs with F1. The Low items can go in the same follow-up.
