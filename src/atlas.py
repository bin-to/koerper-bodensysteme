"""
Projektatlas für die Seite „Referenzen & Partner“.

Erzeugt aus src/data/partner.json (Liste "projects") und src/data/karte.json:
  - Kennzahlen (Projekte, Fläche, Orte, Länder),
  - Filter nach Leistung,
  - eine selbst gezeichnete Karte (Inline-SVG, keine externen Kartendienste) mit Projektpunkten,
  - die nach Leistung gruppierte Projektliste,
  - die Projektdaten als JSON für die Bildstrecke (assets/js/atlas.js).
"""
import html
import json
import math
import re

esc = lambda s: html.escape(str(s), quote=True)

HQ = ("Merxheim", 49.79, 7.56)          # Firmensitz
RINGS_KM = (100, 200, 300)
CLUSTER_PX = 15                         # Orte, die auf der Karte näher liegen, teilen sich einen Punkt
COUNTRY_LABELS = [("Deutschland", 10.2, 51.55, "middle"), ("Schweiz", 7.55, 46.55, "middle"),
                  ("Österreich", 14.1, 47.55, "middle"), ("Italien", 9.9, 46.1, "middle"),
                  ("Frankreich", 6.15, 48.45, "middle"), ("Tschechien", 14.3, 50.0, "middle"),
                  ("Niederlande", 5.35, 52.75, "start"), ("Polen", 15.3, 52.4, "end")]
COUNTRY_OF = {"brixen": "IT", "schweiz": "CH"}


def area_m2(s):
    """'2.000 m²' -> 2000, 'Grube 170 m²' -> 170, 'Kleinflächen' -> 0."""
    m = re.search(r"(\d[\d.]*)\s*m²", s)
    return int(m.group(1).replace(".", "")) if m else 0


def fmt_int(n):
    return f"{n:,}".replace(",", ".")


