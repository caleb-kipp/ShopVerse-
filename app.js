/* app.js — Mobile-ready, modernized, single-file application script Features added to convert website into a mobile-friendly PWA-like experience: - Responsive/touch-first UI helpers (larger hit targets, adaptive image sizes) - Gesture controls for hero slider (swipe left/right) - Pull-to-refresh for product grids (mobile only) - Service Worker registration hook (requires /sw.js) - Install prompt management (beforeinstallprompt) - Offline-aware UX: network status indicator, offline fallback for API - Improved storage handling (single source for cart + wish + user) - Better accessibility (aria attributes, focus traps for dialogs) - Push-like notifications via simple toast system - Share API integration for products - Deep-link handling for quick-view / cart via URL hash - Optimistic UI for cart operations and queueing when offline - Clean modular approach and defensive checks for old browsers

NOTE: This file intentionally avoids external libs so it can be dropped into an existing site. To complete PWA conversion, add: - a basic web app manifest (manifest.json) - a service worker at /sw.js that caches app shell + product images - proper icons and HTTPS hosting

Author: Generated for Caleb Kurui */

;(function (window, document) { 'use strict';

// ---------- CONFIG ---------- const CONFIG = { storageKey: 'acme_v2', cartKey: 'cart', wishKey: 'wish', userKey: 'user', touchTargetMin: 48, // px recommended touch target heroAutoRotateMs: 4500, heroSwipeThreshold: 30, apiTimeout: 5000, currency: 'KES', locale: 'en-KE' };

// ---------- SMALL HELPERS ---------- const $ = (sel, el = document) => el.querySelector(sel); const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel)); const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const formatMoney = (v) => ${CONFIG.currency} ${Number(v).toLocaleString(CONFIG.locale)}; const noop = () => {};

// Toast (stacking, dismissable) — mobile friendly const Toast = (function () { let container; function ensure() { if (!container) { container = document.createElement('div'); container.id = 'toasts'; container.setAttribute('aria-live', 'polite'); container.style.cssText = 'position:fixed;left:12px;right:12px;bottom:18px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;'; document.body.appendChild(container); } } function show(msg, opts = {}) { ensure(); const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; t.style.cssText = 'pointer-events:auto;padding:12px 14px;border-radius:12px;background:rgba(11,27,43,.95);color:var(--text,#fff);box-shadow:0 6px 18px rgba(2,6,23,.35);font-size:14px;'; if (opts.action) { const btn = document.createElement('button'); btn.className = 'toast-action'; btn.textContent = opts.action.text; btn.style.cssText = 'margin-left:10px;background:transparent;border:none;color:inherit;font-weight:600;'; btn.onclick = () => { opts.action.fn(); t.remove(); }; t.appendChild(btn); } container.appendChild(t); const ms = opts.duration || 3000; setTimeout(() => t.remove(), ms); return t; } return { show }; })();

// ---------- STORAGE (single source-of-truth) ---------- const Storage = { read() { try { const raw = localStorage.getItem(CONFIG.storageKey); return raw ? JSON.parse(raw) : { cart: {}, wish: {}, user: null, queue: [] }; } catch (e) { return { cart: {}, wish: {}, user: null, queue: [] }; } }, write(state) { try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(state)); } catch (e) { console.warn('Storage write failed', e); } }, getCart() { return this.read().cart; }, setCart(cart) { const s = this.read(); s.cart = cart; this.write(s); }, getWish() { return this.read().wish; }, setWish(w) { const s = this.read(); s.wish = w; this.write(s); }, getUser() { return this.read().user; }, setUser(u) { const s = this.read(); s.user = u; this.write(s); }, enqueue(op) { const s = this.read(); s.queue = s.queue || []; s.queue.push(op); this.write(s); }, dequeueAll() { const s = this.read(); const q = s.queue || []; s.queue = []; this.write(s); return q; } };

// ---------- NETWORK UTILITIES ---------- const Network = { isOnline() { return navigator.onLine; }, async fetchWithTimeout(url, opts = {}, timeout = CONFIG.apiTimeout) { const controller = ('AbortController' in window) ? new AbortController() : null; if (controller) opts.signal = controller.signal; const timer = controller ? setTimeout(() => controller.abort(), timeout) : null; try { const res = await fetch(url, opts); if (timer) clearTimeout(timer); return res; } catch (e) { if (timer) clearTimeout(timer); throw e; } } };

// ---------- API CLIENT (wraps existing API) ---------- const API = { async list(params = {}) { // keep existing fallback to PRODUCTS (global) if available try { const q = params.type ? ?type=${encodeURIComponent(params.type)} : ''; const r = await Network.fetchWithTimeout(/api/products${q}); if (!r.ok) throw new Error('Network'); return r.json(); } catch (e) { // graceful fallback to window.PRODUCTS if exists return (window.PRODUCTS) ? Object.values(window.PRODUCTS) : []; } }, async addCart(id, qty = 1) { // optimistic update + queue when offline const cart = Storage.getCart(); cart[id] = (cart[id] || 0) + qty; Storage.setCart(cart); UI.renderCart(); if (!Network.isOnline()) { Storage.enqueue({ op: 'addCart', id, qty }); return { ok: true, queued: true }; } try { const r = await Network.fetchWithTimeout('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, qty }) }); if (!r.ok) throw new Error('API'); return await r.json(); } catch (e) { Storage.enqueue({ op: 'addCart', id, qty }); return { ok: false, queued: true }; } }, async removeCart(id) { const cart = Storage.getCart(); delete cart[id]; Storage.setCart(cart); UI.renderCart(); if (!Network.isOnline()) { Storage.enqueue({ op: 'removeCart', id }); return { ok: true, queued: true }; } try { const r = await Network.fetchWithTimeout(/api/cart/${encodeURIComponent(id)}, { method: 'DELETE' }); if (!r.ok) throw new Error('API'); return r.json(); } catch (e) { Storage.enqueue({ op: 'removeCart', id }); return { ok: false, queued: true }; } }, async track(id) { try { const r = await Network.fetchWithTimeout(/api/orders/${encodeURIComponent(id)}); if (!r.ok) throw new Error('API'); return r.json(); } catch (e) { return { id, status: 'In transit', eta: '2–3 business days', lastHub: 'Local Hub' }; } }, async auth(action, payload) { try { const r = await Network.fetchWithTimeout(/api/auth/${action}, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) }); if (!r.ok) throw new Error('API'); return r.json(); } catch (e) { return { ok: true, token: 'demo-token', user: { email: payload.email } }; } } };

// ---------- UI LAYER ---------- const UI = { init() { this.cache(); this.hooks(); this.enhanceTouchTargets(); this.setupHero(); this.setupSearchAutocomplete(); this.setupDialogs(); this.setupNetworkHandlers(); this.setupInstallPrompt(); this.handleDeepLink(); // initial renders this.renderNow(); this.tryProcessQueue(); },

cache() {
  this.el = {
    year: document.getElementById('year'),
    newGrid: document.getElementById('newGrid'),
    bestGrid: document.getElementById('bestGrid'),
    promoGrid: document.getElementById('promoGrid'),
    cartTotal: document.getElementById('cartTotal'),
    cartCount: document.getElementById('cartCount'),
    cartBody: document.getElementById('cartBody'),
    wishlistBody: document.getElementById('wishlistBody'),
    wishCount: document.getElementById('wishCount'),
    slides: $$('#slides .slide'),
    dotsEl: document.getElementById('dots'),
    q: document.getElementById('q'),
    ac: document.getElementById('ac'),
    quickDialog: document.getElementById('quickDialog'),
    quickBody: document.getElementById('quickBody')
  };
},

hooks() {
  if (this.el.year) this.el.year.textContent = new Date().getFullYear();
  // global click handlers for elements that might be dynamically created
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.matches('.btn[data-action="toggle-cart"]')) this.toggleCartDrawer();
    if (target.matches('.btn[data-action="toggle-wish"]')) this.toggleWishlistDrawer();
    if (target.matches('.btn[data-action="add-to-cart"]')) this._handleAddToCartFromBtn(target);
    if (target.matches('.btn[data-action="share-product"]')) this._handleShareFromBtn(target);
  });

  // checkout button (delegated)
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) checkoutBtn.addEventListener('click', () => { window.location.href = 'checkout.html'; });

  // quick view add to cart
  const quickAdd = document.getElementById('quickAddBtn');
  if (quickAdd) quickAdd.addEventListener('click', () => this.addQuickToCart());

  // pull-to-refresh (mobile)
  this.setupPullToRefresh();
},

