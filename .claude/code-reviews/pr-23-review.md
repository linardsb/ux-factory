# Review — PR #23 · agentic renderer hardening (PR #21 review findings)

**Ticket** #11 · Epic #1 · **Head** `feature/agentic-bridge` → **Base** `feature/data-connected-prototypes` (stacked) · **Commits** `975224f`, `ed95c64`
**Recommendation: REQUEST CHANGES.** The HIGH finding is fully and correctly fixed. The MEDIUM finding is only *partially* fixed: `safePhotoUrl`'s hand-rolled normalization is systematically incomplete, and its comment claims it "normalise[s] the same way [the browser does]" when it demonstrably doesn't — two bypass classes (backslash variants and leading C0-control bytes) still let an agent-supplied `photoUrl` beacon an arbitrary external host through `<img src>`. Both are empirically verified and reachable via the documented `fetch → JSON.parse → render` path. One-line fix.

---

## Summary

This is a fix-the-findings PR for PR #21's round-1 review. It correctly closes finding #1 (HIGH) and *improves* finding #2 (MEDIUM) — but does not fully close #2. The blocking basis is not a severity label; it's that **a review-fix PR ships finding #2 with a residual, demonstrated bypass and a code comment that overstates the fix's completeness.**

I verified the HIGH fix against the live `validateComposition` + committed `handoff/verdant/vocabulary.json` (6/6), and reproduced the `safePhotoUrl` bypasses in Node (JS side) and against Node's WHATWG-compliant `URL` parser (the same algorithm a browser applies to resolve `<img src>`). An independent `code-reviewer` pass corroborated the C0-control bypass.

---

## Issues by severity

### MEDIUM — `safePhotoUrl` normalization is systematically incomplete; two bypass classes reopen the protocol-relative beacon the fix claims to close
`system/agentic-renderer.mjs:190-196` (comment `:185-189`)

The fix normalizes with `url.replace(/[\t\n\r]/g, "").trim()` and then runs an anchored regex whose "external host" alternative is `\/\/` (two **forward** slashes). Both steps are incomplete relative to what a browser actually does before resolving the URL:

**(a) Backslash variants.** Browsers treat `\` as `/` for special-scheme (http/https) URLs, but the regex only matches forward `//`. Verified in Node — all **ALLOWED** by `safePhotoUrl`, all resolve to `https://evil.example/x.png` via the WHATWG parser on an https page:

| Input | `safePhotoUrl` | Browser resolves to |
|---|---|---|
| `\\evil.example/x.png` | **allowed** | `https://evil.example/x.png` |
| `/\evil.example/x.png` | **allowed** | `https://evil.example/x.png` |
| `\/evil.example/x.png` | **allowed** | `https://evil.example/x.png` |

**(b) Leading C0-control bytes.** The WHATWG URL parser strips *any* leading/trailing C0 control (U+0000–U+001F) or space, then removes tab/LF/CR anywhere. JS `.trim()` only removes the ECMAScript whitespace set (`\t \n \v \f \r`, space, Unicode separators) — it does **not** strip `\x00`, `\x01`–`\x08`, or `\x0E`–`\x1F`. So a single leading control byte survives the check but the browser strips it:

| Input (as it arrives after `JSON.parse`) | `safePhotoUrl` | Browser resolves to |
|---|---|---|
| `"//evil.example/x.png"` | **allowed** | `https://evil.example/x.png` |
| `"http://evil.example/x.png"` | **allowed** | `http://evil.example/x.png` |

**Reachability.** `agentic.html` loads compositions with `fetch(...).then(r => r.json())`, and `JSON.parse('"\\u0001//evil"')` yields a real control-byte-prefixed string — the exact untrusted-composition path this module exists to defend. **Not** script execution (`<img>` runs neither `javascript:` nor `data:`); the impact is an external-host image beacon and a violation of the function's own stated contract ("site-relative or https"). That is the same class round-1 scored **MEDIUM**, so this residual is MEDIUM.

*(Verification honesty: the `safePhotoUrl`-allows-it column is observed in Node; the browser-resolves-to column is Node's `URL` class — the WHATWG parser browsers use for `<img src>` — not a live browser drive. That's the specified algorithm, so no browser run is needed.)*

**Fix — stop hand-rolling the browser's normalization; let the browser's parser do it.** `safePhotoUrl`'s only caller is the `plant-card` render template (`:251`); the pure `validateComposition` never calls it (grep-confirmed), so the "keep it a pure regex so #13's Node validator can reuse it" rationale does not apply to this function, and `new URL` exists in Node anyway:

