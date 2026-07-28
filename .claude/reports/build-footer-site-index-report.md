# Implementation Report — /build joins the footer site index

**Plan**: `.claude/plans/build-footer-site-index.md`
**Branch**: `feature/build-footer-site-index`
**Status**: COMPLETE

## Summary

`system/client.neutral.config.js` describes the footer as "the full site index" and /build was not in
it — reachable from exactly two pages, so a reader landing on /approach or /contact had no route to
it at all. This adds one item to the footer's `Site` column (`Build → /build`, between `Work` and
`Contact`), corrects the two claim sites that said /build was deliberately out of the footer, extends
`build-journey.mjs` block [17] with a third clicked link-in, and pays the cost #138 deferred by
regenerating the 16 chrome-bearing visual baselines.

The nav is untouched — three items plus the Contact CTA, the v3 IA decision #71/D6.

## Tasks completed

- **0. Branch** → `feature/build-footer-site-index`, cut from a freshly pulled `main` (7df06a5)
- **1. Footer item** → `system/client.neutral.config.js` (UPDATE) — `{ label: "Build", href: "/build" }`
  in `footer.columns[0].items`, between `Work` and `Contact`, `href:` alignment matched, no `key:`
  (that field is nav-only)
- **2. The aspirational comment** → `system/client.neutral.config.js` (UPDATE) — records that /build
  joined the index and that the three-item nav is the D6 decision, not an accident of shipping order
- **3. Head comment** → `build.html` (UPDATE) — now says it is in the footer index as of #148, still
  off-nav, still `noindex`; carries the churn reason forward with the corrected count; #148 and this
  plan added to the ticket/plan lists
- **4. Architecture map** → `CLAUDE.md` (UPDATE) — same two clauses, one line, corrected count,
  `#148` appended to the trailing ticket list
- **5. Third link-in** → `tooling/build-journey.mjs` (UPDATE) — `["/approach.html",
  '.site-footer a[href="/build"]', "the footer site index"]` in the **first** loop only, plus the
  written reason it is absent from the JS-off loop
- **6. AMENDMENTS** → `.claude/plans/build-links-in-and-gates.md` (UPDATE) — the half-reversal
  recorded: footer yes, nav no, and the reason is D6 rather than baseline cost
- **7. Regen** → 16 PNGs via `npm run update:docker` on a clean tree, Phase 1 committed first
- **8. Audit** → see below; this is the step that could have failed and didn't
- **9. Gates** → all green
- **10. Commits** → two atomic commits + artifacts; `Closes #148` in the PR body
- **11. Follow-up filed** → **#160** — a deployed private instance renders a nav and footer index of
  404s. Pre-existing, latent, evidence recorded, deliberately not fixed here

## Tests added

No test files — per CLAUDE.md this repo has no suite. The proof is in the repo's own gates:

- **`tooling/build-journey.mjs` block [17]** gained a third row, taking the block from 11 to 14
  assertions. Three claims per link (visible → lands on `/build` → lands on the real page, not a
  404), driven across chromium + firefox + webkit.
- **A one-off manual-walk script** (scratchpad, not committed) drove /approach, /contact and /404 at
  1280 / 640 / 375 px: 36 checks, all passing — column order, computed-style parity with the other
  five items, a real layout box for the link, and no horizontal overflow at any width.
- **The same script over the three chrome pages outside the VR set** — `handoff.html`,
  `agentic-ui-study.html`, `instance.html`. They load `client.neutral.config.js`, so they gain the
  footer item too, but no baseline covers them, so nothing else would have caught a six-item column
  in a footer sized for five. 36 more checks, all passing.

## Validation results

