"use strict";

// 20 ML-Algorithmen, Teil 2: Kapitel 11 bis 20 und die Arena. Nutzt Helfer aus ml.js.

// Gleicher Maßstab auf beiden Achsen: Datenbereich an das Seitenverhältnis anpassen
function squareDomain(p, cx = 0.5, cy = 0.5, spanY = 1, top = 0, bottom = 0) {
	const hh = p.size.h - top - bottom;
	const spanX = (spanY * p.size.w) / hh;
	p.pad = { l: 0, r: 0, t: top, b: bottom };
	p.xmin = cx - spanX / 2;
	p.xmax = cx + spanX / 2;
	p.ymin = cy - spanY / 2;
	p.ymax = cy + spanY / 2;
}

// Ellipse einer Glockenkurve mit Kovarianz S um m, k Standardabweichungen
function covEllipse(p, m, S, k, color, dash) {
	const e = ML.eig2(S);
	const ctx = p.ctx;
	ctx.save();
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.4;
	if (dash) ctx.setLineDash(dash);
	ctx.beginPath();
	for (let i = 0; i <= 64; i++) {
		const t = (i / 64) * Math.PI * 2;
		const a = Math.cos(t) * Math.sqrt(e.l[0]) * k;
		const b = Math.sin(t) * Math.sqrt(Math.max(e.l[1], 1e-9)) * k;
		const x = m[0] + a * e.v[0][0] + b * e.v[1][0];
		const y = m[1] + a * e.v[0][1] + b * e.v[1][1];
		i ? ctx.lineTo(p.X(x), p.Y(y)) : ctx.moveTo(p.X(x), p.Y(y));
	}
	ctx.stroke();
	ctx.restore();
}

// =====================================================================
// 11 · DBSCAN
// =====================================================================
function dbscan(pts, eps, minPts) {
	const n = pts.length;
	const nb = pts.map((a) => {
		const out = [];
		pts.forEach((b, j) => {
			if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= eps * eps) out.push(j);
		});
		return out;
	});
	const core = nb.map((l) => l.length >= minPts);
	const lab = new Array(n).fill(-1);
	let c = 0;
	for (let i = 0; i < n; i++) {
		if (lab[i] !== -1 || !core[i]) continue;
		const queue = [i];
		lab[i] = c;
		while (queue.length) {
			const j = queue.pop();
			if (!core[j]) continue;
			for (const k of nb[j])
				if (lab[k] === -1) {
					lab[k] = c;
					queue.push(k);
				}
		}
		c++;
	}
	return { lab, core, n: c };
}

(() => {
	const p = ML.plot($("c11"), (w) => (w < 500 ? 1.05 : 1.35));
	let pts = [];
	let kind = "moons";
	let km = false;
	let hover = null;
	const gen = () => {
		const r = rng(kind.length * 13);
		if (kind === "moons") pts = DATA.moons(r, 260, 0.028);
		else if (kind === "rings") {
			pts = [];
			for (let i = 0; i < 260; i++) {
				const rad = i % 2 ? 0.14 : 0.36;
				const a = r() * Math.PI * 2;
				pts.push({ x: 0.5 + Math.cos(a) * rad * 1.15 + r.n() * 0.018, y: 0.5 + Math.sin(a) * rad + r.n() * 0.018 });
			}
		} else {
			pts = [
				...DATA.gauss(r, 90, [0.27, 0.66], [0.05, 0.05], 0, 0),
				...DATA.gauss(r, 80, [0.7, 0.62], [0.045, 0.08], 0.5, 0),
				...DATA.gauss(r, 70, [0.45, 0.27], [0.08, 0.04], 0, 0),
			];
		}
		for (let i = 0; i < 26; i++) pts.push({ x: 0.04 + r() * 0.92, y: 0.04 + r() * 0.92 });
	};
	const eps = ML.slider("e11", (v) => ML.nf(v, 3), () => draw());
	const minP = ML.slider("m11s", (v) => String(v), () => draw());
	const draw = () => {
		const ctx = p.ctx;
		const res = dbscan(pts, eps.get(), minP.get());
		const noise = res.lab.filter((l) => l < 0).length;
		p.clear();
		let lab = res.lab;
		if (km) {
			const k = Math.max(2, res.n);
			lab = kmeansRun(pts, k, rng(5), true).as;
		}
		pts.forEach((q, i) => {
			const x = p.X(q.x);
			const y = p.Y(q.y);
			if (lab[i] < 0) {
				ML.line(ctx, x - 3, y - 3, x + 3, y + 3, "rgba(244,239,230,0.4)", 1.3);
				ML.line(ctx, x - 3, y + 3, x + 3, y - 3, "rgba(244,239,230,0.4)", 1.3);
				return;
			}
			ctx.beginPath();
			ctx.arc(x, y, km || res.core[i] ? 4 : 2.6, 0, Math.PI * 2);
			ctx.fillStyle = PAL[lab[i] % PAL.length];
			ctx.fill();
		});
		if (hover && !km) {
			const n = pts.filter((q) => (q.x - hover.x) ** 2 + (q.y - hover.y) ** 2 <= eps.get() ** 2).length;
			ctx.beginPath();
			ctx.ellipse(p.X(hover.x), p.Y(hover.y), Math.abs(p.X(eps.get()) - p.X(0)), Math.abs(p.Y(eps.get()) - p.Y(0)), 0, 0, Math.PI * 2);
			ctx.strokeStyle = n >= minP.get() ? "#7bdc9a" : "rgba(244,239,230,0.6)";
			ctx.lineWidth = 1.5;
			ctx.stroke();
			ML.label(p, `${n} ${n >= minP.get() ? "≥" : "<"} ${minP.get()}`, p.X(hover.x) + 8, p.Y(hover.y) - 8, { color: "#f4efe6", size: 12 });
		}
		$("m11").textContent = km ? `k-Means mit k = ${Math.max(2, res.n)}` : "DBSCAN";
		$("r11").innerHTML = km ? "k-Means" : `${res.n} Cluster<br>${noise} × Rauschen`;
		$("n11").textContent = km
			? "k-Means zerschneidet die Formen mit geraden Grenzen, weil es nur Abstände zu Mittelpunkten kennt. Und es steckt jeden Ausreißer in irgendeine Gruppe."
			: res.n === 0
			? "Kein einziger Kernpunkt: ε ist zu klein oder minPts zu groß. Alles ist Rauschen."
			: res.n === 1 && noise < 5
			? "ε ist so groß, dass alles zu einem Cluster zusammenwächst."
			: "Große Punkte sind Kernpunkte, kleine Randpunkte, × ist Rauschen. Der Kreis am Zeiger zählt die Nachbarn.";
	};
	ML.pointer(p, {
		move(x, y) {
			hover = { x, y };
			draw();
		},
		tap(x, y) {
			hover = { x, y };
			draw();
		},
		leave() {
			hover = null;
			draw();
		},
	});
	ML.chips($("ds11"), (v) => {
		kind = v;
		gen();
		draw();
	});
	$("km11").addEventListener("click", (e) => {
		km = !km;
		e.currentTarget.setAttribute("aria-pressed", String(km));
		draw();
	});
	p.draw = () => pts.length && draw();
	gen();
	draw();
})();

