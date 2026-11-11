#!/usr/bin/env python3
"""Selbsttest der Übungs-Repos: Ausgangszustand fällt durch, Musterlösung besteht."""

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HIER = Path(__file__).resolve().parent
ERWARTET = {"p1-p2-challenge": {"start": [False, True, True, False, False, False]}}


def pruefe(ordner):
    subprocess.run([sys.executable, "pruefung/pruefe.py"], cwd=ordner, capture_output=True, text=True)
    ergebnis = json.loads((ordner / "lab-ergebnis.json").read_text(encoding="utf-8"))
    return [k["erfuellt"] for k in ergebnis["kriterien"]], ergebnis


def main():
    fehler = 0
    for name, erwartet in ERWARTET.items():
        with tempfile.TemporaryDirectory() as tmp:
            arbeit = Path(tmp) / name
            shutil.copytree(HIER.parent / name, arbeit, ignore=shutil.ignore_patterns("__pycache__", "lab-ergebnis.json"))
            start, _ = pruefe(arbeit)
            shutil.copytree(HIER / name, arbeit, dirs_exist_ok=True)
            loesung, ergebnis = pruefe(arbeit)
        ok = start == erwartet["start"] and all(loesung)
        fehler += not ok
        print(f"{'ok    ' if ok else 'FEHLER'} {name}: Start {start}, Musterlösung {loesung}")
        if not all(loesung):
            for k in ergebnis["kriterien"]:
                if not k["erfuellt"]:
                    print("       ", k["kriterium"], "-", k["detail"])
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
