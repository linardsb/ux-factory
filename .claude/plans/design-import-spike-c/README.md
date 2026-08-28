# Spike C — the Brilliant read path, one component through the spec chain, and the SDK reach test

**Real run, 2026-08-27, 22:17–22:30.** Shape as re-cut in `__canvas_planning_PRD.md` §15 (now
`.claude/plans/canvas-import-prd-briefing.md`). Every number below is observed (`date +%T` stamps in
`timings.txt`; tool outputs verbatim in the numbered files). Nothing here is committed into `system/`,
`handoff/` or `tooling/` — the draft was run through the chain, copied out, and reverted.

## Verdicts

| Q | Verdict | Evidence |
|---|---|---|
| **Q1** Does the blueprint carry token references or resolved literals? | **Both, on every tokenizable slot** — the reference AND the resolved value per mode: `g(12:$spacing.md)`, `pad(8:$spacing.sm,12:$spacing.md,…)`, `rd(6:$radius.md)`, `t(…,Manrope:$font.family,16:$font.size.md,sb,lh(1.5:$font.lineHeight.normal))`, `w(1:$stroke.width.subtle)`, and fills as `tok(color.text.secondary,#575757,dark(#C6C6C6),high-contrast(#454545))`. Role names by NAME, so role mapping onto the contract is deterministic. | `03-blueprint.txt`, `03c-master-blueprint.txt` |
| **Q2** Which read shape is the better converter input? | **Blueprint.** It alone carries roles, auto-layout intent (`al(h,y(c),g,pad)`, `hug`/`fill`), component identity with variant axes (`comp axes[state[active,away]]`, `inst(…) at(state(active))`), the override as an override, and icons by Phosphor NAME. `htmlFlex` is the best *fallback*: semantic flex + real text + inline SVG + `data-component`/`data-instance-of`, but literals only. `react` is absolute-positioned (no flex, no intent). `svg` is a rendering (three base64 `@font-face` blocks, 383 KB). | `04`–`06`, table below |
| **Q3** Can a portal-style Agent SDK run reach the Brilliant MCP? | **Yes, first try, 7.8 s end to end.** `mcpServers: { brilliant }` passed explicitly (the SDK does not read `~/.claude.json`); init reported `{name:"brilliant",status:"connected"}` and 17 `mcp__brilliant__*` tools; the agent called `lookup` once, the fence denied nothing, the reply was the element's name. | `12-sdk-reach-output.txt`, `spike-c-sdk-reach.mjs` |

**§15 decision-rule outcome, one line:** *blueprint carries token refs → deterministic role mapping,
commit to it; the SDK reaches the MCP → the in-process recorded-run path is viable, no CLI-shaped
handoff needed.* Figma `--from` stays a second source, not the MVP's only one.

**Draft cost vs spike B:** recognition → all 27 groups green in **2:45** (22:25:12 → 22:27:57), against
spike B's 5:32 (which included commit, push, loc regen and a fresh-worktree `npm ci`). Same finding: the
time is the judgement prose (1:45 for spec + CSS + template in one agent turn, of which the spec's
Usage/Accessibility sentences are nearly all of it); the plumbing is seconds; the gates named their own
fixes.

## Setup