// =====================================================================
// 12 · PCA
// =====================================================================
(() => {
	const p = ML.plot($("c12"), (w) => (w < 500 ? 1.05 : 1.3));
	let pts = [];
	let seed = 51;
	let g = null;
	let ev = null;
	let found = false;
	let proj = 0;
	let projOn = false;
	const gen = () => {
		const r = rng(seed);
		pts = DATA.gauss(r, 110, [0.5, 0.5], [0.2, 0.055], 0.25 + r() * 1.2, 0);
		g = ML.gaussFit(pts);
		ev = ML.eig2(g.S);
		found = false;
	};
	const ang = ML.slider("ang12", (v) => `${v}°`, () => draw());
	const pcAngle = () => {
		let a = (Math.atan2(ev.v[0][1], ev.v[0][0]) * 180) / Math.PI;
		if (a < 0) a += 180;
		return a % 180;
	};
	const draw = () => {
		const ctx = p.ctx;
		squareDomain(p);
		const a = (ang.get() * Math.PI) / 180;
		const u = [Math.cos(a), Math.sin(a)];
		const m = g.m;
		p.clear();
		const L = 2;
		ML.line(ctx, p.X(m[0] - u[0] * L), p.Y(m[1] - u[1] * L), p.X(m[0] + u[0] * L), p.Y(m[1] + u[1] * L), "rgba(244,239,230,0.75)", 2);
		let varAlong = 0;
		const total = g.S[0] + g.S[3];
		for (const q of pts) {
			const t = (q.x - m[0]) * u[0] + (q.y - m[1]) * u[1];
			varAlong += t * t;
			const px = m[0] + t * u[0];
			const py = m[1] + t * u[1];
			if (!projOn || proj < 1) ML.line(ctx, p.X(q.x), p.Y(q.y), p.X(px), p.Y(py), "rgba(94,200,255,0.28)", 1);
			const x = q.x + (px - q.x) * proj;
			const y = q.y + (py - q.y) * proj;
			ctx.beginPath();
			ctx.arc(p.X(x), p.Y(y), 3.6, 0, Math.PI * 2);
			ctx.fillStyle = "#ff8a3d";
			ctx.fill();
		}
		varAlong /= pts.length;
		if (found) {
			ev.v.forEach((v, i) => {
				const s = Math.sqrt(ev.l[i]) * 2;
				const x2 = m[0] + v[0] * s;
				const y2 = m[1] + v[1] * s;
				ML.line(ctx, p.X(m[0]), p.Y(m[1]), p.X(x2), p.Y(y2), i ? "#5ec8ff" : "#ffc23d", 3);
				ML.label(p, i ? "PC2" : "PC1", p.X(x2) + 6, p.Y(y2) - 6, { color: i ? "#5ec8ff" : "#ffc23d", size: 12, weight: 600 });
			});
		}
		const kept = varAlong / total;
		$("mv12").style.width = `${kept * 100}%`;
		$("me12").style.width = `${(1 - kept) * 100}%`;
		$("r12").innerHTML = `Varianz behalten ${ML.pct(kept)}<br>Fehler ${ML.pct(1 - kept)}`;
		const best = ev.l[0] / total;
		$("n12").textContent =
			Math.abs(kept - best) < 0.004
				? `Das ist die erste Hauptkomponente: ${ML.pct(best)} der Streuung liegen in dieser einen Richtung. Die zweite (blau) steht senkrecht darauf und hat den Rest.`
				: `Die beste Richtung behält ${ML.pct(best)}. Blau: die Strecken, die beim Projizieren verloren gehen.`;
	};
	let anim = 0;
	$("pc12").addEventListener("click", () => {
		cancelAnimationFrame(anim);
		found = true;
		const from = ang.get();
		let to = pcAngle();
		if (to - from > 90) to -= 180;
		if (from - to > 90) to += 180;
		const t0 = performance.now();
		const step = (t) => {
			const k = Math.min(1, (t - t0) / 700);
			const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
			ang.set(Math.round(((from + (to - from) * e) % 180 + 180) % 180));
			draw();
			if (k < 1) anim = requestAnimationFrame(step);
		};
		anim = requestAnimationFrame(step);
	});
	$("pj12").addEventListener("click", (e) => {
		projOn = !projOn;
		e.currentTarget.setAttribute("aria-pressed", String(projOn));
		const from = proj;
		const to = projOn ? 1 : 0;
		const t0 = performance.now();
		const step = (t) => {
			const k = Math.min(1, (t - t0) / 600);
			proj = from + (to - from) * k;
			draw();
			if (k < 1) requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	});
	$("new12").addEventListener("click", () => {
		seed++;
		gen();
		draw();
	});
	p.draw = () => g && draw();
	gen();
	draw();
})();

// =====================================================================
// 13 · t-SNE
// =====================================================================
(() => {
	const canvas = $("c13");
	const p = ML.plot(canvas, (w) => (w < 500 ? 1.05 : 1.3));
	const N_CL = 5;
	const PER = 30;
	const DIM = 10;
	let X = [];
	let lab = [];
	let seed = 61;
	let P = null;
	let Y = null;
	let iY = null;
	let gains = null;
	let it = 0;
	let view = "tsne";
	let pcaY = [];
	const n = N_CL * PER;
	const gen = () => {
		const r = rng(seed);
		const centers = Array.from({ length: N_CL }, () => Array.from({ length: DIM }, () => r.n() * 1.1));
		X = [];
		lab = [];
		for (let c = 0; c < N_CL; c++)
			for (let i = 0; i < PER; i++) {
				const s = 0.35 + c * 0.08;
				X.push(centers[c].map((v) => v + r.n() * s));
				lab.push(c);
			}
		// PCA-Schatten per Potenzmethode
		const mean = new Array(DIM).fill(0);
		X.forEach((x) => x.forEach((v, d) => (mean[d] += v / n)));
		const C = Array.from({ length: DIM }, () => new Array(DIM).fill(0));
		X.forEach((x) => {
			for (let a = 0; a < DIM; a++) for (let b = 0; b < DIM; b++) C[a][b] += ((x[a] - mean[a]) * (x[b] - mean[b])) / n;
		});
		const comps = [];
		for (let k = 0; k < 2; k++) {
			let v = Array.from({ length: DIM }, () => r.n());
			for (let s = 0; s < 200; s++) {
				let nv = C.map((row) => row.reduce((acc, c, j) => acc + c * v[j], 0));
				for (const u of comps) {
					const d = nv.reduce((acc, x, j) => acc + x * u[j], 0);
					nv = nv.map((x, j) => x - d * u[j]);
				}
				const norm = Math.hypot(...nv) || 1;
				v = nv.map((x) => x / norm);
			}
			comps.push(v);
		}
		pcaY = X.map((x) => comps.map((u) => x.reduce((acc, v, d) => acc + (v - mean[d]) * u[d], 0)));
	};
	const perp = ML.slider("p13", (v) => String(v), () => restart());
	const restart = () => {
		const D = X.map((a) => X.map((b) => a.reduce((s, v, d) => s + (v - b[d]) ** 2, 0)));
		const Pc = new Float64Array(n * n);
		const target = Math.log(perp.get());
		for (let i = 0; i < n; i++) {
			let beta = 1;
			let lo = -Infinity;
			let hi = Infinity;
			for (let tries = 0; tries < 60; tries++) {
				let sum = 0;
				let dsum = 0;
				for (let j = 0; j < n; j++) {
					if (j === i) continue;
					const v = Math.exp(-D[i][j] * beta);
					Pc[i * n + j] = v;
					sum += v;
					dsum += D[i][j] * v;
				}
				sum = sum || 1e-12;
				const H = Math.log(sum) + (beta * dsum) / sum;
				for (let j = 0; j < n; j++) Pc[i * n + j] /= sum;
				const diff = H - target;
				if (Math.abs(diff) < 1e-5) break;
				if (diff > 0) {
					lo = beta;
					beta = hi === Infinity ? beta * 2 : (beta + hi) / 2;
				} else {
					hi = beta;
					beta = lo === -Infinity ? beta / 2 : (beta + lo) / 2;
				}
			}
		}
		P = new Float64Array(n * n);
		for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) P[i * n + j] = Math.max((Pc[i * n + j] + Pc[j * n + i]) / (2 * n), 1e-12);
		const r = rng(seed * 3 + perp.get());
		Y = Array.from({ length: n }, () => [r.n() * 1e-2, r.n() * 1e-2]);
		iY = Array.from({ length: n }, () => [0, 0]);
		gains = Array.from({ length: n }, () => [1, 1]);
		it = 0;
	};
	const step = () => {
		const num = new Float64Array(n * n);
		let sum = 0;
		for (let i = 0; i < n; i++)
			for (let j = i + 1; j < n; j++) {
				const v = 1 / (1 + (Y[i][0] - Y[j][0]) ** 2 + (Y[i][1] - Y[j][1]) ** 2);
				num[i * n + j] = num[j * n + i] = v;
				sum += 2 * v;
			}
		const exag = it < 100 ? 4 : 1;
		const mom = it < 250 ? 0.5 : 0.8;
		for (let i = 0; i < n; i++) {
			let gx = 0;
			let gy = 0;
			for (let j = 0; j < n; j++) {
				if (i === j) continue;
				const f = (exag * P[i * n + j] - num[i * n + j] / sum) * num[i * n + j];
				gx += f * (Y[i][0] - Y[j][0]);
				gy += f * (Y[i][1] - Y[j][1]);
			}
			const g = [4 * gx, 4 * gy];
			for (let d = 0; d < 2; d++) {
				gains[i][d] = Math.sign(g[d]) !== Math.sign(iY[i][d]) ? gains[i][d] + 0.2 : Math.max(gains[i][d] * 0.8, 0.01);
				iY[i][d] = mom * iY[i][d] - 100 * gains[i][d] * g[d];
			}
		}
		let mx = 0;
		let my = 0;
		for (let i = 0; i < n; i++) {
			Y[i][0] += iY[i][0];
			Y[i][1] += iY[i][1];
			mx += Y[i][0] / n;
			my += Y[i][1] / n;
		}
		for (const y of Y) {
			y[0] -= mx;
			y[1] -= my;
		}
		it++;
	};
	const draw = () => {
		const ctx = p.ctx;
		const pos = view === "pca" ? pcaY : Y;
		let x0 = Infinity;
		let x1 = -Infinity;
		let y0 = Infinity;
		let y1 = -Infinity;
		for (const q of pos) {
			x0 = Math.min(x0, q[0]);
			x1 = Math.max(x1, q[0]);
			y0 = Math.min(y0, q[1]);
			y1 = Math.max(y1, q[1]);
		}
		const pad = 30;
		const s = Math.min((p.size.w - 2 * pad) / (x1 - x0 || 1), (p.size.h - 2 * pad - 14) / (y1 - y0 || 1));
		const cx = (x0 + x1) / 2;
		const cy = (y0 + y1) / 2;
		p.clear();
		pos.forEach((q, i) => {
			ctx.beginPath();
			ctx.arc(p.size.w / 2 + (q[0] - cx) * s, p.size.h / 2 + 7 - (q[1] - cy) * s, 4, 0, Math.PI * 2);
			ctx.fillStyle = PAL[lab[i]];
			ctx.fill();
		});
		$("m13").textContent = view === "pca" ? "PCA-Schatten" : "t-SNE";
		$("r13").innerHTML = view === "pca" ? "linear, 2 von 10 Achsen" : `Iteration ${it}`;
		$("n13").textContent =
			view === "pca"
				? "PCA zeigt nur den Schatten entlang der zwei Hauptrichtungen. Gruppen, die in anderen Dimensionen getrennt sind, fallen übereinander."
				: it < 100
				? "Frühe Übertreibung: Nachbarn ziehen sich anfangs extra stark an, damit sich grobe Gruppen bilden."
				: perp.get() < 5
				? "Kleine Perplexität: Jeder Punkt beachtet nur ganz wenige Nachbarn, Gruppen zerfallen in Grüppchen."
				: "Die Farben sind die echten Gruppen. t-SNE kannte sie nicht und hat sie trotzdem gefunden.";
	};
	window.whenVisible(canvas, () => {
		if (view === "tsne" && it < 1000) {
			for (let k = 0; k < 3; k++) step();
			draw();
		}
	});
	ML.chips($("v13"), (v) => {
		view = v;
		draw();
	});
	$("rs13").addEventListener("click", () => {
		restart();
		draw();
	});
	$("new13").addEventListener("click", () => {
		seed++;
		gen();
		restart();
		draw();
	});
	p.draw = () => Y && draw();
	gen();
	restart();
	draw();
})();

