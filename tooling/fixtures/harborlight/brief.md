# Harborlight — fictional fixture brief (instance-journey / build-instance validation)

The FIXTURE input for `tooling/instance-journey.mjs` and `agent-layer/build-instance.mjs`'s own
validation runs (epic #202, ticket #222). **Harborlight is a fictional company, invented for this
fixture** — no real company, users, or data. It is deliberately NOT Northwind: the built instance's
residue greps assert the demo name is gone, so the fixture must carry a different one or those
greps could never fail. Format: `parseCompanyBrief` (agent-layer/lib.mjs) — the brief lives in a
directory named its slug, carries the full JSON head, and states the five prose sections.

```json
{
  "slug": "harborlight",
  "name": "Harborlight",
  "fictional": true,
  "domain": "berth scheduling",
  "oneLiner": "A berth board for small harbours — who is arriving, where they tie up, and what clashes before it happens.",
  "today": "2026-08-15",
  "axes": {
    "brandColor": "#1F6F8B",
    "density": "compact",
    "rewardType": "hunt",
    "frequency": "daily"
  },
  "intake": {
    "problem": {
      "default": "Berth clashes surface at the quay, not on the board — two boats promised one spot.",
      "reasoning": "The fixture mirrors the classic scheduling failure: promises made against a stale picture."
    },
    "current-solution": {
      "default": "A whiteboard in the harbour office and a VHF radio, photographed at shift change.",
      "reasoning": "Hand-copied state is always one arrival behind; the photo is stale before it sends."
    },
    "named-user": {
      "default": "Mara, 51, harbourmaster — she assigns every berth herself and answers for every clash.",
      "reasoning": "One named person with sole authority keeps the fixture's scope honest."
    },
    "target-behavior": {
      "default": "Check the board once each morning before the first arrival window.",
      "reasoning": "A daily working session, cued by the tide table rather than by any internal itch."
    },
    "internal-trigger": {
      "default": "The sinking feeling when a mast appears at the breakwater that she cannot place.",
      "reasoning": "The 5 Whys bottom out in fear of the avoidable clash, not in habit-seeking."
    },
    "friction": {
      "default": "Three steps from arrival call to assigned berth; confusion limits her most.",
      "reasoning": "The whiteboard's ambiguity — not time or effort — is what makes clashes possible."
    },
    "success-signals": {
      "default": "Fewer radio call-backs per shift early; a season without a double-booked berth behind it.",
      "reasoning": "One fast proxy signal, one slow outcome, per the method's success split."
    },
    "ethics-gate": {
      "default": "Yes — it removes a source of real conflict, and Mara would run her own harbour on it.",
      "reasoning": "Utility tool for a professional's own workday; no engagement mechanics wanted."
    }
  },
  "screens": [
    { "id": "board", "title": "Berth board", "collections": ["berths", "arrivals"] },
    { "id": "arrival", "title": "Arrival detail", "collections": ["arrivals"] }
  ],
  "copy": {
    "tagline": "The harbour's one true board.",
    "ethicsReveal": {
      "verdict": "utility",
      "narrative": "The frequency is daily but the trigger is the tide table, not an engineered itch — the design target is a trustworthy answer fast, then out of the way."
    }
  }
}
```

## Product

Harborlight is a berth-scheduling board for small harbours: every berth, every expected arrival and
every departure on one screen, so a spot is never promised twice. It exists as a FIXTURE — the
subject `tooling/instance-journey.mjs` builds a private instance around to prove the build chain,
never a real product.

## Users

Harbourmasters at small leisure-and-fishing harbours. The named persona is **Mara, 51**, who
assigns every berth herself, works from a whiteboard today, and answers personally for every clash.

## Problem

Berth state lives on a whiteboard photographed at shift change, so promises get made against a
picture that is one arrival stale. The clash surfaces at the quay, in front of two skippers, when
it is too late to fix cheaply.

## Behaviour model

One working session per day, cued by the tide table before the first arrival window — an external
trigger, not an internal itch. The design target is a trustworthy answer fast: who arrives, where
they tie up, what clashes.

## Ethics position

Utility, and the reveal says why: the frequency is daily but nothing about the product wants to be
habit-forming — the trigger is the tide, the payoff is a clash that never happens, and engagement
mechanics would be theatre on a professional's workday.
