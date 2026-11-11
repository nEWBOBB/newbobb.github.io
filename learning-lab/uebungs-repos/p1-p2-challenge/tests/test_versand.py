import unittest

from bestellung.versand import versandkosten


class VersandTest(unittest.TestCase):
    def test_standardpreis_bis_5_kg(self):
        self.assertEqual(versandkosten(3), 4.90)

    def test_standard_aufpreis_je_weiteres_kg(self):
        self.assertEqual(versandkosten(8), 6.40)

    def test_standard_zu_schwer(self):
        with self.assertRaises(ValueError):
            versandkosten(31)

    def test_unbekannte_versandart(self):
        with self.assertRaises(ValueError):
            versandkosten(3, "drohne")


if __name__ == "__main__":
    unittest.main()
