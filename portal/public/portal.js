/* portal SPA — hash routing: #/ = library, #/card/<slug> = detail */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const state = { cards: [], filter: 'all', search: '', activeSlug: null };

async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

/* ---------- library ---------- */
const STATES = ['all', 'intake', 'researching', 'prototyping', 'applied', 'interview', 'closed'];

function renderLibrary() {
  state.activeSlug = null;
  updateChatContext();
  const industries = [...new Set(state.cards.map((c) => c.industry).filter(Boolean))];
  const cards = state.cards.filter((c) => {
    if (state.filter !== 'all' && c.state !== state.filter && c.industry !== state.filter) return false;
    const q = state.search.toLowerCase();
    return !q || [c.company, c.role, c.industry].join(' ').toLowerCase().includes(q);
  });
  $('#main').innerHTML = `
    <div class="portal-filters" role="toolbar">
      ${STATES.map((s) => `<button class="portal-chip" aria-pressed="${state.filter === s}" data-f="${s}">${s}</button>`).join('')}
      ${industries.map((i) => `<button class="portal-chip" aria-pressed="${state.filter === i}" data-f="${esc(i)}">${esc(i)}</button>`).join('')}
      <span class="portal-search"><input id="search" type="search" placeholder="Search…" value="${esc(state.search)}" /></span>
    </div>
    <div class="portal-grid">
      ${cards.map((c) => `
        <article class="card portal-card" data-slug="${c.slug}" tabindex="0" role="link" aria-label="${esc(c.company)}">
          <div class="card-body">
            <div class="card-kicker">${esc(c.industry || '—')}${c.historical ? ' · pre-factory' : ''}</div>
            <h3 class="h3">${esc(c.company)}</h3>
            <p class="muted">${esc(c.role || '')}</p>
            <div class="state-row">
              <span class="portal-state" data-state="${c.state}">${c.state}</span>
              ${c.decisions?.count ? `<span class="muted">${c.decisions.count} decisions</span>` : ''}
              ${c.prototypes?.length ? `<span class="muted">${c.prototypes.length} pages</span>` : ''}
              ${c.outcomes?.[0]?.status ? `<span class="muted">${esc(c.outcomes[0].status)}</span>` : ''}
            </div>
          </div>
        </article>`).join('') || '<p class="muted">No cards match.</p>'}
    </div>`;
  $('#main').querySelectorAll('.portal-card').forEach((el) => {
    const go = () => { location.hash = `#/card/${el.dataset.slug}`; };
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => e.key === 'Enter' && go());
  });
  $('#main').querySelectorAll('.portal-chip').forEach((el) =>
    el.addEventListener('click', () => { state.filter = el.dataset.f; renderLibrary(); })
  );
  $('#search').addEventListener('input', (e) => { state.search = e.target.value; renderLibrary(); });
}

/* ---------- card detail ---------- */
async function renderCard(slug) {
  const c = await api(`/api/cards/${slug}`);
  state.activeSlug = slug;
  updateChatContext();
  const tabs = ['prototypes', 'record', 'decisions'];
  $('#main').innerHTML = `
    <p><a href="#/" class="muted">← library</a></p>
    <div class="portal-detail-head">
      <h1 class="h3" style="font-size:var(--type-h2)">${esc(c.company)}</h1>
      <span class="portal-state" data-state="${c.state}">${c.state}</span>
      <span class="muted">${esc(c.role || '')}${c.industry ? ' · ' + esc(c.industry) : ''} · ${esc(c.tier)}</span>
      ${c.deploy_url ? `<a class="btn btn-secondary" href="${esc(c.deploy_url)}" target="_blank" rel="noopener">Live site ↗</a>` : ''}
    </div>
    <div class="portal-tabs" role="tablist">
      ${tabs.map((t, i) => `<button class="portal-tab" role="tab" aria-selected="${i === 0}" data-tab="${t}">${t}</button>`).join('')}
    </div>
    <div class="portal-pane" id="pane"></div>`;
  const panes = {
    prototypes: () => c.prototypes.length
      ? `<div class="portal-proto-picker">
           ${c.prototypes.map((p, i) => `<button class="portal-chip" aria-pressed="${i === 0}" data-src="/sites/${c.slug}/${esc(p.rel)}">${esc(p.name)}</button>`).join('')}
         </div>
         <iframe class="portal-proto-frame" id="proto-frame" src="/sites/${c.slug}/${esc(c.prototypes[0].rel)}" title="prototype preview"></iframe>`
      : '<p class="muted">No prototypes on disk yet. They appear here as the factory builds them.</p>',
    record: () => `
      ${c.jd_url ? `<p><a href="${esc(c.jd_url)}" target="_blank" rel="noopener">JD ↗</a>${c.ds_urls.map((u) => ` · <a href="${esc(u)}" target="_blank" rel="noopener">DS ↗</a>`).join('')}</p>` : ''}
      <h3 class="h3">Research</h3><pre>${esc(c.research || '—')}</pre>
      <h3 class="h3">JD excerpt</h3><pre>${esc(c.jd_excerpt || '—')}</pre>
      <h3 class="h3">Notes</h3><pre>${esc(c.notes || '—')}</pre>
      <h3 class="h3">Artifacts on disk</h3>
      <p class="muted">${c.artifacts?.map((a) => esc(a.rel)).join(' · ') || 'none found'}</p>
      <h3 class="h3">Outcome</h3>
      ${c.outcomes?.length ? c.outcomes.map((o) => `<p class="muted">${esc(o.role)} — <strong>${esc(o.status)}</strong>${o.notes && o.notes !== '—' ? ' · ' + esc(o.notes) : ''}</p>`).join('') : '<p class="muted">no outcomes row yet (fills via P8)</p>'}`,
    decisions: () => c.decisionsFull?.items?.length
      ? c.decisionsFull.items.map((d) => `<p><span class="card-kicker">${esc(d.id)} · ${esc(d.prototype)}</span><br />${esc(d.title)}</p>`).join('')
      : '<p class="muted">No decisions ledger yet — it grows during the build (step 5).</p>',
  };
  const show = (t) => {
    $('#pane').innerHTML = panes[t]();
    $('#main').querySelectorAll('.portal-tab').forEach((el) => el.setAttribute('aria-selected', el.dataset.tab === t));
    $('#pane').querySelectorAll('[data-src]').forEach((el) =>
      el.addEventListener('click', () => {
        $('#proto-frame').src = el.dataset.src;
        $('#pane').querySelectorAll('[data-src]').forEach((b) => b.setAttribute('aria-pressed', b === el));
      })
    );
  };
  $('#main').querySelectorAll('.portal-tab').forEach((el) => el.addEventListener('click', () => show(el.dataset.tab)));
  show(c.prototypes.length ? 'prototypes' : 'record');
}

