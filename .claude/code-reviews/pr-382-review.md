# Code review — PR #382: the audit fixture and #288's owed live observation (#375, #376)

**Head** `074a467e47b39e570db41c8d9b52308b056b458f` · **Base** `main` @ `700c05205f5559260ebeca5b1af209bc6c12df85`
**Round** 1 (no prior review report) — the guarantees pass is skipped: the base is main's tip, so nothing moved under this PR.
**Reviewer** `/piv-review-pr`, fresh context (a detached worktree of the PR head) + the `code-reviewer` agent.

## Recommendation

**Approve.** No critical or high issues. The PR changes no source code: one report block, one README line and one
committed run package. Every figure in the PR body and the report that the tree can re-derive was re-derived and
holds; the package re-folds through the real applier record for record; the projection is byte-identical to the
committed `prd.md`; the posture stamp is current. One medium (a stale sentence in the report this PR edits) and
two lows, none a merge condition — fix in a follow-up commit on this branch or fold into the next ticket.

## Findings

### Medium

**F1 — `.claude/reports/discovery-portal-width-288-report.md:140` still states, in the present tense, that no
committed existing-prd package exists, and quotes a runnable command that now contradicts it.** The line reads
"no committed existing-prd package exists — `grep -l '"entryMode": "existing-prd"' discovery/*/run.json` returns
nothing". Run on this branch it returns `discovery/partner-audit-1/run.json` (observed). The PR corrected the
twin of this sentence under Issues (line 263, "RESOLVED (#376)") and missed this one. A retired claim with a
command attached is the kind that gets re-run and believed. *Fix:* a dated marker in place, matching the PR's own
convention — "(true when this check ran; `discovery/partner-audit-1/` landed under #376 — see the RESOLVED note
below)" — never a silent rewrite of what the #288 check did.

### Low

**F2 — the "Resumed … 1 answer(s) already recorded" defect is recorded only in the PR body.** Mechanism confirmed
and pre-existing: `portal/lib/discovery.mjs:734-746` writes the head, then appends the document as answer `a1` on
the CREATE path; `portal/public/portal.js:983-985` keys "Resumed" vs "Opened" on `answers.length`, so every fresh
audit open says "Resumed". The create and resume paths are indistinguishable to the client. This PR made two
comparable observations durable in the report (the `agent-browser` ref-click trap, the off-viewport button) and
left this third one in the PR body only — no report bullet, no ticket. *Fix:* one bullet under the report's
Issues, or a ticket. The code fix, when taken, keys the line on whether the server created or resumed (an op
count, or a non-document answer), not on `answers.length`.

**F3 — one attribution in the PR body outruns its evidence.** "no `denied` lines, the #349 tool-name gate holding":
with the fence trace unarmed, a run cannot distinguish "the gate suppressed the warmup denials" from "no warmup
call reached the fence this time". The absence is *consistent with* #349's rule — `bracket-trace-2` is the run
that proved it — and does not re-prove it. *Fix:* "no `denied` lines, consistent with the #349 tool-name gate".

### Not findings, recorded so the next reader does not re-check them

- **`reads: []` on an audit run is right.** The document reaches the agent verbatim in the system prompt via
  `documentPath` (`discovery.mjs:713-717`), so the fence never needs to admit the fixture. README §`reads`'s
  "run 2 names its frozen fixture here" describes run 2's own design, not a rule every audit follows.
- **Provenance `fictional` on an audit of the repo's own frozen PRD is per design.** Architecture §Other eng-lead
  calls: "Runs 1 and 2 are fictional and belong in-repo as committed evidence". Nothing private is in the
  package — the fixture is already tracked under `docs/epics/fixtures/`.
- **This package is not run 2.** Three Grill turns over the run-2 fixture is a drawer fixture for #376; the PR
  never calls it a score, and run 2 (the gap-finding measurement) remains unrun. The read fence keeps a later
  run from reading this transcript, so it does not contaminate that measurement.
- **The `width-probe-1` figures are not re-observable** ($0.1285 · `question 2 of 22` · `seq 3 · t1 · business`
  with two evidence rows): the ticket itself ordered the throwaway deleted, so they are the author's observation.
  Each is consistent with the tree — `facetPlan({ regulated })` on `full-discovery` counts 22 (derived, run
  here), and the quoted DOM strings match the templates at `portal.js:1014`, `:1093`, `:1105-1112` and
  `discovery.mjs:788` verbatim.
