// system/wc/vd-care-task-row.mjs — care-task-row as a standalone custom element
// (hand-written canon, this repo; not generated). Composes vd-status-chip; shadow-DOM
// encapsulated, themed only by the semantic tokens its spec declares — the token contract
// pierces the shadow boundary via custom-property inheritance. Toggling dispatches
// `vd-toggle` (composed) so any stack can batch the log-care commit.
// Spec: system/specs/care-task-row.md · architecture §Boundaries "Components handoff"
// (epic #1, ticket #12; folds spike 3).

import "./vd-status-chip.mjs";

// value → canonical chip label (the row spec gives the chip only `status`).
const CHIP_LABELS = { ok: "OK", due: "DUE", overdue: "OVERDUE" };

// Every var() here must name a token in the spec head's `tokens` array — no other tokens,
// no colour literals, no var() fallbacks (the contract layer owns fallbacks; a fallback
// here would mask pack-level overrides). Font-family is deliberately unset: inheritable
// text properties flow into shadow DOM from the host page.
const CSS = `
  :host { display: block; }
  .row {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    width: 100%;
    min-height: 44px;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font: inherit;
    font-size: var(--type-body);
    color: var(--color-fg);
    text-align: left;
    cursor: pointer;
  }
  .row:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
  .circle {
    width: 20px;
    height: 20px;
    flex: none;
    border: 2px solid var(--color-border);
    border-radius: 50%;
  }
  .row.overdue .circle { border-color: var(--color-accent); }
  .row.checked .circle { background: var(--color-accent); border-color: var(--color-accent); }
  .row.checked .label { color: var(--color-fg-muted); }
  .label {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  vd-status-chip { flex: none; }
`;

export class VdCareTaskRow extends HTMLElement {
  static observedAttributes = ["action", "plant-name", "status", "checked", "task-id"];
  #data = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<style>${CSS}</style>
      <button class="row" role="checkbox">
        <span class="circle"></span>
        <span class="label"></span>
        <vd-status-chip aria-hidden="true"></vd-status-chip>
      </button>`;
    // A <button> fires click for Space/Enter natively — one handler covers both.
    this.shadowRoot.querySelector(".row").addEventListener("click", () => {
      this.checked = !this.checked;
      this.dispatchEvent(new CustomEvent("vd-toggle", {
        bubbles: true,
        composed: true,
        detail: { id: this.getAttribute("task-id"), checked: this.checked },
      }));
    });
  }

  // `checked` is a boolean attribute: presence = true (marked-done this session,
  // awaiting the log-care commit).
  get checked() { return this.hasAttribute("checked"); }
  set checked(v) { this.toggleAttribute("checked", Boolean(v)); }

  // DataContract path (care-task-row.contract.json): assign a full CareTask record.
  // Reflects to attributes so markup, property, and framework usage stay one model
  // (React 19 assigns this object prop as a DOM property — verified at plan time).
  // `plantId` and `due` are accepted but never rendered (spec mapping table).
  get data() { return this.#data; }
  set data(record) {
    this.#data = record ?? null;
    if (!record) {
      for (const a of ["action", "plant-name", "status", "task-id"]) this.removeAttribute(a);
      return;
    }
    this.setAttribute("action", record.action);
    this.setAttribute("plant-name", record.plantName);
    this.setAttribute("status", record.status);
    this.setAttribute("task-id", record.id);
  }

  connectedCallback() { this.#render(); }
  attributeChangedCallback() { this.#render(); }

  #render() {
    const action = this.getAttribute("action") ?? "";
    const plantName = this.getAttribute("plant-name") ?? "";
    const status = this.getAttribute("status");
    const checked = this.checked;
    const verb = action.charAt(0).toUpperCase() + action.slice(1);
    const chipLabel = CHIP_LABELS[status] ?? "OK";

    const row = this.shadowRoot.querySelector(".row");
    row.classList.toggle("overdue", status === "overdue");
    row.classList.toggle("checked", checked);
    row.setAttribute("aria-checked", String(checked));
    // Accessible name = action + plant + status; chip text aria-hidden against
    // double announcement (spec ## Accessibility).
    row.setAttribute("aria-label", `${verb} ${plantName}, ${status ?? "ok"}`);

    this.shadowRoot.querySelector(".label").textContent = `${verb} ${plantName}`;

    // The chip stays as-is when checked — urgency is fact until the log commits
    // (spec ## States).
    const chip = this.shadowRoot.querySelector("vd-status-chip");
    chip.setAttribute("value", status ?? "ok");
    chip.setAttribute("label", chipLabel);
  }
}

if (!customElements.get("vd-care-task-row")) customElements.define("vd-care-task-row", VdCareTaskRow);
