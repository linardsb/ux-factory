# Feature: as-is ground truth in the discovery run package (#486)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

A new generated file, `as-is.md`, beside `prd.md` in a discovery run package. It is the **as-is record**: how the process ran once, in the words of the person who ran it, reconstructed from **one named past case**. The record contains facts only; wants belong elsewhere. It is produced by a new pure module, `discovery/as-is.mjs`. That module folds the run's latest `banked` answer to the bank question that already asks for a named past case, `s2-last-time-show-me` ("What did you do the last time this happened? Show me the file, the thread, the tab."), splits it into sentences, and **flags every sentence phrased as a want or in the conditional without dropping any**. The page names the five things to read the case for (triggers, steps, people, information needed, hand-offs). It does not sort sentences into them, because sorting prose is a judgement and this is a fold.

The owner decided these two points on 2026-09-29:
1. The content comes from the existing answer. No new bank questions.
2. The record does not ship in the handoff pack in this ticket.

## User Story

As the owner (and whoever builds next from a discovery run)
I want a record of how the process ran the last time it happened, in the words of the person who ran it, with every wish or hypothetical visibly flagged
So that the builder gets ground truth separately from the PRD and the prototype, which are the product concept and not the truth

## Problem Statement

Ryan Singer separates three artifacts: (1) the as-is business logic, reconstructed from concrete past cases, facts only; (2) the product concept; (3) the engineering. A run package today carries only (2), as `prd.md`. The issue names `s1-how-addressed-today` (`discovery/bank.mjs:139`) as the only question touching (1). That question asks for shortcomings, which invites wants.

Pre-flight found that the bank already holds the right question. `s2-last-time-show-me` (`discovery/bank.mjs:192-199`) asks for one past instance. Its own `weakAnswer` note is the want rule: "any sentence in the conditional". `discovery/allergen-matrix-1` answered it with a named case (a16: "The last time was a Tuesday in March at site two…"). No file projects that answer on its own, and no check flags a want or hypothetical inside it.

## Solution Statement

