# CodeQL baseline remediation — report (#395)

Branch `feature/codeql-baseline-remediation`, off `main` at 73c49dd (the commit whose
push-to-main scan seeded the Security tab on 2026-09-11 at 09:46).

## Why this was urgent

`.github/workflows/verify.yml`'s `codeql` gate queries
`/code-scanning/alerts?ref=refs/pull/N/merge&state=open` and fails on ANY open alert whose
`rule.security_severity_level` is high or critical. **There is no baseline delta.** The 14 alerts
#387's own merge seeded onto main would therefore have failed the gate on the next PR, and
`gates-green` requires `codeql`, so that PR could not have merged.

CLAUDE.md §Ground rules describes this gate as blocking "on a NEW high or critical alert". The
implementation blocks on any open one. Once this lands the distinction stops mattering for today's
14 — but it will matter again the first time a genuine false positive appears in a PR that
introduced nothing. **Owner's call, 2026-09-11: the gate is right, the doc was wrong.** CLAUDE.md's §Testing line now
says ANY open high or critical alert, and `.claude/references/gates.md` carries the no-baseline-delta
property as a cannot-reach beside the `strict: false` one.

## Policy this work obeyed

Issue #388 forbids the cheap route: no inline `// codeql[rule-id]` suppressions, no dismissing
alerts in the Security tab, no `paths`/`paths-ignore` edits to make a finding disappear. So all 14
are fixed in code. Nothing was dismissed.

## Verification

The check that cannot fail here is CodeQL itself, so it was run locally rather than round-tripped
through CI: bundle `codeql-bundle-v2.27.0`, `database create --codescanning-config` pointed at the
repo's own `.github/codeql/codeql-config.yml`, then `database analyze codeql/javascript-queries`.

The baseline run reproduced GitHub's 14 alerts EXACTLY — same rules, same paths, same line numbers.
That is what licenses the after-number below; a local harness that did not reproduce the baseline
would have proved nothing.

```
BEFORE  total 14   high/critical 14
AFTER   total  0   high/critical  0
NEW results of ANY severity introduced by the patches: 0
```

Repo gates, all on the patched tree:

```
node tooling/build-checks.mjs   build ✓  all 34 groups pass
node tooling/drift-check.mjs    drift-check ✓  13 checks   (STAGED — see below)
node tooling/token-lint.mjs     token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan
portal smoke (private port)     /api/health → {"ok":true,...}
node --check                    10/10 edited files
```

`drift-check` was run twice on purpose. The first run, on an UNSTAGED tree, passed — falsely:
`gen-loc-summary` reads git-TRACKED content, so a `--check` before `git add` cannot see edits to
tracked files. Staged, it went red on `system/loc-summary.json`. Regenerated: only the
`generators` group moved (2600 → 2700 lines). `approach.html:272` reads
`groups.find(g => g.id === "runtime")` and nothing else, and `runtime` is unchanged at 77 files /
30600 lines — so the two approach visual-regression baselines are NOT invalidated and no baseline
regen is owed. The grand total (114 files / 38500) did not move either.

### Runtime proof for the four view-time and driver edits

Static checks cannot see a wrong selector, a TDZ error or an auto-wait that never resolves, so
every edited surface with a driver was actually run, three engines each:

```
tooling/catalog-journey.mjs  all   ✓  32 passed × chromium · firefox · webkit
                                      — including case [7], the restructured assertion itself
tooling/build-journey.mjs    all   ✓  157 passed × 3 engines    (dock.mjs)
tooling/instance-journey.mjs all   ✓  25 passed × 3 engines
                                      — builds a real instance, so build-instance.mjs's own
                                        validator (the #6 edit) ran as part of it
```

`system/instance-pack.mjs` carried the only real restructure risk (an allowlist that now selects a
literal href, with two new `const`s hoisted above a function declaration). Its single call site is
inside a `change` handler, so there is no TDZ path — and it was driven directly against the BUILT
instance dir in all three engines: both picks re-point the one pack `<link>` to their own slug, and
four junk radio values (`"../../evil"`, `"contract"`, `""`, `"neutral.css"`) are each refused with
the href unchanged. Zero page or console errors.

## The 14, and what each one actually was

### Genuinely exploitable — fixed at the defect

**#9 `js/incomplete-sanitization` · `discovery/prd-projection.mjs` `cell()`** — a Markdown
table-cell breakout. `a\|b` became `a\\|b`; CommonMark reads `\\` as an escaped backslash, so the
`|` behind it is a live delimiter and GFM drops the excess cells. An agent-authored evidence URL
carrying `\|` could push a column off the Evidence row and take the page's own provenance claim
with it, silently. Fixed by escaping the backslash FIRST. Order is the whole of it.

**#3 `js/redos` · `discovery/prd-projection.mjs` `blockquote()`** — `/(?:\r\n|\r|\n)+$/` reads the
CRLF pair two ways, under a `+`. Measured, not inferred:

```
24 CRLF pairs (a 49-CHARACTER string) → 788 ms      ~30 pairs ≈ 25 s     ~40 pairs ≈ 7 h
```

A 61-character answer hangs the projection. Human/LLM answer text reaches this function directly.
The regex is gone entirely — a trailing run of line endings is exactly a run of empty fields in the
split the function already performs, so they are popped. A character class would only have traded
exponential for quadratic: the same hang, further out.

