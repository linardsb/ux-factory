# Handover — "port any design into the portfolio" (2026-07-25)

Written for a fresh context window. **§A** state (so you don't redo or re-litigate it), **§B** the
precise gap between what exists and "any design", **§C** ready-to-paste prompts.

Predecessor: `.claude/plans/figma-token-import-handover.md` (that thread is finished).

---

## §A · State — done, verified, don't redo

### Merged to `main`
| PR | What |
|---|---|
| #111 | Paged, budget-safe Figma read + `figma-pull.mjs` (import a design as a pack) + `system/tokens.plusui.css` |
| #112 | `--from <export.json>` (plugin export instead of the API) + last-path-segment style matching |
| #114 | `docs/figma-runbook.md` |

### Open
**PR #115**, branch `fix/figma-parity-large-file`, 3 commits ahead of main: page/ramp
auto-detection, `--land`, the small-file fix, and a doc correction. **Its CI never ran** — GitHub
returned `startup_failure` on every attempt including a manual rerun. The workflow YAML is valid
and untouched by the branch; runs passed on the same branch two hours earlier. Treat as a GitHub
incident. Locally `drift-check` ✓ and `token-lint` ✓; nothing touches a page or token value, so
the visual gate is unaffected. **Re-check `gh pr checks 115` before assuming anything.**

### Facts established by measurement — do not re-investigate
- **Figma Variables REST is Enterprise-only.** Verified against Figma's live docs: required plan
  "Enterprise", *"you must have a Full seat in an Enterprise org"*. A Professional seat does NOT
  unlock it. The pricing card's "design library for components, variables, and modes" is an
  editor feature, not API access. **Don't propose a paid plan as a fix.**
- **`GET /v1/files/:key/styles` returns an empty array** on a non-Enterprise file — it lists
  *published team-library* styles only.
- **A plugin export bypasses both walls** (Enterprise gate and rate limit) — hence `--from`.
- **Rate budget: ~6 file reads/month; 3 spent on 2026-07-25.** Raw cache lives in
  `tooling/figma/.raw/` + `.last-response.json`, **gitignored, so only in the `ux-factory-wt-figma`
  worktree.** Always try `--offline` / `--from` before spending a request.
- **No token rotation is pending.** The predecessor doc claims `FIGMA_TOKEN` leaked into a
  transcript; the owner confirmed it did not.

### Decisions made with the owner — don't reopen
- **Parity artifact stays pending.** `portability.figma.parity` is `null` on purpose. Diffing a
  third-party kit against this contract scores 0/64 by construction — honest, and evidence of
  nothing. It needs a Figma file seeded from this repo's own `tokens.dtcg.json`, which needs a
  human in Figma (`docs/figma-runbook.md` §B).
- **Using a community kit is fine**, labelled as someone else's design work. Settled.
- **Refuse rather than guess.** When a file has no single brand ramp, `figma-pull` lists the
  candidates and stops. Do not add a "most saturated wins" tiebreak — picking one arbitrarily and
  letting the pack header call it the brand is the exact overclaim this repo's honesty contract
  exists to prevent.

---

## §B · The gap — what blocks "any design"

Verified by reading `ROLES` in `tooling/figma/figma-pull.mjs` and inspecting the emitted pack.

**G1 · Colour naming.** The importer requires `<hue>/<step>` ramps (`gray/900`, `indigo/600`) with
≥5 rungs. `toRamps()` parses `/^(.*)\/(\d{2,3})$/`. A design naming colours `Primary`,
`Brand Blue`, `Surface/Default` yields no ramps and the run refuses. Common convention, not a
universal one.

**G2 · Only colours import.** All 16 roles in `ROLES` are colours. The other 48 contract tokens —
spacing, radius, type ramp, shadows, motion — come from *this repo's* contract defaults via
`gen-pack-css`'s auto-fill. Confirmed: `tokens.plusui.css` carries `spacing-md: 16px`,
`type-body: 16px`, `radius-md: 8px`, which are the neutral defaults, not Plus UI's values. An
imported pack today = **the design's colour on this repo's scale.**

**G3 · Fonts never import.** `--font-display/body/mono` are contract defaults. Figma gives a font
*name*, not a file; a real swap also needs a self-hosted face and an `@import` (the pack format
allows it — see `system/tokens.neutral.css` header). Name-only import is possible and honest if
labelled; shipping a font file is a separate, licence-bound step.

**G4 · Components never import, on any plan.** Figma returns fills and coordinates, not a Button's
hover state, focus ring or markup. This is by design — components stay token-only and wear the
imported values. **Not a gap to close.**

---

## §C · Prompts

Run in order. Each is self-contained for a fresh context window. **Prompt 1 alone gets you most of
the way to "any design"**; prompt 2 makes it more than colour.

### Prompt 1 — accept any colour naming (closes G1)

```
Read .claude/plans/figma-any-design-handover.md first, then extend
tooling/figma/figma-pull.mjs so it can import a design whose colours are NOT named
<hue>/<step>. Today toRamps() requires that pattern and the run refuses without it (gap G1).

Two mechanisms, in this order of preference:

1. Derive ramps from arbitrary names. Group colours by their name prefix (the part before
   the last "/" , or a shared leading word), then order each group by OKLCH lightness using
   system/oklch.mjs and synthesise rung numbers from that order. "Blue/Light, Blue/Base,
   Blue/Dark" becomes a 3-rung ramp. Reuse the existing role/negotiation machinery — a
   derived ramp must flow through exactly the same pickRamps/negotiate/checkPairs path, not
   a parallel one.
2. An explicit per-design map for anything inference can't handle: a small committed JSON
   under tooling/figma/maps/<slug>.json mapping contract token name -> Figma style name,
   loaded with a --map <file> flag. Explicit entries always beat inference.

Hard requirements:
- Never invent a colour. Every emitted value must be one the design actually contains.
- A ramp with too few rungs for contrast negotiation must still be reported honestly:
  if a WCAG pair can't be satisfied by any available value, ship it and name the failure in
  the pack header, exactly as the current code does.
- Keep refusing when genuinely ambiguous. Do not add a "most saturated wins" tiebreak.
- system/tokens.plusui.css must come out byte-identical under its committed flags
  (--slug plusui --neutral gray --accent indigo --page Color --offline). That's the
  regression test.

Verify with a synthetic export (build one in the scratchpad, like the one-page fixture in
this thread) covering: a Light/Base/Dark naming, a single-colour palette with no ramp, and
a design that needs the explicit map. Show the WCAG table for each.

Then update docs/figma-runbook.md's "What a design needs" section to match what is now
true, and system/figma-import.md if the import path changed. Do NOT overclaim — the doc
was wrong once already in this thread.
```

### Prompt 2 — import more than colour (closes G2, partly G3)

```
Read .claude/plans/figma-any-design-handover.md first. Today every role in
tooling/figma/figma-pull.mjs's ROLES is a colour, so an imported pack carries the design's
colour on this repo's scale (gap G2). Extend it to spacing, radius, the type ramp and
shadows.

Notes that will save you time:
- The values arrive already: figma-read.mjs's entriesFromExport() types px strings and bare
  numbers as "dimension". It's ROLES that has no non-colour entries. Confirm before
  assuming a read-side change is needed.
- Figma has no "spacing style" primitive, so scale values come from NUMBER VARIABLES via
  --from <export.json>, not from the REST style walk. The REST path may legitimately have
  nothing to import here; say so rather than faking it.
- Spacing is an ordered scale, so map by sorted order (smallest imported value ->
  spacing-xs, and so on), not by name. State the mapping rule in the pack header.
- Shadows: Figma effect styles. system/tokens.neutral.css shows the shadow value shape.
- Fonts (G3): a Figma export gives a font NAME only, not a file. Importing the name is
  honest IF the pack header says the face is not self-hosted. Do not silently emit a
  font-family the site cannot actually load.

Hard requirements:
- Anything not imported must still auto-fill from contract defaults and be REPORTED as
  auto-filled — that reporting is how the pack stays honest about what it really carries.
- system/tokens.plusui.css must not change unless you re-import it deliberately; if it
  does change, say exactly which values now come from Figma instead of defaults.
- Run node tooling/drift-check.mjs and node tooling/token-lint.mjs before committing.

Then correct docs/figma-runbook.md's "What a design needs, and what actually comes across"
section — it currently states colours are the only thing imported, which must stop being
true before you change that text.
```

### Prompt 3 — make an imported pack visible (optional, independent)

```
Read .claude/plans/figma-any-design-handover.md first. system/tokens.plusui.css is
committed and renders correctly, but it isn't selectable in the site's appearance dock, so
a reader can't see the imported design. Wire it in.

Touch points: PACKS and PACK_RE in system/dock.mjs, and the hard allowlist in
system/pack-boot.js (both deliberately duplicate the href-swap — read the header comments
there before changing either).

This WILL churn visual-regression baselines. Regenerate them in the same PR:
  cd tooling/visual-regression && npm run update:docker
If a baseline's diff is under the pixel threshold it won't rewrite — rm the PNG to force it.
Confirm the run passes and only the expected shots changed.

Label it honestly in the dock: the pack is Plus UI's design work, not this repo's, the same
way the pack header already says so.
```

---

## Working rules a fresh context will otherwise get wrong

- **Don't work in the primary worktree.** It's shared with parallel sessions and is on
  `feature/v3-instance-spine`. Use `ux-factory-wt-figma` (holds the Figma cache and a gitignored
  `portal/.env`) or a fresh worktree from `origin/main`.
- **The owner merges fast.** Three times in this thread, commits pushed after a merge were
  orphaned and needed a new PR. Check `gh pr view <n> --json state` before assuming your commits
  are on the open PR.
- **`Closes #N` trailer** in the PR body, or the ticket stays open (CLAUDE.md).
- **Editing `system/figma-import.md` requires regenerating the handoff pack** — it ships inside it.
  `node agent-layer/gen-handoff.mjs && node agent-layer/gen-pack-bundle.mjs`, or `drift-check`
  goes red. `docs/` is not counted by `loc-summary`; `system/` is, and a new tracked file there
  churns the two approach VR baselines.
- **drift-check reports staged-vs-HEAD.** Right after staging regenerated files it looks like
  drift; `git diff --quiet` clean means it's fine, and it goes green once committed.
- **Never commit an artifact whose numbers you haven't read.** `--land` makes committing
  frictionless and the empty-read guard only catches *zero* matches. Revert with
  `git checkout -- handoff/ && rm -f handoff/verdant/figma-parity.json`.