// =====================================================================
// 14 · LDA als Projektion
// =====================================================================
(() => {
	const p = ML.plot($("c14"), (w) => (w < 500 ? 0.85 : 1.05));
	let pts = [];
	let seed = 71;
	let gAll = null;
	let lda = 0;
	let pca = 0;
	const gen = () => {
		const r = rng(seed);
		const rot = 0.35 + r() * 0.5;
		const nx = -Math.sin(rot) * 0.06;
		const ny = Math.cos(rot) * 0.06;
		pts = [...DATA.gauss(r, 70, [0.5 - nx, 0.5 - ny], [0.2, 0.03], rot, 0), ...DATA.gauss(r, 70, [0.5 + nx, 0.5 + ny], [0.2, 0.03], rot, 1)];
		gAll = ML.gaussFit(pts);
		const g0 = ML.gaussFit(pts.filter((q) => !q.c));
		const g1 = ML.gaussFit(pts.filter((q) => q.c));
		const Sw = g0.S.map((v, i) => v + g1.S[i]);
		const I = ML.inv2(Sw);
		const d = [g1.m[0] - g0.m[0], g1.m[1] - g0.m[1]];
		const w = [I[0] * d[0] + I[1] * d[1], I[2] * d[0] + I[3] * d[1]];
		const deg = (v) => ((((Math.atan2(v[1], v[0]) * 180) / Math.PI) % 180) + 180) % 180;
		lda = Math.round(deg(w));
		pca = Math.round(deg(ML.eig2(gAll.S).v[0]));
	};
	const ang = ML.slider("ang14", (v) => `${v}°`, () => draw());
	const draw = () => {
		const ctx = p.ctx;
		const histH = Math.round(p.size.h * 0.3);
		squareDomain(p, 0.5, 0.5, 1, 0, histH);
		const a = (ang.get() * Math.PI) / 180;
		const u = [Math.cos(a), Math.sin(a)];
		const m = gAll.m;
		p.clear();
		ML.line(ctx, p.X(m[0] - u[0] * 2), p.Y(m[1] - u[1] * 2), p.X(m[0] + u[0] * 2), p.Y(m[1] + u[1] * 2), "rgba(244,239,230,0.7)", 1.6);
		const T = pts.map((q) => (q.x - m[0]) * u[0] + (q.y - m[1]) * u[1]);
		ML.dots(p, pts, { r: 3.2 });
		pts.forEach((q, i) => {
			ctx.beginPath();
			ctx.arc(p.X(m[0] + T[i] * u[0]), p.Y(m[1] + T[i] * u[1]), 2, 0, Math.PI * 2);
			ctx.fillStyle = classColor(q.c, 0.8);
			ctx.fill();
		});
		// Histogramm
		const top = p.size.h - histH;
		ctx.fillStyle = "#0d0b0a";
		ctx.fillRect(0, top, p.size.w, histH);
		ML.line(ctx, 0, top, p.size.w, top, "rgba(255,255,255,0.12)");
		const bins = 36;
		const lo = -0.45;
		const hi = 0.45;
		const counts = [new Array(bins).fill(0), new Array(bins).fill(0)];
		T.forEach((t, i) => {
			const b = Math.floor(((t - lo) / (hi - lo)) * bins);
			if (b >= 0 && b < bins) counts[pts[i].c][b]++;
		});
		const mx = Math.max(...counts[0], ...counts[1], 1);
		const bw = (p.size.w - 20) / bins;
		[0, 1].forEach((c) =>
			counts[c].forEach((v, b) => {
				const hgt = (v / mx) * (histH - 26);
				ctx.fillStyle = classColor(c, 0.5);
				ctx.fillRect(10 + b * bw, p.size.h - 8 - hgt, bw - 1, hgt);
			})
		);
		// Fisher-Kriterium und beste Schwelle
		const stat = (c) => {
			const v = T.filter((_, i) => pts[i].c === c);
			const mean = v.reduce((s, x) => s + x, 0) / v.length;
			return { mean, var: v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length };
		};
		const s0 = stat(0);
		const s1 = stat(1);
		const J = (s1.mean - s0.mean) ** 2 / (s0.var + s1.var);
		const sorted = T.map((t, i) => [t, pts[i].c]).sort((x, y) => x[0] - y[0]);
		let best = 0;
		let left1 = 0;
		const tot1 = pts.filter((q) => q.c).length;
		for (let i = 0; i <= sorted.length; i++) {
			if (i) left1 += sorted[i - 1][1];
			const left0 = i - left1;
			const accA = (left0 + (tot1 - left1)) / pts.length;
			best = Math.max(best, accA, 1 - accA);
		}
		$("r14").innerHTML = `Fisher J ${ML.nf(J, 2)}<br>Trennbar zu ${ML.pct(best)}`;
		const d = (x, y) => Math.min(Math.abs(x - y), 180 - Math.abs(x - y));
		$("n14").textContent =
			d(ang.get(), lda) <= 2
				? "LDA-Richtung: Die Klassen liegen schmal und weit auseinander. Unten überlappen sich die Verteilungen kaum."
				: d(ang.get(), pca) <= 2
				? "PCA-Richtung: Größte Streuung, aber die Klassen landen übereinander. Für die Trennung ist das die schlechteste Wahl."
				: "Unten siehst du, wie die Klassen auf der Linie verteilt sind. Je weniger Überlappung, desto besser trennt die Richtung.";
	};
	let anim = 0;
	const goTo = (target) => {
		cancelAnimationFrame(anim);
		const from = ang.get();
		let to = target;
		if (to - from > 90) to -= 180;
		if (from - to > 90) to += 180;
		const t0 = performance.now();
		const step = (t) => {
			const k = Math.min(1, (t - t0) / 650);
			const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
			ang.set(Math.round((((from + (to - from) * e) % 180) + 180) % 180));
			draw();
			if (k < 1) anim = requestAnimationFrame(step);
		};
		anim = requestAnimationFrame(step);
	};
	$("pca14").addEventListener("click", () => goTo(pca));
	$("lda14").addEventListener("click", () => goTo(lda));
	$("new14").addEventListener("click", () => {
		seed++;
		gen();
		draw();
	});
	p.draw = () => gAll && draw();
	gen();
	draw();
})();