**#7 `js/bad-tag-filter` · `portal/lib/intake.mjs` `htmlToText()`** — the one function in the repo
that parses a REMOTE page (a fetched job posting). `</script>` with no tolerance for `</script >`
meant script bodies leaked into `jdText`:

```
input:  <p>real</p><script >alert(1); var leak="SECRET"</script ><p>more</p>
before: "real alert(1); var leak=\"SECRET\" more"
after:  "real more"
```

**#13 `js/incomplete-multi-character-sanitization` · `agent-layer/lib.mjs` + `inject-jsonld.mjs`** —
`stripTags`' output lands inside a `<script type="application/ld+json">` block, and `JSON.stringify`
does not escape `<`, so a surviving `</script` would close the block early. Fixed at BOTH ends: the
strip's closing `>` is now optional and runs to a fixed point, and the JSON-LD sink escapes `<` to
its six-character JSON escape `\u003c`. Trusted input today (the repo's own committed HTML), so
unexploitable in practice — but the sink was genuinely unguarded.

### Checks that could not fail — fixed because a green check that measures nothing is worse than a red one

**#8 `build-checks.mjs`, #6 `build-instance.mjs`** — same `</script >` family. Both strip scripts and
styles before asserting no "demo"/"fictional" text survives in a stamped shell. A `>`-only end tag
skips PAST a tolerant one to the next clean tag, swallowing every word in between — so the assertion
could not fail. Same defect class as the #137 family already recorded in this repo.

**#5 `build-checks.mjs:8046`** — four separate `includes` on one rendered row. The parts stay true
while the composition breaks: one newline between seq and provenance left all four green. Pinned as
one whole row, which is strictly stronger and incidentally stops being a substring test on a URL.

**#12, #11 `build-checks.mjs`** — the two DELIBERATE hand-mirrors of `cell()`. Their own comments say
the duplication exists so the assertion side cannot inherit the module's bug. They inherited it
anyway. Both now mirror the full escape set; had they not been updated alongside #9, `present()`
would have built a match set the page never contains and every `!present` absence assertion would
have passed blind.

**#10 `build-checks.mjs:2303`** — `selector.replace(/[.]/g, "\\.")` escaping a CSS class for a
RegExp. A full regex-literal escape now. Behaviour unchanged (the dot is the only metacharacter the
three families carry), but the incomplete form is the classic bug.

### Analyser-legible restructures — no security change, and the comments say so

**#15 `system/instance-pack.mjs`, #14 `system/dock.mjs`** — both already had hard allowlists;
CodeQL cannot read `!==`-against-a-variable as a barrier. Neither is an HTML sink (worst case was a
same-origin CSS 404). The allowlist now SELECTS a literal href rather than gating a slug that then
builds one, so the guard and the href are one condition instead of two — which is a real
robustness gain against a future edit loosening one without the other.

**#16 `tooling/catalog-journey.mjs`, #4 `tooling/live-metric-audit.mjs`** — operator-run drivers, no
trust boundary. #16's markup now leaves the page and returns as an `evaluate` argument; the string
is unchanged and deliberately unsanitised, because the property under test is that the tab's EXACT
serialized markup renders. Its comment states plainly that this is a restructure, not a hardening.
#4 parses the URL and matches apex OR subdomain — the audit's fail-loud direction is preserved
(`static.cloudflareinsights.com` for the script, the apex for `/cdn-cgi/rum`); narrowing it to the
apex alone would have blinded half of it.

## Regression evidence for the three riskiest edits

- `blockquote()` — 2809 exhaustive fuzz cases over a line-ending alphabet against the old
  implementation, plus 8 non-string inputs: **0 mismatches**. 100,000 CRLF pairs now cost 10.8 ms.
- `cell()` — regenerating all 7 committed packages changes exactly **one file**,
  `discovery/graded-opus-a/prd.md`, on **9 lines**, every one a pure backslash doubling, all 9
  rendering identically under CommonMark. Line count unchanged. `proposals.md` byte-identical.
- `stripTags()` — all 7 real page titles identical. Two whole-document divergences exist but sit
  inside inline `<script>` JS, which no caller strips: `titleOf` takes a `<title>` capture,
  `gen-llms` a `<b>` capture.

## One adversarial catch worth recording

The first-pass fix for the JSON-LD sink was written as `replace(/</g, "\u003c")` with a SINGLE
backslash — which in JavaScript source is just the character `<`, so the call replaces `<` with `<`
and does nothing. For today's benign data it emits byte-identical output, so no gate in this repo
would have caught it. The escape must be written with a DOUBLE backslash in source. Verified:
`contains </script : false`, round-trips true. The comment on that line now says so, because the
next person to read it is the one at risk.

## Not fixed here, deliberately

`discovery/graded-opus-a/transcript.jsonl` stores its £ signs and em dashes double-escaped, so a `£`
renders on that PRD's page as the literal six characters `\u00a3`, and an em dash as `\u2014`.
That is a real-run content defect,
not a projection bug — the honesty contract says a bad run is re-run, never hand-edited. Flagged,
untouched, and it is the only reason `cell()`'s fix churns any bytes at all.
