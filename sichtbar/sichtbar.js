"use strict";

const { clamp, lerp, nf, randn, C, pointer, chips, slider } = Q;

function clear(ctx, size) {
	ctx.fillStyle = C.bg;
	ctx.fillRect(0, 0, size.w, size.h);
}

// ---------------------------------------------------------------------
// Gemeinsam für beide Markov-Stationen: Knoten, Pfeile, hüpfender Ball
// ---------------------------------------------------------------------
// nodes: [{ x, y, out: [dx, dy] }] · liefert Punkt und Richtung auf dem Weg i → j bei t ∈ [0, 1]
function hop(nodes, r, i, j, t) {
	const a = nodes[i];
	if (i === j) {
		const [ox, oy] = a.out;
		const lr = r * 0.55;
		const cx = a.x + ox * (r + lr * 0.55);
		const cy = a.y + oy * (r + lr * 0.55);
		const base = Math.atan2(-oy, -ox);
		const th = base + 0.35 + t * (Math.PI * 2 - 0.7);
		return { x: cx + lr * Math.cos(th), y: cy + lr * Math.sin(th), dx: -Math.sin(th), dy: Math.cos(th) };
	}
	const b = nodes[j];
	const mx = (a.x + b.x) / 2;
	const my = (a.y + b.y) / 2;
	const L = Math.hypot(b.x - a.x, b.y - a.y);
	const nx = (b.y - a.y) / L;
	const ny = -(b.x - a.x) / L;
	const off = r * 0.9;
	const cx = mx + nx * off;
	const cy = my + ny * off;
	const u = 1 - t;
	return {
		x: u * u * a.x + 2 * u * t * cx + t * t * b.x,
		y: u * u * a.y + 2 * u * t * cy + t * t * b.y,
		dx: 2 * u * (cx - a.x) + 2 * t * (b.x - cx),
		dy: 2 * u * (cy - a.y) + 2 * t * (b.y - cy),
	};
}

function drawArrow(ctx, nodes, r, i, j, p, color) {
	if (p <= 0.001) return;
	ctx.strokeStyle = color;
	ctx.globalAlpha = 0.25 + 0.6 * p;
	ctx.lineWidth = 1 + p * 9;
	ctx.lineCap = "round";
	const t0 = i === j ? 0.04 : 0.2;
	const t1 = i === j ? 0.96 : 0.8;
	ctx.beginPath();
	for (let k = 0; k <= 40; k++) {
		const q = hop(nodes, r, i, j, lerp(t0, t1, k / 40));
		if (k === 0) ctx.moveTo(q.x, q.y);
		else ctx.lineTo(q.x, q.y);
	}
	ctx.stroke();
	const h = hop(nodes, r, i, j, i === j ? 0.6 : 0.62);
	const ang = Math.atan2(h.dy, h.dx);
	const s = 6 + p * 6;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(h.x + Math.cos(ang) * s, h.y + Math.sin(ang) * s);
	ctx.lineTo(h.x + Math.cos(ang + 2.5) * s, h.y + Math.sin(ang + 2.5) * s);
	ctx.lineTo(h.x + Math.cos(ang - 2.5) * s, h.y + Math.sin(ang - 2.5) * s);
	ctx.fill();
	ctx.globalAlpha = 1;
	if (p > 0.001) {
		const lab = hop(nodes, r, i, j, 0.5);
		const nx = i === j ? nodes[i].out[0] : lab.dy;
		const ny = i === j ? nodes[i].out[1] : -lab.dx;
		const nl = Math.hypot(nx, ny) || 1;
		const d = i === j ? 16 : 14 + p * 5;
		ctx.fillStyle = C.ink;
		ctx.font = '12px "JetBrains Mono", monospace';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(nf(p, 2), lab.x + (nx / nl) * d, lab.y + (ny / nl) * d);
	}
}

// Zieht den nächsten Zustand aus einer Zeile
function nextState(row) {
	let u = Math.random();
	for (let j = 0; j < row.length; j++) {
		if (u < row[j]) return j;
		u -= row[j];
	}
	return row.length - 1;
}

