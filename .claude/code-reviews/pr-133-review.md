# Code review — PR #133 · `feat(system): a reader drops their design tokens and the portfolio wears them (#130)`

**Branch**: `feature/public-drop-reskin` → `main` · 3 commits · 22 files · +3413 / −834
**Reviewed at**: `9f2e3e4` · **Verdict**: **Request changes** — two High issues, both reproduced.

---

## Summary

This is strong work, and the engineering underneath the feature is better than the feature. The
extraction — 896 lines of mapping engine pulled out of four Node files into one view-time-safe
module, landed first as its own commit — is the right shape for the risk it carries, and I closed
that risk on evidence rather than on the report's word: four fixtures, both the emitting and the
refusing path, byte-identical to pristine `origin/main` (table below). The surface is careful.
Every visitor string goes through `textContent`, the one value reaching a `style` attribute is
hex-proved first, and the honesty framing leads the report instead of trailing it.

Two things block. One is a security bug the extraction *inherited* but this PR *exposes*: the engine
now runs on anonymous input from the open internet, and it pollutes `Object.prototype` from a token
name. The other is that **an imported pack cannot be taken off** — the dock lets you move away from
it, but the next navigation puts it back.

Both fixes are small. Everything else here is ready.

---

## Issues

### 🟠 High · security — a dropped file can pollute `Object.prototype` from the public home page

**`system/pack-import.mjs:272`** (`collectScales`) and **`:413`** (`toRamps`)

Both build their grouping container as a plain `{}` and then do `(obj[name] ??= {})[k2] = v`, where
`name` comes straight from a token name in the dropped file. When that name's prefix is
`__proto__`, `obj["__proto__"]` resolves through the prototype chain to the real `Object.prototype`
— truthy, so `??=` never reassigns — and the following `[k2] = v` writes onto `Object.prototype`
for the rest of the page's life. `JSON.parse` creates `__proto__` as an *own* data property, so the
name survives the parse intact and reaches the walker.

**Reproduced end-to-end through the real public drop zone** (Chromium, clean worktree at `9f2e3e4`),
with a file that is otherwise a perfectly valid two-ramp DTCG export:

```json
{ "__proto__": { "value": { "color": "POLLUTED-FROM-A-DROPPED-FILE", "blur": "99px" } },
  "gray": { … }, "indigo": { … } }
```
```
before drop  ({}).color = undefined
after drop   ({}).color = POLLUTED-FROM-A-DROPPED-FILE | ({}).blur = 99
own prop on Object.prototype: true
page state   : report rendered (mapping succeeded)
status       : "Mapped evil.json. Nothing was uploaded."
```

The page reports **success**. The polluted value is entirely attacker-chosen and unconstrained —
`collectScales` writes the raw JSON leaf before any type or format check runs, which is why it is
worse than the `toRamps` variant (where the value is regex-narrowed to a hex string).

**Why this PR owns it even though the code is older.** The identical pattern is on `origin/main` in
`tooling/figma/figma-pull.mjs`, where it was reachable only by an operator running a CLI against a
file they chose, or through the portal's `127.0.0.1`-only drawer — both inside an operator-trust
boundary, effectively outside any threat model. `system/brand-import.mjs` puts the same engine
behind a drop zone on the deployed public home page. The trust boundary is what changed, and this
PR is what changed it.

**Fix — two lines:**
```js
// pack-import.mjs:265 (collectScales)
const groups = Object.create(null);
// pack-import.mjs:407 (toRamps)
const ramps = Object.create(null);
const loose = Object.create(null);
```
A prototype-less object turns `obj["__proto__"]` into an ordinary always-`undefined` lookup.
`deriveRamps`'s `groups[prefix] ??= []` at `:433` is **not** exploitable — its `prefix in numbered`
guard at `:432` short-circuits any inherited name first — but it is worth a one-line comment saying
so, or the next reader will either "fix" it too or assume from its absence that the other two were
already safe.

**On severity.** The `code-reviewer` agent rated this Critical; I am rating it High, and I want to
be straight about why rather than split the difference silently. There is no cross-user delivery
path here: nothing is uploaded, the record is session-scoped, and an imported pack is deliberately
excluded from share links — so the file is one the reader chose, and I did not demonstrate
escalation to XSS on this particular page. What is real is that "here is our design tokens export"
is an entirely ordinary thing for a stranger to hand a hiring manager, and after that the poisoned
prototype is under a third party's control for the rest of the tab. Given the fix is two lines, the
Critical-vs-High argument is not worth having: fix it before this goes public.

