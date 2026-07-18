# Epic #1 ticket audit — features & functionality vs codebase

Date: 2026-07-18 · Scope: all tickets except #10, #13, #14 (not started) · Method: one audit agent per ticket in a detached worktree at the branch where the work actually lives, acceptance criteria verified by running the surfaces (generators, validators, live Worker, DOM-free smoke tests), plus merge dry-runs.

## Verdict table

| Ticket | State | Where the work lives | Audit verdict | On main? |
|---|---|---|---|---|
| #2 DTCG inversion | CLOSED | main | ✅ Correctly closed — zero-drift regen verified | ✅ |
| #3 Derivation engine | CLOSED | main | ✅ Correctly closed — 46/46 tokens, 11/11 WCAG, spike 2 recorded (88/88 AA) | ✅ |
| #4 Scenarios + Worker | CLOSED | main | ✅ Correctly closed — validator green, Worker live-tested, verdicts differ by construction | ✅ |
| #7 Handoff data layer | CLOSED | feature/handoff-data-layer (d656f05) | ✅ Correctly closed — zero drift, spike 4 recorded, all 3 SD targets | ❌ stranded |
| #8 Prototypes | CLOSED | feature/data-connected-prototypes (via PR #19) | ✅ Correctly closed — all ACs, token discipline clean, both review rounds addressed | ❌ stranded |
| #11 Agentic bridge | CLOSED | feature/agentic-bridge (via PR #21 + #23) | ✅ Correctly closed — 14/14 refusal battery, zero vocab drift | ❌ stranded |
| #12 Portability proofs | CLOSED | feature/portability-proofs (via PR #20) | ✅ Correctly closed — Outcome B, Figma real run honestly pending | ❌ stranded |
| #5 Trace recorder/player | OPEN | feature/trace-recorder-player (PR #24 open) | ✅ Ready — all ACs met, honesty contract byte-verified. Close after PR #24 merges | ❌ |
| #6 Site shell | OPEN | feature/site-shell-ia-analytics (PR #22 open) | ✅ Ready — all ACs met at head 0700c7d. Close after PR #22 merges | ❌ |
| #9 CI gates | OPEN | nowhere | ⛔ Not started — no gate scripts, no .github/workflows on any branch. Stays open | — |
| #17, #18 | OPEN | follow-ups | Stay open (accent-on-dark token; PR #16 low-severity leftovers) | — |

## The structural finding: main only has #2 #3 #4

PRs #19, #20, #21 were merged **into feature branches after those bases had already gone to main**, so their content never reached main. Two divergent lineages exist, both forked around snapshot commit 4a3997b / 9395c7c:

