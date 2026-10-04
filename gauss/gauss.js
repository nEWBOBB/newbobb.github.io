"use strict";

const { clamp, lerp, nf, randn, C, plot, pointer, chips, slider, normPdf, heat } = Q;

function clear(ctx, size) {
	ctx.fillStyle = C.bg;
	ctx.fillRect(0, 0, size.w, size.h);
}

// ---------------------------------------------------------------------
// Lineare Algebra für kleine Matrizen (zeilenweise in Float64Array)
// ---------------------------------------------------------------------
// Cholesky-Zerlegung A = L Lᵀ; erhöht bei Bedarf die Diagonale ein wenig
function chol(A, n) {
	let jitter = 0;
	for (let attempt = 0; attempt < 8; attempt++) {
		const L = new Float64Array(n * n);
		let ok = true;
		for (let i = 0; i < n && ok; i++) {
			for (let j = 0; j <= i; j++) {
				let s = A[i * n + j] + (i === j ? jitter : 0);
				for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
				if (i === j) {
					if (s <= 0) {
						ok = false;
						break;
					}
					L[i * n + i] = Math.sqrt(s);
				} else L[i * n + j] = s / L[j * n + j];
			}
		}
		if (ok) return L;
		jitter = jitter ? jitter * 10 : 1e-8 * (1 + Math.abs(A[0]));
	}
	return null;
}
// Löst L x = b (vorwärts) und Lᵀ x = b (rückwärts)
function fwd(L, n, b) {
	const x = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		let s = b[i];
		for (let k = 0; k < i; k++) s -= L[i * n + k] * x[k];
		x[i] = s / L[i * n + i];
	}
	return x;
}
function bwd(L, n, b) {
	const x = new Float64Array(n);
	for (let i = n - 1; i >= 0; i--) {
		let s = b[i];
		for (let k = i + 1; k < n; k++) s -= L[k * n + i] * x[k];
		x[i] = s / L[i * n + i];
	}
	return x;
}
function gram(k, xs, ys = xs) {
	const n = xs.length;
	const m = ys.length;
	const K = new Float64Array(n * m);
	for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) K[i * m + j] = k(xs[i], ys[j]);
	return K;
}
const lmul = (L, n, z) => {
	const f = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		let s = 0;
		for (let k = 0; k <= i; k++) s += L[i * n + k] * z[k];
		f[i] = s;
	}
	return f;
};
const randVec = (n) => Float64Array.from({ length: n }, () => randn());
const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

// Kernel-Bausteine
const K = {
	rbf: (l, s) => (a, b) => s * s * Math.exp(-((a - b) ** 2) / (2 * l * l)),
	exp: (l, s) => (a, b) => s * s * Math.exp(-Math.abs(a - b) / l),
	per: (l, s, p) => (a, b) => s * s * Math.exp((-2 * Math.sin((Math.PI * Math.abs(a - b)) / p) ** 2) / (l * l)),
	lin: (s) => (a, b) => s * s * (0.15 + (a * b) / 8),
};

// GP-Posterior an den Stellen xs
function posterior(k, X, Y, noise, xs, z) {
	const m = xs.length;
	const n = X.length;
	const Kss = gram(k, xs);
	if (!n) {
		const sd = Array.from({ length: m }, (_, i) => Math.sqrt(Kss[i * m + i]));
		const L = chol(Kss, m);
		return { mu: new Float64Array(m), sd, samples: L && z ? z.map((v) => lmul(L, m, v)) : [] };
	}
	const Kxx = gram(k, X);
	for (let i = 0; i < n; i++) Kxx[i * n + i] += noise * noise + 1e-9;
	const L = chol(Kxx, n);
	const alpha = bwd(L, n, fwd(L, n, Y));
	const Ksx = gram(k, xs, X); // m × n
	const mu = new Float64Array(m);
	for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) mu[i] += Ksx[i * n + j] * alpha[j];
	// V = L⁻¹ Kxs, Spalte für Spalte
	const V = new Float64Array(n * m);
	for (let i = 0; i < m; i++) {
		const col = fwd(L, n, Ksx.subarray(i * n, i * n + n));
		for (let j = 0; j < n; j++) V[j * m + i] = col[j];
	}
	const cov = new Float64Array(m * m);
	for (let i = 0; i < m; i++)
		for (let j = 0; j <= i; j++) {
			let s = Kss[i * m + j];
			for (let r = 0; r < n; r++) s -= V[r * m + i] * V[r * m + j];
			cov[i * m + j] = cov[j * m + i] = s;
		}
	const sd = Array.from({ length: m }, (_, i) => Math.sqrt(Math.max(0, cov[i * m + i])));
	const Lc = z ? chol(cov, m) : null;
	const samples = Lc ? z.map((v) => lmul(Lc, m, v).map((f, i) => f + mu[i])) : [];
	let lml = -0.5 * Y.reduce((s, y, i) => s + y * alpha[i], 0) - (n / 2) * Math.log(2 * Math.PI);
	for (let i = 0; i < n; i++) lml -= Math.log(L[i * n + i]);
	return { mu, sd, samples, lml };
}

