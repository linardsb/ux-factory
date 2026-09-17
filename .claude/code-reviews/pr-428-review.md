# Review — PR #428 · spike(canvas): S2 — Blueprint auto-layout → `stack` (#299)

**Head** `dc3192a` · **Base** `main` @ `2e6aabd59e8f89cbf53d88e9bfdf091d72821b5c` · first review round (no prior report, guarantees pass skipped) · 9 files, +2139 / −0, all under `.claude/`

## Verdict

**Request changes** on F1, F2 and F4. **F1 carries it:** the branch silently discards any `al()` argument it does not recognise — no drop row, no IR trace, a clean count line. That falsifies the spike's central promise to #301 and #304 (*"never coerced, never silently absent"*) for a class of input Brilliant's own documentation says exists, and it is the exact failure shape the file's own header says it was built to prevent.

The arithmetic is sound. I re-derived every headline figure independently and all of them hold, and the committed `raw/` files reproduce byte-identically from the committed source. What does not hold is two absolute claims — F2's *"the branch never emits a literal into the IR"*, which the PR's own committed output contradicts, and F4's `Closes #299` over an unticked AC. In a spike whose entire deliverable is a verdict document two future tickets will act on, a false sentence labelled "observed" is the defect, not a typo.

None of this moves the spike's own conclusion. Leg 2 is correct, and F2 makes it *more* correct than the document argues. But F1 means the artefact #304 inherits does not yet do what the document promises, and that promise is the deliverable.

## Issues

Ordered by severity, not by number: **High** F1, F2, F4 · **Medium** F3, F5, F6, F8 · **Low** F7, F9, F10.

### F1 (High) — `layout-branch.txt:120` — an `al()` argument the branch does not recognise vanishes with **no drop row**

```js
// anything else on an al() arg list is read past, deliberately — S2 is the layout branch alone
```

Observed (synthetic `al()` args, the rest of the line unchanged):

| `al()` argument | `alArgs` | drops | IR |
|---|---|---|---|
| `wrap` | 3 | **0** | `dir`+`gap`+`size`, no trace of the third argument |
| `gcross(8:$spacing.sm)` | 3 | **0** | same |
| `anything` | 3 | **0** | same |

The value is not mapped, not dropped, not reported. The run's `COULD NOT MAP` section stays empty and the count line reports clean.

This contradicts two of the PR's own load-bearing statements:

- `layout-branch.txt:25-26` — *"A MISS RETURNS null AND THE CALLER RECORDS A DROP. Never 0, never undefined, never the input unchanged — **a value that vanishes silently is the shape every #137 defect had.**"*
- `README.md` §Could not map — *"The branch produces **no** 'never read' rows by construction (every non-layout atom is out of its scope, not dropped by it)."* An unrecognised argument **inside `al()`** is not a non-layout atom. It is a layout atom, in scope, and it is never read.

**Failure scenario, and it is not exotic.** `01-knowledge.md:606` documents Brilliant's auto-layout as supporting **"wrap and its cross-axis gap"** — so some `al()` argument carries them. A wrapping row is an ordinary thing for a designer to draw. #304 lifts this branch on the stated promise that every unmappable value is dropped visibly, points it at the first differently-drawn source, and gets an IR that has silently lost `wrap` and a second gap value while reporting **zero** drops and a clean count. The spike's central claim to #301 — *"never coerced, never silently absent"* — is false for a whole class of input, and the loss is invisible in exactly the way the file's own header says it was built to prevent.

Unreachable on the two committed fixtures: every `al()` argument in both is `h`/`v`/`x()`/`y()`/`g()`/`pad()`, so no run in this PR could have surfaced it. That is what makes it a review finding rather than a red run.

**Fix — three lines, and it closes the gap rather than papering over it:**

```js
// in parseAl's loop, replacing the silent `continue`:
out.unknown = out.unknown || [];
out.unknown.push(p);
```

then one `drops.push({kind: "unread-al-arg", slot: "al", ref: null, value: p, reason: …})` per entry in `toStack`, and a control that asserts an unknown `al()` argument produces exactly one drop. That also gives the README a fourth `kind` row and lets E1's "never read" class be populated honestly instead of declared empty by construction.

### F2 (High) — `README.md:22` — "the branch never emits a literal into the IR" is false

