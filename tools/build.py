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


def load_content():
    bundle = {}
    for name in ("units", "questions", "vocab"):
        p = CONTENT / f"{name}.json"
        if not p.exists():
            print(f"  ! {p.name} fehlt, wird leer eingesetzt")
            bundle[name] = {}
            continue
        bundle[name] = json.loads(p.read_text(encoding="utf-8"))
    return bundle


def embed_images(html):
    """src="assets/x.webp" -> src="data:image/webp;base64,..." """
    missing = []

    def repl(m):
        rel = m.group(1)
        f = ROOT / rel
        if not f.exists():
            missing.append(rel)
            return m.group(0)
        mime = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
        b64 = base64.b64encode(f.read_bytes()).decode("ascii")
        return f'src="data:{mime};base64,{b64}"'

    html = re.sub(r'src="(assets/[^"]+)"', repl, html)
    for rel in sorted(set(missing)):
        print(f"  ! Bild fehlt: {rel}")
    return html


def main():
    tpl = (SRC / "index.html").read_text(encoding="utf-8")
    css = (SRC / "app.css").read_text(encoding="utf-8")
    js  = (SRC / "app.js").read_text(encoding="utf-8")
    content = json.dumps(load_content(), ensure_ascii=False, separators=(",", ":"))

    fonts = (SRC / "fonts.css").read_text(encoding="utf-8")
    html = tpl.replace("/*INJECT_FONTS*/", fonts)
    html = html.replace("/*INJECT_CSS*/", css)
    html = html.replace("/*INJECT_CONTENT*/", content)
    html = html.replace("/*INJECT_JS*/", js)
    html = embed_images(html)

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
