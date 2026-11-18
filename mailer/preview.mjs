// Lokale Vorschau der beiden E-Mails mit Beispieldaten:  node preview.mjs
// Schreibt preview/anfrage-intern.html und preview/anfrage-bestaetigung.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { buildMessages, validate } from './src/mail.mjs';

const here = new URL('.', import.meta.url);
const tpl = name => readFileSync(new URL(`templates/${name}.html`, here), 'utf8');

const { data } = validate({
  role: 'Betreiber / Industrie',
  types: ['Sanierung', 'Beschichtung', 'WHG-Fläche'],
  area: '1.000–5.000 m²',
  name: 'Maria Beispiel',
  company: 'Beispiel Logistik GmbH',
  email: 'maria.beispiel@example.com',
  phone: '0671 123 456',
  message: 'Lagerhalle in Bad Kreuznach, ca. 2.400 m².\nRisse und Abplatzungen im Bereich der Ladetore, Staplerverkehr im Dreischichtbetrieb.\nAusführung am liebsten in den Werksferien im August.',
  page: 'https://www.koerper-bodensysteme.de/kontakt/'
});

const env = { MAIL_FROM: 'anfrage@koerper-bodensysteme.de', MAIL_TO: 'info@koerper-bodensysteme.de', SITE_URL: 'https://www.koerper-bodensysteme.de' };
const { intern, bestaetigung } = buildMessages(data, {
  env, templates: { intern: tpl('anfrage-intern'), bestaetigung: tpl('anfrage-bestaetigung') }, logo: { src: '../assets/logo.png' }
});

mkdirSync(new URL('preview/', here), { recursive: true });
writeFileSync(new URL('preview/anfrage-intern.html', here), intern.HTMLPart);
writeFileSync(new URL('preview/anfrage-bestaetigung.html', here), bestaetigung.HTMLPart);
console.log('Betreff intern:      ', intern.Subject);
console.log('Betreff Bestätigung: ', bestaetigung.Subject);
console.log('-> preview/anfrage-intern.html, preview/anfrage-bestaetigung.html');
