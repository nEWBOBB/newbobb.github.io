---
name: modul-erstellen
description: Erstellt ein neues Modul für das AI Learning Lab im richtigen Format, mit Metadaten, fünf Abschnitten, Tool-Varianten und mindestens einer automatisch geprüften Übung. Verwenden, wenn jemand ein Modul, eine Übung oder einen Lerninhalt für das Learning Lab anlegen oder überarbeiten will.
---

# Modul für das AI Learning Lab erstellen

Du erstellst ein Modul als Markdown-Datei unter `learning-lab/content/module/<id>.md`. Die Plattform liest die
Datei direkt, es gibt keinen Build-Schritt. Ein Mensch prüft dein Ergebnis im Merge Request.

## Vor dem Schreiben klären

Frag nach, wenn etwas davon fehlt:

- **Stufe** (1 bis 4) und **Thema** des Moduls
- **Lernziel** in einem Satz: Was kann die Person danach?
- **Quelle der Wahrheit** für die Bedienung der Tools: interne Doku, Tool-Doku, eine Demo. Rate keine
  Menüpunkte und Tastenkürzel. Was du nicht belegen kannst, formulierst du allgemein und nennst es im MR.

## Vorgehen

1. Lies `learning-lab/content/README.md` (Format) und ein bestehendes Modul derselben Stufe als Beispiel.
2. Kopiere `learning-lab/content/vorlage/modul-vorlage.md` nach `learning-lab/content/module/<id>.md`.
   Die `id` beginnt mit `p<stufe>-` und besteht aus Kleinbuchstaben und Bindestrichen.
3. Fülle die Metadaten. `geprueft` ist das heutige Datum, `status` bleibt „Entwurf, fachliches Review offen“.
4. Schreib die fünf Abschnitte mit genau diesen Überschriften: Warum, Konzept, In deinem Tool, Übung, Transfer.
5. Trag die `id` in `learning-lab/content/katalog.json` bei der Stufe unter `module` ein. Entferne einen
   passenden Eintrag unter `geplant`.
6. Prüfe das Ergebnis (siehe unten) und nenne im MR, was ein Mensch fachlich prüfen muss.

## Regeln für den Inhalt

- **Sprache:** Deutsch, du-Form, englische Fachbegriffe wo üblich. Kurze Sätze, echte Umlaute.
- **Warum:** ein Satz Nutzen, dann ein Block `vergleich` mit einer konkreten Situation vorher und nachher.
- **Konzept:** höchstens etwa 350 Wörter. Mindestens ein Block `diagramm`. Tabellen und Listen statt Textwänden.
- **In deinem Tool:** je ein Unterabschnitt für Cursor, GitHub Copilot und OpenCode. Fehlt eine Funktion,
  schreib das ausdrücklich hin und nenne die nächstbeste Alternative. Dazu ein Unterabschnitt
  „Selbst gehostete Modelle“ mit dem, was sich bei kleineren Modellen ändert.
- **Schutzklassen:** Cloud Agents von Cursor und Copilot sind nicht freigegeben. In Export Controlled und
  VS-NfD läuft nur OpenCode mit selbst gehosteten Modellen. Schreib nichts, was dem widerspricht.
- **Übung:** mindestens eine, im Format aus der README. Sie prüft Verhalten, nicht Begriffe. Jede Option hat
  eine Erklärung, jede Regel einen Hinweis, der sagt, was fehlt. Die Übung verweist bei Fehlern auf den
  Abschnitt, in dem die Antwort steht.
- **Transfer:** zwei bis drei kleine Aufgaben für das eigene Projekt.
- **Keine vertraulichen Inhalte:** keine internen Adressen, Namen, Schlüssel. Verweise auf interne
  Ressourcen statt sie zu kopieren.
- **Keine Live-Modelle:** Agent-Antworten in Übungen sind vorgefertigter Text.

## Prüfen, bevor du fertig meldest

- Jeder Block `uebung` ist gültiges JSON: `python3 -c "import json,re,sys; [json.loads(b) for b in re.findall(r'```uebung\n(.*?)\n```', open(sys.argv[1]).read(), re.S)]" learning-lab/content/module/<id>.md`
- Bei `fehler`-Übungen: Anzahl der Zeilen mit `!!` ist gleich der Anzahl der Einträge unter `fehler`.
- Bei `session`-Übungen: Jedes `ziel` gibt es als Knoten, und mindestens ein Weg endet mit `"ende": "gut"`.
- Bei `artefakt`-Übungen: Die Vorlage allein besteht die Prüfung nicht, eine gute Lösung besteht sie.
- `python3 -m http.server` im Ordner `learning-lab/` starten und das Modul unter `#/modul/<id>` ansehen.

## Im Merge Request nennen

- Welche Aussagen zur Tool-Bedienung du aus welcher Quelle hast und welche ungeprüft sind
- Für welche Schutzklassen das Modul gilt
- Wer fachlich prüfen sollte
