"use strict";

const { clamp, lerp, nf, randn, C, plot, chips, slider, normPdf, heat } = Q;

function clear(ctx, size) {
	ctx.fillStyle = C.bg;
	ctx.fillRect(0, 0, size.w, size.h);
}
const pct = (a, n) => (n ? `${Math.round((100 * a) / n)} %` : "–");

// =====================================================================
// 1 · Monte Carlo: π mit Pfeilen
// =====================================================================
(() => {
	const canvas = document.getElementById("piCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1 : 1.25));
	let pts = [];
	let n = 0;
	let inside = 0;
	let layer = null;
	let layerKey = "";
	let fresh = [];
	const box = () => {
		const s = Math.min(size.w - 40, size.h - 50);
		return { s, x: (size.w - s) / 2, y: (size.h - s) / 2 + 8 };
	};
	function throwN(k) {
		for (let i = 0; i < k; i++) {
			const x = Math.random();
			const y = Math.random();
			const ins = x * x + y * y <= 1;
			n++;
			if (ins) inside++;
			fresh.push([x, y, ins]);
		}
		const est = (4 * inside) / n;
		document.getElementById("piN").textContent = n.toLocaleString("de-DE");
		document.getElementById("piEst").textContent = nf(est, 4);
		document.getElementById("piErr").textContent = nf(Math.abs(est - Math.PI), 4);
	}
	document.getElementById("pi100").addEventListener("click", () => throwN(100));
	document.getElementById("pi1000").addEventListener("click", () => throwN(1000));
	document.getElementById("pi10000").addEventListener("click", () => throwN(10000));
	document.getElementById("piReset").addEventListener("click", () => {
		n = inside = 0;
		fresh = [];
		layer = null;
		["piN", "piEst", "piErr"].forEach((id) => (document.getElementById(id).textContent = id === "piN" ? "0" : "–"));
	});

	whenVisible(canvas, () => {
		const B = box();
		const key = `${size.w}|${size.h}`;
		if (!layer || key !== layerKey) {
			layer = document.createElement("canvas");
			layer.width = Math.round(size.w * 2);
			layer.height = Math.round(size.h * 2);
			layerKey = key;
			pts = [];
		}
		const lg = layer.getContext("2d");
		lg.setTransform(2, 0, 0, 2, 0, 0);
		// Neue Pfeile auf die Ebene malen (gemerkt, damit die Schleife nicht alle neu zeichnen muss)
		const r = n > 5000 ? 0.9 : 1.6;
		for (const [x, y, ins] of fresh.splice(0, 4000)) {
			lg.fillStyle = ins ? "rgba(107,227,168,0.75)" : "rgba(244,239,230,0.35)";
			lg.fillRect(B.x + x * B.s - r / 2, B.y + (1 - y) * B.s - r / 2, r, r);
		}
		clear(ctx, size);
		ctx.strokeStyle = C.axis;
		ctx.lineWidth = 1;
		ctx.strokeRect(B.x, B.y, B.s, B.s);
		ctx.strokeStyle = "rgba(199,155,255,0.8)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(B.x, B.y + B.s, B.s, -Math.PI / 2, 0);
		ctx.stroke();
		ctx.drawImage(layer, 0, 0, size.w, size.h);
		ctx.fillStyle = C.text;
		ctx.font = '11px "JetBrains Mono", monospace';
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText("π ≈ 4 · (grün / alle)", size.w / 2, B.y + B.s + 4);
	});
})();

// =====================================================================
// 2 · Metropolis-Hastings in 1D
// =====================================================================
(() => {
	const canvas = document.getElementById("mhCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.85 : 1.05));
	const note = document.getElementById("mhNote");
	const runBtn = document.getElementById("mhRun");
	const sS = slider("mhS", (v) => nf(v, 2));
	const p = (x) => 0.3 * normPdf(x, -2.2, 0.6) + 0.7 * normPdf(x, 1.5, 1);
	const LO = -6;
	const HI = 6;
	let x = -4.5;
	let chain = [];
	let acc = 0;
	let last = null;
	let running = false;
	let t = 0;
	const bins = 60;
	let hist = new Array(bins).fill(0);
	function step(explain) {
		const prop = x + sS.value * randn();
		const ratio = prop < LO || prop > HI ? 0 : p(prop) / p(x);
		const u = Math.random();
		const ok = u < ratio;
		last = { from: x, to: prop, ok, ratio, u, t: 0 };
		if (explain) {
			note.textContent =
				`x = ${nf(x, 2)} → Vorschlag x′ = ${nf(prop, 2)}. p(x′)/p(x) = ${nf(ratio, 2)}. ` +
				(ratio >= 1 ? "Bergauf → angenommen." : `Zufall u = ${nf(u, 2)} ${ok ? "<" : "≥"} ${nf(ratio, 2)} → ${ok ? "angenommen" : `abgelehnt, bleibe bei ${nf(x, 2)}`}.`);
		}
		if (ok) {
			x = prop;
			acc++;
		}
		chain.push(x);
		hist[clamp(Math.floor(((x - LO) / (HI - LO)) * bins), 0, bins - 1)]++;
		document.getElementById("mhN").textContent = chain.length.toLocaleString("de-DE");
		document.getElementById("mhAcc").textContent = pct(acc, chain.length);
	}
	document.getElementById("mhStep").addEventListener("click", () => step(true));
	runBtn.addEventListener("click", () => {
		running = !running;
		runBtn.setAttribute("aria-pressed", String(running));
		runBtn.textContent = running ? "⏸ Anhalten" : "▶ Laufen lassen";
		if (running) note.textContent = "Läuft. Das Histogramm nähert sich der Kurve. Probier ein sehr kleines und ein sehr großes σ.";
	});
	document.getElementById("mhReset").addEventListener("click", () => {
		x = -4.5;
		chain = [];
		acc = 0;
		last = null;
		hist = new Array(bins).fill(0);
		document.getElementById("mhN").textContent = "0";
		document.getElementById("mhAcc").textContent = "–";
		note.textContent = "Drück „Ein Schritt“.";
	});

	whenVisible(canvas, (dt) => {
		if (running) {
			t += dt * 40;
			while (t >= 1) {
				t -= 1;
				step(false);
			}
		}
		clear(ctx, size);
		const top = size.h * 0.5;
		const P = plot({ w: size.w, h: top }, { x: [LO, HI], y: [0, 0.42] }, { l: 16, r: 16, t: 30, b: 20 });
		P.axes(ctx, { xt: 6, yt: 0, yf: null, xf: (v) => nf(v, 0) });
		const n = chain.length;
		if (n) {
			const bw = (HI - LO) / bins;
			let m = 0;
			for (const c of hist) m = Math.max(m, c / (n * bw));
			const sc = m > 0.42 ? 0.42 / m : 1;
			ctx.fillStyle = "rgba(199,155,255,0.45)";
			for (let i = 0; i < bins; i++) {
				const Y = P.sy((hist[i] / (n * bw)) * sc);
				ctx.fillRect(P.sx(LO + i * bw) + 0.5, Y, P.sx(LO + bw) - P.sx(LO) - 1, P.y1 - Y);
			}
		}
		P.curve(ctx, p, { color: C.a, width: 2.5, n: 300 });
		if (last) {
			last.t = Math.min(1, last.t + dt * 2);
			const q = (v) => normPdf(v, last.from, sS.value) * 0.25;
			if (!running) P.curve(ctx, q, { color: "rgba(255,179,102,0.6)", width: 1.5, dash: [4, 4], n: 300 });
			const X = P.sx(clamp(last.to, LO, HI));
			ctx.strokeStyle = last.ok ? C.a : C.d;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(X, P.sy(p(last.to)));
			ctx.lineTo(X, P.y1);
			ctx.stroke();
			ctx.fillStyle = last.ok ? C.a : C.d;
			ctx.beginPath();
			ctx.arc(X, P.sy(p(last.to)), 5, 0, 7);
			ctx.fill();
		}
		ctx.fillStyle = C.ink;
		ctx.beginPath();
		ctx.arc(P.sx(x), P.sy(p(x)), 7, 0, 7);
		ctx.fill();

		// Spurplot: neueste Probe oben, Zeit läuft nach unten
		const y0 = top + 14;
		const y1 = size.h - 10;
		const rows = 120;
		const rh = (y1 - y0) / rows;
		ctx.fillStyle = C.text;
		ctx.font = '11px "Space Grotesk", sans-serif';
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.fillText("Spur: neueste oben ↓ ältere", 16, y0 - 1);
		ctx.strokeStyle = "rgba(199,155,255,0.9)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		for (let i = 0; i < Math.min(rows, n); i++) {
			const v = chain[n - 1 - i];
			const X = P.sx(v);
			const Y = y0 + i * rh;
			if (i) ctx.lineTo(X, Y);
			else ctx.moveTo(X, Y);
		}
		ctx.stroke();
	});
})();

// =====================================================================
// 3 · Galerie in 2D
// =====================================================================
const TARGETS = [
	{
		label: "Glocke",
		start: [-3, 3],
		lp: (x, y) => -0.5 * (x * x + y * y),
		g: (x, y) => [-x, -y],
		cond: null,
	},
	{
		label: "Schräge Ellipse",
		start: [-3, 3],
		lp: (x, y) => {
			const r = 0.95;
			return (-0.5 * (x * x - 2 * r * x * y + y * y)) / (1 - r * r) / 2.2;
		},
		g: (x, y) => {
			const r = 0.95;
			const k = 1 / ((1 - r * r) * 2.2);
			return [-k * (x - r * y), -k * (y - r * x)];
		},
	},
	{
		label: "Banane",
		start: [-3, -3],
		lp: (x, y) => {
			const r = y - 1.8 + 0.3 * x * x;
			return -(x * x) / 4.5 - 2 * r * r;
		},
		g: (x, y) => {
			const r = y - 1.8 + 0.3 * x * x;
			return [-x / 2.25 - 4 * r * 0.6 * x, -4 * r];
		},
	},
	{
		label: "Donut",
		start: [2.6, 0],
		lp: (x, y) => {
			const r = Math.hypot(x, y);
			return -((r - 2.6) ** 2) / (2 * 0.09);
		},
		g: (x, y) => {
			const r = Math.max(1e-6, Math.hypot(x, y));
			const k = -(r - 2.6) / 0.09;
			return [(k * x) / r, (k * y) / r];
		},
	},
	{
		label: "Zwei Gipfel",
		start: [-2.2, -1.6],
		lp: (x, y) => {
			const a = -((x + 2.2) ** 2 + (y + 1.6) ** 2) / (2 * 0.5);
			const b = -((x - 2.2) ** 2 + (y - 1.6) ** 2) / (2 * 0.5);
			const m = Math.max(a, b);
			return m + Math.log(Math.exp(a - m) + Math.exp(b - m));
		},
		g: (x, y) => {
			const a = -((x + 2.2) ** 2 + (y + 1.6) ** 2) / (2 * 0.5);
			const b = -((x - 2.2) ** 2 + (y - 1.6) ** 2) / (2 * 0.5);
			const m = Math.max(a, b);
			const wa = Math.exp(a - m);
			const wb = Math.exp(b - m);
			const s = wa + wb;
			return [(wa * -(x + 2.2) + wb * -(x - 2.2)) / (0.5 * s), (wa * -(y + 1.6) + wb * -(y - 1.6)) / (0.5 * s)];
		},
	},
	{
		label: "Trichter",
		start: [0, 0],
		// Neals Trichter: y ~ N(0, 1.5²), x | y ~ N(0, e^y)
		lp: (x, y) => -(y * y) / (2 * 2.25) - (x * x) / (2 * Math.exp(y)) - y / 2,
		g: (x, y) => [-x * Math.exp(-y), -y / 2.25 + (x * x * Math.exp(-y)) / 2 - 0.5],
	},
];

const ALGOS = [
	{
		label: "Random Walk",
		param: { name: "Vorschlagsweite σ", min: 0.05, max: 3, step: 0.01, val: 0.8 },
		L: false,
		info: "<b>Random-Walk Metropolis-Hastings.</b> Vorschlag: aktueller Punkt plus Zufall mit Weite σ (der Kreis). Angenommen mit Wahrscheinlichkeit min(1, p(neu)/p(alt)).",
	},
	{
		label: "Adaptive MH",
		param: { name: "Start-Weite σ", min: 0.05, max: 3, step: 0.01, val: 0.6 },
		L: false,
		info: "<b>Adaptiver Metropolis (Haario 2001).</b> Ab 50 Proben wird die Vorschlags-Ellipse aus der Kovarianz der bisherigen Proben gelernt (Faktor 2,38²/d).",
	},
	{
		label: "MALA",
		param: { name: "Schrittweite ε", min: 0.05, max: 1.5, step: 0.01, val: 0.5 },
		L: false,
		info: "<b>Metropolis-adjusted Langevin.</b> Der Vorschlag wird um ε²/2 · ∇log p in Richtung Gipfel verschoben, dann kommt Zufall dazu. Ein MH-Test korrigiert die Schieflage.",
	},
	{
		label: "HMC",
		param: { name: "Leapfrog-Schrittweite ε", min: 0.01, max: 0.6, step: 0.005, val: 0.15 },
		L: true,
		info: "<b>Hamiltonian Monte Carlo.</b> Ein Teilchen bekommt einen zufälligen Impuls und rollt L Leapfrog-Schritte lang durch die Landschaft −log p. Die Energieerhaltung sorgt für hohe Annahmeraten trotz weiter Sprünge.",
	},
	{
		label: "Gibbs",
		param: null,
		L: false,
		info: "<b>Gibbs-Sampling.</b> Abwechselnd wird x bei festem y und y bei festem x exakt aus der bedingten Verteilung gezogen. Jeder Zug wird angenommen, bewegt sich aber nur entlang einer Achse.",
	},
];

(() => {
	const canvas = document.getElementById("galCanvas");
	const { ctx, size } = fitCanvas(canvas, 1);
	const tag = document.getElementById("galTag");
	const out = document.getElementById("galOut");
	const info = document.getElementById("algoInfo");
	const sIn = document.getElementById("gS");
	const sName = document.getElementById("gSName");
	const sWrap = document.getElementById("gSWrap");
	const lWrap = document.getElementById("gLWrap");
	const runBtn = document.getElementById("gRun");
	const sS = slider("gS", (v) => nf(v, 3));
	const lS = slider("gL", (v) => String(v));
	const tS = slider("gT", (v) => `${Math.round(10 ** (v * 3))} Schritte/s`);
	const DOM = 5;
	const M = 46; // Rand für die Randverteilungen
	let T = TARGETS[2];
	let A = ALGOS[0];
	let cur;
	let lp;
	let samples;
	let accepted;
	let total;
	let anim = null;
	let trail = [];
	let running = true;
	let gibbsAxis = 0;
	let stat;
	let acc = 0;
	const BINS = 50;
	let hx;
	let hy;

	function reset() {
		cur = T.start.slice();
		lp = T.lp(cur[0], cur[1]);
		samples = [];
		accepted = 0;
		total = 0;
		anim = null;
		trail = [];
		gibbsAxis = 0;
		stat = { n: 0, mx: 0, my: 0, sxx: 0, sxy: 0, syy: 0 };
		hx = new Array(BINS).fill(0);
		hy = new Array(BINS).fill(0);
		tag.textContent = `${A.label} · ${T.label}`;
		readout();
	}
	function readout() {
		out.textContent = `${samples.length.toLocaleString("de-DE")} Proben · Annahme ${pct(accepted, total)}`;
	}
	chips(document.getElementById("algoChips"), ALGOS, (i) => {
		A = ALGOS[i];
		configure();
		reset();
	});
	chips(document.getElementById("targetChips"), TARGETS, (i) => {
		T = TARGETS[i];
		bg = null;
		reset();
	}, 2);
	function configure() {
		info.innerHTML = A.info;
		sWrap.style.display = A.param ? "" : "none";
		lWrap.style.display = A.L ? "" : "none";
		if (A.param) {
			sName.textContent = A.param.name;
			sIn.min = A.param.min;
			sIn.max = A.param.max;
			sIn.step = A.param.step;
			sS.set(A.param.val);
		}
	}
	runBtn.addEventListener("click", () => {
		running = !running;
		runBtn.setAttribute("aria-pressed", String(running));
		runBtn.textContent = running ? "⏸ Pause" : "▶ Weiter";
	});
	document.getElementById("gStep").addEventListener("click", () => {
		if (anim) finish();
		begin();
	});
	document.getElementById("gReset").addEventListener("click", reset);

	// Kovarianz der Proben (Welford), für Adaptive MH
	function record(p) {
		samples.push(p);
		if (samples.length > 20000) samples.shift();
		const s = stat;
		s.n++;
		const dx = p[0] - s.mx;
		const dy = p[1] - s.my;
		s.mx += dx / s.n;
		s.my += dy / s.n;
		s.sxx += dx * (p[0] - s.mx);
		s.sxy += dx * (p[1] - s.my);
		s.syy += dy * (p[1] - s.my);
		const bx = Math.floor(((p[0] + DOM) / (2 * DOM)) * BINS);
		const by = Math.floor(((p[1] + DOM) / (2 * DOM)) * BINS);
		if (bx >= 0 && bx < BINS) hx[bx]++;
		if (by >= 0 && by < BINS) hy[by]++;
	}
	function propCov() {
		const s = stat;
		const sig = sS.value;
		if (A !== ALGOS[1] || s.n < 50) return [sig * sig, 0, sig * sig];
		const k = (2.38 * 2.38) / 2;
		return [(k * s.sxx) / (s.n - 1) + 1e-4, (k * s.sxy) / (s.n - 1), (k * s.syy) / (s.n - 1) + 1e-4];
	}

	// Ein Schritt des gewählten Verfahrens: liefert Weg, Ziel und Entscheidung
	function propose() {
		const [x, y] = cur;
		if (A === ALGOS[0] || A === ALGOS[1]) {
			const [a, b, d] = propCov();
			const l11 = Math.sqrt(a);
			const l21 = b / l11;
			const l22 = Math.sqrt(Math.max(1e-12, d - l21 * l21));
			const z1 = randn();
			const z2 = randn();
			const to = [x + l11 * z1, y + l21 * z1 + l22 * z2];
			const lpn = T.lp(to[0], to[1]);
			return { path: [cur, to], to, lpn, ok: Math.log(Math.random()) < lpn - lp };
		}
		if (A === ALGOS[2]) {
			const e = sS.value;
			const g = T.g(x, y);
			const m = [x + ((e * e) / 2) * g[0], y + ((e * e) / 2) * g[1]];
			const to = [m[0] + e * randn(), m[1] + e * randn()];
			const lpn = T.lp(to[0], to[1]);
			const gn = T.g(to[0], to[1]);
			const mb = [to[0] + ((e * e) / 2) * gn[0], to[1] + ((e * e) / 2) * gn[1]];
			const lq = (a, mm) => -((a[0] - mm[0]) ** 2 + (a[1] - mm[1]) ** 2) / (2 * e * e);
			const la = lpn - lp + lq(cur, mb) - lq(to, m);
			return { path: [cur, m, to], to, lpn, ok: Number.isFinite(la) && Math.log(Math.random()) < la };
		}
		if (A === ALGOS[3]) {
			const e = sS.value;
			const L = lS.value;
			let q = cur.slice();
			let p = [randn(), randn()];
			const H0 = -lp + 0.5 * (p[0] ** 2 + p[1] ** 2);
			const path = [q.slice()];
			let g = T.g(q[0], q[1]);
			p = [p[0] + (e / 2) * g[0], p[1] + (e / 2) * g[1]];
			let bad = false;
			for (let i = 1; i <= L; i++) {
				q = [q[0] + e * p[0], q[1] + e * p[1]];
				path.push(q.slice());
				g = T.g(q[0], q[1]);
				if (!Number.isFinite(g[0]) || Math.abs(q[0]) > 50 || Math.abs(q[1]) > 50) {
					bad = true;
					break;
				}
				const f = i === L ? e / 2 : e;
				p = [p[0] + f * g[0], p[1] + f * g[1]];
			}
			const lpn = bad ? -Infinity : T.lp(q[0], q[1]);
			const H1 = -lpn + 0.5 * (p[0] ** 2 + p[1] ** 2);
			return { path, to: q, lpn, ok: !bad && Math.log(Math.random()) < H0 - H1 };
		}
		// Gibbs: bedingte Verteilung numerisch auf einem feinen Raster ziehen
		const N = 400;
		const lo = -7;
		const hi = 7;
		const ws = new Float64Array(N);
		let m = -Infinity;
		for (let i = 0; i < N; i++) {
			const v = lo + ((i + Math.random()) / N) * (hi - lo);
			ws[i] = gibbsAxis === 0 ? T.lp(v, y) : T.lp(x, v);
			m = Math.max(m, ws[i]);
		}
		let s = 0;
		for (let i = 0; i < N; i++) s += ws[i] = Math.exp(ws[i] - m);
		let u = Math.random() * s;
		let k = 0;
		while (k < N - 1 && u > ws[k]) u -= ws[k++];
		const v = lo + ((k + Math.random()) / N) * (hi - lo);
		const to = gibbsAxis === 0 ? [v, y] : [x, v];
		gibbsAxis ^= 1;
		return { path: [cur, to], to, lpn: T.lp(to[0], to[1]), ok: true };
	}
	function commit(r) {
		total++;
		if (r.ok) {
			accepted++;
			cur = r.to;
			lp = r.lpn;
		}
		record(cur.slice());
		trail.push({ path: r.path, ok: r.ok, life: 1 });
		if (trail.length > 6) trail.shift();
	}
	function begin() {
		anim = { r: propose(), t: 0 };
	}
	function finish() {
		commit(anim.r);
		anim = null;
		readout();
	}

	// Hintergrund: Dichte als Wärmebild plus wahre Randverteilungen
	let bg = null;
	let bgKey = "";
	let mx;
	let my;
	const view = () => {
		const w = size.w - M;
		const h = size.h - M;
		return { w, h, X: (x) => ((x + DOM) / (2 * DOM)) * w, Y: (y) => h - ((y + DOM) / (2 * DOM)) * h };
	};
	function makeBg() {
		const V = view();
		const R = 2;
		const W = Math.ceil(V.w / R);
		const H = Math.ceil(V.h / R);
		const c = document.createElement("canvas");
		c.width = W;
		c.height = H;
		const g = c.getContext("2d");
		const id = g.createImageData(W, H);
		const L = new Float64Array(W * H);
		let m = -Infinity;
		for (let j = 0; j < H; j++)
			for (let i = 0; i < W; i++) {
				const x = -DOM + ((i + 0.5) / W) * 2 * DOM;
				const y = DOM - ((j + 0.5) / H) * 2 * DOM;
				L[j * W + i] = T.lp(x, y);
				m = Math.max(m, L[j * W + i]);
			}
		mx = new Float64Array(W);
		my = new Float64Array(H);
		for (let j = 0; j < H; j++)
			for (let i = 0; i < W; i++) {
				const d = Math.exp(L[j * W + i] - m);
				mx[i] += d;
				my[j] += d;
				const [r, gg, b] = heat(0.08 + 0.62 * Math.pow(d, 0.5));
				const k = (j * W + i) * 4;
				id.data[k] = r * 0.8;
				id.data[k + 1] = gg * 0.8;
				id.data[k + 2] = b * 0.8;
				id.data[k + 3] = 255;
			}
		g.putImageData(id, 0, 0);
		return c;
	}
	configure();
	reset();

	function drawPath(V, path, col, upto = 1) {
		const n = path.length;
		const k = Math.max(2, Math.ceil(upto * n));
		ctx.strokeStyle = col;
		ctx.lineWidth = 1.6;
		ctx.beginPath();
		for (let i = 0; i < Math.min(n, k); i++) {
			const X = V.X(path[i][0]);
			const Y = V.Y(path[i][1]);
			if (i) ctx.lineTo(X, Y);
			else ctx.moveTo(X, Y);
		}
		ctx.stroke();
		const e = path[Math.min(n, k) - 1];
		ctx.fillStyle = col;
		ctx.beginPath();
		ctx.arc(V.X(e[0]), V.Y(e[1]), 3.5, 0, 7);
		ctx.fill();
	}

	whenVisible(canvas, (dt) => {
		const key = `${T.label}|${size.w}|${size.h}`;
		if (!bg || key !== bgKey) {
			bg = makeBg();
			bgKey = key;
		}
		const sps = Math.round(10 ** (tS.value * 3));
		const slow = sps <= 8;
		if (running) {
			if (slow) {
				if (!anim) begin();
				anim.t += dt * sps;
				if (anim.t >= 1) finish();
			} else {
				anim = null;
				acc += dt * sps;
				let k = 0;
				while (acc >= 1 && k < 400) {
					acc -= 1;
					k++;
					commit(propose());
				}
				if (k) readout();
			}
		} else if (anim) {
			anim.t = Math.min(1, anim.t + dt * 2);
			if (anim.t >= 1) finish();
		}
		for (const tr of trail) tr.life = Math.max(0, tr.life - dt * (slow ? 0.6 : 3));

		const V = view();
		clear(ctx, size);
		ctx.drawImage(bg, 0, 0, V.w, V.h);
		// Proben
		ctx.fillStyle = "rgba(244,239,230,0.55)";
		const start = Math.max(0, samples.length - 5000);
		for (let i = start; i < samples.length; i++) {
			const [x, y] = samples[i];
			ctx.fillRect(V.X(x) - 1, V.Y(y) - 1, 2, 2);
		}
		// Vorschlagsform
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, 0, V.w, V.h);
		ctx.clip();
		if (A === ALGOS[0] || A === ALGOS[1]) {
			const [a, b, d] = propCov();
			const mm = (a + d) / 2;
			const rr = Math.sqrt(((a - d) / 2) ** 2 + b * b);
			const th = 0.5 * Math.atan2(2 * b, a - d);
			const sx = V.w / (2 * DOM);
			ctx.strokeStyle = "rgba(255,179,102,0.8)";
			ctx.lineWidth = 1.5;
			ctx.setLineDash([4, 3]);
			ctx.beginPath();
			ctx.ellipse(V.X(cur[0]), V.Y(cur[1]), Math.sqrt(mm + rr) * sx, Math.sqrt(Math.max(1e-9, mm - rr)) * sx, -th, 0, 7);
			ctx.stroke();
			ctx.setLineDash([]);
		}
		for (const tr of trail) {
			if (tr.life <= 0) continue;
			ctx.globalAlpha = tr.life;
			drawPath(V, tr.path, tr.ok ? C.a : C.d);
		}
		ctx.globalAlpha = 1;
		if (anim) drawPath(V, anim.r.path, anim.t < 0.85 ? C.c : anim.r.ok ? C.a : C.d, A === ALGOS[3] ? anim.t / 0.85 : 1);
		ctx.restore();
		ctx.fillStyle = C.ink;
		ctx.strokeStyle = C.bg;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(V.X(cur[0]), V.Y(cur[1]), 5.5, 0, 7);
		ctx.fill();
		ctx.stroke();

		// Randverteilungen
		ctx.fillStyle = "#0d0f12";
		ctx.fillRect(0, V.h, size.w, M);
		ctx.fillRect(V.w, 0, M, V.h);
		const n = samples.length;
		const maxH = Math.max(1, ...hx);
		const maxV = Math.max(1, ...hy);
		const sumT = mx.reduce((s, v) => s + v, 0);
		const sumTy = my.reduce((s, v) => s + v, 0);
		const tMaxX = Math.max(...mx) / sumT;
		const tMaxY = Math.max(...my) / sumTy;
		const bw = V.w / BINS;
		const bh = V.h / BINS;
		ctx.fillStyle = "rgba(199,155,255,0.75)";
		// Skala: Histogramm und Wahrheit als Dichte vergleichbar machen
		const scaleX = (M - 8) / Math.max(tMaxX * (mx.length / BINS), n ? maxH / n : 0);
		const scaleY = (M - 8) / Math.max(tMaxY * (my.length / BINS), n ? maxV / n : 0);
		if (n) {
			for (let i = 0; i < BINS; i++) {
				const hh = (hx[i] / n) * scaleX;
				ctx.fillRect(i * bw + 0.5, V.h + 4, bw - 1, hh);
				const ww = (hy[i] / n) * scaleY;
				ctx.fillRect(V.w + 4, V.h - (i + 1) * bh + 0.5, ww, bh - 1);
			}
		}
		ctx.strokeStyle = C.ink;
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		for (let i = 0; i < mx.length; i++) {
			const X = ((i + 0.5) / mx.length) * V.w;
			const Y = V.h + 4 + (mx[i] / sumT) * (mx.length / BINS) * scaleX;
			if (i) ctx.lineTo(X, Y);
			else ctx.moveTo(X, Y);
		}
		ctx.stroke();
		ctx.beginPath();
		for (let j = 0; j < my.length; j++) {
			const Y = ((j + 0.5) / my.length) * V.h;
			const X = V.w + 4 + (my[j] / sumTy) * (my.length / BINS) * scaleY;
			if (j) ctx.lineTo(X, Y);
			else ctx.moveTo(X, Y);
		}
		ctx.stroke();
	});
})();

