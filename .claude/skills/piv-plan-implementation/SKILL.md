---
name: piv-plan-implementation
description: Creates a comprehensive, context-rich implementation plan through deep codebase analysis and external research. Accepts a GitHub issue number (#N) or a free-form feature description. Use when you have a ticket/feature request and need a one-pass-ready plan before writing any code.
argument-hint: "[#<github-issue> | feature-description]"
---

# Plan a new task

## Input: $ARGUMENTS

**Resolve the input first:**

- **If `$ARGUMENTS` is a GitHub issue** (a `#<n>` or a bare number): read it before anything else.
  ```bash
  gh issue view <n>                     # title, body, labels, comments
  ```
  The issue body is the ticket: its scope, acceptance criteria, per-ticket context, and `Depends on` links. If it
  says `Part of epic #<E>`, **read the epic too** (`gh issue view <E>`) — its `## Architecture` decisions are
  inherited, not re-decided (see "Inherit, don't re-decide" below). Record the issue number so the plan and the
  eventual PR can link back with `Closes #<n>`.
- **If `$ARGUMENTS` is a free-form description**: treat it as the feature request directly.

## Mission

Transform a feature request into a **comprehensive implementation plan** through systematic codebase analysis, external research, and strategic planning.

**Core Principle**: We do NOT write code in this phase. Our goal is to create a context-rich implementation plan that enables one-pass implementation success for ai agents.

**Key Philosophy**: Context is King. The plan must contain ALL information needed for implementation - patterns, mandatory reading, documentation, validation commands - so the execution agent succeeds on the first attempt.

**Inherit, don't re-decide**: This is a **per-ticket** plan. If the ticket belongs to an epic that already has an engineering plan (an `## Architecture` section on the epic, or a `docs/epics/<slug>.architecture.md` doc from the `plan-architecture` skill), **read it first** and treat its cross-cutting calls — stack & versions, data model, security boundaries, the seams new code plugs into — as **already decided**. Inherit them; don't reopen them. Plan only what's left at the ticket level: the specific files, the local patterns to mirror, the tests. If a ticket genuinely needs to break an epic-level decision, flag it in Open Questions rather than silently diverging.

## Planning Process

### Phase 1: Feature Understanding

**Deep Feature Analysis:**

- Extract the core problem being solved
- Identify user value and business impact
- Determine feature type: New Capability/Enhancement/Refactor/Bug Fix
- Assess complexity: Low/Medium/High
- Map affected systems and components

**Create User Story Format Or Refine If Story Was Provided By The User:**

```
As a <type of user>
I want to <action/goal>
So that <benefit/value>
```

### Phase 2: Codebase Intelligence Gathering

**Use specialized agents and parallel analysis:**

**1. Project Structure Analysis**

- Detect primary language(s), frameworks, and runtime versions
- Map directory structure and architectural patterns
- Identify service/component boundaries and integration points
- Locate configuration files (pyproject.toml, package.json, etc.)
- Find environment setup and build processes

**2. Pattern Recognition** (Use specialized subagents when beneficial)

- Search for similar implementations in codebase
- Identify coding conventions:
  - Naming patterns (CamelCase, snake_case, kebab-case)
  - File organization and module structure
  - Error handling approaches
  - Logging patterns and standards
- Extract common patterns for the feature's domain
- Document anti-patterns to avoid
- Check CLAUDE.md for project-specific rules and conventions

**3. Dependency Analysis**

- Catalog external libraries relevant to feature
- Understand how libraries are integrated (check imports, configs)
- Find relevant documentation in docs/, ai_docs/, .claude/references or ai-wiki if available
- Note library versions and compatibility requirements

**4. Testing Patterns**

- Identify test framework and structure (pytest, jest, etc.)
- Find similar test examples for reference
- Understand test organization (unit vs integration)
- Note coverage requirements and testing standards

**5. Integration Points**

- Identify existing files that need updates
- Determine new files that need creation and their locations
- Map router/API registration patterns
- Understand database/model patterns if applicable
- Identify authentication/authorization patterns if relevant

**Clarify Ambiguities:**

- If requirements are unclear at this point, ask the user to clarify before you continue
- Get specific implementation preferences (libraries, approaches, patterns)
- Resolve architectural decisions before proceeding

### Phase 3: External Research & Documentation

**Use specialized subagents when beneficial for external research:**

**Documentation Gathering:**

- Research latest library versions and best practices
- Find official documentation with specific section anchors
- Locate implementation examples and tutorials
- Identify common gotchas and known issues
- Check for breaking changes and migration guides

**Technology Trends:**

- Research current best practices for the technology stack
- Find relevant blog posts, guides, or case studies
- Identify performance optimization patterns
- Document security considerations

**Compile Research References:**

```markdown
## Relevant Documentation

- [Library Official Docs](https://example.com/docs#section)
  - Specific feature implementation guide
  - Why: Needed for X functionality
- [Framework Guide](https://example.com/guide#integration)
  - Integration patterns section
  - Why: Shows how to connect components
```

### Phase 4: Deep Strategic Thinking

**Think Harder About:**

- How does this feature fit into the existing architecture?
- What are the critical dependencies and order of operations?
- What could go wrong? (Edge cases, race conditions, errors)
- How will this be tested comprehensively?
- What performance implications exist?
- Are there security considerations?
- How maintainable is this approach?

**Design Decisions:**

- Choose between alternative approaches with clear rationale
- Design for extensibility and future modifications
- Plan for backward compatibility if needed
- Consider scalability implications

### Phase 5: Plan Structure Generation

**Create comprehensive plan with the following structure:**

Whats below here is a template for you to fill for the implementation agent:

```markdown
# Feature: <feature-name>

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

<Detailed description of the feature, its purpose, and value to users>

## User Story

As a <type of user>
I want to <action/goal>
So that <benefit/value>

## Problem Statement

<Clearly define the specific problem or opportunity this feature addresses>

## Solution Statement

<Describe the proposed solution approach and how it solves the problem>

## Out of Scope / Non-Goals

<Explicitly bound the work: what this feature does NOT include. Name the things a reasonable reader might assume are in scope but aren't — this is what stops the agent from gold-plating or solving the wrong problem.>

- Not included: <thing> (defer to <later / separate ticket>)
- Not changing: <existing behavior to leave alone>

## Feature Metadata

**Feature Type**: [New Capability/Enhancement/Refactor/Bug Fix]
**Estimated Complexity**: [Low/Medium/High]
**Primary Systems Affected**: [List of main components/services]
**Dependencies**: [External libraries or services required]

## Related Work

<Links between this plan and the work around it. Distinct from CONTEXT REFERENCES below (which lists files/docs to read for *this* implementation) — this is the plan's place in the larger graph.>

**Implements**: <ticket id / link>   ·   **Epic**: <the epic's `<slug>.architecture.md` path or epic link — if this ticket inherits an epic's architecture doc (see Mission), record it here>

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/<prior-plan>.md` - Why: shares the auth seam / reuses the X service

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

<List files with line numbers and relevance>

- `path/to/file.py` (lines 15-45) - Why: Contains pattern for X that we'll mirror
- `path/to/model.py` (lines 100-120) - Why: Database model structure to follow
- `path/to/test.py` - Why: Test pattern example

### New Files to Create

- `path/to/new_service.py` - Service implementation for X functionality
- `path/to/new_model.py` - Data model for Y resource
- `tests/path/to/test_new_service.py` - Unit tests for new service

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Documentation Link 1](https://example.com/doc1#section)
  - Specific section: Authentication setup
  - Why: Required for implementing secure endpoints
- [Documentation Link 2](https://example.com/doc2#integration)
  - Specific section: Database integration
  - Why: Shows proper async database patterns

### Patterns to Follow

<Specific patterns extracted from codebase - include actual code examples from the project>

**Naming Conventions:** (for example)

**Error Handling:** (for example)

**Logging Pattern:** (for example)

**Other Relevant Patterns:** (for example)

---

## IMPLEMENTATION PLAN

Phases run **top to bottom by default** — each assumes the phase above it is done. Where that is NOT the true dependency, make it explicit with a `**Depends on:**` line under the phase header, and a `**Independent of:**` line where two phases don't block each other. Independent phases are candidates to run in **parallel** (e.g. separate worktrees / parallel loops). Only annotate where it changes execution order or unlocks parallelism — skip the obvious sequential case.

### Phase 1: Foundation

<Describe foundational work needed before main implementation>

**Tasks:**

- Set up base structures (schemas, types, interfaces)
- Configure necessary dependencies
- Create foundational utilities or helpers

### Phase 2: Core Implementation

**Depends on:** Phase 1 (needs the base schemas/types)

<Describe the main implementation work>

**Tasks:**

- Implement core business logic
- Create service layer components
- Add API endpoints or interfaces
- Implement data models

### Phase 3: Integration

<Describe how feature integrates with existing functionality>

**Tasks:**

- Connect to existing routers/handlers
- Register new components
- Update configuration files
- Add middleware or interceptors if needed

### Phase 4: Testing & Validation

<Describe testing approach>

**Tasks:**

- Implement unit tests for each component
- Create integration tests for feature workflow
- Add edge case tests
- Validate against acceptance criteria

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task Format Guidelines

Use information-dense keywords for clarity:

- **CREATE**: New files or components
- **UPDATE**: Modify existing files
- **ADD**: Insert new functionality into existing code
- **REMOVE**: Delete deprecated code
- **REFACTOR**: Restructure without changing behavior
- **MIRROR**: Copy pattern from elsewhere in codebase

### {ACTION} {target_file}

- **IMPLEMENT**: {Specific implementation detail}
- **PATTERN**: {Reference to existing pattern - file:line}
- **IMPORTS**: {Required imports and dependencies}
- **GOTCHA**: {Known issues or constraints to avoid}
- **VALIDATE**: `{executable validation command}`
- **REDDENS**: {for a task that adds a check, gate case, probe or grep — the exact mutation that makes it fail, and the failure message expected. A check whose reddening mutation you cannot name is a check you have not specified.}
- **SATISFIES**: {which acceptance criterion this task advances — e.g. AC #2 — so every task traces to a criterion}
- **REGENERATES**: {the generated outputs this change moves — `loc-summary.json`, VR baselines, `system-graph.json`, the handoff pack, `param-count.json` — with the command for each. "none" if none. These cascade, they are drift-checked in CI, and they are discovered post-commit in 15% of this repo's reports.}

<Continue with all tasks in dependency order...>

---

## TESTING STRATEGY

<Define testing approach based on project's test framework and patterns discovered during research>

### Unit Tests

<Scope and requirements based on project standards>

Design unit tests with fixtures and assertions following existing testing approaches

### Integration Tests

<Scope and requirements based on project standards>

### Edge Cases

<List specific edge cases that must be tested for this feature>

### Proving the checks

Every check this plan adds carries the mutation that reddens it (its REDDENS field) and one positive
control — an input that must make it fire, run before you trust a green. A check that passes because it
never reached the thing it tested is this repo's largest class of process review finding, by a wide margin
(59 of 229).

---

## VALIDATION COMMANDS

<Define validation commands based on project's tools discovered in Phase 2>

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

<Project-specific linting and formatting commands>

### Level 2: Unit Tests

<Project-specific unit test commands>

### Level 3: Integration Tests

<Project-specific integration test commands>

### Level 4: Manual Validation

<Feature-specific manual testing steps - API calls, UI testing, etc.>

### Level 5: Additional Validation (Optional)

<MCP servers or additional CLI tools if available>

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| <the step> | <$ or "owner's hand"> | yes/no | <ticket, or "open one before the PR"> |

Any step that spends tokens, needs a real agent run, needs the owner's own hand (a verdict, or a
decision this session must not write), or needs a credential this machine may not hold. The plan decides
whether it blocks; the implementer does not. A step listed here and not run goes in the report's **Not run**
section with this row's tracker.

---

## ACCEPTANCE CRITERIA

<List specific, measurable criteria that must be met for completion>

- [ ] Feature implements all specified functionality
- [ ] All validation commands pass with zero errors
- [ ] Unit test coverage meets requirements (80%+)
- [ ] Integration tests verify end-to-end workflows
- [ ] Code follows project conventions and patterns
- [ ] No regressions in existing functionality
- [ ] Documentation is updated (if applicable)
- [ ] Performance meets requirements (if applicable)
- [ ] Security considerations addressed (if applicable)

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## OPEN QUESTIONS / ASSUMPTIONS

<Surface anything still uncertain instead of silently guessing. List the assumptions this plan makes, and any question that — if answered differently — would change the plan. Flag unresolved critical questions for the user before execution.>

## NOTES (open canvas)

<No fixed shape. Reason freely here: alternatives you weighed and rejected and why, a tradeoff matrix, a sequencing or rollout risk, a data-flow sketch, open threads, links — whatever serves the plan. The sections above template the plan's *shape* so the trifecta and the implementation agent can consume it; this section keeps your *reasoning* unconstrained. Prose, lists, tables, code blocks all welcome.>

## AMENDMENTS

<Append-only history of changes made to this plan AFTER it was first approved/executed. Leave empty at creation; newest entry at the bottom. Each entry: date — what changed and why.>

- <ISO date> — <what changed and why, e.g. "scope cut: deferred bulk-import to a follow-up ticket after AC review">
```

## Pre-flight — run the plan against the tree before you report it

A plan is written from a reading of the code and then drifts from it. Across this repo's 113 implementation
reports, 58% record a plan literal that was wrong — a count, an argument order, a path, an expected output —
and 52% record state the plan read wrongly: a helper that was not there, a rule that already existed, a
feature that had already landed (`.claude/system-reviews/process-sweep-2026-09-04.md`). The implementer
catches these one at a time, at run time, at the cost of the one-pass success this skill exists to produce.
Run these five before you write the report.

1. **Drive every VALIDATE that touches code which already exists.** Not read it — run it, and paste the
   observed output into the task. A command whose target this plan will CREATE is marked `(expected)`, and
   its argument order is checked by reading the real signature rather than by recall.
2. **Resolve every citation.** Every `path/file.ext:NN`, every exported symbol, every snippet under PATTERN:
   open it and confirm it says what the plan claims. A pattern you did not read this session does not go in
   the plan. A memory is a pointer to verify, never a quote to copy — read the file it names, because a
   memory records what was true when it was written.
3. **Check the landed claims against `origin/main`.** For everything the plan says is missing, grep for it.
   For everything it says exists, grep for that too. Both are one command, and between them they cover P8,
   the pattern 52% of this repo's reports record.
4. **Reconcile each task with itself and its siblings.** Where a GOTCHA says "do A or B, not both", the
   IMPLEMENT above it already names which. Where two sections state a number, they agree — derive it once
   and reuse the figure. Where a task says MIRROR `<file>` and also states a rule, confirm `<file>` obeys
   that rule or name the exception in the task.
5. **Carry the known traps.** For every file this plan touches, check `.claude/references/` and this
   session's memories for a recorded trap on it, and write it in as a GOTCHA. 29% of this repo's reports
   record the implementer hitting a trap that was already written down somewhere the plan did not look.

Record the pre-flight in NOTES: what you ran, what it said, what changed in the plan because of it. A plan
reporting no pre-flight findings has almost certainly not run one.

## Output Format

**Filename**: `.claude/plans/{kebab-case-descriptive-name}.md`

- Replace `{kebab-case-descriptive-name}` with short, descriptive feature name
- Examples: `add-user-authentication.md`, `implement-search-api.md`, `refactor-database-layer.md`

**Directory**: Create `.claude/plans/` if it doesn't exist

## Quality Criteria

### Context Completeness ✓

- [ ] All necessary patterns identified and documented
- [ ] External library usage documented with links
- [ ] Integration points clearly mapped
- [ ] Gotchas and anti-patterns captured
- [ ] Every task has executable validation command
- [ ] Pre-flight run and recorded in NOTES: every existing-code VALIDATE driven, every citation resolved,
      every landed claim checked against `origin/main`
- [ ] Every check-adding task carries a REDDENS mutation
- [ ] Every task that moves a generated output carries REGENERATES
- [ ] Paid and owner-only steps table filled, or explicitly empty

### Implementation Ready ✓

- [ ] Another developer could execute without additional context
- [ ] Tasks ordered by dependency (can execute top-to-bottom)
- [ ] Each task is atomic and independently testable
- [ ] Pattern references include specific file:line numbers

### Pattern Consistency ✓

- [ ] Tasks follow existing codebase conventions
- [ ] New patterns justified with clear rationale
- [ ] No reinvention of existing patterns or utils
- [ ] Testing approach matches project standards

### Information Density ✓

- [ ] No generic references (all specific and actionable)
- [ ] URLs include section anchors when applicable
- [ ] Task descriptions use codebase keywords
- [ ] Validation commands are non interactive executable

## Success Metrics

**One-Pass Implementation**: Execution agent can complete feature without additional research or clarification

**Validation Complete**: Every task has at least one working validation command

**Context Rich**: The Plan passes "No Prior Knowledge Test" - someone unfamiliar with codebase can implement using only Plan content

**Confidence Score**: #/10 that execution will succeed on first attempt, IMPORTANT: should not be below 9/10, ideally 9.5/10

## Report

After creating the Plan, provide:

- Summary of feature and approach
- Full path to created Plan file
- Complexity assessment
- Key implementation risks or considerations
- Estimated confidence score for one-pass success

## Hand off — build brief (teach the plan)

After the report, produce a **build brief**: one simple, self-contained HTML page that *teaches the user what
this plan builds* — concepts first, plan second — so they genuinely understand the ideas behind the feature,
not just the task list. Inline CSS, no frameworks, real names from this codebase.

**Register: load the `show-me` skill and write to its `### explaining a concept` section.** The audience is a
bright 18-year-old who has never seen this repo, even though the reader is the owner. Technical terms are
allowed where the idea needs them, and every one is glossed the first time it appears. The budgets there are
hard: at most 60 words of prose per concept, under 300 words of prose for the whole page (sketches, file
trees and tables don't count). Ticket, group and invariant numbers, "where the analogy breaks" notes, traps
and code snippets stay in the markdown plan — link it once at the top.

Content, in order:

1. **What we're building and why** — two sentences: what is missing today, what exists after.
2. **The concepts this plan rests on** — two to four ideas someone must understand to follow the build. Each:
   what it is in everyday words, one analogy or a sketch of at most five lines, and why *this* plan needs it.
3. **How the pieces fit** — one sketch (Mermaid or simple HTML boxes), at most six boxes, labels in plain
   words, connecting the concepts to the plan's phases.
4. **The plan at a glance** — one plain line per phase with its dependency, the new/changed file tree with a
   one-phrase comment per file, and the acceptance criteria as one line each (no "proven by" column).
5. **Go deeper** — one `/learn <concept>` row per concept, each with a **copy button** that copies the prompt
   verbatim. Implement `### copyable prompts` from the `show-me` skill exactly — `data-prompt` on the row, the
   delegated listener, the `catch` fallback. A brief whose `/learn` rows have no copy button is not finished.

Save it beside the plan as `.claude/plans/<same-name>.html` and open it (`open <path>`). Keep it genuinely
simple — a two-minute briefing, not a document to maintain. The markdown plan stays the single source of truth.