- **Lineage A** — 4a3997b (snapshot: #7 copy + #8 WIP components) splits into two sub-branches:
  - feature/data-connected-prototypes: + c580617/8e3c899 (**#8 proto pages**) + PR #21 merge (**#11**)
  - feature/agentic-bridge: + 00ae849/975224f/ed95c64 (**#11 + fixes**) → feature/trace-recorder-player: + 82cea6b (**#5**)
  - ⚠️ The #8 proto pages are NOT on the agentic-bridge/trace sub-branch, and #5 is not on the prototypes sub-branch — neither sub-branch alone is complete.
- **Lineage B** — feature/handoff-data-layer: d656f05 (**#7 canonical**) + PR #20 merge (**#12**). No PR to main exists.
- **Site shell** — feature/site-shell-ia-analytics (**#6**), PR #22 open against main.

Lineage A's snapshot carries its own copy of the handoff layer, which #8/#11 then evolved (care-task-row `action`→`type` + `done` field, real mock-API sample records, vocabulary.json). Lineage B's copy is ahead on pack mechanics (#12: wc/ wrappers in pack, figma-import.md, `portability` block in pack.json). **d656f05 is not an ancestor of lineage A** — add/add conflicts are guaranteed.

## Merge dry-runs (performed in a scratch worktree, discarded)

1. **feature/trace-recorder-player → main:** clean except ONE trivial CLAUDE.md doc hunk.
2. **feature/handoff-data-layer → (main + lineage A):** **14 conflicted files** — add/add on all specs, contracts, pack.json, gen-handoff.mjs, plus build.mjs / CLAUDE.md / .gitignore. Resolution direction (from the cross-lineage diff): take lineage A's spec/contract CONTENT + lineage B's gen-handoff #12 MECHANICS, then **regenerate** pack.json + vocabulary.json (`node agent-layer/gen-handoff.mjs && node agent-layer/gen-vocabulary.mjs`) — never text-merge generated files.
3. **feature/site-shell-ia-analytics → (main + lineage A):** clean except ONE trivial CLAUDE.md doc hunk.

## Blockers before merging

1. **PR #23 (agentic fixes): outstanding MEDIUM** — `safePhotoUrl` (agentic-renderer.mjs:191-192) still passes backslash variants (`\\evil.example`, `/\evil`, `\/evil`) and leading C0-control bytes (`\x01//evil`) that the WHATWG parser resolves to an external host (image-beacon class). Round-2 review on the PR recommends REQUEST CHANGES with a one-line `new URL`-based fix. Fix before merging #23.
2. **PR #24 (trace): no review round has happened yet** — zero reviews/comments. Run one before merge. Two non-blocking gaps: traces/README.md:102 documents the old start-anchored `[[piv:]]` regex (shipped recorder matches marker-alone-on-any-line, last-wins); spike-5 verdict lives in plan AMENDMENTS + PR body but was never posted to issue #5.
3. **Uncommitted work in the shared working dir, existing NOWHERE in git:**
   - `system/components.css` — vd-/fw- layout fixes (display:block on plant text, `.vd-screen-body > * { flex:none }`, fw-job grid→flex-wrap)
   - `system/specs/*.md` — six status bumps `spec` → `shipped`
   - `handoff/verdant/pack.json` — regeneration reflecting status bumps + the demo-notice spec (the spec itself IS committed in PR #24's commit)
   - `docs/epics/…architecture.md` — the Fieldwork slot-boundary design call, checked off and dated (#8's AC references this decision)
   - `.claude/plans/*`, review files for PRs 16/19–23, reports, two screenshots
   This cluster belongs to lineage A and must be committed before (or immediately after) landing, or it's lost.

## Recommended landing sequence

1. Fix the safePhotoUrl residual on feature/agentic-bridge; commit.
2. Merge **PR #24** (trace → agentic-bridge) after its review round.
3. Merge **PR #23** (agentic-bridge → data-connected-prototypes) — after step 2 it carries #11 fixes AND #5, making feature/data-connected-prototypes the complete lineage-A branch.
4. Commit the uncommitted working-dir cluster (step 3's branch or agentic-bridge before step 3).
5. New PR: **feature/data-connected-prototypes → main** (expect the one CLAUDE.md hunk).
6. Hand-merge **feature/handoff-data-layer → main** per the resolution direction above; regenerate pack + vocabulary; verify with a drift run.
7. Merge **PR #22** (site shell → main; one CLAUDE.md hunk).
8. Close **#5** and **#6**. #9, #10, #13, #14, #17, #18 and epic #1 stay open.

## Per-ticket residuals (non-blocking, from the audits)

- **#2:** stale "GENERATED MIRROR" headers survive in `system/components.css:1` and `system/tokens.saulera.css:1` on main (components.css is hand-maintained canon now).
- **#3:** spike-2 issue comment cites ruleset v1.0.0; shipped is v1.1.0 (post-review tightening; current run passes).
- **#4:** `system/scenario-data.mjs:20` memoizes a rejected registry-fetch promise for the page's life (review-acknowledged benign).
- **#8:** pre-existing `.ot-*` hex literals in proto.css predate the epic (not #8 work); spec prose example "watering due" vs emitted "due" (cosmetic).
- **#12:** Figma real run awaits FIGMA_TOKEN in portal/.env — resumption instructions recorded on issue #12; `portal/.env.example` lacks FIGMA_* placeholder lines (nit).
- **Process:** review rounds exist only as untracked `.claude/code-reviews/*.md` files — no GitHub review objects on PRs #19/#20/#21 (single-account repo; self-approval impossible).
