# PR #391 review — the security gate (CodeQL, advisory delta, no-model merge gate) (#387)

**Head** `8543bc4` · **Base** `main` @ `4f2e859` · **Round** 1 · reviewed from a clean detached worktree at the head SHA, not the author's tree. Base is `origin/main`'s tip, unmoved since the PR opened, so there is no guarantees-pass to run this round.

**Recommendation: request changes.** Three High findings; none of them is the design. The gate stack is right, it is proven by mutation rather than by reading, and every figure I could re-derive at this head holds. What fails review is one script path that passes vacuously in exactly the shape the file's own header forbids (F1), a fail path that depends on a shell option its comment says is absent (F2), and a load-bearing sentence about branch protection that the API contradicts (F3) — now written into `gates.md`, where the next ticket will read it as settled.

---

## Findings

### F1 (High) — `audit-delta.mjs` reads a half-present directory as "removed" and exits 0, which is the vacuous pass its own header forbids

`tooling/audit-delta.mjs:62-77` (the `ref === null` branch at line 67), against the contract at lines 16-17: *"Fails CLOSED: an unusable audit on either side throws naming the directory and the side, rather than yielding an empty set and passing vacuously."*

`materialise` loops `FILES = ["package.json", "package-lock.json"]` and returns `null` the moment **either** file is missing — without asking whether the other is still there. The caller cannot tell that apart from a cleanly removed directory, so it logs "removed by this change" and contributes zero advisories.

**Observed** — reproduced by me at this head, `portal/package-lock.json` moved aside, `portal/package.json` untouched and still declaring `"@anthropic-ai/claude-agent-sdk": "^0.1.77"` and `"zod": "^4.4.3"`:

```
  portal: absent at head — removed by this change
  portal: base 0 advisories, head 0, new 0
audit-delta     ✓  no advisory ID present at head that the base did not carry
EXIT=0
```

The trigger is not a conspicuous `rm` in a diff: a `.gitignore` line plus `git rm --cached portal/package-lock.json` reads as housekeeping, leaves the file on the author's own disk, and takes `portal/` out of this gate permanently. `portal/` is the one directory CI deliberately never runs `npm ci` in (the group-8 SDK-absence invariant, `verify.yml:81-89`), so nothing else in the stack would notice.

**Fix** — head side only; the base side's `show.status === 128` at line 72 over-reports, which is the safe direction, and should stay. **Hoist this above the `for (const f of FILES)` loop** — it decides for both files at once, where today's `ref === null` branch sits inside the loop and decides per file, which is the bug:

```js
if (ref === null) {
  const present = FILES.filter((f) => existsSync(join(ROOT, dir, f)));
  if (present.length === 0) return null;                    // genuinely removed
  if (present.length !== FILES.length)
    throw new Error(`audit-delta: ${dir} (head) carries ${present.join(" + ")} but not ` +
      `${FILES.filter((f) => !present.includes(f)).join(", ")} — cannot audit, refusing to read it as removed`);
  for (const f of present) copyFileSync(join(ROOT, dir, f), join(tmp, f));
  return tmp;
}
```

Worth its own reddening row in the proof table, the way the other four mutations got one — delete-the-lockfile-only is the mutation, and the current table does not exercise this path.

---

### F2 (High) — `gates-green`'s fail path works only because of an inherited `-e` the comment says is absent

`.github/workflows/verify.yml:281-301`. The assert body ends `[ "$red" -eq 0 ]` then `echo "every gate green"`, under a comment stating: *"`set -e` is deliberately absent: with it, the first non-zero comparison would abort before the remaining jobs are reported."*

Both halves are wrong, and the second is load-bearing.

**Observed** — the exact body, driven with synthetic env:

