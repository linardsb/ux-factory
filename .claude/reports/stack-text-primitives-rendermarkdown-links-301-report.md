# Implementation Report — `stack` + `text` through the full chain, and `renderMarkdown` links

**Plan**: `.claude/plans/stack-text-primitives-rendermarkdown-links-301.md`
**Branch**: `feature/stack-text-primitives-301`
**Base**: 11e1cef → 11e1cef (unmoved; `git merge origin/main` → "Already up to date" after the work)
**Status**: COMPLETE

## Summary

Epic #295's first two generic primitives land as ordinary catalog components through the whole
admission chain — spec, token-only `components.css` block, `agentic-renderer.mjs` template, gates,
regenerated pack. `stack` is the vocabulary's first container and the first committed spec to
declare `childrenCardinality: "many"`, which makes it the first real exercise of #298's projection.
`text` is the one text part; its content renders through the **shared** `renderMarkdown`, extended
once with links behind an `http:`/`https:` scheme allowlist. Every new assertion carries the
mutation that reddens it — 15 mutations run, each observed red by name, each restored.

## Tasks completed

| Task | Path | Action |
|---|---|---|
| 1 branch off fresh `origin/main` | `feature/stack-text-primitives-301` | CREATE |
| 2 `safeHref` + the link branch | `system/handoff-viewer.mjs` | UPDATE |
| 3 the census comment | `system/handoff-viewer.mjs` | UPDATE |
| 4 `.hv-link` | `system/catalog.css` | UPDATE |
| 5 `.hv-link` | `handoff.html` | UPDATE |
| 6 the layout box's spec | `system/specs/stack.md` | CREATE |
| 7 the text part's spec | `system/specs/text.md` | CREATE |
| 8 the `ds-stack` block | `system/components.css` | UPDATE |
| 9 the `ds-text` block | `system/components.css` | UPDATE |
| 10 the `stack` template | `system/agentic-renderer.mjs` | UPDATE |
| 11 the `text` template | `system/agentic-renderer.mjs` | UPDATE |
| 12 the `renderMarkdown` import | `system/agentic-renderer.mjs` | UPDATE |
| 13 the stale "twenty-one" counts | `system/agentic-renderer.mjs` | UPDATE |
| 14 `childrenCardinality` in the head projection | `system/handoff-viewer.mjs` | UPDATE |
| 15 `childrenLine` extracted + exported | `system/catalog.mjs` | UPDATE |
| 16 `CATALOG_COMPONENTS` | `system/palette.mjs` | UPDATE |
| 17 the DOM stub + its positive control | `tooling/build-checks.mjs` | UPDATE |
| 18 the group 3 composition cases | `tooling/build-checks.mjs` | UPDATE |
| 19 the S2 condition as a gate case | `tooling/build-checks.mjs` | UPDATE |
| 20 the `renderMarkdown` link cases | `tooling/build-checks.mjs` | UPDATE |
| 21 the projection + catalog cases | `tooling/build-checks.mjs` | UPDATE |
| 22 the regenerators, in order | `handoff/verdant/*`, `system/system-graph.json` | REGENERATE |
| 23 the histogram pin + three stale counts | `tooling/build-checks.mjs`, `system/handoff-viewer.mjs`, `tooling/visual-regression/visual.spec.mjs` | UPDATE |
| 24 stage, then `loc-summary` | `system/loc-summary.json` | REGENERATE |
| 25 the full CI gate set | — | RUN |
| 26 the VR baselines | `tooling/visual-regression/baselines/*.png` ×4 | REGENERATE |
| 27 `catalog-journey` ×3 engines | — | RUN |
| 28 real-browser check | — | RUN (substituted — see **Not run**) |

Two commits: `baa8990` (the implementation) and `4e6c443` (the four baselines).

## Tests added

No test suite exists in this repo; the gates are the tests. Cases added inside existing groups —
**no `group()` call was added, so the count stays 34 and #301 claims no group number** (which means
#302's "group numbers are claimed in merge order, renumber on rebase" rule does not bind this
ticket).