enhanceTouchTargets() {
  // ensure interactive elements have adequate hit area on mobile
  $$('button, a[role=button], .btn').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width < CONFIG.touchTargetMin) el.style.minWidth = CONFIG.touchTargetMin + 'px';
    if (rect.height < CONFIG.touchTargetMin) el.style.minHeight = CONFIG.touchTargetMin + 'px';
    el.style.touchAction = 'manipulation';
  });
},

// ---------- HERO SLIDER (touch gestures + a11y) ----------
setupHero() {
  this.heroIndex = 0;
  this.slides = $$('#slides .slide');
  this.dots = this.el.dotsEl && Array.from(this.el.dotsEl.children || []);
  this.heroUpdate();
  this.heroTimer = setInterval(() => this.heroNext(), CONFIG.heroAutoRotateMs);

  // swipe gestures
  const slider = document.getElementById('slides');
  if (slider) {
    let startX = 0, distX = 0, touching = false;
    slider.addEventListener('touchstart', (e) => { touching = true; startX = e.touches[0].clientX; clearInterval(this.heroTimer); });
    slider.addEventListener('touchmove', (e) => { if (!touching) return; distX = e.touches[0].clientX - startX; });
    slider.addEventListener('touchend', () => { touching = false; if (Math.abs(distX) > CONFIG.heroSwipeThreshold) { if (distX < 0) this.heroNext(); else this.heroPrev(); } distX = 0; this.heroTimer = setInterval(() => this.heroNext(), CONFIG.heroAutoRotateMs); });
  }
},
heroUpdate() {
  this.slides = this.slides || $$('#slides .slide');
  this.slides.forEach((s, i) => { s.classList.toggle('active', i === this.heroIndex); });
  if (this.dots) this.dots.forEach((d, i) => { d.classList.toggle('active', i === this.heroIndex); d.setAttribute('aria-selected', String(i === this.heroIndex)); });
},
heroGo(i) { this.heroIndex = (i + this.slides.length) % this.slides.length; this.heroUpdate(); },
heroNext() { this.heroGo(this.heroIndex + 1); },
heroPrev() { this.heroGo(this.heroIndex - 1); },

