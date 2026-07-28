# Feature: /build joins the footer site index

The following plan should be complete, but it's important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

**Closes #148.** Epic #134. Deferred from #138 (PR #147) deliberately — this plan pays that debt.

## Feature Description

`system/client.neutral.config.js` describes the footer as "the full site index" (`:24`), and /build
— the sixth public surface — is not in it. It is linked from exactly two places: the home close card
and work.html's proof index. A reader who lands on /approach or /contact has no route to it at all.

This adds **one item** to the footer's `Site` column — `Build → /build`, positioned between `Work`
and `Contact` — and then pays the cost that made #138 defer it: the footer is chrome, so it renders
on every page, and its height changes, so the committed visual baselines for every chrome-bearing
page must be regenerated in the same PR.

The nav is **not** touched (see Solution Statement).

## User Story

As a hiring manager reading /approach or /contact
I want the site's footer index to actually list every page the site has
So that I can reach the one surface that is about *my* product without first landing on the home
close card or the work page.

## Problem Statement

The footer claims to be the full site index and isn't. /build is reachable from two pages out of
eight; on the other six there is no route to it. That is a plain IA gap, and it is exactly the kind
of copy-contradicts-state defect this repo keeps catching in review — the config comment asserts
completeness that the item list does not deliver.

The reason it stayed open is real and worth preserving: chrome renders on every page, so one footer
item invalidates every chrome-bearing visual baseline. #138's report claimed exactly eight PNGs
moved; adding a footer entry would have made that claim untrue and buried a one-line change inside a
large baseline diff. This ticket exists so that baseline churn is the *headline* of its own PR
rather than noise inside someone else's.

## Solution Statement

Five source edits, one regen, four gates.

```
system/client.neutral.config.js   + { label: "Build", href: "/build" }  (Site column, after Work)
                                  + the comment at :22-24 stops being false
build.html                        head comment :23 — "stays OFF the nav and the footer index" is now
                                  half false; the nav half survives, the footer half does not
CLAUDE.md                         map line :49 — same two clauses, same fix
tooling/build-journey.mjs         [17] gains a third link-in: /approach → the footer → /build,
                                  clicked, JS-on only (the footer IS JavaScript)
.claude/plans/build-links-in-and-gates.md   AMENDMENTS — the "not adding it" decision, reversed here
──────────────────────────────────────────────────────────────────────────────────────────────────
tooling/visual-regression/baselines/   16 PNGs regenerated (NOT 20 — see below)
```

