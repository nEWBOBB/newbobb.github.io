// Der Baukasten, Stufen 7 bis 11: Reaktionsgleichungen, Mol, Energie, Reaktionstempo, Gleichgewicht.
(() => {
	"use strict";
	const { h, sv, f, komma, minus, kugel, mol, knopf, regler, wahl, zaehler, leinwand } = window.CH;
	const TINTE = "#17150f", BLAU = "#2449c9", ROT = "#dd3220";

	// ---------- 7 · Reaktionsgleichungen ----------
	const MASSE = { H: 1, C: 12, N: 14, O: 16, Fe: 56 };
	const GLEICHUNGEN = [
		{ name: "Knallgas", l: [["H2", "H H", { H: 2 }], ["O2", "O O", { O: 2 }]], r: [["H2O", "H O H", { H: 2, O: 1 }]] },
		{ name: "Ammoniak für Dünger", l: [["N2", "N N", { N: 2 }], ["H2", "H H", { H: 2 }]], r: [["NH3", "H N H H", { N: 1, H: 3 }]] },
		{ name: "Erdgas verbrennt", l: [["CH4", "H H C H H", { C: 1, H: 4 }], ["O2", "O O", { O: 2 }]], r: [["CO2", "O C O", { C: 1, O: 2 }], ["H2O", "H O H", { H: 2, O: 1 }]] },
		{ name: "Eisen rostet", l: [["Fe", "Fe", { Fe: 1 }], ["O2", "O O", { O: 2 }]], r: [["Fe2O3", "O Fe O Fe O", { Fe: 2, O: 3 }]] },
	];
	const gleichung = {
		g: 3, titel: "Reaktions­gleichungen", kachel: "Reaktions­gleichungen",
		frage: "Bei einer Reaktion entstehen neue Stoffe. Aber kein einziges Atom entsteht oder verschwindet dabei. Bekommst du die Waage ins Gleichgewicht, ohne ein Molekül umzubauen?",
		bau(api) {
			const auf = api.auftraege(GLEICHUNGEN.map((g) => `Gleiche aus: <b>${g.name}</b>.`), "Vier Reaktionen, und bei jeder liegen rechts genau die Atome, die links hineingegangen sind.");
			const koeff = GLEICHUNGEN.map((g) => [...g.l, ...g.r].map(() => 1));
			let nr = 0;
			const zeile = h("div", { class: "gleichung" });
			const bilanz = h("ul", { class: "bilanz" });
			const waage = sv("svg", { viewBox: "0 0 300 120", class: "bild schmal", role: "img" });
			const ab = h("p", { class: "ablese", "aria-live": "polite" });
			function rechne() {
				const g = GLEICHUNGEN[nr], k = koeff[nr];
				const summe = (arten, versatz) => {
					const s = {};
					arten.forEach(([, , a], i) => { for (const e in a) s[e] = (s[e] || 0) + a[e] * k[i + versatz]; });
					return s;
				};
				const L = summe(g.l, 0), R = summe(g.r, g.l.length);
				const gewicht = (s) => Object.keys(s).reduce((m, e) => m + s[e] * MASSE[e], 0);
				const ok = Object.keys(L).every((e) => L[e] === R[e]);
				bilanz.replaceChildren(...Object.keys(L).map((e) => h("li", { class: L[e] === R[e] ? "gut" : "" }, kugel(e, "kl"), h("span", { text: `links ${L[e]}` }), h("span", { text: `rechts ${R[e] || 0}` }), h("b", { text: L[e] === R[e] ? "=" : "≠" }))));
				const kipp = Math.max(-11, Math.min(11, (gewicht(R) - gewicht(L)) / 8));
				waage.replaceChildren(
					sv("path", { d: "M150 34 L132 108 H168 Z", fill: "#fff", stroke: TINTE, "stroke-width": 3, "stroke-linejoin": "round" }),
					sv("g", { transform: `rotate(${kipp} 150 34)` },
						sv("line", { x1: 40, y1: 34, x2: 260, y2: 34, stroke: TINTE, "stroke-width": 5, "stroke-linecap": "round" }),
						sv("path", { d: "M40 34 L20 78 H60 Z M260 34 L240 78 H280 Z", fill: "none", stroke: TINTE, "stroke-width": 2 }),
						sv("rect", { x: 14, y: 78, width: 52, height: 9, fill: BLAU, stroke: TINTE, "stroke-width": 2 }),
						sv("rect", { x: 234, y: 78, width: 52, height: 9, fill: ROT, stroke: TINTE, "stroke-width": 2 }),
						sv("text", { x: 40, y: 104, "text-anchor": "middle", class: "bild-klein", text: `${gewicht(L)} u` }),
						sv("text", { x: 260, y: 104, "text-anchor": "middle", class: "bild-klein", text: `${gewicht(R)} u` })),
					sv("circle", { cx: 150, cy: 34, r: 6, fill: "#f4c600", stroke: TINTE, "stroke-width": 2.5 }));
				waage.setAttribute("aria-label", `Waage: links ${gewicht(L)}, rechts ${gewicht(R)} Atommassen`);
				if (ok) {
					const kurz = k.every((x) => x % 2 === 0) || k.every((x) => x % 3 === 0);
					ab.innerHTML = `<span class="gut">Ausgeglichen.</span> ${kurz ? "Es geht auch mit kleineren Zahlen, aber das Verhältnis stimmt." : "Jedes Atom von links findest du rechts wieder."}`;
					auf.ab(nr);
					sw.knoepfe[nr].classList.add("ok");
				} else ab.innerHTML = "Noch nicht ausgeglichen. Vergleiche die Atome links und rechts.";
			}
			function baue() {
				const g = GLEICHUNGEN[nr], arten = [...g.l, ...g.r];
				zeile.replaceChildren();
				arten.forEach(([formel, bild], i) => {
					if (i) zeile.appendChild(h("span", { class: "gl-zeichen", text: i === g.l.length ? "→" : "+" }));
					const haufen = h("div", { class: "haufen" });
					const fuelle = () => haufen.replaceChildren(...Array.from({ length: koeff[nr][i] }, () => mol(bild)));
					const z = zaehler(f(formel), koeff[nr][i], 1, 6, (w) => { koeff[nr][i] = w; fuelle(); rechne(); });
					fuelle();
					zeile.appendChild(h("div", { class: "gl-art" }, z.el, haufen));
				});
				rechne();
			}
			const sw = wahl("Reaktion", GLEICHUNGEN.map((g, i) => [i, g.name]), 0, (w) => { nr = w; baue(); });
			api.feld.append(sw.el, zeile, waage, bilanz, ab,
				h("p", { class: "hinweis", text: "Du darfst nur die Zahl vor einem Molekül ändern, nie das Molekül selbst. Aus H₂O darf kein H₂O₂ werden: Das wäre ein anderer Stoff." }));
			baue();
		},
		warum: `<p>Eine Reaktion ist ein <b>Umstecken</b>. Bindungen gehen auf, Atome sortieren sich neu, andere Bindungen gehen zu. Die Atome selbst bleiben erhalten. Deshalb wiegen die Stoffe nach der Reaktion zusammen genau so viel wie davor. Das ist das Gesetz von der <b>Erhaltung der Masse</b>.</p>
			<p>Die Reaktionsgleichung ist die Buchführung dazu. Links stehen die Ausgangsstoffe, rechts die Produkte, und die großen Zahlen davor sagen, wie viele Teilchen jeweils mitmachen. Die kleinen Zahlen in der Formel gehören zum Stoff und sind tabu.</p>
			<p>Aus 2 H<sub>2</sub> + O<sub>2</sub> → 2 H<sub>2</sub>O liest du ein <b>Rezept</b> ab: Zwei Teile Wasserstoff auf einen Teil Sauerstoff. Nimmst du mehr von einem, bleibt der Rest einfach übrig.</p>`,
		merke: "Bei einer Reaktion gehen keine Atome verloren und es kommen keine dazu. Ausgleichen heißt: nur die Zahlen vor den Formeln ändern.",
		quiz: {
			f: "Ein Stück Eisenwolle wird beim Verbrennen schwerer. Wie passt das zur Erhaltung der Masse?",
			a: ["Gar nicht, hier wird Masse erzeugt.", "Das Eisen verbindet sich mit Sauerstoff aus der Luft. Dessen Masse kommt dazu.", "Heiße Dinge wiegen immer mehr als kalte."],
			r: 1,
			w: "Der Sauerstoff war vorher unsichtbar in der Luft. Zählst du ihn mit, stimmt die Bilanz auf das Gramm.",
		},
	};

	// ---------- 8 · Mol und Stoffmenge ----------
	const hoch = (n) => {
		if (!n) return "0";
		const wert = n * 6.022e23, e = Math.floor(Math.log10(wert));
		return `${komma(wert / 10 ** e, 2)} · 10<sup>${e}</sup>`;
	};
	const stoffmenge = {
		g: 3, titel: "Das Mol", kachel: "Das Mol",
		frage: "Das Rezept sagt: zwei Wasserstoff-Moleküle auf ein Sauerstoff-Molekül. Aber Moleküle kann niemand abzählen. Wie misst man also die richtige Menge ab? Mit einer Waage.",
		bau(api) {
			const auf = api.auftraege(["Wiege genau <b>1 mol Kohlenstoff</b> ab.", "Wiege genau <b>1 mol Wasser</b> ab.", "Wiege genau <b>1 mol Kochsalz</b> ab.", "Gib zu 4 g Wasserstoff so viel Sauerstoff, dass <b>nichts übrig bleibt</b>."],
				"Dreimal ein Mol, dreimal ein anderes Gewicht, aber jedes Mal gleich viele Teilchen. Und das Rezept ging mit der Waage auf.");
			const STOFFE = { C: ["Kohlenstoff", 12, "#26262b"], H2O: ["Wasser", 18, BLAU], NaCl: ["Kochsalz", 58.5, "#7a45c9"] };
			let was = "C";
			const svg = sv("svg", { viewBox: "0 0 320 120", class: "bild schmal", role: "img" });
			const ab = h("p", { class: "ablese", "aria-live": "polite" });
			function wiege() {
				const [name, M, farbe] = STOFFE[was], m = rg.wert(), n = m / M;
				const pkt = [];
				for (let i = 0; i < Math.round(n * 10); i++) pkt.push(sv("circle", { cx: 36 + (i % 25) * 10, cy: 84 - Math.floor(i / 25) * 10, r: 4, fill: farbe, stroke: TINTE, "stroke-width": 1 }));
				svg.replaceChildren(sv("rect", { x: 18, y: 92, width: 284, height: 12, fill: "#fff", stroke: TINTE, "stroke-width": 3 }), ...pkt);
				svg.setAttribute("aria-label", `${komma(m)} Gramm ${name} auf der Waage`);
				ab.innerHTML = `<b>${komma(m)} g</b> ${name} = <b>${komma(n, 2)} mol</b> = ${hoch(n)} Teilchen`;
				if (Math.abs(n - 1) < 0.001) auf.ab(Object.keys(STOFFE).indexOf(was));
			}
			const sw = wahl("Stoff", Object.keys(STOFFE).map((k) => [k, `${STOFFE[k][0]} ${f(k)}`]), was, (w) => { was = w; wiege(); });
			const rg = regler({ name: "Auf der Waage", min: 0, max: 100, step: 0.5, wert: 5, zeige: (v) => `${komma(v)} g`, bei: wiege });

			const balken = h("div", { class: "balken" });
			const ab2 = h("p", { class: "ablese", "aria-live": "polite" });
			function mische() {
				const mO = ro.wert(), nO = mO / 32, umsatz = Math.min(1, nO);
				const werte = [["Wasserstoff übrig", (2 - 2 * umsatz) * 2, "#b9bcb6"], ["Sauerstoff übrig", (nO - umsatz) * 32, ROT], ["Wasser entstanden", umsatz * 36, BLAU]];
				balken.replaceChildren(...werte.map(([name, g, farbe]) => h("div", { class: "balken-zeile" }, h("span", { text: name }), h("i", { style: `--w:${g / 36};--k:${farbe}` }), h("b", { text: `${komma(g)} g` }))));
				ab2.innerHTML = `4 g Wasserstoff sind 2 mol. ${komma(mO, 0)} g Sauerstoff sind ${komma(nO, 2)} mol. ` + (mO === 32 ? '<span class="gut">Genau 2 zu 1: Es bleibt nichts übrig, und 4 g + 32 g ergeben 36 g Wasser.</span>' : nO < 1 ? "Der Sauerstoff reicht nicht für allen Wasserstoff." : "Für so viel Sauerstoff fehlt der Wasserstoff.");
				if (mO === 32) auf.ab(3);
			}
			const ro = regler({ name: "Sauerstoff dazu", min: 0, max: 64, step: 2, wert: 8, zeige: (v) => `${v} g`, bei: mische });
			api.feld.append(sw.el, svg, ab, rg.el, h("p", { class: "hinweis", text: "Ein Punkt auf der Waage steht für ein zehntel Mol. Das sind 60 Trilliarden Teilchen." }),
				h("h3", { html: `Nach Rezept: 2 ${f("H2")} + ${f("O2")} → 2 ${f("H2O")}` }), balken, ab2, ro.el);
			wiege();
			mische();
		},
		warum: `<p>Ein <b>Mol</b> ist eine Stückzahl, so wie ein Dutzend. Nur größer: 602 Trilliarden Teilchen, geschrieben 6,022 · 10<sup>23</sup>. So viele Atome stecken in 12 g Kohlenstoff.</p>
			<p>Die Zahl ist so gewählt, dass das Rechnen leicht wird. Ein Kohlenstoff-Atom wiegt 12 Atommassen, ein Mol davon wiegt 12 Gramm. Ein Wasser-Molekül wiegt 2 · 1 + 16 = 18 Atommassen, ein Mol Wasser wiegt 18 Gramm. Das ist die <b>molare Masse</b>. Du findest sie, indem du die Massen aus dem Periodensystem zusammenzählst.</p>
			<p>Damit wird die Waage zum Zählgerät. Die Gleichung 2 H<sub>2</sub> + O<sub>2</sub> → 2 H<sub>2</sub>O verlangt 2 mol Wasserstoff auf 1 mol Sauerstoff. Das sind 4 g auf 32 g. Im Gewicht ist das Verhältnis 1 zu 8, in Teilchen 2 zu 1. Chemiker rechnen deshalb immer erst in Mol um und dann zurück in Gramm.</p>`,
		formel: "Stoffmenge n = Masse m ÷ molare Masse M",
		merke: "Ein Mol sind immer gleich viele Teilchen. Wie viel Gramm das sind, hängt davon ab, wie schwer ein einzelnes Teilchen ist.",
		quiz: {
			f: "Kohlendioxid CO<sub>2</sub>: Kohlenstoff wiegt 12, Sauerstoff 16. Wie viel wiegt ein Mol?",
			a: ["28 g", "44 g", "6,022 · 10<sup>23</sup> g"],
			r: 1,
			w: "12 + 2 · 16 = 44. Ein Mol CO₂ wiegt 44 g und enthält genauso viele Teilchen wie 18 g Wasser.",
		},
	};

	// ---------- 9 · Energie bei Reaktionen ----------
	const REAKTIONEN = [
		{ name: "Chlorknallgas", gl: "H2 + Cl2 → 2 HCl", auf: [["H–H", 436, 1], ["Cl–Cl", 243, 1]], zu: [["H–Cl", 431, 2]] },
		{ name: "Knallgas", gl: "2 H2 + O2 → 2 H2O", auf: [["H–H", 436, 2], ["O=O", 498, 1]], zu: [["O–H", 463, 4]] },
		{ name: "Erdgasflamme", gl: "CH4 + 2 O2 → CO2 + 2 H2O", auf: [["C–H", 413, 4], ["O=O", 498, 2]], zu: [["C=O", 799, 2], ["O–H", 463, 4]] },
		{ name: "Blitz in der Luft", gl: "N2 + O2 → 2 NO", auf: [["N≡N", 945, 1], ["O=O", 498, 1]], zu: [["N=O", 631, 2]] },
	];
	const energie = {
		g: 3, titel: "Energie bei Reaktionen", kachel: "Energie",
		frage: "Eine Gasflamme macht heiß, ein Kühlpack aus der Apotheke wird kalt. Beides sind Reaktionen. Wer entscheidet, in welche Richtung die Wärme fließt?",
		bau(api) {
			const auf = api.auftraege(["Rechne alle <b>vier Reaktionen</b> durch: erst tippen, dann aufbrechen, dann knüpfen.", "Finde die Reaktion, die Wärme <b>schluckt</b>."],
				"Jedes Mal dieselbe Rechnung: was das Aufbrechen kostet gegen das, was das Knüpfen einbringt.");
			let nr = 0;
			const zustand = REAKTIONEN.map(() => ({ tipp: null, phase: 0 }));
			const svg = sv("svg", { viewBox: "0 0 320 210", class: "bild", role: "img" });
			const kopf = h("p", { class: "gl-gross" });
			const liste = h("div", { class: "rechnung" });
			const ab = h("p", { class: "ablese", "aria-live": "polite" });
			const summe = (l) => l.reduce((s, [, e, n]) => s + e * n, 0);
			const text = (l) => l.map(([b, e, n]) => `${n} × ${b} (${e})`).join(" + ");
			function male() {
				const R = REAKTIONEN[nr], z = zustand[nr], A = summe(R.auf), Z = summe(R.zu), k = 112 / 3700, y0 = 150;
				const yA = y0 - A * k, yP = y0 - (A - Z) * k;
				const stufe = (x, y, t) => [sv("line", { x1: x, y1: y, x2: x + 76, y2: y, stroke: TINTE, "stroke-width": 4, "stroke-linecap": "round" }), sv("text", { x: x + 38, y: y - 8, "text-anchor": "middle", class: "bild-klein", text: t })];
				const pfeil = (x, a, b, farbe, t) => [
					sv("line", { x1: x, y1: a, x2: x, y2: b, stroke: farbe, "stroke-width": 3 }),
					sv("path", { d: `M${x - 6} ${b + (b < a ? 9 : -9)} L${x} ${b} L${x + 6} ${b + (b < a ? 9 : -9)}`, fill: "none", stroke: farbe, "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" }),
					sv("text", { x: x + 8, y: (a + b) / 2 + 4, class: "bild-klein", fill: farbe, text: t })];
				svg.replaceChildren(...stufe(14, y0, "vorher"),
					...(z.phase >= 1 ? [...pfeil(100, y0, yA, ROT, `+${A}`), ...stufe(122, yA, "einzelne Atome")] : []),
					...(z.phase >= 2 ? [...pfeil(210, yA, yP, BLAU, `−${Z}`), ...stufe(230, yP, "nachher")] : []),
					sv("text", { x: 14, y: 204, class: "bild-mini", text: "Energie in kJ je Mol Umsatz, nach oben mehr" }));
				kopf.innerHTML = f(R.gl);
				liste.innerHTML = (z.phase >= 1 ? `<p><b class="warn">Aufbrechen kostet:</b> ${text(R.auf)} = <b>${A} kJ</b></p>` : "") +
					(z.phase >= 2 ? `<p><b class="gut">Knüpfen bringt:</b> ${text(R.zu)} = <b>${Z} kJ</b></p>` : "");
				b1.disabled = z.tipp == null || z.phase !== 0;
				b2.disabled = z.phase !== 1;
				tw.knoepfe.forEach((kn) => { kn.disabled = z.tipp != null; });
				tw.setze(z.tipp);
				if (z.tipp == null) ab.innerHTML = "Erst dein Tipp: Wird es dabei warm oder kalt?";
				else if (z.phase === 0) ab.innerHTML = "Jetzt die alten Bindungen aufbrechen.";
				else if (z.phase === 1) ab.innerHTML = "Alle Atome liegen einzeln da. Das hat Energie gekostet. Jetzt neu verknüpfen.";
				else {
					const d = A - Z, warm = d < 0;
					ab.innerHTML = `Bilanz: ${A} − ${Z} = <b>${minus(d)} kJ</b>. ${warm ? "Es kommt mehr heraus, als hineingesteckt wurde: Die Reaktion gibt Wärme ab (<b>exotherm</b>)." : "Das Knüpfen bringt weniger, als das Aufbrechen gekostet hat: Die Reaktion nimmt Wärme auf (<b>endotherm</b>)."} ${(z.tipp === "warm") === warm ? '<span class="gut">Dein Tipp stimmt.</span>' : '<span class="warn">Anders als getippt.</span>'}`;
					sw.knoepfe[nr].classList.add("ok");
					if (!warm) auf.ab(1);
					if (zustand.every((x) => x.phase === 2)) auf.ab(0);
				}
				svg.setAttribute("aria-label", `Energiebild für ${R.name}`);
			}
			const sw = wahl("Reaktion", REAKTIONEN.map((r, i) => [i, r.name]), 0, (w) => { nr = w; male(); });
			const tw = wahl("Dein Tipp", [["warm", "Gibt Wärme ab"], ["kalt", "Nimmt Wärme auf"]], null, (w) => { zustand[nr].tipp = w; male(); });
			const b1 = knopf("1. Bindungen aufbrechen", () => { zustand[nr].phase = 1; male(); });
			const b2 = knopf("2. Neue Bindungen knüpfen", () => { zustand[nr].phase = 2; male(); });
			api.feld.append(sw.el, kopf, tw.el, h("div", { class: "knopf-reihe" }, b1, b2), svg, liste, ab);
			male();
		},
		warum: `<p>Eine Bindung aufzubrechen <b>kostet immer Energie</b>. Eine Bindung zu knüpfen <b>setzt immer Energie frei</b>. Jede Reaktion tut beides: erst alte Bindungen lösen, dann neue schließen.</p>
			<p>Was am Ende übrig bleibt, ist die Differenz. Sind die neuen Bindungen fester als die alten, bleibt Energie übrig und wird als Wärme abgegeben. Die Reaktion ist <b>exotherm</b>, wie jede Flamme. Sind die neuen Bindungen schwächer, muss die Umgebung den Rest liefern und kühlt ab. Die Reaktion ist <b>endotherm</b>.</p>
			<p>Der Berg in der Mitte erklärt noch etwas: Auch eine Reaktion, die Wärme abgibt, braucht erst einen Anstoß, damit die ersten Bindungen aufgehen. Diese <b>Aktivierungsenergie</b> liefert das Streichholz. Danach heizt die Reaktion sich selbst weiter. In echt zerfallen die Moleküle dabei nicht ganz in einzelne Atome, der Berg ist also niedriger als hier gezeichnet. Die Bilanz bleibt dieselbe.</p>`,
		formel: "Bilanz = Energie zum Aufbrechen − Energie beim Knüpfen",
		merke: "Bindungen brechen kostet, Bindungen knüpfen bringt. Das Vorzeichen der Differenz entscheidet, ob es warm oder kalt wird.",
		mehr: 'Passend dazu: <a href="../feuer/">Verstehen: Feuer</a> und <a href="../physics/">Prüfstand Physik</a>, Blatt 6.',
		quiz: {
			f: "Holz gibt beim Verbrennen viel Wärme ab. Warum fängt es dann nicht von selbst an zu brennen?",
			a: ["Weil erst Bindungen aufgebrochen werden müssen, und das kostet zu Beginn Energie.", "Weil Holz bei Zimmertemperatur keine Energie enthält.", "Weil in der Luft zu wenig Sauerstoff ist."],
			r: 0,
			w: "Das ist der Berg im Bild. Erst das Streichholz hebt die ersten Moleküle darüber, danach liefert die Flamme den Anstoß selbst.",
		},
	};

	// ---------- 10 · Reaktionstempo ----------
	const tempo = {
		g: 3, titel: "Reaktions­tempo", kachel: "Reaktions­tempo",
		frage: "Milch wird im Kühlschrank nach einer Woche sauer, in der Sonne nach einem Tag. Dieselbe Reaktion, ein anderes Tempo. Woran dreht man, um eine Reaktion schneller zu machen?",
		bau(api) {
			const auf = api.auftraege(["Lass einen Versuch laufen, bis die <b>Hälfte umgesetzt</b> ist.", "Schaffe die Hälfte in <b>unter 6 Sekunden</b>.", "Schaffe die Hälfte in unter 6 Sekunden, ohne über <b>20 °C</b> zu gehen."],
				"Drei Stellschrauben hast du gefunden: Wärme, mehr Teilchen und einen Katalysator.");
			const L = leinwand(320, 200, "Behälter mit blauen und roten Teilchen, die zusammenstoßen");
			const { ctx } = L, R = 5, V = 60;
			let teile = [], blitze = [], an = false, uhr = 0, gemacht = 0, stoesse = 0, treffer = 0, maxT = 0, halb = null, N = 30;
			const ab = h("p", { class: "ablese", "aria-live": "polite" });
			const protokoll = h("ol", { class: "protokoll" });
			const tempoBei = () => V * Math.sqrt((rt.wert() + 273) / 293);
			const schwelle = () => (kat ? 1.2 : 4.4) * V * V;
			let kat = false;
			function fuelle() {
				N = Number(wn.wert());
				teile = [];
				const s = tempoBei();
				for (const art of ["A", "B"]) for (let i = 0; i < N; i++) {
					const w = Math.random() * 6.283, v = s * (0.4 + Math.random() * 1.2);
					teile.push({ art, x: R + Math.random() * (L.w - 2 * R), y: R + Math.random() * (L.h - 2 * R), vx: Math.cos(w) * v, vy: Math.sin(w) * v, r: R });
				}
				uhr = gemacht = stoesse = treffer = 0;
				halb = null;
				maxT = rt.wert();
				blitze = [];
			}
			function schritt(dt) {
				for (const p of teile) {
					p.x += p.vx * dt; p.y += p.vy * dt;
					if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx); }
					if (p.x > L.w - p.r) { p.x = L.w - p.r; p.vx = -Math.abs(p.vx); }
					if (p.y < p.r) { p.y = p.r; p.vy = Math.abs(p.vy); }
					if (p.y > L.h - p.r) { p.y = L.h - p.r; p.vy = -Math.abs(p.vy); }
				}
				for (let i = 0; i < teile.length; i++) for (let j = i + 1; j < teile.length; j++) {
					const a = teile[i], b = teile[j];
					if (a.tot || b.tot) continue;
					const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
					if (d >= min || d === 0) continue;
					const nx = dx / d, ny = dy / d, rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
					if (rel <= 0) continue;
					if ((a.art === "A" && b.art === "B") || (a.art === "B" && b.art === "A")) {
						stoesse++;
						if (rel * rel > schwelle()) {
							a.art = "AB"; a.r = R * 1.5;
							a.x = (a.x + b.x) / 2; a.y = (a.y + b.y) / 2; a.vx = (a.vx + b.vx) / 2; a.vy = (a.vy + b.vy) / 2;
							b.tot = true; treffer++; gemacht++;
							blitze.push({ x: a.x, y: a.y, t: 0 });
							continue;
						}
					}
					a.vx -= rel * nx; a.vy -= rel * ny; b.vx += rel * nx; b.vy += rel * ny;
					const schub = (min - d) / 2;
					a.x -= nx * schub; a.y -= ny * schub; b.x += nx * schub; b.y += ny * schub;
				}
				teile = teile.filter((p) => !p.tot);
			}
			function male() {
				ctx.fillStyle = "#fff";
				ctx.fillRect(0, 0, L.w, L.h);
				ctx.lineWidth = 2;
				for (const b of blitze) {
					ctx.strokeStyle = `rgba(244,198,0,${1 - b.t * 2})`;
					ctx.beginPath(); ctx.arc(b.x, b.y, 6 + b.t * 50, 0, 6.283); ctx.stroke();
				}
				ctx.lineWidth = 1.2;
				ctx.strokeStyle = TINTE;
				const kreis = (x, y, r, farbe) => { ctx.fillStyle = farbe; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); ctx.stroke(); };
				for (const p of teile) {
					if (p.art === "AB") { kreis(p.x - 4, p.y, R, BLAU); kreis(p.x + 4, p.y, R, ROT); }
					else kreis(p.x, p.y, p.r, p.art === "A" ? BLAU : ROT);
				}
			}
			function lies() {
				const anteil = gemacht / N;
				ab.innerHTML = `<b>${Math.round(anteil * 100)} %</b> umgesetzt nach ${komma(uhr)} s · Stöße Blau–Rot: ${stoesse}, davon stark genug: ${treffer}${stoesse ? ` (${Math.round((treffer / stoesse) * 100)} %)` : ""}`;
			}
			const rt = regler({ name: "Temperatur", min: -50, max: 300, step: 10, wert: 20, zeige: (v) => `${minus(v)} °C`, bei: (v) => {
				maxT = Math.max(maxT, v);
				const ziel = tempoBei(), mittel = teile.reduce((s, p) => s + Math.hypot(p.vx, p.vy), 0) / (teile.length || 1) || 1;
				teile.forEach((p) => { p.vx *= ziel / mittel; p.vy *= ziel / mittel; });
			} });
			const wn = wahl("Teilchen je Farbe", [["15", "15"], ["30", "30"], ["60", "60"]], "30", () => { fuelle(); male(); lies(); });
			const bk = knopf("Katalysator", () => { kat = !kat; bk.setAttribute("aria-pressed", String(kat)); fuelle(); male(); lies(); });
			bk.setAttribute("aria-pressed", "false");
			const bs = knopf("Versuch starten", () => { fuelle(); an = true; bs.textContent = "Neu befüllen und starten"; }, "haupt");
			api.feld.append(L.el, ab, rt.el, wn.el, h("div", { class: "knopf-reihe" }, bk, bs), h("h3", { text: "Dein Protokoll" }), protokoll,
				h("p", { class: "hinweis", text: "Blau und Rot verbinden sich nur, wenn sie hart genug zusammenprallen. Ein gelber Ring zeigt einen solchen Treffer." }));
			fuelle(); male(); lies();
			api.takt((dt) => {
				if (!an) return;
				schritt(dt);
				blitze.forEach((b) => { b.t += dt; });
				blitze = blitze.filter((b) => b.t < 0.5);
				uhr += dt;
				male(); lies();
				if (halb == null && gemacht >= N / 2) {
					halb = uhr;
					protokoll.appendChild(h("li", { html: `${minus(maxT)} °C · ${kat ? "mit" : "ohne"} Katalysator · ${N} je Farbe: Hälfte nach <b>${komma(halb)} s</b>` }));
					auf.ab(0);
					if (halb < 6) auf.ab(1);
					if (halb < 6 && maxT <= 20) auf.ab(2);
				}
				if (gemacht >= N) an = false;
			});
		},
		warum: `<p>Damit zwei Teilchen reagieren, müssen sie sich <b>treffen</b>, und zwar mit genug Wucht, um die alten Bindungen aufzubrechen. Das ist die Aktivierungsenergie aus Stufe 9. Die meisten Stöße sind zu schwach. Die Teilchen prallen einfach voneinander ab.</p>
			<p><b>Wärme</b> hilft doppelt: Die Teilchen sind schneller, stoßen also öfter und härter zusammen. Als Faustregel verdoppeln 10 °C mehr das Tempo. <b>Mehr Teilchen</b> im selben Raum bedeuten mehr Stöße pro Sekunde. Dasselbe leistet eine größere Oberfläche: Mehl in der Luft kann explodieren, ein Brotlaib nicht.</p>
			<p>Ein <b>Katalysator</b> macht etwas anderes. Er bietet einen Weg mit niedrigerem Berg an. Dann reicht auch ein sanfter Stoß. Er selbst wird dabei nicht verbraucht. So arbeitet der Kat im Auto, und so arbeiten die Enzyme in deinem Körper, die bei 37 °C Reaktionen möglich machen, für die es sonst viel heißer sein müsste.</p>`,
		merke: "Eine Reaktion braucht Stöße, die stark genug sind. Wärme, mehr Teilchen und ein Katalysator machen solche Stöße häufiger.",
		quiz: {
			f: "Ein Katalysator beschleunigt eine Reaktion. Wie?",
			a: ["Er heizt die Teilchen auf.", "Er senkt die Schwelle, die ein Stoß überwinden muss, und wird dabei nicht verbraucht.", "Er liefert zusätzliche Teilchen, die mitreagieren."],
			r: 1,
			w: "Die Teilchen sind so schnell wie vorher. Nur reicht jetzt ein schwächerer Stoß, also führen mehr Stöße zum Ziel.",
		},
	};

	// ---------- 11 · Gleichgewicht ----------
	const gleichgewicht = {
		g: 3, titel: "Das chemische Gleich­gewicht", kachel: "Gleich­gewicht",
		frage: "Viele Reaktionen laufen in beide Richtungen: Aus A wird B, und aus B wird wieder A. Was kommt am Ende dabei heraus?",
		bau(api) {
			const auf = api.auftraege(["Warte, bis sich das <b>Mischungsverhältnis</b> nicht mehr ändert.", "Gib <b>60 A dazu</b> und warte wieder. Was macht das System mit dem Nachschub?", "Ändere die <b>Temperatur</b> um mindestens 30 °C und warte wieder."],
				"Dreimal hat sich das System selbst neu eingependelt, und nie stand dabei etwas still.");
			const L = leinwand(320, 270, "Feld aus blauen A-Teilchen und roten B-Teilchen, darunter der Anteil von B über die Zeit");
			const { ctx } = L;
			let teile = [], verlauf = [], an = false, zeit = 0, ruheSeit = 0, stoerung = "start", takt = 0, probe = 0, hin = 0, rueck = 0;
			const ab = h("p", { class: "ablese", "aria-live": "polite" });
			const kHin = () => 0.25 * 2 ** (rt.wert() / 40);
			const kRueck = () => 0.08 * 4 ** (rt.wert() / 40);
			const zahlB = () => teile.reduce((s, x) => s + x, 0);
			function neu() {
				teile = new Array(240).fill(0);
				verlauf = [];
				zeit = ruheSeit = hin = rueck = 0;
				stoerung = "start";
			}
			function male() {
				ctx.fillStyle = "#fff";
				ctx.fillRect(0, 0, L.w, L.h);
				teile.forEach((x, i) => {
					ctx.fillStyle = x ? ROT : BLAU;
					ctx.beginPath(); ctx.arc(15 + (i % 30) * 10, 12 + Math.floor(i / 30) * 10, 3.6, 0, 6.283); ctx.fill();
				});
				ctx.strokeStyle = TINTE; ctx.lineWidth = 1.5;
				ctx.strokeRect(10, 182, 300, 78);
				ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(10, 221); ctx.lineTo(310, 221); ctx.stroke(); ctx.setLineDash([]);
				ctx.fillStyle = TINTE; ctx.font = "10px sans-serif";
				ctx.fillText("Anteil B", 14, 194); ctx.fillText("50 %", 284, 218);
				ctx.strokeStyle = ROT; ctx.lineWidth = 2.5; ctx.beginPath();
				verlauf.forEach((v, i) => { const x = 10 + (i / 240) * 300, y = 260 - v * 78; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
				ctx.stroke();
			}
			function lies() {
				const B = zahlB();
				ab.innerHTML = `<i class="pkt" style="--k:${BLAU}"></i>A: <b>${teile.length - B}</b> · <i class="pkt" style="--k:${ROT}"></i>B: <b>${B}</b> (${Math.round((B / teile.length) * 100)} %) · hin: ${Math.round(hin)} je s · zurück: ${Math.round(rueck)} je s`;
			}
			let ruheT = 20, ruheAnteil = 0, vorB = 0;
			const rt = regler({ name: "Temperatur", min: 0, max: 100, step: 10, wert: 20, zeige: (v) => `${v} °C`, bei: () => {
				if (!an || stoerung === "start") return;
				stoerung = "t"; ruheSeit = 0;
			} });
			const bz = knopf("60 A dazugeben", () => {
				if (teile.length >= 480) return api.sag("Mehr passt nicht in den Behälter.", "warn");
				vorB = zahlB();
				for (let i = 0; i < 60; i++) teile.push(0);
				if (stoerung !== "start") stoerung = "a";
				ruheSeit = 0;
				api.sag("60 blaue A sind dazugekommen. Das Verhältnis stimmt nicht mehr.");
			});
			const bn = knopf("Von vorn: alles A", () => { neu(); male(); lies(); api.sag(""); }, "leise");
			const werk = h("div", { hidden: true }, L.el, ab, rt.el, h("div", { class: "knopf-reihe" }, bz, bn),
				h("p", { class: "hinweis", text: "Jedes A wird mit einer festen Chance pro Sekunde zu B, jedes B mit einer kleineren Chance wieder zu A. Mehr Regeln gibt es nicht." }));
			const tipp = api.tipp("Du startest mit 240 Teilchen A. Der Weg von A nach B ist leichter als der Rückweg. Was siehst du nach einer Minute?",
				["Alles ist zu B geworden.", "Eine feste Mischung, in der sich nichts mehr umwandelt.", "Eine feste Mischung, in der sich weiter ständig Teilchen umwandeln."], 2, () => { werk.hidden = false; an = true; });
			api.feld.append(tipp.el, werk);
			neu(); male(); lies();
			api.takt((dt) => {
				if (!an) return;
				zeit += dt; takt += dt; probe += dt;
				if (takt >= 0.1) {
					const ph = kHin() * takt, pr = kRueck() * takt;
					let h1 = 0, r1 = 0;
					for (let i = 0; i < teile.length; i++) {
						if (teile[i] === 0) { if (Math.random() < ph) { teile[i] = 1; h1++; } }
						else if (Math.random() < pr) { teile[i] = 0; r1++; }
					}
					hin += (h1 / takt - hin) * 0.08; rueck += (r1 / takt - rueck) * 0.08;
					const ziel = kHin() / (kHin() + kRueck()), anteil = zahlB() / teile.length;
					ruheSeit = Math.abs(anteil - ziel) < 0.05 ? ruheSeit + takt : 0;
					takt = 0;
					if (ruheSeit > 3 && stoerung) {
						const B = zahlB(), pz = Math.round(anteil * 100);
						if (stoerung === "start") {
							auf.ab(0);
							api.sag(`Eingependelt bei rund ${pz} % B. Schau auf die Zahlen: Jede Sekunde wechseln etwa ${Math.round(hin)} Teilchen hin und ebenso viele zurück.`);
							if (!tipp.geloest) { tipp.geloest = true; tipp.loese("Die Mischung bleibt gleich, weil hin und zurück gleich schnell laufen. Stillstand ist das nicht."); }
						} else if (stoerung === "a") {
							auf.ab(1);
							api.sag(`Wieder eingependelt. B ist von ${vorB} auf ${B} gestiegen: Das System hat einen Teil des neuen A zu B gemacht. Der Anteil liegt wieder bei rund ${pz} %.`);
						} else if (Math.abs(rt.wert() - ruheT) >= 30) {
							auf.ab(2);
							api.sag(`Bei ${rt.wert()} °C pendelt es sich bei rund ${pz} % B ein, bei ${ruheT} °C waren es ${Math.round(ruheAnteil * 100)} %. ${rt.wert() > ruheT ? "Wärme begünstigt hier den Rückweg." : "Kälte begünstigt hier den Hinweg."}`);
						}
						stoerung = null; ruheT = rt.wert(); ruheAnteil = anteil;
					}
				}
				if (probe >= 0.25) { probe = 0; verlauf.push(zahlB() / teile.length); if (verlauf.length > 240) verlauf.shift(); }
				male(); lies();
			});
		},
		warum: `<p>Am Anfang gibt es nur A, also läuft nur die <b>Hinreaktion</b>. Je mehr B entsteht, desto öfter wandelt sich auch ein B zurück. Irgendwann werden pro Sekunde genauso viele A zu B wie B zu A. Ab da ändern sich die Mengen nicht mehr.</p>
			<p>Das ist das <b>dynamische Gleichgewicht</b>. Von außen sieht es aus wie Stillstand. Im Inneren wird weiter umgewandelt, in beide Richtungen gleich schnell. Wo es liegt, hängt davon ab, welcher Weg leichter ist, und von der Temperatur.</p>
			<p>Störst du das Gleichgewicht, weicht das System aus (<b>Prinzip von Le Chatelier</b>). Gibst du A dazu, wird mehr A verbraucht. Nimmst du B weg, wird B nachgeliefert. Heizt du, läuft die Richtung stärker, die Wärme schluckt. Damit holen Fabriken aus widerspenstigen Reaktionen mehr heraus: Bei der Ammoniak-Herstellung wird das Produkt laufend entnommen, und das System liefert nach.</p>`,
		merke: "Im Gleichgewicht laufen Hin- und Rückreaktion gleich schnell. Die Mengen bleiben gleich, die Teilchen wechseln weiter.",
		quiz: {
			f: "Eine Sprudelflasche ist zu. Im Wasser gelöstes CO<sub>2</sub> und das CO<sub>2</sub> im Gasraum stehen im Gleichgewicht. Du öffnest sie, und Gas entweicht. Was passiert im Wasser?",
			a: ["Nichts, das Gleichgewicht bleibt, wie es war.", "Gelöstes CO<sub>2</sub> perlt aus, weil das System das entwichene Gas nachliefert.", "Das Wasser nimmt mehr CO<sub>2</sub> aus der Luft auf."],
			r: 1,
			w: "Du hast auf der Gas-Seite etwas weggenommen. Das System weicht aus und schickt gelöstes CO₂ hinterher, bis der Sprudel schal ist.",
		},
	};

	window.CH.add(gleichung, stoffmenge, energie, tempo, gleichgewicht);
})();
