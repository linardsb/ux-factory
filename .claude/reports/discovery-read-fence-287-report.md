# Report — #287: the read fence — one per-run allow-list predicate, two call sites, failing closed

**Plan** `.claude/plans/discovery-read-fence-287.md` · **Branch** `feat/287-read-fence` off PR #351's
head `9a4117f` (worktree `../ux-factory-wt-287`) · **Status** COMPLETE

## Summary

The fence in `portal/lib/discovery.mjs` was a tool-name allow-list with `canUseTool` holding an inline
copy of it. It is now one predicate — `allowsPath` over a per-run allow-set built from `run.json`
(the package, `discovery/bank.mjs`, and what `reads` names) — called through one decision
(`fenceDecision`) from two sites, `fenceHooks`' `PreToolUse` and the new `fenceCanUseTool`, both
denying on a throw or on a missing allow-set. Every denial is a `denied` transcript line carrying
`via`. Real runs still advertise no built-in tool (`tools: []`, now `MAIN_TOOLS`); the fence is wired
and gated for the day the run-2 ticket widens it, and a paid probe shows each site holding alone.

## Tasks completed

- M1–M4 → `portal/lib/discovery.mjs` (UPDATE): `BANK_PATH`, `READ_TOOLS`, `FENCE_SITES`, `allowSetFor`,
  `allowsPath`, `fenceDecision`; `deniedLine` requires `via`; the shared `fenceSite` (fail-closed
  `decide`, the record gate widened by `mainTools`, the trace with the site in its event);
  `fenceCanUseTool`; `fenceHooks(root, turn, onLine, opts)`; `openSession` takes and stores `reads`,
  validated before `mkdirSync`; invariant 5 in the header; `denyReason`'s text corrected.
- M5 → `portal/server.mjs` (UPDATE): `reads: b.reads ?? []`, named.
- M6–M7 → `portal/lib/discovery-transport.mjs` (UPDATE): `MAIN_TOOLS`, one `fence` object to both
  sites, the inline `canUseTool` removed, `probeFence()` + `--probe-fence`.
- M8–M12 → `tooling/build-checks.mjs` (UPDATE): case 10 (`via`), case 12 (four transport pins),
  case 16 (`reads` refused; `allowSetFor` in the guard-order pin, eight guards), case 20 (Glob's
  reason), new cases 23 (predicate, both run shapes), 24 (`fenceDecision`, AC #5/#6), 25 (both
  sites); the index and the summary clause.
