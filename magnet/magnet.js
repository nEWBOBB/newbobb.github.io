"use strict";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const nf = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
const RED = "#ff6b6b";
const BLUE = "#6b8bff";
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

function drawBarMagnet(ctx, x, y, a, L, W) {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(a);
	ctx.shadowColor = "rgba(0,0,0,0.6)";
	ctx.shadowBlur = 10;
	ctx.fillStyle = RED;
	ctx.beginPath();
	ctx.roundRect(0, -W / 2, L / 2, W, [0, 6, 6, 0]);
	ctx.fill();
	ctx.fillStyle = BLUE;
	ctx.beginPath();
	ctx.roundRect(-L / 2, -W / 2, L / 2, W, [6, 0, 0, 6]);
	ctx.fill();
	ctx.shadowBlur = 0;
	ctx.fillStyle = "#fff";
	ctx.font = "bold 13px 'Space Grotesk', sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.save();
	ctx.translate(L * 0.32, 0);
	ctx.rotate(-a);
	ctx.fillText("N", 0, 1);
	ctx.restore();
	ctx.save();
	ctx.translate(-L * 0.32, 0);
	ctx.rotate(-a);
	ctx.fillText("S", 0, 1);
	ctx.restore();
	ctx.restore();
	ctx.textBaseline = "alphabetic";
}

function drawNeedle(ctx, x, y, ang, len, alpha = 1) {
	const c = Math.cos(ang);
	const s = Math.sin(ang);
	const hw = len * 0.16;
	ctx.globalAlpha = alpha;
	ctx.fillStyle = RED;
	ctx.beginPath();
	ctx.moveTo(x + c * len * 0.5, y + s * len * 0.5);
	ctx.lineTo(x - s * hw, y + c * hw);
	ctx.lineTo(x + s * hw, y - c * hw);
	ctx.fill();
	ctx.fillStyle = "#c9ced6";
	ctx.beginPath();
	ctx.moveTo(x - c * len * 0.5, y - s * len * 0.5);
	ctx.lineTo(x - s * hw, y + c * hw);
	ctx.lineTo(x + s * hw, y - c * hw);
	ctx.fill();
	ctx.globalAlpha = 1;
}

