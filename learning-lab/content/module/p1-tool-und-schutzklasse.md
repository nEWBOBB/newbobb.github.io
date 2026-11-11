---
id: p1-tool-und-schutzklasse
titel: Dein Tool, deine Schutzklasse
stufe: 1
dauer: 15
lernziel: Du weißt, welche Schutzklasse für dein Projekt gilt, welches Tool und welches Modell dort erlaubt ist, und dein Setup läuft.
tools: [cursor, copilot, opencode]
schutzklassen: [cloud, ec, vsnfd]
verantwortlich: Service-Team Agentic Development
geprueft: 2026-11-11
status: Entwurf, fachliches Review offen
tool_versionen: Bedienhinweise Stand November 2026, noch nicht gegen feste Tool-Versionen geprüft
community: llms
hinweis: Verbindlich ist immer die interne Regelung zu Schutzklassen. Dieses Modul fasst sie zusammen und ersetzt sie nicht.
---

## Warum

Die Schutzklasse deines Projekts entscheidet, welches Tool und welches Modell du überhaupt benutzen darfst. Das klärst du einmal, bevor du Code an einen Agent gibst.

```vergleich
vorher: „Darf ich das hier überhaupt mit Cursor machen?“ Die Frage kommt mitten in der Arbeit, und im Zweifel lässt du den Agent ganz weg.
nachher: Du kennst die Schutzklasse deines Projekts, öffnest das passende Tool und arbeitest ohne Bauchweh.
```

## Konzept

Die Regel hat zwei Stufen.

| Schutzklasse | Erlaubte Tools | Modelle | Wo sie laufen |
| --- | --- | --- | --- |
| **Cloud** (bis Company Confidential) | Cursor, GitHub Copilot, OpenCode | Cloud-Modelle über LiteLLM | Beim Anbieter |
| **Export Controlled** | nur OpenCode | selbst gehostete Modelle, z. B. Qwen, GLM | Eigene Cluster, über vLLM |
| **VS-NfD** | nur OpenCode | selbst gehostete Modelle, z. B. Qwen, GLM | Eigene Cluster, über vLLM |

```diagramm
fluss: Schutzklasse des Projekts klären -> Tool wählen -> Modell wählen -> Erst dann Code an den Agent geben
```

Drei Punkte, die oft übersehen werden:

- **Die Schutzklasse hängt am Projekt, nicht an dir.** Wer in zwei Projekten arbeitet, wechselt unter Umständen Tool und Modell.
- **Auch der Kontext zählt.** Was du in den Chat kopierst oder der Agent liest, verlässt bei Cloud-Modellen den Rechner. Ein Log aus einem geschützten Projekt gehört nicht in ein Cloud-Tool.
- **Cloud Agents sind nicht freigegeben.** Die Agents von Copilot und Cursor, die bei den Anbietern in der Cloud laufen, darfst du in keiner Schutzklasse nutzen. Autonome Agents laufen bei uns mit OpenCode in der GitLab-Pipeline (das ist Stufe P4).

Die Modelle erreichst du über LiteLLM. Den Betrieb macht der Service Model Deployment. Lizenzen für Cursor und Copilot bestellst du über ServiceNow.

## In deinem Tool

Mach den Setup-Check für das Tool, das in deiner Schutzklasse erlaubt ist.

### Cursor

Nur in der Schutzklasse **Cloud**.

1. Bist du mit dem Firmenkonto angemeldet? In den Einstellungen steht die Organisation.
2. Öffne ein Repo der Schutzklasse Cloud und starte den Agent-Modus.
3. Frag: „Welche Dateien liegen im Wurzelordner?“ Wenn eine Antwort mit Dateiliste kommt, steht dein Setup.

Für Export Controlled und VS-NfD gibt es kein Cursor. Die Alternative ist OpenCode.

### GitHub Copilot

Nur in der Schutzklasse **Cloud**.

1. Bist du in VS Code mit dem Firmenkonto bei GitHub angemeldet? Das Copilot-Symbol in der Statusleiste zeigt den Zustand.
2. Öffne ein Repo der Schutzklasse Cloud und wähle im Chat den Modus **Agent**.
3. Frag: „Welche Dateien liegen im Wurzelordner?“

