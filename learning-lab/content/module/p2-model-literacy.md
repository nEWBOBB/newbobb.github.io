---
id: p2-model-literacy
titel: Model Literacy
stufe: 2
dauer: 20
lernziel: Du wählst das Modell nach Länge und Schwierigkeit der Aufgabe und nach Kosten und weißt, was sich bei selbst gehosteten Modellen ändert.
tools: [cursor, copilot, opencode]
schutzklassen: [cloud, ec, vsnfd]
verantwortlich: Service-Team Agentic Development
geprueft: 2026-11-11
status: Entwurf, fachliches Review offen
tool_versionen: Bedienhinweise Stand November 2026. Modellnamen ändern sich schnell und stehen deshalb bewusst nicht im Modul.
community: llms
---

## Warum

Das stärkste Modell für alles zu nehmen ist teuer und langsam. Das schwächste für alles zu nehmen kostet dich Nacharbeit.

```vergleich
vorher: Du nimmst, was voreingestellt ist. Eine Umbenennung über drei Dateien dauert vier Minuten und kostet so viel wie eine Architekturentscheidung. Eine knifflige Fehlersuche scheitert am schnellen Modell.
nachher: Planung und Fehlersuche gehen an ein starkes Modell, Routine an ein schnelles. Du bist schneller fertig und verbrauchst weniger Budget.
```

## Konzept

Modelle unterscheiden sich in drei Dingen, die du abwägst.

| Eigenschaft | Starkes Modell | Schnelles Modell |
| --- | --- | --- |
| **Lange Aufgaben** | hält viele Schritte durch und behält das Ziel | verliert bei langen Läufen eher den Faden |
| **Schwieriges** | findet verdeckte Ursachen, wägt Entwürfe ab | gut bei klaren, eng beschriebenen Aufgaben |
| **Kosten und Tempo** | teurer pro Token, langsamer | günstig, antwortet schnell |

```diagramm
fluss: Wie lang ist die Aufgabe? -> Wie schwer ist sie? -> Wie teuer darf sie sein? -> Modell wählen
```

Eine brauchbare Faustregel:

- **Planen, Fehlersuche, Entwurf, unbekannter Code:** starkes Modell. Ein guter Plan spart mehr, als das Modell kostet.
- **Umsetzen nach klarem Plan, Tests ergänzen, Umbenennen, Doku:** schnelles Modell.
- **Erst planen mit dem starken, dann umsetzen mit dem schnellen Modell** ist oft die beste Kombination.

Zwei Begriffe, die du kennen solltest:

- **Token:** die Einheit, in der Modelle Text lesen und schreiben. Bezahlt wird pro Token, und alles im Kontext zählt bei jedem Schritt mit.
- **Kontextfenster:** wie viel ein Modell gleichzeitig sehen kann. Ist es voll, wird Älteres zusammengefasst oder fällt heraus. Lange Chats werden dadurch ungenauer. Starte für eine neue Aufgabe einen neuen Chat.

**Cloud oder selbst gehostet** entscheidet nicht dein Geschmack, sondern die Schutzklasse. Selbst gehostete Modelle wie Qwen oder GLM sind kleiner als die großen Cloud-Modelle. Sie leisten gute Arbeit bei engen, gut beschriebenen Aufgaben und brauchen mehr Führung bei langen.

> Die Modelle erreichst du über LiteLLM. Dort wird der Verbrauch gezählt. Welche Modelle es aktuell gibt, steht in der Doku des Service Model Deployment.

## In deinem Tool

### Cursor

- Das Modell wählst du im Modell-Menü unter dem Eingabefeld, pro Chat.
- Die automatische Auswahl ist ein guter Standard für Routine. Für Planung und Fehlersuche stellst du gezielt ein starkes Modell ein.
- Den Verbrauch siehst du in den Einstellungen und im Dashboard deines Kontos.

### GitHub Copilot

- Das Modell wählst du im Modell-Menü im Chat.
- Modelle haben unterschiedliche Gewichte beim Verbrauch: Eine Anfrage an ein starkes Modell zählt mehrfach, manche einfachen Modelle zählen gar nicht.
- Den Stand deines Kontingents zeigt das Copilot-Symbol in der Statusleiste.

### OpenCode

