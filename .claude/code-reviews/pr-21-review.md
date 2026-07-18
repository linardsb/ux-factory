# Review — PR #21 · agentic bridge (component vocabulary · declarative renderer · action bus)

**Ticket** #11 · Epic #1 · **Head** `feature/agentic-bridge` → **Base** `feature/data-connected-prototypes` (stacked) · **Commit** `00ae849`
**Recommendation: REQUEST CHANGES** — one HIGH robustness/contract gap in the core validator, cheap to fix (a pattern this same PR already applies in its sibling `scenarios/validate.mjs`). Everything else is strong and well-documented.

---

## Summary

A genuinely well-built, well-documented ticket. The three-part bridge — `gen-vocabulary.mjs`, `agentic-renderer.mjs`, `action-bus.mjs` — is faithful to the plan, and the report/PR body document every deviation (prop-name `action→type`, templates realizing #8's shipped CSS, reproducibility via a `"spec"` vocabulary regenerated from committed specs). Those are intentional decisions, not issues. The "agent never emits raw HTML — enforced by construction" claim **holds**: the renderer uses only `createElement`/`setAttribute`/`textContent`, and the harness's two `innerHTML` sites (`refusalRow`, `logAction`) escape every interpolated value via `esc()`, including the catch paths.

The one thing standing between this and an approve: `validateComposition` — the module whose entire job is "refuse everything that isn't valid, with a plain Error naming the path" — has a hole for exactly the adversarial/LLM-generated input that ticket #13 will feed it.

---

## Issues by severity

### HIGH — `validateComposition` crashes (raw `TypeError`) or silently accepts on `Object.prototype`-member names, instead of refusing cleanly
`system/agentic-renderer.mjs:42` · `:54` · `:317`

`vocab.components[node.name]`, `TEMPLATES[node.name]`, and the out-of-vocabulary check `!(key in entry.props)` are all prototype-chain-inclusive. Consequences, **verified empirically** against the committed module + vocabulary:

| Input | Expected | Actual |
|---|---|---|
| `{name:"toString", props:{}}` | clean refusal naming the path | `TypeError: Cannot convert undefined or null to object` (unnamed, at `entry.props`) |
| `{name:"constructor", props:{}}` | clean refusal | same raw `TypeError` |
| `plant-card` + extra prop `__proto__` (via `JSON.parse`) | refused (out-of-vocabulary prop) | **ACCEPTED** |
| `plant-card` + extra prop `toString` | refused | **ACCEPTED** |
| `{name:"hero-banner"}` (control) | clean refusal | ✓ clean refusal |

The realistic path is `fetch(...).then(r => r.json())` — exactly how `agentic.html` already loads compositions and how #13 will hand agent output to the validator — and `JSON.parse` makes `__proto__` a real own key (unlike an object literal). This breaks the module header's documented contract ("throws a plain Error naming the offending path … on unknown component, out-of-vocabulary prop"). Not a live XSS/pollution exploit — the crash builds no DOM, and the templates read named props rather than spreading them, so an accepted `__proto__` key is ignored at render, not assigned — but it is a real robustness/contract gap in the one module built to be safe against untrusted composition input.

**It is also inconsistent within this very PR:** the sibling commit `bca5e4d` fixed this exact class in `scenarios/validate.mjs:127` (`Object.hasOwn(collections, name)` with the comment *"a collection named 'toString' must not hit a proto member"*). The renderer should apply the same discipline.

**Fix** — own-property-safe lookups at all three sites:
```js
const entry = Object.hasOwn(vocab.components, node.name) ? vocab.components[node.name] : undefined;   // :42
if (Object.hasOwn(entry.props, key)) { /* skip */ } else throw …                                      // :54 (invert to Object.hasOwn)
const template = Object.hasOwn(TEMPLATES, node.name) ? TEMPLATES[node.name] : undefined;              // :317
```

### MEDIUM — `safePhotoUrl` doesn't block protocol-relative URLs
`system/agentic-renderer.mjs:181`

The scheme regex `/^[a-z][a-z0-9+.-]*:/i` requires a letter then `:`, so `"//evil.example/tracker.png"` (leading `//`) doesn't match and is returned unchanged into `<img src>`. Verified: `javascript:`/`data:` correctly BLOCKED, but `//evil.example/...` ALLOWED. Not script injection (`<img>` won't run `javascript:`/`data:`), but it violates the function's own stated contract ("site-relative or https") and lets an agent-supplied `photoUrl` beacon an arbitrary external host.

