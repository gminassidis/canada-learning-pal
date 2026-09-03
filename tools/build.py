#!/usr/bin/env python3
"""Bündelt src/ und content/ zu einer einzigen Datei dist/lernen.html.

Bilder werden als data-URI eingebettet, damit die Datei offline funktioniert
und sich per Mail verschicken lässt.
"""
import base64, json, mimetypes, pathlib, re, sys

ROOT    = pathlib.Path(__file__).resolve().parent.parent
SRC     = ROOT / "src"
CONTENT = ROOT / "content"
ASSETS  = ROOT / "assets"
OUT     = ROOT / "dist" / "lernen.html"
PAGES   = ROOT / "index.html"   # GitHub Pages bedient die Wurzel

LIMIT_MB = 16  # Grenze, wenn die Datei als Artifact veröffentlicht wird

# Adresse des Handbuchs. Absolut, damit die Verweise auch aus der
# verschickten Einzeldatei heraus funktionieren, nicht nur auf Pages.
PDF_URL = ("https://gminassidis.github.io/canada-learning-pal/"
           "docs/CFSC-CRFSC-Manual-eng.pdf")


def load_content():
    bundle = {}
    for name in ("units", "questions", "vocab"):
        p = CONTENT / f"{name}.json"
        if not p.exists():
            print(f"  ! {p.name} fehlt, wird leer eingesetzt")
            bundle[name] = {}
            continue
        bundle[name] = json.loads(p.read_text(encoding="utf-8"))
    bundle["meta"] = {"pdfUrl": PDF_URL}
    return bundle


def data_uri(rel):
    """assets/x.webp -> data:image/webp;base64,... Gibt None zurueck, wenn es fehlt."""
    f = ROOT / rel
    if not f.exists():
        return None
    mime = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
    return f"data:{mime};base64,{base64.b64encode(f.read_bytes()).decode('ascii')}"


def embed_images(bundle, html):
    """Bilder einbetten, damit die fertige Datei offline laeuft.

    Die Pfade stehen in den Inhalten, nicht im HTML: die App baut das
    img-Tag erst zur Laufzeit. Deshalb wird hier der Inhalt umgeschrieben,
    nicht der Text der Seite. Der Durchlauf ueber das HTML bleibt fuer
    Bilder, die direkt in der Vorlage stehen.
    """
    missing, n = [], 0

    for ch in bundle.get("units", {}).get("chapters", []) or []:
        for u in ch.get("units", []) or []:
            if u.get("img"):                       # Zierbild der Auftaktseite
                uri = data_uri(u["img"])
                if uri is None:
                    missing.append(u["img"])
                else:
                    u["img"] = uri
                    n += 1
            for b in u.get("blocks", []) or []:
                if b.get("type") != "img":
                    continue
                uri = data_uri(b["src"])
                if uri is None:
                    missing.append(b["src"])
                else:
                    b["src"] = uri
                    n += 1

    def repl(m):
        uri = data_uri(m.group(1))
        if uri is None:
            missing.append(m.group(1))
            return m.group(0)
        return f'src="{uri}"'

    html = re.sub(r'src="(assets/[^"]+)"', repl, html)

    for rel in sorted(set(missing)):
        print(f"  ! Bild fehlt: {rel}")
    if n:
        print(f"  {n} Abbildungen eingebettet")
    return html


# Aussagen darueber, was in der Pruefung vorkommt, sind aus dem Handbuch nicht
# belegbar. Zulaessig ist nur der Verweis auf eine Review-Frage, die dort steht.
CLAIM = re.compile(
    r"(in der Pr\u00fcfung|im praktischen Teil|im schriftlichen Teil|im Kurs abgefragt|"
    r"Pr\u00fcfungsfrage|pr\u00fcfungsrelevant|werden abgefragt|erfahrungsgem\u00e4\u00df|"
    r"beliebte Frage)", re.IGNORECASE)


def claims(units):
    out = []
    for ch in units:
        for u in ch.get("units", []):
            for blk in u.get("blocks", []):
                if blk.get("type") != "de":
                    continue
                for sent in re.split(r"(?<=[.!?:])\s+", blk["text"]):
                    if CLAIM.search(sent) and "Review-Frage" not in sent:
                        out.append((u["id"], sent.strip()))
    return out


