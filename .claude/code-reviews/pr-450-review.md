# PR #450 review — `icon` through the chain + `gen-icons` (#305)

**Head** `8aa5db0` · **Base** `main` @ `d5120476c28643ae54fa221ddb6aa44c182f2102` · **State** OPEN, mergeStateStatus CLEAN, mergeable MERGEABLE
**Round** 1 — no prior `pr-450-review*.md`, so the guarantees pass is not triggered. Stronger fact recorded anyway: `git merge-base origin/main HEAD` == `origin/main` == `baseRefOid` == `d5120476`, so main has not moved under this branch and no rebase has occurred.

## Verdict

**Request changes — narrowly, on F1 alone. Two lines.** Everything else is approve-grade.

The shipped design system is clean. The `icon` template, the CSS block, the spec, the generator and the pack chain are all correct, and I found no correctness, security or token-discipline defect in any of them. Every gate is green at this head, including the three the report defers to "the PR's own CI run": all six CI checks pass. I re-derived every figure in the PR body — the expected-verdict diff, the exact and rounded loc counts, the `group(` arithmetic, `audit-delta` — and all of them hold exactly. I re-ran `catalog-journey` on all three engines (49/48/48, matching) and mutated three of the new checks myself to confirm they go red.

**F1 is why this is request-changes rather than approve.** Group 41's own top-of-block fallback — the guard written so that a bad manifest *reports* instead of ending the run — is guaranteed to crash the run in the exact case it exists to handle. Malformed JSON in `system/icons.manifest.json` kills `build-checks` with a raw Node stack trace at `tooling/build-checks.mjs:12321`; group 41 prints nothing at all, no ✓, no ✗, and the script's own tally never runs. That directly falsifies a guarantee this PR states in three places — the PR body, group 41's `detail` string, and `gates.md`'s Group 41 paragraph — all of which say a throw reports rather than ending the run, on group 39's rule. It is the fourth seam of exactly the class amendment A4 found and fixed for the other three, and it is the only one where the crash is *guaranteed* rather than conditional. The root cause is one line upstream in `agent-layer/gen-icons.mjs:91`, and fixing it also closes a plain violation of CLAUDE.md's error convention.

To be clear about what F1 is not: nothing in `system/` is affected, no shipped page changes, and CI stays red-on-broken either way. It is a two-line fix in new code, blocking only because the repo's own stated rule is the standard being applied.

One class of defect survived in prose (**F2**). The PR body asserts a *complete* enumeration of the wrapper-histogram copies ("**five** copies, not the four the plan names"). There are **six**. The fact most likely to change what you do: one of the two missed sites, `system/handoff-viewer.mjs:123`, **was graded Medium as F1b in the review of PR #447 one ticket ago, was never fixed, and this PR increments its denominator again** — it has now survived two reviews.

## Issues

### F1 · High — group 41's fallback is guaranteed to crash on the one case it exists to handle, and the throw it re-raises does not name the file

**Two linked defects with one root and a two-line fix.**

**(a) `agent-layer/gen-icons.mjs:91` — a bare `JSON.parse` lets an unnamed `SyntaxError` escape.**

```js
export function readManifest() {
  const text = readFileSync(join(ROOT, MANIFEST), "utf8");
  const m = JSON.parse(text);                                    // ← unguarded
  if (typeof m.weight !== "string" || !m.weight)
    throw new Error(`gen-icons: ${MANIFEST} needs a non-empty "weight"`);        // ← names the path
  if (!Array.isArray(m.icons) || …)
    throw new Error(`gen-icons: ${MANIFEST} "icons" must be a non-empty array…`); // ← names the path
```

The two validation throws below it both name `${MANIFEST}`. The parse does not. CLAUDE.md's Ground rules are explicit: *"**Errors:** throw plain `Error`s whose message names the offending path."* Observed, with the manifest corrupted to `{ % not json }`:

```
node agent-layer/gen-icons.mjs --check   → icons ✗  Expected property name or '}' in JSON at position 2   (exit 1)
node tooling/drift-check.mjs             → drift ✗  Expected property name or '}' in JSON at position 2   (exit 1)
```

Both fail closed, correctly — and neither says **which file**. In a repo with `icons.manifest.json`, `param-manifest.json`, `icons.mjs`, `loc-summary.json`, `system-graph.json` and a dozen more generated artifacts in the same chain, "position 2" is not actionable.

