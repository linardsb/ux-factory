# V3 research synthesis — why v1/v2 missed, and the PRD delta to grill

Written 2026-07-22. Inputs: `.claude/plans/ux-overhaul-handover.md`, `.claude/plans/enchanted-snuggling-hejlsberg.md` (full v2 audit), `__UX_UI_Research.md` (the four-layer operating model), the Hooked workbook (`../product development/Hooked_Workbook_0415.pdf`, text-extracted), `docs/epics/ai-first-ux-factory.prd.md` + `per-company-brief.architecture.md`, plus fresh web research: uxfol.io book list, acmeminds enterprise-UX pages, the London design-engineer hiring bar, Matt Pocock's grilling skill, kinetics.colorion.co, maze.co/features/prototype-testing, and Claude Code frontend skills.

Owner's brief for v3, condensed: v2 is "alright but nowhere near" the bar for £70–80k London roles. The Nir Eyal and Ryan Singer concepts were practically ignored in the built experience. The wizard reads as "weird colour selectors, for what exactly, no idea." The portfolio must be interactive, smooth, a UX masterpiece the hiring team goes through and is amazed. Core new requirement: **"I should be able to build a digital product in the portfolio's UI for the job I'm applying to — reusable for each company I apply to."**

---

## 1. Why v1 and v2 failed (root causes, not symptoms)

The v2 audit fixed symptoms (density, copy, motion). These are the causes underneath, and none of them were addressed:

**RC1 — Built inside-out: organized around the system, not the reader.**
The IA is the factory's anatomy: stations, traces, packs, graphs, drift checks. The reader's question — "can this person do the job for *us*?" — never structures the experience. The audit's own words: "an archive you decode, not a demo you are guided through." v2 compressed the archive; it did not change what the site *is*.

**RC2 — The behavioural layer points at the fictional products, never at the reader.**
Hooked and Fogg appear as *content* (wizard inputs named "reward type", "frequency") instead of being *applied to the portfolio's own user*. The PRD clause "no habit mechanics — visit-once utility" was over-read as "no Hook thinking at all." The Hook Model runs perfectly well once, within a single session:
- **Internal trigger:** the evaluator's skepticism ("another portfolio of claims — is this person actually senior?"). The site must meet that emotion in the first seconds, not describe a factory.
- **Action (B=MAP):** one near-zero-friction first act. Today the first act is *reading*. The friction audit (Hooked Ex 3: time, brain cycles, non-routineness) was never run on the site's own funnel — brain-cycle cost is enormous (jargon, walls, disclosure-behind-disclosure).
- **Variable reward:** a live system producing something unpredictable *for them* (hunt: real proof discovered; self: they drove it and it responded). Genuine, not gamified.
- **Investment:** the reader's inputs produce an artifact they keep or forward — and "forwarded internally" is literally the PRD's own success metric. The Hook's investment stage and the PRD's referral metric are the same thing; nobody wired them together.

**RC3 — Shape Up appears as words, not as method.**
No breadboard of the reader's flow exists anywhere (places → affordances → connections). No appetite per surface — factory.html grew to 15,000px by accretion. Fat-marker altitude missing: every page tries to do everything. Ryan Singer would shape *the reader's journey* first and let pages fall out of it; we shaped pages and hoped a journey would emerge.

**RC4 — The wizard (the crown jewel) reads as "weird colour selectors."**
Its four questions are *engine parameters* (brand colour, density, reward type, frequency), not the stakeholder conversation the Hooked workbook models (What problem are users solving? Who exactly is the user? What behaviour, how often? Does it improve lives — would you use it?). Each answer's consequence is under-dramatized, and nothing connects the wizard to the *reader's* company or product. The PRD §6 draft had 8 stakeholder-worded questions with sources; the built wizard shipped the 4 rawest engine inputs.

**RC5 — The craft bar was calibrated to "clean", not "amazed."**
The hiring research is unambiguous: for this role the site itself is graded as a work sample (Cadence rubric: custom interactions, animation fluency reasoned not installed, from-scratch components, obsessive empty/error/loading states, real a11y — 4 of 6 = legitimate candidate). Aesthetic-usability effect: the first 3 seconds must look inevitable. Peak-end rule: one unmistakable peak + a strong end. v2 has no peak; the hero is static text; motion is competent garnish on an unchanged meal.

---

## 2. What the research says (condensed)

