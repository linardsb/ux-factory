# PR #369 review — `feat/286-postures`

Branch `feat/286-postures`, HEAD `9aa9c74`, base `origin/main` @ `985c807`. Reviewed against
`CLAUDE.md` (vanilla shipped pages, zero-dep Node ESM, no TypeScript, no zod outside the SDK
tool-schema adapter, plain Errors naming the offending path, honesty contract), `.claude/references/gates.md`
and `discovery/README.md` — not the Python/FastAPI default rubric. Fresh-eyes review, every changed
source file read in full (not just hunks), verified against running code and against `discovery/ops.mjs`
(unchanged, read as the contract the new postures bind to), not against the PR body or the implementation
report — the report was consulted only after independent findings were reached, to check whether an
issue was already known.

Scope: `portal/lib/discovery-postures.mjs` (new), `portal/lib/discovery.mjs` (`ENTRY_MODES`,
`ENTRY_POSTURES`, `RE_ASKS`, `appendDocument`/`documentOf`/`auditAnswerFor`, `entryMode` on
`deriveCursor`/`runMetrics`, `document` on `sessionView`, `openSession`'s three new params, the audit
branch in `runTurn`), `portal/lib/discovery-transport.mjs` (`entryMode` into `posture.build`,
`--probe-audit`), `portal/server.mjs` (session route), `discovery/prd-projection.mjs` (`answerBlock`
pointer rendering), `portal/public/{portal.js,index.html}` (entry/model/document controls, audit
submit, pointer view), `tooling/build-checks.mjs` (cases 30.30–30.34, 31.14, and the widened cases 11,
16, 34.13).

