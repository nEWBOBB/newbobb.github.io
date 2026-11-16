// Der Baukasten, Stufen 12 bis 16: Säuren und Basen, Batterie, Kohlenstoffchemie, Polymere, Moleküle des Lebens.
(() => {
	"use strict";
	const { h, sv, f, E, RUHIG, komma, minus, knopf, regler, wahl, leinwand, stecker } = window.CH;
	const TINTE = "#17150f", BLAU = "#2449c9", ROT = "#dd3220";

	// ---------- 12 · Säuren, Basen, pH ----------
	const PH_FARBE = ["#d7191c", "#e8402a", "#f46d43", "#f99d59", "#fdc86e", "#f3e37c", "#c8e06e", "#7cc96b", "#4fb58c", "#3aa0a8", "#3c85c0", "#4667c0", "#5350b8", "#5e3ea6", "#5b2b8f"];
	const PH_WIE = ["Batteriesäure", "Magensäure", "Zitronensaft", "Essig", "Tomatensaft", "Kaffee", "Milch", "reines Wasser", "Meerwasser", "Backpulver in Wasser", "Seifenlauge", "Salmiakgeist", "Kalkwasser", "Ofenreiniger", "Rohrreiniger"];
	function phAnzeige() {
		const glas = h("span", { class: "ph-glas", "aria-hidden": "true" });
		const text = h("p", { class: "ablese", "aria-live": "polite" });
		const zellen = PH_FARBE.map((c, i) => h("i", { style: `--k:${c}`, text: i }));
		return {
			el: h("div", { class: "ph" }, h("div", { class: "ph-kopf" }, glas, text), h("div", { class: "ph-skala", "aria-hidden": "true" }, zellen)),
			setze(ph, zusatz = "") {
				const n = Math.max(0, Math.min(14, Math.round(ph)));
				glas.style.setProperty("--k", PH_FARBE[n]);
				zellen.forEach((z, i) => z.classList.toggle("an", i === n));
				text.innerHTML = `<b>pH ${komma(ph)}</b> · ${ph < 6.5 ? "sauer" : ph > 7.5 ? "basisch" : "neutral"} · etwa wie ${PH_WIE[n]}${zusatz}`;
			},
		};
	}
	const saeuren = {
		g: 4, titel: "Säuren, Basen und der pH-Wert", kachel: "Säuren und Basen",
		frage: "Zitronensaft hat pH 2, Kaffee pH 5. Klingt nach einem kleinen Unterschied. Wie viel saurer ist die Zitrone wirklich?",
		bau(api) {
			const auf = api.auftraege(["Verdünne die Säure von pH 1 auf <b>pH 4</b>. Zähl mit, wie oft du verdünnen musst.", "Gib Lauge zur unbekannten Säure, bis sie <b>genau neutral</b> ist.", "Finde heraus, was <b>ein Tropfen zu viel</b> anrichtet."],
				"Jede pH-Stufe ist ein Faktor zehn, und am Neutralpunkt entscheidet ein einziger Tropfen.");
			// Teil A: verdünnen
			let mal = 0;
			const a1 = phAnzeige();
			const zeigA = () => {
				const c = 0.1 / 10 ** mal;
				a1.setze(-Math.log10(c + 1e-7), ` · ${mal} mal verdünnt · H<sub>3</sub>O<sup>+</sup>: ${mal < 6 ? `10<sup>−${mal + 1}</sup>` : "kaum mehr als im Wasser selbst"} mol je Liter`);
				if (mal === 3) auf.ab(0);
				bv.disabled = mal >= 6;
			};
			const bv = knopf("Auf das Zehnfache verdünnen", () => { mal++; zeigA(); if (mal === 6) api.sag("Weiter als bis kurz vor 7 kommst du nicht: Aus einer Säure wird durch Wasser nie eine Lauge."); });
			// Teil B: titrieren. Gerechnet wird in Hundertstel Millimol, damit der Neutralpunkt genau getroffen wird.
			let v10 = 0, spur = [[0, 0]];
			const a2 = phAnzeige();
			const kurve = sv("svg", { viewBox: "0 0 320 170", class: "bild schmal", role: "img", "aria-label": "Titrationskurve: pH gegen zugegebene Lauge" });
			const phBei = (v) => {
				const d = 400 - v, V = 50 + v / 10;
				return d > 0 ? -Math.log10((d * 0.01) / V) : d < 0 ? 14 + Math.log10((-d * 0.01) / V) : 7;
			};
			function zeigB() {
				const ph = phBei(v10);
				a2.setze(ph, ` · ${komma(v10 / 10)} mL Lauge zugegeben`);
				const X = (v) => 30 + (v / 600) * 280, Y = (p) => 150 - (p / 14) * 135;
				kurve.replaceChildren(
					sv("path", { d: "M30 12 V150 H312", fill: "none", stroke: TINTE, "stroke-width": 2.5 }),
					sv("line", { x1: 30, y1: Y(7), x2: 312, y2: Y(7), stroke: TINTE, "stroke-width": 1, "stroke-dasharray": "3 4" }),
					...[0, 7, 14].map((p) => sv("text", { x: 24, y: Y(p) + 4, "text-anchor": "end", class: "bild-klein", text: p })),
					...[0, 20, 40, 60].map((v) => sv("text", { x: X(v * 10), y: 165, "text-anchor": "middle", class: "bild-klein", text: v })),
					sv("text", { x: 300, y: 142, "text-anchor": "end", class: "bild-mini", text: "mL Lauge" }),
					sv("polyline", { points: spur.map(([v]) => `${X(v)},${Y(phBei(v))}`).join(" "), fill: "none", stroke: ROT, "stroke-width": 3, "stroke-linejoin": "round" }),
					sv("circle", { cx: X(v10), cy: Y(ph), r: 5, fill: PH_FARBE[Math.round(ph)], stroke: TINTE, "stroke-width": 2 }));
				if (v10 === 400) {
					auf.ab(1);
					api.sag("Genau neutral bei 40,0 mL. Die Lauge hat 0,1 mol je Liter, also waren 4 Millimol OH<sup>−</sup> nötig. Dann steckten in den 50 mL Säure auch 4 Millimol H<sub>3</sub>O<sup>+</sup>: Sie hatte 0,08 mol je Liter. So misst man im Labor unbekannte Mengen.");
				} else if (v10 > 400) {
					auf.ab(2);
					api.sag(v10 <= 410 ? `Ein Zehntel Milliliter über dem Ziel, und der pH springt auf ${komma(ph)}. Rund um den Neutralpunkt ist die Kurve fast senkrecht.` : "Jetzt ist Lauge im Überschuss. Setz neu an, wenn du den Neutralpunkt genau treffen willst.", "warn");
				}
			}
			const gib = (n) => () => { for (let i = 0; i < n && v10 < 600; i++) { v10++; spur.push([v10]); } zeigB(); };
			api.feld.append(h("h3", { text: "Teil 1: Salzsäure verdünnen" }), a1.el, h("div", { class: "knopf-reihe" }, bv, knopf("Frische Säure", () => { mal = 0; zeigA(); }, "leise")),
				h("h3", { text: "Teil 2: Unbekannte Säure neutralisieren" }), a2.el, kurve,
				h("div", { class: "knopf-reihe" }, knopf("+ 5 mL Lauge", gib(50)), knopf("+ 1 mL", gib(10)), knopf("+ 0,1 mL", gib(1)), knopf("Neu ansetzen", () => { v10 = 0; spur = [[0]]; api.sag(""); zeigB(); }, "leise")),
				h("p", { class: "hinweis", text: "Im Kolben sind 50 mL Säure mit Universalindikator. Die Farbe des Glases zeigt, was der Indikator anzeigt." }));
			zeigA();
			zeigB();
		},
		warum: `<p>Eine <b>Säure</b> gibt in Wasser H<sup>+</sup> ab. Das hängt sich sofort an ein Wassermolekül und bildet H<sub>3</sub>O<sup>+</sup>. Eine <b>Base</b> macht das Gegenteil: Sie nimmt H<sup>+</sup> auf, und im Wasser bleiben OH<sup>−</sup> zurück. Der <b>pH-Wert</b> zählt die H<sub>3</sub>O<sup>+</sup>.</p>
			<p>Er zählt allerdings in <b>Zehnerschritten</b>. pH 3 heißt 10<sup>−3</sup> mol je Liter, pH 4 heißt 10<sup>−4</sup>, also ein Zehntel davon. Die Zitrone mit pH 2 ist nicht doppelt so sauer wie Kaffee mit pH 5, sondern tausendmal. Das ist der Logarithmus aus dem Mathe-Heft, Stufe 8.</p>
			<p>Treffen Säure und Base aufeinander, <b>neutralisieren</b> sie sich: H<sub>3</sub>O<sup>+</sup> + OH<sup>−</sup> → 2 H<sub>2</sub>O. Übrig bleibt Wasser und ein Salz. Solange noch Säure im Überschuss ist, ändert sich der pH kaum. Erst kurz vor dem Ziel sind fast keine H<sub>3</sub>O<sup>+</sup> mehr übrig, und ein Tropfen Lauge reicht für einen Sprung über sechs Stufen.</p>`,
		formel: "pH = −log<sub>10</sub> (Konzentration von H<sub>3</sub>O<sup>+</sup> in mol je Liter)",
		merke: "Säuren geben H⁺ ab, Basen nehmen es auf. Eine pH-Stufe weniger heißt zehnmal so sauer.",
		quiz: {
			f: "Regen hat natürlicherweise etwa pH 5,6. Saurer Regen hat pH 3,6. Wie viel mehr H<sub>3</sub>O<sup>+</sup> enthält er?",
			a: ["Etwa anderthalbmal so viel", "Zweimal so viel", "Hundertmal so viel"],
			r: 2,
			w: "Zwei pH-Stufen sind zweimal der Faktor zehn, also hundert.",
		},
	};

	// ---------- 13 · Redox und Batterie ----------
	const POT = { Mg: [-2.37, "Mg^2+", 2], Zn: [-0.76, "Zn^2+", 2], Fe: [-0.44, "Fe^2+", 2], Cu: [0.34, "Cu^2+", 2], Ag: [0.8, "Ag^+", 1] };
	const batterie = {
		g: 4, titel: "Redox und die Batterie", kachel: "Redox und Batterie",
		frage: "In Stufe 4 hat ein Metall Elektronen direkt an ein Nichtmetall übergeben. Was passiert, wenn du die beiden trennst und die Elektronen den Umweg durch einen Draht nehmen müssen?",
		bau(api) {
			const auf = api.auftraege(["Baue die Zelle aus <b>Zink und Kupfer</b>. Das war 1836 die erste brauchbare Batterie.", "Baue eine Zelle mit <b>mehr als 3 Volt</b>.", "Finde zwei verschiedene Metalle, die <b>weniger als 0,4 Volt</b> liefern."],
				"Je weiter zwei Metalle in ihrer Lust auf Elektronen auseinanderliegen, desto höher die Spannung.");
			const svg = sv("svg", { viewBox: "0 0 320 215", class: "bild", role: "img" });
			const strom = sv("g");
			const ab = h("p", { class: "ablese", "aria-live": "polite" });
			const protokoll = h("ul", { class: "protokoll" });
			const gemessen = new Set();
			let richtung = 0;
			function male() {
				const a = wl.wert(), b = wr.wert(), U = Math.abs(POT[a][0] - POT[b][0]);
				richtung = POT[a][0] < POT[b][0] ? 1 : POT[a][0] > POT[b][0] ? -1 : 0;
				const becher = (x, sym, pol) => [
					sv("rect", { x: x + 2, y: 122, width: 96, height: 76, fill: "#cfe4f5" }),
					sv("path", { d: `M${x} 105 V200 H${x + 100} V105`, fill: "none", stroke: TINTE, "stroke-width": 3, "stroke-linejoin": "round" }),
					sv("rect", { x: x + 40, y: 62, width: 20, height: 124, fill: E[sym][1], stroke: TINTE, "stroke-width": 2.5 }),
					sv("text", { x: x + 50, y: 100, "text-anchor": "middle", class: "bild-klein", fill: E[sym][2], text: sym }),
					sv("text", { x: x + 20, y: 176, "text-anchor": "middle", class: "bild-mini", html: POT[sym][1].replace("^", "").replace("2+", "²⁺").replace("+", "⁺") }),
					sv("text", { x: x + 50, y: 212, "text-anchor": "middle", class: "bild-klein", text: pol }),
				];
				const pol = (seite) => (richtung === 0 ? "" : richtung === seite ? "Minuspol" : "Pluspol");
				svg.replaceChildren(
					sv("path", { d: "M118 150 V92 H202 V150", fill: "none", stroke: TINTE, "stroke-width": 9, "stroke-linejoin": "round" }),
					sv("path", { d: "M118 150 V92 H202 V150", fill: "none", stroke: "#f4c600", "stroke-width": 4.5, "stroke-linejoin": "round" }),
					sv("text", { x: 160, y: 84, "text-anchor": "middle", class: "bild-mini", text: "Salzbrücke" }),
					...becher(20, a, pol(1)), ...becher(200, b, pol(-1)),
					sv("path", { d: "M70 62 V26 H250 V62", fill: "none", stroke: TINTE, "stroke-width": 3, "stroke-linejoin": "round" }),
					strom,
					sv("circle", { cx: 160, cy: 26, r: 23, fill: "#fff", stroke: TINTE, "stroke-width": 3 }),
					sv("circle", { cx: 160, cy: 26, r: 23, fill: "#f4c600", opacity: Math.min(1, U / 3.2) }),
					sv("text", { x: 160, y: 29, "text-anchor": "middle", class: "bild-volt", text: `${komma(U, 2)} V` }));
				svg.setAttribute("aria-label", `Zelle aus ${E[a][0]} und ${E[b][0]}: ${komma(U, 2)} Volt`);
				if (!richtung) { ab.innerHTML = "Zweimal dasselbe Metall: Keines will die Elektronen dringender loswerden als das andere. <b>0 Volt.</b>"; strom.replaceChildren(); return; }
				const m = richtung === 1 ? a : b, p = richtung === 1 ? b : a;
				const e = (s) => (POT[s][2] > 1 ? POT[s][2] + " " : "") + "e<sup>−</sup>";
				ab.innerHTML = `<b>${komma(U, 2)} V</b> · ${E[m][0]} gibt Elektronen ab: ${f(`${m} → ${POT[m][1]}`)} + ${e(m)} (Oxidation) · bei ${E[p][0]} kommen sie an: ${f(POT[p][1])} + ${e(p)} → ${p} (Reduktion)`;
				const paar = [m, p].join("–");
				if (!gemessen.has(paar)) { gemessen.add(paar); protokoll.appendChild(h("li", { html: `${E[m][0]} → ${E[p][0]}: <b>${komma(U, 2)} V</b>` })); }
				if (paar === "Zn–Cu") auf.ab(0);
				if (U > 3) auf.ab(1);
				if (U < 0.4) auf.ab(2);
				if (RUHIG) strom.replaceChildren(sv("text", { x: 110, y: 20, "text-anchor": "middle", class: "bild-klein", text: richtung === 1 ? "e⁻ →" : "← e⁻" }));
			}
			const namen = Object.keys(POT).map((s) => [s, s]);
			const wl = wahl("Linkes Metall", namen, "Zn", male);
			const wr = wahl("Rechtes Metall", namen, "Zn", male);
			const werk = h("div", { hidden: true }, svg, ab, h("div", { class: "paar" }, wl.el, wr.el), h("h3", { text: "Gemessen" }), protokoll,
				h("p", { class: "hinweis", text: "Jedes Metall taucht in eine Lösung seiner eigenen Ionen. Die Salzbrücke lässt Ionen wandern und schließt so den Stromkreis." }));
			const tipp = api.tipp("Ein Zinkblech und ein Kupferblech sind durch einen Draht verbunden. Welches Metall schiebt Elektronen in den Draht?", ["Zink", "Kupfer"], 0, () => {
				werk.hidden = false;
				tipp.loese("Zink ist das unedlere Metall. Es wird seine Elektronen leichter los als Kupfer. Stell die beiden unten ein.");
			});
			api.feld.append(tipp.el, werk);
			male();
			if (!RUHIG) api.takt((dt, t) => {
				if (!richtung || werk.hidden) return;
				const punkte = [];
				for (let i = 0; i < 7; i++) {
					let s = ((t * 40 + i * 36) % 252);
					if (richtung === -1) s = 252 - s;
					const [x, y] = s < 36 ? [70, 62 - s] : s < 216 ? [70 + (s - 36), 26] : [250, 26 + (s - 216)];
					if (Math.abs(x - 160) > 24) punkte.push(sv("circle", { cx: x, cy: y, r: 4, fill: BLAU, stroke: TINTE, "stroke-width": 1.2 }));
				}
				strom.replaceChildren(...punkte);
			});
		},
		warum: `<p>Gibt ein Teilchen Elektronen ab, heißt das <b>Oxidation</b>. Nimmt eines Elektronen auf, heißt das <b>Reduktion</b>. Beides passiert immer zusammen, denn die Elektronen müssen irgendwohin. Deshalb der Name <b>Redoxreaktion</b>. Die Ionenbindung aus Stufe 4 war bereits eine, ebenso jede Verbrennung und das Rosten.</p>
			<p>Metalle geben ihre Elektronen unterschiedlich gern her. <b>Unedle</b> Metalle wie Magnesium und Zink tun es leicht, <b>edle</b> wie Kupfer und Silber kaum. Verbindest du ein unedles mit einem edleren, fließen die Elektronen vom einen zum anderen.</p>
			<p>In der Batterie sind die beiden Hälften <b>räumlich getrennt</b>. Die Elektronen können nur durch den Draht, und unterwegs lässt du sie arbeiten: eine Lampe, ein Motor, dein Telefon. Die Spannung ist der Unterschied im Elektronendruck der beiden Metalle. Beim Aufladen eines Akkus wird der Vorgang von außen rückwärts erzwungen.</p>`,
		merke: "Oxidation gibt Elektronen ab, Reduktion nimmt sie auf. Eine Batterie trennt beides und schickt die Elektronen durch den Draht.",
		mehr: 'Was der Strom im Draht dann tut: <a href="../strom/">Verstehen: Strom</a> und <a href="../physics/">Prüfstand Physik</a>, Blatt 12.',
		quiz: {
			f: "Ein Eisennagel liegt in einer blauen Kupfersalz-Lösung. Nach einer Stunde ist er mit Kupfer überzogen. Was ist passiert?",
			a: ["Das Kupfer hat sich nur auf dem Nagel abgesetzt, wie Staub.", "Eisen hat Elektronen an die Kupfer-Ionen abgegeben. Eisen geht in Lösung, Kupfer wird zu Metall.", "Kupfer hat Elektronen an das Eisen abgegeben."],
			r: 1,
			w: "Eisen ist unedler als Kupfer und wird oxidiert. Die Kupfer-Ionen nehmen die Elektronen und werden reduziert, hier ohne Draht dazwischen.",
		},
	};

	// ---------- 14 · Kohlenstoffchemie ----------
	const ALKAN = ["", "Methan", "Ethan", "Propan", "Butan", "Pentan", "Hexan"];
	const SIEDET = { Methan: -162, Ethan: -89, Propan: -42, Butan: -1, Isobutan: -12, Pentan: 36, Hexan: 69, Methanol: 65, Ethanol: 78, Propanol: 97, Dimethylether: -24, Ethen: -104, Propen: -48, Ethin: -84, Wasser: 100 };
	function benenne(i) {
		const z = i.zahl, nC = z.C || 0, nO = z.O || 0;
		const mit = (name, formel) => ({ name, formel, zusatz: name in SIEDET ? `siedet bei ${minus(SIEDET[name])} °C` : "" });
		if (!nC) return i.formel === "H2O" ? mit("Wasser", "H2O") : i.formel === "H2" ? mit("Wasserstoff") : i.formel === "O2" ? mit("Sauerstoff") : null;
		const cs = i.atome.filter((a) => a.e === "C");
		const cNachbarn = cs.map((a) => i.nachbarn[a.id].filter((x) => x.zu.e === "C").length);
		const cc = cNachbarn.reduce((s, x) => s + x, 0) / 2;
		const ring = cc >= nC, verzweigt = Math.max(...cNachbarn) > 2;
		if (i.formel === "CO2") return mit("Kohlendioxid");
		if (nO === 0 && i.maxBindung === 1 && !ring && nC <= 6) {
			if (!verzweigt) return mit(ALKAN[nC]);
			return nC === 4 ? mit("Isobutan") : { name: `ein verzweigtes ${ALKAN[nC]}`, zusatz: "gleiche Formel, anderer Bauplan" };
		}
		if (nO === 0 && !ring && i.maxBindung === 2 && nC <= 3 && z.H === 2 * nC) return mit(nC === 2 ? "Ethen" : "Propen");
		if (i.formel === "C2H2") return mit("Ethin");
		if (nO === 1 && i.maxBindung === 1 && !ring) {
			const o = i.atome.find((a) => a.e === "O");
			if (i.nachbarn[o.id].some((x) => x.zu.e === "H")) return nC <= 3 && !verzweigt ? mit(["", "Methanol", "Ethanol", "Propanol"][nC]) : { name: "ein Alkohol" };
			return nC === 2 ? mit("Dimethylether") : { name: "ein Ether" };
		}
		return ring ? { name: "ein Ring aus Kohlenstoff" } : null;
	}
	const kohlenstoff = {
		g: 4, titel: "Kohlenstoff­chemie", kachel: "Kohlen\u00adstoff",
		frage: "Von den meisten Elementen kennt man ein paar hundert Verbindungen. Vom Kohlenstoff über zehn Millionen. Was kann er, das die anderen nicht können?",
		bau(api) {
			const auf = api.auftraege(["Stecke <b>Methan</b>: ein C, ringsum H.", "Stecke <b>Propan</b>: eine Kette aus drei C.", "Stecke <b>Butan</b> als gerade Kette aus vier C.", "Stecke aus denselben Atomen <b>Isobutan</b>: ein C in der Mitte hält drei andere C.", "Stecke <b>Ethanol</b>: zwei C und ein O, an dem ein H hängt."],
				"Fünf Stoffe aus drei Sorten Kugeln. Und Butan und Isobutan hatten sogar dieselbe Formel.");
			const ZIEL = ["Methan", "Propan", "Butan", "Isobutan", "Ethanol"];
			stecker(api, {
				atome: ["C", "H", "O"], fuellen: true, max: 20, name: benenne,
				bei(i) {
					if (!i.fertig) return;
					const n = benenne(i);
					if (n && ZIEL.includes(n.name)) auf.ab(ZIEL.indexOf(n.name));
				},
			});
			api.feld.appendChild(h("p", { class: "hinweis", text: "Bau erst das Gerüst aus C und O. Der Knopf „Freie Hände mit H füllen“ erledigt den Rest. Achte auf die Siedepunkte." }));
		},
		warum: `<p>Kohlenstoff hat <b>vier Hände</b> und hält sich gern an seinesgleichen fest. Die Bindung zwischen zwei C ist stabil, also lassen sich daraus Ketten, Verzweigungen und Ringe von fast beliebiger Länge bauen. Kein anderes Element schafft das so gut.</p>
			<p>Die einfachsten Ketten tragen nur Wasserstoff: die <b>Alkane</b>. Methan ist Erdgas, Propan und Butan sind im Campinggas, ab fünf C wird es flüssig (Benzin), ab etwa zwanzig fest (Kerzenwachs). Je länger die Kette, desto größer die Fläche, mit der Moleküle aneinander haften, und desto höher der Siedepunkt.</p>
			<p>Bei vier C gibt es zum ersten Mal zwei Baupläne für dieselbe Formel C<sub>4</sub>H<sub>10</sub>. Solche <b>Isomere</b> sind verschiedene Stoffe mit verschiedenen Eigenschaften. Deshalb reicht eine Summenformel hier nicht mehr. Hängt an der Kette etwas anderes als H, ändert das den Charakter des ganzen Moleküls: Die <b>OH-Gruppe</b> macht aus dem Gas Ethan die Flüssigkeit Ethanol, die sich mit Wasser mischt, weil OH an Wasser erinnert.</p>`,
		merke: "Kohlenstoff bildet mit vier Bindungen Ketten und Ringe. Gleiche Formel heißt nicht gleicher Stoff, auf den Bauplan kommt es an.",
		quiz: {
			f: "Propan siedet bei −42 °C, Hexan bei 69 °C. Beide bestehen nur aus C und H. Woher kommt der Unterschied?",
			a: ["Hexan hat festere Bindungen zwischen C und H.", "Die längeren Hexan-Moleküle haften stärker aneinander, weil sie mehr Berührungsfläche haben.", "Hexan enthält Sauerstoff."],
			r: 1,
			w: "Beim Sieden reißen keine Bindungen im Molekül. Es lösen sich nur die Moleküle voneinander, und das fällt langen Ketten schwerer.",
		},
	};

	// ---------- 15 · Polymere ----------
	const polymere = {
		g: 4, titel: "Polymere", kachel: "Polymere",
		frage: "Plastiktüte, Autoreifen und Pfannengriff bestehen aus fast denselben Atomen. Die eine schmilzt, der zweite federt, der dritte bleibt hart. Was unterscheidet sie?",
		bau(api) {
			const auf = api.auftraege(["Finde heraus, ab welcher Kettenlänge aus der Flüssigkeit bei 20 °C etwas <b>Festes</b> wird.", "Bring einen Kunststoff aus Ketten mit mindestens 40 Gliedern zum <b>Schmelzen</b>.", "Baue <b>Gummi</b>: lange Ketten mit wenigen Brücken.", "Baue einen <b>Pfannengriff</b>, der bei 250 °C nicht schmilzt."],
				"Länge der Ketten und Zahl der Brücken: Mit diesen zwei Schrauben stellt man aus denselben Atomen ganz verschiedene Werkstoffe her.");
			const L = leinwand(320, 200, "Ketten aus Kohlenstoff-Gliedern");
			const { ctx } = L;
			const ab = h("p", { class: "ablese", "aria-live": "polite" });
			let ketten = [], bruecken = [];
			function baue() {
				const len = rl.wert(), n = Math.max(1, Math.round(480 / len));
				ketten = [];
				for (let k = 0; k < n; k++) {
					let x = 14 + Math.random() * 292, y = 14 + Math.random() * 172, w = Math.random() * 6.283;
					const p = [];
					for (let i = 0; i < len; i++) {
						p.push([x, y]);
						w += (Math.random() - 0.5) * 1.3;
						x += Math.cos(w) * 6; y += Math.sin(w) * 6;
						if (x < 8 || x > 312) { w = Math.PI - w; x = Math.max(8, Math.min(312, x)); }
						if (y < 8 || y > 192) { w = -w; y = Math.max(8, Math.min(192, y)); }
					}
					ketten.push({ p, ph: Math.random() * 6.283 });
				}
				bruecken = [];
				const soll = { keine: 0, wenige: 16, viele: 110 }[wb.wert()];
				for (let v = 0; v < 6000 && bruecken.length < soll && ketten.length > 1; v++) {
					const a = Math.floor(Math.random() * n), b = Math.floor(Math.random() * n);
					if (a === b) continue;
					const i = Math.floor(Math.random() * len), j = Math.floor(Math.random() * len);
					if (Math.hypot(ketten[a].p[i][0] - ketten[b].p[j][0], ketten[a].p[i][1] - ketten[b].p[j][1]) < 13) bruecken.push([a, i, b, j]);
				}
			}
			function zustand() {
				const len = rl.wert(), br = wb.wert(), T = rt.wert();
				const Tm = len < 20 ? 20 + len * 2.5 : Math.min(135, 70 + (len - 20) * 1.6);
				if (len === 1) return { t: "Gas aus einzelnen Ethen-Molekülen. Brücken gibt es ohne Ketten nicht.", fliesst: 3 };
				if (br === "viele") return T > 280 ? { t: "verkohlt langsam, schmilzt aber nicht (Duroplast)", hart: true, fliesst: 0 } : { t: "hart und starr, schmilzt nicht (Duroplast)", hart: true, fliesst: 0 };
				if (br === "wenige") return len < 20 ? { t: "zähe, klebrige Masse: Die Ketten sind zu kurz für ein Netz", fliesst: 0.4 } : { t: "dehnbar und federnd, schmilzt nicht (Elastomer, also Gummi)", gummi: true, fliesst: 0 };
				if (len < 6) return { t: "Flüssigkeit wie Benzin", fliesst: 1.6 };
				if (T >= Tm) return { t: `geschmolzen: Die Ketten gleiten aneinander vorbei (wird ab etwa ${Math.round(Tm)} °C weich)`, schmelze: true, fliesst: 1 };
				return len < 20 ? { t: `weiches Wachs, wird ab etwa ${Math.round(Tm)} °C flüssig`, fest: true, fliesst: 0 } : { t: `fester, zäher Kunststoff (Thermoplast), wird ab etwa ${Math.round(Tm)} °C weich`, fest: true, fliesst: 0 };
			}
			function male(t) {
				const z = zustand(), zittern = RUHIG ? 0 : 0.3 + rt.wert() / 110;
				ctx.fillStyle = "#fff";
				ctx.fillRect(0, 0, L.w, L.h);
				const ort = (k, i) => {
					const c = ketten[k], [x, y] = c.p[i];
					const fl = RUHIG ? 0 : z.fliesst * 12;
					return [x + Math.sin(t * 0.7 + c.ph) * fl + Math.sin(t * 9 + i * 1.7 + c.ph) * zittern, y + Math.cos(t * 0.6 + c.ph * 2) * fl + Math.cos(t * 8 + i * 2.3) * zittern];
				};
				ctx.lineWidth = 2; ctx.strokeStyle = TINTE; ctx.lineJoin = "round";
				ketten.forEach((c, k) => {
					ctx.beginPath();
					c.p.forEach((_, i) => { const [x, y] = ort(k, i); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
					ctx.stroke();
					if (c.p.length < 12) c.p.forEach((_, i) => { const [x, y] = ort(k, i); ctx.fillStyle = TINTE; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.283); ctx.fill(); });
				});
				ctx.strokeStyle = ROT; ctx.lineWidth = 3;
				bruecken.forEach(([a, i, b, j]) => { const p = ort(a, i), q = ort(b, j); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); });
			}
			function lies() {
				const len = rl.wert(), z = zustand();
				ab.innerHTML = `<b>${len === 1 ? f("C2H4") : `(${f("C2H4")})<sub>${len}</sub>`}</b> · ${28 * len} g je Mol · bei ${rt.wert()} °C: <b>${z.t}</b>`;
				if (z.fest && rt.wert() === 20) auf.ab(0);
				if (z.schmelze && len >= 40) auf.ab(1);
				if (z.gummi) auf.ab(2);
				if (z.hart && rt.wert() >= 250 && rt.wert() <= 280) auf.ab(3);
				if (RUHIG) male(0);
			}
			const rl = regler({ name: "Glieder je Kette", min: 1, max: 60, wert: 1, zeige: (v) => String(v), bei: () => { baue(); lies(); } });
			const wb = wahl("Brücken zwischen den Ketten", [["keine", "keine"], ["wenige", "wenige"], ["viele", "viele"]], "keine", () => { baue(); lies(); });
			const rt = regler({ name: "Temperatur", min: 20, max: 300, step: 10, wert: 20, zeige: (v) => `${v} °C`, bei: lies });
			api.feld.append(L.el, ab, rl.el, wb.el, rt.el,
				h("p", { class: "hinweis", text: "Schwarze Linien sind Ketten aus Ethen-Bausteinen, rote Striche sind feste Brücken zwischen zwei Ketten. Die Schmelzpunkte sind gerundete Richtwerte." }));
			baue(); lies();
			if (!RUHIG) api.takt((dt, t) => male(t));
		},
		warum: `<p>Ethen hat eine Doppelbindung. Klappt sie auf, hat jedes C eine Hand frei und kann das nächste Ethen greifen, das wieder aufklappt, und so weiter. Aus tausenden kleinen <b>Monomeren</b> wird eine einzige lange Kette, ein <b>Polymer</b>. Aus Ethen entsteht so Polyethen, der Stoff der Plastiktüte.</p>
			<p>Die <b>Kettenlänge</b> bestimmt den Zustand, wie schon bei den Alkanen in Stufe 14. Kurze Ketten sind Gas oder Flüssigkeit, mittlere sind Wachs, lange verhaken sich wie gekochte Spaghetti und ergeben einen festen Stoff. Erwärmst du ihn, können die Ketten wieder aneinander vorbeigleiten. Er schmilzt und lässt sich neu formen: ein <b>Thermoplast</b>.</p>
			<p><b>Brücken</b> zwischen den Ketten ändern das. Mit wenigen Brücken können sich die Ketten strecken, werden aber zurückgezogen: ein <b>Elastomer</b> wie Gummi. Mit vielen Brücken ist alles ein einziges starres Netz, das nicht mehr schmelzen kann: ein <b>Duroplast</b>. Deshalb lässt sich eine Flasche einschmelzen und ein Autoreifen nicht.</p>`,
		formel: `n ${f("C2H4")} → (${f("C2H4")})<sub>n</sub>`,
		merke: "Lange Ketten machen fest, Brücken machen elastisch oder starr. Ohne Brücken schmilzt ein Kunststoff, mit Brücken nicht.",
		quiz: {
			f: "Warum kann man eine PET-Flasche einschmelzen und neu formen, einen Lichtschalter aus Duroplast aber nicht?",
			a: ["Weil die Ketten im Duroplast über viele Brücken zu einem einzigen Netz verbunden sind und nicht aneinander vorbeigleiten können.", "Weil Duroplast aus Metall-Atomen besteht.", "Weil die Ketten in der Flasche kürzer sind als in Benzin."],
			r: 0,
			w: "Schmelzen heißt, dass Ketten sich gegeneinander verschieben. Ein durchgehend vernetztes Stück kann das nicht, es zersetzt sich eher.",
		},
	};

	// ---------- 16 · Moleküle des Lebens ----------
	const AS = { Gly: "#f4c600", Ala: "#198a45", Ser: "#dd3220", Cys: "#2449c9" };
	const PARTNER = { A: "T", T: "A", G: "C", C: "G" };
	const leben = {
		g: 4, titel: "Moleküle des Lebens", kachel: "Moleküle des Lebens",
		frage: "Dein Körper baut Stärke, Eiweiß und Erbgut. Drei ganz verschiedene Aufgaben, aber jedes Mal derselbe chemische Handgriff. Findest du ihn?",
		bau(api) {
			const auf = api.auftraege(["Hänge <b>sechs Zucker</b> zu einer Stärkekette zusammen.", "<b>Verdaue</b> die Kette wieder zu einzelnen Zuckern.", "Baue das Eiweißstück <b>Ser–Gly–Cys–Ala–Gly</b> in genau dieser Reihenfolge.", "Ergänze den <b>Gegenstrang</b> der DNA."],
				"Zucker, Aminosäuren, Nukleotide: Jedes Mal wurde beim Verknüpfen ein Wasser frei, und jedes Mal ließ sich die Kette mit Wasser wieder spalten.");
			// Stärke
			let zucker = 1, verdaut = false;
			const z1 = h("div", { class: "kette" }), t1 = h("p", { class: "ablese", "aria-live": "polite" });
			const zeigZ = () => {
				z1.replaceChildren(...Array.from({ length: zucker }, (_, i) => [i && !verdaut ? h("span", { class: "glied", text: "–O–" }) : null, h("span", { class: "zucker", text: "Glc" })]).flat().filter(Boolean));
				t1.innerHTML = verdaut ? `${zucker} einzelne Traubenzucker. Zum Spalten wurden <b>${zucker - 1} ${f("H2O")}</b> verbraucht.` : `Kette aus ${zucker} Traubenzucker${zucker > 1 ? ` · beim Verknüpfen wurden <b>${zucker - 1} ${f("H2O")}</b> frei` : ""}`;
				if (zucker >= 6 && !verdaut) auf.ab(0);
				if (zucker >= 6 && verdaut) auf.ab(1);
			};
			// Eiweiß
			const ZIEL = ["Ser", "Gly", "Cys", "Ala", "Gly"];
			let ei = [];
			const z2 = h("div", { class: "kette" }), t2 = h("p", { class: "ablese", "aria-live": "polite" });
			const zeigE = () => {
				z2.replaceChildren(...ei.map((a, i) => [i ? h("span", { class: "glied", text: "–" }) : null, h("span", { class: "amino", style: `--k:${AS[a]}`, text: a })]).flat().filter(Boolean));
				const ok = ei.length === 5 && ei.every((a, i) => a === ZIEL[i]);
				t2.innerHTML = !ei.length ? "Noch leer. Ziel: Ser–Gly–Cys–Ala–Gly" : ok ? `<span class="gut">Stimmt.</span> ${ei.length - 1} ${f("H2O")} frei. Mit 20 Sorten gäbe es für fünf Plätze schon 3,2 Millionen Möglichkeiten.` : ei.every((a, i) => a === ZIEL[i]) ? `${ei.length} von 5 · ${ei.length - 1} ${f("H2O")} frei` : '<span class="warn">Die Reihenfolge stimmt nicht.</span> Ein anderes Eiweiß, eine andere Faltung, eine andere Aufgabe. Trenn das letzte Stück ab.';
				if (ok) auf.ab(2);
			};
			// DNA
			const STRANG = "ATGCCGTA";
			let gegen = "";
			const z3 = h("div", { class: "dna" }), t3 = h("p", { class: "ablese", "aria-live": "polite" });
			const zeigD = () => {
				z3.replaceChildren(...[...STRANG].map((b, i) => h("span", { class: "dna-paar" }, h("b", { "data-b": b, text: b }), h("i", { text: gegen[i] ? (b === "A" || b === "T" ? "··" : "···") : "" }), h("b", { "data-b": gegen[i] || "", class: gegen[i] ? "" : i === gegen.length ? "offen jetzt" : "offen", text: gegen[i] || "?" }))));
				t3.innerHTML = gegen.length === 8 ? '<span class="gut">Der Doppelstrang ist vollständig.</span> Aus einem Strang folgt der andere eindeutig. So wird Erbgut kopiert.' : `Welche Base passt zu <b>${STRANG[gegen.length]}</b>?`;
				if (gegen.length === 8) auf.ab(3);
			};
			api.feld.append(
				h("h3", { text: "Stärke: Kette aus Zucker" }), z1, t1,
				h("div", { class: "knopf-reihe" }, knopf("Zucker anhängen", () => { if (verdaut) { verdaut = false; zucker = 1; } if (zucker < 8) zucker++; zeigZ(); }), knopf("Mit Wasser und Enzym spalten", () => { if (zucker > 1) verdaut = true; zeigZ(); })),
				h("h3", { text: "Eiweiß: Kette aus Aminosäuren" }), z2, t2,
				h("div", { class: "knopf-reihe" }, Object.keys(AS).map((a) => h("button", { type: "button", class: "knopf amino-knopf", style: `--k:${AS[a]}`, text: a, onclick: () => { if (ei.length < 5) ei.push(a); zeigE(); } })), knopf("Letztes abtrennen", () => { ei.pop(); zeigE(); }, "leise")),
				h("h3", { text: "DNA: zwei Stränge, die zueinander passen" }), z3, t3,
				h("div", { class: "knopf-reihe" }, [..."ATGC"].map((b) => h("button", {
					type: "button", class: "knopf dna-knopf", "data-b": b, text: b, "aria-label": `Base ${b} anlegen`, onclick: () => {
						if (gegen.length >= 8) return;
						const soll = PARTNER[STRANG[gegen.length]];
						if (b === soll) { gegen += b; api.sag(""); } else api.sag(`${b} hält an ${STRANG[gegen.length]} nicht. A und T passen mit zwei Wasserstoffbrücken zusammen, G und C mit drei.`, "warn");
						zeigD();
					},
				})), knopf("Strang leeren", () => { gegen = ""; zeigD(); }, "leise")));
			zeigZ(); zeigE(); zeigD();
		},
		warum: `<p>Lebewesen bauen ihre großen Moleküle wie die Polymere aus Stufe 15: als Ketten aus kleinen Bausteinen. Der Handgriff ist immer derselbe. Ein Baustein gibt ein H ab, der andere ein OH, daraus wird ein Wasser, und die beiden Bausteine hängen zusammen. Das heißt <b>Kondensation</b>. Umgekehrt spaltet Wasser die Kette wieder (<b>Hydrolyse</b>). Genau das tut deine Verdauung.</p>
			<p><b>Kohlenhydrate</b> sind Ketten aus Zuckern. Stärke und Zellulose bestehen beide aus Traubenzucker und unterscheiden sich nur in der Art der Verknüpfung. <b>Eiweiße</b> sind Ketten aus 20 Sorten Aminosäuren. Ihre Reihenfolge bestimmt, wie sich die Kette faltet, und die Form bestimmt die Aufgabe: Enzym, Muskel, Antikörper. <b>Fette</b> sind keine Ketten, aber auch hier hängen drei Fettsäuren unter Wasserabspaltung an einem Glycerin.</p>
			<p>Die <b>DNA</b> ist eine Kette aus vier Sorten Nukleotiden. Ihre Basen passen paarweise zusammen, A zu T und G zu C, gehalten von Wasserstoffbrücken. Das sind dieselben schwachen Kräfte, die Wassermoleküle aneinander kleben lassen (Stufe 6). Fest genug, um die Stränge zu halten, und locker genug, um sie zum Ablesen zu öffnen. Wie aus dieser Reihenfolge ein Eiweiß wird, ist die erste große Frage der Biologie.</p>`,
		merke: "Stärke, Eiweiß und DNA sind Ketten aus kleinen Bausteinen. Verknüpft wird unter Abgabe von Wasser, gespalten wird mit Wasser.",
		mehr: 'Weiter auf der Leiter: <a href="../biology/">Biologie</a>.',
		quiz: {
			f: "Du isst ein Stück Brot. Was macht dein Körper chemisch mit der Stärke?",
			a: ["Er verbrennt die ganzen Ketten sofort im Magen.", "Er spaltet die Ketten mit Wasser und Enzymen in einzelne Zucker, die ins Blut gehen.", "Er baut die Ketten unverändert in die Muskeln ein."],
			r: 1,
			w: "Hydrolyse, die Umkehrung der Kondensation. Das Enzym Amylase im Speichel fängt schon im Mund damit an.",
		},
	};

	window.CH.add(saeuren, batterie, kohlenstoff, polymere, leben);
})();