```js
function safePhotoUrl(url, path) {
  let u;
  try { u = new URL(url, document.baseURI); }
  catch { throw new Error(`${path}.props.photoUrl: "${url}" is not a valid URL`); }
  if (u.origin !== location.origin) {
    throw new Error(`${path}.props.photoUrl: "${url}" must be a site-relative URL`);
  }
  return url;
}
```

This closes all four beacon forms plus `http:`/`javascript:`/`data:` (opaque origin) in one move, with no normalization to keep in sync. It is **same-origin only** — narrower than round-1's "or an explicit https URL" allowance — but that allowance can't coexist with resolution-based blocking (post-resolution, `//evil` and `https://cdn` are indistinguishable: both `https:`, both cross-origin), and it costs nothing here: `photoUrl` is documented as a *"site-relative image path"* and **the demo data ships no images at all** (`plant-card.contract.json:20`, `plant-card.md:39` — the monogram placeholder is the exercised path). If a cross-origin `https://` thumbnail is ever genuinely needed, that's an author policy call (allow-external-https vs. block-beacon) to make deliberately — none exists today.

*(Also correct the `:185-189` comment: with the parser-based fix it no longer needs to claim it "normalise[s] the same way [the browser does]" — it uses the browser's parser.)*

### Subsumed / non-blocking (raised by the independent pass — noted, not separately actionable)

- **`safePhotoUrl` returns the raw `url`, not the checked `resolved`** (`:195`). A latent check-vs-render divergence under the *current* regex approach. **Subsumed by the recommended fix** — resolution-based checking has no "normalize-then-return-a-different-string" gap. Not a separate ask.
- **`name in props` still uses `in`, not `Object.hasOwn`** (`:65`). This is a **documented deviation**: `.claude/code-reviews/pr-21-review-round2.md` (Notes, final bullet) records it with correct reasoning — `name` iterates the trusted vocabulary's own prop keys (never attacker input), no vocab prop name collides with an `Object.prototype` member, and by line 65 `props` has already been filtered to declared keys by the out-of-vocabulary loop (`:57-61`). Per the review rubric a documented deviation is a decision, not an issue. Non-blocking consistency nit; converting it is cheap and would close the failure mode outright, but it is correctly not a bug today.

---

## Validation

| Check | Command | Result |
|---|---|---|
| 1 Syntax | `node --check` on `agentic-renderer.mjs`, `action-bus.mjs`, `scenarios/validate.mjs` | ✓ SYNTAX-OK |
| 2 HIGH regression battery | `toString`/`constructor` names + `__proto__`/`toString` props (via `JSON.parse`) vs. real `vocabulary.json`; happy path | ✓ **6/6** — proto-member names & props refuse cleanly with named `Error`; valid `plant-card` still accepted |
| 2 MEDIUM bypass battery | `safePhotoUrl` against backslash ×4, leading-C0 ×2, plus controls | ✗ backslash ×4 + C0 ×2 **allowed** (should block); plain `//evil` correctly rejected; `https://ok` & site-relative correctly allowed |
| — Browser resolution | Node WHATWG `URL` on the allowed inputs | all beacon forms resolve to `https://evil.example/...` (external host) |
| 3 Integration (`build.mjs`) | not run | Renderer-only change; PR documents the deliberate skip (regen would clobber the committed `"spec"` vocabulary vs. the tree's `"shipped"` specs). Consistent with round-1's Integration row. |
| 4 Browser `/agentic` | not driven | Not needed — no DOM-construction path changed, and the URL claim is settled by the WHATWG parser. |

No regressions surfaced. The HIGH fix is a clean, verified improvement; the MEDIUM fix is a partial improvement.

---

## What's good

- **HIGH fix is exactly right.** `Object.hasOwn` at all three sites (`:44`, `:58`, `:327`) matches the discipline the sibling `scenarios/validate.mjs` already applies; proto-member names and `__proto__`/`toString` props now refuse cleanly, happy path intact. 6/6 battery, independently reproduced.
- **The MEDIUM fix does close the mainstream cases** — plain `//host`, and leading space/tab/newline smuggling — a real improvement over PR #21. The gap is only the non-whitespace control bytes and backslashes.
- **The round-2 report (`pr-21-review-round2.md`) is honest and thorough** — it states what it ran and what it deliberately didn't (artifact regen, browser render), and correctly documents leaving `name in props` with sound reasoning. Exactly the disposition discipline the honesty contract asks for.

---

## Recommendation

**REQUEST CHANGES.** Replace the hand-rolled `safePhotoUrl` regex with the parser-based, same-origin check above (render-path-only, so `new URL` is fine). After the fix, add the backslash + leading-C0 inputs to the regression battery as evidence, and drop the "normalise the same way [the browser does]" claim from the comment. The HIGH fix needs no further work.

Next step: `piv-fix-review-findings` on this report, then re-run the `safePhotoUrl` battery.
