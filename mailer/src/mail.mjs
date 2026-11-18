// Aufbereitung der Anfrage: Prüfen, E-Mails rendern, Mailjet-Nachrichten bauen.
// Wird von der Vercel Function (api/anfrage.mjs) und der lokalen Vorschau (preview.mjs) genutzt.

export const ROLES = ['Betreiber / Industrie', 'Generalunternehmer / Bauträger', 'Architekt / Planer', 'Privat / Gewerbe'];
export const TYPES = ['Sanierung', 'Neuer Industrieboden', 'Beschichtung', 'Sichtbelag', 'Fugen / Schleifen', 'WHG-Fläche'];
export const AREAS = ['bis 200 m²', '200–1.000 m²', '1.000–5.000 m²', 'über 5.000 m²'];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
const oneLine = (s, max) => clean(s, max).replace(/\s+/g, ' ');

/** Minimal-Templating: {{x}} escaped, {{{x}}} roh, {{#x}}…{{/x}} nur wenn x gesetzt. */
export function render(tpl, ctx) {
  return tpl
    .replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, k, inner) => (ctx[k] && (!Array.isArray(ctx[k]) || ctx[k].length) ? inner : ''))
    .replace(/\{\{\{(\w+)\}\}\}/g, (_, k) => ctx[k] ?? '')
    .replace(/\{\{(\w+)\}\}/g, (_, k) => esc(ctx[k]));
}

/** Prüft und normalisiert die Formulardaten. Gibt { ok, data } oder { ok:false, error } zurück. */
export function validate(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'invalid' };
  const data = {
    role: ROLES.includes(body.role) ? body.role : '',
    types: Array.isArray(body.types) ? [...new Set(body.types.filter(t => TYPES.includes(t)))] : [],
    area: AREAS.includes(body.area) ? body.area : '',
    name: oneLine(body.name, 120),
    company: oneLine(body.company, 160),
    email: oneLine(body.email, 200).toLowerCase(),
    phone: oneLine(body.phone, 40).replace(/[^\d+()\/\s-]/g, ''),
    message: clean(body.message, 5000),
    page: oneLine(body.page, 300)
  };
  if (!data.name) return { ok: false, error: 'name' };
  if (!/^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]{2,}$/.test(data.email)) return { ok: false, error: 'email' };
  return { ok: true, data };
}

/** Bot-Erkennung: Honeypot gefüllt oder Formular unrealistisch schnell abgeschickt. */
export const isBot = body => Boolean(body && (body.website || Number(body.elapsed) < 3000));

const LBL = 'font-family:\'Barlow Condensed\',\'Arial Narrow\',Arial,sans-serif;font-size:13px;line-height:18px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#8b8d86;';
const VAL = 'font-family:\'Barlow\',Arial,sans-serif;font-size:16px;line-height:23px;color:#141513;';

function row(label, valueHtml, last) {
  const bd = last ? '' : 'border-bottom:1px solid #dcd9d1;';
  return `<tr><td class="lbl" width="150" valign="top" style="width:150px;padding:14px 16px 14px 0;${bd}${LBL}">${esc(label)}</td>`
    + `<td class="val" valign="top" style="padding:13px 0;${bd}${VAL}">${valueHtml}</td></tr>`;
}

function chips(list) {
  return list.map(t => `<span style="display:inline-block;margin:2px 6px 4px 0;padding:4px 11px 3px;border:1px solid #141513;font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:14px;line-height:18px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#141513;">${esc(t)}</span>`).join('');
}

const telHref = p => 'tel:' + p.replace(/[^\d+]/g, '').replace(/^0(?=[1-9])/, '+49');
const nl2br = s => esc(s).replace(/\r?\n/g, '<br>');

function rows(entries) {
  const list = entries.filter(([, v]) => v);
  return list.map(([l, v], i) => row(l, v, i === list.length - 1)).join('\n');
}

/**
 * Baut die beiden Mailjet-Nachrichten (an das Büro + Bestätigung an den Absender).
 * opts: { env, templates: { intern, bestaetigung }, logo: { src, attachment? }, now? }
 */
