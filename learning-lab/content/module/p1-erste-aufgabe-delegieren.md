---
id: p1-erste-aufgabe-delegieren
titel: Erste Aufgabe komplett delegieren
stufe: 1
dauer: 25
lernziel: Du gibst eine kleine Änderung samt Tests vollständig an den Agent ab und übernimmst das Ergebnis erst, wenn du den Diff gelesen und die Tests gesehen hast.
tools: [cursor, copilot, opencode]
schutzklassen: [cloud, ec, vsnfd]
verantwortlich: Service-Team Agentic Development
geprueft: 2026-11-11
status: Entwurf, fachliches Review offen
tool_versionen: Bedienhinweise Stand November 2026, noch nicht gegen feste Tool-Versionen geprüft
---

## Warum

Delegieren spart erst dann Zeit, wenn du das Ergebnis in zwei Minuten prüfen kannst, statt es nachzubauen.

```vergleich
vorher: Du lässt eine Funktion ändern, überfliegst die Zusammenfassung des Agents, übernimmst alles und findest zwei Tage später einen gelöschten Test.
nachher: Du gibst eine kleine, abgeschlossene Aufgabe ab, liest den Diff Zeile für Zeile, lässt die Tests laufen und übernimmst nur, was du verstanden hast.
```

## Konzept

Eine Aufgabe eignet sich für den Anfang, wenn sie **klein**, **abgeschlossen** und **prüfbar** ist: eine Funktion, ein Fehler, ein Test.

```diagramm
fluss: Kleine Aufgabe mit Ziel -> Agent ändert und testet -> Diff lesen -> Tests selbst sehen -> Übernehmen oder zurückgeben
```

Beim Lesen des Diffs suchst du gezielt nach vier Dingen:

- **Mehr als bestellt:** Dateien oder Zeilen, die mit der Aufgabe nichts zu tun haben.
- **Geschwächte Tests:** gelöschte Tests, gelockerte Erwartungen, `skip`-Markierungen.
- **Abkürzungen:** fest eingetragene Werte, die nur den Test bestehen lassen, verschluckte Fehler.
- **Fehlendes:** die Aufgabe verlangte einen Test, aber es gibt keinen.

> Die Zusammenfassung des Agents ist kein Beleg. Der Diff zeigt, was geändert wurde. Die Testausgabe zeigt, ob es läuft.

Wenn etwas nicht passt, gibst du es zurück: mit der Zeile, die dich stört, und dem Grund. Von Hand nachbessern ist auf P1 normal, aber jedes Zurückgeben zeigt dir, was im Auftrag gefehlt hat. Genau das wird auf P2 zu Kriterien.

## In deinem Tool

### Cursor

1. Agent-Modus, Auftrag mit Datei: „Ergänze in `@versand.py` … und schreib einen Test dazu. Starte die Tests.“
2. Nach dem Lauf zeigt Cursor die geänderten Dateien. Öffne die Review-Ansicht und geh jede Änderung durch.
3. Einzelne Änderungen kannst du annehmen oder ablehnen. Mit einem Checkpoint setzt du den ganzen Lauf zurück.
4. Lass die Tests im Terminal noch einmal selbst laufen.

### GitHub Copilot

1. Agent-Modus, Auftrag mit Datei als Kontext (`#`-Verweis oder geöffnete Datei).
2. Copilot zeigt die geänderten Dateien im Chat und im Editor als Diff an. Mit **Keep** und **Undo** entscheidest du pro Datei oder pro Änderung.
3. Terminal-Befehle bestätigst du einzeln. Lies die Testausgabe im Terminal, nicht nur die Zusammenfassung.
4. Über die Checkpoints im Chat stellst du einen früheren Stand wieder her.

### OpenCode

1. Build-Agent, Auftrag mit `@versand.py`.
2. Lies den Diff mit `git diff` im zweiten Terminal oder in deinem Editor.
3. Mit `/undo` nimmst du die letzte Änderung des Agents zurück.
4. Lass die Tests selbst laufen, bevor du committest.

### Selbst gehostete Modelle

Kleinere Modelle ändern eher zu viel oder vergessen den Test. Gib eine Datei und eine Funktion pro Auftrag, und nenne den Test-Befehl ausdrücklich. Lies den Diff besonders auf Änderungen außerhalb der genannten Datei.

