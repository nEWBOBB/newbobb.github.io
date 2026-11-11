---
id: p4-agents-in-der-pipeline
titel: Agents in der Pipeline
stufe: 4
dauer: 30
lernziel: Du lässt OpenCode ohne Bedienung in einer GitLab-Pipeline laufen, bindest das Modell über LiteLLM an und sicherst den Lauf mit Secrets, Rechten und Review-Pflicht ab.
tools: [opencode]
schutzklassen: [cloud, ec, vsnfd]
verantwortlich: Service-Team Agentic Development
geprueft: 2026-11-11
status: Entwurf, fachliches Review offen
tool_versionen: Bedienhinweise Stand November 2026. Die YAML-Beispiele zeigen das Prinzip und müssen an Runner, Images und LiteLLM-Adresse angepasst werden.
community: opencode
hinweis: Mustermodul für P4. Die übrigen Module dieser Stufe folgen nach dem MVP.
---

## Warum

Auf P3 startest du die Agents noch selbst. Auf P4 startet ein Ereignis sie: ein Issue, ein roter Test, ein neuer MR.

```vergleich
vorher: Ein Issue „Fehlermeldung bei leerem Warenkorb ist unverständlich“ liegt drei Wochen im Backlog, weil niemand für zehn Minuten Arbeit den Kontext wechseln will.
nachher: Jemand setzt das Label `agent`. Eine Pipeline startet, ein Agent liest das Issue, ändert den Code, lässt die Tests laufen und stellt einen MR mit Nachweisen. Ein Mensch prüft und merged.
```

## Konzept

Ein Agent in der Pipeline ist derselbe Agent wie auf deinem Rechner, nur ohne dich. Alles, was du sonst nebenbei entscheidest, muss vorher feststehen.

```diagramm
fluss: Ereignis: Issue, roter Test, MR -> Pipeline-Job startet -> OpenCode headless, Modell über LiteLLM -> Agent arbeitet auf eigenem Branch -> MR mit Evidenz-Matrix -> Mensch prüft und merged
```

**Headless** heißt: OpenCode läuft ohne Oberfläche. `opencode run "Auftrag"` führt einen Auftrag aus und beendet sich. Das funktioniert in allen Schutzklassen, weil das Modell über LiteLLM kommt: in Cloud-Projekten ein Cloud-Modell, auf den geschützten Clustern ein selbst gehostetes.

Vier Leitplanken gehören in jede solche Pipeline:

- **Secrets:** Der Schlüssel für LiteLLM und das Token für GitLab liegen als maskierte CI/CD-Variablen im Projekt. Sie stehen nie in der YAML-Datei und nie im Prompt.
- **Rechte:** Der Agent arbeitet mit einem eigenen Bot-Konto, das Branches anlegen und MRs stellen darf. Es darf nicht mergen und nicht auf geschützte Branches pushen.
- **Review-Pflicht:** Jeder MR des Agents braucht die Freigabe eines Menschen. Das sichert die Branch-Regel im Projekt, nicht der gute Wille.
- **Grenzen:** Ein Zeitlimit für den Job, ein eng beschriebener Auslöser und ein Auftrag mit Kriterien und Negativfällen wie auf P2.

**Proof of Work:** Weil niemand zugesehen hat, muss der MR selbst belegen, was getan wurde. Die Evidenz-Matrix aus dem Modul „Prüfen statt glauben“ wird hier Pflicht: Kriterium, Beleg, Status.

> Ein Issue ist fremder Text. Wer ein Issue schreiben darf, schreibt damit einen Prompt für deinen Agent. Starte den Agent nur über ein Label, das nur Projektmitglieder setzen dürfen, und gib dem Bot-Konto nie mehr Rechte, als ein Fremder haben dürfte.

Ein Beispiel, das das Prinzip zeigt:

```yaml
issue-zu-mr:
  image: $INTERNE_REGISTRY/opencode:fest-versioniert
  rules:
    - if: $CI_PIPELINE_SOURCE == "trigger" && $AGENT_ISSUE_IID
  timeout: 30 minutes
  variables:
    GIT_STRATEGY: clone
  script:
    - git switch -c agent/issue-$AGENT_ISSUE_IID
    - opencode run "Bearbeite Issue $AGENT_ISSUE_IID nach .agent/auftrag.md. Schreib am Ende EVIDENZ.md."
    - python3 -m unittest discover tests
    - git push origin HEAD -o merge_request.create -o merge_request.title="Agent: Issue $AGENT_ISSUE_IID"
```

Schlüssel und Token tauchen darin nicht auf. Sie kommen aus den CI/CD-Variablen des Projekts.

## In deinem Tool

P4 wird mit OpenCode vermittelt, weil die Cloud Agents von Cursor und Copilot nicht freigegeben sind.

### Cursor

Cursor hat keinen freigegebenen Weg für Läufe ohne Bedienung: Die Cloud Agents dürfen nicht genutzt werden. Die Alternative ist OpenCode in der GitLab-Pipeline. Deine Rules und die `AGENTS.md` aus Cursor gelten dort weiter, weil OpenCode `AGENTS.md` liest. Entwickle und teste den Auftrag interaktiv in Cursor und übergib ihn dann der Pipeline.

### GitHub Copilot