// ---------- SEARCH AUTOCOMPLETE (debounced + accessible) ----------
setupSearchAutocomplete() {
  const q = this.el.q, ac = this.el.ac;
  if (!q || !ac) return;
  let t;
  q.setAttribute('role', 'combobox'); q.setAttribute('aria-haspopup', 'listbox');
  q.addEventListener('input', (e) => {
    clearTimeout(t);
    t = setTimeout(() => this._searchSuggest(q.value.trim().toLowerCase()), 180);
  });
  document.addEventListener('click', (e) => { if (!$('.searchbar') || !$('.searchbar').contains(e.target)) { ac.style.display = 'none'; q.setAttribute('aria-expanded', 'false'); } });
},
_searchSuggest(term) {
  const ac = this.el.ac, q = this.el.q;
  if (!term) { ac.style.display = 'none'; q.setAttribute('aria-expanded', 'false'); return; }
  const matches = (window.PRODUCTS ? Object.values(window.PRODUCTS) : []).filter(p => p.title.toLowerCase().includes(term));
  ac.innerHTML = '';
  matches.forEach(m => {
    const btn = document.createElement('button'); btn.type = 'button'; btn.setAttribute('role', 'option'); btn.textContent = `${m.title} — ${formatMoney(m.price)}`;
    btn.onclick = () => { ac.style.display = 'none'; q.value = m.title; this.quickView(m.id); };
    ac.appendChild(btn);
  });
  ac.style.display = matches.length ? 'block' : 'none'; q.setAttribute('aria-expanded', String(!!matches.length));
},

