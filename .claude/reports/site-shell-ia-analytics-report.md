# Implementation Report — Site shell: five-page IA + analytics wiring

**Plan**: `.claude/plans/site-shell-ia-analytics.md`
**Branch**: `feature/site-shell-ia-analytics` (worktree off `origin/main`)
**Ticket**: linardsb/ux-factory#6 · PR closes with `Closes #6`
**Status**: COMPLETE

## Summary
Replaced the placeholder token-demo shell with the real five-page IA on the neutral pack: Home (engineered as the 90-second recruiter gate), Approach (transcribed section-by-section from `__Approach_page.md`), a deep-linkable Factory route (honest stub), Work, and Contact. All chrome (header/nav/footer/CTA) is injected from `window.CLIENT_CONFIG` via the untouched `system/site.js`; every page is token-only vanilla HTML with no framework or build step. Added `system/analytics.mjs` — the Cloudflare Web Analytics beacon (empty-token no-op until launch) plus `trackFactoryDriven()`, implemented as a virtual-route pageview (`/factory/driven`) because CF WA has no custom events. Verified end-to-end in a real browser.

## Tasks completed
- Chrome config (Deck C) → `system/client.neutral.config.js` (UPDATE, full replacement)
- Analytics module (Deck D) → `system/analytics.mjs` (CREATE)
- Capability chip + loop-table + scroll-margin CSS (Deck B) → `system/portfolio.css` (UPDATE, appended)
- Home gate (Deck E) → `index.html` (UPDATE, rewritten)
- Approach page (from `__Approach_page.md`) → `approach.html` (CREATE)
- Work index (Deck F) → `work.html` (CREATE)
- Contact (Deck G) → `contact.html` (CREATE)
- Factory stub (Deck H) → `factory.html` (CREATE)
- 404 re-aim (Deck I) → `404.html` (UPDATE)
- Architecture-map lines (Deck J) → `CLAUDE.md` (UPDATE)

## Tests added
No test suite exists in this repo (CLAUDE.md ground rule — "Done" = run the surface you touched). Verification was executable checks + a real-browser pass via `agent-browser`:
- **Syntax**: `node --check` on `analytics.mjs` and `client.neutral.config.js` → pass.
- **Token discipline**: `portfolio.css` raw-color grep → only the pre-existing sanctioned `::backdrop` rgba (line 256); Deck B added none. Brace balance 108/108.
- **No page-level `<style>`** on any of the six pages.
- **Routes** (served with `npx serve`, extensionless like CF Pages): `/ /approach /work /contact /factory` → all 200; bogus path → 404; `/derive` → 200 and the derivation harness **actually renders** (import chain `derive.mjs → oklch/wcag/derive.rules` resolves, 4466 chars of output); `/system/tokens.contract.css` → 200.
- **noindex** present on all six pages (404 verified via a bogus path, since `/404.html` itself cleanUrl-redirects); `_headers` untouched (empty `git diff`).
- **Chrome injection**: header + footer render on every page; active nav resolves by `data-page` (`Home`/`Approach`/`Factory`/`Work`; Contact intentionally none — it rides the CTA slot); mobile menu opens/closes on tap; toggle visible at 320px.
- **Analytics helper**: `trackFactoryDriven()` flips the URL `/contact → /factory/driven → /contact` (restored), the `fired` guard makes the second call a no-op, and **no `cloudflareinsights` script is injected** (localhost guard + empty token).
- **Responsive**: no horizontal body overflow at 320px on any page; the §03 loop table scrolls inside `.table-scroll` (272px container, 720px table) rather than the body; screenshots captured at 320/1440.
- **Copy fidelity (verbatim diff)**: a normalization script asserted every source copy fragment is a substring of the rendered page text. `approach.html` — 104 fragments from `__Approach_page.md` (blockquote layer bodies, all table cells, bullets, headlines) all present; the only "misses" were expected non-copy (meta attributes, the `[Your Name]`→`Linards Berzins` substitution, a `<head>` entity-encoding artifact, source label colons) and the deliberately-cut §07 "edges" bullet. British spellings (`colour`/`behaviour`), em-dashes, and every table cell verified. Decks E–H — all distinctive phrases present verbatim across Home/Work/Contact/Factory.

## Validation results
All plan VALIDATION COMMANDS Levels 1–4 pass. Per-page invariants (final): each of the six pages has exactly one `<h1>`, one `noindex` meta, the analytics module in its script tail, and zero `<style>` blocks. Capability chips: Home 3, Work 3, Factory 5. `git status`: 5 modified + 5 new, no stray files.

