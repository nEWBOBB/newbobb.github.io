// Zone 1, Hardware: vom Schalter zum Rechner (U01 bis U08).
(() => {
	"use strict";
	const { el, knopf, meld, auftraege, reihe, schalter, steckbrett, tafel, GATTER, RUHIG } = PL;

	// ---------- U01 Das Bit ----------
	PL.stufe({
		id: "bit", zone: 0, name: "Das Bit", kurz: "Ein Schalter, zwei Möglichkeiten",
		frage: `<p>Ein Computer kennt keine Zahlen, keine Buchstaben und keine Bilder. Er kennt Leitungen, auf denen Strom fließt oder nicht. An oder aus, 1 oder 0. Diese kleinste Unterscheidung heißt <b>Bit</b>.</p>
			<p>Mit einem Bit hältst du zwei Dinge auseinander: ja oder nein. Was ändert sich, wenn du einen zweiten Schalter danebensetzt?</p>`,
		bau(api) {
			const auf = auftraege(["Zeig beide Stellungen von einem Schalter.", "Finde alle Muster mit zwei Schaltern.", "Finde alle Muster mit drei Schaltern."]);
			const ort = el("div"), buch = el("div", { class: "buch", "aria-label": "Musterbuch" });
			const status = meld("Leg den Schalter um. Jedes neue Muster landet im Musterbuch.");
			api.feld.append(auf.el, ort, el("p", { class: "klein-titel" }, "Musterbuch"), buch, status);
			let n = 1, r, gefunden;
			function setz() {
				gefunden = new Set();
				ort.textContent = "";
				r = reihe(n, { wechsel: neu });
				ort.appendChild(r.el);
				neu();
			}
			function neu() {
				gefunden.add(r.bits().join(""));
				buch.textContent = "";
				for (let m = 0; m < 1 << n; m++) {
					const k = m.toString(2).padStart(n, "0");
					buch.appendChild(el("span", { class: gefunden.has(k) ? "an" : "" }, k));
				}
				if (gefunden.size === 1 << n && !auf.ok(n - 1)) {
					auf.ab(n - 1);
					if (n < 3) {
						status.sag(`Alle ${1 << n} Muster gefunden. Ein Schalter kommt dazu.`, "gut");
						r.sperre(true);
						api.spaeter(() => { n++; setz(); status.sag(`${n} Schalter. Wie viele Muster gibt es jetzt?`); }, RUHIG ? 400 : 1100);
					} else {
						status.sag("1 Schalter: 2 Muster. 2 Schalter: 4. 3 Schalter: 8. Jeder weitere Schalter verdoppelt die Zahl.", "gut");
						api.fertig("Du hast alle acht Muster von drei Bits gefunden.");
					}
				} else if (!auf.alle()) status.sag(`${gefunden.size} von ${1 << n} Mustern gefunden.`);
			}
			setz();
		},
		warum: `<p>Jeder Schalter hat zwei Stellungen. Kommt ein Schalter dazu, gibt es jedes alte Muster zweimal: einmal mit dem neuen Schalter auf 0, einmal auf 1. Deshalb verdoppelt sich die Zahl der Muster mit jedem Bit.</p>
			<p class="formel">n Bits ergeben 2 · 2 · … · 2 = 2<sup>n</sup> Muster</p>
			<p>Mit 8 Bits sind es 256 Muster, mit 16 schon 65.536 und mit 32 über vier Milliarden. Ein Muster allein bedeutet noch nichts. Erst wenn man sich einigt, wofür es steht, wird daraus eine Zahl, ein Buchstabe oder eine Farbe. Das ist das Thema der nächsten beiden Bausteine.</p>
			<p>Warum nur zwei Zustände und nicht zehn? Weil sich „Strom oder kein Strom“ sehr sicher unterscheiden lässt, auch wenn die Leitung rauscht oder das Bauteil warm wird. Zehn Spannungsstufen sauber zu trennen wäre viel fehleranfälliger. Das Wachstum 2<sup>n</sup> kennst du aus dem <a href="../math/">Mathe-Heft</a>, Stufe 7.</p>`,
		merke: "Ein Bit ist eine Ja-nein-Unterscheidung. Mit n Bits lassen sich 2ⁿ Dinge auseinanderhalten.",
		quiz: { f: "Wie viele verschiedene Muster kannst du mit 10 Schaltern einstellen?", a: ["20", "100", "1.024", "10.000"], r: 2, e: "Zehnmal verdoppeln ergibt 2¹⁰ = 1.024." },
	});

	// ---------- U02 Binärzahlen ----------
	PL.stufe({
		id: "binaer", zone: 0, name: "Zahlen aus Bits", kurz: "Zählen mit Nullen und Einsen",
		frage: `<p>Acht Schalter ergeben 256 Muster. Damit daraus Zahlen werden, bekommt jeder Schalter einen festen Wert: der rechte zählt 1, der nächste 2, dann 4, 8, 16 und so weiter. Jeder Schalter ist doppelt so viel wert wie sein rechter Nachbar.</p>
			<p>Die Zahl ist die Summe aller Schalter, die auf 1 stehen. Kannst du damit jede Zahl von 0 bis 255 einstellen?</p>`,
		bau(api) {
			const ziele = [5, 12, 100, 255];
			const auf = auftraege(ziele.map((z) => `Stell die <b>${z}</b> ein.`));
			const werte = [128, 64, 32, 16, 8, 4, 2, 1];
			const zahl = el("p", { class: "gross-zahl", "aria-live": "polite" });
			const r = reihe(8, { unten: werte, namen: werte.map((w) => `Schalter mit Wert ${w}`), wechsel: neu });
			const status = meld();
			const plus = knopf("+ 1 zählen", () => {
				const w = (r.wert() + 1) % 256;
				r.setze(w.toString(2).padStart(8, "0").split("").map(Number));
				neu();
			}, "leise");
			api.feld.append(auf.el, r.el, zahl, el("div", { class: "zeile" }), status);
			api.feld.querySelector(".zeile").appendChild(plus);
			function neu() {
				const w = r.wert();
				const teile = werte.filter((_, i) => r.bits()[i]);
				zahl.innerHTML = `<b>${w}</b><span>${teile.length > 1 ? teile.join(" + ") : teile.length ? "nur der eine Schalter" : "alle Schalter aus"}</span>`;
				if (!auf.alle() && w === ziele[auf.i]) {
					const k = auf.i;
					auf.ab(k);
					if (auf.alle()) {
						status.sag("255 ist die größte Zahl mit acht Bits: alle Schalter an. Für 256 bräuchtest du einen neunten.", "gut");
						api.fertig("Du kannst jede Zahl von 0 bis 255 aus acht Schaltern bauen.");
					} else status.sag(`${ziele[k]} steht. Weiter mit der ${ziele[auf.i]}.`, "gut");
				}
			}
			neu();
			status.sag("Tipp: Nimm immer den größten Wert, der noch hineinpasst. Mit „+ 1 zählen“ siehst du, wie der Übertrag wandert.");
		},
		warum: `<p>Unser gewohntes Zahlensystem hat zehn Ziffern, und jede Stelle ist zehnmal so viel wert wie die rechts daneben: Einer, Zehner, Hunderter. Das <b>Binärsystem</b> hat nur die Ziffern 0 und 1, und jede Stelle ist doppelt so viel wert: 1, 2, 4, 8, 16.</p>
			<p class="formel">1100100 = 64 + 32 + 4 = 100</p>
			<p>Jede Zahl lässt sich auf genau eine Art aus diesen Werten zusammensetzen. Deshalb funktioniert der Trick mit dem größten Wert, der noch hineinpasst.</p>
			<p>Beim Hochzählen passiert dasselbe wie beim Kilometerzähler: Ist eine Stelle voll, springt sie auf 0 und die nächste zählt eins weiter. Im Zehnersystem passiert das nach der 9, im Binärsystem schon nach der 1. Acht Bits zusammen heißen <b>Byte</b>. Die Stellenwerte kennst du aus dem <a href="../math/">Mathe-Heft</a>, Stufe 1.</p>`,
		merke: "Im Binärsystem ist jede Stelle doppelt so viel wert wie die rechts daneben. Ein Byte sind 8 Bits und reicht von 0 bis 255.",
		quiz: { f: "Welche Zahl ist 1011?", a: ["7", "11", "13", "1.011"], r: 1, e: "8 + 2 + 1 = 11. Die Stelle mit dem Wert 4 ist aus." },
	});

	// ---------- U03 Codes ----------
	PL.stufe({
		id: "codes", zone: 0, name: "Text und Bild aus Zahlen", kurz: "Was ein Muster bedeutet, ist Abmachung",
		frage: `<p>Mit Zahlen allein kannst du noch keinen Brief schreiben und kein Foto zeigen. Der Trick ist eine Abmachung: Jeder Buchstabe bekommt eine Nummer, und jeder Bildpunkt bekommt eine Zahl für seine Helligkeit.</p>
			<p>Dasselbe Byte kann also eine Zahl, ein Buchstabe oder ein Grauton sein. Stell es selbst ein.</p>`,
		bau(api) {
			const ziele = ["A", "K", "k"];
			const auf = auftraege([
				"Stell den Buchstaben <b>A</b> ein. Er hat die Nummer 65.",
				"Stell das <b>K</b> ein. Es ist der 11. Buchstabe, also 10 nach dem A.",
				"Mach daraus ein kleines <b>k</b>. Dafür reicht ein einziger Schalter.",
				"Mal das Bild aus den fünf Zahlen.",
			]);
			const werte = [128, 64, 32, 16, 8, 4, 2, 1];
			const r = reihe(8, { unten: werte, namen: werte.map((w) => `Schalter mit Wert ${w}`), wechsel: neu });
			const drei = el("div", { class: "drei" });
			const status = meld("Ein Byte, drei Lesarten. Welche gilt, entscheidet das Programm.");
			const bild = el("div", { class: "bildteil", hidden: true });
			api.feld.append(auf.el, r.el, drei, status, bild);
			function neu() {
				const w = r.wert();
				const z = w >= 33 && w <= 126 ? String.fromCharCode(w) : w === 32 ? "␣" : "·";
				drei.innerHTML = `<div><small>als Zahl</small><b>${w}</b></div><div><small>als Zeichen</small><b>${z.replace("<", "&lt;")}</b></div><div><small>als Grauton</small><b class="grau" style="background:rgb(${w},${w},${w})"></b></div>`;
				if (auf.i < 3 && z === ziele[auf.i]) {
					const k = auf.i;
					auf.ab(k);
					status.sag(["A steht. B wäre die 66, C die 67.", "K steht: 65 + 10 = 75.", "75 + 32 = 107. Groß und klein unterscheiden sich in genau einem Bit."][k], "gut");
					if (k === 2) { bild.hidden = false; }
				}
			}
			// Bild aus Zahlen
			const soll = [4, 14, 31, 4, 4], ist = [0, 0, 0, 0, 0];
			bild.appendChild(el("p", { class: "klein-titel" }, "Bild aus Zahlen: jede Zeile ist eine Zahl aus 5 Bits (16, 8, 4, 2, 1)"));
			const gitter = el("div", { class: "pixel" });
			const zeilen = soll.map((s, y) => {
				const z = el("div", { class: "pz" });
				for (let x = 0; x < 5; x++) {
					const b = el("button", { type: "button", "aria-pressed": "false", "aria-label": `Zeile ${y + 1}, Punkt mit Wert ${16 >> x}` });
					b.addEventListener("click", () => {
						ist[y] ^= 16 >> x;
						b.setAttribute("aria-pressed", ist[y] & (16 >> x) ? "true" : "false");
						pruef();
					});
					z.appendChild(b);
				}
				const info = el("span", { class: "pinfo" });
				z.appendChild(info);
				gitter.appendChild(z);
				return info;
			});
			bild.appendChild(gitter);
			function pruef() {
				zeilen.forEach((info, y) => {
					info.innerHTML = `<b>${soll[y]}</b> <i>${ist[y] === soll[y] ? "passt" : "ist " + ist[y]}</i>`;
					info.classList.toggle("gut", ist[y] === soll[y]);
				});
				if (ist.every((v, y) => v === soll[y]) && !auf.ok(3)) {
					auf.ab(3);
					status.sag("Ein Pfeil. Fünf Zahlen haben gereicht, um ihn zu übertragen.", "gut");
					api.fertig("Du hast Buchstaben und ein Bild aus Bits gebaut.");
				}
			}
			pruef(); neu();
		},
		warum: `<p>Die Tabelle, die Buchstaben Nummern gibt, heißt <b>ASCII</b>. A ist 65, B ist 66, a ist 97. Sie wurde 1963 festgelegt, und weil sich alle daran halten, kann jedes Gerät den Text eines anderen lesen. Ihr Nachfolger <b>Unicode</b> hat Platz für über eine Million Zeichen, von ä bis 😀, und fängt genauso an wie ASCII.</p>
			<p>Ein Bild ist ein Raster aus Punkten, den <b>Pixeln</b>. In deinem Pfeil braucht jeder Punkt ein Bit. Für Grautöne nimmt man ein Byte pro Punkt (0 ist schwarz, 255 ist weiß), für Farbe drei Bytes: eins für Rot, eins für Grün, eins für Blau. Ein Handyfoto mit 12 Millionen Pixeln sind also 36 Millionen Zahlen.</p>
			<p>Das Byte 01001011 weiß nicht, ob es die Zahl 75, der Buchstabe K oder ein dunkles Grau ist. Das legt allein das Programm fest, das es liest. Öffnest du ein Foto im Texteditor, siehst du Zeichensalat: richtige Bits, falsche Abmachung.</p>`,
		merke: "Bits bedeuten nur das, worauf man sich geeinigt hat. Text ist eine Liste von Zeichennummern, ein Bild ein Raster aus Helligkeitszahlen.",
		mehr: `Mehr dazu: <a href="../telegraf/">Wie der Telegraf funktioniert</a> (der erste Code) und <a href="../fernsehen/">Wie Fernsehen funktioniert</a> (Pixel und RGB).`,
		quiz: { f: "Woran erkennt ein Computer, ob das Byte 01000001 die Zahl 65 oder der Buchstabe A ist?", a: ["An einem versteckten neunten Bit", "Gar nicht. Das Programm legt fest, wie es das Byte liest", "Buchstaben liegen in einem anderen Speicher", "Zahlen beginnen immer mit einer 1"], r: 1, e: "Die Bits sind dieselben. Die Bedeutung kommt von der Abmachung." },
	});

	// ---------- U04 Logikgatter ----------
	const SAETZE = {
		UND: "Die Lampe leuchtet nur, wenn A <b>und</b> B an sind. Wie zwei Schalter hintereinander in einer Leitung.",
		ODER: "Die Lampe leuchtet, wenn A <b>oder</b> B an ist, auch bei beiden. Wie zwei Schalter nebeneinander.",
		NICHT: "Die Lampe zeigt immer das Gegenteil von A. Das Gatter dreht um.",
	};
	PL.stufe({
		id: "gatter", zone: 0, name: "Logikgatter", kurz: "Schalter, die von Schaltern gesteuert werden",
		frage: `<p>Bis jetzt hast du die Schalter mit dem Finger umgelegt. In einem Chip macht das der Strom selbst: Ein <b>Transistor</b> ist ein Schalter, den eine andere Leitung an- und ausschaltet. Aus zwei, drei Transistoren entsteht ein <b>Gatter</b>. Es nimmt Bits entgegen und gibt nach einer festen Regel ein neues Bit aus.</p>
			<p>Es gibt nur eine Handvoll Gatter. Lern drei davon kennen und finde dann heraus, welche in vier unbeschrifteten Chips stecken.</p>`,
		bau(api) {
			const auf = auftraege(["Probier UND, ODER und NICHT aus.", "Chip-Tester: Bestimme die vier unbeschrifteten Chips."]);
			api.feld.appendChild(auf.el);
			// Teil 1: Gatter erkunden
			const teil1 = el("div", { class: "gtest" });
			const wahl = el("div", { class: "seg", role: "group", "aria-label": "Gatter wählen" });
			const feld = el("div", { class: "gzeile" });
			const lampe = el("span", { class: "lampe", "aria-hidden": "true" });
			const satz = el("p", { class: "gsatz", "aria-live": "polite" });
			const tab = el("table", { class: "wt schmal" });
			let typ = "UND";
			const gesehen = new Set();
			const sa = schalter("Schalter A", 0, zeig, { unten: "A" });
			const sb = schalter("Schalter B", 0, zeig, { unten: "B" });
			const chip = el("span", { class: "ic" });
			feld.append(sa.el, sb.el, chip, lampe);
			["UND", "ODER", "NICHT"].forEach((t) => {
				const b = knopf(t, () => { typ = t; zeig(); }, "segk");
				b.dataset.t = t;
				wahl.appendChild(b);
			});
			function zeig() {
				const g = GATTER[typ];
				gesehen.add(typ);
				sb.el.hidden = g.n === 1;
				const q = g.f(+sa.an, +sb.an);
				chip.textContent = typ;
				lampe.classList.toggle("an", !!q);
				wahl.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.t === typ ? "true" : "false"));
				satz.innerHTML = `${SAETZE[typ]} Gerade: Lampe ${q ? "an" : "aus"}.`;
				let h = `<thead><tr><th>A</th>${g.n === 2 ? "<th>B</th>" : ""}<th>Lampe</th></tr></thead><tbody>`;
				for (let m = 0; m < 1 << g.n; m++) {
					const a = g.n === 2 ? m >> 1 : m, b = m & 1;
					const hier = a === +sa.an && (g.n === 1 || b === +sb.an);
					h += `<tr class="${hier ? "hier" : ""}"><td>${a}</td>${g.n === 2 ? `<td>${b}</td>` : ""}<td class="ist">${g.f(a, b)}</td></tr>`;
				}
				tab.innerHTML = h + "</tbody>";
				if (gesehen.size === 3 && !auf.ok(0)) { auf.ab(0); teil2.hidden = false; }
			}
			teil1.append(wahl, feld, satz, tab);
			api.feld.appendChild(teil1);

			// Teil 2: Chip-Tester
			const teil2 = el("div", { class: "gtest tester", hidden: true });
			const geheim = ["ODER", "NAND", "XOR", "UND"];
			const namen = { UND: "UND: nur wenn beide an sind", ODER: "ODER: wenn mindestens einer an ist", NAND: "NAND: immer, außer wenn beide an sind", XOR: "XOR: wenn genau einer an ist" };
			let nr = 0;
			const kopf = el("p", { class: "klein-titel" });
			const tz = el("div", { class: "gzeile" });
			const tl = el("span", { class: "lampe", "aria-hidden": "true" });
			const tc = el("span", { class: "ic" }, "?");
			const ta = schalter("Schalter A am Testchip", 0, tneu, { unten: "A" });
			const tb = schalter("Schalter B am Testchip", 0, tneu, { unten: "B" });
			tz.append(ta.el, tb.el, tc, tl);
			const tw = el("div", { class: "p-wahl" });
			const ts = meld("Leg die Schalter in alle vier Stellungen und beobachte die Lampe.");
			function tneu() {
				const q = GATTER[geheim[nr]].f(+ta.an, +tb.an);
				tl.classList.toggle("an", !!q);
				tl.dataset.s = q;
			}
			function tsetz() {
				kopf.textContent = `Chip-Tester: Chip ${nr + 1} von ${geheim.length}`;
				ta.setze(0); tb.setze(0); tc.textContent = "?";
				tw.textContent = "";
				Object.keys(namen).forEach((n) => {
					tw.appendChild(knopf(namen[n], () => {
						if (n === geheim[nr]) {
							tc.textContent = n;
							nr++;
							if (nr === geheim.length) {
								nr--; auf.ab(1);
								tw.textContent = "";
								ts.sag("Alle vier Chips bestimmt. Vier Stellungen reichen, um ein Gatter mit zwei Eingängen eindeutig zu erkennen.", "gut");
								api.fertig("Du erkennst Gatter an ihrem Verhalten.");
							} else {
								ts.sag(`Richtig, das war ${n}. Nächster Chip.`, "gut");
								api.spaeter(tsetz, RUHIG ? 300 : 700);
							}
						} else ts.sag(`${n} passt nicht zu dem, was die Lampe zeigt. Probier alle vier Stellungen durch.`, "schlecht");
					}, "wahl"));
				});
				tneu();
			}
			teil2.append(kopf, tz, tw, ts);
			api.feld.appendChild(teil2);
			zeig(); tsetz();
		},
		warum: `<p>Ein Gatter ist eine winzige Schaltung mit einer festen Regel. Die Regel passt in eine <b>Wahrheitstafel</b>: Für jede Stellung der Eingänge steht dort, was herauskommt. Bei zwei Eingängen hat sie vier Zeilen, mehr gibt es nicht zu wissen.</p>
			<table class="wt"><thead><tr><th>A</th><th>B</th><th>UND</th><th>ODER</th><th>NAND</th><th>XOR</th></tr></thead><tbody>
			<tr><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td></tr><tr><td>0</td><td>1</td><td>0</td><td>1</td><td>1</td><td>1</td></tr>
			<tr><td>1</td><td>0</td><td>0</td><td>1</td><td>1</td><td>1</td></tr><tr><td>1</td><td>1</td><td>1</td><td>1</td><td>0</td><td>0</td></tr></tbody></table>
			<p>Die Regeln stammen aus der Logik. George Boole hat sie 1854 aufgeschrieben, lange bevor es Elektronik gab: „wahr und wahr ergibt wahr“. Claude Shannon bemerkte 1937, dass sich genau diese Logik mit Schaltern bauen lässt. Seitdem ist Rechnen eine Frage der Verdrahtung.</p>
			<p>Im Chip deines Handys sitzen mehrere Milliarden Transistoren. Sie bilden Gatter derselben wenigen Sorten, die du gerade getestet hast.</p>`,
		merke: "Ein Gatter macht aus ein oder zwei Bits nach fester Regel ein neues Bit. Die Regel steht vollständig in seiner Wahrheitstafel.",
		quiz: { f: "Welches Gatter gibt nur dann eine 0 aus, wenn beide Eingänge auf 1 stehen?", a: ["UND", "ODER", "NAND", "XOR"], r: 2, e: "NAND ist ein UND mit umgedrehtem Ausgang." },
	});

	// ---------- U05 Schaltungen ----------
	PL.stufe({
		id: "schaltung", zone: 0, name: "Schaltungen stecken", kurz: "Aus einem Gatter werden alle anderen",
		frage: `<p>Ein einzelnes Gatter kann wenig. Spannend wird es, wenn der Ausgang eines Gatters in den Eingang des nächsten führt. Dann entstehen neue Regeln, die keins der Gatter allein beherrscht.</p>
			<p>Auf dem Steckbrett ziehst du die Drähte selbst. Dein Ziel steht in der Tafel darunter: Die Spalte „ist“ soll überall der Spalte „soll“ gleichen.</p>`,
		bau(api) {
			const raetsel = [
				{ t: "Bau ein <b>NICHT</b> aus einem einzigen NAND.", tipp: "Ein NAND hat zwei Eingänge, du hast aber nur ein Signal. Was hindert dich, es zweimal anzuschließen?", ein: ["A"], gatter: [{ typ: "NAND", x: 160, y: 110 }], aus: ["Q"], ziel: ([a]) => [1 - a] },
				{ t: "Bau ein <b>UND</b> aus zwei NAND.", tipp: "Ein NAND ist ein UND mit umgedrehtem Ausgang. Wie man umdreht, weißt du seit eben.", ein: ["A", "B"], gatter: [{ typ: "NAND", x: 128, y: 110 }, { typ: "NAND", x: 220, y: 110 }], aus: ["Q"], ziel: ([a, b]) => [a & b] },
				{ t: "Bau ein <b>XOR</b> aus ODER, NAND und UND: an, wenn genau ein Schalter an ist.", tipp: "„Mindestens einer“ und gleichzeitig „nicht beide“.", ein: ["A", "B"], gatter: [{ typ: "ODER", x: 128, y: 62 }, { typ: "NAND", x: 128, y: 158 }, { typ: "UND", x: 220, y: 110 }], aus: ["Q"], ziel: ([a, b]) => [a ^ b] },
			];
			const auf = auftraege(raetsel.map((r) => r.t));
			const ort = el("div");
			const status = meld();
			api.feld.append(auf.el, ort, status);
			function lade(k) {
				const r = raetsel[k];
				ort.textContent = "";
				const tab = tafel(r.ein, r.aus);
				let geloest = false;
				const brett = steckbrett({
					...r, titel: "Steckbrett: " + r.t.replace(/<[^>]+>/g, ""),
					bei(z, p) {
						tab.zeig(p);
						if (p.ok && !geloest) {
							geloest = true;
							auf.ab(k);
							if (k < raetsel.length - 1) {
								status.sag("Die Tafel stimmt in jeder Zeile.", "gut");
								const w = knopf("Nächste Schaltung", () => { status.sag(""); lade(k + 1); });
								status.appendChild(document.createTextNode(" "));
								status.appendChild(w);
							} else {
								status.sag("XOR steht. Du brauchst es gleich für den Addierer.", "gut");
								api.fertig("Du hast drei Gatter aus anderen Gattern verdrahtet.");
							}
						}
					},
				});
				tab.zeig(brett.pruefe());
				ort.append(brett.el, tab, el("p", { class: "tipp" }, `<b>Tipp</b> ${r.tipp}`));
			}
			lade(0);
		},
		warum: `<p>Du hast gerade etwas Erstaunliches gezeigt: Aus NAND-Gattern lassen sich NICHT und UND bauen, und mit einem dritten Trick auch ODER. Damit lässt sich <b>jede</b> denkbare Wahrheitstafel aus NAND allein zusammenstecken. Man nennt NAND deshalb universell.</p>
			<p>Für Chipfabriken ist das ein Geschenk. Sie müssen nur ein einziges Bauteil sehr klein und sehr zuverlässig herstellen können und setzen es dann milliardenfach nebeneinander.</p>
			<p>Das zweite Prinzip ist noch wichtiger: Sobald eine Schaltung funktioniert, darfst du vergessen, wie sie innen aussieht. Dein XOR ist ab jetzt einfach ein Kästchen mit zwei Eingängen und einem Ausgang. Informatiker nennen das <b>Abstraktion</b>. Ohne sie könnte kein Mensch einen Prozessor entwerfen, denn niemand behält Milliarden Transistoren im Kopf. Man denkt in Kästchen, die aus Kästchen bestehen.</p>`,
		merke: "Aus NAND allein lässt sich jede Logikschaltung bauen. Fertige Schaltungen werden zu Bausteinen, deren Innenleben man vergessen darf.",
		quiz: { f: "Was bedeutet es, dass NAND „universell“ ist?", a: ["NAND ist das schnellste Gatter", "Jede Logikschaltung lässt sich nur aus NAND-Gattern bauen", "NAND funktioniert in jedem Land", "NAND braucht keinen Strom"], r: 1, e: "NICHT, UND und ODER lassen sich alle aus NAND stecken, und daraus alles andere." },
	});

	// ---------- U06 Addierer ----------
	PL.stufe({
		id: "addierer", zone: 0, name: "Der Addierer", kurz: "Gatter, die rechnen",
		frage: `<p>Jetzt bringst du deinen Gattern das Rechnen bei. Fang klein an: 1 + 1. Im Binärsystem ist das 10, also „0 hinschreiben, 1 im Sinn“. Du brauchst zwei Ausgänge: die <b>Summe</b> an dieser Stelle und den <b>Übertrag</b> für die nächste.</p>
			<p>Schau dir die Tafel an. Welches Gatter liefert genau die Spalte der Summe, welches die des Übertrags?</p>`,
		bau(api) {
			const auf = auftraege(["Verdrahte den Halbaddierer: S ist die Summe, Ü der Übertrag.", "Rechne mit vier Bits: <b>5 + 3</b>.", "Rechne <b>15 + 1</b> und sieh dem Übertrag zu."]);
			const ort = el("div"), status = meld();
			api.feld.append(auf.el, ort, status);
			const tab = tafel(["A", "B"], ["S", "Ü"]);
			const brett = steckbrett({
				titel: "Steckbrett: Halbaddierer", ein: ["A", "B"], aus: ["S", "Ü"],
				gatter: [{ typ: "XOR", x: 150, y: 66 }, { typ: "UND", x: 150, y: 154 }],
				ziel: ([a, b]) => [a ^ b, a & b],
				bei(z, p) {
					tab.zeig(p);
					if (p.ok && !auf.ok(0)) {
						auf.ab(0);
						status.sag("Das ist ein Halbaddierer. Zwei davon und ein ODER ergeben einen Volladdierer, der auch den Übertrag von rechts mitnimmt. Vier Volladdierer nebeneinander rechnen mit vier Bits.", "gut");
						werk.hidden = false;
					}
				},
			});
			tab.zeig(brett.pruefe());
			ort.append(brett.el, tab);

			// Vier-Bit-Addierwerk
			const werk = el("div", { class: "werk", hidden: true });
			const w4 = [8, 4, 2, 1];
			const ra = reihe(4, { unten: w4, namen: w4.map((w) => `A, Wert ${w}`), wechsel: rech });
			const rb = reihe(4, { unten: w4, namen: w4.map((w) => `B, Wert ${w}`), wechsel: rech });
			const gitter = el("div", { class: "add", role: "img" });
			werk.append(el("p", { class: "klein-titel" }, "Addierwerk mit vier Bits"), el("p", { class: "rl" }, "Zahl A"), ra.el, el("p", { class: "rl" }, "Zahl B"), rb.el, gitter);
			ort.appendChild(werk);
			let lauf = 0;
			function rech() {
				const a = ra.bits(), b = rb.bits();
				const s = [0, 0, 0, 0, 0], c = [0, 0, 0, 0, 0]; // c[i]: Übertrag in Spalte i (0 = ganz links, 4 = rechts außen)
				for (let i = 3; i >= 0; i--) {
					const t = a[i] + b[i] + c[i + 1];
					s[i + 1] = t & 1;
					c[i] = t >> 1;
				}
				s[0] = c[0];
				const A = ra.wert(), Bw = rb.wert();
				const zelle = (v, kl, i) => `<span class="${kl}${v ? " an" : ""}" style="--i:${i}">${v}</span>`;
				gitter.innerHTML =
					`<span class="al">Übertrag</span>${c.slice(0, 4).map((v, i) => zelle(v, "ue", 3 - i)).join("")}<span></span><span class="ar"></span>` +
					`<span class="al">A</span><span></span>${a.map((v) => zelle(v, "z", 0)).join("")}<span class="ar">${A}</span>` +
					`<span class="al">B</span><span></span>${b.map((v) => zelle(v, "z", 0)).join("")}<span class="ar">${Bw}</span>` +
					`<span class="al sum">Summe</span>${s.map((v, i) => zelle(v, "z sum", 4 - i)).join("")}<span class="ar sum">${A + Bw}</span>`;
				gitter.setAttribute("aria-label", `${A} plus ${Bw} ergibt ${A + Bw}, binär ${s.join("")}`);
				gitter.classList.remove("lauf");
				void gitter.offsetWidth;
				gitter.classList.add("lauf");
				lauf++;
				if (A === 5 && Bw === 3 && !auf.ok(1)) { auf.ab(1); status.sag("5 + 3 = 8. Drei Überträge hintereinander, und oben erscheint 1000.", "gut"); }
				if (((A === 15 && Bw === 1) || (A === 1 && Bw === 15)) && auf.ok(1) && !auf.ok(2)) {
					auf.ab(2);
					status.sag("Der Übertrag läuft von rechts nach links durch alle vier Stellen. Das Ergebnis 16 braucht ein fünftes Bit.", "gut");
					api.fertig("Deine Gatter können addieren.");
				}
			}
			rech();
		},
		warum: `<p>Beim schriftlichen Addieren gehst du von rechts nach links und nimmst den Übertrag mit. Genau das tut das Addierwerk. An jeder Stelle sitzt ein <b>Volladdierer</b>: Er zählt die beiden Bits und den Übertrag von rechts zusammen und gibt Summe und neuen Übertrag aus.</p>
			<p class="formel">Summe = A XOR B · Übertrag = A UND B</p>
			<p>Weil der Übertrag wie eine Welle durch alle Stellen läuft, braucht das Ergebnis einen Moment. Erst wenn die Welle links angekommen ist, stimmen alle Lampen. Das ist einer der Gründe, warum ein Prozessor einen <b>Takt</b> hat: Er wartet nach jedem Schritt kurz, bis alle Signale zur Ruhe gekommen sind.</p>
			<p>Subtrahieren, Malnehmen und Teilen lassen sich aufs Addieren zurückführen. Malnehmen etwa ist wiederholtes Addieren und Verschieben. Ein Rechner, der addieren kann, kann deshalb im Kern alles rechnen.</p>
			<p>Und wenn das Ergebnis nicht mehr in die Bits passt? Dann geht der letzte Übertrag verloren. Mit acht Bits ergibt 255 + 1 wieder 0. Dieser <b>Überlauf</b> ist die Ursache vieler berühmter Softwarefehler.</p>`,
		merke: "Addieren ist Logik: XOR liefert die Summe, UND den Übertrag. Der Übertrag wandert von Stelle zu Stelle.",
		quiz: { f: "Ein Zähler hat acht Bits und steht auf 255. Was zeigt er, wenn noch 1 dazukommt?", a: ["256", "0", "255, er bleibt stehen", "1"], r: 1, e: "Für 256 fehlt das neunte Bit. Der Übertrag fällt links heraus, übrig bleibt 00000000." },
	});

	// ---------- U07 Speicher ----------
	PL.stufe({
		id: "speicher", zone: 0, name: "Der Speicher", kurz: "Eine Schaltung, die sich erinnert",
		frage: `<p>Alle Schaltungen bisher vergessen sofort. Nimmst du den Finger vom Schalter, ist das Ergebnis weg. Ein Rechner muss sich aber Zwischenergebnisse merken können.</p>
			<p>Der Trick ist verblüffend einfach: Man führt den Ausgang eines Gatters zurück in den Eingang eines anderen. Die Schaltung unten besteht aus zwei NOR-Gattern (ODER mit umgedrehtem Ausgang), die sich gegenseitig festhalten. Die Taster S und R federn zurück. Was macht die Lampe, wenn du loslässt?</p>`,
		bau(api) {
			const auf = auftraege(["Drück <b>S</b> (Setzen). Die Lampe soll anbleiben, auch nach dem Loslassen.", "Drück <b>R</b> (Rücksetzen). Die Lampe geht aus und bleibt aus.", "Speichere die <b>9</b> (1001) im Register.", "Stell die Schalter auf 6 (0110), ohne zu schreiben. Schreib erst danach."]);
			const ort = el("div"), status = meld();
			api.feld.append(auf.el, ort, status);
			const brett = steckbrett({
				titel: "Speicherzelle aus zwei NOR-Gattern", ein: ["S", "R"], aus: ["Q"], taster: true,
				gatter: [{ typ: "NOR", x: 165, y: 62, start: 1 }, { typ: "NOR", x: 165, y: 158 }],
				fest: [["e0", "g0a"], ["g1", "g0b"], ["g0", "g1a"], ["e1", "g1b"], ["g1", "a0"]],
				losgelassen(i, z) {
					if (i === 0 && z.aus[0] === 1 && !auf.ok(0)) { auf.ab(0); status.sag("Der Taster ist längst zurückgesprungen, die Lampe leuchtet weiter. Die Schaltung hat sich ein Bit gemerkt.", "gut"); }
					if (i === 1 && z.aus[0] === 0 && auf.ok(0) && !auf.ok(1)) {
						auf.ab(1); status.sag("Gelöscht. Vier solcher Zellen nebeneinander merken sich eine Zahl bis 15. Das nennt man ein Register.", "gut");
						reg.hidden = false;
					}
				},
			});
			ort.appendChild(brett.el);

			const reg = el("div", { class: "werk", hidden: true });
			const w4 = [8, 4, 2, 1];
			const rd = reihe(4, { unten: w4, namen: w4.map((w) => `Daten, Wert ${w}`), wechsel: schau });
			const zellen = el("div", { class: "zellen", role: "img" });
			let inhalt = [0, 0, 0, 0], gewartet = false;
			const zeig = () => {
				zellen.innerHTML = inhalt.map((b) => `<span class="${b ? "an" : ""}">${b}</span>`).join("") + `<b>= ${parseInt(inhalt.join(""), 2)}</b>`;
				zellen.setAttribute("aria-label", `Im Register steht ${inhalt.join("")}`);
			};
			const schreib = knopf("Schreiben", () => {
				inhalt = rd.bits(); zeig();
				const w = parseInt(inhalt.join(""), 2);
				if (w === 9 && !auf.ok(2)) { auf.ab(2); status.sag("Die 9 steht im Register.", "gut"); }
				else if (w === 6 && auf.ok(2) && gewartet && !auf.ok(3)) {
					auf.ab(3);
					status.sag("Jetzt erst hat das Register die 6 übernommen. Der Schreibknopf ist das, was im Prozessor der Takt erledigt.", "gut");
					api.fertig("Du hast eine Speicherzelle und ein Register gebaut.");
				}
			});
			function schau() {
				if (auf.ok(2) && !auf.ok(3) && rd.wert() === 6 && parseInt(inhalt.join(""), 2) === 9) {
					gewartet = true;
					status.sag("Die Schalter zeigen 6, im Register steht weiter die 9. Drück jetzt „Schreiben“.");
				}
			}
			reg.append(el("p", { class: "klein-titel" }, "Register mit vier Bits"), el("p", { class: "rl" }, "Daten am Eingang"), rd.el, el("div", { class: "zeile" }), el("p", { class: "rl" }, "Inhalt des Registers"), zellen);
			reg.querySelector(".zeile").appendChild(schreib);
			ort.appendChild(reg);
			zeig();
		},
		warum: `<p>Die beiden NOR-Gatter halten sich gegenseitig fest. Leuchtet die Lampe, schickt das untere Gatter eine 1 zum oberen. Das obere gibt deshalb 0 aus, und diese 0 erlaubt dem unteren, weiter 1 auszugeben. Der Zustand stützt sich selbst. Ein kurzer Puls auf S oder R kippt ihn in den anderen stabilen Zustand. Diese Schaltung heißt <b>Flipflop</b>.</p>
			<p>Neu ist die <b>Rückkopplung</b>: Das Ergebnis hängt nicht mehr nur von den Eingängen ab, sondern auch davon, was vorher war. Ab hier hat deine Maschine eine Vergangenheit.</p>
			<p>Ein <b>Register</b> ist eine Reihe solcher Zellen mit einem gemeinsamen Schreibsignal. Nur in dem Moment, in dem es kommt, übernehmen die Zellen die Werte vom Eingang. Davor und danach können sich die Eingänge ändern, wie sie wollen.</p>
			<p>Der Arbeitsspeicher deines Rechners folgt demselben Gedanken, nur in riesig: Milliarden Zellen, jede mit einer Nummer, ihrer <b>Adresse</b>. 8 Gigabyte sind rund 64 Milliarden Bits. Schaltest du den Strom ab, fallen alle Flipflops in einen zufälligen Zustand. Deshalb ist nach dem Ausschalten alles weg, was nicht auf der Festplatte liegt.</p>`,
		merke: "Speicher entsteht durch Rückkopplung: Zwei Gatter halten sich gegenseitig in einem von zwei stabilen Zuständen.",
		quiz: { f: "Warum bleibt die Lampe an, nachdem du den Taster S losgelassen hast?", a: ["Der Taster klemmt", "Die Lampe glüht nach", "Der Ausgang führt zurück in die Schaltung und hält den Zustand", "Im Chip sitzt eine kleine Batterie"], r: 2, e: "Die Rückkopplung macht den Zustand selbsttragend." },
	});

	// ---------- U08 Prozessor ----------
	const OPS = ["LADE", "PLUS", "MINUS", "ZEIGE", "SPRING", "SPRING0", "HALT"];
	const MIT = { LADE: 1, PLUS: 1, MINUS: 1, SPRING: 1, SPRING0: 1 };
	PL.stufe({
		id: "prozessor", zone: 0, name: "Der Prozessor", kurz: "Holen, entschlüsseln, ausführen",
		frage: `<p>Du hast ein Addierwerk und Speicher. Fehlt nur noch jemand, der sagt, was wann gerechnet wird. Diese Aufgabe übernimmt eine Liste von Befehlen im Speicher: das <b>Programm</b>. Der Prozessor arbeitet sie stur ab, Zeile für Zeile, einen Befehl pro Takt.</p>
			<p>Deine Maschine hat ein Rechenregister <b>A</b> und einen <b>Programmzähler</b>, der sich merkt, welche Zeile dran ist. Sieben Befehle reichen. Lies das Programm und überleg, was es ausgibt, bevor du den Takt gibst.</p>`,
		bau(api) {
			const auf = auftraege(["Tipp ab: Was gibt das Programm aus?", "Lass es bis zum HALT laufen.", "Ändere das Programm so, dass es <b>10 8 6 4 2</b> ausgibt."]);
			const start = [["LADE", 3], ["ZEIGE", 0], ["MINUS", 1], ["SPRING0", 5], ["SPRING", 1], ["HALT", 0]];
			let prog = start.map((z) => z.slice());
			let A = 0, pz = 0, aus = [], halt = false, schritte = 0, frei = false, tipp = null;
			const tab = el("div", { class: "prog" });
			const regs = el("div", { class: "regs", "aria-live": "polite" });
			const logz = meld("Wähl zuerst deinen Tipp.");
			const tw = el("div", { class: "p-wahl" });
			["3 2 1", "3 2 1 0", "3 3 3 und immer weiter"].forEach((t, k) => {
				tw.appendChild(knopf(t, (ev) => {
					tipp = k;
					tw.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
					ev.currentTarget.setAttribute("aria-pressed", "true");
					if (!auf.ok(0)) auf.ab(0);
					bt.disabled = bl.disabled = false;
					logz.sag("Tipp notiert. Gib jetzt den Takt, Schritt für Schritt oder am Stück.");
				}, "wahl"));
			});
			const bt = knopf("Takt", () => { schritt(); male(); });
			const bl = knopf("Laufen lassen", () => {
				let n = 0;
				while (!halt && n++ < 300) schritt();
				if (!halt) logz.sag("Nach 300 Takten kein HALT in Sicht. Die Maschine läuft im Kreis. So sieht ein aufgehängtes Programm aus.", "schlecht");
				male();
			}, "leise");
			const bz = knopf("Auf Anfang", () => { zurueck(); logz.sag("Zurückgesetzt. A = 0, Programmzähler auf Zeile 0."); }, "leise");
			bt.disabled = bl.disabled = true;
			const leiste = el("div", { class: "zeile" });
			leiste.append(bt, bl, bz);
			api.feld.append(auf.el, tw, tab, regs, leiste, logz);

			function zurueck() { A = 0; pz = 0; aus = []; halt = false; schritte = 0; male(); }
			function schritt() {
				if (halt) return;
				if (pz >= prog.length) { halt = true; logz.sag("Das Programm ist zu Ende, ohne HALT. Die Maschine bleibt stehen.", "schlecht"); return; }
				const [op, n] = prog[pz];
				const z = pz;
				let text;
				schritte++;
				if (op === "LADE") { A = n; pz++; text = `A wird ${n}.`; }
				else if (op === "PLUS") { A += n; pz++; text = `A + ${n} = ${A}.`; }
				else if (op === "MINUS") { A -= n; pz++; text = `A − ${n} = ${A}.`; }
				else if (op === "ZEIGE") { aus.push(A); pz++; text = `A steht auf ${A} und geht an die Ausgabe.`; }
				else if (op === "SPRING") { pz = n; text = `Weiter in Zeile ${n}.`; }
				else if (op === "SPRING0") {
					if (A === 0) { pz = n; text = `A ist 0, also Sprung nach Zeile ${n}.`; }
					else { pz++; text = `A ist ${A}, nicht 0. Kein Sprung.`; }
				} else { halt = true; text = "Die Maschine hält an."; }
				logz.sag(`Zeile ${z} geholt: <b>${op}${MIT[op] ? " " + n : ""}</b>. ${text}`);
				if (aus.length > 12) { halt = true; logz.sag("Die Ausgabe läuft über. Das Programm findet kein Ende.", "schlecht"); }
				if (halt && op === "HALT") ende();
			}
			function ende() {
				const a = aus.join(" ");
				if (!frei) {
					if (!auf.ok(1)) auf.ab(1);
					const richtig = tipp === 0;
					logz.sag(`Ausgabe: <b>${a}</b>. ${richtig ? "Dein Tipp stimmt." : "Dein Tipp lag daneben."} Bei A = 0 springt die Maschine zum HALT, bevor sie die 0 zeigen könnte. Jetzt darfst du das Programm umschreiben.`, richtig ? "gut" : "");
					frei = true;
				} else if (a === "10 8 6 4 2") {
					if (!auf.ok(2)) auf.ab(2);
					logz.sag(`Ausgabe: <b>${a}</b>. Genau so. Du hast die Maschine umprogrammiert, ohne einen Draht anzufassen.`, "gut");
					api.fertig(`Dein Programm lief in ${schritte} Takten durch.`);
				} else logz.sag(`Ausgabe: <b>${a || "nichts"}</b>. Gesucht ist 10 8 6 4 2. Ändere die Zahlen hinter LADE und MINUS, setz auf Anfang und probier es noch einmal.`);
			}
			function male() {
				tab.textContent = "";
				prog.forEach((z, i) => {
					const row = el("div", { class: "pzl" + (i === pz && !halt ? " dran" : "") });
					row.appendChild(el("span", { class: "pnr" }, String(i)));
					if (frei) {
						const sel = el("select", { "aria-label": `Befehl in Zeile ${i}` });
						OPS.forEach((o) => sel.appendChild(el("option", { value: o, selected: o === z[0] }, o)));
						sel.addEventListener("change", () => { z[0] = sel.value; zurueck(); });
						row.appendChild(sel);
						if (MIT[z[0]]) {
							const inp = el("input", { type: "number", min: 0, max: 99, value: z[1], inputmode: "numeric", "aria-label": `Zahl in Zeile ${i}` });
							inp.addEventListener("change", () => { z[1] = Math.max(0, Math.min(99, Math.round(+inp.value) || 0)); zurueck(); });
							row.appendChild(inp);
						}
					} else row.appendChild(el("span", { class: "pop" }, `${z[0]}${MIT[z[0]] ? " " + z[1] : ""}`));
					tab.appendChild(row);
				});
				regs.innerHTML = `<div><small>Register A</small><b>${A}</b></div><div><small>Programmzähler</small><b>${halt ? "HALT" : pz}</b></div><div class="breit"><small>Ausgabe</small><b>${aus.join(" ") || "–"}</b></div>`;
			}
			male();
		},
		blatt: "Was in jedem Takt passiert",
		warum: `<p>Dein Prozessor tut in jedem Takt dasselbe. Er <b>holt</b> die Zeile, auf die der Programmzähler zeigt. Er <b>entschlüsselt</b>, welcher Befehl das ist. Er <b>führt</b> ihn aus und zählt den Programmzähler eins weiter. Dann von vorn. Ein echter Prozessor macht das einige Milliarden Mal pro Sekunde.</p>
			<table class="wt"><thead><tr><th>Befehl</th><th>Wirkung</th></tr></thead><tbody>
			<tr><td>LADE n</td><td>schreibt n ins Register A</td></tr><tr><td>PLUS n, MINUS n</td><td>das Addierwerk rechnet, Ergebnis nach A</td></tr>
			<tr><td>ZEIGE</td><td>gibt A aus</td></tr><tr><td>SPRING z</td><td>setzt den Programmzähler auf Zeile z</td></tr>
			<tr><td>SPRING0 z</td><td>springt nur, wenn A gerade 0 ist</td></tr><tr><td>HALT</td><td>hält die Maschine an</td></tr></tbody></table>
			<p>Der unscheinbarste Befehl ist der mächtigste: <b>SPRING0</b>. Er lässt die Maschine entscheiden. Je nachdem, was sie gerade ausgerechnet hat, macht sie hier weiter oder dort. Mit Sprüngen zurück entstehen Schleifen, mit bedingten Sprüngen Verzweigungen. Mehr braucht es nicht, um jeden Rechenweg auszudrücken, der sich überhaupt ausdrücken lässt.</p>
			<p>Die Befehle selbst sind auch nur Zahlen im Speicher, zum Beispiel 1 für LADE und 2 für PLUS. Programm und Daten liegen im selben Speicher und bestehen aus denselben Bits. Diese Idee von 1945 trägt den Namen John von Neumanns. Sie ist der Grund, warum du auf demselben Gerät rechnen, schreiben und spielen kannst: Man tauscht das Programm, nicht die Drähte.</p>`,
		merke: "Ein Prozessor holt, entschlüsselt und führt aus, immer wieder. Der bedingte Sprung macht aus dem Rechenwerk eine Maschine, die entscheiden kann.",
		quiz: { f: "Was macht der Programmzähler?", a: ["Er zählt, wie viele Programme installiert sind", "Er merkt sich, welche Befehlszeile als Nächste dran ist", "Er misst die Geschwindigkeit des Prozessors", "Er speichert das Rechenergebnis"], r: 1, e: "Nach jedem Befehl zählt er eins weiter, außer ein Sprung setzt ihn woandershin." },
	});
})();
