// system/derive.rules.mjs — the derivation ruleset, v1.1.0 (view-time canon, this repo).
// THE versioned artifact behind the derivation engine (docs/epics/
// ai-first-ux-factory.architecture.md §Data model "Derivation rules"; epic #1, ticket #3):
// every rule the engine applies lives here as inspectable, annotated data — the engine
// (derive.mjs) is just the machinery that executes it. Tuning any value below is a
// version bump; readers judging the system should judge THIS file.
//
// Hooked-framework grounding (reward types, frequency filter, Manipulation Matrix):
// __UX_UI_Research.md §Layer B. WCAG thresholds: SC 1.4.3 (AA text 4.5:1) and
// SC 1.4.11 (AA non-text UI 3:1).

// The artifact is frozen all the way down: view-time code can read it, never bend it.
const freeze = (o) => {
  for (const v of Object.values(o)) if (v && typeof v === "object") freeze(v);
  return Object.freeze(o);
};

export const RULESET = freeze({
  version: "1.2.0", // 1.2.0: color-accent-on-inverse added — accent-on-dark now a checked pair (issue #17)

  /* ------------------------------------------------------------------ palette
   * All targets are OKLCH: l = lightness [0,1], cMax = chroma ceiling, hue is
   * always the brand's. The recipe tints every neutral with the brand hue at
   * near-zero chroma (warm brands get warm greys) — chroma ceilings keep the
   * tint subliminal and the WCAG math stable across hues.
   *
   * Lightness targets are chosen so the declared wcagPairs below pass BY
   * CONSTRUCTION for near-achromatic values (for greys, WCAG luminance
   * Y ≈ l³, so each bound converts to a contrast bound):
   *   fg        l 0.26 → Y≈0.018 → ≥14:1 on white
   *   fg-muted  l 0.51 → Y≈0.133 → ≈5.7:1 on white, ≈5.2:1 on the surface
   *             (l 0.55 would fail 4.5:1 on the surface — measured, not guessed)
   *   surface   l 0.97 → Y≈0.913 → keeps muted text and accent readable on cards
   * What the ceilings can't guarantee across hues, the spike measures
   * (tooling/spike-palette.mjs).
   */
  palette: {
    accent: {
      // Brand-preservation bounds: how far from the brand's own lightness the
      // engine may sit before negotiation starts. Very light / very dark brands
      // are pulled into usable range (and the adjustment is reported in notes).
      lightnessClamp: [0.35, 0.60],
      // Accessibility negotiation: after clamping, darken in 0.01 steps until
      // the accent reads AA as TEXT against the derived card surface
      // (contrast ≥ 4.5 vs color-bg-surface). Because the surface is lighter
      // than the page ground, this single condition also guarantees
      // accent-on-white AND white-on-accent at ≥ 4.5 — three pairs, one rule.
      // minL is the hard floor; hitting it means the check fails honestly.
      contrastFloor: { against: "color-bg-surface", min: 4.5, step: 0.01, minL: 0.30 },
      hoverDeltaL: -0.06,   // matches the neutral pack's #2563eb → #1d4ed8 step
      activeDeltaL: -0.11,  //                    … and → #1e40af
      stepFloorL: 0.15,     // hover/active never go fully black
      // accent-fg: white wherever white clears AA on the accent fill (the
      // negotiation above makes that the normal case); otherwise the derived fg.
      fgContrastMin: 4.5,
      // on-inverse accent: accent used as TEXT on the derived dark ground (dark-footer
      // link hovers, the feature-band numeral — issue #17). LIGHTEN from the negotiated
      // accent in 0.01 steps until ≥ 4.5:1 vs the derived bg-inverse. maxL is a loop
      // guard only: as l → 1 the gamut forces chroma → 0 (→ white, ~14:1 on any derived
      // inverse ground), so convergence is guaranteed well before it.
      onInverse: { against: "color-bg-inverse", min: 4.5, step: 0.01, maxL: 0.98 },
      secondary: { l: 0.55, cMax: 0.05 }, // quiet accent — live dots, and .lp-local link text (checked at 4.5)
    },
    neutrals: {
      fg:        { l: 0.26,  cMax: 0.015 },
      fgMuted:   { l: 0.51,  cMax: 0.02  },
      bg:        "#ffffff", // the page ground stays paper-white; tinted grounds read as dirty
      bgSurface: { l: 0.97,  cMax: 0.006 },
      border:    { l: 0.87,  cMax: 0.01  },
      // border-strong = the derived fg (same convention as the neutral pack)
      white:     "#ffffff",
    },
    inverse: {
      bgInverse:         { l: 0.24, cMax: 0.02  },
      fgOnInverse:       { l: 0.95, cMax: 0.005 },
      fgOnInverseStrong: "#ffffff",
    },
  },

  /* ------------------------------------------------------------------- scales
   * Spacing is an explicit per-density table (xs sm md lg xl 2xl 3xl 4xl):
   * a multiplier formula breaks the 4px grid, a table can't — integrity over
   * cleverness. Type is the opposite call: a ratio-driven modular scale is the
   * concept worth demonstrating, so the ramp is COMPUTED from bodyPx × ratio^exp
   * (typeSteps below). Steps with a `vw` slope emit a responsive
   * clamp(min, vw, max) with min = round(max × minRatio) — the same shape the
   * neutral pack uses; the rest emit plain px.
   */
  scales: {
    compact:     { bodyPx: 15, ratio: 1.2,   gutter: "20px", spacing: [4, 8, 12, 16, 24, 32, 48, 64] },
    comfortable: { bodyPx: 16, ratio: 1.25,  gutter: "24px", spacing: [4, 8, 16, 24, 32, 48, 64, 96] },
    spacious:    { bodyPx: 17, ratio: 1.333, gutter: "28px", spacing: [4, 12, 20, 32, 40, 64, 80, 128] },
  },
  typeSteps: {
    // exp: position on the modular scale (body = 0). At comfortable
    // (16 × 1.25^exp) this yields 76/49/31/20/18/16/13/12 — deliberately close
    // to the hand-set neutral ramp, derived instead of asserted.
    "type-display": { exp: 7,     vw: 6,   minRatio: 0.53 },
    "type-h1":      { exp: 5,     vw: 4,   minRatio: 0.57 },
    "type-h2":      { exp: 3,     vw: 2.5, minRatio: 0.7  },
    "type-h3":      { exp: 1 },
    "type-lead":    { exp: 0.5,   vw: 1.5, minRatio: 0.8  },
    "type-body":    { exp: 0 },
    "type-caption": { exp: -1 },
    "type-eyebrow": { exp: -1.25 },
  },

  /* ----------------------------------------------------------------- patterns
   * Hooked variable-reward type → component patterns, selected from the REAL
   * library (every class below is styled by the shipped stylesheets —
   * components.css, or portfolio.css for .card-kicker). Patterns
   * flagged habitMechanic are return-visit machinery: when the frequency
   * filter (ethics below) fails, the engine keeps them visible but tags them
   * gatedBy: "frequency-filter" — the gate is shown working, not hiding rejects.
   */
  patterns: {
    tribe: [
      { id: "social-proof-band", name: "Social-proof band", components: [".feature-band", ".feature-item"],
        why: "Tribe rewards are social — evidence of other people wins the section.", habitMechanic: false },
      { id: "activity-cards", name: "Live activity cards", components: [".card", ".meta-row", ".pill", ".stamp"],
        why: "Recent-activity surfaces cue the social loop (who did what, just now).", habitMechanic: true },
    ],
    hunt: [
      { id: "library-grid", name: "Browseable library grid", components: [".grid.grid-3", ".card", ".card-kicker"],
        why: "Hunt rewards are found, not given — a scannable grid rewards the search.", habitMechanic: false },
      { id: "numbered-lineup", name: "Numbered lineup", components: [".lineup", ".lineup-item", ".lineup-n"],
        why: "An ordered trail gives the hunt a path and a visible end.", habitMechanic: false },
      { id: "section-index", name: "Section index labels", components: [".section-label"],
        why: "Wayfinding keeps the forager oriented mid-hunt.", habitMechanic: false },
    ],
    self: [
      { id: "progress-stats", name: "Progress stats", components: [".hero-stat", ".meta-row", ".meta-cell"],
        why: "Self rewards are mastery made visible — numbers that move.", habitMechanic: true },
      { id: "decision-checklist", name: "Decision checklist", components: [".decision-card", ".dc-field"],
        why: "Completion surfaces (checked-off decisions) pay the competence reward.", habitMechanic: false },
    ],
  },

  /* ------------------------------------------------------------------- ethics
   * The Hooked frequency filter: habit design is only legitimate for behaviors
   * frequent enough to become habits (weekly or better). Below that, the honest
   * verdict is "utility" — get in, do the job, leave; optimising for return
   * frequency would make the product worse (__UX_UI_Research.md §Layer B).
   * The Manipulation Matrix quadrant is computed when the two matrix answers
   * are provided (improves the user's life? / would the maker use it?).
   */
  ethics: {
    frequencyFilter: { "multiple-daily": true, daily: true, weekly: true, monthly: false, rarely: false },
    verdicts: {
      pass: "Habit-forming candidate — the behavior is frequent enough for Hook design to be legitimate.",
      fail: "Utility — design for get in, do the job, leave. Habit mechanics rejected by the frequency filter.",
    },
    // matrix[improvesLives][wouldUseIt] — Nir Eyal's quadrant names.
    matrix: {
      true:  { true: "facilitator", false: "peddler" },
      false: { true: "entertainer", false: "dealer" },
    },
  },

  /* ---------------------------------------------------------------- wcagPairs
   * "All token pairs" for the engine and the spike = THIS list, each with its
   * AA threshold (4.5 text · 3.0 non-text UI). Deliberate exclusions, so the
   * list stays honest rather than impressive:
   *   - color-border on bg: decorative hairlines, not identification-bearing UI
   *     (SC 1.4.11 does not apply).
   *   - the five color-mix() inverse tokens: relative values resolved by the
   *     browser at paint time; a JS checker would need a backdrop assumption.
   * Accent on bg-inverse is no longer an exclusion. A single accent token
   * cannot mathematically read as AA text on BOTH white and near-black
   * grounds (it would need luminance ≤ 0.183 and ≥ 0.141 at once — a ~2-point
   * lightness window no brand hue survives) — which is exactly why a separate
   * on-dark variant exists: color-accent-on-inverse (v1.2.0, resolves issue
   * #17) is derived by lightening the negotiated accent until it reads AA on
   * the derived bg-inverse (§palette.accent.onInverse) and is checked below
   * as a first-class pair. Interactive accent-on-dark states were already
   * retokenized to checked tokens in the PR #15 review pass; the decorative
   * uses (dark-footer link hovers, the feature-band numeral) now render this
   * checked token.
   */
  wcagPairs: [
    { fg: "color-fg",                   bg: "color-bg",         min: 4.5, usage: "body text on the page ground" },
    { fg: "color-fg-muted",             bg: "color-bg",         min: 4.5, usage: "secondary text on the page ground" },
    { fg: "color-fg",                   bg: "color-bg-surface", min: 4.5, usage: "body text on cards / alt sections" },
    { fg: "color-fg-muted",             bg: "color-bg-surface", min: 4.5, usage: "captions on cards" },
    { fg: "color-accent-fg",            bg: "color-accent",     min: 4.5, usage: "button label on an accent fill" },
    { fg: "color-accent",               bg: "color-bg",         min: 4.5, usage: "accent text / links (.amber) on the page ground" },
    { fg: "color-accent",               bg: "color-bg-surface", min: 4.5, usage: "accent text on cards" },
    { fg: "color-fg-on-inverse",        bg: "color-bg-inverse", min: 4.5, usage: "chrome text on dark sections" },
    { fg: "color-fg-on-inverse-strong", bg: "color-bg-inverse", min: 4.5, usage: "high-contrast text on dark" },
    { fg: "color-accent-on-inverse",    bg: "color-bg-inverse", min: 4.5, usage: "accent text on dark sections (footer link hovers, feature-band numeral)" },
    { fg: "color-accent-secondary",     bg: "color-bg",         min: 4.5, usage: "quiet accent — live dots, and link text (.lp-local)" },
    { fg: "color-border-strong",        bg: "color-bg",         min: 3.0, usage: "non-text: emphasis borders (SC 1.4.11)" },
  ],

  /* ------------------------------------------------------------------ statics
   * Contract tokens the four intake axes do not steer (v1): fonts are a brand-
   * pack concern (the engine stays honest about its scope), radius/shadows are
   * neutral defaults, and the five inverse mix tokens are emitted VERBATIM from
   * the contract — they are relative by design, deriving in CSS at paint time
   * from the bases the engine emits.
   */
  statics: {
    fonts: {
      "font-display": 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      "font-body":    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    radius: { "radius-sm": "4px", "radius-md": "8px", "radius-lg": "16px" },
    shadows: {
      "shadow-sm": "0 1px 2px rgba(0, 0, 0, 0.06)",
      "shadow-md": "0 4px 6px rgba(0, 0, 0, 0.08)",
      "shadow-lg": "0 10px 15px rgba(0, 0, 0, 0.10)",
    },
    maxw: "1200px",
    inverseMixes: {
      "color-fg-on-inverse-muted": "color-mix(in srgb, var(--color-fg-on-inverse) 50%, transparent)",
      "color-fg-on-inverse-soft":  "color-mix(in srgb, var(--color-fg-on-inverse) 82%, transparent)",
      "color-inverse-line":        "color-mix(in srgb, var(--color-fg-on-inverse) 12%, transparent)",
      "color-inverse-wash":        "color-mix(in srgb, var(--color-fg-on-inverse) 6%, transparent)",
      "color-on-dark-border":      "color-mix(in srgb, var(--color-white) 50%, transparent)",
    },
  },
});
