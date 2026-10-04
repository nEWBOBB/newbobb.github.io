// Gemeinsame Helfer der Reihe „Quant“: Zufall, Koordinatensysteme, Zeiger, Chips.
// Baut auf verstehen.js auf (fitCanvas, whenVisible).
"use strict";

const Q = (() => {
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const lerp = (a, b, t) => a + (b - a) * t;
	const nf = (v, d = 2) =>
		Number.isFinite(v) ? v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d }) : "–";

	// Standardnormalverteilte Zufallszahl (Box-Muller)
	let spare = null;
	function randn() {
		if (spare !== null) {
			const s = spare;
			spare = null;
			return s;
		}
		let u = 0;
		let v = 0;
		while (u === 0) u = Math.random();
		while (v === 0) v = Math.random();
		const r = Math.sqrt(-2 * Math.log(u));
		spare = r * Math.sin(2 * Math.PI * v);
		return r * Math.cos(2 * Math.PI * v);
	}

	// Farben der Reihe
	const C = {
		bg: "#08090b",
		grid: "rgba(255,255,255,0.06)",
		axis: "rgba(255,255,255,0.28)",
		text: "rgba(244,239,230,0.62)",
		ink: "#f4efe6",
		a: "#6be3a8", // Mint
		b: "#7aa8ff", // Blau
		c: "#ffb366", // Bernstein
		d: "#ff7a9c", // Rosa
		e: "#c79bff", // Lila
	};

	// Ein Koordinatensystem auf einem Canvas. dom = { x: [x0, x1], y: [y0, y1] }, pad in CSS-Pixeln.
	function plot(size, dom, pad = { l: 36, r: 12, t: 14, b: 26 }) {
		const p = {
			dom,
			pad,
			get x0() { return pad.l; },
			get x1() { return size.w - pad.r; },
			get y0() { return pad.t; },
			get y1() { return size.h - pad.b; },
			sx(x) { return lerp(p.x0, p.x1, (x - dom.x[0]) / (dom.x[1] - dom.x[0])); },
			sy(y) { return lerp(p.y1, p.y0, (y - dom.y[0]) / (dom.y[1] - dom.y[0])); },
			ix(px) { return lerp(dom.x[0], dom.x[1], (px - p.x0) / (p.x1 - p.x0)); },
			iy(py) { return lerp(dom.y[0], dom.y[1], (p.y1 - py) / (p.y1 - p.y0)); },
			axes(ctx, { xt = 5, yt = 4, xf = (v) => nf(v, 1), yf = (v) => nf(v, 1), grid = true } = {}) {
				ctx.save();
				ctx.font = '11px "JetBrains Mono", monospace';
				ctx.fillStyle = C.text;
				ctx.lineWidth = 1;
				ctx.textAlign = "center";
				ctx.textBaseline = "top";
				for (let i = 0; i <= xt; i++) {
					const v = lerp(dom.x[0], dom.x[1], i / xt);
					const X = p.sx(v);
					if (grid) {
						ctx.strokeStyle = C.grid;
						ctx.beginPath();
						ctx.moveTo(X, p.y0);
						ctx.lineTo(X, p.y1);
						ctx.stroke();
					}
					if (xf) ctx.fillText(xf(v), X, p.y1 + 6);
				}
				ctx.textAlign = "right";
				ctx.textBaseline = "middle";
				for (let i = 0; i <= yt; i++) {
					const v = lerp(dom.y[0], dom.y[1], i / yt);
					const Y = p.sy(v);
					if (grid) {
						ctx.strokeStyle = C.grid;
						ctx.beginPath();
						ctx.moveTo(p.x0, Y);
						ctx.lineTo(p.x1, Y);
						ctx.stroke();
					}
					if (yf) ctx.fillText(yf(v), p.x0 - 6, Y);
				}
				ctx.strokeStyle = C.axis;
				ctx.beginPath();
				ctx.moveTo(p.x0, p.y0);
				ctx.lineTo(p.x0, p.y1);
				ctx.lineTo(p.x1, p.y1);
				ctx.stroke();
				ctx.restore();
			},
			// Kurve aus einer Funktion zeichnen
			curve(ctx, f, { color = C.a, width = 2, n = 240, fill = null, dash = null } = {}) {
				ctx.save();
				ctx.beginPath();
				for (let i = 0; i <= n; i++) {
					const x = lerp(dom.x[0], dom.x[1], i / n);
					const y = f(x);
					const X = p.sx(x);
					const Y = p.sy(y);
					if (i === 0) ctx.moveTo(X, Y);
					else ctx.lineTo(X, Y);
				}
				if (fill) {
					ctx.lineTo(p.x1, p.sy(Math.max(dom.y[0], 0)));
					ctx.lineTo(p.x0, p.sy(Math.max(dom.y[0], 0)));
					ctx.closePath();
					ctx.fillStyle = fill;
					ctx.fill();
				} else {
					if (dash) ctx.setLineDash(dash);
					ctx.strokeStyle = color;
					ctx.lineWidth = width;
					ctx.stroke();
				}
				ctx.restore();
			},
		};
		return p;
	}

	// Zeiger-Ereignisse in CSS-Pixeln relativ zum Canvas
	function pointer(el, { down, move, up, hover } = {}) {
		let active = false;
		const pos = (e) => {
			const r = el.getBoundingClientRect();
			return { x: e.clientX - r.left, y: e.clientY - r.top };
		};
		el.addEventListener("pointerdown", (e) => {
			active = true;
			el.setPointerCapture(e.pointerId);
			if (down) down(pos(e), e);
		});
		el.addEventListener("pointermove", (e) => {
			if (active && move) move(pos(e), e);
			else if (!active && hover) hover(pos(e), e);
		});
		const end = (e) => {
			if (!active) return;
			active = false;
			if (up) up(pos(e), e);
		};
		el.addEventListener("pointerup", end);
		el.addEventListener("pointercancel", end);
		el.addEventListener("pointerleave", (e) => {
			if (!active && hover) hover(null, e);
		});
	}

	// Chips: eine Gruppe Knöpfe, von denen einer gewählt ist
	function chips(container, items, onPick, start = 0) {
		const buttons = items.map((it, i) => {
			const b = document.createElement("button");
			b.type = "button";
			b.className = "btn chip";
			b.textContent = typeof it === "string" ? it : it.label;
			b.setAttribute("aria-pressed", String(i === start));
			b.addEventListener("click", () => set(i));
			container.appendChild(b);
			return b;
		});
		function set(i, silent = false) {
			buttons.forEach((b, j) => b.setAttribute("aria-pressed", String(i === j)));
			if (!silent) onPick(i, items[i]);
		}
		return { set, buttons };
	}

	// Schieberegler mit Ausgabe verbinden
	function slider(id, fmt, onChange) {
		const el = document.getElementById(id);
		const out = document.getElementById(`${id}Out`);
		const read = () => Number(el.value);
		const sync = () => {
			if (out) out.textContent = fmt(read());
			if (onChange) onChange(read());
		};
		el.addEventListener("input", sync);
		if (out) out.textContent = fmt(read());
		return {
			el,
			get value() { return read(); },
			set(v) {
				el.value = v;
				el.dispatchEvent(new Event("input"));
			},
		};
	}

	// Dichtefunktionen
	const SQRT2PI = Math.sqrt(2 * Math.PI);
	const normPdf = (x, m = 0, s = 1) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * SQRT2PI);
	function lgamma(z) {
		// Lanczos-Näherung
		const g = 7;
		const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
			12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
		if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
		z -= 1;
		let x = c[0];
		for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
		const t = z + g + 0.5;
		return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
	}
	const betaPdf = (x, a, b) =>
		x <= 0 || x >= 1 ? 0 : Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) + lgamma(a + b) - lgamma(a) - lgamma(b));
	const logChoose = (n, k) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);

	// Farbskala von dunkel nach Mint/Gelb für Heatmaps (t in 0..1)
	function heat(t) {
		t = clamp(t, 0, 1);
		const stops = [
			[8, 9, 11],
			[22, 46, 72],
			[34, 120, 128],
			[107, 227, 168],
			[246, 240, 170],
		];
		const f = t * (stops.length - 1);
		const i = Math.min(stops.length - 2, Math.floor(f));
		const u = f - i;
		return stops[i].map((v, k) => Math.round(lerp(v, stops[i + 1][k], u)));
	}

	return { clamp, lerp, nf, randn, C, plot, pointer, chips, slider, normPdf, lgamma, betaPdf, logChoose, heat };
})();
