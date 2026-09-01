# Implementation Report — the #338 finding fixes (F1, F2, F3, F6 first half)

**Plan**: `.claude/plans/discovery-finding-fixes-338.md` · **Branch**: `fix/338-findings` off `origin/main` (`9c48054`)
**Epic**: #279 · **Status**: COMPLETE. Every gate green; one new finding recorded below (F7) and not fixed here.

*Observed* means read from the named command's output or the named file field. *Derived* means
computed from observed numbers, with the arithmetic shown.

## Summary

Four findings closed, each with the check that would have caught it. The F6 prompt edit moved
`POSTURES.think.fingerprint` from `df6fbc35` to `fba70f00`, group 32 went red naming both hashes, and
the parenting fixture was re-recorded through the drawer — a real run, the same twelve answers.

The re-record produced a finding the pure gates cannot reach and #343 explicitly could not: **the
CLI's warmup denials are still being written into the transcript.** F7 below.

## What each fix does, and what proves it

| # | Fix | Proof |
|---|---|---|
| F1 | `GET /api/discovery/prd` + a "Download PRD" control | observed — the route's bytes are `cmp`-identical to `node discovery/prd-projection.mjs --root … --stdout`; the drawer control reported "PRD projected — 204 lines" and `git status` showed the package unchanged |
| F2 | `BOOT_SHA` (import-time) + `headSha()` (per request) + `stale` on `/api/health` | observed — `{"bootSha":"9c48054d…","headSha":"9c48054d…","stale":false}`, and the boot log prints `booted from: 9c48054` |
| F3 | a placeholder provenance, Start refused until one is picked | observed in the browser — the select opens on "Choose one — it decides where the package lands"; Start with the placeholder answered "Pick a provenance before starting…" and **created no package on disk** |
| F6 | `EVIDENCE_RULE` in the Think system prompt, before `PARENT_RULE` | observed — 4 `file_evidence` ops in the re-record where the rehearsal filed 0 in 30 turns; 4 of 12 decisions carry `evidence_refs` |

### The gates added

- **30.16** pins `EVIDENCE_RULE` verbatim, asserts it names both `url` and `ref` and forbids
  inventing evidence, and asserts `indexOf(EVIDENCE_RULE) < indexOf(PARENT_RULE)`. The parent rule
  holds the recency tail #341 paid for; a later string appended rather than inserted would take it
  away silently and only a re-record would find out.
- **30.20** drives the server's refusal of `""`, `null` and `undefined` provenance, then source-pins
  the drawer: the placeholder present and FIRST, the Start guard before the POST, the note three-way.
  Both controls carried — the pattern must match a planted string and must NOT match the pre-change
  shape, or a green here would mean only that the regex is unfalsifiable.
- **30.21** runs `isStale` over four pairs (unknown proven NOT stale), source-pins `BOOT_SHA` to
  module scope, and proves the PRD route read-only — `writePrd` neither imported nor called.
- **30.12** was widened from a bare `\bdocument\b` word match to group 28.8's DOM-REACH pattern with
  its positive control. `EVIDENCE_RULE`'s trigger list legitimately says "a document, a spreadsheet,
  a thread", and the old check could not tell that prose from the thing it forbids.

## The re-record — observed

| Number | Value |
|---|---|
| Probe turns before the re-record | 2, both `PARENTED` — $0.1014 + $0.0378 = **$0.139** |
| Turns closed | 12 of 12 · `endedAt` `2026-09-01T08:23:28.643Z` |
| Cost | **$0.637** over 12 turns ($0.0531/turn, derived) |
| SDK turns (model-internal) | 28 |
| Per-turn latency | min 10.0s · median 15.8s · max 36.0s |
| Decisions | 12 · business 1 · stakeholder 3 · solution 3 · transition 5 |
| Parenting | 11 eligible, **0 missed**, 0 structural orphans, 0 in-turn corrections |
| Evidence | **4** `file_evidence` ops (t1, t2, t6, t10), all `real-interview`; 4 decisions carry `evidence_refs` |
| Flags | `no-evidence` 8 (was 12 of 12), `orphan` 0 |
| Answers | 12, `text` / `question_id` / `turn` / `ref` identical to the pre-registered sheet (observed by compare) |

**The parent rule held with a string inserted above it.** Both probes filed
`record_decision seq 4 at solution, parent_id 2`, and the recording missed nothing in 11 eligible
decisions. That was the risk in placing `EVIDENCE_RULE` before it, and it is now observed rather than
assumed.

