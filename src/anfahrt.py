"""
Anfahrtskarte für die Kontaktseite.

Selbst gezeichnete Inline-SVG-Karte (keine eingebetteten Kartendienste): Region um Merxheim mit
Landesgrenzen (aus src/data/karte.json, umprojiziert), Flüssen, Städten und Entfernungsringen.
Ein Klick auf die Karte öffnet den Firmeneintrag in Google Maps.

Flussläufe und Orte sind bewusst vereinfacht: Die Karte dient der Orientierung, nicht der Navigation.
"""
import math
import re

HQ = (49.7948, 7.5628)                  # Albachstraße 1, Merxheim (laut Google-Eintrag)
W, H = 800, 600
LAT_SPAN = 0.9                          # Höhe des Ausschnitts in Breitengraden
C = math.cos(math.radians(HQ[0]))
K = H / LAT_SPAN                        # px pro Breitengrad
LAT1 = HQ[0] + LAT_SPAN / 2
LON0 = HQ[1] - (W / 2) / (C * K)
RINGS_KM = (10, 25, 50)

# (Name, Breite, Länge, Beschriftung: Seite, Größe)
TOWNS = [
    ("Mainz", 49.993, 8.247, "s", "l"), ("Wiesbaden", 50.078, 8.239, "n", "m"),
    ("Kaiserslautern", 49.444, 7.769, "e", "l"), ("Worms", 49.632, 8.359, "w", "m"),
    ("Bad Kreuznach", 49.845, 7.867, "e", "l"), ("Bingen", 49.966, 7.904, "e", "m"),
    ("Idar-Oberstein", 49.711, 7.313, "s", "m"), ("Kirn", 49.787, 7.457, "w", "s"),
    ("Bad Sobernheim", 49.787, 7.653, "se", "s"), ("Simmern", 49.982, 7.523, "w", "m"),
    ("Meisenheim", 49.707, 7.668, "e", "s"), ("Alzey", 49.746, 8.116, "e", "m"),
    ("Birkenfeld", 49.652, 7.165, "s", "s"), ("Bernkastel-Kues", 49.916, 7.072, "w", "s"),
]
REGIONS = [("Hunsrück", 50.13, 7.22), ("Nordpfälzer Bergland", 49.56, 7.62)]

# Flussläufe (Breite, Länge), stromabwärts, vereinfacht
RIVERS = {
    "Nahe": [(49.575, 7.145), (49.640, 7.235), (49.705, 7.300), (49.715, 7.345), (49.760, 7.420),
             (49.788, 7.462), (49.796, 7.520), (49.798, 7.565), (49.792, 7.620), (49.786, 7.665),
             (49.800, 7.760), (49.815, 7.840), (49.845, 7.868), (49.885, 7.885), (49.935, 7.890),
             (49.968, 7.898)],
    "Rhein": [(49.10, 8.30), (49.22, 8.37), (49.32, 8.44), (49.49, 8.46), (49.63, 8.37),
              (49.78, 8.40), (49.86, 8.36), (49.95, 8.32), (50.00, 8.27), (50.04, 8.20),
              (50.03, 8.10), (49.99, 7.97), (49.97, 7.90), (50.02, 7.83), (50.08, 7.77),
              (50.15, 7.72), (50.23, 7.60), (50.29, 7.62), (50.36, 7.60), (50.43, 7.52),
              (50.50, 7.40)],
    "Mosel": [(49.47, 6.37), (49.58, 6.40), (49.68, 6.44), (49.70, 6.57), (49.75, 6.64),
              (49.82, 6.75), (49.86, 6.90), (49.92, 7.07), (49.96, 7.12), (50.03, 7.18),
              (50.10, 7.16), (50.15, 7.17), (50.17, 7.30), (50.25, 7.40), (50.31, 7.46),
              (50.36, 7.60)],
    "Main": [(50.10, 8.90), (50.12, 8.75), (50.105, 8.68), (50.09, 8.58), (50.04, 8.47),
             (50.01, 8.40), (50.00, 8.30), (50.00, 8.27)],
}
RIVER_LABELS = [("Rhein", 49.90, 8.392, -82), ("Mosel", 49.835, 6.90, 18), ("Nahe", 49.738, 7.39, 38)]
GRID_LON = (7.0, 7.5, 8.0)
GRID_LAT = (49.5, 50.0)


def xy(lat, lon):
    return (lon - LON0) * C * K, (LAT1 - lat) * K


