# /build slice 1a — the page + the import act (Act 0, scoped stage re-skin)

**Ticket:** #135 · **Epic:** #134 (`.claude/plans/hooked-shapeup-pattern-builder.md`, Phase 1.2)
**Satisfies:** AC2 (the page exists on the shell) · AC3 (a real export re-skins the stage, scoped)

## What ships

Two new files and nothing else on the shipped surface:

- `build.html` — the sixth public surface, deep-link only in this slice (NOT linked from home or
  work; that is slice 1d, and keeping it unlinked is what stops any other page's VR baseline from
  churning here).
- `system/build-import.mjs` — Act 0: drop a design-token export, the SHIPPED engine
  (`system/pack-import.mjs`) maps it, and the **stage mount alone** wears the result.

## Decisions taken before writing (assumptions, stated)

1. **The record is built, never persisted.** The ticket says "stores a `pack-imported.mjs`-compatible
   record". `pack-boot.js:34` reads `sessionStorage["factory-pack-imported"]` FIRST on every page and
   applies it, so `writeImported()` would make the import site-wide on the next navigation — the
   opposite of this ticket's title. So: `buildImportedRecord()` is called (the record shape is real,
   and the vetted `tokens` map is what the stage wears), and the record is held in module state for
   the later "wear it site-wide" handoff. Nothing is written to storage. The module header argues
   this, so a later slice does not "fix" it.
2. **No seam is exported from `system/brand-import.mjs`.** The ticket hedges ("possibly a small
   exported seam"). That module exports nothing and self-boots on `[data-import]`; adding an export
   for /build puts the home drop surface at risk for no gain. `build-import.mjs` consumes
   `pack-import.mjs` directly and mounts on `[data-build-import]` — a distinct attribute, so the two
   self-boots can never collide.
3. **`el()` is duplicated, not shared.** `brand-import.mjs:37-39` records that decision explicitly.
4. **The download header is the shipped one.** The plan's prose asks for a `BROWSER BUILD —` header;
   the shipped `brand-import.mjs` instead puts browser-drop provenance in `mapPack`'s `regenerate`
   callback and lets `mapPack` own the label. /build matches the shipped behaviour, so the same
   export downloads identically from home and from /build. One header format, not two.
5. **The three not-yet acts stay bare.** `#act-hooked`, `#act-shape`, `#act-breadboard` are empty
   mounts. One honest line in the capability strip names what runs today; four "coming soon" cards
   would be worse. `#build-stage` carries a real, honest at-rest state (the component sampler the
   import re-skins); `#build-keep` holds the download only.
6. **No new tokens, no new components.** Act 0 reuses the committed `.brand-*` drop/report classes
   from `system/portfolio.css` plus a page-local `<style>` for build-only layout (the `factory.html`
   precedent). No `tokens.source.json` change ⇒ no `gen-token-css` / `gen-handoff` cascade.

## Tasks

### 1. CREATE `build.html`
- Head mirrors `factory.html:1-40`: contract → neutral → components → portfolio, `pack-boot.js`,
  `noindex`, `theme-color`, icon. `body data-page="build"`.
- Mounts: `#act-import`, `#act-hooked`, `#act-shape`, `#act-breadboard`, `#build-stage`,
  `#build-keep`.
- Honest capability strip: committed rules run in your browser · nothing is uploaded · no model is
  called · the rules are readable, with links to the two real modules.
- The `[data-build-import]` block is the no-JS / fail-closed state: inert copy naming what the
  feature does, never a control that does nothing (the `index.html` `[data-import]` precedent).
- Chrome scripts: `client.neutral.config.js`, `site.js`, `portfolio.js`, `analytics.mjs`,
  `dock.mjs`, then `build-import.mjs`. **Not** `brand-import.mjs`.
- **VALIDATE**: `npx serve .` → /build renders chrome + mounts, zero console errors.

### 2. CREATE `system/build-import.mjs`
- Drop zone + keyboard-reachable file input; client checks (`.json`, ≤ `MAX_EXPORT_BYTES` 32 MB,
  `JSON.parse`) with the refusal ordering `brand-import.mjs:335-370` uses.
- `entriesFromExport` → `mapPack` (contract fetched lazily once from `/system/tokens.source.json`).
- Success → `buildImportedRecord` → its vetted `tokens` written as inline custom properties on
  `#build-stage` **only** (the `instance.mjs` scoped model; never `:root`, never `documentElement`).
- Candidate-ambiguity refusal → swatch buttons, hex regex before any `style` attribute; the
  no-candidate refusal renders verbatim with no affordance.
- Brand-colour fallback input → `deriveBrandTokens(hex)` (the real `derive()`) applied to the same
  scoped mount; skip → neutral (a reset that clears the scoped props).
- `emitPackCss(mapped.values, …)` → `tokens.<slug>.css` Blob download in `#build-keep`.
- `esc()`/`textContent` for everything read out of the file — ramp names are third-party text.
- **VALIDATE**: headless drop of `tooling/figma/exports/plusui.json` → stage re-skins scoped
  (`:root` untouched); `.txt`, broken JSON and an over-cap file refused client-side; zero errors.

### 3. Gates (the cascade the ticket's list misses)
- `git add` the two new files FIRST (gen-loc reads `git ls-files` / `git show :path`, so a check
  before staging is a false "no drift" — memory: loc-summary-counts-tracked-only).
- `node agent-layer/gen-loc-summary.mjs` — `system/build-import.mjs` lands in the **runtime** group,
  whose numbers `approach.html` renders ⇒ regen, then re-capture the two approach VR baselines in
  THIS PR (`cd tooling/visual-regression && npm run update:docker`). `build.html` lands in **pages**,
  which approach does not render.
- `node tooling/token-lint.mjs` · `node tooling/drift-check.mjs` (on a clean tree, never mid-merge).
- **No /build VR baseline here** — Phase 1.5 owns it, and baselining a page whose three acts get
  filled in 1.3/1.4 is pure churn.

### 4. Commit
- The epic plan `.claude/plans/hooked-shapeup-pattern-builder.md` (currently untracked) lands in this
  PR — the epic issue says the plan is committed with the first slice.
- Stage by explicit path. Five shipped `.html` files carry an unrelated in-flight copy pass from a
  parallel session; they are not this ticket's and are left alone.
- PR body carries `Closes #135`.

## Out of scope (named, so the next slice can claim them)

Acts 1–3 (`build-questions.mjs`, `breadboard.mjs`), the pattern rules + render, the build card, the
share link, the IA links from home/work, and the /build VR baselines.
