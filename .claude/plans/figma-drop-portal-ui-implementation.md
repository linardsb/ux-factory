# Feature: drop a Figma export in the portal, get a token pack (no CLI)

The following plan should be complete, but it's important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

**Governing design note: `.claude/plans/figma-drop-portal-ui.md`** (owner's ask, the measured
constraints, and decisions D1–D3). **Prior state that must NOT be re-litigated:
`.claude/plans/figma-any-design-handover.md` §A** — read it before starting. This plan is the
implementation-level expansion of that note; where the two differ, the divergence is recorded in
§AMENDMENTS-adjacent notes below (see **Divergences from the design note**).

## Feature Description

The portal gains a third header button — **"Figma → pack"** — that opens a drawer with a drop zone.
The operator drops a Figma plugin export (`.json`), types a slug, and the portal writes
`system/tokens.<slug>.css` — the same pack `tooling/figma/figma-pull.mjs` writes from the CLI, from
the same engine, with the same honesty header. The drawer then shows what the run actually did:
which ramps it used, every mapped token and where each value came from, the full WCAG pair table,
every contrast negotiation, every token auto-filled from contract defaults, and the pack header
verbatim.

When the file has no single brand ramp, the tool still **refuses to guess** — but the refusal
arrives as data, so the drawer renders the candidate ramps as clickable swatches. Clicking one
re-runs the import with that ramp as the accent. The refusal keeps its meaning (the tool never
picks for you) and stops being a dead end.

## User Story

As the operator of the ux-factory (the repo owner)
I want to drop a design export into the portal UI and get a committed-ready token pack
So that importing a company's design system is a drag-and-drop step in the workbench I already
have open, not a CLI invocation whose flags I have to remember and whose refusals I have to
re-run by hand.

## Problem Statement

Importing a design as a pack works today, but only as a command:
`node tooling/figma/figma-pull.mjs --slug <company> --from <export.json>`. Three frictions follow:

1. **It is a CLI job in a workbench product.** The portal is the operator surface for every other
   authoring step (intake, research chat, card library); the one step that re-skins the entire site
   is the one that isn't there.
2. **A refusal costs a whole re-run.** `pickRamps` throws when a file carries more than one
   candidate brand ramp (a palette library carries 20+). The fix is `--accent <hue>` — which means
   reading the printed list, choosing, and re-running the command.
3. **The honesty report is stdout-only.** Auto-filled tokens, negotiated rungs and failing WCAG
   pairs are printed once into a terminal. The operator who has to decide whether to commit the
   pack reads them in scrollback, if at all.

## Solution Statement

Call the existing engine from the portal. `runPull()` already reads, classifies ramps, maps roles,
negotiates contrast, writes the pack via `genPackCss`, and returns a result object — **no core
extraction is needed** (extraction into a view-time-safe module is only required for the public
exhibit, which is out of scope). So:

- **`tooling/figma/figma-pull.mjs`** — three additive changes: attach `candidates` (with a swatch
  hex) to the ambiguous-accent error; print the `--from` path repo-relatively in the pack header;
  widen `runPull`'s return with the fields the report needs (`filled`, `placed`, `available`,
  `fileName`, `note`, …). CLI stdout and every error message stay byte-identical.
- **`portal/lib/figma.mjs`** (new) — slug guard, persist the dropped export to
  `tooling/figma/exports/<slug>.json`, call `runPull`, and normalise success and the candidate
  refusal into **one** return shape.
