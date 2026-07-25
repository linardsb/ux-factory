# PRD — portfolio v3: the product-demo experience

**One-line vision:** the portfolio is a product demo in which the evaluator watches their own product take shape — the factory's engines unchanged, the experience rebuilt around the reader.

**Relationship to the platform PRD:** layered over [ai-first-ux-factory.prd.md](./ai-first-ux-factory.prd.md). That PRD keeps governing the engines, honesty contract, scenarios, and per-company substrate. This PRD governs the reader-facing experience and **explicitly amends two of its clauses** (see §8). Decisions here were resolved interactively with the owner on 2026-07-22 (grill session, D1–D11); research base: `.claude/plans/ux-overhaul-v3-prd-research.md`.

---

## 1. Problem Statement

Two shipped versions of the portfolio failed the owner's own read ("nowhere near where it should be" for £70–80k London design-engineer roles), despite strong and honest engineering underneath. The root cause is framing, not polish: the site is organized around the factory's anatomy (stations, traces, packs, graphs) instead of the evaluator's question ("can this person do the job for *us*?"). Specific failures, evidenced in the v2 audit:

- The behavioural method (Hooked) is displayed as content but never applied to the site's own reader — no designed trigger→action→reward→investment path through a visit.
- The shaping method (Shape Up) appears as words on the Approach page; the reader's journey was never breadboarded, so pages grew by accretion.
- The intake wizard — the strongest asset — ships raw engine parameters ("reward type", "frequency", a colour input with no stated purpose) instead of the stakeholder conversation the platform PRD §6 designed.
- There is no peak moment and the hero is static text, while the market bar for this role treats the site itself as a graded work sample.

## 2. Evidence

| Signal | Status |
| --- | --- |
| Owner verdicts after v1 and v2 ("no one will hire the person who built this"; "a little better, nowhere near") — two consecutive self-assessed ships that failed the first external-style read. | **Evidence** — recorded in the v2 audit + handover. |
| First-pass screening is ~5 seconds for role fit, 60–90 seconds total; outcomes before process; the candidate is judged on the weakest visible thing. | **Evidence** — hiring-practice research, sources in the research doc. |
| For design-engineer roles the site itself is screened as a work sample: custom interactions, reasoned motion (not installed libraries), from-scratch components, obsessive empty/error/loading states, real accessibility. | **Evidence** — Cadence hiring rubric + Vercel design-engineering charter (research doc §2). |
| Interactive toys with no functional tie to a real capability read as decoration and count against the candidate. | **Evidence** — anti-pattern research; matches the owner's own "weird colour selectors, for what, no idea" verdict on the v2 dock. |
| The practitioner market is moving to designers delivering working, token-governed code via AI tooling (Claude Code as the primary tool, design-QA diffs, patchable prototypes). | **Evidence** — Stickell, "Moving design closer to code" (owner-supplied); validates the factory's positioning. |
| The per-company substrate needed for the reusable demo already exists and is merged: brief → compiled scenario package → derived pack → instance shell → unlisted deploy, measured under one minute. | **Evidence** — epic #38, tickets #39–#44, all merged; spike outcomes in per-company-brief.architecture.md. |
| The in-browser derivation engine can carry a live hero and a "try your brand" input with a guaranteed fallback. | **Evidence** — derive.mjs runs at view time today (derive.html, factory wizard); approach-B fallback already designed. |

## 3. Thesis — why rebuild the experience

The only first 90 seconds that can prove senior UX-engineering judgment is one that *performs* it on the visitor. v1/v2 asked the evaluator to decode an archive; v3 walks them through a demo in which the subject is their own product: the site visibly builds itself, they brief it in product language, a real screen assembles under their brand with the accessibility receipts showing, and they leave holding an artifact. The archive — traces, diffs, graphs, specs — remains, demoted to evidence layers for the panel's deep-diver. Same honest substrate; the experience finally makes the argument the substrate was built to make.

## 4. Hypothesis

> **We believe** rebuilding the portfolio as a guided product demo — a self-building hero, a stakeholder-worded intake whose every answer visibly steers the stage, a peak moment where a product screen assembles under the visitor's own brand, and a takeaway artifact —
> **will cause** hiring teams for senior UXE/design-engineer roles in the £70–80k London band
> **to experience the candidate's judgment instead of reading claims about it,**
> **resulting in** the platform PRD's unchanged primary outcome: artifact-driven interviews.
>
> **We'll know we're RIGHT if:** both hallway-test rounds show cold readers answering "what does this person do, and is it senior work?" correctly within the first 90 seconds AND reaching the built-screen peak unprompted; then ≥1 artifact-driven interview within the first ~10 applications (platform PRD §4, unchanged).
>
> **We'll know we're WRONG if:** hallway testers stall or misread the site the way v1/v2's readers did — that falsifies the experience redesign regardless of application outcomes — or the platform PRD's WRONG condition fires downstream.

