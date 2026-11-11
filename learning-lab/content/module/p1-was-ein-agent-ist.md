---
id: p1-was-ein-agent-ist
titel: Was ein Agent ist
stufe: 1
dauer: 20
lernziel: Du kannst erklären, woraus ein Agent besteht, und erkennst, wann du Autocomplete, Chat oder Agent vor dir hast.
tools: [cursor, copilot, opencode]
schutzklassen: [cloud, ec, vsnfd]
verantwortlich: Service-Team Agentic Development
geprueft: 2026-11-11
status: Entwurf, fachliches Review offen
tool_versionen: Bedienhinweise Stand November 2026, noch nicht gegen feste Tool-Versionen geprüft
community: llms-entwickler
---

## Warum

Wer weiß, wie ein Agent arbeitet, versteht auch, warum er manchmal danebenliegt und was man ihm dann geben muss.

```vergleich
vorher: Du tippst eine Frage in den Chat, kopierst die Antwort in den Editor, startest die Tests selbst und kopierst die Fehlermeldung zurück.
nachher: Du gibst ein Ziel vor. Der Agent liest die Dateien, ändert sie, startet die Tests, liest die Fehlermeldung und versucht es noch einmal. Du prüfst das Ergebnis.
```

## Konzept

Ein Agent besteht aus vier Teilen.

- **Modell:** das Sprachmodell, das den nächsten Schritt wählt.
- **Tools:** was es tun darf, zum Beispiel Dateien lesen und schreiben, Befehle im Terminal ausführen, im Repo suchen.
- **Kontext:** alles, was das Modell gerade sieht: dein Auftrag, gelesene Dateien, Ausgaben der Tools, Projekt-Rules.
- **Schleife:** Das Modell wählt ein Tool, bekommt das Ergebnis zurück und entscheidet neu, bis das Ziel erreicht ist.

```diagramm
mitte: Agent
schleife: Ziel und Kontext lesen -> Nächsten Schritt wählen -> Tool ausführen -> Ergebnis ansehen
```

Die Schleife ist der Unterschied zu allem davor.

| | Wer handelt? | Wer prüft das Ergebnis eines Schritts? |
| --- | --- | --- |
| **Autocomplete** | Du tippst, das Modell schlägt die nächsten Zeilen vor | Du, bei jedem Vorschlag |
| **Chat** | Das Modell antwortet einmal, du überträgst die Antwort | Du, nach jeder Antwort |
| **Agent** | Das Modell führt viele Schritte selbst aus | Der Agent zwischendurch, du am Ende |

> Zwei Folgen für dich: Der Agent weiß nur, was in seinem Kontext steht. Und er hört auf, wenn er glaubt, fertig zu sein. Ob er wirklich fertig ist, entscheidest du.

Mehr zur Mechanik, mit einer Schleife zum Durchspielen: [Wie KI-Agenten arbeiten](../agenten/).

## In deinem Tool

So kommst du in den Agent-Modus und siehst der Schleife zu.

### Cursor

1. Öffne das Agent-Fenster (Seitenleiste oder `Strg/Cmd + I`).
2. Wähle im Modus-Menü **Agent**. **Ask** antwortet nur, **Plan** kommt in P2.
3. Gib einen kleinen Auftrag, zum Beispiel: „Welche Tests gibt es in diesem Repo, und wie starte ich sie?“
4. Sieh zu: Jeder Tool-Aufruf (Datei lesen, Suche, Terminal) erscheint als eigener Schritt.

### GitHub Copilot

1. Öffne in VS Code die Chat-Ansicht.
2. Wähle im Modus-Menü **Agent**. **Ask** antwortet nur, Inline-Vorschläge im Editor sind Autocomplete.
3. Gib denselben kleinen Auftrag.
4. Sieh zu: Copilot zeigt jeden Tool-Aufruf an und fragt vor Terminal-Befehlen nach.

### OpenCode

