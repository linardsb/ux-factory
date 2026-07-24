# PR #46 Review — company-brief record + brief→scenario-package compiler (#39)

**Branch**: `feature/company-brief-scenario-compiler` → `main` · **State**: OPEN · +1240/−28, 14 files
**Reviewer**: piv-review-pr (fresh-eyes: `code-reviewer` agent deep pass + independent reproduction) · **Date**: 2026-07-19

## Summary

Adds a company-brief kb record (`parseCompanyBrief`) + a deterministic brief→scenario-package compiler (`gen-company-package.mjs`) with a path-containment **privacy guard**, and refactors `scenarios/validate.mjs` to be callable **by path** and **provenance-aware** — all with **zero engine changes**. Every acceptance path (AC#1–#4, happy path, both negatives, the no-arg registry regression) holds up **empirically**, verified independently by both the review agent and this pass. The core deliverable is solid.

**No Critical or High findings.** Three findings — two Medium, one Low — all in **edge or untested paths the fixtures don't exercise** (a slug that collides with a hardcoded registry name; a brief field neither fixture sets; a symlink/case containment limit shared with the existing codebase idiom). Recommendation: fix #1 and #2 before merge (both cheap, both close gaps in invariants this PR itself claims); #3 is optional hardening.

## Recommendation: **APPROVE** — mergeable as-is; land the two cheap Medium fixes in this PR

**Mergeable now** — `gh pr view 46` reports `CLEAN` / `MERGEABLE` against current `main` (verified post-#45; the PR body's clean-merge claim holds). Neither Medium blocks the exercised capability.

But "no blockers" is not "defer": both fixes are ~3 lines, and both close gaps in invariants **this PR itself claims** — #1 is a **confirmed crash** that breaks the file's own throw-naming convention; #2 dents the headline "privacy enforced by construction". They should land **in this PR**, not a later one. #3 is optional hardening.

Posted as a comment (solo repo — GitHub blocks the PR *author* from a formal approve **or** request-changes on their own PR, so the verdict lives in this text either way). The human author makes the final merge call. Natural next step for the two Mediums: `piv-fix-review-findings` on this report, then re-run the validation commands below.

---

## Issues by severity

### 🟡 Medium #1 — `COHERENCE[slug]` dispatch crashes with an **unnamed** error on a slug collision
**`scenarios/validate.mjs:201`** (body of `COHERENCE.verdant`), reached via the dispatch at **`scenarios/validate.mjs:273`** — newly reachable through the by-path CLI (`scenarios/validate.mjs:312`) and the compiler's self-validate call `validatePackage(outAbs, head.slug)` (`agent-layer/gen-company-package.mjs:131`).

Before this PR, `COHERENCE[slug]` was only ever invoked from `validateScenarios`'s registry loop, where `slug` is constrained to the two registry entries (`verdant`/`fieldwork`) — so the matching collections always existed. This PR's by-path mode and the compiler are what first let an **arbitrary, brief-author-supplied slug** reach that dispatch.

**Failure scenario (reproduced independently):** author (or copy-paste-leftover) a brief slugged exactly `verdant` or `fieldwork`. `COHERENCE.verdant` runs `Object.fromEntries(collections.plants.map(...))`, but a compiled package from an arbitrary brief has an `items` collection, not `plants` → `collections.plants` is `undefined`:
```
$ node agent-layer/gen-company-package.mjs <brief slugged "verdant"> --out <scratch>
company package ✗  Cannot read properties of undefined (reading 'map')   (exit 1)
```
The message **names nothing** — a raw `TypeError` — violating this file's own stated convention ("every throw names the offending file and field", `scenarios/validate.mjs:3-4`). The freshly-created output dir *is* still cleaned up correctly; only the error quality is the defect.

**Fix (a design choice, not a one-liner):**
- Minimal / convention-satisfying **(recommended)** — rename any error out of the coherence dispatch:
  `try { COHERENCE[slug]?.({ dir, head, collections }); } catch (e) { throw new Error(`${dir}: coherence profile "${slug}" — ${e.message}`); }`
- Cleaner semantically, but **more surgery than it looks** — the `COHERENCE` profiles describe the two *committed, fixed* scenarios; a compiled package merely *named* `verdant` isn't the Verdant scenario, so scoping `COHERENCE` to the registry-driven path only is tempting. But after this PR's refactor `validateScenarios` runs *through* `validatePackage` (which returns stats, not the `collections`/`head` a profile needs) — moving the dispatch up would mean re-deriving those in `validateScenarios`. Prefer the minimal rename above; don't take this option just for tidiness.
- Note: `Object.hasOwn(COHERENCE, slug)` does **not** fix it — `"verdant"` is a genuine own-key, so the guard passes and it still crashes.

### 🟡 Medium #2 — `publishedTokens` copy-through is the one uncontained, unvalidated write; a traversal defeats AC#4
**`agent-layer/gen-company-package.mjs:121-122`**
```js
if (head.publishedTokens)
  copyFileSync(join(dir, head.publishedTokens), join(outAbs, head.publishedTokens));
```
`head.publishedTokens` is validated **nowhere** — not in `parseCompanyBrief` (`agent-layer/lib.mjs` never mentions it) and not in `validatePackage`. Every *other* write in the compiler uses a literal filename or a `readdirSync` entry (which can't contain a separator); this is the only write that joins a path with an **unvalidated author-supplied string**.

**Failure scenario (verified with path arithmetic matching the exact source expression):**
```
outAbs = ".../outer/extra/acme",  publishedTokens = "../../ESCAPED.css"
join(outAbs, publishedTokens) = ".../outer/ESCAPED.css"   ← escapes outAbs (verified: startsWith(outAbs+sep) === false)
```
The sharp version: a **real-provenance** brief (`fictional:false`) with `--out` correctly pointed at a safe jobs-folder target — so the privacy guard *passes* on `outAbs` (`gen-company-package.mjs:62`) — but a mistyped/crafted `publishedTokens` with enough `../` writes that file **back inside this repo**. The guard only ever inspects `outAbs`, never the individual write targets inside `genCompanyPackage`. A traversal in this one field defeats the exact invariant AC#4 exists to enforce.

**Honest likelihood:** normal usage (a bare sibling filename like `"tokens.acme.css"`) is completely safe. This needs a crafted value or an unusually specific typo, and **neither fixture sets `publishedTokens`** (real pack derivation is ticket #40) — so it's a robustness gap to close **before that path is exercised for real** (a `.claude/plans/pack-seed-derivation-vision-run.md` for #40 is already in flight), not an active incident. Same call also surfaces a missing source file as a raw `ENOENT` rather than this file's named-error convention — one fix covers both.

**Fix:** validate before use —
```js
if (head.publishedTokens !== undefined &&
    (typeof head.publishedTokens !== "string" || head.publishedTokens.includes("..") || path.isAbsolute(head.publishedTokens)))
  throw new Error(`${briefPath}: head "publishedTokens" must be a repo-relative filename with no ".." (got "${head.publishedTokens}")`);
```
plus an `existsSync` check before `copyFileSync` for a named error. (Validating in `parseCompanyBrief` keeps it single-sourced with the other head checks.)

### 🟢 Low #3 — Privacy-guard containment is lexical-only (symlink / case-insensitive bypass)
**`agent-layer/gen-company-package.mjs:26`** (`REPO_ROOT`) and **`:62`** (the containment test).

`path.resolve` does not dereference symlinks, while `mkdirSync`/`writeFileSync` follow them at the OS level; and this machine's FS is case-insensitive (APFS) while the guard's `startsWith` is case-sensitive. So a `--out` whose path is/goes through a symlink pointing inside the repo, or a differently-cased path to the same physical repo dir, would pass the string check yet write into the repo.

**Why Low, not higher:** it mirrors the **exact** containment idiom already in `portal/server.mjs` — same inherent limitation as the codebase's own precedent, not a weaker implementation; it requires an unusual environment (a symlink on `--out`, or a deliberate case mismatch), not a plain typo; and the tool's trust model is a single local operator, not a multi-tenant adversary. Worth knowing given the PR's absolute language ("makes it impossible", "enforced by a guard"). **Optional** hardening: `fs.realpathSync` the deepest existing ancestor of `outAbs` (and `REPO_ROOT`) before comparing.

---

## Validation

| Check | Result |
|---|---|
| `node --check` × 4 changed `.mjs` | ✅ all parse |
| No-arg `scenarios/validate.mjs` (registry regression) | ✅ verdant + fieldwork ✓, verdicts differ, exit 0 — **behaviourally unchanged** |
| `parseCompanyBrief(acme)` | ✅ 8 ids, 5 sections |
| **AC#2** compile `acme` + independent by-path validate | ✅✅ `✓ fictional · 8 questions · 1 collections · 4 records`; 8 canonical ids + axes; lean 6-field brief head |
| **AC#3** provenance (real compiles w/ `speculativeNotice`+`sources`; strip `sources` → fail) | ✅ exit 1 naming `sources` |
| **AC#4** privacy guard (`--out .` on real stub) | ✅ exit 1, names refused path, `git status` clean, no repo-root leak |
| drift-check (authoritative CI gate) | ✅ `syntax · token-css · handoff · scenarios · traces`, exit 0 |
| `build.mjs` / `index.json` / `worker/fixtures.mjs` untouched | ✅ confirmed (grep) |
| Portal boot (branch code, port 4848) + `/api/health` | ✅ `{ok:true, cards:7}`; `parseBrief`/`cardFor(full)` runs live against jobs folder, degrades to `null` |
| Discard-on-failure scoping (fresh vs. preexisting dir) | ✅ fresh failed compile leaves zero trace; preexisting sentinel survives — cleanup never deletes what it didn't create |
| Mergeability vs current `main` (post-#45) | ✅ `gh pr view 46` → `mergeStateStatus: CLEAN`, `mergeable: MERGEABLE` |

All compile output was written to a scratch dir outside the repo; the working tree stayed clean throughout.

## What's good (verified, not just read)

- **Privacy guard fires before any write** — proven: `--out .` on the real stub threw before mkdir, `git` byte-identical, no dir created.
- **Discard-on-failure is precisely scoped** to compile-created dirs (the `preexisting` gate) — verified both directions.
- **Self-validation is real** — the emitted package independently passes `node scenarios/validate.mjs <dir>`; honesty surface is provenance-correct (`fictionalNotice` for acme, templated `speculativeNotice` + `sources` for the real stub, and correctly *not both*).
- **Refactor is behavior-preserving** — no-arg registry output unchanged; `checkCopy(dir, head)` has exactly one (updated) call site; both exports intact; drift-check's explicit named-import list means the new generator is never auto-run in CI.
- **kb sync rule genuinely upheld** — `parseCompanyBrief` (authoritative) and `parseBrief` (thin projection) both read the shape; ran live against the real jobs folder without crashing.
- **Conventions**: header cites the governing doc, `pathToFileURL` standalone guard, throw-naming-the-path (with the single #1 exception), zero-dep, no `build.mjs`/`index.json`/`worker` churn.
- All five **documented deviations** in the implementation report are reasoned and intentional — reviewed, not flagged.

## Not flagged (reviewed, judged acceptable)

- The "preexisting dir left half-written on a *second-run* validate failure" — exactly the plan's Open Question #6 partial-write caveat and report Deviation #2; reproduced, matches the documented trade-off (loud failure, never silent data loss).
- Fictional briefs having no `outAbs` privacy guard — intentional (fictional fixtures may live in the repo); the removed unconditional `rmSync` footgun (Deviation #2) means it overwrites in place, never deletes.
