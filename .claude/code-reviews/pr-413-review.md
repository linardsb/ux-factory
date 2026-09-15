# Code review — PR #413 · the Plus UI pack is removed, and G14's rule written in (#296)

**Head** `14a13c3bf5400a4d52c2f344c986601081c0d992` · **Base** `main` @ `e8982c75c5886ec28f1fcc5b6db6fe86358e79b4` · reviewed 2026-09-14 · round 1 (no prior `pr-413-review*.md`; `git merge-base` equals the base SHA, so the base has not moved and the guarantees pass does not trigger).

Reviewed from a clean detached worktree (`/Users/Berzins/Documents/wt-review-413`) rather than the shared checkout, which is on another session's branch with uncommitted work. Every figure below was re-derived; the `code-reviewer` agent ran a separate pass over the state and allowlist paths a grep cannot see.

## Recommendation

**Approve.** The removal is complete and correctly scoped, the cascade is right, every gate is green at HEAD, and the report's mechanism claims survived independent re-derivation — including the `--update-snapshots` preset, which was the one inference in the report and checks out against the pinned image. Three findings, all documentation accuracy, none blocking. F1 is worth a one-line fix before merge because it lands inside a header this project treats as specification and contradicts an invariant stated five lines above it.

## Findings

### F1 — Medium · the new header sentence contradicts the file's own invariant five lines above it

`system/pack-import.mjs:23`

The line this PR adds:

```
// accessibility vet — the WCAG table this engine prints, read and ACTED ON, not merely committed.
```

Lines 11-15 of the same header block, unmodified, and flagged there as *"the invariant a reviewer should check first"*:

```
// VIEW-TIME SAFE … never reaches for `process`, `console`, `window` or `document`. Anything the
// engine wants to SAY comes back in a `notes` array
```

Verified: `grep -n 'console\.' system/pack-import.mjs` returns exactly one hit — line 85, a comment *forbidding* it (*"No console.log inside this function (#130): the core must be silent"*). The printer is `tooling/figma/figma-pull.mjs:182`, the CLI wrapper around the engine. `docs/figma-runbook.md`'s parallel sentence gets this right by saying *"this **run** prints"*; only the `pack-import.mjs` copy says *"engine"*.

Failure scenario: an editor trusting the header goes looking for the WCAG print inside `pack-import.mjs`, finds only the comment banning `console`, and cannot tell which of the two statements is the live one. CLAUDE.md §Ground rules — *"Invariants live in the file that owns them… That header is the specification"* — makes a header that contradicts itself the specific failure that rule exists to prevent.

**Fix:** `the WCAG table the CLI prints from this engine's checks (tooling/figma/figma-pull.mjs)` — one clause, same line count, no cascade.

### F2 — Low · "and the handoff pack both carry it" is false

`system/pack-import.mjs:605-606`

The PR rewrites this sentence (dropping `tokens.plusui.css,`) and leaves the other half unverified:

```
// The header string below is part of every committed pack's bytes — tokens.verdant.css
// and the handoff pack both carry it. Do not reflow it.
```

Observed: `grep -rl 'Do not edit by hand' handoff/` returns nothing. `handoff/verdant/tokens/css/` holds `contract.css` and `neutral.css` only, both carrying Style Dictionary's generic `Do not edit directly, this file was auto-generated.` — there is no verdant CSS in the pack at all. Tree-wide, the `emitPack` header is carried by `system/tokens.verdant.css` and three non-shipped files (a plan spike, `tooling/round-trip/tokens.verdant-proposed.css`, the two `pack-seed-verdant` traces).

Pre-existing on base, so not introduced here — but this PR rewrote the sentence, which is the moment to re-derive both halves rather than one. No gate depends on the string, so this is false caution rather than a missed sync.

**Fix:** `— tokens.verdant.css carries it.` Drop "and the handoff pack" and "both".

### F3 — Low · G14's new rule does not cover the defect it was written for

`docs/figma-runbook.md:97-100`

The runbook introduces the rule and then, one clause later, names why Plus UI was removed:

