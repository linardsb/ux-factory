# Feature: decisions have blast radius — stale frames until the owner re-confirms (#318, D2)

The following plan should be complete, but validate documentation, codebase patterns and task sanity before you
start implementing. Every citation below was resolved against `origin/main` at `694ab91` on 2026-10-01 (NOTES §Pre-flight).

## Feature Description

A frame on the build canvas already pins the decisions it embodies by transcript seq (`decisionRefs: ["7","8"]`).
Discovery already records that a later banked answer to the same question replaces an earlier one
(`supersedes: 7` on the new transcript line). Nothing joins the two. A decision can change under a screen built on
it and no screen says so.

This ticket adds one pure read, `staleFrames(doc, transcript)`, in `system/canvas-ops.mjs`. It reports every frame
whose pinned seq has since been superseded (**stale**) or names no decision at all (**dangling**). It shows the
result in four places: the frame (a chip plus a one-click Re-confirm), the decision card, the flow panel's
completeness list, and the handoff pack (`lineage.json` gains `seq` and `stale`; `flow.md` gains a "Decisions
changed since linked" section). Re-confirm is the existing `frame.link` op re-pinning the frame to the head of the
supersede chain. No new op, nothing stored, no auto-propagation.

## User Story

As the owner building a flow from a discovery PRD,
I want every screen built on a decision I have since changed to say so until I re-confirm or re-link it,
so that the prototype and the handoff pack never quietly embody a decision that no longer holds.

## Problem Statement

`frame.decisionRefs` points at one version of a decision, which is correct. But no surface compares that version
with the transcript's supersede chain, so a re-recorded decision leaves its screens looking current. `lineage.json`
then states a frame → decision link a stakeholder will read as live when it is not.

## Solution Statement

- **The pin is the seq string, unchanged.** Owner's call, 2026-10-01 (Q1 below): the op shape stays
  `decisionRefs: string[]`, where each string is a transcript seq. The architecture's `{id, seq}` is DERIVED where
  it is read: `seq` is `Number(ref)`, the version identity; the decision's cross-version identity is its
  `question_id`, which the transcript already carries. No ledger migration, no tool-schema change.
- **Stale is derived, never stored.** `staleFrames` folds the run's `record_decision` records (`{seq, supersedes}`)
  into a successor map and walks each pinned ref to the chain head. It is pure, total over junk, and needs no new
  import (group 35.9 pins the import graph to `device-presets.mjs`).
- **Re-confirm is `frame.link`.** `reconfirmRefs(frame, rows)` maps each stale ref to its head and dedupes. The page
  emits the existing `ui.frame-link`, so the change is one ledger line, one undo entry and one announcement through
  the existing consumer (`portal/public/canvas.mjs:956-961`).
- **The reverse index already exists.** The decision card has shown "Embodied by: …" since #306
  (`portal/public/canvas.mjs:313-327`). This ticket adds the superseded line to the card and the journey assertion
  for AC #4. It adds no second implementation.

## Out of Scope / Non-Goals

- Not included: **re-recording a decision through the discovery drawer.** A closed session refuses turns
  (`portal/lib/discovery.mjs:1117`), `faster-payment` is closed, and the drawer has no scripted-agent seam. The
  journey seeds the superseding line with the REAL discovery applier into a scratch copy (Q2, owner's call).
  Re-opening a closed run, or a `UXF_DISCOVERY_TRANSPORT` fake, is a follow-up ticket (Task 9.1).
- Not included: the inbox row (#319). This ticket exports the read #319 will fold. It builds no row.
- Not included: the agent proposing a re-link (G13). The compose prompt is untouched.
- Not changing: `discovery/ops.mjs`, its op lock, or any discovery reader. The supersede rule landed with #281/#289
  (`discovery/ops.mjs:427-441`) and is proven by group 28.6a (`tooling/build-checks.mjs:6778-6783`).
- Not changing: the `frame.link` / `screen.compose` PARAMS, `canvas-transport.mjs`'s zod schema, `saveRun`'s
  ref check (a link to a superseded seq stays legal: it is honest and reads stale at once), `arrangement`'s `d<seq>`
  node ids, any committed `ops.jsonl`.
- Not changing: `missingStates` or `stateDiagram`. Stale is a separate list beside them, not a field inside them.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium (~350–500 lines, most in build-checks and the journey)
**Primary Systems Affected**: `system/canvas-ops.mjs`, `portal/lib/canvas-store.mjs` (`loadDecisions`),
`portal/public/canvas.mjs` + `portal.css`, `agent-layer/gen-build-handoff.mjs`, `tooling/build-checks.mjs`,
`tooling/canvas-journey.mjs`
**Dependencies**: none new

## Related Work

**Implements**: #318 (`Closes #318`) · **Epic**: #295, `docs/epics/canvas-design-import.architecture.md`
§ Addendum 2026-08-28, row **D2** (line 391)

**Back-references**:

- `.claude/plans/canvas-page-run-list-arrangement-ops-306.md`: `frame.link` replaces the list, so one verb is link,
  unlink and re-confirm (`system/canvas-ops.mjs:470-471` says so). The decision card and `placeDecision` come from here.
- `.claude/plans/variant-lanes-handoff-pack-314.md` (via `.claude/reports/variant-lanes-handoff-pack-314-report.md`):
  `lineage.json`, `flow.md`, `renderPack`, group 49.
- `.claude/plans/faster-payment-build-run-316*.md`: `seedSpine`, the frozen six-line spine 49.4–49.7 read, and
  the loc-headroom precedent (`partProvenance` kept out of `canvas-ops.mjs` to avoid an approach regen).

**Forward-references**:

- #319 (inbox) reads `staleFrames` for its "stale frames" rows.
- Follow-up from Task 9.1: re-record a decision from the discovery view (a closed-run path or a fake transport).

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `system/canvas-ops.mjs:1-60` (header, conventions) · `:468-485` (`frame.link`: replaces the list, string refs,
  refuses blanks and duplicates) · `:735-742` (the pure-read rules: total over junk, a read is not a verb) ·
  `:767-789` (`missingStates`, the list-not-count shape to mirror) · `:960-980` (`placeDecision`, how a new card is
  positioned on both sides).
- `discovery/ops.mjs:40-45` (invariant 4's supersede sentence) · `:427-441` (the rule: banked, same `question_id`,
  `findLast` past off-script) · `:231-288` (`ledgerView`: `supersededBy`, `latest`, the cross-reader for 35.19).
- `discovery/README.md:190-199` (§Supersede; the sentence "The projection and the canvas read the latest" becomes
  false and is corrected in Task 8.2).
- `portal/lib/canvas-store.mjs:450-473` (`loadDecisions`: `id = String(seq)`, no `seq`/`supersedes` today) ·
  `:194-241` (`decisionRefsOf`, `arrangement`: cards `d<ref>`, `embodies` edges) · `:581-609` (`saveRun`'s
  frame.link check: refs must be in the transcript; superseded ones are) · `:135-145` (`seedSpine`).
- `portal/public/canvas.mjs:129-133` (`decisionOf`, `refsInOrder`) · `:180-212` (`frameParts`, chips, missing
  buttons, `frameSig`) · `:311-344` (`cardParts`, `placeCard`) · `:408-444` (`reconcile`) · `:448-454`
  (`renderFlow`, the completeness list) · `:512-522` (`applyOwnerOp`) · `:771-776` (the delegated
  `[data-cv-ask-state]` click listener: the pattern for `[data-cv-reconfirm]`) · `:830-847` (inspector decision
  checkboxes) · `:956-961` (`ui.frame-link` consumer) · `:1048` (`decisions = run.decisions`).
- `portal/public/portal.css:307-312` (`.cv-chips`, `.cv-chip`, `.cv-chip-none`).
- `portal/server.mjs:473` (`/api/canvas/run` spreads every `loadDecisions` field to the page, so no server change).
- `agent-layer/gen-build-handoff.mjs:118-146` (`renderFlow`) · `:186-222` (`LINEAGE_DESCRIPTION`,
  `renderLineage`: `bySeq` over op lines, `unresolved-decision`, `via`) · `:227-238` (`renderPack`).
- `tooling/build-checks.mjs:273` (discovery ops imported at top level as `applyDiscoveryOp`, `applyDiscoveryOps`,
  `ledgerView`) · `:11249-11258` (group 35's block opening: the destructured import, `deep`, `threw`) ·
  `:11631-11643` (35.11: a small read case to mirror) · `:12048` (35.18, the last 35 case) · `:12098` (group 35's
  `group()` detail string) · `:12356-12371` (36.9) · `:12458-12464` (36.12: `loadDecisions` field assertions) ·
  `:12590` (group 36's detail) · `:16975-17053` (group 49's block: `render`, `read`, `spine6`, 49.4's lineage
  assertions) · `:17209` (group 49's detail).
- `tooling/canvas-journey.mjs:1-117` (header: every pass is described there) · `:266-286` (`seed()`, `DISC()`,
  the scratch copies) · `:287-295` (`buildDir`, `ledger`, `waitLines`) · `:346-362` (`leg`, `t`, `step`) ·
  `:432-447` (step 5: linking by keyboard and the announcement text) · `:620-655` (where the passes are called) ·
  `:768-783` (`seedGroups`: the in-process seed precedent).
- `.claude/references/gates.md:59,61,90,141` (the group 35, 36, 49 and canvas-journey paragraphs).

### New Files to Create

None. Every change goes into an existing file.

### Relevant Documentation

- `docs/epics/canvas-design-import.architecture.md:391` (D2), `:103-150` (§ Data model).
- `discovery/README.md:190-199` (§Supersede), `:370-390` (the transcript op line shape: `seq, turn, op, params,
  closes, flagged, supersedes`).
- No external library is involved.

### Patterns to Follow

**A pure read** (`missingStates`, `canvas-ops.mjs:775-789`): total over junk, it answers a list of the cases that
need action, and an empty list means checked and clean.

**Flagged, never dropped** (`gen-build-handoff.mjs:18`, `resolve` at `canvas-ops.mjs:746-749`): a broken
reference keeps its row and carries a flag.

**One bus verb per gesture** (`canvas.mjs:771-776` + `:956-961`): a button emits a `ui.*` action through `bus.emit`,
and the existing consumer applies the op, pushes one pending line and announces.

**The scratch-copy seed** (`canvas-journey.mjs:768-783`): a journey writes to its own `seedSpine` copy under the
scratch `JOBS_DIR`, never to `discovery/`. `git status -- discovery/` is compared across the pass.

**Error/naming**: plain strings in `canvas.say(...)`, every package string via `textContent` (canvas.mjs call 4).

---

## IMPLEMENTATION PLAN

### Phase 1: The read (canvas-ops)

`staleFrames` and `reconfirmRefs` in `system/canvas-ops.mjs`. **Exactly 31 added lines (33,142, 7 under the flip), pasted verbatim** (NOTES §Loc).

### Phase 2: The data the page needs (canvas-store)

`loadDecisions` rows gain `seq` (integer) and `supersedes` (integer | null).
**Independent of:** Phase 1.

### Phase 3: The pack (gen-build-handoff) + regen

**Depends on:** Phase 1.

### Phase 4: The page (canvas.mjs + portal.css)

**Depends on:** Phases 1, 2.
**Independent of:** Phase 3.

### Phase 5: The gates (build-checks 35.19, 36.15, 49.13)

**Depends on:** Phases 1–3.

### Phase 6: The journey (pass B)

**Depends on:** Phases 1–4.

### Phase 7: Generated-output cascade

**Depends on:** every code change being committed or staged (gen-loc reads `git ls-files` content).

### Phase 8: Docs and gate prose

### Phase 9: Follow-up ticket + validation

---

## STEP-BY-STEP TASKS

Branch first. Parallel sessions share this working directory, so verify the branch immediately before every commit
and stage by explicit path:
`git fetch origin && git switch -c feat/decision-blast-radius-318 origin/main`.
**Step 0 (mandatory, every worktree): `(cd tooling/icons && npm ci) && (cd portal && npm ci)`.** Then run
`node tooling/build-checks.mjs 2>&1 | tail -1` and expect `build ✓  all 50 groups pass` BEFORE touching code. Without
the icons install, group 41 reds for an environmental reason (observed in pre-flight:
`tooling/icons/node_modules/@phosphor-icons/core/assets/regular is missing`). A red baseline after the install means
`main` moved: stop and read it before building on it. This closes R3.

### 1.1 ADD `staleFrames` + `reconfirmRefs` to `system/canvas-ops.mjs`

- **IMPLEMENT**: place them directly after `missingStates` (`:789`), preceded by ONE blank line, and add NOTHING else to
  this file (no header edit: the line budget is exact, see GOTCHA). Paste this block VERBATIM (31 lines, verified):

  ```js
  // staleFrames(doc, transcript) → [{ frameId, ref, status: "stale" | "dangling", latest }] (#318, D2). A ref pins one
  // record_decision by seq; a later banked answer to its question records `supersedes` (discovery/README.md §Supersede).
  // STALE IS DERIVED, NEVER STORED: `latest` is the chain's head (7 → 31 → 32 answers "32"), what a re-confirm pins. A
  // ref naming no decision (an absent seq, a file_evidence seq, "07") is DANGLING — flagged, never dropped. Reads
  // transcript lines (other ops skipped) or loadDecisions rows; null (a stand-in) answers []. Total over junk.
  export function staleFrames(doc, transcript) {
    if (!Array.isArray(transcript)) return [];
    const known = new Set();
    const after = new Map();
    for (const d of transcript) {
      if (!d || (d.op !== undefined && d.op !== "record_decision") || !Number.isInteger(d.seq)) continue;
      known.add(d.seq);
      if (Number.isInteger(d.supersedes)) after.set(d.supersedes, d.seq);
    }
    const head = (s) => { const seen = new Set(); while (after.has(s) && !seen.has(s)) { seen.add(s); s = after.get(s); } return s; };
    const out = [];
    for (const f of Array.isArray(doc?.frames) ? doc.frames : []) {
      for (const ref of Array.isArray(f?.decisionRefs) ? f.decisionRefs : []) {
        const seq = typeof ref === "string" && /^[1-9][0-9]*$/.test(ref) ? Number(ref) : NaN;
        if (!known.has(seq)) out.push({ frameId: f.id, ref, status: "dangling", latest: null });
        else if (after.has(seq)) out.push({ frameId: f.id, ref, status: "stale", latest: String(head(seq)) });
      }
    }
    return out;
  }

  // reconfirmRefs(frame, rows) → the frame's refs, each STALE one re-pinned to its latest, deduplicated (frame.link
  // refuses a duplicate). A dangling ref stays: re-linking it is the owner's choice of decision.
  export const reconfirmRefs = (frame, rows) => [...new Set((Array.isArray(frame?.decisionRefs) ? frame.decisionRefs : [])
    .map((r) => (Array.isArray(rows) ? rows : []).find((x) => x?.frameId === frame.id && x.ref === r && x.status === "stale")?.latest ?? r))];
  ```

- **PATTERN**: `missingStates` (`system/canvas-ops.mjs:767-789`), the pure-read rules (`:735-742`).
- **IMPORTS**: none. The import graph stays `./device-presets.mjs` only (group 35.9 asserts it).
- **GOTCHA**: refs are STRINGS and transcript seqs are INTEGERS. `known.has("7")` is false, so a missed `Number()`
  makes every ref read as dangling, and a `==` comparison elsewhere makes "07" resolve. Keep the canonical-integer
  regex.
- **GOTCHA**: a chain. 7 → 31 → 32 means 7 AND 31 are both stale, and both answer `latest: "32"`. Re-confirm must
  target the head, not the immediate successor. The `seen` set guards a corrupt cycle: the read is total, while
  prd-projection is the refuser (`discovery/prd-projection.mjs:406-412`).
- **GOTCHA**: do NOT import `discovery/ops.mjs`. It would enter the browser's import graph and group 35.9, and break
  CI's no-node_modules premise for nothing.
- **GOTCHA**: **line budget, exact.** On main the count is 33,111 and the approach figure flips at 33,150 (NOTES §Loc).
  This block plus its one leading blank line adds 31, giving **33,142** (derived), 7 lines under the flip. So: paste it
  verbatim, add no header line, and add no `embodiedBy` export (the card's inline `by` at `canvas.mjs:315` already
  is the reverse index). Task 7.1 still re-measures, because a merge from `main` can move the base.
- **VALIDATE**: `node -e 'import("./system/canvas-ops.mjs").then(m=>{const d={frames:[{id:"f1",decisionRefs:["7","8","99","07"]}]};const ds=[{seq:7,supersedes:null},{seq:8,supersedes:null},{seq:31,supersedes:7},{seq:32,supersedes:31}];const r=m.staleFrames(d,ds);console.log(JSON.stringify(r),JSON.stringify(m.reconfirmRefs(d.frames[0],r)))})'`
  → `[{"frameId":"f1","ref":"7","status":"stale","latest":"32"},{"frameId":"f1","ref":"99","status":"dangling","latest":null},{"frameId":"f1","ref":"07","status":"dangling","latest":null}] ["32","8","99","07"]`
  (observed: the reference block above, run from a scratch module in pre-flight). On the corrupt 2-cycle
  `[{seq:5,supersedes:6},{seq:6,supersedes:5}]`, a frame pinned to 5 answered `stale, latest "5"`. It terminates,
  and that is all 35.19 (g) asserts. Refusing a cycle is prd-projection's job (`discovery/prd-projection.mjs:406-412`).
- **REDDENS**: see 5.1 (each 35.19 assertion names its mutation).
- **SATISFIES**: AC #1.
- **REGENERATES**: possibly `system/loc-summary.json` + approach ×3 baselines. Phase 7 decides by measurement.

### 2.1 UPDATE `loadDecisions` in `portal/lib/canvas-store.mjs:450-473`

- **IMPLEMENT**: add `seq: l.seq` and `supersedes: Number.isInteger(l.supersedes) ? l.supersedes : null` to each
  row, and update the doc comment's shape line (`:450`) to name both. `id` stays `String(l.seq)`.
- **PATTERN**: the existing row literal.
- **GOTCHA**: `/api/canvas/run` (`portal/server.mjs:473`) spreads the row, so the page gets both fields with no
  server edit. Do not touch `saveRun`'s ref check. A superseded seq is still in `decisions` and stays linkable.
- **VALIDATE**: `node -e 'import("./portal/lib/canvas-store.mjs").then(m=>{const d=m.loadDecisions("discovery/faster-payment");console.log(d.length,JSON.stringify(d.find(x=>x.id==="7")).slice(0,60),d.find(x=>x.id==="7").seq,d.find(x=>x.id==="7").supersedes)})'`
  → before the edit `20 {"id":"7",… undefined undefined` (observed, shown as `20 undefined undefined` with the
  fields printed bare). After the edit it should print `20 … 7 null` (expected).
- **REDDENS**: 5.2.
- **SATISFIES**: AC #2 (the page needs `supersedes` to derive stale).
- **REGENERATES**: none.

### 3.1 UPDATE `agent-layer/gen-build-handoff.mjs`: lineage `seq` + `stale`, flow.md section

- **IMPLEMENT**:
  - Import `staleFrames` from `../system/canvas-ops.mjs` (it is already an allowed specifier in 49.1, so only the
    name list changes).
  - `renderLineage(doc, pkg)`: `rows = staleFrames(doc, t)`. Pass the transcript straight through: `staleFrames`
    skips every line whose `op` is not `record_decision`, and a text or denied line has no integer `seq`.
    - Each **decisions[]** row gains `seq` (`Number(id)` when `id` is a canonical integer, else `null`), `stale`
      (true if any row has `ref === id && status === "stale"`) and `latest` (that row's `latest`, else `null`).
      In the `t === null` branch: `seq` as computed, `stale: false`, `latest: null`.
    - Each **frames[]** row gains `stale`: true when one of its own refs is stale, or when it is a state with no
      refs of its own (`via` set) and its base is stale. Compute the base frames first.
    - Keep the existing flags exactly. Dangling is already `unresolved-decision`, so do not add a second name for it.
  - Update `LINEAGE_DESCRIPTION` with one sentence: "`seq` is the decision's transcript seq; `stale` is true once a
    later banked decision on the same question supersedes it (D2, #318), and `latest` names the head of that chain;
    a frame is stale when one of its decisions is, or via its base."
  - `renderFlow(slug, doc, decs)`: right after the `Parts by provenance` line and before the lane loop, add
    `## Decisions changed since linked`, followed by a blank line and then one of:
    - `- Not checked — this package has no transcript.jsonl (a stand-in).` when `decs === null`
    - `- None — every linked decision is the latest on its question.` when no rows
    - one line per row: `- ${frameLabel} (${frameId}): decision ${ref} changed since linked — now ${latest}. Re-confirm or re-link.`
      for stale, `- ${frameLabel} (${frameId}): decision ${ref} does not resolve in the transcript (flagged, kept).`
      for dangling. Pass every string through `one()`.

    `renderFlow` takes `pkg.transcript` as `decs` (`renderPack` passes it). `null` means a stand-in.
- **PATTERN**: `renderLineage`'s existing `bySeq` (`:191-192`), `renderFlow`'s section idiom (`:121-126`),
  `one()` (`:43`).
- **GOTCHA**: 49.4–49.7 read the spine's FROZEN first six lines (`build-checks.mjs:17020-17024`), and 49.4 asserts
  `deep(flags)` exactly. Adding booleans is safe. Adding a flag is not.
- **GOTCHA**: `tooling/fixtures/builds/two-lane/` has no `transcript.jsonl` (observed), so its flow.md takes the
  "Not checked" line.
- **VALIDATE**: `node agent-layer/gen-build-handoff.mjs --check` → (expected, before regen) drift on 4 files
  (2 × flow.md, 2 × lineage.json). Then `node agent-layer/gen-build-handoff.mjs` and `--check` →
  `build handoff ✓  2 packages, 8 files — no drift` (the baseline text observed on main).
- **REDDENS**: 5.3.
- **SATISFIES**: AC #3.
- **REGENERATES**: `discovery/faster-payment/build/handoff/{flow.md,lineage.json}` and
  `tooling/fixtures/builds/two-lane/build/handoff/{flow.md,lineage.json}` via `node agent-layer/gen-build-handoff.mjs`.
  Drift-checked by CI's `build-handoff` leg and group 49.2.

### 4.1 UPDATE `portal/public/canvas.mjs`: flag, card, re-confirm, flow list, inspector

- **IMPLEMENT**:
  1. Add `reconfirmRefs` and `staleFrames` to the `/system/canvas-ops.mjs` import (`:54`). Add
     `const staleOf = () => staleFrames(doc, decisions);` beside `missingOf`.
  2. `frameParts` (`:197-198`): for each ref, find `staleOf()`'s row for `(f.id, r)`.
     - stale → chip `Decision ${r} changed since linked — now ${latest}` with class `cv-chip cv-chip-stale`
     - dangling → chip `Decision ${r} not found` with the same class
     - otherwise the existing chip unchanged

     If any row for this frame is stale, append to `chips` a
     `button.btn.btn-secondary.cv-btn.cv-reconfirm-btn` with `data-cv-reconfirm=f.id`,
     text `Re-confirm`, and aria-label
     `Re-confirm ${frameName(f)}: ${rows.map((x) => `decision ${x.ref} → ${x.latest}`).join(", ")}`.
  3. `frameSig` (`:211`): add `stale: staleOf().filter((x) => x.frameId === f.id)`, so the cap re-renders after a
     re-confirm and after an undo of one.
  4. `cardParts` (`:313-327`): after the wrongIf line, if any `staleOf()` row has `ref === ref && status === "stale"`,
     push `p.cv-flag` with text `Changed since linked — superseded; the latest is decision ${latest}. Re-confirm on the frame.`
     Leave the "Embodied by" line as it is: it is the reverse index (AC #4).
  5. `renderFlow` (`:448-454`): after the missing items, add one `li` per `staleOf()` row:
     `${frameName(frameOf(x.frameId))}: decision ${x.ref} changed since linked (now ${x.latest})`, or
     `…: decision ${x.ref} not found` for a dangling row. The "Every screen…" sentence shows only when both lists
     are empty.
  6. Inspector checkboxes (`:839-842`): when some decision `x` in `decisions` has `x.supersedes === d.seq`, append
     ` — superseded by ${…}` to the label text. Use the chain head:
     `staleFrames({ frames: [{ id: "_", decisionRefs: [d.id] }] }, decisions)[0]?.latest`. This keeps one code path.
  7. In `registerComposeConsumers` beside the `[data-cv-ask-state]` listener (`:771-776`), or as a sibling
     `document.addEventListener("click", …)` in `registerConsumers`, add a handler for
     `e.target?.closest?.("[data-cv-reconfirm]")`. It looks up `f = frameOf(id)` and emits
     `bus.emit({ type: "ui.frame-link", source: e.detail === 0 ? "keyboard" : "pointer", target: { component: "frame", id }, params: { decisionRefs: reconfirmRefs(f, staleOf()) } })`.
     The existing consumer (`:956-961`) applies `frame.link`, records one pending line and says
     `add-payee (f1) now embodies decisions 31, 8.`
- **PATTERN**: `[data-cv-ask-state]` (`:204`, `:771-776`). `emitFrom`'s source rule (`:808-811`). Every string
  goes in through `el(..., { text })`, never markup.
- **GOTCHA**: `frame.link` REPLACES the list. Re-confirming one of two refs must resend the other, and
  `reconfirmRefs` does this. Never emit only the new seq.
- **GOTCHA**: after re-confirm, card `d7` leaves the stage (reconcile's `want` set) and `d31` is placed by
  `placeCard` → `placeDecision`. `boxes` then holds the new card, so `gatherPositions` carries it and `arrangement`
  does not refuse "node d31 has no position". This is the #306 path journey step 5 already proves for `d10`. Do not
  add a placement of your own.
- **GOTCHA**: decisions are not lane-scoped. Use `doc`, never `view`, in `staleOf`.
- **GOTCHA**: `decisions === null` (stand-in) → `staleOf()` is `[]`. The existing "no transcript" texts stay the
  only ones.
- **VALIDATE**: `node --check portal/public/canvas.mjs` → (expected) silent; then Phase 6's journey.
- **REDDENS**: 6.1 steps B2–B5.
- **SATISFIES**: AC #2, AC #4.
- **REGENERATES**: none (the portal is not in the VR set, and `portal/` is not a loc group).

### 4.2 ADD `.cv-chip-stale` and `.cv-reconfirm-btn` to `portal/public/portal.css` (after `:312`)

- **IMPLEMENT**: `.cv-chip-stale { border-style: dashed; font-weight: 600; }` and
  `.cv-reconfirm-btn { font-size: var(--type-caption); }` (mirror `.cv-missing-btn`, `:363`). No colour: the calm
  colour constraint, and no warning token exists in this sheet (observed).
- **VALIDATE**: `node tooling/token-lint.mjs` → `token-lint ✓ … 0 undeclared · 0 orphan`.
- **SATISFIES**: AC #2.
- **REGENERATES**: none.

### 5.1 ADD case 35.19 to group 35 (`tooling/build-checks.mjs`, after 35.18's block, before `:12098`)

- **IMPLEMENT**: add `staleFrames, reconfirmRefs` to the destructured import (`:11250`). Build the fixture with the
  REAL discovery applier over the committed transcript, as in the pre-flight probe:
  - `t` = `discovery/faster-payment/transcript.jsonl` lines; `answers` from its `answers.jsonl`. Import
    `QUESTIONS` from `../discovery/bank.mjs` (dynamic `await import`; check first whether it is already imported at
    top level).
  - `state = applyDiscoveryOps(t.filter(op).map({op, params, turn}), { answers, bank: QUESTIONS, turn: null })`.
  - Supersede seq 7 twice. First on turn `t25`, with an appended banked answer line `a<n+1>` naming 7's
    `question_id`, giving record `S1`. Then on turn `t26`, giving record `S2`. Spread 7's params and override
    `answer_ref`, `evidence_refs: []` and `wrong_if`. **Derive `S1`/`S2`** as `state.ops.length + 1`/`+ 2` (31
    and 32 today, observed). Never hard-code them: the committed transcript may grow.
  - `decs` = the full record list (`state2.ops`), passed AS IS. The records carry `op`, so `staleFrames`' own filter
    is what drops the `file_evidence` and `open_question` seqs. That makes (e)'s `"1"` a real test of the filter.

  Wrap every constructive call so a throw is a named failure (35's `fold()` discipline).

  Assert:
  - (a) **AC #1, first clause**: record 31 `supersedes === 7` and record 32 `supersedes === 31`.
  - (b) A frame pinned to `"7"` is stale with `latest "32"`.
  - (c) A frame pinned to `"32"` produces no row. This is the positive control: an implementation that flags
    everything fails here.
  - (d) A frame pinned to `"31"` (the middle of the chain) is stale with `latest "32"`.
  - (e) Dangling, never dropped: `"99"` (absent), `"1"` (a `file_evidence` seq, filtered out by the record_decision
    filter), `"07"`, `""` and `7` (a number) each produce a `dangling` row with that exact ref. The frame stays in
    the document.
  - (f) **The cross-reader**: one frame pins EVERY decision seq in the fixture. Without that, `staleFrames` reports
    only pinned refs and the comparison is vacuous. `staleFrames` reports a seq stale exactly when
    `ledgerView(state2.ops).decisions.find(seq).latest === false`. Read the vacuity guard off the FIXTURE's own
    records (`state2.ops.some((r) => r.supersedes !== null)`), never off either reader. This is #379 F2's rule,
    `build-checks.mjs:6966-6969`.
  - (g) `staleFrames(doc, null)` is `[]`, and the function is total over junk (`null` doc, `{frames: "x"}`,
    `decisions: [null, {seq: "7"}, 7]`, and a 2-cycle `[{seq:5,supersedes:6},{seq:6,supersedes:5}]` that
    terminates. Assert only that it returns: the reference answers `latest "5"`, which is acceptable for corrupt data).
  - (h) `reconfirmRefs` on `{id:"f1", decisionRefs:["7","8","32"]}` → `["32","8"]` (re-pinned and deduped). A
    `dangling` ref is kept.
  - (i) **No op was added**: `COPS.length === 14`, already asserted by 35.1. Restate it in the 35.19 message only.

  Append to the group 35 `group()` detail (`:12098`): ` · #318's staleFrames (35.19): …` naming each clause and what
  it CANNOT reach (whether the page shows the flag: canvas-journey pass B).
- **PATTERN**: 35.11 (`:11631-11643`), 28.6a's real-applier supersede (`:6778-6783`), the `fold()` throw-to-failure
  rule described in group 35's detail string.
- **GOTCHA**: block scoping. Group 28's `dec`/`ctx`/`happy` helpers are not reachable here. Build the ctx inline.
- **GOTCHA**: the applier's R2 closes the turn, so each superseding decision needs a turn no earlier op closed. The
  committed transcript ends at `t24` (observed), so use `t25` and `t26`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "canvas ops|✗"` → `build canvas ops ✓ …`.
- **REDDENS**, each to be RUN once before trusting the green:
  - (b): change `after.set(d.supersedes, d.seq)` to `known.add(...)` only (no successor map). Expected red:
    `35.19 a frame pinned to 7 must read stale (latest 32)`.
  - (c): return a stale row for every known ref. Expected red: `35.19 control — a frame pinned to the latest (32) was flagged`.
  - (d): replace `head(seq)` with `after.get(seq)`. Expected red: `35.19 the middle of a chain must re-pin to its head 32, got 31`.
  - (e): `Number(ref)` without the regex. Expected red: `"07"` and `7` resolve (`35.19 … "07" must be dangling`).
    Separately, drop the `op` filter. Expected red: `35.19 "1" (a file_evidence seq) must be dangling`.
  - (f): read `d.seq` off a mirrored rule that ignores `supersedes`. Expected red: the cross-reader message names
    the seq.
  - (h): drop the `Set`. Expected red: `reconfirmRefs … ["32","8","32"]`, which `frame.link` would refuse.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

### 5.2 ADD case 36.15 to group 36 (`loadDecisions` carries `seq` + `supersedes`)

- **IMPLEMENT**: assert on `decisionsFP` (`:12317`): every row has `Number.isInteger(seq)`, `String(seq) === id`
  and `supersedes === null` (the committed transcript supersedes nothing: 0 of 30 decision lines across 12
  packages, observed). Add one in-memory positive control: write a temp package whose transcript holds two
  record_decision lines, the second `supersedes: 1`, and assert its row reads `supersedes: 1`. Mirror 36.9's
  `mkdtempSync` idiom (`:12358-12367`). Append the clause to group 36's `group()` detail (`:12590`).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "build package|✗"` → `✓`.
- **REDDENS**: delete `supersedes` from the row. Expected red: `36.15 loadDecisions must carry supersedes (null on faster-payment, 1 on the control)`.
- **SATISFIES**: AC #2 (the page's input).
- **REGENERATES**: none.

### 5.3 ADD case 49.13 to group 49 (lineage `seq`/`stale`, flow.md section)

- **IMPLEMENT**: over `spine6`, assert:
  - (a) Lineage decision `7` reads `seq: 7, stale: false, latest: null`, and frame `f1` and frame `f2` (via f1)
    read `stale: false`. This is the control.
  - (b) An in-memory package whose transcript is `spine6.transcript` plus ONE superseding line built as in 5.1. The
    groups share no scope, so copy the construction. The appended line must be in `opLine`'s FULL shape,
    `{type: "op", ts, seq, turn, op, params, closes, flagged, supersedes}` (`portal/lib/discovery.mjs:359-362`).
    Without `type: "op"`, `renderLineage`'s `bySeq` drops it and the decision reads `unresolved-decision`. Render
    it, then check:
    - lineage decision `7` reads `stale: true, latest: String(S1)`
    - `f1.stale` and `f2.stale` (via) are both true
    - flow.md's `## Decisions changed since linked` section holds
      `- add-payee (f1): decision 7 changed since linked — now ${S1}.`
  - (c) The relinked case 49.4 already builds (`decisionRefs: ["3","99"]`): `99` reads `seq: 99, stale: false` and
    keeps `flags: ["unresolved-decision"]`, and flow.md lists it as `does not resolve`.
  - (d) With `transcript: null`, flow.md says `Not checked — this package has no transcript.jsonl (a stand-in).`
  - (e) The committed two-lane pack carries the "Not checked" line, read off `tl.rendered`.

  Append the clause to group 49's detail (`:17209`).
- **PATTERN**: 49.4 (`:17034-17053`).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "build handoff|✗"` → `✓`.
- **REDDENS**:
  - (b): skip the via-base step for frames. Expected red: `49.13 f2 (via f1) must read stale`.
  - Drop the flow.md section. Expected red: `49.13 flow.md must name decision 7 changed since linked`.
- **SATISFIES**: AC #3.
- **REGENERATES**: none.

### 6.1 ADD pass B (blast radius, B1–B7) to `tooling/canvas-journey.mjs`

- **IMPLEMENT**:
  - Add `"fp-stale"` to `seed()`'s `{ discovery: true }` slug list (`:284`).
  - Add `function seedSupersede(slug)`, which writes ONLY to the scratch copy:
    1. Read the copy's `transcript.jsonl` and `answers.jsonl`.
    2. Fold with `applyOps` from `../discovery/ops.mjs` and `QUESTIONS` from `../discovery/bank.mjs`.
    3. Append a banked answer line `{ref:"a<n+1>", ts, turn:"t25", question_id:<7's>, kind:"banked", text:"Seeded by tooling/canvas-journey.mjs (#318) to stand in for a re-recorded decision — not the owner's words."}`.
       The honesty contract runs both ways, so the text names the driver as its author.
    4. `applyOp` a `record_decision` spreading seq 7's params, with `answer_ref` the new ref, `evidence_refs: []`
       and `wrong_if: "Journey fixture (#318)."` on turn `t25`.
    5. Append the transcript line in `opLine`'s exact shape:
       `{type:"op", ts, seq, turn, op, params, closes, flagged, supersedes}` (`portal/lib/discovery.mjs:359-362`).
    6. Throw unless `supersedes === 7`, and return the new seq (31, observed).

    Do NOT import `portal/lib/discovery.mjs` to reach `opLine`/`appendAnswer`: it imports `env.mjs`, which loads
    `portal/.env` into this process, and the env leaks into every spawned portal child (memory: an empty env var
    does not blank a key).
  - Steps, with `t(name, cond)` named `B<n> · …`:
    In what follows, `S` is `seedSupersede`'s return (31 today), never a literal.
    - **B1** open `fp-stale` (provenance real). f1's cap shows `Decision 7` and `Decision 8` with no
      `.cv-chip-stale` and no `[data-cv-reconfirm]`. Card `d7` reads `Embodied by: add-payee` (**AC #4**). The
      ledger is still 6 lines (no save on load). Then LINK f1 through the inspector by keyboard, exactly as step 5
      does (`:432-447`): check decision 10 and press Link decisions. Line 7 is
      `frame.link {f1, ["7","8","10"]}`. This is the FIRST `frame.link`, which the AC's "second" needs: the spine
      links f1 through `screen.compose`, not through `frame.link`.
    - **B2** `seedSupersede("fp-stale")` → `S`. Reload. f1 shows `Decision 7 changed since linked — now ${S}`
      and a `Re-confirm` button, measured ≥ 44×44. Card `d7` shows
      `Changed since linked — superseded; the latest is decision ${S}`. The flow panel lists
      `add-payee: decision 7 changed since linked (now ${S})`. The ledger is still 7 lines.
    - **B3** Re-confirm BY KEYBOARD: focus `[data-cv-reconfirm="f1"]` and press Enter. The live region says
      `add-payee (f1) now embodies decisions ${S}, 8, 10.` `waitLines("fp-stale", 8)`: line 8 is
      `frame.link {frameId:"f1", decisionRefs:[String(S),"8","10"]}`, `applied`, `owner`, and the ledger holds
      exactly TWO `frame.link` lines, the second re-pinning 7 → `S` (**AC #2**, literal).
    - **B4** The flag clears: no `.cv-chip-stale` on f1, no `[data-cv-reconfirm]`, card `d${S}` on the stage,
      card `d7` gone, and the flow panel without the stale line.
    - **B5** Cmd+Z (`undo(page)`): line 9 is `undone` restating line 8. The flag is back on f1 (stale is DERIVED,
      not stored).
    - **B6** The pack (**AC #3** end to end). `saveRun` appends and only then does `withPack` write, from the portal
      process, so POLL `build/handoff/lineage.json` (100 ms steps, 6 s cap, as `waitLines` does) until decision `7`
      reads `seq: 7, stale: true, latest: String(S)` and f1 reads `stale: true`. Then poll `flow.md` for
      `decision 7 changed since linked — now ${S}`. A single read right after `waitLines` can race the write.
    - **B7** `verifyBuild(loadBuild(buildDir("fp-stale")))` is `[]`, and the page's document equals
      `foldLedger(ledger)`. The leg's own step 16 and its `git status -- discovery/` comparison cover page errors
      and the committed tree.
  - Call `await blastPass(base, page, t, step)` directly after `await groupsPass(base, page, t, step, errors);`
    (`:627`). Every engine runs it, as with lanes and groups. The leg-level step 16 (no page errors) and the
    `git status -- discovery/` comparison (`:648-650`) already cover it, so the pass needs no `errors` argument.
  - Header: add a `THE BLAST-RADIUS PASS (#318, B1–B7)` paragraph in the house voice. It must say that the
    superseding decision is SEEDED through the real discovery applier into the scratch copy, because a closed
    session refuses turns and the drawer has no scripted-agent seam. WHAT IT CANNOT REACH: re-recording in the
    discovery drawer (the follow-up ticket from 9.1), and a dangling ref on the page (saveRun refuses an unknown
    frame.link ref, so 35.19/49.13 hold it).
- **PATTERN**: `seedGroups` (`:768-783`), `lanesPass` (`:667-767`), step 5's keyboard link (`:432-447`).
- **GOTCHA**: B6 reads a file another process writes after the ledger append (`portal/server.mjs:449,492`). Poll
  it; never read it once.
- **GOTCHA**: memory "stale serve = wrong tree" does not apply (the driver spawns its own portal and asserts
  `bootSha`). Kill only your own PID (the existing teardown does this).
- **VALIDATE**: `(cd portal && npm ci) && node tooling/canvas-journey.mjs chromium` → every `B* ✓`, then
  `node tooling/canvas-journey.mjs all` (expected: 3 engines, 0 fails).
- **REDDENS**: run each once.
  - Make `staleOf` return `[]`. Expected red: B2 `f1 must show Decision 7 changed since linked`.
  - Make the re-confirm handler emit `{decisionRefs:[String(S)]}`. Expected red: B3 line 8 is `["31"]`, not
    `["31","8","10"]`.
  - Store stale on the frame instead of deriving it. Expected red: B5 the flag does not return after undo.
- **SATISFIES**: AC #2, AC #4 (and #3 end to end).
- **REGENERATES**: none (the scratch dir is removed in teardown).

### 7.1 Measure the loc cascade, then regenerate what moved

- **IMPLEMENT**: stage everything, run the exact-count one-liner (NOTES §Loc), and expect **`81 33142`** (derived: 33,111 + 31, with no new file). Then run `node agent-layer/gen-loc-summary.mjs --check`.
  - **Runtime still `33100`** (exact count < 33,150), which is the expected branch: commit as is. No VR work.
  - Any other count means `main` moved or the block was not pasted verbatim. Diff `system/` against `origin/main`
    and explain the difference in the report before you continue.
  - **Runtime flips to `33200`** (only possible if a merge from `main` spent the 7-line margin). The fallback is fully
    specified and its tools are verified present (Docker answers `docker info`, and `update:docker` exists in
    `tooling/visual-regression/package.json:8`, both observed 2026-10-01):
    1. `node agent-layer/gen-loc-summary.mjs` and commit `system/loc-summary.json`.
    2. `rm tooling/visual-regression/baselines/approach-{neutral,saulera,verdant}.png`.
    3. From a CLEAN detached worktree under `/Users` (not `/private/tmp`, because of Docker file sharing):
       `cd tooling/visual-regression && npm ci && npm run update:docker`.
    4. Commit the three PNGs in the same PR.

  Compute the exact count with the generator's method:
  `node -e '…git ls-files… /^system\/(wc\/)?[^/]+\.(css|mjs|js)$/ … split("\n").length'` (NOTES §Loc has the
  one-liner).
- **GOTCHA**: gen-loc reads TRACKED content. `--check` before staging is a false "no drift".
- **GOTCHA**: re-measure after every `git merge origin/main`. A parallel session's `system/` change can spend the 38
  lines between this measurement and the PR.
- **GOTCHA**: `rm` the PNGs. `update:docker` silently keeps a stale digit, because the change is below the
  per-pixel threshold.
- **GOTCHA**: the VR update screenshots the DIRTY tree, hence the clean worktree.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift` (observed
  text on main).
- **SATISFIES**: CI `verify` green.
- **REGENERATES**: `system/loc-summary.json`, and conditionally `approach-{neutral,saulera,verdant}.png`.

### 8.1 UPDATE `.claude/references/gates.md` (groups 35, 36, 49 and canvas-journey paragraphs)

- **IMPLEMENT**: one clause each, matching what 5.1–5.3 and 6.1 assert AND what they cannot reach. Grep all three
  copies of each "cannot reach" clause (`gates.md`, the `group()` string, the block's header comment) and keep them
  in step.
- **VALIDATE**: `node tooling/drift-check.mjs` → includes `group-count` ✓ (no group was added; the count is
  unchanged).
- **REGENERATES**: none.

### 8.2 UPDATE `discovery/README.md:192` and `docs/epics/canvas-design-import.architecture.md` (D2 as built)

- **IMPLEMENT**:
  - README §Supersede: replace "The projection and the canvas read the latest." with "The projection reads the
    latest. The canvas pins the version a frame was linked to and flags the frame stale once that version is
    superseded, until the owner re-confirms (#318)." This is a doc edit only. No verb changes, so the op lock is
    not taken.
  - Architecture: one paragraph after the addendum table: **As built (#318, owner 2026-10-01):** `decisionRefs`
    stays `string[]` of transcript seqs (the seq is the pin). `{id, seq}` is derived on read, with `seq =
    Number(ref)` and the decision's cross-version identity its `question_id`. `staleFrames(doc, transcript)` also
    accepts the page's `loadDecisions` rows. The reason: three committed ledgers carry string refs, one of them a
    real recorded run that may never be edited.
- **VALIDATE**: `node tooling/drift-check.mjs` → `syntax` ✓.
- **SATISFIES**: CLAUDE.md "stop and flag" (recorded, owner-decided).
- **REGENERATES**: none.

### 9.1 OPEN the follow-up ticket before the PR

- **IMPLEMENT**: show the owner the title and body below, and on their OK run
  `gh issue create --title "<title>" --body-file <tmp>`. It is an outward-facing write, so the owner confirms it.
  Put the returned number in the PR body and the report. Title:
  `Re-record a decision from the discovery view after a build has linked it (#318 follow-up)`. Body (copy verbatim,
  no indentation):

```
Part of epic #295. Follow-up from #318 (D2).

## Problem
#318 flags canvas frames whose pinned decision has been superseded, and its journey proves link → flag →
re-confirm → clear. The superseding decision is SEEDED through discovery/ops.mjs's real applier into a scratch
copy, because there is no product path to re-record one after a build exists:
- a closed session refuses turns (portal/lib/discovery.mjs:1117), and a run is closed before its build starts;
- the drawer has no scripted-agent seam (only UXF_COMPOSE_TRANSPORT exists, for the canvas).

## Scope (pick one at planning)
- A: re-open a finished run for one revisited question (a new turn, a new banked answer, a real agent filing).
- B: a UXF_DISCOVERY_TRANSPORT fake, so canvas-journey drives the re-record through the drawer at $0.

## Acceptance criteria
- [ ] The owner re-records a linked decision from the discovery view, and the canvas flags the frame on its next load.
- [ ] canvas-journey's pass B replaces its in-process seed with that path.

## Depends on
#318
```

- **SATISFIES**: the AC #2 gap, tracked with a ready ticket. This closes R1.

### 9.2 Validate, report, PR

- **IMPLEMENT**: run every VALIDATION COMMAND below. Write the report at
  `.claude/reports/decision-blast-radius-318-report.md`. The PR body carries `Closes #318` and states that AC #2's
  "in the discovery view" step is NOT met as worded, with a link to 9.1's ticket. The plan, the report and the
  review go in the same PR.

---

## TESTING STRATEGY

No test framework. The gates are `build-checks.mjs` (CI) and the journey drivers (operator-run).

### Unit (build-checks)

35.19 (the read, over real applier output, with the cross-reader against `ledgerView`), 36.15 (the page's input),
49.13 (the pack).

### Integration (canvas-journey pass B)

Three engines, against a real portal child and a scratch `JOBS_DIR`. It runs seed → flag → keyboard re-confirm →
clear → undo → the flag returns → the pack → verifyBuild.

### Edge Cases

- A chain of two supersedes (head, not successor): 35.19 (b), (d).
- A frame pinned to the latest (no flag): 35.19 (c), journey B4.
- Dangling: absent seq, `file_evidence` seq, `"07"`, a numeric ref, `""`: 35.19 (e), 49.13 (c).
- A stand-in (no transcript): 35.19 (g), 49.13 (d), the two-lane fixture (e).
- A state frame via its base: 49.13 (a)/(b).
- Re-confirm when the head is already linked: 35.19 (h).
- An off-script decision never supersedes, so it never makes a frame stale. This is inherited from the applier and
  covered by 35.19 (f)'s cross-reader, because `ledgerView` agrees.
- A corrupt supersede cycle: 35.19 (g) terminates.

### Proving the checks

Every REDDENS above is run once, the red message is pasted into the report, and then it is reverted. The positive
controls are 35.19 (c), 49.13 (a) and journey B1. A check that is green before its mutation is run is not evidence.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

- `node tooling/drift-check.mjs` (includes `syntax` over every tracked `.mjs`, `build-handoff`, `loc-summary`, `group-count`)
- `node tooling/token-lint.mjs`

### Level 2: Unit

- `(cd tooling/icons && npm ci)` (fresh worktree only), then `node tooling/build-checks.mjs` → `build ✓  all 50 groups pass`
  (the group count stays 50: cases, not groups)

### Level 3: Integration

- `node agent-layer/gen-build-handoff.mjs --check` → `✓ 2 packages, 8 files — no drift`
- `node agent-layer/gen-loc-summary.mjs --check` (after staging) → `✓ 3 groups — no drift`
- `(cd portal && npm ci) && node tooling/canvas-journey.mjs all` → 0 fails on chromium, firefox and webkit

### Level 4: Manual

- Portal smoke on a free port: `PORT=0`, or pick one with
  `node -e 'const s=require("net").createServer().listen(0,()=>{console.log(s.address().port);s.close()})'`.
  Start `PORT=<p> node portal/server.mjs &`, curl `/api/health` → `ok:true`, and `bootSha` = HEAD. Kill `$!` only.
- Open `http://127.0.0.1:<p>/canvas.html?provenance=fictional&slug=faster-payment`. No chip is stale (the committed
  transcript supersedes nothing) and zero saves happen on load. Look at the spine; do not edit it.

### Level 5: Additional

- The CI CodeQL gate on the PR (both legs). Nothing here adds a sink. The page writes only `textContent`.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Re-record a decision through the real discovery drawer, then watch the canvas flag it | owner's hand, and a model turn (~$0.06–0.18) on an OPEN session | no: AC #2's drawer step is reported not met | the follow-up ticket from Task 9.1, opened before the PR |
| Creating the follow-up GitHub issue | owner confirms (an outward-facing write) | no | itself |

No step spends tokens in this plan.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1**: build-checks 35.19 over a real-applier fixture: two `record_decision` lines on one `question_id`,
  where the second supersedes. A frame pinned to the first reads stale, a frame pinned to the second does not, and a
  frame pinned to a missing seq is flagged dangling and kept.
- [ ] **AC #2** (partly, as decided): the canvas-journey pass B runs link (the first `frame.link`, B1) → re-record
  (SEEDED via the real applier, not through the drawer) → the frame flags → re-confirm by keyboard → the flag clears
  and `ops.jsonl` holds exactly two `frame.link` lines, the second re-pinning 7 to the chain head. The drawer step is
  tracked by 9.1's ticket.
- [ ] **AC #3**: `lineage.json` carries `seq` and `stale` (and `latest`), and `flow.md` marks stale screens. Proven
  by 49.13 and journey B6.
- [ ] **AC #4**: the decision card lists the frames that embody it. Shipped by #306; asserted by journey B1, and the
  card now also says when its decision has been superseded.
- [ ] No new op (`COPS.length === 14`). `discovery/` code is untouched. No committed ledger is edited.
- [ ] CI `verify` green (build-checks, drift-check, token-lint) and the CodeQL gate green.

---

## COMPLETION CHECKLIST

- [ ] Tasks done in order, each VALIDATE observed
- [ ] Every REDDENS run once and its message pasted in the report
- [ ] Generated outputs regenerated in the same PR (handoff ×2 packs; loc-summary and approach ×3 if the count flipped)
- [ ] Gate prose updated in all three copies
- [ ] Follow-up ticket opened (owner-confirmed)
- [ ] Plan, report and review in the PR; `Closes #318`

---

## RISK REGISTER AND CONFIDENCE

**Confidence: 10/10 for one-pass implementation.** Every risk below has been closed by a measurement or by a decided
fallback that has already been checked. None depends on the implementer's judgement.

| Risk | How it is closed | Evidence |
|---|---|---|
| R1 AC #2's "in the discovery view" | The owner decided to seed the re-record via the real applier (Q2). The PR states the gap, and 9.1's ticket body is drafted verbatim. AC #2 is met literally on the canvas side: two `frame.link` lines, the second re-pinning | Q2 answer 2026-10-01; journey B1/B3 |
| R2 loc flip forcing an approach ×3 VR regen | The block is pinned verbatim at 31 added lines, giving 33,142 (7 under the 33,150 flip). Task 7.1 re-measures and expects `81 33142`. If a merge moves the base, the cascade is fully specified, and Docker and `update:docker` are verified present | the count one-liner (observed 33,111); `docker info` ok; `package.json:8` |
| R3 group 41 red in a fresh worktree | Step 0 installs and demands a green `all 50 groups pass` baseline before any edit | observed failure text and its install hint |
| R4 the read is wrong on real data | The exact block ran against the REAL applier over faster-payment plus two supersedes. Stale `[7,31]` equals `ledgerView`'s not-latest `[7,31]`; dangling `['1','99','07']`; re-confirm `['32','8','10']` | `scratchpad/probe2.mjs` with `ref2.mjs` = the plan's block (observed) |
| R5 re-confirm button below 44×44 or swallowed by canvas drag | It reuses `.cv-btn` (`min-height: 44px; min-width: 44px`, `portal.css:291`) and the delegated-click pattern the missing-state buttons already use inside the same caption | observed |
| R6 the journey reads a half-written pack | B6 polls `lineage.json`/`flow.md`, because `saveRun` appends before `withPack` writes (`server.mjs:449,492`) | observed |
| R7 a new decision card not saved ("node has no position") | It goes through `placeCard` → `placeDecision` → `boxes`, the path journey step 5 already proves for `d10` | `canvas.mjs:329-343`, journey `:432-447` |
| R8 `main` moving under the plan | Step 0's green baseline, 7.1's exact expected count, and the memory rule: check `gh pr view --json commits` before building on "merged" | `origin/main` = 694ab91 at re-check (observed), no `system/` drift |

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 (closed, owner 2026-10-01): pin shape.** The owner chose to keep the seq strings and derive `{id, seq}` on
  read. The rejected alternative, `{id, seq}` objects, would have needed an applier that accepts both shapes
  forever. The cause is `.claude/plans/canvas-compose-loop-312/raw/live-1/ops.jsonl`, a real run that can never be
  edited.
- **Q2 (closed, owner 2026-10-01): the journey's re-record.** The owner chose to seed via the real discovery applier
  into a scratch copy, report the drawer step as not met, and open a follow-up.
- **A1**: `staleFrames(doc, transcript)` matches the architecture's signature. It also accepts `loadDecisions` rows
  (no `op` key), which now carry `seq` and `supersedes`. The handoff passes the transcript; the page passes the rows.
  Recorded in 8.2.
- **A2**: a state frame with no refs of its own is stale when its base is (the `via` rule, `lineage.json` only). The
  page flags the base frame, which is where the refs and the Re-confirm live.
- **A3**: a link to a superseded seq stays legal at `saveRun`. It is honest, and the frame reads stale at once.
  Refusing it would make the inspector's checkbox list lie about what is linkable.
- **A4**: the re-confirm button re-pins every stale ref of a frame in ONE `frame.link` (one undo entry). Per-ref
  buttons were rejected as noise: a frame rarely pins more than two decisions.

## NOTES (open canvas)

### Pre-flight (run 2026-10-01 against `origin/main` 694ab91, detached worktree in the scratchpad)

- **Supersede probe, $0** (`scratchpad/probe.mjs`): replayed faster-payment's 30 transcript ops through
  `applyOps`, then one `record_decision` spreading seq 7's params on turn `t25` → `new record 31 supersedes 7 closes
  true flagged [ 'no-evidence' ]`, and `ledgerView` read 7 as `"supersededBy":31,"latest":false` (observed). The
  rule exists, so #318 takes no discovery op lock. **Changed the plan**: the ticket's "possibly `discovery/ops.mjs`"
  is out of scope.
- **35.19's fixture, dry-run** (`scratchpad/probe2.mjs`, which runs the reference `staleFrames` WITH the `op` filter
  against the real applier): two supersedes → `[ '31<-7', '32<-31' ]`. Over every decision seq, stale `[7, 31]`
  equals `ledgerView`'s not-latest `[7, 31]`. Dangling `['1','99','07']` (seq 1 is a `file_evidence`, so the filter
  works). `reconfirmRefs` → `['32','8','10']` (all observed). This caught a contradiction in the first draft: (e)
  expected seq 1 dangling while the read had no `op` filter (advisor review).
- **Committed supersedes**: 0 of 12 committed transcripts contain a supersede (observed, grep). So a real-data
  supersede has never been rendered by any reader. 35.19 builds one with the real applier.
- **Ref shape**: `decisionRefs` are strings equal to transcript seqs (`canvas-store.mjs:452-455`; spine
  `["7","8"]`). Three ledgers carry them, one of them a real run. **Changed the plan**: Q1 was asked, and the owner
  kept the strings.
- **Re-record path**: `discovery.mjs:1117` refuses turns on a closed run, `faster-payment` has `endedAt` set, and
  the only fake transport is `UXF_COMPOSE_TRANSPORT`. **Changed the plan**: Q2 was asked, and the seeding approach
  plus a follow-up ticket replaced the drawer step.
- **Reverse index**: `cardParts` already renders `Embodied by: …` (`canvas.mjs:315,326`). **Changed the plan**:
  there is no `embodiedBy` export, only the assertion and the superseded line.
- **New-card placement**: `placeCard` → `placeDecision` (`canvas.mjs:333-341`), and journey step 5 already proves a
  newly linked `d10` lands and saves. No arrangement change.
- **`build-checks.mjs`** on main: every group ✓ except **41 icons** ✗, which is environmental:
  `tooling/icons/node_modules/@phosphor-icons/core/assets/regular is missing … cd tooling/icons && npm ci` (observed).
- **`gen-build-handoff.mjs --check`** → `build handoff ✓  2 packages, 8 files — no drift` (observed).
- **`gen-loc-summary.mjs --check`** → `loc summary ✓  3 groups — no drift` (observed).
- **Two-lane fixture** has no `transcript.jsonl` (observed: `build`, `README.md` only).
- **Group numbering** (observed by `group(` order): canvas ops = 35, build package = 36, build handoff = 49, ratify
  = 50 is the last. 50 groups in all (the #316 report says `all 50 groups pass`).

### Loc

The runtime group is `^system/(wc/)?[^/]+\.(css|mjs|js)$`. Exact count on main: **81 files, 33,111 lines** (observed,
the generator's `split("\n").length`), and it rounds to 33,100 until 33,149. **Headroom: 38 lines.** Task 1.1's block
is 30 lines plus one leading blank line, so 31 are added and the count reaches **33,142** (derived), 7 under the flip.
The block was run as a module in pre-flight and gave the expected output. One-liner:

```
node -e 'const {execFileSync}=require("child_process"),fs=require("fs");const f=execFileSync("git",["ls-files"],{encoding:"utf8"}).split("\n").filter(p=>/^system\/(wc\/)?[^/]+\.(css|mjs|js)$/.test(p));console.log(f.length,f.reduce((n,p)=>n+fs.readFileSync(p,"utf8").split("\n").length,0))'
```

Run it after staging. At ≥ 33,150 the approach cascade in 7.1 is mandatory, in this PR. The alternative of moving
`staleFrames` out of `system/` fails, because the page imports it from `/system/canvas-ops.mjs` and the architecture
places it there.

### Rejected alternatives

- **Storing `stale` on the frame** contradicts D2 ("derived, never stored"), and undo would have to know about it.
- **A new `frame.reconfirm` op** is rejected because the count is final at fourteen and `frame.link` already
  replaces the list (`canvas-ops.mjs:470-471`, written for this ticket).
- **Computing stale server-side and shipping it in `/api/canvas/run`** would leave the page unable to clear the flag
  after a re-confirm without a reload, and it would make two code paths.

### Traps carried from memory (verified against the files named)

- loc-summary cascade + `rm` before `update:docker`; VR update reads the dirty tree; `--check` before staging lies
  (Task 7.1).
- Gate prose has three copies (Task 8.1).
- An env var leaking from `portal/.env` into journey children (Task 6.1: do not import `discovery.mjs`).
- Portal smoke: kill your own PID only (Level 4).
- Shared worktree: verify the branch before committing and stage by path (branch step).
- The owner merges fast: check `gh pr view --json commits` before building on "merged".

## AMENDMENTS


- 2026-10-01 — confidence raised to 10/10, and every risk closed (RISK REGISTER): the 1.1 block is pinned verbatim
  and measured (31 lines → 33,142), it was re-run against the real applier, Step 0 makes a green baseline mandatory,
  7.1 expects an exact count with a verified fallback, and 9.1's follow-up ticket body is drafted verbatim.
