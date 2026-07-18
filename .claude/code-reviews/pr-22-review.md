# PR #22 Review — feat: site shell — five-page IA on the neutral shell + analytics (#6)

**Reviewer:** fresh-eyes agentic gate (piv-review-pr) · **Head:** `feature/site-shell-ia-analytics` @ `018c14d` · **Base:** `main`
**Scope:** 11 files, +843/−77 · **Recommendation: APPROVE** (advisory — see note)

> Reviewed in a clean context off an isolated detached worktree at the PR head, so the parallel `feature/agentic-bridge` work in the shared dir was left untouched. Deep pass dispatched to the `code-reviewer` agent; validation and honesty-contract checks run independently.

---

## Recommendation: **Approve**

No Critical, High, or Medium issues. Validation is green, every honesty-contract claim holds from a clean `main`-based deploy, and the code matches the ticket intent (the 90-second recruiter gate + a deep-linkable, honest Factory stub + a cookieless analytics beacon). The eight deviations in the implementation report are all documented, sound, and honesty-preserving. Two Low / optional notes below — neither blocks merge.

> **Post mechanic:** the reviewer is authenticated as `linardsb`, the PR author — GitHub blocks self-approval, so this verdict is posted as a **comment** stating "Recommendation: Approve." A human still makes the final merge call (which is the intended shape of this gate anyway).

---

## Validation (independently re-run)

| Check | Result |
|---|---|
| `node --check` on `analytics.mjs` + `client.neutral.config.js` | ✅ pass |
| Token discipline — raw color literals in `portfolio.css` | ✅ only the pre-existing sanctioned `.lightbox::backdrop` rgba (line 256); PR added none |
| Per-page invariants (6 pages): one `<h1>`, `noindex`, zero `<style>`, analytics wired | ✅ all six |
| Heading hierarchy — no level skips | ✅ index `h1→h2→h3→h2`; approach long outline never skips; work `h1→h2→h3`; contact/factory/404 single `h1` |
| Route smoke test (CF-Pages-style cleanUrls server) | ✅ `/ /approach /work /contact /factory /derive` + all `/system/*` targets + logo → 200; bogus → 404 |
| Honesty-critical link targets exist on this branch | ✅ `derive.html`, token contract/neutral/components CSS, `portfolio.js`, logos all present + 200 |
| `/derive` import chain parses | ✅ `derive.mjs`/`oklch.mjs`/`wcag.mjs`/`derive.rules.mjs` all `node --check` clean |
| External links | ✅ `github.com/linardsb` + `/ux-factory` → 200 (repo public) |
| Red-flag scan (lorem, TODO, `http://`, inline handlers, raw hex in `style=`) | ✅ none |

No test suite exists in this repo by design (CLAUDE.md: "Done = run the surface you touched"). Validation above maps to that rule.

---

## Issues

**Critical:** none. **High:** none. **Medium:** none.

> Two reviews reconciled: my independent pass + the `code-reviewer` agent's deep pass (read all 10 files in full, traced every href/anchor against the worktree, and **fetched Cloudflare's own Web Analytics docs** to confirm the `analytics.mjs` technique's core assumption — CF's beacon hooks `pushState`/`popstate` but **not** `replaceState`, which is exactly why the restore step stays silent). No conflicts; the agent surfaced two Low a11y items I had not personally checked (both verified below).

