# PR #342 review — `fix/341-parent-id`

Branch `fix/341-parent-id`, HEAD `06460ae`, base `main` @ `5e8208a`. Reviewed against `CLAUDE.md`
(plain-JS/Node ESM, vertical-ish slice, no framework, honesty contract) — not the Python/FastAPI
default rubric.

Scope: `discovery/ops.mjs` (`parentCandidates`, `auditParenting`), `portal/lib/discovery-postures.mjs`
(`PARENT_RULE`, `ledgerBrief`, `TOOL_DESCRIPTIONS`, `FINGERPRINT_INPUTS`/`fingerprintOf`,
`buildThinkTurn({…, ledger})`), `portal/lib/discovery-transport.mjs` (ledger pass-through,
`postureFingerprint` stamp, `--probe-parenting` CLI), `tooling/build-checks.mjs` group 32 over the
committed fixture `discovery/instrument-loans-1/`.

`node tooling/build-checks.mjs` → **all 32 groups pass**, exit 0. No `--probe-parenting` run (paid,
not run per instructions).

---

## ✅ Strengths

- **`parentCandidates`/`auditParenting` are proven to BE the applier's acceptance set, not just
  agree with it by construction.** `tooling/build-checks.mjs` 28.5a feeds every seq
  `parentCandidates` names for a rung back through `applyDiscoveryOp` and asserts none throw — the
  exact "the brief would lie by inclusion" risk closed empirically, not just by shared code.
