// Halle 2 · Klassiker: Level 6 bis 10
(() => {
	"use strict";
	const A = window.Arcade;
	const { el, ri, pick, sprite, matrix, history, BOTS, PAY, STRATS } = A;

	// ---------- Level 6: Wiederholte Spiele ----------
	A.add({
		id: 6,
		title: "Der Unbekannte",
		tag: "Wiederholte Spiele",
		bots: ["echo", "groll", "pawlow"],
		intro: `<p>Dasselbe Spiel wie in Level 5, mit einem entscheidenden Unterschied: Ihr spielt <strong>zehn Runden</strong>
			gegeneinander. Dein Gegner merkt sich, was du tust.</p>
			<p>Hinter der Maske steckt einer von sechs Bots: Echo, Engel, Hai, Groll, Würfel oder Pawlow. Hol so viele Münzen
			wie möglich und finde nebenbei heraus, wer es ist. Ein richtiger Tipp am Ende bringt 200 Punkte extra.</p>`,
		play(ctx) {
			const N = 10;
			const cand = ["echo", "engel", "hai", "groll", "wurf", "pawlow"];
			const id = pick(cand);
			const me = [], op = [];
			let sM = 0, sO = 0;
			const bM = el("b.me", { text: "0" }), bO = el("b.op", { text: "0" });
			const head = el("p.g-head", { text: `Runde 1 von ${N}` });
			const h = history(N, "???");
			const btns = el("div.g-btns");
			const log = el("div.g-log", { "aria-live": "polite" });
			ctx.root.append(
				el("div.score2", null, el("div", null, el("small", { text: "Du" }), bM), el("div", null, el("small", { text: "Der Unbekannte" }), bO)),
				head, h.node, btns, log);
			btns.append(
				el("button.btn.primary", { type: "button", text: "🤝 Kooperieren", onclick: () => go("C") }),
				el("button.btn.hot", { type: "button", text: "🗡 Betrügen", onclick: () => go("D") }));

			function go(m) {
				const t = STRATS[id](op, me);
				me.push(m);
				op.push(t);
				const [a, b] = PAY[m + t];
				sM += a;
				sO += b;
				h.set(me.length - 1, m, t);
				bM.textContent = sM;
				bO.textContent = sO;
				log.innerHTML = `<p>Du ${m === "C" ? "🤝" : "🗡"}, der Unbekannte ${t === "C" ? "🤝" : "🗡"}: du +${a}, er +${b}.</p>`;
				if (me.length < N) {
					head.textContent = `Runde ${me.length + 1} von ${N}`;
					return;
				}
				head.textContent = "Wer war dein Gegner?";
				btns.innerHTML = "";
				cand.forEach((c) => btns.append(el("button.btn", { type: "button", text: BOTS[c].name, onclick: () => guess(c) })));
				btns.firstChild.focus();
			}
			function guess(c) {
				const ok = c === id;
				btns.innerHTML = "";
				log.innerHTML = "";
				log.append(el("div.bot", { style: `--c:${BOTS[id].color}` }, sprite(id, 44),
					el("div", null, el("b", { text: `ES WAR ${BOTS[id].name}` }), el("span", { text: BOTS[id].says }))));
				ctx.finish(sM * 20 + (ok ? 200 : 0), `<p>${ok ? '<span class="good">Richtig erkannt, +200.</span>' : `<span class="bad">Falsch getippt.</span> Du dachtest an ${BOTS[c].name}.`}
					Du hast <strong>${sM} Münzen</strong> geholt, dein Gegner ${sO}. Zehnmal gemeinsam kooperieren hätte jedem 30 gebracht.</p>
					<p>Spiel ruhig mehrmals: Gegen jeden Bot ist ein anderes Verhalten das beste.</p>`);
			}
		},
		reveal: `<p>Sobald man sich wiedersieht, wirft die Zukunft einen <strong>Schatten</strong> auf die Gegenwart. Wer heute
			betrügt, gewinnt 2 Münzen und riskiert alle kommenden Runden. Plötzlich kann Kooperation die eigennützig beste
			Wahl sein.</p>
			<p>Ob sie es ist, hängt vom Gegner ab. Das sind die sechs:</p>
			<ul><li><strong>Echo</strong> (Tit for Tat) macht deinen letzten Zug nach. Bist du nett, ist er nett.</li>
			<li><strong>Engel</strong> kooperiert immer. Er lässt sich gnadenlos ausnehmen.</li>
			<li><strong>Hai</strong> betrügt immer. Gegen ihn hilft nur, selbst zu betrügen.</li>
			<li><strong>Groll</strong> ist nett, bis du ihn einmal betrügst. Danach nie wieder.</li>
			<li><strong>Würfel</strong> wirft eine Münze. Ihn kann man nicht erziehen, also betrügt man.</li>
			<li><strong>Pawlow</strong> bleibt bei dem, was gut lief, und wechselt, wenn es schlecht lief.</li></ul>
			<p>Eine Falle bleibt: Wissen beide, dass Runde 10 die letzte ist, lohnt sich dort Betrug. Dann aber auch in Runde 9,
			und in Runde 8 … Das Rückwärtsdenken aus Level 10 lässt die ganze Kooperation zusammenfallen. Sie hält nur, wenn
			das <strong>Ende offen</strong> ist.</p>
			<p class="merke"><b>Merke:</b> Wiederholung verwandelt das Dilemma. Vertrauen ist dann keine Gefühlssache, sondern
			eine Rechnung mit der Zukunft.</p>`,
		quiz: {
			q: "Was ändert sich, wenn dasselbe Gefangenendilemma viele Male mit demselben Gegner gespielt wird?",
			a: [
				["Betrug kann in späteren Runden bestraft werden, darum kann sich Kooperation lohnen.", "Der Gewinn von heute wird gegen die Verluste von morgen gerechnet. Das ist der Schatten der Zukunft.", true],
				["Nichts. Betrügen bleibt in jeder Runde dominant und damit immer richtig.", "In der einzelnen Runde ja. Aber deine Züge beeinflussen jetzt, was der andere später tut. Das ändert die Rechnung.", false],
				["Die Punkte in der Matrix werden größer.", "Die Matrix bleibt gleich. Neu ist nur, dass der Gegner ein Gedächtnis hat.", false],
			],
		},
	});

	// ---------- Level 7: Koordination ----------
	const FOCAL = [
		{ q: "Kopf oder Zahl? Ihr gewinnt, wenn ihr dasselbe sagt.", o: [["Kopf", 80], ["Zahl", 20]] },
		{ q: "Kreist beide dieselbe Zahl ein.", o: [["7", 45], ["100", 35], ["13", 12], ["261", 8]] },
		{ q: "Ihr habt euch in einer fremden Stadt verloren, ohne Handy. Wo wartest du?", o: [["Hauptbahnhof", 50], ["Marktplatz", 30], ["Stadtpark", 12], ["Supermarkt", 8]] },
		{ q: "Ihr habt nur den Tag ausgemacht, keine Uhrzeit. Wann gehst du hin?", o: [["12:00", 70], ["9:15", 8], ["15:30", 10], ["18:00", 12]] },
		{ q: "100 Münzen liegen bereit. Jeder nennt verdeckt seinen Anteil. Passt es zusammen genau auf 100, bekommt jeder, was er genannt hat.", o: [["40", 8], ["50", 82], ["60", 6], ["75", 4]] },
		{ q: "Ein Spielfeld aus 3 × 3 Kästchen. Setzt euer Kreuz ins selbe Feld.", o: [["Oben links", 28], ["Mitte", 55], ["Unten rechts", 9], ["Rechts Mitte", 8]] },
	];
	A.add({
		id: 7,
		title: "Der Treffpunkt",
		tag: "Koordination und Fokuspunkte",
		bots: ["kumpel"],
		intro: `<p>Endlich mal kein Gegner. Kumpel will genau dasselbe wie du: Ihr gewinnt, wenn ihr <strong>dasselbe
			wählt</strong>. Der Haken: Ihr dürft euch nicht absprechen.</p>
			<p>Sechs Runden. Jede Antwort ist gleich gut, solange ihr dieselbe gebt. Also: Was wird Kumpel wohl denken, was du
			denkst?</p>`,
		play(ctx) {
			let k = 0, total = 0, hits = 0;
			const head = el("p.g-head");
			const btns = el("div.g-btns");
			const log = el("div.g-log", { "aria-live": "polite" });
			ctx.root.append(head, btns, log);
			ask();

			function ask() {
				const F = FOCAL[k];
				head.textContent = `Runde ${k + 1} von ${FOCAL.length}: ${F.q}`;
				btns.innerHTML = "";
				F.o.forEach(([name], i) => btns.append(el("button.btn", { type: "button", text: name, onclick: () => answer(i) })));
			}
			function answer(i) {
				const F = FOCAL[k];
				let r = Math.random() * F.o.reduce((s, o) => s + o[1], 0), j = 0;
				while (r > F.o[j][1]) r -= F.o[j++][1];
				const ok = i === j;
				if (ok) {
					total += 160;
					hits++;
				}
				const fav = [...F.o].sort((a, b) => b[1] - a[1])[0];
				log.innerHTML = `<p>Du: <strong>${F.o[i][0]}</strong>. Kumpel: <strong>${F.o[j][0]}</strong>. ${ok ? '<span class="good">Getroffen, +160.</span>' : '<span class="bad">Verpasst.</span>'} Kumpel wählt meistens, was am stärksten heraussticht. Hier ist das „${fav[0]}“ (in ${fav[1]} von 100 Fällen).</p>`;
				k++;
				btns.innerHTML = "";
				if (k < FOCAL.length) {
					const b = el("button.btn.primary", { type: "button", text: "Nächste Runde →", onclick: () => { log.innerHTML = ""; ask(); } });
					btns.append(b);
					b.focus();
				} else {
					head.textContent = "Fertig.";
					ctx.finish(total, `<p>${hits} von ${FOCAL.length} Treffern, ganz ohne Absprache. Mit reinem Raten wären im Schnitt nur etwa zwei drin gewesen.</p>`);
				}
			}
		},
		reveal: `<p>In einem <strong>Koordinationsspiel</strong> gibt es mehrere Nash-Gleichgewichte, und alle sind in Ordnung:
			beide links fahren oder beide rechts, beide um 12 oder beide um 15 Uhr. Die Logik allein kann nicht sagen, welches.
			Trotzdem treffen sich Menschen erstaunlich oft.</p>
			<p>Der Grund sind <strong>Fokuspunkte</strong> (Thomas Schelling, 1960): Lösungen, die herausstechen, weil sie
			auffällig, üblich oder symmetrisch sind. Der Bahnhof, 12 Uhr mittags, halbe-halbe. Du fragst dich nicht, was du
			willst, sondern was der andere glaubt, dass du glaubst. In Schellings eigenen Versuchen sagten die meisten „Kopf“,
			und fast alle teilten das Geld 50 zu 50.</p>
			<p>Aus Fokuspunkten werden <strong>Konventionen</strong>: Rechtsverkehr, Steckerformen, die Bedeutung von Wörtern,
			Geld. Keine ist „richtig“. Aber sobald alle sie benutzen, wäre jeder dumm, der allein abweicht.</p>
			<p>Es gibt auch Koordination mit Risiko. In der <strong>Hirschjagd</strong> aus Level 4 ist „beide jagen den Hirsch“
			besser für alle, aber wer dem anderen nicht traut, nimmt lieber den sicheren Hasen. Vertrauen entscheidet, in
			welchem Gleichgewicht man landet.</p>
			<p class="merke"><b>Merke:</b> Viele Probleme sind keine Kämpfe, sondern Abstimmungsfragen. Dann gewinnt nicht der
			Schlauste, sondern wer weiß, was alle für selbstverständlich halten.</p>`,
		quiz: {
			q: "Warum fährt in Deutschland jeder auf der rechten Straßenseite?",
			a: [
				["Weil rechts fahren von Natur aus sicherer ist als links fahren.", "Links fahren funktioniert in England genauso gut. Keine Seite ist besser, wichtig ist nur, dass alle dieselbe nehmen.", false],
				["Nur aus Angst vor dem Bußgeld.", "Das Bußgeld braucht es kaum. Wer allein links fährt, schadet sich sofort selbst.", false],
				["Weil alle anderen es tun und Abweichen dann jedem selbst schadet.", "Eine Konvention ist ein Nash-Gleichgewicht, das sich selbst durchsetzt. Niemand will allein abweichen.", true],
			],
		},
	});

	// ---------- Level 8: Feigling-Spiel ----------
	A.add({
		id: 8,
		title: "Kollisionskurs",
		tag: "Das Feigling-Spiel",
		bots: ["engel", "hai", "wurf"],
		intro: `<p>Zwei Autos rasen aufeinander zu. Wer zuerst ausweicht, ist der Feigling: Er verliert <strong>1</strong>
			Münze, der andere gewinnt <strong>3</strong>. Weichen beide im selben Moment aus, passiert nichts. Weicht keiner
			aus, kracht es: <strong>−10</strong> für beide.</p>
			<p>Drei Duelle. Du hast einen besonderen Knopf: Du kannst dein <strong>Lenkrad aus dem Fenster werfen</strong>.
			Dann kannst du nicht mehr ausweichen, und dein Gegner sieht das.</p>`,
		play(ctx) {
			const duels = [
				{ id: "engel", pre: "Engel umklammert nervös das Lenkrad.", plan: (s) => s >= 1 },
				{ id: "hai", pre: "Hai grinst und tritt aufs Gas.", plan: (s, com) => com },
				{ id: "wurf", pre: "Würfel hat sein Lenkrad schon vor dem Start abgeschraubt. Er KANN nicht ausweichen.", plan: () => false },
			];
			let d = 0, step = 0, com = false, sum = 0;
			const head = el("p.g-head");
			const road = el("div.road", { "aria-hidden": "true" });
			const btns = el("div.g-btns");
			const log = el("div.g-log", { "aria-live": "polite" });
			const tot = el("p.g-note");
			ctx.root.append(head, road, btns, log, tot);
			startDuel();

			function drawRoad(state) {
				road.innerHTML = "";
				for (let i = 0; i < 9; i++) {
					let ch = "", cls = "";
					if (state === "crash" && i === 4) [ch, cls] = ["✹", "x"];
					else if (state !== "crash" && i === step) [ch, cls] = [state === "you" || state === "both" ? "↗" : "▶", "y"];
					else if (state !== "crash" && i === 8 - step) [ch, cls] = [state === "bot" || state === "both" ? "↙" : "◀", "b"];
					road.append(el("i." + (cls || "e"), { text: ch }));
				}
			}
			function startDuel() {
				step = 0;
				com = false;
				const D = duels[d];
				head.textContent = `Duell ${d + 1} von 3 gegen ${BOTS[D.id].name}. ${D.pre}`;
				log.innerHTML = "";
				drawRoad();
				drawBtns();
			}
			function drawBtns() {
				btns.innerHTML = "";
				btns.append(
					el("button.btn.primary", { type: "button", text: "▶ Gas geben", onclick: () => act(false) }),
					el("button.btn", { type: "button", text: "↗ Ausweichen", disabled: com, onclick: () => act(true) }),
					el("button.btn.hot", { type: "button", text: com ? "Lenkrad ist weg" : "🛞 Lenkrad rauswerfen", disabled: com, onclick: () => {
						com = true;
						log.innerHTML = `<p>Dein Lenkrad fliegt aus dem Fenster. ${BOTS[duels[d].id].name} hat es gesehen.</p>`;
						drawBtns();
					} }));
			}
			function act(swerve) {
				const D = duels[d], name = BOTS[D.id].name;
				const bot = D.plan(step, com);
				let res = null, state;
				if (swerve && bot) [res, state] = [[0, `Ihr reißt beide gleichzeitig das Lenkrad herum. Keiner gewinnt, keiner verliert.`], "both"];
				else if (swerve) [res, state] = [[-1, `Du weichst aus. ${name} fährt geradeaus weiter und kassiert 3. Du verlierst 1.`], "you"];
				else if (bot) [res, state] = [[3, `${name} weicht aus${com && D.id === "hai" ? ": „Ohne Lenkrad? Ich bin doch nicht lebensmüde!“" : "."} Du gewinnst 3.`], "bot"];
				else {
					step++;
					if (step === 4) [res, state] = [[-10, `KRACH. Keiner ist ausgewichen. −10 für beide.`], "crash"];
				}
				if (!res) {
					drawRoad();
					log.innerHTML = `<p>Beide halten drauf. Noch ${4 - step} ${4 - step === 1 ? "Moment" : "Momente"} bis zum Aufprall.</p>`;
					return;
				}
				sum += res[0];
				drawRoad(state);
				log.innerHTML = `<p>${res[0] > 0 ? '<span class="good">' : res[0] < 0 ? '<span class="bad">' : "<span>"}${res[1]}</span></p>`;
				tot.textContent = `Zwischenstand: ${A.fmt(sum)} Münzen`;
				d++;
				btns.innerHTML = "";
				if (d < duels.length) {
					const b = el("button.btn.primary", { type: "button", text: "Nächstes Duell →", onclick: startDuel });
					btns.append(b);
					b.focus();
				} else {
					head.textContent = "Fertig.";
					ctx.finish(500 + 100 * sum, `<p>Bilanz: <strong>${A.fmt(sum)} Münzen</strong>. Das Beste, was möglich war: +5. Dafür musst du gegen Engel warten, gegen Hai das Lenkrad werfen und gegen Würfel sofort nachgeben.</p>`);
				}
			}
		},
		reveal: `<p>Das Feigling-Spiel (englisch „Chicken“) als Matrix:</p>
			<div data-mx="chicken"></div>
			<p>Es hat <strong>zwei Nash-Gleichgewichte</strong>: Einer weicht aus, der andere nicht. Nur ist jedem ein anderes
			lieber. Anders als im Gefangenendilemma gibt es keinen dominanten Zug: Deine beste Antwort ist immer das
			<em>Gegenteil</em> von dem, was der andere tut.</p>
			<p>Deshalb gewinnt, wer den anderen überzeugt, dass er <strong>nicht</strong> ausweichen wird. Der stärkste Beweis:
			sich selbst die Wahl nehmen. Ohne Lenkrad ist deine Drohung nicht mehr Angeberei, sondern Tatsache. Hai hat das
			sofort verstanden. Und gegen Würfel, der schneller war, blieb dir nur das Nachgeben.</p>
			<p>Weniger Möglichkeiten zu haben, kann also ein <strong>Vorteil</strong> sein. Feldherren verbrannten Brücken hinter
			sich. Die Gefahr: Wenn beide das Lenkrad werfen, kracht es. In der Kubakrise 1962 standen sich zwei Atommächte so
			gegenüber, und es ging nur gut, weil einer einen Ausweg bekam, ohne das Gesicht zu verlieren.</p>
			<p class="merke"><b>Merke:</b> Gegen einen Vernünftigen hilft Selbstbindung. Gegen einen, der schon gebunden ist,
			hilft nur Ausweichen. Prüf immer zuerst, wer von beiden du vor dir hast.</p>`,
		after(root) {
			root.querySelector('[data-mx="chicken"]').append(matrix({
				rows: ["Ausweichen", "Draufhalten"], cols: ["Ausweichen", "Draufhalten"], bot: "Gegner",
				pay: [[[0, 0], [-1, 3]], [[3, -1], [-10, -10]]],
			}));
		},
		quiz: {
			q: "Warum kann es dir helfen, das eigene Lenkrad wegzuwerfen?",
			a: [
				["Weil der Gegner dann Mitleid bekommt.", "Hai hat kein Mitleid. Er rechnet nur: Du kannst nicht mehr ausweichen, also muss er.", false],
				["Weil der Gegner jetzt sicher weiß, dass ich nicht ausweiche. Seine beste Antwort ist dann, selbst auszuweichen.", "Du hast das Spiel verändert: Für ihn gibt es nur noch Ausweichen (−1) oder Krachen (−10).", true],
				["Weil das Auto ohne Lenkrad schneller fährt.", "Am Tempo ändert sich nichts. Was sich ändert, ist das, was der andere über dich weiß.", false],
			],
		},
	});

	// ---------- Level 9: Gemischte Strategien ----------
	A.add({
		id: 9,
		title: "Elfmeterschießen",
		tag: "Gemischte Strategien",
		bots: ["logo"],
		intro: `<p>Du schießt 20 Elfmeter gegen Torwart Logo. Links oder rechts. Springt Logo in die andere Ecke, ist der Ball
			drin. Springt er in deine Ecke, hält er.</p>
			<p>Logo beobachtet dich. Er sucht nach <strong>Mustern</strong> in deinen Schüssen und springt dorthin, wo er dich
			erwartet. Wie viele Tore schaffst du?</p>`,
		play(ctx) {
			const N = 20;
			const h = [];
			let goals = 0;
			const head = el("p.g-head", { text: `Schuss 1 von ${N}: Wohin?` });
			const gL = el("div"), gR = el("div");
			const btns = el("div.g-btns", null,
				el("button.btn.primary", { type: "button", text: "← Links", onclick: () => shoot("L") }),
				el("button.btn.primary", { type: "button", text: "Rechts →", onclick: () => shoot("R") }));
			const sc = el("p.g-big", { text: "0 TORE", style: "text-align:center" });
			const log = el("div.g-log", { "aria-live": "polite" });
			// Labor: Was, wenn der Torwart deine Mischung kennt?
			const mixOut = el("p.g-note");
			const bar = el("b");
			const mix = el("input", { type: "range", min: 0, max: 100, step: 5, value: 70, "aria-label": "Anteil deiner Schüsse nach links in Prozent" });
			const showMix = () => {
				const p = +mix.value, rate = Math.min(p, 100 - p);
				bar.style.width = rate * 2 + "%";
				mixOut.innerHTML = `Du schießt <strong>${p} %</strong> nach links. ${p === 50 ? "Logo kann springen, wohin er will:" : `Logo springt immer nach ${p > 50 ? "links" : "rechts"}:`} <span class="gold">${rate} % Tore</span>.`;
			};
			mix.addEventListener("input", showMix);
			ctx.root.append(head, el("div.goal", { "aria-hidden": "true" }, gL, gR), sc, btns, log,
				el("hr", { style: "border-color:#3a2d7a;margin:20px 0" }),
				el("p.g-head", { text: "Labor: Angenommen, Logo kennt deine Mischung genau." }), mix, el("div.meter", null, bar), mixOut);
			showMix();
			ctx.root.addEventListener("keydown", (e) => {
				if (h.length >= N || e.target === mix) return;
				if (e.key === "ArrowLeft") shoot("L");
				if (e.key === "ArrowRight") shoot("R");
			});

			function predict() {
				if (h.length < 3) return Math.random() < 0.5 ? "L" : "R";
				for (const k of [2, 1]) {
					const key = h.slice(-k).join("");
					let L = 0, R = 0;
					for (let i = k; i < h.length; i++) if (h.slice(i - k, i).join("") === key) h[i] === "L" ? L++ : R++;
					if (L + R >= 2 && L !== R) return L > R ? "L" : "R";
				}
				const L = h.filter((x) => x === "L").length;
				if (L * 2 === h.length) return Math.random() < 0.5 ? "L" : "R";
				return L * 2 > h.length ? "L" : "R";
			}
			function shoot(s) {
				if (h.length >= N) return;
				const k = predict();
				h.push(s);
				const goal = s !== k;
				if (goal) goals++;
				gL.textContent = (k === "L" ? "🧤" : "") + (s === "L" ? "⚽" : "");
				gR.textContent = (k === "R" ? "🧤" : "") + (s === "R" ? "⚽" : "");
				sc.textContent = `${goals} ${goals === 1 ? "TOR" : "TORE"}`;
				const side = (x) => (x === "L" ? "links" : "rechts");
				log.innerHTML = `<p>Du schießt ${side(s)}, Logo springt ${side(k)}: ${goal ? '<span class="good">Tor!</span>' : '<span class="bad">Gehalten.</span>'}</p>`;
				if (h.length < N) {
					head.textContent = `Schuss ${h.length + 1} von ${N}: Wohin?`;
					return;
				}
				head.textContent = "Abpfiff.";
				btns.querySelectorAll("button").forEach((b) => (b.disabled = true));
				const left = Math.round(h.filter((x) => x === "L").length / N * 100);
				let sw = 0;
				for (let i = 1; i < N; i++) if (h[i] !== h[i - 1]) sw++;
				const swp = Math.round(sw / (N - 1) * 100);
				ctx.finish(goals * 50, `<p><strong>${goals} von ${N}</strong> Toren. Du hast ${left} % nach links geschossen und in ${swp} % der Fälle die Seite gewechselt.</p>
					<p>${goals >= 10 ? "Stark: Mehr als die Hälfte schafft man gegen Logo nur, wenn man wirklich unberechenbar ist." : "Logo hat ein Muster bei dir gefunden."} Echter Zufall wechselt nur in etwa 50 % der Fälle die Seite. Menschen wechseln meist öfter, weil sich „LLL“ nicht zufällig anfühlt. Genau das nutzt Logo aus.</p>`);
			}
		},
		reveal: `<p>Elfmeter ist „Kopf oder Zahl“ aus Level 4: Es gibt <strong>kein Gleichgewicht in festen Zügen</strong>.
			Schießt du immer links, springt der Torwart links. Dann wechselst du, dann wechselt er, ohne Ende.</p>
			<p>Der Ausweg ist eine <strong>gemischte Strategie</strong>: Du lässt den Zufall entscheiden, mit festen
			Wahrscheinlichkeiten. Der Regler im Labor zeigt, warum es genau 50 zu 50 sein muss. Bei 70 % links springt Logo
			immer links und du triffst nur noch 30 %. Erst bei 50 % ist es ihm <strong>egal</strong>, wohin er springt. Das
			ist die Idee: Misch so, dass der Gegner aus keinem seiner Züge einen Vorteil ziehen kann.</p>
			<p>Und es muss echter Zufall sein. „Immer abwechselnd“ ist auch halbe-halbe, aber ein Muster, und Muster werden
			gefunden.</p>
			<p>Profis machen das tatsächlich: Der Ökonom Ignacio Palacios-Huerta hat über 1400 Elfmeter aus europäischen Ligen
			ausgewertet. Schützen und Torhüter mischten ihre Seiten ziemlich genau so, wie es die Theorie vorhersagt, und ohne
			erkennbares Muster von Schuss zu Schuss.</p>
			<p class="merke"><b>Merke:</b> Wo Durchschaut-Werden bestraft wird (Elfmeter, Poker, Kontrollen), ist
			Unberechenbarkeit keine Schwäche, sondern die Strategie.</p>`,
		quiz: {
			q: "Beide Ecken sind für dich gleich gut. Welche Schussstrategie kann der Torwart nicht ausnutzen?",
			a: [
				["Immer abwechselnd links, rechts, links, rechts.", "Das ist zwar halbe-halbe, aber ein Muster. Nach drei Schüssen weiß der Torwart Bescheid.", false],
				["Immer in meine Lieblingsecke, mit voller Wucht.", "Dann steht der Torwart schon dort. Ein fester Zug wird immer ausgenutzt.", false],
				["Jedes Mal zufällig, mit 50 % für jede Seite.", "Dann ist dem Torwart jede Ecke gleich gut, und es gibt kein Muster, das er lernen könnte.", true],
			],
		},
	});

	// ---------- Level 10: Rückwärtsdenken ----------
	A.add({
		id: 10,
		title: "Die letzte Münze",
		tag: "Züge nacheinander und Rückwärtsdenken",
		bots: ["logo"],
		intro: `<p>Bisher habt ihr gleichzeitig gezogen. Jetzt geht es <strong>abwechselnd</strong>. Auf dem Tisch liegt ein
			Haufen Münzen. Wer dran ist, nimmt 1, 2 oder 3. Wer die <strong>letzte Münze</strong> nimmt, gewinnt.</p>
			<p>Du fängst an. Logo spielt fehlerfrei und verzeiht keinen Patzer. Aber: Es gibt einen Weg, wie du sicher
			gewinnst.</p>`,
		play(ctx) {
			const memo = ctx.memo;
			memo.losses = memo.losses || 0;
			let pile = ri(13, 15), busy = false;
			const head = el("p.g-head");
			const coins = el("div.coins", { "aria-hidden": "true" });
			const btns = el("div.g-btns");
			const log = el("div.g-log", { "aria-live": "polite" });
			const hint = el("div");
			ctx.root.append(head, coins, btns, log, hint);
			[1, 2, 3].forEach((n) => btns.append(el("button.btn.primary", { type: "button", text: `${n} nehmen`, onclick: () => take(n) })));
			draw();
			if (memo.losses >= 1) showHint();

			function draw() {
				head.textContent = pile > 0 ? `Es liegen ${pile} Münzen. Du bist dran.` : "Der Tisch ist leer.";
				coins.innerHTML = "";
				for (let i = 0; i < pile; i++) coins.append(el("i"));
				[...btns.children].forEach((b, i) => (b.disabled = busy || i + 1 > pile));
			}
			function showHint() {
				hint.innerHTML = "";
				const ul = el("ol.posmap", { "aria-label": "Gewinn- und Verlustzahlen" });
				for (let n = 1; n <= 15; n++) ul.append(el("li", { class: n % 4 === 0 ? "L" : "", text: n, title: n % 4 === 0 ? "Wer hier dran ist, verliert" : "Wer hier dran ist, gewinnt" }));
				hint.append(el("p.g-note", { html: `<strong>Tipp: Denk vom Ende her.</strong> Bei 1, 2 oder 3 Münzen nimmst du alle und gewinnst. Bei 4 verlierst du, egal was du nimmst. <span class="good">Grün</span>: Wer dran ist, gewinnt. <span class="bad">Rot</span>: Wer dran ist, verliert. Schieb Logo immer auf Rot.` }), ul);
			}
			function take(n) {
				if (busy || n > pile) return;
				pile -= n;
				if (pile === 0) return end(true, `Du nimmst ${n}.`);
				busy = true;
				draw();
				head.textContent = `Es liegen ${pile} Münzen. Logo rechnet …`;
				log.innerHTML = `<p>Du nimmst ${n}.</p>`;
				setTimeout(() => {
					const m = pile % 4 || ri(1, Math.min(3, pile));
					pile -= m;
					busy = false;
					if (pile === 0) return end(false, `Du nimmst ${n}, Logo nimmt ${m}.`);
					draw();
					log.innerHTML = `<p>Du nimmst ${n}, Logo nimmt ${m}.</p>`;
				}, A.reduce ? 0 : 550);
			}
			function end(won, txt) {
				draw();
				[...btns.children].forEach((b) => (b.disabled = true));
				log.innerHTML = `<p>${txt} ${won ? '<span class="good">Die letzte Münze gehört dir!</span>' : '<span class="bad">Logo nimmt die letzte Münze.</span>'}</p>`;
				if (won) {
					const pts = Math.max(300, 900 - 150 * memo.losses);
					ctx.finish(pts, `<p>Gewonnen${memo.losses ? ` nach ${memo.losses} ${memo.losses === 1 ? "Niederlage" : "Niederlagen"}` : " im ersten Anlauf"}. Du hast Logo jedes Mal ein Vielfaches von 4 hingelegt. Dagegen ist er machtlos.</p>`);
				} else {
					memo.losses++;
					showHint();
					ctx.finish(50, `<p>Logo hat dich auf eine Verlustzahl geschoben. Unter dem Spiel steht jetzt ein Tipp. Versuch es nochmal: Der Sieg steht fest, bevor die erste Münze fällt.</p>`);
				}
			}
		},
		reveal: `<p>Spiele mit Zügen nacheinander löst man <strong>von hinten</strong>. Du fragst nicht „Was mache ich jetzt?“,
			sondern „Wie sieht das Ende aus, und was führt dorthin?“</p>
			<ul><li>Bei 1, 2 oder 3 Münzen gewinnt, wer dran ist: Er nimmt alle.</li>
			<li>Bei 4 verliert, wer dran ist: Egal was er nimmt, es bleiben 1 bis 3 für den anderen.</li>
			<li>Bei 5, 6 oder 7 gewinnt man wieder: Man lässt genau 4 liegen.</li>
			<li>Bei 8 verliert man. Und so weiter: Jedes <strong>Vielfache von 4</strong> ist eine Verlustzahl.</li></ul>
			<p>Das Verfahren heißt <strong>Rückwärtsinduktion</strong>. Man zeichnet alle Möglichkeiten als <strong>Spielbaum</strong>
			und rechnet von den Blättern zur Wurzel. So ist Tic-Tac-Toe gelöst, Vier gewinnt auch, und Schach wäre es, wenn
			der Baum nicht mehr Äste hätte als das Universum Atome.</p>
			<p>Dasselbe Denken hat in Level 6 die Kooperation bedroht: Wenn die letzte Runde feststeht, rollt der Betrug von
			hinten nach vorne durch.</p>
			<p class="merke"><b>Merke:</b> Schau nach vorn, denk zurück. Wer weiß, wo er am Ende stehen will, weiß, was er
			jetzt tun muss.</p>`,
		quiz: {
			q: "Es liegen 8 Münzen, du bist dran (1 bis 3 nehmen, die letzte gewinnt). Dein Gegner spielt perfekt. Was gilt?",
			a: [
				["Ich gewinne, wenn ich 3 nehme.", "Dann liegen 5 da, der Gegner nimmt 1 und lässt dir 4. Und bei 4 verlierst du.", false],
				["Ich verliere, egal was ich nehme.", "Es bleiben 5, 6 oder 7. Der Gegner lässt dir jedes Mal genau 4 liegen. 8 ist eine Verlustzahl.", true],
				["Das hängt vom Glück ab.", "In diesem Spiel gibt es keinen Zufall. Jede Stellung ist von Anfang an gewonnen oder verloren.", false],
			],
		},
	});
})();
