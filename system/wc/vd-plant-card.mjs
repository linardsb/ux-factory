// system/wc/vd-plant-card.mjs — plant-card as a standalone custom element (hand-written
// canon, this repo; not generated). Composes vd-status-chip; shadow-DOM encapsulated,
// themed only by the semantic tokens its spec declares — the token contract pierces the
// shadow boundary via custom-property inheritance, so a pack (or any scoped override)
// re-skins it without touching this file.
// Spec: system/specs/plant-card.md · architecture §Boundaries "Components handoff"
// (epic #1, ticket #12; folds spike 3).

import "./vd-status-chip.mjs";

// value → canonical chip label (the card spec gives the chip only `status`; the
// contract's Status record allows richer labels, but those arrive via a full
// status-chip `data` record, not through this parent).
const CHIP_LABELS = { ok: "OK", due: "DUE", overdue: "OVERDUE" };

// Every var() here must name a token in the spec head's `tokens` array — no other tokens,
// no colour literals, no var() fallbacks (the contract layer owns fallbacks; a fallback
// here would mask pack-level overrides). Font-family is deliberately unset: inheritable
// text properties flow into shadow DOM from the host page. The pressed-state color-mix
// mixes two spec-head tokens by proportion (in-repo precedent: tokens.source.json inverse
// group) — no other mixing, no literals.
const CSS = `
  :host { display: block; }
  .card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    min-height: 44px;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    color: var(--color-fg);
    text-decoration: none;
  }
  .card:active { background: color-mix(in srgb, var(--color-bg-surface), var(--color-border) 50%); }
  .card.overdue { border-color: var(--color-accent); }
  .card:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
  .thumb {
    width: 48px;
    height: 48px;
    flex: none;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
    color: var(--color-fg-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--type-body);
  }
  .thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
  .name {
    font-size: var(--type-body);
    color: var(--color-fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .species {
    font-size: var(--type-caption);
    color: var(--color-fg-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  vd-status-chip { flex: none; }
`;

export class VdPlantCard extends HTMLElement {
  static observedAttributes = ["name", "species", "status", "photo-url", "plant-id", "href"];
  #data = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<style>${CSS}</style>
      <a class="card">
        <span class="thumb"></span>
        <span class="text">
          <span class="name"></span>
          <span class="species"></span>
        </span>
        <vd-status-chip aria-hidden="true"></vd-status-chip>
      </a>`;
    // The whole card is one tap target navigating to the plant; vd-select rides along
    // for consumers wiring their own navigation ({ id } from plant-id).
    this.shadowRoot.querySelector(".card").addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("vd-select", {
        bubbles: true,
        composed: true,
        detail: { id: this.getAttribute("plant-id") },
      }));
    });
  }

  // DataContract path (plant-card.contract.json): assign a full Plant record.
  // Reflects to attributes so markup, property, and framework usage stay one model
  // (React 19 assigns this object prop as a DOM property — verified at plan time).
  // `lastWatered` is accepted but not rendered (spec: care-task-row territory).
  get data() { return this.#data; }
  set data(record) {
    this.#data = record ?? null;
    if (!record) return;
    this.setAttribute("name", record.name);
    this.setAttribute("status", record.status);
    this.setAttribute("plant-id", record.id);
    if (record.species != null) this.setAttribute("species", record.species);
    else this.removeAttribute("species");
    if (record.photoUrl != null) this.setAttribute("photo-url", record.photoUrl);
    else this.removeAttribute("photo-url");
  }

  connectedCallback() { this.#render(); }
  attributeChangedCallback() { this.#render(); }

  #render() {
    const name = this.getAttribute("name") ?? "";
    const species = this.getAttribute("species");
    const status = this.getAttribute("status");
    const photoUrl = this.getAttribute("photo-url");
    const chipLabel = CHIP_LABELS[status] ?? "OK";

    const card = this.shadowRoot.querySelector(".card");
    card.classList.toggle("overdue", status === "overdue");
    card.setAttribute("href", this.getAttribute("href") ?? "#");
    // Accessible name = name + status; the chip's text is aria-hidden against
    // double announcement (spec ## Accessibility).
    card.setAttribute("aria-label", `${name}, ${chipLabel}`);

    const thumb = this.shadowRoot.querySelector(".thumb");
    if (photoUrl) {
      const img = document.createElement("img");
      img.src = photoUrl;
      img.alt = ""; // decorative — the name is adjacent
      thumb.replaceChildren(img);
    } else {
      // Monogram placeholder: first letter of name, token-tinted (spec mapping table).
      thumb.replaceChildren(name.charAt(0).toUpperCase());
    }

    this.shadowRoot.querySelector(".name").textContent = name;
    const speciesEl = this.shadowRoot.querySelector(".species");
    speciesEl.textContent = species ?? "";
    speciesEl.hidden = species == null; // line omitted entirely, card compacts

    const chip = this.shadowRoot.querySelector("vd-status-chip");
    chip.setAttribute("value", status ?? "ok");
    chip.setAttribute("label", chipLabel);
  }
}

if (!customElements.get("vd-plant-card")) customElements.define("vd-plant-card", VdPlantCard);
