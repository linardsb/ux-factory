// Neutral chrome config — the factory's no-brand default.
// site.js injects the header, mobile nav and footer from window.CLIENT_CONFIG; this is the
// neutral pack's half of that. A company build clones this to client.<company>.config.js
// (its brand strings, links, logo) — base/site.js never changes. Load BEFORE system/site.js.
//
// Nothing personal or brand-specific lives here: the point of the neutral base is that the
// chrome renders coherently with no brand loaded. Every href resolves to a file or on-page
// anchor that exists in this shell (index + 404).

window.CLIENT_CONFIG = {
  brand: {
    name: "ux factory · neutral base",
    homeHref: "/",
    logo: {
      default: "/assets/logo-neutral.svg",         // light header
      onDark:  "/assets/logo-neutral-on-dark.svg",  // dark footer
    },
  },

  nav: [
    { label: "Home",         href: "/",        key: "home" },
    { label: "System check", href: "/#system", key: "system" },
    { label: "The swap",     href: "/#swap",   key: "swap" },
  ],

  cta: { label: "The token contract", href: "/system/tokens.contract.css" },

  footer: {
    tagline:
      "The factory's neutral base. Nothing here is a brand — every page renders from the " +
      "token contract and the neutral pack alone. Load a company pack and the same " +
      "components re-skin, no markup touched.",

    columns: [
      {
        title: "The system",
        items: [
          { label: "Token contract",    href: "/system/tokens.contract.css" },
          { label: "Neutral pack",      href: "/system/tokens.neutral.css" },
          { label: "Components",        href: "/system/components.css" },
        ],
      },
      {
        title: "This base",
        items: [
          { label: "Home",         href: "/" },
          { label: "System check", href: "/#system" },
          { label: "The swap",     href: "/#swap" },
        ],
      },
    ],

    copyright: "ux factory · neutral base — no brand loaded",
  },
};