def render(projects, services, karte):
    """projects: Liste aus partner.json, services: Leistungen (slug, nav, nr, url)."""
    pr = karte["proj"]

    def xy(lat, lon):
        return (lon - pr["lon0"]) * pr["c"] * pr["k"], (pr["lat1"] - lat) * pr["k"]

    order = [s["slug"] for s in services]
    by_slug = {s["slug"]: s for s in services}
    for p in projects:
        p["_area"] = area_m2(p["area"])
        p["_xy"] = xy(*p["geo"])

    # ---------- Punkte (Cluster) ----------
    clusters = []
    for p in sorted(projects, key=lambda p: -p["_area"]):
        x, y = p["_xy"]
        for c in clusters:  # nur zusammenfassen, wenn der Ort nah an allen Orten des Punkts liegt
            if all(math.hypot(q["_xy"][0] - x, q["_xy"][1] - y) < CLUSTER_PX for q in c["items"]):
                c["items"].append(p)
                c["x"] = sum(q["_xy"][0] for q in c["items"]) / len(c["items"])
                c["y"] = sum(q["_xy"][1] for q in c["items"]) / len(c["items"])
                break
        else:
            clusters.append({"x": x, "y": y, "items": [p]})

    pins = []
    for i, c in enumerate(sorted(clusters, key=lambda c: c["y"])):
        area = sum(p["_area"] for p in c["items"])
        r = min(5 + math.sqrt(max(area, 150)) / 11, 15)
        places = []
        for p in c["items"]:
            if p["place"] not in places:
                places.append(p["place"])
        n = len(c["items"])
        label = f'{", ".join(places)}: {n} Projekt{"e" if n > 1 else ""}'
        num = f'<text class="pin-n" x="{c["x"]:.1f}" y="{c["y"]:.1f}" dy=".35em">{n}</text>' if n > 1 else ""
        pins.append(
            f'<g class="pin" style="--i:{i}" data-ids="{" ".join(p["id"] for p in c["items"])}" '
            f'data-x="{c["x"]:.1f}" data-y="{c["y"]:.1f}" tabindex="0" role="button" aria-label="{esc(label)}">'
            f'<circle class="pin-hit" cx="{c["x"]:.1f}" cy="{c["y"]:.1f}" r="{max(r + 6, 13):.1f}"/>'
            f'<circle class="pin-pulse" cx="{c["x"]:.1f}" cy="{c["y"]:.1f}" r="{r:.1f}"/>'
            f'<circle class="pin-dot" cx="{c["x"]:.1f}" cy="{c["y"]:.1f}" r="{r:.1f}"/>{num}</g>')

    # ---------- Karte ----------
    hx, hy = xy(HQ[1], HQ[2])
    km = pr["k"] / 111.2
    rings = "".join(
        f'<circle class="ring" style="--i:{i}" cx="{hx:.1f}" cy="{hy:.1f}" r="{d * km:.1f}"/>'
        f'<text class="ring-t" x="{hx:.1f}" y="{hy - d * km - 6:.1f}">{d} km</text>'
        for i, d in enumerate(RINGS_KM))
    countries = "".join(f'<path class="land land-{c["id"].lower()}" d="{c["d"]}"/>' for c in karte["countries"])
    labels = "".join(
        f'<text class="cty" x="{xy(lat, lon)[0]:.1f}" y="{xy(lat, lon)[1]:.1f}" text-anchor="{anchor}">{esc(name)}</text>'
        for name, lon, lat, anchor in COUNTRY_LABELS)
    hq = (f'<g class="hq"><rect x="{hx - 5.5:.1f}" y="{hy - 5.5:.1f}" width="11" height="11" '
          f'transform="rotate(45 {hx:.1f} {hy:.1f})"/>'
          f'<text x="{hx - 12:.1f}" y="{hy + 4:.1f}" text-anchor="end">Merxheim · Sitz</text></g>')
    svg = (f'<svg class="atlas-svg" viewBox="0 0 {karte["w"]} {karte["h"]}" role="img" '
           f'aria-label="Karte mit unseren Projektorten in Deutschland, der Schweiz und Südtirol">'
           f'<defs><clipPath id="atlas-clip"><rect width="{karte["w"]}" height="{karte["h"]}" rx="2"/></clipPath></defs>'
           f'<g clip-path="url(#atlas-clip)"><g class="lands">{countries}</g>{labels}'
           f'<g class="rings">{rings}</g>{hq}<g class="pins">{"".join(pins)}</g></g></svg>')

    # ---------- Kennzahlen ----------
    total = sum(p["_area"] for p in projects)
    places = len({p["place"] for p in projects})
    countries_n = len({COUNTRY_OF.get(p["id"], "DE") for p in projects})
    stats = [("projects", len(projects), "Projekte"), ("area", total, "m² Fläche"),
             ("places", places, "Orte"), ("countries", countries_n, "Länder")]
    stats_html = "\n".join(
        f'            <div><dt>{lbl}</dt><dd data-stat="{key}" data-to="{val}">{fmt_int(val)}</dd></div>'
        for key, val, lbl in stats)

    # ---------- Filter ----------
    counts = {g: sum(1 for p in projects if p["group"] == g) for g in order}
    chips = [f'            <button type="button" class="af-chip" data-filter="all" aria-pressed="true">'
             f'Alle <span>{len(projects)}</span></button>']
    gorder = sorted((g for g in order if counts[g]), key=lambda g: -counts[g])
    for g in gorder:
        if counts[g]:
            chips.append(f'            <button type="button" class="af-chip" data-filter="{g}" aria-pressed="false">'
                         f'{esc(by_slug[g]["nav"])} <span>{counts[g]}</span></button>')

    # ---------- Liste ----------
    groups = []
    for g in gorder:
        items = [p for p in projects if p["group"] == g]
        if not items:
            continue
        s = by_slug[g]
        cards = []
        for p in items:
            client = f'<span class="ac-client">{esc(p["client"])}</span>' if p["client"] else ""
            cards.append(f"""              <li class="ac" data-id="{p["id"]}" data-group="{g}">
                <a class="ac-link" href="#projekt-{p["id"]}" data-story="{p["id"]}">
                  <span class="ac-img"><img src="/assets/img/referenzen/{p["id"]}/cover.webp" alt="{esc(p["alts"][0])}" loading="lazy" width="960" height="720"><span class="ac-play"><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1l7 4-7 4z"/></svg>{len(p["alts"])} Bilder</span></span>
                  <span class="ac-body">
                    <span class="ac-meta"><span>{esc(p["cat"])}</span><span>{esc(p["year"])}</span></span>
                    <span class="ac-title">{esc(p["place"])}</span>{client}
                    <span class="ac-facts"><span>{esc(p["service"])}</span><b>{esc(p["area"])}</b></span>
                  </span>
                </a>
              </li>""")
        area = sum(p["_area"] for p in items)
        groups.append(f"""          <section class="ag" data-group="{g}" aria-labelledby="ag-{g}">
            <header class="ag-head">
              <span class="ag-nr">{esc(s["nr"])}</span>
              <h3 class="ag-title" id="ag-{g}">{esc(s["nav"])}</h3>
              <span class="ag-meta">{len(items)} Projekt{"e" if len(items) > 1 else ""} · {fmt_int(area)} m²</span>
              <a class="ag-link" href="{s["url"]}">Zur Leistung <span aria-hidden="true">→</span></a>
            </header>
            <ul class="ag-grid">
{chr(10).join(cards)}
            </ul>
          </section>""")

    # ---------- Daten für die Bildstrecke ----------
    data = {"groups": {g: by_slug[g]["nav"] for g in order}, "projects": [
        {"id": p["id"], "place": p["place"], "client": p["client"], "service": p["service"], "area": p["area"],
         "m2": p["_area"], "year": p["year"], "cat": p["cat"], "group": p["group"],
         "country": COUNTRY_OF.get(p["id"], "DE"), "alts": p["alts"]} for p in projects]}
    data_json = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    return {
        "atlas_stats": stats_html,
        "atlas_filter": "\n".join(chips),
        "atlas_map": svg,
        "atlas_groups": "\n".join(groups),
        "atlas_data": data_json,
        "atlas_count": len(projects),
    }