/* ---------- intake ---------- */
$('#btn-intake').addEventListener('click', () => { $('#intake-drawer').hidden = false; });
$('#intake-cancel').addEventListener('click', () => { $('#intake-drawer').hidden = true; });
$('#intake-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const body = {
    company: f.get('company').trim(), role: f.get('role').trim(), industry: f.get('industry').trim(),
    tier: f.get('tier'), jdUrl: f.get('jdUrl').trim(),
    dsUrls: f.get('dsUrls').split('\n').map((s) => s.trim()).filter(Boolean),
    notes: f.get('notes').trim(),
  };
  $('#intake-status').textContent = 'Fetching + writing record…';
  try {
    const { slug, fetched } = await api('/api/intake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    $('#intake-status').textContent = `Done: ${fetched.join(', ') || 'record written'}`;
    e.target.reset();
    await loadCards();
    $('#intake-drawer').hidden = true;
    location.hash = `#/card/${slug}`;
  } catch (err) {
    $('#intake-status').textContent = `Failed: ${err.message}`;
  }
});

/* ---------- figma → pack ---------- */
const MAX_EXPORT_BYTES = 32 * 1024 * 1024; // mirrors portal/lib/figma.mjs — keep in step
const figma = { file: null };
const mb = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
// A swatch hex is third-party data on its way into a style attribute — prove it is a hex first.
const swatchStyle = (hex) => (/^#[0-9a-f]{6}$/i.test(hex) ? `background:${hex}` : '');

// Focus the file input, not the slug: it is the drawer's first control and the first thing the
// operator needs, and landing past it would leave the drop zone reachable only by Shift+Tab.
$('#btn-figma').addEventListener('click', () => { $('#figma-drawer').hidden = false; $('#figma-file').focus(); });
$('#figma-cancel').addEventListener('click', () => { $('#figma-drawer').hidden = true; });

const drop = $('#figma-drop');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('is-over');
  pickFile(e.dataTransfer.files[0]);
});
$('#figma-file').addEventListener('change', (e) => pickFile(e.target.files[0]));

// Client-side checks are a courtesy — they name the limit before a 33 MB upload starts and catch
// a mis-drop instantly. The server validates all of it again; neither side trusts the other.
async function pickFile(file) {
  figma.file = null;
  $('#figma-file-name').textContent = '';
  if (!file) return;
  if (!/\.json$/i.test(file.name)) {
    $('#figma-status').textContent = `"${file.name}" isn't a .json export. Export the design's tokens (Tokens Studio, a variables dump, or any nested name→value JSON) and drop that.`;
    return;
  }
  if (file.size > MAX_EXPORT_BYTES) {
    $('#figma-status').textContent = `"${file.name}" is ${mb(file.size)}, over the ${mb(MAX_EXPORT_BYTES)} cap — a token export should be far smaller; this looks like the wrong file.`;
    return;
  }
  try {
    JSON.parse(await file.text());
  } catch (err) {
    $('#figma-status').textContent = `"${file.name}" isn't valid JSON — ${err.message}`;
    return;
  }
  figma.file = file;
  $('#figma-file-name').textContent = `${file.name} · ${mb(file.size)}`;
  $('#figma-status').textContent = '';
}

// Not the shared api(): that helper assumes a JSON-stringified request and throws on !res.ok,
// and this route posts a raw File and answers a refusal with 200.
async function postPull(params, opts = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/figma/pull?${qs}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
    body: opts.body ?? null,
  });
  const body = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error(body.error || res.statusText);
  return body;
}

$('#figma-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const slug = f.get('slug').trim();
  if (!figma.file) {
    $('#figma-status').textContent = 'Drop an export first (or choose one with the file picker).';
    return;
  }
  const params = { slug };
  if (f.get('accent').trim()) params.accent = f.get('accent').trim();
  if (f.get('neutral').trim()) params.neutral = f.get('neutral').trim();
  $('#figma-report').innerHTML = '';
  $('#figma-status').textContent = `Reading ${figma.file.name}, mapping roles, negotiating contrast…`;
  try {
    const body = await postPull(params, { body: figma.file });
    if (body.ok) renderReport(body.pack);
    else renderCandidates(body, params);
  } catch (err) {
    // A refusal with no candidates lands here too — no usable ramp at all, no grey ramp, an empty
    // read. Show it verbatim with no affordance: the tool is saying this design can't be imported
    // as-is, and inventing a control for that would be an overclaim.
    $('#figma-status').textContent = err.message;
  }
});

function renderCandidates(body, params) {
  $('#figma-status').textContent = body.message;
  $('#figma-report').innerHTML = `
    <p class="muted">The importer won't pick a brand colour for you. Choose the ramp it should use as the accent:</p>
    <div class="portal-swatches">
      ${body.candidates.map((c) => `
        <button class="portal-swatch" type="button" data-hue="${esc(c.hue)}">
          <span class="portal-swatch-chip" style="${swatchStyle(c.swatch)}"></span>
          <span>${esc(c.hue)}</span>
          <span class="muted">${c.rungs} rungs · chroma ${Number(c.chroma).toFixed(3)}</span>
        </button>`).join('')}
    </div>`;
  $('#figma-report').querySelectorAll('.portal-swatch').forEach((el) =>
    el.addEventListener('click', async () => {
      $('#figma-status').textContent = `Re-running with ${el.dataset.hue} as the accent…`;
      try {
        // The retry re-reads the export already on disk — no re-upload, and it exercises the
        // very path the pack header names as the run's source. The clicked swatch replaces only
        // the accent; a typed neutral override still applies to the re-run.
        const body2 = await postPull({ ...params, accent: el.dataset.hue }, { headers: { 'x-figma-retry': '1' } });
        if (body2.ok) renderReport(body2.pack);
        else renderCandidates(body2, params);
      } catch (err) {
        $('#figma-report').innerHTML = '';
        $('#figma-status').textContent = err.message;
      }
    })
  );
}

// Scale — spacing, radius, the type ramp, shadows — is all-or-nothing per family: a design that
// offers fewer values than a family has slots imports NOTHING for it, because a half-imported ramp
// is neither the design's nor this repo's. The drawer has to say which families came across and
// which fell short, or the claim above the drop zone is the only account the operator gets.
const FAMILY_LABEL = { spacing: 'spacing', radius: 'radius', type: 'type ramp', shadow: 'shadows' };

