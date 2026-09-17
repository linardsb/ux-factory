# S2 — Blueprint auto-layout → `stack`

**Real run, 2026-09-17, 16:20–16:32; branch amended and re-run 2026-09-17 after the PR #428 review
(F1, F7, F9, F10 — see Review amendments).** Ticket [#299](https://github.com/linardsb/ux-factory/issues/299) ·
epic [#295](https://github.com/linardsb/ux-factory/issues/295) ·
`docs/epics/canvas-design-import.architecture.md` § Spikes (S2) and § The intermediate representation.
Executable plan `.claude/plans/canvas-spike-s2-blueprint-stack-299.md`.

Every number below is observed — the driver's verbatim stdout is in `raw/`, one file per leg, and each
table cell names its file. Nothing under `system/`, `tooling/`, `agent-layer/` or `handoff/` was added,
edited or deleted; the branch reads two committed fixture files and nothing else.

**The `al()`/`s()` semantics here come from the fixture plus `04-htmlflex.html`, never from recall.**
`01-knowledge.md` — the Brilliant knowledge spike C loaded — carries no Blueprint auto-layout syntax
reference (its top-level headings are Design Systems, Components, Export & Import, Blueprint Directives,
Blueprint Vectors, Design System: Authoring & Modifying — observed): `blueprint/core`, where `al()`'s
grammar would live, is not in the file. **It is not empty of `al()` though** — its Directives section
*uses* the syntax on four lines (`:682`, `:696`, `:702`, `:752`, observed), in the authoring DSL rather
than a read. Two of them bear on this document and are cited where they do: `:682` under **Not done**
and `:752` under **Could not map**. Every mapping row below is cross-checked against Brilliant's own
resolution of the same nodes into CSS.

## Verdicts

| Q | Verdict | Evidence |
|---|---|---|
| **Does `al(h,y(c),g,pad)` + `s(fill,hug)` land as one token-spaced flex container with no literal?** | **No — not on the whole fixture, and the shortfall is in two different places.** The *spacing* half is as good as the contract allows: **20 of 24** master values and **5 of 7** instance values map by role to a contract token. But **6 values across the two fixtures could not map at all** (all `$spacing.none`, a role the contract does not have), and **one literal the prop set cannot carry does appear** — `s(360,hug)` on the master's two **variant frames**. So this run fires **the decision rule's second leg**, not its first. The branch **emits the literal on the axis and records a `literal-size` drop beside it** — `layout.size.w` may be a **number**, not only `fill`/`hug` (`raw/master.txt:14`, `:45`: `"size":{"w":360,"h":"hug"}`). An earlier draft of this row claimed the branch never emits a literal into the IR; it does, deliberately, because discarding 360 is worse for #304 than carrying it. **A consumer MUST refuse any axis that is not `fill` or `hug` rather than pass it through as a length** (`layout-branch.txt`, the `size` contract) — emitting `width: 360px` from it would put a hardcoded literal on a token-contract surface. The `no-token` class is the one that genuinely omits its slot. Either way, "no literal in the output" was never the same as "lossless", and this document does not round the two together. | `raw/instance.txt`, `raw/master.txt` |
| **What does the contract lack, named exactly?** | **`--spacing-none: 0`.** The contract's scale runs `xs 4 · sm 8 · md 16 · lg 24 · xl 32 · 2xl 48 · 3xl 64 · 4xl 96` (`system/tokens.contract.css:55-62`) with **no zero step**: `grep -rn "spacing-none\|spacing-0\b" system/ agent-layer/ handoff/` → **no matches**, observed 2026-09-17. **No `tokens.source.json` edit was made here** — S2 names it, #301 decides. | `raw/instance.txt`, `raw/master.txt` |
| **What does the mapping cost in fidelity?** | **+4px, on `$spacing.md` only.** Brilliant's `$spacing.md` resolves to **12px**; the contract's is **16px**. Every other mapped role is exact: `xs` 4→4 and `sm` 8→8 are **+0px**. So on the master **6 of 20** mapped values shift by +4px and **14 of 20** do not move at all; on the instance **0 of 5** move. Sign convention pinned in the branch header: **distance = contract − source**. | `raw/master.txt`, `raw/instance.txt` |
| **Is by-role mapping the right strategy, or would nearest-value do?** | **By role, decisively.** `$spacing.md` resolves to 12, which is **exactly equidistant** from the contract's `sm` (8) and `md` (16) — by-value has no answer there. Worse, the C5 mutation shows what by-value actually does to this fixture's zeros: it snaps `0:$spacing.none` to **`--spacing-xs` (4px)**, silently **inventing padding on a node the designer set to zero**, and reports a drop count of **0**. | `raw/controls.txt` (C5 mutation) |
| **Is one literal left that `stack`'s prop set cannot carry?** | **Yes, and it is not a spacing one:** `s(360,hug)` on the master's lines 3 and 11 is a fixed px width on an auto-layout container, which a `size ∈ {fill, hug}` prop cannot express. It prints as a `literal-size` drop rather than being silently coerced. **This is what fires the decision rule's second leg.** The fence is on its *consequence*, not on whether it appeared — but **name those nodes precisely, because an earlier draft called them "component roots" and that understated the question**: `:2` is the component-**set** frame (`fr comp axes[state[active,away]]`) and `:3`/`:11` are its two **variant frames** (`variant(state(active))` / `variant(state(away))`). A variant frame is exactly the auto-layout container `stack` models, so this does **not** settle out to "a node type `stack` never covers". What it settles is narrower and still enough: the question it raises is **#301's prop set** — whether a layout container's size prop needs a fixed-px case beside `fill` and `hug` — not `stack`'s own shape. | `raw/master.txt` ("COULD NOT MAP", lines 3 and 11) |

**The branch taken — leg 2.** The epic's decision rule
(`canvas-design-import.architecture.md:306-308`) reads: *lossless → T3 as written and Q2b stays closed ·
a literal appears → name the token the contract lacks and drop it visibly.*

**Leg 2 fired**, on both of its triggers: six values could not map, and a literal appeared. Its instruction
is carried out in full — the missing token is named exactly (**`--spacing-none: 0`**) and every unmappable
value is dropped visibly in a `drops[]` row the run prints. Leg 1 is **not** available, on either reading
of "lossless": on the broad reading a dropped value is loss by definition, and on the narrow reading
(*lossless ≡ no literal reaches the IR*) `s(360,hug)` still defeats it — and on this branch the literal
literally reaches `layout.size.w` (F2). The variant-frame fence scopes the **consequence** of that
literal, not whether it appeared.

**T3 should still proceed as written — but as this spike's judgement, with a condition, not as leg 1's
automatic consequence.** The judgement: every value that could not map is either a zero the source tool
itself renders as absence, or a container dimension on a node that is not a `stack`. Neither is a reason to
change `stack`'s shape. The condition is one sentence #301 can act on:

> **`ds-stack`'s `components.css` block must declare no default `gap` and no default `padding`.**

Under that condition, omitting an unmappable zero is genuinely lossless. Without it, a source's explicit
zero silently inherits a non-zero default and the omission stops being lossless the moment it ships —
which would be a green check that cannot fail.

**One landmine #301 should know about before it greps.** `ds-stack` does not exist yet (`grep -rn
"ds-stack" system/ agent-layer/ handoff/ docs/` → **no matches**, observed), so the condition above is
forward-looking and nothing violates it today. But **`.vd-stack` already does exist**, at
`system/components.css:2439`, and it is `display: flex; flex-direction: column; gap: var(--spacing-sm)`
— the same shape, one character off the name, **carrying exactly the unconditional default `gap` that
tripwire 1 forbids.** It is genuinely unrelated: hand-authored proto chrome used by `proto/verdant.html`,
`proto/fieldwork.html` and `system/proto.css`, with no `system/specs/` entry and no
`agentic-renderer.mjs` template. That is what makes it worth naming — an implementer asking "is there
already a stack-shaped class?" finds it, and reusing or pattern-matching onto it would reinstate the
failure mode this condition exists to prevent, by name-association rather than by decision.

**Q2b is not settled by this run, and it is not reopened by it either.** Leg 1 would have carried "Q2b
stays closed" automatically; leg 2 does not, so that half has to be stated rather than inherited. Q2b —
*is drag-to-reorder within a frame's layout grammar enough, or is pixel placement needed?* — was closed by
the owner on 2026-08-28 in favour of reorder-within-grammar (`canvas-design-import.prd.md:119`). **Nothing
here argues for reopening it**: the single literal is a **container's own width** (`s(360,hug)` on a
variant frame), not a request to place a part by pixel inside a frame, and every part inside every frame
in this fixture sits in auto-layout flow with no pixel offsets at all. What this run *does* leave open is
the adjacent, smaller question for #301's prop set — **whether a layout container's size prop needs a
fixed-px case beside `fill` and `hug`** — and that question is this document's, not Q2b's.

**What this does not license.** It is a claim about one node tree, drawn by the spike itself, under
Brilliant's default design system, with **every layout slot token-bound**. See **Not done**.

## Setup

- **The branch:** `layout-branch.txt` in this directory — a pure ESM module, no I/O, **importing
  nothing** and containing **no fixture path**. It is the one file #304 lifts (AC #2). It emits the
  architecture's IR `layout` object (`canvas-design-import.architecture.md:165-169`) and reads past every
  non-layout atom on the line. Parked as `.txt` because the ticket says so, **not** because a tracked
  `.mjs` would break: `tooling/drift-check.mjs:31-38` runs `node --check` over `git ls-files "*.mjs"`, and
  `.claude/plans/design-import-spike-c/spike-c-sdk-reach.mjs` is tracked with drift-check green. The `.txt`
  is a decision about what #304 lifts. `node layout-branch.txt` cannot work — Node refuses a `.txt` module
  entry — so both files were copied to the session scratchpad as `.mjs` and run there.
- **The driver:** `driver.txt`, same parking rule. It takes a fixture path on `process.argv`, or
  `--controls` to run the battery instead.
- **The inputs are committed and were not re-read from Brilliant.** No live MCP call, no session binding,
  no spend. `03-blueprint.txt` (the expanded instance `1db1b29957b949ca`) is the ticket's named fixture
  and is treated as primary; `03c-master-blueprint.txt` (the master `6282a5879cdc52a8`) is run as well —
  **see the read-path finding for why that was not optional.**
- **The parser is checked against an independent count.** The driver's count line is **per source atom**,
  not per expanded side, so it is directly comparable to `grep -o '\$spacing\.[a-z]*' <file> | sort |
  uniq -c` over the same file. Both agree exactly:

  | file | grep | driver count line |
  |---|---|---|
  | `03-blueprint.txt` | `none 2 · sm 2 · xs 3` = **7** | `2 nodes . 7 spacing values . 5 mapped . 2 unmapped` (`raw/instance.txt`) |
  | `03c-master-blueprint.txt` | `md 6 · none 4 · sm 8 · xs 6` = **24** | `6 nodes . 24 spacing values . 20 mapped . 4 unmapped` (`raw/master.txt`) |

  Node counts likewise: **2** `al()` nodes on the instance, **6** on the master (2 variants × 3).

## The mapping table

One row per **distinct** source value across both fixtures. `htmlFlex cross-check` is Brilliant's own
resolution of the same node into CSS (`04-htmlflex.html`), read by eye.

| source value | contract token | contract px | distance | htmlFlex cross-check | verdict | raw |
|---|---|---|---|---|---|---|
| `al(h,…)` | — | — | — | `flex-direction: row` (`:3`, `:9`) | `dir: "row"` | `raw/master.txt`, `raw/instance.txt` |
| `al(v,…)` | — | — | — | `flex-direction: column` (`:5`) | `dir: "column"` | `raw/instance.txt` |
| `g(4:$spacing.xs)` | `--spacing-xs` | 4px | **+0px** | `gap: 4px` (`:5`) | mapped by role, exact | `raw/instance.txt` |
| `g(12:$spacing.md)` | `--spacing-md` | 16px | **+4px** | `gap: 12px` (`:3`) | mapped by role, **+4px shift** | `raw/master.txt` |
| `g(0:$spacing.none)` | *(none)* | — | — | **no `gap` property at all** (`:9`) | **DROP `no-token`** | `raw/instance.txt`, `raw/master.txt` |
| `pad(4:$spacing.xs,8:$spacing.sm,4:…,8:…)` | `--spacing-xs` / `--spacing-sm` | 4px / 8px | **+0px** ×4 | `padding: 4px 8px 4px 8px` (`:9`) | mapped by role, exact | `raw/instance.txt`, `raw/master.txt` |
| `pad(8:$spacing.sm,12:$spacing.md,8:…,12:…)` | `--spacing-sm` / `--spacing-md` | 8px / 16px | **+0px, +4px, +0px, +4px** | `padding: 8px 12px 8px 12px` (`:3`) | mapped by role, **+4px on the two `md` sides** | `raw/master.txt` |
| `pad(0:$spacing.none)` *(1-value)* | *(none)* | — | — | **no `padding` property at all** (`:5`) | **DROP `no-token`**, once per source atom | `raw/instance.txt`, `raw/master.txt` |
| `x(c)` under `al(h,…)` | — | — | — | `justify-content: center` (`:9`) | `align.main = "center"` | `raw/instance.txt` |
| `y(c)` under `al(h,…)` | — | — | — | `align-items: center` (`:3`, `:9`) | `align.cross = "center"` | `raw/master.txt`, `raw/instance.txt` |
| *no `x()`* under `al(h,…)` | — | — | — | **no `justify-content`** (`:3`) | `align.main = null` — unset, not defaulted | `raw/master.txt` |
| *no `x()`/`y()`* under `al(v,…)` | — | — | — | **no `align-items`, no `justify-content`**; children carry `align-self: stretch` (`:5`–`:7`) | both `null` | `raw/instance.txt` |
| `s(fill,hug)` | — | — | — | `flex: 1 0 0` and no explicit height (`:5`) | `size {w:"fill", h:"hug"}` | `raw/instance.txt` |
| `s(hug,hug)` | — | — | — | no width, no height (`:9`) | `size {w:"hug", h:"hug"}` | `raw/instance.txt` |
| `s(360,hug)` | — | — | — | `width: 360px` (`:3`) | **DROP `literal-size`** — see verdict 5. The axis **keeps** the literal: `layout.size.w` is `360`, not `"hug"` | `raw/master.txt` |

**The three `al()` shapes, confirmed whole against `04-htmlflex.html`:**

1. **Root row** — `al(h,y(c),g(12:$spacing.md),pad(8:$spacing.sm,12:$spacing.md,8:$spacing.sm,12:$spacing.md))`
   → `04-htmlflex.html:3`: `display: flex; flex-direction: row; gap: 12px; padding: 8px 12px 8px 12px;
   align-items: center;` — **and no `justify-content`.** The branch emits `align {main: null, cross:
   "center"}`. Confirmed on both counts. **This is the syntax the ticket names, and it is on the master,
   not the instance** (see the read-path finding).
2. **Text block** — `al(v,g(4:$spacing.xs),pad(0:$spacing.none))` → `04-htmlflex.html:5`: `flex: 1 0 0;
   display: flex; flex-direction: column; gap: 4px;` — **no `padding`, no `align-items`, no
   `justify-content`**; the children carry `align-self: stretch` (`:6`–`:7`). The branch emits `pad: null`
   and both align axes `null`. Confirmed.
3. **Chip** — `al(h,x(c),y(c),g(0:$spacing.none),pad(4:$spacing.xs,8:$spacing.sm,4:$spacing.xs,8:$spacing.sm))`
   → `04-htmlflex.html:9`: `display: flex; flex-direction: row; padding: 4px 8px 4px 8px;
   justify-content: center; align-items: center;` — **no `gap`.** The branch emits `gap: null` and both
   axes `center`. Confirmed.

**The load-bearing observation in rows 2 and 3:** both `$spacing.none` values appear in Brilliant's own
htmlFlex output as **nothing at all** — the exporter emits no `padding` on the text block and no `gap` on
the chip. So the branch's omission reproduces the source tool's own resolution exactly. **That is evidence,
not the verdict** — it is weighed in the decision below.

## Could not map

Six drops across the two fixtures, in three of the branch's **four** classes. Every one is printed by the run, in a `drops[]` row
carrying `{kind, slot, ref, value, reason}` — never coerced, never silently absent.

**How these relate to the import record's own classes, so #304 does not have to rediscover it.** The
architecture specifies the import record's `drops[]` in **E1's three classes** — *never read · read then
dropped · read but never emitted* (`canvas-design-import.architecture.md:159-160`). That is a different
axis from the `kind` below, which says *why* a value could not be carried. **The first three kinds are
E1's "read then dropped"**: the branch read the value, understood it, and could not express it.
**`unread-al-arg` is E1's "never read"** — the branch saw the token and extracted no meaning from it.
An earlier draft of this paragraph said the branch produces no "never read" rows *by construction*;
that was true only because an unrecognised `al()` argument was silently read past, which is the defect
F1 of the PR #428 review named and which is now closed. The branch still produces **no** "read but never
emitted" rows (nothing it maps is discarded downstream). **A non-layout atom on the line is still not a
drop** — `t()`, `f[]`, `st[]`, `rd()`, `svg()` sit *outside* `al()` and are out of scope, not lost; an
unrecognised argument *inside* `al()` is in scope, in the layout grammar, and unexpressed, which is why
it gets a row and they do not. A converter lifting this branch must fold `kind` into E1's classes, not
substitute it.

| kind | count | where | what the contract lacks | how it is dropped |
|---|---|---|---|---|
| `no-token` | **2** instance, **4** master | `pad[0]` on every "Text block"; `gap` on every "Status chip" | **`--spacing-none: 0`** — the contract's scale starts at `xs 4px` and has no zero step | the slot is omitted from the IR **and** a `drops` row records the ref, the source value and the reason. A pad whose every side is unmappable emits `pad: null` rather than a partial array. **A PARTIALLY mappable pad emits a mixed array**, and a `null` side in it means *"this side was read and could not be mapped"* — never *"leave this side alone"*; its drop row carries the ref and the source value, and a consumer must not read it as zero or as unset. So `pad` has **three** shapes: a full four-side array, a mixed array with `null` holes, and `null`. Neither fixture contains a mixed one, but `01-knowledge.md:752` draws the shape (`pad($spacing.xs,$spacing.none,$spacing.none,$spacing.none)`), so it is authorable in Brilliant, not hypothetical. |
| `literal-size` | **2** master | `size.w` on the two variant frames "Frame 1" (`:3`) and "Frame 2" (`:11`) — `s(360,hug)` | nothing — this is a **prop-set** gap, not a token gap: `size ∈ {fill, hug}` cannot carry a fixed px | recorded as a drop and printed; **not** coerced to `hug` or `fill` |
| `qualifier-dropped` | **0 on both fixtures** | — | — | implemented and proven by control **C6**; see **Not done**, because **no `al()` node in either fixture carries `hug:N`** |
| `unread-al-arg` | **0 on both fixtures** | — | nothing — this is a **branch** gap, not a contract gap: an `al()` argument S2 has no mapping for | the argument is recorded in `drops` with its verbatim text and reaches no IR slot. Every `al()` argument in both fixtures is `h`/`v`/`x()`/`y()`/`g()`/`pad()`, so no committed run reaches it — but Brilliant documents **"wrap and its cross-axis gap"** as auto-layout syntax (`01-knowledge.md:606`), so this is a live class of input. Proven by control **C7**; added after the PR #428 review (F1), where it was read past silently |

Evidence: `raw/instance.txt` and `raw/master.txt`, "COULD NOT MAP" sections; `raw/controls.txt` for C6.

**The two regenerators #301 will owe** if it decides to add `--spacing-none: 0`: the token goes into
`system/tokens.source.json` (contract group), then **`node agent-layer/gen-token-css.mjs`** and
**`node agent-layer/gen-handoff.mjs`** both run and their outputs are committed in the same PR
(CLAUDE.md §Where new code goes, and memory `token-change-regen-handoff-pack`). Neither was run here and
no `tokens.source.json` edit was made — naming the token is S2's job, adding it is #301's.

## The decision, and its condition

`$spacing.none` admits two readings and the fixture supports both:

- **"Absence suffices."** An unmappable zero is omitted; the IR carries no `gap`/`pad` for that slot; the
  renderer emits no property. **Brilliant's own exporter does exactly this** (`04-htmlflex.html:5` and
  `:9` carry no `padding` and no `gap` respectively), so the round trip is faithful to the source tool.
- **"Every set value is a token."** The designer *set* zero; a converter that cannot represent "set to
  zero" has lost information, and the contract should carry `--spacing-none: 0` so the IR can say so.

**The verdict takes "absence suffices" — conditionally.** For this fixture the two readings are
observationally identical: padding does not inherit, and the nodes carrying `$spacing.none` are children
with nothing to override. The discriminating question is not about the converter at all:

> **Does `stack` need "explicitly zero" distinct from "unset"?**

**For #301, today: no — provided `ds-stack`'s `components.css` block declares no default `gap` and no
default `padding`.** The answer flips to **yes** the moment either of these becomes true, and #301 should
treat both as tripwires:

1. `ds-stack` ships with a default `gap` or `padding` in its CSS block. Then an omitted slot inherits a
   non-zero value and a source's explicit zero is silently overridden.
2. The override format (G2) must zero a base value. An override that means "no gap here" cannot be
   expressed by omission, because omission means "inherit".

**Carrying the condition is more useful to #301 than a bare "lossless"**, because a bare lossless is
exactly the kind of claim #301 could invalidate by adding one line of default padding without ever seeing
this document.

## Adjacent observations — explicitly NOT verdict inputs

S2 is the layout branch alone. These were seen while reading the fixture and are recorded so they are not
rediscovered later; **none of them fed the verdict**, and letting one do so would answer a question the
ticket did not ask.

- **`rd(9999:$radius.full)` has no contract token.** The radius scale is `sm 4 · md 8 · lg 16`
  (`system/tokens.contract.css:65-67`) — no full/pill step; `grep -rn "radius-full\|radius-pill"
  system/ agent-layer/ handoff/` → no matches, observed. It is on both Status chips. A radius branch will
  hit this; the layout branch does not read `rd()` at all.
- **`s(8.73,16)` on the Chevron** is a fractional px literal. The chevron is an `svg()` node with no
  `al()`, so the layout branch never reads it.
- **`s(360,hug)` on the master's two variant frames** is **not** in this section — it is a verdict input,
  because it *is* a layout-slot value the branch reads, and it is what fires leg 2. It is listed here only
  to say where it went: the verdicts table and the mapping table. Its fence is on the consequence — what it
  changes is #301's prop set, not `stack`'s shape.

## The read-path finding, for #304

**The expanded-instance blueprint read omits the instance root's own `al()`.** `03-blueprint.txt:2` is:

`1db1b29957b949ca inst("Spike List Row") at(state(active)) p(16,288) s(360,hug) "Frame 1" #spikec_inst`

— no `al()`. Yet `04-htmlflex.html:3`, of **the same instance**, carries `display: flex; flex-direction:
row; gap: 12px; padding: 8px 12px 8px 12px; align-items: center;`. Quantified: **`$spacing.md` appears
0× in the instance read and 6× in the master** (`raw/instance.txt` vs `raw/master.txt`, and the
independent grep in Setup).

**And the root it omits the `al()` from still carries `s(360,hug)`** — the same literal that fires leg 2
on the master. The branch never sees it, because `isAl` filters the line out for having no `al()`. So a
converter reading only the expanded instance loses the root's layout intent **and never learns the
`literal-size` case exists at all**: it would report **zero** drops on a design that has two. That is a
sharper argument for the same conclusion than the paragraph below, and it costs nothing — the evidence is
the line already quoted.

**Consequence for #304: a converter reading an instance must also read its master** (or cross-read
`htmlFlex`), or it loses the root's layout intent entirely — for this fixture, the row's direction, its
12px gap, its 8/12 padding and its `align-items: center`, which is the majority of the design's layout.

This **narrows** spike C's Q2 call — "Blueprint is the better converter input"
(`design-import-spike-c/README.md:13`) — on one axis. It is **not a reversal**: the blueprint is still the
only read shape carrying roles, intent, component identity and variant axes. It is that the *expanded
instance* read alone is not a complete layout source, so the converter's input is a **pair**, not a file.

**It is also why this run covers both fixtures.** The ticket cites the syntax `al(h,y(c),g,pad)`; that
form is **only in `03c-master-blueprint.txt`**. Running the ticket's named fixture alone would never have
touched the syntax the ticket names.

## Proving the checks

Seven controls and six positive controls, all synthetic — no fixture is read by the battery. **Every
control was observed both green and red**, and both halves are in `raw/controls.txt` verbatim: half 1 is
the pristine battery, half 2 applies each mutation in turn, re-runs, and restores. The mutation harness is
`raw/mutations.source.txt`; its own control is that it prints `MUTATION DID NOT APPLY` for a no-op
replacement — `grep -c "DID NOT APPLY" raw/controls.txt` → **0**, so all six landed.

| control | mutation | what went red | positive control |
|---|---|---|---|
| **C1** an unmapped role lands in the drop list | delete the `drops.push` branch in `toStack`'s spacing helper so a miss falls through | `C1 FAIL — expected 1 drop, got 0 :: slot=undefined` | **PC1** — a mappable role (`4:$spacing.xs`) gives 0 drops and 1 emitted row with `--spacing-xs` |
| **C2** the zero case is recorded, never swallowed — **the discriminating check** | the same deletion scoped to the pad path, where `$spacing.none` lands | `C2 FAIL — $spacing.none drops=0 (expected 1)`, while `layout.pad` stays `null` — i.e. the IR looks **identical** to the correct output and only the drop record distinguishes them | **PC2** — a fully mappable node emits all four pad sides and both align axes with 0 drops |
| **C3** the distance arithmetic is real | hardcode `distance: 0` in `mapSpacing` | `C3 FAIL — expected distance 4, got 0` (C5 collateral: `expected -8, got 0`) | `12:$spacing.md` → `--spacing-md`, 16px, **+4px** |
| **C4** the splitter reads nested parens | replace `split(s)` with the naive `s.split(",")` | `C4 FAIL — expected 4 al args, got 7 :: expected 4 pad entries, got null :: parseAl threw: unterminated pad(` (PC2 collateral) | the 4-value `pad()` inside `al()` parses to exactly 4 entries on every real node |
| **C5** mapping is by **role**, not by value | replace the role lookup with a nearest-value search over `SPACING` | `C5 FAIL — expected --spacing-md, got --spacing-lg` — and the collateral is the finding: `C2 FAIL` with `layout.pad` now `[--spacing-xs ×4]`, i.e. **by-value snapping turns the designer's explicit 0 into 4px of padding and reports 0 drops** | by-role on the synthetic `24:$spacing.md` gives `--spacing-md` at **−8px**; the sign also self-checks (a `+8` would mean the convention is flipped) |
| **C6** `hug:N` → `hug` and the qualifier is recorded | `parseSize` keeps the raw `hug:100` on the axis and records nothing | `C6 FAIL — size.h="hug:100" (expected "hug") :: qualifier drops=0 (expected 1)` | `s(fill,hug:100)` → `size.h === "hug"` plus one `qualifier-dropped` row carrying `value: 100` |
| **C7** an unmappable `al()` argument is **dropped, not read past** — added after the PR #428 review (F1) | restore the silent read-past: `parseAl` discards the unknown argument instead of collecting it | `C7 FAIL — unread-al-arg drops=0 (expected 1) value=undefined :: total drops=0 (expected 1)` — the IR is **identical** to the correct output and only the drop record separates them, the same discriminating shape as C2 | **PC6** — a node whose every `al()` argument *is* mappable produces **no** `unread-al-arg` row and 0 drops, so C7 cannot be satisfied by a branch that drops every argument |
| — | — | — | **PC3** — the axis swap: the same `x(c),y(s)` gives `{main:center, cross:start}` under `h` and `{main:start, cross:center}` under `v` |
| — | — | — | **PC4** — an unterminated `al(` throws a plain `Error` naming the line |
| — | — | — | **PC5** — `args()` does not find the `g(` inside `svg(`. **One** line of each fixture carries an `svg(` (the Chevron, `03-blueprint.txt:10` and `03c-master-blueprint.txt:10` — `grep -c 'svg('` → 1 and 1, observed), and **no code path in this PR reaches it**: `parseAl` calls `args(p,"g")` on an already-isolated `g(...)` part, and `args(line,"s")` finds `s(360,hug)` first either way. On these fixtures the boundary test is **defensive, not load-bearing** — an earlier draft of this row, of `layout-branch.txt` and of the plan's amendment A5 said "three master lines" and claimed it load-bearing. It is kept because #304's first differently-drawn source may need it |

C5's mutation reddens four controls, C4's three, C3's two; C1, C2, C6 and C7 redden exactly one each
(counted from `raw/controls.txt`, observed). That is expected — the wider mutations break shared code —
and each control's **own** named red is the one quoted above.

## Not done

- **`al(v,…)` with an `x()` or `y()`.** The axis swap is implemented and proven by **PC3 on synthetic
  input only** — **no node in either fixture exercises it.** The two `al(v,…)` nodes carry no alignment
  at all, and both `x(c),y(c)` nodes are `al(h,…)`.
- **`start`, `end` and `space-between` alignment.** Only `c` → `center` appears in either fixture. `s`/`e`
  → `start`/`end` are the obvious reading, implemented, **untested against a real read**. `space-between`
  is in the IR's value set and has **no implementation and no evidence** — no source letter is known for it.
- **`hug:N` on a layout node.** The form appears on **3 nodes of the primary fixture and 6 of the master**
  (`grep -c 'hug:100'`) — but always on a **text child**, never on an `al()` node, so the layout branch
  never reads one: `grep 'al(' <both> | grep -c 'hug:'` → **0**. Handled by C6 on synthetic input; **not
  exercised by real data.**
- **The 2-value `pad()` form.** Present in the authoring DSL (`02-fixture.dsl.txt:5`, `:10`) and **never
  in a read** — Brilliant expands it before the blueprint read (`pad($spacing.sm,$spacing.md)` →
  `pad(8:$spacing.sm,12:$spacing.md,8:$spacing.sm,12:$spacing.md)`). Implemented as `[v,h,v,h]`,
  unexercised.
- **The 1-value `pad()` form's expansion rule is asserted, not confirmed.** Unlike the 2-value form, the
  1-value form **does** survive into the read (`pad(0:$spacing.none)`, 1× instance and 2× master). The
  branch expands it to all four sides by CSS shorthand convention — but **neither committed fixture can
  discriminate it**, because the only 1-value pad in a *read* is zero, and zero on one side is zero on four.
  **A non-zero 1-value pad does exist in this directory** — `01-knowledge.md:682`, `al(h,pad($spacing.sm))
  after(#logo) parent(#nav) "Search"` (an earlier draft of this bullet said none did). **It still does not
  settle the rule**, for the same reason the 2-value form above is listed as unexercised: it is the
  *authoring DSL*, and Brilliant expands a 2-value authored pad before the read
  (`pad($spacing.sm,$spacing.md)` → four values in `03c-master-blueprint.txt:3`). What the 1-value authored
  form expands to **in a read** is exactly what is unobserved, and only a read of a non-zero 1-value pad
  can show it. `:682` is the line to draw if #304 wants one.
- **An `al()` node with no `s()`, and an `al(` behind non-boundary whitespace.** Neither occurs in either
  fixture — every al-line carries an `s()`, and every `al(` sits on a parser boundary — so **both paths are
  unexercised by real data.** Both crashed the driver before the PR #428 review (F7) and are now guarded and
  reported rather than fatal: a missing `s()` prints `(no s() on the line)`, and a line the parser refuses
  prints `SKIPPED -- al( is not on a parser boundary`. The driver's selector (`isAl`, regex `\s`) is
  deliberately **wider** than the parser's gate (`isBoundary` — space, tab, comma, `(`); narrowing it to
  match would make such a line vanish silently instead of being reported. `01-knowledge.md:682` draws an
  `al()` with no `s()`.
- **An argument list ending in a comma.** `split()` dropped a trailing empty segment before the review
  (F9) — `split("a,b,")` gave `["a","b"]` where the native `"a,b,".split(",")` gives `["a","b",""]`, so an
  `al()` or `pad()` list ending in a comma would have lost its last slot and C4's arity assertion would have
  read one short. Closed; **no argument list in either fixture ends in a comma**, so nothing here exercises
  it either way.
- **The unbound / by-value snap path (G18).** This fixture is token-bound on **every** layout slot, so the
  snap table is #304's, not S2's. The branch returns `null` for an unbound value with a reason naming G18,
  and C5 exists to keep a by-value regression out.
- **Every non-layout branch.** `f[(…tok(color.*))]`, `t(…)` typography, `st[…]` strokes,
  `rd(9999:$radius.full)`, `svg(icon:…)` are read past by design.
- **A second, differently-drawn source.** One node tree, drawn by the spike itself. Spike C already
  flagged the live assumption (PRD: *"that a designer-drawn Brilliant source is token-bound … the session
  default is unbound"*). **S2 says nothing about an unbound source.**
- **`import/ir.mjs`, `import/brilliant.mjs`, `import/snap-rules.mjs`** — the `import/` directory does not
  exist and this ticket did not create it (`ls import/` → No such file or directory, observed). The branch
  is parked here for #304 to lift.
- **A live Brilliant MCP call.** The fixture is committed; no spend, no session binding.
- **`build-checks`, the journey drivers and the pixel gate were not run**, because none of them can reach
  this ticket: it touches no `system/` file, no shipped page and no generated artifact
  (`.claude/references/gates.md`). `node tooling/drift-check.mjs` was run and is green.

## Review amendments (PR #428)

The review of PR #428 found ten issues; all ten are folded in above rather than deferred. Four changed
code, and the run was repeated for all three `raw/` files:

| # | what it was | where it landed |
|---|---|---|
| **F1** | an `al()` argument the branch did not recognise vanished — no drop row, no IR trace, a clean count line | a fourth drop kind `unread-al-arg`, control **C7** and positive control **PC6**, the drops-table row above, and the corrected E1-class paragraph |
| **F2** | *"the branch never emits a literal into the IR"* was false — `raw/master.txt:14` shows `"size":{"w":360,…}` | verdict row 1 rewritten; the `size` contract stated in `layout-branch.txt` for the consumer |
| **F3** | *"a non-zero 1-value pad … none exists here"* was false — `01-knowledge.md:682` | the Not-done bullet names the line and says why it still cannot settle the read form |
| **F5** | a partially mappable pad emitted `null` holes with no documented meaning | the `no-token` row and the branch header now state what a `null` side means; `01-knowledge.md:752` shows it is authorable |
| **F6** | the `svg(` count was wrong in four places, no two agreeing — it is **1** per fixture | corrected in the PC5 row, in `layout-branch.txt`, and as amendment **A6** in the plan; the boundary test is kept but is **defensive** on these fixtures |
| **F7** | the driver crashed on an `al()` node with no `s()`, and on an `al(` behind non-boundary whitespace | both guarded and reported; a Not-done bullet each |
| **F8** | `.vd-stack` already ships the default `gap` the T3 condition forbids, one character from `ds-stack` | named beside the condition as an unrelated, similarly-shaped landmine |
| **F9** | `split()` dropped a trailing empty argument, against its own header | closed; Not-done bullet |
| **F10** | `expandPad`'s throw was the only Error in the file that could not name its input | the line is passed in |
| **F4** | `Closes #299` over an unticked AC #3 (the verdict comment on epic #295) | closed: the verdict is [posted on epic #295](https://github.com/linardsb/ux-factory/issues/295#issuecomment-5720021289) (owner-confirmed, 2026-09-17), and all three of #299's ACs are ticked |
| **N1** | *"the master's two component roots"* was loose (`:3`/`:11` are **variant frames** of the component set at `:2`), and the read-path finding had a free second consequence | both folded into the verdicts table and the read-path section; a variant frame *is* an auto-layout container, which narrows the fence rather than widening it |

**What the re-run showed.** `raw/instance.txt` and `raw/master.txt` came back **byte-identical** to the
committed originals (`diff` empty, observed). That is a control on the fixes' scope, not a formality:
every `al()` argument in both fixtures is recognised, no fixture line lacks `s()`, and no argument list
ends in a comma, so **F1, F7 and F9 are all unreachable on real data here** — which is why the review
found them by probing rather than from a red run. Only `raw/controls.txt` changed, and it changed because
the battery grew by one control and one positive control.

## Files

| file | what |
|---|---|
| `layout-branch.txt` | the converter's layout branch — pure ESM, imports nothing, no fixture path. **The one file #304 lifts** (AC #2). Parked as `.txt` per the ticket |
| `driver.txt` | the runner and the control battery, parked as `.txt`; run as `.mjs` from the scratchpad |
| `raw/instance.txt` | verbatim stdout over `03-blueprint.txt` — 2 nodes, 7 spacing values, 5 mapped, 2 unmapped |
| `raw/master.txt` | verbatim stdout over `03c-master-blueprint.txt` — 6 nodes, 24 spacing values, 20 mapped, 4 unmapped, plus 2 `literal-size` drops |
| `raw/controls.txt` | both halves of the battery — 7 controls + 6 positive controls green, then each control observed red under its own mutation |
| `raw/mutations.source.txt` | the scratchpad mutation harness, for reproducibility |
