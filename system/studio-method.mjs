// system/studio-method.mjs — hand-written canon (this repo; not generated). The studio's METHOD
// BAND (epic #202 — docs/epics/prototype-studio.prd.md §6, .architecture.md §Recommended approach;
// ticket #214; .claude/plans/studio-method-cards-hook-loop-214.md).
//
// The ten method questions (Hooked ×7, Shape Up ×3) stop being a stepped wizard the studio links
// out to and become cards ON the working surface: answering one redrafts the board on the canvas
// in the same interaction, through the committed rules and nothing else. The Hook loop is an
// assemblable four-node diagram, and ONLY its completion unlocks the ethics verdict — which
// renders from the same imported rules /build's verdict panel reads, never a second copy.
//
// A SECOND MOUNT OF THE EXISTING ANSWER STORE, NEVER A SECOND TRUTH. Cards read
// QUESTIONS/readBuild() and write through setAnswers() — the store's own "questions" path, the
// same one /build's wizard uses — so the cards and the wizard are indistinguishable in the event
// stream, which is the "second mount" property stated as data. The BUILD_CHANGE listener filters
// "questions" | "restore" (the #193 fix pattern, build-questions.mjs's mountVerdict), so a ?b=
// restore populates cards, diagram and verdict with zero interaction, and the breadboard-sourced
// event our own redraft publishes is ignored — which is what makes the redraft loop-free:
// setAnswers → "questions" → redraft → publishBuild("breadboard") → ignored.
//
// DRIVER-GATED, THE COMPILE BEAT'S ASYMMETRY: cards and diagram are disabled only while the
// replay driver will PLAY, re-enabled inside the orchestrator's publishBoard on every
// stopped-for-good path (settle, take-over, unavailable), and never disabled at all on the
// declined ?b= path, where no beat ever runs and the disable would have nothing to wait for.
//
// NO BUS VERB, DELIBERATELY. Assembly is select-then-place on real buttons: pointer and keyboard
// converge natively on `click` (SC 2.5.7 satisfied by construction — no path requires a drag),
// and there is no agent path to assembly and no parity claim to construct, so a `ui.assemble`
// verb would be one emitter + one consumer invented for symmetry — studio-flow.mjs:14-25's
// recorded reasoning, applied verbatim. Revisit only when a replay records method answers.
//
// Every announcement goes through the injected canvas.say — the canvas's ONE live region
// (studio-canvas.mjs argues why there is exactly one). A refusal is announced, never thrown.
//
// Node-import safe: the pure layer below is plain data in, plain data out — build-checks group 20
// drives it in CI with no browser — and nothing at module scope touches the DOM. No self-boot:
// system/studio.mjs mounts this, because the adoptBoard seam it takes belongs to the orchestrator.

import {
  QUESTIONS, ACTS, SUMMARY_TERM, DEFAULT_ANSWERS, HOOK_STAGES, BUILD_CHANGE,
  readBuild, setAnswers, publishBuild, quadrantFor, frequencyVerdictFor, QUADRANT_MEANINGS,
} from "./build-questions.mjs";
import { draftBoard } from "./breadboard.mjs";

// ---- the pure layer ----------------------------------------------------------------------------

// The listener filter as data, so build-checks group 20 can pin the #193 tripwire: a consumer that
// filters to "questions" alone leaves a ?b= restore rendering defaults until the first click.
export const RENDER_SOURCES = Object.freeze(["questions", "restore"]);

// assembleReducer(placed, stageId, slotIndex) → { placed, accepted, reason }.
//
// `placed` maps slot index → stage id and is never mutated: a NEW map comes back every time
// (board-ops.mjs's applyOp discipline, at diagram scale). A placement is accepted ONLY when the
// slot is empty and HOOK_STAGES names exactly that stage for it — the loop order is the method's,
// not the visitor's to rearrange. Every refusal reason is a fixed sentence naming the stage and
// the slot, built from SUMMARY_TERM so the diagram and the wizard use the method's own terms.
// Total over junk: a hostile stage id, a non-integer slot or a garbage map refuses, never throws.
export function assembleReducer(placed, stageId, slotIndex) {
  const base = placed && typeof placed === "object" ? { ...placed } : {};
  // A NUMBER, never a coercion: Number(null) is 0, so a coerced null would land in slot 1 —
  // build-checks group 20's hostile-slot case is what caught exactly that.
  const n = typeof slotIndex === "number" ? slotIndex : NaN;
  if (!Number.isInteger(n) || n < 0 || n >= HOOK_STAGES.length) {
    return { placed: base, accepted: false, reason: "That slot is not one of the loop's four stages." };
  }
  if (!HOOK_STAGES.includes(stageId)) {
    return { placed: base, accepted: false, reason: "Only the four Hook stages can be placed in the loop." };
  }
  if (base[n] != null) {
    return { placed: base, accepted: false, reason: `Stage ${n + 1} is already filled.` };
  }
  const expected = HOOK_STAGES[n];
  if (expected !== stageId) {
    return {
      placed: base, accepted: false,
      reason: `${SUMMARY_TERM[stageId]} is not stage ${n + 1} — that slot is ${SUMMARY_TERM[expected]}'s.`,
    };
  }
  base[n] = stageId;
  return { placed: base, accepted: true, reason: null };
}

