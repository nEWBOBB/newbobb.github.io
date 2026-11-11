import unittest

from bestellung.lieferzeit import lieferzeit_tage


class LieferzeitTest(unittest.TestCase):
    def test_standard_drei_tage(self):
        self.assertEqual(lieferzeit_tage("standard"), 3)

    def test_unbekannte_versandart_lieferzeit(self):
        with self.assertRaises(ValueError):
            lieferzeit_tage("drohne")


if __name__ == "__main__":
    unittest.main()
