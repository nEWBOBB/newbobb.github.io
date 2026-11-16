// Der Baukasten, Stufen 1 bis 6: Stoffe, Atome, Periodensystem, Ionen, Elektronenpaare, Molekülformen.
(() => {
	"use strict";
	const { h, sv, f, E, REIHE, RUHIG, komma, kugel, ball, knopf, regler, wahl, zaehler, stecker } = window.CH;
	const TINTE = "#17150f";

	// feste Streupunkte, damit das Bild bei jedem Zeichnen gleich aussieht
	const streu = (n, x0, x1, y0, y1, saat) => {
		const p = [];
		let s = saat;
		const z = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
		for (let i = 0; i < n; i++) p.push([x0 + z() * (x1 - x0), y0 + z() * (y1 - y0)]);
		return p;
	};

	// ---------- 1 · Stoffe und Gemische ----------
	const stoffe = {
		g: 1, titel: "Stoffe und Gemische", kachel: "Stoffe und Gemische",
		frage: "Im Becher liegt ein Durcheinander: Sand, Eisenspäne und Salz in Wasser. Bekommst du alle vier Stoffe wieder einzeln heraus, ohne einen davon zu verändern?",
		bau(api) {
			let ort;
			const auf = api.auftraege(["Hol das <b>Eisen</b> rein heraus.", "Hol den <b>Sand</b> rein heraus.", "Gewinne das <b>Salz</b> zurück, ohne Sand daran.", "Fang auch das <b>Wasser</b> wieder auf."],
				"Vier Stoffe, vier Eigenschaften, und keine einzige Reaktion: Du hast nur sortiert.");
			const svg = sv("svg", { viewBox: "0 0 340 200", class: "bild", role: "img", "aria-label": "Becher, Filter, Magnetschale und Auffangkolben" });
			const marken = h("ul", { class: "marken" });
			const NAMEN = { eisen: "Eisen", sand: "Sand", salz: "Salz", wasser: "Wasser" };
			const rein = () => ({
				eisen: ort.eisen === "schale",
				sand: ort.sand === "filter" && ort.eisen !== "filter",
				salz: ort.wasser !== "becher" && ort.sand !== "becher" && ort.eisen !== "becher",
				wasser: ort.wasser === "kolben",
			});
			const punkte = (liste, farbe, r, eckig) => liste.map(([x, y]) => eckig
				? sv("rect", { x: x - r, y: y - r, width: r * 2, height: r * 2, fill: farbe, stroke: TINTE, "stroke-width": 1 })
				: sv("circle", { cx: x, cy: y, r, fill: farbe, stroke: TINTE, "stroke-width": 0.8 }));
			const schrift = (x, y, t, cls = "bild-klein") => sv("text", { x, y, "text-anchor": "middle", class: cls, text: t });

			function male() {
				const nass = ort.wasser === "becher";
				svg.replaceChildren(...[
					// Becher
					nass ? sv("rect", { x: 22, y: 78, width: 76, height: 80, fill: "#a9d0f2" }) : null,
					sv("path", { d: "M20 50 V160 H100 V50", fill: "none", stroke: TINTE, "stroke-width": 3, "stroke-linejoin": "round" }),
					ort.sand === "becher" ? punkte(streu(22, 27, 93, 142, 155, 7), "#d9a441", 3) : null,
					ort.eisen === "becher" ? punkte(streu(12, 27, 93, 136, 155, 3), "#4a4a52", 2.6, true) : null,
					!nass ? punkte(streu(14, 30, 90, 148, 155, 11), "#fff", 2.4, true) : null,
					schrift(60, 180, "Becher"),
					nass ? schrift(60, 112, "Salz ist gelöst", "bild-mini") : null,
					nass ? schrift(60, 124, "und unsichtbar", "bild-mini") : null,
					ort.wasser === "luft" ? schrift(60, 34, "Dampf entweicht") : null,
					// Filter
					sv("path", { d: "M118 70 H182 L154 118 V150 H146 V118 Z", fill: "#fff", stroke: TINTE, "stroke-width": 3, "stroke-linejoin": "round" }),
					ort.sand === "filter" ? punkte(streu(22, 130, 170, 76, 90, 5), "#d9a441", 3) : null,
					ort.eisen === "filter" ? punkte(streu(12, 130, 170, 76, 92, 9), "#4a4a52", 2.6, true) : null,
					schrift(150, 180, "Filter"),
					// Magnetschale
					sv("path", { d: "M204 130 Q235 168 266 130 Z", fill: "#fff", stroke: TINTE, "stroke-width": 3, "stroke-linejoin": "round" }),
					sv("rect", { x: 213, y: 54, width: 22, height: 34, fill: "#dd3220", stroke: TINTE, "stroke-width": 2.5 }),
					sv("rect", { x: 235, y: 54, width: 22, height: 34, fill: "#2449c9", stroke: TINTE, "stroke-width": 2.5 }),
					ort.eisen === "schale" ? punkte(streu(12, 218, 252, 132, 142, 4), "#4a4a52", 2.6, true) : null,
					schrift(235, 180, "Magnet"),
					// Kolben
					ort.wasser === "kolben" ? sv("path", { d: "M288 150 L282 160 H328 L322 150 Z", fill: "#a9d0f2" }) : null,
					ort.wasser === "kolben" ? sv("rect", { x: 284, y: 138, width: 42, height: 22, fill: "#a9d0f2" }) : null,
					sv("path", { d: "M298 70 V108 L280 160 H330 L312 108 V70", fill: "none", stroke: TINTE, "stroke-width": 3, "stroke-linejoin": "round" }),
					schrift(305, 180, "Kolben")].flat().filter(Boolean));
				const r = rein();
				marken.replaceChildren(...Object.keys(NAMEN).map((k) => h("li", { class: r[k] ? "gut" : "", text: `${NAMEN[k]}: ${r[k] ? "rein" : "noch nicht"}` })));
				["eisen", "sand", "salz", "wasser"].forEach((k, i) => { if (r[k]) auf.ab(i); });
			}
			const misch = () => { ort = { eisen: "becher", sand: "becher", salz: "becher", wasser: "becher" }; api.sag(""); male(); };
			const tu = (fn) => () => { api.sag(fn() || ""); male(); };
			api.feld.append(svg, marken, h("div", { class: "knopf-reihe" },
				knopf("Magnet drüberhalten", tu(() => {
					if (ort.eisen === "schale") return "Am Magnet hängt schon alles Eisen.";
					ort.eisen = "schale";
					return "Die Späne springen an den Magnet. Sand und Salz lässt er kalt: Nur Eisen ist magnetisch.";
				})),
				knopf("Filtern", tu(() => {
					if (ort.wasser !== "becher") return "Ohne Flüssigkeit läuft nichts durch den Filter.";
					if (ort.sand !== "becher" && ort.eisen !== "becher") return "Im Becher schwimmt nichts Festes mehr. Das gelöste Salz läuft durch jeden Filter.";
					const beides = ort.sand === "becher" && ort.eisen === "becher";
					if (ort.sand === "becher") ort.sand = "filter";
					if (ort.eisen === "becher") ort.eisen = "filter";
					return beides ? "Sand und Eisen bleiben zusammen im Filter hängen. Das Salzwasser läuft durch: Gelöste Teilchen sind viel kleiner als die Poren." : "Die Körner bleiben im Filter. Das Salzwasser läuft durch, denn gelöste Teilchen sind viel kleiner als die Poren.";
				})),
				knopf("Eindampfen", tu(() => {
					if (ort.wasser !== "becher") return "Der Becher ist schon trocken.";
					ort.wasser = "luft";
					return ort.sand === "becher" || ort.eisen === "becher" ? "Das Wasser ist verdampft. Das Salz klebt jetzt als Kruste an allem, was noch im Becher lag." : "Das Wasser verdampft bei 100 °C, das Salz erst bei 1465 °C. Es bleibt als weiße Kristalle zurück. Das Wasser ist allerdings in die Luft entwischt.";
				})),
				knopf("Destillieren", tu(() => {
					if (ort.wasser !== "becher") return "Im Becher ist kein Wasser mehr.";
					ort.wasser = "kolben";
					return "Der Dampf wird durch ein kaltes Rohr geleitet, wird dort wieder flüssig und tropft in den Kolben. Was fest war, bleibt im Becher.";
				})),
				knopf("Wasser zurückgießen", tu(() => {
					if (ort.wasser === "becher") return "Der Becher ist schon voll.";
					ort.wasser = "becher";
					return "Das Salz löst sich wieder auf und verschwindet vor deinen Augen.";
				})),
				knopf("Neu mischen", misch, "leise")));
			misch();
		},
		warum: `<p>Ein <b>Reinstoff</b> besteht aus nur einer Sorte Teilchen und hat feste Eigenschaften: Wasser siedet bei 100 °C, Eisen ist magnetisch, Salz löst sich in Wasser, Sand nicht. Ein <b>Gemisch</b> ist ein Durcheinander aus mehreren Reinstoffen, in dem jeder seine Eigenschaften behält.</p>
			<p>Genau das nutzt jedes Trennverfahren aus. Der Magnet greift nach dem einen Stoff, der magnetisch ist. Der Filter hält zurück, was größer ist als seine Poren. Beim Destillieren geht, was zuerst siedet. Dabei entsteht nichts Neues. Du sortierst nur.</p>
			<p>Das unterscheidet Trennen von einer <b>Reaktion</b>. Wenn Eisen rostet, ist danach kein Eisen mehr da, das ein Magnet herausholen könnte. Ab Stufe 4 baust du solche neuen Stoffe.</p>`,
		merke: "Gemische trennt man über Unterschiede in den Eigenschaften. Die Stoffe selbst bleiben dabei, was sie sind.",
		quiz: {
			f: "Meerwasser ist klar. Warum bekommst du das Salz mit einem Kaffeefilter trotzdem nicht heraus?",
			a: ["Weil sich Salz und Wasser zu einem neuen Stoff verbunden haben.", "Weil die gelösten Salzteilchen einzeln im Wasser schwimmen und viel kleiner sind als die Poren.", "Weil Salz leichter ist als Wasser und oben schwimmt."],
			r: 1,
			w: "Gelöst heißt: einzeln verteilt, zu klein für jeden Filter. Trennen kannst du über den Siedepunkt.",
		},
	};

	// ---------- 2 · Atommodell ----------
	const STABIL = [[], [1, 2], [3, 4], [6, 7], [9], [10, 11], [12, 13], [14, 15], [16, 17, 18], [19], [20, 21, 22], [23], [24, 25, 26], [27], [28, 29, 30], [31], [32, 33, 34, 36], [35, 37], [36, 38, 40]];
	const atom = {
		g: 1, titel: "Das Atom", kachel: "Das Atom",
		frage: "Jedes Atom besteht aus nur drei Sorten Teilchen. Welche davon entscheidet, ob du Gold oder Sauerstoff in der Hand hast?",
		bau(api) {
			const auf = api.auftraege(["Baue <b>Helium-4</b>: 2 Protonen, 2 Neutronen, 2 Elektronen.", "Baue <b>Kohlenstoff-14</b>. Damit bestimmt man das Alter von Knochen.", "Baue ein <b>Natrium-Ion</b> mit der Ladung 1+.", "Baue ein neutrales, stabiles Atom mit <b>8 Protonen</b>."],
				"Die Protonen legen das Element fest, die Neutronen das Gewicht, die Elektronen die Ladung.");
			const svg = sv("svg", { viewBox: "0 0 300 250", class: "bild", role: "img" });
			const ab = h("p", { class: "ablese", "aria-live": "polite" });
			const male = () => {
				const p = zp.wert(), n = zn.wert(), e = ze.wert();
				const teile = [];
				[52, 80, 108].forEach((r) => teile.push(sv("circle", { cx: 150, cy: 125, r, fill: "none", stroke: TINTE, "stroke-width": 1.2, "stroke-dasharray": "3 5" })));
				// Kern: Protonen und Neutronen abwechselnd auf einer Spirale
				const kern = [];
				for (let i = 0, a = 0, b = 0; i < p + n; i++) {
					const proton = (a < p && (i % 2 === 0 || b >= n));
					proton ? a++ : b++;
					kern.push(proton);
				}
				kern.forEach((proton, i) => {
					const r = 5.4 * Math.sqrt(i), w = i * 2.4;
					teile.push(sv("circle", { cx: 150 + Math.cos(w) * r, cy: 125 + Math.sin(w) * r, r: 5, fill: proton ? "#dd3220" : "#b9bcb6", stroke: TINTE, "stroke-width": 1.2 }));
				});
				let rest = e;
				[[2, 52], [8, 80], [8, 108]].forEach(([platz, r], s) => {
					const k = Math.min(platz, rest);
					rest -= k;
					for (let i = 0; i < k; i++) {
						const w = -Math.PI / 2 + (i * 2 * Math.PI) / platz + s * 0.2;
						teile.push(sv("circle", { cx: 150 + Math.cos(w) * r, cy: 125 + Math.sin(w) * r, r: 5, fill: "#2449c9", stroke: TINTE, "stroke-width": 1.2 }));
					}
				});
				svg.replaceChildren(...teile);
				const sym = REIHE[p - 1], masse = p + n, lad = p - e;
				const ladung = lad === 0 ? "" : (Math.abs(lad) > 1 ? Math.abs(lad) : "") + (lad > 0 ? "+" : "−");
				const stabil = STABIL[p].includes(masse);
				svg.setAttribute("aria-label", `${E[sym][0]} mit ${p} Protonen, ${n} Neutronen und ${e} Elektronen`);
				ab.innerHTML = `<b>${E[sym][0]}-${masse}</b> <span class="iso"><sup>${masse}</sup>${sym}<sup>${ladung}</sup></span> · ${lad === 0 ? "neutral" : `Ion, Ladung ${ladung}`} · Kern ${stabil ? '<span class="gut">stabil</span>' : '<span class="warn">zerfällt (radioaktiv)</span>'}`;
				if (p === 2 && n === 2 && e === 2) auf.ab(0);
				if (p === 6 && n === 8) auf.ab(1);
				if (p === 11 && e === 10) auf.ab(2);
				if (p === 8 && e === 8 && stabil) auf.ab(3);
			};
			const zp = zaehler('<i class="pkt" style="--k:#dd3220"></i>Protonen', 1, 1, 18, male);
			const zn = zaehler('<i class="pkt" style="--k:#b9bcb6"></i>Neutronen', 0, 0, 22, male);
			const ze = zaehler('<i class="pkt" style="--k:#2449c9"></i>Elektronen', 1, 0, 18, male);
			api.feld.append(svg, ab, h("div", { class: "zaehler-reihe" }, zp.el, zn.el, ze.el),
				h("p", { class: "hinweis", text: "Die Schalen fassen 2, 8 und 8 Elektronen. Der Kern ist hier riesig gezeichnet: In echt wäre er ein Stecknadelkopf in einem Fußballstadion." }));
			male();
		},
		warum: `<p>Im <b>Kern</b> sitzen Protonen (positiv geladen) und Neutronen (ungeladen). Um ihn herum halten sich die <b>Elektronen</b> auf (negativ geladen), geordnet in Schalen.</p>
			<p>Die <b>Protonenzahl</b> ist der Ausweis des Atoms: 6 Protonen sind immer Kohlenstoff, 8 immer Sauerstoff. Änderst du sie, hast du ein anderes Element. Die <b>Neutronen</b> machen das Atom nur schwerer. Atome desselben Elements mit verschieden vielen Neutronen heißen Isotope. Manche davon zerfallen, zum Beispiel Kohlenstoff-14.</p>
			<p>Gleich viele Elektronen wie Protonen: Das Atom ist neutral. Fehlt eines oder ist eines zu viel, hast du ein geladenes <b>Ion</b>. Für die Chemie zählt fast nur die <b>äußerste Schale</b>. Mit ihr fasst ein Atom andere an.</p>`,
		formel: "Massenzahl = Protonen + Neutronen &nbsp;·&nbsp; Ladung = Protonen − Elektronen",
		merke: "Protonen bestimmen das Element, Neutronen das Isotop, Elektronen die Ladung und die ganze Chemie.",
		mehr: 'Mehr zum Kern: <a href="../atom/">Verstehen: Atom</a>.',
		quiz: {
			f: "Ein Teilchen hat 17 Protonen, 18 Neutronen und 18 Elektronen. Was ist es?",
			a: ["Ein neutrales Argon-Atom, denn 18 Elektronen sind Argon.", "Ein Chlor-Ion mit der Ladung 1−.", "Ein Chlor-Atom mit der Masse 18."],
			r: 1,
			w: "17 Protonen sind Chlor, egal was sonst passiert. Ein Elektron mehr als Protonen ergibt die Ladung 1−.",
		},
	};

	// ---------- 3 · Periodensystem ----------
	const RADIUS = [31, 28, 128, 96, 84, 76, 71, 66, 57, 58, 166, 141, 121, 111, 107, 105, 102, 106, 203, 176];
	const ART = { Li: "m", Be: "m", Na: "m", Mg: "m", Al: "m", K: "m", Ca: "m", B: "h", Si: "h", He: "e", Ne: "e", Ar: "e" };
	const ARTNAME = { m: "Metall", h: "Halbmetall", e: "Edelgas", n: "Nichtmetall" };
	const pse = {
		g: 1, titel: "Das Perioden­system", kachel: "Perioden­system",
		frage: "Mendelejew ließ 1869 Lücken in seiner Tabelle und sagte voraus, wie die fehlenden Elemente sein müssten. Er behielt recht. Schaffst du das auch?",
		bau(api) {
			const auf = api.auftraege(["Lege die drei Karten in die richtigen <b>Lücken</b>.", "Schalte auf <b>Größe</b> um. Wo sitzen die dicksten Atome?"],
				"Du hast drei Elemente nur aus dem Muster ihrer Nachbarn erkannt. Genau dafür ist das Periodensystem da.");
			const LUECKEN = { F: 0, Na: 0, Ar: 0 };
			const KARTEN = [
				["Ar", "Farbloses Gas, reagiert mit nichts. Drei Schalen, die äußere ist voll."],
				["Na", "Weiches Metall, zischt in Wasser. Drei Schalen, außen ein einzelnes Elektron."],
				["F", "Giftiges Gas, entreißt fast jedem Stoff ein Elektron. Zwei Schalen, außen sieben Elektronen."],
			];
			let karte = null, sicht = "aussen";
			const gitter = h("div", { class: "pse" });
			const stapel = h("div", { class: "pse-karten" });
			const lage = (z) => {
				const schalen = z <= 2 ? 1 : z <= 10 ? 2 : z <= 18 ? 3 : 4;
				const aussen = z - [0, 2, 10, 18][schalen - 1];
				return { schalen, aussen, spalte: z === 2 ? 8 : aussen };
			};
			function male() {
				gitter.dataset.sicht = sicht;
				gitter.replaceChildren(...REIHE.map((sym, i) => {
					const z = i + 1, l = lage(z), offen = sym in LUECKEN && !LUECKEN[sym];
					const art = ART[sym] || "n";
					const b = h("button", {
						type: "button", class: "pse-zelle" + (offen ? " luecke" : ""), style: `grid-row:${l.schalen};grid-column:${l.spalte}`, "data-art": offen ? "" : art,
						"aria-label": offen ? `Lücke in Reihe ${l.schalen}, Spalte ${l.spalte}` : `${E[sym][0]}, Nummer ${z}`,
						onclick: () => {
							if (!offen) return api.sag(`<b>${E[sym][0]}</b> · Nr. ${z} · ${l.schalen} ${l.schalen === 1 ? "Schale" : "Schalen"} · ${l.aussen} Außenelektron${l.aussen === 1 ? "" : "en"} · Radius ${RADIUS[i]} pm · ${ARTNAME[art]}`);
							if (!karte) return api.sag("Wähle erst unten eine Karte aus.", "warn");
							if (karte === sym) {
								LUECKEN[sym] = 1; karte = null;
								api.sag(`Passt. ${E[sym][0]} hat ${l.schalen} Schalen (Reihe ${l.schalen}) und ${l.aussen} Außenelektron${l.aussen === 1 ? "" : "en"} (Spalte ${l.spalte}).`);
								if (Object.values(LUECKEN).every(Boolean)) auf.ab(0);
							} else api.sag(`Passt nicht. In dieser Lücke steht ein Element mit ${l.schalen} Schalen und ${l.aussen} Außenelektronen. Lies die Karte noch einmal.`, "warn");
							male();
						},
					}, h("span", { class: "pse-z", text: z }));
					if (offen) b.appendChild(h("span", { class: "pse-sym", text: "?" }));
					else if (sicht === "groesse") b.appendChild(h("span", { class: "pse-ball", style: `--d:${RADIUS[i] / 203}` }));
					else b.appendChild(h("span", { class: "pse-sym", text: sym }));
					if (!offen && sicht === "aussen") b.appendChild(h("span", { class: "pse-e", "aria-hidden": "true" }, Array.from({ length: l.aussen }, () => h("i"))));
					return b;
				}));
				stapel.replaceChildren(...KARTEN.filter(([s]) => !LUECKEN[s]).map(([s, t], n) => h("button", {
					type: "button", class: "pse-karte", "aria-pressed": String(karte === s), html: `<b>Karte ${"ABC"[KARTEN.findIndex((k) => k[0] === s)]}</b>${t}`,
					onclick: () => { karte = karte === s ? null : s; male(); },
				})));
			}
			const sw = wahl("Zeige", [["aussen", "Außenelektronen"], ["groesse", "Größe"], ["art", "Art"]], sicht, (w) => {
				sicht = w;
				if (w === "groesse") { auf.ab(1); api.sag("Nach unten kommt jedes Mal eine Schale dazu: Die Atome werden größer. Nach rechts zieht der stärkere Kern die Schale enger: Sie schrumpfen."); }
				if (w === "art") api.sag("Grün sind Metalle, gelb Halbmetalle, rot Nichtmetalle, blau Edelgase. Die Metalle sitzen links.");
				male();
			});
			api.feld.append(sw.el, gitter, stapel, h("p", { class: "hinweis", text: "Tippe eine Karte an und dann die Lücke, in die sie gehört. Ein Tipp auf ein anderes Feld zeigt dessen Steckbrief." }));
			male();
		},
		warum: `<p>Die Elemente sind nach der <b>Protonenzahl</b> durchnummeriert. Der Trick der Tabelle: Immer wenn eine Schale voll ist, beginnt eine neue Zeile.</p>
			<p>So landen Atome mit <b>gleich vielen Außenelektronen</b> untereinander, und weil die Außenelektronen die Chemie machen, verhalten sie sich ähnlich. Ganz links stehen weiche Metalle, die ihr einzelnes Außenelektron loswerden wollen (Lithium, Natrium, Kalium). In der vorletzten Spalte stehen die Elemente, denen genau eines fehlt (Fluor, Chlor). Ganz rechts stehen die <b>Edelgase</b> mit voller Außenschale. Sie brauchen nichts und reagieren mit fast nichts.</p>
			<p>Die <b>Zeile</b> sagt dir, wie viele Schalen ein Atom hat. Die <b>Spalte</b> sagt dir, wie viele Elektronen außen sitzen. Aus beidem kannst du vorhersagen, wie sich ein Element benimmt, auch wenn du es nie gesehen hast.</p>`,
		merke: "Gleiche Spalte, gleich viele Außenelektronen, ähnliches Verhalten. Volle Außenschale heißt: zufrieden.",
		quiz: {
			f: "Kalium steht direkt unter Natrium. Was sagt dir das, ohne dass du Kalium je gesehen hast?",
			a: ["Es ist ein Gas wie die Elemente daneben.", "Es hat außen ein Elektron, ist ein weiches Metall und reagiert heftig mit Wasser.", "Es hat genauso viele Protonen wie Natrium."],
			r: 1,
			w: "Gleiche Spalte, gleiches Außenelektron. Kalium reagiert sogar noch heftiger, weil das Elektron weiter vom Kern entfernt sitzt.",
		},
	};

	// ---------- 4 · Ionenbindung ----------
	const METALL = { Li: 1, Na: 1, K: 1, Mg: 2, Ca: 2, Al: 3 };
	const NICHT = { F: 7, Cl: 7, O: 6, S: 6 };
	const ENDE = { F: "fluorid", Cl: "chlorid", O: "oxid", S: "sulfid" };
	const BEKANNT = { NaCl: "Kochsalz", CaF2: "Flussspat", Al2O3: "daraus bestehen Rubin und Saphir", CaO: "Branntkalk", KCl: "steckt in Diätsalz" };
	const ionen = {
		g: 2, titel: "Die Ionenbindung", kachel: "Ionen­bindung",
		frage: "Natrium ist ein Metall, das in Wasser explodiert. Chlor ist ein Giftgas. Zusammen streust du sie aufs Frühstücksei. Was passiert zwischen den beiden?",
		bau(api) {
			const auf = api.auftraege(["Baue <b>Kochsalz</b> aus Natrium und Chlor.", "Baue ein Salz aus <b>Magnesium und Chlor</b>, bei dem kein Elektron übrig bleibt.", "Baue ein Salz aus <b>Aluminium und Sauerstoff</b>."],
				"Jedes Mal ging die Rechnung genau auf: So viele Elektronen, wie die Metalle abgeben, nehmen die Nichtmetalle auf.");
			const svg = sv("svg", { viewBox: "0 0 340 210", class: "bild", role: "img" });
			const ab = h("p", { class: "ablese", "aria-live": "polite" });
			const ggt = (a, b) => (b ? ggt(b, a % b) : a);
			function male() {
				const m = wm.wert(), x = wx.wert(), nm = zm.wert(), nx = zx.wert(), nach = sicht.wert() === "nach";
				const gibt = METALL[m], braucht = 8 - NICHT[x];
				const D = gibt * nm, N = braucht * nx;
				let fluss = nach ? Math.min(D, N) : 0, rest = fluss;
				const teile = [];
				const atomBild = (sym, cx, cy, aussen, ladung, luecken) => {
					teile.push(sv("circle", { cx, cy, r: 31, fill: "none", stroke: TINTE, "stroke-width": 1.2, "stroke-dasharray": "3 4" }));
					for (let i = 0; i < 8; i++) {
						const w = -Math.PI / 2 + (i * Math.PI) / 4, ex = cx + Math.cos(w) * 31, ey = cy + Math.sin(w) * 31;
						if (i < aussen) teile.push(sv("circle", { cx: ex, cy: ey, r: 4.4, fill: "#2449c9", stroke: TINTE, "stroke-width": 1.2 }));
						else if (luecken) teile.push(sv("circle", { cx: ex, cy: ey, r: 4, fill: "#fff", stroke: "#dd3220", "stroke-width": 1.6 }));
					}
					teile.push(ball(sym, cx, cy, 19));
					if (ladung) teile.push(sv("text", { x: cx + 27, y: cy - 27, class: "bild-ladung", "text-anchor": "middle", text: ladung }));
				};
				for (let i = 0; i < nm; i++) {
					const ab_ = Math.min(gibt, rest);
					rest -= ab_;
					atomBild(m, 170 + (i - (nm - 1) / 2) * 80, 52, gibt - ab_, ab_ ? (ab_ > 1 ? ab_ : "") + "+" : "", false);
				}
				rest = fluss;
				for (let i = 0; i < nx; i++) {
					const an = Math.min(braucht, rest);
					rest -= an;
					atomBild(x, 170 + (i - (nx - 1) / 2) * 80, 152, NICHT[x] + an, an ? (an > 1 ? an : "") + "−" : "", true);
				}
				svg.replaceChildren(...teile);
				if (!nm || !nx) { ab.innerHTML = "Leg von beiden Sorten mindestens ein Atom auf den Tisch."; return; }
				if (!nach) { ab.innerHTML = `${E[m][0]} hat außen ${gibt} Elektron${gibt > 1 ? "en" : ""}. ${E[x][0]} fehl${braucht > 1 ? "en" : "t"} ${braucht} zur vollen Achterschale. Schalte auf „Nachher“.`; return; }
				if (D > N) ab.innerHTML = `<span class="warn">${D - N} Elektron${D - N > 1 ? "en finden" : " findet"} keinen Platz.</span> Es fehlt ein Abnehmer.`;
				else if (D < N) ab.innerHTML = `<span class="warn">Bei ${E[x][0]} ${N - D > 1 ? `bleiben ${N - D} Lücken` : "bleibt 1 Lücke"} offen.</span> Es fehlt ein Spender.`;
				else {
					const t = ggt(nm, nx), a = nm / t, b = nx / t;
					const formel = m + (a > 1 ? a : "") + x + (b > 1 ? b : "");
					ab.innerHTML = `<span class="gut">Geht auf.</span> <b>${f(formel)}</b> · ${E[m][0]}${ENDE[x]}${BEKANNT[formel] ? ` · ${BEKANNT[formel]}` : ""}`;
					if (formel === "NaCl") auf.ab(0);
					if (formel === "MgCl2") auf.ab(1);
					if (formel === "Al2O3") auf.ab(2);
				}
				svg.setAttribute("aria-label", `${nm} ${E[m][0]} und ${nx} ${E[x][0]}, ${nach ? "nach der Übergabe" : "vor der Übergabe"}`);
			}
			const wm = wahl("Metall", Object.keys(METALL).map((s) => [s, s]), "Na", male);
			const wx = wahl("Nichtmetall", Object.keys(NICHT).map((s) => [s, s]), "Cl", male);
			const zm = zaehler("Metall-Atome", 1, 0, 4, male);
			const zx = zaehler("Nichtmetall-Atome", 1, 0, 4, male);
			const sicht = wahl("Ansicht", [["vor", "Vorher: Atome"], ["nach", "Nachher: Ionen"]], "vor", male);
			api.feld.append(sicht.el, svg, ab, h("div", { class: "paar" }, h("div", {}, wm.el, zm.el), h("div", {}, wx.el, zx.el)),
				h("p", { class: "hinweis", text: "Blaue Punkte sind Außenelektronen, rote Ringe sind freie Plätze bis zur Achterschale." }));
			male();
		},
		warum: `<p>Jedes Atom strebt eine <b>volle Außenschale</b> an, so wie die Edelgase sie haben. Natrium hat außen ein einzelnes Elektron. Gibt es das ab, bleibt die volle Schale darunter übrig. Chlor fehlt genau eins. Das Geschäft liegt auf der Hand.</p>
			<p>Nach der Übergabe sind beide geladen: Na<sup>+</sup> hat ein Elektron zu wenig, Cl<sup>−</sup> eines zu viel. Plus und Minus ziehen sich an, und zwar in alle Richtungen. Deshalb entstehen keine einzelnen Pärchen, sondern ein <b>Gitter</b>, in dem jedes Ion von Gegenstücken umgeben ist. Das ist ein Salzkristall. Die Anziehung ist stark: Kochsalz schmilzt erst bei 801 °C.</p>
			<p>Die <b>Formel</b> ergibt sich von selbst, weil die Ladungen sich aufheben müssen. Magnesium gibt zwei Elektronen ab, Chlor nimmt nur eines, also braucht es zwei Chlor: MgCl<sub>2</sub>. Bei Aluminium (drei) und Sauerstoff (zwei) geht es erst bei sechs Elektronen auf: Al<sub>2</sub>O<sub>3</sub>.</p>`,
		merke: "Metall gibt Elektronen ab, Nichtmetall nimmt sie auf. Die entgegengesetzten Ladungen halten das Salz zusammen.",
		quiz: {
			f: "Calcium hat zwei Außenelektronen, Fluor fehlt eines. Welche Formel hat das Salz?",
			a: [f("CaF"), f("Ca2F"), f("CaF2")],
			r: 2,
			w: "Ein Calcium gibt zwei Elektronen ab, jedes Fluor nimmt eines. Also zwei Fluor auf ein Calcium.",
		},
	};

	// ---------- 5 · Elektronenpaarbindung ----------
	const MOLEKUELE = {
		H2: ["H2", "Wasserstoff"], O2: ["O2", "Sauerstoff", "eine Doppelbindung"], N2: ["N2", "Stickstoff", "eine Dreifachbindung, eine der festesten überhaupt"],
		Cl2: ["Cl2", "Chlor"], H2O: ["H2O", "Wasser"], H2O2: ["H2O2", "Wasserstoffperoxid", "bleicht Haare"], H3N: ["NH3", "Ammoniak"],
		CH4: ["CH4", "Methan", "Erdgas"], CO2: ["CO2", "Kohlendioxid", "zwei Doppelbindungen"], ClH: ["HCl", "Chlorwasserstoff"], CHN: ["HCN", "Blausäure"],
		C2H6: ["C2H6", "Ethan"], C2H4: ["C2H4", "Ethen"], C2H2: ["C2H2", "Ethin", "Schweißgas"], CH4O: ["CH3OH", "Methanol"], CH2O: ["CH2O", "Formaldehyd"],
		H4N2: ["N2H4", "Hydrazin", "Raketentreibstoff"], CCl4: ["CCl4", "Tetrachlormethan"], CH3Cl: ["CH3Cl", "Chlormethan"], ClHO: ["HClO", "Hypochlorige Säure", "desinfiziert Schwimmbäder"],
		C2H6O: ["C2H6O", "Ethanol oder Dimethylether", "gleiche Formel, zwei Baupläne"], CH5N: ["CH3NH2", "Methylamin", "riecht nach Fisch"],
	};
	const paare = {
		g: 2, titel: "Die Elektronen­paar­bindung", kachel: "Elektronen­paare",
		frage: "Zwei Nichtmetalle wollen beide Elektronen haben. Abgeben mag keiner. Wie kommen sie trotzdem beide zur vollen Schale?",
		bau(api) {
			const auf = api.auftraege(["Stecke <b>Wasser</b> zusammen.", "Stecke <b>Kohlendioxid</b>. Du brauchst Doppelbindungen.", "Stecke <b>Stickstoff</b> aus zwei N. Wie viele Striche braucht es?", "Stecke ein weiteres Molekül deiner Wahl, bei dem alle Hände belegt sind."],
				"Vier Moleküle, alle nach derselben Regel: Jedes Atom streckt so viele Hände aus, wie ihm Elektronen fehlen.");
			const gebaut = new Set();
			stecker(api, {
				atome: ["H", "O", "N", "C", "Cl"],
				name: (i) => (MOLEKUELE[i.formel] ? { formel: MOLEKUELE[i.formel][0], name: MOLEKUELE[i.formel][1], zusatz: MOLEKUELE[i.formel][2] } : null),
				bei(i) {
					if (!i.fertig) return;
					if (i.formel === "H2O") auf.ab(0);
					if (i.formel === "CO2") auf.ab(1);
					if (i.formel === "N2") auf.ab(2);
					gebaut.add(i.formel);
					if ([...gebaut].some((x) => !["H2O", "CO2", "N2"].includes(x))) auf.ab(3);
				},
			});
		},
		warum: `<p>Wenn keiner abgeben will, wird <b>geteilt</b>. Zwei Atome legen je ein Elektron in die Mitte. Dieses Paar gehört beiden und zählt bei beiden zur Außenschale. Ein solches gemeinsames Paar ist ein Strich in der Formel und eine Hand am Stecktisch.</p>
			<p>Wie viele Hände ein Atom hat, steht im Periodensystem: so viele, wie ihm Elektronen zur vollen Schale <b>fehlen</b>. Wasserstoff fehlt eines, Sauerstoff zwei, Stickstoff drei, Kohlenstoff vier. Daraus folgt alles Weitere von selbst: H<sub>2</sub>O und nicht H<sub>3</sub>O, CH<sub>4</sub> und nicht CH<sub>5</sub>.</p>
			<p>Reichen die Partner nicht, teilen zwei Atome eben zwei oder drei Paare: <b>Doppel- und Dreifachbindung</b>. Die Dreifachbindung im N<sub>2</sub> ist so fest, dass der Stickstoff der Luft fast nie reagiert. Anders als beim Salz entstehen hier abgeschlossene Teilchen, die <b>Moleküle</b>. Untereinander halten sie nur schwach zusammen. Darum sind viele dieser Stoffe Gase oder Flüssigkeiten.</p>`,
		merke: "Nichtmetalle teilen Elektronenpaare. Ein Atom knüpft so viele Bindungen, wie ihm Elektronen zur vollen Schale fehlen.",
		quiz: {
			f: "Warum gibt es Methan als CH<sub>4</sub>, aber kein CH<sub>5</sub>?",
			a: ["Weil fünf Wasserstoff zu schwer wären.", "Weil Kohlenstoff vier Elektronen fehlen. Nach vier geteilten Paaren ist seine Schale voll.", "Weil Wasserstoff nur in geraden Zahlen vorkommt."],
			r: 1,
			w: "Vier fehlende Elektronen, vier Bindungen, dann ist Schluss. Für eine fünfte Hand gibt es keinen Platz in der Schale.",
		},
	};

	// ---------- 6 · Molekülformen ----------
	const FORMEN = {
		CO2: { z: "C", b: ["O", "O"], frei: 0, form: "gestreckt", winkel: "180°" },
		BF3: { z: "B", b: ["F", "F", "F"], frei: 0, form: "flaches Dreieck", winkel: "120°" },
		CH4: { z: "C", b: ["H", "H", "H", "H"], frei: 0, form: "Tetraeder", winkel: "109,5°" },
		NH3: { z: "N", b: ["H", "H", "H"], frei: 1, form: "flache Pyramide", winkel: "107°" },
		H2O: { z: "O", b: ["H", "H"], frei: 2, form: "gewinkelt", winkel: "104,5°" },
	};
	const formen = {
		g: 2, titel: "Molekül­formen", kachel: "Molekül­formen",
		frage: "Auf dem Papier sieht H–O–H aus wie ein gerader Strich. Aber Moleküle sind keine Zeichnungen, sie haben eine Gestalt im Raum. Welche?",
		bau(api) {
			const auf = api.auftraege(["Sieh dir <b>CO<sub>2</sub></b> und <b>H<sub>2</sub>O</b> an, bis beide zur Ruhe gekommen sind.", "Finde das Molekül mit dem Winkel <b>109,5°</b>.", "Finde das Molekül, das wie eine <b>flache Pyramide</b> aussieht."],
				"In jedem Molekül haben sich die Elektronenpaare so weit voneinander entfernt, wie es geht. Mehr steckt nicht dahinter.");
			const svg = sv("svg", { viewBox: "0 0 300 230", class: "bild", role: "img" });
			const ab = h("p", { class: "ablese", "aria-live": "polite" });
			let was = "CO2", pkt = [], ruhe = false, dreh = 0.6, laeuft = !RUHIG;
			const gesehen = new Set();
			const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
			function starte(k) {
				was = k;
				const F = FORMEN[k], n = F.b.length + F.frei;
				// alle Paare starten dicht beieinander und stoßen sich dann ab
				pkt = Array.from({ length: n }, (_, i) => ({ v: norm([1 + Math.sin(i * 2.1) * 0.5, Math.cos(i * 1.7) * 0.5, Math.sin(i * 3.3 + 1) * 0.5]), e: i < F.b.length ? F.b[i] : null }));
				ruhe = false;
				ab.innerHTML = "Die Elektronenpaare stoßen sich ab …";
			}
			function schritt() {
				let max = 0;
				const kraft = pkt.map(() => [0, 0, 0]);
				for (let i = 0; i < pkt.length; i++) for (let j = 0; j < pkt.length; j++) {
					if (i === j) continue;
					const d = pkt[i].v.map((x, k) => x - pkt[j].v[k]);
					const l = Math.max(0.05, Math.hypot(...d));
					const w = (pkt[i].e ? 1 : 1.18) * (pkt[j].e ? 1 : 1.18) / (l * l * l);
					d.forEach((x, k) => { kraft[i][k] += x * w; });
				}
				pkt.forEach((p, i) => {
					const neu = norm(p.v.map((x, k) => x + kraft[i][k] * 0.02));
					max = Math.max(max, Math.hypot(...neu.map((x, k) => x - p.v[k])));
					p.v = neu;
				});
				return max;
			}
			function winkel() {
				const b = pkt.filter((p) => p.e);
				let s = 0, n = 0;
				for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) {
					s += Math.acos(Math.max(-1, Math.min(1, b[i].v.reduce((a, x, k) => a + x * b[j].v[k], 0))));
					n++;
				}
				return (s / n) * 180 / Math.PI;
			}
			function male() {
				const F = FORMEN[was], c = Math.cos(dreh), s = Math.sin(dreh), kc = Math.cos(0.35), ks = Math.sin(0.35);
				const dinge = pkt.map((p) => {
					const x = p.v[0] * c + p.v[2] * s, z0 = -p.v[0] * s + p.v[2] * c;
					const y = p.v[1] * kc - z0 * ks, z = p.v[1] * ks + z0 * kc;
					return { x, y, z, e: p.e };
				});
				dinge.push({ mitte: true, z: 0 });
				dinge.sort((a, b) => a.z - b.z);
				const teile = [];
				for (const d of dinge) {
					if (d.mitte) { teile.push(ball(F.z, 150, 115, 24)); continue; }
					const m = 1 + d.z * 0.16, L = d.e ? 82 : 56, x = 150 + d.x * L * m, y = 115 + d.y * L * m;
					if (d.e) {
						teile.push(sv("line", { x1: 150, y1: 115, x2: x, y2: y, stroke: TINTE, "stroke-width": 5 * m, "stroke-linecap": "round" }));
						teile.push(ball(d.e, x, y, (d.e === "H" ? 14 : 18) * m));
					} else {
						teile.push(sv("ellipse", { cx: x, cy: y, rx: 20 * m, ry: 13 * m, fill: "#f4c600", stroke: TINTE, "stroke-width": 2, opacity: 0.9, transform: `rotate(${Math.atan2(d.y, d.x) * 180 / Math.PI} ${x} ${y})` }));
						teile.push(sv("circle", { cx: x - 5, cy: y, r: 2.6, fill: TINTE }), sv("circle", { cx: x + 5, cy: y, r: 2.6, fill: TINTE }));
					}
				}
				svg.replaceChildren(...teile);
			}
			function fertigGesehen() {
				ruhe = true;
				const F = FORMEN[was];
				gesehen.add(was);
				ab.innerHTML = `<b>${f(was)}</b> · ${F.form} · Bindungswinkel <b>${F.winkel}</b>${F.frei ? ` · ${F.frei} freie${F.frei > 1 ? "" : "s"} Elektronenpaar${F.frei > 1 ? "e" : ""} (gelb)` : ""}`;
				svg.setAttribute("aria-label", `${was}: ${F.form}, Bindungswinkel ${F.winkel}`);
				if (gesehen.has("CO2") && gesehen.has("H2O")) auf.ab(0);
				if (was === "CH4") auf.ab(1);
				if (was === "NH3") auf.ab(2);
				if (was === "H2O" && !tipp.geloest) { tipp.geloest = true; tipp.loese("Am Sauerstoff sitzen vier Elektronenpaare. Zwei davon halten kein H, aber Platz brauchen sie trotzdem. Sie drücken die beiden H zur Seite."); }
			}
			const sw = wahl("Molekül", Object.keys(FORMEN).map((k) => [k, f(k)]), was, (k) => { starte(k); if (RUHIG) { while (schritt() > 0.0004); fertigGesehen(); male(); } });
			const rg = regler({ name: "Drehen", min: 0, max: 360, wert: 35, zeige: (v) => `${v}°`, bei: (v) => { dreh = v * Math.PI / 180; laeuft = false; lk.setAttribute("aria-pressed", "false"); male(); } });
			const lk = knopf("Dreht sich von selbst", () => { laeuft = !laeuft; lk.setAttribute("aria-pressed", String(laeuft)); });
			lk.setAttribute("aria-pressed", String(laeuft));
			const werk = h("div", { hidden: true }, sw.el, svg, ab, rg.el, h("div", { class: "knopf-reihe" }, lk),
				h("p", { class: "hinweis", text: "Gelbe Wolken sind freie Elektronenpaare: Paare, die zum Atom in der Mitte gehören, aber keinen Partner halten." }));
			const tipp = api.tipp("Wasser hat ein O in der Mitte und zwei H daran. Liegen die drei Atome auf einer geraden Linie?", ["Ja, gestreckt wie H–O–H", "Nein, das Molekül hat einen Knick"], 1, () => {
				werk.hidden = false;
				api.sag("Schau zuerst CO<sub>2</sub> an, dann H<sub>2</sub>O.");
			});
			api.feld.append(tipp.el, werk);
			starte(was);
			if (RUHIG) { while (schritt() > 0.0004); fertigGesehen(); }
			male();
			if (!RUHIG) api.takt((dt) => {
				if (werk.hidden) return;
				if (!ruhe) { let m = 0; for (let i = 0; i < 3; i++) m = schritt(); if (m < 0.0004) fertigGesehen(); }
				if (laeuft) { dreh += dt * 0.6; rg.setze(Math.round((dreh * 180 / Math.PI) % 360)); }
				if (laeuft || !ruhe) male();
			});
		},
		warum: `<p>Elektronenpaare sind alle negativ geladen und <b>stoßen sich ab</b>. Um das Atom in der Mitte nehmen sie deshalb den größten Abstand voneinander ein, den es gibt. Zwei Paare stehen sich gegenüber (180°), drei bilden ein flaches Dreieck (120°), vier einen Tetraeder (109,5°).</p>
			<p>Entscheidend ist: Auch <b>freie Elektronenpaare</b> zählen mit. Der Sauerstoff im Wasser hat vier Paare, aber nur an zweien hängt ein H. Die beiden freien Paare siehst du in der Formel nicht, doch sie beanspruchen ihre Ecken im Tetraeder. So bekommt Wasser seinen Knick. Im CO<sub>2</sub> gibt es am Kohlenstoff keine freien Paare, also bleibt es gerade.</p>
			<p>Der Knick hat große Folgen. Sauerstoff zieht die gemeinsamen Elektronen stärker zu sich als Wasserstoff. Weil Wasser gewinkelt ist, hat es dadurch eine leicht negative und eine leicht positive Seite: Es ist ein <b>Dipol</b>. Deshalb kleben Wassermoleküle aneinander, deshalb ist Wasser bei Zimmertemperatur flüssig, und deshalb löst es Salz.</p>`,
		merke: "Elektronenpaare stoßen sich ab und suchen den größten Abstand. Freie Paare zählen mit, auch wenn man sie nicht sieht.",
		quiz: {
			f: "Ammoniak NH<sub>3</sub> hat drei H am Stickstoff, genau wie BF<sub>3</sub> drei F am Bor hat. Warum ist NH<sub>3</sub> trotzdem nicht flach?",
			a: ["Weil Wasserstoff leichter ist als Fluor.", "Weil am Stickstoff noch ein freies Elektronenpaar sitzt, das die drei H nach unten drückt.", "Weil Stickstoff größer ist als Bor."],
			r: 1,
			w: "Stickstoff hat vier Paare, Bor nur drei. Das vierte, freie Paar besetzt die Spitze, die drei H bilden den Boden der Pyramide.",
		},
	};

	window.CH.add(stoffe, atom, pse, ionen, paare, formen);
})();
