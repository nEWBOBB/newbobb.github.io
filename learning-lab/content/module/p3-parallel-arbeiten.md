---
id: p3-parallel-arbeiten
titel: Parallel arbeiten
stufe: 3
dauer: 30
lernziel: Du erkennst, welche Teilaufgaben unabhängig sind, lässt sie von mehreren Agents in eigenen Git-Worktrees bearbeiten und führst die Ergebnisse zusammen.
tools: [cursor, copilot, opencode]
schutzklassen: [cloud, ec, vsnfd]
verantwortlich: Service-Team Agentic Development
geprueft: 2026-11-11
status: Entwurf, fachliches Review offen
tool_versionen: Bedienhinweise Stand November 2026. Parallele Agents ändern sich in allen Tools gerade schnell, bitte gegen die Tool-Doku prüfen.
hinweis: Mustermodul für P3. Die übrigen Module dieser Stufe folgen nach dem MVP.
---

## Warum

Auf P2 arbeitet ein Agent, und du wartest. Auf P3 arbeiten mehrere gleichzeitig, und du bist nicht mehr der Engpass.

```vergleich
vorher: Vier Teilaufgaben, eine nach der anderen. Jede dauert zwanzig Minuten Agent-Zeit, dazwischen wartest du. Nach anderthalb Stunden bist du fertig.
nachher: Vier Agents in vier Worktrees, gleichzeitig. Nach fünfundzwanzig Minuten liegen vier Branches da. Du prüfst jeden gegen seine Kriterien und führst zusammen.
```

## Konzept

Parallel arbeiten heißt nicht, vier Chats zu öffnen. Es braucht drei Dinge: **unabhängige Teile**, **getrennte Arbeitsverzeichnisse** und **einen Plan für das Zusammenführen**.

```diagramm
fluss: Paket mit Kriterien -> In unabhängige Teile schneiden -> Je Teil ein Agent im eigenen Worktree -> Jeden Teil gegen Kriterien prüfen -> Zusammenführen und gemeinsam testen
```

**Unabhängig** sind zwei Teile, wenn sie nicht dieselben Dateien ändern und keiner auf das Ergebnis des anderen wartet. Die Probe: Könnten zwei Kollegen die Teile bearbeiten, ohne miteinander zu reden? Was beide brauchen, zum Beispiel eine gemeinsame Schnittstelle, legst du vorher fest oder ziehst es als ersten, einzelnen Schritt vor.

**Git-Worktrees** geben jedem Agent ein eigenes Verzeichnis mit eigenem Branch aus demselben Repo. So überschreibt keiner die Dateien des anderen.

```
git worktree add ../shop-versand -b feature/versand
git worktree add ../shop-rechnung -b feature/rechnung
git worktree list
git worktree remove ../shop-versand
```

**Sub-Agents** sind die leichtere Variante: Der Haupt-Agent gibt Teilaufgaben an Helfer ab, die mit eigenem Kontext arbeiten und nur das Ergebnis zurückmelden. Das eignet sich für Recherche und Analyse. Für parallele Änderungen am Code nimmst du Worktrees.

Die Zerlegung darfst du dem Agent überlassen: „Schneide dieses Paket in Teile, die sich parallel bearbeiten lassen. Nenne je Teil die Dateien.“ Die Liste der Dateien prüfst du auf Überschneidungen.

> Parallel kostet parallel. Vier Agents verbrauchen viermal so viele Token, und jeder liest das Repo neu. Aufgaben von wenigen Minuten bleiben interaktiv. Parallel lohnt sich ab Teilen, die jeweils eine Viertelstunde oder länger laufen.

## In deinem Tool

Die Cloud Agents von Cursor und Copilot sind nicht freigegeben. Parallel arbeitest du lokal.

### Cursor

- Cursor kann mehrere Agents nebeneinander laufen lassen und legt dafür auf Wunsch je Agent einen Git-Worktree an. Die Läufe siehst du in der Agent-Übersicht.
- Sub-Agents stößt der Haupt-Agent selbst an, wenn eine Teilaufgabe passt. Du kannst es ausdrücklich verlangen.
- Nicht verwenden: Cloud Agents, also Läufe, die bei Cursor in der Cloud statt auf deinem Rechner laufen.

### GitHub Copilot

- Im Agent-Modus kann Copilot Teilaufgaben an Sub-Agents abgeben, die mit eigenem Kontext arbeiten.
- Für parallele Änderungen legst du Worktrees selbst an und öffnest je Worktree ein eigenes VS-Code-Fenster mit eigenem Chat. Neuere Versionen bieten Hintergrund-Agents an, die das für dich übernehmen.
- Nicht verwenden: den Copilot Coding Agent auf github.com. Er ist ein Cloud Agent.

### OpenCode

- Lege die Worktrees mit `git worktree add` an und starte in jedem Verzeichnis ein eigenes `opencode`, am einfachsten in getrennten Terminal-Tabs.
- Sub-Agents rufst du mit `@` auf, zum Beispiel einen Helfer für Recherche. Eigene Sub-Agents definierst du im Ordner `.opencode/`.
- Für Läufe ohne Aufsicht eignet sich `opencode run "…"` je Worktree. Das ist schon der halbe Weg zu P4.

