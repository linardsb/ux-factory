# Feature: the trace player labels each card Said or Did (#496)

The following plan should be complete, but validate documentation and codebase patterns and task sanity before
you start implementing. Pay special attention to the names of existing classes and helpers — this plan reuses
shipped classes (`.card-kicker`, `.max-prose`, `.muted`) on purpose and adds **no CSS anywhere**.

## Feature Description

A trace has two kinds of step. A `text` step is what the agent **said** (its narration, its reasons). A `tool`
step is what it **did** (a real call with an input, a result and, for a write, an artifact). The trace player
(`system/trace-player.mjs`) draws both as one stream of cards that differ only in layout. After this ticket each
card carries a visible **Said** / **Did** label, the run header carries one sentence saying why Said is weaker
evidence (with the Chen et al. 2025 citation), and each act head's count splits into said and did.

## User Story

As a hiring manager reading a replayed agent run on /roundtrip or a private instance
I want to see which cards are the agent's own account and which are calls it actually made
So that I weigh the narration as a claim and the tool calls as the record, the same split /factory's ledger already makes

## Problem Statement

`textCard()` (`system/trace-player.mjs:72`) and `toolCard()` (`:77`) differ only in a class
(`trace-step--text` / `trace-step--tool`) and layout. Nothing on screen tells the reader that the paragraph
above a `Write` card is the agent's explanation and carries less weight than the call below it. /factory's replay
driver already files each beat as `"narrated"`, `"did"` or `"refused"` (`system/replay-driver.mjs:710`,
verified); the trace player, rendering the same kind of file, does not. That inconsistency is the defect.

## Solution Statement

One edit to `system/trace-player.mjs`:

1. A `KIND_LABEL = { text: 'Said', tool: 'Did' }` table and one `kindLabel(step)` function. The SAME `step.kind`
   decides the card builder, the label and the act tally, so they cannot disagree.
2. Every card gets a first child `<span class="card-kicker trace-kind" id="trace-kind-N">Said|Did</span>`
   (`.card-kicker` is the shipped eyebrow register in `system/portfolio.css:174`, loaded on all four host pages)
   and `aria-labelledby` pointing at it, so the `<article>` has an accessible name a screen reader announces.
   `trace-kind` is a hook class for the journey, not a styled class.
3. The header gets one `<p class="max-prose muted trace-kinds-note">` sentence with the citation, plain text.
4. The act-head count becomes `6 steps · 2 said · 4 did` (a zero-step act keeps `0 steps`).

A new small operator-run driver, `tooling/trace-journey.mjs`, proves the ACs on the running pages
(`/trace.html`, `/roundtrip.html`) across three engines, with expected numbers taken from `parseTrace` over the
trace fetched from the server — never literals.

## Out of Scope / Non-Goals

- **The trace format.** `kind` already carries the split. No recorder, curator or validator change; no file
  under `traces/` is touched (honesty contract, `traces/README.md`).
- **The /factory ledger** (`system/studio-ledger.mjs`). It already distinguishes narrated from did.
- **Visually demoting text cards** (dimmer, smaller). Q1 — label only, per the ticket's recommendation.
- **The header's total `N steps` span** (`:130`). The ticket asks for the act heads only.
- **Any CSS.** No edit to `system/studio.css`, `system/components.css`, or the inline `<style>` copies in
  `trace.html`, `roundtrip.html`, `instance.html`. `.card-kicker`, `.max-prose` and `.muted` already reach all
  four hosts (verified: each page links `system/portfolio.css`, and `components.css:87` sets `p { margin: 0 }`).
  Adding a block to `components.css` would also move `system-graph.json` and `/components` — do not.
- **A citation link.** Plain text, so `system/param-manifest.json` / `param-count.json` do not move.
- **A build-checks group.** The ACs are running-page facts; a Node DOM-stub group would duplicate the journey
  and grep-shaped checks of this module are the "check that cannot fail" class.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Low
