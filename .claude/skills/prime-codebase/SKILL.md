---
name: prime-codebase
description: Primes the agent with deep codebase understanding by analyzing structure, documentation, and key files. Use when starting work on a codebase, at the beginning of a session, or when you need a fast orientation before planning or implementing. Optionally pulls external task context from GitHub Issues first.
argument-hint: [github-issue-numbers]
---

# Prime: Load Project Context

## Objective

Build comprehensive understanding of the codebase by analyzing structure, documentation, and key files. If external task references are provided, load them first so the codebase analysis is anchored to the actual work.

## Process

### Step 0: Load External Context

**Run this step BEFORE the codebase analysis.** It accepts optional arguments: `[github-issue-numbers]`.

- Issue numbers may be a single number (`2`) or `#`-prefixed / comma-separated (`#2`, `2,3`).

**If GitHub issue numbers are provided:**

1. For each issue number, run `gh issue view <n> --json number,title,body,labels,state` (this repo is GitHub-native — no Atlassian/Jira MCP is used).
2. Treat the returned issue title, body, and acceptance criteria as the task context for everything that follows. If an issue is an epic (carries the `epic` label), read its linked child issues too so the priming is anchored to the whole slice graph.

**If no arguments are provided:** Skip this step entirely and proceed to Step 1.

Briefly summarize any external context loaded before continuing — this frames the rest of the priming.

### 1. Analyze Project Structure

List all tracked files:
!`git ls-files`

Show directory structure:
On Linux, run: `tree -L 3 -I 'node_modules|__pycache__|.git|dist|build'`

### 2. Read Core Documentation

- Read CLAUDE.md or similar global rules file
- Read README files at project root and major directories
- Read any architecture documentation

### 3. Identify Key Files

Based on the structure, identify and read:
- Main entry points (main.py, index.ts, app.py, etc.)
- Core configuration files (pyproject.toml, package.json, tsconfig.json)
- Key model/schema definitions
- Important service or controller files

### 4. Understand Current State

Check recent activity:
!`git log -10 --oneline`

Check current branch and status:
!`git status`

## Output Report

Provide a concise summary covering:

### External Task Context (if loaded)
- GitHub issue(s): number, title, one-line goal, acceptance criteria (and child issues if an epic)

### Project Overview
- Purpose and type of application
- Primary technologies and frameworks
- Current version/state

### Architecture
- Overall structure and organization
- Key architectural patterns identified
- Important directories and their purposes

### Tech Stack
- Languages and versions
- Frameworks and major libraries
- Build tools and package managers
- Testing frameworks

### Core Principles
- Code style and conventions observed
- Documentation standards
- Testing approach

### Current State
- Active branch
- Recent changes or development focus
- Any immediate observations or concerns

**Make this summary easy to scan - use bullet points and clear headers.**
