/* Körper Bodensysteme — Startseite */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vh = () => window.innerHeight;

  /* ---------- Header ---------- */
  const header = $('[data-header]');
  const hero = $('[data-hero]') || $('.hero');
  const mobileCta = $('[data-mobile-cta]');
  const contact = $('[data-brief]') || $('.cta-band') || $('.footer');
  let lastY = 0;
  function onScrollHeader() {
    if (document.body.classList.contains('menu-open')) return;   // während das Menü offen ist, nichts umschalten
    const y = window.scrollY;
    const heroEnd = hero.offsetHeight - header.offsetHeight;
    header.classList.toggle('is-solid', y > heroEnd - 1);
    const goingDown = y > lastY && y > heroEnd + 200;
    if (!document.body.classList.contains('menu-open')) header.classList.toggle('is-hidden', goingDown);
    lastY = y;
    if (mobileCta) {
      const cr = contact.getBoundingClientRect();
      mobileCta.classList.toggle('is-on', y > heroEnd * .6 && cr.top > vh() * .9);
    }
  }

  /* ---------- Mobile menu ---------- */
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-mobile-menu]');
  let lockedY = 0;
  function lockScroll(lock) {
    // iOS-sicherer Scroll-Lock: body fixieren und Position merken
    const b = document.body;
    if (lock) {
      lockedY = window.scrollY;
      b.style.position = 'fixed'; b.style.top = `-${lockedY}px`; b.style.left = '0'; b.style.right = '0';
    } else {
      b.style.position = ''; b.style.top = ''; b.style.left = ''; b.style.right = '';
      const html = document.documentElement, prev = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto'; window.scrollTo(0, lockedY); html.style.scrollBehavior = prev;
    }
  }
  function setMenu(open) {
    if (open === !menu.hidden) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    header.classList.remove('is-hidden');
    if (open) {
      menu.hidden = false;
      lockScroll(true);
      document.body.classList.add('menu-open');
      requestAnimationFrame(() => menu.classList.add('is-open'));
    } else {
      menu.classList.remove('is-open');
      document.body.classList.remove('menu-open');
      lastY = lockedY;            // Wiederherstellen der Position zählt nicht als „runterscrollen“
      lockScroll(false);
      header.classList.remove('is-hidden');
      menu.hidden = true;
    }
  }
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => {
    if (!menu.hidden && e.key === 'Escape') { setMenu(false); toggle.focus(); }
    if (!menu.hidden && e.key === 'Tab') {
      // Fokus im Menü halten (Toggle + Menülinks)
      const f = [toggle, ...$$('a', menu)];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  matchMedia('(min-width: 1081px)').addEventListener?.('change', e => { if (e.matches) setMenu(false); });

  /* ---------- Hero parallax ---------- */
  const heroImg = $('.hero-media img');
  function onScrollHero() {
    if (reduce || !heroImg) return;
    const y = window.scrollY;
    if (y < vh() * 1.2) heroImg.style.translate = `0 ${y * -0.18}px`;
  }

  /* ---------- Manifest: words harden ---------- */
  const mText = $('[data-harden]');
  let words = [];
  if (mText) {
    const hlFrom = mText.textContent.trim().split(/\s+/).length - 2; // "tragendes System."
    mText.innerHTML = mText.textContent.trim().split(/\s+/)
      .map((w, i) => `<span class="w${i >= hlFrom ? ' hl' : ''}">${w}</span>`).join(' ');
    words = $$('.w', mText);
  }
  function onScrollManifest() {
    if (!words.length) return;
    const r = mText.getBoundingClientRect();
    const p = reduce ? 1 : clamp((vh() * .82 - r.top) / (r.height + vh() * .25));
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < n));
  }

  /* ---------- Audience tabs ---------- */
  const tabs = $$('[role="tab"]');
  function selectTab(tab, focus) {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    const list = tab.parentElement;
    if (list.scrollWidth > list.clientWidth) {
      list.scrollTo({ left: tab.offsetLeft - list.offsetLeft - 16, behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      const k = e.key;
      let j = null;
      if (k === 'ArrowDown' || k === 'ArrowRight') j = (i + 1) % tabs.length;
      if (k === 'ArrowUp' || k === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      if (k === 'Home') j = 0;
      if (k === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); selectTab(tabs[j], true); }
    });
  });

  /* ---------- Prefill brief from CTAs ---------- */
  $$('[data-prefill-role]').forEach(a => a.addEventListener('click', () => {
    const r = $(`input[name="role"][value="${a.dataset.prefillRole}"]`);
    if (r) r.checked = true;
  }));
  $$('[data-prefill-type]').forEach(a => a.addEventListener('click', () => {
    const c = $(`input[name="type"][value="${a.dataset.prefillType}"]`);
    if (c) c.checked = true;
  }));

  /* ---------- Isometric slab ---------- */
  const svg = $('[data-slab]');
  const NS = 'http://www.w3.org/2000/svg';
  const W = 250, D = 250, C = 0.866, S = 0.5, OX = 250, OY = 168;
  const P = (x, y, z) => [OX + (x - y) * C, OY + (x + y) * S - z];
  const pts = arr => arr.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
  const LAYERS = [
    { name: 'Vorbereiten', label: 'Untergrund', t: 54, top: '#5f625c', l: '#4a4d48', r: '#3a3c38', tex: 'speck' },
    { name: 'Instandsetzen', label: 'Instandsetzung', t: 16, top: '#7b7e78', l: '#62655f', r: '#4f524c', tex: 'crack' },
    { name: 'Aufbauen', label: 'Tragschicht · Beton', t: 34, top: '#a3a49e', l: '#83847e', r: '#6c6d68', tex: 'joints' },
    { name: 'Schützen', label: 'Beschichtung', t: 10, top: '#ee6b01', l: '#c45600', r: '#a34700', tex: 'sheen-o' },
    { name: 'Gestalten', label: 'Sichtbelag', t: 7, top: '#d8d5cd', l: '#b4b1a9', r: '#9b9890', tex: 'sheen' }
  ];
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  let layerEls = [];
  function buildSlab(svg) {
    const layerEls = [];
    const defs = el('defs', {}, svg);
    const sp = el('pattern', { id: 'speck', width: 9, height: 9, patternUnits: 'userSpaceOnUse' }, defs);
    el('circle', { cx: 2, cy: 3, r: .9, fill: 'rgba(255,255,255,.18)' }, sp);
    el('circle', { cx: 7, cy: 7, r: .6, fill: 'rgba(0,0,0,.35)' }, sp);
    el('circle', { cx: 5, cy: 1, r: .5, fill: 'rgba(255,255,255,.12)' }, sp);
    const gs = el('linearGradient', { id: 'sheen', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '0' }, gs);
    el('stop', { offset: '.42', 'stop-color': '#fff', 'stop-opacity': '.0' }, gs);
    el('stop', { offset: '.5', 'stop-color': '#fff', 'stop-opacity': '.55' }, gs);
    el('stop', { offset: '.58', 'stop-color': '#fff', 'stop-opacity': '0' }, gs);
    el('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0' }, gs);

    // ghost outline of the finished stack
    const total = LAYERS.reduce((a, l) => a + l.t, 0);
    const ghost = el('g', { fill: 'none', stroke: 'rgba(251,250,247,.16)', 'stroke-dasharray': '3 4' }, svg);
    el('polygon', { points: pts([P(0, 0, total), P(W, 0, total), P(W, D, total), P(0, D, total)]) }, ghost);
    el('line', { x1: P(W, D, 0)[0], y1: P(W, D, 0)[1], x2: P(W, D, total)[0], y2: P(W, D, total)[1] }, ghost);
    el('line', { x1: P(0, D, 0)[0], y1: P(0, D, 0)[1], x2: P(0, D, total)[0], y2: P(0, D, total)[1] }, ghost);
    el('line', { x1: P(W, 0, 0)[0], y1: P(W, 0, 0)[1], x2: P(W, 0, total)[0], y2: P(W, 0, total)[1] }, ghost);

    // ground shadow
    el('polygon', { points: pts([P(-12, -12, 0), P(W + 30, -12, 0), P(W + 30, D + 30, 0), P(-12, D + 30, 0)]), fill: 'rgba(0,0,0,.35)', filter: 'blur(8px)' }, svg);

    let z = 0;
    LAYERS.forEach((L, i) => {
      const z0 = z, z1 = z + L.t; z = z1;
      const g = el('g', { class: 'layer is-off', 'data-i': i }, svg);
      const shapes = el('g', {}, g);
      el('polygon', { points: pts([P(0, D, z0), P(W, D, z0), P(W, D, z1), P(0, D, z1)]), fill: L.l }, shapes);
      el('polygon', { points: pts([P(W, 0, z0), P(W, D, z0), P(W, D, z1), P(W, 0, z1)]), fill: L.r }, shapes);
      const topPts = pts([P(0, 0, z1), P(W, 0, z1), P(W, D, z1), P(0, D, z1)]);
      el('polygon', { points: topPts, fill: L.top }, shapes);
      if (L.tex === 'speck') {
        el('polygon', { points: topPts, fill: 'url(#speck)' }, shapes);
        el('polygon', { points: pts([P(0, D, z0), P(W, D, z0), P(W, D, z1), P(0, D, z1)]), fill: 'url(#speck)', opacity: .7 }, shapes);
        el('polygon', { points: pts([P(W, 0, z0), P(W, D, z0), P(W, D, z1), P(W, 0, z1)]), fill: 'url(#speck)', opacity: .7 }, shapes);
        // grinding marks
        for (let k = 1; k < 9; k++) {
          const a = P(k * W / 9, 6, z1), b = P(k * W / 9 - 18, D - 6, z1);
          el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'rgba(255,255,255,.07)', 'stroke-width': 3 }, shapes);
        }
      }
      if (L.tex === 'crack') {
        const c = [[30, 60], [80, 78], [112, 120], [150, 128], [190, 176], [236, 190]].map(([x, y]) => P(x, y, z1));
        el('polyline', { points: pts(c), fill: 'none', stroke: '#ee6b01', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, shapes);
        const c2 = [[112, 120], [100, 170], [118, 214]].map(([x, y]) => P(x, y, z1));
        el('polyline', { points: pts(c2), fill: 'none', stroke: '#ee6b01', 'stroke-width': 1.4, 'stroke-linejoin': 'round' }, shapes);
      }
      if (L.tex === 'joints') {
        [1, 2].forEach(k => {
          let a = P(k * W / 3, 0, z1), b = P(k * W / 3, D, z1);
          el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'rgba(20,21,19,.45)', 'stroke-width': 1.2 }, shapes);
          a = P(0, k * D / 3, z1); b = P(W, k * D / 3, z1);
          el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'rgba(20,21,19,.45)', 'stroke-width': 1.2 }, shapes);
        });
      }
      if (L.tex === 'sheen' || L.tex === 'sheen-o') {
        el('polygon', { points: topPts, fill: 'url(#sheen)', opacity: L.tex === 'sheen' ? .9 : .45 }, shapes);
      }
      // highlight edge (top outline)
      el('polygon', { class: 'edge', points: topPts }, g);

      // label
      const anchor = P(W, D * .15, (z0 + z1) / 2);
      const ly = 318 - i * 54;
      const lbl = el('g', { class: 'lbl' }, g);
      el('line', { x1: anchor[0] + 4, y1: anchor[1], x2: 520, y2: ly }, lbl);
      el('circle', { cx: anchor[0] + 2, cy: anchor[1], r: 2.5, fill: '#ee6b01' }, lbl);
      const tn = el('text', { x: 528, y: ly - 4, class: 'lbl-n' }, lbl); tn.textContent = '0' + (i + 1);
      const tl = el('text', { x: 528, y: ly + 12 }, lbl); tl.textContent = L.label;
      layerEls.push(g);
    });
    return layerEls;
  }
  if (svg) layerEls = buildSlab(svg);
  // static slabs on subpages: data-layers="1" or "0,1"
  $$('[data-slab][data-layers]').forEach(sv => {
    const els = sv === svg ? layerEls : buildSlab(sv);
    const act = sv.dataset.layers.split(',').map(Number);
    const top = Math.max(...act);
    els.forEach((g, i) => {
      g.classList.toggle('is-off', i > top);
      g.classList.toggle('is-on', i <= top);
      g.classList.toggle('is-current', act.includes(i));
    });
  });
  const steps = svg && !svg.dataset.layers ? $$('.step') : [];
  const stageNum = $('[data-stage-num]');
  const stageName = $('[data-stage-name]');
  let current = -1;
  function setStep(k) {
    if (k === current) return;
    current = k;
    steps.forEach((s, i) => s.classList.toggle('is-active', i === k));
    layerEls.forEach((g, i) => {
      g.classList.toggle('is-off', i > k);
      g.classList.toggle('is-on', i <= k);
      g.classList.toggle('is-current', i === k);
    });
    if (stageNum) stageNum.textContent = '0' + (k + 1);
    if (stageName) stageName.textContent = LAYERS[k].name;
  }
  function onScrollBuild() {
    if (!steps.length) return;
    // Mobil: kompletter Aufbau statisch, alle Schritte sichtbar (kein Sticky-Scrollytelling)
    if (innerWidth <= 960) { setStep(steps.length - 1); return; }
    const mid = vh() * .5;
    let k = 0;
    steps.forEach((s, i) => { if (s.getBoundingClientRect().top < mid) k = i; });
    setStep(k);
  }

  /* ---------- Projects: horizontal scroll ---------- */
  const hs = $('[data-hscroll]');
  const track = $('[data-track]');
  const prog = $('[data-progress]');
  const hsMQ = matchMedia('(min-width: 861px) and (min-height: 561px)');
  let hsDist = 0;
  function sizeHS() {
    if (!hs) return;
    if (!hsMQ.matches || reduce) { hs.style.height = ''; track.style.transform = ''; hsDist = 0; return; }
    hsDist = Math.max(0, track.scrollWidth - innerWidth);
    hs.style.height = (vh() + hsDist) + 'px';
  }
  function onScrollHS() {
    if (!hsDist) return;
    const r = hs.getBoundingClientRect();
    const p = clamp(-r.top / hsDist);
    track.style.transform = `translate3d(${-p * hsDist}px,0,0)`;
    if (prog) prog.style.transform = `scaleX(${p})`;
  }

  /* ---------- Reveal ---------- */
  const rvTargets = [
    ['.sec-head > *, .projects-head > *', 'rv'],
    ['.principles li, .person, .whg, .contact-intro > *, .co-copy > *, .footer-top, .footer-cols > div', 'rv'],
    ['.co-photo, .brief', 'rv'],
    ['.svc-list li', 'rv'],
    ['.sp-intro-grid > *, .scope-grid li, .process li, .bento-item, .next-list li, .logo-grid li, .ref-body, .ref-media, .engage-copy > *, .engage-photo, .cta-band-grid > div, .sp-system-copy > *, .ref-index', 'rv']
  ];
  rvTargets.forEach(([sel, cls]) => {
    const groups = new Map();
    $$(sel).forEach(n => {
      const parent = n.parentElement;
      const idx = groups.get(parent) || 0; groups.set(parent, idx + 1);
      n.classList.add(cls); n.style.setProperty('--d', (idx * 0.08).toFixed(2) + 's');
    });
  });
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    $$('.rv').forEach(n => io.observe(n));
  } else {
    $$('.rv').forEach(n => n.classList.add('in'));
  }

  /* ---------- Active nav ---------- */
  const navLinks = $$('.nav a');
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['leistungen', 'aufbau', 'projekte', 'unternehmen'].forEach(id => { const n = document.getElementById(id); if (n) so.observe(n); });
  }

  /* ---------- Brief form ---------- */
  const form = $('[data-brief]');
  const msg = $('[data-form-msg]');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    ['name', 'email'].forEach(n => {
      const f = form.elements[n]; const wrap = f.closest('.field');
      const valid = f.value.trim() && (n !== 'email' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value.trim()));
      wrap.classList.toggle('is-invalid', !valid); if (!valid) ok = false;
    });
    const consent = form.elements.consent;
    consent.closest('.consent').classList.toggle('is-invalid', !consent.checked);
    if (!consent.checked) ok = false;
    if (!ok) { msg.textContent = 'Bitte füllen Sie die markierten Felder aus.'; return; }
    const fd = new FormData(form);
    const lines = [
      'Rolle: ' + (fd.get('role') || '–'),
      'Projektart: ' + (fd.getAll('type').join(', ') || '–'),
      'Fläche: ' + (fd.get('area') || '–'),
      '',
      'Name: ' + fd.get('name'),
      'Firma: ' + (fd.get('company') || '–'),
      'E-Mail: ' + fd.get('email'),
      'Telefon: ' + (fd.get('phone') || '–'),
      '',
      fd.get('message') || ''
    ];
    // Fallback ohne Backend: vorbefüllte E-Mail öffnen
    const href = 'mailto:info@koerper-bodensysteme.de?subject=' + encodeURIComponent('Projektanfrage über die Website') + '&body=' + encodeURIComponent(lines.join('\n'));
    window.location.href = href;
    msg.textContent = 'Danke! Ihr E-Mail-Programm öffnet sich mit Ihrer vorbereiteten Anfrage.';
  });


  /* ---------- Prefill from URL (?typ=…&rolle=…) ---------- */
  const qs = new URLSearchParams(location.search);
  if (qs.get('typ')) { const c = $(`input[name="type"][value="${CSS.escape(qs.get('typ'))}"]`); if (c) c.checked = true; }
  if (qs.get('rolle')) { const c = $(`input[name="role"][value="${CSS.escape(qs.get('rolle'))}"]`); if (c) c.checked = true; }

  /* ---------- Nav: current page ---------- */
  const path = location.pathname;
  $$('[data-nav-sub]').forEach(a => {
    if (path.includes(a.dataset.navSub)) { a.classList.add('is-active'); const l = $('[data-nav="leistungen"]'); if (l) l.classList.add('is-active'); }
  });
  [['/dienstleistungen', 'leistungen'], ['/uber-uns', 'uber-uns'], ['/partner', 'partner'], ['/kontakt', 'kontakt']]
    .forEach(([pre, key]) => { if (path.includes(pre + '/')) { const l = $(`[data-nav="${key}"]`); if (l) l.classList.add('is-active'); } });
  // Mobiles Menü: aktuelle Seite markieren
  $$('[data-mm-sub]').forEach(a => { if (path.includes(a.dataset.mmSub)) a.setAttribute('aria-current', 'page'); });
  [['/uber-uns/', 'uber-uns'], ['/partner/', 'partner'], ['/kontakt/', 'kontakt']]
    .forEach(([pre, key]) => { if (path.includes(pre)) { const l = $(`[data-mm="${key}"]`); if (l) l.setAttribute('aria-current', 'page'); } });
  if (!$$('[data-mm-sub][aria-current], [data-mm][aria-current]').length && !/\/(dienstleistungen|impressum|datenschutz|404)\//.test(path)) {
    const h = $('[data-mm="home"]'); if (h) h.setAttribute('aria-current', 'page');
  }

  /* ---------- Consent (Cookie-Einstellungen) ---------- */
  const CKEY = 'kb-consent';
  const box = $('[data-consent-box]');
  const readConsent = () => { try { return JSON.parse(localStorage.getItem(CKEY)); } catch (e) { return null; } };
  const consent = { state: readConsent() };
  function applyConsent() {
    const ok = !!(consent.state && consent.state.media);
    $$('[data-consent-embed="media"]').forEach(el => {
      const has = $('iframe', el);
      if (ok && !has) {
        const f = document.createElement('iframe');
        f.src = el.dataset.src; f.title = el.dataset.title || 'Eingebetteter Inhalt';
        f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade'; f.allowFullscreen = true;
        el.appendChild(f);
        const ph = $('.map-placeholder', el); if (ph) ph.hidden = true;
      } else if (!ok && has) {
        has.remove(); const ph = $('.map-placeholder', el); if (ph) ph.hidden = false;
      }
    });
    const cb = $('[data-consent-cat="media"]'); if (cb) cb.checked = ok;
  }
  function saveConsent(media) {
    consent.state = { v: 1, media: !!media, ts: new Date().toISOString() };
    try { localStorage.setItem(CKEY, JSON.stringify(consent.state)); } catch (e) { /* privater Modus */ }
    applyConsent(); closeConsent();
  }
  function showView(v) { $$('[data-consent-view]', box).forEach(el => { el.hidden = el.dataset.consentView !== v; }); }
  function openConsent(view) { if (!box) return; showView(view || 'main'); box.hidden = false; applyConsent(); }
  function closeConsent() { if (box) box.hidden = true; }
  if (box) {
    $$('[data-consent-accept]', box).forEach(b => b.addEventListener('click', () => saveConsent(true)));
    $$('[data-consent-reject]', box).forEach(b => b.addEventListener('click', () => saveConsent(false)));
    $('[data-consent-settings]', box).addEventListener('click', () => showView('settings'));
    $('[data-consent-save]', box).addEventListener('click', () => saveConsent($('[data-consent-cat="media"]', box).checked));
    if (!consent.state) openConsent('main');
  }
  $$('[data-consent-open]').forEach(b => b.addEventListener('click', () => openConsent('settings')));
  $$('[data-consent-allow="media"]').forEach(b => b.addEventListener('click', () => saveConsent(true)));
  applyConsent();

  /* ---------- Process progress ---------- */
  const proc = $('[data-process]');
  const procItems = proc ? $$('li', proc) : [];
  function onScrollProcess() {
    if (!proc) return;
    const r = proc.getBoundingClientRect();
    const p = reduce ? 1 : clamp((vh() * .75 - r.top) / (r.height * .9 + vh() * .1));
    proc.style.setProperty('--p', p.toFixed(3));
    procItems.forEach((li, i) => li.classList.toggle('is-on', p >= i / procItems.length + .02 || p === 1));
  }

  /* ---------- Lightbox ---------- */
  const gal = $('[data-gallery]');
  if (gal && window.HTMLDialogElement) {
    const items = $$('[data-full]', gal);
    const dlg = document.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.setAttribute('aria-label', 'Bildansicht');
    dlg.innerHTML = '<img alt=""><button class="lb-close" type="button" aria-label="Schließen">✕</button><button class="lb-prev" type="button" aria-label="Vorheriges Bild">←</button><button class="lb-next" type="button" aria-label="Nächstes Bild">→</button><p class="mono lb-count"></p>';
    document.body.appendChild(dlg);
    const img = $('img', dlg), cnt = $('.lb-count', dlg);
    let cur = 0;
    const show = i => {
      cur = (i + items.length) % items.length;
      const it = items[cur];
      img.src = it.dataset.full; img.alt = $('img', it).alt;
      cnt.textContent = `${cur + 1} / ${items.length}`;
    };
    items.forEach((it, i) => it.addEventListener('click', () => { show(i); dlg.showModal(); }));
    $('.lb-close', dlg).addEventListener('click', () => dlg.close());
    $('.lb-prev', dlg).addEventListener('click', () => show(cur - 1));
    $('.lb-next', dlg).addEventListener('click', () => show(cur + 1));
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
  }

  /* ---------- Year ---------- */
  const yr = $('[data-year]'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Loop ---------- */
  let ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      onScrollHeader(); onScrollHero(); onScrollManifest(); onScrollBuild(); onScrollHS(); onScrollProcess();
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { sizeHS(); onScroll(); });
  hsMQ.addEventListener?.('change', () => { sizeHS(); onScroll(); });
  addEventListener('load', () => { sizeHS(); onScroll(); });
  sizeHS(); if (steps.length) setStep(0); onScroll();
})();
