# PR #492 review: ratify — a proposal becomes a vocabulary member (#313)

**Head** 41b1fd986926940607d0d4e077c0137e1ec5f788 · **Base** main @ `3b5a6c7c6f7c385b1f53bb90102b2e2cc85b1bb6`
First review round, so no guarantees pass was needed. The base equals current `origin/main` (observed), and `mergeStateStatus` is CLEAN.

## Summary

This PR matches its intent. Three things were checked and hold:

- **The preview → confirm hash binding.** Confirm re-plans from the current bytes and compares the result against a hash taken over HEAD, the record, the drafts, the input and every write's sha256. The clean-tree check runs before the hash check.
- **The spawned chain.** It uses argv arrays only, never a shell.
- **The owner's CSS.** Only anchored `var(--token)` values are accepted, the tokens must be declared in the contract, and no `;`, `{` or `}` can reach a property.

`admittedTemplate` keeps the renderer's "refuses the rest" guarantee: `textContent` only, `data-*` attributes only, and tags from a frozen allowlist. There are no Critical or High findings. There are three Medium and three Low findings, listed below.

Deviations D1, D4, D5 and D11, and the four plan amendments, are documented, so they are not treated as findings.

## Issues

### Medium

**F1: the import's source filename can inject a heading into the spec.** `portal/lib/ratify.mjs:117-121`
- `provenanceLine` puts `record.source.file` (the dropped file's `file.name`) into the spec's Usage line unchecked.
- `PROSE_BAD_RE` (the check that refuses headings and fences in prose) runs on `licence` and `attribution` only.
- The reviewer agent confirmed this with a node snippet: a filename containing `\n## Data binding\n` produces a spec with that section twice. That breaks the four-section shape `checkInput`'s prose rule exists to protect.
- The trigger is exotic (a newline in a filename), and the input is the owner's own drop.
- **Fix:** refuse, or collapse, line breaks in `source.file` and `source.tool` inside `provenanceLine` or `checkInput`.

**F2: an exception after the first write leaves a half-written tree with no revert command.** `portal/lib/ratify.mjs:604-640`
- Only a red gate returns `revert`. A throw from `writeFileSync` midway through the six writes, from `diffOf`, from `saveRun` (a base conflict) or from the record write reaches the server's catch-all 500. The tree is left dirty, and no revert command comes back.
- The record is also written after `saveRun`. If that write throws, the ledger says ratified while the record carries no `elapsed.ratify`.
- **Fix:** wrap everything from the first write to the return in try/catch. On error, return `{ gatesRed: true, error, revert: revertOf(fresh porcelain) }`. Either write the record before `saveRun`, or document the order in the header.

**F3: slot classes are not checked for collisions.** `portal/lib/ratify.mjs:135,179`
- Only the root class `${prefix}-${component}` is checked against `vocabClasses`. A text slot's `${cls}${suffix}` is not checked.
- Example: component `metric` with suffix `-tile` yields `ds-metric-tile`. If that class already belongs to a vocabulary component or to another admission, the appended CSS block restyles that component.
- No gate catches this: `checkAdmitted` checks only the class pattern.
- **Fix:** refuse any slot class that equals a vocabulary class or an admitted class.

### Low

**F4: the returned diff omits untracked files.** `ratify.mjs:557-580`
- `diff` is `git diff`, which covers tracked files only. A file the chain creates shows up in `changed` but not in the diff text; only the created spec is listed.
- The D5 guard's `:(exclude,glob)*.md` matches root-level `.md` files only. That is the correct behaviour, but the addendum reads as "prose excluded". A one-line comment would prevent a later "fix" that widens it.

**F5: an attr slot can claim renderer-owned attributes.** `system/templates.admitted.mjs:35,76`
- `ATTR_RE` (the rule for attr-slot names) admits `data-part`, which `withPart` sets for layers and selection. It is owner-authored, so this is not an XSS path, but it can break selection for that part.
- **Fix:** refuse a short reserved list.

**F6: a preview during an in-flight confirm answers `dirty`.** `ratify.mjs:540`
- The answer is safe but misleading: the tree is dirty only because the confirm is writing. `busy` would name the real cause.

## Validation

All results below were observed in a detached worktree at `41b1fd9`.

| Gate | Result |
|---|---|
| `node tooling/drift-check.mjs` | ✅ syntax · … · build-handoff · group-count |
| `node tooling/token-lint.mjs` | ✅ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node tooling/build-checks.mjs` | ✅ `all 50 groups pass`, exit 0 |
| `node tooling/ratify-journey.mjs all` | ✅ `44 assertions`, exit 0; main-tree `git status` and `.git/info/exclude` unchanged |
| Portal smoke on a free port, killed by PID | ✅ health `bootSha = headSha = 41b1fd9`, `stale:false`; cross-origin `ratify/confirm` → 403 |
| CI (`gh pr checks`) | ✅ CodeQL, audit, codeql, verify, visual, gates-green |

The first `build-checks` run went red. Cause: `tooling/icons` was not installed in the fresh worktree, which is an environment problem and not a regression. After `npm ci` it passed.

`canvas-journey` and `catalog-journey` were not re-run. The PR body records them at `a9e4787`, and after that commit only `ratify.mjs`, one prose line in `build-checks` and the three PNGs changed (observed with `git diff --stat a9e4787..4649b87`), so neither journey's surface moved.

## Numbers pass

| Claim | Provenance | Check |
|---|---|---|
| 50 groups, 63 tokens | observed | reproduced |
| 44 ratify-journey assertions | observed | reproduced at `41b1fd9` |
| runtime files 80 → 81, lines 32600 → 32800 | observed | matches `system/loc-summary.json` diff |
| ten-step chain | observed | `CHAIN.length === 10`, order as listed in D4 |
| canvas 173/172/172, update:docker 33 passed | observed at `a9e4787` | labelled with its sha; not re-run (see above) |

No derived figure is presented as observed. The one figure not re-run here (50.8's mutation going red through a TypeError rather than the named refusal) is disclosed in the report's own table.

## What is done well

- **A single request cannot write.** The hash exists only in a preview response, and it covers HEAD. Dirty is checked before stale, so a forged hash cannot bypass the clean-tree guard.
- **The admitted registry is data, with exactly one interpreter.** No admission touches renderer code, and `checkAdmitted` refuses script, a, button, input, img, style and iframe by name.
- **Mutation evidence for every new check,** with positive controls. The 50.5 vacuity (the registry is empty today) and 50.13's injected chain are stated in the gate strings rather than hidden.
- **The revert command is built from git porcelain paths gated by an allowlist.** Nothing the owner types reaches the shell line.

## Recommendation

**Approve.** Nothing here blocks the merge. F1–F3 are worth a short follow-up, ideally before the first real admission, because F3 can restyle an existing component and F2 is exactly the path where the owner needs a revert command. F4–F6 are optional.

This is posted as a comment because GitHub does not allow approving your own PR.