// =====================================================================
// 1 · Markov-Kette mit zwei Zuständen
// =====================================================================
(() => {
	const canvas = document.getElementById("mkCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.05 : 1.35));
	const pS = slider("mkP", (v) => nf(v, 2));
	const qS = slider("mkQ", (v) => nf(v, 2), () => {});
	const spS = slider("mkSpeed", (v) => `${v} Tage/s`);
	const names = ["Sonne", "Regen"];
	const cols = [C.c, C.b];
	let state = 0;
	let next = 0;
	let t = 0;
	let n = 0;
	let sun = 0;
	const hist = [];
	const P = () => [
		[pS.value, 1 - pS.value],
		[1 - qS.value, qS.value],
	];
	function stats() {
		document.getElementById("mkN").textContent = n.toLocaleString("de-DE");
		document.getElementById("mkF").textContent = n ? nf(sun / n, 3) : "–";
		const a = 1 - pS.value;
		const b = 1 - qS.value;
		document.getElementById("mkPi").textContent = a + b > 0 ? nf(b / (a + b), 3) : "–";
	}
	pS.el.addEventListener("input", stats);
	qS.el.addEventListener("input", stats);
	next = nextState(P()[state]);
	stats();

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		clear(ctx, size);
		const strip = 46;
		const r = Math.min(w * 0.12, (h - strip) * 0.16);
		const nodes = [
			{ x: w * 0.3, y: (h - strip) * 0.62, out: [0, -1] },
			{ x: w * 0.7, y: (h - strip) * 0.62, out: [0, -1] },
		];
		t += dt * spS.value;
		let changed = false;
		while (t >= 1) {
			t -= 1;
			state = next;
			n++;
			if (state === 0) sun++;
			hist.push(state);
			if (hist.length > 400) hist.shift();
			next = nextState(P()[state]);
			changed = true;
		}
		if (changed) stats();
		const M = P();
		for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) drawArrow(ctx, nodes, r, i, j, M[i][j], cols[i]);
		nodes.forEach((nd, i) => {
			ctx.fillStyle = "#14171b";
			ctx.strokeStyle = cols[i];
			ctx.lineWidth = state === i ? 4 : 2;
			ctx.beginPath();
			ctx.arc(nd.x, nd.y, r, 0, 7);
			ctx.fill();
			ctx.stroke();
			ctx.font = `${Math.round(r * 0.7)}px sans-serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(i === 0 ? "☀️" : "🌧️", nd.x, nd.y - r * 0.12);
			ctx.fillStyle = C.ink;
			ctx.font = '12px "Space Grotesk", sans-serif';
			ctx.fillText(names[i], nd.x, nd.y + r * 0.55);
		});
		// Ball
		const b = hop(nodes, r, state, next, t);
		ctx.fillStyle = C.ink;
		ctx.shadowColor = cols[next];
		ctx.shadowBlur = 14;
		ctx.beginPath();
		ctx.arc(b.x, b.y, 7, 0, 7);
		ctx.fill();
		ctx.shadowBlur = 0;
		// Verlauf der letzten Tage
		const cell = 8;
		const cnt = Math.min(hist.length, Math.floor((w - 24) / cell));
		for (let k = 0; k < cnt; k++) {
			ctx.fillStyle = cols[hist[hist.length - 1 - k]];
			ctx.fillRect(w - 12 - (k + 1) * cell, h - strip + 12, cell - 1, strip - 24);
		}
		ctx.fillStyle = C.text;
		ctx.font = '11px "Space Grotesk", sans-serif';
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.fillText("← die letzten Tage, neueste rechts", 12, h - strip + 10);
	});
})();

// =====================================================================
// 2 · Übergangsmatrix mit drei Zuständen
// =====================================================================
(() => {
	const canvas = document.getElementById("mxCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.85 : 1.1));
	const grid = document.getElementById("mxInputs");
	const note = document.getElementById("mxNote");
	const cols = [C.a, C.c, C.d];
	const names = ["A", "B", "C"];
	const presets = [
		{ label: "Gemischt", m: [[0.5, 0.3, 0.2], [0.2, 0.6, 0.2], [0.3, 0.3, 0.4]] },
		{ label: "Kreislauf", m: [[0, 1, 0], [0, 0, 1], [1, 0, 0]] },
		{ label: "Falle", m: [[0.5, 0.5, 0], [0.3, 0.3, 0.4], [0, 0, 1]] },
		{ label: "Fast getrennt", m: [[0.9, 0.08, 0.02], [0.08, 0.9, 0.02], [0.3, 0.3, 0.4]] },
	];
	let raw = presets[0].m.map((r) => r.slice());
	let M = [];
	let state = 0;
	let next = 0;
	let t = 0;
	let visits = [0, 0, 0];
	let total = 0;
	let pi = [1 / 3, 1 / 3, 1 / 3];
	const inputs = [];
	for (let i = 0; i < 3; i++)
		for (let j = 0; j < 3; j++) {
			const inp = document.createElement("input");
			inp.type = "text";
			inp.inputMode = "decimal";
			inp.setAttribute("aria-label", `Gewicht von ${names[i]} nach ${names[j]}`);
			inp.addEventListener("input", () => {
				const v = parseFloat(inp.value.replace(",", "."));
				raw[i][j] = Number.isFinite(v) && v >= 0 ? v : 0;
				pc.set(-1, true);
				normalize();
			});
			grid.appendChild(inp);
			inputs.push(inp);
		}
	function fillInputs() {
		inputs.forEach((inp, k) => (inp.value = String(raw[Math.floor(k / 3)][k % 3]).replace(".", ",")));
	}
	function normalize() {
		M = raw.map((row, i) => {
			const s = row.reduce((a, b) => a + b, 0);
			return s > 0 ? row.map((v) => v / s) : row.map((_, j) => (i === j ? 1 : 0));
		});
		// Stationäre Verteilung als Cesàro-Mittel (funktioniert auch bei Kreisläufen)
		let p = [1 / 3, 1 / 3, 1 / 3];
		const avg = [0, 0, 0];
		let last = p;
		const N = 3000;
		for (let k = 0; k < N; k++) {
			const q = [0, 0, 0];
			for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) q[j] += p[i] * M[i][j];
			last = p;
			p = q;
			for (let j = 0; j < 3; j++) avg[j] += p[j] / N;
		}
		pi = avg;
		const periodic = p.some((v, j) => Math.abs(v - last[j]) > 1e-3);
		const trap = M.findIndex((row, i) => row[i] > 0.9999);
		next = nextState(M[state]);
		if (periodic) note.textContent = "Die Kette kreist: Die Verteilung schwappt ewig weiter. Nur im Zeitmittel gibt es feste Anteile.";
		else if (trap >= 0) note.textContent = `Zustand ${names[trap]} ist eine Falle: Wer einmal dort ist, kommt nie wieder heraus.`;
		else note.textContent = "Die Balken (gezählt) wandern zu den Strichen: der stationären Verteilung π mit π · P = π.";
	}
	const pc = chips(document.getElementById("mxPresets"), presets, (i, it) => {
		raw = it.m.map((r) => r.slice());
		fillInputs();
		normalize();
		resetCount();
	});
	function resetCount() {
		visits = [0, 0, 0];
		total = 0;
		state = 0;
		next = nextState(M[state]);
	}
	document.getElementById("mxReset").addEventListener("click", resetCount);
	fillInputs();
	normalize();

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		clear(ctx, size);
		const top = h * 0.64;
		const r = Math.min(w, top) * 0.085;
		const cx = w / 2;
		const cy = top * 0.56;
		const R = Math.min(w * 0.3, top * 0.32);
		const nodes = [0, 1, 2].map((k) => {
			const a = -Math.PI / 2 + (k * Math.PI * 2) / 3;
			return { x: cx + Math.cos(a) * R * 1.15, y: cy + Math.sin(a) * R, out: [Math.cos(a), Math.sin(a)] };
		});
		t += dt * 5;
		while (t >= 1) {
			t -= 1;
			state = next;
			visits[state]++;
			total++;
			next = nextState(M[state]);
		}
		for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) drawArrow(ctx, nodes, r, i, j, M[i][j], cols[i]);
		nodes.forEach((nd, i) => {
			ctx.fillStyle = "#14171b";
			ctx.strokeStyle = cols[i];
			ctx.lineWidth = state === i ? 4 : 2;
			ctx.beginPath();
			ctx.arc(nd.x, nd.y, r, 0, 7);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = cols[i];
			ctx.font = `700 ${Math.round(r * 0.8)}px Syne, sans-serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(names[i], nd.x, nd.y + 1);
		});
		const b = hop(nodes, r, state, next, t);
		ctx.fillStyle = C.ink;
		ctx.shadowColor = cols[next];
		ctx.shadowBlur = 14;
		ctx.beginPath();
		ctx.arc(b.x, b.y, 6, 0, 7);
		ctx.fill();
		ctx.shadowBlur = 0;

		// Balken: gezählt gegen stationär
		const y0 = top + 20;
		const y1 = h - 36;
		const bw = Math.min(90, w / 6);
		ctx.strokeStyle = C.axis;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(w * 0.15, y1);
		ctx.lineTo(w * 0.85, y1);
		ctx.stroke();
		for (let i = 0; i < 3; i++) {
			const X = lerp(w * 0.25, w * 0.75, i / 2);
			const f = total ? visits[i] / total : 0;
			const Y = lerp(y1, y0, f);
			ctx.fillStyle = cols[i];
			ctx.globalAlpha = 0.7;
			ctx.fillRect(X - bw / 2, Y, bw, y1 - Y);
			ctx.globalAlpha = 1;
			const Yp = lerp(y1, y0, pi[i]);
			ctx.strokeStyle = C.ink;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(X - bw / 2 - 6, Yp);
			ctx.lineTo(X + bw / 2 + 6, Yp);
			ctx.stroke();
			ctx.fillStyle = C.ink;
			ctx.font = '11px "JetBrains Mono", monospace';
			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			ctx.fillText(`${names[i]}: ${nf(f, 2)}`, X, y1 + 5);
			ctx.fillStyle = C.text;
			ctx.fillText(`π ${nf(pi[i], 2)}`, X, y1 + 19);
		}
		ctx.fillStyle = C.text;
		ctx.textAlign = "left";
		ctx.font = '11px "Space Grotesk", sans-serif';
		ctx.fillText(`${total.toLocaleString("de-DE")} Sprünge`, 12, top + 4);
	});
})();