**Footer only, not the nav — and the ticket's premise for asking is off by one set.** #148 says "nav
is a five-item set today". It isn't: the nav is **three** items plus the Contact CTA
(`client.neutral.config.js:26-32`), and the five-item set is the footer's `Site` column. The nav was
deliberately shrunk to three by the v3 IA decision recorded in that same comment ("v3 IA (#71): top
nav shrinks to Home · Approach · Work + the Contact CTA"). Adding /build there would silently reverse
a recorded architecture decision, which CLAUDE.md's working principles say to flag rather than drift
past. Footer-only closes the ticket's actual grievance — a reader on /approach has no route — without
touching a decided IA. **Owner confirmed footer-only + the label `Build`, 2026-07-28.**

**Two measured corrections to the ticket's own text**, both load-bearing for the implementer:

1. **16 baselines move, not 20.** The VR gate screenshots 10 pages × 2 packs. Eight of those pages
   load `client.neutral.config.js` + `site.js` and therefore have a footer. The two proto pages
   (`proto/verdant.html`, `proto/fieldwork.html`) load **neither** — verified: `grep -n
   "config\|site.js" proto/*.html` returns nothing. They carry no chrome, so their four PNGs must
   **not** change. If the regen rewrites them, something else moved and that is a finding, not a
   success. ("All 20 baselines" is repeated in the ticket, in `CLAUDE.md:49`, in `build.html:23` and
   in `.claude/plans/build-full-pattern-library.md:586` — the number was never measured against the
   proto exception. This plan states 16 and the CLAUDE.md/build.html edits below carry the corrected
   number forward.)
2. **The capture is effectively full-page, so the footer is genuinely in every shot.** It is not
   Playwright `fullPage` — `visual.spec.mjs:125-130` measures the document height, sets the viewport
   to that exact integer, and captures the viewport, deliberately avoiding fullPage's stitching
   wobble. The consequence is the same: the footer is in frame on all 16, and because the image
   *height* changes, `toHaveScreenshot` fails on size mismatch rather than on a pixel delta — so all
   16 fail loudly before regen. There is no sub-perceptual-threshold risk here (memory:
   `vr-update-skips-subperceptual` does not apply — that trap is for same-size images).

   Two structural confirmations, both worth knowing before you trust the 16/4 split:
   - `visual.spec.mjs:91-100` — `waitForSelector('.site-footer')` sits inside the `p.kind === 'ia'`
     branch. The proto pages take the `else` branch and wait on `#source[data-source="static"]`
     instead. The gate itself already encodes "these two pages have no footer".
   - `visual.spec.mjs:136-144` — the footer was **silently outside** `index-{neutral,saulera}.png`
     from #105 until #138's bounded re-measure loop fixed it (PR #147). So the 16-baseline claim
     depends on that fix being in the tree. It is (memory: `vr-capture-truncates-post-reveal-growth`
     — FIXED). If someone ever removes the `if (p.waitVisible)` re-measure block, `index` and `build`
     silently stop containing their own footers and this ticket's gate would go quietly blind.

## Out of Scope / Non-Goals

- **Not adding /build to the nav.** Reverses #71/D6. See above.
- **Not adding a footer column.** `components.css:462` is `grid-template-columns: 1.4fr 1fr 1fr 1fr`
  with only three children, so an empty fourth track is sitting there — do not reach for it. It
  diffs every baseline just the same and over-builds the IA for one link.
- **Not removing `noindex`.** `build.html:8` carries `<meta name="robots" content="noindex">` and
  `_headers` sets a site-wide `X-Robots-Tag: noindex` anyway (marked "revisit at launch" in
  CLAUDE.md). A footer link to a noindexed page is fine; changing indexability is a launch decision,
  not this ticket's.
- **Not #149** (the /build analytics virtual-route pageview) — the other open /build ticket.
- **Not touching `index.html:317-318` or `work.html:210`.** The existing links stay. index.html's
  comment says /build "is off-nav but reachable" — still true under footer-only, since the footer is
  not the nav. Verified, no edit. (Surgical-changes rule: don't rewrite what is still true.)
- **Not touching `visual.spec.mjs:2-3`** ("the off-nav pattern builder, linked in by #138") — also
  still true. The only header edit there would be cosmetic.
- **Not rewriting the older plan docs** that say "do not add it to the footer"
  (`build-links-in-and-gates.md:70-71`, `build-full-pattern-library.md:586-587`). The repo's own
  mechanism for a reversed decision is the AMENDMENTS section — Task 6 uses it.
- **Not touching `site.js`.** The footer is already fully config-driven (`site.js:94-107`); this is a
  data change, not a chrome change.

## Feature Metadata

**Feature Type**: Enhancement (IA + the deferred cost of one)
**Estimated Complexity**: Low (source) / Medium (the baseline regen is the real work and the real risk)
**Primary Systems Affected**: `system/client.neutral.config.js` (chrome config), 16 VR baselines,
`build.html` + `CLAUDE.md` claim sites, `tooling/build-journey.mjs`
**Dependencies**: none new. Docker (for the baseline regen) and
`tooling/visual-regression/node_modules` (installed).

## Related Work

**Implements**: #148 · **Epic**: #134 (`.claude/plans/hooked-shapeup-pattern-builder.md`)

**Back-references**:

- `.claude/plans/build-links-in-and-gates.md` (#138) — Why: it is the plan that *deferred* this, at
  `:70-71`, and it owns the two links-in that already exist plus the `build-journey.mjs` [17] block
  this extends. Its AMENDMENTS section is where the reversal gets recorded.
- `.claude/plans/build-full-pattern-library.md` `:586-587` — Why: repeats the "do not add to the
  footer, one chrome item churns all 20 baselines" instruction; the count correction above applies
  to it too.
- `.claude/plans/v3-spine-skeleton.md` `:371` — Why: the origin of "the footer stays the full site
  index" as a stated invariant, and of "do NOT touch `site.js`".
- `.claude/plans/visual-regression-gate.md` — Why: the gate whose baselines this ticket regenerates.

**Forward-references**:

- (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/client.neutral.config.js` (whole file, 66 lines) — Why: **the only functional edit.** The
  comment block at `:22-24` explains the v3 IA split (nav shrank, footer stays the full index) and is
  the thing that has to stop being aspirational; `footer.columns[0].items` at `:38-46` is the list.
- `system/site.js` (lines 93-142) — Why: proves the footer is pure config projection — `columnsHTML`
  maps `col.items` to `<li><a>`, `esc()`-ing both label and href. **No code change needed.** Also
  `:53` — nav items get `.active` by `key`; footer items have no active state and need no `key`,
  which is why `build.html:584`'s existing `data-page="build"` is irrelevant to this ticket.
- `system/components.css` (lines 452-511) — Why: the footer's box model, i.e. *why* this churns
  baselines. `.footer-col li { margin-bottom: 10px }` at 15px/1.4ish → the `Site` column (already the
  tallest at 5 items vs `The system`'s 4) grows ~34px, and the whole footer with it.
- `tooling/visual-regression/visual.spec.mjs` (lines 30-67 for the page list, 105-175 for the
  capture) — Why: the 10-page list tells you which 8 have chrome; the capture block explains the
  measure→resize→re-measure fixpoint and why the shot is effectively full-page.
- `tooling/build-journey.mjs` (lines 671-704) — Why: block **[17] EDGE · the links in** is the
  seam. It is a table-driven loop over `[from, sel, where]`, run twice: once JS-on (click + assert
  landing) and once JS-off. Task 5 extends the **first loop only**.
- `build.html` (lines 14-30) — Why: the head comment, whose `:23` clause is about to be half false.
- `CLAUDE.md` (line 49) — Why: the architecture-map entry with the same two clauses.
- `index.html` (lines 316-329) and `work.html` (lines 210-224) — Why: **read to confirm no edit is
  needed**, and to reuse their vocabulary. Do not change them.
- `agent-layer/gen-loc-summary.mjs` (lines 22-26) — Why: `system/client.neutral.config.js` matches
  the `runtime` group regex (`^system/(wc/)?[^/]+\.(css|mjs|js)$`), so this edit *does* feed
  loc-summary. Margins measured below — it will not flip, but `--check` still runs.
- `tooling/drift-check.mjs` (lines 1-90) — Why: the CI gate that runs `genLocSummary({check:true})`
  among six others.
- `agent-layer/build-instance.mjs` (line 359 `cpSync(system/)`, lines 402-408 `stampShell` →
  `index.html` → `validateAssembly`) and `instance.html:729-730` — Why: **read to understand the
  finding, not to fix it.** They are the evidence for Task 11's follow-up issue and for the Edge
  Cases entry on deployed instances. No edit in this ticket.

### New Files to Create

- (none — this ticket adds no source file. Confirmed no loc-summary *file-count* change; see
  Gotchas.)

### Files Regenerated (not hand-edited)

- `tooling/visual-regression/baselines/{404,approach,build,contact,factory,index,roundtrip,work}-{neutral,saulera}.png`
  — 16 PNGs, via `npm run update:docker`. **Never** hand-edit or hand-pick.
- `tooling/visual-regression/baselines/proto-{verdant,fieldwork}-{neutral,saulera}.png` — the 4 that
  must **NOT** move.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

No external documentation is needed — this is a config-data change plus a regen of an existing
in-repo gate. The governing documents are all local:

- `CLAUDE.md` → "Ground rules (conventions)" and "Git" — Why: the `Closes #N` trailer rule, the
  one-atomic-commit-per-ticket rule, and the rule that the plan/report/review ride in the same PR.
- `docs/epics/ai-first-ux-factory.architecture.md` — Why: CLAUDE.md's working principle says to check
  it before changing IA-level decisions. Confirm it holds no five-page-IA constraint that a sixth
  footer item would contradict; if it does, stop and flag (it is expected not to — the five-page IA
  is about *nav*, and contact.html/instance.html already establish that a page can live off-nav).

### Patterns to Follow

**Footer item shape** (`system/client.neutral.config.js:39-45`) — a flat object, label + href, in
visit order, extensionless route:

```js
      {
        title: "Site",
        items: [
          { label: "Home",     href: "/" },
          { label: "Approach", href: "/approach" },
          { label: "Factory",  href: "/factory" },
          { label: "Work",     href: "/work" },
          { label: "Contact",  href: "/contact" },
        ],
      },
```

Note the **aligned `href:` column** — the existing items pad `label:` values to a common width. Match
it: `{ label: "Build",    href: "/build" },` keeps the alignment (`"Build",` + 4 spaces).

**Extensionless routes** — every nav/footer href on this site omits `.html`
(`client.neutral.config.js:9-10`: "Nav pages are extensionless — CF Pages and `npx serve` both
resolve /approach → approach.html"). Use `/build`, never `/build.html`. `build-journey.mjs:672-674`
makes the same point and is why it asserts by *clicking*, not by reading the href.

**Comment voice in the config** (`:22-24`) — the comments state the decision *and its ticket*:

```js
  // v3 IA (#71): top nav shrinks to Home · Approach · Work + the Contact CTA. Factory
  // drops from the nav (D6: it becomes the evidence layer) and is reached from the Home
  // #verify row-list + the footer, which stays the full site index. Every route resolves.
```

Extend in that voice — name #148, say the nav stayed at three deliberately.

**`build-journey.mjs` assertion voice** (`:671-690`) — a `console.log` banner naming the block, a
comment stating *why the assertion is shaped that way*, then `t(claim, boolean, detail)`:

```js
    t(`${where} carries a visible link to /build`, await link.isVisible());
```

**Honesty in counts** — this repo has an explicit failure mode of copy that states a count the state
contradicts (`build-links-in-and-gates.md:507`: "the heading and lead are *counts* — leaving them at
'Two' while three cards render is exactly the class of copy-contradicts-state bug this repo keeps
catching in review"). Both claim sites you edit contain a count. Write 16, not 20, and say what the
four exceptions are.

---

## IMPLEMENTATION PLAN

### Phase 1: The source edits

Everything that changes a byte a browser sees, plus the two claim sites and the journey assertion.
Must be **complete and committed** before Phase 2 — the baseline regen screenshots the working tree
(memory: `vr-gate-reads-working-tree`), so a half-finished Phase 1 bakes a half-finished footer into
16 committed PNGs.

**Tasks:** Tasks 1–5 below.

### Phase 2: The baseline regen

**Depends on:** Phase 1 (all of it, committed).

One Docker run, 16 PNGs, then an audit of *which* 16 moved.

**Tasks:** Tasks 7–8.

### Phase 3: Gates and record

**Depends on:** Phase 2 (the drift gates are cheap and can be run earlier too, but the PR must be
green as a whole).

**Independent of:** Phase 2 — Task 6 (the AMENDMENTS append) and Task 11 (filing the follow-up issue)
touch no shipped file and can be done at any point.

**Tasks:** Tasks 6, 9, 10, 11.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### 0. BRANCH

- **IMPLEMENT**: `git checkout main && git pull && git checkout -b feature/build-footer-site-index`.
  Confirm you are not on a leftover branch — this repo runs parallel ticket sessions out of one
  working directory (memory: `shared-worktree-parallel-sessions`), so verify the branch immediately
  before every commit and stage by explicit path, never `git add -A`.
- **GOTCHA**: the current branch at plan time is `fix/build-deferred-findings-144`. Do not build on it.
- **VALIDATE**: `git branch --show-current && git status --short` → the new branch, clean tree.
- **SATISFIES**: AC #8

### 1. UPDATE `system/client.neutral.config.js` — add the item

- **IMPLEMENT**: in `footer.columns[0].items` (`title: "Site"`), insert between the `Work` and
  `Contact` entries:
  ```js
          { label: "Build",    href: "/build" },
  ```
  Position is deliberate and pinned: the column reads in visit order (Home → Approach → Factory →
  Work → **Build** → Contact), and Contact stays last because it is the CTA destination.
- **PATTERN**: `system/client.neutral.config.js:39-45` — match the `href:` alignment exactly.
- **IMPORTS**: none. This is a plain object literal on `window.CLIENT_CONFIG`.
- **GOTCHA**: `/build`, **not** `/build.html`. Every other href in this file is extensionless.
- **GOTCHA**: do not add a `key:` — that field is nav-only (`site.js:53` uses it for `.active`);
  footer items have no active state.
- **VALIDATE**: `node --check system/client.neutral.config.js` and
  `grep -n 'label: "Build"' system/client.neutral.config.js`
- **SATISFIES**: AC #1

### 2. UPDATE `system/client.neutral.config.js` — the comment that was aspirational

- **IMPLEMENT**: extend the comment block at `:22-24` so it records that the footer index now
  includes /build **and that the nav deliberately did not change**. In the file's existing voice,
  e.g. append after "Every route resolves.":
  ```js
  // /build joins that index (#148) but stays out of the nav: the three-item set above is
  // the D6 decision, not an accident of when the page shipped.
  ```
- **PATTERN**: `:22-24` — decision + ticket number, present tense.
- **GOTCHA**: this is the file that made the "full site index" claim. Do not delete that phrase —
  after Task 1 it is finally true.
- **VALIDATE**: `node --check system/client.neutral.config.js`; re-read `:20-30` and confirm nothing
  in it is now false.
- **SATISFIES**: AC #1, AC #6

### 3. UPDATE `build.html` — the head comment at `:23`

- **IMPLEMENT**: the sentence currently reads (spanning `:22-24`):
  > It stays OFF the nav and the footer index (one chrome item churns every visual baseline) and it
  > stays `noindex` — reachable for a reader who is already here, not a search result.

  Replace with what is now true. Required content: it is **in the footer site index (#148)**; it
  stays **off the nav** (the three-item v3 set, #71/D6); it stays **`noindex`**. Add `#148` to the
  ticket list at `:14-17` and this plan's path to the plan list. Suggested wording:
  > It is in the footer site index as of #148 — the footer calls itself the full site index, so it
  > had to be — but it stays OFF the nav (three items, the #71/D6 set) and it stays `noindex`:
  > reachable for a reader who is already here, not a search result. The footer item is one chrome
  > change, so it moved all 16 chrome-bearing baselines (the two proto pages carry no chrome).
- **PATTERN**: the surrounding head comment — dense, states the decision and its reason.
- **GOTCHA**: the old parenthetical is the *reason for the deferral*, and it is now the reason for
  this PR's diff size. Carry the reason forward; don't just delete it. And write **16**, not 20.
- **VALIDATE**: `grep -n "OFF the nav and the footer index" build.html` returns nothing;
  `grep -n "148" build.html` returns the ticket list and the new sentence.
- **SATISFIES**: AC #4

### 4. UPDATE `CLAUDE.md` — the `build.html` map line (`:49`)

- **IMPLEMENT**: the line currently reads, in part:
  > OFF-nav and `noindex`, but linked from the home close card and work.html's "Run it" grid;
  > deliberately NOT in the footer index (one chrome item churns all 20 visual baselines).

  Replace that clause with: off-nav and `noindex`, linked from the home close card, work.html's "Run
  it" grid **and the footer site index (#148)**. Keep the chrome-churn fact — it is the reason the
  next person will hesitate — but correct the count: **16 baselines, because the two proto pages
  carry no chrome**. Add `#148` to the trailing ticket list (`epic #134, tickets #135–#138` →
  `#135–#138, #148`).
- **PATTERN**: the map's one-line-per-file voice; every clause earns its place.
- **GOTCHA**: keep it on **one line** — the architecture map is one line per entry, and a wrapped
  entry breaks the file's shape.
- **GOTCHA**: `.claude/plans/build-full-pattern-library.md:586-587` gives the same "do not add to the
  footer / all 20 baselines" instruction. It is a historical plan — **leave it**; Task 6 records the
  reversal in the correct place.
- **VALIDATE**:
  ```bash
  grep -n "deliberately NOT in the footer index" CLAUDE.md          # → nothing
  grep -c "^build.html" CLAUDE.md                                    # → 1
  # and the sweep: no LIVE file may still claim 20 baselines
  grep -rn "all 20\|20 baselines\|20 visual\|20 PNG" --include="*.md" --include="*.mjs" \
    --include="*.html" --include="*.js" . | grep -v node_modules \
    | grep -v "^\./\.claude/\(plans\|reports\|code-reviews\)/"
  ```
  The sweep was run at plan time: the **only** live claim site is `CLAUDE.md:49` (this task) — every
  other hit is in `.claude/plans/`, `.claude/reports/` or `.claude/code-reviews/`, which are dated
  historical records and stay as written.
- **SATISFIES**: AC #5

### 5. UPDATE `tooling/build-journey.mjs` — [17] gains the third link in

- **IMPLEMENT**: in block **[17]** (`:671`), add a third row to the **first** loop's table (`:675-678`):
  ```js
    ["/approach.html", '.site-footer a[href="/build"]', "the footer site index"],
  ```
  `/approach.html` is chosen deliberately: it is the page #148 names as having no route, and it has
  no other /build link, so the selector is unambiguous. Update the block's banner/comment to say
  three links are asserted, and add one sentence saying why this row is **absent from the JS-off
  loop** (`:692-703`):
  > The footer is injected by `site.js`, so with JavaScript off there is no footer — and no header
  > either, on any page. That is the site-wide chrome floor, not a regression this link introduces;
  > the two static links in remain the documented JS-off route.
- **PATTERN**: `tooling/build-journey.mjs:675-690` — the exact table shape and the three `t()` claims
  per row (visible → lands on /build → lands on the real page, not a 404).
- **IMPORTS**: none.
- **GOTCHA**: **do not** add the row to the second (`javaScriptEnabled: false`) loop — it would fail,
  and correctly so.
- **GOTCHA**: the third existing assertion checks `title().includes("The builder")` and
  `#act-import` count — both still hold from /approach; no per-row special-casing needed.
- **GOTCHA**: `build-journey` needs a server: `node tooling/visual-regression/serve.mjs &` on
  127.0.0.1:4757 first, and it resolves Playwright out of `tooling/visual-regression/node_modules`
  (never a repo dep).
- **VALIDATE**:
  ```bash
  node tooling/visual-regression/serve.mjs &
  node tooling/build-journey.mjs chromium    # fast signal on [17]
  ```
  then, before the PR, `node tooling/build-journey.mjs all`.
- **SATISFIES**: AC #2, AC #3

### 6. UPDATE `.claude/plans/build-links-in-and-gates.md` — AMENDMENTS

- **IMPLEMENT**: `:779-781` currently reads `- (none yet — created 2026-07-27)`. Replace with a dated
  entry recording that its "Not adding /build to the nav or the footer index" non-goal (`:70-71`) was
  **half reversed** by #148: the footer index gained the item; the nav did not, and the reason it did
  not is #71/D6, not baseline cost. Note the measured correction (16 chrome baselines, not 20).
- **PATTERN**: the AMENDMENTS contract at the bottom of every plan in this repo — append-only,
  newest last, ISO date, what changed and why.
- **GOTCHA**: append; do not rewrite `:70-71` itself. The non-goal was correct *for #138*.
- **VALIDATE**: `grep -n "none yet" .claude/plans/build-links-in-and-gates.md` returns nothing.
- **SATISFIES**: AC #7

### 7. COMMIT Phase 1, then REGENERATE the baselines

- **IMPLEMENT**: commit Tasks 1–6 as one atomic commit (message pattern: `feat(chrome): /build joins
  the footer site index (#148)`), **then** regenerate:
  ```bash
  git status --short          # MUST show only this ticket's files
  cd tooling/visual-regression && npm run update:docker
  ```
- **GOTCHA (location)**: `update:docker` bind-mounts `$PWD/../..`. The repo root is
  `/Users/Berzins/Desktop/Linards_current/ux-factory` — under `/Users`, so Docker file sharing works.
  Do **not** run it from a worktree under `/private/tmp` (including this session's scratchpad):
  Docker on this Mac cannot share that path (memory: `vr-gate-reads-working-tree`).
- **GOTCHA (dirty tree)**: the gate screenshots the **working tree**, not HEAD. Commit first and
  verify `git status --short` is otherwise clean, or an unrelated in-progress edit gets baked into 16
  committed PNGs.
- **GOTCHA (flake, not regression)**: an `approach` shot failing "two consecutive stable screenshots"
  is the live `countUp` rAF racing `retries: 0` — it fails a *different pack* each run (memory:
  `vr-gate-approach-countup-flake`). Re-run before investigating.
- **GOTCHA (macOS)**: never run `npx playwright test` locally outside Docker to judge this. The
  baselines are Linux; a local macOS run failing 16 is platform, not regression (memory:
  `local-agent-visual-gate-notes`).
- **VALIDATE**: the run exits 0 and prints updated snapshots.
- **SATISFIES**: AC #9

### 8. AUDIT which baselines moved — the check that can actually fail

- **IMPLEMENT**: after the regen, run:
  ```bash
  git status --short tooling/visual-regression/baselines/
  ```
  Assert **exactly 16 modified PNGs**, and that they are the eight chrome pages × two packs:
  `404 · approach · build · contact · factory · index · roundtrip · work`. Assert the four
  `proto-verdant-*` / `proto-fieldwork-*` PNGs are **untouched**.
- **GOTCHA**: this is the whole point of the audit. If a proto PNG moved, a *non-footer* change
  leaked in — stop and find it before committing. If fewer than 16 moved, a chrome page did not
  re-render its footer and something is wrong with that page's config load. Neither outcome is
  "close enough". (Memory: `check-that-cannot-fail` — every #137 defect survived a green gate the
  same way, by skipping the thing it tested.)
- **GOTCHA**: eyeball **one** diff before committing 16 binaries — open
  `tooling/visual-regression/test-results/` or diff the old/new `index-neutral.png` heights:
  ```bash
  git stash && node -e "…" ; # or simply: confirm the new PNG is ~34px taller than HEAD's
  ```
  Simplest sufficient check: `git diff --stat tooling/visual-regression/baselines/` shows 16 files,
  and one manual look at the rendered footer via `npx serve .` (Task 9) confirms the item is there
  and reads as a peer of the other five.
- **VALIDATE**: the counts above.
- **SATISFIES**: AC #9

### 9. RUN the gates

- **IMPLEMENT**: run all of them; none is optional.
  ```bash
  node agent-layer/gen-loc-summary.mjs --check     # config edit feeds the `runtime` group
  node tooling/drift-check.mjs                     # the CI verify job's first step
  node tooling/build-checks.mjs                    # /build's pure gate — unaffected, prove it
  node tooling/visual-regression/serve.mjs &
  node tooling/build-journey.mjs all               # chromium + firefox + webkit, incl. new [17] row
  ```
  Then manual: `npx serve .` → **/approach** → footer shows `Build` between Work and Contact → click
  → lands on /build. Repeat the footer glance on /contact and /404 (no route to /build before this).
- **GOTCHA (loc-summary)**: measured margins at plan time — `runtime` needs **+53 lines** to flip its
  rounded 17400, `pages` **+76** to flip 5100, `total` **+41** to flip 24500. This ticket adds ~8
  lines across `client.neutral.config.js` and `build.html`, so no flip is expected. If `--check`
  *does* report drift, regenerate (`node agent-layer/gen-loc-summary.mjs`) and commit it — CI's
  `verify` job is blocking (memory: `loc-summary-counts-tracked-only`). It reads **git-tracked**
  content, so run it after staging/committing, not before.
- **GOTCHA (drift-check)**: requires `tooling/style-dictionary/node_modules` (gen-handoff
  child-process-invokes SD). If missing: `cd tooling/style-dictionary && npm ci`.
- **GOTCHA**: a green local Docker VR run is **not** CI green. After pushing, check `gh pr checks`
  (memory: `vr-gate-approach-countup-flake`).
- **VALIDATE**: every command exits 0; the manual walk works on all three pages.
- **SATISFIES**: AC #9, AC #10

### 10. COMMIT the baselines and OPEN the PR

- **IMPLEMENT**: second atomic commit for the 16 PNGs (`chore(gates): regenerate the 16
  chrome-bearing visual baselines for the footer item (#148)`), then the plan/report/review artifacts
  per CLAUDE.md's Git rule. Open the PR with **`Closes #148` in the BODY** — a title mentioning
  `(#148)` closes nothing (memory: `prs-dont-auto-close-tickets`; confirmed working on PR #145).
  The body should state: one footer item; nav untouched and why; 16 baselines regenerated and why not
  20; the four proto PNGs deliberately unchanged.
- **GOTCHA**: `.claude/plans/build-footer-site-index.md` (this file), the report, and
  `.claude/code-reviews/pr-<N>-review.md` must ride in **this** PR — four of PRs #97–#100's artifacts
  were written and left uncommitted in worktrees.
- **VALIDATE**: `gh pr view --json body -q .body | grep -c "Closes #148"` → 1. After merge:
  `gh issue view 148` → CLOSED.
- **SATISFIES**: AC #8, AC #11

### 11. FILE the follow-up issue — a deployed private instance ships a footer index of 404s

- **IMPLEMENT**: `gh issue create` against epic #38 (the private-instance epic, not #134). Body must
  record the measured facts, not a proposal: `build-instance.mjs:359` copies `system/` wholesale, so
  the deploy dir carries `client.neutral.config.js` + `site.js`; `instance.html:729-730` loads them;
  the dir has no `approach.html` / `work.html` / `contact.html` / `factory.html` / `build.html`, so
  every nav item and every footer Site entry except `/` 404s on a live company instance;
  `validateAssembly` checks `INSTANCE_CONFIG` refs only and would not catch it. State that it is
  **pre-existing** (#148 took it from four dead entries to five, and is what surfaced it) and list
  the three candidate fixes without choosing: strip chrome links during `stampShell`, ship a trimmed
  `client.instance.config.js`, or ship the missing pages.
- **GOTCHA**: do **not** fix it in this PR. It is a different epic, a different surface, and an
  architecture call. Filing it is the deliverable.
- **GOTCHA**: no company has been deployed yet as far as this plan can tell, so this is latent, not
  live damage. Say that in the issue rather than implying a broken production instance exists.
- **VALIDATE**: `gh issue list --state open | grep -i "instance.*footer\|instance.*404"` → the new
  issue. Reference its number in the PR body under a "surfaced, not fixed" line.
- **SATISFIES**: AC #12

---

## TESTING STRATEGY

Per CLAUDE.md: no suite, no linter, no type-check. "Done" = run the surface you touched. There are
three surfaces here and each has a real gate.

### Automated (the repo's own gates)

- **`tooling/build-journey.mjs` block [17]** — the new assertion. Three engines, click-through from
  /approach's footer to /build, asserting the *landing*, not the href. This is the only automated
  proof the link works for a visitor.
- **The visual-regression gate** — proves the footer renders identically under both packs on all
  eight chrome pages, and (after Task 8's audit) proves the change is confined to the footer.
- **`tooling/drift-check.mjs` + `gen-loc-summary --check`** — prove no generated artifact went stale.
- **`tooling/build-checks.mjs`** — unaffected by design; running it proves that claim rather than
  assuming it.

### Manual

- `npx serve .` → /approach, /contact, /404 → the footer's Site column reads
  Home · Approach · Factory · Work · **Build** · Contact, and `Build` reads as a peer (same weight,
  same opacity, same hover) rather than an afterthought.
- Mobile: at ≤800px the footer grid collapses to `1fr 1fr` (`components.css:466-468`). Check the
  six-item column at ~640px and ~375px — no overflow, no orphaned item.
- The appearance dock's saulera pack applied → footer item still legible against
  `--color-bg-inverse` (it inherits `.footer-col a`, so this is a sanity glance, not a new risk).

### Edge Cases

- **JS off** → no footer at all (site.js injects it). Pre-existing site-wide floor; the two static
  links in are the documented JS-off route. Asserted by *omission* from build-journey's JS-off loop,
  with the reason written down (Task 5).
- **The proto pages** → no chrome, so no footer, so no baseline movement. Task 8 asserts this.
- **`instance.html` / `handoff.html` / `agentic-ui-study.html`** → they DO load
  `client.neutral.config.js`, so they gain the footer item too. In-repo that is correct and
  desirable (off-nav deep-link surfaces sharing the neutral chrome), and none is in the VR set, so
  no baseline consequence.
- **A deployed private instance → the new item is a sixth dead link in an already-dead list.**
  `agent-layer/build-instance.mjs:359` copies `system/` **wholesale** (deliberately — "robust to the
  shell's transitive import closure") into a deploy dir outside the repo, so the company build ships
  `client.neutral.config.js` and `site.js`, and `instance.html:729-730` loads both → the full header
  and footer render on the deployed shell. But that dir contains only `index.html` (the stamped
  shell), `system/`, `assets/`, `traces/`, `scenarios/`, `_headers` and optionally
  `proto/compositions/` + `handoff/verdant/`. There is no `approach.html`, `work.html`,
  `contact.html`, `factory.html` — **or `build.html`**. So on a live company instance, every footer
  Site entry except `/` already 404s, as does the whole nav.
  **This is pre-existing and not introduced here** — #148 takes it from four dead entries to five.
  `validateAssembly` (`:216-300`) checks `INSTANCE_CONFIG` refs, not chrome hrefs, so nothing catches
  it. **Deliberately out of scope** (see Open Questions #6): the fix is an architecture call for the
  #43/#44 surface — suppress chrome links during stamping, ship a trimmed instance config, or ship
  the pages — and folding it into a one-item footer ticket would be exactly the scope creep
  CLAUDE.md's surgical-changes rule forbids. **Do file it as a follow-up issue** (see Task 11).
- **Trailing route resolution** → `/build` must resolve under both `npx serve .` and CF Pages. The
  existing extensionless links already prove the pattern; build-journey asserts the landing path is
  exactly `/build`.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax

```bash
node --check system/client.neutral.config.js
node --check tooling/build-journey.mjs
```

### Level 2: Generator drift (the CI `verify` job)

```bash
node agent-layer/gen-loc-summary.mjs --check
node tooling/drift-check.mjs
node tooling/build-checks.mjs
```

### Level 3: Cross-engine journey

```bash
node tooling/visual-regression/serve.mjs &
node tooling/build-journey.mjs all
```

### Level 4: Visual regression

```bash
cd tooling/visual-regression && npm run update:docker
cd - && git status --short tooling/visual-regression/baselines/   # expect exactly 16 modified
```

### Level 5: Manual

```bash
npx serve .
# → /approach  : footer Site column has Build between Work and Contact; click lands on /build
# → /contact   : same
# → /404       : same
# → 375px wide : footer collapses to two columns, six-item Site column intact
```

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — `system/client.neutral.config.js`'s `Site` column contains
      `{ label: "Build", href: "/build" }` between `Work` and `Contact`, and the comment above it no
      longer claims something the item list doesn't deliver.
- [ ] **AC #2** — /build is reachable by clicking, from the footer, on a page that had no route to it
      before (/approach), on chromium, firefox and webkit.
- [ ] **AC #3** — `tooling/build-journey.mjs` block [17] asserts that route, and does **not** assert
      it with JS off; the reason is written in the file.
- [ ] **AC #4** — `build.html`'s head comment no longer says it is off the footer index, still says
      it is off-nav and `noindex`, and cites #148.
- [ ] **AC #5** — `CLAUDE.md:49` says the same, on one line, with the corrected baseline count.
- [ ] **AC #6** — the nav is unchanged: three items + the Contact CTA. `#71`/D6 is not silently
      reversed.
- [ ] **AC #7** — `.claude/plans/build-links-in-and-gates.md` AMENDMENTS records the reversal.
- [ ] **AC #8** — one branch, atomic commits, PR body carries `Closes #148`; plan + report + review
      committed in the same PR.
- [ ] **AC #9** — exactly 16 baselines regenerated (8 chrome pages × 2 packs); the 4 proto PNGs
      unchanged; the gate is green in CI.
- [ ] **AC #10** — `drift-check`, `gen-loc-summary --check` and `build-checks` all exit 0.
- [ ] **AC #11** — issue #148 closes on merge.
- [ ] **AC #12** — the private-instance dead-chrome finding is filed as its own issue against epic
      #38, with its evidence, and is **not** fixed in this PR.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] The 16/4 baseline split verified, not assumed
- [ ] `build-journey all` green on three engines
- [ ] Manual walk done on /approach, /contact, /404 + one mobile width
- [ ] No claim site left saying /build is out of the footer index, and no *live* file still says 20
      baselines
- [ ] The private-instance dead-chrome follow-up issue filed and referenced in the PR body
- [ ] Acceptance criteria all met
- [ ] `gh pr checks` green after push (local Docker green ≠ CI green)

---

## OPEN QUESTIONS / ASSUMPTIONS

**Resolved before writing this plan (owner, 2026-07-28):** footer-only, not nav; label `Build`.

**Assumptions this plan makes:**

1. **The footer's `Site` column is the right home**, not `The system`. That column is
   artifacts/source (`tokens.contract.css`, `components.css`, GitHub) — /build is a page, so it goes
   with the pages. Confident.
2. **Position after `Work`, before `Contact`.** The column reads in visit order and Contact is the
   terminal CTA. Pinned so the implementer doesn't dither; a reviewer may move it one slot without
   invalidating anything.
3. **`noindex` stays.** A footer link to a noindexed page is coherent — the link is for a human
   already on the site, and `_headers` noindexes everything anyway pending the launch revisit. If the
   owner wants /build indexed, that is a separate call tied to the launch-time `_headers` decision.
4. **`docs/epics/ai-first-ux-factory.architecture.md` holds no constraint** that a sixth footer entry
   contradicts. Task-list item under CONTEXT REFERENCES says to verify this before editing; expected
   to hold, because the five-page IA framing is about *nav* and both `contact.html` (historically) and
   `instance.html` establish that pages live off-nav.
5. **The footer grows ~34px and nothing else moves.** Derived from `.footer-col li` box metrics; Task
   8's audit is what actually proves it, and is written to fail if it's wrong.
6. **The private-instance dead-chrome problem is filed, not fixed.** A deployed company instance
   already renders a nav and a footer whose every entry but `/` 404s (Edge Cases, above). This
   ticket adds a sixth dead footer entry to a list of five. Fixing it means deciding how a private
   instance should treat shared chrome — a #43/#44 architecture call with three viable answers — and
   that does not belong in a one-item footer change. Task 11 files it with its evidence.
   **If the owner disagrees and wants it fixed here, the cheapest correct fix is a trimmed
   `client.instance.config.js` stamped in by `build-instance.mjs`**, not a link-stripping regex —
   but that is a new decision, and it would also change what `system/` wholesale-copy means.

**Would change the plan if answered differently:**

- If the owner later wants /build in the nav, that is a *new* decision against #71/D6 and belongs in
  the architecture doc, not in a footer ticket.
- If `docs/epics/ai-first-ux-factory.architecture.md` turns out to pin the footer index to the
  five-page IA, stop and flag rather than proceeding (CLAUDE.md working principle).

---

## NOTES (open canvas)

### Why the ticket's numbers were both wrong, and why that matters

Two counts in #148 don't survive measurement:

| Claim | Measured | Where |
|---|---|---|
| "nav is a five-item set today" | nav is **3** items + the Contact CTA; the *footer's* Site column is the 5-item set | `client.neutral.config.js:26-32` vs `:38-46` |
| "regenerate all 20 baselines" | **16** — the two proto pages load neither `site.js` nor a client config | `grep -n "config\|site.js" proto/*.html` → nothing |

Neither changes the decision, but both change the *work*. The first is why nav was never a real
candidate: it wasn't "a five-item set that could take a sixth", it was a set that was deliberately
cut to three eight tickets ago. The second is why Task 8 exists — if the implementer expects 20 and
gets 16, the natural instinct is to force the other four (memory `vr-update-skips-subperceptual`
even teaches `rm` the PNG to force a rewrite). That instinct would be wrong here and would commit
four pointlessly re-rendered binaries. Better to state the split up front and make the audit assert
it in both directions.

### The JS-off asymmetry, stated rather than hidden

The two existing links in are static markup **on purpose** — `index.html:317-318` says so
explicitly ("it is static markup on purpose — close.mjs is additive only, so an action this central
cannot depend on JavaScript being on"), and `build-journey.mjs:691` asserts the JS-off floor for
both. The footer link cannot meet that floor: the footer *is* JavaScript.

The honest framing is that this is not a new limitation. With JS off, `site.js` never runs, so there
is no header, no nav and no footer on **any** page of this site — every chrome route is already
JS-dependent. The footer link is exactly as available as the nav is. The two static links remain the
site's only JS-off routes to /build, and they are unchanged. Writing that sentence into
`build-journey.mjs` is worth more than the assertion it replaces, because the next person to read
block [17] will otherwise wonder why one of three rows is missing from the second loop.

### Alternatives weighed and rejected

| Option | Verdict |
|---|---|
| Add to nav as a fourth item | Rejected by the owner and by #71/D6. Also: the nav's fourth slot is conceptually the CTA's, and a four-item nav + CTA is where the v3 IA was *before* it was cut. |
| Use the empty fourth footer grid track for a new column | Rejected. `components.css:462` really does have a spare track, but a whole column for one link over-states /build's place in the IA, and it churns the same 16 baselines. |
| Put it in `The system` column | Rejected. That column is artifacts and source links; /build is a page. |
| Ship the config edit and defer the baselines again | Rejected — that is the failure mode #148 exists to end. A red visual gate on main is worse than a 16-PNG diff. |
| Label it "The builder" | Owner chose `Build`. The column is one-word: Home · Approach · Factory · Work · Contact. |

### Sequencing risk

The one ordering that bites: regenerating baselines before every source edit is committed. The gate
screenshots the working tree, so a `build.html` head-comment edit made *after* the regen is
harmless (comments don't render), but a stray CSS or markup edit is not. Task 7's `git status
--short` precondition is the guard, and it is cheap. Run it.

### The finding this ticket surfaced but does not own

Planning this turned up something bigger than the ticket: **a deployed private instance renders a nav
and a footer index in which every entry but `/` is a 404.** `build-instance.mjs:359` copies `system/`
wholesale — correctly, and for a stated reason — which brings `client.neutral.config.js` and
`site.js` along; `instance.html:729-730` loads them; and the deploy dir has none of the five pages
those links point at. `validateAssembly` audits `INSTANCE_CONFIG` refs and never looks at chrome.

It is latent rather than live (no company instance appears to have been deployed yet), it predates
#148 by two epics, and #148 only makes it one entry worse. The right move is to file it with its
evidence and leave it — which is Task 11 — because the fix requires choosing how a private instance
treats shared chrome, and the three candidates (strip during stamping / ship a trimmed instance
config / ship the pages) have different costs on the #43/#44 surface. Fixing it inside a footer
ticket would also quietly break `system/` wholesale-copy, which exists precisely so nobody has to
hand-track the shell's import closure.

Worth saying plainly: this is the honesty contract working as designed. The thing that found it was
asking "which pages actually render this footer?" instead of assuming.

### What this unblocks

Nothing structurally — #149 (the /build analytics pageview) is independent. But it does close the
last "we know this is wrong and shipped it anyway" note attached to /build, which matters for a
portfolio whose thesis is that its own claims are checkable.

## AMENDMENTS

- (none yet — created 2026-07-28)
