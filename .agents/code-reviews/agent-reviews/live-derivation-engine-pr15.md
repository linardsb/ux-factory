# Review — PR #15, live derivation engine (commit af18da1)

Branch: `feature/live-derivation-engine`. Reviewed against this repo's own `CLAUDE.md` (vanilla-JS static site,
no framework/build, plain-Error boundary validation, honesty contract) — not the Python/FastAPI rubric.

Full changed-file set read in full: `system/oklch.mjs`, `system/wcag.mjs`, `system/derive.rules.mjs`,
`system/derive.mjs`, `derive.html`, `tooling/spike-palette.mjs`, plus cross-checked `system/tokens.contract.css`,
`system/tokens.source.json`, `index.html`, `system/components.css`, `system/site.js`, `system/portfolio.css`,
and the plan/report docs.

Verification performed (not just read-through): re-derived Ottosson's OKLab matrices by hand and compared to
the published anchors; recomputed WCAG boundary colors (#767676/#777777); ran `tooling/spike-palette.mjs`
(exit 0, 88/88, 100%); ran `derive()` directly under Node for the control color, all 8 spike colors, and
adversarial inputs (missing/invalid density, rewardType, frequency, hex; white/black/grey brand colors);
grepped for `Date.now`/`Math.random`; grepped `system/components.css` for every consumer of
`color-accent` / `color-accent-secondary` / `color-fg` against a `color-accent`/`color-bg-inverse` background
to check the ruleset's completeness claims against the real, shipped component library.

## Things done well

- Hand-written OKLab/OKLCH matrices are byte-identical to Björn Ottosson's published constants; independently
  recomputed sRGB red → OKLab and got (0.628, 0.225, 0.126), matching both the published reference and
  `tooling/spike-palette.mjs`'s own anchor test.
- WCAG math is correct and its own boundary anchors check out: recomputed `#767676` on white ≈ 4.54:1 (passes),
  `#777777` ≈ 4.48:1 (fails) — exactly the well-known AA boundary pair the spike uses as a canary.
- `toGamut`'s binary search is soundly constructed: `lo=0` is always in-gamut (chroma 0 is always achromatic
  and in-range), and the search only runs after confirming the target is out-of-gamut, so `hi` is a genuine
  upper bound — the standard bisection invariant holds every time, not just in the common case.
- Determinism is real: no `Date.now`/`Math.random`/wall-clock anywhere in the four new modules, the harness,
  or the spike runner; reran `derive()` repeatedly and got byte-identical output.
- Engine/contract parity is exact, not just "≥": counted `system/tokens.source.json`'s `contract` group by hand
  (7+5+8+2+8+3+3+2+8 = 46) and it matches the engine's 46 emitted keys name-for-name — the "46 tokens" deviation
  note is accurate, and stage 2 of the spike enforces it going forward.
- `derive.html` escapes every dynamic value it injects via `innerHTML` (`esc()` on `fgValue`/`bgValue`/`fg`/`bg`/
  `usage`/note fields/pattern fields); the one place that skips escaping (`tokenDump`) uses `textContent`, which
  is safe regardless. No injection path found.

## Issues found

### High — `color-fg` on `color-accent` is a real, live, failing pairing the ruleset's WCAG list doesn't check
**File:** `system/derive.rules.mjs:153-181` (the `wcagPairs` list and its "every fg/bg pairing the components
actually create" claim at line 158-159), cross-referenced against `system/components.css:438-442` and `:619`.

`.site-header.on-ocean .nav-cta`, `.nav-cta:hover` (both unconditional, ships on every page via `system/site.js`'s
nav injection), and `::selection` (global, every page) all set:
```css
background: var(--color-accent);
color: var(--color-fg);
```
`color-fg` is not `color-accent-fg` — it bypasses the engine's `accentFg` adaptive-text-color logic entirely.
Verified with the engine's own output for the **default/control accent** (`#2563eb`, no brand override needed
to hit this):
```
fg = #20242b, accent = #2563eb → contrast = 3.01  (needs 4.5 for AA text)
```
Reran for all 8 spike brand colors — every one fails, from 3.19:1 (control) down to 1.72:1 (`#78350f`). This is
not a hostile-input edge case; it fails today, with the neutral pack's own shipped blue, on ordinary interactions
(hovering the nav CTA, selecting any text on the page).

**Fix:** either change these three selectors to use `color-accent-fg` (component fix, outside this PR's file
set, but the actual bug), or add `{ fg: "color-fg", bg: "color-accent", min: 4.5 }` to `wcagPairs` so the engine
at least surfaces the failure instead of silently omitting it — right now `derive.html`'s "88/88 100% AA" and
the spike's "full live derivation" verdict imply a completeness this list doesn't have.

### High — the ruleset's stated reason for dropping `accent`/`bg-inverse` is empirically false
**File:** `system/derive.rules.mjs:163-167` (comment) and `:169-181` (`wcagPairs`, 11 entries), cross-referenced
against `system/components.css:429-432`.

