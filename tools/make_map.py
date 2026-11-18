"""
Erzeugt die Umrisse für die Projektkarte (src/data/karte.json).

Quelle: Natural Earth 1:50m über das npm-Paket world-atlas (TopoJSON), z. B.
    https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json

    python tools/make_map.py pfad/zu/countries-50m.json

Das Ergebnis wird eingecheckt; der Website-Build selbst braucht weder Netz noch Zusatzpakete.
Die Projektion (gleichabständig, auf 50,5° N entzerrt) steht mit in der Datei, damit
src/atlas.py Orte mit denselben Parametern auf die Karte setzt.
"""
import json
import math
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "karte.json"

LON0, LON1, LAT0, LAT1 = 5.2, 15.4, 45.9, 55.15     # Kartenausschnitt
LATC = 50.5                                          # Breite für die Entzerrung
W = 600
C = math.cos(math.radians(LATC))
K = W / ((LON1 - LON0) * C)
H = round((LAT1 - LAT0) * K)

COUNTRIES = {"276": "DE", "756": "CH", "040": "AT", "380": "IT", "250": "FR", "528": "NL", "056": "BE",
             "442": "LU", "203": "CZ", "616": "PL", "208": "DK", "438": "LI", "705": "SI"}


def project(lon, lat):
    return (lon - LON0) * C * K, (LAT1 - lat) * K


def rdp(pts, eps):
    """Douglas-Peucker-Vereinfachung."""
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1e-9
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norm
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        return rdp(pts[: idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]


def main(src):
    topo = json.loads(Path(src).read_text(encoding="utf-8"))
    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx; y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)

    def ring(idx):
        pts = []
        for i in idx:
            a = arcs[i] if i >= 0 else arcs[~i][::-1]
            pts.extend(a if not pts else a[1:])
        return pts

    out = []
    for g in topo["objects"]["countries"]["geometries"]:
        code = COUNTRIES.get(g.get("id"))
        if not code:
            continue
        polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
        parts = []
        for poly in polys:
            for r in poly:
                pts = [project(lon, lat) for lon, lat in ring(r)]
                xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
                if max(xs) < -40 or min(xs) > W + 40 or max(ys) < -40 or min(ys) > H + 40:
                    continue  # weit außerhalb des Ausschnitts
                half = len(pts) // 2  # geschlossener Ring: in zwei Bögen vereinfachen
                pts = rdp(pts[: half + 1], 0.45)[:-1] + rdp(pts[half:], 0.45)
                if len(pts) < 4:
                    continue
                parts.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z")
        if parts:
            out.append({"id": code, "d": "".join(parts)})

    OUT.write_text(json.dumps({
        "w": W, "h": H, "proj": {"lon0": LON0, "lat1": LAT1, "c": C, "k": K}, "countries": out,
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{OUT} ({OUT.stat().st_size // 1024} KB, {W}x{H})")


if __name__ == "__main__":
    main(sys.argv[1])
