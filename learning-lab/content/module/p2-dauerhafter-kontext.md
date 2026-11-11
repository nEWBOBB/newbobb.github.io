---
id: p2-dauerhafter-kontext
titel: Dauerhafter Kontext
stufe: 2
dauer: 25
lernziel: Du pflegst eine AGENTS.md und die Rules deines Tools, damit der Agent Projektwissen nicht in jedem Chat neu erklärt bekommt.
tools: [cursor, copilot, opencode]
schutzklassen: [cloud, ec, vsnfd]
verantwortlich: Service-Team Agentic Development
geprueft: 2026-11-11
status: Entwurf, fachliches Review offen
tool_versionen: Bedienhinweise Stand November 2026, noch nicht gegen feste Tool-Versionen geprüft
---

## Warum

Was du dem Agent zum dritten Mal im Chat erklärst, gehört in eine Datei, die er jedes Mal liest.

```vergleich
vorher: In jedem neuen Chat: „Nein, bei uns startet man die Tests mit make test. Und bitte keine neuen Abhängigkeiten.“ Der Kollege nebenan erklärt dasselbe in seinem Chat.
nachher: Das steht einmal in der AGENTS.md im Repo. Jeder Agent-Lauf im Team beginnt mit diesem Wissen, egal in welchem Tool.
```

## Konzept

Jeder Agent-Lauf beginnt mit leerem Gedächtnis. Dauerhafter Kontext sind Dateien im Repo, die das Tool automatisch in den Kontext legt.

```diagramm
fluss: Agent macht denselben Fehler zum zweiten Mal -> Regel in eine Datei im Repo schreiben -> Per MR ins Team bringen -> Jeder Lauf startet mit der Regel
```

`AGENTS.md` im Wurzelordner ist der gemeinsame Nenner: ein offenes Format, das Cursor, Copilot und OpenCode lesen. Daneben hat jedes Tool eigene Dateien für feinere Regeln.

Was hineingehört:

- **Befehle:** bauen, testen, linten, exakt so, wie man sie eintippt.
- **Aufbau:** welche Ordner es gibt und wofür.
- **Konventionen:** was vom Üblichen abweicht, zum Beispiel Sprache der Kommentare oder Namensregeln.
- **Grenzen:** was der Agent nie tun soll, zum Beispiel generierten Code ändern oder Abhängigkeiten ergänzen.

Was nicht hineingehört:

- **Secrets.** Kein Token, kein Passwort, keine internen Zugangsdaten. Die Datei liegt im Repo und im Kontext des Modells.
- **Was der Agent selbst sieht.** Eine Dateiliste oder Nacherzählung des Codes veraltet nur.
- **Romane.** Jede Zeile kostet in jedem Lauf Kontext. Kurz und konkret wirkt besser als lang und vollständig.

> Faustregel: Eine Regel kommt in die Datei, wenn der Agent ohne sie zweimal denselben Fehler gemacht hat. Nicht vorher.

## In deinem Tool

Lege die gemeinsamen Regeln in `AGENTS.md`. Die tool-eigenen Dateien nimmst du nur für das, was `AGENTS.md` nicht kann.

### Cursor

- Cursor liest `AGENTS.md` im Wurzelordner.
- Feinere Regeln liegen als Dateien in `.cursor/rules/`. Im Kopf jeder Regel steht, wann sie gilt: immer, für bestimmte Dateimuster oder wenn der Agent sie für passend hält.
- Regeln für einzelne Ordner kannst du mit einer eigenen `AGENTS.md` im Unterordner ablegen.

### GitHub Copilot

- Copilot liest `.github/copilot-instructions.md` und in VS Code auch `AGENTS.md`.
- Regeln für bestimmte Dateimuster liegen in `.github/instructions/*.instructions.md`. Im Kopf steht mit `applyTo`, für welche Dateien sie gelten.
- Wenn du beide Dateien pflegst: Lass `copilot-instructions.md` kurz auf `AGENTS.md` verweisen, statt Inhalte zu doppeln.

### OpenCode

- OpenCode liest `AGENTS.md` im Wurzelordner. Mit `/init` erzeugt es einen ersten Entwurf aus dem Repo, den du kürzt und korrigierst.
- Weitere Dateien bindest du über `instructions` in `opencode.json` ein.
- Eine persönliche `AGENTS.md` im Benutzerordner gilt für alle deine Projekte.

### Selbst gehostete Modelle