**Hiring bar (London, £70–80k = solid senior IC, slightly below the ~£87.5k London senior median):**
- First pass is 5 seconds for role fit, ~60–90 seconds total. Role and outcome must be legible above the fold. Generic taglines fail instantly.
- Judged on the *weakest* project — 3–5 tight things beat a gallery. Outcomes before process.
- The reference tier is rauno.me / Emil Kowalski / Paco Coursey: invisible details, restraint as confidence, every interaction earning its place. Bruno Simon lesson: if you build a device/gimmick, commit totally — it becomes the site, not a bolt-on.
- Anti-patterns that read as disqualifying: template-identical sites, dribbble-shots without process, walls of process without a shippable artifact, interactive toys that map to no real capability ("colour selector with no purpose" is verbatim this), broken/slow anything.
- Vercel's DE charter as the working QA bar: polished interactions, no dropped frames, no cross-browser inconsistencies, accessibility — tempered by "iterate to greatness."

**Books (uxfol.io list — top cross-book principles, ranked for "amazed"):**
1. It actually runs, live, inspectable — state it explicitly (Norman conceptual model + Hooked investment).
2. Peak-end rule — engineer ONE peak and a strong close (Yablonski).
3. Aesthetic-usability — first 3 seconds look inevitable.
4. Immediate, mapped feedback on every control — drag → see consequence (Norman).
5. Billboard clarity on Home — value legible in a glance (Krug).
6. Hook investment, ethically — the reader *does* one real thing; participation beats reading.
7. Von Restorff — the one thing to be remembered must be visually singular. One. Not seven exhibits.
8. Story over feature list — one arc: brief → system → product → handoff (Weinschenk).
9. Recognition over recall — zero jargon, zero mental translation.
10. Jakob's law — conventional everywhere EXCEPT the 1–2 hero moments; novelty is a budget.
Also: Krug's "test with 3–5 real people, fix the biggest thing" — v3 should gate on hallway tests, not self-assessment.

**Enterprise-UX checklist (acmeminds — thin content, but usable as an embody-vs-showcase split):** task clarity per screen · progressive disclosure · consistency · error prevention · power-user paths · accessibility as first-class · role-based views (showcase via Fieldwork) · measurement by operational impact. The pages' own gaps (no tokens, no AI-as-practice, no performance) are exactly where this portfolio out-credentials the market — exploit, don't mirror.

**Maze reference (owner likes it):** classic SaaS demo funnel — hero states the *user's outcome* ("Test prototypes to validate ideas faster"), product shown working, CTAs at every natural decision point, specificity as credibility. Notable: Maze only uses static screenshots — a live-running portfolio beats the reference on its own terms. Import the *funnel shape and confidence*, not the aesthetics.

**acmeminds.com homepage (owner reference — FEEL AND INTERACTION ONLY, explicitly NOT a design to copy in any one-to-one sense; owner said this twice, treat it as hard):** screenshotted top to bottom 2026-07-22. What the *feel* is made of — abstract qualities v3 must achieve with its OWN design language, never by transplanting their layouts:
- **Q1 Decisiveness.** Every screen commits to one idea stated at large scale; nothing hedges. The confidence comes from hierarchy and scale contrast, not colour or ornament.
- **Q2 Instant legibility.** You always know within a second what a section is and what it wants you to do. Zero decoding effort anywhere.
- **Q3 Unambiguous tactility.** Everything clickable announces itself (clear affordances, generous targets, visible hover response); nothing makes you wonder "is this interactive?"
- **Q4 Chapter pacing.** The page reads as distinct acts with clear value/tone shifts between them — a rhythm you feel while scrolling, not a uniform scroll of cards.
- **Q5 System consistency.** One button language, one heading pattern, one card grammar, used identically everywhere — the consistency itself reads as craft.
- **Q6 A confident, quiet close.** The page ends on one simple, self-assured action, not a pile of links.

And the concrete pattern ideas the owner liked (2026-07-22 — KEEP these; they are ingredients to ADAPT into our own token/motion language, never cloned wholesale). Each is legitimate v3 raw material where it serves a spine beat:
- **I1 Massive verb-first hero type.** Display headline at enormous scale, one-sentence sub, primary+secondary CTAs directly beneath — confidence from scale contrast, not colour. → the D2 hero's billboard treatment.
- **I2 Light/dark band rhythm.** Alternating near-white/near-black full-bleed sections chapter the page with zero colour spend; a dark band carrying one big statement reads as a beat change. → the spine's acts get value contrast inside the calm rule.
- **I3 Row-list with arrow affordances.** One item per row, hairline dividers, a circular arrow affordance per row — scannable, tactile, obviously clickable. → the evidence index / Work proof list.
- **I4 Oversized numerals on dark cards.** Cards anchored by big 01/02/03 numerals + title + one line. → the spine beats/stations; independently confirms the handover's researched-but-unbuilt "oversized station numerals" idea. (Heed the frontend-design skill's caveat: numbering must encode a real sequence — ours does, the pipeline is genuinely ordered.)
- **I5 Statement + interactive list split.** Big claim left, interactive list right, one screen. → matches our two-column stage; reuse for evidence chapters.
- **I6 Single-card close.** One floating card, one sentence, one action. → the spine's "you keep it" close: one card, "let's build yours", contact.
- **I7 One pill-button system with arrow glyphs everywhere** — consistency as the craft signal. → our .btn family + a token-driven arrow hover motion.