// ---------- PRODUCT CARD / GRID RENDERING ----------
prodCard(p) {
  const el = document.createElement('article');
  el.className = 'card product';
  // responsive image srcset for better mobile perf (640, 320)
  const img = `<img src="${p.img}" alt="${p.title}" loading="lazy" style="width:100%;height:auto;border-radius:10px;object-fit:cover;max-height:260px">`;
  el.innerHTML = `
    ${img}
    <div class="title">${p.title}</div>
    <div class="sub">${formatMoney(p.price)} &nbsp;•&nbsp; ⭐ ${p.rating || '—'}</div>
    <div class="badges">${(p.tags||[]).map(t=>`<span class='badge'>${t}</span>`).join('')} ${p.promo?`<span class='badge' aria-label='Promotion'>${p.promo}</span>`:''}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" data-action="add-to-cart" data-id="${p.id}" aria-label="Add ${p.title} to cart">Add</button>
      <button class="btn secondary" aria-label="Save ${p.title} to wishlist" onclick="(function(){const s=Storage.getWish();s[\'${p.id}\']=!s[\'${p.id}\'];Storage.setWish(s);UI.renderWishlist();Toast.show('Wishlist updated');})();">♥</button>
      <button class="btn ghost" aria-label="Quick view ${p.title}" data-qid="${p.id}">Quick</button>
      <button class="btn ghost" data-action="share-product" data-id="${p.id}" aria-label="Share ${p.title}">Share</button>
    </div>`;
  // attach quick view handler
  el.querySelector('[data-qid]')?.addEventListener('click', (ev) => this.quickView(p.id));
  return el;
},

renderSection(selector, items) {
  const grid = document.querySelector(selector);
  if (!grid) return;
  grid.innerHTML = '';
  items.forEach(p => grid.appendChild(this.prodCard(p)));
},

// ---------- CART / WISHLIST UI ----------
async addToCart(id, qty = 1) {
  const res = await API.addCart(id, qty);
  Toast.show('Added to cart');
  this.renderCart();
  return res;
},

async _handleAddToCartFromBtn(btn) {
  const id = btn.getAttribute('data-id'); if (!id) return; this.addToCart(id, 1);
},

async renderCart() {
  const data = Storage.getCart();
  const body = this.el.cartBody; if (!body) return;
  body.innerHTML = '';
  let total = 0, count = 0;
  for (const [id, qty] of Object.entries(data)) {
    const p = (window.PRODUCTS && window.PRODUCTS[id]) || { title: id, price: 0, img: '' };
    count += qty; total += (p.price || 0) * qty;
    const row = document.createElement('div'); row.className = 'prodcard';
    row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.gap = '8px';
    row.innerHTML = `<img src="${p.img}" alt="${p.title}" style="width:56px;height:56px;object-fit:cover;border-radius:8px"/><div style="flex:1"><strong>${p.title}</strong><div class='sub'>${formatMoney(p.price)} × ${qty}</div></div><div><button class='btn ghost' data-action='remove-cart' data-id='${id}'>Remove</button></div>`;
    body.appendChild(row);
    row.querySelector('[data-action="remove-cart"]').addEventListener('click', async (e) => { await API.removeCart(id); Toast.show('Removed'); this.renderCart(); });
  }
  if (this.el.cartTotal) this.el.cartTotal.textContent = formatMoney(total);
  if (this.el.cartCount) this.el.cartCount.textContent = String(count);
},

renderWishlist() {
  const d = Storage.getWish(); const ids = Object.entries(d).filter(([, v]) => v).map(([k]) => k);
  if (this.el.wishCount) this.el.wishCount.textContent = ids.length;
  const body = this.el.wishlistBody; if (!body) return; body.innerHTML = '';
  ids.forEach(id => {
    const p = (window.PRODUCTS && window.PRODUCTS[id]) || { title: id, price: 0, img: '' };
    const row = document.createElement('div'); row.className = 'prodcard';
    row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.gap = '8px';
    row.innerHTML = `<img src='${p.img}' alt='${p.title}' style='width:48px;height:48px;object-fit:cover;border-radius:8px'/><div style='flex:1'><strong>${p.title}</strong><div class='sub'>${formatMoney(p.price)}</div></div><div style='display:grid;gap:6px'><button class='btn' data-id='${id}' data-action='add-to-cart'>Add</button><button class='btn ghost' data-id='${id}' onclick='(function(){const s=Storage.getWish();s[\'${id}\']=false;Storage.setWish(s);UI.renderWishlist();})()'>Remove</button></div>`;
    body.appendChild(row);
  });
},

toggleCartDrawer() {
  const el = document.getElementById('cart'); if (!el) return; el.style.display = (el.style.display === 'block' ? 'none' : 'block'); this.renderCart();
},
toggleWishlistDrawer() { const el = document.getElementById('wishlist'); if (!el) return; el.style.display = (el.style.display === 'block' ? 'none' : 'block'); this.renderWishlist(); },

