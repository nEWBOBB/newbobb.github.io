"use strict";

// =====================================================================
// Gemeinsame Helfer
// =====================================================================
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nf = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
const pct = (v) => `${nf(v * 100)} %`;

// Klassenfarben: Rot ●, Blau ▲, Grün ■ und weitere für k-Means
const COL = ["#ff7a8a", "#6bb8ff", "#c6f16b", "#ffd166", "#b59cff", "#ff9f5a", "#7ee0c3"];
const RGB = COL.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
const CLS_NAME = ["Rot", "Blau", "Grün"];
const CLS_MARK = ["●", "▲", "■"];
const BG = [7, 6, 5];
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// Zufall mit Startwert, damit die ersten Daten immer gleich aussehen
function rng(seed) {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

// Ein Koordinatensystem auf einem Canvas. Daten liegen in [0, 1] × [0, 1], y zeigt nach oben.
function makeView(canvas, aspect, pad = {}) {
	const v = { draw: null, canvas };
	const P = { l: 34, r: 16, t: 48, b: 30, ...pad };
	const { ctx, size } = fitCanvas(canvas, aspect, () => v.draw && v.draw());
	v.ctx = ctx;
	v.size = size;
	v.pw = () => size.w - P.l - P.r;
	v.ph = () => size.h - P.t - P.b;
	v.X = (x) => P.l + x * v.pw();
	v.Y = (y) => size.h - P.b - y * v.ph();
	v.at = (e) => {
		const r = canvas.getBoundingClientRect();
		return [(e.clientX - r.left - P.l) / v.pw(), (size.h - P.b - (e.clientY - r.top)) / v.ph()];
	};
	v.inside = ([x, y]) => x >= -0.02 && x <= 1.02 && y >= -0.02 && y <= 1.02;
	// Index des Punktes unter dem Zeiger (in Pixeln gemessen) oder -1
	v.near = (e, pts, getY = (p) => p.y) => {
		const r = canvas.getBoundingClientRect();
		const mx = e.clientX - r.left;
		const my = e.clientY - r.top;
		let best = -1;
		let bd = e.pointerType === "mouse" ? 10 : 16;
		pts.forEach((p, i) => {
			const d = Math.hypot(v.X(p.x) - mx, v.Y(getY(p)) - my);
			if (d < bd) {
				bd = d;
				best = i;
			}
		});
		return best;
	};
	v.clear = () => ctx.clearRect(0, 0, size.w, size.h);
	v.clip = () => {
		ctx.save();
		ctx.beginPath();
		ctx.rect(v.X(0), v.Y(1), v.pw(), v.ph());
		ctx.clip();
	};
	v.axes = (xl, yl, grid = true) => {
		if (grid) {
			ctx.strokeStyle = "rgba(255,255,255,0.05)";
			ctx.lineWidth = 1;
			ctx.beginPath();
			for (let i = 1; i < 10; i++) {
				const gx = Math.round(v.X(i / 10)) + 0.5;
				const gy = Math.round(v.Y(i / 10)) + 0.5;
				ctx.moveTo(gx, v.Y(0));
				ctx.lineTo(gx, v.Y(1));
				ctx.moveTo(v.X(0), gy);
				ctx.lineTo(v.X(1), gy);
			}
			ctx.stroke();
		}
		ctx.strokeStyle = "rgba(255,255,255,0.4)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(v.X(0), v.Y(1) - 4);
		ctx.lineTo(v.X(0), v.Y(0));
		ctx.lineTo(v.X(1) + 4, v.Y(0));
		ctx.stroke();
		ctx.fillStyle = "rgba(244,239,230,0.45)";
		ctx.font = "12px 'Space Grotesk', sans-serif";
		if (xl) {
			ctx.textAlign = "center";
			ctx.textBaseline = "alphabetic";
			ctx.fillText(xl, v.X(0.5), size.h - 8);
		}
		if (yl) {
			ctx.save();
			ctx.translate(13, v.Y(0.5));
			ctx.rotate(-Math.PI / 2);
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(yl, 0, 0);
			ctx.restore();
		}
	};
	return v;
}

// Datenpunkt einer Klasse zeichnen: Kreis, Dreieck oder Quadrat
function mark(ctx, px, py, cls, r = 5.5, alpha = 1) {
	ctx.globalAlpha = alpha;
	ctx.fillStyle = cls < 0 ? "#8a8580" : COL[cls];
	ctx.beginPath();
	if (cls === 1) {
		const k = r * 1.25;
		ctx.moveTo(px, py - k);
		ctx.lineTo(px + k * 0.95, py + k * 0.7);
		ctx.lineTo(px - k * 0.95, py + k * 0.7);
		ctx.closePath();
	} else if (cls === 2) {
		ctx.rect(px - r * 0.9, py - r * 0.9, r * 1.8, r * 1.8);
	} else {
		ctx.arc(px, py, r, 0, Math.PI * 2);
	}
	ctx.fill();
	ctx.strokeStyle = "rgba(0,0,0,0.6)";
	ctx.lineWidth = 1.2;
	ctx.stroke();
	ctx.globalAlpha = 1;
}

function ring(ctx, px, py, r, color = "#f4efe6", dashed = false) {
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.6;
	ctx.setLineDash(dashed ? [3, 3] : []);
	ctx.beginPath();
	ctx.arc(px, py, r, 0, Math.PI * 2);
	ctx.stroke();
	ctx.setLineDash([]);
}

// Hintergrund-Karte: fn(x, y) liefert [r, g, b] für jede Zelle. Wird klein gerechnet und weich hochskaliert.
function paintMap(v, cell, fn) {
	const cols = Math.max(2, Math.round(v.pw() / cell));
	const rows = Math.max(2, Math.round(v.ph() / cell));
	const off = document.createElement("canvas");
	off.width = cols;
	off.height = rows;
	const c = off.getContext("2d");
	const img = c.createImageData(cols, rows);
	const d = img.data;
	for (let j = 0; j < rows; j++) {
		for (let i = 0; i < cols; i++) {
			const col = fn((i + 0.5) / cols, 1 - (j + 0.5) / rows);
			const k = (j * cols + i) * 4;
			d[k] = col[0];
			d[k + 1] = col[1];
			d[k + 2] = col[2];
			d[k + 3] = 255;
		}
	}
	c.putImageData(img, 0, 0);
	return off;
}

function blit(v, off) {
	v.ctx.imageSmoothingEnabled = true;
	v.ctx.drawImage(off, v.X(0), v.Y(1), v.pw(), v.ph());
}

// Balkenliste: rows = [{ label, value (0..1), text, color, cls }]
function bars(box, rows) {
	while (box.children.length > rows.length) box.lastChild.remove();
	rows.forEach((r, i) => {
		let row = box.children[i];
		if (!row) {
			row = document.createElement("div");
			row.innerHTML = '<span></span><div class="track"><div class="fill"></div></div><output></output>';
			box.appendChild(row);
		}
		row.className = "prob" + (r.cls ? ` ${r.cls}` : "");
		row.dataset.i = i;
		row.children[0].textContent = r.label;
		const fill = row.querySelector(".fill");
		fill.style.width = `${(clamp(r.value, 0, 1) * 100).toFixed(1)}%`;
		if (r.color) fill.style.setProperty("--bar", r.color);
		else fill.style.removeProperty("--bar");
		row.children[2].textContent = r.text;
	});
}

function press(btn, on) {
	btn.setAttribute("aria-pressed", on ? "true" : "false");
}

// Segmentierte Knöpfe (aria-pressed) mit data-Attribut
function segmented(attr, onPick) {
	const btns = [...document.querySelectorAll(`[${attr}]`)];
	btns.forEach((b) =>
		b.addEventListener("click", () => {
			btns.forEach((x) => press(x, x === b));
			onPick(b.getAttribute(attr));
		})
	);
}

const aspect2d = (w) => (w < 520 ? 1.02 : 1.32);

// =====================================================================
// 1 · Lineare Regression
// =====================================================================
(() => {
	const v = makeView($("linCanvas"), aspect2d);
	const sm = $("linM");
	const sb = $("linB");
	const btnRun = $("linRun");
	const btnSq = $("linSq");
	const readout = $("linReadout");
	const note = $("linNote");

	let pts = [];
	let m = 0;
	let b = 0.5;
	let running = false;
	let anim = null; // { from: [m, b], to: [m, b], t }
	let steps = 0;
	let acc = 0;
	let showSq = false;

	function gen(r = Math.random) {
		const tm = 0.45 + r() * 0.4;
		const tb = 0.08 + r() * 0.18;
		pts = Array.from({ length: 14 }, () => {
			const x = 0.05 + r() * 0.9;
			return { x, y: clamp(tb + tm * x + gauss(r) * 0.07, 0.03, 0.97) };
		});
	}

	const mse = (mm = m, bb = b) =>
		pts.length ? pts.reduce((s, p) => s + (p.y - (mm * p.x + bb)) ** 2, 0) / pts.length : 0;

	function ols() {
		const n = pts.length;
		if (!n) return [0, 0.5];
		const mx = pts.reduce((s, p) => s + p.x, 0) / n;
		const my = pts.reduce((s, p) => s + p.y, 0) / n;
		let sxy = 0;
		let sxx = 0;
		for (const p of pts) {
			sxy += (p.x - mx) * (p.y - my);
			sxx += (p.x - mx) ** 2;
		}
		const mm = sxx > 1e-9 ? sxy / sxx : 0;
		return [mm, my - mm * mx];
	}

	// Ein Schritt Gradientenabstieg auf dem mittleren quadratischen Fehler
	function gdStep(lr = 0.7) {
		const n = pts.length;
		if (!n) return 0;
		let gm = 0;
		let gb = 0;
		for (const p of pts) {
			const r = p.y - (m * p.x + b);
			gm += (-2 / n) * p.x * r;
			gb += (-2 / n) * r;
		}
		m -= lr * gm;
		b -= lr * gb;
		steps++;
		return Math.hypot(gm, gb);
	}

	function syncSliders() {
		sm.value = m;
		sb.value = b;
		[sm, sb].forEach((r) => r.style.setProperty("--fill", `${((r.value - r.min) / (r.max - r.min)) * 100}%`));
		$("linMOut").textContent = nf(m, 2);
		$("linBOut").textContent = nf(b, 2);
	}

	function setRunning(on) {
		running = on && pts.length > 0;
		press(btnRun, running);
		btnRun.textContent = running ? "Anhalten" : "Gradientenabstieg";
	}

	function draw() {
		const { ctx } = v;
		v.clear();
		v.axes("Wohnfläche x", "Preis y");
		v.clip();
		// Fehlerquadrate und Abstände
		for (const p of pts) {
			const px = v.X(p.x);
			const py = v.Y(p.y);
			const qy = v.Y(m * p.x + b);
			if (showSq) {
				const s = Math.abs(qy - py);
				ctx.fillStyle = "rgba(255,138,122,0.10)";
				ctx.strokeStyle = "rgba(255,138,122,0.45)";
				ctx.lineWidth = 1;
				ctx.fillRect(px, Math.min(py, qy), s, s);
				ctx.strokeRect(px, Math.min(py, qy), s, s);
			}
			ctx.strokeStyle = "rgba(255,138,122,0.85)";
			ctx.setLineDash([3, 3]);
			ctx.lineWidth = 1.4;
			ctx.beginPath();
			ctx.moveTo(px, py);
			ctx.lineTo(px, qy);
			ctx.stroke();
			ctx.setLineDash([]);
		}
		// Gerade
		ctx.strokeStyle = "#6bb8ff";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(v.X(-0.1), v.Y(b - 0.1 * m));
		ctx.lineTo(v.X(1.1), v.Y(b + 1.1 * m));
		ctx.stroke();
		ctx.restore();
		for (const p of pts) mark(ctx, v.X(p.x), v.Y(p.y), 0);

		const e = mse();
		readout.innerHTML = `ŷ = ${nf(m, 2)} · x + ${nf(b, 2)}<br>Fehler (MSE) ${nf(e * 100, 2)}`;
		if (!pts.length) {
			note.textContent = "Keine Punkte. Tippe in die Fläche, um welche zu setzen.";
			return;
		}
		const best = mse(...ols());
		const ratio = e / Math.max(best, 1e-9);
		if (running || anim) note.textContent = `Gradientenabstieg: Schritt ${steps}. Die Gerade rutscht bergab im Fehlergebirge.`;
		else if (ratio < 1.01) note.textContent = `Besser geht es mit einer Geraden nicht: Das ist das Minimum (MSE ${nf(best * 100, 2)}).`;
		else if (ratio < 1.5) note.textContent = `Schon nah dran. Das Minimum liegt bei ${nf(best * 100, 2)}.`;
		else note.textContent = `Dein Fehler ist ${nf(ratio, 1)}-mal so groß wie das Minimum. Die roten Striche zeigen, wie weit jeder Punkt danebenliegt.`;
		syncSliders();
	}
	v.draw = draw;

	whenVisible(v.canvas, (dt) => {
		if (anim) {
			anim.t = Math.min(1, anim.t + dt / 0.6);
			const k = anim.t < 0.5 ? 2 * anim.t * anim.t : 1 - (-2 * anim.t + 2) ** 2 / 2;
			m = anim.from[0] + (anim.to[0] - anim.from[0]) * k;
			b = anim.from[1] + (anim.to[1] - anim.from[1]) * k;
			if (anim.t >= 1) anim = null;
			draw();
		} else if (running) {
			acc += dt;
			let g = 1;
			while (acc > 1 / 30) {
				acc -= 1 / 30;
				g = gdStep();
			}
			if (g < 2e-4) setRunning(false);
			draw();
		}
	});

	btnRun.addEventListener("click", () => {
		anim = null;
		if (!running) steps = 0;
		setRunning(!running);
		draw();
	});
	$("linSolve").addEventListener("click", () => {
		setRunning(false);
		anim = { from: [m, b], to: ols(), t: 0 };
	});
	btnSq.addEventListener("click", () => {
		showSq = !showSq;
		press(btnSq, showSq);
		draw();
	});
	$("linNew").addEventListener("click", () => {
		gen();
		draw();
	});
	[sm, sb].forEach((r) =>
		r.addEventListener("input", () => {
			setRunning(false);
			anim = null;
			m = Number(sm.value);
			b = Number(sb.value);
			draw();
		})
	);
	v.canvas.addEventListener("pointerdown", (e) => {
		const i = v.near(e, pts);
		if (i >= 0) pts.splice(i, 1);
		else {
			const [x, y] = v.at(e);
			if (!v.inside([x, y])) return;
			pts.push({ x: clamp(x, 0, 1), y: clamp(y, 0, 1) });
		}
		if (!pts.length) setRunning(false);
		draw();
	});

	gen(rng(7));
	draw();
})();

// =====================================================================
// 2 · Logistische Regression
// =====================================================================
(() => {
	const v = makeView($("logCanvas"), aspect2d, { l: 46, b: 44 });
	const probe = $("logProbe");
	const btnRun = $("logRun");
	const readout = $("logReadout");
	const note = $("logNote");

	let pts = []; // { x, c }   c = 1 bestanden, 0 durchgefallen
	let w = 0;
	let b = 0;
	let running = false;

	const sig = (z) => 1 / (1 + Math.exp(-z));
	const p = (x) => sig(w * (x - 0.5) + b);

	function gen(r = Math.random) {
		const t = 0.38 + r() * 0.25;
		pts = Array.from({ length: 18 }, () => {
			const x = 0.04 + r() * 0.92;
			return { x, c: x + gauss(r) * 0.1 > t ? 1 : 0 };
		});
	}

	function step(lr = 12) {
		const n = pts.length;
		if (!n) return 0;
		let gw = 0;
		let gb = 0;
		for (const q of pts) {
			const err = p(q.x) - q.c;
			gw += (err * (q.x - 0.5)) / n;
			gb += err / n;
		}
		gw += 0.0004 * w; // ein Hauch Regularisierung, sonst wird w bei trennbaren Daten unendlich
		w = clamp(w - lr * 4 * gw, -90, 90);
		b = clamp(b - lr * gb, -40, 40);
		return Math.hypot(gw, gb);
	}

	function stats() {
		let loss = 0;
		let ok = 0;
		for (const q of pts) {
			const pp = clamp(p(q.x), 1e-9, 1 - 1e-9);
			loss -= q.c ? Math.log(pp) : Math.log(1 - pp);
			if ((pp >= 0.5 ? 1 : 0) === q.c) ok++;
		}
		return { loss: pts.length ? loss / pts.length : 0, ok };
	}

	function setRunning(on) {
		running = on && pts.length > 0;
		press(btnRun, running);
		btnRun.textContent = running ? "Anhalten" : "Trainieren";
	}

	const yOf = (q) => (q.c ? 0.96 : 0.04);

	function draw() {
		const { ctx } = v;
		v.clear();
		// Bereiche links und rechts der Grenze
		const x0 = Math.abs(w) > 1e-6 ? 0.5 - b / w : b >= 0 ? -1 : 2;
		v.clip();
		const xb = clamp(x0, 0, 1);
		const leftCls = w >= 0 ? 0 : 1;
		ctx.fillStyle = `rgba(${RGB[leftCls]},0.07)`;
		ctx.fillRect(v.X(0), v.Y(1), v.X(xb) - v.X(0), v.ph());
		ctx.fillStyle = `rgba(${RGB[1 - leftCls]},0.07)`;
		ctx.fillRect(v.X(xb), v.Y(1), v.X(1) - v.X(xb), v.ph());
		ctx.restore();
		v.axes("Lernstunden", "P(bestanden)");

		ctx.fillStyle = "rgba(244,239,230,0.4)";
		ctx.font = "11px 'JetBrains Mono', monospace";
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";
		ctx.fillText("1", v.X(0) - 6, v.Y(1));
		ctx.fillText("0,5", v.X(0) - 6, v.Y(0.5));
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		for (const h of [0, 5, 10]) ctx.fillText(`${h} h`, v.X(h / 10), v.Y(0) + 4);

		// 50-%-Linie
		ctx.strokeStyle = "rgba(255,255,255,0.25)";
		ctx.setLineDash([5, 5]);
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(v.X(0), v.Y(0.5));
		ctx.lineTo(v.X(1), v.Y(0.5));
		ctx.stroke();
		// Entscheidungsgrenze
		if (x0 > 0 && x0 < 1) {
			ctx.strokeStyle = "#7ee0c3";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(v.X(x0), v.Y(0));
			ctx.lineTo(v.X(x0), v.Y(1));
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = "#7ee0c3";
			ctx.textAlign = x0 > 0.8 ? "right" : "left";
			ctx.textBaseline = "top";
			ctx.font = "12px 'Space Grotesk', sans-serif";
			ctx.fillText("Grenze", v.X(x0) + (x0 > 0.8 ? -6 : 6), v.Y(1) + 2);
		}
		ctx.setLineDash([]);

		// Sigmoid
		ctx.strokeStyle = "#6bb8ff";
		ctx.lineWidth = 3;
		ctx.beginPath();
		for (let i = 0; i <= 200; i++) {
			const x = i / 200;
			const fn = i ? "lineTo" : "moveTo";
			ctx[fn](v.X(x), v.Y(p(x)));
		}
		ctx.stroke();

		for (const q of pts) mark(ctx, v.X(q.x), v.Y(yOf(q)), q.c ? 1 : 0);

		// Prüfwert
		const xp = Number(probe.value);
		const pp = p(xp);
		ctx.strokeStyle = "#ffd166";
		ctx.lineWidth = 1.5;
		ctx.setLineDash([2, 4]);
		ctx.beginPath();
		ctx.moveTo(v.X(xp), v.Y(0));
		ctx.lineTo(v.X(xp), v.Y(pp));
		ctx.lineTo(v.X(0), v.Y(pp));
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.fillStyle = "#ffd166";
		ctx.beginPath();
		ctx.arc(v.X(xp), v.Y(pp), 6, 0, Math.PI * 2);
		ctx.fill();

		$("logProbeOut").textContent = `${nf(xp * 10, 1)} h`;
		const s = stats();
		readout.innerHTML = `Log-Loss ${nf(s.loss, 2)}<br>${s.ok}/${pts.length} richtig`;
		note.innerHTML =
			`Bei ${nf(xp * 10, 1)} Stunden sagt das Modell: <b>${pct(pp)}</b> Chance zu bestehen, also ` +
			`<b class="${pp >= 0.5 ? "cls-b" : "cls-a"}">${pp >= 0.5 ? "bestanden ▲" : "durchgefallen ●"}</b>.` +
			(Math.abs(w) < 1e-6 && !running ? " Noch untrainiert: Die Kurve ist flach bei 50 %." : "");
	}
	v.draw = draw;

	whenVisible(v.canvas, () => {
		if (!running) return;
		let g = 0;
		for (let i = 0; i < 6; i++) g = step();
		if (g < 1e-5) setRunning(false);
		draw();
	});

	btnRun.addEventListener("click", () => {
		setRunning(!running);
		draw();
	});
	$("logNew").addEventListener("click", () => {
		gen();
		w = 0;
		b = 0;
		draw();
	});
	$("logClear").addEventListener("click", () => {
		pts = [];
		w = 0;
		b = 0;
		setRunning(false);
		draw();
	});
	probe.addEventListener("input", draw);
	v.canvas.addEventListener("pointerdown", (e) => {
		const i = v.near(e, pts, yOf);
		if (i >= 0) pts.splice(i, 1);
		else {
			const [x, y] = v.at(e);
			if (!v.inside([x, y])) return;
			pts.push({ x: clamp(x, 0, 1), c: y > 0.5 ? 1 : 0 });
		}
		if (!pts.length) setRunning(false);
		else if (!running) setRunning(true);
		draw();
	});

	gen(rng(11));
	draw();
})();

// =====================================================================
// 3 · Entscheidungsbaum (ID3 mit Entropie)
// =====================================================================
(() => {
	const wrap = $("treeWrap");
	const gainsBox = $("treeGains");
	const gainHead = $("treeGainHead");
	const note = $("treeNote");
	const table = $("treeTable");
	const dayBox = $("treeDay");
	const dayNote = $("treeDayNote");

	const FEATS = [
		{ name: "Wetter", vals: ["Sonnig", "Bewölkt", "Regen"] },
		{ name: "Temperatur", vals: ["heiß", "mild", "kühl"] },
		{ name: "Luftfeuchte", vals: ["hoch", "normal"] },
		{ name: "Wind", vals: ["schwach", "stark"] },
	];
	// Die klassischen 14 Tennistage (Quinlan 1986): Wetter, Temperatur, Luftfeuchte, Wind, Spielen
	const O = [0, 0, 1, 2, 2, 2, 1, 0, 0, 2, 0, 1, 1, 2];
	const T = [0, 0, 0, 1, 2, 2, 2, 1, 2, 1, 1, 1, 0, 1];
	const H = [0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0];
	const W = [0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1];
	const Y = [0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0];
	const ROWS = O.map((_, i) => [O[i], T[i], H[i], W[i]]);

	const log2 = (x) => Math.log(x) / Math.LN2;
	const yes = (rows) => rows.filter((i) => Y[i]).length;
	function entropy(rows) {
		if (!rows.length) return 0;
		const p = yes(rows) / rows.length;
		return p <= 0 || p >= 1 ? 0 : -p * log2(p) - (1 - p) * log2(1 - p);
	}
	function gain(rows, f) {
		let rest = 0;
		FEATS[f].vals.forEach((_, val) => {
			const sub = rows.filter((i) => ROWS[i][f] === val);
			rest += (sub.length / rows.length) * entropy(sub);
		});
		return entropy(rows) - rest;
	}

	let nextId = 0;
	const nodes = new Map();
	const mkNode = (rows, parent, val) => {
		const n = { id: nextId++, rows, parent, val, feat: null, kids: [] };
		nodes.set(n.id, n);
		return n;
	};
	let root;
	let sel;

	const usedFeats = (n) => {
		const s = new Set();
		for (let p = n.parent; p; p = p.parent) s.add(p.feat);
		return s;
	};
	const freeFeats = (n) => FEATS.map((_, f) => f).filter((f) => !usedFeats(n).has(f));
	const isPure = (n) => entropy(n.rows) === 0;

	function forget(n) {
		for (const k of n.kids) forget(k);
		if (n !== root) nodes.delete(n.id);
	}

	function split(n, f) {
		n.kids.forEach(forget);
		n.feat = f;
		n.kids = FEATS[f].vals
			.map((_, val) => [val, n.rows.filter((i) => ROWS[i][f] === val)])
			.filter(([, rows]) => rows.length)
			.map(([val, rows]) => mkNode(rows, n, val));
	}

	function bestFeat(n) {
		let best = -1;
		let bg = -1;
		for (const f of freeFeats(n)) {
			const g = gain(n.rows, f);
			if (g > bg + 1e-12) {
				bg = g;
				best = f;
			}
		}
		return best;
	}

	// Nächster Knoten, der noch geteilt werden kann (Breitensuche)
	function nextOpen() {
		const q = [root];
		while (q.length) {
			const n = q.shift();
			if (n.feat === null && !isPure(n) && freeFeats(n).length) return n;
			q.push(...n.kids);
		}
		return null;
	}

	function growAll(n) {
		if (isPure(n) || !freeFeats(n).length) return;
		split(n, bestFeat(n));
		n.kids.forEach(growAll);
	}

	function reset() {
		nodes.clear();
		nextId = 0;
		root = mkNode(ROWS.map((_, i) => i), null, null);
		sel = root;
	}

	// ---------- Neuer Tag ----------
	const day = [0, 1, 0, 0];
	FEATS.forEach((f, fi) => {
		const lab = document.createElement("label");
		lab.textContent = f.name;
		const s = document.createElement("select");
		f.vals.forEach((val, vi) => s.add(new Option(val, vi, false, vi === day[fi])));
		s.addEventListener("change", () => {
			day[fi] = Number(s.value);
			render();
		});
		lab.appendChild(s);
		dayBox.appendChild(lab);
	});

	function dayPath() {
		const path = [root];
		let n = root;
		while (n.feat !== null) {
			const k = n.kids.find((c) => c.val === day[n.feat]);
			if (!k) break;
			path.push(k);
			n = k;
		}
		return path;
	}

	// ---------- Darstellung ----------
	const NW = 124;
	const NH = 58;
	const GX = 16;
	const LH = 112;

	function layout() {
		let leaf = 0;
		let depth = 0;
		const place = (n, d) => {
			n.y = 20 + d * LH;
			depth = Math.max(depth, d);
			if (!n.kids.length) {
				n.x = leaf * (NW + GX) + NW / 2;
				leaf++;
			} else {
				n.kids.forEach((k) => place(k, d + 1));
				n.x = (n.kids[0].x + n.kids[n.kids.length - 1].x) / 2;
			}
		};
		place(root, 0);
		return { w: Math.max(leaf * (NW + GX) - GX, NW), h: 20 + depth * LH + NH + 8 };
	}

	const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

	function drawTree(path) {
		const { w, h } = layout();
		const onPath = new Set(path);
		let edges = "";
		let boxes = "";
		const walk = (n) => {
			for (const k of n.kids) {
				const hot = onPath.has(n) && onPath.has(k);
				const y1 = n.y + NH;
				const y2 = k.y - 16;
				edges += `<path class="tedge${hot ? " is-path" : ""}" d="M${n.x} ${y1} C${n.x} ${(y1 + y2) / 2} ${k.x} ${(y1 + y2) / 2} ${k.x} ${y2}"/>`;
				edges += `<text class="tlabel" x="${k.x}" y="${k.y - 4}">${esc(FEATS[n.feat].vals[k.val])}</text>`;
				walk(k);
			}
			const yN = yes(n.rows);
			const nN = n.rows.length - yN;
			const pure = isPure(n);
			const leafCls = n.feat === null && pure ? (yN ? " leaf-yes" : " leaf-no") : "";
			const title = n.feat !== null ? `${FEATS[n.feat].name}?` : pure ? (yN ? "Ja, spielen" : "Nein") : "?";
			const bw = NW - 24;
			boxes += `<g class="tnode${n === sel ? " is-sel" : ""}${onPath.has(n) && path.length > 1 ? " is-path" : ""}${leafCls}" data-id="${n.id}" transform="translate(${n.x - NW / 2} ${n.y})" role="button" tabindex="0" aria-label="${esc(title)}, ${yN} Ja, ${nN} Nein">
				<rect class="box" width="${NW}" height="${NH}" rx="12"/>
				<text x="${NW / 2}" y="22" font-size="15" font-weight="600">${esc(title)}</text>
				<text class="sub" x="${NW / 2}" y="39">${yN} Ja · ${nN} Nein</text>
				<rect x="12" y="45" width="${bw}" height="5" rx="2.5" fill="#ff8a7a" opacity="0.75"/>
				<rect x="12" y="45" width="${(bw * yN) / n.rows.length}" height="5" rx="2.5" fill="#7bdc9a"/>
			</g>`;
		};
		walk(root);
		const vw = Math.max(w, 300);
		const ox = (vw - w) / 2;
		wrap.innerHTML = `<svg viewBox="${-ox - 4} 0 ${vw + 8} ${h}" style="max-height:${Math.max(220, h)}px" aria-label="Entscheidungsbaum">${edges}${boxes}</svg>`;
	}

	function drawGains() {
		const H0 = entropy(sel.rows);
		const free = freeFeats(sel);
		const where = sel === root ? "Alle 14 Tage" : `Knoten ${FEATS[sel.parent.feat].name} = ${FEATS[sel.parent.feat].vals[sel.val]}`;
		gainHead.textContent = `${where} · Entropie ${nf(H0, 3)} bit`;
		if (H0 === 0) {
			bars(gainsBox, []);
			note.textContent = `Dieser Knoten ist rein: Alle ${sel.rows.length} Tage sagen „${yes(sel.rows) ? "Ja" : "Nein"}“. Hier gibt es nichts mehr zu fragen.`;
			return;
		}
		if (!free.length) {
			bars(gainsBox, []);
			note.textContent = "Alle Fragen sind auf diesem Weg schon gestellt. Der Knoten bleibt gemischt.";
			return;
		}
		const gs = free.map((f) => ({ f, g: gain(sel.rows, f) }));
		const best = Math.max(...gs.map((x) => x.g));
		bars(
			gainsBox,
			gs.map(({ f, g }) => ({
				label: `${FEATS[f].name}?`,
				value: g / H0,
				text: `${nf(g, 3)} bit`,
				cls: `is-btn${g === best ? " is-best" : ""}`,
			}))
		);
		[...gainsBox.children].forEach((row, i) => {
			row.dataset.f = gs[i].f;
			row.setAttribute("role", "button");
			row.tabIndex = 0;
		});
		const done = sel.feat !== null ? ` Gerade fragt er nach ${FEATS[sel.feat].name}.` : "";
		note.textContent = `Tippe auf eine Frage, um diesen Knoten damit zu teilen. Je länger der Balken, desto mehr Unordnung beseitigt sie.${done}`;
	}

	function drawTable() {
		const inSel = new Set(sel.rows);
		let html = "<table><thead><tr><th>Tag</th>" + FEATS.map((f) => `<th>${f.name}</th>`).join("") + "<th>Spielen</th></tr></thead><tbody>";
		ROWS.forEach((r, i) => {
			html += `<tr class="${inSel.has(i) ? "" : "dim"}"><td>${i + 1}</td>${r.map((val, f) => `<td>${FEATS[f].vals[val]}</td>`).join("")}<td class="${Y[i] ? "yes" : "no"}">${Y[i] ? "Ja" : "Nein"}</td></tr>`;
		});
		table.innerHTML = html + "</tbody></table>";
	}

	function drawDay(path) {
		const steps = [];
		for (let i = 0; i < path.length - 1; i++) {
			const n = path[i];
			steps.push(`${FEATS[n.feat].name}? ${FEATS[n.feat].vals[path[i + 1].val]}`);
		}
		const end = path[path.length - 1];
		const yN = yes(end.rows);
		const nN = end.rows.length - yN;
		let res;
		if (end.feat !== null) {
			res = `Diesen Fall gab es in den Daten nie. Der Baum nimmt die Mehrheit im Knoten: ${yN >= nN ? "Ja" : "Nein"}.`;
		} else if (isPure(end)) {
			res = `<b class="${yN ? "cls-c" : "cls-a"}">${yN ? "Ja, es wird gespielt." : "Nein, kein Tennis."}</b>`;
		} else {
			res = `Der Baum ist hier noch nicht fertig (${yN} Ja, ${nN} Nein). Er rät die Mehrheit: <b>${yN >= nN ? "Ja" : "Nein"}</b>.`;
		}
		dayNote.innerHTML = (steps.length ? `Der Baum fragt: ${steps.map(esc).join(" → ")} → ` : "Der Baum hat noch keine Frage. ") + res;
	}

	function render() {
		const path = dayPath();
		drawTree(path);
		drawGains();
		drawTable();
		drawDay(path);
	}

	const pickFeat = (f) => {
		if (isPure(sel) || !freeFeats(sel).includes(f)) return;
		split(sel, f);
		sel = nextOpen() || sel;
		render();
	};
	gainsBox.addEventListener("click", (e) => {
		const row = e.target.closest("[data-f]");
		if (row) pickFeat(Number(row.dataset.f));
	});
	gainsBox.addEventListener("keydown", (e) => {
		const row = e.target.closest("[data-f]");
		if (row && (e.key === "Enter" || e.key === " ")) {
			e.preventDefault();
			pickFeat(Number(row.dataset.f));
		}
	});
	const selectNode = (e) => {
		const g = e.target.closest(".tnode");
		if (!g) return;
		sel = nodes.get(Number(g.dataset.id)) || root;
		render();
	};
	wrap.addEventListener("click", selectNode);
	wrap.addEventListener("keydown", (e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			selectNode(e);
		}
	});
	$("treeBest").addEventListener("click", () => {
		const f = bestFeat(sel);
		if (f >= 0 && !isPure(sel)) pickFeat(f);
		else {
			const n = nextOpen();
			if (n) {
				sel = n;
				pickFeat(bestFeat(n));
			}
		}
	});
	$("treeAll").addEventListener("click", () => {
		reset();
		growAll(root);
		sel = root;
		render();
	});
	$("treeReset").addEventListener("click", () => {
		reset();
		render();
	});

	reset();
	render();
})();

