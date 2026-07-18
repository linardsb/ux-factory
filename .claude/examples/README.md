# `.claude/examples/` — Reference Examples

This folder holds **example AI Layer artifacts** — not active skills.

## Why this is separate from `.claude/skills/`

`.claude/skills/` holds **universal skills** — `prime-codebase`, `piv-plan-implementation`, `piv-implement`,
`piv-review-changes`, and the rest. They work on *any* codebase, which is why they ship in the
course's AI Layer for every student to install on their own projects.

This folder holds the other kind: a **codebase-specific skill** — one written for a single
codebase's recurring pattern. The course teaches (the Rule of Three) that once you've
done the same multi-step task 3+ times in *your* codebase, you turn it into a skill. This is
what that looks like.

Examples here are kept **outside `.claude/skills/`** on purpose, so Claude Code does not
auto-load them — they only make sense for the codebase they were written for. They live here
purely as a teaching reference.

## The example: `new-source-adapter/`

A skill written for the **AI Tutor** codebase (the course's running project). Once the AI
Tutor has a pluggable `SourceAdapter` ingestion contract, adding each new content source
(markdown → PDF → webpage → Notion → …) is the same recurring multi-step task — so it earns
a skill.

| File | What it is |
|---|---|
| `new-source-adapter/SKILL.md` | The codebase-specific skill — scaffolds a new `SourceAdapter`. |
| `new-source-adapter/source-adapter-guide.md` | The on-demand reference doc the skill pulls in. |

In the AI Tutor's own repo these two would live in `.claude/skills/new-source-adapter/` and
`.claude/references/` respectively — they are co-located here so the example is
self-contained. The skill is produced on camera during the course as the worked
example of building a skill for your own codebase.
