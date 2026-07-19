# Northwind — real-provenance test stub (fictional content)

Test fixture for the brief → scenario-package compiler (`agent-layer/gen-company-package.mjs`,
epic #38 / ticket #39). **This is fictional content carrying a real-provenance *label*
(`fictional: false`)** — its only job is to exercise the real-provenance code path (speculative
notice + sources) and the privacy guard. It is never shipped, and by design the privacy guard makes
it impossible to compile into this repo (a real package compiles only to the jobs-folder target).

```json
{
  "slug": "northwind-real",
  "name": "Northwind",
  "fictional": false,
  "domain": "wholesale inventory",
  "oneLiner": "A stock dashboard that shows what's really on the shelf — and gets out of the way.",
  "today": "2026-07-19",
  "sources": [
    "https://example.com/northwind/vision",
    "https://example.com/northwind/product-announcement"
  ],
  "axes": {
    "brandColor": "#0A5C6B",
    "density": "compact",
    "rewardType": "hunt",
    "frequency": "monthly"
  },
  "intake": {
    "problem": {
      "default": "Small wholesalers lose track of stock across warehouses; orders get promised against inventory that isn't actually there.",
      "reasoning": "Framing the problem as promise-accuracy under distributed stock keeps the product a dashboard, not an ERP."
    },
    "current-solution": {
      "default": "A shared spreadsheet updated by hand, always a day stale, reconciled before the morning cutoff.",
      "reasoning": "The baseline fails at the cutoff, so the design target is the reconciliation moment, not steady-state browsing."
    },
    "named-user": {
      "default": "Priya, 38, operations lead reconciling three warehouses before the morning order cutoff.",
      "reasoning": "Naming the operator (not the owner) anchors the design on the person inside the daily cutoff pressure."
    },
    "target-behavior": {
      "default": "Honestly there isn't one worth designing for — reconciliation is demand-driven, with full stock-takes monthly at best.",
      "reasoning": "This is below the habit zone; a designed habit loop would have nothing legitimate to attach to."
    },
    "internal-trigger": {
      "default": "External cues only: an order arrives, a discrepancy surfaces, the cutoff approaches. No internal itch to amplify.",
      "reasoning": "External triggers mean the design should optimise time-to-answer, not return frequency — the tool register."
    },
    "friction": {
      "default": "Order lands, check stock, confirm or flag: seconds each, under pressure. The limiting factor is time.",
      "reasoning": "Naming time as the constraint drives the compact density and a board that answers at a glance."
    },
    "success-signals": {
      "default": "Early: fewer oversells caught after the fact. Behind it: accurate promise dates. Time-in-app is explicitly not a metric.",
      "reasoning": "For a utility, engagement metrics reward the wrong thing — success is getting the operator out faster."
    },
    "ethics-gate": {
      "default": "It improves the operator's working day, but the maker isn't an operator — and with the frequency filter already failed, the honest verdict is a utility.",
      "reasoning": "The gate ruling against habit design here, out loud, is the point — the tool register, not the habit register."
    }
  },
  "screens": [
    { "id": "stock-overview", "title": "Stock overview", "collections": ["items"] }
  ],
  "copy": {
    "tagline": "A stock dashboard that shows what's really on the shelf — and gets out of the way.",
    "ethicsReveal": {
      "verdict": "utility",
      "narrative": "The frequency filter fails: reconciliation is demand-driven, not a routine to cultivate. So the method rules habit mechanics out and the design goes the other way — compact density, zero ceremony, success measured in oversells caught early rather than time-in-app."
    }
  }
}
```

## Product

Test stub — fictional content exercising the real-provenance code path; never shipped. Northwind is
a stock dashboard for small wholesalers running several warehouses: it shows what is really on the
shelf, what is committed, and what is at risk of overselling, so an order is never promised against
stock that isn't there.

## Users

Operations leads at small wholesalers. The named persona is **Priya, 38**, reconciling three
warehouses before the morning order cutoff. She doesn't want a full ERP; she wants a single true
number per SKU before she confirms an order.

## Problem

Stock lives in a hand-updated spreadsheet that is always a day stale. Promises get made against it,
and the discrepancy only surfaces when the shelf comes up short. The replacement need is one place
where on-hand and committed quantities are current at the moment of the promise.

## Behaviour model

There is no habit worth designing for here. Reconciliation is triggered by arriving work and by the
daily cutoff, not by any internal itch — full stock-takes happen monthly at best. The design target
is therefore response time under pressure, not return frequency: get the operator a trustworthy
number fast, then out.

## Ethics position

The frequency filter fails, so the method needs no matrix to reach its verdict: **utility**. Habit
mechanics would be engagement theater on someone's workday. The design goes the other way — compact,
fast, measured in oversells caught early. Same gate as the habit scenarios, opposite verdict.