// Kurve aus Werten an den Stellen xs
function line(ctx, P, xs, ys, col, w = 2) {
	ctx.strokeStyle = col;
	ctx.lineWidth = w;
	ctx.beginPath();
	xs.forEach((x, i) => (i ? ctx.lineTo(P.sx(x), P.sy(ys[i])) : ctx.moveTo(P.sx(x), P.sy(ys[i]))));
	ctx.stroke();
}
function band(ctx, P, xs, mu, sd, col) {
	ctx.fillStyle = col;
	ctx.beginPath();
	xs.forEach((x, i) => (i ? ctx.lineTo(P.sx(x), P.sy(mu[i] + 2 * sd[i])) : ctx.moveTo(P.sx(x), P.sy(mu[i] + 2 * sd[i]))));
	for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(P.sx(xs[i]), P.sy(mu[i] - 2 * sd[i]));
	ctx.fill();
}
function heatmap(ctx, size, M, n, norm) {
	const c = document.createElement("canvas");
	c.width = n;
	c.height = n;
	const g = c.getContext("2d");
	const id = g.createImageData(n, n);
	for (let i = 0; i < n * n; i++) {
		const [r, gg, b] = heat(M[i] / norm);
		id.data[i * 4] = r;
		id.data[i * 4 + 1] = gg;
		id.data[i * 4 + 2] = b;
		id.data[i * 4 + 3] = 255;
	}
	g.putImageData(id, 0, 0);
	const s = Math.min(size.w - 24, size.h - 44);
	ctx.imageSmoothingEnabled = n > 60;
	ctx.drawImage(c, (size.w - s) / 2, (size.h - s) / 2 + 12, s, s);
	return { s, x: (size.w - s) / 2, y: (size.h - s) / 2 + 12 };
}