function renderScales(scales) {
  if (!scales) return '';
  if (!scales.offered)
    return `<h3 class="h3">Scale</h3>
      <p class="muted">This read offered no dimension or shadow values, so spacing, radius, the
      type ramp and shadows are all this repo's contract defaults. (Only a plugin export carries
      scale — an API styles read names text and effect styles without ever valuing them.)</p>`;

  const imported = Object.entries(scales.imported || {});
  return `
    <h3 class="h3">Scale from the design</h3>
    ${imported.length ? imported.map(([family, rec]) => `
      <p class="muted"><strong>${esc(FAMILY_LABEL[family] || family)}</strong> — imported ${rec.slots} of
      ${rec.offered} value(s), ${esc(rec.rule)}${rec.dropped?.length ? ` · dropped ${rec.dropped.map((d) => esc(d)).join(', ')}` : ''}</p>
      <div class="portal-table-scroll">
        <table class="portal-wcag">
          <thead><tr><th>Token</th><th>Value</th><th>From the design</th></tr></thead>
          <tbody>
            ${rec.taken.map((t) => `<tr><td><code>${esc(t.token)}</code></td><td><code>${esc(t.value)}</code></td><td>${esc(t.name)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>`).join('') : '<p class="muted">No family had enough values to import.</p>'}
    ${scales.short?.length ? `
      <p class="muted"><strong>Not imported</strong> — stayed on this repo's contract defaults because
      the design offered fewer values than the family has slots:
      ${scales.short.map((s) => `${esc(FAMILY_LABEL[s.family] || s.family)} (offered ${s.offered}, needs ${s.needs})`).join(' · ')}</p>` : ''}
    ${scales.unclassified?.length ? `
      <p class="muted">Read but not classified into a family, so not imported:
      ${scales.unclassified.map((u) => `<code>${esc(u)}</code>`).join(' ')}</p>` : ''}`;
}

function renderReport(pack) {
  const failing = pack.failures.length;
  $('#figma-status').textContent = `Wrote ${pack.dest} — ${pack.tokenCount} tokens, ${pack.checks.length - failing}/${pack.checks.length} WCAG pairs pass.`;
  $('#figma-report').innerHTML = `
    <h3 class="h3">What this run did</h3>
    <p class="muted">
      Read <code>${esc(pack.exportPath)}</code> (${esc(pack.fileName ?? '')}) → wrote <code>${esc(pack.dest)}</code>.<br />
      Ramps in the file: ${pack.available.map((r) => `<code>${esc(r)}</code>`).join(' · ')}
      ${pack.pages ? `<br />Pages read: ${esc(pack.pages.read.map((p) => p.name).join(', '))}` : ''}
      ${pack.derivedUsed.length ? `<br /><strong>Rung numbers derived, not read</strong> for ${pack.derivedUsed.map((h) => `<code>${esc(h)}</code>`).join(' · ')} — ordered by OKLCH lightness. The numbers are the importer's; the colours are the design's.` : ''}
    </p>

    <h3 class="h3">Mapped from the design — ${pack.placed.length} tokens</h3>
    <div class="portal-table-scroll">
      <table class="portal-wcag">
        <thead><tr><th>Token</th><th>Value</th><th>Where it came from</th></tr></thead>
        <tbody>
          ${pack.placed.map((p) => `
            <tr>
              <td><code>${esc(p.token)}</code></td>
              <td><span class="portal-swatch-chip portal-swatch-chip-sm" style="${swatchStyle(pack.values[p.token])}"></span> <code>${esc(pack.values[p.token])}</code></td>
              <td>${esc(p.source)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <h3 class="h3">WCAG — ${pack.checks.length - failing}/${pack.checks.length} pairs pass</h3>
    <div class="portal-table-scroll">
      <table class="portal-wcag">
        <thead><tr><th></th><th>Ratio</th><th>Min</th><th>Pair</th></tr></thead>
        <tbody>
          ${pack.checks.map((c) => `
            <tr data-pass="${c.pass}">
              <td>${c.pass ? '✓' : '✗'}</td>
              <td>${esc(c.ratio)}</td>
              <td>${esc(c.min)}</td>
              <td><code>${esc(c.fg)}</code> on <code>${esc(c.bg)}</code></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${failing ? `<p class="muted"><strong>${failing} pair(s) still failing</strong> — no value this design offers satisfies them. The pack ships saying so in its header.</p>` : ''}

    ${pack.stepped.length ? `
      <h3 class="h3">Contrast negotiated within the design's own ramps</h3>
      <ul class="muted">
        ${pack.stepped.map((s) => `<li><code>${esc(s.token)}</code>: ${esc(s.ramp)}/${esc(s.from)} (${esc(s.fromValue)}) → ${esc(s.ramp)}/${esc(s.to)} (${esc(s.toValue)})</li>`).join('')}
      </ul>` : '<p class="muted">No contrast negotiation was needed — every nominal rung passed as mapped.</p>'}

    ${pack.collapsed.length ? `
      <h3 class="h3">Too few rungs for a distinct state colour</h3>
      <ul class="muted">${pack.collapsed.map((c) => `<li><code>${esc(c.token)}</code> repeats <code>${esc(c.twin)}</code> — the ramp holds nothing else to move to.</li>`).join('')}</ul>` : ''}

    ${renderScales(pack.scales)}

    <h3 class="h3">Auto-filled from contract defaults — ${pack.filled.length} tokens</h3>
    <p class="muted">Not read from the design. These are the repo's own values, and this is the full list:</p>
    <p class="portal-filled">${pack.filled.map((t) => `<code>${esc(t)}</code>`).join(' ')}</p>

    <h3 class="h3">The pack header, verbatim</h3>
    <pre>${esc(pack.note)}</pre>

    <h3 class="h3">To keep it</h3>
    <p class="muted">
      Commit <code>${esc(pack.dest)}</code>. A new pack under <code>system/</code> changes
      <code>loc-summary.json</code>, so regenerate it and the approach VR baselines in the same commit:<br />
      <code>node agent-layer/gen-loc-summary.mjs</code> ·
      <code>cd tooling/visual-regression &amp;&amp; npm run update:docker</code>
    </p>`;
}

/* ---------- compose a view: /build's ten answers brief a real composition run (#140) ---------- */
// Everything the surface says about the rules is driven by what /api/build/config serves —
// the questions, their reasoning, the quadrant meanings and, critically, WHICH answers reach the
// agent. A hardcoded pair here would be a claim the gate cannot keep true.
const builder = { config: null, answers: null, draft: null, running: false, seq: 0 };

$('#btn-builder').addEventListener('click', async () => {
  $('#builder-drawer').hidden = false;
  $('#builder-scenario').focus(); // the drawer's first control, same reasoning as the figma drawer
  if (!builder.config) await loadBuilderConfig();
});
$('#builder-cancel').addEventListener('click', () => { $('#builder-drawer').hidden = true; });

async function loadBuilderConfig() {
  $('#builder-status').textContent = 'Loading the question config…';
  try {
    builder.config = await api('/api/build/config');
  } catch (err) {
    $('#builder-status').textContent = `Could not load the questions: ${err.message}`;
    return;
  }
  const c = builder.config;
  builder.answers = { ...c.defaults };
  const inputTerms = c.questionInputs.map((id) => esc(c.summaryTerms[id]));
  $('#builder-inputs-note').innerHTML =
    `<strong>${inputTerms.join('</strong> and <strong>')}</strong> are the only two answers that ` +
    `reach the agent. The other ${c.questions.length - c.questionInputs.length} enter no prompt — ` +
    `they are the ethics record shown beside the run.`;
  $('#builder-scenario').innerHTML = c.scenarios
    .map((s) => `<option value="${esc(s.slug)}"${s.composable ? '' : ' data-refused="1"'}>${esc(s.name)}${s.composable ? '' : ' — not composable'}</option>`)
    .join('');
  renderBuilderQuestions();
  $('#builder-status').textContent = c.hasToken
    ? 'Auth: token from portal/.env.'
    : 'Auth: the Claude CLI login on this Mac (no token in portal/.env).';
  await refreshDraft();
}

function renderBuilderQuestions() {
  const c = builder.config;
  const isInput = (id) => c.questionInputs.includes(id);
  let act = null;
  const parts = [];
  for (const q of c.questions) {
    if (q.act !== act) {
      act = q.act;
      parts.push(`<p class="card-kicker builder-act">${esc(c.acts[act]?.label || act)}</p>`);
    }
    parts.push(`
      <fieldset class="builder-q${isInput(q.id) ? ' is-input' : ''}">
        <legend>${esc(q.prompt)}${isInput(q.id) ? ' <span class="portal-chip builder-chip">reaches the agent</span>' : ''}</legend>
        <p class="muted builder-reasoning">${esc(q.reasoning)}</p>
        ${q.options.map((o) => `
          <label class="builder-opt">
            <input type="radio" name="q-${esc(q.id)}" value="${esc(o.value)}"${builder.answers[q.id] === o.value ? ' checked' : ''} />
            ${esc(o.label)}
          </label>`).join('')}
      </fieldset>`);
  }
  $('#builder-questions').innerHTML = parts.join('');
  $('#builder-questions').querySelectorAll('input[type=radio]').forEach((el) =>
    el.addEventListener('change', () => {
      builder.answers[el.name.slice(2)] = el.value;
      refreshDraft();
    })
  );
}

$('#builder-scenario').addEventListener('change', () => {
  $('#builder-slot').innerHTML = '';
  resetBuilderEdits(); // a different scenario means a different subject — the old edit is about nothing
  refreshDraft();
});
$('#builder-slot').addEventListener('change', () => refreshDraft());

// AN EDIT IS NOT OVERWRITTEN BY A DRAFT THAT CANNOT HAVE CHANGED. draftQuestion reads only `shape`
// and `action` (rule 3, gated byte-for-byte in build-checks group 8), and the slot is not a
// parameter at all — so for eight of the ten answers and for every slot switch, refreshDraft
// re-fetches a question that is provably identical and would clobber the operator's edit with it.
// The textarea's own label invites that edit ("edit it before you spend a run"), and the plan's
// stated check is the operator reading it before spending a real run; resetting it under them
// defeats the check with the code that renders it.
//
// TWO flags, not one: the slug is derived (scenario-shape-slot), so a slot switch SHOULD refresh it
// while the edited question survives the same switch. Both fields are static markup in index.html —
// only #builder-questions is re-rendered — so these listeners attach once and stay attached.
let questionTouched = false;
let slugTouched = false;
$('#builder-question').addEventListener('input', () => { questionTouched = true; });
$('#builder-slug').addEventListener('input', () => { slugTouched = true; });
function resetBuilderEdits() { questionTouched = false; slugTouched = false; }

// A capability the operator cannot exercise is not offered at all — no Run button that fails on
// click. The same rule system/instance.mjs:360 follows for the prototype slot.
//
// `clear` is false on the TRANSIENT-failure path. Emptying both fields is right for a scenario that
// is not composable — there is no question to draft for it — but a /api/build/draft blip (a server
// restart mid-session) hitting the same code would destroy typed input recoverable from nowhere.
function setBuilderComposable(yes, { clear = true } = {}) {
  $('#builder-run').hidden = !yes;
  for (const sel of ['#builder-slot', '#builder-question', '#builder-slug', '#builder-dry']) $(sel).disabled = !yes;
  if (yes || !clear) return;
  $('#builder-bounds').textContent = '';
  $('#builder-verdict').innerHTML = '';
  $('#builder-question').value = '';
  $('#builder-slug').value = '';
  resetBuilderEdits(); // the fields are empty now, so nothing is "touched"
}

async function refreshDraft() {
  if (!builder.config || builder.running) return;
  const scenario = $('#builder-scenario').value;
  const entry = builder.config.scenarios.find((s) => s.slug === scenario);
  // The refusal verbatim: loadComposeConfig's message is the only spec for compose.json the
  // operator gets at this moment, so it is shown as written rather than paraphrased.
  if (entry && !entry.composable) {
    builder.draft = null;
    $('#builder-scenario-note').textContent = entry.reason;
    return setBuilderComposable(false);
  }
  const seq = ++builder.seq;
  try {
    const d = await api('/api/build/draft', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scenario, answers: builder.answers, slot: $('#builder-slot').value || undefined }),
    });
    if (seq !== builder.seq) return; // a later answer change already won the race
    builder.draft = d;
    $('#builder-scenario-note').textContent = '';
    setBuilderComposable(true);
    renderDraft(d);
  } catch (err) {
    if (seq !== builder.seq) return;
    builder.draft = null;
    $('#builder-scenario-note').textContent = err.message;
    setBuilderComposable(false, { clear: false }); // a blip must not eat the operator's typing
  }
}

function renderDraft(d) {
  $('#builder-slot').innerHTML = d.slots
    .map((s) => `<option value="${esc(s)}"${s === d.slot ? ' selected' : ''}>${esc(s)}</option>`).join('');
  // The slot's bounds VERBATIM from the scenario's compose.json — this is what the agent is held
  // to, so a paraphrase here would be the surface disagreeing with the prompt.
  $('#builder-bounds').textContent = d.bounds;
  if (!questionTouched) $('#builder-question').value = d.question;
  if (!slugTouched) $('#builder-slug').value = d.defaultSlug;
  const inputs = builder.config.questionInputs;
  $('#builder-verdict').innerHTML = `
    <h3 class="h3">The ethics record — shown, never blocking</h3>
    <p class="muted"><strong>${esc(d.verdict.quadrant)}</strong> — ${esc(d.verdict.meaning)}</p>
    <p class="muted">Frequency gate ${d.verdict.frequency.passes ? '✓' : '✗'} — ${esc(d.verdict.frequency.verdict)}</p>
    <div class="portal-table-scroll">
      <table class="portal-wcag">
        <thead><tr><th>Answer</th><th>Value</th><th>Reaches the agent</th></tr></thead>
        <tbody>
          ${d.verdict.summary.map((s) => `
            <tr><td>${esc(s.term)}</td><td>${esc(s.value)}</td><td>${inputs.includes(s.id) ? 'yes' : '—'}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="muted">Reading <code>${esc(d.subject)}</code> · fixed today <code>${esc(d.today)}</code> ·
      fixtures ${d.fixtures.map((f) => `<code>${esc(f.name)}</code>`).join(' ')}</p>`;
}

// textContent, not innerHTML: every line here comes from a model or from disk, and a log is the
// one place a stray tag would be easiest to miss.
function builderLog(cls, text) {
  const li = document.createElement('li');
  li.className = `builder-log-line is-${cls}`;
  li.textContent = text;
  $('#builder-log').appendChild(li);
  $('#builder-log').scrollTop = $('#builder-log').scrollHeight;
}

function setBuilderRunning(running) {
  builder.running = running;
  $('#builder-run').disabled = running;
  $('#builder-run').textContent = running ? 'Recording…' : 'Run';
}

$('#builder-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (builder.running || !builder.draft) return;
  const dry = $('#builder-dry').checked;
  const body = {
    scenario: $('#builder-scenario').value,
    answers: builder.answers,
    question: $('#builder-question').value,
    slot: $('#builder-slot').value,
    slug: $('#builder-slug').value.trim(),
    dry,
  };
  setBuilderRunning(true);
  $('#builder-log').innerHTML = '';
  $('#builder-report').innerHTML = '';
  // No client timeout: a real run is 2–5 minutes and the stream ends on `done` or `error`.
  $('#builder-status').textContent = dry
    ? 'Recording a dry run — a full agent run over the real fixtures that writes nothing to traces/. A few minutes, and it spends real tokens.'
    : 'Recording the real run — a few minutes, and it spends real tokens.';
  try {
    const res = await fetch('/api/build/run', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(res.statusText);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let phase = null;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
        if (!chunk.startsWith('data: ')) continue;
        const ev = JSON.parse(chunk.slice(6));
        if (ev.type === 'error') { $('#builder-status').textContent = ev.message; continue; }
        if (ev.type === 'done') { renderBuilderResult(ev.result); continue; }
        if (ev.phase && ev.phase !== phase) { phase = ev.phase; builderLog('phase', `— ${phase} —`); }
        if (ev.kind !== 'tool') continue;
        const bits = [ev.tool || 'tool'];
        if (ev.denied) bits.push('denied by the fence');
        else if (ev.ok === false) bits.push('failed');
        if (ev.artifact) bits.push(`→ ${ev.artifact}`);
        builderLog(ev.denied ? 'denied' : 'tool', bits.join(' · '));
      }
    }
  } catch (err) {
    $('#builder-status').textContent = `Failed: ${err.message}`;
  } finally {
    setBuilderRunning(false);
  }
});

function renderBuilderResult(r) {
  const cost = `~$${Number(r.stats?.costUsd ?? 0).toFixed(4)}`;
  const paths = Object.entries(r.paths || {}).filter(([, v]) => v);
  $('#builder-status').textContent = r.ok
    ? (r.dry
      ? `Dry run clean — the drafted question is answerable from these fixtures. Nothing was written to traces/. ${cost}`
      : `Shipped ${r.slug} — ${cost}`)
    : `Refused (${r.reason}) — nothing shippable was kept. ${cost}`;
  const stats = r.stats || {};
  $('#builder-report').innerHTML = `
    <h3 class="h3">${r.ok ? 'The run' : 'The run was refused'}</h3>
    <p class="muted">
      ${esc(r.scenario)} · slot <code>${esc(r.slot)}</code>${r.dry ? ' · <strong>DRY (not shipped)</strong>' : ''}<br />
      ${stats.steps} steps · phases ${esc((stats.phases || []).join(' → ') || '(none)')} ·
      ${stats.nullPhaseSteps} null-phase · ${stats.artifacts} artifact(s) · ${stats.denials} denied by the fence
      ${stats.nodes ? ` · ${stats.nodes} node(s)` : ''}${stats.entries ? ` · manifest: ${stats.entries} entries` : ''}
    </p>
    <p class="muted">The question that was answered:</p>
    <pre>${esc(r.question)}</pre>
    ${paths.length ? `<h3 class="h3">On disk</h3><p class="muted">${paths.map(([k, v]) => `${esc(k)}: <code>${esc(v)}</code>`).join('<br />')}</p>` : ''}
    ${!r.ok ? `<p class="muted">The runner dropped the shippable artifacts and kept the raw trace to read.
      A weak run is fixed by rewording the question and re-running — <strong>never</strong> by editing a
      composition or a JSONL (the honesty contract).</p>` : ''}
    ${r.ok && !r.dry ? `
      <h3 class="h3">To keep it</h3>
      <p class="muted">Commit the four generated paths above, unedited. Then, from the jobs folder, the
      instance build picks the new view up through the scenario's manifest:</p>
      <pre>node ../ux-factory/agent-layer/build-instance.mjs &lt;brief.md&gt; --out &lt;dir&gt; \\
  --pack &lt;tokens.&lt;slug&gt;.css&gt; --trace &lt;derivation.jsonl&gt; \\
  --compositions proto/compositions/${esc(r.scenario)}</pre>
      <p class="muted">Deploy stays a human step — this drawer prints the command, it does not run it.</p>` : ''}`;
}

/* ---------- chat ---------- */
$('#btn-chat').addEventListener('click', () => { $('#chat').hidden = false; $('#chat-input').focus(); });
$('#chat-close').addEventListener('click', () => { $('#chat').hidden = true; });
function updateChatContext() {
  $('#chat-context').textContent = `chat · ${state.activeSlug || 'global'}`;
}
function chatLine(cls, text) {
  const el = document.createElement('div');
  el.className = `chat-msg ${cls}`;
  el.textContent = text;
  $('#chat-log').appendChild(el);
  $('#chat-log').scrollTop = $('#chat-log').scrollHeight;
  return el;
}
$('#chat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = $('#chat-input').value.trim();
  if (!message) return;
  $('#chat-input').value = '';
  chatLine('user', message);
  const res = await fetch('/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, slug: state.activeSlug }),
  });
  if (!res.ok) return chatLine('tool', `error: ${res.statusText}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
      if (!chunk.startsWith('data: ')) continue;
      const ev = JSON.parse(chunk.slice(6));
      if (ev.type === 'text') chatLine('assistant', ev.text);
      else if (ev.type === 'tool') chatLine('tool', `⚙ ${ev.name}${ev.hint ? ' · ' + ev.hint : ''}`);
      else if (ev.type === 'error') chatLine('tool', `error: ${ev.message}`);
      else if (ev.type === 'done' && state.activeSlug) renderCard(state.activeSlug); // findings may have landed
    }
  }
});

/* ---------- discovery: one banked question, one op, one run package (#284) ---------- */
// Everything this drawer says about the bank, the depths and the postures is driven by
// /api/discovery/config. What that route does NOT serve is each question's weak-answer note — it is
// the AGENT's rubric, and showing it beside the question would tell the person the answer. The route
// strips it server-side, so this surface cannot render it even by mistake; there is no discipline to
// keep here, which is the point.
//
// The cursor and the recorded turns are read from the SESSION (disk), never accumulated client-side.
// A page reload therefore loses nothing, and there is no second copy to drift (AC #5, AC #10).
const discovery = { config: null, session: null, running: false, proposals: null };

const discoveryEls = () => ({
  slug: $('#discovery-slug').value.trim(),
  provenance: $('#discovery-provenance').value,
  depth: $('#discovery-depth').value,
  posture: $('#discovery-posture').value,
});

$('#btn-discovery').addEventListener('click', async () => {
  $('#discovery-drawer').hidden = false;
  $('#discovery-slug').focus();
  if (!discovery.config) await loadDiscoveryConfig();
});
for (const id of ['#discovery-cancel', '#discovery-cancel-2'])
  $(id).addEventListener('click', () => { $('#discovery-drawer').hidden = true; });

async function loadDiscoveryConfig() {
  $('#discovery-start-status').textContent = 'Loading the bank…';
  try {
    discovery.config = await api('/api/discovery/config');
  } catch (err) {
    $('#discovery-start-status').textContent = `Could not load the bank: ${err.message}`;
    return;
  }
  const c = discovery.config;
  // NO DEFAULT (#338 F3). The select used to open on `fictional`, which is the COMMITTING one — a
  // real product's discovery session lands in a public repo, and the only thing preventing it is the
  // operator noticing a control they never touched. The placeholder carries an empty value, so the
  // guard in the Start handler and the server's own resolveRunRoot both refuse it; picking is an act.
  $('#discovery-provenance').innerHTML = [
    '<option value="" selected>Choose one — it decides where the package lands</option>',
    ...c.provenances.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`),
  ].join('');
  $('#discovery-depth').innerHTML = c.depths
    .map((d) => `<option value="${esc(d.id)}">${esc(d.label)} — ${d.count} questions</option>`).join('');
  $('#discovery-posture').innerHTML = c.postures
    .map((p) => `<option value="${esc(p.id)}">${esc(p.label)} (${esc(p.model)})</option>`).join('');
  renderDiscoveryNotes();
  await renderDiscoveryBuild();
  $('#discovery-start-status').textContent = c.hasToken
    ? `Auth: token from portal/.env. ${c.questions.length} questions in the bank.`
    : `Auth: the Claude CLI login on this Mac (no token in portal/.env). ${c.questions.length} questions in the bank.`;
}