> The branch never *emits* a literal into the IR — it omits the slot and records a drop

`layout-branch.txt:256` puts the raw axis value straight on the IR:

```js
const sizeOut = size ? { w: size.w.axis, h: size.h.axis } : null;
```

`one()` returns `{ axis: 360 }` for `s(360,hug)`, so the literal reaches `layout.size.w`. The PR's **own committed evidence** shows it — `raw/master.txt:14` and `:45`:

```
"align":{"main":null,"cross":"center"},"size":{"w":360,"h":"hug"}
```

Re-derived on master:3's line verbatim: `layout.size = {"w":360,"h":"hug"}`, `drops = ["literal-size"]` (observed). The `no-token` class *does* omit its slot; `literal-size` does not — it emits the literal **and** records a drop beside it.

**Failure scenario.** #304 lifts this file (AC #2) on the stated contract that the IR is literal-free. A renderer reads `layout.size.w`, finds `360` where the contract promised `"fill" | "hug"`, and emits `width: 360px` — a hardcoded literal on a token-contract surface, which is the repo's hardest rule (CLAUDE.md §Ground rules, token discipline). Nothing in the branch or the README tells that consumer to guard the axis.

Note this *strengthens* the verdict: the README defeats the narrow reading of "lossless" by arguing that `s(360,hug)` "appeared". It is defeated more simply — the literal actually reaches the IR. Right conclusion, wrong mechanism.

**Fix — keep the value, state the contract.** Discarding 360 is worse for #304 than carrying it, so no guard. Two sentences:

- `README.md:22`: *"the branch emits the literal on the axis and records a `literal-size` drop beside it — `layout.size.w` may be a number, not only `fill`/`hug`."*
- `layout-branch.txt:196-197`, in the `literal-size` header: *"the axis keeps the raw value; a consumer MUST refuse any axis that is not `fill` or `hug` rather than pass it through as a length."*

That closes the hazard instead of documenting it.

### F4 (High) — `Closes #299` closes a ticket with an unticked AC and nothing tracking it

#299's AC #3 is a checkbox: *"The verdict is **posted as a comment on epic #295**."* Its header adds *"Verdict posted to the epic before #301 is planned."* The PR body states AC #3 is not run, and the report (`:100-103`) says *"a follow-up issue should be opened if it is deferred rather than posted"* — none exists.

