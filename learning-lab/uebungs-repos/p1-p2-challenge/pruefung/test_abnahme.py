"""Abnahmetests der Challenge. Diese Datei wird nicht verändert."""

import unittest

from bestellung.lieferzeit import lieferzeit_tage
from bestellung.rechnung import erstelle_rechnung
from bestellung.versand import versandkosten


def bestellung(preis, gewicht, versandart):
    return {"positionen": [{"artikel": "Karte", "menge": 1, "einzelpreis": preis}], "gewicht_kg": gewicht, "versandart": versandart}


class AbnahmeExpress(unittest.TestCase):
    def test_zuschlag_leichtes_paket(self):
        self.assertAlmostEqual(versandkosten(3, "express"), 10.90, places=2)

    def test_zuschlag_schweres_paket(self):
        self.assertAlmostEqual(versandkosten(8, "express"), 12.40, places=2)

    def test_grenze_20_kg_gilt_noch(self):
        self.assertAlmostEqual(versandkosten(20, "express"), 18.40, places=2)

    def test_ueber_20_kg_abgelehnt(self):
        with self.assertRaises(ValueError):
            versandkosten(20.5, "express")

    def test_standard_grenze_bleibt_30_kg(self):
        self.assertAlmostEqual(versandkosten(25, "standard"), 14.90, places=2)

    def test_lieferzeit_express(self):
        self.assertEqual(lieferzeit_tage("express"), 1)

    def test_rechnung_express(self):
        r = erstelle_rechnung(bestellung(50.0, 2.0, "express"))
        self.assertAlmostEqual(r["versand"], 10.90, places=2)
        self.assertEqual(r["lieferzeit_tage"], 1)
        self.assertAlmostEqual(r["brutto"], 72.47, places=2)

    def test_rechnung_express_ab_100_bleibt_zuschlag(self):
        r = erstelle_rechnung(bestellung(120.0, 2.0, "express"))
        self.assertAlmostEqual(r["versand"], 6.00, places=2)
        self.assertAlmostEqual(r["brutto"], 149.94, places=2)

    def test_unbekannte_versandart_bleibt_fehler(self):
        with self.assertRaises(ValueError):
            versandkosten(3, "drohne")


if __name__ == "__main__":
    unittest.main()
