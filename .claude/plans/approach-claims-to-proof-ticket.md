# TICKET DRAFT — Every claim on approach.html reaches its proof in a counted number of steps

> **This is a ticket body, not an implementation plan.** Create it with `gh issue create` once approved,
> then plan it with `/piv-plan-implementation`. Drafted 2026-10-01 at the owner's request. Facts observed
> in the tree at `34ffc82`.

## Why this exists

The platform's thesis is that a hiring manager can check senior UXE skill instead of trusting a claim
(CLAUDE.md, §What this is). Nielsen calls the human labour of confirming delegated work **trustwork**,
and the same idea applies here. The site does not make the reader trust it faster. It makes checking
cheaper. Today that is asserted, not measured.

approach.html makes claims of two kinds:

- **Claims with proof on the page.** "A rebrand is one file" and "re-theming went from edits on every
  page to one line" are backed by the annotated source (`#asrc`), the derive probe (`#asrc-probe`), the
  inspect toggle and the measured `#loc-proof` / `#param-proof` lines. All of these come from
  drift-checked artifacts.
- **Claims with no proof link.** The four method cards ("Shape it", "Design for behaviour", "Prove it",
  "Ship it as a system") state outcomes such as "bad bets die on paper" and "I go back and check". Only
  the fourth links anywhere (`#case`). The page has 10 `href`s in total (observed, `grep -c`), most of
  them chrome and CTAs.

A reader cannot tell the two kinds apart, so the page reads as equally unproven everywhere.

## What "steps to proof" means

From the claim's sentence to the evidence that shows it, count one step per click, toggle, or
navigation. 0 means the evidence is next to the claim. Evidence is a committed artifact the reader can
open: a trace, a replay, a ledger row, a generated file, a running exhibit, a gate's output. Another
page's prose making the same claim does not count.

## Scope

1. **Audit.** List every claim sentence on approach.html, its proof target (or "none") and its step
   count. Commit the audit as a manifest (shape decided at planning; `system/param-manifest.json` is
   the precedent for a hand-maintained list beside a generated count).
2. **Close the gaps.** Each "none" gets one of: a link to existing proof; a rewrite down to what the
   site can show; or a deletion. No new exhibits are built under this ticket.
3. **Gate it.** A build-checks group asserts that every manifest entry has a target that exists in the
   tree, that its step count is ≤ N, and that every claim sentence on the page is in the manifest. The
   last check is the one that stops a new unproven claim landing silently.
4. **Optional, decided at planning:** render the measured result on the page from the manifest, the
   way `#loc-proof` renders its count. It must never be a hand-written number.

## Out of scope

- Other pages. index, factory and work make claims too. Do approach first because its whole job is
  claims; extend later.
- New proof exhibits. If a claim needs one, the claim is rewritten or cut here and the exhibit becomes
  its own ticket.

## Acceptance criteria

- [ ] The manifest lists every claim on approach.html with a target and a step count, and none is
      "none".
- [ ] The new build-checks group goes red when (a) a target path is deleted, (b) a step count exceeds
      N, or (c) a claim sentence is added to the page without a manifest entry. Prove each by mutating
      the source and watching it fail, not by reading the check.
- [ ] `node tooling/build-checks.mjs` green, with the group count updated in CLAUDE.md, `gates.md` and
      the group string (gate prose has three copies).
- [ ] Copy changes on approach.html regenerate its VR baselines in the same PR (delete and regen; the
      approach countUp makes `update:docker` keep stale digits otherwise).

## Open questions

- **Q1** What is N? Recommend 2. One click to open, one to see, matches the existing exhibits, and
  anything deeper is effectively hidden.
- **Q2** How is a "claim sentence" identified for check (c)? Options: a `data-claim` attribute on each
  claim element (explicit, and the manifest keys on it), or heuristics over the prose (fragile).
  Recommend `data-claim`.
- **Q3** Do the method cards' outcome claims ("bad bets die on paper") have committed evidence
  anywhere, for example the discovery packages or the PIV traces? The audit answers this. If not, they
  are rewritten in step 2, which changes owner-facing copy and needs the owner's sign-off on wording.

## Which epic

The PRD's honesty contract ("capability indicators state exactly what runs"). Suggest a loose ticket
unless `/piv-next` names a home.
