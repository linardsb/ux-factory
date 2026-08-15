# Brief — a restock tool for a wholesale trading company

Human-authored input to the recorded run (`portal/record-build.mjs`). It is not agent output, and
it deliberately contains no board: it states the problem, never the answer.

## Who it is for

The inventory controller at Northwind Traders, a wholesale trading company. They start each morning
blind to which SKUs are at risk of overselling against open orders, and unblinding themselves is
the first thing they do every day — not a report they read weekly.

## The job it does

Keep stock ahead of what has already been sold. A SKU that will oversell has to become visible
before a customer order bounces off an empty shelf.

## What that person must be able to do

- See where today stands across the warehouse, well enough to know whether they need to act at all.
- Work the at-risk SKUs one at a time, with enough context on each to decide.
- Act on a decision — raise a restock or move stock between locations — and see that the action
  took before moving to the next one.

## Out of scope

No customer-facing notifications and no supplier negotiation. This is the controller's own working
surface; chasing a supplier is a phone call they make, and building that in would double the
appetite.
