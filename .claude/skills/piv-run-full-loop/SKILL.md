---
name: piv-run-full-loop
description: Autonomously develops a complete feature from priming through planning, execution, and commit by chaining the four core PIV-loop skills. Use when you want a full hands-off feature build from a single description.
argument-hint: [feature-description]
---

# End-to-End Feature Development

**Feature Description**: $ARGUMENTS

This skill chains the 4 core PIV-loop skills for autonomous feature development.

---

## Step 1: Prime - Load Codebase Context

Execute the priming workflow to understand the codebase.

**Prefer a project-specific prime skill when one exists.** Check the project's
`.claude/skills/` for a `prime-*` skill (e.g. `prime-<project>`); if there is one, run that
instead. A repo ships its own prime because the generic one is wrong there — commonly because
`prime-codebase`'s file listing truncates to the first 200 tracked files and misses most of the
tree, or because the repo has hooks, protected paths, or scope decisions a generic pass never
discovers.

Otherwise, run the `prime-codebase` skill (`.claude/skills/prime-codebase/SKILL.md`).

---

## Step 2: Planning - Create Implementation Plan

Create a detailed implementation plan for the feature.

Run the `piv-plan-implementation` skill (`.claude/skills/piv-plan-implementation/SKILL.md`) with the feature description: **$ARGUMENTS**.

**IMPORTANT**: Note the feature name (and plan file path) that the planning step creates. You'll need it for the next step.

---

## Step 3: Execute - Implement the Feature

Implement the feature from the plan document.

Run the `piv-implement` skill (`.claude/skills/piv-implement/SKILL.md`) with the plan file path: `.claude/plans/[feature-name].md`.

(Use the feature name from Step 2.)

---

## Step 4: Commit - Save Changes

Create a git commit for all changes.

Run the `piv-commit` skill (`.claude/skills/piv-commit/SKILL.md`).

---

## Final Summary

After completing all 4 steps, provide:

### Feature Implementation Complete

**Original Request**: $ARGUMENTS

**Feature Name**: [feature-name from planning step]

**Steps Executed:**
1. ✅ Prime - Codebase context loaded
2. ✅ Planning - Plan created at `.claude/plans/[feature-name].md`
3. ✅ Execute - Feature implemented and validated
4. ✅ Commit - Changes committed to git

**Outputs:**
- Plan document: `.claude/plans/[feature-name].md`
- Files created/modified: [list]
- Tests added: [list]
- Commit hash: [hash]

**Next Steps:**
- Push to remote: `git push`
- Create pull request (if applicable)
- Continue with next feature
