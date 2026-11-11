---
id: p2-marketplace-skills-mcp
titel: Marketplace, Skills und MCP nutzen
stufe: 2
dauer: 20
lernziel: Du unterscheidest Rules, Skills und MCP-Server, installierst ein Plugin aus dem Marketplace und nutzt die MCP-Server für Jira, Confluence und GitLab.
tools: [cursor, copilot, opencode]
schutzklassen: [cloud, ec, vsnfd]
verantwortlich: Service-Team Agentic Development
geprueft: 2026-11-11
status: Entwurf, fachliches Review offen
tool_versionen: Bedienhinweise Stand November 2026, noch nicht gegen feste Tool-Versionen geprüft
hinweis: Die Marketplace-Unterstützung für OpenCode ist noch im Aufbau. OpenCode-Hinweise in diesem Modul gelten unter Vorbehalt.
---

## Warum

Vieles, was du dem Agent beibringen willst, hat schon jemand im Unternehmen gebaut. Du installierst es, statt es neu zu erfinden.

```vergleich
vorher: Du kopierst die Ticket-Beschreibung aus Jira in den Chat, dann die Architekturseite aus Confluence, dann das Pipeline-Log aus GitLab. Bei der nächsten Aufgabe wieder.
nachher: Du schreibst „Setze PROJ-123 um“. Der Agent holt Ticket, Akzeptanzkriterien und die verlinkte Doku selbst und sieht nach dem Push in der Pipeline nach.
```

## Konzept

Drei Bausteine erweitern einen Agent. Sie lösen verschiedene Probleme.

| Baustein | Was es ist | Wann es wirkt | Beispiel |
| --- | --- | --- | --- |
| **Rule** | Text, der immer im Kontext liegt | In jedem Lauf | „Tests starten mit `make test`.“ |
| **Skill** | Anleitung samt Hilfsdateien für eine bestimmte Aufgabe | Nur wenn die Aufgabe ansteht | „So erstellen wir Release Notes.“ |
| **MCP-Server** | Verbindung zu einem System, über die der Agent Daten liest oder Aktionen ausführt | Wenn der Agent das Tool aufruft | Jira-Ticket lesen, MR kommentieren |

```diagramm
fluss: Wissen, das immer gilt: Rule -> Ablauf für eine Aufgabe: Skill -> Zugriff auf ein System: MCP-Server -> Alles zusammen verpackt: Plugin
```

Ein **Plugin** bündelt Skills, MCP-Konfiguration und Rules zu einem Paket, das du mit einem Schritt installierst. Plugins liegen in drei Marketplaces auf GitLab:

- **intern-official:** geprüft und gepflegt. Hier fängst du an.
- **intern-experimental:** funktioniert, ist aber noch in Erprobung.
- **intern-community:** von Kollegen geteilt, ohne Zusage. Gut zum Abschauen.

Intern gibt es MCP-Server für **Jira**, **Confluence** und **GitLab**.

> Ein MCP-Server bringt fremden Text in den Kontext deines Agents. Ein Ticket oder eine Wiki-Seite kann Anweisungen enthalten, die nicht von dir stammen. Installiere nur aus den internen Marketplaces und lass schreibende Aktionen bestätigen. Wie so ein Angriff aussieht, zeigt [Wie KI-Agenten arbeiten](../agenten/).

## In deinem Tool

### Cursor

- Plugins aus dem internen Marketplace installierst du nach der Anleitung im jeweiligen Marketplace-Repo. Danach stehen Skills, Rules und MCP-Server im Projekt bereit.
- MCP-Server stehen in `.cursor/mcp.json`. In den Einstellungen siehst du, welche Server laufen und welche Tools sie anbieten.
- Skills liegen als Ordner mit einer `SKILL.md` im Projekt. Der Agent lädt sie, wenn die Aufgabe zur Beschreibung passt.

### GitHub Copilot

- Plugins aus dem internen Marketplace installierst du nach der Anleitung im jeweiligen Marketplace-Repo.
- MCP-Server stehen in `.vscode/mcp.json`. Im Agent-Modus siehst du über das Werkzeug-Symbol, welche Tools aktiv sind, und kannst einzelne abschalten.
- Skills liegen als Ordner mit einer `SKILL.md` im Repo, wiederkehrende Prompts als Prompt-Dateien.

### OpenCode

