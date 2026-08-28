# Canvas + design import — the pre-slice sequence

> Status: planning doc, 2026-08-28, written straight after `plan-architecture`. Altitude: sequence.
> Intent: `docs/epics/canvas-design-import.prd.md` · decisions: `docs/epics/canvas-design-import.architecture.md`.
> The slice (`piv-slice-epic`) is **not run yet** — owner's call, 2026-08-28. This doc orders what
> happens before it and names where each pre-slice item lives. Per-ticket plans come later, one per
> ticket, when picked up (repo convention).

## Where each item lives

| Item (from the architecture session's close) | Home |
|---|---|
| The composition grammar must grow (`children: many`) | `canvas-grammar-children-many.md` |
| T10 (compressed codec) deferred | `canvas-swap-pr-brief.md` § T10 |
| The baseline cascade (factory ×3 · approach ×2 · components per primitive and per admission) | `canvas-baseline-cascade.md` |
| #280's transport verdict is inherited, not re-run, and unposted | this doc § Step 3 |
| The swap PR is one one-way PR, S1 before it is written | `canvas-swap-pr-brief.md` · `canvas-spike-s1-substrate-load.md` |
| Run S1 first | `canvas-spike-s1-substrate-load.md` |
| The Plus UI removal PR | `canvas-plusui-removal.md` |
| `/piv-slice-epic …` | this doc § Step 5 (not yet) |
| Refine any call before slicing | this doc § Step 4 |

## The sequence

Each step names its verify. Nothing below writes code except steps 1 and 2, and both are two-way.

**Step 0 — land the docs.** The PRD, the architecture doc and these six plans are uncommitted on `main`
(observed: `git status` at session start shows the PRD untracked and the briefing modified). Docs-only
PR, the #294 shape. → verify: PR merged; `drift-check` green (it syntax-checks every tracked `.mjs`,
`.claude/plans/` included — nothing here is `.mjs`).

**Step 1 — the Plus UI removal PR** (`canvas-plusui-removal.md`). Its own PR, before anything else,
so the epic starts with no ported pack on the board (G11). → verify: `git grep -il plusui` returns only
history and docs; 27 groups green; `studio-journey all` green; approach baselines regenerated.

**Step 2 — S1, the substrate under load** (`canvas-spike-s1-substrate-load.md`). Half a day, throwaway
harness, three engines, the INP gate's own observer. → verify: `.claude/plans/canvas-spike-s1/README.md`
records the numbers per engine and names the decision-rule branch taken.

**Step 3 — inherit #280, on the record.** #280 (op transport: in-process SDK tool vs the fenced CLI
shape) is #279's spike 1, still open with no comment (observed 2026-08-28). This epic does not re-run it.
Post one comment on #280 now, so the dependency is visible from the discovery side:

> The canvas + design-import epic (architecture decided 2026-08-28) inherits this verdict rather than
> re-running it. Its compose loop, import run and ratify route are written to the applier, so the verdict
> changes one transport file and CLAUDE.md's dependency line, nothing else. Until it lands, that epic's
> spine assumes the in-process tool with the CLI shape as fallback. Spike C already showed the recorded run
> reaches the Brilliant MCP in process (`.claude/plans/design-import-spike-c/README.md` Q3); that is the
> MCP read, not the op write, so it does not settle this.

When the canvas epic issue exists, the same note goes on it with a link back. → verify: the comment is on
#280; when #280 closes, the branch taken is copied into the canvas epic's body.

**Step 4 — the refinement window.** Cheapest calls to move now, before tickets exist: the op count and
names (fourteen is a starting point); the `import/` directory name; `canvas.html` as a module page versus
an SPA route; the preset widths. Costliest to move later: the override shape, `canvas-ops.mjs` as a
sibling of `board-ops.mjs`, `ops.jsonl` as the truth. Anything moved is edited in the architecture doc,
not carried in chat. → verify: the architecture doc's footer date is bumped if anything changed.

**Step 5 — slice (not yet).** When the owner says so:

```
/piv-slice-epic docs/epics/canvas-design-import.prd.md docs/epics/canvas-design-import.architecture.md
```

Inputs the slicer needs beyond the two docs: the architecture's § For slicing (the "every ticket carries"
table, the two concurrency rules, the close-out ticket created at slicing, the spike-verdict-before-
dependent-planning rule) and the pre-slice plans here. The tickets these plans expect to become, in
dependency order: Plus UI removal (may already be merged) · S1 (may already be run) · the grammar change ·
`stack` + `text` through the chain · **the swap PR** (the one-way door, `canvas-swap-pr-brief.md`) · then
the width: `list` · `icon` + `gen-icons` · `choice` · `canvas.html` + the run list · `canvas-store` ·
`import/` + the Brilliant converter + the matcher · S5 + the Figma plugin + converter · `import-run` ·
proposals + `ratify` · compose-and-name + promote · S6 + `canvas-session` · the handoff extensions · the
close-out.

**Step 6 — after slicing.** The swap PR's ticket gets its `piv-plan-implementation` pass from
`canvas-swap-pr-brief.md`; the brief is the input, not the plan.

## What this sequence deliberately does not wait for

`#281` (the discovery package format) — the build package lands inside `discovery/<slug>/`, and the
architecture's open question names the rule if #281 has not merged when the swap PR needs the folder: the
swap PR writes the `build/` section of `discovery/README.md` itself and #281 rebases. `#291` (run 1's
PRD) — the stand-in brief stands in (G23). `#288` (the discovery portal UI) — `canvas.html` is a separate
module page and shares nothing with it but the SPA's link.
