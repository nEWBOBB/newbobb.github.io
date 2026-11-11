# Aufgabe: Versandart Express

Der Bestell-Dienst kennt bisher nur den Standardversand. Kunden sollen Express wählen können.

## Fachregeln

1. **Kosten:** Express kostet den Standardpreis für das Gewicht plus **6,00 €** Zuschlag.
2. **Gewichtsgrenze:** Express gibt es nur bis **20 kg**. Darüber löst `versandkosten()` einen `ValueError` aus.
   Für Standard bleibt die Grenze bei 30 kg.
3. **Lieferzeit:** Express wird in **1 Tag** geliefert, Standard weiterhin in 3 Tagen.
4. **Rechnung:** Ab 100,00 € Warenwert ist der Standardversand kostenlos. Bei Express entfällt dann nur der
   Standardanteil, der Zuschlag von 6,00 € bleibt.
5. **Unbekannte Versandart:** löst wie bisher einen `ValueError` aus.

## Rahmen

- Betroffen sind `bestellung/versand.py`, `bestellung/lieferzeit.py` und `bestellung/rechnung.py`.
- Die Versandart steht schon in der Bestellung (`bestellung["versandart"]`) und im Schema.
- **`daten/schema.json` gehört einem anderen Team und wird nicht geändert.**
- Die Signaturen der vorhandenen Funktionen bleiben, wie sie sind.
- Vorhandene Tests bleiben erhalten. Für die neuen Regeln kommen Tests dazu.
- Nur die Python-Standardbibliothek.

## Abgabe

- `abgabe/KRITERIEN.md`: deine Akzeptanzkriterien und Negativfälle, geschrieben vor dem Code
- `abgabe/PLAN.md`: der Plan, den du mit dem Agent abgestimmt hast
- der geänderte Code und die neuen Tests
