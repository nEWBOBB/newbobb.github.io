/* Baugruppe A: vom Schalter zum Rechner (U01 bis U05) */
(function () {
	"use strict";
	const { h, s, knopf, schalter, led } = PL;
	const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

	/* ---------- U01 Bits ---------- */
	PL.stufen.push({
		id: "bits", gruppe: "a", titel: "Bits", kurz: "Wie viele Schalter braucht ein Alphabet?",
		auftrag: "<p>Ein Schalter kennt zwei Stellungen: aus und an, 0 und 1. Das nennt man ein Bit. Mit einem Bit kannst du zwei Dinge auseinanderhalten. Was machst du, wenn du mehr brauchst?</p>",
		baue(api) {
			let n = 1;
			let muster = 0;
			function bank(feld, pruefe) {
				const reihe = h("div", { class: "bitreihe" });
				const zahl = h("p", { class: "anzeige" });
				const raster = h("div", { class: "raster", style: "grid-template-columns:repeat(auto-fill,minmax(64px,1fr))" });
				function neu() {
					muster &= (1 << n) - 1;
					reihe.replaceChildren(...Array.from({ length: n }, (_, i) => {
						const bit = n - 1 - i;
						return schalter("S" + (bit + 1), (muster >> bit) & 1, (an) => {
							muster = an ? muster | (1 << bit) : muster & ~(1 << bit);
							neu();
						});
					}));
					const anzahl = 1 << n;
					zahl.replaceChildren(ABC[muster] || "–", h("small", { text: n + (n === 1 ? " Schalter" : " Schalter") + " · " + anzahl + " Muster · eingestellt: " + muster.toString(2).padStart(n, "0") }));
					raster.replaceChildren(...Array.from({ length: Math.min(anzahl, 32) }, (_, m) =>
						h("button", {
							type: "button", class: "fach" + (m === muster ? " jetzt" : ""), text: m.toString(2).padStart(n, "0") + " " + (ABC[m] || "·"),
							"aria-label": "Muster " + m.toString(2).padStart(n, "0") + (ABC[m] ? " für " + ABC[m] : ", unbenutzt"),
							onclick() {
								muster = m;
								neu();
							},
						})));
					if (anzahl > 32) raster.append(h("p", { class: "druck", text: "… und " + (anzahl - 32) + " weitere Muster" }));
					pruefe(false);
				}
				const plus = knopf("+ Schalter einlöten", () => {
					if (n < 8) n++;
					neu();
				});
				const minus = knopf("− auslöten", () => {
					if (n > 1) n--;
					neu();
				}, "leer");
				feld.append(reihe, zahl, h("div", { class: "reihe mitte" }, minus, plus), raster);
				neu();
			}
			api.folge([
				{
					ziel: "Du willst alle 26 Buchstaben von A bis Z unterscheiden. Löte genau so viele Schalter ein, wie du mindestens brauchst. Dann starte den Test.",
					baue(feld, weiter) {
						bank(feld, () => { });
						feld.append(h("div", { class: "reihe mitte" }, knopf("Abnahmetest starten", () => {
							const m = 1 << n;
							if (m < 26) api.sag("Mit " + n + " Schaltern gibt es nur " + m + " Muster. Die Buchstaben ab " + ABC[m] + " bekommen keins.", "fehler");
							else if (n > 5) api.sag("Das reicht, aber es geht sparsamer. " + m + " Muster sind mehr, als du brauchst.", "fehler");
							else weiter("Fünf Schalter, 32 Muster. Vier Schalter hätten nur 16 ergeben. Jeder weitere Schalter verdoppelt die Zahl der Muster.");
						})));
					},
				},
				{
					ziel: "Jetzt sende einen Buchstaben: Stell mit den fünf Schaltern das <b>Q</b> ein.",
					baue(feld, weiter) {
						n = 5;
						muster = 0;
						bank(feld, () => {
							if (ABC[muster] === "Q") weiter("10000 steht hier für Q. Welches Muster welchen Buchstaben meint, ist reine Abmachung. Sender und Empfänger müssen nur dieselbe Tabelle benutzen.");
						});
					},
				},
			]);
		},
		blatt: {
			titel: "Ein Bit ist eine Ja-Nein-Entscheidung",
			text: "<p>Ein Bit ist die kleinste Menge an Information: eine Entscheidung zwischen zwei Möglichkeiten. Im Rechner ist das eine Leitung, auf der Spannung liegt oder nicht.</p><p>Mit jedem weiteren Bit verdoppelt sich die Zahl der Muster. Ein Schalter: 2. Zwei Schalter: 4. Fünf: 32. Acht Schalter heißen zusammen ein Byte und ergeben 256 Muster. Das reicht für alle Buchstaben, Ziffern und Satzzeichen einer Tastatur.</p><p>Die Muster selbst bedeuten nichts. Erst eine Tabelle legt fest, dass 10000 ein Q ist. Solche Tabellen heißen Codes. Text, Bilder, Musik und Programme sind für den Rechner alle dasselbe: lange Reihen von Bits, gelesen mit der passenden Tabelle.</p>",
			formel: "n Bits → 2ⁿ Muster · 8 Bits = 1 Byte = 256 Muster",
			merke: "Jedes zusätzliche Bit verdoppelt, was du unterscheiden kannst. Was ein Muster bedeutet, legt eine Abmachung fest.",
		},
		quiz: {
			frage: "Eine Ampelanlage soll 100 verschiedene Meldungen anzeigen können. Wie viele Bits braucht sie mindestens?",
			wahl: ["6 Bits", "7 Bits", "10 Bits", "100 Bits"],
			richtig: 1,
			weil: "Sechs Bits ergeben nur 64 Muster, sieben ergeben 128. Das ist die erste Zweierpotenz über 100.",
		},
	});

	/* ---------- U02 Binärzahlen ---------- */
	PL.stufen.push({
		id: "binaer", gruppe: "a", titel: "Binärzahlen", kurz: "Acht Schalter, ein Byte: Zählen mit 0 und 1",
		auftrag: "<p>Bisher waren die Muster nur Namen. Jetzt bekommt jeder Schalter einen Wert. Der rechte zählt 1, jeder weiter links doppelt so viel wie sein Nachbar. Die Zahl ist die Summe aller Schalter, die an sind.</p>",
		baue(api) {
			const wert = [128, 64, 32, 16, 8, 4, 2, 1];
			function bank(feld, pruefe) {
				let z = 0;
				const zahl = h("p", { class: "anzeige" });
				const zeig = () => {
					const teile = wert.filter((w) => z & w);
					zahl.replaceChildren(String(z), h("small", { text: teile.length ? teile.join(" + ") + " = " + z : "alle Schalter aus" }));
					pruefe(z);
				};
				feld.append(
					h("div", { class: "bitreihe" }, wert.map((w) => schalter(String(w), false, (an) => {
						z = an ? z | w : z & ~w;
						zeig();
					}))),
					zahl);
				zeig();
			}
			const aufgabe = (zielzahl, text, lob) => ({
				ziel: text,
				baue(feld, weiter) {
					bank(feld, (z) => {
						if (z === zielzahl) weiter(lob);
					});
				},
			});
			api.folge([
				aufgabe(6, "Stell die Zahl <b>6</b> ein.", "4 + 2 = 6, als Bits 110. So wie 6 im Zehnersystem „sechs Einer“ heißt, heißt 110 hier „ein Vierer, ein Zweier, kein Einer“."),
				aufgabe(77, "Jetzt die <b>77</b>. Fang beim größten Schalter an, der noch hineinpasst.", "64 + 8 + 4 + 1 = 77. Der Trick: immer den größten Wert nehmen, der in den Rest passt. Es gibt für jede Zahl genau ein Muster."),
				aufgabe(255, "Stell die größte Zahl ein, die mit acht Schaltern geht.", "255. Mit der 0 zusammen sind das 256 Zahlen, genau die 256 Muster aus Baugruppe 1."),
			]);
		},
		blatt: {
			titel: "Stellenwerte, nur mit Zweien statt Zehnen",
			text: "<p>Im Zehnersystem ist jede Stelle zehnmal so viel wert wie die rechts daneben: Einer, Zehner, Hunderter. Das kennst du aus dem <a href=\"../math/\">Mathe-Heft, Stufe 1</a>. Im Zweiersystem ist jede Stelle doppelt so viel wert: Einer, Zweier, Vierer, Achter.</p><p>Zehn Ziffern braucht man dafür nicht, zwei reichen. Genau das passt zu Schaltern. Darum rechnen Computer binär: Zwei Zustände lassen sich mit Spannung sicher unterscheiden, zehn nicht.</p><p>Ein Byte fasst die Zahlen 0 bis 255. Für größere Zahlen nimmt man mehr Bytes. Vier Bytes reichen bis gut vier Milliarden.</p>",
			formel: "77 = 0·128 + 1·64 + 0·32 + 0·16 + 1·8 + 1·4 + 0·2 + 1·1 = 0100 1101",
			merke: "Eine Binärzahl ist eine Summe von Zweierpotenzen. Jede Stelle zählt doppelt so viel wie die rechts von ihr.",
		},
		quiz: {
			frage: "Welche Zahl ist 1 0 1 0 (Achter, Vierer, Zweier, Einer)?",
			wahl: ["5", "10", "12", "1010"],
			richtig: 1,
			weil: "Ein Achter und ein Zweier: 8 + 2 = 10.",
		},
	});

	/* ---------- U03 Logikgatter ---------- */
	const zwei = (name, a, b, wahl, aus) => ({
		b: 340, h: 150, name,
		ein: [{ id: "a", name: a, x: 40, y: 45 }, { id: "b", name: b, x: 40, y: 105 }],
		chips: [{ id: "u1", x: 180, y: 75, von: ["a", "b"], wahl }],
		aus: [{ id: "q", name: aus, von: "u1", x: 305, y: 75 }],
	});
	PL.stufen.push({
		id: "gatter", gruppe: "a", titel: "Logikgatter", kurz: "Bausteine, die aus zwei Bits eins machen",
		auftrag: "<p>Ein Gatter ist ein Baustein mit Eingängen und einem Ausgang. Es schaut auf seine Eingänge und entscheidet nach einer festen Regel, ob am Ausgang 0 oder 1 liegt. Im Sortiment liegen mehrere Sorten. Welche Regel jede hat, findest du durch Einstecken und Schalten heraus.</p>",
		baue(api) {
			const sorten = ["UND", "ODER", "XOR", "NAND"];
			api.folge([
				{
					ziel: "Alarmanlage: Die Sirene soll nur heulen, wenn die Anlage <b>scharf</b> ist und die <b>Tür</b> aufgeht.",
					baue: (f, w) => PL.gatterAuftrag(api, f, zwei("Alarmanlage", "SCHARF", "TÜR", sorten, "SIRENE"), (e) => ({ q: e.a & e.b }), w, "Das UND-Gatter gibt nur dann 1 aus, wenn beide Eingänge 1 sind."),
				},
				{
					ziel: "Türklingel: Es soll läuten, wenn jemand <b>vorn</b> oder <b>hinten</b> drückt. Auch wenn beide drücken.",
					baue: (f, w) => PL.gatterAuftrag(api, f, zwei("Türklingel", "VORN", "HINTEN", sorten, "KLINGEL"), (e) => ({ q: e.a | e.b }), w, "Das ODER-Gatter gibt 1 aus, sobald mindestens ein Eingang 1 ist."),
				},
				{
					ziel: "Treppenlicht: Unten und oben sitzt je ein Schalter. Jeder soll das Licht <b>umschalten</b> können, egal wie der andere steht.",
					baue: (f, w) => PL.gatterAuftrag(api, f, zwei("Treppenlicht", "UNTEN", "OBEN", sorten, "LICHT"), (e) => ({ q: e.a ^ e.b }), w, "XOR heißt „entweder oder“: 1, wenn die Eingänge verschieden sind. Jeder Schalter dreht das Ergebnis um."),
				},
				{
					ziel: "Kühlschrank: Der Summer soll warnen, wenn die <b>Tür offen</b> ist und der Kompressor <b>nicht läuft</b>. Diesmal brauchst du zwei Bausteine hintereinander.",
					baue: (f, w) => PL.gatterAuftrag(api, f, {
						b: 340, h: 150, name: "Kühlschrank",
						ein: [{ id: "a", name: "TÜR", x: 40, y: 45 }, { id: "b", name: "LÄUFT", x: 40, y: 105 }],
						chips: [
							{ id: "u1", x: 135, y: 105, von: ["b"], wahl: ["DRAHT", "NICHT"] },
							{ id: "u2", x: 235, y: 75, von: ["a", "u1"], wahl: ["UND", "ODER", "XOR"] },
						],
						aus: [{ id: "q", name: "SUMMER", von: "u2", x: 315, y: 75, rot: true }],
					}, (e) => ({ q: e.a & (1 - e.b) }), w, "NICHT dreht ein Bit um. Dahinter prüft UND beide Bedingungen. Aus wenigen Sorten lässt sich jede Regel zusammenstecken."),
				},
			]);
		},
		blatt: {
			titel: "Rechnen mit wahr und falsch",
			text: "<p>Jedes Gatter ist eine winzige Entscheidung. UND: beide müssen stimmen. ODER: einer reicht. NICHT: das Gegenteil. XOR: genau einer von beiden. Was ein Gatter in jedem Fall tut, steht vollständig in seiner Wahrheitstabelle. Bei zwei Eingängen hat sie nur vier Zeilen.</p><p>In einem echten Chip besteht ein Gatter aus einer Handvoll Transistoren. Ein Transistor ist ein Schalter, den nicht ein Finger umlegt, sondern eine andere Leitung. So können Schalter andere Schalter steuern, und daraus entsteht alles Weitere.</p><p>Bemerkenswert: Aus NAND allein kannst du jedes andere Gatter bauen. Ein Prozessor ist deshalb im Kern derselbe einfache Baustein, milliardenfach wiederholt.</p>",
			formel: "UND: 1·1 = 1, sonst 0 · ODER: 0+0 = 0, sonst 1 · XOR: 1, wenn verschieden · NICHT: dreht um",
			merke: "Ein Gatter macht aus Bits nach einer festen Regel ein neues Bit. Aus wenigen Gattern lässt sich jede Regel bauen.",
		},
		quiz: {
			frage: "Ein Auto piept, wenn der Motor läuft und der Gurt NICHT eingesteckt ist. Motor = 1, Gurt = 1. Was liegt am Ausgang?",
			wahl: ["1, weil der Motor läuft", "0, weil NICHT aus dem Gurt eine 0 macht und UND dann 0 ergibt", "Das hängt vom Zufall ab"],
			richtig: 1,
			weil: "NICHT(1) = 0, und 1 UND 0 = 0. Kein Piepen.",
		},
	});

	/* ---------- U04 Addierer ---------- */
	PL.stufen.push({
		id: "addierer", gruppe: "a", titel: "Addierer", kurz: "Aus Gattern wird ein Rechenwerk",
		auftrag: "<p>Bis hierher haben Gatter nur entschieden. Jetzt sollen sie rechnen. Addiere zwei Bits: 0 + 0 = 0, 0 + 1 = 1, und 1 + 1 = 2. Die 2 passt nicht in ein Bit, binär ist sie 10: ein Zweier, kein Einer. Du brauchst also zwei Ausgänge.</p>",
		baue(api) {
			api.folge([
				{
					ziel: "Bau den Halbaddierer: Die LED <b>EINER</b> zeigt die Einerstelle von A + B, die LED <b>ZWEIER</b> den Übertrag.",
					baue: (f, w) => PL.gatterAuftrag(api, f, {
						b: 340, h: 190, name: "Halbaddierer",
						ein: [{ id: "a", name: "A", x: 40, y: 60 }, { id: "b", name: "B", x: 40, y: 130 }],
						chips: [
							{ id: "u1", x: 190, y: 55, von: ["a", "b"], wahl: ["UND", "ODER", "XOR"] },
							{ id: "u2", x: 190, y: 135, von: ["a", "b"], wahl: ["UND", "ODER", "XOR"] },
						],
						aus: [{ id: "s", name: "EINER", von: "u1", x: 305, y: 55 }, { id: "c", name: "ZWEIER", von: "u2", x: 305, y: 135 }],
					}, (e) => ({ s: e.a ^ e.b, c: e.a & e.b }), w, "XOR liefert die Einerstelle, UND den Übertrag. Zwei Gatter, und die Schaltung kann addieren."),
				},
				{
					ziel: "Vier solcher Stufen hintereinander ergeben ein Addierwerk für Zahlen bis 15. Stell eine Rechnung ein, bei der ein Übertrag durch <b>alle vier Stellen</b> wandert.",
					baue(feld, weiter) {
						const w = [8, 4, 2, 1];
						let a = 0, b = 0, uhr = null;
						const ue = w.map(() => led("gelb"));
						const erg = [16, 8, 4, 2, 1].map(() => led("gruen"));
						const text = h("p", { class: "anzeige" });
						const reiheVon = (name, setz) => h("div", { class: "bitreihe" }, h("span", { class: "zelle breit", text: name }),
							w.map((x) => schalter(String(x), false, (an) => {
								setz(x, an);
								rechne();
							})));
						function rechne() {
							api.stopp(uhr);
							ue.forEach((l) => l.an(false));
							erg.forEach((l) => l.an(false));
							text.replaceChildren(a + " + " + b + " = …");
							let c = 0, i = 0, alle = true;
							const schritt = () => {
								const bit = 1 << i;
								const x = (a & bit ? 1 : 0), y = (b & bit ? 1 : 0);
								const sum = x + y + c;
								erg[4 - i].an(sum & 1);
								c = sum >> 1;
								ue[3 - i].an(c);
								if (!c) alle = false;
								i++;
								if (i === 4) {
									erg[0].an(c);
									text.replaceChildren(a + " + " + b + " = " + (a + b), h("small", { text: "binär " + (a + b).toString(2).padStart(5, "0") }));
									if (alle) weiter("Der Übertrag läuft wie beim schriftlichen Addieren von rechts nach links durch. Jede Stufe wartet auf die vorige. Darum braucht ein Addierwerk einen Moment, bis das Ergebnis stimmt.");
									return true;
								}
							};
							if (PL.ruhig) {
								while (!schritt());
								return;
							}
							uhr = api.takt(() => {
								if (schritt()) api.stopp(uhr);
							}, 260);
						}
						feld.append(
							h("div", { class: "bitreihe" }, h("span", { class: "zelle breit", text: "Übertrag" }), ue.map((l) => h("span", { class: "zelle" }, l))),
							reiheVon("A", (x, an) => (a = an ? a | x : a & ~x)),
							reiheVon("B", (x, an) => (b = an ? b | x : b & ~x)),
							h("div", { class: "bitreihe", style: "margin-top:10px" }, erg.map((l, i) => h("span", { class: "zelle" + (i ? "" : " breit") }, l, String([16, 8, 4, 2, 1][i])))),
							text);
						rechne();
					},
				},
			]);
		},
		blatt: {
			titel: "Rechnen ist auch nur Logik",
			text: "<p>Der Halbaddierer zählt zwei Bits zusammen. Für die nächste Stelle reicht er nicht, denn dort kommen drei Bits an: A, B und der Übertrag von rechts. Zwei Halbaddierer und ein ODER ergeben den Volladdierer, der damit umgehen kann.</p><p>Hängst du Volladdierer aneinander, reicht jeder seinen Übertrag an den linken Nachbarn weiter. Genau so rechnest du schriftlich: „8 plus 7 ist 15, schreibe 5, merke 1.“ Die Schaltung hat kein Verständnis von Zahlen. Sie befolgt vier Zeilen einer Wahrheitstabelle, Stelle für Stelle.</p><p>Abziehen, Malnehmen und Teilen lassen sich auf Addieren zurückführen. Das Rechenwerk eines Prozessors ist im Kern ein großer Addierer.</p>",
			formel: "Einer = A XOR B · Übertrag = A UND B · 1 + 1 = 10 (binär)",
			merke: "Addieren lässt sich aus XOR und UND bauen. Stufe für Stufe reicht jede Stelle ihren Übertrag weiter.",
		},
		quiz: {
			frage: "Am Halbaddierer liegen A = 1 und B = 1. Was zeigen EINER und ZWEIER?",
			wahl: ["EINER 1, ZWEIER 1", "EINER 0, ZWEIER 1", "EINER 1, ZWEIER 0", "EINER 0, ZWEIER 0"],
			richtig: 1,
			weil: "1 + 1 = 2, binär 10: kein Einer, ein Zweier.",
		},
	});

	/* ---------- U05 Speicher ---------- */
	PL.stufen.push({
		id: "speicher", gruppe: "a", titel: "Speicher", kurz: "Eine Schaltung, die sich etwas merkt",
		auftrag: "<p>Alle Schaltungen bisher vergessen sofort: Lässt du den Schalter los, ist das Ergebnis weg. Ein Rechner muss sich aber Zwischenergebnisse merken. Der Trick ist eine Leitung, die vom Ausgang zurück zum Eingang führt.</p>",
		baue(api) {
			function riegel(feld, beiAenderung) {
				const z = { s: 0, r: 0, q: 0, n: 1 };
				const bahn = (d) => s("path", { class: "bahn", d });
				const b = {
					r: bahn("M52 49 H135"), s: bahn("M52 151 H135"),
					q: bahn("M204 60 H289"), n: bahn("M204 140 H289"),
					qr: bahn("M225 60 V80 L115 112 V129 H135"), nr: bahn("M225 140 V120 L115 88 V71 H135"),
				};
				const lq = s("circle", { class: "lampe", cx: 300, cy: 60, r: 11 });
				const ln = s("circle", { class: "lampe rot", cx: 300, cy: 140, r: 11 });
				const taster = (id, name, y) => {
					const g = s("g", { class: "ein taster" }, s("rect", { x: 8, y: y - 13, width: 44, height: 26, rx: 13 }),
						s("text", { x: 30, y: y + 4, "text-anchor": "middle", text: id.toUpperCase() }),
						s("text", { class: "klein", x: 8, y: y - 19, text: name }));
					PL.taste(g, "Taster " + name, () => {
						z[id] = 1;
						neu();
						api.spaeter(() => {
							z[id] = 0;
							neu();
						}, 700);
					});
					return g;
				};
				const ic = (y, id) => s("g", { class: "ic" }, s("rect", { x: 136, y: y - 22, width: 68, height: 44, rx: 3 }),
					s("text", { x: 170, y: y + 4, "text-anchor": "middle", text: "NOR" }), s("text", { class: "klein", x: 140, y: y - 26, text: id }));
				const svg = s("svg", { viewBox: "0 0 340 200", class: "schaltung", role: "group", "aria-label": "Speicherzelle aus zwei NOR-Gattern" },
					Object.values(b), ic(60, "U1"), ic(140, "U2"), taster("r", "LÖSCHEN", 49), taster("s", "SETZEN", 151), lq, ln,
					s("text", { x: 300, y: 43, "text-anchor": "middle", text: "Q" }), s("text", { x: 300, y: 172, "text-anchor": "middle", text: "NICHT Q" }));
				function neu() {
					for (let i = 0; i < 4; i++) {
						z.q = 1 - (z.r | z.n);
						z.n = 1 - (z.s | z.q);
					}
					b.r.classList.toggle("an", !!z.r);
					b.s.classList.toggle("an", !!z.s);
					[b.q, b.qr].forEach((e) => e.classList.toggle("an", !!z.q));
					[b.n, b.nr].forEach((e) => e.classList.toggle("an", !!z.n));
					lq.classList.toggle("an", !!z.q);
					ln.classList.toggle("an", !!z.n);
					svg.querySelectorAll(".ein").forEach((g, i) => g.classList.toggle("an", !!(i ? z.s : z.r)));
					beiAenderung(z);
				}
				feld.append(svg);
				neu();
			}
			api.folge([
				{
					ziel: "Tipp kurz auf <b>SETZEN</b>. Der Taster springt von selbst zurück. Beobachte die LED Q, nachdem er losgelassen hat.",
					baue(feld, weiter) {
						let gedrueckt = false;
						riegel(feld, (z) => {
							if (z.s) gedrueckt = true;
							if (gedrueckt && !z.s && !z.r && z.q) weiter("Der Taster ist längst wieder aus, aber Q bleibt an. Die Rückleitung hält das Bit fest: Q schaltet das untere Gatter ab, und das hält wiederum Q an.");
						});
					},
				},
				{
					ziel: "Die Zelle startet wieder leer. Speichere eine 1 und lösche sie danach wieder.",
					baue(feld, weiter) {
						let war = false;
						riegel(feld, (z) => {
							if (z.q && !z.s) war = true;
							if (war && !z.q && !z.r && !z.s) weiter("Setzen und Löschen: Mehr kann eine Speicherzelle nicht, und mehr muss sie nicht können. Sie merkt sich genau ein Bit.");
						});
					},
				},
				{
					ziel: "Vier Zellen nebeneinander sind ein Register. Es übernimmt die Schalter nur beim Druck auf <b>ÜBERNEHMEN</b>. Sorge dafür, dass im Register <b>1010</b> steht, während die Schalter auf <b>0101</b> stehen.",
					baue(feld, weiter) {
						const sw = [8, 4, 2, 1].map((x) => schalter(String(x), false, pruefe));
						const leds = sw.map(() => led("gruen"));
						let inhalt = 0;
						const lies = () => sw.reduce((z, b, i) => z | (b.wert() ? 8 >> i : 0), 0);
						function pruefe() {
							leds.forEach((l, i) => l.an(inhalt & (8 >> i)));
							if (inhalt === 10 && lies() === 5) weiter("Das Register hält 1010 fest, egal was an den Schaltern passiert. So merkt sich ein Prozessor Zahlen zwischen zwei Rechenschritten.");
						}
						feld.append(
							h("div", { class: "kasten" }, h("p", { class: "druck", text: "Register (gespeichert)" }), h("div", { class: "bitreihe" }, leds.map((l) => h("span", { class: "zelle" }, l)))),
							h("div", { class: "reihe mitte" }, knopf("↑ Übernehmen", () => {
								inhalt = lies();
								pruefe();
							})),
							h("div", { class: "kasten" }, h("p", { class: "druck", text: "Datenschalter" }), h("div", { class: "bitreihe" }, sw)));
					},
				},
			]);
		},
		blatt: {
			titel: "Rückkopplung macht aus Logik ein Gedächtnis",
			text: "<p>Die Speicherzelle besteht aus zwei NOR-Gattern, die sich gegenseitig festhalten. Jedes bekommt den Ausgang des anderen als Eingang. Dadurch gibt es zwei stabile Lagen: Q an oder Q aus. Ein kurzer Impuls kippt die Zelle von der einen in die andere, danach hält sie sich selbst.</p><p>Diese Schaltung heißt Flipflop. Mehrere davon nebeneinander bilden ein Register, das eine ganze Zahl festhält. Der Arbeitsspeicher eines Rechners ist dasselbe Prinzip in Milliardenstückzahl, dazu eine Adresse für jede Zelle.</p><p>Der Übernehmen-Taster ist im echten Rechner der Takt: ein Signal, das viele Millionen Mal pro Sekunde umschaltet und allen Registern gleichzeitig sagt: jetzt merken.</p>",
			formel: "Q = NOR(LÖSCHEN, NICHT Q) · NICHT Q = NOR(SETZEN, Q)",
			merke: "Führt ein Ausgang zurück zum Eingang, kann eine Schaltung ihren Zustand halten. Das ist ein Bit Speicher.",
		},
		quiz: {
			frage: "Was unterscheidet die Speicherzelle von allen Schaltungen davor?",
			wahl: ["Sie benutzt andere Gatter", "Ihr Ausgang hängt nicht nur von den Eingängen jetzt ab, sondern auch von dem, was vorher war", "Sie braucht keinen Strom"],
			richtig: 1,
			weil: "Durch die Rückleitung hat die Schaltung einen Zustand. Ohne Strom verliert sie ihn übrigens wieder.",
		},
	});
})();
