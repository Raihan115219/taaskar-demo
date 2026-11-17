/* ==========================================================================
   TAASKAR — App shell: store, router, screens and actions
   Frontend-only prototype. All state lives in localStorage.
   ========================================================================== */

(() => {
  'use strict';

  const D = window.TData;
  const U = window.UI;
  const { icon, esc, money } = U;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ======================================================================
     STORE
     ====================================================================== */
  const KEY = 'taaskar_demo_v2';
  const SESSION_KEY = 'taaskar_session';
  /* Everything below is stored per account; tasks, chats and accounts are shared. */
  const USER_KEYS = ['user', 'wallet', 'transactions', 'notifications', 'payments', 'savedLocations', 'settings', 'reports', 'ratings', 'draft', 'explore', 'currentLocation'];
  const defaultSettings = () => ({ push: true, sms: false, email: true, liveLocation: true, language: 'English' });
  const defaultExplore = () => ({ segment: 'nearby', sort: 'newest', filters: emptyFilters(), route: { from: 'christ', to: 'indiranagar' } });
  const ago = (now, list) => list.map((x) => ({ ...x, at: now - x.minutesAgo * 60000 }));

  function seedUser(profile, seed, now) {
    return {
      user: { ...profile },
      wallet: { ...seed.wallet },
      transactions: ago(now, seed.transactions),
      notifications: ago(now, seed.notifications),
      payments: seed.payments.map((p) => ({ ...p })),
      savedLocations: seed.savedLocations.map((l) => ({ ...l })),
      settings: defaultSettings(),
      reports: [],
      ratings: { ...seed.ratings },
      draft: null,
      explore: defaultExplore(),
      currentLocation: seed.currentLocation,
    };
  }

  /* A brand-new account created from the Sign-up screen. */
  function blankUser(acc) {
    const first = acc.name.split(' ')[0];
    const now = Date.now();
    return {
      user: {
        id: acc.id, name: acc.name, firstName: first, email: acc.email,
        phone: '+91 ' + acc.phone.slice(0, 5) + ' ' + acc.phone.slice(5),
        city: 'Bengaluru, Karnataka', college: 'New member', rating: 5.0, completed: 0, tasks: 0, verified: false,
        since: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), tone: 1, photo: null,
      },
      wallet: { available: 1000, pending: 0, earnings: 0, spending: 0 },
      transactions: [{ id: uid('x'), kind: 'topup', title: 'Welcome credit', note: 'Demo balance to try TAASKAR', amount: 1000, at: now }],
      notifications: [{ id: uid('n'), icon: 'party-popper', title: `Welcome to TAASKAR, ${first}!`, text: 'Post a task or accept one nearby to get started.', at: now, read: false }],
      payments: [{ id: 'pm1', kind: 'upi', label: 'UPI', detail: (first.toLowerCase().replace(/[^a-z]/g, '') || 'user') + '@okaxis', primary: true }],
      savedLocations: [],
      settings: defaultSettings(),
      reports: [],
      ratings: {},
      draft: null,
      explore: defaultExplore(),
      currentLocation: 'christ',
    };
  }

  const Store = (window.Store = {
    state: null,
    session: null,
    seed() {
      const now = Date.now();
      return {
        version: 3,
        /* Prototype-only account list kept in this browser (mock auth, never sent anywhere). */
        accounts: D.DEMO_ACCOUNTS.map((a) => ({ ...a })),
        users: {
          aarav: seedUser(D.ME, { wallet: D.WALLET, transactions: D.TRANSACTIONS, notifications: D.NOTIFICATIONS, payments: D.PAYMENT_METHODS, savedLocations: D.SAVED_LOCATIONS, currentLocation: 'christ', ratings: { t203: 5, t302: 5 } }, now),
          rohan: seedUser(D.RUNNER, D.RUNNER_SEED, now),
        },
        tasks: D.TASKS.map((t) => ({
          ...t,
          postedAt: now - t.minutesAgo * 60000,
          runner: t.runner || null,
          step: t.step ?? (t.status === 'completed' ? 5 : 0),
          fee: feeModel(t.reward).fee,
          image: null,
        })),
        chats: {},
      };
    },
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        this.state = raw ? JSON.parse(raw) : null;
      } catch (e) { this.state = null; }
      if (!this.state || this.state.version !== 3) this.state = this.seed();
      try { this.session = sessionStorage.getItem(SESSION_KEY); } catch (e) { this.session = null; }
      if (this.session && !this.state.users[this.session]) this.setSession(null);
      this.save();
    },
    /* Pull the latest shared state (another tab may have changed it). Keeps this tab's unsaved draft. */
    reload(raw) {
      try {
        const st = JSON.parse(raw ?? localStorage.getItem(KEY));
        if (!st || st.version !== 3) return false;
        const mine = this.state?.users?.[this.session];
        if (mine && st.users[this.session]) st.users[this.session].draft = mine.draft;
        this.state = st;
        return true;
      } catch (e) { return false; }
    },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.state)); }
      catch (e) { U.toast('Device storage is full. Some changes may not be saved.', 'warn'); }
    },
    setSession(id) {
      this.session = id || null;
      try { if (id) sessionStorage.setItem(SESSION_KEY, id); else sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    },
    reset() {
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      this.state = this.seed();
      if (this.session && !this.state.users[this.session]) this.setSession(null);
      this.save();
    },
  });

  /* S() is a view of the signed-in account's data plus the shared marketplace. */
  let guest = null;
  const curUser = () => Store.state.users[Store.session] || guest || (guest = blankUser({ id: 'guest', name: 'Guest User', email: '', phone: '0000000000' }));
  const ctx = {};
  USER_KEYS.forEach((k) => Object.defineProperty(ctx, k, { get: () => curUser()[k], set: (v) => { curUser()[k] = v; } }));
  ['tasks', 'chats', 'accounts'].forEach((k) => Object.defineProperty(ctx, k, { get: () => Store.state[k], set: (v) => { Store.state[k] = v; } }));
  Object.defineProperty(ctx, 'loggedIn', { get: () => !!(Store.session && Store.state.users[Store.session]) });
  const S = () => ctx;
  const me = () => Store.session;
  const isAccount = (id) => !!(id && Store.state.users[id]);
  const myAccount = () => Store.state.accounts.find((a) => a.id === me());

  function emptyFilters() { return { types: [], maxDist: 10, minReward: 0, pickup: '', dropoff: '' }; }

  /* ---------- Domain helpers ---------- */
  const getTask = (id) => S().tasks.find((t) => t.id === id);
  const unread = () => S().notifications.filter((n) => !n.read).length;
  /* Item budget held in escrow for Buy & Bring (sample users' tasks count their stated budget). */
  const itemHeld = (t) => (t.type === 'buy' ? (t.itemEscrow ?? (isAccount(t.requester) ? 0 : (t.budget || 0))) : 0);
  /* Money model (TAASKAR payment-flow sheet):
     - Sender pays item price (Buy & Bring budget) + runner reward + a refundable security deposit.
     - Runner adds a refundable security stake when accepting.
     - Platform fee F = 10% of reward (min ₹5): (F - share) from the sender's deposit, share (20%) from the runner's stake.
     - Deposit = 2 × F, stake = F.  Example ₹5 reward → F ₹5 = ₹4 + ₹1, deposit ₹10, stake ₹5. */
  function feeModel(reward) {
    const fee = Math.max(5, Math.round((+reward || 0) * 0.1));
    const feeRunner = Math.max(1, Math.round(fee * 0.2));
    return { fee, feeUser: fee - feeRunner, feeRunner, deposit: fee * 2, stake: fee };
  }
  const M = (t) => t.fees || feeModel(t.reward);
  const stakeOf = (t) => (t.runner ? (t.stakePaid ?? M(t).stake) : 0);
  /* What the sender paid into escrow. */
  const total = (t) => itemHeld(t) + t.reward + M(t).deposit;
  const draftTotals = (d) => {
    const reward = +d.reward || 0, m = feeModel(reward), budget = d.type === 'buy' ? (+d.budget || 0) : 0;
    return { reward, budget, ...m, tot: budget + reward + m.deposit };
  };

  /* Who gets what when a task ends. */
  function computeSettlement(t, outcome) {
    const m = M(t), R = t.reward, held = itemHeld(t), stake = stakeOf(t);
    const bought = t.purchase && t.purchase.status === 'ok';
    const join = (a) => a.filter(Boolean).join(' + ');
    let cost = 0, runner = 0, user = 0, platform = 0, rl = '', ul = '', pl = '';
    if (outcome === 'completed') {
      cost = held ? Math.min(held, t.purchase?.amount ?? held) : 0;
      runner = cost + R + (stake - m.feeRunner);
      user = (m.deposit - m.feeUser) + (held - cost);
      platform = m.feeUser + m.feeRunner;
      rl = join([cost && `${money(cost)} item`, `${money(R)} reward`, `${money(stake - m.feeRunner)} stake back`]);
      ul = join([`${money(m.deposit - m.feeUser)} of ${money(m.deposit)} deposit`, held - cost > 0 && `${money(held - cost)} unused budget`]);
      pl = `${money(m.feeUser)} from deposit + ${money(m.feeRunner)} from stake`;
    } else if (outcome === 'runner_cancelled') {
      user = held + R + m.deposit;
      platform = stake;
      rl = 'Security stake forfeited';
      ul = join([held && `${money(held)} item`, `${money(R)} reward`, `${money(m.deposit)} deposit`]);
      pl = `${money(stake)} from runner stake`;
    } else if (outcome === 'user_cancelled') {
      cost = held && bought ? Math.min(held, t.purchase.amount) : 0;
      runner = cost + stake;
      user = (m.deposit - m.fee) + R + (held - cost);
      platform = m.fee;
      rl = join([cost && `${money(cost)} item`, `${money(stake)} stake back`]);
      ul = join([`${money(m.deposit - m.fee)} deposit`, `${money(R)} reward`, held - cost > 0 && `${money(held - cost)} item budget`]);
      pl = `${money(m.fee)} from sender deposit`;
    } else {
      user = held + R + m.deposit;
      rl = 'No runner yet';
      ul = 'Full refund';
      pl = 'No fee';
    }
    return { outcome, cost, runner, user, platform, lines: { runner: rl, user: ul, platform: pl } };
  }

  /* Move the money: credit demo accounts in this browser and record the result on the task. */
  function applySettlement(t, outcome) {
    const st = computeSettlement(t, outcome);
    t.settlement = { ...st, at: Date.now() };
    const m = M(t);
    const ru = Store.state.users[t.runner];
    if (ru) {
      ru.wallet.pending = Math.max(0, ru.wallet.pending - t.reward);
      ru.wallet.available += st.runner;
      if (outcome === 'completed') {
        ru.wallet.earnings += t.reward;
        ru.user.completed = (ru.user.completed ?? 0) + 1;
        ru.user.tasks = (ru.user.tasks ?? 0) + 1;
      }
      if (st.cost) addTxnFor(t.runner, { kind: 'reimburse', title: 'Item cost reimbursed', note: t.title, amount: st.cost });
      if (outcome === 'completed') {
        addTxnFor(t.runner, { kind: 'reward', title: 'Task reward', note: t.title, amount: t.reward });
        addTxnFor(t.runner, { kind: 'stake_return', title: 'Stake returned', note: `${t.title} · ${money(m.feeRunner)} platform fee`, amount: stakeOf(t) - m.feeRunner });
      }
      if (outcome === 'user_cancelled') addTxnFor(t.runner, { kind: 'stake_return', title: 'Stake returned', note: `${t.title} · cancelled by sender`, amount: stakeOf(t) });
    }
    const rq = Store.state.users[t.requester];
    if (rq && st.user > 0) {
      rq.wallet.available += st.user;
      rq.wallet.spending = Math.max(0, rq.wallet.spending - st.user);
      addTxnFor(t.requester, { kind: 'refund', title: outcome === 'completed' ? 'Deposit refund' : 'Refund', note: `${t.title} · ${st.lines.user}`, amount: st.user });
    }
    return st;
  }

  const SETTLE_TITLE = { completed: 'Settlement', runner_cancelled: 'Settlement · cancelled by runner', user_cancelled: 'Settlement · cancelled by sender', cancelled_open: 'Refund' };
  function settlementCard(t) {
    const st = t.settlement;
    if (!st) return '';
    const row = (label, amount, line, cls = '') => `<div class="settle-row"><div><span>${label}</span><small>${esc(line)}</small></div><b class="${cls}">${money(amount)}</b></div>`;
    return `<div class="card card-pad" style="margin-top:12px">
      <div class="card-title">${icon(st.outcome === 'completed' ? 'circle-check' : 'circle-x', 'i-18 ' + (st.outcome === 'completed' ? 'text-green' : 'text-danger'))}${SETTLE_TITLE[st.outcome]}</div>
      ${row('Runner receives', st.runner, st.lines.runner)}
      ${row('Sender refund', st.user, st.lines.user, 'text-green')}
      ${row('TAASKAR fee', st.platform, st.lines.platform)}
    </div>`;
  }

  /* Escrow summary while a task is active. */
  function escrowCard(t, { iRun = false, done = false } = {}) {
    if (t.settlement) return settlementCard(t);
    const m = M(t), held = itemHeld(t), stake = stakeOf(t), bill = t.purchase;
    const parts = [held && `Item ${money(held)}`, `Reward ${money(t.reward)}`, `Deposit ${money(m.deposit)}`].filter(Boolean).join(' · ');
    return `<div class="card card-pad" style="margin-top:12px">
      <div class="card-title">${icon('lock', 'i-18 text-navy')}Held in escrow</div>
      <div class="settle-row"><div><span>Sender paid</span><small>${parts}</small></div><b>${money(total(t))}</b></div>
      ${t.runner ? `<div class="settle-row"><div><span>Runner stake</span><small>Refundable</small></div><b>${money(stake)}</b></div>` : ''}
      <div class="kv total"><span>Total held</span><b>${money(total(t) + stake)}</b></div>
      ${held ? (bill ? `<div class="divider"></div>
        <div class="kv"><span>Bill amount</span><b>${money(bill.amount)}${bill.photo ? ` <button class="edit-link" data-action="view-bill">View bill</button>` : ''}</b></div>
        ${bill.status === 'pending' ? `<div class="kv"><span>Status</span><b style="color:var(--warn-dk)">Awaiting approval</b></div>` : ''}`
        : (t.runner ? `<div class="hint">${iRun ? 'Add the bill when you buy the items.' : 'The runner adds the bill after buying.'}</div>` : '')) : ''}
    </div>`;
  }

  function notify(n) { S().notifications.unshift({ id: uid('n'), at: Date.now(), read: false, ...n }); }
  function addTxn(x) { S().transactions.unshift({ id: uid('x'), at: Date.now(), ...x }); }
  /* Deliver a notification / transaction to another demo account in this browser. */
  function notifyUser(id, n) { const u = Store.state.users[id]; if (u && id !== me()) u.notifications.unshift({ id: uid('n'), at: Date.now(), read: false, ...n }); }
  function addTxnFor(id, x) { const u = Store.state.users[id]; if (u) u.transactions.unshift({ id: uid('x'), at: Date.now(), ...x }); }
  const firstName = (id) => U.person(id).name.split(' ')[0];

  function kmBetween(aId, bId) {
    const a = U.loc(aId), b = U.loc(bId);
    return Math.max(0.4, Math.round((Math.hypot(a.x - b.x, a.y - b.y) / 40) * 10) / 10);
  }
  const awayKm = (t) => kmBetween(S().currentLocation, t.pickup);

  function segDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    let k = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    k = Math.max(0, Math.min(1, k));
    return Math.hypot(p.x - (a.x + k * dx), p.y - (a.y + k * dy));
  }
  function onRoute(t) {
    const r = S().explore.route;
    const a = U.loc(r.from), b = U.loc(r.to);
    return segDist(U.loc(t.pickup), a, b) <= 50 && segDist(U.loc(t.dropoff || t.pickup), a, b) <= 50;
  }

  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  function readImage(file, max = 760) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('Please choose an image file'));
      if (file.size > 12 * 1024 * 1024) return reject(new Error('Image must be smaller than 12 MB'));
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('Could not read the image'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Unsupported image'));
        img.onload = () => {
          const sc = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.72));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  const brandMark = (size = '') => `<span class="brand-mark" ${size}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M5.5 6.5h13"/><path d="M12 6.5v8"/><circle cx="12" cy="18.6" r="2.3" fill="#3FD1A4" stroke="none"/></svg></span>`;

  const locOptions = (sel, placeholder) =>
    `<option value="">${placeholder}</option>` +
    Object.values(D.LOCATIONS).map((l) => `<option value="${l.id}" ${l.id === sel ? 'selected' : ''}>${esc(l.name)} — ${esc(l.area.split(',')[0])}</option>`).join('');

  /* ======================================================================
     ROUTER
     ====================================================================== */
  const NAV_SCREENS = new Set(['home', 'explore', 'activity', 'profile']);
  const PUBLIC_SCREENS = new Set(['welcome', 'login', 'signup', 'forgot']);

  let cleanup = null;
  let currentEl = null;

  const Router = {
    stack: [],
    top() { return this.stack[this.stack.length - 1]; },
    go(name, params = {}, opts = {}) {
      U.closeAllSheets();
      if (opts.replace) this.stack.pop();
      this.stack.push({ name, params });
      render(opts.anim || 'push');
    },
    tab(name, params = {}) {
      U.closeAllSheets();
      this.stack = [{ name, params }];
      render('fade');
    },
    back() {
      U.closeAllSheets();
      if (this.stack.length > 1) { this.stack.pop(); render('pop'); }
      else if (S().loggedIn && this.top()?.name !== 'home') this.tab('home');
      else if (!S().loggedIn && this.top()?.name !== 'welcome') { this.stack = [{ name: 'welcome', params: {} }]; render('pop'); }
    },
  };

  function render(anim = 'fade') {
    const top = Router.top();
    if (!top) return;
    if (!S().loggedIn && !PUBLIC_SCREENS.has(top.name)) { Router.stack = [{ name: 'welcome', params: {} }]; return render('fade'); }

    const def = Screens[top.name] || Screens.notFound;
    const out = def(top.params || {});
    const view = $('#view');
    const showNav = NAV_SCREENS.has(top.name);

    if (cleanup) { try { cleanup(); } catch (e) { /* ignore */ } cleanup = null; }

    const el = document.createElement('div');
    el.className = `screen ${showNav ? 'with-nav' : ''} ${out.cls || ''} ${anim !== 'none' ? 'anim-' + anim : ''}`;
    el.innerHTML = out.html;

    $$('.screen', view).forEach((old) => {
      if (anim === 'none') old.remove();
      else { old.classList.add('anim-out'); setTimeout(() => old.remove(), 190); }
    });
    view.appendChild(el);
    currentEl = el;

    $('#app').classList.toggle('dark-top', !!out.dark);
    $('#app').classList.toggle('light-top', !out.dark && PUBLIC_SCREENS.has(top.name));
    setNav(showNav ? top.name : null, showNav);
    U.refreshIcons();
    if (out.mount) cleanup = out.mount(el) || null;
    U.refreshIcons();
  }

  /* Re-render the current screen in place (keeps scroll position). */
  function refresh() {
    if (!currentEl) return;
    const sc = currentEl.scrollTop;
    render('none');
    if (currentEl) currentEl.scrollTop = sc;
  }

  function setNav(active, show) {
    const nav = $('#bottom-nav');
    nav.classList.toggle('nav-hidden', !show);
    $$('.nav-item', nav).forEach((b) => b.classList.toggle('active', b.dataset.nav === active));
  }

  /* ======================================================================
     SCREENS
     ====================================================================== */
  const Screens = {};

  /* ---------------- Authentication ---------------- */
  Screens.welcome = () => ({
    dark: true,
    html: `
    <div class="welcome">
      <div class="art">
        <svg viewBox="0 0 320 260" width="100%" style="max-width:330px" aria-hidden="true">
          <defs><pattern id="g" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="rgba(255,255,255,.06)"/></pattern></defs>
          <rect width="320" height="260" rx="28" fill="url(#g)"/>
          <path d="M48 200 C 110 200, 90 90, 160 110 S 250 60, 272 54" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="10" stroke-linecap="round"/>
          <path d="M48 200 C 110 200, 90 90, 160 110 S 250 60, 272 54" fill="none" stroke="#3FD1A4" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="7 9"/>
          <circle cx="48" cy="200" r="15" fill="rgba(63,209,164,.2)"/><circle cx="48" cy="200" r="7.5" fill="#fff" stroke="#3FD1A4" stroke-width="4"/>
          <g transform="translate(272 54)"><path d="M0 0 C-3 -8 -12 -12 -12 -22 a12 12 0 0 1 24 0 C12 -12 3 -8 0 0z" fill="#fff"/><circle cx="0" cy="-22" r="4.5" fill="#142D4E"/></g>
          <g transform="translate(150 84)">
            <rect x="-62" y="-30" width="124" height="54" rx="14" fill="#fff"/>
            <rect x="-52" y="-20" width="34" height="34" rx="10" fill="#E8F5EF"/>
            <path d="M-44 -8 l9 -5 9 5 v10 l-9 5 -9 -5z M-44 -8 l9 5 9 -5 M-35 -3v10" fill="none" stroke="#167C63" stroke-width="2" stroke-linejoin="round"/>
            <rect x="-10" y="-14" width="56" height="8" rx="4" fill="#182230"/>
            <rect x="-10" y="0" width="38" height="7" rx="3.5" fill="#D0D5DD"/>
          </g>
          <g transform="translate(92 168)">
            <rect x="-40" y="-17" width="80" height="34" rx="17" fill="#167C63"/>
            <text x="0" y="5" text-anchor="middle" font-size="14" font-weight="800" fill="#fff" font-family="Plus Jakarta Sans">₹120</text>
          </g>
          <g transform="translate(236 168)">
            <rect x="-52" y="-20" width="104" height="40" rx="12" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.18)"/>
            <circle cx="-32" cy="0" r="10" fill="#DCE6F2"/><text x="-32" y="4" text-anchor="middle" font-size="9" font-weight="800" fill="#142D4E" font-family="Plus Jakarta Sans">PN</text>
            <text x="-16" y="-2" font-size="10" font-weight="700" fill="#fff" font-family="Plus Jakarta Sans">Priya N.</text>
            <text x="-16" y="11" font-size="9" fill="rgba(255,255,255,.7)" font-family="Plus Jakarta Sans">★ 4.9 · Verified</text>
          </g>
        </svg>
      </div>
      <div class="copy">
        <div class="brand" style="color:#fff;margin-bottom:18px">${brandMark('style="background:#fff;color:#142D4E"')}<span>TAASKAR</span></div>
        <h1>Get things done by people already heading your way.</h1>
        <p>Send, shop or get a hand from verified neighbours across Bengaluru. Payments stay protected until you confirm.</p>
        <button class="btn btn-white btn-block" data-go="signup">Get Started</button>
        <button class="btn btn-line btn-block" style="margin-top:10px" data-go="login">I already have an account</button>
        <div style="display:flex;justify-content:center;gap:16px;margin-top:18px;font-size:12px;color:rgba(255,255,255,.65);font-weight:600">
          <span style="display:inline-flex;gap:5px;align-items:center">${icon('badge-check', 'i-14')}Verified users</span>
          <span style="display:inline-flex;gap:5px;align-items:center">${icon('shield-check', 'i-14')}Escrow payments</span>
        </div>
      </div>
    </div>`,
  });

  Screens.login = () => ({
    html: `
    <div class="auth">
      <div class="auth-top"><button class="icon-btn" data-back aria-label="Back">${icon('chevron-left', 'i-24')}</button></div>
      <form class="auth-body" id="login-form" novalidate>
        ${brandMark()}
        <h1>Welcome back</h1>
        <p class="sub">Log in to post tasks or earn on your everyday trips.</p>
        <div class="field" data-f="id">
          <label class="label" for="lg-id">Email or mobile number</label>
          <div class="input-wrap"><span class="lead">${icon('mail', 'i-18')}</span><input id="lg-id" class="input has-lead" autocomplete="username" placeholder="you@example.com"></div>
          <div class="error-text"></div>
        </div>
        <div class="field" data-f="pw">
          <label class="label" for="lg-pw">Password</label>
          <div class="input-wrap"><span class="lead">${icon('lock', 'i-18')}</span><input id="lg-pw" type="password" class="input has-lead" autocomplete="current-password" placeholder="Enter your password" style="padding-right:52px">
          <button type="button" class="icon-btn trail" data-toggle-pw aria-label="Show password">${icon('eye', 'i-18')}</button></div>
          <div class="error-text"></div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin:-6px 0 14px"><button type="button" class="link-btn" data-go="forgot">Forgot password?</button></div>
        <button class="btn btn-primary btn-block" type="submit">Log In</button>
        <div class="or">DEMO ACCOUNTS</div>
        ${D.DEMO_ACCOUNTS.map((a) => `<div class="card" style="display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:10px;box-shadow:none;${a.role === 'Runner' ? 'background:var(--navy-lt);border-color:#D5DFEC' : 'background:var(--green-lt);border-color:#CDE9DC'}">
          <div class="icon-tile sm ${a.role === 'Runner' ? '' : 'green'}" style="background:#fff">${icon(a.role === 'Runner' ? 'bike' : 'send', 'i-18')}</div>
          <div style="flex:1;min-width:0"><b style="font-size:13.5px">${a.role === 'Runner' ? 'Runner (delivers)' : 'Sender (posts tasks)'} · ${esc(a.name.split(' ')[0])}</b>
            <div class="meta truncate">${esc(a.email)} · ${esc(a.password)}</div></div>
          <button type="button" class="btn ${a.role === 'Runner' ? 'btn-primary' : 'btn-green'} btn-sm" data-fill-demo="${a.id}" style="min-height:38px">Use</button>
        </div>`).join('')}
        <p class="meta" style="text-align:center;margin:4px 0 0;line-height:1.5">Tip: open a second browser window, log in as the other account, and watch tasks update live.</p>
        <div style="flex:1"></div>
        <p style="text-align:center;font-size:14px;color:var(--muted);margin:24px 0 0">New to TAASKAR? <button type="button" class="link-btn" data-go="signup" style="min-height:auto">Create account</button></p>
      </form>
    </div>`,
    mount(el) {
      bindPwToggle(el);
      const form = $('#login-form', el);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = $('#lg-id', el).value.trim(), pw = $('#lg-pw', el).value;
        const errs = {};
        if (!id) errs.id = 'Enter your email or mobile number';
        else if (id.includes('@') ? !/^\S+@\S+\.\S+$/.test(id) : !/^(\+?91)?[6-9]\d{9}$/.test(id.replace(/\s/g, ''))) errs.id = 'Enter a valid email or 10-digit mobile number';
        if (!pw) errs.pw = 'Enter your password';
        else if (pw.length < 6) errs.pw = 'Password must be at least 6 characters';
        if (showErrors(el, errs)) return;
        const acc = findAccount(id);
        if (!acc) { showErrors(el, { id: 'No account found with this email or mobile number' }); return; }
        if (acc.password !== pw) { showErrors(el, { pw: 'Incorrect password. Try again.' }); return; }
        await U.withLoading(form.querySelector('[type=submit]'), 900);
        signIn(acc, `Welcome back, ${acc.name.split(' ')[0]}!`);
      });
      $$('[data-fill-demo]', el).forEach((b) => b.addEventListener('click', () => {
        const a = D.DEMO_ACCOUNTS.find((x) => x.id === b.dataset.fillDemo);
        $('#lg-id', el).value = a.email;
        $('#lg-pw', el).value = a.password;
        showErrors(el, {});
        U.toast(`${a.role} account filled. Tap Log In.`, 'info', 1800);
      }));
    },
  });

  Screens.signup = () => ({
    html: `
    <div class="auth">
      <div class="auth-top"><button class="icon-btn" data-back aria-label="Back">${icon('chevron-left', 'i-24')}</button></div>
      <form class="auth-body" id="su-form" novalidate>
        <h1 style="margin-top:0">Create your account</h1>
        <p class="sub">Join a trusted community of requesters and runners near you.</p>
        <div class="field" data-f="name"><label class="label" for="su-name">Full name</label>
          <input id="su-name" class="input" autocomplete="name" placeholder="e.g. Aarav Mehta"><div class="error-text"></div></div>
        <div class="field" data-f="phone"><label class="label" for="su-phone">Mobile number</label>
          <div class="prefix-input"><span class="prefix">+91</span><input id="su-phone" class="input" inputmode="numeric" maxlength="10" autocomplete="tel-national" placeholder="98450 21734"></div><div class="error-text"></div></div>
        <div class="field" data-f="email"><label class="label" for="su-email">Email</label>
          <input id="su-email" class="input" type="email" autocomplete="email" placeholder="you@example.com"><div class="error-text"></div></div>
        <div class="field" data-f="pw"><label class="label" for="su-pw">Password</label>
          <div class="input-wrap"><input id="su-pw" type="password" class="input" autocomplete="new-password" placeholder="At least 6 characters" style="padding-right:52px">
          <button type="button" class="icon-btn trail" data-toggle-pw aria-label="Show password">${icon('eye', 'i-18')}</button></div><div class="error-text"></div></div>
        <div class="field" data-f="agree"><label class="check"><input type="checkbox" id="su-agree"><span>I agree to the TAASKAR Terms of Service and Community Guidelines, and I'm 18 or older.</span></label><div class="error-text"></div></div>
        <button class="btn btn-green btn-block" type="submit">Create Account</button>
        <p style="text-align:center;font-size:14px;color:var(--muted);margin:20px 0 0">Already have an account? <button type="button" class="link-btn" data-go="login" style="min-height:auto">Log in</button></p>
      </form>
    </div>`,
    mount(el) {
      bindPwToggle(el);
      const form = $('#su-form', el);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = $('#su-name', el).value.trim(), phone = $('#su-phone', el).value.replace(/\s/g, ''),
          email = $('#su-email', el).value.trim(), pw = $('#su-pw', el).value, agree = $('#su-agree', el).checked;
        const errs = {};
        if (name.length < 3) errs.name = 'Enter your full name';
        if (!/^[6-9]\d{9}$/.test(phone)) errs.phone = 'Enter a valid 10-digit Indian mobile number';
        if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email address';
        if (pw.length < 6) errs.pw = 'Password must be at least 6 characters';
        if (!agree) errs.agree = 'Please accept the terms to continue';
        if (!errs.email && findAccount(email)) errs.email = 'An account with this email already exists. Log in instead.';
        if (!errs.phone && findAccount(phone)) errs.phone = 'This mobile number is already registered';
        if (showErrors(el, errs)) return;
        await U.withLoading(form.querySelector('[type=submit]'), 1000);
        const acc = { id: uid('u'), role: 'Member', name, email, phone, password: pw };
        Store.reload();
        S().accounts.push(acc);
        Store.state.users[acc.id] = blankUser(acc);
        signIn(acc, `Account created. Welcome, ${name.split(' ')[0]}!`);
      });
    },
  });

  Screens.forgot = (p) => ({
    html: `
    <div class="auth">
      <div class="auth-top"><button class="icon-btn" data-back aria-label="Back">${icon('chevron-left', 'i-24')}</button></div>
      <div class="auth-body" id="fp-body">
        <div class="icon-tile lg">${icon('key-round', 'i-24')}</div>
        <h1>Forgot password?</h1>
        <p class="sub">Enter the email linked to your account and we'll send you a reset link.</p>
        <form id="fp-form" novalidate>
          <div class="field" data-f="email"><label class="label" for="fp-email">Email</label>
            <div class="input-wrap"><span class="lead">${icon('mail', 'i-18')}</span><input id="fp-email" class="input has-lead" type="email" placeholder="you@example.com"></div><div class="error-text"></div></div>
          <button class="btn btn-primary btn-block" type="submit">Send Reset Link</button>
        </form>
      </div>
    </div>`,
    mount(el) {
      $('#fp-form', el).addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = $('#fp-email', el).value.trim();
        if (showErrors(el, /^\S+@\S+\.\S+$/.test(email) ? {} : { email: 'Enter a valid email address' })) return;
        await U.withLoading(e.target.querySelector('[type=submit]'), 900);
        $('#fp-body', el).innerHTML = `
          <div style="text-align:center;padding-top:30px" class="anim-fade">
            <div class="success-mark"><div>${icon('mail-check', 'i-28')}</div></div>
            <h1 style="margin-top:22px">Check your inbox</h1>
            <p class="sub">We've sent a password reset link to <b style="color:var(--ink)">${esc(email)}</b>. The link expires in 30 minutes.</p>
            <button class="btn btn-primary btn-block" data-go-replace="login">Back to Log In</button>
            <button class="btn btn-ghost btn-block" style="margin-top:8px" data-resend>Didn't get it? Resend</button>
          </div>`;
        U.refreshIcons();
        $('[data-resend]', el).addEventListener('click', () => U.toast('Reset link sent again'));
      });
    },
  });

  function bindPwToggle(el) {
    $$('[data-toggle-pw]', el).forEach((b) => b.addEventListener('click', () => {
      const inp = b.parentElement.querySelector('input');
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      b.innerHTML = icon(show ? 'eye-off' : 'eye', 'i-18');
      b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      U.refreshIcons();
    }));
  }

  function findAccount(id) {
    const v = String(id || '').trim();
    if (v.includes('@')) return S().accounts.find((a) => a.email.toLowerCase() === v.toLowerCase());
    const digits = v.replace(/\D/g, '').slice(-10);
    return digits.length === 10 ? S().accounts.find((a) => a.phone === digits) : null;
  }

  function signIn(acc, msg) {
    Store.setSession(acc.id);
    Store.save();
    resetViewState();
    Router.tab('home');
    U.toast(msg);
  }

  /* Field error display. Returns true when there are errors. */
  function showErrors(el, errs) {
    let first = null;
    $$('.field[data-f]', el).forEach((f) => {
      const m = errs[f.dataset.f];
      f.classList.toggle('has-error', !!m);
      const et = $('.error-text', f);
      if (et) et.innerHTML = m ? icon('circle-alert', 'i-14') + '<span>' + esc(m) + '</span>' : '';
      if (m && !first) first = f;
    });
    U.refreshIcons();
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const inp = first.querySelector('input:not([type=checkbox]),textarea,select');
      if (inp) setTimeout(() => inp.focus({ preventScroll: true }), 250);
    }
    return !!first;
  }

  /* ---------------- Home ---------------- */
  let homeLoaded = false;

  Screens.home = () => {
    const s = S(), u = U.person('me'), cur = U.loc(s.currentLocation), n = unread();
    const open = s.tasks.filter((t) => t.status === 'open').sort((a, b) => b.postedAt - a.postedAt).slice(0, 4);
    return {
      html: `
      <header class="screen-head">
        <div class="brand" style="flex:1">${brandMark()}<span>TAASKAR</span></div>
        <button class="icon-btn boxed" data-go="notifications" aria-label="Notifications">${icon('bell', 'i-22')}${n ? `<span class="dot-badge">${n}</span>` : ''}</button>
        <button class="icon-btn" data-nav="profile" aria-label="Profile">${U.avatar(u, 'sm')}</button>
      </header>
      <div class="screen-body">
        <button class="loc-pill" data-action="pick-location" aria-label="Change location">${icon('map-pin', 'i-16')}<span>${esc(cur.name)}, Bengaluru</span>${icon('chevron-down', 'i-16 text-muted')}</button>
        <div class="greet"><h2>${greeting()}, ${esc(u.firstName)}!</h2><p>${myAccount()?.role === 'Runner' ? 'Ready to earn on your route today?' : 'What do you need today?'}</p></div>
        ${roleBadge()}

        <form class="search-bar" id="home-search" style="margin-top:16px" role="search">
          <div class="input-wrap"><span class="lead">${icon('search', 'i-18')}</span>
            <input class="input has-lead" name="q" placeholder="Search tasks, locations or people" enterkeyhint="search" autocomplete="off"></div>
          <button type="button" class="filter-btn" data-action="home-filter" aria-label="Filters">${icon('sliders-horizontal', 'i-22')}</button>
        </form>

        <div style="margin-top:18px">
          <button class="action-hero tappable" data-create="bring">
            <div class="icon-tile">${icon('package', 'i-28')}</div>
            <div><h3>Bring an Item</h3><p>Get something delivered to you.</p></div>
            <span class="go">${icon('arrow-right', 'i-18')}</span>
          </button>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
            <button class="action-card tappable" data-create="buy">
              <div class="icon-tile amber">${icon('shopping-bag', 'i-22')}</div>
              <div><h3>Buy &amp; Bring</h3><p>Need someone to shop for you?</p></div>
            </button>
            <button class="action-card tappable" data-create="help">
              <div class="icon-tile green">${icon('hand-helping', 'i-22')}</div>
              <div><h3>Get Help</h3><p>Find someone nearby to help.</p></div>
            </button>
          </div>
        </div>

        <button class="wallet-strip tappable" data-go="wallet" style="width:100%;margin-top:12px;text-align:left">
          <div class="icon-tile sm">${icon('wallet', 'i-18')}</div>
          <div style="flex:1;min-width:0"><div class="meta" style="font-weight:600">Wallet balance</div><b class="money" style="font-size:16px">${money(s.wallet.available)}</b></div>
          <span class="badge b-open no-dot">${icon('shield-check', 'i-14')}Escrow</span>
          ${icon('chevron-right', 'i-18 text-muted')}
        </button>

        <div class="section-title"><h2>Nearby Tasks</h2><button class="link-btn" data-nav="explore">See all${icon('chevron-right', 'i-16')}</button></div>
        <div id="home-tasks">${homeLoaded ? homeTaskList(open) : U.skeletonCards(3)}</div>

        <div class="promo" style="margin-top:16px">
          <div class="icon-tile green lg" style="background:#fff">${icon('route', 'i-24')}</div>
          <div style="flex:1;min-width:0">
            <h3>Already heading somewhere?</h3>
            <p>Turn your everyday trips into extra earnings.</p>
            <button class="btn btn-green btn-sm" data-action="find-route">Find Tasks${icon('arrow-right', 'i-16')}</button>
          </div>
        </div>
      </div>`,
      mount(el) {
        $('#home-search', el).addEventListener('submit', (e) => {
          e.preventDefault();
          Router.tab('explore', { q: e.target.q.value.trim() });
        });
        if (!homeLoaded) {
          const t = setTimeout(() => {
            homeLoaded = true;
            const box = $('#home-tasks', el);
            if (box) { box.innerHTML = homeTaskList(open); box.classList.add('anim-fade'); U.refreshIcons(); }
          }, 650);
          return () => clearTimeout(t);
        }
      },
    };
  };

  /* Small label so it's obvious which demo account this window is using. */
  function roleBadge(center = false) {
    const r = myAccount()?.role;
    if (r !== 'Sender' && r !== 'Runner') return '';
    const runner = r === 'Runner';
    return `<span class="badge no-dot ${runner ? 'b-accepted' : 'b-open'}" style="margin-top:${center ? 0 : 10}px;gap:5px">${icon(runner ? 'bike' : 'send', 'i-14')}${runner ? 'Runner demo account' : 'Sender demo account'}</span>`;
  }

  function homeTaskList(list) {
    if (!list.length) return U.emptyState({ icon: 'map-pinned', title: 'No open tasks nearby', text: 'Check back soon or post a task of your own.', action: `<button class="btn btn-green" data-nav-create>Create a Task</button>` });
    return list.map((t) => U.taskCard(t)).join('');
  }

  /* ---------------- Explore ---------------- */
  let exQuery = '';
  let exZoom = 1;
  let exSelected = null;

  function exploreResults() {
    const s = S(), ex = s.explore, f = ex.filters, q = exQuery.toLowerCase();
    let list = s.tasks.filter((t) => t.status === 'open');
    if (ex.segment === 'nearby') list = list.filter((t) => awayKm(t) <= 3);
    if (ex.segment === 'route') list = list.filter(onRoute);
    if (q) {
      list = list.filter((t) => {
        const hay = [t.title, t.description, t.category, U.loc(t.pickup).name, U.loc(t.dropoff).name, U.person(t.requester).name, D.TASK_TYPES[t.type].label].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    if (f.types.length) list = list.filter((t) => f.types.includes(t.type));
    list = list.filter((t) => (t.distance || 0) <= f.maxDist && t.reward >= f.minReward);
    if (f.pickup) list = list.filter((t) => t.pickup === f.pickup);
    if (f.dropoff) list = list.filter((t) => (t.dropoff || t.pickup) === f.dropoff);
    const sorters = { newest: (a, b) => b.postedAt - a.postedAt, reward: (a, b) => b.reward - a.reward, nearest: (a, b) => awayKm(a) - awayKm(b) };
    return list.sort(sorters[ex.sort] || sorters.newest);
  }

  function activeFilterCount() {
    const f = S().explore.filters;
    return (f.types.length ? 1 : 0) + (f.maxDist < 10 ? 1 : 0) + (f.minReward > 0 ? 1 : 0) + (f.pickup ? 1 : 0) + (f.dropoff ? 1 : 0);
  }

  function filterTags() {
    const f = S().explore.filters, tags = [];
    f.types.forEach((t) => tags.push([`type:${t}`, D.TASK_TYPES[t].label]));
    if (f.maxDist < 10) tags.push(['maxDist', `Up to ${f.maxDist} km`]);
    if (f.minReward > 0) tags.push(['minReward', `Min ${money(f.minReward)}`]);
    if (f.pickup) tags.push(['pickup', `From ${U.loc(f.pickup).name}`]);
    if (f.dropoff) tags.push(['dropoff', `To ${U.loc(f.dropoff).name}`]);
    if (!tags.length) return '';
    return `<div class="chip-row" style="margin-top:10px">${tags.map(([k, l]) => `<button class="chip-tag" data-rm-filter="${k}">${esc(l)}${icon('x', 'i-14')}</button>`).join('')}
      <button class="link-btn" data-action="clear-filters" style="min-height:30px">Clear all</button></div>`;
  }

  function exploreMap(list) {
    const s = S(), cur = U.loc(s.currentLocation), ex = s.explore;
    const z = exZoom, k = 1.2 / z;
    const w = 360 / z, h = 240 / z;
    const c = z === 1 ? { x: 180, y: 120 } : cur;
    const vb = `${(c.x - w / 2).toFixed(1)} ${(c.y - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
    const seen = {};
    const markers = list.map((t) => {
      const p = U.loc(t.pickup);
      const i = (seen[t.pickup] = (seen[t.pickup] ?? -1) + 1);
      const x = p.x + i * 30 * k, y = p.y - i * 4 * k;
      const txt = money(t.reward), mw = (txt.length * 5.6 + 12) * k, mh = 17 * k;
      const sel = exSelected === t.id;
      const fill = sel ? '#167C63' : '#142D4E';
      return `<g class="map-marker" data-marker="${t.id}" role="button" aria-label="${esc(t.title)}">
        <circle cx="${x}" cy="${y}" r="${3.2 * k}" fill="${fill}" stroke="#fff" stroke-width="${1.4 * k}"/>
        <path d="M${x - 4 * k} ${y - 8 * k} L${x} ${y - 3.5 * k} L${x + 4 * k} ${y - 8 * k}z" fill="${fill}"/>
        <rect class="mk-body" x="${x - mw / 2}" y="${y - 8 * k - mh}" width="${mw}" height="${mh}" rx="${8.5 * k}" fill="${fill}" stroke="#fff" stroke-width="${1.2 * k}"/>
        <text x="${x}" y="${y - 8 * k - mh * 0.3}" text-anchor="middle" font-size="${8.6 * k}" font-weight="800" fill="#fff" font-family="Plus Jakarta Sans">${txt}</text>
      </g>`;
    }).join('');
    let routeLayer = '';
    if (ex.segment === 'route') {
      const a = U.loc(ex.route.from), b = U.loc(ex.route.to);
      routeLayer = `<path d="${U.routePath(a, b)}" fill="none" stroke="#167C63" stroke-width="${12 * k}" opacity=".12" stroke-linecap="round"/>
        <path d="${U.routePath(a, b)}" fill="none" stroke="#167C63" stroke-width="${2.6 * k}" stroke-dasharray="${5 * k} ${5 * k}" stroke-linecap="round"/>
        ${U.pin(b, k, 'drop')}`;
    }
    const sel = exSelected && list.find((t) => t.id === exSelected);
    return `<div class="map-wrap" style="height:220px">
      <svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet" aria-label="Map of tasks">
        ${U.mapBase(k, true)}
        ${routeLayer}
        <circle class="pulse" cx="${cur.x}" cy="${cur.y}" r="${10 * k}" fill="#167C63" opacity=".3"/>
        <circle cx="${cur.x}" cy="${cur.y}" r="${6 * k}" fill="#1C6FD1" stroke="#fff" stroke-width="${2.4 * k}"/>
        ${markers}
      </svg>
      <div class="map-chip">${icon('map-pin', 'i-14 text-green')}${list.length} task${list.length === 1 ? '' : 's'} on map</div>
      <div class="map-ctrls">
        <button data-map="in" aria-label="Zoom in">${icon('plus', 'i-18')}</button>
        <button data-map="out" aria-label="Zoom out">${icon('minus', 'i-18')}</button>
        <button data-map="locate" aria-label="Center on my location">${icon('locate-fixed', 'i-18')}</button>
      </div>
      ${sel ? `<div class="map-pop" data-open-task="${sel.id}">
        <div class="icon-tile sm ${U.typeTileClass(sel.type)}">${icon(D.TASK_TYPES[sel.type].icon, 'i-18')}</div>
        <div style="flex:1;min-width:0"><b class="truncate" style="display:block;font-size:14px">${esc(sel.title)}</b>
        <span class="meta truncate" style="display:block">${esc(U.loc(sel.pickup).name)}${U.isSamePlace(sel) ? '' : ' → ' + esc(U.loc(sel.dropoff).name)}</span></div>
        <b class="text-green money">${money(sel.reward)}</b>${icon('chevron-right', 'i-18 text-muted')}</div>` : ''}
    </div>`;
  }

  function exploreList(list) {
    if (!list.length) {
      const seg = S().explore.segment;
      return U.emptyState({
        icon: 'search-x',
        title: 'No tasks match',
        text: seg === 'route' ? 'No open tasks along this route right now. Try another route or browse all tasks.' : 'Try a different search, widen your filters or switch to All Tasks.',
        action: `<button class="btn btn-outline" data-action="clear-filters">Reset search & filters</button>`,
      });
    }
    return list.map((t) => U.taskCard(t)).join('');
  }

  Screens.explore = (p) => {
    const s = S(), ex = s.explore;
    if (p.q !== undefined) { exQuery = p.q; delete p.q; }
    if (p.segment) { ex.segment = p.segment; delete p.segment; Store.save(); }
    const cur = U.loc(s.currentLocation);
    const fc = activeFilterCount();
    const list = exploreResults();
    return {
      html: `
      <header class="screen-head">
        <div class="head-title-wrap"><h1>Explore Tasks</h1></div>
        <button class="loc-pill" data-action="pick-location" style="max-width:52%">${icon('map-pin', 'i-16')}<span>${esc(cur.name)}</span>${icon('chevron-down', 'i-16 text-muted')}</button>
      </header>
      <div class="screen-body">
        <div class="search-bar">
          <div class="input-wrap"><span class="lead">${icon('search', 'i-18')}</span>
            <input id="ex-q" class="input has-lead" placeholder="Search tasks, locations or people" value="${esc(exQuery)}" autocomplete="off" enterkeyhint="search">
            ${exQuery ? `<button class="icon-btn trail" data-action="clear-q" aria-label="Clear search">${icon('x', 'i-18')}</button>` : ''}</div>
          <button class="filter-btn" data-action="open-filters" aria-label="Filters">${icon('sliders-horizontal', 'i-22')}${fc ? `<span class="count">${fc}</span>` : ''}</button>
        </div>
        <div id="ex-tags">${filterTags()}</div>
        <div class="segmented" style="margin-top:14px" role="tablist">
          ${[['nearby', 'Nearby'], ['route', 'Along My Route'], ['all', 'All Tasks']].map(([k, l]) => `<button role="tab" class="${ex.segment === k ? 'active' : ''}" data-seg="${k}">${l}</button>`).join('')}
        </div>
        ${ex.segment === 'route' ? `<button class="card tappable" data-action="edit-route" style="width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;margin-top:10px;text-align:left">
          ${icon('route', 'i-18 text-green')}<span style="flex:1;font-size:13px;font-weight:600" class="truncate">${esc(U.loc(ex.route.from).name)} → ${esc(U.loc(ex.route.to).name)}</span><span class="link-btn" style="min-height:auto">Edit</span></button>` : ''}
        <div id="ex-map" style="margin-top:12px">${exploreMap(list)}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin:18px 2px 10px">
          <h2 style="font-size:16px;margin:0" id="ex-count">${list.length} task${list.length === 1 ? '' : 's'} found</h2>
          <select class="select" id="ex-sort" style="width:auto;min-height:40px;font-size:13px;font-weight:600;padding:6px 36px 6px 12px;border-radius:12px" aria-label="Sort tasks">
            <option value="newest" ${ex.sort === 'newest' ? 'selected' : ''}>Newest</option>
            <option value="reward" ${ex.sort === 'reward' ? 'selected' : ''}>Highest reward</option>
            <option value="nearest" ${ex.sort === 'nearest' ? 'selected' : ''}>Nearest</option>
          </select>
        </div>
        <div id="ex-list">${exploreList(list)}</div>
      </div>`,
      mount(el) {
        let timer = null, skel = null;
        const update = (withSkeleton = false) => {
          const l = exploreResults();
          $('#ex-map', el).innerHTML = exploreMap(l);
          $('#ex-count', el).textContent = `${l.length} task${l.length === 1 ? '' : 's'} found`;
          const box = $('#ex-list', el);
          if (withSkeleton) {
            box.innerHTML = U.skeletonCards(2);
            clearTimeout(skel);
            skel = setTimeout(() => { box.innerHTML = exploreList(l); box.classList.remove('anim-fade'); void box.offsetWidth; box.classList.add('anim-fade'); U.refreshIcons(); }, 380);
          } else box.innerHTML = exploreList(l);
          U.refreshIcons();
        };
        el._update = update;
        $('#ex-q', el).addEventListener('input', (e) => {
          exQuery = e.target.value;
          clearTimeout(timer);
          timer = setTimeout(() => update(), 180);
        });
        $('#ex-q', el).addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
        $('#ex-sort', el).addEventListener('change', (e) => { S().explore.sort = e.target.value; Store.save(); update(true); });
        el.addEventListener('click', (e) => {
          const seg = e.target.closest('[data-seg]');
          if (seg) { S().explore.segment = seg.dataset.seg; exSelected = null; Store.save(); refresh(); return; }
          const mk = e.target.closest('[data-marker]');
          if (mk) { exSelected = exSelected === mk.dataset.marker ? null : mk.dataset.marker; update(); return; }
          const mb = e.target.closest('[data-map]');
          if (mb) {
            const a = mb.dataset.map;
            if (a === 'in') exZoom = Math.min(2.4, +(exZoom * 1.4).toFixed(2));
            if (a === 'out') exZoom = Math.max(1, +(exZoom / 1.4).toFixed(2));
            if (a === 'locate') { exZoom = 1.8; U.toast(`Centered on ${U.loc(S().currentLocation).name}`, 'info', 1600); }
            if (exZoom < 1.05) exZoom = 1;
            update(); return;
          }
          const rm = e.target.closest('[data-rm-filter]');
          if (rm) {
            const f = S().explore.filters, k = rm.dataset.rmFilter;
            if (k.startsWith('type:')) f.types = f.types.filter((t) => t !== k.slice(5));
            else if (k === 'maxDist') f.maxDist = 10; else if (k === 'minReward') f.minReward = 0; else f[k] = '';
            Store.save(); refresh(); return;
          }
          const act = e.target.closest('[data-action]')?.dataset.action;
          if (act === 'open-filters') openFilters();
          if (act === 'clear-filters') { S().explore.filters = emptyFilters(); exQuery = ''; S().explore.segment = 'all'; Store.save(); refresh(); U.toast('Filters cleared', 'info'); }
          if (act === 'clear-q') { exQuery = ''; refresh(); }
          if (act === 'edit-route') openRouteSheet();
        });
        if (p.openFilters) { delete p.openFilters; setTimeout(openFilters, 200); }
        return () => { clearTimeout(timer); clearTimeout(skel); };
      },
    };
  };

  function openFilters() {
    const f = { ...S().explore.filters, types: [...S().explore.filters.types] };
    const body = `
      <div class="label">Task type</div>
      <div class="chip-row" style="flex-wrap:wrap" id="flt-types">
        ${Object.values(D.TASK_TYPES).map((t) => `<button class="chip ${f.types.includes(t.id) ? 'active' : ''}" data-type="${t.id}">${icon(t.icon, 'i-16')}${t.label}</button>`).join('')}
      </div>
      <div class="divider" style="margin:18px 0"></div>
      <div class="label" style="display:flex;justify-content:space-between">Maximum distance <span class="text-green" id="flt-dist-v">${f.maxDist >= 10 ? 'Any' : f.maxDist + ' km'}</span></div>
      <input type="range" min="1" max="10" step="0.5" value="${f.maxDist}" id="flt-dist" aria-label="Maximum distance">
      <div style="display:flex;justify-content:space-between" class="meta"><span>1 km</span><span>10+ km</span></div>
      <div class="label" style="display:flex;justify-content:space-between;margin-top:18px">Minimum reward <span class="text-green" id="flt-rew-v">${f.minReward ? money(f.minReward) : 'Any'}</span></div>
      <input type="range" min="0" max="300" step="10" value="${f.minReward}" id="flt-rew" aria-label="Minimum reward">
      <div style="display:flex;justify-content:space-between" class="meta"><span>₹0</span><span>₹300</span></div>
      <div class="divider" style="margin:18px 0"></div>
      <div class="field"><label class="label" for="flt-pick">Pickup location</label><select class="select" id="flt-pick">${locOptions(f.pickup, 'Any pickup location')}</select></div>
      <div class="field" style="margin-bottom:0"><label class="label" for="flt-drop">Drop-off location</label><select class="select" id="flt-drop">${locOptions(f.dropoff, 'Any drop-off location')}</select></div>`;
    U.openSheet({
      title: 'Filter Tasks',
      body,
      footer: `<button class="btn btn-outline" data-clear style="flex:1">Clear all</button><button class="btn btn-primary" data-apply style="flex:2">Apply Filters</button>`,
      onMount(sheet, close) {
        $('#flt-types', sheet).addEventListener('click', (e) => {
          const b = e.target.closest('[data-type]'); if (!b) return;
          const t = b.dataset.type;
          f.types = f.types.includes(t) ? f.types.filter((x) => x !== t) : [...f.types, t];
          b.classList.toggle('active');
        });
        $('#flt-dist', sheet).addEventListener('input', (e) => { f.maxDist = +e.target.value; $('#flt-dist-v', sheet).textContent = f.maxDist >= 10 ? 'Any' : f.maxDist + ' km'; });
        $('#flt-rew', sheet).addEventListener('input', (e) => { f.minReward = +e.target.value; $('#flt-rew-v', sheet).textContent = f.minReward ? money(f.minReward) : 'Any'; });
        $('#flt-pick', sheet).addEventListener('change', (e) => { f.pickup = e.target.value; });
        $('#flt-drop', sheet).addEventListener('change', (e) => { f.dropoff = e.target.value; });
        $('[data-apply]', sheet).addEventListener('click', () => {
          S().explore.filters = f; Store.save(); close();
          refresh();
          currentEl?._update?.(true);
          const n = activeFilterCount();
          U.toast(n ? `${n} filter${n > 1 ? 's' : ''} applied` : 'Showing all tasks', 'info', 1800);
        });
        $('[data-clear]', sheet).addEventListener('click', () => {
          S().explore.filters = emptyFilters(); Store.save(); close(); refresh(); U.toast('Filters cleared', 'info', 1800);
        });
      },
    });
  }

  function openRouteSheet() {
    const r = { ...S().explore.route };
    U.openSheet({
      title: 'Your Route',
      body: `<p class="meta" style="margin:0 0 16px">Tell us where you're heading and we'll show tasks along the way.</p>
        <div class="field"><label class="label" for="rt-from">Starting from</label><select class="select" id="rt-from">${locOptions(r.from, 'Select start')}</select></div>
        <div class="field" data-f="to"><label class="label" for="rt-to">Heading to</label><select class="select" id="rt-to">${locOptions(r.to, 'Select destination')}</select><div class="error-text"></div></div>`,
      footer: `<button class="btn btn-green btn-block" data-save>Show Tasks on Route</button>`,
      onMount(sheet, close) {
        $('[data-save]', sheet).addEventListener('click', () => {
          r.from = $('#rt-from', sheet).value; r.to = $('#rt-to', sheet).value;
          if (showErrors(sheet, !r.from || !r.to ? { to: 'Choose both locations' } : r.from === r.to ? { to: 'Destination must be different' } : {})) return;
          S().explore.route = r; S().explore.segment = 'route'; Store.save(); close(); refresh();
          U.toast('Route updated', 'success', 1600);
        });
      },
    });
  }

  function openLocationPicker() {
    const curId = S().currentLocation;
    U.openSheet({
      title: 'Choose your location',
      body: `<button class="menu-row" data-loc="christ" style="padding-left:0;padding-right:0">
          <div class="icon-tile sm green">${icon('locate-fixed', 'i-18')}</div>
          <div class="li-main"><b>Use current location</b><small>Christ University, Hosur Road</small></div></button>
        <div class="list-label" style="margin-left:0">Areas in Bengaluru</div>
        ${Object.values(D.LOCATIONS).map((l) => `<label class="radio-row"><input type="radio" name="loc" value="${l.id}" ${l.id === curId ? 'checked' : ''}><span style="flex:1">${esc(l.name)}<span class="meta" style="display:block">${esc(l.area)}</span></span></label>`).join('')}`,
      onMount(sheet, close) {
        const set = (id) => {
          S().currentLocation = id; Store.save(); close(); refresh();
          U.toast(`Location set to ${U.loc(id).name}`, 'success', 1800);
        };
        $('[data-loc]', sheet).addEventListener('click', () => set('christ'));
        $$('input[name=loc]', sheet).forEach((r) => r.addEventListener('change', () => set(r.value)));
      },
    });
  }

  /* ---------------- Create Task ---------------- */
  const newDraft = (type = null) => ({ step: 1, type, title: '', description: '', category: '', budget: '', image: null, instructions: '', pickup: '', dropoff: '', time: 'ASAP', scheduleAt: '', notes: '', reward: '' });
  const STEP_TITLES = ['Task type', 'Task details', 'Locations', 'Set reward', 'Review & publish'];

  Screens.create = (p) => {
    const s = S();
    let restored = false;
    if (!s.draft) s.draft = newDraft();
    else if (!p.type && (s.draft.title || s.draft.pickup)) restored = true;
    const d = s.draft;
    if (p.type) {
      if (d.type !== p.type) { d.type = p.type; d.category = ''; }
      d.step = 1; delete p.type;
    }
    Store.save();
    return {
      html: `
      <div style="position:sticky;top:0;z-index:20;background:rgba(255,255,255,.96);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)">
        <header class="screen-head on-white" style="position:static;background:transparent">
          <button class="icon-btn" data-action="close-create" aria-label="Close">${icon('x', 'i-24')}</button>
          <div class="head-title-wrap"><h1>Create Task</h1><div class="head-sub" id="cf-sub"></div></div>
          <button class="link-btn" data-action="reset-draft" style="padding:0 10px">Reset</button>
        </header>
        <div class="steps-bar" id="cf-bar">${[1, 2, 3, 4, 5].map(() => '<span></span>').join('')}</div>
      </div>
      <div class="screen-body" id="cf-body" style="background:var(--bg)"></div>
      <div class="footer-bar" id="cf-foot"></div>`,
      mount(el) {
        const body = $('#cf-body', el), foot = $('#cf-foot', el);
        let saveT = null;
        const saveDraft = () => { clearTimeout(saveT); saveT = setTimeout(() => Store.save(), 250); };

        const draw = (dir = 'push') => {
          $('#cf-sub', el).textContent = `Step ${d.step} of 5 · ${STEP_TITLES[d.step - 1]}`;
          $$('#cf-bar span', el).forEach((sp, i) => sp.classList.toggle('done', i < d.step));
          body.innerHTML = createStep(d);
          body.classList.remove('anim-push', 'anim-pop'); void body.offsetWidth; body.classList.add('anim-' + dir);
          foot.innerHTML = d.step === 5
            ? `<button class="btn btn-outline" data-action="prev" style="flex:1">Back</button><button class="btn btn-primary" data-action="checkout" style="flex:2">Continue to Payment${icon('arrow-right', 'i-18')}</button>`
            : `${d.step > 1 ? `<button class="btn btn-outline" data-action="prev" style="flex:1">Back</button>` : ''}<button class="btn btn-primary" data-action="next" style="flex:2">Continue${icon('arrow-right', 'i-18')}</button>`;
          el.scrollTop = 0;
          U.refreshIcons();
        };

        const updateFee = () => {
          const box = $('#fee-box', el); if (!box) return;
          box.innerHTML = feeBreakdown(d);
          $$('[data-reward]', el).forEach((c) => c.classList.toggle('active', +c.dataset.reward === +d.reward));
        };

        el.addEventListener('input', (e) => {
          const k = e.target.dataset.bind; if (!k) return;
          d[k] = e.target.value;
          if (k === 'reward') { d.reward = e.target.value.replace(/\D/g, '').slice(0, 5); e.target.value = d.reward; updateFee(); }
          if (k === 'title') { const c = $('#cnt-title', el); if (c) c.textContent = `${d.title.length}/60`; }
          if (k === 'description') { const c = $('#cnt-desc', el); if (c) c.textContent = `${d.description.length}/400`; }
          e.target.closest('.field')?.classList.remove('has-error');
          saveDraft();
        });
        el.addEventListener('change', async (e) => {
          const k = e.target.dataset.bind;
          if (k === 'pickup' || k === 'dropoff') {
            d[k] = e.target.value; saveDraft();
            const rp = $('#cf-route', el); if (rp) { rp.innerHTML = createRoutePreview(d); U.refreshIcons(); }
          }
          if (k === 'scheduleAt') { d.scheduleAt = e.target.value; saveDraft(); }
          if (e.target.id === 'cf-file') {
            const file = e.target.files[0];
            try { d.image = await readImage(file); Store.save(); draw('fade'); U.toast('Photo added', 'success', 1500); }
            catch (err) { U.toast(err.message, 'error'); }
          }
        });
        el.addEventListener('click', async (e) => {
          const t = e.target.closest('[data-pick-type]');
          if (t) {
            if (d.type !== t.dataset.pickType) { d.type = t.dataset.pickType; d.category = ''; if (d.type === 'help') d.dropoff = ''; }
            $$('[data-pick-type]', el).forEach((b) => b.classList.toggle('selected', b === t));
            $$('[data-pick-type] .radio', el).forEach((r) => (r.innerHTML = ''));
            t.querySelector('.radio').innerHTML = icon('check', 'i-14'); U.refreshIcons();
            el.querySelector('.field[data-f=type]')?.classList.remove('has-error');
            Store.save(); return;
          }
          const cat = e.target.closest('[data-cat]');
          if (cat) { d.category = cat.dataset.cat; $$('[data-cat]', el).forEach((c) => c.classList.toggle('active', c === cat)); cat.closest('.field').classList.remove('has-error'); saveDraft(); return; }
          const tm = e.target.closest('[data-time]');
          if (tm) { d.time = tm.dataset.time; saveDraft(); draw('fade'); return; }
          const rw = e.target.closest('[data-reward]');
          if (rw) { d.reward = rw.dataset.reward; const inp = $('#cf-reward', el); if (inp) inp.value = d.reward; inp?.closest('.field').classList.remove('has-error'); updateFee(); saveDraft(); return; }
          const quick = e.target.closest('[data-quick-loc]');
          if (quick) {
            const [field, place] = quick.dataset.quickLoc.split(':');
            d[field] = place; Store.save();
            const sel = $(`[data-bind=${field}]`, el); if (sel) sel.value = place;
            sel?.closest('.field').classList.remove('has-error');
            const rp = $('#cf-route', el); if (rp) { rp.innerHTML = createRoutePreview(d); U.refreshIcons(); }
            return;
          }
          const ed = e.target.closest('[data-edit-step]');
          if (ed) { d.step = +ed.dataset.editStep; draw('pop'); return; }

          const act = e.target.closest('[data-action]')?.dataset.action;
          if (act === 'remove-image') { d.image = null; Store.save(); draw('fade'); }
          if (act === 'next') {
            if (showErrors(el, validateStep(d.step, d))) { U.toast('Please complete the highlighted fields', 'warn', 2000); return; }
            d.step = Math.min(5, d.step + 1); Store.save(); draw('push');
          }
          if (act === 'prev') { d.step = Math.max(1, d.step - 1); Store.save(); draw('pop'); }
          if (act === 'checkout') goToCheckout(draw);
          if (act === 'close-create') closeCreate();
          if (act === 'reset-draft') {
            const ok = await U.confirmDialog({ title: 'Start over?', message: 'This clears everything you have entered for this task.', confirmText: 'Clear draft', tone: 'danger', ic: 'rotate-ccw' });
            if (ok) { Object.assign(d, newDraft()); Store.save(); draw('fade'); U.toast('Draft cleared', 'info', 1500); }
          }
        });

        draw('fade');
        if (restored) setTimeout(() => U.toast('Your saved draft was restored', 'info', 1800), 300);
        return () => { clearTimeout(saveT); Store.save(); };
      },
    };
  };

  function createStep(d) {
    const T = D.TASK_TYPES;
    if (d.step === 1) {
      return `<div class="step-head"><h2>What do you need?</h2><p>Choose the type of task you want to post.</p></div>
        <div class="field" data-f="type">
          ${Object.values(T).map((t) => `<button class="type-option ${d.type === t.id ? 'selected' : ''}" data-pick-type="${t.id}">
            <div class="icon-tile lg ${U.typeTileClass(t.id)}">${icon(t.icon, 'i-24')}</div>
            <div><h3>${t.label}</h3><p>${t.subtitle}</p></div>
            <span class="radio">${d.type === t.id ? icon('check', 'i-14') : ''}</span></button>`).join('')}
          <div class="error-text"></div>
        </div>
        <div class="card card-pad" style="display:flex;gap:12px;align-items:flex-start;margin-top:8px">
          ${icon('info', 'i-18 text-muted')}<p class="meta" style="margin:0;line-height:1.5">Runners heading your way will see your task. Your payment stays in escrow until you confirm completion.</p></div>`;
    }
    if (d.step === 2) {
      const help = d.type === 'help';
      return `<div class="step-head"><h2>Describe the task</h2><p>Clear details help runners accept faster.</p></div>
        <div class="card card-pad" style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:16px">
          <div class="icon-tile sm ${U.typeTileClass(d.type)}">${icon(T[d.type].icon, 'i-18')}</div><b style="flex:1;font-size:14px">${T[d.type].label}</b>
          <button class="edit-link" data-edit-step="1">Change</button></div>
        <div class="field" data-f="title"><label class="label" for="cf-title" style="display:flex;justify-content:space-between">Task title <span class="meta" id="cnt-title">${d.title.length}/60</span></label>
          <input id="cf-title" class="input" data-bind="title" maxlength="60" value="${esc(d.title)}" placeholder="${help ? 'e.g. Help set up a Wi-Fi router' : d.type === 'buy' ? 'e.g. Buy groceries from Jayanagar market' : 'e.g. Bring my laptop charger'}"><div class="error-text"></div></div>
        <div class="field" data-f="description"><label class="label" for="cf-desc" style="display:flex;justify-content:space-between">Detailed description <span class="meta" id="cnt-desc">${d.description.length}/400</span></label>
          <textarea id="cf-desc" class="textarea" data-bind="description" maxlength="400" placeholder="What exactly needs to be done? Include sizes, brands, quantities or anything the runner should know.">${esc(d.description)}</textarea><div class="error-text"></div></div>
        <div class="field" data-f="category"><span class="label">${help ? 'Service' : 'Item'} category</span>
          <div class="chip-row" style="flex-wrap:wrap">${D.CATEGORIES[d.type].map((c) => `<button class="chip green ${d.category === c ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div><div class="error-text"></div></div>
        ${d.type === 'buy' ? `<div class="field" data-f="budget"><label class="label" for="cf-budget">Maximum item budget</label>
          <div class="prefix-input"><span class="prefix">₹</span><input id="cf-budget" class="input" data-bind="budget" inputmode="numeric" value="${esc(d.budget)}" placeholder="e.g. 1200"></div>
          <div class="error-text"></div>
          <div class="hint">Held in escrow. The runner is paid the bill amount and the rest comes back to you.</div></div>` : ''}
        <div class="field"><span class="label">Photo <span class="opt">(optional)</span></span>
          ${d.image ? `<div class="upload-preview"><img src="${d.image}" alt="Task photo"><button class="icon-btn" data-action="remove-image" aria-label="Remove photo">${icon('x', 'i-18')}</button></div>`
          : `<label class="upload" for="cf-file"><div class="icon-tile sm">${icon('image-plus', 'i-18')}</div><div><b style="font-size:14px">Add a photo</b><div class="meta">Helps the runner identify the item</div></div></label>`}
          <input type="file" id="cf-file" accept="image/*" hidden></div>
        <div class="field"><label class="label" for="cf-ins">Special instructions <span class="opt">(optional)</span></label>
          <textarea id="cf-ins" class="textarea" style="min-height:80px" data-bind="instructions" maxlength="200" placeholder="e.g. Ask for Manoj at the counter. Handle with care.">${esc(d.instructions)}</textarea></div>`;
    }
    if (d.step === 3) {
      const help = d.type === 'help';
      const saved = S().savedLocations;
      const quick = (field) => `<div class="chip-row" style="margin-top:8px">${saved.map((l) => `<button class="chip" data-quick-loc="${field}:${l.place}" style="min-height:34px;font-size:12px">${icon(l.icon, 'i-14')}${esc(l.label)}</button>`).join('')}</div>`;
      return `<div class="step-head"><h2>${help ? 'Where do you need help?' : 'Pickup & drop-off'}</h2><p>${help ? 'Choose where the helper should come.' : 'Set where the runner collects and delivers.'}</p></div>
        <div class="field" data-f="pickup"><label class="label" for="cf-pick">${help ? 'Task location' : d.type === 'buy' ? 'Buy from (store / market area)' : 'Pickup location'}</label>
          <div class="input-wrap"><span class="lead">${icon('circle-dot', 'i-18 text-green')}</span><select id="cf-pick" class="select input has-lead" data-bind="pickup">${locOptions(d.pickup, 'Select a location')}</select></div>
          ${quick('pickup')}<div class="error-text"></div></div>
        ${help ? '' : `<div class="field" data-f="dropoff"><label class="label" for="cf-drop">Drop-off location</label>
          <div class="input-wrap"><span class="lead">${icon('map-pin', 'i-18 text-navy')}</span><select id="cf-drop" class="select input has-lead" data-bind="dropoff">${locOptions(d.dropoff, 'Select a location')}</select></div>
          ${quick('dropoff')}<div class="error-text"></div></div>`}
        <div id="cf-route" style="margin-bottom:18px">${createRoutePreview(d)}</div>
        <div class="field" data-f="time"><span class="label">Preferred completion time</span>
          <div class="chip-row" style="flex-wrap:wrap">${['ASAP', 'Within 1 hour', 'Today', 'Schedule'].map((x) => `<button class="chip green ${d.time === x ? 'active' : ''}" data-time="${x}">${x === 'Schedule' ? icon('calendar', 'i-14') : x === 'ASAP' ? icon('zap', 'i-14') : icon('clock', 'i-14')}${x}</button>`).join('')}</div><div class="error-text"></div></div>
        ${d.time === 'Schedule' ? `<div class="field" data-f="scheduleAt"><label class="label" for="cf-when">Date & time</label><input type="datetime-local" id="cf-when" class="input" data-bind="scheduleAt" value="${esc(d.scheduleAt)}"><div class="error-text"></div></div>` : ''}
        <div class="field"><label class="label" for="cf-notes">Location notes <span class="opt">(optional)</span></label>
          <textarea id="cf-notes" class="textarea" style="min-height:76px" data-bind="notes" maxlength="200" placeholder="e.g. Main gate, Block 2. Call when you arrive.">${esc(d.notes)}</textarea></div>`;
    }
    if (d.step === 4) {
      return `<div class="step-head"><h2>Set a reward</h2><p>A fair reward gets your task picked up quickly.</p></div>
        <div class="field" data-f="reward"><label class="label" for="cf-reward">Reward amount</label>
          <div class="reward-input"><span class="cur">₹</span><input id="cf-reward" class="input money" data-bind="reward" inputmode="numeric" value="${esc(d.reward)}" placeholder="0"></div>
          <div class="error-text"></div>
          <div class="amount-chips" style="margin-top:12px">${[50, 100, 150, 200].map((v) => `<button class="chip green ${+d.reward === v ? 'active' : ''}" data-reward="${v}">₹${v}</button>`).join('')}</div>
          <div class="hint" style="display:flex;gap:6px;align-items:center">${icon('trending-up', 'i-14 text-green')}Similar tasks near ${esc(U.loc(d.pickup).name)} earn ₹${suggestRange(d)[0]}–₹${suggestRange(d)[1]}</div></div>
        <div class="card card-pad" id="fee-box">${feeBreakdown(d)}</div>
        <div style="margin-top:14px">${U.escrowNote()}</div>`;
    }
    /* Step 5 — review */
    return `<div class="step-head"><h2>Review & publish</h2><p>Check everything before your task goes live.</p></div>
      <div class="card" style="overflow:hidden">
        <div class="review-block"><div class="rb-head"><small>Task type</small><button class="edit-link" data-edit-step="1">Edit</button></div>
          <div style="display:flex;align-items:center;gap:10px"><div class="icon-tile sm ${U.typeTileClass(d.type)}">${icon(T[d.type].icon, 'i-18')}</div><b>${T[d.type].label}</b></div></div>
        <div class="review-block"><div class="rb-head"><small>Details</small><button class="edit-link" data-edit-step="2">Edit</button></div>
          <b style="font-size:16px">${esc(d.title)}</b>
          <p class="meta" style="margin:6px 0 8px;line-height:1.5">${esc(d.description)}</p>
          <span class="badge b-neutral no-dot">${esc(d.category)}</span>
          ${d.type === 'buy' && d.budget ? `<span class="badge b-neutral no-dot">Budget ${money(+d.budget)}</span>` : ''}
          ${d.image ? `<img src="${d.image}" alt="" style="margin-top:10px;width:100%;height:130px;object-fit:cover;border-radius:12px">` : ''}
          ${d.instructions ? `<p class="meta" style="margin:10px 0 0"><b style="color:var(--ink)">Instructions:</b> ${esc(d.instructions)}</p>` : ''}</div>
        <div class="review-block"><div class="rb-head"><small>Location & time</small><button class="edit-link" data-edit-step="3">Edit</button></div>
          ${U.routeMap({ ...d, dropoff: d.type === 'help' ? d.pickup : d.dropoff }, { height: 130, id: 'rv' })}
          ${U.routeMini({ ...d, dropoff: d.type === 'help' ? d.pickup : d.dropoff })}
          <div class="meta" style="margin-top:10px;display:flex;gap:6px;align-items:center">${icon('clock', 'i-14')}${esc(timeText(d))}</div>
          ${d.notes ? `<p class="meta" style="margin:6px 0 0">${esc(d.notes)}</p>` : ''}</div>
        <div class="review-block"><div class="rb-head"><small>Payment</small><button class="edit-link" data-edit-step="4">Edit</button></div>
          ${payBreakdown(draftTotals(d))}</div>
      </div>
      <div style="margin-top:14px">${U.escrowNote(true)}</div>
      <p class="meta" style="text-align:center;margin:14px 8px 0;line-height:1.5">Choose how to pay on the next screen.</p>`;
  }

  function suggestRange(d) {
    if (d.type === 'help') return [150, 300];
    const km = d.pickup && d.dropoff ? kmBetween(d.pickup, d.dropoff) : 2.5;
    const base = Math.round((40 + km * 30) / 10) * 10;
    return [base, base + 60 + (d.type === 'buy' ? 30 : 0)];
  }

  function feeBreakdown(d) { return payBreakdown(draftTotals(d)); }

  function payBreakdown(x, totalLabel = 'Total payable') {
    return `${x.budget ? `<div class="kv"><span>Item price (max)</span><b class="money">${money(x.budget)}</b></div>` : ''}
      <div class="kv"><span>Runner reward</span><b class="money">${money(x.reward)}</b></div>
      <div class="kv"><span>Security deposit <span class="meta">(refundable)</span></span><b class="money">${money(x.deposit)}</b></div>
      <div class="kv total"><span>${totalLabel}</span><b class="money">${money(x.tot)}</b></div>
      <div class="hint" style="line-height:1.5">After delivery ${money(x.deposit - x.feeUser)} of the deposit comes back to you and ${money(x.feeUser)} is the platform fee.${x.budget ? ' Unused item budget is refunded too.' : ''}</div>`;
  }

  function timeText(d) {
    if (d.time === 'Schedule' && d.scheduleAt) return 'Scheduled · ' + new Date(d.scheduleAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    return d.time;
  }

  function createRoutePreview(d) {
    const help = d.type === 'help';
    if (!d.pickup || (!help && !d.dropoff)) {
      return `<div class="map-wrap" style="height:120px;display:grid;place-items:center;text-align:center">
        <div style="position:absolute;inset:0;opacity:.6"><svg viewBox="0 0 360 240" preserveAspectRatio="xMidYMid slice">${U.mapBase()}</svg></div>
        <div style="position:relative" class="meta">${icon('route', 'i-22')}<div style="margin-top:4px;font-weight:600">${help ? 'Choose a location to preview' : 'Select both locations to preview the route'}</div></div></div>`;
    }
    if (!help && d.pickup === d.dropoff) return `<div class="hint text-danger" style="font-weight:600">Pickup and drop-off can't be the same.</div>`;
    const t = { ...d, dropoff: help ? d.pickup : d.dropoff, distance: help ? 0 : kmBetween(d.pickup, d.dropoff) };
    return `${U.routeMap(t, { height: 150, id: 'cfr' })}
      <div class="meta" style="display:flex;gap:14px;margin-top:8px;font-weight:600">
        <span style="display:inline-flex;gap:5px;align-items:center">${icon('navigation', 'i-14')}${help ? 'On-site task' : t.distance + ' km route'}</span>
        <span style="display:inline-flex;gap:5px;align-items:center">${icon('clock', 'i-14')}${etaFor(t)}</span></div>`;
  }

  function etaFor(t) {
    if (U.isSamePlace(t)) return '30–45 min';
    const m = Math.round((15 + t.distance * 10) / 5) * 5;
    return `${m}–${m + 10} min`;
  }

  function validateStep(n, d) {
    const e = {};
    if (n === 1 && !d.type) e.type = 'Choose a task type to continue';
    if (n === 2) {
      if (!d.title || d.title.trim().length < 5) e.title = 'Enter a title (at least 5 characters)';
      if (!d.description || d.description.trim().length < 15) e.description = 'Describe the task in at least 15 characters';
      if (!d.category) e.category = 'Pick a category';
      if (d.type === 'buy') {
        const b = String(d.budget ?? '').trim();
        if (!b) e.budget = 'Enter the most you want to spend on items';
        else if (!/^\d{1,6}$/.test(b)) e.budget = 'Enter a valid amount';
        else if (+b < 10) e.budget = 'Minimum budget is ₹10';
        else if (+b > 50000) e.budget = 'Maximum budget is ₹50,000';
      }
    }
    if (n === 3) {
      if (!d.pickup) e.pickup = d.type === 'help' ? 'Choose the task location' : 'Choose a pickup location';
      if (d.type !== 'help') {
        if (!d.dropoff) e.dropoff = 'Choose a drop-off location';
        else if (d.dropoff === d.pickup) e.dropoff = 'Drop-off must be different from pickup';
      }
      if (!d.time) e.time = 'Select a completion time';
      if (d.time === 'Schedule') {
        if (!d.scheduleAt) e.scheduleAt = 'Pick a date and time';
        else if (new Date(d.scheduleAt).getTime() < Date.now()) e.scheduleAt = 'Choose a time in the future';
      }
    }
    if (n === 4) {
      const r = +d.reward;
      if (!r) e.reward = 'Enter a reward amount';
      else if (r < 5) e.reward = 'Minimum reward is ₹5';
      else if (r > 5000) e.reward = 'Maximum reward is ₹5,000';
    }
    return e;
  }

  const s_users = () => Store.state.users;

  function draftIsValid(d, draw) {
    for (let n = 1; n <= 4; n++) {
      if (Object.keys(validateStep(n, d)).length) {
        if (draw) {
          d.step = n; draw('pop');
          setTimeout(() => currentEl && showErrors(currentEl, validateStep(n, d)), 50);
        }
        U.toast('Some details are missing', 'warn');
        return false;
      }
    }
    return true;
  }

  function goToCheckout(draw) {
    const d = S().draft;
    if (!d || !draftIsValid(d, draw)) return;
    Store.save();
    Router.go('checkout');
  }

  /* ---------------- Checkout ---------------- */
  const UPI_APPS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM'];
  const BANKS = ['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank'];
  const DEMO_CARD = 'HDFC Bank Visa •••• 4821';

  function payLabel(pay) {
    if (pay.method === 'wallet') return 'TAASKAR Wallet';
    if (pay.method === 'upi') return `${pay.app} (UPI)`;
    if (pay.method === 'card') return DEMO_CARD;
    return `${pay.bank} Net Banking`;
  }

  Screens.checkout = () => {
    const d = S().draft;
    if (!d || !d.reward) return Screens.notFound();
    const { reward, fee, budget, tot } = draftTotals(d);
    const bal = S().wallet.available;
    const enough = bal >= tot;
    if (!d.pay) d.pay = { method: enough ? 'wallet' : 'upi', app: 'Google Pay', bank: '' };
    if (d.pay.method === 'wallet' && !enough) d.pay.method = 'upi';
    const pay = d.pay;
    const T = D.TASK_TYPES[d.type];
    const route = d.type === 'help' ? U.loc(d.pickup).name : `${U.loc(d.pickup).name} → ${U.loc(d.dropoff).name}`;

    const option = (key, ic, title, sub, extra = '', disabled = false) => `
      <div class="method pay-option ${pay.method === key ? 'selected' : ''} ${disabled ? 'disabled' : ''}" data-pay="${key}" role="radio" aria-checked="${pay.method === key}" aria-disabled="${disabled}" tabindex="0">
        <div class="pay-row">
          <div class="icon-tile sm">${icon(ic, 'i-18')}</div>
          <div style="flex:1;min-width:0"><b style="font-size:14.5px">${title}</b><div class="meta truncate">${sub}</div></div>
          <span class="radio"></span>
        </div>
        ${pay.method === key && extra ? `<div class="pay-extra">${extra}</div>` : ''}
      </div>`;

    return {
      html: `
      ${U.header({ title: 'Payment', sub: 'Secure checkout', cls: 'on-white bordered' })}
      <div class="screen-body" style="padding-top:16px">
        <div class="card card-pad">
          <div style="display:flex;gap:12px;align-items:center">
            <div class="icon-tile sm ${U.typeTileClass(d.type)}">${icon(T.icon, 'i-18')}</div>
            <div style="min-width:0;flex:1"><b class="truncate" style="display:block;font-size:14.5px">${esc(d.title)}</b><div class="meta truncate">${esc(route)}</div></div>
          </div>
          <div class="divider"></div>
          ${payBreakdown(draftTotals(d), 'Total')}
        </div>

        <div class="list-label">Pay with</div>
        <div id="pay-list">
          ${option('wallet', 'wallet', 'TAASKAR Wallet', enough ? `Balance ${money(bal)}` : `<span class="text-danger">Balance ${money(bal)} · not enough</span>`,
            '', !enough)}
          ${option('upi', 'smartphone', 'UPI', 'Google Pay, PhonePe, Paytm or any UPI app',
            `<div class="chip-row" style="flex-wrap:wrap">${UPI_APPS.map((a) => `<button type="button" class="chip ${pay.app === a ? 'active' : ''}" data-upi="${a}">${a}</button>`).join('')}</div>`)}
          ${option('card', 'credit-card', 'Debit / Credit Card', `Saved · ${DEMO_CARD}`)}
          ${option('netbanking', 'landmark', 'Net Banking', 'All major Indian banks',
            `<div class="field" data-f="bank" style="margin:0"><select class="select" id="pay-bank" aria-label="Choose your bank">
              <option value="">Select your bank</option>${BANKS.map((b) => `<option ${pay.bank === b ? 'selected' : ''}>${b}</option>`).join('')}</select><div class="error-text"></div></div>`)}
        </div>
        ${!enough ? `<button class="link-btn" data-action="add-money" style="margin-top:2px">${icon('plus', 'i-16')}Add money to wallet</button>` : ''}

        <div style="margin-top:16px">${U.escrowNote(true)}</div>
      </div>
      <div class="footer-bar" style="flex-direction:column;gap:8px">
        <button class="btn btn-green btn-block" data-action="pay">${icon('lock', 'i-18')}Pay ${money(tot)}</button>
        <div class="meta" style="text-align:center;font-size:11.5px">Demo payment · no real money is charged</div>
      </div>`,
      mount(el) {
        el.addEventListener('click', (e) => {
          const up = e.target.closest('[data-upi]');
          if (up) { pay.app = up.dataset.upi; Store.save(); refresh(); return; }
          const opt = e.target.closest('[data-pay]');
          if (opt && !e.target.closest('select')) {
            if (opt.classList.contains('disabled')) { U.toast(`Wallet balance is ${money(S().wallet.available)}. Add money or choose another method.`, 'info'); return; }
            if (pay.method !== opt.dataset.pay) { pay.method = opt.dataset.pay; Store.save(); refresh(); }
            return;
          }
          const act = e.target.closest('[data-action]')?.dataset.action;
          if (act === 'add-money') openMoneySheet('add', tot - S().wallet.available);
          if (act === 'pay') startPayment(e.target.closest('button'));
        });
        el.addEventListener('change', (e) => {
          if (e.target.id === 'pay-bank') { pay.bank = e.target.value; e.target.closest('.field').classList.remove('has-error'); Store.save(); }
        });
      },
    };
  };

  /* Small blocking status card used while a payment is processed. */
  function paymentOverlay() {
    const root = document.getElementById('overlay-root');
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="backdrop show"></div>
      <div class="dialog-wrap"><div class="dialog show" role="status" aria-live="polite" style="padding:28px 22px">
        <div class="pay-status"><span class="spinner-lg"></span></div>
        <h3 id="pay-title" style="margin:18px 0 4px">Processing payment</h3>
        <p id="pay-text" style="margin:0">Please don't close the app.</p>
      </div></div>`;
    root.appendChild(wrap);
    const set = (title, text) => { $('#pay-title', wrap).textContent = title; $('#pay-text', wrap).textContent = text; };
    const success = (title, text) => {
      $('.pay-status', wrap).innerHTML = `<div class="success-mark" style="width:64px;height:64px"><div style="width:44px;height:44px">${icon('check', 'i-24')}</div></div>`;
      U.refreshIcons(); set(title, text);
    };
    return { set, success, close: () => wrap.remove() };
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function startPayment(btn) {
    Store.reload();
    const d = S().draft;
    if (!d || !draftIsValid(d)) { Router.back(); return; }
    const pay = d.pay;
    const { tot } = draftTotals(d);
    if (pay.method === 'wallet' && S().wallet.available < tot) { U.toast('Not enough wallet balance. Choose another method.', 'warn'); refresh(); return; }
    if (pay.method === 'netbanking' && !pay.bank) { showErrors(currentEl, { bank: 'Select your bank to continue' }); return; }
    btn.disabled = true;

    const ov = paymentOverlay();
    const steps = {
      wallet: [['Processing payment', 'Debiting your TAASKAR Wallet']],
      upi: [[`Opening ${pay.app}`, 'Connecting securely'], ['Waiting for approval', `Approve ${money(tot)} in ${pay.app}`]],
      card: [['Contacting your bank', DEMO_CARD], ['Verifying', 'Confirming the one-time password']],
      netbanking: [[`Redirecting to ${pay.bank}`, 'Connecting securely'], ['Confirming payment', `${pay.bank} is processing ${money(tot)}`]],
    }[pay.method];
    for (const [t, x] of steps) { ov.set(t, x); await wait(1100); }
    const ref = 'TXN' + Date.now().toString().slice(-10);
    ov.success('Payment successful', `${money(tot)} is held in escrow`);
    await wait(900);

    const task = publishTask(d, { method: pay.method, label: payLabel(pay), ref });
    ov.close();
    Router.stack.splice(-2);
    Router.go('published', { id: task.id }, { anim: 'fade' });
  }

  function publishTask(d, payment) {
    const s = S();
    const x = draftTotals(d);
    const { reward, fee, budget, tot } = x;
    const help = d.type === 'help';
    const task = {
      id: uid('t'), type: d.type, title: d.title.trim(), description: d.description.trim(), category: d.category,
      pickup: d.pickup, dropoff: help ? d.pickup : d.dropoff, distance: help ? 0 : kmBetween(d.pickup, d.dropoff),
      reward, fee, budget: d.budget ? +d.budget : null, image: d.image, instructions: d.instructions.trim(), notes: d.notes.trim(),
      time: timeText(d), postedAt: Date.now(), requester: me(), status: 'open', runner: null, step: 0, postedByMe: true,
      payment, itemEscrow: budget, purchase: null,
      fees: { fee: x.fee, feeUser: x.feeUser, feeRunner: x.feeRunner, deposit: x.deposit, stake: x.stake },
    };
    task.eta = etaFor(task);
    s.tasks.unshift(task);
    if (payment.method === 'wallet') s.wallet.available -= tot;
    s.wallet.spending += tot;
    addTxn({ kind: 'payment', title: 'Task payment', note: `${task.title} · ${payment.label} · held in escrow`, amount: -tot });
    notify({ icon: 'megaphone', title: 'Task published', text: `"${task.title}" is now visible to nearby runners.`, task: task.id });
    Object.keys(s_users()).forEach((uid2) => notifyUser(uid2, { icon: 'route', title: 'New task near you', text: `${task.title} · ${money(task.reward)} reward`, task: task.id }));
    s.draft = null;
    Store.save();
    homeLoaded = true;
    return task;
  }

  async function closeCreate() {
    const d = S().draft;
    const dirty = d && (d.title || d.description || d.pickup || d.reward);
    if (dirty) {
      const discard = await U.confirmDialog({ title: 'Leave task creation?', message: 'Your progress is saved as a draft. You can continue it any time from Create.', confirmText: 'Discard draft', cancelText: 'Keep draft', tone: 'danger', ic: 'file-pen-line' });
      if (discard) { S().draft = null; Store.save(); U.toast('Draft discarded', 'info', 1500); }
      else U.toast('Draft saved', 'success', 1500);
    }
    if (Router.stack.length > 1) Router.back(); else Router.tab('home');
  }

  Screens.published = (p) => {
    const t = getTask(p.id);
    if (!t) return Screens.notFound();
    return {
      html: `
      <div class="screen-body" style="padding-top:48px;text-align:center">
        <div class="success-mark"><div>${icon('check', 'i-32')}</div></div>
        <h1 style="font-size:24px;font-weight:800;letter-spacing:-.02em;margin:24px 0 6px">Task Published!</h1>
        <p class="meta" style="font-size:14.5px;line-height:1.55;margin:0 12px 22px">Runners heading towards ${esc(U.loc(t.dropoff).name)} are being notified. You'll get an alert when someone accepts.</p>
        <div style="text-align:left">${U.taskCard(t, { noButton: true })}</div>
        <div class="card card-pad" style="text-align:left;margin-top:12px">
          <div class="kv"><span>Paid via</span><b>${esc(t.payment?.label || 'TAASKAR Wallet')}</b></div>
          <div class="kv"><span>Held in escrow</span><b class="text-green">${money(total(t))}</b></div>
          ${t.payment?.ref ? `<div class="kv"><span>Payment ID</span><b>${esc(t.payment.ref)}</b></div>` : ''}
        </div>
        <div style="margin-top:12px;text-align:left">${U.escrowNote(true)}</div>
      </div>
      <div class="footer-bar" style="flex-direction:column">
        <button class="btn btn-primary btn-block" data-go-replace="task" data-id="${t.id}">View Task</button>
        <div style="display:flex;gap:10px"><button class="btn btn-outline" style="flex:1" data-nav="activity">Activity</button><button class="btn btn-outline" style="flex:1" data-nav="home">Home</button></div>
      </div>`,
    };
  };

  /* ---------------- Task Details ---------------- */
  Screens.task = (p) => {
    const t = getTask(p.id);
    if (!t) return Screens.notFound();
    const type = D.TASK_TYPES[t.type];
    const req = U.person(t.requester);
    const mine = t.requester === me();
    const iRun = t.runner === me();
    const runner = t.runner ? U.person(t.runner) : null;
    const m = M(t);
    const single = U.isSamePlace(t);

    let footer = '';
    if (t.status === 'open' && !mine) footer = `<button class="btn btn-outline" data-action="message" style="flex:1" aria-label="Message requester">${icon('message-circle', 'i-18')}Message</button><button class="btn btn-green" data-action="accept" style="flex:1.6">${icon('circle-check', 'i-18')}Accept This Task</button>`;
    else if (t.status === 'open' && mine) footer = `<button class="btn btn-danger-soft" data-action="cancel" style="flex:1">Cancel Task</button><button class="btn btn-primary" data-action="share" style="flex:1">${icon('share-2', 'i-18')}Share</button>`;
    else if ((t.status === 'accepted' || t.status === 'in_progress') && (mine || iRun)) footer = `<button class="btn btn-outline" data-action="message" style="flex:1">${icon('message-circle', 'i-18')}Message</button><button class="btn btn-primary" data-go="tracking" data-id="${t.id}" style="flex:1.4">${icon('radar', 'i-18')}Track Task</button>`;
    else if (t.status === 'accepted' || t.status === 'in_progress') footer = `<button class="btn btn-outline btn-block" disabled>${icon('lock', 'i-18')}Already accepted by another runner</button>`;
    else if (t.status === 'completed') footer = (mine || iRun) && !S().ratings[t.id] ? `<button class="btn btn-green btn-block" data-action="rate">${icon('star', 'i-18')}Rate your experience</button>` : `<button class="btn btn-outline btn-block" disabled>${icon('circle-check', 'i-18')}Task completed</button>`;
    else footer = `<button class="btn btn-outline btn-block" disabled>${icon('ban', 'i-18')}This task was cancelled</button>`;

    return {
      html: `
      ${U.header({ title: 'Task Details', actions: `<button class="icon-btn" data-action="share" aria-label="Share">${icon('share-2', 'i-22')}</button><button class="icon-btn" data-action="more" aria-label="More options">${icon('ellipsis-vertical', 'i-22')}</button>` })}
      <div class="screen-body">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span class="badge no-dot b-neutral" style="gap:5px">${icon(type.icon, 'i-14')}${type.label}</span>${U.statusBadge(t.status)}
          ${mine ? '<span class="mine-tag">Your task</span>' : ''}${iRun ? '<span class="mine-tag">You are the runner</span>' : ''}
        </div>
        <h2 style="font-size:22px;font-weight:800;letter-spacing:-.02em;margin:12px 0 4px;line-height:1.25">${esc(t.title)}</h2>
        <div class="meta" style="display:flex;gap:6px;align-items:center">${icon('clock', 'i-14')}Posted ${U.timeAgo(t.postedAt)}<span class="dot-sep"></span>${esc(t.category)}</div>

        <div class="card card-pad" style="margin-top:16px;display:flex;gap:12px;align-items:center">
          ${U.avatar(req, 'lg')}
          <div style="flex:1;min-width:0">
            <div style="display:flex;gap:5px;align-items:center"><b style="font-size:15px" class="truncate">${esc(mine ? req.name + ' (You)' : req.name)}</b>${U.verifiedBadge(req)}</div>
            <div class="meta" style="display:flex;gap:6px;align-items:center;margin-top:2px">${U.rating(req.rating)}<span class="dot-sep"></span>${mine ? S().user.completed ?? 28 : req.tasks} tasks<span class="dot-sep"></span>Since ${esc(req.since)}</div>
            ${req.verified ? `<div style="font-size:11.5px;color:var(--green);font-weight:700;margin-top:4px;display:flex;gap:4px;align-items:center">${icon('shield-check', 'i-14')}ID & phone verified</div>` : `<div style="font-size:11.5px;color:var(--warn-dk);font-weight:700;margin-top:4px">Verification pending</div>`}
          </div>
          ${mine ? '' : `<button class="icon-btn boxed" data-action="message" aria-label="Message ${esc(req.name)}">${icon('message-circle', 'i-20')}</button>`}
        </div>

        <div class="section-title" style="margin-top:20px"><h2>${single ? 'Location' : 'Route'}</h2><span class="meta">${single ? 'On-site task' : t.distance + ' km'}</span></div>
        ${U.routeMap(t, { height: 170, id: 'dt' })}
        <div class="card card-pad" style="margin-top:10px">
          ${single ? `<div style="display:flex;gap:10px"><div class="icon-tile sm green">${icon('map-pin', 'i-18')}</div><div><b>${esc(U.loc(t.pickup).name)}</b><div class="meta">${esc(U.loc(t.pickup).area)}</div></div></div>`
          : `<div style="display:flex;gap:10px"><div class="icon-tile sm green">${icon('circle-dot', 'i-18')}</div><div><small class="meta" style="font-weight:700;text-transform:uppercase;font-size:10.5px;letter-spacing:.06em">${t.type === 'buy' ? 'Buy from' : 'Pickup'}</small><b style="display:block">${esc(U.loc(t.pickup).name)}</b><div class="meta">${esc(U.loc(t.pickup).area)}</div></div></div>
            <div style="border-left:2px dashed #C9D2DD;height:14px;margin:4px 0 4px 17px"></div>
            <div style="display:flex;gap:10px"><div class="icon-tile sm">${icon('map-pin', 'i-18')}</div><div><small class="meta" style="font-weight:700;text-transform:uppercase;font-size:10.5px;letter-spacing:.06em">Drop-off</small><b style="display:block">${esc(U.loc(t.dropoff).name)}</b><div class="meta">${esc(U.loc(t.dropoff).area)}</div></div></div>`}
          ${t.notes ? `<div class="divider"></div><p class="meta" style="margin:0">${icon('sticky-note', 'i-14')} ${esc(t.notes)}</p>` : ''}
        </div>
        <div class="info-grid" style="margin-top:10px">
          <div><small>Distance</small><b>${U.distanceText(t)}</b></div>
          <div><small>Est. time</small><b>${esc(t.eta || etaFor(t))}</b></div>
          <div><small>Needed by</small><b class="truncate">${esc(t.time || 'Today')}</b></div>
        </div>

        <div class="section-title"><h2>About this task</h2></div>
        <div class="card card-pad">
          <p style="margin:0;font-size:14.5px;line-height:1.6">${esc(t.description)}</p>
          ${t.image ? `<img src="${t.image}" alt="Task photo" style="margin-top:12px;width:100%;height:170px;object-fit:cover;border-radius:12px">` : ''}
          ${itemHeld(t) ? `<div class="divider"></div><div class="kv" style="padding:0"><span>Item budget</span><b>${money(itemHeld(t))} <span class="meta">in escrow</span></b></div>
            <p class="meta" style="margin:6px 0 0;line-height:1.5">${mine ? 'You only pay the bill amount. The rest is refunded to your wallet.' : 'Buy within this budget and add the bill. You are reimbursed the bill amount from escrow.'}</p>`
          : t.budget ? `<div class="divider"></div><div class="kv" style="padding:0"><span>Estimated item cost</span><b>${money(t.budget)}</b></div>` : ''}
          ${t.instructions ? `<div class="divider"></div><div style="display:flex;gap:10px"><div class="icon-tile sm amber">${icon('clipboard-list', 'i-18')}</div><div><b style="font-size:13px">Special instructions</b><p class="meta" style="margin:2px 0 0;line-height:1.5">${esc(t.instructions)}</p></div></div>` : ''}
        </div>

        <div class="reward-card" style="margin-top:16px">
          <div class="lbl">${mine ? 'Reward offered' : 'You earn'}</div>
          <div class="big money">${money(t.reward)}</div>
          ${itemHeld(t) ? `<div class="row" style="margin-top:6px"><span>Item price (max)</span><span>${money(itemHeld(t))}</span></div>` : ''}
          <div class="row" ${itemHeld(t) ? '' : 'style="margin-top:6px"'}><span>Sender security deposit</span><span>${money(m.deposit)}</span></div>
          <div class="row"><span>Runner security stake</span><span>${money(m.stake)}</span></div>
          <div class="row"><span>Platform fee</span><span>${money(m.fee)} (${money(m.feeUser)} + ${money(m.feeRunner)})</span></div>
          <div style="margin-top:12px;display:inline-flex;gap:6px;align-items:center;font-size:12px;font-weight:600;background:rgba(255,255,255,.1);padding:5px 10px;border-radius:999px">${icon('lock', 'i-14')}Held in escrow until confirmed</div>
        </div>
        ${settlementCard(t)}
        <div style="margin-top:12px">${U.escrowNote(true)}</div>

        ${runner && mine ? `<div class="section-title"><h2>Your runner</h2></div>
          <div class="card card-pad" style="display:flex;gap:12px;align-items:center">${U.avatar(runner, 'lg')}
            <div style="flex:1"><div style="display:flex;gap:5px;align-items:center"><b>${esc(runner.name)}</b>${U.verifiedBadge(runner)}</div><div class="meta">${U.rating(runner.rating)} · ${runner.tasks} tasks done</div></div>
            <button class="icon-btn boxed" data-action="message" aria-label="Message runner">${icon('message-circle', 'i-20')}</button></div>` : ''}

        <div style="display:flex;justify-content:center;gap:6px;margin-top:18px">
          ${mine ? '' : `<button class="btn btn-ghost btn-sm" data-action="report">${icon('flag', 'i-16')}Report user</button>`}
          ${mine && t.status === 'open' ? `<button class="btn btn-ghost btn-sm text-danger" data-action="cancel">${icon('circle-x', 'i-16')}Cancel task</button>` : ''}
        </div>
      </div>
      <div class="footer-bar">${footer}</div>`,
      mount(el) {
        el.addEventListener('click', async (e) => {
          const act = e.target.closest('[data-action]')?.dataset.action;
          if (!act) return;
          if (act === 'accept') acceptTask(t.id);
          if (act === 'message') openChat(t.id, mine ? t.runner : t.requester);
          if (act === 'share') shareTask(t);
          if (act === 'report') openReport({ person: mine ? t.runner : t.requester, task: t.id });
          if (act === 'cancel') cancelTask(t.id);
          if (act === 'rate') openRating(t.id);
          if (act === 'more') {
            U.openSheet({
              title: 'Task options',
              body: `<div class="list" style="box-shadow:none">
                <button class="menu-row" data-o="share"><div class="icon-tile sm">${icon('share-2', 'i-18')}</div><div class="li-main"><b>Share task</b><small>Copy a link to this task</small></div></button>
                ${(mine && !t.runner) ? '' : `<button class="menu-row" data-o="report"><div class="icon-tile sm red">${icon('flag', 'i-18')}</div><div class="li-main"><b>Report user</b><small>Flag unsafe or suspicious behaviour</small></div></button>`}
                ${mine && t.status === 'open' ? `<button class="menu-row danger" data-o="cancel"><div class="icon-tile sm red">${icon('circle-x', 'i-18')}</div><div class="li-main"><b>Cancel task</b><small>Full refund of ${money(total(t))} to wallet</small></div></button>` : ''}
                <button class="menu-row" data-o="help"><div class="icon-tile sm green">${icon('life-buoy', 'i-18')}</div><div class="li-main"><b>Get help</b><small>Talk to TAASKAR support</small></div></button></div>`,
              onMount(sheet, close) {
                sheet.addEventListener('click', (ev) => {
                  const o = ev.target.closest('[data-o]')?.dataset.o; if (!o) return;
                  close();
                  setTimeout(() => {
                    if (o === 'share') shareTask(t);
                    if (o === 'report') openReport({ person: mine ? t.runner : t.requester, task: t.id });
                    if (o === 'cancel') cancelTask(t.id);
                    if (o === 'help') Router.go('help');
                  }, 260);
                });
              },
            });
          }
        });
      },
    };
  };

  async function acceptTask(id) {
    const t = getTask(id);
    if (!t) return;
    if (t.status !== 'open') { U.toast('Sorry, this task was already accepted by another runner', 'error'); refresh(); return; }
    const req = U.person(t.requester), m = M(t), first = req.name.split(' ')[0];
    const ok = await U.confirmDialog({
      title: 'Accept this task?',
      message: `A refundable security stake of ${money(m.stake)} is held from your wallet. When ${first} confirms delivery you get ${money(t.reward)} reward${itemHeld(t) ? ' + the item cost' : ''} and ${money(m.stake - m.feeRunner)} of the stake back. If you cancel, the stake is forfeited.`,
      confirmText: `Accept · Stake ${money(m.stake)}`, tone: 'green', ic: 'handshake',
    });
    if (!ok) return;
    Store.reload();
    const fresh = getTask(id);
    if (!fresh || fresh.status !== 'open') { U.toast('Sorry, this task was just accepted by someone else', 'error'); refresh(); return; }
    const s = S();
    if (s.wallet.available < m.stake) {
      U.toast(`Add ${money(m.stake - s.wallet.available)} to your wallet to cover the stake`, 'warn');
      openMoneySheet('add', m.stake - s.wallet.available);
      return;
    }
    Object.assign(fresh, { status: 'accepted', runner: me(), acceptedByMe: true, step: 0, acceptedAt: Date.now(), stakePaid: m.stake });
    s.wallet.available -= m.stake;
    s.wallet.pending += fresh.reward;
    addTxn({ kind: 'stake', title: 'Security stake', note: `${fresh.title} · refundable, held in escrow`, amount: -m.stake });
    notify({ icon: 'clipboard-check', title: 'You accepted a task', text: `${fresh.title} for ${req.name}. ${money(m.stake)} stake held in escrow.`, task: fresh.id });
    notifyUser(fresh.requester, { icon: 'user-check', title: `${s.user.firstName} accepted your task`, text: `"${fresh.title}" · ${s.user.rating}★ verified runner`, task: fresh.id });
    Store.save();
    U.toast('Task accepted! Head to the pickup point.', 'success');
    Router.go('tracking', { id: fresh.id }, { replace: true });
  }

  /* Sender cancels: before acceptance → full refund; after acceptance → sheet scenario 3. */
  async function cancelTask(id) {
    Store.reload();
    const t = getTask(id);
    if (!t || t.status === 'completed' || t.status === 'cancelled') { refresh(); return; }
    if (t.purchase?.status === 'pending') { U.toast('Approve or decline the bill first', 'warn'); return; }
    if (t.runner && (t.step ?? 0) >= 4) { U.toast('Already delivered. Confirm it or report a problem.', 'warn'); return; }
    const outcome = t.runner ? 'user_cancelled' : 'cancelled_open';
    const pv = computeSettlement(t, outcome);
    const rFirst = t.runner ? firstName(t.runner) : '';
    const ok = await U.confirmDialog({
      title: 'Cancel this task?',
      message: t.runner
        ? `You get ${money(pv.user)} back (${pv.lines.user}). ${rFirst} receives ${money(pv.runner)} (${pv.lines.runner}). Platform fee ${money(pv.platform)}.`
        : `${money(pv.user)} will be refunded to your wallet.`,
      confirmText: 'Cancel Task', cancelText: 'Keep Task', tone: 'danger', ic: 'circle-x',
    });
    if (!ok) return;
    Store.reload();
    const t2 = getTask(id);
    if (!t2 || t2.status === 'completed' || t2.status === 'cancelled') { refresh(); return; }
    const st = applySettlement(t2, outcome);
    t2.status = 'cancelled'; t2.cancelledBy = 'sender';
    notify({ icon: 'undo-2', title: 'Task cancelled', text: `${money(st.user)} refunded to your wallet.`, task: t2.id });
    if (t2.runner) notifyUser(t2.runner, { icon: 'bell-off', title: 'Task cancelled by sender', text: `"${t2.title}" · ${money(st.runner)} added to your wallet (${st.lines.runner}).`, task: t2.id });
    Store.save();
    U.toast(`Task cancelled. ${money(st.user)} refunded to your wallet.`);
    refresh();
  }

  function shareTask(t) {
    const text = `TAASKAR task: ${t.title} — ${money(t.reward)} reward (${U.loc(t.pickup).name}${U.isSamePlace(t) ? '' : ' → ' + U.loc(t.dropoff).name}). taaskar.in/t/${t.id}`;
    const done = () => U.toast('Task link copied to clipboard', 'success', 1800);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, done); else done();
  }

  /* ---------------- Activity ---------------- */
  let activityTab = 'all';
  const ACT_TABS = [['all', 'All'], ['posted', 'Posted'], ['accepted', 'Accepted'], ['in_progress', 'In Progress'], ['completed', 'Completed']];

  function activityList(tab) {
    const mine = S().tasks.filter((t) => t.requester === me() || t.runner === me());
    const by = {
      all: mine,
      posted: mine.filter((t) => t.requester === me()),
      accepted: mine.filter((t) => t.runner === me() && t.status === 'accepted'),
      in_progress: mine.filter((t) => t.status === 'in_progress'),
      completed: mine.filter((t) => t.status === 'completed'),
    };
    const rank = { in_progress: 0, accepted: 1, open: 2, completed: 3, cancelled: 4 };
    return (by[tab] || mine).slice().sort((a, b) => rank[a.status] - rank[b.status] || b.postedAt - a.postedAt);
  }

  const EMPTY_ACT = {
    all: ['clipboard-list', 'No activity yet', 'Tasks you post or accept will show up here.'],
    posted: ['send', 'You haven\'t posted a task', 'Need something delivered or bought? Post a task in under a minute.'],
    accepted: ['handshake', 'No accepted tasks', 'Browse tasks along your route and start earning.'],
    in_progress: ['loader', 'Nothing in progress', 'Active deliveries and help tasks will appear here.'],
    completed: ['circle-check-big', 'No completed tasks yet', 'Finished tasks and their payments will be listed here.'],
  };

  Screens.activity = () => {
    const s = S();
    const earned = s.wallet.earnings;
    const active = activityList('all').filter((t) => t.status === 'accepted' || t.status === 'in_progress').length;
    const renderList = () => {
      const list = activityList(activityTab);
      if (!list.length) {
        const [ic, ti, tx] = EMPTY_ACT[activityTab];
        const action = activityTab === 'accepted' || activityTab === 'in_progress' ? `<button class="btn btn-primary" data-nav="explore">Explore Tasks</button>` : `<button class="btn btn-green" data-nav-create>Create a Task</button>`;
        return U.emptyState({ icon: ic, title: ti, text: tx, action });
      }
      return list.map((t) => U.activityCard(t)).join('');
    };
    return {
      html: `
      <header class="screen-head"><div class="head-title-wrap"><h1>My Activity</h1></div>
        <button class="icon-btn boxed" data-go="wallet" aria-label="Wallet">${icon('wallet', 'i-22')}</button></header>
      <div class="screen-body">
        <div class="stat-grid" style="margin-bottom:14px">
          <div class="stat"><small>Active now</small><b>${active}</b></div>
          <div class="stat"><small>Posted</small><b>${activityList('posted').length}</b></div>
          <div class="stat"><small>Earned</small><b class="text-green money">${money(earned)}</b></div>
        </div>
        <div class="tabs" role="tablist" id="act-tabs">
          ${ACT_TABS.map(([k, l]) => `<button role="tab" data-tab="${k}" class="${activityTab === k ? 'active' : ''}">${l}<span class="n">${activityList(k).length}</span></button>`).join('')}
        </div>
        <div id="act-list" style="margin-top:14px">${renderList()}</div>
      </div>`,
      mount(el) {
        $('#act-tabs', el).addEventListener('click', (e) => {
          const b = e.target.closest('[data-tab]'); if (!b) return;
          activityTab = b.dataset.tab;
          $$('[data-tab]', el).forEach((x) => x.classList.toggle('active', x === b));
          b.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          const box = $('#act-list', el);
          box.innerHTML = renderList(); box.classList.remove('anim-fade'); void box.offsetWidth; box.classList.add('anim-fade');
          U.refreshIcons();
        });
        $(`[data-tab="${activityTab}"]`, el)?.scrollIntoView({ inline: 'center', block: 'nearest' });
      },
    };
  };

  /* ---------------- Tracking ---------------- */
  let lastTrack = null;
  const ETA_TEXT = (t) => {
    const help = t.type === 'help';
    return [
      'Runner assigned',
      help ? 'Arriving in ~8 min' : 'Arriving at pickup in ~6 min',
      help ? 'Task started' : t.type === 'buy' ? 'Items purchased' : 'Item picked up',
      help ? 'Work in progress' : 'Arriving in ~12 min',
      help ? 'Task marked done' : 'Delivered',
      'Completed',
    ][t.step ?? 0];
  };

  Screens.tracking = (p) => {
    const t = getTask(p.id);
    if (!t) return Screens.notFound();
    if (!t.runner) { return Screens.task(p); }
    const iRun = t.runner === me();
    const other = U.person(iRun ? t.requester : t.runner);
    const labels = U.stepLabels(t.type);
    const step = t.step ?? 0;
    const done = t.status === 'completed';
    const cancelled = t.status === 'cancelled';
    const pct = Math.round((step / 5) * 100);

    /* Steps 0–3 are the runner's to update; step 4 (confirmation) is the requester's. */
    const otherId = iRun ? t.requester : t.runner;
    const otherReal = isAccount(otherId);
    const otherFirst = other.name.split(' ')[0];
    const myTurn = step < 4 ? iRun : !iRun;
    const held = itemHeld(t);
    const bill = t.purchase;
    const billPending = bill?.status === 'pending';
    let actionBox = '';
    if (!done && !cancelled && billPending) {
      const extra = bill.amount - held;
      actionBox = iRun
        ? `<div class="card card-pad" style="margin-top:16px;display:flex;gap:12px;align-items:flex-start">
            <div class="icon-tile sm amber">${icon('hourglass', 'i-18')}</div>
            <div><b style="font-size:14px">Waiting for ${esc(otherFirst)}</b>
            <p class="meta" style="margin:3px 0 0;line-height:1.5">The bill is ${money(extra)} above the budget. ${esc(otherFirst)} needs to approve it.</p></div></div>`
        : `<div class="demo-box" style="margin-top:16px">
            <div class="tag">Your action</div>
            <p class="meta" style="margin:4px 0 12px;line-height:1.5">${esc(otherFirst)}'s bill is ${money(bill.amount)}, which is ${money(extra)} above your budget of ${money(held)}.</p>
            <div style="display:flex;gap:10px"><button class="btn btn-outline" data-action="decline-bill" style="flex:1">Decline</button>
            <button class="btn btn-green" data-action="approve-bill" style="flex:1.6">Approve +${money(extra)}</button></div></div>`;
    } else if (!done && !cancelled) {
      if (myTurn || !otherReal) {
        const label = myTurn
          ? (step < 4 ? `Update status: ${labels[step + 1][0]}` : 'Confirm & Release Payment')
          : (step < 4 ? `Simulate: ${labels[step + 1][0]}` : 'Simulate requester confirmation');
        const tag = myTurn ? (iRun ? 'Runner actions' : 'Your action') : 'Demo controls';
        const desc = myTurn
          ? (iRun ? `Update each stage as you go. ${otherFirst} sees it instantly.` : 'Confirm only after you have received everything as expected.')
          : `${otherFirst} is a sample user, so you can simulate their step here.`;
        actionBox = `<div class="demo-box" style="margin-top:16px">
          <div class="tag">${tag}</div>
          <p class="meta" style="margin:4px 0 12px;line-height:1.5">${esc(desc)}</p>
          <button class="btn ${step === 4 ? 'btn-green' : 'btn-primary'} btn-block" data-action="advance">${icon(step === 4 ? 'shield-check' : 'circle-arrow-right', 'i-18')}${esc(label)}</button>
        </div>`;
      } else {
        actionBox = `<div class="card card-pad" style="margin-top:16px;display:flex;gap:12px;align-items:flex-start">
          <div class="icon-tile sm amber">${icon('hourglass', 'i-18')}</div>
          <div><b style="font-size:14px">Waiting for ${esc(otherFirst)}</b>
          <p class="meta" style="margin:3px 0 0;line-height:1.5">${step < 4
            ? `${esc(otherFirst)} updates each stage from their phone. This screen refreshes automatically.`
            : `${esc(otherFirst)} needs to confirm delivery. Your ${money(t.reward)} is released as soon as they do.`}</p></div>
        </div>`;
      }
    }

    return {
      html: `
      ${U.header({ title: 'Track Task', sub: esc(t.title), actions: `<button class="icon-btn" data-action="more" aria-label="More">${icon('ellipsis-vertical', 'i-22')}</button>` })}
      <div class="screen-body">
        <div style="position:relative">
          ${U.routeMap(t, { height: 220, id: 'trk', runner: !cancelled })}
          <div class="map-chip">${icon(done ? 'circle-check-big' : 'bike', 'i-14 text-green')}${esc(cancelled ? 'Cancelled' : ETA_TEXT(t))}</div>
        </div>

        <div class="card card-pad" style="margin-top:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <div style="min-width:0"><div class="meta" style="font-weight:600">Current status</div><b style="font-size:17px">${esc(cancelled ? 'Task cancelled' : labels[step][0])}</b></div>
            ${U.statusBadge(t.status)}
          </div>
          <div class="progress-mini" style="height:8px"><span style="width:${cancelled ? 0 : Math.max(6, pct)}%"></span></div>
          <div class="meta" style="margin-top:8px;display:flex;justify-content:space-between"><span>Step ${Math.min(step + 1, 6)} of 6</span><span>${iRun ? 'You earn' : 'Reward'} <b class="text-green">${money(t.reward)}</b></span></div>
        </div>
        ${escrowCard(t, { iRun, done })}

        <div class="card card-pad" style="margin-top:12px;display:flex;gap:12px;align-items:center">
          ${U.avatar(other, 'lg')}
          <div style="flex:1;min-width:0">
            <div class="meta" style="font-weight:600">${iRun ? 'Requester' : t.type === 'help' ? 'Your helper' : 'Your runner'}</div>
            <div style="display:flex;gap:5px;align-items:center"><b class="truncate">${esc(other.name)}</b>${U.verifiedBadge(other)}</div>
            <div class="meta">${U.rating(other.rating)} · ${other.tasks} tasks</div>
          </div>
          <button class="icon-btn boxed" data-action="call" aria-label="Call ${esc(other.name)}">${icon('phone', 'i-20')}</button>
          <button class="icon-btn boxed" data-action="message" aria-label="Message ${esc(other.name)}">${icon('message-circle', 'i-20')}</button>
        </div>

        <div class="card card-pad" style="margin-top:12px">${U.routeMini(t)}</div>

        <div class="section-title"><h2>Progress</h2><span class="meta">${t.acceptedAt ? 'Accepted ' + U.timeAgo(t.acceptedAt) : ''}</span></div>
        <div class="card card-pad">
          <div class="timeline">
            ${labels.map(([h, d], i) => {
              const cls = cancelled ? 'pending' : i < step || (done && i <= step) ? 'done' : i === step ? 'current' : 'pending';
              const ic = cls === 'done' ? 'check' : ['clipboard-check', 'navigation', t.type === 'buy' ? 'shopping-bag' : 'package', 'bike', 'package-check', 'badge-check'][i];
              return `<div class="tl-item ${cls}"><div class="tl-dot">${icon(ic, 'i-14')}</div><div><h4>${h}</h4><p>${cls === 'pending' ? 'Pending' : d}</p></div></div>`;
            }).join('')}
          </div>
        </div>

        ${actionBox}
        ${done ? `<div class="card card-pad" style="margin-top:16px;text-align:center">
          <div class="icon-tile lg green" style="margin:0 auto 10px">${icon('party-popper', 'i-24')}</div>
          <b style="font-size:16px">Task completed</b>
          <p class="meta" style="margin:4px 0 14px">${iRun ? `${money(t.reward)} has been added to your wallet.` : `Payment of ${money(t.reward)} released to ${esc(other.name.split(' ')[0])}.`}</p>
          ${S().ratings[t.id] ? `<div class="meta">You rated ${U.stars(S().ratings[t.id])}</div>` : `<button class="btn btn-green btn-block" data-action="rate">${icon('star', 'i-18')}Rate ${esc(other.name.split(' ')[0])}</button>`}
        </div>` : ''}

        <div style="margin-top:14px">${U.escrowNote(true)}</div>
        <div style="display:flex;justify-content:center;gap:6px;margin-top:14px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" data-action="dispute">${icon('flag', 'i-16')}Report a problem</button>
          ${!done && !cancelled && step < 4 && !billPending ? `<button class="btn btn-ghost btn-sm text-danger" data-action="cancel">${icon('circle-x', 'i-16')}Cancel task</button>` : ''}
        </div>
      </div>`,
      mount(el) {
        /* Moving runner indicator along the SVG route */
        const dot = $('#trk-runner', el), route = $('#trk-path', el), appr = $('#trk-approach', el);
        let raf = null, creep = null;
        const target = (s) => {
          if (!route) return s <= 0 ? { p: 'a', f: 0 } : s === 1 ? { p: 'a', f: 0.6 } : { p: 'a', f: 1 };
          if (s === 0) return { p: 'a', f: 0 };
          if (s === 1) return { p: 'a', f: 0.6 };
          if (s === 2) return { p: 'r', f: 0 };
          if (s === 3) return { p: 'r', f: 0.45 };
          return { p: 'r', f: 1 };
        };
        const place = (tg) => {
          const path = tg.p === 'r' ? route : appr;
          if (!path || !dot) return;
          const pt = path.getPointAtLength(path.getTotalLength() * tg.f);
          dot.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
        };
        const animate = (from, to, ms = 900) => {
          const t0 = performance.now();
          const tick = (now) => {
            const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
            if (from.p !== to.p) {
              if (k < 0.5) place({ p: from.p, f: from.f + (1 - from.f) * (e / 0.875) });
              else place({ p: to.p, f: to.f * e });
            } else place({ p: to.p, f: from.f + (to.f - from.f) * e });
            if (k < 1) raf = requestAnimationFrame(tick); else cur = { ...to };
          };
          raf = requestAnimationFrame(tick);
        };
        let cur = target(step);
        if (dot) {
          if (lastTrack && lastTrack.id === t.id && lastTrack.step !== step) { place(lastTrack.pos); animate(lastTrack.pos, cur); }
          else place(cur);
          if (step === 3) {
            creep = setInterval(() => {
              if (cur.p === 'r' && cur.f < 0.88) { const from = { ...cur }; const to = { p: 'r', f: +(cur.f + 0.05).toFixed(2) }; animate(from, to, 1200); cur = to; }
            }, 1800);
          }
        }

        el.addEventListener('click', async (e) => {
          const act = e.target.closest('[data-action]')?.dataset.action;
          if (!act) return;
          if (act === 'advance') advanceTask(t.id, cur);
          if (act === 'view-bill') U.openSheet({ title: 'Purchase bill', body: `<img src="${t.purchase.photo}" alt="Bill" style="width:100%;border-radius:12px;border:1px solid var(--line)"><div class="kv" style="margin-top:10px"><span>Amount</span><b>${money(t.purchase.amount)}</b></div>` });
          if (act === 'approve-bill') approveBill(t.id);
          if (act === 'decline-bill') declineBill(t.id);
          if (act === 'message') openChat(t.id, iRun ? t.requester : t.runner);
          if (act === 'call') U.toast(`Calling ${other.name} via masked number… (demo)`, 'info');
          if (act === 'rate') openRating(t.id);
          if (act === 'dispute') openReport({ person: iRun ? t.requester : t.runner, task: t.id, dispute: true });
          if (act === 'cancel') iRun ? withdrawTask(t.id) : cancelTask(t.id);
          if (act === 'more') {
            U.openSheet({
              title: 'Task options',
              body: `<div class="list" style="box-shadow:none">
                <button class="menu-row" data-o="details"><div class="icon-tile sm">${icon('file-text', 'i-18')}</div><div class="li-main"><b>View task details</b><small>Description, reward and instructions</small></div></button>
                <button class="menu-row" data-o="dispute"><div class="icon-tile sm amber">${icon('scale', 'i-18')}</div><div class="li-main"><b>Raise a dispute</b><small>Payment stays on hold while we review</small></div></button>
                <button class="menu-row" data-o="report"><div class="icon-tile sm red">${icon('flag', 'i-18')}</div><div class="li-main"><b>Report ${esc(other.name.split(' ')[0])}</b><small>Unsafe or inappropriate behaviour</small></div></button></div>`,
              onMount(sheet, close) {
                sheet.addEventListener('click', (ev) => {
                  const o = ev.target.closest('[data-o]')?.dataset.o; if (!o) return;
                  close();
                  setTimeout(() => {
                    if (o === 'details') Router.go('task', { id: t.id });
                    if (o === 'dispute') openReport({ person: iRun ? t.requester : t.runner, task: t.id, dispute: true });
                    if (o === 'report') openReport({ person: iRun ? t.requester : t.runner, task: t.id });
                  }, 260);
                });
              },
            });
          }
        });
        return () => { cancelAnimationFrame(raf); clearInterval(creep); lastTrack = { id: t.id, step, pos: cur }; };
      },
    };
  };

  async function advanceTask(id) {
    Store.reload();
    const t = getTask(id), s = S();
    if (!t || t.status === 'completed' || t.status === 'cancelled') { refresh(); return; }
    const iRun = t.runner === me();
    const otherId = iRun ? t.requester : t.runner;
    const other = U.person(otherId);
    const labels = U.stepLabels(t.type);
    const myTurn = t.step < 4 ? iRun : !iRun;
    if (!myTurn && isAccount(otherId)) { U.toast(`Waiting for ${other.name.split(' ')[0]} to do this step`, 'info'); refresh(); return; }

    if (t.purchase?.status === 'pending') { refresh(); return; }
    /* Buy & Bring: the runner adds the bill when marking items purchased. */
    if (t.type === 'buy' && t.step === 1 && itemHeld(t)) {
      if (iRun) { openBillSheet(t.id); return; }
      t.purchase = { amount: Math.round((itemHeld(t) * 0.9) / 10) * 10, photo: null, at: Date.now(), status: 'ok' };
    }

    if (t.step === 4) {
      const pv = computeSettlement(t, 'completed');
      const ok = await U.confirmDialog(iRun
        ? { title: 'Simulate confirmation?', message: `${other.name.split(' ')[0]} will confirm the task and ${money(pv.runner)} (${pv.lines.runner}) moves to your wallet.`, confirmText: 'Confirm', tone: 'green', ic: 'badge-check' }
        : { title: 'Confirm delivery?', message: `${other.name.split(' ')[0]} receives ${money(pv.runner)} (${pv.lines.runner}). You get ${money(pv.user)} back. Platform fee ${money(pv.platform)}.`, confirmText: 'Confirm & Release', tone: 'green', ic: 'shield-check' });
      if (!ok) return;
      Store.reload();
      const ft = getTask(id);
      if (!ft || ft.status === 'completed') { refresh(); return; }
      ft.step = 5; ft.status = 'completed'; ft.completedAt = Date.now();
      const st = applySettlement(ft, 'completed');
      const rn = { icon: 'wallet', title: `${money(st.runner)} added to your wallet`, text: `${U.person(ft.requester).name} confirmed "${ft.title}".`, task: ft.id };
      const qn = { icon: 'badge-check', title: 'Payment released', text: `${money(st.runner)} to ${U.person(ft.runner).name} · ${money(st.user)} refunded to you.`, task: ft.id };
      if (iRun) { notify(rn); notifyUser(ft.requester, qn); } else { notify(qn); notifyUser(ft.runner, rn); }
      Store.save(); refresh();
      U.toast(iRun ? `${money(st.runner)} added to your wallet` : `Payment released · ${money(st.user)} refunded`, 'success');
      setTimeout(() => openRating(ft.id), 700);
      return;
    }
    t.step = (t.step ?? 0) + 1;
    t.status = 'in_progress';
    const lbl = labels[t.step][0];
    const n = { icon: t.step === 4 ? 'package-check' : 'bike', title: lbl, text: `${U.person(t.runner).name.split(' ')[0]} · ${t.title}${t.step === 4 ? ' — please confirm delivery' : ''}`, task: t.id };
    if (iRun) notifyUser(t.requester, n); else notify(n);
    Store.save();
    U.toast(lbl, 'info', 1600);
    refresh();
  }

  function openBillSheet(id) {
    const t = getTask(id); if (!t) return;
    const held = itemHeld(t);
    let photo = null;
    U.openSheet({
      title: 'Add purchase bill',
      body: `<div class="kv" style="padding-top:0"><span>Item budget (escrow)</span><b>${money(held)}</b></div>
        <div class="field" data-f="amount" style="margin-top:10px"><label class="label" for="bill-amt">Bill amount</label>
          <div class="prefix-input"><span class="prefix">₹</span><input id="bill-amt" class="input" inputmode="numeric" placeholder="e.g. ${Math.round(held * 0.9)}"></div>
          <div class="error-text"></div><div class="hint" id="bill-hint">You are reimbursed this amount when the sender confirms.</div></div>
        <div class="field" style="margin-bottom:0"><span class="label">Bill photo <span class="opt">(recommended)</span></span>
          <label class="upload" for="bill-file" id="bill-up"><div class="icon-tile sm">${icon('receipt-text', 'i-18')}</div><div><b style="font-size:14px">Add bill photo</b><div class="meta">Helps avoid disputes</div></div></label>
          <input type="file" id="bill-file" accept="image/*" hidden></div>`,
      footer: `<button class="btn btn-primary btn-block" data-submit>Submit Bill</button>`,
      onMount(sheet, close) {
        const amt = $('#bill-amt', sheet), hint = $('#bill-hint', sheet);
        amt.addEventListener('input', () => {
          amt.value = amt.value.replace(/\D/g, '').slice(0, 6);
          amt.closest('.field').classList.remove('has-error');
          const extra = +amt.value - held;
          hint.textContent = extra > 0 ? `${money(extra)} above budget. The sender must approve the extra amount.` : 'You are reimbursed this amount when the sender confirms.';
          hint.style.color = extra > 0 ? 'var(--warn-dk)' : '';
        });
        $('#bill-file', sheet).addEventListener('change', async (e) => {
          try {
            photo = await readImage(e.target.files[0], 640);
            $('#bill-up', sheet).innerHTML = `<img src="${photo}" alt="Bill" style="width:44px;height:44px;object-fit:cover;border-radius:10px"><div><b style="font-size:14px">Bill photo added</b><div class="meta">Tap to change</div></div>`;
          } catch (err) { U.toast(err.message, 'error'); }
        });
        $('[data-submit]', sheet).addEventListener('click', async (e) => {
          const a = +amt.value;
          if (showErrors(sheet, !a ? { amount: 'Enter the bill amount' } : {})) return;
          await U.withLoading(e.currentTarget, 700);
          Store.reload();
          const ft = getTask(id);
          if (!ft || ft.runner !== me() || ft.step !== 1) { close(); refresh(); return; }
          const h = itemHeld(ft), extra = a - h, reqFirst = firstName(ft.requester);
          ft.purchase = { amount: a, photo, at: Date.now(), status: extra > 0 ? 'pending' : 'ok' };
          if (extra > 0 && !isAccount(ft.requester)) {
            ft.itemEscrow = a; ft.purchase.status = 'ok';
            U.toast(`${reqFirst} approved the extra ${money(extra)}`, 'success');
          }
          if (ft.purchase.status === 'ok') {
            ft.step = 2; ft.status = 'in_progress';
            notifyUser(ft.requester, { icon: 'receipt-text', title: 'Items purchased', text: `Bill ${money(a)}${h - a > 0 ? ` · ${money(h - a)} will be refunded to you` : ''}`, task: ft.id });
            if (extra <= 0) U.toast('Bill added · Item Purchased', 'success');
          } else {
            notifyUser(ft.requester, { icon: 'receipt-text', title: `Approve extra ${money(extra)}`, text: `${S().user.firstName}'s bill is ${money(a)} for "${ft.title}".`, task: ft.id });
            U.toast(`Sent to ${reqFirst} for approval`, 'info');
          }
          Store.save(); close(); refresh();
        });
      },
    });
  }

  async function approveBill(id) {
    Store.reload();
    const t = getTask(id);
    if (!t || t.purchase?.status !== 'pending') { refresh(); return; }
    const extra = t.purchase.amount - itemHeld(t);
    const ok = await U.confirmDialog({ title: `Approve ${money(extra)} extra?`, message: `${money(extra)} will be paid from your wallet and held in escrow with the rest of the budget.`, confirmText: 'Approve', tone: 'green', ic: 'receipt-text' });
    if (!ok) return;
    Store.reload();
    const ft = getTask(id), s = S();
    if (!ft || ft.purchase?.status !== 'pending') { refresh(); return; }
    if (s.wallet.available < extra) { U.toast(`Wallet balance is ${money(s.wallet.available)}. Add money to approve.`, 'warn'); openMoneySheet('add', extra - s.wallet.available); return; }
    s.wallet.available -= extra;
    s.wallet.spending += extra;
    addTxn({ kind: 'payment', title: 'Extra item cost', note: `${ft.title} · held in escrow`, amount: -extra });
    ft.itemEscrow = ft.purchase.amount;
    ft.purchase.status = 'ok';
    ft.step = 2; ft.status = 'in_progress';
    notifyUser(ft.runner, { icon: 'circle-check', title: `${s.user.firstName} approved the bill`, text: `Extra ${money(extra)} approved. Continue the delivery.`, task: ft.id });
    Store.save(); refresh();
    U.toast('Extra amount approved', 'success');
  }

  async function declineBill(id) {
    const ok = await U.confirmDialog({ title: 'Decline this bill?', message: 'The runner will be asked to buy within your budget. You can discuss it in chat.', confirmText: 'Decline', tone: 'danger', ic: 'receipt-text' });
    if (!ok) return;
    Store.reload();
    const t = getTask(id);
    if (!t || t.purchase?.status !== 'pending') { refresh(); return; }
    const amount = t.purchase.amount;
    t.purchase = null;
    notifyUser(t.runner, { icon: 'circle-x', title: 'Bill declined', text: `${S().user.firstName} declined ${money(amount)}. Please buy within ${money(itemHeld(t))}.`, task: t.id });
    Store.save(); refresh();
    U.toast('Bill declined', 'info');
  }

  /* Runner cancels after accepting: sender gets a full refund, runner's stake is the platform fee. */
  async function withdrawTask(id) {
    Store.reload();
    const t = getTask(id);
    if (!t || t.runner !== me() || t.status === 'completed' || t.status === 'cancelled') { refresh(); return; }
    const pv = computeSettlement(t, 'runner_cancelled');
    const ok = await U.confirmDialog({ title: 'Cancel this task?', message: `Your ${money(stakeOf(t))} security stake will be forfeited and ${firstName(t.requester)} gets a full refund of ${money(pv.user)}.`, confirmText: 'Cancel Task', cancelText: 'Keep Task', tone: 'danger', ic: 'circle-x' });
    if (!ok) return;
    Store.reload();
    const ft = getTask(id);
    if (!ft || ft.runner !== me() || ft.status === 'completed' || ft.status === 'cancelled') { refresh(); return; }
    const st = applySettlement(ft, 'runner_cancelled');
    ft.status = 'cancelled'; ft.cancelledBy = 'runner';
    notify({ icon: 'circle-x', title: 'You cancelled a task', text: `${money(stakeOf(ft))} stake forfeited · "${ft.title}"`, task: ft.id });
    notifyUser(ft.requester, { icon: 'user-x', title: `${S().user.firstName} cancelled your task`, text: `Full refund of ${money(st.user)} added to your wallet.`, task: ft.id });
    Store.save();
    U.toast(`Task cancelled. ${money(stakeOf(ft))} stake forfeited.`, 'info');
    refresh();
  }

  /* ---------------- Wallet ---------------- */
  const TXN_ICON = { stake: ['shield', 'amber'], stake_return: ['undo-2', 'green'], reimburse: ['receipt-text', 'green'], reward: ['arrow-down-left', 'green'], topup: ['plus', 'green'], refund: ['undo-2', 'green'], payment: ['arrow-up-right', ''], fee: ['percent', 'amber'], withdrawal: ['landmark', ''] };
  function txnRow(x) {
    const [ic, tone] = TXN_ICON[x.kind] || ['circle', ''];
    return `<div class="txn tappable" data-txn="${x.id}" role="button" tabindex="0">
      <div class="icon-tile sm ${tone}">${icon(ic, 'i-18')}</div>
      <div class="t-main"><b>${esc(x.title)}</b><small>${esc(x.note)}</small></div>
      <div class="t-amt ${x.amount >= 0 ? 'pos' : 'neg'}">${U.signedMoney(x.amount)}<small>${U.timeAgo(x.at)}</small></div></div>`;
  }

  Screens.wallet = () => {
    const w = S().wallet;
    return {
      html: `
      ${U.header({ title: 'My Wallet', actions: `<button class="icon-btn" data-go="transactions" aria-label="Transaction history">${icon('history', 'i-22')}</button>` })}
      <div class="screen-body">
        <div class="balance-card">
          <div style="display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1"><span class="lbl">Available Balance</span><span class="secure">${icon('shield-check', 'i-14')}Secured</span></div>
          <div class="amt money" style="position:relative;z-index:1">${money(w.available)}</div>
          <div class="lbl" style="position:relative;z-index:1">${S().user.name} · TAASKAR Wallet</div>
          <div class="wallet-actions">
            <button data-action="add">${icon('circle-plus', 'i-22')}Add Money</button>
            <button data-action="withdraw">${icon('landmark', 'i-22')}Withdraw</button>
            <button data-go="transactions">${icon('receipt-text', 'i-22')}History</button>
          </div>
        </div>
        <div class="stat-grid" style="margin-top:14px">
          <div class="stat"><small>Pending Earnings</small><b class="money" style="color:var(--warn-dk)">${money(w.pending)}</b></div>
          <div class="stat"><small>Total Earnings</small><b class="money text-green">${money(w.earnings)}</b></div>
          <div class="stat"><small>Total Spending</small><b class="money">${money(w.spending)}</b></div>
        </div>
        <div class="card card-pad" style="margin-top:14px">
          <b style="font-size:15px;display:flex;gap:8px;align-items:center">${icon('shield-check', 'i-18 text-green')}How escrow protects you</b>
          <div style="display:grid;gap:12px;margin-top:12px">
            ${[['wallet', 'You pay when posting', 'Reward + 10% fee is held by TAASKAR, not the runner.'], ['package-check', 'Runner completes the task', 'Track every step live in the app.'], ['badge-check', 'You confirm, they get paid', 'Money is released only after your confirmation.']].map(([ic, h, d], i) => `
              <div style="display:flex;gap:12px"><div class="icon-tile sm ${i === 2 ? 'green' : ''}">${icon(ic, 'i-18')}</div><div><b style="font-size:13.5px">${h}</b><div class="meta">${d}</div></div></div>`).join('')}
          </div>
        </div>
        <div class="section-title"><h2>Recent Transactions</h2><button class="link-btn" data-go="transactions">See all${icon('chevron-right', 'i-16')}</button></div>
        <div class="card" style="padding:2px 16px">${S().transactions.slice(0, 5).map(txnRow).join('')}</div>
      </div>`,
      mount(el) {
        el.addEventListener('click', (e) => {
          const a = e.target.closest('[data-action]')?.dataset.action;
          if (a === 'add') openMoneySheet('add');
          if (a === 'withdraw') openMoneySheet('withdraw');
        });
      },
    };
  };

  let txnFilter = 'all';
  Screens.transactions = () => {
    const F = [['all', 'All'], ['in', 'Money in'], ['out', 'Payments'], ['fee', 'Fees'], ['withdrawal', 'Withdrawals']];
    const list = () => S().transactions.filter((x) => txnFilter === 'all' || (txnFilter === 'in' && x.amount > 0) || (txnFilter === 'out' && x.kind === 'payment') || x.kind === txnFilter);
    const groups = () => {
      const g = {};
      list().forEach((x) => {
        const d = new Date(x.at), today = new Date();
        const yd = new Date(); yd.setDate(today.getDate() - 1);
        const key = d.toDateString() === today.toDateString() ? 'Today' : d.toDateString() === yd.toDateString() ? 'Yesterday' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
        (g[key] = g[key] || []).push(x);
      });
      const keys = Object.keys(g);
      if (!keys.length) return U.emptyState({ icon: 'receipt-text', title: 'No transactions', text: 'Nothing matches this filter yet.' });
      return keys.map((k) => `<div class="list-label">${k}</div><div class="card" style="padding:2px 16px">${g[k].map(txnRow).join('')}</div>`).join('');
    };
    return {
      html: `
      ${U.header({ title: 'Transaction History' })}
      <div class="screen-body">
        <div class="chip-row" id="tx-f">${F.map(([k, l]) => `<button class="chip ${txnFilter === k ? 'active' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
        <div id="tx-list">${groups()}</div>
      </div>`,
      mount(el) {
        $('#tx-f', el).addEventListener('click', (e) => {
          const b = e.target.closest('[data-f]'); if (!b) return;
          txnFilter = b.dataset.f;
          $$('#tx-f .chip', el).forEach((c) => c.classList.toggle('active', c === b));
          $('#tx-list', el).innerHTML = groups(); U.refreshIcons();
        });
      },
    };
  };

  function openTxnDetail(id) {
    const x = S().transactions.find((t) => t.id === id); if (!x) return;
    const [ic, tone] = TXN_ICON[x.kind] || ['circle', ''];
    U.openSheet({
      title: 'Transaction details',
      body: `<div style="text-align:center;padding:6px 0 14px"><div class="icon-tile lg ${tone}" style="margin:0 auto 10px">${icon(ic, 'i-24')}</div>
        <div style="font-size:28px;font-weight:800;letter-spacing:-.02em" class="${x.amount >= 0 ? 'text-green' : ''}">${U.signedMoney(x.amount)}</div>
        <div class="meta">${esc(x.title)}</div></div>
        <div class="card card-pad">
          <div class="kv"><span>Description</span><b style="max-width:60%">${esc(x.note)}</b></div>
          <div class="kv"><span>Date</span><b>${new Date(x.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</b></div>
          <div class="kv"><span>Status</span><b class="text-green">Successful</b></div>
          <div class="kv"><span>Reference ID</span><b>TXN${x.id.replace(/\W/g, '').toUpperCase().slice(-10)}</b></div>
        </div>`,
      footer: `<button class="btn btn-outline btn-block" data-sheet-close>Close</button>`,
    });
  }

  function openMoneySheet(mode, suggested = 0) {
    const add = mode === 'add';
    const s = S();
    let amount = suggested ? Math.ceil(suggested / 100) * 100 : '';
    let method = (s.payments.find((p) => p.primary) || s.payments[0])?.id;
    const chips = add ? [500, 1000, 2000, 5000] : [500, 1000, 2000];
    U.openSheet({
      title: add ? 'Add Money' : 'Withdraw Money',
      body: `<div id="ms-form">
        ${add ? '' : `<div class="card card-pad" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:12px 14px"><span class="meta" style="font-weight:600">Available to withdraw</span><b class="money">${money(s.wallet.available)}</b></div>`}
        <div class="field" data-f="amount"><label class="label" for="ms-amt">Amount</label>
          <div class="reward-input"><span class="cur">₹</span><input id="ms-amt" class="input money" inputmode="numeric" placeholder="0" value="${amount}"></div><div class="error-text"></div>
          <div class="amount-chips" style="margin-top:10px;grid-template-columns:repeat(${chips.length + (add ? 0 : 1)},1fr)">${chips.map((v) => `<button class="chip" data-amt="${v}">₹${v.toLocaleString('en-IN')}</button>`).join('')}${add ? '' : `<button class="chip" data-amt="${s.wallet.available}">All</button>`}</div></div>
        <div class="label">${add ? 'Pay using' : 'Withdraw to'}</div>
        <div id="ms-methods">${s.payments.map((p) => `<div class="method ${p.id === method ? 'selected' : ''}" data-method="${p.id}" role="radio" aria-checked="${p.id === method}" tabindex="0">
          <div class="icon-tile sm ${p.kind === 'upi' ? 'green' : ''}">${icon(p.kind === 'upi' ? 'smartphone' : 'landmark', 'i-18')}</div>
          <div style="flex:1"><b style="font-size:14px">${esc(p.label)}</b><div class="meta">${esc(p.detail)}</div></div><span class="radio"></span></div>`).join('')}</div>
        <p class="meta" style="display:flex;gap:6px;align-items:center;margin:14px 0 0">${icon('lock', 'i-14')}${add ? 'Demo transaction — no real money is charged.' : 'Usually arrives within 30 minutes (demo).'}</p>
      </div>`,
      footer: `<button class="btn ${add ? 'btn-green' : 'btn-primary'} btn-block" data-submit>${add ? 'Add Money' : 'Withdraw'}</button>`,
      onMount(sheet, close) {
        const inp = $('#ms-amt', sheet);
        inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 6); amount = inp.value; inp.closest('.field').classList.remove('has-error'); });
        sheet.addEventListener('click', async (e) => {
          const c = e.target.closest('[data-amt]');
          if (c) { amount = c.dataset.amt; inp.value = amount; $$('[data-amt]', sheet).forEach((x) => x.classList.toggle('active', x === c)); return; }
          const m = e.target.closest('[data-method]');
          if (m) { method = m.dataset.method; $$('[data-method]', sheet).forEach((x) => { x.classList.toggle('selected', x === m); x.setAttribute('aria-checked', x === m); }); return; }
          const sub = e.target.closest('[data-submit]');
          if (sub && !sub.dataset.done) {
            const a = +amount;
            let err = '';
            if (!a) err = 'Enter an amount';
            else if (a < 100) err = 'Minimum amount is ₹100';
            else if (add && a > 50000) err = 'Maximum top-up is ₹50,000 per transaction';
            else if (!add && a > s.wallet.available) err = `You can withdraw up to ${money(s.wallet.available)}`;
            if (showErrors(sheet, err ? { amount: err } : {})) return;
            await U.withLoading(sub, 1100);
            const pm = s.payments.find((p) => p.id === method);
            if (add) {
              s.wallet.available += a;
              addTxn({ kind: 'topup', title: 'Money added', note: `${pm.label} · ${pm.detail}`, amount: a });
              notify({ icon: 'wallet', title: `${money(a)} added to wallet`, text: `via ${pm.label}` });
            } else {
              s.wallet.available -= a;
              addTxn({ kind: 'withdrawal', title: 'Withdrawal', note: `To ${pm.label} ${pm.detail}`, amount: -a });
              notify({ icon: 'landmark', title: 'Withdrawal initiated', text: `${money(a)} to ${pm.label}` });
            }
            Store.save();
            $('#ms-form', sheet).innerHTML = `<div style="text-align:center;padding:16px 0 6px" class="anim-fade">
              <div class="success-mark"><div>${icon('check', 'i-28')}</div></div>
              <h3 style="margin:18px 0 4px;font-size:19px">${add ? 'Money added' : 'Withdrawal initiated'}</h3>
              <p class="meta" style="margin:0">${money(a)} ${add ? 'added from' : 'sent to'} ${esc(pm.label)}. New balance: <b style="color:var(--ink)">${money(s.wallet.available)}</b></p></div>`;
            sub.textContent = 'Done'; sub.dataset.done = '1';
            sub.addEventListener('click', close);
            U.refreshIcons();
            refresh();
          }
        });
      },
    });
  }

  /* ---------------- Profile ---------------- */
  Screens.profile = () => {
    const s = S(), u = U.person('me');
    const item = (go, ic, title, sub, tone = '', extra = '') => `<button class="menu-row" ${go}><div class="icon-tile sm ${tone}">${icon(ic, 'i-18')}</div><div class="li-main"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</div>${extra}${icon('chevron-right', 'i-18 chev')}</button>`;
    return {
      html: `
      <header class="screen-head"><div class="head-title-wrap"><h1>Profile</h1></div>
        <button class="icon-btn boxed" data-go="settings" aria-label="Settings">${icon('settings', 'i-22')}</button></header>
      <div class="screen-body">
        <div class="card profile-card">
          <div class="avatar-edit">${U.avatar(u, 'xl')}<button data-action="photo" aria-label="Change profile photo">${icon('camera', 'i-14')}</button></div>
          <input type="file" id="pf-file" accept="image/*" hidden>
          <div><h2>${esc(u.name)}${U.verifiedBadge(u, 'i-18')}</h2></div>
          <div class="meta">${esc(u.college)} · Member since ${esc(u.since)}</div>
          <div style="margin-top:8px">${roleBadge(true)}</div>
          <div class="profile-stats">
            <div><b style="display:flex;justify-content:center;gap:4px;align-items:center">${icon('star', 'i-16 i-fill text-warn')}<span>${u.rating}</span></b><small>Rating</small></div>
            <div><b>${s.user.completed ?? 28}</b><small>Completed</small></div>
            <div><b class="text-green money">${money(s.wallet.earnings)}</b><small>Earned</small></div>
          </div>
        </div>

        <div class="card card-pad" style="margin-top:12px">
          <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:14.5px">Verification status</b><span class="badge b-open">Verified</span></div>
          <div style="display:grid;gap:10px;margin-top:12px">
            ${[['smartphone', 'Mobile number', s.user.phone], ['id-card', 'Government ID', 'Aadhaar •••• 7421'], ['graduation-cap', 'College email', 'christuniversity.in']].map(([ic, l, v]) => `
            <div style="display:flex;gap:10px;align-items:center">${icon(ic, 'i-18 text-muted')}<div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:600">${l}</div><div class="meta truncate">${esc(v)}</div></div>${icon('circle-check', 'i-18 text-green')}</div>`).join('')}
          </div>
        </div>

        <div class="list-label">Account</div>
        <div class="list">
          ${item('data-go="personal"', 'user-round', 'Personal Information', esc(s.user.email))}
          ${item('data-nav="activity"', 'clipboard-list', 'My Tasks', 'Posted and accepted tasks')}
          ${item('data-go="wallet"', 'wallet', 'Wallet', 'Balance ' + money(s.wallet.available), 'green')}
          ${item('data-go="payments"', 'credit-card', 'Payment Methods', `${s.payments.length} saved`)}
          ${item('data-go="locations"', 'map-pin', 'Saved Locations', s.savedLocations.map((l) => l.label).join(', ') || 'None yet')}
        </div>
        <div class="list-label">Community</div>
        <div class="list">
          ${item('data-go="reviews"', 'star', 'Reviews & Ratings', `${u.rating} average · ${D.REVIEWS.length} reviews`, 'amber')}
          ${item('data-go="help"', 'life-buoy', 'Help & Support', 'FAQs, chat and safety')}
          ${item('data-go="notifications"', 'bell', 'Notifications', unread() ? `${unread()} unread` : 'All caught up')}
        </div>
        <div class="list-label">App</div>
        <div class="list">
          ${item('data-go="settings"', 'settings', 'Settings', 'Notifications, privacy, language')}
          <button class="menu-row danger" data-action="logout"><div class="icon-tile sm red">${icon('log-out', 'i-18')}</div><div class="li-main"><b>Logout</b></div></button>
        </div>
        <p class="meta" style="text-align:center;margin-top:20px">TAASKAR v1.0 · Prototype build</p>
      </div>`,
      mount(el) {
        el.addEventListener('click', (e) => {
          const a = e.target.closest('[data-action]')?.dataset.action;
          if (a === 'photo') $('#pf-file', el).click();
          if (a === 'logout') logout();
        });
        $('#pf-file', el).addEventListener('change', async (e) => {
          try { S().user.photo = await readImage(e.target.files[0], 320); Store.save(); refresh(); U.toast('Profile photo updated'); }
          catch (err) { U.toast(err.message, 'error'); }
        });
      },
    };
  };

  async function logout() {
    const ok = await U.confirmDialog({ title: 'Log out?', message: 'You can log back in any time. Your tasks and wallet stay saved on this device.', confirmText: 'Log Out', tone: 'danger', ic: 'log-out' });
    if (!ok) return;
    Store.setSession(null);
    resetViewState();
    Router.stack = [{ name: 'welcome', params: {} }];
    render('fade');
    U.toast('You have been logged out', 'info');
  }

  Screens.personal = () => {
    const u = S().user;
    const f = (id, label, val, attrs = '') => `<div class="field" data-f="${id}"><label class="label" for="pi-${id}">${label}</label><input id="pi-${id}" class="input" value="${esc(val)}" ${attrs}><div class="error-text"></div></div>`;
    return {
      html: `
      ${U.header({ title: 'Personal Information' })}
      <form class="screen-body" id="pi-form" novalidate>
        ${f('name', 'Full name', u.name, 'autocomplete="name"')}
        ${f('email', 'Email', u.email, 'type="email" autocomplete="email"')}
        ${f('phone', 'Mobile number', u.phone, 'type="tel" autocomplete="tel"')}
        ${f('city', 'City', u.city)}
        ${f('college', 'College / Workplace', u.college)}
        <div class="card card-pad" style="display:flex;gap:10px;align-items:flex-start">${icon('shield-check', 'i-18 text-green')}<p class="meta" style="margin:0;line-height:1.5">Your phone number is never shown to other users. Calls are connected through a masked number.</p></div>
      </form>
      <div class="footer-bar"><button class="btn btn-primary btn-block" data-action="save">Save Changes</button></div>`,
      mount(el) {
        $('[data-action=save]', el).addEventListener('click', async (e) => {
          const v = (k) => $('#pi-' + k, el).value.trim();
          const errs = {};
          if (v('name').length < 3) errs.name = 'Enter your full name';
          if (!/^\S+@\S+\.\S+$/.test(v('email'))) errs.email = 'Enter a valid email address';
          if (v('phone').replace(/\D/g, '').length < 10) errs.phone = 'Enter a valid mobile number';
          if (showErrors(el, errs)) return;
          await U.withLoading(e.currentTarget, 700);
          Object.assign(S().user, { name: v('name'), firstName: v('name').split(' ')[0], email: v('email'), phone: v('phone'), city: v('city'), college: v('college') });
          Store.save();
          U.toast('Profile updated');
          Router.back();
        });
      },
    };
  };

  Screens.payments = () => ({
    html: `
    ${U.header({ title: 'Payment Methods' })}
    <div class="screen-body">
      <div class="list">${S().payments.map((p) => `<button class="menu-row" data-pm="${p.id}">
        <div class="icon-tile sm ${p.kind === 'upi' ? 'green' : ''}">${icon(p.kind === 'upi' ? 'smartphone' : 'landmark', 'i-18')}</div>
        <div class="li-main"><b>${esc(p.label)}</b><small>${esc(p.detail)}</small></div>
        ${p.primary ? '<span class="badge b-open no-dot">Primary</span>' : ''}${icon('ellipsis-vertical', 'i-18 chev')}</button>`).join('') || '<div class="card-pad meta">No payment methods saved.</div>'}</div>
      <button class="btn btn-outline btn-block" style="margin-top:14px" data-action="add-upi">${icon('plus', 'i-18')}Add UPI ID</button>
      <div style="margin-top:16px">${U.escrowNote(true)}</div>
      <p class="meta" style="text-align:center;margin-top:14px">Card and bank details are never stored in this prototype.</p>
    </div>`,
    mount(el) {
      el.addEventListener('click', (e) => {
        const pm = e.target.closest('[data-pm]');
        if (pm) {
          const p = S().payments.find((x) => x.id === pm.dataset.pm);
          U.openSheet({
            title: p.label,
            body: `<p class="meta" style="margin:0 0 12px">${esc(p.detail)}</p><div class="list" style="box-shadow:none">
              ${p.primary ? '' : `<button class="menu-row" data-o="primary"><div class="icon-tile sm green">${icon('star', 'i-18')}</div><div class="li-main"><b>Set as primary</b></div></button>`}
              <button class="menu-row danger" data-o="remove"><div class="icon-tile sm red">${icon('trash-2', 'i-18')}</div><div class="li-main"><b>Remove</b></div></button></div>`,
            onMount(sheet, close) {
              sheet.addEventListener('click', async (ev) => {
                const o = ev.target.closest('[data-o]')?.dataset.o; if (!o) return;
                const s = S();
                if (o === 'primary') { s.payments.forEach((x) => (x.primary = x.id === p.id)); Store.save(); close(); refresh(); U.toast(`${p.label} is now your primary method`); }
                if (o === 'remove') {
                  if (s.payments.length === 1) { U.toast('Keep at least one payment method', 'warn'); return; }
                  close();
                  const ok = await U.confirmDialog({ title: 'Remove payment method?', message: `${p.label} (${p.detail}) will be removed from your account.`, confirmText: 'Remove', tone: 'danger', ic: 'trash-2' });
                  if (!ok) return;
                  s.payments = s.payments.filter((x) => x.id !== p.id);
                  if (!s.payments.some((x) => x.primary)) s.payments[0].primary = true;
                  Store.save(); refresh(); U.toast('Payment method removed');
                }
              });
            },
          });
        }
        if (e.target.closest('[data-action=add-upi]')) {
          U.openSheet({
            title: 'Add UPI ID',
            body: `<div class="field" data-f="upi"><label class="label" for="upi-id">UPI ID</label><input id="upi-id" class="input" placeholder="name@okaxis" autocomplete="off"><div class="error-text"></div>
              <div class="hint">We'll verify the name linked to this UPI ID (demo).</div></div>`,
            footer: `<button class="btn btn-green btn-block" data-save>Verify & Add</button>`,
            onMount(sheet, close) {
              $('[data-save]', sheet).addEventListener('click', async (ev) => {
                const v = $('#upi-id', sheet).value.trim();
                if (showErrors(sheet, /^[\w.-]{2,}@[a-z]{2,}$/i.test(v) ? {} : { upi: 'Enter a valid UPI ID, e.g. name@okaxis' })) return;
                await U.withLoading(ev.currentTarget, 900);
                S().payments.push({ id: uid('pm'), kind: 'upi', label: 'UPI', detail: v, primary: false });
                Store.save(); close(); refresh(); U.toast('UPI ID verified and added');
              });
            },
          });
        }
      });
    },
  });

  Screens.locations = () => ({
    html: `
    ${U.header({ title: 'Saved Locations' })}
    <div class="screen-body">
      ${S().savedLocations.length ? `<div class="list">${S().savedLocations.map((l) => `<div class="menu-row">
        <div class="icon-tile sm">${icon(l.icon, 'i-18')}</div>
        <div class="li-main"><b>${esc(l.label)}</b><small>${esc(U.loc(l.place).name)}, ${esc(U.loc(l.place).area)}</small></div>
        <button class="icon-btn" data-rm="${l.id}" aria-label="Remove ${esc(l.label)}">${icon('trash-2', 'i-18 text-muted')}</button></div>`).join('')}</div>`
        : U.emptyState({ icon: 'map-pin', title: 'No saved locations', text: 'Save places you use often to fill tasks faster.' })}
      <button class="btn btn-outline btn-block" style="margin-top:14px" data-action="add">${icon('plus', 'i-18')}Add Location</button>
    </div>`,
    mount(el) {
      el.addEventListener('click', async (e) => {
        const rm = e.target.closest('[data-rm]');
        if (rm) {
          const l = S().savedLocations.find((x) => x.id === rm.dataset.rm);
          const ok = await U.confirmDialog({ title: `Remove "${l.label}"?`, message: 'This location will no longer appear as a shortcut.', confirmText: 'Remove', tone: 'danger', ic: 'trash-2' });
          if (!ok) return;
          S().savedLocations = S().savedLocations.filter((x) => x.id !== l.id); Store.save(); refresh(); U.toast('Location removed');
        }
        if (e.target.closest('[data-action=add]')) {
          let ic = 'house';
          U.openSheet({
            title: 'Add Location',
            body: `<div class="field" data-f="label"><label class="label" for="sl-l">Label</label><input id="sl-l" class="input" placeholder="e.g. Office, Hostel" maxlength="20"><div class="error-text"></div></div>
              <div class="field" data-f="place"><label class="label" for="sl-p">Area</label><select id="sl-p" class="select">${locOptions('', 'Select an area')}</select><div class="error-text"></div></div>
              <span class="label">Icon</span><div class="chip-row" id="sl-ic">${['house', 'briefcase', 'graduation-cap', 'dumbbell', 'heart'].map((x) => `<button class="chip ${x === ic ? 'active' : ''}" data-ic="${x}" aria-label="${x}">${icon(x, 'i-16')}</button>`).join('')}</div>`,
            footer: `<button class="btn btn-primary btn-block" data-save>Save Location</button>`,
            onMount(sheet, close) {
              $('#sl-ic', sheet).addEventListener('click', (ev) => { const b = ev.target.closest('[data-ic]'); if (!b) return; ic = b.dataset.ic; $$('#sl-ic .chip', sheet).forEach((c) => c.classList.toggle('active', c === b)); });
              $('[data-save]', sheet).addEventListener('click', () => {
                const label = $('#sl-l', sheet).value.trim(), place = $('#sl-p', sheet).value;
                const errs = {}; if (!label) errs.label = 'Add a label'; if (!place) errs.place = 'Choose an area';
                if (showErrors(sheet, errs)) return;
                S().savedLocations.push({ id: uid('sl'), label, place, icon: ic }); Store.save(); close(); refresh(); U.toast('Location saved');
              });
            },
          });
        }
      });
    },
  });

  Screens.reviews = () => {
    const dist = [[5, 82], [4, 14], [3, 3], [2, 1], [1, 0]];
    return {
      html: `
      ${U.header({ title: 'Reviews & Ratings' })}
      <div class="screen-body">
        <div class="card card-pad" style="display:flex;gap:18px;align-items:center">
          <div style="text-align:center"><div style="font-size:40px;font-weight:800;letter-spacing:-.03em;line-height:1">4.9</div>${U.stars(5)}<div class="meta" style="margin-top:4px">28 ratings</div></div>
          <div style="flex:1;display:grid;gap:5px">${dist.map(([n, p]) => `<div style="display:flex;gap:8px;align-items:center;font-size:12px;font-weight:600"><span style="width:8px">${n}</span><div style="flex:1;height:6px;border-radius:6px;background:#EEF1F5;overflow:hidden"><div style="width:${p}%;height:100%;background:var(--warn)"></div></div><span class="meta" style="width:28px;text-align:right">${p}%</span></div>`).join('')}</div>
        </div>
        <div class="chip-row" style="margin-top:14px">${['On time', 'Polite', 'Careful with items', 'Great communication'].map((x) => `<span class="chip" style="min-height:32px;font-size:12px">${icon('thumbs-up', 'i-14 text-green')}${x}</span>`).join('')}</div>
        <div class="list-label">What people say</div>
        ${D.REVIEWS.map((r) => { const p = U.person(r.from); return `<div class="card card-pad" style="margin-bottom:10px">
          <div style="display:flex;gap:10px;align-items:center">${U.avatar(p, 'sm')}<div style="flex:1"><b style="font-size:14px">${esc(p.name)}</b><div>${U.stars(r.stars)}</div></div><span class="meta">${r.when}</span></div>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.55">${esc(r.text)}</p></div>`; }).join('')}
      </div>`,
    };
  };

  Screens.help = () => ({
    html: `
    ${U.header({ title: 'Help & Support' })}
    <div class="screen-body">
      <div class="card card-pad" style="background:var(--navy);color:#fff;border:0">
        <b style="font-size:16px">How can we help, ${esc(S().user.firstName)}?</b>
        <p style="margin:4px 0 14px;font-size:13px;color:rgba(255,255,255,.75)">Our support team is available 8 AM – 11 PM, all days.</p>
        <div style="display:flex;gap:10px"><button class="btn btn-sm" style="background:#fff;color:var(--navy);flex:1" data-action="chat">${icon('message-circle', 'i-16')}Chat with us</button>
        <button class="btn btn-sm" style="background:rgba(255,255,255,.12);color:#fff;flex:1" data-action="call">${icon('phone', 'i-16')}Call helpline</button></div>
      </div>
      <div class="list-label">Frequently asked</div>
      <div class="card" style="padding:0 16px">${D.FAQS.map((f) => `<details class="faq"><summary>${esc(f.q)}${icon('chevron-down', 'i-18')}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>
      <div class="list-label">Trust & safety</div>
      <div class="list">
        <button class="menu-row" data-action="report"><div class="icon-tile sm red">${icon('shield-alert', 'i-18')}</div><div class="li-main"><b>Report a safety issue</b><small>We review every report within 24 hours</small></div>${icon('chevron-right', 'i-18 chev')}</button>
        <button class="menu-row" data-action="dispute"><div class="icon-tile sm amber">${icon('scale', 'i-18')}</div><div class="li-main"><b>Payment dispute</b><small>Escrow stays on hold during review</small></div>${icon('chevron-right', 'i-18 chev')}</button>
      </div>
    </div>`,
    mount(el) {
      el.addEventListener('click', (e) => {
        const a = e.target.closest('[data-action]')?.dataset.action;
        if (a === 'chat') openChat('support', 'support');
        if (a === 'call') U.toast('Calling TAASKAR helpline 1800-208-2752 (demo)', 'info');
        if (a === 'report') openReport({});
        if (a === 'dispute') openReport({ dispute: true });
      });
    },
  });

  Screens.settings = () => {
    const st = S().settings;
    const tg = (k, title, sub) => `<label class="menu-row" style="cursor:pointer"><div class="li-main"><b>${title}</b><small>${sub}</small></div><span class="switch"><input type="checkbox" data-set="${k}" ${st[k] ? 'checked' : ''}><span></span></span></label>`;
    return {
      html: `
      ${U.header({ title: 'Settings' })}
      <div class="screen-body">
        <div class="list-label" style="margin-top:6px">Notifications</div>
        <div class="list">${tg('push', 'Push notifications', 'Task updates and new tasks on your route')}${tg('sms', 'SMS alerts', 'Important updates by text message')}${tg('email', 'Email updates', 'Receipts and weekly summary')}</div>
        <div class="list-label">Privacy</div>
        <div class="list">${tg('liveLocation', 'Share live location during tasks', 'Only visible to the other person on an active task')}
          <button class="menu-row" data-action="lang"><div class="li-main"><b>Language</b><small>${esc(st.language)}</small></div>${icon('chevron-right', 'i-18 chev')}</button></div>
        <div class="list-label">Demo</div>
        <div class="list"><button class="menu-row danger" data-action="reset"><div class="icon-tile sm red">${icon('rotate-ccw', 'i-18')}</div><div class="li-main"><b>Reset demo data</b><small>Restore sample tasks, wallet and notifications</small></div></button></div>
      </div>`,
      mount(el) {
        el.addEventListener('change', (e) => {
          const k = e.target.dataset.set; if (!k) return;
          S().settings[k] = e.target.checked; Store.save();
          U.toast(`${e.target.closest('.menu-row').querySelector('b').textContent} ${e.target.checked ? 'on' : 'off'}`, 'info', 1400);
        });
        el.addEventListener('click', async (e) => {
          const a = e.target.closest('[data-action]')?.dataset.action;
          if (a === 'lang') {
            U.openSheet({
              title: 'Language',
              body: ['English', 'हिन्दी (Hindi)', 'ಕನ್ನಡ (Kannada)', 'தமிழ் (Tamil)'].map((l) => `<label class="radio-row"><input type="radio" name="lang" value="${l}" ${S().settings.language === l ? 'checked' : ''}>${l}</label>`).join(''),
              onMount(sheet, close) {
                $$('input[name=lang]', sheet).forEach((r) => r.addEventListener('change', () => {
                  S().settings.language = r.value; Store.save(); close(); refresh();
                  U.toast(r.value === 'English' ? 'Language set to English' : 'Preference saved. This prototype is shown in English.', 'info');
                }));
              },
            });
          }
          if (a === 'reset') {
            const ok = await U.confirmDialog({ title: 'Reset demo data?', message: 'All tasks, wallet activity and settings return to the original sample data.', confirmText: 'Reset', tone: 'danger', ic: 'rotate-ccw' });
            if (!ok) return;
            resetDemo();
          }
        });
      },
    };
  };

  function resetViewState() {
    homeLoaded = false; exQuery = ''; exZoom = 1; exSelected = null; activityTab = 'all'; txnFilter = 'all'; lastTrack = null;
  }

  function resetDemo() {
    Store.reset();
    resetViewState();
    if (S().loggedIn) Router.tab('home'); else { Router.stack = [{ name: 'welcome', params: {} }]; render('fade'); }
    U.toast('Demo data restored');
  }

  /* ---------------- Notifications ---------------- */
  Screens.notifications = () => {
    const list = S().notifications;
    const today = list.filter((n) => Date.now() - n.at < 24 * 3600 * 1000);
    const earlier = list.filter((n) => Date.now() - n.at >= 24 * 3600 * 1000);
    const row = (n) => `<button class="notif ${n.read ? '' : 'unread'}" data-notif="${n.id}" style="width:100%;border:0;background:${n.read ? 'transparent' : ''};text-align:left">
      <div class="icon-tile sm ${n.read ? '' : 'green'}">${icon(n.icon || 'bell', 'i-18')}</div>
      <div class="n-main"><b>${esc(n.title)}</b><p>${esc(n.text)}</p><small>${U.timeAgo(n.at)}</small></div>
      ${n.read ? '' : '<span class="unread-dot"></span>'}</button>`;
    return {
      html: `
      ${U.header({ title: 'Notifications', actions: unread() ? `<button class="link-btn" data-action="read-all" style="padding:0 10px">Mark all read</button>` : '' })}
      <div class="screen-body">
        ${!list.length ? U.emptyState({ icon: 'bell-off', title: 'No notifications', text: 'Task updates and payments will appear here.' }) : ''}
        ${today.length ? `<div class="list-label" style="margin-top:6px">Today</div><div class="card" style="overflow:hidden">${today.map(row).join('')}</div>` : ''}
        ${earlier.length ? `<div class="list-label">Earlier</div><div class="card" style="overflow:hidden">${earlier.map(row).join('')}</div>` : ''}
      </div>`,
      mount(el) {
        el.addEventListener('click', (e) => {
          if (e.target.closest('[data-action=read-all]')) {
            S().notifications.forEach((n) => (n.read = true)); Store.save(); refresh(); U.toast('All notifications marked as read', 'info', 1500); return;
          }
          const b = e.target.closest('[data-notif]'); if (!b) return;
          const n = S().notifications.find((x) => x.id === b.dataset.notif);
          n.read = true; Store.save();
          const t = n.task && getTask(n.task);
          if (t) Router.go(t.runner && (t.status === 'accepted' || t.status === 'in_progress') ? 'tracking' : 'task', { id: t.id });
          else refresh();
        });
      },
    };
  };

  Screens.notFound = () => ({
    html: `${U.header({ title: '' })}<div class="screen-body">${U.emptyState({ icon: 'file-question', title: 'Task not found', text: 'This task may have been removed or reset.', action: `<button class="btn btn-primary" data-nav="home">Go Home</button>` })}</div>`,
  });

  /* ======================================================================
     SHEETS: chat, report, rating
     ====================================================================== */
  const REPLIES = ['Sure, sounds good.', 'Okay, noted. Thank you!', 'I\'ll be there in about 10 minutes.', 'Yes, that works for me.', 'Please share a photo once it\'s done.', 'Great, thanks for the update!'];

  /* Functions re-run when another tab changes the shared data (e.g. an open chat). */
  const liveHooks = new Set();

  function openChat(taskId, personId) {
    const isSupport = personId === 'support';
    const other = isSupport ? { name: 'TAASKAR Support', tone: 1, verified: true, rating: 5 } : (personId ? U.person(personId) : null);
    if (!other || !personId) { U.toast('No one to message yet. Waiting for a runner.', 'info'); return; }
    const real = !isSupport && isAccount(personId);
    const key = isSupport ? `support_${me()}` : taskId;
    const t = getTask(taskId);
    const first = other.name.split(' ')[0];
    /* Sample users greet you first; real demo accounts start with an empty chat. */
    if (!S().chats[key] && !real) {
      S().chats[key] = [{
        from: isSupport ? 'support' : personId, at: Date.now() - 4 * 60000,
        text: isSupport ? `Hi ${S().user.firstName}, this is Kavya from TAASKAR Support. How can I help you today?`
          : t && t.requester === me() ? `Hi ${S().user.firstName}, ${first} here. I've got your task "${t.title}". I'll keep you posted.`
          : `Hi! Thanks for checking out my task. Let me know if you have any questions.`,
      }];
      Store.save();
    }
    const msgs = () => S().chats[key] || [];
    const bubble = (m) => `<div class="bubble ${m.from === me() || m.from === 'me' ? 'me' : 'them'}">${esc(m.text)}<small>${new Date(m.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</small></div>`;
    const listHtml = () => msgs().length ? msgs().map(bubble).join('') : `<div class="meta" style="text-align:center;padding:24px 8px">Say hi to ${esc(first)}. Messages appear in their app instantly.</div>`;
    let hook = null;
    U.openSheet({
      title: '',
      tall: true,
      body: `<div style="display:flex;gap:10px;align-items:center;padding:4px 0 10px;border-bottom:1px solid var(--line);position:sticky;top:0;background:#fff;z-index:1">
          ${isSupport ? `<div class="icon-tile sm green">${icon('headset', 'i-18')}</div>` : U.avatar(other, 'sm')}
          <div style="flex:1;min-width:0"><div style="display:flex;gap:5px;align-items:center"><b class="truncate">${esc(other.name)}</b>${U.verifiedBadge(other, 'i-14')}</div>
          <div class="meta truncate">${t ? esc(t.title) : 'Usually replies in 2 min'}</div></div>
          <button class="icon-btn" data-sheet-close aria-label="Close chat">${icon('x', 'i-22')}</button></div>
        <div class="meta" style="text-align:center;font-size:11.5px;margin:10px 0 2px;display:flex;gap:5px;justify-content:center;align-items:center">${icon('lock', 'i-14')}Chats are monitored for your safety</div>
        <div class="chat" id="chat-list">${listHtml()}</div>`,
      footer: `<form id="chat-form" style="display:flex;gap:8px;width:100%"><input class="input" id="chat-in" placeholder="Type a message…" autocomplete="off" style="flex:1;min-height:48px">
        <button class="filter-btn" style="background:var(--green);width:48px;height:48px" aria-label="Send">${icon('send', 'i-20')}</button></form>`,
      onClose() { if (hook) liveHooks.delete(hook); },
      onMount(sheet) {
        const list = $('#chat-list', sheet), body = $('.sheet-body', sheet);
        const scroll = () => (body.scrollTop = body.scrollHeight);
        const redraw = () => { if (!$('#typing', sheet)) { list.innerHTML = listHtml(); scroll(); } };
        hook = redraw; liveHooks.add(hook);
        setTimeout(scroll, 50);
        let typingT = null;
        $('#chat-form', sheet).addEventListener('submit', (e) => {
          e.preventDefault();
          const inp = $('#chat-in', sheet), text = inp.value.trim();
          if (!text) return;
          Store.reload();
          if (!S().chats[key]) S().chats[key] = [];
          S().chats[key].push({ from: me(), text, at: Date.now() });
          if (real) notifyUser(personId, { icon: 'message-circle', title: `Message from ${S().user.firstName}`, text, task: taskId });
          Store.save();
          list.innerHTML = listHtml(); inp.value = ''; scroll();
          if (real) return;
          clearTimeout(typingT);
          list.insertAdjacentHTML('beforeend', '<div class="bubble them typing" id="typing"><i></i><i></i><i></i></div>'); scroll();
          typingT = setTimeout(() => {
            $('#typing', sheet)?.remove();
            S().chats[key].push({ from: isSupport ? 'support' : personId, text: isSupport ? 'Thanks for the details. I\'ve raised this with our team and will update you shortly.' : REPLIES[Math.floor(Math.random() * REPLIES.length)], at: Date.now() });
            Store.save();
            if (document.body.contains(list)) { list.innerHTML = listHtml(); scroll(); }
          }, 1400);
        });
        setTimeout(() => $('#chat-in', sheet)?.focus({ preventScroll: true }), 320);
      },
    });
  }

  function openReport({ person, task, dispute = false }) {
    const p = person ? U.person(person) : null;
    const reasons = dispute
      ? ['Item not delivered', 'Item damaged or wrong', 'Runner asked for extra money', 'Task not completed as described', 'Other']
      : ['No-show or unresponsive', 'Rude or inappropriate behaviour', 'Suspected fraud or scam', 'Unsafe conduct', 'Other'];
    U.openSheet({
      title: dispute ? 'Report a problem' : p ? `Report ${p.name.split(' ')[0]}` : 'Report a safety issue',
      body: `${dispute ? `<div class="escrow" style="margin-bottom:14px;background:var(--warn-lt);border-color:#F6DDB0"><div class="icon-tile sm amber" style="background:#fff">${icon('scale', 'i-18')}</div><div><b style="color:#7A4700">Payment will stay on hold</b><p style="color:#8A5A12">Escrow is frozen while our team reviews the dispute (usually within 24 hours).</p></div></div>` : ''}
        <div class="field" data-f="reason"><span class="label">What went wrong?</span>
        ${reasons.map((r) => `<label class="radio-row"><input type="radio" name="reason" value="${esc(r)}">${esc(r)}</label>`).join('')}<div class="error-text"></div></div>
        <div class="field" data-f="details"><label class="label" for="rp-d">Details</label><textarea id="rp-d" class="textarea" maxlength="400" placeholder="Tell us what happened. Include times and any useful information."></textarea><div class="error-text"></div></div>
        <label class="check"><input type="checkbox" id="rp-block"><span>${p ? `Block ${esc(p.name.split(' ')[0])} from seeing or accepting my tasks` : 'Contact me by phone about this report'}</span></label>`,
      footer: `<button class="btn btn-danger btn-block" data-submit>${dispute ? 'Raise Dispute' : 'Submit Report'}</button>`,
      onMount(sheet, close) {
        $('[data-submit]', sheet).addEventListener('click', async (e) => {
          const reason = $('input[name=reason]:checked', sheet)?.value;
          const details = $('#rp-d', sheet).value.trim();
          const errs = {};
          if (!reason) errs.reason = 'Choose a reason';
          if (details.length < 10) errs.details = 'Please add at least 10 characters';
          if (showErrors(sheet, errs)) return;
          await U.withLoading(e.currentTarget, 900);
          S().reports.push({ id: uid('r'), person, task, dispute, reason, details, at: Date.now() });
          notify({ icon: 'shield-check', title: dispute ? 'Dispute raised' : 'Report received', text: `Case #${Math.floor(100000 + Math.random() * 900000)} · we'll respond within 24 hours.`, task });
          Store.save(); close();
          U.toast(dispute ? 'Dispute raised. Payment is on hold until it is resolved.' : 'Report submitted. Our Trust & Safety team will review it within 24 hours.');
        });
      },
    });
  }

  function openRating(taskId) {
    const t = getTask(taskId); if (!t) return;
    const other = U.person(t.requester === me() ? t.runner : t.requester);
    let stars = 0;
    U.openSheet({
      title: '',
      body: `<div style="text-align:center;padding:8px 0 4px">${U.avatar(other, 'lg')}
        <h3 style="margin:12px 0 4px;font-size:18px">How was ${esc(other.name.split(' ')[0])}?</h3>
        <p class="meta" style="margin:0 0 14px">${esc(t.title)}</p>
        <div class="star-pick" id="sp">${[1, 2, 3, 4, 5].map((i) => `<button data-star="${i}" aria-label="${i} star">${icon('star')}</button>`).join('')}</div>
        <div class="meta" id="sp-l" style="height:20px;margin-top:6px;font-weight:600"></div></div>
        <div class="chip-row" style="flex-wrap:wrap;justify-content:center;margin:10px 0 14px">${['On time', 'Friendly', 'Careful', 'Good communication'].map((x) => `<button class="chip green" data-tag style="min-height:34px;font-size:12px">${x}</button>`).join('')}</div>
        <textarea class="textarea" id="sp-c" style="min-height:80px" placeholder="Add a comment (optional)"></textarea>`,
      footer: `<button class="btn btn-ghost" data-sheet-close style="flex:1">Later</button><button class="btn btn-green" data-submit style="flex:2">Submit Rating</button>`,
      onMount(sheet, close) {
        const L = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
        sheet.addEventListener('click', (e) => {
          const b = e.target.closest('[data-star]');
          if (b) { stars = +b.dataset.star; $$('[data-star]', sheet).forEach((x) => x.classList.toggle('on', +x.dataset.star <= stars)); $('#sp-l', sheet).textContent = L[stars]; }
          const tag = e.target.closest('[data-tag]'); if (tag) tag.classList.toggle('active');
        });
        $('[data-submit]', sheet).addEventListener('click', () => {
          if (!stars) { U.toast('Tap a star to rate', 'warn', 1500); return; }
          S().ratings[t.id] = stars; Store.save(); close(); refresh();
          U.toast(`Thanks! You rated ${other.name.split(' ')[0]} ${stars} star${stars > 1 ? 's' : ''}.`);
        });
      },
    });
  }

  /* ======================================================================
     GLOBAL EVENTS
     ====================================================================== */
  function bindGlobal() {
    const app = $('#app');
    app.addEventListener('click', (e) => {
      const el = (sel) => e.target.closest(sel);
      let n;
      if ((n = el('[data-back]'))) { Router.back(); return; }
      if ((n = el('[data-nav-create]'))) { Router.go('create'); return; }
      if ((n = el('[data-nav]'))) {
        const v = n.dataset.nav;
        if (v === 'create') Router.go('create', {}, { anim: 'fade' });
        else if (Router.stack.length === 1 && Router.top().name === v) currentEl?.scrollTo({ top: 0, behavior: 'smooth' });
        else Router.tab(v);
        return;
      }
      if ((n = el('[data-create]'))) { Router.go('create', { type: n.dataset.create }); return; }
      if ((n = el('[data-go-replace]'))) { Router.go(n.dataset.goReplace, { id: n.dataset.id }, { replace: true, anim: 'fade' }); return; }
      if ((n = el('[data-go]'))) { Router.go(n.dataset.go, n.dataset.id ? { id: n.dataset.id } : {}); return; }
      if ((n = el('[data-activity]'))) {
        const t = getTask(n.dataset.activity);
        Router.go(t && t.runner && t.status !== 'open' && t.status !== 'cancelled' ? 'tracking' : 'task', { id: n.dataset.activity });
        return;
      }
      if ((n = el('[data-open-task]'))) { Router.go('task', { id: n.dataset.openTask }); return; }
      if ((n = el('[data-txn]'))) { openTxnDetail(n.dataset.txn); return; }
      const act = el('[data-action]')?.dataset.action;
      if (act === 'pick-location') openLocationPicker();
      if (act === 'home-filter') Router.tab('explore', { openFilters: true });
      if (act === 'find-route') Router.tab('explore', { segment: 'route' });
    });

    /* Keyboard access for role=button cards */
    app.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button],[role=radio]') && e.target.tagName !== 'BUTTON') { e.preventDefault(); e.target.click(); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !U.closeTopSheet()) { /* nothing open */ }
    });
  }

  /* Two windows on the same browser share data: keep this tab in sync when the other one saves. */
  const LIVE_SCREENS = new Set(['home', 'explore', 'activity', 'task', 'tracking', 'wallet', 'transactions', 'notifications', 'profile', 'published', 'reviews']);
  function bindLiveSync() {
    window.addEventListener('storage', (e) => {
      if (e.key !== KEY || !e.newValue) return;
      const before = unreadSafe();
      if (!Store.reload(e.newValue)) return;
      if (Store.session && !Store.state.users[Store.session]) { Store.setSession(null); Router.stack = [{ name: 'welcome', params: {} }]; render('fade'); return; }
      liveHooks.forEach((fn) => { try { fn(); } catch (err) { /* sheet closed */ } });
      if (LIVE_SCREENS.has(Router.top()?.name)) refresh();
      const after = unreadSafe();
      if (S().loggedIn && after > before) {
        const n = S().notifications.find((x) => !x.read);
        if (n) U.toast(n.title + (n.text ? ' — ' + n.text : ''), 'info', 3200);
      }
    });
  }
  const unreadSafe = () => (S().loggedIn ? unread() : 0);

  function tickClock() {
    const c = $('#sb-time');
    if (c) c.textContent = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: false });
  }

  /* ======================================================================
     INIT
     ====================================================================== */
  function init() {
    Store.load();
    bindGlobal();
    bindLiveSync();
    tickClock(); setInterval(tickClock, 20000);
    $('#stage-reset')?.addEventListener('click', async () => {
      const ok = await U.confirmDialog({ title: 'Reset demo data?', message: 'All tasks, wallet activity and settings return to the original sample data.', confirmText: 'Reset', tone: 'danger', ic: 'rotate-ccw' });
      if (ok) resetDemo();
    });
    Router.stack = [{ name: S().loggedIn ? 'home' : 'welcome', params: {} }];
    render('fade');
  }

  window.TaaskarApp = { Router, refresh, getTask };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
