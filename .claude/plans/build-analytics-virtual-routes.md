# Feature: /build's two virtual-route pageviews — `/build/pattern` and `/build/shared`

The following plan should be complete, but it's important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

**Closes #149** (epic #134). The ticket is a *question* — "should /build fire an analytics
virtual-route pageview?" — and the answer was **decided with the owner on 2026-07-28**, before this
plan was written. Both decisions are recorded in OPEN QUESTIONS / ASSUMPTIONS below; do not
re-litigate them, and do not widen the event set without an AMENDMENT.

## Feature Description

`/build` — the pattern builder — is the only public surface about the *reader's* product, and it is
currently unmeasured beyond its own pageview. This ticket adds **two** virtual-route pageviews to
`system/analytics.mjs` and fires each from the one place on `/build` where the thing it names has
actually happened:

| Path | Fired when | What it answers |
| --- | --- | --- |
| `/build/pattern` | a real pattern is on stage, rendered through the vocabulary-validated agentic renderer | `/build` pageviews vs this = the funnel-completion ratio: how many readers who open the builder actually reach a rendered pattern |
| `/build/shared` | the visitor has a share link in hand (clipboard granted **or** the select-the-field fallback) | link production on `/build` — the same leading indicator for PRD §7 "Forwarded internally" that `/factory/shared` measures on home |

Cloudflare Web Analytics has no custom events (the constraint `analytics.mjs:6-11` records), so an
event is a **virtual-route pageview**: the helper briefly pushes a synthetic path, the beacon's
History-API hook records the route change, and the URL is restored 50 ms later. Both new paths are
static module-level literals — a path is the entire payload, and `/build`'s whole promise is that
nothing about the visitor's design or answers leaves their browser.

It also fixes a **latent CI break** that this ticket is the first to touch: `analytics.mjs` reads
`location.hostname` at module scope, and survives Node import today only because `BEACON_TOKEN` is
`""` and `&&` short-circuits before it. `tooling/build-checks.mjs:46,50` imports two of the three
modules this ticket edits, so once the token is filled at launch, CI's `verify` job would throw
`ReferenceError: location is not defined`. Task 1 closes that with the `typeof document` guard the
repo already uses in four other places — and proves it by running the module with a **filled** token.

## User Story

As the portfolio's owner, reading the Cloudflare Web Analytics dashboard after an application round
I want to see how many readers who opened `/build` reached a rendered pattern, and how many left
holding a share link
So that I can tell "the builder was linked" from "the builder was used" — and read the /build half
of the PRD §7 forwarding metric — without any of the visitor's design, answers or board leaving
their browser.

## Problem Statement

`/build` shipped across #135–#139 with no measurement of its own. The site's four existing events
(`/factory/driven`, `/factory/built`, `/factory/shared`, `/factory/arrived`) all sit on the home
spine, so today the dashboard can say a reader *loaded* the builder and nothing more. Two of the
moments that matter most — a pattern actually rendering, and a share link being produced — are
invisible, and they are exactly the two the PRD's success metrics are phrased in terms of.

Firing them naively would break things the page already guarantees:

1. The `/build` URL **carries state** (`?b=`), unlike home's. The 50 ms flip blanks
   `location.search`, and `build-keep.mjs`'s debounced URL-refresh reads `location.href` to rebuild
   the share link — a keystroke ~400 ms before the copy click lands the timer inside the flip window
   and writes a search-less `/build/shared?b=…` that the restore then silently reverts to a stale URL.
2. Both natural fire sites sit **inside `catch` blocks**: `pattern-render.mjs:220-224` would report a
   refused `pushState` as "the renderer refused this composition", and `build-keep.mjs:254-255` would
   report it as "the link could not be built". Both are honesty statements on a portfolio about
   honesty; neither may be made false by an analytics call.
3. `pattern-render.mjs:227` sets `data-pattern-stage="ready"` for the empty, out-of-library, refusal
   and vocabulary-unavailable branches too. Firing there would count every one of them as "a pattern
   rendered" — the `spine-analytics-slot-fires-regardless` trap, in a new costume.

## Solution Statement

Six edits and two gates:

1. `system/analytics.mjs` — the `typeof document` boot guard, one internal `flip(path)` helper whose
   `pushState` cannot throw at its callers, and the two new fire-once exports.
2. `system/pattern-render.mjs` — `trackBuildPattern()` as the last line of `renderPattern`, the one
   function that only runs when a composition is on stage.
3. `system/build-keep.mjs` — `trackBuildShared()` after the URL is written and the link is in the
   field, plus `clearTimeout(urlTimer)` (correct on its own merits: the copy just wrote the freshest
   URL, so a pending debounce is stale by definition — and it closes the flip-window race).
4. `tooling/build-checks.mjs` — **group 10**, the PREDICATE: the module imported with a filled token
   in Node, then run against stubbed `location`/`history` to prove the pushed path is the exact
   literal, carries none of the `?b=` payload sitting in `location.search`, fires once, and restores.
5. `tooling/build-journey.mjs` — **check [17b]**, the WIRING: a `history.pushState` recorder installed
   before load, driven in all three engines. Zero flips when Act 4 is never reached; exactly one when
   it renders; still one after an edit; exactly one `/build/shared` on copy, with the URL restored.
6. `CLAUDE.md`'s `analytics.mjs` map line, which still describes **one** event when there are four.