## 5. Target User & JTBD

Unchanged from the platform PRD §5 (hiring manager + panel; recruiters get the gate layer), with one sharpening: **the first 90 seconds are now designed for the primary user too**, not only for recruiters. The platform PRD's "not optimized for the 90-second scan" non-goal is amended (§8) — screening research says the hiring manager's own first pass is a scan, and losing them there forfeits the deep layer entirely.

## 6. Scope — the five-beat spine plus the full sweep

Appetite (owner-set, 2026-07-22): **three–four weeks, fixed.** Scope below is designed to fit it; if the circuit breaker trips, the hammer order in §6.3 applies — the spine itself is never cut.

### 6.1 The spine (Home becomes the demo — D6)

1. **Instant proof (0–10s).** Self-building hero (D2): components assemble with the spring vocabulary, the stage re-skins once, the billboard line states the visitor's outcome in plain words. Reduced motion renders the final state instantly; the at-rest end state is the VR-stable state.
2. **You brief it (10–60s).** The intake rebuilt in stakeholder language (D4): 4–5 questions drawn from the platform PRD §6 / Hooked-workbook set (what problem, who exactly, what behaviour and how often, the ethics pair), each with a recommended default and its reasoning, each answer producing a visible change on the stage. Engine parameters are derived from the answers, never shown raw. Bounded "try your brand" input (D3): a brand colour (optionally a company name for labeling) pulls the visitor's own product into the demo.
3. **It builds (the peak).** A product screen assembles under the visitor's answers and brand — components snapping in, WCAG checks drawing in as receipts, the Manipulation-Matrix ethics gate as the one guess-then-reveal beat. Visually singular: nothing else on the site competes with this moment.
4. **You keep it (investment).** The output is takeaway-able — the handoff pack, a shareable state — closing on "this is what I'd do for your team in week one" and the contact action.
5. **Verify if you want (evidence layers).** Traces, round-trip diff, system graph, WCAG tables, annotated source, the study — re-homed one disclosure deep behind the spine (D8: nothing floats, nothing orphaned). Raw benches stay unlisted.

**Wear it while you explore (D5b — owner addition, 2026-07-22).** The side pack control survives as the one persistent utility — redesigned and introduced by the spine's narrative, never an unexplained widget. From it the evaluator selects the brand design system the whole portfolio wears while they explore: the committed packs plus, once derived, **"your brand"**; on a private per-company instance the company's pack sits there pre-selected. This is the re-skin claim held continuously, not shown once: every page they visit afterwards is proof.

**Colour on stage (D5 — amended rule):** site chrome stays calm monochrome + one blue; the visitor's derived brand genuinely takes the demo stage for their session — and site-wide when they choose it from the pack control (D5b). Colour is demonstration, never decoration.

### 6.2 The full sweep (owner chose the wide appetite — D7)

Beyond the spine: evidence-layer redesign to the same craft bar (not v2 styling behind new doors) · the component library presented as a live grid (one card = one thing, hover/press demos — the Kinetics presentation model on our real components) · Approach shrunk to a tight method page; Work becomes the proof index · the per-company private-instance shell gets the same spine experience, pre-seeded from the company brief (public = the capability demonstrated; private = the capability applied to *this company*) · two hallway-test rounds (D10) with the biggest finding fixed between rounds.

### 6.3 Scope-hammer order (if the circuit breaker trips)

