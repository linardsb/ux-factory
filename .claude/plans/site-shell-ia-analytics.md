# Feature: Site shell — Home 90-second gate, IA chrome, Approach/Work/Contact, Factory stub, analytics wiring

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

> **Plan status:** all user-owned decisions were resolved interactively with the user on 2026-07-17 (see DECISIONS — RESOLVED). External facts (CF Pages routing, CF WA custom-event support, repo visibility) are verified, not assumed. Copy and code are provided verbatim in the DECKS section — transcribe, don't invent.

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

- **Five pages on the existing shell pattern**: each page is a vanilla HTML file at the repo root loading the same four-stylesheet stack (`tokens.contract.css → tokens.neutral.css → components.css → portfolio.css`) and the same script tail (`client.neutral.config.js → site.js → portfolio.js` + the new analytics module), chrome injected from `window.CLIENT_CONFIG`, active nav state via `<body data-page="…">`. No framework, no build step — the hard constraint holds.
- **Home = the gate**: outcome headline + three proof shortcuts (Factory / the system / Work), each carrying an exact capability indicator ("Runs now" / "In build" / "Planned") per honesty surface #3. Short enough to scan in 90 seconds; no web fonts, no new assets.
- **Approach**: built section-by-section from `__Approach_page.md`, whose build notes already name the exact components per section. The optional §05 interactive commentary/reveal is deferred; the §07 growth-edge bullet is cut (user decision).
- **Factory**: an honest stub reserving the `/factory` route — states exactly what will run there vs. what runs today (linking only committed, actually-working harnesses), never pretending the pipeline is live.
- **Analytics**: `system/analytics.mjs` (hand-written ES module beside `site.js`, per CLAUDE.md's view-time rule) injects the CF Web Analytics beacon when a token is configured, and exports `trackFactoryDriven()`. **Verified platform constraint: CF Web Analytics does not support custom events** ([FAQ](https://developers.cloudflare.com/web-analytics/faq/): "Not yet") — the beacon records pageviews only, including SPA route changes ("Every route change that occurs in the single-page app will send the measurement… to the beacon endpoint"). The "factory driven" event is therefore a **virtual-route pageview** (`/factory/driven`), filterable by path in the CF dashboard. **User-confirmed decision (2026-07-17).**
- **`_headers` untouched**: `noindex` stays (X-Robots-Tag + per-page `<meta name="robots" content="noindex">`); the launch open question stays open.

## DECISIONS — RESOLVED (with the user, 2026-07-17)

These were the plan's open questions; all four are now settled. None remain open.

1. **Public name**: **"Linards Berzins"** (no diacritics) — matches the GitHub profile (`gh api users/linardsb` → name "Linards Berzins") and email. Used in page titles, hero stamp, footer copyright.
2. **Chrome identity**: **neutral "ux factory"** stays as `brand.name` with the neutral logos; the person appears in page content (Home hero, Contact) and the footer tagline/copyright. Per-company builds keep cloning the config cleanly.
3. **Approach §07 growth-edge placeholder**: **cut the bullet** (the doc's own notes permit it). §07 ships with four principles; restore any time by editing `approach.html`.
4. **"Factory driven" event mechanism**: **virtual-route pageview** via the History API (deck below). Alternatives rejected: Zaraz `zaraz.track()` needs the site proxied through a CF zone (custom domain — launch-time infra); deferring entirely would leave AC #3 unmet.

**Verified external facts (this session):**

- Repo `linardsb/ux-factory` is **PUBLIC** → GitHub links on Home/Contact/footer ship unconditionally.
- CF Pages route matching, quoted: *"Pages will also redirect HTML pages to their extension-less counterparts: for instance, `/contact.html` will be redirected to `/contact`"* → extensionless nav hrefs are correct for prod; `npx serve` (serve-handler `cleanUrls` default) matches locally.
- CF WA custom events: not supported ("Not yet, but we may add support for this in the future"); SPA route-change tracking is default beacon behavior (no opt-in flag needed; snippet carries only `{"token": …}`).
- Committed state **at planning time**: `derive.html` and `scenarios/check.html` are tracked, but **`system/derive.mjs` is NOT yet committed** (ticket #3's working tree) — so `/derive.html` would fail its import on a clean deploy today. The Factory stub's "runs today" list must re-verify the **full dependency chain** at implement time (task below).

## Out of Scope / Non-Goals

- **Not the Factory page itself** — five stations, intake wizard, scenario toggle, live re-skin are #10 (depends on #3/#4/#5/#8). This ticket only reserves the deep-linkable route with an honest stub.
- **Not the Approach §05 optional interactive commentary / guess-then-reveal** — the build note marks it optional; the voice contract caps interactivity at one reveal. Defer to a follow-up polish pass.
- **Not the Work exhibits** — data-connected prototypes (#8) and the agentic-UI study (#13) are their own tickets; Work lists them with exact plan-gated labels only.
- **Not obtaining the CF Web Analytics token** — created in the Cloudflare dashboard at launch; the module ships with an empty-token no-op (helper still callable — that's the AC).
- **Not changing** `system/components.css`, `system/tokens.*`, `system/site.js`, `system/proto.css`, `worker/`, `scenarios/`, `agent-layer/`, or the portal. Chrome changes go through the config file, never `site.js` (its header says so).
- **Not touching `_headers`** — AC explicitly keeps `noindex`; the cache rules already cover `/system/*` and `/*.html`.
- **Not removing `derive.html` or `scenarios/check.html`** — they stay internal harnesses; the Factory stub links them *labeled as raw harnesses*.

## Feature Metadata

**Feature Type**: New Capability (content-heavy)
**Estimated Complexity**: Medium — mechanics are low-risk repetition of an existing shell pattern; copy is pre-written in this plan's decks
**Primary Systems Affected**: root HTML pages (`index.html`, `404.html`, four new), `system/client.neutral.config.js`, `system/portfolio.css`, new `system/analytics.mjs`, `CLAUDE.md` architecture map
**Dependencies**: none new. Zero runtime deps (hard constraint). Cloudflare Web Analytics is a `<script>` injected at view time only when a token is set.

## Related Work

**Implements**: [linardsb/ux-factory#6](https://github.com/linardsb/ux-factory/issues/6) — PR closes with `Closes #6`
**Epic**: [#1](https://github.com/linardsb/ux-factory/issues/1) + `docs/epics/ai-first-ux-factory.architecture.md` (§Other eng-lead calls — IA · §Stack — CF Web Analytics + one custom event "factory driven" · §Boundaries — honesty surfaces). These are **inherited decisions, not re-decided here** — with one platform-reality adaptation (no custom events in CF WA → virtual-route pageview), decided with the user and recorded above; note it as an amendment on the architecture doc when this lands.

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/scenario-packages-worker-mock-api.md` — Why: shipped-page shell conventions (`scenarios/check.html`), the `LOCAL_HOSTS` localhost-guard precedent in `system/scenario-data.mjs` that `analytics.mjs` mirrors, and the honesty-surface-#3 "state which source answered" register the capability indicators reuse.
- `.claude/plans/live-derivation-engine.md` — Why: `derive.html` is the raw harness the Factory stub links to as "what runs today"; its head comment already declares "The designed surface for this engine is the Factory page (ticket #10)".

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- (none yet — #10 Factory page will replace `factory.html`'s stub content and call `trackFactoryDriven()` for real; its plan should back-reference this file)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `__Approach_page.md` (whole file, 141 lines) — Why: **the finalized Approach copy plus per-section build notes naming exact components**; the voice contract at its top (lines 12–20) governs every line of copy on every page this ticket writes, not just Approach. The end notes (lines 137–141) flag the §07 placeholder (now decided: cut) and the "teaching layer is distributed, never a section" rule.
- `index.html` (whole file, 116 lines) — Why: the shell pattern every page copies — head order (lines 1–17: charset, viewport, title, description, `noindex`, favicon, theme-color, four stylesheets), `data-page` on body (line 19), section/hero markup idiom (lines 22–40), card-grid idiom (lines 55–86), script tail (lines 112–114). This file is REWRITTEN as the Home gate; its current "neutral base" demo content is retired (git history keeps it).
- `404.html` (whole file, 45 lines) — Why: the minimal-page variant of the shell; its hero CTAs (lines 33–36) point at the retired `#system` anchor and must be re-aimed at the new IA.
- `system/client.neutral.config.js` (whole file, 55 lines) — Why: the ONLY file that defines nav/footer/CTA — chrome changes happen here, never in `site.js`. Full replacement provided in Deck C.
- `system/site.js` (lines 8–12, 26–35, 52–57) — Why: read-only contract — how `data-page` matches `nav[].key` for the active state, `data-header` variants (all pages use the default "stone"), and how `cta` renders. Do not modify.
- `system/portfolio.css` (lines 1–7, 44–50, 66–79, 137–151, 188–201, 283–300) — Why: the promotion rule ("reused across 2+ pages is promoted HERE"), `.hl` accent underline, `.card-kicker`/`.card-foot` idiom, `.cs-h` scroll-margin idiom, `.fig-hint` chip idiom (the `.capability` model), and the mobile-compaction block new styles must respect. **Line 6: "Only semantic tokens — no raw values except where noted."**
- `system/scenario-data.mjs` (lines 1–15) — Why: the house pattern for a hand-written view-time ES module beside `site.js`: header citing epic/ticket + architecture §, `LOCAL_HOSTS` guard, honesty-contract comment explaining a load-bearing choice. `analytics.mjs` (Deck D) mirrors all three.
- `system/components.css` — Why: the available organism vocabulary (verified present): `page-hero`, `hero-eyebrow`/`pill`/`stamp`/`meta`, `hero-sub`, `hero-cta-row`, `section`, `section-label` (`.num`/`.line`), `section-split`, `headline`, `grid grid-2/-3/-4`, `card`/`card-body`/`card-kicker`/`card-link`, `feature-band`/`feature-grid`/`feature-item`/`feature-headline`, `lineup`/`lineup-item`/`lineup-n`/`lineup-title`, `decision-card`/`decision-card-title`/`decision-card-fields`/`dc-field`, `btn btn-primary/btn-secondary/btn-arrow`, `max-prose`, `muted`, `eyebrow`, `divider`, `closing`, `on-dark`. Build pages from these; a literal in page-level `<style>` is a bug.
- `derive.html` (lines 1–22) — Why: precedent for an honest internal-harness label in a head comment, and the target of the Factory stub's "what runs today" link.
- `_headers` (whole file, 18 lines) — Why: verify-only — `X-Robots-Tag: noindex` (line 6) and the `/*.html` cache rule already cover new pages. No edit.
- `docs/epics/ai-first-ux-factory.prd.md` (§5 Target User, §7 Success Metrics, §8 Non-goals) — Why: the gate's job definition ("skimmable… survives a forward", "recruiters get a gate, not the product") and why the analytics event exists (diagnose the WRONG condition).
- `CLAUDE.md` (§Architecture map, §Ground rules) — Why: the map lines this ticket updates; the honesty contract and header-comment conventions new files follow.
- `.claude/references/frontend-component-best-practices.md` (§Accessibility, §Visual & Interaction Craft) — Why: the applicable bars — one `h1` per page, no skipped heading levels, keyboard-reachable interactive elements, verify at 320/768/1024/1440, realistic copy. (Its React sections don't apply — this repo is vanilla.)

### New Files to Create

- `approach.html` — the Approach page, built section-by-section from `__Approach_page.md`
- `work.html` — Work index: exhibits with exact capability labels (Deck F)
- `contact.html` — Contact page (Deck G)
- `factory.html` — the reserved deep-linkable Factory route: honest stub (Deck H)
- `system/analytics.mjs` — CF Web Analytics beacon inject + `trackFactoryDriven()` (Deck D, complete source)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [CF Web Analytics FAQ](https://developers.cloudflare.com/web-analytics/faq/) — Why: **the load-bearing constraint** — custom events "Not yet"; SPA route changes ARE recorded. This is why the helper fires a virtual-route pageview.
- [CF Web Analytics — get started](https://developers.cloudflare.com/web-analytics/get-started/) — Why: the manual-snippet install path (site token from "Manage site"; snippet = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "…"}'></script>`).
- [CF Pages serving behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/) — Why: verified — extensionless URLs are first-class ("`/contact.html` will be redirected to `/contact`").

### Patterns to Follow

**Page shell (every new page — Deck A is the canonical skeleton).**

**View-time ES module header (from `system/scenario-data.mjs:1–13`):** hand-written-canon declaration, epic/ticket citation, architecture § reference, and a comment explaining the honesty-load-bearing choice in place — Deck D follows it.

**Error/absence handling:** no error taxonomy — the analytics module silently no-ops without a token (an absent optional capability is not an error); `console.debug` at most, mirroring `site.js`'s single `console.warn` register.

**Capability indicator language (honesty surface #3):** labels state *exactly* what runs — "Runs now" only for things a reader can execute or inspect this minute from this deploy; "In build" for work underway; "Planned" for not-started. Never "coming soon" vagueness.

**Copy voice (from `__Approach_page.md:12–20`):** first-person testimony, phenomenon first / framework name last, no badges or callouts announcing teaching, subject of every sentence is the work.

---

## DECKS — EXACT CODE & COPY (transcribe from here)

### Deck A — canonical page skeleton

```html
<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{TITLE}}</title>
  <meta name="description" content="{{DESCRIPTION}}" />
  <meta name="robots" content="noindex" />

  <link rel="icon" type="image/svg+xml" href="/assets/logo-neutral.svg" />
  <meta name="theme-color" content="#ffffff" />

  <link rel="stylesheet" href="/system/tokens.contract.css" />
  <link rel="stylesheet" href="/system/tokens.neutral.css" />
  <link rel="stylesheet" href="/system/components.css" />
  <link rel="stylesheet" href="/system/portfolio.css" />
</head>
<body data-page="{{PAGE_KEY}}">

  <main>
    …
  </main>

  <script src="/system/client.neutral.config.js"></script>
  <script src="/system/site.js"></script>
  <script src="/system/portfolio.js"></script>
  <script type="module" src="/system/analytics.mjs"></script>
</body>
</html>
```

Page keys and titles: `home` / `Linards Berzins · UX engineer` · `approach` / `Approach · Linards Berzins` · `factory` / `The factory · Linards Berzins` · `work` / `Work · Linards Berzins` · `contact` / `Contact · Linards Berzins` · 404 keeps `data-page=""` and its existing title.

### Deck B — `system/portfolio.css` additions (append at end of file)

```css
/* ---------- Capability indicators (honesty surface #3 — Home, Work, Factory) ----------
   The TEXT states the status ("Runs now" / "In build" / "Planned"); .live only
   re-colors — state is never carried by color alone. Chip idiom mirrors .fig-hint. */

.capability {
  display: inline-block;
  font-family: var(--font-display);
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-fg-muted);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  margin-left: 6px;
  white-space: nowrap;
  vertical-align: middle;
}
.capability.live {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

/* ---------- Loop table (Approach §03) ---------- */

.table-scroll { overflow-x: auto; }
.loop-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  margin-top: var(--spacing-lg);
}
.loop-table th {
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-fg-muted);
  text-align: left;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border-strong);
}
.loop-table td {
  font-size: 15px;
  line-height: 1.5;
  color: var(--color-fg-muted);
  padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--color-border);
  vertical-align: top;
}
.loop-table td:first-child { color: var(--color-fg); }

/* Deep-linked Approach sections land below the sticky header (same idiom as .cs-h) */
#seat, #loop, #value, #case, #sources, #practice { scroll-margin-top: 90px; }
```

### Deck C — `system/client.neutral.config.js` (full replacement)

```js
// Neutral chrome config — the shipped site's IA on the neutral shell.
// site.js injects the header, mobile nav and footer from window.CLIENT_CONFIG; this is
// the neutral pack's half of that. A company build clones this to
// client.<company>.config.js (its brand strings, links, logo) — system/site.js never
// changes. Load BEFORE system/site.js.
//
// The chrome brand stays neutral ("ux factory", neutral logos); the person lives in
// page content and the footer (identity call, ticket #6 plan). Nav pages are
// extensionless — CF Pages and `npx serve` both resolve /approach → approach.html.
// Contact rides the CTA slot rather than a fifth nav item (nav-cta idiom).

window.CLIENT_CONFIG = {
  brand: {
    name: "ux factory",
    homeHref: "/",
    logo: {
      default: "/assets/logo-neutral.svg",         // light header
      onDark:  "/assets/logo-neutral-on-dark.svg",  // dark footer
    },
  },

  nav: [
    { label: "Home",     href: "/",         key: "home" },
    { label: "Approach", href: "/approach", key: "approach" },
    { label: "Factory",  href: "/factory",  key: "factory" },
    { label: "Work",     href: "/work",     key: "work" },
  ],

  cta: { label: "Get in touch", href: "/contact" },

  footer: {
    tagline:
      "A working factory for UX engineering: a token-contract design system, generated " +
      "artifacts committed in the open, agents at build time only. Built by Linards Berzins.",

    columns: [
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
      {
        title: "The system",
        items: [
          { label: "Token contract",  href: "/system/tokens.contract.css" },
          { label: "Neutral pack",    href: "/system/tokens.neutral.css" },
          { label: "Components",      href: "/system/components.css" },
          { label: "Source (GitHub)", href: "https://github.com/linardsb/ux-factory" },
        ],
      },
    ],

    copyright: "© 2026 Linards Berzins · ux factory",
  },
};
```

### Deck D — `system/analytics.mjs` (full source)

```js
// system/analytics.mjs — hand-written canon (this repo; not generated).
// Cloudflare Web Analytics (cookieless) + the one custom-event helper: "factory driven"
// (epic #1, ticket #6; architecture §Stack; PRD §7 — diagnoses the WRONG condition).
//
// Platform constraint, load-bearing: CF Web Analytics has no custom events (FAQ:
// "Not yet") — the beacon records pageviews only, including SPA route changes via its
// History API hooks. So the "factory driven" event is a VIRTUAL-ROUTE pageview: the
// helper briefly pushes /factory/driven, the beacon records the route change, and the
// URL is restored. In the dashboard, the event = pageviews filtered to that path.
// (Decided with the PRD holder 2026-07-17; alternative — Zaraz zaraz.track() — needs
// the site proxied through a CF zone, a launch-time infra call.)
//
// BEACON_TOKEN is the public site token from the CF dashboard (Web Analytics → Manage
// site). It is public by design — it sits in page HTML on every CF WA site — so
// committing it is safe. Empty token = beacon not injected; the helper stays callable.
// End-to-end recording is verifiable only once the token exists at launch; the
// contract testable today: imports cleanly, flips the URL, restores it, fires once.

const BEACON_TOKEN = ""; // filled at launch
const VIRTUAL_EVENT_PATH = "/factory/driven";
const RESTORE_DELAY_MS = 50; // lets the beacon's pushState hook read the virtual path
const LOCAL_HOSTS = ["localhost", "127.0.0.1"]; // never measure local dev (mirrors scenario-data.mjs)

if (BEACON_TOKEN && !LOCAL_HOSTS.includes(location.hostname)) {
  const s = document.createElement("script");
  s.defer = true;
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.dataset.cfBeacon = JSON.stringify({ token: BEACON_TOKEN });
  document.head.appendChild(s);
}

let fired = false;

// The one custom event. Fired for real by the Factory page (ticket #10) when a reader
// drives the pipeline; callable anywhere via module import.
export function trackFactoryDriven() {
  if (fired) return;
  fired = true;
  const real = location.pathname + location.search + location.hash;
  history.pushState(history.state, "", VIRTUAL_EVENT_PATH);
  // pushState + delayed restore leaves one same-URL history entry — accepted; leaving
  // the virtual URL in place would break refresh and bookmarking instead.
  setTimeout(() => history.replaceState(history.state, "", real), RESTORE_DELAY_MS);
}
```

Note: `s.dataset.cfBeacon = …` renders as the `data-cf-beacon` attribute — exactly the documented snippet shape.

### Deck E — Home (`index.html` replacement content)

Head: title `Linards Berzins · UX engineer`; description `A UX-engineering portfolio you can verify: watch a product brief become a design system, a data-connected prototype, and an engineer-ready handoff pack.`; `data-page="home"`.

**Hero** (`page-hero` → `hero-eyebrow` [`pill` · `stamp` · `meta`], `h1.text-balance`, `hero-sub`, `hero-cta-row`):

- Stamp: `Linards Berzins · UX engineer`
- H1: `Most portfolios ask you to trust them. This one lets you <span class="hl">check</span>.`
- Sub: `I'm a UX engineer — I sit between design and front-end and build the systems that connect them. This site is a working factory: a product brief goes in; a design system, a data-connected prototype, and an engineer-ready handoff pack come out, with the agents' build-time work replayed in front of you. Watch it run, inspect the output, judge for yourself.`
- CTAs: `[ Watch the factory ]` → `/factory` (btn-primary btn-arrow) · `[ How I work ]` → `/approach` (btn-secondary)

**Section 01 · Three ways to verify** (`section` + `section-label` `01 / Three ways to verify` + `grid grid-3` of `card`s; each card: `card-kicker` with trailing `.capability` chip, `h3.h3.mb-md`, `p.muted`, `card-foot` link):

1. Kicker `The factory <span class="capability">In build</span>` · h3 `Watch the pipeline run` · muted `Intake → generated design system → data-connected prototype → handoff pack, performed in front of you. The route is reserved and the stations are landing one by one; the page states exactly what runs today.` · foot `<a href="/factory">See the factory →</a>`
2. Kicker `The system <span class="capability live">Runs now</span>` · h3 `Re-skin this site from one line` · muted `Every component reads only semantic tokens, so swapping one file re-skins the whole site. The contract behind that claim is public — read it straight from this page's source.` · foot `<a href="/approach#case">How it's built →</a>`
3. Kicker `The work <span class="capability">First exhibits in build</span>` · h3 `Inspect the output` · muted `Data-connected prototypes and an agentic-UI study, built on the same system — with the handoff pack an engineer would actually receive.` · foot `<a href="/work">See the work →</a>`

**Section 02 · For the technical reader** (`feature-band`, `section-label` `02 / For the technical reader`):

- `feature-headline`: `The source is part of the <span class="hl">proof</span>.`
- One `max-prose` paragraph: `This repo commits its generated artifacts instead of hiding them behind a build step — the token contract, the generators, and every generated output are inspectable as-is.`
- `.on-dark` btn-secondary btn-arrow → `https://github.com/linardsb/ux-factory`, label `Read the repo`

Nothing else — the 90-second budget: hero (~15s) + three cards (~30s) + band (~10s) leaves scroll/decide slack. If it grows, cut content, not type size.

### Deck F — Work (`work.html`)

Head: title `Work · Linards Berzins`; description `Selected work: the factory pipeline, an agentic-UI study, and the token-contract system this site runs on.`; `data-page="work"`.

- Hero stamp `Work · exhibits`; H1 `Two exhibits in build, on a system that already <span class="hl">runs</span>.`; sub `The factory performs my method end to end; the agentic-UI study shows where it goes next. Both run on the same token-contract design system that renders this page — that part you can verify right now.`
- `section` + `section-label` `01 / Exhibits` + `grid grid-3`:
  1. Kicker `Exhibit 01 <span class="capability">In build</span>` · h3 `The factory, end to end` · muted `A fictional product brief — clearly labeled as fictional — travels intake → design system → prototype → handoff pack in front of you, with the agents' build-time work replayed.` · foot `<a href="/factory">The route is reserved →</a>`
  2. Kicker `Exhibit 02 <span class="capability">Planned</span>` · h3 `Agentic UI on a design system` · muted `An agent composes dashboard views from the same component library through a declarative contract — ask, propose, adjust. Human-in-the-loop by construction: the vocabulary, the slot bounds, and the review controls are the designed surface.` · **no link** (route lands with #13; a dead link breaks the honesty bar)
  3. Kicker `The substrate <span class="capability live">Runs now</span>` · h3 `The system behind this site` · muted `A token-contract design system that re-skins the whole site from one line of CSS, plus a generated machine layer an agent can read. Every exhibit is built on it.` · foot `<a href="/approach#case">The case study →</a>`

Do not name Verdant/Fieldwork here — honesty surface #1 requires the fictional label wherever they appear; simplest is not naming them until the Factory page does it properly.

### Deck G — Contact (`contact.html`)

Head: title `Contact · Linards Berzins`; description `Get in touch with Linards Berzins, UX engineer.`; `data-page="contact"`.

Single `page-hero` (pattern: `404.html:20–39`):

- Stamp `Contact`
- H1 `If this is how you'd want someone on your team to work, let's <span class="hl">talk</span>.` (deliberately echoes the Approach closing CTA)
- Sub `Email reaches me fastest — I reply within a day or two.`
- CTAs: `[ Email me ]` → `mailto:linardsberzins@gmail.com` (btn-primary btn-arrow) · `[ GitHub ]` → `https://github.com/linardsb` (btn-secondary)

No form — there is no backend by design; a mailto is the honest mechanism.

### Deck H — Factory stub (`factory.html`)

Head: title `The factory · Linards Berzins`; description `The factory route: a product brief will travel intake → design system → prototype → handoff pack here, performed in the open. This page states exactly what runs today.`; `data-page="factory"`. Head comment (mirroring `derive.html:12–17`): `<!-- Reserved deep-linkable route (epic #1, ticket #6). Ticket #10 replaces this body with the five-station pipeline. Everything listed under "runs today" must actually run from this deploy. -->`

- Hero stamp `The factory · route reserved`; H1 `The factory will run <span class="hl">here</span>.`; sub `This page will perform the pipeline: a short intake steers a generated design system, a data-connected prototype, and an engineer-ready handoff pack — with the agents' build-time work replayed. It's being built in the open, and everything below states exactly what runs today.`
- **Section 01 · What runs today** (`section-label` `01 / What runs today`, `lineup` of linked `lineup-item`s — idiom from `components.css`; each row: `lineup-n`, `lineup-title` as the link, one `muted` line):
  1. `The derivation engine, raw` → `/derive.html` — `Internal harness, not the designed surface: the real view-time engine turning intake answers into token values, with WCAG checks shown passing.` **Include only if the full chain is committed** (see task GOTCHA).
  2. `Scenario data, end to end` → `/scenarios/check.html` — `Internal check page: the fixture-backed mock API answering, with the static-fixture fallback and its source stated.`
  3. `The token contract` → `/system/tokens.contract.css` — `Every semantic token components may use — the file a company pack re-skins.`
- **Section 02 · What's plan-gated** (`section-label` `02 / What's plan-gated`, plain `lineup`, each row's title followed by `<span class="capability">In build</span>`):
  1. `Intake` — `a short guided wizard; your answers steer the output within designed bounds.`
  2. `Design-system generation` — `a staged worked example, with one genuinely live re-skin moment.`
  3. `Data-connected prototype` — `components rendering from the mock API.`
  4. `Handoff pack` — `component specs, typed props and data contracts, downloadable.`
  5. `Replayed agent runs` — `real build-time traces, labeled and curated for length.`
- Closing `hero-cta-row`: `[ How I work ]` → `/approach` (btn-secondary) · `[ Get in touch ]` → `/contact` (btn-primary)

### Deck I — 404 updates (`404.html`)

- Sub becomes: `The address may have changed as the site did. Everything here is one tap from home.`
- CTAs: `[ Home ]` → `/` (btn-primary btn-arrow) · `[ Selected work ]` → `/work` (btn-secondary)
- Add the analytics module line to the script tail (Deck A). Everything else stays.

### Deck J — `CLAUDE.md` map edits

Replace the line:

```
index.html / 404.html       the neutral site template shell (loads contract + neutral pack + components)
```

with:

```
index.html + approach/factory/work/contact.html + 404.html   the shipped five-page IA on the neutral shell — Home is the 90-second recruiter gate; factory.html reserves the deep-linkable route as an honest stub (epic #1 ticket #6)
```

And add under the `system/` block (after the `site.js` line):

```
  analytics.mjs             CF Web Analytics beacon (public token, filled at launch) + "factory driven" event helper — CF WA has no custom events, so the event is a virtual-route pageview at /factory/driven (ticket #6)
```

---

## IMPLEMENTATION PLAN

### Phase 1: Chrome + measurement foundation

Config, analytics module, CSS organisms — everything pages consume. (Decks B, C, D.)

### Phase 2: Pages

**Depends on:** Phase 1 (nav keys, capability chip, loop table). The five page tasks are **independent of each other** once Phase 1 lands — order below is priority order (Home first), not a dependency chain.

### Phase 3: Integration + docs

CLAUDE.md map (Deck J) + the full validation sweep.

---

## STEP-BY-STEP TASKS

### UPDATE `system/client.neutral.config.js`

- **IMPLEMENT**: Full replacement with Deck C, verbatim.
- **PATTERN**: existing file structure; `site.js:52–57` for `key` ↔ `data-page` matching.
- **GOTCHA**: every href must resolve — the four page files land in Phase 2 of this same ticket; the GitHub link is safe (repo verified PUBLIC).
- **VALIDATE**: `node --check system/client.neutral.config.js`
- **SATISFIES**: AC #1 (chrome via config pattern)

### CREATE `system/analytics.mjs`

- **IMPLEMENT**: Deck D, verbatim.
- **PATTERN**: `system/scenario-data.mjs:1–15` (header register, LOCAL_HOSTS, honesty comment) — already followed in the deck.
- **GOTCHA**: (1) Never POST to `/cdn-cgi/rum/` directly — CF requires all requests to originate from the beacon script. (2) Do not "improve" the pushState dance — the delayed restore is deliberate (beacon hook timing). (3) End-to-end beacon recording is verifiable only post-launch; the deck's header documents that debt.
- **VALIDATE**: `node --check system/analytics.mjs && grep -c 'export function trackFactoryDriven' system/analytics.mjs`
- **SATISFIES**: AC #3 (snippet wired, helper callable)

### UPDATE `system/portfolio.css`

- **IMPLEMENT**: Append Deck B at end of file, verbatim.
- **PATTERN**: `.fig-hint` (`portfolio.css:188–201`) is the chip idiom `.capability` mirrors; `.cs-h` (143–151) the table's type register; header rule at lines 1–7.
- **GOTCHA**: semantic tokens only — the file's one sanctioned raw value stays the documented `::backdrop` rgba (~line 255). Deck B adds no raw color values (px sizes are fine — the file uses them throughout).
- **VALIDATE**: `grep -nE '#[0-9a-fA-F]{3,8}|rgb\(' system/portfolio.css` → only the pre-existing `::backdrop` line matches.
- **SATISFIES**: AC #1 (token-only styling), AC #4 (indicator organism)

### UPDATE `index.html` — rewrite as the Home gate

- **IMPLEMENT**: Deck A skeleton + Deck E content. The current neutral-base demo content is retired (git history keeps it; decision recorded above).
- **PATTERN**: current `index.html:22–40` (hero markup), `55–86` (card grid), `90–108` (feature-band) — the same organisms, new content.
- **GOTCHA**: (1) One `h1`; heading levels unskipped (h1 → h2 section headlines → h3 cards). (2) The gate must survive a forward — no sentence depends on prior context. (3) `.hl` spans are single short words (`check`) — the class is `white-space: nowrap` and long spans overflow at 320px.
- **VALIDATE**: `curl -s http://localhost:5050/ | grep -c 'noindex'` → ≥1; `curl -s http://localhost:5050/ | grep -c 'class="capability'` → 3
- **SATISFIES**: AC #1, AC #2 (gate), AC #4

### CREATE `approach.html`

- **IMPLEMENT**: Deck A skeleton (`data-page="approach"`, meta from the doc's "Page meta" block with `[Your Name]` → `Linards Berzins`). Body: build every section of `__Approach_page.md` **in order**, following each section's italic build note: Hero (`page-hero`, eyebrow `Approach · how I work`) → §01 `section#seat` (`section-split`) → §02 intro line + `grid grid-3`/2×2 of four layer `card`s (kicker = discipline, h3 = promise) → §03 `section#loop` with the table as `.table-scroll > table.loop-table` (all four columns, all five rows) → §04 `section#value` plain list → §05 `section#case`: `section-split` intro, then the five labelled blocks (Problem & appetite / Shaping / Design & ethics / Build / Outcome) as a vertical sequence of `decision-card`s (`decision-card-title` = label, body = copy) → §06 `section#sources` compact muted columns → §07 `section#practice` with **four** principle blocks (growth-edge bullet CUT — user decision) → closing CTA band (`[ See selected work ]` → `/work` · `[ Get in touch ]` → `/contact`).
- **PATTERN**: copy is **verbatim from `__Approach_page.md`** — `.hl` spans and bold intros are already marked; transcribe, don't rewrite. Italic build notes are instructions, never page copy.
- **GOTCHA**: (1) §05's optional commentary step-through and interactive reveal: skip (Out of Scope). (2) `#case` must exist — Home and Work link `/approach#case`. (3) Section ids `seat/loop/value/case/sources/practice` — Deck B already gives them `scroll-margin-top`. (4) The doc's §02 has four cards in a `grid grid-3` — use `grid grid-2` (2×2) if three-up orphans the fourth card; the build note allows either.
- **VALIDATE**: `curl -s http://localhost:5050/approach | grep -c 'id="case"'` → 1; `curl -s http://localhost:5050/approach | grep -c '<tr'` → 6 (header + five rows)
- **SATISFIES**: AC #1

### CREATE `work.html`

- **IMPLEMENT**: Deck A skeleton + Deck F content, verbatim.
- **PATTERN**: `index.html:55–86` card grid; chip usage identical to Home (consistency is the organism's point).
- **GOTCHA**: card 2 has **no link** by design; do not name Verdant/Fieldwork (Deck F note).
- **VALIDATE**: `curl -s http://localhost:5050/work | grep -c 'class="capability'` → 3
- **SATISFIES**: AC #1, AC #4

### CREATE `contact.html`

- **IMPLEMENT**: Deck A skeleton + Deck G content, verbatim.
- **PATTERN**: `404.html:20–39` — the single-hero minimal page.
- **VALIDATE**: `curl -s http://localhost:5050/contact | grep -c 'mailto:linardsberzins@gmail.com'` → 1
- **SATISFIES**: AC #1

### CREATE `factory.html`

- **IMPLEMENT**: Deck A skeleton + Deck H content.
- **PATTERN**: `derive.html:12–17` head-comment honesty register; `lineup-item` idiom from `components.css`.
- **GOTCHA**: **Re-verify the "runs today" rows at implement time** — a linked page must work from a clean checkout, meaning the page AND its imports are committed: for row 1 run `git ls-files derive.html system/derive.mjs system/oklch.mjs system/wcag.mjs system/derive.rules.mjs` — all five paths must print (at planning time `system/derive.mjs` was NOT committed; if that's still true, drop row 1). Row 2: `git ls-files scenarios/check.html system/scenario-data.mjs` (both committed at planning time). Row 3 is always safe. Do not use the word "demo" for the harnesses; they are harnesses.
- **VALIDATE**: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5050/factory` → 200; then every href in Section 01 returns 200 via curl.
- **SATISFIES**: AC #1, AC #4 (the stub *is* the capability indicator)

### UPDATE `404.html`

- **IMPLEMENT**: Deck I, verbatim.
- **VALIDATE**: `grep -c '#system' 404.html` → 0
- **SATISFIES**: AC #1

### UPDATE `CLAUDE.md`

- **IMPLEMENT**: Deck J, verbatim — map lines only.
- **GOTCHA**: do not touch §Ground rules or §Where new code goes; the view-time-module rule already covers `analytics.mjs`.
- **VALIDATE**: `grep -c 'analytics.mjs' CLAUDE.md` → 1
- **SATISFIES**: house convention (map stays true)

### Full-surface validation sweep

- **IMPLEMENT**: run everything under VALIDATION COMMANDS; fix regressions before commit.
- **VALIDATE**: all commands pass.
- **SATISFIES**: AC #1–#4, completion checklist

---

## TESTING STRATEGY

No test suite, no linter, no type-check exists in this repo — **do not invent one** (CLAUDE.md §Ground rules: "Done" = run the surface you touched). Testing is executable checks + a real browser pass.

### Unit-level checks

- `node --check` on both touched JS files (`--check` respects the `.mjs` module goal).
- `trackFactoryDriven()` from the browser console: URL flips to `/factory/driven` and restores within ~50ms; a second call is a no-op (`fired` guard).

### Integration checks

- Serve the repo root, request all five routes + a bogus path; assert status codes and `noindex` per page.
- Chrome injection: every page shows header + footer; the correct nav item carries `.active` (keyed by `data-page`); the CTA renders; the mobile toggle opens/closes at ≤640px.

### Edge Cases

- **No token**: analytics module imports cleanly, injects nothing, helper still callable (the shipped state until launch).
- **localhost guard**: even with a token pasted in temporarily, no `cloudflareinsights` script tag appears on `127.0.0.1` (revert the paste after checking).
- **`/factory` deep link forwarded cold**: the page makes sense with zero prior context and every "runs today" link resolves.
- **320px viewport**: no horizontal scroll anywhere; the §03 loop table scrolls inside `.table-scroll` instead of overflowing the body.
- **Keyboard**: skip-link appears on first Tab (portfolio.js injects it); all nav/CTA/card links reachable; focus ring visible (`:focus-visible` global).
- **prefers-reduced-motion**: no new transitions violate the existing global reduce rule (Deck B adds none).

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
node --check system/analytics.mjs && node --check system/client.neutral.config.js && echo "✓ syntax"
# token discipline: only the documented ::backdrop raw value may match
grep -nE '#[0-9a-fA-F]{3,8}|rgb\(' system/portfolio.css
# no page-level <style> blocks were added (should print nothing)
grep -nE '<style' index.html approach.html work.html contact.html factory.html 404.html
```

### Level 2: Unit

```bash
grep -c 'export function trackFactoryDriven' system/analytics.mjs   # 1
grep -c 'static.cloudflareinsights.com/beacon.min.js' system/analytics.mjs   # 1
```

### Level 3: Integration

```bash
npx serve . -l 5050 &   # kill afterwards
sleep 2
for p in / /approach /work /contact /factory; do echo -n "$p → "; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5050$p"; done   # all 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5050/no-such-page   # 404
for f in index.html approach.html work.html contact.html factory.html 404.html; do grep -l 'name="robots" content="noindex"' $f; done   # all six listed
grep -c 'X-Robots-Tag: noindex' _headers && git diff --stat _headers   # 1, then empty (untouched)
# factory stub link-chain truthfulness (row 1 only if these all print):
git ls-files derive.html system/derive.mjs system/oklch.mjs system/wcag.mjs system/derive.rules.mjs
git ls-files scenarios/check.html system/scenario-data.mjs
```

### Level 4: Manual Validation

- Open `http://localhost:5050/`: header/footer injected, "Home" active, hero + three proof cards + technical-reader band; read it against a 90-second clock.
- Click through all nav items + CTA; verify active states per page; open the mobile menu at ≤640px; Tab from the top — skip-link first.
- Console on any page: `const a = await import("/system/analytics.mjs"); a.trackFactoryDriven()` → URL flips and restores; confirm **no** `cloudflareinsights` script tag exists (localhost guard + empty token).
- `/approach`: compare section-by-section against `__Approach_page.md`; §03 table complete; `#case` anchor lands below the sticky header; §07 shows four principles.
- `/factory`: click every "runs today" link — each must actually work.

### Level 5: Additional Validation (Optional)

- `agent-browser` screenshots of all five pages at 320 / 768 / 1440 px — check for overflow, crushed grids, and `.hl` nowrap overflow.

---

## ACCEPTANCE CRITERIA

From the ticket, verbatim mapping:

- [ ] **AC #1** — All five IA pages render under the neutral pack; chrome injected via the `system/site.js` config pattern; token-only styling (grep lint + visual pass).
- [ ] **AC #2** — Home does the recruiter-gate job: outcome headline, three proof shortcuts, skimmable in ~90s, survives a forward with zero context (PRD §5).
- [ ] **AC #3** — Analytics snippet wired (beacon inject path in `analytics.mjs`, token slot documented); `trackFactoryDriven()` callable; `noindex` kept in `_headers` (file untouched) and on every page.
- [ ] **AC #4** — Every capability indicator states exactly what runs vs. what's plan-gated; every "Runs now" claim is clickable and true on the day of the PR.

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
- [ ] Post-merge follow-up noted: add the CF WA virtual-pageview adaptation as an amendment line on `docs/epics/ai-first-ux-factory.architecture.md` §Stack

---

## OPEN QUESTIONS / ASSUMPTIONS

**None open.** All four previously open calls were resolved with the user on 2026-07-17 (see DECISIONS — RESOLVED). Remaining assumptions, both benign and documented in place:

- The beacon's virtual-route recording can only be observed end-to-end after the token exists at launch — the module comment records this verification debt; everything testable today is validated by this plan.
- Copy in Decks E–H is final-draft quality written to the voice contract; the user reviews it in the PR diff like any other code.

## NOTES (open canvas)

- **Why extensionless hrefs**: verified — CF Pages redirects `.html` to extensionless natively, and `npx serve`'s default `cleanUrls` matches locally. `/factory` stays a stable deep link whose *implementation* (#10) can change without the URL moving. The one loss: `file://` browsing breaks — acceptable; the documented preview is `npx serve .`.
- **Why the CTA slot carries Contact** instead of a fifth nav item: mirrors the existing `nav-cta` idiom (`site.js:56`), keeps the nav row at four links + one styled action at 640px+, and gives the gate audience the single most important action persistent emphasis on every page. Contact's own page needs no active nav state (the CTA has none by design).
- **Why the analytics token lives in the module, not the config**: the config is the *brand/chrome* seam per-company builds clone; the beacon is *site infrastructure* that must not fork per pack. One constant, one file, filled once at launch. The token is public by design — committing it is consistent with "deploy = commit the artifacts".
- **Rejected: CF Pages dashboard auto-injection of the beacon** — zero code, but the wiring would be invisible in the repo, violating "the repo itself is inspectable proof". The manual module keeps the mechanism (and its honest no-custom-events comment) readable in source.
- **Rejected: building Work as the five-card `work-grid`** (`portfolio.css:81–102`) — authored for the old five-item personal portfolio; today there are exactly three truthful cards. `grid grid-3` is honest; adopt `work-grid` when the exhibit count earns it.
- **Sequencing**: nothing here blocks or is blocked by the other Wave-1/2 tickets in flight. The only cross-ticket touchpoint is the Factory stub's "runs today" links — resolved deterministically by the `git ls-files` chain check in the task and in Level 3.
- **90-second budget arithmetic**: hero (~15s) + three cards (~30s) + band (~10s) leaves ~35s slack. If Home grows during implementation, cut content, not type size.

## AMENDMENTS

<!-- Append-only after first approval/execution; newest at the bottom. Each entry: ISO date — what changed and why. -->
