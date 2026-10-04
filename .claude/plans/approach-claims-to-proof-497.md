# Feature: every claim on approach.html reaches its proof in a counted number of steps (#497)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

**Plan against `origin/main`, never against the shared worktree's checkout.** At planning time the primary
worktree sat on `fix/importer-reads-icon-name-449`, whose `tooling/build-checks.mjs` differs from main by ~7k
lines. Branch fresh: `git worktree add ../wt-497 -b feat/approach-claims-497 origin/main`, then
`(cd tooling/icons && npm ci) && (cd tooling/style-dictionary && npm ci)` — without both, group 41 and
drift-check go red on a fresh tree for a non-ticket reason (observed in pre-flight).

## Feature Description

approach.html makes claims. Some sit next to drift-checked proof (`#asrc`, `#asrc-probe`, the inspect toggle,
`#loc-proof`, `#param-proof`); most of the method cards link nowhere. This ticket audits every text block on the
page into a hand-maintained manifest, `system/claim-manifest.json`, where each sentence is either a **claim**
with a target and a step count (≤ 2) or a **non-claim** with a kind and a reason. Claims without proof get a
link to existing proof, a rewrite down to what the site can show, or a cut. A new build-checks group (52,
`claims`) re-derives every block from the page, pins its sentences, resolves every target in the tree and
verifies the first hop of every path — so a new unproven sentence, a deleted target or a raised step count
turns CI red.

## User Story

As a hiring manager reading approach.html
I want every claim to lead to its evidence in at most two clicks
So that I can check the work instead of trusting the prose

## Problem Statement

The page reads as equally unproven everywhere: a reader cannot tell a claim backed by a committed artifact from
one backed by nothing, and nothing stops a new unbacked sentence landing. Two claims are false as written today
(observed): "The site also ships structured data" — no tracked `.html` on main contains `application/ld+json`
(`git grep -l "ld+json" origin/main -- '*.html'` → nothing); "Accessibility defaults sit in the contract" —
`system/tokens.contract.css` declares no focus, contrast or reduced-motion token (grep for
`focus|ring|outline|prefers|contrast` → none); those defaults live in `system/components.css`
(`:focus-visible` at 409, `prefers-reduced-motion` at 670).

## Solution Statement

1. **Manifest** `system/claim-manifest.json` (precedent: `system/param-manifest.json`, a hand-maintained list
   whose `$description` carries the counting rules). Keyed by page, then by `data-claim` block id; each block
   lists its sentences in order. Kinds: `claim` (needs `target`, `steps`, `how`) and four non-claim kinds —
   `label`, `definition`, `attribution`, `stance` — each needing a `reason`.
2. **Markup**: every text-bearing block in `<main>` carries `data-claim="<id>"` (45 blocks today, observed by
   the pre-flight walker). Inline elements (`a`, `dfn`, `code`, `span`, `button`, …) belong to their nearest
   block ancestor, so navigation rows are blocks too.
3. **Copy**: the rewrites and added links in §Audit — owner-approved 2026-10-04 (P1–P14, approve all).
4. **Gate**: build-checks group 52 `claims`, a pure `auditClaims(html, manifest, world)` defined inline in the
   group, driven over the real page and then over in-memory mutations (the house pattern), plus a real on-disk
   mutation per AC leg run once by hand and recorded in the report.
5. **No on-page render** of the measured result (ticket item 4, decided here — see NOTES §D3).

## Out of Scope / Non-Goals

- Other pages (index, factory, work, build). The manifest is keyed by page so they can join later.
- New proof exhibits. A claim that needs one is rewritten or cut; the exhibit is its own ticket.
- Rendering the audit's result on the page (§D3). Forward ticket if the owner wants it.
- `<head>` (`<meta name="description">`, `<title>`), the injected chrome (site.js header/footer, dock,
  palette), glossary bubble text (`system/glossary.mjs` — definitions), and text that `annotated-source.mjs`,
  `derive-probe.mjs` and `inspect.mjs` render. Named in the group's CANNOT REACH clause.
- The site-wide link at-rest treatment (#487 report I1). This ticket widens approach.html's page-scoped rule only.
- Not changing: the `#asrc` exhibit, the two proof lines' wording, the glossary keys.

## Feature Metadata

**Feature Type**: Enhancement (honesty gate + copy)
**Estimated Complexity**: Medium
**Primary Systems Affected**: `approach.html`, `system/claim-manifest.json` (new), `tooling/build-checks.mjs`,
`tooling/drift-check.mjs` (none — it reads the count from the source), gate prose (CLAUDE.md, gates.md,
`tooling/ratify-journey.mjs`), VR baselines ×3, `system/loc-summary.json` (if the pages total flips)
**Dependencies**: none (node built-ins only)

## Related Work

**Implements**: #497 · **Epic**: none (loose ticket; the PRD's honesty contract —
`docs/epics/ai-first-ux-factory.prd.md`, "capability indicators state exactly what runs")

**Back-references**:
- `.claude/plans/approach-claims-to-proof-ticket.md` — the ticket draft, identical to the issue body.
- `.claude/plans/approach-concrete-cases-487.md` + `.claude/reports/approach-concrete-cases-487-report.md` — the
  last copy change on this page: owner wording sign-off, the `#method .max-prose a` underline rule (a CHECKLIST
  MUST: links need an at-rest signal), and the rm-then-`update:docker` regen of the three approach baselines.
