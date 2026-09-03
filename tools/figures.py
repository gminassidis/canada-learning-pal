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
    # Modul 5
    ("rifling",         "image", 65, "p0065-01.jpeg"),
    ("rim-centre-fire", "image", 66, "p0066-01.png"),
    ("cartridge-parts", "image", 69, "p0069-01.png"),
    ("barrel-stamp",    "image", 73, "p0073-02.jpeg"),
    ("slugs",           "image", 75, "p0075-01.png"),
    ("gauges",          "image", 76, "p0076-01.png"),
    ("chokes",          "image", 78, "p0078-01.png"),
    ("shell-parts",     "image", 81, "p0081-01.jpeg"),
    ("shot-sizes",      "image", 83, "p0083-01.png"),
    ("range-rifle",     "image", 90, "p0090-01.png"),
    ("range-shotgun",   "image", 90, "p0090-02.png"),
    ("trajectory",      "image", 91, "p0091-01.png"),
    # Modul 1, Funktionsweise der alten Zündsysteme
    ("cannon",          "image",  27, "p0027-01.png"),
    ("matchlock",       "image",  28, "p0028-01.jpeg"),
    ("wheel-lock",      "image",  29, "p0029-01.png"),
    ("flintlock",       "image",  30, "p0030-01.png"),
    ("flintlock-rifle", "image",  30, "p0030-02.jpeg"),
    ("percussion-cap",  "image",  31, "p0031-01.jpeg"),
    # Modul 2, Laden Schritt für Schritt
    ("loading-1",       "image",  41, "p0041-01.png"),
    ("loading-2",       "image",  42, "p0042-01.png"),
    # Modul 5, Schnitte durch Patrone und Lager
    ("rim-fire-cut",    "image",  67, "p0067-01.png"),
    ("centre-fire-cut", "image",  67, "p0067-02.png"),
    ("bullet-compare",  "image",  70, "p0070-01.png"),
    ("chambered",       "image",  74, "p0074-01.png"),
    ("cart-vs-shell",   "image",  79, "p0079-01.png"),
    ("shell-in-chamber","image",  85, "p0085-01.png"),
    ("exploded-chamber","image",  88, "p0088-01.jpeg"),
    # Modul 6, Sicherungen, Verschlüsse, Magazine
    ("actions-overview","image", 101, "p0101-01.png"),
    ("safety-side",     "image", 103, "p0103-01.jpeg"),
    ("safety-pivot",    "image", 103, "p0103-02.jpeg"),
    ("safety-wing",     "image", 104, "p0104-01.jpeg"),
    ("safety-trigger",  "image", 104, "p0104-02.png"),
    ("safety-crossbolt","image", 106, "p0106-01.jpeg"),
    ("hinge-action-fig","image", 114, "p0114-01.png"),
    ("bolt-action-fig", "image", 116, "p0116-01.png"),
    ("bolt-single",     "image", 117, "p0117-01.png"),
    ("magazine-box",    "image", 121, "p0121-01.jpeg"),
    ("magazine-tube-c", "image", 123, "p0123-01.jpeg"),
    ("magazine-tube-r", "image", 123, "p0123-03.jpeg"),
    ("bolt-repeater",   "image", 125, "p0125-01.png"),
    ("lever-action-fig","image", 130, "p0130-01.png"),
    ("pump-action-fig", "image", 134, "p0134-01.png"),
    ("semi-auto-seq",   "image", 139, "p0139-01.png"),
    # Zierbilder der Trennseiten des Handbuchs, je Modul eines
    ("div-m1",  "image",  26, "p0026-01.jpeg"),
    ("div-m2",  "image",  36, "p0036-01.png"),
    ("div-m3",  "image",  46, "p0046-01.png"),
    ("div-m4",  "image",  56, "p0056-01.png"),
    ("div-m5",  "image",  63, "p0063-01.jpeg"),
    ("div-m6",  "image",  96, "p0096-01.jpeg"),
    ("div-m7",  "image", 144, "p0144-01.jpeg"),
    ("div-m8",  "image", 162, "p0162-01.png"),
    ("div-m9",  "image", 179, "p0179-01.png"),
    ("div-m10", "image", 188, "p0188-01.png"),
    ("div-m11", "image", 196, "p0196-01.jpeg"),
    # Modul 7
    ("ppe",             "image", 146, "p0146-01.png"),
    ("range-layout",    "image", 149, "p0149-01.png"),
    ("fence-alone",     "image", 154, "p0154-01.jpeg"),
    ("fence-group",     "image", 155, "p0155-01.jpeg"),
    ("safe-zones",      "image", 157, "p0157-01.png"),
    ("carry-ready",    "image", 158, "p0158-01.png"),
    ("carry-cradle",    "image", 158, "p0158-02.jpeg"),
    ("carry-elbow",    "image", 159, "p0159-01.png"),
    ("carry-trail",    "image", 159, "p0159-02.png"),
    ("carry-shoulder",    "image", 160, "p0160-01.jpeg"),
    ("carry-sling",    "image", 160, "p0160-02.png"),
    # Modul 8
    ("pos-standing",    "image", 165, "p0165-01.jpeg"),
    ("pos-kneeling",    "image", 166, "p0166-01.png"),
    ("pos-sitting",     "image", 167, "p0167-01.png"),
    ("pos-prone",       "image", 168, "p0168-01.png"),
    ("pos-shotgun",     "image", 169, "p0169-01.png"),
    ("sight-types",     "image", 171, "p0171-01.png"),
    ("sight-open",      "image", 172, "p0172-02.png"),
    ("sight-scope",     "image", 173, "p0173-02.png"),
    ("sight-shotgun",   "image", 174, "p0174-01.png"),
    ("master-eye",      "image", 175, "p0175-02.png"),
    ("breathing",       "image", 176, "p0176-01.jpeg"),
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
