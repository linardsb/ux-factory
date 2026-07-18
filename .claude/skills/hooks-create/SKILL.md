---
name: hooks-create
description: Author a working Claude Code hook from a plain-English description of what it should guarantee or do. You describe the behavior ("never let the agent edit my migrations", "don't stop until the tests pass", "log every command"); this skill picks the right lifecycle event, writes the hook script, and wires it into .claude/settings.json. Use when you want a deterministic guarantee or automation in your AI Layer and don't want to write the hook by hand. The meta-tool for the hooks primitive.
argument-hint: [what-the-hook-should-do]
---

# Create Hook: Turn an Idea Into a Working Claude Code Hook

**What the user wants the hook to do**: $ARGUMENTS

If that is filled in, treat it as the behavior spec and start from it. Don't re-ask what they already told you;
only ask to pin down the gaps (the exact paths / commands / patterns, and whether it must *block*). If it is
blank, start by asking what the hook should guarantee or do (Workflow step 1).

## What a hook is (30-second intro)

A **hook** is deterministic code that fires automatically on a Claude Code **lifecycle event** — before a tool
runs, after it runs, when the agent tries to finish, when a session starts, and so on. Unlike a skill or a
subagent, **the agent does not choose to invoke a hook** — it fires whether the model "remembers" or not. That is
the whole point: a rule *asks* the agent to behave; a hook **guarantees** it, at the tooling layer the model
can't talk its way around.

The user brings the **idea** ("the agent should never read my `.env`"); this skill writes the **code** and wires
it in. They don't need to know Python.

**It's all composition** — a hook is just a small script the harness runs at a defined moment, configured in
`.claude/settings.json`. You're adding one more deterministic guarantee to the AI Layer.

## The one thing to get right: which event, and can it block?

The behavior the user wants maps to **one** lifecycle event. Pick by *when* it should fire and *whether it must
stop something*:

| The user wants to… | Event | Can it block? |
|---|---|---|
| **Stop the agent from doing something** (read a secret, edit a protected path, run a destructive command) | **PreToolUse** ⭐ | **Yes** — block the tool before it runs |
| **React after an action** (auto-format an edited file, log a command, inject context) | **PostToolUse** | No — the tool already ran; observe / format / inject only |
| **Guarantee work isn't "done" until a check passes** (don't stop until tests/lint/types are green) | **Stop** (or **SubagentStop**) | **Yes** — block the stop and send the agent back to work |
| **Gate or scan the user's prompt** before the model sees it | **UserPromptSubmit** | **Yes** — block the prompt; can also inject context |
| **Load context every time a session starts** | **SessionStart** | No — inject context only |
| **Get notified when the agent needs you / finishes** | **Notification** (or **Stop**) | No — side-effect only (desktop/Slack/sound) |
| **Snapshot state before context compaction** | **PreCompact** | No |

> **Pre = guarantee/gate. Post = react/log.** If the user's goal is "make sure X never happens" or "don't finish
> until Y," it's a *blocking* hook (PreToolUse / Stop / UserPromptSubmit). If it's "do Z when W happens," it's an
> *observe/react* hook (PostToolUse / SessionStart / Notification).

## Required reading (do this first)

The hook event list and the exact stdin/stdout contract **evolve** — don't rely on a snapshot. Before writing,
**fetch the current docs** and confirm the event name, its input fields, and its control protocol:

- Hooks reference: https://code.claude.com/docs/en/hooks
- Hooks guide (examples): https://code.claude.com/docs/en/hooks-guide

Use `WebFetch` on these and verify against what you're about to write. If the fetch fails, proceed from the
canonical events in the table above and **say so** in your report so the user can double-check.

## The execution protocol (how a hook talks to Claude Code)

- **Input:** Claude Code passes a JSON object on **stdin** — always includes `session_id`, `cwd`,
  `hook_event_name`; event-specific fields like `tool_name` + `tool_input` (tool events), `prompt`
  (UserPromptSubmit), `source` (SessionStart).
