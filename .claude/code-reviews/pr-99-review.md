# Code review — PR #99 · v3 redesigned pack control (#76)

**Branch**: `feature/v3-pack-control` → `main` · 15 files, +873/−94
**Reviewed**: fresh context (no authoring history), `code-reviewer` agent for the deep pass, plus an independent Playwright repro run in the worktree.
**Recommendation**: **Request changes** — one confirmed defect (Finding 1). Everything else is clean and mergeable.

---

## Summary

This is careful work on the hardest part of the ticket: the state machine where the committed-stylesheet re-skin and #74's inline `--color-*` re-skin meet. The design reasoning in `selectPack()`'s header, the two-part `groundTruth()`, the `selfEmit` re-entrancy guard and the focus handling in `renderPacks()` all hold up under scrutiny — I tried to break them and could not. The implementation report's ten documented deviations are genuine intentional decisions and are **not** treated as findings here.

One thing does break, and it breaks the rule the file itself declares.

---

## Findings

### 1. MEDIUM — a stale swap closure re-applies the derived colours over a pack the reader has just moved to (non-VT path)

**`system/dock.mjs:178–192`** · category: correctness · **CONFIRMED by repro**

`packLink()` always returns the same `<link>` node; only its `href` changes. Every `swap()` that needs a new href attaches a fresh `load`/`error` pair to that node (`dock.mjs:188-189`) and never removes a pair left over from a superseded call — `{ once: true }` self-removes on *fire*, not on abandonment. When the next stylesheet finally loads, the one `load` event runs **both** listeners, oldest first.

On the view-transition path this is harmless: Chromium serialises VT2's update callback behind VT1, so `swap2` never interleaves with a pending `swap1` (verified in the instrumented run — `swap2` fired at t=1925ms, after `swap1` resolved at t=1731ms).

On the **non-VT path it is not** — `dock.mjs:205`'s `else swap()` runs synchronously, so a second click interleaves directly. That path is taken by **every reduced-motion reader in every engine**, plus any engine without `startViewTransition`.

**Failure scenario (reproduced):** reader is on `saulera` with a derived record stored, `prefers-reduced-motion: reduce`.

1. Click "your brand" → `swap1` sets `href = tokens.neutral.css`, registers `done1` (closure holds `derived = true`, `rec`).
2. ~200 ms later, before neutral.css lands, click "verdant" → `swap2` runs `clearRoot(rec.tokens)` (nothing yet to clear), registers `done2`, sets `href = tokens.verdant.css`. The neutral request is aborted and fires nothing.
3. verdant.css loads → `done1` runs first and calls `applyToRoot(rec.tokens)`; `done2` runs second and is a no-op.

**Measured end state:** `link = /system/tokens.verdant.css`, `localStorage.factory-pack = "verdant"`, radio checked = `verdant`, **16 inline `--color-*` props on `:root`**, `--color-accent` resolving to the visitor's derived `#db0057` instead of verdant's `#2f7a4d`. The page wears a hybrid; the control says otherwise. Nothing on the page corrects it — `groundTruth()` is only recomputed at `buildDock()` init and on `BRAND_CHANGE_EVENT`, never on panel open — so it persists until the reader navigates and `pack-boot.js` starts `:root` clean.

That is precisely the outcome `selectPack()`'s own Rule 1 (`dock.mjs:164-166`) declares the design prevents: *"leaving a previous brand's colours would ghost it over the pack that just loaded."* A confirmed counterexample to a documented design rule is an undocumented divergence, which is why this is request-changes rather than a note.

**This is a regression, not an inherited quirk.** The old `applyPack()` had the same no-cleanup listener pattern, but its `done` was a bare `resolve` — a late duplicate had no side effect. Making `done()` conditionally call `applyToRoot` turned a cosmetic leak into a state-corrupting one.

**Repro recipe** (Playwright, run against `python3 -m http.server` on the worktree):

```js
const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1400, height: 900 } });
// seed on a first load:
//   localStorage["factory-pack-derived"] = JSON.stringify(buildRecord("#ff0066", "Acme"))  // via import("/system/pack-derived.mjs")
//   localStorage["factory-pack"] = "saulera"
await page.route("**/system/tokens.neutral.css", async r => { await new Promise(f => setTimeout(f, 1500)); await r.continue(); });
await page.goto(base + "/index.html#appearance");   // real navigation, not a hash-only goto
await page.click("#dock-pack-derived");
await page.waitForTimeout(200);
await page.click("#dock-pack-verdant");
// → link=verdant.css, 16 inline --color-* on :root, --color-accent = #db0057
```

**On the window size, honestly:** the 1500 ms route delay is artificial. The real window is the sheet's actual load + parse time — negligible on a warm cache, but comfortably clickable on a cold one, which is exactly the *first* pack switch of a session. Two clicks 200 ms apart is ordinary human behaviour when someone is sampling packs.

**Minimal fix** — a generation counter, no new object, in the file's hand-written-canon idiom:

```js
let swapGen = 0;                       // module- or closure-scoped beside `selection`
// inside swap():
const gen = ++swapGen;
const done = () => { if (gen !== swapGen) return; if (derived) applyToRoot(rec.tokens); resolve(); };
```