// =====================================================================
// 1 · Magnetfeld mit verschiebbaren Stabmagneten
// =====================================================================
(() => {
	const canvas = document.getElementById("fieldCanvas");
	const btnSecond = document.getElementById("btnSecond");
	const btnFlip = document.getElementById("btnFlip");
	const btnLines = document.getElementById("btnLines");
	const note = document.getElementById("fieldNote");
	let ctx;
	let size;
	let mags = [];
	let selected = 0;
	let showLines = true;
	let drag = null;
	let queued = false;

	const L = () => clamp(size.w * 0.2, 80, 120);
	const W = () => L() * 0.28;

	function poles(m) {
		const d = L() * 0.42;
		return [
			[m.x + Math.cos(m.a) * d, m.y + Math.sin(m.a) * d, 1],
			[m.x - Math.cos(m.a) * d, m.y - Math.sin(m.a) * d, -1],
		];
	}
	function field(x, y, list = mags) {
		let bx = 0;
		let by = 0;
		for (const m of list) {
			for (const [px, py, q] of poles(m)) {
				const dx = x - px;
				const dy = y - py;
				const r2 = dx * dx + dy * dy + 30;
				const r3 = r2 * Math.sqrt(r2);
				bx += (q * dx) / r3;
				by += (q * dy) / r3;
			}
		}
		return [bx, by];
	}
	function inside(m, x, y, pad = 0) {
		const c = Math.cos(-m.a);
		const s = Math.sin(-m.a);
		const lx = (x - m.x) * c - (y - m.y) * s;
		const ly = (x - m.x) * s + (y - m.y) * c;
		return Math.abs(lx) < L() / 2 + pad && Math.abs(ly) < W() / 2 + pad;
	}

	function draw() {
		queued = false;
		const { w, h } = size;
		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		// Feldlinien: von jedem Nordpol aus der Feldrichtung folgen
		if (showLines) {
			ctx.strokeStyle = "rgba(244,239,230,0.22)";
			ctx.lineWidth = 1.2;
			const south = mags.flatMap((m) => poles(m).filter((p) => p[2] < 0));
			for (const m of mags) {
				const [nx, ny] = poles(m)[0];
				const seeds = 16;
				for (let k = 0; k < seeds; k++) {
					const a0 = (k / seeds) * Math.PI * 2;
					let x = nx + Math.cos(a0) * 6;
					let y = ny + Math.sin(a0) * 6;
					ctx.beginPath();
					ctx.moveTo(x, y);
					for (let i = 0; i < 320; i++) {
						const [bx, by] = field(x, y);
						const b = Math.hypot(bx, by) || 1;
						x += (bx / b) * 5;
						y += (by / b) * 5;
						ctx.lineTo(x, y);
						if (x < -40 || y < -40 || x > w + 40 || y > h + 40) break;
						if (south.some(([sx, sy]) => (sx - x) ** 2 + (sy - y) ** 2 < 64)) break;
					}
					ctx.stroke();
				}
			}
		}

		// Kompassnadeln im Raster
		const g = w < 520 ? 24 : 28;
		for (let y = g / 2; y < h; y += g) {
			for (let x = g / 2; x < w; x += g) {
				if (mags.some((m) => inside(m, x, y, 6))) continue;
				const [bx, by] = field(x, y);
				const s = Math.hypot(bx, by) * 1e5;
				const alpha = clamp(0.18 + Math.log10(1 + s) * 0.32, 0.18, 1);
				drawNeedle(ctx, x, y, Math.atan2(by, bx), g * 0.62, alpha);
			}
		}

		mags.forEach((m, i) => {
			drawBarMagnet(ctx, m.x, m.y, m.a, L(), W());
			if (mags.length > 1 && i === selected) {
				ctx.strokeStyle = "rgba(255,255,255,0.5)";
				ctx.setLineDash([4, 4]);
				ctx.lineWidth = 1;
				ctx.save();
				ctx.translate(m.x, m.y);
				ctx.rotate(m.a);
				ctx.strokeRect(-L() / 2 - 5, -W() / 2 - 5, L() + 10, W() + 10);
				ctx.restore();
				ctx.setLineDash([]);
			}
		});

		// Kraft auf den zweiten Magneten
		if (mags.length === 2) {
			const [a, b] = mags;
			let fx = 0;
			let fy = 0;
			for (const [px, py, q] of poles(b)) {
				const [bx, by] = field(px, py, [a]);
				fx += q * bx;
				fy += q * by;
			}
			const f = Math.hypot(fx, fy);
			const attract = fx * (a.x - b.x) + fy * (a.y - b.y) > 0;
			if (f > 1e-7) {
				const len = clamp(Math.log10(1 + f * 1e6) * 18, 10, 60);
				const ux = fx / f;
				const uy = fy / f;
				const sx = b.x;
				const sy = b.y - W() / 2 - 16;
				ctx.strokeStyle = attract ? "#7bdc9a" : "#ffb04d";
				ctx.fillStyle = ctx.strokeStyle;
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.moveTo(sx, sy);
				ctx.lineTo(sx + ux * len, sy + uy * len);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(sx + ux * (len + 8), sy + uy * (len + 8));
				ctx.lineTo(sx + ux * len - uy * 6, sy + uy * len + ux * 6);
				ctx.lineTo(sx + ux * len + uy * 6, sy + uy * len - ux * 6);
				ctx.fill();
			}
			note.textContent = attract
				? "Sie ziehen sich an (grüner Pfeil). Die Feldlinien laufen vom Nordpol des einen direkt zum Südpol des anderen hinüber."
				: "Sie stoßen sich ab (oranger Pfeil). Die Feldlinien weichen sich aus und werden zur Seite gedrängt.";
		} else {
			note.textContent = "Die Nadeln zeigen überall in Richtung des Felds: außen vom Nordpol (rot) zum Südpol (blau).";
		}
	}
	const redraw = () => {
		if (!queued) {
			queued = true;
			requestAnimationFrame(draw);
		}
	};

	({ ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.3), () => {
		if (!ctx) return;
		for (const m of mags) {
			m.x = clamp(m.x, 20, size.w - 20);
			m.y = clamp(m.y, 20, size.h - 20);
		}
		redraw();
	}));
	mags = [{ x: size.w * 0.5, y: size.h * 0.5, a: 0 }];

	btnSecond.addEventListener("click", () => {
		if (mags.length === 1) {
			mags[0].x = size.w * 0.3;
			mags.push({ x: size.w * 0.72, y: size.h * 0.5, a: 0 });
			selected = 1;
			btnSecond.textContent = "Nur ein Magnet";
		} else {
			mags = [{ x: size.w * 0.5, y: size.h * 0.5, a: mags[0].a }];
			selected = 0;
			btnSecond.textContent = "Zweiten Magneten dazu";
		}
		redraw();
	});
	btnFlip.addEventListener("click", () => {
		mags[selected].a += Math.PI;
		redraw();
	});
	btnLines.addEventListener("click", () => {
		showLines = !showLines;
		btnLines.setAttribute("aria-pressed", String(showLines));
		redraw();
	});

	const at = (e) => {
		const r = canvas.getBoundingClientRect();
		return [e.clientX - r.left, e.clientY - r.top];
	};
	canvas.addEventListener("pointerdown", (e) => {
		const [x, y] = at(e);
		for (let i = mags.length - 1; i >= 0; i--) {
			if (inside(mags[i], x, y, 12)) {
				drag = { i, dx: x - mags[i].x, dy: y - mags[i].y };
				selected = i;
				canvas.setPointerCapture(e.pointerId);
				canvas.style.cursor = "grabbing";
				redraw();
				return;
			}
		}
	});
	canvas.addEventListener("pointermove", (e) => {
		if (!drag) return;
		const [x, y] = at(e);
		const m = mags[drag.i];
		m.x = clamp(x - drag.dx, 20, size.w - 20);
		m.y = clamp(y - drag.dy, 20, size.h - 20);
		redraw();
	});
	const end = () => {
		drag = null;
		canvas.style.cursor = "";
	};
	canvas.addEventListener("pointerup", end);
	canvas.addEventListener("pointercancel", end);
	draw();
})();