// =====================================================================
// 4 · Random Forest (CART mit Gini, Bootstrap und zufälligem Merkmal)
// =====================================================================
(() => {
	const v = makeView($("rfCanvas"), aspect2d);
	const sN = $("rfN");
	const sD = $("rfD");
	const readout = $("rfReadout");
	const note = $("rfNote");
	const miniBox = $("rfMini");

	// Zwei Halbmonde, ineinander verschränkt
	function moons(n, r) {
		return Array.from({ length: n }, (_, i) => {
			const c = i % 2;
			const t = Math.PI * r();
			let x = c ? 1 - Math.cos(t) : Math.cos(t);
			let y = c ? 0.5 - Math.sin(t) : Math.sin(t);
			x += gauss(r) * 0.24;
			y += gauss(r) * 0.24;
			return { x: clamp((x + 1.4) / 3.8, 0.02, 0.98), y: clamp((y + 0.95) / 2.4, 0.02, 0.98), c };
		});
	}

	let pts = [];
	let test = [];
	let seed = 1;
	let forest = [];
	let single = null;
	let addCls = 0;
	let mapOff = null;
	let hover = null;

	function build(data, idx, depth, maxD, r, randomFeat) {
		const n = idx.length;
		const ones = idx.reduce((s, i) => s + data[i].c, 0);
		const leaf = { leaf: true, p: n ? ones / n : 0.5 };
		if (depth >= maxD || ones === 0 || ones === n || n < 2) return leaf;
		// Im Wald nur ein zufälliges Merkmal pro Frage (das andere nur, wenn das erste nicht teilbar ist)
		const feats = randomFeat ? (r() < 0.5 ? ["x", "y"] : ["y", "x"]) : ["x", "y"];
		let best = null;
		for (const f of feats) {
			const s = [...idx].sort((a, b) => data[a][f] - data[b][f]);
			let l1 = 0;
			for (let k = 0; k < n - 1; k++) {
				l1 += data[s[k]].c;
				const a = data[s[k]][f];
				const b = data[s[k + 1]][f];
				if (b - a < 1e-9) continue;
				const nl = k + 1;
				const nr = n - nl;
				const pl = l1 / nl;
				const pr = (ones - l1) / nr;
				const g = nl * pl * (1 - pl) + nr * pr * (1 - pr);
				if (!best || g < best.g) best = { g, t: (a + b) / 2, f, s, nl };
			}
			if (best && randomFeat) break;
		}
		if (best) {
			return {
				f: best.f,
				t: best.t,
				l: build(data, best.s.slice(0, best.nl), depth + 1, maxD, r, randomFeat),
				r: build(data, best.s.slice(best.nl), depth + 1, maxD, r, randomFeat),
			};
		}
		return leaf;
	}

	const predict = (t, x, y) => {
		while (!t.leaf) t = (t.f === "x" ? x : y) <= t.t ? t.l : t.r;
		return t.p;
	};
	const vote = (t, x, y) => (predict(t, x, y) > 0.5 ? 1 : 0);
	const share = (x, y, n = forest.length) => {
		let s = 0;
		for (let i = 0; i < n; i++) s += vote(forest[i], x, y);
		return s / n;
	};

	function fit() {
		const N = Number(sN.value);
		const D = Number(sD.value);
		forest = [];
		for (let i = 0; i < N; i++) {
			const r = rng(seed * 1000 + i * 7919);
			const bag = Array.from({ length: pts.length }, () => Math.floor(r() * pts.length));
			const tree = build(pts, bag, 0, D, r, true);
			tree.bag = new Set(bag);
			forest.push(tree);
		}
		single = pts.length ? build(pts, pts.map((_, i) => i), 0, D, null, false) : null;
		mapOff = null;
		minis.forEach((m) => (m.off = null));
	}

	const regionCol = (s) => mix(BG, mix(RGB[0], RGB[1], s), 0.32);

	// Drei kleine Bäume
	const minis = [0, 1, 2].map((i) => {
		const fig = document.createElement("figure");
		const c = document.createElement("canvas");
		const cap = document.createElement("figcaption");
		fig.append(c, cap);
		miniBox.appendChild(fig);
		const mv = makeView(c, aspect2d, { l: 4, r: 4, t: 4, b: 4 });
		const m = { v: mv, cap, off: null, i };
		mv.draw = () => {
			m.off = null;
			drawMini(m);
		};
		return m;
	});

	function drawMini(m) {
		const { v: mv, i } = m;
		mv.clear();
		const t = forest[i];
		if (!t) {
			m.cap.textContent = `Baum ${i + 1} · nicht im Wald`;
			mv.ctx.fillStyle = "rgba(244,239,230,0.25)";
			mv.ctx.font = "11px 'Space Grotesk', sans-serif";
			mv.ctx.textAlign = "center";
			mv.ctx.fillText("–", mv.size.w / 2, mv.size.h / 2);
			return;
		}
		if (!m.off) m.off = paintMap(mv, 4, (x, y) => regionCol(vote(t, x, y)));
		blit(mv, m.off);
		pts.forEach((p, k) => mark(mv.ctx, mv.X(p.x), mv.Y(p.y), p.c, 2.6, t.bag.has(k) ? 1 : 0.18));
		m.cap.textContent = `Baum ${i + 1} · sieht ${t.bag.size} von ${pts.length}`;
	}

	const acc = (fn) => test.filter((p) => fn(p.x, p.y) === p.c).length / test.length;

	function draw() {
		const { ctx } = v;
		v.clear();
		if (forest.length && pts.length) {
			if (!mapOff) mapOff = paintMap(v, 5, (x, y) => regionCol(share(x, y)));
			blit(v, mapOff);
		}
		v.axes("Merkmal 1", "Merkmal 2", false);
		pts.forEach((p) => mark(ctx, v.X(p.x), v.Y(p.y), p.c, 4.8));
		if (hover) {
			ctx.strokeStyle = "#f4efe6";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(v.X(hover[0]), v.Y(hover[1]), 9, 0, Math.PI * 2);
			ctx.stroke();
		}
		minis.forEach(drawMini);

		$("rfNOut").textContent = sN.value;
		$("rfDOut").textContent = sD.value;
		if (!pts.length || !forest.length) {
			readout.textContent = "";
			note.textContent = "Keine Daten. Tippe Punkte in die Fläche oder hol neue Daten.";
			return;
		}
		const aS = acc((x, y) => vote(single, x, y));
		const aF = acc((x, y) => (share(x, y) > 0.5 ? 1 : 0));
		readout.innerHTML = `Test-Genauigkeit<br>1 Baum ${pct(aS)} · Wald ${pct(aF)}`;
		if (hover) {
			const n = forest.length;
			const blue = Math.round(share(hover[0], hover[1]) * n);
			const win = blue * 2 > n ? 1 : blue * 2 < n ? 0 : -1;
			note.innerHTML =
				`Hier stimmen <b class="cls-b">${blue} ▲</b> und <b class="cls-a">${n - blue} ●</b> von ${n} Bäumen ab → ` +
				(win < 0 ? "Gleichstand." : `der Wald sagt <b class="${win ? "cls-b" : "cls-a"}">${CLS_NAME[win]}</b>.`);
		} else {
			note.textContent =
				`Getestet an ${test.length} neuen Punkten, die keiner der Bäume je gesehen hat. Dreh die Tiefe hoch: ` +
				`Ein einzelner Baum wird zackig und überanpasst sich, der Wald bleibt ruhig.`;
		}
	}
	v.draw = draw;

	function newData(r = Math.random) {
		pts = moons(90, r);
		test = moons(400, r);
		fit();
	}

	sN.addEventListener("input", () => {
		fit();
		draw();
	});
	sD.addEventListener("input", () => {
		fit();
		draw();
	});
	$("rfRoll").addEventListener("click", () => {
		seed++;
		fit();
		draw();
	});
	$("rfNew").addEventListener("click", () => {
		newData();
		draw();
	});
	segmented("data-rf-cls", (c) => (addCls = Number(c)));
	v.canvas.addEventListener("pointerdown", (e) => {
		const i = v.near(e, pts);
		if (i >= 0) pts.splice(i, 1);
		else {
			const [x, y] = v.at(e);
			if (!v.inside([x, y])) return;
			pts.push({ x: clamp(x, 0, 1), y: clamp(y, 0, 1), c: addCls });
		}
		fit();
		draw();
	});
	v.canvas.addEventListener("pointermove", (e) => {
		if (e.pointerType !== "mouse") return;
		const p = v.at(e);
		hover = v.inside(p) ? p : null;
		draw();
	});
	v.canvas.addEventListener("pointerleave", () => {
		hover = null;
		draw();
	});

	newData(rng(5));
	draw();
})();