// =====================================================================
// 15 · QDA gegen LDA
// =====================================================================
(() => {
	const p = ML.plot($("c15"), (w) => (w < 500 ? 1.05 : 1.3));
	let pts = [];
	let kind = "wide";
	let cls = 0;
	let ell = true;
	const gen = () => {
		const r = rng(kind.length * 17 + 3);
		if (kind === "same") pts = [...DATA.gauss(r, 60, [0.38, 0.55], [0.12, 0.06], 0.5, 0), ...DATA.gauss(r, 60, [0.64, 0.42], [0.12, 0.06], 0.5, 1)];
		else if (kind === "wide") pts = [...DATA.gauss(r, 60, [0.5, 0.5], [0.06, 0.05], 0, 0), ...DATA.gauss(r, 90, [0.53, 0.5], [0.2, 0.16], 0.3, 1)];
		else pts = [...DATA.gauss(r, 70, [0.5, 0.55], [0.22, 0.04], 0.1, 0), ...DATA.gauss(r, 70, [0.52, 0.45], [0.035, 0.2], 0.1, 1)];
	};
	const draw = () => {
		squareDomain(p);
		const q = M.qda(pts);
		const l = M.lda(pts);
		p.clear();
		ML.region(p, q.predict, 70, 0.85);
		ML.contour(p, l.score, 0, 70, { width: 2, dash: [7, 5], color: "rgba(244,239,230,0.7)" });
		ML.contour(p, q.score, 0, 80, { width: 2.4, color: "#ffffff" });
		if (ell)
			q.g.forEach((g, c) =>
				[1, 2].forEach((k) => covEllipse(p, g.m, q.S[c], k, ML.classColor(c, k === 1 ? 0.95 : 0.55), k === 2 ? [3, 3] : null))
			);
		ML.dots(p, pts, { r: 3.6 });
		const aq = ML.accuracy(q, pts);
		const al = ML.accuracy(l, pts);
		$("r15").innerHTML = `QDA ${ML.pct(aq)}<br>LDA ${ML.pct(al)}`;
		$("n15").textContent =
			kind === "same"
				? "Gleich geformte Glocken: Die QDA-Kurve ist praktisch eine Gerade und liegt fast auf der LDA-Linie."
				: kind === "wide"
				? "Eine Klasse eng, eine weit: QDA legt eine Ellipse um die enge Klasse. LDA kann nur eine Gerade ziehen und scheitert."
				: "Gekreuzte Formen: Die QDA-Grenze wird zur Hyperbel. Eine Gerade trennt hier kaum etwas.";
	};
	ML.chips($("ds15"), (v) => {
		kind = v;
		gen();
		draw();
	});
	ML.chips($("cl15"), (v) => (cls = Number(v)));
	$("sh15").addEventListener("click", (e) => {
		ell = !ell;
		e.currentTarget.setAttribute("aria-pressed", String(ell));
		draw();
	});
	ML.pointer(p, {
		tap(x, y) {
			ML.togglepoint(p, pts, x, y, cls);
			draw();
		},
	});
	p.draw = () => pts.length && draw();
	gen();
	draw();
})();

// =====================================================================
// 16 · KNN-Regression
// =====================================================================
(() => {
	const p = ML.plot($("c16"), (w) => (w < 500 ? 1.15 : 1.6), { xmin: -10, xmax: 375, ymin: -10, ymax: 30 }, { l: 34, r: 10, t: 30, b: 24 });
	let train = [];
	let test = [];
	let seed = 81;
	let weighted = false;
	let hx = null;
	const truth = (d) => 9.5 + 10 * Math.sin((2 * Math.PI * (d - 110)) / 365);
	const gen = () => {
		const r = rng(seed);
		const mk = () => {
			const x = 5 + r() * 355;
			return { x, y: truth(x) + r.n() * 2.6 };
		};
		train = Array.from({ length: 55 }, mk);
		test = Array.from({ length: 90 }, mk);
	};
	const k = ML.slider("k16", (v) => String(v), () => draw());
	const neighbors = (x, kk) =>
		train
			.map((q) => ({ q, d: Math.abs(q.x - x) }))
			.sort((a, b) => a.d - b.d)
			.slice(0, kk);
	const predict = (x, kk) => {
		const nb = neighbors(x, kk);
		let s = 0;
		let ws = 0;
		for (const { q, d } of nb) {
			const w = weighted ? 1 / (d + 1) : 1;
			s += w * q.y;
			ws += w;
		}
		return s / ws;
	};
	const rmse = (pts, kk) => Math.sqrt(pts.reduce((a, q) => a + (q.y - predict(q.x, kk)) ** 2, 0) / pts.length);
	const draw = () => {
		const ctx = p.ctx;
		const kk = Math.min(k.get(), train.length);
		p.clear();
		ctx.font = '11px "Space Grotesk", sans-serif';
		ctx.fillStyle = "rgba(244,239,230,0.35)";
		["Jan", "Apr", "Jul", "Okt"].forEach((mth, i) => {
			ctx.textAlign = "center";
			ctx.fillText(mth, p.X(15 + i * 91), p.size.h - 7);
		});
		[0, 10, 20].forEach((t) => {
			ML.line(ctx, p.X(-10), p.Y(t), p.X(375), p.Y(t), "rgba(255,255,255,0.06)");
			ctx.textAlign = "right";
			ctx.fillText(`${t}°`, 28, p.Y(t) + 4);
		});
		ML.dots(p, test, { color: () => "rgba(94,200,255,0.6)", hollow: true, r: 3 });
		ctx.strokeStyle = "#ff8a3d";
		ctx.lineWidth = 2.4;
		ctx.beginPath();
		for (let x = -10; x <= 375; x += 1) {
			const y = predict(x, kk);
			x > -10 ? ctx.lineTo(p.X(x), p.Y(y)) : ctx.moveTo(p.X(x), p.Y(y));
		}
		ctx.stroke();
		ML.dots(p, train, { color: () => "#ffd9bf", r: 4 });
		if (hx != null) {
			const nb = neighbors(hx, kk);
			const y = predict(hx, kk);
			ML.line(ctx, p.X(hx), p.Y(-10), p.X(hx), p.Y(30), "rgba(255,255,255,0.3)", 1, [3, 3]);
			for (const { q } of nb) {
				ML.line(ctx, p.X(q.x), p.Y(q.y), p.X(hx), p.Y(y), "rgba(255,194,61,0.5)", 1);
				ctx.beginPath();
				ctx.arc(p.X(q.x), p.Y(q.y), 6.5, 0, Math.PI * 2);
				ctx.strokeStyle = "#ffc23d";
				ctx.lineWidth = 1.5;
				ctx.stroke();
			}
			ctx.beginPath();
			ctx.arc(p.X(hx), p.Y(y), 6, 0, Math.PI * 2);
			ctx.fillStyle = "#fff";
			ctx.fill();
			ML.label(p, `${ML.nf(y, 1)} °C`, p.X(hx) + 9, p.Y(y) - 9, { color: "#fff", size: 12 });
		}
		const te = rmse(test, kk);
		let bestK = 1;
		let bestE = Infinity;
		for (let kv = 1; kv <= 40; kv++) {
			const e = rmse(test, kv);
			if (e < bestE) {
				bestE = e;
				bestK = kv;
			}
		}
		$("r16").innerHTML = `Training ±${ML.nf(rmse(train, kk), 1)} °C<br>Test ±${ML.nf(te, 1)} °C`;
		$("n16").textContent =
			kk === 1
				? "k = 1: Die Kurve springt zu jedem einzelnen Messwert, Rauschen inklusive. Der Trainingsfehler ist null, der Testfehler nicht."
				: kk > 30
				? "Großes k: Die Kurve wird flach. Im Sommer und Winter liegt sie deutlich daneben, besonders an den Rändern."
				: `Hier liegt das beste k bei etwa ${bestK} (Testfehler ±${ML.nf(bestE, 1)} °C).`;
	};
	ML.pointer(p, {
		move(x) {
			hx = ML.clamp(x, 0, 365);
			draw();
		},
		tap(x) {
			hx = ML.clamp(x, 0, 365);
			draw();
		},
		leave() {
			hx = null;
			draw();
		},
	});
	$("w16").addEventListener("click", (e) => {
		weighted = !weighted;
		e.currentTarget.setAttribute("aria-pressed", String(weighted));
		draw();
	});
	$("new16").addEventListener("click", () => {
		seed++;
		gen();
		draw();
	});
	p.draw = () => train.length && draw();
	gen();
	draw();
})();

