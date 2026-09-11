# PR #391 review — round 2 (the security gate, #387)

**Head** `66d5335` · **Base** `main` @ `4f2e859` · **Round** 2 · reviewed from a clean detached worktree at the head SHA (`/Users/Berzins/Documents/wt-391-r2`), not the author's tree.

**Disclosure, because it changes how much this review is worth.** The round-2 fixes were written by the same session that ran this review, so the deep diff pass was handed to the `code-reviewer` agent as the clean context — it read the round-1 review and the changed files in full, in its own context, and was told to be adversarial. The numbers pass, the guarantees-pass trigger, the validation runs and the severity calls below are mine, and every finding the agent returned was re-derived here before being written down. A reviewer marking their own homework is worth less than a stranger doing it; read R1 in particular on its own evidence rather than on this verdict.

**Guarantees pass: not triggered.** `baseRefOid` is `4f2e859`, byte-identical to the base recorded in round 1's header. The base has not moved, so there is no rebase to sweep.

**Recommendation: approve, with R1 worth taking in this PR.** All ten round-1 findings are fixed, and each was verified by re-derivation rather than by reading. No Critical or High finding survives. One Medium is new — it is in a region round 2 never touched, and round 1 missed it too: the CodeQL gate's own positive control can fall open, by exactly the mechanism F2 just fixed forty lines away. The fix is one line in a file this PR already rewrites.

---

## Findings

### R1 (Medium) — the CodeQL gate's positive control falls OPEN on an empty `n_analyses`, by the mechanism F2 just fixed

`.github/workflows/verify.yml:204-207`, under `set -euo pipefail` at `:201`.

```
204:  n_analyses=$(gh api "…/code-scanning/analyses?ref=$REF&tool_name=CodeQL" --jq 'length')
205:  if [ "$n_analyses" -lt 1 ]; then
206:    echo "::error::no CodeQL analysis on $REF — this gate measured nothing"; exit 1
207:  fi
```

This step's own comment at `:202-203` states its purpose: *"POSITIVE CONTROL, and it runs first: zero alerts because nothing was analyzed looks exactly like zero alerts because the code is clean."* When `n_analyses` is the empty string, that control does not run and does not say so.

**Observed** — the exact construct, driven under `set -euo pipefail`:

```
n_analyses=[]
bash: line 0: [: : integer expression expected
>>> FELL THROUGH to the alert fetch
...and the script continued
```

`[ "" -lt 1 ]` returns non-zero as the *test's own result*, `if` reads that as "condition false", and `-e` does not abort because a `[` in `if`-position is exempt from it — the identical mechanism round 1's F2 named at `:308`. The step then fetches alerts and, finding none on a ref that was never analysed, reports the gate green. A whitespace-only value behaves the same way (observed).

**Scoped, so the fix is not wider than the defect.** Three neighbouring paths are safe and were checked rather than assumed:

| Path | Behaviour | Observed |
|---|---|---|
| `gh api` fails hard | `-e` aborts on the failing command substitution | exit 1 ✓ |
| body is literal JSON `null` | `echo null \| jq 'length'` → `0` → guard fires | ✓ |
| `n_analyses` genuinely unset | `-u` aborts | ✓ |
| **body is empty / whitespace** | **`printf '' \| jq 'length'` exits 0 with 0 bytes → falls through** | **✓** |

So `-u` cannot help: the variable is *set*, to `""`. The gap is precisely `gh api` exiting 0 while its jq stage emits nothing.

