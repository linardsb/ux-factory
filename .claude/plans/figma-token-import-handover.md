# Handover — repo housekeeping + the Figma token-import thread (2026-07-25)

Written for a fresh context window. Two parts: **§A** what already landed today (so you don't redo it),
**§B** the live unfinished thread (Figma → portfolio token import), which is where to pick up.

Precedent for this doc's shape: `.claude/plans/ux-overhaul-handover.md`.

---

## §A · What landed today (done, verified, no action needed)

`origin/main` = `a19639a`, **CI green** (`verify` ✓ · `visual` ✓).

### Merged
| PR | What |
|---|---|
| **#104** | Un-redded `main`: regenerated 4 stale VR baselines + **fixed #105** (below) + landed a stranded caption-tokenize fix and the #40 spike-1 label |
| **#106** | Rescued 5 PIV artifacts that were uncommitted in worktrees; retired `__TODO.md`; added 2 conventions to CLAUDE.md |
| **#107** | Fixed bugs **#102 + #103** (the `#beat-brand` / dock pack contract) |

### Issues closed
- **#78** — was shipped in PR #93 back on 07-24 but never auto-closed; closed + epic #70 checkbox ticked.
- **#105** — *filed and fixed today.* `main`'s `visual` job was failing on `index · saulera` because the peak
  (`activateOn:'visible'`) had **no readiness handle**, so the capture raced its skeleton→content assembly.
  Fix: `data-peak="ready"` set in a `finally` on every path in `peak.mjs`, plus a new `waitVisible` field in
  `visual.spec.mjs` awaited **after** the viewport resize (it cannot go in `waitReady` — at load the peak is
  off-screen and never activates, so that deadlocks).
- **#102 / #103** — closed by #107. Root cause was one thing: the beat↔dock event contract ran one way.
  Now `PACK_REQUEST_EVENT` (beat → dock, cancelable) and `PACK_CHANGE_EVENT` (dock → beat, emitted only once
  the selector is written **and** the swap settled), with `derivedOnRoot` moved into `pack-derived.mjs` so
  both surfaces share one ground-truth test.

### Hygiene
Worktrees 15 → 3 · local branches 44 → 4 · remote branches 18 → 7.

Remaining worktrees, all deliberate:
- `ux-factory/` (primary) — on **`feature/v3-close`**, a **live parallel session planning #77**. Do not switch
  or commit on this branch from another session; stage by explicit path.
- `ux-factory-wt-12` — kept for the pending `FIGMA_TOKEN` parity run (see §B).
- `ux-factory-wt-88` — kept: `scratch/` holds real files incl. `issue-88-verdict.md`.

Remote branches kept on purpose: `feature/portability-proofs` (the wt-12 pairing),
`feature/v3-hero` + `feature/pack-seed-derivation-vision-run` (tips are **not** ancestors of main).

### Still open
| # | Status |
|---|---|
| #77 | P2e investment close — **being planned in a parallel session** on `feature/v3-close` |
| #81 | P3d instance spine — plannable now, but **#77 is a hard dependency**: its first AC names the close beat ("hero → intake → peak → close") and only 3 beats are registered on main. Also inherits PR #94's deferred `askedAxes` open question ("re-confirm before merge") |
| #82 | P4 — owns the D11 VR-freeze removal (`verify.yml:48`) + authoritative full regen + the **human** hallway rounds |
| #101, #90 | epic #86 (`ds-` list-row primitive; ceiling-engine spike, gated) |
| #70, #86 | the two epics |

---

## §B · LIVE THREAD — Figma token import

### The goal (owner's words, 2026-07-25)
Show that **the portfolio work can be done with Figma** — visual prototyping in the portfolio while connected
to Figma, so Figma's design tokens are available in the portfolio. An **example/community kit is explicitly
acceptable**; the point is demonstrating the capability, not authoring a design system.

> Owner pushback worth honouring, not re-litigating: I raised an authorship concern about using a
> third-party kit and the owner overruled it — correctly. Demonstrating the pipeline against a free public
> kit is a normal capability demo. **Keep it honest the way the repo already does it**: label the resulting
> pack like the derived packs do ("imported from Plus UI, a community kit — not my design work"). Do not
> re-open this.

### What exists today — the flow runs the OPPOSITE way
```
system/tokens.source.json          ← THE source of truth (DTCG, hand-authored)
  ├─ gen-token-css.mjs  → tokens.contract.css + tokens.neutral.css   (what the site renders)
  ├─ gen-tokens.mjs     → handoff/verdant/tokens.dtcg.json           (the file you import INTO Figma)
  └─ gen-handoff.mjs    → the pack, incl. figma-import.md

tooling/figma/figma-parity.mjs     ← READ-ONLY: reads Figma, diffs vs the contract, writes figma-parity.json
```
There is **no importer**. Figma is a consumer + a parity check. `handoff/verdant/figma-parity.json` has never
existed; `pack.json` carries `portability.figma.parity: null` ("pending real run") — open since 2026-07-18.

Read `system/figma-import.md` first — it documents three paths and their exact gates.

### Design decision (assumption — owner never explicitly confirmed, flag it)
**Figma → repo, as a PACK**, not into the contract:
```
Figma → tooling/figma/figma-pull.mjs → system/tokens.<brand>.css → gen-handoff.mjs → commit
```
Rationale: the repo splits **contract tokens** (semantic, brand-free, what components reference) from **pack
values** (the brand layer). A Figma file holds brand values, so a pack is the natural target — it reuses the
dock's switcher, `pack-boot.js` persistence and the whole one-line re-skin claim, and stays clear of
`drift-check`, which polices that the CSS layers are generated from `tokens.source.json`.

Follow the `figma-parity` precedent: secret-gated, standalone, **never registered in `build.mjs`** (it is a
non-deterministic network read; the generator chain stays deterministic and offline-runnable).

**It can never be a view-time connection** — shipped pages are vanilla with no runtime deps, and `FIGMA_TOKEN`
is a secret that must never reach the client. Build-time pull → commit the artifacts → readers replay. Same
rule as the agent traces.

### Hard constraints (documented in-repo, not guesses)
1. **REST variables are Enterprise-gated.** `file_variables:read` is offered only to Enterprise Full seats
   ("Organization" does not qualify). Variables imported by drag-and-drop on a non-Enterprise account are
   **invisible to REST entirely**. Documented workaround: Tokens Studio → "Create styles" → local styles
   applied to nodes, which *are* readable via `GET /v1/files/:key`.
2. **Rate limits are by the FILE's plan** — Starter ≈ **6 `GET /v1/files/:key` per month** (since Nov 2025).
   The script caches to `tooling/figma/.last-response.json` (gitignored); iterate with `--offline`.
3. **Account/token rotation to evade 429s was declined** (ToS violation) and is **not needed**: 1 real request
   + `--offline` covers the entire development loop. Do not re-propose it.

### Environment state
`portal/.env` **exists** (gitignored, `.gitignore:18`; verified absent from `git status`). It carries
`FIGMA_TOKEN` (owner's, scope `file_content:read`) and:
```
FIGMA_FILE_KEY=1h9hLlYs6S9CO1xGyBcBVX
```
= "Plus UI — FREE Figma UI Kit and Design System (2026) v2.0 (Community)". **Do not put the token in any
committed file or in chat.** The token appeared in a session transcript today — rotating it in Figma is cheap
insurance once this work is done.

### What the one real run proved, and the bug it exposed
Ran `node tooling/figma/figma-parity.mjs` once. It failed with `Invalid string length`.

- **Inference: REST read access WORKS.** That error is V8's max-string-length limit, thrown from
  `figma-parity.mjs:62` (`await res.text()`). A `403`/`404` body is tiny and could never overflow, so Figma
  answered with real file content. This effectively closes the plan-gating question for `GET /v1/files/:key`.
  *(Inference, not a printed 200 — treat as high-confidence, not proven.)*
- **One request was spent and NOTHING was cached** — the crash precedes the cache write at line 158, so there
  is no `--offline` fallback for that run.
- **Genuine robustness bug**: the script cannot read a large file at all. Any real company design system would
  hit this. Not yet filed — **file it like #105** if you keep this file as the fixture.

### The fix — reduce the payload server-side (streaming will NOT save you)
Do not try to stream-to-disk: `JSON.parse` needs the whole document as one string too, so the max-string limit
applies again. A zero-dep streaming JSON parser is not worth building. Shrink the response instead:

1. Keep the existing first attempt: `GET /v1/files/:key/variables/local` (403 on non-Enterprise → its body is
   kept as gate evidence, which is deliberate and valuable).
2. Replace the giant `GET /v1/files/:key` fallback with two small calls:
   - `GET /v1/files/:key/styles` → style records incl. `node_id` (small).
   - `GET /v1/files/:key/nodes?ids=<node_ids>&depth=1` → resolve fills for just those nodes.
3. Cache **each** response so `--offline` iteration works from then on.
4. `?depth=1` on the file endpoint is a cheaper stopgap, but yields **name parity only** (no node fills → no
   values), so prefer the `/styles` + `/nodes` pair.

`entriesFromFile()` (line 87) currently walks `data.document` and reads `data.styles` — it will need reshaping
for the `/nodes` response envelope. `compareRows()` (line 108) is payload-agnostic and can stay as-is.

### Next actions, in order
1. Rework the fallback per above; re-run once; confirm it caches.
2. Iterate the mapper with `--offline` (zero further requests).
3. Land `figma-parity.json` — closes the pending portability proof and frees `wt-12` +
   `origin/feature/portability-proofs`.
4. Only then build `figma-pull.mjs` → `tokens.<brand>.css`, with the honesty label on the pack.
5. File the size bug as its own issue if the fixture stays this large.

### Traps to carry forward (learned the hard way today)
- **`activateOn:'visible'` beats need a post-resize VR wait.** `visual.spec.mjs` doesn't use `fullPage`
  stitching — it resizes the viewport to full content height, and *that* is what reveals the page. Put the
  handle in `waitVisible`, never `waitReady`. (#105; #77's close beat and #81's instance beats are next.)
- **`update:docker` silently won't rewrite a baseline whose diff is under `maxDiffPixels: 100`.** A one-digit
  `loc-summary` change (10,500 → 10,600) passed on tolerance while leaving the baseline stale — `rm` the PNG
  to force a true regen.
- **A tracked-source edit cascades**: regen `loc-summary.json` *after staging*, and if the **runtime** group
  moves, both approach baselines churn (`approach.html:244` renders that number).
- **PRs need a `Closes #N` trailer** — a title mentioning `(#N)` closes nothing. Verified working: #104's
  trailer auto-closed #105. Now a rule in CLAUDE.md.
- **Artifacts stranded in worktrees**: 5 real review/report files were uncommitted and one
  `git worktree remove` from deletion. Always audit worktree `status` before pruning. Also now in CLAUDE.md.
- **zsh gotchas** that bit today: unquoted `$var` does **not** word-split (use a loop for
  `git push --delete`), and backticks inside a double-quoted `-m` message run as command substitution (use
  `git commit -F <file>`).
- **`git branch --merged main` is meaningless if local `main` is stale** — it was 47 commits behind and made
  every v3 branch look unmerged. Always compare against `origin/main`.