- **Output / control:**
  - **`exit 0`** — allow / success. For `UserPromptSubmit` and `SessionStart`, anything printed to **stdout** is
    injected into the agent's context.
  - **`exit 2`** — **block.** The action is prevented and whatever you print to **stderr** is fed back to the
    agent as the reason, so it adapts. (Only blocking-capable events honor this — see the table.)
  - **any other exit code** — non-blocking error; shown to the user, execution continues.
  - **Advanced (optional):** instead of exit codes, print a JSON object on stdout — e.g. `{"decision":"block",
    "reason":"…"}` (Stop), or `{"hookSpecificOutput":{"hookEventName":"PreToolUse",
    "permissionDecision":"deny","permissionDecisionReason":"…"}}`. Prefer the simple exit-code form unless the
    user needs to *modify* input/output or inject context with `additionalContext`. Confirm field names against
    the fetched docs.

## Workflow

### 1. Understand the idea (start from `$ARGUMENTS`; ask only to fill gaps)
Start from what the user already described in `$ARGUMENTS` (the user may not be technical). Pin down two things in
plain language, asking only for what is missing:
- **What** should happen or be prevented, and **when** (before/after an action, at finish, at session start)?
- **How precisely** should it match? ("any `.env` file", "the `migrations/` folder", "`rm -rf`", "my test
  command exits non-zero"). Get the concrete file paths / commands / patterns — the guarantee is only as good as
  what it matches, so don't guess. If the ask is vague, propose a concrete interpretation and confirm.

### 2. Read the docs
Fetch the hooks reference/guide (above) and confirm the target event's name, stdin fields, and control protocol.

### 3. Pick the event (and matcher)
Use the table to choose the single event. Choose a **matcher** that scopes it tightly — for tool events, the
tool name(s) (e.g. `"Bash"`, `"Edit|Write"`, `"mcp__.*"`); empty/`"*"` means every occurrence. Don't fire on
everything if the goal is specific.

### 4. Write the hook script
- Default to a **`uv` single-file Python script** at `.claude/hooks/<event_snake_case>.py` (matches the pack's
  tooling). Use another language only if the user asks.
- Read the JSON from stdin, do the check, and:
  - to **block**: print a clear reason to `stderr` and `sys.exit(2)`;
  - to **allow**: `sys.exit(0)` (optionally print context to stdout for the injecting events).
- **Fail open.** Wrap the body so any unexpected error exits `0` (a broken hook must never brick the user's
  session). The only intentional non-zero exit is the deliberate `exit 2` block.
- Keep it lean and readable — the user will want to tweak the matched paths/commands later.
- If a hook already exists for that event, **extend it** rather than overwrite (add your check; keep theirs).

### 5. Wire it into settings.json
Edit `.claude/settings.json` (create it if absent). **Merge** into any existing `hooks` block — never clobber
other events or other hooks on the same event. Shape:
```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Edit|Write|Read|Bash",
        "hooks": [ { "type": "command", "command": "uv run .claude/hooks/pre_tool_use.py" } ] }
    ]
  }
}
```

### 6. Explain, test, and warn
- Tell the user **what you built**, in plain words: which event, what it guarantees, and the one line they'd
  change to adjust it.
- Give them a **way to prove it**: for a blocking hook, an action that *should* be blocked ("ask me to read
  `.env` — watch it refuse"); for an observe hook, where the output lands (the log file, the notification).
- **Security note (always say this):** a hook runs arbitrary code automatically, with your credentials, on every
  matching event. Review hooks like you review CI config; only run hooks you trust. (Same caution as MCP
  servers.)

## Quality checks

- ✅ The behavior maps to the **right event**, and a blocking goal uses a **blocking-capable** event (PreToolUse /
  Stop / UserPromptSubmit) — not PostToolUse.
- ✅ The **matcher is scoped** to what the user actually meant (not firing on everything by accident).
- ✅ The script **fails open** — any error exits 0; the only `exit 2` is the intended block, with a clear stderr reason.
- ✅ `settings.json` was **merged**, not overwritten; existing hooks still present.
- ✅ The user got a **plain-English explanation + a test + the security note.**

## Notes

- Hooks are the deterministic floor of the AI Layer — use them for the non-negotiables (secrets, protected paths,
  "don't finish until green"), not for things a rule or skill handles well enough.
- A blocking hook's *coverage* is only as good as its matcher — it guarantees the hook **runs**, but you decide
  what it catches. Be honest with the user about the edges (e.g. a `.env` matcher won't catch a base64'd read).
- Keep hooks fast — they run on the matched event every time. Heavy work belongs in an async hook or a skill.