1. Starte `opencode` im Terminal im Ordner deines Repos.
2. Unten siehst du den aktiven Agent. **Build** darf ändern, **Plan** nur lesen. Mit `Tab` wechselst du.
3. Gib denselben kleinen Auftrag.
4. Sieh zu: Jeder Tool-Aufruf steht als eigene Zeile im Verlauf.

### Selbst gehostete Modelle

Kleinere Modelle halten die Schleife weniger lange durch. Sie verlieren bei vielen Schritten eher das Ziel oder wiederholen sich. Gib engere Aufgaben und sieh dir die ersten Schritte genau an.

## Übung

```uebung
{
	"typ": "entscheidung",
	"titel": "Autocomplete, Chat oder Agent?",
	"verweis": "konzept",
	"fragen": [
		{
			"frage": "Du schreibst `def test_` und dein Editor ergänzt in Grau drei Zeilen. Du drückst Tab.",
			"optionen": [
				{ "text": "Autocomplete", "richtig": true, "erklaerung": "Du handelst, das Modell schlägt nur die nächsten Zeilen vor. Es gibt keine Schleife und keine Tools." },
				{ "text": "Chat", "erklaerung": "Im Chat stellst du eine Frage und bekommst eine Antwort. Hier hast du nichts gefragt." },
				{ "text": "Agent", "erklaerung": "Ein Agent würde selbst Schritte ausführen. Hier wurde nur Text vorgeschlagen." }
			]
		},
		{
			"frage": "Du fragst: „Warum schlägt dieser Test fehl?“ und fügst die Fehlermeldung ein. Die Antwort nennt eine Vermutung und einen Code-Vorschlag, den du selbst einfügst.",
			"optionen": [
				{ "text": "Autocomplete", "erklaerung": "Autocomplete ergänzt beim Tippen. Hier hast du gefragt und eine Antwort bekommen." },
				{ "text": "Chat", "richtig": true, "erklaerung": "Eine Antwort, kein Tool-Aufruf. Du überträgst und prüfst selbst." },
				{ "text": "Agent", "erklaerung": "Ein Agent hätte die Datei selbst gelesen, geändert und den Test neu gestartet." }
			]
		},
		{
			"frage": "Du schreibst: „Der Test in `test_versand.py` schlägt fehl. Finde die Ursache und behebe sie.“ Das Tool liest vier Dateien, ändert eine, startet die Tests zweimal und meldet sich dann.",
			"optionen": [
				{ "text": "Autocomplete", "erklaerung": "Hier wurden Dateien gelesen und Befehle ausgeführt. Das kann Autocomplete nicht." },
				{ "text": "Chat", "erklaerung": "Im Chat gäbe es eine Antwort, aber keine eigenen Schritte." },
				{ "text": "Agent", "richtig": true, "erklaerung": "Mehrere Tool-Aufrufe in einer Schleife: lesen, ändern, testen, Ergebnis ansehen, wiederholen." }
			]
		},
		{
			"frage": "Der Agent meldet „Fertig, alle Tests grün“. Was weißt du jetzt sicher?",
			"optionen": [
				{ "text": "Dass die Aufgabe gelöst ist.", "erklaerung": "Der Agent hört auf, wenn er glaubt, fertig zu sein. Das ist eine Selbsteinschätzung." },
				{ "text": "Dass der Agent seine Schleife beendet hat. Ob das Ergebnis stimmt, prüfe ich am Diff und an den Tests.", "richtig": true, "erklaerung": "Genau. Die Schleife endet mit einer Behauptung. Der Beleg kommt von dir, in P2 forderst du ihn vom Agent ein." },
				{ "text": "Dass keine weiteren Dateien geändert wurden.", "erklaerung": "Das zeigt dir nur der Diff." }
			]
		}
	]
}
```

## Transfer

Probier das diese Woche in deinem Projekt:

- Stell dieselbe Frage einmal im Ask-Modus und einmal im Agent-Modus: „Wie starte ich hier die Tests, und welche schlagen gerade fehl?“ Vergleiche, was du jeweils selbst tun musst.
- Zähle bei einem Agent-Lauf die Tool-Aufrufe. Welche hättest du sonst von Hand gemacht?
