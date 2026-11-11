# Plan für den Expressversand

1. `tests/test_express.py` anlegen: je ein Test für Zuschlag, Grenze 20 kg, Lieferzeit und Rechnung ab 100 €. Die Tests schlagen zuerst fehl.
2. `bestellung/versand.py`: Standardpreis in eine Hilfsfunktion ziehen, Express als Standardpreis plus 6,00 € mit Grenze 20 kg ergänzen.
3. `bestellung/lieferzeit.py`: Express gibt 1 Tag zurück.
4. `bestellung/rechnung.py`: Ab 100 € entfällt bei Express nur der Standardanteil, der Zuschlag bleibt.
5. Prüfen: `python3 -m unittest discover tests` und `git diff --stat`, das Schema taucht nicht auf.
