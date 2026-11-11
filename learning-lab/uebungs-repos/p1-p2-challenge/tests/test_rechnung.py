import unittest

from bestellung.rechnung import erstelle_rechnung, netto_summe


def bestellung(preis, gewicht=2.0, **mehr):
    return {"positionen": [{"artikel": "Karte", "menge": 1, "einzelpreis": preis}], "gewicht_kg": gewicht, **mehr}


class RechnungTest(unittest.TestCase):
    def test_netto_summe(self):
        self.assertEqual(netto_summe([{"menge": 2, "einzelpreis": 9.5}, {"menge": 1, "einzelpreis": 24.0}]), 43.0)

    def test_rechnung_standard(self):
        r = erstelle_rechnung(bestellung(50.0))
        self.assertEqual(r["versand"], 4.90)
        self.assertEqual(r["lieferzeit_tage"], 3)
        self.assertEqual(r["brutto"], 65.33)

    def test_versandfrei_ab_100(self):
        r = erstelle_rechnung(bestellung(120.0))
        self.assertEqual(r["versand"], 0.0)
        self.assertEqual(r["brutto"], 142.80)


if __name__ == "__main__":
    unittest.main()