- Brilliant **web editor** (not desktop): `init` bound to canvas `playground`, session `mcp:9ceb7647595615f9`, `list_projects` → `[]` (no named project exposed). Consequences observed: `export` refuses `outputPath` (no filesystem), so PNG comes back inline only; `capture_ui`/`render_ui` are desktop-only and were not needed — the briefing's §12 correction stands in practice.
- Design system: the project's `default` DS (Brilliant's own), token discipline enforced under `designSystem:"default"`. **The session defaults to sovereign (`none`) mode** — a human's hand-drawn design is token-bound only if they chose the DS. Q1's "yes" is conditional on that; unbound sources fall back to by-value mapping (`pack-import.mjs` + spike A's five fixes).
- Fixture left on the canvas for the owner: lib `e53951d9e7dfb4bd` "Spike C fixture" → master `6282a5879cdc52a8` "Spike List Row" (`comp axes[state[active,away]]`) → instance `1db1b29957b949ca` "Frame 1" (`at(state(active))`, `override(#spikec_status) t("On call")`). DSL as sent: `02-fixture.dsl.txt`.

## Timings

| step | start → end | delta | note |
|---|---|---|---|
| 1 init | 22:17:58 → 22:18:32 | 0:34 | bound first try |
| 2 knowledge ×12 keys | 22:18:32 → 22:19:04 | 0:32 | two calls |
| 3 fixture (Blueprint, token-bound) | 22:19:04 → 22:22:13 | 3:09 | **the create call timed out at 120 s on the "surface relay" but HAD applied** (verified by `lookup`); reads answered in seconds throughout |
| 4 three-way read + master read | 22:22:13 → 22:23:40 | 1:27 | 7 calls; PNG persisted nowhere (see caveats) |
| 5 comparison | 22:23:40 → 22:24:25 | 0:45 | in-head; written up below |
| 6.0 recognition test | 22:25:12 → 22:25:28 | 0:16 | after 0:47 reading spike B's method + the list-row / plant-card precedents |
| 6.1–6.3 spec + CSS block + renderer template + palette entry | 22:25:28 → 22:27:13 | 1:45 | one agent turn; file writes 1 s |
| 6.4 gen-handoff | 22:27:13 | <1 s | `21 specs` ✓ |
| 6.5 build-checks run 1 | 22:27:13 → 22:27:18 | 0:05 | **red, 7 failures**: docs chain ×4 + catalog ×3 |
| 6.6 fixes: histogram pin 3/17→3/18 + the three regens the chain also needs (gen-vocabulary · gen-pack-bundle · gen-system-graph) | 22:27:18 → 22:27:52 | 0:34 | every failure message named its own fix |
| 6.7 build-checks run 2 | 22:27:52 → 22:27:57 | 0:05 | **all 27 groups pass** |
| 6.8 copy out + revert | → 22:28:19 | 0:22 | `git status` clean under system/ handoff/ tooling/ |
| 7 SDK reach test | 22:29:10 → 22:29:18 | 0:08 | script authored in ~0:50 before |

## The three-way comparison (same instance, `1db1b29957b949ca`)

| facet | blueprint (`lookup`) | htmlFlex (`export`) | react (`export`) | svg |
|---|---|---|---|---|
| colour | role + literal per mode: `tok(color.success.container,#F1F7F2,dark(#003B12))` | light literal only: `background-color:#f1f7f2` | same literal | literal |
| spacing | `g(12:$spacing.md)`, `pad(8:$spacing.sm,12:$spacing.md,…)` | `gap:12px; padding:8px 12px 8px 12px` | absolute `left/top` px, no gap/padding | n/a |
| type | `Manrope:$font.family,16:$font.size.md,sb,lh(1.5:$font.lineHeight.normal)` (weight is a keyword, not a token) | family/size/weight/line-height literals | same | font attrs + 3 embedded base64 `@font-face` |
| layout | `al(h,y(c),g,pad)`, `s(360,hug)`, `s(fill,hug)` — intent | `display:flex; flex-direction; align-items; flex:1 0 0; align-self:stretch` — semantic | `position:absolute` + resolved px — geometry only | absolute |
| text content | `t("Last seen 2 min ago",…)` | text node | text node | `<text>` |
| component / instance identity | `inst("Spike List Row") at(state(active))`; master readable by id with both variants | `data-instance-of="6282a…" data-component="Spike List Row"` on the root | same data attrs | none |
| override | explicit: `override(#spikec_status) t("On call")` (collapsed form) | resolved text only | resolved | resolved |
| variants / states | master `comp axes[state[active,away]]`, both subtrees; instance `at(state(active))` | the exported state only; no axis, no sibling variant | same | same |
| icon / vector | `svg(icon:caret-right)` — the Phosphor NAME | inline `<svg><path>` — the geometry | same | path |
| props / behaviour | none | none | none | none — a drawing carries no props, states or behaviour (D7's rule, observed) |

## The draft (08–11) — what the projection carried and dropped

Recognition: **not covered.** `list-row` is non-interactive by its own spec ("making a row tappable is a
new component decision"), has no disc and no chevron; `plant-card` is a Verdant card with an
`ok|due|overdue` enum. Admitted as **`ds-person-row`** — the tappable sibling of list-row, one `<a>`,
click → the bus as `{intent:"open"}` (plant-card's pattern), free-text `status`, `tone` emphasis.

Mapped by role: surface → `--color-bg-surface`, outline.variant → `--color-border`, text.primary /
secondary → `--color-fg` / `--color-fg-muted`, primary.container (disc tint) → `--color-accent-wash`,
spacing xs/sm/md → `--spacing-xs/sm/md`, radius.md → `--radius-md`, radius.full → `--radius-lg` (the
system's pill idiom), font.size md/sm/xs → `--type-body/caption/eyebrow`. **Dropped, stated in the spec
as content:** the `success`/`warning` colour families (one accent family; state rides `tone`); the
`disabled` text tier (→ muted); the pill's mixed-case medium weight (→ the house uppercase eyebrow);
the Phosphor path (a CSS chevron in the draft; a real port inlines the SVG). **Fidelity deltas under
the neutral pack:** gap 12→16 px, radius 6→8 px, secondary type 14→13 px — a brand pack carrying the
source's exact values closes them, which is the point of projecting through the contract. No contract
token had to be added.

Gate trips on the 20→21 widening, both the designed tripwires spike B hit: the palette's static
`CATALOG_COMPONENTS` (added the entry) and the 3/17 wrapper histogram (moved to 3/18 with the reason
in the message). One trip spike B did not record: `gen-handoff` alone leaves `vocabulary.json`,
`pack.bundle.json` and `system-graph.json` stale — the docs-chain group named all three, so a
recorder's "regen" step is four generators, not one.

## Caveats and bounds

- **07.png was not persisted.** The web editor returns PNG inline only; the inline render was viewed: the fixture's text boxes resolved to `hug:100` (100 px tall each), so the row rendered 220 px tall with the chip 108 px — a fixture geometry flaw, not investigated; the token reads it exists for are unaffected. `06.svg` is the persisted visual record.
- The blueprint's `hug:100` / `s(fill,hug:100)` sizing form is not documented in the knowledge loaded; a converter must treat `hug:N` as hug.
- The SDK serialised `scope` as a JSON *string* (`"[\"1db1…\"]"`) and Brilliant accepted it — a converter should not rely on that leniency.
- **Not exercised:** interactive states drawn on the canvas (hover/pressed variants); a contract-token addition; VR baselines and `catalog-journey.mjs` (a real port pays both — the row renders at rest on `/components`); the write direction as a round trip. Noted from the docs and the fixture's own creation: `create_html` is always sovereign (tokens flatten to hex), but **`create_modify_elements` with `designSystem:"default"` writes token-BOUND elements** — a token-preserving write direction exists through Blueprint, which sharpens the briefing's §13 wave-3 caveat.
- Cold-session orientation excluded again (the chain's precedents were read during steps 4–6); one agent, one session, repo conventions in context.
- Mutations through the MCP are at-least-once with a slow ack in the web editor (120 s relay timeout on a call that had applied). Reads were never slow. A recorder that writes to Brilliant must verify by read; a read-only import path is unaffected.

## What was and was not done

Done: init · 12 knowledge keys · a token-bound master with two variants + one overridden instance created on the canvas · the instance read four ways and the master once, all verbatim on disk · the comparison · recognition test (0:16) · spec + CSS block + renderer template + palette entry drafted from the blueprint read · gen-handoff + three regens · build-checks red (7) → green (27/27) · drafts copied out (08–11) · every change under `system/`, `handoff/`, `tooling/` reverted · the SDK reach test, connected and answered in 7.8 s.

Not done: no commit; no PNG on disk; no VR, no journey drivers, no loc-summary regen; the fixture's layout flaw left as-is; no desktop-app run (`capture_ui`/`render_ui` untested and irrelevant); no designer-drawn (unbound) source tested.

## Files

`00-init.txt` · `01-knowledge.md` · `02-fixture.dsl.txt` · `03-blueprint.txt` · `03b-blueprint-collapsed.txt` · `03c-master-blueprint.txt` · `04-htmlflex.html` · `05-react.jsx` · `06.svg` · `08-spec-draft.md` · `09-css-block.css` · `10-renderer-template.txt` · `11-tripwire-fixes.diff` · `12-sdk-reach-output.txt` · `spike-c-sdk-reach.mjs` · `build-checks-run1.log` · `build-checks-run2.log` · `timings.txt`
