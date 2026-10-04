"use strict";

const { clamp, lerp, nf, randn, C, plot, pointer, chips, slider, heat } = Q;

function clear(ctx, size) {
	ctx.fillStyle = C.bg;
	ctx.fillRect(0, 0, size.w, size.h);
}

// Spektralradius der Momentum-Iteration für eine Richtung mit Krümmung λ
function rho(a, b, l) {
	const T = 1 + b - a * l;
	const disc = T * T - 4 * b;
	if (disc < 0) return Math.sqrt(b);
	const s = Math.sqrt(disc);
	return Math.max(Math.abs((T + s) / 2), Math.abs((T - s) / 2));
}

// Momentum-Lauf für eine Richtung: liefert x_k für k = 0..K
function run1d(a, b, l, K) {
	const xs = [1];
	let x = 1;
	let z = 0;
	for (let k = 0; k < K; k++) {
		z = b * z + l * x;
		x -= a * z;
		xs.push(x);
	}
	return xs;
}

// =====================================================================
// 1 · Der Ball im Tal
// =====================================================================
(() => {
	const canvas = document.getElementById("valleyCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1 : 1.3));
	const tag = document.getElementById("valleyTag");
	const out = document.getElementById("valleyOut");
	const ghostBtn = document.getElementById("vGhost");
	const th = -0.45;
	const ct = Math.cos(th);
	const st = Math.sin(th);
	const quad = (l1, l2) => ({
		f: (x, y) => {
			const u = ct * x + st * y;
			const v = -st * x + ct * y;
			return 0.5 * (l1 * u * u + l2 * v * v);
		},
		g: (x, y) => {
			const u = ct * x + st * y;
			const v = -st * x + ct * y;
			const gu = l1 * u;
			const gv = l2 * v;
			return [ct * gu - st * gv, st * gu + ct * gv];
		},
	});
	const F = [
		{ label: "Schmales Tal", ...quad(0.01, 1), cx: 0, cy: 0, span: 6.4, start: [-2.5, 1.5], aMax: 3.4, a: 1.9, b: 0.6, fmin: 0 },
		{ label: "Rundes Tal", ...quad(1, 1), cx: 0, cy: 0, span: 6.4, start: [-2.4, 1.2], aMax: 3.2, a: 0.6, b: 0.5, fmin: 0 },
		{
			label: "Banane",
			f: (x, y) => (1 - x) ** 2 + 10 * (y - x * x) ** 2,
			g: (x, y) => [-2 * (1 - x) - 40 * x * (y - x * x), 20 * (y - x * x)],
			cx: 0,
			cy: 1,
			span: 4.4,
			start: [-1.6, 2.4],
			aMax: 0.06,
			a: 0.012,
			b: 0.9,
			fmin: 0,
		},
	];
	let fn = F[0];
	let start = fn.start.slice();
	let play = -1;
	let ghost = true;
	const aS = slider("vA", (v) => nf(v * fn.aMax, fn.aMax < 1 ? 4 : 2), () => {
		play = -1;
		info();
	});
	const bS = slider("vB", (v) => nf(v, 2), () => {
		play = -1;
		info();
	});
	const alpha = () => aS.value * fn.aMax;
	chips(document.getElementById("valleyChips"), F, (i) => {
		fn = F[i];
		start = fn.start.slice();
		tag.textContent = fn.label;
		bg = null;
		aS.set(fn.a / fn.aMax);
		bS.set(fn.b);
	});
	ghostBtn.addEventListener("click", () => {
		ghost = !ghost;
		ghostBtn.setAttribute("aria-pressed", String(ghost));
	});
	document.getElementById("vPlay").addEventListener("click", () => (play = 0));
	const N = 150;
	function path(a, b) {
		const pts = [start.slice()];
		let [x, y] = start;
		let zx = 0;
		let zy = 0;
		let blown = false;
		for (let k = 0; k < N; k++) {
			const [gx, gy] = fn.g(x, y);
			zx = b * zx + gx;
			zy = b * zy + gy;
			x -= a * zx;
			y -= a * zy;
			if (!Number.isFinite(x) || Math.abs(x) > 1e3 || Math.abs(y) > 1e3) {
				blown = true;
				break;
			}
			pts.push([x, y]);
		}
		return { pts, blown, loss: blown ? Infinity : fn.f(x, y) - fn.fmin };
	}
	function info() {
		const m = path(alpha(), bS.value);
		const g = path(alpha(), 0);
		const fmt = (r) => (r.blown ? "explodiert" : r.loss < 1e-12 ? "≈ 0" : r.loss < 0.01 ? r.loss.toExponential(1).replace(".", ",") : nf(r.loss, 3));
		out.innerHTML = `nach ${N} Schritten<br>mit β: ${fmt(m)} · ohne: ${fmt(g)}`;
	}
	aS.set(fn.a / fn.aMax);
	info();

	// Hintergrund mit Höhenlinien (einmal pro Größe und Funktion)
	let bg = null;
	let bgKey = "";
	const view = () => {
		const s = size.w / fn.span;
		return { s, X: (x) => size.w / 2 + (x - fn.cx) * s, Y: (y) => size.h / 2 - (y - fn.cy) * s, ix: (px) => fn.cx + (px - size.w / 2) / s, iy: (py) => fn.cy - (py - size.h / 2) / s };
	};
	function makeBg() {
		const V = view();
		const res = 2;
		const W = Math.ceil(size.w / res);
		const H = Math.ceil(size.h / res);
		const c = document.createElement("canvas");
		c.width = W;
		c.height = H;
		const g = c.getContext("2d");
		const id = g.createImageData(W, H);
		const L = new Float32Array(W * H);
		for (let j = 0; j < H; j++)
			for (let i = 0; i < W; i++) L[j * W + i] = Math.log(fn.f(V.ix(i * res), V.iy(j * res)) - fn.fmin + 1e-3);
		let lo = Infinity;
		let hi = -Infinity;
		for (const v of L) {
			lo = Math.min(lo, v);
			hi = Math.max(hi, v);
		}
		const bands = 14;
		for (let j = 0; j < H; j++)
			for (let i = 0; i < W; i++) {
				const t = (L[j * W + i] - lo) / (hi - lo);
				const b = Math.floor(t * bands);
				const edge = (i + 1 < W && Math.floor(((L[j * W + i + 1] - lo) / (hi - lo)) * bands) !== b) || (j + 1 < H && Math.floor(((L[(j + 1) * W + i] - lo) / (hi - lo)) * bands) !== b);
				const [r, gg, bb] = heat(0.62 * (1 - t));
				const k = (j * W + i) * 4;
				const dim = 0.55;
				id.data[k] = edge ? 200 : r * dim;
				id.data[k + 1] = edge ? 200 : gg * dim;
				id.data[k + 2] = edge ? 200 : bb * dim;
				id.data[k + 3] = edge ? 70 : 255;
			}
		g.putImageData(id, 0, 0);
		return c;
	}
	pointer(canvas, {
		down(pt) {
			const V = view();
			start = [V.ix(pt.x), V.iy(pt.y)];
			play = -1;
			info();
		},
		move(pt) {
			const V = view();
			start = [V.ix(pt.x), V.iy(pt.y)];
			info();
		},
	});

	function drawPath(V, pts, col, w, upto) {
		ctx.strokeStyle = col;
		ctx.lineWidth = w;
		ctx.lineJoin = "round";
		ctx.beginPath();
		for (let i = 0; i < Math.min(pts.length, upto); i++) {
			const X = V.X(pts[i][0]);
			const Y = V.Y(pts[i][1]);
			if (i) ctx.lineTo(X, Y);
			else ctx.moveTo(X, Y);
		}
		ctx.stroke();
		ctx.fillStyle = col;
		for (let i = 0; i < Math.min(pts.length, upto); i++) {
			ctx.beginPath();
			ctx.arc(V.X(pts[i][0]), V.Y(pts[i][1]), w * 0.9, 0, 7);
			ctx.fill();
		}
	}

	whenVisible(canvas, (dt) => {
		const key = `${fn.label}|${size.w}|${size.h}`;
		if (!bg || key !== bgKey) {
			bg = makeBg();
			bgKey = key;
		}
		ctx.fillStyle = C.bg;
		ctx.fillRect(0, 0, size.w, size.h);
		ctx.imageSmoothingEnabled = true;
		ctx.drawImage(bg, 0, 0, size.w, size.h);
		const V = view();
		const upto = play >= 0 ? Math.floor(play) + 1 : Infinity;
		if (play >= 0) {
			play += dt * 30;
			if (play > N + 20) play = -1;
		}
		const m = path(alpha(), bS.value);
		if (ghost) drawPath(V, path(alpha(), 0).pts, "rgba(122,168,255,0.85)", 1.6, upto);
		drawPath(V, m.pts, C.c, 2.2, upto);
		// Ziel
		const goal = fn === F[2] ? [1, 1] : [0, 0];
		ctx.strokeStyle = C.ink;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(V.X(goal[0]), V.Y(goal[1]), 7, 0, 7);
		ctx.stroke();
		// Start und Ball
		ctx.fillStyle = C.ink;
		ctx.beginPath();
		ctx.arc(V.X(start[0]), V.Y(start[1]), 5, 0, 7);
		ctx.fill();
		if (play >= 0) {
			const i = Math.min(m.pts.length - 1, Math.floor(play));
			ctx.fillStyle = C.c;
			ctx.shadowColor = C.c;
			ctx.shadowBlur = 16;
			ctx.beginPath();
			ctx.arc(V.X(m.pts[i][0]), V.Y(m.pts[i][1]), 8, 0, 7);
			ctx.fill();
			ctx.shadowBlur = 0;
		}
		ctx.font = '11px "Space Grotesk", sans-serif';
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.fillStyle = C.c;
		ctx.fillText("● mit Momentum", 12, size.h - 26);
		if (ghost) {
			ctx.fillStyle = C.b;
			ctx.fillText("● ohne Momentum (β = 0)", 12, size.h - 10);
		}
	});
})();

// =====================================================================
// 2 · Zerlegung in Eigenrichtungen
// =====================================================================
(() => {
	const canvas = document.getElementById("eigCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.78 : 1));
	const note = document.getElementById("eigNote");
	const L = [1, 0.316, 0.1, 0.0316, 0.01];
	const cols = ["#6be3a8", "#59c9b9", "#6aaee0", "#7aa8ff", "#c79bff"];
	const K = 150;
	const aS = slider("eA", (v) => nf(v, 2), () => sync());
	const bS = slider("eB", (v) => nf(v, 2), () => sync());
	function sync() {
		const rates = L.map((l) => rho(aS.value, bS.value, l));
		const worst = rates.indexOf(Math.max(...rates));
		const r = rates[worst];
		note.textContent =
			r >= 1
				? `Die Richtung mit λ = ${nf(L[worst], 2)} explodiert. α ist zu groß für ihre Krümmung.`
				: `Am langsamsten: λ = ${nf(L[worst], 3)}, sie schrumpft pro Schritt nur um den Faktor ${nf(r, 3)}. Für 1/1000 braucht es ${Math.ceil(Math.log(1e-3) / Math.log(r)).toLocaleString("de-DE")} Schritte.`;
	}
	sync();

	whenVisible(canvas, () => {
		clear(ctx, size);
		const a = aS.value;
		const b = bS.value;
		const runs = L.map((l) => run1d(a, b, l, K));
		const loss = [];
		for (let k = 0; k <= K; k++) loss.push(runs.reduce((s, xs, i) => s + 0.5 * L[i] * xs[k] * xs[k], 0));
		// Gesamtfehler, logarithmisch
		const topH = size.h * 0.3;
		const lo = -10;
		const hi = 1;
		const P = plot({ w: size.w, h: topH }, { x: [0, K], y: [lo, hi] }, { l: 74, r: 14, t: 30, b: 8 });
		P.axes(ctx, { xt: 0, yt: 0, xf: null, yf: null });
		ctx.strokeStyle = C.c;
		ctx.lineWidth = 2;
		ctx.beginPath();
		loss.forEach((v, k) => {
			const Y = P.sy(clamp(Math.log10(Math.max(v, 1e-30)), lo, hi));
			if (k) ctx.lineTo(P.sx(k), Y);
			else ctx.moveTo(P.sx(k), Y);
		});
		ctx.stroke();
		ctx.fillStyle = C.c;
		ctx.font = '11px "Space Grotesk", sans-serif';
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";
		ctx.fillText("Gesamt-", P.x0 - 8, P.y0 + 10);
		ctx.fillText("fehler (log)", P.x0 - 8, P.y0 + 24);
		// Zeilen je Richtung
		const rowsTop = topH + 12;
		const rh = (size.h - rowsTop - 22) / L.length;
		L.forEach((l, i) => {
			const y0 = rowsTop + i * rh;
			const mid = y0 + rh / 2;
			const amp = rh * 0.42;
			const xs = runs[i];
			const blown = xs.some((v) => !Number.isFinite(v) || Math.abs(v) > 50);
			ctx.strokeStyle = C.grid;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(P.x0, mid);
			ctx.lineTo(P.x1, mid);
			ctx.stroke();
			ctx.fillStyle = blown ? "rgba(255,122,156,0.55)" : cols[i];
			ctx.globalAlpha = 0.75;
			const bw = Math.max(1, (P.x1 - P.x0) / K - 0.5);
			for (let k = 0; k <= K; k++) {
				const v = clamp(xs[k], -1.2, 1.2);
				const X = P.sx(k);
				ctx.fillRect(X - bw / 2, Math.min(mid, mid - v * amp), bw, Math.abs(v * amp));
			}
			ctx.globalAlpha = 1;
			ctx.fillStyle = blown ? C.d : cols[i];
			ctx.font = '11px "JetBrains Mono", monospace';
			ctx.textAlign = "right";
			ctx.textBaseline = "middle";
			ctx.fillText(`λ=${nf(l, l < 0.1 ? 3 : 2)}`, P.x0 - 8, mid);
		});
		ctx.fillStyle = C.text;
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.font = '11px "Space Grotesk", sans-serif';
		ctx.fillText(`Schritte 0 … ${K}  →`, (P.x0 + P.x1) / 2, size.h - 4);
	});
})();

// =====================================================================
// 3 · Landkarte der Konvergenzrate
// =====================================================================
(() => {
	const canvas = document.getElementById("mapCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1 : 1.25));
	let sel = { a: 1.2, b: 0.6 };
	let bg = null;
	let bgKey = "";
	const kS = slider("mK", (v) => Math.round(10 ** v).toLocaleString("de-DE"), () => {
		bg = null;
		stats();
	});
	const kappa = () => 10 ** kS.value;
	const rate = (a, b) => {
		const mu = 1 / kappa();
		return Math.max(rho(a, b, mu), rho(a, b, 1));
	};
	const A_MAX = 4;
	const P = () => plot(size, { x: [0, A_MAX], y: [0, 1] }, { l: 38, r: 14, t: 30, b: 28 });
	const steps = (r) => (r >= 1 ? "∞" : Math.ceil(Math.log(1e-3) / Math.log(r)).toLocaleString("de-DE"));
	function stats() {
		const r = rate(sel.a, sel.b);
		document.getElementById("mAB").textContent = `${nf(sel.a, 2)} · ${nf(sel.b, 2)}`;
		document.getElementById("mRate").textContent = r >= 1 ? "explodiert" : nf(r, 4);
		document.getElementById("mSteps").textContent = steps(r);
		const k = kappa();
		const rg = (k - 1) / (k + 1);
		document.getElementById("mGD").textContent = `${steps(rg)} Schritte`;
	}
	pointer(canvas, {
		down(pt) {
			const p = P();
			sel = { a: clamp(p.ix(pt.x), 0.001, A_MAX), b: clamp(p.iy(pt.y), 0, 0.999) };
			stats();
		},
		move(pt) {
			const p = P();
			sel = { a: clamp(p.ix(pt.x), 0.001, A_MAX), b: clamp(p.iy(pt.y), 0, 0.999) };
			stats();
		},
	});
	stats();
	function makeBg() {
		const p = P();
		const W = Math.ceil((p.x1 - p.x0) / 2);
		const H = Math.ceil((p.y1 - p.y0) / 2);
		const c = document.createElement("canvas");
		c.width = W;
		c.height = H;
		const g = c.getContext("2d");
		const id = g.createImageData(W, H);
		for (let j = 0; j < H; j++)
			for (let i = 0; i < W; i++) {
				const a = ((i + 0.5) / W) * A_MAX;
				const b = 1 - (j + 0.5) / H;
				const r = rate(a, b);
				const k = (j * W + i) * 4;
				if (r >= 1) {
					const over = clamp((r - 1) * 3, 0, 1);
					id.data[k] = 70 + 60 * (1 - over);
					id.data[k + 1] = 18;
					id.data[k + 2] = 30;
				} else {
					const s = -Math.log(r);
					const [R, G, B] = heat(clamp((Math.log10(s) + 3.5) / 3.5, 0, 1));
					id.data[k] = R;
					id.data[k + 1] = G;
					id.data[k + 2] = B;
				}
				id.data[k + 3] = 255;
			}
		g.putImageData(id, 0, 0);
		return c;
	}

	whenVisible(canvas, () => {
		const key = `${kS.value}|${size.w}|${size.h}`;
		if (!bg || key !== bgKey) {
			bg = makeBg();
			bgKey = key;
		}
		clear(ctx, size);
		const p = P();
		ctx.drawImage(bg, p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0);
		p.axes(ctx, { xt: 8, yt: 5, grid: false, xf: (v) => nf(v, 1), yf: (v) => nf(v, 1) });
		ctx.fillStyle = C.text;
		ctx.font = '11px "Space Grotesk", sans-serif';
		ctx.textAlign = "right";
		ctx.textBaseline = "bottom";
		ctx.fillText("α →", p.x1, p.y1 - 4);
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText("β ↑", p.x0 + 6, p.y0 + 4);
		// Optimum mit und ohne Momentum
		const k = kappa();
		const mu = 1 / k;
		const aOpt = (2 / (1 + Math.sqrt(mu))) ** 2;
		const bOpt = ((Math.sqrt(k) - 1) / (Math.sqrt(k) + 1)) ** 2;
		const aGD = 2 / (1 + mu);
		const mark = (a, b, col, label) => {
			const X = p.sx(a);
			const Y = p.sy(b);
			ctx.fillStyle = col;
			ctx.beginPath();
			for (let i = 0; i < 10; i++) {
				const r = i % 2 ? 4 : 9;
				const t = (i * Math.PI) / 5 - Math.PI / 2;
				ctx.lineTo(X + Math.cos(t) * r, Y + Math.sin(t) * r);
			}
			ctx.fill();
			ctx.font = '11px "Space Grotesk", sans-serif';
			ctx.textAlign = X > size.w * 0.7 ? "right" : "left";
			ctx.textBaseline = "middle";
			ctx.fillText(label, X + (X > size.w * 0.7 ? -12 : 12), Y + (b < 0.08 ? -12 : 0));
		};
		mark(aGD, 0, C.b, "bestes ohne Momentum");
		mark(aOpt, bOpt, C.c, "Optimum");
		ctx.strokeStyle = C.ink;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.arc(p.sx(sel.a), p.sy(sel.b), 8, 0, 7);
		ctx.stroke();
	});
})();

// =====================================================================
// 4 · Kritische Dämpfung
// =====================================================================
(() => {
	const c1 = document.getElementById("dmpCanvas");
	const c2 = document.getElementById("cplxCanvas");
	const A = fitCanvas(c1, 1.1);
	const B = fitCanvas(c2, 1.1);
	const tag = document.getElementById("dmpTag");
	const aS = slider("dA", (v) => nf(v, 2), () => {});
	const bS = slider("dB", (v) => nf(v, 3), () => {});
	document.getElementById("dCrit").addEventListener("click", () => bS.set((1 - Math.sqrt(aS.value)) ** 2));
	const K = 60;

	whenVisible(c1, () => {
		const a = aS.value;
		const b = bS.value;
		const xs = run1d(a, b, 1, K);
		const T = 1 + b - a;
		const disc = T * T - 4 * b;
		const r = rho(a, b, 1);
		const bc = (1 - Math.sqrt(a)) ** 2;
		tag.textContent = r >= 1 ? "Divergiert" : Math.abs(b - bc) < 0.006 ? "Kritisch gedämpft" : disc < 0 ? "Unterdämpft · schwingt" : "Überdämpft · kriecht";
		// Verlauf
		{
			const { ctx, size } = A;
			clear(ctx, size);
			const P = plot(size, { x: [0, K], y: [-1.1, 1.1] }, { l: 30, r: 10, t: 30, b: 22 });
			P.axes(ctx, { xt: 4, yt: 2, xf: (v) => String(Math.round(v)), yf: (v) => nf(v, 0) });
			ctx.strokeStyle = C.axis;
			ctx.beginPath();
			ctx.moveTo(P.x0, P.sy(0));
			ctx.lineTo(P.x1, P.sy(0));
			ctx.stroke();
			ctx.strokeStyle = C.c;
			ctx.lineWidth = 2;
			ctx.beginPath();
			xs.forEach((v, k) => {
				const Y = P.sy(clamp(v, -1.1, 1.1));
				if (k) ctx.lineTo(P.sx(k), Y);
				else ctx.moveTo(P.sx(k), Y);
			});
			ctx.stroke();
			ctx.fillStyle = C.c;
			xs.forEach((v, k) => {
				ctx.beginPath();
				ctx.arc(P.sx(k), P.sy(clamp(v, -1.1, 1.1)), 2.2, 0, 7);
				ctx.fill();
			});
		}
		// Komplexe Ebene
		{
			const { ctx, size } = B;
			clear(ctx, size);
			const s = Math.min(size.w, size.h) / 2.8;
			const cx = size.w / 2;
			const cy = size.h / 2 + 8;
			ctx.strokeStyle = C.grid;
			ctx.beginPath();
			ctx.moveTo(cx - 1.3 * s, cy);
			ctx.lineTo(cx + 1.3 * s, cy);
			ctx.moveTo(cx, cy - 1.3 * s);
			ctx.lineTo(cx, cy + 1.3 * s);
			ctx.stroke();
			ctx.strokeStyle = C.axis;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(cx, cy, s, 0, 7);
			ctx.stroke();
			ctx.setLineDash([4, 4]);
			ctx.strokeStyle = "rgba(255,179,102,0.5)";
			ctx.beginPath();
			ctx.arc(cx, cy, Math.sqrt(b) * s, 0, 7);
			ctx.stroke();
			ctx.setLineDash([]);
			let ev;
			if (disc < 0) {
				const im = Math.sqrt(-disc) / 2;
				ev = [[T / 2, im], [T / 2, -im]];
			} else {
				const sq = Math.sqrt(disc);
				ev = [[(T + sq) / 2, 0], [(T - sq) / 2, 0]];
			}
			for (const [re, im] of ev) {
				ctx.fillStyle = r >= 1 ? C.d : C.c;
				ctx.beginPath();
				ctx.arc(cx + clamp(re, -1.3, 1.3) * s, cy - clamp(im, -1.3, 1.3) * s, 6, 0, 7);
				ctx.fill();
			}
			ctx.fillStyle = C.text;
			ctx.font = '11px "Space Grotesk", sans-serif';
			ctx.textAlign = "left";
			ctx.textBaseline = "top";
			ctx.fillText(`Rate = ${nf(r, 3)}`, 12, size.h - 20);
		}
	});
})();

// =====================================================================
// 5 · Polynom-Fit mit Gradientenabstieg
// =====================================================================
(() => {
	const canvas = document.getElementById("fitCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.05 : 1.4));
	const tag = document.getElementById("fitTag");
	const out = document.getElementById("fitOut");
	const note = document.getElementById("fitNote");
	const D = 12;
	const KMAX = 5000;
	const betas = [0, 0.9, 0.99];
	let beta = 0;
	let X = [];
	let Y = [];
	let hist = null;
	let gdLoss = null;
	const feats = (x) => Array.from({ length: D }, (_, j) => x ** j);
	function newData() {
		const n = 16;
		X = [];
		Y = [];
		for (let i = 0; i < n; i++) {
			const x = -1 + (2 * i) / (n - 1) + (Math.random() - 0.5) * 0.06;
			X.push(x);
			Y.push(Math.sin(2.6 * x) + 0.4 * x * x + randn() * 0.12);
		}
	}
	function train(b) {
		const Phi = X.map(feats);
		// λ_max per Potenzmethode
		let v = new Array(D).fill(1);
		let lmax = 1;
		for (let it = 0; it < 60; it++) {
			const Av = new Array(D).fill(0);
			for (const row of Phi) {
				const d = row.reduce((s, r, j) => s + r * v[j], 0);
				for (let j = 0; j < D; j++) Av[j] += row[j] * d;
			}
			lmax = Math.hypot(...Av);
			v = Av.map((x) => x / lmax);
		}
		const a = 1 / lmax;
		const ws = [new Float64Array(D)];
		const loss = [];
		let w = new Float64Array(D);
		const z = new Float64Array(D);
		const L = (w) => Phi.reduce((s, row, i) => s + 0.5 * (row.reduce((t, r, j) => t + r * w[j], 0) - Y[i]) ** 2, 0);
		loss.push(L(w));
		for (let k = 0; k < KMAX; k++) {
			const g = new Float64Array(D);
			Phi.forEach((row, i) => {
				const r = row.reduce((t, x, j) => t + x * w[j], 0) - Y[i];
				for (let j = 0; j < D; j++) g[j] += row[j] * r;
			});
			const nw = new Float64Array(D);
			for (let j = 0; j < D; j++) {
				z[j] = b * z[j] + g[j];
				nw[j] = w[j] - a * z[j];
			}
			w = nw;
			ws.push(w);
			loss.push(L(w));
		}
		return { ws, loss };
	}
	function retrain() {
		hist = train(beta);
		gdLoss = beta === 0 ? hist.loss : train(0).loss;
		sync();
	}
	const kOf = (s) => (s <= 0 ? 0 : Math.round(10 ** (s * Math.log10(KMAX))));
	const kS = slider("fitK", (s) => kOf(s).toLocaleString("de-DE"), () => sync());
	function sync() {
		const k = kOf(kS.value);
		const l = hist.loss[k];
		out.textContent = `Fehler ${nf(l, 3)}`;
		tag.textContent = `β = ${nf(beta, 2)} · nach ${k.toLocaleString("de-DE")} Schritten`;
		if (beta > 0 && k > 0) {
			const g = gdLoss.findIndex((v) => v <= l);
			note.textContent =
				g < 0
					? `Ohne Momentum erreicht man diesen Fehler nicht einmal in ${KMAX.toLocaleString("de-DE")} Schritten.`
					: `Ohne Momentum bräuchte man für denselben Fehler ${g.toLocaleString("de-DE")} Schritte, also ${nf(g / k, 1)}-mal so viele.`;
		} else note.textContent = "Zuerst die grobe Form, dann immer feinere Details. Frühes Aufhören glättet.";
	}
	chips(document.getElementById("fitChips"), betas.map((b) => `β = ${nf(b, b === 0 ? 0 : 2)}`), (i) => {
		beta = betas[i];
		retrain();
	});
	document.getElementById("fitNew").addEventListener("click", () => {
		newData();
		retrain();
	});
	newData();
	retrain();

	whenVisible(canvas, () => {
		clear(ctx, size);
		const P = plot(size, { x: [-1.1, 1.1], y: [-1.8, 1.8] }, { l: 34, r: 14, t: 42, b: 24 });
		P.axes(ctx, { xt: 4, yt: 4, xf: (v) => nf(v, 1), yf: (v) => nf(v, 1) });
		const w = hist.ws[kOf(kS.value)];
		ctx.save();
		ctx.beginPath();
		ctx.rect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0);
		ctx.clip();
		P.curve(ctx, (x) => feats(x).reduce((s, f, j) => s + f * w[j], 0), { color: C.c, width: 2.5, n: 300 });
		ctx.restore();
		ctx.fillStyle = C.a;
		X.forEach((x, i) => {
			ctx.beginPath();
			ctx.arc(P.sx(x), P.sy(Y[i]), 5, 0, 7);
			ctx.fill();
		});
	});
})();
