# The baseline cascade for the canvas + design-import epic

> Status: standing checklist, 2026-08-28, for every PR in the epic. Altitude: which baselines and
> generated artefacts move for which kind of change, and how to regenerate them without fooling
> yourself. Sources: `.claude/references/gates.md` § Baseline discipline;
> `tooling/visual-regression/visual.spec.mjs` (observed: `PACKS = neutral + saulera`; the only canvas
> page captured is `factory`; **`instance.html` and `studio.html` have no baselines**);
> `agent-layer/gen-loc-summary.mjs` (observed: the runtime group is every `system/*.{css,mjs,js}` incl.
> `wc/`; `approach.html` renders it). The PRD's "instance baselines regenerate" is corrected here: there
> are none; `instance-journey.mjs` must pass instead.

## By PR kind

| PR | Pixel baselines | Generated artefacts | Journeys |
|---|---|---|---|
| **Plus UI removal** | approach ×2 (a `system/*.css` is deleted → the runtime group moves) | `gen-loc-summary` | `studio-journey all` |
| **Grammar (`children: many`)** | none expected; check whether `/components` prints the children rule as copy before claiming none | the four regenerators (`vocabulary.json` changes) | `catalog-journey` |
| **Each primitive** (`stack` `text` `list` `icon` `choice`) | components ×2 (×3 once verdant is in `PACKS`): every catalog component renders at rest | the four regenerators; `gen-icons` for `icon`; `gen-loc-summary` if a new `system/*.mjs` lands (`icons.mjs`, `device-presets.mjs`) → then approach ×2 too | `catalog-journey` |
| **The swap PR** | factory ×3 (neutral · saulera · **verdant, added to `PACKS` here**) · approach ×2 (`canvas-ops.mjs` is a new `system/*.mjs`) · **every VR page ×1 for verdant** (G14: one new baseline per page, ~10 PNGs) | `gen-loc-summary` · `gen-param-count` (new live controls on `/factory`) · `gen-handoff` only if S2 named a token | `studio-journey all` (rewritten) · `instance-journey` on a built dir · `catalog-journey` · the INP gate |
| **`canvas.html` + the run list** | none — the portal is not a shipped page and not in the VR set | none | a portal-page journey ×3 engines, if the slice adds one |
| **Each admission (a ratify PR)** | components ×3 | the four regenerators; `gen-loc-summary` the **first** time (`templates.admitted.mjs` is a new file → approach ×2 once); the wrapper histogram pin moves with its reason | `catalog-journey` |
| **Handoff extensions** | none | `gen-handoff` (the pack grows `flow.md`, `drops.md`, `refusals.md`, `lineage.json`) | none |

Rule of thumb the table encodes: **a new tracked `system/*.mjs` always costs approach ×2**; an edit to an
existing one never does; a catalog component always costs components ×N packs.

## How to regenerate without being fooled

From the memory this repo has paid for:

1. Run `cd tooling/visual-regression && npm run update:docker` from a **clean detached worktree under
   `/Users`** (not `/private/tmp` — Docker sharing), because it screenshots the dirty tree.
2. `update:docker` skips a baseline whose only change is below pixelmatch's per-pixel threshold; `rm` the
   PNG to force it when a sub-perceptual change is the point.
3. `maxDiffPixels: 100` swallows a few changed digits, so a green update run is not proof a page did not
   change; read the diff images for pages that render numbers (approach).
4. The gate captures under **no-preference** (`reducedMotion: 'reduce'` is a no-op there); zero churn
   comes from `animations: 'disabled'` + rest == final. A new at-rest control gated only by
   `matchMedia('reduce')` will churn.
5. `approach` can fail "two consecutive stable screenshots" from its live countUp under `retries: 0` —
   a different pack each run is the flake signature, not a regression.
6. A local macOS run with ~16 failures is the platform, not a regression; the baseline is Linux. Trust
   `gh pr checks`, not the local run.
7. `factory` waits on `[data-studio="ready"]`, `[data-replay="settled"]` and
   `[data-studio-frames="ready"]` and masks the proto iframes; the swap PR keeps those handles or renames
   them in the spec in the same commit. At-rest = autoplay-to-completion, still.
8. `/factory`'s verdant baseline will show the proto iframes in **their own** pack: custom properties do
   not cross document boundaries (#268, closed as a recorded limitation). Expected, not a defect.
9. `gen-loc-summary --check` reads tracked content: run it after staging, and merge `origin/main` before
   regenerating if the branch is behind (a mid-merge drift-check misreads staged changes as drift).
10. The `verify` job is blocking and gates `main`: a stale `loc-summary.json`, a stale handoff pack or an
    orphaned contract token cannot be deferred to a follow-up.

## Concurrency

Two open PRs must not both regenerate the same page's baselines: the second to merge re-baselines the
first's work away. In this epic that is `/factory` (the swap PR only), `/components` (one primitive or
admission PR at a time), and `approach` (any PR adding a `system/*.mjs`). The slice sequences primitive
tickets so their `/components` regenerations do not overlap.
