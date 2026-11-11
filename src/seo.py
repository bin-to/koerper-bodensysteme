"""SEO- und KI-Bausteine: strukturierte Daten (JSON-LD), Sitemap, robots.txt, llms.txt."""
import json
from datetime import date

SITE = "https://www.koerper-bodensysteme.de"
BIZ_ID = SITE + "/#unternehmen"

BUSINESS = {
    "@type": "HomeAndConstructionBusiness",
    "@id": BIZ_ID,
    "name": "Körper Bodensysteme",
    "alternateName": "Körper Bodensysteme – Industrie- und Betonbodensanierung",
    "slogan": "Böden, die tragen.",
    "description": "Fachbetrieb nach Wasserhaushaltsgesetz (WHG) für Industrie- und Betonbodensanierung, "
                   "Beschichtung und Imprägnierung, Fugen- und Diamantschleifarbeiten, Sichtbeläge und "
                   "Industrieböden aus Beton. Sitz in Merxheim, Einsatz in ganz Deutschland und im europäischen Ausland.",
    "url": SITE + "/",
    "logo": SITE + "/assets/brand/apple-touch-icon.png",
    "image": SITE + "/assets/og/home.jpg",
    "telephone": "+49 6754 6903950",
    "email": "info@koerper-bodensysteme.de",
    "vatID": "DE303617149",
    "foundingDate": "2015",
    "founder": {"@type": "Person", "name": "Christian Körper", "jobTitle": "Inhaber & Geschäftsführer"},
    "address": {
        "@type": "PostalAddress",
        "streetAddress": "Albachstraße 1",
        "postalCode": "55627",
        "addressLocality": "Merxheim",
        "addressRegion": "Rheinland-Pfalz",
        "addressCountry": "DE",
    },
    "openingHoursSpecification": [
        {"@type": "OpeningHoursSpecification",
         "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
         "opens": o, "closes": c} for o, c in (("08:00", "12:00"), ("13:00", "17:00"))
    ],
    "areaServed": [{"@type": "Country", "name": "Deutschland"}, {"@type": "Place", "name": "Europa"}],
    "hasCredential": {"@type": "EducationalOccupationalCredential",
                      "name": "Fachbetrieb nach Wasserhaushaltsgesetz (WHG)"},
    "knowsAbout": ["Industriebodensanierung", "Betonbodensanierung", "Bodenbeschichtung", "Imprägnierung",
                   "Versiegelung", "Fugensanierung", "Diamantschleifen", "Kugelstrahlen", "Fräsen",
                   "Sichtbeläge", "Industrieboden aus Beton", "WHG-Flächen"],
    "sameAs": ["https://www.instagram.com/koerperbodensysteme"],
}


def ld(*objs):
    graph = {"@context": "https://schema.org", "@graph": list(objs)}
    txt = json.dumps(graph, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return f'  <script type="application/ld+json">{txt}</script>'


def breadcrumbs(items):
    return {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + u}
            for i, (n, u) in enumerate(items)
        ],
    }


def webpage(path, title, description, image, crumbs=None):
    p = {"@type": "WebPage", "@id": SITE + path + "#webseite", "url": SITE + path, "name": title,
         "description": description, "inLanguage": "de-DE", "isPartOf": {"@id": SITE + "/#website"},
         "about": {"@id": BIZ_ID}, "primaryImageOfPage": SITE + image}
    if crumbs:
        p["breadcrumb"] = breadcrumbs(crumbs)
    return p


def home_schema(items, svc_url, title, description):
    biz = dict(BUSINESS)
    biz["hasOfferCatalog"] = {
        "@type": "OfferCatalog", "name": "Leistungen",
        "itemListElement": [{"@type": "Offer", "itemOffered": {"@id": SITE + svc_url(it) + "#leistung"}} for it in items],
    }
    site = {"@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/", "name": "Körper Bodensysteme",
            "inLanguage": "de-DE", "publisher": {"@id": BIZ_ID}}
    return ld(biz, site, webpage("/", title, description, "/assets/og/home.jpg"))


def service_schema(it, url, title, description):
    svc = {
        "@type": "Service", "@id": SITE + url + "#leistung", "name": it["title"], "serviceType": it["title"],
        "description": it["meta"], "url": SITE + url, "image": SITE + f"/assets/og/{it['slug']}.jpg",
        "provider": {"@id": BIZ_ID},
        "areaServed": [{"@type": "Country", "name": "Deutschland"}, {"@type": "Place", "name": "Europa"}],
        "audience": {"@type": "BusinessAudience", "name": "Betreiber, Generalunternehmer, Architekten, Privatkunden"},
        "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Leistungsumfang",
                            "itemListElement": [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": s["t"], "description": s["d"]}}
                                                for s in it["scope"]]},
    }
    crumbs = [("Start", "/"), ("Leistungen", "/dienstleistungen/"), (it["nav"], url)]
    return ld(business_ref(), svc, webpage(url, title, description, f"/assets/og/{it['slug']}.jpg", crumbs))