**(b) `tooling/build-checks.mjs:12321` — the fallback re-parses the same bytes *inside the catch*, so it re-throws uncaught.**

```js
  let MANIFEST;
  try {
    MANIFEST = readManifest();
  } catch (e) {
    ok(false, `41: readManifest() refused … The cases below fall back to parsing the same bytes, so they still report.`);
    MANIFEST = JSON.parse(readFileSync(join(ROOT, "system/icons.manifest.json"), "utf8"));   // ← 12321, unguarded
  }
```

`readManifest`'s **only** non-validation throw source is its own `JSON.parse`. So the fallback runs the identical parser over the identical bytes: for a *parse* failure it is **guaranteed** to re-throw, and it can only ever succeed for a *validation* failure (a bad `weight`, a bad `icons` array). The comment's claim — "the cases below fall back to parsing the same bytes, so they still report" — is false in precisely the half the catch is most obviously for, and the half where it is true is the half the wording describes least.

**Observed.** `system/icons.manifest.json` → `{ % not json }`, then `node tooling/build-checks.mjs`:

```
build import-chain   ✓  the design-import core (#304): …          ← group 40 prints
<anonymous_script>:1
{ % not json }
  ^
SyntaxError: Expected property name or '}' in JSON at position 2
    at JSON.parse (<anonymous>)
    at file:///…/tooling/build-checks.mjs:12321:21
```

Group 41 (`icons`) prints **nothing** — no ✓, no ✗, zero lines. No `build ✓` / `build ✗` tally is printed at all. Exit 1 comes from the uncaught exception, not from the script's own tallied `process.exit(1)`. File restored immediately, `md5` verified back to `ff05c2f9f378d3336db77220bbe6e249`, and the tree re-run to `build ✓ all 41 groups pass`.

**Why High.** It falsifies a guarantee stated in three prose surfaces, in new code this PR adds:

> PR body: *"All three now fold into one named failure, on group 39's stated rule that a deletion must report rather than end the run."*
> `build-checks.mjs:12561`: group 41's `detail`, and `gates.md`: *"A **throw reports rather than ending the run** (group 39's rule): the three throwing seams … were each a real crash first."*

Amendment A4 is the ticket's best work — three seams found by three separate mutations, each measured, each folded into a named failure. This is the fourth, sitting inside the guard written for that purpose, and it is the one seam where the crash is guaranteed by construction rather than reachable by accident. It is also a plain violation of an explicit, checked-in convention (the `Errors:` ground rule), which is the "undocumented pattern violation" class.

**The guard handles exactly one of the three ways a manifest goes bad.** Driven, all three:

| manifest state | what happens | whose bug |
| --- | --- | --- |
| **malformed JSON** | uncaught `SyntaxError` at `:12321`, group 41 prints nothing, no tally | **this PR** |
| **missing** | uncaught `ENOENT` at `tooling/build-checks.mjs:6242` — group 28's file sweep `readFileSync`s every git-tracked `system/`-prefixed path — which kills the run long before group 41 is reached | pre-existing, out of scope |
| **present, parses, fails validation** (bad `weight`, bad `icons`) | the catch fires, `ok(false, …)` reports, the fallback succeeds, every case below runs | ✅ works as documented |

So the only case the fallback actually serves is the third. The missing-file path it appears to handle is unreachable on this tree for an unrelated pre-existing reason, and the malformed path is guaranteed to crash. I confirmed the ENOENT leg myself (`mv system/icons.manifest.json` away → dies at `:6242`, group 41 never prints; file restored, `md5` verified) — it is **not** this PR's defect and I am not counting it, but it is why the malformed case is the only one left that F1's fix can reach.

**What lowers the blast radius, stated fairly.** `verify.yml` runs `Drift check` (line 85) before `Build checks` (line 105), and `drift-check`'s `icons` leg catches a malformed manifest and exits 1 first — so **the crash is not reachable in CI**. It is reachable for anyone running `node tooling/build-checks.mjs` standalone, which CLAUDE.md documents as the repo's main gate. Nothing in `system/` is affected and no shipped page changes.

**Fix.** Name the path at the root, then guard the fallback:

