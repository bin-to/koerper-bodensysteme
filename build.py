"""
Körper Bodensysteme – statischer Site-Builder (ohne Abhängigkeiten).

    python build.py          baut die Website nach ./dist

Struktur:
    src/layout.html            Dokument-Gerüst (head, header, footer, Cookie-Hinweis)
    src/partials/*.html        wiederverwendbare Bausteine
    src/pages/*.html           Einzelseiten
    src/templates/*.html       Vorlage für die Leistungsseiten
    src/data/*.json            Inhalte (Leistungen, Partner, Referenzen)
    src/seo.py                 Meta-Daten, strukturierte Daten, Sitemap, robots.txt, llms.txt
    assets/                    CSS, JS, Schriften, Bilder, Marke
"""
import html
import json
import os
import re
import shutil
import sys
import time
from pathlib import Path
from urllib.parse import urlencode

sys.path.insert(0, str(Path(__file__).parent / "src"))
import seo  # noqa: E402

ROOT = Path(__file__).parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
VERSION = str(int(time.time()))

# Unterpfad für Hosting unter einem Ordner, z. B. GitHub Pages: BASE_PATH=/koerper-bodensysteme
BASE = os.environ.get("BASE_PATH", "").rstrip("/")
# Vorschau-Build (z. B. github.io): nicht indexieren, damit Google nur die echte Domain listet
PREVIEW = os.environ.get("PREVIEW") == "1"


def with_base(doc):
    """Stellt allen root-relativen Links und Quellen den Unterpfad voran."""
    if not BASE:
        return doc
    return re.sub(r'(\s(?:href|src|data-full)=")/(?!/)', rf"\1{BASE}/", doc)


def read(p):
    return (SRC / p).read_text(encoding="utf-8")


def render(tpl, ctx):
    def sub(m):
        key = m.group(1).strip()
        if key not in ctx:
            raise KeyError(f"Platzhalter fehlt: {key}")
        return str(ctx[key])
    return re.sub(r"\{\{\s*([\w.]+)\s*\}\}", sub, tpl)


esc = lambda s: html.escape(s, quote=True)

LEIST = json.loads(read("data/leistungen.json"))
ITEMS = LEIST["items"]
PARTNER = json.loads(read("data/partner.json"))
PAGES = []  # (path, priority) für die Sitemap


def svc_url(it):
    return f"/dienstleistungen/{it['slug']}/"


def contact_href(typ=None, rolle=None):
    q = {k: v for k, v in (("typ", typ), ("rolle", rolle)) if v}
    return "/kontakt/" + ("?" + esc(urlencode(q)) if q else "")


# ---------------------------------------------------------------- shared
def subnav():
    return "\n".join(
        f'              <a href="{svc_url(it)}" data-nav-sub="{it["slug"]}">'
        f'<span class="subnav-nr">{it["nr"]}</span><span>{esc(it["nav"])}</span>'
        f'<img src="/assets/img/leistungen/{it["slug"]}/hero.webp" alt="" loading="lazy"></a>'
        for it in ITEMS
    )


def mobile_subnav():
    return "\n".join(
        f'              <li><a href="{svc_url(it)}" data-mm-sub="{it["slug"]}">{esc(it["nav"])}</a></li>'
        for it in ITEMS
    )


def footer_services():
    return "\n".join(f'          <a href="{svc_url(it)}">{esc(it["nav"])}</a>' for it in ITEMS)


def cta_band(title="Sprechen wir über Ihre Fläche.", text=None, href="/kontakt/", label="Ihr Projekt"):
    text = text or ("Erzählen Sie uns, worum es geht. Wir melden uns persönlich und vereinbaren "
                    "bei Bedarf einen Termin vor Ort.")
    return render(read("partials/cta-band.html"), {
        "cta_label": label, "cta_title": title, "cta_text": text, "cta_href": href,
    })


def process_items():
    return "\n".join(
        f'          <li><span class="process-n">Schritt {i + 1}</span><span class="process-dot" aria-hidden="true"></span>'
        f'<h3 class="h4">{esc(p["t"])}</h3><p>{esc(p["d"])}</p></li>'
        for i, p in enumerate(LEIST["process"])
    )


