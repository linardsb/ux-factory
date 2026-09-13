# Faster Payment — sealed pre-registration (#291)

Written before the session opened. Unaided: no discovery run, no bank.

Provenance: written by a separate agent session with no ux-factory context, at Linards's instruction, from `_portfolio/decisions.json` (m-005 to m-008) and nothing else. The plan, the input file, the bank and the PRD were not read.

## m-005
**Parent I would name:** Stakeholder requirement — a customer paying someone new for the first time finishes the journey on their own, without a branch visit or a call.
**Why:** one action per screen serves a completion requirement; a menu of transfer types would serve a product-catalogue requirement that this flow has not been given.

## m-006
**Parent I would name:** Business requirement — every payment to a new payee is checked against the account holder's name, and the customer sees the outcome before any money is committed (Confirmation of Payee obligation; misdirected-payment and APP-fraud exposure).
**Why:** name-before-amount is the cheapest point at which "sees the outcome before committing" can be met; a silent check after Send would perform the check but leave the customer unable to act on it.

## m-007
**Parent I would name:** Stakeholder requirement — a payment the customer confirms succeeds at the first attempt, because declined and failed payments are a tracked cost (contact-centre calls, retries, complaints).
**Why:** the balance is shown to satisfy first-attempt success, not to enrich the display; a name-only dropdown moves the failure past Send, where it costs a contact.

## m-008
**Parent I would name:** Business requirement — before an irrevocable payment the bank gives the customer an effective, evidenced warning, because the bank carries the loss when an authorised push payment turns out to be a scam and the Faster Payment cannot be recalled.
**Why:** a full-screen stop with a required acknowledgement is what makes the warning provable as seen; a checkbox folded into the review screen is a warning in name only and would not stand as evidence of an effective intervention.
