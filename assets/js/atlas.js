/* Projektatlas: Filter, Karte, Kennzahlen und Bildstrecke (Story) */
(() => {
  const root = document.querySelector('[data-atlas]');
  const dataEl = document.getElementById('atlas-data');
  if (!root || !dataEl) return;

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DATA = JSON.parse(dataEl.textContent);
  const BASE = root.dataset.full;                       // /assets/img/referenzen/ (inkl. Unterpfad)
  const P = new Map(DATA.projects.map(p => [p.id, p]));
  const img = (id, n) => `${BASE}${id}/${n}.webp`;
  const fmt = n => n.toLocaleString('de-DE');

  const cards = $$('.ac', root);
  const groups = $$('.ag', root);
  const pins = $$('.pin', root);
  const chips = $$('.af-chip', root);
  const pinOf = new Map();
  pins.forEach(pin => pin.dataset.ids.split(' ').forEach(id => pinOf.set(id, pin)));
  let filter = 'all';
  const visible = p => filter === 'all' || p.group === filter;

  /* ---------- Kennzahlen ---------- */
  const statEls = Object.fromEntries($$('[data-stat]', root).map(el => [el.dataset.stat, el]));
  const current = {};
  Object.keys(statEls).forEach(k => { current[k] = +statEls[k].dataset.to; });
  function countTo(key, to) {
    const el = statEls[key]; if (!el) return;
    const from = current[key] || 0; current[key] = to;
    if (reduce || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 900;
    const step = t => {
      const k = Math.min(1, Math.max(0, (t - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (k < 1 && current[key] === to) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  // Die großen Zahlen sind die Gesamtbilanz; der Filter ändert nur die Zeile darunter
  const noteEls = Object.fromEntries($$('[data-note]', root).map(el => [el.dataset.note, el]));
  function updateStats() {
    const list = DATA.projects.filter(visible);
    if (noteEls.projects) noteEls.projects.textContent = fmt(list.length);
    if (noteEls.area) noteEls.area.textContent = fmt(list.reduce((s, p) => s + p.m2, 0));
  }

  /* ---------- Auftritt ---------- */
  if ('IntersectionObserver' in window && !reduce) {
    root.classList.add('is-armed');
    Object.keys(statEls).forEach(k => { statEls[k].textContent = '0'; current[k] = 0; });
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      if (e.target.matches('.atlas-stats')) Object.keys(statEls).forEach(k => countTo(k, +statEls[k].dataset.to));
      else root.classList.add('is-in');
    }), { threshold: .25 });
    io.observe($('.atlas-stats', root));
    io.observe($('.atlas-svg', root));
    const co = new IntersectionObserver(es => {
      let n = 0;
      es.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.style.setProperty('--d', (n++ * 0.07).toFixed(2) + 's');
        e.target.classList.add('is-in'); co.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    cards.forEach(c => co.observe(c));
  }

  /* ---------- Filter ---------- */
  function setFilter(f) {
    filter = f;
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.filter === f)));
    groups.forEach(g => { g.hidden = !(f === 'all' || g.dataset.group === f); });
    pins.forEach(pin => {
      const on = pin.dataset.ids.split(' ').some(id => visible(P.get(id)));
      pin.classList.toggle('is-off', !on);
      pin.setAttribute('tabindex', on ? '0' : '-1');
      pin.setAttribute('aria-hidden', String(!on));
    });
    closePop();
    updateStats();
    const body = $('.atlas-body', root);
    const top = body.getBoundingClientRect().top;
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 76;
    if (top < header) window.scrollTo({ top: scrollY + top - header - 20, behavior: reduce ? 'auto' : 'smooth' });
  }
  chips.forEach(c => c.addEventListener('click', () => setFilter(c.dataset.filter)));

  /* ---------- Wischbare Reihen (Handy): Punkte unter jeder Reihe ---------- */
  groups.forEach(g => {
    const row = $('.ag-grid', g), items = $$('.ac', row);
    if (items.length < 2) return;
    const dots = document.createElement('div');
    dots.className = 'ag-dots'; dots.setAttribute('aria-hidden', 'true');
    dots.innerHTML = items.map(() => '<i></i>').join('');
    row.after(dots);
    const marks = $$('i', dots);
    let raf = 0;
    const sync = () => {
      raf = 0;
      const left = row.getBoundingClientRect().left + parseFloat(getComputedStyle(row).paddingLeft);
      let best = 0, bd = Infinity;
      items.forEach((it, i) => { const d = Math.abs(it.getBoundingClientRect().left - left); if (d < bd) { bd = d; best = i; } });
      if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 4) best = items.length - 1;
      marks.forEach((m, i) => m.classList.toggle('is-on', i === best));
    };
    row.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(sync); }, { passive: true });
    sync();
  });

  /* ---------- Karte ---------- */
  cards.forEach(c => {
    const pin = pinOf.get(c.dataset.id);
    if (!pin) return;
    c.addEventListener('mouseenter', () => pin.classList.add('is-hot'));
    c.addEventListener('mouseleave', () => pin.classList.remove('is-hot'));
    c.addEventListener('focusin', () => pin.classList.add('is-hot'));
    c.addEventListener('focusout', () => pin.classList.remove('is-hot'));
  });

  const pop = $('.atlas-pop', root);
  const svg = $('.atlas-svg', root);
  let openPin = null;

  // Auf schmalen Bildschirmen in das Projektgebiet zoomen, damit die Punkte groß genug zum Tippen sind
  const vbFull = svg.getAttribute('viewBox'), vbMobile = svg.dataset.vbMobile;
  const narrow = matchMedia('(max-width: 760px)');
  const setVB = () => { closePop(); svg.setAttribute('viewBox', narrow.matches && vbMobile ? vbMobile : vbFull); };
  narrow.addEventListener?.('change', setVB);
  function closePop() {
    if (!openPin) return;
    openPin.classList.remove('is-open'); openPin = null; pop.hidden = true;
  }
  function showPop(pin) {
    if (openPin === pin) { closePop(); return; }
    closePop();
    const ids = pin.dataset.ids.split(' ').filter(id => visible(P.get(id)));
    if (!ids.length) return;
    openPin = pin; pin.classList.add('is-open');
    const places = [...new Set(ids.map(id => P.get(id).place))].join(', ');
    pop.innerHTML = `<div class="ap-h"><span>${places}</span><button type="button" aria-label="Schließen">✕</button></div>
      <ul class="ap-list">${ids.map(id => {
        const p = P.get(id);
        return `<li><a href="#projekt-${id}" data-story="${id}"><img src="${img(id, 'cover')}" alt="">
          <span><b>${p.place}</b><small>${p.client ? p.client + ' · ' : ''}${p.service}</small></span></a></li>`;
      }).join('')}</ul>`;
    const box = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    const s = box.width / vb.width;
    const x = (+pin.dataset.x - vb.x) * s + (box.left - pop.parentElement.getBoundingClientRect().left);
    const y = (+pin.dataset.y - vb.y) * s;
    pop.hidden = false;
    const w = pop.offsetWidth, pw = pop.parentElement.offsetWidth;
    const cx = Math.max(w / 2 + 4, Math.min(pw - w / 2 - 4, x));
    pop.style.left = cx + 'px';
    pop.style.top = y + 'px';
    pop.style.setProperty('--ax', (w / 2 + x - cx) + 'px');
    pop.classList.toggle('is-below', y - pop.offsetHeight - 24 < 0);
    $('.ap-h button', pop).addEventListener('click', closePop);
    $('a', pop).focus({ preventScroll: true });
  }
  pins.forEach(pin => {
    pin.addEventListener('click', e => { e.stopPropagation(); showPop(pin); });
    pin.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showPop(pin); } });
  });
  document.addEventListener('click', e => { if (openPin && !pop.contains(e.target)) closePop(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && openPin) { const p = openPin; closePop(); p.focus(); } });
  setVB();

  /* ---------- Bildstrecke ---------- */
  if (!window.HTMLDialogElement) return;
  const DUR = 5500;
  const st = document.createElement('dialog');
  st.className = 'story';
  st.setAttribute('aria-label', 'Bildstrecke');
  st.innerHTML = `
    <div class="st-bg" aria-hidden="true"></div>
    <div class="st-stage"><img class="st-img" alt=""></div>
    <button class="st-nav st-prev" type="button" aria-label="Vorheriges Bild"><span aria-hidden="true">←</span></button>
    <button class="st-nav st-next" type="button" aria-label="Nächstes Bild"><span aria-hidden="true">→</span></button>
    <div class="st-top">
      <div class="st-bars" aria-hidden="true"></div>
      <div class="st-head">
        <div><p class="st-k"></p><p class="st-t"></p></div>
        <div class="st-tools">
          <button class="st-btn st-pause" type="button" aria-label="Pause"></button>
          <button class="st-btn st-close" type="button" aria-label="Schließen"><svg viewBox="0 0 16 16"><path d="M3.3 2 8 6.7 12.7 2 14 3.3 9.3 8l4.7 4.7-1.3 1.3L8 9.3 3.3 14 2 12.7 6.7 8 2 3.3z"/></svg></button>
        </div>
      </div>
    </div>
    <div class="st-foot">
      <p class="st-cap" aria-live="polite"></p>
      <dl class="st-facts"></dl>
      <div class="st-proj">
        <button class="st-btn st-prev-p" type="button" aria-label="Vorheriges Projekt"><svg viewBox="0 0 16 16"><path d="M10.5 2 12 3.5 7.5 8l4.5 4.5-1.5 1.5-6-6z"/></svg></button>
        <span class="st-cnt"></span>
        <button class="st-next-p" type="button"></button>
      </div>
    </div>`;
  document.body.appendChild(st);
  const el = {
    bg: $('.st-bg', st), img: $('.st-img', st), bars: $('.st-bars', st), k: $('.st-k', st), t: $('.st-t', st),
    cap: $('.st-cap', st), facts: $('.st-facts', st), cnt: $('.st-cnt', st), nextP: $('.st-next-p', st),
    pause: $('.st-pause', st),
  };
  const ICON_PAUSE = '<svg viewBox="0 0 16 16"><path d="M4 2h3v12H4zM9 2h3v12H9z"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 16 16"><path d="M4 2l10 6-10 6z"/></svg>';
  let list = [], pi = 0, ii = 0, paused = false, lastFocus = null;
  if (reduce) st.classList.add('is-still');

  const order = () => cards.filter(c => !c.closest('.ag').hidden).map(c => c.dataset.id);
  const proj = () => P.get(list[pi]);

  function setPaused(v) {
    paused = v;
    st.classList.toggle('is-paused', v);
    el.pause.innerHTML = v ? ICON_PLAY : ICON_PAUSE;
    el.pause.setAttribute('aria-label', v ? 'Abspielen' : 'Pause');
  }

  function renderProject() {
    const p = proj();
    el.k.textContent = `${DATA.groups[p.group]} · ${p.year}`;
    el.t.innerHTML = `${p.place}${p.client ? `<small>${p.client}</small>` : ''}`;
    el.facts.innerHTML = [['Leistung', p.service], ['Fläche', p.area], ['Kategorie', p.cat]]
      .map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
    el.bars.innerHTML = p.alts.map(() => '<span><i></i></span>').join('');
    el.cnt.textContent = `${pi + 1} / ${list.length}`;
    const nx = P.get(list[(pi + 1) % list.length]);
    el.nextP.innerHTML = `<span><small>${pi + 1 < list.length ? 'Nächstes Projekt' : 'Zurück zum Anfang'}</small><b>${nx.place}</b></span><img src="${img(nx.id, 'cover')}" alt="">`;
    el.nextP.setAttribute('aria-label', `Nächstes Projekt: ${nx.place}`);
    history.replaceState(null, '', '#projekt-' + p.id);
  }

  function renderImage() {
    const p = proj();
    const src = img(p.id, ii + 1);
    el.img.classList.remove('is-swap'); void el.img.offsetWidth; el.img.classList.add('is-swap');
    el.img.src = src; el.img.alt = p.alts[ii];
    el.bg.style.backgroundImage = `url("${src}")`;
    el.cap.innerHTML = `<span>${String(ii + 1).padStart(2, '0')} / ${String(p.alts.length).padStart(2, '0')}</span>${p.alts[ii]}`;
    $$('span', el.bars).forEach((b, i) => {
      b.className = i < ii ? 'is-done' : i === ii ? 'is-now' : '';
    });
    const now = $('.is-now i', el.bars);
    if (now) {
      now.style.setProperty('--dur', DUR + 'ms');
      now.addEventListener('animationend', () => { if (!paused) step(1); }, { once: true });
    }
    // Vorladen
    const nextSrc = ii + 1 < p.alts.length ? img(p.id, ii + 2) : img(list[(pi + 1) % list.length], 1);
    new Image().src = nextSrc;
  }

  function goProject(d) {
    if (pi + d >= list.length) { pi = 0; } else if (pi + d < 0) { pi = list.length - 1; } else { pi += d; }
    ii = 0; renderProject(); renderImage();
  }
  function step(d) {
    const n = proj().alts.length;
    if (ii + d >= n) {
      if (pi + 1 < list.length) goProject(1); else { ii = n - 1; setPaused(true); renderImage(); }
      return;
    }
    if (ii + d < 0) { if (pi > 0) { pi--; ii = proj().alts.length - 1; renderProject(); renderImage(); } else { ii = 0; renderImage(); } return; }
    ii += d; renderImage();
  }

  function open(id, from) {
    list = order();
    if (!list.includes(id)) { setFilter('all'); list = order(); }
    pi = Math.max(0, list.indexOf(id)); ii = 0;
    lastFocus = from || document.activeElement;
    setPaused(false);
    closePop();
    renderProject(); renderImage();
    document.documentElement.classList.add('story-open');
    st.showModal();
  }
  function close() { if (st.open) st.close(); }
  st.addEventListener('close', () => {
    document.documentElement.classList.remove('story-open');
    history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  });

  root.addEventListener('click', e => {
    const a = e.target.closest('[data-story]');
    if (!a) return;
    e.preventDefault();
    open(a.dataset.story, a);
  });

  $('.st-close', st).addEventListener('click', close);
  el.pause.addEventListener('click', () => setPaused(!paused));
  el.nextP.addEventListener('click', () => goProject(1));
  $('.st-prev-p', st).addEventListener('click', () => goProject(-1));

  // Tippen, Halten und Wischen
  let down = null, gesture = false;
  st.addEventListener('pointerdown', e => {
    if (e.target.closest('.st-btn, .st-next-p')) return;
    down = { x: e.clientX, y: e.clientY, t: Date.now(), was: paused };
    gesture = false;
    if (!reduce) setPaused(true);
  });
  st.addEventListener('pointerup', e => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y, held = Date.now() - down.t;
    const was = down.was; down = null;
    if (!reduce) setPaused(was);
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { gesture = true; goProject(dx < 0 ? 1 : -1); }
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) { gesture = true; close(); }
    else if (held > 300) gesture = true;
  });
  st.addEventListener('pointercancel', () => { if (down) { setPaused(down.was); down = null; } });
  $('.st-prev', st).addEventListener('click', () => { if (!gesture) step(-1); gesture = false; });
  $('.st-next', st).addEventListener('click', () => { if (!gesture) step(1); gesture = false; });

  st.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goProject(1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goProject(-1); }
    else if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); setPaused(!paused); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && st.open) setPaused(true); });

  // Direktlink: /partner/#projekt-<id>
  const m = location.hash.match(/^#projekt-([\w-]+)$/);
  if (m && P.has(m[1])) open(m[1]);
})();