// =====================================================================
// 17 · Neuronales Netz
// =====================================================================
const makeData = (kind, r, n) =>
	kind === "circle"
		? DATA.circle(r, n, 0.025)
		: kind === "xor"
		? DATA.xor(r, n)
		: kind === "moons"
		? DATA.moons(r, n, 0.07)
		: kind === "spiral"
		? DATA.spiral(r, n, 0.012)
		: DATA.blobs(r, n, 0.13, 0.32);

(() => {
	const canvas = $("c17");
	const p = ML.plot(canvas, (w) => (w < 500 ? 1.05 : 1.3));
	const q = ML.plot($("c17b"), (w) => (w < 500 ? 1.8 : 2.4));
	let kind = "circle";
	let pts = [];
	let net = null;
	let running = false;
	let epoch = 0;
	let loss = 0;
	let netSeed = 1;
	const gen = () => {
		pts = makeData(kind, rng(kind.length * 11 + 5), kind === "spiral" ? 260 : 200);
	};
	const hS = ML.slider("h17", (v) => String(v), () => reset());
	const lS = ML.slider("l17", (v) => String(v), () => reset());
	const reset = () => {
		net = new M.MLP([2, ...new Array(lS.get()).fill(hS.get()), 1], netSeed);
		epoch = 0;
		loss = 0;
		draw();
	};
	const draw = () => {
		p.clear();
		ML.region(p, (x, y) => net.predict(x, y), 50);
		ML.dots(p, pts, { r: 3.4 });
		const acc = ML.accuracy(net, pts);
		$("r17").innerHTML = `Epoche ${epoch}<br>Loss ${ML.nf(loss, 3)} · ${ML.pct(acc)}`;
		$("m17").textContent = `2 → ${new Array(lS.get()).fill(hS.get()).join(" → ")} → 1`;
		$("n17").textContent =
			epoch === 0
				? "Zufällige Startgewichte: Das Netz rät noch. Drück auf Trainieren."
				: acc > 0.97
				? "Gelernt! Jedes Neuron der ersten Schicht zieht eine Linie, die weiteren kombinieren sie zur Form."
				: hS.get() * lS.get() <= 2 && (kind === "spiral" || kind === "circle" || kind === "xor")
				? "Zu wenige Neuronen: Mit so wenigen Linien lässt sich diese Form nicht nachbauen."
				: "Das Netz verschiebt bei jedem Schritt alle Gewichte ein wenig gegen den Fehler.";
		// Netzbild
		const ctx = q.ctx;
		const { w, h } = q.size;
		q.clear();
		const sizes = net.sizes;
		const colX = (l) => 30 + (l / (sizes.length - 1)) * (w - 60);
		const nodeY = (l, i) => h / 2 + (i - (sizes[l] - 1) / 2) * Math.min(22, (h - 30) / sizes[l]);
		for (let l = 0; l < net.W.length; l++) {
			const nin = sizes[l];
			for (let o = 0; o < sizes[l + 1]; o++)
				for (let i = 0; i < nin; i++) {
					const wv = net.W[l][o * nin + i];
					ML.line(ctx, colX(l), nodeY(l, i), colX(l + 1), nodeY(l + 1, o), wv > 0 ? `rgba(255,138,61,${Math.min(0.9, Math.abs(wv) / 3)})` : `rgba(94,200,255,${Math.min(0.9, Math.abs(wv) / 3)})`, Math.min(4, 0.4 + Math.abs(wv)));
				}
		}
		sizes.forEach((s, l) => {
			for (let i = 0; i < s; i++) {
				ctx.beginPath();
				ctx.arc(colX(l), nodeY(l, i), 6, 0, Math.PI * 2);
				ctx.fillStyle = l === 0 || l === sizes.length - 1 ? "#f4efe6" : "#2a2622";
				ctx.fill();
				ctx.strokeStyle = "rgba(244,239,230,0.7)";
				ctx.lineWidth = 1;
				ctx.stroke();
			}
		});
		ML.label(q, "x, y", colX(0), h - 6, { align: "center", size: 11 });
		ML.label(q, "Klasse", colX(sizes.length - 1), h - 6, { align: "center", size: 11 });
	};
	window.whenVisible(canvas, () => {
		if (!running) return;
		for (let k = 0; k < 4; k++) loss = net.train(pts, 0.03);
		epoch += 4;
		draw();
	});
	const go = $("go17");
	go.addEventListener("click", () => {
		running = !running;
		go.textContent = running ? "Pause" : "Trainieren";
	});
	$("rs17").addEventListener("click", () => {
		netSeed++;
		reset();
	});
	ML.chips($("ds17"), (v) => {
		kind = v;
		gen();
		reset();
	});
	p.draw = q.draw = () => net && draw();
	gen();
	reset();
})();

