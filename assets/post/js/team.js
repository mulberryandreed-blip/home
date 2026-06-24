// بوست Post — Campaign & Production OS, vanilla JS port of PostOS.jsx

(function () {
  const auth = JSON.parse(sessionStorage.getItem('post_auth') || 'null');
  if (!auth) { window.location.href = 'post-login.html'; return; }

  const STATE = {
    role: auth.role,
    isMgmt: auth.role === 'management',
    section: auth.section || (auth.role === 'management' ? 'founder' : 'todos'),
    view: 'simple',
    editMode: false,
    client: null,
    campaign: null,
    clients: CLIENTS,
    campaigns: CAMPAIGNS,
    opps: OPPS,
    team: TEAM,
    wijhat: WIJHAT,
    labels: {},
  };

  const NAV_MGMT = [
    ['founder', 'Founder review', '01'], ['clients', 'Clients', '02'], ['pipeline', 'Campaign & TVC', '03'],
    ['opportunities', 'Opportunities', '04'], ['calendar', 'Calendar', '05'], ['team', 'Team & to-dos', '06'], ['wijhat', 'Wijhat lab', '07'],
  ];
  const NAV_STAFF = [
    ['todos', 'My to-do list', '01'], ['clients', 'Clients', '02'], ['calendar', 'Calendar', '03'], ['wijhat', 'Wijhat lab', '04'],
  ];
  const NAV = STATE.isMgmt ? NAV_MGMT : NAV_STAFF;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function L(k, fallback) { return STATE.labels[k] !== undefined ? STATE.labels[k] : fallback; }

  // ---- generic editable span: only interactive when editMode true ----
  function E(value, target, id, field, opts = {}) {
    const show = (value === '' || value == null) ? (opts.placeholder || 'n/a') : value;
    if (!STATE.editMode && !opts.always) return esc(show);
    const args = JSON.stringify({ target, id, field, idx: opts.idx, multiline: !!opts.multiline });
    return `<span class="editable" tabindex="0" data-edit='${esc(args)}'>${esc(show)}</span>`;
  }

  function commitEdit(target, id, field, idx, value) {
    if (target === 'labels') { STATE.labels[field] = value; return; }
    if (target === 'clients') { const c = STATE.clients.find((x) => x.id === id); if (c) c[field] = value; return; }
    if (target === 'score') { const c = STATE.clients.find((x) => x.id === id); if (c) c.scores[field] = clamp(Number(value), 0, 10); return; }
    if (target === 'social') { const c = STATE.clients.find((x) => x.id === id); if (c && c.social) c.social[field] = value; return; }
    if (target === 'campaigns') { const c = STATE.campaigns.find((x) => x.id === id); if (c) c[field] = value; return; }
    if (target === 'opps') { STATE.opps[id][field] = value; return; }
    if (target === 'wijhat') { STATE.wijhat[field] = value; return; }
    if (target === 'wijhatList') { STATE.wijhat[field][idx] = value; return; }
    if (target === 'todoText') { STATE.team[id].todos.find((t) => t.id === field).text = value; return; }
  }

  // ---- badges ----
  function badge(cls, label, dot) { return `<span class="badge ${cls}${dot ? ' dotled' : ''}">${esc(label)}</span>`; }

  function scoreMeter(scores, clientId, compact) {
    const avg = avgScore(scores);
    const { cat, cls, g } = CAT(avg);
    if (compact) {
      return `<div style="display:flex;align-items:center;gap:10px;">
        <span class="num" style="font-size:22px;font-weight:600;color:${g};font-family:var(--font-display);">${avg}</span>
        ${badge(cls, cat, true)}
      </div>`;
    }
    let rows = SCORE_DIMS.map(([k, lab]) => {
      const editable = STATE.isMgmt && STATE.editMode;
      const numField = editable
        ? `<input type="number" min="0" max="10" class="edit-input meter-edit" value="${scores[k]}" data-score-edit="${clientId}|${k}">`
        : `<span class="meter-num">${scores[k]}.0</span>`;
      return `<div class="meter-row">
        <span class="meter-lab">${esc(lab)}</span>
        <span class="meter-track"><span class="meter-fill" style="width:${scores[k] * 10}%;background:${g};"></span></span>
        ${numField}
      </div>`;
    }).join('');
    return `<div>
      <div style="display:flex;gap:18px;align-items:center;margin-bottom:16px;">
        <div class="grade-badge"><span class="grade-score" style="color:${g};">${avg}</span><span class="grade-cat" style="color:${g};">${cat}</span></div>
        <p style="font-size:13px;color:var(--ink-soft);margin:0;max-width:320px;">Averaged across ten dimensions of fit. A grading scope, not a popularity score, it answers whether the work is worth the studio's best energy.</p>
      </div>
      ${rows}
    </div>`;
  }

  function block(title, note, inner) {
    return `<div style="margin-top:28px;">
      <div class="sub-h">${title}</div>
      ${note ? `<div class="sub-note">${esc(note)}</div>` : ''}
      ${inner}
    </div>`;
  }

  function pageNav() {
    const idx = NAV.findIndex((n) => n[0] === STATE.section);
    const prev = idx > 0 ? NAV[idx - 1] : null;
    const next = idx >= 0 && idx < NAV.length - 1 ? NAV[idx + 1] : null;
    return `<div class="pagenav">
      <button class="pn-btn" data-go="${prev ? prev[0] : ''}" ${!prev ? 'disabled' : ''}><span class="pn-dir">← Back</span><span class="pn-lab">${prev ? prev[1] : 'Start of menu'}</span></button>
      <button class="pn-btn next" data-go="${next ? next[0] : ''}" ${!next ? 'disabled' : ''}><span class="pn-dir">Next →</span><span class="pn-lab">${next ? next[1] : 'End of menu'}</span></button>
    </div>`;
  }

  // ---- TO-DO board (shared) ----
  function todoBoard() {
    return `<div class="grid g2">${STATE.team.map((m, idx) => {
      const open = m.todos.filter((t) => !t.done).length;
      return `<div class="card">
        <div class="todo-head">
          <div><div class="card-name" style="font-size:18px;margin:0;">${esc(m.name)}</div><span class="todo-role">${esc(m.role)}</span></div>
          <span class="todo-count">${open} open</span>
        </div>
        <div>
          ${m.todos.length === 0 ? `<p class="empty">Nothing on the list. Add the first task below.</p>` : m.todos.map((t) => `
            <div class="todo-item">
              <button class="todo-check${t.done ? ' done' : ''}" data-todo-toggle="${idx}|${t.id}">${t.done ? '✓' : ''}</button>
              ${STATE.editMode
                ? `<span class="editable todo-text${t.done ? ' done' : ''}" data-edit='${esc(JSON.stringify({ target: 'todoText', id: idx, field: t.id }))}'>${esc(t.text)}</span>`
                : `<span class="todo-text${t.done ? ' done' : ''}">${esc(t.text)}</span>`}
              ${STATE.editMode ? `<button class="todo-del" data-todo-del="${idx}|${t.id}">×</button>` : ''}
            </div>`).join('')}
        </div>
        <div class="todo-add"><input class="edit-input" placeholder="Add a task…" data-todo-input="${idx}"><button class="mini-btn" data-todo-add="${idx}">Add</button></div>
      </div>`;
    }).join('')}</div>`;
  }

  // ---- FOUNDER ----
  function viewFounder() {
    const campaigns = STATE.campaigns, clients = STATE.clients;
    const awaitingReview = campaigns.filter((c) => (c.founderReview || '').includes('creative review'));
    const awaitingConcept = campaigns.filter((c) => (c.founderReview || '').includes('Concept approval'));
    const fitPending = campaigns.filter((c) => (c.founderReview || '').includes('Strategic fit'));
    const highValue = clients.filter((c) => avgScore(c.scores) >= 7.4 && c.id !== 'wjt');
    const poorFit = clients.filter((c) => avgScore(c.scores) < 4.5);
    const atRisk = campaigns.filter((c) => Object.values(c.chk).some((x) => x === 'risk'));

    const reviewLine = (c, badgeCls) => {
      const name = c.client ? clients.find((x) => x.id === c.client).name : c.clientName;
      return `<button class="pl-card click" style="width:100%;text-align:left;display:block;" data-open-campaign="${c.id}">
        <div class="pl-head">
          <div><div class="pl-client">${esc(c.code)} · ${esc(name)}</div><div class="pl-name">${esc(c.name)}</div>
          <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">${esc(c.type)} · ${esc(c.dates)}</div></div>
          ${badge(badgeCls, c.founderReview, true)}
        </div>
      </button>`;
    };

    let detailed = '';
    if (STATE.view === 'detailed') {
      detailed = `
        ${block(E(L('founder_high_t', 'High strategic value, protect'), 'labels', null, 'founder_high_t'), 'Deepen the relationship; never let quality slip here.',
          `<div class="grid g3">${highValue.map((c) => `<button class="card click" style="text-align:left;" data-open-client="${c.id}"><div class="card-code">${esc(c.code)}</div><div class="card-name">${esc(c.name)}</div>${scoreMeter(c.scores, c.id, true)}</button>`).join('')}</div>`)}
        ${block(E(L('founder_poor_t', 'Poor fit, decline or reprice'), 'labels', null, 'founder_poor_t'), 'Honest about what\'s draining the studio.',
          poorFit.map((c) => `<div class="callout" style="margin-bottom:10px;"><strong>${esc(c.name)}</strong> · ${esc(c.next)}</div>`).join(''))}
        ${block(E(L('founder_fit_t', 'Strategic fit pending'), 'labels', null, 'founder_fit_t'), '', fitPending.map((c) => reviewLine(c, 'b-slate')).join(''))}`;
    }

    return `
      <div class="page-eyebrow">Founder review</div>
      <h1 class="page-title">${E(L('founder_t', 'Only what needs your judgement'), 'labels', null, 'founder_t')}</h1>
      <div class="page-desc">${E(L('founder_d', "Everything below is filtered to decisions only the founder should make this week. If it isn't here, the team has it."), 'labels', null, 'founder_d', { multiline: true })}</div>

      <div class="kpi-row" style="margin-top:26px;">
        <div class="stat"><div class="stat-k">Decisions this week</div><div class="stat-v">${awaitingReview.length + awaitingConcept.length + fitPending.length}</div><div class="stat-sub">Across reviews and fit</div></div>
        <div class="stat"><div class="stat-k">High-value clients</div><div class="stat-v">${highValue.length}</div><div class="stat-sub">Protect and deepen</div></div>
        <div class="stat"><div class="stat-k">Quality at risk</div><div class="stat-v">${atRisk.length}</div><div class="stat-sub">Projects with a risk flag</div></div>
        <div class="stat"><div class="stat-k">Exit candidates</div><div class="stat-v">${poorFit.length}</div><div class="stat-sub">Decline or reprice</div></div>
      </div>

      ${block(E(L('founder_review_t', 'Awaiting your creative review'), 'labels', null, 'founder_review_t'), "These can't move forward without you.",
        awaitingReview.length === 0 ? `<p class="empty">Nothing waiting. Good.</p>` : awaitingReview.map((c) => reviewLine(c, 'b-ox')).join(''))}

      ${block(E(L('founder_concept_t', 'TVCs awaiting concept approval'), 'labels', null, 'founder_concept_t'), '', awaitingConcept.map((c) => reviewLine(c, 'b-ox')).join(''))}

      ${block(E(L('founder_opp_t', 'Opportunities worth pursuing'), 'labels', null, 'founder_opp_t'), 'Strategic upside that needs a founder yes.',
        `<div class="callout brass">${E(L('founder_opp_note', 'Mansour launch-film format and the Zaytuna salary campaign are the two highest-value moves on the board. Both convert a social retainer into production work. Pursue before chasing new logos.'), 'labels', null, 'founder_opp_note', { multiline: true })}</div>`)}

      ${detailed}
    `;
  }

  // ---- TODO PAGE (staff) ----
  function viewTodos() {
    const total = STATE.team.reduce((a, m) => a + m.todos.filter((t) => !t.done).length, 0);
    return `
      <div class="page-eyebrow">My to-do list</div>
      <h1 class="page-title">What's on the team this week</h1>
      <p class="page-desc">A simple checklist per person. Tick things off, add new tasks. Strategy, financials, and client decisions live with management.</p>
      <div class="kpi-row" style="margin-top:26px;">
        <div class="stat"><div class="stat-k">Open tasks · studio</div><div class="stat-v">${total}</div></div>
        <div class="stat"><div class="stat-k">People</div><div class="stat-v">${STATE.team.length}</div></div>
        <div class="stat"><div class="stat-k">Due this week</div><div class="stat-v">3</div><div class="stat-sub">See calendar</div></div>
      </div>
      ${todoBoard()}
    `;
  }

  // ---- CLIENTS ----
  function viewClients() {
    const isMgmt = STATE.isMgmt, view = STATE.view;
    const sorted = [...STATE.clients].sort((a, b) => avgScore(b.scores) - avgScore(a.scores));

    let body;
    if (view === 'simple') {
      body = `<div class="grid g3" style="margin-top:26px;">${sorted.map((c) => `
        <button class="card click" style="text-align:left;" data-open-client="${c.id}">
          <div class="card-code">${esc(c.code)}</div><div class="card-name">${esc(c.name)}</div>
          <div class="card-meta" style="margin-bottom:12px;">${esc(c.sector)}</div>
          ${scoreMeter(c.scores, c.id, true)}
          ${isMgmt && c.monthly > 0 ? `<div class="num" style="font-size:12.5px;color:var(--ink-soft);margin-top:12px;">${fmt(c.monthly)}/mo · LTV ${fmt(c.ltv)}</div>` : ''}
          ${c.id === 'wjt' ? `<div class="num" style="font-size:12.5px;color:var(--ink-soft);margin-top:12px;">Internal growth lab</div>` : ''}
        </button>`).join('')}</div>`;
    } else {
      body = `
        <div class="sub-h" style="margin-top:26px;">${E(L('clients_table_t', 'Client register'), 'labels', null, 'clients_table_t')}</div>
        <div class="sub-note">Click a row to open the full profile.</div>
        <table class="tbl"><thead><tr><th>Code</th><th>Client</th><th>Fit</th><th>Category</th>${isMgmt ? '<th>Monthly</th><th>LTV</th>' : ''}<th>Campaign</th><th>TVC</th><th>Next move</th></tr></thead>
        <tbody>${sorted.map((c) => {
          const a = avgScore(c.scores); const { cat, cls } = CAT(a);
          return `<tr class="click" data-open-client="${c.id}">
            <td class="num">${esc(c.code)}</td><td style="font-weight:500;">${esc(c.name)}</td>
            <td class="num">${a}</td><td>${badge(cls, cat)}</td>
            ${isMgmt ? `<td class="num">${c.monthly > 0 ? fmt(c.monthly) : 'n/a'}</td><td class="num">${c.ltv ? fmt(c.ltv) : 'n/a'}</td>` : ''}
            <td>${esc(c.campaignPot)}</td><td>${esc(c.tvcPot)}</td>
            <td style="color:var(--ink-soft);font-size:12.5px;max-width:260px;">${esc(c.next)}</td>
          </tr>`;
        }).join('')}</tbody></table>`;
    }

    const transition = STATE.clients.filter((c) => c.social).map((c) => `
      <tr>
        <td style="font-weight:500;">${esc(c.name)}</td>
        <td style="font-size:12.5px;">${E(c.social.workload, 'social', c.id, 'workload')}</td>
        <td>${badge(c.social.drain === 'High' ? 'b-ox' : c.social.drain === 'Medium' ? 'b-brass' : 'b-sage', c.social.drain)}</td>
        ${isMgmt ? `<td class="num">${fmt(c.monthly)}/mo</td>` : ''}
        <td>${esc(c.social.convertCampaign)}</td><td>${esc(c.social.convertTVC)}</td>
        <td style="font-size:12.5px;color:var(--ink-soft);">${E(c.social.action, 'social', c.id, 'action')}</td>
      </tr>`).join('');

    return `
      <div class="page-eyebrow">Clients</div>
      <h1 class="page-title">${E(L('clients_t', 'Worth keeping, worth growing'), 'labels', null, 'clients_t')}</h1>
      <div class="page-desc">${E(L('clients_d', 'Every client graded for fit, not just billed. The goal is better clients, not simply more.'), 'labels', null, 'clients_d', { multiline: true })}</div>
      ${body}
      ${block(E(L('clients_transition_t', 'Social retainers in transition'), 'labels', null, 'clients_transition_t'), 'The four social clients, and where each one should go.',
        `<table class="tbl"><thead><tr><th>Client</th><th>Workload</th><th>Creative drain</th>${isMgmt ? '<th>Revenue</th>' : ''}<th>→ Campaign</th><th>→ TVC</th><th>Recommended action</th></tr></thead><tbody>${transition}</tbody></table>`)}
    `;
  }

  function viewClientDetail(id) {
    const order = [...STATE.clients].sort((a, b) => avgScore(b.scores) - avgScore(a.scores)).map((c) => c.id);
    const pos = order.indexOf(id);
    const prevId = pos > 0 ? order[pos - 1] : null;
    const nextId = pos < order.length - 1 ? order[pos + 1] : null;
    const c = STATE.clients.find((x) => x.id === id);
    const a = avgScore(c.scores); const { cat, cls } = CAT(a);
    const ed = STATE.isMgmt && STATE.editMode;
    const ef = (field, opts) => E(c[field], 'clients', id, field, opts);

    return `
      <div class="detail-top">
        <button class="back" data-back-clients>← All clients</button>
        <div class="rec-nav">
          <button data-open-client="${prevId || ''}" ${!prevId ? 'disabled' : ''}>← Prev client</button>
          <button data-open-client="${nextId || ''}" ${!nextId ? 'disabled' : ''}>Next client →</button>
        </div>
      </div>
      <div class="page-eyebrow">${esc(c.code)} · ${ef('sector')}</div>
      <h1 class="page-title">${ef('name')}</h1>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;">
        ${badge(cls, cat, true)}${badge('b-faint', c.status)}
        ${c.risk !== 'n/a' ? badge(c.risk === 'High' ? 'b-ox' : 'b-sage', 'Retention risk · ' + c.risk) : ''}
      </div>
      <div class="grid g2" style="margin-top:26px;align-items:start;">
        <div class="card">
          <div class="sub-h" style="font-size:16px;">Client quality score</div>
          <div class="sub-note">${STATE.isMgmt ? (STATE.editMode ? 'Type a new value (0 to 10) to re-grade live.' : 'Editable by management in edit mode.') : 'Read-only for the team.'}</div>
          ${scoreMeter(c.scores, c.id, false)}
        </div>
        <div class="card">
          <div class="sub-h" style="font-size:16px;margin-bottom:14px;">The relationship</div>
          <dl class="dl">
            <dt>Brief</dt><dd>${ef('services', { multiline: true })}</dd>
            <dt>Decision-makers</dt><dd>${ef('deciders', { multiline: true })}</dd>
            <dt>Approval behaviour</dt><dd>${ef('approval', { multiline: true })}</dd>
            <dt>Quality expectations</dt><dd>${ef('expects', { multiline: true })}</dd>
            <dt>Pain points</dt><dd>${ef('pains', { multiline: true })}</dd>
            <dt>Comms style</dt><dd>${ef('comms', { multiline: true })}</dd>
          </dl>
        </div>
      </div>
      ${STATE.isMgmt ? `
        <div class="card" style="margin-top:16px;">
          <div class="sub-h" style="font-size:16px;margin-bottom:14px;">Value &amp; strategic read</div>
          <dl class="dl">
            <dt>Monthly value</dt><dd class="num">${c.monthly > 0 ? fmt(c.monthly) : 'Internal'}</dd>
            <dt>Lifetime value</dt><dd class="num">${c.ltv ? fmt(c.ltv) : 'n/a'}</dd>
            <dt>Strategic value</dt><dd>${ef('strategic', { multiline: true })}</dd>
            <dt>Upsell potential</dt><dd>${ef('upsell')}</dd>
            <dt>Campaign potential</dt><dd>${ef('campaignPot')}</dd>
            <dt>TVC potential</dt><dd>${ef('tvcPot')}</dd>
          </dl>
          <div class="callout" style="margin-top:16px;"><strong>Next recommended move · </strong>${ef('next', { multiline: true })}</div>
        </div>` : `
        <div class="card" style="margin-top:16px;">
          <div class="sub-h" style="font-size:16px;margin-bottom:8px;">Working with this client</div>
          <dl class="dl">
            <dt>Quality expectations</dt><dd>${esc(c.expects)}</dd>
            <dt>Approval behaviour</dt><dd>${esc(c.approval)}</dd>
            <dt>Comms style</dt><dd>${esc(c.comms)}</dd>
          </dl>
        </div>`}
    `;
  }

  // ---- PIPELINE ----
  function viewPipeline() {
    const stagesRow = STATES_ROW();
    const cards = STATE.campaigns.map((c) => {
      const name = c.client ? STATE.clients.find((x) => x.id === c.client).name : c.clientName;
      const risks = Object.values(c.chk).filter((x) => x === 'risk').length;
      return `<div class="pl-card click" data-open-campaign="${c.id}">
        <div class="pl-head">
          <div><div class="pl-client">${esc(c.code)} · ${esc(name)}</div><div class="pl-name">${esc(c.name)}</div>
          <div style="font-size:12.5px;color:var(--ink-soft);margin-top:3px;">${esc(c.type)} · ${esc(c.budget)}</div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
            ${c.founderReview && c.founderReview !== 'n/a' ? badge('b-ox', c.founderReview, true) : ''}
            ${risks > 0 ? badge('b-rust', risks + ' at risk') : ''}
            ${c.caseStudy === 'High' ? badge('b-sage', 'Case study') : ''}
          </div>
        </div>
        <div class="pl-line">${STAGES.map((_, i) => `<span class="pl-tick${i < c.stageIdx ? ' done' : i === c.stageIdx ? ' now' : ''}"></span>`).join('')}</div>
        <div class="pl-stage">▸ ${esc(STAGES[c.stageIdx])}${STATE.view === 'detailed' ? '  ·  ' + esc(c.dates) : ''}</div>
      </div>`;
    }).join('');
    return `
      <div class="page-eyebrow">Campaign &amp; TVC pipeline</div>
      <h1 class="page-title">${E(L('pipe_t', 'The production line'), 'labels', null, 'pipe_t')}</h1>
      <div class="page-desc">${E(L('pipe_d', "Every campaign and film, from lead to case study. The studio's highest-value work lives here, not in the content calendar."), 'labels', null, 'pipe_d', { multiline: true })}</div>
      <div style="margin-top:22px;display:flex;flex-wrap:wrap;gap:7px;font-size:11px;color:var(--ink-faint);" class="mono">${stagesRow}</div>
      <div class="section-rule"></div>
      ${cards}
    `;
  }
  function STATES_ROW() {
    return STAGES.map((st, i) => `<span>${String(i + 1).padStart(2, '0')} ${esc(st)}${i < STAGES.length - 1 ? '  ·' : ''}</span>`).join('');
  }

  function viewCampaignDetail(id) {
    const order = STATE.campaigns.map((c) => c.id);
    const pos = order.indexOf(id);
    const prevId = pos > 0 ? order[pos - 1] : null;
    const nextId = pos < order.length - 1 ? order[pos + 1] : null;
    const c = STATE.campaigns.find((x) => x.id === id);
    const name = c.client ? STATE.clients.find((x) => x.id === c.client).name : c.clientName;
    const ef = (field, opts) => E(c[field], 'campaigns', id, field, opts);
    const chkRows = CHK_CATS.map((k) => {
      const b = chkBadge(c.chk[k]);
      return `<div class="chk-row"><span class="chk-lab">${esc(k)}</span><button class="badge dotled ${b.cls}" data-chk-toggle="${id}|${esc(k)}" title="Click to change">${b.lab}</button></div>`;
    }).join('');
    return `
      <div class="detail-top">
        <button class="back" data-back-pipeline>← Pipeline</button>
        <div class="rec-nav">
          <button data-open-campaign="${prevId || ''}" ${!prevId ? 'disabled' : ''}>← Prev</button>
          <button data-open-campaign="${nextId || ''}" ${!nextId ? 'disabled' : ''}>Next →</button>
        </div>
      </div>
      <div class="page-eyebrow">${esc(c.code)} · ${esc(name)}</div>
      <h1 class="page-title">${ef('name')}</h1>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;">
        ${badge('b-slate', c.type)}${badge('b-brass', STAGES[c.stageIdx])}
        ${c.founderReview && c.founderReview !== 'n/a' ? badge('b-ox', c.founderReview, true) : ''}
      </div>
      <div class="pl-card" style="margin-top:22px;cursor:default;">
        <div class="pl-line">${STAGES.map((st, i) => `<span class="pl-tick${i < c.stageIdx ? ' done' : i === c.stageIdx ? ' now' : ''}" title="${esc(st)}"></span>`).join('')}</div>
        <div class="pl-stage">▸ Stage ${c.stageIdx + 1} of ${STAGES.length} · ${esc(STAGES[c.stageIdx])}</div>
      </div>
      <div class="grid g2" style="margin-top:16px;align-items:start;">
        <div class="card">
          <div class="sub-h" style="font-size:16px;margin-bottom:14px;">The work</div>
          <dl class="dl">
            <dt>Objective</dt><dd>${ef('objective', { multiline: true })}</dd>
            <dt>Creative idea</dt><dd>${ef('idea', { multiline: true })}</dd>
            <dt>Production</dt><dd>${ef('production', { multiline: true })}</dd>
            <dt>Deliverables</dt><dd>${ef('deliverables', { multiline: true })}</dd>
            <dt>Budget</dt><dd class="num">${ef('budget')}</dd>
            <dt>Key dates</dt><dd>${ef('dates')}</dd>
            <dt>Team</dt><dd>${ef('team')}</dd>
            <dt>Approval</dt><dd>${ef('approval')}</dd>
            <dt>Risks</dt><dd>${ef('risks', { multiline: true })}</dd>
          </dl>
        </div>
        <div class="card">
          <div class="sub-h" style="font-size:16px;">Detail checklist</div>
          <div class="sub-note">Click a status to cycle it: Pass → Needs review → At risk.</div>
          ${chkRows}
        </div>
      </div>
    `;
  }

  // ---- OPPORTUNITIES ----
  function viewOpportunities() {
    const sorted = STATE.opps.map((o, i) => ({ o, i })).sort((a, b) => (b.o.priority === 'High' ? 1 : 0) - (a.o.priority === 'High' ? 1 : 0) || b.o.fit - a.o.fit);
    let body;
    if (STATE.view === 'simple') {
      body = `<div class="grid g3" style="margin-top:26px;">${sorted.map(({ o, i }) => `
        <div class="card">
          <div class="card-code">${esc(o.kind)}</div>
          <div class="card-name" style="font-size:17px;">${E(o.name, 'opps', i, 'name')}</div>
          <div style="display:flex;gap:8px;margin:10px 0;flex-wrap:wrap;">${badge(o.priority === 'High' ? 'b-ox' : 'b-brass', o.priority + ' priority')}${badge('b-faint', 'Fit ' + o.fit)}</div>
          <div class="num" style="font-size:13px;color:var(--ink-soft);">${E(o.value, 'opps', i, 'value')}</div>
          <div style="font-size:12.5px;color:var(--ink-soft);margin-top:8px;">→ ${E(o.next, 'opps', i, 'next')}</div>
        </div>`).join('')}</div>`;
    } else {
      body = `
        <div class="sub-h" style="margin-top:26px;">${E(L('opp_table_t', 'Opportunity pipeline'), 'labels', null, 'opp_table_t')}</div>
        <div class="sub-note">Ranked by priority, then fit.</div>
        <table class="tbl"><thead><tr><th>Type</th><th>Opportunity</th><th>Est. value</th><th>Fit</th><th>Creative</th><th>Retention</th><th>Founder</th><th>Next step</th><th>Priority</th></tr></thead>
        <tbody>${sorted.map(({ o, i }) => `
          <tr>
            <td style="font-size:12px;color:var(--ink-soft);">${esc(o.kind)}</td>
            <td style="font-weight:500;">${E(o.name, 'opps', i, 'name')}</td>
            <td class="num">${E(o.value, 'opps', i, 'value')}</td>
            <td class="num">${o.fit}</td><td>${esc(o.creative)}</td><td>${esc(o.retention)}</td><td>${esc(o.founder)}</td>
            <td style="font-size:12.5px;color:var(--ink-soft);">${E(o.next, 'opps', i, 'next')}</td>
            <td>${badge(o.priority === 'High' ? 'b-ox' : 'b-brass', o.priority)}</td>
          </tr>`).join('')}</tbody></table>`;
    }
    return `
      <div class="page-eyebrow">Opportunities</div>
      <h1 class="page-title">${E(L('opp_t', 'Where the growth is'), 'labels', null, 'opp_t')}</h1>
      <div class="page-desc">${E(L('opp_d', 'Strategic upside, ranked by fit and value. Most of it is already inside the client base, campaign and TVC work hiding inside social retainers.'), 'labels', null, 'opp_d', { multiline: true })}</div>
      ${body}
    `;
  }

  // ---- CALENDAR ----
  function viewCalendar() {
    const dows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = 22;
    const types = [
      ['Campaign launch', 'var(--oxblood)'], ['TVC shoot', 'var(--osink)'], ['Concept presentation', 'var(--sage)'],
      ['Founder review', 'var(--oxblood)'], ['Client approval', 'var(--brass)'], ['Production deadline', 'var(--rust)'],
      ['Social deadline', 'var(--ink-faint)'], ['Internal review', 'var(--osink)'], ['Reporting date', 'var(--slate)'],
    ];
    let cells = '';
    for (let d = 1; d <= 30; d++) {
      const evs = CAL_EVENTS[d] || [];
      cells += `<div class="cal-cell${d === today ? ' today' : ''}${(d % 7 === 6 || d % 7 === 0) ? ' muted' : ''}">
        <div class="cal-num">${d === today ? '● ' : ''}${d}</div>
        ${evs.map((e) => `<div class="cal-ev" style="border-color:${e.c};background:var(--paper-2);"><strong>${esc(e.t)}</strong>${STATE.view === 'detailed' ? '<br>' + esc(e.label) : ''}</div>`).join('')}
      </div>`;
    }
    return `
      <div class="page-eyebrow">Calendar · June 2026</div>
      <h1 class="page-title">${E(L('cal_t', 'Production milestones first'), 'labels', null, 'cal_t')}</h1>
      <div class="page-desc">${E(L('cal_d', 'Campaign launches, shoots, reviews, and approvals lead. Social deadlines are present but no longer the centre of gravity.'), 'labels', null, 'cal_d', { multiline: true })}</div>
      <div class="cal" style="margin-top:26px;">${dows.map((d) => `<div class="cal-dow">${d}</div>`).join('')}${cells}</div>
      <div class="legend">${types.map(([t, c]) => `<span class="legend-item"><span class="legend-sw" style="background:${c};"></span>${esc(t)}</span>`).join('')}</div>
    `;
  }

  // ---- TEAM PAGE ----
  function viewTeam() {
    const totals = {};
    WL_KEYS.forEach(([k]) => { totals[k] = STATE.team.reduce((sum, m) => sum + m.alloc[k], 0); });
    const n = STATE.team.length;
    const socialTotal = totals.social, campaignTotal = totals.concept + totals.tvc;
    const teamCards = STATE.team.map((m) => `
      <div class="card" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;"><span style="font-weight:500;">${esc(m.name)}</span><span class="mono" style="font-size:11.5px;color:var(--ink-faint);">${esc(m.role)}</span></div>
        <div class="wl-bar">${WL_KEYS.map(([k, , c]) => m.alloc[k] > 0 ? `<div class="wl-seg" style="width:${m.alloc[k]}%;background:${c};" title="${k} ${m.alloc[k]}%"></div>` : '').join('')}</div>
        ${STATE.view === 'detailed' ? `<div style="font-size:11.5px;color:var(--ink-soft);margin-top:8px;display:flex;gap:14px;flex-wrap:wrap;" class="mono">${WL_KEYS.filter(([k]) => m.alloc[k] > 0).map(([k, lab]) => `<span>${esc(lab.split(' ')[0])} ${m.alloc[k]}%</span>`).join('')}</div>` : ''}
      </div>`).join('');
    return `
      <div class="page-eyebrow">Team &amp; to-dos</div>
      <h1 class="page-title">${E(L('team_t', 'Where the energy goes'), 'labels', null, 'team_t')}</h1>
      <div class="page-desc">${E(L('team_d', 'Capacity split by type of work, then each person\'s live to-do list. The question: is the studio spending its best hours on social delivery or on production work?'), 'labels', null, 'team_d', { multiline: true })}</div>
      <div class="kpi-row" style="margin-top:26px;">
        <div class="stat"><div class="stat-k">On campaign &amp; TVC</div><div class="stat-v" style="color:var(--sage);">${Math.round(campaignTotal / (n * 100) * 100)}%</div><div class="stat-sub">Concepting + production</div></div>
        <div class="stat"><div class="stat-k">On social content</div><div class="stat-v" style="color:var(--rust);">${Math.round(socialTotal / (n * 100) * 100)}%</div><div class="stat-sub">Lower-value delivery</div></div>
        <div class="stat"><div class="stat-k">On client servicing</div><div class="stat-v">${Math.round(totals.servicing / (n * 100) * 100)}%</div></div>
      </div>
      <div class="callout brass" style="margin-bottom:22px;">${E(L('team_callout', 'Roughly a fifth of studio capacity still goes to social content, most of it on Babil Threads. Phasing it down frees real hours for the Mansour and Zaytuna production work.'), 'labels', null, 'team_callout', { multiline: true })}</div>
      ${teamCards}
      <div class="legend">${WL_KEYS.map(([k, lab, c]) => `<span class="legend-item"><span class="legend-sw" style="background:${c};"></span>${esc(lab)}</span>`).join('')}</div>
      ${block(E(L('team_todo_t', 'To-do lists by person'), 'labels', null, 'team_todo_t'), 'The same lists the team works from. In edit mode you can rename, edit, or remove tasks.', todoBoard())}
    `;
  }

  // ---- WIJHAT LAB ----
  function listCard(title, field, accent) {
    const items = STATE.wijhat[field];
    return `<div class="card">
      <div class="sub-h" style="font-size:16px;margin-bottom:12px;${accent ? 'color:' + accent + ';' : ''}">${esc(title)}</div>
      <ul style="margin:0;padding-left:0;list-style:none;">${items.map((it, i) => `
        <li style="font-size:13.5px;padding:8px 0;${i < items.length - 1 ? 'border-bottom:1px solid var(--line-soft);' : ''}display:flex;gap:10px;">
          <span class="mono" style="color:var(--ink-faint);font-size:11px;">${String(i + 1).padStart(2, '0')}</span>
          ${E(it, 'wijhatList', null, field, { idx: i })}
        </li>`).join('')}</ul>
    </div>`;
  }

  function viewWijhat() {
    const W = STATE.wijhat;
    let detailed = '';
    if (STATE.view === 'detailed') {
      detailed = `
        <div class="grid g2" style="margin-top:16px;align-items:start;">
          <div class="card"><div class="sub-h" style="font-size:16px;margin-bottom:8px;">Visual direction</div><div style="font-size:13.5px;color:var(--ink-soft);">${E(W.visual, 'wijhat', null, 'visual', { multiline: true })}</div></div>
          <div class="card"><div class="sub-h" style="font-size:16px;margin-bottom:8px;">Content rhythm</div><div style="font-size:13.5px;color:var(--ink-soft);">${E(W.calendarNote, 'wijhat', null, 'calendarNote', { multiline: true })}</div></div>
        </div>
        <div class="grid g2" style="margin-top:16px;align-items:start;">
          ${listCard('Lead generation', 'leadgen')}
          ${listCard('Cross-sell to Post clients', 'crossSell')}
        </div>`;
    }
    return `
      <div class="page-eyebrow">Wijhat · Strategic growth lab</div>
      <h1 class="page-title">${E(L('wij_t', 'The proof, not just a client'), 'labels', null, 'wij_t')}</h1>
      <div class="page-desc">${E(L('wij_d', "Wijhat is Post's internal premium travel brand and creative testing ground. It exists to prove the studio can build campaign and TVC work end to end, then sell that capability to everyone else."), 'labels', null, 'wij_d', { multiline: true })}</div>
      <div class="card" style="margin-top:26px;"><div class="sub-h" style="font-size:16px;margin-bottom:8px;">Who it's for</div><div style="font-size:14px;">${E(W.audience, 'wijhat', null, 'audience', { multiline: true })}</div></div>
      <div class="grid g2" style="margin-top:16px;align-items:start;">
        ${listCard('Premium experience ideas', 'experiences')}
        ${listCard('Campaign concepts', 'campaigns')}
        ${listCard('TVC ideas', 'tvc', 'var(--os-blue-300)')}
        ${listCard('Brand partnerships', 'partners')}
      </div>
      ${detailed}
      <div class="callout sage" style="margin-top:22px;"><strong>Why it matters · </strong>${E(W.caseStudy, 'wijhat', null, 'caseStudy', { multiline: true })}</div>
    `;
  }

  // ---- render dispatcher ----
  function renderContent() {
    let html;
    if (STATE.section === 'founder' && STATE.isMgmt) html = viewFounder();
    else if (STATE.section === 'todos' && !STATE.isMgmt) html = viewTodos();
    else if (STATE.section === 'clients') html = STATE.client ? viewClientDetail(STATE.client) : viewClients();
    else if (STATE.section === 'pipeline' && STATE.isMgmt) html = STATE.campaign ? viewCampaignDetail(STATE.campaign) : viewPipeline();
    else if (STATE.section === 'opportunities' && STATE.isMgmt) html = viewOpportunities();
    else if (STATE.section === 'calendar') html = viewCalendar();
    else if (STATE.section === 'team' && STATE.isMgmt) html = viewTeam();
    else if (STATE.section === 'wijhat') html = viewWijhat();
    else html = viewClients();
    document.getElementById('content').innerHTML = html + pageNav();
  }

  function renderShell() {
    const navHtml = NAV.map(([id, label, code]) => `
      <button class="nav-item${STATE.section === id ? ' active' : ''}" data-go-section="${id}">
        <span style="display:flex;align-items:center;gap:10px;"><span class="nav-code">${code}</span>${esc(label)}</span>
      </button>`).join('');
    document.getElementById('side-nav').innerHTML = `<div class="nav-label">${STATE.isMgmt ? 'Management' : 'Studio team'}</div>${navHtml}`;
    document.getElementById('side-role').textContent = STATE.isMgmt ? 'Management access' : 'Team access';
    document.getElementById('tc-role').textContent = STATE.isMgmt ? 'MGMT' : 'TEAM';
    const editBtn = document.getElementById('edit-toggle');
    editBtn.style.display = STATE.isMgmt ? '' : 'none';
    editBtn.textContent = STATE.editMode ? 'Done editing' : 'Edit';
    editBtn.classList.toggle('on', STATE.editMode);
    document.getElementById('edit-banner').style.display = STATE.editMode ? '' : 'none';
    document.getElementById('view-simple').classList.toggle('on', STATE.view === 'simple');
    document.getElementById('view-detailed').classList.toggle('on', STATE.view === 'detailed');
  }

  function render() { renderShell(); renderContent(); }

  function goSection(sec) { STATE.section = sec; STATE.client = null; STATE.campaign = null; render(); }
  function openClient(id) { if (!id) return; STATE.section = 'clients'; STATE.client = id; STATE.campaign = null; render(); }
  function openCampaign(id) { if (!id) return; STATE.section = 'pipeline'; STATE.campaign = id; STATE.client = null; render(); }

  // ---- top-level controls ----
  document.getElementById('edit-toggle').addEventListener('click', () => { STATE.editMode = !STATE.editMode; render(); });
  document.getElementById('view-simple').addEventListener('click', () => { STATE.view = 'simple'; render(); });
  document.getElementById('view-detailed').addEventListener('click', () => { STATE.view = 'detailed'; render(); });
  document.getElementById('sign-out').addEventListener('click', () => { sessionStorage.removeItem('post_auth'); window.location.href = 'post-login.html'; });

  // ---- event delegation ----
  document.addEventListener('click', (e) => {
    const navBtn = e.target.closest('[data-go-section]'); if (navBtn) { goSection(navBtn.getAttribute('data-go-section')); return; }
    const goBtn = e.target.closest('[data-go]'); if (goBtn && goBtn.getAttribute('data-go')) { goSection(goBtn.getAttribute('data-go')); return; }
    const openC = e.target.closest('[data-open-client]'); if (openC && openC.getAttribute('data-open-client')) { openClient(openC.getAttribute('data-open-client')); return; }
    const openCa = e.target.closest('[data-open-campaign]'); if (openCa && openCa.getAttribute('data-open-campaign')) { openCampaign(openCa.getAttribute('data-open-campaign')); return; }
    const back1 = e.target.closest('[data-back-clients]'); if (back1) { STATE.client = null; render(); return; }
    const back2 = e.target.closest('[data-back-pipeline]'); if (back2) { STATE.campaign = null; render(); return; }
    const chk = e.target.closest('[data-chk-toggle]'); if (chk) {
      const [id, cat] = chk.getAttribute('data-chk-toggle').split('|');
      const c = STATE.campaigns.find((x) => x.id === id);
      c.chk[cat] = nextChk(c.chk[cat]);
      render(); return;
    }
    const todoToggle = e.target.closest('[data-todo-toggle]'); if (todoToggle) {
      const [mi, tid] = todoToggle.getAttribute('data-todo-toggle').split('|');
      const t = STATE.team[mi].todos.find((x) => x.id === tid);
      t.done = !t.done; render(); return;
    }
    const todoDel = e.target.closest('[data-todo-del]'); if (todoDel) {
      const [mi, tid] = todoDel.getAttribute('data-todo-del').split('|');
      STATE.team[mi].todos = STATE.team[mi].todos.filter((x) => x.id !== tid);
      render(); return;
    }
    const todoAdd = e.target.closest('[data-todo-add]'); if (todoAdd) {
      const mi = todoAdd.getAttribute('data-todo-add');
      const input = document.querySelector(`[data-todo-input="${mi}"]`);
      const text = input.value.trim();
      if (text) { STATE.team[mi].todos.push({ id: 'n' + Date.now(), text, done: false }); render(); }
      return;
    }
    // editable: click to convert to input
    const editable = e.target.closest('.editable');
    if (editable && STATE.editMode) { startEdit(editable); return; }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('[data-todo-input]')) {
      const mi = e.target.getAttribute('data-todo-input');
      document.querySelector(`[data-todo-add="${mi}"]`).click();
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.matches('[data-score-edit]')) {
      const [id, dim] = e.target.getAttribute('data-score-edit').split('|');
      const c = STATE.clients.find((x) => x.id === id);
      c.scores[dim] = clamp(Number(e.target.value), 0, 10);
    }
  });
  document.addEventListener('blur', (e) => {
    if (e.target.matches('[data-score-edit]')) render();
  }, true);

  function startEdit(span) {
    const args = JSON.parse(span.getAttribute('data-edit'));
    const value = span.textContent;
    const field = document.createElement(args.multiline ? 'textarea' : 'input');
    field.className = 'edit-input';
    if (!args.multiline) field.type = 'text';
    else field.rows = 3;
    field.value = value === 'n/a' ? '' : value;
    span.replaceWith(field);
    field.focus();
    field.select();
    const commit = () => { commitEdit(args.target, args.id, args.field, args.idx, field.value); render(); };
    field.addEventListener('blur', commit);
    field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !args.multiline) { e.preventDefault(); commit(); }
      if (e.key === 'Escape') render();
    });
  }

  render();
})();
