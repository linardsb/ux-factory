# Code Review — PR #246: ST/UX Wave 1, the strategy layer's copy (#244)

**Reviewer**: `/piv-review-pr` (fresh context, + `code-reviewer` agent deep pass) · **Branch**: `feat/244-st-ux-wave-1` → `main`
**State**: OPEN, `mergeStateStatus: CLEAN`, merge-base is main's tip — this review validates the tree that would actually merge.
**Scope**: 4 source files (+58/−11) + 6 VR baselines. Plan + report committed in-PR ✓

## Recommendation: **Request changes** — small, specific, and cheap

Nothing here is architecturally wrong. **0 critical · 0 honesty-contract · 0 accessibility · 0 token-discipline · 0 gate regressions.** Validation reproduces end to end and every acceptance criterion holds, including the one CI structurally cannot prove.

The changes I'm asking for are three sentences and one CSS declaration. I'm asking rather than waving them through for one reason specific to this PR: **the PR body states that `#216`'s trim inherits this copy as its source text.** This is a copy-only ticket — the copy *is* the deliverable — so a stranded sentence merged today gets compressed by #216 tomorrow, where it is harder to see and harder to fix. Ten minutes now, or a downstream inheritance of known-defective prose.

---

## Validation

| Check | Result |
|---|---|
| `node tooling/build-checks.mjs` | **18/18 groups pass** (re-run in this review) |
| `gen-loc-summary.mjs --check` | no drift — 3 groups |
| `gen-param-count.mjs` + `git diff` | no drift — 102 controls, empty diff |
| Term cross-check, both directions | 13 marks all resolve in `TERMS`; all 3 new keys marked |
| `data-term` counts | approach **9** · factory **7** · index **0** — as planned |
| CI `verify` / CI `visual` | **both pass** |
| VR baselines changed | exactly **6**, the expected 6 names |
| Live render, 3 pages | ready handles reached, zero page errors |

### Verified independently, beyond what the report and CI can establish

