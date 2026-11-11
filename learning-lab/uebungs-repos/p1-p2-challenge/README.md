# Level-Up-Challenge P1 → P2: Expressversand

Hands-on-Übung des AI Learning Lab. Du löst sie mit deinem eigenen Tool (Cursor, GitHub Copilot oder OpenCode).
Die Pipeline prüft das Ergebnis und gibt einen Nachweis-Code aus, den du im Learning Lab einträgst.

## Worum es geht

Ein kleiner Bestell-Dienst berechnet Versandkosten, Lieferzeit und Rechnung. Du führst die Versandart
**Express** ein. Die Fachregeln stehen in [`AUFGABE.md`](AUFGABE.md).

Die Challenge verlangt das Verhalten von P2: **erst Kriterien und Plan, dann Code.**

## Ablauf

1. Repo forken (im Unternehmen auf GitLab) und in deinem Tool öffnen.
2. `AUFGABE.md` lesen.
3. `abgabe/KRITERIEN.md` ausfüllen: Akzeptanzkriterien und Negativfälle, bevor Code entsteht.
4. Den Agent im Plan-Modus einen Plan erstellen lassen, prüfen, korrigieren und in `abgabe/PLAN.md` ablegen.
5. Den Agent umsetzen lassen. Diff lesen, Tests laufen lassen, gegen deine Kriterien prüfen.
6. Pushen. Der Job `lab-pruefung` prüft sechs Kriterien und gibt am Ende den Nachweis-Code aus.
7. Den Code im Learning Lab bei der Challenge eintragen.

## Lokal prüfen

Du brauchst nur Python 3.10 oder neuer, keine weiteren Pakete.

```
python3 -m unittest discover tests     # die Tests des Projekts
python3 pruefung/pruefe.py             # dieselbe Prüfung wie in der Pipeline
```

## Was geprüft wird

| Nr. | Kriterium | Prüfung |
| --- | --- | --- |
| 1 | Express funktioniert | Abnahmetests in `pruefung/test_abnahme.py` bestehen |
| 2 | Bestehendes bleibt heil | Alle vorhandenen Tests laufen weiter, keiner fehlt |
| 3 | Negativfall eingehalten | `daten/schema.json` ist unverändert |
| 4 | Kriterien liegen vor | `abgabe/KRITERIEN.md`: mindestens drei prüfbare Akzeptanzkriterien, ein Negativfall |
| 5 | Plan liegt vor | `abgabe/PLAN.md`: mindestens drei Schritte, Dateien genannt, ein Prüfschritt |
| 6 | Eigene Tests ergänzt | Neue Tests für Express im Ordner `tests/` |

## Spielregeln

- Der Ordner `pruefung/` und die Datei `.gitlab-ci.yml` werden nicht verändert.
- Du darfst beliebig oft neu abgeben.
- Die Challenge ist freiwillig und dient nicht der Bewertung. Der Nachweis-Code schützt vor Tippfehlern,
  nicht vor Fälschung.
