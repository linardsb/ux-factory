  // Library-generic primitive (ds-, cross-scenario) — one person or entity per row with a leading
  // monogram disc, a trailing status pill and a chevron because the row NAVIGATES (spike C, drafted
  // from a Brilliant blueprint read; system/specs/person-row.md). Interactive like plant-card: one
  // <a>, accessible name = name + meta + status, the disc, pill and chevron aria-hidden; click → the
  // bus as intent "open". `status` is FREE text — never a status-chip child (that enum is Verdant's).
  "person-row": (props, kids, bus) => {
    const row = el("a", {
      class: `ds-person-row${props.tone && props.tone !== "neutral" ? " is-" + props.tone : ""}`,
      href: "#",
      "aria-label": [props.name, props.meta, props.status].filter((s) => s != null).join(", "),
    },
      el("span", { class: "ds-person-avatar", "aria-hidden": "true", text: props.name[0] }),
      el("span", { class: "ds-person-text" },
        el("span", { class: "ds-person-name", text: props.name }),
        props.meta != null ? el("span", { class: "ds-person-meta", text: props.meta }) : null),
      props.status != null ? el("span", { class: "ds-person-status", "aria-hidden": "true", text: props.status }) : null,
      el("span", { class: "ds-person-chevron", "aria-hidden": "true" }));
    row.addEventListener("click", (e) => {
      e.preventDefault();
      busEmit(bus, "person-row", e, { intent: "open", name: props.name });
    });
    return row;
  },