// =====================================================================
// 18 · CNN: Faltung, ReLU, Pooling
// =====================================================================
(() => {
	const S = 16;
	const KER = {
		v: [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]],
		h: [[-1, -1, -1], [0, 0, 0], [1, 1, 1]],
		d: [[0, 1, 1], [-1, 0, 1], [-1, -1, 0]],
		blur: [[1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9]],
		sharp: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
	};
	let img = [];
	let ker = KER.v;
	let relu = true;
	let focus = null;
	let scanAt = -1;
	let scanTimer = 0;
	const pin = ML.plot($("c18a"), 1, { xmin: 0, xmax: S, ymin: S, ymax: 0 });
	const pfm = ML.plot($("c18b"), 1, { xmin: 0, xmax: S - 2, ymin: S - 2, ymax: 0 });
	const ppo = ML.plot($("c18c"), 1, { xmin: 0, xmax: 7, ymin: 7, ymax: 0 });
	const blank = () => Array.from({ length: S }, () => new Array(S).fill(0));
	const IMG = {
		square: () => {
			const a = blank();
			for (let i = 4; i < 12; i++) for (let j = 4; j < 12; j++) a[i][j] = i === 4 || i === 11 || j === 4 || j === 11 ? 1 : 0;
			return a;
		},
		cross: () => {
			const a = blank();
			for (let i = 2; i < 14; i++) {
				a[i][7] = a[i][8] = 1;
				a[7][i] = a[8][i] = 1;
			}
			return a;
		},
		seven: () => {
			const a = blank();
			for (let j = 3; j < 13; j++) a[3][j] = a[4][j] = 1;
			for (let i = 5; i < 14; i++) {
				const j = Math.round(12 - (i - 5) * 0.75);
				a[i][j] = a[i][j - 1] = 1;
			}
			return a;
		},
		circle: () => {
			const a = blank();
			for (let i = 0; i < S; i++)
				for (let j = 0; j < S; j++) {
					const d = Math.hypot(i - 7.5, j - 7.5);
					a[i][j] = d > 4.2 && d < 6.2 ? 1 : 0;
				}
			return a;
		},
		clear: blank,
	};
	img = IMG.seven();
	const conv = () => {
		const out = [];
		for (let i = 0; i < S - 2; i++) {
			const row = [];
			for (let j = 0; j < S - 2; j++) {
				let s = 0;
				for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s += img[i + a][j + b] * ker[a][b];
				row.push(s);
			}
			out.push(row);
		}
		return out;
	};
	const cell = (p, i, j, v, scale) => {
		const ctx = p.ctx;
		const x0 = p.X(j);
		const y0 = p.Y(i);
		const cw = p.X(j + 1) - x0;
		const ch = p.Y(i + 1) - y0;
		const t = Math.min(1, Math.abs(v) / scale);
		ctx.fillStyle = v >= 0 ? `rgba(255,${Math.round(138 + 80 * t)},${Math.round(61 + 140 * t)},${t})` : `rgba(94,200,255,${t})`;
		ctx.fillRect(x0 + 0.5, y0 + 0.5, cw - 1, ch - 1);
	};
	const frame = (p, i, j, n, color) => {
		const ctx = p.ctx;
		ctx.strokeStyle = color;
		ctx.lineWidth = 2;
		ctx.strokeRect(p.X(j), p.Y(i), p.X(j + n) - p.X(j), p.Y(i + n) - p.Y(i));
	};
	const draw = () => {
		const fm = conv();
		const show = fm.map((row) => row.map((v) => (relu ? Math.max(0, v) : v)));
		const scale = Math.max(1, ...fm.flat().map(Math.abs));
		const limit = scanAt >= 0 ? scanAt : Infinity;
		pin.clear("#0a0908");
		for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) img[i][j] && cell(pin, i, j, img[i][j], 1);
		pfm.clear("#0a0908");
		show.forEach((row, i) => row.forEach((v, j) => i * (S - 2) + j <= limit && cell(pfm, i, j, v, scale)));
		ppo.clear("#0a0908");
		if (scanAt < 0)
			for (let i = 0; i < 7; i++)
				for (let j = 0; j < 7; j++) {
					const v = Math.max(show[2 * i][2 * j], show[2 * i + 1][2 * j], show[2 * i][2 * j + 1], show[2 * i + 1][2 * j + 1]);
					cell(ppo, i, j, v, scale);
				}
		const f = scanAt >= 0 ? [Math.floor(scanAt / (S - 2)), scanAt % (S - 2)] : focus;
		if (f) {
			frame(pin, f[0], f[1], 3, "#fff");
			frame(pfm, f[0], f[1], 1, "#fff");
			if (scanAt < 0) frame(ppo, f[0] >> 1, f[1] >> 1, 1, "rgba(255,255,255,0.7)");
			const terms = [];
			for (let a = 0; a < 3; a++)
				for (let b = 0; b < 3; b++)
					if (img[f[0] + a][f[1] + b] && ker[a][b]) terms.push(ML.nf(ker[a][b], Math.abs(ker[a][b]) < 1 ? 2 : 0));
			const v = fm[f[0]][f[1]];
			$("n18").textContent = `Fenster an Zeile ${f[0] + 1}, Spalte ${f[1] + 1}: Summe der Gewichte unter hellen Pixeln = ${terms.length ? terms.join(" + ").replace(/\+ -/g, "− ") : "0"} = ${ML.nf(v, 2)}${relu && v < 0 ? " → ReLU macht daraus 0" : ""}.`;
		} else {
			$("n18").textContent = "Orange heißt: Das Muster des Filters passt hier. Blau (ohne ReLU) heißt: Das Gegenteil passt.";
		}
		$("k18").innerHTML = ker
			.flat()
			.map((v) => {
				const t = Math.min(1, Math.abs(v) / 2);
				const bg = v > 0 ? `rgba(255,138,61,${0.15 + t * 0.6})` : v < 0 ? `rgba(94,200,255,${0.15 + t * 0.6})` : "rgba(255,255,255,0.05)";
				return `<span style="background:${bg}">${Math.abs(v) < 1 && v ? "1/9" : v}</span>`;
			})
			.join("");
	};
	let paintVal = 1;
	const paintAt = (x, y) => {
		const i = Math.floor(y);
		const j = Math.floor(x);
		if (i < 0 || j < 0 || i >= S || j >= S) return;
		img[i][j] = paintVal;
		draw();
	};
	ML.pointer(pin, {
		drag(x, y, ev, first) {
			if (first) {
				const i = Math.floor(y);
				const j = Math.floor(x);
				paintVal = img[i] && img[i][j] ? 0 : 1;
			}
			paintAt(x, y);
		},
	});
	const hoverFm = (x, y) => {
		const i = Math.floor(y);
		const j = Math.floor(x);
		focus = i >= 0 && j >= 0 && i < S - 2 && j < S - 2 ? [i, j] : null;
		draw();
	};
	ML.pointer(pfm, { move: hoverFm, tap: hoverFm, leave: () => ((focus = null), draw()) });
	ML.chips($("f18"), (v) => {
		ker = KER[v];
		$("fm18").textContent = "Merkmalskarte 14×14";
		draw();
	});
	document.querySelectorAll("#i18 [data-img]").forEach((b) =>
		b.addEventListener("click", () => {
			img = IMG[b.dataset.img]();
			draw();
		})
	);
	$("relu18").addEventListener("click", (e) => {
		relu = !relu;
		e.currentTarget.setAttribute("aria-pressed", String(relu));
		draw();
	});
	$("scan18").addEventListener("click", () => {
		clearInterval(scanTimer);
		scanAt = 0;
		scanTimer = setInterval(() => {
			scanAt++;
			if (scanAt >= (S - 2) * (S - 2)) {
				clearInterval(scanTimer);
				scanAt = -1;
			}
			draw();
		}, 28);
	});
	pin.draw = pfm.draw = ppo.draw = () => draw();
	draw();
})();

