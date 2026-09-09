# Implementation Report — the discovery drawer's create/resume flag (#383)

**Plan**: `.claude/plans/discovery-created-flag-383.md`   **Branch**: `fix/383-created-flag`   **Base**: `a8e8b19` → `a8e8b19`   **Status**: COMPLETE

## Summary

`openSession` now says which path ran: its return carries `created: true` from the create path and
`created: false` from a resume, while `sessionView` stays flagless. The drawer's Start status line keys
on that flag, and its resume line reports the cursor's `N of M answered` instead of `answers.length`,
so an audit's stored document is never counted as an answer. Group 30 gains case 44, which runs the
create/resume path for the first time (in a child process over a temp `JOBS_DIR`) and pins the drawer.

## Tasks completed

- D1 → `portal/lib/discovery.mjs`: both returns of `openSession` + the header sentence (UPDATE)
- D2 → `portal/public/portal.js`: the Start handler's status line (UPDATE)
- D3 → `tooling/build-checks.mjs`: case 30.44, the group summary's added clause and its cannot-reach
  list, the file's header index, the group header (UPDATE)
- D3 → `.claude/references/gates.md`: group 30's entry (UPDATE)

## Tests added

No suite exists (`CLAUDE.md` §Ground rules). The gate is the test: case 30.44 —

- a child node process (`JOBS_DIR` = the group's temp dir, real provenance) opens an existing-prd slug
  twice and a blank-idea slug once, printing `{ created, answers, docs }` for each: `{true,1,1}`,
  `{false,1,1}`, `{true,0,0}` asserted, and the package proven under the temp dir and absent from
  `discovery/`;
- `sessionView` over that package proven to carry no `created` key;
- the drawer's Start status statement (anchored on its `Resumed ${slug}` template, walked back to the
  assignment) proven to read `discovery.session.created` and never `answers.length`.

## Proving the checks

Red before the fix (observed): a probe script driving `openSession` twice on one existing-prd slug under
a temp `JOBS_DIR` against the unfixed tree printed
`auditCreate {"answers":1,"hasKey":false}` and `auditResume {"answers":1,"hasKey":false}` — the two
opens indistinguishable, which is the defect.

Each mutation applied to the working tree, `node tooling/build-checks.mjs` run in full, the file
restored byte-identical (asserted by the mutation script). All observed; baseline and restored both
`build ✓ all 34 groups pass`, exit 0.

| Mutation | Result | Message |
|---|---|---|
| M1 create return loses its flag | **RED**, 2 failures | `case 44: an audit's FIRST open must answer created: true beside its one document answer — got {"answers":1,"docs":1}` and the blank-idea twin |
| M2 resume return loses its flag | **RED** | `case 44: the same slug's SECOND open must answer created: false with the one answer untouched — got {"answers":1,"docs":1}` |
| M3 `sessionView` grows a `created` key | **RED** | `case 44: sessionView carries \`created\` — only openSession knows which branch ran …` |
| M4 the drawer keys on `!answers.length` again | **RED**, 2 failures | `case 44: the Start status line does not key on the server's created flag — got …` and `… still reads answers.length …` |

M4's first run went red on the case's "re-pin before trusting it" line rather than the substantive one,
because the anchor included the exact expression. The anchor now sits on the `Resumed ${slug}` template
and walks back to the assignment; M4 re-run went red on both substantive lines (observed, above).

## Validation results

All observed, from the worktree at `a8e8b19` plus this branch's four staged files.

- `node tooling/build-checks.mjs` → `build ✓  all 34 groups pass`, exit 0 (three green runs on the fixed
  tree: after the comment reword, after the restore of the first four mutations, and after the re-anchor).
- `node tooling/drift-check.mjs` → `drift-check ✓  syntax · token-css · annotated-source · loc-summary ·
  param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay ·
  group-count`, run AFTER `git add` of the four files (gen-loc reads tracked content).
- `node tooling/token-lint.mjs` → `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`.
- `node agent-layer/gen-loc-summary.mjs` after staging → `loc summary ✓  3 groups`; `git status` shows
  `system/loc-summary.json` unchanged.
- Portal smoke: `PORT=4793 JOBS_DIR=<scratch> node server.mjs`, killed by PID. `/api/health` →
  `ok: true`, `bootSha a8e8b19…`. `POST /api/discovery/session` (real · existing-prd · grill · a document)
  → first `200 { created: true, answers: 1, cursor 0 of 6 }`, second `200 { created: false, answers: 1,
  cursor 0 of 6 }`. `GET /api/discovery/session` → keys `answers, cursor, document, escalation, head,
  ledger, metrics, transcript` — no `created`.
- Browser (agent-browser, the same server): drawer filled by hand — slug `browser-audit-383`, real,
  "An existing PRD — audit it", a pasted document, Grill — Start → `#discovery-start-status` reads
  **`Opened browser-audit-383.`** Page reloaded, drawer refilled with the same slug, Start →
  **`Resumed browser-audit-383 from disk — 0 of 30 answered.`**

## Not run

- No journey driver or VR page covers the portal (architecture §Boundaries) — not applicable rather
  than skipped.
- No paid SDK turn: no prompt, transport or fence text changed; the diff is two return statements, one
  status line and the gate.

## Deviations from the plan

None.

## Assumptions carried

- The issue offered three shapes (an op count, a non-document answer, a `created` flag). The flag was
  chosen because it is the only one that tells a zero-turn resume from a create; both counts read zero
  on both. The resume line's count changed with it (cursor instead of `answers.length`) — plan D2.
- Group 30's header says a package may only be written by a real session, and its summary listed the
  create/resume path as unreachable "(it writes a real root)". Running it in a child process over the
  temp `JOBS_DIR` keeps the header's letter (every root is a temp directory; nothing under `discovery/`
  or the jobs folder is touched) and turns the source pin into a run — plan D3.

## Additions beyond the plan

None beyond D3's own scope. The group summary's cannot-reach list lost one item as a consequence.

## Issues encountered

- Case 16 pins the word `branch` ABSENT from `portal/lib/discovery.mjs` (a former parameter, decision
  doc D5); the first draft of the new header sentence used it and went red. Reworded.
- In the browser, choosing "An existing PRD — audit it" reset the Depth select from Scope check back to
  Full discovery. That is the drawer's depth proposal per entry mode, not this ticket; noted only because
  a reviewer re-deriving the browser step will see "0 of 30" rather than "0 of 6".
