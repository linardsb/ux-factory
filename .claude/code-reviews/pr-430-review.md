# Review — PR #430 · feat(system): stack + text through the full chain, and renderMarkdown links (#301)

**Head** `71ca6ea` · **Base** `main` @ `11e1cef6a8e2032d8d70b5336dd9b9a99fa90c3e` · **Round** 1
(no prior review report → the guarantees pass does not apply; base == merge-base, the branch is not behind `main`)

## Recommendation: approve

No critical or high issues. Every gate runs green, every artifact figure re-derives, and the two new
components come through the whole admission chain with gates that were mutation-tested. Six findings,
all Low or Medium and **all documentation or follow-up** — none is a change to shipped behaviour and
none blocks.

The author's own stated gap stands and I have not absorbed it: **task 28's human eyeball in Safari /
Chrome stable was not run.** The Playwright stand-in across three engines is a good substitute and it
carries a negative control, but the 5-minute human look on `/components` is still worth having before
merge.

---

## Validation — all observed at this HEAD

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `build ✓  all 34 groups pass` |
| `node tooling/token-lint.mjs` | ✅ `63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| `node tooling/drift-check.mjs` | ✅ syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count |
| `node tooling/catalog-journey.mjs all` | ✅ chromium **33** / firefox **32** / webkit **32** passed, 0 failed |
| CI `verify` · `visual` · `codeql` (both legs) · `audit` · `gates-green` | ✅ all pass on this HEAD |

`catalog-journey` is the one claimed gate that CI does not run, so it was re-run here against a serve
verified to be reading *this* tree (`curl /system/components.css` → 27 `ds-stack` hits — cf.
`stale-serve-wrong-tree`). Its per-engine counts match the PR body exactly.

---

## Findings

### F1 · Medium — the M3 mutation row says "reddened nothing". It reds 30 assertions.

`.claude/reports/stack-text-primitives-rendermarkdown-links-301-report.md:89` · `:96` · `:113–117`,
and the same two sentences in the PR body's Validation section.

The report states: *"18 rows below; 17 reddened a named case, **M3 reddened nothing** and says so"*,
with the M3 table cell reading *"(no failure — see note)"*.

**Observed.** Detached worktree at `71ca6ea`. Control first: `node tooling/build-checks.mjs` →
`build ✓ all 34 groups pass`. Then the mutation exactly as the report describes it — the split's link
alternative loosened to `\[[^\]]*\]` at `system/handoff-viewer.mjs:166` — and the same command:

```
build docs chain ✗  30 failure(s)
    · expected an <a>, got 0 — the link branch did not fire
    · the link's text is undefined, expected "a"