// =====================================================================
// 19 · RNN und LSTM: Gedächtnis über die Zeit
// =====================================================================
(() => {
	const T = 14;
	const p = ML.plot($("c19"), (w) => (w < 500 ? 1.5 : 2.3));
	const q = ML.plot($("c19b"), (w) => (w < 500 ? 2.2 : 3));
	let xs = new Array(T).fill(0);
	xs[0] = 1;
	const w = ML.slider("w19", (v) => ML.nf(v, 2), () => draw());
	const f = ML.slider("f19", (v) => ML.nf(v, 2), () => draw());
	const geom = () => {
		const left = 64;
		const cw = (p.size.w - left - 10) / T;
		const rh = (p.size.h - 34) / 3;
		return { left, cw, rh };
	};
	const draw = () => {
		const ctx = p.ctx;
		const { left, cw, rh } = geom();
		p.clear();
		const h = [];
		const c = [];
		let hv = 0;
		let cv = 0;
		for (let t = 0; t < T; t++) {
			hv = Math.tanh(w.get() * hv + xs[t]);
			cv = f.get() * cv + 0.76 * xs[t];
			h.push(hv);
			c.push(cv);
		}
		const rows = [
			["Eingang x", xs, 1],
			["RNN h", h, 1],
			["LSTM c", c, 1],
		];
		rows.forEach(([name, vals], r) => {
			const y = 28 + r * rh;
			ML.label(p, name, 6, y + rh / 2 + 4, { size: 11, color: "rgba(244,239,230,0.6)" });
			vals.forEach((v, t) => {
				const x = left + t * cw;
				const s = Math.min(1, Math.abs(v));
				ctx.fillStyle = r === 0 ? (v ? "#ffc23d" : "#1b1815") : v >= 0 ? `rgba(255,138,61,${0.08 + s * 0.85})` : `rgba(94,200,255,${0.08 + s * 0.85})`;
				ctx.fillRect(x + 2, y + 4, cw - 4, rh - 8);
				ctx.strokeStyle = "rgba(255,255,255,0.12)";
				ctx.strokeRect(x + 2, y + 4, cw - 4, rh - 8);
				if (cw > 26 && r > 0) ML.label(p, ML.nf(v, 2), x + cw / 2, y + rh / 2 + 4, { align: "center", size: 10, color: s > 0.5 ? "#1f0d02" : "#f4efe6" });
				if (t && r > 0) ML.line(ctx, x - 2, y + rh / 2, x + 2, y + rh / 2, "rgba(255,255,255,0.5)", 1.5);
			});
		});
		// Verlauf des ersten Signals
		const N = 30;
		const rnn = [];
		const lstm = [];
		for (let t = 0; t <= N; t++) {
			rnn.push(w.get() ** t);
			lstm.push(f.get() ** t);
		}
		lineChart(
			q,
			[
				{ v: rnn.map((v) => Math.min(v, 1.6)), color: "#ff8a3d", label: "RNN: wᵗ" },
				{ v: lstm, color: "#7bdc9a", label: "LSTM: fᵗ" },
			],
			rnn.map((_, i) => i),
			{ max: 1.6, mark: T - 1 }
		);
		const rv = w.get() ** (T - 1);
		const lv = f.get() ** (T - 1);
		const after = `Nach ${T - 1} Schritten: RNN ${rv > 1.6 ? "explodiert" : ML.pct(rv)}, LSTM ${ML.pct(lv)}. `;
		$("n19").textContent =
			after +
			(w.get() > 1.02
				? "w > 1: Das Signal wächst mit jedem Schritt. Beim Training explodieren die Gradienten, das Lernen wird instabil."
				: w.get() < 0.9
				? `Beim RNN schmilzt das erste Signal mit jedem Schritt um den Faktor ${ML.nf(w.get(), 2)}. Das LSTM-Tor lässt es fast ungedämpft durch.`
				: "Nahe w = 1 hält sich das Signal länger, aber genau diesen Wert stabil zu lernen ist schwer. Das LSTM regelt es mit seinem Tor.");
	};
	ML.pointer(p, {
		tap(x, y, ev) {
			const r = p.canvas.getBoundingClientRect();
			const px = ev.clientX - r.left;
			const py = ev.clientY - r.top;
			const { left, cw, rh } = geom();
			const t = Math.floor((px - left) / cw);
			if (t >= 0 && t < T && py > 28 && py < 28 + rh) {
				xs[t] = xs[t] ? 0 : 1;
				draw();
			}
		},
	});
	$("cl19").addEventListener("click", () => {
		xs = new Array(T).fill(0);
		xs[0] = 1;
		draw();
	});
	p.draw = q.draw = () => draw();
	draw();
})();

// =====================================================================
// 20 · Q-Learning in einer Gitterwelt
// =====================================================================
(() => {
	const W = 7;
	const H = 5;
	const p = ML.plot($("c20"), W / H);
	const LAYOUT = ["......G", ".#.X...", ".#.X.#.", ".....#.", "S.X...."];
	let grid = LAYOUT.map((r) => r.split(""));
	const DIRS = [
		[0, -1],
		[1, 0],
		[0, 1],
		[-1, 0],
	];
	let Q = new Float64Array(W * H * 4);
	let episodes = 0;
	let last = null;
	let agent = null;
	let trail = [];
	let path = null;
	let timer = 0;
	const start = () => {
		for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y][x] === "S") return [x, y];
		return [0, H - 1];
	};
	const eps = ML.slider("e20", (v) => ML.nf(v, 2), () => {});
	const gam = ML.slider("g20", (v) => ML.nf(v, 2), () => {});
	const alp = ML.slider("a20s", (v) => ML.nf(v, 2), () => {});
	const idx = (x, y) => (y * W + x) * 4;
	const maxQ = (x, y) => Math.max(...Q.subarray(idx(x, y), idx(x, y) + 4));
	const greedy = (x, y) => {
		const qs = [...Q.subarray(idx(x, y), idx(x, y) + 4)];
		const m = Math.max(...qs);
		const best = qs.map((v, i) => (v === m ? i : -1)).filter((i) => i >= 0);
		return best[Math.floor(Math.random() * best.length)];
	};
	const move = (x, y, a) => {
		const nx = x + DIRS[a][0];
		const ny = y + DIRS[a][1];
		if (nx < 0 || ny < 0 || nx >= W || ny >= H || grid[ny][nx] === "#") return [x, y];
		return [nx, ny];
	};
	const act = (s) => {
		const a = Math.random() < eps.get() ? Math.floor(Math.random() * 4) : greedy(s[0], s[1]);
		const n = move(s[0], s[1], a);
		const cellv = grid[n[1]][n[0]];
		const r = cellv === "G" ? 10 : cellv === "X" ? -10 : -0.1;
		const term = cellv === "G" || cellv === "X";
		const k = idx(s[0], s[1]) + a;
		const target = r + (term ? 0 : gam.get() * maxQ(n[0], n[1]));
		Q[k] += alp.get() * (target - Q[k]);
		return { n, r, term };
	};
	const runFast = (count) => {
		for (let e = 0; e < count; e++) {
			let s = start();
			let ret = 0;
			let steps = 0;
			for (; steps < 200; steps++) {
				const o = act(s);
				ret += o.r;
				s = o.n;
				if (o.term) break;
			}
			last = { ret, steps: steps + 1 };
			episodes++;
		}
	};
	const draw = () => {
		const ctx = p.ctx;
		const cw = p.size.w / W;
		const ch = p.size.h / H;
		p.clear();
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				const c = grid[y][x];
				const x0 = x * cw;
				const y0 = y * ch;
				const cx = x0 + cw / 2;
				const cy = y0 + ch / 2;
				if (c === "#") {
					ctx.fillStyle = "#2a2622";
					ctx.fillRect(x0 + 1, y0 + 1, cw - 2, ch - 2);
					continue;
				}
				if (c === "G" || c === "X") {
					ctx.fillStyle = c === "G" ? "rgba(123,220,154,0.35)" : "rgba(255,93,93,0.3)";
					ctx.fillRect(x0 + 1, y0 + 1, cw - 2, ch - 2);
					ML.label(p, c === "G" ? "+10" : "−10", cx, cy + 6, { align: "center", size: Math.min(18, cw / 3), weight: 600, color: c === "G" ? "#7bdc9a" : "#ff8a7a" });
					continue;
				}
				const corners = [
					[x0, y0, x0 + cw, y0],
					[x0 + cw, y0, x0 + cw, y0 + ch],
					[x0 + cw, y0 + ch, x0, y0 + ch],
					[x0, y0 + ch, x0, y0],
				];
				for (let a = 0; a < 4; a++) {
					const v = Q[idx(x, y) + a];
					const t = Math.min(1, Math.abs(v) / 10);
					ctx.fillStyle = v >= 0 ? `rgba(255,138,61,${t * 0.85})` : `rgba(94,200,255,${t * 0.85})`;
					ctx.beginPath();
					ctx.moveTo(cx, cy);
					ctx.lineTo(corners[a][0], corners[a][1]);
					ctx.lineTo(corners[a][2], corners[a][3]);
					ctx.closePath();
					ctx.fill();
				}
				ctx.strokeStyle = "rgba(255,255,255,0.08)";
				ctx.strokeRect(x0, y0, cw, ch);
				const qs = [...Q.subarray(idx(x, y), idx(x, y) + 4)];
				if (qs.some((v) => v !== 0)) {
					const a = qs.indexOf(Math.max(...qs));
					const L = Math.min(cw, ch) * 0.28;
					const ex = cx + DIRS[a][0] * L;
					const ey = cy + DIRS[a][1] * L;
					ML.line(ctx, cx - DIRS[a][0] * L * 0.4, cy - DIRS[a][1] * L * 0.4, ex, ey, "#f4efe6", 2);
					ctx.beginPath();
					ctx.moveTo(ex + DIRS[a][0] * 5, ey + DIRS[a][1] * 5);
					ctx.lineTo(ex - DIRS[a][1] * 5, ey + DIRS[a][0] * 5);
					ctx.lineTo(ex + DIRS[a][1] * 5, ey - DIRS[a][0] * 5);
					ctx.fillStyle = "#f4efe6";
					ctx.fill();
				}
				if (c === "S") ML.label(p, "Start", x0 + 5, y0 + 14, { size: 11, color: "#ffc23d", weight: 600 });
			}
		const drawPath = (pp, color) => {
			if (!pp || pp.length < 2) return;
			ctx.save();
			ctx.strokeStyle = color;
			ctx.lineWidth = 3;
			ctx.lineJoin = "round";
			ctx.beginPath();
			pp.forEach(([x, y], i) => (i ? ctx.lineTo((x + 0.5) * cw, (y + 0.5) * ch) : ctx.moveTo((x + 0.5) * cw, (y + 0.5) * ch)));
			ctx.stroke();
			ctx.restore();
		};
		drawPath(trail, "rgba(255,194,61,0.55)");
		drawPath(path, "#7bdc9a");
		if (agent) {
			ctx.beginPath();
			ctx.arc((agent[0] + 0.5) * cw, (agent[1] + 0.5) * ch, Math.min(cw, ch) * 0.2, 0, Math.PI * 2);
			ctx.fillStyle = "#ffc23d";
			ctx.fill();
			ctx.strokeStyle = "#1f0d02";
			ctx.lineWidth = 2;
			ctx.stroke();
		}
		$("r20").innerHTML = `${episodes} Episoden${last ? `<br>zuletzt ${last.steps} Schritte, ${ML.nf(last.ret, 1)} Punkte` : ""}`;
	};
	const note = (t) => ($("n20").textContent = t);
	$("ep20").addEventListener("click", () => {
		clearInterval(timer);
		path = null;
		let s = start();
		agent = s;
		trail = [s];
		let ret = 0;
		let steps = 0;
		timer = setInterval(() => {
			const o = act(s);
			ret += o.r;
			steps++;
			s = o.n;
			agent = s;
			trail.push(s);
			if (o.term || steps >= 120) {
				clearInterval(timer);
				episodes++;
				last = { ret, steps };
				agent = null;
				note(
					grid[s[1]][s[0]] === "G"
						? "Ziel erreicht! Der Wert +10 sickert jetzt ein Feld weiter zurück. Mit jeder Episode wird die Spur länger."
						: grid[s[1]][s[0]] === "X"
						? "In die Falle getappt. Der Agent merkt sich: Diese Richtung von diesem Feld ist schlecht (blau)."
						: "Nach 120 Schritten abgebrochen. Am Anfang irrt der Agent zufällig umher."
				);
			}
			draw();
		}, 80);
	});
	$("ep20x").addEventListener("click", () => {
		clearInterval(timer);
		agent = null;
		trail = [];
		runFast(200);
		note("200 Episoden später: Die Pfeile zeigen in jedem Feld die beste bekannte Richtung. Orange heißt: Von hier lohnt es sich.");
		draw();
	});
	$("gr20").addEventListener("click", () => {
		clearInterval(timer);
		agent = null;
		trail = [];
		let s = start();
		path = [s];
		const seen = new Set([s.join()]);
		for (let k = 0; k < 40; k++) {
			const qs = [...Q.subarray(idx(s[0], s[1]), idx(s[0], s[1]) + 4)];
			s = move(s[0], s[1], qs.indexOf(Math.max(...qs)));
			path.push(s);
			const c = grid[s[1]][s[0]];
			if (c === "G" || c === "X" || seen.has(s.join())) break;
			seen.add(s.join());
		}
		const end = grid[s[1]][s[0]];
		note(
			end === "G"
				? `Der gelernte Weg führt in ${path.length - 1} Schritten ins Ziel und umgeht die Fallen.`
				: "Noch kein vollständiger Weg: Der Agent braucht mehr Episoden, oder ε ist zu klein, um das Ziel überhaupt zu finden."
		);
		draw();
	});
	$("rs20").addEventListener("click", () => {
		clearInterval(timer);
		Q = new Float64Array(W * H * 4);
		episodes = 0;
		last = null;
		agent = null;
		trail = [];
		path = null;
		note("Alles vergessen. Die Q-Tabelle ist wieder leer.");
		draw();
	});
	ML.pointer(p, {
		tap(x, y, ev) {
			const r = p.canvas.getBoundingClientRect();
			const cx = Math.floor(((ev.clientX - r.left) / r.width) * W);
			const cy = Math.floor(((ev.clientY - r.top) / r.height) * H);
			const c = grid[cy]?.[cx];
			if (!c || c === "S" || c === "G") return;
			grid[cy][cx] = c === "." ? "#" : c === "#" ? "X" : ".";
			Q.fill(0, idx(cx, cy), idx(cx, cy) + 4);
			path = null;
			note(grid[cy][cx] === "#" ? "Mauer gebaut. Lass den Agenten neu lernen." : grid[cy][cx] === "X" ? "Falle gebaut (−10)." : "Feld frei.");
			draw();
		},
	});
	p.draw = () => draw();
	note("Am Anfang ist die Q-Tabelle leer, der Agent weiß nichts über die Welt.");
	draw();
})();

