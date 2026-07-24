# Architecture — portfolio v3: the product-demo experience

Intent: implements [portfolio-v3-experience.prd.md](./portfolio-v3-experience.prd.md) (the demo-spine thesis, decisions D1–D11). Platform constraints inherited from [ai-first-ux-factory.architecture.md](./ai-first-ux-factory.architecture.md); per-company substrate from [per-company-brief.architecture.md](./per-company-brief.architecture.md). Research + decision record: `.claude/plans/ux-overhaul-v3-prd-research.md`. Craft rules: `.claude/skills/portfolio-design/`.

## Problem & goals

Turn the five-beat spine into buildable structure on the existing engines — no new engines, no new dependencies, vanilla throughout. Every decision below is judged against: does the evaluator experience proof (site builds, wears their brand, hands over an artifact) with zero possibility of on-stage failure, inside the honesty contract.

## Approaches considered

| Axis | Options weighed | Chosen |
| --- | --- | --- |
| **Hero liveness** | (a) scripted CSS-only build-in choreography · (b) real `derive()` run on load driving the re-skin beat · (c) canvas/WebGL scene | **(a)+(b) hybrid:** CSS choreography for the assembly (deterministic, cheap, VR-stable at final state); the re-skin beat applies a real derived pack via the same custom-property mechanism `derive.html` proves. (c) rejected: violates the calm register and the no-dependency rule. |
| **Spine hosting** | (a) new page · (b) `index.html` rebuilt as the spine · (c) factory.html promoted | **(b)** per D6. `factory.html` keeps its URL and becomes the evidence home; all existing `#` anchors and engine mount ids preserved (they are `getElementById` mounts — re-hosting is safe, verified list in the v2 handover). |
| **"Your brand" persistence (D5b)** | (a) stage-only custom properties, dies on navigation · (b) derived pack serialized to localStorage, re-applied pre-paint by an extended pack-boot branch · (c) generate + swap a real stylesheet blob like committed packs | **(b)** — one small guarded branch in `pack-boot.js`: committed packs keep the hard allowlist and line-swap exactly as today; a `derived` record applies custom properties on `:root` pre-paint. Default behaviour with no stored record stays a guaranteed no-op (the VR gate and first paint rely on that). (c) rejected: blob URLs complicate CSP/headers for no gain. |
| **Wizard rewrite** | (a) new module · (b) rewrite inside `factory-intake.mjs` behind the same mount ids + `initIntake(config)` seam | **(b)** — the instance shell consumes the same seam (wizard is shared, never forked — recorded decision). Stakeholder wording and asked-set move into `intake.defaults.json` (shape already carries `asked`/`default`/`reasoning` per question). |
| **Evidence re-homing** | (a) delete weak surfaces · (b) re-home everything, nothing floats | **(b)** per D8. Deep pages (`roundtrip`, `agentic-ui-study`, `handoff`) keep URLs; nav shrinks; the pack control is redesigned and introduced by the spine, gaining the `derived` entry + reset. |

## Key decisions

