// Mathematik: Einheitskreis, Sinuswelle und ein zweiter Kreis (Fourier-Idee)
(() => {
	const canvas = document.getElementById("circleCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.4 : 2));
	const out = document.getElementById("circleOut");
	const note = document.getElementById("circleNote");
	const btnSpin = document.getElementById("btnSpin");
	const btnSecond = document.getElementById("btnSecond");
	const kIn = document.getElementById("k");
	const rIn = document.getElementById("r2");
	const ACC = getComputedStyle(document.documentElement).getPropertyValue("--fach").trim();
	const SIN = "#ff9ec7";
	const COS = "#7bdc9a";

	let phi = 0;
	let spin = true;
	let second = false;
	let dragging = false;
	const fmt = (v) => v.toFixed(2).replace(".", ",").replace("-", "−");

	const layout = () => {
		const R = Math.min(size.h * 0.36, size.w * 0.2);
		const cx = R + 24;
		const cy = size.h / 2;
		return { R, cx, cy, x0: cx + R + 36 };
	};
	const k = () => Number(kIn.value);
	const r2 = () => (second ? Number(rIn.value) / 100 : 0);
	const height = (a) => Math.sin(a) + r2() * Math.sin(k() * a);

	function draw() {
		const { w, h } = size;
		const { R, cx, cy, x0 } = layout();
		const scale = R / (1 + r2());
		ctx.clearRect(0, 0, w, h);

		// Achsen
		ctx.strokeStyle = "rgba(255,255,255,0.1)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(8, cy);
		ctx.lineTo(w - 8, cy);
		ctx.moveTo(cx, cy - R - 12);
		ctx.lineTo(cx, cy + R + 12);
		ctx.stroke();

		// Kreis 1
		ctx.strokeStyle = "rgba(255,255,255,0.35)";
		ctx.beginPath();
		ctx.arc(cx, cy, scale, 0, Math.PI * 2);
		ctx.stroke();
		const p1x = cx + scale * Math.cos(phi);
		const p1y = cy - scale * Math.sin(phi);

		// Winkelbogen
		ctx.strokeStyle = ACC;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(cx, cy, 16, 0, -(((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)), true);
		ctx.stroke();

		// Radius
		ctx.strokeStyle = "rgba(255,255,255,0.7)";
		ctx.beginPath();
		ctx.moveTo(cx, cy);
		ctx.lineTo(p1x, p1y);
		ctx.stroke();

		let px = p1x;
		let py = p1y;
		if (second) {
			const rr = scale * r2();
			ctx.strokeStyle = "rgba(255,255,255,0.25)";
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.arc(p1x, p1y, rr, 0, Math.PI * 2);
			ctx.stroke();
			px = p1x + rr * Math.cos(k() * phi);
			py = p1y - rr * Math.sin(k() * phi);
			ctx.strokeStyle = "rgba(255,255,255,0.7)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(p1x, p1y);
			ctx.lineTo(px, py);
			ctx.stroke();
		} else {
			// Sinus und Kosinus als Strecken
			ctx.lineWidth = 3;
			ctx.strokeStyle = SIN;
			ctx.beginPath();
			ctx.moveTo(px, cy);
			ctx.lineTo(px, py);
			ctx.stroke();
			ctx.strokeStyle = COS;
			ctx.beginPath();
			ctx.moveTo(cx, cy);
			ctx.lineTo(px, cy);
			ctx.stroke();
		}

		// Welle: links die Gegenwart, nach rechts die Vergangenheit
		ctx.strokeStyle = SIN;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		for (let x = x0; x <= w - 8; x += 2) {
			const a = phi - (x - x0) / (scale * 0.9);
			const y = cy - scale * height(a);
			x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
		}
		ctx.stroke();

		// Verbindungslinie Punkt → Welle
		ctx.setLineDash([4, 5]);
		ctx.strokeStyle = "rgba(255,255,255,0.4)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(px, py);
		ctx.lineTo(x0, py);
		ctx.stroke();
		ctx.setLineDash([]);

		ctx.fillStyle = "#fff";
		ctx.beginPath();
		ctx.arc(px, py, 7, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = SIN;
		ctx.beginPath();
		ctx.arc(x0, py, 5, 0, Math.PI * 2);
		ctx.fill();

		const deg = Math.round((((phi * 180) / Math.PI) % 360 + 360) % 360);
		out.textContent = `φ = ${deg}°`;
		note.textContent = second
			? `Höhe = sin(φ) + ${fmt(r2())} · sin(${k()}φ) = ${fmt(height(phi))}`
			: `sin(${deg}°) = ${fmt(Math.sin(phi))} · cos(${deg}°) = ${fmt(Math.cos(phi))}`;
	}

	whenVisible(canvas, (dt) => {
		if (spin && !dragging) phi += dt * 1.1;
		draw();
	});

	const setFromPointer = (e) => {
		const r = canvas.getBoundingClientRect();
		const { cx, cy } = layout();
		phi = Math.atan2(cy - (e.clientY - r.top), e.clientX - r.left - cx);
	};
	canvas.addEventListener("pointerdown", (e) => {
		dragging = true;
		canvas.setPointerCapture(e.pointerId);
		setFromPointer(e);
	});
	canvas.addEventListener("pointermove", (e) => dragging && setFromPointer(e));
	canvas.addEventListener("pointerup", () => (dragging = false));
	canvas.addEventListener("pointercancel", () => (dragging = false));

	btnSpin.addEventListener("click", () => {
		spin = !spin;
		btnSpin.setAttribute("aria-pressed", String(spin));
	});
	btnSecond.addEventListener("click", () => {
		second = !second;
		btnSecond.setAttribute("aria-pressed", String(second));
	});
	kIn.addEventListener("input", () => (document.getElementById("kOut").textContent = `${kIn.value}×`));
	rIn.addEventListener("input", () => (document.getElementById("rOut").textContent = `${rIn.value} %`));
	draw();
})();

const mathFmt = (v, d = 2) => v.toFixed(d).replace(".", ",").replace("-", "−");
const mathEuro = (v) =>
	v >= 1e6
		? `${mathFmt(v / 1e6, v >= 1e8 ? 0 : 1)} Mio. €`
		: `${Math.round(v).toLocaleString("de-DE")} €`;
const mathReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

// 02 · Linear gegen exponentiell: einfache Zinsen gegen Zinseszins
(() => {
	const canvas = document.getElementById("growCanvas");
	const rateIn = document.getElementById("rate");
	const yearsIn = document.getElementById("years");
	const btnLog = document.getElementById("btnLog");
	const out = document.getElementById("growOut");
	const note = document.getElementById("growNote");
	const ACC = getComputedStyle(document.documentElement).getPropertyValue("--fach").trim();
	const LIN = "#7bdc9a";
	const K0 = 1000;
	let log = false;
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.15 : 1.6), () => queueMicrotask(draw));

	function draw() {
		const { w, h } = size;
		if (!w) return;
		const p = Number(rateIn.value) / 100;
		const N = Number(yearsIn.value);
		const comp = (n) => K0 * Math.pow(1 + p, n);
		const lin = (n) => K0 * (1 + p * n);
		const top = comp(N);
		const pad = { l: 58, r: 14, t: 40, b: 30 };
		const pw = w - pad.l - pad.r;
		const ph = h - pad.t - pad.b;
		const X = (n) => pad.l + (n / N) * pw;
		const lo = Math.log10(K0 / 2);
		const hi = Math.log10(top * 1.15);
		const Y = log
			? (v) => pad.t + ph - ((Math.log10(v) - lo) / (hi - lo)) * ph
			: (v) => pad.t + ph - (v / (top * 1.08)) * ph;
		ctx.clearRect(0, 0, w, h);

		// Gitter und Beschriftung
		ctx.font = "11px 'JetBrains Mono', monospace";
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";
		const ticks = [];
		if (log) {
			for (let e = Math.ceil(lo); e <= hi; e++) ticks.push(10 ** e);
		} else {
			const raw = (top * 1.08) / 4;
			const mag = 10 ** Math.floor(Math.log10(raw));
			const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
			for (let v = 0; v <= top * 1.08; v += step) ticks.push(v);
		}
		ticks.forEach((v) => {
			const y = Y(v || 1e-9);
			if (y < pad.t - 2 || y > pad.t + ph + 2) return;
			ctx.strokeStyle = "rgba(255,255,255,0.08)";
			ctx.beginPath();
			ctx.moveTo(pad.l, y);
			ctx.lineTo(w - pad.r, y);
			ctx.stroke();
			ctx.fillStyle = "rgba(255,255,255,0.5)";
			const label = v >= 1e6 ? `${v / 1e6} Mio` : v >= 1e3 ? `${v / 1e3}k` : String(v);
			ctx.fillText(label, pad.l - 8, y);
		});
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		const ys = N <= 20 ? 5 : 10;
		for (let n = 0; n <= N; n += ys) ctx.fillText(String(n), X(n), pad.t + ph + 8);

		// Verdopplungen markieren
		const tD = Math.log(2) / Math.log(1 + p);
		ctx.setLineDash([3, 5]);
		ctx.strokeStyle = "rgba(255,255,255,0.18)";
		for (let k = 1; k * tD <= N; k++) {
			ctx.beginPath();
			ctx.moveTo(X(k * tD), pad.t + ph);
			ctx.lineTo(X(k * tD), Y(K0 * 2 ** k));
			ctx.stroke();
		}
		ctx.setLineDash([]);

		// Kurven: einfache Zinsen als Treppe, Zinseszins als Kurve
		const curve = (f, color, width) => {
			ctx.strokeStyle = color;
			ctx.lineWidth = width;
			ctx.beginPath();
			for (let i = 0; i <= 200; i++) {
				const n = (i / 200) * N;
				i ? ctx.lineTo(X(n), Y(f(n))) : ctx.moveTo(X(n), Y(f(n)));
			}
			ctx.stroke();
		};
		curve(lin, LIN, 2.5);
		curve(comp, ACC, 3);
		for (let k = 1; k * tD <= N; k++) {
			ctx.fillStyle = ACC;
			ctx.beginPath();
			ctx.arc(X(k * tD), Y(K0 * 2 ** k), 4, 0, Math.PI * 2);
			ctx.fill();
		}

		// Legende
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.font = "12px 'Space Grotesk', sans-serif";
		ctx.fillStyle = ACC;
		ctx.fillText("● Zinseszins", pad.l + 10, pad.t + 10);
		ctx.fillStyle = LIN;
		ctx.fillText("● einfache Zinsen", pad.l + 10, pad.t + 28);

		document.getElementById("rateOut").textContent = `${rateIn.value} %`;
		document.getElementById("yearsOut").textContent = `${N} Jahre`;
		out.textContent = `×2 alle ${mathFmt(tD, tD < 10 ? 1 : 0)} Jahre`;
		note.textContent = `Nach ${N} Jahren: einfache Zinsen ${mathEuro(lin(N))}, Zinseszins ${mathEuro(comp(N))}. Faustregel 72 ÷ ${rateIn.value} = ${mathFmt(72 / Number(rateIn.value), 1)} Jahre.`;
	}

	rateIn.addEventListener("input", draw);
	yearsIn.addEventListener("input", draw);
	btnLog.addEventListener("click", () => {
		log = !log;
		btnLog.setAttribute("aria-pressed", String(log));
		draw();
	});
	draw();
})();

// 03 · Sekante wird Tangente: die Ableitung als Grenzwert
(() => {
	const canvas = document.getElementById("slopeCanvas");
	const hIn = document.getElementById("h");
	const xIn = document.getElementById("xPos");
	const btnLimit = document.getElementById("btnLimit");
	const btnTrace = document.getElementById("btnTrace");
	const out = document.getElementById("slopeOut");
	const tag = document.getElementById("slopeTag");
	const note = document.getElementById("slopeNote");
	const fnButtons = [...document.querySelectorAll("[data-fn]")];
	const ACC = getComputedStyle(document.documentElement).getPropertyValue("--fach").trim();
	const SEC = "#ffd166";
	const DER = "#7bdc9a";

	const FNS = [
		{ name: "x²", f: (x) => x * x, d: (x) => 2 * x, dName: "2x", x: [-3, 3], y: [-6.5, 9.5] },
		{ name: "x³/3 − x", f: (x) => (x * x * x) / 3 - x, d: (x) => x * x - 1, dName: "x² − 1", x: [-3, 3], y: [-6.5, 8.5] },
		{ name: "sin x", f: Math.sin, d: Math.cos, dName: "cos x", x: [-6, 6], y: [-1.8, 1.8] },
	];
	let fi = 0;
	let x0 = 1.5;
	let hv = 1.5;
	let anim = null;
	let trace = false;
	let traced = [];
	let dragging = false;
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.1 : 1.5), () => queueMicrotask(draw));

	const F = () => FNS[fi];
	const view = () => {
		const { w, h } = size;
		const [a, b] = F().x;
		const [c, d] = F().y;
		return {
			X: (x) => ((x - a) / (b - a)) * w,
			Y: (y) => h - ((y - c) / (d - c)) * h,
			inv: (px) => a + (px / w) * (b - a),
		};
	};
	const syncInputs = () => {
		const [a, b] = F().x;
		xIn.min = String(a * 100);
		xIn.max = String(b * 100);
		xIn.value = String(Math.round(x0 * 100));
		hIn.value = String(Math.round(hv * 100));
	};

	function draw() {
		const { w, h } = size;
		if (!w) return;
		const { X, Y } = view();
		const fn = F();
		ctx.clearRect(0, 0, w, h);

		// Achsen
		ctx.strokeStyle = "rgba(255,255,255,0.15)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, Y(0));
		ctx.lineTo(w, Y(0));
		ctx.moveTo(X(0), 0);
		ctx.lineTo(X(0), h);
		ctx.stroke();

		// Spur der Steigung: gesammelte Punkte (x, f'(x))
		if (trace) {
			ctx.fillStyle = DER;
			traced.forEach((x) => {
				ctx.beginPath();
				ctx.arc(X(x), Y(fn.d(x)), 2.4, 0, Math.PI * 2);
				ctx.fill();
			});
		}

		// Kurve
		ctx.strokeStyle = "rgba(255,255,255,0.85)";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		for (let px = 0; px <= w; px += 2) {
			const y = Y(fn.f(view().inv(px)));
			px ? ctx.lineTo(px, y) : ctx.moveTo(px, y);
		}
		ctx.stroke();

		// Sekante (oder Tangente bei h ≈ 0) über die ganze Breite
		const y0 = fn.f(x0);
		const m = hv > 0.005 ? (fn.f(x0 + hv) - y0) / hv : fn.d(x0);
		const isTan = hv <= 0.005;
		const [a, b] = fn.x;
		ctx.strokeStyle = isTan ? ACC : SEC;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(X(a), Y(y0 + m * (a - x0)));
		ctx.lineTo(X(b), Y(y0 + m * (b - x0)));
		ctx.stroke();

		// Steigungsdreieck
		if (!isTan) {
			const x1 = x0 + hv;
			const y1 = fn.f(x1);
			ctx.setLineDash([4, 4]);
			ctx.strokeStyle = "rgba(255,255,255,0.55)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(X(x0), Y(y0));
			ctx.lineTo(X(x1), Y(y0));
			ctx.lineTo(X(x1), Y(y1));
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.font = "12px 'JetBrains Mono', monospace";
			ctx.fillStyle = "rgba(255,255,255,0.75)";
			ctx.textAlign = "center";
			ctx.textBaseline = y1 >= y0 ? "top" : "bottom";
			ctx.fillText("h", (X(x0) + X(x1)) / 2, Y(y0) + (y1 >= y0 ? 4 : -4));
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText("Δy", X(x1) + 6, (Y(y0) + Y(y1)) / 2);
			ctx.fillStyle = SEC;
			ctx.beginPath();
			ctx.arc(X(x1), Y(y1), 6, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = "#fff";
		ctx.beginPath();
		ctx.arc(X(x0), Y(y0), 8, 0, Math.PI * 2);
		ctx.fill();

		tag.textContent = `f(x) = ${fn.name}`;
		document.getElementById("hOut").textContent = mathFmt(hv);
		document.getElementById("xOut").textContent = mathFmt(x0);
		out.textContent = `${isTan ? "Tangente" : "Sekante"}: Steigung ${mathFmt(m)}`;
		note.textContent = isTan
			? `h ist praktisch null, die Gerade berührt die Kurve nur noch. Die Ableitung von ${fn.name} ist ${fn.dName}, also f′(${mathFmt(x0)}) = ${mathFmt(fn.d(x0))}.`
			: `Δy ÷ h = ${mathFmt(fn.f(x0 + hv) - y0)} ÷ ${mathFmt(hv)} = ${mathFmt(m)}. Die echte Steigung im Punkt ist ${mathFmt(fn.d(x0))}, Abweichung ${mathFmt(Math.abs(m - fn.d(x0)))}.`;
	}

	const record = () => {
		if (trace) traced.push(x0);
		while (traced.length > 900) traced.shift();
	};
	const setX = (v) => {
		const [a, b] = F().x;
		const nx = Math.min(b, Math.max(a, v));
		// Bei Sprüngen Zwischenpunkte ergänzen, damit die Spur lückenlos bleibt
		if (trace) {
			const n = Math.floor(Math.abs(nx - x0) / ((b - a) / 120));
			for (let i = 1; i < n; i++) traced.push(x0 + ((nx - x0) * i) / n);
		}
		x0 = nx;
		xIn.value = String(Math.round(x0 * 100));
		record();
		draw();
	};

	canvas.addEventListener("pointerdown", (e) => {
		dragging = true;
		canvas.setPointerCapture(e.pointerId);
		setX(view().inv(e.clientX - canvas.getBoundingClientRect().left));
	});
	canvas.addEventListener("pointermove", (e) => {
		if (dragging) setX(view().inv(e.clientX - canvas.getBoundingClientRect().left));
	});
	canvas.addEventListener("pointerup", () => (dragging = false));
	canvas.addEventListener("pointercancel", () => (dragging = false));
	xIn.addEventListener("input", () => setX(Number(xIn.value) / 100));
	hIn.addEventListener("input", () => {
		cancelAnimationFrame(anim);
		hv = Number(hIn.value) / 100;
		draw();
	});

	btnLimit.addEventListener("click", () => {
		cancelAnimationFrame(anim);
		if (mathReduced.matches) {
			hv = 0;
			syncInputs();
			draw();
			return;
		}
		if (hv < 0.01) hv = 1.5;
		const step = () => {
			hv = hv * 0.96 - 0.002;
			if (hv <= 0.005) hv = 0;
			syncInputs();
			draw();
			if (hv > 0) anim = requestAnimationFrame(step);
		};
		anim = requestAnimationFrame(step);
	});

	btnTrace.addEventListener("click", () => {
		trace = !trace;
		btnTrace.setAttribute("aria-pressed", String(trace));
		traced = [];
		if (trace) {
			hv = 0;
			syncInputs();
			record();
			note.textContent = "";
		}
		draw();
		if (trace)
			note.textContent += ` Jetzt fahr mit dem Punkt hin und her: Die grünen Punkte bilden f′(x) = ${F().dName}.`;
	});

	fnButtons.forEach((b) =>
		b.addEventListener("click", () => {
			fi = Number(b.dataset.fn);
			fnButtons.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
			const [a, c] = F().x;
			x0 = Math.min(c, Math.max(a, x0));
			traced = [];
			syncInputs();
			record();
			draw();
		})
	);
	syncInputs();
	draw();
})();

// 04 · Galton-Brett: viele Zufallsentscheidungen ergeben eine Binomialverteilung
(() => {
	const canvas = document.getElementById("galtonCanvas");
	const rowsIn = document.getElementById("rows");
	const pIn = document.getElementById("pRight");
	const btnCurve = document.getElementById("btnCurve");
	const out = document.getElementById("galtonOut");
	const note = document.getElementById("galtonNote");
	const ACC = getComputedStyle(document.documentElement).getPropertyValue("--fach").trim();
	const EXP = "#ffd166";

	let rows = 10;
	let p = 0.5;
	let bins = new Array(rows + 1).fill(0);
	let balls = [];
	let queue = 0;
	let showCurve = true;
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.85 : 1.25), () => queueMicrotask(draw));

	const geo = () => {
		const { w, h } = size;
		const dx = Math.min(w / (rows + 2), 46);
		const top = 26;
		const pegH = h * 0.5;
		const dy = (pegH - top) / rows;
		return { w, h, dx, dy, top, cx: w / 2, binTop: pegH + 10, binBottom: h - 6 };
	};
	// Binomialkoeffizient und Wahrscheinlichkeit für k Sprünge nach rechts
	const choose = (n, k) => {
		let r = 1;
		for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
		return r;
	};
	const prob = (k) => choose(rows, k) * p ** k * (1 - p) ** (rows - k);
	const pathFor = () => {
		const steps = [];
		for (let r = 0; r < rows; r++) steps.push(Math.random() < p ? 1 : 0);
		return steps;
	};
	const total = () => bins.reduce((s, v) => s + v, 0);

	function spawn() {
		const path = pathFor();
		if (mathReduced.matches) {
			bins[path.reduce((s, v) => s + v, 0)]++;
			return;
		}
		balls.push({ path, t: 0 });
	}

	function draw() {
		if (!size.w) return;
		const { w, h, dx, dy, top, cx, binTop, binBottom } = geo();
		ctx.clearRect(0, 0, w, h);

		// Nägel
		ctx.fillStyle = "rgba(255,255,255,0.45)";
		for (let r = 0; r < rows; r++) {
			for (let k = 0; k <= r; k++) {
				ctx.beginPath();
				ctx.arc(cx + (k - r / 2) * dx, top + r * dy + dy * 0.5, 2.6, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		// Fächer und Balken
		const n = total();
		const maxP = Math.max(...bins.map((_, k) => prob(k)));
		const maxCount = Math.max(1, ...bins, showCurve ? maxP * n : 0);
		const binH = binBottom - binTop;
		ctx.strokeStyle = "rgba(255,255,255,0.12)";
		ctx.lineWidth = 1;
		for (let k = 0; k <= rows + 1; k++) {
			const x = cx + (k - 0.5 - rows / 2) * dx;
			ctx.beginPath();
			ctx.moveTo(x, binTop);
			ctx.lineTo(x, binBottom);
			ctx.stroke();
		}
		bins.forEach((c, k) => {
			const bh = (c / maxCount) * binH;
			ctx.fillStyle = ACC;
			ctx.fillRect(cx + (k - 0.5 - rows / 2) * dx + 2, binBottom - bh, dx - 4, bh);
		});

		// Erwartete Verteilung
		if (showCurve && n > 0) {
			ctx.strokeStyle = EXP;
			ctx.lineWidth = 2;
			ctx.setLineDash([5, 4]);
			ctx.beginPath();
			bins.forEach((_, k) => {
				const x = cx + (k - rows / 2) * dx;
				const y = binBottom - ((prob(k) * n) / maxCount) * binH;
				k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
			});
			ctx.stroke();
			ctx.setLineDash([]);
		}

		// Fallende Kugeln
		ctx.fillStyle = "#fff";
		balls.forEach((b) => {
			const r = Math.min(Math.floor(b.t), rows);
			const f = b.t - r;
			const kNow = b.path.slice(0, r).reduce((s, v) => s + v, 0);
			let x = cx + (kNow - r / 2) * dx;
			let y = top + r * dy;
			if (r < rows) {
				const dir = b.path[r] ? 0.5 : -0.5;
				x += dir * dx * f;
				y += dy * f - Math.sin(f * Math.PI) * dy * 0.25;
			} else {
				y = binTop + f * (binH - 6);
			}
			ctx.beginPath();
			ctx.arc(x, y, 4, 0, Math.PI * 2);
			ctx.fill();
		});

		const mean = n ? bins.reduce((s, c, k) => s + c * k, 0) / n : 0;
		out.textContent = `${n.toLocaleString("de-DE")} ${n === 1 ? "Kugel" : "Kugeln"}`;
		note.textContent = n
			? `Im Schnitt ${mathFmt(mean)}-mal nach rechts gesprungen, erwartet ${mathFmt(rows * p)} (Reihen × Chance). Mitte: ${mathFmt((prob(Math.round(rows / 2)) * 100), 1)} %, ganz außen links: ${prob(0) < 0.001 ? "unter 0,1" : mathFmt(prob(0) * 100, 1)} %.`
			: "Noch leer. Jede Kugel trifft an jedem Nagel eine Zufallsentscheidung.";
	}

	whenVisible(canvas, (dt) => {
		if (queue > 0) {
			const n = Math.min(queue, Math.ceil(dt * 120));
			for (let i = 0; i < n; i++) spawn();
			queue -= n;
		}
		if (!balls.length && !queue) return;
		const speed = balls.length > 30 ? 9 : 5;
		balls.forEach((b) => (b.t += dt * speed));
		balls = balls.filter((b) => {
			if (b.t < rows + 1) return true;
			bins[b.path.reduce((s, v) => s + v, 0)]++;
			return false;
		});
		draw();
	});

	const reset = () => {
		balls = [];
		queue = 0;
		bins = new Array(rows + 1).fill(0);
		draw();
	};
	document.getElementById("btnOne").addEventListener("click", () => {
		spawn();
		draw();
	});
	document.getElementById("btnMany").addEventListener("click", () => {
		if (mathReduced.matches) for (let i = 0; i < 200; i++) spawn();
		else queue += 200;
		draw();
	});
	document.getElementById("btnClear").addEventListener("click", reset);
	rowsIn.addEventListener("input", () => {
		rows = Number(rowsIn.value);
		document.getElementById("rowsOut").textContent = String(rows);
		reset();
	});
	pIn.addEventListener("input", () => {
		p = Number(pIn.value) / 100;
		document.getElementById("pOut").textContent = `${pIn.value} %`;
		reset();
	});
	btnCurve.addEventListener("click", () => {
		showCurve = !showCurve;
		btnCurve.setAttribute("aria-pressed", String(showCurve));
		draw();
	});
	draw();
})();