**build-checks group 3 (composition)** — the projected key asserted **by name** on the committed
vocabulary; a leaf proven *not* to gain the key; #302's exact three-child spine validated against
the real vocabulary; the cardinality-removed mutation refusing it by count; `text`'s two `role`
refusals asserted **by message**; a real `stack > stack > text` rendered through `renderComposition`
under the DOM stub; an absent `gap`/`pad` proven to emit no attribute; and S2's condition made
mechanical — the bare `.ds-stack` rule sliced out of `components.css` and proven to declare neither
`gap:` nor `padding:`, with the `[data-gap="md"]` rule asserted present as the inverse control.

**build-checks group 18 (docs chain)** — `childrenCardinality` in the head projection both
directions (the real declaring component, then a stripped synthetic pack); and `renderMarkdown`
driven for the first time in its life, under the stub behind its positive control: the pre-existing
census re-proven branch by branch (bold, code, list, pipe table, fence) **first**, then a link
asserted whole (element, `href`, text, `hv-link`, `rel`), a site-relative href accepted,
`javascript:`/`data:`/`vbscript:` each refused with the whole source text surviving literally, a
bare `[` left literal, every committed spec section body proven to produce zero links behind the
control that the same bodies *with* a link appended each produce exactly one, and the census bound
held (`# heading`, `> quote`, `1. ordered` each still one paragraph).

**build-checks group 21 (catalog)** — `childrenLine` over the real entries in all three shapes
(many / single-child / leaf), five junk shapes answering `null`, and the per-container mutation
proving the ` (many)` suffix is conditional.

Each group's header string was rewritten to state what it now asserts and what it still cannot
reach. Group 3's old "the projection's first real proof is #301's regenerated vocabulary, and a
typo in the key name there would be green here" clause was **false after this ticket** and is gone.

## Proving the checks

Every mutation was applied, `build-checks` run, the named failure observed, and the mutation
restored. All 15 observed.

| # | Mutation applied | The case that went red (verbatim) | Positive control |
|---|---|---|---|
| M1 | `safeHref()` guard dropped in `handoff-viewer.mjs` | `expected literal text for a refused scheme, got <a> — [x](javascript:alert(1))` (×6, all three schemes) | the `https://x.test/p` link renders as an `<a>` |
| M2 | the whole link branch deleted | `expected an <a>, got 0 — the link branch did not fire` (+29) | same |
| M3 | split loosened to `/\[[^\]]*\]/` alone | *(no failure — see note)* | — |
| M3b | split **and** link regex both loosened | `a bare [ produced a link — the split regex is too loose` | same |
| M4 | `stack` template passes `[]` not `child.children` | `the inner text did not render — the stack template dropped its grandchildren (got "")` | the un-mutated nesting case finds `deep` |
| M5 | the head-projection spread deleted | `childrenCardinality reached the component but NOT the head projection — it was dropped by the explicit pick (stack)` | `stack`'s head carries `many` |
| M5b | the head spread made unconditional | `the head projection injected a "childrenCardinality" key for a spec that declares none` | the stripped synthetic pack carries none |
| M6 | ` (many)` suffix dropped from `childrenLine` | `childrenLine(stack) does not end " (many)" …` | `stack`'s line ends ` (many)` |
| M6b | the suffix made unconditional | `childrenLine still says "(many)" for stack with the cardinality removed — the suffix is unconditional and proves nothing` (+4 single-child entries) | `card`'s line does not |
| M7 | `createElement` returns a recorder that records nothing | `the DOM stub does not record a tag name — every assertion driven through it is meaningless` (+3 stub lines, then 47 downstream) | the un-mutated control passes and every case runs |
| M8 | `gap: var(--spacing-sm)` on the **bare** `.ds-stack` | `.ds-stack declares a default gap — S2's condition is broken …` | the bare rule as shipped is green |
| M8b | `padding: var(--spacing-md)` on the bare `.ds-stack` | `.ds-stack declares a default padding — S2's condition is broken: …` | same |
| M8c | **inverse control** — `[data-gap="md"]` rule deleted | only `the .ds-stack[data-gap="md"] rule is gone — … green for the wrong reason`; **the two bare-rule assertions stayed green**, which is the point | the attribute rule as shipped is present |
| M9 | `gen-vocabulary` projects `childrenCardinallity`, regenerated | `stack's vocabulary entry does not carry childrenCardinality: "many" (got undefined) — gen-vocabulary dropped or misspelled the projected key` | the committed artifact carries it |
| M10 | `text.role` loses `"required": true`, regenerated | `a text with no role was not refused by name — got: null` | the shipped spec refuses it |
| M11 | `text.role` loses its `enum`, regenerated | `an unknown text role was not refused by its enum — got: null` | same |
| M12 | the histogram pin left at `3/18` | `the wrapper histogram moved — 3 with / 20 without (pinned 3/18; …)` | 3/20 is green |
| M13 | an absent `gap`/`pad` emits `""` anyway | `an absent gap/pad emitted an attribute anyway — absence no longer expresses zero, and S2's verdict rests on it` | the shipped template emits neither |