### Selbst gehostete Modelle

Die Cluster haben begrenzte Kapazität. Vier parallele Läufe teilen sich dieselben GPUs und werden jeder langsamer. Fang mit zwei Agents an. Schneide die Teile kleiner als in der Cloud und gib jedem Agent seinen eigenen, engen Plan mit.

## Übung

```uebung
{
	"typ": "entscheidung",
	"titel": "Was lässt sich parallel bearbeiten?",
	"aufgabe": [
		"Der Bestell-Dienst bekommt vier Erweiterungen. Die betroffenen Dateien:",
		"",
		"- **A · Expressversand:** `versand.py`, `lieferzeit.py`, `tests/test_versand.py`",
		"- **B · PDF-Rechnung in Englisch:** `pdf/vorlage.py`, `pdf/texte_en.py`, `tests/test_pdf.py`",
		"- **C · Versandkosten nach Zone:** `versand.py`, `zonen.py`, `tests/test_versand.py`",
		"- **D · Doku der Schnittstelle:** `docs/api.md`"
	],
	"verweis": "konzept",
	"fragen": [
		{
			"frage": "Welche Teile kannst du gleichzeitig in eigenen Worktrees starten?",
			"mehrfach": true,
			"optionen": [
				{ "text": "A und B", "richtig": true, "erklaerung": "Keine gemeinsame Datei, keiner wartet auf den anderen." },
				{ "text": "A und C", "erklaerung": "Beide ändern `versand.py` und `tests/test_versand.py`. Das gibt Konflikte beim Zusammenführen, und fachlich hängen sie zusammen." },
				{ "text": "B und C", "richtig": true, "erklaerung": "PDF und Versandzonen berühren sich nicht." },
				{ "text": "B und D", "richtig": true, "erklaerung": "Doku und PDF-Vorlage sind unabhängig." }
			]
		},
		{
			"frage": "A und C ändern beide `versandkosten()`. Wie gehst du damit um?",
			"optionen": [
				{ "text": "Trotzdem parallel starten und die Konflikte am Ende vom Agent lösen lassen.", "erklaerung": "Der Agent löst den Textkonflikt, aber niemand hat entschieden, wie Zone und Express zusammen rechnen. Das Ergebnis ist Zufall." },
				{ "text": "Erst die gemeinsame Schnittstelle festlegen, dann A und C nacheinander oder auf dieser Basis starten.", "richtig": true, "erklaerung": "Was beide brauchen, wird vorgezogen. Danach sind die Teile kleiner und klar getrennt." },
				{ "text": "A und C in einem einzigen großen Auftrag zusammenlegen und dafür B und D weglassen.", "erklaerung": "B und D sind unabhängig und können sofort parallel laufen. Nur A und C brauchen eine Reihenfolge." }
			]
		},
		{
			"frage": "Teil D dauert geschätzt drei Minuten. Lohnt sich ein eigener Worktree mit eigenem Agent?",
			"optionen": [
				{ "text": "Ja, parallel ist immer schneller.", "erklaerung": "Anlegen, Starten, Prüfen und Zusammenführen kosten mehr als die drei Minuten. Und jeder Agent liest das Repo neu." },
				{ "text": "Nein. Kurze Aufgaben bleiben interaktiv.", "richtig": true, "erklaerung": "Parallel lohnt sich ab Teilen, die länger laufen. D erledigst du nebenbei im Chat." }
			]
		}
	]
}
```

```uebung
{
	"typ": "reihenfolge",
	"titel": "Zwei Agents, zwei Worktrees",
	"aufgabe": "Bring die Schritte in die richtige Reihenfolge.",
	"verweis": "konzept",
	"schritte": [
		"Paket in Teile schneiden und Dateilisten auf Überschneidungen prüfen",
		"Je Teil einen Worktree mit eigenem Branch anlegen",
		"In jedem Worktree einen Agent mit eigenem Auftrag und Kriterien starten",
		"Jeden Branch einzeln gegen seine Kriterien prüfen",
		"Branches zusammenführen und die gesamte Test-Suite laufen lassen",
		"Worktrees entfernen"
	],
	"tipp": "Geprüft wird zweimal: jeder Teil für sich und danach alles zusammen.",
	"fazit": "Genau so: schneiden, isolieren, starten, einzeln prüfen, zusammenführen, aufräumen."
}
```

## Transfer

Probier das diese Woche in deinem Projekt:

- Nimm ein Paket aus deinem Backlog und lass den Agent Teile mit Dateilisten vorschlagen. Wie viele sind wirklich unabhängig?
- Starte zwei davon in zwei Worktrees. Notiere Dauer und Verbrauch im Vergleich zur Arbeit nacheinander.
- Die Level-Up-Challenge von P2 nach P3 verlangt genau das, dazu einen eigenen Skill. Sie ist in Vorbereitung.