- M13 → `discovery/README.md` (UPDATE): the `denied` rule, `via` in §File shapes, `reads` in
  §run.json, §The read fence (#287) with the observation, the Workflow line.
  `.claude/references/gates.md` (UPDATE): group 30's entry and a fence-probe paragraph.
- Evidence → `.claude/reports/discovery-read-fence-287/` (CREATE): the probe's stdout and fence
  trace, plus the first run's pair.

## The probe (observed, 2026-09-01, SDK 0.1.77)

`cd portal && DISCOVERY_FENCE_TRACE=… node lib/discovery-transport.mjs --probe-fence` → **`BOTH_SITES_HOLD`**,
exit 0, **$0.398** over three one-shot turns (5 SDK turns each; 20.5 s, 22.0 s, 18.8 s). Nonce `67ac2aac`.

| turn | wiring | fixture | bank | KEY | own package | `canUseTool` reached for |
|---|---|---|---|---|---|---|
| A | hook only, allow-all `canUseTool` | read ok | read ok | **DENIED via `PreToolUse`** | read ok | fixture, bank |
| B | `canUseTool` only, no hooks | read ok | read ok | **DENIED via `canUseTool`** | read ok | fixture, bank, KEY |
| C | both — the production wiring | read ok | read ok | **DENIED via `PreToolUse`** | read ok | fixture, bank |

"Denied" is read off the SDK's own `tool_result.is_error`; "read ok" off the nonce in the result; the
`via` off the transcript's `denied` line; "reached" off the probe's own counters around each site
function. The fence trace (`probe-fence.trace.jsonl`) holds exactly three lines: `PreToolUse.deny`,
`canUseTool.deny`, `PreToolUse.deny`, all `recorded: true`.

Two facts this settles that no CI group could:

- **The permission fast path is real, and it is the in-cwd read.** In turns A and C the allow-all /
  real `canUseTool` was reached for the fixture and the bank (outside the cwd) and never for
  `answers.jsonl` (inside it). A key inside the agent's cwd — run 1's `decisions.json` under
  `JOBS_DIR`, if a run were ever rooted there — would pass `canUseTool` unasked. The hook is the site
  that sees every call.
- **`canUseTool` is consulted for an out-of-cwd read**, so site 2 holds alone too (turn B). Q4 in the
  plan is answered: no `HOOK_ONLY_HOLDS`.

## The mutation (observed)

- `allowsPath` with the separator dropped (`abs.startsWith(a)`): group 30 red, **2** assertions —
  `<root>-evil/x` and "the bank entry admits bank.mjs and nothing beside it".
- `allowsPath` allowing everything (`hit = paths[0]`): group 30 red, **23** assertions by name, run 1's
  key and run 2's key among them.
- Restored: `build ✓ all 32 groups pass`.

## Validation results

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `build ✓ all 32 groups pass` (observed, final tree) |
| the two predicate mutations | ❌ 2 and 23 failures, restored to green (observed) |
| `cd portal && node lib/discovery-transport.mjs --preflight` | ✅ 8 rows, zero tokens (observed, after the transport edit) |
| `cd portal && … --probe-fence` | ✅ `BOTH_SITES_HOLD`, $0.398 (observed) |
| `node tooling/drift-check.mjs` | ✅ all twelve checks (observed; `loc-summary` counts `system/`, pages and `agent-layer/` only, so no regen) |
| portal on 4751 | ✅ `/api/health` carries `bootSha 9a4117f`; `POST /api/discovery/session` with `reads` → `run.json.reads` holds it; resume returns it; `reads: "nope"` refused by name; scratch package removed (observed) |
| visual regression | not run — no shipped page touched; `portal/` is never deployed |

Paid: $0.442 (first probe run, `FAILED` on a probe bug) + $0.398 = **$0.840** (observed, summed
from the probe's own cost lines).

## Deviations from the plan

**D1 — the probe's first run reported `FAILED` with the fence holding identically.** The positive
control checked the nonce on a 160-character print excerpt of the tool result, and the package's
nonce sits at the end of a JSON line. Fixed to check the whole result (`result.nonce`), re-run. Both
runs are committed beside this report; the first is evidence about the probe, not the fence.

**D2 — case 23's "absolute or repo-relative" assertion was wrong as planned.** A relative path
resolves against the run root (the SDK's cwd), never the repo — the repo-relative spelling of the
fixture is allowed only because it lands *under the package*. The case now pins that rule, which is
also why `reads` is resolved against `REPO_DIR` at build time rather than at read time.

**D3 — case 25's trace read guards `existsSync`.** Under the allow-everything mutation nothing was
denied, nothing was traced, and the gate died on ENOENT instead of failing by name. A check must
fail by name.

**D4 — no HTML build brief** (the owner's standing rule; the markdown plan is the artefact).

**D5 — a `pkill -f 'node server.mjs'` ran at ~16:51** during the first smoke attempt, after a stale
process on 4750 answered `404`. It matched any portal process on this Mac; whether one belonging to
another session died is not observed. The smoke test was re-done on 4751 with a PID-scoped kill.

## Findings

**F1 — the fast path, observed.** See "The probe": an in-cwd read never reaches `canUseTool`. Not a
defect — the architecture's premise for the second site, now a measurement rather than a citation.

**F2 — the CLI appends a `<system-reminder>` to a `Read` result** (visible in every "read ok"
excerpt). Harmless here; noted because a future probe that compares a result byte-for-byte will
meet it.

**F3 — `denyReason`'s old text was false since #284** ("no read tools") and is corrected; the
posture fingerprint does not cover it (README §The parenting fixture lists the deny text as outside
the hash), so nothing moved and no fixture is stale.

**F4 — #285 is still OPEN** and #287 lists it as a dependency. No function overlaps; only the file.

## Issues encountered

The worktree needed `portal/node_modules` and `tooling/style-dictionary/node_modules`; both are
symlinked to the main worktree's and excluded via `.git/info/exclude` (a symlink is not matched by
`.gitignore`'s `node_modules/`).