### Stack & structure
- **No new dependencies; no new engines.** The spine consumes `derive.mjs`, `factory-intake.mjs`, `agentic-renderer.mjs`, `trace-player.mjs`, `motion.mjs` as-is or via config seams. New view-time behaviour = hand-written ES modules beside `system/site.js` (`spine.mjs` — the beat-orchestration seam that #72 establishes and the later beats #73/#75/#77 plug their stage effects into; `pack-derived.mjs` for the D5b record).
- **New CSS organisms in `system/portfolio.css`**, token-only: `.band` / `.band--dark` (I2 chapter rhythm), `.beat-numeral` (I4 oversized numerals — pipeline order is a real sequence), `.row-list` (I3 arrow rows), `.close-card` (I6), extensions to `.btn` (I7 arrow-glyph hover motion). New tokens (any needed values + the three new motions: icon-morph, skeleton-to-content, tab-glide) enter `tokens.source.json` both groups → regen chain.
- **Derived-pack record (D5b), shape:** `{ v: 1, source: "derived", label: "<visitor-entered name or 'your brand'>", ts, tokens: { "--color-accent": "…", … } }` in localStorage. Pre-paint apply in the pack-boot branch; the pack control shows it as **"your brand — derived here, not an official <label> design system"** with a one-click reset to neutral. On private instances the company pack is a real committed stylesheet in the deploy dir — no derived record involved.
- **Analytics:** one additional virtual-route pageview `/factory/built` fired once when a visitor reaches the built-screen beat (same fail-closed pattern as `/factory/driven`).

### Boundaries (hard)
- **Nothing fails on stage:** every live moment (hero re-skin, wizard re-derive, brand apply) wraps in try/catch falling back to the committed neutral state — approach B, unchanged.
- **Honesty labeling for derived brands:** the derived pack is always labeled as derived-on-this-page speculation; a visitor-entered company name renders only inside that label, never as an affiliation claim. Traces/capability chips unchanged.
- **Reduced motion / no-JS:** the hero's no-JS and reduced-motion first paint IS the final assembled state; count-ups and draw-ins render final text/geometry instantly.
- **VR mode (D11):** on the `feature/v3-*` branch the visual-regression job runs non-blocking (workflow `continue-on-error` on that branch pattern); drift-check + token-lint stay blocking. Baselines regen at each phase-PR milestone and fully at final merge. At-rest states are designed VR-stable from the start (rest == final).

## Build phases (appetite 3–4 weeks, D7)

**Execution decomposition (epic [#70](https://github.com/linardsb/ux-factory/issues/70)):** these four phases are sliced into **12 PIV tickets (#71–#82)** — the phase boundaries are preserved as ticket groups, and the ticket graph on the epic is the authoritative execution order. This doc stays the epic-level *how*; each ticket carries the ticket-level *how*. The spine's five beats do not map one-to-one onto phases — P1 scaffolds all five statically, P2 wires the interactive loop (beats 2–4), P3 is the evidence sweep:

| PRD beat | Phase | Ticket(s) |
| --- | --- | --- |
| 1 · instant proof (hero) | P1 | #71 static skeleton · #72 live choreography + one real re-skin |
| 2 · you brief it (intake + your-brand) | P2 | #73 intake rewrite · #74 your-brand + persistence |
| 3 · it builds (**the peak**) | P2 | #75 built-screen peak |
| 4 · you keep it (**investment close**) | P2 | #77 investment close |
| — · wear it (pack control) | P2 | #76 redesigned pack control |
| 5 · verify (evidence layers) | P3 | #78 evidence home · #79 library grid · #80 approach/work · #81 instance spine |
| craft / validate | P4 | #82 hallway + regen + merge |

1. **P1 — Spine skeleton + hero + band system.** index.html rebuilt: five beats, band rhythm, numerals, close card; CSS choreography hero + one real re-skin beat; nav shrink. Height budget: spine ≤ ~7,500px at rest, each beat ≈ one viewport of core content.
2. **P2 — the demo loop: intake · your-brand · the peak · the close · pack control.** Stakeholder wording into both `intake.defaults.json`, wizard re-skinned through the seam, bounded brand input, `pack-derived.mjs` + pack-boot branch; **the built-screen peak (beat 3 — committed `proto/compositions/` re-rendered under the answers/brand + WCAG receipts + the Manipulation-Matrix ethics gate; no view-time generation)**; **the investment close (beat 4 — takeaway handoff link + shareable URL-state + contact)**; redesigned pack control with derived entry + reset; `/factory/built` event.
3. **P3 — Evidence re-homing + library grid + instance pass.** factory.html as evidence home (anchors preserved), Approach tightened, Work as proof index, component library grid (live cards), instance.html gets the spine treatment via config (never forked). Absorbs the two named fixes from closed issue #69: the study-preview stacking bug (`.study-preview--insight-panel` max-width leaves tiles in a narrow column) and handoff.html's missing site chrome.
4. **P4 — Hallway rounds + regen + merge.** (The §6.4 craft bar + motion polish are per-surface acceptance on every P1–P3 ticket — each new motion token lands with its consumer, since the lint rejects unused tokens — not a separate polish phase.) Hallway round 1 → fix biggest finding → round 2 (D10), full generator + baseline regen, merge with VR re-blocking.

## Missing pieces

`spine.mjs` (beat orchestration + hero choreography trigger) · `pack-derived.mjs` + guarded pack-boot branch · stakeholder question copy (both scenarios) + asked-set final cut (PRD open question, closes in P2) · band/numeral/row-list/close-card CSS organisms + new motion tokens · library-grid card organism with press/hover demos · redesigned pack control · evidence-home restructure of factory.html · built-screen-peak wiring (committed `proto/compositions/` re-rendered under the answers/brand + WCAG receipt draw-in + ethics gate) · beat-4 investment close (handoff link + shareable URL-state encode/decode + contact) · hallway-test script + notes template.

## Spikes (before or inside P1)

1. **Hero choreography perf** (~0.5 day): prototype the assembly on a mid-tier machine; decision rule — solid 60fps under CPU throttle or simplify to fewer moving parts (opacity/transform only, ≤8 simultaneously animating elements).
2. **Pre-paint derived apply** (~0.5 day): verify no flash-of-neutral on navigation with the localStorage branch across Safari/Chrome/Firefox; decision rule — imperceptible flash or fall back to stage-only application (D5b degrades gracefully, PRD stays honest about it).
3. **Intake wording dry-run** (~0.5 day, can fold into hallway round 1): 2–3 cold readers answer the rewritten questions; decision rule — zero "why am I being asked this" reactions or reword before P2 merges.

## Open questions

- [ ] Asked-set final cut + exact stakeholder wording (P2; spike 3 informs).
- [x] Approach page vs spine-section — **resolved in P3c (#80, 2026-07-24): tight page** (D6 default held). Approach is a standalone method page (hero → method → in practice → sources), not a spine section; Work became the proof index. Owner confirmed "Tight" + "Relocate + index"; neither reads thin at the §6.4 craft bar.
- [ ] Whether the derived record also persists the visitor's intake answers (nice for "resume where you were"; privacy-neutral since localStorage only — decide in P2).
- [ ] Second hallway round scope: same testers or fresh (fresh preferred; recruit during P3).
- [ ] Component-library-grid host — `work.html` (proof index) vs `factory.html` (evidence home): default `work.html`, revisit after P3a settles the evidence-home restructure (#79 coordinates the shared file either way).
