# Review — PR #354: the read fence (#287)

**Head** `81ad34ed5ac7dace95e57f3fa1cbd688e6c4639d` · **Base** `main` @ `7ec618fc0a35a158f8ad79159b5d1e2ce406ba42`
· **Round** 1 (no prior report — the guarantees pass does not apply) · **State** OPEN, MERGEABLE, CLEAN,
`verify` + `visual` both pass

**Recommendation: approve.** Two Medium findings, zero High or Critical. Both are small; F1 wants a
decision from you before merge, F2 is one line.

Reviewed commit `81ad34e` only. `0470dca` and `9a4117f` belong to PR #351 and are reviewed there.

## Summary

One pure predicate (`allowsPath`) over a per-run allow-set built from `run.json`, called through one
decision (`fenceDecision`) from two SDK sites — `fenceHooks`' `PreToolUse` and the new
`fenceCanUseTool` — both failing closed, every denial a `denied` line carrying `via`. The design is
right and the evidence behind it is the strongest this repo has produced for a fence: three paid
one-shot turns showing each site holding **alone**, which is the only way to observe the property,
since the hook runs first and masks `canUseTool` under the production wiring.

The predicate itself was attacked empirically — traversal, absolute paths, null bytes,
percent-encoding, backslashes, Unicode-confusable dots, type confusion, prefix-siblings — and holds
against all of them. `path.resolve` normalises before the prefix check, and the `entry + path.sep`
guard refuses `<root>-evil/x`. `READ_TOOLS`' completeness is a non-issue by construction: the only
allow branches are op-tool names and `READ_TOOLS` keys, so an incomplete table can over-restrict but
never bypass. `Grep`'s unchecked `glob` field is a content filter scoped to the already-checked
`path`, not a second path.

## Issues

### F1 — Medium · the fence trace goes blind for exactly the calls it exists to prove happened

