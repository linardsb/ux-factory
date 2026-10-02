# Feature: re-record a linked decision from the discovery drawer (#498)

The following plan should be complete, but it is important that you validate documentation, codebase patterns and
task sanity before you start implementing. Pay special attention to the names of existing exports, and import from
the right files.

**A spike of this plan was built and run on 2026-10-02** (against origin/main 1c6af29, in a throwaway worktree). Its
diff is `.claude/plans/re-record-decision-after-build-498-spike.diff.txt`: reference code for Tasks 1.1–2.4, 3.1,
4.1, 5.1 and 5.6's B2, proven by build-checks 51/51, the transport `--preflight` 8/8 and canvas-journey on all three
engines (see NOTES §Spike). It is not the implementation. It lacks the headers, comments, cases 30.59–30.63 and the
prose tasks. Use it to check literals, not as a patch to apply blindly.

## Feature Description

A finished discovery run can be revisited one question at a time. In the discovery drawer, every current banked
decision on a FINISHED run carries a **Re-record** button. Pressing it puts that decision's question back on the
table. The owner types a new answer, and a real agent turn judges it and files at most one closing op. A
`record_decision` supersedes the old version through the applier's existing rule (#318's D2), so the canvas flags
every frame pinned to the old seq on its next load. The run stays closed. The revisit turn has its own turn id
(`r1`, `r2`, …), so the interview cursor, the not-a-form counter and the inbox never see it.

Beside it, a `UXF_DISCOVERY_TRANSPORT` env seam (the twin of `UXF_COMPOSE_TRANSPORT`) lets a scripted stand-in for
the model, `tooling/fake-discovery-agent.mjs`, drive the REAL filing path at $0. canvas-journey's pass B then
re-records decision 7 through the drawer instead of seeding it in-process.

## User Story

As the owner, after a build has linked screens to my discovery decisions,
I want to re-record one of those decisions from the discovery drawer,
so that the canvas shows me which screens no longer match what I decided, without opening a terminal.

## Problem Statement

#318 shipped stale-frame flagging, but nothing in the product can create a superseding decision once a build
exists. `runTurn` refuses every turn on a closed run (`portal/lib/discovery.mjs:1117`) and every turn past the last
question (`:1118`), and a run is closed before its build starts. canvas-journey pass B therefore seeds the
superseding line through `discovery/ops.mjs`'s applier (`seedSupersede`, `tooling/canvas-journey.mjs:801`), and
#318's AC #2 drawer step was reported not met.

## Solution Statement

Owner decision on this ticket (2026-10-02): **both A and B**, the run **stays closed**, and the PR closes #498 only
after the owner's paid turn.

1. **A: a revisit turn on a finished run.** `runTurn` gains `revisit: boolean`. A revisit is admitted only when
   `sessionView(root).revisit` is non-null (the run is finished and blank-idea) and `questionId` is in its
   `questions` list (a question holding a current banked decision). It skips the closed/done/cursor guards, never
   the lock, and appends through the ONE existing `appendAnswer` call with `kind: "banked"` and the revisit turn id.
   The prompt is the ordinary banked prompt, unchanged, so no posture fingerprint moves. The SDK session starts
   fresh (`fresh: true`), because a revisit is weeks after the session and a copied package has a different cwd.
2. **The turn-id namespace.** `isRevisitTurn(t)` is `/^r[1-9]\d*$/`. `closersOf` excludes revisit closers, so
   `deriveCursor`, `escalationFor` and `runMetrics` read the interview only. The next revisit turn id is DERIVED,
   `r${distinct closed revisit turns + 1}`, never stored (invariant 4).
3. **B: the env seam and the fake.** `runTurn`'s one dynamic import picks its argument from
   `UXF_DISCOVERY_TRANSPORT`. The handler body moves out of the SDK file into `fileOp` in `discovery.mjs` (SDK-free),
   so the real tool callback and the fake call the same filing code.
4. **The drawer.** The package view's decision rows render a Re-record button from `session.revisit.questions`.
   A revisit mode enables the answer box on a closed run without widening `answerable`. Submit posts `revisit: true`
   and skips the Jev guard.
5. **The journey.** Pass B runs on a side portal carrying `UXF_DISCOVERY_TRANSPORT`, and B2 re-records decision 7
   through `#/discovery/real/fp-stale` by keyboard. `seedSupersede` stays, for the inbox pass only.

## Out of Scope / Non-Goals

- Not included: a revisit on a FICTIONAL package (refused by name; decided at planning, see Q4). A fictional package
  is committed evidence in this repo. To revisit one, copy it to the jobs folder (`seedSpine`) and revisit the copy.
- Not included: a revisit on an OPEN run, or on an existing-prd audit (both refused by name). On an open run the
  question on the table is answered. In an audit the document is the answer to every question.
- Not included: re-opening a run (clearing `endedAt`). The owner chose "stays closed".
- Not included: revisiting a question that holds no current banked decision (a parked or weak-only question).
- Not included: any `discovery/ops.mjs` change. The supersede rule and R2 already key on `question_id` and the turn
  id. The op-verb lock is not taken.
- Not included: a revisit-specific prompt paragraph. It would be prompt text outside every fingerprint (see NOTES).
- Not included: driving the inbox pass (W1) through the drawer. It keeps `seedSupersede`, because its subject is
  the inbox's rendering and #498's AC #2 names pass B.
- Not included: a canvas link from the drawer's status line, or a "Re-record in Discovery" link from the canvas.
- Not changing: `answers.jsonl`'s `kind` set (still `banked | off-script`, case 33), `TOOL_SCHEMA`, `OPS`, any posture
  builder, any committed package under `discovery/`.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High (one session module, the SDK transport, the drawer, a new fake, ~5 build-checks
cases, one journey pass rework)
**Primary Systems Affected**: `portal/lib/discovery.mjs`, `portal/lib/discovery-transport.mjs`, `portal/server.mjs`,
`portal/public/{portal.js,index.html}`, `tooling/fake-discovery-agent.mjs` (new), `tooling/build-checks.mjs` group 30,
`tooling/canvas-journey.mjs` pass B
**Dependencies**: none new. The fake imports nothing from `portal/node_modules`.

## Related Work

**Implements**: #498   ·   **Epic**: #295, `docs/epics/canvas-design-import.architecture.md` (Addendum 2026-08-28,
D2, and "D2 as built (#318)")

**Back-references**:

- `.claude/plans/decision-blast-radius-318.md`: built `staleFrames` and pass B, and named this follow-up (its Task 9.1).
- `.claude/reports/decision-blast-radius-318-report.md`: AC #2's drawer step reported not met. Fresh-worktree install
  list.
- `.claude/plans/canvas-compose-loop-312.md`: `UXF_COMPOSE_TRANSPORT` and `tooling/fake-compose-agent.mjs`, the seam
  pattern mirrored here.
- `.claude/plans/inbox-waiting-on-you-319.md`: the `#/discovery/<provenance>/<slug>` deep link pass B now uses.

