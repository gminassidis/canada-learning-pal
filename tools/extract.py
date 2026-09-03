#!/usr/bin/env python3
"""Zerlegt das Handbuch-PDF in Text und Abbildungen.

    python3 tools/extract.py src-pdf/handbook-en.pdf

Ergebnis:
    build/text/page-0001.txt ...   Text je Seite, mit Seitenzahl im Namen
    build/images/p0012-01.png ...  Abbildungen, Dateiname trägt die Seite
    build/images/index.json        Liste aller Bilder mit Seite und Größe

Kleine Grafiken (Linien, Logos, Wasserzeichen) werden übersprungen.
"""
import json, pathlib, sys

try:
    import pymupdf
except ImportError:
    import fitz as pymupdf

MIN_W, MIN_H = 120, 120     # kleiner ist Deko, keine Abbildung
MIN_BYTES    = 6 * 1024


def main(pdf_path):
    root  = pathlib.Path(__file__).resolve().parent.parent
    build = root / "build"
    tdir  = build / "text"
    idir  = build / "images"
    tdir.mkdir(parents=True, exist_ok=True)
    idir.mkdir(parents=True, exist_ok=True)

    doc = pymupdf.open(pdf_path)
    print(f"  {doc.page_count} Seiten")

    index = []
    for pno in range(doc.page_count):
        page = doc[pno]
        (tdir / f"page-{pno+1:04d}.txt").write_text(page.get_text(), encoding="utf-8")

        for i, info in enumerate(page.get_images(full=True)):
            xref = info[0]
            try:
                img = doc.extract_image(xref)
            except Exception:
                continue
            w, h = img.get("width", 0), img.get("height", 0)
            data = img["image"]
            if w < MIN_W or h < MIN_H or len(data) < MIN_BYTES:
                continue
            name = f"p{pno+1:04d}-{i+1:02d}.{img['ext']}"
            (idir / name).write_bytes(data)
            index.append({"file": name, "page": pno + 1, "w": w, "h": h, "bytes": len(data)})

    (idir / "index.json").write_text(
        json.dumps(index, indent=2, ensure_ascii=False), encoding="utf-8")

    chars = sum(len((tdir / f).read_text(encoding="utf-8"))
                for f in [p.name for p in tdir.glob("*.txt")])
    print(f"  Text:   {len(list(tdir.glob('*.txt')))} Seiten, {chars} Zeichen")
    print(f"  Bilder: {len(index)} brauchbar in build/images/")
    if chars < 500 * doc.page_count / 10:
        print("  ! sehr wenig Text, möglicherweise ein Scan. Dann braucht es OCR.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("Aufruf: python3 tools/extract.py <pdf>")
    main(sys.argv[1])
