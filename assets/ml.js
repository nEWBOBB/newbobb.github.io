// Gemeinsame Helfer der Rubrik „Machine Learning“: Zahlen, Zufall, Koordinatensysteme und Punkte zum Anfassen.
// Baut auf fitCanvas aus verstehen.js auf.

window.ML = (() => {
	const fmt = (v, d = 2) =>
		Number.isFinite(v)
			? v.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d })
			: "∞";

	// Reproduzierbarer Zufall (mulberry32)
	const rng = (seed = 1) => () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const gauss = (r = Math.random) => {
		const u = 1 - r();
		return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
	};

	const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

	// Koordinatensystem auf einem Canvas. x und y sind [min, max] in Weltkoordinaten.
	function plot(canvas, { aspect = 4 / 3, x = [0, 10], y = [0, 10], pad = 14, onResize } = {}) {
		const p = { x, y, pad };
		const fc = window.fitCanvas(canvas, aspect, () => p.ready && onResize && onResize());
		p.ctx = fc.ctx;
		p.size = fc.size;
		p.sx = (v) => pad + ((v - p.x[0]) / (p.x[1] - p.x[0])) * (p.size.w - 2 * pad);
		p.sy = (v) => p.size.h - pad - ((v - p.y[0]) / (p.y[1] - p.y[0])) * (p.size.h - 2 * pad);
		p.ix = (px) => p.x[0] + ((px - pad) / (p.size.w - 2 * pad)) * (p.x[1] - p.x[0]);
		p.iy = (py) => p.y[0] + ((p.size.h - pad - py) / (p.size.h - 2 * pad)) * (p.y[1] - p.y[0]);
		p.clear = (bg = "#070806") => {
			p.ctx.fillStyle = bg;
			p.ctx.fillRect(0, 0, p.size.w, p.size.h);
		};
		p.grid = (step = 1) => {
			const c = p.ctx;
			c.lineWidth = 1;
			c.strokeStyle = "rgba(255,255,255,0.05)";
			c.beginPath();
			for (let v = Math.ceil(p.x[0] / step) * step; v <= p.x[1]; v += step) {
				c.moveTo(Math.round(p.sx(v)) + 0.5, p.sy(p.y[0]));
				c.lineTo(Math.round(p.sx(v)) + 0.5, p.sy(p.y[1]));
			}
			for (let v = Math.ceil(p.y[0] / step) * step; v <= p.y[1]; v += step) {
				c.moveTo(p.sx(p.x[0]), Math.round(p.sy(v)) + 0.5);
				c.lineTo(p.sx(p.x[1]), Math.round(p.sy(v)) + 0.5);
			}
			c.stroke();
			c.strokeStyle = "rgba(255,255,255,0.16)";
			c.beginPath();
			if (p.y[0] <= 0 && p.y[1] >= 0) {
				c.moveTo(p.sx(p.x[0]), Math.round(p.sy(0)) + 0.5);
				c.lineTo(p.sx(p.x[1]), Math.round(p.sy(0)) + 0.5);
			}
			if (p.x[0] <= 0 && p.x[1] >= 0) {
				c.moveTo(Math.round(p.sx(0)) + 0.5, p.sy(p.y[0]));
				c.lineTo(Math.round(p.sx(0)) + 0.5, p.sy(p.y[1]));
			}
			c.stroke();
		};
		p.dot = (wx, wy, r = 5, fill = "#f4efe6", stroke = "#070806") => {
			const c = p.ctx;
			c.beginPath();
			c.arc(p.sx(wx), p.sy(wy), r, 0, Math.PI * 2);
			c.fillStyle = fill;
			c.fill();
			c.lineWidth = 2;
			c.strokeStyle = stroke;
			c.stroke();
		};
		p.ready = true;
		return p;
	}

	// Punkte per Zeiger bearbeiten: leere Stelle antippen = neu, ziehen = verschieben, antippen = löschen.
	function editPoints(canvas, p, { points, make = (x, y) => ({ x, y }), onChange, radius = 14, minPoints = 0 }) {
		let drag = null;
		const pos = (e) => {
			const r = canvas.getBoundingClientRect();
			return [e.clientX - r.left, e.clientY - r.top];
		};
		const clampX = (v) => Math.min(p.x[1], Math.max(p.x[0], v));
		const clampY = (v) => Math.min(p.y[1], Math.max(p.y[0], v));
		canvas.addEventListener("pointerdown", (e) => {
			const [px, py] = pos(e);
			const pts = points();
			let best = -1;
			let bd = radius;
			pts.forEach((q, i) => {
				const d = Math.hypot(p.sx(q.x) - px, p.sy(q.y) - py);
				if (d < bd) {
					bd = d;
					best = i;
				}
			});
			canvas.setPointerCapture(e.pointerId);
			if (best >= 0) drag = { i: best, x0: px, y0: py, moved: false };
			else {
				pts.push(make(clampX(p.ix(px)), clampY(p.iy(py))));
				drag = { i: pts.length - 1, x0: px, y0: py, moved: true };
				onChange();
			}
		});
		canvas.addEventListener("pointermove", (e) => {
			if (!drag) return;
			const [px, py] = pos(e);
			if (!drag.moved && Math.hypot(px - drag.x0, py - drag.y0) < 5) return;
			drag.moved = true;
			const q = points()[drag.i];
			q.x = clampX(p.ix(px));
			q.y = clampY(p.iy(py));
			onChange();
		});
		const end = () => {
			if (drag && !drag.moved && points().length > minPoints) {
				points().splice(drag.i, 1);
				onChange();
			}
			drag = null;
		};
		canvas.addEventListener("pointerup", end);
		canvas.addEventListener("pointercancel", () => (drag = null));
	}

	// Mehrere Neuzeichnungen pro Frame zu einer bündeln
	function scheduler(fn) {
		let queued = false;
		return () => {
			if (queued) return;
			queued = true;
			requestAnimationFrame(() => {
				queued = false;
				fn();
			});
		};
	}

	return { fmt, rng, gauss, css, plot, editPoints, scheduler };
})();
