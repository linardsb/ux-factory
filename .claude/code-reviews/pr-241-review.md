# Code Review — PR #241 · Studio 8: the single-file export, the keep rail, and the two win-metric routes

**PR**: [#241](https://github.com/linardsb/ux-factory/pull/241) · **Closes** #210
**Reviewed at**: `b90ec55` against `f55cfb2` (the squash commit and its parent)
**Recommendation**: **REQUEST CHANGES** — 1 High, 2 Medium, 3 Low

> **Run in ADVISORY mode, after the merge.** `piv-review-pr`'s Phase 1 stops on a `MERGED` PR; this one was
> run anyway, deliberately, at the owner's request. The consequence is that the verdict below cannot gate
> anything — the code is on `main`. Every finding is therefore a **follow-up commit to `main`**, not a push
> to a branch, and this file lands on `main` rather than in the PR the repo convention asks for. Both are
> stated rather than papered over.
>
> The review was done with **fresh eyes** — dispatched to the `code-reviewer` agent in a clean context, not
> by the session that wrote the code, which is the only reason findings 1 and 3 were caught at all. Both
> were then **driven** rather than left as inference; the evidence is inline below.

---

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ all 17 groups pass |
| `node tooling/drift-check.mjs` | ✓ clean (12 passes) |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| Node-import safety, both new modules | ✓ clean |
| `studio-journey all` (from the PR) | ✓ 242/242 on chromium, firefox, webkit |
| CI `verify` + `visual` | ✓ both pass |

A green suite is not the finding here. **Every issue below survived all of it**, which is the point of the
pass: findings 1 and 3 are precisely the shapes no gate in this repo can see.

---

## Issues

### High

#### H1 · A pack worn from the HOME page never reaches the export — and the export then prints the false honesty sentence

**`system/studio-keep.mjs:304-306, 314-315, 331-332`** · `system/studio-export.mjs:230-233`

The exporter learns the visitor's token values from exactly two places: the `<link rel=stylesheet>` matching
`PACK_LINK_RE`, and `[data-build-stage]`'s inline `style` attribute. Those are the two paths spike 3 and the
implementation actually drove — the appearance dock (which re-points the link) and Act 0 **on /factory**.

They do not cover #130's **"wear it across the visit"**, which is a shipped, promoted feature on home:

- an **imported** record is applied as `<style id="factory-pack-imported-style">:root{…}</style>` appended to
  `<head>` (`pack-boot.js:56-62`);
- a **home-derived** record is applied as inline props on `document.documentElement` (`pack-boot.js:84-87`).

Neither is the link. Neither is the stage.

**Driven, not inferred.** Seeding the exact record home writes, loading /factory, and pressing the export
button:

```
page IS wearing it:      #c2185b
stage inline style:      null
Act 0 says on the page:  "This site is wearing acme-tokens.json, imported from acme-tokens.json
                          on the home page."
EXPORT inline tokens:    ""
EXPORT says:             "No design imported. This used the site's neutral pack."
```

So the reader is looking at a page wearing their colours, which *says so*, and the file they download wears
neutral and **states in its provenance block that they imported nothing**. `hasVisitorTokens` is
`Object.keys(inlineTokens).length > 0`, so the empty map takes `exportHtml:232`'s negative branch. The rail's
own headline copy — *"wearing your design values"* — is false at the same moment.

This is a **honesty-contract** failure, which CLAUDE.md marks hard, in the one artifact whose stated purpose
is naming whose design work it is. The repo has already written the standard this breaks, verbatim, for this
exact reader (`build-import.mjs:167-171`): *"Calling it neutral there would be a false claim rendered at
rest, on the one page whose whole argument is that its claims are checkable."*

**Why no gate saw it**: group 17 passes `inlineTokens` in directly, and `keepPass` never seeds a home record.

**Fix** — in the export click handler, read the worn record through the module that already owns it and merge
it under the stage's own values, so an Act 0 import on /factory still outranks a home one (the order the
cascade already gives them):

```js
const worn = readImported();                   // ./pack-imported.mjs — the one record reader
const inlineTokens = { ...(worn ? worn.tokens : {}), ...inlineTokensOf(stage) };
```

`vetTokens` inside `exportHtml` stays the single application point, so no second escaping opinion appears.
`packLabelOf` needs a `worn` branch so the label names the right thing. Add a `keepPass` case that seeds
`sessionStorage["factory-pack-imported"]` before `goto` and asserts the downloaded bytes carry that accent —
without it the fix is ungated in exactly the way the bug was.

---

### Medium

#### M2 · The copy confirmation claims "arrangement included" on a link that silently carries none

**`system/studio-keep.mjs:386`** (the announcement) · `:247-253` (`arrangement()`) · `:106-108` (`SHARE_NOTE`)

