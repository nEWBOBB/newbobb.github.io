"""Versandkosten des Bestell-Dienstes."""

GRUNDPREIS = 4.90
FREIGEWICHT_KG = 5
PREIS_JE_WEITERES_KG = 0.50
MAX_GEWICHT_STANDARD_KG = 30


def versandkosten(gewicht_kg, versandart="standard"):
    """Gibt die Versandkosten in Euro zurück."""
    if gewicht_kg <= 0:
        raise ValueError("Gewicht muss größer als 0 sein")
    if versandart == "express":
        raise NotImplementedError("Express ist noch nicht umgesetzt")
    if versandart != "standard":
        raise ValueError(f"Unbekannte Versandart: {versandart}")
    if gewicht_kg > MAX_GEWICHT_STANDARD_KG:
        raise ValueError("Paket zu schwer für den Standardversand")
    if gewicht_kg <= FREIGEWICHT_KG:
        return GRUNDPREIS
    return round(GRUNDPREIS + (gewicht_kg - FREIGEWICHT_KG) * PREIS_JE_WEITERES_KG, 2)