- **The moment-of-filing rule (`ops.slice(0, i)`, never the final ledger) is proven by a real
  mutation**, both in build-checks (28.5a's `later`/`afterLater` fixtures) and independently in the
  ticket's own report (the `ops.slice(0, i) → ops` row went red naming the exact wrong assertion).
- **No prompt-injection surface through `ledgerBrief`.** It reads exactly two fields —
  `params.level` (LEVELS-enum-validated by the applier) and `params.question_id` — and
  `checkQuestion()` in `discovery/ops.mjs:152-156` enforces bank membership even when
  `off_script: true`; an off-script decision can only render as `(off-script)` or a real bank id,
  never an agent-invented string. No human-typed text (`wrong_if`, `missing`, `reason`, answer text)
  reaches the brief.
- **The fingerprint is a real freshness check, not tautological.** `case 19` mutates the model, the
  system prompt and the turn template independently and shows each moves the hash; `FINGERPRINT_INPUTS`
  is frozen and its question id is asserted absent from the real bank so a bank edit can't touch it.
  The ticket's report independently reproduced a red run from a one-word `PARENT_RULE` edit.
- **`probeParenting`'s temp-root handling is clean**: `mkdtempSync(tmpdir())` (never under the repo),
  `rmSync` sits after the `try/catch` so it always runs including on the caught-error path, and the
  CLI's exit codes (0/2/3 for PARENTED/MISSED/other) are correctly wired.
- **No new dependency, no zod/SDK import added to the SDK-free graph.** `discovery-postures.mjs`'s
  only new import is `node:crypto` (Node built-in, not an npm dependency); `discovery/ops.mjs` still
  has zero imports. Group 30 imports both in CI with no `portal/node_modules` and the run above
  confirms that still works.

## ⚠️ Issues Found

### 1. `discovery/README.md:248`, `.claude/references/gates.md` (group 32 entry), `.claude/reports/discovery-parent-id-341-report.md:217` — Severity: **High**

**Defect:** Both docs and the ticket's own report state, unqualified, that group 32's re-fold "goes
red by name" on a hand-edited op line ("a hand-edited op line is caught by name (the re-fold)"). This
is false for at least one whole class of edit: **swapping `parent_id` between two grammatically valid
candidates at the same correct rung is undetected by every check group 32 runs.**

Verified empirically against a `/tmp` copy of the committed fixture (not the repo — no fixture files
were modified): `discovery/instrument-loans-1/` has two `business`-level decisions, seq 1 and seq 2.
Seq 3 (a `stakeholder` decision) legitimately names `parent_id: 2`. Editing that single field to
`parent_id: 1` (also business, also filed before seq 3, so also a valid candidate per
`parentCandidates`) and re-running **both** of group 32's substantive checks against the tampered
copy:

- **32.3** (`applyDiscoveryOps` re-fold, record-by-record `same(r, pkg.ops[i])`) — **passes**. The
  edited `params.parent_id` is fed back into the applier as input; since it's a valid rung-correct
  reference, `applyOp` accepts it unchanged and the "recomputed" record equals the tampered one by
  construction.
- **32.4** (`audit.missed.length === 0` + the `parentCandidates(pkg.ops.slice(0,i), level).includes(parent_id)`
  loop over every eligible seq) — **also passes**. Both business decisions are legitimate candidates
  at the moment seq 3 was filed, so the loop finds the tampered value in the candidate set.

So the mechanism the docs describe as detecting "a hand-edited line" only detects an edit that makes
a record **ungrammatical** (wrong rung, unresolved ref, desynced `closes`/`flagged`/`supersedes`) —
which is exactly the one mutation class the ticket's own report table exercised (`parent_id 3 → 2` on
seq 4, a business-level target for a decision that needed a stakeholder parent — caught because it's
the wrong rung, not because it's hand-edited per se). The report generalized from that one case to "a
hand-edited op line is caught," which the same-rung case falsifies.

Given this repo's honesty contract is the whole thesis of the discovery half (`discovery/README.md`'s
"Honesty rules (hard...)" section, the trace-rule extension, "never hand-write or hand-edit... a bad
run is re-run"), a written guarantee that overstates what the gate actually proves is worth fixing
before merge, not just noting.

**Fix (docs only, no code change needed — surgical):** reword the three sites to state precisely what
32.3/32.4 prove: an edit that produces an invalid record (wrong rung, unresolvable ref, an
out-of-sync derived field) goes red by name; a swap between two valid same-rung candidates is not
reachable by this check and relies on the "never hand-edit, re-run instead" process rule alone.
Something like: *"…re-folded through the real applier and matched record by record — an edit that
makes a record ungrammatical, or that desyncs `closes`/`flagged`/`supersedes` from its params, goes
red by name. A same-rung parent swap that stays grammatically valid is not detected by this check;
the process rule (never hand-edit, re-run) is what actually forbids it."* A stronger code-level fix
(e.g. a transport-side signature at record time) would be a new mechanism and is out of scope for
this PR under the surgical-changes rule — not recommending it as an action item here.

### 2. `discovery/README.md` §The parenting fixture, `portal/lib/discovery-postures.mjs:190-193` — Severity: **Low/Medium**

**Defect:** The fingerprint's documented and actual coverage is narrower than "prompt surface" reads,
in a way not stated anywhere a re-recorder would see it.

**In the hash** (`fingerprintOf`, `discovery-postures.mjs:190-193`): `model`, the system prompt
(`SYSTEM`), the turn template rendered over `FINGERPRINT_INPUTS` (including `ledgerBrief`'s exact
format), and `JSON.stringify(TOOL_DESCRIPTIONS)`.

**Not in the hash, but part of what the model actually reads when it lists/calls tools:**
- The advertised JSON schema — `TOOL_SCHEMA` (`portal/lib/discovery.mjs:113-121`), turned into the
  real zod shape by `zodFor` (`portal/lib/discovery-transport.mjs:57-72`). Reordering `LEVELS`,
  changing a param's type code, or widening/narrowing an enum changes the tool-call surface the agent
  sees, but moves no fingerprint bit — group 32 would stay green over a recording made under a
  different advertised schema.
- `denyReason()`'s fence-denial text (`discovery-transport.mjs:131`) — seen only on an out-of-fence
  attempt, so lower-stakes, but still unhashed.
- The applier's dynamic refusal messages — inherently unhashable (they vary per ledger state), so
  this is a scope statement rather than a gap, but worth naming as "not covered" per the task brief.
- `MAX_TURNS` and the rest of the SDK option set (`tools: []`, `resume`, `canUseTool`) — behavioral,
  not textual, so outside a "prompt surface" hash by design.

This is consistent with `case 19`'s own comment, which enumerates only "the model, the system prompt
and the turn template" as what moves the hash — so the scope is deliberate, not accidental. The gap
is that the asymmetry (tool *descriptions* hashed, tool *schemas* not) isn't stated anywhere, so a
future editor tightening `TOOL_SCHEMA` (e.g. for a fifth verb, or a parent_id type change) could
reasonably assume group 32's freshness tripwire has them covered when it doesn't.

**Fix:** one clause in `discovery/README.md` §The parenting fixture's "fingerprint tripwire" paragraph
— name `TOOL_SCHEMA`/the advertised zod shape as explicitly outside the hash. Doc-only.

## 🔍 Questions/Clarifications

- Is the `TOOL_SCHEMA` gap (finding #2) intentional scope, or worth a follow-up ticket to widen the
  fingerprint's inputs to cover the advertised schema too? The narrow scope is defensible (it's what
  spike 2's decision rule targets — the *textual* prompt), but it's a design call worth confirming
  rather than assuming.
- Is there an appetite for a lighter-weight version of the stronger fix for finding #1 — e.g. having
  the transport itself compute and store a per-turn record hash at write time (something the current
  three-file shape doesn't have a slot for) — for a later ticket, given the repo's honesty contract is
  a first-class concern? Not proposing this for this PR; flagging it as a question for #279's backlog.

## ✨ Recommendations

- Land the doc fix for finding #1 in this PR (or as a fast-follow before the fixture is trusted for
  anything beyond this ticket) — it's a one-paragraph edit across three files, consistent with the
  PR's own "surgical" ethos, and closes the gap between the written claim and what was empirically
  verified.
- Land the doc fix for finding #2 alongside it; same three files carry the fingerprint's coverage
  claim, so both fit in one pass.
- No code changes are recommended by this review. `discovery/ops.mjs`, `discovery-postures.mjs` and
  `discovery-transport.mjs` all held up under close reading and targeted mutation testing.

## 📋 Review Summary

- **Overall assessment: Ready to commit, pending the two doc-precision fixes above.** No code defects
  found; `node tooling/build-checks.mjs` passes all 32 groups cleanly, and every high-confidence
  correctness question in the review brief (refold-with-real-ctx, fingerprint non-vacuity, distinct-
  turns check, moment-of-filing, prompt-injection surface, probe temp-root/exit-code hygiene, CLAUDE.md
  import discipline) checked out clean except the two written-claim overstatements above.
- **Issues by severity:** High — 1 (doc overclaim about hand-edit detection, findings #1). Low/Medium —
  1 (fingerprint coverage not stated precisely, finding #2). Critical — 0. Major/code-level — 0.
- **No blockers to merging the code.** The High finding is a documentation-accuracy issue in a repo
  whose honesty contract is a stated first-class concern, not a functional defect — worth fixing before
  the fixture is cited elsewhere as proof of tamper-detection, but does not block this PR's actual
  code changes from landing.

**Pre-existing, out of scope, not counted above:** `preflightTransport` (unchanged by this PR) leaks
its temp root (no `rmSync`) — noted only because it sits beside the new `probeParenting`, which does
clean up correctly. The `case 16` label reuse in group 30 (prompt-string pins vs. `openSession`
refusals) is also pre-existing and not touched by this diff.