// =====================================================================
// 5 · Support Vector Machine (SMO nach Platt)
// =====================================================================
(() => {
	const v = makeView($("svmCanvas"), aspect2d);
	const sC = $("svmC");
	const readout = $("svmReadout");
	const note = $("svmNote");

	let pts = [];
	let kernel = "lin";
	let addCls = 0;
	let set = "sep";
	let model = null;
	const GAMMA = 1.4;

	// Daten in [0,1] werden für die SVM auf [-2, 2] gestreckt
	const U = (p) => [4 * p.x - 2, 4 * p.y - 2];
	const K = (a, b) => {
		if (kernel === "lin") return a[0] * b[0] + a[1] * b[1];
		const dx = a[0] - b[0];
		const dy = a[1] - b[1];
		return Math.exp(-GAMMA * (dx * dx + dy * dy));
	};

	function smo(C) {
		const n = pts.length;
		const X = pts.map(U);
		const y = pts.map((p) => (p.c ? 1 : -1));
		const Km = X.map((a) => X.map((b) => K(a, b)));
		const a = new Float64Array(n);
		const E = y.map((yi) => -yi);
		let b = 0;
		const tol = 1e-3;
		const eps = 1e-7;

		function takeStep(i, j) {
			if (i === j) return false;
			const ai = a[i];
			const aj = a[j];
			const yi = y[i];
			const yj = y[j];
			const L = yi !== yj ? Math.max(0, aj - ai) : Math.max(0, ai + aj - C);
			const Hh = yi !== yj ? Math.min(C, C + aj - ai) : Math.min(C, ai + aj);
			if (Hh - L < 1e-12) return false;
			const eta = Km[i][i] + Km[j][j] - 2 * Km[i][j];
			if (eta <= 1e-12) return false;
			let ajn = clamp(aj + (yj * (E[i] - E[j])) / eta, L, Hh);
			if (Math.abs(ajn - aj) < eps * (ajn + aj + eps)) return false;
			const ain = ai + yi * yj * (aj - ajn);
			const dI = yi * (ain - ai);
			const dJ = yj * (ajn - aj);
			const b1 = b - E[i] - dI * Km[i][i] - dJ * Km[i][j];
			const b2 = b - E[j] - dI * Km[i][j] - dJ * Km[j][j];
			const bn = ain > 0 && ain < C ? b1 : ajn > 0 && ajn < C ? b2 : (b1 + b2) / 2;
			for (let k = 0; k < n; k++) E[k] += dI * Km[i][k] + dJ * Km[j][k] + (bn - b);
			a[i] = ain;
			a[j] = ajn;
			b = bn;
			return true;
		}

		function examine(i) {
			const r = E[i] * y[i];
			if (!((r < -tol && a[i] < C) || (r > tol && a[i] > 0))) return false;
			const bound = (k) => a[k] <= 0 || a[k] >= C;
			let j = -1;
			let best = -1;
			for (let k = 0; k < n; k++) {
				if (bound(k)) continue;
				const d = Math.abs(E[i] - E[k]);
				if (d > best) {
					best = d;
					j = k;
				}
			}
			if (j >= 0 && takeStep(i, j)) return true;
			const start = Math.floor(Math.random() * n);
			for (let s = 0; s < n; s++) {
				const k = (start + s) % n;
				if (!bound(k) && takeStep(i, k)) return true;
			}
			for (let s = 0; s < n; s++) if (takeStep(i, (start + s) % n)) return true;
			return false;
		}

		let changed = 0;
		let all = true;
		let loops = 0;
		while ((changed > 0 || all) && loops++ < 400) {
			changed = 0;
			for (let i = 0; i < n; i++) if (all || (a[i] > 0 && a[i] < C)) changed += examine(i) ? 1 : 0;
			if (all) all = false;
			else if (!changed) all = true;
		}

		const sv = [];
		for (let i = 0; i < n; i++) if (a[i] > 1e-6) sv.push(i);
		const f = (p) => {
			let s = b;
			for (const i of sv) s += a[i] * y[i] * K(X[i], p);
			return s;
		};
		let w = null;
		if (kernel === "lin") {
			w = [0, 0];
			for (const i of sv) {
				w[0] += a[i] * y[i] * X[i][0];
				w[1] += a[i] * y[i] * X[i][1];
			}
		}
		return { a, b, sv, f, w, C, y };
	}

	function gen(kind, r = Math.random) {
		set = kind;
		pts = [];
		const blob = (cx, cy, sd, n, c) => {
			for (let i = 0; i < n; i++) pts.push({ x: clamp(cx + gauss(r) * sd, 0.03, 0.97), y: clamp(cy + gauss(r) * sd, 0.03, 0.97), c });
		};
		if (kind === "ring") {
			blob(0.5, 0.5, 0.07, 14, 0);
			for (let i = 0; i < 24; i++) {
				const t = (i / 24) * Math.PI * 2 + r() * 0.2;
				const rad = 0.33 + gauss(r) * 0.025;
				pts.push({ x: 0.5 + Math.cos(t) * rad, y: 0.5 + Math.sin(t) * rad, c: 1 });
			}
		} else {
			blob(0.3, 0.66, 0.085, 13, 0);
			blob(0.7, 0.34, 0.085, 13, 1);
			if (kind === "noise") {
				pts.push({ x: 0.62, y: 0.44, c: 0 }, { x: 0.4, y: 0.52, c: 1 }, { x: 0.78, y: 0.22, c: 0 });
			}
		}
	}

	function solve() {
		const has = [0, 1].every((c) => pts.some((p) => p.c === c));
		model = has ? smo(10 ** Number(sC.value)) : null;
		mapOff = null;
	}

	let mapOff = null;
	let grid = null;
	const CELL = 5;

	function computeMap() {
		const cols = Math.max(2, Math.round(v.pw() / CELL));
		const rows = Math.max(2, Math.round(v.ph() / CELL));
		grid = { cols, rows, f: new Float64Array((cols + 1) * (rows + 1)) };
		for (let j = 0; j <= rows; j++)
			for (let i = 0; i <= cols; i++) grid.f[j * (cols + 1) + i] = model.f([4 * (i / cols) - 2, 4 * (1 - j / rows) - 2]);
		mapOff = paintMap(v, CELL, (x, y) => {
			const z = model.f([4 * x - 2, 4 * y - 2]);
			const c = z >= 0 ? RGB[1] : RGB[0];
			return mix(BG, c, Math.abs(z) < 1 ? 0.13 : 0.26);
		});
	}

	// Höhenlinie f = level mit Marching Squares
	function contour(level) {
		const { ctx } = v;
		const { cols, rows, f } = grid;
		const W1 = cols + 1;
		const px = (i) => v.X(i / cols);
		const py = (j) => v.Y(1 - j / rows);
		ctx.beginPath();
		for (let j = 0; j < rows; j++) {
			for (let i = 0; i < cols; i++) {
				const c = [f[j * W1 + i], f[j * W1 + i + 1], f[(j + 1) * W1 + i + 1], f[(j + 1) * W1 + i]].map((z) => z - level);
				const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
				const hits = [];
				for (let e = 0; e < 4; e++) {
					const a = c[e];
					const b = c[(e + 1) % 4];
					if ((a < 0) !== (b < 0)) {
						const t = a / (a - b);
						const [i1, j1] = corners[e];
						const [i2, j2] = corners[(e + 1) % 4];
						hits.push([px(i1 + (i2 - i1) * t), py(j1 + (j2 - j1) * t)]);
					}
				}
				for (let h = 0; h + 1 < hits.length; h += 2) {
					ctx.moveTo(...hits[h]);
					ctx.lineTo(...hits[h + 1]);
				}
			}
		}
		ctx.stroke();
	}

	// Gerade w·u + b = level in Datenkoordinaten zeichnen
	function line(level) {
		const { ctx } = v;
		const [w0, w1] = model.w;
		const A = 4 * w0;
		const B = 4 * w1;
		const Cc = model.b - 2 * w0 - 2 * w1 - level;
		ctx.beginPath();
		if (Math.abs(B) > Math.abs(A)) {
			ctx.moveTo(v.X(-0.1), v.Y(-(Cc + A * -0.1) / B));
			ctx.lineTo(v.X(1.1), v.Y(-(Cc + A * 1.1) / B));
		} else {
			ctx.moveTo(v.X(-(Cc + B * -0.1) / A), v.Y(-0.1));
			ctx.lineTo(v.X(-(Cc + B * 1.1) / A), v.Y(1.1));
		}
		ctx.stroke();
	}

	function draw() {
		const { ctx } = v;
		v.clear();
		if (model) {
			if (!mapOff) computeMap();
			blit(v, mapOff);
			v.clip();
			const lin = kernel === "lin" && Math.hypot(...model.w) > 1e-9;
			ctx.strokeStyle = "rgba(244,239,230,0.6)";
			ctx.lineWidth = 1.5;
			ctx.setLineDash([6, 5]);
			for (const lv of [-1, 1]) lin ? line(lv) : contour(lv);
			ctx.setLineDash([]);
			ctx.strokeStyle = "#7ee0c3";
			ctx.lineWidth = 3;
			lin ? line(0) : contour(0);
			ctx.restore();
		}
		v.axes("Merkmal 1", "Merkmal 2", false);
		pts.forEach((p) => mark(ctx, v.X(p.x), v.Y(p.y), p.c, 5));
		if (model) {
			for (const i of model.sv) {
				const atC = model.a[i] >= model.C - 1e-6;
				ring(ctx, v.X(pts[i].x), v.Y(pts[i].y), 11, atC ? "#ffd166" : "#f4efe6", atC);
			}
		}

		const C = 10 ** Number(sC.value);
		$("svmCOut").textContent = nf(C, C < 1 ? 2 : C < 10 ? 1 : 0);
		if (!model) {
			readout.textContent = "";
			note.textContent = "Die SVM braucht Punkte aus beiden Klassen.";
			return;
		}
		const wrong = pts.filter((p, i) => (model.f(U(p)) >= 0 ? 1 : 0) !== p.c).length;
		const onRoad = model.sv.filter((i) => model.a[i] >= model.C - 1e-6).length;
		let ro = `${model.sv.length} Stützvektoren`;
		if (kernel === "lin" && model.w) ro = `Straßenbreite ${nf(2 / Math.hypot(...model.w), 2)}<br>${ro}`;
		readout.innerHTML = ro;
		let msg = `Die Ringe markieren die Stützvektoren: Nur diese ${model.sv.length} Punkte bestimmen die Grenze.`;
		if (onRoad) msg += ` ${onRoad} davon (gelb gestrichelt) liegen auf der Straße oder falsch, das erlaubt das kleine C.`;
		if (wrong) msg += ` ${wrong} Punkt${wrong > 1 ? "e" : ""} auf der falschen Seite.`;
		if (set === "ring" && kernel === "lin") msg = "Eine gerade Linie kann einen Ring nicht trennen. Schalte auf „Gekrümmt“.";
		note.textContent = msg;
	}
	v.draw = () => {
		mapOff = null;
		draw();
	};

	segmented("data-svm-kernel", (k) => {
		kernel = k;
		solve();
		draw();
	});
	segmented("data-svm-cls", (c) => (addCls = Number(c)));
	document.querySelectorAll("[data-svm-set]").forEach((b) =>
		b.addEventListener("click", () => {
			gen(b.dataset.svmSet);
			solve();
			draw();
		})
	);
	sC.addEventListener("input", () => {
		solve();
		draw();
	});
	v.canvas.addEventListener("pointerdown", (e) => {
		const i = v.near(e, pts);
		if (i >= 0) pts.splice(i, 1);
		else {
			const [x, y] = v.at(e);
			if (!v.inside([x, y])) return;
			pts.push({ x: clamp(x, 0, 1), y: clamp(y, 0, 1), c: addCls });
		}
		solve();
		draw();
	});

	gen("sep", rng(3));
	solve();
	draw();
})();