// Which commit the PROCESS booted from, against the tree's HEAD (#338 F2). Run 0's Phase A found a
// portal serving pre-review code for two days; nothing surfaced it, and the operator had to read `ps`
// start times against a git log to see it. A stale portal now says so before a session is started.
async function renderDiscoveryBuild() {
  const el = $('#discovery-portal-build');
  let h;
  try { h = await api('/api/health'); } catch { el.textContent = 'Portal build: unknown — /api/health did not answer.'; return; }
  if (!h.bootSha) { el.textContent = 'Portal build: unknown — this checkout is not a git repository.'; return; }
  el.textContent = h.stale
    ? `⚠ This portal is running code from ${h.bootSha.slice(0, 7)}; the tree is on ${h.headSha.slice(0, 7)}. Node caches modules at import, so restarting it is the only way to pick the tree up — a run recorded now is a run against the older code.`
    : `Portal build: ${h.bootSha.slice(0, 7)} — the commit this process booted from, and the tree's HEAD.`;
}

// Provenance decides where the package lands, and it is the privacy boundary rather than a label —
// so the surface states the consequence rather than the word.
function renderDiscoveryNotes() {
  const c = discovery.config;
  const p = $('#discovery-provenance').value;
  // THREE branches, not two: with the placeholder selected, a two-branch ternary would fall through
  // to the `real` note and tell the operator their package is safe outside the repo before they have
  // chosen anything (#338 F3).
  $('#discovery-provenance-note').textContent = p === 'fictional'
    ? 'Fictional — the package is written to discovery/<slug>/ in this repo and committed as evidence.'
    : p === 'real'
      ? 'Real — the package is written to the jobs folder, outside this repo, and is never committed here.'
      : 'Provenance has no default, because the wrong one is not recoverable by git: fictional commits the package into this public repo, real writes it outside. Pick one.';
  const d = c.depths.find((x) => x.id === $('#discovery-depth').value);
  $('#discovery-depth-note').textContent = d ? `${d.count} questions — for ${d.when}.` : '';
}
for (const id of ['#discovery-provenance', '#discovery-depth'])
  $(id).addEventListener('change', renderDiscoveryNotes);

