---
id: p2-pruefen-statt-glauben
titel: Prüfen statt glauben
stufe: 2
dauer: 20
lernziel: Du forderst vom Agent Belege statt einer Selbstbewertung und erkennst Behauptungen, hinter denen kein Nachweis steht.
tools: [cursor, copilot, opencode]
schutzklassen: [cloud, ec, vsnfd]
verantwortlich: Service-Team Agentic Development
geprueft: 2026-11-11
status: Entwurf, fachliches Review offen
tool_versionen: Bedienhinweise Stand November 2026, noch nicht gegen feste Tool-Versionen geprüft
---

## Warum

Ein Agent sagt fast immer, dass alles geklappt hat. Wertvoll wird sein Bericht erst, wenn hinter jedem Satz etwas steht, das du nachsehen kannst.

```vergleich
vorher: „Ich habe das Feature vollständig umgesetzt. Der Code ist sauber, und alle Tests laufen.“ Du glaubst es, und im Review fällt auf, dass die Gewichtsgrenze fehlt.
nachher: Der Bericht ist eine Tabelle: Kriterium, Beleg, Status. Bei der Gewichtsgrenze steht „kein Test vorhanden“. Du siehst die Lücke in zehn Sekunden.
```

## Konzept

Eine **Selbstbewertung** ist eine Meinung des Modells über seine Arbeit. Ein **Beleg** ist etwas, das unabhängig vom Modell stimmt oder nicht stimmt.

| Selbstbewertung | Beleg |
| --- | --- |
| „Alle Tests laufen.“ | Die Ausgabe des Test-Befehls mit Anzahl und Ergebnis |
| „Das Schema ist unverändert.“ | `git diff --stat` zeigt die Datei nicht |
| „Die Gewichtsgrenze ist umgesetzt.“ | Name des Tests, der sie prüft, und sein Ergebnis |
| „Der Code ist sauber.“ | Ausgabe des Linters |

```diagramm
fluss: Kriterien aus dem Auftrag -> Zu jedem Kriterium ein Beleg -> Beleg selbst ansehen -> Lücken zurückgeben
```

So forderst du Belege ein:

- **Im Auftrag:** „Zeig am Ende zu jedem Kriterium den Beleg: Testname und Ausgabe oder Befehl und Ausgabe. Schreib ‚nicht belegt‘, wenn du keinen hast.“
- **Tests als Kriterium:** Ein Kriterium ist erfüllt, wenn ein Test es prüft und grün ist. Lass den Test zuerst schreiben und rot sehen, dann die Umsetzung.
- **Negativfälle prüfen:** Für „nicht anfassen“ ist der Beleg der Diff. Lass die Liste der geänderten Dateien zeigen.

> Erlaub dem Agent ausdrücklich, „nicht belegt“ zu schreiben. Ohne diese Erlaubnis füllt er die Lücke mit einer Behauptung.

Diese Tabelle aus Kriterium, Beleg und Status heißt auf P4 **Evidenz-Matrix** und ist dort Pflicht für jedes Ergebnis eines autonomen Agents.

## In deinem Tool

### Cursor

- Lass den Agent die Tests im Terminal ausführen. Die Ausgabe steht im Verlauf und lässt sich aufklappen.
- Die Liste der geänderten Dateien siehst du in der Review-Ansicht. Vergleiche sie mit deinen Negativfällen.
- Eine Rule wie „Beende jede Aufgabe mit einer Tabelle Kriterium, Beleg, Status“ macht den Bericht zum Standard.

### GitHub Copilot

- Der Agent-Modus führt Tests im Terminal aus und liest die Ausgabe. Öffne das Terminal und lies sie selbst.
- Die geänderten Dateien stehen über dem Eingabefeld im Chat und in der Quellcodeverwaltung.
- Den Wunsch nach einer Beleg-Tabelle legst du in den Instructions des Repos ab.

### OpenCode