// True only when all four slots hold their own stage — 3/4 is not a loop, and neither is 4/4 with
// one stage somewhere it does not belong (the reducer refuses those, but this answers for a map
// however it was built, because the verdict unlock turns on it).
export function hookComplete(placed) {
  if (!placed || typeof placed !== "object") return false;
  return HOOK_STAGES.every((stage, i) => placed[i] === stage);
}

// The verdict, composed THINLY from the imported rules — quadrantFor, QUADRANT_MEANINGS,
// frequencyVerdictFor — with no second copy of any of them (AC #3): this page and /build's
// verdict panel can never disagree about a reading. Junk answers fall back to the defaults,
// draftBoard's own idiom, so the composition is total like everything group 20 drives.
export function verdictFor(answers) {
  const a = { ...DEFAULT_ANSWERS, ...(answers || {}) };
  const quadrant = quadrantFor(a);
  return { quadrant, meaning: QUADRANT_MEANINGS[quadrant], frequency: frequencyVerdictFor(a) };
}

// ---- the mount ---------------------------------------------------------------------------------

// Copied rather than imported, like every other hand-written canon module (studio.mjs:124-136).
const el = (tag, attrs, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "text") n.textContent = v;
    else n.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids) if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return n;
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// mountStudioMethod(root, { canvas, adoptBoard, declined }) → { setEnabled, refresh } | null.
//
// `canvas` supplies say() — the one announcement channel; `adoptBoard` is the orchestrator's
// adoption seam (replace the stage's contents, publish the board, flip provenance); `declined`
// is the ?b= path's never-disable flag. The mount writes the STORE (setAnswers on a card change,
// publishBuild for the redrafted board) and the orchestrator writes the CANVAS — one writer each,
// which is what keeps studio.mjs's "this file writes the store in exactly one place" header true.
export function mountStudioMethod(root, { canvas, adoptBoard, declined } = {}) {
  const host = root.querySelector?.("[data-studio-method]");
  // A page without the band is not an error — studio.html's raw harness mounts the core alone.
  if (!host) return null;
  try {
    return mount(host, { canvas, adoptBoard, declined });
  } finally {
    // On every path, a throw included — the canvas modules' discipline: a gate waiting on this
    // handle must fail on the real assertion, never deadlock to timeout on a page that half-built.
    host.setAttribute("data-studio-method", "ready");
  }
}

