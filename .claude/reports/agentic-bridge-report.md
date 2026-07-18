# Implementation Report — Agentic bridge (component vocabulary · declarative renderer · action bus)

**Plan**: `.claude/plans/agentic-bridge.md`   **Branch**: `feature/agentic-bridge`   **Status**: COMPLETE

Implements https://github.com/linardsb/ux-factory/issues/11 (`Closes #11`) · Epic #1, architecture §Agentic UI.

## Summary

Built the three-part bridge that makes the design system consumable by agents: a zero-dep generator
(`gen-vocabulary.mjs`) that projects the six committed ComponentSpecs into one name-keyed
`vocabulary.json`; a vanilla declarative renderer (`agentic-renderer.mjs`) that validates a
`{name, props, children}` composition against that vocabulary and refuses anything out of it with a
path-naming Error, then builds real components with `createElement`/`textContent` only; and a DOM-free
action bus (`action-bus.mjs`) carrying one bidirectional `ui.*`/`agent.*` contract so pointer, keyboard,
agent — and voice later — are interchangeable modalities. A bare harness page (`agentic.html`) renders a
hand-authored composition as real, fully-styled components, runs a five-case refusal gallery, and logs
bus traffic in both directions. All four ACs met and verified in a real browser.

## Tasks completed

- Vocabulary generator → `agent-layer/gen-vocabulary.mjs` (CREATE) — `genVocabulary()`, mirrors `gen-handoff.mjs`
- Build registration → `agent-layer/build.mjs` (UPDATE) — import + call + aligned `✓` line, after `genHandoff`
- Generated artifact → `handoff/verdant/vocabulary.json` (CREATE, committed) — 6 components, contracts inlined
- Action bus → `system/action-bus.mjs` (CREATE) — `createBus()`; header documents the full contract (AC #4)
- Declarative renderer → `system/agentic-renderer.mjs` (CREATE) — `validateComposition()` + `renderComposition()` + six templates
- Harness page → `agentic.html` (CREATE) — honesty strip, composition panel, refusal gallery, bidirectional log + agent controls
- Architecture map → `CLAUDE.md` (UPDATE) — `system/` renderer+bus line, `handoff/` vocabulary note (surgical)

## Tests added

No suite in this repo (ground rule). "Done" = run the surface. Evidence captured:

**Renderer refusal battery (AC #2 — the managed-freedom evidence), run under Node:**
```
refused: composition: unknown component "hero-banner" (vocabulary: care-task-row | plant-card | primary-button | screen-header | stat-tile | status-chip)
refused: composition.props.value: "wet" is not in enum [ok | due | overdue]
refused: composition.props.variant: "variant" is not a prop of primary-button (allowed: label | disabled)
refused: composition.children[0]: "primary-button" is not an allowed child of plant-card (allowed: status-chip)
refused: composition.children[0].props.value: "overdue" competes with the parent plant-card's status "ok" — one signal per card; an explicit status-chip may only relabel the derived state, not change it
ACCEPTED  (the valid override case: child value == parent status)
```
Extended edge cases all behaved: single-node root & array root accepted; derived-chip row accepted;
no-species monogram card accepted; child-under-primary-button refused; two-children refused; malformed
child prop refused at the child path; missing-required refused; wrong-type refused; non-boolean refused.

**Bus round-trip (Node):** emit/on to exact + `*` handlers (2 hits); malformed `type` throws; unsubscribe
works; a throwing handler is isolated (sibling still runs); bad `source` throws.

**Browser (agent-browser, `npx serve .` → `/agentic`):**
- Composition renders as real `vd-*` components, **fully styled** — overdue chip computed `background-color:
  rgb(37,99,235)` (accent fill from #8's CSS); explicit override shows "3 DAYS OVERDUE", derived row chip
  shows "OVERDUE"; card escalates with `is-overdue`; check circle fills on toggle.
- Accessible names correct: link "Monstera, overdue", checkbox "Water Monstera, overdue", h1 "Today".
- Refusal gallery: 5 rows, all refused with path-naming messages.
- Bus: pointer click on plant-card → `ui.intent / pointer / plant-card / {intent:open,name:Monstera}`;
  keyboard (focus+Enter) on care-row → `ui.intent / keyboard / care-task-row / {intent:toggle,checked:true,type:water,plantName:Monstera}`;
  agent "check all rows" → `agent.set-checked / agent`, both rows re-render checked; agent "swap composition"
  → `agent.render / agent`, alternate composition renders (My plants, showBack, derived-chip + monogram cards).

## Validation results

- **Level 1 (syntax):** `node --check` on all three new modules + `build.mjs` → SYNTAX-OK.
- **Level 2 (unit):** `gen-vocabulary.mjs` standalone prints `vocabulary ✓ 6 components`; artifact spot-check OK
  (6 components, `plant-card.contract.title === "Plant"`, `children[0] === "status-chip"`, `care-task-row`
  prop is `type` with enum `water|fertilise|repot|inspect`); bus + renderer batteries above.
- **Level 3 (integration):** full `build.mjs` from the jobs folder (`_factory/kb/decisions/trainline.md`) →
  all `✓` lines including `vocabulary ✓ 6 components` slotted after `handoff pack`; coexists with every generator.
- **Level 4 (manual browser):** checklist all green (above).
- **No regressions:** `derive.html`, `scenarios/check.html`, `proto/verdant.html` still serve.

## ⚠️ Commit guard (read before `piv-commit` — load-bearing, not tidiness)

The committed specs and `handoff/verdant/vocabulary.json` **must agree on `status`**. They agree now (both
`"spec"`) *only* because the working tree's spec-flip to `"shipped"` stays **unstaged**. Two ways this
silently breaks:

1. **Stage-all (`git add -A`/`.`)** sweeps the working tree's `"shipped"` specs into the commit → committed
   specs `"shipped"` while `vocabulary.json` says `"spec"` → non-reproducible (and bundles #8's work).
   **Stage the seven #11 files by explicit path** (below), never `-A`.
2. **Any regen in this dirty tree** (`node agent-layer/gen-vocabulary.mjs`, the full `build.mjs`, a hook, a
   validate step) reads the working tree's `"shipped"` specs and **overwrites** the committed-source `"spec"`
   artifact. Do **not** regenerate `vocabulary.json` in this tree before committing; the reproducible copy is
   already on disk.

**Right before committing:** confirm `grep -c '"status": "spec"' handoff/verdant/vocabulary.json` (expect 6)
== the status of the specs actually in the commit (HEAD specs are all `"spec"`). Both `"spec"` → ship. If a
parallel #8 commit has since flipped HEAD specs to `"shipped"`, regenerate `vocabulary.json` first so they
match again.

The seven files to stage: `agent-layer/gen-vocabulary.mjs`, `agent-layer/build.mjs`, `system/action-bus.mjs`,
`system/agentic-renderer.mjs`, `agentic.html`, `handoff/verdant/vocabulary.json`, `CLAUDE.md`.

## Deviations from the plan

The plan assumed ticket **#8 had not landed**. In fact it largely has: at HEAD (`4a3997b`) #8's `vd-*`
component CSS is **committed** in `system/components.css` (48 refs) and the six spec heads are committed
(as `status: "spec"`). The working tree additionally carries #8's *in-flight, uncommitted* changes — the
canonical DOM in `proto/verdant.html`, one more CSS tweak, and the specs flipped `status: "spec"` → `"shipped"`
(observed flipping mid-session — a parallel #8 build in the shared tree). Every deviation below follows from
that reality and was confirmed with the advisor.

1. **Prop-name reconciliation (would have broken the composition).** The plan's Template DOM contracts,
   bus table, and hand-authored composition used `action` for `care-task-row`, but the real spec/vocabulary
   prop is **`type`** (enum `water|fertilise|repot|inspect`). The plan's composition also used `"mist"`,
   which is not in that enum. Fixed: `action`→`type` everywhere; the second row's `"mist"`→`"fertilise"`.
   Bus params emit `type` (not `action`) to keep one source of truth.

2. **Templates match #8's shipped CSS, not the plan's pinned DOM.** The plan pinned short unprefixed child
   classes (`.check`, `.label`, `.thumb`, `.name`), variant-as-plain-class (`vd-status-chip due`), and
   `data-status`. #8's shipped CSS + `proto/verdant.html` instead use **fully-prefixed** children
   (`.vd-task-check`, `.vd-plant-thumb`, `.vd-plant-text`/`.vd-plant-name`/`.vd-plant-species`, `.vd-stat-*`,
   `.vd-screen-title`, `.vd-header-affordance`), **`is-*`** state/variant classes (`.vd-status-chip.is-due`,
   `.vd-plant-card.is-overdue`, `.vd-care-task-row.is-checked`), and stat-tile's `label → reading(glyph,value,
   unit)` nesting. Since #8's CSS is what actually styles the output, the templates realize **that** DOM —
   exactly the coordination the plan's Forward-references anticipated ("the coordination point is the specs'
   Data binding prose, which both implement"). Result: the composition renders fully styled (verified).
   `aria-label` follows the spec/proto (`"${name}, ${status}"`). Templates stay **props-only** — no `id`/
   `data-*` (those are contract-only fields), `href="#"` + `preventDefault` for the card.

3. **Reproducibility + honesty (committed-state, not transient).** The committed base (`HEAD`, `4a3997b`)
   has #8's `vd-*` CSS **committed** in `components.css` (48 refs) but the six specs committed as
   `status: "spec"` — CSS-present and status are decoupled. Two fixes so the committed #11 is self-consistent
   and reproducible ("deploy = commit the artifacts / regenerate to reproduce"):
   - **Vocabulary emits `status: "spec"`** — regenerated from the *committed* specs (via a detached temp
     worktree at HEAD, so the shared dirty tree was never disturbed), not from the working tree's in-flight
     `"shipped"`. So `node agent-layer/gen-vocabulary.mjs` on a clean checkout of the #11 commit reproduces
     the committed artifact byte-for-byte. (Diff between the two was exactly the six `status` fields.)
   - **Capability strip probes actual CSS presence**, not the spec `status` field (which is misleading here).
     `vdCssLoaded()` scans the loaded stylesheets for a `.vd-` rule; since #8's CSS is committed at HEAD it
     resolves true → "fully styled" (verified). This is the advisor's "base it on rendering reality, not
     status," and it stays honest on any checkout (says "unstyled real DOM" only if the CSS is genuinely
     absent).

4. **Ancestry pre-flight adapted.** `git merge-base --is-ancestor d656f05 HEAD` fails, but that check was a
   proxy for "are the specs present" — they are (via epic-snapshot `4a3997b`), proven by a green
   `gen-handoff` run. Proceeded on that basis.

5. **Minor:** glyphs are minimal inline SVGs (per the plan) rather than #8's emoji — structurally compatible
   with #8's CSS (which only sets `color` on the glyph span) and they respect the token via `currentColor`.
   Added a third harness control ("reset composition") beyond the plan's two agent buttons — a convenience
   that emits `agent.render` back to the default, keeping everything on the bus.

## Issues encountered

- **Shared working tree / concurrent #8 session.** The specs flipped `spec`→`shipped` *during* this session
  (observed between two greps), consistent with a parallel #8 build in the same working dir (see the
  shared-worktree memory). Handled by matching #8's reality and by keeping this ticket's files separable.
  **For `piv-commit`: stage ONLY the seven #11 files by explicit path** — `agent-layer/gen-vocabulary.mjs`,
  `agent-layer/build.mjs`, `system/action-bus.mjs`, `system/agentic-renderer.mjs`, `agentic.html`,
  `handoff/verdant/vocabulary.json`, `CLAUDE.md`. Do **not** sweep in the concurrent #8 / other-ticket
  changes also dirty in the tree (`system/specs/*.md`, `system/components.css`, `handoff/verdant/pack.json`,
  `proto/`, `docs/epics/…architecture.md`, other `.claude/plans/*`, reports, `traces/`, `portal/…trace…`).
  Note: `CLAUDE.md` also already carries #8's uncommitted `proto/` map line (added before this ticket
  touched the file); `git add CLAUDE.md` will include it. Benign — it's a legitimate map entry and both
  tickets land off the same integration base — but flag it if the reviewer expects a #11-only CLAUDE.md diff.
- **Committed #11 is self-consistent (verified against HEAD state).** #8's `vd-*` CSS is committed at HEAD,
  so a clean checkout of #11 (its 7 files atop HEAD) renders **styled** — the capability probe reports
  styled, matching the render, and the `"spec"` vocabulary reproduces from the committed `"spec"` specs.
  When #8 later flips the specs to `"shipped"`, that commit regenerates `vocabulary.json` → `"shipped"`;
  the capability probe is unaffected (still keyed to CSS presence). No dependency on #8's *uncommitted*
  working-tree edits remains.
- Removed a stray untracked `--full-page` file (a leaked CLI flag written as a filename by some earlier
  command; not part of any ticket).

## Plan Open Questions — resolutions (for AMENDMENTS)

1. **#8 CSS** — RESOLVED: #8's `vd-*` CSS is committed at HEAD (specs still `"spec"`); compositions render
   fully styled; the capability strip probes actual CSS presence (not spec status), and `vocabulary.json`
   emits `"spec"` so it reproduces from committed source.
2. **Vocabulary location** — as planned: `handoff/verdant/vocabulary.json` (name-keyed object; renderer is
   the primary consumer). `pack.json` untouched.
3. **Chip rule** — implemented as planned (derived-with-override; competing value refused).
4. **Bus contract in the module header** — as planned.