- `system/param-manifest.json` + `agent-layer/gen-param-count.mjs` (#167) — the manifest precedent.

**Forward-references**: (none yet) — on-page render (§D3) and other pages would be follow-ups.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `approach.html` (all 305 lines on main) — the page under audit. `<style>` block lines 19–42 holds the
  page-scoped `#method .max-prose a` underline rule (#487) you will widen; the inline module at ~263–300 holds
  the two proof lines' literal fragments.
- `system/param-manifest.json` (line 2 `$description`) — the shape and voice for the new manifest's rules; its
  `chrome` and `/approach` entries are the control set a `control:` target must match (12 entries, listed in
  NOTES).
- `tooling/build-checks.mjs`:
  - lines 324–327 `ROOT` / `ROOT_DIR`; 331–347 `ok()` and `group()` — the group contract (fail messages
    collected by `ok`, one line per `group`).
  - lines 18036–18205 group 48 (`as-is`) — the closest recent shape: a `// ===` section header with a
    CANNOT REACH clause, local `threw` / `eq` helpers, numbered cases `48.1…48.9`, one `group(...)` call.
  - lines 19395–19416 — group 51's end, then `if (failures) …` and `console.log("\nbuild ✓  all 51 groups pass")`.
    Group 52 goes **after group 51's closing `}` and before `if (failures)`** (groups 49–51 sit inside an
    enclosing block; keep the new one inside it too — read the indentation there).
  - lines 1–9 — the spelt-out count ("Thirty-six groups"), stale; the comment itself says it is not gated.
- `tooling/drift-check.mjs` lines 187–220 `checkGroupCount` — reads four count claims (`all (\d+) groups pass`,
  CLAUDE.md `(\d+) PURE groups` and `build-checks' (\d+) groups`, gates.md `(\d+) pure groups`) and the
  distinct-name count of `group("…")` calls. A new group name must be unique (`DUPES` only lists `parenting`).
- `tooling/ratify-journey.mjs:228` — a FIFTH literal, `"build ✓  all 51 groups pass"`, that drift-check does
  not read. Move it to 52.
- `.claude/references/gates.md` line 11 (`## … — 51 pure groups, in CI`) and lines 90–96 (Group 48–51
  paragraphs, the format for Group 52's).
- `CLAUDE.md` lines 150 and 235 — the two count copies drift-check reads.
- `agent-layer/lib.mjs:278` `stripTags` — not entity-aware; the group needs its own five-entity decode (see
  PATTERN in Task 4), so do not import it.
- `discovery/faster-payment/prd.md` — `## Success metrics` (line 207) and `## Transition note` (line 298,
  seq 10 appetite · 11 rabbit holes · 12 out of bounds · 15 what would make us stop) — the evidence for the
  Shape it and Prove it cards. GitHub anchors: `#success-metrics`, `#transition-note`.
- `factory.html:302` `<section id="method" … data-studio-method>` — the studio method band (Hook loop + ethics
  verdict), evidence for Design for behaviour. `build.html` ids: `act-hooked` (805), `act-shape` (843).
- `.claude/system-reviews/` (8 tracked files) and `docs/epics/` — evidence for "I go back and check" and "the
  method was used to build it".
- `handoff/verdant/llms.txt` — the only tracked `llms.txt` (generated by `agent-layer/gen-llms.mjs`).
- `tooling/visual-regression/visual.spec.mjs:35` — approach waits on `#asrc[data-asrc="ready"]`; baselines
  `tooling/visual-regression/baselines/approach-{neutral,saulera,verdant}.png`.

### New Files to Create

- `system/claim-manifest.json` — the audit: rules in `$description`, `maxSteps: 2`, blocks + rendered lines.
- `.claude/reports/approach-claims-to-proof-497-report.md` — the report, with the three on-disk mutation runs.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- GitHub heading anchors in rendered markdown: lower-case, spaces → `-`, punctuation dropped, so
  `## Success metrics` → `#success-metrics`. Why: two targets link into `prd.md` sections. Verify each by
  opening the URL once.
- `.claude/skills/portfolio-design/references/CHECKLIST.md` — links need an at-rest signal (what bit #487).

### Patterns to Follow

**Group section header (mirror group 48, build-checks.mjs:18036):**
```js
// ===================================================================================================
// Group 52 — the claims on approach.html (#497): system/claim-manifest.json against the page. …
// CANNOT REACH (the manifest's $description and gates.md carry the same clause): …
// Every case RUNS auditClaims; 52.1 alone reads source as text, and says so.
{
  const threw = (fn) => { try { fn(); return null; } catch (e) { return e.message; } };
  …
  group("claims", `…`);
}
```

**Failure messages name the offending path** (CLAUDE.md §Errors): `52.3: approach.html block "card-shape"
sentence 3 targets discovery/faster-payment/prd.md, which is not tracked`.

**Manifest voice** — `system/param-manifest.json`'s `$description`: one paragraph, INCLUDE / EXCLUDE /
granularity / scope, stating why an omission matters.

**Page-scoped CSS with a reason comment** — approach.html `<style>`, the #487 rule:
```css
#method .max-prose a { text-decoration: underline; text-underline-offset: 0.2em; }
```

---

## IMPLEMENTATION PLAN

### Phase 1: Owner wording — DONE at planning

The owner approved P1–P14 as written on 2026-10-04 (AskUserQuestion during planning; answer: "Approve all as
written"). Apply them verbatim. Any further wording change is a new owner decision, not an implementer call.

### Phase 2: Gate and manifest skeleton

**Independent of:** Phase 1 (the gate is written against the current copy first, then re-pinned).

Write `auditClaims` + group 52 + a manifest of the CURRENT page (with the failing claims honestly listed), and
prove the group can go red on each leg. At this point the group is red by design on the claims with no target —
that is the audit working.

### Phase 3: Close the gaps

**Depends on:** Phase 2 (Phase 1 is done).

Apply the signed-off copy and links, add `data-claim` attributes, finish the manifest, group 52 green.

### Phase 4: Counts, prose copies, generated outputs

**Depends on:** Phase 3.

Group count G−1 → G (G = 52 unless another PR landed a group first; Task 1) in five places, gates.md Group 52 paragraph, loc-summary if it drifts, the three approach
baselines.

---

## Audit (the draft the manifest is built from)

45 blocks, observed by running a pre-flight walker over main's approach.html (NOTES §Pre-flight). Text is
normalised (entities decoded, whitespace collapsed). Targets: `#id` (this page), `/path[#id]` (a served file),
`https://github.com/linardsb/ux-factory/{blob,tree}/main/<path>[#…]` (a tracked repo path), `control:<selector>`
(a `param-manifest.json` entry for `chrome` or `/approach`). **Verify every `how` by doing it in a browser**
(1280 px) before trusting the row; the gate only proves the first hop.

| Block id | Sentence (abridged) | Kind | Target · steps | Action |
|---|---|---|---|---|
| hero-eyebrow | Approach · how I work | label | — | — |
| hero-title | I design the interface and build the system behind it. | claim | `#case` · 1 | none (hero CTA) |
| hero-sub | S1 I'm a design engineer. | claim | `#case` · 1 | none |
| | S2 Designers decide…; engineers make it real. | definition | — | — |
| | S3 The expensive mistakes … close enough to the code to ship it. | claim | `#case` · 1 | none |
| hero-cta | The method / The case study | label ×2 | — | — |
| method-kicker | The method | label | — | — |
| method-title | Four habits, run as one loop. | claim | GH tree `.claude/system-reviews` · 1 | link added in method-lead |
| method-lead | I run all four … whether the last one actually worked. | claim | GH tree `.claude/system-reviews` · 1 | **REWRITE + ADD LINK** P1 |
| card-shape-kicker / -title | How I decide and pace work / Shape it | label | — | — |
| card-shape | S1 A vague ask becomes a scoped bet with a time budget. | claim | GH `prd.md#transition-note` · 1 | **ADD LINK** P2 |
| | S2 I design the solution to fit that budget, name the risks, … out of scope … | claim | same · 1 | — |
| | S3 The outcome: bad bets die on paper … | claim | GH `prd.md#success-metrics` · 1 | **REWRITE** P3 |
| card-behaviour-kicker / -title | labels | label | — | — |
| card-behaviour | S1 A feature only matters if someone actually uses it. | stance | — | — |
| | S2 I find the real trigger, cut the friction … more motivating. | claim | `/factory#method` · 1 | **ADD LINK** P4 |
| | S3 The outcome is a feature people come back to without being nudged. | stance after rewrite | — | **REWRITE** P5 (no real users: outcome unprovable) |
| | S4 If a pattern lifts a metric by making someone feel worse, it doesn't ship. | claim | GH blob `system/derive.rules.mjs` · 1 | **ADD LINK** P6 (the ethics matrix; the studio's verdict only unlocks after the Hook diagram is assembled — `system/studio-method.mjs:8` — so `/factory#method` would be > 2 steps) |
| card-prove-kicker / -title | labels | label | — | — |
| card-prove | S1 … before building I write down what would show it worked … activation … retention. | claim | GH `prd.md#success-metrics` · 1 | **ADD LINK** P7 |
| | S2 After it ships, I go back and check. | claim | GH tree `.claude/system-reviews` · 1 | **REWRITE + ADD LINK** P8 |
| | S3 Most work never gets that second look. | stance | — | — |
| | S4 I make it a step. | claim | same as S2 · 1 | — |
| card-system-kicker / -title | labels | label | — | — |
| card-system | S1 Accessible markup, motion …, one shared file answers. | claim | `#case` · 1 | none (existing link) |
| | S2 Those named values are design tokens. | definition | — | — |
| | S3 Colour and spacing can't drift … | claim | `#case` · 1 | none |
| | S4 The outcome: change stays cheap — a rebrand is one file. | claim | `control:input[name="pack"]` · 2 | none (dock → pack) |
| | S5 This site is built that way (see the case study). | claim | `#case` · 1 | none |
| method-scope | S1 … all three are fictional. | claim | `/proto/verdant.html` · 1 | none |
| | S2 Verdant … | claim | `/proto/verdant.html` · 1 | none |
| | S3 Fieldwork … | claim | `/proto/fieldwork.html` · 1 | none |
| | S4 Faster Payment … | claim | GH blob `discovery/faster-payment/prd.md` · 1 | none (existing href) |
| | S5 The reason is Ryan Singer's advice … | attribution | — | — |
| case-kicker | In practice | label | — | — |
| case-title | This site re-skins itself from one line of CSS. | claim | `control:input[name="pack"]` · 2 | none |
| case-lead | The clearest example of the method is this site itself … | claim | GH tree `docs/epics` · 1 | **ADD LINK** P9 |
| case-problem-title | Problem & budget | label | — | — |
| case-problem | S1 Re-theming … meant hand-editing CSS on every page … | stance after rewrite | — | **REWRITE** P10 (no pre-contract artifact committed) |
| | S2 Worth one focused cycle. | stance | — | — |
| case-rule-title | The one rule | label | — | — |
| case-rule | S1 Nothing in the markup is allowed to name a colour. | claim | `#asrc` · 0 | none |
| | S2 A component asks for a role … answers. | claim | `#asrc` · 0 | none |
| | S3 Those roles are semantic tokens. · S4 The industry name … steering layer … | definition ×2 | — | — |
| | S5 No framework, no build step either: plain HTML and CSS. | claim | `#asrc` · 0 | none |
| case-build-title | Build | label | — | — |
| case-build | S1 Three stylesheets load in order. | claim | GH blob `approach.html` · 1 | **ADD LINK** P11 |
| | S2–S4 One lists… One overrides… One holds the components… | claim ×3 | `control:[data-inspect-toggle]` · 2 | none (inspect, then a card) |
| | S5 In that order they are the token contract, … | definition | — | — |
| | S6 Accessibility defaults sit in the contract … | claim | GH blob `system/components.css` · 1 | **REWRITE + ADD LINK** P12 (false as written) |
| case-outcome-title | Outcome | label | — | — |
| case-outcome | S1 Re-theming went from edits on every page to one line … | claim | `control:input[name="pack"]` · 2 | none |
| | S2 The site also ships structured data and an llms.txt index … | claim | `/handoff/verdant/llms.txt` · 1 | **REWRITE + ADD LINK** P13 (structured data false) |
| inspect-row | Inspect this surface | label | — | — |
| sources-kicker | Sources | label | — | — |
| sources-title | I learn from the primary sources. | label after rewrite | — | **REWRITE** P14 |
| sources-*-title ×5 | Process … Strategy & systems | label | — | — |
| sources-* ×5 | the five source lists | attribution | — | — |
| end-cta | Open the studio / Get in touch | label ×2 | — | — |

Rendered lines (`rendered` in the manifest — the gate checks the element id, the source artifact and that each
literal fragment still appears in approach.html): `loc-proof` → `system/loc-summary.json`; `param-proof` →
`system/param-count.json`. Steps 0: the number is the artifact's output.

### Owner-approved wording (signed off 2026-10-04: "Approve all as written")

Copy is given flat so it can be pasted. `[text](url)` marks the added link.

P1 method-lead: I run all four on every piece of work, and I go back to check whether the last one actually worked. [The checks on this site are committed](https://github.com/linardsb/ux-factory/tree/main/.claude/system-reviews).
P2 card-shape S1: A vague ask becomes [a scoped bet with a time budget](https://github.com/linardsb/ux-factory/blob/main/discovery/faster-payment/prd.md#transition-note).
P3 card-shape S3: Every decision names [the result that would kill it](https://github.com/linardsb/ux-factory/blob/main/discovery/faster-payment/prd.md#success-metrics), so a bad bet dies on paper, where it costs a conversation instead of a build cycle.
P4 card-behaviour S2: I find [the real trigger](/factory#method), cut the friction between the person and the payoff, and make the behaviour easier before trying to make it more motivating.
P5 card-behaviour S3: The aim is a feature people come back to without being nudged.
P6 card-behaviour S4: If a pattern lifts a metric by making someone feel worse, [it doesn't ship](https://github.com/linardsb/ux-factory/blob/main/system/derive.rules.mjs).
P7 card-prove S1: The outcome I'm after is what changed for the person using it, so before building I [write down what would show it worked](https://github.com/linardsb/ux-factory/blob/main/discovery/faster-payment/prd.md#success-metrics): an early signal like activation, and the slower outcome behind it like retention.
P8 card-prove S2: After each change ships, I [go back and check it against the plan](https://github.com/linardsb/ux-factory/tree/main/.claude/system-reviews).
P9 case-lead: The clearest example of the method is this site itself, because [the method was used to build it](https://github.com/linardsb/ux-factory/tree/main/docs/epics).
P10 case-problem S1: Re-theming the portfolio for each company would have meant hand-editing CSS on every page: slow, and easy to get inconsistent.
P11 case-build S1: [Three stylesheets](https://github.com/linardsb/ux-factory/blob/main/approach.html) load in order.
P12 case-build S6: Accessibility defaults sit in [the component styles](https://github.com/linardsb/ux-factory/blob/main/system/components.css), so every component inherits them.
P13 case-outcome S2: The design system's handoff pack also ships an [llms.txt index](/handoff/verdant/llms.txt), so an AI assistant can read the system as easily as a browser can.
P14 sources-title: The primary sources behind the method.

Notes for the owner, one line each: P4's link sits on "the real trigger" because the studio's method band
opens on the Hook loop's trigger card; S4 links the ethics matrix itself (P6). P8 narrows "after it
ships" from user outcomes (nothing shipped to users carries post-launch data) to the build's own reviews. P13
drops "structured data" because the shipped site carries none; the `structured-data` dfn goes with it (the
glossary key stays, unused).

---

## STEP-BY-STEP TASKS

### Task 1 — CREATE the branch and fresh worktree

- **IMPLEMENT**: `git worktree add ../wt-497 -b feat/approach-claims-497 origin/main`; `npm ci` in `tooling/icons`
  and `tooling/style-dictionary`.
- **GOTCHA**: shared worktree, parallel sessions (memory) — verify the branch before every commit, stage by
  explicit path.
  **The group number G is computed, not assumed.** Run
  `node tooling/build-checks.mjs | tail -1` on the fresh branch: it prints `all <N> groups pass`; G = N + 1.
  Every "52" in this plan means G and every "51" means N. If N ≠ 51, re-run
  `git grep -n "all $N groups\|$N PURE groups\|build-checks' $N groups\|$N pure groups"` to find the copies —
  the list must match Task 8's five (pre-flight observed exactly those five for N = 51).
- **VALIDATE**: `node tooling/build-checks.mjs | tail -1` → `build ✓  all 51 groups pass`;
  `node tooling/drift-check.mjs | tail -1` → `drift-check ✓ …group-count` (both observed on main in pre-flight).
- **SATISFIES**: precondition. **REGENERATES**: none.

### Task 2 — RECORD the owner's sign-off

- **IMPLEMENT**: quote in the report: "P1–P14 approved as written, 2026-10-04, at planning (AskUserQuestion)".
  Apply the wording character for character — it is the owner's copy.
- **GOTCHA**: rows share proof links: method-title borrows P1's link (`via: "method-lead"`), card-shape S2 uses
  P2's, card-prove S4 uses P8's. If a later owner edit cuts one of those links, re-audit the sharing rows before
  Task 7. Honesty contract both ways: never edit wording to make the gate pass — change the manifest or ask.
- **VALIDATE**: the quote is in the report. **SATISFIES**: AC #1. **REGENERATES**: none.

### Task 3 — CREATE `system/claim-manifest.json` for the CURRENT page

- **IMPLEMENT**: shape
  ```json
  {
    "$description": "…rules…",
    "maxSteps": 2,
    "pages": {
      "approach.html": {
        "route": "/approach",
        "blocks": [
          { "id": "hero-title", "sentences": [
            { "text": "I design the interface and build the system behind it.", "kind": "claim",
              "target": "#case", "steps": 1, "how": "The case study button in the hero" } ] },
          { "id": "hero-eyebrow", "sentences": [
            { "text": "Approach · how I work", "kind": "label", "reason": "names the page" } ] }
        ],
        "rendered": [
          { "id": "loc-proof", "source": "system/loc-summary.json", "steps": 0,
            "fragments": ["Counted at build time and checked in CI: the design system this site ships is ", " files, about ", " lines. No framework, no build step."] },
          { "id": "param-proof", "source": "system/param-count.json", "steps": 0,
            "fragments": [" of the things on these pages are live controls you can operate — inputs, switches ", "and editable surfaces, counted from a committed manifest and checked in CI."] }
        ]
      }
    }
  }
  ```
  Block ids as in §Audit (kebab-case, unique per page). Sentences in page order; `text` is the normalised text
  (entities decoded: `&amp;` → `&`, `&lt;head&gt;` → `<head>`). The `$description` states: what a block is
  (nearest non-inline ancestor of a text node in `<main>`), the five kinds and when each applies (a `stance` is a
  judgement or aim stated as one, never a past fact or an outcome), the four target forms, what counts as a step
  (one click, toggle or navigation; 0 = in the same `<section>`), `maxSteps` and that the gate pins it, and the
  CANNOT REACH list (same text as gates.md). For the current-copy pass, rows with no proof yet get
  `"target": "none"` — the gate must go red on them (that is Task 5's first positive control).
- **GOTCHA**: the hero-sub S1 apostrophe is a straight `'` in the source (`I'm`) — copy text from the walker's
  output, never retype it. `system/` placement: no generator globs `system/*.json` (grep observed nothing), and
  `.json` matches no loc-summary group (runtime is `css|mjs|js`), so the file moves no counted number.
- **VALIDATE**: `node -e 'JSON.parse(require("fs").readFileSync("system/claim-manifest.json","utf8"))'` (expected: no output).
- **SATISFIES**: AC #1. **REGENERATES**: none.

### Task 4 — ADD group 52 `claims` to `tooling/build-checks.mjs`

- **IMPLEMENT**: section header per PATTERN, inserted after group 51, before `if (failures)`. Inside:
  - `walk(html)` — the pre-flight walker (NOTES §Pre-flight, reproduced there in full): slice `<main>…</main>`,
    tokenise with `/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>|([^<]+)/g`, a tag stack (void set
    `br img input hr meta link source wbr`; comments removed first by an `indexOf("<!--")`/`indexOf("-->")`
    loop, so the tokeniser regex has no comment alternative — see GOTCHA), INLINE set
    `a abbr b button code dfn em i kbd mark q s small span strong sub sup time u br`. Record per block owner:
    its attrs, its enclosing `<section>` index, its text (all text nodes concatenated with `""`, then
    entity-decode, collapse `\s+`, trim), and every `<a href>` inside it. Record every `id="…"` with its section
    index, and every `<a href>` per section. Owners with empty text are dropped.
  - `auditClaims(html, manifest, world)` → array of problem strings. `world = { tracked:Set, exists(p), read(p),
    controls:Set }` so mutations inject a world rather than touch disk. Legs:
    - **(c) coverage**: every owner carries `data-claim="<id>"` on ITSELF; every id is in the manifest and every
      manifest block is on the page; no duplicate ids; `sentences.map(s => s.text).join(" ")` equals the owner's
      text; no sentence text contains an internal boundary `/[.!?]["”)]?\s+[A-Z"“(]/`.
    - **kinds**: `claim` has `target` (not `"none"`), integer `steps`, non-empty `how`; the others have a
      non-empty `reason` and no `target`.
    - **(b) steps**: `manifest.maxSteps === 2` (literal pinned in the group — N is a decision, so changing it is a
      gate edit, not a data edit) and `0 ≤ steps ≤ maxSteps`.
    - **(a) targets resolve**: `#id` → the id exists on the page; `/path[#id]` → `/` → `index.html`,
      extensionless → `.html`, the file is tracked AND exists, and if `#id` is given the file contains `id="id"`;
      GitHub `^https://github\.com/linardsb/ux-factory/(blob|tree)/main/([^#?]+)` → that path is tracked (blob:
      exact; tree: some tracked path starts with `<path>/`) AND exists; a `#fragment` on a blob `.md` target must
      equal the GitHub slug of one of that file's `#`-headings (lower-case, drop everything but `[a-z0-9 -]`,
      spaces → `-`) — so `prd.md#success-metrics` is proven, not trusted; any other fragment form (`#L…` line
      ranges) is refused, because a line range goes stale silently; `control:<sel>` → in `world.controls`;
      any other `http(s):` → refused by name.
    - **hop 1**: steps 0 → target is `#id` and the id sits in the claim's own `<section>`; steps ≥ 1 and not a
      control → an `<a href>` exactly equal to the target exists in the claim's OWN block, or in the block named
      by the sentence's optional `via: "<block id>"` (which must be in the same section); control → steps ≥ 1.
      A link merely elsewhere in the section does not count — otherwise a claim could borrow a neighbour's link
      and understate its path. `via` users today: hero-title, hero-sub S1/S3 (`via: "hero-cta"`), method-title
      (`via: "method-lead"`), case-title (none — control).
    - **rendered**: the id exists, the source is tracked and exists, every fragment is a substring of the page
      source.
  - Cases: 52.1 the real page + real manifest + real world answers `[]`. 52.2–52.9 one positive control per leg,
    each a single in-memory mutation of a copy (`structuredClone(manifest)` / `html.replace(...)`) asserting the
    problem list names the leg: an added `<p>New sentence.</p>` in `#method` (c); a sentence appended inside the
    card-shape `<p>` (c); `steps: 3` (b); `maxSteps: 3` (b); a tracked target dropped from `world.tracked` (a); an
    `example.com` target (a); `prd.md#success-metric` (one letter off — the heading-slug check must refuse it) (a);
    an `approach.html#L13-L15` fragment (refused form) (a); the hero's `href="#case"` removed (hop 1); a card-shape sentence targeting `/proto/verdant.html` (linked only
    from method-scope) with no `via` (hop 1 — must go red); a steps-0 target pointed at an id in
    another section (hop 1); a fragment of `loc-proof` reworded in the html (rendered). 52.10 `walk` over the real
    page finds exactly the manifest's block count (45 before Phase 3; re-pin after). 52.11 nothing tracked moved
    (`git status --porcelain` snapshot before/after, group 48.9's idiom).
  - The `group("claims", …)` string ends with the CANNOT REACH clause (same words as gates.md and the manifest).
- **PATTERN**: group 48 (`tooling/build-checks.mjs:18036–18209`); `ok()` / `group()` at 331–347;
  `checkInspectMounts` (`tooling/drift-check.mjs:115`) for the page-scan idiom.
- **IMPORTS**: none new — `readFileSync`, `existsSync`, `execFileSync`, `join` are already imported at the top.
- **GOTCHA**: the check that cannot fail (memory) — every leg gets its positive control run in-process, and the
  52.1 green is trusted only after 52.2–52.9 are seen red-capable. Do not use `existsSync` alone: an untracked
  local file passes it and 404s on GitHub; do not use `git ls-files` alone: a file moved on disk stays tracked,
  and AC (a)'s on-disk mutation would stay green. Use both.
  CodeQL scans `tooling/` (`.github/codeql/codeql-config.yml` paths allowlist, observed). Strip comments with
  the `indexOf` loop in NOTES §Walker (no `<!--…-->` alternative in any regex). Observed at planning: the local
  bundle (`~/.codeql/2.27.0/codeql`, default `javascript-code-scanning.qls` — the suite CI runs) reports **0
  alerts** on the NOTES walker; the regex-comment variant also reported 0, so the pattern is not flagged in
  this shape either way, and the `indexOf` form stays because it removes the question. Re-run the same scan on
  the finished group before pushing (command in Level 5).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -A40 "build claims"` — expected at this point: ✗,
  listing every `"target": "none"` row by block id and sentence number, and nothing else.
- **REDDENS**: each of 52.2–52.9 (listed above); expected message shape
  `52.N: approach.html block "<id>" sentence <k> — <leg>: <detail>`.
- **SATISFIES**: AC #2 (a)(b)(c). **REGENERATES**: none.

### Task 5 — PROVE the three AC legs on disk (record in the report)

- **IMPLEMENT**: with the group otherwise green (after Task 7), run each, observe ✗ naming the cause, restore,
  observe ✓:
  (a) `mv discovery/faster-payment/prd.md /tmp/prd.md` → `build claims ✗ … not on disk` (other groups that read
  the file may also go red — record which); `mv` back.
  (b) set one manifest row's `steps` to 3 → ✗ `exceeds maxSteps 2`; revert.
  (c) add `<p class="muted">I ship faster than anyone.</p>` under `#method`'s lead → ✗ `block has no data-claim`;
  and separately append ` I never miss.` inside the card-shape `<p>` → ✗ `sentences do not match`; revert both.
- **VALIDATE**: each command's `build claims` line pasted into the report (observed).
- **SATISFIES**: AC #2's "prove each by mutating the source". **REGENERATES**: none (all reverted; confirm
  `git status` clean of them).

### Task 6 — UPDATE `approach.html` copy and attributes (Phase 3)

- **IMPLEMENT**: apply the owner-signed P-rows exactly. Add `data-claim="<id>"` to all 45 owners (ids from
  §Audit). Widen the page-scoped underline rule from `#method .max-prose a` to `main p a` and update its comment
  to say it now covers every prose link on the page (#497) — buttons sit in `div.hero-cta-row`, not `<p>`, so
  they are unaffected. P13: remove the `structured-data` `<dfn>`. Do not wrap a `<dfn tabindex>` in an `<a>`
  (nested interactive) — every P-row's link text avoids a dfn.
- **GOTCHA**: `hidden` vs author display, entrance anims — not touched. `data-claim` is read by nothing at view
  time (grep observed no reader), so it changes no pixel; the copy does.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "build claims"` → ✓ after Task 7.
- **SATISFIES**: AC #1. **REGENERATES**: approach baselines ×3 (Task 10); possibly `system/loc-summary.json` (Task 9).

### Task 7 — UPDATE the manifest to the new copy

- **IMPLEMENT**: replace every `"target": "none"` row with the §Audit target, re-pin changed sentence texts from
  the walker's output (never retyped), re-pin 52.10's block count if a block was added or cut.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "build claims"` → `✓` (expected).
- **SATISFIES**: AC #1. **REGENERATES**: none.

### Task 8 — UPDATE the group count and gate prose (51 → 52)

- **IMPLEMENT**: `tooling/build-checks.mjs` final line `all 52 groups pass` and the spelt-out header
  ("Fifty-two groups"); `CLAUDE.md:150` `52 PURE groups`; `CLAUDE.md:235` `build-checks' 52 groups`;
  `.claude/references/gates.md:11` `52 pure groups`, plus a **Group 52 — the claims on approach.html** paragraph
  after Group 51's in the same voice, ending with its CANNOT REACH clause; `tooling/ratify-journey.mjs:228` both
  occurrences of `all 51 groups pass` → 52. CLAUDE.md's architecture map gets one line under `system/`:
  `claim-manifest.json         hand-maintained: every sentence on approach.html, its kind and its proof`.
  And one "Where new code goes" bullet, mirroring the param-manifest one: **Copy change on approach.html** →
  re-pin its sentences (and any target) in `system/claim-manifest.json` in the same PR; build-checks group 52
  reds until you do.
- **GOTCHA**: gate prose has three copies (memory) — here four: gates.md, the group string, the manifest
  `$description`, and the section header comment. Grep all four for the CANNOT REACH wording before finishing.
  ratify-journey's literal is invisible to drift-check — miss it and R7 fails on the next ratify run.
- **VALIDATE**: `node tooling/drift-check.mjs | tail -1` → `…group-count` ✓;
  `git grep -n "all 51 groups"` → no output (expected).
- **REDDENS**: drift-check's existing leg — leave CLAUDE.md:150 at 51 and it prints
  `CLAUDE.md (architecture map): says 51 groups, build-checks defines 52`.
- **SATISFIES**: AC #3. **REGENERATES**: none.

### Task 9 — REGENERATE loc-summary if the pages total moved

- **IMPLEMENT**: `git add approach.html` first (gen-loc reads the index — memory), then
  `node agent-layer/gen-loc-summary.mjs --check`; if it reports drift, run it without `--check` and stage
  `system/loc-summary.json`.
- **GOTCHA**: only the `pages` group and the total can move (approach.html is a page; the manifest is `.json`).
  approach renders the `runtime` group only, so a pages-only change does not churn the approach digits — but the
  baselines are regenerated anyway in Task 10.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` → no drift (expected).
- **REGENERATES**: `system/loc-summary.json` (conditional).

### Task 10 — REGENERATE the three approach VR baselines

- **IMPLEMENT**: commit the page change, then from a CLEAN detached worktree under `/Users` (memory: the gate
  reads the dirty tree; `/private/tmp` breaks Docker sharing): `rm tooling/visual-regression/baselines/approach-*.png`
  then `cd tooling/visual-regression && npm ci && npm run update:docker`. Copy the three PNGs back to the branch.
- **GOTCHA**: rm first — the countUp makes `update:docker` keep stale digits otherwise (ticket AC #4 + memory);
  the approach countUp can flake ("two consecutive stable screenshots") — re-run, don't diagnose.
  Expect three "snapshot doesn't exist … writing actual" lines, and `git status` showing exactly the three PNGs.
- **VALIDATE**: `git diff --stat origin/main -- tooling/visual-regression/baselines/` → exactly the three
  `approach-*.png` (expected); look at the neutral PNG's method band once to see the links underlined.
- **SATISFIES**: AC #4. **REGENERATES**: the three baselines.

### Task 11 — VALIDATE the page in a browser and the full gate stack

- **IMPLEMENT**: serve on an OS-assigned port (kill only your own PID — memory), open `/approach` at 1280 and
  390, and walk this list; each line is the expected landing, so a mismatch is a finding, not a judgement:
  1. hero "The case study" → `#case` band in view.
  2. method-lead / card-prove links → GitHub `.claude/system-reviews/` listing (8 files at planning).
  3. card-shape links → `prd.md` scrolled to "Transition note" / "Success metrics" (anchors observed live).
  4. "the real trigger" → `/factory`, method band with the ten question cards visible without a click (cards
     render at mount; `system/studio-method.mjs:5-9`). If the band is not visible without interaction on any
     engine, re-point P4's link to `/build#act-hooked` (owner already approved the words; only the href moves)
     and re-pin the manifest.
  5. "it doesn't ship" → GitHub `system/derive.rules.mjs`, ethics matrix (`ethics:` block, ~line 147).
  6. method-scope links → the two proto pages (each shows its "fictional scenario" notice) and `prd.md`.
  7. case-title / card-system S4 / case-outcome S1 → open the dock (step 1), choose another pack (step 2): the
     page re-skins.
  8. case-build S2–S4 → "Inspect this surface" (step 1), hover a card (step 2): its token names show.
  9. "Three stylesheets" → GitHub `approach.html`, lines 13–15 are the three `<link>`s.
  10. "the component styles" → `components.css` on GitHub; "llms.txt index" → `/handoff/verdant/llms.txt` loads.
  Fix the manifest when a path is longer than its `steps`; never the gate.
- **VALIDATE**: `node tooling/build-checks.mjs | tail -1` → `build ✓  all 52 groups pass`;
  `node tooling/drift-check.mjs | tail -1` ✓; `node tooling/token-lint.mjs` ✓ (observed on main: 63 tokens, 0/0).
- **SATISFIES**: AC #1–#4.

---

## TESTING STRATEGY

No suite (CLAUDE.md §Testing). The gate is the test: group 52's in-process cases, plus the on-disk mutation runs
of Task 5, plus the browser walk of Task 11.

### Edge Cases

- A sentence that ends in a closing quote or bracket (`(see the case study).`) — the boundary regex allows
  `["”)]` before the space.
- `&lt;head&gt;` inside `<code>` → `<head>` after decode; `&amp;` in headings (`Problem &amp; budget`).
- A `<dfn>` or `<code>` mid-sentence — inline, so its text joins the block with no inserted space.
- A link-only row (`hero-cta`, `end-cta`) — a block whose text is two labels; the join with `" "` matches the
  collapsed whitespace between the two `<a>`s (observed: `The method The case study`).
- A GitHub line-range fragment (`#L13-L15`) — refused by the gate; P11 links the file without one.
- `/factory#method` — the id is in factory.html's static source (line 302), so the check holds without JS.

### Proving the checks

Every leg has an in-process positive control (52.2–52.9) and the three AC legs also have an on-disk run
(Task 5). 52.1's green is read only after those are seen to fire.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
- `node --check tooling/build-checks.mjs` (expected: no output)
- `node -e 'JSON.parse(require("fs").readFileSync("system/claim-manifest.json","utf8"))'`

### Level 2: Unit (the gate)
- `node tooling/build-checks.mjs` → `build ✓  all 52 groups pass`

### Level 3: Integration (CI verify job's legs)
- `node tooling/drift-check.mjs` → `drift-check ✓ … group-count`
- `node tooling/token-lint.mjs` → ✓

### Level 4: Manual
- Task 11's browser walk at 1280 and 390; the three baselines eyeballed once.

### Level 5: Additional
- Local CodeQL over the new group, the planning-time command (database outside the repo):
  `mkdir -p $T/src && sed -n '/Group 52/,/group("claims"/p' tooling/build-checks.mjs > $T/src/g52.mjs &&
  ~/.codeql/2.27.0/codeql database create $T/db --language=javascript --source-root=$T/src -q &&
  ~/.codeql/2.27.0/codeql database analyze $T/db codeql/javascript-queries:codeql-suites/javascript-code-scanning.qls --format=csv --output=$T/out.csv -q && wc -l < $T/out.csv`
  → `0` (observed for the walker at planning; expected for the group). CI's two-leg gate is the authority.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Owner signs off P1–P14 wording | owner's hand | done 2026-10-04 at planning (approve all) | — |
| VR baseline regen via Docker | local Docker, no spend | yes (AC #4) | the PR |

No paid agent runs.

---

## ACCEPTANCE CRITERIA

- [ ] `system/claim-manifest.json` lists every sentence of every text block in approach.html's `<main>` plus the
      two rendered proof lines; every `claim` has a target, a step count ≤ 2 and a `how`; no target is `"none"`.
- [ ] Group 52 goes red on (a) a deleted target, (b) a step count above 2, (c) a new block or a new sentence
      without a manifest entry — each shown by an on-disk mutation in the report, and each also pinned by an
      in-process positive control in the group.
- [ ] `node tooling/build-checks.mjs` → `all 52 groups pass`; the count matches in CLAUDE.md ×2, gates.md,
      the pass line and `tooling/ratify-journey.mjs`; drift-check ✓.
- [ ] The three approach VR baselines are deleted and regenerated in the same PR; `loc-summary.json` regenerated
      if it drifted.
- [ ] The owner's sign-off on the copy is quoted in the report.

---

## COMPLETION CHECKLIST

- [ ] Tasks 1–11 in order, each VALIDATE observed
- [ ] On-disk mutations recorded (Task 5)
- [ ] Browser walk done (Task 11)
- [ ] Plan, report and review in the PR; PR body carries `Closes #497`

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 (N)** — 2, as the ticket recommends. Pinned as a literal in the group, so raising it is a visible gate edit.
- **Q2 (claim identification)** — `data-claim` on every block, plus the walker that finds blocks WITHOUT one.
  The attribute alone could not catch an added plain `<p>`; the walker is what makes leg (c) real.
- **Q3 (method-card evidence)** — answered by the audit: Shape it and Prove it have committed evidence in the
  Faster Payment PRD; Design for behaviour in the studio's method band; the post-ship and "people come back"
  outcomes have none and are rewritten (P5, P8). Owner approved 2026-10-04.
- **Q4** — `stance` is the one kind an author could abuse to park an unproven claim. Mitigation: the
  `$description` defines it narrowly (a judgement or aim, never a past fact or an outcome) and every stance row
  carries a reason the reviewer reads. The gate cannot judge it; CANNOT REACH says so.
- **Q5** — "This site re-skins itself from one line of CSS" points at the dock's pack switcher (2 steps). If the
  owner wants 1, the pack radios would need to be on the page — out of scope (a new exhibit).
- Assumption: the GitHub repo stays public (observed PUBLIC); every GitHub target 404s otherwise.

## NOTES (open canvas)

### D1 — why sentences are pinned, not just blocks
A block-level `data-claim` check passes when a sentence is added inside an existing card. Pinning the
normalised sentence list (join must equal the block's text) makes any copy edit a manifest edit, which is the
point: the manifest is the audit, so it must move when the audited text moves. Cost: every copy edit on
approach.html touches the manifest — same as param-manifest for controls.

### D2 — why hop 1 is verified and the rest is declared
A typed `steps` is self-reported; the gate verifies what it can reach statically: the link exists where the
reader stands, the target exists where it points. Hop 2 (operate the dock, open inspect) lives in `how` and is
walked by hand in Task 11. A journey driver could walk it; not this ticket.

### D3 — no on-page render (ticket item 4)
Rendering "N claims, each ≤ 2 steps from its proof" needs a generator (or a third fetch in the `Promise.all`
whose failure hides the whole `#asrc` exhibit), a drift-check leg, a new JS-rendered sentence that is itself a
claim the static walker cannot see, and the countUp flake surface. The links themselves are the reader-facing
change. Recommend a follow-up if wanted.

### D4 — manifest location
`system/` follows the param-manifest precedent and keeps the option to render later. Checked: nothing globs
`system/*.json` (`git grep` over agent-layer + drift-check for `readdirSync(…system` / `system/*.json` → none),
and loc-summary's runtime regex is `^system/(wc/)?[^/]+\.(css|mjs|js)$`, so `.json` is uncounted.

### Pre-flight (run 2026-10-04 against `origin/main` ec35d6d in a detached worktree)

- `node tooling/build-checks.mjs` → first run ✗ group `icons` (41.7: `tooling/icons/node_modules … missing`);
  after `cd tooling/icons && npm ci` → `build ✓  all 51 groups pass` (observed). → Task 1 now installs it.
- `node tooling/drift-check.mjs` → ✗ Style Dictionary missing; after `npm ci` there → ✓ all fifteen legs (observed).
- `node tooling/token-lint.mjs` → `63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed).
- Group count copies: drift-check reads four (pass line, CLAUDE.md ×2, gates.md); `git grep "all 51 groups"`
  also hit `tooling/ratify-journey.mjs:228` (observed) → added to Task 8. The build-checks header's spelt-out
  count says "Thirty-six" (stale; ungated by its own admission).
- `gh pr list --state open` → `[]` (observed): no concurrent PR claims group 52 today.
- Walker over main's approach.html → 45 non-empty block owners (observed), texts as in §Audit. First draft
  joined text nodes with `" "` and produced `<head> .`; switched to `""` join with whitespace nodes kept → the
  §Edge-case behaviour (observed fixed).
- `ld+json` in tracked html → none; contract a11y tokens → none; `:focus-visible` / `prefers-reduced-motion` in
  components.css → present (observed) → P12, P13.
- `data-claim` readers → none (`git grep "data-claim\|dataset.claim"` → nothing).
- `factory.html:302` has `id="method"`; build.html has `act-hooked` (805) and `act-shape` (843) (observed).
- Param-manifest controls for `chrome` + `/approach` (observed, 12): `input[name="pack"]`, `.dock-toggle`,
  `.dock-copy`, `.dock-reset`, `.dock-restore`, `[data-palette-open]`, `.cmdk-input`, `.cmdk-list`,
  `#asrc-probe-color`, `.asrc-probe [data-scrub="probe-hue"]`, `.asrc-probe [data-scrub="probe-lightness"]`,
  `[data-inspect-toggle]`.
- Known traps carried in as GOTCHAs: shared worktree; check-that-cannot-fail; gate prose copies; loc-summary
  reads the index; VR reads the working tree; rm before update:docker; approach countUp flake; portal-smoke
  kill-own-PID; copy never indented; honesty contract both ways; links need an at-rest signal (#487).

Walker used (the group's `walk` starts from this; this exact file returned 45 blocks on main's approach.html
and 0 CodeQL alerts under the default code-scanning suite, both observed 2026-10-04):
```js
import { readFileSync } from "node:fs";
const stripComments = (s) => {
  let out = "", i = 0;
  for (;;) {
    const a = s.indexOf("<!--", i);
    if (a === -1) return out + s.slice(i);
    const b = s.indexOf("-->", a + 4);
    out += s.slice(i, a);
    if (b === -1) return out;
    i = b + 3;
  }
};
export function walk(html) {
  const raw = html.slice(html.indexOf("<main>"), html.indexOf("</main>") + 7);
  const main = stripComments(raw);
  const INLINE = new Set(["a","abbr","b","button","code","dfn","em","i","kbd","mark","q","s","small","span","strong","sub","sup","time","u","br"]);
  const VOID = new Set(["br","img","input","hr","meta","link","source","wbr"]);
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>|([^<]+)/g;
  const stack = []; const owners = new Map(); let m;
  while ((m = re.exec(main))) {
    if (m[2]) { const tag = m[2].toLowerCase();
      if (m[1]) { while (stack.length && stack.pop().tag !== tag); continue; }
      const node = { tag, attrs: m[3] };
      if (!VOID.has(tag) && !m[3].trim().endsWith("/")) stack.push(node);
      continue; }
    const owner = [...stack].reverse().find((n) => !INLINE.has(n.tag));
    if (!owners.has(owner)) owners.set(owner, []);
    owners.get(owner).push(m[4]);
  }
  const dec = (s) => s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,"&");
  return [...owners].map(([o, t]) => ({ tag: o.tag, attrs: o.attrs, text: dec(t.join("")).replace(/\s+/g, " ").trim() })).filter((b) => b.text);
}
const blocks = walk(readFileSync(process.argv[2], "utf8"));
console.log(blocks.length);
```

### Risks addressed (second pass, 2026-10-04)

| Risk | What was done | Evidence |
|---|---|---|
| R1 owner wording | Asked at planning; P1–P14 approved as written. P6 added (card-behaviour S4 → `system/derive.rules.mjs`) because the studio's verdict unlocks only after the Hook diagram is assembled, which would exceed 2 steps | owner answer; `system/studio-method.mjs:8` |
| R2 CodeQL scans `tooling/` | Comment stripping by `indexOf`; local scan of the walker with CI's default suite | 0 alerts (observed); the regex-comment variant also 0, so no hidden dependency on the workaround |
| R3 group number | G computed from the branch's own pass line in Task 1; the five copies found by one grep whose expected hits are listed | five hits for N = 51 (observed) |
| R4 self-reported steps | Hop 1 restricted to the claim's own block or a named `via`; GitHub `.md` fragments proven against the file's headings; line-range fragments refused; hops 2+ walked against a ten-line expected-landing list in Task 11 with one pre-approved fallback (P4 href) | `#success-metrics`, `#transition-note` anchors observed live on GitHub |

Confidence for one-pass implementation: 10/10. Every input that was an assumption at the first pass is now
either observed (anchors, CodeQL, block count, the count copies, the at-rest method cards) or decided (wording,
N, fallback href). What remains is execution, each step with an expected output.

## AMENDMENTS

- 2026-10-04 — pre-report review: hop 1 narrowed to the claim's own block plus an explicit `via` block; comment
  stripping moved out of regex for CodeQL (tooling/ is scanned); CLAUDE.md "Where new code goes" bullet added;
  shared-link re-audit step added to Task 2.
- 2026-10-04 — risk pass: owner approved P1–P14 (P6 new; old P6–P13 renumbered P7–P14); P11 loses its line
  anchor; gate proves GitHub heading anchors and refuses line ranges; G computed in Task 1; CodeQL scan
  observed clean; Task 11 gets an expected-landing list.
- 2026-10-04 — implementation (plan errors, each logged in the report's Deviations):
  (1) P13's link text "llms.txt index" overlaps the existing `llms-txt` `<dfn tabindex>`, so "every P-row's link
  text avoids a dfn" was false for P13; the `llms-txt` dfn was dropped with `structured-data`'s (both glossary keys
  stay, unused; nothing else reads either). (2) Level 5's `sed -n '/Group 52/,/group("claims"/p'` slice leaves the
  group's block unclosed, so CodeQL extracts nothing ("could not process any of it"); the scan needs the imports it
  uses, `ok`/`group` stubs and the closing brace. (3) Task 5 (a)'s `mv discovery/faster-payment/prd.md` crashes
  group 47 at `build-checks.mjs:17775` (TypeError in a failure message) before group 52 runs; leg (a) is proven on
  disk with `mv .claude/system-reviews`, a target only group 52 reads. (4) Task 11 item 7 assumed the dock at both
  widths; `components.css:3163` hides it below 1100px and the palette has no pack command, so the three pack claims
  have no path on a phone, and Inspect does not open at 390 (main too). Owner answer to Q1, 2026-10-04: "Retarget two, flag rest" — case-title and case-outcome S1 now target the "Three stylesheets" source link via case-build; the other four state the width in `how`.
  (5) approach.html is 324 lines on main, not 305; build-checks' pass line was at 19415, not 19416.