First cut: per-company instance UX pass (ships with the current #43 shell) → second: library grid (components stay presented as today) → third: evidence-layer redesign depth (v2 styling survives behind the spine). Never cut: the spine, the intake rewrite, both hallway rounds.

### 6.4 Craft acceptance bar (D9 — "amazed" as a checklist)

Every v3 surface passes: the Cadence design-engineer rubric self-audited 6/6 (custom interactions · reasoned motion · from-scratch components · obsessive empty/error/loading states · real accessibility · performance) · the Vercel DE charter for interaction QA (no dropped frames, no cross-browser inconsistencies — real Safari/Chrome checks per phase; the VR gate's single-engine blindspot is recorded) · book-derived heuristics as review questions: peak-end, aesthetic-usability, billboard clarity, immediate mapped feedback, recognition over recall, novelty budget spent only on the spine's hero moments. Motion additions (icon-morph, skeleton-to-content, tab glide) are re-derived into tokens from spring physics — never copied from Kinetics (no license). Build sessions run under the house `portfolio-design` skill (`.claude/skills/portfolio-design/`), which combines the Anthropic frontend-design direction layer, the strongest community craft rules (interface-design lineage: type ratios, 60/30/10, easing discipline), and the web-interface-guidelines correctness checklist — all bound to this repo's tokens, motion vocabulary, and recorded traps.

## 7. Success Metrics

| Metric | Target | How measured |
| --- | --- | --- |
| Hallway comprehension (leading, new) | Cold readers state what the candidate does + reach the peak unprompted, both rounds | D10 hallway tests, notes per session |
| Spine completion (leading, new) | Visitors who start the intake reach the built-screen moment | existing cookieless analytics ("factory driven" event family; exact instrumentation is an architecture call) |
| Artifact-driven interview (primary, unchanged) | ≥1 within first ~10 applications | platform PRD §7 application log |
| Forwarded internally (unchanged) | ≥1 observed | platform PRD §7 |

## 8. Non-goals & amendments

**Amendments to the platform PRD (explicit, owner-approved 2026-07-22):**
- *"Not optimized for the 90-second recruiter scan"* → **replaced.** The first 90 seconds are now a designed surface for all readers. The deep evidence layer remains for panels.
- *Calm-colour rule (2026-07-19)* → **amended per D5/D5b:** calm chrome retained by default; the visitor's derived brand takes the demo stage during their session, and the whole site when they select it from the pack control.
- *"No habit mechanics"* → **retained and clarified:** still no return-visit optimization; the Hook Model explicitly shapes the single-session journey (trigger → action → variable reward → investment), with the investment step being the takeaway/forward.

**Unchanged hard constraints:** vanilla shipped pages (no framework, no build step, no view-time LLM) · honesty contract (fictional labels, "real run, curated", truthful capability chips — visible at rest) · token discipline · no real-company content in the public repo · humanizer copy rules · accessibility as a first-class requirement.

**Non-goals for v3:** no new engines (experience work rides the existing derive/renderer/trace substrate) · no third scenario · no arbitrary free-text product input (the "try your brand" surface is bounded: colour + name label only) · no framework exceptions for the hero (spring vocabulary + view transitions only) · no public upload surface.

## 9. Open Questions

- [x] Intake final cut — **resolved (#73, 2026-07-23).** Home asks **3** of the eight §6 questions — density, reward, frequency — each stakeholder-worded and answered by picking a recommended option, never a raw engine parameter; the engine params (`density`/`rewardType`/`frequency`) are derived behind the scenes and shown only as output in the narrative. Brand colour moves to #74 (`#beat-brand`); the Manipulation Matrix to #75 (`#beat-peak`); home keeps only the live frequency→verdict line. The wizard is the shared `system/factory-intake.mjs`, configured Verdant-only via `initIntake({ askedAxes:['density','rewardType','frequency'] })` — not forked (factory.html keeps all 4 axes; instance keeps its own config). Wording: Q1 (density) "What kind of product is it, and how do people use it?" · Q2 (reward) "Who is it for, and what brings them back?" · Q3 (frequency) "How often would someone realistically do the core thing?"
- [ ] "Try your brand" labeling — how the visitor-entered company name renders honestly (it must never imply affiliation or a real engagement).
- [ ] Hero at-rest contract — the exact final state that VR baselines capture, and what the no-JS/reduced-motion first paint shows.
- [ ] Whether Approach survives as a page or becomes a spine section at the evidence layer's head (D6 default: tight page).
- [ ] VR milestone cadence on the v3 branch (D11: frozen non-blocking, regen at phase milestones — define the milestones in the architecture doc).
- [ ] Analytics events for spine completion — within the existing cookieless one-event pattern or a second virtual route.
- [ ] Site-wide persistence of the derived "your brand" pack (D5b) — the committed packs persist via the hard-allowlisted pack-boot.js line swap, but a visitor-derived pack is not a committed stylesheet; carrying it across pages pre-paint (storage format, allowlist posture, VR implications, honest labeling as "derived, not official") is an architecture decision, not a drift.

---

Research + decision record: `.claude/plans/ux-overhaul-v3-prd-research.md` (D1–D11).
Architecture: [portfolio-v3-experience.architecture.md](./portfolio-v3-experience.architecture.md) (spine structure, D5b persistence mechanics, build phases P1–P4, spikes, VR strategy).