def check(bundle):
    """Inhaltliche Pruefung. Faengt genau die Fehler, die man beim Einpflegen macht."""
    units = bundle.get("units", {}).get("chapters", []) or []
    qs    = bundle.get("questions", {}).get("questions", []) or []
    terms = bundle.get("vocab", {}).get("terms", []) or []

    unit_ids = {u["id"] for ch in units for u in ch.get("units", [])}
    term_ids = {t["id"] for t in terms}
    problems = []

    for ch in units:
        for u in ch.get("units", []):
            for b in u.get("blocks", []):
                if b["type"] == "terms":
                    for tid in b.get("ids", []):
                        if tid not in term_ids:
                            problems.append(f'{u["id"]}: Begriff "{tid}" gibt es nicht')
                if b["type"] == "img":
                    if not (ROOT / b["src"]).exists():
                        problems.append(f'{u["id"]}: Bild {b["src"]} fehlt')
            if u.get("img") and not (ROOT / u["img"]).exists():
                problems.append(f'{u["id"]}: Zierbild {u["img"]} fehlt')
            if not u.get("source"):
                problems.append(f'{u["id"]}: keine Fundstelle')

    seen = set()
    for q in qs:
        if q["id"] in seen:
            problems.append(f'{q["id"]}: doppelte Fragennummer')
        seen.add(q["id"])
        if q.get("unit") and q["unit"] not in unit_ids:
            problems.append(f'{q["id"]}: Lerneinheit "{q["unit"]}" gibt es nicht')
        if not q.get("source"):
            problems.append(f'{q["id"]}: keine Fundstelle')
        if q["type"] == "mc":
            n = sum(1 for o in q.get("options", []) if o.get("correct"))
            if n != 1:
                problems.append(f'{q["id"]}: {n} richtige Antworten, genau eine erwartet')
            for o in q.get("options", []):
                if not o.get("whyDe"):
                    problems.append(f'{q["id"]}: Option ohne Begruendung')
        elif q["type"] == "tf":
            if not isinstance(q.get("answer"), bool):
                problems.append(f'{q["id"]}: answer muss true oder false sein')
            if not q.get("whyDe"):
                problems.append(f'{q["id"]}: keine Begruendung')

    for uid, sent in claims(units):
        problems.append(f'{uid}: unbelegte Aussage zur Pruefung: "{sent[:70]}"')

    offen = [t["id"] for t in terms if t.get("verify")]
    return problems, offen


def main():
    bundle = load_content()
    problems, offen = check(bundle)
    for m in problems:
        print(f"  ! {m}")
    if problems:
        print(f"  {len(problems)} Probleme, Bau abgebrochen")
        return 1
    if offen:
        print(f"  {len(offen)} Begriffe noch gegen das Handbuch zu pruefen")

    tpl = (SRC / "index.html").read_text(encoding="utf-8")
    css = (SRC / "app.css").read_text(encoding="utf-8")
    js  = (SRC / "app.js").read_text(encoding="utf-8")

    # Bilder zuerst: sie stecken in den Inhalten und muessen vor dem
    # Serialisieren zu data-URIs werden.
    tpl = embed_images(bundle, tpl)
    content = json.dumps(bundle, ensure_ascii=False, separators=(",", ":"))

    fonts = (SRC / "fonts.css").read_text(encoding="utf-8")
    html = tpl.replace("/*INJECT_FONTS*/", fonts)
    html = html.replace("/*INJECT_CSS*/", css)
    html = html.replace("/*INJECT_CONTENT*/", content)
    html = html.replace("/*INJECT_JS*/", js)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    PAGES.write_text(html, encoding="utf-8")          # gleiche Datei, fuer Pages
    (ROOT / ".nojekyll").write_text("", encoding="utf-8")

    mb = OUT.stat().st_size / 1024 / 1024
    c = json.loads(content)
    nq = len(c.get("questions", {}).get("questions", []) or [])
    nv = len(c.get("vocab", {}).get("terms", []) or [])
    nu = sum(len(ch.get("units", []) or [])
             for ch in c.get("units", {}).get("chapters", []) or [])

    print(f"  {OUT.relative_to(ROOT)} und index.html  {mb:.2f} MB")
    print(f"  {nu} Lerneinheiten, {nq} Fragen, {nv} Vokabeln")
    if mb > LIMIT_MB:
        print(f"  ! über {LIMIT_MB} MB, Bilder stärker komprimieren")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
