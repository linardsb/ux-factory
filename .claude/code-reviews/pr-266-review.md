# Review — PR #266 · `feat(218): the studio inspector docks the generated component docs`

**Branch:** `feature/studio-inspector-docs-218` → `main` · **Closes #218**
**Reviewed at:** `6caea7f` · `mergeStateStatus: CLEAN`, 0 commits behind `origin/main`
**Verdict: approve with notes.** No critical or high issues. Every finding below is comment/claim
accuracy — nothing behavioural, nothing that changes a rendered pixel or a gate's outcome.

---

## Summary

This is a second mount of an existing renderer, and it stays one. `renderComponentDocs` is imported
and called with the same `prepareHandoff(pack, vocab, graph)` join `/components` runs; the only
behaviour the second mount needed is a heading-level shift, spent out of the `opts` pocket #215
reserved for exactly this; the compaction is a CSS class the caller adds. I verified the "one source"
claim mechanically rather than reading it — see *What's genuinely good* below.

The two invariants the ticket rests on (the join's arity, the lazy rule) are both invisible to every
gate that existed before it, and both were extracted into pure functions specifically so CI can hold
them. That is the right shape, and the gate pair genuinely covers what its prose claims.

The three findings the PR body reports are all real and all handled well — in particular finding #2,
a mutation that stayed green twice and was written up as a finding about a *claim* rather than
quietly dropped. Two of the three comments that claim corrected. The third is Medium 2 below.

---

## Issues

### Medium

**M1 · `system/studio-docs.mjs` cites the wrong build-checks group, six times**
`system/studio-docs.mjs:21, 32, 65, 72, 133, 147` — all say **"build-checks group 22"**. The gate is
**group 23** (`tooling/build-checks.mjs:4414`, `group("studio docs", …)` at `:4623`). Group 22 is a
real, different gate — the canvas selection (#217) — so a reader following the pointer lands
somewhere plausible and wrong.

This is a sweep miss, not a misunderstanding: the PR's own report documents the renumber as
deviation #1 (`.claude/reports/studio-inspector-docs-218-report.md:188-191` — "#217 landed group 22
between…"), and `CLAUDE.md`, `tooling/build-checks.mjs` and `tooling/studio-journey.mjs:4331` all say
23 correctly. Only the module's own header — the first thing a future editor reads, and the file that
routes them to its gate — was left behind.

It matters more here than it would elsewhere because this module's header explicitly operates the
"each gate states what the other owns" contract by group number.

*Fix:* `sed -i '' 's/build-checks group 22/build-checks group 23/g' system/studio-docs.mjs`
(and line 21's `group 22 goes red the day they stop agreeing` in the same pass).

---

**M2 · `tooling/studio-journey.mjs:4509-4514` asserts the claim this PR disproved**
The comment above assertion 6b's `/components` half reads:

> deleting it from catalog.css leaves /factory green and **breaks /components silently**. This is
> that mutation's **real detector**.

That is the hypothesis the mutation drill was run to test, and it **failed**. Report row 6
(`.claude/reports/studio-inspector-docs-218-report.md:142` and the "Row 6 is a finding about a CLAIM"
section): this assertion was added *specifically* as the stronger detector, re-run, and **stayed
green** — because nothing in `system/catalog.css` gives `.cat-code` a `display`, so the UA
`[hidden] { display: none }` already wins unaided, on both pages.

`system/catalog.mjs:364-369` and `system/catalog.css:24-40` were both corrected to say exactly this,
plainly ("no gate can catch its removal today"). The gate file's own comment was not — so the repo
now states both the true and the disproven version, and the disproven one sits in the file a future
editor consults when deciding whether the rule is safe to delete.

This is not a chronological artifact. Both the "real detector" sentence and `catalog.css`'s
correction landed in the **same commit**, `5c5aa5f` (`git log -S` on each) — so the two contradicting
statements shipped together, and the wrong one is the one in the gate file. The report's row-6
writeup (`bf1fdb8`) later sided with the corrected version and left this untouched.

This is precisely the recorded *"the check that cannot fail"* failure mode: an assertion described as
a detector for something it cannot detect. The **assertion itself is fine and worth keeping** — it
truly proves exactly one of many code panels paints on `/components`, which the chromium run
confirms. Only the claim about what its deletion would catch is wrong.

*Fix:* reword `:4509-4514` to match `catalog.css`'s corrected text — the rule is defence in depth,
this assertion pins the *painting* behaviour, and **no gate catches the rule's removal today**.

### Low

**L1 · `system/catalog.css:21-23` — two wrong claims in newly written text**
> "renderMarkdown has exactly one caller in this repo's shipped modules (catalog.mjs:434), so those
> rules reach nothing but this renderer's own output on either host page."

Both halves are wrong. The call site is `system/catalog.mjs:468`, not `:434` (shifted by the
`headingTags` addition in this same PR). And it is not the only caller —
`system/handoff-viewer.mjs:287` calls the same exported `renderMarkdown` to render `/handoff.html`'s
`.hv-docs` sections.

The **conclusion still holds**: I checked, and `handoff.html` carries its own `.hv-*` rules in a page
`<style>` (`handoff.html:93`) and does not link `catalog.css`, so there is no leak. But the premise
as written is false, and this is new text, not inherited.

*Fix:* correct the line number and reword to something like *"one caller among the pages linking this
sheet (catalog.mjs:468); handoff-viewer.mjs:287's own call renders onto /handoff.html, which carries
its own separate copy of these rules and does not link this file."*

**L2 · this PR orphans two accurate cross-references in `system/studio.css`**
`factory.html`'s `[hidden] { display: none !important; }` moves from **line 79 → line 91** (the
`catalog.css` link plus its comment block push it down). `system/studio.css:878` and `:917` both cite
*"factory.html:79's `[hidden] { display: none !important }`"*. Both were accurate on `origin/main`;
line 79 is now `.stu-import-col`.

*Fix:* update both to `factory.html:91`.
(For scope: `system/derivation-roundtrip.mjs:330,344`'s `factory.html:429-455` refs are also stale,
but they were already stale on `origin/main` — not this PR's to fix.)

**L3 · informational · `destroy()` cannot dispose the `watchPackSwap` observer**
`system/studio-docs.mjs:338-348` aborts the delegated listeners, strips the decoration and empties
the mount, but the `MutationObserver` started at `:287` outlives it — `system/catalog.mjs`'s
`watchPackSwap` calls `.observe()` and returns nothing, so there is no disposer to call.

Inert in shipped code: `mountStudioCore` runs once per page load with no re-mount path, and nothing
calls `docs.destroy()` (the same posture `studio-keep.mjs` and `studio-method.mjs` already have). Not
a regression. Worth either a one-line note that `destroy()` is shape-matching rather than a complete
contract, or having `watchPackSwap` return its `disconnect`.

---

## Validation

Run independently on this branch, clean tree:

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ **all 23 groups pass** (incl. new `build studio docs`) |
| `node tooling/drift-check.mjs` | ✅ syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay |
| `node agent-layer/gen-param-count.mjs --check` | ✅ 117 controls — no drift |
| `node agent-layer/gen-loc-summary.mjs --check` | ✅ 3 groups — no drift |
| CI `verify` / `visual` | ✅ / ✅ (`gh pr checks 266`) |
| `node tooling/studio-journey.mjs chromium` | ✅ **435 passed, 0 failed** — independently reproduced, matching the PR's reported chromium count exactly (incl. all 28 new `docsPass` rows) |
| CSS extraction fidelity | ✅ **verified mechanically** — comment-stripped diff of `origin/main:components.html`'s `<style>` vs `system/catalog.css` shows *zero* changed declarations; the only delta is the 14 documented `.cat-compact` lines |

Browser journeys are operator-run, not CI. I re-ran `studio-journey` on chromium against my own
`serve.mjs` (verified serving this tree, not a stale parallel one) and reproduced the author's count
exactly. The remaining engine/journey rows are taken from the PR's report as author-run:
`studio-journey` firefox 431 / webkit 431, `catalog-journey all` ✓ 32/0 ×3, `build-journey all`
✓ 157/0 ×3, `vt-verify all` ✓ ×3.

---

## What's genuinely good

- **"One source" is verified, not asserted.** I diffed the extracted stylesheet at declaration level
  rather than trusting the "moved verbatim" claim — it holds exactly. `renderComponentDocs` really is
  one code path: `headingTags`'s absent-`level` default resolving to `{h2, h3}` is what keeps mount 1
  byte-identical, and group 23 pins that default explicitly rather than leaving it implied.
- **The compaction is a class, not a `compact` branch.** This is the decision that keeps the second
  mount from becoming a second renderer, and it was held.
- **Finding #2 is the best thing in this PR.** A mutation stayed green, was re-run against a
  deliberately stronger detector, stayed green again, and was written up as a finding about a *claim*
  — then two standing comments were corrected against it. That is the repo's own discipline applied
  to the repo's own prose. (M2 is only that the sweep stopped one file short.)
- **The pointer defect was measured, not guessed.** Establishing the canvas-column overflow as
  identical on `origin/main` before fixing it is what separates "fixed a bug I introduced" from
  "found a latent one" — and the `z-index` rather than a column narrowing is the change with no
  at-rest geometry and no baseline argument attached.
- **The gates are not vacuous.** `decoration.rendered > 0 &&` guards the vacuous-zero; the `else`
  branches at `:4461` and `:4487` fail loudly rather than skip; code panels are read as **computed
  display** rather than the inert `hidden` attribute; assertion 5 is deliberately ordered *before*
  the pack swap with the two-document `getComputedStyle` reason stated; and 1b asserts a per-url
  **delta** (correct — `vocabulary.json` and `system-graph.json` have other consumers on the page)
  while pinning `pack.json`, which has none, at exactly 1.
- **`inspector.activate(panelIndex, false)`** and the assertion at `:4458` that detects flipping it —
  the one regression that would make the keyboard route unusable while leaving every other assertion
  green.
- Stacking traced clean: the inspect bubble is a top-layer popover, the dock and ⌘K palette are
  body-appended on `components.css`'s own fixed-chrome ladder, and the canvas's z-indexed internals
  are confined by the stage's clipping.

---

## Recommendation

**Approve with notes.** Nothing here blocks a merge: no correctness, lifecycle, accessibility or
stacking regression, all CI-runnable gates green, and the diff matches its stated intent.

M1 and M2 are worth a follow-up commit before merge — both are one-line-per-site edits, and both are
the kind of stale pointer this repo pays for later, since comments here are load-bearing navigation
rather than decoration. M2 especially: leaving the disproven "real detector" sentence in the gate
file undoes part of what finding #2 was worth.

*(Posted as a comment rather than a formal approval — solo repo, self-approval is unavailable.)*
