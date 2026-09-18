# Review fixes — PR #430 · `feat(system): stack + text through the full chain, and renderMarkdown links (#301)`

**Review** [`pullrequestreview-5245348575`](https://github.com/linardsb/ux-factory/pull/430#pullrequestreview-5245348575)
(COMMENTED, recommendation: approve) · **Head before** `71ca6ea` · **Head after** `640a10d`
Six findings, all Low or Medium, none a change to shipped behaviour. **4 fixed · 1 deferred to a
ticket · 1 recorded, no change needed.**

## Checklist — 4 of 4 fixed, 1 of 1 deferred, 1 of 1 recorded

- [x] **F1** (Medium) — the M3 mutation row said "reddened nothing". It reds 30 assertions.
- [x] **F2** (Low) — two PR-body figures disagreed with the diff.
- [x] **F3** (Low) — the renderer header's `73` and build-checks' `85` counted different populations.
- [ ] **F4** (Low) — `card` / `empty-state` still pass `[]`. **Deferred to #431**, as the review asked.
- [x] **F5** (Low) — nested inline markup is swallowed; the header did not say so.
- [x] **F6** (informational) — three shipped pages gain a module fetch. **Recorded in the PR body**; no code change.

---

## F1 · Medium — `.claude/reports/stack-text-primitives-rendermarkdown-links-301-report.md`

**What it was.** A reporting slip with a live consequence, not a code defect. The report's M3 row read
`*(no failure — see note)*`, and two sentences around it said "17 observed red by name" / "M3 reddened
nothing". The narrow claim under the note is true — M3 does *not* redden the bare-`[` case — but M3
does redden a different one, so the arithmetic was wrong and, worse, the row invited the inference that
the split's link alternative is not load-bearing. It is the only thing that makes a link render.

**Measured, not adopted from the review.** Detached worktree at `71ca6ea` (never the shared tree).
Control first — `node tooling/build-checks.mjs` → `build ✓  all 34 groups pass`. Then the mutation the
report describes, the split's link alternative loosened to `\[[^\]]*\]` at `system/handoff-viewer.mjs:166`:

```
build docs chain     ✗  30 failure(s)
build ✗  30 failure(s)
     · expected an <a>, got 0 — the link branch did not fire
     · the link's href is undefined
     · the link's text is undefined, expected "a"
     · the link carries no hv-link class, so neither style home reaches it
     · the link carries no rel=noopener noreferrer
     · a site-relative href was refused — safeHref is not resolving against document.baseURI
     · the text around the link was lost — got "see [a](https://x.test/p) now"
     · a real spec body with a link appended produced no link (<spec>) — the zero-link loop above is
       a tautology            ×23, one per committed spec
```

7 + 23 = **30**, `exit=1`. The `a bare [ produced a link — the split regex is too loose` message is
**absent** from that set, which is the independent confirmation that the review's narrow claim holds
and M3b is genuinely what reddens the bare-`[` case. The review's count of 30 was reproduced, not
copied — M2's row records one message `(+29)` where the review's F1 quotes two, so the two write-ups
are not byte-identical and the number needed its own read.

**Fixed** in four places, all prose:

| Line | Was | Now |
|---|---|---|
| `:16` | `18 mutations applied, **17 observed red by name**` … "The eighteenth is M3 … which does **not** redden it" | `18 mutations applied, **18 observed red by name**` … "M3 reds a *different* case than the plan predicted" |
| `:89` | `18 rows below; 17 reddened a named case, M3 reddened nothing and says so.` | `18 rows below; all 18 reddened a named case — M3 not the case the plan predicted, and says so.` |
| `:96` | `\| M3 \| … \| *(no failure — see note)* \| — \|` | `\| M3 \| … \| \`expected an <a>, got 0 — the link branch did not fire\` (+29, all in \`docs chain\`) — **not** the bare-\`[\` case; see note \| same \|` |
| `:113–125` | "**M3, recorded as the plan predicted it and as it actually behaved.**" … "Recorded rather than left looking like a mutation that was never run." | "**M3 reddens a different case than the plan predicted.**" … plus a second paragraph naming the positive link assertion, the `30 failure(s)` measurement, and *why* the old reading was dangerous — "a later ticket loosening it for a bare-`[` reason would break every link in the pack". |

The row's **Positive control** cell moved `—` → `same` (the review did not enumerate this; a row with a
real failure needs a real control, and M1's `https://x.test/p` link rendering as an `<a>` is it).
The self-correction is stated in the report rather than quietly overwritten. The same two sentences in
the PR body were rewritten to match.

Re-derived after the edit: `grep -cE '^\| M[0-9]+[a-z]? \|'` → **18**, counted from the table rather
than typed.

## F2 · Low — PR body figures

Both re-derived at this HEAD, not taken from the review:

| Claim | Was | Measured | Command |
|---|---|---|---|
| diff totals | `23 files, +2787 / −35` | `files=23 +2788 -35` | `git diff --numstat origin/main...HEAD \| awk …`, corroborated by `gh pr view 430 --json additions` → `2788` |
| `build-checks.mjs` | `+351` | `341 / 10` | `git diff --numstat origin/main...HEAD -- tooling/build-checks.mjs` |
| `components.css` | `+84` | `84 / 0` | same — already correct, left alone |

351 was additions + deletions presented under a `+`-means-additions heading. Fixed to `+2788` and `+341`.

## F3 · Low — `system/handoff-viewer.mjs:163`

**What it was.** A clarity cost, not a false figure. The header said "keeps the **73** bare `[` across
the committed specs rendering exactly as they did before links existed"; `tooling/build-checks.mjs:4124`,
added in the same diff, says "the **85** `[` in system/specs". Both true — measured:
`git grep -o '\[' origin/main -- 'system/specs/*.md' | wc -l` → **73** across **21** pre-#301 specs;
at HEAD → **85**; this PR's own `stack.md` → 8 and `text.md` → 4. `73 + 8 + 4 = 85`.

**Fixed** by the review's second option — **drop the digit**, not add a clause. The number moves with
every new spec and `build-checks` already computes the live one, so a second hand-maintained copy three
files away is a drift source. `— which is what keeps the 73 / bare \`[\` …` → `— which is what keeps the
bare / \`[\` …`. Two lines before, two lines after: removing text cannot push a line count.

Checked first that nothing pins the sentence: `grep -rn "before links existed" tooling/ agent-layer/ system/`
→ the header itself only.

## F4 · Low — deferred to **[#431](https://github.com/linardsb/ux-factory/issues/431)**

`system/agentic-renderer.mjs:411` (`card`) and `:458` (`empty-state`) hardcode `[]` where `stack` at
`:436` passes `child.children ?? []`. Latent today — every name in both `children` lists is a leaf — and
the review explicitly did **not** ask for the one-line fix here: those lines are untouched by this diff
and CLAUDE.md forbids improving adjacent code.

The deferral is also the *better* answer. The one-line edit would be repeated by the next container
added; the gate would not. #431 asks for a `build-checks` case that renders **every** container's
declared `children` one level deeper, driving the assertion off the spec lists instead of writing it
once against `stack` — so a `card.children` widening in #302 fails by name rather than dropping every
grandchild with group 3 green. That is the `check-that-cannot-fail` shape closed at the right level.

## F5 · Low — `system/handoff-viewer.mjs:157–161`

**What it was.** `:158` already said "Bold, code and links are never nested in this data", so the
assumption was stated; the **observed consequence** was not. That is what a reader needs, because
`text`'s content is agent-supplied.

**Measured, not adopted.** The real `renderMarkdown` driven under a DOM stub, four cases with the
un-nested link as the positive control:

```
"[**a**](https://x.test/p)"   -> <a href="https://x.test/p" text="**a**">
"**[t](https://x.test/p)**"   -> no <a>   <strong>"[t](https://x.test/p)"</strong>
"`[t](https://x.test/p)`"     -> no <a>   <code>"[t](https://x.test/p)"</code>
"[a](https://x.test/p)"       -> <a href="https://x.test/p" text="a">          ← positive control
```

All three of the review's rows reproduced. **Fixed** by extending the existing sentence rather than
duplicating `:158`: "…so a single-regex split suffices; nesting one inside another renders the inner
markup as its own literal characters — `[**a**](href)` links the visible text `**a**`, and
`**[t](href)**` bolds the literal source with no link — never a crash, and inert in the security
direction." The probe was re-run against the edited file: byte-identical output, so the comment change
is a comment change.

A real nested-inline parser is a zero-dep violation and correctly out of scope.

## F6 · informational — recorded, no code change

Verified rather than taken on trust: `git show origin/main:system/agentic-renderer.mjs | grep handoff-viewer`
→ nothing, so the `import { renderMarkdown } from "./handoff-viewer.mjs"` at `:31` is new in this PR;
`grep -rln 'agentic-renderer\.mjs' --include='*.html'` → `agentic.html`, `build.html`,
`proto/fieldwork.html`, `studio.html`; `git grep -l 'handoff-viewer\.mjs' origin/main -- '*.html'` →
`handoff.html` only. So the three pages the review names do each gain the fetch, and `studio.html`
does not (it already reached it through `studio.mjs` → `studio-docs.mjs` → `catalog.mjs`).

The review's 20.5 KB is 21,255 bytes (**20.8 KB**) after F5's three added lines, which is why the PR
body says `~21 KB` rather than a digit that goes stale on the next comment edit. Added as a bullet to
the body's design-calls list — the stated DRY trade-off, one renderer and three mounts, never a fork.

---

## Validation — all observed at `640a10d`

```
build-checks    build ✓  all 34 groups pass
token-lint      ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid
drift-check     ✓  syntax · token-css · annotated-source · loc-summary · param-count · system-graph ·
                   inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count
portal          {"ok":true,…,"cards":9,"stale":false}   (PORT=4788, killed by PID)
```

`drift-check` was run **with the work staged by explicit path** (`gen-loc-summary` reads git-tracked
content, so an unstaged `--check` is a false pass) and is the discriminator that settled the open
question: the +3 lines in `handoff-viewer.mjs` did **not** flip a `loc-summary` bucket, so no
`approach` baseline regeneration was needed. Six unrelated untracked files were present throughout and
none was staged.

`catalog-journey` was not re-run: this diff changes one comment block and two documents, the renderer's
output was proven byte-identical under the DOM stub, and `build-checks`' `docs chain` group drives
`renderMarkdown` directly. The pixel gate is untouched for the same reason — no at-rest page changed.

## Still the owner's, still unrun

**Task 28's human eyeball in Safari and Chrome stable on `/components`.** The review said it, the
implementation report said it, and this run did not change it. The Playwright ×3 stand-in carries a
negative control and is a good substitute; it is not the 5-minute human look, and nothing here should
read as though it were.

## Pushed

`640a10d` on `feature/stack-text-primitives-301`, PR #430 updated (body rewritten for F1, F2, F6 and
the #431 pointer, `Closes #301` trailer intact). Follow-up ticket **#431** open.