// =====================================================================
// 3 · Bedingte Wahrscheinlichkeit: Kugelregen
// =====================================================================
(() => {
	const canvas = document.getElementById("condCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.25));
	const bars = [
		{ name: "A", a: 0.15, b: 0.55, y: 0.38, col: C.a },
		{ name: "B", a: 0.4, b: 0.85, y: 0.64, col: C.b },
	];
	const balls = [];
	const results = [];
	const WINDOW = 1500;
	let acc = 0;
	let drag = null;
	const pad = 16;
	const X = (u) => lerp(pad, size.w - pad, u);
	const U = (x) => (x - pad) / (size.w - 2 * pad);

	pointer(canvas, {
		down(pt) {
			for (const bar of bars) {
				const by = bar.y * size.h;
				if (Math.abs(pt.y - by) > 22) continue;
				const xa = X(bar.a);
				const xb = X(bar.b);
				if (pt.x < xa - 14 || pt.x > xb + 14) continue;
				const edge = Math.abs(pt.x - xa) < 14 ? "a" : Math.abs(pt.x - xb) < 14 ? "b" : "m";
				drag = { bar, edge, u0: U(pt.x), a0: bar.a, b0: bar.b };
				return;
			}
		},
		move(pt) {
			if (!drag) return;
			const { bar, edge } = drag;
			const u = U(pt.x);
			if (edge === "a") bar.a = clamp(u, 0, bar.b - 0.04);
			else if (edge === "b") bar.b = clamp(u, bar.a + 0.04, 1);
			else {
				const w = drag.b0 - drag.a0;
				bar.a = clamp(drag.a0 + u - drag.u0, 0, 1 - w);
				bar.b = bar.a + w;
			}
			results.length = 0;
		},
		up() {
			drag = null;
		},
		hover(pt) {
			let cur = "crosshair";
			if (pt)
				for (const bar of bars) {
					if (Math.abs(pt.y - bar.y * size.h) > 22) continue;
					const xa = X(bar.a);
					const xb = X(bar.b);
					if (Math.abs(pt.x - xa) < 14 || Math.abs(pt.x - xb) < 14) cur = "ew-resize";
					else if (pt.x > xa && pt.x < xb) cur = "grab";
				}
			canvas.style.cursor = cur;
		},
	});

	const outs = ["cA", "cB", "cAB", "cAgB", "cBgA"].map((id) => document.getElementById(id));
	const note = document.getElementById("condNote");
	let tick = 0;
	function stats() {
		const n = results.length;
		const cnt = { a: 0, b: 0, ab: 0 };
		for (const r of results) {
			if (r & 1) cnt.a++;
			if (r & 2) cnt.b++;
			if (r === 3) cnt.ab++;
		}
		const f = (x, d) => (d ? nf(x / d, 2) : "–");
		outs[0].textContent = f(cnt.a, n);
		outs[1].textContent = f(cnt.b, n);
		outs[2].textContent = f(cnt.ab, n);
		outs[3].textContent = f(cnt.ab, cnt.b);
		outs[4].textContent = f(cnt.ab, cnt.a);
		const [A, B] = bars;
		const pa = A.b - A.a;
		const pb = B.b - B.a;
		const pab = Math.max(0, Math.min(A.b, B.b) - Math.max(A.a, B.a));
		note.textContent = `Exakt aus den Breiten: P(A) = ${nf(pa, 2)}, P(B) = ${nf(pb, 2)}, P(A ∩ B) = ${nf(pab, 2)}, P(A | B) = ${nf(pab / pb, 2)}.${Math.abs(pab / pb - pa) < 0.02 ? " A und B sind gerade unabhängig!" : ""}`;
	}

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		clear(ctx, size);
		acc += dt * 60;
		while (acc >= 1) {
			acc -= 1;
			balls.push({ u: Math.random(), y: -6, v: 80 + Math.random() * 40, f: 0 });
		}
		for (let i = balls.length - 1; i >= 0; i--) {
			const b = balls[i];
			const y0 = b.y;
			b.v += 260 * dt;
			b.y += b.v * dt;
			for (let k = 0; k < 2; k++) {
				const by = bars[k].y * h;
				if (y0 < by && b.y >= by && b.u >= bars[k].a && b.u <= bars[k].b) b.f |= 1 << k;
			}
			if (b.y > h + 6) {
				results.push(b.f);
				if (results.length > WINDOW) results.shift();
				balls.splice(i, 1);
			}
		}
		tick += dt;
		if (tick > 0.2) {
			tick = 0;
			stats();
		}
		// Überlappung
		const [A, B] = bars;
		const lo = Math.max(A.a, B.a);
		const hi = Math.min(A.b, B.b);
		if (hi > lo) {
			ctx.fillStyle = "rgba(199,155,255,0.07)";
			ctx.fillRect(X(lo), 0, X(hi) - X(lo), h);
		}
		const colOf = (f) => (f === 3 ? C.e : f === 1 ? C.a : f === 2 ? C.b : "rgba(244,239,230,0.35)");
		for (const b of balls) {
			ctx.fillStyle = colOf(b.f);
			ctx.beginPath();
			ctx.arc(X(b.u), b.y, 3, 0, 7);
			ctx.fill();
		}
		for (const bar of bars) {
			const y = bar.y * h;
			ctx.fillStyle = bar.col;
			ctx.globalAlpha = 0.85;
			ctx.beginPath();
			ctx.roundRect(X(bar.a), y - 6, X(bar.b) - X(bar.a), 12, 6);
			ctx.fill();
			ctx.globalAlpha = 1;
			ctx.fillStyle = C.ink;
			for (const e of [bar.a, bar.b]) {
				ctx.beginPath();
				ctx.arc(X(e), y, 6, 0, 7);
				ctx.fill();
			}
			ctx.fillStyle = bar.col;
			ctx.font = '700 16px Syne, sans-serif';
			ctx.textAlign = "center";
			ctx.textBaseline = "bottom";
			ctx.fillText(bar.name, (X(bar.a) + X(bar.b)) / 2, y - 10);
		}
		ctx.font = '11px "Space Grotesk", sans-serif';
		ctx.textAlign = "right";
		ctx.textBaseline = "bottom";
		ctx.fillStyle = C.e;
		ctx.fillText("● durch A und B", w - 12, h - 8);
	});
})();

