"use strict";

const { clamp, lerp, nf, randn, C, plot, pointer, chips, slider, normPdf, betaPdf, lgamma, logChoose } = Q;

// Inverse der Standardnormal-Verteilungsfunktion (Näherung nach Acklam)
function invNorm(p) {
	const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
	const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
	const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
	const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
	const pl = 0.02425;
	if (p < pl) {
		const q = Math.sqrt(-2 * Math.log(p));
		return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
	}
	if (p > 1 - pl) return -invNorm(1 - p);
	const q = p - 0.5;
	const r = q * q;
	return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
		(((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function clear(ctx, size) {
	ctx.fillStyle = C.bg;
	ctx.fillRect(0, 0, size.w, size.h);
}

// =====================================================================
// 1 · Münzwurf und Gesetz der großen Zahlen
// =====================================================================
(() => {
	const canvas = document.getElementById("coinCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.05 : 1.4));
	let n = 0;
	let heads = 0;
	const freq = [];
	const recent = [];
	let pop = 0;
	const pS = slider("coinP", (v) => nf(v, 2), () => {});
	const outN = document.getElementById("coinN");
	const outH = document.getElementById("coinH");
	const outF = document.getElementById("coinF");

	function flip(k) {
		for (let i = 0; i < k; i++) {
			const h = Math.random() < pS.value ? 1 : 0;
			heads += h;
			n++;
			freq.push(heads / n);
			recent.push(h);
		}
		if (recent.length > 60) recent.splice(0, recent.length - 60);
		pop = 1;
		outN.textContent = n.toLocaleString("de-DE");
		outH.textContent = heads.toLocaleString("de-DE");
		outF.textContent = nf(heads / n, 3);
	}
	document.getElementById("coin1").addEventListener("click", () => flip(1));
	document.getElementById("coin10").addEventListener("click", () => flip(10));
	document.getElementById("coin100").addEventListener("click", () => flip(100));
	document.getElementById("coinReset").addEventListener("click", () => {
		n = heads = 0;
		freq.length = recent.length = 0;
		outN.textContent = outH.textContent = "0";
		outF.textContent = "–";
	});

	whenVisible(canvas, (dt) => {
		clear(ctx, size);
		pop = Math.max(0, pop - dt * 3);
		const strip = 54;
		const N = Math.max(10, n);
		const P = plot({ w: size.w, h: size.h - strip }, { x: [0, N], y: [0, 1] }, { l: 40, r: 14, t: 30, b: 24 });
		P.axes(ctx, { xt: 5, yt: 4, xf: (v) => Math.round(v).toLocaleString("de-DE"), yf: (v) => nf(v, 2) });
		// Trichter ±2σ/√n
		const p = pS.value;
		const sd = Math.sqrt(p * (1 - p));
		ctx.fillStyle = "rgba(255,179,102,0.08)";
		ctx.beginPath();
		for (let i = 1; i <= 200; i++) {
			const x = (i / 200) * N;
			const yy = clamp(p + (2 * sd) / Math.sqrt(x), 0, 1);
			if (i === 1) ctx.moveTo(P.sx(x), P.sy(yy));
			else ctx.lineTo(P.sx(x), P.sy(yy));
		}
		for (let i = 200; i >= 1; i--) {
			const x = (i / 200) * N;
			ctx.lineTo(P.sx(x), P.sy(clamp(p - (2 * sd) / Math.sqrt(x), 0, 1)));
		}
		ctx.fill();
		ctx.setLineDash([6, 5]);
		ctx.strokeStyle = C.c;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(P.x0, P.sy(p));
		ctx.lineTo(P.x1, P.sy(p));
		ctx.stroke();
		ctx.setLineDash([]);
		if (freq.length) {
			ctx.strokeStyle = C.a;
			ctx.lineWidth = 2;
			ctx.beginPath();
			const step = Math.max(1, Math.floor(freq.length / 800));
			for (let i = 0; i < freq.length; i += step) {
				const X = P.sx(i + 1);
				const Y = P.sy(freq[i]);
				if (i === 0) ctx.moveTo(X, Y);
				else ctx.lineTo(X, Y);
			}
			ctx.lineTo(P.sx(freq.length), P.sy(freq[freq.length - 1]));
			ctx.stroke();
			ctx.fillStyle = C.a;
			ctx.beginPath();
			ctx.arc(P.sx(freq.length), P.sy(freq[freq.length - 1]), 4, 0, 7);
			ctx.fill();
		}
		// Letzte Würfe als Münzen
		const r = Math.min(11, (size.w - 30) / 60 / 2.3);
		const cnt = Math.min(recent.length, Math.floor((size.w - 24) / (r * 2.3)));
		const y = size.h - strip / 2;
		ctx.font = `600 ${Math.round(r * 1.1)}px "Space Grotesk", sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		for (let i = 0; i < cnt; i++) {
			const h = recent[recent.length - 1 - i];
			const x = size.w - 16 - r - i * r * 2.3;
			const rr = i === 0 ? r * (1 + pop * 0.4) : r;
			ctx.fillStyle = h ? C.a : "#2a2f36";
			ctx.beginPath();
			ctx.arc(x, y, rr, 0, 7);
			ctx.fill();
			ctx.fillStyle = h ? "#04140c" : C.ink;
			ctx.fillText(h ? "K" : "Z", x, y + 1);
		}
		if (!recent.length) {
			ctx.fillStyle = C.text;
			ctx.font = '13px "Space Grotesk", sans-serif';
			ctx.fillText("Noch keine Würfe", size.w / 2, y);
		}
	});
})();

// =====================================================================
// 2 · Gezinkter Würfel: Erwartungswert und Varianz
// =====================================================================
(() => {
	const canvas = document.getElementById("diceCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.85 : 1.15));
	const w = [1, 1, 1, 1, 1, 1];
	let counts = [0, 0, 0, 0, 0, 0];
	let means = [];
	let sum = 0;
	let last = -1;
	let flash = 0;
	const presets = [
		{ label: "Fair", w: [1, 1, 1, 1, 1, 1] },
		{ label: "Gezinkt auf 6", w: [0.4, 0.4, 0.4, 0.4, 0.4, 1] },
		{ label: "Nur 1 und 6", w: [1, 0.02, 0.02, 0.02, 0.02, 1] },
		{ label: "Meist Mitte", w: [0.1, 0.5, 1, 1, 0.5, 0.1] },
	];
	const probs = () => {
		const s = w.reduce((a, b) => a + b, 0);
		return w.map((v) => v / s);
	};
	const moments = () => {
		const p = probs();
		const E = p.reduce((a, pi, i) => a + pi * (i + 1), 0);
		const V = p.reduce((a, pi, i) => a + pi * (i + 1 - E) ** 2, 0);
		return { E, V };
	};
	const outE = document.getElementById("diceE");
	const outS = document.getElementById("diceS");
	const outM = document.getElementById("diceM");
	const outN = document.getElementById("diceN");
	function stats() {
		const { E, V } = moments();
		outE.textContent = nf(E, 2);
		outS.textContent = nf(Math.sqrt(V), 2);
		outM.textContent = means.length ? nf(means[means.length - 1], 2) : "–";
		outN.textContent = means.length.toLocaleString("de-DE");
	}
	function reset() {
		counts = [0, 0, 0, 0, 0, 0];
		means = [];
		sum = 0;
		last = -1;
		stats();
	}
	const pc = chips(document.getElementById("dicePresets"), presets, (i, it) => {
		it.w.forEach((v, k) => (w[k] = v));
		reset();
	});
	function roll(k) {
		const p = probs();
		for (let j = 0; j < k; j++) {
			let u = Math.random();
			let i = 0;
			while (i < 5 && u > p[i]) u -= p[i++];
			counts[i]++;
			sum += i + 1;
			means.push(sum / (means.length + 1));
			last = i;
		}
		flash = 1;
		stats();
	}
	document.getElementById("dice1").addEventListener("click", () => roll(1));
	document.getElementById("dice10").addEventListener("click", () => roll(10));
	document.getElementById("dice100").addEventListener("click", () => roll(100));
	document.getElementById("diceReset").addEventListener("click", reset);

	const split = () => size.h * 0.52;
	const barPlot = () => plot({ w: size.w, h: split() }, { x: [0.5, 6.5], y: [0, 1] }, { l: 40, r: 14, t: 52, b: 26 });
	let dragging = false;
	const setBar = (pt) => {
		const P = barPlot();
		const i = Math.round(P.ix(pt.x)) - 1;
		if (i < 0 || i > 5) return;
		w[i] = clamp(P.iy(pt.y), 0.02, 1);
		pc.set(-1, true);
		reset();
	};
	pointer(canvas, {
		down(pt) {
			if (pt.y > split()) return;
			dragging = true;
			setBar(pt);
		},
		move(pt) {
			if (dragging) setBar(pt);
		},
		up() {
			dragging = false;
		},
	});
	stats();

	whenVisible(canvas, (dt) => {
		clear(ctx, size);
		flash = Math.max(0, flash - dt * 2.5);
		const P = barPlot();
		const p = probs();
		const tot = w.reduce((a, b) => a + b, 0);
		const n = means.length;
		P.axes(ctx, { xt: 0, yt: 0, grid: false });
		const bw = (P.sx(1) - P.sx(0)) * 0.62;
		ctx.textAlign = "center";
		for (let i = 0; i < 6; i++) {
			const X = P.sx(i + 1);
			const Y = P.sy(w[i]);
			ctx.fillStyle = i === last && flash > 0 ? `rgba(255,179,102,${0.5 + flash * 0.5})` : "rgba(107,227,168,0.75)";
			ctx.beginPath();
			ctx.roundRect(X - bw / 2, Y, bw, P.y1 - Y, [6, 6, 0, 0]);
			ctx.fill();
			ctx.fillStyle = C.ink;
			ctx.font = '12px "JetBrains Mono", monospace';
			ctx.textBaseline = "bottom";
			ctx.fillText(`${Math.round(p[i] * 100)} %`, X, Y - 4);
			ctx.textBaseline = "top";
			ctx.font = '600 13px "Space Grotesk", sans-serif';
			ctx.fillText(String(i + 1), X, P.y1 + 6);
			if (n) {
				const fy = P.sy(clamp((counts[i] / n) * tot, 0, 1.05));
				ctx.strokeStyle = C.c;
				ctx.lineWidth = 2.5;
				ctx.beginPath();
				ctx.moveTo(X - bw / 2 - 4, fy);
				ctx.lineTo(X + bw / 2 + 4, fy);
				ctx.stroke();
			}
		}
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.font = '11px "Space Grotesk", sans-serif';
		ctx.fillStyle = C.text;
		if (n) {
			ctx.fillStyle = C.c;
			ctx.textAlign = "right";
			ctx.fillText("— gewürfelte Häufigkeit", size.w - 14, 14);
		}

		// Laufender Mittelwert
		const { E } = moments();
		const N = Math.max(10, n);
		const M = plot({ w: size.w, h: size.h }, { x: [0, N], y: [1, 6] }, { l: 40, r: 14, t: split() + 14, b: 24 });
		M.axes(ctx, { xt: 4, yt: 5, xf: (v) => Math.round(v).toLocaleString("de-DE"), yf: (v) => String(Math.round(v)) });
		ctx.setLineDash([6, 5]);
		ctx.strokeStyle = C.b;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(M.x0, M.sy(E));
		ctx.lineTo(M.x1, M.sy(E));
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.fillStyle = C.b;
		ctx.textAlign = "right";
		ctx.textBaseline = "bottom";
		ctx.fillText(`E[X] = ${nf(E, 2)}`, M.x1, M.sy(E) - 4);
		if (n) {
			ctx.strokeStyle = C.a;
			ctx.lineWidth = 2;
			ctx.beginPath();
			const step = Math.max(1, Math.floor(n / 800));
			for (let i = 0; i < n; i += step) {
				if (i === 0) ctx.moveTo(M.sx(1), M.sy(means[0]));
				else ctx.lineTo(M.sx(i + 1), M.sy(means[i]));
			}
			ctx.lineTo(M.sx(n), M.sy(means[n - 1]));
			ctx.stroke();
		}
		ctx.fillStyle = C.text;
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText("Laufender Mittelwert", M.x0 + 8, M.y0 + 4);
	});
})();

// =====================================================================
// 3 · Verteilungen
// =====================================================================
(() => {
	const canvas = document.getElementById("distCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.1 : 1.45));
	const aIn = document.getElementById("dA");
	const bIn = document.getElementById("dB");
	const aName = document.getElementById("dA_name");
	const bName = document.getElementById("dB_name");
	const aOut = document.getElementById("dAOut");
	const bOut = document.getElementById("dBOut");
	const tag = document.getElementById("distTag");
	const note = document.getElementById("distNote");
	let samples = [];

	const D = [
		{
			label: "Binomial",
			discrete: true,
			A: { name: "Versuche n", min: 1, max: 40, step: 1, val: 20, f: (v) => String(v) },
			B: { name: "Erfolgswahrscheinlichkeit p", min: 0.01, max: 0.99, step: 0.01, val: 0.3, f: (v) => nf(v, 2) },
			range: (a) => [0, a],
			pmf: (k, a, b) => (k < 0 || k > a ? 0 : Math.exp(logChoose(a, k) + k * Math.log(b) + (a - k) * Math.log(1 - b))),
			mean: (a, b) => a * b,
			vari: (a, b) => a * b * (1 - b),
			sample: (a, b) => {
				let s = 0;
				for (let i = 0; i < a; i++) if (Math.random() < b) s++;
				return s;
			},
			note: "Zahl der Erfolge bei n unabhängigen Versuchen. Für großes n sieht die Form schon fast aus wie eine Glocke.",
		},
		{
			label: "Poisson",
			discrete: true,
			A: { name: "Rate λ", min: 0.2, max: 20, step: 0.1, val: 3, f: (v) => nf(v, 1) },
			B: null,
			range: (a) => [0, Math.max(10, Math.ceil(a + 4.5 * Math.sqrt(a)))],
			pmf: (k, a) => Math.exp(k * Math.log(a) - a - lgamma(k + 1)),
			mean: (a) => a,
			vari: (a) => a,
			sample: (a) => {
				const L = Math.exp(-a);
				let k = 0;
				let p = 1;
				do {
					k++;
					p *= Math.random();
				} while (p > L);
				return k - 1;
			},
			note: "Zählt seltene, unabhängige Ereignisse in einem festen Zeitraum. Erwartungswert und Varianz sind beide λ.",
		},
		{
			label: "Geometrisch",
			discrete: true,
			A: { name: "Erfolgswahrscheinlichkeit p", min: 0.05, max: 0.95, step: 0.01, val: 0.25, f: (v) => nf(v, 2) },
			B: null,
			range: (a) => [1, Math.max(8, Math.ceil(Math.log(0.004) / Math.log(1 - a)))],
			pmf: (k, a) => (k < 1 ? 0 : Math.pow(1 - a, k - 1) * a),
			mean: (a) => 1 / a,
			vari: (a) => (1 - a) / (a * a),
			sample: (a) => Math.max(1, Math.ceil(Math.log(1 - Math.random()) / Math.log(1 - a))),
			note: "Wie viele Versuche bis zum ersten Erfolg? Jeder weitere Balken ist um den Faktor (1 − p) kleiner, die Verteilung hat kein Gedächtnis.",
		},
		{
			label: "Normal",
			discrete: false,
			A: { name: "Mittelwert μ", min: -3, max: 3, step: 0.1, val: 0, f: (v) => nf(v, 1) },
			B: { name: "Std.-Abw. σ", min: 0.3, max: 3, step: 0.05, val: 1, f: (v) => nf(v, 2) },
			range: () => [-8, 8],
			pdf: (x, a, b) => normPdf(x, a, b),
			mean: (a) => a,
			vari: (a, b) => b * b,
			sample: (a, b) => a + b * randn(),
			note: "Etwa 68 % der Fläche liegen innerhalb von ±1σ, etwa 95 % innerhalb von ±2σ.",
		},
		{
			label: "Exponential",
			discrete: false,
			A: { name: "Rate λ", min: 0.2, max: 3, step: 0.05, val: 1, f: (v) => nf(v, 2) },
			B: null,
			range: () => [0, 8],
			pdf: (x, a) => (x < 0 ? 0 : a * Math.exp(-a * x)),
			mean: (a) => 1 / a,
			vari: (a) => 1 / (a * a),
			sample: (a) => -Math.log(1 - Math.random()) / a,
			note: "Die Wartezeit zwischen Poisson-Ereignissen. Kurze Wartezeiten sind am häufigsten, lange kommen aber vor.",
		},
		{
			label: "Beta",
			discrete: false,
			A: { name: "α", min: 0.3, max: 10, step: 0.1, val: 2, f: (v) => nf(v, 1) },
			B: { name: "β", min: 0.3, max: 10, step: 0.1, val: 5, f: (v) => nf(v, 1) },
			range: () => [0, 1],
			pdf: (x, a, b) => betaPdf(x, a, b),
			mean: (a, b) => a / (a + b),
			vari: (a, b) => (a * b) / ((a + b) ** 2 * (a + b + 1)),
			sample: (a, b) => {
				const g = (k) => sampleGamma(k);
				const x = g(a);
				return x / (x + g(b));
			},
			note: "Lebt zwischen 0 und 1. α − 1 zählt gewissermaßen Erfolge, β − 1 Misserfolge. α = β = 1 ist die Gleichverteilung.",
		},
	];

	// Marsaglia-Tsang für Gamma(k, 1)
	function sampleGamma(k) {
		if (k < 1) return sampleGamma(k + 1) * Math.pow(Math.random(), 1 / k);
		const d = k - 1 / 3;
		const c = 1 / Math.sqrt(9 * d);
		for (;;) {
			let x;
			let v;
			do {
				x = randn();
				v = 1 + c * x;
			} while (v <= 0);
			v = v * v * v;
			const u = Math.random();
			if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
		}
	}

	let cur = D[0];
	const params = () => [Number(aIn.value), cur.B ? Number(bIn.value) : 0];
	function config(el, spec, nameEl) {
		const wrap = el.closest(".range");
		if (!spec) {
			wrap.style.display = "none";
			return;
		}
		wrap.style.display = "";
		nameEl.textContent = spec.name;
		el.min = spec.min;
		el.max = spec.max;
		el.step = spec.step;
		el.value = spec.val;
		el.dispatchEvent(new Event("input"));
	}
	function sync() {
		const [a, b] = params();
		aOut.textContent = cur.A.f(a);
		if (cur.B) bOut.textContent = cur.B.f(b);
		document.getElementById("distE").textContent = nf(cur.mean(a, b), 2);
		document.getElementById("distS").textContent = nf(Math.sqrt(cur.vari(a, b)), 2);
		document.getElementById("distN").textContent = samples.length.toLocaleString("de-DE");
	}
	aIn.addEventListener("input", () => {
		samples = [];
		sync();
	});
	bIn.addEventListener("input", () => {
		samples = [];
		sync();
	});
	chips(document.getElementById("distChips"), D, (i) => pick(i));
	function pick(i) {
		cur = D[i];
		samples = [];
		tag.textContent = cur.label;
		note.textContent = cur.note;
		config(aIn, cur.A, aName);
		config(bIn, cur.B, bName);
		sync();
	}
	pick(0);
	document.getElementById("distDraw").addEventListener("click", () => {
		const [a, b] = params();
		for (let i = 0; i < 1000; i++) samples.push(cur.sample(a, b));
		sync();
	});
	document.getElementById("distClear").addEventListener("click", () => {
		samples = [];
		sync();
	});

	whenVisible(canvas, () => {
		clear(ctx, size);
		const [a, b] = params();
		const [lo, hi] = cur.range(a, b);
		const mu = cur.mean(a, b);
		const sd = Math.sqrt(cur.vari(a, b));
		if (cur.discrete) {
			let ymax = 0;
			for (let k = lo; k <= hi; k++) ymax = Math.max(ymax, cur.pmf(k, a, b));
			const P = plot(size, { x: [lo - 0.5, hi + 0.5], y: [0, ymax * 1.18] }, { l: 44, r: 14, t: 34, b: 26 });
			P.axes(ctx, { xt: 0, yt: 4, yf: (v) => nf(v, 2) });
			const bw = Math.max(1, (P.sx(1) - P.sx(0)) * 0.7);
			const hist = new Map();
			for (const s of samples) hist.set(s, (hist.get(s) || 0) + 1);
			const labelEvery = Math.ceil((hi - lo + 1) / 12);
			for (let k = lo; k <= hi; k++) {
				const X = P.sx(k);
				const Y = P.sy(cur.pmf(k, a, b));
				ctx.fillStyle = "rgba(107,227,168,0.75)";
				ctx.fillRect(X - bw / 2, Y, bw, P.y1 - Y);
				if (samples.length) {
					const f = (hist.get(k) || 0) / samples.length;
					ctx.strokeStyle = C.c;
					ctx.lineWidth = 2.5;
					ctx.beginPath();
					ctx.moveTo(X - bw / 2 - 2, P.sy(f));
					ctx.lineTo(X + bw / 2 + 2, P.sy(f));
					ctx.stroke();
				}
				if ((k - lo) % labelEvery === 0) {
					ctx.fillStyle = C.text;
					ctx.font = '11px "JetBrains Mono", monospace';
					ctx.textAlign = "center";
					ctx.textBaseline = "top";
					ctx.fillText(String(k), X, P.y1 + 6);
				}
			}
			markMean(P, mu, sd);
		} else {
			const pdf = (x) => cur.pdf(x, a, b);
			let ymax = 0;
			for (let i = 1; i < 400; i++) ymax = Math.max(ymax, pdf(lerp(lo, hi, i / 400)));
			ymax = Math.min(ymax, 6);
			const P = plot(size, { x: [lo, hi], y: [0, ymax * 1.18] }, { l: 44, r: 14, t: 34, b: 26 });
			P.axes(ctx, { xt: lo === 0 && hi === 1 ? 5 : 8, yt: 4, yf: (v) => nf(v, 2) });
			if (samples.length) {
				const bins = 50;
				const h = new Array(bins).fill(0);
				for (const s of samples) {
					const i = Math.floor(((s - lo) / (hi - lo)) * bins);
					if (i >= 0 && i < bins) h[i]++;
				}
				const bw = (hi - lo) / bins;
				ctx.fillStyle = "rgba(255,179,102,0.35)";
				for (let i = 0; i < bins; i++) {
					const d = h[i] / (samples.length * bw);
					const Y = P.sy(Math.min(d, ymax * 1.18));
					ctx.fillRect(P.sx(lo + i * bw) + 0.5, Y, P.sx(lo + bw) - P.sx(lo) - 1, P.y1 - Y);
				}
			}
			// ±σ-Fläche
			ctx.save();
			ctx.beginPath();
			ctx.rect(P.sx(mu - sd), P.y0, P.sx(mu + sd) - P.sx(mu - sd), P.y1 - P.y0);
			ctx.clip();
			P.curve(ctx, (x) => Math.min(pdf(x), ymax * 1.18), { fill: "rgba(107,227,168,0.18)", n: 400 });
			ctx.restore();
			P.curve(ctx, (x) => Math.min(pdf(x), ymax * 1.18), { color: C.a, width: 2.5, n: 400 });
			markMean(P, mu, sd);
		}
	});

	function markMean(P, mu, sd) {
		ctx.strokeStyle = C.b;
		ctx.lineWidth = 1.5;
		ctx.setLineDash([5, 4]);
		ctx.beginPath();
		ctx.moveTo(P.sx(mu), P.y0 - 6);
		ctx.lineTo(P.sx(mu), P.y1);
		ctx.stroke();
		ctx.setLineDash([]);
		const y = P.y0 - 8;
		ctx.strokeStyle = "rgba(122,168,255,0.7)";
		ctx.beginPath();
		ctx.moveTo(P.sx(mu - sd), y);
		ctx.lineTo(P.sx(mu + sd), y);
		ctx.stroke();
		ctx.fillStyle = C.b;
		ctx.font = '11px "JetBrains Mono", monospace';
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.fillText("μ ± σ", P.sx(mu + sd) + 6, y + 5);
	}
})();

// =====================================================================
// 4 · Zentraler Grenzwertsatz
// =====================================================================
(() => {
	const canvas = document.getElementById("cltCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.25));
	const S = [
		{ label: "Gleichverteilt", lo: 0, hi: 1, mu: 0.5, v: 1 / 12, pdf: (x) => (x >= 0 && x <= 1 ? 1 : 0), sample: () => Math.random() },
		{ label: "Schief", lo: 0, hi: 5, mu: 1, v: 1, pdf: (x) => (x < 0 ? 0 : Math.exp(-x)), sample: () => -Math.log(1 - Math.random()) },
		{
			label: "U-förmig",
			lo: 0,
			hi: 1,
			mu: 0.5,
			v: 1 / 8,
			pdf: (x) => (x <= 0.002 || x >= 0.998 ? 7 : 1 / (Math.PI * Math.sqrt(x * (1 - x)))),
			sample: () => Math.sin((Math.PI / 2) * Math.random()) ** 2,
		},
		{ label: "Würfel", lo: 0.5, hi: 6.5, mu: 3.5, v: 35 / 12, discrete: true, sample: () => 1 + Math.floor(Math.random() * 6) },
	];
	let src = S[0];
	let means = [];
	let lastSample = [];
	let lastMean = null;
	let flash = 0;
	const nS = slider("cltN", (v) => String(v), () => reset());
	const note = document.getElementById("cltNote");
	chips(document.getElementById("cltChips"), S, (i) => {
		src = S[i];
		reset();
	});
	function reset() {
		means = [];
		lastSample = [];
		lastMean = null;
		sync();
	}
	function sync() {
		const sd = Math.sqrt(src.v / nS.value);
		note.textContent = means.length
			? `${means.length.toLocaleString("de-DE")} Mittelwerte. Vorhergesagte Breite σ/√n = ${nf(sd, 3)}, gemessen ${nf(measured(), 3)}.`
			: `Jede Stichprobe: ${nS.value} Werte ziehen, Mittelwert bilden, ins Histogramm legen.`;
	}
	function measured() {
		const m = means.reduce((a, b) => a + b, 0) / means.length;
		return Math.sqrt(means.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, means.length - 1));
	}
	function draw(k) {
		const n = nS.value;
		for (let j = 0; j < k; j++) {
			const xs = [];
			for (let i = 0; i < n; i++) xs.push(src.sample());
			const m = xs.reduce((a, b) => a + b, 0) / n;
			means.push(m);
			lastSample = xs;
			lastMean = m;
		}
		flash = 1;
		sync();
	}
	document.getElementById("clt1").addEventListener("click", () => draw(1));
	document.getElementById("clt100").addEventListener("click", () => draw(100));
	document.getElementById("clt1000").addEventListener("click", () => draw(1000));
	document.getElementById("cltReset").addEventListener("click", reset);
	sync();

	whenVisible(canvas, (dt) => {
		clear(ctx, size);
		flash = Math.max(0, flash - dt * 1.5);
		const top = size.h * 0.32;
		// Ausgangsverteilung
		const T = plot({ w: size.w, h: top }, { x: [src.lo, src.hi], y: [0, src.discrete ? 0.25 : src === S[2] ? 3.2 : 1.25] }, { l: 40, r: 14, t: 30, b: 22 });
		T.axes(ctx, { xt: src.discrete ? 0 : 5, yt: 0, yf: null, grid: false, xf: (v) => nf(v, 1) });
		if (src.discrete) {
			const bw = (T.sx(1) - T.sx(0)) * 0.6;
			ctx.fillStyle = "rgba(122,168,255,0.6)";
			for (let k = 1; k <= 6; k++) ctx.fillRect(T.sx(k) - bw / 2, T.sy(1 / 6), bw, T.y1 - T.sy(1 / 6));
			ctx.fillStyle = C.text;
			ctx.font = '11px "JetBrains Mono", monospace';
			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			for (let k = 1; k <= 6; k++) ctx.fillText(String(k), T.sx(k), T.y1 + 6);
		} else {
			T.curve(ctx, src.pdf, { fill: "rgba(122,168,255,0.28)", n: 300 });
			T.curve(ctx, src.pdf, { color: C.b, width: 2, n: 300 });
		}
		if (lastSample.length && lastSample.length <= 50) {
			ctx.fillStyle = `rgba(244,239,230,${0.4 + flash * 0.6})`;
			for (const x of lastSample) {
				ctx.beginPath();
				ctx.arc(T.sx(clamp(x, src.lo, src.hi)) + (src.discrete ? (Math.random() - 0.5) * 0 : 0), T.y1 - 6, 3, 0, 7);
				ctx.fill();
			}
		}
		if (lastMean !== null) {
			const X = T.sx(clamp(lastMean, src.lo, src.hi));
			ctx.strokeStyle = C.c;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(X, T.y0);
			ctx.lineTo(X, T.y1);
			ctx.stroke();
		}

		// Histogramm der Mittelwerte
		const bins = 60;
		const bw = (src.hi - src.lo) / bins;
		const h = new Array(bins).fill(0);
		for (const m of means) h[clamp(Math.floor((m - src.lo) / bw), 0, bins - 1)]++;
		const sd = Math.sqrt(src.v / nS.value);
		const peak = normPdf(0, 0, sd);
		let ymax = peak;
		if (means.length) for (const c of h) ymax = Math.max(ymax, c / (means.length * bw));
		ymax = Math.min(ymax, peak * 2.5);
		const B = plot(size, { x: [src.lo, src.hi], y: [0, ymax * 1.1] }, { l: 40, r: 14, t: top + 20, b: 24 });
		B.axes(ctx, { xt: 5, yt: 0, yf: null, xf: (v) => nf(v, 1) });
		if (means.length) {
			for (let i = 0; i < bins; i++) {
				const d = Math.min(h[i] / (means.length * bw), ymax * 1.1);
				const Y = B.sy(d);
				const lit = lastMean !== null && i === clamp(Math.floor((lastMean - src.lo) / bw), 0, bins - 1) && flash > 0;
				ctx.fillStyle = lit ? C.c : "rgba(107,227,168,0.7)";
				ctx.fillRect(B.sx(src.lo + i * bw) + 0.5, Y, B.sx(src.lo + bw) - B.sx(src.lo) - 1, B.y1 - Y);
			}
		}
		B.curve(ctx, (x) => normPdf(x, src.mu, sd), { color: C.c, width: 2, n: 400, dash: [6, 4] });
		ctx.fillStyle = C.c;
		ctx.font = '11px "Space Grotesk", sans-serif';
		ctx.textAlign = "right";
		ctx.textBaseline = "top";
		ctx.fillText(`Normal(μ, σ²/${nS.value})`, B.x1, B.y0 + 2);
	});
})();

// =====================================================================
// 5 · Bayes: Münze mit unbekannter Fairness
// =====================================================================
(() => {
	const canvas = document.getElementById("bayesCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.15 : 1.5));
	const priors = [
		{ label: "Ahnungslos", a: 1, b: 1 },
		{ label: "Glaubt an fair", a: 20, b: 20 },
		{ label: "Erwartet Kopf", a: 8, b: 2 },
	];
	let prior = priors[0];
	let trueP = newP();
	let k = 0;
	let z = 0;
	let shown = false;
	let anim = 1;
	let prevPost = null;
	function newP() {
		return 0.1 + Math.random() * 0.8;
	}
	chips(document.getElementById("bayesChips"), priors, (i) => {
		prior = priors[i];
		anim = 1;
		stats();
	});
	const post = () => [prior.a + k, prior.b + z];
	function interval(a, b) {
		const N = 1000;
		const cdf = [];
		let s = 0;
		for (let i = 0; i < N; i++) {
			s += betaPdf((i + 0.5) / N, a, b) / N;
			cdf.push(s);
		}
		const lo = cdf.findIndex((v) => v >= 0.025 * s) / N;
		const hi = cdf.findIndex((v) => v >= 0.975 * s) / N;
		return [lo, hi];
	}
	function stats() {
		const [a, b] = post();
		document.getElementById("bayesKZ").textContent = `${k} : ${z}`;
		document.getElementById("bayesMean").textContent = nf(a / (a + b), 2);
		const [lo, hi] = interval(a, b);
		document.getElementById("bayesCI").textContent = `${nf(lo, 2)} – ${nf(hi, 2)}`;
	}
	function flip(m) {
		prevPost = post();
		for (let i = 0; i < m; i++) {
			if (Math.random() < trueP) k++;
			else z++;
		}
		anim = 0;
		stats();
	}
	document.getElementById("bayes1").addEventListener("click", () => flip(1));
	document.getElementById("bayes10").addEventListener("click", () => flip(10));
	const revealBtn = document.getElementById("bayesReveal");
	revealBtn.addEventListener("click", () => {
		shown = !shown;
		revealBtn.textContent = shown ? `Wahr: ${nf(trueP, 2)}` : "Aufdecken";
	});
	document.getElementById("bayesNew").addEventListener("click", () => {
		trueP = newP();
		k = z = 0;
		shown = false;
		revealBtn.textContent = "Aufdecken";
		prevPost = null;
		anim = 1;
		stats();
	});
	stats();

	whenVisible(canvas, (dt) => {
		clear(ctx, size);
		anim = Math.min(1, anim + dt * 2.5);
		const [a, b] = post();
		const e = 1 - (1 - anim) ** 3;
		const f = (x) => {
			const cur = betaPdf(x, a, b);
			if (!prevPost || anim >= 1) return cur;
			return lerp(betaPdf(x, prevPost[0], prevPost[1]), cur, e);
		};
		let ymax = 0;
		for (let i = 1; i < 300; i++) {
			const x = i / 300;
			ymax = Math.max(ymax, betaPdf(x, a, b), betaPdf(x, prior.a, prior.b));
		}
		ymax = Math.min(ymax, 40);
		const P = plot(size, { x: [0, 1], y: [0, ymax * 1.12] }, { l: 40, r: 14, t: 30, b: 26 });
		P.axes(ctx, { xt: 10, yt: 4, xf: (v) => nf(v, 1), yf: (v) => nf(v, 1) });
		const [lo, hi] = interval(a, b);
		ctx.save();
		ctx.beginPath();
		ctx.rect(P.sx(lo), P.y0, P.sx(hi) - P.sx(lo), P.y1 - P.y0);
		ctx.clip();
		P.curve(ctx, f, { fill: "rgba(107,227,168,0.22)", n: 400 });
		ctx.restore();
		P.curve(ctx, (x) => betaPdf(x, prior.a, prior.b), { color: C.b, width: 1.5, dash: [6, 4], n: 300 });
		P.curve(ctx, f, { color: C.a, width: 2.5, n: 400 });
		if (shown) {
			ctx.strokeStyle = C.c;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(P.sx(trueP), P.y0);
			ctx.lineTo(P.sx(trueP), P.y1);
			ctx.stroke();
			ctx.fillStyle = C.c;
			ctx.font = '12px "Space Grotesk", sans-serif';
			ctx.textAlign = "center";
			ctx.textBaseline = "bottom";
			ctx.fillText("wahrer Wert", P.sx(trueP), P.y0 - 2);
		}
		ctx.font = '11px "Space Grotesk", sans-serif';
		ctx.textAlign = "right";
		ctx.textBaseline = "top";
		ctx.fillStyle = C.b;
		ctx.fillText("- - Prior", P.x1, P.y0 + 2);
		ctx.fillStyle = C.a;
		ctx.fillText("— Posterior, Fläche = 95 %", P.x1, P.y0 + 18);
	});
})();

// =====================================================================
// 6 · Konfidenzintervalle
// =====================================================================
(() => {
	const canvas = document.getElementById("ciCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.2));
	let list = [];
	const lv = slider("ciLevel", (v) => `${Math.round(v * 100)} %`, () => stats());
	const nS = slider("ciN", (v) => String(v), () => {});
	const z = () => invNorm(1 - (1 - lv.value) / 2);
	const hits = () => list.filter((it) => Math.abs(it.m) <= z() / Math.sqrt(it.n)).length;
	function stats() {
		document.getElementById("ciCount").textContent = list.length;
		document.getElementById("ciHit").textContent = list.length
			? `${hits()} · ${Math.round((hits() / list.length) * 100)} %`
			: "–";
	}
	function add(k) {
		for (let i = 0; i < k; i++) {
			const n = nS.value;
			let s = 0;
			for (let j = 0; j < n; j++) s += randn();
			list.push({ m: s / n, n, t: 0 });
		}
		stats();
	}
	document.getElementById("ci1").addEventListener("click", () => add(1));
	document.getElementById("ci20").addEventListener("click", () => add(20));
	document.getElementById("ciReset").addEventListener("click", () => {
		list = [];
		stats();
	});
	stats();

	whenVisible(canvas, (dt) => {
		clear(ctx, size);
		const P = plot(size, { x: [-2.5, 2.5], y: [0, 1] }, { l: 16, r: 16, t: 30, b: 26 });
		P.axes(ctx, { xt: 10, yt: 0, yf: null, xf: (v) => nf(v, 1) });
		const rows = 40;
		const rh = (P.y1 - P.y0) / rows;
		const shown = list.slice(-rows).reverse();
		const zz = z();
		shown.forEach((it, i) => {
			it.t = Math.min(1, it.t + dt * 4);
			const half = zz / Math.sqrt(it.n);
			const ok = Math.abs(it.m) <= half;
			const y = P.y0 + rh * (i + 0.5);
			const e = 1 - (1 - it.t) ** 3;
			ctx.strokeStyle = ok ? C.a : C.d;
			ctx.globalAlpha = 0.35 + 0.65 * e;
			ctx.lineWidth = Math.max(1.5, Math.min(4, rh * 0.45));
			ctx.beginPath();
			ctx.moveTo(P.sx(it.m - half * e), y);
			ctx.lineTo(P.sx(it.m + half * e), y);
			ctx.stroke();
			ctx.fillStyle = C.ink;
			ctx.beginPath();
			ctx.arc(P.sx(it.m), y, Math.max(1.5, Math.min(3, rh * 0.3)), 0, 7);
			ctx.fill();
			ctx.globalAlpha = 1;
		});
		ctx.strokeStyle = C.c;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(P.sx(0), P.y0 - 8);
		ctx.lineTo(P.sx(0), P.y1);
		ctx.stroke();
		ctx.fillStyle = C.c;
		ctx.font = '12px "Space Grotesk", sans-serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.fillText("wahres μ", P.sx(0), P.y0 - 10);
		if (!list.length) {
			ctx.fillStyle = C.text;
			ctx.fillText("Noch keine Intervalle", size.w / 2, size.h / 2);
		}
	});
})();

// =====================================================================
// 7 · Regression mit Residuenquadraten
// =====================================================================
(() => {
	const canvas = document.getElementById("regCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1 : 1.3));
	const tag = document.getElementById("regTag");
	const note = document.getElementById("regNote");
	let pts = [];
	let mode = 0; // 0 beste Gerade, 1 selbst
	const hand = [
		{ x: 1, y: 2 },
		{ x: 9, y: 4 },
	];
	let drag = null;
	const P = () => plot(size, { x: [0, 10], y: [0, 10] }, { l: 30, r: 14, t: 34, b: 24 });
	function randomPts() {
		const a = 1.5 + Math.random() * 3;
		const b = 0.2 + Math.random() * 0.6;
		pts = Array.from({ length: 9 }, (_, i) => {
			const x = 0.8 + (i / 8) * 8.4 + (Math.random() - 0.5) * 0.6;
			return { x, y: clamp(a + b * x + randn() * 0.9, 0.3, 9.7) };
		});
		update();
	}
	function ols() {
		const n = pts.length;
		if (n < 2) return null;
		const mx = pts.reduce((s, p) => s + p.x, 0) / n;
		const my = pts.reduce((s, p) => s + p.y, 0) / n;
		let sxy = 0;
		let sxx = 0;
		for (const p of pts) {
			sxy += (p.x - mx) * (p.y - my);
			sxx += (p.x - mx) ** 2;
		}
		if (sxx < 1e-9) return null;
		const b = sxy / sxx;
		return { a: my - b * mx, b, my };
	}
	function userLine() {
		const b = (hand[1].y - hand[0].y) / (hand[1].x - hand[0].x);
		return { a: hand[0].y - b * hand[0].x, b };
	}
	const sse = (L) => pts.reduce((s, p) => s + (p.y - (L.a + L.b * p.x)) ** 2, 0);
	function update() {
		const best = ols();
		const L = mode === 1 ? userLine() : best;
		document.getElementById("regSSE").textContent = L ? nf(sse(L), 2) : "–";
		document.getElementById("regBest").textContent = best ? nf(sse(best), 2) : "–";
		if (best) {
			const sst = pts.reduce((s, p) => s + (p.y - best.my) ** 2, 0);
			document.getElementById("regR2").textContent = sst > 0 ? nf(1 - sse(best) / sst, 3) : "–";
		} else document.getElementById("regR2").textContent = "–";
		if (mode === 1 && best && L) {
			const r = sse(L) / Math.max(1e-9, sse(best));
			note.textContent =
				r < 1.02 ? "Volltreffer! Du hast die Methode der kleinsten Quadrate von Hand gefunden." : `Deine Fläche ist ${nf(r, 2)}-mal so groß wie das Optimum. Zieh an den zwei Griffen.`;
		} else {
			note.textContent = best ? `Gerade: y = ${nf(best.a, 2)} + ${nf(best.b, 2)} · x` : "Mindestens zwei Punkte mit verschiedenen x nötig.";
		}
	}
	chips(document.getElementById("regChips"), ["Beste Gerade", "Selbst versuchen"], (i) => {
		mode = i;
		tag.textContent = i ? "Deine Gerade" : "Kleinste Quadrate";
		if (i === 1) {
			hand[0].y = 5;
			hand[1].y = 5;
		}
		update();
	});
	document.getElementById("regPop").addEventListener("click", () => {
		pts.pop();
		update();
	});
	document.getElementById("regRand").addEventListener("click", randomPts);

	pointer(canvas, {
		down(pt) {
			const p = P();
			const near = (q) => Math.hypot(p.sx(q.x) - pt.x, p.sy(q.y) - pt.y) < 18;
			if (mode === 1) {
				const h = hand.find(near);
				if (h) {
					drag = { obj: h, handle: true };
					return;
				}
			}
			const q = pts.find(near);
			if (q) drag = { obj: q };
			else {
				const np = { x: clamp(p.ix(pt.x), 0.1, 9.9), y: clamp(p.iy(pt.y), 0.1, 9.9) };
				pts.push(np);
				drag = { obj: np };
				update();
			}
		},
		move(pt) {
			if (!drag) return;
			const p = P();
			if (!drag.handle) drag.obj.x = clamp(p.ix(pt.x), 0.1, 9.9);
			drag.obj.y = clamp(p.iy(pt.y), drag.handle ? -5 : 0.1, drag.handle ? 15 : 9.9);
			update();
		},
		up() {
			drag = null;
		},
	});
	randomPts();

	whenVisible(canvas, () => {
		clear(ctx, size);
		const p = P();
		p.axes(ctx, { xt: 5, yt: 5, xf: (v) => String(Math.round(v)), yf: (v) => String(Math.round(v)) });
		const L = mode === 1 ? userLine() : ols();
		ctx.save();
		ctx.beginPath();
		ctx.rect(p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0);
		ctx.clip();
		if (L) {
			// Residuenquadrate in Pixeln, damit sie wirklich quadratisch sind
			for (const q of pts) {
				const yh = L.a + L.b * q.x;
				const Y0 = p.sy(q.y);
				const Y1 = p.sy(yh);
				const s = Math.abs(Y1 - Y0);
				const X = p.sx(q.x);
				const left = X + s > p.x1;
				ctx.fillStyle = mode === 1 ? "rgba(255,122,156,0.18)" : "rgba(255,179,102,0.18)";
				ctx.strokeStyle = mode === 1 ? "rgba(255,122,156,0.6)" : "rgba(255,179,102,0.6)";
				ctx.lineWidth = 1;
				ctx.fillRect(left ? X - s : X, Math.min(Y0, Y1), s, s);
				ctx.strokeRect(left ? X - s : X, Math.min(Y0, Y1), s, s);
			}
			if (mode === 1) {
				const best = ols();
				if (best) {
					ctx.setLineDash([5, 5]);
					ctx.strokeStyle = "rgba(255,255,255,0.18)";
					ctx.lineWidth = 1.5;
					ctx.beginPath();
					ctx.moveTo(p.sx(0), p.sy(best.a));
					ctx.lineTo(p.sx(10), p.sy(best.a + best.b * 10));
					ctx.stroke();
					ctx.setLineDash([]);
				}
			}
			ctx.strokeStyle = mode === 1 ? C.d : C.c;
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.moveTo(p.sx(0), p.sy(L.a));
			ctx.lineTo(p.sx(10), p.sy(L.a + L.b * 10));
			ctx.stroke();
		}
		ctx.restore();
		for (const q of pts) {
			ctx.fillStyle = C.a;
			ctx.beginPath();
			ctx.arc(p.sx(q.x), p.sy(q.y), 6, 0, 7);
			ctx.fill();
			ctx.strokeStyle = C.bg;
			ctx.lineWidth = 2;
			ctx.stroke();
		}
		if (mode === 1) {
			for (const h of hand) {
				const L2 = userLine();
				const X = p.sx(h.x);
				const Y = p.sy(L2.a + L2.b * h.x);
				ctx.fillStyle = C.ink;
				ctx.strokeStyle = C.d;
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.arc(X, Y, 9, 0, 7);
				ctx.fill();
				ctx.stroke();
			}
		}
	});
})();
