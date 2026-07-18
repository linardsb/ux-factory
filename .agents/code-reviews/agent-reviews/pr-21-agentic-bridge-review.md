# Code Review — PR #21 "agentic bridge" (epic #1, ticket #11)

**Branch**: `feature/agentic-bridge` · **Commit reviewed**: `00ae849` (+ sibling rider `bca5e4d` on `scenarios/validate.mjs`, unrelated to #11)
**Scope**: `agent-layer/gen-vocabulary.mjs`, `agent-layer/build.mjs`, `system/agentic-renderer.mjs`, `system/action-bus.mjs`, `agentic.html`, `handoff/verdant/vocabulary.json`, `CLAUDE.md`

Reviewed against this repo's actual standards (vanilla JS / Node ESM, no framework, hand-thrown `Error`s, generator conventions, "agent never emits raw HTML — enforced by construction"), not generic Python/FastAPI defaults. Documented deviations in the PR body / `.claude/reports/agentic-bridge-report.md` are treated as intentional decisions, not issues.

Method: full read of every changed file, plus targeted read-only Node verification of the two most safety-relevant claims (no generator run, no build run — only importing the already-committed modules, the same technique the author used for their own refusal battery).

---

## ✅ Strengths

- **The "agent never emits raw HTML" claim is actually true.** `el()` (agentic-renderer.mjs:116–126) only ever calls `createElement`/`setAttribute`/`textContent`; there is no `innerHTML` anywhere in the renderer or its six templates. Every prop that reaches the DOM goes through one of those two safe sinks. This was checked template-by-template — it holds.
- **The harness's `innerHTML` usage is correctly guarded.** `refusalRow` and `logAction` in `agentic.html` (lines 182–187, 197–206) are the only two `innerHTML` writes in the page, and both wrap every interpolated dynamic value (composition JSON, error messages, action type/source/target/params) in `esc()` before insertion. This is exactly the pattern the task asked me to scrutinize, and it's implemented correctly and consistently, including in the two `catch` blocks (`renderStage`, the top-level vocabulary-load failure).
- **`action-bus.mjs` is tight and correct.** `emit`/`on` validate every field (type regex, source enum, target/params shape) and throw plain, path-naming `Error`s per the project's convention (mirrors `derive.mjs`'s error voice). Handler isolation (`try/catch` per handler, exact-type then wildcard) is implemented exactly as documented, and it stayed DOM-free (`Map`/`Set` only) as required for a future Node-side #13 consumer. No findings here.
- **Generator hygiene is exemplary.** `gen-vocabulary.mjs` resolves `ROOT` from `import.meta.url` (never `cwd`), returns a result object (`{ components, dest }`), uses the `pathToFileURL` standalone guard (with a correct comment about why — this repo's path contains a space), and is registered in `build.mjs` with the same import+call+`✓`-line pattern as every sibling generator, placed right after `genHandoff` as its own report describes. `CLAUDE.md`'s diff for this ticket (verified via `git diff 00ae849~1 00ae849 -- CLAUDE.md`) is exactly two surgical additions — no drift.
- **The chip-competition rule and children-arity checks are correctly ordered and sound** for the current single-level vocabulary shape: the child's own `validateComposition` recursion runs before the chip-competing-value check, so `child.props?.value` is only reached once the child is already known to be a valid, fully-typed `status-chip`.
- **`safePhotoUrl` correctly blocks `javascript:`/`data:` schemes** (verified below) — the core case it names in its comment works.

---

## ⚠️ Issues Found

### 1. `validateComposition` can be crashed with an unhandled `TypeError` instead of refusing cleanly — component/prop names that collide with `Object.prototype` members
**File**: `system/agentic-renderer.mjs:42–45` (`vocab.components[node.name]`), `:53–57` (`key in entry.props`), `:317–320` (`TEMPLATES[node.name]` in `build()`)
**Severity**: High
**Category**: Correctness / validation completeness

Both `vocab.components` and `TEMPLATES` are plain objects looked up with bare bracket access, and the "unknown prop" check uses the `in` operator — all three are prototype-chain-inclusive. A composition node named `"toString"`, `"constructor"`, `"hasOwnProperty"`, etc. resolves to the **inherited `Object.prototype` member** (truthy), so the `if (!entry) throw …` "unknown component" guard never fires. Execution then falls through to `entry.props` (undefined on a plain function) and crashes with a raw, unnamed `TypeError` instead of the documented "throws a plain Error naming the offending path" refusal.

Verified empirically (read-only import of the already-committed modules, no generation/build run):
```
$ node --input-type=module -e '
import { validateComposition } from "./system/agentic-renderer.mjs";
import { readFileSync } from "node:fs";
const vocab = JSON.parse(readFileSync("./handoff/verdant/vocabulary.json", "utf8"));
for (const c of [{name:"toString",props:{}}, {name:"constructor",props:{}}, {name:"hasOwnProperty",props:{}},
                  {name:"plant-card", props:{name:"X", status:"ok", toString:"sneaky"}}]) {
  try { validateComposition(vocab, c); console.log("ACCEPTED (unexpected):", JSON.stringify(c)); }
  catch (e) { console.log(`${e.constructor.name}: ${e.message}`); }
}'
TypeError: Cannot convert undefined or null to object
TypeError: Cannot convert undefined or null to object
TypeError: Cannot convert undefined or null to object
ACCEPTED (unexpected): {"name":"plant-card","props":{"name":"X","status":"ok","toString":"sneaky"}}
```
The fourth case is the more subtle half of the bug: a *valid* component (`plant-card`) with an extra prop literally named `toString` is silently **accepted** — the "out-of-vocabulary prop" check (line 54) never fires for it either, because `"toString" in entry.props` is also true via the prototype chain. (It's currently inert because no template reads unknown keys off `props`, but it is a real gap in the "refuses everything else" guarantee the header advertises.)

`__proto__` (the name the task specifically asked about) behaves the same way, via the realistic path an agent-authored composition actually arrives by — `JSON.parse` (a `fetch().then(r=>r.json())`, exactly how `agentic.html` already loads `vocabulary.json`; note an *object literal* `{__proto__: x}` sets the prototype instead of creating a key, so `JSON.parse` is what makes `__proto__` a real own key — `JSON.parse('{"name":"__proto__","props":{}}').name === "__proto__"` is `true` and `Object.hasOwn` confirms it's an own property):
```
$ node --input-type=module -e '... (JSON.parse variants of the same two cases) ...'
own key __proto__ on parsed node? true true
own key __proto__ on parsed props? true
TypeError: Cannot convert undefined or null to object
ACCEPTED (unexpected): {"name":"plant-card","props":{"name":"X","status":"ok","__proto__":"sneaky"}}
```
Same crash for a node named `__proto__`, same silent accept for a `plant-card` carrying a `__proto__` prop. The `Object.hasOwn` fix below closes this case too (own-property checks are correct regardless of whether the key arrived via literal or `JSON.parse`).

This is exactly the bug class the task called out ("Prototype-pollution style keys… `constructor`") — and notably, it's the *same* bug this very PR's sibling commit (`bca5e4d`, `scenarios/validate.mjs:127`) already fixed elsewhere in the codebase, with an explicit comment: `// hasOwn: a collection named "toString" must not hit a proto member (cf. worker/api.mjs)`. The renderer wasn't given the same treatment.

Not currently DOM/XSS-exploitable (nothing renders), but it breaks the module's core safety contract for any future adversarial or LLM-generated composition (the whole point of ticket #13, which this module is built for) — a component named `"toString"` throws a confusing native error instead of a clean, expected refusal, and a prop named `toString` sails through the vocabulary gate undetected.

**Fix**: replace the three prototype-chain-inclusive lookups with own-property-safe equivalents, matching the pattern already used in `scenarios/validate.mjs`:
```js
const entry = Object.hasOwn(vocab.components, node.name) ? vocab.components[node.name] : undefined;
...
if (!Object.hasOwn(entry.props, key)) { throw ... }
...
const template = Object.hasOwn(TEMPLATES, node.name) ? TEMPLATES[node.name] : undefined;
```
(Or construct `vocab.components`/`TEMPLATES` as `Object.create(null)`-backed maps, or use a real `Map` — any of these closes all three sites at once.)

---

### 2. `safePhotoUrl` doesn't block protocol-relative URLs
**File**: `system/agentic-renderer.mjs:181–186`
**Severity**: Medium
**Category**: Correctness / security boundary

The scheme regex `/^[a-z][a-z0-9+.-]*:/i` requires the string to start with a letter directly followed by `:`. A protocol-relative URL like `"//evil.example/tracker.png"` starts with `/`, not a letter, so it fails to match — the function's `if` condition is false and the URL is returned **unchanged**, even though it points at an arbitrary external host. Verified in isolation:
```
$ node -e '... (safePhotoUrl copied verbatim) ...'
BLOCKED: javascript:alert(1) -> ...
BLOCKED: data:text/html,x -> ...
ALLOWED: https://ok.example/x.png -> https://ok.example/x.png
ALLOWED: /local/x.png -> /local/x.png
ALLOWED: //evil.example/tracker.png -> //evil.example/tracker.png   ← should be blocked
```
This isn't script-injection (an `<img src>` set via `setAttribute` doesn't execute `javascript:`/`data:` payloads in modern browsers even without this check), but it does violate the function's own stated contract — "Allow a relative path (no scheme) or an explicit https URL" — and lets an agent-supplied `photoUrl` silently exfiltrate a request (referrer, cookies-if-any, view timing) to an attacker-controlled host as a tracking pixel, which the "site-relative" framing was explicitly trying to prevent.

**Fix**: also reject values starting with `//`, e.g. change the guard to `/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url)`, or resolve via `new URL(url, location.origin)` and require `u.protocol === "https:" || u.origin === location.origin`.

---

### 3. (Observation, not scored as a finding) The URL-scheme safety check lives only in the render path, not in `validateComposition`
**File**: `system/agentic-renderer.mjs:31–105` (validator) vs. `:239–241` (plant-card template calling `safePhotoUrl`)
**Category**: Architecture note

Sanitizing a URL at the point of DOM construction (inside the `plant-card` template, where `safePhotoUrl` actually runs) is a conventional, defensible placement — I'm not scoring this as a defect. Flagging only because the module header is specific: `validateComposition` is described as "PURE and DOM-free… This is what ticket #13 calls under Node for build-time composition runs," and its refusal list ("unknown component, out-of-vocabulary prop, missing required prop, wrong type, enum violation, disallowed/too-many children, status-chip competing value") doesn't include `photoUrl` scheme safety. So a composition with `photoUrl: "javascript:alert(1)"` passes `validateComposition` cleanly and is only caught later, in a browser, inside `renderComposition`. Whether that matters depends on whether a future Node-only #13 caller is expected to treat `validateComposition` alone as a complete gate, or whether `renderComposition` always runs downstream before anything ships — that's a design question for the author, not a bug I can confirm from the code alone. Worth a one-line decision either way (move the check into the validator, or note in the header that `photoUrl` safety is render-time-only).

---

## ✨ Recommendations

- Add `toString`/`constructor`/`__proto__`-named cases to the harness's `REFUSALS` battery (`agentic.html:137–143`) once #1 is fixed — cheap regression coverage for exactly the bug class this review found, and consistent with the "run the surface you touched" testing bar this repo uses instead of a suite.
- Given `scenarios/validate.mjs` just picked up an `Object.hasOwn` guard for the identical reason, it may be worth a short project-level note (or just consistent habit) that any object used as a name→spec lookup table against externally-influenced keys should use `Object.hasOwn`/`Map` rather than bare `in`/bracket access — this is now the second file in the repo where it mattered.

---

## 📋 Review Summary

- **Overall assessment**: Needs revision — one High-severity validation-completeness bug (#1) that should be fixed before merge, since it's the exact "malformed composition slips through" scenario this module exists to prevent, and it's cheap to fix. #2 is real but lower-urgency (no live script-injection path found — privacy/tracking exposure only). #3 is a design question, not a scored defect.
- **Issues by severity**: 1 High, 1 Medium, 0 Critical, 0 Low (+ 1 unscored architecture observation).
- **Critical blockers**: none — nothing found allows raw HTML/script injection into the DOM. The core "agent never emits raw HTML — enforced by construction" claim holds up under review.
- `action-bus.mjs`, the harness's `esc()` discipline, and the generator (`gen-vocabulary.mjs` + `build.mjs` registration) all passed review with no findings.