- `discovery/as-is.mjs` is a sibling of `prd-projection.mjs` and `proposals.mjs`, never their extension. It has two halves in `proposals.mjs`'s split.
  - **Pure core:** `CASE_QUESTION`, `WANT_RULES`, `splitSentences`, `flagSentence`, `caseOf`, `projectAsIs`.
  - **Thin filesystem shell:** `writeAsIs` (always overwrites, the `proposals.md` rule, since nothing hand-edits this file) and a CLI guard.
  - It imports `readPackage`, `blockquote` and `fold` from `prd-projection.mjs` in one direction only. It never imports `ops.mjs`, so it is a projection and not a verb, and takes no op-verb lock (AC #3).
- `discovery/allergen-matrix-1/as-is.md` is committed (AC #1).
- A read-only portal route, `GET /api/discovery/as-is.md`, plus a drawer button "Download as-is". This is the `/api/discovery/prd` precedent: the owner prefers UI, and the route writes nothing.
- Build-checks **group 48 "as-is"** covers the module, the detector with a positive control per rule, the real-data controls, the empty states, the committed file's bytes and the route pin (AC #2, AC #4). The group count moves 47 → 48 in four places.

## Out of Scope / Non-Goals

- **No new bank questions**, including per-element questions for triggers, steps, people, information and hand-offs (owner, 2026-09-29). `QUESTIONS`, `DEPTHS`, `MODULES`, `FULL_DISCOVERY_BUDGET` and whole-bank stay untouched, so group 28 and the pre-registered compositions (#291/#292) do not move.
- **No handoff-pack change** (owner, 2026-09-29). `agent-layer/gen-handoff.mjs` reads no discovery package (observed: `grep -i discovery` returns nothing). The flow-to-as-is traceability half stays on #314.
- **No sorting of sentences into the five elements.** That would be agent output and, under the honesty contract, needs a real run.
- **No change to `prd-projection.mjs`, `ops.mjs`, `proposals.mjs`, or `prd.md` of any package.** Case 34.5b's filename pin (`prd-projection.mjs` reaches exactly `answers.jsonl, prd.md, run.json, screen.jsonl, transcript.jsonl`) must stay green unmodified.
- **No `s1-how-addressed-today` or `s6-process-as-it-runs` in the record.** s1 is the want-inviting question the ticket exists to route around. s6 is the process in general, not the case. The record is the case only.
- **No committed `as-is.md` for any other package.** Other packages are exercised in memory by group 48.
- **No write route, and no regeneration on session close.** No HTTP request writes into a package for this file (case 21's rule, extended).

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium (one pure module ~220 lines, one gate group ~220 lines, a route and a button, docs)
**Primary Systems Affected**: `discovery/` (new module + one committed file), `tooling/build-checks.mjs` (group 48), `portal/server.mjs` + `portal/public/{index.html,portal.js}` (read-only download), docs (`discovery/README.md`, `.claude/references/gates.md`, `CLAUDE.md`)
**Dependencies**: none new. Node built-ins only.

## Related Work

**Implements**: #486  ·  **Epic**: parent #295 (`docs/epics/canvas-design-import.prd.md`). The run package it extends is epic #279's (`docs/epics/discovery-partner.architecture.md` §The run package, lines 180–206).

**Back-references**:
- #359 (`discovery/proposals.mjs`): the sibling-fold precedent. One-way import of containment helpers, always-overwrite writer, byte-compared committed file (case 34.11).
- #290 (`discovery/prd-projection.mjs`): `readPackage`, `blockquote`, `fold`, the no-clock rule, the CLI guard shape.
- #338 F1 (`portal/server.mjs` `/api/discovery/prd`): the read-only download route + drawer button precedent.
- #289 (`ops.mjs` `auditExchanges`): "a pure read is not a verb", the AC #3 basis.

**Forward-references**:
- #314 (handoff pack extended): whether `as-is.md` ships in the pack, and the flow-to-as-is traceability.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

All line numbers are **origin/main at `f0bc8a5`**. The primary working tree is on another branch about 296 files behind main, so never read these from it.

- `discovery/proposals.mjs` (lines 1–30 header; 70–80 imports; 536–585 `readProposalPackage` / `writeProposalsMd` / CLI guard). Why: the module to MIRROR. It is a sibling header, a one-direction import, always-overwrite and the CLI.
- `discovery/prd-projection.mjs`:
  - line 101 `fold`
  - line 128 `blockquote`
  - line 882 `readJsonl` (an absent file reads as `[]`)
  - lines 900–923 `readPackage` (returns `{ run, answers, ops, screen }`)
  - lines 926–935 `writePrd` (the refuse-to-overwrite you must NOT copy)
  - lines 945–963 CLI guard

  Why: the helpers you import and the CLI shape.
- `discovery/ops.mjs` lines 53–66 and 196–214 (`auditExchanges`). Why: the "A PURE READ IS NOT A VERB" text you cite for AC #3, and the style of a total-over-junk read of `answers`.
- `discovery/bank.mjs` lines 192–199 (`s2-last-time-show-me`) and `questionById` (~line 1063). Why: the anchor question and its `weakAnswer`, which is the detector's cited rule.
- `discovery/README.md`:
  - lines 65–113: the `## Files` tree, where `as-is.mjs` and `as-is.md` get added
  - lines 115–122: who-writes-what
  - lines 505–577: §Feature proposals, the section to mirror for a new §The as-is record
- `tooling/build-checks.mjs`:
  - lines 292–306: imports of the discovery modules, where the new import goes
  - lines 323–341: `ok` / `group`
  - lines 7598–7616: case 21, the `/api/discovery/prd` source pin to mirror for the new route
  - lines 10731–10752: 34.5b, the decomment + one-direction pin to mirror
  - lines 10975–11009: 34.11, the committed-artefact byte compare to mirror
  - lines 9981–10001: 32.6, the corpus loop shape
  - lines 15749–15780: group 47's banner and block-local helpers (`threw`, `decomment`, `gitSnap`) to mirror
  - lines 16222–16230: the file tail; group 48's block goes after line 16224's `}`, and the ✓ line at 16230 says "47"
- `tooling/drift-check.mjs` lines 183–206 (`checkGroupCount`). Why: the four count claims that must all read 48.
- `portal/server.mjs` lines 20–26 (discovery imports) and 248–292 (`/api/discovery/prd` and `/api/discovery/proposals.md` routes). Why: the route to MIRROR.
- `portal/public/index.html` lines 261–266 and `portal/public/portal.js` lines 1560–1584 (the `#discovery-prd` handler). Why: the button + handler to MIRROR.
- `.claude/references/gates.md` line 11 (count heading), line 57 (Group 34 entry style) and line 86 (Group 47, the last entry). Why: the group 48 entry goes after line 86.
- `CLAUDE.md` lines 124–125 (the `discovery/` map rows), 144 and 226 (the group count). Why: index rows and count claims.

### New Files to Create

- `discovery/as-is.mjs`: the pure fold + thin shell + CLI.
- `discovery/allergen-matrix-1/as-is.md`: GENERATED by `node discovery/as-is.mjs allergen-matrix-1`, committed (AC #1).

### Relevant Documentation

- Ryan Singer's post on what to define before hiring a developer is the source idea, cited in #486. The issue carries no URL, so the module header cites "Ryan Singer, via #486" (see Q1).
- `discovery/README.md` §Feature proposals (505–577): the vocabulary for "a second fold beside prd.md".

### Patterns to Follow

**The sibling header** (`discovery/proposals.mjs:6-10`):
```js
// It is prd-projection.mjs's SIBLING, not its extension, and the separation is the ticket. …
// So a proposal sits BESIDE the record and never inside it: two modules, one importing three
// containment helpers from the other in ONE direction, and case 34.5 asserts prd-projection.mjs never
// names "proposals" at all.
```

**The one-direction import** (`discovery/proposals.mjs:70-74`):
```js
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { questionById } from "./bank.mjs";
import { OPS, PARAMS } from "./ops.mjs";            // as-is.mjs does NOT import ops.mjs
import { blockquote, cell, fold, readPackage } from "./prd-projection.mjs";
```

**Always-overwrite writer** (`discovery/proposals.mjs:552-557`):
```js
export function writeProposalsMd(root) {
  const pkg = readProposalPackage(root);
  const md = projectProposals(pkg);
  const path = join(root, "proposals.md");
  writeFileSync(path, md);
  return { path, bytes: Buffer.byteLength(md, "utf8"), wrote: true, slug: pkg.run.slug, proposals: foldProposals(pkg.proposals).length };
}
```

**CLI guard**: copy `discovery/proposals.mjs:561-585` verbatim in shape. Keep `pathToFileURL`, because the repo path contains a space. Keep the `--root`/slug refusals. Use the usage string `node discovery/as-is.mjs <slug> [--stdout]  |  --root <dir> [--stdout]` and the ✓ line `as-is ✓  <slug> → case <ref|none>, <n> sentence(s), <k> flagged (discovery/<slug>/as-is.md)`.

**The read-only route** (`portal/server.mjs`, `/api/discovery/proposals.md`):
```js
if (p === '/api/discovery/proposals.md' && req.method === 'GET') {
  const slug = url.searchParams.get('slug');
  const provenance = url.searchParams.get('provenance');
  const root = resolveRunRoot({ provenance, slug });
  assertProvenanceRoot(provenance, root);
  const md = projectProposals(readProposalPackage(root));
  res.writeHead(200, {
    'content-type': 'text/markdown; charset=utf-8',
    'content-disposition': `attachment; filename="${slug}-proposals.md"`,
  });
  return res.end(md);
}
```

**Errors:** plain `Error` whose message names the path. Prefix with `as-is: `, as `proposals.mjs` does with `bad = (msg) => { throw new Error(\`proposals: ${msg}\`) }`.

**Human text reaches the page ONLY through `blockquote()`** (`prd-projection.mjs:128`'s header comment). Table cells carry only numbers, kinds and rule ids, never answer text.

---

## IMPLEMENTATION PLAN

### Phase 0: Branch

Work in a fresh worktree off `origin/main`. The primary tree is shared by parallel sessions and is on an unrelated branch.

### Phase 1: The pure module + committed file

`discovery/as-is.mjs` and `discovery/allergen-matrix-1/as-is.md`.

### Phase 2: The gate

**Depends on:** Phase 1.

Group 48 in `build-checks.mjs`, plus the four group-count claims.

### Phase 3: The portal download

**Depends on:** Phase 1. **Independent of:** Phase 2, except that group 48's route pin (48.8) needs this phase landed before the group is green.

### Phase 4: Docs

**Depends on:** Phases 1–3.

`discovery/README.md`, `gates.md` group 48 entry, `CLAUDE.md` map rows.

---

## STEP-BY-STEP TASKS

### Task 0: CREATE the worktree

- **IMPLEMENT**:
  ```bash
  cd /Users/Berzins/Desktop/Linards_current/ux-factory
  git fetch origin
  git worktree add ../wt-486 -b feat/as-is-ground-truth-486 origin/main
  cd ../wt-486
  (cd tooling/icons && npm ci) && (cd tooling/style-dictionary && npm ci)
  cp ../ux-factory/.claude/plans/as-is-ground-truth-486.{md,html} .claude/plans/
  ```
- **GOTCHA**:
  - A fresh worktree without `tooling/icons/node_modules` reds group 41.7. Observed: `genIcons({check:true}) THREW — … tooling/icons/node_modules/@phosphor-icons/core/assets/regular is missing`.
  - A fresh worktree without `tooling/style-dictionary/node_modules` fails drift-check (observed).
  - Both are environmental, not regressions.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1`. Observed on a clean `origin/main` worktree with both `npm ci`s: `build ✓  all 47 groups pass`.
- **SATISFIES**: none (setup). **REGENERATES**: none.

### Task 1: CREATE `discovery/as-is.mjs`

- **IMPLEMENT**:

  **Header.** Cite `#486` and Singer via the issue. Name it prd-projection.mjs's and proposals.mjs's **sibling, not their extension**. State these points:
  - It folds ONE answer line and `run.json`, and nothing else.
  - **"A PROJECTION IS NOT A VERB."** It imports nothing from `ops.mjs` and adds, renames or reinterprets nothing in `OPS`/`PARAMS`, so it takes no op-verb lock (ops.mjs:53-66, AC #3).
  - It carries the **CANNOT REACH** clause, word for word the one gates.md and the `group()` string carry (see Task 4). The detector is lexical. The page cannot tell whether an answer names a real instance (graded-opus-a a10 is habitual prose and passes as a case), and it cannot sort sentences into the five elements.

  **Pure core (no fs, no clock):**
  - `export const CASE_QUESTION = "s2-last-time-show-me";`
  - `export const WANT_RULES`: frozen, each rule frozen. These are the seven rules below, in this order, with these ids. Their counts over the real answers were measured in pre-flight (see NOTES).
    ```js
    { id: "want-verb",     kind: "want",        re: /\b(?:wants?|wish(?:es)?|hope|hopes|ideally|if only)\b/i },
    { id: "would-like",    kind: "want",        re: /\b(?:I|we|they|you)(?:'d| would) (?:like|love|prefer)\b/i },
    { id: "should",        kind: "want",        re: /\bshould\b/i },
    { id: "need-present",  kind: "want",        re: /\b(?:I|we|they|you) need\b|\bneeds? (?:a way|to be able)\b/i },
    { id: "would-be-nice", kind: "want",        re: /\bit would be (?:nice|good|great|better|easier)\b/i },
    { id: "modal",         kind: "conditional", re: /\b(?:would|could|might|will)(?:n't)?\b/i },
    { id: "expect",        kind: "conditional", re: /\bI expect\b/i },
    ```
    Each rule gets a one-line reason comment. The header states the rule's source: the bank's `weakAnswer` for `CASE_QUESTION`, "any sentence in the conditional", widened to a want's grammar. Use `questionById(CASE_QUESTION).weakAnswer` in the page's "Flagged lines" prose rather than retyping it.
  - `export function splitSentences(text)`:
    ```js
    String(text).split(/\r\n|\r|\n/).join("\n").split(/\n\s*\n/)
      .flatMap((p) => p.replace(/\s+/g, " ").trim().split(/(?<=[.!?]["”)]?)\s+(?=["“(]?[A-Z0-9])/))
      .filter(Boolean)
    ```
    Total: a non-string is stringified, and `""` and whitespace give `[]`.
  - `export function flagSentence(s)`: returns the ids of every rule whose `re` tests true, in `WANT_RULES` order (`[]` for none).
  - `export function caseOf(answers)`. Total over junk, like `auditExchanges`: a non-array reads as `[]`. It reads only lines where `kind === "banked"` and `question_id === CASE_QUESTION`, and returns:
    ```js
    { question: questionById(CASE_QUESTION), anchor: <latest such line or null>, earlier: [<refs of the others, file order>], sentences: [{ n, text, flags }] }
    ```
    "Latest" means **last in file order**, not the highest ref, because `answers.jsonl` is append-only.
  - `export function projectAsIs(pkg)`: takes `{ run, answers }`, ignores extra keys, and returns the markdown string below. It is **deterministic, with no clock**: the only ISO stamp on the page is `run.startedAt`.

  **The page:**
  ```
  # <slug> — as-is, projected from a discovery run

  > **The answer to the question that asks for one named past case — how the process ran the last time, in the person's own words.** This page cannot tell whether the answer names a real instance; read it for that. Folded from [`discovery/<slug>`](./): the latest `banked` line in `answers.jsonl` on `s2-last-time-show-me`, and `run.json`'s head — nothing else. Generated by `discovery/as-is.mjs` (#486). It is ground truth for whoever builds next, kept apart from `prd.md` and the prototype, because the prototype is not the truth. A sentence phrased as a want or in the conditional is **flagged and kept, never dropped**. **Regenerated by the CLI, so a hand edit is lost.**

  **Run** — `<slug>` · <provenance> (<label>) · depth <depth> · started <startedAt>

  ## How to read it

  Read the case for five things: what triggered it, the steps taken, the people involved, the information each step needed, and where the work changed hands. This page does not sort the sentences into those five: sorting prose is a judgement, and this page is a fold.

  ## The case

  `<ref>` · `s2-last-time-show-me` — <question text>

  [Earlier answers to the same question, superseded by this one: `a3` · `a9`.]   ← only when earlier is non-empty

  **1**

  > <sentence 1>

  **8 · flagged: conditional (modal)**

  > <sentence 8>

  ## Flagged lines

  <k> of <m> sentence(s) <is|are> flagged. The rule is the bank's weak-answer note for this question — "<weakAnswer's first sentence>" — widened to the grammar of a want. Flagged sentences stay in the case above.

  | Sentence | Kind | Rules |
  |---|---|---|
  | 8 | conditional | modal |
  ```

  The empty case replaces `## The case` body with: `_No past case in this run: \`s2-last-time-show-me\` was not answered (depth <depth>). The as-is record is reconstructed from one named past case, so this run has none._`. `## Flagged lines` body becomes `_Nothing to flag._`.

  A mixed flag's kind reads `want + conditional` when both kinds fire. Its "Rules" cell lists ids joined by ` + `.

  Every run field goes through `fold()`, and a missing field renders `(absent)` (the `field` idiom `proposals.mjs` copies). Answer text goes through `blockquote()` ONLY.

  **Thin shell:**
  - `export function writeAsIs(root)`: reads the package with `readPackage(root)`, writes `<root>/as-is.md` and **always overwrites**. The header states the reason: nothing hand-edits this file, and the guard is 48.7's byte compare. That is the `writeProposalsMd` rule, NOT `writePrd`'s. It returns `{ path, bytes, wrote: true, slug, ref, sentences, flagged }`.
  - The CLI guard follows the Patterns section.
- **PATTERN**: `discovery/proposals.mjs:1-30, 70-80, 552-585`; `discovery/ops.mjs:196-214` (total over junk).
- **IMPORTS**: exactly these specifiers:
  - `node:fs` (`writeFileSync`)
  - `node:path` (`dirname`, `join`, `resolve`)
  - `node:url` (`fileURLToPath`, `pathToFileURL`)
  - `./bank.mjs` (`questionById`)
  - `./prd-projection.mjs` (`blockquote`, `fold`, `readPackage`)

  `ROOT` is `resolve(dirname(fileURLToPath(import.meta.url)), "..")`, copied from `proposals.mjs`.
- **GOTCHA**:
  - Do NOT touch `prd-projection.mjs`. Case 34.5b pins its decommented source's `join(root, "…")` filenames to exactly five, and 48.1 will pin that it never names `as-is` / `asIs`.
  - `readPackage` also parses `transcript.jsonl` and **throws on a line outside text · op · denied**. This is fine for every committed package, since 32.6 already `readPackage`s all 12 (observed green). Do not add a second reader.
  - The splitter must keep `7.40` and `"Allergen matrix v7 FINAL (2).xlsx"` inside their sentences. Observed: a16 → 8 sentences.
  - `\bwants?\b` deliberately misses `wanted` (past tense is a fact of the case). Observed: "The head chef wanted a new sheet in March." → `[]`.
  - Memory `drift-check-syntax-checks-parked-mjs`: CI `node --check`s every tracked `.mjs`, so the file must parse under Node 20. The lookbehind is fine: prototype observed on v20.20.2.
- **VALIDATE**:
  - `node --check discovery/as-is.mjs && node discovery/as-is.mjs allergen-matrix-1 --stdout | head -30`
  - `node discovery/as-is.mjs faster-payment --stdout | grep -c "No past case"` (expected: `1`; faster-payment's regulated vector never asks `s2-last-time-show-me`, observed: 0 lines on it)
- **SATISFIES**: AC #1, AC #2, AC #3.
- **REGENERATES**: none. `discovery/` matches no loc-summary group: `agent-layer/gen-loc-summary.mjs:22-26` covers runtime, pages and generators, and `total` is the sum of the groups (observed).

### Task 2: CREATE `discovery/allergen-matrix-1/as-is.md`

- **IMPLEMENT**: `node discovery/as-is.mjs allergen-matrix-1`. Commit the output unedited.
- **GOTCHA**: never hand-edit it. The honesty contract does not bite here because the file is a fold, but 48.7's byte compare does.
- **VALIDATE**: `node discovery/as-is.mjs allergen-matrix-1`. Expected: `as-is ✓  allergen-matrix-1 → case a16, 8 sentence(s), 1 flagged (discovery/allergen-matrix-1/as-is.md)`. Then `grep -c "flagged: conditional (modal)" discovery/allergen-matrix-1/as-is.md` (expected `1`: the "…which will scroll off the group in a fortnight." sentence).
- **SATISFIES**: AC #1. **REGENERATES**: this file is itself generated. Regen command as above.

### Task 3: ADD build-checks group 48 "as-is"

- **IMPLEMENT**:
  - Import `{ CASE_QUESTION, caseOf, flagSentence, projectAsIs, splitSentences, WANT_RULES }` from `../discovery/as-is.mjs` beside the proposals import (~line 306), with a comment in that block's voice. Do NOT import `writeAsIs`.
  - Add a group-47-style banner (`// ====…` then `// Group 48 — the as-is record (#486): …` with the CANNOT REACH clause) and a top-level `{ … }` block after the group-47 block's closing `}` (line 16224), before `if (failures)`.
  - Block-local helpers copied from group 47 (15757–15780): `threw`, `decomment`, and a `gitSnap` over `discovery portal/lib portal/public`.

  Cases (each message prefixed `48.N:`):

  **48.1 Source pin, one direction.**
  - Parse `as-is.mjs`'s import specifiers with `/^\s*import\b[^\n]*from\s+["']([^"']+)["']/gm`. They must equal exactly `["./bank.mjs","./prd-projection.mjs","node:fs","node:path","node:url"]` (sorted, deduped).
  - Decommented `prd-projection.mjs` must not match `/as-is|asIs|AS_IS/`. Pre-flight: `git show origin/main:discovery/prd-projection.mjs | grep -niE "as-is|asIs|AS_IS|as is"` returns nothing, so the pin is green on the first run. If a later edit adds the English phrase, narrow the pattern to `/as-is\.mjs|asIs|AS_IS/`.
  - Decommented `as-is.mjs` must not match `/\bOPS\b|\bPARAMS\b|applyOps?\b|ops\.mjs/`. This is AC #3's structural half.
  - Positive control: the specifier regex over `import { x } from "./ops.mjs";` yields `./ops.mjs`.

  **48.2 The anchor.**
  - `CASE_QUESTION === "s2-last-time-show-me"`.
  - `questionById(CASE_QUESTION)` is non-null.
  - Its `weakAnswer` starts with `"any sentence in the conditional"`. The detector cites it, so a reworded rubric must re-open the rules.

  **48.3 Splitter.**
  - allergen-matrix-1 a16's real text → exactly 8 sentences. One of them includes `7.40` and one includes `v7 FINAL (2).xlsx`.
  - later-not-never-1 a19 (blank-line paragraphs) → exactly 11.
  - `"A.\r\n\r\nB is here. C 7.40 done. D v7 FINAL (2).xlsx is it."` → 4.
  - `""` and `"   "` → `[]`.
  - `splitSentences(undefined)` does not throw.

  **48.4 Detector, a positive control per rule.** A table `{ rule id → sentence }`:
  - `want-verb`: "I wish the EPOS field were kept current."
  - `would-like`: "We'd like a way to see the matrix on a tablet."
  - `should`: "Someone should own the spec sheets."
  - `need-present`: "We need one list for all sites."
  - `would-be-nice`: "It would be nice to have a timestamp."
  - `modal`: "The photo will scroll off the group."
  - `expect`: "I expect the buyer to open Outlook."

  Check both directions:
  - `WANT_RULES.map((r) => r.id)` deep-equals the literal `["want-verb","would-like","should","need-present","would-be-nice","modal","expect"]`, so a dropped or renamed rule reds by name.
  - For every row of the control table, the id exists in `WANT_RULES` and `flagSentence(row)` includes it.

  A loop over `WANT_RULES` alone cannot fail when a rule is deleted, which is the `check-that-cannot-fail` trap. Negatives: "The sous chef posted a photo at 7.40.", "The head chef wanted a new sheet in March." and "The porter signed the note." each → `[]`. `WANT_RULES` is frozen, with every rule frozen.

  **48.5 Real-data controls.**
  - allergen-matrix-1 a16: exactly 1 flagged, sentence 8, `["modal"]`.
  - later-not-never-1 a19: the whole flag vector deep-equals the observed `{2:["modal","expect"], 3:["expect"], 4:["modal"], 6:["expect"], 7:["modal"], 8:["expect"], 9:["modal"]}` (7 of 11; sentences 1, 5, 10 and 11 unflagged).
  - Read the texts through `readPackage`, never retyped. Pin the counts; they were observed in pre-flight.

  **48.6 The projection.**
  - Over `readPackage("discovery/allergen-matrix-1")`, every one of the 8 sentences is present on the page inside a `> ` line. Flagged is kept, never dropped: this is AC #2's "not silently kept".
  - Exactly one `**8 · flagged: conditional (modal)**` line appears.
  - The `## Flagged lines` table has one data row.
  - A SYNTHETIC package `{ run, answers }`:
    - its answers are two banked `s2-last-time-show-me` lines a1, a3, plus an off-script line and a `document` line, all carrying want words;
    - it anchors on a3 and lists `a1` as earlier;
    - the off-script and document texts are absent from the page;
    - a3 = `"We'd like a way to check.\r\r## Injected"` renders no line starting `## Injected` (blockquote containment), and its sentence is flagged `want`.
  - Over `readPackage("discovery/faster-payment")`: the page contains `No past case in this run` and `_Nothing to flag._`.
  - `caseOf("junk")`, `caseOf(null)` and `caseOf([null, 3])` answer `anchor: null` without throwing.
  - Determinism: two projections are equal and the input is unmutated (JSON snapshot).
  - The only ISO stamps on the page are in `{ run.startedAt }`, and at least one is present: a floor so the loop cannot be empty.

  **48.7 Committed artefacts.**
  - `discovery/allergen-matrix-1/as-is.md` EXISTS (AC #1: an unconditional `ok`, NOT gated on existsSync).
  - For every package dir that carries an `as-is.md` (the 32.6 loop shape, `isDirectory` filter, `run.json` required), the file equals `projectAsIs(readPackage(dir))` byte for byte. The message names `node discovery/as-is.mjs <slug>`.
  - Assert the swept count ≥ 1.
  - Mutation control: `want !== want + "x"`.

  **48.8 The route, as SOURCE pins.** `server.mjs` imports the SDK through `chat.mjs`, so CI cannot import it; case 21 reads it as text the same way.
  - `server.mjs` has an import line naming `projectAsIs` from `../discovery/as-is.mjs`.
  - No import line or call names `writeAsIs`, using case 21's regex shape: `!/^\s*import\b[^\n]*\bwriteAsIs\b/m && !/\bwriteAsIs\s*\(/`.
  - The `'/api/discovery/as-is.md'` route slice (900 chars) holds `resolveRunRoot(`, `assertProvenanceRoot(` and `attachment; filename="${slug}-as-is.md"`.
  - `portal/public/index.html` holds `id="discovery-as-is"`.
  - `portal/public/portal.js` holds `/api/discovery/as-is.md?slug=`.
  - Each pin has `indexOf !== -1` as its positive control.

  **48.9 Nothing tracked moved.** `gitSnap()` before and after the group is equal.

  Close with `group("as-is", \`discovery/as-is.mjs (#486): …\`)`. The detail string states what each case proved and ends with the CANNOT REACH clause (Task 4 gives the words).

  Then update the four count claims, **47 → 48**:
  - `tooling/build-checks.mjs:16230`: `"\nbuild ✓  all 48 groups pass"`
  - `CLAUDE.md:144`: `48 PURE groups`
  - `CLAUDE.md:226`: `build-checks' 48 groups`
  - `.claude/references/gates.md:11`: `48 pure groups`
- **PATTERN**:
  - `tooling/build-checks.mjs` 10731–10752 (34.5b decomment + direction)
  - 10997–11008 (34.11 committed compare)
  - 9981–10001 (32.6 loop)
  - 7602–7616 (case 21 route pin)
  - 15749–15787 (group 47 banner + helpers + gitSnap)
- **GOTCHA**:
  - `group()` names must be unique. drift-check's `checkGroupCount` counts DISTINCT `group("…"` names, with `DUPES = ["parenting"]` (drift-check.mjs:185-187). "as-is" is unused (grep).
  - The header prose "Thirty-six groups" (build-checks.mjs:4) is a known ungated stale copy (its own lines 5–7 say so). Leave it; Surgical Changes.
  - In 48.8 the needle `attachment; filename="${slug}-as-is.md"` must be a PLAIN double-quoted JS string (`'attachment; filename="${slug}-as-is.md"'`). Inside backticks it interpolates `slug` and matches nothing, or throws a ReferenceError.
  - Memory `check-that-cannot-fail`: run the function, don't grep it. Only 48.8 reads text, and it says so in its comment, as 47.14 does.
  - Memory `gate-prose-has-three-copies`: the CANNOT REACH clause lives in the module header, the `group()` string and gates.md. Write it once and paste it into all three.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^build (as-is|✓|✗)"`. Expected: `build as-is          ✓  …` and `build ✓  all 48 groups pass`. Then `node tooling/drift-check.mjs 2>&1 | tail -1`. Expected: `drift-check     ✓  … group-count`.
- **REDDENS** (drive each, observe the named message, revert):
  1. 48.1: add `import { OPS } from "./ops.mjs";` to `as-is.mjs` → `48.1: … import specifiers …` (and the OPS pattern).
  2. 48.1: add a comment-free `const x = "as-is";` to `prd-projection.mjs` → `48.1: … prd-projection.mjs names as-is`.
  3. 48.4: delete the `should` rule from `WANT_RULES`. Expected: `48.4: WANT_RULES ids are […] — a rule was added, dropped or renamed without the literal pin` AND `48.4: control row "should" names no rule`. Then restore the rule and break its regex (`/\bshoulld\b/i`). Expected: `48.4: flagSentence did not fire should on its control`.
  4. 48.5: change `modal`'s regex to drop `will` → `48.5: allergen-matrix-1 a16 flagged 0, expected 1`.
  5. 48.6: make `projectAsIs` skip flagged sentences in `## The case` → `48.6: sentence 8 … not on the page`.
  6. 48.7: append a space to `discovery/allergen-matrix-1/as-is.md` → `48.7: … is not the projection's bytes — regenerate with node discovery/as-is.mjs allergen-matrix-1`. Then delete the file → `48.7: … does not exist`.
  7. 48.8: rename the route string to `/api/discovery/asis.md` → `48.8: … route is not where this pin expects`.
  8. Group count: before editing the four claims, drift-check reports `group-count drift: tooling/build-checks.mjs: says 47 groups, build-checks defines 48; …`.
- **SATISFIES**: AC #2 (48.4–48.6), AC #3 (48.1), AC #4 (48.1–48.9).
- **REGENERATES**: none generated. The count claims are prose that drift-check verifies.

### Task 4: ADD the read-only route + drawer button

- **IMPLEMENT**:
  - **`portal/server.mjs`:**
    - After the proposals import (line 26), add `import { projectAsIs } from '../discovery/as-is.mjs';` with a one-line comment: the as-is fold (#486). Pure; the route writes nothing, and `writeAsIs` is deliberately not imported.
    - After the `/api/discovery/proposals.md` route (ends ~line 292), add a `GET /api/discovery/as-is.md` route. It is the proposals.md route with `projectAsIs(readPackage(root))`, filename `${slug}-as-is.md` and a comment citing #338 F1's reason.
  - **`portal/public/index.html`:** after the `#discovery-prd` button (line 262), add:
    ```html
    <!-- the as-is record without a terminal (#486): one named past case, flagged, never written -->
    <button class="btn btn-secondary" type="button" id="discovery-as-is">Download as-is</button>
    ```
  - **`portal/public/portal.js`:** after the `#discovery-prd` handler (ends ~line 1584), add a `#discovery-as-is` handler. MIRROR it line for line: the fetch `/api/discovery/as-is.md?slug=…&provenance=…`, download `${slug}-as-is.md`, status `As-is projected — N lines. The package on disk is unchanged; this route only reads it.`, and error `Could not project the as-is record: …`. Leave it NOT disabled until finished, the same as the PRD button: an open session's case answer is still a fold.
- **PATTERN**: `portal/server.mjs:283-292`; `portal/public/portal.js:1566-1584`; `portal/public/index.html:261-262`.
- **GOTCHA**:
  - portal.js and index.html are NOT shipped pages. No VR baseline moves, and they need no loc-summary change. Portal pages match no loc group.
  - Memory `portal-smoke-port-scoped-kill`: boot on an OS-assigned free port and kill only `$!`. Never `pkill` or kill by port.
- **VALIDATE** (from the worktree; portal deps: `cd portal && npm ci` once):
  ```bash
  PORTNUM=$(node -e 'const s=require("net").createServer().listen(0,()=>{console.log(s.address().port);s.close()})')
  cd portal && PORT=$PORTNUM node server.mjs > /tmp/uxf-486-portal.log 2>&1 & PID=$!; sleep 2
  curl -s localhost:$PORTNUM/api/health
  curl -s "localhost:$PORTNUM/api/discovery/as-is.md?slug=allergen-matrix-1&provenance=fictional" | diff - ../discovery/allergen-matrix-1/as-is.md && echo SAME
  curl -s -o /dev/null -w '%{http_code}\n' "localhost:$PORTNUM/api/discovery/as-is.md?slug=../x&provenance=fictional"
  kill $PID
  ```
  - Expected: health JSON, `SAME`, and a 4xx on the traversal slug (`assertRunSlug` refuses it).
  - `PORT` comes from `process.env.PORT || 4747` (`portal/lib/env.mjs:26`) and is also the origin guard's port (`server.mjs:85`), so `PORT=0` would print `localhost:0` and mis-set the guard. Pick a real free port, as above.
- **SATISFIES**: owner-prefers-UI (memory `owner-prefers-ui-over-cli`). No AC requires it, and 48.8 pins it.
- **REGENERATES**: none.

### Task 5: UPDATE docs

- **IMPLEMENT**:
  - **`discovery/README.md`:**
    - In the `## Files` tree after `claims.mjs`, add `as-is.mjs  answers.jsonl's named past case → as-is.md, a THIRD pure fold beside prd.md: the case's sentences with every want or conditional flagged and kept (#486)`.
    - Under `<slug>/` after `proposals.md`, add `as-is.md  GENERATED by the as-is fold from the case answer (s2-last-time-show-me); regenerated by the CLI, never hand-edited (#486)`.
    - In the who-writes-what paragraph (lines 115–122), add one sentence: the as-is CLI writes `as-is.md` and nothing else; the portal route only reads.
    - Add a section `## The as-is record (#486)` after §Feature proposals (~line 577), 20–30 lines, covering:
      - why: Singer's three artifacts, and ground truth kept apart from the concept;
      - the source: one question, the latest banked line, and why s1 and s6 are left out;
      - the flag rule and its cited source;
      - the empty state;
      - that it is a projection, not a verb, so it takes no op-verb lock;
      - that it is not in the handoff pack (#314);
      - the CLI and the route.
  - **`.claude/references/gates.md`:** after the Group 47 entry (line 86), add `**Group 48 — the as-is record** (#486, \`discovery/as-is.mjs\`): …`. It covers what 48.1–48.9 prove and the same **CANNOT REACH** clause:
    > whether an answer names a REAL instance (a habitual answer such as graded-opus-a a10 passes as a case — the owner reads that), the five elements (the page names them as the reading lens and sorts nothing), a want phrased without any of the seven rules' words, and the drawer button's click (portal.js has no CI runner; 48.8 is a source pin)
  - **`CLAUDE.md`:**
    - In the line 124 `discovery/` row, after the `claims.mjs` phrase, add ` · as-is.mjs: the run's named past case → as-is.md, a pure fold over one answer with wants flagged (no ops, no clock, #486)`.
    - In line 125, add ` · as-is.md` after `proposals.md`.
- **GOTCHA**: CLAUDE.md is an INDEX, so do not restate the invariant there. The module header is the spec.
- **VALIDATE**: `node tooling/drift-check.mjs 2>&1 | tail -1` → `drift-check     ✓ … group-count`.
- **SATISFIES**: AC #4 (docs half). **REGENERATES**: none.

### Task 6: Full gate + commit

- **VALIDATE**: all of Level 1–4 below.
- **IMPLEMENT**:
  - Stage by explicit path: `discovery/as-is.mjs discovery/allergen-matrix-1/as-is.md tooling/build-checks.mjs portal/server.mjs portal/public/index.html portal/public/portal.js discovery/README.md .claude/references/gates.md CLAUDE.md .claude/plans/as-is-ground-truth-486.md .claude/plans/as-is-ground-truth-486.html`
  - One commit: `feat(discovery): the as-is record — one named past case, wants flagged (#486)`.
  - PR body carries `Closes #486`. The plan, report and review go in the same PR (CLAUDE.md §Git).

---

## TESTING STRATEGY

This repo has no test suite. Group 48 in `tooling/build-checks.mjs` is the unit gate, and the portal curl is the integration check.

### Unit Tests
48.1–48.9 as specified in Task 3. Every case runs the function except 48.8, which is a source pin and says so.

### Integration Tests
The portal boots, `/api/health` answers, the route's bytes equal the committed file, and a traversal slug is refused.

### Edge Cases
- The question was never asked (faster-payment; every opening-set and scope-check package) → the empty state.
- The question was answered twice → latest by file order, with earlier refs listed.
- Off-script, document and junk lines are ignored. `caseOf` is total over non-arrays and null lines.
- A bare CR or `## ` inside an answer stays inside the blockquote.
- Past tense `wanted` is not flagged. `will` is flagged, even as a prediction inside a case, which is kept and marked.
- `later-not-never-1` a19 is a case-less answer that says so ("Nothing here is observed…"). The page renders it with 7 of 11 flagged. It is not committed and is exercised in memory.

### Proving the checks
Every REDDENS mutation in Task 3 is driven once and its message observed before the green is trusted. The positive controls are 48.4's per-rule table, 48.5's real counts, 48.7's `want + "x"` and 48.8's `indexOf` checks.

---

## VALIDATION COMMANDS

### Level 1: Syntax
`node --check discovery/as-is.mjs && node --check tooling/build-checks.mjs && node --check portal/server.mjs`

### Level 2: Unit gate
`node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓  all 48 groups pass`

### Level 3: CI verify job
- `node tooling/drift-check.mjs 2>&1 | tail -1` → `drift-check     ✓  … group-count`
- `node tooling/token-lint.mjs` (unaffected, run anyway)
- `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift`

### Level 4: Manual
- The Task 4 portal curl sequence.
- `node discovery/as-is.mjs allergen-matrix-1 --stdout`: read the page once. The case reads as facts, and sentence 8 is marked.

### Level 5: piv-validate
Memory `piv-skills-python-tuned`: `/piv-validate` maps to the verify job + a portal smoke. Run it.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Owner reads `discovery/allergen-matrix-1/as-is.md` and judges whether the flag set reads right (1 of 8) | owner's hand | no | #486 review comment |
| Owner clicks "Download as-is" in the drawer | owner's hand | no | none. 48.8 pins the source and the curl proves the route |

No paid runs. Nothing spends tokens.

---

## ACCEPTANCE CRITERIA

- [ ] AC #1: `discovery/allergen-matrix-1/as-is.md` is committed, generated from one named past case (a16, `s2-last-time-show-me`), and 48.7 asserts it exists and matches the projection's bytes.
- [ ] AC #2: a sentence phrased as a want is flagged and kept. 48.4 fires every rule on its own control, 48.6 proves a flagged sentence stays on the page, and 48.5 pins the real counts (1 of 8 and 7 of 11).
- [ ] AC #3: the artifact is a projection. `as-is.mjs` imports nothing from `ops.mjs` and names no `OPS`/`PARAMS` (48.1), so no op-verb-lock amendment is needed and `docs/epics/discovery-partner.prd.md` is untouched.
- [ ] AC #4: build-checks covers the new file with group 48, and the count reads 48 in all four claims (drift-check group-count ✓).
- [ ] `prd-projection.mjs`, `ops.mjs`, `bank.mjs`, `proposals.mjs` and every `prd.md` are byte-unchanged (`git diff --stat origin/main -- discovery/*.mjs` shows only `as-is.mjs`).
- [ ] The portal boots, and `/api/discovery/as-is.md` serves the committed bytes and writes nothing.

## COMPLETION CHECKLIST

- [ ] Tasks 0–6 done in order, each VALIDATE observed.
- [ ] Every REDDENS mutation driven and reverted.
- [ ] build-checks 48 ✓, drift-check ✓, token-lint ✓, loc --check ✓, portal smoke ✓.
- [ ] Report at `.claude/reports/`, review at `.claude/code-reviews/pr-<N>-review.md`, both in the PR.

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 (non-blocking):** the issue carries no URL for Singer's post, so the header cites "Ryan Singer, via #486". If the owner supplies the URL, it goes in the module header and the README section. The bank's own Singer citation (`bank.mjs:290`) is for a different piece (appetites).
- **Q2 (non-blocking):** the detector's lexical scope. `will` inside a real case ("which will scroll off the group in a fortnight") is flagged. That is a prediction, not a fact of the case, so flagging it matches the bank's rule, and the sentence is kept. If the owner reads that as noise, narrowing `modal` is a one-line change plus 48.5's pinned counts.
- **A1:** "the latest banked line" is the anchor. Re-asks append rather than rewrite, and the latest is the owner's last word.
- **A2:** the drawer button is in scope, following the owner's standing UI preference. Dropping it removes Task 4 and 48.8 and nothing else.
- **Decided (owner, 2026-09-29):** the content is the existing `s2-last-time-show-me` answer, with no new questions, and the record is not in the handoff pack.

## NOTES (open canvas)

**Why not new bank questions.**
- Each would need D7's primary-source attribution, the group 28 count edits and a place in the budget arithmetic.
- Full discovery's unfaceted list is frozen by `deriveCursor`'s last-closer rule and the #291/#292 pre-registrations, and the faceted composition caps at 29 of 31.
- A committed package answering them would need a real run the owner types.
- The one existing question already asks for the case, and its rubric is the flag rule. That is the smallest honest source.

**Why only s2, not s1 and s6.**
- s1 (`s1-how-addressed-today`) asks for shortcomings. allergen-matrix-1 a2 says "The shortcomings are the same one three times over". That is the want-inviting framing the ticket routes around.
- s6 is "the process as it actually runs", a general description, not one case. allergen-matrix-1 a3 is habitual throughout ("the waiter either reads the laminate…"), and the modal rule would false-flag its habitual `would`.
- The AC says "sourced from one named past case", and only s2 asks for one.

**Why always-overwrite.** `writePrd` refuses because `prd.md` is hand-edited (`prd-projection.mjs:926-935`). `as-is.md` is not edited: flagged lines are the owner's to judge by reading, not to delete. That makes it `proposals.md`'s rule, guarded by the byte compare.

**Pre-flight record (2026-09-29):**
- **Base.** A clean worktree at `origin/main` f0bc8a5 (the primary tree is on `fix/importer-reads-icon-name-449`, about 296 files behind).
  - `node tooling/build-checks.mjs` failed first with 41.7 (tooling/icons/node_modules missing). After `npm ci` there: `build ✓  all 47 groups pass` (observed).
  - `node tooling/drift-check.mjs` failed first on style-dictionary node_modules. After `npm ci`: `drift-check ✓ … group-count` (observed).
  - `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift` (observed).
- **Detector prototype** (scratchpad, the exact seven rules and splitter above) over real answers, observed:
  - allergen-matrix-1 a16: 8 sentences, 1 flagged, `8:modal`
  - later-not-never-1 a19: 11 sentences, 7 flagged, `2:modal+expect, 3:expect, 4:modal, 6:expect, 7:modal, 8:expect, 9:modal` (so `expect` fires on 2, 3, 6 and 8; 48.5 pins the whole vector)
  - graded-opus-a a10: 4 sentences, 1 flagged, `4:modal`

  Synthetic controls: every want rule fired on its own sentence; `It would be nice…` fires `would-be-nice + modal`; the three negatives gave `[]`; the CRLF paragraph string gave 4; `""` and `"   "` gave `[]`.
- **`s2-last-time-show-me` coverage** (observed): answered in allergen-matrix-1, graded-opus-a, graded-think-a and later-not-never-1 (one line each). It is absent from the other 8 packages, including faster-payment (regulated vector) and all opening-set and scope-check packages.
- **Landed-claim checks on origin/main** (observed):
  - no `as-is` module, route or group name exists;
  - the highest group is 47;
  - the count claims live in 4 places (drift-check.mjs:189-194);
  - group 43/44's loop at build-checks ~14769 iterates `discovery/*` with `existsSync(<pkg>/answers.jsonl)`, so a new `discovery/as-is.mjs` file is skipped safely;
  - 34.5b's filename pin reads `prd-projection.mjs` only, so a sibling module does not touch it;
  - `gen-handoff.mjs` has no discovery reads;
  - `discovery/` matches no loc group.
- **Review pass (advisor, before report):**
  - 48.4 now pins the rule-id literal, because a loop over `WANT_RULES` alone could not red on a deleted rule.
  - 48.5 pins a19's full observed vector (the first draft said `expect` fired on "3, 6 and 8" and missed 2).
  - 48.1's prd-projection pattern was grepped against origin/main, with no hits.
  - The page header no longer claims every answer is a real named case.
  - 48.8's needle must be a plain string, not a template literal.
- **What changed because of pre-flight:**
  - The anchor moved from the issue's `s1-how-addressed-today` to `s2-last-time-show-me`.
  - The npm ci steps were added to Task 0.
  - The counts in 48.3 and 48.5 are observed, not estimated.
  - The group-count cascade gained its fourth location.
  - The header's "Thirty-six groups" is recorded as the known ungated copy, left alone.

## AMENDMENTS

- **2026-09-29, implementation (plan error):** Task 4's VALIDATE expected "a 4xx on the traversal slug". Observed: `500` with `{"error":"discovery: \"../x\" is not a usable run slug …"}`. `assertRunSlug` throws a plain `Error` and the one catch-all at the server boundary answers 500 (CLAUDE.md §Errors); `/api/discovery/prd` answers the identical 500 for the same slug (observed). The refusal is the requirement, not the status code; no change made.
- **2026-09-29, implementation (plan error):** Task 1 said a missing run field renders `(absent)` via "the `field` idiom `proposals.mjs` copies". That idiom renders `—`, not `(absent)` (`proposals.mjs:82-87`). The copy follows the idiom, so an absent field renders `—`.
- **2026-09-29, implementation:** REDDENS 8 named three claims, not four, because Task 3 had already moved build-checks' own ✓ line to 48 before drift-check ran. The three it named were CLAUDE.md ×2 and gates.md.
