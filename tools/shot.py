import pathlib, sys
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent.parent
url  = (root / "dist" / "lernen.html").as_uri()
out  = root / "build" / "shots"
out.mkdir(parents=True, exist_ok=True)
errors = []

def run(pw, theme, suffix):
    b = pw.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                    color_scheme=theme)
    pg.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.goto(url); pg.wait_for_timeout(400)

    for tab, name in [("learn", "1-lernen"), ("quiz", "2-fragen"), ("vocab", "3-vokabeln")]:
        pg.click(f'nav.tabs button[data-tab="{tab}"]'); pg.wait_for_timeout(250)
        pg.screenshot(path=str(out / f"{name}{suffix}.png"))

    pg.click('nav.tabs button[data-tab="quiz"]'); pg.wait_for_timeout(150)
    pg.click("#quiz-go"); pg.wait_for_timeout(250)
    pg.click("#help"); pg.wait_for_timeout(150)
    pg.click(".opt"); pg.wait_for_timeout(250)
    pg.screenshot(path=str(out / f"5-antwort{suffix}.png"))

    # Runde zu Ende klicken. Sichtbarkeit pruefen, nicht blosse Existenz:
    # nach dem Abschluss bleibt der alte Knopf im DOM, nur versteckt.
    for _ in range(30):
        nxt = pg.locator("#next")
        if nxt.count() and nxt.is_visible():
            nxt.click(); pg.wait_for_timeout(220)
        if pg.locator("#quiz-done").is_visible():
            break
        opts = pg.locator(".opt:not([disabled])")
        if opts.count() and opts.first.is_visible():
            opts.first.click(); pg.wait_for_timeout(220)
    pg.wait_for_timeout(900)
    pg.screenshot(path=str(out / f"7-ergebnis{suffix}.png"))

    pg.click('nav.tabs button[data-tab="vocab"]'); pg.wait_for_timeout(150)
    pg.click('#vocab-modes button[data-m="cards"]'); pg.wait_for_timeout(200)
    pg.click("#c-show"); pg.wait_for_timeout(200)
    pg.screenshot(path=str(out / f"6-karte{suffix}.png"))
    b.close()

with sync_playwright() as p:
    run(p, "light", "")
    run(p, "dark", "-dunkel")

print("Screenshots:", ", ".join(sorted(f.name for f in out.glob("*.png"))))
print("JS-Fehler:", errors if errors else "keine")
sys.exit(1 if errors else 0)
