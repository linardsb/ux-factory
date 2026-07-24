# PR #66 Review — per-company instance build + unlisted deploy (`build-instance.mjs`, #44 · epic #38)

**Reviewer:** piv-review-pr (fresh-eyes gate + `code-reviewer` agent + advisor)
**Verdict:** 🟡 **Request changes (minor)** — **1 Medium** (latent; fix before the first real `fictional:false` deploy), **3 Low**. The mechanism is correct, complete, and well-tested; the committed demo is unaffected. One undocumented gap violates the ticket's own **AC #1**, and it's a one-line fix — worth doing now rather than leaving as a trap.

> Solo-repo note: GitHub blocks self-`--approve`/`--request-changes`, so this is posted as a `--comment` review (per project convention). Treat the verdict above as the recommendation a human approver should action.

---

## Summary
`agent-layer/build-instance.mjs` (new, +295) is a standalone, run-from-the-jobs-folder orchestrator that compiles a company brief → a self-contained deploy dir **outside** the repo, **stamps** the committed `instance.html` shell into a real `index.html` (regex Mechanism A + B), emits a standalone unconditional-`noindex` `_headers`, validates the assembled dir, and **prints** (never runs) the `wrangler` deploy command. Plus an additive stamping-seam refactor of `instance.html` and the epic write-back. The design is disciplined — physical-identity out-of-repo guard, print-not-deploy, honesty-contract-aware — and the risky surface (regex stamping + injection of the company name) is handled carefully and verified.

I ran the surface (project rule — no suite) and dispatched the `code-reviewer` agent for an independent pass; both are folded in below.

---

## Issues by severity

### 🟠 Medium — Head dev-comment survives stamping → leaks demo/fictional + internal metadata into every real instance's view-source (AC #1)
**`instance.html:13-36`** (the head comment) · **`agent-layer/build-instance.mjs` `stampShell` (L85-145, no strip step)**

`stampShell` rewrites five anchors and toggles the `data-when` regions, but **nothing strips the L13-36 head `<!-- … -->` comment**. It survives into a real instance's `index.html` still containing, verbatim: `demo-configured to the fictional \`scenarios/northwind\` package`, `The demo embeds Verdant's committed derivation run`, and ticket refs `#38 / #43 / #44`. The ticket's **AC #1** (`.claude/plans/…-report`/plan L285) requires a real instance to show **only real copy — no demo/fictional scaffolding**; the head comment isn't among the stamped sites. Report **deviation #5** explicitly set out to keep a real instance's view-source clean and fixed two *adjacent* comments — but missed this block, so this is an **undocumented gap**, not a documented decision.

Secondary symptom (same root cause): Mechanism B's two **unanchored** replaces — `.replace(/\s+data-when="(?:demo|real)"/g, "")` (L140) and `.replace(/\{\{name\}\}/g, nameHtml)` (L142) — also match those phrases *inside this comment* (which literally reads `…toggles the data-when="demo"/"real" prose regions … {{name}} substituted …`), mangling it to `…toggles the/"real" prose regions (…, real un-hidden, <CompanyName> substituted)…`. That accidental mutation is **why `validateAssembly`'s residue checks (L154-155) don't catch the leak** — it removes the exact `data-when=` / `{{` substrings those checks scan for. (Empirically confirmed against the real `instance.html`.)

Not rendered (comments are invisible) and no security/privacy breach — but trivially discoverable via view-source by exactly the technical audience this feature targets. **Fix** (one line, early in `stampShell`, anchored on the comment's unique opening so it can't collide with the `INSTANCE_CONFIG:start/end` markers):
```js
out = out.replace(/<!-- instance\.html[\s\S]*?-->\n?/, "");
```
Optional defense-in-depth: widen the `demo`/`fictional` scan (L184-190) from `<body>`-only to the whole document (minus the `INSTANCE_CONFIG` `<script>`), so any future leak fails the build instead of shipping silently.

*Not blocking merge* — the committed shell is correct for the in-repo fictional demo (there, the comment is accurate). It's latent until the first real deploy. Given it's a one-liner, fix now.

### 🟡 Low #1 — `validateAssembly` INSTANCE_CONFIG extraction is `;`-fragile → false-refuses a valid build
**`agent-layer/build-instance.mjs:174`** — `region.match(/window\.INSTANCE_CONFIG\s*=\s*([\s\S]*?);/)`

The lazy `[\s\S]*?;` stops at the **first** `;`. If any config **string value** contains one — a `--proto`/`--handoff` URL such as `https://…/p?a=1;b=2`, or a `--name` with a semicolon — the capture is a truncated, unterminated JSON string → `JSON.parse` throws → **the build is refused though the emitted JSON is valid**. Confirmed empirically. Fail-safe (refuses rather than ships bad), but blocks a legitimate build. **Fix:** match to the *last* `;` before `</script>`, or slice the marker region and JSON.parse the balanced `{…}`.