**M3, recorded as the plan predicted it and as it actually behaved.** The plan's REDDENS for the
bare-`[` case was "loosen the split to `/\[[^\]]*\]/`". That mutation does **not** redden it: the
loosened split captures `[0]`, the inner link regex then fails to match, and the branch falls to
`createTextNode` — so the bare `[` stays literal for a second reason. The assertion is defended in
depth by two independent guards, and M3b (loosening **both**) is what reddens it. Recorded rather
than left looking like a mutation that was never run.

**The DOM stub carries its positive control (`domStubControl()`) and is called before every use** —
`renderMarkdown` had zero gate coverage before this ticket, so the stub is genuinely new surface.
M7 proves the control fires first and loudly.

## Validation results

Every figure below names the command that produced it. All **observed** unless marked.

| Command | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass` |
| `node tooling/token-lint.mjs` | `token-lint      ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| `node tooling/drift-check.mjs` (clean tree, post-commit) | `drift-check     ✓  syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count` |
| `node agent-layer/gen-handoff.mjs` | `handoff pack    ✓  23 specs + 3 token targets + 3 wc wrappers` |
| `node agent-layer/gen-vocabulary.mjs` | `vocabulary      ✓  23 components` |
| `node agent-layer/gen-pack-bundle.mjs` | `pack bundle     ✓  16 files` |
| `node agent-layer/gen-system-graph.mjs` | `system graph ✓  63 tokens · 46 consumers · 532 edges` |
| `node agent-layer/gen-inspect-data.mjs` | `inspect data ✓  16 components · 9 with spec` — **no diff** (neither new block is in its role map; a consumer with no key is uninstrumented, which is expected) |
| `node agent-layer/gen-annotated-source.mjs` | `annotated source ✓  2 snippets` — **no diff** (its anchor is `components.css:176`, far above the ~2412 insertion point; F9 held) |
| `node agent-layer/gen-loc-summary.mjs --check` (after staging) | `loc summary ✓  3 groups — no drift` |
| `node tooling/catalog-journey.mjs all` (private port 4793) | `catalog-journey ✓  all assertions passed on chromium, firefox, webkit` — 32 passed / 0 failed per engine |
| `npm run update:docker` | 22 passed; **4 PNGs** rewritten |
| `npx playwright test` in Docker, against the new baselines | `22 passed (36.8s)` |

**Four gates the plan's list did not name, run after the first report draft:**

| Gate | Result |
|---|---|
| **CodeQL, locally** — bundle 2.27.0 (the Action pins the major, `@v4`), database created **outside the repo** at `~/.codeql-dbs/`, `--codescanning-config=.github/codeql/codeql-config.yml` at create so the scope matches CI's, `codeql/javascript-queries:codeql-suites/javascript-code-scanning.qls` | **0 results** across the whole allowlisted tree — 166/166 JS/TS files scanned, 307 files in the source archive, `system/handoff-viewer.mjs` · `system/agentic-renderer.mjs` · `system/catalog.mjs` all extracted. So **both legs are clear**: this diff raises nothing, and `main` carries nothing inherited. |
| **CodeQL positive control** — because a 0-result run is exactly the "check that cannot fail" shape | **Two attempts, and the first one is the point.** A tainted `innerHTML` on an untyped *parameter* fired **nothing** — a zero-result run behind that control would have proven nothing. Rewritten to an unambiguous DOM sink (`document.body.innerHTML` / `document.write` from `document.location.href`) in the same file: **`js/xss` × 2, security-severity 7.8 (the blocking class), `system/handoff-viewer.mjs:152-153`**. The run can see this file and can raise a blocking alert, so the 0 above means something. Mutation restored, `git status` clean. |
| **`approach` baseline stability** — the fresh pair replaced a battle-tested one, and memory `vr-gate-approach-countup-flake` says approach's two-consecutive-stable-shots pass races a live `countUp` rAF | `npx playwright test --grep approach` in Docker **×3**: 2 passed / 2 passed / 2 passed (6 shots, 0 failures). Not a CI green, but the local flake is ruled out at three samples. |
| **`tooling/studio-journey.mjs`** — `childrenLine` changed `renderComponentDocs`, which is **mount 2** (`system/studio-docs.mjs:311`), and the plan's validation list never named that driver | `grep -n 'Children:\|cat-meta-line\|childrenLine' tooling/studio-journey.mjs tooling/catalog-journey.mjs` → **no hits in either**. Neither driver pins the meta line's text, so neither went stale. No run needed. |

