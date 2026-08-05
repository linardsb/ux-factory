# Feature: Share codec v2 — the arrangement in the URL, v1 links byte-identical

The following plan should be complete, but it's important that you validate documentation and codebase
patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

## Feature Description

`system/build-share.mjs` puts a whole /build build in a URL: ten answers, a breadboard, an edited flag,
an imported design's token values, a pack slug. The studio (#204–#207) adds a fact the codec cannot
carry — **where each place sits on the canvas grid**. This ticket teaches the codec one new field
(`g`: per-place grid slots), makes the version field a *set* (`{1, 2}`) instead of a constant, closes
v1's silent-partial-restore hole by rejecting unknown top-level keys, and grows the tamper battery a
coordinate family — while proving that **every link already shared stays byte-identical and still
restores byte-identically**.

Nothing on a page changes. This is two pure modules and a CI gate.

## User Story

As someone who arranged a build on the studio canvas
I want the link I copy to carry that arrangement
So that the person I send it to opens the build I made, not a build with my components reshuffled —
and so that every link anyone already shared keeps working exactly as it did.

## Problem Statement

Three problems, in dependency order:

1. **The arrangement does not travel.** After #204/#205 the canvas holds a real per-place grid slot
   (`data-col`/`data-row`) that the visitor can change. The share link — the page's *only* persistence
   — drops it, so "the link rebuilds this whole build" becomes false the moment anything moves.
2. **v1 restores silently-partially.** `decodeBuild` validates every field it KNOWS about and ignores
   every field it does not. A payload carrying a future field decodes today as a build without it, and
   the receiving page states, at rest, that it rebuilt the build that was shared. That is the exact
   half-restore the module's own header rules out ("a link whose token map was partly dropped is not
   the build that was shared").
3. **The version check is a constant, so it cannot grow.** `data.v !== SHARE_VERSION` accepts exactly
   one number. Adding a field the honest way — a second version — needs an accept *set* and a rule for
   which version an encode emits.

And the load-bearing risk, named by the ticket: PRD §1 guarantees "/build survives as the form-mode
fallback over the same build data **and share links**". Problem 2's fix is the thing most likely to
break that guarantee, so the fix ships with frozen, pre-change-captured v1 payloads as its proof.

## Solution Statement

- **One new wire field, `g`**, positional and parallel to `b.p`: `[[col, row], …]`, length exactly
  `b.p.length`. Emitted **only** when the state carries an arrangement consistent with the board.
- **`v` becomes a set.** `SHARE_VERSIONS = [1, 2]` is what decode accepts; encode emits `v: 1` when
  there is no `g` and `v: 2` when there is. A no-arrangement encode is therefore byte-identical to v1's
  — not "compatible", *identical*.
- **A known-key audit** on the top-level object: any key outside `{v, a, b, e, k, s, g}` rejects the
  whole payload.
- **Coordinates are REJECTED, never clamped.** `clampSlot` is #205's mover repairing a *reader's*
  gesture; the codec's discipline is absolute validation of a *stranger's* payload. The codec imports
  `MAX_COLS`/`MAX_ROWS` from `system/studio-canvas.mjs` (the `LABEL_MAX` pattern) and rejects anything
  outside them.
- **The proof is frozen fixtures.** Real v1 params, captured from the shipping v1 encoder *before this
  ticket edits it* — including one copied from the running page in a real browser — committed and
  never regenerated.

## Out of Scope / Non-Goals

- **Not producing an arrangement anywhere.** No page writes `state.arrangement` after this ticket
  except the pass-through in Task 7. The studio's keep rail and the export are **#210**; the replay
  driver is **#209**. This ticket makes the codec able to carry it.
- **Not adding `arrangement` to the `BUILD_CHANGE` store** (`system/build-questions.mjs`). Its
  `restoreBuild` contract stays four fields. Widening the store is #210's call, made where a producer
  and a consumer both exist. (Task 7 keeps the arrangement alive on /build *outside* the store — see
  D5 in NOTES.)
- **Not changing any at-rest page state.** No new control, no copy change, no VR baseline churn, no
  `param-manifest.json` entry.
- **Not touching `clampSlot`, `MAX_COLS`, `MAX_ROWS`, or the canvas.** #204 exported them already;
  this ticket only imports them. `system/studio-canvas.mjs` appears in the ticket's file list as "export
  bounds if not already" — **it already does** (`studio-canvas.mjs:38-39`), so it is not edited.
- **Not widening `b`-level key auditing.** Only the top level. `b.p` / `b.c` are read positionally and
  by `Array.isArray`, and group 5 already asserts an inert `__proto__` inside `b`; leave it.

## Feature Metadata