Kleinere Modelle haben weniger Platz im Kontext und halten sich bei langen Regeln schlechter an einzelne Punkte. Halte die `AGENTS.md` besonders kurz, stell die wichtigsten Grenzen an den Anfang und schreib Befehle wörtlich aus, statt sie zu umschreiben.

## Übung

```uebung
{
	"typ": "artefakt",
	"titel": "Schreib die AGENTS.md für den Bestell-Dienst",
	"aufgabe": [
		"Das weißt du über das Projekt:",
		"",
		"- Python 3.12, nur Standardbibliothek. Neue Abhängigkeiten sind nicht erwünscht.",
		"- Tests starten mit `python3 -m unittest discover tests`.",
		"- Code liegt in `bestellung/`, Tests in `tests/`, das Datenschema in `daten/schema.json`.",
		"- Das Schema wird von einem anderen Team gepflegt und darf nicht geändert werden.",
		"- Beträge werden in Euro mit zwei Nachkommastellen gerundet.",
		"- Der Agent hat schon zweimal Tests gelöscht, um die Suite grün zu bekommen.",
		"",
		"Schreib daraus eine kurze `AGENTS.md`."
	],
	"dateiname": "AGENTS.md",
	"zeilen": 16,
	"vorlage": ["# AGENTS.md", "", "## Befehle", "", "## Aufbau", "", "## Grenzen", ""],
	"regeln": [
		{ "name": "Der Test-Befehl steht wörtlich als Code da", "art": "muster", "muster": "`[^`]*unittest[^`]*`", "hinweis": "Der Test-Befehl fehlt oder steht nicht in Backticks. Schreib ihn so, wie man ihn eintippt.", "verweis": "konzept" },
		{ "name": "Der Aufbau nennt die Ordner", "art": "muster", "muster": "(bestellung/|tests/|daten/)", "min": 2, "hinweis": "Unter „Aufbau“ fehlen die Ordner. Zwei bis drei Zeilen reichen: Ordner und wofür er da ist.", "verweis": "konzept" },
		{ "name": "Grenze: das Schema wird nicht geändert", "art": "muster", "muster": "schema[\\s\\S]{0,80}(nicht|nie|kein|tabu)|(nicht|nie|kein)[\\s\\S]{0,80}schema", "hinweis": "Die wichtigste Grenze fehlt: `daten/schema.json` gehört einem anderen Team.", "verweis": "konzept" },
		{ "name": "Grenze: Tests werden nicht gelöscht oder abgeschwächt", "art": "muster", "muster": "tests?[\\s\\S]{0,60}(lösch|entfern|abschwäch|skip|überspring)|(lösch|entfern|abschwäch)[\\s\\S]{0,60}tests?", "hinweis": "Der Agent hat zweimal Tests gelöscht. Genau solche wiederholten Fehler gehören in die Datei.", "verweis": "konzept" },
		{ "name": "Grenze: keine neuen Abhängigkeiten", "art": "muster", "muster": "(abhängigkeit|dependenc|paket|standardbibliothek|stdlib|pip)", "hinweis": "Dass nur die Standardbibliothek erlaubt ist, steht nirgends.", "verweis": "konzept" },
		{ "name": "Kurz gehalten: höchstens 30 Zeilen", "art": "laenge", "maxZeilen": 30, "hinweis": "Die Datei ist zu lang. Jede Zeile kostet in jedem Lauf Kontext. Streiche, was der Agent selbst im Code sieht.", "verweis": "konzept" },
		{ "name": "Keine Secrets", "art": "verboten", "muster": "(token|passwor[dt]|secret|api[_-]?key)\\s*[:=]\\s*\\S+", "hinweis": "In der Datei steht etwas, das wie ein Zugangsdatum aussieht. Secrets gehören nie in eine Datei im Repo.", "verweis": "konzept" }
	],
	"fazit": "Diese AGENTS.md ist kurz, nennt Befehle wörtlich und hält die Grenzen fest, an denen der Agent schon gescheitert ist."
}
```

## Transfer

Probier das diese Woche in deinem Projekt:

- Hat dein Hauptrepo eine `AGENTS.md`? Wenn nicht: Leg eine mit Befehlen und zwei Grenzen an und stell einen MR.
- Wenn ja: Streiche alles, was der Agent selbst sehen kann. Bleiben mehr als 40 Zeilen übrig, kürze weiter.
- Trag die nächste Korrektur, die du zum zweiten Mal im Chat gibst, in die Datei ein statt in den Chat.