// =====================================================================
// 4 · Eigenvektoren
// =====================================================================
(() => {
	const canvas = document.getElementById("eigCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1 : 1.3));
	const grid = document.getElementById("eigInputs");
	const note = document.getElementById("eigNote");
	const out = document.getElementById("eigOut");
	const gridBtn = document.getElementById("eigGrid");
	const presets = [
		{ label: "Symmetrisch", m: [1.2, 0.5, 0.5, 0.7] },
		{ label: "Streckung", m: [1.5, 0, 0, 0.6] },
		{ label: "Scherung", m: [1, 0.8, 0, 1] },
		{ label: "Drehung", m: [0.8, -0.6, 0.6, 0.8] },
		{ label: "Markov", m: [0.9, 0.5, 0.1, 0.5] },
	];
	let A = presets[0].m.slice();
	let v = { x: 1.6, y: 0.4 };
	let seq = null;
	let seqT = 0;
	let showGrid = true;
	let drag = false;
	const inputs = [0, 1, 2, 3].map((k) => {
		const inp = document.createElement("input");
		inp.type = "text";
		inp.inputMode = "decimal";
		inp.setAttribute("aria-label", `Matrixeintrag ${k + 1}`);
		inp.addEventListener("input", () => {
			const val = parseFloat(inp.value.replace(",", "."));
			if (Number.isFinite(val)) A[k] = val;
			pc.set(-1, true);
			seq = null;
			update();
		});
		grid.appendChild(inp);
		return inp;
	});
	const fill = () => inputs.forEach((inp, k) => (inp.value = String(A[k]).replace(".", ",")));
	const pc = chips(document.getElementById("eigPresets"), presets, (i, it) => {
		A = it.m.slice();
		fill();
		seq = null;
		update();
	});
	gridBtn.addEventListener("click", () => {
		showGrid = !showGrid;
		gridBtn.setAttribute("aria-pressed", String(showGrid));
	});
	const mul = (p) => ({ x: A[0] * p.x + A[1] * p.y, y: A[2] * p.x + A[3] * p.y });
	function eig() {
		const [a, b, c, d] = A;
		const tr = a + d;
		const det = a * d - b * c;
		const disc = (tr * tr) / 4 - det;
		if (disc < -1e-12) return { complex: true, re: tr / 2, im: Math.sqrt(-disc) };
		const s = Math.sqrt(Math.max(0, disc));
		const ls = [tr / 2 + s, tr / 2 - s];
		const vecs = ls.map((l) => {
			let e;
			if (Math.abs(b) > 1e-9) e = { x: b, y: l - a };
			else if (Math.abs(c) > 1e-9) e = { x: l - d, y: c };
			else e = Math.abs(l - a) < 1e-9 ? { x: 1, y: 0 } : { x: 0, y: 1 };
			const n = Math.hypot(e.x, e.y);
			return { x: e.x / n, y: e.y / n };
		});
		if (s < 1e-9 && Math.abs(b) < 1e-9 && Math.abs(c) < 1e-9) vecs[1] = { x: 0, y: 1 };
		return { complex: false, ls, vecs };
	}
	function update() {
		const E = eig();
		const Av = mul(v);
		const cross = v.x * Av.y - v.y * Av.x;
		const ang = (Math.atan2(cross, v.x * Av.x + v.y * Av.y) * 180) / Math.PI;
		const aligned = Math.abs(ang) < 2.5 || Math.abs(Math.abs(ang) - 180) < 2.5;
		const lam = (Av.x * v.x + Av.y * v.y) / (v.x * v.x + v.y * v.y);
		out.textContent = `Winkel v ↔ Av: ${nf(Math.abs(ang), 0)}°`;
		if (E.complex)
			note.textContent = `Keine reellen Eigenvektoren: A dreht jeden Pfeil (Eigenwerte ${nf(E.re, 2)} ± ${nf(E.im, 2)}i). Keine Richtung bleibt, wie sie ist.`;
		else if (aligned) note.textContent = `Treffer! v liegt auf einer Eigenrichtung. A streckt v nur, um λ ≈ ${nf(lam, 2)}.`;
		else note.textContent = `Eigenwerte λ₁ = ${nf(E.ls[0], 2)} und λ₂ = ${nf(E.ls[1], 2)}. Bring v auf eine lila Linie.`;
	}
	fill();
	update();

	const view = () => {
		const s = Math.min(size.w, size.h) / 9;
		return { s, cx: size.w / 2, cy: size.h / 2, X: (x) => size.w / 2 + x * s, Y: (y) => size.h / 2 - y * s };
	};
	pointer(canvas, {
		down(pt) {
			drag = true;
			const V = view();
			v = { x: (pt.x - V.cx) / V.s, y: (V.cy - pt.y) / V.s };
			seq = null;
			update();
		},
		move(pt) {
			if (!drag) return;
			const V = view();
			v = { x: (pt.x - V.cx) / V.s, y: (V.cy - pt.y) / V.s };
			update();
		},
		up() {
			drag = false;
		},
	});
	document.getElementById("eigIter").addEventListener("click", () => {
		seq = [v];
		for (let k = 0; k < 30; k++) {
			const p = mul(seq[seq.length - 1]);
			seq.push(p);
			if (Math.hypot(p.x, p.y) > 30 || Math.hypot(p.x, p.y) < 0.02) break;
		}
		seqT = 0;
	});

	function arrow(V, p, col, w = 3) {
		const x1 = V.X(p.x);
		const y1 = V.Y(p.y);
		const ang = Math.atan2(y1 - V.cy, x1 - V.cx);
		ctx.strokeStyle = col;
		ctx.fillStyle = col;
		ctx.lineWidth = w;
		ctx.beginPath();
		ctx.moveTo(V.cx, V.cy);
		ctx.lineTo(x1 - Math.cos(ang) * 8, y1 - Math.sin(ang) * 8);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x1 + Math.cos(ang + 2.6) * 12, y1 + Math.sin(ang + 2.6) * 12);
		ctx.lineTo(x1 + Math.cos(ang - 2.6) * 12, y1 + Math.sin(ang - 2.6) * 12);
		ctx.fill();
	}

	whenVisible(canvas, (dt) => {
		clear(ctx, size);
		const V = view();
		const ext = Math.ceil(Math.max(size.w, size.h) / V.s / 2) + 1;
		// Originalgitter
		ctx.lineWidth = 1;
		ctx.strokeStyle = C.grid;
		for (let k = -ext; k <= ext; k++) {
			ctx.beginPath();
			ctx.moveTo(V.X(k), 0);
			ctx.lineTo(V.X(k), size.h);
			ctx.moveTo(0, V.Y(k));
			ctx.lineTo(size.w, V.Y(k));
			ctx.stroke();
		}
		ctx.strokeStyle = C.axis;
		ctx.beginPath();
		ctx.moveTo(0, V.cy);
		ctx.lineTo(size.w, V.cy);
		ctx.moveTo(V.cx, 0);
		ctx.lineTo(V.cx, size.h);
		ctx.stroke();
		// Verformtes Gitter
		if (showGrid) {
			ctx.strokeStyle = "rgba(122,168,255,0.22)";
			for (let k = -6; k <= 6; k++) {
				for (const dir of [0, 1]) {
					const p0 = mul(dir ? { x: k, y: -6 } : { x: -6, y: k });
					const p1 = mul(dir ? { x: k, y: 6 } : { x: 6, y: k });
					ctx.beginPath();
					ctx.moveTo(V.X(p0.x), V.Y(p0.y));
					ctx.lineTo(V.X(p1.x), V.Y(p1.y));
					ctx.stroke();
				}
			}
			// Bild des Einheitsquadrats
			const q = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }].map(mul);
			ctx.fillStyle = "rgba(122,168,255,0.12)";
			ctx.beginPath();
			q.forEach((p, i) => (i ? ctx.lineTo(V.X(p.x), V.Y(p.y)) : ctx.moveTo(V.X(p.x), V.Y(p.y))));
			ctx.fill();
		}
		// Eigenrichtungen
		const E = eig();
		if (!E.complex) {
			E.vecs.forEach((e, i) => {
				ctx.strokeStyle = C.e;
				ctx.globalAlpha = 0.75;
				ctx.lineWidth = 2;
				ctx.setLineDash([8, 6]);
				ctx.beginPath();
				ctx.moveTo(V.X(-e.x * 20), V.Y(-e.y * 20));
				ctx.lineTo(V.X(e.x * 20), V.Y(e.y * 20));
				ctx.stroke();
				ctx.setLineDash([]);
				ctx.globalAlpha = 1;
				const lx = clamp(V.X(e.x * 3.6), 24, size.w - 50);
				const ly = clamp(V.Y(e.y * 3.6), 30, size.h - 14);
				ctx.fillStyle = C.e;
				ctx.font = '12px "JetBrains Mono", monospace';
				ctx.textAlign = "left";
				ctx.fillText(`λ${i ? "₂" : "₁"}=${nf(E.ls[i], 2)}`, lx + 6, ly - 6);
			});
		}
		// Iteration
		if (seq) {
			seqT += dt * 3;
			const k = Math.min(seq.length, 1 + Math.floor(seqT));
			ctx.strokeStyle = "rgba(255,179,102,0.45)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			for (let i = 0; i < k; i++) {
				const p = seq[i];
				if (i) ctx.lineTo(V.X(p.x), V.Y(p.y));
				else ctx.moveTo(V.X(p.x), V.Y(p.y));
			}
			ctx.stroke();
			for (let i = 0; i < k; i++) {
				const p = seq[i];
				ctx.fillStyle = i === 0 ? C.a : C.c;
				ctx.beginPath();
				ctx.arc(V.X(p.x), V.Y(p.y), 4, 0, 7);
				ctx.fill();
				if (i > 0 && i < 6) {
					ctx.fillStyle = C.text;
					ctx.font = '11px "JetBrains Mono", monospace';
					ctx.fillText(`A${i > 1 ? "⁰¹²³⁴⁵⁶"[i] : ""}v`, V.X(p.x) + 6, V.Y(p.y) - 6);
				}
			}
		}
		arrow(V, mul(v), C.c);
		arrow(V, v, C.a);
		ctx.fillStyle = C.a;
		ctx.font = '600 13px "Space Grotesk", sans-serif';
		ctx.fillText("v", V.X(v.x) + 8, V.Y(v.y) + 14);
		const Av = mul(v);
		ctx.fillStyle = C.c;
		ctx.fillText("Av", V.X(Av.x) + 8, V.Y(Av.y) + 14);
	});
})();