`portal/lib/discovery.mjs:332–352, 406–413` (`fenceSite`'s `trace()`/`deny()`, and the `PreToolUse` handler)

`trace()` fires only from inside `deny()`. The `PreToolUse` allow branch (`if (d.allow) return {
continue: true }`) returns before `deny()` is ever reached. Before this ticket every built-in was
decided by name, so a warmup call was always denied and therefore always traced. Now `Read`, `Grep`
and `Glob` go through `allowsPath`, and every real run's allow-set contains its own root — so a
warmup call scoped to the cwd resolves to **allow** and leaves **no trace line at all**.

**Reproduced** against the shipped `fenceHooks` with the exact fence shape `runDiscoveryTurn` builds
for a real run (`mainTools: []`, `allowSetFor({ root, reads: [] })`), driving the four calls the
file's own header names as the CLI Explore warmup's (`pwd`, `ls`, `find`, Glob on the cwd):

```
Glob   -> {"continue":true}
Grep   -> {"continue":true}
Read   -> {"continue":true}
Bash   -> {"hookSpecificOutput":{... "permissionDecision":"deny" ...}}

trace lines: 1
  {"ts":"…","turn":"t1","event":"PreToolUse.deny","tool":"Bash","recorded":false}
transcript lines: 0
```

`transcript.jsonl` is genuinely untouched, so the persisted package really is byte-identical. The
instrument is not.

**Why it is a finding and not a note.** `portal/lib/discovery.mjs:326–327` states the trace's whole
rationale: *"a recording with zero built-in `denied` lines proves nothing if the warmup happened to be
quiet, and the unrecorded denials here are what show the warmup DID call tools."* That sentence is now
false for three of the four tools it was written about. An operator arming the trace on a future
recording and seeing few or no lines would read "the warmup was quiet" — the exact misreading the
instrument was built to prevent. It also stales the README's worked verify-criterion at
`discovery/README.md:358–361` ("sixteen warmup denials across five turns"), which is no longer
reproducible on a fresh recording.

**No group 30 case covers it.** Case 22 owns the trace but calls `fenceHooks(traceRoot, "t1", () => {})`
with **no opts** — under no allow-set every path tool fails closed, so it can never reach the allow
branch, and its three inputs (`Bash`, a foreign `mcp__`, an op tool) include no path tool at all. Case
25's `mainTools: []` block probes a path *outside* the root. The gap is untested, not just unwritten.

**Two resolutions, your call:**

- **(a) Document it.** One sentence in `discovery/README.md` §The read fence and a correction to the
  header comment at `discovery.mjs:326–327`: the trace captures denials only, so an allowed in-root
  built-in leaves no evidence it ran. Cheapest, and honest — it narrows what a future recording can
  prove rather than pretending otherwise.
- **(b) Trace both branches.** Move `trace()` out of `deny()` so it fires on the decision, not the
  refusal. Note this is **not** a one-liner: case 22 asserts `t.length === 2` for "two denials and one
  allowed call", and that assertion inverts under (b), so the case moves with the change.

I lean (a) — the trace is an operator-armed diagnostic and tracing every allowed call makes it noisy
during a real run — but (b) is the one that keeps the header's claim true, and the header is the
specification here.

### F2 — Medium · the cwd ↔ allow-set coupling has no tripwire

`portal/lib/discovery.mjs:216` · `portal/lib/discovery-transport.mjs:157`

`fenceDecision` substitutes `'.'` for a path-less `Grep`/`Glob` and `allowsPath` resolves it against
the **allow-set root**. That is correct only while the SDK's `cwd` *is* the run root. The transport
sets `cwd: root` today and the docblock states the coupling ("the cwd is the run root") — but
`fenceDecision` is pure and cannot see `cwd`, and case 12 pins four transport facts about the fence
without pinning that one.

**Failure scenario:** a later ticket sets `cwd: REPO_DIR` (plausible — run 2 must reach
`docs/epics/fixtures/`). A path-less `Glob` is then allowed over the whole repo, reaching
`docs/epics/discovery-partner.prd.md` — the exact run-2 key this fence exists to hide. Every
assertion in group 30 stays green, because none of them can see `cwd`.

Nothing is broken at this HEAD. One line in case 12, beside the four pins already there:

```js
ok(/cwd:\s*root\b/.test(transportSrc), "case 12: the query's cwd must be the run root — fenceDecision substitutes '.' for a path-less Grep/Glob and resolves it against the ALLOW-SET root, so a cwd that is not the run root silently widens the fence (#287)");
```

### F3 — Low · `reads` is the trust boundary and the prose does not say so

`discovery/README.md` §run.json · `portal/lib/discovery.mjs:188`

`allowSetFor` accepts `reads` entries as absolute paths anywhere on the filesystem — `reads: ['/etc']`
is accepted and `/etc` becomes a legitimate allowed root. This is **documented intent** ("paths,
repo-relative or absolute") and a real-provenance run genuinely needs absolute paths into `JOBS_DIR`,
so a containment check would be the unrequested flexibility `CLAUDE.md` warns against. The agent has
no path to influence `reads` either — set once at `openSession`, never mutated, no op verb touches it,
the drawer does not send it yet. Fine as built.

The gap is the prose: "a run may read its own package, the bank and what its `run.json` names in
`reads`, **nothing else**" reads as if the allow-set were self-contained. One sentence saying the fence
bounds the *agent*, not whoever opens the session, would stop a future reader mistaking `reads` for a
sandboxed field.

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `build ✓ all 32 groups pass` (observed, re-run on the PR head) |
| mutation — `allowsPath` sep dropped (`abs.startsWith(a)`) | ✅ **2** failures, restored green (observed — re-derived, not taken from the report) |
| mutation — `allowsPath` allows everything (`hit = paths[0]`) | ✅ **23** failures, restored green (observed — re-derived) |
| `node tooling/drift-check.mjs` | ✅ twelve checks (observed) |
| `cd portal && node lib/discovery-transport.mjs --preflight` | ✅ 8 rows, zero tokens (observed) |
| adversarial battery against `allowsPath` / `fenceDecision` / `allowSetFor` | ✅ no bypass (observed — traversal, absolute, null byte, `%`-encoding, backslash, Unicode confusables, type confusion, prefix-sibling) |
| F1 reproduction against the shipped `fenceHooks` | ❌ confirmed blind (observed, output above) |
| GitHub `verify` / `visual` | ✅ pass |
| `--probe-fence` | not re-run (paid); the committed stdout + trace re-read and checked instead |
| portal smoke on 4751 | not re-run by the reviewer — see Notes |

### The numbers pass

Every figure in the PR body and the report was checked against the run that produced it.

- **$0.398 / three turns** — observed. Sums from the committed stdout: `0.1346115 + 0.1344054 +
  0.1291353 = 0.3982`. Durations (20.5 s / 22.0 s / 18.8 s) and "5 SDK turns each" match the same file.
- **$0.442 (first run) and $0.840 total** — observed. `0.19119415 + 0.131431 + 0.11957305 = 0.4422`;
  `0.442 + 0.398 = 0.840`.
- **Mutation counts 2 and 23** — re-derived, not re-checked as arithmetic. Both mutations were applied
  to `portal/lib/discovery.mjs` on this head, `build-checks` re-run, and the tree restored clean. The
  counts land exactly.
- **"twelve-input battery"** — derived; counted in case 25's `battery` array. Twelve.
- **"eight guards" before `mkdirSync`** — verified: case 16's regex covers `bad · selectDepth ·
  assertRunSlug · assertProvenanceRoot · allowSetFor`, and `allowSetFor` sits before `mkdirSync` in
  `openSession`.
- **"all 32 groups"**, **"8 rows"**, **"twelve checks"** — each observed from its own run above.
- **F3's report claim that `denyReason` is outside the posture fingerprint** — verified directly rather
  than inferred from a green group 32: `fingerprintOf` hashes `[model, systemPrompt, prompt,
  TOOL_DESCRIPTIONS]` and nothing else. No fixture is stale.
- **Attribution check.** The report credits the probe with observing the permission fast path. The
  experiment does isolate it: `canUseTool` was reached for the fixture and the bank (outside the cwd)
  in all three turns and never once for `answers.jsonl` (inside it). The credited mechanism is the one
  the run distinguishes.
- **The one claim that did not survive re-derivation** is the trace's, and it is F1. Its digits were
  never wrong; the sentence around them stopped being true.

No figure sits under the wrong provenance heading.

## Plan and report

Six ACs, each mapping to code that landed and to a gate case read in full. M1–M13 all present. D1–D5
are documented deviations — intentional decisions, not issues — and each is carried into the PR body,
so the reviewer's copy and the author's agree. Q1–Q5 likewise. No undocumented divergence found.

D1 deserves calling out as a positive: the first probe run reported `FAILED` on a bug in the probe's
own positive control, and both runs are committed with the failure explained. A probe that mis-reads
its own evidence is exactly the thing this repo has been burned by, and keeping the bad run is the
right instinct.

## What is good

- **Each site observed holding alone.** The hook runs before the permission flow, so under production
  wiring a `canUseTool` denial can never be seen. Splitting the probe into hook-only / canUseTool-only
  / both is the only experiment that can distinguish them, and it was run rather than argued. The
  committed stdout also shows an allow from site 1 does *not* short-circuit site 2 — turn A's allow-all
  `canUseTool` was reached for the same two calls `PreToolUse` had already passed.
- **The gate would fail if the predicate stopped working.** Both mutations go red by name, and case 25
  drives the two sites against each other on a twelve-input battery in *decision and reason*, so a
  drift between them fails rather than passing quietly. Case 24's hostile-allow-set throw is a positive
  control for case 25's `try/catch` — the catch is proven to be catching something.
- **`WebSearch`/`WebFetch` proven independent of the allow-set**, under four different sets, decided by
  the name gate's text. That keeps MVP 7's look-it-up path out of reach of a later path tightening, and
  it fails by name if someone routes a web tool through `allowsPath`.
- **Fail-closed is real, not asserted.** Junk in either argument denies rather than throws; both sites
  turn a throwing allow-set into a denial that says "fail closed"; a run with no allow-set fails every
  path tool closed while op tools still pass.
- **One implementation, no drift surface.** `openSession` and the transport call the identical
  `allowSetFor`; `fenceDecision` has exactly two callers; case 12 pins the transport to hand one fence
  object to both sites and to rebuild the allow-set from `run.json`.
- **The `denied` line's `via` is deliberately kept off the SSE wire.** `turnEvent`'s whitelist says a
  new transcript field must not start streaming by default, and this one doesn't. That is the invariant
  being honoured, not an omission.
- **Legacy packages are left alone.** `spine-meridian-1`, `instrument-loans-1` and `bracket-trace-1`
  carry `denied` lines with no `via`; nothing reads the field on load, so none needed editing.

## Notes

- **Merge PR #351 first.** Two of the three commits in this diff are its, and `fenceSite` builds
  directly on #349's record gate. The diff shrinks when #351 lands.
- **`deniedLine`'s `via` throw sits outside `fenceSite`'s try/catch**, but all three call sites pass a
  hardcoded `FENCE_SITES` literal, so it cannot fire on any reachable path. Left alone deliberately —
  "no error handling for impossible scenarios".
- **The portal smoke was not re-run.** It is the one "observed" line in the PR body with no committed
  artifact. The residual risk is low — the `server.mjs` change is three lines, case 16 gates a junk
  `reads` refused by name, case 12 gates the allow-set coming from `run.json` — and re-running costs
  more than it buys given D5's `pkill -f 'node server.mjs'` already may have killed a sibling session's
  recorder. Flagged as unverified rather than accepted silently.
- **This review file needs committing to the branch** — `CLAUDE.md` puts a ticket's plan, report and
  review in the same PR, and only the first two are in the diff.

## Recommendation

**Approve.** No critical or high issues. Every gate green, both mutation figures re-derived rather than
trusted, the plan matched with no undocumented divergence, and the predicate survived an adversarial
battery. F1 needs a decision — document the narrowed instrument, or make it trace both branches — and
F2 is a one-line pin. Either can land here or on the follow-up ticket.
