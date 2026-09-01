# Implementation Report — file_evidence names an artefact, and the agent knows which run it is in (#347)

**Plan**: `.claude/plans/discovery-file-evidence-347.md` · **Branch**: `fix/347-file-evidence-amendment` off `origin/main` `0fbe8c8`
**Epic**: #279 · **Status**: COMPLETE. All 32 groups green, drift-check green, the parenting fixture re-recorded under the new prompt.

*Observed* means read from the named command's output or file field on 2026-09-01, on this machine, Node v20.20.2,
SDK 0.1.77. *Derived* shows the arithmetic. *Expected* is an assumption.

## Summary

`file_evidence` gains `name` (Half A) and the Think system prompt gains the run's provenance (Half B). The prompt
edit moved `POSTURES.think.fingerprint` `fba70f00` → `7efdde37` and `think-opus` `cda7390b` → `cadb3811`; group 32
went red naming both hashes and the old package's shape; `discovery/instrument-loans-1/` was re-recorded through
the drawer with the same twelve answers, and both halves are **observed** on it rather than assumed.

## What each half does, and what proves it

| Half | Change | Proof |
|---|---|---|
| A | `PARAMS.file_evidence` = `url · ref · name · provenance · claim_ref`; applier accepts a name only beside a ref; projection renders `name (answer ref)` | group 29 records a named artefact with PARAMS' key order and refuses a name beside a url, an empty and a non-string name; group 31's named row reaches the page (observed) |
| B | `PROVENANCE_RULE[run.json.provenance]` in the system prompt, before `EVIDENCE_RULE`; `buildThinkTurn` refuses a build without it; transport passes `head.provenance` | group 30 case 16 pins both texts and the order, case 19 proves a real build moves the hash, case 12 pins the transport (observed) |

## The re-record — observed

| Number | Value |
|---|---|
| Probe turns | 2, both `PARENTED` — $0.1036 + $0.0347 = **$0.139** (derived) |
| Turns closed | 12 of 12 · `endedAt` `2026-09-01T10:16:48.687Z` · wall-clock 4.3 min |
| Cost | **$0.424** over 12 turns ($0.035/turn, derived) · 27 SDK turns |
| Per-turn latency | min 10.5s · median 15.5s · max 47.5s |
| Decisions | 12 · business 2 · stakeholder 2 · solution 4 · transition 4 |
| Parenting | 10 eligible, **0 missed**, 0 structural |
| Evidence | **3** `file_evidence` ops (t1, t2, t3), **all `fictional-scenario`**, **all named** ("Annual instrument write-off and loss figures", "paper loan book and September spreadsheet", "parent consent slip"); 2 decisions carry `evidence_refs` |
| Flags | `no-evidence` 10 · `orphan` 0 |
| Denied lines | 4, all `Bash` — `pwd && git status --short` (t4), `pwd`, `ls -la …/instrument-loans-1`, `ls -la …/discovery/` (t6) |
| Answers | 12, `ref` / `turn` / `question_id` / `kind` / `text` equal to the preserved sheet (observed by compare) |
| Fingerprint | `7efdde37` on all 12 `turnStats` entries |

**#338 F8 is closed by observation, not by edit:** the previous package's `real-interview: 4` is in the git
history untouched; this one's Evidence table reads `fictional-scenario: 3`.

**The parent rule held with a second string inserted above it.** Both probes filed `seq 4 at solution,
parent_id 2`; the recording missed nothing in 10 eligible.

## Deviations from the plan

**D1 — the drawer was driven by headless Chromium (Playwright 1.59.1), not by hand.** Real form controls,
real `/api/discovery/*` routes, real origin guard; the answers are the preserved sheet re-supplied verbatim, the
server wrote `answers.jsonl`. Same deviation and reason as PR #345's re-record. The driver waits for the page to
name the question and go idle, fills, reads the value back, then clicks.

**D2 — the applier refusal of `real-interview` on a fictional run is not built.** Recorded in the PRD amendment
as the fallback; the prompt was sufficient on this recording (3 of 3 labelled correctly).

## Findings

**F1 — the four `denied` lines cannot be attributed.** Two are warmup-shaped (`pwd`, `git status`), two are
`ls -la` of the run directory, the shape #338 F4 attributed to the agent itself. This run predates the
`DISCOVERY_BRACKET_TRACE` instrument the #349 session is landing, so it does not settle #349's question; the
lines stay, as every transcript line does.

**F2 — the fixture now has three evidence rows where the previous recording had four.** Different turns
(t1–t3 against t1, t2, t6, t10). Not a regression claim either way: one recorded session each.

## Validation results

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `build ✓ all 32 groups pass` (observed) |
| `node tooling/drift-check.mjs` | ✅ green across all twelve checks (observed) |
| `cd portal && node lib/discovery-transport.mjs --probe-parenting` ×2 | ✅ `PARENTED`, `PARENTED` (observed) |
| Portal on `PORT=4748`, `/api/health` | ✅ `ok: true`, `stale: false` (observed) |
| Group 32 on the re-recorded fixture | ✅ 15 ops re-folded, 12 turns, fingerprint `7efdde37`, 10 eligible / 0 missed (observed) |
| `node discovery/prd-projection.mjs instrument-loans-1` | ✅ 11 sections, 15 ops (observed) |

No visual-regression run: nothing here touches a shipped page and `portal/` is never deployed.

## Shared worktree

The #349 session held uncommitted edits to `portal/lib/discovery.mjs` (fenceHooks trace) and
`tooling/build-checks.mjs` (case 22) in the same working tree. This PR stages HEAD + its own edits for those two
files only; their hunks stay in the working tree for their own PR.
