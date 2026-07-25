<!-- docs/hallway-runbook.md — operator steps for the D10 hallway rounds (epic #70, ticket #82).
     PRD §4 gives the pass/fail wording; §7 the metrics. One session per tester; testers are not reusable. -->

# Hallway runbook

Only the steps a human has to do. Two rounds of short sessions with people who have never seen the
site, run to the same script, so the two rounds are comparable and the notes are auditable.

Why it exists: PRD §4 states the whole v3 hypothesis in terms of what a cold reader does in the
first 90 seconds. Nothing else in this repo tests that. Every automated gate tests that nothing
broke, not that the thing works.

Reasoning and decisions: `docs/epics/portfolio-v3-experience.prd.md` §4 and §7, D10 in
`.claude/plans/ux-overhaul-v3-prd-research.md`.

---

## Which of these repeats?

| | How often |
|---|---|
| **Round 1** — find the biggest thing readers trip on | **once** — 3 to 5 testers, one session each |
| **Fix** — one finding, chosen by the rule below | **once**, between the rounds (D10) |
| **Round 2** — same script, **fresh** testers | **once** — 3 to 5 testers, one session each |

Three to five per round is the sample size the round is designed for (NN/g). Over-recruiting does
not buy more findings; it spends testers you cannot get back.

**A tester is spent after one session.** They have seen the site, so they can never be a cold
reader again. Round 2 uses people who were not in round 1 (architecture doc, open question on
tester freshness). Line up both rounds' people before you start round 1, or you will finish the
fix with nobody left to test it.

---

## 1 · Who to recruit

Someone who has never seen the site and does not know what it is for. That is the whole
requirement. They do not need to be a hiring manager, a designer or technical — the site claims to
read correctly in 90 seconds, and that claim is either true for a stranger or it is not true.

Do not use: anyone who has watched you build this, anyone you have already described it to, anyone
in round 1 when you are running round 2.

## 2 · Setup

- A real browser on their own machine or phone if you can. Not a screen share you drive.
- Real network. Do not pre-load the page and hand over a warm tab.
- The live site or a local server at the root. Start them on Home (`index.html`), nowhere deeper.
- A timer you can see and they cannot.
- One notes file open, copied from `docs/hallway-notes/TEMPLATE.md`.

Record nothing that identifies them. Label them `tester-01`, `tester-02`. This repo is public.

## 3 · The 90-second observation

Say exactly this, then stop talking:

> "Have a look at this site."

Start the timer. Say nothing else for 90 seconds. Not one word, including when they pause, look at
you, or ask a question — if they ask, say "whatever you like" and nothing more.

Write down, with the timestamp:

- Where they look first, and where they go next.
- Everything they scroll past without stopping.
- Anything they say out loud, verbatim.
- Where they stall, re-read, or go back.
- The moment they reach the built-screen peak (the beat where a product screen assembles), if they
  reach it, and whether anything of yours prompted it. It only counts as **unprompted** if you said
  nothing after the opening line.

## 4 · The two questions, asked after the 90 seconds

Stop the timer first. Then ask, in this order, in these words:

> "What does this person do?"
>
> "Is this senior work?"

These are PRD §4's own words. Do not soften them, do not add "in your opinion", do not explain what
you mean by senior. Write the answers down verbatim, including the hedges and the pauses.

Then, and only then, you may ask follow-ups about anything you saw them stall on. Follow-ups go in
the notes marked as follow-up, and they never change what you recorded above.

## 5 · The two outcomes to record

Both are yes or no. Both come from PRD §4 and they are what the rounds measure:

1. **Stated what the candidate does, correctly, within the 90 seconds.** Their answer to the first
   question, judged against what the site is actually claiming. "Something with AI and design" is
   a no. Write the answer verbatim next to the yes/no so the call is checkable by someone else.
2. **Reached the built-screen peak unprompted.** Yes only if they got there inside the observation
   with no input from you. Record the timestamp.

A round is not a pass or a fail. The findings are the output; these two fields are what makes
round 1 and round 2 comparable.

## 6 · What the operator must not do

- Do not explain anything. Not before, not during, not when they are stuck.
- Do not point at the screen, lean in, or move the mouse.
- Do not defend the site, or the work, or a decision they just criticised.
- Do not ask a leading question ("did you notice the…", "was that clear?"). Ask what they did, not
  whether they liked it.
- Do not fill a silence. A stall is the finding.
- Do not clean up the notes afterwards. Same rule as traces: write what happened. A session that
  went badly is the finding, not something to hide.

## 7 · The biggest-finding rule

Written before round 1 ran, so the choice cannot be argued backwards from what would be convenient
to fix. Exactly one finding gets fixed between the rounds (D10).

Collect every distinct finding across the round-1 notes, then rank them on these three keys in
this order:

1. **How many testers hit it.** More testers, higher rank.
2. **Severity as recorded in the notes** — blocking, then major, then minor. Use the severity in
   the file; do not re-grade it now.
3. **Whether it blocks one of the two §5 outcomes.** A finding that stopped a tester stating what
   the candidate does, or stopped them reaching the peak, outranks one that did not.

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

## 8 · Where the notes go

One file per tester, copied from `docs/hallway-notes/TEMPLATE.md`:

```
docs/hallway-notes/round-1/tester-01.md
docs/hallway-notes/round-2/tester-01.md
```

Commit them on branch `chore/v3-merge-vr-reblock`, not on `main` — that branch spans both rounds
and opens the single PR that closes ticket #82.

Round-2 findings are recorded and filed as follow-up tickets. They are not fixed in this ticket,
or the merge gate never closes.
