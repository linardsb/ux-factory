# Code review — PR #224 · Studio 1: incremental build recorder + replay artifact (#203)

**Verdict: REQUEST CHANGES** — one High finding in the security-fence code. Nothing here is
exploitable today; the High is a real asymmetry in a file whose whole job is being a fence, and it
should be closed before `parseOpCommand` gets reused anywhere with wider tool access (#209 will
import from this module).

**Reviewed by**: the `code-reviewer` agent as the clean-context pass, plus an independent
adversarial probe of the command grammar. Every finding below was **reproduced by running the
code**, not by reading it. Checked against the report's six documented deviations — none of the
findings is one of them.

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ all 11 groups pass |
| same, `portal/node_modules` moved away (SDK-free invariant) | ✓ all 11 groups pass |
| `node tooling/drift-check.mjs` | ✓ through `· traces · replay` |
| `node tooling/validate-trace.mjs` | ✓ 22 traces incl. the new pair |
| `gen-replay --check` · `gen-loc-summary --check` | ✓ no drift |
| generator determinism (two runs, md5) | ✓ byte-identical |
| CI `verify` / `visual` | ✓ pass · mergeStateStatus **CLEAN** |

A red suite would be a finding; this one is green.

## Findings

### High

**1 · `parseOpCommand`'s script-path check is a suffix match, not an identity match**
`system/board-ops.mjs:270`

```js
if (t[1] !== SCRIPT && !t[1].endsWith(`/${SCRIPT}`)) throw ...
```

Any path *ending with* `/tooling/board-op.mjs` passes. Reproduced:

```
ACCEPTED script path: /tmp/evil/tooling/board-op.mjs
ACCEPTED script path: ../../../../tmp/x/tooling/board-op.mjs
```

This contradicts the file's own claim ("the only build tool is `tooling/board-op.mjs`") — it
verifies a filename suffix, not that the invoked file *is* the real one. The asymmetry is the
tell: the boardPath check three lines later does an exact `path.resolve` identity comparison, and
that rigor is what makes the traversal and expansion tricks fail safe. The script check doesn't get
the same treatment.

**Not exploitable today**: `Write`/`Edit` are denied outright so the agent cannot create a decoy,
and there is exactly one `tooling/board-op.mjs` tracked in the repo (verified). It is a latent gap,
not a live hole.

**Fix** — follow the pattern the file already states for boardPath ("the caller decides… this only
parses"): return the script path from `parseOpCommand`, and have each caller resolve it against its
own canonical location and require exact equality — `makeFence` against the run's root,
`gen-replay` against `ROOT/tooling/board-op.mjs`. The committed trace re-projects unchanged under
that rule (its typed path is `tooling/board-op.mjs`, and `resolve(ROOT, …)` matches).

### Medium

**2 · The metacharacter denylist misses brace/bracket expansion** — `system/board-ops.mjs:239`

```js
const META = /['"`$\\;|&<>()*?~\n]/;   // no { } [ ]
```

The tokenizer's model of the command diverges from what a real shell does. Reproduced:

```
shell sees:      ["replay/foo.board.json","replay/bar.board.json","{\"op\":\"x\"}"]
tokenizer sees:  { kind: "validate", boardPath: "replay/{foo,bar}.board.json" }
```

Three argv items where the tokenizer assumed two. It **fails safe today**, but only as a side
effect of a *different* check — expansion changes the literal string, so the exact boardPath
identity comparison rejects it. The safety is incidental rather than something this file delivers.
A denylist is permanently incomplete for a fence; **an allowlist for bare tokens**
(`/^[A-Za-z0-9_.\/-]+$/`) makes the invariant true by construction. Verified that the committed
trace's three bare tokens all satisfy that allowlist, so it is a non-breaking tightening.

**3 · `replay/README.md` states a rule the code does not implement** — `replay/README.md:77`

> Ops come from **successful implement-phase op calls only**.

`projectTrace` does not filter on phase — it projects every successful op call and records
`phase` verbatim. Reproduced: synthetic rows with one `implement` and one `validate` op call
project to **2 ops**, phases `implement,validate`.

The **code is right and the sentence is wrong**, which is why this is worth fixing rather than
shrugging at: `PIV_BUILD_SYSTEM` explicitly instructs the agent to *"fix the board with further ops
inside this phase"* if the validate command fails, so the first run that self-corrects late will
produce validate-phase ops and make the README's contract sentence false. On an artifact whose
entire purpose is stating honestly what it is, its own contract doc should not overclaim. One-line
fix: "Ops come from successful op calls in any phase (each op records the phase it ran in); a
`--validate` invocation is not an op…".

**4 · A label containing an apostrophe can never be built, and nothing warns the agent**
`system/board-ops.mjs:252`

`tokenize()` requires nothing follow a closing single quote, which cannot represent bash's
`'…'\''…'` escaping. So `{"params":{"label":"Manager's Office"}}` quoted the way `buildTask`
instructs is always denied. It **fails safe**, but neither `PIV_BUILD_SYSTEM` nor `buildTask` tells
the agent to avoid apostrophes — and possessives are ordinary product copy, so a plausible brief
burns a denial + retry cycle for no reason. Cheapest fix is one clause in the task prompt; the
alternative is extending the grammar to accept the escaped form.

