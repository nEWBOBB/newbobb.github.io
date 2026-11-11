# Inhalte des AI Learning Lab

Alles, was Lernende lesen und üben, liegt in diesem Ordner als Text. Die Plattform (`../index.html`, `../js/`,
`../lab.css`) enthält keinen Lernstoff. Ein neues Modul braucht deshalb keine Änderung an der Plattform, nur
einen Merge Request hier.

```
content/
  katalog.json          Stufen, Reihenfolge der Module, Challenges, Plugins, Communities, Galerie
  einstufung.json       Kontextfragen und Szenarien der Einstufung
  module/<id>.md        ein Modul pro Datei
  vorlage/modul-vorlage.md
../skills/modul-erstellen/SKILL.md   Skill, mit dem ein Coding Agent ein Modul erzeugt
../uebungs-repos/       Hands-on-Repos mit GitLab-CI-Prüfung
../daten/aggregat.json  aggregierte Kennzahlen für die Leitstelle (im Moment Beispieldaten)
```

## Ein neues Modul anlegen

1. `vorlage/modul-vorlage.md` nach `module/<id>.md` kopieren. Die `id` ist der Dateiname ohne `.md`.
2. Inhalte schreiben, von Hand oder mit dem Skill `modul-erstellen`. Ein Mensch prüft immer.
3. Die `id` in `katalog.json` bei der passenden Stufe unter `module` eintragen. Steht das Modul dort unter
   `geplant`, den Eintrag entfernen.
4. Lokal ansehen: `python3 -m http.server` im Ordner `learning-lab/`, dann `http://localhost:8000/#/modul/<id>`.
5. Merge Request stellen.

## Metadaten

Am Anfang jeder Moduldatei, zwischen zwei Zeilen `---`. Eine Angabe pro Zeile, Listen in eckigen Klammern.

| Feld | Pflicht | Bedeutung |
| --- | --- | --- |
| `id` | ja | wie der Dateiname |
| `titel` | ja | Überschrift des Moduls |
| `stufe` | ja | 1 bis 4 |
| `dauer` | ja | Minuten, 15 bis 30 |
| `lernziel` | ja | ein Satz, du-Form |
| `tools` | ja | für welche Tools es eine echte Anleitung gibt: `cursor`, `copilot`, `opencode` |
| `schutzklassen` | ja | wo das Modul gilt: `cloud`, `ec`, `vsnfd` |
| `verantwortlich` | ja | Team oder Person |
| `geprueft` | ja | Datum der letzten Überprüfung, `JJJJ-MM-TT`. Nach 90 Tagen gilt das Modul als veraltet. |
| `status` | nein | zum Beispiel „Entwurf, fachliches Review offen“. Weglassen, sobald geprüft. |
| `tool_versionen` | ja | auf welchem Stand der Tools geprüft wurde |
| `community` | nein | Schlüssel aus `katalog.json` → `communities`. Ohne Angabe: Community des gewählten Tools. |
| `hinweis` | nein | ein Satz, der über dem Modul als Kasten erscheint |

## Aufbau eines Moduls

Fünf Abschnitte mit genau diesen Überschriften:

1. `## Warum`: ein Satz Nutzen und ein Block `vergleich` mit `vorher:` und `nachher:`.
2. `## Konzept`: höchstens fünf Minuten Lesezeit, mit einem Block `diagramm`.
3. `## In deinem Tool`: Unterabschnitte `### Cursor`, `### GitHub Copilot`, `### OpenCode` und
   `### Selbst gehostete Modelle`. Fehlt eine Funktion in einem Tool, steht das dort, mit Alternative.
4. `## Übung`: ein oder mehrere Blöcke `uebung`.
5. `## Transfer`: was man diese Woche im eigenen Projekt ausprobiert.

Erlaubtes Markdown: Absätze, Listen, Tabellen, `> Merksätze`, Code-Blöcke, **fett**, *kursiv*, `Code`, Links.
HTML wird nicht ausgeführt, sondern als Text angezeigt.

### Diagramme

````
```diagramm
fluss: Schritt A -> Schritt B -> Schritt C
```

```diagramm
mitte: Agent
schleife: Lesen -> Wählen -> Ausführen -> Ansehen
```
````

