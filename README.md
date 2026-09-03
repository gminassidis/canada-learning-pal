# canada-learning-pal

Private Lernhilfe für den **Canadian Firearms Safety Course** (CFSC, nur non-restricted)
und den anschließenden PAL. Oberfläche auf Deutsch, alle Fachbegriffe mit dem
englischen Original, weil Kurs und Prüfung auf Englisch laufen.

Nur für den privaten Gebrauch.

## Aufbau

    content/     Inhalte als JSON, getrennt von der Darstellung
      units.json      Lerneinheiten (englisches Original + deutsche Erklärung)
      questions.json  Fragenpool, jede Frage mit Fundstelle im Handbuch
      vocab.json      Vokabeln in drei Kategorien
    assets/      Abbildungen, aus dem Handbuch extrahiert
    src/         App (HTML, CSS, JS), unkompiliert
    tools/
      extract.py   PDF nach Text und Bildern zerlegen
      build.py     alles zu einer einzigen Datei bündeln
    dist/
      lernen.html  fertige App, eine Datei, läuft offline
    src-pdf/     Quell-PDFs (nicht im Repo, siehe .gitignore)

## Bauen

    python3 tools/build.py

Ergebnis ist `dist/lernen.html`, eine einzelne Datei mit eingebetteten Bildern.
Lässt sich per Mail verschicken, auf dem Handy öffnen und funktioniert ohne Netz.

## Inhaltliche Regeln

1. **Keine Frage ohne Fundstelle.** Jedes Item in `questions.json` trägt ein Feld
   `source` mit der Seite im RCMP Student Handbook. Was nicht belegbar ist, kommt raus.
2. **Uebungsfragen, keine echten Prüfungsfragen.** Der echte Fragenpool ist nicht
   öffentlich. Die Items hier sind aus den prüfbaren Aussagen des Handbuchs abgeleitet.
3. **Englisch ist das Original.** Deutsche Texte sind Erklärung, nicht Ersatz.
   Englische Passagen stehen wörtlich da und sind immer gleich ausgezeichnet.
4. **Vokabeln nur Englisch nach Deutsch.** Er muss wiedererkennen, nicht produzieren.

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
3. Abbildungen und englische Passagen sind unverändert übernommen. Deutsche
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
