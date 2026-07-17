// system/wc/vd-status-chip.mjs — status-chip as a standalone custom element (hand-written
// canon, this repo; not generated). The tech-agnostic handoff proof: shadow-DOM encapsulated,
// themed only by the semantic tokens its spec declares — load the pack's tokens/css layers
// (or override custom properties at any scope) and it re-skins; no other page CSS reaches it.
// Spec: system/specs/status-chip.md · architecture §Boundaries "Components handoff"
// (epic #1, ticket #12; folds spike 3).

const VARIANTS = ["ok", "due", "overdue"];

// Every var() here must name a token in the spec head's `tokens` array — no other tokens,
// no colour literals, no var() fallbacks (the contract layer owns fallbacks; a fallback
// here would mask pack-level overrides). Font-family is deliberately unset: inheritable
// text properties flow into shadow DOM from the host page.
const CSS = `
  :host { display: inline-block; }
  .pill {
    display: inline-block;
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    font-size: var(--type-eyebrow);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: var(--color-bg-surface);
    color: var(--color-fg-muted);
  }
  .pill.due { border-color: var(--color-accent); color: var(--color-accent); }
  .pill.overdue { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-accent-fg); }
`;

export class VdStatusChip extends HTMLElement {
  static observedAttributes = ["value", "label"];
  #data = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<style>${CSS}</style><span class="pill"></span>`;
  }

  // DataContract path (status-chip.contract.json): assign a full Status record.
  // Reflects to attributes so markup, property, and framework usage stay one model
  // (React 19 assigns this object prop as a DOM property — verified at plan time).
  get data() { return this.#data; }
  set data(record) {
    this.#data = record ?? null;
    if (record) { this.setAttribute("value", record.value); this.setAttribute("label", record.label); }
  }

  connectedCallback() { this.#render(); }
  attributeChangedCallback() { this.#render(); }

  #render() {
    const value = this.getAttribute("value");
    const pill = this.shadowRoot.querySelector(".pill");
    pill.className = "pill" + (VARIANTS.includes(value) && value !== "ok" ? " " + value : "");
    pill.textContent = this.getAttribute("label") ?? "";
  }
}

if (!customElements.get("vd-status-chip")) customElements.define("vd-status-chip", VdStatusChip);