def page(path, title, description, content, body_class="", og_image="/assets/img/hero.webp",
         cta_href="/kontakt/", og_card="/assets/og/home.jpg", og_title=None, schema="",
         priority="0.5", index=True):
    header = render(read("partials/header.html"), {
        "subnav": subnav(), "mobile_subnav": mobile_subnav(), "cta_href": cta_href,
    })
    footer = render(read("partials/footer.html"), {"footer_services": footer_services()})
    doc = render(read("layout.html"), {
        "title": esc(title), "description": esc(description), "path": path, "site": seo.SITE,
        "robots": "noindex, nofollow" if PREVIEW else
                  ("index, follow, max-image-preview:large, max-snippet:-1" if index else "noindex, follow"),
        "og_image": og_image, "og_card": og_card, "og_title": esc(og_title or title), "schema": schema,
        "body_class": body_class, "version": VERSION, "header": header, "footer": footer,
        "content": content, "cta_href": cta_href, "cookie": read("partials/cookie.html"),
    })
    out = DIST / path.strip("/") / "index.html" if path != "/" else DIST / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(with_base(doc), encoding="utf-8")
    if index:
        PAGES.append((path, priority))
    print("  ok", path)


# ---------------------------------------------------------------- home
def services_list():
    rows = []
    for it in ITEMS:
        rows.append(f"""          <li>
            <a href="{svc_url(it)}">
              <span class="svc-n">{it["nr"]}</span>
              <span class="svc-img" aria-hidden="true"><img src="/assets/img/leistungen/{it["slug"]}/hero.webp" alt="" loading="lazy"></span>
              <span class="svc-t">{it["title_html"]}</span>
              <span class="svc-d">{esc(it["short"])}</span>
              <span class="svc-a" aria-hidden="true">→</span>
            </a>
          </li>""")
    return '<ul class="svc-list" data-svc>\n' + "\n".join(rows) + "\n        </ul>"


def build_home():
    content = render(read("pages/index.html"), {
        "services_list": services_list(),
        "cta_band": cta_band("Sprechen wir über Ihre Fläche.",
                             "Ob Sanierung, Beschichtung oder Neubau: Erzählen Sie uns von Ihrem Vorhaben. "
                             "Wir melden uns persönlich und kommen bei Bedarf vor Ort vorbei."),
    })
    title = "Körper Bodensysteme | Industrie- & Betonbodensanierung, Merxheim"
    desc = ("Industrie- und Betonbodensanierung, Bodenbeschichtung, Sichtbeläge und Industrieböden aus Beton. "
            "WHG-Fachbetrieb aus Merxheim – bundesweit im Einsatz.")
    page("/", title, desc, content, body_class="page-home", og_title="Körper Bodensysteme – Böden, die tragen.",
         schema=seo.home_schema(ITEMS, svc_url, title, desc), priority="1.0")


# ---------------------------------------------------------------- leistungen
def build_overview():
    cards = []
    for i, it in enumerate(ITEMS):
        scope = " · ".join(s["t"] for s in it["scope"][:3])
        cards.append(f"""          <a class="svc-card c{i + 1}" href="{svc_url(it)}">
            <span class="svc-card-img"><img src="/assets/img/leistungen/{it["slug"]}/hero.webp" alt="" loading="lazy"></span>
            <span class="svc-card-body">
              <span class="svc-card-nr">{it["nr"]}</span>
              <span class="svc-card-t">{esc(it["title"])}</span>
              <span class="svc-card-d">{esc(it["short"])}</span>
              <span class="svc-card-scope">{esc(scope)}</span>
              <span class="svc-card-more">Mehr erfahren <span aria-hidden="true">→</span></span>
            </span>
          </a>""")
    content = render(read("pages/dienstleistungen.html"), {
        "service_cards": "\n".join(cards), "process": process_items(), "cta_band": cta_band(),
    })
    title = "Leistungen im Überblick | Körper Bodensysteme"
    desc = ("Bodensanierung, Fugen- und Diamantschleifarbeiten, Beschichtung, Sichtbeläge und "
            "Industrieböden aus Beton: alle Leistungen im Überblick.")
    page("/dienstleistungen/", title, desc, content, body_class="page-sub page-overview",
         og_image="/assets/img/leistungen/industrie-und-betonbodensanierung/hero.webp",
         og_card="/assets/og/industrie-und-betonbodensanierung.jpg", priority="0.9",
         schema=seo.collection_schema("/dienstleistungen/", title, desc, "Leistungen",
                                      [(it["title"], svc_url(it)) for it in ITEMS]))


