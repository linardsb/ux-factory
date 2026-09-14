# PR #407 review — the PRD house shape (#396)

**Head** `b732ec1` · **Base** `main` @ `7c6f43b9061404daafb773036641e66776a3e286` · **Round** 1 (no prior report — guarantees pass skipped; base unmoved, `merge-base HEAD origin/main` = `baseRefOid`)
**Reviewed in** `../ux-factory-wt-396` (the primary tree is shared with sibling sessions and was not checked out)

## Summary

A docs + skills PR that does what it says: one canonical ladder header on all nine `docs/epics/*.prd.md`, write-back
steps in the two skills that move the ladder, and `## Later, not never` on the three open epics built from bullets
those files already carried. The evidence discipline is unusually good — every date I re-derived independently
matched, and the eleven "verbatim" bullets are genuinely byte-identical.

One High finding: the two write-back instructions this PR exists to add, executed literally, produce a header that
fails the grammar the same PR establishes. Two Mediums and one Low ride alongside. All four fixes are small.

## Issues

### F1 (High) — the executors write a non-conforming header

`.claude/skills/plan-architecture/SKILL.md:111` — "replace `architecture: TBD` in the PRD's status header with
`decided <date>`"
`.claude/skills/piv-slice-epic/SKILL.md:83` — "replace `sliced: TBD` in the PRD's status header (line 3) with
`#$EPIC <today>`"

Both name the **whole slot** as the search string and only the **value** as the replacement. Executed literally:

```
**Status:** intent · grilled 2026-09-14 · decided 2026-09-20 · #401 2026-09-21 · **Created:** 2026-09-14
```

— the `architecture:` and `sliced:` labels are gone, and that line fails the regex all nine files now satisfy.

This is a defect rather than a reading preference because the repo now carries **two spellings of one instruction**,
and the non-conforming one is the executable half. Three surfaces:

- `plan-create-prd/SKILL.md:110–112` — "`plan-architecture` writes `architecture: decided <date>` … `piv-slice-epic`
  writes `sliced: #<epic> <date>`" (full slot)
- `plan-architecture/SKILL.md:113`, the folded bullet — "Set the header's slot to `architecture: folded <date>`"
  (full slot)
- the two lines above (value only)

Two agree; the executor disagrees. Nothing catches it: the PR's own §Non-goals declines to add a gate ("a form regex
cannot see the failure that happened"), and the failure here is precisely a **form** failure — silent, on the next
epic, one file at a time.

**Fix** (two words): `… with `architecture: decided <date>`` and `… with `sliced: #$EPIC <today>``.

### F2 (Medium) — the `closed` rung has no executor

`.claude/skills/plan-create-prd/SKILL.md:112` — "closing the epic issue appends `· closed <date>` before
**Created**."

`grep -rn 'gh issue close' .claude/skills/` returns one hit, `piv-implement-issue/SKILL.md:233`, which closes the
**bug issue** it just fixed, not an epic. No skill closes an epic and no skill writes the `closed` slot (observed).

