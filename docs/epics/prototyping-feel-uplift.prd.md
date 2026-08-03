# PRD — Prototyping-Feel Uplift

**Status:** planned · **Owner:** Linards Berzins · **Created:** 2026-07-30
**Architecture:** [prototyping-feel-uplift.architecture.md](./prototyping-feel-uplift.architecture.md)

## Problem

The portfolio explains a prototyping factory but does not yet feel like one. A reader lands on
pages that describe live systems in dense specialist language, and most of what they can do is
read and scroll. The site's strongest claim — "this is a working tool, not a brochure" — is made
in copy instead of being demonstrated under the reader's own cursor. Two symptoms:

1. **Too few things respond to the reader.** Roughly 20 live-manipulable controls exist site-wide
   today, and they cluster on two pages (home's drop zone + wizard, /build's questions + board).
   Factory, approach, and the proto pages are mostly view-only.
2. **The copy asks the reader to already know the domain.** Terms like token contract, derivation,
   vocabulary, and handoff pack appear before their plain meaning does. A recruiter in their
   90-second pass has to trust the site rather than verify it.

## Evidence

- Owner's own review across two iterations: "slightly better than last iteration, but still
  nowhere near the look and feel of a portfolio that is like a prototyping tool."
- Manipulable-control tally (hand count at planning, to be replaced by a generated number):
  ~20 site-wide, concentrated on 2 of 10 shipped pages.
- The 2026 web platform now covers most "live tool" affordances natively (spring easing via
  `linear()`, Popover API, anchor positioning, `@starting-style`, same-document View Transitions,
  `@property`) — the gap is adoption, not capability. Research report: see architecture doc §Research.

## Hypothesis

If every shipped page offers direct manipulation — inspect anything, scrub values, flip states,
re-skin live — and every section leads with one plain-English sentence before its precise term,
then a hiring manager will experience the site as a working prototyping tool within their first
minute, which the generated parameter count, milestone analytics routes, and INP budget can verify.

Falsifiable: if the generated manipulable-parameter count does not reach ≥40, or the interactive
surfaces miss the INP budget, or the milestone routes show readers never engage the new controls,
the hypothesis fails.

## Users

- **Primary:** hiring managers / recruiters doing a 90-second first pass. They need the tool feel
  and the plain-English register.
- **Secondary:** senior UX engineers doing a deep verification pass. They need the precise terms
  kept alongside the plain ones, and the inspect layer's real data (tokens, specs, measurements).

## Scope (MVP of this epic)

This is an **improvement wave over the shipped site, not a rebuild.** Every page keeps its
structure, honesty contract, and IA. The epic adds:

1. **Foundation primitives (site-wide):**
   - Spring motion: `linear()` spring easing + `@starting-style` entrances on existing
     transitions and disclosures, with `prefers-reduced-motion` off-ramps.
   - **Inspect mode:** hover/focus any instrumented component → an anchored popover showing its
     consumed tokens (current pack's resolved values), one spec-head line + handoff link,
     computed measurements, and one plain-English role sentence.
   - **⌘K command palette:** navigate pages/exhibits, toggle inspect mode, run actions
     (start a build, copy tokens, download the pack). Visible ⌘K hint in the site chrome.
   - **Generated parameter count:** a manifest-driven generator counts live controls; the number
     is drift-checked in CI and rendered on approach.html — never hand-typed.
2. **Wave 1 — Home:** inspect mount, scrubbable live values, before/after pack-comparison slider
   on the brand-import report, dual-register copy cut.
3. **Wave 2 — /build:** View Transition morphs between acts and board→pattern, inspect mount,
   springs, copy cut; then View Transitions extended to remaining state morphs site-wide.
4. **Wave 3 — factory + approach:** dual-register copy cut, inspect mounts, pan/zoom on the
   system graph, drag-to-scrub upgrade of the derive probe.
5. **Wave 4 — proto pages:** the site's pack skin + dock on Verdant/Fieldwork, visible
   action-bus state toggles, a resizable device frame, inspect coverage over vd-/fw- components.
6. **Close:** INP instrumentation + budget check, milestone analytics routes verified, final
   generated parameter count rendered.

**Copy operation everywhere a wave lands:** cut each section's first layer to 1–2 plain sentences
(what it is, why it matters), keep the precise term beside it, push detail into disclosures.
Every rewritten line passes the `/no-ai-slop` and `/humanizer` skills before commit.

## Success metrics

| Metric | Target | Measured by |
|---|---|---|
| Manipulable-parameter count | ≥40 site-wide (from ~20) | generated manifest count, drift-checked in CI, rendered on approach.html |
| Reader engagement | milestone virtual routes fire in production | 2–4 new synthetic paths (palette use, inspect use), same one-shot success-path discipline as `/factory/*` |
| Responsiveness | interactions on instrumented surfaces within INP "good" (≤200 ms) | native PerformanceObserver instrumentation + a tooling check |
| Jargon | every reader-facing section on all 10 shipped pages leads dual-register | copy audit in the closing ticket |

## Non-goals

- **No rebuild.** Page structure, IA, honesty contract, and evidence artifacts stay. *(Superseded 2026-08-03 by [prototype-studio.prd.md](./prototype-studio.prd.md) — epic #164 closes; unshipped scope folds into the studio epic.)*
- **No framework, no bundler, no runtime npm deps** — unchanged hard constraint. No vendored
  heavy libraries (tldraw, Excalidraw, CodeMirror, ninja-keys, interact.js all evaluated and
  rejected; patterns hand-written instead).
- **No Chrome-only load-bearing behaviour.** Chrome-only CSS ships only as cosmetic enhancement
  with a complete fallback; the site must feel whole in Safari and Firefox.
- **No new telemetry infrastructure.** CF Web Analytics' synthetic-path mechanism is the ceiling;
  no per-interaction event system, no Worker beacon endpoint.
- **No live LLM calls at view time** — unchanged.

## Open questions

- Which home elements carry scrubbable values beyond the existing derive-probe family — decided
  at Wave-1 ticket planning, not here.
- Whether the proto pages' pack skin extends `pack-boot.js`'s hard allowlist or mounts the dock
  only (VR implications) — decided in the Wave-4 ticket against the architecture doc's constraint
  notes.