**Verification performed, not just read:**
- `node -e "import('./portal/lib/discovery-postures.mjs').then(m => console.log(m.POSTURES.think.fingerprint, m.POSTURES['think-opus'].fingerprint))"` →
  `7efdde37441fbd2591ba4a7dfeecdb6b cadb38117a2660c036d87e32323a8745` — Think's byte-stable prompt
  surface is unmoved (hard invariant #1 in the review brief), confirmed by direct execution, not by
  trusting the gate's own assertion of the same fact.
- `node tooling/build-checks.mjs` → **all 34 groups pass**, exit 0.
- Read `discovery/ops.mjs`'s `applyOp` in full to check whether the applier special-cases a
  `kind: "document"` answer (the audit's every op names the document by `answer_ref`/`ref`): it does
  not — `refs = new Set(ctx.answers.map((a) => a?.ref))` and `resolveAnswer` key on `ref` alone, and
  `grep -n "kind" discovery/ops.mjs` returns nothing. The applier is structurally kind-agnostic, so the
  audit's decisions and evidence rows resolve through the same "answer by reference" path a banked
  answer does, with no branch that could hide kind-specific breakage.
- Read `portal/public/portal.css` for whether `#discovery-answer-label`'s `.hidden` toggle (new: hidden
  in audit mode) is actually defeated by an author `display` rule, the way `[hidden]` was on /build's
  keep rail (`hidden-defeated-by-author-display`, memory). It is not: `[hidden] { display: none
  !important; }` (line 61) is a blanket, already-generalised page rule predating this PR (its own
  comment: "this generalises them so the third case cannot ship broken"), and no more-specific
  `!important` rule in the file targets this label. The nested `<textarea>` is hidden with it, and the
  submit handler additionally sends `text: undefined` in audit mode regardless of the textarea's state.
- Checked all seven pre-#286 committed `discovery/*/run.json` packages
  (`instrument-loans-1`, `graded-think-a`, `graded-opus-a`, `spine-meridian-1`, `allergen-matrix-1`,
  `bracket-trace-1`, `bracket-trace-2`) for `model`/`posture`/`entryMode` — every one already carries
  `entryMode: "blank-idea"` and a `model` equal to its posture's own default, so `resolvePosture`
  returns each posture object by identity (`m === p.model`) and none is at risk of the new override
  refusal.
- Counted `openSession`'s actual guard-regex hits vs. the gate's pinned floor: 17 hits before
  `mkdirSync`, floor asserted at `>= 9` (see Finding 3).

---

## ✅ Strengths

- **Think's byte-stable surface is genuinely unmoved, not just asserted.** `systemFor`, `buildThinkTurn`,
  `TOOL_DESCRIPTIONS` and `FINGERPRINT_INPUTS` are untouched; the two new builders (`buildCreatePrdTurn`,
  `buildGrillTurn`) are built from `sharedVocabulary`/`sharedTail`/`commonGuards`/`interviewHead` helpers
  that Think does not call, so a future edit to those helpers cannot silently move Think's stamp. Direct
  execution reproduces both pinned hex literals.
- **The audit's answer-by-reference discipline holds through a real path, not just a documented one.**
  `appendDocument` writes the document once via the same `answers.jsonl` mechanism a banked answer uses;
  `applyOp` has no `kind` awareness at all, so every audit op (`record_decision`, `file_evidence` with
  `ref` + `name`) resolves through the identical "the applier never sees answer text" mechanism MVP 6
  rests on. There is no second, document-specific code path that could quietly diverge from the banked
  one.
- **The order-sensitive prompt invariants are enforced structurally, not just by convention.** `PARENT_RULE`
  sits last in `sharedTail`, and both new builders append nothing after it; the audit's document block
  is placed before the stance and before `sharedTail` in the template literal itself, so a future editor
  who appends a new rule string after `sharedTail(provenance)` in one of the two new builders keeps the
  ordering by construction rather than by remembering to.
- **`openSession`'s guards are genuinely all before `mkdirSync`**, independently re-verified by locating
  `mkdirSync(` and every guard-name occurrence by regex and confirming every index precedes it (17 of
  17). No path exists where a refusal leaves a half-written package on disk.
- **The document never leaks into the turn prompt or the wire.** `buildGrillTurn`'s audit branch places
  the document text only in `systemPrompt`, between `<<<DOCUMENT`/`DOCUMENT>>>`; the turn prompt names
  only the ref. `sessionView().document` carries `{ ref, chars, md5 }`, never `text`; `discoveryConfig()`
  strips prompt bodies entirely; `portal.js`'s recorded-answer view renders `a.text.length`, never `a.text`,
  for a document-kind line.
- **`prd-projection.mjs` stays portal-free.** `grep '^import' discovery/prd-projection.mjs | grep portal`
  is empty; the new `answerBlock` branch reads only `a.kind`/`a.text` off the parsed package, no new
  import added.
- **The DOM global `document` is not shadowed anywhere in the touched `portal.js`.** The local is
  consistently named `documentText`; the wire field alone is named `document`, matching `openSession`'s
  parameter name.

## ⚠️ Issues Found

None are Critical or High. Everything below is Low — either a documented, deliberate trade-off already
flagged by the implementer with a follow-up ticket, or a minor looseness in a gate's pinned floor that
does not affect the invariant the gate actually enforces.

1. **Low — Design/Docs.** `openSession`'s document guard runs unconditionally before the resume check
   (`portal/lib/discovery.mjs:678-693`, before `mkdirSync` at :700 and `if (existing) return
   sessionView(root);` at :701-702), so resuming an `existing-prd` session via `POST
   /api/discovery/session` — the only resume path the UI offers, since `discovery.session` is an
   in-memory object with no persistence across a page reload — still requires supplying a non-blank
   `document` or a `documentPath` that resolves to a real file, even though the value is discarded (the
   audit always reads the already-stored document via `auditAnswerFor`/`documentOf`). Concrete failure:
   an operator opens an audit with `documentPath: "docs/x.md"`, the file is later moved or deleted, and
   a later resume attempt (page reload → "Start or resume") throws `documentPath "docs/x.md" (...) is
   not a file the server can read` even though the session's own document is intact on disk. The
   `portal.js` comment at :813 ("a resume ignores them") describes only the discard, not this
   requirement, so it reads as more forgiving than the code is.
   This is not an oversight: the plan (`.claude/plans/discovery-postures-286.md:300`) explicitly
   specifies "New guards, all before `mkdirSync`", and the implementation report
   (`.claude/reports/discovery-postures-286-report.md`, Deviations) already states this exact behaviour
   and names `#288`'s package view as "the natural home for a resume that asks for nothing." No fix is
   suggested here beyond what's already tracked; flagging only because the review brief asked this
   exact question directly.

2. **Low — Test strength.** `tooling/build-checks.mjs` case 16's guard-count floor
   (`guardAt.length >= 9`, discovery.mjs's guard-regex hits before `mkdirSync`) is far looser than the
   actual count: `openSession` carries 17 such hits today (verified by direct count), so the floor would
   only fail if 9+ guard calls were removed at once — an unlikely accidental regression to catch. The
   load-bearing half of the same case (`guardAt.every((i) => i < firstMkdir)`, which checks ORDER rather
   than count) is unaffected and still exhaustive. Suggested fix, optional: tighten the floor to the
   observed count (17) the way other cases in this group pin exact literals, so a guard silently dropped
   from the document-validation block would be caught by the count too, not only by the (currently
   untested-for-omission) fact that nothing referencing it appears after `mkdirSync`.

## 🔍 Questions/Clarifications

- Is `#288`'s "resume that asks for nothing" already scoped to read `run.json.entryMode` before
  requiring the document fields client-side (skip the requirement when a package already exists), or is
  the fix expected server-side (reorder `openSession`'s guards so the `existing` check happens first for
  `existing-prd`, then only validate `document`/`documentPath` on the create path)? The server-side
  version is a bigger structural change (the "all guards before mkdirSync, refusals leave no
  half-package" invariant would need `existing` to be checked without writing anything, which `readRun`
  already supports — but it changes case 16's guard-order pin), so worth deciding before #288 starts.

## ✨ Recommendations

- If #288 ends up touching `openSession`'s guard order, keep case 16's `guardAt.every(i < firstMkdir)`
  check as the invariant to preserve, and add a case that resumes an `existing-prd` package with `document:
  null, documentPath: null` and asserts it succeeds (the gate's own group-30 summary already discloses
  "cannot reach: ... openSession's create/resume branch (it writes a real root)", so this would be new
  coverage, not a duplicate).
- Nothing else stood out as worth changing; the module headers, the gate's own "what it cannot reach"
  disclosures, and the implementation report's Deviations section already name the two soft spots this
  review independently found evidence for (the resume requirement, and #366 staying open for Think).

## 📋 Review Summary

- **Overall assessment: Ready to commit.** No Critical, High, or Medium issues found after reading every
  changed source file in full, executing the fingerprint check directly, tracing the applier's answer
  resolution for kind-agnosticity, and confirming the `[hidden]` CSS fix predates and covers the new
  audit-mode label toggle.
- Issues by severity: Critical 0 · High 0 · Medium 0 · Low 2 (both informational/tracked, not blockers).
- The gate (`node tooling/build-checks.mjs`) is green at 34/34 groups on this tree. What it explicitly
  cannot reach (its own disclosure, unchanged by this review): whether a model actually reaches the
  audit verdict the rule names, quotes the document's own `wrong_if` rather than authoring one, and
  judges in prose before filing (`--probe-audit`, blocked by the account's API usage limit until
  2026-10-01 per the implementation report — not this review's concern, but worth noting as still owed
  before the audit posture is trusted against a real document).

---

**Do not start fixing any issues without the user's approval.** Both findings above are Low and one is
already tracked against a separate ticket (#288) — nothing here indicates a blocking defect on this PR.
