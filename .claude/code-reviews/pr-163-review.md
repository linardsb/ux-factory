# Code Review — PR #163 · `chore(ci): pin verify to a Node the runner still caches (#154)`

**Branch**: `fix/ci-node-pin-154` → `main` **Reviewed at**: `4e8a44c` **State**: OPEN · mergeable CLEAN
**Diff**: 3 files, +649 / −4 — `.github/workflows/verify.yml` (+19/−4), plus the plan and report CLAUDE.md requires to ship with the ticket
**Verdict**: **APPROVE** — 0 Critical · 0 High · 0 Medium · 1 Low (optional)

---

## Summary

One behavioural line: `node-version: 20` → `24` on the gating `verify` job. Everything else in the workflow diff is the comment block above it, rewritten because the pin's justification genuinely changes shape — from *"it matches the local baseline"* to *"it is measured to emit identical artifacts, and the runner caches it."*

The change is correct, the diagnosis is real, and the evidence is stronger than the PR body claims. I re-derived both halves independently rather than reading them off the report.

### The premise — verified, not assumed

The one claim the PR rests on that no green check can prove is that Node 20 *was* being downloaded. Pulled the pre-fix run's own job log (`30365798586`, job `90296591132`, main at `e7c9369`):

```
2026-07-28T13:55:30.0560633Z Attempting to download 20...
2026-07-28T13:55:30.9175853Z Acquiring 20.20.2 - x64 from https://github.com/actions/node-versions/releases/download/20.20.2-23521894959/node-20.20.2-linux-x64.tar.gz
2026-07-28T13:55:34.5179325Z node: v20.20.2
```

The diagnosis is exactly right: a gating job with a live external network dependency on every run.

### The fix — verified on the latest run, not the one the report quotes

The report quotes run `30371029699` (head `03c95f0`). I checked the *current* head instead — run `30371546390`, job `90316392552`, head `4e8a44c`:

```
node-version: 24
Found in cache @ /opt/hostedtoolcache/node/24.18.0/x64
node: v24.18.0
npm: 11.16.0
```

`grep -cE "Attempting to download|Acquiring|node-versions/releases"` → **0**, against a positive control (`grep -c "Found in cache"` → 1) so the zero is a result and not an empty file. The download is gone at the head being merged, not just at the commit the report happened to read.

---

## Issues

### Low — 1

**L1 · `.github/workflows/verify.yml:34-35` — the tarball size is understated by ~50%**

The rewritten comment says setup-node downloaded a "`~30 MB` tarball". The asset the run's own log names is 47.5 MB:

```
$ gh api repos/actions/node-versions/releases/tags/20.20.2-23521894959 \
    --jq '.assets[] | "\(.name)  \(.size) bytes"' | grep linux-x64
node-20.20.2-linux-x64.tar.gz  47512168 bytes    # ~47 MB / 45 MiB
```

In scope because it is newly-introduced text — the pre-#154 comment carried no size figure at all. Nothing behavioural rides on it, and the error runs in the safe direction (it *understates* the problem the PR fixes). But this repo's whole posture is that a number in a comment is a measured number, and the same figure propagated to the plan and the report.

**Fix** (optional, one token): `~30 MB` → `~47 MB` at `verify.yml:35`. Same string at `.claude/plans/ci-node-pin-cache-eviction.md:9, 19, 228, 237` and `.claude/reports/ci-node-pin-cache-eviction-report.md:7` if the paper trail should agree.

### Checked and clear — not findings