```js
// agent-layer/gen-icons.mjs:91
let m;
try { m = JSON.parse(text); }
catch (e) { throw new Error(`gen-icons: ${MANIFEST} is not valid JSON — ${e.message}`); }

// tooling/build-checks.mjs:12321
try { MANIFEST = JSON.parse(readFileSync(join(ROOT, "system/icons.manifest.json"), "utf8")); }
catch { MANIFEST = { weight: "regular", icons: [] }; }   // every case below then reports rather than crashing
```

and reword `:12320`'s comment, which currently promises what the code does not do. A group-41 case driving `readManifest` over malformed bytes would pin it; F6 is the same degraded path and can be fixed in the same edit.

### F2 · Medium — two more copies of the wrapper histogram, and the body's "five copies" is a false completeness claim

The PR body states: *"The wrapper histogram has five copies, not the four the plan names."* Six copies of the same fact exist as current-state prose. Four read the new value; two do not.

**Site 1 — `system/handoff-viewer.mjs:123`**

```js
// primitives like metric-tile (class ds-metric-tile) correctly have none. 3 of 23 today; the 20
// missing wrappers are riding debt the architecture records, and the catalog's vd-* code tab
```

Should read `3 of 25 today; the 22 missing wrappers`. Provenance, verified rather than assumed:

