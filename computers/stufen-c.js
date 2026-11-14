/* Baugruppe B (U11, U12) und C: vom Rechner zum Netz (U13 bis U15) */
(function () {
	"use strict";
	const { h, s, knopf, schalter, led } = PL;

	/* ---------- U11 Rekursion ---------- */
	PL.stufen.push({
		id: "rekursion", gruppe: "b", titel: "Rekursion", kurz: "Ein Problem lösen, indem man es kleiner macht",
		auftrag: "<p>Drei Stifte, ein Turm aus Scheiben. Der Turm soll vom linken auf den rechten Stift. Du darfst immer nur eine Scheibe bewegen, und nie darf eine größere auf einer kleineren liegen. Tipp erst auf den Stift, von dem du nimmst, dann auf den, auf den du legst.</p>",
		baue(api) {
			function tuerme(n, beiZug) {
				const st = [Array.from({ length: n }, (_, i) => n - i), [], []];
				let hand = null;
				const el = h("div", { class: "tuerme" });
				const kn = st.map((_, i) => h("button", {
					type: "button", class: "turm",
					onclick() {
						if (!beiZug) return;
						if (hand === null) {
							if (st[i].length) hand = i;
						} else if (hand === i) hand = null;
						else {
							const x = st[hand][st[hand].length - 1];
							const oben = st[i][st[i].length - 1];
							if (oben && oben < x) {
								beiZug(false);
								hand = null;
							} else {
								st[i].push(st[hand].pop());
								hand = null;
								zeig();
								return beiZug(true, st);
							}
						}
						zeig();
					},
				}));
				function zeig() {
					kn.forEach((k, i) => {
						k.classList.toggle("hoch", hand === i);
						k.setAttribute("aria-label", "Stift " + "ABC"[i] + ": " + (st[i].length ? "Scheiben " + st[i].join(", ") : "leer") + (hand === i ? ", oberste Scheibe aufgenommen" : ""));
						k.replaceChildren(...st[i].map((x) => h("div", { class: "scheibe", style: "width:" + (28 + x * (64 / n)) + "%", text: x })));
					});
				}
				el.append(...kn);
				zeig();
				return { el, st, zeig, bewege: (a, b) => (st[b].push(st[a].pop()), zeig()) };
			}
			api.folge([
				{
					ziel: "Bring den Turm aus <b>drei</b> Scheiben von links nach rechts.",
					baue(feld, weiter) {
						let z = 0;
						const info = h("p", { class: "druck", text: "0 Züge" });
						const t = tuerme(3, (ok, st) => {
							if (!ok) return api.sag("Das geht nicht: Eine größere Scheibe darf nie auf einer kleineren liegen.", "fehler");
							z++;
							info.textContent = z + (z === 1 ? " Zug" : " Züge");
							api.sag("");
							if (st[2].length === 3) weiter("Geschafft in " + z + " Zügen" + (z === 7 ? ", und kürzer geht es nicht." : ". Das Minimum sind 7.") + " Ist dir aufgefallen, was du getan hast? Erst die zwei kleinen zur Seite, dann die große, dann die zwei kleinen wieder obendrauf.");
						});
						feld.append(t.el, info);
					},
				},
				{
					ziel: "Dieselbe Idee als Programm: „Um n Scheiben zu bewegen, bewege n − 1 zur Seite, dann die größte, dann n − 1 obendrauf.“ Das Programm ruft sich selbst auf. Lass es <b>vier</b> Scheiben lösen und beobachte den Aufrufstapel.",
					baue(feld, weiter) {
						const zuege = [];
						const stapel = [];
						(function loese(n, von, nach, hilf) {
							if (!n) return;
							stapel.push("bewege " + n + (n === 1 ? " Scheibe " : " Scheiben ") + "ABC"[von] + " → " + "ABC"[nach]);
							loese(n - 1, von, hilf, nach);
							zuege.push({ von, nach, n, stapel: stapel.slice() });
							loese(n - 1, hilf, nach, von);
							stapel.pop();
						})(4, 0, 2, 1);
						let t = tuerme(4), i = 0, uhr = null;
						const halter = h("div", null, t.el);
						const liste = h("ol", { class: "stapel", "aria-label": "Aufrufstapel" });
						const info = h("p", { class: "druck", text: "Zug 0 von 15" });
						const formel = h("p", { style: "margin:0" });
						function schritt() {
							if (i >= zuege.length) return true;
							const z = zuege[i++];
							t.bewege(z.von, z.nach);
							liste.replaceChildren(...z.stapel.map((x) => h("li", { text: x })));
							info.textContent = "Zug " + i + " von 15: Scheibe " + z.n + " von " + "ABC"[z.von] + " nach " + "ABC"[z.nach];
							if (i === zuege.length) {
								weiter("15 Züge, und das Programm besteht aus drei Zeilen. Der Stapel merkt sich, bei welcher Teilaufgabe es gerade ist, genau wie in Baugruppe 10.");
								return true;
							}
						}
						const start = () => {
							api.stopp(uhr);
							if (i >= zuege.length) {
								i = 0;
								t = tuerme(4);
								halter.replaceChildren(t.el);
							}
						};
						feld.append(halter, info,
							h("div", { class: "reihe" },
								knopf("Rekursion starten", () => {
									start();
									uhr = api.takt(() => {
										if (schritt()) api.stopp(uhr);
									}, PL.ruhig ? 900 : 520);
								}),
								knopf("Einzelschritt", () => {
									start();
									schritt();
								}, "leer")),
							h("div", { class: "kasten" }, h("p", { class: "druck", text: "Aufrufstapel (unten: gerade in Arbeit)" }), liste),
							h("div", { class: "kasten" }, PL.regler("Wie viele Züge bei n Scheiben?", 1, 30, 1, 4, zeigF, (v) => v + " Scheiben"), formel));
						function zeigF(v) {
							const z = Math.pow(2, v) - 1;
							formel.textContent = "2 hoch " + v + " minus 1 = " + z.toLocaleString("de-DE") + " Züge" + (v >= 25 ? ". Bei einem Zug pro Sekunde: " + Math.round(z / 31536000 * 10) / 10 + " Jahre." : ".");
						}
						zeigF(4);
					},
				},
			]);
		},
		blatt: {
			titel: "Eine Lösung, die sich selbst benutzt",
			text: "<p>Rekursion heißt: Ein Verfahren löst ein Problem, indem es dasselbe Verfahren auf eine kleinere Version des Problems anwendet. Dazu gehören immer zwei Dinge. Erstens der Schritt zum Kleineren: n Scheiben werden zu n − 1. Zweitens ein Ende: Bei einer Scheibe gibt es nichts mehr zu zerlegen, sie wird einfach bewegt.</p><p>Fehlt das Ende, ruft sich das Programm für immer selbst auf. Das ist die Endlosschleife aus Baugruppe 6 in neuer Form.</p><p>Du hast Rekursion schon gesehen: Mischen in Baugruppe 8 sortiert zwei Hälften, und jede Hälfte wieder als zwei Hälften. Die binäre Suche sucht in der Hälfte, dann in deren Hälfte. Die Türme zeigen auch die Kehrseite: Jede weitere Scheibe verdoppelt die Züge. Solches Wachstum kennst du aus dem <a href=\"../math/\">Mathe-Heft, Stufe 7</a>. Kein noch so schneller Rechner kommt dagegen an.</p>",
			formel: "Züge(n) = 2 · Züge(n − 1) + 1 = 2ⁿ − 1",
			merke: "Rekursion braucht einen Schritt zum kleineren Problem und einen einfachsten Fall, bei dem Schluss ist.",
		},
		quiz: {
			frage: "Ein rekursives Programm für die Türme hat keinen einfachsten Fall („bei 0 Scheiben: nichts tun“). Was passiert?",
			wahl: ["Es löst das Rätsel trotzdem, nur langsamer", "Es ruft sich immer weiter selbst auf und wird nie fertig", "Es bewegt nur die größte Scheibe"],
			richtig: 1,
			weil: "Ohne Abbruch wird aus n − 1 irgendwann −1, −2 und so weiter. Der Aufrufstapel wächst, bis der Speicher voll ist.",
		},
	});

	/* ---------- gemeinsam: Netz aus Knoten und Leitungen zeichnen ---------- */
	function netz(def, opt) {
		const svg = s("svg", { viewBox: `0 0 340 ${def.h}`, class: "schaltung", role: "group", "aria-label": def.name });
		const kanten = def.kanten.map(([a, b, w]) => {
			const [x1, y1] = def.knoten[a], [x2, y2] = def.knoten[b];
			const linie = s("path", { class: "bahn", d: `M${x1} ${y1} L${x2} ${y2}` });
			const g = s("g", null, linie);
			if (w != null) {
				const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
				g.append(s("rect", { x: mx - 9, y: my - 8, width: 18, height: 16, rx: 3, fill: "var(--maske-tief)" }), s("text", { x: mx, y: my + 4, "text-anchor": "middle", text: w }));
			}
			if (opt.kante) {
				g.append(s("path", { d: `M${x1} ${y1} L${x2} ${y2}`, stroke: "transparent", "stroke-width": 26, fill: "none" }));
				g.style.cursor = "pointer";
				PL.taste(g, "Leitung " + a + " – " + b, () => opt.kante(k));
			}
			const k = { a, b, w, linie, g, aus: false };
			svg.append(g);
			return k;
		});
		const knoten = {};
		Object.keys(def.knoten).forEach((id) => {
			const [x, y] = def.knoten[id];
			const kreis = s("circle", { cx: x, cy: y, r: 15, fill: "var(--chip)", stroke: "var(--gold)", "stroke-width": 2 });
			const marke = s("text", { class: "klein", x, y: y + 28, "text-anchor": "middle" });
			const g = s("g", null, kreis, s("text", { x, y: y + 4, "text-anchor": "middle", text: id }), marke);
			if (opt.knoten) {
				g.style.cursor = "pointer";
				PL.taste(g, "Knoten " + id, () => opt.knoten(id));
			}
			svg.append(g);
			knoten[id] = { kreis, marke, g, x, y };
		});
		const nachbarn = (id) => kanten.filter((k) => !k.aus && (k.a === id || k.b === id)).map((k) => ({ zu: k.a === id ? k.b : k.a, k }));
		return { svg, kanten, knoten, nachbarn, kante: (a, b) => kanten.find((k) => (k.a === a && k.b === b) || (k.a === b && k.b === a)) };
	}

	/* ---------- U12 Graphen ---------- */
	const KARTE = {
		h: 250, name: "Leiterbahnen zwischen acht Lötpunkten, mit Längen",
		knoten: { A: [28, 125], B: [105, 45], C: [105, 205], D: [185, 110], E: [200, 215], F: [265, 40], G: [270, 170], Z: [315, 100] },
		kanten: [["A", "B", 2], ["A", "C", 4], ["B", "D", 7], ["B", "F", 9], ["C", "D", 2], ["C", "E", 3], ["D", "F", 5], ["D", "G", 3], ["E", "G", 6], ["F", "Z", 4], ["G", "Z", 3]],
	};
	PL.stufen.push({
		id: "graphen", gruppe: "b", titel: "Graphen und Wege", kurz: "Der kürzeste Weg durch ein Netz",
		auftrag: "<p>Ein Signal soll von <b>A</b> nach <b>Z</b>. Die Zahlen an den Leiterbahnen sind ihre Längen. Punkte und Verbindungen zusammen nennt man einen Graphen. Straßenkarten, Freundeskreise und das Internet lassen sich so beschreiben.</p>",
		baue(api) {
			api.folge([
				{
					ziel: "Tipp die Punkte der Reihe nach an und leg einen Weg von A nach Z. Finde den <b>kürzesten</b>.",
					baue(feld, weiter) {
						let weg = ["A"];
						const info = h("p", { class: "anzeige" });
						const n = netz(KARTE, {
							knoten(id) {
								const letzter = weg[weg.length - 1];
								if (id === letzter && weg.length > 1) weg.pop();
								else if (weg.includes(id)) return;
								else if (!n.kante(letzter, id)) return api.sag("Zwischen " + letzter + " und " + id + " gibt es keine Leiterbahn.", "fehler");
								else weg.push(id);
								zeig();
							},
						});
						function zeig() {
							let lang = 0;
							n.kanten.forEach((k) => k.linie.classList.remove("an"));
							for (let i = 1; i < weg.length; i++) {
								const k = n.kante(weg[i - 1], weg[i]);
								k.linie.classList.add("an");
								lang += k.w;
							}
							Object.keys(n.knoten).forEach((id) => n.knoten[id].kreis.setAttribute("fill", weg.includes(id) ? "var(--gold-tief)" : "var(--chip)"));
							info.replaceChildren(String(lang), h("small", { text: "Weg: " + weg.join(" → ") }));
							api.sag("");
							if (weg[weg.length - 1] === "Z") {
								if (lang === 12) weiter("12 ist der kürzeste Weg. Der verlockende Anfang über B (nur 2) führt in eine Sackgasse aus langen Bahnen. Immer das nächste kurze Stück zu nehmen, reicht also nicht.");
								else api.sag("Dein Weg ist " + lang + " lang. Es gibt einen kürzeren. Tipp den letzten Punkt noch einmal an, um einen Schritt zurückzugehen.", "fehler");
							}
						}
						feld.append(n.svg, info, h("div", { class: "reihe mitte" }, knopf("Weg löschen", () => {
							weg = ["A"];
							zeig();
						}, "leer")));
						zeig();
					},
				},
				{
					ziel: "Du hast die ganze Karte gesehen. Ein Programm sieht immer nur einen Punkt und seine Nachbarn. So findet es den kürzesten Weg trotzdem: Drück <b>Nächster Schritt</b>, bis Z feststeht.",
					baue(feld, weiter) {
						const n = netz(KARTE, {});
						const dist = { A: 0 }, ueber = {}, fest = [];
						function zeig() {
							Object.keys(n.knoten).forEach((id) => {
								const k = n.knoten[id];
								k.marke.textContent = dist[id] == null ? "∞" : dist[id];
								k.kreis.setAttribute("fill", fest.includes(id) ? "var(--gold-tief)" : "var(--chip)");
							});
							n.kanten.forEach((k) => k.linie.classList.toggle("an", (ueber[k.a] === k.b && fest.includes(k.a)) || (ueber[k.b] === k.a && fest.includes(k.b))));
						}
						const taste = knopf("Nächster Schritt", () => {
							const offen = Object.keys(dist).filter((id) => !fest.includes(id)).sort((x, y) => dist[x] - dist[y]);
							const id = offen[0];
							fest.push(id);
							const neu = [];
							n.nachbarn(id).forEach(({ zu, k }) => {
								if (fest.includes(zu)) return;
								const d = dist[id] + k.w;
								if (dist[zu] == null || d < dist[zu]) {
									neu.push(zu + ": " + (dist[zu] == null ? "" : "statt " + dist[zu] + " nur ") + d);
									dist[zu] = d;
									ueber[zu] = id;
								}
							});
							zeig();
							if (id === "Z") {
								taste.disabled = true;
								let p = "Z", weg = ["Z"];
								while (ueber[p]) weg.unshift((p = ueber[p]));
								return weiter("Z steht fest mit 12 über " + weg.join(" → ") + ". Das Verfahren heißt Dijkstra-Algorithmus. Es legt immer den Punkt fest, der dem Start am nächsten ist, und kann sich deshalb nie irren.");
							}
							api.sag(id + " steht fest mit Abstand " + dist[id] + ": Kürzer kommt man dort nicht mehr hin. " + (neu.length ? "Von dort erreichbar: " + neu.join(", ") + "." : "Von dort wird nichts kürzer."), "info");
						});
						feld.append(n.svg, h("p", { class: "druck", style: "text-align:center", text: "Zahl unter dem Punkt: bisher kürzester bekannter Abstand zu A" }), h("div", { class: "reihe mitte" }, taste));
						zeig();
					},
				},
			]);
		},
		blatt: {
			titel: "Punkte, Verbindungen und der sichere kürzeste Weg",
			text: "<p>Ein Graph besteht aus Knoten und Kanten. Mehr braucht es nicht, um erstaunlich viele Dinge zu beschreiben: Orte und Straßen, Menschen und Bekanntschaften, Webseiten und Links, Bauteile und Leiterbahnen. Tragen die Kanten Zahlen, etwa Länge oder Fahrzeit, heißt der Graph gewichtet.</p><p>Der Dijkstra-Algorithmus findet den kürzesten Weg ohne Überblick. Er merkt sich für jeden Knoten den besten bisher bekannten Abstand. Dann legt er den nächstgelegenen offenen Knoten fest und schaut, ob über ihn ein Nachbar günstiger erreichbar wird. Das wiederholt er, bis das Ziel feststeht.</p><p>Warum das stimmt: Der nächstgelegene offene Knoten kann über keinen Umweg mehr kürzer werden, denn jeder Umweg führte über einen Knoten, der weiter weg ist. Jedes Navigationsgerät rechnet im Kern so.</p>",
			formel: "Abstand(Nachbar) = kleinster Wert aus bisherigem Abstand und Abstand(fester Knoten) + Kantenlänge",
			merke: "Ein Graph beschreibt, was womit verbunden ist. Der kürzeste Weg entsteht, indem man Knoten in der Reihenfolge ihres Abstands festlegt.",
		},
		quiz: {
			frage: "Warum reicht es nicht, an jeder Kreuzung einfach die kürzeste Leiterbahn zu nehmen?",
			wahl: ["Weil kurze Bahnen langsamer sind", "Weil ein kurzer erster Schritt in eine Gegend mit langen Bahnen führen kann", "Weil man dabei im Kreis läuft"],
			richtig: 1,
			weil: "Genau das war die Falle über B. Ein Verfahren, das nur auf den nächsten Schritt schaut, heißt gierig. Es ist schnell, aber nicht immer richtig.",
		},
	});

	/* ---------- U13 Netzwerke ---------- */
	const NETZ = {
		h: 240, name: "Netz aus Vermittlungsknoten zwischen dir und dem Ziel",
		knoten: { DU: [28, 120], P: [100, 50], Q: [100, 190], R: [175, 120], S: [250, 50], T: [250, 190], ZIEL: [312, 120] },
		kanten: [["DU", "P"], ["DU", "Q"], ["P", "R"], ["Q", "R"], ["P", "S"], ["R", "S"], ["R", "T"], ["Q", "T"], ["S", "ZIEL"], ["T", "ZIEL"]],
	};
	PL.stufen.push({
		id: "netzwerke", gruppe: "c", titel: "Netzwerke", kurz: "Pakete, die ihren Weg selbst finden",
		auftrag: "<p>Bisher stand dein Rechner allein. Jetzt hängt er an anderen. Eine Nachricht reist dabei nicht am Stück. Sie wird in nummerierte Pakete zerlegt. Jeder Knoten im Netz reicht jedes Paket einzeln an einen Nachbarn weiter, der näher am Ziel liegt.</p>",
		baue(api) {
			function anlage(feld, fertig) {
				let fliegt = false;
				const n = netz(NETZ, {
					kante(k) {
						if (fliegt) return;
						k.aus = !k.aus;
						k.linie.style.strokeDasharray = k.aus ? "2 9" : "";
						k.linie.style.stroke = k.aus ? "var(--rot)" : "";
						k.g.setAttribute("aria-pressed", String(k.aus));
						info.textContent = schnitte() + " Leitungen gekappt";
					},
				});
				const schnitte = () => n.kanten.filter((k) => k.aus).length;
				const info = h("p", { class: "druck", text: "0 Leitungen gekappt · Leitung antippen zum Kappen" });
				const eingang = h("div", { class: "teile" }), text = h("div", { class: "teile" });
				function abstand() {
					const d = { ZIEL: 0 }, q = ["ZIEL"];
					while (q.length) {
						const x = q.shift();
						n.nachbarn(x).forEach(({ zu }) => {
							if (d[zu] == null) {
								d[zu] = d[x] + 1;
								q.push(zu);
							}
						});
					}
					return d;
				}
				function sende() {
					if (fliegt) return;
					const d = abstand();
					eingang.replaceChildren();
					text.replaceChildren();
					n.svg.querySelectorAll(".paket").forEach((p) => p.remove());
					if (d.DU == null) return fertig(false, schnitte());
					const da = [];
					let uhr = null;
					const pakete = "HALLO".split("").map((z, i) => {
						const weg = ["DU"];
						while (weg[weg.length - 1] !== "ZIEL") {
							const x = weg[weg.length - 1];
							const wahl = n.nachbarn(x).filter(({ zu }) => d[zu] === d[x] - 1);
							weg.push(wahl[Math.floor(Math.random() * wahl.length)].zu);
						}
						const g = s("g", { class: "paket" }, s("rect", { x: -9, y: -9, width: 18, height: 18, rx: 3, fill: "var(--gelb)" }),
							s("text", { x: 0, y: 4, "text-anchor": "middle", text: z, style: "fill:var(--tinte)" }));
						n.svg.append(g);
						return { z, nr: i + 1, weg, g, t: -i * 0.45 - Math.random() * 0.5, tempo: 0.035 + Math.random() * 0.025 };
					});
					const an = (p) => {
						p.g.remove();
						da.push(p);
						eingang.append(h("span", { class: "teil", text: p.nr + ":" + p.z }));
						if (da.length === 5) {
							fliegt = false;
							api.stopp(uhr);
							text.replaceChildren(...da.slice().sort((x, y) => x.nr - y.nr).map((x) => h("span", { class: "teil hell", text: x.z })));
							fertig(true, schnitte(), da.map((x) => x.nr).join(""));
						}
					};
					if (PL.ruhig) {
						pakete.sort(() => Math.random() - 0.5).forEach(an);
						return;
					}
					fliegt = true;
					api.sag("Pakete unterwegs …", "info");
					uhr = api.takt(() => {
						pakete.forEach((p) => {
							if (p.fertig) return;
							p.t += p.tempo;
							if (p.t < 0) return;
							const i = Math.floor(p.t);
							if (i >= p.weg.length - 1) {
								p.fertig = true;
								return an(p);
							}
							const a = n.knoten[p.weg[i]], b = n.knoten[p.weg[i + 1]], f = p.t - i;
							p.g.setAttribute("transform", `translate(${a.x + (b.x - a.x) * f} ${a.y + (b.y - a.y) * f})`);
						});
					}, 30);
				}
				feld.append(n.svg, info,
					h("div", { class: "reihe mitte" }, knopf("HALLO senden", sende), knopf("Alles flicken", () => n.kanten.forEach((k) => k.aus && k.g.dispatchEvent(new Event("click"))), "leer")),
					h("div", { class: "spalten" },
						h("div", { class: "kasten" }, h("p", { class: "druck", text: "Angekommen (in dieser Reihenfolge)" }), eingang),
						h("div", { class: "kasten" }, h("p", { class: "druck", text: "Nach Nummern geordnet" }), text)));
			}
			api.folge([
				{
					ziel: "Schick die Nachricht <b>HALLO</b> los und schau, welche Wege die fünf Pakete nehmen und in welcher Reihenfolge sie ankommen.",
					baue: (f, w) => anlage(f, (ok, _, folge) => ok && w("Angekommen in der Reihenfolge " + folge + ". Die Pakete nehmen verschiedene Wege und überholen sich. Der Empfänger ordnet sie nach ihrer Nummer. Fehlt eine, bestellt er genau dieses Paket nach.")),
				},
				{
					ziel: "Jetzt fällt etwas aus: <b>Kapp eine Leitung</b>, über die Pakete liefen, und sende noch einmal.",
					baue: (f, w) => anlage(f, (ok, n) => {
						if (!ok) return api.sag("Nichts kommt an. Für diesen Auftrag sollst du nur stören, nicht abschneiden. Flick etwas und versuch es mit einer Leitung.", "fehler");
						if (!n) return api.sag("Alles heil, alles angekommen. Kapp erst eine Leitung.", "fehler");
						w("Die Nachricht kommt trotzdem an. Kein Knoten kennt den ganzen Weg. Jeder reicht nur an einen Nachbarn weiter, der noch näher am Ziel ist. Fällt ein Stück aus, geht es außen herum.");
					}),
				},
				{
					ziel: "Jetzt sabotierst du richtig: Schneide das Ziel ab, sodass <b>nichts</b> mehr ankommt. Mit wie wenigen Schnitten schaffst du es?",
					baue: (f, w) => anlage(f, (ok, n) => {
						if (ok) return api.sag("Kommt immer noch an. Es gibt noch einen Weg.", "fehler");
						if (n > 2) return api.sag("Abgeschnitten mit " + n + " Schnitten. Es geht mit weniger. Flick alles und such die engste Stelle im Netz.", "fehler");
						w("Zwei Schnitte direkt an einem Ende. Überall sonst gibt es mehr Auswege. Ein Netz ist so robust wie seine engste Stelle. Darum hängen wichtige Rechenzentren an vielen Leitungen zugleich.");
					}),
				},
			]);
		},
		blatt: {
			titel: "Viele Wege, kleine Pakete, keine Zentrale",
			text: "<p>Das Internet ist ein Graph wie in Baugruppe 12. Die Knoten heißen Router, die Kanten sind Kabel und Funkstrecken. Jeder Rechner hat eine Adresse, die IP-Adresse. Jedes Paket trägt Absender, Ziel und eine laufende Nummer.</p><p>Ein Router kennt nicht den ganzen Weg. Er hat nur eine Tabelle: Für dieses Ziel reiche ich an jenen Nachbarn weiter. Fällt eine Leitung aus, passen die Router ihre Tabellen an, und die Pakete laufen außen herum. Niemand muss das zentral steuern.</p><p>Dass Pakete verloren gehen oder sich überholen, ist einkalkuliert. Auf dem Empfängerrechner sortiert ein Programm sie nach Nummern, bestätigt den Empfang und fordert Fehlendes nach. Diese Abmachungen heißen Protokolle: IP für die Zustellung, TCP für Ordnung und Vollständigkeit. Mehr dazu in <a href=\"../internet/\">Verstehen: Das Internet</a>.</p>",
			formel: "Paket = Zieladresse + Absender + Nummer + ein Stück der Nachricht",
			merke: "Im Netz reisen kleine nummerierte Pakete von Knoten zu Knoten. Weil es viele Wege gibt, übersteht das Netz Ausfälle.",
		},
		quiz: {
			frage: "Paket 3 von 5 geht unterwegs verloren. Was passiert?",
			wahl: ["Die ganze Nachricht ist verloren", "Der Empfänger merkt an den Nummern, dass 3 fehlt, und fordert es nach", "Das Netz schickt automatisch alle fünf noch einmal"],
			richtig: 1,
			weil: "Dafür tragen die Pakete Nummern. Nur das fehlende wird neu geschickt.",
		},
	});

	/* ---------- U14 Verschlüsselung ---------- */
	const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const dreh = (text, k) => text.replace(/[A-Z]/g, (c) => ABC[(ABC.indexOf(c) + k + 26) % 26]);
	PL.stufen.push({
		id: "krypto", gruppe: "c", titel: "Verschlüsselung", kurz: "Nachrichten, die unterwegs jeder sehen darf",
		auftrag: "<p>Pakete laufen über fremde Knoten. Jeder davon kann mitlesen. Also muss die Nachricht so verändert werden, dass nur der Empfänger sie zurückverwandeln kann. Du spielst zuerst die Angreiferin oder den Angreifer.</p>",
		baue(api) {
			api.folge([
				{
					ziel: "Abgefangen: ein Text, bei dem jeder Buchstabe im Alphabet um gleich viele Plätze verschoben wurde. Dreh die Scheibe zurück, bis du den Klartext lesen kannst.",
					baue(feld, weiter) {
						const klar = "TREFFEN UM ACHT AM ALTEN TURM";
						const geheim = dreh(klar, 7);
						let k = 0;
						const aus = h("p", { class: "anzeige", style: "font-size:clamp(1rem,5vw,1.5rem)" });
						const zeig = (v) => {
							k = v;
							aus.replaceChildren(dreh(geheim, -k), h("small", { text: "abgefangen: " + geheim }));
						};
						feld.append(aus, PL.regler("Scheibe zurückdrehen", 0, 25, 1, 0, zeig, (v) => v + (v === 1 ? " Platz" : " Plätze")),
							h("div", { class: "reihe mitte" }, knopf("Das ist der Klartext", () => {
								if (k === 7) weiter("Geknackt. Es gibt nur 25 mögliche Schlüssel, die probiert man in einer Minute durch. Ein Verfahren ist nur so sicher wie die Zahl seiner Schlüssel groß ist.");
								else api.sag("Das ergibt noch keinen Sinn. Dreh weiter.", "fehler");
							})));
						zeig(0);
					},
				},
				{
					ziel: "Ein besseres Verfahren arbeitet auf Bits: Jedes Bit der Nachricht wird mit einem Schlüsselbit per <b>XOR</b> verknüpft (Baugruppe 3). Du hast fünf Bytes abgefangen und weißt: Der erste Buchstabe ist ein <b>A</b>, also 0100 0001. Stell den Schlüssel ein.",
					baue(feld, weiter) {
						const KEY = 0x5a;
						const geheim = "ALARM".split("").map((c) => c.charCodeAt(0) ^ KEY);
						let key = 0;
						const lg = Array.from({ length: 8 }, () => led("rot"));
						const le = Array.from({ length: 8 }, () => led("gruen"));
						const aus = h("p", { class: "anzeige" });
						function zeig() {
							const e = geheim[0] ^ key;
							lg.forEach((l, i) => l.an(geheim[0] & (128 >> i)));
							le.forEach((l, i) => l.an(e & (128 >> i)));
							const text = geheim.map((g) => {
								const c = g ^ key;
								return c >= 65 && c <= 90 ? String.fromCharCode(c) : "·";
							}).join("");
							aus.replaceChildren(text, h("small", { text: "erstes Byte entschlüsselt: " + e.toString(2).padStart(8, "0") + " · gesucht: 01000001" }));
							if (key === KEY) weiter("Der Schlüssel ist 0101 1010, und sofort liest du die ganze Nachricht: ALARM. XOR mit demselben Schlüssel macht die Verschlüsselung rückgängig. Zugleich siehst du die Schwäche: Wer ein Stück Klartext kennt, bekommt den Schlüssel geschenkt, wenn er sich wiederholt.");
						}
						const reihe = (name, teile) => [h("p", { class: "druck", style: "text-align:center;margin:10px 0 4px", text: name }), h("div", { class: "bitreihe" }, teile.map((x) => h("span", { class: "zelle" }, x)))];
						feld.append(
							reihe("Geheimtext, erstes Byte", lg),
							h("p", { class: "druck", style: "text-align:center;margin:10px 0 4px", text: "Dein Schlüssel" }),
							h("div", { class: "bitreihe" }, Array.from({ length: 8 }, (_, i) => schalter("", false, (an) => {
								key = an ? key | (128 >> i) : key & ~(128 >> i);
								zeig();
							}))),
							reihe("Geheimtext XOR Schlüssel", le), aus);
						feld.querySelectorAll(".dip").forEach((d, i) => d.setAttribute("aria-label", "Schlüsselbit " + (i + 1)));
						zeig();
					},
				},
			]);
		},
		blatt: {
			titel: "Sicher ist, was auch mit bekanntem Verfahren hält",
			text: "<p>Die Verschiebung heißt Cäsar-Chiffre. Sie ist unsicher, weil es nur 25 Schlüssel gibt. Wichtiger ist die Lehre dahinter: Ein gutes Verfahren darf jeder kennen. Geheim bleibt nur der Schlüssel, und es muss so viele davon geben, dass Durchprobieren aussichtslos ist. Ein heutiger Schlüssel hat 256 Bits. Aus Baugruppe 1 weißt du, was das heißt: 2 hoch 256 Muster, mehr als es Atome im sichtbaren Universum gibt.</p><p>XOR ist der Kern fast aller modernen Verfahren, weil es sich selbst umkehrt: zweimal derselbe Schlüssel ergibt wieder die Nachricht. Ist der Schlüssel zufällig, so lang wie die Nachricht und wird nur einmal benutzt, ist das Verfahren beweisbar unknackbar. Praktische Verfahren wie AES erzeugen aus einem kurzen Schlüssel einen langen, zufällig aussehenden Strom von Schlüsselbits.</p><p>Bleibt die Frage, wie zwei Fremde im Netz zu einem gemeinsamen Schlüssel kommen, wenn jeder mitliest. Dafür gibt es Schlüsselpaare: Mit dem öffentlichen Schlüssel kann jeder verschließen, öffnen kann nur der private. Darauf beruht das Schloss-Symbol im Browser.</p>",
			formel: "Geheim = Klar XOR Schlüssel · Klar = Geheim XOR Schlüssel · Schlüssel = Geheim XOR Klar",
			merke: "Das Verfahren darf bekannt sein, der Schlüssel nicht. Sicherheit kommt aus der Zahl der möglichen Schlüssel.",
		},
		quiz: {
			frage: "Ein Hersteller sagt: „Unser Verfahren ist sicher, weil niemand weiß, wie es funktioniert.“ Was ist davon zu halten?",
			wahl: ["Gut, Geheimhaltung ist der beste Schutz", "Wenig. Verfahren werden früher oder später bekannt. Sicher ist nur, was dann noch hält", "Egal, solange das Passwort lang ist"],
			richtig: 1,
			weil: "Das ist das Prinzip von Kerckhoffs: Die Sicherheit darf allein am Schlüssel hängen. Offene Verfahren wurden von Tausenden Fachleuten vergeblich angegriffen.",
		},
	});

	/* ---------- U15 Lernende Maschinen ---------- */
	PL.stufen.push({
		id: "lernen", gruppe: "c", titel: "Lernende Maschinen", kurz: "Ein Gatter, dem niemand die Regel einbaut",
		auftrag: "<p>In Baugruppe 3 hast du Gatter ausgesucht, deren Regel fest eingebaut war. Hier ist ein Baustein ohne feste Regel: ein künstliches Neuron. Es zählt seine Eingänge zusammen, jeden mit einem eigenen <b>Gewicht</b>. Ist die Summe mindestens so groß wie die <b>Schwelle</b>, gibt es 1 aus, sonst 0. Im Bild sind die vier möglichen Eingangsmuster die vier Punkte. Die helle Fläche zeigt, wo das Neuron 1 ausgibt.</p>",
		baue(api) {
			const MUSTER = [[0, 0], [0, 1], [1, 0], [1, 1]];
			function neuron(feld, soll, cfg) {
				const p = { w1: 0, w2: 0, s: 0.5 };
				const svg = s("svg", { viewBox: "0 0 220 220", class: "schaltung", role: "img", "aria-label": "Die vier Eingangsmuster als Punkte. Helle Fläche: Neuron gibt 1 aus.", style: "max-width:260px" });
				const X = (v) => 40 + v * 140, Y = (v) => 180 - v * 140;
				const felder = [];
				for (let i = 0; i < 22; i++) for (let j = 0; j < 22; j++) {
					const r = s("rect", { x: i * 10, y: j * 10, width: 10, height: 10, fill: "var(--gelb)", opacity: 0 });
					r.v = [(i * 10 + 5 - 40) / 140, (180 - j * 10 - 5) / 140];
					felder.push(r);
					svg.append(r);
				}
				svg.append(s("path", { d: `M${X(0)} ${Y(0)} H${X(1)} V${Y(1)} H${X(0)} Z`, fill: "none", stroke: "var(--leise)", "stroke-dasharray": "3 4" }),
					s("text", { class: "klein", x: 110, y: 214, "text-anchor": "middle", text: "Eingang 1 →" }),
					s("text", { class: "klein", x: 10, y: 110, "text-anchor": "middle", transform: "rotate(-90 10 110)", text: "Eingang 2 →" }));
				const punkte = MUSTER.map(([a, b]) => {
					const k = s("circle", { cx: X(a), cy: Y(b), r: 11, "stroke-width": 3 });
					svg.append(k, s("text", { class: "klein", x: X(a), y: Y(b) + (b ? -16 : 24), "text-anchor": "middle", text: a + "," + b }));
					return k;
				});
				const tab = h("table", { class: "tabelle" });
				const aus = (a, b) => (p.w1 * a + p.w2 * b >= p.s - 1e-9 ? 1 : 0);
				const fehler = () => MUSTER.filter(([a, b]) => aus(a, b) !== soll(a, b)).length;
				const r = {
					w1: PL.regler("Gewicht 1", -2, 2, 0.1, 0, (v) => ((p.w1 = v), zeig()), (v) => v.toFixed(1)),
					w2: PL.regler("Gewicht 2", -2, 2, 0.1, 0, (v) => ((p.w2 = v), zeig()), (v) => v.toFixed(1)),
					s: PL.regler("Schwelle", -1, 3, 0.1, 0.5, (v) => ((p.s = v), zeig()), (v) => v.toFixed(1)),
				};
				function zeig(jetzt) {
					felder.forEach((f) => f.setAttribute("opacity", aus(f.v[0], f.v[1]) ? 0.3 : 0));
					punkte.forEach((k, i) => {
						const [a, b] = MUSTER[i];
						k.setAttribute("fill", soll(a, b) ? "var(--gruen)" : "var(--chip)");
						k.setAttribute("stroke", aus(a, b) === soll(a, b) ? "var(--druck)" : "var(--rot)");
					});
					tab.replaceChildren(h("tr", null, ["E1", "E2", "Summe", "soll", "ist"].map((t) => h("th", { text: t }))),
						...MUSTER.map(([a, b], i) => h("tr", { class: i === jetzt ? "jetzt" : "" }, h("td", { text: a }), h("td", { text: b }),
							h("td", { text: (p.w1 * a + p.w2 * b).toFixed(1) }), h("td", { text: soll(a, b) }),
							h("td", { class: aus(a, b) === soll(a, b) ? "gut" : "schlecht", text: aus(a, b) }))));
				}
				function lerne(maxSchritte, ende) {
					let i = 0, ruhe = 0;
					Object.assign(p, { w1: 0, w2: 0, s: 0 });
					const uhr = api.takt(() => {
						const [a, b] = MUSTER[i % 4];
						const f = soll(a, b) - aus(a, b);
						if (f) {
							p.w1 = Math.round((p.w1 + 0.2 * f * a) * 10) / 10;
							p.w2 = Math.round((p.w2 + 0.2 * f * b) * 10) / 10;
							p.s = Math.round((p.s - 0.2 * f) * 10) / 10;
							ruhe = 0;
							api.sag("Muster " + a + "," + b + ": falsch. Ausgabe war zu " + (f > 0 ? "niedrig: Gewichte rauf, Schwelle runter." : "hoch: Gewichte runter, Schwelle rauf."), "info");
						} else ruhe++;
						r.w1.setze(p.w1);
						r.w2.setze(p.w2);
						r.s.setze(p.s);
						zeig(i % 4);
						i++;
						if (ruhe >= 4 || i >= maxSchritte) {
							api.stopp(uhr);
							zeig();
							ende(ruhe >= 4, i);
						}
					}, PL.ruhig ? 60 : 330);
				}
				feld.append(h("div", { class: "spalten" }, svg, h("div", null, cfg.hand ? [r.w1, r.w2, r.s] : null, tab)));
				if (!cfg.hand) feld.append(h("div", { class: "kasten" }, r.w1, r.w2, r.s));
				zeig();
				return { fehler, lerne };
			}
			api.folge([
				{
					ziel: "Stell Gewichte und Schwelle von Hand so ein, dass sich das Neuron wie ein <b>UND</b>-Gatter verhält: 1 nur bei 1,1.",
					baue(feld, weiter) {
						const n = neuron(feld, (a, b) => a & b, { hand: true });
						feld.append(h("div", { class: "reihe mitte" }, knopf("Abnahmetest starten", () => {
							if (!n.fehler()) weiter("Derselbe Baustein, andere Zahlen, anderes Verhalten. Die Regel steckt nicht mehr in der Schaltung, sondern in drei Zahlen.");
							else api.sag(n.fehler() + " von 4 Mustern stimmen nicht. Rot umrandete Punkte liegen auf der falschen Seite.", "fehler");
						})));
					},
				},
				{
					ziel: "Jetzt soll es ein <b>ODER</b> werden, aber du stellst nichts ein. Die Maschine bekommt nur die vier Beispiele gezeigt und korrigiert sich bei jedem Fehler ein kleines Stück.",
					baue(feld, weiter) {
						const n = neuron(feld, (a, b) => a | b, {});
						const k = knopf("Lernen lassen", () => {
							k.disabled = true;
							n.lerne(80, (ok, i) => weiter("Nach " + i + " gezeigten Beispielen macht das Neuron keinen Fehler mehr. Niemand hat ihm die Regel gesagt. Es hat nur bei jedem Fehler die Zahlen ein wenig in die richtige Richtung geschoben."));
						});
						feld.append(h("div", { class: "reihe mitte" }, k));
					},
				},
				{
					ziel: "Letzter Versuch: <b>XOR</b>, das Treppenlicht aus Baugruppe 3. Lass die Maschine lernen.",
					baue(feld, weiter) {
						const n = neuron(feld, (a, b) => a ^ b, {});
						const k = knopf("Lernen lassen", () => {
							k.disabled = true;
							n.lerne(48, (ok, i) => weiter("Nach " + i + " Beispielen immer noch Fehler, und es würde ewig so weitergehen. Ein einzelnes Neuron trennt die Fläche mit einer geraden Linie. Bei XOR liegen die grünen Punkte über Kreuz, keine Gerade trennt sie. Die Lösung: mehrere Neuronen hintereinander."));
						});
						feld.append(h("div", { class: "reihe mitte" }, k));
					},
				},
			]);
		},
		blatt: {
			titel: "Programmieren durch Beispiele statt durch Regeln",
			text: "<p>Alles bis hierher folgte demselben Muster: Ein Mensch denkt sich die Regel aus und baut sie ein, als Gatter oder als Programm. Beim maschinellen Lernen kehrt sich das um. Der Mensch liefert Beispiele mit den richtigen Antworten. Die Maschine verstellt ihre Gewichte so lange, bis ihre Antworten passen.</p><p>Das einzelne Neuron heißt Perzeptron. Seine Grenze hast du gesehen: Es kann nur trennen, was sich mit einer geraden Linie trennen lässt. Schaltet man Neuronen in Schichten hintereinander, verschwindet diese Grenze. Zwei Neuronen ziehen je eine Linie, ein drittes verknüpft beide, und XOR ist gelöst. So entsteht ein neuronales Netz.</p><p>Heutige Sprachmodelle haben Milliarden solcher Gewichte. Das Prinzip ist dasselbe wie eben: Beispiel zeigen, Fehler messen, alle Gewichte ein kleines Stück in die richtige Richtung schieben. Und unter allem liegen weiterhin die Bausteine dieser Platine: Bits, Gatter, Addierer, Speicher, ein Prozessor, der Befehle abholt. Wie es weitergeht, zeigen die <a href=\"../ml/\">20 ML-Algorithmen</a> und <a href=\"../ki/\">Verstehen: KI</a>.</p>",
			formel: "Ausgabe = 1, wenn Gewicht 1 · E1 + Gewicht 2 · E2 ≥ Schwelle · Lernen: Gewicht neu = Gewicht alt + Schrittweite · Fehler · Eingang",
			merke: "Eine lernende Maschine bekommt Beispiele statt Regeln. Sie verstellt ihre Gewichte, bis ihre Fehler verschwinden.",
		},
		quiz: {
			frage: "Warum scheitert ein einzelnes Neuron an XOR?",
			wahl: ["Es bekommt zu wenige Beispiele gezeigt", "Es kann nur mit einer geraden Linie trennen, und die XOR-Punkte liegen über Kreuz", "XOR ist kein richtiges Gatter"],
			richtig: 1,
			weil: "Mehr Beispiele oder mehr Zeit helfen nicht. Erst eine zweite Schicht macht die Aufgabe lösbar.",
		},
	});
})();
