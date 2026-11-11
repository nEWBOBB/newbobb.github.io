---
id: p1-fremden-code-verstehen
titel: Fremden Code verstehen
stufe: 1
dauer: 20
lernziel: Du lässt dir eine unbekannte Codebase so erklären, dass du die Antwort an Dateipfaden nachprüfen kannst.
tools: [cursor, copilot, opencode]
schutzklassen: [cloud, ec, vsnfd]
verantwortlich: Service-Team Agentic Development
geprueft: 2026-11-11
status: Entwurf, fachliches Review offen
tool_versionen: Bedienhinweise Stand November 2026, noch nicht gegen feste Tool-Versionen geprüft
---

## Warum

Ein Agent liest ein fremdes Repo in Minuten und erspart dir das Meeting mit dem anderen Team.

```vergleich
vorher: Du sollst einen Fehler im Dienst eines Nachbarteams finden. Du suchst einen Termin, bekommst eine Stunde Einführung in zwei Wochen und liest bis dahin wahllos Dateien.
nachher: Du fragst den Agent nach dem Weg einer Anfrage durch den Code, bekommst Dateien und Funktionen genannt, öffnest zwei davon zur Kontrolle und weißt nach zwanzig Minuten, wo du suchen musst.
```

## Konzept

Der Agent liest schnell, aber er erklärt nur gut, wenn du **konkret fragst** und **nachprüfbare Antworten verlangst**.

```diagramm
fluss: Überblick: Aufbau und Einstiegspunkte -> Einen Weg verfolgen: von der Anfrage bis zum Ergebnis -> Belege verlangen: Datei und Funktion -> Stichprobe: zwei Stellen selbst öffnen
```

Drei Arten von Fragen bringen dich weiter:

- **Landkarte:** „Welche Ordner gibt es, wofür ist jeder da, und wo beginnt ein Request?“
- **Weg:** „Verfolge eine Bestellung vom HTTP-Endpunkt bis zur Datenbank. Nenne für jeden Schritt Datei und Funktion.“
- **Stelle:** „Wo wird die Versandart ausgewertet? Zeig mir alle Aufrufer.“

Und drei Fragen bringen wenig:

- „Erklär mir das Repo.“ Du bekommst eine Nacherzählung der README.
- „Ist der Code gut?“ Ohne Kriterium bekommst du Allgemeinplätze.
- „Wo ist der Bug?“ Ohne Symptom rät der Agent.

> Verlange immer Dateipfade. Eine Erklärung ohne Pfade kannst du nicht prüfen, und Agents erfinden gelegentlich Zusammenhänge, die plausibel klingen.

## In deinem Tool

### Cursor

- Nimm für reines Verstehen den Modus **Ask**. Dann liest der Agent nur und ändert nichts.
- Mit `@` hängst du Dateien oder Ordner an, zum Beispiel `@src/versand`.
- Die Antwort enthält klickbare Verweise auf Dateien. Öffne sie zur Stichprobe.

### GitHub Copilot

- Nimm den Modus **Ask** oder **Agent**. Im Agent-Modus sucht Copilot selbst im Repo.
- Mit `#` hängst du Kontext an, zum Beispiel eine Datei oder `#codebase` für eine Suche im ganzen Repo.
- Verweise in der Antwort führen direkt zur Stelle im Editor.

### OpenCode

- Wechsle mit `Tab` auf den **Plan**-Agent. Er liest nur.
- Mit `@` referenzierst du Dateien und Ordner.
- Lass dir Pfade mit Zeilennummern nennen und öffne sie in deinem Editor.

### Selbst gehostete Modelle

Kleinere Modelle verlieren in großen Repos schneller den Überblick. Frag enger: erst einen Ordner, dann einen Weg, dann eine Stelle. Wenn eine Antwort ohne Dateipfade kommt, frag sofort nach den Pfaden.

## Übung