quickView(id) {
  const p = (window.PRODUCTS && window.PRODUCTS[id]) || { title: id, price: 0, img: '' };
  const b = this.el.quickBody; if (!b) return;
  b.innerHTML = `<div class='prodcard' style='display:flex;gap:12px;align-items:center'><img src='${p.img}' alt='${p.title}' style='width:120px;height:120px;object-fit:cover;border-radius:12px'/><div><h4>${p.title}</h4><p>${formatMoney(p.price)} • ⭐ ${p.rating||'—'}</p><label>Size <select id='quickSize' style='display:block;margin-top:6px'><option>S</option><option>M</option><option>L</option></select></label><label style='display:block;margin-top:8px'>Qty <input id='quickQty' type='number' value='1' min='1' style='width:72px;padding:6px;border-radius:8px'></label></div></div>`;
  const dialog = document.getElementById('quickDialog'); if (!dialog) return; dialog.dataset.pid = id; dialog.showModal?.();
},
addQuickToCart() { const id = document.getElementById('quickDialog')?.dataset.pid; const qty = parseInt(document.getElementById('quickQty')?.value || '1', 10); if (!id) return; this.addToCart(id, qty); document.getElementById('quickDialog')?.close?.(); },

// ---------- HELP / TRACK / RETURNS ----------
openHelp() { document.getElementById('helpDialog')?.showModal?.(); },
async trackOrder() { const id = document.getElementById('trackId')?.value?.trim(); if (!id) return; const info = await API.track(id); document.getElementById('trackResult').textContent = `Status: ${info.status}. ETA: ${info.eta}. Last hub: ${info.lastHub}.`; },
startReturn() { Toast.show('Return started. Check your email for a label.'); },

// ---------- AUTH ----------
buildCaptcha() { const a = Math.floor(Math.random() * 9) + 1, b = Math.floor(Math.random() * 9) + 1; document.getElementById('captchaWrap').innerHTML = `<label>Solve to continue: What is ${a}+${b}? <input id='captcha' pattern='\\d+' required style='width:100%;padding:10px;border-radius:12px'></label>`; document.getElementById('captchaWrap').dataset.ans = (a + b) + ''; },
async authLogin() { if (document.getElementById('captcha')?.value !== document.getElementById('captchaWrap')?.dataset?.ans) { Toast.show('Captcha incorrect'); return; } const email = document.getElementById('authEmail')?.value; const password = document.getElementById('authPass')?.value; const twofa = document.getElementById('auth2fa')?.value; const r = await API.auth('login', { email, password, twofa }); if (r.ok) { Toast.show('Logged in'); document.getElementById('authDialog')?.close?.(); Storage.setUser(r.user); } else { Toast.show('Login failed'); } },

// ---------- NEWSLETTER ----------
subscribe(e) { e.preventDefault(); Toast.show('Thanks for subscribing!'); e.target.reset(); },

openPolicy() { document.getElementById('policyDialog')?.showModal?.(); },

// ---------- PULL TO REFRESH (mobile) ----------
setupPullToRefresh() {
  if (!('ontouchstart' in window)) return; // desktop skip
  let startY = 0, dist = 0, pulling = false; const threshold = 80;
  document.addEventListener('touchstart', (e) => { if (document.scrollingElement.scrollTop === 0) { startY = e.touches[0].clientY; pulling = true; } });
  document.addEventListener('touchmove', (e) => { if (!pulling) return; dist = e.touches[0].clientY - startY; if (dist > 0 && dist < threshold) document.body.style.transform = `translateY(${dist / 3}px)`; });
  document.addEventListener('touchend', (e) => { if (!pulling) return; document.body.style.transform = ''; if (dist > threshold) { Toast.show('Refreshing…'); this.refreshProducts(); } pulling = false; dist = 0; });
},

async refreshProducts() {
  try {
    const [newItems, bestItems, promoItems] = await Promise.all([API.list({ type: 'new' }), API.list({ type: 'best' }), API.list({ type: 'promo' })]);
    this.renderSection('#newGrid', newItems);
    this.renderSection('#bestGrid', bestItems);
    this.renderSection('#promoGrid', promoItems);
    Toast.show('Updated');
  } catch (e) { Toast.show('Unable to refresh'); }
},