// =====================================================================
// 4 · Diagnose: Spurplot und Autokorrelation
// =====================================================================
(() => {
	const canvas = document.getElementById("diagCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.8 : 1.05));
	const note = document.getElementById("diagNote");
	const chains = [
		{ name: "σ = 0,12 · zu klein", s: 0.12, col: C.d },
		{ name: "σ = 2,4 · genau richtig", s: 2.4, col: C.a },
		{ name: "σ = 30 · zu groß", s: 30, col: C.c },
	];
	function reset() {
		for (const c of chains) {
			c.x = 3;
			c.xs = [];
			c.acc = 0;
			c.n = 0;
			c.acf = [];
			c.ess = 0;
		}
	}
	reset();
	document.getElementById("diagReset").addEventListener("click", reset);
	let tick = 0;
	function analyse(c) {
		const xs = c.xs.slice(-2000);
		const n = xs.length;
		if (n < 50) return;
		const m = xs.reduce((a, b) => a + b, 0) / n;
		const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / n;
		c.acf = [];
		let sum = 0;
		let cut = false;
		for (let k = 0; k <= 40; k++) {
			let s = 0;
			for (let i = 0; i + k < n; i++) s += (xs[i] - m) * (xs[i + k] - m);
			const r = v > 0 ? s / (n * v) : 1;
			c.acf.push(r);
			if (k > 0 && !cut) {
				if (r < 0.05) cut = true;
				else sum += r;
			}
		}
		c.ess = Math.max(1, Math.round(n / (1 + 2 * sum)));
	}

	whenVisible(canvas, (dt) => {
		for (const c of chains) {
			for (let k = 0; k < 4; k++) {
				const p = c.x + c.s * randn();
				if (Math.log(Math.random()) < -0.5 * (p * p - c.x * c.x)) {
					c.x = p;
					c.acc++;
				}
				c.n++;
				c.xs.push(c.x);
			}
			if (c.xs.length > 3000) c.xs.splice(0, c.xs.length - 3000);
		}
		tick += dt;
		if (tick > 0.4) {
			tick = 0;
			chains.forEach(analyse);
			note.textContent = chains
				.map((c) => `${c.name.split(" · ")[1]}: Annahme ${pct(c.acc, c.n)}, ESS ≈ ${c.ess.toLocaleString("de-DE")} von ${Math.min(2000, c.xs.length).toLocaleString("de-DE")}`)
				.join(" · ");
		}
		clear(ctx, size);
		const rows = chains.length;
		const rh = (size.h - 40) / rows;
		const split = size.w * 0.64;
		chains.forEach((c, i) => {
			const y0 = 34 + i * rh;
			const mid = y0 + rh / 2 + 6;
			const amp = (rh - 34) / 8;
			ctx.fillStyle = c.col;
			ctx.font = '12px "Space Grotesk", sans-serif';
			ctx.textAlign = "left";
			ctx.textBaseline = "top";
			ctx.fillText(c.name, 12, y0 + 2);
			ctx.strokeStyle = C.grid;
			ctx.beginPath();
			ctx.moveTo(12, mid);
			ctx.lineTo(split - 12, mid);
			ctx.stroke();
			const N = 300;
			const xs = c.xs.slice(-N);
			ctx.strokeStyle = c.col;
			ctx.lineWidth = 1.2;
			ctx.beginPath();
			xs.forEach((v, k) => {
				const X = lerp(12, split - 12, k / (N - 1));
				const Y = mid - clamp(v, -4, 4) * amp;
				if (k) ctx.lineTo(X, Y);
				else ctx.moveTo(X, Y);
			});
			ctx.stroke();
			// Autokorrelation
			const ax0 = split + 8;
			const ax1 = size.w - 12;
			const base = y0 + rh - 14;
			const hgt = rh - 40;
			ctx.strokeStyle = C.axis;
			ctx.beginPath();
			ctx.moveTo(ax0, base);
			ctx.lineTo(ax1, base);
			ctx.stroke();
			const bw = (ax1 - ax0) / 41;
			c.acf.forEach((r, k) => {
				ctx.fillStyle = c.col;
				ctx.globalAlpha = 0.8;
				const hh = clamp(r, -0.2, 1) * hgt;
				ctx.fillRect(ax0 + k * bw, base - Math.max(hh, 0), Math.max(1, bw - 1), Math.abs(hh));
				ctx.globalAlpha = 1;
			});
			if (i === 0) {
				ctx.fillStyle = C.text;
				ctx.font = '11px "Space Grotesk", sans-serif';
				ctx.textAlign = "left";
				ctx.fillText("Autokorrelation, Lag 0 … 40", ax0, y0 + 2);
			}
		});
	});
})();
