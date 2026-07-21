# Northwind — fictional product brief (private-instance shell demo)

Scenario package per `scenarios/README.md` (epic #38, ticket #43). **Northwind is a fictional
company, invented to demonstrate the private-instance shell** — no real company, users, or data.
It is the committed demo subject for `instance.html`: a fictional package that *additionally*
carries a `speculativeNotice` + `sources` in `copy.json`, so the shell's real-provenance rendering
path is exercised in-repo while the subject stays honestly labelled fictional (the fictional notice
renders above the speculative one). A real instance replaces this package with a company one compiled
from a brief — never committed here (privacy boundary).

```json
{
  "slug": "northwind",
  "name": "Northwind",
  "fictional": true,
  "domain": "wholesale inventory",
  "oneLiner": "A stock dashboard that shows what's really on the shelf — and gets out of the way.",
  "today": "2026-07-19"
}
```

## Product

Northwind is a stock dashboard for small wholesalers running several warehouses: it shows what is
really on the shelf, what is committed, and what is at risk of overselling, so an order is never
promised against stock that isn't there. In this repo it is the demo subject for the
private-instance shell — the page a hiring manager would open on an unlisted link, here running on a
clearly-labelled fictional company instead of a real one.

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
mechanics would be engagement theatre on someone's workday. The design goes the other way — compact,
fast, measured in oversells caught early. Same gate as the habit scenarios, opposite verdict.
