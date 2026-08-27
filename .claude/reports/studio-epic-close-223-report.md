# Implementation Report — Studio epic close: audits, live-metric tool, hallway round 3 (#223)

**Plan**: `.claude/plans/studio-epic-close-223.md`   **Branch**: `feat/223-epic-close` (worktree
`ux-factory-wt-223`, cut from `origin/main` @ 9cd9696)   **Status**: PARTIAL — everything
machine-doable is done and validated; the four remaining items are operator/owner-gated by design
(deploy OK, live run, human sessions, and the close that depends on them).

## Summary

Phase A's four desk audits ran and are recorded as evidence, not assertion, in
`docs/hallway-notes/round-3-studio/findings.md`: every claim number on the eleven shipped pages
traced to a generated artifact or an enforced constant, all seven page-feeding generators re-run
with an empty diff, the 46+4 param-manifest entries walked against the #204–#221 control surface
with no gap, and the honesty contract walked surface by surface with every verdict ✓. One finding
(F1, fixed in this PR): `studio.html:76` still described shipped tickets #217/#221 as future work.
Phase B's tool `tooling/live-metric-audit.mjs` is written, rehearsed green locally (17/17), and its
stale-deploy guard proven against the real live state (404 → exit 1). Phase C's session
kit — `TEMPLATE-studio.md`, the round dir, the runbook section — is ready for the owner's bookings.

## Tasks completed

- Branch cut clean off `origin/main`, not the shared tree's parallel-session state → `feat/223-epic-close`
- Number sweep (159 filtered hits triaged; table in findings.md) → no untraceable number; verified by running: QUESTIONS = 7 hooked + 3 shaping, `aa.pairs.length` = 12, `MAX_EXPORT_BYTES` = 32 MB
- Generator drift re-run (all 7 incl. `gen-pack-bundle`) → `git diff --stat` empty
- Param-manifest coverage sweep → no gap; the one candidate (inspector playground specimens) examined and rejected with reasoning recorded — the compiled canvas only holds the three non-interactive primitives, so the specimen is always inert and excluded by the manifest's own rules
- Honesty-contract walk (fictional labels · verbatim run/projection labels · provenance flips · export split · frames caption · chips · no analytics-recording claim) → all ✓, table in findings.md
- Cuts-contradiction sweep → F1 found and fixed: `studio.html` (UPDATE, copy only, off-nav page — no VR cascade)
- `tooling/live-metric-audit.mjs` (CREATE) — chromium, pushState+replaceState wrapped pre-module, three pages (take-over mid-replay / keep rail ×2 clicks each / export-cannot-assemble via main-frame-only vocabulary block), beacon-dark assertion, stale-deploy guard, launch re-run instructions in the header
- `docs/hallway-notes/TEMPLATE-studio.md` (CREATE) — Part 1 = the v3 90-s script verbatim; Part 2 = 5 silent studio minutes with Wheel?/Keep? WRONG-if columns and the two closing questions
- `docs/hallway-notes/round-3-studio/README.md` + `findings.md` (CREATE) — the round contract + the audit record
- `docs/hallway-runbook.md` (UPDATE) — appended §Round 3 (recruitment bar, ≈10 min, live-site default, prompt-names-the-page-never-the-capability, the fix-or-defer rule)

## Tests added

No test suite exists (CLAUDE.md). The committed audit script is itself the test artifact:
`live-metric-audit.mjs` local rehearsal **17 passed / 0 failed** (observed), including the
fire-once, restore, settledUrl-before-flip, failed-export-fires-nothing and beacon-dark cases.

## Validation results

- `node --check tooling/live-metric-audit.mjs` — clean (observed)
- `node tooling/build-checks.mjs` — all 27 groups pass (observed)
- Drift block (7 generators + `git diff --stat`) — empty (observed)
- `BASE=http://127.0.0.1:4823 node tooling/live-metric-audit.mjs` — 17/17 (observed)
- `node tooling/live-metric-audit.mjs` vs stale pages.dev — guard fires, exit 1 (observed)
- VR baselines: untouched — no at-rest change to any VR-gated page (studio.html is outside the VR set)

## Deviations from the plan

- **`gen-pack-bundle.mjs` added to the drift re-run** — the plan's list omitted it, but it feeds
  the /handoff download; ran clean.
- **The take-over page also asserts `data-provenance="visitor"`** — one extra line beyond the
  plan's four steps, because it is the cheapest observable proof the route fired from the handover
  *success path* rather than from any push.
- **Export-fails edge case implemented live** (the plan left it optional) — a main-frame-only
  route block was cheap and it is the metric's one forbidden direction.
- **Phase E not pre-drafted** — the closing notes and the #202 cuts comment must settle the
  hallway row and fold in "anything Phase A/C surfaced", so writing them before Phase C would
  either oversell or need rewriting. Deliberate sequencing, not an omission.

## Issues encountered

- Fresh worktree needed `npm ci` in both `tooling/style-dictionary` and
  `tooling/visual-regression` (known from memory; done).
- My cleanup `pkill -f serve.mjs` was broader than my own port-4823 server and may have stopped a
  parallel session's server on 4757 — restart with `node tooling/visual-regression/serve.mjs` if
  one was in use.

## Waiting on the owner (never silently skipped — #177's ghost)

1. **Q3 — Deploy OK**: `npx wrangler pages deploy . --project-name factory-ux --branch main` from
   clean merged main, then `curl -sI …/system/studio-keep.mjs` → 200.
2. **Live run**: `node tooling/live-metric-audit.mjs` — log pastes into findings.md §Metric audit (AC2).
3. **Q2 — Book 3–5 cold testers** (the long pole; start now) → sessions → findings → Phase D
   fix-or-defer (AC1).
4. **Phase E**: cuts comment on #202, closing notes in both epic docs, epic close on the owner's
   verdict (AC5, AC6).
