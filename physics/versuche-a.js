// Blätter 1 bis 6: Messen, Tempo, Fall, Kraft, Stoß, Energie.
(() => {
	"use strict";
	const { C, Z, de, klemm } = PS;
	const G = 9.81;

	// ---------- 01 Messen ----------
	PS.neu({
		id: "messen", titel: "Messen und Einheiten", massstab: "1 : 1",
		kurz: "Wie lang ist der Bolzen? Erst schätzen, dann messen.",
		bild: "Ein Bolzen liegt quer im Bild. Darüber ein Vergleichsstrich von einem Zentimeter, darunter erscheint ein Lineal.",
		frage: "Vor dir liegt ein Bolzen. Dein einziger Anhaltspunkt ist ein Strich von genau <b>1 cm</b>. Wie lang ist der Bolzen?",
		vorhersage: {
			art: "regler", n: "Deine Schätzung", text: "Schätz nach Augenmaß. Kein Lineal, kein Nachmessen.",
			min: 20, max: 120, st: 1, start: 50, tol: 5, fmt: (v) => v + " mm",
		},
		freitext: "Miss den Bolzen mit drei Geräten. Jede Messung landet als Punkt auf der Skala. Schau, wie eng die Punkte liegen und wie der Mittelwert ruhiger wird.",
		baue(api) {
			const LANG = 73, GERAET = [["Daumen", 6], ["Lineal", 1], ["Schieblehre", 0.1]];
			let lineal = 0, zeigen = api.phase === "frei", geraet = 1, einheit = 0, mess = [];
			const fmt = (v) => einheit === 0 ? de(v, 1) + " mm" : einheit === 1 ? de(v / 10, 2) + " cm" : de(v / 25.4, 3) + " Zoll";
			const zufall = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(6.283 * Math.random());
			let wLetzt, wMittel, wUns, wN;
			const zeige = () => {
				if (!wN) return;
				wN(String(mess.length));
				if (!mess.length) { wLetzt("–"); wMittel("–"); wUns("–"); return; }
				const mw = mess.reduce((a, b) => a + b, 0) / mess.length;
				const sd = Math.sqrt(mess.reduce((a, b) => a + (b - mw) ** 2, 0) / Math.max(1, mess.length - 1));
				wLetzt(fmt(mess[mess.length - 1]));
				wMittel(fmt(mw));
				wUns(mess.length > 1 ? "± " + fmt(sd / Math.sqrt(mess.length)) : "erst ab 2 Messungen");
			};
			const messe = (n) => {
				for (let i = 0; i < n; i++) mess.push(LANG + zufall() * GERAET[geraet][1]);
				if (mess.length > 400) mess = mess.slice(-400);
				zeige();
			};
			return {
				frei() {
					zeigen = true; lineal = 1;
					api.schalter({ n: "Messgerät", opt: GERAET.map((x) => x[0]), w: 1, auf(k) { geraet = k; mess = []; zeige(); } });
					api.schalter({ n: "Einheit", opt: ["mm", "cm", "Zoll"], w: 0, auf(k) { einheit = k; zeige(); } });
					api.knopf("Einmal messen", () => messe(1));
					api.knopf("10 × messen", () => messe(10));
					wLetzt = api.wert("Letzte Messung"); wMittel = api.wert("Mittelwert");
					wUns = api.wert("Unsicherheit"); wN = api.wert("Messungen");
					zeige();
				},
				start() { lineal = 0; api.laeuft = true; },
				schritt(dt) {
					lineal = Math.min(1.6, lineal + dt);
					if (lineal >= 1.6) { api.laeuft = false; api.fertig(LANG, "Dein Auge kann nur mit dem 1-cm-Strich vergleichen. Das Lineal liefert eine Zahl mit Einheit."); }
				},
				zeichne(g, W, H) {
					const m = (W - 36) / 130, x0 = 18 + 4 * m, y = H * (zeigen ? 0.2 : 0.36), dick = Math.max(12, Math.min(22, m * 8));
					Z.mass(x0, y - dick - 22, x0 + 10 * m, y - dick - 22, "1 cm", { f: C.l });
					// Bolzen: Kopf und Schaft mit Gewinde
					Z.recht(x0, y - dick, 9 * m, dick * 2, { fl: C.zz });
					Z.recht(x0 + 9 * m, y - dick * 0.55, (LANG - 9) * m, dick * 1.1, { fl: "rgba(238,244,255,.1)" });
					for (let k = 30; k < LANG - 1; k += 2.5) Z.linie(x0 + k * m, y - dick * 0.55, x0 + (k + 1.2) * m, y + dick * 0.55, { f: C.z, b: 1 });
					if (api.tipp != null) Z.text("dein Tipp: " + api.tipp + " mm", x0 + LANG * m + 10 > W - 110 ? x0 + 20 * m : x0 + LANG * m + 10, y - dick - 16, { hand: true, f: C.r, gr: 17 });
					const a = klemm(lineal, 0, 1);
					if (a > 0) {
						const ly = y + dick + 14 + (1 - a) * 30;
						g.save(); g.globalAlpha = a;
						Z.recht(x0 - 3 * m, ly, 126 * m, 30, { fl: "rgba(238,244,255,.1)" });
						for (let k = 0; k <= 120; k++) {
							if (m < 2.6 && k % 5) continue;
							Z.linie(x0 + k * m, ly, x0 + k * m, ly + (k % 10 === 0 ? 14 : k % 5 === 0 ? 10 : 6), { b: 1 });
							if (k % 10 === 0 && (m > 3.2 || k % 20 === 0)) Z.text(String(k / 10), x0 + k * m, ly + 26, { aus: "center", gr: 11 });
						}
						if (lineal > 1) {
							Z.linie(x0, y + dick, x0, ly + 14, { f: C.g, s: [3, 3] });
							Z.linie(x0 + LANG * m, y + dick * 0.55, x0 + LANG * m, ly + 14, { f: C.g, s: [3, 3] });
							Z.text("73 mm = 7,3 cm", x0 + LANG * m + 8, y + 5, { f: C.g, fett: true, gr: 15 });
						}
						g.restore();
					}
					if (!zeigen) return;
					// Messpunkte auf einer Skala rund um den wahren Wert
					const s = GERAET[geraet][1], halb = s * 4.5, sx = 24, sw = W - 48, sy = H - 34;
					const px = (v) => sx + (v - (LANG - halb)) / (2 * halb) * sw;
					Z.linie(sx, sy, sx + sw, sy, { b: 1.5 });
					for (let k = -4; k <= 4; k++) {
						const v = LANG + k * s;
						Z.linie(px(v), sy, px(v), sy + 6, { b: 1 });
						if (k % 2 === 0) Z.text(de(v, s < 1 ? 1 : 0), px(v), sy + 20, { aus: "center", gr: 12, f: C.z });
					}
					Z.text("mm", sx + sw, sy - 8, { aus: "right", gr: 12, f: C.z });
					const stapel = {};
					const oben = y + dick + 60;
					for (const v of mess) {
						const b = Math.round(klemm(px(v), sx, sx + sw) / 7);
						stapel[b] = (stapel[b] || 0) + 1;
						const yy = sy - 6 - (stapel[b] - 1) * 7;
						if (yy > oben) Z.kreis(b * 7, yy, 2.6, { fl: C.l, f: null });
					}
					if (mess.length) {
						const mw = mess.reduce((p, q) => p + q, 0) / mess.length;
						Z.linie(px(mw), oben, px(mw), sy, { f: C.g, b: 2 });
						Z.text("Mittelwert", px(mw) + (px(mw) > W - 90 ? -6 : 6), oben + 10, { f: C.g, gr: 13, fett: true, aus: px(mw) > W - 90 ? "right" : "left" });
					} else {
						Z.text("Drück unten auf „Einmal messen“.", W / 2, sy - 30, { hand: true, f: C.r, gr: 16, aus: "center" });
					}
				},
			};
		},
		warum: `<p>Eine Messung ist ein <b>Vergleich</b>: Wie oft passt die Einheit in das Ding? Ohne Einheit sagt die Zahl nichts. 73 können Millimeter sein oder Kilometer.</p>
			<p>Keine Messung ist exakt. Jedes Gerät streut: der Daumen um mehrere Millimeter, das Lineal um einen, die Schieblehre um ein Zehntel. Deshalb gehört zu jedem Messwert eine <b>Unsicherheit</b>.</p>
			<p>Wer oft misst und mittelt, wird genauer: Die Ausreißer nach oben und unten heben sich auf. Mit viermal so vielen Messungen halbiert sich die Unsicherheit des Mittelwerts.</p>`,
		formel: "Messwert = Zahl × Einheit ± Unsicherheit",
		formelText: "Beispiel: Länge = 73 mm ± 1 mm",
		quiz: {
			frage: "Du misst einen Tisch fünfmal: 119,8 cm, 120,3 cm, 120,1 cm, 119,9 cm, 119,9 cm. Was schreibst du ins Protokoll?",
			opt: ["120,3 cm, der größte Wert zur Sicherheit", "120,0 cm ± 0,1 cm", "Genau 120 cm, die Unterschiede sind Messfehler"],
			richtig: 1,
			warum: "Der Mittelwert ist 120,0 cm, und die Streuung gehört als Unsicherheit dazu.",
			tipp: "Welche Angabe benutzt alle fünf Messungen und sagt ehrlich, wie genau sie sind?",
		},
	});

	// ---------- 02 Geschwindigkeit ----------
	PS.neu({
		id: "tempo", titel: "Geschwindigkeit", massstab: "1 : 200",
		kurz: "Wagen B jagt Wagen A. Wo holt er ihn ein?",
		bild: "Zwei Wagen auf einer 60 Meter langen Schiene. Darüber ein Diagramm, das Ort und Zeit beider Wagen aufzeichnet.",
		frage: "Wagen A startet bei 20 m und fährt <b>2 m/s</b>. Wagen B startet gleichzeitig bei 0 m und fährt <b>4 m/s</b>. An welcher Stelle der Schiene holt B ihn ein?",
		vorhersage: {
			art: "regler", n: "Deine Marke", text: "Setz die rote Marke auf die Schiene: Zieh in der Zeichnung oder nimm den Regler.",
			min: 20, max: 60, st: 1, start: 30, tol: 2, fmt: (v) => v + " m",
		},
		freitext: "Ändere Tempo und Vorsprung. Im Diagramm ist jede Fahrt eine Linie: je flacher, desto schneller. Der Treffpunkt ist der Kreuzungspunkt.",
		baue(api) {
			let vA = 2, vB = 4, vor = 20, t = 0, spurA = [], spurB = [], treffGezeigt = false;
			const TM = 14;
			const treff = () => vB > vA ? vor / (vB - vA) : Infinity;
			let rA, rB, rV, wT, wO;
			const neu = () => { t = 0; spurA = []; spurB = []; treffGezeigt = false; api.laeuft = true; };
			const q = () => {
				const W = api.W, H = api.H, x0 = 30, m = (W - 50) / 60, sy = H - 34, dy = sy - 34, dh = dy - 22;
				return { W, H, x0, m, sy, dy, dh, px: (x) => x0 + x * m, py: (zeit) => dy - zeit / TM * dh };
			};
			api.zeiger({
				achse: "x",
				down(x) { if (api.laeuft) return false; api.setTipp((x - q().x0) / q().m); },
				move(x) { api.setTipp((x - q().x0) / q().m); },
			});
			return {
				frei() {
					rA = api.regler({ n: "Tempo A", min: 1, max: 5, st: 0.5, w: vA, fmt: (v) => de(v, 1) + " m/s", auf(v) { vA = v; neu(); } });
					rB = api.regler({ n: "Tempo B", min: 1, max: 8, st: 0.5, w: vB, fmt: (v) => de(v, 1) + " m/s", auf(v) { vB = v; neu(); } });
					rV = api.regler({ n: "Vorsprung von A", min: 0, max: 40, st: 2, w: vor, fmt: (v) => v + " m", auf(v) { vor = v; neu(); } });
					api.knopf("Nochmal fahren", neu);
					wT = api.wert("Treffen nach"); wO = api.wert("Treffpunkt");
				},
				start() {
					vA = 2; vB = 4; vor = 20;
					if (rA) { rA.set(2); rB.set(4); rV.set(20); }
					neu();
				},
				schritt(dt) {
					t += dt * 2.2;
					const tt = treff();
					spurA.push([vor + vA * t, t]); spurB.push([vB * t, t]);
					if (!treffGezeigt && t >= tt) treffGezeigt = true;
					if (t >= Math.min(TM, tt + 1.5) || vB * t > 60) {
						api.laeuft = false;
						api.fertig(vB * tt, "B macht pro Sekunde 2 m mehr als A. Für 20 m Vorsprung braucht er 10 s, und in 10 s fährt er 40 m.");
					}
				},
				zeichne(g, W, H) {
					const k = q(), tt = treff();
					Z.boden(k.x0, k.px(60), k.sy);
					for (let x = 0; x <= 60; x += 10) {
						Z.linie(k.px(x), k.sy, k.px(x), k.sy + 6, { b: 1 });
						Z.text(x + (x === 60 ? " m" : ""), k.px(x), k.sy + 20, { aus: "center", gr: 12, f: C.z });
						Z.linie(k.px(x), k.dy, k.px(x), k.dy - k.dh, { f: "rgba(238,244,255,.1)", b: 1 });
					}
					Z.linie(k.x0, k.dy, k.x0, k.dy - k.dh, { f: C.z, b: 1 });
					Z.linie(k.x0, k.dy, k.px(60), k.dy, { f: C.z, b: 1 });
					Z.text("Zeit", k.x0 - 4, k.dy - k.dh - 6, { gr: 12, f: C.z, aus: "left" });
					for (let s = 5; s <= 10; s += 5) Z.text(s + " s", k.x0 - 5, k.py(s) + 4, { gr: 11, f: C.z, aus: "right" });
					const zuPx = (sp) => sp.map(([x, zeit]) => [k.px(Math.min(x, 60)), k.py(zeit)]);
					Z.pfad(zuPx(spurA), { f: C.l, b: 2 });
					Z.pfad(zuPx(spurB), { f: C.g, b: 2 });
					const xA = Math.min(60, vor + vA * t), xB = Math.min(60, vB * t);
					const wagen = (x, f, name, v) => {
						Z.recht(k.px(x) - 13, k.sy - 15, 26, 11, { fl: f, f: null });
						Z.kreis(k.px(x) - 7, k.sy - 3, 3, { fl: C.b, f });
						Z.kreis(k.px(x) + 7, k.sy - 3, 3, { fl: C.b, f });
						Z.text(name, k.px(x), k.sy - 20, { aus: "center", f, fett: true, gr: 13 });
					};
					wagen(xA, C.l, "A"); wagen(xB, C.g, "B");
					if (api.tipp != null && api.phase === "tipp" || api.messlauf) {
						if (api.tipp != null) {
							Z.linie(k.px(api.tipp), k.sy - 30, k.px(api.tipp), k.sy + 2, { f: C.r, b: 2 });
							Z.text("dein Tipp", k.px(api.tipp), k.sy - 36, { hand: true, f: C.r, aus: "center", gr: 15 });
						}
					}
					if (treffGezeigt && isFinite(tt) && tt <= TM && vB * tt <= 60) {
						Z.kreis(k.px(vB * tt), k.py(tt), 5, { f: C.g, b: 2 });
						Z.linie(k.px(vB * tt), k.py(tt) + 6, k.px(vB * tt), k.sy, { f: C.g, s: [3, 4], b: 1 });
					}
					if (wT) {
						wT(isFinite(tt) ? de(tt, 1) + " s" : "nie");
						wO(isFinite(tt) ? (vB * tt <= 60 ? de(vB * tt, 1) + " m" : "hinter der Schiene") : "B ist nicht schneller");
					}
				},
			};
		},
		warum: `<p><b>Geschwindigkeit</b> sagt, wie viel Weg in einer Sekunde dazukommt. 4 m/s heißt: jede Sekunde 4 Meter weiter.</p>
			<p>Im Ort-Zeit-Bild wird jede gleichmäßige Fahrt zu einer geraden Linie. Wer schneller ist, schafft in derselben Zeit mehr Weg, seine Linie liegt flacher. Wo sich zwei Linien kreuzen, sind beide Wagen zur selben Zeit am selben Ort.</p>
			<p>Zum Rechnen zählt der <b>Unterschied</b> der Tempos: B kommt A jede Sekunde um 2 m näher. 20 m Vorsprung geteilt durch 2 m/s ergibt 10 s.</p>`,
		formel: "v = s / t",
		formelText: "Tempo = Weg geteilt durch Zeit. Umgestellt: s = v · t",
		mehr: [["math", "Mathe-Heft, Stufe 6: Geraden"]],
		quiz: {
			frage: "Ein Zug fährt 90 km in 45 Minuten. Wie schnell ist er?",
			opt: ["90 km/h", "120 km/h", "135 km/h"],
			richtig: 1,
			warum: "45 Minuten sind eine Dreiviertelstunde. 90 km geteilt durch 0,75 h sind 120 km/h.",
			tipp: "Rechne die Minuten erst in Stunden um. Wie weit käme der Zug in einer vollen Stunde?",
		},
	});

	// ---------- 03 Beschleunigung ----------
	PS.neu({
		id: "fall", titel: "Beschleunigung", massstab: "1 : 100",
		kurz: "Nach 1 s ist die Kugel 4,9 m gefallen. Wo ist sie nach 2 s?",
		bild: "Eine Kugel fällt an einer senkrechten Messlatte von 22 Metern entlang. Blitzmarken zeigen ihre Position in gleichen Zeitabständen.",
		frage: "Eine Stahlkugel fällt vom Turm. Nach <b>1 Sekunde</b> ist sie 4,9 m tief. Wie tief ist sie nach <b>2 Sekunden</b>?",
		vorhersage: {
			art: "regler", n: "Deine Marke", text: "Zieh die rote Marke an der Messlatte auf die Tiefe nach 2 Sekunden.",
			min: 5, max: 22, st: 0.5, start: 8, tol: 1.5, fmt: (v) => de(v, 1) + " m",
		},
		freitext: "Lass Kugel und Feder zusammen fallen, einmal mit Luft und einmal ohne. Schau auf die Blitzmarken: Die Abstände wachsen wie 1, 3, 5, 7.",
		baue(api) {
			let t = 0, luft = false, duo = false, y = [0, 0], v = [0, 0], marken = [[], []], naechste = 0, kurve = [];
			const q = () => {
				const W = api.W, H = api.H, oben = 26, m = (H - oben - 16) / 22, lx = Math.max(52, W * 0.16);
				return { W, H, oben, m, lx, py: (d) => oben + d * m };
			};
			const neu = () => { t = 0; y = [0, 0]; v = [0, 0]; marken = [[], []]; naechste = 0; kurve = []; api.laeuft = true; };
			let wT, wK, wF;
			api.zeiger({
				down(x, yy) { if (api.laeuft || api.phase !== "tipp") return false; api.setTipp((yy - q().oben) / q().m); },
				move(x, yy) { api.setTipp((yy - q().oben) / q().m); },
			});
			return {
				frei() {
					duo = true;
					api.schalter({ n: "Luft", opt: ["abgepumpt", "mit Luft"], w: 0, auf(k) { luft = k === 1; neu(); } });
					api.knopf("Fallen lassen", neu);
					wT = api.wert("Zeit"); wK = api.wert("Tempo Kugel"); wF = api.wert("Tempo Feder");
				},
				start() { luft = false; duo = api.phase === "frei"; neu(); },
				schritt(dt) {
					const n = 4;
					for (let i = 0; i < n; i++) {
						const h = dt / n;
						for (let k = 0; k < 2; k++) {
							const brems = luft ? (k === 0 ? 0.004 * v[k] * v[k] : (G / 1.6) * v[k]) : 0;
							v[k] += (G - brems) * h; y[k] += v[k] * h;
						}
						t += h;
						if (t >= naechste) { marken[0].push(y[0]); marken[1].push(y[1]); naechste += 0.25; }
					}
					kurve.push([t, y[0]]);
					if (api.messlauf && t >= 2) {
						api.laeuft = false;
						api.fertig(0.5 * G * 4, "Doppelte Zeit, vierfache Strecke. Die Kugel wird immer schneller, also schafft sie in der zweiten Sekunde viel mehr als in der ersten.");
					} else if (y[0] > 22 && (!duo || y[1] > 22 || t > 9)) api.laeuft = false;
				},
				zeichne(g, W, H) {
					const k = q();
					Z.linie(k.lx, k.oben, k.lx, k.py(22), { b: 2 });
					for (let d = 0; d <= 22; d++) {
						Z.linie(k.lx - (d % 5 === 0 ? 10 : 5), k.py(d), k.lx, k.py(d), { b: 1 });
						if (d % 5 === 0) Z.text(d + " m", k.lx - 14, k.py(d) + 4, { aus: "right", gr: 12, f: C.z });
					}
					const x1 = k.lx + 34, x2 = k.lx + 78;
					if (api.phase === "tipp" || api.messlauf) {
						Z.linie(k.lx, k.py(4.9), x1 + 16, k.py(4.9), { f: C.z, s: [3, 4], b: 1 });
						Z.text("nach 1 s", x1 + 20, k.py(4.9) + 4, { gr: 12, f: C.z });
						if (api.tipp != null) {
							Z.linie(k.lx - 12, k.py(api.tipp), x1 + 16, k.py(api.tipp), { f: C.r, b: 2 });
							Z.text("dein Tipp: nach 2 s", x1 + 20, k.py(api.tipp) + 5, { hand: true, f: C.r, gr: 15 });
						}
					}
					const koerper = (i, x, name) => {
						for (const d of marken[i]) if (d <= 22) Z.kreis(x, k.py(d), 3, { f: C.z, b: 1 });
						const d = Math.min(y[i], 22);
						if (i === 0) Z.kreis(x, k.py(d), 7, { fl: C.l });
						else {
							Z.linie(x, k.py(d) - 9, x, k.py(d) + 9, { b: 1.5 });
							for (let j = -3; j <= 3; j++) Z.linie(x, k.py(d) + j * 2.4, x + (j % 2 ? 6 : -6), k.py(d) + j * 2.4 - 4, { b: 1 });
						}
						Z.text(name, x, k.oben - 10, { aus: "center", gr: 12, f: C.z });
					};
					koerper(0, x1, "Kugel");
					if (duo) koerper(1, x2, "Feder");
					// Tiefe gegen Zeit
					const dx = x2 + 90, dw = W - dx - 20;
					if (dw > 110) {
						const tm = duo ? 3 : 2.2, dh = k.py(22) - k.oben;
						Z.linie(dx, k.oben, dx + dw, k.oben, { f: C.z, b: 1 });
						Z.linie(dx, k.oben, dx, k.oben + dh, { f: C.z, b: 1 });
						Z.text("Zeit", dx + dw, k.oben - 6, { aus: "right", gr: 12, f: C.z });
						Z.text("Tiefe", dx + 6, k.oben + dh - 2, { gr: 12, f: C.z });
						for (let s = 1; s <= tm; s++) {
							Z.linie(dx + s / tm * dw, k.oben, dx + s / tm * dw, k.oben + 6, { f: C.z, b: 1 });
							Z.text(s + " s", dx + s / tm * dw, k.oben + 19, { aus: "center", gr: 11, f: C.z });
						}
						Z.pfad(kurve.filter((p) => p[0] <= tm && p[1] <= 22).map(([zeit, d]) => [dx + zeit / tm * dw, k.py(d)]), { f: C.g, b: 2 });
					}
					if (wT) {
						wT(de(t, 2) + " s"); wK(de(v[0], 1) + " m/s");
						wF(duo ? de(v[1], 1) + " m/s" : "–");
					}
				},
			};
		},
		warum: `<p><b>Beschleunigung</b> sagt, wie schnell sich das Tempo ändert. Im freien Fall kommen jede Sekunde rund 9,8 m/s dazu: nach 1 s fällt die Kugel mit 9,8 m/s, nach 2 s mit 19,6 m/s.</p>
			<p>Weil das Tempo wächst, wächst der Weg mit dem <b>Quadrat der Zeit</b>. Doppelte Zeit heißt vierfache Tiefe, dreifache Zeit neunfache Tiefe.</p>
			<p>Ohne Luft fallen alle Körper gleich, Feder wie Stahlkugel. Erst die Luft bremst die Feder aus, bis sie nur noch gleichmäßig sinkt.</p>`,
		formel: "s = ½ · g · t²",
		formelText: "g ≈ 9,81 m/s² an der Erdoberfläche. Tempo nach der Zeit t: v = g · t",
		mehr: [["schwerkraft", "Wie Schwerkraft funktioniert"], ["math", "Mathe-Heft, Stufe 13: Ableitung"]],
		quiz: {
			frage: "Ein Stein fällt 3 Sekunden lang in einen Schacht (Luft vernachlässigt). Wie tief ist der Schacht ungefähr?",
			opt: ["Etwa 15 m", "Etwa 30 m", "Etwa 45 m", "Etwa 90 m"],
			richtig: 2,
			warum: "Die halbe Fallbeschleunigung sind rund 5 m/s², mal 3² = 9 ergibt etwa 45 m.",
			tipp: "Nach 1 s sind es rund 5 m. Die Tiefe wächst mit dem Quadrat der Zeit, nicht mit der Zeit selbst.",
		},
	});

	// ---------- 04 Kraft und Newton ----------
	PS.neu({
		id: "kraft", titel: "Kraft und Newton", massstab: "1 : 100",
		kurz: "Das Triebwerk geht aus. Was macht der Schlitten auf dem Eis?",
		bild: "Ein Schlitten mit Triebwerk gleitet über eine 30 Meter lange Eisbahn. Darüber zeichnet ein Diagramm sein Tempo über der Zeit.",
		frage: "Ein Schlitten steht auf spiegelglattem Eis, ohne jede Reibung. Sein Triebwerk schiebt <b>2 Sekunden</b> lang und geht dann aus. Was passiert danach?",
		vorhersage: {
			art: "wahl", text: "Was macht der Schlitten, sobald das Triebwerk aus ist?",
			opt: ["Er bleibt nach kurzer Strecke stehen.", "Er wird langsamer, rutscht aber noch ein gutes Stück.", "Er gleitet mit gleichem Tempo immer weiter."],
			richtig: 2,
		},
		freitext: "Stell Kraft, Masse und Reibung ein. Achte auf das Tempo-Diagramm: Solange eine Kraft übrig bleibt, steigt oder fällt die Linie. Ohne Kraft bleibt sie waagerecht.",
		baue(api) {
			let F = 4, m = 2, mu = 0, t = 0, x = 0, v = 0, spur = [];
			const TM = 8, BRENN = 2;
			const neu = () => { t = 0; x = 0; v = 0; spur = []; api.laeuft = true; };
			let rF, rM, rR, wA, wV;
			return {
				frei() {
					rF = api.regler({ n: "Schubkraft", min: 1, max: 10, st: 1, w: F, fmt: (k) => k + " N", auf(k) { F = k; neu(); } });
					rM = api.regler({ n: "Masse", min: 1, max: 5, st: 0.5, w: m, fmt: (k) => de(k, 1) + " kg", auf(k) { m = k; neu(); } });
					rR = api.regler({ n: "Reibung", min: 0, max: 0.2, st: 0.02, w: mu, fmt: (k) => k === 0 ? "keine" : de(k, 2), auf(k) { mu = k; neu(); } });
					api.knopf("Nochmal zünden", neu);
					wA = api.wert("Beschleunigung"); wV = api.wert("Tempo");
				},
				start() { F = 4; m = 2; mu = 0; if (rF) { rF.set(4); rM.set(2); rR.set(0); } neu(); },
				schritt(dt) {
					const schub = t < BRENN ? F : 0;
					let a = schub / m - (v > 0 || schub > mu * m * G ? mu * G : 0);
					if (v <= 0 && a < 0) a = 0;
					v = Math.max(0, v + a * dt); x += v * dt; t += dt;
					spur.push([t, v]);
					if (t >= TM || x >= 29 || (t > BRENN && v === 0)) {
						api.laeuft = false;
						api.fertig(0, "Ohne Reibung gibt es nach dem Abschalten keine Kraft mehr. Also ändert sich nichts am Tempo: Die Linie bleibt waagerecht.");
					}
				},
				zeichne(g, W, H) {
					const x0 = 26, mm = (W - 46) / 30, sy = H - 32, dy = sy - 52, dh = dy - 24, dw = W - x0 - 24;
					const vm = Math.max(6, F / m * BRENN * 1.25);
					Z.boden(x0 - 8, W - 12, sy);
					for (let k = 0; k <= 30; k += 5) {
						Z.linie(x0 + k * mm, sy, x0 + k * mm, sy + 6, { b: 1 });
						Z.text(k + (k === 30 ? " m" : ""), x0 + k * mm, sy + 20, { aus: "center", gr: 12, f: C.z });
					}
					Z.diagramm(x0, dy - dh, dw, dh, { xa: "Zeit", ya: "Tempo" });
					const bx = x0 + BRENN / TM * dw;
					Z.linie(bx, dy - dh, bx, dy, { f: C.z, s: [3, 4], b: 1 });
					Z.text("Triebwerk aus", bx + 5, dy - dh + 10, { gr: 12, f: C.z });
					Z.pfad(spur.map(([zeit, vv]) => [x0 + zeit / TM * dw, dy - Math.min(vv / vm, 1) * dh]), { f: C.g, b: 2.5 });
					const px = x0 + Math.min(x, 30) * mm;
					Z.recht(px - 16, sy - 14, 32, 12, { fl: C.l, f: null });
					Z.linie(px - 20, sy - 2, px + 20, sy - 2, { b: 2 });
					if (api.laeuft && t < BRENN) {
						Z.pfad([[px - 16, sy - 12], [px - 30 - Math.random() * 8, sy - 8], [px - 16, sy - 4]], { f: C.g, fl: C.g, zu: true });
						Z.pfeil(px + 18, sy - 24, px + 18 + F * 5, sy - 24, { f: C.g, b: 2 });
						Z.text("Schub", px + 18, sy - 30, { f: C.g, gr: 12, fett: true });
					} else if (mu > 0 && v > 0) {
						Z.pfeil(px - 18, sy - 24, px - 18 - mu * m * G * 5, sy - 24, { f: C.r, b: 2 });
						Z.text("Reibung", px - 18, sy - 30, { f: C.r, gr: 12, fett: true, aus: "right" });
					}
					if (wA) {
						const schub = api.laeuft && t < BRENN ? F : 0;
						wA(de(schub / m - (v > 0 ? mu * G : 0), 1) + " m/s²"); wV(de(v, 1) + " m/s");
					}
				},
			};
		},
		warum: `<p>Der Alltag täuscht: Auf der Erde bremst fast immer Reibung, deshalb sieht es so aus, als bräuchte Bewegung ständig Antrieb. Newton hat das umgedreht.</p>
			<p><b>Erstes Gesetz:</b> Ohne Kraft bleibt das Tempo, wie es ist. Ein Körper in Ruhe bleibt in Ruhe, einer in Fahrt fährt geradeaus weiter.</p>
			<p><b>Zweites Gesetz:</b> Eine Kraft ändert das Tempo. Je größer die Kraft, desto stärker die Beschleunigung. Je größer die Masse, desto träger reagiert der Körper. Reibung ist auch nur eine Kraft, die nach hinten zeigt.</p>`,
		formel: "F = m · a",
		formelText: "Kraft = Masse × Beschleunigung. 1 Newton beschleunigt 1 kg um 1 m/s pro Sekunde.",
		quiz: {
			frage: "Du schiebst zwei Einkaufswagen mit derselben Kraft an. Der zweite ist doppelt so schwer beladen. Wie beschleunigt er?",
			opt: ["Genauso stark, die Kraft ist ja gleich", "Halb so stark", "Ein Viertel so stark"],
			richtig: 1,
			warum: "Bei gleicher Kraft teilt sich die Beschleunigung durch die Masse: doppelte Masse, halbe Beschleunigung.",
			tipp: "Stell F = m · a nach a um. Was passiert mit a, wenn m doppelt so groß wird und F gleich bleibt?",
		},
	});

	// ---------- 05 Impuls und Stöße ----------
	PS.neu({
		id: "stoss", titel: "Impuls und Stöße", massstab: "1 : 40",
		kurz: "Ein Wagen trifft einen gleich schweren, der ruht. Und dann?",
		bild: "Zwei Wagen auf einer Schiene. Der linke rollt auf den rechten zu. Darunter Balken für den Impuls jedes Wagens und die Summe.",
		frage: "Zwei gleich schwere Wagen mit Federpuffern. Der linke rollt mit <b>2 m/s</b> auf den ruhenden rechten. Was passiert beim Stoß?",
		vorhersage: {
			art: "wahl", text: "Wie geht es nach dem Stoß weiter?",
			opt: ["Beide rollen gemeinsam mit halbem Tempo weiter.", "Der linke bleibt stehen, der rechte fährt mit 2 m/s los.", "Der linke prallt zurück, der rechte bewegt sich kaum."],
			richtig: 1,
		},
		freitext: "Ändere die Massen und mach die Puffer klebrig. Die Summe der Impulse bleibt bei jedem Stoß gleich. Die Bewegungsenergie nur beim federnden.",
		baue(api) {
			let m1 = 2, m2 = 2, kleb = false, x1, x2, v1, v2, gestossen, tNach, t;
			const br = (m) => 0.7 + 0.18 * m;
			const neu = () => { x1 = 2; x2 = 7; v1 = 2; v2 = 0; gestossen = false; tNach = 0; t = 0; api.laeuft = true; };
			neu(); api.laeuft = false;
			let r1, r2, wP, wE;
			return {
				frei() {
					r1 = api.regler({ n: "Masse links", min: 1, max: 5, st: 0.5, w: m1, fmt: (k) => de(k, 1) + " kg", auf(k) { m1 = k; neu(); } });
					r2 = api.regler({ n: "Masse rechts", min: 1, max: 5, st: 0.5, w: m2, fmt: (k) => de(k, 1) + " kg", auf(k) { m2 = k; neu(); } });
					api.schalter({ n: "Puffer", opt: ["federnd", "klebrig"], w: 0, auf(k) { kleb = k === 1; neu(); } });
					api.knopf("Nochmal stoßen", neu);
					wP = api.wert("Impuls gesamt"); wE = api.wert("Bewegungsenergie");
				},
				start() { m1 = 2; m2 = 2; if (r1) { r1.set(2); r2.set(2); } neu(); },
				schritt(dt) {
					x1 += v1 * dt * 1.4; x2 += v2 * dt * 1.4; t += dt;
					if (!gestossen && x1 + br(m1) / 2 >= x2 - br(m2) / 2) {
						gestossen = true;
						const a = v1, b = v2;
						if (kleb) v1 = v2 = (m1 * a + m2 * b) / (m1 + m2);
						else { v1 = ((m1 - m2) * a + 2 * m2 * b) / (m1 + m2); v2 = ((m2 - m1) * b + 2 * m1 * a) / (m1 + m2); }
					}
					if (gestossen) tNach += dt;
					if (tNach > 2.2 || x2 > 11.4 || x1 < 0.5) {
						api.laeuft = false;
						api.fertig(0, "Der linke Wagen gibt seinen ganzen Impuls ab. Bei gleichen Massen und Federpuffern tauschen die Wagen einfach ihre Tempos.");
					}
				},
				zeichne(g, W, H) {
					const x0 = 16, m = (W - 32) / 12, sy = H * 0.42;
					Z.boden(x0, W - 16, sy);
					const wagen = (x, mm, v, f, name) => {
						const w = br(mm) * m, h = 14 + mm * 4, px = x0 + x * m;
						Z.recht(px - w / 2, sy - h - 5, w, h, { fl: f === C.l ? "rgba(238,244,255,.22)" : "rgba(255,217,94,.2)", f });
						Z.kreis(px - w / 4, sy - 4, 4, { fl: C.b, f });
						Z.kreis(px + w / 4, sy - 4, 4, { fl: C.b, f });
						Z.text(de(mm, 1) + " kg", px, sy - h / 2 - 1, { aus: "center", gr: 12, f, fett: true });
						if (Math.abs(v) > 0.02) Z.pfeil(px, sy - h - 16, px + v * 16, sy - h - 16, { f, b: 2 });
						Z.text(de(Math.abs(v) < 0.005 ? 0 : v, 1) + " m/s", px, sy - h - 24, { aus: "center", gr: 12, f });
					};
					wagen(x1, m1, v1, C.l, "1"); wagen(x2, m2, v2, C.g, "2");
					// Impulsbalken
					const bx = W * 0.5, skala = (W * 0.42) / 10, zeile = Math.min(24, (H - sy - 40) / 4), y0 = sy + 34;
					Z.linie(bx, y0 - 8, bx, y0 + zeile * 3 + 2, { f: C.z, b: 1 });
					const balken = (i, wert, f, name) => {
						const y = y0 + i * zeile;
						Z.recht(Math.min(bx, bx + wert * skala), y, Math.abs(wert * skala), zeile - 8, { fl: f, f: null });
						Z.text(name, 16, y + zeile - 12, { gr: 12, f: C.z });
						Z.text(de(Math.abs(wert) < 0.005 ? 0 : wert, 1), wert >= 0 ? bx + wert * skala + 6 : bx + wert * skala - 6, y + zeile - 12, { gr: 12, f, aus: wert >= 0 ? "left" : "right", fett: true });
					};
					balken(0, m1 * v1, C.l, "Impuls links");
					balken(1, m2 * v2, C.g, "Impuls rechts");
					balken(2, m1 * v1 + m2 * v2, C.r, "Summe");
					if (wP) { wP(de(m1 * v1 + m2 * v2, 1) + " kg·m/s"); wE(de(0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2, 1) + " J"); }
				},
			};
		},
		warum: `<p><b>Impuls</b> ist Masse mal Tempo, mit Richtung. Er misst, wie schwer etwas aufzuhalten ist: Ein langsamer Laster hat mehr davon als ein schneller Tennisball.</p>
			<p>Beim Stoß drücken beide Wagen gleich stark und gleich lang gegeneinander, nur in entgegengesetzte Richtung. Was der eine an Impuls verliert, bekommt der andere. Die <b>Summe bleibt gleich</b>, bei jedem Stoß.</p>
			<p>Bei Federpuffern bleibt auch die Bewegungsenergie erhalten. Bei klebrigen Puffern wird ein Teil davon zu Wärme und Verformung, der Impuls bleibt trotzdem vollständig.</p>`,
		formel: "p = m · v",
		formelText: "Impulserhaltung: m₁·v₁ + m₂·v₂ ist vor und nach dem Stoß gleich.",
		quiz: {
			frage: "Ein Wagen mit 2 kg rollt mit 3 m/s auf einen ruhenden Wagen mit 1 kg. Die Puffer kleben. Wie schnell rollen beide gemeinsam weiter?",
			opt: ["1 m/s", "1,5 m/s", "2 m/s", "3 m/s"],
			richtig: 2,
			warum: "Vorher sind es 2 kg · 3 m/s = 6 kg·m/s. Nachher teilen sich 3 kg diesen Impuls: 6 geteilt durch 3 ergibt 2 m/s.",
			tipp: "Rechne den Impuls vor dem Stoß aus. Nach dem Stoß gehört er der gemeinsamen Masse.",
		},
	});

	// ---------- 06 Arbeit und Energie ----------
	PS.neu({
		id: "energie", titel: "Arbeit und Energie", massstab: "1 : 150",
		kurz: "Eine Kugel rollt durch eine Bahn. Wie hoch kommt sie drüben?",
		bild: "Eine Kugelbahn mit zwei Tälern und einem Hügel. Die Kugel startet links in 8 Metern Höhe. Balken zeigen Lageenergie, Bewegungsenergie und Wärme.",
		frage: "Die Kugel startet links in <b>8 m</b> Höhe und rollt ohne Reibung durch die Bahn. Wie hoch kommt sie am rechten Hang, bevor sie umkehrt?",
		vorhersage: {
			art: "regler", n: "Deine Marke", text: "Zieh die rote Marke am rechten Hang auf die Höhe, die die Kugel erreicht.",
			min: 0, max: 9.5, st: 0.25, start: 4, tol: 0.5, fmt: (v) => de(v, 2) + " m",
		},
		freitext: "Zieh die Punkte der Bahn hoch und runter oder nimm die Regler. Schafft die Kugel einen Hügel, der höher ist als ihr Start? Und was macht Reibung mit den Balken?",
		baue(api) {
			const P = [{ x: 0.04, h: 8 }, { x: 0.27, h: 1 }, { x: 0.5, h: 4.5 }, { x: 0.73, h: 1 }, { x: 0.96, h: 9.6 }];
			const BREIT = 30, N = 360, HMAX = 10.6;
			let xs = [], ys = [], S = [], s = 0, v = 0, E0 = 0, reib = 0, hoechst = null, gezeigt = api.phase === "frei", griff = -1;
			const baueBahn = () => {
				xs = []; ys = []; S = [0];
				for (let i = 0; i <= N; i++) {
					const xn = P[0].x + (P[4].x - P[0].x) * i / N;
					let k = 0;
					while (k < 3 && xn > P[k + 1].x) k++;
					const f = (xn - P[k].x) / (P[k + 1].x - P[k].x), c = (1 - Math.cos(Math.PI * f)) / 2;
					xs.push(xn * BREIT); ys.push(P[k].h + (P[k + 1].h - P[k].h) * c);
					if (i) S.push(S[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
				}
			};
			const ort = (ss) => {
				let a = 0, b = N;
				while (b - a > 1) { const mi = (a + b) >> 1; if (S[mi] <= ss) a = mi; else b = mi; }
				const f = klemm((ss - S[a]) / (S[b] - S[a]), 0, 1);
				return { x: xs[a] + (xs[b] - xs[a]) * f, y: ys[a] + (ys[b] - ys[a]) * f, st: (ys[b] - ys[a]) / (S[b] - S[a]) };
			};
			const neu = () => { baueBahn(); s = 0; v = 0.3; E0 = G * P[0].h + v * v / 2; hoechst = null; api.laeuft = true; };
			baueBahn(); E0 = G * P[0].h;
			const q = () => {
				const W = api.W, H = api.H, x0 = 12, m = (W - 24) / BREIT, by = H - 22, hm = (by - 16) / HMAX;
				return { W, H, by, px: (x) => x0 + x * m, py: (h) => by - h * hm, hm };
			};
			let rS, rH, wV, wH;
			api.zeiger({
				down(x, y) {
					const k = q();
					if (api.phase === "tipp") { if (api.laeuft) return false; api.setTipp((k.by - y) / k.hm); return; }
					griff = -1;
					P.forEach((p, i) => { if (i < 4 && Math.hypot(k.px(p.x * BREIT) - x, k.py(p.h) - y) < 34) griff = i; });
					if (griff < 0) return false;
				},
				move(x, y) {
					const k = q();
					if (api.phase === "tipp") { api.setTipp((k.by - y) / k.hm); return; }
					if (griff < 0) return;
					P[griff].h = klemm(Math.round((k.by - y) / k.hm * 4) / 4, griff === 0 ? 2 : 0.3, 10);
					if (griff === 0 && rS) rS.set(P[0].h);
					if (griff === 2 && rH) rH.set(P[2].h);
					baueBahn(); s = 0; v = 0; api.laeuft = false;
				},
				up() { if (griff >= 0) { griff = -1; neu(); } },
			});
			return {
				frei() {
					gezeigt = true;
					rS = api.regler({ n: "Starthöhe", min: 2, max: 10, st: 0.25, w: P[0].h, fmt: (k) => de(k, 2) + " m", auf(k) { P[0].h = k; neu(); } });
					rH = api.regler({ n: "Hügel in der Mitte", min: 0.5, max: 10, st: 0.25, w: P[2].h, fmt: (k) => de(k, 2) + " m", auf(k) { P[2].h = k; neu(); } });
					api.regler({ n: "Reibung", min: 0, max: 0.3, st: 0.02, w: 0, fmt: (k) => k === 0 ? "keine" : de(k, 2), auf(k) { reib = k; neu(); } });
					api.knopf("Kugel loslassen", neu);
					wV = api.wert("Tempo"); wH = api.wert("Höhe");
				},
				start() {
					P[0].h = 8; P[1].h = 1; P[2].h = 4.5; P[3].h = 1; reib = 0;
					if (rS) { rS.set(8); rH.set(4.5); }
					neu();
				},
				schritt(dt) {
					const n = 12;
					for (let i = 0; i < n; i++) {
						const h = dt * 1.3 / n, o = ort(s), vAlt = v;
						v += (-G * o.st - reib * v) * h;
						s += v * h;
						if (s <= 0) { s = 0; v = Math.abs(v) * 0.2; }
						if (s >= S[N]) { s = S[N]; v = 0; }
						if (vAlt > 0 && v <= 0 && o.x > P[2].x * BREIT && hoechst == null) {
							hoechst = o.y; gezeigt = true;
							api.fertig(o.y, "Die Kugel kommt genau so hoch, wie sie gestartet ist. Unterwegs wird Höhe zu Tempo und Tempo wieder zu Höhe, verloren geht dabei nichts.");
						}
					}
				},
				zeichne(g, W, H) {
					const k = q(), o = ort(s);
					const bahn = xs.map((x, i) => [k.px(x), k.py(ys[i])]);
					Z.pfad([[bahn[0][0], k.by], ...bahn, [bahn[N][0], k.by]], { f: "rgba(0,0,0,0)", fl: "rgba(238,244,255,.09)", zu: true, b: 0.01 });
					Z.pfad(bahn, { b: 2.5 });
					Z.linie(8, k.by, W - 8, k.by, { f: C.z, b: 1 });
					if (gezeigt) {
						Z.linie(k.px(xs[0]), k.py(P[0].h), k.px(xs[N]), k.py(P[0].h), { f: C.g, s: [5, 5], b: 1 });
						Z.text("Starthöhe " + de(P[0].h, 2) + " m", k.px(xs[N]) - 4, k.py(P[0].h) - 6, { f: C.g, gr: 12, aus: "right", fett: true });
					}
					if (api.phase === "frei") {
						P.forEach((p, i) => { if (i < 4) Z.kreis(k.px(p.x * BREIT), k.py(p.h), 9, { f: C.z, s: [3, 3], b: 1.5 }); });
					} else if (api.tipp != null) {
						Z.linie(k.px(BREIT * 0.74), k.py(api.tipp), k.px(xs[N]), k.py(api.tipp), { f: C.r, b: 2 });
						Z.text("dein Tipp", k.px(BREIT * 0.74) - 5, k.py(api.tipp) + 5, { hand: true, f: C.r, gr: 15, aus: "right" });
					}
					Z.kreis(k.px(o.x), k.py(o.y) - 7, 7, { fl: C.l });
					// Energiebalken über dem Hügel
					const pot = G * o.y, kin = v * v / 2, wae = Math.max(0, E0 - pot - kin);
					const bx = W * 0.3, bw = W * 0.4, zeile = 15;
					[["Lage", pot, C.l], ["Bewegung", kin, C.g], ["Wärme", wae, C.r]].forEach(([name, e, f], i) => {
						const y = 12 + i * zeile;
						Z.text(name, bx - 6, y + 9, { gr: 12, f: C.z, aus: "right" });
						Z.recht(bx, y, bw, 9, { f: C.zz, b: 1 });
						Z.recht(bx, y, bw * klemm(e / (G * 10), 0, 1), 9, { fl: f, f: null });
					});
					if (wV) { wV(de(Math.abs(v), 1) + " m/s"); wH(de(o.y, 2) + " m"); }
				},
			};
		},
		warum: `<p><b>Energie</b> ist ein Kontostand, der sich umbuchen lässt. Oben am Hang liegt alles auf dem Konto „Lage“. Beim Runterrollen wandert es aufs Konto „Bewegung“, bergauf wieder zurück.</p>
			<p>Ohne Reibung bleibt die Summe gleich. Darum erreicht die Kugel drüben exakt ihre Starthöhe, egal wie die Bahn dazwischen aussieht. Ein Hügel, der höher ist als der Start, ist nicht zu schaffen.</p>
			<p>Mit Reibung fließt bei jeder Fahrt etwas aufs Konto „Wärme“. Die Summe stimmt weiterhin, aber von dort kommt die Energie nicht von selbst zurück. Mehr dazu auf Blatt 11.</p>`,
		formel: "m · g · h = ½ · m · v²",
		formelText: "Lageenergie oben = Bewegungsenergie unten. Die Masse kürzt sich heraus.",
		mehr: [["energie", "Wie Energie funktioniert"]],
		quiz: {
			frage: "Zwei Rutschen führen aus 5 m Höhe nach unten: eine steil und kurz, eine flach und lang. Beide ohne Reibung. Auf welcher bist du unten schneller?",
			opt: ["Auf der steilen", "Auf der flachen, sie hat mehr Anlauf", "Auf beiden gleich schnell"],
			richtig: 2,
			warum: "Das Tempo unten hängt nur von der Höhe ab. Die steile Rutsche bringt dich früher ans Ziel, aber nicht schneller.",
			tipp: "Schau in die Formel: Welche Größen bestimmen v? Kommt die Form der Bahn darin vor?",
		},
	});
})();