function mount(host, { canvas, adoptBoard, declined }) {
  // Validated at the boundary, throwing a plain Error naming what is missing (the convention).
  if (!canvas || typeof canvas.say !== "function" || typeof adoptBoard !== "function") {
    throw new Error("studio-method: a mounted canvas handle { say } and the adoptBoard seam are required");
  }

  // The seed — studio.mjs:378-379's exact idiom. On a ?b= arrival restoreShared has already run
  // restoreBuild() BEFORE this mount, so `stored.source` is "restore" and the answers are the
  // sender's; on a plain load source is null and the recommended defaults hold. The discriminator
  // is reliable by construction: publishState assigns source before dispatch and readBuild clones
  // the whole state (verified at planning against build-questions.mjs:66-103).
  const stored = readBuild();
  let current = { ...(stored.answers ?? DEFAULT_ANSWERS) };
  const restoredAtMount = stored.source === "restore" && Boolean(stored.answers);

  // --- diagram + verdict state ------------------------------------------------------------------
  let placed = {};        // slot index → stage id, only ever replaced by assembleReducer's output
  let selected = null;    // the stage id waiting for a slot, select-then-place's first half
  let unlocked = false;   // UI-local completion state — never a store field (planning decision 6)
  let enabled = true;

  // --- the ten cards ----------------------------------------------------------------------------
  const cardsWrap = el("div", { class: "stu-method-cards" });
  for (const actKey of Object.keys(ACTS)) {
    cardsWrap.appendChild(el("p", { class: "stu-method-act", text: ACTS[actKey].label }));
    for (const q of QUESTIONS.filter((x) => x.act === actKey)) {
      const promptId = `stm-q-prompt-${q.id}`;
      // Native radios, so arrows-within-a-group is the platform's own keyboard path — that is the
      // cards' whole keyboard story, and it costs nothing (build-questions.mjs's wizard's call).
      const group = el("div", { class: "stu-mcard-radios", role: "radiogroup", "aria-labelledby": promptId });
      for (const opt of q.options) {
        const row = el("label", { class: "stu-mcard-radio" });
        const input = el("input", { type: "radio", name: `stm-q-${q.id}`, value: opt.value });
        input.checked = current[q.id] === opt.value;
        // The whole handler: the store moves, and the BUILD_CHANGE listener below does the rest —
        // one code path whether the write came from this mount or anywhere else.
        input.addEventListener("change", () => setAnswers({ [q.id]: opt.value }));
        row.append(input, el("span", { class: "stu-mcard-radio-label", text: opt.label }));
        group.appendChild(row);
      }
      cardsWrap.appendChild(el("article", { class: "stu-mcard", "data-method-card": q.id },
        el("p", { class: "stu-mcard-term", text: SUMMARY_TERM[q.id] }),
        el("p", { class: "stu-mcard-prompt", id: promptId, text: q.prompt }),
        group));
    }
  }

  // --- the Hook diagram -------------------------------------------------------------------------
  const nodeBtns = HOOK_STAGES.map((id) =>
    el("button", { type: "button", class: "stu-hook-node", "data-hook-node": id, "aria-pressed": "false", text: SUMMARY_TERM[id] }));
  const slotBtns = HOOK_STAGES.map((_, i) =>
    el("button", { type: "button", class: "stu-hook-slot", "data-hook-slot": String(i), text: `Stage ${i + 1}` }));

  const hook = el("div", { class: "stu-hook" },
    el("h4", { class: "stu-hook-title", text: "The Hook loop" }),
    el("p", { class: "stu-hook-hint", text:
      "Trigger, action, variable reward, investment — in that order. Pick a stage, then the slot it belongs in. Completing the loop unlocks the ethics verdict." }),
    el("div", { class: "stu-hook-nodes" }, ...nodeBtns),
    el("div", { class: "stu-hook-slots" }, ...slotBtns));

  // --- the verdict ------------------------------------------------------------------------------
  const verdictBody = el("div", { class: "stu-verdict-body" });
  const verdict = el("div", { class: "stu-verdict", "data-method-verdict": "locked" },
    el("h4", { class: "stu-verdict-title", text: "The ethics verdict" }),
    verdictBody);

  host.append(cardsWrap, hook, verdict);

  // --- rendering --------------------------------------------------------------------------------
  const syncCards = (answers) => {
    // Checked-state sync, never a rebuild: the input the visitor just clicked already agrees with
    // the store, so their own change is a no-op here and the browser's dispatch is undisturbed
    // (build-questions.mjs's wizard listener makes the same call for the same reason).
    for (const input of host.querySelectorAll('input[type="radio"]')) {
      input.checked = answers[input.name.slice("stm-q-".length)] === input.value;
    }
  };

  function renderVerdict() {
    verdict.setAttribute("data-method-verdict", unlocked ? "unlocked" : "locked");
    verdictBody.textContent = "";
    if (!unlocked) {
      verdictBody.appendChild(el("p", { class: "stu-verdict-locked", text:
        "Assemble the Hook loop to unlock the ethics verdict." }));
      return;
    }
    const v = verdictFor(current);
    verdictBody.append(
      el("p", { class: "stu-verdict-eyebrow", text: "Where your two ethics answers put it" }),
      el("p", { class: "stu-verdict-quadrant", text: cap(v.quadrant) }),
      el("p", { class: "stu-verdict-meaning", text: v.meaning }),
      el("p", { class: "stu-verdict-eyebrow", text: "The frequency filter" }),
      el("p", { class: "stu-verdict-gate", "data-passes": String(v.frequency.passes), text: v.frequency.verdict }),
    );
  }

  const fillSlot = (i, stageId) => {
    slotBtns[i].textContent = `Stage ${i + 1}: ${SUMMARY_TERM[stageId]}`;
    slotBtns[i].classList.add("is-filled");
    slotBtns[i].disabled = true;
    const node = nodeBtns[HOOK_STAGES.indexOf(stageId)];
    node.classList.remove("is-selected");
    node.setAttribute("aria-pressed", "false");
    node.classList.add("is-placed");
    node.disabled = true;
  };

  // The restore path renders the ASSEMBLED state rather than narrating a performance the visitor
  // never gave: the sender completed the loop when they answered the questions, so restore IS
  // completion (planning decision 6) — filled slots, spent nodes, no announcements.
  const assembleAll = () => {
    placed = {};
    HOOK_STAGES.forEach((stage, i) => { placed[i] = stage; fillSlot(i, stage); });
    unlocked = true;
    renderVerdict();
  };

  // --- the redraft ------------------------------------------------------------------------------
  function redraft(answers) {
    const board = draftBoard(answers);
    adoptBoard(structuredClone(board), { ...answers });
    // The store's board moves through the store's own path — breadboard.mjs:206-208's idiom, and
    // never an answers key, which publishBuild refuses by throwing.
    publishBuild({ source: "breadboard", board, boardIsEdited: false });
    const n = board.places.length;
    canvas.say(`Board redrafted from your answers — ${n === 1 ? "1 place" : `${n} places`}.`);
  }

  // --- select-then-place ------------------------------------------------------------------------
  nodeBtns.forEach((btn, idx) => {
    btn.addEventListener("click", () => {
      const id = HOOK_STAGES[idx];
      selected = id;
      for (const other of nodeBtns) {
        other.classList.toggle("is-selected", other === btn);
        other.setAttribute("aria-pressed", other === btn ? "true" : "false");
      }
      canvas.say(`${SUMMARY_TERM[id]} selected. Choose its slot in the loop.`);
    });
  });

  slotBtns.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      if (!selected) {
        canvas.say("Pick a stage first, then its slot.");
        return;
      }
      const result = assembleReducer(placed, selected, i);
      if (!result.accepted) {
        // Announced, never thrown, and the DOM untouched — the studio's standing refusal shape.
        canvas.say(result.reason);
        return;
      }
      placed = result.placed;
      const stage = selected;
      selected = null;
      fillSlot(i, stage);
      const placedSentence = `${SUMMARY_TERM[stage]} placed, stage ${i + 1} of 4.`;
      if (hookComplete(placed)) {
        unlocked = true;
        renderVerdict();
        // ONE sentence carrying both facts: a second say() in the same task would overwrite the
        // placement in a polite region that speaks its final value (the driver's own lesson).
        canvas.say(`${placedSentence} Hook loop assembled — the ethics verdict is unlocked.`);
      } else {
        canvas.say(placedSentence);
      }
    });
  });

  // --- the store listener -----------------------------------------------------------------------
  // The #193 filter, via RENDER_SOURCES: "questions" and "restore" move the answers this band
  // renders; "breadboard" — including the event our own redraft publishes — carries no new answer
  // and is ignored, which is the loop-breaker. Registered once on document, never torn down: the
  // band lives for the life of the page, like every consumer in build-questions.mjs.
  document.addEventListener(BUILD_CHANGE, (e) => {
    const source = e.detail && e.detail.source;
    if (!RENDER_SOURCES.includes(source)) return;
    current = { ...e.detail.answers };
    syncCards(current);
    if (source === "restore") {
      // The sender's board is already placed — restoreShared published it before this page's core
      // mounted — so a redraft here would overwrite the very board the link carried
      // (breadboard.mjs's restore-adopts-verbatim reasoning, same call).
      assembleAll();
      return;
    }
    // The two ethics answers and the frequency are cards too: once unlocked, the verdict tracks
    // every later answer change.
    if (unlocked) renderVerdict();
    redraft(current);
  });

  // --- gating -----------------------------------------------------------------------------------
  const setEnabled = (on) => {
    enabled = Boolean(on);
    host.setAttribute("data-method-state", enabled ? "ready" : "disabled");
    for (const input of host.querySelectorAll('input[type="radio"]')) input.disabled = !enabled;
    // Placed nodes and filled slots stay spent whatever the gate does — re-enabling them would
    // reopen slots the reducer already accepted.
    for (const btn of nodeBtns) btn.disabled = !enabled || btn.classList.contains("is-placed");
    for (const btn of slotBtns) btn.disabled = !enabled || btn.classList.contains("is-filled");
  };

  // The compile beat's asymmetry, mirrored exactly (studio.mjs's `if (!declined)` call): disabled
  // only when the driver will PLAY — publishBoard re-enables on every stopped-for-good path — and
  // never on the declined path, where no beat ever runs and nothing would ever re-enable it.
  setEnabled(declined);

  if (restoredAtMount) assembleAll();
  else renderVerdict();

  return {
    setEnabled,
    // The re-sync seam: pull the store and redraw what renders from it. No redraft — refresh is a
    // READ, and the board only ever moves on a visitor's answer.
    refresh() {
      const s = readBuild();
      if (!s.answers) return;
      current = { ...s.answers };
      syncCards(current);
      if (unlocked) renderVerdict();
    },
  };
}
