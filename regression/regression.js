// Lineare Regression von null an: Gerade von Hand, Fehler-Landschaft, Gradientenabstieg, kleinste Quadrate.

(() => {
	const { fmt, rng, gauss, plot, editPoints, scheduler } = window.ML;
	const $ = (id) => document.getElementById(id);
	const ACC = "#9be564";
	const ACC2 = "#3ddc97";
	const RANGE_M = [-2, 3];
	const RANGE_B = [-6, 10];

	// ---------- Daten, gemeinsam für alle Kapitel ----------
	let pts = [];
	function randomData(seed) {
		const r = rng(seed);
		const m = 0.3 + r() * 0.7;
		const b = 0.5 + r() * 3;
		pts = Array.from({ length: 22 }, () => {
			const x = 0.5 + r() * 9;
			const y = Math.min(9.8, Math.max(0.2, m * x + b + gauss(r) * 0.8));
			return { x, y };
		});
	}
	randomData(7);

	// Summen für MSE in geschlossener Form: MSE(m, b) in O(1)
	function sums() {
		const n = pts.length || 1;
		let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
		for (const p of pts) {
			sx += p.x;
			sy += p.y;
			sxx += p.x * p.x;
			sxy += p.x * p.y;
			syy += p.y * p.y;
		}
		return { n: pts.length, sx: sx / n, sy: sy / n, sxx: sxx / n, sxy: sxy / n, syy: syy / n };
	}
	const mse = (S, m, b) =>
		S.n ? S.sxx * m * m + 2 * S.sx * m * b + b * b - 2 * S.sxy * m - 2 * S.sy * b + S.syy : 0;
	function exact(S) {
		const vx = S.sxx - S.sx * S.sx;
		if (S.n < 2 || vx < 1e-9) return { m: 0, b: S.sy || 0 };
		const m = (S.sxy - S.sx * S.sy) / vx;
		return { m, b: S.sy - m * S.sx };
	}
	let S = sums();
	let best = exact(S);

	let ready = false;
	const hand = { m: 0.2, b: 5 };
	let showSquares = false;

	// ---------- Zeichnen ----------
	function drawScatter(P, m, b, { residuals = false, squares = false, color = ACC, centroid = false } = {}) {
		const c = P.ctx;
		P.clear();
		P.grid(1);
		c.save();
		c.beginPath();
		c.rect(0, 0, P.size.w, P.size.h);
		c.clip();
		if (residuals) {
			for (const p of pts) {
				const yh = m * p.x + b;
				const x = P.sx(p.x);
				const y1 = P.sy(p.y);
				const y2 = P.sy(yh);
				if (squares) {
					const s = y2 - y1;
					c.fillStyle = "rgba(255,138,122,0.13)";
					c.strokeStyle = "rgba(255,138,122,0.45)";
					c.lineWidth = 1;
					c.fillRect(x, y1, Math.abs(s), s);
					c.strokeRect(x, y1, Math.abs(s), s);
				}
				c.strokeStyle = "rgba(255,138,122,0.85)";
				c.lineWidth = 1.5;
				c.beginPath();
				c.moveTo(x, y1);
				c.lineTo(x, y2);
				c.stroke();
			}
		}
		if (pts.length || m !== undefined) {
			c.strokeStyle = color;
			c.lineWidth = 3;
			c.shadowColor = color;
			c.shadowBlur = 10;
			c.beginPath();
			c.moveTo(P.sx(P.x[0]), P.sy(m * P.x[0] + b));
			c.lineTo(P.sx(P.x[1]), P.sy(m * P.x[1] + b));
			c.stroke();
			c.shadowBlur = 0;
		}
		c.restore();
		for (const p of pts) P.dot(p.x, p.y, 5);
		if (centroid && pts.length) {
			const x = P.sx(S.sx);
			const y = P.sy(S.sy);
			c.strokeStyle = ACC2;
			c.lineWidth = 2;
			c.beginPath();
			c.moveTo(x - 8, y);
			c.lineTo(x + 8, y);
			c.moveTo(x, y - 8);
			c.lineTo(x, y + 8);
			c.stroke();
		}
	}

	// Fehler-Landschaft als Bild, nur bei geänderten Daten neu berechnen
	const landImg = document.createElement("canvas");
	const LW = 160;
	const LH = 160;
	landImg.width = LW;
	landImg.height = LH;
	function renderLandscape() {
		const g = landImg.getContext("2d");
		const img = g.createImageData(LW, LH);
		const lmin = mse(S, best.m, best.b);
		let lmax = 0;
		const vals = new Float32Array(LW * LH);
		for (let j = 0; j < LH; j++) {
			const b = RANGE_B[1] - ((j + 0.5) / LH) * (RANGE_B[1] - RANGE_B[0]);
			for (let i = 0; i < LW; i++) {
				const m = RANGE_M[0] + ((i + 0.5) / LW) * (RANGE_M[1] - RANGE_M[0]);
				const v = Math.log1p(Math.max(0, mse(S, m, b) - lmin));
				vals[j * LW + i] = v;
				if (v > lmax) lmax = v;
			}
		}
		const stops = [
			[0, [4, 14, 8]],
			[0.35, [22, 72, 40]],
			[0.7, [120, 190, 80]],
			[1, [250, 240, 190]],
		];
		for (let k = 0; k < vals.length; k++) {
			const t = lmax ? vals[k] / lmax : 0;
			let a = stops[0];
			let z = stops[stops.length - 1];
			for (let s = 0; s < stops.length - 1; s++) {
				if (t >= stops[s][0] && t <= stops[s + 1][0]) {
					a = stops[s];
					z = stops[s + 1];
					break;
				}
			}
			const u = (t - a[0]) / (z[0] - a[0] || 1);
			// Höhenlinien
			const band = (t * 14) % 1;
			const line = band < 0.07 ? 0.7 : 1;
			img.data[k * 4] = (a[1][0] + (z[1][0] - a[1][0]) * u) * line;
			img.data[k * 4 + 1] = (a[1][1] + (z[1][1] - a[1][1]) * u) * line;
			img.data[k * 4 + 2] = (a[1][2] + (z[1][2] - a[1][2]) * u) * line;
			img.data[k * 4 + 3] = 255;
		}
		g.putImageData(img, 0, 0);
	}

	function drawLandscape(P, marker, path) {
		const c = P.ctx;
		c.imageSmoothingEnabled = true;
		c.drawImage(landImg, P.sx(RANGE_M[0]), P.sy(RANGE_B[1]), P.sx(RANGE_M[1]) - P.sx(RANGE_M[0]), P.sy(RANGE_B[0]) - P.sy(RANGE_B[1]));
		// Minimum
		if (pts.length >= 2) {
			const x = P.sx(best.m);
			const y = P.sy(best.b);
			c.strokeStyle = "#fff";
			c.lineWidth = 2;
			c.beginPath();
			c.moveTo(x - 6, y - 6);
			c.lineTo(x + 6, y + 6);
			c.moveTo(x + 6, y - 6);
			c.lineTo(x - 6, y + 6);
			c.stroke();
		}
		if (path && path.length > 1) {
			c.save();
			c.beginPath();
			c.rect(0, 0, P.size.w, P.size.h);
			c.clip();
			c.strokeStyle = "rgba(255,255,255,0.85)";
			c.lineWidth = 1.5;
			c.beginPath();
			const stride = Math.max(1, Math.floor(path.length / 600));
			path.forEach(([m, b], i) => {
				if (i % stride && i !== path.length - 1) return;
				const x = P.sx(m);
				const y = P.sy(b);
				if (i === 0) c.moveTo(x, y);
				else c.lineTo(x, y);
			});
			c.stroke();
			c.restore();
		}
		if (marker) {
			const x = Math.min(P.size.w - 4, Math.max(4, P.sx(marker.m)));
			const y = Math.min(P.size.h - 4, Math.max(4, P.sy(marker.b)));
			c.beginPath();
			c.arc(x, y, 7, 0, Math.PI * 2);
			c.fillStyle = ACC;
			c.fill();
			c.lineWidth = 2.5;
			c.strokeStyle = "#070806";
			c.stroke();
		}
	}

	// ---------- Kapitel 1 + 2: von Hand ----------
	const pHand = plot($("cvHand"), { aspect: (w) => (w < 520 ? 1.05 : 1.3), x: [0, 10], y: [0, 10], onResize: () => redrawAll() });
	const pSmall = plot($("cvFitSmall"), { aspect: 1, x: [0, 10], y: [0, 10], pad: 8, onResize: () => redrawAll() });
	const pLand = plot($("cvLand"), { aspect: 1, x: RANGE_M, y: RANGE_B, pad: 0, onResize: () => redrawAll() });
	const mIn = $("mIn");
	const bIn = $("bIn");

	function setHand(m, b) {
		hand.m = Math.min(RANGE_M[1], Math.max(RANGE_M[0], m));
		hand.b = Math.min(RANGE_B[1], Math.max(RANGE_B[0], b));
		mIn.value = hand.m;
		bIn.value = hand.b;
		[mIn, bIn].forEach((r) => r.style.setProperty("--fill", `${((r.value - r.min) / (r.max - r.min)) * 100}%`));
		redrawHand();
	}

	function redrawHand() {
		$("mOut").textContent = fmt(hand.m);
		$("bOut").textContent = fmt(hand.b);
		drawScatter(pHand, hand.m, hand.b, { residuals: true, squares: showSquares });
		drawScatter(pSmall, hand.m, hand.b, { residuals: true });
		pLand.clear();
		drawLandscape(pLand, hand);
		const L = mse(S, hand.m, hand.b);
		const Lb = mse(S, best.m, best.b);
		$("handReadout").textContent = pts.length ? `MSE ${fmt(L)}` : "";
		$("landM").textContent = fmt(hand.m);
		$("landB").textContent = fmt(hand.b);
		$("landL").textContent = fmt(L);
		const note = $("handNote");
		if (pts.length < 2) note.textContent = "Tipp auf die Fläche, um mindestens zwei Punkte zu setzen.";
		else {
			const ratio = L / Math.max(Lb, 1e-9);
			note.textContent =
				ratio < 1.03
					? `Volltreffer: ${fmt(L)} ist praktisch der kleinstmögliche Fehler (${fmt(Lb)}).`
					: ratio < 1.3
						? `Sehr nah dran. Bestmöglich wäre ein MSE von ${fmt(Lb)}.`
						: `Dein Fehler ist ${fmt(ratio, 1)}-mal so groß wie das Bestmögliche. Weiter drehen.`;
		}
	}

	mIn.addEventListener("input", () => {
		hand.m = Number(mIn.value);
		redrawHand();
	});
	bIn.addEventListener("input", () => {
		hand.b = Number(bIn.value);
		redrawHand();
	});
	$("btnSquares").addEventListener("click", (e) => {
		showSquares = !showSquares;
		e.currentTarget.setAttribute("aria-pressed", String(showSquares));
		redrawHand();
	});
	$("btnRandom").addEventListener("click", () => {
		randomData((Math.random() * 1e9) | 0);
		dataChanged();
	});
	$("btnClear").addEventListener("click", () => {
		pts = [];
		dataChanged();
	});

	// Landschaft anklicken oder ziehen setzt m und b
	function landPointer(canvas, P, fn) {
		let down = false;
		const at = (e) => {
			const r = canvas.getBoundingClientRect();
			fn(P.ix(e.clientX - r.left), P.iy(e.clientY - r.top));
		};
		canvas.addEventListener("pointerdown", (e) => {
			down = true;
			canvas.setPointerCapture(e.pointerId);
			at(e);
		});
		canvas.addEventListener("pointermove", (e) => down && at(e));
		canvas.addEventListener("pointerup", () => (down = false));
		canvas.addEventListener("pointercancel", () => (down = false));
	}
	landPointer($("cvLand"), pLand, (m, b) => setHand(m, b));

	// ---------- Kapitel 3: Gradientenabstieg ----------
	const pGdFit = plot($("cvGdFit"), { aspect: 1, x: [0, 10], y: [0, 10], pad: 8, onResize: () => redrawGd() });
	const pGdLand = plot($("cvGdLand"), { aspect: 1, x: RANGE_M, y: RANGE_B, pad: 0, onResize: () => redrawGd() });
	const loss = window.fitCanvas($("cvLoss"), (w) => (w < 520 ? 3 : 4.5), () => ready && redrawGd());
	const lrIn = $("lrIn");
	const lrOf = () => 0.001 * Math.pow(40, Number(lrIn.value) / 100);
	const gd = { m: -1.5, b: -4, start: [-1.5, -4], step: 0, path: [], hist: [], running: false, exploded: false };

	function gdReset(m = gd.start[0], b = gd.start[1]) {
		gd.start = [m, b];
		gd.m = m;
		gd.b = b;
		gd.step = 0;
		gd.exploded = false;
		gd.path = [[m, b]];
		gd.hist = [mse(S, m, b)];
		redrawGd();
	}

	function gdStep() {
		if (gd.exploded || pts.length < 1) return;
		const n = pts.length;
		let gm = 0;
		let gb = 0;
		for (const p of pts) {
			const err = p.y - (gd.m * p.x + gd.b);
			gm += (-2 / n) * p.x * err;
			gb += (-2 / n) * err;
		}
		const lr = lrOf();
		gd.m -= lr * gm;
		gd.b -= lr * gb;
		gd.step++;
		const L = mse(S, gd.m, gd.b);
		if (!Number.isFinite(L) || Math.abs(gd.m) > 1e6 || L > 1e12) {
			gd.exploded = true;
			gd.running = false;
		}
		gd.path.push([gd.m, gd.b]);
		gd.hist.push(L);
		if (gd.path.length > 6000) {
			gd.path.splice(1, 1);
			gd.hist.splice(1, 1);
		}
	}

	function redrawGd() {
		drawScatter(pGdFit, gd.m, gd.b, { residuals: true });
		pGdLand.clear();
		drawLandscape(pGdLand, gd, gd.path);
		// Fehlerkurve (logarithmisch)
		const c = loss.ctx;
		const { w, h } = loss.size;
		c.fillStyle = "#070806";
		c.fillRect(0, 0, w, h);
		const Lb = Math.max(mse(S, best.m, best.b), 1e-6);
		const hist = gd.hist;
		if (hist.length > 1) {
			const ly = (v) => Math.log10(Math.max(v, Lb * 0.999));
			const top = Math.max(ly(hist[0]) + 0.3, ...hist.slice(0, 200).map(ly));
			const bot = Math.log10(Lb) - 0.1;
			const yOf = (v) => 8 + (1 - (Math.min(ly(v), top) - bot) / (top - bot)) * (h - 16);
			c.strokeStyle = "rgba(255,255,255,0.18)";
			c.setLineDash([4, 4]);
			c.beginPath();
			c.moveTo(0, yOf(Lb));
			c.lineTo(w, yOf(Lb));
			c.stroke();
			c.setLineDash([]);
			c.strokeStyle = gd.exploded ? "#ff8a7a" : ACC;
			c.lineWidth = 2;
			c.beginPath();
			const N = hist.length;
			for (let i = 0; i < N; i++) {
				const x = 6 + (i / Math.max(N - 1, 1)) * (w - 12);
				if (i === 0) c.moveTo(x, yOf(hist[i]));
				else c.lineTo(x, yOf(hist[i]));
			}
			c.stroke();
			c.fillStyle = "rgba(244,239,230,0.4)";
			c.font = "11px Space Grotesk, sans-serif";
			c.textAlign = "right";
			c.fillText("bestmöglich", w - 8, yOf(Lb) - 5);
		}
		const L = hist[hist.length - 1];
		$("lrOut").textContent = fmt(lrOf(), 4);
		$("gdStep").textContent = gd.step.toLocaleString("de-DE");
		$("gdM").textContent = gd.exploded ? "💥" : fmt(gd.m);
		$("gdB").textContent = gd.exploded ? "💥" : fmt(gd.b);
		$("gdL").textContent = gd.exploded ? "explodiert" : fmt(L);
		const note = $("gdNote");
		if (gd.exploded) note.textContent = "Explodiert: Die Schritte waren zu groß und haben sich aufgeschaukelt. Lernrate kleiner stellen und zurück auf Start.";
		else if (gd.step && L / Lb < 1.001) note.textContent = `Im Tal angekommen nach ${gd.step.toLocaleString("de-DE")} Schritten.`;
		else if (gd.step > 50 && hist[hist.length - 1] > hist[hist.length - 20]) note.textContent = "Der Fehler wächst: Die Lernrate ist zu groß.";
		else if (!gd.step) note.textContent = "Tipp in die Landschaft, um einen anderen Startpunkt zu wählen.";
		else note.textContent = "Unterwegs bergab …";
		$("btnRun").textContent = gd.running ? "❚❚ Anhalten" : "▶ Abstieg starten";
	}

	function tick() {
		if (!gd.running) return;
		for (let i = 0; i < 12; i++) gdStep();
		const Lb = mse(S, best.m, best.b);
		if (gd.hist[gd.hist.length - 1] / Math.max(Lb, 1e-9) < 1.0005 || gd.step > 20000) gd.running = false;
		redrawGd();
		if (gd.running) requestAnimationFrame(tick);
	}
	$("btnRun").addEventListener("click", () => {
		if (gd.exploded) gdReset();
		gd.running = !gd.running;
		redrawGd();
		if (gd.running) requestAnimationFrame(tick);
	});
	$("btnStep").addEventListener("click", () => {
		gd.running = false;
		gdStep();
		redrawGd();
	});
	$("btnReset").addEventListener("click", () => {
		gd.running = false;
		gdReset();
	});
	lrIn.addEventListener("input", redrawGd);
	landPointer($("cvGdLand"), pGdLand, (m, b) => {
		gd.running = false;
		gdReset(m, b);
	});

	// ---------- Kapitel 4: exakte Lösung ----------
	const pExact = plot($("cvExact"), { aspect: (w) => (w < 520 ? 1.05 : 1.3), x: [0, 10], y: [0, 10], onResize: () => redrawExact() });
	const predIn = $("predIn");
	function redrawExact() {
		const { m, b } = best;
		drawScatter(pExact, m, b, { color: ACC, centroid: true });
		const c = pExact.ctx;
		const xp = Number(predIn.value);
		const yp = m * xp + b;
		if (pts.length >= 2) {
			c.setLineDash([5, 5]);
			c.strokeStyle = "rgba(255,255,255,0.5)";
			c.lineWidth = 1;
			c.beginPath();
			c.moveTo(pExact.sx(xp), pExact.sy(0));
			c.lineTo(pExact.sx(xp), pExact.sy(Math.min(10, Math.max(0, yp))));
			c.lineTo(pExact.sx(0), pExact.sy(Math.min(10, Math.max(0, yp))));
			c.stroke();
			c.setLineDash([]);
			if (yp >= 0 && yp <= 10) pExact.dot(xp, yp, 7, ACC2, "#070806");
		}
		const Lb = mse(S, m, b);
		const vy = S.syy - S.sy * S.sy;
		const r2 = vy > 1e-9 ? 1 - Lb / vy : 1;
		$("exM").textContent = fmt(m);
		$("exB").textContent = fmt(b);
		$("exR").textContent = pts.length >= 2 ? fmt(r2) : "–";
		$("exN").textContent = pts.length;
		$("predOut").textContent = `${fmt(xp, 1)} → ŷ = ${fmt(yp)}`;
		$("exactReadout").textContent = pts.length >= 2 ? `ŷ = ${fmt(m)}·x ${b < 0 ? "−" : "+"} ${fmt(Math.abs(b))}` : "";
	}
	predIn.addEventListener("input", redrawExact);
	$("btnExactToHand").addEventListener("click", () => {
		setHand(best.m, best.b);
		document.getElementById("gerade").scrollIntoView({ behavior: "smooth" });
	});

	// ---------- Alles verbinden ----------
	function redrawAll() {
		redrawHand();
		redrawGd();
		redrawExact();
	}
	const redrawSoon = scheduler(redrawAll);
	function dataChanged() {
		S = sums();
		best = exact(S);
		renderLandscape();
		gd.running = false;
		gdReset();
		redrawSoon();
	}
	const edit = { points: () => pts, onChange: dataChanged };
	editPoints($("cvHand"), pHand, edit);
	editPoints($("cvExact"), pExact, edit);

	ready = true;
	renderLandscape();
	gdReset();
	setHand(hand.m, hand.b);
	redrawAll();
})();