build ✗  30 failure(s)
```

**The narrow claim is true, and I confirmed it independently.** Driving `renderMarkdown` directly under
a DOM stub, original and M3 both render `[0]` as literal text with zero `<a>` elements. So *"M3 does not
redden the bare-`[` case"* is correct, and M3b is genuinely what reddens that one.

**What is wrong is the sentence around it.** M3 reds a *different* case — the positive link assertion at
`tooling/build-checks.mjs:4095` — because loosening the split makes `[docs]` split out on its own, so the
`](href)` tail never reaches the link branch and a valid `[a](https://x.test/p)` renders no link at all.
The real result is **18 of 18 mutations red**, one of them not where the plan predicted.

Why it matters past the arithmetic: the note's conclusion (*"defended in depth by two independent
guards"*) stays true, but *"M3 reddened nothing"* invites the opposite inference about the split regex —
that its link alternative is not load-bearing. It is the only thing that makes a link render, and a later
ticket loosening it for a bare-`[` reason would break every link with the mutation table apparently
blessing the move.

**Fix — documentation only, no code change.** Change the M3 cell to the failure it actually produces
(`expected an <a>, got 0 — the link branch did not fire`, 30 failures in `docs chain`), change
`17 observed red by name` → `18`, and reword the note to "M3 reddens a *different* case than the plan
predicted; M3b is what reddens the bare-`[` one." Same two sentences in the PR body.

### F2 · Low — two PR-body figures disagree with the diff.

- *"23 files, +2787 / −35"* — `git diff --numstat origin/main...HEAD` sums to **+2788 / −35**, and
  `gh pr view` reports `additions: 2788`. Off by one. (`changedFiles: 23` ✅.)
- *"+351 in `build-checks.mjs`"* — actual **+341 / −10**. 351 is additions + deletions presented under
  a `+`-means-additions heading.
- *"+84 in `components.css`"* ✅ correct (84 / 0).

### F3 · Low — the header's `73` and build-checks' `85` count different populations, with nothing saying so.

`system/handoff-viewer.mjs:163` says *"keeps the **73** bare `[` across the committed specs rendering
exactly as they did before links existed"*. `tooling/build-checks.mjs:4281`, added in the same diff,
says *"the **85** `[` in system/specs"*.

**Both are correct, and I am recording the reconciliation rather than the finding I first wrote.**
Measured: `git grep -o '\[' origin/main -- 'system/specs/*.md' | wc -l` → **73**; at HEAD → **85**; the
12 new ones are this PR's own `stack.md` (8) and `text.md` (4); `](` across `system/specs/*.md` → **0**
at HEAD. So 73 is exactly the pre-link population — which is the population that sentence is about,
since the new 12 never rendered "before links existed" — and 85 is the whole current set, which is what
the gate iterates. `73 + 8 + 4 = 85`.

What remains is a clarity cost, not a false figure: a reader grepping the count finds two numbers three
files apart with no signpost, and CLAUDE.md makes the header the specification. One clause fixes it —
*"the 73 bare `[` that the 21 pre-#301 specs carry"*. Or drop the digit: it moves with every new spec,
and build-checks already computes it.

### F4 · Low (follow-up, not a change to make in this PR) — `card` and `empty-state` still pass `[]`.

`system/agentic-renderer.mjs:411` (`card`) and `:458` (`empty-state`) render their one child as
`TEMPLATES[child.name](child.props ?? {}, [], bus, …)` — a hardcoded `[]`. `stack` at `:436` correctly
passes `child.children ?? []`, and its comment names this exact trap.

**Latent today, and the PR body is right that it is.** Verified against the regenerated vocabulary:
`card.children` = `["metric-tile","list-row","sequence-step"]` and `empty-state.children` =
`["ghost-button"]` — every one a leaf; the containers in the vocabulary are `card`, `care-task-row`,
`empty-state`, `plant-card`, `stack`, and none of those appear in either list. So nothing drops today.

**But the epic just raised the odds.** `stack` is now composable and `stack.md` documents widening a
`children` list as *"one line here plus a regeneration"*. The day `card.children` gains `stack` — a very
natural move for #302 — every grandchild inside that card vanishes with **group 3 green throughout**,
because the new nesting case renders `stack > stack > text` and never `card > <container> > X`. This is
the `check-that-cannot-fail` shape: the gate skips the thing it would need to test.

**I am not asking for the one-line fix in this PR.** Those two lines are untouched by this diff and
correct for every spec that exists, and CLAUDE.md forbids improving adjacent code. The better answer is
a gate, not an edit: a build-checks case that renders **every** container's declared children one level
deeper, so the assertion follows the spec lists instead of being written once against `stack`. Worth a
ticket; worth doing before #302 widens anything.

### F5 · Low — nested inline markup is swallowed, in both directions. Cosmetic and fail-safe.

`system/handoff-viewer.mjs:166`. Observed by driving the real renderer under a DOM stub:

| Source | Renders as |
|---|---|
| `[**a**](https://x.test/p)` | a link whose visible text is the literal `**a**` |
| `**[t](https://x.test/p)**` | `<strong>` containing the literal `[t](https://x.test/p)` — no link |
| `` `[t](https://x.test/p)` `` | `<code>` containing the literal source — no link |

This is the same "never nested in this data" assumption the file already states for bold-vs-code at
`:160-162`, now extended to links. The failure mode is literal markup characters on screen — never a
crash, and fail-safe in the security direction, since a nested payload becomes inert text. `text`'s
content is agent-supplied, so it is worth one clause in that comment saying links share the assumption;
the alternative (a real nested-inline parser) is a zero-dep violation and correctly out of scope.

### F6 · Low (informational) — three shipped pages gain a 20.5 KB module fetch.

`system/agentic-renderer.mjs:31` adds a top-level `import { renderMarkdown } from "./handoff-viewer.mjs"`.
Traced: `build.html`, `proto/fieldwork.html:64` and `agentic.html` import `agentic-renderer.mjs`
directly and did **not** previously load `handoff-viewer.mjs` by any path, so each now fetches it
(20.5 KB unminified, same-origin, no parse-time side effects — the module's top level only declares
functions). `studio.html` is **not** affected: it already pulled it via `studio.mjs` → `studio-docs.mjs`
→ `catalog.mjs:42`. Nor are `components.html`, `factory.html`, `instance.html` (same chain) or
`handoff.html` (direct).

This is the stated DRY trade-off — one renderer, three mounts, never a fork — and it is the right call.
Recording it because the PR body enumerates its shipped-page consequences carefully everywhere else and
does not mention this one.

---

## The security question, answered rather than assumed

The link branch is the one place in the census where input becomes an **attribute** instead of text, so
it got the most attention — mine and the `code-reviewer` agent's. **No bypass found**, by two
independent routes.

- **`safeHref` (`handoff-viewer.mjs:150-155`) holds.** Driven against Node's WHATWG `URL` — the same
  algorithm the browser runs — across leading/trailing whitespace, tab/CR/LF embedded mid-scheme
  (`java\tscript:` → parser strips → resolves to `javascript:` → refused), mixed-case schemes (protocol
  is lowercased by the parser), protocol-relative `//evil.com` and `\\evil.com`, `blob:`, `filesystem:`,
  `data:`, `vbscript:`, and malformed `scheme:no-slash`. All refused.
- **Raw-vs-resolved is not a divergence.** `raw` is exactly the string written to `href`, and when the
  browser later resolves that attribute it runs the identical parser against the identical base. There
  is no second parser. A `file:` base (handoff.html opened from disk) fails **closed** — relative links
  resolve to `file:`, get refused, and degrade to literal text.
- **The `m === null` path is reachable and handled.** `"[a](b"` reaches `part.startsWith("[")` and fails
  the exec; `const href = m && safeHref(m[2])` short-circuits and the literal renders. Not dead code —
  the second line of defence.
- **The trust boundary is still the commit, and I checked that it still is.** `renderMarkdown` now emits
  an `<a href>` from data, so the question is whether a *reader* can supply that data. Driven over the
  real `PATTERNS` (dashboard, queue, feed, onboarding, settings): **no `/build` pattern composes `text`
  or `stack`**, so the `?b=` share codec cannot deliver reader-controlled content into the renderer.
  Every `content` string reaching it today is committed spec prose or a committed composition.
  `safeHref` is the second line, not the only one.
- `grep` for `innerHTML`, `outerHTML =`, `document.write`, `eval(`, `new Function(` across the three
  renderer files: zero hits outside comments explaining their absence.
- Contrast claim verified at source: `system/derive.rules.mjs:187` declares
  `color-accent` on `color-bg` at 4.5, usage *"accent text / links on the page ground"* — so `text.md`'s
  a11y paragraph cites a pair that actually exists, and the underline answers SC 1.4.1 separately.

---

## The numbers pass — every figure re-derived at `71ca6ea`

| Claim | Verdict |
|---|---|
| vocabulary **23** components · `stack.childrenCardinality = "many"` · `text` carries no such key · `composition.version` 2 | ✅ read off `handoff/verdant/vocabulary.json` |
| graph consumers `ds-stack` **8** tokens · `ds-text` **15** tokens · zero null `consumer` in group 18's join | ✅ counted in `system-graph.json`; `prepareHandoff` driven → 0 null `consumer` across 23. Consumers 44→46 and edges 509→532 reconcile exactly: 8 + 15 = 23 new edges |
| wrapper histogram **3 with / 20 without** (was 3/18) | ✅ `prepareHandoff` driven → `3 with / 20 without`, total 23 |
| `loc-summary` runtime **30600 → 30800**, `files` **76 → 76** | ✅ (`total` also moves 38500 → 38700, which the body omits — harmless: `approach` renders the runtime group only, and `drift-check` is green) |
| pack: all **21** existing entries byte-identical to `origin/main`; added `stack`, `text` | ✅ 21/21 identical by `JSON.stringify` against `git show origin/main:handoff/verdant/pack.json` |
| **No `group()` call added** — the count stays 34, #301 claims no group number | ✅ `grep -c '^  group('` → 33 both sides; `group("` → 35 both sides |
| four roles strictly descending at **76 / 32 / 16 / 13 px** | ✅ **attribution** checked, not just digits: `.ds-text[data-role]` binds `--type-display` `clamp(40px,6vw,76px)` → 76, `--type-h2` `clamp(24px,2.5vw,34px)` → 32 @1280, `--type-body` 16px, `--type-caption` 13px |
| a `text role="heading"` does **not** match a card's internal title | ✅ `.vd-screen-title` (`components.css:1722`) and `.ds-modal-dialog-title` (`:2371`) both `--type-h3` = 20px, against heading's 32px |
| `stack.children` = G24's ten generic names, no identity gate | ✅ and **all ten resolve to real vocabulary entries** — the widened list leaves no dangling name on `/components` |
| `childrenLine` extraction is behaviour-preserving | ✅ driven over all 23 entries: byte-identical to the old inline conditional for every one of the 5 with children; only `stack` gains `" (many)"`. `{}` and `{children:null}` → `null` |
| bare `.ds-stack` declares no default `gap`/`padding` (spike S2's condition) | ✅ `.ds-stack { display: flex; min-width: 0; }` |
| the two new CSS blocks are token-only | ✅ every colour, spacing, radius, font and type value is a `var(--…)`. The only literals are `1px solid var(--color-border)` (**55** pre-existing occurrences in this file) and `text-underline-offset: 2px` (byte-identical to the two other `.hv-link` homes). Unitless line-heights and `font-weight` numbers follow the file's convention — no `--font-weight-*` token exists in the contract |
| no `/factory` baseline churn from the 46-consumer graph | ✅ confirmed by a second mechanism: `factory.html:396` renders a static `<p class="muted">Opens when you pick this panel.</p>` at rest, so the graph is never drawn — and CI `visual` is green, which is the independent proof |
| **18 mutations applied, all restored** | ✅ 18 rows (M1 M2 M3 M3b M4 M5 M5b M6 M6b M7 M8 M8b M8c M9 M10 M11 M12 M13); tree clean at HEAD. The *outcome* column for M3 is F1 |
| sequencing tripwire — *"do not leave this PR open once #302's branch exists"* | ✅ **re-run now**, not trusted from push time: `gh pr list --state open` → only #430; `git ls-remote --heads origin | grep 302` → none. The tripwire still holds, and the `/components` + `approach` baseline collision is not live |

**Not verified by this round, stated as such.** The local CodeQL run's own numbers (0 results, 166/166
JS/TS files, the `js/xss` ×2 @ 7.8 positive control) — rebuilding the database is out of budget here.
CI's `codeql` job is green on **both** legs at this HEAD, which corroborates the 0-result half; the
positive-control half rests on the author's report. The pixel gate's "22 passed" is likewise
corroborated by CI's green `visual` job rather than re-run locally.

---

## Documented deviations — read, and not flagged

All seven in the PR body's "Notes for the reviewer" were checked against the plan and the code; each is
an intentional decision with its reasoning stated, and three of them correct the plan rather than
depart from it:

1. **AC #2 in group 3 rather than group 18** — confirmed unimplementable as written:
   `agent-layer/gen-vocabulary.mjs:43` feeds `validateComposition` a node of shape
   `{name, props: head.example}` with no `children` array.
2. **CSS blocks before the specs** — order only, content unchanged.
3. **Task 15 not done because the plan was wrong** — `system/catalog.mjs:12-13` is a *consumption*
   statement, not an export census. Correct call; the edit would have made a true sentence false.
4. **F13's bracket premise rebuilt** — the rebuild is right: a `bracketsSeen > 0` guard over *prose*
   could never fire (0 brackets in 92 section bodies), and the two replacements are what stop the
   zero-link assertion being a tautology — `build-checks.mjs:4139-4140` (bodies must render block
   elements) and `:4147-4148` (the same bodies with a link appended must each produce exactly one).
5. **Staged by explicit path, not `git add -A`** — correct for a shared worktree.
6. **`drift-check` needs the work committed** — accurate, `tooling/drift-check.mjs:127`.
7. **The approach baselines forced** — the honest half, and the `×3` Docker re-validation is the right
   response to the known `approach` countUp flake.

The three carried assumptions (Q2/D5 ten children with no identity gate, Q3/D4 `--type-h2` for heading,
A1/D2 no `--spacing-none`) are the owner's to reverse and are argued, not assumed. On D5 in particular:
the widened list costs nothing today — all ten names resolve to real entries.

---

## What is done well

- **The `[]`-vs-`child.children` trap is closed by a gate, not a comment.** `agentic-renderer.mjs:436`
  passes `child.children ?? []`, and `build-checks` renders a real `stack > stack > text` through
  `renderComposition` to look for the innermost text. Group 3 previously asserted only that a template
  *exists* — exactly the `check-that-cannot-fail` shape — and M4 proves the new case can go red. (F4 is
  the same reasoning applied one step further out, not a contradiction of this.)
- **The DOM stub carries its own positive control and runs it before every use.** `domStubControl()`
  asserts the stub records a tag name, an attribute, appended structure, depth-first text *and* a
  `baseURI`, each with a message naming what would otherwise pass for the wrong reason. Lifecycle is
  `globalThis.document = domStub()` … `finally { delete globalThis.document }` at both sites (`:812`,
  `:4075`); everything inside is synchronous, so nothing escapes into a later group. The one place the
  stub could diverge from a real DOM — `textContent` ordering when a node has both a `text:` attr and
  separately-appended children — is never exercised: no `el()` call site in the renderer does both.
- **The inverse control on the S2 condition.** Asserting `[data-gap="md"]` *present* beside the two
  "bare rule declares no gap" assertions distinguishes "the bare rule is clean" from "the block is
  missing", and M8c records that deleting the attribute rule leaves the bare-rule assertions green —
  which is the evidence the control was needed.
- **`.ds-text .hv-*` in `components.css`, scoped.** The shared renderer emits `hv-*` classes, and
  `catalog.css`'s unscoped copies only load on three pages. Without this block a `text` on `build.html`
  or `proto/fieldwork.html` would render links colour-only — the SC 1.4.1 failure the rule exists to
  prevent. I went looking for this gap independently and found it already closed, with the reasoning in
  the comment at `:2479-2483`.
- **A refused link scheme renders as its own literal source text**, not as nothing — a mistake stays
  visible — and the gate asserts the *whole* source text survives, not just the absence of an `<a>`.
- **The census bound is asserted, not assumed.** Headings, blockquotes and ordered lists are each driven
  and proven to still render as one paragraph carrying their own text.
- **The specs argue their calls rather than stating them.** `text.md`'s Accessibility section explains
  why `role: "heading"` renders a `<div>` and not an `<h2>` (a hard-coded heading would lie about the
  document outline; `card.md` makes the same call) — I went in expecting a finding and found a decision.
  `stack.md` does the same for `align` being cross-axis-only and for `screen-header`'s `vd-` prefix.
- **The report's own honesty.** Task 28's human eyeball is declared NOT run rather than quietly
  substituted; the Playwright stand-in carries a negative control that failed on all three engines; and
  deviations 3, 4 and 7 each say the plan was wrong and why. F1 is a reporting slip inside a document
  whose default is unusually careful about exactly this.

---

## Next

`piv-fix-review-findings` on F1–F3 (three prose edits, no code), then re-run `build-checks` and push.
F4 wants a ticket, not an edit in this PR. F5 is one clause in a comment. F6 needs nothing.
