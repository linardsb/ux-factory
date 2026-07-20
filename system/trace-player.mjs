// system/trace-player.mjs — hand-written canon (this repo; not generated).
// View-time trace player: replays a committed Trace (traces/*.jsonl) as stepped
// annotated cards grouped into the four PIV acts — plan · gate · implement · validate
// (epic #1, ticket #5; architecture §Data model — Trace: "player renders stepped
// annotated cards grouped into acts, not a log"). The four act headers render up front,
// empty — the governance skeleton is visible before a single step; stepping fills it in.
//
// Honesty-load-bearing (hard): the run is labeled — `meta.label` (e.g. "Real run,
// curated for length") is rendered VERBATIM and prominently, always. Every trace-derived
// string (agent text, tool input/response, errors, the label) is written with
// textContent, never interpolated as HTML — trace content is real agent output, treated
// as untrusted.
//
// No imports, no fetch: the page fetches the JSONL and hands the text to parseTrace; the
// player only renders (keeps #10 free to inline or preload). Zero runtime deps — shipped
// raw via <script type="module">. The designed surface is the Factory page (#10);
// trace.html is the bare harness. Semantic classes only; the module injects no <style>.
//
// Keyboard stepping (arrow keys) is scoped to the player's own root element (a focusable,
// labelled group): only the focused player responds, so two players on one page never fight
// over arrows. The returned `destroy()` removes that listener and clears the container — call
// it before re-rendering or removing a player (cleanup hygiene; the listener no longer stacks).

const ACTS = [['plan', 'Plan'], ['gate', 'Gate'], ['implement', 'Implement'], ['validate', 'Validate']];

// parseTrace(jsonlText) → { meta, steps, result }. Pure (no DOM) so it runs under Node.
// Throws naming the offending line (project error convention).
export function parseTrace(jsonlText) {
  const lines = jsonlText.split('\n').filter((l) => l.trim());
  if (!lines.length) throw new Error('trace: empty');
  const rows = lines.map((l, i) => {
    try { return JSON.parse(l); } catch (e) { throw new Error(`trace line ${i + 1}: not JSON — ${e.message}`); }
  });
  const meta = rows[0];
  if (!meta || meta.type !== 'meta') throw new Error('trace line 1: expected a "meta" line');
  const result = rows[rows.length - 1];
  if (!result || result.type !== 'result') throw new Error(`trace line ${rows.length}: expected a "result" line`);
  const steps = [];
  for (let i = 1; i < rows.length - 1; i++) {
    const s = rows[i];
    if (s.type !== 'step') throw new Error(`trace line ${i + 1}: expected a "step" line`);
    if (typeof s.seq !== 'number' || !s.phase || typeof s.kind !== 'string')
      throw new Error(`trace line ${i + 1}: step needs numeric "seq", a "phase", and a "kind"`);
    steps.push(s);
  }
  return { meta, steps, result };
}

// --- DOM helpers (all trace text via textContent — untrusted) ------------------------
function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}
const fmtDate = (iso) => { try { return new Date(iso).toISOString().slice(0, 10); } catch { return ''; } };
function fmtDuration(ms) {
  if (!ms || ms < 0) return '';
  const s = Math.round(ms / 1000), m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
}
// Tool input hint — mirror portal/lib/chat.mjs:70 extraction order.
const hint = (input) =>
  (input && typeof input === 'object' && (input.query || input.url || input.file_path || input.pattern || input.command)) || '';

// Display-time path relativization against meta.cwd. The committed JSONL stays verbatim
// (raw is fully inspectable — this is presentation, the same class as response truncation);
// it only shortens absolute local paths in the machine fields (tool hints/responses/errors)
// so the exhibit doesn't ship a home-directory tree. The agent's narration is never touched.
const relativize = (s, cwd) => (cwd ? String(s).split(cwd + '/').join('').split(cwd).join('.') : String(s));

function textCard(step) {
  const card = el('article', 'card trace-step trace-step--text');
  card.append(el('div', 'trace-step-text', step.text));
  return card;
}
function toolCard(step, cwd) {
  const card = el('article', `card trace-step trace-step--tool${step.ok ? '' : ' trace-step--fail'}`);
  const head = el('div', 'trace-step-head');
  head.append(el('span', 'trace-tool', step.tool));
  const h = hint(step.input);
  if (h) head.append(el('span', 'trace-hint muted', relativize(h, cwd)));
  head.append(el('span', `trace-status ${step.ok ? 'ok' : 'bad'}`, step.ok ? '✓' : '✗'));
  card.append(head);
  if (!step.ok && step.error) card.append(el('div', 'trace-error', relativize(step.error, cwd)));
  if (step.artifact && step.artifact.path) card.append(el('span', 'trace-artifact', step.artifact.path));
  if (step.response) {
    const det = document.createElement('details');
    det.className = 'trace-response';
    det.append(el('summary', null, `response${step.responseTruncated ? ' (truncated)' : ''}`));
    det.append(el('pre', 'trace-response-body', relativize(step.response, cwd)));
    card.append(det);
  }
  return card;
}