The CI/wiring split is deliberate and reuses the idiom this repo shipped last week for
`portal/lib/origin.mjs` (#157): **build-checks group 10 gates the predicate; the wiring is only ever
proven against a running page.** Do not try to shim a DOM into build-checks.

## Out of Scope / Non-Goals

- **No "reached the builder" event.** `build.html` is a real page, so CF WA already records that
  pageview natively — a synthetic duplicate would double-count the same fact.
- **No import event** (`/build/imported` or similar). Not tied to a PRD metric, and refusals bundle
  ordinary user error (dropping a `.txt`) into a count CF WA cannot break down. Recorded as a
  decision, not an omission.
- **No arrival event on `?b=`.** The receiving half of the `/build` share loop stays unmeasured this
  ticket. `build-journey.mjs:431` asserts "`?b=` survives opening and closing #appearance" on exactly
  the arrival context, and an arrival flip blanks `location.search` while the dock is writing
  `location.hash` — the collision class `trackFactoryArrived`'s own comment documents, with the dock
  sitting in `/build`'s flow. If the owner wants it later it needs its own ticket and its own
  ordering proof, the way `trackFactoryArrived` needed one.
- **Not touching the four existing events.** `trackFactoryDriven/Built/Shared/Arrived` keep their own
  bodies and their carefully-worded comments; only the new pair routes through `flip()`. See NOTES
  for why the tempting four-way refactor is declined.
- **No change to the flip-without-a-beacon behaviour.** The trackers flip the URL even with an empty
  `BEACON_TOKEN`, on purpose (`analytics.mjs:16-18`: that is what makes the contract testable before
  launch). Gating the flip on the beacon would make every check below vacuous.
- **No new UI, no copy change, no visual change** on `/build` or anywhere else.

## Feature Metadata

**Feature Type**: Enhancement (measurement) + one latent-CI-break fix
**Estimated Complexity**: Low (code) / Medium (gates — see the 53-line loc-summary headroom below)
**Primary Systems Affected**: `system/analytics.mjs`, `system/pattern-render.mjs`,
`system/build-keep.mjs`, `tooling/build-checks.mjs`, `tooling/build-journey.mjs`, `CLAUDE.md`
**Dependencies**: none new (Playwright for the journey resolves out of
`tooling/visual-regression/node_modules`, as it already does — never a repo dep)

## Related Work

**Implements**: #149 · **Epic**: #134 (`.claude/plans/hooked-shapeup-pattern-builder.md`)

**Back-references**:

- `.claude/plans/build-links-in-and-gates.md` (#138) — **Q2 is this ticket**, raised there and
  deliberately deferred as "a measurement decision, not an integration one". Its VR/journey
  discipline is inherited verbatim.
- `.claude/plans/v3-built-screen-peak.md` (#75) — `/factory/built` and the "fire from the effect's
  success path, never the spine's analytics slot" rule (`peak.mjs:240-243`) this mirrors.
- `.claude/plans/v3-investment-close.md` (#77) — `/factory/shared` + `/factory/arrived`; the
  "build the URL BEFORE calling the tracker" note (`analytics.mjs:78-79`) is a hard input here.
- `.claude/plans/portal-origin-guard.md` (#157) — the predicate-in-CI / wiring-on-the-running-thing
  split that group 10 reuses.
- `docs/epics/portfolio-v3-experience.architecture.md:25` — names **only** `/factory/built` as the
  added virtual route. This ticket extends that call rather than executing it; say so in the header
  comment and in the PR, the way `analytics.mjs:74-77` does for `/factory/shared`.

**Forward-references**: (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

- `system/analytics.mjs` (whole file, 118 lines) — the platform constraint (L6-11), the token/host
  fail-closed gate (L13-25), and the four existing trackers. **L29** is the line Task 1 guards;
  **L74-77** is the "this EXTENDS the architecture doc's call" comment shape to copy; **L78-79** is
  the caller contract build-keep must honour.
- `system/pattern-render.mjs` (L181-196 `renderPattern`, L201-228 `render`) — the fire site and the
  four sibling branches that must **not** fire. Note L220-224: `renderPattern` is called inside a
  `try` whose `catch` renders "the renderer refused this composition".
- `system/build-keep.mjs` (L197-208 `linkLive`/`urlTimer`/`replaceUrl`, L233-259 the copy handler,
  L299-307 the debounced URL refresh, L311-329 `restore`) — the fire site, the debounce that races
  the flip, and `replaceUrl`'s `try`/`catch` (L206-207) whose comment is the precedent for guarding
  `pushState` on `file://`.
- `system/build-share.mjs` (L367-371 `shareUrl`) — `new URL(base)`; `currentUrl()` passes
  `location.href`, which is *why* a flip-window call produces a wrong URL.
- `tooling/build-checks.mjs` (L1-10 header "Nine groups", L39-57 imports, L60-80 `ok`/`group`,
  L1006-1062 the origin group, L1066-1072 the verdict) — group 10 mirrors the origin group's shape
  and its PREDICATE-not-WIRING header comment.
- `tooling/build-journey.mjs` (L60-100 `journey`/`t`/`newPage`/`settle`, L340-405 check [6] the share
  link, L671-705 check [17], L706+ check [18] console cleanliness) — check [17b] goes **before** [18]
  so the cleanliness assertion stays last.
- `system/peak.mjs:240-243` + `:325-330` — the canonical comment explaining *why* the fire sits on
  the success path and not in a slot/flag that runs regardless. Mirror its register, not its words.
- `system/dock.mjs:441,453` — `sync` is wired to `hashchange` only. `pushState` fires neither
  `hashchange` nor `popstate`, which is why the flip cannot toggle the dock (see NOTES for the one
  narrow window that remains and why it is accepted).
- `agent-layer/gen-loc-summary.mjs:23,28,44` — the runtime group regex, `round100`, and the
  `git show :<path>` **index** read (so `--check` before staging is a false negative).
- `CLAUDE.md:17` — the `analytics.mjs` architecture-map line to update.

### New Files to Create

None. Six existing files change; plan/report/review artifacts land per repo convention:

- `.claude/plans/build-analytics-virtual-routes.md` — this file (commit it in the PR).
- `.claude/reports/build-analytics-virtual-routes-report.md` — the execution report.
- `.claude/code-reviews/pr-<N>-review.md` — the agentic review.

### Relevant Documentation — READ BEFORE IMPLEMENTING

- [Cloudflare Web Analytics FAQ — custom events](https://developers.cloudflare.com/web-analytics/faq/)
  - Why: the "no custom events" constraint the whole virtual-route mechanism exists to work around.
    Re-confirm it still says "not yet" before extending the pattern; if CF shipped real custom
    events, that is an AMENDMENT-worthy finding, not a silent switch.
- [MDN — `History.pushState()`](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState)
  - Specific: "does not fire `hashchange`" and the `SecurityError` on unsupported origins.
  - Why: both facts are load-bearing — the first is why the dock is safe, the second is why `flip()`
    guards.
- [MDN — `Window.location`](https://developer.mozilla.org/en-US/docs/Web/API/Window/location)
  - Why: the bare `location` in `analytics.mjs:29` is `globalThis.location`; that is exactly what
    group 10 stubs.
- [Playwright — `page.addInitScript()`](https://playwright.dev/docs/api/class-page#page-add-init-script)
  - Why: check [17b]'s recorder must be installed **before** any page script runs, and must call
    through to the original `pushState` so it observes rather than alters.

### Patterns to Follow

**The DOM boot guard** — four precedents, all the same shape; use it verbatim:

```js
// system/pack-derived.mjs:515
if (typeof document !== "undefined") wireBeatBrand(hydrateFromSharedLink());
// system/build-keep.mjs:339 · system/pattern-render.mjs:247 · system/build-import.mjs:560 — same
```

**Fire from the success path, with its own fire-once guard** — `system/peak.mjs:240-243`:

```js
// The built screen is now on stage — THIS is "reached the built screen", so fire the analytics
// here (own fire-once guard), NOT from the spine's analytics slot: that slot runs after the effect
// whether the build succeeded or fell through to the still, which would count a failed build as a
// reach. Every fallback above returns before this line, so the metric stays true to its name.
trackFactoryBuilt();
```

**One guard per event, never a shared flag** — `analytics.mjs:52-57`: "Its own fire-once guard:
sharing `trackFactoryDriven`'s module-level `fired` would let whichever event fires first suppress
the other."

**Guard a history call that a browser may refuse** — `system/build-keep.mjs:206-207`:

```js
// file:// has no session history entry to replace, and throws.
try { history.replaceState(null, "", url); } catch { /* nothing to keep current */ }
```

**A check that can fail** — `tooling/build-checks.mjs`'s house rule, and memory
`check-that-cannot-fail`: mutate the source, run the function. Group 10 must assert its own mutation
landed (`ok(mutated !== src, …)`) before drawing any conclusion from importing it.

**The predicate/wiring split** — `tooling/build-checks.mjs:1006-1015` (the origin group's header).
Group 10's header says the same thing about this pair, naming check [17b] as where the wiring lives.

---

## IMPLEMENTATION PLAN

### Phase 1: The helper (analytics.mjs)

The node-safety guard, `flip()`, and the two exports. Nothing imports them yet, so this phase is
independently validatable — and its validation is the one that fails before the fix.

**Tasks:** boot guard · `flip(path)` · `trackBuildPattern` · `trackBuildShared` · header comment.

### Phase 2: The two fire sites

**Depends on:** Phase 1 (imports the new exports).

**Tasks:** `pattern-render.mjs` last line of `renderPattern` · `build-keep.mjs` copy handler +
`clearTimeout(urlTimer)`.

### Phase 3: The predicate gate (CI)

**Depends on:** Phase 1 only — it tests `analytics.mjs`, not the call sites.
**Independent of:** Phase 2 and Phase 4.

**Tasks:** build-checks group 10 · header count 9→10 · verdict line 9→10.

### Phase 4: The wiring gate (operator-run, three engines)

**Depends on:** Phase 2 (there is nothing to observe until the call sites exist).

**Tasks:** build-journey check [17b] · run `all` engines · record the result in the report.

### Phase 5: Docs + the cascade gates

**Depends on:** Phases 1-4 (the line count is not final until every edit is written).

**Tasks:** `CLAUDE.md:17` · stage · `gen-loc-summary --check` · the conditional VR branch ·
`drift-check` · `token-lint`.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### 0. SETUP — branch from a verified `main`

- **IMPLEMENT**: `git fetch && git checkout main && git pull` — confirm `74404c1` (PR #159) and
  `2a9682e` (PR #161) are both present, then `git checkout -b feature/build-analytics-149`.
- **GOTCHA**: the session opened on `fix/portal-origin-guard-157`, which is merged. Memory
  `owner-merges-fast-verify-landed`: verify the commits landed before branching, don't assume.
  Memory `shared-worktree-parallel-sessions`: this working dir is shared — verify the branch again
  right before committing, and stage by explicit path.
- **VALIDATE**: `git log --oneline -3 && git status` → clean tree on the new branch.
- **SATISFIES**: (prerequisite)

### 1. UPDATE `system/analytics.mjs` — the node-safety guard

- **IMPLEMENT**: L29 becomes
  `if (typeof document !== "undefined" && BEACON_TOKEN && location.hostname === PRODUCTION_HOST) {`.
  Extend the existing L13-22 comment block with one sentence naming *why*: `tooling/build-checks.mjs`
  imports `build-keep.mjs` and `pattern-render.mjs`, which will import this module, so filling the
  token at launch must not break CI.
- **PATTERN**: `system/pack-derived.mjs:515` · `system/build-keep.mjs:339`.
- **IMPORTS**: none.
- **GOTCHA**: guard on **`document`**, not `location` — the injected branch touches
  `document.createElement` and `document.head`, so a `location`-only guard still throws once
  `PRODUCTION_HOST` is filled too. Group 10 fills **both** constants precisely to catch that.
- **VALIDATE** (this is the check that fails before the fix — run it both ways):
  ```sh
  # RED before this task, GREEN after:
  node -e 'const fs=require("fs");const s=fs.readFileSync("system/analytics.mjs","utf8")
    .replace("const BEACON_TOKEN = \"\";","const BEACON_TOKEN = \"tok\";")
    .replace("const PRODUCTION_HOST = \"\";","const PRODUCTION_HOST = \"example.com\";");
    import("data:text/javascript,"+encodeURIComponent(s)).then(()=>console.log("node-safe ✓"),e=>{console.error("THROWS:",e.message);process.exit(1)})'
  ```
- **SATISFIES**: AC7

### 2. ADD `flip()` + the two events to `system/analytics.mjs`

- **IMPLEMENT**: below `trackFactoryArrived`, add:
  ```js
  // ------------------------------------------------------------------ /build (epic #134, #149)
  // Two events for the sixth public surface. Like /factory/shared (above) this EXTENDS the epic's
  // analytics call rather than executing it: docs/epics/portfolio-v3-experience.architecture.md:25
  // names only /factory/built, so a reviewer should read this as a scope decision — delete these two
  // functions and their two call sites and nothing else changes.
  //
  // Both paths are module-level literals and stay that way. A virtual route IS the entire payload,
  // and /build's promise is that nothing about the visitor's tokens, answers or board leaves the
  // browser — so no id, no slug, no pattern name is ever appended. build-checks group 10 asserts the
  // pushed path against a location.search that is carrying a real ?b= payload.

  // Unlike the four above, these two are called from INSIDE catch blocks — pattern-render.mjs's
  // catch renders "the renderer refused this composition", build-keep.mjs's says "the link could not
  // be built". A browser refusing pushState (file://, sandboxed) must not be reported as either, so
  // the flip is guarded here rather than at each call site. build-keep.mjs:206 guards its own
  // replaceState the same way. The four above keep their own bodies: none of them is called from a
  // catch, and their comments carry decisions worth leaving undisturbed.
  function flip(path) {
    const real = location.pathname + location.search + location.hash;
    try {
      history.pushState(history.state, "", path);
    } catch {
      return; // no session history to push — nothing recorded, nothing broken
    }
    setTimeout(() => {
      try { history.replaceState(history.state, "", real); } catch { /* nothing to restore */ }
    }, RESTORE_DELAY_MS);
  }

  const BUILD_PATTERN_PATH = "/build/pattern";
  let buildPatternFired = false;

  // Fired when a pattern is actually ON STAGE — from the last line of pattern-render.mjs's
  // renderPattern, the one branch that means it. NOT from the data-pattern-stage="ready" flag, which
  // is also set for the empty, out-of-library, refused and vocabulary-unavailable branches: that flag
  // means "this stage has settled", not "a pattern rendered". /build pageviews vs this path is the
  // funnel-completion ratio. Own fire-once guard, for the reason trackFactoryBuilt's has one.
  export function trackBuildPattern() {
    if (buildPatternFired) return;
    buildPatternFired = true;
    flip(BUILD_PATTERN_PATH);
  }

  const BUILD_SHARED_PATH = "/build/shared";
  let buildSharedFired = false;

  // The /build half of /factory/shared: fired once when the visitor HAS a link — clipboard granted
  // or the select-the-field fallback, since both leave them holding it. Same caller contract as
  // trackFactoryShared: build the URL and put it in the address bar BEFORE calling this, or the
  // 50 ms flip window rewrites location out from under the code that is still assembling it.
  export function trackBuildShared() {
    if (buildSharedFired) return;
    buildSharedFired = true;
    flip(BUILD_SHARED_PATH);
  }
  ```
- **PATTERN**: `analytics.mjs:51-64` (`trackFactoryBuilt`) for the const/guard/export shape;
  `:74-77` for the "this extends the architecture call" register.
- **GOTCHA**: keep `RESTORE_DELAY_MS` shared — do not introduce a second delay constant.
- **VALIDATE**: re-run task 1's node-safety command (still ✓) plus
  ```sh
  node -e 'globalThis.location={pathname:"/build.html",search:"?b=abc",hash:""};
    const p=[];globalThis.history={state:null,pushState:(s,t,u)=>p.push(u),replaceState:(s,t,u)=>p.push("R:"+u)};
    import("./system/analytics.mjs").then(async m=>{m.trackBuildPattern();m.trackBuildPattern();m.trackBuildShared();
      await new Promise(r=>setTimeout(r,200));console.log(p)})'
  # expect: [ '/build/pattern', '/build/shared', 'R:/build.html?b=abc', 'R:/build.html?b=abc' ]
  ```
- **SATISFIES**: AC1, AC5, AC6

### 3. UPDATE `system/pattern-render.mjs` — fire `/build/pattern` from the success path

- **IMPLEMENT**: import `trackBuildPattern` from `./analytics.mjs` (alongside the existing
  `./agentic-renderer.mjs` / `./action-bus.mjs` imports, L33-37). Append as the **last line of
  `renderPattern`**, after `root.replaceChildren(body)` (L195):
  ```js
    // The pattern is on stage — THIS is "a pattern rendered", so the event fires here and not at
    // render()'s `root.dataset.patternStage = "ready"` below, which also runs for the empty,
    // out-of-library, refused and vocabulary-unavailable branches. Same lesson as peak.mjs:240.
    trackBuildPattern();
  ```
- **PATTERN**: `system/peak.mjs:240-243`.
- **IMPORTS**: `import { trackBuildPattern } from "./analytics.mjs";`
- **GOTCHA**: `renderPattern` is called from inside a `try` (L220-224). It is safe **only** because
  `flip()` swallows a refused `pushState` — if task 2's guard is dropped, a `file://` load renders a
  refusal card claiming the renderer refused a composition it never saw. Do not move the call above
  `root.replaceChildren(body)`: `renderComposition` can throw at L188, and a pattern that never
  reached the DOM must not be counted.
- **VALIDATE**: `node --check system/pattern-render.mjs` and
  `node -e 'import("./system/pattern-render.mjs").then(()=>console.log("node-import ✓"))'`
  (must stay clean — build-checks imports this file), then the browser check in task 6.
- **SATISFIES**: AC1, AC3

### 4. UPDATE `system/build-keep.mjs` — fire `/build/shared` after the link exists

- **IMPLEMENT**: import `trackBuildShared` from `./analytics.mjs`. Restructure the copy handler
  (L237-259) minimally so the event fires **outside** the outer `try`, on the path where the visitor
  actually has the link:
  ```js
  copyBtn.addEventListener("click", async () => {
    if (!latest) return;
    copyBtn.disabled = true;
    let built = null; // the URL, if it got as far as the address bar and the field
    try {
      const url = await currentUrl();
      linkLive = true;
      replaceUrl(url);
      linkInput.value = url;
      linkInput.hidden = false;
      built = url;
      try {
        await navigator.clipboard.writeText(url);
        say("Link copied. It is in your address bar too, and it rebuilds this whole build in any browser.");
      } catch {
        // Clipboard access is permissioned and can be refused; the link is still right there.
        linkInput.select();
        say("Your browser did not allow the copy. The link is selected in the field above, so copy it from there.");
      }
    } catch (err) {
      say(`The link could not be built. ${err.message}`);
    } finally {
      copyBtn.disabled = false;
    }
    if (!built) return;
    // A pending debounce is stale by definition here: the URL just written IS the current one. It
    // also cannot be allowed to run inside the tracker's 50 ms window, where currentUrl() would read
    // location.href as the virtual path and write a search-less link the restore then reverts.
    clearTimeout(urlTimer);
    // Both outcomes above leave the visitor holding the link — the clipboard one and the
    // select-the-field one — which is what this event counts. Outside the try on purpose: a browser
    // refusing pushState must not be reported as "the link could not be built" (it was built).
    trackBuildShared();
  });
  ```
- **PATTERN**: `system/close.mjs:148-164` is the same control, already solved: `buildShareUrl()`
  runs **before** any tracking (`:169`, "the event rewrites location for ~50ms"), and `handOver(url)`
  fires `trackFactoryShared()` on *both* success paths with the comment "the event has to mean 'the
  reader has a link', not 'the reader pressed a button that may have failed'". Mirror that reasoning;
  the shape differs only because `build-keep`'s handler is `async` and writes the URL itself.
  Also `analytics.mjs:78-79` (build the URL first).
- **IMPORTS**: `import { trackBuildShared } from "./analytics.mjs";`
- **GOTCHA**: `built` must be set **after** `replaceUrl` + `linkInput.value`, so the tracker's `real`
  snapshot carries `?b=`. Do not fire in `finally` — that is the
  `spine-analytics-slot-fires-regardless` trap: it runs on the encode-failure path too.
- **VALIDATE**: `node --check system/build-keep.mjs` and
  `node -e 'import("./system/build-keep.mjs").then(m=>console.log("specMarkdown export:", typeof m.specMarkdown))'`
  → `function` (build-checks:46 depends on this import staying clean), then task 6's [17b].
- **SATISFIES**: AC1, AC4

### 5. ADD group 10 to `tooling/build-checks.mjs` — the PREDICATE

- **IMPLEMENT**: after the origin group (L1062), add a group whose header states the split in the
  same words the origin group uses. Body, in this exact order:
  1. Read `system/analytics.mjs` from disk; produce `mutated` by replacing **both**
     `const BEACON_TOKEN = "";` and `const PRODUCTION_HOST = "";` with dummy values.
     `ok(mutated !== src && !mutated.includes('BEACON_TOKEN = ""'), …)` — **assert the mutation
     landed** before concluding anything from it, or this is a check that cannot fail.
  2. `await import("data:text/javascript," + encodeURIComponent(mutated))` inside a `try` **while
     `globalThis.location` is still undefined** → `ok(!threw, …)` with a message naming the launch
     failure ("filling BEACON_TOKEN would break CI's verify job at import").
  3. Only then define the stubs:
     `globalThis.location = { pathname: "/build.html", search: "?b=<a realistic encoded payload>", hash: "" }`
     and a `history` stub recording every `pushState`/`replaceState` url.
  4. `await import(pathToFileURL(join(ROOT, "system/analytics.mjs")).href)` — the real shipped file,
     fresh instance, guards unconsumed (nothing else in this file imports it).
  5. Call `trackBuildPattern()` twice and `trackBuildShared()` twice. Assert: exactly two pushes;
     they are **exactly** `"/build/pattern"` and `"/build/shared"`; each matches `/^\/build\/[a-z]+$/`;
     and **neither contains any substring of the `?b=` payload** — the ticket's "the path carries no
     build data" promise, checked against a `location.search` that is carrying some.
  6. `await new Promise(r => setTimeout(r, 200))` → assert both replaceState calls restored
     `"/build.html?b=<payload>"` verbatim.
  7. `delete globalThis.location; delete globalThis.history;` before `group(…)`.
  8. `group("analytics", "module imports node-safe with a filled token · 2 static paths · no ?b= payload in either · fires once each · restores the URL");`
- **PATTERN**: `tooling/build-checks.mjs:1006-1062` (the origin group) — header comment, `ok(...)`
  messages that name the consequence, `group(...)` summary line last.
- **IMPORTS**: `readFileSync`, `join`, `pathToFileURL` are already imported (L39-41).
- **GOTCHA**: order is load-bearing — defining `globalThis.location` before step 2 would *mask* a
  missing guard, because `location.hostname` would resolve instead of throwing. Do not hard-code
  `50` for the restore delay; sleep comfortably longer (200 ms) so the check is not a timing race.
  Then update **L4** ("Nine groups") and **L1071** (`"all 9 groups pass"`) to ten/10.
- **VALIDATE**:
  ```sh
  node tooling/build-checks.mjs                       # → build ✓ all 10 groups pass
  # prove group 10 can fail — revert the guard, expect a named failure, restore:
  perl -pi -e 's/typeof document !== "undefined" && BEACON_TOKEN/BEACON_TOKEN/' system/analytics.mjs
  node tooling/build-checks.mjs; git checkout system/analytics.mjs
  ```
  Also prove the SDK-free invariant still holds (CLAUDE.md):
  `mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules`
- **SATISFIES**: AC5, AC6, AC7, AC9

### 6. ADD check [17b] to `tooling/build-journey.mjs` — the WIRING

- **IMPLEMENT**: insert **before** `[18] console cleanliness` (L706) so cleanliness stays last. Own
  context + page; install the recorder *before* navigating:
  ```js
  console.log("\n[17b] the two virtual-route events fire on the success paths, once, and restore the URL");
  // build-checks group 10 proves the HELPER: static paths, fire-once, restore. Only a running page
  // can prove the WIRING — that the calls sit where the names claim. pushState fires no event a
  // listener could catch, so the recorder wraps it and calls through, observing without altering.
  const anaCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const anaPage = await newPage(anaCtx);
  await anaPage.addInitScript(() => {
    window.__flips = [];
    const real = history.pushState.bind(history);
    history.pushState = function (s, t, u) { window.__flips.push(String(u)); return real(s, t, u); };
  });
  await anaPage.goto(`${BASE}/build.html`, { waitUntil: "load" });
  await anaPage.waitForSelector("[data-build-keep='ready']");
  // Act 4 is behind an IntersectionObserver, so an unscrolled page never renders a pattern — and
  // must therefore never claim one. This is the only cheap proof that the event tracks a RENDER and
  // not a page load, because the fire-once guard makes every later state indistinguishable.
  t("no /build/pattern before Act 4 is reached",
    !(await anaPage.evaluate(() => window.__flips)).includes("/build/pattern"));
  await anaPage.evaluate(() => document.getElementById("act-pattern").scrollIntoView());
  await anaPage.waitForSelector("[data-pattern-stage='ready']", { timeout: 15000 });
  const afterRender = await anaPage.evaluate(() => window.__flips.filter((u) => u === "/build/pattern"));
  t("exactly one /build/pattern once the stage renders", afterRender.length === 1, `got ${afterRender.length}`);
  // …drive one board edit (mirror [5]'s rename) → assert still exactly one (fire-once on the page)…
  // …click the copy button (mirror [6]) → wait for ?b= in the URL…
  const shares = await anaPage.evaluate(() => window.__flips.filter((u) => u.startsWith("/build/shared")));
  t("exactly one /build/shared on copy", shares.length === 1, JSON.stringify(shares));
  t("neither path carries any build data", (await anaPage.evaluate(() => window.__flips))
    .every((u) => /^\/build\/(pattern|shared)$/.test(u)), …);
  t("the URL is restored, with ?b= intact", anaPage.url().includes("b="), anaPage.url());
  await anaCtx.close();
  ```
- **PATTERN**: check `[6]` (L340-405) for the copy + `?b=` wait; check `[5]` (L263-278) for a board
  edit; `[4c]` (L187-215) for the "one page, one first copy" discipline — **this check needs its own
  context** for the same reason.
- **GOTCHA**: the `?b=` wait in [6] is self-healing across a flip (it polls, misses during the 50 ms
  window, sees it after the restore) — but assert the **final** URL after the wait, never inside the
  window. Wait on the URL/field, not on a fixed sleep. `history.pushState` must be called through, or
  the restore never happens and every later check on that page sees a virtual URL.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs &` then
  `node tooling/build-journey.mjs all` → chromium + firefox + webkit all ✓, zero page errors.
  Re-run and quote **[6]** and **[16]** (the reduced-motion round-trip, L640-670) in the report:
  they are the two checks the flip could plausibly disturb, so "unchanged" must be observed, not
  assumed.
- **SATISFIES**: AC2, AC3, AC4, AC8

### 7. UPDATE `CLAUDE.md:17` — the architecture-map line

- **IMPLEMENT**: the line still says the beacon plus one "factory driven" event. Replace with a line
  naming the family and the rule, e.g.: `analytics.mjs   CF Web Analytics beacon (public token +
  production host, both filled at launch; node-safe behind a typeof document guard because
  build-checks imports its consumers) + the virtual-route event helpers — CF WA has no custom
  events, so an event is a pageview at a synthetic path: /factory/{driven,built,shared,arrived} on
  home and /build/{pattern,shared} on the builder. Each fires ONCE from its success path, never from
  a slot or a settled-state flag that runs regardless, and the path is a static literal — it is the
  whole payload (tickets #6, #75, #77, #149)`.
- **PATTERN**: the `portal/lib/origin.mjs` entry added in #157 — a map line that names the trap, not
  just the file.
- **GOTCHA**: keep it one entry; do not restructure neighbouring lines (memory: baseline/diff
  discipline — CLAUDE.md churn makes reviews noisy).
- **VALIDATE**: `git diff CLAUDE.md` → exactly one line changed.
- **SATISFIES**: AC10

### 8. GATES — stage, then the loc-summary cascade (**expect drift; plan for the regen**)

- **IMPLEMENT**: `git add` the changed paths explicitly, then run the cascade. **Runtime headroom is
  53 lines**: the group's raw count is 17,397, rounds to 17,400, and 17,450 flips it to 17,500. The
  task sketches above come to roughly 65 added lines (~50 in `analytics.mjs`, ~5 in
  `pattern-render.mjs`, ~10 in `build-keep.mjs`), so **the expected outcome is that it crosses** and
  the approach-baseline regen is part of this PR, not a contingency. Do not shorten a load-bearing
  comment to dodge it.
  - **Expected — `--check` drifts**: `node agent-layer/gen-loc-summary.mjs`, stage the regenerated
    JSON, **and** re-capture `approach-neutral.png` + `approach-saulera.png` in the same PR.
    approach.html renders the runtime group's number, so shipping the flip without the baselines
    turns CI's `visual` job red. Capture from a **clean detached worktree under `/Users`** (memory:
    the gate screenshots the *working tree*; `/private/tmp` is outside Docker's shared paths):
    ```sh
    rm tooling/visual-regression/baselines/approach-neutral.png \
       tooling/visual-regression/baselines/approach-saulera.png
    cd tooling/visual-regression && npm run update:docker
    ```
  - **Only if `--check` is green**: nothing further; approach's baselines are untouched. Say which
    branch happened in the report.
- **GOTCHA — two traps, both of which make a green run lie:**
  1. `rm` the two PNGs **first**. The only pixel change is `≈17,400` → `≈17,500` — three digits — and
     `update:docker` will not rewrite a baseline whose diff is below pixelmatch's per-pixel threshold
     (memory: `vr-update-skips-subperceptual`).
  2. A passing update run is **not** proof the baseline moved: `maxDiffPixels: 100` swallows a few
     changed digits (memory: `vr-tolerance-hides-text-changes`). Confirm the file actually changed —
     `git status` shows both PNGs modified, and the new capture reads 17,500 — before believing it.
  Also: `gen-loc-summary` reads the **index** (`git show :<path>`), so `--check` before staging is a
  false "no drift" (memory: `loc-summary-counts-tracked-only`). Stage first, every time. No `/build`
  VR churn is expected — the flip changes the URL, not a pixel — so if any `build-*.png` diff
  appears, stop and find out why before regenerating it.
- **VALIDATE**:
  ```sh
  git add system/analytics.mjs system/pattern-render.mjs system/build-keep.mjs \
          tooling/build-checks.mjs tooling/build-journey.mjs CLAUDE.md
  node agent-layer/gen-loc-summary.mjs --check
  node tooling/drift-check.mjs
  node tooling/token-lint.mjs
  ```
- **SATISFIES**: AC11

### 9. COMMIT + PR

- **IMPLEMENT**: one atomic commit (`feat(analytics): /build/pattern + /build/shared — two virtual
  routes fired from the success paths (#149)`), plus separate commits for the report and review
  artifacts. PR body **must** carry `Closes #149`.
- **PATTERN**: CLAUDE.md Git rules; memory `prs-dont-auto-close-tickets` — a title mentioning `(#149)`
  closes nothing.
- **GOTCHA**: verify the branch again immediately before committing (shared worktree). Commit
  `.claude/plans/build-analytics-virtual-routes.md`, `.claude/reports/…`, and
  `.claude/code-reviews/pr-<N>-review.md` in the same PR — four artifacts were nearly lost this way
  on PRs #97-#100.
- **VALIDATE**: `gh pr view --json body | grep "Closes #149"` · `gh pr checks` → `verify` green.
- **SATISFIES**: AC12

---

## TESTING STRATEGY

There is no unit-test suite in this repo (CLAUDE.md: "no suite, no linter, no type-check — don't
hunt for or invent one"; "done" = run the surface you touched). The two committed gates are the
tests, and they split along the line #157 drew:

### Predicate (CI — `tooling/build-checks.mjs` group 10)

Pure Node, no browser. Covers what the helper does in isolation: node-safety with a **filled** token,
the two paths as exact literals, no `?b=` payload leaking into a path, fire-once, URL restored. Its
own falsifiability is part of the task: revert the guard, watch group 10 name the failure, restore.

### Wiring (operator-run — `tooling/build-journey.mjs` [17b], three engines)

Chromium + Firefox + WebKit against the running page. Covers what CI cannot reach: that the calls sit
where the names claim (zero flips before Act 4 renders; one after), that a board edit does not
re-fire, that copy fires exactly one `/build/shared`, and that the address bar comes back with `?b=`
intact.

### Regression surface to re-run, not assume

- build-journey `[6]` — the share link opened in a fresh context.
- build-journey `[7]` — the dock and the query string.
- build-journey `[9]` — a tampered link's scrub. **Run three times**: it is the one check a flip open
  across `restore()`'s `replaceUrl` could disturb (see NOTES), and the collision is viewport-timed
  rather than deterministic.
- build-journey `[16]` — the whole journey under `prefers-reduced-motion`.
- `node tooling/build-checks.mjs` with `portal/node_modules` moved aside (the SDK-free invariant).

### Edge cases that must be covered

| Edge | Expected | Where |
| --- | --- | --- |
| `BEACON_TOKEN` + `PRODUCTION_HOST` filled, imported in Node | no throw | group 10 |
| pattern stage settles as empty / out-of-library / refused / unavailable | no `/build/pattern` | [17b] (unscrolled page) + code review of the fire site |
| the same page re-renders the stage after an edit | still one `/build/pattern` | [17b] |
| clipboard refused (WebKit/Firefox permissions differ) | `/build/shared` still fires — the visitor has the link | [17b] across three engines |
| encode fails, so no link exists | **no** `/build/shared` | the `if (!built) return;` guard; review |
| a rename ~400 ms before the copy click | the address bar keeps the fresh `?b=` | `clearTimeout(urlTimer)`; [17b] final-URL assertion |
| `file://` (no session history) | nothing fires, nothing breaks, no false refusal card | `flip()`'s `try`/`catch`; review |
| a `?b=` payload in `location.search` at fire time | the pushed path contains none of it | group 10 |

---

## VALIDATION COMMANDS

Execute every command. Zero regressions, 100% feature correctness.

### Level 1: Syntax & shape

```sh
node --check system/analytics.mjs
node --check system/pattern-render.mjs
node --check system/build-keep.mjs
node tooling/token-lint.mjs
```

### Level 2: The predicate gate

```sh
node tooling/build-checks.mjs                 # → build ✓ all 10 groups pass
mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules
```

### Level 3: The wiring gate (three engines)

```sh
node tooling/visual-regression/serve.mjs &    # repo root on 127.0.0.1:4757
node tooling/build-journey.mjs all            # chromium + firefox + webkit
```

### Level 4: Generated-artifact + drift gates

```sh
git add -A && node agent-layer/gen-loc-summary.mjs --check
node tooling/drift-check.mjs
# only if loc-summary drifted:
cd tooling/visual-regression && npm run update:docker
```

### Level 5: Manual validation (the surface you touched)

1. `npx serve .` → open `/build`, DevTools console open.
2. Do **not** scroll: confirm no `/build/pattern` entry in the History panel and zero console errors.
3. Scroll to Act 4 → the pattern renders; the address bar flickers to `/build/pattern` and returns.
4. Answer a question so the stage re-renders → **no** second flip.
5. Click "Copy the link that rebuilds this" → `/build/shared` flips once, and the address bar settles
   on `/build?b=…` with the same value shown in the field.
6. Open `#appearance`, close it → `?b=` still in the URL (build-journey [7] in miniature).

---

## ACCEPTANCE CRITERIA

- [ ] **AC1** — `system/analytics.mjs` exports `trackBuildPattern` and `trackBuildShared`, each with
      its own fire-once guard and a static module-level path literal.
- [ ] **AC2** — `/build/pattern` does **not** fire on a page where Act 4 is never reached.
- [ ] **AC3** — `/build/pattern` fires exactly once, from `renderPattern`'s success path, and not
      from `data-pattern-stage="ready"` (which four non-rendering branches also set).
- [ ] **AC4** — `/build/shared` fires exactly once when the visitor has a link, on both the
      clipboard-granted and select-the-field paths, and never when the link could not be built.
- [ ] **AC5** — neither pushed path carries any part of the build: asserted against a
      `location.search` holding a real `?b=` payload.
- [ ] **AC6** — after each flip the URL is restored verbatim, `?b=` intact.
- [ ] **AC7** — `system/analytics.mjs` imports cleanly in Node with **both** `BEACON_TOKEN` and
      `PRODUCTION_HOST` filled; the check that proves it fails when the guard is reverted.
- [ ] **AC8** — `tooling/build-journey.mjs all` passes on chromium, firefox and webkit with zero page
      errors, including the pre-existing checks [6], [7] and [16].
- [ ] **AC9** — `node tooling/build-checks.mjs` reports **all 10 groups pass**, and still does with
      `portal/node_modules` moved aside.
- [ ] **AC10** — `CLAUDE.md`'s `analytics.mjs` map line names all six events and the success-path rule.
- [ ] **AC11** — `gen-loc-summary --check` (run **after** staging) is green, or — the expected case —
      the regenerated JSON **and** both re-captured approach baselines ship in the same PR, with the
      new capture confirmed to actually read the new number; `drift-check` and `token-lint` green.
- [ ] **AC12** — the PR body carries `Closes #149`; plan, report and review are committed in it.
- [ ] No visual change: no `/build`, home or work baseline moves.
- [ ] No new dependency; shipped pages stay vanilla.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Group 10 proven falsifiable (reverted the guard, saw it fail, restored)
- [ ] build-journey run on all three engines, output quoted in the report
- [ ] loc-summary cascade resolved (drift or no drift, stated explicitly)
- [ ] `drift-check` + `token-lint` green
- [ ] Manual validation on the running page confirms the flips and the restore
- [ ] Acceptance criteria all met
- [ ] Plan + report + review committed in the PR; `Closes #149` in the body

---

## OPEN QUESTIONS / ASSUMPTIONS

**Decided with the owner, 2026-07-28 — do not re-litigate, say so in the PR:**

- **D1 — the event set: two.** `/build/pattern` + `/build/shared`. Explicitly declined, each with its
  reason recorded above in Non-Goals: "reached the builder" (already a native pageview of a real
  page), import success/refusal (no PRD metric; refusals bundle user error), arrival on `?b=` (the
  dock/`location.hash` collision that `build-journey.mjs:431` already asserts against).
- **D2 — the names: `/build/pattern`, `/build/shared`.** Mirrors the existing convention exactly —
  `/factory/driven` is a synthetic child of the real `/factory` page, so `/build/*` is a synthetic
  child of the real `/build` page. Rejected: a single `/factory/*` prefix for every event, which
  would put `/factory/pattern` on a page that is not `/factory`.
  **Verified in planning, because it is the one thing that could make D2 wrong rather than merely
  different:** the site links to the builder extensionless — `index.html:328` and `work.html:210`
  both use `href="/build"`, the same form as `/approach` and `/factory` — and CF Pages serves
  `build.html` at `/build`, redirecting `/build.html` to it. So the recorded pageview is `/build` and
  the two new paths really are its children in the dashboard, which is what makes the funnel ratio
  one comparison instead of two unrelated rows. (`build-journey.mjs` navigates to `/build.html`
  because it drives a plain static file server, not CF Pages — irrelevant to the flip, whose path is
  a literal either way.)

**Assumptions this plan makes:**

- **A1 — the loc-summary branch is genuinely unknown.** Raw runtime is 17,397 with the boundary at
  17,450 (measured in planning, not estimated: `git ls-files | grep -E '^system/(wc/)?[^/]+\.(css|mjs|js)$'`
  summed against the index). 53 lines of headroom, against a ~40-55 line change. Both branches are
  planned in task 8. If the implementation's comments run longer than the sketch, the VR regen is
  the cost — take it; do not shorten a load-bearing comment to dodge a baseline.
- **A2 — `pushState` fires neither `hashchange` nor `popstate`**, so the flip cannot toggle the
  appearance dock (`dock.mjs:441,453` syncs on `hashchange` only). Verified against MDN in planning;
  build-journey [7] and [17b] together observe it on the running page. If an engine disagrees, the
  engine wins and the plan gets an AMENDMENT.
- **A3 — nothing else on `/build` reads `location.search` late enough to be caught by a flip.**
  `build-keep.mjs`'s `restore()` reads it at mount, long before either event can fire (the pattern
  event needs Act 4 in view; the share event needs a click). This is the ordering hazard that forced
  `trackFactoryArrived` to defer to `load`; here the ordering is structural, not timed — which is
  also the third reason the arrival event is out of scope.
- **A4 — Playwright's `addInitScript` runs before the page's own modules.** If it turns out not to on
  some engine, the fallback is `page.on("framenavigated")`, which Playwright emits for same-document
  History-API navigations. Try the init script first: it is deterministic and it records the exact
  argument, not a derived URL.
- **A5 — CF Web Analytics still has no custom events.** Re-confirm at the FAQ link before extending
  the mechanism. If that changed, this ticket is still correct but the *next* one would not be.

**Questions that would change this plan if answered differently** (none are blocking):

- Should the four existing trackers be refactored onto `flip()`? This plan says **no** — see NOTES.
  A reviewer who disagrees is disagreeing with a recorded decision, not catching an oversight.

---

## NOTES (open canvas)

### Why "reached the builder" is not an event

`build.html` is a real page at a real path. CF WA records its pageview natively, including on SPA
route changes. A synthetic `/build/opened` would be a second name for a fact the dashboard already
has, and it would make the funnel *harder* to read: the denominator would exist twice. The ticket's
first bullet is answered by doing nothing, which is worth saying out loud in the PR because "we
skipped one" and "that one was already measured" look identical in a diff.

### Why the four existing trackers don't move onto `flip()`

Tempting: four near-identical five-line bodies, and this ticket adds a fifth and sixth. Declined for
three reasons, in order of weight:

1. **Different contracts.** `trackFactoryArrived` defers to `load` and re-reads `real` inside the
   handler — deliberately, after a measured 7-of-25 failure documented at `analytics.mjs:95-104`. It
   cannot share a body with the others without either losing that or pushing an option into `flip()`.
2. **The guard is only needed by the new pair.** `flip()` swallows a refused `pushState` because its
   two callers sit inside `catch` blocks that would otherwise report a browser refusal as a renderer
   refusal or a failed link. None of the four is called from a `catch`. Adding the swallow to them
   changes behaviour on pages this ticket is not testing.
3. **CLAUDE.md**: surgical changes, don't improve adjacent code. Those four functions carry decision
   comments from #6, #75 and #77 that a refactor would either strand or paraphrase.

The cost is one duplicated shape in a 160-line file. Cheap, and legible.

### The flip-window race, in full

`currentUrl()` is `shareUrl(location.href, encoded)` — `new URL(base)` over the *live* URL. During a
flip, `location.href` is `<origin>/build/shared` with no search. So a debounce callback landing
inside the 50 ms window produces `<origin>/build/shared?b=…`, writes it via `replaceUrl`, and the
tracker's restore then replaces that with `real` — the pre-flip URL carrying the *previous* `?b=`.
Net effect: the address bar and the field silently go stale after an edit, on a page whose entire
promise is that the link rebuilds the build.

Reachability: `URL_DEBOUNCE_MS` is 400 and the flip window is 50, so a `BUILD_CHANGE` ~350-400 ms
before the copy click lands inside it. A rename keystroke followed by reaching for the button is
exactly that gesture.

`clearTimeout(urlTimer)` in the copy handler closes it, and is right on its own terms: the copy just
wrote the freshest URL, so a pending timer is stale by definition. Write the comment that way — a
reader should not have to know about analytics to see why the line belongs.

A narrower window remains and is accepted: a `BUILD_CHANGE` arriving *during* the 50 ms window arms a
new timer that fires 400 ms later, i.e. after the restore, so it computes from the real URL. Fine.

**The third `replaceUrl` caller — enumerate it, don't just fix the debounce.** `replaceUrl` has three
callers on `/build`: the copy handler (fires the flip itself, so it is ordered by construction), the
debounce (fixed above), and **`restore()`'s scrub at `build-keep.mjs:318-320`**. On a bad `?b=` link
the scrub runs after `await decodeBuild(...)`; if a `/build/pattern` flip happens to be open at that
moment, the tracker's `real` snapshot — taken *before* the scrub — reverts it and the bad param
survives, defeating exactly what the scrub's own comment says it prevents. Journey `[9]` is the check
that would catch it. Reachability is low: #138's probe recorded `pattern-stage ready at load: no` at
1440×900, so the IntersectionObserver has not fired pre-scroll there — but the 800 px `rootMargin`
makes that viewport-dependent for a real reader on a tall screen. **Action: run `[9]` three times and
say so in the report.** If it ever does collide, the fix is to move the scrub's `replaceUrl` after
the restore delay, not to reorder the tracker.

### The one dock window that stays open

`pushState` fires no `hashchange`, so the dock never syncs off a flip. But for 50 ms `location.hash`
is `""`, so a visitor who clicks the dock toggle *inside* that window sets the hash on the virtual
URL, and the restore then replaces it — leaving the panel open with no `#appearance` in the URL, so
Escape (`dock.mjs:455`) will not close it until they toggle again. Requires a click within 50 ms of a
pattern render or a copy click. Not worth a mechanism; worth a sentence, so a future reader who hits
it recognises it rather than re-deriving it.

### An unrelated fact worth one line, not a ticket

`system/pack-derived.mjs:515` self-boots on any page that imports it, and `build-import.mjs` does. So
a hand-crafted `/build?brand=…` URL fires `/factory/arrived` from `/build`. The site never produces
such a URL (`build-share.mjs` writes `?b=` only; home's close beat writes home URLs), so the count
cannot be polluted by anything the site itself does. Noted here so it is a known non-issue rather
than a surprise in the dashboard.

### What the two numbers will and won't say

`/build` pageviews ÷ `/build/pattern` is a completion ratio, not a conversion rate — a reader who
opens the page and scrolls to Act 4 without answering anything still renders the default dashboard
and counts. That is the honest reading, and it belongs in the PR so the first dashboard glance after
launch is not over-read. `/build/shared` is link *production*, not forwarding — the same distinction
`analytics.mjs:70-73` draws for `/factory/shared`, and the same reason the receiving half is a
separate (deferred) event.

## AMENDMENTS

(none — created 2026-07-28)
