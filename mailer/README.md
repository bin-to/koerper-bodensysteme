# Anfrageformular → Mailjet

Das Formular auf `/kontakt/` sendet an die **Vercel Function** [`api/anfrage.mjs`](../api/anfrage.mjs).
Sie prüft die Angaben und verschickt über die Mailjet Send API v3.1:

1. **Benachrichtigung ans Büro** (`templates/anfrage-intern.html`) mit allen Angaben und den Buttons „Antworten“ und „Anrufen“. „Antworten“ geht direkt an den Kunden (Reply-To).
2. **Bestätigung an den Kunden** (`templates/anfrage-bestaetigung.html`) mit Zusammenfassung, nächsten Schritten und Telefonnummern.
   Der Freitext wird darin bewusst nicht wiederholt, damit sich das Formular nicht zum Spam-Versand an fremde Adressen missbrauchen lässt.

Das Logo hängt als eingebettetes Bild (CID) in der Mail und wird nicht aus dem Internet nachgeladen.
So erscheint es auch dort, wo externe Bilder blockiert sind.

| Datei | Inhalt |
|---|---|
| `src/mail.mjs` | Prüfung, Templating, Aufbau der Mailjet-Nachrichten |
| `templates/` | die beiden HTML-Mails |
| `assets/logo.png` | Logo für die Mails (auf dunkler Fläche, damit es auch im Dark Mode lesbar bleibt) |
| `preview.mjs` | lokale Vorschau mit Beispieldaten |

## Vorschau der E-Mails

```
node mailer/preview.mjs
```

Das Skript schreibt `mailer/preview/anfrage-intern.html` und `mailer/preview/anfrage-bestaetigung.html`.

## Einrichtung (einmalig)

1. **Mailjet:** Unter *Senders & Domains* die Domain `koerper-bodensysteme.de` hinzufügen.
   Die angezeigten **SPF**- und **DKIM**-Einträge im DNS eintragen.
   Ohne verifizierte Domain landen die Mails im Spam oder werden abgelehnt.
2. **API-Keys** unter *Account settings → API Key Management* kopieren (Public und Secret Key).
3. **Vercel:** *Project → Settings → Environment Variables* anlegen:

   | Variable | Wert | Pflicht |
   |---|---|---|
   | `MJ_APIKEY_PUBLIC` | Mailjet Public Key | ja |
   | `MJ_APIKEY_PRIVATE` | Mailjet Secret Key (als *Sensitive* markieren) | ja |
   | `MAIL_FROM` | Absender, Standard `anfrage@koerper-bodensysteme.de` | nein |
   | `MAIL_TO` | Empfänger, Standard `info@koerper-bodensysteme.de` | nein |
   | `MAIL_BCC` | Blindkopie der Büro-Benachrichtigung, mehrere Adressen mit Komma getrennt; leer = keine | nein |
   | `SITE_URL` | Standard `https://www.koerper-bodensysteme.de` | nein |
   | `SEND_CONFIRMATION` | `false` schaltet die Bestätigung an Kunden ab | nein |
   | `MJ_SANDBOX` | `true` = Mailjet prüft nur, versendet nichts | nein |
   | `ALLOWED_ORIGINS` | weitere erlaubte Domains, kommagetrennt (die eigene ist immer erlaubt) | nein |

4. Neu deployen. Der Build erkennt Vercel und verbindet das Formular automatisch mit `/api/anfrage`.

Lokal oder auf anderen Hosts bleibt das Formular beim Fallback (vorbefüllte E-Mail), solange `FORM_ENDPOINT` nicht gesetzt ist.

## Testen

- **Ohne Versand:** `MJ_SANDBOX=true` setzen, Formular abschicken. In den Vercel-Logs (*Project → Logs*) sieht man Fehler von Mailjet.
- **Echt:** einmal an je ein Gmail-, Outlook- und iPhone-Postfach schicken und Logo, Buttons und Dark Mode ansehen.

## Schutz vor Spam

- Verstecktes Feld (Honeypot) und Mindestzeit von 3 Sekunden. Bots bekommen „ok“, es wird aber nichts versendet.
- Nur Anfragen von der eigenen Domain, feste Auswahlwerte für Rolle, Projektart und Fläche, Längenbegrenzung aller Felder.
- Optional: in Vercel unter *Firewall → Rules* ein Rate Limit für `/api/anfrage` setzen, z. B. 5 Anfragen pro Minute und IP.

## Datenschutz

Die Datenschutzerklärung nennt Vercel (Hosting, Abschnitt 3) und, sobald das Formular über Vercel läuft, Mailjet als Versanddienst.
Mit beiden Anbietern einen AV-Vertrag (DPA) abschließen; beide stellen ihn online bereit. Die Texte vor dem Livegang juristisch prüfen lassen.
