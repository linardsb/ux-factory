// Neutral chrome config — the shipped site's IA on the neutral shell.
// site.js injects the header, mobile nav and footer from window.CLIENT_CONFIG; this is
// the neutral pack's half of that. A company build clones this to
// client.<company>.config.js (its brand strings, links, logo) — system/site.js never
// changes. Load BEFORE system/site.js.
//
// The chrome brand stays neutral ("ux factory", neutral logos); the person lives in
// page content and the footer (identity call, ticket #6 plan). Nav pages are
// extensionless — CF Pages and `npx serve` both resolve /approach → approach.html.
// Contact rides the CTA slot rather than a fifth nav item (nav-cta idiom).

window.CLIENT_CONFIG = {
  brand: {
    name: "ux factory",
    homeHref: "/",
    logo: {
      default: "/assets/logo-neutral.svg",         // light header
      onDark:  "/assets/logo-neutral-on-dark.svg",  // dark footer
    },
  },

  // IA (#216, epic #202): the site stopped being five peer pages and became ONE DESTINATION
  // WITH EVIDENCE AROUND IT, so the nav is the destination plus its evidence layers —
  // Studio · Approach · Work + the Contact CTA. This SUPERSEDES v3's D6 ("Factory drops from
  // the nav; it is the evidence layer"), which was written before waves 1-5 of epic #202 moved
  // the site's centre of gravity onto /factory. The label is "Studio", not "Factory": #206
  // deliberately deferred that rename to #216 (its D2) because the string lives here and so
  // churns every chrome baseline, and #216 already runs alone.
  //
  // HOME LEAVES THE NAV DELIBERATELY (#216 D2). index.html carries data-page="home", which now
  // matches no nav key, so NO nav item is marked active on / — intended, and 404.html's
  // data-page="" already proves that state renders fine. The logo (site.js:46-48, aria-label
  // "… home") is the home affordance; a fourth nav item would put Home in direct competition
  // with the route this IA change exists to promote. Home is not reduced to the logo alone:
  // the footer site index below keeps its Home row, and palette.mjs registers "Go to Home" on
  // every page except / — three routes back, none of them the nav. Reverting is one entry:
  // { label: "Home", href: "/", key: "home" } at the head of the array.
  //
  // /build and /components stay out of the nav but in the footer index (#148, #215), which
  // still claims — and is — the FULL site index. Every route resolves.
  nav: [
    { label: "Studio",   href: "/factory",  key: "factory"  },
    { label: "Approach", href: "/approach", key: "approach" },
    { label: "Work",     href: "/work",     key: "work"     },
  ],

  cta: { label: "Get in touch", href: "/contact" },

  footer: {
    tagline:
      "A working factory for UX engineering: a token-contract design system, generated " +
      "artifacts committed in the open, agents at build time only. Built by Linards Berzins.",

    columns: [
      {
        title: "Site",
        // Ordered destination-first to match the nav, and relabelled "Studio" with it (#216).
        items: [
          { label: "Home",       href: "/" },
          { label: "Studio",     href: "/factory" },
          { label: "Approach",   href: "/approach" },
          { label: "Work",       href: "/work" },
          { label: "Build",      href: "/build" },
          { label: "Components", href: "/components" },
          { label: "Contact",    href: "/contact" },
        ],
      },
      {
        title: "The system",
        items: [
          { label: "Token contract",   href: "/system/tokens.contract.css" },
          { label: "Neutral pack",     href: "/system/tokens.neutral.css" },
          // "Component styles" since #215: the Site column gained a "Components" PAGE link, and two
          // links named "Components" to different targets is a real ambiguity. The sibling labels
          // ("Token contract", "Neutral pack") are friendly names, not filenames, so this one is too.
          { label: "Component styles", href: "/system/components.css" },
          { label: "Source (GitHub)", href: "https://github.com/linardsb/ux-factory" },
        ],
      },
    ],

    copyright: "© 2026 Linards Berzins · ux factory",
  },
};
