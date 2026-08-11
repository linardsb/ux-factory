# Feature: IA re-point — home compresses to the gate, approach/work/contact become evidence layers (#216)

The following plan should be complete, but it is important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.
**Two facts in this plan contradict the ticket text and are correct here — read OPEN QUESTIONS ➊
and ➋ before you start.**

## Feature Description

The site stops being five peer pages and becomes **one destination with evidence around it**.

- **Home** compresses from seven sections to four: the billboard, one merged *live re-skin proof*
  (brand colour + token drop zone + `#reskin-preview` + the three scrub handles), a four-row
  evidence index, and a close row. The intake wizard, the wear interstitial, the built-screen peak
  and the close card are deleted — their successors shipped inside the studio (#209 replay, #207
  compile, #214 method cards, #210 keep rail).
- **Nav and footer point at the studio.** `Factory` becomes `Studio` (the rename #206 deliberately
  deferred to this ticket, its D2), and `/factory` joins the top nav for the first time.
- **Approach / work / contact** stop claiming the old IA. Work's "Exhibit 01 · the factory, end to
  end — start from a brand colour on the home page" is now false and becomes the studio; approach
  keeps its evidence value (derive probe, annotated source, glossary, the measured-claim lines) and
  keeps `#method` / `#case` / `#sources` as named anchors, because #245 places its leverage ladder
  against them.
- **The scrub handles read as controls at rest.** The shared `.stage-scrub-handle` recipe becomes a
  token-only chip with a `::after` drag glyph — visible with no hover, no focus and no pointer, on
  touch as well as desktop.

## User Story

As a **hiring manager doing a first 90-second pass on a senior AI-first UX-engineer candidate**
I want to **land on a page that states the role in five seconds and hands me one unmistakable route
into the thing being claimed**
So that **I spend my attention on the studio actually building a product, not on navigating a
five-page portfolio to find where the capability lives.**

## Problem Statement

The site's centre of gravity moved to `/factory` across waves 1–5 of epic #202, and nothing in the
IA moved with it:

1. **The studio is not in the nav at all.** `client.neutral.config.js:27-31` ships `Home · Approach
   · Work` + a Contact CTA; `/factory` is reachable only from the footer index and from home's
   `#verify` row-list. The site's deepest exhibit is its least-signposted route.
2. **Home still performs the old pipeline.** Seven sections walk a reader through brief → brand →
   peak → keep → verify. Every one of those beats now has a better version inside the studio, so
   home competes with the destination it should be a gate to. The peak-end rule wants *one*
   unmistakable peak; there are two, and the weaker one is first.
3. **Work's copy is factually wrong.** `work.html:185-197` sends "Exhibit 01 · The factory, end to
   end" to `/` with "Start from a brand colour on the home page and watch a design system build
   itself"; `work.html:444-450` labels `/factory` "The evidence home". Neither describes what those
   routes do today.
4. **The scrub handles hide their own affordance.** `.stage-scrub-handle` (`portfolio.css:1018`)
   renders as a dashed-underlined number — an annotation, not a manipulable value. Hover is nothing
   on touch, and the primitive is load-bearing (`prototype-studio.architecture.md:56` names its
   pointer idiom as the canvas's seed). Owner feedback, 2026-08-04.

## Solution Statement

One PR, run alone (chrome cascade), doing four things in dependency order:

1. **The shared handle recipe** gets a persistent at-rest affordance — one CSS block, both surfaces,
   `::after` glyph (never `textContent`, which `scrub.mjs:45`'s `reflect()` overwrites on every
   pointerdown, every drag frame, every keydown step and every focusin).
2. **Home compresses** to `#beat-hero` → `#beat-brand` (the merged re-skin proof) → `#verify` →
   close row. Three view-time modules lose their only mount and are deleted; two virtual-route
   trackers lose their only caller and are deleted with their pinned-minimum entry.
3. **Chrome re-points**: nav, footer site index, ⌘K palette labels.
4. **The evidence layers** are trimmed and re-pointed, then every cascade is run: param manifest +
   count, loc summary, the VR page entry, `vt-verify`, `build-journey`, and all chrome-bearing
   baselines.

## Phase 0 — the key risks, resolved before this plan closed

Four unknowns that would otherwise have been discovered mid-implementation were probed on the real
running tree (2026-08-11, `serve.mjs` on :4757, Playwright from
`tooling/visual-regression/node_modules`). **Their answers are folded into the tasks below — read
this section before Task 1, because one of them corrects a GOTCHA that would have sent you the wrong
way.** Probe scripts kept at `<scratchpad>/jsoff-factory-floor.mjs` and
`<scratchpad>/chip-prototype.mjs`; re-run either if you doubt a number.

### ➊ RESOLVED — `/factory.html`'s JS-off floor is fine, so Task 18 takes its primary branch

The blocking question was whether the `/build` link-in assertion could honestly move from home's
deleted `.close-card` to the studio, given the studio's centre is a JS-mounted canvas. Measured with
`javaScriptEnabled: false` at 1440×900:

| page | `/build` link | visible text | headings | click → |
|---|---|---|---|---|
| `/index.html` (today's target) | present, visible | 3,990 chars | 7 | `/build` ✓ |
| **`/factory.html` (proposed)** | **present, visible** | **6,893 chars** | **5** | **`/build` ✓** |
| `/work.html` (fallback) | present, visible | 4,446 chars | 6 | `/build` ✓ |

The studio's JS-off floor is **better than home's was** — 73% more visible text, five real headings,
and every section's prose intact. The only empty mount is `#canvas` (0 children), sitting inside a
section whose static copy explains what fills it. **Take the two-row branch in Task 18; the
`/work`-only fallback is not needed.**

### ➋ CORRECTED — `min-width: 4ch` is NOT inert, and `display: inline-block` is a no-op

An earlier draft of Task 1 claimed the handle is an inline box so `min-width` does not apply.
**Wrong.** `.stage-scrub-field` and `.asrc-probe-field` are `display: inline-flex`
(`portfolio.css:1016`, `:741`), so the handle is a **flex item and is already blockified** —
measured `display: block` on both surfaces today, at 35×29px with `min-width` live. Adding
`display: inline-block` to the recipe would be overridden by blockification and change nothing.
**It is removed from the recipe in Task 1.** The baseline-alignment worry it created is unfounded.

### ➌ MEASURED — the chip's layout cost is ±2px, and both packs pass contrast

The proposed recipe was injected over the live pages (no repo edit) and both surfaces measured under
both packs:

| surface · pack | row height before → after | handle box | text on chip fill |
|---|---|---|---|
| home · neutral | 81 → **79** px | 35×29 → 61×30 | `rgb(26,26,26)` on `rgb(244,244,245)` |
| home · saulera | 81 → **83** px | 35×29 → 61×30 | `rgb(38,70,83)` on `rgb(244,241,234)` |
| approach · neutral | 103 → **104** px | 35×29 → 61×30 | same as home |
| approach · saulera | 103 → **104** px | 35×29 → 61×30 | same as home |

Both pairs are comfortably AA (near-black on near-white; dark teal on cream). The width gain (+26px
per handle) makes home's three fields reflow onto one row instead of wrapping to two — a visible
improvement, and the reason home's row gets *shorter* under neutral. **Baseline churn from this
change alone is small and contained; the ±2px is the number to expect, not a page-scale shift.**

### ➍ PROVEN — the glyph survives real use, on both surfaces, under both packs

The `::after` question was answered by driving it, not by loading it (the load-only check passes for
the broken child-node design). Per surface × pack: a real pointer drag, then three `ArrowRight`
presses.

- `::after` content stayed `"⇔"` through **both** paths, 4/4 combinations.
- `aria-valuenow` moved on **both** paths (`154 → 178 → 184` on home; `136 → 160 → 166` on approach),
  so the assertions are not vacuous.
- `role="slider"`, `aria-label`, `aria-valuetext` and the rewritten `textContent` all intact after
  each path. Slider count stayed 3 on home and 2 on approach.

**AC #7 is therefore proven at prototype stage.** Task 2 re-runs the same proof against the
*committed* CSS, which is what makes it a claim about the shipped file rather than about an injected
stylesheet.

### ➎ RESOLVED — `portfolio.css`'s three `fw-*` keyframes are safe to delete

`@keyframes fw-step-in` / `fw-row-in` / `check-draw` (`portfolio.css:1130-1132`) look shared, because
`instance.html:247,249` animates `.fw-card` and `.fw-checks` rows by those exact names. They are
not: **`instance.html` defines its own copies at `:251` and `:253`**. `check-draw`'s only reference
is `portfolio.css:1126`, which this ticket deletes. All three go.

## Out of Scope / Non-Goals

- **Not touching `/factory` itself.** The studio's own copy, canvas, replay, method band and keep
  rail are #206–#214's, all landed. This ticket links *at* the studio and never edits it — except
  `build-journey.mjs`'s two rows that must move their `/build` link-in assertion off deleted home
  markup, which is a driver edit, not a page edit.
- **Not deleting a route.** `/build`, `/roundtrip`, `/handoff.html`, `/components`,
  `/agentic-ui-study`, `/trace.html`, `/agentic.html`, `/studio.html`, `/instance.html` and both
  protos all keep their routes and their pages. `/agentic-ui-study` retires at #222, not here.
- **Not touching `instance.html` or `system/instance.mjs`.** Instance mirrors home's old structure
  and carries its own copies of the `.fw-*` and `#reskin-preview` rules (`instance.html:87-117`,
  `:223-247`). It is deep-link-only, outside the VR set, and re-shells onto the studio at #222. Its
  shared `portfolio.css` classes (`.close-card`, `.close-takeaway`, `.peak-*`, `.wear-intro`,
  `.intake-*`, `.band--interstitial`) therefore **stay in `portfolio.css`** — see GOTCHA in Task 8.
- **No new controls.** The handle fix is styling only — no stepper buttons. New controls would mean
  new `param-manifest.json` entries, `gen-param-count`, approach's rendered total and its baselines,
  for an affordance that CSS already solves (ticket, folded-in section).
- **No new committed gate.** The handle verification is a run-and-report proof, not a new driver.
  The ticket's AC list asks for verification, not for coverage.
- **Not #245's leverage ladder.** This ticket only guarantees the anchors it will attach to.
- **Not view transitions.** Nothing new is named for VT; `#190` has not landed and
  `vt-stack-audit.mjs` still false-positives hazard A on `/index` (2 of 7 IA pages).

## Feature Metadata

**Feature Type:** Refactor (IA surgery + deletion) with one Enhancement (the handle affordance)
**Estimated Complexity:** High — not algorithmically, but in blast radius: four shipped pages, three
deleted modules, two deleted analytics trackers with a CI-pinned roster, three generated artifacts,
two operator drivers, one CI gate group, and **18** chrome-bearing baselines.
**Primary Systems Affected:** `index.html` · `work.html` · `approach.html` · `contact.html` ·
`404.html` · `system/client.neutral.config.js` · `system/portfolio.css` · `system/scrub.mjs` ·
`system/palette.mjs` · `system/analytics.mjs` · deleted: `system/peak.mjs` · `system/close.mjs` ·
`system/intake-beat.mjs` · `tooling/build-checks.mjs` · `tooling/visual-regression/visual.spec.mjs`
+ baselines · `tooling/vt-verify.mjs` · `tooling/build-journey.mjs` · `system/param-manifest.json` +
`param-count.json` · `system/loc-summary.json`
**Dependencies:** none new. Shipped-page hard constraint holds: vanilla, no bundler, no runtime deps.

## Related Work

**Implements:** #216 · **Epic:** #202 — `docs/epics/prototype-studio.prd.md` +
`docs/epics/prototype-studio.architecture.md`

**Back-references** (decisions inherited, not re-opened):

- `.claude/plans/studio-route-surgery-orchestrator-206.md:76-84` — **D2: "The nav/footer label stays
  'Factory'; the rename to 'Studio' is handed to #216."** Inherited verbatim. Its stated reason (the
  label lives in `client.neutral.config.js`, so it churns every chrome baseline, and #216 already
  runs alone) is why the rename lands here. D1 is also inherited: the inspector panel ids `agents` ·
  `round-trip` · `shape` are preserved verbatim, and `palette.mjs:113-115` deep-links them.
- `.claude/plans/st-ux-wave1-strategy-copy-244.md` + the #216 comment on GitHub — Wave 1's
  outcome-framed copy is **this ticket's source text**: compress the reframed register, do not
  resurrect the old one. **Correction carried from that comment:** on home only the close-card
  *line* was reframed; `index.html:314-317` (handoff takeaway) and `:328-334` (/build takeaway) were
  deliberately left untouched (#244 report, deviation 8) and are **fresh text**, not already-treated.
  Both paragraphs are deleted by this ticket, which discharges them.
- `.claude/plans/ux-overhaul-v3-prd-research.md:37` — "First pass is 5 seconds for role fit, ~60–90
  seconds total. Role and outcome must be legible above the fold. Generic taglines fail instantly."
  `:30` — peak-end rule, one unmistakable peak. This is AC #2's bar.
- `.claude/plans/v3-evidence-home-restructure.md` (#78) and `.claude/plans/v3-spine-skeleton.md`
  (#71) — the spine this ticket evolves. PRD §Amendments 3: evolved, not discarded.

**Forward-references:**

- **#245 (ST/UX Wave 2 — the leverage ladder)** is *blocked on this ticket landing* and places itself
  as "the capstone after the method/case sections" on approach, confirming against "#216's landed
  IA". **This ticket must therefore leave `#method`, `#case` and `#sources` on `approach.html` as
  named sections with those exact ids.** Post a one-line comment on #245 when this merges.
- **#222** re-shells instances onto the studio and is where `instance.html`'s mirror of home's old
  spine (and `agentic-ui-study.html`'s retirement) is resolved.
- **#223** (epic close) runs the copy + count audit and records cuts.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

**The four pages**

- `index.html` (whole file, 428 lines) — Why: the subject. Note the region-contract comment at
  `:22-50` describes the seven-beat spine and must be rewritten, not patched.
- `work.html:171-226` (the "Run it" grid) and `:425-463` (`#more` row-list) — Why: the two biggest
  stale-copy sites. `:185-197` Exhibit 01 points at `/` and describes the old home; `:444-450`
  labels `/factory` "The evidence home".
- `approach.html:54-57` (hero CTAs), `:237-244` (closing CTA row), `:61`, `:127`, `:204` (the three
  section ids #245 and `palette.mjs:110-112` and `work.html:453` depend on) — Why: trim targets and
  must-not-rename anchors.
- `contact.html` (whole file, 49 lines) — Why: verify it carries no old-IA claim; it is a chrome
  churn page regardless.
- `404.html:33-37` — Why: its secondary CTA is a one-line re-point.

**The chrome**

- `system/client.neutral.config.js:22-51` — Why: the nav array and footer site index you rewrite.
  The comment at `:22-26` records the v3 D6 decision this ticket supersedes.
- `system/site.js:33`, `:56-58` — Why: `data-page` → nav `key` is how "active" is marked; dropping
  `Home` from the nav means `/` marks nothing active (deliberate, D2 below).
- `system/palette.mjs:89-129` — Why: the static command list, built once and **memoized at first
  open**. `:92` `"Go to Factory"`, `:113-115` the three `Factory: …` exhibit labels, `:109`
  `["Home: verify it yourself", "/", "verify"]` — the last is why `#verify` keeps its id.

**Home's modules — what survives and what dies**

- `system/spine.mjs:118-199` — Why: `heroBeat` survives untouched. It is the "live re-skin proof"'s
  first act, it opens **two** view transitions at load (`:147`, `:149`) which is `vt-verify`'s
  expected boot count, and it sets `#beat-hero[data-spine="ready"]` in a `finally` on every path,
  which is the VR gate's `waitReady`.
- `system/scrub.mjs:1-96` (the primitive) and `:98-175` (the home mount) — Why: `reflect()` at `:45`
  sets `handle.textContent`, which is the whole reason the glyph must be a pseudo-element.
  `:116-119` is a **silent** early return (`if (!host || !preview) return;` — no console error, no
  handle) — move or rename `#reskin-preview` or `[data-stage-scrub]` and all three handles vanish
  with a pixel-plausible capture. `:22` imports `getHomeAnswers`, which dies with `intake-beat.mjs`.
- `system/derive-probe.mjs:66-68`, `:142-149` — Why: approach's two handles, same shared
  `.stage-scrub-handle` class, same `makeScrubbable` primitive. They must be re-verified after the
  CSS change.
- `system/pack-derived.mjs:296-302` (`getElementById("beat-brand")` + five `[data-brand-*]` hooks)
  and `:389` (`getElementById("beat-hero")`) — Why: **both ids must survive.** `:500` calls
  `trackFactoryArrived`, which is why that tracker is *not* deleted.
- `system/brand-import.mjs:70-77` (its `[data-import-*]` hooks + `#beat-brand` for the name input),
  `:384` (its one `morph()` call — on the *unclaimed* fallback path only, so with the dock present
  on home it does not fire), `:394` (`trackFactoryDriven`, which is why *that* tracker survives).
- `system/intake-beat.mjs` (51 lines), `system/peak.mjs` (332 lines), `system/close.mjs` (227 lines)
  — Why: the three files deleted. Read their headers before deleting: `peak.mjs:26` records that the
  receipt presentation was extracted to `wcag-receipts.mjs`, which `instance.mjs:64` imports and
  which **must not be deleted with it**.
- `system/factory-intake.mjs:39`, `:261` — Why: the shared wizard survives (instance.html mounts it,
  `/build` has its own), and it is the second caller of `trackFactoryDriven`.

**Analytics + its CI pin**

- `system/analytics.mjs:36` `/factory/driven`, `:61` `/factory/built`, `:76` `/factory/shared`,
  `:98` `/factory/arrived`; `:225-245` `trackBuildShared` (a **separate** export at a separate path
  — deleting `trackFactoryShared` does not touch it); `:274`, `:314`, `:328` the studio's three.
- `tooling/build-checks.mjs:1725-1775` (group 10, case j) — Why: `MIN` at `:1746` pins all four
  `/factory` tracker names **so that a drop is as red as a duplicate**. Deleting two trackers
  without editing this list is a red CI `verify`.

**Gates**

- `tooling/visual-regression/visual.spec.mjs:17-31` — Why: index's entry. `waitVisible:
  '#beat-peak[data-peak="ready"]'` **deadlocks the gate to timeout** once the peak is deleted, and
  the `if (p.waitVisible)` guard at `:192-231` is what keeps a page out of the bounded re-measure
  loop. `:106` is the /components entry that makes the chrome count 18, not 16.
- `tooling/vt-verify.mjs:94-112` (home's SITEWIDE row) and `:243-277` (the loop that consumes it —
  it calls `s.act(sp)` unconditionally, three times).
- `tooling/build-journey.mjs:996` and `:1019` — Why: **both** assert `'/index.html'` +
  `.close-card a[href="/build"]` (JS-on and JS-off). Deleting home's close card breaks both.

**Generated artifacts + their generators**

- `system/param-manifest.json` — 21 `"page": "/"` entries today; eight go. `$description` carries
  the counting rules.
- `agent-layer/gen-loc-summary.mjs:22-25` — Why: the `runtime` group is `system/*.{css,mjs,js}`, so
  deleting three modules moves `files` 75 → 72 and `linesApprox` down ~600. **`approach.html:280-283`
  renders both numbers**, so approach's copy changes and its baselines must not be trusted to a
  green pixel run (see GOTCHA in Task 22).

### New Files to Create

- *(none — this ticket only edits and deletes shipped source)*
- `<scratchpad>/handle-affordance-proof.mjs` — a throwaway Playwright proof for AC #7 (not committed).

### Relevant Documentation — YOU SHOULD READ THESE BEFORE IMPLEMENTING

- `docs/epics/prototype-studio.prd.md` §Scope 1 ("Home compresses to a short gate (billboard + live
  re-skin proof → studio) … Approach/work/contact trim to evidence layers"), §Users (recruiter 90 s
  / hiring manager 5–15 min / deep-diver = three entry modes of **one** surface), §Amendments 3
  (the spine evolved, not discarded).
- `docs/epics/prototype-studio.architecture.md:126-133` (route surgery: `/factory` is already in
  pack-boot's allowlist, the VR page set and param-manifest's scope clause) and `:142-147` (docs,
  two mounts — why the palette registers static commands only).
- `CLAUDE.md` — the token-discipline, honesty-contract, "run the surface you touched" and
  cascade rules (loc-summary · param-manifest · baselines · `Closes #N`).
- MDN `::after` + `content` — Why: the glyph is a generated box, not a child node, which is what
  makes it survive `textContent` rewrites.
- WAI-ARIA `slider` pattern — Why: `makeScrubbable` always sets `aria-label`, so a `::after` glyph
  cannot pollute the accessible name (name-from-author wins over name-from-content).

### Patterns to Follow

**Deleting a page section is deleting its module, its manifest entries and its trackers.** The repo
has no dead-code tolerance: `loc-summary.json` counts tracked `system/*.mjs` and approach *renders*
the number, so an unmounted-but-committed module makes a size claim about code nothing loads.

**A dead same-page hash is the same failure as a dead route** (AC #8). The live instances:
`palette.mjs:109` → `/#verify`, and `index.html:67`, `:123`, `:124` → `#beat-intake`.

**Silent-return mounts are the repo's recorded defect class.** `scrub.mjs:116-119`,
`build-import.mjs:114` (called out by name in #206's plan). Pin every surviving hook id in the task
and assert the *running page*, never "the section renders".

**The check must be able to fail** (`.claude/plans/`, memory `check-that-cannot-fail`). Every #137
defect survived a green gate the same way: the check skipped the thing it tested. A load-time
assertion that a glyph exists passes for the broken (`textContent`-child) version too — the proof
must drag and arrow-key first.

**Comment headers cite their governing doc and stay true.** Every file you touch whose header
describes the old spine (`scrub.mjs:1-18`, `index.html:22-50`, `analytics.mjs:8`,
`client.neutral.config.js:22-26`) gets its header corrected in the same edit, not left contradicting
the code.

---

## IMPLEMENTATION PLAN

**Phase 0 is already done** — see the section of that name above. Its five findings are inputs to
Tasks 1, 2, 6 and 18; do not re-derive them.

### Phase 1: The shared scrub-handle affordance

**Independent of:** Phases 2–4. It touches only `portfolio.css`'s `.stage-scrub-handle` block and is
provable on the current tree before any markup moves. Doing it first means the handle proof runs
against *today's* home as well as tomorrow's, which is a free extra data point — and it is how the
Phase 0 prototype was measured, so Task 1's expected numbers are directly comparable.

**Tasks:** rewrite the recipe as a chip + `::after` glyph; prove it survives drag and arrow-key on
both surfaces, cross-engine.

### Phase 2: Home compresses

**Depends on:** Phase 1 (the merged section's markup should be written against the final handle
recipe so the two-column layout is judged once).

**Tasks:** rewrite `index.html` to four sections; delete the three orphaned modules; rewire
`scrub.mjs`; re-scope and prune `portfolio.css`; delete the two orphaned trackers and unpin them.

### Phase 3: Chrome + the evidence layers

**Depends on:** Phase 2 only for copy consistency (work/approach describe what home now is).

**Tasks:** nav + footer + palette; work's Run-it grid and `#more` list; approach's trim; contact and
404 one-liners.

### Phase 4: Cascades, gates and baselines

**Depends on:** Phases 2 and 3 — every regenerated artifact and baseline must be produced from the
final tree.

**Tasks:** param manifest + count; loc summary; the VR page entry; `vt-verify`; `build-journey`;
build-checks; the link audit; all chrome-bearing baselines from a clean detached worktree.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom.

> **`VALIDATE` conventions used below.** `serve` = `node tooling/visual-regression/serve.mjs` (port
> 4757). **Before trusting any journey/probe run, `curl` a file you just edited through the server**
> — parallel sessions have held that port for days serving *their* tree (memory:
> `stale-serve-wrong-tree`). Playwright is resolved from
> `tooling/visual-regression/node_modules`, never added as a repo dep.

---

### 1 · UPDATE `system/portfolio.css` — the shared handle recipe

- **IMPLEMENT:** rewrite `.stage-scrub-handle` (`:1018-1029`) as a token-only chip with a trailing
  drag glyph. Target shape:
  ```css
  .stage-scrub-handle {
    /* No `display`: the handle is a flex item of .stage-scrub-field / .asrc-probe-field
       (both display:inline-flex), so it is already blockified and min-width:4ch is live.
       Measured on both surfaces before this change: display=block, box 35×29. */
    font-family: var(--font-mono);
    font-size: var(--type-caption);
    color: var(--color-fg);                      /* was --color-accent; the accent is the focus ring's now */
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    cursor: ew-resize;
    touch-action: none;
    user-select: none;
    min-width: 4ch;
    text-align: center;
  }
  .stage-scrub-handle::after {
    content: "\21D4";                            /* ⇔ — the one axis these handles move on */
    margin-left: var(--spacing-xs);
    color: var(--color-fg-muted);
  }
  ```
  **This exact recipe was prototyped over the live pages and measured — see Phase 0 ➋➌➍.**
  Keep `:focus-visible` (`:1030`) exactly as it is. Update the block comment at `:1008-1012` to say
  the recipe is a chip and *why* the glyph is a pseudo-element (`scrub.mjs:45` rewrites
  `textContent`), so the next editor cannot regress it into a child node.
- **PATTERN:** `system/portfolio.css:1008-1030` (the existing block, and its "one recipe, one focus
  ring, one keyboard model across both surfaces" invariant — honour it: **one** edit, no page-scoped
  copy).
- **IMPORTS:** none — CSS.
- **GOTCHA (three):**
  1. **Do not add `display: inline-block`** — Phase 0 ➋. It is a no-op (flex-item blockification
     already applies) and its presence would imply `min-width` was previously inert, which is false.
  2. **Keep the scrub row on the band ground, not inside `.brand-input`.** The chip's fill is
     `--color-bg-surface`, and `.brand-input` (`portfolio.css:1138-1146`) *is* a
     `--color-bg-surface` panel — nest the row inside it and the chip's fill matches its parent, so
     only the border reads. Task 3 keeps `[data-stage-scrub]` in the stage column, on the band
     ground, exactly where it is today. Measured: on both packs the chip is legible against the band
     but its fill is close to the panel's.
  3. **No animation, no pulse, no glow.** The VR gate captures under *no-preference* with
     `animations: 'disabled'` (memory: `vr-gate-captures-no-preference`); an animated hint is the
     churn-and-flake shape that bit approach's countUp.
- **VALIDATE:** `serve` then open `http://127.0.0.1:4757/index.html` and `/approach.html` in a real
  browser; the three home handles and the two probe handles each show a bordered chip with a `⇔`
  before any interaction. Expected measurements, from Phase 0 ➌ — handle box **61×30**, home's row
  **79px** neutral / **83px** saulera, approach's **104px** both; home's three fields reflow onto one
  row. A materially different number means the recipe was not applied as written. Then run Task 2.
- **SATISFIES:** AC #7.

### 2 · RE-RUN the handle proof against the committed CSS

**The script already exists and already passed** — `<scratchpad>/chip-prototype.mjs`, results in
Phase 0 ➍. It proved the recipe by *injecting* it with `addStyleTag`. Re-running it after Task 1 —
with the `CHIP` constant emptied so the page's own stylesheet is what is under test — is what turns
it into a claim about the shipped file. Extend it to firefox and webkit at the same time (the
prototype ran chromium only).

- **IMPLEMENT:** copy `chip-prototype.mjs` to `<scratchpad>/handle-affordance-proof.mjs`, empty the
  injected `CHIP` (or drop the `addStyleTag` call), add a `for (const engine of ["chromium",
  "firefox", "webkit"])` loop, and assert per page:
  1. loads `/index.html` (wait `#beat-hero[data-spine="ready"]`) / `/approach.html` (wait
     `#asrc[data-asrc="ready"]`);
  2. reads `getComputedStyle(el, "::after").content` on each handle and asserts it is neither
     `"none"` nor `""`;
  3. **drags** one handle (`mouse.move` → `down` → three `move`s → `up`) and re-asserts the `::after`
     content **and** `role="slider"`, `aria-label`, `aria-valuenow`, `aria-valuetext`;
  4. **arrow-keys** the same handle (`focus()` then `ArrowRight` ×3) and re-asserts the same five;
  5. asserts `aria-valuenow` actually changed across both interactions — otherwise steps 3–4 prove
     nothing.
- **PATTERN:** `tooling/proto-journey.mjs` (engine loop, `t(label, cond, detail)` reporting,
  Playwright resolved from `tooling/visual-regression/node_modules`).
- **IMPORTS:** `playwright` from `tooling/visual-regression/node_modules`.
- **GOTCHA:** step 5 is the whole point. A load-only check (step 2 alone) **passes for the broken
  design** — a child-node glyph exists at load and is wiped on first `reflect()`. Prove it can fail:
  temporarily move the glyph to a child `<span>` in a scratch copy and watch step 3 go red.
  `getComputedStyle(el, "::after").content` returns the **quoted** string `"⇔"`, not `⇔` — compare
  against the pre-interaction reading, not a literal, or the assertion is quietly always-false.
- **VALIDATE:** `node <scratchpad>/handle-affordance-proof.mjs` → all rows ✓ on all three engines ×
  both surfaces × both packs (12 combinations). Expected shape, from the chromium prototype:
  `::after` stays `"⇔"` through drag and arrows; `aria-valuenow` moves on both paths
  (home `154 → 178 → 184`, approach `136 → 160 → 166` — engine-dependent, so assert *changed*, never
  those numbers); slider count 3 on home, 2 on approach. Paste the output into the implementation
  report.
- **SATISFIES:** AC #7.

### 3 · REWRITE `index.html` — the four-section gate

- **IMPLEMENT:** replace the seven-section body with four. **Every id and hook below is load-bearing
  and must survive verbatim** (see GOTCHA):

  **§1 `<section class="page-hero" id="beat-hero" data-inspect="page-hero">`** — unchanged
  structurally. Rewrite `h1` + `.hero-sub` for five-second role fit: name the role and the outcome
  above the fold, in #244's outcome register. CTA row becomes:
  `<a class="btn btn-primary btn-arrow" href="/factory" data-inspect="buttons">Open the studio</a>`
  + `<a class="btn btn-secondary" href="/approach" data-inspect="buttons">How I work</a>`.

  **§2 `<section class="band" id="beat-brand">`** — the merged live re-skin proof. Two columns via
  the existing `.intake-live` / `.intake-ask` / `.intake-stage` layout classes:
  - *ask column* (`.intake-ask`): the whole `.brand-input` block from `:163-200` verbatim —
    `[data-brand-color]`, `[data-brand-name]`, `[data-brand-wear]`, `[data-brand-reset]`,
    `[data-brand-label]`, and the entire `.brand-import` / `[data-import]` sub-block.
  - *stage column* (`.intake-stage`): `.intake-stage-cap` caption + `#reskin-preview` (the three
    `.card` specimens with `.fw-preview-pad`, verbatim from `:108-128`) + the
    `.inspect-toggle-row` button + `<div class="stage-scrub" data-stage-scrub></div>`.
  - Fold the wear interstitial's one useful sentence (`:214-219`, the dock/appearance explanation)
    into this section's `.beat-lead`; delete `#beat-wear` and its desktop-only `.wear-cue` link.
  - **Rewrite two now-false captions:** `:105` "The system, generated live from your answers" (there
    are no answers any more) and `scrub.mjs:148`'s caption clause "Running the brief again takes the
    stage back" (Task 5).
  - Drop the `01`/`02` `.beat-numeral`s — they numbered a five-step pipeline that no longer exists.
  - Re-point the two specimen buttons at `:123-124` from `#beat-intake` to `#beat-brand`.

  **§3 `<section class="band" id="verify">`** — the evidence index. Keep the id (`palette.mjs:109`).
  Four `.row-item` rows, studio first:
  `/factory` (the studio — what a real recorded run built, and what you can move) ·
  `/work` (the prototypes, the live library, the handoff pack) ·
  `/approach` (the method, the token contract, the annotated source) ·
  `/components` (every component's docs, generated from one source). Drop the `/roundtrip` and
  `/agentic-ui-study` rows — both stay in the footer index and in `/factory`'s Go-deeper list.

  **§4 `<section class="section">`** — `.hero-cta-row` with `[Open the studio →]` (primary) and
  `[Get in touch]` (secondary). Mirrors `approach.html:237-244` and `work.html:465-472`.

  **DELETE** `#beat-intake`, `#beat-wear`, `#beat-peak`, `#beat-close` and every child, including
  `#factory-wizard`, `#factory-narrative`, `.intake-evidence`, the whole `.peak-*` tree and the whole
  `.close-card` tree.

  **Script tags:** delete `intake-beat.mjs`, `peak.mjs`, `close.mjs`. Final order:
  `client.neutral.config.js` · `site.js` · `portfolio.js` · `analytics.mjs` · `dock.mjs` ·
  `inspect.mjs` · `spine.mjs` · `pack-derived.mjs` · `brand-import.mjs` · `scrub.mjs` ·
  `palette.mjs`. **Keep `dock.mjs` above `spine.mjs`** and keep an updated version of the ordering
  comment at `:422-424` — the reason survives even though its `#77` example does not: `dock` imports
  `pack-derived`, and that import is what runs shared-link hydration before the hero registers.

  **Rewrite the region-contract comment at `:22-50`** to describe the four sections, name this
  ticket, and record that the old beats' successors live in the studio.

- **PATTERN:** `factory.html:87-104` (hero + CTA shape on the destination page);
  `work.html:433-461` (`.row-list` markup); `approach.html:237-244` (the closing `.section` CTA row).
- **IMPORTS:** none — markup.
- **GOTCHA — the pinned hooks.** Each of these is queried by a module that returns **silently** when
  it is missing, so a rename produces a plausible-looking page and a baseline that bakes the loss in:
  | Hook | Consumer | Failure if moved/renamed |
  |---|---|---|
  | `id="beat-hero"` | `spine.mjs:199`, `pack-derived.mjs:389` | no hero re-skin, `data-spine="ready"` never set → **VR gate hangs** (fails loud, the good case) |
  | `id="beat-brand"` | `pack-derived.mjs:296`, `brand-import.mjs:76` | brand controls dead, silently |
  | `id="reskin-preview"` | `scrub.mjs:118` | **all three handles vanish**, silently |
  | `[data-stage-scrub]` | `scrub.mjs:117` | same, silently |
  | `[data-brand-color/name/wear/reset/label]` | `pack-derived.mjs:298-302` | brand beat dead, silently |
  | `[data-import]`, `[data-import-file/drop/status/report]` | `brand-import.mjs:70-73`, `:484` | drop zone dead, silently |
  | `[data-inspect-toggle]`, `data-inspect="…"` | `inspect.mjs` | inspect toggle dead |
  | `id="verify"` | `palette.mjs:109` | ⌘K command points at nothing, **and the palette memoizes** |
- **VALIDATE:** `serve`; `curl -s localhost:4757/index.html | grep -c 'id="beat-hero"\|id="beat-brand"\|id="reskin-preview"\|data-stage-scrub\|id="verify"'` → 5. Then in a browser: the hero re-skins and reverts within ~3 s, the colour input re-skins the page, the drop zone accepts
  `tooling/figma/fixtures/scales-dtcg.json`, three scrub chips render and drag,
  `document.querySelectorAll('[role="slider"]').length === 3`.
- **SATISFIES:** AC #1, #2, #3.

### 4 · REMOVE `system/peak.mjs`, `system/close.mjs`, `system/intake-beat.mjs`

- **IMPLEMENT:** `git rm` all three. They have no remaining importer once Task 5 lands.
- **PATTERN:** CLAUDE.md — "Remove imports/variables/functions that YOUR changes made unused."
- **GOTCHA:** **do not delete `system/wcag-receipts.mjs`.** `peak.mjs:26` and `:41` explain it was
  extracted *out* of peak precisely so `instance.mjs:64` could use it without dragging
  `pack-derived` in. Likewise `share-state.mjs` (survives via `pack-derived.mjs:20`) and
  `factory-intake.mjs` (survives via `instance.mjs` and `/build`'s own store).
- **VALIDATE:**
  `grep -rn "peak.mjs\|close.mjs\|intake-beat\|getHomeAnswers" --include='*.mjs' --include='*.html' --include='*.js' . | grep -v node_modules`
  → only prose mentions in comments/plans remain (fix any that now read as false); zero `import`
  lines, zero `<script>` tags. Then `node --check` each remaining `system/*.mjs` you touched.
- **SATISFIES:** AC #1.

### 5 · UPDATE `system/scrub.mjs` — drop the dead import, read the live brand

- **IMPLEMENT:**
  1. delete `import { getHomeAnswers } from "./intake-beat.mjs";` (`:22`);
  2. replace `brandHex` (`:134`) with a live read of the page's own brand control:
     ```js
     // The reader's live brand, read from #beat-brand's own colour input (pack-derived.mjs owns it).
     // Falls back to the committed scenario brand before the reader touches anything, and on any
     // page that mounts the stage without that control.
     const brandHex = () =>
       (document.querySelector("[data-brand-color]")?.value || DEFAULT_AXES.brandColor).toLowerCase();
     ```
  3. replace both `getHomeAnswers() ?? DEFAULT_AXES` uses (`:134`, `:156`) with `DEFAULT_AXES`;
  4. rewrite the caption at `:147-148` — drop "Running the brief again takes the stage back" and say
     what is true now (the colour input and the handles both feed the same engine, last writer wins);
  5. correct the header (`:1-18`): the LAST-WRITER-WINS paragraph names the intake wizard and
     `factory-intake.mjs:282`, which no longer runs on home. State the surviving interplay
     (pack-derived's `:root` apply vs the handles' `#reskin-preview` writes).
- **PATTERN:** `peak.mjs:108` used exactly this "live brand or the canned default" shape.
- **IMPORTS:** removes one; **adds none** — deliberately. `readRecord()` from `pack-derived.mjs`
  would also work, but `pack-derived`'s module tail runs `hydrateFromSharedLink()` unguarded
  (`wcag-receipts.mjs:6-7` records this), and `scrub.mjs` is imported by `derive-probe.mjs`, so a new
  import would put that side effect on approach's module graph for no gain.
- **GOTCHA:** `mountStageScrub` is guarded by `if (typeof document !== "undefined")` (`:175`) and the
  new `querySelector` sits inside it — Node-import safety is preserved. Do not hoist it.
- **VALIDATE:** `node -e "import('./system/scrub.mjs').then(()=>console.log('node-import ok'))"`;
  then on the running page: pick a brand colour, drag **Brand hue**, confirm the preview's accent
  moves from *that* colour's lightness/chroma rather than snapping to the canned green.
- **SATISFIES:** AC #1, #7.

### 6 · UPDATE `system/portfolio.css` — re-scope the preview, prune what home alone used

- **IMPLEMENT:**
  Exact line ranges, mapped while planning (`grep -n "beat-intake" system/portfolio.css`):
  1. **Re-scope** `#beat-intake #reskin-preview` → `#beat-brand #reskin-preview`, three groups:
     **`:1047-1053`** (the `@property` transition, inside the `no-preference` block opened at
     `:1046`), **`:1073-1079`** (the frame + `.fw-preview-pad` + `.grid-3`), and **`:1110-1121`**
     (the eight-selector `is-animated` colour crossfade).
  2. **Delete** the `#beat-intake .fw-*` rules, four runs: **`:1057-1070`** (wizard card, loading,
     progress, prompt, reasoning, control, radios, radio, radio input, footer), **`:1083-1088`**
     (`#factory-narrative` + `.fw-beat-*` + `.fw-note` + `.fw-scale`/`.fw-verdict`),
     **`:1092-1103`** (the checks table, `.check-draw`, `.bad`, `.fw-swatch`, `.fw-notes`/
     `.fw-patterns`, `.fw-gated`, `.fw-gated-tag`), and **`:1122-1128`** (the `.fw-card` and
     `.fw-checks` entrance animations inside the `no-preference` block, which then closes at
     `:1129` holding only the re-scoped `#reskin-preview.is-animated` group).
  3. **Delete the three keyframes at `:1130-1132`** — `fw-step-in`, `fw-row-in`, `check-draw`.
     Phase 0 ➎ proves this safe: `instance.html:251,253` defines its own `fw-step-in` and
     `fw-row-in`, and `check-draw`'s only reference is `:1126`, deleted above.
  4. **Delete** `.wear-cue` (`:978-979`) and any `.close-extras`-only rules — verify each is
     index-exclusive first.
  5. Add whatever minimal layout the merged `#beat-brand` needs (likely nothing: `.intake-live`'s
     `minmax(0, 2fr) minmax(0, 3fr)` at `:993-995` already gives controls | stage).
- **PATTERN:** the existing `#beat-intake`-scoped block is itself the pattern — page-section-scoped
  selectors so home's rules cannot reach another page's `#reskin-preview`.
- **GOTCHA — DO NOT delete these, `instance.html` still uses them:** `.close-card`,
  `.close-takeaway`, `.peak-*` (the whole `:1509-1600+` region), `.wear-intro`,
  `.band--interstitial` (also `build.html`), `.intake-live` / `.intake-ask` / `.intake-stage` /
  `.intake-stage-cap` / `.intake-evidence`, `#reskin-preview`'s unscoped rules, `.fw-preview-pad`,
  `.fw-scenario`. `instance.html` is deep-link-only and **outside the VR page set**, so nothing
  would catch the breakage. Before deleting *any* selector, run
  `grep -ln "<class>" *.html proto/*.html system/*.mjs` and confirm `index.html` is the only hit.
  **Also do not "simplify" the re-scoping by dropping the ancestor** — an unscoped `#reskin-preview`
  rule would start applying to `instance.html`'s preview, which has its own copies at
  `instance.html:109-117` and `:223-247`.
- **VALIDATE:** `serve`; home's preview keeps its frame, border, radius, padding and 3-up grid, and
  its colours still crossfade when the brand colour changes. `grep -c "#beat-intake" system/portfolio.css` → 0.
- **SATISFIES:** AC #1.

### 7 · UPDATE `system/analytics.mjs` — delete the two orphaned trackers

- **IMPLEMENT:** delete `BUILT_EVENT_PATH` + `trackFactoryBuilt` (`:61-74`) and `SHARED_EVENT_PATH`
  + `trackFactoryShared` (`:76-96`) with their fire-once flags and block comments. **Keep**
  `trackFactoryDriven` (`brand-import.mjs:394` + `factory-intake.mjs:261`) and `trackFactoryArrived`
  (`pack-derived.mjs:500`). Update the module header (`:8`) and any surviving comment that lists the
  four `/factory` paths (`:86`, `:103`, `:132`, `:225-237`, `:253-258`, `:308-314`, `:348` all name
  one or both of the deleted trackers — correct each so no comment describes a function that is gone).
- **PATTERN:** `analytics.mjs`'s own per-tracker block-comment discipline — each surviving tracker
  keeps its "fires once, from its own success path, static literal" note.
- **GOTCHA:** `trackBuildShared` (`:225-245`) is a **different export at `/build/shared`** and calls
  nothing here — it survives untouched. And `trackFactoryArrived` surviving without
  `trackFactoryShared` is correct, not asymmetric: links already in the wild still arrive, and the
  studio's `/factory/link-copied` (`:314`) is the sending half now. Say so in one line where
  `trackFactoryArrived`'s comment currently points at its dead partner.
- **VALIDATE:** `node tooling/build-checks.mjs` — group 10 must go **red** at this point on the
  pinned `MIN`. That red is the proof the pin works; Task 8 discharges it.
- **SATISFIES:** AC #1.

### 8 · UPDATE `tooling/build-checks.mjs` — unpin the two deleted trackers

- **IMPLEMENT:** in group 10 case j (`:1744-1748`), remove `"trackFactoryBuilt"` and
  `"trackFactoryShared"` from `MIN`. Add one sentence to the block comment above it recording that
  #216 deleted both with their only callers (home's peak and close beats), that `/factory/built` and
  `/factory/shared` are now free literals no code pushes, and that the studio's `/factory/exported`
  and `/factory/link-copied` are the successors #210 deliberately named differently.
- **PATTERN:** the comment at `:1738-1743` already explains why the pinned minimum exists ("a rename
  that DROPS a tracker must be as red as a duplicate one") — extend it, don't replace it.
- **GOTCHA:** do **not** also relax the derived-roster assertion (`TRACKERS.length >= MIN.length` +
  the duplicate-path check). Nine trackers is the new floor and the duplicate check is untouched.
- **VALIDATE:** `node tooling/build-checks.mjs` → all 21 groups ✓. Then prove it can still fail:
  temporarily rename `trackFactoryDriven` and confirm group 10 goes red; revert.
- **SATISFIES:** AC #1.

### 9 · UPDATE `system/client.neutral.config.js` — nav + footer point at the studio

- **IMPLEMENT:**
  ```js
  nav: [
    { label: "Studio",   href: "/factory",  key: "factory"  },
    { label: "Approach", href: "/approach", key: "approach" },
    { label: "Work",     href: "/work",     key: "work"     },
  ],
  cta: { label: "Get in touch", href: "/contact" },
  ```
  Footer `Site` column, re-ordered and relabelled, still the **full** index:
  `Home /` · `Studio /factory` · `Approach /approach` · `Work /work` · `Build /build` ·
  `Components /components` · `Contact /contact`.
  Rewrite the `:22-26` comment: it currently records the v3 D6 decision ("Factory drops from the nav
  … reached from the Home #verify row-list and the footer"), which this ticket supersedes. State the
  new rule and cite #206's D2 for the label.
- **PATTERN:** the file's own structure; `site.js:56-58` consumes `nav[].key` against
  `body[data-page]`.
- **GOTCHA — `Home` leaves the nav deliberately (decision D2 below).** `index.html` carries
  `data-page="home"`, which now matches no nav key, so **no nav item is marked active on `/`**. That
  is intended: the logo (`site.js:46-48`, `aria-label="… home"`) is the home affordance, and a
  four-item nav would put Home in direct competition with the destination this ticket exists to
  promote. `404.html` already ships `data-page=""` and proves the no-active-item state renders fine.
  Reverting is one array entry.
- **VALIDATE:** `serve`; on every page the nav reads `Studio · Approach · Work` + the CTA, `Studio`
  is marked active on `/factory`, and the footer's Site column lists seven links. Click all eleven —
  zero 404s.
- **SATISFIES:** AC #4, #8.

### 10 · UPDATE `system/palette.mjs` — relabel, keep every hash

- **IMPLEMENT:** `:92` `["Go to Factory", "/factory"]` → `["Go to Studio", "/factory"]`; `:113-115`
  `"Factory: agents trace" / "Factory: round-trip diff" / "Factory: system shape"` → `"Studio: …"`.
  **Change labels only.** Verify `:109` `["Home: verify it yourself", "/", "verify"]` still resolves
  (Task 3 keeps `id="verify"`).
- **PATTERN:** the comment at `:82-84` ("Navigation hrefs are the exact forms the chrome uses") — the
  hrefs are unchanged, so it stays true.
- **GOTCHA:** the panel ids `agents` · `round-trip` · `shape` are #206's **D1**, preserved verbatim
  and deep-linked from `roundtrip.html:176` as well. Rename nothing. And the palette **memoizes its
  command list at first open** (memory: `palette-memoizes-needs-static-tags`) — a command pointing at
  a dead hash fails silently forever, which is why `#verify` survives Task 3.
- **VALIDATE:** `serve`; press ⌘K on `/`, `/approach`, `/work`, `/factory`, `/components` and
  activate every navigation and exhibit command — each lands on a real page or scrolls to a real
  element.
- **SATISFIES:** AC #4, #8.

### 11 · UPDATE `work.html` — the Run-it grid stops describing the old home

- **IMPLEMENT:**
  - `:184-224` — Exhibit 01 (`:185-197`) re-points from `/` to `/factory`: title and body describe
    the studio (a real recorded agent run assembling a product on a canvas you can take over), not
    "start from a brand colour on the home page". Keep the `Runs now` capability chip and the
    three-card grid. Exhibit 02 (`/agentic-ui-study`) and Exhibit 03 (`/build`) stay; re-read
    `:179-183`'s `.beat-lead` so its three-sentence summary matches the new first card.
  - `:444-450` — the `#more` row-item labelled "The evidence home" for `/factory` becomes the
    studio, or is dropped as a duplicate of the new Exhibit 01. Prefer **drop** and keep `#more` to
    `/roundtrip` + `/approach#case` — the studio already has a first-class card above.
  - `:162-167` — the hero sub says "Two exhibits that run in your browser"; there are three cards.
    Fix the count and the register while you are in there.
  - `:465-472` — the closing CTA row gains the studio as the primary action.
- **PATTERN:** `factory.html:411-457`'s row-list copy register (what the thing is, in one clause).
- **GOTCHA:** `work.html:453` links `/approach#case` — Task 12 must not rename that anchor. And
  `build-journey.mjs:1021` asserts `#run a[href="/build"]` on this page with JS off: **Exhibit 03
  must stay static markup inside `#run`.**
- **VALIDATE:** `serve`; every link on `/work` resolves; `curl -s localhost:4757/work.html | grep -c 'href="/build"'` ≥ 1 inside `#run`.
- **SATISFIES:** AC #3, #8.

### 12 · UPDATE `approach.html` — trim to an evidence layer, keep the anchors

- **IMPLEMENT:**
  - Keep `#method` (`:61`), `#case` (`:127`) and `#sources` (`:204`) **as named sections with those
    ids** — #245 places its ladder against them, `palette.mjs:110-112` deep-links inside `#case`, and
    `work.html:453` links `/approach#case`.
  - Keep every evidence surface: the four method cards, the four decision cards, `#asrc` + the two
    snippets + `#asrc-probe`, the inspect toggle, `#loc-proof`, `#param-proof`, the five source
    clusters, the whole inline module block at `:254-302`.
  - Trim only copy that claims the old IA or duplicates the studio: re-read the hero sub
    (`:48-53`), the `#case` lead (`:135`), and the closing CTA row (`:237-244`) — the last currently
    offers "See the demos" → `/work`; make the studio the primary action and keep `/contact`.
  - Do not resurrect pre-#244 phrasing anywhere (the outcome register in `:75-122` is Wave 1's and
    is the source text).
- **PATTERN:** `approach.html`'s own `.beat-head` / `.beat-lead` structure.
- **GOTCHA:** the inline module at `:261` calls `initGlossary(document)` and an unknown `data-term`
  key **throws and aborts the module**, so `[data-asrc="ready"]` is never set and the VR gate hangs.
  If you add or remove a `<dfn class="term" data-term="…">`, the key must exist in
  `system/glossary.mjs`'s `TERMS` — including the three #244 added
  (`declarative-generative-ui`, `steering-layer`, `management-flight-simulator`).
- **VALIDATE:** `serve`; `/approach` renders `#asrc` (the exhibit is `hidden` until success), both
  probe handles drag, both measured lines show numbers, and
  `curl -s localhost:4757/approach.html | grep -c 'id="method"\|id="case"\|id="sources"'` → 3.
- **SATISFIES:** AC #3.

### 13 · UPDATE `contact.html` and `404.html` — the one-line passes

- **IMPLEMENT:** `contact.html` — read the whole file (49 lines) and confirm no copy claims the old
  IA; the hero sub and the Email/GitHub CTAs are IA-neutral, so expect a no-op or a single
  register-matching sentence. `404.html:36` — re-point the secondary CTA from `/work` to `/factory`
  ("Open the studio") so a lost reader lands on the destination.
- **PATTERN:** `404.html:33-37`'s existing two-CTA row.
- **GOTCHA:** both pages' baselines churn from the chrome change regardless of whether you edit a
  byte — that is expected, not a signal you changed something.
- **VALIDATE:** `serve`; both pages render, all four CTAs resolve.
- **SATISFIES:** AC #3, #8.

### 14 · UPDATE `system/param-manifest.json` — remove the eight deleted controls

- **IMPLEMENT:** delete these `"page": "/"` entries (their controls no longer exist):
  `.peak-ethics-choice` · `.peak-adjust-select` · `input[name="fw-density"]` ·
  `input[name="fw-rewardType"]` · `input[name="fw-frequency"]` · `#factory-wizard .fw-footer button`
  · `.close-share-row .btn-secondary` · `.close-tokens .btn-ghost`.
  **Keep all thirteen others**, including the three `.stage-scrub [data-scrub="…"]` handles, the four
  `[data-brand-*]` controls, the five `[data-import*]` entries and the inspect toggle.
- **PATTERN:** the file's `$description` counting rules — one entry = one distinct control per page;
  conditional controls count and carry a note.
- **GOTCHA:** do not touch `/approach`'s four entries — the handle change is styling only and adds no
  control, which is exactly why the ticket forbids stepper buttons.
- **VALIDATE:** `node agent-layer/gen-param-count.mjs` then `node agent-layer/gen-param-count.mjs --check` → no drift. `--check` only proves the artifact matches the manifest, **not that the manifest matches the page** — a wrong-but-consistent count passes it. So assert the count directly:
  ```bash
  python3 -c "import json;e=json.load(open('system/param-manifest.json'))['entries'];print(len([x for x in e if x['page']=='/']))"   # → 13
  ```
  Counted while planning: 21 home entries today, all eight selectors above present verbatim, 13
  survivors. Then open `/` and confirm each of the 13 selectors matches a real element
  (the four `[data-import-report]`/swatch/compare-slider entries are **conditional** — they appear
  only after a successful import, so drop `tooling/figma/fixtures/scales-dtcg.json` first).
- **SATISFIES:** AC #1.

### 15 · REGENERATE `system/param-count.json` and `system/loc-summary.json`

- **IMPLEMENT:** `node agent-layer/gen-param-count.mjs` (already run in Task 14) and
  `node agent-layer/gen-loc-summary.mjs`. Stage both.
- **PATTERN:** CLAUDE.md's cascade rules; `approach.html:272-296` renders both artifacts' numbers.
- **GOTCHA:** `gen-loc-summary` counts **git-tracked** content, so run it *after* `git rm`-ing the
  three modules **and after staging**, or `--check` reports a false clean (memory:
  `loc-summary-counts-tracked-only`). Expect `runtime.files` 75 → 72 and `linesApprox` down ~600
  (610 deleted lines, rounded to the nearest 100). **Both numbers are rendered on approach**, so
  approach's copy changes — this is Task 22's forced-regen case.
- **VALIDATE:** `node agent-layer/gen-loc-summary.mjs --check` and `node tooling/drift-check.mjs` →
  clean on a clean tree.
- **SATISFIES:** AC #5.

### 16 · UPDATE `tooling/visual-regression/visual.spec.mjs` — index's entry

- **IMPLEMENT:** on the `index` page entry (`:31`), **delete `waitVisible:
  '#beat-peak[data-peak="ready"]'`** and keep `waitReady: '#beat-hero[data-spine="ready"]'`. Rewrite
  the comment block at `:24-30` — the `waitVisible` half describes the peak's visible-activated
  swap, which no longer exists. Record that home now has **zero** `activateOn:'visible'` beats
  (`spine.mjs:199` registers `beat-hero` at `'load'` and is the only surviving `registerBeat` call
  on this page), so index leaves the bounded re-measure loop by the existing `if (p.waitVisible)`
  guard at `:192`.
- **PATTERN:** the `contact` / `404` entries — pages with no post-load beat.
- **GOTCHA:** leaving `waitVisible` in place **deadlocks the gate to a 30 s timeout on both packs**
  — `#beat-peak` will not exist. And do not "helpfully" add a `waitVisible` for the brand beat:
  nothing on home activates on visibility any more, so it would deadlock the same way.
- **VALIDATE:** part of Task 22's baseline run — the index tests must complete in the normal budget,
  not time out.
- **SATISFIES:** AC #5.

### 17 · UPDATE `tooling/vt-verify.mjs` — home becomes a boot-count-only row

- **IMPLEMENT:** home has **no** `morph()`-wrapped interaction after the trim (see GOTCHA), so its
  SITEWIDE row (`:102-112`) becomes boot-only:
  ```js
  {
    page: "/index.html", label: "home · load", boot: 2,
    bootWhy: "spine heroBeat re-skin + revert (#72), both settled before data-spine=ready",
    ready: (p) => p.waitForSelector('[data-spine="ready"]', { timeout: 20000 }),
    // No `act`: #216 compressed home to the gate, and the intake wizard — home's only
    // morph()-wrapped verb — moved into the studio's method band (#214). brand-import.mjs:384's
    // morph is the UNCLAIMED fallback only; with dock.mjs on the page the dock owns that
    // transition, so there is no reader verb on this page for the per-verb claim to measure.
    // The boot count is still worth asserting: it is the property the pixel gate depends on.
  },
  ```
  Guard the loop at `:243-277` so a row without `act` asserts its boot count and continues:
  ```js
  if (!s.act) { await sctx.close(); continue; }
  ```
  placed immediately after the boot assertion at `:250-251`, before `const from = await s.state(sp)`.
- **PATTERN:** the `#204/#205` studio-canvas block at `:279-293` — the file already carries a
  precedent for "this surface's claim is a different number, written as its own shape, and it says
  so".
- **GOTCHA:** `boot: 2` is only honest if `spine.mjs:138-159` is unchanged — this ticket does not
  touch `heroBeat`, so it stays 2. If a later edit changes the hero, the count changes with it,
  deliberately (ticket's trap note). **State the coverage loss out loud** in the comment and in the
  implementation report: home no longer contributes a per-verb transition assertion. The other four
  SITEWIDE rows (instance ×1, study ×2, trace ×1) are untouched.
- **VALIDATE:** `serve` then `node tooling/vt-verify.mjs all` → every row ✓ on chromium, firefox and
  webkit; home reports `load opens 2 transition(s)` and no per-verb rows.
- **SATISFIES:** AC #6.

### 18 · UPDATE `tooling/build-journey.mjs` — move the `/build` link-in assertions off home

- **IMPLEMENT:** in both loops, replace the `/index.html` row with the studio's:
  - `:996` — `["/factory.html", '#verify-further a[href="/build"]', "the studio's go-deeper list"]`
  - `:1019` — `["/factory.html", '#verify-further a[href="/build"]', "the studio"]`
  Update the surrounding comment at `:1012-1017`: the two documented JS-off routes to `/build` are
  now **the studio and work**, not home and work; home no longer links `/build` because the gate
  carries one route (the studio) and the studio carries the form fallback
  (`factory.html:412-420`).
- **PATTERN:** the existing two-row table and its `t(...)` assertions — shape unchanged, targets moved.
- **PRE-VERIFIED — take the two-row branch.** This was Phase 0 ➊'s blocking question and it is
  answered: with `javaScriptEnabled: false`, `/factory.html` renders 6,893 characters of visible
  text across five headings (vs home's 3,990 across seven), and `#verify-further a[href="/build"]`
  is present, visible and clicks through to `/build`. The studio's JS-off floor is **better** than
  the one this assertion is moving off. No fallback needed; the `/work`-only variant is recorded in
  Phase 0 only so a future reader knows it was considered and why it was not taken.
- **GOTCHA:** whichever branch you take, do not leave a row pointing at `/index.html` — the selector
  `.close-card a[href="/build"]` matches nothing after Task 3 and the driver's `.click()` would hang
  to timeout rather than report a clean failure. If you run `build-journey` between Tasks 3 and 18
  you will see exactly that; it is expected, not a regression to chase.
- **VALIDATE:** `serve` then `node tooling/build-journey.mjs all` → all rows ✓ ×3 engines. A failure
  here is a real regression *or* a known flake — stash and run `HEAD` to tell them apart (memory:
  `build-journey-failure-vs-flake`).
- **SATISFIES:** AC #8.

### 19 · Run the pure CI gates

- **IMPLEMENT:** run the three `verify`-job steps locally.
- **VALIDATE:**
  ```
  node tooling/drift-check.mjs
  node tooling/token-lint.mjs
  node tooling/build-checks.mjs
  ```
  All three clean. `drift-check` on a **clean** tree only — run before staging is a false clean, and
  mid-merge it false-positives (memory: `drift-check-mid-merge-false-positive`).
- **SATISFIES:** AC #5.

### 20 · The link audit — no page links a route or hash that no longer exists

- **IMPLEMENT:** enumerate every `href` on the nine chrome-bearing pages plus the injected footer and
  the ⌘K command list, resolve each, and confirm zero 404s and zero dead same-page hashes. A tiny
  scratchpad script is fine:
  ```
  for each page: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))
  → same-page '#x'  ⇒ assert document.getElementById('x') exists
  → same-origin path ⇒ assert fetch(path).ok
  ```
  Run it **after** `site.js` has injected the chrome, and separately walk the palette's commands.
- **PATTERN:** this is the #160 failure mode named in AC #8 — a deployed shell rendering a nav of
  404s.
- **GOTCHA:** the two known dead-hash instances this ticket creates if a task is skipped:
  `palette.mjs:109` → `/#verify` (kept by Task 3) and `index.html:67,123,124` → `#beat-intake`
  (re-pointed by Task 3). Check both explicitly.
- **VALIDATE:** the script prints zero failures across all nine pages + the palette.
- **SATISFIES:** AC #8.

### 21 · The 5-second role-fit check

- **IMPLEMENT:** at 1440×900 and at 390×844, screenshot `/` above the fold and check it against the
  research bar (`ux-overhaul-v3-prd-research.md:37`, `:30`, `:40`): role and outcome legible in five
  seconds; no generic tagline; nothing that reads as "an interactive toy that maps to no real
  capability". Show it to one person cold if one is available and ask what the role is.
- **GOTCHA:** the hero re-skins ~2.4 s after load and reverts — wait for
  `#beat-hero[data-spine="ready"]` (or ~3 s) before screenshotting, or you capture the canned green
  mid-flush (memory: `hero-reskin-screenshot-trap`).
- **VALIDATE:** the check is recorded in the implementation report with the two screenshots.
- **SATISFIES:** AC #2.

### 22 · Regenerate every chrome-bearing baseline

- **IMPLEMENT:** from a **clean detached worktree under `/Users`** (never `/private/tmp` — Docker
  cannot share it):
  ```
  git worktree add --detach /Users/<you>/vr-216 <this-branch>
  cd /Users/<you>/vr-216/tooling/visual-regression && npm ci && npm run update:docker
  ```
  Copy the regenerated PNGs back and commit them **in this PR**. Expect **18** chrome-bearing
  baselines to move (9 chrome pages × 2 packs: index · approach · factory · roundtrip · work ·
  contact · 404 · build · components) plus nothing else — the two proto pages carry no chrome.
- **PATTERN:** the epic's "any at-rest change to a shipped page ⇒ regen from a clean detached
  worktree under `/Users`" rule.
- **GOTCHA — three, all recorded failures:**
  1. **The gate screenshots the DIRTY tree** (memory: `vr-gate-reads-working-tree`) — hence the
     clean worktree.
  2. **`maxDiffPixels: 100` swallows a few changed digits** (memory: `vr-tolerance-hides-text-changes`,
     and the ticket's own trap list). `approach`'s only change may be the two measured numbers from
     Task 15 — a green `update:docker` is **not** proof it re-baselined. If the PNG's mtime does not
     move, `rm` the two approach PNGs and re-run to force it (memory: `vr-update-skips-subperceptual`).
     **Read the copy diff; do not trust the pixels.**
  3. A local Docker pass is not CI green — check `gh pr checks` after pushing, and know that
     approach's `countUp` can flake the "two consecutive stable screenshots" retry (memory:
     `vr-gate-approach-countup-flake`).
- **VALIDATE:** `cd tooling/visual-regression && npm run test:docker` on the final tree → 22/22 pass.
- **SATISFIES:** AC #5.

### 23 · Post the coordination note on #245

- **IMPLEMENT:** after merge, comment on #245: approach keeps `#method` · `#case` · `#sources` as
  named sections, the ladder's default placement (capstone after method/case) still holds, and the
  page's evidence role is unchanged — so #245's "confirm against #216's landed IA" resolves to *no
  move*.
- **VALIDATE:** the comment is on the issue.
- **SATISFIES:** the epic-#243 coordination contract.

---

## TESTING STRATEGY

There is no unit-test suite in this repo by design (CLAUDE.md: "no suite, no linter, no type-check —
don't hunt for or invent one"). "Done" = the pure checks pass, the drivers pass, and the surfaces you
touched were run.

### Pure checks (CI, blocking)

`tooling/drift-check.mjs` · `tooling/token-lint.mjs` · `tooling/build-checks.mjs` (21 groups). Group
10 is the one this ticket moves; groups 1–9 and 11–21 must be untouched and green.

### Driver checks (operator-run, cross-engine)

| Driver | Why it must run here | Command |
|---|---|---|
| `vt-verify.mjs` | AC #6 — home's boot count, and the four untouched SITEWIDE rows must not regress | `node tooling/vt-verify.mjs all` |
| `build-journey.mjs` | its two `/build` link-in rows moved off deleted home markup | `node tooling/build-journey.mjs all` |
| the handle proof (Task 2) | AC #7 — the affordance must survive drag **and** arrow-key | `node <scratchpad>/handle-affordance-proof.mjs all` |
| the link audit (Task 20) | AC #8 | scratchpad |
| `visual.spec.mjs` | AC #5 | `npm run test:docker` |

`studio-journey.mjs` and `proto-journey.mjs` are **not** required — this ticket edits neither the
studio nor the protos. Run `studio-journey.mjs chromium` once anyway as a cheap regression check on
`/factory`, since the nav injection changes on that page too.

### Edge cases that must be exercised by hand

1. **JS off** on `/` — the gate must still read as a complete page: hero, brand copy, preview
   specimens, the evidence rows, the close CTA. The drop zone and the scrub row are fail-closed
   (`.stage-scrub:empty { display: none }`), which is correct.
2. **Reduced motion** on `/` — `heroBeat` returns before re-skinning (`spine.mjs:143`) and still sets
   `data-spine="ready"`; nothing else on the page animates at rest.
3. **A worn derived pack** (enter a colour, tick "Wear it", reload) — `spine.mjs:143`'s
   `isWearingVisitorPack()` must still skip the hero re-skin so the visitor's brand is not
   revert-stripped (the #74/#76 trap the ticket names).
4. **An imported pack** (drop `tooling/figma/fixtures/scales-dtcg.json`) — the mapping report, the
   WCAG receipts, "wear it", the compare slider and the pack download all still work inside the
   merged section, and `/factory/driven` still fires once.
5. **An old shared link** (`/?brand=…&…` from before this ticket) — `pack-derived.mjs`'s
   hydration still applies it and `trackFactoryArrived` still fires, even though home can no longer
   *create* such a link.
6. **A 320px viewport** — the merged two-column section collapses to one (`.intake-live`'s
   `minmax(0, 2fr) minmax(0, 3fr)` is inside `@media (min-width: 960px)`, `portfolio.css:993-995`),
   and the chip handles wrap without overflowing.
7. **Both packs** — run every visual check under saulera as well as neutral; the dock's rail is
   desktop-only (≥1100px).

---

## VALIDATION COMMANDS

Execute every command. Zero regressions, 100% feature correctness.

### Level 1: Syntax & structural

```bash
node --check system/scrub.mjs system/analytics.mjs system/palette.mjs
node -e "import('./system/scrub.mjs').then(()=>console.log('scrub node-import ok'))"
node -e "import('./system/analytics.mjs').then(()=>console.log('analytics node-import ok'))"
grep -rn "peak.mjs\|close.mjs\|intake-beat" --include='*.html' --include='*.mjs' --include='*.js' . | grep -v node_modules   # no live refs
grep -c "#beat-intake" system/portfolio.css                                                                                 # → 0
```

### Level 2: Pure gates (the CI `verify` job)

```bash
node tooling/drift-check.mjs
node tooling/token-lint.mjs
node tooling/build-checks.mjs
node agent-layer/gen-loc-summary.mjs --check
node agent-layer/gen-param-count.mjs --check
```

### Level 3: Driver gates (cross-engine, operator-run)

```bash
node tooling/visual-regression/serve.mjs &            # then curl-verify an edited file on :4757
node tooling/vt-verify.mjs all
node tooling/build-journey.mjs all
node <scratchpad>/handle-affordance-proof.mjs all
node <scratchpad>/link-audit.mjs
node tooling/studio-journey.mjs chromium              # cheap /factory regression check
```

### Level 4: Manual validation

1. `npx serve .` (or the gate's server) and walk `/` → `/factory` → `/approach` → `/work` →
   `/contact` → `/components` → `/build` → `/roundtrip` → `/404.html`.
2. On `/`: hero re-skins and reverts; brand colour re-skins the page; drop a token export; drag each
   of the three chips; arrow-key one; toggle inspect; open ⌘K and use three commands.
3. On `/approach`: drag both probe handles; confirm the measured lines show the **new** file/line
   numbers.
4. Repeat 2–3 with the saulera pack selected in the appearance dock.
5. JS off, reduced motion, 320px, and a worn derived pack (edge cases 1–3, 6 above).

### Level 5: The baseline gate

```bash
# from a CLEAN DETACHED WORKTREE under /Users
cd tooling/visual-regression && npm ci && npm run update:docker
# back on the branch, after copying the PNGs in:
cd tooling/visual-regression && npm run test:docker      # → 22/22
gh pr checks                                             # local Docker green ≠ CI green
```

---

## ACCEPTANCE CRITERIA

Mirrors the ticket's eight, each traced to its tasks.

- [ ] **AC #1** — Home is a short gate: billboard + live re-skin proof + one unmistakable route into
      the studio. *(Tasks 3–8, 14, 15)*
- [ ] **AC #2** — Role fit legible within 5 seconds above the fold, checked against the v3 hiring
      research's bar rather than by taste. *(Tasks 3, 21)*
- [ ] **AC #3** — Approach / work / contact read as evidence layers supporting the studio, with no
      orphaned copy claiming the old IA. *(Tasks 11–13)*
- [ ] **AC #4** — Nav + footer point at the studio; the footer still claims — and **is** — the full
      site index. *(Tasks 9, 10, 20)*
- [ ] **AC #5** — Every chrome-bearing baseline regenerated in this PR, from a clean detached
      worktree under `/Users`. *(Tasks 15, 16, 22)*
- [ ] **AC #6** — `vt-verify`'s home entry still passes with an honest boot count. *(Task 17)*
- [ ] **AC #7** — The scrub handles on home and on approach's derive probe read as controls **at
      rest** — affordance visible with no hover, no focus and no pointer, on touch as well as
      desktop; verified by dragging one and confirming the affordance survives. *(Tasks 1, 2)*
- [ ] **AC #8** — No page links a route that no longer exists — and no dead same-page hash either.
      *(Tasks 9–13, 18, 20)*

Plus the epic's standing per-ticket rules:

- [ ] `param-manifest.json` updated + `gen-param-count.mjs` re-run in the same PR.
- [ ] `gen-loc-summary.mjs` re-run (tracked source files were **removed**) + approach's baselines.
- [ ] PR body carries `Closes #216`.
- [ ] The plan, report and review live in this PR (`.claude/plans/`, `.claude/reports/`,
      `.claude/code-reviews/pr-<N>-review.md`).
- [ ] Every check that changed was proven able to fail (Tasks 2, 8).

---

## COMPLETION CHECKLIST

- [ ] All 23 tasks completed in order
- [ ] Each task's `VALIDATE` passed immediately, not at the end
- [ ] Level 1–5 validation commands all executed
- [ ] `build-checks` 21/21, `drift-check` clean, `token-lint` clean
- [ ] `vt-verify all`, `build-journey all`, the handle proof and the link audit all green ×3 engines
- [ ] 22/22 visual tests pass; 18 chrome baselines regenerated and committed
- [ ] No comment or header left describing a deleted module or a deleted beat
- [ ] `#245` commented (Task 23)
- [ ] PR body: `Closes #216`

---

## OPEN QUESTIONS / ASSUMPTIONS

### ➊ Correction to the ticket: **18 chrome-bearing baselines, not 16**

The ticket, the epic's baseline-collision rule and #206's D2 all say "16". That number was written
before #215 added `/components` to the VR page set. Counted from
`tooling/visual-regression/baselines/` today: 11 pages × 2 packs = 22 PNGs, of which 2 pages
(`proto-verdant`, `proto-fieldwork`) carry no chrome ⇒ **9 × 2 = 18**. Task 22 is phrased against
AC #5's words ("every chrome-bearing baseline"), not against a number.

### ➋ Correction to the ticket: **home has no `morph()`-wrapped verb left**

The ticket's AC #6 implies the home `vt-verify` entry keeps working. It cannot keep its current
shape: the entry's `act` clicks Next in `#factory-wizard`, and the wizard leaves home. The only
other `morph()` call reachable from home is `brand-import.mjs:384`, and it runs **only on the
unclaimed/unstored fallback path** — with `dock.mjs` on the page the dock claims the pack request
and owns the transition itself, so that `morph` does not fire in a normal browser. Task 17 therefore
converts the row to a boot-count-only assertion and records the coverage loss. **If you disagree
with that reading, the alternative is to delete the row entirely and say so** — what is not
acceptable is a row whose `act` silently no-ops.

### Decisions made in this ticket (both were this ticket's to make)

**D1 — Home keeps a four-row `#verify` evidence index** (owner-selected, 2026-08-11). The literal
"short gate" reading would delete it; it survives because it carries the honesty contract's "none of
this asks for your trust" promise into the recruiter's 90 seconds, and because `palette.mjs:109`
deep-links `#verify`. The hero's single primary CTA is what makes the studio route unmistakable; the
index below is the evidence layer, not a competing destination.

**D2 — `Home` leaves the top nav; the logo is the home affordance.** Nav becomes
`Studio · Approach · Work` + the Contact CTA. Rationale: the ticket's own framing ("the IA stops
being five peer pages and becomes one destination with evidence around it") makes the nav *the
destination plus its evidence layers*; a four-item nav would put Home in direct competition with the
route this ticket exists to promote. Cost: `/` marks no nav item active (`site.js:57`), which
`404.html`'s `data-page=""` already proves renders fine. **Reverting is one array entry** — if the
owner wants Home back, add `{ label: "Home", href: "/", key: "home" }` at the head of `nav`.

Home's discoverability is **not** reduced to the logo alone: the footer site index keeps its `Home`
row (Task 9), and `palette.mjs:89-103` registers `Go to Home` on every page except `/` (its
"never offer where you already are" skip at `:102` is what makes that automatic). Between the logo,
the footer index and ⌘K there are three routes back; what changes is that none of them is the nav.
Stated here so a reviewer does not read D2 as removing home's route.

### Assumptions

1. **The hero re-skin stays exactly as it is.** `spine.mjs`'s `heroBeat` is *the* live re-skin proof's
   first act and its two load-time view transitions are `vt-verify`'s expected boot count. This
   ticket does not touch `spine.mjs` at all.
2. **`/factory/built` and `/factory/shared` are retired, not re-homed.** #210's own comment
   (`build-checks.mjs:1725-1729`) records that it deliberately avoided reusing those two literals for
   the studio's keep rail, so re-pointing them now would merge two differently-meaning events into
   one CF WA row across time. `/factory/driven` and `/factory/arrived` survive because they still
   have real callers.
3. **`instance.html` is untouched and keeps mirroring home's old spine** until #222. That is why
   almost none of `portfolio.css`'s shared classes can be deleted.
4. **Nothing in `docs/epics/` changes.** This ticket implements decisions already recorded there; if
   an edit here would contradict one, stop and flag it (CLAUDE.md working principle).

### Questions that would change the plan if answered differently

- **Should `/roundtrip` and `/agentic-ui-study` keep a row on home's `#verify` index?** Plan says no
  (footer + `/factory`'s Go-deeper both carry them). One row each to restore if wanted.
- **Should home keep a `/build` link?** Plan says no — the gate carries one route and the studio
  carries the form fallback. This is what forces Task 18's driver edit. If home keeps one,
  Task 18 is deleted instead.

---

## NOTES (open canvas)

### Why the merged section keeps the `.intake-*` class names

`.intake-live` / `.intake-ask` / `.intake-stage` / `.intake-stage-cap` are pure layout primitives
(a two-column grid and its caption) and they are **shared with `instance.html`**. Renaming them to
something honest on home (`.gate-proof-*`) would mean editing `portfolio.css` **and** `instance.html`
— a page this ticket has already scoped out, that carries its own `<style>` overrides, and that no
baseline guards. The cheaper honest move is to keep the names and add one comment in `index.html`
saying they predate the merge and are shared. Revisit at #222, when instance re-shells and the names
can be changed in one place.

### Alternatives weighed and rejected

| Option | Why rejected |
|---|---|
| Keep home's intake wizard in a compressed form | PRD §Scope 6 says "the stepped wizard dies", and #214 landed its successor as on-canvas method cards. A third mount of the same wizard (after `/build` and `instance.html`) on the page that is supposed to be a *gate* is the concept-scatter the epic exists to fix. |
| Keep home's built-screen peak | Peak-end rule wants one unmistakable peak; the research grades the site as a work sample and the studio's compile beat is now the stronger moment. Two peaks means the weaker one is first. |
| Re-home `/factory/built` onto the studio's compile beat | #210 deliberately did not, and its reasoning is committed in `build-checks.mjs:1725-1729`. Reusing the literal would make two different events one indistinguishable CF WA row. |
| Unscope `#reskin-preview`'s CSS instead of re-scoping to `#beat-brand` | It would start applying to `instance.html`'s preview, which has its own rules and no baseline. |
| `readRecord()` from `pack-derived.mjs` for `scrub.mjs`'s live brand | Correct behaviourally, but `pack-derived`'s module tail runs `hydrateFromSharedLink()` unguarded, and `scrub.mjs` is on `approach.html`'s module graph via `derive-probe.mjs`. Reading `[data-brand-color]`'s value gets the same answer with no new import. |
| Add a committed home/approach journey driver for the handle | Scope. The ticket asks for *verification*, not coverage, and its AC list has no driver item. The proof script runs, its output goes in the report, and #223's audit can promote it if the affordance ever regresses. |

### Sequencing and risk

Four of the six risks this plan opened with were **closed before it shipped** (Phase 0): the JS-off
floor, the flex-blockification correction, the chip's measured layout and contrast cost, and the
`fw-*` keyframes' apparent cross-page dependency. Two remain, and both are inherent to the work
rather than unknowns.

The riskiest single edit is **Task 3** (the `index.html` rewrite), because six of the eight
consumers it must not break fail *silently*. The mitigation is the pinned-hook table in that task
plus its `curl | grep -c` validation, and Task 20's link audit as the backstop. This is the one risk
a probe cannot retire — it is a property of the edit, not a fact about the tree.

The riskiest *process* step is **Task 22**. Two recorded traps compound there: the gate screenshots
the working tree, and its 100-pixel tolerance can swallow approach's changed digits. Approach is
the page most likely to be silently under-baselined, and its change (the loc/param numbers) is
exactly the sub-perceptual kind. Force the regen if the mtimes do not move.

**This ticket runs alone.** Do not start it concurrently with anything that regenerates `/factory`'s
baselines or with another chrome ticket (#215 already merged; the next chrome-touching work is
#219/#222). If `main` moves under this branch, merge it **first** and re-run `update:docker` before
review — a review that validates the pre-merge tree is a known cost here (memory:
`review-validated-premerge-tree`).

### Line-count sanity vs the ticket's estimate

The ticket estimates ~800–1100 lines. Deletions dominate: `index.html` −250ish,
`peak.mjs`/`close.mjs`/`intake-beat.mjs` −610, `portfolio.css` −60ish, `analytics.mjs` −40ish.
Additions are small: ~90 in `index.html`, ~15 CSS, ~30 across the drivers and configs. Plus 18 binary
baselines. That lands in range, weighted toward deletion — which is the point of the ticket.

## AMENDMENTS

*(empty at creation — newest entry at the bottom)*
