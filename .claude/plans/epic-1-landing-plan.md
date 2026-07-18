# Epic #1 landing plan — merge the stranded lineages to main

**Execution prompt for a fresh session.** Everything below was established by the 2026-07-18 full ticket audit (companion doc: `.claude/reports/epic-1-ticket-audit.md`). Execute the phases in order; each has its own verify gate. Background you must NOT re-derive from GitHub PR states alone: PRs #19/#20/#21 were merged into feature branches ~30s AFTER those bases had already merged to main, so their content never reached main — GitHub's "merged" badges are misleading here.

## Context: exact repo state this plan assumes (preflight-check it)

Working dir: `/Users/Berzins/Desktop/Linards_current/ux-factory`, checked out on `feature/agentic-bridge`, SHARED by parallel sessions and dirty (see "orphaned cluster" below). A user worktree `../ux-factory-wt-12` (feature/portability-proofs) exists — never touch it.

Branch tips (verify with `git fetch && git rev-parse --short <ref>`; if any moved, re-derive that phase before proceeding):

| Ref | Tip | Contains |
|---|---|---|
| origin/main | 6383569 | tickets #2 #3 #4 only |
| origin/feature/agentic-bridge | ed95c64 | snapshot 4a3997b (#7 copy + #8 WIP components) + #11 (00ae849) + renderer fixes (975224f, ed95c64). NO #8 proto pages |
| origin/feature/data-connected-prototypes | c0aa631 | snapshot + #8 proto pages (c580617, 8e3c899) + PR #21 merge of #11. NO 975224f/ed95c64, NO trace |
| origin/feature/trace-recorder-player | 82cea6b | agentic-bridge + #5 (recorder, player, traces/, tooling curate/validate) |
| origin/feature/handoff-data-layer | fb7da6b | #7 canonical (d656f05) + #12 (b2df328, 2e01a10 via PR #20). Forked from 9395c7c — NOT ancestor-related to lineage A; carries a DIVERGED copy of the handoff layer |
| origin/feature/site-shell-ia-analytics | 0700c7d | #6 (five-page IA + analytics) |
| origin/feature/scenario-packages-worker-mock-api | faf7f2a | content subset of data-connected-prototypes — needs no landing, ignore |

Open PRs:
- **#23** agentic-bridge → data-connected-prototypes (commits 975224f + ed95c64). BLOCKED by a MEDIUM (phase 1). Any new commit pushed to feature/agentic-bridge joins this PR automatically.
- **#24** trace-recorder-player → agentic-bridge. Has had NO review round (zero reviews/comments).
- **#22** site-shell-ia-analytics → main. Reviewed (advisory approve, 4 Lows fixed in 0700c7d); will grow a CLAUDE.md conflict once main moves.

Merge dry-runs already performed (2026-07-18): trace→main = ONE trivial CLAUDE.md hunk (both sides appended architecture-map lines; resolve as union). site-shell→(main+lineage A) = same, ONE CLAUDE.md hunk. handoff→(main+lineage A) = **14 conflicts**, listed in phase 6.

**Orphaned uncommitted cluster** in the working dir (exists NOWHERE in git — do not lose it):
- `system/components.css` — vd-/fw- layout fixes (display:block on plant text lines, `.vd-screen-body > * { flex:none }` with comment, fw-job grid→flex-wrap rework)
- `system/specs/{care-task-row,plant-card,primary-button,screen-header,stat-tile,status-chip}.md` — head `status: "spec"` → `"shipped"` (6 files)
- `docs/epics/ai-first-ux-factory.architecture.md` — Fieldwork slot-boundary open question checked off with the settled call dated 2026-07-17 (#8)
- `handoff/verdant/pack.json` — stale regen; NEVER commit as-is, regenerate in phase 3
- `CLAUDE.md`, `_headers` — byte-identical to their content in commit 82cea6b; they become no-op after PR #24 merges (verify they vanish from `git status`)
- `.claude/plans/*` (5 modified), `.claude/reports/*` (4 files), `.claude/code-reviews/*` (7 files), `.agents/code-reviews/*` (1 file) — session docs, commit as a docs commit
- `proto/`, `traces/`, `trace.html`, `portal/lib/trace-recorder.mjs`, `portal/record-trace.mjs`, `tooling/curate-trace.mjs`, `tooling/validate-trace.mjs`, `system/specs/demo-notice.md` — untracked HERE but committed on other branches (proto/ on data-connected-prototypes; the rest in 82cea6b). After phases 2–4 they become tracked; diff WT copies vs committed and reconcile deliberately if drifted
- `contact-1440.png`, `work-1440.png` — QA screenshots at repo root; delete, never commit

## Guardrails (hard)

1. **Shared worktree:** run `git branch --show-current` immediately before EVERY commit; stage by explicit path only — never `git add -A` / `-u`.
2. **Generated files are regenerated, never hand-merged or hand-edited:** `handoff/verdant/pack.json`, `handoff/verdant/vocabulary.json`, `handoff/verdant/contracts/*`, `handoff/verdant/tokens/*`, `system/tokens.contract.css`, `system/tokens.neutral.css`.
3. **Honesty contract:** never edit anything under `traces/` — a bad trace is fixed by re-running, never editing.
4. One atomic commit per phase; message = what + reference (repo convention).
5. Validation = run the surface touched (no test suite exists). The **full gate** (used at each landing): `node agent-layer/gen-token-css.mjs --check` · `node agent-layer/gen-handoff.mjs && node agent-layer/gen-vocabulary.mjs && git diff --exit-code -- handoff/` · `node scenarios/validate.mjs` · `node tooling/validate-trace.mjs` · `node --check` on every touched `.mjs`.

## Phases

### Phase 0 — preflight
Fetch; verify the branch-tip table above; confirm the orphaned cluster still shows in `git status`. Any mismatch → stop and reconcile against `.claude/reports/epic-1-ticket-audit.md` before continuing.

### Phase 1 — fix the safePhotoUrl MEDIUM (unblocks PR #23)
On `feature/agentic-bridge`. Finding (round-2 review, `.claude/code-reviews/pr-23-review.md` in the working dir): `system/agentic-renderer.mjs:191-192` — the regex only rejects forward `//`, so backslash variants (`\\evil.example`, `/\evil`, `\/evil`) and leading C0-control bytes (`\x01//evil`) slip through while the WHATWG parser resolves them to an external host (image-beacon class). Apply the review's `new URL`-based one-line fix (parse against a local base; accept only same-origin/relative results or explicit http(s) if that's what the review prescribes — follow the review file). Re-run the renderer's refusal battery style check: quick node script feeding the bypass strings through `safePhotoUrl`, expect all refused, plus a happy-path relative URL accepted. `node --check system/agentic-renderer.mjs`. Commit (explicit path) + push. Comment on PR #23 that the residual is fixed.

### Phase 2 — review round for PR #24, then merge it
PR #24 = trace recorder + player (#5). Run the repo's PR review convention (`/piv-review-pr 24`). Two known non-blocking gaps to fold into any fix commit (on `feature/trace-recorder-player`):
- `traces/README.md:102` still documents the plan-era start-anchored `[[piv:]]` regex; the shipped recorder matches marker-alone-on-any-line, last-marker-wins (`portal/lib/trace-recorder.mjs:23,108-112`). Fix the README (docs change — does NOT touch trace content).
- (Deferred to phase 8: post the spike-5 verdict to issue #5.)
The audit already verified all five ACs incl. byte-level honesty-contract compliance, so expect a clean review. Address any new findings, push, then **merge PR #24** (into feature/agentic-bridge). Pull locally.

### Phase 3 — commit the orphaned cluster on feature/agentic-bridge
After the #24 merge, `CLAUDE.md`/`_headers` mods should have vanished from `git status` (they matched 82cea6b) — verify. Then, staging by explicit path:
1. Commit A: `system/components.css` + the 6 spec status bumps + `docs/epics/ai-first-ux-factory.architecture.md` — message: `fix: proto component layout + spec status shipped + slot-boundary decision recorded (#8 follow-up)`.
2. Regenerate: `node agent-layer/gen-handoff.mjs && node agent-layer/gen-vocabulary.mjs` (agentic-bridge's generators; demo-notice.md with `contract: null` now exists — confirm the ✓ lines report 7 specs). Commit B: regenerated `handoff/verdant/` — message: `chore: regenerate handoff pack + vocabulary (spec statuses + demo-notice)`.
3. Commit C (docs): `.claude/plans/*`, `.claude/reports/*`, `.claude/code-reviews/*`, `.agents/code-reviews/*`.
4. Delete `contact-1440.png`, `work-1440.png`.
Optional fold-in while here (#2 residual): retire the stale `GENERATED MIRROR` headers at `system/components.css:1` and `system/tokens.saulera.css:1` (both are hand-maintained canon now). Push. (These commits join PR #23 — intended.)

### Phase 4 — merge PR #23
PR #23 (agentic-bridge → data-connected-prototypes) now carries: renderer fixes + safePhotoUrl fix + trace work + the cluster. Merge it. `feature/data-connected-prototypes` is now the COMPLETE lineage A.

### Phase 5 — land lineage A on main
New PR: `feature/data-connected-prototypes` → `main` (there is no open PR for this — create it; title it as epic-#1 integration, body links the audit report). Expected conflict: the one CLAUDE.md architecture-map hunk — resolve as union (keep both sides' lines in map order). Run the **full gate** on the merge result before merging. Merge.

### Phase 6 — hand-merge the handoff branch into main
On an integration branch (`git checkout -b integrate/handoff-data-layer origin/main && git merge origin/feature/handoff-data-layer`). Expected 14 conflicts and their resolutions:

| Path(s) | Resolution |
|---|---|
| `system/specs/{care-task-row,plant-card,stat-tile}.md` + `.contract.json` (6 AA) | **take main's (lineage A)** — evolved content: care-task-row `action`→`type` + `done` field, real mock-API sample records, shipped statuses |
| `agent-layer/gen-handoff.mjs` (AA) | **take the handoff branch's** — it has the #12 pack mechanics (copies `wc/` + README + `figma-import.md` into the pack, emits the `portability` block). FIRST diff both versions to confirm lineage A's copy has nothing unique the regen wouldn't cover; if A added logic (e.g. around `contract: null`), port it in |
| `agent-layer/build.mjs` (UU) | union — keep A's `gen-vocabulary` registration AND B's registrations, both ✓ lines |
| `CLAUDE.md`, `.gitignore` (UU) | union of both sides' lines |
| `handoff/verdant/pack.json` + `handoff/verdant/contracts/*` (4 AA) | resolve arbitrarily, then **regenerate** (`node agent-layer/gen-handoff.mjs && node agent-layer/gen-vocabulary.mjs`) and commit the generated output — never text-merge |

No conflict expected (identical or one-side-only): `status-chip.*`, `primary-button.md`, `screen-header.md`, `kb-format.md`, `agent-layer/lib.mjs`, SD token builds, `system/wc/`, `tooling/wc-sandbox/`, `tooling/figma/`, `handoff/verdant/wc/`, `figma-import.md`.

Critical check: the merged `gen-handoff.mjs` must handle all 7 specs including `demo-notice.md` (`contract: null`) — expected ✓ line: 7 specs + 3 token targets + 3 wc wrappers. Run the **full gate**. Optional fold-in (#12 nit): add `FIGMA_TOKEN`/`FIGMA_FILE_KEY` placeholder lines to `portal/.env.example`. PR → main, merge.

### Phase 7 — merge PR #22 (site shell)
Update the branch: merge `main` into `feature/site-shell-ia-analytics` locally, resolve the one CLAUDE.md union hunk, push. Sanity: pages still load the four CSS layers; `node --check system/analytics.mjs`. Merge PR #22.

### Phase 8 — close-out on GitHub
1. Issue #5: post the spike-5 verdict as a comment (source: `.claude/plans/trace-recorder-player.md` §AMENDMENTS — "SHIP the pattern", tuning history, ~$3.3 spike cost), then close referencing PR #24.
2. Issue #6: close referencing PR #22.
3. Epic #1: comment a landing summary (all of #2–#8, #11, #12 now on main; #9, #10, #13, #14, #17, #18 remain).
4. Optional cleanup: delete fully-landed remote branches (`live-derivation-engine`, `scenario-packages-worker-mock-api`, `data-connected-prototypes`, `agentic-bridge`, `trace-recorder-player`, `portability-proofs`, `handoff-data-layer`, `site-shell-ia-analytics`) — skip `portability-proofs` if `../ux-factory-wt-12` still has it checked out.

### Phase 9 — final verification on main
Full gate (guardrail 5) + `node --check` sweep over `system/*.mjs` + portal boot (`cd portal && npm start`, `/api/health` answers). Do NOT deploy — `npx wrangler pages deploy` is a separate, user-initiated step.

## Out of scope
Tickets #9 (CI gates — not started), #10, #13, #14 (not started), #17/#18 (follow-ups). The Figma real run (issue #12 has resumption instructions; awaits FIGMA_TOKEN in `portal/.env`).
