# Fix: the discovery drawer reports "Resumed" on a fresh existing-prd session (#383)

Filed from the PR #382 review (F2), epic #279. The issue body carries the root cause; this plan records
the fix shape and how it is proven. Base: `a8e8b19` (origin/main after PR #382).

## Problem

Opening a NEW existing-prd session through the drawer prints `Resumed <slug> from disk — 1 answer(s)
already recorded.` on its first open. It was a create. Blank-idea sessions are unaffected.

## Root cause (verified against `a8e8b19`)

- `portal/lib/discovery.mjs` `openSession`: the create path writes the head, then `appendDocument`
  files the audited document as answer `a1` (#286 D1), then returns `sessionView(root)`. The resume
  path returns `sessionView(root)` too. Nothing on the view says which path ran.
- `portal/public/portal.js` Start handler: the status line keys "Resumed" vs "Opened" on
  `answers.length`. A fresh audit already holds one answer, so every first audit open reads as a resume.

Reproduced before the fix by driving `openSession` twice on one slug under a temp `JOBS_DIR`: the
audit's first and second open both answer `{ answers: 1 }` with no distinguishing field.

## Decisions

- **D1** `openSession` returns `{ ...sessionView(root), created: true }` from the create path and
  `created: false` from the resume path. `sessionView` itself is unchanged, so the GET, turn and close
  routes never claim a create. The route already passes `openSession`'s return straight through.
- **D2** The drawer keys the status line on `session.created`. The resume line reports the cursor
  (`N of M answered`), the derived read the session line already renders, instead of `answers.length`,
  so a resumed audit with no turns never counts its document as an answer. Three shapes were offered
  in the issue (an op count, a non-document answer, a flag); the flag is the only one that tells a
  resume with zero turns from a create, because both counts are zero on both.
- **D3** The gate RUNS the create/resume path instead of pinning it from source. `JOBS_DIR` is an
  import-time const the gate process cannot repoint, so group 30 case 44 spawns a child node process
  with `JOBS_DIR` set to the group's temp dir and opens under real provenance: the package lands under
  the temp dir, nothing under `discovery/` or the jobs folder is touched, and the header's "a package
  is only written by a real session" rule holds. Group 30's summary drops the create/resume path from
  its cannot-reach list.

## Tasks

1. `portal/lib/discovery.mjs` — the two returns + the header sentence → verify: the probe answers
   `created: true` then `false` on one slug.
2. `portal/public/portal.js` — the status line → verify: source pin in case 44; a browser read.
3. `tooling/build-checks.mjs` — case 30.44 (child-process run, `sessionView` flagless, drawer pin), the
   group summary, the header index, the group header → verify: `build ✓ all 34 groups pass`, and each
   of four mutations turns case 44 red.
4. `.claude/references/gates.md` — group 30's entry → verify: the sentence names what case 44 reaches.

## Validation

`node tooling/build-checks.mjs` · `node tooling/drift-check.mjs` · `node tooling/token-lint.mjs` · a
portal boot on a private port with a scratch `JOBS_DIR`, two POSTs to `/api/discovery/session` and one
GET · the drawer read in a browser (first open, then the same slug after a reload). No journey driver
or VR page covers the portal (architecture §Boundaries), so none applies.