**Primary Systems Affected**: `system/trace-player.mjs` (all four mounts: `/trace.html`, `/roundtrip.html`,
`/instance.html` via `system/instance.mjs:349`, `/factory`'s Traces panel via `system/studio.mjs:223`); a new
`tooling/trace-journey.mjs`; `.claude/references/gates.md`; the CLAUDE.md architecture map.
**Dependencies**: none new. Playwright resolved out of `tooling/visual-regression/node_modules` as every driver does.

## Related Work

**Implements**: #496 (`Closes #496`). **Epic**: none — loose ticket (the issue's "Which epic": no epic owns the trace player).

**Back-references**:
- `system/replay-driver.mjs:710` — the narrated/did/refused split this mirrors.
- `tooling/catalog-journey.mjs` — the driver skeleton mirrored (stale-serve guard, `t()`, engine loop, last line).

**Forward-references**: (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ BEFORE IMPLEMENTING

- `system/trace-player.mjs` (whole file, 250 lines) — the only runtime file changed. Header `:1-22` is the
  specification; `:49-55` the `el()` helper (textContent only); `:72-95` the two card builders; `:118-131` the
  header strip; `:150-163` the act skeleton and its count; `:166-171` the card loop; `:216` `revealAll`.
- `system/portfolio.css:174-181` — `.card-kicker` (12px, uppercase, muted, `margin-bottom: var(--spacing-sm)`).
- `system/annotated-source.mjs:52-54` — the precedent for a view-time module emitting the shipped `.card-kicker`.
- `trace.html:114-142` — the harness: mounts on `#player`, `?trace=<slug>`, default `demo-notice`; sets NO ready flag.
- `roundtrip.html:169` + `system/derivation-roundtrip.mjs:355-361` — mounts `/traces/pack-seed-verdant.jsonl`
  on `#roundtrip-player` and sets `data-trace="ready"` on success.
- `tooling/catalog-journey.mjs:1-80, 600-641` — the skeleton to mirror.
- `tooling/visual-regression/visual.spec.mjs:95` — the `roundtrip` VR entry (waits on `#roundtrip-player[data-trace="ready"]`).
- `.claude/references/gates.md:102-150` — the journey-driver section the new entry joins (after `catalog-journey.mjs`).

### New Files to Create

- `tooling/trace-journey.mjs` — the trace player's running-page driver, ×3 engines.
- `.claude/plans/trace-player-said-did-496.html` — the build brief (this plan's companion).

### Relevant Documentation

- Chen, Benton, Radhakrishnan, et al., "Reasoning Models Don't Always Say What They Think", Anthropic, 2025,
  [arXiv:2505.05410](https://arxiv.org/abs/2505.05410), §3 "CoTs of reasoning models often lack faithfulness…":
  "The overall faithfulness scores for both reasoning models remain low (25% for Claude 3.7 Sonnet and 39% for
  DeepSeek R1)" (verified 2026-10-04 against the arXiv HTML). The abstract's own figure is "often below 20%" —
  do NOT mix the two; the sentence below uses the §3 figures and names both models.
- [WAI-ARIA `aria-labelledby`](https://www.w3.org/TR/wai-aria-1.2/#aria-labelledby) and
  [accname §4.3.2 step 2B](https://www.w3.org/TR/accname-1.2/#computation-steps) — a referenced node contributes
  its text **even when it is hidden**, which is why the journey needs a separate `aria-hidden` check (Task 3 [6b]).
- WCAG 2.2 SC 1.4.1 (use of colour) — the label is text, not colour. SC 2.5.3 (label in name) — the accessible
  name IS the visible label text.

### Patterns to Follow

**All trace-derived and new strings via `textContent`** — `el(tag, className, text)` (`trace-player.mjs:50-55`).
Never `innerHTML`. The new strings are module constants, but they still go through `el()`.

**Unique ids per page.** The header (`:106-107`) says two players can share a page. A module-level counter
(`let kindSeq = 0;` → `trace-kind-${++kindSeq}`) is unique across players on one page and across re-renders.

**Driver shape** (`catalog-journey.mjs`): `t(label, cond, detail)` → `✓`/`✗` lines; per-engine
`── <engine>: N passed, M failed`; last line `trace-journey ✓ …` or `trace-journey ✗ N failed assertion(s)`;
`process.exit(failed ? 1 : 0)`. Stale-serve guard: refuse unless `${BASE}/system/trace-player.mjs` byte-matches
the working tree's file.

---

## IMPLEMENTATION PLAN

### Phase 1: Branch
From `origin/main` (the session's working tree is on `fix/importer-reads-icon-name-449` and dirty).

### Phase 2: The player (`system/trace-player.mjs`)
Label, aria name, header sentence, act split, header comment.

### Phase 3: The driver (`tooling/trace-journey.mjs`)
**Depends on:** Phase 2 (asserts its output). **Independent of:** Phase 4.

### Phase 4: Gate prose
gates.md entry + CLAUDE.md map line. **Independent of:** Phase 3's run (can be written in parallel).

### Phase 5: Cascade + gates
loc-summary after staging, VR baselines from a clean worktree of the branch tip, CI gates.

---

## STEP-BY-STEP TASKS

### Task 1 — CREATE the branch

- **IMPLEMENT**: `git fetch origin && git switch -c feat/trace-said-did-496 origin/main`. If `origin/main` is no
  longer c35c39a, run `git log --oneline c35c39a..origin/main -- system/trace-player.mjs system/portfolio.css roundtrip.html trace.html`
  — empty means every probe result in NOTES still holds. If the dirty tree
  blocks the switch, use a worktree instead: `git worktree add /Users/Berzins/wt-496 -b feat/trace-said-did-496 origin/main`
  (under `/Users`, not `/private/tmp` — Docker sharing for the VR step).
- **GOTCHA**: shared working dir with parallel sessions (memory `shared-worktree-parallel-sessions`): verify the
  branch right before every commit; stage by explicit path, never `git add -A` (the tree carries ~40 untracked
  review/plan files that are not this ticket's).
- **GOTCHA**: a fresh worktree needs `npm ci` in `tooling/icons` (build-checks group `icons` is RED without it —
  observed) and `tooling/style-dictionary` (drift-check throws without it — observed), plus
  `tooling/visual-regression` for the drivers and VR. One line does all three:
  `for d in tooling/icons tooling/style-dictionary tooling/visual-regression; do (cd $d && npm ci); done`.
- **IMPLEMENT (worktree route only)**: copy this plan and its brief across — `cp .claude/plans/trace-player-said-did-496.{md,html,patch} /Users/Berzins/wt-496/.claude/plans/` — they are untracked in the primary tree and must ship in this PR (staged by path in Task 6). On the `git switch` route they carry over on their own.
- **VALIDATE**: `git branch --show-current` → `feat/trace-said-did-496`.
- **SATISFIES**: process (PR carries plan, report, review; `Closes #496`).
- **REGENERATES**: none.

### Task 2 — UPDATE `system/trace-player.mjs`

- **FAST PATH (preferred)**: `git apply .claude/plans/trace-player-said-did-496.patch` — the exact diff below
  (items 1–6), already probed on `origin/main` c35c39a: three engines, VR, build-checks, drift-check, token-lint
  (see NOTES § De-risk probe). `git apply --check` against a fresh `origin/main` worktree: clean (observed). If
  `origin/main` has moved and the patch no longer applies, apply items 1–6 by hand; the snippets are identical.
- **IMPLEMENT** (in file order; what the patch does):
  1. **Header** (`:1-22`): add one paragraph after the honesty paragraph (`:8-12`) stating the invariant:
     every card carries a Said (`kind: "text"`) or Did (`kind: "tool"`) label as its first child and its
     accessible name; the card builder, the label and the act tally all key off the same `step.kind`, so they
     cannot disagree; the label is text, not colour (WCAG 1.4.1); why — the agent's account is a claim, its calls
     are the record (Chen et al. 2025, arXiv:2505.05410); mirrors `replay-driver.mjs`'s narrated/did ledger.
     Also: a kind outside the table renders its raw `kind` string as the label (never Said or Did — the module
     must not claim a split the trace did not record). Keep the existing comment density.
  2. Below `ACTS` (`:24`):
     ```js
     // Said / Did (#496): the agent's own account vs a call it actually made. One table, read by the card
     // label AND the act tally, so the two cannot disagree. A kind outside it labels itself verbatim.
     const KIND_LABEL = { text: 'Said', tool: 'Did' };
     const kindLabel = (step) => KIND_LABEL[step.kind] || String(step.kind);
     const KINDS_NOTE = 'Said cards are the agent’s own account of what it was doing and Did cards are calls it actually made, so read Said as a claim: Claude 3.7 Sonnet and DeepSeek R1 mentioned the hint that changed their answer only 25% and 39% of the time (Chen et al., Anthropic, 2025, “Reasoning models don’t always say what they think”, arXiv:2505.05410).';
     let kindSeq = 0; // page-unique label ids — two players can share a page (see header)
     ```
     (Copy is "expected" — Q2 lets the owner reword it; the numbers and attribution are fixed by the source.)
  3. A helper beside the DOM helpers (after `relativize`, `:70`):
     ```js
     // The kind label is the card's first child and its accessible name (aria-labelledby), so a screen reader
     // announces "Said" / "Did" on entering the card. .card-kicker is the shipped eyebrow register.
     function labelCard(card, step) {
       const kind = el('span', 'card-kicker trace-kind', kindLabel(step));
       kind.id = `trace-kind-${++kindSeq}`;
       card.setAttribute('aria-labelledby', kind.id);
       card.prepend(kind);
       return card;
     }
     ```
  4. Card loop (`:167`): `const card = labelCard(step.kind === 'text' ? textCard(step) : toolCard(step, meta.cwd), step);`
     — `textCard`/`toolCard` themselves stay unchanged.
  5. Header (`:131`, after `header.append(line);`): `header.append(el('p', 'max-prose muted trace-kinds-note', KINDS_NOTE));`
     — before `controls` so the reading order is task → label line → note → controls.
  6. Act count (`:153-157`): replace the count line with a tally keyed by label. Seeding the Map with `said`
     then `did` fixes their order (a Map keeps insertion order); any other label follows in first-seen order;
     zero entries are dropped. The line always reads `N steps · S said · D did`, an act with no text steps reads
     `N steps · N did`, and an empty act stays `0 steps`:
     ```js
     const inAct = ordered.filter((s) => s.phase === key);
     const count = inAct.length;
     const tally = new Map([['said', 0], ['did', 0]]);
     for (const s of inAct) { const k = kindLabel(s).toLowerCase(); tally.set(k, (tally.get(k) || 0) + 1); }
     const split = [...tally].filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(' · ');
     // ...
     el('span', 'trace-act-count muted', `${count} step${count === 1 ? '' : 's'}${split ? ` · ${split}` : ''}`)
     ```
- **PATTERN**: `annotated-source.mjs:54` (`.card-kicker` from a view-time module); `el()` `:50-55`.
- **IMPORTS**: none (header contract: "No imports, no fetch", `:14`).
- **GOTCHA**: `.card-kicker` is `text-transform: uppercase`, so the reader SEES "SAID". The DOM text and the
  accessible name are "Said". Assertions match case-insensitively (`/^said$/i`); observed matching on chromium,
  firefox and webkit.
- **GOTCHA**: do NOT render the label via `::before` (as `.trace-artifact::before` does): pseudo-content is not
  `textContent` and is announced inconsistently.
- **GOTCHA**: `studio.mjs:229-230` sets `data-inspect="cards"` on every `.trace-step` after render — unaffected;
  do not add `data-inspect` to the label (an id absent from `system/inspect-data.json` aborts inspect page-wide).
- **GOTCHA**: hidden cards are `display: none` (`.trace-step-hidden`), so they are out of the accessibility tree.
- **VALIDATE**: `node --check system/trace-player.mjs && node -e 'import("./system/trace-player.mjs").then(m=>console.log(typeof m.parseTrace, typeof m.renderTracePlayer))'`
  → `function function` (observed before AND after the patch; `parseTrace` is pure and must still import under Node with no DOM).
- **SATISFIES**: AC #1, #2, #3, #4 (source half; proven in Task 3).
- **REGENERATES**: `system/loc-summary.json` (runtime group) — Task 5.

### Task 3 — CREATE `tooling/trace-journey.mjs`

- **IMPLEMENT**: mirror `catalog-journey.mjs`'s skeleton (header, Playwright resolve, `BASE`, `ENGINES`,
  `requested`/`toRun`, stale-serve guard on `system/trace-player.mjs`, `t()`, `newPage()` with pageerror +
  console-error capture, engine loop, `finally` close, last line). Header states what it owns and what it CANNOT
  reach: it does not drive `/instance.html` (a built deploy dir — `instance-journey.mjs`'s ground) or `/factory`'s
  Traces panel (studio-journey's `factoryPass` asserts only that steps render); it reads the accessibility tree
  through Playwright's role/name query, not a real screen reader.

  Import `parseTrace` from `../system/trace-player.mjs` (pure, Node-safe). For each case, fetch the trace
  THROUGH `BASE` and parse it, so expected numbers come from the artifact the page itself reads:

  | case | url | ready | trace |
  |---|---|---|---|
  | harness | `/trace.html` | `#player .trace-controls` | `/traces/demo-notice.jsonl` |
  | roundtrip | `/roundtrip.html` | `#roundtrip-player[data-trace="ready"]` | `/traces/pack-seed-verdant.jsonl` |

  Context: `viewport 1440×1000`, a fresh context per engine (so `pack-boot.js` restores nothing → neutral pack).

  Assertions per case (`M` = the player mount selector, `steps` = `parseTrace(text).steps` sorted by `seq`,
  `expected[i]` = `steps[i].kind === 'text' ? 'said' : steps[i].kind === 'tool' ? 'did' : steps[i].kind`):
  - **[0] positive control**: the parsed trace holds ≥1 `text` AND ≥1 `tool` step — otherwise every Said/Did
    count below is vacuous. (Observed: demo-notice 8 text / 15 tool; pack-seed-verdant 6 / 8.)
  - **[1] neutral pack**: `document.querySelector('link[href*="tokens.neutral.css"]')` exists and no
    `tokens.saulera`/`tokens.verdant` link is present.
  - **[2] header note**: `${M} .trace-kinds-note` is visible; its `textContent` contains `Said`, `Did`,
    `Chen et al.`, `2505.05410`, `25%` and `39%`.
  - **[3] at rest, the first card is labelled**: the one non-hidden `.trace-step`'s `.trace-kind` text,
    lower-cased, equals `expected[0]`.
  - **[4] Show all**: click `getByRole('button', { name: 'Show all' })` inside `M`; then the rendered
    `.trace-step` count equals `steps.length`, and the DOM-order sequence of each card's FIRST-CHILD
    `.trace-kind` text (lower-cased) joined by `,` equals `expected.join(',')`. Reading the first child (not
    `querySelector`) is what catches a label placed elsewhere in the card.
  - **[5] role/name**: `page.locator(M).getByRole('article', { name: /^said$/i }).count()` equals the text-step
    count, and `{ name: /^did$/i }` equals the tool-step count (after Show all).
  - **[6b] the label is not hidden from AT**: for every `.trace-kind`, `el.closest('[aria-hidden="true"]') === null`
    and `getComputedStyle(el).display !== 'none'` and `visibility !== 'hidden'`. (Needed because accname counts
    an `aria-labelledby` target's text even when it is hidden — [5] alone would stay green.)
  - **[7] act counts**: for each `.trace-act` (four), parse `.trace-act-count` with
    `/^(\d+) steps?(?: · (\d+) said)?(?: · (\d+) did)?$/`; assert said + did === total; total === the act body's
    `.trace-step` count; said === the body's Said-label count; did === the body's Did-label count; total ===
    `steps.filter(s => s.phase === key).length`.
  - **[8]** no page errors and no console errors across the run (catalog-journey's final block). NO noise
    filter: the probe observed zero page and console errors on both pages × three engines (neither page fetches
    the mock Worker). A filter here would only hide a real regression.
- **PATTERN**: `tooling/catalog-journey.mjs:28-80` (preamble + guard), `:600-641` (tail).
- **IMPORTS**: `node:fs` `readFileSync`, `node:module` `createRequire`, `node:path`, `node:url` `fileURLToPath`,
  `../system/trace-player.mjs` `parseTrace`.
- **GOTCHA**: `trace.html` sets no ready flag; wait on `#player .trace-controls` (vt-verify's precedent,
  `tooling/vt-verify.mjs:136-137`), then on `#player .trace-step`.
- **GOTCHA**: stale serve (memory `stale-serve-wrong-tree`): a sibling session's `serve.mjs` can hold 4757 serving
  ITS tree. The byte-match guard is the defence; on refusal start your own with `PORT=4791 node tooling/visual-regression/serve.mjs &`
  and `BASE=http://127.0.0.1:4791`. Kill only your own `$!` (memory `portal-smoke-port-scoped-kill`).
- **GOTCHA**: read the driver's OWN last line for the verdict, never a pipe's exit status (`| tail` reports
  `tail`'s status — gates.md "Reading a red leg").
- **VALIDATE**: `node --check tooling/trace-journey.mjs`; then
  `PORT=4791 node tooling/visual-regression/serve.mjs & SRV=$!; BASE=http://127.0.0.1:4791 node tooling/trace-journey.mjs all; kill $SRV`
  → last line `trace-journey ✓  all assertions passed on chromium, firefox, webkit` (expected for the driver;
  every assertion's underlying value was observed by the probe — the table in NOTES § De-risk probe is the
  expected output, per engine, so a mismatch is a driver bug, not a player bug).
- **REDDENS** (run each on chromium against the working copy, observe the named assertion go red, revert with
  `git checkout -- system/trace-player.mjs`; record all five in the report):
  - M1 swap the table: `{ text: 'Did', tool: 'Said' }` → [3], [4], [5], [7] red (`expected … got …`).
  - M2 label text cards only (`labelCard` only in the text branch) → [4] red (sequence mismatch) and [5] Did count 0.
  - M3 `kind.setAttribute('aria-hidden', 'true')` in `labelCard` → [6b] red while [5] stays GREEN — that
    green is the point of [6b]; record it. (Observed in the probe: with `aria-hidden` on every label, the
    role/name count stayed 8/8 on trace.html and 6/6 on roundtrip.html on all three engines.)
  - M4 tally off by one (`tally.set(k, (tally.get(k) || 0) + 2)`) → [7] red (said + did ≠ total).
  - M5 drop the `header.append(… KINDS_NOTE)` line → [2] red.
- **SATISFIES**: AC #1 (count against `parseTrace` on the running page), #2, #3, #4.
- **REGENERATES**: none (`tooling/` matches no loc-summary group — `gen-loc-summary.mjs:23-27`).

### Task 4 — UPDATE `.claude/references/gates.md` and `CLAUDE.md`

- **IMPLEMENT**:
  - `gates.md`, journey-driver section, after the `catalog-journey.mjs` paragraph: one paragraph
    `**`trace-journey.mjs`** — the trace player on /trace.html and /roundtrip.html ×3 engines (#496): …` naming
    [0]–[8] in one sentence each and the CANNOT-REACH sentence copied from the driver header (instance and
    /factory mounts; no real screen reader).
  - `CLAUDE.md` tooling map, after the `catalog-journey.mjs` line, the same column format:
    `  trace-journey.mjs           the trace player ×3 engines (Said/Did)  (→ references/gates.md)`.
- **GOTCHA**: gate prose has three copies (memory `gate-prose-has-three-copies`): the driver header, gates.md and
  the CLAUDE.md map line. Write the CANNOT-REACH sentence once in the driver header and copy it verbatim into
  gates.md.
- **VALIDATE**: `grep -n "trace-journey" CLAUDE.md .claude/references/gates.md tooling/trace-journey.mjs` → ≥1 hit in each.
- **SATISFIES**: process (gate stack stays readable).
- **REGENERATES**: none.

### Task 5 — REGENERATE the cascade and run the gates

- **IMPLEMENT**, in order:
  1. Stage the edited/created files by path: `git add system/trace-player.mjs tooling/trace-journey.mjs .claude/references/gates.md CLAUDE.md`.
  2. `node agent-layer/gen-loc-summary.mjs` **after staging** (it reads tracked content — memory
     `loc-summary-counts-tracked-only`), then `git add system/loc-summary.json`.
  3. `git diff --cached system/loc-summary.json`: expected EMPTY. Observed: with the full patch staged on
     c35c39a the runtime group counts 33,217 lines by the generator's own `split("\n")` rule — still 33200, flip
     at 33,250 — and `gen-loc-summary` wrote no change; the probe's VR run had all three `approach` shots GREEN.
     Only if `origin/main` has grown the runtime group by ≥33 lines since c35c39a can it flip; then the diff is
     non-empty, and you `rm tooling/visual-regression/baselines/approach-*.png` before step 5 (memory
     `loc-summary-baseline-cascade`: `update:docker` silently keeps a stale digit). The diff decides; nothing else.
  4. Commit (Task 6's message), so the worktree for step 5 can check out the branch tip clean.
  5. VR from a clean detached worktree of the BRANCH TIP (not `origin/main`), under `/Users`:
     `git worktree add --detach /Users/Berzins/wt-496-vr feat/trace-said-did-496 && cd /Users/Berzins/wt-496-vr/tooling/visual-regression && npm ci && npm run update:docker`.
     Copy the regenerated `baselines/roundtrip-{neutral,saulera,verdant}.png` (and approach-* only if step 3
     flipped) back, `git add` them by path, amend or add a commit. Remove the VR worktree.
  6. Eyeball `roundtrip-neutral.png` against the probe's render: the note (four lines of muted text) between
     the label line and the controls; a SAID eyebrow above the first card; the Plan head reading
     `6 steps · 2 said · 4 did`. Expected heights (observed in the probe's compare run, 1280px wide):
     neutral 6773 → 6908, saulera 7086 → 7265, verdant 6762 → 6896.
- **GOTCHA**: `factory-*` baselines must NOT change — the Traces panel mounts on activation and is empty at rest
  (`visual.spec.mjs:35-41`). Observed: the probe's compare run had `factory` GREEN on all three packs. If
  `update:docker` rewrites a factory PNG, stop: something now renders at rest.
- **GOTCHA**: `trace.html` and `instance.html` are not VR-gated (`visual.spec.mjs` PAGES list) — no baseline.
- **GOTCHA**: VR tolerance (`maxDiffPixels:100`) can swallow small text changes (memory
  `vr-tolerance-hides-text-changes`); the new labels add whole lines, so expect real churn on all three roundtrip
  PNGs. If one does not regenerate, `rm` it and re-run (memory `vr-update-skips-subperceptual`).
- **GOTCHA**: the approach countUp flake (memory `vr-gate-approach-countup-flake`) can red an approach shot on
  one pack; that is not this change. Check `gh pr checks` after push, comparing `headRefOid` to local HEAD first
  (memory `pr-head-lag-stale-checks`).
- **VALIDATE**:
  - `node tooling/build-checks.mjs` → `build ✓  all 51 groups pass` (observed WITH the patch applied).
  - `node tooling/drift-check.mjs` → `drift-check     ✓  syntax · token-css · … · group-count` (observed with the patch).
  - `node tooling/token-lint.mjs` → `token-lint      ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed with the patch).
  - Task 3's driver run, all three engines.
  - Optional, cheap: `node tooling/vt-verify.mjs` (its `/trace.html` "step forward" case still opens a morph).
- **SATISFIES**: AC #5 (gates + baselines in the same PR).
- **REGENERATES**: `system/loc-summary.json` (`node agent-layer/gen-loc-summary.mjs`, after staging);
  `tooling/visual-regression/baselines/roundtrip-{neutral,saulera,verdant}.png` (`npm run update:docker`);
  `approach-*.png` only if the runtime `linesApprox` flips. Not moved: `system-graph.json`, the handoff pack,
  `param-count.json`, `annotated-source.json`, `inspect-data.json`, `icons.mjs`.

### Task 6 — COMMIT, report, PR

- **IMPLEMENT**: stage `.claude/plans/trace-player-said-did-496.{md,html,patch}` by path with the code; one atomic commit `feat(trace): the trace player labels each card Said or Did (#496)` with the
  attribution trailer; report at `.claude/reports/trace-player-said-did-496.md` recording the five REDDENS
  mutations with observed output; PR body with `Closes #496`, plan + brief + report + review in the PR.
- **VALIDATE**: `gh pr view --json body -q .body | grep -c "Closes #496"` → `1`.
- **SATISFIES**: process.
- **REGENERATES**: none.

---

## TESTING STRATEGY

No unit suite exists or is invented (CLAUDE.md §Testing). Proof is:
- **CI**: build-checks, drift-check (loc-summary), token-lint, the pixel gate (roundtrip ×3 packs).
- **Operator-run**: `tooling/trace-journey.mjs all` — the AC-bearing checks on the running page.

### Edge cases

- An act with zero steps → `0 steps`, no split (none in committed traces; the regex in [7] accepts it).
- An act with only tool steps → `N steps · N did` (the said group is optional in the regex).
- A kind outside `{text, tool}` → labelled verbatim, counted under its own name; never Said/Did. Not present in
  any committed trace (observed: all 15 curated traces carry only `text` and `tool`) and `validate-trace.mjs`
  does NOT pin `kind`, which is why the fallback exists rather than a silent "Did".
- Two players on one page → ids unique through `kindSeq`.
- Reduced motion → no change (the label is static; Play is the only motion-gated control).

### Proving the checks

Every assertion in Task 3 carries a REDDENS mutation (M1–M5), and [0] is the positive control: a trace with
only one kind would make the Said/Did counts vacuous. M3 is the instructive one — it proves [5] alone cannot see
a hidden label.

---

## VALIDATION COMMANDS

### Level 1: Syntax
- `node --check system/trace-player.mjs && node --check tooling/trace-journey.mjs`

### Level 2: CI gates
- `node tooling/build-checks.mjs` → `build ✓  all 51 groups pass`
- `node tooling/drift-check.mjs` → `drift-check     ✓ …`
- `node tooling/token-lint.mjs` → `token-lint      ✓ …`

### Level 3: Running page
- `PORT=4791 node tooling/visual-regression/serve.mjs & SRV=$!; BASE=http://127.0.0.1:4791 node tooling/trace-journey.mjs all; kill $SRV`

### Level 4: Manual
- Open `http://127.0.0.1:4791/roundtrip.html` and `/trace.html`: SAID/DID eyebrow on each card, the note under
  the label line, act heads split. Tab into the player and step with → ; with VoiceOver (⌘F5) on a card, the
  announcement starts with "Said" or "Did".

### Level 5: Pixel gate
- `npm run update:docker` from the clean branch-tip worktree (Task 5.5); CI `visual` green after push.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Q2 — owner rewords the header sentence | owner's hand | no (the expected copy ships; a reword is a one-line follow-up) | comment on #496 |
| VoiceOver listen-through (Level 4) | owner's hand, ~2 min | no — [5]/[6b] cover the accessibility tree | report's Not run |

No paid agent run: nothing here records a trace or calls the SDK.

---

## ACCEPTANCE CRITERIA

- [ ] Every rendered card on `/roundtrip.html` and `/trace.html` shows Said or Did matching its `kind`, counted
      against `parseTrace(...).steps` on the running page (trace-journey [3], [4]).
- [ ] The header sentence and citation render under the neutral pack ([1], [2]).
- [ ] Act-head counts sum to the act's step count ([7]).
- [ ] Labels are announced as part of the card — role/name check in the journey ([5], [6b]).
- [ ] All new strings written with `textContent` (via `el()`; no `innerHTML` added — `grep -n innerHTML system/trace-player.mjs` → no hits).
- [ ] `node tooling/build-checks.mjs` green; roundtrip baselines (×3 packs) regenerated in the same PR; approach
      baselines regenerated iff the runtime `linesApprox` flipped.

## COMPLETION CHECKLIST

- [ ] Tasks 1–6 in order, each VALIDATE run
- [ ] M1–M5 each observed red, then reverted; positive control [0] observed
- [ ] build-checks · drift-check · token-lint green; trace-journey ✓ on all three engines
- [ ] Baselines committed; factory baselines untouched
- [ ] PR body has `Closes #496`; plan, brief, report, review in the PR

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 (owner, non-blocking)** Label only, or label plus visually demoting Said cards? Plan: label only, as the
  ticket recommends — the label states the fact; a demotion would be the site's judgement on top of it.
- **Q2 (owner, non-blocking)** The header sentence's wording is drafted here (Task 2.2). Its numbers and
  attribution are fixed by the paper's §3; the phrasing is the owner's to change.
- **Why Q1/Q2 cannot lower one-pass success:** no AC depends on either answer. The ship-as-is defaults are
  label-only and the drafted sentence, both already rendered and gated in the probe. A different answer is a
  follow-up edit, not a re-plan: Q1 would add a style rule, and Q2 would replace one string constant (the
  journey's [2] checks only `Said`, `Did`, `Chen et al.`, `2505.05410`, `25%` and `39%`, so a reword that keeps
  those six tokens stays green).
- **A1** Plain-text citation, no link — keeps `param-count` and external-link review out of scope. A link is a
  one-line follow-up if wanted.
- **A2** The four mounts all get the change (it is in the module). /factory's Traces panel and `/instance.html`
  are not driven by the new journey; studio-journey's `factoryPass` (`:1790-1798`) still passes (it counts
  `.trace-step` > 0 and reads `.trace-player` display), and instance-journey asserts only the chrome's trace link.
- **A3** The issue lists three mount sites; there are four (the studio's Traces panel, `studio.mjs:223`). No
  scope change follows, because no CSS is added.

## NOTES (open canvas)

**Why no CSS at all.** The trace classes are hand-copied in four places (`trace.html`, `roundtrip.html`,
`instance.html` inline `<style>`, `system/studio.css`). A new `.trace-kind` style would need four identical
edits and nothing checks they agree. `.card-kicker` (portfolio.css, linked by all four pages) is the shipped
eyebrow and already has a view-time-module precedent (`annotated-source.mjs:54`). `.trace-kind` and
`.trace-kinds-note` are hook classes only.

**Why `aria-labelledby` and not `aria-label`.** Both give the `<article>` a name. `aria-labelledby` makes the
visible label the single source of the name (SC 2.5.3), so a later copy change cannot split them. Cost: an id per
card, handled by `kindSeq`.

**Why a new driver rather than a studio-journey pass.** studio-journey is 7,452 lines and its run replays
/factory for minutes; neither AC page is a studio page. catalog-journey (641 lines) is the right-sized model.

**Rejected: a build-checks group over a DOM stub.** It would prove the module builds labels, not that a page
shows them; the ACs ask for the running page.

**Pre-flight (2026-10-04), what ran and what it changed:**
- Read `system/trace-player.mjs` on `origin/main` in full: citations `:72`, `:77`, `:157` match the issue;
  `:130` is the header total (left alone).
- `replay-driver.mjs:710` verified (`ledger?.note(... "narrated" : "did" ...)`); `instance.mjs:349`,
  `derivation-roundtrip.mjs:360`, `studio.mjs:223` verified as mounts. The issue's list missed the studio → A3.
- `git grep` of the trace-* CSS: four host copies found → drove the "no CSS, reuse `.card-kicker`" decision.
- `validate-trace.mjs` read: it pins `phase`, not `kind` → drove the verbatim-kind fallback.
- Kinds in committed traces counted: only `text`/`tool` across all 30 files.
- `parseTrace` run under Node: demo-notice 23 steps (plan 3/9, gate 1/1, implement 1/1, validate 3/4 said/did);
  pack-seed-verdant 14 (plan 2/4, gate 1/1, implement 1/2, validate 2/1). Every act has both kinds → the
  positive control [0] holds for both cases.
- Clean worktree of `origin/main`: build-checks RED on `icons` until `npm ci` in `tooling/icons`, then
  `all 51 groups pass`; drift-check threw until `npm ci` in `tooling/style-dictionary`, then ✓; token-lint ✓.
  → Task 1 GOTCHA.
- Journeys: none drives `/trace.html` or `/roundtrip.html` (only `vt-verify.mjs:136` touches trace.html) → Task 3.
- VR: `roundtrip-{neutral,saulera,verdant}.png` are the baselines that render the player at rest; `factory-*`
  does not (lazy panel). Runtime group at ~33187 lines by the generator → no approach flip expected (derived).
- `param-manifest.json:68,123` already counts the player's buttons; no new control → no param-count move.
- Paper verified on arXiv: §3 gives 25% / 39%; the abstract says "often below 20%". The sentence uses §3.

### De-risk probe (2026-10-04, throwaway worktree of `origin/main` c35c39a, nothing committed)

The patch (`.claude/plans/trace-player-said-did-496.patch`, 85 lines, +33/−3 in `system/trace-player.mjs`) was
applied and every risk was run rather than reasoned about:

| Risk | What ran | Observed |
|---|---|---|
| R1 VR churn scope | `npx playwright test --grep "factory\|roundtrip\|approach"` in the pinned Docker image, compare mode | roundtrip ✘ ×3 (heights +135 / +179 / +134 px); factory ✓ ×3; approach ✓ ×3 |
| R2 approach flip | staged, `gen-loc-summary`, `git diff` | no diff; runtime 33,217 lines (flip at 33,250) |
| R3 a11y + labels | Playwright probe ×3 engines on both pages | table below; zero page/console errors |
| R4 fresh-tree gates | `npm ci` ×3, then the three CI gates on the patched tree | build-checks 51/51 ✓, drift-check ✓, token-lint ✓ |

R3 detail. These are the values the journey asserts. Every cell was identical on chromium, firefox and webkit.

| page | first card at rest | Said by role/name | Did by role/name | label sequence = parseTrace | act heads (steps·said·did) | ids unique | Said with aria-hidden (M3) |
|---|---|---|---|---|---|---|---|
| /trace.html (demo-notice) | Said | 8 = 8 | 15 = 15 | ✓ | 12·3·9 · 2·1·1 · 2·1·1 · 7·3·4 | ✓ | 8 (still green → [6b] needed) |
| /roundtrip.html (pack-seed-verdant) | Said | 6 = 6 | 8 = 8 | ✓ | 6·2·4 · 2·1·1 · 3·1·2 · 3·2·1 | ✓ | 6 (still green → [6b] needed) |

The probe also showed what a reader sees at 1280 px. The note runs four muted lines under the label line. The
SAID eyebrow sits above the card text. The Plan head reads `6 steps · 2 said · 4 did`, right-aligned.

**Confidence: 10/10.** This is the ceiling of the scale. Every runtime claim in this plan is now observed, not
inferred. What remains is writing the driver from a fully specified table of expected values, plus the VR
regeneration. The only residual variable is `origin/main` moving before implementation, and Task 1's
`git log` line detects that.

## AMENDMENTS

- 2026-10-04 — de-risk pass: probed R1–R4 in a throwaway worktree (NOTES § De-risk probe); added the
  observed patch as Task 2's fast path; turned every "expected" runtime value into an observed one; removed the
  speculative Worker noise filter from [8] (zero errors observed); approach regeneration is now decided by the
  `loc-summary` diff alone (observed empty); recorded why Q1/Q2 cannot block.