How the two lists compose: the Q-qualities are the acceptance bar, the I-patterns are the starting vocabulary. Every I-pattern gets re-expressed through our tokens, spring motion, and the demo-spine concept — adapted until it reads as this site's own language, not acmeminds'.
- **Anti-lesson observed live:** their stats bar renders "0+ Years / 0% Retention" until JS counts up — a hydration-dependent claim that fails visibly. Our count-up discipline (final state = real text, instant under reduced motion) already avoids this; keep it hard.
- **Not for us regardless:** the red accent, stock/AI imagery, autoplay carousels, marketing-superlative copy.

**Kinetics (kinetics.colorion.co):** spring-physics presets (~117), each with live stiffness/damping. Calm-appropriate subset ≈ what v2 already built (squish, draw-in, count-up, stagger, pill-glide) plus unexploited ones: icon-morph-swap, skeleton-to-content, elastic progress, hold-to-confirm, tab pill glide. License unstated, no public repo → use as tuning reference only, values re-derived into our tokens; never import code. The deeper import v2 missed is Kinetics' *presentation model*: one card = one thing, live preview per item, the library grid AS the interface — we have real components and never present them this way.

**Grilling skill (mattpocock/skills — verbatim mechanics):** interview relentlessly until shared understanding; walk the decision tree, resolving dependencies one by one; ONE question at a time (batching is "bewildering"); every question carries the interviewer's recommended answer; facts get looked up, decisions get asked; nothing proceeds until the owner confirms shared understanding. This is the process for §4 below.

