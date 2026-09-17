/* Life OS SoT-map — flade-first control plane; Life OS design tokens only. */
(function (global) {
  'use strict';

  const BAEREKRAFT = {
    baerer: { label: 'bærer', dash: '', op: 0.9, w: 2.2 },
    kun_udledt: { label: 'kun udledt', dash: '3 4', op: 0.45, w: 1.2 },
    'krydser_systemgrænse': { label: 'krydser systemgrænse', dash: '6 3', op: 0.75, w: 1.6 },
    endepunkt_mangler: { label: 'endepunkt mangler', dash: '1 5', op: 0.25, w: 1 },
  };
  const LAYERS = ['Register', 'Current', 'Cash', 'Arkiv'];
  const TAB_IDS = ['kilder', 'rygrade', 'relationer', 'ontologi', 'lag'];
  const VIEWS = [
    { id: 'kilder', name: 'Kilder',
      lead: 'Hvilke systemer kontrakten binder til rygrade og objekter — measured når rækken siger det selv, declared når pegepinden er erklæret. Klik et system eller en rygrad for at hoppe.' },
    { id: 'rygrade', name: 'Rygrade',
      lead: 'Forretningsspørgsmålene, ikke skemanavne. Hver rygrad viser hvor mange ontologiske objekter der er landet, delvist eller huller — målt af live-overlayet, ikke tegnet.' },
    { id: 'relationer', name: 'Relationer',
      lead: 'Kantens streg er bærekraft i kontrakten. Knudens ring er live status. Farve følger rygrad eller primær kildesystem. Klik en knude for at dæmpe resten.' },
    { id: 'ontologi', name: 'Ontologi',
      lead: 'Objekttyper med lag (Register · Current · Cash · Arkiv). Cash erstatter ikke Current. Statusringen er overlay; definitionen er kontrakt.' },
    { id: 'lag', name: 'Lag',
      lead: 'Dækning fordelt på Register, Current, Cash og Arkiv. Samme objekter som Ontologi-visningen, grupperet efter lag i stedet for rygrad.' },
  ];

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dk = (n) => (typeof n === 'number' ? n.toLocaleString('da-DK') : '—');
  const logW = (n) => Math.max(1, Math.min(9, Math.log10(Math.max(n || 1, 1)) * 2.1));

  function normalizeTab(tab) {
    return TAB_IDS.includes(tab) ? tab : 'kilder';
  }

  function spineColor(id) {
    const map = {
      HUSHOLD: 'var(--sot-spine-1)', BOLIG: 'var(--sot-spine-2)', MOBILITET: 'var(--sot-spine-3)',
      BESKYTTELSE: 'var(--sot-spine-4)', SKAT: 'var(--sot-spine-5)', FAELLES: 'var(--sot-spine-6)',
    };
    return map[id] || 'var(--text-muted)';
  }

  function systemColor(id) {
    const palette = [
      'var(--sot-spine-1)', 'var(--sot-spine-2)', 'var(--sot-spine-3)',
      'var(--sot-spine-4)', 'var(--sot-spine-5)', 'var(--sot-spine-6)',
      'var(--accent, #3d5a40)', 'var(--link, #2f5d7a)', 'var(--ok, #2a7a4b)', 'var(--warn, #9a6b1f)',
    ];
    let h = 0;
    const s = String(id || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }

  function statusStroke(status) {
    return ({ landet: 'var(--ok, #2a7a4b)', delvist: 'var(--warn, #b07a1a)', hul: 'var(--text-muted)' })[status] || 'var(--text-muted)';
  }

  function freshnessStroke(freshness) {
    return ({
      frisk: 'var(--ok, #2a7a4b)', gammel: 'var(--warn, #b07a1a)',
      koldt: 'var(--danger, #a33)', ukendt: 'var(--text-muted)',
    })[freshness] || 'var(--text-muted)';
  }

  function statusCounts(entities) {
    const out = { landet: 0, delvist: 0, hul: 0 };
    for (const e of entities || []) {
      const s = e.live?.status || 'hul';
      if (s === 'landet') out.landet++;
      else if (s === 'delvist') out.delvist++;
      else out.hul++;
    }
    return out;
  }

  function layoutNodes(model) {
    const L = model.layout?.laerred || { w: 960, h: 640 };
    const preset = model.layout?.nodes || {};
    const entities = model.entities || [];
    const cols = Math.max(3, Math.ceil(Math.sqrt(entities.length)));
    const nodes = entities.map((e, i) => {
      const p = preset[e.id];
      const col = i % cols, row = Math.floor(i / cols);
      return {
        id: e.id, name: e.name, spine: (e.spines || [])[0],
        primary_system: e.primary_system,
        status: e.live?.status || 'hul',
        layer: e.layer,
        definition: e.definition,
        x: p?.x ?? (80 + col * ((L.w - 100) / cols)),
        y: p?.y ?? (70 + row * ((L.h - 80) / Math.ceil(entities.length / cols))),
        r: p?.r ?? 30,
      };
    });
    return { nodes, laerred: L };
  }

  function syncHash(tab) {
    const next = '#/ontologi/' + tab;
    if (location.hash !== next) {
      if (location.hash.replace(/^#\/?/, '').startsWith('ontologi')) {
        history.pushState(null, '', next);
      } else {
        location.hash = next;
      }
    }
  }

  function renderKobling(model, state) {
    const systems = model.systems || [];
    const spines = model.spines || [];
    const links = model.source_links || [];
    const entities = model.entities || [];
    const highlight = state.highlightSystem || null;
    const RH = 42, RG = 10, TOP = 46, BUND = 16, bH = 62;
    const H = Math.max(systems.length * (RH + RG), spines.length * (bH + RG)) + TOP + BUND;
    const KX = 8, KB = 178, BX = 400, BB = 212, OX = 724, OB = 268, W = 1000;
    const kY = (i) => TOP + i * (RH + RG);
    const bTop = TOP + Math.max(0, (H - TOP - BUND - spines.length * (bH + RG)) / 2);
    const bY = (i) => bTop + i * (bH + RG);
    const spineIds = new Set(spines.map((s) => s.id));

    const edgePaths = links.filter((l) => spineIds.has(l.target)).map((e) => {
      const si = systems.findIndex((s) => s.id === e.system);
      const pi = spines.findIndex((s) => s.id === e.target);
      if (si < 0 || pi < 0) return '';
      const y1 = kY(si) + RH / 2, y2 = bY(pi) + bH / 2;
      const x1 = KX + KB, x2 = BX, m = (x1 + x2) / 2;
      const w = logW(e.live_weight || e.weight || 1);
      const dash = e.kind === 'declared' ? '5 4' : '';
      const dim = highlight && e.system !== highlight;
      const op = (e.kind === 'declared' ? 0.38 : 0.6) * (dim ? 0.15 : 1);
      const weightNote = e.live_weight != null ? dk(e.live_weight) : 'vægt ikke målt';
      return `<path d="M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2}" fill="none" stroke="${spineColor(e.target)}" stroke-width="${w}" stroke-dasharray="${dash}" opacity="${op}"><title>${esc(e.system)} → ${esc(e.target)} · ${esc(e.kind)} · ${weightNote}</title></path>`;
    }).join('');

    const toOnto = spines.map((s, i) => {
      const mine = entities.filter((e) => (e.spines || []).includes(s.id));
      if (!mine.length) return '';
      const y = bY(i) + bH / 2, m = (BX + BB + OX) / 2;
      return `<path d="M${BX + BB},${y} C${m},${y} ${m},${y} ${OX},${y}" fill="none" stroke="${spineColor(s.id)}" stroke-width="${logW(mine.length * 60)}" opacity="0.45"/>`;
    }).join('');

    const sysNodes = systems.map((s, i) => {
      const live = s.live || {};
      const fr = live.freshness || 'ukendt';
      const rows = live.rows;
      const on = highlight === s.id;
      return `<g class="sot-hit" data-sot-jump="system:${esc(s.id)}" style="cursor:pointer" opacity="${highlight && !on ? 0.35 : 1}">
        <title>${esc(s.name)} — klik for at fremhæve</title>
        <rect x="${KX}" y="${kY(i)}" width="${KB}" height="${RH}" rx="8" class="sot-box${on ? ' is-hit' : ''}" stroke="${freshnessStroke(fr)}" />
        <circle cx="${KX + 14}" cy="${kY(i) + RH / 2}" r="4" fill="${freshnessStroke(fr)}" />
        <text x="${KX + 26}" y="${kY(i) + 18}" class="sot-label">${esc(s.name)}</text>
        <text x="${KX + 26}" y="${kY(i) + 33}" class="sot-muted">${esc(fr)}${rows != null ? ' · ' + dk(rows) : ''}</text>
      </g>`;
    }).join('');

    const spineNodes = spines.map((s, i) => {
      const mine = entities.filter((e) => (e.spines || []).includes(s.id));
      const sc = statusCounts(mine);
      return `<g class="sot-hit" data-sot-jump="spine:${esc(s.id)}" style="cursor:pointer">
        <title>${esc(s.name)} — åbn Rygrade</title>
        <rect x="${BX}" y="${bY(i)}" width="${BB}" height="${bH}" rx="9" class="sot-box" style="stroke:${spineColor(s.id)}" stroke-width="1.5" />
        <rect x="${BX}" y="${bY(i)}" width="4" height="${bH}" rx="2" fill="${spineColor(s.id)}" />
        <text x="${BX + 16}" y="${bY(i) + 22}" class="sot-label">${esc(s.name)}</text>
        <text x="${BX + 16}" y="${bY(i) + 38}" class="sot-muted">${esc(s.id)}</text>
        <text x="${BX + BB - 12}" y="${bY(i) + 22}" text-anchor="end" class="sot-muted">${sc.landet}/${mine.length}</text>
      </g>`;
    }).join('');

    const ontoNodes = spines.map((s, i) => {
      const mine = entities.filter((e) => (e.spines || []).includes(s.id));
      if (!mine.length) return '';
      const sc = statusCounts(mine);
      const bredde = OB - 24;
      const y = bY(i);
      const landetW = mine.length ? bredde * (sc.landet / mine.length) : 0;
      const delvistW = mine.length ? bredde * (sc.delvist / mine.length) : 0;
      return `<g class="sot-hit" data-sot-jump="tab:ontologi" style="cursor:pointer">
        <title>Åbn Ontologi</title>
        <rect x="${OX}" y="${y}" width="${OB}" height="${bH}" rx="9" class="sot-box" />
        <text x="${OX + 12}" y="${y + 22}" class="sot-label">${sc.landet} af ${mine.length} objekter landet</text>
        <rect x="${OX + 12}" y="${y + 31}" width="${bredde}" height="6" rx="3" class="sot-track" />
        <rect x="${OX + 12}" y="${y + 31}" width="${landetW}" height="6" rx="3" fill="${spineColor(s.id)}" />
        <rect x="${OX + 12 + landetW}" y="${y + 31}" width="${delvistW}" height="6" rx="3" fill="var(--warn, #b07a1a)" />
        <text x="${OX + 12}" y="${y + 53}" class="sot-muted">${sc.hul > 0 ? sc.hul + ' huller' : 'ingen huller'}${sc.delvist ? ' · ' + sc.delvist + ' delvist' : ''}</text>
      </g>`;
    }).join('');

    const missingWeight = links.some((l) => spineIds.has(l.target) && l.live_weight == null && l.weight == null);

    return `<div class="sot-note"><p>Hver linje findes fordi kontrakten erklærer et kildelink.
      <b>Fuldt optrukket</b> = measured · <b>stiplet</b> = declared.
      Klik et <b>system</b> for at fremhæve, en <b>rygrad</b> for at åbne Rygrade.
      ${missingWeight ? 'Nogle kanter har endnu ingen målt vægt.' : ''}</p></div>
      <div class="sot-scroll sot-dia"><svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:780px;display:block" role="img" aria-label="Koblingen mellem kildesystemer, rygrade og ontologi">
        <text x="${KX}" y="22" class="sot-title">Kildesystemer</text>
        <text x="${BX}" y="22" class="sot-title">Rygrade · SoT</text>
        <text x="${OX}" y="22" class="sot-title">Ontologien</text>
        ${edgePaths}${toOnto}${sysNodes}${spineNodes}${ontoNodes}
      </svg></div>`;
  }

  function renderSpines(model, state) {
    const focus = state.focusSpine || null;
    return `<div class="sot-grid">${(model.spines || []).map((s) => {
      const ents = (model.entities || []).filter((e) => (e.spines || []).includes(s.id));
      const sc = statusCounts(ents);
      const on = focus === s.id;
      return `<section class="sot-card${on ? ' is-focus' : ''}" id="sot-spine-${esc(s.id)}" style="--f:${spineColor(s.id)}" data-spine-id="${esc(s.id)}">
        <div class="sot-card-bar" aria-hidden="true"></div>
        <h3>${esc(s.name)}</h3>
        <p class="sot-lead-sm">${esc(s.question)}</p>
        <div class="sot-mini-stribe">
          <span><u>Landet</u><b>${sc.landet}</b></span>
          <span><u>Delvist</u><b>${sc.delvist}</b></span>
          <span><u>Hul</u><b>${sc.hul}</b></span>
        </div>
        <ul>${ents.map((e) => `<li><b>${esc(e.name)}</b> · <code class="sot-mono">${esc(e.layer || '—')}</code> · ${esc(e.live?.status || 'hul')}</li>`).join('')}</ul>
      </section>`;
    }).join('')}</div>`;
  }

  function renderOntology(model) {
    const byLayer = {};
    for (const layer of LAYERS) byLayer[layer] = [];
    for (const e of model.entities || []) {
      const layer = LAYERS.includes(e.layer) ? e.layer : 'Current';
      byLayer[layer].push(e);
    }
    return `<div class="sot-grid">${LAYERS.map((layer) => {
      const ents = byLayer[layer] || [];
      if (!ents.length) return '';
      return `<section class="sot-card">
        <h3>${esc(layer)}</h3>
        <p class="sot-lead-sm">${layer === 'Cash' ? 'Kontant drift — erstatter ikke Current.' : layer === 'Current' ? 'Verificerede pegepinde og vilkår.' : layer === 'Register' ? 'Eksterne registerobjekter.' : 'Dokumentarkiv.'}</p>
        ${ents.map((e) => `<article class="sot-entity">
          <span class="sot-ring" style="border-color:${statusStroke(e.live?.status)}"></span>
          <div>
            <b>${esc(e.name)}</b>
            <span class="sot-badge">${esc((e.spines || [])[0] || '—')}</span>
            <br/><span class="sot-muted">${esc(e.definition)}</span>
            <br/><span class="sot-mono sot-muted">${esc(e.primary_system || '—')} · ${esc(e.live?.status || 'hul')}</span>
          </div>
        </article>`).join('')}
      </section>`;
    }).join('')}</div>`;
  }

  function renderLag(model) {
    return `<div class="sot-grid">${LAYERS.map((layer) => {
      const ents = (model.entities || []).filter((e) => e.layer === layer);
      const sc = statusCounts(ents);
      return `<section class="sot-card">
        <h3>${esc(layer)}</h3>
        <div class="sot-mini-stribe">
          <span><u>Objekter</u><b>${ents.length}</b></span>
          <span><u>Landet</u><b>${sc.landet}</b></span>
          <span><u>Delvist</u><b>${sc.delvist}</b></span>
          <span><u>Hul</u><b>${sc.hul}</b></span>
        </div>
        <p class="sot-lead-sm">${layer === 'Cash' ? 'Bank/Årsbudget er cash. Det er ikke Current-saldo.' : 'Live status fra overlay; kontrakten erklærer laget.'}</p>
        <ul>${ents.map((e) => `<li><b>${esc(e.name)}</b> · ${esc(e.live?.status || 'hul')}</li>`).join('') || '<li class="sot-muted">Ingen objekter</li>'}</ul>
      </section>`;
    }).join('')}</div>`;
  }

  function renderGraf(model, state) {
    const { nodes, laerred: L } = layoutNodes(model);
    const relations = model.relations || [];
    const colorMode = state.colorMode || 'spine';
    const vis = state.vis || new Set(Object.keys(BAEREKRAFT));
    const selected = state.selected;
    const neighbors = selected
      ? new Set(relations.filter((r) => r.from === selected || r.to === selected).flatMap((r) => [r.from, r.to]))
      : null;
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const edges = relations.filter((r) => vis.has(r.baerekraft)).map((r) => {
      const a = byId[r.from], b = byId[r.to];
      if (!a || !b) return '';
      const meta = BAEREKRAFT[r.baerekraft] || BAEREKRAFT.kun_udledt;
      const dim = neighbors && !neighbors.has(r.from) && !neighbors.has(r.to);
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="var(--text-muted)" stroke-width="${meta.w}" stroke-dasharray="${meta.dash}" opacity="${dim ? 0.08 : meta.op}" />`;
    }).join('');
    const knuder = nodes.map((n) => {
      const fill = colorMode === 'kilde' ? systemColor(n.primary_system) : spineColor(n.spine);
      const dim = neighbors && !neighbors.has(n.id);
      const hit = Math.max(n.r + 10, 40);
      return `<g class="sot-node" data-id="${esc(n.id)}" opacity="${dim ? 0.2 : 1}" style="cursor:pointer">
        <circle cx="${n.x}" cy="${n.y}" r="${hit}" fill="transparent" />
        <circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${fill}" stroke="${statusStroke(n.status)}" stroke-width="3"/>
        <text x="${n.x}" y="${n.y + n.r + 14}" text-anchor="middle" class="sot-label">${esc(n.name)}</text>
      </g>`;
    }).join('');
    const detail = selected ? (() => {
      const n = byId[selected];
      const e = (model.entities || []).find((x) => x.id === selected);
      const inc = relations.filter((r) => r.from === selected || r.to === selected);
      return `<aside class="sot-rail"><h3>${esc(n?.name)}</h3>
        <p class="sot-muted">${esc(e?.definition)}</p>
        <p>Rygrad <span class="sot-mono">${esc(n?.spine)}</span> · lag <span class="sot-mono">${esc(n?.layer)}</span> · status ${esc(n?.status)}</p>
        <p>Primær kilde <span class="sot-mono">${esc(n?.primary_system || '—')}</span></p>
        <ul>${inc.map((r) => `<li><code class="sot-mono">${esc(r.verb)}</code> · ${esc(r.from)} → ${esc(r.to)} · ${esc(BAEREKRAFT[r.baerekraft]?.label || r.baerekraft)}</li>`).join('')}</ul>
        <button type="button" class="sot-seg-btn" data-sot-clear>Luk</button></aside>`;
    })() : '';
    const chips = Object.entries(BAEREKRAFT).map(([k, v]) => {
      const n = relations.filter((r) => r.baerekraft === k).length;
      const on = vis.has(k);
      return `<button type="button" class="sot-seg-btn sot-chip ${on ? 'is-on' : ''}" data-baerekraft="${k}" aria-pressed="${on}">${esc(v.label)} <small class="sot-mono">${n}</small></button>`;
    }).join('');
    return `<div class="sot-note"><p>Kantens streg er <b>bærekraft</b> (kontrakt). Knudens ring er live status. Farve følger rygrad eller kildesystem.</p></div>
      <div class="sot-toolbar" role="group" aria-label="Graf-filtre">
        <button type="button" class="sot-seg-btn sot-chip ${colorMode === 'spine' ? 'is-on' : ''}" data-color="spine" aria-pressed="${colorMode === 'spine'}">Farve efter rygrad</button>
        <button type="button" class="sot-seg-btn sot-chip ${colorMode === 'kilde' ? 'is-on' : ''}" data-color="kilde" aria-pressed="${colorMode === 'kilde'}">Farve efter kildesystem</button>
        ${chips}
      </div>
      <div class="sot-graf-wrap">
        <div class="sot-scroll"><svg viewBox="0 0 ${L.w} ${L.h}" width="100%" role="img" aria-label="Ontologiens relationskort">${edges}${knuder}</svg></div>
        ${detail}
      </div>`;
  }

  function stribe(model) {
    const ents = model.entities || [];
    const sc = statusCounts(ents);
    return `<div class="sot-stribe" aria-label="Nøgletal">
      <div class="sot-tal"><u>Systemer</u><b>${dk((model.systems || []).length)}</b></div>
      <div class="sot-tal"><u>Rygrade</u><b>${dk((model.spines || []).length)}</b></div>
      <div class="sot-tal"><u>Landet</u><b>${dk(sc.landet)}</b></div>
      <div class="sot-tal"><u>Delvist</u><b>${dk(sc.delvist)}</b></div>
      <div class="sot-tal"><u>Hul</u><b>${dk(sc.hul)}</b></div>
      <div class="sot-tal"><u>Relationer</u><b>${dk((model.relations || []).length)}</b></div>
    </div>`;
  }

  function badgeFor(tab, model) {
    if (tab === 'kilder') return (model.systems || []).length;
    if (tab === 'rygrade') return (model.spines || []).length;
    if (tab === 'relationer') return (model.relations || []).length;
    if (tab === 'ontologi' || tab === 'lag') return (model.entities || []).length;
    return '';
  }

  function goTab(root, model, tab, extra) {
    const state = root._sotState;
    state.tab = normalizeTab(tab);
    if (extra) Object.assign(state, extra);
    syncHash(state.tab);
    renderSotMap(root, model);
  }

  function renderSotMap(root, model, opts) {
    if (!root) return;
    const state = root._sotState || {
      tab: 'kilder', colorMode: 'spine',
      vis: new Set(Object.keys(BAEREKRAFT)), selected: null,
      highlightSystem: null, focusSpine: null,
    };
    root._sotState = state;
    if (opts?.tab) state.tab = normalizeTab(opts.tab);

    const view = VIEWS.find((v) => v.id === state.tab) || VIEWS[0];
    let body = '';
    if (state.tab === 'kilder') body = renderKobling(model, state);
    else if (state.tab === 'rygrade') body = renderSpines(model, state);
    else if (state.tab === 'relationer') body = renderGraf(model, state);
    else if (state.tab === 'lag') body = renderLag(model);
    else body = renderOntology(model);

    const overlayAt = model.live?.overlay_at || model.live?.measured_at || model.version || '—';
    const seg = VIEWS.map((v) => {
      const cur = state.tab === v.id;
      const n = badgeFor(v.id, model);
      return `<button type="button" class="sot-seg-btn${cur ? ' is-on' : ''}" data-sot-tab="${v.id}"${cur ? ' aria-current="true"' : ''}>
        <span>${esc(v.name)}</span>${n !== '' ? `<small class="sot-mono">${n}</small>` : ''}
      </button>`;
    }).join('');

    root.innerHTML = `<div class="sot-map sot-flade-first">
      <header class="sot-head">
        <div>
          <p class="sot-eyebrow">SoT · kontrolplan</p>
          <h1>${esc(view.name)}</h1>
        </div>
        <div class="sot-meta sot-mono" aria-label="Kontrakt">
          <span>${esc(model.format || '—')}</span>
          <span>${esc(model.version || '—')}</span>
          <span>${esc(overlayAt)}</span>
        </div>
      </header>
      <nav class="sot-seg" role="tablist" aria-label="Ontologi-visninger">${seg}</nav>
      <p class="sot-lead">${esc(view.lead)}</p>
      ${stribe(model)}
      <div class="sot-body">${body}</div>
    </div>`;

    root.querySelectorAll('[data-sot-tab]').forEach((btn) => {
      btn.onclick = () => goTab(root, model, btn.dataset.sotTab, { highlightSystem: null, focusSpine: null });
    });
    root.querySelectorAll('[data-color]').forEach((btn) => {
      btn.onclick = () => { state.colorMode = btn.dataset.color; renderSotMap(root, model); };
    });
    root.querySelectorAll('[data-baerekraft]').forEach((btn) => {
      btn.onclick = () => {
        const k = btn.dataset.baerekraft;
        if (state.vis.has(k)) state.vis.delete(k); else state.vis.add(k);
        renderSotMap(root, model);
      };
    });
    root.querySelectorAll('.sot-node').forEach((g) => {
      g.onclick = () => { state.selected = g.dataset.id; renderSotMap(root, model); };
    });
    root.querySelectorAll('[data-sot-jump]').forEach((g) => {
      g.onclick = (ev) => {
        ev.stopPropagation();
        const raw = g.dataset.sotJump || '';
        const [kind, id] = raw.split(':');
        if (kind === 'spine') goTab(root, model, 'rygrade', { focusSpine: id, highlightSystem: null });
        else if (kind === 'system') goTab(root, model, 'kilder', { highlightSystem: id, focusSpine: null });
        else if (kind === 'tab') goTab(root, model, id, { highlightSystem: null, focusSpine: null });
      };
    });
    const clear = root.querySelector('[data-sot-clear]');
    if (clear) clear.onclick = () => { state.selected = null; renderSotMap(root, model); };

    if (state.tab === 'rygrade' && state.focusSpine) {
      const el = root.querySelector('[data-spine-id="' + state.focusSpine.replace(/"/g, '') + '"]');
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  global.LifeOsSotMap = {
    render: renderSotMap,
    BAEREKRAFT,
    TAB_IDS,
    normalizeTab,
  };
})(typeof window !== 'undefined' ? window : globalThis);