### Low

**5 · `checkOp` validates `params` keys exactly but not the op envelope's own extra keys**
`system/board-ops.mjs:86-98`

`{"op":"place.add","params":{"label":"x"},"extra":"anything"}` is accepted and `extra` silently
ignored. Inconsistent with the "exact, not minimal" philosophy the file states one level down
(report deviation #3), which was simply not extended to the envelope. Confirmed no prototype
pollution via `__proto__` — `JSON.parse` makes it an inert own property and only `params` reaches
the artifact.

**6 · A board path containing a space breaks the CLI** — `tooling/board-op.mjs:41`

`runBoardOp` re-joins argv into a string and re-parses it. A path with a space tokenizes into extra
arguments:

```
board-op ✗  expected exactly `node tooling/board-op.mjs <board.json> '<op json>'` (got 6 argument(s))
```

Harmless in this checkout (the repo path and macOS `mkdtemp` scratch dirs have no spaces) but it is
a "works here, breaks there" trap — and this repo already documents space-in-path as a live hazard
(the `pathToFileURL` comments in every generator). Worth a comment naming the constraint at
minimum.

## What is genuinely well done

- **The shared-parser design is right, and the committed trace proves it working.** The raw trace
  shows the fence denying three real model attempts — a 3-arg `ls -la`, a `Glob` (which proves the
  `PreToolUse` fail-closed hook is the actual enforcement, not the SDK's `tools` option, exactly as
  the code comments claim), and `ls … 2>/dev/null` caught by the metachar rule. Observed, not
  theoretical.
- **The boardPath check is done correctly** — exact `path.resolve` identity, not a prefix or
  substring test. Verified: `../../../../etc/passwd` and `/etc/passwd` both parse and are both
  denied, in `--dry` (absolute, scratch cwd) and real (relative, cwd=repo) modes alike. This is the
  single property most of the fence's safety rests on, and it is the one that was got right.
- **Group 11's corrupted-label mutation** (`build-checks.mjs:1338-1347`) is exactly the discipline
  the repo's own `check-that-cannot-fail` memory demands — it proves the reproduce check is not
  comparing the producer against itself. Four source mutations were run against the group and each
  produced a distinct, specific failure.
- **`gen-replay.mjs`** is deterministic, copies every `source` value from the curated meta rather
  than computing it, refuses on every path it claims to, and its two-directional discovery closes
  the orphaned-artifact hole (verified red by moving the board away).
- **The honesty framing is carried in the artifact itself**, not only in prose — the `label`, the
  `$description`, and the `source` block pointing at the trace pair.

## Explicitly not an issue

The committed trace's meta line carries an absolute, username-revealing `cwd`. This is
`trace-recorder.mjs`'s pre-existing behaviour, identical in every previously committed trace, and
untouched by this PR. `record-build.mjs`'s "no absolute paths" claim is about the *task prompt's*
file references, which it does keep relative on a real run. No contradiction introduced here —
worth a separate ticket if it matters, not a change to this PR.

## Recommendation

**Request changes**, but narrowly: fix **#1** (the fence asymmetry) and **#3** (the README
overclaim, which is an honesty-contract surface). **#2** is a strongly-recommended hardening in the
same edit. **#4–#6** are fine to defer.

None of this touches the spike's result, the recorded run, or the generated artifact — the fixes
are to the parser's strictness and one documentation sentence, so no re-run and no regeneration is
implied.
