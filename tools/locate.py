#!/usr/bin/env python3
"""Sucht jedes englische Zitat im Handbuch und schreibt die Seite in den Block.

Zwei Zwecke. Erstens die Verlinkung: die App springt damit im PDF an genau
die Stelle. Zweitens eine Kontrolle: was sich im Handbuch nicht wiederfinden
laesst, ist kein woertliches Zitat und muss nachgesehen werden.

    python3 tools/locate.py           prueft und schreibt
    python3 tools/locate.py --check   prueft nur, schreibt nichts
"""
import json, pathlib, re, sys

try:
    import pymupdf
except ImportError:
    import fitz as pymupdf

ROOT = pathlib.Path(__file__).resolve().parent.parent
PDF  = ROOT / "docs" / "CFSC-CRFSC-Manual-eng.pdf"
UNITS = ROOT / "content" / "units.json"

# Das Handbuch bricht Saetze mitten in der Zeile um und nutzt typografische
# Zeichen. Beides muss weg, bevor verglichen wird.
# Querverweise wie "(Figure 18)" nehme ich aus den Zitaten heraus, damit sie
# sich lesen lassen. Hier fallen sie auf beiden Seiten weg, sonst findet der
# Vergleich sie nicht wieder.
XREF = re.compile(r"\((?:see\s+)?(?:figure|figures|fig\.|table|module)\b[^)]*\)",
                  re.IGNORECASE)

def norm(s):
    s = s.replace("’", "'").replace("‘", "'")
    s = s.replace("“", '"').replace("”", '"')
    s = s.replace("–", "-").replace("—", "-").replace("‐", "-")
    s = s.replace(" ", " ")
    s = XREF.sub(" ", s)
    s = s.replace(":", " ")          # Doppelpunkte und Tabellenspalten
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"\s+([.,;])", r"\1", s)   # entfernter Verweis laesst ein Leerzeichen zurueck
    return s.strip().lower()


def first_sentence(s):
    m = re.match(r".{25,}?[.:!?](?=\s|$)", s)
    return m.group(0) if m else s


def probe(needle, pages):
    """Gibt (Seite, Art) zurueck. Art sagt, wie sicher der Treffer ist."""
    n = norm(needle)
    for i, txt in enumerate(pages):
        if n in txt:
            return i + 1, "wörtlich"
    # Aufzaehlungen fasse ich in einem Block zusammen, dann passt nur der Anfang
    head = norm(first_sentence(needle))
    if len(head) >= 25:
        for i, txt in enumerate(pages):
            if head in txt:
                return i + 1, "erster Satz"
    # letzter Versuch: die ersten acht Woerter
    words = n.split()
    if len(words) >= 8:
        head = " ".join(words[:8])
        for i, txt in enumerate(pages):
            if head in txt:
                return i + 1, "Anfang"
    return None, "nicht gefunden"


def main(check_only=False):
    doc = pymupdf.open(PDF)
    pages = [norm(doc[i].get_text()) for i in range(doc.page_count)]

    data = json.loads(UNITS.read_text(encoding="utf-8"))
    stats, misses = {"wörtlich": 0, "erster Satz": 0, "Anfang": 0}, []

    for ch in data.get("chapters", []):
        for u in ch.get("units", []):
            for b in u.get("blocks", []):
                if b.get("type") != "en":
                    continue
                page, how = probe(b["text"], pages)
                if page is None:
                    misses.append((u["id"], b["text"][:70]))
                    b.pop("page", None)
                else:
                    stats[how] += 1
                    b["page"] = page

    for how, n in stats.items():
        print(f"  {how:<14} {n}")
    for uid, txt in misses:
        print(f"  ! nicht gefunden  {uid}: {txt} ...")

    if not check_only:
        UNITS.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"  Seiten in {UNITS.name} eingetragen")
    return 1 if misses else 0


if __name__ == "__main__":
    sys.exit(main("--check" in sys.argv))