def build_leistungen():
    tpl = read("templates/leistung.html")
    for idx, it in enumerate(ITEMS):
        href = contact_href(it["prefill"])
        highlights = "\n".join(
            f'        <li><b>0{i + 1}</b><span>{esc(h)}</span></li>' for i, h in enumerate(it["highlights"])
        )
        scope = "\n".join(
            f'          <li><span class="scope-nr">{str(i + 1).zfill(2)}</span><h3 class="h4">{esc(s["t"])}</h3><p>{esc(s["d"])}</p></li>'
            for i, s in enumerate(it["scope"])
        )
        areas = "\n".join(f"              <li>{esc(a)}</li>" for a in it["areas"])
        gallery = "\n".join(
            f'          <button class="bento-item b{i + 1}" type="button" data-full="/assets/img/leistungen/{it["slug"]}/{i + 1}.webp" aria-label="Bild vergrößern: {esc(alt)}">'
            f'<img src="/assets/img/leistungen/{it["slug"]}/{i + 1}.webp" alt="{esc(alt)}" loading="lazy"></button>'
            for i, alt in enumerate(it["gallery_alt"])
        )
        others = "\n".join(
            f'          <li><a href="{svc_url(o)}"><span class="next-nr">{o["nr"]}</span>'
            f'<span class="next-img" aria-hidden="true"><img src="/assets/img/leistungen/{o["slug"]}/hero.webp" alt="" loading="lazy"></span>'
            f'<span class="next-t">{esc(o["nav"])}</span><span class="next-a" aria-hidden="true">→</span></a></li>'
            for o in ITEMS[idx + 1:] + ITEMS[:idx]
        )
        content = render(tpl, {
            **{k: it[k] for k in ("slug", "nr", "nav", "h1", "lead", "intro_head", "problem", "solution", "layer_note")},
            "layers": ",".join(map(str, it["layers"])),
            "highlights": highlights, "scope": scope, "process": process_items(), "areas": areas,
            "gallery": gallery, "others": others, "cta_href": href, "cta_band": cta_band(href=href),
        })
        title = f"{it.get('seo_title', it['title'])} | Körper Bodensysteme"
        page(svc_url(it), title, it["meta"], content,
             body_class="page-sub page-leistung", og_image=f"/assets/img/leistungen/{it['slug']}/hero.webp",
             cta_href=href, og_card=f"/assets/og/{it['slug']}.jpg", priority="0.8",
             schema=seo.service_schema(it, svc_url(it), title, it["meta"]))


# ---------------------------------------------------------------- referenzen & partner
def build_partner():
    grid = "\n".join(
        f'          <li><a href="{p["url"]}" target="_blank" rel="noopener">'
        f'<span class="logo-box"><img src="/assets/img/partner/{p["logo"]}" alt="{esc(p["name"])}" loading="lazy"></span>'
        f'<span class="logo-meta"><b>{esc(p["name"])}</b><span>{esc(p["cat"])}</span></span>'
        f'<span class="logo-a" aria-hidden="true">↗</span></a></li>'
        for p in PARTNER["partners"]
    )
    by_slug = {it["slug"]: it for it in ITEMS}
    refs, index = [], []
    for n, r in enumerate(PARTNER["references"], 1):
        svc = by_slug[r["service"]]
        facts = "\n".join(f'                <div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>' for k, v in r["facts"])
        imgs = "\n".join(
            f'              <figure class="ref-img ri{i + 1}"><img src="{src}" alt="{esc(alt)}" loading="lazy"></figure>'
            for i, (src, alt) in enumerate(zip(r["images"], r["alts"]))
        )
        index.append(f'          <a href="#ref-{r["id"]}"><span>{n:02d}</span>{esc(r["title"])}</a>')
        refs.append(f"""          <article class="ref" id="ref-{r["id"]}">
            <div class="ref-media">
{imgs}
            </div>
            <div class="ref-body">
              <p class="eyebrow ref-k">Referenz {n:02d} <span class="ref-flag">Beispieltext</span></p>
              <h3 class="h3">{esc(r["title"])}<small>{esc(r["subtitle"])}</small></h3>
              <dl class="ref-facts">
{facts}
              </dl>
              <div class="ref-text">
                <div><p class="sp-k">Ausgangslage</p><p>{esc(r["challenge"])}</p></div>
                <div><p class="sp-k">Lösung</p><p>{esc(r["solution"])}</p></div>
                <div><p class="sp-k sp-k--o">Ergebnis</p><p>{esc(r["result"])}</p></div>
              </div>
              <a class="link-arrow" href="{svc_url(svc)}">Leistung: {esc(svc["nav"])} <span aria-hidden="true">→</span></a>
            </div>
          </article>""")
    content = render(read("pages/partner.html"), {
        "partner_grid": grid, "references": "\n".join(refs), "ref_index": "\n".join(index),
        "cta_band": cta_band("Ihre Fläche als nächste Referenz?",
                             "Ob Sanierung, Beschichtung oder Neubau: Wir beraten Sie gern zu Ihrem Vorhaben.",
                             label="Nächstes Projekt"),
    })
    title = "Referenzen & Partner | Körper Bodensysteme"
    desc = ("Ausgewählte Referenzprojekte und unsere Systempartner wie Sika, StoCretec und KORODUR – "
            "Körper Bodensysteme, Merxheim.")
    page("/partner/", title, desc, content, body_class="page-sub page-partner", og_image="/assets/img/partner/hero.webp",
         og_card="/assets/og/partner.jpg", priority="0.7",
         schema=seo.partner_schema(PARTNER["partners"], title, desc))


