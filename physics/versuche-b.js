// Blätter 7 bis 11: Umlaufbahn, Pendel, Wellen, Auftrieb, Entropie.
(() => {
	"use strict";
	const { C, Z, de, klemm } = PS;
	const G = 9.81;

	// ---------- 07 Kreisbahn und Gravitation ----------
	PS.neu({
		id: "orbit", titel: "Kreisbahn und Gravitation", massstab: "1 : 100 Mio.",
		kurz: "Eine Kanone schießt waagerecht mit 7,9 km/s. Wo landet die Kugel?",
		bild: "Die Erde von der Seite. Auf einem sehr hohen Berg steht eine Kanone und schießt waagerecht. Die Flugbahn der Kugel wird eingezeichnet.",
		frage: "Newtons Gedankenversuch: Eine Kanone auf einem riesigen Berg schießt waagerecht, ohne Luftwiderstand. Bei wenig Tempo fällt die Kugel bald zu Boden. Was passiert bei genau <b>7,9 km/s</b>?",
		vorhersage: {
			art: "wahl", text: "Was macht die Kugel bei 7,9 km/s?",
			opt: ["Sie landet sehr weit weg, auf der anderen Seite der Erde.", "Sie fällt um die ganze Erde herum und kommt von hinten wieder an.", "Sie fliegt geradeaus ins All davon."],
			richtig: 1,
		},
		freitext: "Schieß mit wenig und mit viel Tempo. Finde die Grenze zwischen Absturz, Kreis, Ellipse und Flucht. Die Kugel fällt in jedem Fall, die ganze Zeit.",
		baue(api) {
			const R0 = 1.12, VK = Math.sqrt(1 / R0), KMS = 7.9 / VK;
			let tempo = 7.9, x, y, vx, vy, spur = [], winkel, status = "bereit", zeit = 0;
			const neu = () => {
				x = 0; y = R0; vx = tempo / KMS; vy = 0; spur = []; winkel = 0; zeit = 0; status = "fliegt"; api.laeuft = true;
			};
			x = 0; y = R0;
			const ende = (s) => {
				status = s; api.laeuft = false;
				api.fertig(0, "Die Kugel fällt ununterbrochen. Aber sie ist so schnell, dass der Boden sich genauso schnell unter ihr wegkrümmt, wie sie fällt. Das ist eine Umlaufbahn.");
			};
			let wS, wH;
			return {
				frei() {
					api.regler({ n: "Abschusstempo", min: 2, max: 12, st: 0.1, w: tempo, fmt: (k) => de(k, 1) + " km/s", auf(k) { tempo = k; neu(); } });
					api.knopf("Feuer", neu);
					wS = api.wert("Ergebnis"); wH = api.wert("Höhe über dem Boden");
				},
				start() { tempo = 7.9; neu(); },
				schritt(dt) {
					const n = 30, h = dt * 1.5 / n;
					for (let i = 0; i < n; i++) {
						let r = Math.hypot(x, y), a0 = Math.atan2(x, y);
						vx += -x / (r * r * r) * h * 0.5; vy += -y / (r * r * r) * h * 0.5;
						x += vx * h; y += vy * h;
						r = Math.hypot(x, y);
						vx += -x / (r * r * r) * h * 0.5; vy += -y / (r * r * r) * h * 0.5;
						let d = Math.atan2(x, y) - a0;
						if (d < -Math.PI) d += 2 * Math.PI; if (d > Math.PI) d -= 2 * Math.PI;
						winkel += d; zeit += h;
						if (r < 1) return ende("Aufschlag nach " + Math.round(winkel * 6371 / 100) * 100 + " km");
						if (r > 9) return ende("entkommen ins All");
						if (winkel >= 2 * Math.PI) return ende(Math.abs(tempo - 7.9) < 0.15 ? "Kreisbahn: einmal rundherum" : "Ellipse: einmal rundherum");
					}
					spur.push([x, y]);
					if (spur.length > 2400) spur.shift();
				},
				zeichne(g, W, H) {
					const cx = W / 2, cy = H * 0.56, rp = Math.min(W, H) * 0.19;
					const px = (a) => cx + a * rp, py = (b) => cy - b * rp;
					Z.kreis(cx, cy, rp, { fl: "rgba(238,244,255,.12)", b: 2 });
					for (let k = -2; k <= 2; k++) {
						const hh = k * rp / 3, halb = Math.sqrt(rp * rp - hh * hh);
						Z.linie(cx - halb, cy + hh, cx + halb, cy + hh, { f: C.zz, b: 1 });
					}
					Z.text("Erde", cx, cy + 5, { aus: "center", f: C.z, gr: 14 });
					Z.pfad([[px(-0.07), py(0.995)], [px(0), py(R0)], [px(0.07), py(0.995)]], { fl: C.b, b: 1.5 });
					Z.kreis(cx, cy, rp * R0, { f: C.zz, s: [2, 6], b: 1 });
					Z.pfad(spur.map(([a, b]) => [px(a), py(b)]), { f: C.g, b: 2 });
					Z.kreis(px(x), py(y), 4.5, { fl: C.l });
					if (status === "bereit" || zeit < 0.5) {
						Z.pfeil(px(0) + 8, py(R0) - 12, px(0) + 8 + tempo * 5, py(R0) - 12, { f: C.g, b: 2 });
						Z.text(de(tempo, 1) + " km/s", px(0) + 10, py(R0) - 20, { f: C.g, gr: 13, fett: true });
					}
					if (status !== "bereit" && status !== "fliegt") Z.text(status, 14, H - 14, { f: C.g, gr: 15, fett: true });
					if (wS) { wS(status); wH(Math.max(0, Math.round((Math.hypot(x, y) - 1) * 6371 / 10) * 10) + " km"); }
				},
			};
		},
		warum: `<p>Die <b>Schwerkraft</b> zieht die Kugel zum Erdmittelpunkt, egal wie schnell sie seitwärts fliegt. Auf 5 m Fallstrecke braucht sie immer rund eine Sekunde.</p>
			<p>Die Erde ist rund: Nach etwa 8 km Strecke ist der Boden um 5 m weggekrümmt. Wer in einer Sekunde 8 km zur Seite schafft, fällt deshalb immer am Boden vorbei. Er fällt im Kreis.</p>
			<p>Mit weniger Tempo trifft die Kugel irgendwo auf. Mit mehr wird der Kreis zur Ellipse. Ab 11,2 km/s kommt sie nie mehr zurück. Der Mond macht seit Milliarden Jahren nichts anderes als diese Kanonenkugel.</p>`,
		formel: "F = G · m₁ · m₂ / r²",
		formelText: "Die Anziehung fällt mit dem Quadrat des Abstands. Doppelt so weit weg: ein Viertel der Kraft.",
		mehr: [["schwerkraft", "Wie Schwerkraft funktioniert"], ["ereignishorizont", "Ereignishorizont"]],
		quiz: {
			frage: "Warum schweben Astronautinnen und Astronauten in der Raumstation?",
			opt: ["In 400 km Höhe gibt es keine Schwerkraft mehr.", "Station und Besatzung fallen gemeinsam um die Erde, also drückt nichts gegeneinander.", "Die Fliehkraft hebt die Schwerkraft dort auf."],
			richtig: 1,
			warum: "Die Schwerkraft ist dort noch etwa 90 % so stark wie am Boden. Aber alles fällt gleich schnell, und im freien Fall spürst du dein Gewicht nicht.",
			tipp: "Denk an die Kanonenkugel: Hört sie in der Umlaufbahn auf zu fallen?",
		},
	});

	// ---------- 08 Schwingungen ----------
	PS.neu({
		id: "pendel", titel: "Schwingungen", massstab: "1 : 10",
		kurz: "Zwei Pendel, eines doppelt so schwer. Welches schwingt schneller?",
		bild: "Zwei Fadenpendel gleicher Länge hängen nebeneinander. Die rechte Kugel ist doppelt so schwer wie die linke.",
		frage: "Zwei Pendel mit gleich langem Faden. An einem hängt eine Kugel von 1 kg, am anderen eine von <b>2 kg</b>. Beide werden gleich weit ausgelenkt und gleichzeitig losgelassen. Wie lange braucht das schwere für eine Schwingung?",
		vorhersage: {
			art: "wahl", text: "Das schwere Pendel braucht für eine Schwingung …",
			opt: ["… länger als das leichte.", "… genauso lang.", "… kürzer als das leichte."],
			richtig: 1,
		},
		freitext: "Zieh die Kugel mit dem Finger zur Seite und lass los. Verändere Länge, Masse und Auslenkung. Nur eine der drei Größen ändert die Schwingungsdauer deutlich.",
		baue(api) {
			let Lg = 1, masse = 1, th = 0.44, om = 0, t = 0, duo = api.phase !== "frei", halten = false;
			let letzter = null, periode = null, zahl = 0;
			const neu = (winkel) => { th = winkel; om = 0; t = 0; letzter = null; periode = null; zahl = 0; api.laeuft = true; };
			const q = () => {
				const W = api.W, H = api.H;
				return { W, H, m: (H - 78) / 2.05, py: 22 };
			};
			let rA, wM, wF;
			api.zeiger({
				down(x, y) {
					if (duo) return false;
					halten = true; this.move(x, y);
				},
				move(x, y) {
					const k = q();
					th = klemm(Math.atan2(x - k.W / 2, y - k.py), -1.45, 1.45); om = 0;
					if (rA) rA.set(Math.round(Math.abs(th) * 180 / Math.PI));
				},
				up() { halten = false; neu(th); },
			});
			return {
				frei() {
					duo = false;
					api.regler({ n: "Fadenlänge", min: 0.3, max: 2, st: 0.05, w: Lg, fmt: (k) => de(k, 2) + " m", auf(k) { Lg = k; neu(th || 0.35); } });
					api.regler({ n: "Masse", min: 0.5, max: 5, st: 0.5, w: masse, fmt: (k) => de(k, 1) + " kg", auf(k) { masse = k; neu(Math.abs(th) > 0.05 ? th : 0.35); } });
					rA = api.regler({ n: "Auslenkung", min: 5, max: 80, st: 1, w: 25, fmt: (k) => k + "°", auf(k) { neu(k * Math.PI / 180); } });
					wM = api.wert("Gemessene Dauer"); wF = api.wert("Formel für kleine Winkel");
					neu(0.44);
				},
				start() { duo = true; Lg = 1; neu(0.44); },
				schritt(dt) {
					if (halten) return;
					const n = 8, h = dt / n;
					for (let i = 0; i < n; i++) {
						const alt = th;
						om += -(G / Lg) * Math.sin(th) * h; th += om * h; t += h;
						if (alt < 0 && th >= 0) {
							if (letzter != null) { periode = t - letzter; zahl++; }
							letzter = t;
						}
					}
					if (api.messlauf && zahl >= 3) {
						api.laeuft = false;
						api.fertig(0, "Beide Kugeln schwingen im Gleichtakt. Die schwere wird stärker gezogen, ist aber genauso viel träger. Das hebt sich exakt auf.");
					}
				},
				zeichne(g, W, H) {
					const k = q();
					const einPendel = (cx, kg) => {
						const bx = cx + Math.sin(th) * Lg * k.m, by = k.py + Math.cos(th) * Lg * k.m, r = 7 + Math.cbrt(kg) * 6;
						Z.linie(cx - 30, k.py, cx + 30, k.py, { b: 2 });
						for (let i = -3; i <= 3; i++) Z.linie(cx + i * 9, k.py, cx + i * 9 + 6, k.py - 7, { f: C.zz, b: 1 });
						Z.linie(cx, k.py, cx, k.py + Lg * k.m + 24, { f: C.zz, s: [4, 5], b: 1 });
						g.save(); g.strokeStyle = C.zz; g.lineWidth = 1; g.setLineDash([2, 5]);
						g.beginPath(); g.arc(cx, k.py, Lg * k.m, Math.PI / 2 - 1.45, Math.PI / 2 + 1.45); g.stroke(); g.restore();
						Z.linie(cx, k.py, bx, by, { b: 1.5 });
						Z.kreis(bx, by, r, { fl: C.l });
						Z.text(de(kg, 1) + " kg", bx, by + r + 16, { aus: "center", gr: 12, f: C.z });
					};
					if (duo) { einPendel(W * 0.3, 1); einPendel(W * 0.7, 2); }
					else {
						einPendel(W / 2, masse);
						if (halten || (!api.laeuft && api.phase === "frei")) Z.text("loslassen", W / 2, H - 12, { hand: true, f: C.r, gr: 16, aus: "center" });
					}
					if (periode != null) Z.text("eine Schwingung: " + de(periode, 2) + " s", 14, H - 14, { f: C.g, gr: 15, fett: true });
					if (wM) { wM(periode != null ? de(periode, 2) + " s" : "läuft …"); wF(de(2 * Math.PI * Math.sqrt(Lg / G), 2) + " s"); }
				},
			};
		},
		warum: `<p>Ein Pendel schwingt, weil die Schwerkraft es immer zurück zur Mitte zieht und die Trägheit es darüber hinausträgt. Jede <b>Schwingung</b> braucht diese beiden Zutaten: eine Kraft, die zurückzieht, und Schwung, der über die Mitte hinausführt.</p>
			<p>Die Dauer einer Schwingung hängt fast nur von der <b>Fadenlänge</b> ab. Die Masse kürzt sich heraus, wie beim freien Fall auf Blatt 3. Die Auslenkung spielt bei kleinen Winkeln keine Rolle, erst bei großen wird das Pendel merklich langsamer.</p>
			<p>Genau deshalb taugt ein Pendel als Uhr: Es hält seinen Takt, auch wenn es mit der Zeit schwächer ausschlägt.</p>`,
		formel: "T = 2π · √(l / g)",
		formelText: "Vierfache Fadenlänge: doppelte Schwingungsdauer. Die Masse kommt nicht vor.",
		mehr: [["energie", "Wie Energie funktioniert: Pendel"], ["schall", "Musik und Schall"]],
		quiz: {
			frage: "Eine Pendeluhr geht zu schnell. Was hilft?",
			opt: ["Das Pendelgewicht schwerer machen", "Das Pendel verlängern", "Das Pendel weniger weit ausschlagen lassen"],
			richtig: 1,
			warum: "Ein längeres Pendel braucht länger für eine Schwingung, die Uhr tickt langsamer.",
			tipp: "Welche Größe steht in der Formel für die Schwingungsdauer, und in welche Richtung muss sie sich ändern?",
		},
	});

	// ---------- 09 Wellen ----------
	PS.neu({
		id: "wellen", titel: "Wellen", massstab: "1 : 20",
		kurz: "Zwei Wellen treffen sich: Berg auf Tal. Was macht das Wasser?",
		bild: "Eine Wellenwanne von oben. Zwei Tupfer A und B erzeugen Kreiswellen. Am Punkt P schwimmt ein Korken.",
		frage: "Tupfer A macht Wellen. Am Punkt P wippt ein Korken auf und ab. Gleich kommt Tupfer B dazu. P liegt so, dass dort immer ein <b>Berg von A</b> gleichzeitig mit einem <b>Tal von B</b> ankommt. Was macht der Korken dann?",
		vorhersage: {
			art: "wahl", text: "Sobald beide Tupfer laufen, wippt der Korken bei P …",
			opt: ["… doppelt so hoch.", "… fast gar nicht mehr.", "… genauso wie vorher."],
			richtig: 1,
		},
		freitext: "Zieh A, B und den Korken P durch die Wanne. Such Stellen, an denen sich die Wellen aufschaukeln, und Stellen, an denen sie sich auslöschen. Der Wegunterschied verrät es.",
		baue(api) {
			let lam = 1, t = 0, tB = 4, bAn = true, A = { x: 3.2, y: 2 }, B = { x: 6.8, y: 2 }, P = { x: 7, y: 4 }, griff = null, hoehe = [];
			const F = 1.1, puffer = document.createElement("canvas");
			const einh = () => api.W / 10;
			const lege = () => {
				const hU = api.H / einh();
				A = { x: 3.2, y: hU * 0.3 }; B = { x: 6.8, y: hU * 0.3 };
				const py = hU * 0.78;
				let a = 5, b = 9.6;
				for (let i = 0; i < 30; i++) {
					const mi = (a + b) / 2;
					if (Math.hypot(mi - A.x, py - A.y) - Math.hypot(mi - B.x, py - B.y) < 0.5 * lam) a = mi; else b = mi;
				}
				P = { x: a, y: py };
			};
			let gelegt = 0;
			const ampl = (x, y, zeit) => {
				const r1 = Math.hypot(x - A.x, y - A.y), r2 = Math.hypot(x - B.x, y - B.y), c = lam * F;
				let s = 0;
				if (r1 < c * zeit) s += Math.cos(6.2832 * (r1 / lam - F * zeit)) / (1 + 0.07 * r1);
				if (bAn && r2 < c * (zeit - tB)) s += Math.cos(6.2832 * (r2 / lam - F * zeit)) / (1 + 0.07 * r2);
				return s;
			};
			let wD, wP;
			api.zeiger({
				down(x, y) {
					if (api.phase !== "frei") return false;
					const e = einh(); griff = null; let best = 44;
					for (const p of [A, B, P]) { const d = Math.hypot(p.x * e - x, p.y * e - y); if (d < best) { best = d; griff = p; } }
					if (!griff) return false;
				},
				move(x, y) { if (griff) { const e = einh(); griff.x = klemm(x / e, 0.3, 9.7); griff.y = klemm(y / e, 0.3, api.H / e - 0.3); hoehe = []; } },
				up() { griff = null; },
			});
			return {
				frei() {
					t = 100; tB = 0;
					api.schalter({ n: "Tupfer B", opt: ["an", "aus"], w: 0, auf(k) { bAn = k === 0; hoehe = []; } });
					api.regler({ n: "Wellenlänge", min: 0.5, max: 2, st: 0.1, w: 1, fmt: (k) => de(k * 10, 0) + " cm", auf(k) { lam = k; hoehe = []; } });
					api.regler({ n: "Abstand A zu B", min: 1, max: 7, st: 0.2, w: 3.6, fmt: (k) => de(k * 10, 0) + " cm", auf(k) { A.x = 5 - k / 2; B.x = 5 + k / 2; A.y = B.y; hoehe = []; } });
					wD = api.wert("Wegunterschied bei P"); wP = api.wert("Bei P");
					api.laeuft = true;
				},
				start() { lam = 1; bAn = true; lege(); gelegt = api.W; t = 0; tB = 4; hoehe = []; api.laeuft = true; },
				schritt(dt) {
					t += dt;
					hoehe.push(ampl(P.x, P.y, t));
					if (hoehe.length > 260) hoehe.shift();
					if (api.messlauf && t > 10.5) {
						api.fertig(0, "Berg und Tal heben sich auf: Das Wasser bei P bleibt fast ruhig, obwohl von beiden Seiten Wellen ankommen. Ein paar Zentimeter weiter schaukeln sie sich dagegen auf.");
						tB = 0; t = 100;
					}
				},
				zeichne(g, W, H) {
					if (api.phase !== "frei" && gelegt !== W && !api.messlauf) { lege(); gelegt = W; }
					const e = einh(), cw = Math.ceil(W / 4), ch = Math.ceil(H / 4);
					if (puffer.width !== cw || puffer.height !== ch) { puffer.width = cw; puffer.height = ch; }
					const pg = puffer.getContext("2d"), bild = pg.createImageData(cw, ch), d = bild.data;
					const zeit = api.laeuft ? t : 0;
					for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
						const a = zeit > 0 ? ampl((i + 0.5) * 4 / e, (j + 0.5) * 4 / e, zeit) : 0, o = (j * cw + i) * 4;
						d[o] = 18 + a * 70; d[o + 1] = 63 + a * 68; d[o + 2] = 134 + a * 55; d[o + 3] = 255;
					}
					pg.putImageData(bild, 0, 0);
					g.save(); g.imageSmoothingEnabled = true; g.drawImage(puffer, 0, 0, W, H); g.restore();
					const tupfer = (p, name, an) => {
						Z.kreis(p.x * e, p.y * e, 7, { fl: an ? C.g : C.b, f: C.g, b: 2 });
						Z.text(name, p.x * e, p.y * e - 13, { aus: "center", f: C.g, fett: true, gr: 14 });
					};
					tupfer(A, "A", true); tupfer(B, "B", bAn && t > tB);
					const hub = hoehe.length ? hoehe[hoehe.length - 1] : 0;
					Z.kreis(P.x * e, P.y * e, 6 + hub * 2.5, { fl: C.l, f: C.b });
					Z.text("P", P.x * e + 12, P.y * e + 5, { fett: true, gr: 14 });
					// Höhe bei P als Schreiberkurve
					const bw = Math.min(170, W * 0.42), bh = 46, bx = 10, by = H - bh - 10;
					Z.recht(bx, by, bw, bh, { fl: "rgba(12,47,107,.85)", f: C.z, b: 1 });
					Z.text("Höhe bei P", bx + 6, by + 13, { gr: 11, f: C.z });
					Z.pfad(hoehe.map((v, i) => [bx + i / 260 * bw, by + bh / 2 + 4 - v * 9]), { f: C.g, b: 1.5 });
					if (api.messlauf && t < tB) Z.text("B startet in " + Math.ceil(tB - t) + " s", bx + bw + 10, H - 16, { hand: true, f: C.r, gr: 16 });
					if (wD) {
						const diff = Math.abs(Math.hypot(P.x - A.x, P.y - A.y) - Math.hypot(P.x - B.x, P.y - B.y)) / lam, rest = diff % 1;
						wD(de(diff, 2) + " Wellenlängen");
						wP(!bAn ? "nur Welle A" : Math.abs(rest - 0.5) < 0.12 ? "Auslöschung" : (rest < 0.12 || rest > 0.88) ? "Verstärkung" : "dazwischen");
					}
				},
			};
		},
		warum: `<p>Eine <b>Welle</b> transportiert Bewegung, kein Material. Der Korken wippt auf der Stelle, während die Welle unter ihm durchläuft.</p>
			<p>Treffen zwei Wellen aufeinander, zählen ihre Auslenkungen einfach zusammen. Berg auf Berg ergibt einen doppelten Berg. Berg auf Tal ergibt Ruhe. Das heißt <b>Interferenz</b>.</p>
			<p>Welcher Fall eintritt, entscheidet der Wegunterschied zu den beiden Quellen. Ist er eine ganze Wellenlänge, verstärken sich die Wellen. Ist er eine halbe, löschen sie sich aus. Dieses Streifenmuster kommt auf Blatt 16 wieder, an einer Stelle, wo es niemand erwartet hat.</p>`,
		formel: "c = λ · f",
		formelText: "Ausbreitungstempo = Wellenlänge × Frequenz. Auslöschung bei Wegunterschied λ/2, 3λ/2, …",
		mehr: [["schall", "Musik und Schall"], ["radio", "Wie Radio funktioniert"], ["licht", "Licht und Farben"]],
		quiz: {
			frage: "Wie machen Kopfhörer mit Geräuschunterdrückung den Lärm leiser?",
			opt: ["Sie dämmen den Schall mit besonders dichtem Schaumstoff.", "Sie spielen denselben Lärm noch einmal ab, um eine halbe Welle verschoben.", "Sie spielen ein lauteres Rauschen, das den Lärm überdeckt."],
			richtig: 1,
			warum: "Ein Mikrofon nimmt den Lärm auf, der Lautsprecher erzeugt die Gegenwelle. Berg trifft Tal, am Ohr bleibt wenig übrig.",
			tipp: "Wann löschen sich zwei Wellen aus? Übertrag das von der Wasserwanne auf Schall.",
		},
	});

	// ---------- 10 Druck und Auftrieb ----------
	PS.neu({
		id: "auftrieb", titel: "Druck und Auftrieb", massstab: "1 : 5",
		kurz: "Ein Holzklotz fällt ins Wasser. Wie tief taucht er ein?",
		bild: "Ein Wasserbecken im Schnitt. Darüber hängt ein Holzklotz. Pfeile zeigen Gewicht und Auftrieb.",
		frage: "Ein Holzklotz hat die Dichte <b>0,6 g/cm³</b>, Wasser hat 1,0 g/cm³. Der Klotz fällt ins Becken und kommt zur Ruhe. Welcher Anteil von ihm liegt dann unter Wasser?",
		vorhersage: {
			art: "regler", n: "Deine Wasserlinie", text: "Zeichne die Wasserlinie auf den Klotz: Wie viel Prozent liegen unter Wasser?",
			min: 0, max: 100, st: 5, start: 30, tol: 7, fmt: (v) => v + " %",
		},
		freitext: "Drück den Klotz mit dem Finger unter Wasser und lass los. Mach ihn schwerer als Wasser. Und probier Quecksilber: Darin schwimmt sogar Eisen.",
		baue(api) {
			const FL = [["Öl", 0.9], ["Wasser", 1], ["Salzwasser", 1.2], ["Quecksilber", 13.5]];
			let rb = 0.6, fl = 1, d = -0.7, v = 0, t = 0, halten = false;
			const q = () => {
				const W = api.W, H = api.H, bh = Math.min(H * 0.26, 110), bw = bh * 1.25;
				const oben = H * 0.4, unten = H - 18;
				return { W, H, bh, bw, oben, unten, tief: (unten - oben) / bh, x1: W * 0.14, x2: W * 0.86 };
			};
			const neu = () => { d = -0.7; v = 0; t = 0; api.laeuft = true; };
			let wE, wK;
			api.zeiger({
				down(x, y) { if (api.phase !== "frei") return false; halten = true; this.move(x, y); },
				move(x, y) { const k = q(); d = klemm((y + k.bh / 2 - k.oben) / k.bh, -1.2, k.tief); v = 0; },
				up() { halten = false; t = 0; api.laeuft = true; },
			});
			return {
				frei() {
					api.regler({ n: "Dichte des Klotzes", min: 0.1, max: 3, st: 0.1, w: rb, fmt: (k) => de(k, 1) + " g/cm³", auf(k) { rb = k; t = 0; api.laeuft = true; } });
					api.schalter({ n: "Flüssigkeit", opt: FL.map((x) => x[0]), w: 1, auf(k) { fl = k; t = 0; api.laeuft = true; } });
					api.knopf("Von oben fallen lassen", neu);
					wE = api.wert("Unter der Oberfläche"); wK = api.wert("Auftrieb zu Gewicht");
				},
				start() { rb = 0.6; fl = 1; neu(); },
				schritt(dt) {
					if (halten) return;
					const k = q(), rf = FL[fl][1], n = 6, h = dt * 2.2 / n;
					for (let i = 0; i < n; i++) {
						const tauch = klemm(d, 0, 1);
						const a = 9 * (1 - rf / rb * tauch) - (d > 0 ? 2.6 + rf * 0.4 : 0.02) * v;
						v += a * h; d += v * h;
						if (d > k.tief) { d = k.tief; v = 0; }
					}
					t += dt;
					if (api.messlauf && t > 1.5 && (Math.abs(v) < 0.004 || t > 9)) {
						api.laeuft = false;
						api.fertig(60, "Der Klotz sinkt so weit ein, bis das verdrängte Wasser so viel wiegt wie er selbst. Bei Dichte 0,6 sind das 60 % seines Volumens.");
					}
				},
				zeichne(g, W, H) {
					const k = q(), rf = FL[fl][1], tauch = klemm(d, 0, 1);
					Z.recht(k.x1, k.oben, k.x2 - k.x1, k.unten - k.oben, { fl: fl === 3 ? "rgba(238,244,255,.32)" : fl === 0 ? "rgba(255,217,94,.16)" : "rgba(238,244,255,.14)", f: null });
					Z.pfad([[k.x1, k.oben - 34], [k.x1, k.unten], [k.x2, k.unten], [k.x2, k.oben - 34]], { b: 2 });
					Z.linie(k.x1, k.oben, k.x2, k.oben, { b: 1.5 });
					Z.text(FL[fl][0] + " · " + de(rf, 1) + " g/cm³", k.x1 + 10, k.unten - 10, { gr: 13, f: C.z });
					const cx = W / 2, unten = k.oben + d * k.bh, obenK = unten - k.bh;
					Z.recht(cx - k.bw / 2, obenK, k.bw, k.bh, { fl: "rgba(18,63,134,.9)", b: 2 });
					for (let i = 1; i < 5; i++) Z.linie(cx - k.bw / 2 + 4, obenK + i * k.bh / 5, cx + k.bw / 2 - 4, obenK + i * k.bh / 5 + (i % 2 ? 3 : -3), { f: C.zz, b: 1 });
					Z.text(de(rb, 1) + " g/cm³", cx, obenK - 8, { aus: "center", gr: 13, f: C.z });
					if (api.phase === "tipp" || api.messlauf) {
						if (api.tipp != null) {
							const ty = unten - api.tipp / 100 * k.bh;
							Z.linie(cx - k.bw / 2 - 12, ty, cx + k.bw / 2 + 12, ty, { f: C.r, b: 2.5 });
							Z.text("dein Tipp", cx + k.bw / 2 + 16, ty + 5, { hand: true, f: C.r, gr: 15 });
						}
					}
					const gew = Math.min(110, 36 * Math.sqrt(rb)), auf = Math.min(130, gew * rf / rb * tauch);
					Z.pfeil(cx - 14, unten - k.bh / 2, cx - 14, unten - k.bh / 2 + gew, { b: 2.5 });
					Z.text("Gewicht", cx - 20, unten - k.bh / 2 + gew, { aus: "right", gr: 12 });
					if (auf > 3) {
						Z.pfeil(cx + 14, unten - k.bh / 2, cx + 14, unten - k.bh / 2 - auf, { f: C.g, b: 2.5 });
						Z.text("Auftrieb", cx + 20, unten - k.bh / 2 - auf + 8, { gr: 12, f: C.g, fett: true });
					}
					if (wE) { wE(Math.round(tauch * 100) + " %"); wK(de(rf / rb * tauch, 2) + " : 1"); }
				},
			};
		},
		warum: `<p>Wasser drückt von allen Seiten, und je tiefer, desto stärker. Die Unterseite des Klotzes liegt tiefer als die Oberseite, also drückt das Wasser von unten stärker als von oben. Der Überschuss ist der <b>Auftrieb</b>.</p>
			<p>Archimedes hat ausgerechnet, wie groß er ist: genau so groß wie das Gewicht der verdrängten Flüssigkeit. Der Klotz sinkt also ein, bis er sein eigenes Gewicht an Wasser verdrängt hat.</p>
			<p>Ob etwas schwimmt, entscheidet die <b>Dichte</b>: Ist der Körper leichter als die gleiche Menge Flüssigkeit, schwimmt er. Ein Stahlschiff schwimmt, weil es mitsamt der Luft im Rumpf weniger dicht ist als Wasser.</p>`,
		formel: "F_A = ρ_Flüssigkeit · V_verdrängt · g",
		formelText: "Anteil unter Wasser = Dichte des Körpers geteilt durch Dichte der Flüssigkeit.",
		mehr: [["auftrieb", "Warum Dinge schwimmen"]],
		quiz: {
			frage: "Eis hat die Dichte 0,92 g/cm³, Meerwasser 1,03 g/cm³. Welcher Anteil eines Eisbergs liegt unter Wasser?",
			opt: ["Etwa die Hälfte", "Etwa 75 %", "Etwa 90 %"],
			richtig: 2,
			warum: "0,92 geteilt durch 1,03 ergibt rund 0,89. Fast neun Zehntel des Eisbergs siehst du nicht.",
			tipp: "Teil die Dichte des Körpers durch die Dichte der Flüssigkeit, wie beim Holzklotz.",
		},
	});

	// ---------- 11 Wärme und Entropie ----------
	PS.neu({
		id: "entropie", titel: "Wärme und Entropie", massstab: "100 Mio. : 1",
		kurz: "40 Teilchen links, die Wand geht auf. Kommen sie je zurück?",
		bild: "Ein Kasten mit Gasteilchen. Anfangs sind alle Teilchen in der linken Hälfte. Darunter ein Balkendiagramm, wie oft wie viele Teilchen links waren.",
		frage: "40 Gasteilchen fliegen in der linken Hälfte eines Kastens. Dann wird die Trennwand herausgezogen. Die Teilchen verteilen sich. Sammeln sie sich irgendwann <b>von selbst</b> wieder alle links?",
		vorhersage: {
			art: "wahl", text: "Alle 40 wieder gleichzeitig in der linken Hälfte:",
			opt: ["Unmöglich. Ein Naturgesetz verbietet das.", "Möglich, aber so unwahrscheinlich, dass du es nie erlebst.", "Das passiert alle paar Minuten."],
			richtig: 1,
		},
		freitext: "Stell die Teilchenzahl ein. Mit 3 Teilchen sind ständig alle links. Mit 10 musst du warten. Ab 30 wartest du länger, als das Universum alt ist.",
		baue(api) {
			let N = 40, T = [], wand = true, t = 0, treffer = 0, warLinks = true, hist = [], tempo = 1;
			const fuelle = () => {
				T = [];
				for (let i = 0; i < N; i++) {
					const w = Math.random() * 6.283, s = 0.22 + Math.random() * 0.3;
					T.push({ x: 0.03 + Math.random() * 0.44, y: 0.04 + Math.random() * 0.92, vx: Math.cos(w) * s, vy: Math.sin(w) * s });
				}
				hist = new Array(N + 1).fill(0); treffer = 0; warLinks = true; t = 0;
			};
			fuelle();
			const links = () => T.reduce((a, p) => a + (p.x < 0.5 ? 1 : 0), 0);
			let wL, wT, wC;
			const chance = () => N <= 30 ? "1 zu " + Math.round(2 ** N).toLocaleString("de-DE") : "1 zu 10 hoch " + Math.round(N * 0.30103);
			return {
				frei() {
					api.regler({ n: "Teilchen", min: 2, max: 200, st: 1, w: N, fmt: (k) => String(k), auf(k) { N = k; fuelle(); wand = false; api.laeuft = true; } });
					api.schalter({ n: "Zeitraffer", opt: ["1 ×", "10 ×"], w: 0, auf(k) { tempo = k ? 10 : 1; } });
					api.knopf("Alle nach links", () => { fuelle(); wand = false; api.laeuft = true; });
					wL = api.wert("Links gerade"); wT = api.wert("Alle links, so oft"); wC = api.wert("Chance dafür");
					wand = false; api.laeuft = true;
				},
				start() { N = 40; fuelle(); wand = true; api.laeuft = true; },
				schritt(dt) {
					if (wand && t > 1.2) wand = false;
					for (let k = 0; k < tempo; k++) {
						for (const p of T) {
							p.x += p.vx * dt; p.y += p.vy * dt;
							const xr = wand ? 0.485 : 0.985;
							if (p.x < 0.015) { p.x = 0.015; p.vx = Math.abs(p.vx); }
							if (p.x > xr) { p.x = xr; p.vx = -Math.abs(p.vx); }
							if (p.y < 0.02) { p.y = 0.02; p.vy = Math.abs(p.vy); }
							if (p.y > 0.98) { p.y = 0.98; p.vy = -Math.abs(p.vy); }
						}
						t += dt;
						const l = links();
						if (!wand && t > 3) hist[l]++;
						if (l === N && !warLinks && !wand) treffer++;
						warLinks = l === N;
					}
					if (api.messlauf && t > 10) {
						api.fertig(0, "Verboten ist es nicht. Aber von einer Billion möglichen Aufteilungen ist nur eine „alle links“. Die Teilchen landen fast immer irgendwo nahe halb und halb, weil es dafür am meisten Möglichkeiten gibt.");
					}
				},
				zeichne(g, W, H) {
					const kx = 14, ky = 14, kw = W - 28, kh = H - 92;
					Z.recht(kx, ky, kw, kh, { b: 2 });
					if (wand) Z.linie(kx + kw / 2, ky, kx + kw / 2, ky + kh, { b: 3 });
					else Z.linie(kx + kw / 2, ky, kx + kw / 2, ky + kh, { f: C.zz, s: [4, 6], b: 1 });
					const r = N > 120 ? 2.5 : N > 50 ? 3.5 : 5;
					for (const p of T) Z.kreis(kx + p.x * kw, ky + p.y * kh, r, { fl: p.x < 0.5 ? C.l : C.g, f: null });
					const l = links();
					Z.text("links " + l, kx + 8, ky + kh - 8, { gr: 15, fett: true });
					Z.text((N - l) + " rechts", kx + kw - 8, ky + kh - 8, { gr: 15, fett: true, f: C.g, aus: "right" });
					// Wie oft waren wie viele links?
					const hy = H - 22, hh = 46, max = Math.max(1, ...hist), bw = kw / (N + 1);
					Z.linie(kx, hy, kx + kw, hy, { f: C.z, b: 1 });
					for (let i = 0; i <= N; i++) if (hist[i]) Z.recht(kx + i * bw, hy - hist[i] / max * hh, Math.max(1, bw - (bw > 4 ? 1.5 : 0)), hist[i] / max * hh, { fl: i === l ? C.g : C.z, f: null });
					Z.text("0 links", kx, hy + 15, { gr: 11, f: C.z });
					Z.text("halb und halb", kx + kw / 2, hy + 15, { gr: 11, f: C.z, aus: "center" });
					Z.text("alle links", kx + kw, hy + 15, { gr: 11, f: C.z, aus: "right" });
					if (wL) { wL(l + " von " + N); wT(treffer + " mal"); wC(chance()); }
				},
			};
		},
		warum: `<p><b>Wärme</b> ist ungeordnete Bewegung von Teilchen. Jedes einzelne fliegt nach einfachen Regeln, und jede einzelne Anordnung ist gleich wahrscheinlich.</p>
			<p>Aber es gibt nur eine Anordnung „alle links“ und unvorstellbar viele für „ungefähr gleich verteilt“. Das System landet dort, wo die meisten Möglichkeiten liegen. Die Zahl der Möglichkeiten misst die <b>Entropie</b>.</p>
			<p>Deshalb läuft manches nur in eine Richtung: Kaffee kühlt ab, Milch verrührt sich, die Wärme aus der Reibung von Blatt 6 kommt nicht zurück. Verboten wäre die Umkehr nicht. Bei echten Gasen mit Trilliarden Teilchen ist sie nur hoffnungslos unwahrscheinlich.</p>`,
		formel: "S = k · ln Ω",
		formelText: "Entropie S wächst mit der Zahl Ω der Möglichkeiten. Von selbst nimmt sie nie ab.",
		mehr: [["waerme", "Wie Wärme funktioniert"]],
		quiz: {
			frage: "Warum wird eine Tasse heißer Kaffee im Zimmer immer kälter und nie von selbst heißer?",
			opt: ["Weil Energie beim Abkühlen verloren geht.", "Weil es viel mehr Möglichkeiten gibt, die Energie im ganzen Zimmer zu verteilen als in der Tasse.", "Weil kalte Luft die Wärme aus der Tasse saugt."],
			richtig: 1,
			warum: "Die Energie bleibt erhalten, sie verteilt sich nur. Verteilt gibt es astronomisch mehr Anordnungen als gesammelt.",
			tipp: "Denk an die Teilchen im Kasten: Was hat sich beim Verteilen geändert, die Anzahl oder die Zahl der Möglichkeiten?",
		},
	});
})();