// =====================================================================
// Arena: zehn Klassifizierer auf denselben Daten
// =====================================================================
(() => {
	const ALGS = [
		["knn", "KNN", (d) => M.knn(d, 7)],
		["log", "Logistisch", (d) => M.logistic(d)],
		["nb", "Naive Bayes", (d) => M.nb(d)],
		["tree", "Baum", (d) => M.tree(d, 6, 2)],
		["forest", "Random Forest", (d) => M.forest(d, 40, 10)],
		["boost", "Boosting", (d) => M.boost(d, 60, 0.3, 3)],
		["svm", "SVM (RBF)", (d) => M.svm(d, { C: 3, kernel: "rbf", gamma: 15 })],
		["lda", "LDA", (d) => M.lda(d)],
		["qda", "QDA", (d) => M.qda(d)],
		["mlp", "Neuronales Netz", (d) => M.mlp(d, [10, 10], 500, 3)],
	];
	const p = ML.plot($("cA"), (w) => (w < 500 ? 1.05 : 1.2));
	const box = $("alA");
	box.innerHTML = ALGS.map(([id, name], i) => `<button class="btn" type="button" data-v="${id}" aria-pressed="${i === 4}">${name}</button>`).join("");
	let kind = "moons";
	let alg = "forest";
	let train = [];
	let test = [];
	let model = null;
	let ms = 0;
	const gen = () => {
		const r = rng(kind.length * 23 + 9);
		const n = kind === "spiral" ? 240 : 200;
		const noisy = (pts) => pts.map((q) => (r() < 0.04 ? { ...q, c: 1 - q.c } : q));
		train = noisy(makeData(kind, r, n));
		test = makeData(kind, r, n).map((q) => ({ ...q, test: true }));
		$("rkA").innerHTML = "";
	};
	const fit = (id) => {
		const t0 = performance.now();
		const m = ALGS.find((a) => a[0] === id)[2](train);
		return { m, ms: performance.now() - t0 };
	};
	const train1 = () => {
		const o = fit(alg);
		model = o.m;
		ms = o.ms;
		draw();
	};
	const draw = () => {
		p.clear();
		ML.region(p, (x, y) => model.predict(x, y), 70);
		ML.dots(p, test, { r: 2.6 });
		ML.dots(p, train, { r: 3.4 });
		$("mA").textContent = ALGS.find((a) => a[0] === alg)[1];
		$("rA").innerHTML = `Test ${ML.pct(ML.accuracy(model, test))}<br>Training ${ML.pct(ML.accuracy(model, train))} · ${ML.nf(ms, 0)} ms`;
	};
	ML.chips($("dsA"), (v) => {
		kind = v;
		gen();
		train1();
	});
	ML.chips(box, (v) => {
		alg = v;
		train1();
	});
	$("allA").addEventListener("click", () => {
		const btn = $("allA");
		btn.disabled = true;
		btn.textContent = "Rechne …";
		setTimeout(() => {
			const res = ALGS.map(([id, name]) => {
				const o = fit(id);
				return { name, acc: ML.accuracy(o.m, test), ms: o.ms };
			}).sort((a, b) => b.acc - a.acc);
			$("rkA").innerHTML = res
				.map(
					(r) =>
						`<div class="row"><span>${r.name}</span><div class="track"><div class="fill" style="width:${Math.max(0, (r.acc - 0.4) / 0.6) * 100}%"></div></div><output>${ML.pct(r.acc)}</output><small>${ML.nf(r.ms, 0)} ms</small></div>`
				)
				.join("");
			btn.disabled = false;
			btn.textContent = "Alle vergleichen";
		}, 30);
	});
	p.draw = () => model && draw();
	gen();
	train1();
})();
