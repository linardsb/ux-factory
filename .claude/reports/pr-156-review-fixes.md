# PR #156 review fixes — the operator path (#140)

Triage and fixes for `.claude/code-reviews/pr-156-review.md` (one High, two Mediums).
**Fixed: 3. Deferred: 1 (issue #157). Manual-only: 0** — every fix has a check that fails when the
fix is reverted.

| Finding | Call | Where |
| --- | --- | --- |
| High 1 — `{...body}` spread makes `force` caller-settable | **Fixed**, wider than specified | `portal/lib/builder.mjs`, `portal/server.mjs`, `tooling/build-checks.mjs` |
| High 1b — the comment's false reason ("binds 127.0.0.1") | **Fixed** | `portal/lib/builder.mjs:117-126` |
| High 1c — optional portal-wide Origin guard | **Deferred** → #157 | — |
| Medium 2 — an answer change clobbers the operator's edited question | **Fixed** | `portal/public/portal.js` |
| Medium 3 — `verify.yml` omits group 8; the SDK-free warning is in the wrong file | **Fixed** | `.github/workflows/verify.yml` |

---

## High 1 — fixed in two places, not one

**What was wrong.** `server.mjs:105` spread the raw POST body into `runBuild`, which destructured
`force` and forwarded it. In the runner, `force` skips the `traces/<slug>.raw.jsonl exists` throw;
past that throw `record-composition.mjs:415` `rmSync`s the committed proposal and
`trace-recorder.mjs:65` truncates the committed raw trace to zero bytes — *before* the SDK query, so
it lands even if the run then dies on auth. Reachable from any page in the operator's browser: there
is no Origin check, and `readBody` `JSON.parse`s regardless of `content-type`, so a `text/plain` POST
is a simple request with no preflight.

**Divergence from the review's fix, and why.** The review's fix lands only at `server.mjs:105`.
`tooling/build-checks.mjs` does not import `server.mjs`, so the only check available for that fix is
a grep for `{ ...body` — [the check that cannot fail](.claude/code-reviews/pr-156-review.md), which
is the failure mode this file has already met repeatedly. So the fix went to **both** layers:

1. **`builder.mjs` — `force` is no longer a parameter at all.** The guards and the runner's option
   object moved into a new pure exported `runOptions()`, which returns
   `{scenario, question, slot, slug, isDry, force: false}`. `runBuild` is now
   `runOptions(...)` + the lock + the run. The destructive flag is *structurally* unreachable from
   HTTP rather than merely unsent — even if the route's parameter list drifts later.
   Split out and exported for exactly the reason the review praised for `withRunLock` and
   `stepEvent`: a rule inline inside `runBuild` is one the gate cannot reach, because reaching it
   means starting a real agent run.
2. **`server.mjs` — every parameter named**, no spread. Stops any future `runBuild` parameter
   becoming silently caller-settable.

The CLI keeps its `--force`: `record-composition.mjs:496` calls `runComposition` directly.
`runBuild`'s only two callers are the route and the gate (`grep -rn "runBuild("`).

**The check** — `tooling/build-checks.mjs` group 8, checking `runOptions` rather than `runBuild`
because it is pure. Calling `runBuild({force: true})` to watch the flag get dropped would be safe
only while green: on a regression the *gate itself* would delete the committed proposal and start a
paid run.

- `runOptions(...).force === false` for `force: true | 1 | "yes" | "false" | {}`
- the returned key set is asserted exactly, so a parameter added to `runComposition` later cannot
  start being caller-settable by being quietly forwarded
- every guard re-asserted through `runOptions` (traversing slug, unknown slot, blank question,
  out-of-enum answer, `dry`→`isDry`), so the split did not leave `runBuild` guarding a path
  `runOptions` has already returned from
- **…and that `runBuild` still routes through it.** Every assertion above is about `runOptions`, and
  all of them stay green if someone re-adds `force` to `runBuild` and hands it to `runComposition`
  directly — the check would be testing the seam and not the caller, which is the exact failure mode
  being fixed. So `runBuild.toString()` (the **live** function object, off which the route actually
  runs; the repo has no build step, so the source is the source) must not name `force` anywhere in
  its body, and must still call `runOptions(`. `runBuild.length` is the tempting check here and it is
  vacuous — a destructured object parameter counts as 1 however many keys it names.

**Mutation-proved, four ways.**

| Mutation | Result |
| --- | --- |
| `force` back in `runOptions`' destructure | ✗ 5 failures |
| `force` back as a `runBuild` param, forwarded to `runComposition` | ✗ caught — "runBuild names \`force\` in its own body" |
| `force` forwarded **without** being named a param (`opts.force`) | ✗ caught — same assertion |
| the guards inlined into `runBuild`, bypassing `runOptions` | ✗ caught — "runBuild no longer calls runOptions" |

Restoring the `{...body}` spread in `server.mjs` no longer reaches the *destructive* path — verified
by calling `runOptions({...hostileBody, force: true})` directly, which still yields `force: false`.
The spread is fixed anyway, because it would still let a caller set any parameter `runBuild` gains
later; that is what the explicit list at the route is for.

## High 1b — the comment

`builder.mjs:117-126` said the guards were *"not trust boundaries (the portal binds 127.0.0.1
only)"*. Loopback binding stops a **remote** client; it does nothing about a browser on the
operator's own machine. Reworded to state the real boundary and to name what the parameter whitelist
is actually load-bearing for. Proof for this one is reading it — no test invented for a comment.

