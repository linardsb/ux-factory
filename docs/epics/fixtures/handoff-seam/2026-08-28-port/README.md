# Fenced run: iOS engineer (2026-08-28)

**real agent run, 2026-08-28, fenced to the pack, unedited**

Every file in this directory except this README is the run's own output, copied byte for byte from
`~/Desktop/port-run` on 2026-10-02. This README is the only hand-written file here. Epic #329
(`docs/epics/handoff-seam.prd.md`) cites this run as "port-run"; ticket #330 committed it (D7 sets the location).

## The pack it read

The run read a copy of `handoff/verdant/` taken at commit `6f1376b84045bae4bec6aa5a9613beef0c5bde6e` (merge of
PR #325, 2026-08-28 17:16 BST). On 2026-10-02 the run's `pack/` directory was compared with
`git archive 6f1376b handoff/verdant` using `diff -rq`, and the diff was empty.

The `pack/` copy is not committed here because git already holds it at that commit. To restore it, run this
inside a copy of this directory:

```bash
T=$(mktemp -d)
git -C <repo root> archive 6f1376b handoff/verdant | tar -x -C "$T"
cp -R "$T/handoff/verdant" pack
```

`CareTaskRow.swift` uses constants from `pack/tokens/ios/FactoryTokens.swift`, and the compile command recorded
at the end of `translation.md` passes that file to `swiftc`, so a compile needs the restored `pack/`. Restore it in
a scratch copy, not here.

## The fence

What was set up. The session was started with this command (`~/.zsh_history`):

```bash
mkdir -p ~/Desktop/port-run && cp -R ~/Desktop/Linards_current/ux-factory/handoff/verdant ~/Desktop/port-run/pack && cd ~/Desktop/port-run && claude
```

So the working directory held only `pack/` when the agent started. The instructions it was given, as the owner's
vault thinking doc records them (`claude-code-second-brain/Fredis/Memory/thinking/2026-08-28-component-system-backend-seam.md`,
line 108): "a fresh agent given only `handoff/verdant/`, no repo, no web, no questions allowed, logging every
question before deciding". The run restates its own rule at the top of `questions.md`: "Logged before each
decision, per the rules."

What the fence could not prevent. "No repo, no web" was an instruction to the agent, not a sandbox: nothing
stopped a file read outside the directory or a web request. User-level configuration under `~/.claude/` (the
global `CLAUDE.md`, the output style, the installed skills) loads in every session started on this machine, so
it loaded in this one. The model name and any tool restriction were not recorded, so this README states neither.

## The prompt

The prompt was pasted as one block, the first line plus 21 more (`~/.claude/history.jsonl` records it as
`[Pasted text #1 +21 lines]`, session `a9b674a0-1c49-4dc4-92eb-dda3fff265d9`, 2026-08-28 20:45:58 BST). Its text
was not retained: on 2026-10-02 the paste cache held no entry for its content hash (`fb6d716db26dd65f`), and no
session transcript for that session id existed under `~/.claude/projects/`. The owner confirmed on 2026-10-02
that they do not have it. It is not reconstructed here, because a reconstruction would be hand-written input
presented as the run's. A re-run of this run (#336) therefore needs a new prompt, labelled as new.

## Timeline

- 20:45:38 BST: `pack/` copied (its directory mtime).
- 20:45:58 BST: the prompt is pasted (`history.jsonl`).
- 20:51:43 to 20:53:48 BST: every run file is written. The earliest mtime is `notes.md` (20:51:43), the latest
  `questions.md` and `translation.md` (both 20:53:48).
- 21:13:18 BST: `/clear` in the same session (`history.jsonl`). The later sessions `history.jsonl` records from
  that directory (`/piv-slice-epic docs/epics/handoff-seam.prd.md` and planning questions) are not part of the run.

On 2026-10-02 no run file's mtime was later than 20:53:48 on 2026-08-28. Git does not keep mtimes, so this README
is where that evidence is recorded. "Unedited" rests on those mtimes and on the byte comparison below.

How the copy was made: `rsync -a --exclude pack/ ~/Desktop/port-run/ <this directory>/`. To re-check the
committed bytes against the Desktop copy while it exists, from the repo root:

```bash
S=$(mktemp -d)
git archive HEAD docs/epics/fixtures/handoff-seam | tar -x -C "$S"
diff -r -x pack -x README.md ~/Desktop/port-run "$S/docs/epics/fixtures/handoff-seam/2026-08-28-port"
```

An empty diff means the copy matches. `-x README.md` is safe only while `~/Desktop/port-run` has no `README.md`;
on 2026-10-02 it had none.

## Files

- `notes.md`: the run's own summary of the pack, what `FactoryTokens.swift` gives and does not give an iOS
  engineer, and where the care-task-row and status-chip specs live.
- `questions.md`: 33 logged questions, each with who should answer it, the pack files looked in and what the
  agent assumed.
- `CareTaskRow.swift`: care-task-row and its status-chip child in SwiftUI, "built from ./pack alone" (its own
  header).
- `translation.md`: 38 rows (T1 to T38), each a web term from the spec or its web reference and what it became in
  `CareTaskRow.swift`, then the run's compile result. The run records the compile as observed against an iOS 16
  simulator target, and states that the preview was not rendered.

## Who reads it

#335 (T4b) uses `translation.md` rows T20 to T25 as its fixture. #336 (T4a) re-runs the port task; it cannot
reuse the original prompt (see above). No CI check reads these files: drift-check's syntax leg covers `.mjs`
only, and build-checks' tracked-file sweeps cover `.mjs`, `.html`, `.js` and `system/`, none of which matches a
file here.