$('#discovery-open').addEventListener('click', async () => {
  const { slug, provenance, depth, posture } = discoveryEls();
  if (!slug) { $('#discovery-start-status').textContent = 'A run slug is needed — it names the package directory.'; return; }
  if (!provenance) { $('#discovery-start-status').textContent = 'Pick a provenance before starting — fictional commits the package into this repo, real writes it to the jobs folder outside. There is no default (#338 F3).'; return; }
  $('#discovery-start-status').textContent = 'Opening…';
  try {
    discovery.session = await api('/api/discovery/session', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, provenance, entryMode: 'blank-idea', depth, branch: null, frontEnd: 'portal', posture }),
    });
  } catch (err) {
    $('#discovery-start-status').textContent = `Refused: ${err.message}`;
    return;
  }
  $('#discovery-start-status').textContent = discovery.session.answers.length
    ? `Resumed ${slug} from disk — ${discovery.session.answers.length} answer(s) already recorded.`
    : `Opened ${slug}.`;
  $('#discovery-start').disabled = true;
  renderDiscoverySession();
  // A resumed package may already carry proposals; read them from disk rather than waiting for a run.
  await loadProposals();
});

function renderDiscoverySession() {
  const s = discovery.session;
  if (!s) return;
  $('#discovery-session').hidden = false;
  const { cursor, head } = s;
  const depth = discovery.config.depths.find((d) => d.id === head.depth);

  if (head.endedAt) {
    $('#discovery-position').textContent = `${head.slug} · finished ${head.endedAt}`;
    $('#discovery-question').textContent = 'This session is closed.';
    $('#discovery-attribution').textContent = `${cursor.index} of ${cursor.total} answered. The package is on disk at ${head.root}.`;
  } else if (cursor.done) {
    $('#discovery-position').textContent = `${head.slug} · ${esc(depth?.label ?? head.depth)}`;
    $('#discovery-question').textContent = 'Every question in this depth has been answered.';
    $('#discovery-attribution').textContent = 'Finish the session to record when it ended.';
  } else {
    $('#discovery-position').textContent =
      `${head.slug} · ${depth?.label ?? head.depth} · question ${cursor.index + 1} of ${cursor.total} · turn ${cursor.turn}`;
    $('#discovery-question').textContent = cursor.question.text;
    $('#discovery-attribution').textContent = `Stage ${cursor.question.stage} · ${cursor.question.attribution}`;
  }
  const answerable = !head.endedAt && !cursor.done;
  $('#discovery-answer').disabled = !answerable;
  $('#discovery-submit').disabled = !answerable || discovery.running;
  $('#discovery-finish').disabled = Boolean(head.endedAt);
  renderDiscoveryRecorded();
  renderProposals();
  // Both #359 controls need a FINISHED package: the propose route refuses an open one by name, and
  // there is nothing to download before a run. Disabled rather than hidden, because `el.hidden` is a
  // no-op wherever a CSS rule sets display and this drawer sets plenty.
  $('#discovery-propose').disabled = discovery.running || !head.endedAt;
  $('#discovery-proposals-md').disabled = !head.endedAt;
}

