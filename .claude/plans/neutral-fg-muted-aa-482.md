# Feature: neutral pack `--color-fg-muted` clears AA on the card surface (#482)

The following plan should be complete, but validate documentation and codebase patterns and task sanity before
you start implementing. Every literal below was observed in a pre-flight run on `origin/main` @ `eb84860` (see NOTES).

## Feature Description

The neutral pack's muted grey (`--color-slate` #6b7280, bound to `--color-fg-muted`) reads 4.40:1 on the card
surface `--color-bg-surface` #f4f4f5, under the 4.5 AA minimum for text. It is the one failing pair of the twelve
in `RULESET.wcagPairs`. Since #474 every live import records WCAG over the neutral pack, and `fidelityVerdict`
reads `red` whenever WCAG is not N/N, so no live import can read green whatever its ΔE. Darken the primitive by
the smallest step that passes (#69707e, 4.53:1), carry the value through its generated and hand-mirrored copies,
and pin in CI that the owner's live pair now separates on the verdict, not only on the ΔE.

## User Story

As the owner running a live Brilliant import
I want a faithful frame to read green
So that the fidelity verdict reports what the ΔE measured, instead of a pack defect nobody drew.

## Problem Statement

`checkPairs(neutral, RULESET.wcagPairs)` → 11/12, failing `color-fg-muted on color-bg-surface` (4.4). The
owner's faithful frame (worst ΔE 1.3379 < THRESHOLD 5.0) reads `red`. No gate asserts the neutral pack passes
its own pairs, so the defect was found by reading, not by CI.

## Solution Statement

Change one primitive in `system/tokens.source.json` (`neutral.primitives.color-slate` #6b7280 → #69707e), which
moves `--color-fg-muted` and `--color-accent-secondary` (both bound to it) together. Regenerate the token CSS,
the handoff pack and the pack bundle. Update the build card's hand-mirrored fallback literal. Regenerate the one
VR baseline that prints the resolved hex (`components-neutral.png`). Add one assertion to build-checks 43.16 that
the replayed faithful frame reads green and the wrong frame reads red with the wrong-but-green line, at 12/12,
and update the three prose copies of that group's claim.

Colour choice: the per-channel scale of #6b7280 was stepped by 0.005; 0.995 rounds to #6a717f (4.46, fails),
0.985 gives #69707e (4.53 on the surface, 4.98 on white). Smallest passing step; calm-colour constraint holds
(pixelmatch YIQ delta 2.02 against the 0.2-threshold cut of 1408 — no tinted pixel registers).

## Out of Scope / Non-Goals

- Not changing: the contract fallback `contract.fg-surface.color-fg-muted` (#6b7280). See D1 and Q1: it is the
  importer's snap target set, and moving it turns an unbound #6b7280 from `exact` into `proposed`.
- Not changing: `system/derive.rules.mjs` (derived packs have their own `fgMuted` lightness rule), `wcagPairs`,
  `fidelityVerdict`, `THRESHOLD`.
- Not re-capturing `import/fixtures/measure-live/` (verbatim, owner's hand; the replay is pinned to the committed
  candidate bytes, so its ΔE does not move). A README note records what changed around it.
- Not editing traces, `.claude/plans/*` history (incl. the #474 plan's Q1), or `measure.json` files whose `verdict:
  "red"` is what the live run recorded on 2026-09-28.
- Not adding a new build-checks group (group count is drift-checked); the pin goes into existing 43.16.

## Feature Metadata

**Feature Type**: Bug Fix
**Estimated Complexity**: Low
**Primary Systems Affected**: neutral token pack, handoff pack, build card fallbacks, build-checks group 43, VR baselines
**Dependencies**: none new (Docker for the VR regen; `tooling/style-dictionary` + `tooling/icons` `npm ci` for drift-check)

## Related Work

**Implements**: #482   ·   **Epic**: #295 (design import) — inherits `fidelityVerdict` D3 from #307/#474

**Back-references**:

- `.claude/plans/import-live-fidelity-474.md` (Q1, line ~843) — where the failing pair was found.
- `.claude/plans/import-record-snap-rules-307.md` — `fidelityVerdict` / `wrongButGreen`, and the snap targets
  taken from the contract (why D1 leaves the contract alone).

**Forward-references**: (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ BEFORE IMPLEMENTING

- `system/tokens.source.json:104` — `"color-slate": { "$value": "#6b7280", … "mid grey — secondary text" }`. THE edit.
- `system/tokens.source.json:179,191` — `color-fg-muted` and `color-accent-secondary` both `{neutral.primitives.color-slate}`.
- `system/tokens.source.json:8` — contract `color-fg-muted` #6b7280. NOT edited (D1).
- `system/tokens.source.json:22` — contract `color-accent-secondary` is #64748b while the pack's is #6b7280: the
  contract and the pack already disagree on a slate-bound token, so D1 is not a new kind of divergence.
- `system/derive.rules.mjs:181-194` — `wcagPairs`; line 185 is the failing pair ("captions on cards").
- `system/wcag.mjs:26-43` — `checkPairs(tokens, pairs)` → rows `{fg,bg,min,ratio,pass,…}`; `pass: exact >= min` (unrounded).
- `import/report.mjs:70-80` — `fidelityVerdict` (red if `w.pass < w.total`) and `wrongButGreen`; `:326-327` emits
  `**Wrong but green.** Every WCAG pair passes (…)` into the markdown.
- `portal/lib/import-run.mjs:170,216,224` — live imports parse `system/tokens.neutral.css` and record
  `fidelity.wcag {pass,total,failing}` from `checkPairs(packTokens, RULESET.wcagPairs)`.
- `system/build-card.mjs:24-26,35-42` — `NEUTRAL` fallback literals, "re-read them if the neutral pack's ramp
  moves"; line 38 `fgMuted: "#6b7280"`.
- `system/catalog.mjs:186-190` — `resolveTokenValues` prints each token's computed value as TEXT on /components;
  this is why `components-neutral.png` changes (1791 px) and no other baseline does.
- `tooling/build-checks.mjs:14524-14549` — 43.16's owner-live-pair loop (`for (const [frame, under] of [["faithful", true], ["wrong", false]])`),
  helpers in scope: `ok`, `deep`, `existsSync`, `readFileSync`, `at(f)`, `rec`, `under`, `fv`.
- `tooling/build-checks.mjs:14696` — group 43's description string; the sentence starting
  `THE OWNER'S LIVE PAIR (import/fixtures/measure-live/, verbatim) …` ends `each record passing checkRecord with its verdict derived;`.
- `.claude/references/gates.md:78` — Group 43 prose; the sentence `**The owner's live pair** … each record passing `checkRecord`.`
- `import/fixtures/measure-live/README.md:34-36` — "Both verdicts read `red` because the neutral pack fails one WCAG pair (11/12)".
- `tooling/regen-import-records.mjs:73,106,112` — records overlay the neutral pack with Polaris / mapping values;
  both records are already 12/12 and do not move (observed).
- `tooling/visual-regression/playwright.config.mjs:21` — `maxDiffPixels: 100`, default per-pixel threshold 0.2.

### New Files to Create

None.

### Patterns to Follow

**43.16 assertion shape** (mirror `tooling/build-checks.mjs:14542-14543`): `ok(<predicate>, \`43.16: the owner's ${frame} frame … — expected …\`)`,
the message naming what was observed and what was expected, `deep()` for objects.

**Token change chain** (`.claude/references/token-system.md`, memory "Token change → regen handoff pack"):
source JSON → `gen-token-css` → `gen-handoff` → **`gen-pack-bundle`** (gen-handoff does NOT rewrite
`handoff/verdant/pack.bundle.json`; observed — only drift-check or the standalone generator does).

---

## IMPLEMENTATION PLAN

### Phase 1: the value and its generated copies
Primitive edit, token CSS, handoff pack, pack bundle, build-card literal. Import records and importer verdicts
are regenerated to prove they do not move.

### Phase 2: the pin
**Depends on:** Phase 1 (the pin is red on the old value — that is its REDDENS).
One assertion in 43.16 plus its three prose copies.

### Phase 3: VR baseline
**Independent of:** Phase 2. **Depends on:** Phase 1 committed (update:docker screenshots the working tree).

### Phase 4: gates, then the live-green observation (Task 8)

---

## STEP-BY-STEP TASKS

### Task 0 — BRANCH from `origin/main`

- **IMPLEMENT**: `git fetch origin && git worktree add -b fix/neutral-fg-muted-aa-482 ../wt-482 origin/main`, then
  `cd ../wt-482 && (cd tooling/style-dictionary && npm ci) && (cd tooling/icons && npm ci)`.
- **GOTCHA**: the primary tree sits on `fix/importer-reads-icon-name-449` (merged, behind main) with unrelated
  dirty files; do not work there. The worktree MUST be under `/Users` (Docker file sharing — memory
  "VR gate reads the working tree"). Stage by explicit path only.
- **IMPLEMENT (cont.)**: copy the plan and brief in — `cp <primary>/.claude/plans/neutral-fg-muted-aa-482.{md,html} .claude/plans/` —
  and stage them by explicit path with the fix (plan, report and review ride in the same PR).
- **VALIDATE**: `git log --oneline -1` → `eb84860 feat(import): live import fidelity …` or later.
- **SATISFIES**: —  **REGENERATES**: none.

### Task 1 — UPDATE `system/tokens.source.json:104`

- **IMPLEMENT**: `"color-slate":    { "$value": "#69707e", "$type": "color", "$description": "mid grey — secondary text" },`
  Only this line. Leave line 8 (contract) as #6b7280.
- **VALIDATE**: `node agent-layer/gen-token-css.mjs` → `token css       ✓  63 contract + 71 pack tokens → …/system`;
  `git diff --stat` → `system/tokens.neutral.css | 2 +-`, `system/tokens.source.json | 2 +-` (contract.css untouched).
- **VALIDATE (the AC, as a function run)**: save as `$SCRATCH/wcag482.mjs` and run `node $SCRATCH/wcag482.mjs $PWD`:
  ```js
  import { readFileSync } from "node:fs";
  const R = process.argv[2];
  const { checkPairs } = await import(R + "/system/wcag.mjs");
  const { RULESET } = await import(R + "/system/derive.rules.mjs");
  const { fidelityVerdict } = await import(R + "/import/report.mjs");
  const css = readFileSync(R + "/system/tokens.neutral.css", "utf8");
  const raw = Object.fromEntries([...css.matchAll(/^\s*--([a-z0-9-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]));
  const t = {}; for (const k in raw) { let v = raw[k]; for (let i = 0; i < 8 && /^var\(/.test(v); i++) v = raw[v.match(/--([a-z0-9-]+)/)[1]] ?? ""; if (/^#[0-9a-f]{6}$/i.test(v)) t[k] = v.toLowerCase(); }
  const rows = checkPairs(t, RULESET.wcagPairs);
  const wcag = { pass: rows.filter((r) => r.pass).length, total: rows.length };
  console.log("neutral", wcag, rows.filter((r) => !r.pass || /muted|secondary/.test(r.fg)).map((r) => `${r.fg}/${r.bg} ${r.ratio}`));
  for (const f of ["faithful", "wrong"]) { const m = JSON.parse(readFileSync(`${R}/import/fixtures/measure-live/${f}.measure.json`)); console.log(f, m.worst.value, fidelityVerdict({ deltaEMin: { worst: m.worst, scored: m.scored }, wcag })); }
  ```
  Observed after: `neutral { pass: 12, total: 12 } [ 'color-fg-muted/color-bg 4.98', 'color-fg-muted/color-bg-surface 4.53', 'color-accent-secondary/color-bg 4.98' ]`, `faithful 1.3379 green`, `wrong 29.7584 red`.
  Observed before (origin/main): `{ pass: 11, total: 12 }`, `…surface 4.4`, `faithful 1.3379 red`.
- **SATISFIES**: AC 1, AC 2.  **REGENERATES**: `system/tokens.neutral.css` (`node agent-layer/gen-token-css.mjs`).

### Task 2 — UPDATE `system/build-card.mjs:38`

- **IMPLEMENT**: `fgMuted: "#69707e",` — the header (lines 24-26) says these are the neutral pack's resolved values
  and to re-read them when the ramp moves. Change only the value.
- **GOTCHA**: no gate compares `NEUTRAL` to the pack (build-checks was green both with and without this edit) —
  it is mirrored by hand, so it is easy to miss.
- **VALIDATE**: `grep -n 'fgMuted: "#69707e"' system/build-card.mjs` → line 38.
- **SATISFIES**: AC 3.  **REGENERATES**: none (line count unchanged; loc-summary drift-check stays green, observed).

### Task 3 — REGENERATE the handoff pack, the bundle, and prove the import fixtures do not move

- **IMPLEMENT**, in order:
  - `node agent-layer/gen-handoff.mjs` → `handoff pack    ✓  26 specs + 3 token targets + 3 wc wrappers (handoff/verdant)`
  - `node agent-layer/gen-pack-bundle.mjs` → `pack bundle     ✓  16 files (handoff/verdant/pack.bundle.json)`
  - `node tooling/regen-import-records.mjs` → `import records ✓  import/fixtures/records/ — 4 files, 187933 bytes` (no diff)
  - `node import/regen-expected.mjs` → two `expected verdict ✓` lines (no diff)
- **VALIDATE**: `git status --short` shows exactly: `handoff/verdant/pack.bundle.json`, `handoff/verdant/tokens.dtcg.json`,
  `handoff/verdant/tokens/android/tokens.xml`, `handoff/verdant/tokens/css/neutral.css`,
  `handoff/verdant/tokens/ios/FactoryTokens.swift`, `system/build-card.mjs`, `system/tokens.neutral.css`,
  `system/tokens.source.json`. Nothing under `import/`, and NOT `handoff/verdant/tokens/css/contract.css`.
- **GOTCHA**: the ticket's chain omits `gen-pack-bundle` — skipping it leaves drift-check red. Do not hand-edit any
  handoff file.
- **SATISFIES**: AC 3.  **REGENERATES**: the five handoff files above.

### Task 4 — ADD the verdict pin to 43.16 (`tooling/build-checks.mjs`, after line 14543)

- **IMPLEMENT**: directly after the `ok(under ? want.worst.value < THRESHOLD : …)` assertion (ends line 14543), insert:
  ```js
      // The VERDICT separates the pair too, not only the ΔE (#482): the neutral pack passes every WCAG pair, so
      // faithful reads green and wrong reads red — and red at 12/12 is the wrong-but-green line, live.
      const wg = existsSync(at(".md")) && readFileSync(at(".md"), "utf8").includes("**Wrong but green.**");
      ok(rec.fidelity.verdict === (under ? "green" : "red") && rec.fidelity.wcag?.pass === rec.fidelity.wcag?.total && wg === !under,
        `43.16: the owner's ${frame} frame reads ${deep(rec.fidelity.verdict)} at WCAG ${rec.fidelity.wcag?.pass}/${rec.fidelity.wcag?.total} (failing ${deep(rec.fidelity.wcag?.failing)}), its markdown ${wg ? "WITH" : "without"} the wrong-but-green line — expected ${under ? "green, without" : "red, with"} it, every pair passing (#482)`);
  ```
- **GOTCHA**: compare against the LITERALS `"green"`/`"red"`, never `fv(rec.fidelity)` — the existing line 14538
  already derives it, which is why nothing reddened on the defect.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓  all 46 groups pass` (observed).
- **REDDENS** (observed): revert Task 1's value to `#6b7280`, run `node agent-layer/gen-token-css.mjs`, then build-checks →
  ```
  build import run     ✗  2 failure(s)
    · 43.16: the owner's faithful frame reads "red" at WCAG 11/12 (failing ["color-fg-muted on color-bg-surface"]), its markdown without the wrong-but-green line — expected green, without it, every pair passing (#482)
    · 43.16: the owner's wrong frame reads "red" at WCAG 11/12 (failing ["color-fg-muted on color-bg-surface"]), its markdown without the wrong-but-green line — expected red, with it, every pair passing (#482)
  ```
  Restore the value and regenerate before moving on.
- **SATISFIES**: AC 2, AC 4.  **REGENERATES**: none (build-checks.mjs is outside the loc-summary runtime group;
  drift-check green after commit, observed).

### Task 5 — UPDATE the three prose copies of 43.16's claim

- **IMPLEMENT**:
  - `tooling/build-checks.mjs:14696` (group 43's string): replace `each record passing checkRecord with its verdict derived;`
    (unique in the file, observed `grep -o … | wc -l` → 1) with
    `each record passing checkRecord with its verdict derived, faithful green and wrong red at 12/12 WCAG and the wrong one's markdown carrying the wrong-but-green line (#482);`
  - `.claude/references/gates.md:78`: `wrong 29.7584 over it — each record passing \`checkRecord\`.` →
    `wrong 29.7584 over it — each record passing \`checkRecord\`, faithful reading green and wrong red at 12/12 WCAG, the wrong one's markdown carrying the wrong-but-green line (#482).`
  - `import/fixtures/measure-live/README.md`: keep lines 34-36 (they state what was true at capture) and append a
    paragraph: `Since #482 (2026-09-29) the neutral pack passes 12/12: the replay in 43.16 derives faithful **green** and wrong **red**, and the wrong record now carries the wrong-but-green line. The committed \`measure.json\` lines still say \`red\` — the verdict at capture, verbatim.` (No sentence about
    a fresh capture's ΔE: that is unmeasured; canvas-journey I12 is where it would be observed.)
- **GOTCHA**: memory "Gate prose has three copies" — all three or the next review files a finding.
- **VALIDATE**: `grep -c "#482" tooling/build-checks.mjs .claude/references/gates.md import/fixtures/measure-live/README.md` → 3 / 1 / 1 (build-checks: Task 4's comment and message lines, plus the group string; observed 2 before this task).
- **SATISFIES**: AC 4.  **REGENERATES**: none.

### Task 6 — COMMIT Phase 1-2, then REGENERATE `components-neutral.png`

- **IMPLEMENT**: commit Tasks 1-5 first (update:docker screenshots the working tree). Then:
  `cd tooling/visual-regression && rm baselines/components-neutral.png && docker run --rm -v "$PWD/../..":/work -w /work/tooling/visual-regression mcr.microsoft.com/playwright:v1.61.1-jammy sh -c 'npm ci --silent && npx playwright test --update-snapshots -g "components · neutral" --reporter=line'`
  → `1 passed`. Then the full gate: same docker line with `npx playwright test --reporter=line` → `33 passed`.
- **GOTCHA**: only this baseline moves: /components prints resolved token hex as text (`catalog.mjs:186-190`),
  1791 px differ (observed, full run before regen: `1 failed … components · neutral`, 32 passed). Every other page
  paints the grey only, delta 2.02 vs cut 1408 (derived). Do NOT rm other baselines; a green run also does not
  prove they are byte-identical (memory "VR tolerance hides text changes") — none prints the value, so none is expected to.
- **VALIDATE**: `git status --short tooling/visual-regression` → only `M …/baselines/components-neutral.png`.
- **SATISFIES**: AC 5.  **REGENERATES**: `tooling/visual-regression/baselines/components-neutral.png`.

### Task 7 — RUN the CI gates on the committed tree

- **VALIDATE**:
  - `node tooling/drift-check.mjs` → `drift-check     ✓  syntax · token-css · … · group-count` (run AFTER committing — it
    reads uncommitted regen as drift; memory "drift-check mid-merge false positive").
  - `node tooling/token-lint.mjs` → `token-lint      ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`
  - `node tooling/build-checks.mjs` → `build ✓  all 46 groups pass`
- **SATISFIES**: AC 6.

### Task 8 — PIN a live green in canvas-journey I12 and RUN it (addresses R2)

43.16 replays the committed candidate bytes, rendered against the OLD grey. Only I12 renders the faithful frame
fresh through `tooling/measure-render.mjs` against the NEW pack, so it is the one place the ticket's literal claim
("a live import can read green") is observed. Today I12 compares the page's verdict word to
`fidelityVerdict(r.fidelity)` — the same re-derivation that hid this defect in 43.16.

- **IMPLEMENT** in `tooling/canvas-journey.mjs`, I12 step (origin/main ~line 1177): after the existing
  `t("I12 · the record passes checkRecord, and the page's verdict word is the DERIVED one", …)`, add
  ```js
  const word = await page.locator("[data-import-fidelity]").getAttribute("data-import-fidelity");
  t("I12 · the faithful frame reads GREEN, every WCAG pair passing (#482)", word === "green" && r.fidelity.wcag?.pass === r.fidelity.wcag?.total,
    `${word} at WCAG ${r.fidelity.wcag?.pass}/${r.fidelity.wcag?.total} (failing ${JSON.stringify(r.fidelity.wcag?.failing)}), worst ${JSON.stringify(worst)}`);
  ```
  Keep the DERIVED assertion (it checks the page agrees with the record); the new one checks the record's answer.
- **IMPLEMENT (prose, two copies)**: header comment (~line 50): `— worst ΔE under THRESHOLD, the derived verdict,`
  → `— worst ΔE under THRESHOLD, the derived verdict and that verdict GREEN at 12/12 WCAG (#482),`;
  `.claude/references/gates.md` canvas-journey paragraph: add `, reading green at 12/12 WCAG (#482)` after the
  I12 clause's derived-verdict wording (grep `I12, #474` to find it).
- **VALIDATE**: `(cd portal && npm ci)` then `node tooling/canvas-journey.mjs chromium` → every I12 line ✓, and the
  printed `· measured worst ΔE <v> at <region>` line recorded in the report as the fresh live worst (expected under
  5.0: the committed replay's worst was 1.3379 on the title, and the subtitle moves by a flat-hex 0.787).
- **REDDENS** (expected — run it): revert Task 1's value, `node agent-layer/gen-token-css.mjs`, rerun chromium →
  `✗ I12 · the faithful frame reads GREEN … — red at WCAG 11/12 (failing ["color-fg-muted on color-bg-surface"])`.
  Restore and regenerate.
- **GOTCHA**: operator-run, $0 (no model); spawns this worktree's own portal on a free port. Kill only your own
  PIDs (memory "Portal smoke: kill only your own PID"). If `portal/` deps cannot be installed, the report's Not run
  says the live-green claim rests on the 43.16 replay alone — do not claim AC 7.
- **SATISFIES**: AC 7.  **REGENERATES**: none.

---

## TESTING STRATEGY

No suite (CLAUDE.md § Testing). The proof is: the function run in Task 1 (checkPairs + fidelityVerdict on the real
pack and the committed live pair), the 43.16 pin with its observed reddening, the CI gates, and the VR gate in Docker.

### Edge Cases

- `accent-secondary` shares the primitive: 4.83 → 4.98 on white, still passing (observed). See R1.
- Contract left at #6b7280: no gate asserts contract = pack (observed: 46 green, token-lint clean).
- Import records overlay other values on the neutral pack and stay byte-identical (observed).
- A fresh render of the faithful frame paints the subtitle #69707e against the drawn #6B7280. The flat-hex
  distance is 0.787 (`deltaEHex`, derived); the rendered subtitle already measured 1.0001 at the identical hex
  (anti-aliasing), and CIEDE2000 distances do not add, so the fresh worst ΔE is expected, not known. Observed only
  by canvas-journey I12 — the one check of a genuinely live green (43.16 replays the old candidate bytes).

### Proving the checks

Task 4's pin: REDDENS observed (both frames, naming the pair). Positive control: the same run on the fixed
value is green (observed). The pin cannot pass by skipping: it reads the replayed record's own `wcag` and the
written markdown, and `under` comes from the loop literal.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
`node tooling/drift-check.mjs` (includes `node --check` over every tracked .mjs) · `node tooling/token-lint.mjs`

### Level 2: Unit Tests
`node tooling/build-checks.mjs`

### Level 3: Integration Tests
VR gate in Docker (Task 6). `node tooling/canvas-journey.mjs chromium` for I12's live green (Task 8, AC 7).

### Level 4: Manual Validation
`node $SCRATCH/wcag482.mjs $PWD` (Task 1). Open `/components` under the neutral pack (`npx serve .`): the
`--color-fg-muted` row reads `#69707e`.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Re-capture `measure-live/faithful` against the new pack value | owner's hand (Brilliant + two button presses) | no | not needed — replay pinned to committed bytes; README note says so |
| Task 8: `canvas-journey.mjs chromium` (fresh render against the new pack; the only observation of a live green) | $0, operator-run, needs `portal/` deps + Playwright | **yes** for AC 7 (R2) | report's Not run, AC 7 unmet, naming that the live-green claim then rests on the 43.16 replay |
| Q1 — whether the contract fallback should move too | owner's decision | no | Q1 below |

---

## ACCEPTANCE CRITERIA

- [ ] AC 1 — `checkPairs(tokens.neutral.css, RULESET.wcagPairs)` → 12/12; `color-fg-muted on color-bg-surface` ≥ 4.5 (4.53).
- [ ] AC 2 — the owner's faithful live frame derives `green`, the wrong one `red` (Task 1 script and 43.16).
- [ ] AC 3 — every copy of the value moves: token CSS, handoff pack incl. `pack.bundle.json`, `build-card.mjs` fallback; import fixtures unchanged.
- [ ] AC 4 — 43.16 pins the verdicts and the wrong-but-green line, reddens on the old value, and its three prose copies say so.
- [ ] AC 5 — `components-neutral.png` regenerated; full VR gate 33/33.
- [ ] AC 6 — drift-check, token-lint and build-checks green on the committed tree; PR body carries `Closes #482`.
- [ ] AC 7 — a FRESH render of the faithful frame against the new pack reads green: canvas-journey I12's new
      literal assertion ✓ on chromium, and it reddens on the old value; the fresh worst ΔE is recorded.

---

## COMPLETION CHECKLIST

- [ ] Tasks 0-7 in order, each VALIDATE run
- [ ] REDDENS for Task 4 reproduced by the implementer
- [ ] Plan, report and review in the same PR (`.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/pr-<N>-review.md`)

---

## OPEN QUESTIONS / ASSUMPTIONS

- **D1 / Q1 — contract fallback stays #6b7280.** The ticket names the neutral pack; the contract is also the
  importer's snap target set (`targetsFrom(contract)`, `import/snap-rules.mjs:86`). Moving it would turn an
  unbound #6b7280 (Tailwind gray-500) from `exact` → `proposed` (ΔE 0.787 ≤ colour tolerance 2.3, measured), and
  would change `handoff/verdant/tokens/css/contract.css` for consumers. Cost of NOT moving it: a page loading the
  contract with no pack fails the same pair; no shipped page does that. If the owner wants the contract moved too,
  it is one line plus the snap consequence to accept — a follow-up, not this PR.
- **D2 — shared primitive, not a new one.** Darkening `color-slate` also darkens `--color-accent-secondary`
  (4.83 → 4.98). Splitting a new primitive would keep the accent at #6b7280 at the cost of a new token; rejected as
  more change for no requirement.

### Risks and how they are addressed

- **R1 — `--color-accent-secondary` moves too (D2).** Addressed by evidence, not by a split. Every neutral-pack use
  gains contrast and none loses it: `.teal` text and `.lp-local a` link text (`components.css:125,869`, checked pair
  "quiet accent" 4.83 → 4.98), `.ot-notes-link:hover` (`proto.css:226`) and a 3px focus outline (`proto.css:645`,
  a non-text 3:1 use that only gets darker). The other packs bind the token to their own values (`tokens.verdant.css:23`,
  `tokens.saulera.css:92`, `tokens.css:97`), so they are untouched. The 12/12 pin (Task 4) covers the checked pair,
  and the full VR gate shows no pixel change on any page but /components (Task 6).
- **R2 — no fresh live render has read green.** Addressed by Task 8: canvas-journey I12 gets a literal `green`
  assertion, run on chromium, with its reddening mutation, and the fresh worst ΔE goes into the report. AC 7 is not
  met without that run.
- Assumption: the 2-unit darkening is acceptable under the calm-colour constraint (it is the smallest hue-preserving passing step; an unconstrained search finds #6a7080 at 4.504, with less headroom).

## NOTES (open canvas)

**Pre-flight, all on a detached worktree at `origin/main` @ eb84860 (`../wt-482-plan`, removed afterwards):**

1. `checkPairs` on origin/main: 11/12, surface 4.4, faithful red (observed). After #69707e: 12/12, faithful green, wrong red.
2. Full chain with BOTH contract and primitive changed: drift-check ✓, token-lint ✓, build-checks 46/46 ✓. First
   VR run: `1 failed · components · neutral` (1791 px), 32 passed. Cause found in `catalog.mjs:186-190` (hex as text).
3. Findings that changed the plan:
   - `gen-handoff` does not rewrite `pack.bundle.json`; drift-check reported it. Added `gen-pack-bundle` to Task 3.
   - No gate reddened on the defect before or after — 43.16 compares the verdict to `fv(...)`, which re-derives
     it. Added the Task 4 pin, proved both ways (REDDENS above).
   - The wrong frame trips `wrongButGreen` for the first time on a live import (red at 12/12). Pinned in Task 4
     and written into the prose copies.
   - Nothing enforces contract = pack; the snap consequence measured → D1: contract untouched.
   - `build-card.mjs:38` mirrors the value by hand; no gate catches it. Task 2.
   - Import records and importer expected verdicts: regenerated, zero diff.
   - VR: one baseline; regen of `components-neutral.png` → `1 passed`; full gate after → `33 passed`.
4. Final minimal state (primitive + build-card + pin + one baseline): drift-check ✓, token-lint ✓, build-checks
   46/46 ✓, VR 33/33 (all observed). Diff: 10 files, +20 −15.
5. Traps carried: gate prose three copies; VR reads the working tree (commit first, worktree under /Users);
   drift-check misreads uncommitted regen; token change → regen handoff pack; VR tolerance hides text changes.

## AMENDMENTS

- 2026-09-29 — risks addressed: R1 (accent-secondary) closed with the use-site audit; R2 (no live green observed) became Task 8 + AC 7 — canvas-journey I12 gains a literal `green` assertion, run on chromium, blocking AC 7.