**On the answer sheet.** `discovery/README.md` said the twelve answers were pre-registered in
`.claude/plans/discovery-parent-id-341.md`. That file does not carry them (observed — no match for
the answers' text in the committed blob), so the sheet of record is the previous package's
`answers.jsonl`. It was copied out before the delete and re-supplied verbatim. The answers therefore
predate this prompt edit and cannot have been tuned to it, which is the property that matters; the
README now says where they actually live.

## F7 — NEW. The CLI's warmup denials are still recorded, and the honesty claim is false today

`discovery/instrument-loans-1/transcript.jsonl` now carries **79 `denied` lines**. Not one is the
discovery agent. By tool: Bash 53, Glob 9, Grep 7, `ListMcpResourcesTool` 6, `ReadMcpResourceTool` 3,
Read 1 — **zero op-tool refusals**. By content: `git status` ×7, `pwd` ×7, `git log --oneline -20`,
`ls -la …/instrument-loans-1`, and an Explore agent grepping the repo for the string `warmup`. The
discovery agent is handed one question and one answer and told to file one op; it has no reason to
run `git status`.

`portal/lib/discovery.mjs` stated the invariant: *"A `denied` line therefore means the discovery
agent itself was refused; the CLI's warmup agents leave no line."* **That is not true of this package
today**, and the module's header now says so — the header is the specification, so a downstream
README correcting a false claim in the owning file would be exactly the drift the convention exists
to prevent.

**What is observed:** `mainSession()` was true for all 79, so the bracket was not open when the hook
ran. **What is not observed is why**, and the run cannot tell: either `SubagentStart` had not fired
before the warmup agent's first tool call, or the bracket had already closed on a LAST stop while
warmup agents kept calling tools (`discovery.mjs` closes it on the last stop by design). The two
produce identical transcript evidence. The finding holds either way; the cause is open.

This is the first real observation of the gap #343 named and declared unreachable — its own group-30
summary said *"observable only on a paid probe whose warmup Explore agent actually calls a tool — 4
of 24 did on the fixture's sidechains, and the #343 probe's three made none."* Today's warmup agents
called tools 79 times and the bracket caught none of them. That summary clause is now updated.

**Why the count moved 3 → 79 is NOT the fix regressing.** The previous recording ran 2026-08-31
11:17, *before* #343 landed (16:36) — it had no suppression at all and still only drew 3, because
that session's warmup agents barely called anything. The variable is how much the CLI's warmup does,
not the fence. What this run shows is that when the warmup IS busy, #343's bracket does not catch it.

**Not fixed here.** It is #343's ticket, it needs a paid observation to design against, and the
transcript stays as recorded — a transcript is never edited. `discovery/README.md` now states the
count, its cause, and the rule for reading a `denied` line: an op tool is the agent, a built-in is
the CLI. *Recommend a follow-up ticket on #343; not filed, because A3 named two issues.*

## F8 — NEW, and it is the second half of my own F6 fix. Evidence provenance is unknowable to the agent

All four `file_evidence` ops carry `provenance: "real-interview"` (observed). `PROVENANCE` in
`discovery/ops.mjs` holds four values and one of them is `fictional-scenario` — which is what this
run is. So the fixture's `prd.md` Evidence table now reads `real-interview: 4` over a fictional
product answered from a pre-written sheet, and that is the shape #338's own report named on the
rehearsal: *"the package is self-describing and it describes itself wrongly."*

**It is not the agent being careless.** The run's provenance is a session-start choice recorded in
`run.json`; it is in neither the system prompt nor the turn prompt, so the agent has no way to know
whether it is sitting in a fictional run. Given only "the person told me this in the session", the
strongest honest label available to it *is* `real-interview`. The fix is to put the run's provenance
into the prompt — which moves the fingerprint again and costs another re-record ($0.637 + $0.139
observed), so it is **not done here**.

Nothing is edited: an op line is never hand-corrected. `discovery/README.md` names the mislabel.
*Recommend folding this into the A3 issue 2 amendment on #279, since both are about what
`file_evidence` can and cannot express.*

## F4 and F5 — verified, not re-fixed

- **F5** (`parent_id` never filled, #341/#342): `discovery/allergen-matrix-1/prd.md` line 7 reads
  `orphan 0` and line 400 `orphans 0`, against the rehearsal's 19 (observed). The re-record adds a
  second observation: 11 eligible, 0 missed.
- **F4** (#343, the corrected `denied` counter for #287): the corrected counter is confirmed and
  sharpened by F7. Refusals of built-ins are non-zero (79) and refusals of op calls are zero — the
  split the counter asks for, with the caveat that the built-in column is currently the CLI's noise
  rather than the fence doing work on the agent.

## Deviations from the plan

**D1 — the drawer was driven by browser automation, not by hand.** The same deviation #338's own
report recorded and for the same reason: an agent cannot click, and curling the routes would prove
the SDK and the package writer but not the drawer's JS, which no gate in `tooling/` reaches. Real
form controls, real `/api/discovery/*` routes, real CSRF origin guard. The answers are the person's
own, pre-dating the prompt edit, and the server wrote `answers.jsonl` through the sanctioned route.

**D2 — a fill handshake was needed.** The first drive attempt stalled on t2: the drawer clears the
textarea in its own `finally` after re-reading disk, so a fill issued the moment the cursor advances
on disk is wiped. The driver now waits for the page to name the turn, fills, and **reads the value
back** before clicking. No product change; the race is the driver's, not the drawer's.

## Validation results

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `build ✓ all 32 groups pass` (observed) |
| `node tooling/drift-check.mjs` | ✅ green across all twelve checks, staged tree (observed) |
| `node agent-layer/gen-loc-summary.mjs --check` | ✅ `3 groups — no drift` (observed) |
| `node portal/lib/discovery-transport.mjs --preflight` | ✅ 8/8 rows, zero tokens (observed) |
| `curl localhost:4748/api/health` | ✅ `ok: true`, `bootSha`, `headSha`, `stale: false` (observed) |
| PRD route vs the CLI fold | ✅ `cmp` identical (observed) |
| Group 32 on the re-recorded fixture | ✅ 12 turns, fingerprint `fba70f00`, 11 eligible / 0 missed (observed) |

No visual-regression run: nothing here touches a shipped page and `portal/` is never deployed.

## What this PR closes

F1, F2, F3 and F6's first half. It closes no GitHub ticket — the findings live in #338's report and
#338 must not close (its Phase B is the owner's sitting). F6's second half is filed as an amendment
on epic #279 (A3 issue 2). F7 is recorded above and recommended as a follow-up on #343; F8 is
recommended as a second half of that same #279 amendment. Neither is filed here — A3 named two
issues, and adding more is the owner's call.