- Der Build-Agent führt Befehle aus und zeigt die Ausgabe im Verlauf.
- Mit `git status` und `git diff --stat` im zweiten Terminal prüfst du die Negativfälle selbst.
- Den Wunsch nach einer Beleg-Tabelle schreibst du in die `AGENTS.md`.

### Selbst gehostete Modelle

Kleinere Modelle behaupten öfter einen Testlauf, den es nicht gab, oder fassen eine rote Ausgabe als grün zusammen. Verlange die Ausgabe wörtlich und lass die Tests im Zweifel selbst laufen. Der Aufwand ist klein, und die Trefferquote solcher Kontrollen ist hier höher.

## Übung

```uebung
{
	"typ": "fehler",
	"titel": "Welche Sätze sind nur Behauptung?",
	"aufgabe": [
		"Der Auftrag hatte vier Kriterien: Zuschlag 6,00 €, Grenze 20 kg mit `ValueError`, Lieferzeit 1 Tag, Schema unverändert.",
		"",
		"Das ist der Abschlussbericht des Agents. Markiere jede Zeile, die etwas behauptet, ohne es zu belegen."
	],
	"verweis": "konzept",
	"toleranz": 1,
	"zeilen": [
		"## Abschlussbericht",
		"",
		"!! Ich habe den Expressversand vollständig und sauber umgesetzt.",
		"",
		"1. Zuschlag 6,00 €: test_express_zuschlag in tests/test_versand.py, bestanden",
		"!! 2. Grenze 20 kg: ist umgesetzt und funktioniert zuverlässig.",
		"3. Lieferzeit 1 Tag: test_express_lieferzeit in tests/test_lieferzeit.py, bestanden",
		"!! 4. Schema: Ich habe darauf geachtet, das Schema nicht zu verändern.",
		"",
		"$ python3 -m unittest discover tests",
		"Ran 11 tests in 0.004s",
		"OK",
		"",
		"!! Auch alle Randfälle sind abgedeckt.",
		"!! Der Code ist bereit für den Merge."
	],
	"fehler": [
		{ "warum": "„Vollständig und sauber“ ist eine Selbstbewertung. Vollständig zeigt die Tabelle darunter, sauber zeigt ein Linter.", "tipp": "Such nach Sätzen, die ein Urteil enthalten statt eines Testnamens oder einer Ausgabe." },
		{ "warum": "Für die Gewichtsgrenze wird kein Test genannt. Bei den Punkten 1 und 3 steht einer. Genau hier ist die Lücke.", "tipp": "Vergleiche die vier nummerierten Punkte: Welche nennen einen Test, welche nicht?" },
		{ "warum": "„Ich habe darauf geachtet“ ist eine Absichtserklärung. Der Beleg wäre die Liste der geänderten Dateien.", "tipp": "Womit ließe sich „Schema unverändert“ belegen?" },
		{ "warum": "Welche Randfälle, durch welche Tests? Ohne Namen ist das nicht prüfbar.", "tipp": "Was steht nach der Testausgabe noch im Bericht?" },
		{ "warum": "Ob etwas bereit für den Merge ist, entscheidet das Review. Der Agent kann Belege liefern, kein Urteil." }
	],
	"fazit": "Fünf Behauptungen, zwei echte Belege und eine Testausgabe. Die Gewichtsgrenze und das Schema sind nicht belegt. Diese beiden Punkte gibst du zurück."
}
```

## Transfer

Probier das diese Woche in deinem Projekt:

- Häng an deinen nächsten Auftrag den Satz: „Zeig am Ende zu jedem Kriterium den Beleg oder schreib ‚nicht belegt‘.“
- Prüfe bei einem Agent-Bericht zwei Belege von Hand nach. Stimmen sie?
- Wenn die Beleg-Tabelle hilft: Trag sie als Regel in die `AGENTS.md` ein, dann bekommt sie das ganze Team.
