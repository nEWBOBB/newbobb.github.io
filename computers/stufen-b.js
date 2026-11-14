/* Baugruppe A (U06) und B: vom Befehl zum Verfahren (U07 bis U10) */
(function () {
	"use strict";
	const { h, s, knopf } = PL;

	/* ---------- U06 Prozessor ---------- */
	const BEFEHLE = [
		["LEER", "—", false], ["LADE", "LADE", true], ["PLUS", "PLUS", true], ["MINUS", "MINUS", true],
		["ZEIGE", "ZEIGE", false], ["SPRING", "SPRING ZU", true], ["NULL", "BEI 0 ZU", true], ["HALT", "HALT", false],
	];
	PL.stufen.push({
		id: "prozessor", gruppe: "a", titel: "Ein Prozessor", kurz: "Rechenwerk, Speicher und ein Zähler, der Befehle abholt",
		auftrag: "<p>Du hast ein Rechenwerk (Baugruppe 4) und Register (Baugruppe 5). Fehlt noch jemand, der sagt, was wann gerechnet wird. Das übernimmt eine Liste von Befehlen im Speicher. Ein Zähler zeigt auf die aktuelle Zeile. Der Prozessor holt den Befehl, führt ihn aus und geht zur nächsten Zeile. Immer wieder.</p><p>Das Register heißt hier Akku. LADE schreibt eine Zahl hinein, PLUS und MINUS rechnen damit, ZEIGE gibt den Akku aus.</p>",
		baue(api) {
			function rechner(feld, start, soll, weiter, lob, tipp) {
				const prog = Array.from({ length: 8 }, (_, i) => (start[i] ? start[i].slice() : ["LEER", 0]));
				let pc = 0, akku = 0, aus = [], schritte = 0, ende = false, uhr = null;
				const zeilen = prog.map((p, i) => {
					const zahl = h("input", { type: "number", min: 0, max: 99, value: p[1], inputmode: "numeric", "aria-label": "Zahl für Zeile " + i });
					const wahl = h("select", { "aria-label": "Befehl in Zeile " + i }, BEFEHLE.map((b) => h("option", { value: b[0], text: b[1] })));
					wahl.value = p[0];
					const passe = () => (zahl.disabled = !BEFEHLE.find((b) => b[0] === wahl.value)[2]);
					wahl.addEventListener("change", () => {
						p[0] = wahl.value;
						passe();
						zurueck();
					});
					zahl.addEventListener("input", () => {
						p[1] = Math.max(0, Math.min(99, parseInt(zahl.value, 10) || 0));
						zurueck();
					});
					passe();
					return h("div", { class: "zeile" }, h("span", { text: String(i) }), wahl, zahl);
				});
				const rAkku = h("b"), rPc = h("b"), rAus = h("div", { class: "teile" });
				function zeig() {
					zeilen.forEach((z, i) => z.classList.toggle("jetzt", i === pc && !ende));
					rAkku.textContent = akku;
					rPc.textContent = ende ? "Stopp" : pc;
					rAus.replaceChildren(...(aus.length ? aus.map((a) => h("span", { class: "teil hell", text: a })) : [h("span", { class: "druck", text: "noch nichts" })]));
				}
				function zurueck() {
					api.stopp(uhr);
					pc = 0; akku = 0; aus = []; schritte = 0; ende = false;
					api.sag("");
					zeig();
				}
				function schritt() {
					if (ende) return true;
					const [b, n] = prog[pc];
					schritte++;
					let nach = pc + 1;
					if (b === "LADE") akku = n;
					else if (b === "PLUS") akku += n;
					else if (b === "MINUS") akku -= n;
					else if (b === "ZEIGE") aus.push(akku);
					else if (b === "SPRING") nach = n;
					else if (b === "NULL" && akku === 0) nach = n;
					if (b === "HALT" || nach > 7 || schritte >= 300 || aus.length > 24) {
						ende = true;
						zeig();
						urteil();
						return true;
					}
					pc = nach;
					zeig();
				}
				function urteil() {
					if (schritte >= 300 || aus.length > 24) return api.sag("Endlosschleife: Der Prozessor kommt nie bei HALT an. Er hat keinen Verstand, der das merkt. Er macht einfach weiter.", "fehler");
					if (aus.join() === soll.join()) return weiter(lob);
					api.sag("Ausgabe: " + (aus.join(", ") || "nichts") + ". Gewünscht: " + soll.join(", ") + ". " + tipp, "fehler");
				}
				feld.append(h("div", { class: "spalten" },
					h("div", { class: "kasten" }, h("p", { class: "druck", text: "Speicher: Zeile · Befehl · Zahl" }), h("div", { class: "programm" }, zeilen)),
					h("div", null,
						h("div", { class: "register" }, h("div", null, "Akku", rAkku), h("div", null, "Befehlszähler", rPc)),
						h("div", { class: "kasten" }, h("p", { class: "druck", text: "Ausgabe" }), rAus),
						h("div", { class: "reihe" },
							knopf("Schritt", () => {
								api.stopp(uhr);
								if (ende) zurueck();
								schritt();
							}, "leer"),
							knopf("Laufen lassen", () => {
								zurueck();
								if (PL.ruhig) {
									while (!schritt());
									return;
								}
								uhr = api.takt(() => {
									if (schritt()) api.stopp(uhr);
								}, 300);
							}),
							knopf("Zurück auf Zeile 0", zurueck, "leer")))));
				zeig();
			}
			api.folge([
				{
					ziel: "Der Prozessor soll 3 + 4 ausrechnen und das Ergebnis zeigen. In Zeile 1 fehlt ein Befehl. Trag ihn ein und lass das Programm laufen. Mit „Schritt“ siehst du jeden Befehl einzeln.",
					baue: (f, w) => rechner(f, [["LADE", 3], ["LEER", 0], ["ZEIGE", 0], ["HALT", 0]], [7], w,
						"Holen, ausführen, weiterzählen. Diese drei Schritte sind alles, was ein Prozessor tut. Er tut sie nur sehr schnell.", "Nach LADE 3 steht 3 im Akku. Was muss dazu?"),
				},
				{
					ziel: "Jetzt soll er von <b>9 herunterzählen bis 0</b> und jede Zahl zeigen. Du hast nur acht Zeilen. Einzeln hinschreiben geht also nicht: Das Programm muss zurückspringen.",
					baue: (f, w) => rechner(f, [["LADE", 9], ["ZEIGE", 0]], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0], w,
						"Eine Schleife: Sechs Zeilen erzeugen zehn Ausgaben. Mit einer anderen Startzahl wären es tausend. Der bedingte Sprung ist der Moment, in dem die Maschine selbst entscheidet, wie es weitergeht.",
						"SPRING ZU 1 führt zurück zu ZEIGE. BEI 0 ZU springt nur, wenn im Akku 0 steht. Damit kommst du aus der Schleife heraus."),
				},
			]);
		},
		blatt: {
			titel: "Holen, ausführen, weiterzählen",
			text: "<p>Ein Prozessor ist eine Schaltung aus den Teilen, die du schon gebaut hast: ein Rechenwerk, ein paar Register und ein Zähler. Dazu kommt ein Speicher mit Befehlen. Jeder Befehl ist selbst nur eine Zahl, also ein Muster aus Bits, das im Prozessor bestimmte Leitungen an- und ausschaltet.</p><p>Wichtig ist der Sprung. Ohne ihn wäre ein Programm eine Einkaufsliste, die einmal von oben nach unten abgearbeitet wird. Mit dem Sprung kann es Dinge wiederholen. Mit dem bedingten Sprung kann es je nach Zwischenergebnis verschiedene Wege gehen.</p><p>Mehr gibt es im Kern nicht: rechnen, merken, springen. Alles, was ein Computer je tut, vom Spiel bis zur Sprachausgabe, ist aus diesen drei Dingen zusammengesetzt. Programme und Daten liegen im selben Speicher. Diese Bauweise heißt Von-Neumann-Architektur.</p>",
			formel: "Befehl holen → ausführen → Zähler + 1 (oder Sprung) → von vorn",
			merke: "Ein Prozessor holt Befehl für Befehl aus dem Speicher. Der bedingte Sprung macht aus einer Liste ein Programm.",
		},
		quiz: {
			frage: "Im Akku steht 5. Zeile 3 lautet „BEI 0 ZU 7“. Welche Zeile kommt als nächste dran?",
			wahl: ["Zeile 7", "Zeile 4", "Zeile 0", "Das Programm hält an"],
			richtig: 1,
			weil: "Der Akku ist nicht 0, also wird nicht gesprungen. Der Zähler geht einfach eins weiter.",
		},
	});

	/* ---------- U07 Algorithmen ---------- */
	PL.stufen.push({
		id: "algorithmen", gruppe: "b", titel: "Algorithmen", kurz: "Dem Bestückungsroboter den Weg befehlen",
		auftrag: "<p>Ab hier denkst du nicht mehr in Leitungen, sondern in Befehlen. Ein Bestückungsroboter fährt über die Platine. Er versteht drei Befehle: einen Schritt vor, links drehen, rechts drehen. Er tut genau, was dasteht, und nichts sonst. Fahr mit ihm alle goldenen Lötpunkte ab.</p>",
		baue(api) {
			const DX = [1, 0, -1, 0], DY = [0, -1, 0, 1];
			const NAMEN = { V: "Vor", L: "Links", R: "Rechts" };
			function brett(feld, cfg, weiter) {
				let prog = [], mal = 1, uhr = null;
				let pos, besucht;
				const svg = s("svg", { viewBox: "0 0 300 300", class: "schaltung", role: "img", "aria-label": "Platine mit Roboter und Lötpunkten", style: "max-width:340px" });
				const robot = s("path", { d: "M-15 -13 L17 0 L-15 13 Z", fill: "var(--druck)", stroke: "var(--chip)", "stroke-width": 2 });
				const punkte = cfg.punkte.map(([x, y]) => s("circle", { cx: x * 50 + 25, cy: y * 50 + 25, r: 12, fill: "none", stroke: "var(--gold)", "stroke-width": 4 }));
				for (let i = 0; i <= 6; i++) svg.append(s("path", { d: `M${i * 50} 0 V300 M0 ${i * 50} H300`, stroke: "var(--bahn)", "stroke-width": 1 }));
				svg.append(...punkte, robot);
				const liste = h("div", { class: "teile" });
				const info = h("p", { class: "druck" });
				function stell() {
					robot.setAttribute("transform", `translate(${pos.x * 50 + 25} ${pos.y * 50 + 25}) rotate(${-90 * pos.d})`);
					punkte.forEach((p, i) => p.setAttribute("fill", besucht[i] ? "var(--gold)" : "none"));
				}
				function heim() {
					api.stopp(uhr);
					pos = { x: cfg.start[0], y: cfg.start[1], d: 0 };
					besucht = cfg.punkte.map(() => false);
					stell();
				}
				function zeig() {
					liste.replaceChildren(...(prog.length ? prog.map((p) => h("span", { class: "teil", text: NAMEN[p] })) : [h("span", { class: "druck", text: "Programm ist leer" })]));
					info.textContent = prog.length + " von höchstens " + cfg.max + " Befehlen · das Ganze " + mal + "-mal";
				}
				function lauf() {
					heim();
					if (!prog.length) return api.sag("Das Programm ist leer. Der Roboter tut von sich aus nichts.", "fehler");
					const folge = [];
					for (let i = 0; i < mal; i++) folge.push(...prog);
					let i = 0;
					api.sag("Roboter fährt …", "info");
					const schritt = () => {
						if (i >= folge.length) {
							const n = besucht.filter(Boolean).length;
							if (n === besucht.length) weiter(cfg.lob);
							else api.sag("Programm zu Ende, aber erst " + n + " von " + besucht.length + " Lötpunkten erreicht. Der Roboter bleibt stehen, wo der letzte Befehl ihn hinführt.", "fehler");
							return true;
						}
						const b = folge[i++];
						if (b === "L") pos.d = (pos.d + 1) % 4;
						else if (b === "R") pos.d = (pos.d + 3) % 4;
						else {
							pos.x += DX[pos.d];
							pos.y += DY[pos.d];
							if (pos.x < 0 || pos.x > 5 || pos.y < 0 || pos.y > 5) {
								api.sag("Der Roboter ist von der Platine gefahren. Er prüft nicht, ob ein Befehl sinnvoll ist.", "fehler");
								api.spaeter(heim, 900);
								return true;
							}
							cfg.punkte.forEach(([x, y], k) => {
								if (x === pos.x && y === pos.y) besucht[k] = true;
							});
						}
						stell();
					};
					if (PL.ruhig) {
						while (!schritt());
						return;
					}
					uhr = api.takt(() => {
						if (schritt()) api.stopp(uhr);
					}, 230);
				}
				const fuege = (b) => () => {
					if (prog.length >= cfg.max) return api.sag("Mehr als " + cfg.max + " Befehle passen nicht in den Speicher. Wiederholt sich in deinem Weg etwas?", "fehler");
					prog.push(b);
					zeig();
				};
				feld.append(h("div", { class: "spalten" }, svg,
					h("div", null,
						h("div", { class: "kasten" }, h("p", { class: "druck", text: "Programm" }), liste, info),
						h("div", { class: "reihe" }, knopf("↑ Vor", fuege("V")), knopf("↶ Links", fuege("L")), knopf("↷ Rechts", fuege("R")),
							knopf("⌫", () => {
								prog.pop();
								zeig();
							}, "leer")),
						cfg.schleife ? PL.regler("Das ganze Programm wiederholen", 1, 6, 1, 1, (v) => {
							mal = v;
							zeig();
						}, (v) => v + "-mal") : null,
						h("div", { class: "reihe" }, knopf("Programm starten", lauf, "hell"), knopf("Roboter zurücksetzen", heim, "leer")))));
				feld.querySelector("button.leer").setAttribute("aria-label", "Letzten Befehl löschen");
				heim();
				zeig();
			}
			api.folge([
				{
					ziel: "Der Roboter schaut nach rechts. Bring ihn zum goldenen Lötpunkt. Du hast Platz für sechs Befehle.",
					baue: (f, w) => brett(f, { start: [0, 5], punkte: [[2, 3]], max: 6, lob: "Ein Algorithmus: eine endliche Folge eindeutiger Schritte, die zum Ziel führt. „Fahr da rüber“ hätte der Roboter nicht verstanden." }, w),
				},
				{
					ziel: "Eine Treppe mit vier Lötpunkten. Der Speicher fasst nur <b>vier</b> Befehle, aber du darfst das ganze Programm wiederholen lassen.",
					baue: (f, w) => brett(f, { start: [0, 5], punkte: [[1, 4], [2, 3], [3, 2], [4, 1]], max: 4, schleife: true, lob: "Vier Befehle, viermal wiederholt, statt sechzehn einzeln. Du hast das Muster im Weg gefunden. Das ist die eigentliche Arbeit beim Programmieren." }, w),
				},
				{
					ziel: "Eine Runde über vier Ecken, zurück zum Start. Wieder nur vier Befehle.",
					baue: (f, w) => brett(f, { start: [1, 4], punkte: [[4, 4], [4, 1], [1, 1], [1, 4]], max: 4, schleife: true, lob: "Dasselbe Programm würde auf einer größeren Platine mit einer anderen Schrittzahl genauso funktionieren. Ein guter Algorithmus löst nicht einen Fall, sondern eine ganze Sorte von Fällen." }, w),
				},
			]);
		},
		blatt: {
			titel: "Ein Algorithmus ist ein Rezept ohne Spielraum",
			text: "<p>Ein Algorithmus ist eine Anleitung aus eindeutigen Einzelschritten, die nach endlich vielen Schritten fertig ist. Ein Kuchenrezept ist fast einer, bis auf Stellen wie „eine Prise Salz“ oder „backen, bis er gut aussieht“. Eine Maschine kann mit solchen Stellen nichts anfangen.</p><p>Jeder Algorithmus lässt sich aus drei Bauformen zusammensetzen: Schritte nacheinander, Wiederholung und Entscheidung. Die Wiederholung hast du gerade benutzt. Die Entscheidung kennst du vom bedingten Sprung im Prozessor.</p><p>Der Roboter hier und der Prozessor aus Baugruppe 6 tun dasselbe. Der Unterschied liegt nur in der Sprache: „Vor“ ist bequemer als „LADE 3“. Höhere Programmiersprachen sind solche bequemeren Sprachen. Am Ende werden sie immer in die einfachen Befehle des Prozessors übersetzt.</p>",
			formel: "Folge · Wiederholung · Entscheidung",
			merke: "Ein Algorithmus besteht aus eindeutigen Schritten und endet irgendwann. Wer das Muster findet, braucht weniger Befehle.",
		},
		quiz: {
			frage: "Welche Anweisung ist für eine Maschine KEIN brauchbarer Schritt eines Algorithmus?",
			wahl: ["Zähle 1 zum Zähler dazu", "Wiederhole, bis der Zähler 10 ist", "Rühre, bis der Teig schön aussieht", "Wenn die Zahl 0 ist, halte an"],
			richtig: 2,
			weil: "„Schön“ ist nicht eindeutig. Die anderen drei kann eine Maschine ohne Nachdenken ausführen und prüfen.",
		},
	});

	/* ---------- U08 Sortieren ---------- */
	function mische(n) {
		const a = Array.from({ length: n }, (_, i) => i + 1);
		for (let i = n - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}
	const VERFAHREN = {
		Blasen(a, bild) {
			let v = 0;
			for (let e = a.length - 1; e > 0; e--) {
				let tausch = false;
				for (let i = 0; i < e; i++) {
					v++;
					if (a[i] > a[i + 1]) {
						[a[i], a[i + 1]] = [a[i + 1], a[i]];
						tausch = true;
					}
					bild(i + 1);
				}
				if (!tausch) break;
			}
			return v;
		},
		Einfügen(a, bild) {
			let v = 0;
			for (let i = 1; i < a.length; i++) {
				for (let j = i; j > 0; j--) {
					v++;
					if (a[j - 1] <= a[j]) break;
					[a[j - 1], a[j]] = [a[j], a[j - 1]];
					bild(j - 1);
				}
			}
			return v;
		},
		Mischen(a, bild) {
			let v = 0;
			const teile = (l, r) => {
				if (r - l < 2) return;
				const m = (l + r) >> 1;
				teile(l, m);
				teile(m, r);
				const links = a.slice(l, m), rechts = a.slice(m, r);
				let i = 0, j = 0, k = l;
				while (i < links.length && j < rechts.length) {
					v++;
					a[k++] = links[i] <= rechts[j] ? links[i++] : rechts[j++];
					bild(k - 1);
				}
				while (i < links.length) a[k++] = links[i++];
				while (j < rechts.length) a[k++] = rechts[j++];
				bild(k - 1);
			};
			teile(0, a.length);
			return v;
		},
	};
	PL.stufen.push({
		id: "sortieren", gruppe: "b", titel: "Sortieren", kurz: "Ordnung schaffen, wenn man nur zwei Dinge vergleichen kann",
		auftrag: "<p>Ein Prozessor sieht nie die ganze Reihe auf einmal. Er kann nur zwei Werte vergleichen und, wenn nötig, vertauschen. Du arbeitest jetzt unter denselben Bedingungen: Die Werte der sechs Bausteine sind verdeckt.</p>",
		baue(api) {
			api.folge([
				{
					ziel: "Sortiere die Bausteine von klein nach groß. Ein Tipp auf <b>⇄</b> vergleicht zwei Nachbarn und tauscht sie, wenn der linke größer ist. Wenn du sicher bist, dass alles stimmt, starte den Test.",
					baue(feld, weiter) {
						let a, v;
						const reihe = h("div", { class: "raster", style: "grid-template-columns:repeat(6,1fr);margin-bottom:4px" });
						const tasten = h("div", { class: "raster", style: "grid-template-columns:repeat(5,1fr);padding:0 8.33%;margin-top:0" });
						const info = h("p", { class: "druck", style: "text-align:center" });
						function neu() {
							do a = mische(6).map((x) => x * 7 + 3); while (a.every((x, i) => !i || a[i - 1] < x));
							v = 0;
							zeig(false);
						}
						function zeig(offen, i) {
							reihe.replaceChildren(...a.map((x, k) => h("span", { class: "teil" + (k === i || k === i + 1 ? " hell" : ""), style: "min-width:0", text: offen ? x : "?" })));
							info.textContent = v + " Vergleiche";
						}
						for (let i = 0; i < 5; i++) {
							tasten.append(h("button", {
								type: "button", class: "fach", text: "⇄", "aria-label": "Platz " + (i + 1) + " und " + (i + 2) + " vergleichen",
								onclick() {
									v++;
									const t = a[i] > a[i + 1];
									if (t) [a[i], a[i + 1]] = [a[i + 1], a[i]];
									zeig(false, i);
									api.sag("Platz " + (i + 1) + " und " + (i + 2) + ": " + (t ? "links war größer, getauscht." : "schon richtig herum, bleibt so."), "info");
								},
							}));
						}
						feld.append(reihe, tasten, info, h("div", { class: "reihe mitte" }, knopf("Abnahmetest starten", () => {
							zeig(true);
							if (a.every((x, i) => !i || a[i - 1] < x)) weiter("Sortiert mit " + v + " Vergleichen. Wer ohne Plan tippt, kann nie sicher sein. Wer Durchgang für Durchgang von links nach rechts geht, schon: Nach jedem Durchgang liegt der größte Rest ganz rechts. Das Verfahren heißt Bubblesort.");
							else {
								api.sag("Noch nicht sortiert: " + a.join(", ") + ". Neue Bausteine liegen bereit. Tipp: Geh die Reihe von links nach rechts durch und wiederhole das.", "fehler");
								api.spaeter(neu, 2600);
							}
						})));
						neu();
					},
				},
				{
					ziel: "Jetzt lass Maschinen sortieren. Probier bei derselben Größe mindestens <b>zwei Verfahren</b> aus und vergleiche die Zahl der Vergleiche. Stell dann die Größe hoch.",
					baue(feld, weiter) {
						const L = PL.leinwand(320, 150, "Balken, die gerade sortiert werden");
						let n = 32, uhr = null;
						const gesehen = {};
						const liste = h("div", { class: "teile" });
						function male(a, k) {
							const g = L.g, b = L.b / a.length;
							g.clearRect(0, 0, L.b, L.h);
							a.forEach((x, i) => {
								g.fillStyle = i === k ? "#ffc54a" : "#b8742c";
								const hh = (x / a.length) * (L.h - 8);
								g.fillRect(i * b + 0.5, L.h - hh, Math.max(1, b - 1), hh);
							});
						}
						function ergebnis() {
							liste.replaceChildren(...Object.keys(VERFAHREN).map((k) => h("span", { class: "teil", text: k + ": " + (gesehen[k] == null ? "–" : gesehen[k]) })));
							if (Object.values(gesehen).filter((x) => x != null).length >= 2) weiter("Alle drei Verfahren liefern dieselbe sortierte Reihe. Sie brauchen aber sehr verschieden viele Vergleiche, und der Abstand wächst mit der Größe.");
						}
						function lauf(name) {
							api.stopp(uhr);
							const a = mische(n);
							const bilder = [];
							const v = VERFAHREN[name](a.slice(), function (k) { bilder.push(k); });
							/* zum Abspielen noch einmal rechnen und nach jedem Bild anhalten */
							const b = a.slice();
							const schnapp = [];
							VERFAHREN[name](b, (k) => schnapp.push([b.slice(), k]));
							const ende = () => {
								male(b, -1);
								gesehen[name] = v;
								api.sag(name + " bei " + n + " Balken: " + v + " Vergleiche.", "info");
								ergebnis();
							};
							if (PL.ruhig) return ende();
							const sprung = Math.max(1, Math.ceil(schnapp.length / 160));
							let i = 0;
							uhr = api.takt(() => {
								if (i >= schnapp.length) {
									api.stopp(uhr);
									return ende();
								}
								male(schnapp[i][0], schnapp[i][1]);
								i += sprung;
							}, 22);
						}
						feld.append(L.c,
							PL.regler("Anzahl Balken", 8, 64, 8, n, (v) => {
								api.stopp(uhr);
								n = v;
								Object.keys(gesehen).forEach((k) => delete gesehen[k]);
								liste.replaceChildren();
								male(mische(n), -1);
							}),
							h("div", { class: "reihe" }, Object.keys(VERFAHREN).map((k) => knopf(k, () => lauf(k)))),
							h("div", { class: "kasten" }, h("p", { class: "druck", text: "Vergleiche bei dieser Größe" }), liste));
						male(mische(n), -1);
					},
				},
			]);
		},
		blatt: {
			titel: "Gleiches Ergebnis, sehr verschiedener Aufwand",
			text: "<p><b>Blasen</b> (Bubblesort) vergleicht Nachbarn und schiebt in jedem Durchgang den größten Rest nach rechts. <b>Einfügen</b> (Insertionsort) nimmt Wert für Wert und rückt ihn nach links an seinen Platz, so wie du Spielkarten auf der Hand ordnest. Beide brauchen bei doppelt so vielen Werten ungefähr viermal so viele Vergleiche.</p><p><b>Mischen</b> (Mergesort) geht anders vor: Es teilt die Reihe in zwei Hälften, sortiert jede für sich und führt sie dann im Reißverschluss zusammen. Die Hälften werden auf dieselbe Weise sortiert. Bei doppelt so vielen Werten braucht es nur wenig mehr als doppelt so viele Vergleiche.</p><p>Bei 64 Balken ist der Unterschied ein paar hundert zu ein paar tausend Vergleichen. Bei einer Million Datensätzen ist er der zwischen einer Sekunde und mehreren Stunden.</p>",
			formel: "Blasen und Einfügen: etwa n² / 2 Vergleiche · Mischen: etwa n · log₂ n",
			merke: "Für dieselbe Aufgabe gibt es gute und schlechte Verfahren. Der Unterschied zeigt sich erst bei großen Mengen, dort aber gewaltig.",
		},
		quiz: {
			frage: "Bubblesort braucht für 1 000 Werte etwa eine halbe Million Vergleiche. Wie viele sind es ungefähr für 2 000 Werte?",
			wahl: ["Eine Million (doppelt so viele)", "Zwei Millionen (viermal so viele)", "Eine halbe Million (gleich viele)"],
			richtig: 1,
			weil: "Der Aufwand wächst mit n². Doppelte Menge heißt vierfache Arbeit.",
		},
	});

	/* ---------- U09 Suchen ---------- */
	PL.stufen.push({
		id: "suchen", gruppe: "b", titel: "Suchen und O-Notation", kurz: "Warum sich Sortieren lohnt",
		auftrag: "<p>In jedem Fach liegt ein Baustein mit einer Nummer. Du suchst die <b>500</b>. Jedes Öffnen kostet Zeit. Die Fächer sind boshaft bestückt: Du triffst immer den ungünstigsten Fall, so wie ein Programm damit rechnen muss.</p>",
		baue(api) {
			api.folge([
				{
					ziel: "Zwölf Fächer, <b>ungeordnet</b>. Finde die 500.",
					baue(feld, weiter) {
						let offen = 0;
						const andere = [731, 88, 402, 915, 267, 640, 53, 829, 176, 558, 344];
						const raster = h("div", { class: "raster", style: "grid-template-columns:repeat(4,1fr)" });
						for (let i = 0; i < 12; i++) {
							raster.append(h("button", {
								type: "button", class: "fach", text: "?", "aria-label": "Fach " + (i + 1) + " öffnen",
								onclick(e) {
									const b = e.currentTarget;
									if (b.classList.contains("offen")) return;
									offen++;
									b.classList.add("offen");
									if (offen === 12) {
										b.textContent = "500";
										b.classList.add("treffer");
										weiter("Im letzten Fach. Ohne Ordnung verrät dir ein Fach nichts über die anderen. Im schlimmsten Fall musst du alle öffnen: bei n Fächern n Öffnungen.");
									} else {
										b.textContent = andere[offen - 1];
										api.sag(offen + " geöffnet. Die " + andere[offen - 1] + " hilft dir nicht weiter.", "info");
									}
								},
							}));
						}
						feld.append(raster);
					},
				},
				{
					ziel: "31 Fächer, diesmal <b>aufsteigend sortiert</b>. Finde die 500 mit höchstens <b>fünf</b> Öffnungen.",
					baue(feld, weiter) {
						const kl = Array.from({ length: 31 }, (_, i) => 12 + i * 15 + (i * 7) % 11);
						const gr = Array.from({ length: 31 }, (_, i) => 515 + i * 15 + (i * 5) % 9);
						let lo, hi, zuege, aus;
						const raster = h("div", { class: "raster", style: "grid-template-columns:repeat(auto-fill,minmax(38px,1fr))" });
						const info = h("p", { class: "druck" });
						function neu() {
							lo = 0; hi = 30; zuege = 0; aus = false;
							raster.querySelectorAll("button").forEach((b, i) => {
								b.className = "fach";
								b.textContent = i + 1;
							});
							info.textContent = "0 von 5 Öffnungen";
						}
						for (let i = 0; i < 31; i++) {
							raster.append(h("button", {
								type: "button", class: "fach", text: i + 1, "aria-label": "Fach " + (i + 1),
								onclick(e) {
									const b = e.currentTarget;
									if (aus || b.classList.contains("offen")) return;
									zuege++;
									b.classList.add("offen");
									if (i === lo && lo === hi) {
										b.textContent = "500";
										b.classList.add("treffer");
										aus = true;
										if (zuege <= 5) {
											feld.append(h("div", { class: "kasten" }, h("p", { class: "druck", text: "Und bei mehr Fächern?" }), (() => {
												const text = h("p", { style: "margin:0" });
												const zeig = (e2) => {
													const n = Math.round(Math.pow(10, e2));
													text.textContent = n.toLocaleString("de-DE") + " Fächer: der Reihe nach bis zu " + n.toLocaleString("de-DE") + " Öffnungen, mit Halbieren höchstens " + Math.ceil(Math.log2(n + 1)) + ".";
												};
												const r = PL.regler("Anzahl Fächer", 1, 9, 0.5, 3, zeig, (e2) => Math.round(Math.pow(10, e2)).toLocaleString("de-DE"));
												zeig(3);
												return [r, text];
											})()));
											weiter("Gefunden mit " + zuege + " Öffnungen. Jede Öffnung in der Mitte halbiert, was noch in Frage kommt: 31, 15, 7, 3, 1. Zieh den Regler, um zu sehen, wie das bei großen Mengen wirkt.");
										} else {
											api.sag("Gefunden, aber mit " + zuege + " Öffnungen. Es geht immer mit fünf. Wo musst du öffnen, damit jede Antwort möglichst viele Fächer ausschließt?", "fehler");
											api.spaeter(neu, 3200);
										}
										return;
									}
									let v;
									if (i < lo) v = kl[i];
									else if (i > hi) v = gr[i];
									else if (hi - i >= i - lo) {
										v = kl[i];
										lo = i + 1;
									} else {
										v = gr[i];
										hi = i - 1;
									}
									b.textContent = v;
									raster.querySelectorAll("button").forEach((x, k) => x.classList.toggle("raus", (k < lo || k > hi) && !x.classList.contains("offen")));
									info.textContent = zuege + " von 5 Öffnungen · noch möglich: " + (hi - lo + 1) + " Fächer";
									api.sag("Fach " + (i + 1) + " enthält " + v + ". Das ist zu " + (v < 500 ? "klein: Die 500 liegt weiter rechts." : "groß: Die 500 liegt weiter links."), "info");
								},
							}));
						}
						feld.append(info, raster, h("div", { class: "reihe" }, knopf("Neu anfangen", neu, "leer")));
						neu();
					},
				},
			]);
		},
		blatt: {
			titel: "Wie der Aufwand wächst, zählt mehr als der Aufwand selbst",
			text: "<p>Das Suchen der Reihe nach heißt lineare Suche. Doppelt so viele Fächer bedeuten doppelt so viele Öffnungen. Das Halbieren heißt binäre Suche. Hier kostet eine Verdopplung der Fächer nur eine einzige Öffnung mehr. Dafür müssen die Daten sortiert sein, und genau deshalb lohnt sich das Sortieren aus Baugruppe 8.</p><p>Informatiker beschreiben dieses Wachstum mit der O-Notation. O(n) heißt: Der Aufwand wächst im Gleichschritt mit der Menge. O(log n) heißt: Er wächst nur mit der Zahl der Halbierungen. O(n²) heißt: Doppelte Menge, vierfache Arbeit. Den Logarithmus kennst du aus dem <a href=\"../math/\">Mathe-Heft, Stufe 8</a>.</p><p>Die Notation ignoriert absichtlich, wie schnell der Rechner ist. Ein schnellerer Rechner macht alles um einen festen Faktor schneller. Ein besseres Verfahren ändert, wie die Kurve verläuft.</p>",
			formel: "Lineare Suche: O(n) · Binäre Suche: O(log n) · Bubblesort: O(n²) · Mergesort: O(n · log n)",
			merke: "Binäre Suche halbiert bei jedem Schritt. Eine Milliarde sortierte Einträge brauchen höchstens 30 Blicke.",
		},
		quiz: {
			frage: "Ein Telefonbuch hat 1 000 sortierte Namen, du findest jeden mit höchstens 10 Blicken. Wie viele brauchst du höchstens bei 2 000 Namen?",
			wahl: ["20", "11", "100", "1 000"],
			richtig: 1,
			weil: "Der erste Blick halbiert 2 000 auf 1 000. Danach geht es weiter wie zuvor: ein Blick mehr.",
		},
	});

	/* ---------- U10 Datenstrukturen ---------- */
	PL.stufen.push({
		id: "strukturen", gruppe: "b", titel: "Datenstrukturen", kurz: "Stapel und Schlange: Wer zuerst wieder herauskommt",
		auftrag: "<p>Daten müssen irgendwo warten, bis sie dran sind. Wie du sie ablegst, bestimmt, in welcher Reihenfolge du wieder herankommst. Hier sind zwei Zwischenlager. Aus dem <b>Stapel</b> kommt immer das zuletzt abgelegte Teil. Aus der <b>Schlange</b> immer das, das am längsten wartet.</p>",
		baue(api) {
			function lager(feld, soll, weiter, lob) {
				let ein, stapel, schlange, aus;
				const boxen = ["Eingang", "Stapel", "Schlange", "Ausgang"].map((n) => {
					const t = h("div", { class: "teile" });
					return { t, el: h("div", { class: "kasten" }, h("p", { class: "druck", text: n }), t) };
				});
				const kn = [
					knopf("Eingang → Stapel", () => zug(() => stapel.push(ein.shift()))),
					knopf("Stapel → Ausgang", () => zug(() => aus.push(stapel.pop()))),
					knopf("Eingang → Schlange", () => zug(() => schlange.push(ein.shift()))),
					knopf("Schlange → Ausgang", () => zug(() => aus.push(schlange.shift()))),
				];
				function zug(fn) {
					fn();
					zeig();
					if (!ein.length && !stapel.length && !schlange.length) {
						if (aus.join("") === soll) weiter(lob);
						else api.sag("Am Ausgang liegt " + aus.join(" ") + ". Bestellt war " + soll.split("").join(" ") + ". Setz zurück und versuch es anders.", "fehler");
					}
				}
				function zeig() {
					[ein, stapel, schlange, aus].forEach((l, i) =>
						boxen[i].t.replaceChildren(...(l.length ? l.map((x) => h("span", { class: "teil" + (i === 3 ? " hell" : ""), text: x })) : [h("span", { class: "druck", text: "leer" })])));
					kn[0].disabled = kn[2].disabled = !ein.length;
					kn[1].disabled = !stapel.length;
					kn[3].disabled = !schlange.length;
				}
				function neu() {
					ein = ["A", "B", "C", "D"];
					stapel = [];
					schlange = [];
					aus = [];
					api.sag("");
					zeig();
				}
				feld.append(boxen[0].el, h("div", { class: "spalten" }, h("div", null, boxen[1].el, h("div", { class: "reihe" }, kn[0], kn[1])), h("div", null, boxen[2].el, h("div", { class: "reihe" }, kn[2], kn[3]))),
					boxen[3].el, h("div", { class: "reihe" }, knopf("Zurücksetzen", neu, "leer")));
				neu();
			}
			api.folge([
				{ ziel: "Die Teile kommen als A B C D an. Am Ausgang sollen sie <b>umgekehrt</b> liegen: D C B A.", baue: (f, w) => lager(f, "DCBA", w, "Der Stapel dreht die Reihenfolge um: zuletzt hinein, zuerst heraus. Auf Englisch LIFO, last in, first out.") },
				{ ziel: "Jetzt sollen sie in <b>derselben</b> Reihenfolge ankommen: A B C D. Jedes Teil muss durch ein Zwischenlager.", baue: (f, w) => lager(f, "ABCD", w, "Die Schlange erhält die Reihenfolge: zuerst hinein, zuerst heraus, FIFO. So warten Druckaufträge und Datenpakete.") },
				{ ziel: "Schwieriger: Bestellt ist <b>B A D C</b>. Du musst nicht alle Teile auf einmal einlagern.", baue: (f, w) => lager(f, "BADC", w, "Zwei rein, zwei raus, und noch einmal. Mit dem Stapel kannst du Dinge kurz zurückstellen und später genau dort weitermachen. So merkt sich ein Programm, wohin es nach einem Unterprogramm zurückkehren muss.") },
			]);
		},
		blatt: {
			titel: "Die Ablage bestimmt, was schnell geht",
			text: "<p>Eine Datenstruktur ist eine Abmachung, wie Daten im Speicher liegen und wie man an sie herankommt. Stapel und Schlange sind die zwei einfachsten. Beim Stapel kommst du nur an das oberste Teil, bei der Schlange nur an das vorderste. Diese Einschränkung ist gewollt: Sie macht beide sehr schnell und schwer falsch zu benutzen.</p><p>Der Stapel steckt in jedem Programm. Die Zurück-Taste im Browser ist einer, die Funktion „Rückgängig“ auch. Ruft ein Programmteil einen anderen auf, legt der Prozessor die Rücksprungadresse auf einen Stapel. Das brauchst du gleich in Baugruppe 11.</p><p>Andere Strukturen lösen andere Aufgaben: Die sortierte Liste aus Baugruppe 9 erlaubt schnelles Suchen. Ein Baum hält Daten dauerhaft sortiert. Ein Graph (Baugruppe 12) beschreibt, was mit was verbunden ist.</p>",
			formel: "Stapel: LIFO (zuletzt hinein, zuerst heraus) · Schlange: FIFO (zuerst hinein, zuerst heraus)",
			merke: "Wie Daten abgelegt sind, entscheidet darüber, welche Fragen sich schnell beantworten lassen.",
		},
		quiz: {
			frage: "Du tippst einen Text und drückst dreimal „Rückgängig“. Welche Struktur merkt sich deine Änderungen?",
			wahl: ["Eine Schlange, denn die älteste Änderung wird zuerst zurückgenommen", "Ein Stapel, denn die jüngste Änderung wird zuerst zurückgenommen", "Keine, der Rechner rät"],
			richtig: 1,
			weil: "Rückgängig nimmt immer das Letzte zuerst zurück: zuletzt hinein, zuerst heraus.",
		},
	});
})();
