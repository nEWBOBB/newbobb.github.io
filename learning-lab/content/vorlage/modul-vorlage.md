---
id: pX-kurzer-name
titel: Titel des Moduls
stufe: 1
dauer: 20
lernziel: Ein Satz in du-Form. Was kannst du nach dem Modul, das du vorher nicht konntest?
tools: [cursor, copilot, opencode]
schutzklassen: [cloud, ec, vsnfd]
verantwortlich: Team oder Person
geprueft: 2026-01-01
status: Entwurf, fachliches Review offen
tool_versionen: Auf welchem Stand der Tools die Bedienhinweise geprüft wurden
community: llms-entwickler
---

## Warum

Ein Satz zum Nutzen.

```vergleich
vorher: Eine konkrete Situation ohne das Gelernte.
nachher: Dieselbe Situation mit dem Gelernten.
```

## Konzept

Höchstens fünf Minuten Lesezeit. Ein Diagramm statt drei Absätzen.

```diagramm
fluss: Erster Schritt -> Zweiter Schritt -> Dritter Schritt
```

> Ein Merksatz, der hängen bleiben soll.

## In deinem Tool

### Cursor

So geht es in Cursor. Fehlt die Funktion, steht das hier, zusammen mit der nächstbesten Alternative.

### GitHub Copilot

So geht es in Copilot.

### OpenCode

So geht es in OpenCode.

### Selbst gehostete Modelle

Was sich mit kleineren, selbst gehosteten Modellen ändert.

## Übung

```uebung
{
	"typ": "entscheidung",
	"titel": "Titel der Übung",
	"verweis": "konzept",
	"fragen": [
		{
			"frage": "Eine Situation. Was tust du?",
			"optionen": [
				{ "text": "Die beste Vorgehensweise", "richtig": true, "erklaerung": "Warum sie zum guten Ergebnis führt." },
				{ "text": "Eine naheliegende, aber schwächere Vorgehensweise", "erklaerung": "Was dabei schiefgeht." }
			]
		}
	]
}
```

## Transfer

Probier das diese Woche in deinem Projekt:

- Eine kleine, konkrete Aufgabe.
- Ein passendes Plugin oder ein Community-Beitrag.