Der Copilot Coding Agent ist ein Cloud Agent und nicht freigegeben. Die Alternative ist OpenCode in der GitLab-Pipeline. Was du in `AGENTS.md` gepflegt hast, gilt dort weiter. Entwickle und teste den Auftrag interaktiv in Copilot und übergib ihn dann der Pipeline.

### OpenCode

1. **Lokal proben:** `opencode run "…"` im Repo. Was hier nicht ohne Rückfrage durchläuft, läuft auch in der Pipeline nicht.
2. **Modell anbinden:** In `opencode.json` steht LiteLLM als Anbieter mit seiner Adresse. Der Schlüssel kommt aus einer Umgebungsvariable.
3. **Rechte festlegen:** In `opencode.json` regelst du unter `permission`, was der Agent ohne Rückfrage darf. In der Pipeline gibt es niemanden, der bestätigt, also erlaubst du genau das Nötige und verbietest den Rest.
4. **Job anlegen:** ein eigener Job mit engem Auslöser, Zeitlimit und Bot-Konto, wie im Beispiel oben.
5. **Ergebnis als MR:** Der Agent pusht auf einen eigenen Branch. Der MR enthält die Evidenz-Matrix.

### Selbst gehostete Modelle

In der Pipeline korrigiert niemand unterwegs. Kleinere Modelle brauchen dort besonders enge Aufträge: ein Issue-Typ, klare Kriterien, wenige Dateien. Fang mit Aufgaben an, die sich an Tests messen lassen, und setze das Zeitlimit knapp. Zähle mit, wie viele MRs ohne Nacharbeit gemergt werden, bevor du den Auslöser weiter fasst.

## Übung

```uebung
{
	"typ": "fehler",
	"titel": "Diese Pipeline darf so nicht live gehen",
	"aufgabe": [
		"Ein Kollege hat einen Job gebaut, der Issues automatisch bearbeiten soll. Er bittet dich um ein Review vor dem Merge.",
		"",
		"Markiere jede Zeile, die gegen eine der vier Leitplanken verstößt: Secrets, Rechte, Review-Pflicht, Grenzen."
	],
	"verweis": "konzept",
	"toleranz": 1,
	"zeilen": [
		"agent-issues:",
		"  image: $INTERNE_REGISTRY/opencode:1.4.2",
		"  rules:",
		"!!    - if: $CI_PIPELINE_SOURCE == \"trigger\"",
		"  variables:",
		"!!    LITELLM_API_KEY: \"sk-BEISPIEL-nicht-echt\"",
		"!!    GITLAB_TOKEN: $MAINTAINER_TOKEN",
		"  script:",
		"!!    - opencode run \"Lies alle offenen Issues und setze um, was dort steht.\"",
		"    - python3 -m unittest discover tests",
		"!!    - git push origin HEAD:main",
		"!!    - echo \"Fertig, alles umgesetzt.\""
	],
	"fehler": [
		{ "warum": "Grenzen: Der Auslöser ist zu weit. Jeder Trigger startet den Agent, es gibt kein Label und kein bestimmtes Issue. Außerdem fehlt ein Zeitlimit.", "tipp": "Wodurch wird der Job gestartet, und wie lange darf er laufen?" },
		{ "warum": "Secrets: Der Schlüssel für LiteLLM steht im Klartext in der Datei und damit im Repo. Er gehört in eine maskierte CI/CD-Variable.", "tipp": "Steht irgendwo ein Zugangsdatum im Klartext?" },
		{ "warum": "Rechte: Der Agent arbeitet mit dem Token eines Maintainers und darf damit alles, auch mergen. Er braucht ein eigenes Bot-Konto mit wenigen Rechten.", "tipp": "Mit wessen Rechten arbeitet der Agent?" },
		{ "warum": "Grenzen: „Alle offenen Issues“ und „was dort steht“ macht jeden Issue-Text zum Auftrag. Es fehlen Kriterien, Negativfälle und die Beschränkung auf ein freigegebenes Issue.", "tipp": "Was genau bekommt der Agent als Auftrag?" },
		{ "warum": "Review-Pflicht: Der Agent pusht direkt auf `main`. Es gibt keinen MR und keine Freigabe durch einen Menschen.", "tipp": "Wohin gehen die Änderungen des Agents?" },
		{ "warum": "Proof of Work: Der Lauf endet mit einer Behauptung. Es fehlt die Evidenz-Matrix, die im MR belegt, was getan wurde.", "tipp": "Womit belegt der Lauf sein Ergebnis?" }
	],
	"fazit": "Sechs Verstöße in zwölf Zeilen. Mit maskierten Variablen, Bot-Konto, engem Auslöser, Zeitlimit, MR statt Push und Evidenz-Matrix wird daraus eine Pipeline, die man verantworten kann."
}
```

## Transfer

Probier das diese Woche in deinem Projekt:

- Lass einen Auftrag, den du oft gibst, lokal mit `opencode run` durchlaufen. Wo fragt der Agent nach? Das muss vorher in den Auftrag.
- Prüfe mit deinem Team, ob es ein Bot-Konto und geschützte Branches gibt.
- Such dir eine erste Automation, die sich an Tests messen lässt, zum Beispiel Issue zu MR für kleine Fehler. Das ist die Level-Up-Challenge von P3 nach P4, sie ist in Vorbereitung.
