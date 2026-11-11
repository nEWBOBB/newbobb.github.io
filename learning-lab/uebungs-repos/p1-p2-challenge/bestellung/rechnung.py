"""Rechnung des Bestell-Dienstes."""

from bestellung.lieferzeit import lieferzeit_tage
from bestellung.versand import versandkosten

MWST = 0.19
VERSANDFREI_AB = 100.00


def netto_summe(positionen):
    """Summe aus Menge mal Einzelpreis über alle Positionen."""
    return round(sum(p["menge"] * p["einzelpreis"] for p in positionen), 2)


def erstelle_rechnung(bestellung):
    """Erstellt die Rechnung zu einer Bestellung (Aufbau siehe daten/schema.json)."""
    versandart = bestellung.get("versandart", "standard")
    netto = netto_summe(bestellung["positionen"])
    versand = versandkosten(bestellung["gewicht_kg"], versandart)
    if netto >= VERSANDFREI_AB:
        versand = 0.0
    return {
        "netto": netto,
        "versand": versand,
        "lieferzeit_tage": lieferzeit_tage(versandart),
        "brutto": round((netto + versand) * (1 + MWST), 2),
    }
