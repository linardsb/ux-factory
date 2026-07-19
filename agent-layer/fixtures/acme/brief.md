# Acme — fictional company-brief fixture

Test fixture for the brief → scenario-package compiler (`agent-layer/gen-company-package.mjs`,
epic #38 / ticket #39). **Acme is a fictional product, invented for this demonstration** — no real
company, users, or data. This is the fictional happy-path input the compiler expands into a valid
`scenarios/<slug>/` package.

```json
{
  "slug": "acme",
  "name": "Acme",
  "fictional": true,
  "domain": "consumer reading habit",
  "oneLiner": "A quiet companion that keeps a reading habit alive, one evening page at a time.",
  "today": "2026-07-19",
  "axes": {
    "brandColor": "#3355CC",
    "density": "comfortable",
    "rewardType": "self",
    "frequency": "daily",
    "improvesLives": true,
    "wouldUseIt": true
  },
  "intake": {
    "problem": {
      "default": "People who want to read more can't sustain it — a book gets a strong start, is abandoned mid-chapter, and the next one never begins.",
      "reasoning": "Anchoring on the abandoned-book problem keeps the product about sustained reading, not book discovery or social sharing."
    },
    "current-solution": {
      "default": "A reading app's stats screen they never open, plus good intentions. Both fade within a fortnight.",
      "reasoning": "The coping baseline is passive tracking; the bar to clear is showing up nightly, not adding more analytics."
    },
    "named-user": {
      "default": "Mara, 29, a nurse on rotating shifts who reads to wind down but loses the thread across busy weeks.",
      "reasoning": "A named user on irregular shifts forces the design to survive broken routines rather than assume a fixed evening slot."
    },
    "target-behavior": {
      "default": "The evening page: open the book of the moment, read a few pages, log it. Realistically most nights.",
      "reasoning": "A few pages nightly is near-daily — inside the habit zone (weekly or better), so a designed loop can legitimately take hold."
    },
    "internal-trigger": {
      "default": "The bedtime wind-down, and the small guilt of a book left open mid-chapter.",
      "reasoning": "The trigger already exists at bedtime; the design attaches to it instead of manufacturing urgency with notifications."
    },
    "friction": {
      "default": "Two steps: open the app, resume exactly where you stopped. The limiting factor is effort — any setup loses to a phone scroll.",
      "reasoning": "Naming effort as the binding constraint rules out feeds and gamified clutter that would grow the session past a few minutes."
    },
    "success-signals": {
      "default": "Early: reading logged on most nights, three weeks running. Behind it: books actually finished, not just started.",
      "reasoning": "A leading signal the product can see (nights logged) paired with the lagging outcome the reader actually wants (finished books)."
    },
    "ethics-gate": {
      "default": "Yes to both: people finish books they care about, and the maker would read with it nightly. On the Manipulation Matrix that is the facilitator quadrant.",
      "reasoning": "Frequency passes and both matrix answers are yes, so a habit loop here serves the reader's own goal — habit-justified."
    }
  },
  "screens": [
    { "id": "reading-overview", "title": "Reading overview", "collections": ["items"] }
  ],
  "copy": {
    "tagline": "A quiet companion that keeps a reading habit alive, one evening page at a time.",
    "ethicsReveal": {
      "verdict": "habit-justified",
      "narrative": "The frequency filter passes: a few pages most nights is a near-daily behavior, inside the habit zone. And the Manipulation Matrix places Acme in the facilitator quadrant — it materially improves the reader's life (books get finished) and the maker would use it nightly. So the habit loop is designed deliberately, because here it serves the user's own goal."
    }
  }
}
```

## Product

Acme is a reading companion for people who keep abandoning books they meant to love. It holds the
book of the moment and turns reading into a short, repeatable evening ritual: open where you left
off, read a few pages, log it. One book at a time, most nights, until it is finished.

## Users

Readers with good intentions and broken routines. The named persona is **Mara, 29**, a nurse on
rotating shifts who reads to wind down but loses the thread across busy weeks. She doesn't want a
social feed or reading challenges; she wants to stop leaving books half-read.

## Problem

Books die from *irregular* reading, not lack of interest. Starting is easy; returning to the same
book night after night, across shifting schedules, is not. Today Mara solves it with a tracker she
never opens and the vague intention to "read more". Each works for a week and decays. The
replacement need is a single place that always resumes where she stopped, so she only has to show up.

## Behaviour model

The one behavior Acme makes routine is the **evening page**: open the book, read a little, log it.
Realistic frequency is near-daily — inside the habit zone (Hooked's frequency filter): frequent
enough that a designed trigger–action–reward loop can take hold. The internal trigger is the
bedtime wind-down Mara already has; the variable reward is of the *self* kind — visible progress, a
chapter closed, a book finished because she kept showing up.

## Ethics position

The frequency filter passes and the Manipulation Matrix places Acme in the **facilitator** quadrant:
it materially improves users' lives — books actually get finished — and the maker would use it
nightly. Verdict: **habit-justified**. Building a habit loop here designs *for* the reader's own
goal, not against it.
