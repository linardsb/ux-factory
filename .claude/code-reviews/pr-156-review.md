# PR #156 review — the operator path: /build's ten answers brief a real composition run (#140)

**Branch**: `feature/build-operator-path-portal-drawer` → `main` · **Commit**: `9332500` ·
**Size**: 17 files, +2453 / −25 · **State**: OPEN

**Recommendation: REQUEST CHANGES** — on one High finding with a one-line fix, plus two Mediums.

This is strong, unusually well-evidenced work, and the two claims the ticket actually rests on —
SDK-freedom and the untouched honesty machinery — both hold under independent re-proof. The High is
narrow: `/api/build/run` spreads the raw POST body into `runBuild`, which lets a caller set `force`
and reach a path that deletes a committed proposal and truncates a committed raw trace. Everything
else is polish.

Two independent review passes ran over this diff (this reviewer plus a fresh-context `code-reviewer`
agent). Where they disagreed on severity, the reconciliation is recorded under Notes.

---

## Validation

Every command re-run for this review, not quoted from the report.

| Command | Result |
| --- | --- |
| `node tooling/build-checks.mjs` | ✓ all 8 groups pass |
| same, with `portal/node_modules` moved away | ✓ all 8 groups pass — **SDK-freedom independently confirmed** |
| `node tooling/validate-trace.mjs` | ✓ all traces, incl. the new `northwind-stream-insight-panel` pair (14 steps · 4 phases · 1 artifact) |
| `node scenarios/validate.mjs` | ✓ 3 scenarios · verdicts differ |
| `node tooling/drift-check.mjs` | ✓ 8 checks |
| `node tooling/token-lint.mjs` | ✓ 64 tokens · 0 undeclared |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ 3 groups — no drift (run post-commit, so `builder.mjs` is tracked) |
| honesty machinery vs `origin/main` | ✓ `buildTask`, `PIV_COMPOSE_SYSTEM`, `refsFor`, `makeFence`, `SECRET_PATHS` byte-identical — the only diff lines naming any of them are the two `makeFence(...)` call sites gaining `onStep` |
| CI wiring | ✓ `verify.yml:54` runs `build-checks`; `npm ci` runs only for `tooling/style-dictionary` and `tooling/visual-regression` — the dep-freedom claim is one CI actually keeps |

No shipped page, `system/` module or `agent-layer/` generator changed, so no visual baseline moves —
confirmed against the diff's file list, not the report's assertion.

The committed artifacts read as a real run: session id, monotonic timestamps, `"label": "Real run,
curated for length"`, and the manifest question is byte-identical to `SHAPE_QUESTION.stream` +
`ACTION_STANCE.check`. The committed output is demonstrably the product of the rules this PR adds.

---

## Findings

### High 1 — `/api/build/run` spreads the raw body, so a caller can set `force` and destroy committed artifacts

`portal/server.mjs:105` · `portal/lib/builder.mjs:316,324` · `portal/record-composition.mjs:409-415` · `portal/lib/trace-recorder.mjs:65`

The chain, traced end to end:

1. `server.mjs:105` — `runBuild({ ...body, onStep })` spreads the **raw POST body**.
2. `builder.mjs:316,324` — `runBuild` destructures `force` and forwards `force: Boolean(force)`.
3. `record-composition.mjs:409` — `if (existsSync(rawOut) && !force) throw` is skipped.
4. `record-composition.mjs:415` — `if (existsSync(outAbs)) rmSync(outAbs)` **deletes the committed proposal**.
5. `trace-recorder.mjs:65` — `writeFileSync(outFile, '')` **truncates the committed raw trace to zero bytes**, and this runs *before* the SDK query, so it lands even if the run then dies on auth.

The drawer never sends `force`, so nothing legitimate depends on it being caller-settable. The
overwrite guard at step 3 is the only thing standing between an HTTP body and a committed honesty
artifact, and the spread hands the body the key to it.

**This is reachable cross-origin.** There is no `Origin`/`Referer` check and no CORS handling
anywhere in `portal/server.mjs` (grepped — the only matches for `origin`/`localhost` are the
`new URL(req.url, 'http://localhost')` base and the `listen(PORT, '127.0.0.1')` call). `readBody`
(`server.mjs:39-44`) `JSON.parse`s the body regardless of `content-type`, so a cross-origin
`fetch(..., {mode:'no-cors', headers:{'content-type':'text/plain'}})` — or a plain
`<form enctype="text/plain">` — is a *simple* request: no preflight, opaque response, but the
request **is delivered** and the side effect happens.

**Failure scenario**: the operator has the portal running (its normal state during a work session)
and opens any other page in the same browser. That page POSTs
`{scenario:"northwind", answers:{…the ten defaults…}, question:"x", slot:"insight-panel",
slug:"stock-risk-state", force:true}`. Every value is readable off the public repo —
`system/build-questions.mjs` ships the enums, `scenarios/northwind/compose.json` ships the slots,
`proto/compositions/northwind/index.json` ships the slugs. Result:
`proto/compositions/northwind/stock-risk-state.json` deleted,
`traces/stock-risk-state.raw.jsonl` emptied, and a real token-spending run started — with no
interaction beyond loading a page.

