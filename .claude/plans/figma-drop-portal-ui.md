# Plan — drop a design in the portal, get a pack (no CLI)

Owner ask (2026-07-25): *"I want this to be drop a file or URL or design in UI of the portfolio,
not cli commands I have to run."*

Governs: `docs/figma-runbook.md` §A becomes a UI, not a command. Prior state and measured facts:
`.claude/plans/figma-any-design-handover.md` — **read §A before starting; it records owner
decisions that must not be reopened.**

---

## §1 · What this is

Drop a Figma export onto a drop zone in the portal. It writes `system/tokens.<slug>.css` and shows
the WCAG table. Zero commands.

**Why the portal and not a shipped page.** Only the portal can write the file to disk, which is the
entire point of the ask. A public page could re-skin itself live and offer a download, but the
operator would still run `git add && git commit` — that is not "no CLI commands". The public
exhibit is a *different deliverable* with a different goal (proof for readers, not operator
labour); §6 records what it would additionally need.

## §2 · Constraints — do not design around these, they are measured

| Constraint | Consequence |
|---|---|
| `FIGMA_TOKEN` is a secret, gitignored, server-side only (CLAUDE.md) | A URL/API path can never exist on a shipped page |
| Figma Variables REST is **Enterprise-only** (verified, handover §A) | Even server-side, a URL read returns nothing on a normal file |
| `GET /files/:key/styles` returns `[]` on non-Enterprise | Same |
| Rate budget ~6 file reads/month | The API path is not something a UI should invite clicking |

**Therefore: the UI accepts a dropped export file only.** No URL field. A URL box would be an
affordance that fails on most real designs — the exact overclaim the honesty contract forbids.
`--from` exists precisely because a plugin export bypasses both walls.

## §3 · The shape — smaller than it looks

`runPull()` in `tooling/figma/figma-pull.mjs` is already the whole engine: it reads, classifies
ramps, maps roles, negotiates contrast, writes `system/tokens.<slug>.css` via `genPackCss`, and
returns `{ slug, dest, values, checks, stepped, failures }`. **No core extraction is needed.** The
portal is Node; it imports and calls it. (Extraction into a view-time-safe module is only required
for the browser exhibit — §6.)

So the work is: a route, a lib module, a drawer, and one small change to make a refusal
machine-readable.

### The refusal is the best part of the UI

`pickRamps` throws when a file has no single brand ramp, listing candidates. In the CLI that is a
dead end you fix by re-running with `--accent`. In a UI it becomes the primary affordance: show the
candidate ramps as swatches and let the operator click the brand. **The refusal stays a refusal** —
the tool still declines to guess, per handover §A — it just asks in a medium that can answer.

That needs the error to carry data, not prose:

```js
const err = new Error(`figma-pull: ${candidates.length} ramps could be the brand colour, …`);
err.candidates = candidates.map((r) => ({ hue: r.hue, chroma: r.chroma, swatch: <mid rung hex> }));
throw err;
```

CLI message stays byte-identical; only a property is added.

## §4 · Steps

| # | Step | Files | Verify |
|---|---|---|---|
| 1 | Attach `candidates` to the ambiguous-brand error; add the mid-rung hex per candidate | `tooling/figma/figma-pull.mjs` | CLI message unchanged on the 2-ramp fixture; `err.candidates` has 2 entries with hexes |
| 2 | `runFigmaPull({ export, slug, accent, neutral })` — persist the export, call `runPull`, normalise success + candidate-refusal into one return shape | `portal/lib/figma.mjs` (new) | Node one-liner: returns a pack for the good fixture, `{ needs: 'accent', candidates }` for the ambiguous one |
| 3 | `POST /api/figma/pull` — `readBody` → delegate → `json(res, …)`; validate by hand and throw (repo convention) | `portal/server.mjs` | `curl` with a fixture body writes the pack; bad body returns 400 |
| 4 | Drop zone + slug field + candidate picker + WCAG table, modelled on the existing intake drawer | `portal/public/index.html`, `portal.js`, `portal.css` | Drop the fixture → pack written, table renders; drop the ambiguous one → swatches, click one → pack written |
| 5 | Runbook: §A gains "in the portal" as the primary path, CLI stays documented beneath it | `docs/figma-runbook.md` | Reads correctly; does not claim the URL path works |

**Definition of done** (CLAUDE.md: run the surface you touched): portal boots, `/api/health`
answers, both fixtures round-trip through the real UI, `node tooling/drift-check.mjs` ✓,
`node agent-layer/gen-loc-summary.mjs --check` ✓.

## §5 · Decisions to make while building

**D1 · Where the dropped export is persisted.** It cannot go to a temp path: the pack header's
`Regenerate:` line names the source read (fixed in `0293e4b`), and a header pointing at
`/tmp/xyz.json` is not reproducible. *Recommend* `tooling/figma/exports/<slug>.json`, gitignored
alongside the existing `.raw/` cache — a real, stable path on the operator's machine, and nothing
third-party gets committed.

**D2 · Does the portal write straight into `system/`?** Yes. `record-trace.mjs` and
`record-composition.mjs` already write into `traces/` and `proto/`, so a build-time tool mutating
the repo is established. The operator still reviews and commits the diff.

**D3 · Size limit on the dropped file.** `readBody` has no cap today. A design export is tens of
KB; a whole-file dump can be tens of MB. Cap it and reject with a clear message rather than
buffering unbounded.

## §6 · Not in scope

- **The public drop-to-re-skin exhibit.** Same idea, different goal. It additionally needs the
  mapping core extracted to a view-time-safe module (`system/`, which is counted by `loc-summary`
  and churns the two approach VR baselines), a `:root` apply path — `system/pack-derived.mjs`
  already does exactly this for a single brand colour and is the model — and a download instead of
  a disk write. Worth doing; it is the platform's thesis made literal. Separate ticket.
- **Handover §C prompt 1** (import designs whose colours are not `<hue>/<step>` ramps) and
  **prompt 2** (spacing/type/shadows, not just colour). This UI sits on top of both and neither
  blocks it — it inherits whatever the engine can do on the day.
- Fonts and components. Handover §B G3/G4: components never import on any plan, and that is
  by design, not a gap.

## §7 · Honesty checks before merging

- The UI must not imply the pack carries more than colour. Today an imported pack is **the
  design's colour on this repo's scale** (handover §B G2) — the drawer says so, in the UI, not
  only in the pack header.
- Whatever the run reports as auto-filled from contract defaults stays visible in the UI. That
  reporting is how the pack stays honest about what it actually carries.
- Third-party design work stays labelled as such, the way the pack header already does.