| ref | vocabulary entries | what the comment says |
| --- | --- | --- |
| `287445e` (#301) | 23 | `3 of 23 today; the 20` ✅ correct when written |
| `d512047` (base) | 24 | `3 of 23 today; the 20` ❌ already stale by one |
| `8aa5db0` (head) | 25 | `3 of 23 today; the 20` ❌ stale by two |

`git log 287445e..HEAD -- system/handoff-viewer.mjs` returns nothing, so no commit has touched the file since. **This exact site was reported as F1b (Medium) in the review of PR #447**, with the prescribed text `3 of 24 today; the 21 missing wrappers`, and was not applied. This PR increments the denominator again.

**Site 2 — `tooling/catalog-journey.mjs:14`** (a file this PR edits)

```js
// 3/7 gating counted from the fetched pack plus the paste-and-render proof, the refusal landing
```

The argument here is not the increment — `3/7` was already wrong by fifteen at base, and calling it "made more wrong" would be true but beside the point. The argument is the **asymmetry inside this PR's own edit**: `gates.md:117`, the paragraph *about this driver*, was correctly moved `3/21 → 3/22` in this ticket, while the driver's own header two directories away stayed at `3/7`. One copy of a pair caught and the other missed in the same edit is the "gate prose has three copies" shape exactly. `3/7` was correct at `934e90d` (#215, 2026-08-11) and is now `3/22`; never flagged before.

**Why neither blocks.** No gate reads either comment. `catalog-journey.mjs:240`'s live assertion is `gating.withVd === WRAPPER_COUNT` with `WRAPPER_COUNT = PACK.portability?.webComponents?.files.length` — counted from the fetched pack — and `build-checks` group 21's is `withWrapper`/`withoutWrapper` computed from `prepareHandoff`. Both green.

**Why Medium rather than Low.** The incorrect part is a *completeness* claim, which is the kind a later reader acts on instead of re-checking — the same reasoning PR #447's review gave for the identical finding. And the author's own search terms are what missed it twice: `3 of 23` is prose, not the slash form, and `3/7` is too far out of date for a `3/1[6-9]|3/2[0-2]` window.

**The durable fix is a search that does not encode the current value.** I tried the obvious "grep the fact" (`wrapper`, `missing wrappers`, `gating`) and it is the wrong prescription — `gating` collides with `navigating` and buries both sites in ~60 lines. This one is verified to return **all six** copies:

```
git grep -nE '3/[0-9]{1,2}\b|3 of [0-9]+ today' -- '*.mjs' '*.md'
```

~45 hits, all six present. The noise (`3/4`, `0/1/2/3/4`, `gate 3/3`) is cheap to skim and, unlike a windowed number grep, it cannot go stale as the denominator moves. The full current set:

```
.claude/references/gates.md:33          3/22  ✅
.claude/references/gates.md:117         3/22  ✅
system/catalog.mjs:68-69                3/22  ✅ (fixed here under D6)
tooling/build-checks.mjs:94             3/22  ✅
tooling/build-checks.mjs:5026, :5041    3/22  ✅
system/handoff-viewer.mjs:123           3/23  ❌
tooling/catalog-journey.mjs:14          3/7   ❌
```

(`tooling/build-checks.mjs:5016–5024` are the four history arrows — past-tense records, correctly left as written.)

### F3 · Low — "asserted BY COUNT against the 1,512 icons" describes a bound of 20

`tooling/build-checks.mjs:12561` (group 41's `detail`) and `gates.md`'s Group 41 paragraph both say the subset claim is *"asserted **by count** against the 1,512 icons the package ships per weight."* The assertion is:

```js
ok(Object.keys(ICONS).length < 20, `41.3: …@phosphor-icons/core ships 1512 per weight…`)
```

`1512` appears only in the failure message. It is the *reason* the bound exists, not the comparand — nothing reads the package here. The inline code comment at `:12359–12362` states this correctly ("The bound is deliberately loose — a seventh, tenth or nineteenth glyph is fine"); the two gate-prose surfaces do not. The bound still catches a real vendoring regression, so this is prose accuracy, not coverage. I verified `1512` is itself a real figure: `ls tooling/icons/node_modules/@phosphor-icons/core/assets/regular/*.svg | wc -l` → **1512** (observed), package `2.1.1`, MIT.

**Fix.** "…asserted by an upper bound of 20, the package shipping 1,512 per weight being what that bound refuses."

### F4 · Low — 41.7b's "positive control" never reads the package

`tooling/build-checks.mjs:12509` and the matching sentence in `gates.md` describe *"the package's real shape as the positive control so the five are not refusing everything."* The control is a synthesised string:

```js
ok(pathOf(`<svg xmlns="${SVGNS}" viewBox="0 0 256 256" fill="currentColor"><path d="${ICONS.check}"/></svg>`, "check.svg") === ICONS.check, …)
```

It *reproduces* the shape the package ships; it never reads `tooling/icons/node_modules`. That is the right design for a pure gate — and it is why group 41 survives a missing install (see § What I verified). `ICONS.check` is itself derived from that file by `pathOf`, so the control is not meaningfully weaker. But a package whose shape genuinely moved is caught by the **drift leg** (`genIcons` → `pathOf` over real files), not by 41.7b. Worth one clause saying which, because the current sentence reads as if the package is in the loop.

### F5 · Low — "Six plan errors" is five plan errors and one clarification

The PR body heads the amendments *"Six plan errors, each found by driving something the plan asserted."* The implementation report classifies item 5 (`example` is not in `vocabulary.json`) as **"Clarification (not a plan error) A5 … The plan cites the right mechanism and is silent on the artifact."** Item 3 is described in its own text as *"a real blocker nothing in the plan covers"*, which is also not a plan error. Two surfaces of the same claim disagree, and the body is the one not in the working tree.

**Fix.** "Six amendments — five plan errors, one clarification."

### F6 · Low — 41.7's degraded path emits two cascading failures that read as different defects

Observed by removing `tooling/icons/node_modules` and running `build-checks`:

```
· 41.7: genIcons({check:true}) THREW — gen-icons: tooling/icons/node_modules/@phosphor-icons/core/assets/regular is missing — … cd tooling/icons && npm ci
· 41.7: genIcons({check:true}) reports drift on the committed tree: (threw) — regenerate: node agent-layer/gen-icons.mjs
· 41.7: the check leg counted -1 icons, the manifest names 6
build ✗  3 failure(s)
```

The first line names the real cause. The next two come from the `{ drifted: ["(threw)"], icons: -1 }` fallback at `:12469` and describe defects that did not happen — a drifted artifact and a count of `-1`. The run completes with no stack trace, which is the rule that matters, so this is noise rather than a gate defect. Same degraded-path family as F1; fix in the same edit.

**Fix (optional).** Guard the two follow-on assertions on `cleanErr === null`, as 41.4's throw-catch already does for its own root.

## Validation

Every row **observed by me at `8aa5db0`** unless the source column says otherwise.

| Gate | Result | Source |
| --- | --- | --- |
| `node tooling/build-checks.mjs` | ✅ `build ✓ all 41 groups pass`, exit 0 | re-run |
| `node tooling/token-lint.mjs` | ✅ `63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` | re-run |
| `node tooling/drift-check.mjs` | ✅ 14 legs incl. the new `icons` | re-run |
| `node agent-layer/gen-icons.mjs --check` | ✅ `icons ✓ 6 icons — no drift`, exit 0 | re-run |
| `node import/regen-expected.mjs --check` | ✅ `54924 bytes` | re-run |
| `node agent-layer/gen-loc-summary.mjs --check` | ✅ `3 groups — no drift` | re-run |
| `node agent-layer/gen-param-count.mjs --check` | ✅ `121 controls — no drift` | re-run |
| `node tooling/audit-delta.mjs d512047` | ✅ `no advisory ID … the base did not carry`, `tooling/icons` auto-discovered, 0 new | re-run |
| portal smoke (`PORT=4873`) | ✅ `/api/health` 200, `bootSha` == `8aa5db0`, `stale: false`; `/` 200 | re-run, port-scoped kill |
| `catalog-journey` chromium / firefox / webkit | ✅ **49 / 48 / 48 passed, 0 failed** — exactly the PR body's figures | **re-run by me**, curl-verified as this tree first |
| **CI `verify`** | ✅ pass (24s) — the job the new `npm ci tooling/icons` step runs in | GitHub, this head |
| **CI `visual`** | ✅ pass (1m27s) — the pixel gate against the six regenerated baselines | GitHub, this head |
| **CI `audit`** · `codeql` · `CodeQL` · `gates-green` | ✅ all pass | GitHub, this head |
| pixel gate 33 passed locally | author-observed; **independently confirmed** by CI `visual` green at this head | report §Level 4 + CI |

The report's three "Not run — tracker: the PR's own CI run" items (`verify` itself, `gh pr checks`, CodeQL leg 2) are **all now green**. That closes them. A red suite is not among the findings: F1 is a defect in how a gate *fails*, not in whether it passes.

## The numbers pass — every figure re-derived

| Figure (PR body) | Claimed | Re-derived | ✅ |
| --- | --- | --- | --- |
| expected-verdict `--numstat` | 66 added / 0 removed | `66  0` | ✅ |
| hunks | 6 | `grep -c '^@@'` → 6 | ✅ |
| bytes | 52,922 → 54,924 | `git show origin/main:… \| wc -c` → 52922; head → 54924 | ✅ |
| lines carrying `"covered"`/`"via"` | 0 | 0 | ✅ |
| `"slug": "icon"` blocks added | 6 | 6 | ✅ |
| runtime loc, rounded | 79/32,000 → 80/32,100 | committed artifact, both refs | ✅ |
| generators loc, rounded | 21/2,900 → 22/3,100 | committed artifact, both refs | ✅ |
| runtime loc, **exact** | 32,004 → 32,109 | re-ran the generator's own group test over `ls-tree` at both refs | ✅ |
| generators loc, **exact** | 2,895 → 3,069 | same | ✅ |
| `group(` arithmetic | 42 calls, 41 distinct, 1 dupe (`parenting`), `icons` once | ran `checkGroupCount`'s own regex → 42 / 41 / `[['parenting',2]]` / `icons: 1` | ✅ |
| `@phosphor-icons/core` | 2.1.1, MIT, 1,512 regular SVGs | `package.json` → 2.1.1 MIT; `ls … \| wc -l` → 1512 | ✅ |
| `system/icons.mjs` 19 lines · `gen-icons.mjs` 173 | — | `wc -l` → 19 · 173 | ✅ |
| `audit-delta` 5 pre-existing SD advisories, 0 new | — | re-run, identical output | ✅ |
| `catalog-journey` 49/48/48 | — | re-run, all three engines | ✅ |
| case 13 = 9 assertions | — | `t(` at line start: 38 → 47 | ✅ derived |

**The attribution check.** The PR credits the runtime rounding flip to crossing the 32,050 boundary. Re-derived: 32,004 rounds to 32,000 and 32,109 to 32,100, so the boundary claim holds and the three `approach` baselines genuinely had to churn on the line figure as well as on `runtime.files`.

**The honesty claim, checked at its subject.** The six glyphs are labelled **DERIVED** from Faster Payment's four screens, with "the brief names no icons" as the stated reason. Verified: `grep -rioE "\b(icon|glyph|chevron|caret|arrow-left|tick|checkmark|warning triangle)\b" discovery/faster-payment/` returns **zero** matches across `run.json`, `answers.jsonl`, `transcript.jsonl`, `prd.md` and `build/`. The DERIVED label is correct, and the three name resolutions (`back`→`arrow-left`, `close`→`x`, `chevron-right`→`caret-right`) are recorded in the manifest where a reader will find them.

**The retired-prediction sweep (the #121 shape).** Every site that predicted "`icon` in the vocabulary makes #304's Chevron covered" now states the measured fact instead. Grepped the subject, not the digits: `#449` resolves to `tooling/build-checks.mjs:11955, :11958, :11983, :11999, :12001` and `import/recognise.mjs:199` — six sites, all corrected, all cross-referenced. `grep -rn "not in the vocabulary"` returns two unrelated hits (`portal/record-composition.mjs:117`, `build-checks.mjs:2531`). No stale copy survives as a verb. `recognise.mjs:199` correctly names the *new* reason (no `kind-fit` branch) rather than the retired one (absent vocabulary entry).

## What I verified myself, not inherited from the report

**Three mutations, all restored and re-run to green.**

1. **Malformed `icons.manifest.json`** → F1. Group 41 prints nothing, raw stack trace at `:12321`, no tally. Restored, `md5` verified, `build ✓ all 41 groups pass`.
2. **`tooling/icons/node_modules` removed** — a path the author's table does not cover. Group 41 reports **three named failures**, the run **completes**, exit 1, **zero** stack-trace lines. Group 39's rule satisfied here; the first failure names the directory and the fix verbatim. (The two follow-on lines are F6.)
3. **`.ds-icon[data-refused]` rule deleted**, `catalog-journey chromium` re-run:

```
✗ the refusal's 1px frame and mono family WIN over the size rules above it — border=0px none font=ui-sans-serif, …
✗ and the refusal is WIDER than that box, because it grew to fit the name — refused 24px vs glyph 24px
chromium: 47 passed, 2 failed
```

The second failure is the one that matters: with the rule gone the refused box **collapses to exactly the glyph's 24px**, which is the empty-box failure mode the whole branch exists to replace. Restored → 49/0. Case 13 can fail, and it fails for the right reason.

**`catalog-journey` re-run on all three engines.** The PR body's 49/48/48 is exact. Reproduced on a port I verified free, with the served tree curl-checked first (`/system/icons.mjs` exists nowhere else; `/system/catalog.mjs` byte-matched the working tree). Case 13's nine assertions pass on chromium, firefox and webkit, zero page or console errors. No WebKit or Firefox hazard materialised.

**The template's refusal branch is XSS-safe by construction.** `el()` at `agentic-renderer.mjs:169–178` assigns `text` via `node.textContent`, never `innerHTML`, and `data-refused: true` becomes `setAttribute(k, "")` — which is why 41.5's `=== ""` assertion is the right one and why the CSS `[data-refused]` selector matches. A hostile `name` lands as text.

**The validator is upstream of the template.** `renderComposition` calls `validateComposition` before `build()`, so `props.name` is a declared-type string by the time `Object.hasOwn` sees it. The template's own refusal is for a *valid string the manifest does not carry* — which is exactly what the spec says, and why the name refusal cannot live in the validator (it does not know the manifest).

**Token discipline holds exactly.** Spec head, CSS block and the regenerated system-graph agree on the same nine tokens, compared as sets:

```
spec: ["--color-border","--color-fg-muted","--font-mono","--radius-sm","--spacing-lg","--spacing-md","--spacing-xl","--spacing-xs","--type-caption"]
css : identical (9 var() references, parsed out of the ds-icon block)
graph: ds-icon → 9 token edges, spec path system/specs/icon.md
```

Zero literals in the block. The three-rules-instead-of-one-custom-property decision is correct and its stated reason (`token-lint` treats every `var()` in `components.css` as a contract reference) is verifiable — `token-lint` green with 0 undeclared.

**The committed surface of `tooling/icons/` is two files.** `git ls-files tooling/icons/` → `package.json`, `package-lock.json`. `git check-ignore -v tooling/icons/node_modules` → `.gitignore:2:node_modules/`. Nothing from the package is committed; the MIT notice is recorded once, in the generated `system/icons.mjs` header, which is the only place any Phosphor artwork lives in the repo.

**The CI step's placement.** `Install Phosphor icons` sits between `Install Style Dictionary` and `Drift check`, which is the ordering the `icons` leg needs. The ⚠ scoping sentence at `verify.yml:100–104` was correctly extended to name the third directory rather than left to be read as covering it.

## What's good

- **The refusal is the strongest part.** A name outside the subset renders its own literal text in a framed mono box, and `41.5` asserts *zero* `<svg>` and *zero* `<path>` as hard as it asserts the text — because an empty box is the failure mode the branch replaces. The CSS keeps `data-size` on the refused element so the two branches differ in one designed way rather than two. That reasoning is written where a later editor will read it.
- **`Object.hasOwn` with the mutation that proves it matters.** 41.6b drives the truthiness form and requires it to *render* `"constructor"`. Without that, 41.6 would be green against a trap the template never had.
- **`createElementNS` with a namespace control of its own.** `el()` would yield an `HTMLUnknownElement` that paints nothing while every other assertion passed. 41.1 proves the DOM stub records the namespace *and* that a `createElement` node records `null` — the two facts that make the `ns` assertions able to fail at all.
- **The drift leg regenerates rather than comparing name lists** (D5). A package bump that silently moved a path is a red build. That is the only design that catches the failure the generator exists to prevent, and it is why the CI install step is justified rather than convenient.
- **A4 is worth more than the ticket.** The plan's group-level REDDENS was measured and found wrong: the mutation meant to prove cases 4–6 can fail *crashed the group*, so it proved nothing. Three throwing seams found by three separate mutations, all folded into named failures. F1 is the fourth instance of the class A4 opened — which is an argument for A4's method, not against it.
- **A6 is a probe finding a false mechanism nothing else would have caught.** Both the plan and the spec said the `<path>` carries `fill="currentColor"` from the package. It does not — `system/icons.mjs` contains the string `fill` zero times. Corrected in both places *and* turned into an assertion in case 13.
- **The stale-serve incident was handled correctly and reported.** The port was held by a parallel session's `serve.mjs` from another tree; it was left running, the read redone on a verified-free port, and the near-miss written into the PR body. Without the curl check this PR would have shipped 76/30,800 as its figures.
- **Case 13 has a real control**, and I confirmed by mutation that it is load-bearing rather than decorative.
- **The `--add` near-miss logic was measured, not assumed.** Substring matching suggested `t-shirt` for `chevron-right`; the committed rule is whole-word sharing, and the comment says why.

## Recommendation

**Request changes — on F1 only.** Two lines in two files, plus one reworded comment. Nothing else here blocks, and nothing in the shipped design system is implicated.

Take them in this order:

1. **F1** (High) — `gen-icons.mjs:91` names the path; `build-checks.mjs:12321` guards the fallback; `:12320`'s comment stops promising what the code does not do. **F6** is the same degraded-path family and is one line in the same edit.
2. **F2** (Medium) — two comment edits and one word in the PR body. Use the verified grep, not a windowed number search; both misses were shape misses. This closes a finding that has now survived two reviews and two increments.
3. **F3, F4, F5** — one-line prose corrections, can go either way.

One scope note, so it is not re-found later: `system/wc/README.md:11` (and its identical copy in `handoff/verdant/wc/README.md`) says "the three components without wrappers here (`primary-button`, `stat-tile`, `screen-header`)". That reads like a seventh histogram copy and is not one — it is a **named, bounded list** scoped to `wc/`'s own six Verdant data-bearing components, so its denominator does not move when the vocabulary grows. Correct as written.

Also out of scope and deliberately not counted: `tooling/build-checks.mjs:6242`, group 28's file sweep, crashes uncaught with a raw `ENOENT` if a git-tracked `system/`-prefixed file is missing from disk (driven: `mv system/icons.manifest.json` away → the run dies there, group 41 never prints). Pre-existing, untouched by this PR, and the reason F1's table has only one fixable row — worth its own ticket.

**Method note, since this review's own findings are claims too.** F1 was first raised by the `code-reviewer` subagent. I did not take it on trust: I reproduced the crash, read the mechanism, and found the root cause it had not named (`readManifest`'s bare `JSON.parse` at `gen-icons.mjs:91`, and the resulting guarantee that the fallback re-throws rather than merely risking it). The subagent independently reached the same severity and the same "needs revision" call, and separately confirmed 41.3 stays green with `tooling/icons/node_modules` hidden — matching my own no-package run, in which only 41.7 failed.

Posted as a comment rather than a formal review: solo repo, reviewer and author are the same account, so `gh pr review --request-changes` is refused on one's own PR.
