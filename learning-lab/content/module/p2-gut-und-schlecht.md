---
id: p2-gut-und-schlecht
titel: Gut und Schlecht definieren
stufe: 2
dauer: 25
lernziel: Du schreibst einen Auftrag mit Akzeptanzkriterien, Negativfällen und Randbedingungen, gegen den sich das Ergebnis prüfen lässt.
tools: [cursor, copilot, opencode]
schutzklassen: [cloud, ec, vsnfd]
verantwortlich: Service-Team Agentic Development
geprueft: 2026-11-11
status: Entwurf, fachliches Review offen
tool_versionen: Bedienhinweise Stand November 2026, noch nicht gegen feste Tool-Versionen geprüft
---

## Warum

Ein Agent kann nur treffen, was du als Ziel beschrieben hast. Bei längeren Aufgaben entscheidet der Auftrag über das Ergebnis.

```vergleich
vorher: „Bau Expressversand ein.“ Der Agent liefert etwas, das läuft. Die Gewichtsgrenze fehlt, das Datenschema hat ein neues Feld, und du besserst eine Stunde nach.
nachher: Derselbe Auftrag mit vier Kriterien, zwei Negativfällen und einem Prüfbefehl. Der Agent liefert beim ersten Mal, und du prüfst in fünf Minuten gegen deine Liste.
```

## Konzept

Ein guter Auftrag beantwortet vier Fragen.

```diagramm
fluss: Ziel: Was soll danach anders sein? -> Gut: Woran erkenne ich Erfolg? -> Schlecht: Was darf nicht passieren? -> Prüfung: Womit wird belegt?
```

**Akzeptanzkriterien** beschreiben das Gute so, dass man es prüfen kann. Der Test dafür: Könnte ein Kollege ohne Rückfrage mit Ja oder Nein antworten?

| Nicht prüfbar | Prüfbar |
| --- | --- |
| Express soll sauber funktionieren. | Express kostet den Standardpreis plus 6,00 €. |
| Schwere Pakete richtig behandeln. | Bei Express über 20 kg wird ein `ValueError` ausgelöst. |
| Gute Testabdeckung. | Für jede Regel gibt es mindestens einen Test in `tests/test_versand.py`. |

**Negativfälle** beschreiben, was nicht passieren darf. Sie verhindern die typischen Nebenwirkungen:

- „Ändere nichts an `daten/schema.json`.“
- „Öffentliche Funktionen behalten ihre Signatur.“
- „Lösche keine Tests und schwäche keine ab.“

**Randbedingungen** sind der Rahmen: betroffene Dateien, Sprache und Version, keine neuen Abhängigkeiten.

**Prüfung** nennt den Befehl, mit dem der Agent selbst belegen kann, dass er fertig ist.

> Wörter wie „sauber“, „ordentlich“, „robust“ oder „sinnvoll“ sind Warnzeichen. Sie klingen wie Kriterien, lassen sich aber nicht prüfen. Ersetze sie durch das, was du damit meinst.

## In deinem Tool

Der Auftrag ist in allen Tools derselbe Text. Unterschiedlich ist nur, wie du Kontext anhängst und Vorlagen ablegst.

### Cursor

- Schreib den Auftrag mit den vier Überschriften direkt ins Agent-Fenster. Dateien hängst du mit `@` an.
- Wiederkehrende Aufträge legst du als eigenen Befehl ab (Ordner `.cursor/commands/`), dann rufst du sie mit `/` auf.
- Negativfälle, die immer gelten, gehören in die Projekt-Rules. Das ist das übernächste Modul.

### GitHub Copilot

- Schreib den Auftrag in den Chat im Agent-Modus. Dateien hängst du mit `#` an.
- Wiederkehrende Aufträge legst du als Prompt-Datei ab (`.github/prompts/name.prompt.md`) und rufst sie mit `/name` auf.
- Negativfälle, die immer gelten, gehören in die Instructions des Repos.

### OpenCode

- Schreib den Auftrag im TUI oder leg ihn als Markdown-Datei ab und referenziere sie mit `@auftrag.md`.
- Wiederkehrende Aufträge legst du als eigenen Befehl im Ordner `.opencode/` ab. Die genauen Pfade stehen in der OpenCode-Doku deiner Version.
- Negativfälle, die immer gelten, gehören in die `AGENTS.md`.

### Selbst gehostete Modelle

Kleinere Modelle übersehen Kriterien eher, wenn viele in einem Absatz stehen. Schreib jedes Kriterium als eigenen Listenpunkt, nummeriere sie und lass den Agent am Ende zu jeder Nummer sagen, womit sie belegt ist.

## Übung

