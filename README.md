# canada-pal-learn

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

## Quelle

RCMP, Canadian Firearms Safety Course Student Handbook.
Crown Copyright. Vervielfältigung für den privaten, nichtkommerziellen Gebrauch.
