# Feature: Site shell — Home 90-second gate, IA chrome, Approach/Work/Contact, Factory stub, analytics wiring

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

The shipped site's information architecture, realized on the neutral shell. Today the repo's visitor-facing surface is a placeholder: `index.html` is a "neutral base" demo of the token system, `404.html` points back at it, and the nav config knows only `#system`/`#swap` anchors. This ticket replaces that placeholder with the real five-page IA the epic settled (architecture §Other eng-lead calls): **Home** engineered as the 90-second recruiter gate (outcome headline + three proof shortcuts) · **Approach** (copy already finalized in `__Approach_page.md`) · **Factory** (deep-linkable route reserved, honest stub) · **Work** · **Contact**. All five render under the neutral pack with chrome injected by the existing `system/site.js` config pattern, token-only styling throughout.

It also wires measurement: the Cloudflare Web Analytics beacon (cookieless) plus the one custom-event helper the architecture pinned — `"factory driven"` — which exists and is callable now, and fires for real once the Factory page (#10) lands.

## User Story

As a recruiter (or a hiring manager skimming before the deep read)
I want a site I can scan in 90 seconds that states its outcome up front and hands me three verifiable proof shortcuts
So that I can confidently forward it to the hiring manager or panel — the story survives a forward to someone who wasn't in the conversation (PRD §5: "safe to champion").

## Problem Statement

Every other Wave-1 ticket builds pipeline machinery (#3 derivation, #4 scenarios, #5 traces) but there is no site for it to live in: no IA, no pages, no chrome beyond the demo config, and no way to measure whether readers ever drive the factory (the PRD's WRONG-condition diagnostic, §7). The Factory page (#10) needs a route to land in; the recruiter audience (PRD §5, secondary but served) currently gets a token-system demo instead of a gate.

## Solution Statement

- **Five pages on the existing shell pattern**: each page is a vanilla HTML file at the repo root loading the same four-stylesheet stack (`tokens.contract.css → tokens.neutral.css → components.css → portfolio.css`) and the same three-script tail (`client.neutral.config.js → site.js → portfolio.js`), chrome injected from `window.CLIENT_CONFIG`, active nav state via `<body data-page="…">`. No framework, no build step — the hard constraint holds.
- **Home = the gate**: outcome headline + three proof shortcuts (Factory / the system / Work), each carrying an exact capability indicator ("runs now" vs "in build") per honesty surface #3. Short enough to scan in 90 seconds; no web fonts, no new assets.
- **Approach**: built section-by-section from `__Approach_page.md`, whose build notes already name the exact components per section. The optional interactive commentary/reveal in §05 is deferred (see Out of Scope).
- **Factory**: an honest stub reserving the `/factory` route — states exactly what will run there vs. what runs today (with links to the raw, committed harnesses), never pretending the pipeline is live.
- **Analytics**: `system/analytics.mjs` (hand-written ES module beside `site.js`, per CLAUDE.md's view-time rule) injects the CF Web Analytics beacon when a token is configured, and exports `trackFactoryDriven()`. **Critical constraint discovered in research: Cloudflare Web Analytics does not support custom events** (FAQ: "Not yet") — the beacon records pageviews only, including SPA route changes via History API hooks. The "factory driven" event is therefore implemented as a **virtual-route pageview** (`/factory/driven`), filterable by path in the CF dashboard. This implements the architecture's intent (diagnose the WRONG condition: did readers drive the factory?) within the platform's actual capability.
- **`_headers` untouched**: `noindex` stays (X-Robots-Tag + per-page `<meta name="robots" content="noindex">`); the launch open question stays open.

## Out of Scope / Non-Goals

- **Not the Factory page itself** — five stations, intake wizard, scenario toggle, live re-skin are #10 (depends on #3/#4/#5/#8). This ticket only reserves the deep-linkable route with an honest stub.
- **Not the Approach §05 optional interactive commentary / guess-then-reveal** — the build note marks it optional; the voice contract caps interactivity at one reveal. Defer to a follow-up polish pass (note it in the plan's AMENDMENTS if cut becomes permanent).
- **Not the Work exhibits** — data-connected prototypes (#8) and the agentic-UI study (#13) are their own tickets; Work lists them with exact plan-gated labels only.
- **Not deploying or obtaining the CF Web Analytics token** — the site token is created in the Cloudflare dashboard at launch; the module ships with an empty-token no-op (helper still callable — that's the AC).
- **Not changing** `system/components.css`, `system/tokens.*`, `system/site.js`, `system/proto.css`, `worker/`, `scenarios/`, `agent-layer/`, or the portal. Chrome changes go through the config file, never `site.js` (its header says so).
- **Not touching `_headers`** — AC explicitly keeps `noindex`; the cache rules already cover `/system/*` and `/*.html`.
- **Not removing `derive.html` or `scenarios/check.html`** — they stay internal harnesses; the Factory stub links them *labeled as raw harnesses*.

## Feature Metadata

**Feature Type**: New Capability (content-heavy)
**Estimated Complexity**: Medium — mechanics are low-risk repetition of an existing shell pattern; the weight is in copy quality (Home gate) and honesty-exact status labels
**Primary Systems Affected**: root HTML pages (`index.html`, `404.html`, four new), `system/client.neutral.config.js`, `system/portfolio.css`, new `system/analytics.mjs`, `CLAUDE.md` architecture map
**Dependencies**: none new. Zero runtime deps (hard constraint). Cloudflare Web Analytics is a `<script>` injected at view time only when a token is set.

## Related Work

**Implements**: [linardsb/ux-factory#6](https://github.com/linardsb/ux-factory/issues/6) — PR closes with `Closes #6`
**Epic**: [#1](https://github.com/linardsb/ux-factory/issues/1) + `docs/epics/ai-first-ux-factory.architecture.md` (§Other eng-lead calls — IA · §Stack — CF Web Analytics + one custom event "factory driven" · §Boundaries — honesty surfaces). These are **inherited decisions, not re-decided here** — with one platform-reality adaptation (no custom events in CF WA → virtual-route pageview), recorded under OPEN QUESTIONS / ASSUMPTIONS.

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/scenario-packages-worker-mock-api.md` — Why: shipped-page shell conventions (`scenarios/check.html`), the `LOCAL_HOSTS` localhost-guard precedent in `system/scenario-data.mjs` that `analytics.mjs` mirrors, and the honesty-surface-#3 "state which source answered" register the capability indicators reuse.
- `.claude/plans/live-derivation-engine.md` — Why: `derive.html` is the raw harness the Factory stub links to as "what runs today"; its head comment already declares "The designed surface for this engine is the Factory page (ticket #10)".

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- (none yet — #10 Factory page will replace `factory.html`'s stub content and call `trackFactoryDriven()` for real; its plan should back-reference this file)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `__Approach_page.md` (whole file, 141 lines) — Why: **the finalized Approach copy plus per-section build notes naming exact components**; the voice contract at its top (lines 12–20) governs every line of copy on every page this ticket writes, not just Approach. The end notes (lines 137–141) flag the §07 placeholder and the "teaching layer is distributed, never a section" rule.
- `index.html` (whole file, 116 lines) — Why: the shell pattern every page copies — head order (lines 1–17: charset, viewport, title, description, `noindex`, favicon, theme-color, four stylesheets), `data-page` on body (line 19), section/hero markup idiom (lines 22–40), script tail (lines 112–114). This file is REWRITTEN as the Home gate; its current "neutral base" demo content is retired (git history keeps it).
- `404.html` (whole file, 45 lines) — Why: the minimal-page variant of the shell; its hero CTAs (lines 33–36) point at the retired `#system` anchor and must be re-aimed at the new IA.
- `system/client.neutral.config.js` (whole file, 55 lines) — Why: the ONLY file that defines nav/footer/CTA — chrome changes happen here, never in `site.js`. Note its header comment's "nothing personal lives here" register was written for the demo shell; this ticket revises that comment honestly (the shell now hosts the portfolio IA).
- `system/site.js` (lines 8–12, 26–35, 52–57) — Why: read-only contract — how `data-page` matches `nav[].key` for the active state, `data-header` variants, and how `cta` renders. Do not modify.
- `system/portfolio.css` (lines 1–7, 44–50, 66–79, 283–300) — Why: the promotion rule in the header ("reused across 2+ pages is promoted HERE"), `.hl` accent underline, `.card-kicker`/`.card-foot` idiom the proof-shortcut cards reuse, and the mobile-compaction block new styles must respect. **Line 6: "Only semantic tokens — no raw values except where noted"** — the token-discipline bar for the two new organisms.
- `system/scenario-data.mjs` (lines 1–15) — Why: the house pattern for a hand-written view-time ES module beside `site.js`: header citing epic/ticket + architecture §, `LOCAL_HOSTS` guard, honesty-contract comment explaining a load-bearing choice. `analytics.mjs` mirrors all three.
- `system/components.css` — Why: the available organism vocabulary (verified present): `page-hero`, `hero-eyebrow`/`pill`/`stamp`/`meta`, `hero-sub`, `hero-cta-row`, `section`, `section-label` (`.num`/`.line`), `section-split`, `headline`, `grid grid-2/-3/-4`, `card`/`card-body`/`card-kicker`/`card-link`, `feature-band`/`feature-grid`/`feature-item`, `lineup`/`lineup-item`/`lineup-n`/`lineup-title`, `decision-card`/`decision-card-title`/`decision-card-fields`/`dc-field`, `btn btn-primary/btn-secondary/btn-arrow`, `max-prose`, `muted`, `eyebrow`, `divider`, `closing`. Build pages from these; a literal in page-level `<style>` is a bug.
- `derive.html` (lines 1–22) — Why: precedent for an honest internal-harness label in a head comment, and the target of the Factory stub's "what runs today" link.
- `_headers` (whole file, 18 lines) — Why: verify-only — `X-Robots-Tag: noindex` (line 6) and the `/*.html` cache rule already cover new pages. No edit.
- `docs/epics/ai-first-ux-factory.prd.md` (§5 Target User, §7 Success Metrics, §8 Non-goals) — Why: the gate's job definition ("skimmable… survives a forward", "recruiters get a gate, not the product") and why the analytics event exists (diagnose the WRONG condition).
- `CLAUDE.md` (§Architecture map, §Ground rules) — Why: the map lines this ticket updates; the honesty contract and header-comment conventions new files follow.
- `.claude/references/frontend-component-best-practices.md` (§Accessibility, §Visual & Interaction Craft) — Why: the applicable bars — one `h1` per page, no skipped heading levels, keyboard-reachable interactive elements, verify at 320/768/1024/1440, realistic copy. (Its React sections don't apply — this repo is vanilla.)

### New Files to Create

- `approach.html` — the Approach page, built section-by-section from `__Approach_page.md`
- `work.html` — Work index: exhibits with exact capability labels
- `contact.html` — Contact page (email primary, GitHub secondary)
- `factory.html` — the reserved deep-linkable Factory route: honest stub (what will run vs. what runs today)
- `system/analytics.mjs` — CF Web Analytics beacon inject + `trackFactoryDriven()` virtual-route helper

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [CF Web Analytics FAQ](https://developers.cloudflare.com/web-analytics/faq/) — Why: **the load-bearing constraint** — "Do you support custom events? Not yet"; SPA route changes ARE recorded ("additional metrics are sent for every route change"). This is why the helper fires a virtual-route pageview.
- [CF Web Analytics — get started](https://developers.cloudflare.com/web-analytics/get-started/) — Why: the manual-snippet install path (site token from "Manage site" in the dashboard; snippet = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "…"}'></script>`). SPA tracking is on by default (`"spa": false` disables it).
- [CF Pages serving behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/) — Why: confirms `/approach` serves `approach.html` (extensionless URLs) — the nav uses extensionless hrefs; `npx serve` matches this locally (serve-handler `cleanUrls` defaults on).

### Patterns to Follow

**Page shell (every new page, from `index.html:1–19` and `112–115`):**

```html
<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Approach · Linards Berzins</title>
  <meta name="description" content="…" />
  <meta name="robots" content="noindex" />
  <link rel="icon" type="image/svg+xml" href="/assets/logo-neutral.svg" />
  <meta name="theme-color" content="#ffffff" />
  <link rel="stylesheet" href="/system/tokens.contract.css" />
  <link rel="stylesheet" href="/system/tokens.neutral.css" />
  <link rel="stylesheet" href="/system/components.css" />
  <link rel="stylesheet" href="/system/portfolio.css" />
</head>
<body data-page="approach">
  <main> … </main>
  <script src="/system/client.neutral.config.js"></script>
  <script src="/system/site.js"></script>
  <script src="/system/portfolio.js"></script>
  <script type="module" src="/system/analytics.mjs"></script>
</body>
</html>
```

**View-time ES module header (from `system/scenario-data.mjs:1–13`):** hand-written-canon declaration, epic/ticket citation, architecture § reference, and a comment explaining the honesty-load-bearing choice in place.

**Error/absence handling:** no error taxonomy — the analytics module silently no-ops without a token (an absent optional capability is not an error); `console.debug` at most, mirroring `site.js`'s single `console.warn` register.

**Capability indicator language (honesty surface #3, from `scenario-data.mjs`'s `source` comment):** labels state *exactly* what answers/runs — "Runs now" only for things a reader can execute or inspect this minute; "In build" for everything plan-gated, never "coming soon" vagueness.

**Copy voice (from `__Approach_page.md:12–20`):** first-person testimony, phenomenon first / framework name last, no badges or callouts announcing teaching, subject of every sentence is the work.

---

## IMPLEMENTATION PLAN

### Phase 1: Chrome + measurement foundation

The config and the analytics module — everything pages consume.

**Tasks:**

- Update `system/client.neutral.config.js` to the five-page IA (nav, CTA, footer)
- Create `system/analytics.mjs` (beacon inject + event helper)
- Add the two new organisms to `system/portfolio.css` (`.capability` chip, `.loop-table` + `.table-scroll`)

### Phase 2: Pages

**Depends on:** Phase 1 (nav keys, capability chip, loop table).

**Tasks:**

- Rewrite `index.html` as the Home gate
- Create `approach.html` from `__Approach_page.md`
- Create `work.html`, `contact.html`, `factory.html`
- Update `404.html` links

The five page tasks are **independent of each other** once Phase 1 lands — order below is priority order (Home first), not a dependency chain.

### Phase 3: Integration + docs

**Tasks:**

- Update `CLAUDE.md` architecture map (IA pages + `analytics.mjs`)
- Full-surface validation (serve, route checks, chrome injection, token lint, viewport sweep)

---

## STEP-BY-STEP TASKS

### UPDATE `system/client.neutral.config.js`

- **IMPLEMENT**: Replace the demo nav/footer with the shipped IA. `nav`: Home `/` (key `home`) · Approach `/approach` (key `approach`) · Factory `/factory` (key `factory`) · Work `/work` (key `work`). `cta`: `{ label: "Get in touch", href: "/contact" }` (Contact rides the CTA slot, matching the nav-cta idiom — it still gets `data-page="contact"` on its own page; no nav item needs to light up there). `footer.columns`: column 1 "Site" = the five pages; column 2 "The system" = keep the contract/pack/components links (they are the inspectability story). `footer.tagline`: reframe from "neutral base demo" to the portfolio register, e.g. "A working factory for UX engineering: token-contract design system, generated artifacts committed in the open, agents at build time only." `footer.copyright`: `"© 2026 Linards Berzins"` (see OPEN QUESTIONS on identity strings). Keep `brand.name: "ux factory"` and the neutral logos. Revise the header comment: the "nothing personal lives here" paragraph is now false — rewrite it to say the neutral config carries the shipped site's IA; a company build still clones this file.
- **PATTERN**: existing structure of the same file (`system/client.neutral.config.js:10–55`); `site.js:52–57` for how `key` ↔ `data-page` matching works.
- **GOTCHA**: hrefs are extensionless (`/approach`, not `/approach.html`) — CF Pages and `npx serve` both resolve them; keep `/` for home. Every href must resolve to a file this ticket creates (the config header's own rule).
- **VALIDATE**: `node --check system/client.neutral.config.js`
- **SATISFIES**: AC #1 (chrome via config pattern)

### CREATE `system/analytics.mjs`

- **IMPLEMENT**: Hand-written view-time ES module, ~45 lines:
  - Header comment: `// system/analytics.mjs — hand-written canon (this repo; not generated).` + purpose + `(epic #1, ticket #6; architecture §Stack — CF Web Analytics, one custom event)` + a comment block stating the platform constraint: *CF Web Analytics has no custom events (FAQ: "Not yet"); the beacon does record SPA route changes, so the one "factory driven" event is a virtual-route pageview at `/factory/driven`, filtered by path in the dashboard.*
  - `const BEACON_TOKEN = "";` — filled at launch from the CF dashboard (public value, safe to commit; empty = beacon not injected, helper still callable).
  - `const LOCAL_HOSTS = ["localhost", "127.0.0.1"];` — mirror `scenario-data.mjs:15`; never inject the beacon locally (local dev must not pollute the WRONG-condition diagnostic).
  - Side-effect on import: if `BEACON_TOKEN && !LOCAL_HOSTS.includes(location.hostname)`, create `<script defer src="https://static.cloudflareinsights.com/beacon.min.js">` with `data-cf-beacon` = `JSON.stringify({ token: BEACON_TOKEN })` and append to `document.head`.
  - `export function trackFactoryDriven()`: capture `location.pathname + location.search + location.hash`; `history.pushState(history.state, "", "/factory/driven")`; restore with `history.replaceState(history.state, "", real)` inside `setTimeout(…, 50)` — the delay lets the beacon's pushState hook read the virtual path before the URL flips back. Guard against double-fire per page load (`let fired = false`).
- **PATTERN**: `system/scenario-data.mjs:1–15` (header register, LOCAL_HOSTS, honesty comment).
- **GOTCHA**: (1) Never POST to `/cdn-cgi/rum/` directly — CF docs: all requests must originate from the beacon script. (2) The pushState→replaceState dance leaves one same-URL history entry — acceptable; document it in a comment. (3) The end-to-end beacon recording can only be verified after a token exists at launch — the testable contract *now* is: helper is importable, callable, flips the URL to `/factory/driven` and restores it. Note this verification debt in the module comment.
- **VALIDATE**: `node --check system/analytics.mjs` — then, after pages exist, in the browser console on `http://localhost:5050`: `const m = await import("/system/analytics.mjs"); m.trackFactoryDriven()` → URL flips and restores, no errors.
- **SATISFIES**: AC #3 (snippet wired, helper callable)

### UPDATE `system/portfolio.css` — two new organisms

- **IMPLEMENT**: Append, under the existing promotion-rule discipline (each used on 2+ pages):
  - `.capability` — the honesty-surface-#3 status chip: display font, 10.5–12px, uppercase, letter-spacing ~0.1em, `border: 1px solid var(--color-border-strong)`, `border-radius: var(--radius-sm)`, `padding: 2px 8px`, `color: var(--color-fg-muted)`, `white-space: nowrap`. Modifier `.capability.live` → `border-color: var(--color-accent); color: var(--color-accent)`. (State is never color-alone — the chip's text differs: "Runs now" / "In build".)
  - `.table-scroll` (`overflow-x: auto`) wrapping `.loop-table` — Approach §03's four-column table: full-width, `border-collapse: collapse`, header row in the `card-kicker` register (display font, uppercase, 12px, `--color-fg-muted`), cells `padding: var(--spacing-sm) var(--spacing-md)`, row rule `border-top: 1px solid var(--color-border)`, body text ~15px `--color-fg-muted` with the first column `--color-fg`. Give the table a `min-width` (~720px) so it scrolls rather than crushes at mobile widths.
- **PATTERN**: `.fig-hint` (`portfolio.css:188–201`) is the exact chip idiom to mirror for `.capability`; `.cs-meta`/`.cs-h` (137–151) for the table's type register; header comment rule at `portfolio.css:1–7`.
- **GOTCHA**: semantic tokens only — the file's one sanctioned raw value is the documented `::backdrop` rgba (line 254–257). Do not add another.
- **VALIDATE**: `grep -nE '#[0-9a-fA-F]{3,8}|rgb\(' system/portfolio.css` → only the pre-existing `::backdrop` line (257) matches.
- **SATISFIES**: AC #1 (token-only styling), AC #4 (indicator organism)

### UPDATE `index.html` — rewrite as the Home 90-second gate

- **IMPLEMENT**: Replace the neutral-base demo content (retired; git history keeps it). Structure — deliberately short (hero + one proof section + one closing strip):
  - Head: `<title>Linards Berzins · UX engineer</title>`; description: "A UX-engineering portfolio you can verify: watch a product brief become a design system, a data-connected prototype, and an engineer-ready handoff pack." Keep `noindex`, favicon, theme-color, the four stylesheets. `data-page="home"`.
  - **Hero** (`page-hero`): eyebrow stamp "Linards Berzins · UX engineer". H1 (draft, review at PR): `Most portfolios ask you to trust them. This one lets you <span class="hl">check</span>.` `hero-sub`: "I'm a UX engineer — I sit between design and front-end and build the systems that connect them. This site is a working factory: a product brief goes in; a design system, a data-connected prototype, and an engineer-ready handoff pack come out, with the agents' build-time work replayed in front of you. Watch it run, inspect the output, judge for yourself." CTA row: `[ Watch the factory ]` → `/factory` (primary, arrow) · `[ How I work ]` → `/approach` (secondary).
  - **Section 01 · Three ways to verify** (`section` + `section-label` + `grid grid-3` of `card`s, each card wrapped in a block link or carrying a `card-foot` link):
    1. kicker "The factory" + `<span class="capability">In build</span>` · h3 "Watch the pipeline run" · muted: "Intake → generated design system → data-connected prototype → handoff pack, performed in front of you. The route is reserved; the stations are landing one by one — the page states exactly what runs today." · foot → `/factory`
    2. kicker "The system" + `<span class="capability live">Runs now</span>` · h3 "Re-skin this site from one line" · muted: "Every component reads only semantic tokens, so swapping one file re-skins everything. The contract behind that claim is public — read it straight from this page's source." · foot → `/approach#case`
    3. kicker "The work" + `<span class="capability">First exhibits in build</span>` · h3 "Inspect the output" · muted: "Data-connected prototypes and an agentic-UI study, built on the same system — with the handoff pack an engineer would actually receive." · foot → `/work`
  - **Closing strip** (`feature-band` or a short `section`): one line for the technical reader — "The repo behind this site commits its generated artifacts instead of hiding them behind a build step — the source is part of the proof." If (and only if) the GitHub repo is public at implement time (`gh repo view linardsb/ux-factory --json visibility`), add a secondary btn linking it; otherwise omit the link, keep the sentence.
- **PATTERN**: current `index.html:22–40` hero idiom; `index.html:55–86` card grid idiom; copy voice per `__Approach_page.md:12–20`.
- **GOTCHA**: (1) The gate must survive a forward — no sentence may depend on prior context (PRD §5). (2) Capability labels must be literally true on the day of the PR — check what's committed before writing "Runs now". (3) One `h1` only; heading levels h1→h2→h3 unskipped. (4) Add the analytics module to the script tail (pattern block above).
- **VALIDATE**: `curl -s http://localhost:5050/ | grep -c 'noindex'` → ≥1; visual: hero + three cards + strip fit ~2 viewports at 1440px.
- **SATISFIES**: AC #1, AC #2 (gate), AC #4 (indicators)

### CREATE `approach.html`

- **IMPLEMENT**: Build every section from `__Approach_page.md` **in order**, using each section's own build note (they name the components): Hero (`page-hero`, eyebrow "Approach · how I work") → §01 seat (`section#seat`, `section-split`) → §02 four layers (`grid grid-3`/2×2 of four `card`s, kicker = discipline, h3 = promise) → §03 loop (`section#loop`, the table → `.table-scroll > table.loop-table`, keep all four columns) → §04 value (`section#value`, plain list) → §05 case study (`section#case`, `section-split` intro, then the five labelled blocks Problem/Shaping/Design & ethics/Build/Outcome as a vertical sequence of `decision-card`s — `decision-card-title` = the label, body = the copy) → §06 sources (`section#sources`, compact `muted` columns) → §07 principles (`section#practice`, h3 + muted pairs) → closing CTA band (`[ See selected work ]` → `/work` · `[ Get in touch ]` → `/contact`). Page meta from the doc's own "Page meta" block; `data-page="approach"`; title "Approach · Linards Berzins".
- **PATTERN**: copy is **verbatim from `__Approach_page.md`** — bold intros, `.hl` spans, and source captions are already marked in the doc; transcribe, don't rewrite. Italic *build notes* are instructions, never page copy.
- **GOTCHA**: (1) §07's bracketed growth-edge placeholder: **cut that bullet** (the doc's own note allows it; inventing an "honest edge" on the user's behalf violates the honesty contract) — record the cut in AMENDMENTS. (2) The `[Your Name]` in the title meta → "Linards Berzins" (see OPEN QUESTIONS). (3) §05's optional commentary step-through and interactive reveal: skip (Out of Scope). (4) `#case` must exist as an id — Home links to `/approach#case`. (5) Sections get `id`s per the build notes (`seat`, `loop`, `value`, `case`, `sources`, `practice`) — deep-linkable. (6) `.cs-h`-style scroll-margin exists only on `.cs-h`; if section headings sit under the sticky header on jump, reuse the `scroll-margin-top: 90px` idiom via the section ids in a one-line portfolio.css addition rather than a page `<style>`.
- **VALIDATE**: `curl -s http://localhost:5050/approach | grep -c 'id="case"'` → 1; every `##` section of `__Approach_page.md` (minus cut bullet + optionals) present — spot-check §03 table renders all 5 rows × 4 columns.
- **SATISFIES**: AC #1

### CREATE `work.html`

- **IMPLEMENT**: `data-page="work"`, title "Work · Linards Berzins". Hero: stamp "Work · exhibits"; H1 draft: `Two exhibits in build, on a system that already <span class="hl">runs</span>.`; sub states the honest frame: the factory performs the method end to end; the study shows where it goes next; both run on the token system live under this very page. Then `grid grid-3` of three cards with capability chips:
  1. kicker "Exhibit 01" + `.capability` "In build" · h3 "The factory, end to end" · muted: "A fictional product brief — clearly labeled fictional — travels intake → design system → prototype → handoff in front of you." · foot → `/factory`
  2. kicker "Exhibit 02" + `.capability` "Planned" · h3 "Agentic UI on a design system" · muted: "An agent composes dashboard views from the same component library through a declarative contract — ask, propose, adjust. Human-in-the-loop by construction." · no link yet (route lands with #13; a dead link would break the honesty bar)
  3. kicker "The substrate" + `.capability live` "Runs now" · h3 "The system behind this site" · muted: "A token-contract design system that re-skins the whole site from one line of CSS, plus the generated machine layer an agent can read." · foot → `/approach#case`
- **PATTERN**: `index.html:55–86` card grid; chip usage identical to Home (consistency is the organism's point).
- **GOTCHA**: scenario names (Verdant/Fieldwork) may be mentioned only with the fictional label attached (honesty surface #1) — simplest is not to name them here at all.
- **VALIDATE**: `curl -s http://localhost:5050/work | grep -c 'capability'` → ≥3
- **SATISFIES**: AC #1, AC #4

### CREATE `contact.html`

- **IMPLEMENT**: `data-page="contact"`, title "Contact · Linards Berzins". Single `page-hero`: stamp "Contact"; H1: `If this is how you'd want someone on your team to work, let's <span class="hl">talk</span>.` (echoes the Approach closing — deliberate); sub: one line, e.g. "Email reaches me fastest; I reply within a day or two."; CTA row: `[ Email me ]` → `mailto:linardsberzins@gmail.com` (primary) · `[ GitHub ]` → `https://github.com/linardsb` (secondary, only if the profile is public — verify). No form (no backend by design; a mailto is the honest mechanism).
- **PATTERN**: `404.html:20–39` — the single-hero minimal page.
- **VALIDATE**: `curl -s http://localhost:5050/contact | grep -c 'mailto:'` → 1
- **SATISFIES**: AC #1

### CREATE `factory.html` — the reserved route, honestly stubbed

- **IMPLEMENT**: `data-page="factory"`, title "The factory · Linards Berzins". Head comment mirroring `derive.html`'s honesty register: this file is the reserved deep-linkable route; ticket #10 replaces its body with the five-station pipeline. Content:
  - Hero: stamp "The factory · route reserved"; H1 draft: `The factory will run <span class="hl">here</span>.`; sub: "This page will perform the pipeline: a short intake steers a generated design system, a data-connected prototype, and an engineer-ready handoff pack — with the agents' build-time work replayed. It's being built in the open, and this page states exactly what runs today."
  - **Section 01 · What runs today** (`lineup` rows or a `grid`): link only artifacts that are **committed at implement time** (check `git ls-files`), each labeled: "The derivation engine, raw" → `/derive.html` ("internal harness — real engine, not the designed surface") · "Scenario data end to end" → `/scenarios/check.html` (same label) · "The token contract" → `/system/tokens.contract.css`. Drop any row whose file isn't committed yet.
  - **Section 02 · What's plan-gated** (plain `lineup` or list, `.capability` chips all "In build"): the five stations — intake wizard · design-system generation with one live re-skin moment · data-connected prototype · handoff pack · replayed agent traces.
  - Closing CTA row: `[ How I work ]` → `/approach` · `[ Get in touch ]` → `/contact`.
- **PATTERN**: `derive.html:12–17` head-comment honesty register; `lineup-item` idiom from `components.css` for the two lists.
- **GOTCHA**: This page is honesty surface #3 at its most exposed — every "runs today" link must actually run when clicked, from this deploy, unauthenticated. Do not use the word "demo" for the harnesses; they are harnesses.
- **VALIDATE**: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5050/factory` → 200; every href in the "runs today" section returns 200 via curl.
- **SATISFIES**: AC #1, AC #4 (the stub *is* the capability indicator)

### UPDATE `404.html`

- **IMPLEMENT**: Re-aim the CTAs at the real IA: primary → `/` "Home", secondary → `/work` "Selected work" (drop the `#system` anchor — it no longer exists). Adjust the sub line ("Everything on this site is one tap from the home page."). Add the analytics module script tag (tail pattern). Leave everything else.
- **VALIDATE**: `grep -c '#system' 404.html` → 0
- **SATISFIES**: AC #1

### UPDATE `CLAUDE.md` — architecture map

- **IMPLEMENT**: Two surgical map edits: (1) replace the `index.html / 404.html` line with one describing the shipped IA — e.g. `index.html + approach/factory/work/contact.html + 404.html   the shipped IA on the neutral shell — Home is the 90-second recruiter gate; factory.html reserves the deep-linkable route as an honest stub (epic #1 ticket #6)`; (2) add under `system/`: `analytics.mjs             CF Web Analytics beacon (token filled at launch) + "factory driven" virtual-route event helper — CF WA has no custom events, so the event is a route-change pageview (ticket #6)`.
- **PATTERN**: the existing map's one-line-per-file register (see the `derive.mjs` and `scenario-data` lines).
- **GOTCHA**: map lines only — do not touch §Ground rules or §Where new code goes; the view-time-module rule already covers `analytics.mjs`.
- **VALIDATE**: `grep -c 'analytics.mjs' CLAUDE.md` → 1
- **SATISFIES**: house convention (map stays true)

### Full-surface validation sweep

- **IMPLEMENT**: run everything under VALIDATION COMMANDS below; fix regressions before commit.
- **VALIDATE**: all commands pass.
- **SATISFIES**: AC #1–#4, completion checklist

---

## TESTING STRATEGY

No test suite, no linter, no type-check exists in this repo — **do not invent one** (CLAUDE.md §Ground rules: "Done" = run the surface you touched). Testing is executable checks + a real browser pass.

### Unit-level checks

- `node --check` on both touched JS modules (syntax gate; `--check` respects the `.mjs` module goal).
- `trackFactoryDriven()` exercised from the browser console: URL flips to `/factory/driven` and restores within ~50ms; calling twice doesn't double-fire.

### Integration checks

- Serve the repo root, request all six routes (five pages + a 404 path), assert 200/404 and `noindex` present per page.
- Chrome injection: each page shows header + footer, correct nav item carries `.active` (keyed by `data-page`), CTA renders, mobile toggle opens/closes at ≤640px.

### Edge Cases

- **No token**: analytics module imports cleanly, injects nothing, helper still callable (the shipped state until launch).
- **localhost guard**: even with a token pasted in, no beacon script tag appears on `127.0.0.1`.
- **`/factory` deep link forwarded cold**: page makes sense with zero prior context and every "runs today" link resolves.
- **320px viewport**: no horizontal scroll on any page; the §03 loop table scrolls inside `.table-scroll` instead of overflowing the body.
- **Keyboard**: skip-link appears on first Tab (portfolio.js injects it); all nav/CTA/cards reachable; focus ring visible (`:focus-visible` global).
- **prefers-reduced-motion**: no new transitions violate the existing global reduce rule.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
node --check system/analytics.mjs && node --check system/client.neutral.config.js && echo "✓ syntax"
# token discipline: only the documented ::backdrop raw value may match
grep -nE '#[0-9a-fA-F]{3,8}|rgb\(' system/portfolio.css
# no literals in page-level <style> blocks (should print nothing)
grep -nE '<style' index.html approach.html work.html contact.html factory.html 404.html
```

### Level 2: Unit

```bash
# helper contract, headless (module parses + export exists)
node -e "import('./system/analytics.mjs').catch(()=>{})" 2>/dev/null; node --check system/analytics.mjs && grep -c 'export function trackFactoryDriven' system/analytics.mjs
```

### Level 3: Integration

```bash
npx serve . -l 5050 &   # kill afterwards
sleep 2
for p in / /approach /work /contact /factory; do echo -n "$p → "; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5050$p"; done   # all 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5050/no-such-page   # 404
for f in index.html approach.html work.html contact.html factory.html 404.html; do grep -l 'name="robots" content="noindex"' $f; done   # all six listed
grep -c 'X-Robots-Tag: noindex' _headers   # 1 — unchanged
git diff --stat _headers   # empty — untouched
```

### Level 4: Manual Validation

- Open `http://localhost:5050/` in a browser: header/footer injected, "Home" active in nav, hero + three proof cards + closing strip; read it against a 90-second clock.
- Click through all nav items + CTA; verify active states per page; open the mobile menu at ≤640px; Tab from the top — skip-link appears first.
- On any page's console: `const a = await import("/system/analytics.mjs"); a.trackFactoryDriven()` → watch the URL flip and restore; confirm **no** `cloudflareinsights` script tag exists (localhost guard + empty token).
- `/approach`: compare section-by-section against `__Approach_page.md`; §03 table complete; `#case` anchor lands below the sticky header.
- `/factory`: click every "runs today" link — each must actually work.

### Level 5: Additional Validation (Optional)

- `agent-browser` screenshots of all five pages at 320 / 768 / 1440 px — check for overflow, crushed grids, orphaned `.hl` line-wraps (`white-space: nowrap` on long highlighted phrases can force overflow at 320px — shorten the highlighted span if so).

---

## ACCEPTANCE CRITERIA

From the ticket, verbatim mapping:

- [ ] **AC #1** — All five IA pages render under the neutral pack; chrome injected via the `system/site.js` config pattern; token-only styling (validated by the grep lint + visual pass).
- [ ] **AC #2** — Home does the recruiter-gate job: outcome headline, three proof shortcuts, skimmable in ~90s, survives a forward with zero context (PRD §5).
- [ ] **AC #3** — Analytics snippet wired (beacon inject path in `analytics.mjs`, token slot documented); `trackFactoryDriven()` callable; `noindex` kept in `_headers` (file untouched) and on every page.
- [ ] **AC #4** — Every capability indicator states exactly what runs vs. what's plan-gated; every "runs now" claim is clickable and true on the day of the PR.

Plan-quality criteria:

- [ ] No new dependencies, no build step, no framework — shipped pages stay vanilla.
- [ ] No regressions: `derive.html`, `scenarios/check.html`, portal, worker untouched and still working.
- [ ] `CLAUDE.md` map reflects the new surface.
- [ ] Copy follows the voice contract (`__Approach_page.md:12–20`); nothing announces teaching.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully (Levels 1–4)
- [ ] Manual browser pass on all five pages + 404
- [ ] Acceptance criteria all met
- [ ] `serve` process killed; working tree contains only intended files
- [ ] Commit message: `site shell: five-page IA on the neutral shell — Home gate, Approach, Factory stub, analytics (epic #1, ticket #6)` · PR body carries `Closes #6`

---

## OPEN QUESTIONS / ASSUMPTIONS

**Flagged for the user before/at plan review — none block starting, all have safe defaults:**

1. **CF Web Analytics has no custom events** (confirmed in the FAQ) — the architecture's `"factory driven"` custom event is implemented as a **virtual-route pageview** (`/factory/driven`), filtered by path in the dashboard. This implements the decision's *intent* (diagnose the PRD §7 WRONG condition) within the platform's real capability. If path-filtering feels too indirect, the alternative is Cloudflare Zaraz `zaraz.track()` — but Zaraz needs the site proxied through a CF zone (custom domain), which is a launch-time infrastructure decision. **Assumed: virtual pageview; note as an amendment on the architecture doc when this lands.**
2. **Identity strings** — plan assumes public name **"Linards Berzins"** (no diacritics, matching git config), email `linardsberzins@gmail.com`, GitHub `linardsb`, chrome brand stays neutral (`brand.name: "ux factory"`, neutral logos) with the person carried in page content + footer copyright. Confirm the preferred public spelling (e.g. "Linards Bērziņš") before the PR ships.
3. **Approach §07 growth-edge placeholder** — the bullet is **cut** (the doc's own notes permit it; only the user can fill it honestly). Restore anytime by editing `approach.html`.
4. **The neutral-base demo content** (current `index.html`) is **retired**, not relocated — git history keeps it; its system-check story survives in Approach §05 and Home's proof shortcut #2. If a standing "neutral base" demo page is wanted later, it's a five-minute revival from history.
5. **Repo/GitHub links on shipped pages** assume the repo is public — verify with `gh repo view linardsb/ux-factory --json visibility` at implement time; omit links (keep sentences) if private.
6. **Draft copy** (Home hero, Work, Contact, Factory stub) is written to the voice contract but is the user's public voice — review at PR, not after launch.

## NOTES (open canvas)

- **Why extensionless hrefs**: CF Pages serves `approach.html` at `/approach` natively, and `npx serve`'s default `cleanUrls` matches locally. This also makes `/factory` a stable deep link whose *implementation* (#10) can change without the URL moving. The one loss: `file://` browsing breaks — acceptable; the documented preview is `npx serve .`.
- **Why the CTA slot carries Contact** instead of a fifth nav item: mirrors the existing `nav-cta` idiom (`site.js:56`), keeps the nav row at four links + one styled action at 640px+, and gives the gate audience the single most important action (get in touch) persistent emphasis on every page.
- **Why the analytics token lives in the module, not `client.neutral.config.js`**: the config is the *brand/chrome* seam that per-company builds clone; the beacon is *site infrastructure* that must not fork per pack. One constant, one file, filled once at launch. The token is public by design (it's in every page's HTML on any CF WA site) — committing it is safe and consistent with "deploy = commit the artifacts".
- **Rejected: Cloudflare Pages' dashboard auto-injection of the beacon** — it would work with zero code, but the wiring would be invisible in the repo, violating "the repo itself is inspectable proof". Manual module keeps the mechanism (and its honest no-custom-events comment) readable in source.
- **Rejected: building Work as the five-card `work-grid`** (`portfolio.css:81–102`) — that organism was authored for the old five-item personal portfolio; today there are exactly three truthful cards. `grid grid-3` is honest; adopt `work-grid` when the exhibit count earns it.
- **Sequencing note**: nothing here blocks or is blocked by the other Wave-1/2 tickets in flight (#3, #4, #5, #7 outputs exist in the tree). The only cross-ticket touchpoint is the Factory stub's "runs today" links — resolved at implement time by linking only committed artifacts.
- **90-second budget arithmetic**: hero (~15s) + three cards (~30s) + closing strip (~10s) leaves ~35s of scroll/decide slack. If Home grows past this during implementation, cut content, not type size.

## AMENDMENTS

<!-- Append-only after first approval/execution; newest at the bottom. Each entry: ISO date — what changed and why. -->