**Artifact facts, each read off the artifact, not typed:**

- vocabulary: **23** components; `stack.childrenCardinality` = `"many"`; `text` carries **no**
  `childrenCardinality` key; `composition.version` = 2 (unchanged).
- pack: `stack.childrenCardinality` = `"many"`; the head projection carries it.
- graph consumers: `ds-stack` → 8 tokens, `ds-text` → 15 tokens, **both non-null**, **zero null
  groups** on either side of group 18's 1:1 join.
- wrapper histogram: **3 with / 20 without** — read off the failing assertion's own message, not
  derived. (The plan's `node -e` join of `"wc/"+c.class` answers 0: the pack lists wrappers as
  `wc/vd-<name>.mjs`, so the join is on the wrong key. Recorded so the next mover does not use it.)
- `loc-summary` runtime group: **30600 → 30800** (`linesApprox`), raw **30585 → 30761** (derived:
  `git show :<path> | wc -l`, `+1` per file, over the 76 tracked `system/` sources). `files` stays
  **76** — no file was added. `pages` stayed **5200** (handoff.html took +2 lines; F10's 6-line
  headroom was not spent). `generators` unchanged at **2700**.

**AC #5, proven both ways:**

- `git diff --name-only origin/main -- system/specs/ proto/ | grep -v 'stack.md\|text.md'` → empty.
  (`--name-only`, not the plan's `--stat`, which emits a trailing summary line the `grep -v` cannot
  filter and so can never be empty.)
- Every one of the pack's existing **21** entries is byte-identical to `origin/main`'s
  (`JSON.stringify` per component, compared against `git show origin/main:handoff/verdant/pack.json`);
  added: `stack`, `text`; total 23.

**The `text` spec's `tokens` array was derived from the shipped CSS, not typed:**
`awk '/ds-text \(system/,/Verdant screen scaffolding/' system/components.css | grep -o 'var(--[a-z0-9-]*' | sort -u`
→ 15 tokens. The plan listed 14; it was derived before the `.hv-table`/`.hv-code` scoped rules were
added, which bring `--color-border`.

## Not run

| Step | Why | Tracker |
|---|---|---|
| **Task 28 — a human eyeball in Safari and Chrome *stable*** | This session cannot drive the installed browser apps. **Substituted, and stronger than nothing but not the same thing:** a Playwright probe across **chromium, firefox and webkit** (webkit is Safari's engine) rendering a real composition on `/components.html` under the shipped CSS and measuring what the browser computes. All three agree: the four roles are strictly descending at **76 / 32 / 16 / 13 px**, the outer stack is `display:flex; flex-direction:column` with `gap` and `padding` both resolving to **16px** from `--spacing-md`, a nested `direction:"row"` stack lays its children out side by side, the link's `href` survives, `text-decoration-line` includes `underline`, the link colour differs from body colour, `**bold**` still renders, and **no page errors** on any engine. The probe carries a **negative control** (an assertion that must fail) and it failed as required on all three, so the driver is not lying. A WebKit screenshot is in the PR. | owner's call — the manual look is 5 minutes and is worth having before merge |
| `node tooling/build-journey.mjs all`, `node tooling/proto-journey.mjs all` (plan Level 5, "optional") | Neither renders `stack` or `text`; both are regression-only here. The `renderMarkdown` import edge they would exercise is covered by `gen-vocabulary` running green (it imports `agentic-renderer.mjs` under Node) and by `catalog-journey` green on three engines. | optional by the plan |

Everything else in the plan's VALIDATION COMMANDS ran.

**Push note.** `git switch -c … origin/main` set this branch's upstream to **`origin/main`**, and
`main` has no branch protection (memory `main-branch-protection-off`). `push.default` is unset, so
`simple` refuses a name-mismatched upstream — but push with an explicit refspec anyway:
`git push -u origin HEAD`.

## Deviations from the plan

- **AC #2 shipped as restated, not as the ticket wrote it** *(pre-agreed in the plan's AMENDMENTS,
  repeated here because the PR body must carry it).* The ticket says "Group 18 gains a many-children
  example". Not implementable: `validateExamples` feeds `validateComposition` a node of shape
  `{name, props: head.example}` and never a `children` array (`agent-layer/gen-vocabulary.mjs:41`).
  The case lives in **group 3** instead, against the real regenerated vocabulary.
