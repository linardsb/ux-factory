# Epic PRD — Systems thinking × UX: name the structure, state the outcomes

Date: 2026-08-07. Research: `.claude/plans/st-ux-fusion-epic-research.md` (7 books/docs + 8 Center Centre articles + owner Q&A synthesis). Status: intent — architecture TBD.

## 1. Problem Statement

Hiring managers screening senior UXE candidates at the £70–80k band cannot verify **strategic** capability from this site. It proves craft (token contract, gates, measured claims) and method (Hooked + Shape Up performed live in /build and the studio) — but it never articulates *why* those habits buy business outcomes, or *where* the builder chooses to intervene. Strategy is exactly the differentiator at that band; unclaimed, the profile reads as senior execution and gets priced and interviewed as such.

## 2. Evidence

- **The research synthesis** (input doc, §2): the repo already embodies at least nine current industry patterns *unnamed* — declarative generative UI ({name, props, children} against a validated vocabulary), a steering layer, management flight simulators, outcomes-over-outputs measurement, an evaluation-centered lifecycle. The value exists; it is illegible.
- **Zero existing coverage**: no systems-thinking, Spool, or strategic-UX content anywhere in docs/epics or the issue tracker (research §3) — the gap is real, and the epic is genuinely additive.
- **The industry register**: Spool/Center Centre's strategic-UX shifts (outcomes over outputs, experiences over products, proactive over reactive, org-wide expertise) are the language design-leadership interviewers at this band actually use.
- **The v3 bar**: the £70–80k target and the v1/v2 root causes ("shows skill, doesn't argue value") are recorded owner strategy (`.claude/plans/ux-overhaul-v3-prd-research.md`).
- **Assumption — validate via the analytics signal**: that readers who matter actually reach approach/factory deep enough to encounter a strategy layer at all.

## 3. Thesis (why build it)

**Better UX through systems thinking — name the structure, state the outcomes.** The site already *behaves* like a system-literate artifact; this epic makes that legible in the site's own register (a method performed with receipts, not described in an essay), with near-zero new machinery.

