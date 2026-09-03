# canada-learning-pal

Private Lernhilfe für den **Canadian Firearms Safety Course** (CFSC, nur non-restricted)
und den anschließenden PAL. Oberfläche auf Deutsch, alle Fachbegriffe mit dem
englischen Original, weil Kurs und Prüfung auf Englisch laufen.

Nur für den privaten Gebrauch.

## Stand

Alle elf Module des CFSC-Teils sind erfasst, Seite 18 bis 214 des Handbuchs.

| | |
|---|---:|
| Module | 11, dazu die Einführung |
| Lerneinheiten | 52, plus 12 Auftaktseiten |
| Übungsfragen | 149, jede mit Seitenzahl |
| Vokabeln | 299 |
| Abbildungen aus dem Handbuch | 94 |
| Englische Zitate | 223, alle im Handbuch belegt |

Der Restricted-Teil, also die Module 12 bis 17, ist bewusst nicht enthalten.
Er gehört zum CRFSC, einem eigenen Kurs.

## Aufbau

    content/     Inhalte als JSON, getrennt von der Darstellung
      units.json      Lerneinheiten (englisches Original + deutsche Erklärung)
      questions.json  Fragenpool, jede Frage mit Fundstelle im Handbuch
      vocab.json      Vokabeln in drei Kategorien
    assets/      Abbildungen, aus dem Handbuch extrahiert
    docs/        Das Handbuch als PDF
    src/         App (HTML, CSS, JS), unkompiliert
    tools/
      extract.py   PDF nach Text und Bildern zerlegen
      figures.py   einzelne Abbildungen nach assets/ holen
      locate.py    jedes englische Zitat im PDF wiederfinden
      build.py     prüfen und alles zu einer Datei bündeln
      shot.py      die fertige App im Browser durchklicken
    index.html   fertige App für GitHub Pages
    dist/
      lernen.html  dieselbe Datei zum Verschicken

## Bauen

    python3 tools/build.py

Ergebnis ist `index.html` und `dist/lernen.html`, eine einzelne Datei mit
eingebetteten Schriften und Bildern. Läuft offline auf dem Handy.

`tools/build.py` prüft vorher den Inhalt und bricht bei Problemen ab: zeigt jeder
Begriffsverweis auf einen vorhandenen Begriff, hat jede Multiple-Choice-Frage genau
eine richtige Antwort, trägt jede Frage eine Fundstelle, fehlt eine Abbildung.

`tools/locate.py` sucht jedes englische Zitat im PDF-Text und trägt die gefundene
Seite ein. Das verlinkt die Zitate seitengenau ins Handbuch und prüft nebenbei, ob
wirklich wörtlich zitiert wurde. Zwei Paraphrasen sind so aufgefallen und wurden
korrigiert.

## Die drei Bereiche

**Lernen.** Elf Module, jedes mit Auftaktseite. In den Einheiten wechseln englische
Originalsätze und deutsche Erklärung ab. Jedes Zitat verweist seitengenau ins PDF.
Eine Leiste oben zeigt, wo man steht und wo das nächste Modul anfängt.

**Fragen.** Zwei Modi. Beim Üben werden 20 Fragen aus dem gewählten Bereich
gestellt, mit deutscher Hilfe auf Knopfdruck und sofortiger Begründung. Die
Prüfungssimulation stellt 50 Fragen aus allen Modulen, ohne deutsche Hilfe und ohne
Zwischenergebnis, mit Auswertung und Fehlerdurchsicht am Ende.

**Vokabeln.** Liste mit Suche, oder Karten im Leitner-Verfahren. Die Intervalle sind
auf wenige Tage getrimmt: 10 Minuten, 1 Stunde, 4 Stunden, 1 Tag, 2 Tage.

## Quelle und Nutzung

Inhaltliche Grundlage ist das **Canadian Firearms Safety Course Student Handbook**,
herausgegeben von der Royal Canadian Mounted Police (RCMP), Ausgabe 2014.
Die hier abgelegte Fassung deckt CFSC und CRFSC ab und liegt unter `docs/`.

Offizielle Stellen:

- Canadian Firearms Program der RCMP: <https://www.rcmp-grc.gc.ca/cfp>
- Telefon 1-800-731-4000
- Die Publikation ist über <https://publications.gc.ca> frei erhältlich

Crown Copyright, Regierung von Kanada. Die Wiedergabe erfolgt für den privaten,
nichtkommerziellen Gebrauch nach der Standardklausel zur nichtkommerziellen
Vervielfältigung von Regierungspublikationen. Deren drei Bedingungen werden
eingehalten:

1. Die RCMP ist als Quelle genannt, hier und in der App selbst.
2. Diese Seite ist **keine offizielle Fassung** und steht in keiner Verbindung
   zur RCMP oder zum Canadian Firearms Program.
3. Die Abbildungen stammen unverändert aus dem Handbuch. Die englischen Passagen
   sind wörtliche Auszüge: Aufzählungen sind zu einem Absatz zusammengefasst,
   Querverweise wie `(Figure 18)` weggelassen, einzelne Stellen gekürzt. Jedes
   Zitat trägt die Seitenzahl, dort steht der vollständige Wortlaut. Deutsche
   Texte sind Erklärung, keine amtliche Übersetzung.

**Die Übungsfragen sind keine echten Prüfungsfragen.** Der Fragenpool der
Prüfung ist nicht öffentlich. Die Fragen hier sind aus den prüfbaren Aussagen
des Handbuchs abgeleitet und tragen jeweils die Seitenzahl.

Die Ausgabe ist von 2014. Einzelne Rechtsvorschriften haben sich seither
geändert. Im Zweifel gilt, was der Kursleiter sagt.

## Lizenz

Für dieses Repository gibt es bewusst **keine Open-Source-Lizenz**. Es enthält
zwei Dinge mit unterschiedlicher Rechtslage: eigenen Code unter `src/` und
`tools/`, und Material der Regierung von Kanada unter `docs/` und `assets/`.
Eine pauschale Lizenzdatei würde so aussehen, als stünde auch das Handbuch
darunter, und das wäre falsch.

Der Code ist privater Kram für einen einzigen Zweck. Wer ihn brauchen kann,
soll fragen.
