import unittest

from bestellung.lieferzeit import lieferzeit_tage
from bestellung.rechnung import erstelle_rechnung
from bestellung.versand import versandkosten


class ExpressTest(unittest.TestCase):
    def test_express_zuschlag(self):
        self.assertEqual(versandkosten(3, "express"), 10.90)

    def test_express_grenze_20_kg(self):
        self.assertEqual(versandkosten(20, "express"), 18.40)
        with self.assertRaises(ValueError):
            versandkosten(21, "express")

    def test_express_lieferzeit(self):
        self.assertEqual(lieferzeit_tage("express"), 1)

    def test_express_zuschlag_bleibt_ab_100(self):
        bestellung = {"positionen": [{"artikel": "Karte", "menge": 1, "einzelpreis": 120.0}], "gewicht_kg": 2.0, "versandart": "express"}
        self.assertEqual(erstelle_rechnung(bestellung)["versand"], 6.00)


if __name__ == "__main__":
    unittest.main()