`arrangement()` is right to refuse: when the live wrapper count and `board.places.length` disagree it returns
`null`, and `encodeBuild` then emits no `g`. But the sentence is unconditional.

The counts diverge **by design**, and #210 is what made it reachable. `applySwap` has an EXTRA branch that
`canvas.place()`s surplus components (`studio-compile.mjs:433-440`) and a SURPLUS branch that removes extra
wrappers (`:442-448`). Measured on the committed board (4 places):

```
dashboard → 4 slots    queue → 2    feed → 6    onboarding → 4    settings → 1
```

A visitor arriving on a `?b=` link whose sender answered `shape: feed` — which this ticket made possible,
since the link carries the sender's answers — presses **Compile the board** (6 wrappers against 4 places),
then **Copy the link**. The link ships without `g`, and the page tells them the arrangement is in it.
`SHARE_NOTE` makes the same claim at rest.

It also weakens `studio-keep.mjs`'s own header claim that *"the file and the link can never describe
different arrangements"*: here the file describes one and the link describes none.

**Fix** — compute the arrangement once and branch the sentence, naming the real reason:

```js
const arr = arrangement();
const url = shareUrl(await settledUrl(), await encodeBuild({ ...specState(), arrangement: arr }));
…
say(arr
  ? "Link copied. It is in your address bar too, and it rebuilds this board — arrangement included — in any browser."
  : "Link copied. It rebuilds this board. Where the blocks sit did not travel: the canvas is holding a different number of pieces than the board has places, and a guessed arrangement is worse than none.");
```

#### M3 · `keepPass`'s "at the SENDER'S coordinates" assertion cannot fail — the `g`-restore branch is ungated

**`tooling/studio-journey.mjs:2334-2335`** · covers `system/studio.mjs:396-399`

`keepPass` copies its link from a settled `/factory` it never interacts with. The replay driver places every
block at `{ col: indexOf(place) + 1, row: 1 }` (`replay-driver.mjs:499-503`) — byte-for-byte what
`arrangeBoard` produces by default (`studio.mjs:90-92`). So `canvasSlots` is
`["sx-c1-r1","sx-c2-r1","sx-c3-r1","sx-c4-r1"]`, and the receiver reaches the identical layout **whether or
not the `g` field is applied at all**.

Delete `studio.mjs:396-399` — the whole `sent` restore — and this assertion still passes, along with every
other assertion in the pass. The `?b=` arrangement round trip has running-page coverage of its **encode**
half (case 3, `:2233`) and **none** of its decode half. This is the `check-that-cannot-fail` shape the repo
has a documented history with, in a check written for the ticket's headline claim.

**Fix** — before the copy click in section 3, move one block off row 1 through the `getVerbs()` injection
seam this file already uses, so `canvasSlots` is non-default. `:2334` then becomes a real discriminator.

---

### Low

#### L4 · `build-checks.mjs:3042` is a vacuous assertion

`ok(out.includes(":root"), "…the strip ate the pack")`. `exportHtml` emits `<style>:root{${decls}}</style>`
unconditionally (`studio-export.mjs:246`), so this is true for every input including `css: ""`. It cannot go
red under any mutation. Harmless — `:3040`'s preserved-`:root`-count is the real check — but its message
asserts something it does not test. Remove it, or point it at `stripImports(source)`.

#### L5 · Group 10's uniqueness case is hand-listed while its comment claims exhaustiveness

**`tooling/build-checks.mjs:1663-1670, 1693-1694`.** The comment says *"EVERY path this module can push"* and
the summary says *"all 11 trackers DRIVEN"*, but `TRACKERS` is a typed array. A twelfth tracker — the exact
thing #210 just did twice — falls silently outside the check that was written to close that gap. Derive the
list from the module (`Object.keys(mod).filter(k => k.startsWith("track"))`, asserted non-empty and a
superset of a pinned minimum).

#### L6 · `stripImports` is string-blind — a header sentence, not a bug

**`system/studio-export.mjs:93-114`.** The scanner treats `/*` and `@import` as structural wherever they
appear, including inside a CSS string literal or a `url()`; on `@import url("a;b.css")` it would stop at the
quoted semicolon. Unreachable today — the inputs are three fixed literals plus a `<link>` href matched
against `PACK_LINK_RE`, and all six committed sheets are clean. Worth one sentence, because the current text
(*"which is what the browser's own parser does with it too"*) reads as parser-equivalence, which it is not.

---

## What is genuinely well done

- **The escaping boundary is airtight for the categories the plan named.** Text through `esc` exactly once;
  `slot.html` verbatim and nothing else; the cell class built from two integers `num()` validated against the
  imported caps. The `vetTokens` reliance is real rather than asserted: `VALUE_OK` excludes `< > : ; { } " '`
  and `KEY_NAME` constrains the key charset, so `:root{k:v;}` genuinely cannot break out of the `<style>`.