### 🟡 Low #2 — No `deployDir` cleanup when `validateAssembly` throws (diverges from the sibling pattern)
**`agent-layer/build-instance.mjs:255-261`**

`stampShell` + `writeFileSync(index.html)` + `validateAssembly` run with no surrounding try/catch — unlike `gen-company-package.mjs:159-165`, which does a `preexisting`-gated `rmSync` on its own validation failure (a pattern this file otherwise mirrors closely). A validation failure leaves a fully-assembled-but-**invalid** `deployDir` on disk; an operator could later `wrangler pages deploy <deployDir>` it manually (e.g. from shell history) without re-running the builder. **Fix:** wrap in try/catch + guarded `rmSync(deployDir, { recursive: true, force: true })` on failure (gate on a `preexisting` check, as the sibling does).

### 🟡 Low #3 — `\bdemo\b` / `\bfictional\b` keyword checks would false-block a real company legitimately named "Demo …" (or a fiction-tools company)
**`agent-layer/build-instance.mjs:167`** (title) + **`:189-190`** (body)

A real company whose name/public copy legitimately contains the standalone word "demo" (e.g. *Demo Health*) or "fictional" would always fail `validateAssembly`. Inherent keyword-heuristic tradeoff — **YAGNI** now, worth knowing before such a brief appears (trivial to special-case then). Same fail-safe class as Low #1.

---

## Validation (project rule — "run the surface you touched")

| Check | Result |
|---|---|
| Module imports (`buildInstance` export) | ✅ PASS |
| Guard throws — out-of-repo ×2, `--public-origin`, missing/nonexistent `--pack`, bad `--trace` ext, missing brief | ✅ **7/7 PASS** |
| Stamping vs. **real** `instance.html` — 5 Mechanism-A anchors fire, 4 demo regions delete, real note un-hides, `{{name}}` substituted | ✅ PASS |
| `validateAssembly` on stamped output | ✅ 0 problems |
| Name-injection escaping — `Acme "Corp" <X>` round-trips through title/meta/JSON/`{{name}}` | ✅ PASS |
| Asset closure — CSS `url()` / fonts | ✅ Complete (neutral shell = system font stack; only `url()` is an inline `data:` SVG; no `/fonts/` dir) |
| Render (deployed instance + committed demo, headless, 0 console errors) | ✅ Report-attested (spike ran end-to-end) |
| Live served-header `curl` | ⚪ N/A — env-blocked (sandbox DNS won't resolve `*.pages.dev`); documented operator ~30s check |

No linter / type-check / VR applies (`instance.html` is out of the VR set → no baseline churn).

---

## What's good (verified, not assumed)
- **HTML-escaping is correct in every injection context** — `nameHtml` (escaped) for title/meta/`#instance-name`/`{{name}}`; raw `name` inside the JSON `<script>` with a `<` breakout guard (correct — entity-escaping would corrupt the JSON); a `-->`-bearing name can't break the head comment (`>`→`&gt;`). Proven with an adversarial name that round-trips exactly.
- **`insideRepo`** mirrors and is *stricter* than `gen-company-package.mjs`'s inode+device containment (blocks any in-repo `--out`, walks non-existent ancestors correctly).
- **`validateAssembly` asset allowlist is complete** against `system/instance.mjs`'s actual `fetch()` surface (`intake.defaults.json`, `copy.json`, `trace.path`) — no validate-vs-load gap.
- Standalone **unconditional-`noindex` `_headers`** (independent of the launch-gated repo `_headers`); **print-not-deploy** discipline; **`--public-origin` hard-throw** over a silent no-op; error messages match house style; `validateAssembly` aggregates *all* problems into one throw.
- The `data-when="real"`-without-trailing-`\b` regex reasoning is correct (and the report shows the original `\b` bug was caught + fixed + guarded during self-verification).
- Documented deviations (5) reviewed — all intentional and sound; none re-flagged.

---

## Recommendation
**Request changes (minor).** Land the one-line head-comment strip (Medium) — it's the only thing that would ship wrong metadata on a real deploy, and it's latent so it won't announce itself. Low #1/#2 are cheap, in-character hardening (they mirror the sibling generator's own guardrails); Low #3 is note-only (YAGNI). With the Medium fixed, this is a clean approve — the core mechanism is correct, careful, and well-verified.

Next: `piv-fix-review-findings` on this report → re-run the guard/stamp surface → a human merges.