Den Copilot Coding Agent auf github.com nutzt du nicht: Er ist ein Cloud Agent. Für Export Controlled und VS-NfD ist die Alternative OpenCode.

### OpenCode

In **allen** Schutzklassen erlaubt. Welche Modelle du siehst, hängt von der Umgebung ab.

1. Starte `opencode` im Repo.
2. Öffne mit `/models` die Modell-Liste. In Cloud-Projekten stehen dort die Modelle aus LiteLLM, auf den geschützten Clustern nur die selbst gehosteten.
3. Frag: „Welche Dateien liegen im Wurzelordner?“

Die Funktion zum Teilen von Sessions (`/share`) benutzt du in geschützten Projekten nicht.

### Selbst gehostete Modelle

Auf den geschützten Clustern arbeitest du mit kleineren Modellen als in der Cloud. Rechne mit kürzeren Aufgaben, mehr Planung und mehr Kontext, den du ausdrücklich mitgibst. Die Module zeigen dir an den passenden Stellen, was du anders machst.

## Übung

```uebung
{
	"typ": "entscheidung",
	"titel": "Was ist hier erlaubt?",
	"verweis": "konzept",
	"fragen": [
		{
			"frage": "Dein Projekt ist **Export Controlled**. Du willst einen Test schreiben lassen.",
			"optionen": [
				{ "text": "Cursor im Agent-Modus, weil es nur um einen Test geht.", "erklaerung": "Auch ein Test braucht den Code als Kontext. Der würde den Cluster verlassen." },
				{ "text": "OpenCode mit einem selbst gehosteten Modell.", "richtig": true, "erklaerung": "In Export Controlled und VS-NfD ist nur OpenCode mit selbst gehosteten Modellen erlaubt." },
				{ "text": "GitHub Copilot, aber nur mit Autocomplete.", "erklaerung": "Auch Autocomplete schickt Code an ein Cloud-Modell." }
			]
		},
		{
			"frage": "Du arbeitest in einem Cloud-Projekt mit Cursor. Ein Kollege schickt dir ein Log aus einem VS-NfD-Projekt und bittet um Hilfe bei der Analyse.",
			"optionen": [
				{ "text": "Ich füge das Log in meinen Cursor-Chat ein. Es ist ja nur ein Log.", "erklaerung": "Die Schutzklasse hängt am Inhalt. Das Log gehört zum VS-NfD-Projekt und darf nicht in ein Cloud-Tool." },
				{ "text": "Ich analysiere es in der VS-NfD-Umgebung mit OpenCode und einem selbst gehosteten Modell.", "richtig": true, "erklaerung": "Der Kontext zählt genauso wie der Code. Die Analyse passiert dort, wo die Daten sein dürfen." },
				{ "text": "Ich lösche vorher die Dateinamen aus dem Log.", "erklaerung": "Ob ein Inhalt dadurch seine Schutzklasse verliert, entscheidest nicht du. Im Zweifel bleibt er in seiner Umgebung." }
			]
		},
		{
			"frage": "Du willst, dass ein Agent über Nacht offene Issues in deinem Cloud-Projekt bearbeitet.",
			"optionen": [
				{ "text": "Den Cloud Agent von Cursor starten.", "erklaerung": "Cloud Agents von Cursor und Copilot sind in keiner Schutzklasse freigegeben." },
				{ "text": "Das Issue dem Copilot Coding Agent zuweisen.", "erklaerung": "Auch das ist ein Cloud Agent und nicht freigegeben." },
				{ "text": "OpenCode headless in einer GitLab-Pipeline, Modelle über LiteLLM.", "richtig": true, "erklaerung": "Das ist der freigegebene Weg für autonome Agents und funktioniert in allen Schutzklassen. Wie das geht, lernst du auf P4." }
			]
		}
	]
}
```

## Transfer

Probier das diese Woche in deinem Projekt:

- Finde heraus, welche Schutzklasse dein Hauptprojekt hat, und schreib sie in die README, falls sie dort fehlt.
- Mach den Setup-Check oben einmal durch. Wenn dir eine Lizenz fehlt: Bestellung über ServiceNow.
- Trag deine Schutzklasse im [Tourenbuch](#/tourenbuch) ein, dann zeigen dir die Module zuerst das passende Tool.