## High 1c — deferred to #157

The portal-wide Origin guard. Deferred because it is the **pre-existing** class the review itself
scopes out (`/api/chat` and `/api/figma/pull` have the same gap on `main`), and because it is not the
two-line change it looks like: same-origin `fetch` POSTs **do** send `Origin`, so a naive
`origin !== expected` reject breaks the drawer, the intake form and the chat pane unless it accepts
both `http://localhost:<PORT>` and `http://127.0.0.1:<PORT>` — both in live use. That belongs in its
own PR with all four POST surfaces driven afterwards, not dropped into a fix PR.

**What #156 does not close, stated plainly:** after this fix a cross-origin POST can still *start* a
token-spending run on a **fresh** slug — the overwrite guard only fires on a slug that already has a
trace, so no `force` is needed for that. The destructive path is closed; the zero-interaction-run
path is not. Both `builder.mjs` and `server.mjs` say so in comments and point at #157.

## Medium 2 — the clobbered edit

**What was wrong.** `renderDraft` unconditionally assigned `#builder-question` and `#builder-slug`,
and is reached from all ten radio handlers plus the slot `<select>`. But `draftQuestion` reads only
`shape` and `action` (rule 3, gated byte-for-byte in group 8) and the slot is not a parameter at all
— so for eight of the ten answers and every slot switch it overwrote the operator's edit with a
question that is *provably identical*. Worse, `refreshDraft`'s `catch` called
`setBuilderComposable(false)`, which empties both fields — right for a non-composable scenario, but
on a transient `/api/build/draft` failure it destroyed typed input recoverable from nowhere.

**Fixed** with **two** `touched` flags, not one — the slug is derived (`scenario-shape-slot`), so a
slot switch *should* refresh it while the edited question survives the same switch. Flags reset on a
scenario change (a different subject means the old edit is about nothing) and on the clear path.
`setBuilderComposable` took a `{ clear }` option so the transient-failure branch reports
`err.message` and leaves the fields alone. Both fields are static markup in `index.html` — only
`#builder-questions` is re-rendered — so the `input` listeners attach once.

**The check** — the portal booted on a spare port (the operator's own instance on 4747 left running)
and the drawer driven in real Chromium. Only `/api/build/config` and `/api/build/draft` are touched;
neither spends a token.

```
1 · the edit survives a non-input answer change; the slug is unchanged
2 · …and survives all 8 non-input answers × every option
3 · a slot switch keeps the question and REFRESHES the derived slug
4 · an edited slug is not clobbered by an INPUT answer changing the question
5 · a transient draft failure keeps both fields and reports the error
6 · a scenario change resets the edits
7 · a non-composable scenario still clears, hides Run, and shows the refusal verbatim
```

**Mutation-proved.** Restoring the two unconditional assignments → **5 of those assertions fail**.
The script also caught a flaw in itself first: step 5 initially re-checked an already-selected radio,
which fires no `change` — it now picks a demonstrably unselected option, so the branch is really
entered.

Not committed: this repo has no test suite by convention (`CLAUDE.md` — "run the surface you
touched"), and `tooling/build-journey.mjs` is scoped to `/build`, not the portal.

## Medium 3 — the CI header

`verify.yml`'s header enumerated the pre-#140 groups. Added group 8 and the operator path, and moved
the load-bearing warning to where a maintainer actually looks — beside the `Build checks` step, not
only in `tooling/build-checks.mjs:12-17`: **do not add an `npm ci` for `portal/` to this job.** It
names the failure someone would be reacting to (`Cannot find package
'@anthropic-ai/claude-agent-sdk'`), says that installing the deps *deletes* the check rather than
fixing it, and says the step keeps printing `all 8 groups pass` afterwards. #150 was a chore for
stale counts in this same header one PR ago — same class.

---

## Validation

| Command | Result |
| --- | --- |
| `node tooling/build-checks.mjs` | ✓ all 8 groups pass |
| same, `portal/node_modules` moved away | ✓ all 8 groups pass — **the SDK-free invariant still holds with the new assertions** |
| `node tooling/drift-check.mjs` | ✓ 8 checks |
| `node tooling/token-lint.mjs` | ✓ 64 tokens · 0 undeclared |
| `node tooling/validate-trace.mjs` | ✓ all traces |
| `node scenarios/validate.mjs` | ✓ 3 scenarios · verdicts differ |
| portal boots · `/api/health` answers | ✓ |
| the drawer driven in real Chromium | ✓ 15 assertions |
| 4 mutations of the `force` path (see the table above) | ✗ each caught — **the gate is not grep-shaped** |
| mutation: unconditional `renderDraft` assignments | ✗ 5 failures — **the drawer check catches it** |

**No visual baselines move.** Nothing under `system/`, `agent-layer/` or the ten gated pages changed
— the diff is `portal/`, `tooling/build-checks.mjs` and `.github/workflows/verify.yml`.

## Not re-litigated

The review's nine checked-clean items and its "what's genuinely well done" list were left alone. No
honesty machinery was touched by these fixes: `buildTask`, `PIV_COMPOSE_SYSTEM`, `refsFor`,
`makeFence` and `SECRET_PATHS` are byte-identical, as is every committed trace and composition.