`Closes #N` in a PR **body** does close the issue on merge (confirmed on PR #145). So merging as written removes #299 from the board with its gating AC open and no trace left, while #301's planning depends on that comment existing.

Not posting it is right — the comment is outward-facing and the verdict is the owner's to publish. The defect is the closure, not the omission.

**Fix.** Either the owner posts the comment before merge, or open the follow-up issue and name it in the PR body in place of the "does not block this PR" sentence.

### F3 (Medium) — `README.md` Not-done — the non-zero 1-value pad the document says does not exist is in a file the spike already had

> The 1-value `pad()` form's expansion rule is asserted, not confirmed. … **A non-zero 1-value pad would settle it; none exists here.**

One exists. `01-knowledge.md:682`, in the directory this spike reads from:

```
al(h,pad($spacing.sm)) after(#logo) parent(#nav) "Search"
```

Three more `al()` lines sit in the same file (observed):

| line | content | bears on |
|---|---|---|
| `:682` | `al(h,pad($spacing.sm)) …` | the non-zero 1-value pad the Not-done bullet says does not exist |
| `:696` | `al(v,g($spacing.sm)) s(fill,hug) …` | — |
| `:702` | `replace(#cta) al(h,x(c),y(c),g($spacing.sm),pad($spacing.sm,$spacing.lg)) s(fill,hug) …` | a near-template of the chip node's semantics |
| `:752` | `al(v,g($spacing.none),pad($spacing.xs,$spacing.none,$spacing.none,$spacing.none)) s(hug,hug) clip …` | a **mixed** 4-value pad — F5's undocumented shape, shown authorable |

**Failure scenario.** #304 reads "none exists here", does not look, and carries the 1-value expansion rule forward as permanently unconfirmable. `:752` matters more: it is the mixed-pad shape F5 names, and its presence in Brilliant's own documentation turns F5 from "a case the fixtures happen not to contain" into "a case the source tool documents".

There is a fair defence for the sentence two paragraphs above the Not-done bullet — *"`01-knowledge.md` … carries no Blueprint auto-layout syntax reference"* — and I am not filing it as false: the Directives section is a directive reference that *uses* `al()`, and `blueprint/core`, where `al()`'s grammar would live, is genuinely not in the file. The heading list quoted is exactly right. But the two sentences read together tell #304 there is nothing in that file worth opening, and there is.

**Fix.** Replace "none exists here" with `01-knowledge.md:682` and either settle the rule against it or state why an authoring-DSL example cannot settle a read-form expansion (the README already draws that distinction well for the 2-value form). Add `:752` to F5's row.


### F5 (Medium) — `layout-branch.txt:250-252` — a partially mappable pad emits `null` holes with no documented meaning

```js
const four = expandPad(mappedAtoms);
pad = four.some((x) => x !== null) ? four : null;
```

Observed on `pad(4:$spacing.xs,0:$spacing.none,0:$spacing.none,0:$spacing.none)`:

```
layout.pad = [{"ref":"--spacing-xs","value":4},null,null,null]   drops = 3
```

`README.md:151` documents only the all-unmappable case ("A pad whose every side is unmappable emits `pad: null` rather than a partial array"). The mixed array is a third IR shape, and a `null` side is indistinguishable from "this consumer should do nothing here" versus "this side was lost". Not hypothetical — `01-knowledge.md:752` (F3) shows exactly this shape is authorable in Brilliant; the two committed fixtures just happen not to contain one.

**Fix.** One row in the drops table and one line in the branch header stating what a `null` side means to a consumer. No code change needed if the meaning is stated.

### F6 (Medium) — the `svg(` count is wrong, in four places, no two agreeing

| where | claim | observed |
|---|---|---|
| plan `:808-810` (amendment A5) | "present on **three master lines and one instance line**" | `grep -c 'svg('` → **1** master, **1** instance |
| `layout-branch.txt:51` | "on **three lines** of the master fixture" | **1** |
| `README.md` PC5 row | "**three master lines** carry one" | **1** |
| report `:124` | "on **four fixture lines**" | **2** |

Four statements of one countable fact. The plan's A5 is the origin — the report's "four fixture lines" is a faithful sum of A5's wrong split, which is how a single unchecked figure propagated into three documents. Both fixtures carry exactly one `svg(` line, and it is the Chevron (`03-blueprint.txt:10`, `03c-master-blueprint.txt:10`).

Worse for the sentence around it: `layout-branch.txt:50` calls the boundary test **"load-bearing, not defensive"**, and the mechanism it names — `args(<full line>, "g")` hitting the `g(` inside `svg(` — is never invoked by the branch. `parseAl` calls `args(p, "g")` on an already-isolated `g(...)` part (`:118`), and `args(line, "s")` on master:3 finds `s(360,hug)` first with or without the test. `args(line, "g")` appears exactly once in the PR, in PC5's synthetic line. On these fixtures the boundary test is **defensive**.

Keep the test — it is correct and #304's first differently-drawn source may well need it. Correct the count in all three places and let PC5 claim what it proves.

### F8 (Medium) — a same-shaped class one character away already ships with the default the verdict forbids

The verdict's whole "absence suffices" conclusion rests on one sentence handed to #301:

> `ds-stack`'s `components.css` block must declare no default `gap` and no default `padding`.

`ds-stack` does not exist yet — `grep -rn "ds-stack" system/ agent-layer/ handoff/ docs/` → **no matches** (observed), so the condition is correctly stated as forward-looking and is not currently violated. What the README never mentions is that **`.vd-stack` already exists** at `system/components.css:2439`:

```css
.vd-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
```

Same shape (flex column), one character off the name, and it carries exactly the unconditional default `gap` tripwire #1 forbids. It is genuinely unrelated — hand-authored proto chrome used by `proto/verdant.html`, `proto/fieldwork.html` and `system/proto.css`, with no `system/specs/` entry and no `agentic-renderer.mjs` template — which is precisely why it is dangerous: an implementer on #301 grepping for "is there already a stack-shaped class" finds it, reuses or pattern-matches onto it, and silently reinstates the failure mode the README warns about one paragraph later. A green check that cannot fail, reached by name-association.

**Fix.** One sentence beside the condition naming `.vd-stack` (`system/components.css:2439`) as an existing, unrelated, similarly-shaped class that already carries the forbidden default.

### F7 (Low) — `driver.txt:69` crashes on an `al()` node with no `s()`

```js
pad(`w=${out.layout.size.w} h=${out.layout.size.h}`, 26)
```

`toStack` returns `size: null` when `args(line,"s")` misses (`layout-branch.txt:256`). Observed: `TypeError: Cannot read properties of null (reading 'w')`. Unreachable on both committed fixtures — every al-line carries an `s()` — but the driver is committed as the runner and `01-knowledge.md:682`'s `al(h,pad($spacing.sm)) after(#logo) …` has no `s()` at all.

A second path reaches the same crash one line earlier, at `driver.txt:36` (`const s = out.source;`): the driver's selector is `isAl = /(^|[\s,(])al\(/` (`:20`) while `args()`'s gate is `isBoundary` — space, tab, comma, `(` only (`layout-branch.txt:46`). Regex `\s` is wider. Observed on a line whose `al(` is preceded by a vertical tab: `isAl` → `true`, `args(line,"al")` → `null`, `toStack` → `null`, and `out.source` throws. The two whitespace vocabularies should be one.

**Fix.** `if (!out) { console.log("  (skipped — al( not on a boundary)"); continue; }` after `toStack(l)`, and `out.layout.size ? … : "(no s())"` at `:69`.

### F9 (Low) — `split()` drops a trailing empty argument

`layout-branch.txt:80` — `if (cur) out.push(cur)`. Observed: `split("a,b,")` → `["a","b"]`, where native `"a,b,".split(",")` gives `["a","b",""]`. A trailing empty segment is treated as nothing to push, so an `al()` or `pad()` argument list ending in a comma silently loses its last (empty) slot and the arity check that C4 protects reads one short.

Not fixture-triggered — no argument list in either fixture ends in a comma, and C4's test line does not either, so nothing exercises it. It is a genuine deviation from the header's "Split on TOP-LEVEL commas only" (`:70`).

**Fix.** A "Not done" note is enough for a spike, matching how the document already handles the 1-value pad uncertainty. `if (cur !== "" || out.length) out.push(cur)` if you would rather close it.

### F10 (Low) — `expandPad`'s throw is the only error in the module that cannot name its input

`layout-branch.txt:183` — every other throw in the file carries `line.trim()` or `src.trim()`; `expandPad` receives only the mapped array, so it cannot. Reachable: `pad()` with no arguments gives `args(line,"pad")` → `""`, `split("")` → `[]`, and `[]` is truthy, so `toStack`'s `if (padSrc)` (`:233`) is entered and `expandPad([])` throws `pad() with 0 values — 1, 2 or 4 expected` (observed) naming no line and no node. CLAUDE.md §Ground rules: *"throw plain `Error`s whose message names the offending path"*.

**Fix.** Rethrow with line context at the `toStack` call site, or pass the line into `expandPad`.

### N1 (note, not a finding) — the read-path finding has a second consequence worth one line

`03-blueprint.txt:2` — the instance root the README quotes to show the missing `al()` — **also carries `s(360,hug)`**. The branch never sees it, because `isAl` filters the line out. So a converter that reads only the expanded instance loses the root's layout intent *and* never learns the `literal-size` case exists at all: it would report **zero** drops on a design that has two. That is a sharper argument for "the converter's input is a pair, not a file" than the one the README makes, and it is free — the evidence is already in the document.

Separately, "the master's two **component roots**" (`README.md:26`, `:151`) is loose: master `:2` is the component-set frame (`fr comp axes[state[active,away]]`) and `:3`/`:11` are its two **variant** frames (`variant(state(active))` / `variant(state(away))`). The fence still holds and the document already routes the real question to #301's prop set — but a variant frame is exactly the auto-layout container `stack` models, so the wording undersells the open question rather than settling it.

## Validation

| gate | command | result |
|---|---|---|
| build checks | `node tooling/build-checks.mjs` | **exit 0**, all groups ✓ (observed) |
| drift check | `node tooling/drift-check.mjs` | **`drift-check ✓`**, exit 0 (observed) |
| token lint | `node tooling/token-lint.mjs` | **`63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`** (observed) |
| portal smoke | `PORT=47321 node portal/server.mjs` → `/api/health` | **`{"ok":true,…,"stale":false}`** (observed; port-scoped kill) |
| diff scope | `git diff 2e6aabd..HEAD -- system/ agent-layer/ tooling/ handoff/` | **empty** (observed) — the PR body's claim holds |

The first four are green **and out of reach of this ticket** — it touches no `system/` file, no shipped page, no generated artifact. Read them as "no regression elsewhere", never as evidence about the spike. The journey drivers and the pixel gate were correctly not run for the same reason (`.claude/references/gates.md`).

## The numbers pass — what I re-derived

Every headline figure holds (observed, re-derived without the branch):

| figure | how I checked | result |
|---|---|---|
| instance `7 values / 5 mapped / 2 unmapped` | `grep -o '\$spacing\.[a-z]*' \| sort \| uniq -c` | `none 2 · sm 2 · xs 3` = 7 ✓ |
| master `24 / 20 / 4` | same | `md 6 · none 4 · sm 8 · xs 6` = 24 ✓ |
| `al()` nodes 2 / 6 | `grep -cE '(^\|[[:space:],(])al\('` | 2 / 6 ✓ |
| **is the grep genuinely comparable?** | re-ran it **scoped to al-lines only**, and grepped for `$spacing.` on non-al lines | identical counts; **zero** `$spacing.` outside an al-line in either fixture — so the agreement is not two errors cancelling ✓ |
| +4px on `$spacing.md` only | fixture `g(12:$spacing.md)` vs `tokens.contract.css:57` `--spacing-md: 16px` | +4 ✓; `xs` 4→4, `sm` 8→8 exact ✓ |
| 6 of 20 master values shift, 0 of 5 instance | md count 6; instance carries no md | ✓ |
| 12 equidistant from sm(8) and md(16) | arithmetic | ✓ |
| `--spacing-none` / `--radius-full` absent | `grep -rn` over `system/ agent-layer/ handoff/` | no matches ✓ |
| contract scale, radius scale | `tokens.contract.css:55-62`, `:65-67` | verbatim ✓ |
| `hug:100` 3 / 6; `grep 'al(' \| grep -c 'hug:'` → 0 | re-run | ✓ |

**Scope caveat on the cross-check** (worth one sentence in the README): the grep agreement validates **arity** — that the parser found every source atom and no extras. A parser that found all 24 and mis-slotted them passes it identically. Slot assignment is carried by the `04-htmlflex.html` cross-read, not by this.

**The committed `raw/` files reproduce byte-identically.** I copied `layout-branch.txt` and `driver.txt` out of the repo unchanged, ran them over both fixtures and with `--controls`, and diffed against the committed output: `raw/instance.txt` and `raw/master.txt` are **identical**, and `raw/controls.txt` half 1 is identical past the 5-line section banner the author added by hand (observed). They are verbatim stdout, as claimed — not prose shaped like output.

**Controls.** All six observed red under their **own** named case in `raw/controls.txt` (`:32 :47 :62 :77 :92 :107`), restored pristine at `:115`; collateral counts match the README exactly (C3→2, C4→2, C5→4). The harness's own no-op guard is real, not vacuous — `raw/mutations.source.txt:98` does contain the `MUTATION DID NOT APPLY` branch, so `grep -c → 0` is a check that **can** fail.

**Citations.** Every one I followed resolves: `architecture.md:306-308` (the decision rule verbatim), `:159-160` (E1's three classes), `:165-169` (the IR), `prd.md:119` (Q2b closed, owner, 2026-08-28), `design-import-spike-c/README.md:13` and `:92`, `drift-check.mjs:31-38`, `02-fixture.dsl.txt:5/:7/:10`, `03-blueprint.txt:2` (the root line, verbatim, `al()`-less), master `:3`/`:11`, `spike-c-sdk-reach.mjs` tracked, `import/` absent.

**The three absences read, not grepped** — `04-htmlflex.html:3` carries `gap: 12px; padding: 8px 12px 8px 12px; align-items: center` and **no `justify-content`**; `:5` carries `flex: 1 0 0; …; gap: 4px` and **no `padding`**; `:9` carries `padding: 4px 8px 4px 8px; justify-content: center; align-items: center` and **no `gap`**. All three confirmed.

**The PR body is clean.** I walked every figure in it separately — the most-read surface and the only one not in the working tree. All of them re-derive, and neither F1's gap nor F2's false sentence reaches it, and F6's wrong count does not either (the body states the boundary test's reason without a count). F4 is the one finding whose text is in the body.

## What is good

- **The honest branch was taken where the easier one was arguable.** Leg 1 was reachable on a narrow reading and the document refuses it, then refuses to inherit leg 1's free "Q2b stays closed" and states it instead. F1 shows leg 2 is even better founded than the argument given.
- **The T3 condition is the most useful thing in the PR.** *"`ds-stack`'s `components.css` block must declare no default `gap` and no default `padding`"* is a tripwire #301 can act on and can violate visibly — strictly better than the bare "lossless" leg 1 would have produced, and it names the exact shape of a green check that cannot fail.
- **The control battery is real.** C2 is a genuinely discriminating check: under its mutation the IR is byte-identical to the correct output and only the drop record separates them (`raw/controls.txt:47`). C5's collateral — by-value snapping inventing 4px where the designer set zero, reporting 0 drops — is the strongest single piece of evidence in the document, and it came out of a mutation rather than an assertion.
- **The read-path finding for #304 is load-bearing and correctly scoped** — quantified (`$spacing.md` 0× instance / 6× master), cross-confirmed against `04-htmlflex.html`, and framed as narrowing spike C's Q2 on one axis rather than reversing it.
- **Adjacent observations are fenced** as explicitly not verdict inputs, with `s(360,hug)` deliberately excluded from the fence and routed to the verdict instead.
- **Standards:** plain JS, plain `Error`s naming the offending input, no deps, nothing under `system/`/`tooling/`/`agent-layer/`/`handoff/` touched, `.txt` parking justified rather than assumed, plan + report + (now) review in the same PR.

## Second pass — the `code-reviewer` agent, and where we disagree

I dispatched the `code-reviewer` agent as a genuinely independent pass. It reproduced the byte-identity result separately, and went further than I did in one respect worth recording: it wrote its **own 11-mutation battery attacking different code paths than `raw/mutations.source.txt`** (`mapSpacing`'s hit side rather than the caller's drop-recording call; `toStack`'s recording layer rather than `parseSize`'s parsing layer; a `toAlign` hardcode rather than a value-search), and **every one of C1–C6 and PC1–PC5 still went red on its own named case**. That is much stronger evidence that the battery is real than the author's own harness could give.

It independently found F5, F6 and F7, and contributed F8, F9 and F10, all three of which I verified myself before folding them in (the `.vd-stack` line is **2439**, not 2436).

**Where we disagree.** It concluded *"Ready to commit — 0 Critical, 0 High"*. I do not, and the difference is what each pass looked at: it verified what the parser **computes** against the two fixtures, exhaustively and well. It did not probe an unrecognised `al()` argument (F1), read the emitted IR back against the README's "never emits a literal" sentence (F2), or open `01-knowledge.md` to test the "carries no reference" claim (F3). Each of those is a direct observation, not a judgement call, and each falsifies a sentence in the document that is the deliverable. Its own summary concedes the shape of the gap — *"not defects in what the parser actually computed against the two real fixtures it was run against"* — which is exactly right, and exactly why it is not the whole bar for a spike whose output is a promise to two future tickets.

## Recommendation

**Request changes** — F1 blocking, then F2 and F4.

F1 is a real code change (~3 lines + one control + one README row). F2 is two sentences. F4 is a PR-body edit or one new issue. F3, F5–F10 are one-line notes or one-line guards, cheap enough to fold into the same pass; F8 in particular is one sentence that saves #301 a landmine. **None of them touches the verdict, the branch taken, or the condition handed to #301** — the spike's conclusion survives review intact; it is the artefact #304 inherits that needs the work.

Suggested order: F1 first (it is the only one with a control to write). Then F2's two sentences, F3's Not-done bullet, F8's one sentence beside the T3 condition, F6's four counts, F5's one row, then F7/F9/F10 as Not-done notes or one-line guards. F4 last — it is the owner's call.
