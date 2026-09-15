# Issue #416 — studio-journey's webkit leg: what the investigation found

**Verdict: the reported failure does not reproduce, and the hypothesis the issue leads with is falsified.** What landed is not a fix for the fault — it is the instrument that will name the fault the next time it appears, plus the `gates.md` line the issue asked for. Stated that way deliberately: inventing a code change for a fault that never showed is worse than saying it did not show.

## What the issue claimed

That `[data-replay="settled"]` stopped arriving under webkit, and that the break sits between webkit-2272 (Playwright 1.59.1) and webkit-2311 (the repo-pinned 1.61.1) — with CI's `visual` job on the affected side. The issue proposed installing both browser sets and running the leg each way.

## What was measured instead (all observed, on the pinned 1.61.1 / webkit-2311)

| Check | Result |
|---|---|
| `studio-journey webkit`, full leg | **520 passed, 0 failed** |
| Same leg again, with this PR's wrapper in place | **520 passed, 0 failed** |
| `/factory.html` load → settled, 25 consecutive runs | **25/25 settled, 14.54–14.69 s** (30 ms spread) |
| Same, with `#shape` deep link | settled, 14.4 s |
| Same, with a second context live | settled, 14.7 s |
| Same, with a second page in the same context | settled, 14.7 s |
| Same, under 16 and 32 CPU hogs on 16 cores | settled, 14.7 s and 14.9 s |

**520 is the number the issue records for the run it attributes to webkit-2272 under Playwright 1.59.1.** The same count came back here on webkit-2311 under 1.61.1. The green leg the issue treats as the "before" and the red legs are the same browser, so the version split is not what separates them. The dual-install experiment was not run, and should not be.

Four further hypotheses were tested and each is dead:

- **Marginal timeout budget.** The playback is a `setTimeout` chain, not CPU-bound: 32 hogs on 16 cores cost 400 ms of a 14.5 s settle. The 30 s budget has 2× headroom and load does not erode it.
- **WebKit background-tab timer throttling.** A second context and a second page in the same context both leave the first page `visibilityState: "visible"` and settling on time.
- **A blocked external request stalling render.** `/factory` reaches no external origin — `system/analytics.mjs` gates the Cloudflare beacon behind an empty `BEACON_TOKEN`, so it is never injected. The one `@import` in a swapped pack (`tokens.saulera.css` → `../fonts/fonts.css`) 404s immediately against `serve.mjs`; it does not hang.
- **A deterministic code fault.** The issue's own numbers rule this out: the identical tree aborted at 311 assertions once and 101 another time. A deterministic fault does not move.

## What the assertion counts actually mean

The issue reads the 101 / 302 / 311 spread as "a different one of the four waits is reached first depending on machine load". That is not how the driver runs — the waits are sequential inside one leg, not racing. The counts are simply **where the leg stopped**, and a leg that throws aborts that engine at the throw.

Confirmed by construction: served `/replay/*.json` as 404 and ran the webkit leg. It aborts at `factoryPass`'s first settle wait with **101 passed, 1 failed** — the issue's webkit-alone number exactly. So that red leg died at that wait; 302 and 311 died at later ones. Which of the three possible states each died in was unrecoverable, because the message carried none.

## What landed

**`tooling/studio-journey.mjs` — one `settleWait` wrapper, 22 call sites.** Same selector, same default `visible` state, same per-site timeout, no assertion added, and a healthy page takes the identical path. On timeout it reads the driver's own state off the page and rethrows with it. The three failures a bare `waitForSelector` could not tell apart now separate:

- `replay: null` / no `[data-studio]` — the studio never mounted.
- `replay: "loading"`, `beat: "0/0"` — parked on a fetch that never resolved.
- `replay: "ready"` with a frozen `beat` — the timer chain died mid-play.
- `replay: "ready"` with `beat` advancing — genuinely still playing, i.e. actually too slow.

The beat numbers come from the seek control's `value` / `max`, which `system/replay-driver.mjs`'s `syncControls` writes on **every** advance, so a frozen beat separates *stalled* from *slow*. The call site is recovered from the stack, so no caller passes a label and none can drift.

Proven in both directions, not grepped:

- **Negative control** (404 on the artifact): `[data-replay="settled"] never arrived within 30000 ms at studio-journey.mjs:1391 ← :1358 — {"url":"http://127.0.0.1:4792/factory.html#shape","studio":"ready","replay":"unavailable","beat":"0/0","card":"Not availableThe run's projection at /replay/build-fieldwork-dispatch.json could not be read here, so nothing is replayed and nothing is drawn in its place."}`
- **Positive control**: the full leg still green at 520/0.

**`.claude/references/gates.md` — two paragraphs.** "Reading a red leg", covering the issue's closing ask: the verdict is the driver's own `✗ N assertion(s) failed` line and the per-engine tally, never a wrapper's exit status (`| tail -30` reports `tail`'s status, which is how #416 lost a result); a leg that threw stopped at `N passed` rather than covering it; `0 passed` means nothing was measured, which is not a failed assertion. And "A settle wait that names its state", recording what the wrapper does and what it cannot reach.

## What is deliberately NOT in this PR

- **No timeout was changed.** 25/25 at a 30 ms spread says the budget is not marginal. A bump would be the `check-that-cannot-fail` pattern.
- **No registration in `verify.yml`.** `studio-journey.mjs`'s own header records the decision ("three engine downloads per PR buys less than it costs"). Reversing it is a decision, not a bug fix, and belongs in its own ticket — the `gates.md` paragraph states the consequence instead.
- **No change to the other drivers.** `instance-journey.mjs`, `vt-verify.mjs` and `tooling/live-metric-audit.mjs` also wait on `[data-replay="settled"]`. #416 is a `studio-journey` report and this stays scoped to it; each of those drivers has its own green leg to re-run before it is touched, which is the cost that keeps them out.

## Honest limits of this investigation

- The fault was never observed, so its cause is **unknown**, not fixed. If it recurs, the new message names which of the four states it died in — that is the whole value of this PR.
- The repro tree for the first two 520/0 legs was 9 commits behind `origin/main`. The only delta in the driver was one pack-name regex (`plusui`), unrelated to the settle path.
- Because of that, the branch was re-run whole against `origin/main` + this change, three engines, on its own worktree and its own server: **chromium 524 passed / 0 failed · firefox 520 / 0 · webkit 520 / 0**, `studio-journey ✓` (observed). **`webkit` is green on `main`.**
- `node tooling/build-checks.mjs` — `build ✓ all 34 groups pass` (observed).