- **Task order: the CSS blocks were written before the specs** (plan order is 6-7 then 8-9). The
  plan's own task-7 GOTCHA requires deriving the `tokens` array *from* the block, so the block has
  to exist first. Content is unchanged; only the order moved.
- **Task 15's "the header sentence must now name five" was not done — the plan was wrong**
  *(plan error)*. `system/catalog.mjs:12-13` says *"MOUNT 2 LANDED AT #218 … and it **consumes**
  FOUR things from this file"*. That is a statement about what `studio-docs.mjs` imports, not an
  export census — the module already exported **12** names before this ticket, and
  `tooling/build-checks.mjs:241` already imports five of them. `childrenLine` is consumed by
  build-checks, not by mount 2, so the sentence stays true as written. Editing it to say "five"
  would have made it false.
- **Task 20's real-prose case drives what the renderer actually sees, and the plan's premise about
  it was wrong** *(plan error)*. F13 says "the 73 bare `[` in the specs are exactly what AC #3's
  literal case guards". Measured: there are **85** `[` across `system/specs/*.md` and **all of them
  live in the JSON heads** (enum / tokens / children arrays), which `renderMarkdown` never sees —
  the committed **prose** carries **zero**. So the planned `bracketsSeen > 0` guard could never be
  satisfied. Replaced with two guards that can: the bodies must actually render block elements, and
  the **same bodies with a link appended must each produce exactly one link**, which is the control
  that stops the zero-link loop being a tautology. The bare-`[` claim is carried by the fixture case
  above it, as it always was.
- **Task 24's `git add -A` was not used.** Staged by explicit path — other sessions' untracked files
  are in this shared tree (`__mock_discoveries.md`, two `.txt` files, another session's plan). The
  plan's own line contradicts itself ("`git add -A` (by explicit path — shared worktree)").
- **Task 25's `drift-check` needed the work committed first.** Its `checkHandoff` step runs
  `git status --porcelain -- handoff/` and any output is a red, **staged changes included**
  (`tooling/drift-check.mjs:127`). Before committing it reported drift naming the three pack files;
  determinism was proven separately (regenerators re-run, `git diff -- handoff/` empty against the
  index), then the commit was made and `drift-check` re-run clean. Recorded because "run it on a
  clean tree" in the plan means *committed*, not *regenerated*.
- **The approach baselines had to be forced.** `update:docker` rewrote only the two `/components`
  PNGs; the approach pair's only change is one digit (`30,600` → `30,800`), which sits under
  pixelmatch's per-pixel threshold. **Measured both ways**: the gate passes against the *stale*
  approach baselines (2 passed), so nothing forced the regen — the committed PNG would simply have
  shown a number the page no longer renders. `rm`'d both and re-ran; the new bytes differ. Four PNGs
  committed, which is F1's prediction confirmed.

## Assumptions carried

Plan-sanctioned choices, not deviations.

- **Q2 / D5 — `stack.children` is G24's ten generic names**, alphabetical, `stack` and `text`
  included, with **no identity gate**. Widening is one line in `stack.md` plus a regen; un-widening
  after #302 composes against a broad list is not. The owner's to reverse.
- **Q3 / D4 — `heading` → `--type-h2`** (clamp 24-34px), not `--type-h3` (20px), so the four roles
  are visibly distinct. Stated consequence, now measured at **32px vs 16px body**: a
  `text role="heading"` does **not** match a card's internal title (`screen-header`, `modal-dialog`
  both use `--type-h3`). A one-token edit here and in `tokens` if the owner wants them to match.
- **A1 / D2 — no `--spacing-none`.** S2's verdict is "absence suffices, *provided* `ds-stack`
  declares no default gap or padding"; task 19 makes that condition mechanical (M8/M8b/M8c).
  `token-lint`'s orphan leg would have refused the token anyway with no `var()` consumer.