```uebung
{
	"typ": "session",
	"titel": "Ein Rundungsfehler in fremdem Code",
	"aufgabe": "Du kennst das Repo `abrechnung` nicht. Ein Kunde meldet: Bei Rechnungen mit Rabatt weicht der Endbetrag um einen Cent ab. Finde heraus, wo du suchen musst. Wähle jeweils deinen nächsten Prompt.",
	"verweis": "konzept",
	"start": "a",
	"knoten": {
		"a": {
			"agent": "Bereit. Das Repo `abrechnung` ist geöffnet. Was soll ich tun?",
			"optionen": [
				{ "prompt": "Erklär mir das Repo.", "ziel": "b_vage", "kommentar": "Sehr offen gefragt. Mal sehen, was zurückkommt." },
				{ "prompt": "Bei Rechnungen mit Rabatt weicht der Endbetrag um einen Cent ab. Verfolge den Weg von den Positionen bis zum Endbetrag. Nenne für jeden Schritt Datei und Funktion.", "ziel": "b_weg", "kommentar": "Symptom genannt, einen Weg verlangt, Belege verlangt." },
				{ "prompt": "Wo ist der Bug?", "ziel": "b_raten", "kommentar": "Kein Symptom, kein Kontext." }
			]
		},
		"b_vage": {
			"agent": "Das Repo `abrechnung` ist ein Python-Dienst zur Rechnungserstellung. Es enthält Module für Preise, Rabatte, Steuern und PDF-Erzeugung sowie Tests. Die README beschreibt Installation und Start. Der Code ist übersichtlich strukturiert.",
			"optionen": [
				{ "prompt": "Okay, und wo ist jetzt der Fehler mit dem Cent?", "ziel": "b_raten", "kommentar": "Du hast noch keine Landkarte, auf der du suchen könntest." },
				{ "prompt": "Verfolge den Weg von den Positionen bis zum Endbetrag einer Rechnung mit Rabatt. Nenne für jeden Schritt Datei und Funktion.", "ziel": "b_weg", "kommentar": "Jetzt fragst du nach einem Weg mit Belegen." }
			]
		},
		"b_raten": {
			"agent": "Mögliche Ursachen für Abweichungen sind Gleitkomma-Arithmetik, falsche Rundungsmodi oder Zeitzonen. Ich empfehle, überall `Decimal` zu verwenden. Soll ich das im ganzen Repo umstellen?",
			"optionen": [
				{ "prompt": "Ja, stell alles auf Decimal um.", "ziel": "ende_umbau", "kommentar": "Eine Änderung im ganzen Repo auf Basis einer Vermutung." },
				{ "prompt": "Nein. Verfolge erst den Weg von den Positionen bis zum Endbetrag und nenne Datei und Funktion für jeden Schritt.", "ziel": "b_weg", "kommentar": "Erst verstehen, dann ändern." }
			]
		},
		"b_weg": {
			"agent": [
				"Der Weg einer Rechnung mit Rabatt:",
				"",
				"1. `rechnung/erstellen.py`, `erstelle_rechnung()`: lädt die Positionen und ruft die Schritte unten auf.",
				"2. `rechnung/preise.py`, `netto_summe()`: summiert Menge mal Einzelpreis, rechnet in Cent (`int`).",
				"3. `rechnung/rabatt.py`, `wende_rabatt_an()`: multipliziert die Summe mit `(1 - rabatt)` und gibt einen `float` zurück.",
				"4. `rechnung/steuer.py`, `brutto()`: addiert die Mehrwertsteuer und rundet mit `round()`.",
				"",
				"Auffällig: In Schritt 3 wechselt der Betrag von `int` zu `float`. Gerundet wird erst in Schritt 4."
			],
			"optionen": [
				{ "prompt": "Klingt plausibel. Behebe das.", "ziel": "ende_blind", "kommentar": "Du übernimmst die Erklärung, ohne eine Stelle angesehen zu haben." },
				{ "prompt": "Zeig mir `wende_rabatt_an()` und alle Stellen, die sie aufrufen. Gibt es einen Test, der Rabatt und Rundung zusammen prüft?", "ziel": "ende_gut", "kommentar": "Stichprobe an der verdächtigen Stelle, und die Frage nach dem vorhandenen Beleg." }
			]
		},
		"ende_umbau": {
			"agent": "Ich habe 41 Dateien geändert und alle Beträge auf `Decimal` umgestellt. 17 Tests schlagen jetzt fehl, vor allem in der PDF-Erzeugung.",
			"ende": "schlecht",
			"fazit": "Du hast eine große Änderung auf eine Vermutung gebaut. Der Agent hat geraten, weil er weder ein Symptom noch einen Weg kannte. Frag zuerst nach dem Weg, mit Datei und Funktion."
		},
		"ende_blind": {
			"agent": "Ich habe in `rechnung/steuer.py` den Rundungsmodus geändert. Der Test `test_brutto` ist grün.",
			"ende": "schlecht",
			"fazit": "Der Agent hat an Schritt 4 gedreht, verdächtig war aber Schritt 3. Du hättest das gesehen, wenn du die genannte Stelle geöffnet hättest. Eine Erklärung ist erst etwas wert, wenn du sie an einer Stichprobe geprüft hast."
		},
		"ende_gut": {
			"agent": [
				"`rechnung/rabatt.py`, Zeile 12:",
				"",
				"```",
				"def wende_rabatt_an(summe_cent, rabatt):",
				"    return summe_cent * (1 - rabatt)",
				"```",
				"",
				"Aufrufer: nur `erstelle_rechnung()` in `rechnung/erstellen.py`, Zeile 31.",
				"",
				"Tests: `tests/test_rabatt.py` prüft nur glatte Beträge (1000 Cent, 10 %). Einen Test mit Rabatt und anschließender Steuer gibt es nicht. Bei 999 Cent und 15 % entsteht `849.15`, das wird erst nach der Steuer gerundet."
			],
			"ende": "gut",
			"fazit": "Du weißt jetzt, wo der Fehler entsteht, wer die Funktion aufruft und dass ein Test fehlt. Das alles hast du mit drei gezielten Fragen und ohne Meeting herausgefunden. Den Fix delegierst du im nächsten Modul."
		}
	}
}
```

## Transfer

Probier das diese Woche in deinem Projekt:

- Nimm ein Repo, das du nur vom Namen kennst, und stell die drei Fragen: Landkarte, Weg, Stelle.
- Prüfe zwei genannte Dateipfade von Hand. Stimmen sie?
- Wenn du das nächste Mal ein Meeting „zur Einführung in den Code“ ansetzen willst: Probier erst zwanzig Minuten mit dem Agent und geh dann mit gezielten Fragen ins Gespräch.