> **a pack the dock offers gets its visual-regression baselines and an accessibility vet in the same PR that adds it** (epic #295, G14)

> …it was removed at #296 … because it shipped in the dock with neither baselines nor a vet, **and its spacing and type scale were visibly out of step with the rest of the system**.

The second half is the owner's actual objection at the grill (*"its spacing and design are way out of whack"*). The rule covers baselines and a WCAG vet; the WCAG pairs are colour only. Nothing in G14 asks anything of the imported **spacing, radius or type ramp** — which is the family `figma-pull` maps by even-spread selection, drops most of, and never checks against the system's own scale. A future pack can satisfy G14 completely and still land with the exact defect that produced G14.

Context that sharpens this rather than a separate finding: `git show e8982c7:system/tokens.plusui.css:8-9` shows the removed pack's header carried `WCAG (RULESET.wcagPairs …): 12/12 pairs pass` and `No contrast negotiation was needed`. The colour half of the rule had nothing to catch here.

**Fix:** one clause in the same sentence — extend G14 to the non-colour scales, or say plainly that the vet is colour-only and that fit-to-system for spacing and type is the reviewer's eye, not a gate.

## Validation

Run at HEAD in the review worktree unless noted.

| Gate | Result | Provenance |
|---|---|---|
| `node tooling/build-checks.mjs` | `build ✓ all 34 groups pass`, exit 0 | observed |
| `node tooling/drift-check.mjs` | ✓ 13 legs — syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count | observed (needed `npm ci` in `tooling/style-dictionary/` first) |
| `node tooling/token-lint.mjs` | ✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid | observed |
| `node tooling/studio-journey.mjs all` | **author-reported** — 1564 passed, 0 failed. My own run was started against this worktree but was still mid-Firefox at ~25 minutes when this review was posted; the result is not re-observed here. See the numbers pass for why it does not hold up the verdict. | author-reported |
| AC #1 grep (`git grep -il plusui -- . ':(exclude).claude' ':(exclude)docs'`) | 11 files at base → 0 at head | observed, both refs |
| VR baselines | 22 PNGs on disk; exactly 2 changed (`approach-neutral`, `approach-saulera`), the other 20 untouched in the diff | observed from the diff |
| `gh pr checks 413` | CodeQL · audit · codeql · gates-green · verify · visual — all **pass** | observed |

`system-graph`, `loc-summary`, `param-count` and `handoff` are drift-check legs, so the deletion is proven not to have left any generated artifact stale — the thing a slug grep cannot reach.

## The numbers pass

Every figure in the PR body and the report, with what settled it.

| Figure | Verdict | How |
|---|---|---|
| "all **34** groups" | observed ✓ | re-ran; CLAUDE.md and `gates.md` are pinned to it by `drift-check.mjs:176-179` |
| "**13** legs" | observed ✓ | counted from the drift-check ✓ line |
| "**63** contract tokens · 0 orphan" | observed ✓ | re-ran token-lint |
| "11 files → 0" (AC #1) | observed ✓ | ran the AC's exact grep against both `e8982c7` and HEAD |
| loc `runtime` 77 → **76** files, 30,600 → **30,500** lines | observed ✓ | drift-check's loc-summary leg regenerates and compares; `approach.html:272-279` reads `runtime.files`/`runtime.linesApprox` at view time, so the cascade to the two baselines is structural, not assumed |
| total 114 → 113 / 38,500 → 38,400 | observed ✓, and correctly **not** a baseline trigger — `approach.html` renders the runtime group only |
| "22 passed · **exactly 2** PNGs changed, the other 20 byte-identical" | observed ✓ | 22 baselines on disk; `git diff --stat` over `baselines/` lists exactly the two `approach` PNGs |
| staged "18 files, +40 / −125" | derived ✓ | +40/−125 reconciles line by line across the 16 text files; 97 of the 125 deletions are `tokens.plusui.css`. With the plan (1,043) and report (318) the PR's own 20 / +1,401 / −125 follows |
| pixelmatch **16** and **26** at `threshold: 0.2` | author-observed, not re-derived | the conclusion does not rest on the exact counts, only on both being under `maxDiffPixels: 100`, which their restored-baseline gate run demonstrates directly |
| **"bare `--update-snapshots` presets to `changed`"** | **observed ✓ — independently** | this is the load-bearing claim and it was the one inference in the report. Ran `npx playwright test --help` inside the pinned `mcr.microsoft.com/playwright:v1.61.1-jammy`: `-u, --update-snapshots [mode] … (choices: "all", "changed", "missing", "none", preset: "changed")`. In older Playwright the bare flag meant `all`, which would have inverted the lesson; at the pinned 1.61.1 it does not |
| "1564 passed, 0 failed" (studio-journey) | author-reported, **not** re-derived | The one gate this PR edits, and the one figure here I did not re-observe — my run was still on the Firefox leg when this posted. It does not hold up the verdict, because the edit is behaviour-neutral by construction rather than by a passing run: `studio-journey.mjs:1531` filters stylesheet hrefs through `/\/system\/tokens\.(neutral\|saulera\|verdant)\.css$/` and the assertion two lines later requires `packLines.length === 1` **and** `/saulera/.test(packLines[0])`. Dropping `\|plusui` from that alternation can only change the outcome if a `tokens.plusui.css` href could appear — and the file is deleted, so no shipped page can link one. CI `verify` and `visual` are green on the same head |
| AC #4's "all 27 green" is wrong, observed count is 34 | correct ✓ | CLAUDE.md says 34, `drift-check.mjs:176-179` enforces it. The ticket body is stale; the PR is right not to have edited the tracker unasked |

**The headline lesson is earned.** *"The pixel gate is structurally blind to a one-line text change on these pages — a page whose only change is text must have its baselines deleted, never merely re-run"* is now backed by two independent observations: the restored-baseline gate run passing over stale numbers, and the pinned Playwright's own help text confirming the bare flag rewrites only on failure. It is stronger than `vr-tolerance-hides-text-changes.md` and worth carrying forward.

## Verified clean

Each of these was a plausible defect that was checked and found sound — recorded so the next round does not re-spend the time.

- **Stale `localStorage`.** `pack-boot.js:70` no longer matches `"plusui"` and falls through to the guaranteed no-op default without ever mutating storage. `pack-derived.mjs`'s only `PREWEAR_KEY` writer is `wear()`, gated on `COMMITTED.includes(prev)`, so an unrecognised prewear is never written back; `unwear()`/`stopWearing()` fall back to `"neutral"`. `dock.mjs`'s `activePack()` reads the DOM `<link href>` through `PACK_RE`, not storage, so a stale selector can never become the selection, and `syncChecked()` always lands on the unconditionally-present `neutral` row — there is no path that renders the radiogroup with nothing checked.
- **Group 17's floor `>= 4` → `>= 3`.** Still a real vacuity guard: an empty or short parse fails the `ok()` before the per-pack loop, so the "silently true loop" failure mode it exists to prevent is still covered. It stays a floor (`>=`), so a future pack needs no edit here. The reddening mutation was run, not asserted — and the report's "natural red window" observation (the gate went red on its *original* message between Task 3 and Task 4) is a stronger proof than the synthetic mutation.
- **The three hand-mirrored `RESERVED` sets** are identical in membership after the edit, and freeing the `plusui` slug collides with nothing — the portal guard protects files that exist under `system/`, and `tokens.plusui.css` no longer does. The `assertSlug('verdant')` negative control in the report shows the guard was narrowed, not gutted.
- **`dock.mjs` line-number citations.** The two fixed (`bus-toggles.mjs:105` → `dock.mjs:162`, `instance-pack.mjs:97` → `dock.mjs:186-199`) were both accurate on base and are both accurate at head — verified line by line against `git show e8982c7:system/dock.mjs`. The PR's claim that the rest is pre-existing drift holds: the three citations to `dock.mjs:455` as "the Escape handler" pointed at `stripHash` on base, while the handler is at base 462; `dock.mjs:46` pointed at a Plus UI comment, not the `el()` builder. Left alone correctly.
- **`system-graph.json` / `catalog.mjs` "three packs"** was already three on base — `gen-system-graph.mjs` never listed `plusui`. So the exhibit showed 3 while the dock offered 4; this PR incidentally closes that gap.
- **`param-count.json`** is unaffected: `param-manifest.json` counts the pack switcher as one radiogroup, not one entry per pack.
- **The runbook's `git log -- system/tokens.plusui.css` claim** holds as written: three commits including the deletion, identical with and without `--follow`.

## What is good

The report is the strongest artifact in the PR. Three things stand out.

**It re-derived the mechanism instead of reading it.** Restoring the old baselines and running the real gate over just those two tests is the check that distinguishes "the tolerance hid it" from "the update preset never fired" — and it produced a lesson that corrects the plan's own R8 rather than confirming it.

**It found the gate its own AC could not see.** AC #1's grep is a slug grep; `build-checks.mjs` group 17 reads the pack list out of `dock.mjs`'s `PACK_RE` and never spells `plusui`. Catching that, then running the pre-flight sweep for pack-count assertions that spell no slug at all (`>= 4`, `=== 4`, `packRows`), is exactly the class of check `check-that-cannot-fail.md` is about.

**It documents what it deliberately did not change, with the reasoning.** `pack-imported.mjs:53-54`'s "those five **families**" (five token families, not five files — a correct sentence a later reader would have "fixed"), `studio-keep.mjs:99-104` as a dated spike record, and `verify.yml:11-12`'s pre-existing "10 pages, 20 PNGs" against an observed 11 and 22. That last one is worth the one-line follow-up the report suggests.

The two ticket corrections (AC #2's false removal date, AC #4's stale group count) were raised rather than silently written in — the honesty contract working in the direction that costs something.

## Next

`piv-fix-review-findings` on F1; F2 is the same file and the same edit pass, F3 is one clause in the runbook. All three are prose in `system/pack-import.mjs` and `docs/figma-runbook.md` — keep the line counts and no `loc-summary` regeneration or baseline cascade is owed. Re-run `node tooling/build-checks.mjs` after.

Separately, the report's own follow-up suggestion is worth a ticket: `.github/workflows/verify.yml:11-12` says the visual job covers "10 pages, 20 PNGs"; the observed figures are 11 pages and 22 baseline PNGs. Pre-existing, outside this ticket's footprint, correctly left alone here.