- **Every other factual claim in the comment block (`verify.yml:32-53`) holds.** Node 20 / 22 / 24 EOL dates (April 2026 / 2027 / 2028) match the `nodejs/Release` schedule. The "action runtime `node20 → node24`" distinction preserved from PR #153 is accurate against the actions' own `action.yml` `runs.using`. The cited local baseline (`v20.20.2` / npm `10.8.2`) matches this machine exactly.
- **No wrong-but-green scenario from the version split.** The guard runs the right way: CI regenerates under 24 and diffs against artifacts committed from 20, so a divergence is red, never silently absorbed. Grepped the CI-executed surface (`agent-layer/`, `tooling/`, `scenarios/`, `portal/lib/`, `system/*.mjs`) for output-format-sensitive builtins — `util.inspect`, `Intl.*`, `localeCompare`, `process.version`, comparator-less `.sort()`: every sort feeding a committed artifact is default-lexicographic or an explicit numeric comparator, both spec-stable across 20→24. Style Dictionary's three targets are tracked and inside `checkHandoff()`'s scoped porcelain.
- **The API-floor risk this bump introduces is real but currently unexercised.** CI now accepts Node 21+ builtins a Node-20 contributor could not run locally. Grepped for `Object.groupBy`, `Map.groupBy`, `Array.fromAsync`, `Promise.withResolvers`, `RegExp.escape`, `node:sqlite`, `fs.glob`, `process.loadEnvFile`, the ES2023 array-copy methods — zero hits. Worth knowing as the shape of the new risk; not a defect in this diff.
- **Nothing else in the repo pins or states CI's Node.** `node-version` appears once in the whole repo. No `.nvmrc`, no `engines` field in any `package.json`, one workflow file. The only other mentions are historical `.claude/` snapshots, correctly untouched.
- **`visual` is structurally unreachable from this change** — that job has no `setup-node` step at all and runs its `npm ci` on the pinned `mcr.microsoft.com/playwright:v1.61.1-jammy` container's own Node. No baseline regeneration was needed, and skipping `update:docker` was the right call, not an omission.
- **Surgical.** One functional file, one behavioural line. No job, step, trigger, permission or action version moved.
- **Two stale group counts exist and are correctly out of scope** — `CLAUDE.md` says `build-checks` has 9 groups (it has 10 since #149), and `verify.yml`'s `⚠` block on the Build checks step still says `"all 8 groups pass"`. Both pre-date this diff, neither is touched by it, and the report already flags the first as #149's paper trail. Noted so the next reader doesn't re-discover them; **not** a change requested here.

---

## Validation

Run against `4e8a44c`. CLAUDE.md's bar — *"Done" = run the surface you touched* — and the surface here is CI itself, so the gates are the test.

| Gate | Where | Result |
|---|---|---|
| `drift-check` | runner, Node 24.18.0 | ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `token-lint` | runner, Node 24.18.0 | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `build-checks` | runner, Node 24.18.0 | ✓ all 10 groups pass |
| `npm ci` (Style Dictionary) | runner, npm 11.16.0 | ✓ — the one genuine Node 24 risk; `lockfileVersion 3` accepted by npm 11 |
| `visual` | Playwright container | ✓ green first try, no baselines regenerated |
| `drift-check` · `token-lint` · `build-checks` | **local, Node v20.20.2 / npm 10.8.2** | ✓ · ✓ · ✓ all 10 groups |
| `setup-node` cache hit | runner | ✓ `Found in cache @ /opt/hostedtoolcache/node/24.18.0/x64` |
| no download line, `--job`-scoped | runner | ✓ 0 matches, positive control passing |
| YAML parse + structure | local | ✓ 2 jobs, 6 `verify` steps, `{'node-version': 24}` |

The local row is worth stating on its own: the same artifacts regenerate byte-identically under **Node 20 locally and Node 24 on the runner**, which is the determinism claim demonstrated from both ends rather than asserted from one.

---

## What's good

- **The comment is correctly treated as the deliverable.** Shipping only the number would have left a false statement in the file — the old block claimed the pin *is* the local baseline, which stops being true the moment `24` lands. The rewrite states why the number moved, what the pin still guarantees, that determinism was measured, and why it must stay a major; and it preserves PR #153's action-runtime warning rather than overwriting it. Both reasons now coexist.
- **"Keep this a MAJOR" is the right thing to have written down.** An exact `24.18.0` pin would silently restore the download the moment the image moves to 24.19.0 — undoing the ticket while looking like a tightening. That is precisely the plausible future edit, and the comment pre-empts it.
- **Green was explicitly refused as evidence.** Node 20 produced green runs for months; the acceptance check is a literal string in one `--job`-scoped step, not a check mark. That distinction is the whole ticket.
- **The plan's AMENDMENTS self-corrected two process bugs before any review touched it** — the task order (no run exists until the PR is open, since `verify.yml` triggers on `push: main` + `pull_request`) and the "check that cannot fail" near-miss where a grep over `gh run view`'s *still-in-progress* message would have false-passed the no-download assertion. Both are generalised to any future CI ticket, not just this one.
- **The container sweep was run at the actual merge base** (`e7c9369`) on `--platform linux/amd64`, and the Docker tags resolved to exactly the runner's cached builds — so it tested the real binaries, not a floating major.

---

## Recommendation

**APPROVE.** Merge as-is, or take L1's one-token correction first — either is defensible; nothing blocks.

**AC #8 closes with this file.** The report had it at **partial** pending `.claude/code-reviews/pr-163-review.md`; this review lands on the branch in the same PR, so plan · report · review now all ship together per CLAUDE.md, and the row is flipped to ✓ in the same commit.

---

*Reviewed by `/piv-review-pr` at `4e8a44c` with the `code-reviewer` agent for the deep pass. Runner evidence re-derived independently from the job-scoped logs of runs `30365798586` (before) and `30371546390` (after). A human makes the merge call.*
