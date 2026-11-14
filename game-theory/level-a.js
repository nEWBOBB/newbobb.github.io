// Halle 1 · Grundlagen: Level 1 bis 5
(() => {
	"use strict";
	const A = window.Arcade;
	const { el, rnd, ri, clamp, fmt, komma, sprite, matrix, BOTS, PAY } = A;
	const POS3 = [["Oben", "Unten"], ["Oben", "Mitte", "Unten"]];
	const COL3 = [["Links", "Rechts"], ["Links", "Mitte", "Rechts"]];

	// ---------- Level 1: Was ist ein Spiel? ----------
	A.add({
		id: 1,
		title: "Das Zahlenduell",
		tag: "Was ist ein Spiel?",
		bots: ["wurf", "echo", "logo"],
		intro: `<p>Vier Spieler, eine Regel: Jeder nennt verdeckt eine Zahl von 0 bis 100. Es gewinnt, wer am nächsten an
			<strong>zwei Dritteln des Durchschnitts</strong> aller vier Zahlen liegt.</p>
			<p>Beispiel: Die Zahlen sind 60, 40, 30 und 10. Der Durchschnitt ist 35, zwei Drittel davon sind rund 23.
			Die 30 gewinnt. Fünf Runden, je näher am Ziel, desto mehr Punkte.</p>`,
		play(ctx) {
			const R = 5;
			let round = 0, total = 0, base = 50;
			const head = el("p.g-head");
			const out = el("output.g-big", { text: "50" });
			const range = el("input", { type: "range", min: 0, max: 100, value: 50, "aria-label": "Deine Zahl von 0 bis 100" });
			range.addEventListener("input", () => (out.textContent = range.value));
			const btn = el("button.btn.primary", { type: "button", text: "Zahl abgeben", onclick: turn });
			const line = el("div.numline", { "aria-hidden": "true" });
			const log = el("div.g-log", { "aria-live": "polite" });
			ctx.root.append(head, el("div.g-row", null, range, out), btn, line, log);
			const upd = () => (head.textContent = `Runde ${round + 1} von ${R}: Welche Zahl nennst du?`);
			upd();

			function turn() {
				const me = +range.value;
				const picks = [
					["Du", "#ffffff", me],
					["WÜRFEL", BOTS.wurf.color, clamp(Math.round(base + rnd(-15, 15)), 0, 100)],
					["ECHO", BOTS.echo.color, Math.round(base * 2 / 3)],
					["LOGO", BOTS.logo.color, Math.round(base * 4 / 9)],
				];
				const avg = picks.reduce((s, p) => s + p[2], 0) / 4;
				const target = avg * 2 / 3;
				const dist = (p) => Math.abs(p[2] - target);
				const best = Math.min(...picks.map(dist));
				const winners = picks.filter((p) => dist(p) - best < 1e-9).map((p) => p[0]);
				const pts = Math.max(0, Math.round(200 - 10 * dist(picks[0])));
				total += pts;
				base = avg;
				round++;
				line.innerHTML = "";
				picks.forEach((p) => line.append(el("i", { style: `left:${p[2]}%;--c:${p[1]}` })));
				line.append(el("i.tgt", { style: `left:${target}%` }));
				log.innerHTML = "";
				log.append(
					el("ul.chips", null, picks.map((p) => el("li", { style: `--c:${p[1]}`, text: `${p[0]}: ${p[2]}` }))),
					el("p", { html: `Durchschnitt ${komma(avg)}, zwei Drittel davon: <span class="gold">${komma(target)}</span>. Am nächsten dran: <strong>${winners.join(" und ")}</strong>. Du bekommst ${pts} Punkte.` }));
				if (round === R) {
					btn.disabled = range.disabled = true;
					head.textContent = "Fertig.";
					ctx.finish(total, `<p>Hast du gemerkt, wie das Ziel von Runde zu Runde <strong>nach unten gewandert</strong> ist? Jeder hat versucht, die anderen zu unterbieten.</p>`);
				} else upd();
			}
		},
		reveal: `<p>Ein <strong>Spiel</strong> in der Spieltheorie hat drei Zutaten: <strong>Spieler</strong>, ihre möglichen
			<strong>Züge</strong> und die <strong>Auszahlungen</strong>, also was jeder am Ende bekommt. Das Entscheidende:
			Deine Auszahlung hängt nicht nur von deinem Zug ab, sondern auch von den Zügen der anderen.</p>
			<p>Deshalb reicht es nicht, gut zu rechnen. Du musst überlegen, was die anderen denken. Die drei Bots denken
			verschieden tief:</p>
			<ul><li><strong>Würfel</strong> rät einfach irgendwo um den letzten Durchschnitt herum.</li>
			<li><strong>Echo</strong> denkt einen Schritt: „Die anderen liegen bei 50, also nehme ich zwei Drittel davon: 33.“</li>
			<li><strong>Logo</strong> denkt zwei Schritte: „Die anderen denken wie Echo, also nehme ich zwei Drittel von 33: 22.“</li></ul>
			<p>Und wenn alle unendlich weit denken? Dann sinkt die Zahl immer weiter, bis auf <strong>0</strong>. Nur dort will
			niemand mehr abweichen. Echte Menschen landen weit darüber: In einem dänischen Zeitungsexperiment mit über
			19 000 Teilnehmern lag die Siegerzahl bei rund 22.</p>
			<p class="merke"><b>Merke:</b> Gewinnen heißt nicht, „richtig“ zu rechnen. Es heißt, einen Schritt weiter zu denken
			als die anderen, aber nicht zehn.</p>`,
		quiz: {
			q: "Was macht eine Situation zu einem Spiel im Sinne der Spieltheorie?",
			a: [
				["Es gibt Regeln und am Ende einen Gewinner.", "Das gilt auch für ein Solitär-Kartenspiel. Da hängt dein Ergebnis aber nur von dir ab.", false],
				["Mein Ergebnis hängt auch davon ab, wie andere sich entscheiden.", "Genau das ist der Kern: Entscheidungen, die sich gegenseitig beeinflussen. Preise festlegen, verhandeln, überholen, all das sind Spiele.", true],
				["Es geht um Glück und Zufall.", "Zufall kann vorkommen, ist aber nicht der Kern. Im Zahlenduell gab es für dich gar keinen Würfel.", false],
			],
		},
	});

	// ---------- Level 2: Auszahlungsmatrix ----------
	A.add({
		id: 2,
		title: "Matrix-Blitz",
		tag: "Die Auszahlungsmatrix lesen",
		bots: ["logo"],
		intro: `<p>Fast jedes Spiel für zwei lässt sich als Tabelle aufschreiben. Du wählst eine <span class="me">Zeile</span>,
			Logo wählt eine <span class="op">Spalte</span>. Im Feld, wo sich beide treffen, steht, was jeder bekommt:
			links <span class="me">deine Punkte</span>, rechts <span class="op">Logos Punkte</span>.</p>
			<p>Sechs schnelle Runden. Mal verrät Logo seine Spalte und du suchst deine beste Zeile. Mal steht deine Zeile fest
			und du sagst voraus, wie Logo antwortet.</p>`,
		play(ctx) {
			const R = 6;
			let round = 0, total = 0;
			const head = el("p.g-head");
			const box = el("div");
			const log = el("div.g-log", { "aria-live": "polite" });
			ctx.root.append(head, box, log);
			next();

			function next() {
				log.innerHTML = "";
				const n = round < 3 ? 2 : 3;
				const mine = round % 2 === 0; // gerade Runden: du suchst deine Zeile
				const rows = POS3[n - 2], cols = COL3[n - 2];
				let pay, fix, best;
				for (;;) {
					pay = rows.map(() => cols.map(() => [ri(0, 9), ri(0, 9)]));
					fix = ri(0, n - 1);
					const vals = mine ? pay.map((r) => r[fix][0]) : pay[fix].map((c) => c[1]);
					const mx = Math.max(...vals);
					if (vals.filter((v) => v === mx).length === 1) {
						best = vals.indexOf(mx);
						break;
					}
				}
				head.innerHTML = mine
					? `Runde ${round + 1} von ${R}: Logo spielt <span class="op">${cols[fix]}</span>. Tippe auf deine beste Zeile.`
					: `Runde ${round + 1} von ${R}: Du spielst <span class="me">${rows[fix]}</span>. Tippe auf die Spalte, die Logo wählt.`;
				draw(null);

				function draw(chosen) {
					box.innerHTML = "";
					const o = { rows, cols, pay, bot: "LOGO" };
					if (mine) {
						o.cellCls = (i, j) => (j === fix ? (chosen != null && i === best ? "win" : chosen === i ? "miss" : "hi") : "");
						o.colCls = (j) => (j === fix ? "hi" : "");
						if (chosen == null) o.onRow = answer;
					} else {
						o.cellCls = (i, j) => (i === fix ? (chosen != null && j === best ? "win" : chosen === j ? "miss" : "hi") : "");
						o.rowCls = (i) => (i === fix ? "hi" : "");
						if (chosen == null) o.onCol = answer;
					}
					box.append(matrix(o));
				}

				function answer(k) {
					const ok = k === best;
					if (ok) total += 150;
					draw(k);
					const vals = mine ? pay.map((r) => r[fix][0]) : pay[fix].map((c) => c[1]);
					const names = mine ? rows : cols;
					log.append(el("p", { html: `${ok ? '<span class="good">Treffer, +150.</span>' : '<span class="bad">Daneben.</span>'} ${mine
						? `In der Spalte ${cols[fix]} stehen für dich ${vals.join(", ")}. Am meisten bringt <strong>${names[best]}</strong>.`
						: `In der Zeile ${rows[fix]} stehen für Logo ${vals.join(", ")}. Logo nimmt <strong>${names[best]}</strong>, denn ihn interessieren nur seine eigenen Punkte.`}` }));
					round++;
					if (round === R) {
						head.textContent = "Fertig.";
						ctx.finish(total, `<p>${total >= 750 ? "Du liest Matrizen wie ein Profi." : "Mit etwas Übung liest du so eine Tabelle in zwei Sekunden."} Was du gerade gesucht hast, heißt <strong>beste Antwort</strong>.</p>`);
					} else {
						const b = el("button.btn.primary", { type: "button", text: "Nächste Runde →", onclick: next });
						log.append(b);
						b.focus();
					}
				}
			}
		},
		reveal: `<p>Die <strong>Auszahlungsmatrix</strong> ist die Landkarte eines Spiels. Zeilen sind deine Züge, Spalten die
			des Gegners, in jedem Feld stehen zwei Zahlen: zuerst deine, dann seine.</p>
			<p>Die wichtigste Lesetechnik hast du gerade geübt: die <strong>beste Antwort</strong>. Halte den Zug des Gegners
			fest (eine Spalte) und such darin deine höchste Zahl. Für den Gegner umgekehrt: Halte deine Zeile fest und such
			darin <em>seine</em> höchste Zahl.</p>
			<p>Achtung, typischer Fehler: Der Gegner will nicht, dass du wenig bekommst. Er will, dass <em>er</em> viel bekommt.
			Deine Zahl ist ihm egal.</p>
			<p class="merke"><b>Merke:</b> Spalte festhalten, eigene Zahlen vergleichen. Mehr braucht man nicht, um die nächsten
			Level zu knacken.</p>`,
		quiz: {
			q: `In einem Feld steht <span class="me">4</span> | <span class="op">1</span>. Du hast die Zeile gewählt, Logo die Spalte. Wer bekommt was?`,
			a: [
				["Ich bekomme 4, Logo bekommt 1.", "Die erste Zahl gehört immer dem Zeilenspieler, also dir.", true],
				["Ich bekomme 1, Logo bekommt 4.", "Andersherum: Die erste Zahl gehört dem, der die Zeile wählt.", false],
				["Wir teilen uns 5 Punkte.", "Geteilt wird nichts. Jeder bekommt genau seine Zahl aus dem Feld.", false],
			],
		},
	});

	// ---------- Level 3: Dominante Strategie ----------
	const DOM = [
		{ rows: ["A", "B"], cols: ["X", "Y"], pay: [[[4, 4], [0, 6]], [[6, 0], [1, 1]]] },
		{ rows: ["A", "B"], cols: ["X", "Y", "Z"], pay: [[[3, 2], [1, 3], [6, 1]], [[4, 1], [2, 4], [3, 2]]] },
		{ rows: ["A", "B", "C"], cols: ["X", "Y", "Z"], pay: [[[4, 5], [3, 3], [1, 2]], [[3, 4], [5, 2], [2, 3]], [[2, 3], [1, 6], [7, 1]]] },
	];
	A.add({
		id: 3,
		title: "Der Rotstift",
		tag: "Dominante Strategien",
		bots: ["logo"],
		intro: `<p>Manche Züge sind einfach schlecht: Egal was der Gegner macht, ein anderer Zug bringt mehr. So einen Zug
			spielt kein vernünftiger Spieler. Also kannst du ihn <strong>streichen</strong>.</p>
			<p>Tippe auf eine deiner <span class="me">Zeilen</span> oder auf eine von Logos <span class="op">Spalten</span>, um sie
			zu streichen. Das klappt nur, wenn es eine andere gibt, die in <em>jedem</em> übrigen Feld besser ist. Streiche,
			bis nur noch ein Feld übrig bleibt. Drei Tafeln.</p>`,
		play(ctx) {
			let p = 0, total = 0, goneR, goneC;
			const head = el("p.g-head");
			const box = el("div");
			const log = el("div.g-log", { "aria-live": "polite" });
			ctx.root.append(head, box, log);
			const alive = (n, gone) => [...Array(n).keys()].filter((i) => !gone.has(i));
			load();

			function load() {
				goneR = new Set();
				goneC = new Set();
				log.innerHTML = "";
				head.textContent = `Tafel ${p + 1} von ${DOM.length}: Was kann weg?`;
				draw();
			}
			// Welche andere Zeile/Spalte ist überall besser? Liefert Index oder -1
			function dominator(isRow, k) {
				const P = DOM[p];
				const rs = alive(P.rows.length, goneR), cs = alive(P.cols.length, goneC);
				if (isRow) return rs.find((r) => r !== k && cs.every((c) => P.pay[r][c][0] > P.pay[k][c][0])) ?? -1;
				return cs.find((c) => c !== k && rs.every((r) => P.pay[r][c][1] > P.pay[r][k][1])) ?? -1;
			}

			function draw() {
				const P = DOM[p];
				const rs = alive(P.rows.length, goneR), cs = alive(P.cols.length, goneC);
				const solved = rs.length === 1 && cs.length === 1;
				box.innerHTML = "";
				box.append(matrix({
					rows: P.rows, cols: P.cols, pay: P.pay, bot: "LOGO",
					onRow: solved ? null : (i) => strike(true, i),
					onCol: solved ? null : (j) => strike(false, j),
					rowCls: (i) => (goneR.has(i) ? "gone" : ""),
					colCls: (j) => (goneC.has(j) ? "gone" : ""),
					cellCls: (i, j) => (goneR.has(i) || goneC.has(j) ? "gone" : solved ? "win" : ""),
				}));
				if (solved) {
					const [a, b] = P.pay[rs[0]][cs[0]];
					log.append(el("p", { html: `<span class="good">Gelöst.</span> Übrig bleibt ${P.rows[rs[0]]} gegen ${P.cols[cs[0]]}: du ${a}, Logo ${b}. Zwei vernünftige Spieler landen genau hier.` }));
					p++;
					if (p === DOM.length) {
						head.textContent = "Fertig.";
						ctx.finish(total, `<p>Du hast drei Spiele gelöst, ohne einen einzigen Zug zu spielen. Nur durch Wegstreichen.</p>`);
					} else {
						const b2 = el("button.btn.primary", { type: "button", text: "Nächste Tafel →", onclick: load });
						log.append(b2);
						b2.focus();
					}
				}
			}

			function strike(isRow, k) {
				const P = DOM[p];
				if ((isRow ? goneR : goneC).has(k)) return;
				const d = dominator(isRow, k);
				const name = isRow ? `Zeile ${P.rows[k]}` : `Spalte ${P.cols[k]}`;
				log.innerHTML = "";
				if (d >= 0) {
					(isRow ? goneR : goneC).add(k);
					total += 125;
					log.append(el("p", { html: `<span class="good">Gestrichen, +125.</span> ${isRow ? `Zeile ${P.rows[d]}` : `Spalte ${P.cols[d]}`} bringt ${isRow ? "dir" : "Logo"} in jedem übrigen Feld mehr als ${name}.` }));
				} else {
					total = Math.max(0, total - 50);
					log.append(el("p", { html: `<span class="bad">Geht nicht, −50.</span> ${name} ist nicht dominiert: Es gibt keine andere ${isRow ? "Zeile" : "Spalte"}, die ${isRow ? "dir" : "Logo"} in <em>jedem</em> übrigen Feld mehr bringt. ${isRow ? "Vergleiche deine (linken) Zahlen Spalte für Spalte." : "Vergleiche Logos (rechte) Zahlen Zeile für Zeile."}` }));
				}
				draw();
			}
		},
		reveal: `<p>Eine Strategie ist <strong>dominiert</strong>, wenn es eine andere gibt, die bei <em>jedem</em> Zug des
			Gegners mehr bringt. Die bessere heißt <strong>dominant</strong>. Dominierte Züge spielt man nie, ganz egal, was man
			über den Gegner glaubt.</p>
			<p>Der Trick mit dem Rotstift geht weiter: Wenn Logo weiß, dass du deine schlechte Zeile nie spielst, kann er Spalten
			streichen, die nur gegen diese Zeile gut waren. Dann du wieder. Das heißt <strong>wiederholtes Streichen</strong>,
			und manchmal bleibt genau ein Feld übrig. Dann ist das Spiel gelöst.</p>
			<p>Das war schon in Level 1 so: Zwei Drittel des Durchschnitts können nie über 67 liegen, also ist jede Zahl über 67
			dominiert. Streich sie, dann ist alles über 44 dominiert. Und so weiter, bis zur 0.</p>
			<p class="merke"><b>Merke:</b> Bevor du grübelst, was der andere wohl tut: Schau erst, ob du einen Zug hast, der immer
			besser ist. Dann musst du gar nicht grübeln.</p>`,
		quiz: {
			q: "Wann ist deine Strategie A von deiner Strategie B strikt dominiert?",
			a: [
				["Wenn B im Durchschnitt über alle Felder mehr bringt als A.", "Der Durchschnitt reicht nicht. Wenn A auch nur in einer Spalte besser ist, kann A dort die richtige Wahl sein.", false],
				["Wenn der Gegner mit B weniger bekommt als mit A.", "Die Punkte des Gegners spielen für deine Dominanz keine Rolle. Es zählen nur deine eigenen.", false],
				["Wenn B mir bei jedem möglichen Zug des Gegners mehr bringt als A.", "In jeder Spalte besser, ohne Ausnahme. Dann gibt es keinen Grund, A je zu spielen.", true],
			],
		},
	});

	// ---------- Level 4: Nash-Gleichgewicht ----------
	const NASH = [
		{ name: "Ein Feld, das hält", rows: ["A", "B"], cols: ["X", "Y"], pay: [[[4, 4], [0, 6]], [[6, 0], [1, 1]]] },
		{ name: "Links oder rechts fahren", rows: ["Links", "Rechts"], cols: ["Links", "Rechts"], pay: [[[5, 5], [0, 0]], [[0, 0], [5, 5]]] },
		{ name: "Die Hirschjagd", rows: ["Hirsch", "Hase"], cols: ["Hirsch", "Hase"], pay: [[[4, 4], [0, 3]], [[3, 0], [3, 3]]] },
		{ name: "Kopf oder Zahl", rows: ["Kopf", "Zahl"], cols: ["Kopf", "Zahl"], pay: [[[1, -1], [-1, 1]], [[-1, 1], [1, -1]]] },
		{ name: "Die große Tafel", rows: ["Oben", "Mitte", "Unten"], cols: ["Links", "Mitte", "Rechts"], pay: [[[2, 1], [4, 3], [1, 2]], [[3, 4], [2, 2], [5, 1]], [[1, 2], [3, 1], [4, 5]]] },
	];
	A.add({
		id: 4,
		title: "Die Nash-Jagd",
		tag: "Das Nash-Gleichgewicht",
		bots: ["logo"],
		intro: `<p>Nicht jedes Spiel lässt sich mit dem Rotstift lösen. Dafür gibt es eine stärkere Idee: Such ein Feld, in dem
			<strong>keiner von beiden es bereut</strong>. Du würdest deine Zeile nicht wechseln, wenn Logo bei seiner Spalte
			bleibt. Und Logo würde seine Spalte nicht wechseln, wenn du bei deiner Zeile bleibst.</p>
			<p>Markiere in jeder Tafel <strong>alle</strong> solchen Felder und drück auf Prüfen. Vorsicht: Es können mehrere
			sein. Oder gar keins.</p>`,
		play(ctx) {
			let p = 0, total = 0, sel, tries, shown;
			const head = el("p.g-head");
			const box = el("div");
			const btns = el("div.g-btns");
			const log = el("div.g-log", { "aria-live": "polite" });
			ctx.root.append(head, box, btns, log);
			load();

			function isNash(P, r, c) {
				return P.pay.every((row) => row[c][0] <= P.pay[r][c][0]) && P.pay[r].every((cell) => cell[1] <= P.pay[r][c][1]);
			}
			function load() {
				sel = new Set();
				tries = 0;
				shown = false;
				log.innerHTML = "";
				head.textContent = `Tafel ${p + 1} von ${NASH.length} · ${NASH[p].name}`;
				draw();
			}
			function draw() {
				const P = NASH[p];
				box.innerHTML = "";
				box.append(matrix({
					rows: P.rows, cols: P.cols, pay: P.pay, bot: "LOGO",
					onCell: shown ? null : (i, j) => {
						const k = i + "," + j;
						sel.has(k) ? sel.delete(k) : sel.add(k);
						draw();
					},
					pressed: (i, j) => sel.has(i + "," + j),
					cellCls: (i, j) => {
						if (!shown) return "";
						const meBest = P.pay.every((row) => row[j][0] <= P.pay[i][j][0]);
						const opBest = P.pay[i].every((cell) => cell[1] <= P.pay[i][j][1]);
						return (meBest ? "bme " : "") + (opBest ? "bop " : "") + (meBest && opBest ? "win" : "");
					},
				}));
				btns.innerHTML = "";
				if (!shown) btns.append(el("button.btn.primary", { type: "button", text: sel.size ? `Prüfen (${sel.size} markiert)` : "Prüfen: Es gibt keins", onclick: check }));
			}
			function check() {
				const P = NASH[p];
				const truth = new Set();
				P.rows.forEach((_, i) => P.cols.forEach((_, j) => isNash(P, i, j) && truth.add(i + "," + j)));
				const ok = truth.size === sel.size && [...truth].every((k) => sel.has(k));
				tries++;
				log.innerHTML = "";
				if (!ok && tries < 2) {
					const wrong = [...sel].filter((k) => !truth.has(k)).length;
					log.append(el("p", { html: `<span class="bad">Noch nicht.</span> ${wrong ? `${wrong} markierte${wrong > 1 ? " Felder sind" : "s Feld ist"} kein Gleichgewicht. ` : ""}${truth.size > sel.size - wrong ? "Es fehlt noch mindestens eins. " : ""}Tipp: Geh Spalte für Spalte durch und merk dir deine beste Antwort. Dann Zeile für Zeile Logos beste Antwort. Ein Versuch noch.` }));
					return;
				}
				const pts = ok ? (tries === 1 ? 200 : 100) : 0;
				total += pts;
				shown = true;
				draw();
				log.append(el("p", { html: `${ok ? `<span class="good">Stimmt, +${pts}.</span>` : '<span class="bad">Auflösung:</span>'} Unterstrichen sind die besten Antworten: <span class="me">deine</span> in jeder Spalte, <span class="op">Logos</span> in jeder Zeile. Wo beide Zahlen unterstrichen sind, liegt ein Gleichgewicht. Hier: <strong>${truth.size === 0 ? "keins" : truth.size}</strong>.` }));
				p++;
				if (p === NASH.length) {
					head.textContent = "Fertig.";
					ctx.finish(total, `<p>Ein Gleichgewicht, zwei Gleichgewichte, gar keins: Du hast alle Fälle gesehen, die es gibt.</p>`);
				} else {
					const b = el("button.btn.primary", { type: "button", text: "Nächste Tafel →", onclick: load });
					log.append(b);
					b.focus();
				}
			}
		},
		reveal: `<p>Ein <strong>Nash-Gleichgewicht</strong> ist eine Kombination von Zügen, bei der sich <strong>niemand allein
			durch Abweichen verbessern</strong> kann. Jeder spielt die beste Antwort auf den Zug des anderen. Benannt nach
			John Nash, der 1950 bewies, dass jedes endliche Spiel so einen Punkt hat (notfalls mit Zufall, dazu Level 9).</p>
			<p>So findest du es: In jeder Spalte deine höchste Zahl unterstreichen, in jeder Zeile die höchste des Gegners.
			Felder mit zwei Strichen sind Gleichgewichte.</p>
			<ul><li><strong>Links oder rechts fahren</strong> hat zwei. Welches gilt, entscheidet nicht die Logik, sondern die
			Gewohnheit (Level 7).</li>
			<li><strong>Kopf oder Zahl</strong> hat keins in festen Zügen: Einer will immer wechseln (Level 9).</li>
			<li>In der ersten Tafel bekommen beide im Gleichgewicht nur 1, obwohl 4 möglich wäre. Ein Gleichgewicht ist
			<em>stabil</em>, aber nicht unbedingt <em>gut</em> (Level 5).</li></ul>
			<p class="merke"><b>Merke:</b> Frag nicht „Was wäre am besten für alle?“, sondern „Wo will keiner mehr weg?“. Dort
			landet ein Spiel, wenn jeder für sich entscheidet.</p>`,
		quiz: {
			q: "Was ist ein Nash-Gleichgewicht?",
			a: [
				["Das Feld mit der höchsten Punktsumme für beide zusammen.", "Das wäre das gemeinsam beste Ergebnis. Ein Gleichgewicht kann für beide schlechter sein, wie in der ersten Tafel.", false],
				["Eine Kombination, bei der sich keiner verbessern kann, indem er allein seinen Zug ändert.", "Jeder spielt die beste Antwort auf den anderen. Darum bleibt das Spiel dort stehen.", true],
				["Ein Feld, in dem beide gleich viele Punkte bekommen.", "Gleich viele Punkte ist Zufall. Entscheidend ist, dass keiner einen Grund hat, zu wechseln.", false],
			],
		},
	});

	// ---------- Level 5: Gefangenendilemma ----------
	const PD_ROWS = ["🤝 Kooperieren", "🗡 Betrügen"];
	const pdMatrix = (bot) => matrix({ rows: PD_ROWS, cols: ["🤝", "🗡"], bot, pay: [[PAY.CC, PAY.CD], [PAY.DC, PAY.DD]] });
	A.pdMatrix = pdMatrix;
	A.add({
		id: 5,
		title: "Fünf Fremde",
		tag: "Das Gefangenendilemma",
		bots: ["engel", "hai", "logo"],
		intro: `<p>Das berühmteste Spiel der Welt. Du und ein Fremder entscheidet gleichzeitig: <strong>kooperieren</strong>
			oder <strong>betrügen</strong>. Kooperiert ihr beide, bekommt jeder 3 Münzen. Betrügt einer, kassiert er 5 und der
			Ehrliche geht leer aus. Betrügen beide, gibt es für jeden nur 1.</p>
			<p>Du triffst nacheinander fünf Fremde. Jeden nur <strong>ein einziges Mal</strong>, danach seht ihr euch nie
			wieder. Wie viele Münzen holst du raus?</p>`,
		play(ctx) {
			const order = ["engel", "hai", "logo", "wurf", "echo"];
			const moveOf = { engel: "C", hai: "D", logo: "D", wurf: Math.random() < 0.5 ? "C" : "D", echo: "C" };
			const quote = {
				engel: ["Schön, dass wir uns einig sind.", "Oh. Das hätte ich nicht von dir gedacht."],
				hai: ["Danke für die Münzen, Kleiner.", "Na gut. Du bist auch nicht von gestern."],
				logo: ["Betrügen dominiert. Du hättest das wissen können.", "Korrekt gespielt. Trotzdem haben wir beide nur 1."],
				wurf: ["Ich hab gewürfelt. Glück für dich!", "Ich hab gewürfelt. Pech gehabt!"],
				echo: ["Freut mich. Schade, dass wir uns nie wiedersehen.", "Merk ich mir. Ach nein, wir sehen uns ja nie wieder."],
			};
			let k = 0, mine = 0, theirs = 0;
			const moves = [];
			const sMe = el("b.me", { text: "0" }), sOp = el("b.op", { text: "0" });
			const who = el("div.cast");
			const btns = el("div.g-btns");
			const log = el("div.g-log", { "aria-live": "polite" });
			ctx.root.append(
				el("div.score2", null, el("div", null, el("small", { text: "Deine Münzen" }), sMe), el("div", null, el("small", { text: "Die Fremden" }), sOp)),
				pdMatrix("Fremder"), who, btns, log);
			meet();

			function meet() {
				const id = order[k];
				who.innerHTML = "";
				who.append(el("div.bot", { style: `--c:${BOTS[id].color}` }, sprite(id, 44),
					el("div", null, el("b", { text: `FREMDER ${k + 1} VON 5: ${BOTS[id].name}` }), el("span", { text: "Wir sehen uns nie wieder. Was tust du?" }))));
				btns.innerHTML = "";
				btns.append(
					el("button.btn.primary", { type: "button", text: "🤝 Kooperieren", onclick: () => go("C") }),
					el("button.btn.hot", { type: "button", text: "🗡 Betrügen", onclick: () => go("D") }));
			}
			function go(m) {
				const id = order[k];
				const t = moveOf[id];
				const [a, b] = PAY[m + t];
				mine += a;
				theirs += b;
				moves.push(t);
				sMe.textContent = mine;
				sOp.textContent = theirs;
				const said = id === "wurf" ? quote.wurf[a >= 3 ? 0 : 1] : quote[id][m === "C" ? 0 : 1];
				log.innerHTML = "";
				log.append(el("p", { html: `Du: ${m === "C" ? "🤝" : "🗡"} · ${BOTS[id].name}: ${t === "C" ? "🤝" : "🗡"} → du <span class="me">${a}</span>, ${BOTS[id].name} <span class="op">${b}</span>. <em>„${said}“</em>` }));
				k++;
				btns.innerHTML = "";
				if (k < order.length) {
					const nb = el("button.btn", { type: "button", text: "Nächster Fremder →", onclick: () => { log.innerHTML = ""; meet(); } });
					btns.append(nb);
					nb.focus();
				} else {
					const allD = moves.reduce((s, t2) => s + PAY["D" + t2][0], 0);
					const allC = moves.reduce((s, t2) => s + PAY["C" + t2][0], 0);
					ctx.finish(mine * 40, `<p>Du hast <strong>${mine} Münzen</strong>. Gegen genau diese Züge hätte „immer betrügen“ <strong>${allD}</strong> gebracht und „immer kooperieren“ <strong>${allC}</strong>.</p>
						<p>Betrügen bringt gegen jeden einzelnen Fremden 1 oder 2 Münzen mehr. Und trotzdem: Hätten alle fünf Paare kooperiert, hätte jeder 15.</p>`);
				}
			}
		},
		reveal: `<p>Schau auf die Matrix: Kooperiert der andere, bringt dir Betrügen 5 statt 3. Betrügt der andere, bringt dir
			Betrügen 1 statt 0. Betrügen ist also <strong>dominant</strong> (Level 3), und „beide betrügen“ ist das einzige
			<strong>Nash-Gleichgewicht</strong> (Level 4).</p>
			<p>Das Bittere: Beide bekommen dort 1, obwohl beide 3 haben könnten. Jeder entscheidet für sich völlig vernünftig,
			und zusammen kommt etwas Unvernünftiges heraus. Das ist das <strong>Dilemma</strong>.</p>
			<p>Es steckt überall: Zwei Länder rüsten auf, obwohl beide lieber abrüsten würden. Fischer leeren das Meer, weil
			jeder denkt: „Wenn ich es nicht fange, fängt es ein anderer.“ Sportler dopen. Tankstellen unterbieten sich.</p>
			<p class="merke"><b>Merke:</b> Im einmaligen Spiel unter Fremden gewinnt der Betrug. Wer Kooperation will, muss das
			<em>Spiel</em> ändern, nicht auf gute Menschen hoffen. Wie das geht, zeigt das nächste Level.</p>`,
		quiz: {
			q: "Warum heißt das Gefangenendilemma ein Dilemma?",
			a: [
				["Weil man nicht weiß, was der andere tun wird.", "Das Gemeine ist: Selbst wenn du es wüsstest, wäre Betrügen besser für dich. Es liegt nicht an der Unsicherheit.", false],
				["Weil Kooperieren immer die schlechtere Wahl ist.", "Für den Einzelnen in einer Runde ja. Aber beide zusammen stehen mit Kooperation besser da, und genau das ist der Widerspruch.", false],
				["Weil die für jeden Einzelnen beste Wahl zusammen ein Ergebnis ergibt, das für beide schlechter ist.", "Einzeln klug, gemeinsam dumm. Diese Lücke zwischen Einzel- und Gruppeninteresse ist das Dilemma.", true],
			],
		},
	});
})();