## Deviations from the plan
1. **Base = `origin/main` via an isolated git worktree.** The shared working dir was on a parallel session's WIP branch (`feature/data-connected-prototypes`, since flipped to `feature/agentic-bridge`) with that ticket's uncommitted changes. Issue #6 is "Depends on: none," so I branched `feature/site-shell-ia-analytics` off `origin/main` in a dedicated worktree — one atomic PR, parallel session undisturbed. Verified the shell files (`portfolio.css`, both token files, `index.html`, `404.html`, `site.js`, `client.neutral.config.js`) are **byte-identical** between main and the epic-snapshot branch, so building on main is equivalent to the state the plan was written against. Approach copy was transcribed from `__Approach_page.md` (present in the source tree, not on main — a source doc, not a runtime dep).

2. **Factory "runs today" — scenarios row DROPPED (plan-sanctioned).** Deck H Section 01 listed three rows; `scenarios/check.html` + `scenario-data.mjs` are **not on main** (they're on open PR #16 / the scenario branch), so linking them would 404 from a main-based deploy and break AC #4 (honesty). Per the plan's own degradation rule (Factory GOTCHA: "a linked page must work from a clean checkout … drop the row"), I dropped that row and renumbered the remaining two (derive → 01, token contract → 02). **Follow-up:** once ticket #4 / PR #16 lands on main, a one-line edit restores the scenarios row.

3. **Factory derivation link → extensionless `/derive`** (Deck H wrote `/derive.html`). `npx serve` (cleanUrls) and CF Pages both 301-redirect `/derive.html` → `/derive` — the plan itself documents this CF Pages behavior. `/derive` is a direct 200, matches the site's extensionless nav convention (Deck C), and avoids a redirect hop. Verified `/derive` serves and renders the harness.

4. **Card-section `section-label`s promoted `<div>` → `<h2>`** on Home §01 ("Three ways to verify") and Work §01 ("Exhibits"). The plan's Home GOTCHA requires "h1 → h2 section headlines → h3 cards," but Deck E/F give these sections only a `section-label` div, producing a real `h1 → h3` skip. `.section-label` is class-styled, so promoting the element to `<h2>` is **zero visual change** while realizing the plan's stated hierarchy intent. Sections that already carry a `.headline`/`.feature-headline` h2 (Approach, Home §02) were left untouched; Factory/Contact have no h3s so no skip exists.

5. **Approach §02 given `id="layers"` + `#layers` added to Deck B's scroll-margin rule.** The hero CTA "See the four layers" needs an in-page anchor but the plan assigned §02 no id. `#layers` was appended to the `scroll-margin-top` selector so the jump lands below the sticky header like every other section.

6. **Approach §02 section-label added ("02 · The method").** The source §02 build note specifies only "intro line, then grid" (no label), but omitting it would leave a visible numbering gap (01, _, 03…04…07) among the six labeled sections. Added for consecutive numbering / visual consistency; copy unchanged.

7. **Approach §02 per-layer framework attributions omitted from the cards.** The source parentheticals are heterogeneous — two frameworks ("from Shape Up", "from the Hook Model and BJ Fogg") and two bare categories ("evidence", "craft") — so they read as authoring notes, not uniform captions. Per the §02 build note (card = kicker/h3/body, no source element) they were left off the cards; §06 "Sources" carries the framework attributions comprehensively, satisfying the voice contract.

8. **Approach §05 `built-because` wiring skipped.** The §05 build note optionally suggests wiring the `built-because` organism to self-demonstrate the pattern; that belongs to the same optional commentary/guess-then-reveal layer the plan places Out of Scope. Skipped — the core §05 (section-split intro + five decision-cards) is complete.

## Issues encountered
None blocking. Two verification nuances worth noting for the reviewer: (a) `curl` sees pre-JavaScript HTML, so chrome injection and active-nav state were verified in a real browser (`agent-browser`), not via curl; (b) the footer column headings are `<h4>` (hard-coded in the untouched `site.js`) — a pre-existing pattern on every page, out of scope for this ticket.

## Post-merge follow-ups
- Restore the Factory "scenarios, end to end" row once ticket #4 / PR #16 lands on main (deviation #2).
- Add the CF WA virtual-pageview adaptation as an amendment line on `docs/epics/ai-first-ux-factory.architecture.md` §Stack (per the plan's completion checklist).
- Fill `BEACON_TOKEN` in `system/analytics.mjs` at launch (the empty-token no-op is the shipped state; end-to-end beacon recording is only observable once the token exists).