// =====================================================================
// 6 · k-nächste Nachbarn
// =====================================================================
(() => {
	const v = makeView($("knnCanvas"), aspect2d);
	const sK = $("knnK");
	const btnMap = $("knnMap");
	const readout = $("knnReadout");
	const note = $("knnNote");
	const votesBox = $("knnVotes");

	let pts = [];
	let star = [0.5, 0.52];
	let showMap = false;
	let mapOff = null;

	function gen(r = Math.random) {
		const centers = [
			[0.27 + r() * 0.06, 0.68 + r() * 0.06],
			[0.7 + r() * 0.06, 0.68 + r() * 0.06],
			[0.48 + r() * 0.06, 0.27 + r() * 0.06],
		];
		pts = [];
		centers.forEach(([cx, cy], c) => {
			for (let i = 0; i < 20; i++)
				pts.push({ x: clamp(cx + gauss(r) * 0.12, 0.03, 0.97), y: clamp(cy + gauss(r) * 0.12, 0.03, 0.97), c });
		});
		mapOff = null;
	}

	// Klasse durch Mehrheit der k Nächsten; bei Gleichstand gewinnt die Klasse des nächsten Nachbarn
	function classify(x, y, k) {
		const nb = pts
			.map((p, i) => ({ i, d: Math.hypot(p.x - x, p.y - y), c: p.c }))
			.sort((a, b) => a.d - b.d)
			.slice(0, k);
		const votes = [0, 0, 0];
		nb.forEach((n) => votes[n.c]++);
		const top = Math.max(...votes);
		const tied = votes.filter((x) => x === top).length > 1;
		const win = tied ? nb.find((n) => votes[n.c] === top).c : votes.indexOf(top);
		return { nb, votes, win, tied };
	}

	function draw() {
		const { ctx } = v;
		const k = Math.min(Number(sK.value), pts.length);
		v.clear();
		if (showMap && pts.length) {
			if (!mapOff) mapOff = paintMap(v, 6, (x, y) => mix(BG, RGB[classify(x, y, k).win], 0.3));
			blit(v, mapOff);
		}
		v.axes("Merkmal 1", "Merkmal 2", !showMap);
		$("knnKOut").textContent = sK.value;
		if (!pts.length) return;

		const res = classify(star[0], star[1], k);
		const sx = v.X(star[0]);
		const sy = v.Y(star[1]);
		const rad = res.nb[res.nb.length - 1].d;
		// Kreis bis zum k-ten Nachbarn (im Merkmalsraum)
		ctx.strokeStyle = "rgba(244,239,230,0.45)";
		ctx.setLineDash([5, 5]);
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.ellipse(sx, sy, rad * v.pw() + 4, rad * v.ph() + 4, 0, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);
		for (const n of res.nb) {
			ctx.strokeStyle = COL[n.c];
			ctx.globalAlpha = 0.7;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(sx, sy);
			ctx.lineTo(v.X(pts[n.i].x), v.Y(pts[n.i].y));
			ctx.stroke();
			ctx.globalAlpha = 1;
		}
		const isNb = new Set(res.nb.map((n) => n.i));
		pts.forEach((p, i) => mark(ctx, v.X(p.x), v.Y(p.y), p.c, 4.8, isNb.has(i) || showMap ? 1 : 0.55));
		res.nb.forEach((n) => ring(ctx, v.X(pts[n.i].x), v.Y(pts[n.i].y), 9));

		// Stern
		ctx.fillStyle = COL[res.win];
		ctx.strokeStyle = "#fff";
		ctx.lineWidth = 2;
		ctx.beginPath();
		for (let i = 0; i < 10; i++) {
			const a = -Math.PI / 2 + (i * Math.PI) / 5;
			const r = i % 2 ? 5 : 12;
			ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
		}
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		bars(
			votesBox,
			[0, 1, 2].map((c) => ({
				label: `${CLS_MARK[c]} ${CLS_NAME[c]}`,
				value: res.votes[c] / k,
				text: `${res.votes[c]} von ${k}`,
				color: COL[c],
				cls: c === res.win ? "is-best" : "",
			}))
		);
		readout.innerHTML = `k = ${k}<br>Ergebnis: <span class="cls-${"abc"[res.win]}">${CLS_MARK[res.win]} ${CLS_NAME[res.win]}</span>`;
		if (k === 1) note.textContent = "Mit k = 1 entscheidet allein der nächste Nachbar. Schalte die Karte ein: Jeder einzelne Ausreißer bekommt seine eigene Insel.";
		else if (res.tied) note.textContent = "Gleichstand! Dann entscheidet hier die Klasse des allernächsten Nachbarn. Darum nimmt man gern ein ungerades k.";
		else if (k >= 20) note.textContent = "Bei sehr großem k stimmt fast die halbe Nachbarschaft mit. Die Grenzen werden glatt, Feinheiten verschwinden.";
		else note.textContent = `Die ${k} nächsten Nachbarn stimmen ab. Der Stern übernimmt die Farbe der Mehrheit.`;
	}
	v.draw = () => {
		mapOff = null;
		draw();
	};

	const moveStar = (e) => {
		const p = v.at(e);
		if (!v.inside(p)) return;
		star = [clamp(p[0], 0, 1), clamp(p[1], 0, 1)];
		draw();
	};
	v.canvas.addEventListener("pointerdown", moveStar);
	v.canvas.addEventListener("pointermove", (e) => {
		if (e.pointerType === "mouse" && e.buttons === 1) moveStar(e);
	});
	sK.addEventListener("input", () => {
		mapOff = null;
		draw();
	});
	btnMap.addEventListener("click", () => {
		showMap = !showMap;
		press(btnMap, showMap);
		btnMap.textContent = showMap ? "Karte ausblenden" : "Karte zeigen";
		draw();
	});
	$("knnNew").addEventListener("click", () => {
		gen();
		draw();
	});

	gen(rng(21));
	draw();
})();