- **A2 — no `kb-format.md` change, confirmed.** `childrenCardinality` is already documented there
  (`:27`, from #298) and this ticket adds no head key.
- **A3 — no new `system/*.mjs`.** `renderMarkdown` is imported from `handoff-viewer.mjs`.
- **Q4 — `align` is cross-axis only**; no `justify-content` prop. #304's call.
- `stack`'s `/components` playground is an honestly empty 16px-padded box — `example` carries props
  only, and `validateExamples` never passes children. Accepted, not a defect; AC #2's composed proof
  lives in group 3.

## Additions beyond the plan

Each is a gate case the plan implied but did not enumerate, or a control the skill requires:

- **The negative half of the projection, twice.** `text`'s vocabulary entry proven **not** to carry
  `childrenCardinality` (group 3), and no head in a stripped synthetic pack proven to carry it
  (group 18). The plan asked only for the positive direction on the vocabulary side; an
  unconditional spread would have been green without these (M5b proves it).
- **The absence leg at the DOM** — an absent `gap`/`pad` emits **no attribute** (group 3, M13).
  S2's whole verdict rests on this and nothing else asserted it.
- **The inverse control on the S2 case** (M8c) — the plan named it; it is written into the gate as
  a standing assertion rather than run once and forgotten.
- **`childrenLine` totality** over five junk shapes, and the single-child / leaf legs over the
  **real** entries rather than fixtures.
- **`.ds-text .hv-table` / `.hv-code` scoped rules.** The plan's task-9 gotcha asks for "a minimal
  scoped rule for each so nothing can render unstyled"; both are in, and they are what brought
  `--color-border` into the `tokens` array.
- **`renderMarkdown`'s pre-existing census re-proven branch by branch** (bold, code, list, **pipe
  table**, fence) as the positive control. The plan's control covered three; the real-prose case
  drives committed spec bodies that contain pipe tables, so the table branch had to be in it.
- **The three refused schemes include `vbscript:`**, and each asserts the whole source text survives
  — not just the absence of an `<a>`.
- **A cross-engine functional probe** with a negative control, standing in for task 28 (see
  **Not run**).

## Issues encountered

- **One observation worth the owner's eye, deliberately not fixed here.** A part whose own CSS is
  `width: 100%` — `vd-primary-button` is (`system/components.css:1899`) — takes the free space
  inside a `direction: "row"` stack and squeezes its text siblings to min-content. Visible in the PR
  screenshot's third row. This is the **part's** own spec, not the stack's, and AC #5 forbids
  touching it. The answers available are `size: "hug"` on a wrapping stack, or a `main`-axis
  distribution prop (Q4, #304's call) — **not** a `.ds-stack > * { flex: none }` override, which
  would silently break `size: "fill"`. #302's spine is a column, where this does not arise.
- **The two new specs deliberately carry no `](` pairs**, checked after writing
  (`grep -coE '\]\([^)]+\)'` → 0 on both). F13's claim that enabling links moves no existing render
  is now true of this ticket's own prose too, and the group-18 loop asserts it over all 23 specs.
- **Escaped pipes are not in the census.** `splitRow` does a plain `.split("|")`, so a `\|` inside a
  markdown table cell ragged the row. Caught while writing `stack.md`'s Data binding table and
  rewritten without pipes. Worth knowing before the next spec author reaches for one.
- **`gh pr list --state open` → empty** (re-checked before pushing): the `/components` and
  `approach` baseline collision rules are clear. **#301 spends an `approach` regen** — #302's brief
  attributes that churn to its own two new `system/*.mjs` files and does not expect to find the
  number already moved. Per #302's own preconditions, #301 must be **merged before #302 opens**;
  do not leave this PR open once #302's branch exists.
- **No `/factory` churn**, as the plan predicted: `factory.html:396` mounts the system graph inside
  a tab panel that is `hidden` at rest and the VR spec never clicks it. Two new graph consumers move
  no `/factory` pixel; the epic's `/factory` collision rule does not apply here.
- Two stale untracked copies of another session's `canvas-spike-s3-*` plan blocked the branch switch.
  `origin/main`'s versions are a strict superset (103 lines more, **0** local-only lines — measured
  before removing); both were backed up to the session scratchpad, then removed.