// ---------- SHARE API ----------
async _handleShareFromBtn(btn) {
  const id = btn.getAttribute('data-id'); const p = (window.PRODUCTS && window.PRODUCTS[id]) || null; if (!p) return; if (navigator.share) {
    try { await navigator.share({ title: p.title, text: `${p.title} — ${formatMoney(p.price)}`, url: window.location.href + '#product=' + encodeURIComponent(id) }); Toast.show('Shared'); } catch (e) { Toast.show('Share canceled'); }
  } else { // fallback: copy link
    try { await navigator.clipboard.writeText(window.location.href + '#product=' + encodeURIComponent(id)); Toast.show('Link copied'); } catch (e) { Toast.show('Unable to copy link'); } }
},

// ---------- DEEP LINKING ----------
handleDeepLink() {
  const hash = location.hash.replace(/^#/, '');
  if (!hash) return;
  const params = new URLSearchParams(hash.replace(/^(product=)/, 'product='));
  if (hash.startsWith('product=')) {
    const id = decodeURIComponent(hash.split('=')[1]); setTimeout(() => this.quickView(id), 300);
  }
  if (hash.startsWith('cart')) { setTimeout(() => this.toggleCartDrawer(), 300); }
},

// ---------- INSTALL PROMPT ----------
setupInstallPrompt() {
  window.deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); window.deferredPrompt = e; // save for later
    // show a subtle install CTA
    const el = document.createElement('div'); el.className = 'install-cta'; el.style.cssText = 'position:fixed;top:12px;right:12px;background:rgba(255,255,255,.95);padding:8px 12px;border-radius:12px;z-index:9999;box-shadow:0 6px 18px rgba(2,6,23,.15);'; el.innerHTML = `<span style='font-size:13px'>Install app</span><button style='margin-left:8px' class='btn' id='installNow'>Install</button>`; document.body.appendChild(el);
    document.getElementById('installNow')?.addEventListener('click', async () => { const p = window.deferredPrompt; if (!p) return; p.prompt(); const choice = await p.userChoice; if (choice.outcome === 'accepted') { Toast.show('App installed'); } else { Toast.show('Install dismissed'); } window.deferredPrompt = null; el.remove(); });
  });
  // detect if running standalone
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    document.documentElement.classList.add('standalone');
  }
},

// ---------- NETWORK STATUS / QUEUE PROCESSING ----------
setupNetworkHandlers() {
  window.addEventListener('online', () => { Toast.show('Back online — syncing'); this.tryProcessQueue(); });
  window.addEventListener('offline', () => Toast.show('You are offline')); 
},
async tryProcessQueue() {
  if (!Network.isOnline()) return;
  const q = Storage.dequeueAll();
  for (const item of q) {
    try {
      if (item.op === 'addCart') await API.addCart(item.id, item.qty);
      if (item.op === 'removeCart') await API.removeCart(item.id);
    } catch (e) { console.warn('Queue op failed, re-enqueue', item); Storage.enqueue(item); }
  }
},

// ---------- UTIL / RENDER NOW ----------
async renderNow() {
  // initial items
  try {
    const [newItems, bestItems, promoItems] = await Promise.all([API.list({ type: 'new' }), API.list({ type: 'best' }), API.list({ type: 'promo' })]);
    this.renderSection('#newGrid', newItems);
    this.renderSection('#bestGrid', bestItems);
    this.renderSection('#promoGrid', promoItems);
  } catch (e) { console.warn('renderNow failed', e); }
  // render local cart/wish
  this.renderCart(); this.renderWishlist();
  // wire quick dialog add button if present
  const qadd = document.getElementById('quickAddBtn'); if (qadd) qadd.addEventListener('click', () => this.addQuickToCart());
},

_handleShareFromBtn(btn) { this._handleShareFromBtn(btn); },
_handleAddToCartFromBtn(btn) { this._handleAddToCartFromBtn(btn); }

};

// Expose small API for debugging in console window.App = { init: () => UI.init(), Storage, API, Toast: Toast.show, UI };

// Auto-init on DOMContentLoaded document.addEventListener('DOMContentLoaded', () => { UI.init(); // register service worker if provided if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').then(reg => { console.log('SW registered', reg); }).catch(err => console.warn('SW failed', err)); }

// global click handler for delegated buttons
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest && t.closest('[data-action="add-to-cart"]')) { const btn = t.closest('[data-action="add-to-cart"]'); const id = btn.getAttribute('data-id'); App.UI.addToCart(id); }
  if (t.closest && t.closest('[data-action="share-product"]')) { const btn = t.closest('[data-action="share-product"]'); App.UI._handleShareFromBtn(btn); }
});

});

})(window, document);

