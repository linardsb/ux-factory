# Run 1 input — Faster Payment

**Committed:** 2026-09-13 · **Run:** `discovery/faster-payment` · **Ticket:** #291 · **Epic:** #279
(intent: `docs/epics/discovery-partner.prd.md` §MVP 12)

This is precondition 1: the one-sentence subject of run 1, fixed in git before the session opens, so
that nothing the run reaches can be attributed to a subject chosen on the day. The operator pastes the
sentence below into the drawer as the blank idea, verbatim and alone.

## The input

Meridian needs to let a customer pay someone they've never paid

## What is deliberately absent

No screens. No Confirmation of Payee. No scam warning or scam stop. No mention of irrevocability, of
APP reimbursement, or of any regulation. No user type, no volume, no platform, no success measure.

The published `m-005`…`m-008` decisions for this prototype are all solution-level and name those
screens; run 1 is scored the other way up, on whether it produces the business and stakeholder
requirements those four turn out to serve. Anything in this file beyond the one sentence and this
framing paragraph is leakage into that score, which is why the file is short and why it is dated.

## Where the rest of the scaffolding lives

- The sealed pre-registration — the owner's unaided answer, written before the session — is
  `docs/epics/fixtures/faster-payment-pre-registration.sealed.md` (precondition 2).
- The scoring key is `<JOBS_DIR>/_portfolio/decisions.json`, outside this repo and denied by the read
  fence for the duration of the run.
- `node tooling/run-1-ready.mjs` asserts both files exist, are tracked, and are unreadable from inside
  the run's allow-set.