// =====================================================================
// 7 · k-Means
// =====================================================================
(() => {
	const v = makeView($("kmCanvas"), aspect2d);
	const sK = $("kmK");
	const btnStep = $("kmStep");
	const btnRun = $("kmRun");
	const readout = $("kmReadout");
	const note = $("kmNote");
	const phaseTag = $("kmPhase");
	const elbowCanvas = $("elbow");

	let pts = [];
	let cents = []; // { x, y, dx, dy } – dx/dy: angezeigte Position für die Animation
	let assign = [];
	let next = "assign";
	let rounds = 0;
	let done = false;
	let lastPhase = "";
	let running = false;
	let timer = 0;
	let elbow = [];
	const E = {};
	Object.assign(E, fitCanvas(elbowCanvas, (w) => (w < 400 ? 2.2 : 3.2), () => E.ctx && drawElbow()));

	function gen(r = Math.random, blobs = 3 + Math.floor(r() * 3)) {
		pts = [];
		const cs = [];
		while (cs.length < blobs) {
			const c = [0.15 + r() * 0.7, 0.15 + r() * 0.7];
			if (cs.every((o) => Math.hypot(o[0] - c[0], o[1] - c[1]) > 0.26)) cs.push(c);
		}
		for (const [cx, cy] of cs) {
			const sd = 0.05 + r() * 0.03;
			const n = 30 + Math.floor(r() * 20);
			for (let i = 0; i < n; i++) pts.push({ x: clamp(cx + gauss(r) * sd, 0.02, 0.98), y: clamp(cy + gauss(r) * sd, 0.02, 0.98) });
		}
		computeElbow();
	}

	// Zufällige Startzentren: k verschiedene Datenpunkte (Forgy)
	function init(r = Math.random) {
		const k = Number(sK.value);
		const idx = new Set();
		while (idx.size < Math.min(k, pts.length)) idx.add(Math.floor(r() * pts.length));
		cents = [...idx].map((i) => ({ x: pts[i].x, y: pts[i].y, dx: pts[i].x, dy: pts[i].y }));
		assign = pts.map(() => -1);
		next = "assign";
		rounds = 0;
		done = false;
		lastPhase = "";
	}

	const d2 = (p, c) => (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
	const nearest = (p, cs) => {
		let best = 0;
		let bd = Infinity;
		cs.forEach((c, i) => {
			const d = d2(p, c);
			if (d < bd) {
				bd = d;
				best = i;
			}
		});
		return best;
	};
	const inertia = (cs, as) => pts.reduce((s, p, i) => s + (as[i] >= 0 ? d2(p, cs[as[i]]) : 0), 0);

	function step() {
		if (done || !cents.length) return;
		if (next === "assign") {
			let changed = 0;
			pts.forEach((p, i) => {
				const a = nearest(p, cents);
				if (a !== assign[i]) changed++;
				assign[i] = a;
			});
			rounds++;
			lastPhase = "assign";
			next = "update";
			if (!changed && rounds > 1) {
				done = true;
				setRunning(false);
			}
		} else {
			cents.forEach((c, k) => {
				let sx = 0;
				let sy = 0;
				let n = 0;
				pts.forEach((p, i) => {
					if (assign[i] === k) {
						sx += p.x;
						sy += p.y;
						n++;
					}
				});
				if (n) {
					c.x = sx / n;
					c.y = sy / n;
				}
			});
			lastPhase = "update";
			next = "assign";
		}
		draw();
	}

	// Für die Ellbogen-Kurve: k-Means++ mit mehreren Starts bis zur Ruhe
	function bestInertia(k, r) {
		let best = Infinity;
		for (let rep = 0; rep < 4; rep++) {
			const cs = [{ ...pts[Math.floor(r() * pts.length)] }];
			while (cs.length < k) {
				const ds = pts.map((p) => Math.min(...cs.map((c) => d2(p, c))));
				let t = r() * ds.reduce((a, b) => a + b, 0);
				let i = 0;
				while (i < ds.length - 1 && (t -= ds[i]) > 0) i++;
				cs.push({ ...pts[i] });
			}
			let as = pts.map(() => -1);
			for (let it = 0; it < 60; it++) {
				const nas = pts.map((p) => nearest(p, cs));
				const same = nas.every((a, i) => a === as[i]);
				as = nas;
				if (same) break;
				cs.forEach((c, j) => {
					const mine = pts.filter((_, i) => as[i] === j);
					if (mine.length) {
						c.x = mine.reduce((s, p) => s + p.x, 0) / mine.length;
						c.y = mine.reduce((s, p) => s + p.y, 0) / mine.length;
					}
				});
			}
			best = Math.min(best, inertia(cs, as));
		}
		return best;
	}

	function computeElbow() {
		const r = rng(99);
		elbow = [1, 2, 3, 4, 5, 6, 7].map((k) => bestInertia(k, r));
		drawElbow();
	}

	function drawElbow() {
		const { ctx } = E;
		const { w, h } = E.size;
		ctx.clearRect(0, 0, w, h);
		if (!elbow.length) return;
		const P = { l: 10, r: 10, t: 12, b: 22 };
		const max = elbow[0] || 1;
		const X = (k) => P.l + ((k - 1) / 6) * (w - P.l - P.r);
		const Y = (val) => h - P.b - (val / max) * (h - P.t - P.b);
		const cur = Number(sK.value);
		ctx.strokeStyle = "rgba(255,255,255,0.35)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(P.l, h - P.b);
		ctx.lineTo(w - P.r, h - P.b);
		ctx.stroke();
		ctx.strokeStyle = "#7ee0c3";
		ctx.lineWidth = 2;
		ctx.beginPath();
		elbow.forEach((val, i) => ctx[i ? "lineTo" : "moveTo"](X(i + 1), Y(val)));
		ctx.stroke();
		ctx.font = "11px 'JetBrains Mono', monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		elbow.forEach((val, i) => {
			const k = i + 1;
			ctx.fillStyle = k === cur ? "#ffd166" : "#7ee0c3";
			ctx.beginPath();
			ctx.arc(X(k), Y(val), k === cur ? 6 : 3.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = k === cur ? "#ffd166" : "rgba(244,239,230,0.45)";
			ctx.fillText(`k=${k}`, X(k), h - P.b + 5);
		});
	}

	function draw() {
		const { ctx } = v;
		v.clear();
		v.axes("Merkmal 1", "Merkmal 2");
		// Zuordnungslinien direkt nach dem Zuordnen
		if (lastPhase === "assign" && !done) {
			ctx.lineWidth = 1;
			pts.forEach((p, i) => {
				const c = cents[assign[i]];
				if (!c) return;
				ctx.strokeStyle = COL[assign[i]];
				ctx.globalAlpha = 0.22;
				ctx.beginPath();
				ctx.moveTo(v.X(p.x), v.Y(p.y));
				ctx.lineTo(v.X(c.dx), v.Y(c.dy));
				ctx.stroke();
			});
			ctx.globalAlpha = 1;
		}
		pts.forEach((p, i) => {
			ctx.fillStyle = assign[i] >= 0 ? COL[assign[i]] : "#8a8580";
			ctx.beginPath();
			ctx.arc(v.X(p.x), v.Y(p.y), 3.6, 0, Math.PI * 2);
			ctx.fill();
		});
		cents.forEach((c, k) => {
			const x = v.X(c.dx);
			const y = v.Y(c.dy);
			ctx.lineCap = "round";
			ctx.strokeStyle = "#0b0a09";
			ctx.lineWidth = 7;
			ctx.beginPath();
			ctx.moveTo(x - 9, y - 9);
			ctx.lineTo(x + 9, y + 9);
			ctx.moveTo(x + 9, y - 9);
			ctx.lineTo(x - 9, y + 9);
			ctx.stroke();
			ctx.strokeStyle = COL[k];
			ctx.lineWidth = 3.5;
			ctx.stroke();
			ctx.lineCap = "butt";
		});

		$("kmKOut").textContent = sK.value;
		const assigned = assign.some((a) => a >= 0);
		phaseTag.textContent = done
			? "Fertig"
			: lastPhase === "assign"
				? `Runde ${rounds} · 1 Zuordnen`
				: lastPhase === "update"
					? `Runde ${rounds} · 2 Verschieben`
					: "Start";
		readout.innerHTML = assigned ? `Restabstand ${nf(inertia(cents, assign), 2)}` : "";
		btnStep.textContent = done ? "Fertig" : next === "assign" ? "Schritt: Zuordnen" : "Schritt: Verschieben";
		btnStep.disabled = done;
		if (done) {
			const best = elbow[cents.length - 1];
			const cur = inertia(cents, assign);
			note.textContent =
				`Nach ${rounds} Runden ändert sich nichts mehr.` +
				(best && cur > best * 1.15
					? " Aber Achtung: Das ist nicht die beste Lösung, nur eine stabile. Probier „Neue Zentren“."
					: " Die Zentren sitzen in der Mitte ihrer Gruppen.");
		} else if (lastPhase === "assign") note.textContent = "Jeder Punkt hat die Farbe seines nächsten Zentrums angenommen. Als Nächstes wandern die Zentren in die Mitte.";
		else if (lastPhase === "update") note.textContent = "Die Zentren sind in die Mitte ihrer Punkte gewandert. Jetzt liegen manche Punkte näher an einem anderen Zentrum.";
		else note.textContent = `${cents.length} Zentren liegen zufällig auf Datenpunkten. Noch gehört kein Punkt zu einer Gruppe.`;
	}
	v.draw = draw;

	function setRunning(on) {
		running = on && !done;
		press(btnRun, running);
		btnRun.textContent = running ? "Anhalten" : "Abspielen";
		timer = 0;
	}

	whenVisible(v.canvas, (dt) => {
		let moving = false;
		for (const c of cents) {
			const kx = c.x - c.dx;
			const ky = c.y - c.dy;
			if (Math.abs(kx) + Math.abs(ky) > 1e-4) {
				const f = 1 - Math.exp(-dt * 9);
				c.dx += kx * f;
				c.dy += ky * f;
				moving = true;
			} else {
				c.dx = c.x;
				c.dy = c.y;
			}
		}
		if (running) {
			timer += dt;
			if (timer > 0.65) {
				timer = 0;
				step();
			}
		}
		if (moving) draw();
	});

	btnStep.addEventListener("click", () => {
		setRunning(false);
		step();
	});
	btnRun.addEventListener("click", () => {
		if (done) init();
		setRunning(!running);
		if (running) step();
		draw();
	});
	$("kmInit").addEventListener("click", () => {
		setRunning(false);
		init();
		draw();
	});
	$("kmNew").addEventListener("click", () => {
		setRunning(false);
		gen();
		init();
		draw();
	});
	sK.addEventListener("input", () => {
		setRunning(false);
		init();
		draw();
		drawElbow();
	});

	const r = rng(42);
	gen(r, 4);
	init(r);
	draw();
})();