---

### 🟠 High · correctness — an imported pack cannot be un-worn; the next navigation reverts the choice

**`system/dock.mjs:221`** (with `system/pack-boot.js:38` and `system/pack-imported.mjs:130-134,201-204`)

Moving off an imported pack calls `removeImportedStyle()`, which drops the `<style>` element but
leaves the record in `sessionStorage`. `pack-boot.js` keys purely on the record's *presence*, so on
the next page it re-applies the import and `return`s before the `factory-pack` selector is read.
The pack the reader just explicitly chose never loads.

`clearImported()` and `unwearImported()` — the two functions that would resolve this — are exported
from `pack-imported.mjs` and **called by nothing**; `grep -rn` across `system/` and `index.html`
finds only the import line at `dock.mjs:33`.

**Verified repro** (Chromium, clean worktree at `9f2e3e4`):

```
3. after Wear it                 accent=#4f46e5  importedStyle=true   selector=null      sessionRecord=PRESENT
6. dock → saulera (same page)    accent=#F59E0B  importedStyle=false  selector=saulera   sessionRecord=PRESENT
7. approach.html after switching accent=#4f46e5  importedStyle=true   selector=saulera   sessionRecord=PRESENT
```

Step 6 shows the switch working on the current page, with the selector correctly written to
`saulera`. Step 7 is one navigation later: the import is back, saulera never loads. The only way out
of a worn import is to close the tab.

**Why deviation 7 does not cover this.** The report's deviation 7 documents record *retention* and
its benefit ("the row stays on offer without re-dropping"). It does not document that the retained
record is re-applied over a subsequent pick, and `unwearImported()` — the function that deviation
describes — is never wired up. What is actually contradicted is the code's own comment at
`dock.mjs:270-275`: *"the reader's committed or derived pick … comes back untouched the moment they
pick another row (or open a new tab)"*. The `(or open a new tab)` half is true. The `pick another
row` half holds only until the reader navigates. The same claim is repeated in the PR body. In a
repo whose hard contract is that nothing claims more than the code does, the false comment is the
part worth fixing first.

**Fix, in the direction the PR's own decisions already point** — give the record a `worn` flag, so
retention and application stop being the same bit:

- `pack-imported.mjs` — `unwearImported()` writes `{...rec, worn: false}` and removes the style
  (finally giving the dead export a caller); `wearImported()` / `buildImportedRecord()` set
  `worn: true`.
- `dock.mjs:221` — `if (!imported) unwearImported()` instead of `removeImportedStyle()`.
- `dock.mjs:270` — the `if (imported)` branch writes `worn: true` back, so re-selecting the row
  after a switch-away re-arms it.
- `pack-boot.js:38` — gate the branch on `irec.worn !== false`.

`readImported()` still returns the record either way, so the dock row survives and deviation 7's
intent is preserved exactly.

**I prototyped that fix in a throwaway worktree and re-ran the repro.** Step 7 becomes
`accent=#F59E0B importedStyle=false selector=saulera sessionRecord=PRESENT` — saulera carries across
the navigation, record retained. The round trip holds too: switching back to the imported row
re-arms it and it carries again. About a dozen lines across three files.

The cheaper alternative is `clearImported()` at `dock.mjs:221`, but that drops the row and needs
deviation 7 and the `dock.mjs:270-275` comment amended to match.

**Same root cause, fold into the fix** — `system/spine.mjs:36`: `isWearingVisitorPack()` tests record
*presence*, not whether the import is on the page. Once a reader has worn an import even once, the
hero's canned re-skin is suppressed for the rest of the tab's life, including after they switch to a
committed pack. The `worn` flag fixes this too. The derived half of that function correctly reads
its selector; the imported half should read equivalent state rather than mere existence.

---

### 🟡 Medium — pathological JSON surfaces a bare `RangeError` to the reader

**`system/pack-import.mjs:113-125`** — the generic walker recurses once per nesting level with no
depth cap. A **360 KB** file (0.001× the 32 MB cap) of nested single-key objects overflows the stack.
`pickFile`'s try/catch does contain it — no page crash, no uncaught error — but what the reader is
shown is the raw engine text:

