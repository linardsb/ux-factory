<!-- docs/hallway-notes/TEMPLATE.md — one file per tester, per session (epic #70, ticket #82).
     Copy to round-1/ or round-2/ as tester-NN.md and fill in during the session.
     Carries the script inline so this is the only file open while a session runs.
     Fixed shape so sessions are comparable across both rounds. Prep: docs/hallway-runbook.md. -->

# Hallway session — tester-NN

| | |
|---|---|
| **Date** | YYYY-MM-DD |
| **Round** | 1 \| 2 |
| **Tester** | tester-NN (anonymous label only — never a real name or employer) |
| **Device / browser** | e.g. own laptop, Safari 26 / own phone, Chrome |
| **Start page** | index.html |
| **Observation length** | 90s |

> **While this runs:** do not explain, point, lean in, defend the work, or fill a silence. Do not
> ask "did you notice…" or "was that clear?" — ask what they did, not whether they liked it.
> A stall is the finding. Do not tidy these notes afterwards.

## 1 · Say this, then start the timer

> **"Have a look at this site."**

Then say nothing for 90 seconds. Not one word. If they ask you something, say **"whatever you
like"** and nothing more.

## 2 · Observation log

Write it as it happens: where they look first, where they go next, everything they scroll past
without stopping, anything said out loud verbatim, every stall and re-read.

| Time | What they did or said |
|---|---|
| 0:00 | |
| | |

## 3 · Stop the timer, then ask these two — in this order, in these words

Do not soften them, do not add "in your opinion", do not explain what you mean by senior.

**"What does this person do?"**

> verbatim answer

**"Is this senior work?"**

> verbatim answer

**Follow-ups** (only after both questions, only about something you saw them stall on — never
leading, and they never change the fields below)

> 

## 4 · The two outcomes (PRD §4)

| Outcome | yes / no | Evidence |
|---|---|---|
| **1. Stated what the candidate does, correctly, inside the 90s** | | their answer, verbatim |
| **2. Reached the built-screen peak unprompted** | | timestamp, e.g. `0:47` — or `no` |

Outcome 1: judge their answer against what the site actually claims. "Something with AI and
design" is a **no**. Outcome 2: `yes` only if they got to the beat where a product screen assembles
*inside* the 90s with no input from you.

## 5 · Where they stalled

Each place they re-read, went back, or stopped moving. Where on the page, and for how long.

## 6 · What they did not see

Anything the session was meant to land that they scrolled past or never reached.

## 7 · Findings

One row per distinct finding. `severity` is the triage rule's second key — set it here, during or
straight after the session, not later while ranking.

| # | Finding | severity (blocking / major / minor) | Blocks outcome 1 or 2? |
|---|---|---|---|
| 1 | | | |

- **blocking** — they could not do the thing at all, or left with the wrong idea of what the site is.
- **major** — they got there, but slowly, wrongly, or by accident.
- **minor** — noticed and mentioned, did not cost them anything.

## 8 · Operator's take

One line. What this session actually showed. Write what happened, not a tidied version — the same
rule the traces follow. A session that went badly is the finding.