**Feature Type**: Enhancement (a wire format grows a version)
**Estimated Complexity**: Medium — small surface, high rigour bar
**Primary Systems Affected**: `system/build-share.mjs` · `tooling/build-checks.mjs` groups 4 + 5 ·
`system/build-keep.mjs` (pass-through) · a new frozen fixture file
**Dependencies**: none new — `MAX_COLS`/`MAX_ROWS` come from `system/studio-canvas.mjs` (#204, merged)

## Related Work

**Implements**: [#208](https://github.com/linardsb/ux-factory/issues/208) · **Epic**:
[#202](https://github.com/linardsb/ux-factory/issues/202) →
`docs/epics/prototype-studio.architecture.md` §Data model → *Share codec v2* (lines ~92-97, verbatim
source for every rule above)

**Back-references**:

- `.claude/plans/build-pattern-render-keep-rail.md` — the codec and the keep rail as shipped (#137)
- `.claude/plans/studio-canvas-stage-204.md` — the bounds this imports; build-checks group 12 planted
  the tripwire this ticket discharges (`tooling/build-checks.mjs:1718-1721`)
- `.claude/plans/studio-route-surgery-orchestrator-206.md` — `arrangeBoard` produces the per-place slots
  this field carries

**Forward-references**:

- #210 — single-file export + grown keep rail: the first *producer* of `state.arrangement`
- #209 — the replay driver: consumes a restored arrangement

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING

- `system/build-share.mjs` (whole file, 371 lines) — the file being changed. Read the header (lines
  1-38) and the **wire-shape table** (lines 94-117) first: the table is the contract encode and decode
  both read, and it must grow a `g` row in the same voice.
- `system/studio-canvas.mjs` (lines 34-57) — `MAX_COLS = 12`, `MAX_ROWS = 8`, `clampSlot`. Import the
  two caps; do **not** import `clampSlot` (D2 in NOTES says why).
- `system/studio.mjs` (lines 52-83) — `arrangeBoard(board) → [{ id, label, affordances, col, row }]`.
  This is the shape a producer will hand `encodeBuild`; the accepted input shape must accommodate it.
- `system/build-keep.mjs` (lines 246-255, 344-364) — `currentUrl()` and `restore()`, the two ends of
  the `?b=` path Task 7 threads.
- `system/build-questions.mjs` (lines 31-58, 384-393) — the `BUILD_CHANGE` contract and `restoreBuild`.
  Read to confirm it is **not** being changed and why.
- `tooling/build-checks.mjs` (lines 404-435) — group 4, the round-trip group.
- `tooling/build-checks.mjs` (lines 438-555) — group 5, the tamper battery. Note `pack()` at 441-449
  (the hand-built payload helper), the `cases` table at 456-497, and the `__proto__`-is-inert block at
  511-519 — **that block's expectation flips in this ticket** (Task 6, D4).
- `tooling/build-checks.mjs` (lines 1629-1723) — group 12, whose closing tripwire (1718-1721) exists
  precisely for this ticket and must be rewritten to state that the importer now exists.
- `tooling/build-journey.mjs` (lines 348-440, `[6] the share link, opened in a fresh context`) — the
  operator-run driver Task 8 extends; note the `?b=`-appears wait at 357-365 and the tamper case at 500.

### New Files to Create

- `tooling/share-v1-links.json` — **frozen** captured v1 payloads + their v1 decode outputs. Carries a
  `$description` naming its provenance and the never-regenerate rule (the `param-manifest.json`
  `$description` idiom).

### Relevant Documentation — READ BEFORE IMPLEMENTING

- `docs/epics/prototype-studio.architecture.md` §Data model, the *Arrangement is grid slots* and
  *Share codec v2* bullets — the verbatim source. `gh issue view 208` for the ACs.
- `CLAUDE.md` → "Ground rules" (token discipline, hand-validation at the boundary, no schema library)
  and the `system/build-share.mjs` architecture-map entry.
- Memory: **"the check that cannot fail"** — every #137 defect survived a green gate the same way, by
  skipping the thing it tested. Mutate the source; run the function, never grep for it.
- Memory: **"loc-summary baseline cascade"** — `system/*.mjs` line counts feed
  `system/loc-summary.json`, which approach.html renders. Task 10.

### Patterns to Follow

**Caps are imported, never re-typed** — `system/build-share.mjs:41` already does this for the board:

```js
import { LABEL_MAX, MAX_AFFORDANCES, MAX_PLACES } from "./breadboard.mjs";
```

Add exactly one more line in the same place:

```js
import { MAX_COLS, MAX_ROWS } from "./studio-canvas.mjs";
```

`studio-canvas.mjs` is Node-import-safe by construction (its header, lines 30-32, states it: no DOM
outside a function body, no self-boot) — which is why this import does not break `build-checks`.

**Validation is total, and every failure names itself** (`build-share.mjs:236-262`):

```js
const fail = (reason) => ({ state: null, reason });
...
if (!has("e") || (data.e !== 0 && data.e !== 1)) return fail("the board's edited flag is not 0 or 1");
```

Every new rejection returns `fail("<a sentence a reader could act on>")` — never a throw, never a
partially-built state.

**The wire-shape table is the contract** (`build-share.mjs:94-117`) — a new field is a new row in it,
written in the same two-column voice, or the file has two sources of truth.

**A gate case RUNS the function** (`build-checks.mjs:456-508`) — hand-build the payload object, `pack()`
it, `await decodeBuild()` it, assert `state === null` AND a non-empty `reason`.

---

## IMPLEMENTATION PLAN

### Phase 0: Capture the proof — BEFORE any source edit

Frozen v1 fixtures can only be captured from v1. This phase runs first and its output is committed
before `build-share.mjs` is touched.

### Phase 1: The codec

**Depends on:** Phase 0 (the fixtures must be captured from unmodified v1 code).

Version set, `g` encode, `g` decode, unknown-key audit.

### Phase 2: The gate

**Depends on:** Phase 1.

Group 4 grows the v1-fixture proof and the arrangement round-trip; group 5 grows the coordinate family
and re-points `v:2` → `v:3`; group 12's tripwire is discharged.

### Phase 3: The /build pass-through + drift

**Depends on:** Phase 1. **Independent of:** Phase 2 (they touch different files; sequence them only
because Task 9 runs the gate).

`build-keep.mjs` keeps a restored arrangement alive across a re-share; loc-summary and VR are checked.

---

## STEP-BY-STEP TASKS

Execute in order. Each task is atomic and independently validated.

### 1 · CREATE `tooling/share-v1-links.json` — capture real v1 payloads BEFORE editing anything

- **IMPLEMENT**: A committed fixture file of **five** entries. Each entry:
  `{ label, branch: "raw" | "deflate", capturedFrom, param, state }` where `state` is the **v1 decode
  output** of that param, captured with the v1 decoder at the same moment. Plus a `$description` key:
  what this file is, that it was captured at commit `<sha>` from unmodified v1 code, and that it is
  **frozen — never regenerated, only appended to**.
- **IMPLEMENT — the four Node captures** (run at HEAD, before any edit):

  ```bash
  node -e '
  import("./system/build-share.mjs").then(async (S) => {
    const { DEFAULT_ANSWERS } = await import("./system/build-questions.mjs");
    const { draftBoard } = await import("./system/breadboard.mjs");
    const answers = { ...DEFAULT_ANSWERS, shape: "worklist", nogos: "social" };
    const states = {
      "full build, imported pack": { answers, board: draftBoard(answers), boardIsEdited: true,
        pack: { slug: "acme", label: "acme.json", fileName: "acme.json",
          tokens: { "--color-accent": "#ff6600", "--color-fg": "#101010" }, note: "a pack header" } },
      "defaults, no pack": { answers: DEFAULT_ANSWERS, board: draftBoard(DEFAULT_ANSWERS),
        boardIsEdited: false, pack: null },
    };
    const out = [];
    for (const [label, st] of Object.entries(states))
      for (const compress of [false, true]) {
        const param = await S.encodeBuild(st, { compress });
        const { state } = await S.decodeBuild(param);
        out.push({ label, branch: compress ? "deflate" : "raw",
          capturedFrom: "node, system/build-share.mjs v1", param, state });
      }
    console.log(JSON.stringify(out, null, 2));
  })'
  ```

- **IMPLEMENT — the fifth, from a real browser** (the ticket's "real captured links, not synthesised
  ones", belt and braces): serve the repo and drive /build in chromium, edit the board, click **Copy
  the link that rebuilds this**, and read the `?b=` param off `location`:

  ```bash
  node tooling/visual-regression/serve.mjs &      # then, in another shell:
  node -e '
  const pw = require("./tooling/visual-regression/node_modules/playwright");
  (async () => {
    const b = await pw.chromium.launch(); const p = await b.newPage();
    await p.goto("http://127.0.0.1:8080/build.html");
    await p.waitForSelector("[data-build-keep=ready]");
    await p.getByRole("button", { name: /Copy the link that rebuilds this/ }).click();
    await p.waitForFunction(() => new URL(location.href).searchParams.get("b"));
    console.log(new URL(p.url()).searchParams.get("b"));
    await b.close();
  })()'
  ```

  Record it with `capturedFrom: "chromium, /build.html Copy link, <ISO date>"` and its v1-decoded
  `state` (obtained with the same Node decoder, at HEAD).
- **PATTERN**: `system/param-manifest.json`'s `$description` header idiom; `replay/README.md`'s
  provenance discipline (an artifact states where it came from).
- **GOTCHA**: The deflate branch's **bytes are implementation-dependent** — Node's `CompressionStream`
  and Chrome's need not emit identical deflate streams for the same input. So a deflate fixture's
  `param` is a *decode* fixture, never a byte-identity target. Byte-identity is asserted on the **raw**
  branch only; the deflate branch's identity claim is made on the inflated JSON (Task 5).
- **GOTCHA**: Do this **before** Task 2. A fixture captured after the edit proves nothing.
- **VALIDATE**: `node -e 'const f=require("./tooling/share-v1-links.json"); console.log(f.length ?? Object.keys(f))'`
  — five entries, each with a non-empty `param` and a non-null `state`; and
  `git log -1 --format=%H` recorded in `$description` matches the commit the capture ran at.
- **SATISFIES**: AC #1

### 2 · UPDATE `system/build-share.mjs` — the version set

- **IMPLEMENT**: Replace the single constant with a set plus the base version:
  ```js
  // The version this builder WRITES when it has nothing v2-only to say. A build with no arrangement
  // must produce the byte-identical param v1 produced, so this is emitted as a literal `1` and not as
  // "the lowest supported version" — the two are the same number today and would not stay so.
  const V_BASE = 1;
  export const SHARE_VERSION = 2;                       // the highest this builder writes
  export const SHARE_VERSIONS = Object.freeze([1, 2]);  // what it READS
  ```
  Decode's version gate becomes:
  ```js
  if (!has("v") || !SHARE_VERSIONS.includes(data.v)) {
    return fail(`this link is format v${has("v") ? String(data.v) : "?"}; this builder reads v${SHARE_VERSIONS.join(" and v")}`);
  }
  ```
- **GOTCHA**: `SHARE_VERSIONS.includes("1")` is false — a string `"1"` still rejects, which the existing
  `["v as a string", clone({ v: "1" })]` case asserts. Do not `Number()` it.
- **GOTCHA**: `SHARE_VERSION` is imported nowhere outside this file (verified:
  `grep -rn SHARE_VERSION` hits only `build-share.mjs` and this plan). Changing its value breaks no
  caller — but it now means "highest written", so update its comment.
- **VALIDATE**: `node -e 'import("./system/build-share.mjs").then(m=>console.log(m.SHARE_VERSION, m.SHARE_VERSIONS))'`
  → `2 [ 1, 2 ]`
- **SATISFIES**: AC #5

### 3 · UPDATE `system/build-share.mjs` — encode `g`, and only when it is real

- **IMPLEMENT**: Import the bounds (`import { MAX_COLS, MAX_ROWS } from "./studio-canvas.mjs";` beside
  the `breadboard.mjs` import at line 41). Then, after `p` is built and before `payload` is created:
  ```js
  // The arrangement, if there is one AND it describes the board being sent. `g` is POSITIONAL and
  // parallel to `p` — the place an entry belongs to is its index, which is why no id travels and why
  // nothing here can point at a place that is not on this board.
  //
  // Consistency, not repair: an arrangement whose length does not match the emitted places is an
  // arrangement for a DIFFERENT board (a /build visitor added a place to a studio-shared build), and
  // the honest answer is to send the build without it — a v1 payload — rather than a coordinate list
  // the receiver would have to guess how to align.
  const slots = arrangementSlots(state && state.arrangement, p);
  ```
  with a module-private helper beside `labelOk`:
  ```js
  // arrangementSlots(arrangement, p) → [[col, row], …] or null. Accepts what system/studio.mjs's
  // arrangeBoard produces ({ id, col, row }) and what decodeBuild returns (the same shape), so a
  // producer never has to reshape. Every value must ALREADY be a valid grid slot: this is an encoder,
  // not a repairer, and emitting a clamped coordinate would put a slot in the URL that the sender
  // never saw.
  function arrangementSlots(arrangement, p) {
    if (!Array.isArray(arrangement) || !arrangement.length) return null;
    if (arrangement.length !== p.length) return null;
    const out = [];
    const seen = new Set();
    for (let i = 0; i < arrangement.length; i += 1) {
      const entry = arrangement[i];
      if (!entry || typeof entry !== "object") return null;
      if (entry.id != null && String(entry.id) !== p[i][0]) return null; // an id, if given, must be its place's
      const col = entry.col; const row = entry.row;
      if (!slotOk(col, row) || seen.has(`${col},${row}`)) return null;
      seen.add(`${col},${row}`);
      out.push([col, row]);
    }
    return out;
  }
  ```
  and the shared predicate the DECODER also uses:
  ```js
  // The one definition of "a slot that may travel". Integers only, 1-based, inside the canvas's own
  // exported bounds — NOT studio-canvas.mjs's clampSlot, which coerces and repairs. See the header note.
  const slotOk = (col, row) =>
    Number.isInteger(col) && Number.isInteger(row) &&
    col >= 1 && col <= MAX_COLS && row >= 1 && row <= MAX_ROWS;
  ```
  Then the payload:
  ```js
  const payload = { v: slots ? SHARE_VERSION : V_BASE, a, b: { p, c }, e: state && state.boardIsEdited ? 1 : 0 };
  ```
  and, **after** the `k`/`s` block so key order stays `v, a, b, e, k, s, g`:
  ```js
  if (slots) payload.g = slots;
  ```
- **PATTERN**: `build-share.mjs:207-215` — the `k`/`s` block's "only what the decoder would accept"
  posture, applied to coordinates.
- **GOTCHA**: **Key order is the byte-identity contract.** `JSON.stringify` emits insertion order, so
  `g` must be appended last and the first four keys must keep their existing order and literal values.
  A no-arrangement encode must produce a JSON string with no `g` and `"v":1`.
- **GOTCHA**: `p` is already truncated to `MAX_PLACES` at line 190 — compare the arrangement's length
  against `p.length`, **never** against `board.places.length`.
- **IMPLEMENT**: Add the `g` row to the wire-shape table (lines 94-117), in its voice:
  ```
  //   g    [[col, row], …]  (v2 only)              → present ⇔ v === 2; length === b.p.length; every
  //                                                   pair two integers, 1..MAX_COLS × 1..MAX_ROWS
  //                                                   (IMPORTED from studio-canvas.mjs); no cell twice
  ```
- **VALIDATE**:
  ```bash
  node -e 'Promise.all([import("./system/build-share.mjs"),import("./system/build-questions.mjs"),import("./system/breadboard.mjs")]).then(async ([S,Q,B])=>{
    const st={answers:Q.DEFAULT_ANSWERS,board:B.draftBoard(Q.DEFAULT_ANSWERS),boardIsEdited:false,pack:null};
    const noArr=await S.encodeBuild(st,{compress:false});
    const arr=await S.encodeBuild({...st,arrangement:st.board.places.map((pl,i)=>({id:pl.id,col:i+1,row:1}))},{compress:false});
    const json=(x)=>new TextDecoder().decode(Uint8Array.from(atob(x.replace(/-/g,"+").replace(/_/g,"/")+"==".slice(0,(4-x.length%4)%4)),c=>c.charCodeAt(0)).subarray(1));
    console.log(json(noArr).slice(0,12), "| g?", json(noArr).includes('"g"'), "||", json(arr).slice(0,12), json(arr).slice(-40));
  })'
  ```
  → the first prints `{"v":1,` and `g? false`; the second prints `{"v":2,` and ends with the `g` array.
- **SATISFIES**: AC #2, AC #3

### 4 · UPDATE `system/build-share.mjs` — decode `g`, and audit unknown keys

- **IMPLEMENT — the known-key audit**, immediately after the version gate (so a stranger's payload is
  refused before any of it is interpreted):
  ```js
  // v1 validated every field it KNEW about and ignored every field it did not, which made a payload
  // carrying anything extra decode as a build without it — a page stating at rest that it rebuilt the
  // build that was shared. The whole-or-nothing rule the token map already follows, applied to the
  // envelope: a key this builder does not know is a payload this builder does not understand.
  const KNOWN = new Set(["v", "a", "b", "e", "k", "s", "g"]);
  for (const key of Object.keys(data)) {
    if (!KNOWN.has(key)) return fail(`"${key}" is not a field this builder reads`);
  }
  ```
- **IMPLEMENT — the arrangement**, after the edited-flag check and before the token map:
  ```js
  // The arrangement. REJECTED, never clamped: clampSlot (studio-canvas.mjs:50) repairs a READER's
  // gesture, and repairing a STRANGER's payload is the partial restore this whole file refuses.
  let arrangement = null;
  if (has("g")) {
    if (data.v !== SHARE_VERSION) return fail(`this link carries an arrangement but claims format v${String(data.v)}`);
    const g = data.g;
    if (!Array.isArray(g)) return fail("the arrangement is malformed");
    // An empty `g` is not "no arrangement", it is a claim with nothing behind it — the same call the
    // empty token map gets below, and encodeBuild never emits one.
    if (!g.length) return fail("the link carries an empty arrangement");
    if (g.length !== places.length) {
      return fail(`the arrangement covers ${g.length} places but the board carries ${places.length}`);
    }
    const seen = new Set();
    const slots = [];
    for (let i = 0; i < g.length; i += 1) {
      const pair = g[i];
      if (!Array.isArray(pair) || pair.length !== 2) return fail("a grid slot is not a [column, row] pair");
      const [col, row] = pair;
      if (!slotOk(col, row)) {
        return fail(`the slot [${String(col)}, ${String(row)}] is off a ${MAX_COLS} by ${MAX_ROWS} grid`);
      }
      const key = `${col},${row}`;
      if (seen.has(key)) return fail(`two places share column ${col}, row ${row}`);
      seen.add(key);
      slots.push({ id: places[i].id, col, row });
    }
    arrangement = slots;
  }
  ```
  and add `arrangement` to the returned state:
  ```js
  state: { answers, board: { places, connections }, boardIsEdited: data.e === 1, pack, arrangement },
  ```
- **GOTCHA**: `arrangement` is **`null`**, not `[]`, for every v1 payload and for a v2 payload with no
  `g` — the ticket is explicit: "a v1 payload yields no arrangement (not an empty one, not a default —
  none)".
- **GOTCHA**: The `id` in each returned entry is taken from the **validated** `places[i]`, never from
  the payload. Nothing about the arrangement is trusted except its two numbers.
- **GOTCHA**: `slotOk` rejects `"4"`. This **diverges from `clampSlot`, deliberately** — group 12
  asserts `clampSlot({col:"4"})` coerces. Both are correct for their caller; say so in the header
  (Task 5's comment work) so the next reader does not "fix" one into the other.
- **GOTCHA**: The known-key audit **changes an existing gate expectation**. `JSON.parse` creates
  `__proto__` as an *own* property, so `Object.keys(data)` includes it and group 5's
  "top-level `__proto__` is inert" case now **rejects**. That is the intended new behaviour — Task 6
  updates the case and its comment. Do not special-case `__proto__` to preserve the old expectation.
- **VALIDATE**:
  ```bash
  node -e 'import("./system/build-share.mjs").then(async S=>{
    const enc=(o)=>{const b=new TextEncoder().encode(JSON.stringify(o));const u=new Uint8Array(b.length+1);u.set(b,1);
      return btoa(String.fromCharCode(...u)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")};
    const {QUESTIONS}=await import("./system/build-questions.mjs");
    const good={v:1,a:Object.fromEntries(QUESTIONS.map(q=>[q.id,q.default])),b:{p:[["p1","A",[]],["p2","B",[]]],c:[]},e:0};
    for(const [why,pl] of [["v1 clean",good],["unknown key",{...good,zz:1}],["g on v1",{...good,g:[[1,1],[2,1]]}],
      ["g ok",{...good,v:2,g:[[1,1],[2,1]]}],["off-board",{...good,v:2,g:[[99,1],[2,1]]}],
      ["duplicate",{...good,v:2,g:[[1,1],[1,1]]}],["string coords",{...good,v:2,g:[["1","1"],[2,1]]}]])
      console.log(why, JSON.stringify((await S.decodeBuild(enc(pl))).state?.arrangement ?? (await S.decodeBuild(enc(pl))).reason));
  })'
  ```
  → `v1 clean null` · the next two and the last three a reason string · `g ok` an array of two
  `{id,col,row}`.
- **SATISFIES**: AC #1, AC #3, AC #4, AC #6

### 5 · UPDATE `system/build-share.mjs` — the header states the two new rules

- **IMPLEMENT**: Two short additions to the file header (lines 29-38's voice — each states a decision
  and why, not what the code does):
  1. **Why `g` is positional and why it is all-or-nothing** — the place an entry belongs to is its
     index; a partial arrangement is not representable *on purpose*, because nothing produces one and a
     receiver would have to invent slots for the rest.
  2. **Why the codec rejects where the canvas clamps** — `clampSlot` repairs a reader's own gesture in
     their own browser; a payload from a stranger gets the module's standing absolute-validation rule.
     Name `studio-canvas.mjs:50` so the divergence reads as a decision.
- **PATTERN**: the existing "TWO DIVERGENCES FROM `system/share-state.mjs`" block (lines 9-27).
- **VALIDATE**: `node --check system/build-share.mjs` (syntax) and a read-through — the wire table, the
  header and the code agree on all three of: emitted version, `g`'s shape, the bounds' owner.
- **SATISFIES**: AC #3, AC #4

### 6 · UPDATE `tooling/build-checks.mjs` groups 4 + 5

- **IMPLEMENT — group 4** (lines 404-435), three additions:
  1. **The frozen v1 proof.** Read `tooling/share-v1-links.json`; for **every** entry assert
     `decodeBuild(entry.param)` returns a state whose
     `JSON.stringify({answers, board, boardIsEdited, pack})` equals
     `JSON.stringify({answers, board, boardIsEdited, pack})` of the frozen `entry.state` — **and**
     `state.arrangement === null`. Assert the fixture covers **both** branches (`raw` and `deflate`) and
     at least one browser capture, so a fixture file quietly reduced to one entry fails.
  2. **Byte-identity.** For each `raw` entry, `await encodeBuild(entry.state, { compress: false })`
     must equal `entry.param` **exactly**. For each `deflate` entry, inflate both and compare the JSON
     strings (see Task 1's gotcha: deflate bytes are implementation-dependent, the JSON is not).
  3. **The arrangement round-trip.** Encode `sample` with an arrangement over its own board, decode,
     assert the arrangement round-trips value-for-value, re-encode and assert the param is identical
     (raw branch), and assert `patternFor(state).id === patternFor(sample).id` — the pattern still
     recomputes to the sender's with `g` in the payload.
- **IMPLEMENT — group 5** (lines 438-555):
  - Re-point the hostile version case: `["v: 2", clone({ v: 2 })]` → `["v: 3", clone({ v: 3 })]`, and
    **add a positive**: a `v: 2` payload with a valid `g` decodes (baseline-style, asserted `!== null`,
    beside the existing `baseline` assertion — v2 is real now, so the battery must prove the accept
    side too or the family could pass by rejecting everything).
  - Add the coordinate family (each `clone({ v: 2, g: … })` over a two-place `b`):
    magnitude (`[[1e9,1],[2,1]]`, `[[1,Number.MAX_SAFE_INTEGER],[2,1]]`, `[[0,1],[2,1]]`,
    `[[-1,1],[2,1]]`) · type (`[["1","1"],[2,1]]`, `[[1.5,1],[2,1]]`, `[[null,1],[2,1]]`,
    `[[true,1],[2,1]]`, `[[{col:1,row:1}],[2,1]]`, `g` as an object, `g` as a string, a pair of
    length 3) · duplicate (`[[1,1],[1,1]]`) · off-board (`[[MAX_COLS+1,1],[2,1]]`,
    `[[1,MAX_ROWS+1],[2,1]]`) · overflow (`g` longer than `p`, `g` shorter than `p`, `g` of 1000
    entries, `g: []`) · envelope (`g` present on `v: 1`).
  - Add the **unknown-key family**: a payload with a top-level `zz`, and one with `arrangement` spelled
    out — the near-miss a future editor would actually type.
  - **Rewrite the `__proto__`-is-inert block** (lines 511-519): the expectation flips to
    `state === null` because the key audit sees it. **Keep both prototype-pollution assertions**
    (`{}.polluted === undefined`, `Object.prototype.polluted === undefined`) — they still assert the
    thing that matters. Rewrite the comment to say what is now true: it is refused by the envelope
    audit, and non-pollution is still asserted because a *rejection* must not pollute either.
  - **Boundary cases, accepted**: `[[MAX_COLS, MAX_ROWS],[1,1]]` decodes; `[[MAX_COLS+1, MAX_ROWS]]`
    does not — the boundary itself, mirroring the existing `LABEL_MAX` pair at lines 522-526.
- **IMPLEMENT — the group lines** (AC #7, and #150's lesson): group 5's already interpolates
  `${cases.length}`; extend its detail to name the coordinate family and interpolate any count you
  state (`${coordinateCases.length}` if you split the table). Group 4's detail line gains
  `${v1Fixtures.length} frozen v1 links (both branches + one browser capture) restore byte-identically ·
  the arrangement round-trips and re-encodes identically`. **No hand-typed number anywhere in either
  string.**
- **IMPLEMENT — group 12's tripwire** (lines 1718-1721): rewrite it from "planted for that day" to the
  discharged form — `system/build-share.mjs` now imports `MAX_COLS`/`MAX_ROWS`, so assert the *coupling*
  rather than the constants' finiteness: read `system/build-share.mjs` and assert it imports both names
  from `./studio-canvas.mjs` and contains **no** second literal `12`/`8` bound for a grid axis. Keep it
  a running assertion, not a comment.
- **PATTERN**: group 5's `cases` table and its `for` loop (lines 456-508); group 12's
  "every regex asserted to have matched something" discipline (lines 1637-1642).
- **GOTCHA — the check that cannot fail**: `pack()` at line 441 hard-codes the `0x00` flag; that is
  fine. But a coordinate case whose `b` does not match its `g` length will reject for the *length*
  reason and prove nothing about coordinates. **Give every coordinate case a two-place `b` and a
  two-entry `g`**, varying only the thing under test.
- **VALIDATE**: `node tooling/build-checks.mjs` — 15 groups green. **Then mutate and confirm red**,
  four mutations, one at a time, reverting each:
  1. delete the `!slotOk(...)` rejection in decode → the off-board and type cases must fail;
  2. change `seen.has(key)` to `false` → the duplicate case must fail;
  3. make encode emit `v: SHARE_VERSION` unconditionally → the byte-identity assertions must fail;
  4. delete the known-key audit → the unknown-key cases must fail.
  A mutation that leaves the run green means the check is not checking. Record all four outcomes in the
  PR body.
- **SATISFIES**: AC #1, AC #3, AC #4, AC #5, AC #6, AC #7

### 7 · UPDATE `system/build-keep.mjs` — a restored arrangement survives a re-share

- **IMPLEMENT**: A module-scope `let restoredArrangement = null;` inside `mount`. In `restore()`, after
  a successful decode, `restoredArrangement = state.arrangement;`. In `currentUrl()`:
  ```js
  // /build has no canvas, so it can neither show nor edit an arrangement — but a link that ARRIVED
  // with one must not be quietly flattened by a visitor who only came here to rename a place. The
  // arrangement rides along untouched; encodeBuild drops it by itself the moment the board stops
  // matching it (build-share.mjs's arrangementSlots), which is the honest outcome for an edit /build
  // genuinely cannot express.
  async function currentUrl() {
    return shareUrl(await settledUrl(), await encodeBuild({ ...latest.state, arrangement: restoredArrangement }));
  }
  ```
- **GOTCHA**: Do **not** put `arrangement` into the `BUILD_CHANGE` store. `restoreBuild`'s destructure
  (`build-questions.mjs:384`) ignores it, which is correct and stays correct — see Non-Goals.
- **GOTCHA**: The consistency rule lives in `encodeBuild`, not here. `build-keep` must not test the
  board against the arrangement itself, or there are two opinions about when `g` is emitted.
- **VALIDATE**: `node --check system/build-keep.mjs`, then `node tooling/build-checks.mjs` (group 6
  imports `specMarkdown` from this file, so a syntax or import error surfaces there), then Task 8.
- **SATISFIES**: AC #1 (the PRD §1 guarantee this ticket most risks)

### 8 · UPDATE `tooling/build-journey.mjs` — the pass-through, on a real page

- **IMPLEMENT**: One case in the existing share section — **`[6] the share link, opened in a fresh
  context`, `tooling/build-journey.mjs:348`**, whose "wait for `?b=` to appear" idiom (lines 357-365)
  is the wait to reuse. Navigate to
  `/build.html?b=<a v2 param generated in-test from the page's own modules>`, wait for
  `[data-build-keep=ready]`, assert the restore succeeded (the RESTORED provenance sentence), click
  **Copy the link that rebuilds this**, read the new `?b=` off `location`, decode it in the page, and
  assert `arrangement` is non-null and value-identical. Then rename a place (so the board still matches)
  and assert it is *still* carried; then add a place and assert the re-shared link falls back to v1 with
  no arrangement — the honest degradation, asserted rather than assumed.
- **PATTERN**: the existing share round-trip + tamper cases in this file; Playwright resolved out of
  `tooling/visual-regression/node_modules`, never a repo dep.
- **GOTCHA**: Operator-run, not CI — like `vt-verify`, `proto-journey`, `studio-journey`. State that in
  the PR body with the run output; do not wire it into CI.
- **GOTCHA**: The copy click sits inside `analytics.mjs`'s virtual-route window (`settledUrl`,
  `build-keep.mjs:246`). Wait for the link **field** to carry a `?b=`, not merely for the click.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs &` then `node tooling/build-journey.mjs all` —
  chromium + firefox + webkit green. (Memory: "build-journey failure vs flake" — a matching flake
  signature can still be a real regression; stash and run HEAD to tell them apart.)
- **SATISFIES**: AC #1

### 9 · VALIDATE the whole gate + the drift checks

- **IMPLEMENT**: nothing — run and read.
- **VALIDATE**:
  ```bash
  node tooling/build-checks.mjs          # 15 groups green
  node tooling/drift-check.mjs           # generated artifacts unchanged
  node agent-layer/gen-loc-summary.mjs --check
  node agent-layer/gen-param-count.mjs --check
  ```
- **GOTCHA**: `--check` before staging can read as a false "no drift" for *new* files
  (memory: "loc-summary counts tracked only") — `git add` the new fixture first. The fixture is in
  `tooling/`, which `gen-loc-summary`'s three group regexes do **not** match (`system/*.{css,mjs,js}`,
  root+`proto/*.html`, `agent-layer/*.mjs`), so it should not move a number.
- **SATISFIES**: AC #7

### 10 · REGENERATE loc-summary if — and only if — it drifted

- **IMPLEMENT**: `system/build-share.mjs` and `system/build-keep.mjs` both grow. The runtime group's
  line total is **rounded to the nearest 100** and approach.html renders it, so a ~120-line addition can
  flip it. If Task 9's `--check` reported drift: `node agent-layer/gen-loc-summary.mjs`, then regenerate
  **both approach baselines** — `cd tooling/visual-regression && npm run update:docker` — from a
  **clean detached worktree under `/Users`** (never `/private/tmp`: Docker cannot share it, and the gate
  screenshots the dirty tree).
- **GOTCHA**: If `--check` is clean, change nothing. A gratuitous baseline regen is a baseline
  collision waiting to happen (the epic's baseline-collision rule).
- **GOTCHA**: No other VR churn is expected — no page's at-rest DOM changes. Confirm by reading the
  update run's output: it should touch **only** the two approach PNGs, or nothing at all.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` clean; `git status` shows only the
  intended files.
- **SATISFIES**: the epic's standing "every ticket carries" rules

---

## TESTING STRATEGY

This repo has no test suite, no linter and no type-check (CLAUDE.md, "Testing"). "Done" = run the
surface you touched. Here that is three surfaces:

### Pure gate (CI) — `tooling/build-checks.mjs`

Groups 4, 5 and 12. Every assertion **runs** `encodeBuild`/`decodeBuild` over a real payload; none
greps the source, except group 12's coupling assertion, which greps *by design* (a mirror check, the
`pack-boot.js` idiom) and asserts its regex matched something first.

### Running-page driver (operator) — `tooling/build-journey.mjs`

The one thing the pure gate structurally cannot reach: that `build-keep`'s restore→re-encode path
actually carries the arrangement in a browser, across three engines.

### Edge cases that must be covered

- v1 param, both branches, decodes byte-identically → **frozen fixtures**, not synthesised
- v1 param + no arrangement encode → **byte-identical param** (raw) / **byte-identical JSON** (deflate)
- `g` on a `v: 1` envelope → reject
- `g: []`, `g` shorter than `p`, `g` longer than `p`, `g` of 1000 → reject
- `"4"` / `1.5` / `null` / `true` / an object as a coordinate → reject (**and** `clampSlot` still
  coerces `"4"` — group 12 keeps asserting that; the two are different callers)
- `0`, `-1`, `MAX_COLS+1`, `MAX_ROWS+1`, `1e9`, `MAX_SAFE_INTEGER` → reject
- two places in one cell → reject
- `[MAX_COLS, MAX_ROWS]` → accept (the boundary itself)
- an unknown top-level key, and `__proto__` as one → reject, with no prototype pollution either way
- `v: 3` → reject · `v: 2` with a valid `g` → accept
- the caps: `MAX_PARAM_CHARS`, `MAX_DECODED_BYTES` (the bomb), still enforced with `g` present

---

## VALIDATION COMMANDS

### Level 1: Syntax

```bash
node --check system/build-share.mjs && node --check system/build-keep.mjs && node --check tooling/build-checks.mjs
```

### Level 2: The committed gate

```bash
node tooling/build-checks.mjs        # 15 groups; 4, 5 and 12 are this ticket's
```

### Level 3: Mutation — the check must be able to fail

Four mutations from Task 6, one at a time, each reverted. Each must turn `build-checks` red, and the
failure message must name the thing that broke.

### Level 4: The running page

```bash
node tooling/visual-regression/serve.mjs &
node tooling/build-journey.mjs all       # chromium + firefox + webkit
```

### Level 5: Drift + no visual churn

```bash
node tooling/drift-check.mjs
node agent-layer/gen-loc-summary.mjs --check
node agent-layer/gen-param-count.mjs --check
```

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** A v1 payload encoded before this change decodes to a byte-identical state after it —
      asserted against **real captured links** (`tooling/share-v1-links.json`), both the deflate and the
      raw branch, including one copied from a real browser.
- [ ] **AC #2** Encoding a build with **no** arrangement produces a byte-identical param to v1's (raw
      branch, byte-for-byte; deflate branch, JSON-for-JSON).
- [ ] **AC #3** Encoding with arrangement round-trips: decode → re-encode → identical, and the pattern
      recomputes to the sender's.
- [ ] **AC #4** Every coordinate tamper case is rejected **whole** — no partial restore, ever; every
      rejection carries a non-empty reason.
- [ ] **AC #5** The `v: 3` hostile case is refused; `v: 2` is accepted as real (asserted on both sides).
- [ ] **AC #6** Caps enforced: `MAX_PARAM_CHARS`, `MAX_DECODED_BYTES`, and the **imported** grid bounds
      — with group 12 asserting the import rather than a re-typed literal.
- [ ] **AC #7** `node tooling/build-checks.mjs` groups 4 + 5 green, with the new case count stated
      correctly in the group line — every number in both strings interpolated, none typed.
- [ ] No at-rest page change: `drift-check`, `gen-loc-summary --check`, `gen-param-count --check` clean
      (or loc-summary regenerated **with** both approach baselines in the same PR).
- [ ] `tooling/build-journey.mjs all` green on three engines.
- [ ] PR body carries `Closes #208`, the four mutation outcomes, and the plan/report/review artifacts.

---

## COMPLETION CHECKLIST

- [ ] Fixtures captured **before** any source edit, and the capture commit sha recorded in them
- [ ] All ten tasks completed in order, each validated as it landed
- [ ] Four mutations run and confirmed red, then reverted
- [ ] `build-checks` 15/15 green · `build-journey all` green · drift checks clean
- [ ] `.claude/plans/studio-share-codec-v2-208.md`, `.claude/reports/…`, `.claude/code-reviews/pr-<N>-review.md`
      committed in the same PR
- [ ] `Closes #208` in the PR body

---

## OPEN QUESTIONS / ASSUMPTIONS

1. **The `g` wire shape is positional-parallel, not id-keyed.** Assumed, argued in NOTES D1. If #209 or
   #212 turns out to need a *partial* arrangement (some places placed, some not), this shape cannot
   express it and the field would need a v3. I judge that unlikely — `arrangeBoard` places every place —
   but it is the one decision here that a later wave could regret. **Object now if flows will place only
   some places.**
2. **Task 7's pass-through** (a /build visitor re-sharing a studio link keeps the arrangement) goes
   slightly beyond "codec + gate". It is included because the ticket lists `build-keep.mjs` as a seam
   and because dropping it silently would break PRD §1's spirit while passing every AC. If you'd rather
   #208 stay strictly pure, cut Tasks 7 and 8 and hand them to #210 — say so before implementation.
3. **"Real captured payloads"** is read as: produced by the shipping v1 encoder before this ticket
   edits it, frozen, never regenerated — four captured through the v1 module in Node plus one copied
   out of a real chromium session. If the intent was "only browser-captured", Task 1's Node captures
   become browser captures and the raw-branch fixture needs a `CompressionStream`-less engine (there
   isn't one in the driver set) — which is why the raw branch is captured in Node with `compress: false`.
4. **Assumed unchanged:** `MAX_PARAM_CHARS` (8000) and `MAX_DECODED_BYTES` (32 KB). Six places × ~7 B of
   `g` is ~50 B on a ~1.1 KB payload; no cap moves.
5. **Assumed:** #204 is merged on `main` and `MAX_COLS`/`MAX_ROWS` are exported (verified at
   `system/studio-canvas.mjs:38-39`), so `system/studio-canvas.mjs` is **not** edited despite appearing
   in the ticket's file estimate.

---

## NOTES (open canvas)

### D1 — why `g` is `[[col, row], …]` parallel to `b.p`

Alternatives weighed:

| shape | bytes / 6 places | id validation | partial arrangements | verdict |
|---|---|---|---|---|
| `[[col,row], …]` parallel to `p` | ~42 | none needed — index *is* the place | not representable | **chosen** |
| `{ "p1": [1,1], … }` | ~110 | must cross-check every key against `p` | representable | rejected |
| `[[id,col,row], …]` | ~90 | must cross-check, and ids can disagree with `p` | representable | rejected |

The file already argues for positional over keyed (`build-share.mjs:109-110`: "~600 B against ~1.1 KB
on the board alone, and the shape is fixed by the table above rather than by a key a reader guesses").
More importantly, the positional form makes an entire tamper class **unrepresentable**: there is no id
to point at a place that is not on the board, no id to duplicate, no id to mis-spell. The only things a
hostile `g` can carry are two numbers and a length, and all three are checked.

The cost — no partial arrangement — is the open question above, and it is *stated* rather than
discovered: `arrangeBoard` gives every place a slot, so a partial arrangement has no producer today.

### D2 — why the codec rejects where the canvas clamps

`clampSlot` coerces `"4"` → `4`, `-3` → `1`, `MAX+5` → `MAX`. That is exactly right for #205's mover:
a reader's own gesture, in their own browser, snapped onto the grid. It is exactly wrong for a payload
from a stranger — a clamp is a *repair*, and this module's standing rule is that a repaired payload is
not the build that was shared. Group 12's closing comment currently says the decoder will "inherit
clampSlot's answers"; the truthful version, which Task 6 writes, is that it inherits clampSlot's
**bounds**. Both statements need to be in the tree at once (group 12 keeps asserting the coercion, the
codec keeps asserting the rejection), so both files carry a sentence pointing at the other.

### D3 — the version rule, and why `V_BASE` is a separate literal

`SHARE_VERSION` now means "the highest version this builder writes", and the no-arrangement branch
writes `V_BASE = 1`. Writing `SHARE_VERSIONS[0]` there would be cleverer and wrong: the byte-identity
guarantee is about the number `1` specifically, not about "whatever the lowest supported version
happens to be after the next change".

### D4 — the `__proto__` expectation flip, in full

`JSON.parse('{"__proto__":{"x":1}}')` creates `__proto__` as an **own data property** (it does not
invoke the setter), so it is enumerable in `Object.keys`. The known-key audit therefore refuses it —
which is a *strictly better* outcome than v1's accepted-but-inert, and is what "unknown top-level keys
become a rejection" means. Group 5's existing block asserted the *old* behaviour with a long, careful
comment arguing that asserting a rejection there would be "a test asserting a behaviour the code
correctly does not have". That argument was true of v1 and is false of v2 — the code now has the
behaviour. Rewrite the comment; do not delete the two pollution assertions, because a *rejecting*
decoder must still not pollute on the way out.

This is the single most likely place for a reviewer to think the ticket broke something. Call it out
explicitly in the PR body.

### D5 — what happens to a studio link opened on /build

Four cases, and the surface must be honest in all four:

| the visitor does | the re-shared link |
|---|---|
| nothing (just copies) | v2, arrangement intact |
| renames a place | v2, arrangement intact (length unchanged) |
| adds or removes a place | **v1** — `arrangementSlots` sees a length mismatch and omits `g` |
| arrives with no `?b=` | v1, as today |

Row 3 is a real loss of information, and it is the honest one: /build cannot show the arrangement, so it
cannot ask where the new place goes, and inventing a slot would be the codec claiming something the
sender never did. Task 8 asserts row 3 rather than leaving it to be discovered.

### Risk register

- **The byte-identity claim across branches.** The single sharpest trap in this ticket: deflate output
  is not guaranteed identical across implementations. Asserting `encodeBuild(state) === fixture.param`
  on a deflate fixture would be a check that passes on the author's machine and fails, or worse
  *silently agrees*, elsewhere. Byte-identity on the raw branch; JSON-identity on deflate.
- **Key-order regression.** Appending `g` anywhere but last silently breaks AC #2 while every decode
  test stays green. The Task 3 validate command reads the emitted JSON's prefix and suffix precisely
  because a decode-only check cannot see this.
- **A vacuous coordinate case.** A `g` whose length disagrees with `b.p` rejects for the length reason,
  so a whole family of "off-board" cases could pass while `slotOk` is deleted. Mutation 1 in Task 6 is
  the detector; run it.
- **Baseline collision.** If Task 10 does regenerate baselines, check `mergeStateStatus` before review
  and re-run `update:docker` after merging `main` (memory: "Reviews validate the pre-merge tree").

## AMENDMENTS

- (none yet)
