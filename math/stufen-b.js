// Heft 2: Geraden, Potenzen, Logarithmus, Pythagoras, Kreis und Welle
(() => {
	const { C, fmt, stage, drag, loop, pen, axes, drawAxes, mark, feedback } = window.H;

	// ---------- Stufe 6: Geraden ----------
	(() => {
		const cv = document.getElementById("lineCv");
		const mIn = document.getElementById("lm");
		const bIn = document.getElementById("lb");
		const out = document.getElementById("lineOut");
		const note = document.getElementById("lineNote");
		const count = document.getElementById("lineCount");
		const TARGETS = [
			[[-2, -1], [2, 5]],
			[[-3, 4], [3, -2]],
			[[0, -3], [2, 2]],
			[[-2, 3], [4, 0]],
		];
		const hit = new Set();
		let ti = 0;
		let wait = false;
		const S = stage(cv, (w) => Math.max(260, Math.min(440, w * 0.75)), draw);

		function frame(w, h) {
			const ym = 6.5;
			const xm = (ym * w) / h;
			return axes(w, h, { xmin: -xm, xmax: xm, ymin: -ym, ymax: ym, pad: 8 });
		}

		function draw(ctx, w, h) {
			ctx.clearRect(0, 0, w, h);
			const A = frame(w, h);
			drawAxes(ctx, A, { every: 2 });
			const m = +mIn.value;
			const b = +bIn.value;
			const f = (x) => m * x + b;
			// Steigungsdreieck ab x = 1
			pen.line(ctx, A.X(1), A.Y(f(1)), A.X(2), A.Y(f(1)), C.orange, 2.5);
			pen.line(ctx, A.X(2), A.Y(f(1)), A.X(2), A.Y(f(2)), C.orange, 2.5);
			pen.text(ctx, "1", A.X(1.5), A.Y(f(1)) + (m >= 0 ? 12 : -12), { size: 18, color: C.orange });
			pen.text(ctx, `m=${fmt(m)}`, A.X(2) + 30, A.Y(f(1.5)), { size: 18, color: C.orange });
			// Gerade
			pen.line(ctx, A.X(A.xmin), A.Y(f(A.xmin)), A.X(A.xmax), A.Y(f(A.xmax)), C.ink, 3);
			pen.dot(ctx, A.X(0), A.Y(b), 6, C.ink, "#fff");
			pen.text(ctx, `b=${fmt(b)}`, A.X(0) - 30, A.Y(b) - 14, { size: 18 });
			// Ziele
			TARGETS[ti].forEach(([x, y]) => {
				const X = A.X(x);
				const Y = A.Y(y);
				const on = Math.abs(f(x) - y) < 1e-9;
				pen.line(ctx, X - 7, Y - 7, X + 7, Y + 7, on ? C.green : C.red, 3);
				pen.line(ctx, X - 7, Y + 7, X + 7, Y - 7, on ? C.green : C.red, 3);
				pen.mono(ctx, `(${fmt(x)}|${fmt(y)})`, X + 10, Y - 14, { align: "left", size: 11, color: on ? C.green : C.red });
			});
		}

		function update() {
			const m = +mIn.value;
			const b = +bIn.value;
			document.getElementById("lmO").textContent = fmt(m);
			document.getElementById("lbO").textContent = fmt(b);
			out.textContent = `y = ${fmt(m)}·x ${b < 0 ? "−" : "+"} ${fmt(Math.abs(b))}`;
			S.redraw();
			const [[x1, y1], [x2, y2]] = TARGETS[ti];
			if (!wait && Math.abs(m * x1 + b - y1) < 1e-9 && Math.abs(m * x2 + b - y2) < 1e-9) {
				hit.add(ti);
				wait = true;
				note.textContent = `Treffer! Steigung = (${fmt(y2)} − ${fmt(y1)}) / (${fmt(x2)} − ${fmt(x1)}) = ${fmt(m)}.`;
				count.textContent = `${hit.size} von 3 geschafft.`;
				if (hit.size >= 3) mark("6a", "Du kannst Geraden durch Punkte legen. Das ist schon lineare Regression im Kleinen.");
				setTimeout(() => {
					wait = false;
					next();
				}, 1400);
			}
		}
		function next() {
			do ti = (ti + 1) % TARGETS.length;
			while (hit.has(ti) && hit.size < TARGETS.length);
			note.textContent = "Tipp: Erst die Steigung zwischen den Kreuzen ausrechnen, dann b verschieben.";
			S.redraw();
		}
		mIn.addEventListener("input", update);
		bIn.addEventListener("input", update);
		document.getElementById("lineNew").addEventListener("click", next);
		update();
	})();

	// ---------- Stufe 7: Papier falten ----------
	(() => {
		const cv = document.getElementById("foldCv");
		const nIn = document.getElementById("foldN");
		const out = document.getElementById("foldOut");
		const note = document.getElementById("foldNote");
		const box = document.querySelector('[data-task="7a"]');
		const T0 = 1e-4; // 0,1 mm in Metern
		const MARKS = [
			[1e-4, "Blatt Papier"],
			[0.03, "dickes Buch"],
			[1.8, "Mensch"],
			[330, "Eiffelturm"],
			[8849, "Mount Everest"],
			[4.08e5, "Raumstation ISS"],
			[1.27e7, "Erddurchmesser"],
			[3.844e8, "Mond"],
			[1.496e11, "Sonne"],
		];
		const S = stage(cv, (w) => (w < 520 ? 360 : 340), draw);

		const len = (m) => {
			if (m < 0.01) return `${fmt(m * 1000, 2)} mm`;
			if (m < 1) return `${fmt(m * 100, 1)} cm`;
			if (m < 1000) return `${fmt(m, 1)} m`;
			const km = m / 1000;
			return km < 1e6 ? `${Math.round(km).toLocaleString("de-DE")} km` : `${fmt(km / 1e6, 1)} Mio. km`;
		};

		function draw(ctx, w, h) {
			ctx.clearRect(0, 0, w, h);
			const n = +nIn.value;
			const split = Math.round(w * (w < 520 ? 0.44 : 0.52));
			// links: linear gegen exponentiell
			const N = Math.max(4, n);
			const ymax = 2 ** N;
			const pad = 26;
			const X = (i) => pad + (i / N) * (split - pad - 16);
			const Y = (v) => h - pad - (v / ymax) * (h - 2 * pad - 10);
			pen.line(ctx, pad, h - pad, split - 10, h - pad, C.text, 1.5);
			pen.line(ctx, pad, h - pad, pad, pad - 6, C.text, 1.5);
			pen.mono(ctx, "Faltungen", (pad + split) / 2, h - 10, { size: 10, color: C.muted });
			pen.mono(ctx, String(N), X(N), h - pad + 10, { size: 10, color: C.muted });
			ctx.save();
			ctx.lineWidth = 3;
			ctx.strokeStyle = C.red;
			ctx.beginPath();
			for (let i = 0; i <= N; i += N / 120) {
				const v = 2 ** Math.min(i, n);
				const px = X(Math.min(i, n));
				i === 0 ? ctx.moveTo(px, Y(v)) : ctx.lineTo(px, Y(v));
			}
			ctx.stroke();
			ctx.strokeStyle = C.ink;
			ctx.beginPath();
			ctx.moveTo(X(0), Y(1));
			ctx.lineTo(X(n), Y(n + 1));
			ctx.stroke();
			ctx.restore();
			pen.text(ctx, "verdoppeln", X(Math.max(0, n * 0.55)), Math.max(pad + 6, Y(2 ** n) + 14), { size: 17, color: C.red, align: "right" });
			pen.text(ctx, "dazulegen", X(n * 0.95), Y(n + 1) - 14, { size: 17, align: "right" });
			pen.mono(ctx, `${(2 ** n).toLocaleString("de-DE")} Lagen`, pad + 6, 12, { align: "left", size: 11, color: C.red });

			// rechts: Zehnerskala
			const lo = -4.5;
			const hi = 12;
			const rx = split + 26;
			const LY = (lg) => h - 16 - ((lg - lo) / (hi - lo)) * (h - 32);
			pen.line(ctx, rx, LY(lo), rx, LY(hi), C.text, 2);
			for (let e = -4; e <= 11; e++) pen.line(ctx, rx - 4, LY(e), rx + 4, LY(e), C.muted, 1);
			MARKS.forEach(([m, name]) => {
				const y = LY(Math.log10(m));
				pen.line(ctx, rx - 6, y, rx + 6, y, C.ink, 2);
				pen.mono(ctx, name, rx + 10, y, { align: "left", size: w < 520 ? 10 : 11 });
			});
			const t = T0 * 2 ** n;
			const y = LY(Math.log10(t));
			ctx.fillStyle = C.red;
			ctx.beginPath();
			ctx.moveTo(rx - 4, y);
			ctx.lineTo(rx - 18, y - 7);
			ctx.lineTo(rx - 18, y + 7);
			ctx.closePath();
			ctx.fill();
			ctx.fillStyle = "rgba(200,53,46,0.15)";
			ctx.fillRect(rx - 3, y, 6, LY(lo) - y);
		}

		function update() {
			const n = +nIn.value;
			const t = T0 * 2 ** n;
			document.getElementById("foldNO").textContent = n;
			out.textContent = `${n} × gefaltet · ${len(t)}`;
			const passed = MARKS.filter(([m]) => m <= t).pop();
			note.textContent = `2^${n} = ${(2 ** n).toLocaleString("de-DE")} Lagen · Dicke ${len(t)}${passed && n > 0 ? ` · höher als: ${passed[1]}` : ""}`;
			S.redraw();
			if (n === 42) mark("7a", "42-mal falten reicht bis zum Mond: 0,1 mm · 2⁴² ≈ 440 000 km. Exponentielles Wachstum!");
			else if (!box.classList.contains("solved"))
				feedback(box, n > 42 ? "Das reicht, aber es geht mit weniger Faltungen." : n >= 35 ? "Gleich, der Mond ist nicht mehr weit …" : "", false);
		}
		nIn.addEventListener("input", update);
		update();
	})();

	// ---------- Stufe 8: Rechenschieber ----------
	(() => {
		const cv = document.getElementById("slideCv");
		const bIn = document.getElementById("slB");
		const out = document.getElementById("slideOut");
		const note = document.getElementById("slideNote");
		let a = 2;
		let grab = null;
		bIn.max = 10;
		const S = stage(cv, (w) => (w < 480 ? 170 : 190), draw);
		const geo = () => {
			const L = 16;
			const len = (S.w - 2 * L) / 2; // eine Dekade
			return { L, len, top: 30, mid: S.h / 2, bot: S.h - 30 };
		};
		const ticks = [];
		for (let v = 1; v < 2; v += 0.1) ticks.push(+v.toFixed(1));
		for (let v = 2; v <= 10; v += 0.5) ticks.push(v);

		function scale(ctx, x0, len, y, down, decades, color) {
			for (let d = 0; d < decades; d++) {
				const f = 10 ** d;
				ticks.forEach((v) => {
					if (d > 0 && v === 1) return;
					const x = x0 + (d + Math.log10(v)) * len;
					if (x < -2 || x > S.w + 2) return;
					const major = Number.isInteger(v);
					const L = major ? 14 : v % 0.5 === 0 ? 9 : 5;
					pen.line(ctx, x, y, x, y + (down ? L : -L), color, major ? 1.6 : 1);
					if (major && (len > 220 || v <= 5 || v === 10)) pen.mono(ctx, String(v * f), x, y + (down ? 22 : -22), { size: 10, color, weight: 700 });
				});
			}
		}

		function draw(ctx, w, h) {
			ctx.clearRect(0, 0, w, h);
			const { L, len, mid } = geo();
			const off = Math.log10(a) * len;
			// Unteres Lineal (fest, zwei Dekaden 1 … 100)
			ctx.fillStyle = "#f3e7c9";
			ctx.fillRect(L - 8, mid + 2, 2 * len + 16, h - mid - 10);
			ctx.strokeStyle = C.text;
			ctx.lineWidth = 1.5;
			ctx.strokeRect(L - 8, mid + 2, 2 * len + 16, h - mid - 10);
			scale(ctx, L, len, mid + 2, true, 2, C.text);
			// Oberes Lineal (verschiebbar, eine Dekade)
			ctx.fillStyle = "#e3ecff";
			ctx.fillRect(L + off - 8, 8, len + 16, mid - 10);
			ctx.strokeStyle = C.ink;
			ctx.strokeRect(L + off - 8, 8, len + 16, mid - 10);
			scale(ctx, L + off, len, mid - 2, false, 1, C.ink);
			// Index 1 und Läufer bei b
			pen.line(ctx, L + off, 8, L + off, h - 8, C.red, 2);
			const b = +bIn.value;
			const xb = L + off + Math.log10(b) * len;
			ctx.fillStyle = "rgba(200,102,26,0.12)";
			ctx.fillRect(xb - 7, 4, 14, h - 8);
			pen.line(ctx, xb, 4, xb, h - 4, C.orange, 2);
			pen.text(ctx, "log a", L + off / 2, mid + 2, { size: 16, color: C.red });
		}

		function update() {
			const b = +bIn.value;
			document.getElementById("slBO").textContent = fmt(b, 1);
			out.textContent = `a = ${fmt(a, 2)}`;
			note.textContent = `Rote 1 über a = ${fmt(a, 2)}. Oben b = ${fmt(b, 1)} → unten ${fmt(a * b, 2)}   (log ${fmt(a, 2)} + log ${fmt(b, 1)} = ${fmt(Math.log10(a), 3)} + ${fmt(Math.log10(b), 3)} = ${fmt(Math.log10(a * b), 3)})`;
			S.redraw();
			if (Math.abs(a - 2.5) < 0.03 && Math.abs(b - 3) < 0.05) mark("8a", "2,5 · 3 = 7,5. Du hast multipliziert, indem du zwei Längen aneinandergelegt hast.");
		}

		drag(cv, {
			down: (p) => {
				const { L, len, mid } = geo();
				if (p.y > mid + 6) return false;
				grab = { x: p.x, a0: Math.log10(a) * len };
				return true;
			},
			move: (p) => {
				const { len } = geo();
				const off = Math.max(0, Math.min(len, grab.a0 + p.x - grab.x));
				a = Math.round(10 ** (off / len) * 100) / 100;
				update();
			},
		});
		cv.addEventListener("keydown", (e) => {
			if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
			e.preventDefault();
			a = Math.max(1, Math.min(10, Math.round((a + (e.key === "ArrowRight" ? 0.05 : -0.05)) * 100) / 100));
			update();
		});
		bIn.addEventListener("input", update);
		update();
	})();

	// ---------- Stufe 9: Pythagoras ----------
	(() => {
		const cv = document.getElementById("pyCv");
		const out = document.getElementById("pyOut");
		const note = document.getElementById("pyNote");
		const bProof = document.getElementById("pyProof");
		const bFlip = document.getElementById("pyFlip");
		let a = 4;
		let b = 3;
		let proof = false;
		let t = 0;
		let tt = 0;
		let grab = null;
		const S = stage(cv, (w) => Math.min(w, 440), draw);
		// Welt: x und y je von −6 bis 12
		const frame = () => {
			if (proof) {
				// Beweis: das große Quadrat mit Seite a + b füllt die Fläche
				const q = a + b;
				const s = (Math.min(S.w, S.h) - 40) / q;
				const ox = (S.w - q * s) / 2;
				const oy = (S.h + q * s) / 2;
				return { s, X: (x) => ox + x * s, Y: (y) => oy - y * s };
			}
			const s = (Math.min(S.w, S.h) - 16) / 18;
			const ox = (S.w - 18 * s) / 2 + 6 * s;
			const oy = S.h - 8 - 6 * s;
			return { s, X: (x) => ox + x * s, Y: (y) => oy - y * s };
		};
		const poly = (ctx, F, pts, fill, stroke = C.ink) => {
			ctx.beginPath();
			pts.forEach(([x, y], i) => (i ? ctx.lineTo(F.X(x), F.Y(y)) : ctx.moveTo(F.X(x), F.Y(y))));
			ctx.closePath();
			if (fill) {
				ctx.fillStyle = fill;
				ctx.fill();
			}
			ctx.strokeStyle = stroke;
			ctx.lineWidth = 2;
			ctx.stroke();
		};
		const cen = (pts) => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

		function drawTriangle(ctx, F) {
			const c = Math.hypot(a, b);
			const sa = [[0, 0], [a, 0], [a, -a], [0, -a]];
			const sb = [[0, 0], [0, b], [-b, b], [-b, 0]];
			const sc = [[a, 0], [0, b], [b, a + b], [a + b, a]];
			poly(ctx, F, sa, "rgba(143,177,255,0.45)");
			poly(ctx, F, sb, "rgba(255,240,122,0.75)");
			poly(ctx, F, sc, "rgba(255,194,220,0.7)");
			poly(ctx, F, [[0, 0], [a, 0], [0, b]], "#fff", C.text);
			const r = 0.5;
			poly(ctx, F, [[0, 0], [r, 0], [r, r], [0, r]], null, C.text);
			const fs = (q) => Math.max(14, Math.min(30, q * F.s * 0.35));
			let [x, y] = cen(sa);
			pen.text(ctx, `a² = ${fmt(a * a)}`, F.X(x), F.Y(y), { size: fs(a) });
			[x, y] = cen(sb);
			pen.text(ctx, `b² = ${fmt(b * b)}`, F.X(x), F.Y(y), { size: fs(b) });
			[x, y] = cen(sc);
			pen.text(ctx, `c² = ${fmt(c * c)}`, F.X(x), F.Y(y), { size: fs(c) });
			pen.text(ctx, "a", F.X(a / 2), F.Y(0) - 12, { size: 20, color: C.text });
			pen.text(ctx, "b", F.X(0) + 12, F.Y(b / 2), { size: 20, color: C.text });
			pen.text(ctx, "c", F.X(a / 2) + 10, F.Y(b / 2) - 10, { size: 20, color: C.text });
			pen.dot(ctx, F.X(a), F.Y(0), 9, C.orange, "#fff");
			pen.dot(ctx, F.X(0), F.Y(b), 9, C.orange, "#fff");
		}

		function drawProof(ctx, F) {
			const s = a + b;
			const c1 = [[0, 0, 0], [s, 0, 90], [s, s, 180], [0, s, 270]];
			const c2 = [[0, a, 0], [s, 0, 90], [a, s, 180], [a, a, 270]];
			const sq = [[0, 0], [s, 0], [s, s], [0, s]];
			poly(ctx, F, sq, "#fff", C.text);
			// freie Flächen
			if (t < 0.02) poly(ctx, F, [[a, 0], [s, a], [b, s], [0, b]], "rgba(255,194,220,0.7)");
			if (t > 0.98) {
				poly(ctx, F, [[0, 0], [a, 0], [a, a], [0, a]], "rgba(143,177,255,0.45)");
				poly(ctx, F, [[a, a], [s, a], [s, s], [a, s]], "rgba(255,240,122,0.75)");
			}
			const e = t * t * (3 - 2 * t);
			c1.forEach(([x1, y1, th], i) => {
				const [x2, y2] = c2[i];
				const px = x1 + (x2 - x1) * e;
				const py = y1 + (y2 - y1) * e;
				const r = (th * Math.PI) / 180;
				const u = [Math.cos(r), Math.sin(r)];
				const v = [-u[1], u[0]];
				poly(ctx, F, [[px, py], [px + a * u[0], py + a * u[1]], [px + b * v[0], py + b * v[1]]], "rgba(63,90,166,0.28)");
			});
			if (t < 0.02) pen.text(ctx, "c²", F.X(s / 2), F.Y(s / 2), { size: 30 });
			if (t > 0.98) {
				pen.text(ctx, "a²", F.X(a / 2), F.Y(a / 2), { size: 26 });
				pen.text(ctx, "b²", F.X(a + b / 2), F.Y(a + b / 2), { size: 26 });
			}
		}

		function draw(ctx, w, h) {
			ctx.clearRect(0, 0, w, h);
			const F = frame();
			proof ? drawProof(ctx, F) : drawTriangle(ctx, F);
		}

		function update() {
			const c = Math.hypot(a, b);
			out.textContent = `${fmt(a)}² + ${fmt(b)}² = ${fmt(c, 2)}²`;
			note.textContent = proof
				? t > 0.5
					? "Frei bleiben a² und b². Die Dreiecke sind dieselben, also: a² + b² = c²."
					: "Großes Quadrat, Seite a + b. Vier Dreiecke, in der Mitte bleibt c² frei."
				: `${fmt(a * a)} + ${fmt(b * b)} = ${fmt(a * a + b * b)} und c = √${fmt(a * a + b * b)} = ${fmt(c, 2)}`;
			S.redraw();
		}

		const anim = loop(cv, (dt) => {
			if (t === tt) return false;
			t = H.reduced ? tt : tt > t ? Math.min(tt, t + dt * 0.8) : Math.max(tt, t - dt * 0.8);
			update();
		});

		drag(cv, {
			down: (p) => {
				if (proof) return false;
				const F = frame();
				const dA = Math.hypot(p.x - F.X(a), p.y - F.Y(0));
				const dB = Math.hypot(p.x - F.X(0), p.y - F.Y(b));
				if (Math.min(dA, dB) > 34) return false;
				grab = dA < dB ? "a" : "b";
				return true;
			},
			move: (p) => {
				const F = frame();
				const snap = (v) => Math.max(1, Math.min(6, Math.round(v * 2) / 2));
				if (grab === "a") a = snap((p.x - F.X(0)) / F.s);
				else b = snap((F.Y(0) - p.y) / F.s);
				update();
			},
		});
		bProof.addEventListener("click", () => {
			proof = !proof;
			bProof.setAttribute("aria-pressed", String(proof));
			bProof.textContent = proof ? "Zurück zum Dreieck" : "Beweis zeigen";
			bFlip.disabled = !proof;
			t = tt = 0;
			update();
		});
		bFlip.addEventListener("click", () => {
			tt = tt ? 0 : 1;
			anim.start();
		});
		update();
	})();

	// ---------- Stufe 10: Kreis und Welle ----------
	(() => {
		const cv = document.getElementById("circleCv");
		const out = document.getElementById("circleOut");
		const note = document.getElementById("circleNote");
		const bSpin = document.getElementById("cSpin");
		const bSecond = document.getElementById("cSecond");
		const kIn = document.getElementById("ck");
		let phi = 0;
		let spin = !H.reduced;
		let second = false;
		let dragging = false;
		const SIN = C.red;
		const COS = C.green;
		const S = stage(cv, (w) => (w < 520 ? 220 : 280), draw);
		bSpin.setAttribute("aria-pressed", String(spin));

		const lay = () => {
			const R = Math.min(S.h * 0.36, S.w * 0.2);
			const cx = R + 20;
			return { R, cx, cy: S.h / 2, x0: cx + R + 30 };
		};
		const k = () => +kIn.value;
		const r2 = () => (second ? 0.33 : 0);
		const height = (x) => Math.sin(x) + r2() * Math.sin(k() * x);

		function draw(ctx, w, h) {
			const { R, cx, cy, x0 } = lay();
			const sc = R / (1 + r2());
			ctx.clearRect(0, 0, w, h);
			pen.line(ctx, 6, cy, w - 6, cy, C.gridStrong, 1);
			pen.line(ctx, cx, cy - R - 10, cx, cy + R + 10, C.gridStrong, 1);
			ctx.strokeStyle = C.muted;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(cx, cy, sc, 0, Math.PI * 2);
			ctx.stroke();
			const p1x = cx + sc * Math.cos(phi);
			const p1y = cy - sc * Math.sin(phi);
			const ang = ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
			ctx.strokeStyle = C.orange;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(cx, cy, 15, 0, -ang, true);
			ctx.stroke();
			pen.line(ctx, cx, cy, p1x, p1y, C.ink, 2);
			let px = p1x;
			let py = p1y;
			if (second) {
				const rr = sc * r2();
				ctx.strokeStyle = C.muted;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.arc(p1x, p1y, rr, 0, Math.PI * 2);
				ctx.stroke();
				px = p1x + rr * Math.cos(k() * phi);
				py = p1y - rr * Math.sin(k() * phi);
				pen.line(ctx, p1x, p1y, px, py, C.ink, 2);
			} else {
				pen.line(ctx, px, cy, px, py, SIN, 3.5);
				pen.line(ctx, cx, cy, px, cy, COS, 3.5);
			}
			ctx.strokeStyle = SIN;
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			for (let x = x0; x <= w - 6; x += 2) {
				const y = cy - sc * height(phi - (x - x0) / (sc * 0.9));
				x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
			}
			ctx.stroke();
			pen.line(ctx, px, py, x0, py, C.muted, 1, [4, 5]);
			pen.dot(ctx, px, py, 8, C.orange, "#fff");
			pen.dot(ctx, x0, py, 5, SIN);
			pen.text(ctx, "sin", x0 + 26, 14, { size: 18, color: SIN });
		}

		function update() {
			const deg = Math.round((((phi * 180) / Math.PI) % 360 + 360) % 360);
			out.textContent = `φ = ${deg}°`;
			note.textContent = second
				? `Höhe = sin φ + 0,33 · sin(${k()}φ) = ${fmt(height(phi))}`
				: `sin ${deg}° = ${fmt(Math.sin(phi))} · cos ${deg}° = ${fmt(Math.cos(phi))} · sin² + cos² = ${fmt(Math.sin(phi) ** 2 + Math.cos(phi) ** 2)}`;
			if (!spin && !second && Math.abs(Math.sin(phi) - 0.5) < 0.012)
				mark("10a", `sin ${deg}° = 0,5. ${deg < 90 ? "Die andere Lösung ist 150°: dieselbe Höhe auf der linken Seite." : "Die andere Lösung ist 30°."}`);
		}

		loop(cv, (dt) => {
			if (spin && !dragging) phi += dt * 1.1;
			S.redraw();
			update();
		});
		const setFrom = (p) => {
			const { cx, cy } = lay();
			phi = Math.atan2(cy - p.y, p.x - cx);
			phi = (Math.round((phi * 180) / Math.PI) * Math.PI) / 180;
		};
		const stopSpin = () => {
			spin = false;
			bSpin.setAttribute("aria-pressed", "false");
		};
		drag(cv, {
			down: (p) => {
				stopSpin();
				dragging = true;
				setFrom(p);
			},
			move: setFrom,
			up: () => (dragging = false),
		});
		cv.addEventListener("keydown", (e) => {
			const d = { ArrowUp: 1, ArrowRight: -1, ArrowDown: -1, ArrowLeft: 1 }[e.key];
			if (!d) return;
			e.preventDefault();
			stopSpin();
			phi += (d * Math.PI) / 180;
		});
		bSpin.addEventListener("click", () => {
			spin = !spin;
			bSpin.setAttribute("aria-pressed", String(spin));
		});
		bSecond.addEventListener("click", () => {
			second = !second;
			bSecond.setAttribute("aria-pressed", String(second));
		});
		kIn.addEventListener("input", () => (document.getElementById("ckO").textContent = `${kIn.value}×`));
	})();
})();