// =====================================================================
// 5 · Hauptkomponentenanalyse
// =====================================================================
(() => {
	const canvas = document.getElementById("pcaCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.9 : 1.15));
	const projBtn = document.getElementById("pcaProj");
	let proj = true;
	let pts = [];
	let angle = 0.6;
	let drag = null;
	const corr = slider("pcaCorr", (v) => nf(v, 2), () => gen(false));
	function gen(newAngle = true) {
		if (newAngle) angle = (Math.random() - 0.5) * Math.PI;
		const rho = corr.value;
		const ca = Math.cos(angle);
		const sa = Math.sin(angle);
		const s1 = 1.6;
		const s2 = 1.6 * Math.sqrt(1 - rho) + 0.05;
		pts = Array.from({ length: 28 }, () => {
			const a = randn() * s1;
			const b = randn() * s2;
			return { x: clamp(a * ca - b * sa, -4.6, 4.6), y: clamp(a * sa + b * ca, -4.6, 4.6) };
		});
	}
	gen();
	document.getElementById("pcaNew").addEventListener("click", () => gen(true));
	projBtn.addEventListener("click", () => {
		proj = !proj;
		projBtn.setAttribute("aria-pressed", String(proj));
	});
	const stripH = () => Math.max(56, size.h * 0.16);
	const view = () => {
		const h = size.h - stripH();
		const s = Math.min(size.w, h) / 10.5;
		return { s, cx: size.w / 2, cy: h / 2, X: (x) => size.w / 2 + x * s, Y: (y) => h / 2 - y * s };
	};
	pointer(canvas, {
		down(pt) {
			const V = view();
			drag = pts.find((p) => Math.hypot(V.X(p.x) - pt.x, V.Y(p.y) - pt.y) < 14) || null;
		},
		move(pt) {
			if (!drag) return;
			const V = view();
			drag.x = clamp((pt.x - V.cx) / V.s, -5, 5);
			drag.y = clamp((V.cy - pt.y) / V.s, -5, 5);
		},
		up() {
			drag = null;
		},
	});
	function analyse() {
		const n = pts.length;
		const mx = pts.reduce((s, p) => s + p.x, 0) / n;
		const my = pts.reduce((s, p) => s + p.y, 0) / n;
		let a = 0;
		let b = 0;
		let d = 0;
		for (const p of pts) {
			a += (p.x - mx) ** 2;
			b += (p.x - mx) * (p.y - my);
			d += (p.y - my) ** 2;
		}
		a /= n - 1;
		b /= n - 1;
		d /= n - 1;
		const m = (a + d) / 2;
		const r = Math.sqrt(((a - d) / 2) ** 2 + b * b);
		const th = 0.5 * Math.atan2(2 * b, a - d);
		return { mx, my, l1: m + r, l2: Math.max(0, m - r), u: { x: Math.cos(th), y: Math.sin(th) }, w: { x: -Math.sin(th), y: Math.cos(th) } };
	}
	let tick = 0;

	whenVisible(canvas, (dt) => {
		clear(ctx, size);
		const V = view();
		const R = analyse();
		tick += dt;
		if (tick > 0.15) {
			tick = 0;
			document.getElementById("pcaV1").textContent = nf(R.l1, 2);
			document.getElementById("pcaV2").textContent = nf(R.l2, 2);
			document.getElementById("pcaExp").textContent = `${nf((100 * R.l1) / (R.l1 + R.l2), 1)} %`;
		}
		// Gitter
		ctx.strokeStyle = C.grid;
		ctx.lineWidth = 1;
		for (let k = -5; k <= 5; k++) {
			ctx.beginPath();
			ctx.moveTo(V.X(k), V.Y(-5));
			ctx.lineTo(V.X(k), V.Y(5));
			ctx.moveTo(V.X(-5), V.Y(k));
			ctx.lineTo(V.X(5), V.Y(k));
			ctx.stroke();
		}
		// Ellipse (2σ)
		ctx.save();
		ctx.translate(V.X(R.mx), V.Y(R.my));
		ctx.rotate(-Math.atan2(R.u.y, R.u.x));
		ctx.strokeStyle = "rgba(244,239,230,0.18)";
		ctx.beginPath();
		ctx.ellipse(0, 0, 2 * Math.sqrt(R.l1) * V.s, Math.max(1, 2 * Math.sqrt(R.l2) * V.s), 0, 0, 7);
		ctx.stroke();
		ctx.restore();
		// Achsen
		const axis = (u, col, len) => {
			ctx.strokeStyle = col;
			ctx.lineWidth = 1.5;
			ctx.globalAlpha = 0.5;
			ctx.beginPath();
			ctx.moveTo(V.X(R.mx - u.x * 8), V.Y(R.my - u.y * 8));
			ctx.lineTo(V.X(R.mx + u.x * 8), V.Y(R.my + u.y * 8));
			ctx.stroke();
			ctx.globalAlpha = 1;
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.moveTo(V.X(R.mx), V.Y(R.my));
			ctx.lineTo(V.X(R.mx + u.x * len), V.Y(R.my + u.y * len));
			ctx.stroke();
		};
		axis(R.w, C.b, 2 * Math.sqrt(R.l2));
		axis(R.u, C.c, 2 * Math.sqrt(R.l1));
		// Projektionen
		for (const p of pts) {
			const t = (p.x - R.mx) * R.u.x + (p.y - R.my) * R.u.y;
			const qx = R.mx + R.u.x * t;
			const qy = R.my + R.u.y * t;
			if (proj) {
				ctx.strokeStyle = "rgba(255,179,102,0.35)";
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(V.X(p.x), V.Y(p.y));
				ctx.lineTo(V.X(qx), V.Y(qy));
				ctx.stroke();
				ctx.fillStyle = C.c;
				ctx.beginPath();
				ctx.arc(V.X(qx), V.Y(qy), 2.5, 0, 7);
				ctx.fill();
			}
		}
		for (const p of pts) {
			ctx.fillStyle = p === drag ? C.ink : C.a;
			ctx.beginPath();
			ctx.arc(V.X(p.x), V.Y(p.y), 5.5, 0, 7);
			ctx.fill();
		}
		// 1D-Streifen
		const sy = size.h - stripH() / 2;
		ctx.fillStyle = "#0d0f12";
		ctx.fillRect(0, size.h - stripH(), size.w, stripH());
		ctx.strokeStyle = C.c;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(20, sy);
		ctx.lineTo(size.w - 20, sy);
		ctx.stroke();
		const sc = (size.w - 40) / 14;
		for (const p of pts) {
			const t = (p.x - R.mx) * R.u.x + (p.y - R.my) * R.u.y;
			ctx.fillStyle = C.c;
			ctx.globalAlpha = 0.8;
			ctx.beginPath();
			ctx.arc(size.w / 2 + t * sc, sy, 5, 0, 7);
			ctx.fill();
			ctx.globalAlpha = 1;
		}
		ctx.fillStyle = C.text;
		ctx.font = '11px "Space Grotesk", sans-serif';
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText("Dieselben Punkte in 1D: nur ihre Lage entlang Achse 1", 12, size.h - stripH() + 6);
	});
})();

// =====================================================================
// 6 · Bildfilter (Faltung)
// =====================================================================
(() => {
	const src = document.getElementById("kSrc");
	const dst = document.getElementById("kDst");
	const W = 80;
	const H = 56;
	const S = fitCanvas(src, W / H);
	const D = fitCanvas(dst, W / H);
	const tag = document.getElementById("kTag");
	const calc = document.getElementById("kCalc");
	const grid = document.getElementById("kInputs");
	let img = new Float32Array(W * H);
	let out = new Float32Array(W * H);
	let hover = { x: 40, y: 28 };
	const presets = [
		{ label: "Identität", k: ["0", "0", "0", "0", "1", "0", "0", "0", "0"] },
		{ label: "Unschärfe", k: ["1/16", "2/16", "1/16", "2/16", "4/16", "2/16", "1/16", "2/16", "1/16"] },
		{ label: "Schärfen", k: ["0", "-1", "0", "-1", "5", "-1", "0", "-1", "0"] },
		{ label: "Kanten", k: ["-1", "-1", "-1", "-1", "8", "-1", "-1", "-1", "-1"] },
		{ label: "Sobel oben", k: ["1", "2", "1", "0", "0", "0", "-1", "-2", "-1"] },
		{ label: "Relief", k: ["-2", "-1", "0", "-1", "1", "1", "0", "1", "2"] },
	];
	let kText = presets[1].k.slice();
	let K = [];
	const parse = (s) => {
		s = s.replace(",", ".").trim();
		if (s.includes("/")) {
			const [a, b] = s.split("/").map(Number);
			return b ? a / b : 0;
		}
		const v = Number(s);
		return Number.isFinite(v) ? v : 0;
	};
	const inputs = kText.map((_, k) => {
		const inp = document.createElement("input");
		inp.type = "text";
		inp.setAttribute("aria-label", `Gewicht ${k + 1}`);
		inp.addEventListener("input", () => {
			kText[k] = inp.value;
			pc.set(-1, true);
			tag.textContent = "Eigener Kern";
			apply();
		});
		grid.appendChild(inp);
		return inp;
	});
	const pc = chips(document.getElementById("kPresets"), presets, (i, it) => {
		kText = it.k.slice();
		inputs.forEach((inp, k) => (inp.value = kText[k]));
		tag.textContent = it.label;
		apply();
	}, 1);
	inputs.forEach((inp, k) => (inp.value = kText[k]));
	tag.textContent = presets[1].label;

	// Prozedurales Testbild
	function makeImage() {
		const c = document.createElement("canvas");
		c.width = W;
		c.height = H;
		const g = c.getContext("2d");
		const grad = g.createLinearGradient(0, 0, 0, H);
		grad.addColorStop(0, "#9a9a9a");
		grad.addColorStop(1, "#2a2a2a");
		g.fillStyle = grad;
		g.fillRect(0, 0, W, H);
		g.fillStyle = "#f2f2f2";
		g.beginPath();
		g.arc(58, 17, 10, 0, 7);
		g.fill();
		g.fillStyle = "#151515";
		g.beginPath();
		g.moveTo(0, H);
		g.lineTo(22, 26);
		g.lineTo(38, 40);
		g.lineTo(52, 30);
		g.lineTo(W, H);
		g.fill();
		g.fillStyle = "#d8d8d8";
		g.fillRect(8, 6, 20, 12);
		g.fillStyle = "#000";
		g.font = "bold 10px sans-serif";
		g.fillText("Q", 13, 16);
		g.strokeStyle = "#ffffff";
		g.lineWidth = 1;
		g.beginPath();
		g.moveTo(30, 52);
		g.lineTo(76, 36);
		g.stroke();
		read(g);
	}
	function read(g) {
		const d = g.getImageData(0, 0, W, H).data;
		for (let i = 0; i < W * H; i++) img[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
		apply();
	}
	const px = (x, y) => img[clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)];
	function apply() {
		K = kText.map(parse);
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				let s = 0;
				for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += K[(j + 1) * 3 + (i + 1)] * px(x + i, y + j);
				out[y * W + x] = s;
			}
		render();
	}
	const small = (arr) => {
		const c = document.createElement("canvas");
		c.width = W;
		c.height = H;
		const g = c.getContext("2d");
		const id = g.createImageData(W, H);
		for (let i = 0; i < W * H; i++) {
			const v = clamp(Math.round(arr[i]), 0, 255);
			id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v;
			id.data[i * 4 + 3] = 255;
		}
		g.putImageData(id, 0, 0);
		return c;
	};
	function render() {
		const a = small(img);
		const b = small(out);
		for (const [cv, im] of [[S, a], [D, b]]) {
			cv.ctx.imageSmoothingEnabled = false;
			cv.ctx.drawImage(im, 0, 0, cv.size.w, cv.size.h);
		}
		const box = (cv, r) => {
			const sx = cv.size.w / W;
			const sy = cv.size.h / H;
			cv.ctx.strokeStyle = C.b;
			cv.ctx.lineWidth = 2;
			cv.ctx.strokeRect((hover.x - r) * sx, (hover.y - r) * sy, (2 * r + 1) * sx, (2 * r + 1) * sy);
		};
		box(S, 1);
		box(D, 0);
		// Rechnung
		const cell = (v, k) => {
			const g = clamp(Math.round(v), 0, 255);
			return `<td style="background: rgb(${g},${g},${g}); color: ${g > 130 ? "#000" : "#fff"}">${k}</td>`;
		};
		let t1 = "<table>";
		let t2 = "<table>";
		for (let j = -1; j <= 1; j++) {
			t1 += "<tr>";
			t2 += "<tr>";
			for (let i = -1; i <= 1; i++) {
				t1 += cell(px(hover.x + i, hover.y + j), Math.round(px(hover.x + i, hover.y + j)));
				const k = K[(j + 1) * 3 + (i + 1)];
				t2 += `<td style="background: ${k > 0 ? "rgba(107,227,168,0.25)" : k < 0 ? "rgba(255,122,156,0.25)" : "#14171b"}; color: var(--ink)">${Number.isInteger(k) ? k : nf(k, 2)}</td>`;
			}
			t1 += "</tr>";
			t2 += "</tr>";
		}
		const r = out[hover.y * W + hover.x];
		calc.innerHTML = `${t1}</table><span class="eq">×</span>${t2}</table><span class="eq">= ${nf(r, 0)}</span><span>→ angezeigt ${clamp(Math.round(r), 0, 255)}</span>`;
	}
	const setHover = (pt) => {
		if (!pt) return;
		hover = { x: clamp(Math.floor((pt.x / S.size.w) * W), 0, W - 1), y: clamp(Math.floor((pt.y / S.size.h) * H), 0, H - 1) };
		render();
	};
	pointer(src, { down: setHover, move: setHover, hover: setHover });
	window.addEventListener("resize", render);
	document.getElementById("kFile").addEventListener("change", (e) => {
		const f = e.target.files[0];
		if (!f) return;
		const im = new Image();
		im.onload = () => {
			const c = document.createElement("canvas");
			c.width = W;
			c.height = H;
			const g = c.getContext("2d");
			const s = Math.max(W / im.width, H / im.height);
			g.drawImage(im, (W - im.width * s) / 2, (H - im.height * s) / 2, im.width * s, im.height * s);
			read(g);
			URL.revokeObjectURL(im.src);
		};
		im.src = URL.createObjectURL(f);
	});
	makeImage();
})();
