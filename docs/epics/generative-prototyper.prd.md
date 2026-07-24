# PRD — Build-time generative prototyper (employer sources → bespoke prototype)

**GitHub epic:** [#86](https://github.com/linardsb/ux-factory/issues/86) · **Status:** scoped (PRD) · sequenced **after #73**
**Complementary to:** epic [#70](https://github.com/linardsb/ux-factory/issues/70) (the v3 spine) — upgrades #75, extends #43/#44; nothing there is thrown away.

## 1. Problem statement

**Who:** hiring managers and their teams that Linards (a senior UX engineer) applies to for £70–80k roles.

**The pain:** a strong portfolio still asks the reader to *trust a claim* — "I can build your product." At the top of the funnel that claim sits in a pile of near-identical claims and gets skimmed or skipped. The reader has to imagine the candidate applied to *their* problem; most don't bother.

**Cost of not solving it:** applications that demonstrate senior skill in the abstract still convert like every other application — the differentiation the platform was built to prove (verifiable UXE skill, not asserted) doesn't reach the moment it matters most: the first read.

## 2. Evidence

- **Assumption — validate via the MVP.** The core premise ("a bespoke, working prototype of *their* product breaks through where a general portfolio doesn't") is a **bet, not yet evidenced**. The MVP exists to produce that evidence on a small N before any scale-up.
- **Grounded:** the substrate already exists and is measured (`build-instance` compiles a per-company instance in **< 1 min**), so the marginal cost of testing the bet is low — this is why it's worth testing rather than assuming.
- Owner conviction (grill session, 2026-07-23): wants a *proactive* application weapon — "I've built the thing you described" — over a reactive portfolio.

## 3. Thesis (why build it, why now)

Agent tooling now makes it feasible to ingest a real employer's **design tokens + screenshots + brief** and, *at build time*, produce a working, **adjustable** prototype of their product/workflow — fast enough to build one per serious application. The reader doesn't imagine the candidate solving their problem; they open a link and *use* the candidate's solution to their problem.

**Why it beats the current cope (a general portfolio):** the cope makes the reader do the imaginative work; this does it for them and hands them a shareable artifact. **Why now:** the repo already carries every build-time building block (screenshots→tokens, brief→unlisted instance, agent-composed views, adjust-live renderer) — the capability is a *composition* of shipped tools, not a new engine.

## 4. Hypothesis

> **We believe** applying with a bespoke, working, adjustable prototype of the employer's own product
> **will cause** the hiring managers Linards applies to **to reply / grant an interview**
> **resulting in** a materially higher response rate than his general applications.
>
> **RIGHT if:** within a batch of ~10 bespoke applications, the reply/interview rate is visibly above his normal-application baseline (and at least one reader cites the prototype).
> **WRONG if:** across ~10 bespoke sends the reply/interview rate is **no better than** normal applications over the same window — the "it breaks through" bet is false.

## 5. Target user & JTBD

- **Primary user (of the artifact):** the hiring manager / team lead reading the application — non-technical to semi-technical, skimming, time-poor.
- **Operator (of the factory):** Linards, at Claude-Code authoring speed, building one prototype per serious application.
- **JTBD:** *When I'm deciding which candidates from a pile are worth my time, I want to see one who has already engaged with my actual product, so I can shortlist a proven senior over an asserted one.*
- **Non-users:** not for mass/automated outreach; not a self-serve tool for other candidates; not for readers who want to generate their own prototype live (no view-time generation surface).

## 6. MVP — the thinnest line

**One real employer, entirely by hand, end to end:**

```
sources (manual): their tokens + 1–2 screenshots + brief
  └ existing build-instance pipeline
     └ 1 adjustable prototype on an unlisted instance
        └ 1 real application sent
           └ observe: reply? prototype mentioned?
```

Deliberately **out of MVP:** no public gallery, no public teaser upgrade, no automation, no access-control beyond unlisted+noindex. Prove or kill the bet on a handful of real sends before building any of that. Holds → productize the pipeline and add the public teaser; doesn't → a slice was thrown away, not the platform.

## 7. Success metrics

| Metric | Target | How measured |
|---|---|---|
| Reply / interview rate on bespoke sends | **TBD — needs validation** (set after first sends establish a normal-application baseline) | manual tally per application |
| Prototype cited by reader | ≥ 1 across the first ~10 sends (proof-of-life) | reply content / interview notes |
| Build cost per prototype | sustainable at real application volume (guardrail — flag if hand-fixing dominates) | operator time per build |

Metric #1 is intentionally unset: there is no credible baseline reply rate yet, and inventing a "2× normal" target before knowing "normal" would be fiction. First sends establish the baseline; the target is set against it.

## 8. Non-goals

- **No view-time live-LLM generation — the hard constraint, unchanged.** The repo's #1 one-way-door (vanilla shipped pages, no view-time LLM) stays inviolate. All generation is **build-time**; readers replay static pages. "On the fly" = authoring speed, never browser generation.
- **New build-time engine — owner-approved amendment (2026-07-23).** The v3 "no new engines" non-goal is *deliberately amended* for this epic: the bespoke prototyper MAY grow a new **build-time, vision-driven** generation path (screenshots → bespoke component specs). This is not a drift — it's an explicit owner call, and it does **not** touch the hard constraint above. Everything reusable is still reused (see architecture); only the genuinely-new bespoke tier is new.
- **Two honesty regimes, never blurred.** The existing pure-composition contract (`record-composition`: "prompt built only from vocabulary + fixtures + bounds, no example") stays untouched for platform demos. The bespoke tier is **openly labeled as vision-driven** ("built at build-time from your product screenshots") — a *different, honest* claim. The bespoke output must never masquerade under the pure-composition contract.
- **Real employer prototypes are never public.** Public portfolio shows the capability via **fictional scenarios only**; every real build lives on its unlisted instance, unlinked publicly.
- **Link-only privacy is accepted for the MVP.** True employer-only access-control is deferred (open question).
- Not a replacement for the v3 spine (#70) — #73/#74 stay the public demo front-end.

## 9. Open questions

- [ ] **Success target** — the normal-application reply-rate baseline, and the bespoke target against it (settle after first sends).
- [ ] **Access control** — is link-only+noindex enough long-term, or does real employer material eventually require gated access? (already logged in `per-company-brief.architecture.md`)
- [ ] **Public teaser** — is the bounded deterministic teaser (derive, colour-only) in scope for v1 after the MVP holds, or a later slice?
- [ ] **Prototype adjustability depth** — how much "adjustable" the reader gets (pack re-skin only vs. steering the composition) — an architecture call. Bounded by `action-bus`/`agentic-renderer` (pre-wired `agent.*`/`ui.*` actions, no view-time LLM).
- [ ] **"Adjustable" honesty** — the reader adjusts a pre-composed view via the no-LLM action-bus; framing must never imply live generation.
- [ ] **Per-employer fidelity — floor vs. ceiling** — the honesty-maximal floor (screenshots→tokens only, pure fixture composition) vs. the higher-fidelity ceiling (screenshots as an openly-labeled vision reference → bespoke components). Which the MVP employer gets, and whether the ceiling is worth its build cost, is settled by the spike.

## Architecture

Architecture: [generative-prototyper.architecture.md](./generative-prototyper.architecture.md)
