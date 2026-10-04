# Fix: an unnamed container never outscores the structural fallback (#493)

The following plan should be complete, but validate the citations and task sanity before you start
implementing. Every line number below was read on `origin/main` at `d6859eb` (2026-10-04).

## Feature Description

`import/recognise.mjs` (the design importer's matcher: it scores every vocabulary component against
each node of an imported drawing) lets a component that holds many children win a node on structure
alone. Today no such entry can — `stack` is excluded from scoring (R2) and `list` cannot fill its
required `empty` — but the moment ratify (`portal/lib/ratify.mjs`, the owner's admission of a new
component into the vocabulary) admits a container with `children: "many"` and a required text slot,
that container takes the committed fixture's "Text block" at exactly the 0.5 threshold, and three
gate groups go red on fixtures nobody touched. This plan extends R2's own argument to every `many`
entry: an unnamed container is passed over for the scored outcome, so the node falls back to `stack`
as before. A named container still wins.

## User Story

As the portfolio owner admitting a composed group (a header, a toolbar) as a new container component
I want ratify's gate chain to stay green when the admission is a container
So that promoting a real container is possible without a paid Jev re-pin or a hand-moved fixture.

## Problem Statement

For an entry declaring `childrenCardinality: "many"`, `kind-fit` (`import/recognise.mjs:306`) fires on
**every** laid-out node, and a required prop sourced from `first-text` (`PROP_SOURCES`, `:155-168`)
fills from any node that holds a word. So a `many` entry with a required `title` scores kind-fit 0.25
+ prop-fit 0.25 = 0.5 on every laid-out box with text — the same free score R2 (`:26-40`) removed
`stack` from the contest to avoid. #315's probe (`.claude/plans/compose-and-name-groups-315-probe/ratify-promote-results.md` §4b)
recorded the result at ratify's chain step 10: 37 failures in groups 40, 43 and 46.

Reproduced on `origin/main` this session (observed, `.claude/plans/unnamed-container-fallback-493-probe/e2e-before.txt`):
promote a group named `top-bar` (screen-header + ghost-button + icon) and ratify it with
`children: "many"` and a required `title` → steps 1–9 exit 0, step 10 `tooling/build-checks.mjs` exits 1:
`import-chain ✗ 8 · import run ✗ 12 · import suggest ✗ 17 · build ✗ 37 failure(s)` — the issue's count exactly.

## Solution Statement

