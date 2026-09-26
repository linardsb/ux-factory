# PR #462 review: the recorded import, PR A (#311)

**Head** `cd4864fbd63a439f0049ab1bc5ae123a6131ac2c` · **Base** main @ `cfceeafcd8820a833fa95f6207855176578ce5a7`
Round 1 (no prior report, so the guarantees pass does not apply). The branch is up to date with main (merge-base = base).

## Verdict

**Approve (advisory comment; this is a solo repo, so it cannot formally self-approve).** There are no critical or high findings. Every gate is green, and I re-ran each one. Every figure in the PR body re-derives. The three Medium findings are about UI and message accuracy, and none of them corrupts state. They can be fixed in this PR or deferred to PR B.

## Findings

### Medium

**F1 `portal/public/canvas-import.mjs:68` — the "Reload the page" action does not reload the page.**
- Scope: `done()` wraps every non-200 answer as `{ action: { label: "Reload the page" } }` with no `href` and no `hint`.
- Cause: `showRefusal` (line 61) treats that kind of action as `dropInput.focus()`.
- Failure scenario: a second tab saves, so the drop gets a 409. The page shows "Reload the page" as its one action. Clicking it focuses the file input, and the page stays stale, so the next drop gets a 409 again.
- Why no gate caught it: the journey asserts the 409 only at the API (step 13, `/api/canvas/save`) and never clicks this button.
- Fix: give the action a real handler (`location.reload()`), for example `action: { label: "Reload the page", reload: true }` with a branch in `showRefusal`. Add a journey assertion that a stale drop's action reloads the page.

**F2 `portal/lib/import-run.mjs:167` + `portal/server.mjs:483` — an oversize drop is a 500, not a refusal.**
- The route's own header comment says a refusal the owner should read is data (`200 { refused }`). Dropping a file that is too big is an owner action of that kind. Instead, `readUpload` throws, and the catch-all returns `500 { error }`.
- Observed on a private-port portal:
  - 9,000,000 bytes with a `Content-Length` header → `500 {"error":"import-run: the dropped file is 9000000 bytes, over the 8388608-byte cap"}`.
  - The same file sent chunked (no `Content-Length`) → the socket is destroyed and curl reports `100`, with no answer at all.
- Combined with F1, the page then says "Reload the page", which is the wrong advice for this case.
- The server side is sound: the reviewer agent confirmed that neither path hangs the server.
- Fix:
  - Return the declared-size case as `{ refused: { kind: "too-large", …, action: { label: "Drop a smaller export" } } }`.
  - Also check `file.size` against the cap in the client before uploading, so the chunked path never happens from the page.

**F3 `portal/lib/builder.mjs:242` — the lock refusal names the wrong kind of run.**
- Cause: `runImport` reuses `withRunLock`, whose message is hardcoded as "a composition run is already in flight … read-modify-write the same manifest".
- Failure scenario: a second import during an import tells the owner that a composition run is in flight, which is false, and gives a reason that does not apply to imports.
- Why no gate caught it: 43.8 and journey I5 assert only the substring `already in flight`, so the wrong wording passes.
- Fix: pass a label into `withRunLock(fn, label)`, or make the message kind-neutral.

### Low

**F4 `portal/lib/import-run.mjs` (`importView` / `editMapping`) — a refused proposal name returns 500.**
- Observed: `name=../../../etc` gives `500 {"error":"… is not a component name"}`.
- The refusal is correct and happens before any path is built. Only the status is wrong: this is a request error. `server.mjs:328` already sets the precedent of not letting client mistakes read as server faults.
- A 400 would be accurate. Polish only.

## Validation

| Gate | Result |
|---|---|
| `node tooling/drift-check.mjs` | ✅ all 14 checks + `import records ✓ 4 files, 187933 bytes, no drift` (observed, after `npm ci` in `tooling/icons` and `tooling/style-dictionary`, as CI does) |
| `node tooling/token-lint.mjs` | ✅ 63 contract tokens · 0 undeclared · 0 orphan (observed) |
| `node tooling/build-checks.mjs` | ✅ `build ✓  all 43 groups pass` (observed) |
| `node tooling/canvas-journey.mjs all` | ✅ chromium 65, firefox 64, webkit 64 passed, 0 failed (observed) |
| Portal smoke, private port 4791 | ✅ `/api/health` `stale:false`; drop 200 wrote `imports/i1.*` + `proposals/spike-list-row/*`; stale drop 409; cross-origin 403; a Figma JSON that is not an export returns `200 { refused: not-an-export }` with one action (observed; the fixture was restored afterwards) |
| CI (`gh pr checks 462`) | ✅ CodeQL, audit, codeql, gates-green, verify, visual all pass |

## The numbers pass

Each figure in the PR body is checked against a run:

| Figure | Result |
|---|---|
| "all 43 groups" | Observed; re-run matches. |
| "4 files, 187933 bytes" | Observed; the drift-check line matches. |
| canvas-journey 65/64/64 | Observed at `285ebd3` by the author. Re-observed at head: identical. |
| Runtime 32,400, "no approach baselines regenerated" | Observed. `system/loc-summary.json` runtime is `linesApprox: 32400` on both main and head. The report's "32,435 → 32,400" is rounding to the nearest 100 and is correct. |
| CodeQL "0 results over 182 files" | Local and author-observed; not re-run. CI's CodeQL legs are green, and they are the gate that counts. |
| I1 `costUsd === null` | Correctly labelled in both the PR body and the report as unable to fail on this path ("zero spend is expected, not proven"). No finding. |

## What is done well

- **Path traversal is closed by construction.** `id` and `name` are validated against tight patterns before any path is built. `underRoot` guards every write, and 43.6 drives real `../` attempts and asserts nothing was written. Neither the reviewer agent nor my URL-encoded probes found a bypass.
- **The staleness check runs twice for a reason.** The route gives the fast 409. The authoritative check is the first statement inside `withRunLock`, which closes the window between check and write. 43.8 proves it with a gated slow reader rather than by reading the code.
- **The fence is a single predicate.** `PreToolUse` and `canUseTool` both call the same `decide`. Only `mcp__` or advertised denials are recorded, and a throwing predicate or writer fails closed. 43.2 exercises every branch.
- **No XSS surface in the panel.** Every string derived from an import reaches the page through `textContent` or a text node, and re-renders use `replaceChildren`, so no event listeners pile up.
- The documented deviations (reach-only `readBrilliant`, the stricter `sniffDrop`, the synthetic unbound export in 43.7) are recorded in the plan's AMENDMENTS and are not findings.

## Recommendation

Mergeable as is; no finding blocks it.
- F1 is the one I would fix before merge: it is the only recovery action the page offers for the 409 it expects, and it does the wrong thing.
- F2 and F3 are small, and they sit on the same refusal path, so it is cheap to fix them together.
- F4 is optional.
