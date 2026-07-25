# PR #59 Review — fix: gen-loc-summary reads committed index blobs, not the working tree

**Issue:** #56 · **Branch:** `fix/loc-summary-committed-blobs` → `main` · **Diff:** +4/−1, one file (`agent-layer/gen-loc-summary.mjs`) · **Method:** fresh-eyes pass (`code-reviewer` agent, clean context) + author empirical verification.

## Recommendation: ✅ Approve

_Posted as a comment — solo repo, formal self-approval not available._ No Critical / High / Medium issues. Two Low notes, both theoretical with **zero instances** in this repo — not blocking; no action taken (any fix would be a separately-approved follow-up).

## What the fix does
`gen-loc-summary.mjs` listed files via `git ls-files` (the index/tracked set) but counted lines from each file's **working-tree** contents (`readFileSync`), so in the shared worktree a parallel ticket's uncommitted edits got baked into the committed `system/loc-summary.json` (happened at `f2b54d2`, ~100 phantom lines in `pages`; fixed by a clean-tree regen in PR #54). Line 42 now reads each file's **index blob** via `git show :<path>`, so contents come from the same tracked snapshot as the list. `--check` can no longer be fooled: CI's fresh checkout has index == HEAD, so any un-`git add`-ed regen goes red instead of silently passing.

## Issues by severity
| Severity | Count | Items |
|---|---|---|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 0 | — |
| Low | 2 | **(1) Symlink semantics** — `git show :path` returns the link-target string, not linked content, a behavior change from `readFileSync` (follows links); **zero tracked symlinks** exist (`git ls-files -s`, no mode `120000`). **(2) Unresolved-merge** — `:path` (= `:0:path`) fails at conflict stages 1/2/3; only reachable if regenerating mid-unresolved-merge, not a real regen state. Both YAGNI; no fix warranted. |

## Validation
| Check | Result |
|---|---|
| `node --check agent-layer/gen-loc-summary.mjs` (gate's syntax step) | ✅ OK |
| `node --check` sweep over **all** tracked `.mjs` | ✅ all parse |
| `genLocSummary({check:true})` (`--check`) | ✅ no drift |
| Clean-tree regen vs HEAD (`git diff system/loc-summary.json`) | ✅ no change — swap is behavior-preserving on a clean tree |
| CI-parity: `--check` on the committed clean state | ✅ exit 0 (this is exactly what CI runs) |
| Dirty-tree proof (+100 lines to `system/site.js`, unstaged) | ✅ fix ignores it — a working-tree read would inflate runtime 7800→7900 / total 12100→12200; the fixed generator leaves `loc-summary.json` unchanged |
| Index vs working-tree content parity | ✅ no `.gitattributes`, `core.autocrlf` unset, `text/eol/filter` unspecified; and `\r` doesn't shift `split("\n")` counts even hypothetically |
| Full `tooling/drift-check.mjs` end-to-end | ⚠️ not run here — fresh worktree lacks `tooling/style-dictionary/node_modules` (env-only); a one-line change to this generator cannot affect the token/handoff/vocabulary/scenario steps, and every step that touches the change is green above |

## What's good
- **Right ref, not just a working one:** `:<path>` (index, stage 0) over the naive `HEAD:<path>` — the only ref self-consistent with the `git ls-files` list source. A staged-but-uncommitted new file is in the index but not in HEAD, so `HEAD:path` would throw on exactly the `git add`-before-regen path #56 establishes.
- **Failure-mode upgrade:** post-fix the only local mistake is forgetting `git add`, and that can't ship silently — CI goes red.
- **Determinism preserved** — group order, sort, `round100`, trailing newline all untouched.
- **No dead imports** — `readFileSync` and `join` still used in the check/write paths.
- **Shell-safe** — args passed as an array to `execFileSync`; filenames with spaces/special chars are safe by construction.
- **`$description` unchanged and now actually honest** — "counted from the tracked source" was silently false before the fix whenever the working tree was dirty.
- **Numbers don't move** — the +3 comment lines land in the `generators` group (the generator counts itself) but round away (generators 1535→1538 → 1500; total 12087→12090 → 12100), so no `approach.html` number changes and no VR-baseline churn / handoff regen.
- **Error surface adequate** — a raw `git show` failure already names the offending path, matching the project convention and the adjacent unwrapped `git ls-files`; no wrapper needed.

## Optional (non-blocking)
- Could echo the "`git add` before regen" discipline in the top-of-file header comment (lines 1–10), for visibility beyond the fix-site comment + commit message. Nice-to-have.

**Handoff:** posted on the PR. A human reviews the code + this review and merges.