// =====================================================================
// 1 · Zweidimensionale Normalverteilung
// =====================================================================
(() => {
	const canvas = document.getElementById("mvnCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.15));
	const tag = document.getElementById("mvnTag");
	const note = document.getElementById("mvnNote");
	const rS = slider("mRho", (v) => nf(v, 2), () => sync());
	const s1S = slider("mS1", (v) => nf(v, 2), () => sync());
	const s2S = slider("mS2", (v) => nf(v, 2), () => sync());
	const Z = Array.from({ length: 500 }, () => [randn(), randn()]);
	let mode = 0;
	let c = 1.2;
	chips(document.getElementById("mvnChips"), ["Marginalisieren", "Bedingen"], (i) => {
		mode = i;
		tag.textContent = i ? "Bedingen" : "Marginalisieren";
		sync();
	});
	const M = 54;
	const view = () => {
		const w = size.w - M;
		const h = size.h - M;
		const s = Math.min(w, h) / 8.4;
		return { s, X: (x) => M + w / 2 + x * s, Y: (y) => h / 2 - y * s, iy: (py) => (h / 2 - py) / s, w, h };
	};
	const setC = (pt) => {
		if (mode !== 1) return;
		c = clamp(view().iy(pt.y), -3.6, 3.6);
		sync();
	};
	pointer(canvas, { down: setC, move: setC });
	function cond() {
		const r = rS.value;
		const s1 = s1S.value;
		const s2 = s2S.value;
		return { m: ((r * s1) / s2) * c, s: s1 * Math.sqrt(1 - r * r) };
	}
	function sync() {
		if (mode === 0) note.textContent = `X ~ N(0; ${nf(s1S.value, 2)}²) · Y ~ N(0; ${nf(s2S.value, 2)}²), egal wie groß ρ ist.`;
		else {
			const k = cond();
			note.textContent = `X | Y = ${nf(c, 2)}  ~  N(${nf(k.m, 2)}; ${nf(k.s, 2)}²) · vorher N(0; ${nf(s1S.value, 2)}²)`;
		}
	}
	sync();

	whenVisible(canvas, () => {
		clear(ctx, size);
		const V = view();
		const r = rS.value;
		const s1 = s1S.value;
		const s2 = s2S.value;
		// Gitter und Achsen
		ctx.strokeStyle = C.grid;
		ctx.lineWidth = 1;
		for (let k = -4; k <= 4; k++) {
			ctx.beginPath();
			ctx.moveTo(V.X(k), V.Y(4));
			ctx.lineTo(V.X(k), V.Y(-4));
			ctx.moveTo(V.X(-4), V.Y(k));
			ctx.lineTo(V.X(4), V.Y(k));
			ctx.stroke();
		}
		// Ellipsen
		const a = s1 * s1;
		const b = r * s1 * s2;
		const d = s2 * s2;
		const mm = (a + d) / 2;
		const rr = Math.sqrt(((a - d) / 2) ** 2 + b * b);
		const th = 0.5 * Math.atan2(2 * b, a - d);
		for (const k of [1, 2]) {
			ctx.strokeStyle = `rgba(199,155,255,${k === 1 ? 0.7 : 0.35})`;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.ellipse(V.X(0), V.Y(0), k * Math.sqrt(mm + rr) * V.s, k * Math.sqrt(Math.max(0, mm - rr)) * V.s, -th, 0, 7);
			ctx.stroke();
		}
		// Punkte
		const sq = Math.sqrt(1 - r * r);
		for (const [z1, z2] of Z) {
			const x = s1 * z1;
			const y = s2 * (r * z1 + sq * z2);
			const near = mode === 1 && Math.abs(y - c) < 0.14;
			ctx.fillStyle = near ? C.d : "rgba(244,239,230,0.45)";
			ctx.beginPath();
			ctx.arc(V.X(x), V.Y(y), near ? 3 : 2, 0, 7);
			ctx.fill();
		}
		// Randstreifen
		ctx.fillStyle = "#0d0f12";
		ctx.fillRect(0, 0, M, V.h);
		ctx.fillRect(0, V.h, size.w, M);
		const peak = M - 10;
		const curveX = (f, col, fill, dash) => {
			ctx.beginPath();
			for (let i = 0; i <= 200; i++) {
				const x = lerp(-4.2, 4.2, i / 200);
				const Y = V.h + 4 + f(x) * peak;
				if (i) ctx.lineTo(V.X(x), Y);
				else ctx.moveTo(V.X(x), Y);
			}
			if (fill) {
				ctx.lineTo(V.X(4.2), V.h + 4);
				ctx.lineTo(V.X(-4.2), V.h + 4);
				ctx.fillStyle = fill;
				ctx.fill();
			} else {
				ctx.setLineDash(dash || []);
				ctx.strokeStyle = col;
				ctx.lineWidth = 2;
				ctx.stroke();
				ctx.setLineDash([]);
			}
		};
		const k = cond();
		const norm = normPdf(0, 0, mode === 0 ? Math.min(s1, s2) : Math.min(s1, k.s));
		if (mode === 0) {
			curveX((x) => normPdf(x, 0, s1) / norm, null, "rgba(255,122,156,0.5)");
			// Y-Rand links
			ctx.fillStyle = "rgba(122,168,255,0.5)";
			ctx.beginPath();
			ctx.moveTo(4, V.Y(-4.2));
			for (let i = 0; i <= 200; i++) {
				const y = lerp(-4.2, 4.2, i / 200);
				ctx.lineTo(4 + (normPdf(y, 0, s2) / norm) * peak, V.Y(y));
			}
			ctx.lineTo(4, V.Y(4.2));
			ctx.fill();
		} else {
			curveX((x) => normPdf(x, 0, s1) / norm, "rgba(244,239,230,0.5)", null, [4, 4]);
			curveX((x) => normPdf(x, k.m, k.s) / norm, null, "rgba(255,122,156,0.6)");
			// Schnittlinie und bedingte Dichte darauf
			ctx.strokeStyle = C.d;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(M, V.Y(c));
			ctx.lineTo(size.w, V.Y(c));
			ctx.stroke();
			ctx.fillStyle = "rgba(255,122,156,0.25)";
			ctx.beginPath();
			ctx.moveTo(V.X(-4.2), V.Y(c));
			for (let i = 0; i <= 200; i++) {
				const x = lerp(-4.2, 4.2, i / 200);
				ctx.lineTo(V.X(x), V.Y(c) - (normPdf(x, k.m, k.s) / norm) * 46);
			}
			ctx.lineTo(V.X(4.2), V.Y(c));
			ctx.fill();
			ctx.fillStyle = C.d;
			ctx.beginPath();
			ctx.arc(M + 10, V.Y(c), 6, 0, 7);
			ctx.fill();
		}
		ctx.fillStyle = C.text;
		ctx.font = '11px "Space Grotesk", sans-serif';
		ctx.textAlign = "right";
		ctx.textBaseline = "bottom";
		ctx.fillText("X →", size.w - 8, size.h - 4);
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.fillText("Y ↑", 6, 44);
	});
})();

// =====================================================================
// 2 · Von Punkten zu Funktionen
// =====================================================================
(() => {
	const cc = document.getElementById("covCanvas");
	const pc = document.getElementById("ptsCanvas");
	const A = fitCanvas(cc, 1);
	const B = fitCanvas(pc, (w) => (w < 400 ? 1.2 : 1.67));
	const nS = slider("fN", (v) => String(v));
	const lS = slider("fL", (v) => nf(v, 2));
	let Z = [randVec(50), randVec(50), randVec(50)];
	document.getElementById("fNew").addEventListener("click", () => (Z = [randVec(50), randVec(50), randVec(50)]));
	const cols = [C.d, C.b, C.a];

	whenVisible(pc, () => {
		const n = nS.value;
		const xs = linspace(0, 1, n);
		const k = K.rbf(lS.value, 1);
		const Kx = gram(k, xs);
		const L = chol(Kx, n);
		clear(A.ctx, A.size);
		heatmap(A.ctx, A.size, Kx, n, 1);
		const { ctx, size } = B;
		clear(ctx, size);
		const P = plot(size, { x: [-0.04, 1.04], y: [-3, 3] }, { l: 26, r: 10, t: 30, b: 20 });
		P.axes(ctx, { xt: 0, yt: 2, xf: null, yf: (v) => nf(v, 0) });
		if (!L) return;
		Z.forEach((z, s) => {
			const f = lmul(L, n, z);
			ctx.globalAlpha = 0.5;
			line(ctx, P, xs, f, cols[s], 1.4);
			ctx.globalAlpha = 1;
			ctx.fillStyle = cols[s];
			xs.forEach((x, i) => {
				ctx.beginPath();
				ctx.arc(P.sx(x), P.sy(f[i]), n > 25 ? 2.5 : 4.5, 0, 7);
				ctx.fill();
			});
		});
		ctx.fillStyle = C.text;
		ctx.font = '11px "JetBrains Mono", monospace';
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		if (n <= 12) xs.forEach((x, i) => ctx.fillText(`x${i + 1}`, P.sx(x), P.y1 + 4));
	});
})();

// =====================================================================
// 3 · Kernel und Prior-Ziehungen
// =====================================================================
(() => {
	const mc = document.getElementById("kMatCanvas");
	const sc = document.getElementById("kSmpCanvas");
	const A = fitCanvas(mc, 1);
	const B = fitCanvas(sc, (w) => (w < 400 ? 1.2 : 1.67));
	const tag = document.getElementById("kTag");
	const lS = slider("kL", (v) => nf(v, 2), () => (dirty = true));
	const pS = slider("kP", (v) => nf(v, 2), () => (dirty = true));
	const sS = slider("kS", (v) => nf(v, 2), () => (dirty = true));
	const lWrap = document.getElementById("kLWrap");
	const pWrap = document.getElementById("kPWrap");
	const KS = [
		{ label: "RBF", l: true, p: false, make: (l, s) => K.rbf(l, s) },
		{ label: "Exponentiell", l: true, p: false, make: (l, s) => K.exp(l, s) },
		{ label: "Periodisch", l: true, p: true, make: (l, s, p) => K.per(l, s, p) },
		{ label: "Linear", l: false, p: false, make: (l, s) => K.lin(s) },
		{ label: "RBF + Periodisch", l: true, p: true, make: (l, s, p) => { const a = K.rbf(l * 2.5, s); const b = K.per(1, s * 0.5, p); return (x, y) => a(x, y) + b(x, y); } },
		{ label: "Linear × Periodisch", l: false, p: true, make: (l, s, p) => { const a = K.lin(1); const b = K.per(1, s, p); return (x, y) => a(x, y) * b(x, y); } },
	];
	let cur = KS[0];
	let dirty = true;
	const M = 100;
	const xs = linspace(-5, 5, M);
	let Z = [randVec(M), randVec(M), randVec(M)];
	let cache = null;
	chips(document.getElementById("kChips"), KS, (i) => {
		cur = KS[i];
		lWrap.style.display = cur.l ? "" : "none";
		pWrap.style.display = cur.p ? "" : "none";
		tag.textContent = `Prior · ${cur.label}`;
		dirty = true;
	});
	pWrap.style.display = "none";
	tag.textContent = "Prior · RBF";
	document.getElementById("kNew").addEventListener("click", () => {
		Z = [randVec(M), randVec(M), randVec(M)];
		dirty = true;
	});
	const cols = [C.d, C.b, C.a];

	whenVisible(sc, () => {
		if (dirty) {
			const k = cur.make(lS.value, sS.value, pS.value);
			const Km = gram(k, xs);
			const L = chol(Km, M);
			let mx = 0;
			for (const v of Km) mx = Math.max(mx, Math.abs(v));
			cache = { Km, mx, samples: L ? Z.map((z) => lmul(L, M, z)) : [], sd: xs.map((_, i) => Math.sqrt(Km[i * M + i])) };
			dirty = false;
		}
		clear(A.ctx, A.size);
		heatmap(A.ctx, A.size, cache.Km, M, cache.mx);
		const { ctx, size } = B;
		clear(ctx, size);
		const P = plot(size, { x: [-5, 5], y: [-4, 4] }, { l: 26, r: 10, t: 30, b: 22 });
		P.axes(ctx, { xt: 5, yt: 4, xf: (v) => nf(v, 0), yf: (v) => nf(v, 0) });
		ctx.save();
		ctx.beginPath();
		ctx.rect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0);
		ctx.clip();
		band(ctx, P, xs, new Float64Array(M), cache.sd, "rgba(199,155,255,0.12)");
		cache.samples.forEach((f, s) => line(ctx, P, xs, f, cols[s], 2));
		ctx.restore();
	});
})();