- **`portal/server.mjs`** — one route branch, `POST /api/figma/pull`, with a dedicated raw-body
  reader (the shared `readBody`'s 1 MB cap stays exactly where it is for every other route).
- **`portal/public/*`** — a drawer mirroring the intake drawer: drop zone + keyboard-reachable file
  input, slug field, optional accent/neutral overrides, candidate swatches, and the report.
- **`docs/figma-runbook.md`** — §A becomes portal-first, CLI documented beneath it.

## Out of Scope / Non-Goals

- **The public drop-to-re-skin exhibit.** Same idea, different goal (proof for readers, not
  operator labour). It additionally needs the mapping core extracted to a view-time-safe module in
  `system/` (which `loc-summary` counts and which churns the two approach VR baselines), a `:root`
  apply path (`system/pack-derived.mjs` is the model) and a download instead of a disk write.
  Separate ticket.
- **A URL / file-key / API field in the UI.** Ruled out by measurement, not taste — see
  `figma-drop-portal-ui.md` §2. The drawer states *why* in one line and offers no such affordance.
- **Handover §C prompt 1** (any colour naming) and **prompt 2** (spacing/type/shadows). Prompt 1
  lands on `main` **before** this work starts (see Precondition); prompt 2 is unrelated — this UI
  inherits whatever the engine can do on the day.
- **`--map` in the UI.** A design that needs explicit token→style pins stays a CLI job; the runbook
  says so. (The drawer exposes slug + accent/neutral only.)
- **Fonts and components.** Handover §B G3/G4 — components never import on any plan, by design.
- **Wiring an imported pack into the appearance dock.** `dock.mjs` + `pack-boot.js` + new VR
  baselines; handover §C prompt 3.
- **Not changing:** `readBody`'s 1 MB cap, the `/api/chat` SSE path, `genPackCss`, the token
  contract, any shipped page, any committed pack.

## Feature Metadata

**Feature Type**: New Capability (operator tooling)
**Estimated Complexity**: Medium — small diff, but it spans three layers (tool, server, UI) and
touches a file with a hard byte-identical regression test.
**Primary Systems Affected**: `portal/` (server + lib + SPA), `tooling/figma/figma-pull.mjs`,
`docs/figma-runbook.md`, `.gitignore`
**Dependencies**: none new. Zero-dep Node ESM + vanilla SPA, as the repo requires.

## Related Work

**Implements**: [#116 — Drop a design in the portal, get a pack (no CLI)](https://github.com/linardsb/ux-factory/issues/116) (PR body **must** carry `Closes #116`)
**Design note**: `.claude/plans/figma-drop-portal-ui.md`

**Back-references**:

- `.claude/plans/figma-any-design-handover.md` — §A holds the measured facts and the owner
  decisions this plan inherits (Enterprise gate, rate budget, refuse-rather-than-guess). §C prompt
  1 is the **precondition** below.
- `.claude/plans/figma-token-import-handover.md` — the finished predecessor thread (PRs #111/#112/#114).
- PRs #111, #112, #114, #115 (all merged) — the read layer, `--from`, the runbook, the page/ramp
  auto-detection.

**Forward-references**:

- (none yet) — the public drop-to-re-skin exhibit, when ticketed, will link back here.

---

## PRECONDITION (do not start without this)

**`feature/figma-any-naming` must be merged to `main` first. The owner does this — not the
implementing agent.**

That branch lives in the `ux-factory-wt-figma` worktree (2 commits, `35c2c6c` + `d4b1a60`, clean,
unpushed as of 2026-07-25 14:08) and rewrites the same file this plan edits: it adds
`deriveRamps()`, `--map`, `nearestRung()`, `need`-aware `pickRamps`, and a much larger pack header.
Everything below is written against the **post-merge** file.

Verify before Phase 1:

```bash
git fetch origin && git log --oneline -3 origin/main       # expect 35c2c6c/d4b1a60 (or their merge) present
grep -c "deriveRamps\|nearestRung" tooling/figma/figma-pull.mjs   # expect > 0
grep -c -- '--from \${' tooling/figma/figma-pull.mjs       # expect EXACTLY 1 (see merge-artifact note)
node tooling/figma/figma-pull.mjs --slug plusui --neutral gray --accent indigo --offline \
  && git diff --exit-code system/tokens.plusui.css           # baseline must already be byte-identical
```

**Merge artifact to check for.** The `--from` header line exists in **two independent copies, on two
unmerged branches** — `chore/v3-merge-vr-reblock`'s `0293e4b` and `feature/figma-any-naming`'s
`d4b1a60`. **`origin/main` has neither** (verified 2026-07-25:
`git show origin/main:tooling/figma/figma-pull.mjs | grep readOptions.from` → no match). Their
surrounding context differs (the naming branch has a `--map` line directly above it), so when both
land a 3-way merge can legitimately keep **both**, and the result is a header printing
`--from x --from x` — a dishonest Regenerate line in every pack imported from an export. If the grep
above returns 2, delete the duplicate before Phase 2 and re-run the plusui regression. If it returns
0, the branch you cut from predates both fixes — stop, you're on the wrong base.

**Two branches, not one, have to land before Phase 1.**

| Branch | Carries | State (2026-07-25) |
|---|---|---|
| `feature/figma-any-naming` | `deriveRamps`, `--map`, `nearestRung`, the larger header | 2 commits, clean, **unpushed** (in `ux-factory-wt-figma`) |
| `chore/v3-merge-vr-reblock` | `0293e4b`'s `--from` header fix, the design note, **this plan**, #82 work | 11 commits ahead of `origin/main`, **unpushed** (primary worktree) |

Cut the implementation branch from a `main` that has **both**. If only one has landed when work
starts, branch from whichever holds the design note (`chore/v3-merge-vr-reblock`) and merge the
other in — but say so in the report, because the plusui byte-identical regression is only meaningful
against the post-merge engine.

If `deriveRamps` is absent, **stop and tell the owner** — the accent-refusal site is byte-identical
across both versions, so the `err.candidates` edit itself is a mechanical rebase, but `runPull`'s
return-shape edit and the header change are written against post-merge code and will not apply
cleanly.

**Where this plan lives:** committed on `chore/v3-merge-vr-reblock` beside the design note it expands
(the note is not on `main`, so a branch cut from `main` could not carry a working link to it). The
implementation PR carries the report and review, and amends this file if the build diverges.

**Where to work:** the `ux-factory-wt-figma` worktree
(`/Users/Berzins/Desktop/Linards_current/ux-factory-wt-figma`). It holds the gitignored
`portal/.env`, the gitignored Figma raw cache in `tooling/figma/.raw/` (needed for the `--offline`
plusui regression), and the naming branch itself. Branch from the merged `main` there, e.g.
`feature/figma-drop-portal-ui`. **Do not work in the primary worktree** — it is shared with
parallel sessions (handover "Working rules").

The portal needs its dependency present in that worktree: `cd portal && npm install` (or symlink
`node_modules` from the primary worktree) — `server.mjs` imports `./lib/chat.mjs`, which loads the
Agent SDK at module scope, so the server will not boot without it even though this feature never
touches chat.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

Line numbers are from the **post-merge** file where noted; locate by symbol name, not by line, if
the merge shifted them.

- `tooling/figma/figma-pull.mjs` — **the engine.** Read the whole file (≈420 lines post-merge).
  Specifically: `classifyRamps()` (~L172, returns `{hue, rungs, chroma}` — the mid-rung hex is
  computed there and thrown away; you need it), `pickRamps()` (~L182, the accent refusal at
  ~L196–204 is the throw that gains `err.candidates`), `runPull()` (~L235), the `label` header
  string (~L346–380, holds the `--from` line), and the `return { slug, dest, values, checks,
  stepped, failures }` at the end (~L400) — the shape that must grow.
- `portal/server.mjs` (whole file, 88 lines) — the route dispatch pattern, `json()`, `notFound()`,
  `readBody` (L35–40: the 1 MB cap you are **not** touching), and the one catch-all
  `catch (e) { return json(res, 500, { error: e.message }) }` at L79–81.
- `portal/lib/intake.mjs` (whole file, 90 lines) — the lib-module pattern this feature mirrors:
  hand-validate at the boundary and `throw new Error(...)`, no schema library, plain object return.
- `portal/lib/chat.mjs` (skim) — precedent for a lib function that takes `res`/streams (so
  `receiveExport(req, …)` taking `req` is in-pattern, not a new idea).
- `portal/lib/env.mjs` (27 lines) — `REPO_DIR`, `PORTAL_DIR`, the `.env` parse. `REPO_DIR` is the
  repo root and is what you resolve `tooling/figma/exports/` and `system/` against.
- `portal/public/index.html` L26–50 — `#intake-drawer` markup: the exact drawer structure to
  mirror (a `hidden` div, a `.portal-form`, labels wrapping inputs, `.portal-form-actions`, a
  `.portal-form-status` paragraph).
- `portal/public/portal.js` L1–11 (`$`, `esc`, `api()`), L110–133 (the intake drawer's open/cancel/
  submit + status-text pattern this feature mirrors).
- `portal/public/portal.css` L57–75 (`.portal-drawer` / `.portal-form` and its inputs), L1 (the
  file's rule: **contract tokens only**, no brand values, no literals for colour).
- `tooling/figma/figma-read.mjs` L281–289 — `readFigma({ from })`: `resolve(process.cwd(), from)`.
  The portal's cwd is `portal/`, so **the portal must pass an absolute path**; this is exactly why
  the header needs the repo-relative fix.
- `agent-layer/gen-pack-css.mjs` L93–136 — `genPackCss(values, { slug, dest, note })`: returns
  `{ slug, dest, tokenCount, filled, css }`. `filled` is the auto-filled token list §7 of the
  design note requires in the UI, and `runPull` currently only logs its `.length`.
- `agent-layer/gen-loc-summary.mjs` L22–26 — the three group regexes. **`portal/**` matches none of
  them**, so nothing in this feature churns `loc-summary.json` or the approach VR baselines. Only a
  *committed* `system/tokens.<slug>.css` does (runtime group) — that's the runbook line, not work
  here.
- `agent-layer/gen-system-graph.mjs` L21–23 — `PACK_FILES` is a hardcoded three-pack list, so a new
  pack does **not** churn `system-graph.json`. `tooling/token-lint.mjs` never reads packs either.
- `docs/figma-runbook.md` §A (L21–45) and "If it asks you something" (L82–96) — the text step 5
  rewrites.
- `.gitignore` L18–20 — where the Figma ignores already live; the new `exports/` line goes beside
  them.

### New Files to Create

- `portal/lib/figma.mjs` — slug guard + export persistence + `runPull` invocation, normalising
  success and the candidate refusal into one shape.
- (scratchpad only, **not committed**) `…/scratchpad/figma-fixtures/good.json`,
  `ambiguous.json`, `derived.json` — synthetic exports to verify against.

### Relevant Documentation

- [Figma REST — Variables (plan gate)](https://www.figma.com/developers/api#variables) — required
  plan **Enterprise**. Why the UI has no URL field. *Already verified; do not re-investigate, do
  not propose a paid plan as a fix* (handover §A).
- [MDN — HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API#droppable_elements)
  — `dragover` must call `preventDefault()` or `drop` never fires; `e.dataTransfer.files`.
  Why: the drop zone.
- [MDN — File.text()](https://developer.mozilla.org/en-US/docs/Web/API/Blob/text) — reading the
  dropped file for the client-side JSON/size check.
- [MDN — fetch with a Blob/File body](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit#body)
  — a `File` can be the `body` directly; no FormData, no multipart parser on the server.
- [Node — stream/promises `pipeline`](https://nodejs.org/api/stream.html#streampipelinesource-transforms-destination-options)
  — the streaming write, already used in `tooling/figma/figma-read.mjs` L85.
- [WCAG 1.4.3 contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) — what
  the pair table means; thresholds live in `system/derive.rules.mjs` `RULESET.wcagPairs`, imported,
  never restated.

### Patterns to Follow

**File headers** (CLAUDE.md: feature/entry-point files open with a header citing their governing
doc). `portal/lib/figma.mjs` opens with what/why + the governing doc:

```js
// portal/lib/figma.mjs — the portal's Figma import: a dropped export → system/tokens.<slug>.css.
// Plan: .claude/plans/figma-drop-portal-ui.md (§3 "the portal is Node; it imports and calls it").
// No engine of its own — runPull() in tooling/figma/figma-pull.mjs does the reading, ramp
// classification, contrast negotiation and the write. This module owns three things the CLI never
// needed: a slug that cannot escape system/ or clobber a generated file, a persisted export the
// pack header can honestly name, and one return shape for BOTH outcomes — a pack, or the
// refusal-with-candidates the drawer turns into swatches.
```

**Hand-validate at the boundary and throw, naming the offender** (CLAUDE.md: no schema library; the
message names the offending path):

```js
// portal/lib/intake.mjs L32
if (existsSync(path.join(dir, 'intake.md'))) throw new Error(`intake for "${slug}" already exists`);
```

**One route branch, thin** (`portal/server.mjs` L54–58) — `readBody` → delegate → `json`:

```js
if (p === '/api/intake' && req.method === 'POST') {
  const body = await readBody(req);
  const result = await createIntake(body);
  return json(res, 200, result);
}
```

**Errors surface through the single catch-all** (`portal/server.mjs` L79–81) — no per-route error
taxonomy, no wrapping. A thrown validation error becomes `500 { error: "<message>" }` and the
drawer prints the message.

**SPA feature = a handler + a render function + `esc()` on everything interpolated**
(`portal/public/portal.js` L113–133). Status goes into a `.portal-form-status` paragraph.

**`portal.css` is contract tokens only** (L1). Structural values (border widths, min-heights) are
fine; a colour literal is a bug. The one exception in this feature is a swatch's `background`,
which is a *hex read from the design* — data, not styling — and must be regex-validated before it
reaches a style attribute.

**Additive-only edits to a tool with a byte-identical regression test.** `tokens.plusui.css` must
regenerate byte-for-byte; error message strings are part of the contract (the runbook quotes them).
Add properties and return fields; never reword.

---

## IMPLEMENTATION PLAN

### Phase 1: Fixtures first (verify the engine's behaviour before building on it)

Nothing here is committed. Build three synthetic exports in the scratchpad and run the **CLI**
against each, so you know exactly which outcome each fixture produces before any UI exists.

**Tasks:**

- Write `good.json` (one grey ramp + one coloured ramp, ≥5 numbered rungs each, plus a white).
- Write `ambiguous.json` (two non-state coloured ramps, ≥5 rungs each) — must trigger the
  "N ramps could be the brand colour" refusal.
- Write `derived.json` (Light/Base/Dark naming, no numbers) — post-merge `deriveRamps` should
  synthesise rungs; confirm what it does rather than assuming.
- Run the CLI on each, record the outcome, and confirm the plusui `--offline` regression is clean.

### Phase 2: Engine — make the refusal machine-readable and the result reportable

**Depends on:** Phase 1 (you need `ambiguous.json` to prove the message is unchanged).

**Tasks:**

- `classifyRamps` also returns the mid-rung hex it already computes.
- The ambiguous-accent `throw` gains `err.candidates = [{ hue, chroma, swatch }]`, message untouched.
- The pack header's `--from` prints repo-relative when the export lives inside the repo.
- `runPull`'s return grows the report fields (`filled`, `tokenCount`, `placed`, `available`,
  `fileName`, `fileKey`, `note`, `pages`, `derivedUsed`, `collapsed`).

### Phase 3: Server — lib module + one route

**Depends on:** Phase 2 (the lib consumes `err.candidates` and the widened return).

**Tasks:**

- `portal/lib/figma.mjs`: `assertSlug`, `receiveExport(req, slug)` (streaming, own cap),
  `runFigmaPull({ slug, accent, neutral })` returning one shape for both outcomes.
- `portal/server.mjs`: one `POST /api/figma/pull` branch, two modes (upload / retry).
- `.gitignore`: `tooling/figma/exports/`.

### Phase 4: UI — the drawer

**Depends on:** Phase 3 (verified by `curl` before a pixel is written).

**Tasks:**

- `index.html`: header button + drawer markup (drop zone, file input, slug, accent/neutral,
  status, report region).
- `portal.js`: drop/file handling + client-side size/JSON check, submit, report render, candidate
  swatch retry.
- `portal.css`: drop zone, swatches, WCAG table, verbatim-header `<pre>`.

### Phase 5: Runbook + cleanup

**Independent of:** Phase 4's CSS (can be written in parallel), but do it last so the copy
describes what actually shipped.

**Tasks:**

- `docs/figma-runbook.md` §A → portal-first, CLI beneath, no-URL rationale, commit-time cascade.
- Delete throwaway packs/exports; run the full validation ladder.

---

## STEP-BY-STEP TASKS

### UPDATE `tooling/figma/figma-pull.mjs` — `classifyRamps` returns the mid-rung hex

- **IMPLEMENT**: the function already computes `mid` (the hex of the rung nearest 500) to measure
  chroma and discards it. Return it: `return { hue, rungs: steps.length, chroma: hexToOklch(mid).c, swatch: mid }`.
- **PATTERN**: `classifyRamps` post-merge ~L172–179 in the same file.
- **GOTCHA**: `classifyRamps` is `export`ed. Grep for other consumers
  (`grep -rn "classifyRamps" --include=*.mjs .`) before changing the shape — adding a field is
  safe, renaming an existing one is not.
- **VALIDATE**: `node -e "import('./tooling/figma/figma-pull.mjs').then(m=>console.log(m.classifyRamps({gray:{50:'#f9fafb',500:'#6b7280',900:'#111827'}})))"`
  → one entry with a `swatch` hex.
- **SATISFIES**: AC #2

### UPDATE `tooling/figma/figma-pull.mjs` — attach `candidates` to the ambiguous-accent refusal

- **IMPLEMENT**: in `pickRamps`, the `else` branch that throws. Build the error, attach data, throw:

  ```js
  const err = new Error(
    candidates.length
      ? `figma-pull: ${candidates.length} ramps could be the brand colour, …`   // ← UNCHANGED, byte for byte
      : `figma-pull: no non-grey, non-state ramp to use as the accent — …`,     // ← UNCHANGED
  );
  // The refusal stays a refusal — the tool still declines to pick. Carrying the candidates as
  // DATA lets a UI ask the question in a medium that can answer it (plan §3).
  if (candidates.length) {
    err.candidates = candidates
      .sort((a, b) => b.chroma - a.chroma)
      .map((r) => ({ hue: r.hue, chroma: r.chroma, rungs: r.rungs, swatch: r.swatch }));
  }
  throw err;
  ```

- **PATTERN**: same file, `pickRamps` accent branch ~L196–204.
- **GOTCHA**: keep both message strings **byte-identical** — `docs/figma-runbook.md` "If it asks you
  something" quotes the first one, and the candidate ordering already in the message
  (`.sort((a,b)=>b.chroma-a.chroma)`) must stay the order the swatches render in, or the UI and the
  text disagree. Do **not** attach candidates to the no-near-grey (neutral) throw — accent only,
  by decision.
- **IMPORTS**: none new.
- **VALIDATE**: `node tooling/figma/figma-pull.mjs --slug droptest --from <scratchpad>/ambiguous.json`
  → stderr message identical to Phase-1's recorded output; then
  `node -e "import('./tooling/figma/figma-pull.mjs').then(m=>m.runPull({slug:'droptest',from:'<abs>/ambiguous.json'})).catch(e=>console.log(e.candidates))"`
  → an array of `{hue,chroma,rungs,swatch}` with valid `#rrggbb` swatches.
- **SATISFIES**: AC #2, AC #4

### UPDATE `tooling/figma/figma-pull.mjs` — the header's `--from` names a repo-relative path

- **IMPLEMENT**: in `runPull`, before the `label`, derive the display path once:

  ```js
  // A pack imported through the portal is read from an absolute path on one machine. The header's
  // Regenerate line is a promise that the run can be reproduced — so name the file the way any
  // checkout can see it, and never bake a home directory into a committed file.
  const fromResolved = readOptions.from ? resolve(process.cwd(), readOptions.from) : null;
  const fromLabel = !fromResolved
    ? null
    : fromResolved.startsWith(ROOT + sep) ? relative(ROOT, fromResolved) : readOptions.from;
  ```

  and use `(fromLabel ? ` --from ${fromLabel}` : "")` in the label instead of
  `(readOptions.from ? ` --from ${readOptions.from}` : "")`.
- **PATTERN**: `relative(ROOT, dest)` is already how this file prints paths (final `console.log`).
- **IMPORTS**: `sep` added to the existing `import { relative, resolve } from "node:path"` (post-merge
  already imports `relative` and `resolve` — verify before adding).
- **GOTCHA**: an export **outside** the repo (`~/Downloads/export.json`) must keep printing verbatim
  — `relative()` would emit `../../Users/…`, which is worse than the absolute path. Test both.
- **VALIDATE**: run with `--from tooling/figma/exports/droptest.json` → header says
  `--from tooling/figma/exports/droptest.json`; run with `--from /tmp/x.json` → header says
  `--from /tmp/x.json`. Then the regression:
  `node tooling/figma/figma-pull.mjs --slug plusui --neutral gray --accent indigo --offline && git diff --exit-code system/tokens.plusui.css`.
- **SATISFIES**: AC #5, AC #4

### UPDATE `tooling/figma/figma-pull.mjs` — widen `runPull`'s return

- **IMPLEMENT**: replace the final `return { slug, dest, values, checks, stepped, failures };` with
  the same fields plus what a report needs. Everything below is already computed in the function:

  ```js
  return {
    slug, dest, values, checks, stepped, failures,
    // Additive: the report the CLI prints to stdout, returned so a UI can render the same facts
    // (the drawer is held to the same honesty as the pack header — plan §7).
    fileName, fileKey, available, placed,
    filled: r.filled, tokenCount: r.tokenCount,
    note: label, pages, derivedUsed, collapsed,
  };
  ```

- **PATTERN**: `genPackCss` returns `{ slug, dest, tokenCount, filled, css }` — `filled` is the
  auto-filled list §7 requires; it is currently only logged as `.length`.
- **GOTCHA**: `r` is the `genPackCss` result — check the local variable name post-merge before
  using it. Do **not** return `r.css` (the pack is on disk; shipping ~90 lines of CSS through JSON
  buys nothing). `pages` is `null` on the `--from` path — the UI must tolerate that.
  **stdout must not change**: add fields, delete no `console.log`.
- **VALIDATE**:
  `node -e "import('./tooling/figma/figma-pull.mjs').then(m=>m.runPull({slug:'droptest',from:'<abs>/good.json'})).then(r=>console.log(Object.keys(r),r.filled.length,r.checks.length))"`
  → keys include `filled`/`placed`/`note`; `checks.length` is 12.
- **SATISFIES**: AC #3

### CREATE `portal/lib/figma.mjs`

- **IMPLEMENT**: four exports, in this order.

  ```js
  export const MAX_EXPORT_BYTES = 32 * 1024 * 1024;   // mirrored in portal/public/portal.js — keep in step

  // The slug names a file inside system/. Anything that isn't a plain lowercase name could escape
  // that directory, and three of the packs there are generated or committed reference work that a
  // POST must never be able to overwrite.
  const RESERVED = new Set(['contract', 'neutral', 'source', 'verdant', 'saulera', 'plusui']);
  export function assertSlug(slug) { … }               // /^[a-z0-9-]{1,40}$/ + RESERVED → throw naming it

  export const exportPathFor = (slug) => join(REPO_DIR, 'tooling/figma/exports', `${slug}.json`);

  // Stream the dropped export to disk before anything parses it: the pack header names this file
  // as the run's source (D1), so it has to be a real, stable path. Streaming is what keeps the
  // HTTP layer out of it — no second copy buffered in memory, no JSON re-encode, and the shared
  // readBody's 1 MB cap stays exactly where it is for every other route. (readFigma still parses
  // the file itself; this is not a claim about that.)
  export async function receiveExport(req, slug) { … }  // → { path, bytes }

  export async function runFigmaPull({ slug, accent = null, neutral = null }) { … }
  ```

  `receiveExport`, in this exact order — the sequencing is the whole correctness of it:

  1. `assertSlug(slug)`; `mkdirSync(dirname(path), { recursive: true })`.
  2. **Fast refusal:** if `Number(req.headers['content-length']) > MAX_EXPORT_BYTES`, throw naming
     the cap and the declared size before a byte is written.
  3. **Counted stream:** a `data`/`Transform` counter that, on overflow, calls
     `req.destroy(new Error(\`figma import: export exceeds the ${MB} MB cap …\`))` — destroying the
     request is what makes the `pipeline` promise **reject**. Throwing from a bare `data` handler
     does not: it leaves a hung socket and a partial file, which is the historic
     "refuses a large file, badly" bug wearing a different hat.
  4. `await pipeline(req, createWriteStream(path))` inside a `try`; in the `catch`,
     `rmSync(path, { force: true })` then rethrow (the partial must never survive as a source the
     header could name).
  5. `JSON.parse(readFileSync(path, 'utf8'))` once — it must be valid JSON before `runPull` gets a
     slug's worth of side effects. On failure `rmSync` the partial and throw naming the path
     (`readFigma`'s own parse error would not name it).

  `runFigmaPull`: `assertSlug` → `existsSync(exportPathFor(slug))` or throw naming the path (this
  is the retry path's only input) → `await runPull({ slug, accent, neutral, from: exportPathFor(slug) })`
  in a `try`; on success return

  ```js
  { ok: true, pack: { …result, dest: relative(REPO_DIR, result.dest), exportPath: relative(REPO_DIR, exportPathFor(slug)) } }
  ```

  and in the `catch`, if `e.candidates` return

  ```js
  // A refusal is an OUTCOME, not a fault: the tool declined to guess and the UI can ask. Only real
  // faults are left to server.mjs's catch-all.
  { ok: false, needs: 'accent', candidates: e.candidates, message: e.message }
  ```

  otherwise `throw e`.
- **PATTERN**: `portal/lib/intake.mjs` (validate-and-throw, plain return); `tooling/figma/figma-read.mjs`
  L85 for `pipeline(Readable → createWriteStream)`.
- **IMPORTS**: `createWriteStream, existsSync, mkdirSync, readFileSync, rmSync` from `node:fs`;
  `pipeline` from `node:stream/promises`; `dirname, join, relative` from `node:path`; `REPO_DIR`
  from `./env.mjs`; `runPull` from `../../tooling/figma/figma-pull.mjs`.
- **GOTCHA**: pass `from` as an **absolute** path — `readFigma` resolves against `process.cwd()`,
  which is `portal/` when the server is started by `npm start`. The header's repo-relative fix is
  what keeps that honest. Also: `runPull` writes to `${ROOT}/system/tokens.${slug}.css` where `ROOT`
  comes from `figma-read.mjs`, so the slug guard is the *only* thing standing between a POST and a
  generated file — get it right and test it. `runPull` `console.log`s heavily; that lands in the
  portal's terminal, which is fine and useful (do not suppress it).
- **VALIDATE**:
  ```bash
  node -e "import('./portal/lib/figma.mjs').then(async m=>{ \
    for (const s of ['neutral','../x','Bad','', 'ok-slug']) { try { m.assertSlug(s); console.log('ok',JSON.stringify(s)) } catch(e){ console.log('refused',JSON.stringify(s),'—',e.message) } } })"
  # then, with good.json / ambiguous.json already copied to tooling/figma/exports/:
  node -e "import('./portal/lib/figma.mjs').then(m=>m.runFigmaPull({slug:'droptest'})).then(r=>console.log(r.ok, r.ok?r.pack.dest:r.candidates))"
  node -e "import('./portal/lib/figma.mjs').then(m=>m.runFigmaPull({slug:'droptest2'})).then(r=>console.log(r.ok, r.needs, r.candidates))"
  ```
- **SATISFIES**: AC #1, AC #2, AC #6

### UPDATE `.gitignore` — ignore the persisted exports

- **IMPLEMENT**: beside the existing Figma block (L18–20):

  ```
  # figma imports (a dropped export is someone else's design file — the pack is the artifact)
  tooling/figma/exports/
  ```

- **GOTCHA**: this is what makes D1 safe — the export is a real, stable path the header can name,
  and nothing third-party gets committed. Verify with `git status --porcelain` after an import run:
  the export must not appear.
- **VALIDATE**: `git check-ignore -v tooling/figma/exports/droptest.json`
- **SATISFIES**: AC #1

### ADD `POST /api/figma/pull` to `portal/server.mjs`

- **IMPLEMENT**: one branch beside `/api/intake`, before the static fallbacks:

  ```js
  // One route, two modes. A raw JSON body is a NEW export (streamed to disk, never buffered — the
  // shared readBody's 1 MB cap stays where it is for every other route); `x-figma-retry` re-runs
  // off the export already on disk, which is how a candidate swatch answers a refusal without
  // re-uploading the file.
  if (p === '/api/figma/pull' && req.method === 'POST') {
    const slug = url.searchParams.get('slug');
    const accent = url.searchParams.get('accent') || null;
    const neutral = url.searchParams.get('neutral') || null;
    if (req.headers['x-figma-retry'] === '1') req.resume();      // nothing to read; don't stall the socket
    else await receiveExport(req, slug);
    return json(res, 200, await runFigmaPull({ slug, accent, neutral }));
  }
  ```

- **PATTERN**: the `/api/intake` branch (L54–58) — thin dispatch, logic in the lib.
- **IMPORTS**: `import { receiveExport, runFigmaPull } from './lib/figma.mjs';` beside the other lib
  imports.
- **GOTCHA**: a refusal is `200 { ok:false, needs:'accent', … }` **by design** — only genuine faults
  (bad slug, missing export, unparseable JSON, over-cap) fall through to the L79–81 catch-all as
  `500 { error }`. **Divergence from the design note:** §4 step 3 says "bad body returns 400". This
  repo has no per-route error taxonomy (CLAUDE.md: "one catch-all at the server boundary returns
  `{ error }` JSON… No error taxonomy"), so validation errors surface as 500 with a message that
  names the offender, and the drawer prints it. Adding a status taxonomy for one route would
  contradict the rules file; recorded here rather than done silently.
- **VALIDATE**:
  ```bash
  cd portal && npm start &            # then, from the repo root:
  curl -s localhost:4747/api/health
  curl -s -H 'content-type: application/json' --data-binary @<scratchpad>/good.json \
    'localhost:4747/api/figma/pull?slug=droptest' | head -c 400
  curl -s -H 'content-type: application/json' --data-binary @<scratchpad>/ambiguous.json \
    'localhost:4747/api/figma/pull?slug=droptest2' | head -c 400          # → ok:false + candidates
  curl -s -X POST -H 'x-figma-retry: 1' 'localhost:4747/api/figma/pull?slug=droptest2&accent=<hue>' | head -c 200
  curl -s -H 'content-type: application/json' --data-binary @<scratchpad>/good.json \
    'localhost:4747/api/figma/pull?slug=neutral'                          # → 500 {"error":"…\"neutral\"…"}
  ls -l system/tokens.droptest.css system/tokens.droptest2.css
  ```
- **SATISFIES**: AC #1, AC #2, AC #6, AC #7

### UPDATE `portal/public/index.html` — the button and the drawer

- **IMPLEMENT**: a third header button after `#btn-chat`:
  `<button class="btn btn-secondary" id="btn-figma" type="button">Figma → pack</button>`
  and a drawer mirroring `#intake-drawer`:

  ```html
  <!-- Figma import panel -->
  <div class="portal-drawer" id="figma-drawer" hidden>
    <form class="portal-form portal-form-wide" id="figma-form">
      <h2 class="h3">Figma → pack</h2>
      <p class="muted">
        Drop a Figma <strong>export</strong> (Tokens Studio, a variables dump, any nested
        name→value JSON). No URL or file link: Figma's variables API is Enterprise-only and the
        file-read budget is ~6/month, so an export is the only input that works on a normal design.
      </p>
      <p class="muted">
        What comes across is <strong>colour</strong> — the design's colour on this repo's scale.
        Spacing, type, radius, shadows and motion are filled from contract defaults and listed
        below every run. Components and fonts never import.
      </p>
      <div class="portal-drop" id="figma-drop">
        <p>Drop the export here</p>
        <label class="portal-drop-pick">or choose a file
          <input type="file" name="export" id="figma-file" accept="application/json,.json" />
        </label>
        <p class="muted" id="figma-file-name" aria-live="polite"></p>
      </div>
      <label>Pack slug * <input name="slug" id="figma-slug" required pattern="[a-z0-9-]{1,40}"
        placeholder="acme" autocomplete="off" /></label>
      <div class="portal-form-row">
        <label>Accent ramp (optional)<input name="accent" autocomplete="off" /></label>
        <label>Neutral ramp (optional)<input name="neutral" autocomplete="off" /></label>
      </div>
      <div class="portal-form-actions">
        <button class="btn btn-primary" type="submit">Import</button>
        <button class="btn btn-secondary" type="button" id="figma-cancel">Cancel</button>
      </div>
      <p class="muted portal-form-status" id="figma-status" aria-live="polite"></p>
      <div id="figma-report"></div>
    </form>
  </div>
  ```

- **PATTERN**: `#intake-drawer` L26–50 — same classes, same `hidden` toggle, same status paragraph.
- **GOTCHA**: the `<input type="file">` is **required**, not optional garnish — a drop target alone
  is unreachable by keyboard. Keep it focusable (don't `display:none` it; if you style it away, use
  a visually-hidden pattern that stays tabbable). The honesty copy is a hard requirement (§7 of the
  design note), not filler.
- **VALIDATE**: load `http://localhost:4747`, click **Figma → pack** — the drawer opens; Tab reaches
  the file input; **Cancel** closes it.
- **SATISFIES**: AC #1, AC #3, AC #8

### UPDATE `portal/public/portal.js` — drop handling, submit, report, retry

- **IMPLEMENT**: one section after the intake block, mirroring its shape.

  ```js
  /* ---------- figma → pack ---------- */
  const MAX_EXPORT_BYTES = 32 * 1024 * 1024;   // mirrors portal/lib/figma.mjs — keep in step
  const figma = { file: null };
  ```

  - open/cancel: `#btn-figma` / `#figma-cancel` toggle `#figma-drawer.hidden` (identical to intake).
  - `#figma-drop`: `dragover` → `preventDefault()` + add `.is-over`; `dragleave` → remove;
    `drop` → `preventDefault()`, take `e.dataTransfer.files[0]`, remove `.is-over`.
    `#figma-file` `change` → same handler.
  - `pickFile(file)`: reject when the name doesn't end `.json`, when `file.size > MAX_EXPORT_BYTES`
    (message naming the real limit in MB **and** the file's own size), or when `await file.text()`
    fails `JSON.parse` — each into `#figma-status`, and leave `figma.file = null`. On success show
    the name + size. *Client-side checks are a courtesy; the server validates again.*
  - submit: `POST /api/figma/pull?slug=…&accent=…&neutral=…` with `body: figma.file` and
    `headers: { 'content-type': 'application/json' }`. Use a bespoke `fetch` (not the shared `api()`
    helper, which assumes a JSON request and throws on `!res.ok`); read `await res.json()` and, when
    `!res.ok`, show `body.error`.
  - `renderReport(pack)` into `#figma-report`: the written path + the source export; ramps used;
    a table of the 16 mapped tokens (`placed[].token`, hex swatch, `placed[].source`); the full
    `checks` table (✓/✗, ratio, min, fg on bg) with failures marked; `stepped` negotiations;
    `derivedUsed`/`collapsed` when present; **the `filled` token names, in full, not a count**;
    then the pack header verbatim in a `<pre>`; then the commit line:
    *"Commit `system/tokens.<slug>.css`. A new pack under `system/` changes `loc-summary.json`, so
    regenerate it and the approach VR baselines in the same commit:
    `node agent-layer/gen-loc-summary.mjs` · `cd tooling/visual-regression && npm run update:docker`."*
  - `renderCandidates(body)` when `ok === false`: the message verbatim, then a swatch button per
    candidate (`hue`, chroma, rung count). Click → `POST` with `x-figma-retry: 1`, the same slug and
    `accent=${encodeURIComponent(hue)}`, no body → `renderReport` on success.
  - **A refusal that carries no candidates** (no usable ramp at all, no grey ramp, an empty read, a
    3-rung derived ramp under the `rungs >= 5` bar) never reaches `renderCandidates`: `runFigmaPull`
    rethrows it, so it arrives as `500 { error }`. Render that message verbatim in `#figma-status`
    with no affordance — the tool is saying the design can't be imported as-is, and inventing a
    control for it would be an overclaim.
- **PATTERN**: `portal/public/portal.js` L113–133 (intake submit + status), L96–105 (a `show()`
  render function re-binding its own buttons).
- **GOTCHA**: `esc()` **everything** interpolated, including `fileName` and `placed[].source` —
  a Figma style name is third-party text. A swatch's colour goes into a style attribute, so
  validate it first: `/^#[0-9a-f]{6}$/i.test(hex)` or render no swatch. **`encodeURIComponent` the
  hue in the retry URL** — post-merge, `deriveRamps` builds ramp keys from arbitrary style-name
  prefixes, so a candidate can be `brand blue` or carry a `+`/`#`; unencoded, `+` decodes as a space
  and `#` truncates the query, and the retry silently runs against a different or missing ramp
  (`runPull`'s `no "<hue>" ramp in this file` is the backstop). Don't reuse `api()` for the
  raw-body POST. Keep `figma.file` after a refusal — the retry doesn't need it, but re-importing
  after fixing the slug does.
- **VALIDATE**: in the browser — drop `good.json`, slug `droptest`, Import → report with a 12-row
  WCAG table and a named auto-filled list; `ls system/tokens.droptest.css`. Drop `ambiguous.json`,
  slug `droptest2` → swatches; click one → pack written. Drop a `.txt` and a hand-broken JSON →
  refused client-side with a clear message. Slug `neutral` → the server's message shown.
- **SATISFIES**: AC #1, AC #2, AC #3, AC #6

### UPDATE `portal/public/portal.css` — drop zone, swatches, table

- **IMPLEMENT**: after the drawer block (L57–75):
  `.portal-form-wide { width: min(720px, 100%); }` (the report needs more room than intake's 480px);
  `.portal-drop` — dashed `1px` `var(--color-border)`, `var(--radius-md)`, centred text,
  `min-height` ~140px, `padding: var(--spacing-lg)`; `.portal-drop.is-over` — `var(--color-accent)`
  border + `var(--color-bg-surface)` ground; `.portal-swatches` — flex wrap;
  `.portal-swatch` — a button with a colour chip (`width/height` ~28px, `var(--radius-sm)`,
  `1px solid var(--color-border)`) above its hue label; `.portal-wcag` — `width:100%`,
  `font-size: var(--type-caption)`, `border-collapse: collapse`, a `data-pass="false"` row marked
  with `var(--color-accent-secondary)` weight/mark (not colour alone); the report's `<pre>` reuses
  `.portal-pane pre`'s look (L52) — extend that selector rather than duplicating it.
- **PATTERN**: L1 — "contract tokens only, on top of components.css".
- **GOTCHA**: no colour literal anywhere; a failing row must not be conveyed by colour alone (the
  ✓/✗ glyph already carries it — keep it). The drawer scrolls (`.portal-form` is
  `overflow-y: auto`), so the table needs `overflow-x: auto` on a wrapper, not a wider drawer
  (memory: wide content clips inside grid/flex children — give the wrapper `min-width: 0`).
- **VALIDATE**: eyeball at 1440px and at 720px (the existing media query); table scrolls rather
  than clipping.
- **SATISFIES**: AC #3

### UPDATE `docs/figma-runbook.md` — §A is portal-first

- **IMPLEMENT**: restructure §A as **"A · Import a design as a pack"** with two paths:
  1. **In the portal (the normal way).** `cd portal && npm start` → **Figma → pack** → drop the
     export, type a slug, Import. Read the WCAG table and the auto-filled list. Then commit
     `system/tokens.<slug>.css` — and note the cascade: a new tracked `system/*.css` changes
     `loc-summary.json`, so `node agent-layer/gen-loc-summary.mjs` and
     `cd tooling/visual-regression && npm run update:docker` belong in the same commit.
  2. **From the CLI** (unchanged text, kept beneath — for `--map`, `--offline`, `--page`, or an
     API read).
  Add, in §A or beside "If it asks you something": **there is no URL field, and why** — variables
  REST is Enterprise-only, `/styles` answers `[]` off Enterprise, the token is server-side, and the
  budget is ~6 reads/month. Update the ramp-ambiguity entry to say the portal shows the candidates
  as swatches you click, and that the CLI equivalent is `--accent <hue>`.
- **GOTCHA**: **`system/figma-import.md` is deliberately NOT touched** — it ships inside the handoff
  pack, so editing it forces `gen-handoff` + `gen-pack-bundle` regeneration or `drift-check` goes
  red, and its subject (Figma→token mechanics) doesn't change. Do not overclaim: the portal path
  imports **colour only**, exactly as the CLI does; the doc "was wrong once already in this thread"
  (handover §C).
- **VALIDATE**: `grep -n "portal" docs/figma-runbook.md` shows the new path; re-read §A end-to-end
  against what actually shipped.
- **SATISFIES**: AC #8

### REMOVE the throwaway artifacts, then validate everything

- **IMPLEMENT**:
  ```bash
  rm -f system/tokens.droptest.css system/tokens.droptest2.css system/tokens.droptest3.css
  rm -f tooling/figma/exports/droptest*.json
  git status --porcelain          # only the intended files, and NO system/tokens.droptest*.css
  ```
- **GOTCHA**: a throwaway pack left in `system/` and staged would churn `loc-summary.json` and both
  approach VR baselines and turn CI red — this is the one cleanup step that must not be skipped.
- **VALIDATE**: the full ladder in **VALIDATION COMMANDS** below.
- **SATISFIES**: AC #9

---

## TESTING STRATEGY

The repo has **no test suite, no linter, no type-check** (CLAUDE.md) — "done" means *run the surface
you touched*. So the strategy is fixtures + the real surfaces.

### Fixtures (scratchpad, not committed)

Written in `…/scratchpad/figma-fixtures/`. `entriesFromExport` flattens any nested JSON to
`path → value`, so a plain nested map is a valid export:

```json
{
  "gray":   { "50": "#f9fafb", "100": "#f3f4f6", "200": "#e5e7eb", "500": "#6b7280", "700": "#374151", "900": "#111827" },
  "indigo": { "50": "#eef2ff", "100": "#e0e7ff", "400": "#818cf8", "600": "#4f46e5", "700": "#4338ca", "900": "#312e81" },
  "base":   { "white": "#ffffff" }
}
```

- `good.json` — the above: one grey ramp, one coloured ramp, a white. Expect a clean import.
- `ambiguous.json` — `good.json` plus a second non-state coloured ramp (e.g. `teal/50…900`, ≥5
  rungs). Expect the "N ramps could be the brand colour" refusal with 2 candidates.
- `derived.json` — `{"Blue": {"Light": "#…", "Base": "#…", "Dark": "#…"}, "Grey": {…}}`, no
  numbers. Post-merge `deriveRamps` should synthesise rungs; **record what it actually does** — a
  3-rung ramp is below the `rungs >= 5` usability bar, so this fixture likely refuses. That's a
  fact to verify, not to assume, and whatever it does must render sanely in the drawer.

### Integration (the real surfaces)

1. `cd portal && npm start` boots; `curl -s localhost:4747/api/health` answers `{"ok":true,…}`.
2. `curl` each fixture through `POST /api/figma/pull` (upload mode) — pack written / refusal
   returned as `200 { ok:false, … }`.
3. `curl` the retry mode with `x-figma-retry: 1` and an `accent` — pack written, **no body sent**
   (proves the persisted export is the real source the header names).
4. Browser round-trip of both outcomes, including a candidate swatch click.
5. **Regression:** `node tooling/figma/figma-pull.mjs --slug plusui --neutral gray --accent indigo
   --offline && git diff --exit-code system/tokens.plusui.css` — byte-identical. (Requires the raw
   cache, which is why the work happens in `ux-factory-wt-figma`.)
6. **CLI parity:** `node tooling/figma/figma-pull.mjs --slug droptest --from …/ambiguous.json`
   prints the refusal message recorded in Phase 1, unchanged.

### Edge Cases (each must be exercised)

| Case | Expected |
|---|---|
| slug `neutral` / `contract` / `verdant` / `plusui` | refused, message names the slug; no file written |
| slug `../../etc/passwd`, `Acme`, `a_b`, empty, 41 chars | refused by the regex, message names it |
| export > 32 MB | refused naming the cap; partial file removed from `tooling/figma/exports/` |
| export between 1 MB and 32 MB | **imports** — proof `readBody`'s cap was bypassed, not raised |
| dropped `.txt` / broken JSON | refused client-side with a clear message; nothing POSTed |
| valid JSON with no colours | server's own message (`no tokens found — expected DTCG…` / `no ramp to map roles onto`) surfaced verbatim |
| retry for a slug with no persisted export | refused naming the expected path |
| a design whose accent needs negotiation | negotiation rows render; header lists them |
| a pack with a failing WCAG pair | ✗ rows visible, failure named in report **and** header |
| re-import the same slug twice | export overwritten, pack overwritten, no error |
| `--from` outside the repo (CLI) | header keeps the verbatim path (no `../../Users/…`) |
| drawer with keyboard only | file input reachable, Import submits, report readable |

---

## VALIDATION COMMANDS

Run from the repo root of the `ux-factory-wt-figma` worktree.

### Level 1: Syntax & style

```bash
node --check portal/lib/figma.mjs
node --check portal/server.mjs
node --check tooling/figma/figma-pull.mjs
node tooling/token-lint.mjs            # portal.css isn't linted, but prove nothing else broke
```

### Level 2: Unit-ish (module boundaries)

```bash
node -e "import('./portal/lib/figma.mjs').then(m=>{['neutral','contract','../x','Bad','a_b','','ok'].forEach(s=>{try{m.assertSlug(s);console.log('ok   ',JSON.stringify(s))}catch(e){console.log('refuse',JSON.stringify(s),e.message)}})})"
node -e "import('./tooling/figma/figma-pull.mjs').then(m=>m.runPull({slug:'droptest',from:process.env.FX+'/good.json'})).then(r=>console.log(r.filled.length,r.checks.length,r.available))"
```

### Level 3: Integration (server + engine)

```bash
cd portal && npm start &
sleep 1 && curl -s localhost:4747/api/health
curl -s -H 'content-type: application/json' --data-binary @$FX/good.json      'localhost:4747/api/figma/pull?slug=droptest'  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.ok,j.pack?.dest,j.pack?.filled?.length,j.pack?.checks?.length)})"
curl -s -H 'content-type: application/json' --data-binary @$FX/ambiguous.json 'localhost:4747/api/figma/pull?slug=droptest2' | head -c 300
curl -s -X POST -H 'x-figma-retry: 1' 'localhost:4747/api/figma/pull?slug=droptest2&accent=indigo' | head -c 200
curl -s -H 'content-type: application/json' --data-binary @$FX/good.json 'localhost:4747/api/figma/pull?slug=neutral'
```

### Level 4: Manual validation (the point of the ticket)

1. Open `http://localhost:4747` → **Figma → pack**.
2. Drop `good.json`, slug `droptest3`, **Import** → report shows path, ramps, 16 mapped tokens,
   12 WCAG rows, negotiations, the **named** auto-filled tokens, the header verbatim, the commit
   line. `system/tokens.droptest3.css` exists and its header names
   `--from tooling/figma/exports/droptest3.json`.
3. Drop `ambiguous.json`, slug `droptest2` → the refusal message + candidate swatches. Click the
   brand ramp → pack written.
4. Keyboard-only pass: Tab to the file input, choose a file, submit, read the report.
5. Regression + gates, then cleanup:

```bash
node tooling/figma/figma-pull.mjs --slug plusui --neutral gray --accent indigo --offline
git diff --exit-code system/tokens.plusui.css && echo "plusui byte-identical ✓"
node tooling/drift-check.mjs
node agent-layer/gen-loc-summary.mjs --check
rm -f system/tokens.droptest*.css tooling/figma/exports/droptest*.json
git status --porcelain
```

### Level 5: Optional

- `git check-ignore -v tooling/figma/exports/x.json` — the ignore actually bites.
- A ~5 MB fixture (pad `good.json` with extra ramps or a large unused branch) to prove the >1 MB
  path works end to end through the browser.

---

## ACCEPTANCE CRITERIA

- [ ] **AC1** Dropping an export in the portal writes `system/tokens.<slug>.css` — no command run,
      no terminal touched beyond starting the portal.
- [ ] **AC2** An ambiguous file renders candidate ramp swatches; clicking one writes the pack. The
      tool still never picks a brand ramp itself, and both refusal messages are byte-identical.
- [ ] **AC3** The report shows the auto-filled tokens **by name**, the full 12-pair WCAG table, and
      the pack header verbatim.
- [ ] **AC4** CLI unchanged: `tokens.plusui.css` regenerates byte-identically (`--offline`), stdout
      and every error string unchanged.
- [ ] **AC5** The pack header names the persisted export repo-relatively
      (`--from tooling/figma/exports/<slug>.json`); an out-of-repo CLI path still prints verbatim.
- [ ] **AC6** Slug guard: `^[a-z0-9-]{1,40}$` + reserved list, throwing a message that names the
      slug; nothing is written on refusal.
- [ ] **AC7** An export over 1 MB imports; `portal/server.mjs`'s `readBody` cap is unchanged
      (`git diff` on that function is empty).
- [ ] **AC8** `docs/figma-runbook.md` §A is portal-first with the CLI beneath, states why there is
      no URL path, and names the commit-time loc-summary/VR cascade.
- [ ] **AC9** `node tooling/drift-check.mjs` ✓ · `node tooling/token-lint.mjs` ✓ ·
      `node agent-layer/gen-loc-summary.mjs --check` ✓ · `git status --porcelain` shows no
      throwaway pack or export.
- [ ] **AC10** The PR body carries `Closes #116`, and the plan + report + review live in the same PR
      (`.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/pr-<N>-review.md`).

---

## COMPLETION CHECKLIST

- [ ] Precondition verified: `feature/figma-any-naming` on `main`, `deriveRamps` present
- [ ] Working in `ux-factory-wt-figma` on a branch off the merged `main`; `portal/node_modules` present
- [ ] All tasks completed in order, each validated immediately
- [ ] Fixtures exercised: good · ambiguous · derived · oversized · malformed
- [ ] Browser round-trip passed for both outcomes, keyboard-only included
- [ ] plusui byte-identical; refusal messages unchanged
- [ ] `drift-check` · `token-lint` · `gen-loc-summary --check` all ✓
- [ ] Throwaway packs and exports deleted; `git status` clean of them
- [ ] Runbook §A rewritten; `system/figma-import.md` untouched
- [ ] One atomic commit per phase-group, message = what + doc reference
- [ ] PR body carries `Closes #116`; plan/report/review committed in the same PR

---

## OPEN QUESTIONS / ASSUMPTIONS

**Decided with the owner (2026-07-25) — do not reopen:**

| # | Decision |
|---|---|
| 1 | `feature/figma-any-naming` lands on `main` **first**, by the owner; this plan targets post-merge code |
| 2 | Ticket [#116](https://github.com/linardsb/ux-factory/issues/116) created; PR must carry `Closes #116` |
| 3 | Export persisted at `tooling/figma/exports/<slug>.json`, **overwritten** on re-drop, gitignored (D1) |
| 4 | Candidate-picker UI for the **accent** refusal only — not neutral, not page choice |
| 5 | Dedicated raw-body reader for this route (cap ~32 MB); `readBody`'s 1 MB cap untouched (D3) |
| 6 | Slug guard: regex + hard reserved list; any other existing pack is overwritten without ceremony |
| 7 | Header button + `hidden`-toggled drawer, mirroring intake — no new hash route |
| 8 | No live preview and no re-skin of the portal — report only |
| 9 | Fixtures live in the scratchpad; nothing committed |
| 10 | Drawer exposes slug + accent/neutral only — `--map` stays a CLI job |
| 11 | Commit-time loc-summary/VR cascade named in **both** the runbook and the UI report |
| 12 | Work happens in the `ux-factory-wt-figma` worktree |
| 13 | The naming-branch merge is the owner's step; the plan states it as a precondition |
| 14 | Pack header prints the `--from` path repo-relative when it's inside the repo |
| 15 | Mandatory **report** content: the **named** auto-filled list + the **full** WCAG table |
| 15b | Mandatory **drawer** copy (§7, separate from the report): "colour only, on this repo's scale" — components and fonts never import. Decision 15 answered what the *report* must carry; it is not licence to cut this |
| 16 | One line in the drawer explaining why there's no URL field |
| 17 | One route, two modes, discriminated by `x-figma-retry` |
| 18 | Client-side check = size + `JSON.parse` only |
| 19 | Report = structured UI **plus** the header verbatim in a `<pre>` |
| 20 | Button copy: **"Figma → pack"** |

**Divergences from the design note, recorded rather than silent:**

- §4 step 3's "bad body returns 400" → validation errors surface as the repo's standard
  `500 { error }` from the single catch-all. CLAUDE.md forbids an error taxonomy; a refusal (the
  case that actually matters to the UI) is a `200` discriminated outcome instead.
- §4 step 1 is **two** changes, not one: the error property *and* `classifyRamps` returning the
  mid-rung hex it already computes. A third, adjacent change (widening `runPull`'s return) is
  required by §7's "auto-filled stays visible in the UI" — `runPull` currently drops
  `genPackCss`'s `filled`.
- §5 D3 is resolved by design, not measurement: **no real plugin export exists anywhere on disk**
  (`tooling/figma/.raw/` holds a 2.7 MB *API* page and a 396-byte 403 gate body). The streaming
  reader + 32 MB cap + a client-side check that names the limit is the shape that can't produce the
  "refuses a large file" bug this repo already has in its history — but if the owner produces a real
  Tokens Studio export of a large kit, measure it and revisit the cap.

**Assumptions:**

- The `.raw/` cache in `ux-factory-wt-figma` still holds the Plus UI responses, so the plusui
  `--offline` regression is runnable for free. If it's gone, that regression can't run (no budget
  should be spent on it) — say so in the report rather than skipping it silently.
- `derived.json`'s outcome is unverified (a 3-rung derived ramp is under the `rungs >= 5` bar);
  Phase 1 records the real behaviour and the drawer must render it sanely either way.
- The portal remains 127.0.0.1-only, so no auth/CSRF work is in scope — the new route has the same
  exposure as `/api/intake`, which also writes to disk.

---

## NOTES (open canvas)

**Why the drawer isn't a page.** The report is the biggest thing the portal renders, which argues
for a route. But the portal's grammar is *library/detail in `#main`, actions in a drawer*, and this
is an action with a receipt. A wider drawer (`min(720px, 100%)`) buys the room without inventing a
second grammar. If the report later needs to be re-read hours after the import, that's the moment
to promote it — and by then it should probably be persisted, not re-rendered from memory.

**Why the retry re-reads the persisted export.** The alternative (re-POST the file) is stateless
and tempting. But D1's whole point is that the header names a real, stable path — so making the
retry read exactly that path turns the honesty claim into something the feature *exercises* on
every ambiguous import, instead of something we assert once. It also means a 30 MB file is uploaded
once, not once per candidate click.

**Why `err.candidates` and not a `{ ok, needs }` return from `pickRamps`.** Turning the refusal into
a return value would mean every caller — the CLI included — has to handle it, and the CLI's correct
behaviour is to die with a message. A thrown error with data attached keeps the CLI path byte-identical
and lets one caller (the portal) look deeper. This is the same trick `figma-read.mjs` uses when it
keeps Figma's 403 body as `gate` evidence rather than restructuring the flow around it.

**The cap number.** 32 MB is chosen, not measured: `SAFE_PARSE_BYTES` in `figma-read.mjs` is 128 MB
(a V8 string-limit guard), a real API page here was 2.7 MB, and a Tokens Studio export of a large
kit is plausibly single-digit MB. 32 MB is comfortably above any believable export and far below the
parse ceiling. It is one constant in two files — if it ever moves, move both (each comments the
other).

**What this deliberately doesn't do:** it doesn't make the pack visible anywhere. The imported pack
is invisible until someone wires it into the dock (handover §C prompt 3, +VR baselines) or passes it
to `build-instance.mjs --pack`. That's correct for this ticket — the ask was about operator labour,
not about readers — but it's worth knowing that "drop a design, see the site wear it" is still two
tickets away, and the *public* version of that is the one that's actually the platform's thesis.

**Risk register.**

| Risk | Mitigation |
|---|---|
| Merge order: naming branch lands after this work starts | Precondition + a grep gate before Phase 2 |
| A POST clobbers a generated pack (`tokens.neutral.css`) → CI red | Reserved list + regex, tested with explicit refusal cases |
| Throwaway `system/tokens.droptest.css` gets staged → loc-summary + 2 VR baselines churn | Explicit cleanup task + `git status` in the DoD |
| `plusui` stops regenerating byte-identically | Run the `--offline` regression after **each** engine edit, not once at the end |
| A large export refused with a message that reads like a bug (the historic bug) | Dedicated reader, generous cap, client-side check naming the actual limit and the file's size |
| Third-party style names / hexes injected into the DOM | `esc()` everywhere; hex regex-validated before any style attribute |
| Header bakes `$HOME` into a committed file | Repo-relative header fix, verified both ways |

**Confidence: 9.5/10** for one-pass success. The engine already does the work; every layer this
touches has a pattern to copy in the same repo; the one genuinely unknown (what `deriveRamps` does
to a 3-rung `Light/Base/Dark` fixture) is discovered in Phase 1 before anything depends on it.

## AMENDMENTS

- (none yet — created 2026-07-25)
