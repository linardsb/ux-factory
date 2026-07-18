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

  nav: [
    { label: "Home",     href: "/",         key: "home" },
    { label: "Approach", href: "/approach", key: "approach" },
    { label: "Factory",  href: "/factory",  key: "factory" },
    { label: "Work",     href: "/work",     key: "work" },
  ],

  cta: { label: "Get in touch", href: "/contact" },

  footer: {
    tagline:
      "A working factory for UX engineering: a token-contract design system, generated " +
      "artifacts committed in the open, agents at build time only. Built by Linards Berzins.",

    columns: [
      {
        title: "Site",
        items: [
          { label: "Home",     href: "/" },
          { label: "Approach", href: "/approach" },
          { label: "Factory",  href: "/factory" },
          { label: "Work",     href: "/work" },
          { label: "Contact",  href: "/contact" },
        ],
      },
      {
        title: "The system",
        items: [
          { label: "Token contract",  href: "/system/tokens.contract.css" },
          { label: "Neutral pack",    href: "/system/tokens.neutral.css" },
          { label: "Components",      href: "/system/components.css" },
          { label: "Source (GitHub)", href: "https://github.com/linardsb/ux-factory" },
        ],
      },
    ],

    copyright: "© 2026 Linards Berzins · ux factory",
  },
};
