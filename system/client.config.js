// Portfolio chrome — Linards Bērziņš personal site, on the saulera base system.
// Swapping this file re-skins the chrome; base site.js never changes.
// Load this BEFORE system/site.js.

window.CLIENT_CONFIG = {
  brand: {
    name: "linards bērziņš",
    homeHref: "/",
    logo: {
      default: "/assets/favicon.svg",  // the saulera sun mark — amber works on both grounds
      onDark: "/assets/favicon.svg",
    },
  },

  nav: [
    { label: "Home",       href: "/",              key: "home" },
    { label: "Work",       href: "/#work",         key: "work" },
    { label: "Prototypes", href: "/#prototypes",   key: "prototypes" },
    { label: "Practice",   href: "/practice.html", key: "practice" },
    { label: "System map", href: "/system-map.html", key: "system-map" },
    { label: "About",      href: "/about.html",    key: "about" },
  ],

  cta: { label: "Email me", href: "mailto:linardsberzins@gmail.com" },

  footer: {
    tagline:
      "Product builder in East Grinstead, West Sussex. Ten years of customer experience craft; five products designed, built and shipped with agents in 2026.",

    columns: [
      {
        title: "Work",
        items: [
          { label: "vtv",                     href: "/work/vtv.html" },
          { label: "email innovation hub",    href: "/work/email-hub.html" },
          { label: "ugoki",                   href: "/work/ugoki.html" },
          { label: "gerboni",                 href: "/work/gerboni.html" },
          { label: "one trip · prototype",    href: "/onetrip/" },
          { label: "safety net · prototype",  href: "/safetynet/" },
          { label: "anywhere · prototype",    href: "/anywhere/" },
          { label: "on board · prototype",    href: "/onboard/" },
          { label: "together · prototype",    href: "/together/" },
          { label: "one trip · decision log", href: "/onetrip/decisions.html" },
          { label: "the system map",          href: "/system-map.html" },
        ],
      },
      {
        title: "Elsewhere",
        items: [
          { label: "GitHub",      href: "https://github.com/linardsb" },
          { label: "LinkedIn",    href: "https://www.linkedin.com/in/linardsberzins/", rel: "me" },
          { label: "saulera.com", href: "https://saulera.com" },
        ],
      },
      {
        title: "Contact",
        address: true,
        items: [
          { label: "linardsberzins@gmail.com", href: "mailto:linardsberzins@gmail.com" },
        ],
      },
    ],

    copyright: "© 2026 Linards Bērziņš · East Grinstead, West Sussex",
  },
};
