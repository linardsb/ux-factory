# Plan: the #338 finding fixes — the PRD in the UI, a portal that says which commit it is, a provenance with no default, and an evidence trigger

**Epic**: #279 · **Source**: the findings section of `.claude/reports/discovery-run-0-338-report.md` (on `chore/338-run-0`)
**Branch**: `fix/338-findings` off `origin/main` · **Scope**: F1, F2, F3 and the first half of F6. Not #338 Phase B.

## Why these four together

They are the four defects run 0's Phase A and its full-depth rehearsal found in the discovery chain,
and they share one shape: **each is a real hole that every gate in `tooling/` reported green over.**
The projection was CLI-only and group 31 was green. The portal was two days stale and `/api/health`
said `ok`. The provenance defaulted to the committing value and group 30 drove its refusals. Zero
evidence ops fired across 30 answers and groups 29, 30 and 31 all passed. That is
[[check-that-cannot-fail]] four times, so every fix here lands **with the check that would have
caught it**, and the F6 fix deliberately trips the one tripwire that already works.

F4 and F5 are closed (#343, #341/#342) and are verified here, not re-fixed. F6's second half is an
op-grammar change under the epic's op-verb lock and is filed as an amendment instead.

## What each fix is

**F1 — `GET /api/discovery/prd`.** A route branch in `portal/server.mjs` that folds
`projectPrd(readPackage(root))` and streams the markdown, plus a "Download PRD" control in the
drawer. `writePrd` is deliberately NOT imported: the read half is what the route needs, and an
absent import is a stronger guarantee than a careful call. Guarded by the same
`resolveRunRoot` + `assertProvenanceRoot` pair every other discovery route runs, so a `real` root is
refused identically and is never written to.

**F2 — two shas on `/api/health`.** `portal/lib/version.mjs` reads `BOOT_SHA` **once, at import** —
that is the commit the process actually loaded — and `headSha()` on every call. `stale` is the
difference. A single per-request `rev-parse` would report the tree's HEAD and call a stale process
fresh, which is the finding wearing a version number. Every git failure answers `null`; a stamp that
can take `/api/health` down is worse than no stamp.

**F3 — the provenance has no default.** A placeholder first option with an empty value, a Start
handler that refuses it before it POSTs, and a three-way note (a two-branch ternary renders the
`real` note under the placeholder, which is the opposite of true). The server is the second line and
already refuses: `""` is not in `PROVENANCES`, so `resolveRunRoot` throws by name.

**F6 first half — `EVIDENCE_RULE`.** An exported const in `portal/lib/discovery-postures.mjs`,
inserted into the system prompt **before `PARENT_RULE`, never after**: the parent rule holds the
recency tail on purpose and #341 bought that tail with a paid recording. The applier was never the
obstacle — `file_evidence` has taken a `ref` naming a stored answer since #281 — so what was missing
was the trigger.

## The gates that had to be added, and the one that had to fire

- Group 30 case 16 pins `EVIDENCE_RULE` verbatim, asserts it names both routes and forbids inventing
  evidence, and **asserts it sits before `PARENT_RULE`** — so a later prompt string appended rather
  than inserted goes red instead of silently costing the parent rule its tail.
- Group 30 case 20 drives the server's refusal of `""`, `null` and `undefined`, then source-pins the
  drawer with both controls (the pattern must match a planted string AND must not match the
  pre-change shape). Source-pinned because `portal.js` touches the DOM at module scope and cannot be
  imported into a Node gate; the group summary says so.
- Group 30 case 21 runs `isStale` over four pairs (unknown is not stale), source-pins `BOOT_SHA` to
  module scope, and proves the PRD route read-only — `writePrd` neither imported nor called.
- Group 32 **fires**: `EVIDENCE_RULE` moves `POSTURES.think.fingerprint`, so the committed parenting
  fixture goes stale by name. That is the tripwire working, and the price is a re-record.

## The re-record

Per `discovery/README.md` §The parenting fixture, and per CLAUDE.md's discovery-run rule: a REAL
session through the drawer, never a hand-written or hand-edited package. The twelve answers are the
SAME twelve, fixed before this prompt edit and re-supplied verbatim, so they cannot be tuned to the
new prompt's behaviour.

1. `--probe-parenting` twice — does the parent rule still hold with a string inserted above it?
2. Preserve `answers.jsonl`, `rm -rf discovery/instrument-loans-1`, restart the portal on `PORT=4748`.
3. Drive the drawer with the sheet; press Finish.
4. `node discovery/prd-projection.mjs instrument-loans-1`; `node tooling/build-checks.mjs`.

## Verification

`node tooling/build-checks.mjs` green over all 32 groups · `node tooling/drift-check.mjs` green ·
the portal boots and `/api/health` answers · the PRD route's bytes compared to the CLI fold's ·
allergen-matrix-1's `prd.md` read for F4/F5's `orphan 0`. No visual-regression run: nothing here
touches a shipped page, and `portal/` is never deployed.
