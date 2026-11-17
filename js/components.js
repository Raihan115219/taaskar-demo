/* ==========================================================================
   TAASKAR — Reusable UI components (string templates + overlay helpers)
   ========================================================================== */

window.UI = (() => {
  const { LOCATIONS, TASK_TYPES, PEOPLE, ME } = window.TData;

  /* ---------- Basics ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name, cls = '') => `<i data-lucide="${name}" class="${cls}"></i>`;
  const money = (n) => '₹' + Math.round(Math.abs(n)).toLocaleString('en-IN');
  const signedMoney = (n) => (n >= 0 ? '+' : '−') + money(n);
  const loc = (id) => LOCATIONS[id] || { id, name: id || '—', area: '', x: 180, y: 120 };
  const isSamePlace = (t) => !t.dropoff || t.dropoff === t.pickup;

  function timeAgo(ts) {
    const diff = Math.max(0, Date.now() - ts);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`;
    const d = Math.floor(h / 24);
    if (d === 1) return 'Yesterday';
    if (d < 7) return `${d} days ago`;
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 2 } });
  }

  /* ---------- People ---------- */
  const meId = () => window.Store?.session;
  const isAccount = (id) => !!(id && window.Store?.state?.users?.[id]);
  function person(id) {
    if (id === 'me') id = meId();
    const acc = window.Store?.state?.users?.[id];
    if (acc) return { ...acc.user, id };
    return PEOPLE[id] || { id, name: 'TAASKAR user', rating: 4.5, tasks: 0, verified: false, tone: 3 };
  }
  const initials = (name) => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const shortName = (name) => { const p = name.split(' '); return p.length > 1 ? `${p[0]} ${p[1][0]}.` : name; };

  function avatar(p, size = '') {
    const pr = typeof p === 'string' ? person(p) : p;
    if (pr.photo) return `<span class="avatar ${size}"><img src="${pr.photo}" alt="${esc(pr.name)}"></span>`;
    return `<span class="avatar ${size} tone-${pr.tone ?? 0}" aria-label="${esc(pr.name)}">${initials(pr.name)}</span>`;
  }
  const verifiedBadge = (p, cls = 'i-16') => (p.verified ? `<span class="verified" title="Verified">${icon('badge-check', cls)}</span>` : '');
  const rating = (r) => `<span class="rating">${icon('star')}${Number(r).toFixed(1)}</span>`;
  function stars(n) {
    let s = '';
    for (let i = 1; i <= 5; i++) s += icon('star', i <= n ? 'on' : '');
    return `<span class="stars">${s}</span>`;
  }

  /* ---------- Task helpers ---------- */
  const STATUS_LABEL = { open: 'Open', accepted: 'Accepted', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };
  const statusBadge = (s) => `<span class="badge b-${s}">${STATUS_LABEL[s] || s}</span>`;
  const typeTileClass = (type) => (type === 'buy' ? 'amber' : type === 'help' ? 'green' : '');
  const fee = (reward) => Math.round(reward * 0.1);

  function stepLabels(type) {
    if (type === 'help') return [
      ['Task Accepted', 'Helper confirmed and is getting ready'],
      ['Heading to Location', 'Helper is on the way to you'],
      ['Arrived & Started', 'Helper has reached and started the task'],
      ['Working on It', 'Task is in progress'],
      ['Task Done', 'Helper marked the task as done'],
      ['Requester Confirmation', 'Payment released after confirmation'],
    ];
    return [
      ['Task Accepted', 'Runner confirmed the task'],
      ['Runner Heading to Pickup', 'On the way to the pickup point'],
      [type === 'buy' ? 'Item Purchased' : 'Item Picked Up', type === 'buy' ? 'Items bought, bill photo shared' : 'Item collected from pickup'],
      ['On the Way', 'Heading to the drop-off location'],
      ['Delivered', 'Item handed over at drop-off'],
      ['Requester Confirmation', 'Payment released after confirmation'],
    ];
  }

  function routeMini(t) {
    if (isSamePlace(t)) {
      return `<div class="route-mini single"><div class="stop"><div><small>Task location</small>${esc(loc(t.pickup).name)}</div></div></div>`;
    }
    return `<div class="route-mini">
      <div class="stop"><div><small>Pickup</small>${esc(loc(t.pickup).name)}</div></div>
      <div class="stop to"><div><small>Drop-off</small>${esc(loc(t.dropoff).name)}</div></div>
    </div>`;
  }

  function distanceText(t) { return isSamePlace(t) ? 'On-site' : `${t.distance} km`; }

  /* Main discovery card (Home / Explore) */
  function taskCard(t, opts = {}) {
    const type = TASK_TYPES[t.type];
    const req = person(t.requester);
    const mine = t.requester === meId();
    return `
    <article class="card task-card tappable" data-open-task="${t.id}" role="button" tabindex="0" aria-label="${esc(t.title)}">
      <div class="tc-top">
        <div class="icon-tile ${typeTileClass(t.type)}">${icon(type.icon, 'i-22')}</div>
        <div style="min-width:0;flex:1">
          <h3 class="tc-title">${esc(t.title)}</h3>
          <div class="tc-sub">${type.label}<span class="dot-sep"></span>${timeAgo(t.postedAt)}${mine ? '<span class="mine-tag">Your task</span>' : ''}${t.status !== 'open' ? statusBadge(t.status) : ''}</div>
        </div>
        <div class="tc-reward"><b class="money">${money(t.reward)}</b><small>Reward</small></div>
      </div>
      ${routeMini(t)}
      <div class="tc-foot">
        <div class="tc-person">${avatar(req, 'sm')}<span class="nm">${esc(mine ? 'You' : shortName(req.name))}</span>${verifiedBadge(req, 'i-14')}${rating(req.rating)}</div>
        <span class="meta" style="display:inline-flex;align-items:center;gap:3px;white-space:nowrap">${icon('navigation', 'i-14')}${distanceText(t)}</span>
        ${opts.noButton ? '' : `<button class="btn btn-soft btn-sm" data-open-task="${t.id}" style="min-height:36px;padding:0 12px">View</button>`}
      </div>
    </article>`;
  }

  /* Activity card with role + progress */
  function activityCard(t) {
    const type = TASK_TYPES[t.type];
    const mineAsRequester = t.requester === meId();
    const other = person(mineAsRequester ? t.runner : t.requester);
    const roleText = mineAsRequester ? 'You posted' : 'You are the runner';
    const stepPct = Math.round(((t.step ?? 0) / 5) * 100);
    const showProgress = t.status === 'accepted' || t.status === 'in_progress';
    return `
    <article class="card task-card tappable" data-activity="${t.id}" role="button" tabindex="0">
      <div class="tc-top">
        <div class="icon-tile ${typeTileClass(t.type)}">${icon(type.icon, 'i-22')}</div>
        <div style="min-width:0;flex:1">
          <h3 class="tc-title">${esc(t.title)}</h3>
          <div class="tc-sub">${roleText}<span class="dot-sep"></span>${timeAgo(t.postedAt)}</div>
        </div>
        ${statusBadge(t.status)}
      </div>
      ${routeMini(t)}
      ${showProgress ? `<div class="progress-mini"><span style="width:${Math.max(8, stepPct)}%"></span></div>
        <div class="meta" style="margin-top:6px">${esc(stepLabels(t.type)[t.step ?? 0][0])}</div>` : ''}
      <div class="tc-foot">
        <div class="tc-person">
          ${t.runner || !mineAsRequester ? `${avatar(other, 'xs')}<span class="nm">${esc(mineAsRequester ? 'Runner: ' + shortName(other.name) : 'For ' + shortName(other.name))}</span>` : `<span class="meta">Waiting for a runner…</span>`}
        </div>
        <b class="money text-green">${money(t.reward)}</b>
        ${icon('chevron-right', 'i-18 text-muted')}
      </div>
    </article>`;
  }

  function skeletonCards(n = 3) {
    let s = '';
    for (let i = 0; i < n; i++) {
      s += `<div class="card task-card" ${i ? 'style="margin-top:12px"' : ''}>
        <div style="display:flex;gap:12px"><div class="skeleton" style="width:44px;height:44px;border-radius:12px"></div>
        <div style="flex:1"><div class="skeleton" style="height:14px;width:70%"></div><div class="skeleton" style="height:10px;width:45%;margin-top:8px"></div></div>
        <div class="skeleton" style="width:48px;height:18px"></div></div>
        <div class="skeleton" style="height:10px;width:60%;margin-top:16px"></div>
        <div class="skeleton" style="height:10px;width:50%;margin-top:10px"></div>
        <div class="skeleton" style="height:30px;width:100%;margin-top:16px;border-radius:10px"></div>
      </div>`;
    }
    return s;
  }

  function emptyState({ icon: ic = 'inbox', title, text, action = '' }) {
    return `<div class="empty"><div class="icon-tile">${icon(ic, 'i-28')}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;
  }

  function escrowNote(compact = false) {
    return `<div class="escrow">
      <div class="icon-tile green sm" style="background:#fff">${icon('shield-check', 'i-18')}</div>
      <div><b>Your payment is protected</b><p>Payment is held securely until the task is completed and confirmed.${compact ? '' : ' Runners are paid only after you approve.'}</p></div>
    </div>`;
  }

  function header({ title = '', sub = '', back = true, close = false, actions = '', cls = '' } = {}) {
    return `<header class="screen-head ${cls}">
      ${back ? `<button class="icon-btn" data-back aria-label="Back">${icon(close ? 'x' : 'chevron-left', 'i-24')}</button>` : ''}
      <div class="head-title-wrap"><h1 class="truncate">${esc(title)}</h1>${sub ? `<div class="head-sub">${sub}</div>` : ''}</div>
      ${actions}
    </header>`;
  }

  /* ---------- Map (SVG, no API key) ---------- */
  const BASE_W = 360, BASE_H = 240;

  function mapBase(k = 1, labels = false) {
    const area = labels ? Object.values(LOCATIONS).map((l) => `<text x="${l.x}" y="${l.y + 15 * k}" text-anchor="middle" font-size="${6.5 * k}" font-weight="600" fill="#98A2B3" font-family="Plus Jakarta Sans">${esc(l.name)}</text>`).join('') : '';
    return `
      <rect x="-400" y="-400" width="1200" height="1100" fill="#EEF2F6"/>
      <g fill="#E3E9F0">
        <rect x="20" y="10" width="70" height="56" rx="6"/><rect x="100" y="0" width="42" height="40" rx="6"/>
        <rect x="226" y="100" width="22" height="34" rx="5"/><rect x="292" y="96" width="60" height="44" rx="6"/>
        <rect x="20" y="200" width="58" height="36" rx="6"/><rect x="190" y="178" width="40" height="22" rx="5"/>
        <rect x="290" y="160" width="62" height="40" rx="6"/><rect x="30" y="92" width="52" height="54" rx="6"/>
        <rect x="-110" y="20" width="70" height="50" rx="6"/><rect x="-90" y="120" width="60" height="60" rx="6"/><rect x="-120" y="200" width="80" height="40" rx="6"/>
        <rect x="380" y="10" width="70" height="60" rx="6"/><rect x="400" y="110" width="60" height="50" rx="6"/><rect x="380" y="190" width="80" height="44" rx="6"/>
      </g>
      <path d="M110 96 q22 -14 36 6 q8 24 -12 34 q-26 6 -30 -16 z" fill="#D7EBDD"/>
      <path d="M128 52 q20 -10 36 2 q6 18 -10 26 q-24 4 -28 -10 z" fill="#D7EBDD"/>
      <ellipse cx="232" cy="40" rx="18" ry="11" fill="#D4E4F2"/>
      <path d="M-20 228 C60 214 110 236 170 226 S290 236 380 222" fill="none" stroke="#D4E4F2" stroke-width="7"/>
      <g fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 34 Q180 -18 344 38 Q392 150 326 236" stroke-width="7"/>
        <path d="M160 -10 L160 34 L190 64 L206 92 L168 142 L160 206 L150 260" stroke-width="7"/>
        <path d="M-220 100 L-10 92 Q110 98 190 64 T370 46 L580 40" stroke-width="6"/>
        <path d="M-220 200 L-10 196 Q60 182 94 178 Q130 158 168 142 Q200 150 230 154 T370 160 L580 166" stroke-width="6"/>
        <path d="M284 -10 L284 70 L262 112 L230 154 L252 212 L272 260" stroke-width="6"/>
        <path d="M94 178 L118 120 L190 64" stroke-width="4"/>
        <path d="M118 120 L168 142" stroke-width="4"/>
        <path d="M160 206 L252 212" stroke-width="4"/>
        <path d="M206 92 L262 112" stroke-width="4"/>
      </g>
      <g fill="none" stroke="#F6F8FB" stroke-width="2">
        <path d="M-220 60 H580"/><path d="M-220 128 H580"/><path d="M-220 168 H580"/><path d="M-220 10 H580"/><path d="M-220 220 H580"/>
        <path d="M60 -60 V300"/><path d="M130 -60 V300"/><path d="M240 -60 V300"/><path d="M320 -60 V300"/><path d="M-60 -60 V300"/><path d="M0 -60 V300"/><path d="M380 -60 V300"/><path d="M440 -60 V300"/>
      </g>
      ${area}`;
  }

  function fitViewBox(points, ratio, pad = 46) {
    const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
    let minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
    let minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
    let w = maxX - minX, h = maxY - minY;
    if (w / h > ratio) { const nh = w / ratio; minY -= (nh - h) / 2; h = nh; }
    else { const nw = h * ratio; minX -= (nw - w) / 2; w = nw; }
    return { x: minX, y: minY, w, h };
  }

  function routePath(a, b) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    const cx = mx - dy * 0.22, cy = my + dx * 0.22;
    return `M${a.x} ${a.y} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x} ${b.y}`;
  }

  function label(x, y, text, k, tone = 'navy') {
    const fs = 8.5 * k, w = (text.length * 4.9 + 14) * k, h = 16 * k;
    const fill = tone === 'green' ? '#167C63' : '#142D4E';
    return `<g><rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="${5 * k}" fill="#fff" stroke="#E6EAF0" stroke-width="${0.8 * k}"/>
      <text x="${x}" y="${y + h * 0.68}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="${fill}" font-family="Plus Jakarta Sans">${esc(text)}</text></g>`;
  }

  function pin(p, k, kind) {
    if (kind === 'pickup') {
      return `<circle cx="${p.x}" cy="${p.y}" r="${12 * k}" fill="#167C63" opacity=".15"/>
        <circle cx="${p.x}" cy="${p.y}" r="${6.5 * k}" fill="#fff" stroke="#167C63" stroke-width="${3.5 * k}"/>`;
    }
    const s = k;
    return `<g transform="translate(${p.x} ${p.y}) scale(${s})">
      <ellipse cx="0" cy="1" rx="6" ry="2.4" fill="rgba(20,45,78,.2)"/>
      <path d="M0 0 C-2 -6 -9 -10 -9 -17 a9 9 0 0 1 18 0 C9 -10 2 -6 0 0z" fill="#142D4E"/>
      <circle cx="0" cy="-17" r="3.4" fill="#fff"/></g>`;
  }

  /* Route preview between pickup & drop-off (or a single location). */
  function routeMap(t, { height = 180, ratio = 0, id = 'rt', runner = false } = {}) {
    if (!ratio) ratio = 390 / height;
    const a = loc(t.pickup), b = loc(isSamePlace(t) ? t.pickup : t.dropoff);
    const single = isSamePlace(t);
    const pts = single ? [a, { x: a.x - 50, y: a.y - 30 }, { x: a.x + 50, y: a.y + 30 }] : [a, b];
    if (runner) pts.push({ x: a.x - 52, y: a.y - 22 });
    pts.push({ x: a.x, y: a.y + 30 }, { x: b.x, y: b.y + 26 });
    const vb = fitViewBox(pts, ratio, single ? 30 : 36);
    const k = vb.w / BASE_W * 1.35;
    const approach = `M${a.x - 52} ${a.y - 22} Q${a.x - 20} ${a.y - 26} ${a.x} ${a.y}`;
    return `<div class="map-wrap" style="height:${height}px">
      <svg viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" preserveAspectRatio="xMidYMid meet" aria-label="Route preview">
        ${mapBase(1)}
        ${runner ? `<path id="${id}-approach" d="${approach}" fill="none" stroke="#98A2B3" stroke-width="${2.2 * k}" stroke-dasharray="${4 * k} ${4 * k}" stroke-linecap="round"/>` : ''}
        ${single ? `<circle class="pulse" cx="${a.x}" cy="${a.y}" r="${14 * k}" fill="#167C63" opacity=".25"/>` : `
          <path d="${routePath(a, b)}" fill="none" stroke="#fff" stroke-width="${7.5 * k}" stroke-linecap="round"/>
          <path id="${id}-path" d="${routePath(a, b)}" fill="none" stroke="#142D4E" stroke-width="${3.6 * k}" stroke-linecap="round"/>`}
        ${pin(a, k, 'pickup')}
        ${single ? '' : pin(b, k, 'drop')}
        ${label(a.x, a.y + 10 * k, a.name, k, 'green')}
        ${single ? '' : label(b.x, b.y + 6 * k, b.name, k)}
        ${runner ? `<g id="${id}-runner" style="transition:none"><circle r="${13 * k}" fill="#167C63" opacity=".18" class="pulse"/>
          <circle r="${8 * k}" fill="#167C63" stroke="#fff" stroke-width="${2.5 * k}"/>
          <path d="M${-3 * k} ${0} l${2.4 * k} ${2.4 * k} l${4 * k} ${-4.6 * k}" stroke="#fff" stroke-width="${1.8 * k}" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>` : ''}
      </svg>
    </div>`;
  }

  /* ---------- Toasts ---------- */
  function toast(msg, type = 'success', ms = 2600) {
    const root = document.getElementById('toast-root');
    const ic = { success: 'circle-check', error: 'circle-alert', warn: 'triangle-alert', info: 'info' }[type] || 'info';
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `${icon(ic)}<span>${esc(msg)}</span>`;
    root.appendChild(el);
    refreshIcons();
    while (root.children.length > 3) root.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, ms);
  }

  /* ---------- Bottom sheet ---------- */
  let sheetStack = [];
  function openSheet({ title = '', body = '', footer = '', onMount, onClose, tall = false } = {}) {
    const root = document.getElementById('overlay-root');
    const wrap = document.createElement('div');
    wrap.className = 'overlay-layer';
    wrap.innerHTML = `<div class="backdrop"></div>
      <section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}" ${tall ? 'style="height:88%"' : ''}>
        <div class="grab"></div>
        ${title ? `<div class="sheet-head"><h3>${esc(title)}</h3><button class="icon-btn" data-sheet-close aria-label="Close">${icon('x', 'i-22')}</button></div>` : ''}
        <div class="sheet-body" style="${tall ? 'flex:1' : ''}">${body}</div>
        ${footer ? `<div class="sheet-foot">${footer}</div>` : ''}
      </section>`;
    root.appendChild(wrap);
    const sheet = wrap.querySelector('.sheet');
    const bd = wrap.querySelector('.backdrop');
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      sheet.classList.remove('show'); bd.classList.remove('show');
      sheetStack = sheetStack.filter((c) => c !== close);
      setTimeout(() => wrap.remove(), 300);
      onClose && onClose();
    };
    bd.addEventListener('click', close);
    wrap.querySelectorAll('[data-sheet-close]').forEach((b) => b.addEventListener('click', close));
    sheetStack.push(close);
    refreshIcons();
    requestAnimationFrame(() => requestAnimationFrame(() => { sheet.classList.add('show'); bd.classList.add('show'); }));
    onMount && onMount(sheet, close);
    return close;
  }
  const closeTopSheet = () => { const c = sheetStack[sheetStack.length - 1]; if (c) { c(); return true; } return false; };
  const closeAllSheets = () => { [...sheetStack].reverse().forEach((c) => c()); };

  /* ---------- Confirmation dialog ---------- */
  function confirmDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', tone = 'primary', ic = 'circle-help' }) {
    return new Promise((resolve) => {
      const root = document.getElementById('overlay-root');
      const wrap = document.createElement('div');
      const tileCls = tone === 'danger' ? 'red' : tone === 'green' ? 'green' : '';
      const btnCls = tone === 'danger' ? 'btn-danger' : tone === 'green' ? 'btn-green' : 'btn-primary';
      wrap.innerHTML = `<div class="backdrop"></div>
        <div class="dialog-wrap"><div class="dialog" role="alertdialog" aria-modal="true">
          <div class="icon-tile lg ${tileCls}">${icon(ic, 'i-24')}</div>
          <h3>${esc(title)}</h3><p>${esc(message)}</p>
          <div class="actions">${cancelText ? `<button class="btn btn-outline" data-no>${esc(cancelText)}</button>` : ''}<button class="btn ${btnCls}" data-yes>${esc(confirmText)}</button></div>
        </div></div>`;
      root.appendChild(wrap);
      refreshIcons();
      const dlg = wrap.querySelector('.dialog'), bd = wrap.querySelector('.backdrop');
      requestAnimationFrame(() => requestAnimationFrame(() => { dlg.classList.add('show'); bd.classList.add('show'); }));
      const done = (v) => {
        dlg.classList.remove('show'); bd.classList.remove('show');
        setTimeout(() => wrap.remove(), 220);
        sheetStack = sheetStack.filter((c) => c !== cancel);
        resolve(v);
      };
      const cancel = () => done(false);
      sheetStack.push(cancel);
      wrap.querySelector('[data-yes]').addEventListener('click', () => done(true));
      wrap.querySelector('[data-no]')?.addEventListener('click', cancel);
      bd.addEventListener('click', cancel);
    });
  }

  /* ---------- Button loading state ---------- */
  function withLoading(btn, ms = 800) {
    return new Promise((res) => {
      const html = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';
      setTimeout(() => { btn.disabled = false; btn.innerHTML = html; refreshIcons(); res(); }, ms);
    });
  }

  return {
    meId, isAccount, esc, icon, money, signedMoney, loc, timeAgo, refreshIcons, person, avatar, initials, shortName, verifiedBadge, rating, stars,
    STATUS_LABEL, statusBadge, typeTileClass, fee, stepLabels, routeMini, distanceText, isSamePlace, taskCard, activityCard,
    skeletonCards, emptyState, escrowNote, header, mapBase, fitViewBox, routePath, routeMap, pin, label,
    toast, openSheet, closeTopSheet, closeAllSheets, confirmDialog, withLoading,
  };
})();
