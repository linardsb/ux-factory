# PR #65 Review — private-instance shell (config-driven Factory-station variant)

**Branch**: `feature/private-instance-shell` → `main` · **Commit**: `c4151025` · **State**: OPEN (not draft) · `MERGEABLE` / `CLEAN`
**Plan**: `.claude/plans/private-instance-shell.md` · **Report**: `.claude/reports/private-instance-shell-report.md`
**Closes**: #43 · **Epic**: #38 (`docs/epics/per-company-brief.architecture.md`) · **Unblocks**: #44
**Reviewed at**: `c4151025` (local HEAD == `origin/feature/private-instance-shell`).

## Recommendation: **APPROVE** (two non-blocking Lows)

No Critical / High / Medium issues. The load-bearing change — a config seam in the *shared* wizard so `factory.html` renders byte-identically — is done correctly and is proven behavior-preserving by CI. Validation is green, the honesty contract holds, the DOM-boundary security posture is right, and the change matches the plan's intent. Two Low advisories and one known follow-up below — none block merge.

> **Process**: this verdict is carried by three convergent passes — (1) this review's own read of every changed file + a **live browser walkthrough of `instance.html`** (it is deliberately off the VR set, so nothing in CI renders it — I drove it directly to close that gap), (2) an independent `code-reviewer` agent over the pinned tree, which read both the plan and the diff and reached the same clean verdict while adding functional verification I hadn't (byte-diffing the ported motion CSS, confirming the `--motion-*` tokens actually resolve on the new page), and (3) an advisor cross-check. All three converge; no conflicts.
>
> Posted as a `--comment` review (solo repo — the author can't formally `--approve` their own PR).

## Validation

| Gate | Result | Notes |
|------|--------|-------|
| **CI `verify` job** | ✅ **PASS** | drift-check + token-lint, green on the PR (run `29820062791`, 14s) |
| **CI `visual` job** | ✅ **PASS** | full Playwright VR gate green on the PR (run `29820062791`, 49s). **Only the two `approach-*` baselines changed — `factory` neutral+saulera are pixel-identical.** This is the load-bearing proof: a byte-identical `factory.html` baseline means the shared wizard still *fully initializes* there (a broken auto-init would have frozen the baseline on the `Loading…` seed and failed the gate), so the seam is behavior-preserving at the rendered-output level, not just textually. |
| `node --check` both modules | ✓ | `factory-intake.mjs` + `instance.mjs` both parse |
| Seam-completeness grep | ✓ | every surviving `SCENARIOS`/`DEFAULT_SCENARIO` is a declaration, the signature default, the load-time assert, or a comment — **no stray body reference** (independently enumerated by the code-reviewer: 9 body refs, all switched to the config params) |
| `node scenarios/validate.mjs` | ✓ | 3 packages, **verdicts differ** (habit-justified · utility · utility); `northwind` ✓ 8 questions · 3 records · verdict utility |
| `node tooling/drift-check.mjs` | ✓ | all 8 steps (syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces) |
| `node tooling/token-lint.mjs` | ✓ | 57 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| **Live `instance.html` walkthrough** (Chromium, `python3 -m http.server`) | ✓ | `data-instance="ready"` flips true; **console completely clean** (before & after interaction); 5 stations render with correct capability badges; honesty notices render *fictional-first* then *speculative* + 2 https sources (`rel="noopener noreferrer"`, `target="_blank"`, URL as `textContent`); wizard seeded **`#0a5c6b`**; 4 narrative beats + live `Utility` verdict; ethics **"Not placed"** null path works (reader quadrant from the real engine, maker column "Not placed — the frequency filter already decided"); trace label "Real run, curated for length" verbatim; 2 honest link placeholders |
| Reference integrity | ✓ | configured trace `/traces/pack-seed-verdant.jsonl` (20 KB) + favicon asset exist — no dead links |

## What's done well

- **The config seam is the hard part of this PR, and it's correct.** `init()` → `initIntake({ scenarios = SCENARIOS, defaultScenario = DEFAULT_SCENARIO } = {})` is a minimal mechanical parameterization with zero semantic drift, and the fail-fast enum check (`assertScenarioConfig`) is re-run at **both** boundaries — load-time on the inlined map (`factory-intake.mjs:175`) and call-time on whatever config arrives (`:204`). The auto-init stand-down guard (`!document.querySelector('#factory-wizard[data-intake="external"]')`, `:629`) is a single querySelector — behavior-preserving by construction, and CI proves it.
- **Honesty contract followed precisely.** Fictional notice renders *before* the speculative notice (`instance.mjs:88-95`); the trace label renders verbatim from the committed file and is never restated; capability badges are accurate ("Runs now" only on the wizard + generated stations where `derive()` genuinely runs, replay register on the trace). The committed subject is a clearly-labelled *fictional* company (`northwind`), and its `speculativeNotice`+`sources` deliberately exercise the real-provenance rendering path while the subject stays honestly fictional — `example.com` sources are the honest choice for a fictional subject.
- **DOM-boundary security is right.** `sourcesList` (`instance.mjs:68-87`) is a tight implementation of the untrusted-boundary rule: try/catch'd `URL` scheme check (only http/https become anchors), `textContent` only, security-hardened anchors. Every package-derived string reaches the DOM via `textContent` — no `innerHTML` from package data.
- **The two fetch chains (package · trace) genuinely fail independently** — each `.catch()` is scoped to its own mount, so a package failure error-cards the notices while the trace still mounts (and vice-versa). Verified by design-read and matches the documented edge-case walkthrough.
- **CSS is disciplined.** Every ported `fw-*`/`trace-*`/motion rule is byte-identical to `factory.html` (with provenance comments); the new `pi-*` rules are token-only apart from the already-established literal categories (ch max-widths, grid fractions, the repo's standard 640px breakpoint).
- **The `northwind` package passes every validator check** (brief head, 8 fixed question ids, axes enums, fixture id-uniqueness, date coherence) with no special-casing, and the extra `speculativeNotice`/`sources` keys on a `fictional:true` package are correctly ignored by `checkCopy` — documented in `scenarios/README.md`, not a validation gap.
- **Documented deviations (5) are all reasonable and correctly disclosed** in the report; each maps to a genuine plan divergence (e.g. `esc()` omitted vs Task-5's "el()/esc() copied per convention"; the trace badge resolving the plan's *own* internal tension between Task-6.5 and its Honesty-audit NOTES). No *undocumented* divergences found.

## Findings

### Low 1 — `renderLinks()` assigns a config link href with no scheme guard
`system/instance.mjs:171` (`a.href = href`)

Unlike its sibling `sourcesList()` in the same file (`:73`), which restricts anchors to `http:`/`https:`, `renderLinks()` assigns `config.links[key]` straight to `a.href`. **Not exploitable today** — the shipped `instance.html:430` hardcodes `links: { prototype: null, handoff: null }`, and `INSTANCE_CONFIG` is inline, build-time, first-party data (genuinely a different trust class than the *fetched* `copy.sources`, which this file's own header flags as untrusted). The plan (`private-instance-shell.md:280`) specified the scheme-guard only for the sources list, so this is **not a spec regression** either.

**Consequence**: none today. The value becomes reader-facing per-company data when **#44** wires real link values into `INSTANCE_CONFIG` at build time — a defensive one-line guard now keeps the two link-rendering paths consistent and forecloses a `javascript:`/`data:` href slipping through a future authoring mistake.

**Fix (optional, non-blocking)**: mirror `sourcesList`'s guard — `try { safe = ["http:","https:"].includes(new URL(href).protocol); } catch { safe = false; }`, and fall back to the existing placeholder when unsafe.

### Low 2 — `.pi-link-card` class is applied but has no CSS rule
`system/instance.mjs:167` (`el("article", "card pi-link-card")`)

Repo-wide grep confirms `.pi-link-card` appears **only** at this usage site — no matching rule in `instance.html`'s `pi-*` block or anywhere else (its siblings `.pi-links` / `.pi-link-placeholder` *are* styled at `instance.html:237-238`). **Harmless** — the shared `.card` class fully styles the element — but it's a dead style hook.

**Fix (optional, non-blocking)**: either add the intended rule to `instance.html`'s `pi-*` block, or drop `pi-link-card` from the class list.

## Considered and dismissed (not a defect — recorded for transparency)

- **`defaultScenario` not guaranteed to be a key of `scenarios` inside `initIntake`.** `assertScenarioConfig` validates each scenario's axis defaults but not that `defaultScenario ∈ keys(scenarios)`; a mismatched pair would throw an unclear `Cannot read properties of undefined` at `factory-intake.mjs:217`. **Unreachable from either real caller**: `factory.html` resolves `DEFAULT_SCENARIO="verdant"` against the literal `SCENARIOS` (always has that key), and `instance.mjs:152` always builds `{ scenarios: { [slug]: … }, defaultScenario: slug }` from the *same* `slug` — structurally guaranteed to match. Independently reached the same conclusion in the code-reviewer pass. Adding a guard would be error-handling for an impossible scenario, which CLAUDE.md explicitly rules out — correct to leave as-is.

## Follow-ups (not defects — surfaced for the human)

- **`instance.html` has no VR coverage** (plan assumption #4, deliberate — matches the `/agentic-ui-study` precedent for a fetch-driven, non-IA page). This review closed the resulting gap by driving the page live (all five stations, the `#0a5c6b` seed, the ethics null path, a clean console). A `PAGES` entry gated on `[data-instance="ready"]` + `[data-trace="ready"]` is a possible future follow-up, not a blocker.
- **Stacked/adjacent work**: this closes #43 and unblocks #44 (per-company build + unlisted deploy), which will rewrite the single `window.INSTANCE_CONFIG` line and ship a real company package + pack beside this shell. Low 1's guard is most worth applying *before* #44 wires real link values.

## Acceptance criteria (plan §Acceptance Criteria)

All satisfied on inspection + live walkthrough: fictional+speculative+sources present (AC1); shared wizard configured-not-forked, pre-seeded from `axes`, overrides re-derive live (AC1); trace replays with its committed label + honest "embeds Verdant's run" station copy (AC1); no live LLM / vanilla / no upload surface (AC2); screenshots-in-trace call recorded in page + module headers (AC3); prototype/handoff slots render honest placeholders; `factory.html` rendering unchanged (VR baselines pass untouched); Level 1–3 + CI green; CLAUDE.md map + `scenarios/README.md` updated, `loc-summary.json` + two `approach-*` baselines regenerated in-PR.

---
*Agentic gate — a human now reviews the code + this review and merges.*