- **The `@import` scanner and group 17's guard on it are the best work in this PR.** The spike finding a real
  defect in the plan's own regex, then turning it into a check that goes red on **committed bytes with no
  fixture mutation**, plus a structural both-directions half chosen *after* a substring version survived the
  mutation sweep — that is the discipline working end to end.
- **The declined mount is correct on the point that matters.** `tookOver = true` makes `onTouch` inert
  (`replay-driver.mjs:742`), so `/factory/took-over` is genuinely unreachable from a declined page and the
  metric stays honest. `if (!declined) compile.setEnabled(false)` is one state fewer than
  disable-then-restore.
- **`mountStudio`'s sync/async split is sound.** `SHARE_PARAM` read before any await; the no-link path fully
  synchronous; the link path resolving both handles through `.finally` so a rejection still settles them;
  `settleHandles` testing the *value* of `[data-studio-keep]` rather than its presence. No path sets either
  handle twice or before the restore settles.
- **`restoreBuild` from `studio.mjs` has no effect on /build.** The store is a module-scope in-memory object
  rebuilt per page load with no persistence, so deviation 4's reasoning holds as written.
- **Group 6's ampersand case and the anti-vacuity guards** each exist because a mutation sweep found the
  surrounding assertions green without them, and each says so in place.

---

## Recommendation

**Request changes** — which, post-merge, means **three follow-up commits to `main`**:

1. **H1** — the worn-pack merge, its `packLabelOf` branch, and the `keepPass` case that gates it. This is the
   one I would not have merged past: it makes the export state something false in the exact artifact whose
   argument is that its claims are checkable.
2. **M2** — branch the copy sentence on whether `g` actually travelled.
3. **M3** — make the coordinate assertion a real discriminator, or the `g`-restore branch stays unproven.

L4–L6 are polish and can ride along or wait.

Nothing here is a security or data-loss issue, and the merged state is not broken — it is *less honest than
it claims to be* in two places, on a site whose entire argument is that its claims are checkable.

---

## Resolution — all six fixed on `main`

Triaged by the owner as **fix all six now**, and with H1 widened: the finding names the imported
record, but #130 wears a design by TWO paths and the derived one has the same bug, so both are
covered and both are gated.

| # | Fixed in | Gated by | Proven able to fail |
|---|---|---|---|
| H1 | `system/studio-keep.mjs` — `wornPack()` + the merge + `packLabelOf`'s worn branch | `studio-journey` keepPass §9, both paths, seeded through storage before `goto` | reverting the merge turns 4 assertions red with `<style>:root{}</style>` and no `Wearing` line — the review's own reproduction |
| M2 | `studio-keep.mjs` — `currentUrl()` returns the arrangement, both copy outcomes branch, the field's `aria-label` with them | keepPass §10 — a `shape: stream` link compiling 6 wrappers onto a 4-place board | the case asserts the sentence UNCONDITIONALLY, which is only possible because the caveat rides the clipboard-refused branch too |
| M3 | `tooling/studio-journey.mjs` keepPass §3 — one injected move off row 1 before the copy | itself | deleting `studio.mjs:396-399`'s restore turns exactly that assertion red (`…-r1` everywhere vs `sx-c2-r3`) — it could not before |
| L4 | `tooling/build-checks.mjs` — the vacuous `out.includes(":root")` removed, with a note saying why | — | — |
| L5 | `build-checks.mjs` group 10 J — the roster derived from the module over a pinned minimum | — | — |
| L6 | `system/studio-export.mjs` — `stripImports`'s string-blindness stated as a limit | — | — |

Two things the fixes did NOT change, deliberately:

- **`SHARE_NOTE` and `EXPORT_COPY` stay as written.** Both are at-rest sentences in the pixel
  baseline, and both are true at rest — the divergence M2 names is a state a reader reaches by
  compiling a `?b=` link, and it is now announced when it happens rather than pre-emptively hedged
  in copy the other 99% of readers see.
- **`studio-keep.mjs`'s header claim** that the file and the link cannot describe different
  arrangements is amended rather than deleted: they can describe different AMOUNTS of one, and each
  says which.

One thing the fixes ADDED, from a second pass over M2: the address bar, the field's value and the
field's `aria-label` now have ONE writer (`publishLink`), because `update()` re-runs the link on
every board publish and would otherwise leave a stale label beside a fresh value. No reachable
sequence produces that today — `update()` fires only at settle and take-over, and neither can
follow the surplus compile that makes the arrangement stop travelling — so this is structural
rather than a second defect, and it is written down as such instead of being claimed as a bug fixed.

**Gates**: `build-checks` 17/17 · `drift-check` clean · `token-lint` clean · both modules still
node-import safe · `studio-journey all` green on chromium, firefox and webkit. No at-rest change on
any shipped page, so no baseline regeneration.
