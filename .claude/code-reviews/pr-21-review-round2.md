# PR #21 Review — Round 2 (fix commit for `feature/agentic-bridge`)

**Verdict: fixes applied.** The round-1 HIGH and MEDIUM are resolved in `system/agentic-renderer.mjs`
— verified empirically with a regression battery, not taken on faith. The LOW/design note is
deferred with a recommendation (below). Only the renderer module changed; no artifact was
regenerated (the committed `vocabulary.json` `"spec"` snapshot is untouched — the fix is
renderer-only, so nothing needs regenerating).

Round-1 report: `.claude/code-reviews/pr-21-review.md`.

## Round-1 findings — disposition

| # | Finding (severity) | Status | Evidence |
|---|---|---|---|
| 1 | `validateComposition` crashes / silently accepts on `Object.prototype`-member names (HIGH) | **Fixed** | Own-property lookups at all three sites: `:44` `Object.hasOwn(vocab.components, node.name)`, `:58` `!Object.hasOwn(entry.props, key)`, `:323` `Object.hasOwn(TEMPLATES, node.name)`. `toString`/`constructor` now refuse cleanly ("unknown component"), and `__proto__`/`toString` extra props (real own keys after `JSON.parse`) refuse as out-of-vocabulary. Same discipline as the sibling `scenarios/validate.mjs:127`. |
| 2 | `safePhotoUrl` doesn't block protocol-relative URLs (MEDIUM) | **Fixed** | Scheme regex extended to `/^([a-z][a-z0-9+.-]*:|\/\/)/i` — the `//` alternative rejects `//host` beacons. Guard also normalises first (`url.replace(/[\t\n\r]/g,"").trim()`) so leading/internal whitespace can't smuggle a scheme/host past the anchored check the way a browser would resolve it (` //evil`, `h\ttp://evil`). Kept a pure regex (no `new URL`) so the function stays Node-safe. |
| 3 | `photoUrl` scheme safety lives only in the template, not in `validateComposition` (LOW / design note, unscored) | **Deferred** | See recommendation below — kept out of the pure validator deliberately; logged for #13. |

## Regression battery (run against the fixed module + committed `vocabulary.json`)

`node battery.mjs` — **15 passed, 0 failed.**

HIGH — proto-member component names (now clean, named refusals):
```
PASS [name=toString]     Error: composition: unknown component "toString" (vocabulary: care-task-row | plant-card | primary-button | screen-header | stat-tile | status-chip)
PASS [name=constructor]  Error: composition: unknown component "constructor" (...)
```
HIGH — proto-member extra props via `JSON.parse` (real own keys, now refused):
```
PASS [plant-card +__proto__]  Error: composition.props.__proto__: "__proto__" is not a prop of plant-card (allowed: name | species | status | photoUrl)
PASS [plant-card +toString]   Error: composition.props.toString: "toString" is not a prop of plant-card (...)
```
Happy path — the `in`→`Object.hasOwn` swap does not reject legitimate props:
```
PASS [valid plant-card]                     accepted
PASS [valid plant-card + status-chip child] accepted
PASS [valid full array root]                accepted  (screen-header + stat-tile + primary-button)
```
Control (unchanged):
```
PASS [name=hero-banner]  Error: composition: unknown component "hero-banner" (...)
```
MEDIUM — `safePhotoUrl` scheme logic (incl. whitespace-smuggling variants a browser would strip):
```
PASS //evil.example/x           → throws
PASS http://evil.example/x      → throws
PASS javascript:alert(1)        → throws
PASS data:text/html,x           → throws
PASS " //evil.example/beacon"   → throws   (leading space)
PASS "\t//evil.example/x"       → throws   (leading tab)
PASS "\n//evil.example/x"       → throws   (leading newline)
PASS "/\t/evil.example/x"       → throws   (tab between the slashes)
PASS "h\ttp://evil.example/x"   → throws   (tab inside the scheme)
PASS " javascript:alert(1)"     → throws   (leading space)
PASS https://ok.example/x.png   → allowed
PASS /local/x.png               → allowed
PASS photos/fern.png            → allowed
```

## Validation

| Check | Result |
|---|---|
| `node --check system/agentic-renderer.mjs` | ✓ SYNTAX-OK |
| Regression battery (above) | ✓ 15/15 |
| Artifact regeneration | **not run — deliberately.** Fix is renderer-only; regenerating `vocabulary.json` would clobber the committed `"spec"` snapshot against the tree's `"shipped"` specs (round-1 Integration row / report commit guard). No artifact depends on this change. |
| Browser `/agentic` render | not re-run — no DOM-construction code changed. `safePhotoUrl` returns the identical set of valid URLs it did before (it only *added* rejection of the never-valid `//` form), and `renderComposition` validates before building, so no valid render path is affected. |

## Notes

- **LOW (#3) — recommendation: defer + log for #13, do not fold into `validateComposition`.**
  Moving scheme-checking into the pure validator means putting one prop's URL logic into an
  otherwise generic type/enum/required loop — scope creep the reviewer explicitly declined. The
  `<img src>` only materializes on the render path, where `safePhotoUrl` already guards it. If #13
  ever validates-without-rendering under Node and needs scheme safety at the gate, add it there;
  the regex is already pure and reusable. Non-blocking.
- **Line 61 `name in props`** is the same prototype-chain idiom but is *not* exploitable: `name`
  iterates the trusted vocabulary keys (`Object.entries(entry.props)`), never attacker input, and no
  vocabulary prop name collides with an `Object.prototype` member. Left as-is by design; noted so a
  re-review doesn't flag it as a missed site.
