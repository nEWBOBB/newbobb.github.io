"""Lieferzeit des Bestell-Dienstes."""


def lieferzeit_tage(versandart="standard"):
    """Gibt die Lieferzeit in Tagen zurück."""
    if versandart == "standard":
        return 3
    if versandart == "express":
        raise NotImplementedError("Express ist noch nicht umgesetzt")
    raise ValueError(f"Unbekannte Versandart: {versandart}")
