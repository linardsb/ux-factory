# PR #386 review — three discovery affordances through the four existing verbs (#289)

**Head** `9e63d8a85a4bc016c3705ae70f250c64c3396e40` · **Base** `main` @ `4f2e859d5cc3e1c515072faaafa2c803641858a6`
**Round** 1 — no prior review report, so the guarantees pass is skipped as first round; the in-PR merge of
`origin/main` was re-derived anyway, since the PR body's figures were written across it.
**Reviewed** 2026-09-09 · 14 files, +3395/−103 · OPEN, mergeable CLEAN, `verify` and `visual` both green.

## Recommendation

**Approve.** No critical or high issues. The applier-level enforcement of AC #3 is real and mutation-proven,
the no-deadlock claim holds under independent attack, and every re-derivable figure in the PR body
re-derived correctly. Four findings, all documentation-accuracy; F1 is the one worth fixing before merge,
and it is a comment edit.

---

## Validation

| Gate | Result | Evidence |
|---|---|---|
| `node tooling/build-checks.mjs` | ✅ `build ✓ all 34 groups pass` | observed, exit 0 at `9e63d8a` |
| `node tooling/drift-check.mjs` | ✅ | observed, exit 0 |
| `cd portal && node lib/discovery-transport.mjs --preflight` | ✅ `all 8 rows pass, zero tokens` | re-observed, PF1–PF8 |
| Portal smoke (private port 4791) | ✅ `/api/health` `ok:true`, `bootSha === headSha === 9e63d8a` | re-observed |
| `/api/discovery/config` | ✅ 75 questions | re-observed (65 + #283's ten) |
| Drawer controls in markup | ✅ `#discovery-park`, `#discovery-lookup`, `#discovery-aside` | re-observed |
| CI `verify` / `visual` | ✅ / ✅ | `gh pr checks 386` |

## The numbers pass

Every figure in the PR body traced to a run. Provenance labelled.

**Re-derived and correct (observed):**

| Figure | How re-derived |
|---|---|
| Fingerprints table — `think` / `think-opus` / `grill` unmoved, `create-prd` `edc7c52d…` → `f0e7599c…` | Imported `discovery-postures.mjs` at **both** `4f2e859` (detached worktree) and `9e63d8a`. All four values match the table in both directions. |
| Affordance stamps `44d0ea17` · `6d314071` · `be7bc73c` · `7b858251` | `AFFORDANCE_FINGERPRINT` read live; all four prefixes match. |
| **5 recordings** carry Think's two stamps | Read `turnStats[].postureFingerprint` off all 8 committed `run.json`. `7efdde37…`: bracket-trace-1, bracket-trace-2, graded-think-a, instrument-loans-1 (4). `cadb3811…`: graded-opus-a (1). Total 5. |
| `allergen-matrix-1` carries the older `df6fbc35` | Confirmed on disk, and confirmed pre-existing at `origin/main`. D10's correction is right. |
| D1's premise: `partner-audit-1` runs `grill` at `76b7847d` | Confirmed on disk, 3 turns. Moving Grill's stamp *would* strand a committed recording — **the plan's premise was genuinely false and D1 is the correct call.** |
| Corpus sweep `8 packages · 257 op lines · 200 answer lines` | Counted independently: 8 dirs with `run.json`; `type === "op"` lines sum to 257; `wc -l` on `answers.jsonl` = 200. |
| **7 of 7** committed `prd.md` re-project byte-identical | Re-ran `prd-projection.mjs <slug> --stdout` for all 7 and `cmp`'d. All IDENTICAL. (The 8th package, `spine-meridian-1`, has no `prd.md`.) |
| `thirteen cases → 30.45–30.57` | 13 case markers present. |
| "touches no shipped page and no `system/` module" | The 14-file list holds no `system/`, no root `.html`. The visual-flake attribution stands by construction. |

**Inherited, not re-derivable from this tree — label it that way.** F11's "Run 0 left 23 of 30 decisions
unbacked". `allergen-matrix-1` holds 30 `record_decision` and **0** `file_evidence` ops, so it is not Run 0;
Run 0 is the uncommitted jobs-folder run, outside this repo. The PR frames it honestly ("does not move
here"), so this is not a false claim — but it currently reads as observed and is not.

**Attribution check.** The gate declares its own vacuity *in its output*, not in a comment:
`0 off-script exchange(s) and 0 off_script op(s) — the sweep is VACUOUS at those numbers and is a
REGRESSION GUARD, not proof the detector works`, naming case 28.11 as the actual proof. Correct
attribution, and 28.11 carries it — five answer kinds (banked · aside · look-up · document · **legacy,
no `kind` key**), each refusal matched on its own message, positive controls, named reddening mutations.
One nuance worth stating precisely: part (a) of the sweep — re-folding all 257 real op lines through the
new applier — is a *genuine* backward-compatibility check, not vacuous. What is vacuous is the detection
half, because no committed package holds off-script data. Both halves are honestly labelled.

## Claims driven rather than read

**No-deadlock holds.** Traced independently of the report: filing an aside as
`record_decision{off_script:true, level:"business", parent_id:null, question_id:null}` passes every guard
in the branch (`ops.mjs:380–440`) and sets `closes = !p.off_script` → `false`, so it never reaches
`closeTurn`. Settle-once permits it at count 0. I could not construct a state with no legal next op.

**"The guard is on advancing, never on leaving" holds.** `closeSession` is `discovery.mjs:846` —
`mutateHead(root, () => ({ endedAt: now() }))`, unconditional, reads no ledger.

**Three mutations driven, all red by name (observed):**

| Mutation | Result |
|---|---|
| Drop `!p.off_script` from the supersede guard (`ops.mjs:431`) | `build discovery ops ✗ 3 failure(s)` + a hard `checkOpLines` throw |
| Unscope the closer guard from `intent === "aside"` (`ops.mjs:370`) | `build discovery ops ✗ 3 failure(s)` — the look-up path is genuinely gated, not merely prompted for |
| Make `indexOps` match its own comment (see F1) | **41 failures across 4 groups** — `discovery ops` 1, `prd projection` 30, `parenting` 8, `graded fixture` 2 |

**AC #5 verified.** `READ_TOOLS` byte-identical to base (`Read · Grep · Glob`); `allowsToolName` unchanged
but for one comment line. `MAIN_TOOLS` is `[]`, so `tools` is `[]` on a banked turn and `FETCH_TOOLS` only
when `affordance !== null`, which `runTurn` sets from `offScript ? intent : null`. No path allow-list widening.

**`intent` is server-written and unforgeable.** `appendAnswer` (`discovery.mjs:297`) refuses an off-script
line without an `AFFORDANCES` intent and refuses an intent on a banked line, both by name. The agent has no
tool that writes an answer line at all.

**The two new pure reads are total.** Drove `auditTraceability` and `auditExchanges` over 15 junk inputs
(`null`, `undefined`, `NaN`, `""`, `[{}]`, `[{op:"record_decision",params:null}]`, …): **0 throws each**,
deterministic across two calls, input array unmutated. `auditTraceability`'s cycle walk terminates on a
hand-corrupted cyclic `parent_id` chain.

---

## Findings

### F1 — Medium · two new comments specify an asymmetry the code does not have, and omit the one it does

**Files:** `discovery/ops.mjs:242–245` and `discovery/prd-projection.mjs:436–438` (both comment blocks added
by this PR), against the code at `prd-projection.mjs:448`.

Both blocks assert the same thing. `ops.mjs:243`:

> THE ASYMMETRY WITH prd-projection.mjs IS DELIBERATE: this reads `!== true` because ledgerView is TOTAL
> OVER JUNK … **where indexOps reads `=== true`**, because checkOpLines has already refused a corrupted ledger.

The code at `prd-projection.mjs:448` reads `d.params.off_script !== true` — the same predicate as
`ledgerView` (`ops.mjs:247`). There is no asymmetry. The build-checks re-derivation at
`tooling/build-checks.mjs:8395` also uses `!== true`, confirming `!== true` is what's intended.

**Failure scenario.** CLAUDE.md's own ground rule is "Invariants live in the file that owns them… That
header is the specification." An editor reading `prd-projection.mjs:436` sees a documented deliberate
`=== true` and "restores" it. With `=== true`, `latestByQuestion` maps only *off-script* decisions, so
every banked decision fails `latestByQuestion.get(qid)?.seq === d.seq` and drops out of `visible` — the
whole hierarchy empties.

**Mitigation, stated honestly:** I drove exactly that edit. It is loudly gated — 41 failures across four
groups (above). So this is a documentation defect that costs a debugging cycle, not a latent bug that ships.
That is why it is Medium and not High.

**The real asymmetry goes undocumented.** Where the two readers agree, the *applier* differs:

- `applyOp` (`ops.mjs:433`): `r.params.off_script === false`
- `ledgerView` (`ops.mjs:247`) and `indexOps` (`prd-projection.mjs:448`): `off_script !== true`

They part on a `record_decision` record whose `params.off_script` is absent or `undefined` — the applier
treats it as not-banked, both readers as banked, so the drawer's Ledger line and `prd.md`'s hierarchy would
report different numbers for one package. **No fixture can reach it:** all 98 committed `record_decision`
op lines carry an explicit boolean (verified), and `checkOp` throws on a non-boolean, so the applier can
never write the shape. It is reachable only through a hand-edited `transcript.jsonl`, which the honesty
contract already forbids. Recording it as a seam, not asking for a test.

**Fix:** delete the "asymmetry is deliberate" framing from both blocks and state that both readers use
`!== true`; if the applier/reader difference is intentional, that is the sentence worth writing instead.

### F2 — Medium · every #289 case number in the report and the PR body points one case too low

**Files:** `.claude/reports/discovery-affordances-289-report.md:40,58,70,89,91,93,118,125,132,227` — and the
**PR body** (D1 and D10), the most-read surface and the only one not in the working tree.

The PR body's own "Merged `origin/main`" section records the renumber (`30.44–30.56` → `30.45–30.57`). The
code was renumbered; the prose pointing into it was not swept.

| Cited | What the prose says it does | Actual |
|---|---|---|
| `30.44–30.54` (report L40, L58) | "the #289 additions" | `30.45–30.57` — 13 cases, not 11 |
| `30.45` (**PR body D1 + D10**, report L118, L162, L168) | "pins all four stamps", "derives the carrier list off disk" | **`30.46`** — `30.45` is the byte-identity case |
| `30.45` (report L70) | "one trailing space on Think's turn prompt reds 30.45" | **`30.49`** — `AFFORDANCE_FINGERPRINT` |
| `30.48` (report L125, L132) | "asserts the two [input sets]", "drives the override" | **`30.49`** |
| `30.53` (report L227) | "`allowsToolName` unwidened" | **`30.54`** |
| `30.54a` (report L89) | "pins `runTurn`'s [ordering]" | **`30.55`** — and no `a`-suffixed case exists in the file |
| `30.55` (report L91) | "the drawer's #289 half" | **`30.56`** |
| `30.56` (report L93) | "the route pin, renumbered from 30.54" | **`30.57`** |

**Failure scenario.** D1's stated follow-up — a Grill + Think re-record ticket — is **unfiled**. Whoever
files it opens `30.45` on D1's word, finds the byte-identity case, and either re-pins the wrong case or
concludes the stamps aren't gated. D10 has the same shape: it claims the hand-written carrier list "cannot
come back" because 30.45 derives it, but 30.45 derives nothing — 30.46 does.

**Fix:** sweep the eight report citations and the two in the PR body (+1 each), and replace `30.54a` with `30.55`.

### F3 — Low · a retired figure survives as prose fourteen lines under the case that replaced it

**File:** `tooling/build-checks.mjs:7932`

```js
`30.46: DOMAIN_RULE reached ${id}'s SYSTEM prompt — that moves a stamp six (Think) or three (Grill/partner-audit-1) recorded turns carry`
```

`six` is the exact figure D10 says was corrected from "six recordings" to five — and it survived inside the
very case that now derives the count, re-attached to the noun *turns*. It is wrong under every reading:
Think's four carriers hold **101** turns and `think-opus`'s one holds **65**, and a `buildThinkTurn` edit
moves both stamps — so **5 recordings / 166 turns**. Grill's "three" is correct (`partner-audit-1`, 3 turns).

**Failure scenario:** the case fires on a real `DOMAIN_RULE` leak and tells the reader six turns are at
risk when 166 are; they scope the re-record ticket to a sixth of the work.

**Fix:** derive it from `carriers()`, already in scope in the same block. This is the exact class D10 claims
to have structurally eliminated — worth closing in the same edit.

### F4 — Low · settle-once forbids the contradictory pair, not a duplicate same-kind filing

**File:** `discovery/ops.mjs:395–398` and `:468–471`, with the accepting case at `tooling/build-checks.mjs:6092`.

The guard checks only for the *opposite* op type on the same `answer_ref`. A second
`record_decision{off_script:true}` on the same ref is accepted — deliberately, and tested with that
rationale ("the rule forbids the contradictory PAIR, not a re-filing").

**Failure scenario:** an agent files two off-script decisions on `a2` with contradictory `wrong_if` values.
Both succeed. Because off-script decisions never supersede or get superseded, both render as separate
unmarked `#### seq` blocks in `prd.md`'s ladder, with nothing on the page indicating they are two takes on
one exchange, while `auditExchanges`'s `settledBy` silently reports the first via `.find()`.

Not a bug — a scoping choice. But MVP 9's wording ("settles as a decision **or** an open question, never
both") reads as "exactly one filing", not "at most one per op kind". **Fix:** one sentence in
`discovery/README.md`'s off-script bullets saying a duplicate same-kind filing is accepted, or tighten the rule.

---

## What's genuinely good

- **The design constraint is honoured exactly.** Three controls, four verbs, no fifth verb, no new answer
  kind, no new `TOOL_DESCRIPTIONS` key — and 30.47/30.48 restate both locks *because* this is the ticket
  that would have broken them. That is the right place for a restated invariant.
- **The load-bearing move is the right one.** Recording the person's declared `intent` on the answer line
  turns MVP 9's filing rule from prompt text into a property of an append-only, server-written store. The
  four rules key on the *answer*'s server-written `kind`, never on the agent's own assertion — which is
  what makes applier-level enforcement possible at all.
- **Settle-once is scoped by the answer's `kind`, not by "two settling ops on one ref"**, with the reason in
  the code: an existing-prd audit's ordinary decision/open-question pair both name the one `document` line,
  and all eight committed packages are blank-idea — so an unscoped rule would have passed every gate and
  broken on the first real audit run. Catching that with no fixture able to catch it is the strongest single
  call in this PR.
- **D1 is a real correction to the plan, verified on disk**, not a convenience. `partner-audit-1` is the
  eighth package and runs `grill`; splitting `DOMAIN_RULE` to Create-PRD alone is what keeps a committed
  recording honest.
- **`AFFORDANCE_FINGERPRINT` computed off the resolved posture** (D3) avoids a genuine bug class — a
  Grill-on-Opus override recomputes its own stamp instead of silently reusing the sonnet one, and case
  30.49 drives a real override rather than asserting it.
- **The gate declares its own vacuity in its output** and names the case that isn't vacuous, in both
  directions, so it can go red when the corpus grows.
- **Every new gate case carries its reddening mutation**, and all three I drove independently went red by
  name. This is not a check-that-cannot-fail.
- **XSS**: new drawer content (`a.ref`, `a.turn`, `a.text` in the unfiled-exchange block) goes through the
  existing `esc()` pattern; status-line writes use `.textContent`. No new injection vector.
- **The "not run" table is exemplary.** AC #1's mechanism half is stated as "the prompt and the fence are
  wired; execution unobserved", with the cost and what each unrun step would settle. The honesty contract
  working as intended, not around it.

## What this review could not reach

- Whether `WebSearch` **executes** under the SDK on a real off-script turn. `--probe-affordance` is built
  and loadable and has never been run; the PR says so. Paid, and the operator's call.
- Whether a live agent complies with the closer guard rather than stalling a turn. The applier-level proof
  is complete; the behavioural half is the drawer walk, also unrun and paid.
- The rendered drawer. `portal.js` touches the DOM at module scope, so group 30's half is a source pin. The
  portal smoke above confirms the three controls are in the markup, not that they behave.

---

*Reviewed with `/piv-review-pr` — fresh context, `code-reviewer` agent dispatched over the full diff.*
