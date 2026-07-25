# PR #45 review — Factory integration (scenario toggle · ethics guess-then-reveal · trace station)

**Slice 10.3 · closes #10 · `feature/factory-integration` → `main`** · +1621 / −92, 7 files.
Reviewed with fresh eyes (my own deep pass + the `code-reviewer` agent, reconciled below), all three
project validation gates run, and the load-bearing behaviours verified in a real browser (agent-browser).

## Recommendation: **Request changes** — small fixes, none blocking

Three real issues, all small and localized; **none is a correctness, security, or data blocker** — no
crash, no wrong output, no XSS, no fabricated-artifact honesty violation. But two are worth landing
before this merges, precisely because this is the commit that *closes* #10 and because accessibility +
honesty are this portfolio's explicit selling points:

1. a confirmed keyboard-focus regression on the marquee new control (the scenario toggle), and
2. a now-total self-contradiction between the page's hero/meta copy ("three are in build") and its own
   five "Runs now" badges — a live violation of the page's own stated premise ("each station states
   exactly what runs today").

Both fixes are ~1–3 lines. This is the agentic gate asking for them first; the human (and, this being a
solo repo, that's the author) makes the final merge call and may reasonably choose to fast-follow instead.

## Validation (run this session)

| Gate | Result |
|------|--------|
| `node -e import('./system/factory-intake.mjs')` (parse under Node) | ✓ parses (DOM behind the `document` guard) |
| `node tooling/token-lint.mjs` | ✓ 47 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node tooling/drift-check.mjs` | ✓ syntax · token-css · handoff · scenarios · traces |
| `node tooling/validate-trace.mjs` | ✓ demo-notice (curated, 23 steps) + demo-notice.raw |
| Honesty/grading greps | ✓ `capability live`×5 · `class="capability"`×0 · grading language ×0 · `data-scenario`×2 · `markDriven`×3 drive sites |
| **visual-regression (Docker, the real CI gate)** | **NOT re-run this session** — recording the PR's "16/16 passed" Docker COMPARE claim; the Linux baselines can't be reproduced locally here. A verification caveat, not a finding. |

**Real-browser drive (agent-browser, `/factory` on a local static server):**
- Default = Verdant: 2 toggle radios (verdant checked), `--color-accent: #2f7a4d`, re-skin `[data-reskin]=ready`, trace mount `[data-trace=ready]`, no cell preselected. ✓
- Keyboard toggle Verdant→Fieldwork: accent flips to `#b4530a`, verdict swaps. ✓ (but see Finding 1)
- **Fieldwork ethics reveal — the load-bearing honesty path — CORRECT.** Placed facilitator →
  left column "Where you placed it: Facilitator" + verbatim meaning; right column "The maker's verdict:
  **Not placed** — the frequency filter already decided, the honest verdict needs no matrix" + the
  Fieldwork narrative. The maker side does not fabricate a quadrant. ✓

## Findings

### 1 · Medium (a11y) — scenario toggle loses keyboard focus on every switch
`system/factory-intake.mjs:258-277` (`renderToggle`), called from `setScenario` `:252`.
*(The `code-reviewer` agent independently found this and rated it **High**, on the grounds it diverges
from an established, explicitly-commented in-repo pattern; I'm calling it Medium — a confirmed a11y
pattern-inconsistency, recoverable, not a logic/correctness error — but flagging the range so you can judge.)*

`setScenario()` calls `renderToggle()`, which `toggleMount.replaceChildren(fieldset)` — destroying the
very radio the user just acted on. When a keyboard user arrow-navigates the scenario radio group (native
behaviour: arrow moves selection **and** fires `change`), the handler rebuilds the fieldset and focus
falls to `<body>` rather than the now-checked radio.

**Confirmed in-browser:** focus Verdant radio → `ArrowDown` → Fieldwork becomes checked, accent flips to
`#b4530a`, and `document.activeElement === document.body` (the Fieldwork radio is *not* focused). The
keyboard user is dumped out of the control on every toggle and must re-Tab across a five-station page to
find it.

The wizard already solves this exact `replaceChildren`-destroys-the-focused-node problem three functions
away, with an explicit comment (`renderWizard`, `:370-375`, the fix PR #37 hardened). The new toggle omits
the equivalent guard.

**Fix (~3 lines, mirrors the wizard):**
```js
function renderToggle() {
  if (!toggleMount) return;
  const hadFocus = toggleMount.contains(document.activeElement); // read BEFORE the rebuild
  const fieldset = el("fieldset", "fw-toggle");
  // …build options; remember the checked input…
  let activeInput;                       // set activeInput = input when slug === active
  toggleMount.replaceChildren(fieldset);
  if (hadFocus && activeInput) activeInput.focus(); // restore only if focus was inside (Safari-safe)
}
```
`contains(document.activeElement)` read before the swap is `true` for the keyboard case and `false` for
Safari's mouse-click-doesn't-focus-radios quirk, so it won't force unwanted focus on a mouse toggle.
(Simpler alternative: drop `renderToggle()` from `setScenario()` entirely — on the only path that calls
`setScenario` today, the browser has already set `.checked`, so the rebuild is redundant. The focus-restore
version is more future-proof for a programmatic caller, e.g. a `?scenario=` deep link.)

### 2 · Medium (UX correctness) — ethics reveal panel goes stale after re-placement
`system/factory-intake.mjs:469-479` (`selectCell`), `:527-562` (`renderReveal`). *(Both reviewers found this.)*

After the reader clicks "Compare with the maker", `selectCell` updates the picked cell's `aria-pressed` +
"✓ your placement" marker but never touches the already-open reveal panel. Re-placing to a different cell
leaves the matrix and the panel contradicting each other until Reveal is clicked again.

**Confirmed in-browser:** reveal on Facilitator, then click Dealer → selected cell (aria-pressed=true,
"✓ your placement") = **Dealer**, while the panel still reads "Where you placed it: **Facilitator**"
(MISMATCH=true). In the platform's *one* interactive guess-then-reveal moment, the grid and the
compare-notes panel disagree on screen.

**Fix (1 line):** keep an already-open reveal in sync rather than forcing a re-click (fits the
"two judgments side by side" ethos better than hiding it) — in `selectCell`, after updating the buttons:
```js
if (revealPanel && !revealPanel.hidden) renderReveal(revealPanel, s);
```

### 3 · Medium (accuracy / honesty-contract) — hero + meta copy contradict the page's own badges
`factory.html:7` (meta description), `:227-228` (hero-sub). **Pre-existing — NOT in this PR's diff.**

Both strings claim "Two run now … three are in build" / "two run in front of you now, three are in build."
But the page now carries **5 `capability live` "Runs now" badges and 0 "In build"** (verified). This PR
flips Station 5's badge to "Runs now" (`:379`), taking the contradiction from 4-of-5 to a total 5-of-5 — on
a page whose own top line is *"Each station states exactly what runs today."* It under-claims (not a
fabricated-artifact violation), but it's a live internal inconsistency of exactly the kind this project's
honesty contract exists to prevent, and this is the #10-closing commit — the natural point to correct it.

**Fix:** update both strings to five-of-five, or drop the count and let the badges speak. (Fair note: the
lines pre-date this PR; folding the one-line copy fix in here is optional but well-placed.)

### 4 · Low (a11y) — reveal has no focus move / `aria-live`
`system/factory-intake.mjs:515` / `:561`. Clicking "Compare with the maker" unhides the panel below the
button but neither moves focus into it nor announces it, so a screen-reader user isn't told content
appeared. Minor (DOM order lets them navigate to it; no motion). Optional: `aria-live="polite"` /
`role="status"` on `revealPanel`, or focus its eyebrow after reveal.

### Observation (not a numbered finding) — trace player's global arrow capture, now embedded
`system/trace-player.mjs:170-174` (unchanged canon). Moving the player from its standalone `trace.html`
harness into a mid-page Station-5 embed brings its `document`-level ←/→ capture along: a reader with focus
on neutral space (e.g. `<body>` after clicking whitespace) who presses an arrow silently steps the trace
even if Station 5 is off-screen. `guardArrows` correctly shields the wizard/toggle/ethics controls, but
there's no scoping on the player's own capture now that it's not the sole surface on its page. By-design
behaviour inherited unchanged from the player module — a judgment call for the author (global vs. scoped
capture once embedded), not a regression introduced by this diff. Flagging for awareness.

## What's done well
- **Honesty contract is airtight where it counts.** Under Fieldwork no station fabricates a pack/trace:
  Station 4 keeps Verdant's *real* pack linked and says Fieldwork's is in build; Station 5 copy is
  scenario-neutral and states the mounted run authored a ComponentSpec, not a per-scenario run; the
  `Not placed / needs no matrix` reveal is the correct honest answer. `data-trace="ready"` is set **only**
  on fetch success, so a real trace failure fails the visual gate loud instead of baking a false-green
  baseline — a genuinely good call.
- **The trace-player arrow-key collision was foreseen and handled** (`guardArrows` stopPropagation without
  preventDefault + ethics cells as `<button aria-pressed>` rather than radios). Both reviewers verified the
  DOM-ancestry design makes it order-independent, not registration-order-lucky.
- **Matrix wiring is correct.** `CELLS[0..3]` land in the geometrically correct grid cells against
  `RULESET.ethics.matrix`; easy to get subtly wrong, it isn't. And `ethics.quadrant` depends only on the
  two booleans, so changing wizard answers between placing a guess and revealing can't corrupt the quadrant.
- **XSS discipline preserved.** All new scenario/quadrant/narrative copy goes through `el(…text)` →
  `textContent`; the `esc()`-guarded `innerHTML` blocks are unchanged 10.2 canon. (The `code-reviewer`
  empirically checked the one free-text input — the native `<input type=color>` — across Chromium/WebKit/
  Firefox and confirmed uppercase-hex handling is a non-issue.)
- **Fire-once analytics correctly centralised** into `markDriven()`, called from all three drive sites; the
  initial auto-render deliberately does not fire.
- **Frequency verdict stays always-visible / toggle-live** (Beat 4), separate from the interactive matrix
  beat — the "verdicts differ" swap isn't gated behind the reveal, as intended.
- Documented deviations (Phase 5 not taken; buttons-not-radios; mask scoped to `:not([hidden])`; two
  comments reworded) are intentional, plan-sanctioned, and truthfully recorded — not issues.

## Note on process
This is the author's own PR (solo repo) — GitHub blocks the author from submitting a formal
approve/request-changes review, so this verdict is posted as a **comment** per the repo's standing
convention. The "Request changes" recommendation is advisory to the human, who merges.
