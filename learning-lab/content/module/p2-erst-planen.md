---
id: p2-erst-planen
titel: Erst planen, dann bauen
stufe: 2
dauer: 25
lernziel: Du lässt vor der Ausführung einen Plan erstellen, prüfst ihn gegen deine Kriterien und korrigierst ihn, bevor Code entsteht.
tools: [cursor, copilot, opencode]
schutzklassen: [cloud, ec, vsnfd]
verantwortlich: Service-Team Agentic Development
geprueft: 2026-11-11
status: Entwurf, fachliches Review offen
tool_versionen: Bedienhinweise Stand November 2026, noch nicht gegen feste Tool-Versionen geprüft
---

## Warum

Einen falschen Plan korrigierst du in einer Minute. Falschen Code über fünf Dateien korrigierst du in einer Stunde.

```vergleich
vorher: Der Agent legt los, ändert acht Dateien und meldet Erfolg. Erst im Diff merkst du, dass er das Schema erweitert hat, statt die vorhandene Versandart zu nutzen. Alles zurück.
nachher: Der Agent zeigt dir fünf Schritte. In Schritt 2 steht „Schema erweitern“. Du streichst den Schritt, er passt den Plan an, und erst dann entsteht Code.
```

## Konzept

Im Plan-Modus liest der Agent das Repo und schreibt auf, was er tun würde. Er ändert nichts. Der Plan ist der billigste Ort für Korrekturen.

```diagramm
fluss: Auftrag mit Kriterien -> Agent plant, ändert nichts -> Du prüfst und korrigierst -> Agent setzt um -> Prüfung gegen die Kriterien
```

Einen Plan liest du wie einen kleinen MR. Fünf Fragen:

1. **Deckt er jedes Kriterium ab?** Zu jedem Akzeptanzkriterium gibt es einen Schritt.
2. **Verletzt er einen Negativfall?** Steht irgendwo eine Datei, die tabu ist?
3. **Sind die Schritte konkret?** Jeder Schritt nennt Datei und Änderung. „Diverse Anpassungen“ ist kein Schritt.
4. **Gibt es einen Prüfschritt?** Tests schreiben und laufen lassen steht im Plan, nicht nur in deinem Kopf.
5. **Ist die Reihenfolge sinnvoll?** Erst das, wovon anderes abhängt.

> Lass den Plan in eine Datei schreiben, zum Beispiel `PLAN.md`. Dann kannst du ihn korrigieren, im MR zeigen und später nachsehen, was vereinbart war.

Wann lohnt sich ein Plan? Sobald eine Aufgabe mehr als eine Datei betrifft oder du die Lösung nicht in einem Satz beschreiben kannst. Eine Zeile zu ändern braucht keinen Plan.

## In deinem Tool

### Cursor

1. Wechsle im Agent-Fenster in den Modus **Plan** (im Modus-Menü oder mit `Umschalt + Tab`).
2. Gib den Auftrag mit Kriterien. Cursor liest das Repo, stellt Rückfragen und zeigt einen Plan als Dokument.
3. Bearbeite den Plan direkt oder gib Korrekturen im Chat.
4. Mit **Build** setzt der Agent den Plan um. Den Plan kannst du im Repo speichern.

### GitHub Copilot

1. Wähle im Chat den Modus **Plan**. Er liest das Repo und schreibt einen Plan, ohne etwas zu ändern.
2. Korrigiere den Plan im Chat, bis er passt.
3. Übergib ihn an den Agent-Modus zur Umsetzung.
4. Falls deine Version keinen Plan-Modus hat: Verlange im Agent-Modus ausdrücklich „Erstelle nur einen Plan in `PLAN.md` und ändere sonst nichts“. Das ist die nächstbeste Alternative.

### OpenCode

1. Wechsle mit `Tab` auf den **Plan**-Agent. Er darf lesen, aber nichts ändern.
2. Gib den Auftrag mit Kriterien und lass dir den Plan zeigen. Korrigiere ihn im Gespräch.
3. Wechsle mit `Tab` zurück auf **Build** und schreib: „Speichere den Plan in `PLAN.md` und setze ihn um.“

### Selbst gehostete Modelle