**Forward-references**: (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files (read these before implementing)

- `portal/lib/discovery.mjs` (1–56 header and five invariants; 245–260 `readAnswers`/`nextRef`/`assertTurnWritable`;
  290–316 `appendAnswer`; 342–368 `readTranscript`/`appendTranscript`/`textLine`/`opLine`; 633 `closersOf`;
  646–660 `deriveCursor`; 667–680 `escalationFor`; 698–721 `runMetrics`; 841–863 `mutateHead`/`recordSessionId`/
  `recordTurnStats`; 868–915 `sessionView`; 1057–1062 `stateFromTranscript`; 1063–1165 the runTurn comment block and
  `runTurn`). Why: every change in Phase 1–2 lands here.
- `portal/lib/discovery-transport.mjs` (109–152 `buildOpServer`, the handler body that moves; 167–280
  `runDiscoveryTurn`, the `resume` line and the init `recordSessionId`). Why: Phase 2.
- `portal/lib/canvas-session.mjs` (13–14 invariant 1's env-seam sentence; 414 `loadTransport`). Why: the seam to mirror.
- `tooling/fake-compose-agent.mjs` (1–20 header; 52–60 `assertCwd`; 62–105 the stats shape). Why: the fake to mirror.
- `portal/server.mjs` (405–439 `/api/discovery/turn`; 664–671 the boot log). Why: Phase 3.
- `portal/public/portal.js` (1009–1063 `renderDiscoverySession`; 1114–1173 `renderPackageView`; 1328–1390
  `DISCOVERY_TURN_CONTROLS` + `postDiscoveryTurn`; 1472–1500 the submit handler; 1694–1714 `openDiscoveryFor`). Why: Phase 4.
- `portal/public/index.html` (235–296 `#discovery-session`). Why: the cancel control's home.
- `portal/public/portal.css:200` (`#discovery-drawer .btn { min-height: 44px; min-width: 44px; }`). Why: a new
  `.btn` inside the drawer is already 44×44, so no CSS is needed.
- `tooling/build-checks.mjs`: 276–290 the group 30 import list; 7189–7190 `TMP`/`tmpRoot`; 7630–7690 case 12 (the
  lazy-import pin at 7647 MUST change); 8512–8530 case 34 (`appendAnswer(` exactly once in runTurn, after the audit
  flag); 8698–8775 case 41 (the package view must run no `.decisions.filter(`/`.decisions.reduce(`); 8854–8898
  case 44 (the child-process pattern with `JOBS_DIR` set); 8898–8900 the `rmSync(TMP)` that runs BEFORE 30.45, so
  new cases must not use `tmpRoot`; 9110–9126 30.55 (guard ordering); 9150–9166 30.57 (route names each parameter);
  9185 the `group("discovery", …)` string; 16797–16818 47.17 F3/F6 (env seam set and restored in-process).
- `tooling/canvas-journey.mjs` (60–90 the header, pass B paragraph at 77–87; 141–142 the discovery imports;
  200–262 `boot` and `withPortal`; 296–301 `seed`; 797–817 `seedSupersede`; 818–935 `blastPass`; 945–960 the inbox
  pass's own `seedSupersede` call; 996–1004 W5, the drawer deep-link wait; 652 where `blastPass` is called; 1689
  `FAKE_COMPOSE`). Why: Phase 5.
- `discovery/ops.mjs` (14–48 invariants, esp. 4; 254–270 `ledgerView`'s `latest`; 380–445 `record_decision` and the
  supersede guard's `off_script === false`). Why: read-only. Confirms no edit is needed.
- `discovery/README.md` (176–200 R2 + §Supersede; 352–376 §File shapes). Why: docs task.
- `.claude/references/gates.md:49` (group 30's entry) and `:143` (canvas-journey). Why: the three-copy rule.

### New Files to Create

- `tooling/fake-discovery-agent.mjs`: the scripted stand-in with `runDiscoveryTurn`'s signature.

### Relevant Documentation

- `docs/epics/discovery-partner.architecture.md` §Boundaries: resume-per-turn. A revisit's fresh session departs
  from it, scoped and stated (see NOTES N3).
- `docs/epics/canvas-design-import.architecture.md` "D2 as built (#318)": append one sentence (Task 6.2).
- No external library docs. The SDK surface touched is `query()`'s `resume` option, already used.

### Patterns to Follow

**The env seam** (`portal/lib/canvas-session.mjs:414`), verbatim shape:

```js
const loadTransport = () => import(process.env.UXF_COMPOSE_TRANSPORT ? pathToFileURL(path.resolve(process.env.UXF_COMPOSE_TRANSPORT)).href : "./canvas-transport.mjs");
```

**The boot log** (`portal/server.mjs:670`):

```js
if (process.env.UXF_COMPOSE_TRANSPORT) console.log(`compose transport: OVERRIDDEN by UXF_COMPOSE_TRANSPORT → ${process.env.UXF_COMPOSE_TRANSPORT} (the journey's fake; never set this for a real run)`);
```

**The fake's guard** (`tooling/fake-compose-agent.mjs:52-60`): realpath both sides, refuse the repo, refuse anything
not under `realpath(tmpdir()) + sep`.

**A new field on an existing kind, never a new kind** (`discovery.mjs:290-296`, `intent`'s precedent). A revisit
answer line is `kind: "banked"` and differs only in its `turn` value.

**Errors**: `bad(msg)` throws `discovery: <msg>` naming the slug and the value (`discovery.mjs:58`).

**Group 30 case style**: `// 30.N — TITLE.` comment, `ok(cond, "30.N: …")` messages, child process via
`execFileSync(process.execPath, ["--input-type=module", "-e", script], { env: { ...process.env, JOBS_DIR } })`
(case 44).

**Journey style**: `step("B2 · …")`, `t("B2 · …", cond, detail)`, reads `ledger()`/files off the scratch dir, never a literal seq
(`S` is derived).

---

## IMPLEMENTATION PLAN

Work in a worktree off `origin/main`, never the primary checkout: it is on another session's branch
(`fix/importer-reads-icon-name-449`). Step 0: `git worktree add ../wt-498 -b feat/re-record-decision-498 origin/main`,
then `npm ci` in `portal`, `tooling/icons`, `tooling/style-dictionary` and `tooling/visual-regression` (the #318
report needed all four: build-checks, drift-check and journey I12).

### Phase 1: The session rules (pure, CI-reachable)

`isRevisitTurn`, the `closersOf` exclusion, `revisitView` on `sessionView`, and `fileOp`. Nothing calls the
transport yet.

### Phase 2: The turn

**Depends on:** Phase 1.
`runTurn`'s revisit branch, the env seam, the transport's `fresh` option and the handler moved onto `fileOp`, and the fake.

### Phase 3: The route

**Depends on:** Phase 2. `/api/discovery/turn` names `body.revisit`. The boot log.

### Phase 4: The drawer

**Depends on:** Phase 3. **Independent of:** Phase 5's journey code (they meet only at run time).

### Phase 5: Gates

**Depends on:** Phases 1–4. Group 30 cases 30.59–30.63, case 12 and 30.57 updated. canvas-journey pass B reworked.

### Phase 6: Docs and the three copies of the prose

**Depends on:** Phase 5 (the prose states what the gates reach).

---

## STEP-BY-STEP TASKS

### 1.1 ADD `isRevisitTurn` + exclusion in `closersOf` — `portal/lib/discovery.mjs`

- **IMPLEMENT**: Beside `closersOf` (line 633):
  ```js
  // A REVISIT TURN (#498) re-records one decided question on a FINISHED run. Its id is r<n>, never t<n>, so the
  // three interview reads below — the cursor, D5's proposal and the metrics — fold the interview only: a revisit
  // closer counted here would move the cursor back to the question after the revisited one and read the run unfinished.
  export const isRevisitTurn = (turn) => typeof turn === 'string' && /^r[1-9]\d*$/.test(turn);
  const closersOf = (transcript) => transcript.filter((l) => l?.type === 'op' && l.closes === true && !isRevisitTurn(l.turn));
  ```
- **PATTERN**: invariant 4's comment (`discovery.mjs:29-31`).
- **GOTCHA**: every committed turn id is `t<N>` (observed: 932 transcript lines and 257 answer lines across
  `discovery/*/`, plus 3 `null` on document lines). The exclusion therefore changes no committed read. A banked
  turn's id is `t${closers.length + 1}` (`deriveCursor`), which the exclusion keeps exact.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓  all 51 groups pass` (observed baseline,
  unchanged by this task).
- **REDDENS**: covered by 30.59(c).
- **SATISFIES**: AC #1 (the run reads finished after a revisit).
- **REGENERATES**: none.

### 1.2 ADD `revisitView` + `sessionView.revisit` — `portal/lib/discovery.mjs`

- **IMPLEMENT**: Exported pure read, placed after `runMetrics`:
  ```js
  // What a FINISHED run offers for a revisit (#498): the next revisit turn id and the questions holding a current
  // banked decision. Null on an open run (answer the question on the table) and on an existing-prd audit (the
  // document is the answer to every question). The applier's own predicate, `off_script === false`, decides what is
  // banked here, so this list is exactly the set whose next record_decision the applier records as a supersede.
  export function revisitView(head, transcript) {
    if (!head?.endedAt || (head.entryMode ?? 'blank-idea') === 'existing-prd' || !Array.isArray(transcript)) return null;
    const ops = transcript.filter((l) => l?.type === 'op');
    const latest = new Set();
    for (const l of ops) if (l.op === 'record_decision' && l.params?.off_script === false && typeof l.params?.question_id === 'string') latest.add(l.params.question_id);
    const closed = new Set(ops.filter((l) => l.closes === true && isRevisitTurn(l.turn)).map((l) => l.turn));
    return { turn: `r${closed.size + 1}`, questions: [...latest] };
  }
  ```
  In `sessionView`'s return, after `exchanges`: `revisit: revisitView(head, transcript),` with a two-line comment.
- **GOTCHA**: the turn id counts CLOSED revisit turns. A revisit the agent did not close reuses the same `rN`,
  exactly as a banked turn does (`sessionView` comment above line 868). `assertTurnWritable` admits it.
- **VALIDATE**: `node -e "import('./portal/lib/discovery.mjs').then(m=>{const r='discovery/faster-payment';const v=m.sessionView(r);console.log(JSON.stringify(v.revisit.turn), v.revisit.questions.length, v.cursor.index, v.cursor.done)})"` → `"r1" 20 22 true` (observed on the spike). The depth list is 22 questions. The 24 closers include two held re-asks, so the cursor reads 22 of 22, not 24.
- **REDDENS**: 30.59(b).
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

### 1.3 ADD `fileOp` — `portal/lib/discovery.mjs`

- **IMPLEMENT**: SDK-free, beside `opLine`. Add `applyOp` to the `../../discovery/ops.mjs` import (line 52).
  ```js
  // ONE filing path for the real tool and the scripted fake (#498): the applier over the holder, DISK FIRST, then
  // the holder, then the listener. If the append throws, the holder still matches transcript.jsonl, so a same-turn
  // retry is not refused as "already closed" for an op the file never received. A listener error is stderr, never a
  // throw: the file and the holder already hold the op. Throws the applier's refusal verbatim; the transport turns
  // that into an isError result (spike 1, observation 2).
  export function fileOp({ root, turn, state, onLine, op, args }) {
    const next = applyOp(state.current, { op, params: args }, { answers: readAnswers(root), bank: QUESTIONS, turn });
    const record = next.ops[next.ops.length - 1];
    const written = appendTranscript(root, opLine({ record }));
    state.current = next;
    try { onLine?.(written); }
    catch (e) { process.stderr.write(`discovery: listener error (non-fatal): ${e.message}\n`); }
    return record;
  }
  ```
- **PATTERN**: moved from `discovery-transport.mjs:120-138`. The comments move with it, condensed.
- **GOTCHA**: answers are re-read per call (the transport's own comment at 114–115). Keep it.
- **VALIDATE**: `node --check portal/lib/discovery.mjs` → no output.
- **REDDENS**: 30.61(b).
- **SATISFIES**: AC #2 (the fake files through real code).
- **REGENERATES**: none.

### 2.1 ADD the revisit branch to `runTurn` — `portal/lib/discovery.mjs`

- **IMPLEMENT**: Signature gains `revisit = false`. Inside the lock, after the `kind` check:
  ```js
  if (revisit !== true && revisit !== false) bad(`"revisit" must be true or false (got ${JSON.stringify(revisit)})`);
  if (revisit && (park || offScript)) bad('a revisit re-records one decided question — it is never a park or an off-script exchange');
  if (revisit) assertRevisit(view, questionId);
  else {
    // the three existing guards, unchanged and in order: endedAt, cursor.done, then off-script/question-on-the-table
  }
  if (park) assertParkable(head, cursor);
  const turn = revisit ? view.revisit.turn : cursor.turn;
  ```
  `assertRevisit(view, { slug, provenance, questionId })` is exported and pure, defined above `runTurn`, and is
  called as `if (revisit) assertRevisit(view, { slug, provenance, questionId });`. In order:
  - `provenance !== 'real'` → `run "<slug>" is a <provenance> package — committed evidence in this repo, and a revisit appends to it. Copy it to the jobs folder (real provenance) and revisit the copy (#498)`
  - `view.revisit === null` and `!view.head.endedAt` → `run "<slug>" is still open — answer the question on the table; a revisit re-records a decision on a FINISHED run (#498)`
  - `view.revisit === null` (audit) → `an existing-prd audit has no answer to re-record — the document is the answer to every question (MVP 2)`
  - `!view.revisit.questions.includes(questionId)` → `"<id>" holds no current banked decision in run "<slug>" — a revisit re-records a decision; this run's are: <list>`

  `<slug>` is the REQUEST's `slug`, never `view.head.slug`. A seeded copy keeps its source's `run.json`, so the spike's
  first draft named `faster-payment` while refusing `fp-open` (observed). The provenance guard keys on the
  REQUEST's provenance, never `head.provenance`, because a copy in the jobs folder keeps `"fictional"` in its
  `run.json` (`fp-stale`'s does).
  After the transport returns:
  ```js
  if (sessionId && !revisit) recordSessionId(root, sessionId);
  if (stats) recordTurnStats(root, revisit ? { ...stats, revisit: true, sessionId } : stats);
  ```
  The transport call gains `fresh: revisit`. The ONE `appendAnswer(` call stays as it is (the banked branch already
  passes `{ turn, questionId, kind, text }`, and `kind` is `banked`).
  Add one paragraph to the runTurn comment block (`discovery.mjs:1063`), "#498 ADDS A THIRD TURN SHAPE …": guards,
  the `rN` id, `fresh`, run.json's `sessionId` untouched.
- **PATTERN**: `assertAffordance`/`assertParkable` (`discovery.mjs:267-283`), the guards before the append (30.55).
- **IMPORTS**: none new for this task.
- **GOTCHA**:
  - Case 34 requires `appendAnswer(` EXACTLY ONCE in runTurn, after `head.entryMode === 'existing-prd'`. Do not add a
    second append for the revisit.
  - 30.55 requires every guard before `appendAnswer(`. `assertRevisit(` must sit before it too (30.62(e) pins it).
  - `questionForTurn({ offScript, cursor, questionId })` already answers `questionById(questionId)` for a non-off-script
    turn. Do not change it (30.58 pins its use).
  - `head.sessionId` must stay untouched by a revisit. The fresh session's id goes on the turnStats entry only.
  - Case 34 reads runTurn's body RAW, comments included (`build-checks.mjs:8523`, unlike 30.55's decommented read).
    Never write the string `appendAnswer(` in a comment inside runTurn, or case 34 reports "two appends". The #498
    paragraph goes in the comment block ABOVE the function.
  - No group pins `discovery.mjs`'s import list (observed: the only `specs("portal/lib/discovery.mjs")` read is 45.7's
    `tensions` regex at 15739). Adding `applyOp` and `node:url` reds nothing.
- **VALIDATE**: `node --check portal/lib/discovery.mjs`; then 30.60 (Task 5.2).
- **REDDENS**: 30.60(c) (the `!revisit` on `recordSessionId` removed → `run.json sessionId moved`), 30.60(g) (each guard).
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

### 2.2 ADD the env seam — `portal/lib/discovery.mjs`

- **IMPLEMENT**: Import `pathToFileURL` from `node:url`. Above `runTurn`:
  ```js
  // ONE dynamic import, its argument picked by the env seam (#498, canvas-session.mjs's UXF_COMPOSE_TRANSPORT twin):
  // canvas-journey's pass B points it at tooling/fake-discovery-agent.mjs, which refuses any root outside the OS
  // temp directory. Invariant 1 is unchanged — the SDK is still reached only here, after every guard.
  const loadTransport = () => import(process.env.UXF_DISCOVERY_TRANSPORT ? pathToFileURL(path.resolve(process.env.UXF_DISCOVERY_TRANSPORT)).href : './discovery-transport.mjs');
  ```
  In runTurn replace `await import('./discovery-transport.mjs')` with `await loadTransport()`. Add one sentence to
  invariant 1 naming the seam.
- **GOTCHA**: case 12 (`build-checks.mjs:7647`) pins the literal `await import('./discovery-transport.mjs')` and goes
  red here. Task 5.1 replaces that pin.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -c "case 12: portal/lib/discovery.mjs no longer reaches"` → `1` before Task 5.1 (expected red), `0` after.
- **REDDENS**: 30.62(a).
- **SATISFIES**: AC #2.
- **REGENERATES**: none.

### 2.3 UPDATE the transport — `portal/lib/discovery-transport.mjs`

- **IMPLEMENT**:
  - `buildOpServer`: delete the `ctx` closure and the handler body. The tool callback becomes
    `try { const record = fileOp({ root, turn, state, onLine, op, args }); …bits…; return { content: [...] }; } catch (e) { return { isError: true, content: [{ type: 'text', text: e.message }] }; }`.
    Add `fileOp` to the `./discovery.mjs` import.
  - `runDiscoveryTurn`: gains `fresh = false`. `resume: head.sessionId && !fresh ? head.sessionId : undefined,` and at
    init `if (!fresh) { try { recordSessionId(root, sessionId); } catch … }`. One comment line on why: a revisit runs
    weeks later and on a copied package whose cwd has no session file (expected, not observed), and the turn prompt
    carries the ledger (#341).
- **GOTCHA**: case 12 (`build-checks.mjs:7668-7669`) slices the run query's block and asserts
  `/resume:\s*head\.sessionId/` on it as the positive control that the block is the real turn's. `resume:` must be
  followed DIRECTLY by `head.sessionId`, so the form above matches and `resume: fresh ? undefined : …` would not
  (observed by reading the regex). The pin stays unchanged; run case 12 to confirm. `opLine`, `readAnswers`, `QUESTIONS` and `applyOp` stay imported: the parenting probe uses them
  (lines 448–449).
- **VALIDATE**: `cd portal && node lib/discovery-transport.mjs --preflight` → its zero-token pre-flight passes
  (it calls the tool handlers directly). Record the observed output in the report.
- **REDDENS**: 30.61(a) (a second `appendTranscript(root, opLine(` in `buildOpServer` → red), 30.62(e).
- **SATISFIES**: AC #1 (the real path), AC #2.
- **REGENERATES**: none.

### 2.4 CREATE `tooling/fake-discovery-agent.mjs`

- **IMPLEMENT**: Header in `fake-compose-agent.mjs`'s voice: what it is (#498), that it is reached only through
  `UXF_DISCOVERY_TRANSPORT`, WHAT IT PROVES (the guards, the filing path, the transcript, the stats, the page) and
  CANNOT REACH (whether a model files a decision, a flag or an open question on a revisit, and the SDK's resume
  handling, which only the owner's paid turn shows). Exports:
  - `assertRoot(dir)`: `fake-compose-agent.mjs:52-60`'s guard, message `fake-discovery-agent: the fake writes agent lines and must never touch a committed package — its root must be a scratch package under the OS temp directory`.
  - `runDiscoveryTurn({ root, head, question, answer, turn, posture, state, affordance = null, park = false, answers = [], tensions = [], onLine, fresh = false })`:
    1. `assertRoot(root)`.
    2. `posture.build({ question, answer, turn, ledger: state.current.ops, provenance: head.provenance, entryMode: head.entryMode ?? 'blank-idea', answers, park, affordance, tensions })`. This is the real transport's call, so a builder that throws on this turn's inputs throws here too (the #454 class).
    3. Refuse `affordance !== null || park` by name. It scripts banked and revisit turns only.
    4. `const prior = state.current.ops.findLast((r) => r.op === 'record_decision' && r.params.question_id === question.id && r.params.off_script === false);`
    5. `fileOp({ root, turn, state, onLine, op: 'record_decision', args: { question_id: question.id, answer_ref: answer.ref, level: prior?.params.level ?? 'business', parent_id: prior?.params.parent_id ?? null, evidence_refs: [], wrong_if: 'Scripted by tooling/fake-discovery-agent.mjs — not a model\'s judgement.', off_script: false } })`.
    6. `onLine?.(appendTranscript(root, textLine({ turn, text: 'Fake discovery agent (tooling/fake-discovery-agent.mjs): one scripted record_decision, no model.' })))`.
    7. Return `{ sessionId: fresh ? \`fake-fresh-${++n}\` : (head.sessionId ?? \`fake-${++n}\`), stats: { turn, numTurns: 2, durationMs: 0, costUsd: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, ok: true, postureFingerprint: posture.fingerprint, transport: 'fake', ts: new Date().toISOString() }, advertised: OPS.map(toolNameFor) }`.
  - Imports: `node:fs` (`realpathSync`), `node:os` (`tmpdir`), `node:path`, `node:url`, and from
    `../portal/lib/discovery.mjs`: `appendTranscript, fileOp, OPS, textLine, toolNameFor`.
- **GOTCHA**: `discovery.mjs` imports `env.mjs`, which loads `portal/.env` into the process. That is fine inside the
  portal child and group 30 (both already load it). Never import the fake into the journey DRIVER process; the
  driver only names its path.
- **VALIDATE**: `node -e "import('./tooling/fake-discovery-agent.mjs').then(m=>{try{m.assertRoot('discovery/faster-payment')}catch(e){console.log(e.message.slice(0,40))}})"` → `fake-discovery-agent: the fake writes ag` (expected).
- **REDDENS**: 30.62(c) (guard returns early → the repo path is not refused).
- **SATISFIES**: AC #2.
- **REGENERATES**: none.

### 3.1 UPDATE `/api/discovery/turn` + the boot log — `portal/server.mjs`

- **IMPLEMENT**: In the `runTurn({ … })` call (line 426), add `revisit: body.revisit === true,` beside `park`, plus
  one comment line (#498: named, never spread; a revisit's guard is runTurn's). In `server.listen`, after line 670:
  `if (process.env.UXF_DISCOVERY_TRANSPORT) console.log(\`discovery transport: OVERRIDDEN by UXF_DISCOVERY_TRANSPORT → ${process.env.UXF_DISCOVERY_TRANSPORT} (the journey's fake; never set this for a real run)\`);`
- **VALIDATE**: portal smoke (Level 4). `/api/health` answers.
- **REDDENS**: 30.57 extended (`body.revisit` dropped → `30.57: the turn route does not name body.revisit individually`).
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

### 4.1 UPDATE the drawer — `portal/public/portal.js`, `portal/public/index.html`

- **IMPLEMENT**:
  - State: `discovery.revisit = null` (`{ questionId, seq }` while revisiting). Add the key to the `discovery`
    object literal (line 686).
  - `renderPackageView`: inside the EXISTING `l.decisions.map(…)` row template, when
    `s.revisit && discoveryEls().provenance === 'real' && d.latest && !d.offScript && s.revisit.questions.includes(d.questionId)`, append
    `<button class="btn btn-secondary" type="button" data-discovery-revisit="${esc(d.questionId)}" data-seq="${esc(d.seq)}">Re-record</button>`.
    No `.decisions.filter(` and no `.decisions.reduce(` (case 41 pins both). `!d.offScript` is required:
    `ledgerView` marks every off-script decision `latest: true` (`ops.mjs:268`), and one may NAME a revisable
    question, which would put a second button beside the banked row. The provenance read hides the button where the
    server refuses (Q4). The server's guard is the rule; this only keeps the button from offering a refusal. 30.63
    pins both reads in the condition.
  - A delegated click listener on `#discovery-package`, mirroring `#discovery-flow`'s at line 856. It sets
    `discovery.revisit = { questionId, seq: Number(btn.dataset.seq) }`, clears and focuses `#discovery-answer`, and
    calls `renderDiscoverySession()`.
  - `renderDiscoverySession`: `const revisiting = Boolean(discovery.revisit && s.revisit && !audit);`. When
    revisiting, the closed branch's three lines read: position `` `${head.slug} · finished ${head.endedAt} · re-recording decision seq ${discovery.revisit.seq} · turn ${s.revisit.turn}` ``,
    question `config.questions.find((q) => q.id === discovery.revisit.questionId)?.text`, and attribution
    `Your new answer is judged like any other. A decision it files supersedes seq ${seq}, and the canvas flags every frame pinned to it.`.
    `answer.disabled = !(answerable || revisiting)`, `submit.disabled = !(answerable || revisiting) || discovery.running`,
    submit text `revisiting ? 'Re-record decision' : (audit ? … : …)`, and `#discovery-revisit-cancel` hidden unless
    revisiting. `answerable` itself is unchanged. Park, look-up and aside keep reading `answerable`.
  - Submit handler (line 1472): before the guard, `if (discovery.revisit) { … postDiscoveryTurn({ body: { questionId: discovery.revisit.questionId, revisit: true, text }, runningLine: 'Re-recording — the agent judges the new answer…', settledLine: (s) => …, clearAnswer: true }) … }`.
    On a true return set `discovery.revisit = null` and call `renderDiscoverySession()`. The settled line reads the
    superseding seq off `s.ledger.decisions`: the row whose `supersedes` equals the revisited seq, else
    `Nothing superseded seq N — the agent filed <op>; the decision stands.`. The Jev guard is skipped, because it
    sorts off-script from answer and a revisit has no off-script path.
  - `#discovery-revisit-cancel` (new, in index.html's `.portal-form-actions` after `#discovery-submit`,
    `class="btn btn-secondary" type="button" hidden`, text `Cancel re-record`): click sets `discovery.revisit = null`
    and re-renders.
  - `openDiscoveryFor` and the Start handler reset `discovery.revisit = null` (a stale mode must not survive a package switch).
- **PATTERN**: `postDiscoveryTurn` (1328–1390) is the ONE SSE loop. Do not write a second one.
- **GOTCHA**: `portal.css`'s unscoped `[hidden]{display:none!important}` makes `hidden` work on a `.btn` (memory:
  `hidden` defeated by author display — already fixed there). Assert both directions in the journey.
- **VALIDATE**: `node --check portal/public/portal.js` → no output; the journey's B2 (Task 5.6).
- **REDDENS**: 30.63.
- **SATISFIES**: AC #1, AC #2.
- **REGENERATES**: none (the portal is not in the VR set, not in `loc-summary` and not in `param-manifest`).

### 5.1 UPDATE case 12's lazy-import pin — `tooling/build-checks.mjs:7647`

- **IMPLEMENT**: Replace the literal-import assertion at `build-checks.mjs:7647-7648` with this block (observed passing
  on the spike):
  ```js
  {
    const code = readFileSync(join(ROOT, "portal/lib/discovery.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const dyn = code.match(/\bimport\(/g) ?? [];
    const seam = /import\(process\.env\.UXF_DISCOVERY_TRANSPORT \?[^\n]*['"]\.\/discovery-transport\.mjs['"]\)/.test(code);
    const rt = code.slice(code.indexOf("export async function runTurn("));
    ok(dyn.length === 1 && seam && /await loadTransport\(\)/.test(rt),
      `case 12: portal/lib/discovery.mjs must reach the transport by ONE lazy import whose argument the UXF_DISCOVERY_TRANSPORT seam picks, awaited inside runTurn (${dyn.length} dynamic import(s), seam ${seam}) — the three-layer split is the whole architecture in one file boundary`);
  }
  ```
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓  all 51 groups pass`.
- **REDDENS** (both observed on the spike): runTurn back to `await import('./discovery-transport.mjs')` beside the
  unused `loadTransport` → `case 12: … (2 dynamic import(s), seam true)`. `loadTransport`'s argument back to the
  bare literal → `case 12: … (1 dynamic import(s), seam false)`.
- **SATISFIES**: AC #2.
- **REGENERATES**: none.

### 5.2 ADD 30.59 — the revisit turn id and the interview reads (pure)

- **IMPLEMENT**: Over the committed faster-payment files, read-only (`readTranscript`/`readAnswers`/`readRun`):
  - (a) `isRevisitTurn` true for `r1`, `r12`; false for `t1`, `r0`, `r01`, `R1`, `r`, `""`, `null`, `1`.
  - (b) `revisitView`: null for an open head (`{ ...head, endedAt: null }`) and an audit head; on the real head,
    `turn === "r1"` and `questions.length` equal to `ledgerView(opRecords).decisions` rows with
    `latest && !offScript && questionId !== null` (cross-reader, counted, not typed). Vacuity guard: the count > 0.
  - (c) Baseline (observed): `deriveCursor` over faster-payment reads `index 22, total 22, done true, turn "t25"`.
    Build `T2 = [...T, revisitLine]`, where `revisitLine` is the real applier's record for a `record_decision`
    on seq 7's question at `turn: "r1"` (its answer a synthetic `{ ref: "a-g30", turn: "r1", kind: "banked", question_id }`
    passed in `answers`), wrapped by `opLine`. Assert `deriveCursor`, `runMetrics` and `escalationFor` over T2 deep-equal
    the same reads over T, and `revisitView(head, T2).turn === "r2"`. **Positive control**: the same line with
    `turn: "t25"` moves `deriveCursor` (`done` false or `index` ≠ the baseline).
  - (d) A revisit `flag_weak_answer` closer (turn `r1`) also leaves the cursor unchanged and advances `revisitView` to `r2`.
- **REDDENS**: drop `&& !isRevisitTurn(l.turn)` from `closersOf` → `30.59 a revisit closer moved the interview: cursor {…} vs {…}`.
  Observed on the spike: with the exclusion removed, one revisit on seq 7's question moved the cursor from
  `[22, done, t25]` to `[4, not done, t26]`. Change the regex to `/^r\d+$/` → (a) `r0`/`r01` read true.
- **SATISFIES**: AC #1.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "30.59"` → nothing (pass), and the group 30 line ✓.
- **REGENERATES**: none.

### 5.3 ADD 30.60 — runTurn's revisit path, DRIVEN through the fake in a child process

- **IMPLEMENT**: `const jobs = realpathSync(mkdtempSync(join(tmpdir(), "g30-revisit-")))`, removed in `finally`
  (NOT `tmpRoot`: `TMP` is removed before 30.45, at `build-checks.mjs:8898`). The parent copies faster-payment's
  `run.json`, `answers.jsonl` and `transcript.jsonl` into `jobs/_discovery/fp-revisit/` and into `fp-open/` (with
  `endedAt: null` written into that copy's run.json). The child runs with `env: { ...process.env, JOBS_DIR: jobs, UXF_DISCOVERY_TRANSPORT: join(ROOT, "tooling/fake-discovery-agent.mjs") }`,
  imports `runTurn`, `openSession`, `closeSession`, `resolveRunRoot` and `sessionView`, and prints one JSON object:
  - the view after `runTurn({ slug: "fp-revisit", provenance: "real", questionId: q7, revisit: true, text: "A re-recorded answer (gate fixture, #498).", onLine })`,
    and the onLine types seen;
  - a second revisit on the same question;
  - each refusal's message, with answers/transcript line counts before and after each: `fp-open` + revisit; a
    question holding no current banked decision (derived in the parent: the first closed question not in
    `revisitView(...).questions`, else `"s0-no-such-question"`); `revisit: true` with `park: true`; with
    `kind: "off-script"`; `revisit: "yes"`; an audit (`openSession` an existing-prd package with `document`, then
    `closeSession`, then revisit); and a NON-revisit banked turn on the closed `fp-revisit` (positive control: still
    `was closed at`).
  Parent asserts:
  - (a) answers.jsonl's new line `{ turn: "r1", question_id: q7, kind: "banked" }`, its ref `a${n + 1}` (n read).
  - (b) the new op line: `record_decision`, `turn: "r1"`, `closes: true`, `supersedes: 7`, `seq` = prior op count + 1.
  - (c) run.json: `endedAt` and `sessionId` equal the copied values. turnStats grew by one, and its last entry has
    `revisit: true`, `transport: "fake"` and `sessionId` starting `fake-fresh-`.
  - (d) the returned view's cursor deep-equals the pre-run cursor (`done: true`), `revisit.turn === "r2"`, and decision 7 reads `latest: false, supersededBy: <b's seq>`.
  - (e) the second revisit: `turn: "r2"`, `supersedes` = (b)'s seq.
  - (f) onLine saw `op` and `text`.
  - (g) every refusal names its rule (`still open`, `audit has no answer to re-record`, `holds no current banked decision`, `never a park or an off-script`, `"revisit" must be true or false`) and left both files' line counts unchanged.
  - (h) the closed run still refuses a non-revisit turn.
  - (i) IN-PROCESS, pure, no runTurn: `assertRevisit(sessionView("discovery/faster-payment"), { slug: "faster-payment", provenance: "fictional", questionId: q7 })`
    throws `is a fictional package`, and the same call with `provenance: "real"` does not throw (the control). Never
    drive the fictional refusal through `runTurn`. Its root IS the committed package, and a regression would append
    to it.
  The spike ran (a)–(h)'s child script and observed every value: answer `{ ref: "a25", turn: "r1", question_id: "s1-what-would-have-to-be-true", kind: "banked" }`;
  op `{ seq: 31, turn: "r1", closes: true, supersedes: 7 }`; the second revisit `{ seq: 32, turn: "r2", supersedes: 31 }`;
  cursor unchanged at 22/22 `t25`; `endedAt` and `sessionId` unchanged; stats `{ revisit: true, transport: "fake", sessionId: "fake-fresh-2" }`;
  onLine saw `["op", "text"]`; seven refusals, each naming its rule, with both files' line counts unchanged.
- **GOTCHA**: q7 is read from the copied transcript (`seq === 7`'s `params.question_id`), never typed. On origin/main
  it is `s1-what-would-have-to-be-true` (observed). The child's stdout's LAST line is the JSON (case 44 reads `.pop()`).
- **REDDENS**: `runTurn` passing `fresh: false` → (c) `sessionId fake-…` not `fake-fresh-…`. Removing `!revisit` from
  `recordSessionId` → (c) `run.json sessionId moved`. Moving `assertRevisit` after `appendAnswer` → (g)
  `answers grew on a refused revisit`. Deleting the open-run branch of `assertRevisit` → (g) the `fp-open` revisit
  succeeds and names no rule.
- **SATISFIES**: AC #1, AC #2.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` → all groups pass. Time the group (the child adds one
  Node start, under 1 s, expected).
- **REGENERATES**: none.

### 5.4 ADD 30.61 — `fileOp` is the one filing path

- **IMPLEMENT**:
  - (a) Source pin, decommented, on `discovery-transport.mjs`'s `buildOpServer` body (sliced from
    `export function buildOpServer(` to the next `\n}\n`): contains `fileOp({`, and contains neither `applyOp(` nor
    `appendTranscript(`.
  - (b) Driven over a fresh `mkdtemp` root holding two answer lines: a valid `record_decision` → `fileOp` returns
    the record, the transcript holds exactly one line deep-equal to `opLine({ record })` minus `ts`, and
    `state.current.ops.length` is 1. An invalid op (`level: "nope"`) → throws the applier's message (`not on the ladder`),
    the transcript is unchanged, and the state is unchanged. An `onLine` that throws → no throw, and the line is on disk.
- **REDDENS**: re-inline the handler in `buildOpServer` → (a) `30.61: buildOpServer files without fileOp`. Swap
  `fileOp`'s order to holder-then-disk with a throwing `appendTranscript` → (b)'s state-unchanged assertion fails.
  Simulate it in the case: pass a root whose `transcript.jsonl` is a directory.
- **SATISFIES**: AC #2.
- **VALIDATE**: as above.
- **REGENERATES**: none.

### 5.5 ADD 30.62 + 30.63 — the seam, the fake and the drawer, pinned

- **IMPLEMENT**:
  - 30.62: (a) is Task 5.1's three assertions (move them here, and keep case 12's message pointing at 30.62);
    (b) `server.mjs` names `UXF_DISCOVERY_TRANSPORT` in a `console.log`; (c) `F.assertRoot` refuses
    `join(ROOT, "discovery/faster-payment")` and `"/"`, and accepts a realpathed `mkdtemp` dir; (d)
    `await import(fake)` succeeds in this process (CI has no `portal/node_modules`, so a stray SDK import reds here);
    (e) the transport's query block contains `resume: head.sessionId && !fresh ?`, its init branch is guarded by `!fresh`,
    and `runTurn`'s body has `assertRevisit(` before `appendAnswer(` and `fresh: revisit` in the transport call.
  - 30.63 (drawer, source pins with the must-NOT beside each must): `renderPackageView` names
    `data-discovery-revisit` and `s.revisit`, and still has no `.decisions.filter(`/`.reduce(`; the submit handler's
    revisit branch posts `revisit: true` through `postDiscoveryTurn(` and does not call `guardVerdict(`;
    `renderDiscoverySession` keeps `const answerable = !head.endedAt && !cursor.done;` verbatim (the revisit enable is
    separate); `index.html` has `id="discovery-revisit-cancel"`.
  - 30.57: add `"body.revisit"` to the named-parameter loop.
- **REDDENS**: per item, the must-NOT half. E.g. widening `answerable` to `|| discovery.revisit` → `30.63: answerable was widened`.
- **SATISFIES**: AC #1, AC #2.
- **VALIDATE**: as above.
- **REGENERATES**: none.

### 5.6 UPDATE canvas-journey pass B — `tooling/canvas-journey.mjs`

- **IMPLEMENT**:
  - `const FAKE_DISCOVERY = path.join(REPO, "tooling/fake-discovery-agent.mjs");` beside `FAKE_COMPOSE` (1689); hoist
    both if `FAKE_COMPOSE` is declared after pass B's call site.
  - Line 652: `await withPortal(MCP_DOWN, (b) => blastPass(b, page, t, step), { extraEnv: { UXF_DISCOVERY_TRANSPORT: FAKE_DISCOVERY } });`.
    The main child never carries it.
  - New B2, before the canvas assertions:
    1. Read `q7` and the op count `n` from `DISC()/fp-stale/transcript.jsonl` (never literals). Snapshot run.json.
    2. `page.goto(\`${base}/#/discovery/real/fp-stale\`)`, wait `#discovery-drawer[data-discovery-link="ready"]`.
    3. `const rr = page.locator(\`[data-discovery-revisit="${q7}"]\`)`. Assert count 1, a bounding box at least 44×44
       (scroll first), and `#discovery-revisit-cancel` hidden.
    4. Focus `rr`, press Enter. Assert `#discovery-answer` enabled and focused, `#discovery-position` includes
       `re-recording decision seq 7 · turn r1`, and `#discovery-revisit-cancel` visible.
    5. Type `Journey answer (#498): typed by tooling/canvas-journey.mjs through the drawer, not the owner's words.`,
       focus `#discovery-submit`, press Enter.
    6. Poll the transcript for `n + 2` lines (the op and the fake's text line). Then: `S` = the new op line's seq,
       with `op: record_decision`, `turn: "r1"`, `supersedes: 7`, `closes: true`. The last answers line has
       `turn: "r1"` and `question_id: q7`. run.json `endedAt` and `sessionId` unchanged. The last turnStats entry
       has `revisit: true` and `transport: "fake"`. `#discovery-position` again reads ` · finished ` with no
       `re-recording`, and the status line names `seq ${S}`.
    Then the existing B2 canvas assertions, unchanged, with this `S`.
  - Delete the `S = seedSupersede("fp-stale")` call. KEEP `seedSupersede`, `applyDiscoveryOp`/`Ops` and `BANK` (the
    inbox pass at line 950 still uses them). Reword `seedSupersede`'s comment (797–800) to say it now serves the
    inbox pass only, and why.
  - Header paragraph (77–87): replace the seeding sentence and the "WHAT IT CANNOT REACH: re-recording …" clause.
    New cannot-reach: a MODEL's filing on a revisit (the fake scripts a `record_decision`), and the SDK resume path.
    The seed line comment at 296–299 is updated likewise.
- **GOTCHA**:
  - Assert B1's six-line ledger before the side portal writes anything. B1 runs inside the side portal now, so
    nothing changes there.
  - `withPortal` asserts `bootSha === HEAD` and `stale === false`. Commit or stash before a full run, or the side
    portal refuses. Memory "stale serve = wrong tree": the journey spawns its own portal, so a sibling's serve.mjs
    is not in play.
  - Memory "hover probes race smooth scroll": call `settleScroll(page)` before `boundingBox()`, as B2 already does.
  - **NEVER run `build-checks.mjs` in the same worktree while canvas-journey runs.** Case 50.12 temporarily adds
    150 lines to `system/device-presets.mjs` and then restores it. A journey leg in flight reads that as I6's
    `git status … unchanged` failure. Observed on the spike: firefox I6 failed with `M system/device-presets.mjs`
    while a build-checks run overlapped, and the file was clean afterwards.
  - The fp-stale copy's run.json says `provenance: "fictional"` while the URL says `real`. The drawer reads by URL
    (W5's note at 999–1000). Assert on the inputs, not on the heading's slug.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs &` is NOT needed (this driver boots its own portal).
  `node tooling/canvas-journey.mjs chromium` → B1–B7 green, then `node tooling/canvas-journey.mjs all`. Observed on
  the spike's B2 (7 drawer assertions plus the existing canvas ones): **webkit 233 passed / 0 failed, chromium 234 / 0,
  firefox 233 / 0** (firefox's first run overlapped a build-checks run and lost I6 to the trap below; run alone, it
  was clean). Drawer re-record round trip, from navigation to the op on disk: webkit 367 ms, chromium 333 ms,
  firefox 374 / 546 ms (observed), against the 10 s transcript poll. Expect your counts to match once 30.x
  assertions are added to B2 the plan's way (step 6 adds about 3 to the spike's 7).
- **REDDENS**: in `fake-discovery-agent.mjs`, file `flag_weak_answer` instead → B2 `supersedes: 7` red, then the canvas
  chip assertion red. In portal.js, drop `revisit: true` from the body → the server refuses (`was closed at`) and B2
  reds on `n + 2 lines`.
- **SATISFIES**: AC #2, and AC #1's mechanism.
- **REGENERATES**: none.

### 6.1 UPDATE the three copies of the gate prose

- **IMPLEMENT**: (i) group 30's `group("discovery", …)` string (9185): append a `· #498 ADDED THE REVISIT TURN: …`
  clause naming 30.59–30.63, and in "What it cannot reach" replace "the transport, the SDK, any live run" with a
  sentence saying runTurn is now driven end to end through the fake, but the SDK, the real tool callback's isError
  wrapping and any model's filing on a revisit are not. (ii) `.claude/references/gates.md:49`, group 30's entry: one
  sentence for #498. (iii) gates.md:143, canvas-journey: pass B's re-record now goes through the drawer. Then grep all
  three for `scripted-agent seam|closed session refuses turns|re-recording a decision in the discovery drawer` →
  zero hits outside `seedSupersede`'s own comment.
- **VALIDATE**: `node tooling/drift-check.mjs 2>&1 | tail -1` → `drift-check ✓ … group-count` (no group added, so the
  heading count stays 51).
- **REDDENS**: n/a (prose). The group-count leg reddens only if a group is added. None is.
- **SATISFIES**: Testing standard (the honest "cannot reach").
- **REGENERATES**: none.

### 6.2 UPDATE `discovery/README.md` and the architecture doc

- **IMPLEMENT**: README §File shapes: one `answers.jsonl` example line `{ "ref": "a25", …, "turn": "r1", "question_id": "q7", "kind": "banked", … }`,
  plus a paragraph "**A REVISIT TURN (#498)** …": the `rN` namespace, finished blank-idea runs only, current banked
  decisions only, the cursor/metrics/escalation fold the interview only, `endedAt` and `sessionId` untouched, the
  turnStats entry carrying `revisit: true` and its own `sessionId`. §Supersede: one sentence on the drawer's
  Re-record as the product path. `docs/epics/canvas-design-import.architecture.md`, after "D2 as built (#318)": one
  sentence "**Re-record as built (#498)**: …" naming the drawer control and the env seam.
- **VALIDATE**: read back.
- **SATISFIES**: Documentation.
- **REGENERATES**: none.

### 6.3 Final regeneration check

- **IMPLEMENT**: Stage everything, then run `node agent-layer/gen-loc-summary.mjs --check` (it counts TRACKED content
  only, so run it after staging). Expected: no drift, because no touched file is in `system/`, the pages or
  `agent-layer/`.
- **REGENERATES**: none expected. `loc-summary.json`, VR baselines, `system-graph.json`, the handoff pack and
  `param-count.json` are all untouched by `portal/`, `tooling/`, `discovery/README.md` and `docs/` edits.

---

## TESTING STRATEGY

No suite (CLAUDE.md §Testing). The gates are build-checks group 30 (CI), `drift-check`, `token-lint`, the
transport's zero-token `--preflight`, canvas-journey (operator-run, three engines) and a portal smoke.

### Unit-level (group 30)

30.59 pure reads, 30.60 the driven turn, 30.61 `fileOp`, 30.62 the seam/fake/transport pins, 30.63 the drawer pins,
30.57 and case 12 updated.

### Integration (canvas-journey pass B)

The drawer → the route → runTurn → the fake → `fileOp` → the transcript → the canvas reload → the existing B2–B7.

### Edge cases

- A revisit whose agent files a flag or an open question: no supersede, the turn closes, and the next revisit is `r2`
  (30.59(d)).
- A revisit the agent never closes: the same `rN` is reused (`revisitView` counts closed turns). The drawer shows the
  dangling answer under "Recorded so far", as for a banked turn.
- Two revisits on one question: chained supersede (30.60(e)).
- A revisit on an open run, an audit, an undecided question, or combined with park, off-script or a non-boolean
  `revisit`: refused before any append (30.60(g)).
- A non-revisit turn on a closed run: still refused (30.60(h)).
- The fake pointed at a committed package: refused (30.62(c)).

### Proving the checks

Every case above carries its REDDENS mutation and a positive control: 30.59(c)'s `t25` line, 30.60(h), 30.61(b)'s
valid op, 30.62(c)'s accepted tmp dir, and journey B1. Use a scripted mutation driver, and **read stderr as well as
stdout**. build-checks prints failures to stderr, and #318's first driver read stdout only and reported ten false
passes. Prove the driver on one manual mutation before trusting it.

---

## VALIDATION COMMANDS

### Level 1: Syntax

- `node --check portal/lib/discovery.mjs portal/lib/discovery-transport.mjs portal/server.mjs portal/public/portal.js tooling/fake-discovery-agent.mjs tooling/canvas-journey.mjs tooling/build-checks.mjs` (one at a time if your node rejects several)

### Level 2: The CI gate

- `node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓  all 51 groups pass` (baseline observed on origin/main 1c6af29)
- `node tooling/drift-check.mjs 2>&1 | tail -1` → `drift-check ✓ … group-count` (baseline observed)
- `node tooling/token-lint.mjs` → `token-lint ✓ …`
- `cd portal && node lib/discovery-transport.mjs --preflight` → pass, $0

### Level 3: Integration

- `node tooling/canvas-journey.mjs chromium`, then `all` (operator-run; three engines)

### Level 4: Manual

- Portal smoke on an OS-assigned port, killed by `$!` only (memory: never pkill or kill-by-port):
  `PORT=0`-style free port via the journey's `freePort` idiom, or `node -e` to pick one; `GET /api/health` → `ok:true`, `stale:false`;
  `GET /api/discovery/session?provenance=fictional&slug=faster-payment` → `revisit.turn === "r1"`, 20 questions, cursor `done: true`.

### Level 5: CodeQL

Runs on the PR. No new sink: the route parameter is a boolean compare, and the drawer writes `esc()`'d strings.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| The owner re-records decision 7 in the real drawer on `<JOBS_DIR>/_discovery/fp-revisit-498/` (a `seedSpine` copy of faster-payment, never committed), typing their own answer, then reloads `canvas.html?provenance=real&slug=fp-revisit-498` and sees f1 flagged | about $0.18 (one cold-cache turn; memory "discovery cost baselines": $0.184 cold, $0.063 warm), the owner's hand, at most 3 attempts | **Yes, for `Closes #498`** (owner, 2026-10-02). The PR opens with `Refs #498` and switches to `Closes #498` after this step lands | n/a: it blocks closing |

Owner-step setup (run it for the owner; the owner prefers UI over CLI):
`node -e "import('./portal/lib/canvas-store.mjs').then(m=>console.log(m.seedSpine('discovery/faster-payment', '../Linards jobs folder/_discovery/fp-revisit-498', { discovery: true })))"`
from the repo root. The destination is `JOBS_DIR`'s default (`portal/lib/env.mjs:23`: `path.resolve(REPO_DIR, '..', 'Linards jobs folder')`, read) unless `portal/.env` overrides it; check it first. Then `cd portal && npm start`
with `UXF_DISCOVERY_TRANSPORT` UNSET (the boot log must NOT print the override line), and open
`http://localhost:4747/#/discovery/real/fp-revisit-498`. Before declaring it done, check the new turnStats entry's
`ok` AND the transcript's op line (memory "SDK error result wears success": a `subtype: success` result can carry
`is_error: true`). If the agent files a flag instead of a decision, the owner answers again on `r2`. Never edit a line.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1**: the owner re-records a linked decision from the discovery view, and the canvas flags the frame on its
  next load. Mechanism proven at $0 by 30.60 and journey B2. **Met only when** the owner's paid step above lands.
- [ ] **AC #2**: canvas-journey's pass B replaces its in-process seed with the drawer path: B2 drives Re-record →
  answer → submit through `#/discovery/real/fp-stale` on a side portal with the fake, and `seedSupersede` is no longer
  called by pass B.
- [ ] A revisit leaves the run closed: `endedAt`, `sessionId` and the cursor unchanged (30.60(c)(d), B2 step 6).
- [ ] Every revisit refusal happens before any append (30.60(g)).
- [ ] No posture fingerprint moves (30.45/30.46 stay green unchanged) and no committed file under `discovery/` changes
  (journey's `gitDiscovery()` comparison).
- [ ] `build-checks` 51/51, `drift-check`, `token-lint`, `--preflight` green. canvas-journey `all` green on three
  engines, apart from the known `I10` firefox flake, which is named if it recurs.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order, each VALIDATE run and its output recorded
- [ ] Every REDDENS mutation run, reading stderr, with the message recorded
- [ ] The three copies of the gate prose updated, and the grep reads zero stale hits
- [ ] `gen-loc-summary --check` run after staging
- [ ] Plan, report and review in the same PR. The PR body says `Refs #498` until the owner's step, then `Closes #498`

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 (closed, owner 2026-10-02):** scope is A + B.
- **Q2 (closed, owner 2026-10-02):** the run stays closed. A revisit is a bounded exception with its own turn id.
- **Q3 (closed, owner 2026-10-02):** the PR closes #498 only after the owner's paid turn.
- **A1**: only questions holding a current banked decision are revisable. Widening this to parked questions is a
  one-line change to `revisitView`, plus the drawer's rows for open questions.
- **A2 (closed by evidence)**: a revisit starts a fresh SDK session (`fresh: true`). This departs from discovery's
  resume-per-turn (`discovery-partner.architecture.md` §Boundaries) for revisit turns only, which is why it is named
  here. Evidence (observed): faster-payment's session file is
  `~/.claude/projects/-Users-Berzins-Desktop-Linards-current-ux-factory-discovery-faster-payment/0f808208-….jsonl`,
  stored under the package's own cwd. A jobs-folder copy runs with a different cwd, so a resume has no file to find.
  A fresh session is the path every run's first turn already takes (`resume: undefined` when `head.sessionId` is null).
  The prompt carries everything the turn needs. The spike built the exact revisit prompt at no cost, and it holds the
  question, the weak-answer note, the answer, and the ledger brief, which lists `seq 7 (s1-what-would-have-to-be-true)` (observed).
- **Q4 (closed at planning, 2026-10-02, under the owner's "address all risks"; reversible): a revisit on a
  fictional package is refused.** One real click on `discovery/faster-payment` would append to a committed fixture
  that 36.15 pins (every row `supersedes: null`) and make its `prd.md` stale. The guard is `assertRevisit`'s first
  branch, keyed on the request's provenance. The drawer hides the button there. Undoing it is one branch and one
  read. Propose features keeps its existing shape, out of scope.
- **A3 (closed by evidence for this ticket)**: the banked prompt is reused unchanged on a revisit. `reaskBrief` would
  add a "second ask" sentence only for a question that was flagged weak. In faster-payment the flagged questions are
  `s6-audit-trail` and `s6-permission-model`, and neither holds a decision, so no revisable question triggers it
  (observed). A future package where a decided question was once flagged gets one accurate extra sentence, and no
  stamp moves.

## NOTES (open canvas)

**N1, why not B alone.** `runTurn` refuses `head.endedAt` (line 1117) and `cursor.done` (1118) before the dynamic
import (1144). A fake transport therefore never runs on faster-payment. Re-opening the run (option 3 in the owner's
question) would re-enable everything gated on an open run: the inbox's open-question rows, Propose features disabled,
the cursor. The owner declined it.

**N2, why a turn-id namespace and not a field.** Invariant 4: the cursor is derived from the transcript alone. A
`revisit: true` field on the answer line would make the cursor read two files, and closer counting would need the
answer join. The `rN` id is on the op line itself, so `closersOf` stays a transcript-only filter. The applier needs no
change: R2 keys on `ctx.turn` (any string, `ops.mjs:325`) and the supersede rule on `question_id` + `off_script === false` (`ops.mjs:436-440`).

**N3, why no revisit prompt paragraph.** A ledger-derived `revisitBrief` would fire only on revisits, because no
interview turn re-asks a decided question. It would sit outside every posture fingerprint, like `reaskBrief`, whose
only guard is a verbatim pin (case 31). The affordance precedent says new prompt text gets its own stamp input set.
The cost of that is a new stamp and its pins, for one sentence the agent does not need: the ledger brief already lists
the decision. Deferred until the owner's paid turn shows the agent mis-filing without it.

**N4, the fake files the prior decision's level and parent.** This keeps the record's shape valid (a solution decision
whose parent is one rung up) without a model. On seq 7 that is `solution` with parent 6 (observed).

**Spike (2026-10-02, origin/main 1c6af29, throwaway worktree; diff in `…-spike.diff.txt`).** Applied Tasks
1.1–2.4, 3.1, 4.1, 5.1 and 5.6's B2 in their spike form. Observed:
- `cd portal && node lib/discovery-transport.mjs --preflight` → `pre-flight ✓  all 8 rows pass, zero tokens`,
  before and after the handler moved to `fileOp`.
- `build-checks` with Tasks 1–4 and no 5.1 → exactly ONE red, `case 12: … no longer reaches the transport by a lazy
  import`. Cases 34, 30.55, 30.57, 45.7 and the `runQuery` resume pin stay green. With 5.1 → `build ✓  all 51 groups pass`.
- The child-process revisit through the fake: every value in Task 5.3's last paragraph.
- The mutation in 30.59: cursor `[22, done, t25]` → `[4, not done, t26]`.
- canvas-journey: webkit 233/0, chromium 234/0, firefox 233/0 (run alone). The overlapping firefox run's I6 failure
  was traced to build-checks 50.12's temporary edit of `system/device-presets.mjs`.
- The revisit prompt the owner's paid turn will send, built at no cost (A2).

**Pre-flight (run 2026-10-02 against origin/main 1c6af29, in a scratch worktree):**

- `npm ci` in `portal`, `tooling/icons`, `tooling/style-dictionary` → ok. `node tooling/build-checks.mjs` →
  `build ✓  all 51 groups pass` (observed; #318's report said 50, and #319's inbox made it 51). `node tooling/drift-check.mjs`
  → `drift-check ✓ … group-count` (observed).
- Turn ids across every committed package: transcript `{ tN: 932 }`, answers `{ tN: 257, null: 3 }` (observed). The
  `rN` namespace collides with nothing.
- faster-payment: 30 ops, last seq 30, 20 questions with a current banked decision, seq 7 = `s1-what-would-have-to-be-true`,
  level `solution`, parent 6, `endedAt` set, 24 closers (observed).
- **Changed the plan:** case 12 pins the literal lazy import (7647). Task 5.1 now replaces it, where it would have been
  found red at run time.
- **Changed the plan:** case 34 requires exactly one `appendAnswer(` in runTurn. The revisit reuses the banked append
  instead of adding its own.
- **Changed the plan:** case 41 forbids `.decisions.filter(`. The Re-record button is a per-row condition inside the
  existing map, fed by a server-side list.
- **Changed the plan:** `rmSync(TMP)` sits before 30.45 (8898), so new cases own their temp dirs.
- **Changed the plan:** case 12's `runQuery` positive control is `/resume:\s*head\.sessionId/` (7669). The draft's
  `resume: fresh ? undefined : …` would have reddened it, so the `resume` line is now `head.sessionId && !fresh ? …`.
- **Changed the plan:** the inbox pass (W1, line 950) also calls `seedSupersede`. The helper and its imports stay.
- `JOBS_DIR` is an import-time const (case 44's note), so 30.60 runs in a child process, as case 44 does.
- `withPortal` (232) takes `extraEnv`, and the compose pass already runs a whole pass on a side portal (1849).
- `#discovery-drawer .btn` is already 44×44 (`portal.css:200`), so no CSS task.
- `loc-summary` groups are `system/`, pages and `agent-layer/` only (`gen-loc-summary.mjs:25-30`), so no regeneration.
- Not run: the journey on origin/main (the #318 report's three-engine numbers are the baseline). The transport's
  `--preflight` on origin/main (run it at Task 2.3, before and after).

**Confidence: 10/10 for one-pass implementation.** (A score of 20 was asked for. The scale stops at 10, and 10 is
claimed only because every risk below is closed by a run, not an argument.)

| Risk | Status | Evidence |
|---|---|---|
| R1 case 12's `runQuery` resume pin | closed | Spike's `resume: head.sessionId && !fresh ? …` line: build-checks 51/51 (observed) |
| R1b case 12's lazy-import pin | closed | Replacement pin passes, and both mutations red it by name (observed, Task 5.1) |
| R2 B2 timing on webkit | closed | webkit 233/0, round trip 367 ms vs 10 s poll (observed) |
| R2b the other engines | closed | chromium 234/0 (333 ms); firefox 233/0 run alone (546 ms) (observed) |
| R3 the paid turn's agent flags instead of deciding | **not an implementation risk**; bounded | It affects only when AC #1 can be ticked, not the build. Procedure: the owner answers again on `r2`, at most 3 attempts (about $0.55 cap, derived 3 × $0.184). The prompt it will see was built and read (A2) |
| A2 fresh session | closed | the session file is cwd-keyed (observed path) |
| A3 the re-ask sentence on a revisit | closed for this package | no decided question was flagged (observed) |
| Q4 the button on committed fixtures | closed | guard decided and spiked: refusal observed, the real-provenance control passes |
| The cursor exclusion | proven | mutation moves the cursor 22/22 → index 4 (observed) |
| The handler move to `fileOp` | proven | `--preflight` 8/8 after the move, PF4/PF5/PF7/PF8 exercising it (observed) |
| The journey trap with concurrent build-checks | recorded | GOTCHA in 5.6 (observed cause) |

## AMENDMENTS

- 2026-10-02 — Spike run to close every risk (owner: "address all risks"). Changed: Task 1.2's literal (22 of 22,
  not 24), `assertRevisit` takes `{ slug, provenance, questionId }` and names the request's slug, a fictional-package
  refusal plus the drawer's matching read (Q4 closed), Task 5.1's exact pin and its observed mutations, 30.60(i),
  the build-checks/journey concurrency GOTCHA, the risk table with evidence, and confidence 10/10. Spike diff saved
  beside the plan.
