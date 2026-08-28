---
name: piv-slice-epic
description: Slice an epic (its PRD intent + its architecture decisions) into PIV-sized tickets, then create them as GitHub Issues with a dependency graph wired into the epic issue. The GitHub-native bridge from a strategic doc to the PIV loop.
argument-hint: "[path to the epic PRD] · [optional: path to its linked architecture doc] · [optional: --epic-issue <n> to reuse an existing epic issue]"
---

# /piv-slice-epic — Slice an Epic into PIV-Sized GitHub Issues

The bridge between a strategic doc and the PIV loop. The epic is the destination; the PIV loop is the unit of
motion; **tickets are the bridge.** This GitHub-native variant slices the epic into PIV-sized tickets **and creates
them as GitHub Issues**, with the dependency graph wired into the epic issue as a task list. No Jira, no external
tracker — just the repo, Issues, and the `gh` CLI.

## Prerequisites

- Working in a local Git repo with a GitHub origin.
- `gh` CLI installed and authenticated (`gh auth status`).
- An epic **PRD** (the intent — from `plan-create-prd`) **and** its **linked architecture doc** (the *how* — from
  `plan-architecture`). Two clean, linked sources is the default. A single architected epic doc that carries its own
  `## Architecture` section works too.

## Input

- `$1` — path to the epic **PRD** (`docs/epics/<slug>.prd.md`). The intent: goal, user stories, acceptance criteria,
  non-goals.
- `$2` (optional) — path to the **architecture doc** (`docs/epics/<slug>.architecture.md`). **This is load-bearing:**
  the architecture names the seams, data model, and missing pieces the slices must respect. If the PRD links to it
  and `$2` is omitted, resolve and read it from that link. If architecture is folded into the PRD as an `## Architecture`
  section, `$1` alone is enough.
- `--epic-issue <n>` (optional) — reuse an existing epic issue instead of creating one.

## Process

### Step 1 — Read the destination (both sources)

**Read both the PRD and the architecture doc.** From the PRD: goal, user stories, acceptance criteria, non-goals.
From the architecture doc (or the epic's folded-in `## Architecture` section): approach, stack, data model, missing
pieces, spikes. The slicing has to respect those architecture calls — that's what makes the slices land on the right
seams. If `$2` wasn't passed, follow the PRD's `Architecture:` link to find it.

### Step 2 — Orient on the code surface (if not already primed)

Slicing needs enough codebase awareness to judge what's independent vs dependent — file overlap, shared seams.
If already oriented, skip. Otherwise explore it yourself starting from the architecture's named seams: read the
relevant files/dirs to see what exists, what's reused, and where new code lands. Just enough to slice confidently.

### Step 3 — Decompose into PIV-sized slices

Break the epic into tickets. **Scope these for AI, not for a human backlog** — an agent loop carries far more than
a traditional ticket: a small-to-medium implementation *phase*, ~8-10 subtasks, often **500-1500 lines of change
(20-50% tests)**. A small epic might be a single ticket. A well-sized ticket:

- Is **one testable concern** — easy to test, review, and prove on its own.
- Is one coherent vertical slice of behavior, not a horizontal layer.
- Has clear acceptance criteria of its own.
- Is small enough that **one focused loop can one-shot it without context rot.**

Split by **dependency**, by **concern**, or as a **slim end-to-end slice**. If a slice is too big to test or review
in one honest pass, split it further. Planning *detail* stays high; it's the *scope* that's larger.

### Step 4 — Map dependencies (for parallelism)

Map dependencies between tickets. **Independent tickets** — ones that don't touch the same files or rely on each
other's output — can run in **parallel worktrees** (`/worktree-create`). Mark which are independent and which form a
chain. **Plan just-in-time:** a dependent ticket waits until its dependency is *implemented*, not just sliced.

### Step 5 — Ensure the epic issue exists

If `--epic-issue <n>` was passed, use it. Otherwise create the epic as a GitHub issue and label it `epic`. The
issue body is the **PRD** (the intent); link the architecture doc so intent and *how* stay two clean, linked sources:

```bash
# Create the 'epic' label once (ignore error if it already exists).
gh label create epic --color 5319E7 --description "Tracks an epic and its child tickets" 2>/dev/null || true

# Create the epic issue from the PRD (title + the PRD body). The PRD's `## Architecture` line already
# links the architecture doc in the repo, so the issue carries the link to the how alongside the intent.
gh issue create --title "Epic: <epic name>" --label epic --body-file <path-to-prd>
```

Capture the epic issue number from the URL it prints. Call it `$EPIC`.

### Step 6 — Create one issue per slice

For each slice, create a GitHub issue that **carries its own context** (so a loop can pick it up later without
re-reading the whole epic). Reference the epic and the dependency in the body:

```bash
gh issue create --title "<slice title>" --body "$(cat <<'EOF'
Part of epic #<EPIC>.

## Scope (one testable concern)
<what this ticket delivers + acceptance criteria>

## Per-ticket context
- Epic sections / guides / seams this needs (e.g. "architecture: storage-backend decision - seam: capabilities.py")
- Acceptance criteria from the epic this satisfies (e.g. AC #2, AC #4)

## Files touched (estimate) - size
<~500-1500 lines incl. tests>

## Depends on
<none | #<child-issue-number>>
EOF
)"
```

Do the independent (no-dependency) slices first so their real issue numbers exist to reference in the `Depends on`
lines of the dependent ones.

### Step 7 — Wire the dependency graph into the epic issue

Edit the epic issue body to append a task list linking every child issue, plus the execution waves. The task list
**is** the dependency graph and the live progress tracker (checkboxes tick as PRs close each issue):

```bash
gh issue edit <EPIC> --body "$(cat <<'EOF'
<original epic body>

## Tickets
- [ ] #<a> — <slice title>            (no deps)
- [ ] #<b> — <slice title>            (no deps)
- [ ] #<c> — <slice title>            (depends on #<a>)
- [ ] #<d> — <slice title>            (depends on #<a>)   [#<c> and #<d> are independent -> parallel]
- [ ] #<e> — <slice title>            (depends on #<c>, #<d>)

## Suggested execution order
- Wave 1 (parallel): #<a>, #<b>
- Wave 2 (parallel): #<c>, #<d>   (after #<a> is implemented)
- Wave 3: #<e>
EOF
)"
```

## Output

- One `epic`-labeled epic issue whose body holds the plan + a task-list dependency graph.
- One GitHub issue per PIV-sized slice, each carrying its own context and `Depends on` links.
- A printed summary: the epic issue URL, each child issue number + title, and the execution waves.

Each child issue then enters its own PIV loop: `/piv-plan-implementation #<n>` (it reads the issue and inherits the
epic's architecture) -> `/piv-implement` -> `/piv-validate` -> `/piv-commit` -> `/piv-create-pr` (with `Closes #<n>`).

## Notes

- **Just-in-time planning:** don't plan dependent tickets until their dependency is *implemented* — building it
  informs the plan. Independent tickets (the parallel waves) can be planned and run at once.
- `Closes #<n>` in the PR body auto-closes the issue on merge and ticks its box in the epic task list — the graph
  stays current for free.
- The goal is to split the work just enough that each loop has the highest chance of one-shot success, so you can
  automate the loop.
- Greenfield: the same slicing applies to MVP phases instead of epic tickets.