```
status state: error
reader sees : Maximum call stack size exceeded
```

No file name, no explanation, no limit named. That is the one refusal in the feature that fails both
CLAUDE.md's error convention ("throw plain `Error`s whose message names the offending path") and the
honesty framing every other refusal here gets right — compare the `.txt`, malformed-JSON and
colourless-JSON messages, which all name the file and say what to do instead. Fix: cap `walk`'s depth
(~64 levels is far past any real export) and throw a named `Error`, mirroring the `MAX_EXPORT_BYTES`
pattern already in `brand-import.mjs`.

---

### 🔵 Low

- **`VALUE_OK`'s threat-model comment is not exhaustive** — `pack-imported.mjs:58-59` claims
  *"Everything that could break out of a declaration is excluded"*. Breaking *out* is indeed
  prevented; staying inside and fetching off-origin is not. `/`, `.` and letters are all permitted
  and `:` is not needed for a protocol-relative URL, so `url(//example.com/x.gif)` passes.
  `system/portfolio.css:30` and many rules in `proto.css` use the `background:` **shorthand** with
  `var(--color-…)`, which accepts an image. Not currently exploitable via a *token* the five imported
  families produce, and self-supplied anyway — the finding is the comment. Either drop `/` from the
  charset (it exists only for the modern `rgb(0 0 0 / 10%)` form, which could be admitted for the
  shadow family alone) or amend the claim to say what it actually guarantees.

- **A hostile filename escapes the pack header comment** — `pack-import.mjs:841` interpolates
  `fileName` / `sourceKey` unescaped into a `/* … */` block. Confirmed: a file named
  `acme*/ body{display:none} /*.json` yields a downloaded pack whose header closes early and whose
  injected rule is live CSS. Self-inflicted in both the browser and CLI paths (you name your own
  file), and the live page never executes the string — it renders via `textContent`. A
  `.replace(/\*\//g, "*\\/")` on the two interpolations closes it, if you want the header's honesty
  claims to hold under adversarial input too.

- **`wearIt`'s storage probe can read the *previous* record** — `brand-import.mjs:287`,
  `Boolean(readImported())` answers "is anything stored", not "did *this* record store". On a second
  import whose write fails, the earlier record satisfies the check, so the beat says "The site is
  wearing X" and skips the direct-apply fallback the honest-degradation path depends on. Narrow
  (sessionStorage is ~5 MB, a record is a few KB); the fix is `readImported()?.ts === rec.ts`.

- **Note, not a defect — deviation 4 covers half the hero race.** `clearInlineTokens()` correctly
  handles the hero's canned re-skin being *already applied* when a reader wears an import. It cannot
  handle the not-yet-applied case: `heroBeat` checks `isWearingVisitorPack()` before its
  `assemblySettled` await, so an import worn during that window gets painted over afterwards. I
  measured the window — the re-skin applies at ~923 ms after load and reverts at ~2427 ms, so
  masking requires completing drop + click inside the first ~923 ms. My repro used a programmatic
  click; a human dragging a file cannot realistically hit it. Recording it only because it stops
  being unreachable if the hero timing ever shortens; a re-check after the await would close it.

---

## Validation

Everything below was run against a **clean detached worktree at `9f2e3e4`**, so the parallel
session's uncommitted `index.html` / `derive.html` / `instance.html` / `roundtrip.html` /
`trace.html` edits could not contaminate any result.