**Fix (one line, narrowest, closes the destructive path):** stop spreading. At `server.mjs:105`:

```js
const result = await runBuild({
  scenario: body.scenario, answers: body.answers, question: body.question,
  slot: body.slot, slug: body.slug, dry: body.dry,
  onStep: (line) => { const ev = stepEvent(line); if (ev) send(ev); },
});
```

That also stops any future `runBuild` parameter from becoming silently caller-settable — the same
whitelist-never-blacklist reasoning `stepEvent` already applies one module over.

**Optional, closes the whole class** (the token-spend too, and the same gap on `/api/chat` and
`/api/figma/pull`): one guard at the top of the request handler rejecting when `req.headers.origin`
is present and is not the portal's own origin.

**And the comment needs rewording.** `builder.mjs:117-123` says:

> These are CONTRACT guards, not trust boundaries (the portal binds 127.0.0.1 only)

Loopback binding stops a *remote* client. It does nothing about a browser on the operator's own
machine. In a repo that deleted two sentences in #139 for being untrue, a load-bearing comment
stating a false reason is as much the finding as the code is.

### Medium 2 — every answer change clobbers the operator's edited question; a transient failure wipes it to empty

`portal/public/portal.js:420-425`, `429` → `473-480` · and `433-441` via the `catch` at `465-470`

`renderDraft` unconditionally executes `$('#builder-question').value = d.question` (line 479) and
`$('#builder-slug').value = d.defaultSlug` (line 480). It is reached from `refreshDraft()`, which
**all ten** radio handlers call (lines 420-425), plus the slot `<select>` (line 429).

But `draftQuestion` (`builder.mjs:82-90`) reads only `shape`, `action` and `subject`. Rule 3 — this
PR's headline claim, gated byte-for-byte in build-checks group 8 — says the other eight answers
cannot change the question. The slot isn't even a parameter. So for eight of the ten answers and for
the slot, `refreshDraft` re-fetches a question that is provably identical and overwrites the
operator's edit with it.