## Übungen

Jede Übung ist ein Code-Block mit der Sprache `uebung` und JSON darin. Gemeinsame Felder: `typ`, `titel`,
`aufgabe` (Text oder Liste von Zeilen, Markdown erlaubt), `verweis` (wohin das Feedback bei einem Fehler
zeigt: `warum`, `konzept`, `tool` oder `modul:<id>`), `fazit` (Text bei Erfolg).

| `typ` | Weitere Felder |
| --- | --- |
| `entscheidung` | `fragen`: Liste aus `frage`, optional `mehrfach`, und `optionen` mit `text`, `richtig`, `erklaerung`. Die Optionen werden gemischt angezeigt. |
| `reihenfolge` | `schritte`: Liste in der richtigen Reihenfolge, wird gemischt angezeigt. Optional `tipp`. |
| `session` | `start`: Name des ersten Knotens. `knoten`: je Knoten `agent` (vorgefertigte Antwort) und `optionen` mit `prompt`, `ziel`, optional `kommentar`. Endknoten haben `ende` (`gut` oder `schlecht`) und `fazit`. |
| `fehler` | `zeilen`: Liste von Zeilen. Zeilen mit einem Fehler beginnen mit `!!`. `fehler`: je markierter Zeile in derselben Reihenfolge `warum`, optional `tipp` und `verweis`. `toleranz`: wie viele falsch markierte Zeilen erlaubt sind (Standard 1). |
| `artefakt` | `dateiname`, `vorlage`, `regeln`. Jede Regel hat `name`, `hinweis`, optional `verweis` und eine `art`: `muster` (regulärer Ausdruck muss vorkommen, optional `min`-mal), `verboten` (darf nicht vorkommen), `laenge` (`minWoerter`, `maxWoerter`, `maxZeilen`). |
| `handson` | `challenge`: Kennung einer Challenge aus `katalog.json`. |

Die Prüfung von Artefakten ist ein eigener Baustein (`LabUebung.bausteine.artefakt` in `../js/pruefer.js`).
Er arbeitet regelbasiert. Eine spätere Bewertung durch ein Sprachmodell ersetzt nur diese eine Funktion.

Gutes Feedback erklärt: Jede Option hat eine `erklaerung`, jede Regel einen `hinweis`, der sagt, was fehlt.

## Hands-on-Repos und Nachweis-Code

Ein Übungs-Repo enthält die Aufgabe, eine `.gitlab-ci.yml` und ein Prüfskript. Das Skript prüft die Kriterien
in der Reihenfolge, in der sie in `katalog.json` unter `challenge.kriterien` stehen, und gibt einen
Nachweis-Code aus:

```
LL-<Kennung>-<Pipeline-ID>-<Maske>-<Prüfsumme>
```

Die Maske ist eine zweistellige Hex-Zahl, Bit *n* steht für Kriterium *n*. Die Prüfsumme sind die ersten acht
Zeichen von SHA-256 über `ailab|<Kennung>|<Pipeline-ID>|<Maske>`. Der Code schützt vor Tippfehlern, nicht vor
Fälschung: Das Lab ist freiwillig und dient nicht der Bewertung. Eine automatische Rückmeldung per Webhook
ist im Zielbild vorgesehen und braucht einen Dienst hinter der Plattform.

Die Musterlösungen liegen getrennt unter `../uebungs-repos/_musterloesungen/`. Der Selbsttest
`python3 uebungs-repos/_musterloesungen/selbsttest.py` prüft, dass die Musterlösung besteht und das
unbearbeitete Repo durchfällt.

## Galerie, Use Cases, Plugins, Communities

Stehen in `katalog.json`. Links zu Teams-Communities und Marketplace-Plugins sind leer, bis die internen
Adressen eingetragen werden. Die Plattform zeigt dann einen Hinweis statt eines Links.

## Kennzahlen

`../daten/aggregat.json` beschreibt das Format, das die Leitstelle anzeigt: Verteilung P1 bis P4 gesamt und
pro Produktgruppe, Aufstiege mit Median der Tage, Abbruchstellen pro Modul. Gruppen unter `mindestgroesse`
werden nicht angezeigt. Die Datei enthält im Moment Beispieldaten.