export function buildMessages(data, { env, templates, logo, now = new Date() }) {
  const site = (env.SITE_URL || 'https://www.koerper-bodensysteme.de').replace(/\/$/, '');
  const date = new Intl.DateTimeFormat('de-DE', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Berlin' }).format(now) + ' Uhr';
  const brief = [
    ['Sie sind', data.role && esc(data.role)],
    ['Es geht um', data.types.length && chips(data.types)],
    ['Fläche ca.', data.area && esc(data.area)]
  ];
  let pageLabel = site.replace(/^https?:\/\//, '');
  try { const u = new URL(data.page); pageLabel = u.host + u.pathname; } catch (_) { /* Seite unbekannt */ }

  // --- an das Büro
  const subjectBits = [data.company, data.types.join(', ') || null, data.area || null].filter(Boolean);
  const intern = {
    From: { Email: env.MAIL_FROM, Name: env.MAIL_FROM_NAME || 'Körper Bodensysteme Website' },
    To: [{ Email: env.MAIL_TO, Name: 'Körper Bodensysteme' }],
    ReplyTo: { Email: data.email, Name: data.name },
    Subject: `Projektanfrage: ${data.name}${subjectBits.length ? ' · ' + subjectBits.join(' · ') : ''}`,
    TextPart: [
      'Neue Projektanfrage über die Website', date, '',
      'Sie sind: ' + (data.role || '–'), 'Es geht um: ' + (data.types.join(', ') || '–'), 'Fläche ca.: ' + (data.area || '–'), '',
      'Name: ' + data.name, 'Firma: ' + (data.company || '–'), 'E-Mail: ' + data.email, 'Telefon: ' + (data.phone || '–'), '',
      'Ort und Beschreibung:', data.message || '–', '', 'Seite: ' + (data.page || '–')
    ].join('\n'),
    HTMLPart: render(templates.intern, {
      preheader: [data.types.join(', '), data.area, data.message.slice(0, 90)].filter(Boolean).join(' · ') || 'Neue Anfrage über die Website',
      logo_src: logo.src,
      name: data.name, company: data.company, email: data.email, phone: data.phone, date,
      reply_href: `mailto:${data.email}?subject=${encodeURIComponent('Ihre Anfrage bei Körper Bodensysteme')}`,
      phone_href: data.phone ? telHref(data.phone) : '',
      rows_html: rows([
        ...brief,
        ['Name', esc(data.name)],
        ['Firma', data.company && esc(data.company)],
        ['E-Mail', `<a href="mailto:${esc(data.email)}" style="color:#c45600;">${esc(data.email)}</a>`],
        ['Telefon', data.phone && `<a href="${esc(telHref(data.phone))}" style="color:#141513;text-decoration:none;">${esc(data.phone)}</a>`]
      ]),
      message: data.message, message_html: nl2br(data.message),
      page: data.page || site, page_label: pageLabel
    }),
    CustomID: 'anfrage-intern'
  };

  // --- Bestätigung an den Absender (bewusst ohne Freitext, damit das Formular nicht als Spam-Schleuder taugt)
  const briefRows = rows(brief);
  const bestaetigung = {
    From: { Email: env.MAIL_FROM, Name: 'Körper Bodensysteme' },
    To: [{ Email: data.email, Name: data.name }],
    ReplyTo: { Email: env.MAIL_TO, Name: 'Körper Bodensysteme' },
    Subject: 'Ihre Anfrage bei Körper Bodensysteme',
    TextPart: [
      `Guten Tag ${data.name},`, '',
      'Ihre Projektanfrage ist bei uns angekommen. Wir melden uns in der Regel innerhalb eines Werktags persönlich bei Ihnen.', '',
      'So geht es weiter:', '01 Rückmeldung durch einen Projektleiter', '02 Besichtigung vor Ort', '03 Konzept & Angebot', '',
      'Es eilt? 06754 690 3950 (Mo–Fr 08–12 und 13–17 Uhr)', '',
      'Viele Grüße aus Merxheim', 'Ihr Team von Körper Bodensysteme', '',
      'Körper Bodensysteme · Albachstraße 1 · 55627 Merxheim · info@koerper-bodensysteme.de', site
    ].join('\n'),
    HTMLPart: render(templates.bestaetigung, {
      preheader: 'Danke! Wir melden uns in der Regel innerhalb eines Werktags persönlich bei Ihnen.',
      logo_src: logo.src, site_url: site, name: data.name,
      has_brief: Boolean(briefRows), rows_html: briefRows
    }),
    CustomID: 'anfrage-bestaetigung'
  };

  if (logo.attachment) {
    intern.InlinedAttachments = [logo.attachment];
    bestaetigung.InlinedAttachments = [logo.attachment];
  }
  return { intern, bestaetigung };
}
