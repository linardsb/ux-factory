<!-- docs/hallway-runbook.md — operator steps for the D10 hallway rounds (epic #70, ticket #82).
     PRD §4 gives the pass/fail wording; §7 the metrics. One session per tester; testers are not reusable.
     The session script itself lives in docs/hallway-notes/TEMPLATE.md — one file open per session. -->

# Hallway runbook

Two rounds of short sessions with people who have never seen the site, run to the same script, so
the two rounds are comparable and the notes are auditable.

Why it exists: PRD §4 states the whole v3 hypothesis in terms of what a cold reader does in the
first 90 seconds. Nothing else in this repo tests that. Every automated gate tests that nothing
broke, not that the thing works.

Reasoning and decisions: `docs/epics/portfolio-v3-experience.prd.md` §4 and §7, D10 in
`.claude/plans/ux-overhaul-v3-prd-research.md`.

> **This doc is prep only.** The session itself is `docs/hallway-notes/TEMPLATE.md` — the opening
> line, the silence rule, the two questions, the outcomes and the findings table are all in there.
> During a session you have that one file open and fill it top to bottom.

---

## Before you start

**Line up both rounds' people first.** A tester is spent after one session — they have seen the
site, so they can never be a cold reader again. Round 2 uses people who were not in round 1
(architecture doc, open question on tester freshness). Book them all before round 1, or you will
finish the fix with nobody left to test it.

**Who counts:** anyone who has never seen the site and does not know what it is for. That is the
whole requirement — not a hiring manager, not a designer, not technical. The site claims to read
correctly in 90 seconds, and that claim is either true for a stranger or it is not true.

**Who doesn't:** anyone who has watched you build this, anyone you have already described it to,
anyone from round 1 when you are running round 2.

**How many:** 3 to 5 per round — the sample size the round is designed for (NN/g). Over-recruiting
does not buy more findings; it spends testers you cannot get back.

## Make the notes files

```bash
for i in 01 02 03 04 05; do cp docs/hallway-notes/TEMPLATE.md docs/hallway-notes/round-1/tester-$i.md; done
```

Swap `round-1` for `round-2` when you get there. Delete any `tester-NN.md` you don't use — leave
each round's `README.md` alone.

## Set up each session

- Their own machine or phone if you can, in a real browser, on a real network. Not a screen share
  you drive.
- Do not pre-load the page and hand over a warm tab.
- Start them on Home (`index.html`), nowhere deeper. The live site, or a local server at the root.
- A timer you can see and they cannot.
- Their `tester-NN.md` open, and nothing else.

Record nothing that identifies them. Label them `tester-01`, `tester-02`. This repo is public.

Then run the session from the notes file.

---

## Between the rounds — the biggest-finding rule

A round is not a pass or a fail. The findings are the output; the two outcome fields are what makes
round 1 and round 2 comparable.

This rule was written before round 1 ran, so the choice cannot be argued backwards from what would
be convenient to fix. Exactly one finding gets fixed between the rounds (D10).

Collect every distinct finding across the round-1 notes, then rank them on these three keys in this
order:

1. **How many testers hit it.** More testers, higher rank.
2. **Severity as recorded in the notes** — blocking, then major, then minor. Use the severity in the
   file; do not re-grade it now.
3. **Whether it blocks one of the two outcomes.** A finding that stopped a tester stating what the
   candidate does, or stopped them reaching the peak, outranks one that did not.

The top of that ranking is the biggest finding, and it is the one that gets fixed. If two findings
are still level after all three keys, that is an owner call — surface both with the ranking, do not
pick one quietly.

Record the full ranked list, not only the winner. The ranking is the audit trail.

Two things the rule does not do:

- **It does not manufacture a finding.** If round 1 surfaces nothing, record that, skip the fix and
  run round 2. That is a real result.
- **It does not authorise new capability.** If the top finding needs a beat that does not exist
  rather than a beat that needs adjusting, that is a scope call for the owner and a separate
  ticket, not a fix inside this one.

## Where the notes go

```
docs/hallway-notes/round-1/tester-01.md
docs/hallway-notes/round-2/tester-01.md
```

Commit them on branch `chore/v3-merge-vr-reblock`, not on `main` — that branch spans both rounds
and opens the single PR that closes ticket #82.

Round-2 findings are recorded and filed as follow-up tickets. They are not fixed in this ticket,
or the merge gate never closes.

---

## Round 3 — the studio (epic #202, ticket #223)

Same recruitment bar, same discipline, a different hypothesis: the prototype studio. The script is
`docs/hallway-notes/TEMPLATE-studio.md`; the notes go in `docs/hallway-notes/round-3-studio/`.

- **Session ≈ 10 minutes**, two timed parts: Part 1 is the 90-second read, word-for-word the
  rounds-1/2 script, so the rounds stay comparable and Home's compressed gate (#216) gets its
  first cold read. Part 2 is 5 silent minutes on the studio page.
- **The live site is the default start** — a session against a local server is only for the
  operator's own pilot run.
- **The prompt names the page, never the capability.** The epic's WRONG-if is whether a visitor
  grabs the wheel *unprompted*; a session where the operator hinted at the take-over measures
  nothing.
- **The fix rule differs from rounds 1–2:** the biggest confusion is fixed before the epic closes,
  or explicitly deferred with a ticket — the decision recorded in `round-3-studio/findings.md`
  either way. Fix now iff it fits in roughly two days, contradicts no recorded epic decision, and
  needs no new instrumentation.
- **Pilot on yourself first** (not counted as a tester) to prove the template fillable in real
  time. Never rehearse on a potential tester.