Hier lohnt sich der Plan am meisten. Kleinere Modelle halten einen langen Lauf schlechter durch. Lass den Plan in kleine Schritte schneiden und **einen Schritt pro Auftrag** umsetzen: „Setze Schritt 2 aus `PLAN.md` um und starte danach die Tests.“ So bleibt jeder Lauf kurz und prüfbar.

## Übung

```uebung
{
	"typ": "fehler",
	"titel": "Prüf den Plan, bevor Code entsteht",
	"aufgabe": [
		"Dein Auftrag enthielt diese Kriterien:",
		"",
		"- Express kostet den Standardpreis plus 6,00 €, nur bis 20 kg, sonst `ValueError`.",
		"- Lieferzeit bei Express: 1 Tag.",
		"- **Nicht anfassen:** `daten/schema.json`, Signaturen öffentlicher Funktionen, bestehende Tests.",
		"- **Prüfung:** Für jede Regel ein Test, alle Tests grün.",
		"",
		"Das ist der Plan des Agents. Markiere die Schritte, die du so nicht freigeben würdest."
	],
	"verweis": "konzept",
	"toleranz": 0,
	"zeilen": [
		"# Plan: Expressversand",
		"",
		"1. versand.py: versandkosten() bekommt die Versandart; Express = Standard + 6,00 €",
		"!! 2. daten/schema.json: neues Feld \"express_zuschlag\" ergänzen",
		"3. lieferzeit.py: lieferzeit_tage() gibt bei Express 1 zurück",
		"!! 4. rechnung.py: erstelle_rechnung(bestellung) wird zu erstelle_rechnung(bestellung, express=False)",
		"!! 5. Diverse Anpassungen in weiteren Modulen, wo nötig",
		"!! 6. tests/test_versand.py: veraltete Tests entfernen, damit die Suite grün bleibt",
		"7. tests/test_lieferzeit.py: Test für Express = 1 Tag ergänzen",
		"8. Alle Tests laufen lassen und Ausgabe zeigen"
	],
	"fehler": [
		{ "warum": "Das Schema ist tabu. Es kennt `express` bereits, ein neues Feld verletzt den Negativfall.", "tipp": "Vergleiche jede genannte Datei mit der Liste „Nicht anfassen“." },
		{ "warum": "Die Signatur einer öffentlichen Funktion ändert sich. Die Versandart steht schon in der Bestellung.", "tipp": "Ändert ein Schritt, wie eine Funktion aufgerufen wird?" },
		{ "warum": "Kein konkreter Schritt: keine Datei, keine Änderung. Hier versteckt sich alles, was du später im Diff suchst.", "tipp": "Nennt jeder Schritt Datei und Änderung?" },
		{ "warum": "Bestehende Tests entfernen ist ausdrücklich verboten. Ein Test, der rot wird, zeigt einen Fehler an.", "tipp": "Was passiert in diesem Plan mit den vorhandenen Tests?" }
	],
	"fazit": "Vier Schritte hättest du zurückgegeben. Und einer fehlt ganz: Für die Gewichtsgrenze von 20 kg gibt es weder einen Schritt noch einen Test. Auch das siehst du am Plan, lange bevor Code existiert."
}
```

```uebung
{
	"typ": "reihenfolge",
	"titel": "Der Ablauf mit Plan",
	"aufgabe": "Bring die Schritte in die Reihenfolge, in der du eine Aufgabe über mehrere Dateien angehst.",
	"verweis": "konzept",
	"schritte": [
		"Akzeptanzkriterien und Negativfälle aufschreiben",
		"Agent im Plan-Modus einen Plan erstellen lassen",
		"Plan gegen die Kriterien prüfen und korrigieren",
		"Agent den Plan umsetzen lassen",
		"Diff lesen und Tests gegen die Kriterien prüfen"
	],
	"tipp": "Kriterien kommen vor dem Plan, weil du den Plan an ihnen misst.",
	"fazit": "So läuft es: Kriterien, Plan, Korrektur, Umsetzung, Prüfung. Die Korrektur findet am Plan statt, nicht am Code."
}
```

## Transfer

Probier das diese Woche in deinem Projekt:

- Starte deine nächste Aufgabe über mehrere Dateien im Plan-Modus. Zähle, wie viele Schritte du korrigierst.
- Leg den Plan als `PLAN.md` in den MR. Reviewer sehen dann, was beabsichtigt war.
- Stell die fünf Prüffragen aus dem Konzept an jeden Plan, bis sie sitzen.