- **AC1's render half.** CI `visual` cannot prove this — the baselines were regenerated *from this tree*, so the gate is self-confirming after a regen. Measured live instead: at 1280px the four original clusters sit at `x=0/592, w=560`; `.sources-wide` is `x=0, w=1152` on its own final row. At 390px all five are 342px — the span is a genuine no-op, no horizontal overflow. **AC1 holds.**
- **WCAG 1.4.13 at runtime, not asserted.** All three new bubbles open on keyboard focus, set `aria-describedby="glossary-bubble"`, render at 149px, dismiss on Esc. (My first probe reported all three dead — that was the probe racing `glossary.mjs:132`, which hides on `scroll` by design while `.focus()` scrolls into view. Recorded trap #196. Re-probed with scroll settled.)
- **The DGUI claim is true of what it sits beside** — `studio-compile.mjs:57` imports `renderComposition`, `:176` fetches `vocabulary.json`, `:120` reports "validated against the generated component vocabulary".
- **The `#sources .sources-wide` selector matches** — `#sources` is the section at `approach.html:201`, the div at `:226`.
- **The paragraph split is structurally safe** — `.beat-lead` carries no structural CSS selector (`+`, `~`, `:first-of-type`) and is queried by no JS.
- **The mobile no-op is real in the CSS, not just in the render** — `.grid-2` collapses to `1fr` at `max-width: 900px` (`components.css:594-596`); spanning `1 / -1` of a one-column grid is normal flow.
- **Attribution holds** — the research doc pre-cleared Spool + Wroblewski ("the talk is by a Progress Software advocate, NOT Wroblewski"); "Yes, And" credited to Leslie Jensen-Inman; no five-pillar speaker named; Crawford not used.
- **`<style>` after `pack-boot.js` in approach's head is pre-existing on `main`** (as in `work.html` / `factory.html` / `build.html`) — not introduced here.

---

## Issues

### High — 2

Both are the same defect class, both in `factory.html`, both introduced by inserting a sentence into the *middle* of an existing paragraph. Worth saying plainly: the author already knew this hazard — report deviation 7 documents fixing exactly it in the studio lead ("Each block **it** leaves behind" → "**the run**"). These two instances were missed.

**H1 · `factory.html:215-219` — "plays it again" now collides with a nearer, wrong "it"**

Before this PR the two sentences were adjacent, so the pronoun reached cleanly back to the compile step:

> …in the slot you left it in. *Back to blocks* plays **it** again.

The DGUI sentence is now wedged between them, and it ends on its own "it" with a *different* referent:

> …in the slot you left it in. What that step runs is declarative generative UI: the screen is proposed as data, then validated against the generated component vocabulary before any of **it** renders. *Back to blocks* plays **it** again.

This is a collision, not merely distance: "the screen" is now the freshest candidate, and "plays" doesn't fit it — you don't *play* a screen. The intended referent is two sentences back. It also interleaves a tangent into three consecutive compile-mechanics sentences.

*Fix (preferred)* — move the DGUI sentence to the end of the paragraph. This restores the original adjacency and keeps the naming beside the exhibit it names, as the ticket requires:

> …in the slot you left it in. *Back to blocks* plays it again. What compiles is one screen's components, not a flow between screens. What that step runs is declarative generative UI: the screen is proposed as data, then validated against the generated component vocabulary before any of it renders.

*Minimal alternative* — leave the order and replace "plays it again" with an explicit noun ("runs the compile again"). Fixes the collision but not the interleaving.

**H2 · `factory.html:366-371` — "Every one of them" separated from its antecedent**

The inserted outcome sentence sits between the three-artifact list (file / pack / link) and the sentence that refers back to it. After the insertion the nearest noun phrases are "an engineer" and "what you just took", both singular — a plausible-but-wrong stand-in sitting closer than the real antecedent.

*Fix* — move the outcome sentence to the end of the paragraph, restoring "them" next to its list:

> A file that runs on its own, the handoff pack for this board, and a link that rebuilds all of it — including where you put each block. Every one of them is assembled in your browser from the same sources this page renders. Nothing is uploaded, and there is nowhere to upload it to. The outcome the method points at is this: an engineer can start building from what you just took.

This also closes the card on its outcome, mirroring how approach's "Shape it" card ends.

> **On baselines for H1/H2:** both are reorders within one paragraph at unchanged total length, so heights probably don't move — but check rather than assume, given how careful the rest of this PR was about exactly that trap.

### Medium — 2

**M1 · `approach.html:31` — the spanning cluster lost its measure cap and nothing replaced it**

The four original clusters never needed a `max-width`: the `.grid-2` column supplied one structurally at 560px ≈ **56ch**. `grid-column: 1 / -1` removes that constraint without substituting one, so the fifth cluster's prose sets at **115ch** — measured live at 1280px.

That is 1.8× `.max-prose`'s `65ch` (`components.css:621`, used on 8 pages) and 1.5× the widest per-component cap in the repo (`76ch`). `components.css` applies a measure cap roughly twenty times. This is the one place in the diff that adds body prose, and the only one with no cap.

The PR body records "the longest list gets the widest measure" — a good call, and I'm not disputing it. But *widest* was the decision; *115ch* is an unquantified consequence, and no number appears in the plan or the PR.

*Fix* — one declaration in the rule already being added:
```css
#sources .sources-wide { grid-column: 1 / -1; max-width: 76ch; }
```
`76ch` preserves the recorded rationale (still visibly the widest cluster, still wider than the 56ch siblings) while landing inside the repo's own band. **Cost, stated honestly: this churns `approach-neutral.png` + `approach-saulera.png` and needs a regen in the same push.**

**M2 · `approach.html:147-150` — the same insertion pattern, plus a scope mismatch between the term's two landings**

"And no framework, no build step: plain HTML and CSS." originally continued from "Those roles are semantic tokens." The steering-layer naming now sits between them, so the "And" reads as continuing from "…where neither a person nor an AI agent can drift from it."

Separately, in the same sentence: "The industry name for **a rule like this**" points at a bubble that defines a *layer* — "the token contract, the component rules, the checks", three things. The two landings of one term disagree on scope.

*Fix* — put the naming sentence last in the card, and widen the noun: "The industry name for encoding intent this way is a **steering layer**: …".

### Low — 2

**L1 · `index.html` — the plan's Task 5 was partly not executed, and the report doesn't say so**

Plan Task 5 (`.claude/plans/…-244.md:227-229`) named three targets: the close-card line, the handoff-pack takeaway (`index.html:314-317`), and the /build takeaway (`:328-334`), the last two "light touch." Only the close-card line changed — `git diff --stat index.html` → `1 insertion, 1 deletion`. The report's seven-item deviation list doesn't mention the reduction.

Nothing is broken: AC2 is satisfied by the close-card line alone, and the plan itself said "keep edits minimal; #216 will compress this page later." The real consequence is narrower — Task 11's post-merge note tells #216 that "home's close card … [is] now outcome-framed", so #216's author could reasonably assume those two paragraphs were already treated.

*Fix* — not code. One line in the report's deviations (or in the #216 comment when posted) noting the two takeaways were deliberately left, so #216 picks them up fresh.

**L2 · `factory.html:209-210, 218` — source formatting in the split lead**

The split left `it.` orphaned on its own line mid-phrase, and line 218 overruns the file's wrap width by ~15 columns. Rendered output is identical (HTML collapses whitespace) — tidiness only, in an otherwise carefully wrapped file. H1's reorder is a natural moment to re-wrap both.

---

## Judgment calls, examined and resolved as-is

**"Management flight simulator" — adequate, no change.** Measured against the strict Morecroft/Senge sense (a model whose consequences vary with your decisions), the exhibit is a fixed replay plus a direct-manipulation canvas and doesn't quite deliver that. But that's the wrong bar: what this repo's honesty contract polices here is replay-not-live, and against that bar the sentence is disciplined. "A real recorded agent run … played back" lands two clauses before the term; "illustrative rather than predictive" lands immediately after (`factory.html:200-205`); the glossary repeats it (`glossary.mjs:62-63`). Both AC-required landings carry the word. A reader cannot come away thinking something live is running underneath. This was pre-authorized by the epic and documented — re-opening it would be re-litigating a decided call.

**Steering-layer's "where neither a person nor an AI agent can drift from it" — no finding.** I went looking for a `components.css` literal-colour lint to back an absolute "cannot drift" and there isn't one. But the sentence is locative, not an enforcement claim: intent encoded in a *place* such that work done there doesn't drift — the same structural claim as the pre-existing sibling sentence one card earlier ("there is nowhere for them to drift to", unchanged here). The glossary's own wording is more measured still ("stays on brand without asking"). Consistent and intentional.

---

## What's genuinely well done

- **The gate is real, and it came free.** Three `TERMS` entries buy a true integration test: `initGlossary` validates every mark *before touching the DOM* (`glossary.mjs:66-71`), and both pages' VR ready handles sit downstream — a typo'd key means the handle never fires and CI goes red. A data edit that ships with its own test and zero new code is exactly the right shape.
- **The guardrail was honoured.** The epic's tripwire is "if a slice starts growing a subsystem, cut to the reframing." Zero new files, zero modules, no `analytics.mjs` edit, zero `param-manifest.json` entries — and the plan states *why* each is owed nothing rather than merely omitting it.
- **The placement call is right for a non-obvious reason.** The span rule goes in approach's inline `<style>`, not `components.css`, where a consumer block would propagate into `system-graph.json` → `inspect-data.json` → factory's baseline. Reasoning recorded next to the rule.
- **The stale comment was narrowed, not deleted.** `approach.html:22-23` used to claim the whole block had "no at-rest visual effect" — false once the span rule joined. It was scoped to "These two rules", and the new rule makes no such claim. The surgical, honest edit.
- **A capability claim was checked, not asserted.** The DGUI sentence was verified against `studio-compile.mjs` before shipping — the honesty contract working as designed.
- **The `<dfn>` marks match the existing idiom attribute-for-attribute** — same attributes, same order. No accessibility gap.
- **Glossary entries are in-register**: 36–39 words against the existing eleven's 19–37, deliberately compressed from 48–55-word drafts because "length is where pedagogy leaks in."
- **Deviations are honest and mostly self-correcting** — six of seven tighten the plan's own drafts against constraints the plan set, including one where the drafted text would have failed the plan's own `illustrative` AC.
- **Baseline discipline**: `rm` before `update:docker` (defeating the sub-perceptual skip), clean detached worktree, exactly six changed, height deltas all positive.

---

## Suggested order of work

1. **H1 + H2 + L2** — one `factory.html` pass; reorder both paragraphs and re-wrap. Verify paragraph heights locally before deciding factory's baselines are safe.
2. **M1 + M2** — one `approach.html` pass. M1 requires regenerating `approach-neutral.png` + `approach-saulera.png`; M2 rides along free.
3. **L1** — one line in the report, or fold it into the Task 11 comment.

Then re-run `build-checks`, both drift checks, and `gh pr checks`.

Task 11 (the `#216` inheritance note) remains correctly scoped post-merge — confirm the merge actually landed before posting it.
