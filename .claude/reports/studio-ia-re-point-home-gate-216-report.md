# Implementation Report — IA re-point: home compresses to the gate (#216)

**Plan**: `.claude/plans/studio-ia-re-point-home-gate-216.md`
**Branch**: `feature/studio-ia-re-point-home-gate-216`
**Status**: COMPLETE (22 of 23 tasks; Task 23 is a post-merge action — see below)

## Summary

The site stopped being five peer pages and became one destination with evidence around it.
Home compressed from seven sections to four (billboard → merged live re-skin proof → four-row
evidence index → close row); the intake wizard, wear interstitial, built-screen peak and close
card were deleted along with `peak.mjs`, `close.mjs` and `intake-beat.mjs` (610 lines) and the two
analytics trackers whose only callers they were. Nav and footer now point at the studio, with
`Factory` → `Studio` (#206's deferred D2). Work, approach and 404 stopped claiming the old IA. The
shared `.stage-scrub-handle` recipe became a token-only chip with a `::after` drag glyph, so the
handles read as controls at rest on touch as well as desktop.

Net: **44 files, +1,670 / −1,241**, weighted toward deletion — which is the point of the ticket.

## Tasks completed

| # | Task | Files |
|---|---|---|
| 1 | Handle recipe → chip + `::after` glyph | `system/portfolio.css` (UPDATE) |
| 2 | Handle proof, 3 engines × 2 surfaces × 2 packs | `<scratchpad>/handle-affordance-proof.mjs` (not committed) |
| 3 | Home rewritten to four sections | `index.html` (UPDATE) |
| 4 | Three orphaned modules removed | `system/{peak,close,intake-beat}.mjs` (DELETE) |
| 5 | Dead import dropped; live brand read | `system/scrub.mjs` (UPDATE) |
| 6 | Preview re-scoped; `.fw-*` + dead close CSS pruned | `system/portfolio.css` (UPDATE) |
| 7 | Two orphaned trackers deleted | `system/analytics.mjs` (UPDATE) |
| 8 | Pinned `MIN` unpinned | `tooling/build-checks.mjs` (UPDATE) |
| 9 | Nav + footer point at the studio | `system/client.neutral.config.js` (UPDATE) |
| 10 | Palette relabelled, every hash kept | `system/palette.mjs` (UPDATE) |
| 11 | Run-it grid + `#more` + counts | `work.html` (UPDATE) |
| 12 | Closing CTA; three anchors kept | `approach.html` (UPDATE) |
| 13 | 404 CTA re-pointed; contact verified neutral | `404.html` (UPDATE) |
| 14 | Eight deleted controls removed | `system/param-manifest.json` (UPDATE) |
| 15 | Both artifacts regenerated | `system/{param-count,loc-summary}.json` (UPDATE) |
| 16 | `waitVisible` removed from index | `tooling/visual-regression/visual.spec.mjs` (UPDATE) |
| 17 | Home row → boot-count-only + loop guard | `tooling/vt-verify.mjs` (UPDATE) |
| 18 | Both `/build` link-in rows moved to the studio | `tooling/build-journey.mjs` (UPDATE) |
| 19 | Pure CI gates | — |
| 20 | Link audit | `<scratchpad>/link-audit.mjs` (not committed) |
| 21 | 5-second role-fit check | screenshots, below |
| 22 | 18 chrome-bearing baselines regenerated | `tooling/visual-regression/baselines/*.png` (UPDATE) |
| 23 | Comment on #245 | **PENDING — post-merge by design** |

Plus an unplanned but required pass: **11 dangling comment citations across 7 files** corrected
(`wcag-receipts.mjs`, `instance.mjs` ×5, `pattern-render.mjs`, `studio-verbs.mjs`, `dock.mjs`,
`components.css`, `portfolio.css`) — the completion checklist's "no comment left describing a
deleted module" applies to every file, not only the ones the plan lists.

## Tests added

No committed gate was added — the ticket asks for verification, not coverage (plan, Non-Goals).
Two throwaway drivers were written and run:

**`handle-affordance-proof.mjs`** (AC #7) — 3 engines × 2 surfaces × 2 packs = 12 combinations,
**242 assertions, 0 failures**. Per combination: the glyph at rest, a real pointer drag, then three
`ArrowRight` presses, re-asserting `::after` **and** `role`/`aria-label`/`aria-valuenow`/
`aria-valuetext` after each.

The discriminator: `aria-valuenow` must actually move, or steps 3–4 assert nothing. Measured
`154 → 178 → 184` on home, `136 → 160 → 166` on approach — matching Phase 0's chromium prototype.

**It is proven able to fail.** A mutation replaces the `::after` glyph with the broken child-`<span>`
design and re-runs the drag: the load-only check passes (which is exactly why that check is
worthless) and the drag assertion goes red, because `reflect()` wipes `textContent`.

**`link-audit.mjs`** (AC #8) — **249 assertions, 0 failures** across the nine chrome-bearing pages
plus the ⌘K palette: every route resolved, every same-page hash resolved to a real element, nav and
footer contents asserted explicitly, and the two dead-hash instances this ticket could have created
(`/#verify`, `#beat-intake`) checked by name.

## Validation results

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ **21/21 groups** |
| `node tooling/drift-check.mjs` | ✓ clean (12 checks) |
| `node tooling/token-lint.mjs` | ✓ 64 tokens · 0 undeclared · 0 orphan |
| `gen-loc-summary --check` / `gen-param-count --check` | ✓ no drift |
| `node tooling/vt-verify.mjs all` | ✓ green ×3 engines — home reports `load opens 2 transition(s)` |
| `node tooling/build-journey.mjs all` | ✓ **157 passed · 0 failed** ×3 engines |
| handle proof | ✓ **242 passed · 0 failed** (12 combinations) + mutation red |
| link audit | ✓ **249 passed · 0 failed** |
| `node tooling/studio-journey.mjs chromium` | ✓ **327 passed · 0 failed** (/factory regression) |
| visual gate (docker, no `--update-snapshots`) | ✓ **22/22 pass** |
| edge cases (JS off · reduced motion · 320px · worn pack) | ✓ all pass |

**Baselines: exactly 18 changed**, verified by md5 before/after rather than by the run's exit code.
The 4 unchanged are precisely `proto-verdant` and `proto-fieldwork` under both packs — the two pages
that carry no chrome. This confirms the plan's corrected count of 18 (not the ticket's 16, written
before #215 added `/components` to the VR page set).

Approach's shots did move, so the sub-perceptual skip never fired — but the pixels were not trusted
for it. `#loc-proof` and `#param-proof` were read off the running page: **72 files / ~26,700 lines /
111 controls**, matching the regenerated artifacts.

**Task 21 · the 5-second role-fit check** — at 1440×900 and 390×844, captured after
`data-spine="ready"` so the hero re-skin had reverted (the `hero-reskin-screenshot-trap`). Above the
fold on both: role (`Linards Berzins · UX engineer`), outcome (the h1), and one primary CTA
resolving to `/factory`.

## Deviations from the plan

1. **Branch.** The session opened on `feature/component-catalog-215`, already squash-merged, with
   `main` three commits ahead. Branched from `origin/main` instead — using #215's branch would have
   put its unsquashed commits in this PR's diff.

2. **Task order 4 ↔ 5 swapped.** Task 5 (`scrub.mjs`'s dead import) ran before Task 4 (`git rm`), so
   the tree was never left with a broken import mid-run. Same end state.

3. **Hero copy — the owner's call, taken before the baseline run.** The plan left the h1 as a
   judgment call. Both options were put to the owner with screenshots at the point where the choice
   still preceded the 18-baseline regen; they chose the shorter `I build the system, not the picture
   of it.` **One word was dropped from the chosen sub**: "The studio *below* holds…" would be false
   on home, where the studio is `/factory` rather than a section. D2 (Home out of the nav) was
   confirmed as planned.

4. **Task 6 widened, with every deletion proven.** The plan scoped `.wear-cue` plus
   "`.close-extras`-only rules". Deleting `close.mjs` orphaned nine classes, not one
   (`.close-extras`, `.close-share-row/-line/-status/-url`, `.close-shared-note`, `.close-tokens`,
   `.close-takeaway-row`, `.close-note`). Every `close-*` class in `portfolio.css` was audited
   against every `.html` and `system/*.mjs`; the nine with zero consumers were removed and the four
   `instance.html` still renders were kept. Dead CSS is counted by `loc-summary` and *rendered on
   approach as a size claim*, so leaving it would have made that claim false.

5. **`portfolio.css:914` fixed — not in the plan.** The `scroll-margin-top` selector named all four
   deleted ids. `instance.html` carries its own `#beat-brief`/`#beat-built`/`#beat-keep` set in its
   own `<style>`, so all four were confirmed dead before pruning.

6. **`index.html:7`'s meta description rewritten — not in the plan.** It described the deleted
   wizard ("answer three product questions"). `work.html`'s meta and hero both said "two demos"
   where there are three. AC #3 forbids orphaned copy claiming the old IA, and `<meta>` is copy.

7. **`instance.mjs` comment-only edits**, despite the plan scoping that file out. Five citations
   named deleted modules. The scope-out protects instance's *structure and behaviour*; no markup,
   CSS or logic was touched, and the completion checklist's no-stale-comment rule is explicit.

8. **`npm run test:docker` does not exist** in this repo (`package.json` defines only `test` and
   `update:docker`). The plan's Level 5 named it wrongly. Ran the Docker command without
   `--update-snapshots` instead, which is the same check.

## Issues encountered

**One pre-existing dead link, left alone and flagged.** `work.html:420` links `href="/handoff"`,
which 404s: `handoff/` is a real directory with no `index.html`, so `serve.mjs:24` resolves it to
the directory and the extensionless→`.html` fallback at `:30` never fires. **It is on `origin/main`
and is not this ticket's** — the link audit excludes it explicitly and prints why rather than
passing silently. Worth its own ticket; production CF Pages may resolve it differently from
`serve.mjs`, which is exactly why it deserves a real check rather than a guess here.

**Coverage loss, stated out loud (plan Open Question ➋).** Home no longer contributes a per-verb
view-transition assertion to `vt-verify`. Its only `morph()`-wrapped verb was the intake wizard,
which left for the studio's method band; the sole other `morph()` reachable from home
(`brand-import.mjs:384`) runs only on the unclaimed fallback path, which `dock.mjs` claims first.
The row keeps the half it can honestly assert — the boot count of 2, which is the property the pixel
gate depends on. The other four SITEWIDE rows are untouched.

**Home's JS-off floor shrank, by design.** 3,990 → 2,211 characters and 7 → 3 headings, because four
sections were deleted. Verified complete by content rather than by a threshold: hero + sub, the
brand section's lead, controls and drop-zone copy, all three preview specimens, the four evidence
rows and both close CTAs all render with JavaScript off.

## Ready for the next step

- `Closes #216` must be in the PR body (a title mentioning `(#216)` closes nothing).
- **Task 23 is post-merge**: comment on #245 that approach keeps `#method` · `#case` · `#sources`
  as named sections, so its "confirm against #216's landed IA" resolves to *no move*.
- The plan and this report are committed on the branch; the review belongs at
  `.claude/code-reviews/pr-<N>-review.md` in the same PR.
