# Kriterien für den Expressversand

## Akzeptanzkriterien

- `versandkosten(3, "express")` ergibt 10,90 € (Standardpreis 4,90 € plus 6,00 € Zuschlag).
- `versandkosten(20, "express")` funktioniert, über 20 kg wird ein `ValueError` ausgelöst.
- `lieferzeit_tage("express")` ergibt 1, Standard bleibt bei 3.
- Ab 100,00 € Warenwert kostet Express in der Rechnung genau 6,00 € Versand.
- Für jede der vier Regeln gibt es einen Test in `tests/test_express.py`.

## Negativfälle

- `daten/schema.json` wird nicht verändert.
- Die Signaturen von `versandkosten()`, `lieferzeit_tage()` und `erstelle_rechnung()` bleiben gleich.
- Kein vorhandener Test wird gelöscht, umbenannt oder abgeschwächt.
- Die Grenze von 30 kg für Standard bleibt bestehen.

## Prüfung

`python3 -m unittest discover tests` läuft ohne Fehler, und `git diff --stat` zeigt weder `daten/` noch `pruefung/`.
