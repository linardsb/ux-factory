# #384 — pin `PROVENANCE_RULE.real` verbatim, and `ledgerBrief`'s empty-ledger form beside it

Ticket: #384 · Epic: #279 · deferred from the PR #381 review (F2, option 2).

## The gap, restated from the tree

`portal/lib/discovery-postures.mjs`'s header keeps a list of the template branches that sit
outside every posture fingerprint. There are four today. Two of them — `PROVENANCE_RULE.real`
and `ledgerBrief`'s empty-ledger form — were guarded by regexes that name two phrases each, and
by `includes(PROVENANCE_RULE.real)` assertions that compare the built prompt against the *edited*
constant. Neither kind can see an edit to the string itself.

Observed on this branch before the change, by mutation:

- `PROVENANCE_RULE.real`: "something the person believes but has not checked is" →
  "a HUNCH the person has not checked is" — `build ✓ all 34 groups pass`.
- `ledgerBrief([])`: "A stakeholder, solution or transition decision filed now has no parent
  candidate" → "A decision filed at any rung below business has nothing above it yet" —
  `build ✓ all 34 groups pass`.

Both are the shape #366 closed for the re-ask brief: a live prompt string no gate can see an
edit to.

## Why the branches are unhashed (verified, not assumed)

Every fixed input set pins `provenance: 'fictional'` and carries a three-`record_decision`
ledger. Driven over the module:

```
FINGERPRINT_INPUTS            provenance="fictional"  ledger len 3
AUDIT_FINGERPRINT_INPUTS      provenance="fictional"  ledger len 3
PARK_FINGERPRINT_INPUTS       provenance="fictional"  ledger len 3
AFFORDANCE_FINGERPRINT_INPUTS provenance="fictional"  ledger len 3
LOOKUP_FINGERPRINT_INPUTS     provenance="fictional"  ledger len 3
```

So `PROVENANCE_RULE.real` is selected by no stamp, and `ledgerBrief`'s zero-decision branch is
taken by no stamp.

## Tasks

**T1 — the two verbatim pins.** Extend case 16 and case 17. Do NOT add a `group()` (the count is
pinned in four claim rows across three files — `build-checks.mjs`, `CLAUDE.md` twice, and
`gates.md`; `drift-check`'s group-count leg reads all four) and do NOT widen the fingerprint:
adding a `provenance: 'real'` input set would move all four posture stamps and stale **at least**
142 paid turns of committed recordings — a FLOOR, not an estimate, because `bracket-trace-1`,
`bracket-trace-2` and `partner-audit-1` carry gate-uncompared stamps that would stale silently. The
existing `includes()` assertions stay — they prove routing, which the literal does not.

Both literals are emitted mechanically from the module and pasted, never retyped (each carries
em dashes, an apostrophe and inner double quotes), and each stays on ONE line — a wrapped
backtick literal gains a newline and lands red on day one.

**T2 — the prose, in all four copies.** A guard clause lives in four places here:

1. `portal/lib/discovery-postures.mjs:74-100` — the header's branch list.
2. `tooling/build-checks.mjs` — case 16's own comment (and case 17's, a fifth edit site).
3. `tooling/build-checks.mjs` — the group-30 `group("discovery", …)` descriptor, clauses 18 and 27.
4. `.claude/references/gates.md:49` — the group-30 entry.

**T3 — prove it by mutation.** For each pin: mutate a phrase inside the constant that neither
existing regex names, confirm the gate goes RED, read WHICH case named it, confirm the
`includes()` assertions stayed green (if one also reddens, the self-referential premise is wrong
and the pin is not what caught it), revert, confirm green.

**T4 — gate.** `build-checks`, `token-lint`, and `drift-check` on a STAGED tree (it reads the
index; an unstaged run is a false green).

## Scope held

`ledgerBrief`'s rendered EVIDENCE LINE (#289) is the fourth unhashed branch and has the same
gap. It is NOT folded in: the ticket body names two branches, and the ticket's own "Why it was
not done in #366" section sets the precedent — a second hardening folded in "would have widened
it past its ticket". The merged header at `:94-100` claimed #384 covers it, so that bullet is
rewritten to state what #384 actually did and that the widening is still open. The header ends
this PR true either way.

## Cost

Zero paid turns. No prompt string changes, so no posture fingerprint moves and no committed run
package is staled.