- **Unter Vorbehalt:** Die Marketplaces unterstützen OpenCode erst in Ansätzen. Prüfe im Marketplace-Repo, ob ein Plugin eine OpenCode-Variante hat.
- MCP-Server trägst du in `opencode.json` unter `mcp` ein. Das geht unabhängig vom Marketplace.
- Skills und eigene Befehle liegen im Ordner `.opencode/`. Fehlt eine Plugin-Variante, kannst du die `SKILL.md` aus dem Plugin oft direkt übernehmen. Das ist die nächstbeste Alternative.

### Selbst gehostete Modelle

Jeder MCP-Server legt die Beschreibungen seiner Tools in den Kontext. Kleinere Modelle werden mit vielen Tools ungenauer bei der Auswahl. Aktiviere nur die Server, die du für die Aufgabe brauchst. In den geschützten Umgebungen sind nur die MCP-Server erreichbar, die dort betrieben werden.

## Übung

```uebung
{
	"typ": "entscheidung",
	"titel": "Rule, Skill oder MCP-Server?",
	"verweis": "konzept",
	"fragen": [
		{
			"frage": "Der Agent soll in jedem Lauf wissen, dass Kommentare im Code auf Englisch geschrieben werden.",
			"optionen": [
				{ "text": "Rule", "richtig": true, "erklaerung": "Das gilt immer und ist ein Satz. Es gehört in die `AGENTS.md` oder die Projekt-Rules." },
				{ "text": "Skill", "erklaerung": "Ein Skill wird nur geladen, wenn seine Aufgabe ansteht. Diese Regel soll immer gelten." },
				{ "text": "MCP-Server", "erklaerung": "Hier wird kein System angebunden." }
			]
		},
		{
			"frage": "Der Agent soll die Akzeptanzkriterien direkt aus dem Jira-Ticket lesen.",
			"optionen": [
				{ "text": "Rule", "erklaerung": "Eine Rule ist Text. Sie gibt dem Agent keinen Zugriff auf Jira." },
				{ "text": "Skill", "erklaerung": "Ein Skill beschreibt einen Ablauf, öffnet aber keine Verbindung zu einem System." },
				{ "text": "MCP-Server", "richtig": true, "erklaerung": "Der Jira-MCP gibt dem Agent ein Tool, mit dem er Tickets lesen kann." }
			]
		},
		{
			"frage": "Euer Team erstellt Release Notes immer nach demselben Ablauf: MRs seit dem letzten Tag sammeln, nach Typ gruppieren, in eine Vorlage schreiben.",
			"optionen": [
				{ "text": "Rule", "erklaerung": "Der Ablauf wäre in jedem Lauf im Kontext, obwohl er nur beim Release gebraucht wird." },
				{ "text": "Skill", "richtig": true, "erklaerung": "Ein Ablauf für eine bestimmte Aufgabe, samt Vorlage. Der Agent lädt ihn nur, wenn Release Notes anstehen." },
				{ "text": "MCP-Server", "erklaerung": "Den Zugriff auf GitLab liefert der GitLab-MCP. Der Ablauf selbst ist ein Skill, der dieses Tool benutzt." }
			]
		},
		{
			"frage": "Du suchst ein Plugin für Code-Reviews. Es gibt eines in intern-official und ein ähnliches in intern-community. Womit fängst du an?",
			"optionen": [
				{ "text": "intern-official, weil es geprüft und gepflegt ist.", "richtig": true, "erklaerung": "Official ist der Standard. Community-Plugins sind gut zum Abschauen, kommen aber ohne Zusage." },
				{ "text": "intern-community, weil dort die neuesten Ideen liegen.", "erklaerung": "Neu ja, aber ungeprüft. Für die tägliche Arbeit nimmst du zuerst das gepflegte Plugin." },
				{ "text": "Ein öffentliches Plugin aus dem Internet, das mehr Sterne hat.", "erklaerung": "Fremde Plugins bringen fremde Anweisungen und Tools in deinen Agent. Installiere nur aus den internen Marketplaces." }
			]
		}
	]
}
```

## Transfer

Probier das diese Woche in deinem Projekt:

- Installiere ein Plugin aus intern-official, das zu deiner Arbeit passt, und benutze es an einer echten Aufgabe.
- Lass den Agent dein nächstes Ticket über den Jira-MCP lesen, statt es zu kopieren.
- Sieh nach, welche MCP-Tools in deinem Tool gerade aktiv sind, und schalte ab, was du nicht brauchst.
