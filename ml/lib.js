"use strict";

// Gemeinsame Bausteine für „20 ML-Algorithmen“: Zufall, Datensätze, Modelle, Zeichnen, Zeiger.

const ML = (() => {
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const nf = (v, d = 0) =>
		v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
	const sigmoid = (z) => 1 / (1 + Math.exp(-z));
	const lerp = (a, b, t) => a + (b - a) * t;

	// Farben: Klasse A orange, Klasse B hellblau, weitere Gruppen aus der Palette
	const A = [255, 138, 61];
	const B = [94, 200, 255];
	const PAL = ["#ff8a3d", "#5ec8ff", "#a3e05a", "#ff6fb5", "#ffd23d", "#b48cff", "#4fe0c0", "#ff5d5d"];
	const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
	const classColor = (c, a = 1) => rgb(c ? B : A, a);

	// ---------- Zufall mit Startwert ----------
	function rng(seed = 1) {
		let s = seed >>> 0;
		const r = () => {
			s = (s + 0x6d2b79f5) >>> 0;
			let t = s;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
		r.n = () => {
			const u = 1 - r();
			return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
		};
		r.int = (n) => Math.floor(r() * n);
		return r;
	}

	// ---------- Datensätze im Einheitsquadrat, Punkte {x, y, c} ----------
	const inBox = (p) => p.x > 0.02 && p.x < 0.98 && p.y > 0.02 && p.y < 0.98;
	const DATA = {
		blobs(r, n, sd = 0.11, gap = 0.36) {
			const pts = [];
			while (pts.length < n) {
				const c = pts.length % 2;
				const p = { x: 0.5 + (c ? gap / 2 : -gap / 2) + r.n() * sd, y: 0.5 + (c ? -gap / 4 : gap / 4) + r.n() * sd, c };
				if (inBox(p)) pts.push(p);
			}
			return pts;
		},
		moons(r, n, noise = 0.06) {
			const pts = [];
			for (let i = 0; i < n; i++) {
				const c = i % 2;
				const t = r() * Math.PI;
				const x = c ? 1 - Math.cos(t) : Math.cos(t);
				const y = c ? 0.5 - Math.sin(t) : Math.sin(t);
				pts.push({ x: clamp(0.5 + (x - 0.5) * 0.3 + r.n() * noise, 0.02, 0.98), y: clamp(0.5 + (y - 0.25) * 0.42 + r.n() * noise, 0.02, 0.98), c });
			}
			return pts;
		},
		circle(r, n, noise = 0.03) {
			const pts = [];
			for (let i = 0; i < n; i++) {
				const c = i % 2;
				const rad = c ? r() * 0.17 : 0.27 + r() * 0.14;
				const a = r() * Math.PI * 2;
				pts.push({ x: 0.5 + Math.cos(a) * rad + r.n() * noise, y: 0.5 + Math.sin(a) * rad + r.n() * noise, c });
			}
			return pts;
		},
		xor(r, n, noise = 0.0) {
			const pts = [];
			for (let i = 0; i < n; i++) {
				const x = 0.06 + r() * 0.88;
				const y = 0.06 + r() * 0.88;
				if (Math.abs(x - 0.5) < 0.03 || Math.abs(y - 0.5) < 0.03) {
					i--;
					continue;
				}
				let c = (x > 0.5) !== (y > 0.5) ? 1 : 0;
				if (r() < noise) c = 1 - c;
				pts.push({ x, y, c });
			}
			return pts;
		},
		spiral(r, n, noise = 0.012) {
			const pts = [];
			for (let i = 0; i < n; i++) {
				const c = i % 2;
				const t = 0.25 + r() * 2.6;
				const a = t * 3.2 + c * Math.PI;
				const rad = t * 0.15;
				pts.push({ x: 0.5 + Math.cos(a) * rad + r.n() * noise, y: 0.5 + Math.sin(a) * rad + r.n() * noise, c });
			}
			return pts;
		},
		// Gauß-Wolke mit eigener Form: m = [mx, my], sd = [sx, sy], rot = Winkel
		gauss(r, n, m, sd, rot, c) {
			const pts = [];
			const co = Math.cos(rot);
			const si = Math.sin(rot);
			while (pts.length < n) {
				const u = r.n() * sd[0];
				const v = r.n() * sd[1];
				const p = { x: m[0] + u * co - v * si, y: m[1] + u * si + v * co, c };
				if (inBox(p)) pts.push(p);
			}
			return pts;
		},
	};

	// ---------- Plot: Datenraum ↔ Pixel ----------
	function plot(canvas, aspect, domain = {}, pad = 0) {
		const p = { xmin: 0, xmax: 1, ymin: 0, ymax: 1, pad, ...domain, draw: null };
		const f = window.fitCanvas(canvas, aspect, () => p.draw && p.draw());
		p.canvas = canvas;
		p.ctx = f.ctx;
		p.size = f.size;
		const padX = () => (typeof p.pad === "object" ? p.pad : { l: p.pad, r: p.pad, t: p.pad, b: p.pad });
		p.X = (x) => {
			const q = padX();
			return q.l + ((x - p.xmin) / (p.xmax - p.xmin)) * (p.size.w - q.l - q.r);
		};
		p.Y = (y) => {
			const q = padX();
			return p.size.h - q.b - ((y - p.ymin) / (p.ymax - p.ymin)) * (p.size.h - q.t - q.b);
		};
		p.ix = (px) => {
			const q = padX();
			return p.xmin + ((px - q.l) / (p.size.w - q.l - q.r)) * (p.xmax - p.xmin);
		};
		p.iy = (py) => {
			const q = padX();
			return p.ymin + ((p.size.h - q.b - py) / (p.size.h - q.t - q.b)) * (p.ymax - p.ymin);
		};
		p.clear = function (bg = "#070605") {
			this.ctx.fillStyle = bg;
			this.ctx.fillRect(0, 0, this.size.w, this.size.h);
		};
		return p;
	}

	// Zwischenspeicher für teure Hintergründe: L.dirty = true erzwingt Neuzeichnen
	function layer(p) {
		const c = document.createElement("canvas");
		const L = Object.create(p);
		L.ctx = c.getContext("2d");
		L.dirty = true;
		L.render = (fn) => {
			if (!(p.size.w > 0 && p.size.h > 0)) return;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const w = Math.round(p.size.w * dpr);
			const h = Math.round(p.size.h * dpr);
			if (L.dirty || c.width !== w || c.height !== h) {
				c.width = w;
				c.height = h;
				L.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
				fn(L);
				L.dirty = false;
			}
			p.ctx.drawImage(c, 0, 0, p.size.w, p.size.h);
		};
		return L;
	}

	// Zeiger in Datenkoordinaten. handlers: tap(x, y, ev), move(x, y, ev), leave(), drag(x, y, ev)
	function pointer(p, h) {
		const c = p.canvas;
		let down = null;
		const at = (ev) => {
			const r = c.getBoundingClientRect();
			const px = ev.clientX - r.left;
			const py = ev.clientY - r.top;
			return { x: p.ix(px), y: p.iy(py), px, py };
		};
		c.addEventListener("pointerdown", (ev) => {
			down = { ...at(ev), moved: false };
			if (h.drag) {
				c.setPointerCapture(ev.pointerId);
				h.drag(down.x, down.y, ev, true);
			}
		});
		c.addEventListener("pointermove", (ev) => {
			const q = at(ev);
			if (down && Math.hypot(q.px - down.px, q.py - down.py) > 6) down.moved = true;
			if (down && h.drag) h.drag(q.x, q.y, ev, false);
			else if (h.move && ev.pointerType === "mouse") h.move(q.x, q.y, ev);
		});
		c.addEventListener("pointerup", (ev) => {
			const q = at(ev);
			if (down && !down.moved && h.tap) h.tap(q.x, q.y, ev);
			if (down && h.end) h.end();
			down = null;
		});
		c.addEventListener("pointercancel", () => (down = null));
		c.addEventListener("pointerleave", () => h.leave && h.leave());
	}

	// Punkt hinzufügen oder (bei Treffer) entfernen
	function togglepoint(p, pts, x, y, c) {
		const hit = pts.findIndex((q) => Math.hypot(p.X(q.x) - p.X(x), p.Y(q.y) - p.Y(y)) < 9);
		if (hit >= 0) pts.splice(hit, 1);
		else if (x > 0 && x < 1 && y > 0 && y < 1) pts.push({ x, y, c });
	}

	// ---------- Zeichnen ----------
	function dots(p, pts, opt = {}) {
		const ctx = p.ctx;
		const r = opt.r ?? 4.5;
		for (const q of pts) {
			const col = opt.color ? opt.color(q) : classColor(q.c);
			ctx.beginPath();
			ctx.arc(p.X(q.x), p.Y(q.y), r, 0, Math.PI * 2);
			if (opt.hollow || q.test) {
				ctx.strokeStyle = col;
				ctx.lineWidth = 1.6;
				ctx.stroke();
			} else {
				ctx.fillStyle = col;
				ctx.fill();
				ctx.strokeStyle = "rgba(0,0,0,0.55)";
				ctx.lineWidth = 1;
				ctx.stroke();
			}
		}
	}

	// Entscheidungsgebiete: fn(x, y) liefert die Wahrscheinlichkeit für Klasse B
	const off = document.createElement("canvas");
	function region(p, fn, res = 72, strength = 1) {
		if (!(p.size.w > 0 && p.size.h > 0)) return;
		const nx = res;
		const ny = Math.max(8, Math.round((res * p.size.h) / p.size.w));
		off.width = nx;
		off.height = ny;
		const octx = off.getContext("2d");
		const img = octx.createImageData(nx, ny);
		for (let j = 0; j < ny; j++) {
			for (let i = 0; i < nx; i++) {
				const x = p.ix(((i + 0.5) / nx) * p.size.w);
				const y = p.iy(((j + 0.5) / ny) * p.size.h);
				const v = clamp(fn(x, y), 0, 1);
				const conf = Math.abs(v - 0.5) * 2;
				const k = (j * nx + i) * 4;
				img.data[k] = lerp(A[0], B[0], v);
				img.data[k + 1] = lerp(A[1], B[1], v);
				img.data[k + 2] = lerp(A[2], B[2], v);
				img.data[k + 3] = (0.1 + conf * 0.32) * 255 * strength;
			}
		}
		octx.putImageData(img, 0, 0);
		p.ctx.imageSmoothingEnabled = true;
		p.ctx.drawImage(off, 0, 0, p.size.w, p.size.h);
	}

	// Gebiete für mehrere Gruppen: fn(x, y) liefert den Index in PAL
	const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
	function regionMulti(p, fn, res = 72, alpha = 0.15) {
		if (!(p.size.w > 0 && p.size.h > 0)) return;
		const nx = res;
		const ny = Math.max(8, Math.round((res * p.size.h) / p.size.w));
		off.width = nx;
		off.height = ny;
		const octx = off.getContext("2d");
		const img = octx.createImageData(nx, ny);
		for (let j = 0; j < ny; j++)
			for (let i = 0; i < nx; i++) {
				const c = hex(PAL[fn(p.ix(((i + 0.5) / nx) * p.size.w), p.iy(((j + 0.5) / ny) * p.size.h)) % PAL.length]);
				const k = (j * nx + i) * 4;
				img.data[k] = c[0];
				img.data[k + 1] = c[1];
				img.data[k + 2] = c[2];
				img.data[k + 3] = alpha * 255;
			}
		octx.putImageData(img, 0, 0);
		p.ctx.imageSmoothingEnabled = false;
		p.ctx.drawImage(off, 0, 0, p.size.w, p.size.h);
		p.ctx.imageSmoothingEnabled = true;
	}

	// Höhenlinie fn(x, y) = level per Marching Squares
	function contour(p, fn, level = 0, res = 60, style = {}) {
		if (!(p.size.w > 0 && p.size.h > 0)) return;
		const nx = res;
		const ny = Math.max(8, Math.round((res * p.size.h) / p.size.w));
		const gx = (i) => p.ix((i / nx) * p.size.w);
		const gy = (j) => p.iy((j / ny) * p.size.h);
		const v = [];
		for (let j = 0; j <= ny; j++) {
			const row = [];
			for (let i = 0; i <= nx; i++) row.push(fn(gx(i), gy(j)) - level);
			v.push(row);
		}
		const ctx = p.ctx;
		ctx.save();
		ctx.strokeStyle = style.color || "rgba(255,255,255,0.9)";
		ctx.lineWidth = style.width || 2;
		if (style.dash) ctx.setLineDash(style.dash);
		ctx.beginPath();
		const sx = p.size.w / nx;
		const sy = p.size.h / ny;
		const cross = (a, b) => a / (a - b);
		for (let j = 0; j < ny; j++) {
			for (let i = 0; i < nx; i++) {
				const a = v[j][i];
				const b = v[j][i + 1];
				const c = v[j + 1][i + 1];
				const d = v[j + 1][i];
				const pts = [];
				if (a > 0 !== b > 0) pts.push([(i + cross(a, b)) * sx, j * sy]);
				if (b > 0 !== c > 0) pts.push([(i + 1) * sx, (j + cross(b, c)) * sy]);
				if (d > 0 !== c > 0) pts.push([(i + cross(d, c)) * sx, (j + 1) * sy]);
				if (a > 0 !== d > 0) pts.push([i * sx, (j + cross(a, d)) * sy]);
				for (let k = 0; k + 1 < pts.length; k += 2) {
					ctx.moveTo(pts[k][0], pts[k][1]);
					ctx.lineTo(pts[k + 1][0], pts[k + 1][1]);
				}
			}
		}
		ctx.stroke();
		ctx.restore();
	}

	function label(p, text, x, y, opt = {}) {
		const ctx = p.ctx;
		ctx.save();
		ctx.font = `${opt.weight || 400} ${opt.size || 12}px "Space Grotesk", sans-serif`;
		ctx.fillStyle = opt.color || "rgba(244,239,230,0.55)";
		ctx.textAlign = opt.align || "left";
		ctx.textBaseline = opt.base || "alphabetic";
		ctx.fillText(text, x, y);
		ctx.restore();
	}

	function line(ctx, x1, y1, x2, y2, color, width = 1, dash) {
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		if (dash) ctx.setLineDash(dash);
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
		ctx.restore();
	}

	// ---------- Lineare Algebra 2×2 ----------
	function gaussFit(pts) {
		const n = pts.length || 1;
		let mx = 0;
		let my = 0;
		for (const p of pts) {
			mx += p.x;
			my += p.y;
		}
		mx /= n;
		my /= n;
		let a = 0;
		let b = 0;
		let d = 0;
		for (const p of pts) {
			a += (p.x - mx) ** 2;
			b += (p.x - mx) * (p.y - my);
			d += (p.y - my) ** 2;
		}
		return { m: [mx, my], S: [a / n + 1e-4, b / n, b / n, d / n + 1e-4], n };
	}
	const det2 = (S) => S[0] * S[3] - S[1] * S[2];
	const inv2 = (S) => {
		const d = det2(S);
		return [S[3] / d, -S[1] / d, -S[2] / d, S[0] / d];
	};
	const quad = (Si, dx, dy) => dx * (Si[0] * dx + Si[1] * dy) + dy * (Si[2] * dx + Si[3] * dy);
	// Eigenwerte/-vektoren einer symmetrischen 2×2-Matrix (größter zuerst)
	function eig2(S) {
		const tr = S[0] + S[3];
		const dt = det2(S);
		const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - dt));
		const l1 = tr / 2 + disc;
		const l2 = tr / 2 - disc;
		let v = Math.abs(S[1]) > 1e-12 ? [l1 - S[3], S[1]] : S[0] >= S[3] ? [1, 0] : [0, 1];
		const n = Math.hypot(v[0], v[1]);
		v = [v[0] / n, v[1] / n];
		return { l: [l1, l2], v: [v, [-v[1], v[0]]] };
	}

	// ---------- Modelle für zwei Klassen; predict(x, y) → P(Klasse B) ----------
	const M = {};

	M.knn = (pts, k) => ({
		predict(x, y) {
			const d = pts.map((p) => [(p.x - x) ** 2 + (p.y - y) ** 2, p.c]).sort((a, b) => a[0] - b[0]);
			let s = 0;
			const kk = Math.min(k, d.length);
			for (let i = 0; i < kk; i++) s += d[i][1];
			return kk ? s / kk : 0.5;
		},
	});

	M.logistic = (pts, steps = 600, lr = 1.5) => {
		let w0 = 0;
		let w1 = 0;
		let w2 = 0;
		const n = pts.length || 1;
		for (let s = 0; s < steps; s++) {
			let g0 = 0;
			let g1 = 0;
			let g2 = 0;
			for (const p of pts) {
				const e = sigmoid(w0 + w1 * (p.x - 0.5) * 4 + w2 * (p.y - 0.5) * 4) - p.c;
				g0 += e;
				g1 += e * (p.x - 0.5) * 4;
				g2 += e * (p.y - 0.5) * 4;
			}
			w0 -= (lr * g0) / n;
			w1 -= (lr * g1) / n;
			w2 -= (lr * g2) / n;
		}
		return { predict: (x, y) => sigmoid(w0 + w1 * (x - 0.5) * 4 + w2 * (y - 0.5) * 4) };
	};

	const gaussModel = (pts, mode) => {
		const g0 = gaussFit(pts.filter((p) => !p.c));
		const g1 = gaussFit(pts.filter((p) => p.c));
		const n = pts.length || 1;
		const pri = [Math.log((g0.n + 1) / (n + 2)), Math.log((g1.n + 1) / (n + 2))];
		let S0 = g0.S;
		let S1 = g1.S;
		if (mode === "lda") {
			const w0 = g0.n / n;
			const w1 = g1.n / n;
			S0 = S1 = S0.map((v, i) => v * w0 + g1.S[i] * w1);
		} else if (mode === "nb") {
			S0 = [S0[0], 0, 0, S0[3]];
			S1 = [S1[0], 0, 0, S1[3]];
		}
		const I0 = inv2(S0);
		const I1 = inv2(S1);
		const L0 = Math.log(det2(S0));
		const L1 = Math.log(det2(S1));
		const score = (x, y) => {
			const a = -0.5 * L0 - 0.5 * quad(I0, x - g0.m[0], y - g0.m[1]) + pri[0];
			const b = -0.5 * L1 - 0.5 * quad(I1, x - g1.m[0], y - g1.m[1]) + pri[1];
			return b - a;
		};
		return { predict: (x, y) => sigmoid(score(x, y)), score, g: [g0, g1], S: [S0, S1] };
	};
	M.lda = (pts) => gaussModel(pts, "lda");
	M.qda = (pts) => gaussModel(pts, "qda");
	M.nb = (pts) => gaussModel(pts, "nb");

	// Entscheidungsbaum (Gini), Blätter speichern den Anteil von Klasse B
	function growTree(pts, depth, opt, r) {
		const n = pts.length;
		let n1 = 0;
		for (const p of pts) n1 += p.c;
		const leaf = { leaf: true, p: n ? n1 / n : 0.5, n, n1 };
		if (depth >= opt.maxDepth || n < 2 * (opt.minLeaf || 1) || n1 === 0 || n1 === n) return leaf;
		const gini = (a, t) => (t ? 1 - (a / t) ** 2 - ((t - a) / t) ** 2 : 0);
		let best = null;
		let bestScore = gini(n1, n) * n - 1e-9;
		const feats = opt.mtry === 1 && r ? [r() < 0.5 ? "x" : "y"] : ["x", "y"];
		for (const f of feats) {
			const s = pts.slice().sort((a, b) => a[f] - b[f]);
			let l1 = 0;
			for (let i = 1; i < n; i++) {
				l1 += s[i - 1].c;
				if (s[i][f] === s[i - 1][f] || i < (opt.minLeaf || 1) || n - i < (opt.minLeaf || 1)) continue;
				const sc = gini(l1, i) * i + gini(n1 - l1, n - i) * (n - i);
				if (sc < bestScore) {
					bestScore = sc;
					best = { f, t: (s[i][f] + s[i - 1][f]) / 2 };
				}
			}
		}
		if (!best) return leaf;
		const L = pts.filter((p) => p[best.f] < best.t);
		const R = pts.filter((p) => p[best.f] >= best.t);
		return { ...best, n, n1, p: leaf.p, left: growTree(L, depth + 1, opt, r), right: growTree(R, depth + 1, opt, r) };
	}
	const treeAt = (node, x, y) => {
		while (!node.leaf) node = (node.f === "x" ? x : y) < node.t ? node.left : node.right;
		return node.p;
	};
	M.tree = (pts, maxDepth = 4, minLeaf = 1, r = null, mtry = 2) => {
		const root = growTree(pts, 0, { maxDepth, minLeaf, mtry }, r);
		return { root, predict: (x, y) => treeAt(root, x, y) };
	};

	M.forest = (pts, nTrees = 40, maxDepth = 10, seed = 7) => {
		const r = rng(seed);
		const trees = [];
		for (let t = 0; t < nTrees; t++) {
			const bag = [];
			for (let i = 0; i < pts.length; i++) bag.push(pts[r.int(pts.length)]);
			trees.push(M.tree(bag, maxDepth, 1, r, 1));
		}
		return {
			trees,
			predict(x, y, upto = trees.length) {
				let s = 0;
				for (let t = 0; t < upto; t++) s += trees[t].predict(x, y);
				return upto ? s / upto : 0.5;
			},
		};
	};

	// Regressionsbaum: X = Liste von Merkmalsvektoren, Y = Zielwerte
	function regTree(X, Y, idx, depth, maxDepth, minLeaf = 2) {
		let mean = 0;
		for (const i of idx) mean += Y[i];
		mean /= idx.length || 1;
		if (depth >= maxDepth || idx.length < 2 * minLeaf) return { leaf: true, v: mean };
		let best = null;
		let bestSSE = Infinity;
		let tot = 0;
		let tot2 = 0;
		for (const i of idx) {
			tot += Y[i];
			tot2 += Y[i] * Y[i];
		}
		const base = tot2 - (tot * tot) / idx.length;
		for (let f = 0; f < X[0].length; f++) {
			const s = idx.slice().sort((a, b) => X[a][f] - X[b][f]);
			let ls = 0;
			let ls2 = 0;
			for (let k = 1; k < s.length; k++) {
				ls += Y[s[k - 1]];
				ls2 += Y[s[k - 1]] ** 2;
				if (k < minLeaf || s.length - k < minLeaf || X[s[k]][f] === X[s[k - 1]][f]) continue;
				const rs = tot - ls;
				const rs2 = tot2 - ls2;
				const sse = ls2 - (ls * ls) / k + rs2 - (rs * rs) / (s.length - k);
				if (sse < bestSSE) {
					bestSSE = sse;
					best = { f, t: (X[s[k]][f] + X[s[k - 1]][f]) / 2 };
				}
			}
		}
		if (!best || bestSSE >= base - 1e-12) return { leaf: true, v: mean };
		const L = idx.filter((i) => X[i][best.f] < best.t);
		const R = idx.filter((i) => X[i][best.f] >= best.t);
		return { ...best, left: regTree(X, Y, L, depth + 1, maxDepth, minLeaf), right: regTree(X, Y, R, depth + 1, maxDepth, minLeaf) };
	}
	const regAt = (node, x) => {
		while (!node.leaf) node = x[node.f] < node.t ? node.left : node.right;
		return node.v;
	};
	M.regTree = (X, Y, maxDepth, minLeaf) => {
		const root = regTree(X, Y, X.map((_, i) => i), 0, maxDepth, minLeaf);
		return { root, at: (x) => regAt(root, x) };
	};

	M.boost = (pts, rounds = 80, lr = 0.3, depth = 3) => {
		const X = pts.map((p) => [p.x, p.y]);
		const n1 = pts.reduce((s, p) => s + p.c, 0);
		const f0 = Math.log((n1 + 1) / (pts.length - n1 + 1));
		const F = pts.map(() => f0);
		const trees = [];
		for (let m = 0; m < rounds; m++) {
			const res = pts.map((p, i) => p.c - sigmoid(F[i]));
			const t = M.regTree(X, res, depth, 3);
			trees.push(t);
			for (let i = 0; i < pts.length; i++) F[i] += lr * t.at(X[i]);
		}
		return {
			predict(x, y) {
				let f = f0;
				for (const t of trees) f += lr * t.at([x, y]);
				return sigmoid(f);
			},
		};
	};

	// Support Vector Machine mit vereinfachtem SMO
	M.svm = (pts, { C = 1, kernel = "linear", gamma = 10, seed = 3 } = {}) => {
		// intern auf etwa −2…2 skaliert, damit C unabhängig vom Einheitsquadrat wirkt
		const SC = 4;
		const sc = (q) => ({ x: (q.x - 0.5) * SC, y: (q.y - 0.5) * SC });
		const orig = pts;
		pts = pts.map(sc);
		const n = pts.length;
		const r = rng(seed);
		const Y = orig.map((p) => (p.c ? 1 : -1));
		const g2 = gamma / (SC * SC);
		const K =
			kernel === "rbf"
				? (a, b) => Math.exp(-g2 * ((a.x - b.x) ** 2 + (a.y - b.y) ** 2))
				: (a, b) => a.x * b.x + a.y * b.y;
		const G = pts.map((a) => pts.map((b) => K(a, b)));
		const al = new Float64Array(n);
		let b = 0;
		const f = (i) => {
			let s = b;
			for (let j = 0; j < n; j++) if (al[j]) s += al[j] * Y[j] * G[j][i];
			return s;
		};
		let passes = 0;
		let iter = 0;
		const tol = 1e-3;
		while (passes < 10 && iter < 3000 && n > 1) {
			iter++;
			let changed = 0;
			for (let i = 0; i < n; i++) {
				const Ei = f(i) - Y[i];
				if (!((Y[i] * Ei < -tol && al[i] < C) || (Y[i] * Ei > tol && al[i] > 0))) continue;
				let j = r.int(n - 1);
				if (j >= i) j++;
				const Ej = f(j) - Y[j];
				const ai = al[i];
				const aj = al[j];
				const L = Y[i] !== Y[j] ? Math.max(0, aj - ai) : Math.max(0, ai + aj - C);
				const H = Y[i] !== Y[j] ? Math.min(C, C + aj - ai) : Math.min(C, ai + aj);
				if (L >= H) continue;
				const eta = 2 * G[i][j] - G[i][i] - G[j][j];
				if (eta >= 0) continue;
				al[j] = clamp(aj - (Y[j] * (Ei - Ej)) / eta, L, H);
				if (Math.abs(al[j] - aj) < 1e-6) continue;
				al[i] = ai + Y[i] * Y[j] * (aj - al[j]);
				const b1 = b - Ei - Y[i] * (al[i] - ai) * G[i][i] - Y[j] * (al[j] - aj) * G[i][j];
				const b2 = b - Ej - Y[i] * (al[i] - ai) * G[i][j] - Y[j] * (al[j] - aj) * G[j][j];
				b = al[i] > 0 && al[i] < C ? b1 : al[j] > 0 && al[j] < C ? b2 : (b1 + b2) / 2;
				changed++;
			}
			passes = changed ? 0 : passes + 1;
		}
		const sv = [];
		for (let i = 0; i < n; i++) if (al[i] > 1e-6) sv.push(i);
		const decision = (x, y) => {
			let s = b;
			const q = sc({ x, y });
			for (const i of sv) s += al[i] * Y[i] * K(pts[i], q);
			return s;
		};
		let w = null;
		if (kernel === "linear") {
			w = [0, 0];
			for (const i of sv) {
				w[0] += al[i] * Y[i] * pts[i].x;
				w[1] += al[i] * Y[i] * pts[i].y;
			}
		}
		if (w) w = [w[0] * SC, w[1] * SC];
		return { decision, predict: (x, y) => sigmoid(2.5 * decision(x, y)), sv: sv.map((i) => orig[i]), w, b };
	};

	// Kleines neuronales Netz: tanh in den verborgenen Schichten, Sigmoid am Ausgang, Adam
	class MLP {
		constructor(sizes, seed = 1) {
			const r = rng(seed);
			this.sizes = sizes;
			this.W = [];
			this.b = [];
			this.m = [];
			this.v = [];
			this.t = 0;
			for (let l = 0; l + 1 < sizes.length; l++) {
				const nin = sizes[l];
				const nout = sizes[l + 1];
				const s = Math.sqrt(1 / nin);
				this.W.push(Float64Array.from({ length: nin * nout }, () => r.n() * s * 1.4));
				this.b.push(new Float64Array(nout));
			}
			this.m = [...this.W, ...this.b].map((a) => new Float64Array(a.length));
			this.v = [...this.W, ...this.b].map((a) => new Float64Array(a.length));
		}
		forward(x) {
			const acts = [x];
			let a = x;
			for (let l = 0; l < this.W.length; l++) {
				const nin = this.sizes[l];
				const nout = this.sizes[l + 1];
				const z = new Float64Array(nout);
				for (let o = 0; o < nout; o++) {
					let s = this.b[l][o];
					for (let i = 0; i < nin; i++) s += this.W[l][o * nin + i] * a[i];
					z[o] = l === this.W.length - 1 ? sigmoid(s) : Math.tanh(s);
				}
				acts.push(z);
				a = z;
			}
			return acts;
		}
		predict(x, y) {
			const a = this.forward([(x - 0.5) * 4, (y - 0.5) * 4]);
			return a[a.length - 1][0];
		}
		train(pts, lr = 0.03) {
			const gW = this.W.map((w) => new Float64Array(w.length));
			const gb = this.b.map((b) => new Float64Array(b.length));
			let loss = 0;
			for (const p of pts) {
				const acts = this.forward([(p.x - 0.5) * 4, (p.y - 0.5) * 4]);
				const out = acts[acts.length - 1][0];
				loss -= p.c ? Math.log(out + 1e-9) : Math.log(1 - out + 1e-9);
				let delta = Float64Array.of(out - p.c);
				for (let l = this.W.length - 1; l >= 0; l--) {
					const nin = this.sizes[l];
					const nout = this.sizes[l + 1];
					const a = acts[l];
					const next = new Float64Array(nin);
					for (let o = 0; o < nout; o++) {
						gb[l][o] += delta[o];
						for (let i = 0; i < nin; i++) {
							gW[l][o * nin + i] += delta[o] * a[i];
							next[i] += this.W[l][o * nin + i] * delta[o];
						}
					}
					if (l > 0) for (let i = 0; i < nin; i++) next[i] *= 1 - a[i] * a[i];
					delta = next;
				}
			}
			const n = pts.length || 1;
			this.t++;
			const params = [...this.W, ...this.b];
			const grads = [...gW, ...gb];
			const b1 = 0.9;
			const b2 = 0.999;
			for (let k = 0; k < params.length; k++) {
				const P = params[k];
				const g = grads[k];
				const m = this.m[k];
				const v = this.v[k];
				for (let i = 0; i < P.length; i++) {
					const gi = g[i] / n;
					m[i] = b1 * m[i] + (1 - b1) * gi;
					v[i] = b2 * v[i] + (1 - b2) * gi * gi;
					const mh = m[i] / (1 - b1 ** this.t);
					const vh = v[i] / (1 - b2 ** this.t);
					P[i] -= (lr * mh) / (Math.sqrt(vh) + 1e-8);
				}
			}
			return loss / n;
		}
	}
	M.MLP = MLP;
	M.mlp = (pts, hidden = [8, 8], steps = 500, seed = 1) => {
		const net = new MLP([2, ...hidden, 1], seed);
		for (let s = 0; s < steps; s++) net.train(pts, 0.03);
		return net;
	};

	const accuracy = (model, pts) => {
		if (!pts.length) return 0;
		let ok = 0;
		for (const p of pts) ok += (model.predict(p.x, p.y) >= 0.5 ? 1 : 0) === p.c ? 1 : 0;
		return ok / pts.length;
	};

	// ---------- Kleine UI-Helfer ----------
	// Chip-Gruppe: genau ein Knopf ist gedrückt
	function chips(box, onPick) {
		const btns = [...box.querySelectorAll("button")];
		btns.forEach((b) =>
			b.addEventListener("click", () => {
				btns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
				onPick(b.dataset.v, b);
			})
		);
		return {
			get: () => box.querySelector('[aria-pressed="true"]')?.dataset.v,
			set(v) {
				btns.forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === v)));
			},
		};
	}

	// Schieberegler mit Ausgabe; fmt formatiert den Wert
	function slider(id, fmt, onInput) {
		const el = document.getElementById(id);
		const out = document.getElementById(id + "Out");
		const show = () => out && (out.textContent = fmt ? fmt(Number(el.value)) : el.value);
		el.addEventListener("input", () => {
			show();
			onInput(Number(el.value));
		});
		show();
		return {
			el,
			get: () => Number(el.value),
			set(v) {
				el.value = v;
				el.style.setProperty("--fill", `${((v - el.min) / (el.max - el.min)) * 100}%`);
				show();
			},
		};
	}

	const $ = (id) => document.getElementById(id);
	const pct = (v) => `${nf(v * 100, 0)} %`;

	return {
		clamp, nf, sigmoid, lerp, A, B, PAL, rgb, classColor, rng, DATA, plot, layer, pointer, togglepoint,
		dots, region, regionMulti, contour, label, line, gaussFit, inv2, det2, eig2, quad, M, accuracy, chips, slider, $, pct,
	};
})();
