# Roadmap — finishing the open GitHub issues

> Status: planning doc, 2026-07-20. Scope = the 8 open issues in
> [linardsb/ux-factory/issues](https://github.com/linardsb/ux-factory/issues).
> Altitude: roadmap. Each BUILD ticket gets its own `piv-plan-implementation` pass
> when picked up (repo convention: just-in-time per-ticket planning). This doc decides
> *what needs to happen and in what order*, not the task-by-task breakdown.

## TL;DR — what "finish" actually means here

Only **4 of the 8 open issues are buildable work**; the rest are deferred-until-trigger
reminders, latent-hardening notes, or epic trackers that close when their children land.
The real remaining feature work is **#43 → #44**, which completes epic #38. Everything
else is a small fix, a decision, or a close.

| # | Title | Disposition | Blocks on |
| --- | --- | --- | --- |
| **#43** | Private-instance shell (epic #38) | **BUILD** | nothing — unblocked now |
| **#44** | Per-company build + unlisted deploy (epic #38) | **BUILD** | #43 |
| **#56** | gen-loc-summary reads working tree | **BUILD** (clean bug fix) | nothing |
| **#57** | PR #53 deferred polish (L1, L3) | **BUILD** (trivial) | nothing |
| **#57** | PR #53 deferred polish (L2 label humanize) | **BUILD now** (decided) — standalone, pay factory baseline regen | nothing |
| **#32** | Verification-gate latent gaps (L4 now, L3 → ticket) | **BUILD L4 now / L3 = new ticket** (decided) | nothing |
| **#18** | PR #16 follow-ups | **NO-OP** — item 1 waits for a 3rd scenario; 2–4 done | trigger: a 3rd scenario |
| **#1** | Epic: ux-factory platform | **EPIC CLOSURE** | #18 disposition |
| **#38** | Epic: per-company brief layer | **EPIC CLOSURE** | #43 + #44 |

Verified state (2026-07-20): epic #1 children all closed (#2–#14, #17); epic #38 children
#39/#40/#41/#42 closed, **#43 + #44 open**. #43's seams and its #40 test-embed trace are
all present on disk (checked below).

---

## Bucket 1 — BUILD

### #43 — Private-instance shell (Factory-station variant) · ~600–1000 lines
The Factory-station variant a hiring manager opens on an unlisted link: real-brand honesty
labeling, the shared wizard pre-seeded from a compiled company package, and the recorded
pack-seed derivation trace embedded ("agent proposes your design language from your own
product; the human gate decides").

**Unblocked — verified seams all exist:**
- `system/factory-intake.mjs` (33 KB shared wizard — *configure, never fork*)
- `factory.html` (9 stations — the layout the variant derives from)
- `system/trace-player.mjs` (embed target) · `system/derive.mjs` (live re-derivation)
- `agent-layer/gen-company-package.mjs` (#39's compiler — produces the package shape)
- `traces/pack-seed-verdant.jsonl` + `.raw.jsonl` (#40's committed trace — the test embed)

**Acceptance criteria (from the issue):**
- Shell renders from a **fictional test package** exercising the real-provenance labeling
  path (#39's format): honest labels present, wizard pre-seeded with reasoning shown,
  overrides re-derive live, embedded trace replays.
- No live LLM at view time; vanilla constraint holds; no public upload surface.
- Record the call on whether the replayed trace embeds product screenshots (epic open
  question — default yes on an unlisted link).

**Hard constraints (load-bearing, name them in the impl plan):**
- **Honesty contract** — the instance states plainly it is speculative work on the
  company's *public* statements, sources linked, not affiliated/endorsed. Traces stay
  "real run, curated." This constrains the shell's copy and layout, it's not a label to
  bolt on last.
- **Wizard is shared, not forked** — pre-seed + bounds only.
- **Nothing company-real in this repo** — the fictional test package is what lands here.

**⚠ Open decision — does the shell page enter the VR baseline set?**
The visual-regression gate screenshots "the 8 shipped pages." #43 adds a new in-repo
test-surface shell page. Whether that surface is added to the VR capture set is a design
decision that changes this ticket's PR:
- *If captured* → the PR must regen baselines (`cd tooling/visual-regression &&
  npm run update:docker`) and any entrance animation must be gated behind a discrete-render
  class (memory: VR gate captures under *no-preference*; entrance anims on continuously
  rebuilt elements churn/blank).
- *If not captured* → simpler PR, but the shell has no visual-regression guard.
Decide this at plan time. Eyeball the new layout in a real browser regardless (memory: the
gate's bundled Chromium missed a real Safari/Chrome grid blowout).

→ Deliver via: `piv-plan-implementation #43` → implement on a `feature/` branch → PR → review.

### #44 — Per-company build + unlisted deploy from the jobs folder (folds spike 2) · ~400–800 lines
The build-orchestration + deploy path, run **from the jobs folder**, that turns a company
brief into a live unlisted instance — plus spike 2's privacy/ergonomics verification.

**Blocked on #43** (needs the shell to assemble an instance). Plan just-in-time once #43 lands.

**Acceptance criteria:**
- One command (or a short documented sequence) takes a jobs-folder brief → a live unlisted
  instance; the flow is **timed** (spike 2's ~10-minute decision rule).
- Deployed instance serves the noindex/security-header posture (`_headers`) and is verified
  non-discoverable.
- **Spike 2 decision + open-question resolutions recorded in
  `docs/epics/per-company-brief.architecture.md`** (access control on private links;
  route/naming convention). This write-back is itself an acceptance criterion.
- Nothing company-real committed — the scoped, deliberate exception to "deploy = commit the
  artifacts." The public site stays commit-is-deploy.

**Seams:** `agent-layer/build.mjs` (run-from-jobs-folder pattern) · `_headers` · the deploy
command in CLAUDE.md (`npx wrangler pages deploy`) · #39's compiler output + #43's shell.

**Note:** deploy is human-triggered, never CI. Spike work uses throwaway *fictional* content.

### #56 — gen-loc-summary reads the working tree · small, clean fix
**Confirmed live bug.** `agent-layer/gen-loc-summary.mjs` lists files via `git ls-files`
(line 33) but reads *contents* from the working tree (`readFileSync(join(ROOT, f), …)`,
line 42). In a shared worktree, a parallel ticket's uncommitted edits get baked into the
committed artifact — this already happened at `f2b54d2` (~100 phantom lines, fixed by a
clean-tree regen in PR #54). The local `--check` can't catch it (dirty-vs-dirty agrees;
only CI's clean checkout goes red).

**Fix (issue's option A, preferred):** read committed/index blobs instead of the working
tree — `git show :<path>` (index) or `git show HEAD:<path>` — so the artifact always
reflects tracked content. Then regen `system/loc-summary.json` **on a clean tree** and
confirm the numbers are unchanged from HEAD. Independent of everything else; do it anytime.

→ Small enough for a direct fix + `node agent-layer/gen-loc-summary.mjs --check`, or a
`piv-plan-implementation #56` if you want the regression test scoped.

### #57 — PR #53 deferred polish: the trivial parts (L1, L3)
- **L1** — `trace.html:81` copy doesn't mention the focus-first requirement of scoped
  arrow-key stepping (the player responds only once focused). One-line copy add.
- **L3** — `system/derivation-roundtrip.mjs` `accordion()` emits an unused `rt-acc` hook
  class (no CSS targets it). Delete the dead class.

L1 touches `trace.html` copy → check whether it invalidates that page's VR baseline (a copy
change at rest does). L3 is JS-only, no visual change. → Fold both into a small polish PR
(possibly the same PR as the L2 decision below).

---

## Bucket 2 — DECISIONS (resolved 2026-07-20)

### #57 L2 — humanize round-trip check labels → **DO NOW, standalone**
Raw camelCase keys (`bodyInRange`, `multiplesOf4`) render as reader-facing labels in the
round-trip exhibit's checks rows (`system/derivation-roundtrip.mjs` checksRow). **Decided:**
fix now in the Phase A polish PR and pay the factory.html VR baseline regen
(`npm run update:docker`). Combine with #57 L1/L3 in one polish PR.

### #32 — Verification-gate latent gaps → **L4 now, L3 = new ticket**
Both are latent (neither precondition exists today). **Decided:**
- **L4** (comment-blind token-lint) — do now: strip `/* … */` before matching in
  `tooling/token-lint.mjs` (`declaredTokens()`/`varsIn()`). One-liner; folds into Phase A.
- **L3** (drift-check can't catch a stale handoff sidecar) — **file a new small design
  ticket**: `gen-handoff.mjs` never deletes a sidecar for a removed spec, and naive
  `rm -rf handoff/verdant` would wrongly delete the deliberately-unwritten `figma-parity.json`.
  Needs a tracked manifest of generator-owned paths. Not built now; tracked for later.
  After L4 lands, #32 can be closed with a pointer to the new L3 ticket.

---

## Bucket 3 — NO-OP / keep as trigger

### #18 — PR #16 follow-ups
Items 2–4 were resolved in PR #30 (per the issue comment). **Only item 1 remains** —
`scenarios/validate.mjs`'s verdicts-must-differ check is exact only for N=2; strengthen to
pairwise-distinct *when a 3rd scenario lands*. Nothing to build today. Keep #18 open as the
standing reminder for that trigger, or close it with a note pointing at
`scenarios/validate.mjs` — owner's preference. No code action either way.

---

## Bucket 4 — EPIC CLOSURE (define the close criteria explicitly)

### #38 — Epic: per-company brief layer
Closes when **#43 and #44 land** (its only open children). #44 also owes an architecture-doc
write-back (spike 2 decision + resolved open questions). On close: check the epic body's
ticket boxes and post a landing-summary comment (same pattern as #1's landing comment).

### #1 — Epic: ux-factory platform
Functionally **complete** — all feature children closed. Closes once **#18's disposition is
settled** (its only remaining thread). On close: post a final landing comment. Note the epic
body's checkboxes are stale (they read unchecked though #2–#14/#17 all shipped) — tidy or
leave, cosmetic only.

---

## Cross-cutting constraints (apply to every BUILD ticket)

- **VR baseline trap** — any at-rest layout/copy change to a captured page invalidates its
  committed baseline; regen with `cd tooling/visual-regression && npm run update:docker` in
  the *same* PR. Local gates don't render pages, so they can't catch it — CI goes red.
  Directly relevant: #43 (new shell), #57 L1/L2 (copy on trace.html/factory.html).
- **VR gate is single-engine** — its bundled Chromium has missed real Safari/Chrome grid
  blowouts; eyeball any new layout (#43) in a real browser, add `min-width:0` to grid/flex
  items holding wide content.
- **Entrance anims + no-preference capture** — the VR gate captures under *no-preference*,
  and entrance animations on continuously-rebuilt elements restart-and-blank; gate any
  entrance animation behind a discrete-render class, not just `prefers-reduced-motion`.
  Applies if the #43 shell animates.
- **Honesty contract (hard)** — #43 real-brand labeling; #44 "nothing company-real
  committed." Load-bearing on design, not a finishing label.
- **Shared worktree / parallel sessions** — verify the branch right before committing, stage
  by explicit path, use a temp worktree for off-branch commits. #56 exists *because* of this
  hazard.
- **Validation = "run the surface you touched"** (this repo has no pytest/lint/type suite):
  portal boots + `/api/health` answers; a generator prints its `✓` / `--check` line; a page
  renders under the neutral pack. The PIV skills' Python defaults don't apply here.
- **Per-ticket JIT planning** — plan #44 only after #43 is *implemented*, not just sliced.

## Suggested sequence

1. **#43** (unblocked, dominates effort) — plan → build → PR → review. Settle the VR-capture
   decision at plan time.
2. **#44** (after #43 lands) — plan → build → deploy-spike → **write spike 2 results back to
   the epic doc** → PR.
3. **#56** — anytime, independent; a clean small fix. Good parallel/filler task.
4. **#57 L1 + L3** — trivial polish PR; ride L2 on the next factory.html change per the
   decision above.
5. **#32** — action L4 (one-liner) if desired; treat L3 per decision (defer or small ticket).
6. **Close #38** (after #43+#44), **close #1** (after #18 disposition), **dispose #18**.

## Folded-in motion work (decided 2026-07-20 — do after the issues)

Not in the issue tracker but **folded into "finishing"** per the owner's call. `.claude/plans/`
holds: `portfolio-ux-uplift.md` (phases 0–1 done, **2–4 proposed** — master doc),
`portfolio-motion-phase03-factory-showpiece.md`, `portfolio-motion-phase04-visual-richness.md`.
Execute **after** the 8 issues, sequential by phase:
- **Phase 2** (from `portfolio-ux-uplift.md`) → **Phase 3** (factory showpiece) → **Phase 4**
  (visual richness).
- Every phase touches shipped pages → **each PR regens VR baselines** (`npm run update:docker`)
  and gates entrance animations behind a discrete-render class (no-preference capture trap).
- Phase 3 touches factory.html — same surface as #57 L2. L2 is done standalone in Phase A, so
  no coupling; expect a second factory.html baseline regen when phase 3 lands.
- These plans open with a "validate patterns/token names before implementing" caveat — honor it
  (use shipped token/class names, not the parent plan's proposed ones).
