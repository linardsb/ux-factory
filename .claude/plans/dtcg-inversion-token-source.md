# Feature: DTCG inversion — tokens.source.json becomes the token source of truth

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Invert the token flow. Today the CSS files are canon and `agent-layer/gen-tokens.mjs` *projects* them into DTCG JSON. After this ticket, `system/tokens.source.json` (DTCG, W3C design-token format) is the single source of truth, and a new generator emits both CSS layers from it:

- `system/tokens.contract.css` — layer 1: every semantic token components may use, with neutral literal fallbacks
- `system/tokens.neutral.css` — layer 2: the neutral pack (primitives tier + semantic map tier binding contract tokens to primitives via `var()` references)

Both CSS files become generated, committed artifacts (deploy = commit the artifacts — the repo is inspectable proof). The stale "GENERATED MIRROR — do not edit here … saulera-client-starter" headers in `tokens.contract.css` and `site.js` are retired: canon lives in THIS repo (architecture §Data model, decided 2026-07-16).

Downstream tickets consume the new source: #7 (Style Dictionary + handoff pack), #9 (CI gates check these outputs), #12 (Figma export ships the DTCG file).

## User Story

As a technical hiring manager inspecting the repo (and as the factory's own downstream tooling)
I want the design tokens to live in one machine-readable DTCG source that demonstrably generates the shipped CSS
So that the "token-contract design system" claim is verifiable at the artifact level, and every later pipeline stage (Style Dictionary, Figma export, CI drift gates) reads one canonical file.

## Problem Statement

The token values exist in two hand-maintained CSS files whose headers still claim they are mirrors of another repo (saulera-client-starter) — which is false since the 2026-07-16 canon decision. There is no machine-readable source of truth: `gen-tokens.mjs` derives DTCG *from* CSS per company build, which is backwards for a platform whose whole story is "generators emit the system." Nothing currently proves the CSS and any JSON representation agree.

## Solution Statement

Author `system/tokens.source.json` in DTCG format capturing exactly today's contract + neutral pack (46 contract tokens, 53 neutral tokens — values unchanged). Add one zero-dep Node ESM generator, `agent-layer/gen-token-css.mjs`, that validates the source at the boundary, emits both CSS files (with section banners and inline comments derived from `$description`s), and supports a `--check` mode (regenerate in memory, compare against disk, exit non-zero on drift) — the primitive ticket #9's CI drift gate will later wire up. Register it in `build.mjs` with a `✓` line and keep the standalone-run guard. Prove semantic identity by var-map comparison against the pre-change CSS, then retire the stale headers and update the two docs that describe the old flow.

## Out of Scope / Non-Goals

- **Not touching `gen-tokens.mjs`** — it stays the per-company projection (site-root contract + company pack → `tokens.json`). It still works after this ticket because the generated contract CSS keeps the same `:root` var shape it parses. Unifying the two is ticket #7 territory.
- **Not converting `tokens.css` / `tokens.saulera.css`** (reference packs, not loaded by the shell) — untouched.
- **No Style Dictionary config, no multi-target output** — ticket #7 (spike 4 validates SD ↔ this source there).
- **No CI workflow / GitHub Action** — ticket #9. This ticket only ships the `--check` primitive.
- **No strict structured-object DTCG values** (`{colorSpace, components}` colors, `{value, unit}` dimensions) — see NOTES: the pragmatic string profile is a deliberate decision, revisited only if spike 4 (#7) forces it.
- **Not syncing company-site copies of the contract** (per-company built sites carry their own copies; how they sync stays as-is).
- **No visual redesign** — emitted values must be semantically identical to today's; the neutral page renders unchanged.

## Feature Metadata

**Feature Type**: Refactor (flow inversion) + New Capability (generator)
**Estimated Complexity**: Medium (low logic risk, high fidelity-of-transcription risk)
**Primary Systems Affected**: `system/` token layer, `agent-layer/` generators, docs (`.claude/references/token-system.md`, `CLAUDE.md`)
**Dependencies**: None — Node built-ins only (hard rule: factory tooling zero-dep where possible)

## Related Work

**Implements**: https://github.com/linardsb/ux-factory/issues/2 (`Closes #2`)   ·   **Epic**: https://github.com/linardsb/ux-factory/issues/1 + `docs/epics/ai-first-ux-factory.architecture.md` (§Data model, §Other eng-lead calls — inherited, not re-decided)

**Back-references** (plans this builds on or inherits decisions from):

- `docs/epics/ai-first-ux-factory.architecture.md` — Why: pins "tokens.source.json (DTCG, W3C format) becomes the single source of truth — inverting today's flow" and "canon lives in this repo"; also pins zero-dep Node ESM factory tooling and deploy-=-commit.

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- Ticket #7 (Style Dictionary + handoff pack) — consumes `tokens.source.json`; spike 4 may harden the DTCG profile.
- Ticket #9 (CI gates) — wires `gen-token-css.mjs --check` + token lint into GitHub Actions.
- Ticket #12 (Figma parity) — ships the DTCG file in the handoff path.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/tokens.contract.css` (all 80 lines) — Why: the exact token set + values + section structure to transcribe. Line 1 is the stale header to retire; lines 16–80 are the `:root` block (46 tokens in 9 sections). Note lines 37–41: `color-mix(in srgb, var(--…) N%, transparent)` values — raw-string passthrough, NOT aliases.
- `system/tokens.neutral.css` (all 100 lines) — Why: the pack's two-tier structure the source must model: primitives (lines 23–68) and semantic map (lines 77–99) where every bare `var(--color-ink)` becomes a DTCG alias. Header prose (lines 1–17) carries the pack-cloning + load-order story that must survive into the generated header. Its "ONE source of truth" claim (line 3) moves to `tokens.source.json`.
- `agent-layer/gen-tokens.mjs` (lines 8–15 `readVars`, 26–35 `toToken`/alias handling, 61–64 standalone guard) — Why: the flow being inverted; reuse its `:root` var-parsing regex for the equivalence check; mirror its guard + `✓` log format; its `{group.name}` alias convention is the in-repo DTCG precedent.
- `agent-layer/build.mjs` (lines 20–33) — Why: registration pattern to MIRROR exactly (import → call → `✓` log line). Gotcha at lines 13–16: build.mjs runs FROM THE JOBS FOLDER with cwd-relative ledger paths — the new generator must resolve its own paths from `import.meta.url`, never cwd.
- `agent-layer/lib.mjs` (line 15) — Why: the error convention — throw plain `Error` whose message names the offending path.
- `index.html` (lines 13–17) — Why: the load order the generated files serve (contract → neutral pack → components); the visual validation surface.
- `system/site.js` (line 1) — Why: second stale "GENERATED MIRROR" header to retire. site.js is HAND-WRITTEN canon — only the header line changes, nothing else.
- `.claude/references/token-system.md` (all 3 paragraphs) — Why: describes the pre-inversion flow; §Machine layer explicitly says "check whether the inversion has landed before extending" — this ticket flips that paragraph, and the "Adding a token" flow changes (edit source JSON + regenerate, no longer edit contract CSS directly).
- `CLAUDE.md` (§Architecture map `system/` block; §Where new code goes → Component bullet; §Stale-header warning paragraph) — Why: three spots that become false when this lands; surgical updates are part of the ticket.

### New Files to Create

- `system/tokens.source.json` — the DTCG source of truth (shape pinned below in Patterns).
- `agent-layer/gen-token-css.mjs` — generator: source → both CSS files; `--check` mode; standalone guard. (Ticket suggested "e.g. gen-contract.mjs"; named for its output per `gen-<output>.mjs` convention — it emits token CSS, both files, from one source.)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [DTCG Format draft](https://www.designtokens.org/TR/drafts/format/) (note: `tr.designtokens.org` 301-redirects here)
  - Sections: token declaration (`$value`/`$type`/`$description`), groups, aliases (`{group.token}` curly-brace form), name rules
  - Why: name rules are hard constraints — token/group names must not start with `$` or contain `{ } .`; our kebab-case names comply. Alias syntax `{path.to.token}` is what the source uses and the generator resolves.
  - Caveat: the CURRENT draft specifies structured object values (color `{colorSpace, components}`, dimension `{value, unit}`). We deliberately target the widely-implemented string profile instead — see NOTES for rationale. Do not "upgrade" to structured objects.
- [Style Dictionary — DTCG support](https://styledictionary.com/info/dtcg/)
  - Why: forward-compatibility target for ticket #7 (`usesDtcg: true` expects `$value`/`$type` keys — the shape we emit). Read for awareness only; no SD in this ticket.

### Patterns to Follow

**`tokens.source.json` shape (pinned — the design decision of this ticket):**

Two top-level groups `contract` and `neutral`; one level of *section* subgroups mirroring the CSS files' comment sections; token key = exact CSS custom-property name minus `--`. Section `$description` becomes the CSS banner comment; token `$description` becomes the inline comment. Aliases use full paths.

```json
{
  "$description": "ux-factory design tokens (DTCG). Single source of truth — system/tokens.contract.css and system/tokens.neutral.css are GENERATED from this file by agent-layer/gen-token-css.mjs. contract = the brand-agnostic semantic slots every component references, with neutral literal fallbacks. neutral = the factory's no-brand pack: primitives + the semantic map binding contract tokens to them.",
  "contract": {
    "fg-surface": {
      "$description": "Colour: foreground / surface (light context)",
      "color-fg":    { "$value": "#1a1a1a", "$type": "color", "$description": "primary text" },
      "color-bg":    { "$value": "#ffffff", "$type": "color", "$description": "page ground" }
    },
    "inverse": {
      "$description": "Colour: inverse (content on a dark surface)",
      "color-fg-on-inverse-muted": { "$value": "color-mix(in srgb, var(--color-fg-on-inverse) 50%, transparent)", "$type": "color" }
    }
  },
  "neutral": {
    "primitives": {
      "$description": "1. PRIMITIVES — neutral palette (raw values, no brand)",
      "color-ink": { "$value": "#1a1a1a", "$type": "color", "$description": "near-black — content base" }
    },
    "semantic-fg-surface": {
      "$description": "Foreground / surface (light context)",
      "color-fg": { "$value": "{neutral.primitives.color-ink}", "$type": "color", "$description": "primary text" }
    }
  }
}
```

Rules the generator enforces (validate at the boundary, throw plain `Error` naming `tokens.source.json` + the offending path — `lib.mjs` convention):

- Every token object has `$value`; every `{…}` alias resolves to an existing token in the file.
- Leaf token names are unique within each top-level group (they flatten into one `:root` — a duplicate would silently self-override).
- Alias emission: `{neutral.primitives.color-ink}` → `var(--color-ink)` (leaf name only). Raw strings containing embedded `var(…)` (the `color-mix` values) pass through verbatim — they are NOT aliases.
- Contract tokens must be literals or raw strings, never aliases into `neutral` (the contract must stand alone with no pack loaded).

**Type assignment** (mirror `gen-tokens.mjs:17-24` vocabulary): `color` (incl. `color-mix` strings), `fontFamily` (as array of stack entries, per `gen-tokens.mjs:32`), `shadow` (raw string), `dimension` (spacing/radius/type/maxw/gutter, incl. `clamp(…)` strings), `$type` set per token.

**Generator registration (MIRROR `build.mjs:20-33` + `gen-tokens.mjs:61-64`):**

```js
// in build.mjs, after the existing generators:
const c = genTokenCss();
console.log(`  token css       ✓  ${c.contract} contract + ${c.neutral} pack tokens → system/`);

// standalone guard in gen-token-css.mjs:
if (import.meta.url === `file://${process.argv[1]}`) { … console.log(`token css       ✓  …`); }
```

**Path resolution (GOTCHA — differs from every other generator):** `gen-token-css.mjs` writes THIS repo's `system/`, not a ledger's `site_root`, and must work when invoked from the jobs folder. Resolve from the module itself: `const SYSTEM = resolve(dirname(fileURLToPath(import.meta.url)), "../system")`. Signature `genTokenCss()` takes no ledger (deviation from the `gen<Name>(ledger)` convention, justified: canon regeneration is company-independent; `build.mjs` calls it with no args).

**Generated file headers** (replaces the stale line-1 header; each generated file opens with):

```css
/* GENERATED from system/tokens.source.json — do not edit by hand.
 * Regenerate: node agent-layer/gen-token-css.mjs   ·   Drift check: --check
 * Canon lives in this repo (epic: docs/epics/ai-first-ux-factory.architecture.md §Data model). */
```

…followed by the existing prose headers (contract-interface explanation; pack cloning + load-order story) carried over into the generator as emitted comment blocks — that prose is load-bearing documentation, preserve its content (updating the neutral pack's "ONE source of truth" line to point at `tokens.source.json`).

**Output formatting:** two-space indent, value column aligned per section (pad name to section max width, mirroring today's files), inline `/* description */` where the token has one, blank line between sections. Emission order = JSON insertion order = today's CSS order.

---

## IMPLEMENTATION PLAN

### Phase 1: Author the source

**Tasks:**

- Transcribe both CSS files into `system/tokens.source.json` per the pinned shape (values copied EXACTLY — this is transcription, not redesign).
- Sanity-parse the JSON.

### Phase 2: Generator

**Depends on:** Phase 1 (needs the source file)

**Tasks:**

- Implement `agent-layer/gen-token-css.mjs`: load → validate → emit both CSS files; `--check` mode; standalone guard.
- Register in `build.mjs`.

### Phase 3: Equivalence proof + header/doc retirement

**Depends on:** Phase 2

**Tasks:**

- Prove old CSS ≡ new CSS (var-map comparison), iterate the source until equal.
- Retire the stale header in `site.js`; update `token-system.md` and `CLAUDE.md`.

### Phase 4: Validation

**Tasks:**

- Full validation ladder below; visual check under the neutral pack; prove `--check` catches a hand-edit.

---

## STEP-BY-STEP TASKS

### CREATE snapshot of current CSS (pre-change baseline)

- **IMPLEMENT**: Copy the two files to the session scratchpad before anything changes: `cp system/tokens.contract.css system/tokens.neutral.css <scratchpad>/baseline/`
- **VALIDATE**: `ls <scratchpad>/baseline/` shows both files
- **SATISFIES**: AC #3 (the comparison baseline for "semantically identical")

### CREATE system/tokens.source.json

- **IMPLEMENT**: Transcribe `tokens.contract.css:16-80` into the `contract` group (9 sections: fg-surface ×7, accent ×5, inverse ×8, fonts ×2, spacing ×8, radius ×3, shadows ×3, layout ×2, type-ramp ×8 = 46 tokens) and `tokens.neutral.css:19-100` into the `neutral` group (primitives + scale sections = 34 tokens, then semantic-fg-surface ×6, semantic-accent ×5, semantic-inverse ×8 — bare `var(--x)` values become `{neutral.primitives.x}`-style aliases; `color-mix` values stay raw strings). Section/token `$description`s from the CSS comments.
- **PATTERN**: shape pinned in Patterns above; alias convention per `gen-tokens.mjs:29-31`
- **GOTCHA**: values copied character-exact (e.g. `clamp(40px, 6vw, 76px)`, `rgba(0, 0, 0, 0.06)` spacing included); `--color-white` legitimately exists in BOTH groups (contract semantic + neutral primitive)
- **VALIDATE**: `node -e "JSON.parse(require('node:fs').readFileSync('system/tokens.source.json','utf8')); console.log('valid JSON')"`
- **SATISFIES**: AC #1 (valid DTCG source of truth)

### CREATE agent-layer/gen-token-css.mjs

- **IMPLEMENT**: Zero-dep Node ESM. Header comment citing the governing doc (`epic #1 / architecture §Data model` — feature-file header convention). Functions: `loadSource()` (read + JSON.parse + boundary validation: `$value` present, aliases resolve, leaf-name uniqueness per top group, contract has no cross-group aliases — throw `Error` naming `tokens.source.json` + token path), `emitCss(group, …)` (walk sections → banner comments, tokens → `--name: value;` with alias→`var()` resolution, alignment, inline descriptions, prose headers), `genTokenCss({check} = {})` (emit both files; in check mode compare generated strings to disk and return/throw drift), standalone guard handling `--check` argv, `✓` log line matching `build.mjs` format.
- **PATTERN**: guard `gen-tokens.mjs:61-64`; error convention `lib.mjs:15`; log format `build.mjs:20-33`
- **IMPORTS**: `node:fs` (readFileSync, writeFileSync), `node:path` (resolve, dirname, join), `node:url` (fileURLToPath)
- **GOTCHA**: resolve paths from `import.meta.url`, never cwd (build.mjs runs from the jobs folder); `fontFamily` array values re-join to a CSS stack, quoting entries containing spaces (`"Segoe UI"`)
- **VALIDATE**: `node agent-layer/gen-token-css.mjs` prints `token css       ✓  46 contract + 53 pack tokens → …/system`
- **SATISFIES**: AC #2 (generator emits both files, standalone-runnable, `✓` line)

### UPDATE agent-layer/build.mjs

- **IMPLEMENT**: ADD `import { genTokenCss } from "./gen-token-css.mjs";` and a call + `✓` console.log after the existing `genTokens` block (canon CSS regenerates before per-company projection reads it).
- **PATTERN**: `build.mjs:23-24` (the genTokens two-liner)
- **GOTCHA**: place the call BEFORE `genTokens` so the projection reads freshly-generated canon… only if the ledger's `site_root` is this repo — it usually isn't, so ordering is actually indifferent; keep it before anyway for the narrative. Do not touch the other generators.
- **VALIDATE**: `node agent-layer/build.mjs 2>&1 | head -5` — fails only on the missing default ledger path (expected outside the jobs folder), OR run `node -e "import('./agent-layer/gen-token-css.mjs').then(m => m.genTokenCss()).then(r => console.log(r))"` from repo root to confirm the export shape build.mjs consumes
- **SATISFIES**: AC #2 (registered in build.mjs)

### RUN the equivalence proof (iterate until green)

- **IMPLEMENT**: Regenerate both CSS files, then compare var maps old vs new with a scratchpad script reusing the `readVars` regex from `gen-tokens.mjs:8-15`: parse baseline copy and regenerated file → assert identical var-name sets and whitespace-normalized identical values, both files. Print per-file `OK n vars` or the exact diffs. Fix the SOURCE (never the emitted CSS) until green.
- **PATTERN**: `<scratchpad>/compare-vars.mjs`, ~30 lines, throwaway (ticket #9 builds the permanent gate from `--check`)
- **VALIDATE**: `node <scratchpad>/compare-vars.mjs` → `contract OK 46 vars · neutral OK 53 vars`
- **SATISFIES**: AC #3 (semantically identical emitted CSS)

### UPDATE system/site.js (header only)

- **IMPLEMENT**: REMOVE line 1 (`// GENERATED MIRROR — …saulera-client-starter…`), replace with: `// system/site.js — hand-written canon (this repo). Injects shared chrome from window.CLIENT_CONFIG.` Keep every other line byte-identical.
- **GOTCHA**: site.js is NOT generated — only the stale claim goes; per the CLAUDE.md stale-header warning this was already sanctioned ("remove the stale header when you touch one")
- **VALIDATE**: `head -2 system/site.js` shows the new header; `grep -c "saulera-client-starter" system/site.js system/tokens.contract.css` → `0` in both
- **SATISFIES**: AC #4 (stale headers retired)

### UPDATE .claude/references/token-system.md

- **IMPLEMENT**: Rewrite §Machine layer: the inversion HAS landed — `system/tokens.source.json` is the source of truth; `agent-layer/gen-token-css.mjs` emits contract + neutral pack (`--check` = drift check); `gen-tokens.mjs` remains the per-company projection. Update "Adding a token": add to the `contract` group in `tokens.source.json` (+ bind in `neutral`) → run `node agent-layer/gen-token-css.mjs` → commit source AND generated CSS together.
- **GOTCHA**: keep the doc's 3-paragraph density — it's a reference card, not an essay
- **VALIDATE**: `grep -q "tokens.source.json" .claude/references/token-system.md && echo updated`
- **SATISFIES**: AC #1 (docs point at the new source of truth)

### UPDATE CLAUDE.md (three surgical edits)

- **IMPLEMENT**: (1) Architecture map `system/` block: add `tokens.source.json` line ("DTCG source of truth — contract + neutral pack generate from it") and mark `tokens.contract.css` / `tokens.neutral.css` as generated. (2) §Where new code goes, Component bullet: new semantic token gets declared in `tokens.source.json` first (regenerate CSS). (3) DELETE the now-false "Stale-header warning" paragraph.
- **GOTCHA**: surgical — no other CLAUDE.md lines change
- **VALIDATE**: `grep -c "GENERATED MIRROR" CLAUDE.md` → `0`; `grep -c "tokens.source.json" CLAUDE.md` → `>=2`
- **SATISFIES**: AC #4 + rules-file truth

### RUN full validation ladder + drift-detection proof

- **IMPLEMENT**: Execute VALIDATION COMMANDS below top to bottom. For the drift proof: hand-edit one value in the generated `tokens.contract.css`, confirm `node agent-layer/gen-token-css.mjs --check` exits non-zero naming the file, then regenerate to restore.
- **VALIDATE**: all commands green; `--check` exit code `1` on the tampered file, `0` after regeneration
- **SATISFIES**: AC #2, #3

---

## TESTING STRATEGY

This project deliberately has **no test suite, no linter, no type-check** (CLAUDE.md ground rule — do not invent one). "Done" = run the surface you touched. The strategy is therefore executable-validation-in-place:

### Unit-level

The generator's own boundary validation IS the unit layer: malformed source (missing `$value`, dangling alias, duplicate leaf, contract→neutral alias) throws with a path-naming message. Exercise each failure mode once manually against a scratchpad copy of the source (do not commit broken fixtures).

### Integration

The equivalence proof (baseline var-map comparison) + `--check` round-trip is the integration test: source → generator → CSS → parse-back → equality.

### Edge Cases

- `color-mix(in srgb, var(--color-fg-on-inverse) 50%, transparent)` — embedded `var()` inside a raw string: must pass through verbatim, must NOT be treated as an alias (only a value that is *entirely* `var(--x)` was ever an alias — and in the source those are already `{…}` references).
- Font stacks: array → joined stack with `"Segoe UI"` re-quoted.
- `clamp(40px, 6vw, 76px)` — dimension-typed raw string, verbatim.
- `--color-white` present in both groups — no cross-contamination.
- `rgba(0, 0, 0, 0.06)` — internal spaces survive whitespace-normalized comparison (normalize collapse-only, don't strip).

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
node -e "JSON.parse(require('node:fs').readFileSync('system/tokens.source.json','utf8')); console.log('source: valid JSON')"
node --check agent-layer/gen-token-css.mjs && echo "generator: parses"
```

### Level 2: Unit Tests

```bash
node agent-layer/gen-token-css.mjs            # → token css ✓ 46 contract + 53 pack tokens
node agent-layer/gen-token-css.mjs --check    # → exit 0, "no drift"
```

### Level 3: Integration Tests

```bash
node <scratchpad>/compare-vars.mjs            # baseline ≡ regenerated, both files
git diff --stat system/                        # only expected files changed
```

### Level 4: Manual Validation

```bash
npx serve . &   # then open http://localhost:3000 — neutral page renders identically:
                # greyscale + blue accent, system font stack, spacing/type ramp unchanged.
                # Check hero, buttons, an inverse (dark) section for the color-mix tokens.
kill %1
```

### Level 5: Additional Validation (Optional)

```bash
# Drift-detection proof (the #9 primitive works):
sed -i '' 's/#2563eb/#ff0000/' system/tokens.contract.css
node agent-layer/gen-token-css.mjs --check; echo "exit: $?"   # expect non-zero + file named
node agent-layer/gen-token-css.mjs                            # regenerate → restored
```

---

## ACCEPTANCE CRITERIA

(from issue #2, expanded)

- [ ] `system/tokens.source.json` is valid DTCG (string profile — see NOTES) and the single source of truth; docs point to it
- [ ] `agent-layer/gen-token-css.mjs` emits both CSS files; standalone guard + `--check`; registered in `build.mjs` with a `✓` line
- [ ] Emitted CSS ≡ pre-change CSS (var-map equality, both files) — neutral shell renders unchanged
- [ ] Stale "GENERATED MIRROR" headers gone from `tokens.contract.css` and `site.js`; generated files self-describe their source; CLAUDE.md stale-header warning removed
- [ ] Zero new dependencies; no cwd assumptions (works from repo root AND jobs folder)
- [ ] Source JSON and generated CSS committed together (deploy = commit the artifacts)

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Equivalence proof green (46 + 53 vars)
- [ ] Manual visual check under neutral pack done
- [ ] Drift-detection proof done (tamper → `--check` fails → regenerate)
- [ ] Docs updated (`token-system.md`, `CLAUDE.md`)
- [ ] Single atomic commit on `main`, message per convention + `Closes #2` (pushing to the default branch with `Closes #2` auto-closes the issue and ticks epic #1's task list)

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Assumption — DTCG string profile is acceptable as "valid DTCG" (AC #1).** The current draft mandates structured objects for color/dimension; we target the widely-implemented string profile (rationale in NOTES). If the ticket-holder wants strict current-draft conformance, colors could be structured (hex is representable) but `clamp()`/`color-mix()` values CANNOT be — strictness would force `$extensions` escape hatches and buy nothing until spike 4. **Proceeding with strings unless overruled.**
- **Assumption — generator name `gen-token-css.mjs`** over the ticket's non-binding "e.g. `gen-contract.mjs`" (it emits both files). Cosmetic.
- **Assumption — `genTokenCss()` takes no ledger argument** (deviation from `gen<Name>(ledger)` convention; canon is company-independent). Flagged, not silent.
- **Open (deferred to #7)** — whether `gen-tokens.mjs`'s per-company projection should eventually read `tokens.source.json` instead of parsing CSS. Out of scope here.

## NOTES (open canvas)

**Why the string profile, precisely.** Three forcing facts: (1) `clamp(…)` and `color-mix(…)` are CSS expressions with no DTCG type — structured objects cannot express them, strings can; (2) the toolchain this source must feed — Style Dictionary v4 `usesDtcg` (#7), Tokens Studio / Figma import (#12) — implements the string-era draft; (3) the in-repo precedent (`gen-tokens.mjs` emission, already committed as `tokens.json` in company builds) is the string shape. The current draft's structured objects (verified live 2026-07-17: color `{colorSpace, components}`, dimension `{value, unit}`) are ahead of implementations; adopting them now would break spike 4's tools while gaining conformance to a *draft*. The migration path is mechanical (hex → components) if #7 ever needs it. This is the honest-labeling move too: the repo can say "DTCG (widely-implemented profile)" rather than claim a conformance the values can't meet.

**Alternatives weighed:**

- *Contract fallbacks as aliases into neutral primitives* (DRY: `contract.color-fg = {neutral.primitives.color-ink}`, generator resolves to literal for contract emission). Rejected: couples the brand-agnostic contract to one pack conceptually; today's duplication (contract fallback ≡ neutral primitive value) is real and documented in the pack's header ("identical intent, now expressed as a real pack") — the source should model what IS. A future token-lint (#9) can *check* the two stay equal, which is stronger than hiding the relationship.
- *Two generators (gen-contract + gen-pack)* per one-file-per-artifact convention. Rejected: one source, one parse, two writes — splitting forces shared-state passing or double-parsing for zero benefit (Simplicity First).
- *Byte-identical emission* as the bar instead of var-map equality. Rejected: headers must change anyway (that's AC #4); var-map semantic equality + visual check is the meaningful bar; formatting is regenerated deliberately.
- *Section banners via name-prefix inference* (flat groups, guess sections from `color-*`/`spacing-*`). Rejected: contract has three distinct colour sections a prefix can't split; explicit section subgroups keep emission deterministic and self-documenting.

**Sequencing note:** land this before starting #3 in parallel only if #3's implementer needs stable contract *names* — it does, and names don't change here, so #2 ∥ #3 remains safe if the user chooses worktrees later.

**Trace opportunity (ticket #5 forward-ref):** this ticket's build run is a candidate first "real run" for the trace recorder — if #5 lands later, re-running this generator inside a recorded session is a legitimate real trace. No action now.

## AMENDMENTS

<!-- Append-only after first approval/execution. -->

- 2026-07-17 — Implementation deviation: the standalone-guard pattern cited from `gen-tokens.mjs:61-64` is silently broken for paths containing spaces (`import.meta.url` percent-encodes; `` `file://${argv[1]}` `` doesn't). `gen-token-css.mjs` uses `pathToFileURL(process.argv[1]).href` instead. Same latent bug exists in all five older generators — follow-up candidate, not fixed here (surgical rule).
