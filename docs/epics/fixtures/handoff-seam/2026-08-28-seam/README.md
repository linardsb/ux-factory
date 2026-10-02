# Fenced run: backend engineer (2026-08-28)

**real agent run, 2026-08-28, fenced to the pack, unedited**

Every file in this directory except this README is the run's own output, copied byte for byte from
`~/Desktop/seam-run` on 2026-10-02. This README is the only hand-written file here. Epic #329
(`docs/epics/handoff-seam.prd.md`) cites this run as "seam-run"; ticket #330 committed it (D7 sets the location).

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

`server.mjs` reads `./pack/contracts/*.contract.json` at boot and serves `/pack/*` to the demo page, so it does
not start without that directory. Restore it in a scratch copy, not here: a `pack/` beside these files would
put an ungenerated second copy of the pack in the tree. On 2026-10-02 a scratch copy restored this way booted on
`127.0.0.1:4800` and printed the same line as `server.log`.

## The fence

What was set up. The session was started with this command (`~/.zsh_history`):

```bash
mkdir -p ~/Desktop/seam-run && cp -R ~/Desktop/Linards_current/ux-factory/handoff/verdant ~/Desktop/seam-run/pack && cd ~/Desktop/seam-run && claude
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

The prompt was pasted as one block, the first line plus 16 more (`~/.claude/history.jsonl` records it as
`[Pasted text #1 +16 lines]`, session `a88ec5fc-b0f3-4992-b162-28b883e4fe71`, 2026-08-28 20:43:36 BST). Its text
was not retained: on 2026-10-02 the paste cache held no entry for its content hash (`5a0a8b6da70afe80`), and no
session transcript for that session id existed under `~/.claude/projects/`. The owner confirmed on 2026-10-02
that they do not have it. It is not reconstructed here, because a reconstruction would be hand-written input
presented as the run's.

## Timeline

- 20:43:03 BST: `pack/` copied (its directory mtime).
- 20:43:36 BST: the prompt is pasted (`history.jsonl`).
- 20:48:06 to 20:53:32 BST: every run file is written. The earliest mtime is `questions.md` (20:48:06), the
  latest `notes.md` (20:53:32).
- 20:56:07 BST: one more owner turn in the same session, "give me path to notes.md" (`history.jsonl`).

On 2026-10-02 no run file's mtime was later than 20:53:32 on 2026-08-28. Git does not keep mtimes, so this README
is where that evidence is recorded. "Unedited" rests on those mtimes and on the byte comparison below.

How the copy was made: `rsync -a --exclude pack/ ~/Desktop/seam-run/ <this directory>/`, then
`git add -f server.log`, because the repo's `.gitignore` ignores `*.log`. To re-check the committed bytes
against the Desktop copy while it exists, from the repo root:

```bash
S=$(mktemp -d)
git archive HEAD docs/epics/fixtures/handoff-seam | tar -x -C "$S"
diff -r -x pack -x README.md ~/Desktop/seam-run "$S/docs/epics/fixtures/handoff-seam/2026-08-28-seam"
```

An empty diff means the copy matches. `-x README.md` is safe only while `~/Desktop/seam-run` has no `README.md`;
on 2026-10-02 it had none.

## Files

- `notes.md`: the run's own summary of the pack, the API it built, the demo page and the pack defects it found.
- `questions.md`: 28 logged questions, each with who should answer it, the pack files looked in and what the
  agent assumed.
- `server.mjs`: the zero-dep mock API (`127.0.0.1:4800`) that serves Plant, CareTask and Reading records and
  validates each one against the pack's contracts at response time (`notes.md` "API surface").
- `server.log`: the server's boot line.
- `curl.md`: a curl transcript against the running server, recorded 2026-08-28T19:51:21Z (its own header).
- `index.html`: the demo page served at `/`. It mounts the pack's `vd-plant-card` and `vd-care-task-row`
  wrappers unmodified (`notes.md` "Static page: did it render?").
- `render-before.png`, `render-after.png`: the demo page at boot, and after logging one care task
  (`notes.md`).

Where `notes.md` lists defects in the pack, they are the run's findings, logged as its questions (Q7, Q8, Q13,
Q20, Q1). This README does not restate them as fact.

## Who reads it

CI's verify job runs `node tooling/drift-check.mjs`, whose syntax check runs `node --check` on every tracked
`.mjs`, including `server.mjs`. Two `tooling/build-checks.mjs` sweeps over tracked files also scan `server.mjs`
and `index.html` (for `discovery/bank` and `graded-*` references) and match nothing. Nothing depends on these
files until #334 (T3) mounts `server.mjs` with a restored `pack/`.
