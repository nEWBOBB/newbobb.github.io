#!/usr/bin/env python3
"""Prüft die Abgabe der Level-Up-Challenge P1 -> P2 und gibt einen Nachweis-Code aus.

Aufruf im Wurzelordner des Repos: python3 pruefung/pruefe.py
Diese Datei wird nicht verändert. Sie braucht nur die Python-Standardbibliothek.
"""

import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
KENNUNG = "P1P2"
SCHEMA_SHA256 = "fa51f5a552990b8c86dfc4c473e86a0104aa245d0a126e7bcd0ff6e292f38231"
VORHANDENE_TESTS = {
    "test_standardpreis_bis_5_kg",
    "test_standard_aufpreis_je_weiteres_kg",
    "test_standard_zu_schwer",
    "test_unbekannte_versandart",
    "test_standard_drei_tage",
    "test_unbekannte_versandart_lieferzeit",
    "test_netto_summe",
    "test_rechnung_standard",
    "test_versandfrei_ab_100",
}


def lies(pfad):
    try:
        return (WURZEL / pfad).read_text(encoding="utf-8")
    except OSError:
        return ""


def tests_laufen(*argumente):
    lauf = subprocess.run([sys.executable, "-m", "unittest", *argumente], cwd=WURZEL, capture_output=True, text=True)
    return lauf.returncode == 0, (lauf.stderr or lauf.stdout).strip().splitlines()[-1:] or [""]


def testnamen():
    namen = []
    for datei in sorted((WURZEL / "tests").glob("test_*.py")):
        namen += re.findall(r"^\s*def (test_\w+)\(", datei.read_text(encoding="utf-8"), re.M)
    return namen


def abschnitt(text, titel):
    """Zeilen unter der Überschrift '## titel' bis zur nächsten Überschrift."""
    treffer = re.search(rf"^##\s+{titel}.*?$(.*?)(?=^##\s|\Z)", text, re.M | re.S | re.I)
    return treffer.group(1) if treffer else ""


def punkte(text):
    """Ausgefüllte Listenpunkte: nicht leer, kein TODO, mindestens 12 Zeichen."""
    roh = re.findall(r"^\s*(?:[-*]|\d+[.)])\s+(.+)$", text, re.M)
    return [p.strip() for p in roh if "TODO" not in p.upper() and len(p.strip()) >= 12]


def pruefe_abnahme():
    ok, ende = tests_laufen("pruefung.test_abnahme")
    return ok, "Abnahmetests: " + ende[0]


def pruefe_bestand():
    ok, ende = tests_laufen("discover", "-s", "tests", "-t", ".")
    fehlen = sorted(VORHANDENE_TESTS - set(testnamen()))
    if fehlen:
        return False, "Diese vorhandenen Tests fehlen: " + ", ".join(fehlen)
    return ok, "Tests des Projekts: " + ende[0]


def pruefe_schema():
    inhalt = lies("daten/schema.json").replace("\r\n", "\n").encode("utf-8")
    ok = hashlib.sha256(inhalt).hexdigest() == SCHEMA_SHA256
    return ok, "daten/schema.json ist unverändert" if ok else "daten/schema.json wurde verändert"


def pruefe_kriterien():
    text = lies("abgabe/KRITERIEN.md")
    akzeptanz = punkte(abschnitt(text, "Akzeptanzkriterien"))
    negativ = punkte(abschnitt(text, "Negativf"))
    messbar = [p for p in akzeptanz if re.search(r"\d|`|test_|ValueError", p)]
    if len(akzeptanz) < 3:
        return False, f"KRITERIEN.md: {len(akzeptanz)} ausgefüllte Akzeptanzkriterien, mindestens 3 nötig"
    if len(messbar) < 2:
        return False, "KRITERIEN.md: Zu wenige Kriterien sind prüfbar (Wert, Befehl oder Testname fehlt)"
    if not negativ:
        return False, "KRITERIEN.md: Es fehlt ein Negativfall"
    return True, f"KRITERIEN.md: {len(akzeptanz)} Akzeptanzkriterien, {len(negativ)} Negativfälle"


def pruefe_plan():
    text = lies("abgabe/PLAN.md")
    schritte = [s for s in re.findall(r"^\s*\d+[.)]\s+(.+)$", text, re.M) if "TODO" not in s.upper() and len(s.strip()) >= 12]
    mit_datei = [s for s in schritte if re.search(r"\w+\.(py|md|json)\b", s)]
    mit_pruefung = [s for s in schritte if re.search(r"test|prüf|pruef", s, re.I)]
    if len(schritte) < 3:
        return False, f"PLAN.md: {len(schritte)} ausgefüllte Schritte, mindestens 3 nötig"
    if len(mit_datei) < 2:
        return False, "PLAN.md: Die Schritte nennen keine Dateien"
    if not mit_pruefung:
        return False, "PLAN.md: Es fehlt ein Prüfschritt (Tests schreiben oder laufen lassen)"
    return True, f"PLAN.md: {len(schritte)} Schritte, {len(mit_datei)} mit Datei"


def pruefe_eigene_tests():
    neu = [n for n in testnamen() if n not in VORHANDENE_TESTS]
    alle = "".join(d.read_text(encoding="utf-8") for d in (WURZEL / "tests").glob("test_*.py"))
    if len(neu) < 2 or "express" not in alle.lower():
        return False, f"tests/: {len(neu)} neue Tests, mindestens 2 für Express nötig"
    return True, f"tests/: {len(neu)} neue Tests"


# Reihenfolge wie im Katalog des Learning Lab (Bit 0 bis 5 der Maske)
KRITERIEN = [
    ("Express funktioniert", pruefe_abnahme),
    ("Bestehendes bleibt heil", pruefe_bestand),
    ("Negativfall eingehalten", pruefe_schema),
    ("Kriterien liegen vor", pruefe_kriterien),
    ("Plan liegt vor", pruefe_plan),
    ("Eigene Tests ergänzt", pruefe_eigene_tests),
]


def main():
    ergebnisse = []
    bits = 0
    print("Level-Up-Challenge P1 -> P2: Expressversand\n")
    for nr, (name, funktion) in enumerate(KRITERIEN):
        ok, text = funktion()
        bits |= ok << nr
        ergebnisse.append({"kriterium": name, "erfuellt": ok, "detail": text})
        print(f"  [{'x' if ok else ' '}] {nr + 1}. {name}\n        {text}")

    pipeline = re.sub(r"[^A-Za-z0-9]", "", os.environ.get("CI_PIPELINE_ID", "lokal")) or "lokal"
    maske = f"{bits:02x}"
    summe = hashlib.sha256(f"ailab|{KENNUNG}|{pipeline}|{maske}".encode()).hexdigest()[:8]
    code = f"LL-{KENNUNG}-{pipeline}-{maske}-{summe}"
    bestanden = bits == (1 << len(KRITERIEN)) - 1

    (WURZEL / "lab-ergebnis.json").write_text(
        json.dumps({"challenge": "p1-p2", "bestanden": bestanden, "nachweis": code, "kriterien": ergebnisse}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("\n" + ("Bestanden." if bestanden else "Noch nicht bestanden."))
    print("Trag diesen Nachweis-Code im Learning Lab ein, dort steht zu jedem offenen Kriterium ein Hinweis:\n")
    print("    " + code + "\n")
    return 0 if bestanden else 1


if __name__ == "__main__":
    sys.exit(main())