**Trigger: mechanism confirmed, trigger not observed.** Reaching it needs an HTTP 200 with an empty body (or any other condition where `gh api`'s jq stage prints nothing without failing). Neither the agent nor I could manufacture that against the real `code-scanning/analyses` endpoint, so this is reasoned-and-mechanism-proven, not seen in the wild. That is why it is Medium and not High.

**Why Medium rather than the agent's Low.** What fails open here is not a feature, it is the check that exists to stop this gate passing vacuously — and it fails open *silently past its own error message*, which is this repo's recorded [[check that cannot fail]] shape. It sits in a gate branch protection is about to require. Against that: the trigger needs an anomalous API response, and the step still fails closed on a hard error, which is why it is not High.

**Fix** — one line, mirroring the `${VISUAL_GATE:-}` idiom already used at `:305`:

```
if [ "${n_analyses:-0}" -lt 1 ]; then
```

Observed to fire the guard on an empty value. A regex guard on `n_analyses` before the comparison would do as well.

**Swept for siblings rather than stopping at one instance.** `:205` is the only bare numeric `[ ]` test on an externally-sourced value in the workflow. `:308` is `$red`, set locally to 0 or 1. `:213` is `-s` (file), `:296` and `:305` are string comparisons — none can raise this class.

---

### R2 (Low) — a "Not run" bullet claims something that has now run six times, including the fixed body

`.claude/reports/security-gate-387-report.md`, under `## Not run`:

> **`gates-green` has not run under its new name.** … This PR's own first run is the observation.

That run has happened. `gates-green` is green on all six pushed heads (`8543bc4` · `0e38370` · `3c0a424` · `4be4b72` · `3dc83f5` · `66d5335`), and job `102913980615` shows CI executing the **F2-corrected** body:

```
if [ "$red" -ne 0 ]; then exit 1; fi
echo "every gate green"
shell: /usr/bin/bash -e {0}
VERIFY: success · VISUAL: success · VISUAL_GATE: success · CODEQL: success · AUDIT: success
every gate green
```

That log line also independently confirms the claim F2's new comment makes and the old one denied — the shell **is** `bash -e {0}`.

The bullet understates the evidence rather than overstating it, which is the harmless direction, but `## Not run` is the section a reader uses to know what is unverified. Move it out, citing the job.

---

### R3 (Low) — the F2 mutation row's job citation names a sibling job from a different run

`.claude/reports/security-gate-387-report.md`, the `gates-green — the fail path itself (review F2)` row:

> the row above was observed UNDER `-e` (`shell: /usr/bin/bash -e {0}`, job 102855797409)

"The row above" is the both-at-once mutation, whose evidence is run **`34472114646`** / job **`102854653417`**. Job `102855797409` is a different job in a different run — the laundered-visual mutation.

**Both resolve and both ran under `-e`**, so the claim itself is true; only the pointer is wrong. Observed:

| Job | Name / result | What its log shows |
|---|---|---|
| `102854653417` (run `34472114646`) | `ready-pr` failure | `shell: /usr/bin/bash -e {0}` · `verify did not succeed` **and** `codeql did not succeed` · exit 1 — **this is the row above** |
| `102855797409` | `ready-pr` failure | `shell: /usr/bin/bash -e {0}` · `visual gate outcome=` · exit 1 |

Round 1 cited both correctly and separately; round 2 conflated them when compressing. Fix: cite `102854653417` for that row.

---

### R4 (Low) — a header line that a skimmer could read back into the retired F3 claim

`.github/workflows/verify.yml:22` — *"it is the ONLY job that can see past the D11 continue-on-error below."*

True as scoped: no other **job** in this workflow reads `needs.visual.outputs.gate`. But the corrected bullet at `:263-269` earns its accuracy by contrasting the *job* against the *check run*, and this header line does not, so someone reading only the file header can reconstruct something close to the claim F3 removed. Not a factual error. Worth tightening to "the only job **in this workflow**" whenever the line is next touched.

---

## Validation

Run by me at `66d5335` in the clean detached worktree, Node v20.20.2.

| Check | Command | Result |
|---|---|---|
| Drift check | `node tooling/drift-check.mjs` | ✅ `✓ syntax · token-css · … · group-count` |
| Token lint | `node tooling/token-lint.mjs` | ✅ `✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| Build checks | `node tooling/build-checks.mjs` | ✅ `build ✓ all 34 groups pass` |
| loc summary | `node agent-layer/gen-loc-summary.mjs --check` | ✅ `3 groups — no drift` |
| param count | `node agent-layer/gen-param-count.mjs --check` | ✅ `120 controls — no drift` |
| CI at head | run `34489847584` | ✅ `verify` `visual` `codeql` `audit` `gates-green` all pass, plus GHAS's own `CodeQL` |

`drift-check` failed on its first run with `Style Dictionary build failed — if node_modules is missing`. That is the fresh-worktree artefact, not drift: green after `cd tooling/style-dictionary && npm ci`. Recorded because a reviewer who stopped at the red would have reported a false failure.

## The numbers pass

Every figure re-derived at **this** head, not carried from the head the report names.

- **193 files across 10 scopes** — the report pins this at `4be4b72`. Re-derived at `66d5335` from run `34489847584`'s own extraction log (job `102913427379`): 193, same breakdown (`system` 75 · `tooling` 45 · `portal` 25 · `agent-layer` 23 · root 15 · `discovery` 4 · `worker` 2 · `scenarios` 2 · `proto` 2), same 28 `.json`. The figure is true at head and honestly labelled.
- **The completeness claim** — re-derived independently at the stated width (`*.mjs *.js *.cjs *.jsx *.ts *.tsx *.html`): twelve tracked files sit outside the allowlist, and all twelve are under `.claude/plans/` or `handoff/`, both deliberately excluded. The claim holds. The agent reconciled the same claim from the other direction against the live extraction log and found nothing unexplained in either direction.
- **`.json` is excluded deliberately** — 28 extracted, all already inside allowlisted directories; the docs now say so rather than dropping it silently, which was the right call and is the second-order version of the same defect F4 found.
- **5 style-dictionary advisories** — `node tooling/audit-delta.mjs 4f2e859` → `base 5, head 5, new 0`. F7's corrected figure, and correctly labelled as one that will move.
- **Every cited run and job id resolves and says what is claimed** — with the one exception at R3, which is a wrong pointer to a true fact, not a wrong fact.
- **"All five jobs green on each pushed head"** — verified against `gh run list`: six heads, six green runs.
- **The subject sweep, not just the digits** — grepped every retired claim as a *verb* (`stays a draft`, `hold the draft`, `check itself goes green`, `7 allowlisted`, `three pre-existing`, `absent set -e`) across the tree and the PR body. Every surviving hit is either round 1's own text naming the defect, a round-2 correction quoting the old claim before refuting it, or an unrelated ticket's report. Nothing retired survives as live prose.

## What's good

- **Round 2 did not stop at the finding as written.** F4 said "add `scenarios/*.mjs`". Doing so produced a sentence in `gates.md` claiming the allowlist was complete — and the check behind it (`*.mjs`/`*.js`) was narrower than the sentence, so `scenarios/check.html` was still outside. That was caught, fixed, and then the *same defect one level down* was caught again when the corrected method omitted `.json`. Both are written up as what they are. This is the honesty contract working on the author rather than on the artifact.
- **F1's fix is proven in both directions**, which round 1's own suggested patch only worried about one of. The agent additionally established the base-side asymmetry is safe by set-theory rather than by cases: `added = headIds \ baseIds`, so shrinking `baseIds` can only enlarge `added` — the base side can over-report but never hide.
- **F2 was driven from the YAML the workflow actually parses**, not from a transcription of it, and then confirmed a third time in CI's own log at `102913980615`. The agent extended it to a 13-case matrix including an embedded colon in a result value, which the `${pair#*:}` parsing survives.
- **The `visual` job's `gate` output was traced on every path** — pass, fail, an earlier step failing so the VR step is skipped, and cancellation before the `always()` step runs. No path yields the literal `"success"` while the gate failed. The code reads `outcome` (raw) rather than `conclusion` (laundered), which is the correct field.
- **The `paths-ignore` collapse question was answered empirically rather than reasoned about.** None of the ten entries carry the middle-single-star shape (`discovery/*/**`) that caused the original bug, and the three `.html` files under `.claude/plans/` — which would expose it if CodeQL's bare `*.html` were un-anchored the way `.gitignore`'s is — are absent from the real extraction log, so the "self-maintains for a new **root** page" framing is accurate.
- **The plan file is left uncorrected on purpose and says so in the PR body.** `.claude/plans/security-gate-387.md` still carries all four errors F7 and F8 came from; it is the record of what was planned, and `gates.md` is the live reference. Disclosed rather than quietly swept.

## Recommendation

**Approve.** No Critical or High finding survives; validation is green at head; all ten round-1 findings are fixed and independently verified.

**R1 is worth taking in this PR** rather than logging: one line, in a file this PR already rewrites, closing the same class of defect F2 opened the round on — and it guards the positive control of a gate branch protection is about to require. R2 and R3 are report corrections that can ride the same commit. R4 is a wording tighten for whenever that line is next touched.

The post-merge branch-protection call remains the owner's, and F9's case-sensitivity warning belongs with it — `gh pr checks` at this head shows both `codeql` (ours) and `CodeQL` (GitHub Advanced Security's), exactly as documented.
