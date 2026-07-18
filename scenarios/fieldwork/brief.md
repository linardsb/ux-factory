# Fieldwork — fictional product brief

Scenario package per `scenarios/README.md` (epic #1, ticket #4). **Fieldwork is a fictional
product, invented for this demonstration** — no real company, users, or data. It is the
factory's contrast case: the scenario where the same method that says yes to Verdant says no.

```json
{
  "slug": "fieldwork",
  "name": "Fieldwork",
  "fictional": true,
  "domain": "B2B field-service scheduling",
  "oneLiner": "A dispatch board that gets the right technician to the right job — and stays out of the way.",
  "today": "2026-07-14"
}
```

## Product

Fieldwork is scheduling software for small field-service firms — heating, electrical, plumbing,
solar. It holds the job queue, the technician roster, and the day's schedule, and its one screen
that matters is the dispatch board: who is where, what's overdue, what's unassigned. Work
arrives, gets assigned, gets done, gets closed.

## Users

Dispatchers and technicians at firms of five to twenty engineers. The named persona is
**Kaspars, 41**, dispatcher at a heating-and-electrical firm with ten technicians across four
regions. His day is interrupts: a boiler callout lands, an engineer calls in sick, an SLA clock
runs down. He doesn't open Fieldwork because he wants to — he opens it because a job arrived.

## Problem

Small service firms schedule on whiteboards, phone calls, and a spreadsheet with one tab per
technician. Double-bookings happen weekly; SLA breaches are discovered after the fact; nobody
can say at a glance which region is drowning. The replacement need is a single live board where
assignment takes seconds and an SLA about to lapse is visible before it lapses.

## Behaviour model

Run the frequency filter honestly and it fails. The candidate routine behavior — the thing a
habit loop could even target — is the *customer's* recurring service booking, and that occurs
monthly at the very best, mostly quarterly or yearly: far below the habit zone (Hooked Ex
1.5–1.6, weekly or better). Kaspars himself is in the tool all day, but that engagement is
**externally triggered** — jobs arriving, phones ringing — not an internal trigger a designer
should amplify. There is no under-served emotional itch here for variable rewards to scratch;
manufacturing one (streaks for dispatchers, engagement mechanics on a work queue) would be
engagement theater on someone's workday.

## Ethics position

Verdict: **utility**. The frequency filter rules habit design out, so Fieldwork is built to the
opposite discipline: get in, see the state of the day, act, get out. Density goes up, ceremony
goes to zero, and success is measured in seconds-to-assignment and SLA breaches caught early —
never in time-in-app. The Manipulation Matrix isn't computed for Fieldwork: its maker isn't a
dispatcher, and the honest position is that this is a tool serving its buyer's operation, not a
habit product. That refusal — visible next to Verdant's justified habit loop — is the method
demonstrated.