**Practitioner validation (Heather Stickell, "Moving design closer to code", LinkedIn — owner-supplied):** a working designer whose main tool is now Claude Code, delivering working front-end prototypes (design-QA diffs, iteration docs, patchable code) instead of static comps, with the design system enforced by feeding tokens/component rules to the AI up front. Confirms the market is moving exactly where this portfolio sits, and adds three provables for the demo: iteration speed on working prototypes, consistency auditing across a product, and deliverables engineers accept as-is (the handoff pack's job). The v3 story should name this workflow shift plainly — the factory is that workflow, productized.

**Claude Code frontend skills worth adopting:** `frontend-design` (anthropics/claude-code plugin — distinctive, intentional UI direction, anti-generic) — install and use during v3 build sessions. `web-artifacts-builder` — NOT applicable (React/build-step, violates vanilla constraint). BehiSecc/awesome-claude-skills as a discovery index.

**Hooked workbook — the actual question set (Ex 1–7, extracted):** Ex1: what problem, how solved today, what behaviour, how often (frequency filter). Ex2: who exactly (name a real person), what happens right before, 5-whys to internal triggers, the narrative ("Every time X feels Y, they Z"). Ex3: count steps trigger→outcome, circle the ability limiters (time/money/effort/brain cycles/social deviance/non-routine), three testable frictions removed. Ex4: which reward type (tribe/hunt/self). Ex5: what bit of work stores value and loads the next trigger. Ex6: Manipulation Matrix. Ex7: habit testing (identify/codify/modify). These are the source wording for the intake rewrite (RC4) AND the checklist to run on the portfolio itself (RC2).

---

## 3. The v3 reframe (draft thesis — to be grilled, not assumed)

> **The portfolio is a product demo in which the evaluator watches their own product take shape.**

One spine, five beats (the breadboard's places):

1. **Instant proof (0–10s).** The hero is not text about a factory — the site visibly builds/re-skins itself as you arrive. Billboard line states the reader's outcome, not the mechanism. This is the aesthetic-usability + conceptual-model moment: "this thing is alive."
2. **You brief it (10–60s).** The wizard, rewritten in Hooked-workbook stakeholder language (3–5 questions, each with a recommended default + reasoning, each answer *visibly* changing the stage). No engine jargon. The reader's brand colour becoming the stage's accent is the emotional pivot: the site starts wearing *their* product.
3. **It builds (the peak).** A real product screen assembles under their answers — components snapping in with the spring vocabulary, WCAG receipts drawing in, the ethics gate as the one guess-then-reveal beat. This is the Von Restorff moment; everything else on the site defers to it.
4. **You keep it (investment).** The output is takeaway-able: the handoff pack, a shareable state, the "this is what I'd do for your team on week one" close. The forward IS the metric.
5. **Verify if you want (evidence layers).** Approach, traces, round-trip, system graph, study — demoted from destinations to evidence behind the spine, one disclosure deep, for the panel's technical deep-diver.

**Per-company reuse (the owner's core requirement) is the same spine, pre-seeded.** The substrate already exists and is merged (#39–#44): company brief → compiled scenario package → derived pack → instance shell → unlisted deploy in under a minute. What v3 adds is the *experience*: the public site runs the spine on fictional scenarios plus a bounded "try it with your brand" input; each application's private link opens the spine already wearing that company's design language with the wizard pre-seeded from their public statements. Public = the demo of the capability; private = the capability applied to *you*.

**What this reframe deliberately revisits (recorded decisions — must be amended explicitly, not drifted past):**
- PRD non-goal "Not optimized for the 90-second recruiter scan" → v3 optimizes the first 90 seconds *hard* (the research is unanimous). The deep layer stays for panels.
- "No habit mechanics" → unchanged as written (no return-visit optimization), but re-scoped: the Hook Model explicitly SHAPES the single-session journey.
- Calm-colour rule → decision D5 below; the recommended amendment keeps calm chrome but lets the reader-derived brand colour take the stage during the session (colour as demonstration, not decoration).

---

## 4. The decision tree for the grill (one at a time, each with a recommendation)

Run per the grilling method: one question per turn, recommended answer stated, facts looked up not asked, no build until shared understanding is confirmed.

- **D1 — Product thesis.** Product-demo spine ("watch your product get built") vs keep verifiable-archive + more polish vs private-instances-first. **Rec: demo spine; archive becomes evidence layers.**
- **D2 — The hero moment.** Site visibly builds/re-skins itself on arrival (derive.mjs is in-browser; technically cheap) vs static hero + CTA into the demo. **Rec: live hero — the single highest-wow move already identified in the handover.**
- **D3 — Public input scope.** Bounded "try your brand" (colour and/or company name → live derivation on stage) vs fictional scenarios only. **Rec: bounded live input — it's the thesis performed; guardrails via the existing engine bounds + fallback.**
- **D4 — Intake rewrite.** Hooked-workbook stakeholder wording, 4–5 asked, every answer with visible consequence vs keep current 4 engine params. **Rec: rewrite; the PRD §6 draft already contains the right questions — ship what was designed.**
- **D5 — Calm-colour amendment.** (a) strict monochrome everywhere; (b) calm chrome + reader-brand accent takes the stage during the session; (c) full palette revisit. **Rec: (b) — explicit owner sign-off required (recorded 2026-07-19 rule).**
- **D6 — IA.** Collapse to spine + evidence layers (Home *is* the demo; Factory/Approach/Work reorganized beneath it) vs keep 5-page IA and re-skin surfaces. **Rec: collapse; five pages was an archive decision.**
- **D7 — Appetite.** Owner sets the time budget for v3 (sessions/weeks) + the scope-hammer order. **Rec: fixed appetite, cut scope never extend; name no-gos up front (e.g. no new engines, no framework, no third scenario).**
- **D8 — Kill list.** Which v2 surfaces survive as evidence layers vs die: roundtrip page, study page, approach essay, dock pack-switcher (the "what is this for" offender), system graph, trace players. **Rec: nothing public dies unexplained — each either serves a spine beat, moves one disclosure deep, or is delisted from nav.**
- **D9 — Craft substrate.** Install `frontend-design` skill for build sessions; re-derive 2–3 kinetics-tier motions into tokens (icon-morph, skeleton-to-content, tab glide); define the QA bar as Cadence 4/6 + Vercel DE charter + real-browser checks (VR gate blindspot is recorded). **Rec: yes to all three.**
- **D10 — The v3 gate.** Before applying: 3–5 hallway tests with hiring-manager-profile people (Krug), fix the biggest finding, then ship. **Rec: yes — v1 and v2 both shipped on self-assessment and both failed the owner's own read.**
- **D11 — VR baseline strategy during overhaul.** Every at-rest change churns 18 Docker baselines. Options: regen per PR (slow, honest) vs freeze the gate on a branch until v3 lands, one regen at the end. **Rec: freeze on the overhaul branch, regen once at merge — with the owner's explicit OK since it suspends a CI gate.**

## 4b. Decisions locked (grill session, 2026-07-22 — owner's answers)

- **D1 thesis:** product-demo spine — the evaluator watches their own product take shape; archive becomes evidence layers.
- **D2 hero:** self-building hero — components assemble on arrival, one visible re-skin, reduced-motion gets final state instantly.
- **D3 public input:** bounded "try your brand" — visitor enters a brand colour (optionally company name for labeling), spine builds under their brand via the existing derive engine.
- **D4 intake:** rebuilt on the PRD §6 / Hooked-workbook stakeholder questions, 4–5 asked, recommended default + reasoning each, every answer visibly changes the stage; engine params derived behind the scenes; ethics gate stays the guess-then-reveal beat.
- **D5 colour (rule amended by owner):** calm monochrome+blue chrome; the visitor's derived brand genuinely takes the demo stage during their session. Amends the 2026-07-19 calm-colour rule — explicit owner decision, this session.
  - **D5b addition (owner, same day, with dock screenshot):** the brand takeover is not stage-only — the hiring manager can select their brand design system from the side pack control and have it applied to the WHOLE portfolio while they explore. Public visitors: the derived "your brand" pack joins the committed packs in that control. Private instances: the company's real pack is pre-selected there. Site-wide persistence of a *derived* (non-committed) pack across pages is an architecture item — pack-boot.js is hard-allowlisted and guaranteed no-op by default, so extending it is a deliberate decision, not a drift.
- **D6 IA:** Home becomes the demo (the full spine on the front page); Factory content becomes the evidence layer; Approach shrinks to a tight method page; Work becomes the proof index; Contact stays.
- **D7 appetite (owner overrode the lean recommendation):** three–four weeks, full sweep — spine + evidence-layer redesign + component library grid + per-company instance UX pass + two hallway-test rounds.
- **D8 kill list:** re-home everything, no orphans — nothing floats; raw benches stay unlisted. **Refined by D5b:** the dock pack-switcher SURVIVES as the persistent side control ("ok on the side, not perfect" — owner) — redesigned, introduced by the spine's narrative, and upgraded to carry the visitor's brand: committed packs + "your brand" (derived) on the public site, the company pack pre-selected on private instances.
- **D9 craft bar:** Cadence rubric self-audited 6/6 + Vercel DE charter + 2–3 kinetics-derived motions re-derived into tokens (never copied — no license). **Executed 2026-07-22:** instead of installing the anthropics plugin, a HOUSE skill was authored at `.claude/skills/portfolio-design/` (SKILL.md + references/CRAFT.md + references/CHECKLIST.md) after a GitHub survey of the field. It combines: Anthropic frontend-design (direction/anti-slop/process — strongest official, but no numeric rules) + Dammyjay93/interface-design (5/5 community craft: type-scale ratios, 60/30/10, ease-out discipline, hit areas) + vercel-labs/web-interface-guidelines (5/5 correctness: MUST/SHOULD/NEVER a11y + compositor-only motion) — all re-expressed for the vanilla/token constraints and merged with this repo's recorded traps. Runners-up for later mining: pbakaus/impeccable (4/5, fragmented), Ashutos1997/claude-design-auditor (4/5, audit-scoring rubric — candidate template for review passes).
- **D10 ship gate:** two hallway-test rounds (3–5 hiring-manager-profile people each), biggest finding fixed between rounds.
- **D11 VR gate:** frozen (non-blocking) on the v3 branch; baselines regenerated at phase milestones + fully at final merge; real-browser eyeballing per phase. Drift-check and token-lint stay blocking.

## 5. Process from here

1. **Grill** (this session, live): walk D1–D11 one at a time, recommendations attached, until shared understanding.
2. **`/plan-create-prd`**: write the v3 experience PRD as a NEW epic doc (`docs/epics/portfolio-v3-experience.prd.md`) layered over the platform PRD — the platform PRD keeps governing engines/honesty/substrate; the v3 PRD governs the reader experience, amending the named clauses explicitly.
3. **`/plan-architecture`**: the experience architecture — breadboard of the spine, page/height budgets, motion system extensions, per-company instance UX, VR strategy.
4. **`/piv-slice-epic`** → tickets → PIV loop per ticket.

Build-session tooling: `frontend-design` skill installed; agent-browser screenshots on a fresh port per iteration; real-browser (Safari/Chrome-stable) eyeball on every new layout; humanizer pass on all copy; honesty contract untouched — everything on stage stays real or labeled.