| Gate | Result |
|---|---|
| `node --check system/client.neutral.config.js` | ✓ |
| `node --check tooling/build-journey.mjs` | ✓ |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ exit 0 — 3 groups, no drift |
| `node tooling/drift-check.mjs` | ✓ exit 0 — all 8 checks |
| `node tooling/build-checks.mjs` | ✓ exit 0 — all 8 groups |
| `npm run update:docker` | ✓ 20 passed (1.2m), 16 re-generated |
| `node tooling/build-journey.mjs all` | ✓ green on chromium + firefox + webkit |
| Manual walk (/approach, /contact, /404 × 3 widths) | ✓ 36/36 |
| Off-VR chrome pages (/handoff, /agentic-ui-study, /instance × 3 widths) | ✓ 36/36 |

**`gen-loc-summary --check` was run after the Phase 1 commit, not before** — it reads git-tracked
content, so running it against a dirty-but-uncommitted `client.neutral.config.js` would have measured
HEAD's version and passed vacuously.

### The baseline audit — 16 moved, and provably only the footer

Exactly 16 modified PNGs; the four proto baselines byte-identical. File count alone doesn't
discriminate "the footer grew" from "something else moved", so the heights were compared too. Because
the capture sizes the viewport to the measured document height, a height change fails
`toHaveScreenshot` on size mismatch rather than a pixel delta — all 16 failed loudly before the regen,
and there was no sub-threshold silent-pass risk.

| Page | neutral Δ | saulera Δ |
|---|---|---|
| 404 · approach · build · contact · factory · index · roundtrip · work | **+34px each** | **+37px each** |

Width unchanged at 1280 on all 16. The uniformity is the evidence: one extra `.footer-col li` at each
pack's line height, on every page that has a footer, and nothing else moved anywhere. The two proto
pages load neither `site.js` nor a client config — the gate already encodes this by waiting on
`.site-footer` only for `kind: 'ia'` — so their four PNGs staying put is the expected result, and
their moving would have meant a non-footer change leaked in.

## Deviations from the plan

1. **Comment wording: "the three-item set below", not "above".** The plan's suggested text said
   "above", but the comment block sits *above* the `nav` array it refers to. Written as "below" so it
   points at the right thing.
2. **`gen-loc-summary --check` run after the Phase 1 commit rather than in Task 9's original slot.**
   The plan itself notes the tool reads git-tracked content; running it earlier would have been a
   check that cannot fail.
3. **The Task 8 audit asserts image *heights*, not just the file count.** The plan asked for 16
   modified and 4 untouched. A file count alone can't distinguish the footer growing from something
   else moving, so the old-vs-new heights were compared across all 16 — which is what makes the
   uniform +34/+37 the actual proof.
4. **The manual walk was automated rather than eyeballed.** Same three pages and widths the plan
   names, driven with Playwright out of `tooling/visual-regression/node_modules` so the style-parity
   claim ("reads as a peer") is a measured assertion instead of an impression. The rendered baseline
   was also viewed directly to confirm the footer reads correctly.
5. **`build-checks` reports 8 groups, not the 9 CLAUDE.md's session copy described.** Group 9 (the
   origin predicate) is #157, which is on an unmerged branch. Nothing to do with this ticket; noted so
   the reviewer doesn't read it as a missing gate.

## Issues encountered

**One finding, filed not fixed: [#160](https://github.com/linardsb/ux-factory/issues/160).** A
deployed private instance renders a nav and footer index in which every entry but `/` is a 404.
`build-instance.mjs:359` copies `system/` wholesale (deliberately), which brings
`client.neutral.config.js` and `site.js` along; `instance.html:729-730` loads both; and the deploy dir
contains none of the five IA pages those links point at. `validateAssembly` audits `INSTANCE_CONFIG`
refs and never looks at chrome hrefs, so nothing catches it.

It is **pre-existing and latent** — it predates #148 by two epics, no company instance appears to have
been deployed yet, and #148 only makes it one entry worse. Fixing it means choosing how a private
instance treats shared chrome (strip during stamping / trimmed instance config / ship the pages), each
with a different cost on the #43/#44 surface and two of the three changing what wholesale-copy means.
That is an architecture call for its own epic, not a footer ticket.

Nothing else. No gate went red, no flake was hit, and the regen converged on the first run.
