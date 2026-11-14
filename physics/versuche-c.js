// Blätter 12 bis 16: Strom, Induktion, Optik, Relativität, Quanten.
(() => {
	"use strict";
	const { C, Z, de, klemm } = PS;

	// Punkte gleichmäßig auf einem geschlossenen Streckenzug verteilen
	function ladungen(ecken, versatz, abstand) {
		const laengen = [], n = ecken.length;
		let ges = 0;
		for (let i = 0; i < n; i++) {
			const a = ecken[i], b = ecken[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
			laengen.push(l); ges += l;
		}
		const anzahl = Math.max(1, Math.round(ges / abstand)), schritt = ges / anzahl;
		for (let k = 0; k < anzahl; k++) {
			let s = ((k * schritt + versatz) % ges + ges) % ges, i = 0;
			while (s > laengen[i]) { s -= laengen[i]; i++; }
			const a = ecken[i], b = ecken[(i + 1) % n], f = laengen[i] ? s / laengen[i] : 0;
			Z.kreis(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 2.6, { fl: C.l, f: null });
		}
	}

	// ---------- 12 Ladung und Strom ----------
	PS.neu({
		id: "strom", titel: "Ladung und Strom", massstab: "1 : 2",
		kurz: "Eine zweite Lampe kommt in den Stromkreis. Wie hell ist die erste?",
		bild: "Ein Stromkreis mit Batterie und Lampen. Kleine Punkte zeigen, wie die Ladungen durch die Drähte wandern.",
		frage: "Eine Lampe leuchtet an einer Batterie. Jetzt wird eine <b>zweite, gleiche Lampe in Reihe</b> dazugeschaltet, also in denselben Draht dahinter. Wie hell leuchtet die erste danach?",
		vorhersage: {
			art: "wahl", text: "Die erste Lampe leuchtet mit der zweiten in Reihe …",
			opt: ["… heller als vorher.", "… genauso hell wie vorher.", "… deutlich dunkler als vorher."],
			richtig: 2,
		},
		freitext: "Schalte um zwischen Reihe und Parallel und häng mehr Lampen dran. Schau auf die wandernden Punkte: Je schneller sie laufen, desto mehr Strom fließt.",
		baue(api) {
			const R = 6;
			let U = 6, n = 1, par = false, t = 0, phase = 0;
			const strom = () => par ? U / R : U / (n * R); // Strom durch eine Lampe
			let wI, wP, wH, rN;
			return {
				frei() {
					api.schalter({ n: "Schaltung", opt: ["Reihe", "Parallel"], w: 0, auf(k) { par = k === 1; } });
					rN = api.regler({ n: "Lampen", min: 1, max: 3, st: 1, w: n, fmt: (k) => String(k), auf(k) { n = k; } });
					api.regler({ n: "Spannung", min: 1.5, max: 12, st: 1.5, w: U, fmt: (k) => de(k, 1) + " V", auf(k) { U = k; } });
					wI = api.wert("Strom aus der Batterie"); wP = api.wert("Leistung je Lampe"); wH = api.wert("Helligkeit je Lampe");
					api.laeuft = true;
				},
				start() { U = 6; n = 1; par = false; t = 0; if (rN) rN.set(1); api.laeuft = true; },
				schritt(dt) {
					t += dt; phase += strom() * dt * 46;
					if (api.messlauf) {
						if (t > 2.6 && n === 1) n = 2;
						if (t > 6) { if (rN) rN.set(2); api.fertig(0, "Zwei Lampen hintereinander bremsen den Strom doppelt so stark. Es fließt nur noch die Hälfte, und jede Lampe bekommt nur die halbe Spannung: ein Viertel der Leistung."); }
					}
				},
				zeichne(g, W, H) {
					const x1 = W * 0.13, x2 = W * 0.9, y1 = H * 0.2, y2 = H * 0.82, my = (y1 + y2) / 2;
					const i = strom(), hell = i * i * R / 6;
					const lampe = (x, y) => {
						if (hell > 0.01) Z.kreis(x, y, 15 + Math.min(hell, 3) * 13, { fl: `rgba(255,217,94,${klemm(hell * 0.38, 0.05, 0.55)})`, f: null });
						Z.kreis(x, y, 15, { fl: hell > 0.02 ? `rgba(255,217,94,${klemm(hell, 0.15, 1)})` : C.b, b: 2 });
						Z.linie(x - 10, y - 10, x + 10, y + 10, { f: hell > 0.5 ? C.b : C.l });
						Z.linie(x - 10, y + 10, x + 10, y - 10, { f: hell > 0.5 ? C.b : C.l });
					};
					// Batterie
					const batt = () => {
						Z.recht(x1 - 14, my - 16, 28, 32, { fl: C.b, f: null });
						Z.linie(x1 - 14, my - 7, x1 + 14, my - 7, { b: 2.5 });
						Z.linie(x1 - 7, my + 7, x1 + 7, my + 7, { b: 5 });
						Z.text("+", x1 - 26, my - 4, { gr: 15, fett: true, aus: "center" });
						Z.text(de(U, 1) + " V", x1 + 20, my + 5, { gr: 13, f: C.g, fett: true });
					};
					if (!par) {
						const ecken = [[x1, y2], [x1, y1], [x2, y1], [x2, y2]];
						Z.pfad(ecken, { zu: true, b: 2 });
						ladungen(ecken, phase, 24);
						for (let k = 0; k < n; k++) lampe(x1 + (x2 - x1) * (k + 1) / (n + 1), y1);
					} else {
						Z.pfad([[x1, y2], [x1, y1], [x2, y1]], { b: 2 });
						Z.linie(x1, y2, x2, y2, { b: 2 });
						for (let k = 0; k < n; k++) {
							const x = x2 - (x2 - x1 - 70) * k / 3;
							Z.linie(x, y1, x, y2, { b: 2 });
							ladungen([[x1, y2], [x1, y1], [x, y1], [x, y2]], phase + k * 9, 24);
							lampe(x, my);
						}
					}
					batt();
					if (api.messlauf && n === 1) Z.text("Gleich kommt Lampe 2 dazu.", W / 2, y2 - 16, { hand: true, f: C.r, gr: 16, aus: "center" });
					if (wI) {
						wI(de(par ? i * n : i, 2) + " A"); wP(de(i * i * R, 1) + " W");
						wH(Math.round(hell * 100) + " % der Einzellampe an 6 V");
					}
				},
			};
		},
		warum: `<p><b>Strom</b> ist wandernde Ladung. Die Batterie drückt die Ladungen an, das ist die <b>Spannung</b>. Die Lampe bremst sie, das ist der <b>Widerstand</b>. Ladungen werden dabei nicht verbraucht: Hinter der Lampe kommen so viele an wie vorn hineingehen. Verbraucht wird ihre Energie.</p>
			<p>In <b>Reihe</b> müssen alle Ladungen durch beide Lampen. Der Widerstand verdoppelt sich, der Strom halbiert sich, und die Spannung teilt sich auf.</p>
			<p><b>Parallel</b> bekommt jede Lampe die volle Spannung und ihren eigenen Strom. Alle leuchten voll, aber die Batterie muss mehr liefern und ist schneller leer. So sind die Steckdosen in deiner Wohnung geschaltet.</p>`,
		formel: "U = R · I",
		formelText: "Spannung = Widerstand × Strom. Leistung: P = U · I",
		mehr: [["strom", "Wie Strom funktioniert"]],
		quiz: {
			frage: "Bei einer alten Lichterkette sind alle Lämpchen in Reihe geschaltet. Eines brennt durch. Was passiert?",
			opt: ["Nur dieses Lämpchen bleibt dunkel.", "Alle Lämpchen gehen aus.", "Die anderen leuchten heller, weil sie mehr Strom abbekommen."],
			richtig: 1,
			warum: "In der Reihenschaltung gibt es nur einen Weg. Ist er an einer Stelle unterbrochen, fließt nirgends mehr Strom.",
			tipp: "Wie viele Wege hat die Ladung in einer Reihenschaltung?",
		},
	});

	// ---------- 13 Magnetismus und Induktion ----------
	PS.neu({
		id: "induktion", titel: "Magnetismus und Induktion", massstab: "1 : 2",
		kurz: "Ein Magnet ruht mitten in der Spule. Fließt Strom?",
		bild: "Ein Stabmagnet wird in eine Drahtspule geschoben. Ein Zeigerinstrument über der Spule zeigt die Spannung, darunter läuft eine Schreiberkurve.",
		frage: "Ein starker Magnet wird in eine Drahtspule geschoben und bleibt dann <b>mitten in der Spule liegen</b>. An der Spule hängt ein Messgerät. Was zeigt es an, während der Magnet dort ruht?",
		vorhersage: {
			art: "wahl", text: "Solange der Magnet in der Spule ruht, zeigt das Messgerät …",
			opt: ["… dauerhaft viel Strom, denn dort ist das Feld am stärksten.", "… gar nichts.", "… einen schwachen, gleichmäßigen Strom."],
			richtig: 1,
		},
		freitext: "Schieb den Magneten mit dem Finger durch die Spule: langsam, schnell, hin und her. Dreh ihn um. Strom gibt es nur, während sich etwas ändert.",
		baue(api) {
			let u = 0.15, alt = 0.15, pol = 1, wind = 1.5, U = 0, t = 0, spur = [], schuettel = false, halten = false;
			const fluss = (p) => 1 / Math.pow(1 + ((p - 0.5) / 0.11) ** 2, 1.5);
			const glatt = (a) => a * a * (3 - 2 * a);
			let wU;
			api.zeiger({
				achse: "x",
				down(x) { if (api.phase !== "frei") return false; halten = true; schuettel = false; this.move(x); },
				move(x) { u = klemm(x / api.W, 0.1, 0.9); },
				up() { halten = false; },
			});
			return {
				frei() {
					api.schalter({ n: "Pol vorn", opt: ["Nord", "Süd"], w: 0, auf(k) { pol = k ? -1 : 1; } });
					api.regler({ n: "Windungen", min: 50, max: 300, st: 50, w: 150, fmt: (k) => String(k), auf(k) { wind = k / 100; } });
					api.knopf("Automatisch schütteln", () => { schuettel = !schuettel; t = 0; });
					wU = api.wert("Spannung");
					api.laeuft = true;
				},
				start() { u = alt = 0.15; pol = 1; wind = 1.5; t = 0; U = 0; spur = []; schuettel = false; api.laeuft = true; },
				schritt(dt) {
					t += dt;
					if (api.messlauf) {
						u = t < 1 ? 0.15 : t < 2 ? 0.15 + 0.35 * glatt(t - 1) : t < 5.5 ? 0.5 : t < 6.5 ? 0.5 + 0.35 * glatt(t - 5.5) : 0.85;
						if (t > 7.6) api.fertig(0, "Der Zeiger schlägt nur aus, während der Magnet sich bewegt. Ruht er, ändert sich das Feld in der Spule nicht, und nichts treibt die Ladungen an.");
					} else if (schuettel && !halten) u = 0.5 + 0.3 * Math.sin(t * 3.2);
					const roh = dt > 0 ? -pol * wind * (fluss(u) - fluss(alt)) / dt : 0;
					alt = u;
					U += (roh - U) * Math.min(1, dt * 16);
					spur.push(U); if (spur.length > 300) spur.shift();
				},
				zeichne(g, W, H) {
					const cy = H * 0.5, sw = Math.min(W * 0.24, 150), sr = Math.min(H * 0.16, 54), cx = W / 2;
					const ml = Math.min(W * 0.26, 150), mh = sr * 0.8, mx = u * W;
					const schleife = (vorn) => {
						g.save(); g.strokeStyle = C.l; g.lineWidth = 2;
						for (let k = 0; k <= 8; k++) {
							const x = cx - sw / 2 + k * sw / 8;
							g.beginPath(); g.ellipse(x, cy, sr * 0.28, sr, 0, vorn ? -Math.PI / 2 : Math.PI / 2, vorn ? Math.PI / 2 : Math.PI * 1.5); g.stroke();
						}
						g.restore();
					};
					schleife(false);
					Z.recht(mx - ml / 2, cy - mh / 2, ml / 2, mh, { fl: pol > 0 ? "rgba(18,63,134,.95)" : C.r, b: 2 });
					Z.recht(mx, cy - mh / 2, ml / 2, mh, { fl: pol > 0 ? C.r : "rgba(18,63,134,.95)", b: 2 });
					Z.text(pol > 0 ? "S" : "N", mx - ml / 4, cy + 6, { aus: "center", fett: true, gr: 17, f: pol > 0 ? C.l : C.bd });
					Z.text(pol > 0 ? "N" : "S", mx + ml / 4, cy + 6, { aus: "center", fett: true, gr: 17, f: pol > 0 ? C.bd : C.l });
					schleife(true);
					// Zuleitung und Messgerät
					const gy = Math.max(42, H * 0.17), gr = Math.min(40, H * 0.13);
					Z.pfad([[cx - sw / 2, cy - sr], [cx - sw / 2, gy], [cx - gr, gy]], { b: 1.5 });
					Z.pfad([[cx + sw / 2, cy - sr], [cx + sw / 2, gy], [cx + gr, gy]], { b: 1.5 });
					g.save(); g.fillStyle = C.b; g.strokeStyle = C.l; g.lineWidth = 2;
					g.beginPath(); g.arc(cx, gy, gr, Math.PI, 0); g.closePath(); g.fill(); g.stroke(); g.restore();
					for (let k = -2; k <= 2; k++) {
						const a = -Math.PI / 2 + k * 0.55;
						Z.linie(cx + Math.cos(a) * gr * 0.82, gy + Math.sin(a) * gr * 0.82, cx + Math.cos(a) * gr * 0.96, gy + Math.sin(a) * gr * 0.96, { b: 1 });
					}
					const na = -Math.PI / 2 + klemm(U / 7, -1, 1) * 1.15;
					Z.linie(cx, gy, cx + Math.cos(na) * gr * 0.8, gy + Math.sin(na) * gr * 0.8, { f: C.g, b: 2.5 });
					Z.kreis(cx, gy, 3, { fl: C.g, f: null });
					// Schreiber
					const bw = Math.min(W - 28, 360), bh = 36, bx = (W - bw) / 2, by = H - bh - 14, ty = Math.min(cy + sr + 26, by - 6);
					Z.linie(bx, by + bh / 2, bx + bw, by + bh / 2, { f: C.zz, b: 1 });
					Z.pfad(spur.map((v, i) => [bx + i / 300 * bw, by + bh / 2 - klemm(v / 7, -1, 1) * bh / 2]), { f: C.g, b: 1.5 });
					Z.text("Spannung", bx, by + bh + 4, { gr: 11, f: C.z });
					if (api.messlauf) Z.text(t < 1 ? "Magnet draußen" : t < 2 ? "rein …" : t < 5.5 ? "Magnet ruht in der Spule" : t < 6.5 ? "raus …" : "Magnet draußen", W / 2, ty, { hand: true, f: C.r, gr: 17, aus: "center" });
					else if (api.phase === "frei" && !schuettel && !halten && Math.abs(U) < 0.05) Z.text("Zieh den Magneten hin und her.", W / 2, ty, { hand: true, f: C.r, gr: 17, aus: "center" });
					if (wU) wU(de(Math.abs(U) < 0.05 ? 0 : U, 1) + " V");
				},
			};
		},
		warum: `<p>Blatt 12 hat gezeigt: Strom braucht einen Antrieb. Michael Faraday fand 1831 einen ohne Batterie. Ein Magnetfeld, das sich <b>ändert</b>, schiebt die Ladungen im Draht an. Das heißt <b>Induktion</b>.</p>
			<p>Entscheidend ist das Wort „ändert“. Ein noch so starker Magnet, der ruht, bewirkt nichts. Je schneller sich das Feld in der Spule ändert und je mehr Windungen sie hat, desto höher die Spannung. Beim Herausziehen dreht sich die Richtung um.</p>
			<p>Fast der gesamte Strom der Welt entsteht so: In jedem Kraftwerk und jedem Windrad dreht sich ein Magnet in einer Spule oder eine Spule um einen Magneten.</p>`,
		formel: "U = −N · ΔΦ / Δt",
		formelText: "Spannung = Windungszahl × Änderung des magnetischen Flusses pro Zeit.",
		mehr: [["magnet", "Wie Magnete funktionieren"], ["strom", "Wie Strom funktioniert: Generator"]],
		quiz: {
			frage: "Ein Fahrraddynamo liefert Strom, solange du fährst. Warum bleibt das Licht aus, wenn du stehst?",
			opt: ["Im Stand ist der Magnet im Dynamo zu schwach.", "Der Magnet dreht sich nicht, also ändert sich das Feld in der Spule nicht.", "Der Dynamo braucht den Fahrtwind zur Kühlung."],
			richtig: 1,
			warum: "Nur ein sich änderndes Magnetfeld erzeugt Spannung. Steht das Rad, steht der Magnet.",
			tipp: "Was musste der Magnet im Versuch tun, damit der Zeiger ausschlug?",
		},
	});

	// ---------- 14 Licht und Optik ----------
	PS.neu({
		id: "optik", titel: "Licht und Optik", massstab: "1 : 1",
		kurz: "Ein Laserstrahl trifft schräg aufs Wasser. Wohin läuft er weiter?",
		bild: "Ein Laserstrahl trifft schräg von oben auf eine Wasseroberfläche. Das Lot ist gestrichelt eingezeichnet.",
		frage: "Ein Laserstrahl trifft unter <b>50°</b> zum Lot auf eine Wasseroberfläche. Das Lot ist die gestrichelte Senkrechte. Wie läuft der Strahl im Wasser weiter?",
		vorhersage: {
			art: "regler", n: "Dein Strahl im Wasser", text: "Zeichne den Strahl im Wasser ein: Zieh in der unteren Hälfte oder stell den Winkel zum Lot ein.",
			min: 0, max: 90, st: 1, start: 50, tol: 5, fmt: (v) => v + "°",
		},
		freitext: "Zieh den Laser herum, tausch den Stoff und leuchte von unten nach oben. Ab einem bestimmten Winkel kommt von unten gar kein Licht mehr heraus.",
		baue(api) {
			const STOFF = [["Wasser", 1.33], ["Glas", 1.5], ["Diamant", 2.42]];
			let alpha = 50, stoff = 0, unten = false, fort = api.phase === "frei" ? 2 : 0;
			const grad = Math.PI / 180;
			const rechne = () => {
				const n = STOFF[stoff][1], s = unten ? n * Math.sin(alpha * grad) : Math.sin(alpha * grad) / n;
				return { n, total: s > 1, beta: s > 1 ? null : Math.asin(s) / grad, grenz: Math.asin(1 / n) / grad };
			};
			let rA, wB, wG;
			api.zeiger({
				down(x, y) { if (api.laeuft) return false; this.move(x, y); },
				move(x, y) {
					const cx = api.W / 2, cy = api.H / 2;
					if (api.phase === "tipp") { if (y > cy + 4) api.setTipp(Math.atan2(Math.abs(x - cx), y - cy) / grad); return; }
					const dy = unten ? y - cy : cy - y;
					if (dy < 4) return;
					alpha = klemm(Math.round(Math.atan2(Math.abs(x - cx), dy) / grad), 0, 89);
					if (rA) rA.set(alpha);
				},
			});
			return {
				frei() {
					fort = 2;
					rA = api.regler({ n: "Einfallswinkel", min: 0, max: 89, st: 1, w: alpha, fmt: (k) => k + "°", auf(k) { alpha = k; } });
					api.schalter({ n: "Stoff unten", opt: STOFF.map((x) => x[0]), w: 0, auf(k) { stoff = k; } });
					api.schalter({ n: "Laser", opt: ["von oben", "von unten"], w: 0, auf(k) { unten = k === 1; } });
					wB = api.wert("Brechungswinkel"); wG = api.wert("Grenzwinkel von unten");
				},
				start() { alpha = 50; stoff = 0; unten = false; fort = 0; if (rA) rA.set(50); api.laeuft = true; },
				schritt(dt) {
					fort += dt * 1.1;
					if (fort >= 2.4) {
						api.laeuft = false;
						api.fertig(35, "Der Strahl knickt zum Lot hin. Im Wasser ist Licht langsamer, und beim schrägen Eintritt wird die eine Seite der Wellenfront früher gebremst als die andere.");
					}
				},
				zeichne(g, W, H) {
					const cx = W / 2, cy = H / 2, r = Math.min(W * 0.46, H * 0.47), e = rechne();
					Z.recht(0, cy, W, H - cy, { fl: "rgba(238,244,255,.13)", f: null });
					Z.linie(0, cy, W, cy, { b: 2 });
					Z.linie(cx, cy - r, cx, cy + r, { f: C.z, s: [5, 5], b: 1 });
					Z.text("Lot", cx + 5, cy - r + 10, { gr: 12, f: C.z });
					Z.text("Luft", 12, cy - 10, { gr: 13, f: C.z });
					Z.text(STOFF[stoff][0], 12, cy + 20, { gr: 13, f: C.z });
					const o = unten ? 1 : -1, a = alpha * grad;
					const qx = cx - Math.sin(a) * r, qy = cy + o * Math.cos(a) * r;
					const f1 = klemm(fort, 0, 1), f2 = klemm(fort - 1, 0, 1);
					Z.linie(qx, qy, qx + (cx - qx) * f1, qy + (cy - qy) * f1, { f: C.g, b: 3 });
					Z.kreis(qx, qy, 6, { fl: C.g, f: null });
					Z.text("Laser", qx + (qx < 60 ? 10 : -10), qy + o * 20, { gr: 12, f: C.g, aus: qx < 60 ? "left" : "right", fett: true });
					g.save(); g.strokeStyle = C.g; g.lineWidth = 1; g.beginPath();
					if (unten) g.arc(cx, cy, 30, Math.PI / 2, Math.PI / 2 + a); else g.arc(cx, cy, 30, -Math.PI / 2 - a, -Math.PI / 2);
					g.stroke(); g.restore();
					Z.text(alpha + "°", cx - 12 - Math.sin(a / 2) * 34, cy + o * Math.cos(a / 2) * 46 + 4, { gr: 13, f: C.g, aus: "center", fett: true });
					if (f2 > 0) {
						if (!e.total) {
							const b = e.beta * grad;
							Z.linie(cx, cy, cx + Math.sin(b) * r * f2, cy - o * Math.cos(b) * r * f2, { f: C.g, b: 3 });
							Z.text(de(e.beta, 0) + "°", cx + 14 + Math.sin(b / 2) * 34, cy - o * Math.cos(b / 2) * 46 + 4, { gr: 13, f: C.g, aus: "center", fett: true });
						}
						Z.linie(cx, cy, cx + Math.sin(a) * r * f2, cy + o * Math.cos(a) * r * f2, { f: C.g, b: e.total ? 3 : 1, s: e.total ? null : [2, 5] });
						if (e.total && f2 >= 1) Z.text("Totalreflexion: nichts kommt heraus", cx, cy - 16, { gr: 14, f: C.g, aus: "center", fett: true });
					}
					if ((api.phase === "tipp" || api.messlauf) && api.tipp != null) {
						const b = api.tipp * grad;
						Z.linie(cx, cy, cx + Math.sin(b) * r, cy + Math.cos(b) * r, { f: C.r, b: 2, s: [7, 5] });
						Z.text("dein Tipp", cx + Math.sin(b) * r * 0.8 + 8, cy + Math.cos(b) * r * 0.8, { hand: true, f: C.r, gr: 15 });
					}
					if (wB) { wB(e.total ? "Totalreflexion" : de(e.beta, 1) + "°"); wG(de(e.grenz, 1) + "°"); }
				},
			};
		},
		warum: `<p>Licht ist in Wasser und Glas langsamer als in Luft. Trifft es schräg auf die Grenze, wird es an einer Seite zuerst gebremst und schwenkt deshalb zum Lot hin. Das ist <b>Brechung</b>. Je stärker ein Stoff das Licht bremst, desto stärker der Knick.</p>
			<p>Die Zahl dafür ist die <b>Brechzahl</b> n: Wasser 1,33, Glas 1,5, Diamant 2,42. Sie sagt, um welchen Faktor das Licht dort langsamer ist.</p>
			<p>Von unten nach oben knickt der Strahl vom Lot weg. Ab dem Grenzwinkel müsste er flacher als die Oberfläche laufen. Das geht nicht, also wird er vollständig gespiegelt. Diese <b>Totalreflexion</b> hält das Licht in Glasfasern gefangen und lässt Diamanten funkeln.</p>`,
		formel: "n₁ · sin α = n₂ · sin β",
		formelText: "Brechungsgesetz von Snellius. Luft hat n ≈ 1.",
		mehr: [["licht", "Licht und Farben"], ["internet", "Wie das Internet funktioniert"]],
		quiz: {
			frage: "Ein Strohhalm im Wasserglas sieht an der Oberfläche geknickt aus. Warum?",
			opt: ["Das Wasser verbiegt den Strohhalm ein wenig.", "Das Licht vom unteren Teil wird beim Austritt aus dem Wasser gebrochen und kommt aus einer anderen Richtung ins Auge.", "Das Glas wirkt wie ein Spiegel und zeigt ein versetztes Bild."],
			richtig: 1,
			warum: "Dein Auge verlängert die Lichtstrahlen geradeaus nach hinten. Weil sie an der Oberfläche geknickt wurden, landet das Bild an der falschen Stelle.",
			tipp: "Der Strohhalm selbst bleibt gerade. Was passiert mit dem Licht auf dem Weg vom Halm zu deinem Auge?",
		},
	});

	// ---------- 15 Relativität ----------
	PS.neu({
		id: "relativ", titel: "Relativität", massstab: "1 : 1 Mrd.",
		kurz: "Eine Rakete mit 87 % Lichttempo. Wie schnell tickt ihre Uhr?",
		bild: "Zwei Lichtuhren. In jeder springt ein Lichtblitz zwischen zwei Spiegeln hin und her. Die obere ruht, die untere fliegt in einer Rakete vorbei.",
		frage: "Eine Lichtuhr tickt jedes Mal, wenn ihr Lichtblitz einen Spiegel trifft. Eine baugleiche Uhr fliegt in einer Rakete mit <b>87 % der Lichtgeschwindigkeit</b> an dir vorbei. Licht ist für alle gleich schnell. Wie tickt die Uhr in der Rakete, von dir aus gesehen?",
		vorhersage: {
			art: "wahl", text: "Von dir aus gesehen tickt die Uhr in der Rakete …",
			opt: ["… genauso schnell wie deine.", "… halb so schnell wie deine.", "… doppelt so schnell wie deine."],
			richtig: 1,
		},
		freitext: "Stell das Tempo der Rakete ein. Bei Alltagstempo merkst du nichts. Nahe der Lichtgeschwindigkeit wird der Zickzackweg des Lichts immer länger, und die Uhr immer langsamer.",
		baue(api) {
			let beta = 0.866, t = 0, weg = [];
			const HALB = 0.5; // Sekunden je Tick der ruhenden Uhr
			const gamma = () => 1 / Math.sqrt(1 - beta * beta);
			let wG, wS;
			const neu = () => { t = 0; weg = []; api.laeuft = true; };
			return {
				frei() {
					api.regler({ n: "Tempo der Rakete", min: 0, max: 0.99, st: 0.01, w: beta, fmt: (k) => Math.round(k * 100) + " % von c", auf(k) { beta = k; neu(); } });
					wG = api.wert("Zeitdehnung"); wS = api.wert("1 s in der Rakete dauert für dich");
					neu();
				},
				start() { beta = 0.866; neu(); },
				schritt(dt) {
					t += dt;
					if (api.messlauf && t / HALB >= 10) api.fertig(0, "Das Licht in der Rakete muss schräg laufen und hat einen doppelt so langen Weg. Weil es nicht schneller werden kann, dauert jeder Tick doppelt so lang.");
				},
				zeichne(g, W, H) {
					const zh = (H - 24) / 2, hc = zh - 52, c = hc / HALB, gm = gamma();
					const drei = (ph) => { const f = ph % 2; return f < 1 ? f : 2 - f; };
					const uhr = (x, yo, ph, f, name, ticks) => {
						Z.linie(x - 22, yo, x + 22, yo, { b: 3, f });
						Z.linie(x - 22, yo + hc, x + 22, yo + hc, { b: 3, f });
						Z.kreis(x, yo + hc - drei(ph) * hc, 5, { fl: C.g, f: null });
						return ticks;
					};
					// Ruhende Uhr
					const y1 = 30, x1 = Math.max(46, W * 0.12);
					Z.linie(x1, y1, x1, y1 + hc, { f: C.zz, s: [3, 4], b: 1 });
					uhr(x1, y1, t / HALB, C.l);
					Z.text("Deine Uhr", x1 + 34, y1 + 14, { gr: 14, fett: true });
					Z.text("Ticks: " + Math.floor(t / HALB), x1 + 34, y1 + 34, { gr: 16, f: C.g, fett: true });
					// Rakete
					const y2 = y1 + zh + 12, bahn = W + 120, xr = (beta * c * t) % bahn - 60, ph = t / (HALB * gm);
					Z.linie(0, y2 + hc + 16, W, y2 + hc + 16, { f: C.zz, b: 1 });
					const py = y2 + hc - drei(ph) * hc;
					if (api.laeuft) {
						if (weg.length && xr < weg[weg.length - 1][0]) weg = [];
						weg.push([xr, py]); if (weg.length > 500) weg.shift();
					}
					Z.pfad(weg, { f: C.g, b: 1.5, s: [3, 4] });
					Z.pfad([[xr - 34, y2 - 10], [xr + 30, y2 - 10], [xr + 52, y2 + hc / 2], [xr + 30, y2 + hc + 10], [xr - 34, y2 + hc + 10]], { zu: true, f: C.z, b: 1.5 });
					uhr(xr, y2, ph, C.l);
					Z.text("Rakete, " + Math.round(beta * 100) + " % von c", 12, y2 - 16, { gr: 14, fett: true });
					Z.text("Ticks: " + Math.floor(ph), W - 12, y2 - 16, { gr: 16, f: C.g, fett: true, aus: "right" });
					if (wG) { wG(de(gm, 2) + "-fach"); wS(de(gm, 2) + " s"); }
				},
			};
		},
		warum: `<p>Einsteins Ausgangspunkt: Die <b>Lichtgeschwindigkeit</b> ist für jeden Beobachter gleich, egal wie schnell er sich bewegt. Michelson und Morley haben das 1887 als Erste gemessen, seither wurde es vielfach bestätigt.</p>
			<p>In der Rakete läuft der Lichtblitz für die Besatzung senkrecht auf und ab. Von außen gesehen fliegt die Uhr dabei zur Seite, der Blitz läuft im Zickzack. Sein Weg ist länger, sein Tempo dasselbe, also braucht er mehr Zeit. Die bewegte Uhr geht langsamer: <b>Zeitdilatation</b>.</p>
			<p>Das gilt für jede Uhr, auch für Herzschlag und Atomzerfall. Im Alltag ist der Effekt winzig. GPS-Satelliten müssen ihn trotzdem einrechnen, sonst läge deine Position nach einem Tag um Kilometer daneben.</p>`,
		formel: "Δt = γ · Δt₀  mit  γ = 1 / √(1 − v²/c²)",
		formelText: "Bei 87 % von c ist γ = 2. Die Herleitung braucht nur den Pythagoras aus dem Mathe-Heft.",
		mehr: [["math", "Mathe-Heft, Stufe 9: Pythagoras"], ["ereignishorizont", "Ereignishorizont"]],
		quiz: {
			frage: "Myonen entstehen in 10 km Höhe und zerfallen so schnell, dass sie selbst mit fast Lichtgeschwindigkeit nur etwa 600 m weit kommen dürften. Trotzdem erreichen viele den Erdboden. Warum?",
			opt: ["Sie fliegen in Wahrheit schneller als das Licht.", "Von der Erde aus gesehen läuft ihre innere Uhr langsamer, sie leben also länger.", "Die Luft bremst ihren Zerfall."],
			richtig: 1,
			warum: "Bei ihrem Tempo ist γ etwa 20 bis 40. Ihre Lebensdauer dehnt sich von uns aus gesehen entsprechend, und das reicht bis zum Boden.",
			tipp: "Was passiert mit einer Uhr, die sich sehr schnell an dir vorbeibewegt? Der Zerfall eines Myons ist auch eine Uhr.",
		},
	});

	// ---------- 16 Quanten ----------
	PS.neu({
		id: "quanten", titel: "Quanten", massstab: "1 Mio. : 1",
		kurz: "Elektronen fliegen einzeln durch zwei Spalte. Welches Muster entsteht?",
		bild: "Eine Elektronenquelle, eine Wand mit zwei Spalten und ein Schirm. Jedes Elektron hinterlässt einen Punkt auf dem Schirm. Rechts zählt ein Diagramm die Treffer.",
		frage: "Eine Quelle schießt Elektronen <b>einzeln</b> auf eine Wand mit zwei schmalen Spalten. Dahinter steht ein Schirm, auf dem jedes Elektron einen Punkt hinterlässt. Welches Muster siehst du nach vielen tausend Treffern?",
		vorhersage: {
			art: "wahl", text: "Auf dem Schirm entstehen …",
			opt: ["… zwei Streifen, einer hinter jedem Spalt.", "… viele Streifen nebeneinander, wie bei Wellen.", "… gleichmäßig verteilte Punkte ohne Muster."],
			richtig: 1,
		},
		freitext: "Schalte den Detektor an den Spalten ein. Er meldet für jedes Elektron, durch welchen Spalt es ging. Schau, was mit den Streifen passiert.",
		baue(api) {
			const B = 120;
			let bins = new Array(B).fill(0), punkte = [], n = 0, t = 0, rate = 300, detektor = false, streifen = 3.5, rest = 0, blitz = 0, spalt = 0;
			const leeren = () => { bins = new Array(B).fill(0); punkte = []; n = 0; };
			const wkt = (y) => detektor
				? Math.exp(-(((y - 0.28) / 0.26) ** 2)) + Math.exp(-(((y + 0.28) / 0.26) ** 2))
				: Math.cos(Math.PI * y * streifen) ** 2 * Math.exp(-((y / 0.55) ** 2));
			const wirf = () => {
				for (let k = 0; k < 200; k++) {
					const y = Math.random() * 2 - 1;
					if (Math.random() < wkt(y)) {
						bins[Math.min(B - 1, Math.floor((y + 1) / 2 * B))]++;
						punkte.push([Math.random(), y]); if (punkte.length > 5000) punkte.shift();
						n++; blitz = 1; spalt = y + (Math.random() - 0.5) * 0.5 > 0 ? 1 : -1;
						return;
					}
				}
			};
			let wN;
			return {
				frei() {
					api.schalter({ n: "Detektor an den Spalten", opt: ["aus", "an"], w: 0, auf(k) { detektor = k === 1; leeren(); } });
					api.regler({ n: "Elektronen pro Sekunde", min: 1, max: 600, st: 1, w: 300, fmt: (k) => String(k), auf(k) { rate = k; } });
					api.regler({ n: "Abstand der Spalte", min: 2, max: 6, st: 0.5, w: 3.5, fmt: (k) => de(k * 0.2, 1) + " µm", auf(k) { streifen = k; leeren(); } });
					api.knopf("Schirm leeren", leeren);
					wN = api.wert("Treffer");
					api.laeuft = true;
				},
				start() { detektor = false; streifen = 3.5; leeren(); t = 0; rest = 0; api.laeuft = true; },
				schritt(dt) {
					t += dt; blitz = Math.max(0, blitz - dt * 6);
					const r = api.messlauf ? (t < 2.5 ? 5 : Math.min(500, 5 + (t - 2.5) * 140)) : rate;
					rest += r * dt;
					while (rest >= 1) { wirf(); rest--; }
					if (api.messlauf && t > 9.5) api.fertig(0, "Jedes Elektron kommt als einzelner Punkt an, wie ein Teilchen. Aber wo es landet, folgt einem Wellenmuster mit Streifen, obwohl immer nur ein Elektron unterwegs war.");
				},
				zeichne(g, W, H) {
					const cy = H / 2, hh = H / 2 - 16, qx = W * 0.07, wx = W * 0.36, sx = W * 0.62, sw = Math.max(34, W * 0.12), hx = sx + sw + 12, hw = W - hx - 12;
					// Quelle
					Z.recht(qx - 14, cy - 12, 28, 24, { fl: C.b, b: 2 });
					Z.text("Quelle", qx - 14, cy + 30, { gr: 12, f: C.z });
					if (blitz > 0) Z.kreis(qx + 20, cy, 3 + blitz * 4, { fl: `rgba(255,217,94,${blitz})`, f: null });
					// Wand mit zwei Spalten
					const so = hh * 0.2, sp = Math.max(5, hh * 0.05);
					Z.linie(wx, cy - hh, wx, cy - so - sp, { b: 4 });
					Z.linie(wx, cy - so + sp, wx, cy + so - sp, { b: 4 });
					Z.linie(wx, cy + so + sp, wx, cy + hh, { b: 4 });
					Z.text("Doppelspalt", wx + 8, cy - hh + 12, { gr: 12, f: C.z });
					if (detektor) {
						for (const s of [-1, 1]) {
							const an = blitz > 0.2 && spalt === s;
							Z.kreis(wx + 12, cy + s * so, 6, { fl: an ? C.r : C.b, f: C.r, b: 2 });
						}
						Z.text("Detektor", wx + 24, cy + 5, { hand: true, gr: 15, f: C.r });
					} else if (W > 430) {
						Z.text("Was hier passiert,", (qx + wx) / 2 + 10, cy - 26, { hand: true, gr: 14, f: C.z, aus: "center" });
						Z.text("sieht niemand.", (qx + wx) / 2 + 10, cy - 9, { hand: true, gr: 14, f: C.z, aus: "center" });
					}
					// Schirm
					Z.recht(sx, cy - hh, sw, hh * 2, { fl: "rgba(12,47,107,.7)", b: 1.5 });
					Z.text("Schirm", sx, cy - hh - 4, { gr: 12, f: C.z });
					g.save(); g.fillStyle = C.l;
					for (const [a, b] of punkte) g.fillRect(sx + 2 + a * (sw - 4), cy + b * hh - 0.75, 1.5, 1.5);
					g.restore();
					// Zählung
					if (hw > 30) {
						const max = Math.max(4, ...bins), zh = hh * 2 / B;
						Z.linie(hx, cy - hh, hx, cy + hh, { f: C.z, b: 1 });
						g.save(); g.fillStyle = C.g;
						for (let i = 0; i < B; i++) if (bins[i]) g.fillRect(hx, cy - hh + i * zh, bins[i] / max * hw, Math.max(1, zh - 0.5));
						g.restore();
						Z.text("Treffer", hx + 4, cy - hh - 4, { gr: 12, f: C.z });
					}
					Z.text(n + " Elektronen", 12, H - 10, { gr: 14, f: C.g, fett: true });
					if (wN) wN(String(n));
				},
			};
		},
		warum: `<p>Streifen kennst du von Blatt 9: Sie entstehen, wenn Wellen aus zwei Öffnungen sich überlagern. Hier fliegen aber einzelne Elektronen, eines nach dem anderen. Jedes hinterlässt genau einen Punkt. Und trotzdem ordnen sich die Punkte zu Streifen.</p>
			<p>Die Quantenphysik beschreibt das so: Zu jedem Elektron gehört eine <b>Welle von Möglichkeiten</b>, die durch beide Spalte läuft und mit sich selbst interferiert. Sie legt fest, wo das Elektron wahrscheinlich landet. Wo ein einzelnes Elektron auftrifft, ist Zufall, die Verteilung vieler Treffer lässt sich dagegen genau vorhersagen.</p>
			<p>Misst du nach, durch welchen Spalt jedes Elektron geht, verschwinden die Streifen. Die Messung verändert also, was passiert. Das ist seltsam, und es ist eines der am besten geprüften Ergebnisse der Physik.</p>`,
		formel: "λ = h / p",
		formelText: "De Broglie: Jedes Teilchen mit Impuls p hat eine Wellenlänge λ. h ist das Plancksche Wirkungsquantum.",
		mehr: [["atom", "Atome und Radioaktivität"], ["licht", "Licht und Farben"]],
		quiz: {
			frage: "Mit dem Detektor an den Spalten verschwinden die Streifen. Was zeigt das?",
			opt: ["Der Detektor bremst die Elektronen so stark, dass sie nicht mehr bis zum Rand kommen.", "Sobald feststeht, durch welchen Spalt ein Elektron ging, gibt es keine Überlagerung beider Wege mehr.", "Elektronen sind in Wahrheit kleine Kugeln, und die Streifen waren ein Messfehler."],
			richtig: 1,
			warum: "Interferenz braucht beide Möglichkeiten zugleich. Die Weg-Information macht aus dem „beide“ ein „entweder oder“, und zurück bleiben zwei Flecken.",
			tipp: "Wofür brauchten die Wellen auf Blatt 9 zwei Quellen? Was nimmt der Detektor dem Elektron weg?",
		},
	});
})();
