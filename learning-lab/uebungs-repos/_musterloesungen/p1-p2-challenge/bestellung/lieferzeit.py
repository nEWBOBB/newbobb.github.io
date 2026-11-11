"""Lieferzeit des Bestell-Dienstes."""

LIEFERZEIT_TAGE = {"standard": 3, "express": 1}


def lieferzeit_tage(versandart="standard"):
    """Gibt die Lieferzeit in Tagen zurück."""
    if versandart not in LIEFERZEIT_TAGE:
        raise ValueError(f"Unbekannte Versandart: {versandart}")
    return LIEFERZEIT_TAGE[versandart]