| Gate | Result |
|---|---|
| CI `verify` | ✓ pass |
| CI `visual` (Docker, Linux baselines) | ✓ pass |
| `node tooling/drift-check.mjs` | ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ no drift |
| `pack-import.mjs` view-time purity | ✓ no `process`/`console`/`window`/`document`/`node:` outside comments; imports cleanly into Node |
| **Extraction parity — regeneration** | ✓ `gen-token-css` + `gen-pack-css --plusui` reproduce `tokens.contract/neutral/plusui.css` byte for byte |
| **Extraction parity — import path** | ✓ `figma-pull --from` on `scales-dtcg` · `scales-tokens-studio` · `scales-partial`: emitted CSS **and** stdout byte-identical to pristine `origin/main` |
| **Extraction parity — refusal path** | ✓ `ambiguous-brand.json` refusal message + candidate list byte-identical to pristine `origin/main` (`at …` frames excluded) |
| Deviation 6 (`tokens.verdant.css` staleness) | ✓ **claim holds** — `gen-pack-css --verdant` adds the same 19 lines on pristine `origin/main`, and this branch's output is byte-identical to main's. Pre-existing, not introduced here; worth its own ticket, as the report says |
| Fresh-context no-op (`approach.html`, no record) | ✓ no imported `<style>`, zero inline props — the VR-critical default survives |
| Refusals: `.txt` · malformed JSON · colourless JSON | ✓ all three refuse honestly, naming the file |
| Ambiguous export → candidate swatches → completion | ✓ 2 swatches, click completes the mapping |
| Private mode (`sessionStorage` throwing) | ✓ applies to the current page and says it will not follow |
| Uncaught page errors across all runs | ✓ none |
| Functional: drop → report → wear → carry → dock switch → navigate | ✗ **1 failure** — High issue #2 |
| The same run with the proposed `worn`-flag fix applied | ✓ passes, both directions |
| Untrusted-input probes (`__proto__` name, 360 KB deep nesting) | ✗ **2 failures** — High issue #1, Medium |

The report's stated headline risk was the extraction. I re-ran it independently on both the generator
and the CLI side rather than trusting the byte-parity claim, and **it holds completely**. Note 4's
caveat about moving stack-frame line numbers is real and correctly scoped — the refusal *messages*
are verbatim.

---

## What's good

- **The extraction landed first, alone, and provably invisible.** Riskiest change, its own commit,
  smallest blast radius — and it survives an independent byte-diff across four fixtures on both the
  emitting and the refusing path. This is how a 612-line deletion should be done. No mapping logic
  survives duplicated in `figma-pull.mjs`, `figma-read.mjs`, `gen-pack-css.mjs` or
  `gen-token-css.mjs`; each keeps exactly its I/O half.
- **The XSS surface is closed properly, not incidentally.** Every node in `brand-import.mjs` is built
  through `el()` with `textContent`; the single visitor-adjacent value reaching a `style` attribute
  passes `swatchStyle`'s `/^#[0-9a-f]{6}$/` gate first. Token names, values, filenames, ramp names
  and the reader-supplied label are all inert text. No `innerHTML` anywhere.
- **The pre-paint script stayed a guaranteed no-op and a valid classic script** — no `const`/`let`/
  arrow creep, every storage read `try/catch`-wrapped, and the new branch falls through cleanly on
  empty storage. Verified independently and confirmed by CI's visual gate, which is the check that
  actually matters here.
- **The `KEY_NAME`/`VALUE_OK` mirror is byte-identical between `pack-imported.mjs` and
  `pack-boot.js`**, not merely shape-identical — and deviation 3's "measured charset" claim survives
  re-measurement against all five committed packs.
- **Deviation 3 is the best decision in the PR.** Catching that the planned `VALUE_OK` would have
  made *every single import* announce phantom rejections, then splitting `skipped` from `rejected`
  and re-measuring, is the honesty contract being enforced against the plan rather than the reader.
- **The cross-module wiring is careful rather than hopeful.** `importedOnPage`'s timestamp check is
  real ground truth against a stale `<style>`; the dock re-reads `readImported()` live inside the
  stylesheet-load callback instead of trusting a closed-over record; private-mode degradation is
  handled *and* reported out loud.
- **The comments earn their length.** `pack-boot.js`'s note that its `<script>` tag being last in
  `<head>` is load-bearing *and measured*, and `pack-imported.mjs`'s account of why shadowing beats
  displacement, are what stop the next change from being a regression.
- **The report is accurate wherever I could check it**, which is most of it — including the two
  claims most tempting to fudge (the byte-parity and the pre-existing `verdant` staleness).

---

## Recommendation

**Request changes.** Two High issues:

1. `Object.create(null)` in `collectScales` and `toRamps` — two lines, and it should not reach the
   public site without them.
2. The `worn` flag so an imported pack can actually be taken off — about a dozen lines across three
   files, prototyped and verified here.

The Medium (depth cap + a named error) is worth folding into the same push since it is the one
refusal that does not meet the bar the rest of the feature sets. The Low items are optional polish.

Nothing else about this PR needs to change.

---

*Reviewed with fresh eyes on a clean worktree; deep pass dispatched to the `code-reviewer` agent,
whose prototype-pollution finding I reproduced end-to-end before including it. Repro scripts were
throwaway and are not committed.*