# ---------------------------------------------------------------- über uns, kontakt, rechtliches
def build_about():
    content = render(read("pages/uber-uns.html"), {"cta_band": cta_band()})
    title = "Über uns: Familienbetrieb aus Merxheim | Körper Bodensysteme"
    desc = ("Inhabergeführter WHG-Fachbetrieb für Industrie- und Betonböden seit 2015. "
            "Lernen Sie unser Team und Ihre Ansprechpartner kennen.")
    page("/uber-uns/", title, desc, content, body_class="page-sub page-about", og_image="/assets/img/team.webp",
         og_card="/assets/og/home.jpg", priority="0.7",
         schema=seo.simple_schema("/uber-uns/", title, desc, "AboutPage", "Über uns"))


def build_contact():
    content = render(read("pages/kontakt.html"), {"process": process_items()})
    title = "Kontakt & Projektanfrage | Körper Bodensysteme"
    desc = ("Projekt anfragen bei Körper Bodensysteme: Telefon +49 6754 690 3950, info@koerper-bodensysteme.de, "
            "Albachstraße 1, 55627 Merxheim. Wir melden uns persönlich.")
    page("/kontakt/", title, desc, content, body_class="page-sub page-contact",
         og_image="/assets/img/leistungen/herstellen-von-sichtbelagen/hero.webp",
         og_card="/assets/og/herstellen-von-sichtbelagen.jpg", priority="0.8",
         schema=seo.simple_schema("/kontakt/", title, desc, "ContactPage", "Kontakt"))


def build_legal():
    for slug, name, desc in (
        ("impressum", "Impressum", "Impressum von Körper Bodensysteme, Inhaber Christian Körper, Albachstraße 1, 55627 Merxheim."),
        ("datenschutz", "Datenschutzerklärung", "Datenschutzerklärung von Körper Bodensysteme: welche Daten wir verarbeiten und welche Rechte Sie haben."),
    ):
        page(f"/{slug}/", f"{name} | Körper Bodensysteme", desc, read(f"pages/{slug}.html"),
             body_class="page-sub page-legal", priority="0.2",
             schema=seo.simple_schema(f"/{slug}/", name, desc, "WebPage", name))


def build_404():
    content = """    <section class="legal-hero legal-hero--404" id="top" data-hero>
      <div class="wrap">
        <p class="eyebrow">Fehler 404</p>
        <h1 class="page-title page-title--legal">Diese Seite gibt es nicht<em>.</em></h1>
        <p class="hero-lead">Vielleicht wurde sie verschoben. Hier geht es weiter:</p>
        <div class="hero-actions">
          <a class="btn btn-orange" href="/">Zur Startseite <span class="arr" aria-hidden="true">→</span></a>
          <a class="btn btn-ghost" href="/dienstleistungen/">Leistungen</a>
          <a class="btn btn-ghost" href="/kontakt/">Kontakt</a>
        </div>
      </div>
    </section>"""
    page("/404/", "Seite nicht gefunden | Körper Bodensysteme", "Diese Seite wurde nicht gefunden.", content,
         body_class="page-sub page-404", index=False)
    shutil.copy(DIST / "404" / "index.html", DIST / "404.html")


# ---------------------------------------------------------------- run
def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    print("Körper Bodensysteme · Build")
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    shutil.copytree(ROOT / "assets", DIST / "assets")
    build_home()
    build_overview()
    build_leistungen()
    build_partner()
    build_about()
    build_contact()
    build_legal()
    build_404()
    (DIST / "sitemap.xml").write_text(seo.sitemap(PAGES), encoding="utf-8")
    robots = "User-agent: *\nDisallow: /\n" if PREVIEW else seo.robots()
    (DIST / "robots.txt").write_text(robots, encoding="utf-8")
    (DIST / ".nojekyll").write_text("", encoding="utf-8")
    (DIST / "llms.txt").write_text(seo.llms_txt(ITEMS, svc_url, PARTNER["partners"]), encoding="utf-8")
    print("  ok sitemap.xml, robots.txt, llms.txt")
    print(f"Fertig -> {DIST}" + (f"  (BASE_PATH={BASE})" if BASE else "") + ("  [Vorschau, noindex]" if PREVIEW else ""))


if __name__ == "__main__":
    main()