// =====================================================================
// 2 · Weiss-Bezirke im Eisen
// =====================================================================
(() => {
	const canvas = document.getElementById("domainCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.35 : 2));
	const temp = document.getElementById("temp");
	const tempOut = document.getElementById("tempOut");
	const out = document.getElementById("domainOut");
	const note = document.getElementById("domainNote");
	const CURIE = 770;
	let cells = [];
	let pointer = null;
	let shake = 0;
	let clips = 0;

	function layout() {
		const cols = size.w < 520 ? 9 : 14;
		const rows = 5;
		if (cells.length !== cols * rows) reset(cols, rows);
	}
	function reset(cols = size.w < 520 ? 9 : 14, rows = 5) {
		cells = [];
		for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ c, r, a: Math.random() * Math.PI * 2, cols, rows });
	}
	reset();
	document.getElementById("btnReset").addEventListener("click", () => reset());
	document.getElementById("btnHammer").addEventListener("click", () => {
		for (const d of cells) d.a += (Math.random() - 0.5) * 2.2;
		shake = 0.35;
	});
	temp.addEventListener("input", () => (tempOut.textContent = `${nf(Number(temp.value))} °C`));

	const at = (e) => {
		const r = canvas.getBoundingClientRect();
		return [e.clientX - r.left, e.clientY - r.top];
	};
	canvas.addEventListener("pointerdown", (e) => {
		canvas.setPointerCapture(e.pointerId);
		const [x, y] = at(e);
		pointer = { x, y, vx: 0, vy: 0, down: true };
	});
	canvas.addEventListener("pointermove", (e) => {
		const [x, y] = at(e);
		if (!pointer) pointer = { x, y, vx: 0, vy: 0, down: e.pointerType === "mouse" };
		pointer.vx = lerp(pointer.vx, x - pointer.x, 0.5);
		pointer.vy = lerp(pointer.vy, y - pointer.y, 0.5);
		pointer.x = x;
		pointer.y = y;
	});
	canvas.addEventListener("pointerleave", () => (pointer = null));
	canvas.addEventListener("pointerup", (e) => {
		if (e.pointerType !== "mouse") pointer = null;
	});

	whenVisible(canvas, (dt, time) => {
		layout();
		const { w, h } = size;
		const T = Number(temp.value);
		const x0 = w * 0.1;
		const x1 = w * 0.82;
		const y0 = h * 0.22;
		const y1 = h * 0.8;
		const cw = (x1 - x0) / cells[0].cols;
		const ch = (y1 - y0) / cells[0].rows;

		// Wärme rüttelt an den Bezirken; über der Curie-Temperatur völlig
		const sigma = T >= CURIE ? 7 : 0.01 + Math.pow(T / CURIE, 5) * 2.5;
		for (const d of cells) {
			d.a += (Math.random() - 0.5) * sigma * Math.sqrt(dt) * 2;
			if (pointer && Math.hypot(pointer.vx, pointer.vy) > 0.5 && T < CURIE) {
				const cx = x0 + (d.c + 0.5) * cw;
				const cy = y0 + (d.r + 0.5) * ch;
				const dist = Math.hypot(cx - pointer.x, cy - pointer.y);
				if (dist < 60) {
					const target = Math.atan2(pointer.vy, pointer.vx);
					d.a += angDiff(d.a, target) * Math.min(1, dt * 10) * (1 - dist / 60);
				}
			}
		}
		let mx = 0;
		let my = 0;
		for (const d of cells) {
			mx += Math.cos(d.a);
			my += Math.sin(d.a);
		}
		mx /= cells.length;
		my /= cells.length;
		const mag = Math.hypot(mx, my);
		shake = Math.max(0, shake - dt);
		const sx = shake > 0 ? Math.sin(time * 80) * shake * 10 : 0;

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		// Eisenstab
		const hot = clamp((T - 400) / 500, 0, 1);
		ctx.fillStyle = `rgb(${Math.round(lerp(58, 150, hot))},${Math.round(lerp(60, 40, hot))},${Math.round(lerp(66, 20, hot))})`;
		ctx.beginPath();
		ctx.roundRect(x0 - 8 + sx, y0 - 8, x1 - x0 + 16, y1 - y0 + 16, 10);
		ctx.fill();
		ctx.lineWidth = 2;
		for (const d of cells) {
			const cx = x0 + (d.c + 0.5) * cw + sx;
			const cy = y0 + (d.r + 0.5) * ch;
			const al = (Math.cos(d.a) * mx + Math.sin(d.a) * my) / (mag || 1);
			ctx.strokeStyle = "rgba(255,255,255,0.08)";
			ctx.strokeRect(cx - cw / 2 + 1, cy - ch / 2 + 1, cw - 2, ch - 2);
			const len = Math.min(cw, ch) * 0.34;
			const col = mag > 0.25 ? (al > 0.7 ? RED : "rgba(244,239,230,0.75)") : "rgba(244,239,230,0.75)";
			ctx.strokeStyle = col;
			ctx.fillStyle = col;
			const ex = cx + Math.cos(d.a) * len;
			const ey = cy + Math.sin(d.a) * len;
			ctx.beginPath();
			ctx.moveTo(cx - Math.cos(d.a) * len, cy - Math.sin(d.a) * len);
			ctx.lineTo(ex, ey);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(ex + Math.cos(d.a) * 4, ey + Math.sin(d.a) * 4);
			ctx.lineTo(ex - Math.cos(d.a) * 4 - Math.sin(d.a) * 4, ey - Math.sin(d.a) * 4 + Math.cos(d.a) * 4);
			ctx.lineTo(ex - Math.cos(d.a) * 4 + Math.sin(d.a) * 4, ey - Math.sin(d.a) * 4 - Math.cos(d.a) * 4);
			ctx.fill();
		}

		// Pole und Büroklammern, wenn magnetisch
		ctx.font = "bold 14px 'Space Grotesk', sans-serif";
		ctx.textAlign = "center";
		if (mag > 0.35 && Math.abs(mx) > Math.abs(my)) {
			const right = mx > 0;
			ctx.fillStyle = RED;
			ctx.fillText("N", right ? x1 + 24 : x0 - 24, (y0 + y1) / 2 + 5);
			ctx.fillStyle = BLUE;
			ctx.fillText("S", right ? x0 - 24 : x1 + 24, (y0 + y1) / 2 + 5);
		}
		const want = mag > 0.35 && T < CURIE ? Math.round(((mag - 0.35) / 0.65) * 5) + 1 : 0;
		clips += (want - clips) * Math.min(1, dt * 4);
		const nClips = Math.round(clips);
		ctx.strokeStyle = "#c9ced6";
		ctx.lineWidth = 2;
		for (let i = 0; i < nClips; i++) {
			const cx = x1 + 30 + (i % 2) * 10;
			const cy = y0 + 4 + i * 14 + Math.sin(time * 2 + i) * 1.5;
			ctx.beginPath();
			ctx.roundRect(cx, cy, 22, 9, 4);
			ctx.stroke();
		}

		// Magnet, der gerade drüberstreicht
		if (pointer && T < CURIE) {
			drawBarMagnet(ctx, pointer.x, pointer.y - 26, Math.atan2(pointer.vy, pointer.vx) || 0, 54, 15);
		}

		out.textContent = `${nf(mag * 100)} % magnetisch`;
		if (T >= CURIE) note.textContent = "Über 770 °C, der Curie-Temperatur, wirbelt die Hitze alles durcheinander. Glühendes Eisen kann gar nicht magnetisch sein.";
		else if (mag > 0.75) note.textContent = "Fast alle Bezirke zeigen in dieselbe Richtung: Das Eisen ist jetzt selbst ein Magnet und hält Büroklammern fest.";
		else if (mag > 0.35) note.textContent = "Ein Teil ist schon ausgerichtet. Streich noch ein paar Mal in dieselbe Richtung drüber.";
		else note.textContent = "Die Bezirke zeigen kreuz und quer, ihre Wirkungen heben sich auf. So ist das Eisen nicht magnetisch.";
	});
})();