**Fix**: `/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url)` — or resolve `new URL(url, location.origin)` and require `https:`/same-origin.

### LOW / design note — `photoUrl` scheme safety lives only in the template, not in `validateComposition`
`system/agentic-renderer.mjs:181` (invoked from the `plant-card` template, `:241`)

The module header advertises `validateComposition` as the Node-callable, build-time refusal gate for #13, and enumerates its refusals — URL-scheme safety isn't among them, so a Node-only caller that validates but never calls `renderComposition` would pass `photoUrl: "javascript:…"`. Defensible as-is (the render path is where an `<img>` actually materializes), but worth a one-line author decision on whether scheme-checking belongs in the pure validator so #13 inherits it. Not scored.

---

## Validation

| Level | Command | Result |
|---|---|---|
| 1 Syntax | `node --check` on all 3 new modules + `scenarios/validate.mjs` | ✓ SYNTAX-OK |
| 2 Bus | emit/on round-trip, unsubscribe, handler isolation, malformed-type & bad-source throws | ✓ all pass (2 hits → 3 after unsub; sibling survives a throwing handler; both malformed cases throw named errors) |
| 2 Renderer | refusal battery (5 refused + 1 accepted) + edge cases (array root, two-children, missing-required, wrong-type) | ✓ all as specified |
| — Reproducibility | committed vocabulary.json `status:"spec"` ×6 == committed specs (`"spec"`); base branch specs are `"shipped"` (merge-note accurate); base has no vocabulary.json (clean add) | ✓ consistent; PR's merge-coordination note is correct |
| 3 Integration | full `build.mjs` | **not run** — deliberately skipped: the working tree is intentionally dirty (`"shipped"` specs), and any regen would overwrite the committed `"spec"` artifact (per the report's commit guard). Author documents a green run. |
| 4 Browser | `/agentic` render + bus both directions | not re-run this pass; author's report documents a green browser checklist (styled render, pointer vs keyboard, both agent commands round-trip). |

No regressions surfaced in the reviewed diff.

---

## What's good

- **Injection-safety claim is real** — no `innerHTML` in the renderer; harness `innerHTML` sites all `esc()`-guarded (catch blocks included).
- **`action-bus.mjs` is clean** — full field validation, path-naming throws, per-handler `try/catch` isolation, DOM-free so #13 can drive it under Node. No findings.
- **Generator hygiene is exemplary** — module-resolved paths, result-object return, correct `pathToFileURL` guard, `mkdirSync` for fresh-clone standalone runs, surgical two-line `build.mjs` registration.
- **`CLAUDE.md` diff is exactly two surgical map lines.** Honesty contract honored: fictional label + capability strip keyed to *actual CSS presence* (`vdCssLoaded()`), not the misleading spec `status`.
- **Reproducibility handled with care** — `"spec"` vocabulary regenerated from committed specs via a detached worktree; the merge-coordination note (regenerate after merge so status matches the base's `"shipped"` specs) is accurate and load-bearing.

---

## Recommendation

**REQUEST CHANGES.** Fix the HIGH (`Object.hasOwn` at the three lookup sites — same fix already in this PR's `validate.mjs`); the MEDIUM protocol-relative guard is worth folding in at the same time; the LOW is a one-line author call. None touch the architecture — the approach is sound and cleanly executed. After the fix, re-run the renderer refusal battery (add the `toString`/`__proto__` cases as regression evidence) and this is an approve.

Next step: `piv-fix-review-findings` on this report, then re-run the renderer battery.
