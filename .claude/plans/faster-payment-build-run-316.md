# Feature: Run 1 — Faster Payment built on the canvas from its PRD (#316)

The following plan should be complete, but validate documentation and codebase patterns and task sanity before
you start implementing. Every `file:line` below was read on `origin/main` at **b2017a7** (#494) and audited line
by line by a second reader (NOTES §Pre-flight). The red list Segment A must clear is **observed**, not predicted:
a probe grew a scratch copy of the package through the real code paths and recorded every failure
(`.claude/plans/faster-payment-build-run-316-probe/`).

## Feature Description

The epic's hypothesis test. Faster Payment — add payee → Confirmation of Payee (CoP) → scam-safety stop → send —
is arranged on the canvas from `discovery/faster-payment/prd.md` (the #291 run's projected PRD; no stand-in is
needed) in one owner-driven sitting, with at least one part that reached the canvas by **import** from a
Brilliant element the owner did not draw for a test. The run appends to the committed build package
`discovery/faster-payment/build/` from seq 7; the imported part is ratified into the system in the same PR; the
numbers the PRD asks for are recorded, never judged.

The ticket is ~15% code and ~85% a real run. The code is what the run needs and does not have:

1. **Declared states.** CoP (match / close-match / no-match / unavailable) and send (pending / success / fail)
   cannot be recorded today — `state.add` refuses any key outside the five-key floor (`system/canvas-ops.mjs:348-349`).
2. **Gates that survive a real run.** Growing the package the way the run will turns **83 build-checks cases, 32
   canvas-journey and 3 ratify-journey assertions red** (observed), from five root causes.
3. **Provenance per part.** The PRD's "Supply" metric needs each part classified imported / admitted / composed;
   nothing derives it.
4. **A readiness gate** that says the sitting may start.

## User Story

As the portfolio owner
I want to build the Faster Payment flow on the canvas from its PRD, with the agent proposing screens and states
and me deciding every one, and with one part imported from a real Brilliant design
So that the epic's hypothesis is tested on a real flow and a reader can verify every screen traces to a recorded
op and every number came from the run.

## Problem Statement

Every build mechanism has landed (#302–#315); none has run for real end to end. Run 1 is the hypothesis's right
condition (`docs/epics/canvas-design-import.prd.md:70-80`). Four gaps block it (above). Three owner-drives
mechanisms the ticket exercises — D1 inbox (#319), D2 stale frames (#318), D5 forks (#320) — are open, with no
branch or PR yet (checked 2026-09-30).

## Solution Statement

Two segments around a WAIT and a STOP, mirroring #291's run plan
(`.claude/plans/discovery-faster-payment-run-291.md:172-178`).

| Segment | Who | Paid | Tasks | Gate before moving on |
|---|---|---|---|---|
| **A — harness** | agent | $0 | T1–T9 | build-checks green; **the probe re-run on a grown copy: 0 reds** (T8); PR A merged **before** #318 |
| **WAIT** | — | — | T10 | #318, #319, #320 merged over Segment A; `run-316-ready` down to 0 red checks |
| **STOP — the sitting** | **owner** | ~$0.8–4.1 | T11–T13 | `node tooling/run-316-ready.mjs` green before the first click |
| **B — readings** | agent | $0 | T14–T18 | pack regenerated, every gate green, report written |

**Merge order is part of the plan (R2):** Segment A lands first; #318 → #319 → #320 (their own dependency chain)
rebase over it. Segment A is additive and optional (`states`, `partProvenance`, the trace rule), so each of them
inherits it instead of Segment A chasing three moving targets.

**Two PRs** (A1 — owner to confirm): PR A carries Segment A and the plan, body `Refs #316`; PR B carries the run
package, the admission, its baselines, the report and the review, body `Closes #316`.

## Out of Scope / Non-Goals

- Not included: D1/D2/D5 mechanisms — #319/#318/#320 build them; this ticket exercises them.
- Not included: a re-declare path for states. The op count is final at fourteen; a wrong declaration is
  `frame.remove` + re-compose (refused while states exist, `canvas-ops.mjs:443`). Recorded as a known limit.
- Not included: replaying the run on `/factory` (AC #1).
- Not included: a CLI recorder for build runs — the portal UI is the only path (memory `owner-prefers-ui-over-cli`).
- Not included: a sealed pre-registration — nothing here is scored against the owner's unaided answer.
- Not included: a gate that `proposal.ratify` has a matching `system/specs/<component>.md` (the probe found none
  exists; T17 checks it by hand for this run; a follow-up ticket if the owner wants it gated).
- Not changing: the fourteen-verb grammar (`canvas-ops.mjs:63`), the fence (`canvas-session.mjs:190-230`), ratify's
  CHAIN (`portal/lib/ratify.mjs:56-68`), #493 (the container trap — avoided, T12 step 5).

## Feature Metadata

**Feature Type**: New Capability (the run) + Enhancement (declared states, provenance fold, gate reshape)
**Estimated Complexity**: High overall; Segment A Medium (~300–450 hand-written lines, most of them fixture fixes)
**Primary Systems Affected**: `system/canvas-ops.mjs`, `portal/lib/canvas-session.mjs`, `portal/lib/canvas-transport.mjs`, `portal/lib/canvas-store.mjs`, `portal/public/canvas.mjs`, `agent-layer/gen-build-handoff.mjs`, `tooling/build-checks.mjs`, `tooling/canvas-journey.mjs`, `tooling/ratify-journey.mjs`, `.claude/references/gates.md`, `discovery/faster-payment/build/`, `system/` (the admission)
**Dependencies**: `@anthropic-ai/claude-agent-sdk` (in `portal/`), the owner's Brilliant tab, the Claude subscription

## Related Work

**Implements**: #316 · **Epic**: #295 — `docs/epics/canvas-design-import.prd.md`, `docs/epics/canvas-design-import.architecture.md` (owner-drives addendum `:381-398`)

**Back-references**:
- `.claude/plans/discovery-faster-payment-run-291.md` — run-ticket precedent: segments, readiness script, paid table, failure modes, report layout.
- `.claude/plans/canvas-compose-loop-312.md` — the compose loop, fence, turn costs; sends the owner's read of a real turn to #316 (`:1083`).
- `.claude/plans/import-run-live-read-311-pr-b.md` — "recognition quality for drawn shapes is #316's to meet" (`:844`).
- `.claude/plans/ratify-write-gate-diff-313.md` — ratify, CLEAN_GUARD, the cascade (`:261-266`, `:855-861`, `:967-968`).
- `.claude/plans/variant-lanes-handoff-pack-314.md` — lanes, `missingStates` per lane, the pack.
- `.claude/plans/compose-and-name-groups-315.md` — the compose-vs-admit count is "first real" here (`:108`).

**Forward-references**: #318, #319, #320 rebase over PR A (T9 offers the note); #317 (epic close-out) reads the run report.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

`system/canvas-ops.mjs`
- `:63` OPS · `:84` PARAMS `screen.compose` · `:103` OPTIONAL · `:121` `VARIANT_KEY_RE` (`/^[a-z0-9][a-z0-9-]{0,23}$/`) · `:128-134` STATE_KEYS and "the enum is OPEN — a screen may declare more".
- `:309-333` `screen.compose` (D4 `why` refusal, the frame push).
- `:340-370` `state.add` — state-of-a-state `:346`, floor condition `:348`, its message `:349`, one-per-key `:356`.
- `:443` frame.remove refuses while states exist · `:486-487` `variant.add` key refusal · `:536` `component.propose` · `:564-586` `proposal.ratify`.
- `:758` `missingStates` (the `STATE_KEYS.filter` line is `:765`) · `:802` laneDoc · `:821` groupInstances · `:883` frameTree · `:1034` frameLabel · `:1065` stateDiagram.

`portal/lib/canvas-session.mjs`
- `:64` SCREEN_TOOL_DESCRIPTION · `:91` subscriptionEnv · `:134` promptFingerprint (hashes ROLE, LOOP, ESCAPE, TURN_ASK, STATE_ASK, BRIEF_LEAD and both tool descriptions).
- `:296` fileProposal's screen params (`:312` state params) · `:384-400` checkComposeRequest (state-ask floor check `:392`) · `:415` runComposeTurn · `:431-433` doc-aware missing check · `:474-495` the `stats` line, written on **every** exit path, `ok:false` + `error` on a failed turn.

`portal/lib/canvas-transport.mjs` — `:12` "decisionRefs IS REQUIRED AT THE TOOL" · `:39-42` SHAPES · `:98` real transport stamps `transport: "sdk"` · `:119` preflight copies the package.

`portal/lib/canvas-store.mjs` — `:62` saveBuild · `:87` loadBuild · `:141` foldLedger · `:181` arrangement · `:258` verifyBuild · `:346` listBuilds · `:379` loadDecisions · `:476-505` appendAgentLine.

`portal/public/canvas.mjs` — `:204`, `:210` missing-state ask chips (`missingOf`) · `:451-453` flow panel, "Every screen in this lane meets the floor." · `:605` `whatOf` · `:630-648` `proposalCard` (renders composition, Why, brief, refs — **not** declared states) · `:771` `split(":")` of `data-cv-ask-state`.

`agent-layer/gen-build-handoff.mjs` — `:65-74` compositionCount · `:76` renderFlow (composition lines `:79-82`, missing-states heading `:90`, empty line `:92`) · `:146-155` renderLineage · `:204-210` readBuildPackage (already has `transcript` = discovery's and `buildTranscript` = `build/transcript.jsonl`).

`tooling/build-checks.mjs`
- `canvas ops` group string `:12048`; STATE_KEYS pin `:11269`; missingStates cases `:11550-11566` (fixture title "five state" `:11563`).
- `build package`: `checkPackage` `:12107-12115` (owner-only assertion `:12110`), 36.3 mutation `:12148`, `scratchSpine` `:12240`, 36.6 import pin `:12205-12212`, `spinePos` `:12331`, 36.13 seed `:12398`, group string `:12469`.
- `import run` pkgCopy `:14395`; `jev screen` `:15260` (reads answers.jsonl only); `import suggest` `:15853`.
- `compose session`: pkgCopy `:16202-16203` (run.json + prd.md + `build/`), fullCopy `:16207` (whole package), scripted `inline` transport `:16213`, 47.2b fingerprint `:16258`, fake-transport assertion `:16332`, group string `:16648`.
- `build handoff`: 49.2 `:16851-16869`, 49.4 `:16887-16904` (header `:16873`), 49.11 `:16986`.
- `ratify`: PROPOSAL `pr1` `:17041`/`:17071`, groupPkg `:17451`.
- Unrelated local `arrangement` at `:3054` — do not confuse with the store's.

Drivers — `tooling/canvas-journey.mjs` `seed()` `:271-309`, ledger pins `:468-470`, `:515`, `:525`, `:543`, `:549`, `:716`, `:752-753`, `:766`, `:800` · `tooling/ratify-journey.mjs:133`, `:250-251`, `:362`, `:402` · `tooling/fake-compose-agent.mjs:55-58` (refuses a cwd outside `os.tmpdir()`), `:103` (`transport: "fake"`).

Readiness pattern — `tooling/run-1-ready.mjs` (142 lines): header `:1-27` with CANNOT REACH `:23-25`, helpers `:61-83`, `fail(n,msg)` `:86`, pre-run inversion `:126-128`, output `:134-142`.

Ratify and import — `portal/lib/ratify.mjs:36-37` (a fictional package "refuses `dirty` until its import is committed"), `:56-68` CHAIN, `:71-74` CLEAN_GUARD, `:678-686` `elapsed.ratify = at(proposal.ratify) − at(component.propose)` · `portal/lib/brilliant-mcp.mjs:39` TOOLS · `portal/lib/import-run.mjs:231` elapsed, `:236` unboundCount (records with `source.bound === false`), `:457-459` recognition compute time · `import/report.mjs:64`, `:120-140` (slot outcomes), `:307`, `:355` · `import/ir.mjs:50` GRAINS = component/screen.

Loc — `agent-layer/gen-loc-summary.mjs` GROUPS: runtime `^system/(wc/)?[^/]+\.(css|mjs|js)$`, pages, generators `^agent-layer/…`; `approach.html:291-298` renders runtime only; committed runtime ≈ 33,100 (33,093 counted) with 56 lines of rounding headroom.

Gate prose — `.claude/references/gates.md:59` (canvas ops), `:61` (build package), `:86` (compose session, names `9690d4c955be652c`), `:90` (build handoff).

### New Files to Create

- `tooling/run-316-ready.mjs` — the readiness gate.
- `.claude/reports/faster-payment-build-run-316-report.md` — the run report (Segment B).
- Generated by the run (never hand-written): `discovery/faster-payment/build/transcript.jsonl`, `imports/i*.{json,md,transcript.jsonl,reference.png,candidate.png}`, `proposals/<name>/`, `groups/g*.json`, the regenerated `handoff/`.
- Written by ratify (never by hand): `system/specs/<name>.md` and edits to `system/components.css`, `system/templates.admitted.mjs`, `system/palette.mjs`, `tooling/build-checks.mjs` (wrapper pin).

### Relevant Documentation

- `docs/epics/canvas-design-import.prd.md:53-58` (Assumptions — the four this run validates), `:70-80` (Hypothesis), `:170-181` (Success metrics), `:204` (Q9), MVP 4/11/12.
- `docs/epics/canvas-design-import.architecture.md:139-172` (data model), `:186-195` (fence, compose loop), `:226-229` (honesty), `:381-398` (D1–D5), `:407-414` (direct MCP client).
- `.claude/references/gates.md` — before touching any group.
- `.claude/reports/canvas-compose-loop-312-report.md:140-145` (on `origin/main`) — measured turn costs.
- `.claude/plans/faster-payment-build-run-316-probe/` — the observed red list (`S1e.txt` build-checks, `S2.txt` + ratify line, `S3.txt` open proposal, `cj.txt` canvas-journey, `rj2.txt` ratify-journey, `scratch-grow.mjs.txt` the grower, `probe-patches.diff.txt` the probe's three crash guards and its fake-agent bypass).

### Patterns to Follow

**Refusal naming the offender** (`canvas-ops.mjs:349`):
```js
throw new Error(`state.add: "${p.stateKey}" is not one of the required minimum ${STATE_KEYS.join(" · ")} — the enum is open, but a screen declares a state of its own before a frame can carry it`);
```

**Optional param, exact key set** (`:83-111`): the key goes in PARAMS AND OPTIONAL; an unknown key still throws.

**Optional package part** — `verifyBuild` checks `groups` only when the caller passes it. A new `buildTranscript` part follows the same rule, gated on `!== undefined` (see T6 for the null case).

**Build-checks case** — `ok(cond, message naming expected and got)`; every constructive call through the group's `fold()` so a throw becomes a named failure — the probe hit three uncaught throws that aborted the whole run (36.3 `:12148`, `ratify` `:17042`, 50.18 `:17497`).

**Readiness script** — MIRROR `tooling/run-1-ready.mjs`.

---

## IMPLEMENTATION PLAN

### Phase 1 (A): declared states — T1–T4
### Phase 2 (A): provenance per part — T5 · **Independent of:** Phase 1
### Phase 3 (A): gates survive a grown package — T6–T8 · **Independent of:** Phases 1–2; T8 runs last
### Phase 4 (A): readiness and PR — T9
### WAIT — T10
### Phase 5 (STOP): the sitting — T11–T13 — **owner's hands**
### Phase 6 (B): readings — T14–T18

---

## STEP-BY-STEP TASKS

### T1 UPDATE `system/canvas-ops.mjs` — declared states

- **IMPLEMENT**:
  - PARAMS `:84` → `["screenId","why","composition","decisionRefs","states"]`; OPTIONAL `:103` → `["decisionRefs","states"]`.
  - Export `STATE_KEY_RE = /^[a-z][a-z0-9-]{1,23}$/` beside `VARIANT_KEY_RE` (`:121`).
  - `screen.compose` (`:309`): if `p.states !== undefined`, refuse unless it is an array of strings, each matching `STATE_KEY_RE`, none in `STATE_KEYS`, no duplicates — each refusal names `screen.compose` and the key. Store `...(p.states?.length && { states: [...p.states] })` (an empty list stores nothing, so the spine's frames stay byte-identical).
  - `state.add` (`:348`): accept `STATE_KEYS.includes(k) || (Array.isArray(base.states) && base.states.includes(k))`. Keep the `:349` text (35.4 matches "weird" and "ideal") and append `or declared by "${base.id}" (${list or "none"})`.
  - `missingStates` (`:765`): filter `[...STATE_KEYS, ...(Array.isArray(base.states) ? base.states.filter((k) => typeof k === "string") : [])]`. **Declared states are required**: `missing` alone drives the ask chips (`canvas.mjs:204,210`), the pack line and the state-ask guard (`canvas-session.mjs:431-433`) — an allowed-but-unrequired key is never asked for, which is the thinning AC #2 forbids.
  - Header: "DECLARED STATES (#316)" paragraph beside the GROUPS one; `:133` → "a screen declares more at compose (`states`)"; say no re-declare path exists.
- **GOTCHA**: `frameTree`, `laneDoc`, `stateDiagram`, `frameLabel`, `variant.add` read only the frame's own `stateKey` (read). `laneDoc` passes frames through, so `base.states` survives a lane. Kebab keys contain no `:`, so `canvas.mjs:771`'s split is safe.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "canvas ops|^build"` → `build canvas ops ✓` (observed pre-change ✓).
- **SATISFIES**: AC #2.
- **REGENERATES**: `system/loc-summary.json` — `canvas-ops.mjs` is runtime; with T5 it adds ~80–150 lines against 56 lines of headroom, so expect 33,100 → 33,200. Decide by `node agent-layer/gen-loc-summary.mjs --check` **after staging** (memory `loc-summary-counts-tracked-only`); if it moves, T9's VR step applies.

### T2 UPDATE `portal/lib/canvas-session.mjs` + `portal/lib/canvas-transport.mjs`

- **IMPLEMENT**:
  - `:392`: shape check only — `STATE_KEYS.includes(k) || STATE_KEY_RE.test(k)`; the doc-aware check at `:431-433` refuses a key the base neither declares nor misses once `missingStates` changes.
  - `:296` fileProposal (screen): carry `...(a.states !== undefined && { states: a.states })`, or the agent's declaration is silently dropped.
  - `SCREEN_TOOL_DESCRIPTION` (`:64`): add "`states`: optional list of extra state keys this screen needs beyond the five-state floor, kebab-case (e.g. `close-match`) — declare only states the PRD names."
  - `canvas-transport.mjs:40`: `states: z.array(z.string()).optional()`. **Optional**: most screens have none, and a required field invites invented ones. Header observation 7 says so and names the fallback (T12 step 1).
- **GOTCHA (R5 — the prompt surface moves):** the description edit moves `promptFingerprint` (`:134`), pinned only at 47.2b (`build-checks.mjs:16258`, `9690d4c955be652c`, "the whole prompt surface probe run 4"). Re-pin to the new value and change the pin's message and `gates.md:86` to say the surface is **Segment A's, unprobed by a paid run**. The sitting's first turn is the first observation of it, and it is owner-watched anyway; T11's zero-token preflight (`preflight ✓ 8/8`) proves the tool schema lists `states`. No paid re-probe: it would cost ~$0.22 and prove only what the sitting's first turn proves.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "compose session|^build"` → ✓ after the re-pin; `cd portal && node lib/canvas-transport.mjs --preflight` → `preflight ✓ 8/8` (observed today).
- **SATISFIES**: AC #2.
- **REGENERATES**: none.

### T3 UPDATE `agent-layer/gen-build-handoff.mjs:90,92` + `portal/public/canvas.mjs`

- **IMPLEMENT**:
  - `:90` → `Missing states (the floor is ${STATE_KEYS.join(" · ")}, plus any state a screen declares):`; `:92` → "every screen in this lane has every state it requires".
  - `canvas.mjs:453` → the same wording as `:92`.
  - `canvas.mjs` `proposalCard` (`:630-648`): one line `States declared: close-match · no-match` when the proposal's params carry `states` (R6: the owner sees what they accept). textContent only, like its siblings.
- **VALIDATE**: `node agent-layer/gen-build-handoff.mjs` → `✓`; `grep -n "meets the floor" tooling/canvas-journey.mjs tooling/studio-journey.mjs` — update any pin it prints.
- **SATISFIES**: AC #2.
- **REGENERATES**: every committed `build/handoff/flow.md` — `node agent-layer/gen-build-handoff.mjs` (49.2 byte-equality).

### T4 ADD build-checks cases — `canvas ops` (35.18) and `compose session` (47.18)

- **IMPLEMENT** 35.18 through `fold()`: N1 compose `states:["close-match"]` → `missingStates` lists it; `state.add close-match` accepted; no longer listed. N2 a base declaring `close-match` refuses `no-match`; an undeclaring base refuses `close-match`. N3 refusals naming the key: non-array, non-string, `Close_Match`, `x`, 25 chars, duplicate, `error`. N4 `missingStates` over `states: "no"` / `[7]` answers an array. N5 `state.add` on the `close-match` frame refused as a state of a state. N6 a lane omitting the base reports none of its declared states; a non-omitting lane reports them. Positive control: an op with no `states` leaves no `states` key.
- **IMPLEMENT** 47.18 (scripted transport, spine seed from T7): 47.18a a declared key asked as a state turn files a proposal naming `close-match`; 47.18b a compose with `states` lands `params.states` deep-equal on the ledger line.
- **REDDENS**: N1 revert `:765` → "missingStates listed [...] — expected close-match" · N2 loosen `:348` to `STATE_KEY_RE.test(k)` → "…no-match… NO THROW" · N3 regex `/.+/` → `must name "Close_Match" — got NO THROW` · N4 `base.states.filter` → "must answer an array, never throw" · 47.18a keep `:392` → `stateKey "close-match" is not one of ideal · …` · 47.18b leave `:296` → `params.states` undefined.
- **UPDATE prose (three copies, memory `gate-prose-has-three-copies`)**: `canvas ops` string `:12048` + `gates.md:59` + fixture title `:11563` ("five state" → "the floor plus declared"); `compose session` string `:16648` + `gates.md:86`.
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓` (prerequisite `cd tooling/icons && npm ci`, else 41.7 reds for an environment reason — observed).
- **SATISFIES**: AC #2.
- **REGENERATES**: none.

### T5 ADD `partProvenance(doc)` — `system/canvas-ops.mjs` + `gen-build-handoff.mjs` + `build handoff` 49.12

- **IMPLEMENT**:
  - Beside `groupInstances` (`:821`), pure, derived, never stored, total over junk. Walk every place a part enters a frame: each base frame's composition, each state's `overrides.add` parts, each lane's `add` parts, and each group definition's parts (a `name:"group"` node yields its definition's parts with `via.groupId`). Per node with an id → `{frameId, partId, name, provenance, via}`: `name === "group"` → `composed` `{groupId, instanceId}`; name = a `status:"ratified"` proposal's `component` with `recordId` → `imported` `{proposalId, recordId}`; with `groupId` → `admitted` `{proposalId, groupId}`; else `vocabulary`.
  - The PRD's "hand-written" label is not derivable (`component.propose` requires exactly one of `recordId`/`groupId`, `:536`); the header says so and the report counts it as zero with that reason.
  - `renderLineage` (`:146-155`): frame rows gain `parts`; top level `partsByProvenance: {imported, admitted, composed, vocabulary}`.
  - `renderFlow` (`:79-82`): `- Parts by provenance: N imported · N admitted · N composed · N vocabulary` (zeros printed).
- **IMPLEMENT** 49.12: extend 49.11's synthetic `cOps` with a ratified import proposal and a frame node named its `component` → `imported`; the same component added only through `state.add`'s `override.add` → still `imported`; inside a group definition → `imported` with `via.groupId`; a group copy → `composed`.
- **REDDENS**: base-only walk → the override-added part reads nothing · rename the ratified `component` → `vocabulary` · delete the `proposal.ratify` → `vocabulary` · `recordId`→`groupId` → `admitted` · remove the `group.place` → `composed` 0 · hand-edit the committed `lineage.json` → 49.2.
- **GOTCHA**: 49.4 (`:16887-16904`) reads only `decisions`, `embodies`, `frames[].via` from the spine's frozen six lines — adding `parts` keeps it green. #318 also edits `renderLineage` (adds `seq`, `stale`): additive keys, rebase-safe.
- **UPDATE prose**: `build handoff` group string + `gates.md:90`.
- **VALIDATE**: `node agent-layer/gen-build-handoff.mjs && node tooling/build-checks.mjs 2>&1 | grep -E "build handoff|canvas ops|^build"`.
- **SATISFIES**: AC #3, AC #4.
- **REGENERATES**: every committed `build/handoff/{flow.md,lineage.json}` — `node agent-layer/gen-build-handoff.mjs`; loc (T1).

### T6 REFACTOR the committed-package gate — the trace rule

- **IMPLEMENT** (`portal/lib/canvas-store.mjs`):
  - `loadBuild` (`:87`) additionally returns `buildTranscript`: the parsed `build/transcript.jsonl`, or **`undefined` when the file is absent**, so every existing `verifyBuild(loadBuild(...))` caller on a transcript-free package is unaffected. Name it `buildTranscript`, matching `readBuildPackage` (`gen-build-handoff.mjs:204-210`), never `transcript` (which there means discovery's).
  - Export `traceFlaws(ops, buildTranscript)`; `verifyBuild({ops, canvas, groups, buildTranscript})` calls it only when `buildTranscript !== undefined`, **and always** flags an agent ledger line when `buildTranscript` is `undefined` (`source "agent" but the package has no build/transcript.jsonl`), so deleting the transcript cannot hide agent lines:
    - TR1 every `source:"agent"` ops line has exactly one transcript `{type:"op"}` line with the same `seq` (`ops.jsonl line N: source "agent" but build/transcript.jsonl has no op line for seq N`; a second → "more than one");
    - TR2 its `status` equals the ledger line's and its `tool` maps to the op (`screen_compose`↔`screen.compose`, `state_add`↔`state.add`);
    - TR3 every transcript op line with a non-null `seq` points at an agent ledger line (`transcript op seq N points at an owner line`);
    - TR4 every agent `refused` ledger line has a transcript `refused` line with that `seq`.
- **IMPLEMENT** (`tooling/build-checks.mjs:12107-12115`, `checkPackage`): replace the owner-only assertion (`:12110`) with `verifyBuild` over the loaded package including `buildTranscript`, AND for each agent line's turn the transcript holds a `turn` line, an `init` with a string `sessionId`, and a `stats` line whose `transport`, **when present, equals `"sdk"`** (`canvas-transport.mjs:98`). A failed or credit-out turn writes `stats {ok:false, error, outcome:"failed"}` possibly with no `transport` or `costUsd` (`canvas-session.mjs:474-495`) and must stay green — committed as-is under the no-edit rule.
- **REDDENS** — positive controls first: an in-memory spine6 + one agent `proposed` line + `[turn, init, op, stats{transport:"sdk"}]` → `[]`; the crash shape `stats{ok:false, error}` with no `transport` → `[]`.

  | Mutation | Fails naming |
  |---|---|
  | delete the transcript `op` for the agent seq | TR1, that seq |
  | duplicate it | "more than one" |
  | change its `status` | TR2, seq |
  | retarget its `seq` to 3 (owner) | TR3 + TR1 |
  | flip an owner line to `agent` | TR1 |
  | drop the agent-refused seq's `refused` line | TR4 |
  | delete `build/transcript.jsonl` while agent lines exist | "no build/transcript.jsonl" |
  | `stats.transport: "fake"` or `"inline"` | `checkPackage`, the turn id |
  | drop the turn's `init` or `stats` | `checkPackage`, the turn id |
- **UPDATE prose**: `build package` group string `:12469` ("every committed line owner because no agent ran" → the trace rule), the `checkPackage` comment above `:12107`, `gates.md:61`.
- **SATISFIES**: AC #1, AC #5.
- **REGENERATES**: none.

### T7 REFACTOR every fixture that seeds from the committed package — one spine seed

The probe's 83 + 32 + 3 reds reduce to five roots (observed, `probe/S1e.txt`, `cj.txt`, `rj2.txt`):

| Root | Where it reds (observed) |
|---|---|
| R-a owner-only source | 36.1, 36.10 |
| R-b next frame/group id assumed free (`f3`, `g1`) | 36.13 ×4, 47.12 ×13, 50.18 ×14, canvas-journey G1/G3/G8/C7 |
| R-c next import/proposal id assumed free (`i1`, `pr1`) and no `imports/` | 43.8 ×5, 43.12 ×8, 43.15 ×3, 46.8–46.10 ×5, 47.13, 50.6 ×2, 50.13, ratify-journey setup ×2 |
| R-d the committed `build/transcript.jsonl` copied into fixtures | 47.6, 47.7 ×5, 47.9, 47.10 ×8, 47.11, 47.17 F2/F3/F5/F6 |
| R-e ledger length / seq / committed-count pins | 49.11, 50.13b–d (a committed `proposal.ratify`), canvas-journey 4–9/L2–L8/C2/C5/X6, 36.10 (scratch dir name not a slug) |

- **IMPLEMENT**: one exported seed in `portal/lib/canvas-store.mjs` — `seedSpine(srcPkg, destPkg, {discovery = false} = {})`: copies `run.json` and `prd.md` (and, when `discovery`, `answers.jsonl` and the discovery `transcript.jsonl`, which `loadDecisions` needs), then writes `build/` via `saveBuild(destBuild, arrangement(foldLedger(spine).doc, positions), spine)` where `spine = ops.slice(0, 6)` of the source ledger and `positions` are the committed `canvas.json`'s positions for the nodes the spine derives (f1, f2, d7, d8). It imports only node built-ins and `canvas-ops.mjs` — 36.6's pin (`:12205-12212`) asserts exactly that — so build-checks and both drivers can import it. It never copies `build/transcript.jsonl`, `imports/`, `proposals/` or `groups/`.
- **Replace** (build-checks): `scratchSpine` `:12240` (name its temp dir `…/fp-spine` — a slug — or 36.10 reds on `provenance.run`), 36.13 seed `:12398` (its renamed copy `:12440` copies the seeded dir — leave it), `import run` `:14395`, `import suggest` `:15853`, `compose session` pkgCopy `:16202-16203` and fullCopy `:16207` (`discovery:true`), `ratify` `:17041` and groupPkg `:17451`. `:15260` reads `answers.jsonl` only — leave it. 36.11's local `spinePos` (`:12331`) stays; the seed reads positions from `canvas.json`.
- **Replace** (drivers): `tooling/canvas-journey.mjs` `seed()` (`:271-309`, `discovery:true` for the copies that carry `answers.jsonl`/transcript), `tooling/ratify-journey.mjs:402`; `portal/lib/canvas-transport.mjs:119` (preflight) too — PF3 filed "seq 15" on the grown copy (observed), so it seeds from the spine for a stable answer.
- **Fix** 49.11 (`:16986`): assert the zero-count line on the **spine6 render**, and assert the committed `flow.md`'s "Composed and named" line equals `compositionCount` of the committed fold.
- **Fix** 36.3 (`:12148`): guard `l.params &&` — an agent vocabulary refusal writes a params-less `refused` line and the mutation throws an uncaught TypeError that aborts build-checks (**observed**, `probe-patches.diff.txt`; the citation reader believed refused lines always carry params — the observation wins).
- **Fix** the two uncaught throws the probe hit in group `ratify` (`:17042` `ledger(null)`, `:17497` `join(pl, …)`): route them through `fold()` or null-guard them, so a failing fixture reports by name instead of aborting.
- **GOTCHA**: `saveRun` rewrites every existing group file's `provenance.run` with the package dir's name — a scratch dir that is not a slug reds `verifyBuild` (observed 36.10).
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓ all 50 groups pass`.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

### T8 PROVE it — re-run the probe on a grown copy (dry, $0, never committed)

- **IMPLEMENT**: in a disposable worktree under `os.tmpdir()` (`fake-compose-agent.mjs:55-58` refuses anywhere else; no Docker runs in this step, so `/private/tmp` is fine), with Segment A applied: copy `.claude/plans/faster-payment-build-run-316-probe/scratch-grow.mjs.txt` to `scratch-grow.mjs` and grow `discovery/faster-payment/build/` exactly as the probe did — three compose turns (accept, refuse, vocabulary refusal), an import of `spike-c-instance.blueprint.txt`, a `group.define` + `group.place`, then S2's `proposal.ratify` line and S3's open-then-closed proposal — placing f3 clear of f2 (e.g. x = 944; the probe's overlap caused canvas-journey 2 and 3b). Then `node agent-layer/gen-build-handoff.mjs`, build-checks, `canvas-journey chromium`, `ratify-journey chromium`, `--preflight`.
- **Expected**: canvas-journey and ratify-journey 0 failed; preflight 8/8; build-checks green **except** the one intended red — `checkPackage` names the grower's turns because their `stats.transport` is `"fake"` — the positive control that the trace rule reads the real thing. With S3's proposal left open, `compose session` stays green (observed 33 → 70 reds before the seed).
- **VALIDATE**: paste the four tails into NOTES §T8 result.
- **SATISFIES**: AC #1 — the gate holds on a real-shaped package before a real one exists.
- **REGENERATES**: none (scratch).

### T9 CREATE `tooling/run-316-ready.mjs`, validate, PR A

- **IMPLEMENT** — MIRROR `tooling/run-1-ready.mjs`. Checks read the **tree**, not the network:

  | # | Check | REDDENS |
  |---|---|---|
  | 1 | `discovery/faster-payment/prd.md` tracked and equal to HEAD | append a line |
  | 2 | #318 landed: `staleFrames` exported from `system/canvas-ops.mjs` | today: absent (observed) |
  | 3 | #319 landed: `portal/lib/inbox.mjs` exists | today: absent (observed) |
  | 4 | #320 landed: its alternatives param in `PARAMS["screen.compose"]` | today: absent (observed) |
  | 5 | `build/ops.jsonl` is exactly the 6-line spine and `verifyBuild` passes (pre-run inversion, `run-1-ready.mjs:126-128`) | append a 7th line |
  | 6 | tree clean by ratify's own `CLEAN_GUARD` (import it; both argv arrays print nothing) | `touch discovery/x` |
  | 7 | `brilliant-mcp.mjs` `TOOLS` deep-equals the four read tools | add `"create"` |
  | 8 | no `ANTHROPIC_*` / `CLAUDE_CODE_USE_*` in env or `portal/.env`; `subscriptionEnv({ANTHROPIC_API_KEY:"x"})` drops it | `export ANTHROPIC_API_KEY=x` |
  | 9 | `node_modules` present in `portal`, `tooling/icons`, `tooling/visual-regression`, `tooling/style-dictionary` (ratify's CHAIN runs gen-handoff → Style Dictionary and build-checks → 41.7 icons; failures observed without both) | rename any |
  | 10 | `cd portal && node lib/canvas-transport.mjs --preflight` exits 0 with `preflight ✓ 8/8` | remove `portal/node_modules` |
  | 11 | `node tooling/build-checks.mjs` prints `compose session ✓`, `import run ✓`, `build ✓` | break the deny predicate |
  | 12 | the worktree path is under `/Users`, not `/private/tmp` — the sitting's VR step needs Docker file sharing (memory `vr-gate-reads-working-tree`) | run from `/private/tmp` |

  Checks 2–4 name symbols that do not exist yet: T10 re-reads the merged diffs and fixes the names. CANNOT REACH (header): whether the imported element was drawn by the owner not for a test; whether the real SDK honours the fence (only the fake agent and preflight are provable at $0); who writes briefs and verdicts.
- **VALIDATE** (expected today): `node tooling/run-316-ready.mjs` → `run-316 ✗  check 2 — …`, exit 1. Drive every REDDENS row once; paste into NOTES.
- **Then**: the CI verify job locally — `node tooling/build-checks.mjs`, drift-check (`node --check` over tracked `.mjs` plus the generators' `--check`), `node tooling/token-lint.mjs`, portal smoke on a private port (`/api/health`); `node tooling/visual-regression/serve.mjs` on a private PORT/BASE (memory `stale-serve-wrong-tree`) + `canvas-journey all`, `ratify-journey all`, `studio-journey all` (three engines).
- **VR**: if T1's `gen-loc-summary --check` moved the runtime figure, from a **clean detached worktree under `/Users`** of the commit: `rm tooling/visual-regression/baselines/approach-{neutral,saulera,verdant}.png` (memory `loc-summary-baseline-cascade`), `cd tooling/visual-regression && npm ci && npm run update:docker`, copy back.
- **Commit + PR A**: `feat(canvas): declared states, part provenance and a gate that survives a real run — Run 1's harness (#316)`; body `Refs #316`; carries this plan and the probe directory (`.txt` only — memory `drift-check-syntax-checks-parked-mjs`). Offer (owner's yes) a comment on #318/#319/#320: "rebase over PR A; re-pin 47.2b over its fingerprint; re-run `node tooling/run-316-ready.mjs`".
- **VALIDATE**: `gh pr checks <N>` green after `headRefOid` equals local HEAD (memory `pr-head-lag-stale-checks`).
- **SATISFIES**: AC #1 (ordered preconditions).
- **REGENERATES**: `system/loc-summary.json` + approach ×3 baselines if moved; `tooling/*.mjs` is in no loc group (read), so the ready script moves nothing.

### T10 WAIT — #318, #319, #320 merged over PR A

Re-run NOTES §Pre-flight on the new `main` and amend (AMENDMENTS) before T11:
- #318's `{id, seq}` pin: `node tooling/build-checks.mjs` green means `seedSpine` still folds the spine; if #318 migrated the spine's `decisionRefs`, confirm it rewrote rather than appended (`wc -l discovery/faster-payment/build/ops.jsonl` → 6).
- #320's alternatives param beside `states` in PARAMS `:84`; 47.2b re-pinned by #320 over Segment A's value.
- #319's inbox rows include declared-but-missing states (it reads `missingStates`).
- Fix checks 2–4's symbol names in `run-316-ready.mjs` from the merged diffs; `node tooling/run-316-ready.mjs` → `✓`.

### T11 OWNER — prepare the sitting tree

A dedicated clean worktree of `main` **under `/Users`** (parallel sessions share the primary tree — memory `shared-worktree-parallel-sessions`; ratify needs a clean tree; VR needs Docker sharing). `npm ci` in `portal`, `tooling/icons`, `tooling/visual-regression`, `tooling/style-dictionary`; `git switch -c run/faster-payment-316`; confirm Console spend headroom (memory `api-usage-limit-until-2026-10-01`); `node tooling/run-316-ready.mjs` → `run-316 ready ✓  12 checks`. **Ready red → do not open the canvas.**

### T12 OWNER — the sitting (**owner's hands only; the agent writes none of this**)

`cd portal && npm start` → `http://localhost:4747/canvas.html?provenance=fictional&slug=faster-payment`. Compose turns back to back (5-min cache TTL, memory `discovery-run-cache-ttl-cost`); one run at a time on the machine.

1. **Screens** (3 agent turns; add-payee is the spine's owner screen): brief in `#cv-brief` (≤500 chars) → **Ask for a screen** → read the `why` and the "States declared" line → **Accept** / **Refuse**. At least one briefed turn (D3). If the CoP or send screen arrives without its declared states, refuse with a brief naming them (R5 fallback); the refusal and the retry are both recorded.
2. **States**: the `[data-cv-ask-state]` chips, accept/refuse each. Target: `missingStates` on lane A reads zero, or each remaining gap gets the owner's own reason, noted for the report.
3. **D5 fork** (#320's UI): one flagged-open decision → two lanes → pick one.
4. **D2** (#318's UI): re-record one decision in the discovery view → the frame flags → re-confirm.
5. **Import (R4 — avoid #493):** in Brilliant, pick an element **the owner did not draw for a test** that is a **leaf** (no nested repeated children: a row, a badge, a banner; not a list or a container). #493 fires only for an admission with `children: "many"` plus a text slot. If the ratify preview's planned spec shows `children: "many"`, stop and pick another element, or proceed knowingly and ask before paying for #493's re-pin. **Check binding** (Re-bind if stale — a 120 s timeout, not an error; memory `brilliant-mcp-binding`) → **Import selection** / **Browse the page** → side-by-side → mapping editor → **Measure fidelity**. Note the grain (static / interactive / data-bound) — the owner's annotation; the code's `grain` is component/screen only (`import/ir.mjs:50`).
6. Optional: compose-and-name (**Promote**) where a shape repeats.
7. **Mark the pause, then commit (R3):** **annotate** a note "commit pause before ratify" (an owner op, so its `at` is a server timestamp in the ledger) → **Write handoff pack** → commit `discovery/faster-payment/build/` (ratify's second CLEAN_GUARD call includes `discovery`, `ratify.mjs:71-74`; unavoidable) → return.
8. **Ratify**: **Preview the ratify** → **Ratify: write, run every gate, show the diff**. Red: leave the files, take the revert command, report it.
9. **Place the admitted part** on a frame: a compose or state turn whose brief names the new component.
10. **D1**: open `#/inbox`; clear it, or give each remaining row a reason for the report.
11. Resolve any open proposal (the run ends with none open); **Write handoff pack**; stop the portal.

**REGENERATES**: ratify's CHAIN (handoff, vocabulary, pack bundle/index, system-graph, import expected, import records, loc-summary, token-lint, build-checks); the pack button regenerates `build/handoff/`.

### T13 OWNER + agent — commit the run and the admission

- `node agent-layer/gen-build-handoff.mjs --check`, `node tooling/build-checks.mjs` → green; commit the package + ratify's `system/` writes (ratify commits nothing).
- VR from a **clean detached worktree under `/Users`** of that commit: `rm tooling/visual-regression/baselines/components-*.png` (memory `vr-update-skips-subperceptual`) and, if `system/loc-summary.json` moved, `rm …/approach-{neutral,saulera,verdant}.png`; `npm ci && npm run update:docker`; copy back; commit. Factory ×3: the system-graph panel renders on pick only (`factory.html:408`), so its at-rest baseline is expected unchanged — if update:docker rewrites it, name it in the report.
- **VALIDATE**: `build ✓`; `git status` clean apart from `.claude/`.
- **REGENERATES**: `/components` ×3; approach ×3 if loc moved.

### T14 READ the numbers (agent, $0) — AC #4

From the committed package only, **recorded, never judged**:
- **Elapsed per import**: (i) recognition compute, `elapsed.recognition` ms (`import-run.mjs:457-459` — machine time, not wall clock); (ii) propose → ratified, `elapsed.ratify` (`ratify.mjs:686`), split by the pause note's `at` into owner review (propose → note) and commit + gate chain (note → ratify), with the commit's author time as a cross-check inside the second span.
- **Unbound**: the count of records with `source.bound === false` (`import-run.mjs:236`) AND each record's slot outcomes (`report.mjs:120-140`) — both named, since they answer different questions.
- **Compose vs admit**: `compositionCount` (flow.md). **Parts by provenance**: `lineage.json`.
- **Eleventh primitive (Q9)**: any refused turn or owner reason naming a missing primitive (`transcript.jsonl` `refused` lines). **Unused primitives**: the ten (PRD MVP 4: button, card, dialog, nav, text field/dropdown, stack, text, list, icon, choice) against every composition's node names.
- **Cost**: sum `stats.costUsd` over distinct turns (memory `discovery-cost-baselines`); count failed turns separately.

### T15 CHECK traceability (agent) — AC #5
`verifyBuild` with `buildTranscript` green; every agent screen has an `accepted` owner verdict; add-payee reported as the spine's owner screen; no owner op labelled agent.

### T16 CHECK completeness (agent) — AC #2
`missingStates(doc)` on lane A → `[]`, or each gap with the owner's reason (their words; the agent does not write reasons).

### T17 CHECK the import record and the admission (agent) — AC #3
`drops[]` total; `fidelity.verdict` green/red/missing (missing reported as missing); the owner's grain note; no `component.propose` with `groupId` for a shape an import covered; the ratified `component` has `system/specs/<component>.md` on HEAD (no gate checks this — a probe finding).

### T18 CREATE the report + review + PR B (`Closes #316`)
`.claude/reports/faster-payment-build-run-316-report.md`, MIRROR `.claude/reports/discovery-faster-payment-run-291-report.md`: Summary · Verdict per AC · What ran · Cost read · The numbers (T14) · Where the flow was built (the Switch row's evidence) · Not run (with trackers). PR B: package + admission + baselines + report + review; `Closes #316`; piv-validate; `gh pr checks`.

---

## TESTING STRATEGY

### Unit Tests
build-checks groups `canvas ops` (declared states, provenance fold), `build package` (trace rule, spine seed), `compose session` (state ask, fileProposal), `build handoff` (pack, 49.11, 49.12) — no suite exists; build-checks is the gate.

### Integration Tests
`canvas-journey`, `ratify-journey`, `studio-journey` ×3 engines; T8's grown-package re-probe.

### Edge Cases
- A declared key colliding with the floor (`error`) — refused.
- A declared state on a lane that omits the base — not reported.
- A params-less agent `refused` line — 36.3 does not throw (the observed crash, fixed).
- A crashed or credit-out turn (`stats{ok:false}`, no transport) — green; a `fake`/`inline` transport — red.
- The run ends with an open proposal — T12 step 11 closes it; the seed keeps fixtures independent of it.
- A committed `proposal.ratify` — `ratify` 50.13b–d seed from the spine, so no longer assume none is committed.
- Credit out mid-sitting — SDK `success` + `is_error` (memory `sdk-error-result-wears-success`); the turn records `ok:false`; resume in the same package; never edit lines.
- Stale Brilliant binding — Re-bind.

### Proving the checks
Every added check has a REDDENS row and a positive control: T4 (a declaration-free op leaves the frame unchanged), T5 (49.12's synthetic ratified import), T6 (spine6 + one sdk turn → `[]`; the crash shape → `[]`), T8 (the probe's 118 observed reds → 0, with the `fake` transport as the intended red), T9 (today's tree reds check 2).

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
- `node --check <file>` for every edited `.mjs`; `node tooling/token-lint.mjs`.
- Prerequisite in any fresh worktree: `npm ci` in `portal`, `tooling/icons`, `tooling/visual-regression`, `tooling/style-dictionary` (failures observed without each).

### Level 2: The gate
- `node tooling/build-checks.mjs` → `build ✓ all 50 groups pass` (observed at b2017a7 with icons installed).
- `node agent-layer/gen-build-handoff.mjs --check` · `node agent-layer/gen-loc-summary.mjs --check` after staging.

### Level 3: Integration
- `PORT=<free> node tooling/visual-regression/serve.mjs &` then `node tooling/canvas-journey.mjs all`, `node tooling/ratify-journey.mjs all`, `node tooling/studio-journey.mjs all`; kill only `$!` (memory `portal-smoke-port-scoped-kill`).
- `cd portal && node lib/canvas-transport.mjs --preflight` → `preflight ✓ 8/8` (observed).

### Level 4: Manual
- The sitting (T12). Portal smoke: `/api/health` on a private port.

### Level 5: Additional
- T8's grown-package re-probe. `node tooling/run-316-ready.mjs` — red on check 2 today (expected), green before T12.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| T12 compose/state turns (3 screens + 6 declared + up to 16 floor states) | $0.82 low (9 × $0.091) · $1.40 mid (9 × $0.155) · $4.09 high (3 × $0.2202 + 22 × $0.1538 + 3 escapes ≈ $0.05). Derived from `.claude/reports/canvas-compose-loop-312-report.md:140-145`; the fork turn is unmeasured | PR B yes; PR A no | #316 stays open |
| T12 briefs, verdicts, fork pick, re-confirm, inbox, gap reasons | owner's hand | PR B yes | #316 stays open — never drafted by the agent (memory `honesty-contract-mirror-direction`) |
| T12 the Brilliant leaf element not drawn for a test | owner's hand, $0 per import | PR B yes | AC #3 NOT MET, reported |
| T12 grain annotation | owner's hand | PR B yes | reported as not recorded |
| #493 re-pin, only if a container is admitted anyway | paid (Jev) | stop and ask | #493 |
| T9/T13 VR update:docker | Docker, $0, ~2 min each | yes (their PR) | — |
| Console spend headroom | owner check | — | — |

---

## ACCEPTANCE CRITERIA

- [ ] AC #1 — the run package committed under `discovery/faster-payment/build/` with `ops.jsonl`, `canvas.json`, `transcript.jsonl`, `groups/` (if any), `imports/`, `proposals/`, the generated pack; `verifyBuild` with the trace rule green; `/factory` untouched: no replay added (`git diff --stat main -- factory.html` empty; nothing under `factory.html`, `system/*.mjs`, `agent-layer/*.mjs` reads `faster-payment/build` — observed empty at b2017a7); any factory pixel change is ratify's system-graph cascade, named.
- [ ] AC #2 — `missingStates` reads `[]` on lane A, or every gap named with the owner's reason; CoP and send states declared, not mapped onto the floor.
- [ ] AC #3 — ≥1 part with `provenance: imported` on a frame (`lineage.json` `partsByProvenance.imported ≥ 1`); its record shows `drops[]` and a measured or honestly `missing` fidelity block; no by-hand admission of a shape an import covered.
- [ ] AC #4 — elapsed per import (both spans), unbound (both readings), compose-vs-admit, eleventh primitive and unused primitives recorded, not judged.
- [ ] AC #5 — every agent-proposed screen traces to a recorded op; add-payee named as the owner's.
- [ ] Segment A: build-checks, canvas/ratify/studio journeys green; T8 re-probe 0 reds bar the intended one; every REDDENS driven once.

## COMPLETION CHECKLIST

- [ ] T1–T9 done, PR A merged before #318
- [ ] T10 satisfied, plan amended, ready green
- [ ] T11–T13 done by the owner, committed with baselines
- [ ] T14–T18 done, PR B open with `Closes #316`

---

## RISKS AND HOW EACH IS CLOSED

| # | Risk | Closed by | Residual |
|---|---|---|---|
| R1 | The run's commit reds CI across six groups and two drivers | **Observed** list (118 reds, five roots) → T6/T7 fix each root → T8 re-runs the same grower and must read 0 | none once T8 is green |
| R2 | #318/#320 edit the same PARAMS line, `renderLineage` and the fingerprint pin | Merge order: PR A first, the three rebase over it (additive keys); T9 offers the rebase note; T10 re-checks with commands | a rebase conflict is theirs to resolve on an additive base — mechanical |
| R3 | Ratify's clean-tree guard forces a mid-sitting commit inside `elapsed.ratify` | Unavoidable (`ratify.mjs:71-74` includes `discovery`); timed by an owner `annotate` note's server `at`; T14 reports both spans | none — the number is split, not estimated |
| R4 | A container admission triggers #493 (paid re-pin) | T12 step 5: pick a leaf; stop at the preview if the spec shows `children:"many"` | only if the owner chooses a container knowingly |
| R5 | The tool-description edit changes the prompt surface a paid probe observed | Re-pin with the provenance stated; preflight proves the schema at $0; the sitting's first turn is the owner-watched observation; refuse-and-brief fallback | the first CoP turn may omit `states` — recoverable in-run and reported |
| R6 | The owner cannot see declared states before accepting | T3 adds "States declared" to the proposal card | none |
| R7 | Environment gaps abort the ratify chain (Style Dictionary, icons) | Ready check 9 requires all four `node_modules` | none |
| R8 | Uncaught throws in build-checks hide later reds | T7 routes the three observed throws through `fold()`/guards | none |

## OPEN QUESTIONS / ASSUMPTIONS

- **A1 — two PRs (owner to confirm).** CLAUDE.md puts a ticket's plan, report and review in one PR; under A1 the plan ships in PR A, the report and review in PR B. One PR instead means Segment A's branch waits for the sitting and R2's merge order inverts (Segment A rebases over #318–#320).
- **A2 — `states` optional at the tool** (R5).
- **A3 — declared states are required** by `missingStates`.
- **A4 — "hand-written" provenance is not derivable**; reported as zero with the reason.

## NOTES (open canvas)

### Pre-flight (2026-09-30, `origin/main` b2017a7)

Ran (observed):
- `node tooling/build-checks.mjs` in a fresh worktree with icons installed → `build ✓ all 50 groups pass`. Without `tooling/icons` → 41.7 red (environment).
- `node lib/canvas-transport.mjs --preflight` → `preflight ✓ 8/8`, sdk 0.1.77, node v20.20.2.
- #318/#319/#320: `staleFrames` 0 hits, `portal/lib/inbox.mjs` absent, no alternatives param; all OPEN, no comments, no branch or PR.
- **Grown-package probe** (`probe/`): `scratch-grow.mjs` grew the package to 14 ledger lines and 18 transcript lines (three fake-agent turns, an import, a group define + place). Build-checks → **83 failures**: `build package` 8, `import run` 17, `import suggest` 5, `compose session` 33, `build handoff` 1, `ratify` 19. canvas-journey chromium 152 passed / 32 failed; ratify-journey 14 / 3; preflight 8/8. Adding a committed `proposal.ratify` → 86 (three more in `ratify` 50.13b–d). Leaving a proposal open → 120 (all in `compose session`). The probe needed three crash guards and a fake-agent cwd bypass to reach the later groups (`probe-patches.diff.txt`).
- Citation audit: ten corrections applied — `VARIANT_KEY_RE` `:121`; propose `:536` / ratify `:564-586`; fileProposal `:296`; CHAIN `:56-68`; `ratify.mjs:36-37`; renderFlow `:76`/`:79-82`; 49.4 `:16887-16904`; report `:140-145`; PRD `:53-58`; and the fake agent stamps `transport: "fake"` (`fake-compose-agent.mjs:103`), not `"inline"` (build-checks' scripted transport, `:16213`) — so the trace rule requires `"sdk"` when present.
- Resolved: `tooling/*.mjs` is in no loc group; `canvas-ops.mjs` is runtime, so T1+T5 likely move the approach figure (56 lines of headroom); `gen-system-graph` does not read `canvas-ops.mjs`; factory's system-graph panel is off at rest; `run-2-ready.mjs`'s fingerprint is discovery's, not the compose one; 47.2b is the only asserted copy of `9690d4c955be652c`; `34ffc82` landed on `main` as `eb58d54 … (#449) (#451)`.
- Conflict resolved in favour of observation: the citation reader said agent `refused` lines always carry params; the probe produced a params-less one and crashed 36.3 — T7 guards it.

### T8 result (2026-09-30, Segment A at dd1b982, observed)

A detached worktree under `os.tmpdir()` grew `discovery/faster-payment/build/` with
`probe/scratch-grow-t8.mjs.txt` (the probe's grower with three fixes, below): three compose turns (accepted,
state refused, vocabulary refusal), a Mode 1 import of `spike-c-instance.blueprint.txt`, `group.define` +
`group.place`, `proposal.ratify pr1`, a drag of f2 and d7 (positions only), an open proposal, then its
acceptance and a drag of f4 — 17 ledger lines, four agent turns.

- `node tooling/build-checks.mjs`, proposal open and again closed → `build ✗ 4 failure(s)`, all four the intended red:
  `faster-payment: turn c1…c4: stats.transport "fake" — a committed agent line comes from the real SDK transport only`.
  50 groups printed; no uncaught throw.
- The scratch transcript's `transport` stamped `"sdk"` (scratch only, simulating a real run) →
  `build ✓ all 50 groups pass`; `ratify-journey chromium` → `✓ 44 assertions`.
- `canvas-journey chromium` → `188 passed, 0 failed` (first run: 1 failed, `2 · f3×f4` — the grower placed f4 on
  f3, fixed by the f4 drag; second run: 1 failed, `G2 · build/groups/g1.json exists` — a pre-existing race, below;
  third run green).
- `cd portal && node lib/canvas-transport.mjs --preflight` → `preflight ✓ 8/8`.
- `node tooling/run-316-ready.mjs` there → red on 2, 3, 4, 5 (17 lines), 6 (dirty) and 12 (a tmpdir path), green on
  the rest with `ANTHROPIC_API_KEY` unset.

Grower fixes: new frames placed right of every node (the probe's `236 * index` put f3 on f2); a positions-only
`drag` stage; the import run as Mode 1 (S2 ratifies pr1, and a Mode 2 proposal cannot be ratified). The fake's
`assertCwd` refuses any cwd inside its own repo, so the scratch worktree needed the probe's `PROBE_ALLOW` bypass
again (applied there only, never committed).

### Why confidence is 10 for Segment A
Every task in Segment A either edits a line read and audited this session, or fixes a red that was **observed**. Its done-condition is mechanical: the same grower that produced 118 reds must produce 0, bar the intended `fake` red. An implementer who meets T8 cannot have missed a fixture, because T8 is the fixture census.

### What confidence cannot cover
The sitting depends on three unmerged tickets and on the owner's choices. The plan turns that into procedure: T10's commands, T11's ready gate and T12's stop rules. It cannot promise the outcome of a real run; a metric the run misses is reported, not re-run (#291's rule).

### Alternatives weighed
- **Lanes per CoP outcome** — rejected by the owner (lanes are A/B alternatives, G33).
- **A fresh slug** — rejected (duplicates the PRD; G22).
- **Exempt faster-payment from 36.1** — rejected: a check that cannot fail (memory `check-that-cannot-fail`).
- **Fix each fixture's id literals instead of one seed** — rejected: ~40 edits that re-break on the next run; one seed makes fixtures independent of the committed package for good.

## AMENDMENTS

- 2026-09-30 (implementation, Segment A) — plan errors found while implementing: (1) T8 said a worktree under
  `os.tmpdir()` satisfies `fake-compose-agent.mjs`'s cwd guard; it does not — the guard also refuses any path inside
  the repo the fake lives in, so T8 still needs the probe's bypass in the scratch tree. (2) T7's R-e list missed 36.8
  and 36.10, which took `n0` from the committed ledger while writing to a seeded scratch copy; T8 crashed 36.8 on a
  `JSON.parse` of an empty tail. Both now read the seed's length. (3) The T8 grower's `verdict()` restarts its
  x-counter per call, so a second accepted screen lands on the first; T8 moved it with a drag. (4) T2 said the
  preflight proves the tool schema lists `states`; PF1 checked `required` only, so PF1 now also pins the property list.
- 2026-09-30 — plan revised after a grown-package probe (observed red list), a line-by-line citation audit and an open-items pass: added T3 (card, floor wording), T7 (one spine seed), T8 (re-probe as the done-condition), ready checks 9 and 12, the R1–R8 table, merge order and the pause marker; corrected ten citations and the trace rule's transport value.