// AC #10 — the turns already recorded, read from the package. Each answer is shown with what the
// agent filed against it, so "what did it record about what I said" is answerable without opening a
// JSONL. The answer text is the person's own and is shown verbatim; the ops are the applier's.
function renderDiscoveryRecorded() {
  const s = discovery.session;
  const byRef = new Map();
  for (const line of s.transcript) {
    if (line.type !== 'op') continue;
    const ref = line.params?.answer_ref;
    if (!ref) continue;
    if (!byRef.has(ref)) byRef.set(ref, []);
    byRef.get(ref).push(line);
  }
  if (!s.answers.length) { $('#discovery-recorded').innerHTML = ''; return; }
  $('#discovery-recorded').innerHTML = `
    <h3 class="h3">Recorded so far</h3>
    ${s.answers.map((a) => {
      const ops = byRef.get(a.ref) || [];
      return `
        <div class="discovery-recorded-turn">
          <p class="card-kicker">${esc(a.turn)} · ${esc(a.ref)} · ${esc(a.question_id ?? 'off-script')}</p>
          <p class="discovery-recorded-answer">${esc(a.text)}</p>
          ${ops.length
            ? `<ul class="discovery-recorded-ops">${ops.map((o) => `<li>${esc(o.op)}${o.closes ? ' · closed the turn' : ''}${o.flagged?.length ? ` · flagged ${esc(o.flagged.join(', '))}` : ''}${o.supersedes ? ` · supersedes seq ${o.supersedes}` : ''}</li>`).join('')}</ul>`
            : '<p class="muted">Nothing filed against this answer yet.</p>'}
        </div>`;
    }).join('')}`;
}