Option 1 of the issue, generalised from "an admitted container" to "an unnamed container", because
the vocabulary carries no admission marker (every entry's `status` is `"shipped"`, observed) and the
issue itself says the cause is the matcher, not the origin. In `recognise()`:

- the candidates list is built and sorted exactly as today (so every committed `candidates` list is
  byte-identical);
- the **scored** outcome reads the first candidate that is not an unnamed container — a `many` entry
  counts only when its `name-match` signal fired;
- the floor and the structural fallback are unchanged; the floor still reports `candidates[0]`.

Option 2 (groups 40/46 read the vocabulary instead of literal pins) is rejected: it does not stop the
wrong verdict, it only stops the gates noticing it, and group 46's Jev pins would still need a paid
re-record. With option 1, group 46's committed requests stay valid because the set of unnamed nodes
does not change (observed: `import suggest ✓` after the fix with the container admitted).

## Out of Scope / Non-Goals

- Not included: a provenance/"admitted" field in `vocabulary.json` — not needed by a structural rule.
- Not included: a new verdict field recording "passed over" (Q2) — the candidate's hits already carry
  no `name-match`, which is the reason; no view renders verdict candidates (grep, observed).
- Not changing: any weight, `THRESHOLD`, the tie-break, `kind-fit`/`prop-fit`/`child-fit`, or the floor.
- Not changing: group 46's committed Jev run (`tooling/import-suggest/spike-c-run.json`) — no paid re-run.
- Not fixing: group 50.18's dependency on the vocabulary not containing `app-header` (Q3) — latent,
  separate.
- Not editing: `.claude/plans/faster-payment-build-run-316.md`'s R4 workaround ("pick a leaf") — its
  owner decides whether to lift it once this lands (forward reference below).

## Feature Metadata

**Feature Type**: Bug Fix
**Estimated Complexity**: Low (≈ 5 lines of logic, one gate case, three prose copies)
**Primary Systems Affected**: `import/recognise.mjs`; build-checks group 40; `.claude/references/gates.md`
**Dependencies**: none (node built-ins; no SDK; no paid step)

## Related Work

**Implements**: #493 (no epic line on the issue; the matcher is epic #295's, `docs/epics/canvas-design-import.architecture.md:265-268` — "independent signal predicates, sorts, thresholds, … explicit floor"; this plan keeps that shape)

**Back-references**:
- `.claude/plans/compose-and-name-groups-315-probe/ratify-promote-results.md` §4b — the defect's evidence and the two candidate fixes.
- `.claude/reports/compose-and-name-groups-315-report.md:145` — the draft this ticket was opened from.
- `import/recognise.mjs` R2 (`:26-40`) and R3 (`:42-51`) — the rules this extends.

**Forward-references**:
- `.claude/plans/faster-payment-build-run-316.md:73,396,493,526` — #316's R4 ("avoid #493: pick a leaf") and its paid re-pin row become unnecessary once this merges.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ BEFORE IMPLEMENTING

- `import/recognise.mjs:18-51` — the four rules header; R2 is the argument this ticket extends. Read the whole header (`:1-128`) once: house voice is capitalised claims + reasons.
- `import/recognise.mjs:300-317` — `kind-fit`; `:306` is the `many` branch that fires on every laid-out node.
- `import/recognise.mjs:385-430` — the tie-break, `named` (`:403`), `top` (`:410`), THREE OUTCOMES (`:414-424`).
- `tooling/build-checks.mjs:13932-13949` — group 40's header and its "cannot reach" paragraph.
- `tooling/build-checks.mjs:13951-13993` — group 40's locals: `B1`, `F1`, `R1`, `IR`, `fold`, `at` (`:13987`), `flat` (`:13989`), `INSTANCE`/`MASTER` (`:13991-13992`).
- `tooling/build-checks.mjs:14348-14357` — 40.14, R2's existing case (mirror its voice).
- `tooling/build-checks.mjs:14487-14521` — 40.19; `FIG` is declared at `:14493`, so 40.30 must sit **after** it.
- `tooling/build-checks.mjs:14725-14770` — 40.29, the last case; 40.30 goes between its closing `}` and `group("import-chain", …)` at `:14772`.
- `tooling/build-checks.mjs:14772` — group 40's detail string (one long template literal).
- `.claude/references/gates.md:72` — group 40's paragraph.
- `portal/lib/import-suggest.mjs:57-61,84-97` — why group 46 depends on which nodes are `structural-fallback` (`unnamedPaths` → request count).

### New Files to Create

- none in the shipped tree. The plan's probe material is already parked at
  `.claude/plans/unnamed-container-fallback-493-probe/` (`promote-driver.mjs.txt`, `e2e-ratify.mjs.txt`,
  `final.diff.txt` — the exact diff this plan describes, `e2e-before.txt`, `e2e-after.txt`). `.txt`
  because CI's drift-check syntax-checks every tracked `.mjs`, including under `.claude/plans`.

### Relevant Documentation

- None external. The governing text is the file header (CLAUDE.md § "Invariants live in the file that owns them").

### Patterns to Follow

**The rule shape** (observed in `final.diff.txt`; green):

```js
  const top = candidates[0] ?? null;
  // R2 OVER EVERY `many` ENTRY (#493): an unnamed container is passed over for the scored outcome only.
  const container = (c) => vocab.components[c.slug]?.childrenCardinality === "many";
  const pick = candidates.find((c) => !(container(c) && !named(c))) ?? null;
  const drops = [];
  let name = null, via = "floor", covered = false, score = top ? top.score : 0, hits = top ? top.hits : [];

  // THREE OUTCOMES, RESOLVED IN THIS ORDER AND NO OTHER.
  if (pick && pick.score >= THRESHOLD) {
    name = pick.slug; via = "scored"; covered = true; score = pick.score; hits = pick.hits;
  } else if (ir.layout) {
```

**Keys on the entry's declared shape, never its slug** — `kind-fit` (`:306`) and `declaresGlyphBox`
(`:192`) do the same; a renamed or second container is found by the same rule.

**Gate case voice** — `// --- 40.N TITLE ---` header, `SYNTHETIC` in every failure message of a synthetic
case, every constructive call through `fold()`, a vacuity guard and a positive control beside the
assertion (40.3, 40.15, 40.29).

---

## IMPLEMENTATION PLAN

### Phase 1: The rule
Edit `recognise()` and extend R2 in the header. Verifiable alone: all 51 groups stay green, no fixture moves.

### Phase 2: The gate case
**Depends on:** Phase 1 (the case reds without it — that is its REDDENS).
Add 40.30 and drive both mutations.

### Phase 3: Prose copies
**Independent of:** Phase 2's code (text only), but write it after so the prose describes the case as built.
Group 40's detail string, `gates.md:72`.

### Phase 4: End-to-end proof
**Depends on:** Phases 1–2 committed (ratify's clean guard refuses a dirty tree).
Re-drive promote → ratify with a `many` container in a throwaway worktree; step 10 must be green.

---

## STEP-BY-STEP TASKS

### 0. BRANCH from `origin/main`

- **IMPLEMENT**: The shared working directory was on `fix/importer-reads-icon-name-449` (merged, far behind main) when this plan was written. `git fetch origin && git switch -c fix/unnamed-container-fallback-493 origin/main`. Re-confirm `git branch --show-current` immediately before every commit (parallel sessions share this directory).
- **VALIDATE**: `git merge-base --is-ancestor d6859eb HEAD && echo ok` → `ok`
- **SATISFIES**: all (every citation was read at `d6859eb`)
- **REGENERATES**: none

### 1. UPDATE `import/recognise.mjs` — the rule

- **IMPLEMENT**: Apply the "rule shape" above at `:410-416`: keep `top = candidates[0]`; add `container`
  and `pick` after it; the scored branch reads `pick` and sets `score`/`hits` from it. The fallback and
  floor branches are untouched, so a floor verdict still reports `top`.
- **PATTERN**: `named` already exists at `:403` — reuse it, do not redefine.
- **GOTCHA**: Do NOT filter the candidates list or skip scoring a container — `candidates` is
  committed in `import/fixtures/spike-c-instance.expected.json`, `figma/spike-list-row.expected.json`
  and the records, and is what lets the record show the container competed. Do NOT make `top` itself
  `.find(...)`: that moves a floor verdict's `score`/`hits` to a lower candidate when an unnamed
  container (max 0.35 without layout) heads the list.
- **GOTCHA**: `vocab` is the argument; never read `vocabulary.json` here (header: "THE VOCABULARY IS AN ARGUMENT").
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓  all 51 groups pass` (observed, with this exact diff).
  `node import/regen-expected.mjs && node tooling/regen-import-records.mjs --check && git diff --exit-code import/fixtures` → both `✓`, no diff (observed: `expected verdict ✓ … 57579 bytes`, `… 55853 bytes`, `import records ✓ … 4 files, 187933 bytes, no drift`).
- **SATISFIES**: AC 1, AC 3
- **REGENERATES**: none (no committed verdict moves — observed).

### 2. UPDATE `import/recognise.mjs` — the header

- **IMPLEMENT**: Append to R2 (after `:40`, before R3) a paragraph with these claims, in the header's voice:
  1. R2 COVERS EVERY `many` ENTRY, NOT ONLY `stack` (#493): kind-fit's container branch fires on every
     laid-out node, and a first-text prop fills from any node with words, so a container with a title
     slot takes 0.5 on every laid-out box with text by structure alone — a second `stack`.
  2. So an unnamed container is passed over FOR THE SCORED OUTCOME: a `many` candidate counts only when
     name-match fired; otherwise the next candidate is read, and a laid-out node with none above the
     threshold is a `stack`.
  3. It stays in the candidates list at its score, so the record shows it competed; its hits carry no
     name-match, which is the reason it lost. Floor verdicts are untouched.
  4. A NAMED container still wins — the name is the evidence and the structure corroborates (R3 read the
     other way). Child-fit alone does not stand in for the name (Q1).
  5. On today's vocabulary it changes no verdict: `stack` is excluded and `list` tops out at 0.35 unnamed
     (kind-fit 0.25 + child-fit 0.1; `list.empty` has no source slot). Case 40.30 is what proves the rule.
  Leave the "THE FOUR RULES" heading as it is: R2 is extended, not joined by a fifth rule.
- **VALIDATE**: `node --check import/recognise.mjs` (exit 0)
- **SATISFIES**: AC 4
- **REGENERATES**: none (`import/` matches no loc-summary group — 40.26 asserts it).

### 3. ADD case 40.30 to `tooling/build-checks.mjs`

- **IMPLEMENT**: Insert before `  group("import-chain",` (`:14772`), after 40.29's closing `}`. Code as built and observed green:

```js
  // --- 40.30 AN UNNAMED CONTAINER NEVER OUTSCORES THE FALLBACK (R2, #493) --------------------------
  // SYNTHETIC ENTRY, COMMITTED READS. #315's probe admitted a `many` container with a required text
  // slot and three groups went red on reads nobody touched: kind-fit fires on EVERY laid-out node for a
  // `many` entry and first-text fills its title from any node with words, so it took "Text block" at
  // exactly the threshold by structure alone — R2's argument, about a second `stack`. The entry is
  // added to a CLONE of the vocabulary (VOCAB is shared with every group after this one), and every
  // node of all three committed reads must answer the same name by the same `via` with it as without it.
  {
    const SYN = "top-bar";
    const synVocab = structuredClone(VOCAB);
    synVocab.components[SYN] = {
      class: "ds-top-bar", status: "shipped", states: ["default"], usage: "SYNTHETIC (#493)",
      props: { title: { type: "string", required: true, description: "the screen title" } },
      children: ["screen-header", "ghost-button", "icon"], childrenCardinality: "many",
    };
    const reads = [
      ["instance", () => B1.convert(INSTANCE)], ["master", () => B1.convert(MASTER)], ["figma", () => F1.convert(FIG)],
    ];
    const moved = [];
    let tb = null;
    for (const [fname, conv] of reads) {
      const ir = fold(`convert the ${fname} read (40.30)`, conv, null);
      if (!ir) continue;
      const base = flat(fold(`recognise ${fname} (40.30)`, () => R1.recognise(ir, VOCAB), { children: [] }));
      const syn = flat(fold(`recognise ${fname} with ${SYN} (40.30)`, () => R1.recognise(ir, synVocab), { children: [] }));
      base.forEach((b, i) => { if (b.name !== syn[i]?.name || b.via !== syn[i]?.via) moved.push(`${fname} ${b.path}: ${b.name} via ${b.via} → ${syn[i]?.name} via ${syn[i]?.via}`); });
      if (fname === "instance") tb = syn.find((v) => v.path === "ir.children[0].children[1]") ?? null;
    }
    ok(moved.length === 0,
      `40.30: SYNTHETIC — adding an unnamed \`many\` container with a required text prop moved ${moved.length} verdict(s) on the committed reads: ${moved.join("; ")} — kind-fit fires on every laid-out node for such an entry, so without a name it is a second stack and must lose to the fallback (R2, #493)`);
    // VACUITY GUARD: the entry must really clear the threshold on "Text block", or the case above
    // passes because it never competed.
    const c = tb?.candidates.find((x) => x.slug === SYN);
    ok(tb?.name === "stack" && tb.via === "structural-fallback" && c && c.score >= R1.THRESHOLD,
      `40.30: SYNTHETIC — "Text block" reads ${JSON.stringify(tb?.name)} via ${tb?.via} with ${SYN} at ${c?.score ?? "no candidate"} — expected stack via the fallback WITH ${SYN} at or above ${R1.THRESHOLD} among its candidates, or the case measures nothing`);
    // POSITIVE CONTROL: the same node NAMED after the entry reads it, scored — the rule passes over an
    // unnamed container; it does not exclude containers.
    const named = fold("convert the instance read, Text block renamed (40.30)", () => B1.convert(INSTANCE), null);
    if (named) named.children[0].children[1].name = "Top bar";
    const nv = named && fold("recognise the renamed read (40.30)", () => R1.recognise(named, synVocab), null);
    const nb = nv && at(nv, [0, 1]);
    ok(nb?.name === SYN && nb.via === "scored",
      `40.30: SYNTHETIC — "Text block" renamed "Top bar" reads ${JSON.stringify(nb?.name)} via ${nb?.via} — a NAMED container must still win (R3: the name is the evidence, the structure corroborates)`);
  }
```

- **GOTCHA**: `structuredClone(VOCAB)`, never a write to `VOCAB` — it is shared with groups 41–51.
- **GOTCHA**: slug `top-bar`, not `app-header`: group 50.18 promotes a group named `app-header` and
  answers `app-header-2` if the vocabulary already holds one (observed in this session's first
  injection). The case is safe if a real `top-bar` is ever admitted — it overwrites it in the clone
  (observed: the e2e run admitted a real `top-bar` and 40.30 stayed green).
- **GOTCHA**: the renamed "Text block" must be on a fresh `B1.convert(INSTANCE)`, never on an IR another case holds.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓  all 51 groups pass` (observed).
- **REDDENS** (both driven this session):
  - revert task 1 only (`git checkout import/recognise.mjs`) → `build import-chain ✗ 2 failure(s)`:
    `40.30: SYNTHETIC — adding an unnamed \`many\` container … moved 6 verdict(s) on the committed reads: instance ir.children[0].children[1]: stack via structural-fallback → top-bar via scored; master ir.children[0].children[0]: …`
    and `40.30: SYNTHETIC — "Text block" reads "top-bar" via scored with top-bar at 0.5 — …` (observed).
  - over-reach: change `!(container(c) && !named(c))` to `!container(c)` (exclude every container) →
    `import-chain ✗ 7`, among them 40.12's list builder and `40.19: ir.children[0] (the Figma row) reads "list-row" via scored` (observed). The positive control above reds on the same mutation.
- **SATISFIES**: AC 2
- **REGENERATES**: none (`tooling/` matches no loc-summary group; drift-check's `group-count` counts groups, and this adds a case, not a group — observed `drift-check ✓`).

### 4. UPDATE group 40's detail string (`tooling/build-checks.mjs:14772`)

- **IMPLEMENT**: Two edits inside the template literal:
  - after `40.29 (#477): … (PR #478)` add ` · 40.30 (#493): an unnamed \`many\` container never outscores the fallback — a SYNTHETIC \`top-bar\` (required title, children many) added to a CLONE of the vocabulary moves no verdict on any of the three committed reads, while it scores at or above ${R1.THRESHOLD} on "Text block" (the vacuity guard) and wins it once the node is NAMED "Top bar" (the positive control)`;
  - `SEVEN MORE SYNTHETIC cases — EIGHT in all` → `EIGHT MORE SYNTHETIC cases — NINE in all`, and add 40.30 to that list's end.
- **GOTCHA**: memory "gate prose has three copies" — the header (`recognise.mjs`), this string and `gates.md:72` must agree; grep all three for `R2` after editing.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -c "40.30 (#493)"` → `1`
- **SATISFIES**: AC 4
- **REGENERATES**: none

### 5. UPDATE `.claude/references/gates.md:72`

- **IMPLEMENT**: (a) in "Four decisions are asserted as **invariants rather than as numbers**" add the fifth: "an unnamed `many` container is passed over for the scored outcome (#493), so a laid-out node a container could take only by structure stays a `stack`" and make it "Five decisions"; (b) "Eight cases are **synthetic**" → "Nine", adding 40.30; (c) after the **40.29** sentence, add a **40.30 (#493)** sentence mirroring task 4's text. "What it cannot reach" gains nothing new: 40.30 is synthetic on the entry but real on the reads.
- **VALIDATE**: `grep -c "40.30 (#493)" .claude/references/gates.md` → `1`
- **SATISFIES**: AC 4
- **REGENERATES**: none

### 6. COMMIT, then the end-to-end proof (Level 4 below)

- **IMPLEMENT**: Commit tasks 1–5 **together with** `.claude/plans/unnamed-container-fallback-493.md`, `.html` and the `unnamed-container-fallback-493-probe/` directory (stage each by explicit path). Level 4's worktree is created from HEAD and copies the drivers out of that directory, so an uncommitted probe dir makes its `cp` fail. Then run Level 4 in a throwaway detached worktree of that commit.
- **SATISFIES**: AC 1
- **REGENERATES**: none in the repo — Level 4 writes only inside the throwaway worktree and `$TMPDIR`.

---

## TESTING STRATEGY

No suite (CLAUDE.md § Testing). The proof is build-checks group 40 plus one end-to-end ratify run.

### Unit-level (group 40.30)
Synthetic entry on committed reads: no verdict moves across instance, master and Figma reads; vacuity
guard; positive control (named → scored).

### Integration (Level 4)
The issue's own failure path: promote a group, ratify it as a `many` container, all ten chain steps exit 0.

### Edge Cases
- A named container ("List row" → `list`/`list-row` tie, 40.15; Figma root "Spike List Row" → `list`, 40.19) — still scored (existing cases green).
- An unnamed container heading a **floor** node's list — the floor reports `candidates[0]` unchanged (task 1 GOTCHA).
- `stack` is still excluded before scoring (40.14) — the new rule never sees it.
- A real admission named `top-bar` — 40.30 overwrites it in the clone; still green (observed).

### Proving the checks
Both REDDENS mutations in task 3 were driven before this plan was written. Re-drive the first one after
implementing (revert task 1, see 40.30 red by name, restore).

---

## VALIDATION COMMANDS

### Level 1: Syntax
`node --check import/recognise.mjs && node --check tooling/build-checks.mjs`

### Level 2: The gate (CI `verify`'s three legs, `.github/workflows/verify.yml:86,88,106`)
```bash
git add import/recognise.mjs tooling/build-checks.mjs .claude/references/gates.md   # drift-check reads tracked content
node tooling/drift-check.mjs     # ✓ … group-count (observed on final.diff)
node tooling/token-lint.mjs      # ✓ 63 contract tokens · 0 undeclared · 0 orphan (observed)
node tooling/build-checks.mjs    # build ✓  all 51 groups pass (observed)
```
A fresh worktree needs `npm ci` in `tooling/icons` and `tooling/style-dictionary` first, or 41.7 and
drift-check's sd step red for environment reasons (observed: 41.7 `genIcons({check:true}) THREW` before `npm ci`).

### Level 3: No fixture moves
`node import/regen-expected.mjs && node tooling/regen-import-records.mjs --check && git diff --exit-code import/fixtures`

### Level 4: End to end — the issue's failure path (free, no model)
In a throwaway detached worktree of the implementation commit (ratify's clean guard refuses a dirty tree;
never run this in the shared working directory — it writes `system/` and `handoff/`):
```bash
WT=<scratch>/wt-493-e2e && git worktree add --detach "$WT" HEAD && cd "$WT"
(cd tooling/icons && npm ci) && (cd tooling/style-dictionary && npm ci)
P=.claude/plans/unnamed-container-fallback-493-probe
cp $P/promote-driver.mjs.txt ../promote-driver.mjs && cp $P/e2e-ratify.mjs.txt ../e2e-ratify.mjs
PKG=$(node ../promote-driver.mjs run | sed -n 's/^PKG //p') && PKG=$PKG node ../e2e-ratify.mjs
```
Expected (observed with `final.diff.txt`, `e2e-after.txt`): `ok: true`, ten `step … code 0`, the last
`tooling/build-checks.mjs code 0`. Control (observed on `origin/main`, `e2e-before.txt`): `gatesRed: true`,
step 10 `code 1`, 8 + 12 + 17 = 37 failures. Remove the worktree after (`git worktree remove --force "$WT"`).

### Level 5: piv-validate
Per memory "piv-validate maps to the CI verify job + a portal smoke": run it; the portal smoke uses an
OS-assigned port and kills only its own PID.

### Paid and owner-only steps

None. The fix avoids option 2's paid Jev re-record (group 46's committed run stays valid — observed
`import suggest ✓` with the container admitted). Level 4 runs no model.

---

## ACCEPTANCE CRITERIA

- [ ] AC 1 — Ratify of a promoted group as a `children: "many"` container with a required text slot passes all ten chain steps, step 10 included (Level 4).
- [ ] AC 2 — An unnamed `many` container is passed over for the scored outcome on every committed read, while a named one still wins (40.30, both REDDENS driven).
- [ ] AC 3 — No committed verdict, import record or Jev pin moves; no paid re-run (Level 3; `spike-c-run.json` untouched).
- [ ] AC 4 — The rule is stated in `recognise.mjs`'s R2, group 40's detail string and `gates.md:72`, and the three agree.
- [ ] AC 5 — The PR carries `Closes #493` and this plan, its report and review.

---

## COMPLETION CHECKLIST

- [ ] Tasks 0–6 in order, each VALIDATE run
- [ ] Both REDDENS mutations re-driven
- [ ] Levels 1–5 run; Level 4's output pasted into the report
- [ ] The PR holds the three edited files, the plan `.md` + `.html`, the `-probe/` directory, the report and the review — nothing else (`git diff --stat origin/main`)

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 — name only, or name OR child-fit?** The plan requires `name-match` for a container to be scored.
  The alternative also accepts an unnamed container whose recognised children are all allowed (child-fit).
  Recommended: name only — child-fit for an entry allowing generic children (`icon`, `ghost-button`)
  fires on ordinary content, which is the same structural-only evidence R2 refuses; a wrong `stack` is
  correctable in #311's mapping editor, a wrong container is a confident mis-name. Changing it later is
  one predicate plus a 40.30 case.
- **Q2 — record why a container was passed over?** Assumed no: no view renders verdict candidates
  (grep of `portal/public`, `import/report.mjs`, observed), the candidate's hits carry no `name-match`,
  and the header states the rule. A field would be new record surface with no reader.
- **Q3 — group 50.18's `app-header` dependency.** 50.18 assumes the vocabulary holds no `app-header`;
  admitting one makes `promoteGroup` answer `app-header-2` and 50.18 reds (observed when this session's
  first injection used that slug). Latent, unrelated to the matcher; worth its own ticket if the owner
  plans to admit an `app-header`.
- **Assumption** — the issue's "an admitted container" is read as "any `many` container", per its own
  "the cause is the matcher, not the admission's origin".

## NOTES (open canvas)

### Pre-flight (run 2026-10-04 on a detached worktree of `origin/main` `d6859eb`)

1. **Baseline**: `node tooling/build-checks.mjs` → 41.7 red only (`tooling/icons/node_modules` absent in a fresh worktree); after `npm ci` there, all 51 green.
2. **Reproduction, cheap**: injected an `app-header` (`many`, required `title`) into `handoff/verdant/vocabulary.json` → groups 40, 42.6, 43.16, 46 red as the issue lists, plus 50.18 (the slug collision → Q3).
3. **Prototype rule + injected `top-bar`**: 43 and 46 green; 40's two remaining reds and 42.6 were the candidates-list drift the ratify chain regenerates (steps 6–7), and composition/catalog/handoff-seam reds were the raw injection skipping the spec/template/pack chain. Not proof of AC 1 — that is (5).
4. **Clean vocabulary + rule**: all 51 green; `regen-expected` and `regen-import-records --check` no drift → the rule moves no committed verdict.
5. **Real chain**: `promoteGroup` + `runRatify` with the probe's drivers (slug `top-bar`): without the rule, step 10 red with exactly 37 failures (8/12/17); with it, ten steps `code 0`, `ok: true` (~19 s).
6. **Variant choice**: first prototype made `top` itself a `.find(...)`; switched to `pick` for the scored branch only so a floor verdict's `score`/`hits`/reason are byte-identical. Both variants green; the final one re-run through (4), (5) and both mutations.
7. **CI legs on the final diff (staged)**: drift-check ✓, token-lint ✓, build-checks ✓.
8. **Citations**: every `file:line` above re-read on `origin/main`. `recognise.mjs` R2 `:26`, R3 `:42`, `kind-fit` `:300/306`, `named` `:403`, `top` `:410`, outcomes `:414-415`; build-checks `at`/`flat` `:13987/13989`, `FIG` `:14493`, 40.29 `:14725`, `group("import-chain"` `:14772`; `gates.md:72`.
9. **Landed claims**: no `admitted`/provenance field in `vocabulary.json` (every `status` is `"shipped"`); `system/templates.admitted.mjs` exists (#313/#315) but the matcher never reads it, by design (pure, vocab is an argument). `#315` CLOSED; `#493` referenced by #316's plan as a constraint.
10. **Known traps carried**: shared VOCAB mutation (task 3 GOTCHA); `.mjs` probe files parked as `.txt` (memory "drift-check syntax-checks parked .mjs"); three prose copies (memory "gate prose has three copies"); loc-summary — `import/` and `tooling/` are in no group (`agent-layer/gen-loc-summary.mjs` `GROUPS`), so no cascade and no VR baseline churn.

### Why not option 2
Reading the vocabulary in groups 40/46 would make the gates agree with a wrong verdict: "Text block"
would read `top-bar` — a header — for a frame of two texts, and every downstream view would show that.
It would also still need group 46's Jev run re-recorded (paid), because the set of unnamed nodes would change.

## AMENDMENTS

