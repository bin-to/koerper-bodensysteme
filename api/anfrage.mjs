// Vercel Function: POST /api/anfrage
// Nimmt das Anfrageformular entgegen und versendet über Mailjet (Send API v3.1).
// Zugangsdaten kommen aus den Vercel-Umgebungsvariablen, nie aus dem Frontend.

import { readFileSync } from 'node:fs';
import { validate, isBot, buildMessages } from '../mailer/src/mail.mjs';

const file = p => readFileSync(new URL(`../mailer/${p}`, import.meta.url));
const TEMPLATES = {
  intern: file('templates/anfrage-intern.html').toString('utf8'),
  bestaetigung: file('templates/anfrage-bestaetigung.html').toString('utf8')
};
const LOGO = {
  src: 'cid:logo',
  attachment: { ContentType: 'image/png', Filename: 'logo.png', ContentID: 'logo', Base64Content: file('assets/logo.png').toString('base64') }
};
const MAX_BODY = 20_000;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

/** Nur Anfragen von der eigenen Seite (gleicher Host) oder aus ALLOWED_ORIGINS. */
function originOk(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  try { if (new URL(origin).host === host) return true; } catch (_) { return false; }
  return (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).includes(origin);
}

export async function POST(request) {
  if (!originOk(request)) return json({ ok: false, error: 'origin' }, 403);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ ok: false, error: 'size' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch (_) { return json({ ok: false, error: 'json' }, 400); }

  // Bots bekommen ein "ok", damit sie nicht weiterprobieren – es wird nichts versendet.
  if (isBot(body)) return json({ ok: true, confirmed: true });

  const v = validate(body);
  if (!v.ok) return json(v, 422);

  const env = {
    MAIL_FROM: process.env.MAIL_FROM || 'anfrage@koerper-bodensysteme.de',
    MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || 'Körper Bodensysteme Website',
    MAIL_TO: process.env.MAIL_TO || 'info@koerper-bodensysteme.de',
    MAIL_BCC: process.env.MAIL_BCC || '',
    SITE_URL: process.env.SITE_URL || 'https://www.koerper-bodensysteme.de'
  };
  if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
    console.error('Mailjet-Zugangsdaten fehlen (MJ_APIKEY_PUBLIC / MJ_APIKEY_PRIVATE)');
    return json({ ok: false, error: 'config' }, 500);
  }

  const { intern, bestaetigung } = buildMessages(v.data, { env, templates: TEMPLATES, logo: LOGO });
  const messages = process.env.SEND_CONFIRMATION === 'false' ? [intern] : [intern, bestaetigung];

  let out = {};
  try {
    const res = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${process.env.MJ_APIKEY_PUBLIC}:${process.env.MJ_APIKEY_PRIVATE}`).toString('base64')
      },
      body: JSON.stringify({ Messages: messages, SandboxMode: process.env.MJ_SANDBOX === 'true' }),
      signal: AbortSignal.timeout(8000)
    });
    out = await res.json().catch(() => ({}));
  } catch (err) {
    console.error('Mailjet nicht erreichbar', err);
    return json({ ok: false, error: 'send' }, 502);
  }

  // Entscheidend ist die Mail ans Büro; eine fehlgeschlagene Bestätigung wird nur protokolliert.
  // (Mailjet antwortet mit HTTP 400, sobald eine der Nachrichten scheitert, daher zählt der Status pro Nachricht.)
  const status = (out.Messages || []).map(m => m.Status);
  if (status[0] !== 'success') {
    console.error('Mailjet-Fehler', JSON.stringify(out));
    return json({ ok: false, error: 'send' }, 502);
  }
  if (status[1] && status[1] !== 'success') console.warn('Bestätigung nicht versendet', JSON.stringify(out.Messages[1]));
  return json({ ok: true, confirmed: status[1] === 'success' });
}