/* ---------- #359: the proposals and the owner's verdict ---------- */

// Read from DISK, never from a stream's last word: the package is the state. The route serves
// proposals.mjs's exported whitelist, so this function holds no shape opinion of its own.
async function loadProposals() {
  const { slug, provenance } = discoveryEls();
  if (!slug || !provenance) { discovery.proposals = null; return; }
  try { discovery.proposals = await api(`/api/discovery/proposals?slug=${encodeURIComponent(slug)}&provenance=${encodeURIComponent(provenance)}`); }
  catch { discovery.proposals = null; }
  renderProposals();
}

// A model wrote the title, the why, the rests_on and the wrong_if; the verdict is the owner's. The
// page says so, and so does this. Every string through esc().
function renderProposals() {
  const v = discovery.proposals;
  const mount = $('#discovery-proposals');
  if (!mount) return;
  if (!v || !v.proposals?.length) { mount.innerHTML = ''; return; }
  const bySeq = new Map((v.decisions ?? []).map((d) => [d.seq, d]));
  const counts = v.counts ?? {};
  mount.innerHTML = `
    <h3 class="h3">Proposals — ${v.proposals.length}</h3>
    <p class="muted">A model proposed these from what the run recorded. They are options: nothing here
    is a decision, none of it is in <code>prd.md</code>, and accepting one records that you liked it
    and nothing more. ${Object.keys(counts).map((k) => `${esc(k)} ${counts[k]}`).join(' · ')}</p>
    ${v.proposals.map((row) => {
      const p = row.proposal;
      const rests = (p.rests_on ?? []).map((seq) => {
        const d = bySeq.get(seq);
        return `seq ${seq}${d ? ` (${esc(d.level)} · ${esc(d.question_id ?? 'off-script')})` : ' — not in this ledger'}`;
      }).join(' · ');
      return `
        <div class="discovery-proposal" data-proposal="${esc(p.id)}">
          <p class="card-kicker">${esc(p.id)} · ${esc(row.status)} · ${esc(p.model)}</p>
          <p><strong>${esc(p.title)}</strong></p>
          <p class="discovery-proposal-why">${esc(p.why)}</p>
          <p class="discovery-proposal-meta">Rests on: ${rests || 'none'}<br>Wrong if: ${esc(p.wrong_if)}</p>
          ${(row.verdicts ?? []).map((x) => `<p class="discovery-proposal-meta">Verdict: <strong>${esc(x.verdict)}</strong> — ${esc(x.reason)} · ${esc(x.ts)}</p>`).join('')}
          <div class="discovery-verdict-row">
            <input type="text" placeholder="Why — the reason is the record" data-reason="${esc(p.id)}">
            ${Object.keys(counts).filter((k) => k !== 'proposed').map((k) => `<button class="btn btn-secondary" type="button" data-verdict="${esc(k)}" data-for="${esc(p.id)}">${esc(k)}</button>`).join('')}
          </div>
        </div>`;
    }).join('')}`;
}

// ONE fenced run over a FINISHED package. The proposals stream as they are filed and every refusal
// streams too — refusals are kept nowhere else, so the log is where the operator reads them.
$('#discovery-propose').addEventListener('click', async () => {
  if (discovery.running) return;
  const { slug, provenance } = discoveryEls();
  if (!slug || !provenance) { $('#discovery-status').textContent = 'A slug and a provenance are needed to find the package.'; return; }
  discovery.running = true;
  $('#discovery-propose').disabled = true;
  $('#discovery-log').innerHTML = '';
  $('#discovery-status').textContent = 'Proposing from the finished package — this spends real tokens. Nothing in the run record is written.';
  try {
    const res = await fetch('/api/discovery/propose', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, provenance }),
    });
    if (!res.ok) throw new Error(res.statusText);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let done = null;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buf += dec.decode(chunk.value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const frame = buf.slice(0, idx); buf = buf.slice(idx + 2);
        if (!frame.startsWith('data: ')) continue;
        const ev = JSON.parse(frame.slice(6));
        if (ev.type === 'error') { $('#discovery-status').textContent = ev.message; continue; }
        if (ev.type === 'done') { done = ev; continue; }
        if (ev.type === 'proposal') discoveryLog('op', `filed ${ev.id}: ${ev.title} (rests on seq ${(ev.rests_on ?? []).join(', ')})`);
        if (ev.type === 'refused') discoveryLog('denied', `refused: ${ev.error}`);
        if (ev.type === 'denied') discoveryLog('denied', `fence refused: ${ev.tool} — ${ev.error}`);
        if (ev.type === 'text') discoveryLog('text', ev.text);
      }
    }
    const s = done?.stats;
    $('#discovery-status').textContent = s
      ? `Run ${s.ok ? 'complete' : 'FAILED'} — ${s.numTurns} turn(s), $${(s.costUsd ?? 0).toFixed(4)}, ${done.refusals.length} refusal(s). The refusals are in the log above and nowhere else.`
      : 'The run produced no result message.';
  } catch (err) {
    $('#discovery-status').textContent = `Could not propose: ${err.message}`;
  } finally {
    discovery.running = false;
    await loadProposals();
    renderDiscoverySession();
  }
});

// The verdict, server-written on a click: the client sends the id, the verdict and the reason, and
// `type` and `ts` are the server's. Disabled while in flight — a double click would append two
// verdict lines to an append-only file.
$('#discovery-proposals').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-verdict]');
  if (!btn || btn.disabled) return;
  const id = btn.dataset.for;
  const { slug, provenance } = discoveryEls();
  const reason = $(`input[data-reason="${id}"]`)?.value ?? '';
  if (!reason.trim()) { $('#discovery-status').textContent = `A reason is needed for ${id} — the reason is the record.`; return; }
  const row = btn.closest('.discovery-proposal');
  for (const b of row.querySelectorAll('button[data-verdict]')) b.disabled = true;
  try {
    // Re-read from disk rather than trusting the response: the package is the state.
    await api('/api/discovery/verdict', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, provenance, proposalId: id, verdict: btn.dataset.verdict, reason }),
    });
    await loadProposals();
    $('#discovery-status').textContent = `${id} — ${btn.dataset.verdict}. proposals.md is regenerated on every verdict.`;
  } catch (err) {
    $('#discovery-status').textContent = `Could not record the verdict: ${err.message}`;
    for (const b of row.querySelectorAll('button[data-verdict]')) b.disabled = false;
  }
});