This is a weaker failure than the `architecture: TBD` case the PR diagnoses — `closed` has no TBD placeholder, so
its absence reads as "not closed", which is true until it isn't. But six of the nine headers this PR writes carry
`closed <date>`, so the slot demonstrably belongs to the form, and the three open epics (#279, #295, #329) will
acquire the same false-by-omission state the day they close, with nothing to notice.

**Fix**: one clause in `plan-create-prd` naming the executor — the owner, by hand, when they close the epic issue —
so the rung is not presented as automatic. Or add the write-back to whatever step closes an epic, if one exists.

### F3 (Medium) — the report's architecture-date provenance is false for three of nine

`.claude/reports/prd-house-shape-396-report.md:47` — "`architecture` dates re-read from each architecture doc's own
'Decided' line (observed)".

Three of the nine architecture docs carry no such line (observed):

| PRD | header claims | its architecture doc says |
|---|---|---|
| `ai-first-ux-factory` | `architecture: decided 2026-07-17` | no Decided line (date is the doc's first commit `d7fcf0c`, 07-17) |
| `portfolio-v3-experience` | `architecture: decided 2026-07-22` | no Decided line; the doc was first committed 07-24 (`1078d43`) |
| `prototyping-feel-uplift` | `architecture: decided 2026-07-30` | `**Created:** 2026-07-30`, not a Decided line |

**The dates themselves are fine** — I re-derived all nine and every one holds, and the plan's own table records the
real provenance per row (`:482` first commit; `:487` "#70 created 07-22 with the PRD as body carrying the
`Architecture:` link"). Only the report's one-line summary states a source that does not exist for a third of the
rows, under an "(observed)" label, in a repo whose honesty contract is the point.

The PR body's looser wording ("the architecture doc's own 'Decided' line, or `git log --diff-filter=A`") survives on
a technicality — 2026-07-22 *is* `#70.createdAt` — so this is one location, not two. **Fix**: amend that sentence in
the report to name the three sources actually used.

### F4 (Low) — `generative-prototyper.prd.md:3` drops the issue link

`**GitHub epic:** [#86](https://github.com/linardsb/ux-factory/issues/86)` becomes bare `sliced: #86`. Line 4 still
links #70, so the file now links one epic and not the other. This is the ladder grammar's own cost (`sliced: #<epic>
<date>` is plain text) and applies uniformly to all nine, so it is a design consequence rather than a slip — noted
only so the choice is deliberate.

### F5 (Low) — six of nine PRDs end up non-conforming to the skill's own §9, by design

`plan-create-prd/SKILL.md:127–129` makes §*Later, not never* section 9 of every PRD and says "Empty is a valid
answer — write \"none\" rather than invent one." After this PR, three PRDs carry §9 and six carry nothing there.

The reasoning is right and is stated in the PR (§Non-goals): writing `none` onto a closed epic would be an agent
asserting the owner never parked anything, which is the owner's half. But the consequence is that a later reader
cannot tell "this epic parked nothing" from "this epic predates the rule", and the house shape the ticket is named
for is uniform on line 3 and not below it.

Disclosed under **D3**, so this is the owner's call, not a defect — flagged only so the yes is an informed one. If
the answer is "leave them", one clause in the skill ("a pre-rule PRD omits §9 rather than asserting `none`", beside
the `grilled`-slot clause it already carries at `:114`) would make the omission readable instead of ambiguous.

## What I verified independently (and what held)

| Claim | Result |
|---|---|
| Nine `sliced`/`closed` dates | re-derived from `gh issue view <n> --json state,createdAt,closedAt` for #1 #70 #86 #164 #202 #243 #279 #295 #329 — **all nine match**; the three open epics carry no `closed` slot (observed) |
| Header regex over nine line-3s | my own regex, run fresh — **silent on all nine** (observed) |
| "eleven bullets moved verbatim" | my own script: each bullet under each new `## Later, not never` tested as a byte-identical substring of `git show origin/main:<file>` — **4 · 5 · 2 = 11, all verbatim** (observed) |
| "eight non-goals remain" (canvas) / "eleven" (discovery) | `awk` over §Non-goals → **8 · 11 · 3** (observed), matching the PR body |
| Section order after the moves | Non-goals → Later, not never → Open questions in all three files (observed) |
| No cross-doc citation now points at a moved bullet | grepped the seven moved bullet titles and `§Non-goals` across `docs/ discovery/ tooling/ portal/ .claude/skills/` — the only hits outside the two PRDs are in the **frozen md5-pinned fixture**, untouched by this PR (observed) |
| "no gate reads the PRD's bytes" | `KEY` at `run-2-ready.mjs:55` is used at `:119` as a **fence deny path** only; the md5 pin is on `fixtures/discovery-partner.prd.pre-grill-2026-08-27.md`, not in the diff; build-checks green on the edited tree (observed) |
| "canvas's (G1–G33) / 26 tickets live elsewhere" | `canvas-design-import.prd.md:206` carries "Resolved at the 2026-08-28 grill (G1–G33…)"; issue #295's body names **#296–#321, all 26** (observed) |
| D1's framing of PR #394 F4 | `pr-394-review.md:118–125` names exactly the two undisclosed edits the PR body lists (observed) |
| `grep -n Status` empty on both skills at base | `git show origin/main:…` → **0 matches each** (observed) |

## Validation

| Command | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass` (observed, on `b732ec1`) |
| `node tooling/token-lint.mjs` | `63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed) |
| `node tooling/drift-check.mjs` | `✓ syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count` (observed) |
| portal smoke `PORT=4801` → `/api/health` | `200`, `{"ok":true,…,"bootSha":"b732ec1…","stale":false}`; killed by port (observed) |

No test suite, linter or type-check exists in this repo (CLAUDE.md §Testing) — the four above are the gate stack.
No shipped page changed, so no VR baseline is implicated.

## What's good

- **The verbatim discipline actually holds.** "Moved, not rewritten" is the kind of claim that quietly fails on a
  rewrap; I tested all eleven bullets as byte-identical substrings and every one passed.
- **The honesty line is held in both directions.** No reason was invented for a non-goal, no `none` written for a
  closed epic, and no `grilled` date fabricated where none is on record — each an explicit refusal to write the
  owner's half.
- **The report logs its own plan errors** (§Non-goals held 15 not 6; the `Later, not sliced` grep scoped outside
  §Amendments) rather than quietly conforming to the plan.
- **The stale-header diagnosis is correct and evidenced**: `st-ux-fusion.prd.md:3` read `architecture TBD` from
  2026-08-07 while `st-ux-fusion.architecture.md:3` has said `Decided: 2026-08-07` since the day it landed.
- Every date I could falsify, I tried to; none moved.

## Merge note (not a finding)

The PR body calls the sibling session's uncommitted work "the shared tree's unstaged 2026-09-02 amendment … it will
conflict trivially at EOF". It is **two hunks**, not one: an §Amendments entry at EOF (which will conflict — keep
both, date order) and a new **Asked what mattered** row in §Success metrics at line 365, seven lines above this PR's
first §Non-goals removal. The second should apply cleanly; the advice stands, the description is just narrower than
the change.

## Recommendation

**Request changes** — F1 only. It is two words in two files, and it defeats the PR's stated purpose ("the rule gets
an executor") with no gate behind it. F2 and F3 ride in the same fix commit; F4 and F5 need nothing unless the owner
wants the link back, or wants the six omissions made readable.

Nothing else here blocks. The nine headers, the eleven moved bullets and the four gates are all sound.
# PR #407 review — addendum (round 1, part 2)

**Head** `b732ec1` · **Base** `main` @ `7c6f43b9061404daafb773036641e66776a3e286`

The `code-reviewer` agent's pass landed after I posted. It found two Mediums I missed and one I under-called.
I re-derived all of them against the tree before posting this. **One row of my own verification table was wrong
— corrected below.** Verdict is unchanged (request changes), now on three blockers rather than one.

## Correction to the posted review

> | No cross-doc citation now points at a moved bullet | … the only hits outside the two PRDs are in the **frozen
> md5-pinned fixture**, untouched by this PR (observed) |

**That row is wrong.** My grep looked for the moved bullets' own titles and the literal `§Non-goals`. It could not
see prose that refers to the same bullets *by description* — which is where both new findings live. F6 is an
in-file contradiction and F11 is three stale references in sibling docs. The fixture claim itself still holds.

## F6 (Medium) — `discovery-partner.prd.md:14-15` now contradicts itself, four lines under the header this PR rewrote

```
**Scope:** wave 1 of the revamp — the discovery half, in the portal, for the operator. The canvas (D6),
component import (D7) and the guest instance (D1) are named here as non-goals and belong to later epics.
```

After this PR, "No canvas work" (D6) and "No component import" (D7) live under `## Later, not never`; only the
guest-deployment bullet (D1) is still a non-goal. §Scope was true before the move and is false after it, and the
PR's own amendment entry asserts "the eleven non-goals that remain stand as written" — which is true of the
section and not of the sentence that describes it.

**Fix**: `…are excluded here — the canvas and import as parked work (§Later, not never), the guest instance as a
non-goal — and belong to later epics.`

## F7 (Medium) — `canvas-design-import.prd.md:3` drops a ticket range with no home, against this PR's own new rule

The header dropped `26 tickets #296–#321`. The PR body says it and `(G1–G33)` "both live in its §Open questions and
in #295". That is a conjunction, and the ticket range fails the first half:

- `G1–G33` → present at `:68` and `:206`, and in issue #295 ✓
- `26 tickets #296–#321` → **absent from the file.** `grep -n '296\|26 tickets\|#321'` returns exactly one line,
  `:253`, naming `#318–#321` — the addendum's four tickets, a different and narrower set. Present in #295's body
  (all 26, observed) ✓

So the dropped content survives only in the GitHub issue, not in the doc. That matters here because it is the rule
this PR writes: `plan-create-prd/SKILL.md:112-113` — "Nothing else goes in the header — inputs, owners and **ticket
ranges live in the body**." The header is cleared on the strength of a body that does not carry it.

This is the same class as F3, and it is the more consequential of the two: F3 mislabels how a correct date was
obtained; **F7 is a claim about where content went that is false**, and the content is gone from the doc as a
result. I passed this in my first read by giving the claim the benefit of a disjunction it was not written as.

**Fix**: one clause on the §Architecture line (`:255-257`) — `Sliced as epic #295 on 2026-08-28: 26 tickets,
#296–#321.`

## F8 (Low) — `portfolio-v3-experience.prd.md:3` omits `grilled` where a grill *is* on record

`:7` — "Decisions here were resolved interactively with the owner on 2026-07-22 (**grill session**, D1–D11)."

That is the same evidence shape that earned `generative-prototyper` its slot (`:18`, "Owner conviction (grill
session, 2026-07-23)"), and the skill licenses omission only for "a PRD written before this rule **with no grill on
record**" (`plan-create-prd/SKILL.md:113-114`). Report Q1 defends the omission for `prototype-studio` and
`st-ux-fusion` and never names this file.

It also sharpens **F3**: `architecture: decided 2026-07-22` for this PRD is `#70.createdAt`, and `:7` says
2026-07-22 is the day the **grill** happened. The one date is doing duty for two rungs while the grill slot sits
empty.

**Fix**: add `grilled 2026-07-22` to line 3, or extend report Q1 to name the file and say why. Owner's call.

## F9 (Low) — `piv-slice-epic/SKILL.md:84` names a commit the skill never makes

"…and include that edit in the ticket-creation commit". The skill's Steps 1–7 are `gh issue create` / `gh issue
edit` throughout; `grep -n commit` over the file returns this line and the `:145` handoff, which routes
`/piv-commit` to *a ticket's implementation*, not to this PRD edit. As written the header edit is left uncommitted
in the tree — the same silent-staleness outcome the write-back exists to prevent.

**Fix**: name the commit, e.g. `then commit it: git commit -m "docs(epics): <slug> sliced as epic #$EPIC"`.

## F10 (Low) — `plan-architecture/SKILL.md:111` has no rule for an absent header

The instruction only says what to do when `architecture: TBD` is there. Every pre-rule PRD, and the third option
("a standalone `architecture.md` … no PRD to link to"), has no such string. The motivating failure in the PR's own
body — `st-ux-fusion` stale for five weeks — was a PRD with a non-conforming header, which is precisely the case
the new instruction still cannot handle.

**Fix**: "if the PRD carries no status header, add one per `plan-create-prd` before writing the date."

## F11 (Low) — three references to the moved bullets as "non-goals", outside the diff

- `docs/epics/canvas-design-import.architecture.md:327` — "the write direction is a non-goal"
- `docs/epics/discovery-partner.architecture.md:263,266` — "non-goaling a11y gating (D11) to its own epic" ·
  "Recorded so the non-goal is not misread"
- `__canvas_planning_PRD.md:456` — "canvas (D6) and import (D7) named as non-goals"

Informal usage, and each bullet still opens with "No …", so nothing here is *false* in the way F6 is. Listed so the
count is complete. Fine to leave.

## Independently confirmed (the agent and I agree, derived separately)

- **F1** — both write-back instructions strip the slot label; the folded bullet at `:113` keeps it. Same finding,
  two contexts, no shared reasoning.
- All nine issue dates · the 11 byte-identical bullets · the 8/11 non-goal counts · section order in all three files
  · no numbered `§8`/`§9` reference broken · the PRD read only as a fence **path** (`run-2-ready.mjs:55` →
  `:119`, `build-checks.mjs:9337`), never its bytes.
- The agent additionally diffed `discovery-partner.prd.md:327-341` — the window `.claude/plans/…-292.md:149` cites
  for MVP 13's eight findings — at `7c6f43b` vs `b732ec1`: **byte-identical**, so #292's receipt is undisturbed.

## Revised recommendation

**Request changes.** Blockers: **F1** (High, two words) and **F7** (Medium — a false claim in the PR body plus
content with no home). **F6** should ride with them: it is one sentence, and leaving it makes the PR's own "no
meaning changed" claim untrue in the file it changed most. F3, F8, F9, F10 are one-line edits in files already open.
F4, F5, F11 need nothing.

Everything in the first review that I marked verified still holds, except the one table row corrected at the top.