- **`proposedDepth` vs `instrument-loans-1`'s `branch`** is documented schema evolution (README line 269), not
  drift.

## Numbers pass

| Figure | Where | Provenance | Re-derived |
|---|---|---|---|
| $0.1599 for `partner-audit-1` | PR body, report | observed (run.json) | 0.087367 + 0.0446136 + 0.0279388 = 0.1599194 ✓ |
| $0.2884 total | PR body, report | derived | 0.1285 (author-observed, package deleted) + 0.1599 ✓ |
| warm turns $0.0446 · $0.0279 | PR body | observed | run.json t2, t3 ✓ |
| `instrument-loans-1` ~$0.04/turn | PR body | derived | 12 turns, avg $0.0353, max $0.0414 ✓ |
| 24,355 chars · 24,560 bytes · md5 `ab6eb0ee` | PR body, report | observed | fixture and `answers.jsonl` a1 both hash `ab6eb0ee6cdd3b7802ecfcbe90db2377`; a1 byte-equal to the fixture ✓ |
| every turn stamped `76b7847d` | PR body | observed | run.json ✓, equal to the CURRENT `POSTURES.grill.fingerprint` (freshness) ✓ |
| `flag_weak_answer 2 · open_question 1`, no `denied` | PR body, report | observed | transcript: 6 `text` + 3 `op`, 0 `denied`; `ledgerView` counts {0, 2, 1, 0} ✓ |
| `prd.md` is the projection | README rule | — | `node discovery/prd-projection.mjs partner-audit-1 --stdout` byte-identical ✓ |
| op lines are the applier's | README rule | — | re-fold over the committed answers + the real bank: seq 1, 2, 3 all MATCH; the projected Ledger line agrees with the fold ✓ |
| "no gate reads the new package" | PR body scope note | claim | `build-checks.mjs` names `instrument-loans-1`, the graded slugs and `allergen-matrix-1` by literal; no directory scan of `discovery/` ✓; group 31's document-kind row is an inline fixture ✓ |
| `question 2 of 22` | report | author-observed | `facetPlan` regulated → count 22 ✓ |

Every mechanism sentence in the report's three CONFIRMED blocks was checked against the code: the Start handler
is `discovery.session = await api(...)` inside `try` with the `catch` writing only the status line
(`portal.js:970-981`); `#discovery-start` is a `<fieldset>` (`index.html:159`) set `disabled` after open
(`portal.js:986`); the 409 text is `discovery.mjs:788`'s template with `facetsPhrase` rendering "the vector
regulated" / "the vector orgBuys"; `renderDiscoverySession()` sits in the submit handler's `finally` after the
disk re-read (`portal.js:1328-1338`) ✓.

## Validation

Run in a detached worktree of the PR head, deps linked from the main tree.

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ `all 34 groups pass` (observed) |
| `node tooling/drift-check.mjs` | ✓ all thirteen checks (observed; a first run was red only because a fresh worktree lacks `tooling/style-dictionary/node_modules`) |
| `node tooling/token-lint.mjs` | ✓ 63 contract tokens · 0 undeclared · 0 orphan (observed) |
| portal smoke, `PORT=4797` | ✓ `/api/health` `{"ok":true,…,"stale":false}`; `GET /api/discovery/session?slug=partner-audit-1&provenance=fictional` resumes from disk with `document {a1, 24355, ab6eb0ee…}` and `ledger.total 3`; killed by PID, port clear (observed) |
| visual regression | not run — no shipped page changed and the portal is not in the VR set (agreed with the PR) |

## What is done well

- The `is_error`-under-`subtype: "success"` trap was checked before committing, and the PR says so — the exact
  failure the SDK memo names, caught at the right moment.
- Claim 2 was tested harder than the ticket asked, and the report says why the weaker test was impossible (the
  locked fieldset) rather than reporting the weaker one as done.
- The scope note is honest in the direction that costs the author: "no gate was rewired", so #376's first two
  consequences are named as open rather than claimed closed by the fixture's existence.
- The package's timestamps, stamps and `turnStats` are internally monotonic and consistent with a streamed run;
  the README listing line is placed and worded like its siblings.
