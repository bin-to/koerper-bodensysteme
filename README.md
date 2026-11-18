# Körper Bodensysteme – Website

Statische Website mit einem kleinen Python-Builder ohne Abhängigkeiten.

```
python build.py                      # baut nach ./dist
python -m http.server 5173 -d dist   # lokale Vorschau
```

| Ordner | Inhalt |
|---|---|
| `src/layout.html` | Dokument-Gerüst |
| `src/partials/` | Header, Footer, CTA-Band |
| `src/pages/` | Startseite, Partnerseite |
| `src/templates/leistung.html` | Vorlage für alle Leistungsseiten |
| `src/data/leistungen.json` | Texte der fünf Leistungen |
| `src/data/partner.json` | Systempartner und Referenzen |
| `assets/` | CSS, JS, Bilder, Logos |
| `api/anfrage.mjs` | Vercel Function für das Anfrageformular |
| `mailer/` | Mailjet-Versand: Logik, HTML-E-Mails, Vorschau, siehe `mailer/README.md` |
| `_source/` | Rohmaterial (Original-Downloads), wird nicht veröffentlicht |

Neue Referenz: Eintrag in `src/data/partner.json` ergänzen (`references` = ausführlich, `projects` = Kachel mit Galerie; Bilder unter `assets/img/referenzen/<id>/` als `cover.webp` + `1.webp` …) und `python build.py` ausführen.

## SEO & KI

- Titel, Beschreibung, Canonical, Open Graph und strukturierte Daten (schema.org, JSON-LD) erzeugt `src/seo.py` beim Build.
- Der Build schreibt zusätzlich `sitemap.xml`, `robots.txt` und `llms.txt` (Kurzfassung für KI-Assistenten).
- Social-Vorschaubilder (1200×630) nach neuen Hero-Bildern neu erzeugen: `python tools/make_og.py` (benötigt Pillow).
- Seitentitel einer Leistung lassen sich in `leistungen.json` über `seo_title` anpassen.

## Hosting (Vercel)

Die Seite wird auf Vercel gehostet. `vercel.json` legt Build (`python3 build.py`) und Ausgabeordner (`dist`) fest.
Das Anfrageformular läuft über die Function `api/anfrage.mjs` und Mailjet; Einrichtung siehe `mailer/README.md`.

## Vorschau (GitHub Pages)

Jeder Push auf `main` baut die Seite per GitHub Actions (`.github/workflows/pages.yml`) und veröffentlicht sie.
Die Vorschau unter `https://<user>.github.io/<repo>/` wird mit `BASE_PATH=/<repo>` gebaut und ist auf `noindex` gestellt.
Lokal mit Unterpfad testen: `BASE_PATH=/koerper-bodensysteme PREVIEW=1 python build.py`.
Für die echte Domain später ohne `BASE_PATH` und ohne `PREVIEW` bauen.