def business_ref(**extra):
    """Kompakte Unternehmensangabe für Unterseiten (Details stehen auf der Startseite)."""
    keys = ("@id", "@type", "name", "url", "telephone", "address")
    return {**{k: BUSINESS[k] for k in keys}, **extra}


def partner_schema(partners, title, description):
    crumbs = [("Start", "/"), ("Referenzen & Partner", "/partner/")]
    page = webpage("/partner/", title, description, "/assets/og/partner.jpg", crumbs)
    page["@type"] = "CollectionPage"
    page["mentions"] = [{"@type": "Organization", "name": p["name"], "url": p["url"]} for p in partners]
    return ld(business_ref(memberOf={"@type": "Organization", "name": "BVB BusinessNetzwerk"}), page)


def simple_schema(path, title, description, page_type, crumb_name):
    page = webpage(path, title, description, "/assets/og/home.jpg", [("Start", "/"), (crumb_name, path)])
    page["@type"] = page_type
    return ld(business_ref(), page)


def collection_schema(path, title, description, crumb_name, entries):
    page = webpage(path, title, description, "/assets/og/home.jpg", [("Start", "/"), (crumb_name, path)])
    page["@type"] = "CollectionPage"
    page["hasPart"] = [{"@type": "WebPage", "name": n, "url": SITE + u} for n, u in entries]
    return ld(business_ref(), page)


def sitemap(paths):
    today = date.today().isoformat()
    rows = "\n".join(
        f"  <url><loc>{SITE}{p}</loc><lastmod>{today}</lastmod><priority>{pr}</priority></url>"
        for p, pr in paths
    )
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{rows}\n</urlset>\n'


def robots():
    return f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n"


def llms_txt(items, svc_url, partners):
    lines = [
        "# Körper Bodensysteme",
        "",
        "> Fachbetrieb nach Wasserhaushaltsgesetz (WHG) für Industrie- und Betonbodensanierung, Beschichtung und "
        "Imprägnierung, Fugen- und Diamantschleifarbeiten, Sichtbeläge und Industrieböden aus Beton. "
        "Inhabergeführt (Christian Körper), gegründet 2015, Sitz in Merxheim (Rheinland-Pfalz), Außenstelle Süd. "
        "Einsatz in ganz Deutschland und im europäischen Ausland. TÜV-zertifiziert.",
        "",
        "Zielgruppen: Betreiber von Hallen, Lager-, Logistik- und Produktionsflächen sowie Tiefgaragen; "
        "Generalunternehmer und Bauträger; Architekten und Planer; Privat- und Gewerbekunden (Garage, Werkstatt, Wohnraum).",
        "",
        "## Leistungen",
        "",
    ]
    for it in items:
        lines.append(f"- [{it['title']}]({SITE}{svc_url(it)}): {it['short']} Einsatzbereiche: {', '.join(it['areas'])}.")
    lines += [
        "",
        "## Unternehmen",
        "",
        f"- [Startseite]({SITE}/): Überblick, Zielgruppen, Systemaufbau eines Industriebodens, Projekte",
        f"- [Leistungen im Überblick]({SITE}/dienstleistungen/): alle Leistungen, Ablauf in vier Schritten, WHG-Flächen",
        f"- [Über uns]({SITE}/uber-uns/): Geschichte, Arbeitsweise, Ansprechpartner mit Durchwahl, Engagement",
        f"- [Referenzen & Partner]({SITE}/partner/): Referenzprojekte und Systempartner ("
        + ", ".join(p["name"] for p in partners) + ")",
        f"- [Impressum]({SITE}/impressum/) · [Datenschutz]({SITE}/datenschutz/)",
        "",
        "## Kontakt",
        "",
        "- Telefon: +49 6754 690 3950",
        "- E-Mail: info@koerper-bodensysteme.de",
        "- Anschrift: Albachstraße 1, 55627 Merxheim, Deutschland",
        "- Geschäftszeiten: Mo–Fr 08:00–12:00 und 13:00–17:00 Uhr",
        f"- Projektanfrage: {SITE}/kontakt/",
        "",
    ]
    return "\n".join(lines)