// =====================================================================
// 3 · Ørsted: Kompassnadeln um einen stromdurchflossenen Draht
// =====================================================================
(() => {
	const canvas = document.getElementById("wireCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1 : 1.25));
	const btn = document.getElementById("btnCurrent");
	const rev = document.getElementById("btnReverse");
	const amp = document.getElementById("amp");
	const ampOut = document.getElementById("ampOut");
	const note = document.getElementById("wireNote");
	const s = { on: false, dir: 1, I: 0 };
	const needles = [];
	for (const [ring, n] of [
		[0.42, 8],
		[0.85, 12],
	]) {
		for (let i = 0; i < n; i++) needles.push({ ring, phi: (i / n) * Math.PI * 2 + (ring > 0.5 ? 0.13 : 0), a: -Math.PI / 2, v: 0 });
	}

	function updateNote() {
		if (!s.on) note.textContent = "Ohne Strom zeigen alle Nadeln einfach nach Norden, wie jeder Kompass.";
		else
			note.textContent = `Strom fließt ${s.dir > 0 ? "aus dem Bild heraus (⊙)" : "ins Bild hinein (⊗)"}. Die Nadeln legen sich im Kreis um den Draht. Weiter außen ist das Feld schwächer, dort zieht der Erd-Norden noch mit.`;
	}
	btn.addEventListener("click", () => {
		s.on = !s.on;
		btn.setAttribute("aria-pressed", String(s.on));
		btn.textContent = s.on ? "Strom ausschalten" : "Strom einschalten";
		updateNote();
	});
	rev.addEventListener("click", () => {
		s.dir *= -1;
		updateNote();
	});
	amp.addEventListener("input", () => (ampOut.textContent = `${amp.value} A`));
	updateNote();

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const cx = w / 2;
		const cy = h / 2;
		const R = Math.min(w, h) * 0.44;
		s.I += ((s.on ? Number(amp.value) * s.dir : 0) - s.I) * Math.min(1, dt * 10);

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		// Feldringe
		if (Math.abs(s.I) > 0.3) {
			ctx.strokeStyle = `rgba(255,107,107,${clamp(Math.abs(s.I) / 20, 0.08, 0.35)})`;
			ctx.lineWidth = 1.2;
			for (let k = 1; k <= 5; k++) {
				ctx.beginPath();
				ctx.arc(cx, cy, R * k * 0.18, 0, Math.PI * 2);
				ctx.stroke();
			}
		}
		// Norden
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.font = "12px 'Space Grotesk', sans-serif";
		ctx.textAlign = "center";
		ctx.fillText("↑ Norden", w - 44, 40);

		const len = Math.min(34, R * 0.2);
		for (const n of needles) {
			const r = n.ring * R;
			const x = cx + Math.cos(n.phi) * r;
			const y = cy + Math.sin(n.phi) * r;
			// Erdfeld nach oben plus Kreisfeld des Drahts (Stärke ~ I / Abstand)
			const strength = (s.I / 5) * 2.5 * (0.42 / n.ring);
			const bx = Math.sin(n.phi) * strength;
			const by = -1 - Math.cos(n.phi) * strength;
			const target = Math.atan2(by, bx);
			// Nadeln haben Trägheit: gedämpfte Drehschwingung
			n.v += angDiff(n.a, target) * 60 * dt - n.v * 6 * dt;
			n.a += n.v * dt;
			ctx.strokeStyle = "rgba(255,255,255,0.18)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(x, y, len * 0.62, 0, Math.PI * 2);
			ctx.stroke();
			drawNeedle(ctx, x, y, n.a, len);
		}

		// Draht
		ctx.fillStyle = "#d9a548";
		ctx.beginPath();
		ctx.arc(cx, cy, 14, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#1a1208";
		ctx.fillStyle = "#1a1208";
		ctx.lineWidth = 2.5;
		if (s.on && s.dir > 0) {
			ctx.beginPath();
			ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
			ctx.fill();
		} else if (s.on) {
			ctx.beginPath();
			ctx.moveTo(cx - 6, cy - 6);
			ctx.lineTo(cx + 6, cy + 6);
			ctx.moveTo(cx + 6, cy - 6);
			ctx.lineTo(cx - 6, cy + 6);
			ctx.stroke();
		}
	});
})();

