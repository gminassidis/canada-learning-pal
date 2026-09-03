#!/usr/bin/env python3
"""Holt einzelne Abbildungen aus dem Handbuch nach assets/.

Zwei Faelle:
  clip   Die Abbildung ist im PDF gesetzt (Tabelle, Vektor). Wird als
         Seitenausschnitt gerendert. Koordinaten in PDF-Punkten.
  image  Die Abbildung liegt als Rasterbild vor und wird uebernommen.

Alles landet als WebP, damit die fertige Einzeldatei klein bleibt.
"""
import io, pathlib, sys
import pymupdf
from PIL import Image

ROOT   = pathlib.Path(__file__).resolve().parent.parent
PDF    = ROOT / "docs" / "CFSC-CRFSC-Manual-eng.pdf"
ASSETS = ROOT / "assets"
RAW    = ROOT / "build" / "images"

MAX_W   = 1000
QUALITY = 82

FIGURES = [
    # name,               art,     Seite, Bereich x0,y0,x1,y1  oder Dateiname
    ("acts",            "clip",  57, (230, 656)),
    ("prove",           "clip",  58, ( 95, 492)),
    ("locking-devices", "image", 61, "p0061-01.png"),
    # Modul 1 bis 3
    ("cartridges",      "image", 34, "p0034-01.png"),
    ("muzzleloader",    "image", 38, "p0038-01.png"),
    ("ramrod",          "image", 40, "p0040-01.jpeg"),
    ("bolt-action",     "image", 48, "p0048-01.jpeg"),
    ("pump-action",     "image", 48, "p0048-02.png"),
    ("firing-sequence", "image", 51, "p0051-01.png"),
    ("action-types",    "image", 53, "p0053-01.png"),
]


def save(img, name):
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    if img.width > MAX_W:
        img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
    out = ASSETS / f"{name}.webp"
    img.save(out, "WEBP", quality=QUALITY, method=6)
    print(f"  {out.name:24s} {img.width}x{img.height}  {out.stat().st_size/1024:5.1f} KB")


def main():
    ASSETS.mkdir(exist_ok=True)
    doc = pymupdf.open(PDF)
    for name, kind, page, spec in FIGURES:
        if kind == "clip":
            pg = doc[page - 1]
            y0, y1 = spec
            # waagerechte Kanten aus den Zeichenobjekten holen, statt sie zu schaetzen
            xs = [d["rect"] for d in pg.get_drawings()
                  if d["rect"].y1 > y0 and d["rect"].y0 < y1]
            x0 = min([r.x0 for r in xs], default=72.0) - 6
            x1 = max([r.x1 for r in xs], default=540.0) + 6
            pix = pg.get_pixmap(clip=pymupdf.Rect(x0, y0, x1, y1), dpi=220)
            save(Image.open(io.BytesIO(pix.tobytes("png"))), name)
        else:
            src = RAW / spec
            if not src.exists():
                print(f"  ! {spec} fehlt, erst tools/extract.py laufen lassen")
                continue
            save(Image.open(src), name)


if __name__ == "__main__":
    sys.exit(main())