def smooth(pts):
    """Catmull-Rom durch die Punkte, als kubische Bézier-Pfade."""
    p = [xy(*q) for q in pts]
    d = f"M{p[0][0]:.1f},{p[0][1]:.1f}"
    for i in range(len(p) - 1):
        p0, p1, p2 = p[max(i - 1, 0)], p[i], p[i + 1]
        p3 = p[min(i + 2, len(p) - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f"C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}"
    return d


def reproject(d, pr):
    """Pfad aus karte.json (Projektion des Projektatlas) in diese Karte umrechnen."""
    def conv(m):
        xa, ya = float(m.group(1)), float(m.group(2))
        lon = xa / (pr["c"] * pr["k"]) + pr["lon0"]
        lat = pr["lat1"] - ya / pr["k"]
        x, y = xy(lat, lon)
        return f"{x:.1f},{y:.1f}"
    return re.sub(r"(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)", conv, d)


def render(karte):
    pr = karte["proj"]
    lands = []
    for c in karte["countries"]:
        if c["id"] not in ("DE", "FR", "LU", "BE", "NL"):
            continue
        lands.append(f'<path class="am-land am-{c["id"].lower()}" d="{reproject(c["d"], pr)}"/>')

    grid = "".join(f'<line x1="{xy(0, lon)[0]:.1f}" y1="0" x2="{xy(0, lon)[0]:.1f}" y2="{H}"/>' for lon in GRID_LON)
    grid += "".join(f'<line x1="0" y1="{xy(lat, 0)[1]:.1f}" x2="{W}" y2="{xy(lat, 0)[1]:.1f}"/>' for lat in GRID_LAT)
    grid_t = "".join(f'<text x="{xy(0, lon)[0] + 6:.1f}" y="{H - 10}">{lon:.1f}° O</text>' for lon in GRID_LON)
    grid_t += "".join(f'<text x="108" y="{xy(lat, 0)[1] - 6:.1f}">{lat:.1f}° N</text>' for lat in GRID_LAT)

    rivers = "".join(f'<path class="am-river am-river-{n.lower()}" d="{smooth(p)}"/>' for n, p in RIVERS.items())
    river_t = "".join(
        f'<text class="am-river-t" transform="translate({xy(lat, lon)[0]:.1f} {xy(lat, lon)[1]:.1f}) rotate({rot})">{n}</text>'
        for n, lat, lon, rot in RIVER_LABELS)

    regions = "".join(f'<text class="am-region" x="{xy(lat, lon)[0]:.1f}" y="{xy(lat, lon)[1]:.1f}">{n}</text>'
                      for n, lat, lon in REGIONS)

    hx, hy = xy(*HQ)
    km = K / 111.2
    rings = "".join(
        f'<circle class="am-ring" style="--i:{i}" cx="{hx:.1f}" cy="{hy:.1f}" r="{d * km:.1f}"/>'
        f'<text class="am-ring-t" x="{hx + d * km * math.cos(math.radians(-145)):.1f}" '
        f'y="{hy + d * km * math.sin(math.radians(-145)):.1f}">{d} km</text>'
        for i, d in enumerate(RINGS_KM))

    off = {"e": (13, 8, "start"), "w": (-13, 8, "end"), "n": (0, -14, "middle"),
           "s": (0, 32, "middle"), "se": (6, 30, "start")}
    towns = []
    for name, lat, lon, side, size in TOWNS:
        x, y = xy(lat, lon)
        dx, dy, anchor = off[side]
        r = {"l": 6.5, "m": 5, "s": 4}[size]
        towns.append(f'<g class="am-town am-town-{size}"><circle cx="{x:.1f}" cy="{y:.1f}" r="{r}"/>'
                     f'<text x="{x + dx:.1f}" y="{y + dy:.1f}" text-anchor="{anchor}">{name}</text></g>')

    # Firmensitz: Pin mit Beschriftung darüber
    lx, ly = hx, hy - 150
    hq = (f'<g class="am-hq">'
          f'<circle class="am-hq-pulse" cx="{hx:.1f}" cy="{hy:.1f}" r="12"/>'
          f'<line class="am-hq-lead" x1="{hx:.1f}" y1="{hy - 12:.1f}" x2="{lx:.1f}" y2="{ly + 18:.1f}"/>'
          f'<circle class="am-hq-dot" cx="{hx:.1f}" cy="{hy:.1f}" r="10"/>'
          f'<circle class="am-hq-core" cx="{hx:.1f}" cy="{hy:.1f}" r="3.5"/>'
          f'<text class="am-hq-name" x="{lx:.1f}" y="{ly - 24:.1f}">Körper Bodensysteme</text>'
          f'<text class="am-hq-addr" x="{lx:.1f}" y="{ly + 8:.1f}">Albachstraße 1 · Merxheim</text></g>')

    # Maßstab: 20 km
    sb = 20 * km
    scale = (f'<g class="am-scale" transform="translate({W - 108 - sb:.1f} 44)">'
             f'<path d="M0,0V6H{sb:.1f}V0"/><text x="{sb / 2:.1f}" y="-6">20 km</text></g>')

    return (f'<svg class="am-svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">'
            f'<rect class="am-bg" width="{W}" height="{H}"/>'
            f'<g class="am-lands">{"".join(lands)}</g>'
            f'<g class="am-grid">{grid}</g><g class="am-grid-t">{grid_t}</g>'
            f'{regions}<g class="am-rivers">{rivers}</g>{river_t}'
            f'<g class="am-rings">{rings}</g>'
            f'<g class="am-towns">{"".join(towns)}</g>{hq}{scale}</svg>')