```uebung
{
	"typ": "artefakt",
	"titel": "Schreib den Auftrag für den Expressversand",
	"aufgabe": [
		"Der Bestell-Dienst soll die Versandart **Express** bekommen. Das Fachliche:",
		"",
		"- Express kostet den Standardpreis plus 6,00 € Zuschlag.",
		"- Express gibt es nur bis 20 kg.",
		"- Die Lieferzeit ist 1 Tag statt 3.",
		"- Betroffen sind `versand.py`, `lieferzeit.py` und `rechnung.py`. Das Schema in `daten/schema.json` kennt `express` schon.",
		"",
		"Ergänze die Vorlage zu einem Auftrag, gegen den sich das Ergebnis prüfen lässt."
	],
	"dateiname": "auftrag.md",
	"zeilen": 18,
	"vorlage": [
		"## Ziel",
		"Bau Expressversand ein.",
		"",
		"## Akzeptanzkriterien",
		"- ",
		"",
		"## Nicht anfassen",
		"- ",
		"",
		"## Prüfung",
		""
	],
	"regeln": [
		{ "name": "Mindestens drei Akzeptanzkriterien als Listenpunkte", "art": "muster", "muster": "^## Akzeptanzkriterien[\\s\\S]*?(\\n[-*] \\S.{9,}){3}", "hinweis": "Unter „Akzeptanzkriterien“ stehen weniger als drei ausformulierte Listenpunkte. Jede Fachregel ist ein eigenes Kriterium.", "verweis": "konzept" },
		{ "name": "Kriterien sind messbar: Zahlen aus der Fachregel kommen vor", "art": "muster", "muster": "(6[,.]00|6 ?€|6 Euro|20 ?kg|1 Tag|ein(en)? Tag)", "min": 2, "hinweis": "Die Kriterien nennen keine Werte. „Express kostet mehr“ ist nicht prüfbar, „Standardpreis plus 6,00 €“ schon.", "verweis": "konzept" },
		{ "name": "Mindestens ein Negativfall: was nicht geändert werden darf", "art": "muster", "muster": "^## Nicht anfassen[\\s\\S]*?\\n[-*] .*(schema|signatur|test|schnittstelle|abhängigkeit)", "hinweis": "Unter „Nicht anfassen“ fehlt ein konkreter Negativfall, zum Beispiel das Schema, bestehende Tests oder Signaturen.", "verweis": "konzept" },
		{ "name": "Der Fehlerfall ist beschrieben (über 20 kg)", "art": "muster", "muster": "(ValueError|Fehler|abgelehnt|Ausnahme|Exception)", "hinweis": "Was passiert bei Express über 20 kg? Ein Kriterium für den Fehlerfall fehlt.", "verweis": "konzept" },
		{ "name": "Betroffene Dateien sind genannt", "art": "muster", "muster": "\\w+\\.(py|json)", "min": 2, "hinweis": "Der Auftrag nennt keine oder nur eine Datei. Nenne, wo geändert werden soll und was tabu ist.", "verweis": "konzept" },
		{ "name": "Die Prüfung nennt einen Befehl oder Test", "art": "muster", "muster": "^## Prüfung[\\s\\S]*(`[^`]+`|pytest|unittest|test_\\w+|Tests? (laufen|grün|bestehen))", "hinweis": "Unter „Prüfung“ steht nicht, womit das Ergebnis belegt wird. Nenne den Test-Befehl oder die Tests.", "verweis": "konzept" },
		{ "name": "Keine unprüfbaren Wörter wie „sauber“ oder „robust“", "art": "verboten", "muster": "\\b(sauber|ordentlich|robust|sinnvoll|vernünftig|schön)\\w*", "hinweis": "Im Auftrag steht ein Wort, das wie ein Kriterium klingt, sich aber nicht prüfen lässt. Schreib, was du damit meinst.", "verweis": "konzept" }
	],
	"fazit": "Dieser Auftrag lässt sich prüfen: Kriterien mit Werten, ein Negativfall, ein Fehlerfall und ein Beleg. Genau so sieht die Datei KRITERIEN.md in der Level-Up-Challenge aus."
}
```

## Transfer

Probier das diese Woche in deinem Projekt:

- Nimm dein nächstes Ticket und schreib vor dem ersten Prompt drei Akzeptanzkriterien und einen Negativfall auf.
- Schau in deine Notizen aus P1: Was musstest du zurückgeben? Jeder dieser Punkte ist ein Negativfall, den du ab jetzt gleich mitgibst.
- Mit dem Jira-MCP aus dem Marketplace holt der Agent die Akzeptanzkriterien direkt aus dem Ticket.