// The page, without a terminal — the PRD control's reasoning, applied to the second artefact.
// Fetched rather than navigated to, so a refusal is readable prose in the drawer.
$('#discovery-proposals-md').addEventListener('click', async () => {
  const { slug, provenance } = discoveryEls();
  if (!slug || !provenance) { $('#discovery-status').textContent = 'A slug and a provenance are needed to find the package.'; return; }
  try {
    const res = await fetch(`/api/discovery/proposals.md?slug=${encodeURIComponent(slug)}&provenance=${encodeURIComponent(provenance)}`);
    if (!res.ok) {
      let m = res.statusText;
      try { m = (await res.json()).error ?? m; } catch { /* not JSON — keep the status text */ }
      throw new Error(m);
    }
    const md = await res.text();
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${slug}-proposals.md`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    $('#discovery-status').textContent = `Proposals projected — ${md.split('\n').length} lines. The package on disk is unchanged; this route only reads it.`;
  } catch (err) {
    $('#discovery-status').textContent = `Could not project the proposals: ${err.message}`;
  }
});

function discoveryLog(kind, text) {
  const li = document.createElement('li');
  li.className = `builder-log-line${kind === 'denied' ? ' is-denied' : ''}${kind === 'op' ? ' is-phase' : ''}`;
  li.textContent = text;
  $('#discovery-log').appendChild(li);
  $('#discovery-log').scrollTop = $('#discovery-log').scrollHeight;
}

$('#discovery-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (discovery.running || !discovery.session) return;
  const text = $('#discovery-answer').value;
  if (!text.trim()) { $('#discovery-status').textContent = 'An answer is needed before the turn can run.'; return; }
  const { slug, provenance } = discoveryEls();
  const questionId = discovery.session.cursor.question.id;

  discovery.running = true;
  $('#discovery-submit').disabled = true;
  $('#discovery-submit').textContent = 'Judging…';
  $('#discovery-log').innerHTML = '';
  $('#discovery-status').textContent = 'Your answer is on disk. The agent is judging it — this spends real tokens.';
  try {
    // No client timeout: a turn is seconds to a minute and the stream ends on `done` or `error`.
    const res = await fetch('/api/discovery/turn', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, provenance, questionId, text }),
    });
    if (!res.ok) throw new Error(res.statusText);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
        if (!chunk.startsWith('data: ')) continue;
        const ev = JSON.parse(chunk.slice(6));
        if (ev.type === 'error') { $('#discovery-status').textContent = ev.message; continue; }
        if (ev.type === 'done') { discovery.session = ev.view; continue; }
        if (ev.type === 'text') discoveryLog('text', ev.text + (ev.truncated ? ' […the rest is in transcript.jsonl]' : ''));
        if (ev.type === 'op') discoveryLog('op', `filed ${ev.op}${ev.closes ? ' · closed the turn' : ''}${ev.flagged?.length ? ` · flagged ${ev.flagged.join(', ')}` : ''}`);
        if (ev.type === 'denied') discoveryLog('denied', `refused: ${ev.tool} — ${ev.error}`);
      }
    }
    // Re-read from disk rather than trusting the stream's last word: the package is the state.
    discovery.session = await api(`/api/discovery/session?slug=${encodeURIComponent(slug)}&provenance=${encodeURIComponent(provenance)}`);
    $('#discovery-answer').value = '';
    $('#discovery-status').textContent = discovery.session.cursor.done
      ? 'That was the last question in this depth.'
      : 'Turn recorded. The next question is below.';
  } catch (err) {
    $('#discovery-status').textContent = `Failed: ${err.message}`;
  } finally {
    discovery.running = false;
    $('#discovery-submit').textContent = 'Submit answer';
    renderDiscoverySession();
  }
});

// The PRD, without a terminal (#338 F1). #290 shipped the fold CLI-only, so the honest description of
// the chain was "the session is entirely in the UI, and one terminal command afterwards produces the
// PRD" — which the epic's secondary user, an invited guest with no terminal, cannot complete at all.
// The route folds and streams; nothing is written into the package, so this control cannot damage a
// run. Fetched rather than navigated to, so a refusal is readable prose in the drawer instead of a
// downloaded JSON error.
$('#discovery-prd').addEventListener('click', async () => {
  const { slug, provenance } = discoveryEls();
  if (!slug || !provenance) { $('#discovery-status').textContent = 'A slug and a provenance are needed to find the package.'; return; }
  $('#discovery-status').textContent = 'Projecting the PRD…';
  try {
    const res = await fetch(`/api/discovery/prd?slug=${encodeURIComponent(slug)}&provenance=${encodeURIComponent(provenance)}`);
    if (!res.ok) {
      let msg = res.statusText;
      try { msg = (await res.json()).error ?? msg; } catch { /* not JSON — keep the status text */ }
      throw new Error(msg);
    }
    const md = await res.text();
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${slug}-prd.md`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    $('#discovery-status').textContent = `PRD projected — ${md.split('\n').length} lines. The package on disk is unchanged; this route only reads it.`;
  } catch (err) {
    $('#discovery-status').textContent = `Could not project the PRD: ${err.message}`;
  }
});

// AC #11 — endedAt lands through a control rather than a direct call, so a real session can be
// ended the way it was started.
$('#discovery-finish').addEventListener('click', async () => {
  if (discovery.running) return;
  const { slug, provenance } = discoveryEls();
  try {
    await api('/api/discovery/close', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, provenance }),
    });
    discovery.session = await api(`/api/discovery/session?slug=${encodeURIComponent(slug)}&provenance=${encodeURIComponent(provenance)}`);
    $('#discovery-status').textContent = `Session closed. The package is at ${discovery.session.head.root}.`;
    renderDiscoverySession();
  } catch (err) {
    $('#discovery-status').textContent = `Could not close: ${err.message}`;
  }
});

/* ---------- boot + routing ---------- */
async function loadCards() { state.cards = await api('/api/cards'); }
async function route() {
  const m = location.hash.match(/^#\/card\/([a-z0-9-]+)/);
  if (m) await renderCard(m[1]);
  else renderLibrary();
}
window.addEventListener('hashchange', route);
(async () => {
  try {
    const h = await api('/api/health');
    const build = h.bootSha ? `${h.stale ? '⚠ stale ' : ''}${h.bootSha.slice(0, 7)}` : 'no git';
    $('#health').textContent = `${h.cards} cards · chat ${h.hasToken ? 'ready (token)' : 'via CLI login'} · ${build}`;
  } catch { $('#health').textContent = 'server error'; }
  await loadCards();
  await route();
})();
