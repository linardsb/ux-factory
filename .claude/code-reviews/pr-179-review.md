# PR #179 review — spring easing sweep + @starting-style entrances (#165)

**Verdict: APPROVE** (posted as comment — solo repo, self-approval not available). One Medium worth fixing before or immediately after merge; three Lows at the author's discretion. No Critical/High.

Reviewed fresh-context via the code-reviewer agent at head `7f414a6` in the `ux-factory-wt-165` worktree; every changed source file read in full, key findings independently re-verified.

## Validation

| Check | Result |
|---|---|
| Generators re-run (token-css · loc-summary · system-graph · handoff · vocabulary) | zero drift; system-graph reproduces `64 tokens · 29 consumers · 330 edges` byte-for-byte |
| `node tooling/build-checks.mjs` | 10/10 groups green |
| CI `verify` + `visual` at head | both green; zero baseline files in the diff (AC #1 arbiter holds) |
| Deleted `dock-panel-in` keyframe | no remaining references |
| Keep-rail attribute selectors vs `build-keep.mjs:187-190` | exact match; no `display` leg, so the #138 `[hidden]` guard keeps exits instant |

All five deviations in `.claude/reports/spring-motion-foundation-165-report.md` are documented and sound — none flagged as issues.

## Issues

### Medium

**1. Dock panel's new 200ms exit window has no `pointer-events` guard — `system/portfolio.css:924-950`.**
Before this PR, removing `.is-open` hit `display:none` immediately. With `display … allow-discrete` in the transition list, the panel stays a laid-out `position:fixed` box (up to 340px wide, near-full viewport tall, `z-index:95`, containing focusable controls) for the full `--motion-base` while it fades at `opacity→0`. Clicks landing in that region during the ~200ms after close hit the invisible panel instead of the page — a small interaction regression vs the instant close it replaces, present exactly on the modern-browser path the PR adds. Focus is fine (`dock.mjs:436-438` refocuses the toggle synchronously); this is pointer-only.
Fix (2 lines; `pointer-events` isn't in the transition list so it flips instantly, giving the right asymmetry):
```css
.dock-panel { pointer-events: none; }
.dock-panel.is-open { pointer-events: auto; }
```

### Low

**2. `.dock-restore-row` entrance comment names one of its two triggers — `system/portfolio.css:1004-1017`.** `@starting-style` also fires when the row first renders via the panel's own `display` flip (a visitor whose record row is already un-hidden before first open), stacking the row's settle on the panel's spring entrance. Plausibly fine visually — but correct the comment or accept the double trigger explicitly.

**3. Purpose-named duration tokens reused outside their documented purpose.** `--motion-icon-morph` ("appearance-control toggle glyph morph") now also drives `.lp-faq .faq-mark` (`components.css:900`) and `.cs-acc .mark` (`portfolio.css:449`); `--motion-tab-glide` ("evidence-viewer tab pill glide") now drives `.ot-notes` (`proto.css:255`), a bottom sheet. Semantically near — but either pick the token whose doc already matches (`--motion-base` for `.ot-notes`; `--motion-bounce` for the marks) or widen the `tokens.source.json` comments (which then needs gen-token-css + gen-handoff re-run).

**4. `.ot-btn` press duration doubled, not just eased — `system/proto.css:387-390`.** `transform 0.08s ease` → `transform var(--motion-fast)` (160ms) + bounce. If "tokenize the touched literals" meant nearest-token substitution, this is a felt-behavior change beyond it. One-line confirmation that the slower, springier press was intended is enough.

## Done well

- **Token discipline is clean** — no new literals anywhere; `proto.css` retires five magic numbers to tokens beyond the minimum ask.
- **I7 deviation reasoned correctly** — only the redundant transition override removed; the 6px hover-distance override correctly identified as still load-bearing and kept.
- **Keep-rail entrance verified against the real toggle code**, not assumed — selectors match `build-keep.mjs` exactly, and omitting the `display` leg deliberately sidesteps the known `hidden`-vs-`display` trap.
- **`@starting-style` degradation checked and honest** — unknown `transition-behavior: allow-discrete` invalidates the whole transition declaration, so older engines fall back to instant open/close, exactly as the in-code comment and PR body claim.
- **Reduced-motion genuinely closed** — global kill-switch covers IA + /build including the new inline block; `proto.css`'s scoped reduce block lists all five touched selectors.

## Recommendation

Approve. Fix the Medium (`pointer-events` pair) in this PR — it's two lines and squarely inside the ticket's "zero regression" spirit; the three Lows can ride or be deferred to the epic's next tickets as the author prefers.