| shell | input | result |
|---|---|---|
| `bash -e` (Actions' default) | `VERIFY=failure` | `::error::verify did not succeed` → **exit 1** |
| `bash` (no `-e`, as the comment describes) | `VERIFY=failure` | `::error::verify did not succeed` → `every gate green` → **exit 0** |
| `bash -e` | three reds | **all three named**, exit 1 |
| `bash -e` | `VISUAL_GATE=failure` only | `::error::visual gate outcome=failure`, exit 1 |

The step fails today only because GitHub's default shell is `bash -e {0}` — the job's own log says so (`shell: /usr/bin/bash -e {0}`, job `102855797409`). Without `-e`, `[ "$red" -eq 0 ]` returns 1 into nothing, `echo` succeeds, and the last command's status becomes the step's: **the required merge check goes green immediately after printing `::error::verify did not succeed`.** An annotation is not an exit code.

The stated reason for avoiding `-e` does not exist either: `[` inside an `if` condition is exempt from `-e`, so all four jobs are still reported. The PR's own "both at once" mutation is that evidence read the other way — run `34472114646`'s log shows `shell: /usr/bin/bash -e {0}`, then `::error::verify did not succeed` **and** `::error::codeql did not succeed`, then `Process completed with exit code 1`. The multi-report the comment credits to the absence of `-e` was observed *under* `-e`.

Not a live break: four CI mutations show `Require every gate green = failure`. It is one edit away from being the repo's own [[the check that cannot fail]] — `set +e`, a `shell:` change, or moving the body into a script invoked another way turns the merge gate into a no-op that still prints errors, and the comment tells the next editor the current form is deliberate. (The reviewing agent that checked this independently confirmed the inherited `-e` and concluded the design was intentional — which is the misreading, arrived at from the comment, in one pass.)

**Fix:**

```
if [ "$red" -ne 0 ]; then exit 1; fi
echo "every gate green"
```

and correct the comment: the shell *is* `bash -e {0}`; `-e` is not what would truncate the report; the explicit `exit` is what makes the failure independent of the shell's options.

---

### F3 (High) — "the `visual` check itself goes green while its gate failed" is false; the design it justifies is right

`.github/workflows/verify.yml:264-266` · `.claude/references/gates.md:121` and `:127` · `.claude/reports/security-gate-387-report.md:134-137` · PR body, "Notes for the reviewer" bullet 2.

They say that on a `feature/v3-*` branch the **`visual` check** reports success while its gate failed, so protection requiring `visual` directly would let a laundered failure through — and `gates.md:127` states it as a heading: *"A required status check cannot see a job-level `continue-on-error`."* What mutation D measured is a different object: `needs.visual.result`.

**Observed** on the mutation-D head `343022a` (run `34472498382`, the deleted-baseline probe):

- `ready-pr` job log (`102855797409`), env block: `VISUAL: success` · `VISUAL_GATE: failure` — the in-workflow expression **is** laundered ✓
- jobs API, same run: `visual` → `conclusion: failure`
- check-runs API on `343022a`: `visual  completed  failure`

`continue-on-error` launders **`needs.<job>.result`**, which lives inside the workflow. It does not launder the **check run**, which is what branch protection reads. On the one head where this was measured, protection requiring `visual` would have blocked.

**No hole opens.** `gates-green` reading `needs.visual.outputs.gate` is still necessary — without it `gates-green` itself would have gone green on that run — and requiring `gates-green` is still the right contexts choice. The defect is that a false mechanism is now a permanent cannot-reach in `gates.md` and the rationale for a STANDING RULE in `verify.yml`. AC #5 as the plan words it is met exactly; it is the generalisation past it that fails.

**Fix** — restate all four to what was measured: *a job-level `continue-on-error` launders `needs.<job>.result` for downstream jobs (actions/toolkit#1739), so an aggregator job must read the true outcome from the job's own output; the job's own check run still reports failure.* Keep the standing rule — it is correct for the aggregator.

---

### F4 (Medium) — `scenarios/validate.mjs` is the one tracked source file outside the allowlist, and both docs describe that gap as prospective

`.github/codeql/codeql-config.yml:17-20` and `.claude/references/gates.md:132` both word the allowlist's limit in the future tense — *"a new top-level source directory is silently unanalyzed until someone adds it here"*. It already bites.

**Observed** at this head:

```
$ git ls-files '*.mjs' '*.js' | (minus the allowlist, handoff/traces/replay/.claude/.agents/.archon)
scenarios/validate.mjs          # 332 lines, hand-written, not generated
```

and it is imported by two files that *are* in scope: `agent-layer/gen-company-package.mjs:22` and `tooling/drift-check.mjs:23`. CodeQL cannot follow a call from an in-scope caller into an out-of-scope callee, so this is a present blind spot, not a future one.

**Fix** — one line, mirroring the precedent this PR already set for `discovery/`:

```yaml
  - discovery/*.mjs
  - scenarios/*.mjs
```

`scenarios/<slug>/` fixture packages stay out, exactly as `discovery/<slug>/` does. Then re-word both "cannot reach" sentences in the present tense: the allowlist is complete *as of this commit* and nothing gates it.

Expect it to surface nothing today — `validate.mjs`'s inputs are argv and repo-local JSON, the same local threat model that made the plan's `eval(argv[2])` seed produce zero alerts. This is a coverage and accuracy finding, not a live vulnerability.

---

### F5 (Medium) — `strict: false` is a boundary the gate does not state

PR body + `.claude/reports/security-gate-387-report.md:100-102` · `.claude/references/gates.md:119-139`.

The protection command sets `"strict": false`, so a PR merges without being re-tested against a `main` that moved after its last push. Both new gates are computed at push time — CodeQL analyses `refs/pull/N/merge` as it was then, and the delta is against `github.event.pull_request.base.sha` — so a merge can land code neither gate has seen against the current base.

Not a request to flip it: `strict: true` re-queues every open PR on every merge, which on a solo repo is a tax. `gates.md`'s own convention is that every gate names the boundary it cannot reach, and this one is unnamed. One bullet.

---

### F6 (Low) — "the 7 allowlisted scopes" contradicts the config shipped in the same PR

PR body (CodeQL baseline paragraph) · `.claude/reports/security-gate-387-report.md:59`. The config carries **8** allowlist entries and all 8 produced files.

**Re-derived by me at this head**, counting `Extracting …` lines in the `codeql` job's own log (run `34483471424`, job `102891765000`):

```
system 75 · tooling 45 · portal 25 · agent-layer 23 · root *.html 15 · discovery 4 · worker 2 · proto 2  = 191
```

**191 holds at this head** — not merely transferred from #389 — and so does the rest of the sentence: the `discovery/` four are `bank.mjs · ops.mjs · prd-projection.mjs · proposals.mjs`, `proto/` is the two pages with no `compositions/`, `node_modules` count 0. Only the scope count is wrong: "7" is the pre-discovery-fix number riding along with a post-fix 191.

---

### F7 (Low) — `gates.md:137` says three style-dictionary advisories; the tool prints five

**Observed**, `node tooling/audit-delta.mjs 4f2e859` at this head:

```
  tooling/style-dictionary: base 5 advisories, head 5, new 0
```

Five — and the PR body's own gate block says five, and the mutation row says "the 5 pre-existing … IDs". The three came from the plan (`security-gate-387.md:659`, AC #3) and was carried into the reference doc unchecked. Fix: five, or drop the count; it is a live number that will move.

---

### F8 (Low) — stale draft-flip language survives the O1 re-decision

- `.github/workflows/verify.yml:166` — "the upload fails, this job fails, and **the PR stays a draft**". Nothing flips a draft any more; the `codeql` job fails and `gates-green` refuses.
- `.claude/references/gates.md:135` — "`medium`, `low` and unrated alerts … **do not hold the draft**" → do not block the merge.

The retired design surviving as a verb after its number is gone.

---

### F9 (Low) — the required contexts are case-sensitive and this head carries both `codeql` and `CodeQL`

Check runs at `8543bc4`: `codeql` (our job, `github-actions`) **and** `CodeQL` (`github-advanced-security`, the results check). Contexts match exactly, so typing `CodeQL` in the post-merge API call would require a check that is not this gate. Worth one clause where that command is written down, since it is run by hand, once, with nothing gating it.

---

### F10 (Low) — `verify.yml:256-258` overstates when the merge gate's `if:` can be false

*"This one is false only off a pull_request event, where protection does not apply."* It is also false when the run is cancelled, and a `gates-green` that never runs is reported **skipped** — which this same PR correctly documents as counting as passing. `gates.md:128` states the rule without the "only", and the two disagree; the looser one is the comment sitting above the line an editor would touch.

No hole today (expected, not observed): a cancelled run leaves the other four required checks *cancelled*, which does not count as passing, so the merge stays blocked. Fix by matching `gates.md`'s wording.

---

## Validation

All run by me, in a clean detached worktree at `8543bc4` (`/Users/Berzins/Documents/wt-391`), Node v20.20.2 local.

| Check | Command | Result |
|---|---|---|
| Drift check | `node tooling/drift-check.mjs` | ✅ `✓ syntax · token-css · … · group-count` |
| Token lint | `node tooling/token-lint.mjs` | ✅ `✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| Build checks | `node tooling/build-checks.mjs` | ✅ `build ✓ all 34 groups pass` |
| loc summary | `node agent-layer/gen-loc-summary.mjs --check` | ✅ `3 groups — no drift` |
| Advisory delta | `node tooling/audit-delta.mjs 4f2e859` | ✅ `✓` — 3 dirs; style-dictionary 5/5/0 |
| Syntax | `node --check tooling/audit-delta.mjs` | ✅ |
| YAML | `yaml.safe_load` both files | ✅ 5 jobs · 8 paths · 10 ignores · `needs` = the four |
| CI at head | run `34483471424` | ✅ `verify` `visual` `codeql` `audit` `gates-green` all pass |
| CodeQL at `refs/pull/391/merge` | code-scanning API, re-derived now | ✅ 1 analysis · `results_count: 0` · `rules_count: 87` · 0 open alerts |

The plan's ticket-link AC is met, and by the command rather than by reading the body: `gh pr view 391 --json closingIssuesReferences` returns issue **387** ✓.

**The numbers pass.** Every figure I could re-derive at *this* head holds: 191 extracted files and their scope breakdown from the job's own log (F6 aside), the CodeQL analysis/rules/alert counts, 34 groups, 63 tokens, the advisory counts (F7 aside). Every cited job ID resolves and says what is claimed — `102854187896` `codeql` **failure**, `102851241506` / `102852214538` / `102856482180` `ready-pr` **failure**, run `34471565003`'s `audit` step **failure**, and `Upload diff report` **success** on the laundering probe. The historical figures are labelled historical, the "skipped counts as passing" claim is correctly labelled documented-not-measured, and `piv-create-pr/SKILL.md` is byte-identical to base (`git diff` → 0 lines) as the body asserts.

---

## What's good

- **Every gate reddened by a mutation, none read.** Eight rows, seven CI runs, six deliberately red. The two mutations that did *not* redden were replaced and written up as plan errors rather than quietly accepted — `eval(argv[2])` vacuous under the default suite, `maxDiffPixels: 0` unable to fail a pixel-exact baseline. That is the standard this repo's protocol asks for and rarely gets.
- **The CodeQL gate's positive control runs first**, before any count is read: zero alerts because nothing was analysed is refused by name.
- **The `visual` job's outcome plumbing is correctly ordered** — the truth is captured by an `if: always()` step *before* the step that deliberately fails the job, and `if: failure()` → `if: steps.vr.outcome != 'success'` on the upload is a real fix, since `failure()` reads the laundered status and would never have fired.
- **Fails closed everywhere else I probed it**: an empty `VISUAL_GATE` is not success; unparseable `npm audit` output throws; `gh api` failing takes the CodeQL step down under `-euo pipefail`; a missing merge-ref analysis is refused by name.
- **No shell string interpolation anywhere in `audit-delta.mjs`** — `execFileSync`/`spawnSync` with argv arrays throughout, so refs and paths never reach a shell.
- **The allowlist as an allowlist**, with the `**`-collapse measured rather than reasoned about, and `discovery/`'s four modules verifiably in the database at this head.
- **The delta framing for `npm audit`** is the right call: a fail-on-severity check over pre-existing build-time advisories is the check that gets switched off in a month.
- **The report is honest about what has not run** — `gates-green` under its new name, the push-to-`main` codeql leg, branch protection itself — and about the `git checkout --` that destroyed two files' uncommitted work.

---

## Recommendation

**Request changes** on F1, F2, F3. All three are edits inside files this PR already touches: one branch in `materialise`, one bash line plus its comment, and one sentence restated in three places (plus the PR body). F4–F10 are a one-line config addition and doc/figure corrections that can ride the same commit.

The post-merge branch-protection step stays the owner's, and F9 belongs with it.