- Mit `/models` wechselst du das Modell im laufenden Chat.
- In `opencode.json` legst du ein Standardmodell fest und kannst einzelnen Agents eigene Modelle geben, zum Beispiel ein starkes für Plan und ein schnelles für Build.
- OpenCode zeigt Token-Verbrauch und Kosten der Session an.

### Selbst gehostete Modelle

Was du anders machst als mit großen Cloud-Modellen:

- **Mehr planen:** Lass den Plan in kleine Schritte schneiden und setz Schritt für Schritt um.
- **Enger beauftragen:** eine Datei, eine Funktion, ein Kriterium pro Auftrag.
- **Mehr Kontext geben:** Nenne Dateien und Befehle ausdrücklich, statt sie suchen zu lassen.
- **Öfter neu starten:** Kurze Chats halten das Kontextfenster frei.
- **Strenger prüfen:** Lass nach jedem Schritt die Tests laufen.

## Übung

```uebung
{
	"typ": "entscheidung",
	"titel": "Welches Modell für welche Aufgabe?",
	"verweis": "konzept",
	"fragen": [
		{
			"frage": "In vierzig Dateien soll die Funktion `calc_total` in `berechne_summe` umbenannt werden. Der Plan steht.",
			"optionen": [
				{ "text": "Starkes Modell, sicher ist sicher.", "erklaerung": "Die Aufgabe ist klar und mechanisch. Das starke Modell macht sie nicht besser, nur teurer und langsamer." },
				{ "text": "Schnelles Modell.", "richtig": true, "erklaerung": "Eng beschrieben, mechanisch, leicht prüfbar. Dafür reicht ein schnelles Modell." }
			]
		},
		{
			"frage": "Ein Test schlägt nur manchmal fehl, und nur in der Pipeline. Niemand weiß, warum.",
			"optionen": [
				{ "text": "Starkes Modell.", "richtig": true, "erklaerung": "Verdeckte Ursache, viele Hypothesen, langer Lauf. Hier zahlt sich das starke Modell aus." },
				{ "text": "Schnelles Modell, und wenn es nicht klappt, noch einmal.", "erklaerung": "Drei gescheiterte Versuche mit dem schnellen Modell kosten mehr Zeit als ein Lauf mit dem starken." }
			]
		},
		{
			"frage": "Du arbeitest in einem VS-NfD-Projekt mit einem selbst gehosteten Modell. Ein Feature betrifft sechs Dateien.",
			"optionen": [
				{ "text": "Alles in einem Auftrag übergeben, wie ich es vom Cloud-Modell kenne.", "erklaerung": "Kleinere Modelle verlieren bei langen Läufen eher das Ziel. Das Ergebnis wird lückenhaft." },
				{ "text": "Einen Plan in kleinen Schritten erstellen lassen und Schritt für Schritt umsetzen, mit Tests nach jedem Schritt.", "richtig": true, "erklaerung": "Mehr Planung, engere Aufträge, mehr Prüfung: So liefern selbst gehostete Modelle zuverlässig." },
				{ "text": "Für diese Aufgabe ausnahmsweise ein Cloud-Modell nehmen.", "erklaerung": "Die Schutzklasse entscheidet. In VS-NfD sind nur selbst gehostete Modelle erlaubt." }
			]
		},
		{
			"frage": "Dein Chat läuft seit zwei Stunden über drei verschiedene Aufgaben. Die Antworten werden ungenauer.",
			"optionen": [
				{ "text": "Auf ein stärkeres Modell wechseln.", "erklaerung": "Das Problem ist das volle Kontextfenster, nicht das Modell. Auch das starke Modell sieht dann nur eine Zusammenfassung." },
				{ "text": "Einen neuen Chat für die nächste Aufgabe starten.", "richtig": true, "erklaerung": "Ein frischer Kontext enthält nur, was zur Aufgabe gehört. Dauerhaftes Wissen steht in der `AGENTS.md`." },
				{ "text": "Den Agent bitten, sich besser zu konzentrieren.", "erklaerung": "Das ändert nichts daran, was im Kontextfenster liegt." }
			]
		}
	]
}
```

## Transfer

Probier das diese Woche in deinem Projekt:

- Wechsle bewusst: Plane eine Aufgabe mit einem starken Modell und setz sie mit einem schnellen um. Merkst du einen Unterschied im Ergebnis?
- Sieh einmal nach, was eine typische Session bei dir verbraucht.
- Fang für jede neue Aufgabe einen neuen Chat an.