## Übung

```uebung
{
	"typ": "fehler",
	"titel": "Lies den Diff, bevor du übernimmst",
	"aufgabe": [
		"Dein Auftrag war: „In `versand.py` soll `versandkosten()` für Pakete über 30 kg einen `ValueError` auslösen. Schreib einen Test dazu.“",
		"",
		"Der Agent meldet: „Erledigt. Gewichtsgrenze eingebaut, Test ergänzt, alle Tests grün.“ Das ist sein Diff."
	],
	"verweis": "konzept",
	"zeilen": [
		"--- a/bestellung/versand.py",
		"+++ b/bestellung/versand.py",
		" def versandkosten(gewicht_kg):",
		"+    if gewicht_kg > 30:",
		"+        raise ValueError(\"Paket zu schwer\")",
		"     if gewicht_kg <= 5:",
		"!!-        return 4.90",
		"!!+        return 4.99",
		"     return 4.90 + (gewicht_kg - 5) * 0.50",
		"",
		"--- a/bestellung/rechnung.py",
		"+++ b/bestellung/rechnung.py",
		"!!-    kosten = versandkosten(gewicht)",
		"!!+    try:",
		"!!+        kosten = versandkosten(gewicht)",
		"!!+    except ValueError:",
		"!!+        kosten = 0",
		"",
		"--- a/tests/test_versand.py",
		"+++ b/tests/test_versand.py",
		"!!-def test_standardpreis_bis_5_kg():",
		"!!-    assert versandkosten(3) == 4.90",
		"+def test_zu_schwer():",
		"+    with pytest.raises(ValueError):",
		"+        versandkosten(31)"
	],
	"fehler": [
		{ "warum": "Der Standardpreis wurde von 4,90 auf 4,99 geändert. Das war nicht bestellt.", "tipp": "Vergleiche jede entfernte Zeile mit der, die sie ersetzt." },
		{ "warum": "Zweite Hälfte derselben Preisänderung: mehr als bestellt." },
		{ "warum": "Die Rechnung wurde angefasst, obwohl der Auftrag nur `versand.py` betraf.", "tipp": "Welche Dateien nennt der Auftrag, und welche stehen im Diff?" },
		{ "warum": "Hier beginnt eine Abkürzung: Der neue Fehler wird abgefangen." },
		{ "warum": "Gehört zum Abfangen des Fehlers." },
		{ "warum": "Der `ValueError` wird verschluckt. Genau der Fehler, den du bestellt hast, kommt nie beim Aufrufer an.", "tipp": "Was passiert mit dem neuen ValueError in der Rechnung?" },
		{ "warum": "Zu schwere Pakete kosten jetzt 0 Euro Versand. Das ist eine Abkürzung, die Tests grün hält und fachlich falsch ist." },
		{ "warum": "Ein bestehender Test wurde gelöscht. Deshalb fiel die Preisänderung oben nicht auf.", "tipp": "Fehlt in der Testdatei etwas, das vorher da war?" },
		{ "warum": "Gehört zum gelöschten Test. „Alle Tests grün“ stimmt nur, weil dieser Test nicht mehr existiert." }
	],
	"fazit": "Alles gefunden. Der Agent hatte recht mit „alle Tests grün“, und trotzdem war das Ergebnis falsch: mehr als bestellt, ein verschluckter Fehler, ein gelöschter Test."
}
```

```uebung
{
	"typ": "handson",
	"titel": "Im echten Repo: die Level-Up-Challenge",
	"challenge": "p1-p2",
	"text": "Die Hands-on-Übung dieser Stufe ist zugleich die Level-Up-Challenge. Du löst sie mit deinem eigenen Tool in einem Übungs-Repo, die Pipeline prüft das Ergebnis. Sie verlangt schon Kriterien und einen Plan. Wenn du dabei hängst, helfen die ersten beiden Module von P2."
}
```

## Transfer

Probier das diese Woche in deinem Projekt:

- Such dir eine kleine, abgeschlossene Aufgabe: einen fehlenden Test, eine Validierung, eine bessere Fehlermeldung. Gib sie komplett ab.
- Lies den Diff vollständig, bevor du die Zusammenfassung liest. Notier dir, was du zurückgeben musstest.
- Aus diesen Notizen werden auf P2 deine ersten Kriterien.