**Failure scenario**: the operator answers all ten, edits the drafted question (exactly what the
textarea's own label — "edit it before you spend a run" — invites), then changes `nogos` or switches
slot to read the other slot's bounds. Both ordinary actions. The textarea silently resets to the
machine draft. If they don't re-read it, Run spends a paid agent run on the pre-edit wording — and
plan A2's stated check ("the operator reading it before spending a real run is the check") is
defeated by the code that renders it.

**Worse sub-case**: `setBuilderComposable(false)` (lines 433-441) sets both fields to `''`, and
`refreshDraft`'s `catch` (lines 465-470) calls it. Clearing is right for the *non-composable
scenario* branch — that is what the function was written for — but on a transient
`/api/build/draft` failure (server restart, a blip) it destroys typed input outright, recoverable
from nowhere.

**Fix**: track a `touched` flag set by an `input` listener on `#builder-question`/`#builder-slug`;
skip the assignment in `renderDraft` when touched; reset the flag only on a scenario change. In the
`catch` branch, show `err.message` and leave the fields alone.

### Medium 3 — `verify.yml`'s gate description omits group 8, and the "don't install portal deps" warning is in the wrong file

`.github/workflows/verify.yml:5-6`

The header still enumerates the pre-#140 groups and says nothing about the operator path. More
importantly, group 8's own warning —

> Do not "fix" a red job by installing portal deps in CI — that deletes the check.

— lives in `tooling/build-checks.mjs:12-17`, which is not the file a maintainer opens when the job is
red and they are editing CI.

**Failure scenario**: someone adds a static SDK import under `portal/lib/`; group 8 goes red in CI
with `Cannot find package '@anthropic-ai/claude-agent-sdk'`; the maintainer adds an `npm ci` step for
`portal/`; the job goes green — and the invariant this ticket's central design decision rests on is
gone, with the gate still printing `all 8 groups pass`.

PR #150 was a chore for stale counts in this same gate's header, one PR ago. Same class.

**Fix**: add group 8 to the workflow header's enumeration, and one line beside the `Build checks`
step naming the invariant and why `portal/` must never get `npm ci` in this job.

---

## What's genuinely well done

- **The SDK-freedom invariant is proven by an absence, and the absence is real.** Deviation 1's
  reasoning is correct: the plan's dynamic-import instruction and its use-`loadComposeConfig`
  instruction were mutually exclusive, and moving the laziness into `record-composition.mjs` leaves
  one provable sentence instead of two half-kept ones. Both review passes traced the full static
  graph (`builder.mjs` → `record-composition.mjs` → `env.mjs`, `agentic-renderer.mjs`,
  `curate-trace.mjs`, `validate-trace.mjs`, `build-questions.mjs` → `derive.rules.mjs`) — none reach
  the SDK — and both re-ran the `node_modules.off` dance independently.
- **The CLI-to-library refactor is behaviourally exact.** Every path that previously set
  `process.exitCode = 1` maps to a matching `ok:false` + `reason`: `invalid-composition` (dry and
  real), `piv-incomplete`, and `not-clean` on the shipped-but-unclean path. `ok = valid && clean`
  reproduces the old dry-run exit condition exactly, the `stderr` text is unchanged, and the CLI
  tail's `.catch` still calls `process.exit(1)` as before. `process.exitCode` rather than
  `process.exit(1)` on the guard path is the right call for the stated reason.
- **The honesty machinery really is untouched**, and the PR proves it mechanically rather than asking
  a reviewer to eyeball a 2800-line diff. That is the right way to make a claim like this checkable.
- **Group 8 mostly avoids the "check that cannot fail" trap this repo keeps meeting.** The
  `__proto__` fixture built through `JSON.parse` — with an explicit `Object.hasOwn` assertion that
  the fixture itself is meaningful — is the standout: an object-literal `__proto__:` key would make
  it vacuous, and the comment says so. The inherited-answer case discriminating
  `Object.hasOwn(raw, id)` from `raw[id] !== undefined` shows the same care. The `covered()` filter
  looks like it could make the coverage loop redundant but doesn't: the unconditional loop above it
  checks every shipped option first, and `covered()` only stops `draftQuestion` throwing and taking
  the rest of the group with it. Rule-3 byte-identity across all 8 non-input answers × every option
  is exactly the assertion the drawer's central claim needs.
- **Coverage is driven by the shipped config**, so a fifth `shape` option fails loudly rather than
  going silently unhandled — the same property `PATTERNS`/`BOARD_FOR` has.
- **`stepEvent` is a whitelist with an exact-key-set assertion and explicit leak probes.** Every
  retained field is scalar except `artifact`, flattened to `?.path`. Firing `onStep` from inside
  `write()` so it sees the post-redaction line is a real design decision, not an accident.
- **The SSE route's lifecycle is correct**: `readBody` is awaited strictly before `res.writeHead`, so
  a malformed body can never collide with already-sent headers; `res.on('close')` plus the
  `open`/`writableEnded` guard no-ops writes after a disconnect; `res.end()` is unconditionally
  reached.
- **Escaping in the drawer is consistent** — every `innerHTML` interpolation goes through `esc()`;
  the only unescaped ones are numeric stats, and the phase log uses `textContent` by design.
- **The `[hidden] { display: none !important; }` fix** generalises a bug this repo has now hit three
  times (`.btn` is `inline-flex`, silently defeating `el.hidden = true`). Fixing the class rather
  than the instance is the right response.
- **Documentation is unusually honest.** The `compose.json` §One parser note records a finding that
  *contradicts the ticket's own premise* rather than inventing a second parser to satisfy the
  sentence, and the epic amendment states why the out-of-repo real-provenance run is a boundary
  rather than an oversight.
- **Not-exercised cases are flagged, not buried** — the two-runs-at-once and disconnect-mid-run HTTP
  paths each need a paid run, and the report says so instead of implying coverage.

## Notes

- **The nine documented deviations** in `.claude/reports/build-operator-path-portal-drawer-report.md`
  were checked against the diff, all reproduce, and are treated as intentional decisions — not
  reported as findings. Deviation 1 is a better design than the plan's.
- **Severity reconciliation on High 1.** The two passes disagreed: one rated it Medium (local-only
  tool, damage git-recoverable, and the CSRF gap predates the PR on `/api/chat` and
  `/api/figma/pull`), the other Critical (security *and* data loss, zero-interaction trigger, every
  parameter publicly discoverable). Landed on **High**: the CSRF *class* is pre-existing, but
  `{...body}` into a function carrying a destructive `force` flag is new here — no route on `main`
  does that — and the fix is one line. Not Critical because the artifacts are committed, so `git
  checkout` restores them, and the portal is never deployed.
- **Also reconciled**: the clobbering finding was initially scoped to the slot `<select>` only. The
  second pass correctly found it applies to all ten radio handlers (`portal.js:420-425`), which is
  the broader and more important case — verified and merged into Medium 2 at the higher severity.
- **Checked, clean, no finding**: `withRunLock`'s timing (the check-and-set is synchronous with no
  intervening `await`; the `finally` releases on the throw path); `assertScenarioSlug` /
  `assertRunSlug` / `assertFictional`; `slugFor`'s scenario-prefix property (holds because
  `SCENARIO_RE` caps at 40 chars, always fitting inside the 48-char truncation); `validateAnswers`'s
  null-prototype lookup and frozen output.
- **The run lock is module-scoped**, so it does not span two portal processes or a concurrent CLI
  run. For a single local operator that is the right amount of machinery — noted only so the
  boundary is on the record.
- The PR body correctly carries `Closes #140`.