- **Why now**: the research is done and validates the built architecture; epic #202 is making the studio the site's deepest exhibit, and naming what it demonstrates is the highest-leverage complement. Applications are ongoing — every one sent before the layer ships tests the weaker profile.
- **How it copes today**: hoping readers infer strategy from craft. The research shows they can't — the patterns carry industry names the site never says, so credit for them goes unclaimed.
- **Why this beats the cope**: naming + outcome-framing is a Meadows-high intervention (information and goals level, not new subsystems). The epic's own sizing test is the leverage hierarchy it presents: prefer reframings over machinery, at most ONE small interactive exhibit.
- **Hard framing constraint**: this epic **augments** the Ryan Singer + Nir Eyal method spine (/build's ten questions, the breadboard, the studio) — it never replaces or renames it.

## 4. Hypothesis

> **We believe** naming the site's existing structure — industry-pattern namings, an outcomes-over-outputs reframing of the method copy, and a leverage-ladder exhibit mapped to real, linkable decisions in this repo — **will cause** hiring managers and senior UX readers **to** read the profile as strategic rather than execution-only, **resulting in** strategy-level conversations at the £70–80k band.
>
> **We'll know we're RIGHT if**, within the review window (proposed: the next ~10 applications / ~8 weeks after the MVP ships — confirm, open question 1):
> - strategy/systems framing comes up **unprompted** in at least one screen or interview, and
> - 2–3 senior UX/hiring reviewers can articulate the strategic position back after reading, and
> - the ladder exhibit registers non-trivial engagement among approach/factory readers (measured via the site's existing virtual-route analytics pattern).
>
> **We'll know we're WRONG if** the window closes with zero unprompted mentions AND reviewers still describe the profile as craft/execution AND exhibit engagement is near zero — then the layer is invisible or unconvincing, and the next move is repositioning the content, not adding machinery.
>
> **Guardrail**: if any slice starts growing a subsystem, the epic is failing its own test ("fixes that fail") — the slice gets cut back to its reframing.

## 5. Target User & JTBD

- **Primary**: the hiring manager / design-leadership interviewer screening senior UXE candidates at the £70–80k band.
  **JTBD**: *When screening a senior candidate whose portfolio already shows strong craft, I want to verify they can operate at the strategy level — choose where to intervene and connect UX work to business outcomes — so I can justify the senior band and champion them internally.*
- **Secondary**: senior UX peers and recruiters doing a fast legibility pass ("what is this person's position?").
- **Non-users**: keyword-scanning volume recruiters (the layer isn't for them and shouldn't be SEO-shaped); systems-thinking learners (the site is not pedagogy); anyone expecting a theory essay.

## 6. MVP

The thinnest end-to-end line that lets every hypothesis signal fire: **T1 + T2 + T3**, sequenced in two waves around #202's IA surgery (#216).

- **Wave 1 — lands now, against the current IA:**
  - **T1 — Sources cluster.** A fifth cluster, "Strategy & systems," in approach's existing sources section: Spool, Jensen-Inman, Wroblewski, Meadows, Kim, Morecroft, Gothelf/Seiden, Hartson/Pyla.
  - **T2 — Outcome reframing pass.** Copy-only: each method habit states the outcome it buys, in the outcomes-over-outputs register; quantifiable claims stay generated, never hand-written. Includes the one-sentence industry-term namings beside things the site already does ("declarative generative UI," "steering layer," "management flight simulator — illustrative").
- **Wave 2 — placement decided against #216's final IA:**
  - **T3 — The leverage ladder.** One exhibit: "where I intervene" — Meadows' leverage points as a compact interactive ladder, each rung mapped to a real, linkable decision in this repo (token values → information flows → rules/gates → goals/honesty contract → the paradigm of the token contract itself). Systems literacy demonstrated by the site's own receipts, not pedagogy. Authorial opinion, so hand-written content is honest here.

Out of the MVP: **T4** (mini flight simulator) — a stretch ticket, explicitly cuttable; cutting it costs the epic nothing.

## 7. Success Metrics

| Metric | Target | How measured |
|---|---|---|
| Unprompted strategy/systems mention in a screen or interview | ≥1 within the review window | Owner's interview log per application batch |
| Peer/recruiter legibility | 2–3 senior reviewers articulate the strategic position back | Structured ask after a read-through (after Wave 1, repeated after T3 — open question 3) |
| Ladder exhibit engagement | Non-trivial share of approach/factory readers interact — numeric target TBD against baseline traffic (open question 4) | Existing virtual-route analytics pattern |
| Leverage guardrail | Zero new subsystems beyond the one exhibit; all existing gates stay green | The epic's own sizing test, applied at review of every slice |

## 8. Non-goals

- No systems-thinking essay page; no causal-loop-diagram editor; no recreating book diagrams wholesale.
- No changes to the Hooked/Shape Up surfaces' *mechanics* — this epic renames and reframes nothing in the method spine, it layers onto it.
- No new generator unless a claim becomes quantitative (then the "a claim is never hand-written" rule applies as usual).
- T4 (Morecroft-cockpit mini simulator) is outside the MVP; if it isn't sliced, it parks as a possible future epic, not a silent cut.
- **Hard attribution constraints** (content-level, from standing rules): the five-pillar AI-trust content never names its source speaker — cite Nielsen/Amershi/PAIR instead; "Yes, And" credits Leslie Jensen-Inman (not Spool); the Crawford notes are Crawford-via-Wroblewski and are credited accordingly.

## 9. Open Questions

- [ ] **Review window**: do ~10 applications / ~8 weeks match the actual application cadence? (Sets the hypothesis clock.)
- [ ] **T3 placement**: which page/section the ladder lives on — blocked on #216's IA surgery landing its final shape.
- [ ] **Reviewers**: who are the 2–3 senior UX/hiring readers, and do they review after Wave 1, after T3, or both?
- [ ] **Engagement target**: what counts as "non-trivial reach" — needs a look at current CF WA baseline traffic before a number is honest.
- [ ] **T4's fate at slicing time**: stretch ticket in this epic vs parked as its own follow-on — decide at `piv-slice-epic`.

---

Architecture: [st-ux-fusion.architecture.md](./st-ux-fusion.architecture.md)
