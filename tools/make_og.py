"""Erzeugt Social-Vorschaubilder (1200x630 JPG) aus den Hero-Bildern.
   Einmalig bzw. bei neuen Bildern ausführen:  python tools/make_og.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent.parent
A = ROOT / "assets"
LOGO = Image.open(A / "brand/koerper-logo-light.png").convert("RGBA")
jobs = {"home": A / "img/hero.webp", "partner": A / "img/partner/hero.webp"}
for d in sorted((A / "img/leistungen").iterdir()):
    jobs[d.name] = d / "hero.webp"

for name, src in jobs.items():
    im = ImageOps.fit(Image.open(src).convert("RGB"), (1200, 630), Image.LANCZOS, centering=(0.5, 0.55))
    shade = Image.new("L", (1200, 630))
    dr = ImageDraw.Draw(shade)
    for y in range(630):
        dr.line([(0, y), (1200, y)], fill=int(70 + 150 * (y / 630) ** 1.4))
    im = Image.composite(Image.new("RGB", im.size, (20, 21, 19)), im, shade)
    logo = LOGO.copy(); logo.thumbnail((420, 120), Image.LANCZOS)
    im.paste(logo, (64, 630 - 64 - logo.height), logo)
    ImageDraw.Draw(im).rectangle([64, 630 - 64 - logo.height - 26, 64 + 56, 630 - 64 - logo.height - 22], fill=(238, 107, 1))
    im.save(A / f"og/{name}.jpg", quality=84, optimize=True, progressive=True)
    print("og", name)