// =====================================================================
// 4 · Gleichstrommotor mit (und ohne) Kommutator
// =====================================================================
(() => {
	const canvas = document.getElementById("motorCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1 : 1.25));
	const btn = document.getElementById("btnMotor");
	const comm = document.getElementById("btnComm");
	const volt = document.getElementById("volt");
	const voltOut = document.getElementById("voltOut");
	const out = document.getElementById("motorOut");
	const note = document.getElementById("motorNote");
	const s = { on: false, comm: true, th: 0.35, w: 0, I: 0 };
	const R = 2; // Ohm
	const K = 0.64; // Motorkonstante
	const J = 0.35;

	btn.addEventListener("click", () => {
		s.on = !s.on;
		btn.setAttribute("aria-pressed", String(s.on));
		btn.textContent = s.on ? "Strom ausschalten" : "Strom einschalten";
		if (s.on && Math.abs(Math.cos(s.th)) < 0.05 && Math.abs(s.w) < 0.1) s.th += 0.3; // aus der Totlage schubsen
	});
	comm.addEventListener("click", () => {
		s.comm = !s.comm;
		comm.setAttribute("aria-pressed", String(s.comm));
	});
	volt.addEventListener("input", () => (voltOut.textContent = `${nf(Number(volt.value), Number(volt.value) % 1 ? 1 : 0)} V`));

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const U = s.on ? Number(volt.value) : 0;
		const steps = 4;
		for (let i = 0; i < steps; i++) {
			const h2 = dt / steps;
			const c = Math.cos(s.th);
			const sign = s.comm ? (c >= 0 ? 1 : -1) : 1;
			// Gegenspannung: Ein drehender Motor ist auch ein Generator
			const back = K * s.w * c * sign;
			s.I = s.on ? (U - back) / R : 0;
			const torque = 2 * K * s.I * c * sign;
			s.w += ((torque - 0.06 * s.w - 0.02 * s.w * Math.abs(s.w)) / J) * h2;
			s.th += s.w * h2;
		}

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		const cx = w / 2;
		const cy = h * 0.47;
		const r = Math.min(w * 0.22, h * 0.3);

		// Feldmagnete
		const mw = Math.min(w * 0.14, 80);
		ctx.fillStyle = RED;
		ctx.beginPath();
		ctx.roundRect(cx - r - 26 - mw, cy - r * 1.05, mw, r * 2.1, 8);
		ctx.fill();
		ctx.fillStyle = BLUE;
		ctx.beginPath();
		ctx.roundRect(cx + r + 26, cy - r * 1.05, mw, r * 2.1, 8);
		ctx.fill();
		ctx.fillStyle = "#fff";
		ctx.font = "bold 18px 'Space Grotesk', sans-serif";
		ctx.textAlign = "center";
		ctx.fillText("N", cx - r - 26 - mw / 2, cy + 6);
		ctx.fillText("S", cx + r + 26 + mw / 2, cy + 6);
		ctx.strokeStyle = "rgba(244,239,230,0.12)";
		ctx.lineWidth = 1;
		for (let k = -2; k <= 2; k++) {
			const y = cy + k * r * 0.42;
			ctx.beginPath();
			ctx.moveTo(cx - r - 22, y);
			ctx.lineTo(cx + r + 22, y);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(cx + r + 16, y - 4);
			ctx.lineTo(cx + r + 22, y);
			ctx.lineTo(cx + r + 16, y + 4);
			ctx.stroke();
		}

		// Rotor: Drahtschleife von der Seite (zwei Leiter auf einem Kreis)
		const c = Math.cos(s.th);
		const sn = Math.sin(s.th);
		const ax = cx + c * r;
		const ay = cy + sn * r;
		const bx = cx - c * r;
		const by = cy - sn * r;
		const sign = s.comm ? (c >= 0 ? 1 : -1) : 1;
		const cur = s.I * sign;
		const live = Math.abs(cur) > 0.05;
		ctx.strokeStyle = live ? "#e7b25a" : "#7a6a58";
		ctx.lineWidth = 6;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.moveTo(ax, ay);
		ctx.lineTo(bx, by);
		ctx.stroke();
		ctx.lineCap = "butt";

		const conductor = (x, y, into) => {
			ctx.fillStyle = "#2b2219";
			ctx.strokeStyle = live ? "#e7b25a" : "#7a6a58";
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.arc(x, y, 12, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			if (!live) return;
			ctx.strokeStyle = "#f4efe6";
			ctx.fillStyle = "#f4efe6";
			if (into) {
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(x - 5, y - 5);
				ctx.lineTo(x + 5, y + 5);
				ctx.moveTo(x + 5, y - 5);
				ctx.lineTo(x - 5, y + 5);
				ctx.stroke();
			} else {
				ctx.beginPath();
				ctx.arc(x, y, 3, 0, Math.PI * 2);
				ctx.fill();
			}
		};
		conductor(ax, ay, cur > 0);
		conductor(bx, by, cur < 0);

		// Kräfte: senkrecht zum Feld
		if (live) {
			const f = clamp(Math.abs(cur) * 12, 18, 50);
			const dirA = cur > 0 ? 1 : -1; // Leiter A wird nach unten (1) oder oben (-1) gedrückt
			const arrow = (x, y, d) => {
				const y2 = y + d * (f + 14);
				ctx.strokeStyle = "#ffe14d";
				ctx.fillStyle = "#ffe14d";
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.moveTo(x, y + d * 14);
				ctx.lineTo(x, y2);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(x, y2 + d * 8);
				ctx.lineTo(x - 6, y2);
				ctx.lineTo(x + 6, y2);
				ctx.fill();
			};
			arrow(ax, ay, dirA);
			arrow(bx, by, -dirA);
		}

		// Kommutator unten: zwei Halbringe, die sich mitdrehen; Bürsten fest links und rechts
		const ky = h * 0.88;
		const kr = 18;
		if (s.comm) {
			for (const [half, col] of [
				[0, "#c98b4a"],
				[1, "#8a6a4a"],
			]) {
				ctx.fillStyle = col;
				ctx.beginPath();
				const a0 = s.th - Math.PI / 2 + half * Math.PI + 0.12;
				ctx.arc(cx, ky, kr, a0, a0 + Math.PI - 0.24);
				ctx.arc(cx, ky, kr - 8, a0 + Math.PI - 0.24, a0, true);
				ctx.fill();
			}
		} else {
			ctx.strokeStyle = "#c98b4a";
			ctx.lineWidth = 8;
			ctx.beginPath();
			ctx.arc(cx, ky, kr - 4, 0, Math.PI * 2);
			ctx.stroke();
		}
		ctx.fillStyle = "#555a60";
		ctx.fillRect(cx - kr - 16, ky - 5, 14, 10);
		ctx.fillRect(cx + kr + 2, ky - 5, 14, 10);
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.font = "11px 'Space Grotesk', sans-serif";
		ctx.fillText(s.comm ? "Kommutator" : "Schleifring (ohne Umpolen)", cx, ky + kr + 16);
		ctx.textAlign = "left";
		ctx.fillText("+", cx - kr - 30, ky + 4);
		ctx.textAlign = "right";
		ctx.fillText("−", cx + kr + 30, ky + 4);

		const rpm = Math.abs(s.w) / (Math.PI * 2) * 60;
		out.textContent = `${nf(Math.abs(s.I), 1)} A · ${nf(rpm)} U/min`;
		if (!s.on) note.textContent = Math.abs(s.w) > 0.3 ? "Strom aus: Der Rotor läuft noch etwas nach und wird von der Reibung gebremst." : "Strom ist aus. Gelbe Pfeile zeigen gleich die Kräfte auf die beiden Drähte.";
		else if (s.comm)
			note.textContent =
				rpm > 20
					? "Läuft! Bei jeder halben Drehung polt der Kommutator den Strom um, also drücken die gelben Kräfte immer in Drehrichtung. Je schneller er dreht, desto weniger Strom zieht er."
					: "Anlaufen: Die Drähte werden in entgegengesetzte Richtungen gedrückt, die Schleife dreht sich.";
		else
			note.textContent =
				Math.abs(s.w) > 0.4
					? "Ohne Kommutator schwingt die Schleife über die senkrechte Lage hinaus und wird dann zurückgedrückt …"
					: "… und bleibt senkrecht stehen. Die Kräfte drücken jetzt nur noch gegen die Achse, nicht mehr im Kreis. Ein Motor ohne Kommutator läuft nicht.";
	});
})();