### Low / optional (do not block merge)
1. **Factory sections have no heading — `section-label` stays `<div>`, item titles are `<span class="lineup-title">`** — `factory.html:43,67` (labels) and `48,56,72,79,86,93,100` (titles). `components.css` styles `.lineup-title` at `--type-h3`/`display:block` so it *looks* like a heading, but screen-reader heading-navigation gets no landmark for "What runs today" / "What's plan-gated". Not a level-skip (no `h3` exists, so the literal rule holds) — but it's the **one place the PR's own div→h2 pattern (deviation #4, applied to Home §01 + Work §01) wasn't applied.** Fix = pure tag swaps on class-styled elements, zero visual change: `<div class="section-label">`→`<h2>` at 43/67, `<span class="lineup-title">`→`<h3>` at the seven title lines.
2. **Loop-table lacks header-cell scope** — `approach.html:147-150` (four `<th>` with no `scope="col"`) and `155,161,167,173,179` (each row's first cell — the row identifier "Shaping the problem" etc. — is a plain `<td>`, not `<th scope="row">`). Verified against the file. In a 4-column matrix this loses programmatic header↔cell association for AT table navigation. Fix = add `scope="col"` to the four `<th>`; make each row's first `<td>` a `<th scope="row">`.
3. **Analytics deny-list won't exclude CF Pages previews at launch** — `system/analytics.mjs:22,24`. `LOCAL_HOSTS` only blocks `localhost`/`127.0.0.1`; once `BEACON_TOKEN` is filled (the PR's own follow-up), `*.pages.dev` branch-preview deploys would also inject the live beacon and record traffic. **Inert as shipped** (empty token → whole branch is dead code today). Address at launch: gate on a production-hostname allow-list, or accept preview traffic as noise.
4. **Inline `style="margin-top: var(--spacing-*)"` for static spacing** — `index.html:46,95`, `work.html:40`, `approach.html:143` (+2). Token-safe (uses vars — token discipline intact); a spacing utility class (the codebase already uses `mb-md`/`mb-lg`) would keep layout in CSS. Cosmetic, lowest priority.

---

## What's done well
- **Honesty contract is airtight.** `factory.html` §01 "What runs today" links *only* to targets that actually 200 from a clean `main` deploy (`/derive`, the token contract); §02's five pipeline stations are each tagged `In build`. The three-state capability idiom (`Runs now` / `In build` / `Planned`) is used accurately across Home/Work/Factory, and — per the CSS comment and verified in markup — **state is carried by text, not color alone** (`.capability.live` only re-colors). The fictional brief on `work.html` is explicitly labeled "clearly labeled as fictional." The scenarios row was correctly dropped (would 404 pre-#4) with a documented restore path.
- **`analytics.mjs` is careful and well-reasoned.** The CF-WA "no custom events" constraint is handled as a virtual-route pageview with a header explaining why; the beacon injects only with a non-empty public token off-localhost; `trackFactoryDriven()` is idempotent (`fired` guard) and restores the real URL, with the one same-URL history entry explicitly acknowledged as the accepted trade-off (vs. breaking refresh/bookmark).
- **Token discipline held** across 55 new CSS lines — every color via `var(--color-*)`; only dimensional px literals.
- **Identity call is exact** — `linardsberzins@gmail.com` + `github.com/linardsb`, public name "Linards Berzins" (no diacritics), chrome brand stays neutral "ux factory" — matching the ticket-#6 identity decision.
- **Accessibility:** one `h1` per page, no heading skips, the Approach loop-table wrapped in `.table-scroll` (no body overflow at 320px), all seven in-page anchors resolve, `lang="en-GB"` matches the British copy.
- **CLAUDE.md architecture-map updated accurately** (adds `analytics.mjs`, rewrites the shell line for the five-page IA) — keeps the rules file true, no drift.
- **The analytics technique holds against Cloudflare's real behavior, not just the code's own comments.** The deep pass verified externally that CF's beacon hooks `pushState`/`popstate` but not `replaceState` — so the restore step produces no phantom pageview for the real URL — and that the code's cited claims (no custom events "FAQ: Not yet"; architecture §Stack) match the actual docs.
- **The eight documented deviations were spot-checked against the filesystem, not taken on trust** — e.g. `scenarios/check.html` genuinely absent (so dropping that Factory row was honesty-preserving), and `/derive`'s full import chain genuinely present.

---

*Two-reviewer verdict (independent pass + `code-reviewer` deep pass): **Approve.** Posted as a comment because the reviewer is the PR author (GitHub blocks self-approval); a human makes the final merge call — the intended shape of this gate. Follow-up if desired: the four Low items via `piv-fix-review-findings`.*