(An `AbortController` per swap with `{ signal }` on both listeners is the alternative; it's more machinery than this single call site needs.)

Optional companion, not required: recompute `selection = groundTruth()` in `setOpen(true)`, so opening the panel re-reads live state rather than trusting a cached value.

---

### 2. LOW — "all eight pages" is measurably wrong; the control mounts on seven

**`system/dock.mjs:6-7`** and **`system/portfolio.css:849`** · category: doc-accuracy

Both strings are **new in this PR**. `grep -l 'src="/system/dock.mjs"' *.html` returns seven files: `index.html`, `approach.html`, `factory.html`, `work.html`, `contact.html`, `404.html`, `roundtrip.html`. `handoff.html`, `instance.html`, `derive.html`, `agentic.html`, `agentic-ui-study.html` and `trace.html` do not load it (`instance.html:448` opts out explicitly). This repo is itself the inspectable artifact, so a hard number that is wrong is a real if small defect.

Fix: "on every page that loads it", or state seven.

`index.html`'s reader-facing copy — *"an appearance control sits on the right edge of every page"* — is **fine as written** and should not be changed: every navigable IA page does carry it, and `handoff.html` / `instance.html` are off-nav deep-link surfaces.

---

### 3. LOW — the committed implementation report's page count is also off

**`.claude/reports/v3-redesigned-pack-control-report.md:40`** · category: doc-accuracy

Says "the control mounts on the six IA pages" and lists an 8-page console sweep — but the sweep includes `instance.html` and `handoff.html` (which do not carry the control) and omits `roundtrip.html` (which does). Since the PR frames that sweep as *"the check the new import chain needs"*, `roundtrip.html` was the one page carrying the new `dock.mjs → pack-derived.mjs → derive.mjs` chain that went unswept.

**No defect behind it** — I ran the check: `/roundtrip.html`, `/factory.html` and `/` all render with `.dock` mounted, 3 pack rows, **console clean** in Chromium at 1280px. So this is a one-line correction to a committed artifact, nothing more.

---

### 4. LOW — a forward-reference in `pack-derived.mjs` is now falsified

**`system/pack-derived.mjs:133`** · category: doc-accuracy

`// The "forget" primitive (#76 owns the UI for it) …` — #76 is this PR, and it deliberately shipped no forget UI (`dock.mjs:240-242` says so explicitly: *"nothing in the acceptance set asks this control to forget"*). `clearRecord` has no caller anywhere in the tree. The two files now contradict each other on record. Drop or re-point the clause.

---

## Validation

| Gate | Result |
|---|---|
| `node tooling/drift-check.mjs` (clean tree) | **exit 0** — syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node tooling/token-lint.mjs` | **pass** — 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| CI `verify` | **pass** (17s) |
| CI `visual` | **red — non-blocking, agreed.** Checked against the D11 freeze: VR is job-level `continue-on-error` on `feature/v3-*` (memory `v3-vr-freeze-live`), so the run is green and the check is red, and `#82` owns the authoritative full regen and the re-block. Baselines genuinely all churn here (the control renders at the 1280px capture width; `#beat-wear` and the `loc-summary` 10200→10400 flip churn index + approach on top). Deferring is the right call. mergeState will read UNSTABLE, not CLEAN. |
| Independent console sweep (Chromium, 1280px) | `/`, `/factory.html`, `/roundtrip.html` — **clean**, `.dock` mounts, 4th row appears with a record present |
| Independent state-machine repro | Finding 1 confirmed under `reducedMotion: reduce`; VT path verified safe |

No test suite / linter / type-check exists by design (CLAUDE.md). "Run the surface you touched" was satisfied.

---

## What's good

1. **`groundTruth()`'s two-part check** (`dock.mjs:90-93`) — requiring the selector *and* a live `:root` match. The report's Deviation 1 describes a real bug the plan's design would have shipped, and the fix is the right one: it keeps the ground-truth-from-the-DOM rule that `activePack()` already established, rather than adding a second source of truth.
2. **The `selfEmit` guard** (`dock.mjs:111, 209-211, 248-251`) is airtight. `dispatchEvent` is synchronous, the flag is closure-local, and it silences only the dock's *own* re-entrant `wear()` — an event arriving from `#beat-brand` still fully re-derives state. Easy to get wrong; this doesn't.
3. **Focus survives the hardest case.** `renderPacks()`'s `hadFocus` handling (`dock.mjs:133, 148-152`) covers `wear()` firing `BRAND_CHANGE_EVENT` synchronously mid-click, which removes and rebuilds the very radio holding focus. Focus lands on the new checked input, not `<body>`.
4. **Security boundary is clean.** Every write to an href goes through `PACK_IDS`; every `setProperty` goes through the per-entry `KEY_NAME`/`HEX_VALUE` allowlist, mirrored by hand in `pack-boot.js`; the visitor's brand name reaches the DOM only as `textContent`, only inside a sentence that denies affiliation. No `innerHTML` anywhere. Every `localStorage` access is in a `try/catch`.
5. **`pack-boot.js` is genuinely untouched** (`git diff origin/main -- system/pack-boot.js` is empty), so the VR-critical no-op default and the literal-neutral-URL swap both stand — the acceptance line's real intent is met even though `selectPack()` is a rewrite.
6. **The comments earn their length.** The three numbered rules in `selectPack()`, the "why both halves matter" note on `groundTruth()`, and the same-href / never-await-a-non-firing-load explanation are the kind of thing that stops the next person re-introducing the bug. Finding 1 is, ironically, the one case where the code doesn't yet match them.

---

## Recommendation

**Request changes** on Finding 1 alone. It's a ~3-line fix at one call site with a reproducible test, and it closes the gap between what `selectPack()`'s header promises and what it does on the reduced-motion path. Findings 2–4 are one-line comment corrections worth folding into the same commit.

Everything else — the state machine, the security boundary, the accessibility handling, the token discipline, the gates — is in good shape.