// renderTracePlayer(container, trace) → builds the DOM, returns stepping controls.
export function renderTracePlayer(container, trace) {
  const { meta, steps, result } = trace;
  container.textContent = '';
  const root = el('div', 'trace-player');
  // Focusable, labelled group so arrow-key stepping scopes to THIS player (see header): only the
  // focused player responds — two players on one page never both catch arrows.
  root.tabIndex = 0;
  root.setAttribute('role', 'group');
  // Named per run (meta.task) — two players share factory.html, so a fixed string would give both
  // groups the same accessible name.
  root.setAttribute('aria-label', `Trace replay: ${meta.task || 'untitled run'} — use arrow keys to step`);

  // Header strip: task, the honesty label (verbatim), model/date/turns/duration/cost/steps.
  const header = el('header', 'trace-header');
  header.append(el('h2', 'trace-task', meta.task));
  const line = el('div', 'trace-meta');
  line.append(el('span', 'trace-label', meta.label)); // honesty surface #2 on screen — verbatim
  line.append(el('span', 'muted', meta.model));
  line.append(el('span', 'muted', fmtDate(meta.startedAt)));
  if (Number.isFinite(result.numTurns)) line.append(el('span', 'muted', `${result.numTurns} turns`));
  const dur = fmtDuration(result.durationMs);
  if (dur) line.append(el('span', 'muted', dur));
  if (result.totalCostUsd != null && Number.isFinite(Number(result.totalCostUsd)))
    line.append(el('span', 'muted', `~$${Number(result.totalCostUsd).toFixed(2)} (SDK estimate)`));
  line.append(el('span', 'muted', `${steps.length} steps`));
  header.append(line);

  const controls = el('div', 'trace-controls');
  const btnPrev = el('button', 'btn btn-secondary', '◀ Prev');
  const btnNext = el('button', 'btn btn-primary', 'Next ▶');
  const btnAll = el('button', 'btn btn-secondary', 'Show all');
  const progress = el('span', 'trace-progress muted');
  controls.append(btnPrev, btnNext, btnAll, progress);
  header.append(controls);
  root.append(header);

  // Four act sections in fixed order — the skeleton, visible before any card is revealed.
  const ordered = [...steps].sort((a, b) => a.seq - b.seq);
  const bodies = {};
  ACTS.forEach(([key, label], i) => {
    const count = ordered.filter((s) => s.phase === key).length;
    const act = el('section', `trace-act trace-act--${key}`);
    const h = el('div', 'trace-act-head');
    h.append(el('span', 'trace-act-num', String(i + 1)), el('span', 'trace-act-name', label),
      el('span', 'trace-act-count muted', `${count} step${count === 1 ? '' : 's'}`));
    act.append(h);
    const body = el('div', 'trace-act-body');
    act.append(body);
    bodies[key] = body;
    root.append(act);
  });

  // One card per step, appended to its act; hidden until stepped to.
  const cards = ordered.map((step) => {
    const card = step.kind === 'text' ? textCard(step) : toolCard(step, meta.cwd);
    card.classList.add('trace-step-hidden');
    (bodies[step.phase] || root).append(card);
    return card;
  });

  container.append(root);

  // Stepping: cards 0..current visible, current highlighted; > current hidden. No autoplay.
  let current = -1;
  function apply(scroll) {
    cards.forEach((c, i) => {
      c.classList.toggle('trace-step-hidden', i > current);
      c.classList.toggle('trace-step-current', i === current);
    });
    progress.textContent = `${Math.max(0, current + 1)} / ${cards.length}`;
    if (scroll && current >= 0 && cards[current]) cards[current].scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  const next = () => { if (current < cards.length - 1) { current++; apply(true); } };
  const prev = () => { if (current > -1) { current--; apply(true); } };
  const reveal = (i, scroll = true) => { current = Math.max(-1, Math.min(cards.length - 1, i)); apply(scroll); };
  const revealAll = () => { current = cards.length - 1; cards.forEach((c) => { c.classList.remove('trace-step-hidden'); c.classList.remove('trace-step-current'); }); progress.textContent = `${cards.length} / ${cards.length}`; };

  btnNext.addEventListener('click', next);
  btnPrev.addEventListener('click', prev);
  btnAll.addEventListener('click', revealAll);
  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  };
  root.addEventListener('keydown', onKey);
  const destroy = () => { root.removeEventListener('keydown', onKey); container.textContent = ''; };

  reveal(0, false); // start on the first step (skeleton + step 1), no jump-scroll on load
  return { next, prev, reveal, revealAll, destroy };
}
