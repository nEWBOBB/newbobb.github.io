// Heft 3: Wahrscheinlichkeit, Statistik, Ableitung, Integral, Matrizen
(() => {
	const { C, fmt, stage, drag, pen, axes, drawAxes, mark, feedback } = window.H;

	// ---------- Stufe 11: Würfel ----------
	(() => {
		const cv = document.getElementById("diceCv");
		const out = document.getElementById("diceOut");
		const note = document.getElementById("diceNote");
		const bMode = document.getElementById("dMode");
		const grid = document.getElementById("diceGrid");
		let two = false;
		let counts = [];
		let total = 0;
		let last = [];
		let pick = 0;
		const S = stage(cv, (w) => (w < 520 ? 220 : 250), draw);
		const cats = () => (two ? Array.from({ length: 11 }, (_, i) => i + 2) : [1, 2, 3, 4, 5, 6]);
		const theory = (v) => (two ? (6 - Math.abs(v - 7)) / 36 : 1 / 6);
		const roll = () => 1 + Math.floor(Math.random() * 6);

		function face(ctx, x, y, s, v) {
			ctx.fillStyle = "#fff";
			ctx.strokeStyle = C.ink;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.roundRect(x, y, s, s, 6);
			ctx.fill();
			ctx.stroke();
			const P = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] }[v];
			P.forEach(([i, j]) => pen.dot(ctx, x + s * (0.25 + i * 0.25), y + s * (0.25 + j * 0.25), s * 0.08, C.ink));
		}

		function draw(ctx, w, h) {
			ctx.clearRect(0, 0, w, h);
			const cs = cats();
			const padL = 34;
			const padB = 26;
			const top = 40;
			const bw = (w - padL - 10) / cs.length;
			const maxT = Math.max(...cs.map(theory));
			const rel = cs.map((v) => (total ? (counts[v] || 0) / total : 0));
			const ymax = Math.max(maxT * 1.5, ...rel) * 1.05;
			const Y = (p) => h - padB - (p / ymax) * (h - padB - top);
			pen.line(ctx, padL, h - padB, w - 6, h - padB, C.text, 1.5);
			for (let p = 0; p <= ymax; p += 0.05) {
				pen.line(ctx, padL - 4, Y(p), padL, Y(p), C.muted, 1);
				pen.mono(ctx, `${Math.round(p * 100)} %`, padL - 6, Y(p), { size: 9, color: C.muted, align: "right" });
			}
			cs.forEach((v, i) => {
				const x = padL + i * bw;
				ctx.fillStyle = v === pick ? C.hl : "rgba(143,177,255,0.7)";
				ctx.fillRect(x + 3, Y(rel[i]), bw - 6, h - padB - Y(rel[i]));
				ctx.strokeStyle = C.ink;
				ctx.lineWidth = 1.5;
				ctx.strokeRect(x + 3, Y(rel[i]), bw - 6, h - padB - Y(rel[i]));
				pen.line(ctx, x + 1, Y(theory(v)), x + bw - 1, Y(theory(v)), C.red, 2.5, [5, 3]);
				pen.mono(ctx, String(v), x + bw / 2, h - padB + 12, { size: 11, weight: 700 });
			});
			if (last.length) last.forEach((v, i) => face(ctx, w - 10 - (last.length - i) * 40, 4, 32, v));
		}

		function update() {
			out.textContent = `${total.toLocaleString("de-DE")} Würfe`;
			if (!total) note.textContent = "Würfle los. Gestrichelt: was die Theorie vorhersagt.";
			else {
				const cs = cats();
				const err = Math.max(...cs.map((v) => Math.abs((counts[v] || 0) / total - theory(v))));
				note.textContent = `Größte Abweichung von der Theorie: ${fmt(err * 100, 1)} Prozentpunkte.${total < 500 ? " Würfle mehr!" : ""}`;
			}
			S.redraw();
		}
		function doRoll(n) {
			for (let i = 0; i < n; i++) {
				last = two ? [roll(), roll()] : [roll()];
				const v = last.reduce((s, x) => s + x, 0);
				counts[v] = (counts[v] || 0) + 1;
				total++;
			}
			update();
		}
		function reset() {
			counts = [];
			total = 0;
			last = [];
			update();
		}
		document.querySelectorAll("[data-roll]").forEach((b) => b.addEventListener("click", () => doRoll(+b.dataset.roll)));
		document.getElementById("dReset").addEventListener("click", reset);
		bMode.addEventListener("click", () => {
			two = !two;
			bMode.setAttribute("aria-pressed", String(two));
			bMode.textContent = two ? "Ein Würfel" : "Zwei Würfel";
			reset();
		});

		// 6×6-Tabelle aller Paare
		let html = '<span class="h">+</span>';
		for (let j = 1; j <= 6; j++) html += `<span class="h">${j}</span>`;
		for (let i = 1; i <= 6; i++) {
			html += `<span class="h">${i}</span>`;
			for (let j = 1; j <= 6; j++) html += `<span role="button" tabindex="0" data-s="${i + j}">${i + j}</span>`;
		}
		grid.innerHTML = html;
		const choose = (s) => {
			pick = s;
			grid.querySelectorAll("[data-s]").forEach((c) => c.classList.toggle("on", +c.dataset.s === s));
			const n = 6 - Math.abs(s - 7);
			note.textContent = `Summe ${s}: ${n} von 36 Feldern → ${n}/36 ≈ ${fmt((n / 36) * 100, 1)} %`;
			if (!two) bMode.click();
			S.redraw();
		};
		grid.addEventListener("click", (e) => e.target.dataset.s && choose(+e.target.dataset.s));
		grid.addEventListener("keydown", (e) => {
			if ((e.key === "Enter" || e.key === " ") && e.target.dataset.s) {
				e.preventDefault();
				choose(+e.target.dataset.s);
			}
		});
		update();
	})();

	// ---------- Stufe 12: Mittelwert, Median, Streuung ----------
	(() => {
		const cv = document.getElementById("statCv");
		const out = document.getElementById("statOut");
		const note = document.getElementById("statNote");
		const box = document.querySelector('[data-task="12a"]');
		const START = [2, 3, 3.5, 4, 5, 5.5, 7];
		let pts = [...START];
		let grab = -1;
		const MAX = 20;
		const S = stage(cv, (w) => (w < 520 ? 200 : 220), draw);
		const X = (v) => 18 + (v / MAX) * (S.w - 36);
		const stats = () => {
			const n = pts.length;
			const mean = pts.reduce((s, v) => s + v, 0) / n;
			const sorted = [...pts].sort((a, b) => a - b);
			const median = sorted[(n - 1) / 2];
			const sd = Math.sqrt(pts.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
			return { mean, median, sd };
		};
		// Stapelhöhe jedes Punktes: Punkte, die sich berühren würden, kommen übereinander
		const stack = () => {
			const lv = [];
			pts.forEach((v, i) => {
				const used = new Set(pts.slice(0, i).map((u, j) => (Math.abs(X(u) - X(v)) < 19 ? lv[j] : -1)));
				let k = 0;
				while (used.has(k)) k++;
				lv[i] = k;
			});
			return lv;
		};

		function draw(ctx, w, h) {
			ctx.clearRect(0, 0, w, h);
			const { mean, median, sd } = stats();
			const base = h - 70;
			// Streuband
			ctx.fillStyle = "rgba(255,240,122,0.6)";
			ctx.fillRect(X(Math.max(0, mean - sd)), 14, X(Math.min(MAX, mean + sd)) - X(Math.max(0, mean - sd)), base - 14);
			pen.mono(ctx, "± σ", X(Math.max(0, mean - sd)) + 4, 22, { size: 10, color: C.muted, align: "left" });
			// Brett
			ctx.fillStyle = "#d8b98a";
			ctx.fillRect(10, base, w - 20, 8);
			ctx.strokeStyle = "#8a6a3a";
			ctx.lineWidth = 1.5;
			ctx.strokeRect(10, base, w - 20, 8);
			for (let v = 0; v <= MAX; v += 2) pen.mono(ctx, String(v), X(v), base + 46, { size: 10, color: C.muted });
			// Kipp-Spitze am Mittelwert
			ctx.fillStyle = C.red;
			ctx.beginPath();
			ctx.moveTo(X(mean), base + 8);
			ctx.lineTo(X(mean) - 14, base + 34);
			ctx.lineTo(X(mean) + 14, base + 34);
			ctx.closePath();
			ctx.fill();
			pen.text(ctx, "Mittelwert", X(mean) + 18, base + 26, { size: 16, color: C.red, align: "left" });
			// Median
			pen.line(ctx, X(median), 30, X(median), base, C.green, 2.5, [6, 4]);
			pen.text(ctx, "Median", X(median) + 5, 44, { size: 17, color: C.green, align: "left" });
			// Punkte
			const st = stack();
			pts.forEach((v, i) => pen.dot(ctx, X(v), base - 11 - st[i] * 20, 9, i === grab ? C.orange : C.ink, "#fff"));
		}

		function update() {
			const { mean, median, sd } = stats();
			out.textContent = `x̄ = ${fmt(mean)} · Median = ${fmt(median)} · σ = ${fmt(sd)}`;
			note.textContent = `Werte: ${[...pts].sort((a, b) => a - b).map((v) => fmt(v)).join(" · ")}  →  Summe ${fmt(pts.reduce((s, v) => s + v, 0))} ÷ 7`;
			S.redraw();
			if (Math.abs(mean - 6) < 0.01 && median === 4) mark("12a", "Mittelwert 6, Median 4: Ein paar große Werte ziehen den Schwerpunkt nach rechts, die Mitte bleibt.");
			else if (!box.classList.contains("solved")) feedback(box, "", true);
		}

		drag(cv, {
			down: (p) => {
				const base = S.h - 70;
				const st = stack();
				let best = 28;
				grab = -1;
				pts.forEach((v, i) => {
					const d = Math.hypot(p.x - X(v), p.y - (base - 11 - st[i] * 20));
					if (d < best) {
						best = d;
						grab = i;
					}
				});
				if (grab < 0) return false;
				S.redraw();
			},
			move: (p) => {
				pts[grab] = Math.max(0, Math.min(MAX, Math.round(((p.x - 18) / (S.w - 36)) * MAX * 2) / 2));
				update();
			},
			up: () => {
				grab = -1;
				S.redraw();
			},
		});
		document.getElementById("statRich").addEventListener("click", () => {
			pts[pts.indexOf(Math.max(...pts))] = MAX;
			update();
		});
		document.getElementById("statReset").addEventListener("click", () => {
			pts = [...START];
			update();
		});
		update();
	})();

	// ---------- Stufe 13: Ableitung ----------
	(() => {
		const cv = document.getElementById("derCv");
		const out = document.getElementById("derOut");
		const note = document.getElementById("derNote");
		const hIn = document.getElementById("dh");
		const FNS = [
			{ f: (x) => (x * x) / 2, d: (x) => x, y: [-1, 5], dy: [-3.5, 3.5], name: "x²/2", dn: "x" },
			{ f: (x) => (x ** 3) / 3 - x, d: (x) => x * x - 1, y: [-3.5, 3.5], dy: [-2, 5], name: "x³/3 − x", dn: "x² − 1" },
			{ f: (x) => 2 * Math.sin(x), d: (x) => 2 * Math.cos(x), y: [-2.6, 2.6], dy: [-2.6, 2.6], name: "2·sin x", dn: "2·cos x" },
		];
		let fi = 0;
		let x0 = 0.8;
		const S = stage(cv, (w) => (w < 520 ? 400 : 440), draw);
		const hVal = () => 1.5 * 10 ** ((-3 * +hIn.value) / 100);
		const frames = () => {
			const F = FNS[fi];
			const topH = Math.round(S.h * 0.58);
			const A = axes(S.w, topH, { xmin: -3, xmax: 3, ymin: F.y[0], ymax: F.y[1], pad: 14 });
			const B0 = axes(S.w, S.h - topH, { xmin: -3, xmax: 3, ymin: F.dy[0], ymax: F.dy[1], pad: 14 });
			const B = { ...B0, Y: (y) => topH + B0.Y(y), iy: (py) => B0.iy(py - topH), top: topH };
			return { A, B, topH };
		};
		const curve = (ctx, A, f, color, w, from = A.xmin, to = A.xmax) => {
			ctx.strokeStyle = color;
			ctx.lineWidth = w;
			ctx.beginPath();
			for (let i = 0; i <= 200; i++) {
				const x = from + ((to - from) * i) / 200;
				i ? ctx.lineTo(A.X(x), A.Y(f(x))) : ctx.moveTo(A.X(x), A.Y(f(x)));
			}
			ctx.stroke();
		};

		function draw(ctx, w, h) {
			ctx.clearRect(0, 0, w, h);
			const F = FNS[fi];
			const { A, B, topH } = frames();
			const hh = hVal();
			const slope = (F.f(x0 + hh) - F.f(x0)) / hh;
			// oben
			ctx.save();
			ctx.beginPath();
			ctx.rect(0, 0, w, topH);
			ctx.clip();
			drawAxes(ctx, A);
			curve(ctx, A, F.f, C.ink, 3);
			const y0 = F.f(x0);
			pen.line(ctx, A.X(-3), A.Y(y0 + slope * (-3 - x0)), A.X(3), A.Y(y0 + slope * (3 - x0)), C.orange, 2.5);
			pen.line(ctx, A.X(x0), A.Y(y0), A.X(x0 + hh), A.Y(y0), C.red, 1.5, [4, 3]);
			pen.line(ctx, A.X(x0 + hh), A.Y(y0), A.X(x0 + hh), A.Y(F.f(x0 + hh)), C.red, 1.5, [4, 3]);
			pen.dot(ctx, A.X(x0 + hh), A.Y(F.f(x0 + hh)), 5, C.red);
			pen.dot(ctx, A.X(x0), A.Y(y0), 9, C.orange, "#fff");
			pen.text(ctx, `f(x) = ${F.name}`, 16, 18, { size: 19, align: "left" });
			ctx.restore();
			// Trennlinie
			pen.line(ctx, 0, topH, w, topH, C.gridStrong, 1.5);
			// unten: Steigungskurve
			ctx.save();
			ctx.beginPath();
			ctx.rect(0, topH, w, h - topH);
			ctx.clip();
			drawAxes(ctx, B);
			curve(ctx, B, F.d, "rgba(200,53,46,0.35)", 2);
			curve(ctx, B, F.d, C.red, 3.5, -3, x0);
			pen.line(ctx, B.X(x0), B.Y(0), B.X(x0), B.Y(slope), C.orange, 2, [3, 3]);
			pen.dot(ctx, B.X(x0), B.Y(slope), 7, C.orange, "#fff");
			pen.text(ctx, `Steigung f′(x) = ${F.dn}`, 16, topH + 18, { size: 19, color: C.red, align: "left" });
			ctx.restore();
		}

		function update() {
			const F = FNS[fi];
			const hh = hVal();
			const slope = (F.f(x0 + hh) - F.f(x0)) / hh;
			document.getElementById("dhO").textContent = fmt(hh, hh < 0.01 ? 4 : 2);
			out.textContent = `x = ${fmt(x0)} · Steigung ≈ ${fmt(slope, 3)}`;
			note.textContent = `Sekante: (f(${fmt(x0)} + ${fmt(hh, 4)}) − f(${fmt(x0)})) / ${fmt(hh, 4)} = ${fmt(slope, 4)} · genau: f′(${fmt(x0)}) = ${fmt(F.d(x0), 4)}`;
			S.redraw();
			if (fi === 1 && +hIn.value === 100 && Math.abs(F.d(x0)) < 0.06)
				mark("13a", `Steigung null bei x = ${fmt(x0)}: ${x0 > 0 ? "ein Tal" : "ein Gipfel"}. Die exakten Stellen sind x = −1 und x = 1.`);
		}

		drag(cv, {
			down: (p) => {
				const { topH } = frames();
				if (p.y > topH + 20) return false;
				move(p);
			},
			move: (p) => move(p),
		});
		function move(p) {
			const { A } = frames();
			x0 = Math.max(-2.9, Math.min(2.9, Math.round(A.ix(p.x) * 50) / 50));
			update();
		}
		cv.addEventListener("keydown", (e) => {
			if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
			e.preventDefault();
			x0 = Math.max(-2.9, Math.min(2.9, Math.round((x0 + (e.key === "ArrowRight" ? 0.02 : -0.02)) * 50) / 50));
			update();
		});
		document.querySelectorAll("[data-fn]").forEach((b) =>
			b.addEventListener("click", () => {
				fi = +b.dataset.fn;
				document.querySelectorAll("[data-fn]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
				update();
			})
		);
		hIn.addEventListener("input", update);
		update();
	})();

	// ---------- Stufe 14: Integral ----------
	(() => {
		const cv = document.getElementById("intCv");
		const out = document.getElementById("intOut");
		const note = document.getElementById("intNote");
		const nIn = document.getElementById("in");
		const bIn = document.getElementById("ib");
		const f = (x) => x * x;
		const Fa = (x) => (x ** 3) / 3;
		const S = stage(cv, (w) => (w < 520 ? 380 : 420), draw);

		function draw(ctx, w, h) {
			ctx.clearRect(0, 0, w, h);
			const n = +nIn.value;
			const b = +bIn.value;
			const topH = Math.round(h * 0.56);
			const A = axes(w, topH, { xmin: -0.2, xmax: 3.2, ymin: -0.6, ymax: 9.6, pad: 14 });
			drawAxes(ctx, A, { step: 1, every: 1 });
			// Rechtecke (linke Höhe)
			const dx = b / n;
			ctx.fillStyle = "rgba(143,177,255,0.55)";
			ctx.strokeStyle = C.ink;
			ctx.lineWidth = n > 40 ? 0.5 : 1.2;
			for (let i = 0; i < n; i++) {
				const x = i * dx;
				const y = f(x);
				ctx.fillRect(A.X(x), A.Y(y), A.X(x + dx) - A.X(x), A.Y(0) - A.Y(y));
				ctx.strokeRect(A.X(x), A.Y(y), A.X(x + dx) - A.X(x), A.Y(0) - A.Y(y));
			}
			// Kurve
			ctx.strokeStyle = C.red;
			ctx.lineWidth = 3;
			ctx.beginPath();
			for (let i = 0; i <= 120; i++) {
				const x = (3.1 * i) / 120;
				i ? ctx.lineTo(A.X(x), A.Y(f(x))) : ctx.moveTo(A.X(x), A.Y(f(x)));
			}
			ctx.stroke();
			pen.line(ctx, A.X(b), A.Y(0), A.X(b), A.Y(9.4), C.orange, 2, [5, 4]);
			pen.text(ctx, "f(x) = x²", A.X(2.25), A.Y(8.6), { size: 19, color: C.red, align: "right" });
			// unten: Flächenfunktion A(b) = b³/3
			pen.line(ctx, 0, topH, w, topH, C.gridStrong, 1.5);
			const B0 = axes(w, h - topH, { xmin: -0.2, xmax: 3.2, ymin: -0.6, ymax: 9.6, pad: 14 });
			const B = { ...B0, Y: (y) => topH + B0.Y(y) };
			drawAxes(ctx, B, { step: 1, every: 3 });
			ctx.strokeStyle = C.ink;
			ctx.lineWidth = 3;
			ctx.beginPath();
			for (let i = 0; i <= 120; i++) {
				const x = (3.1 * i) / 120;
				i ? ctx.lineTo(B.X(x), B.Y(Fa(x))) : ctx.moveTo(B.X(x), B.Y(Fa(x)));
			}
			ctx.stroke();
			// Tangente mit Steigung f(b)
			const m = f(b);
			const d = 0.45;
			pen.line(ctx, B.X(b - d), B.Y(Fa(b) - m * d), B.X(b + d), B.Y(Fa(b) + m * d), C.orange, 2.5);
			pen.dot(ctx, B.X(b), B.Y(Fa(b)), 7, C.orange, "#fff");
			pen.text(ctx, "Fläche A(x)", 18, topH + 18, { size: 19, align: "left" });
			pen.mono(ctx, `Steigung hier = ${fmt(m)} = f(${fmt(b, 1)})`, 18, topH + 38, { align: "left", size: 11, color: C.orange });
		}

		function update() {
			const n = +nIn.value;
			const b = +bIn.value;
			const dx = b / n;
			let sum = 0;
			for (let i = 0; i < n; i++) sum += f(i * dx) * dx;
			document.getElementById("inO").textContent = n;
			document.getElementById("ibO").textContent = fmt(b, 1);
			out.textContent = `Summe = ${fmt(sum, 3)}`;
			note.textContent = `${n} Rechtecke, je ${fmt(dx, 3)} breit: ${fmt(sum, 4)} · genau: ${fmt(b, 1)}³/3 = ${fmt(Fa(b), 4)} · Fehler ${fmt(Fa(b) - sum, 4)}`;
			S.redraw();
		}
		nIn.addEventListener("input", update);
		bIn.addEventListener("input", update);
		update();
	})();

	// ---------- Stufe 15: Matrizen ----------
	(() => {
		const cv = document.getElementById("matCv");
		const out = document.getElementById("matOut");
		const note = document.getElementById("matNote");
		let I = [1, 0];
		let J = [0, 1];
		let grab = null;
		const HOUSE = [[0, 0], [2, 0], [2, 1.5], [1, 2.5], [0, 1.5]];
		const DOOR = [[0.7, 0], [1.3, 0], [1.3, 0.9], [0.7, 0.9]];
		const S = stage(cv, (w) => Math.min(w, 440), draw);
		const frame = () => {
			const R = 4.5;
			const s = Math.min(S.w, S.h) / (2 * R);
			return { s, X: (x) => S.w / 2 + x * s, Y: (y) => S.h / 2 - y * s, ix: (px) => (px - S.w / 2) / s, iy: (py) => (S.h / 2 - py) / s };
		};
		const T = ([x, y]) => [x * I[0] + y * J[0], x * I[1] + y * J[1]];

		function poly(ctx, F, pts, fill, stroke, dash) {
			ctx.save();
			ctx.beginPath();
			pts.forEach((p, i) => (i ? ctx.lineTo(F.X(p[0]), F.Y(p[1])) : ctx.moveTo(F.X(p[0]), F.Y(p[1]))));
			ctx.closePath();
			if (fill) {
				ctx.fillStyle = fill;
				ctx.fill();
			}
			if (dash) ctx.setLineDash(dash);
			ctx.strokeStyle = stroke;
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.restore();
		}

		function draw(ctx, w, h) {
			ctx.clearRect(0, 0, w, h);
			const F = frame();
			// verformtes Gitter
			ctx.save();
			ctx.lineWidth = 1;
			ctx.strokeStyle = "rgba(29,58,134,0.28)";
			for (let k = -12; k <= 12; k++) {
				let [a, b] = [T([k, -12]), T([k, 12])];
				ctx.beginPath();
				ctx.moveTo(F.X(a[0]), F.Y(a[1]));
				ctx.lineTo(F.X(b[0]), F.Y(b[1]));
				ctx.stroke();
				[a, b] = [T([-12, k]), T([12, k])];
				ctx.beginPath();
				ctx.moveTo(F.X(a[0]), F.Y(a[1]));
				ctx.lineTo(F.X(b[0]), F.Y(b[1]));
				ctx.stroke();
			}
			ctx.restore();
			pen.line(ctx, 0, F.Y(0), w, F.Y(0), C.gridStrong, 1);
			pen.line(ctx, F.X(0), 0, F.X(0), h, C.gridStrong, 1);
			// Einheitsquadrat
			poly(ctx, F, [[0, 0], I, [I[0] + J[0], I[1] + J[1]], J], "rgba(255,240,122,0.75)", C.orange);
			// Haus: Original gestrichelt, Bild gefüllt
			poly(ctx, F, HOUSE, null, C.muted, [5, 4]);
			poly(ctx, F, HOUSE.map(T), "rgba(255,194,220,0.7)", C.text);
			poly(ctx, F, DOOR.map(T), "rgba(63,90,166,0.5)", C.text);
			// Grundvektoren
			pen.arrow(ctx, F.X(0), F.Y(0), F.X(I[0]), F.Y(I[1]), C.red, 3.5);
			pen.arrow(ctx, F.X(0), F.Y(0), F.X(J[0]), F.Y(J[1]), C.ink, 3.5);
			pen.dot(ctx, F.X(I[0]), F.Y(I[1]), 9, C.red, "#fff");
			pen.dot(ctx, F.X(J[0]), F.Y(J[1]), 9, C.ink, "#fff");
			pen.text(ctx, "î", F.X(I[0]) + 14, F.Y(I[1]) - 12, { size: 22, color: C.red });
			pen.text(ctx, "ĵ", F.X(J[0]) + 14, F.Y(J[1]) - 12, { size: 22, color: C.ink });
		}

		function update() {
			const [a, c] = I;
			const [b, d] = J;
			const det = a * d - b * c;
			out.textContent = `( ${fmt(a)}  ${fmt(b)} | ${fmt(c)}  ${fmt(d)} )`;
			note.textContent = `î → (${fmt(a)}, ${fmt(c)}) · ĵ → (${fmt(b)}, ${fmt(d)}) · Determinante ad − bc = ${fmt(det)}${det < 0 ? " → gespiegelt" : det === 0 ? " → alles platt auf eine Linie" : ""}`;
			S.redraw();
			if (a === 0 && c === 1 && b === -1 && d === 0) mark("15a", "Drehung um 90°: î geht nach oben, ĵ nach links. Die Matrix ist (0 −1 | 1 0), Determinante 1, keine Verzerrung.");
		}

		drag(cv, {
			down: (p) => {
				const F = frame();
				const dI = Math.hypot(p.x - F.X(I[0]), p.y - F.Y(I[1]));
				const dJ = Math.hypot(p.x - F.X(J[0]), p.y - F.Y(J[1]));
				if (Math.min(dI, dJ) > 34) return false;
				grab = dI <= dJ ? "I" : "J";
			},
			move: (p) => {
				const F = frame();
				const v = [F.ix(p.x), F.iy(p.y)].map((q) => Math.max(-4, Math.min(4, Math.round(q * 2) / 2)));
				if (grab === "I") I = v;
				else J = v;
				update();
			},
		});
		const P = { id: [[1, 0], [0, 1]], scale: [[2, 0], [0, 1.5]], shear: [[1, 0], [1, 1]], mirror: [[-1, 0], [0, 1]] };
		document.querySelectorAll("[data-preset]").forEach((b) =>
			b.addEventListener("click", () => {
				[I, J] = P[b.dataset.preset].map((v) => [...v]);
				update();
			})
		);
		update();
	})();
})();