The comment justifying the 11-not-12 pair count states: *"Components never set accent text on dark (accent on
dark appears only as a fill under accent-fg, checked below)."* This is not true.
`.site-header.on-ocean .nav-panel .nav-links a:hover, :focus-visible` sets:
```css
background: var(--color-inverse-wash);   /* 6% fg-on-inverse over transparent, over a bg-inverse panel */
color: var(--color-accent);
```
— accent as literal link text on an effectively-dark (bg-inverse ± a 6% wash) background, in the mobile nav
menu of the `.on-ocean` header variant (a real, wired-up mode — `system/site.js:35` reads `headerVariant`).
Computed `contrastRatio(accent, bgInverse)` for the engine's own output across all 8 spike colors: **every
single one fails**, from 3.38:1 (`#e11d48`) down to 1.83:1 (`#78350f`), including 3.19:1 for the control
`#2563eb`.

To be clear: this is not a re-litigation of the "11 pairs, not 12" decision — that math (a single accent token
can't satisfy AA on both a white and a near-black ground at once) is sound and is a documented, intentional
deviation I was told not to flag. What's being flagged is narrower: the comment's supporting premise ("never
happens in practice") is falsifiable and false, which means the exclusion isn't actually harmless — there's a
real, currently-unchecked accessibility failure sitting in shipped chrome that the honesty-contract framing of
this feature (`system/wcag.mjs:3`: "the checker that lets the engine SHOW its accessibility checks passing
rather than claim them") doesn't SHOW, because it doesn't know to look.

**Fix:** correct the comment to stop claiming this never happens, and decide a real remediation for the on-ocean
mobile nav link hover/focus state (e.g. route it through `accent-fg`-style logic, or don't use accent as text
there at all).

### Medium — `color-accent-secondary` is used as literal link text but classified "non-text" in the pair list
**File:** `system/derive.rules.mjs:179` (`{ fg: "color-accent-secondary", bg: "color-bg", min: 3.0, usage:
"non-text: quiet accent, live dots" }`) vs. `system/components.css:826` (`.lp-local a { color:
var(--color-accent-secondary); ... }`).

`.lp-local a` is an anchor — real text content, not a dot or a decorative fill — so per SC 1.4.3 it should be
held to the 4.5:1 text threshold, not the 3:1 non-text one the pair list applies. Lower confidence than the two
above because no HTML file currently instantiates `.lp-local` (grep found zero usages), so it's latent in the
committed component library rather than actively rendering a failure today. Worth fixing before any page uses
that class, since `color-accent-secondary` is a fixed `l: 0.55` with no contrast negotiation at all (unlike
`color-accent`), so nothing guarantees it clears 4.5:1 for every brand hue.

**Fix:** either reclassify this pair as text (4.5:1) in `wcagPairs`, or give `accentSecondary` the same kind of
contrast floor `accent` gets if it's going to be used as link text.

### Low — ruleset comment overstates which stylesheet the pattern classes live in
**File:** `system/derive.rules.mjs:110-111` ("selected from the REAL library (every class below exists in
system/components.css)") vs. `:117` (`.card-kicker` in the `hunt` pattern's `library-grid`).

`.card-kicker` is defined in `system/portfolio.css:66`, not `system/components.css` — grep confirms 0 matches
in `components.css`. Harmless in practice since `derive.html` (and `index.html`) load both stylesheets, so the
class resolves fine; it's a factually imprecise comment, not a functional bug.

**Fix:** say "components.css / portfolio.css" or move the class check into the spike's completeness stage.

### Low — `derive.html`'s `run()` has no error boundary
**File:** `derive.html:168-204`.

`derive()` throws plain `Error`s for invalid input (correctly, per project convention), but `run()` calls it
with no `try/catch`. Under the harness's actual controls (`<input type="color">`, fixed `<select>` options) this
path isn't reachable — browsers always hand back a valid 6-digit lowercase hex from a color input. It only bites
under direct DOM/console tampering, where the page would go silently stale (last-good render stays on screen,
no visible error) rather than reporting the failure. Low impact given this is an internal test harness
(`derive.html:12` says so explicitly), but worth a one-line `try/catch` before this becomes the Factory page
(ticket #10, per the file's own header comment).

## Not flagged (per review scope)

The four deviations called out as intentional and documented (palette recipe retuning, the 11-vs-12 pair count
itself, `derive.html` loading `portfolio.css`, 46-vs-"40+" tokens) were each independently verified against the
ruleset/report and check out — not re-listed as issues.

## Summary

Two High findings, both about the same root cause: `derive.rules.mjs`'s `wcagPairs` list and its supporting
commentary claim a completeness ("every fg/bg pairing the components actually create," "components never set
accent text on dark") that a grep across the real, shipped `system/components.css` disproves — and in both
cases the actual, unchecked pairing fails AA badly, including for the current default brand color, not just
hostile hypotheticals. The underlying math and mechanics of the engine itself (OKLab/OKLCH conversion, WCAG
formulas, gamut clamp, determinism, token-contract parity, XSS-safety of the harness) are all correct and
verified by direct recomputation — this is a coverage/honesty gap in the ruleset's claims, not a defect in the
color math.

**Do not start fixing anything without the user's sign-off** — these are report-only findings.