// =====================================================================
// 4 · GP-Regression mit Klicks
// =====================================================================
(() => {
	const canvas = document.getElementById("postCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.05 : 2.1));
	const tag = document.getElementById("postTag");
	const out = document.getElementById("postOut");
	const sampBtn = document.getElementById("pSamples");
	const lS = slider("pL", (v) => nf(v, 2), () => (dirty = true));
	const nS = slider("pN", (v) => nf(v, 2), () => (dirty = true));
	const KS = [
		{ label: "RBF", make: (l) => K.rbf(l, 1) },
		{ label: "Exponentiell", make: (l) => K.exp(l, 1) },
		{ label: "Periodisch", make: (l) => K.per(l, 1, 3) },
		{ label: "Linear", make: () => K.lin(1) },
	];
	let kern = KS[0];
	let pts = [];
	let dirty = true;
	let showS = true;
	let drag = null;
	const M = 120;
	const xs = linspace(-5, 5, M);
	const Z = [randVec(M), randVec(M), randVec(M)];
	let R = null;
	const demo = () => {
		pts = [-4, -2.6, -1, 0.4, 2.2, 3.5].map((x) => ({ x, y: Math.sin(x) * 1.4 + 0.2 * x }));
		dirty = true;
	};
	chips(document.getElementById("pChips"), KS, (i) => {
		kern = KS[i];
		tag.textContent = `Posterior · ${kern.label}`;
		dirty = true;
	});
	tag.textContent = "Posterior · RBF";
	sampBtn.addEventListener("click", () => {
		showS = !showS;
		sampBtn.setAttribute("aria-pressed", String(showS));
	});
	document.getElementById("pClear").addEventListener("click", () => {
		pts = [];
		dirty = true;
	});
	document.getElementById("pDemo").addEventListener("click", demo);
	demo();
	const P = () => plot(size, { x: [-5, 5], y: [-3.2, 3.2] }, { l: 30, r: 12, t: 30, b: 24 });
	pointer(canvas, {
		down(pt) {
			const p = P();
			drag = pts.find((q) => Math.hypot(p.sx(q.x) - pt.x, p.sy(q.y) - pt.y) < 14);
			if (!drag && pts.length < 40) {
				drag = { x: clamp(p.ix(pt.x), -5, 5), y: clamp(p.iy(pt.y), -3, 3) };
				pts.push(drag);
			}
			dirty = true;
		},
		move(pt) {
			if (!drag) return;
			const p = P();
			drag.x = clamp(p.ix(pt.x), -5, 5);
			drag.y = clamp(p.iy(pt.y), -3, 3);
			dirty = true;
		},
		up() {
			drag = null;
		},
	});

	whenVisible(canvas, () => {
		if (dirty) {
			R = posterior(kern.make(lS.value), pts.map((p) => p.x), pts.map((p) => p.y), nS.value, xs, Z);
			out.textContent = `${pts.length} Messpunkte`;
			dirty = false;
		}
		clear(ctx, size);
		const p = P();
		p.axes(ctx, { xt: 10, yt: 4, xf: (v) => nf(v, 0), yf: (v) => nf(v, 1) });
		ctx.save();
		ctx.beginPath();
		ctx.rect(p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0);
		ctx.clip();
		band(ctx, p, xs, R.mu, R.sd, "rgba(199,155,255,0.2)");
		if (showS) R.samples.forEach((f) => line(ctx, p, xs, f, "rgba(122,168,255,0.55)", 1.2));
		line(ctx, p, xs, R.mu, C.d, 2.5);
		ctx.restore();
		for (const q of pts) {
			ctx.fillStyle = C.ink;
			ctx.strokeStyle = C.bg;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(p.sx(q.x), p.sy(q.y), 6, 0, 7);
			ctx.fill();
			ctx.stroke();
			if (nS.value > 0.05) {
				ctx.strokeStyle = "rgba(244,239,230,0.4)";
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(p.sx(q.x), p.sy(q.y - 2 * nS.value));
				ctx.lineTo(p.sx(q.x), p.sy(q.y + 2 * nS.value));
				ctx.stroke();
			}
		}
	});
})();

// =====================================================================
// 5 · Hyperparameter über die marginale Likelihood
// =====================================================================
(() => {
	const hc = document.getElementById("hypCanvas");
	const lc = document.getElementById("lmlCanvas");
	const A = fitCanvas(hc, 1.15);
	const B = fitCanvas(lc, 1.15);
	const tag = document.getElementById("hypTag");
	const note = document.getElementById("hypNote");
	const NOISE = 0.15;
	const M = 100;
	const xs = linspace(-5, 5, M);
	const grid = linspace(Math.log(0.1), Math.log(6), 70);
	let X = [];
	let Y = [];
	let curve = [];
	let logL = Math.log(0.3);
	let target = null;
	let R = null;
	let lastL = null;
	function newData() {
		X = Array.from({ length: 16 }, () => -4.8 + Math.random() * 9.6).sort((a, b) => a - b);
		const Kx = gram(K.rbf(1, 1), X);
		for (let i = 0; i < X.length; i++) Kx[i * X.length + i] += NOISE * NOISE;
		const L = chol(Kx, X.length);
		Y = Array.from(lmul(L, X.length, randVec(X.length)));
		curve = grid.map((g) => posterior(K.rbf(Math.exp(g), 1), X, Y, NOISE, [0], null).lml);
		lastL = null;
	}
	newData();
	const best = () => grid[curve.indexOf(Math.max(...curve))];
	document.getElementById("hOpt").addEventListener("click", () => (target = best()));
	document.getElementById("hNew").addEventListener("click", () => {
		newData();
		target = null;
	});
	const LP = () => plot(B.size, { x: [grid[0], grid[grid.length - 1]], y: [Math.min(...curve), Math.max(...curve) + 2] }, { l: 12, r: 10, t: 30, b: 24 });
	const setL = (pt) => {
		const p = LP();
		logL = clamp(p.ix(pt.x), grid[0], grid[grid.length - 1]);
		target = null;
	};
	pointer(lc, { down: setL, move: setL });

	whenVisible(lc, (dt) => {
		if (target !== null) {
			logL = lerp(logL, target, Math.min(1, dt * 5));
			if (Math.abs(logL - target) < 0.002) target = null;
		}
		const l = Math.exp(logL);
		if (lastL !== l) {
			R = posterior(K.rbf(l, 1), X, Y, NOISE, xs, null);
			lastL = l;
			const d = (logL - best()) / Math.LN10;
			tag.textContent = `ℓ = ${nf(l, 2)}`;
			note.textContent =
				Math.abs(d) < 0.08
					? `ℓ = ${nf(l, 2)} liegt am Maximum der Likelihood. Erzeugt wurden die Daten mit ℓ = 1.`
					: d < 0
						? `ℓ = ${nf(l, 2)} ist zu klein: Die Kurve zappelt zwischen den Punkten, um jeden Ausreißer mitzunehmen.`
						: `ℓ = ${nf(l, 2)} ist zu groß: Die Kurve ist zu steif und ignoriert echte Struktur.`;
		}
		// Fit links
		{
			const { ctx, size } = A;
			clear(ctx, size);
			const P = plot(size, { x: [-5, 5], y: [-3.2, 3.2] }, { l: 26, r: 8, t: 30, b: 22 });
			P.axes(ctx, { xt: 5, yt: 4, xf: (v) => nf(v, 0), yf: (v) => nf(v, 0) });
			ctx.save();
			ctx.beginPath();
			ctx.rect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0);
			ctx.clip();
			band(ctx, P, xs, R.mu, R.sd, "rgba(199,155,255,0.2)");
			line(ctx, P, xs, R.mu, C.d, 2.2);
			ctx.restore();
			ctx.fillStyle = C.ink;
			X.forEach((x, i) => {
				ctx.beginPath();
				ctx.arc(P.sx(x), P.sy(Y[i]), 4, 0, 7);
				ctx.fill();
			});
		}
		// Likelihood rechts
		{
			const { ctx, size } = B;
			clear(ctx, size);
			const P = LP();
			P.axes(ctx, { xt: 0, yt: 0, xf: null, yf: null });
			ctx.fillStyle = C.text;
			ctx.font = '11px "JetBrains Mono", monospace';
			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			for (const v of [0.1, 0.3, 1, 3]) ctx.fillText(nf(v, 1), P.sx(Math.log(v)), P.y1 + 5);
			ctx.textAlign = "right";
			ctx.fillText("ℓ (log)", P.x1, P.y1 - 16);
			line(ctx, P, grid, curve, C.e, 2.2);
			const bx = P.sx(best());
			ctx.setLineDash([4, 4]);
			ctx.strokeStyle = "rgba(244,239,230,0.35)";
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(P.sx(0), P.y0);
			ctx.lineTo(P.sx(0), P.y1);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = C.text;
			ctx.textAlign = "left";
			ctx.fillText("wahr: ℓ = 1", P.sx(0) + 4, P.y0 + 2);
			ctx.fillStyle = C.e;
			ctx.beginPath();
			ctx.arc(bx, P.sy(Math.max(...curve)), 4, 0, 7);
			ctx.fill();
			// aktueller Wert
			const i = clamp(Math.round(((logL - grid[0]) / (grid[grid.length - 1] - grid[0])) * (grid.length - 1)), 0, grid.length - 1);
			const X0 = P.sx(logL);
			ctx.strokeStyle = C.d;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(X0, P.y0);
			ctx.lineTo(X0, P.y1);
			ctx.stroke();
			ctx.fillStyle = C.d;
			ctx.beginPath();
			ctx.arc(X0, P.sy(curve[i]), 6, 0, 7);
			ctx.fill();
		}
	});
})();
