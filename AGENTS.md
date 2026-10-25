# Hinweise für KI-Agenten

Newbobb Lab ist eine statische GitHub-Pages-Seite mit interaktiven Lernseiten auf Deutsch (du-Form).
Jedes Thema liegt in einem eigenen Ordner (`thema/index.html` plus Skripte), verlinkt vom Hub `index.html`.

## Gestaltung: jedes neue Thema bekommt einen eigenen Stil

Neue Themenbereiche sollen nicht einfach das Aussehen der letzten Seite kopieren. Geh jedes Mal neu und mutig an
die Sache heran: Welche Form passt zu genau diesem Thema?

- **Eigene Bildsprache pro Themenbereich:** Farben, Typografie, Layout und Art der Visualisierung frei wählen.
  Beispiele: ein Labor-Notizbuch, eine Karte zum Erkunden, ein Spiel mit Leveln, eine Zeitreise, ein Terminal,
  eine Bastelwerkbank, eine Comic-Erzählung, ein 3D-Raum.
- **Neue Interaktionsformen ausprobieren:** nicht immer Text links und Regler rechts. Ziehen, malen, bauen,
  vorhersagen-und-prüfen, Szenarien durchspielen, Herausforderungen mit Punkten.
- **Innerhalb einer Reihe einheitlich bleiben:** Neue Teile einer bestehenden Reihe (z. B. „Verstehen“ mit
  `assets/verstehen.css`) passen sich ihr an. Der neue Stil gilt für neue Themenbereiche.

## Was überall gleich bleibt

- Inhalt zuerst: Jede Visualisierung soll den echten Mechanismus zeigen und wirklich etwas erklären.
- Läuft auf dem Handy (ab 360 px Breite, kein waagerechtes Scrollen) und mit Touch.
- Keine Build-Schritte nötig: reines HTML, CSS und JavaScript. Externe Skripte nur mit fester Versionsnummer.
- Barrierearm: lesbare Kontraste, Tastaturbedienung, `prefers-reduced-motion` respektieren.
- Ein Rückweg zum Hub (`../`) und ein Eintrag im Hub `index.html`.
- Vor dem Abschluss im Browser testen (Playwright ist vorinstalliert): keine Konsolenfehler, Screenshots prüfen.
