"use strict";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const nf = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
const POT = "#6bb8ff";
const KIN = "#c6f16b";
const HEAT = "#ff7a59";
const GOLD = "#ffcf5a";
const INK = "#f4efe6";
const FONT = "'Space Grotesk', sans-serif";

const pointerAt = (canvas, e) => {
	const r = canvas.getBoundingClientRect();
	return [e.clientX - r.left, e.clientY - r.top];
};

// Drei gestapelte Energiebalken (senkrecht), Werte als Anteile von 0..1
function energyBars(ctx, x, y0, y1, bw, vals, labels = true) {
	const H = y1 - y0;
	const cols = [POT, KIN, HEAT];
	const names = ["Lage", "Bewegung", "Wärme"];
	vals.forEach((v, i) => {
		const bx = x + i * (bw + 8);
		ctx.fillStyle = "rgba(255,255,255,0.06)";
		ctx.beginPath();
		ctx.roundRect(bx, y0, bw, H, 6);
		ctx.fill();
		const hh = clamp(v, 0, 1) * H;
		const g = ctx.createLinearGradient(0, y1 - hh, 0, y1);
		g.addColorStop(0, cols[i]);
		g.addColorStop(1, `${cols[i]}88`);
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.roundRect(bx, y1 - hh, bw, hh, 6);
		ctx.fill();
		if (labels && bw >= 40) {
			ctx.save();
			ctx.translate(bx + bw / 2, y1 + 8);
			ctx.fillStyle = "rgba(244,239,230,0.55)";
			ctx.font = `10px ${FONT}`;
			ctx.textAlign = "center";
			ctx.fillText(names[i], 0, 6);
			ctx.restore();
		}
	});
	// Gesamt
	ctx.strokeStyle = "rgba(244,239,230,0.5)";
	ctx.setLineDash([3, 3]);
	ctx.beginPath();
	ctx.moveTo(x - 4, y0);
	ctx.lineTo(x + 3 * bw + 20, y0);
	ctx.stroke();
	ctx.setLineDash([]);
	ctx.fillStyle = "rgba(244,239,230,0.55)";
	ctx.font = `10px ${FONT}`;
	ctx.textAlign = "left";
	ctx.fillText("Gesamt", x - 2, y0 - 6);
}

// =====================================================================
// 1 · Pendel
// =====================================================================
(() => {
	const canvas = document.getElementById("pendCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.2));
	const fric = document.getElementById("fric");
	const fricOut = document.getElementById("fricOut");
	const note = document.getElementById("pendNote");

	let th = -1.0;
	let om = 0;
	let E0 = 1;
	let drag = false;
	let trail = [];

	const geo = () => {
		const { w, h } = size;
		const px = w * 0.36;
		const py = h * 0.1;
		const L = Math.min(h * 0.62, w * 0.42);
		return { px, py, L };
	};
	const gpx = (L) => L * (2 * Math.PI / 2.2) ** 2; // Periode etwa 2,2 s
	const energies = () => {
		const { L } = geo();
		const g = gpx(L);
		const ep = g * L * (1 - Math.cos(th));
		const ek = 0.5 * (om * L) ** 2;
		return [ep, ek];
	};
	function release() {
		const [ep, ek] = energies();
		E0 = Math.max(1e-6, ep + ek);
	}
	release();

	const fricWord = (v) => (v < 5 ? "keine" : v < 35 ? "wenig" : v < 70 ? "mittel" : "viel");
	fric.addEventListener("input", () => (fricOut.textContent = fricWord(Number(fric.value))));
	document.getElementById("btnPendReset").addEventListener("click", () => {
		th = -1.0;
		om = 0;
		trail = [];
		release();
	});

	canvas.addEventListener("pointerdown", (e) => {
		const [x, y] = pointerAt(canvas, e);
		const { px, py, L } = geo();
		const bx = px + Math.sin(th) * L;
		const by = py + Math.cos(th) * L;
		if (Math.hypot(x - bx, y - by) < 44) {
			drag = true;
			canvas.setPointerCapture(e.pointerId);
			canvas.style.cursor = "grabbing";
		}
	});
	canvas.addEventListener("pointermove", (e) => {
		if (!drag) return;
		const [x, y] = pointerAt(canvas, e);
		const { px, py } = geo();
		th = clamp(Math.atan2(x - px, y - py), -2.6, 2.6);
		om = 0;
		trail = [];
	});
	const up = () => {
		if (!drag) return;
		drag = false;
		canvas.style.cursor = "";
		release();
	};
	canvas.addEventListener("pointerup", up);
	canvas.addEventListener("pointercancel", up);

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const { px, py, L } = geo();
		const g = gpx(L);
		const c = (Number(fric.value) / 100) * 0.9;
		if (!drag) {
			const sub = 8;
			for (let i = 0; i < sub; i++) {
				const d = dt / sub;
				om += (-(g / L) * Math.sin(th) - c * om) * d;
				th += om * d;
			}
		}
		const [ep, ek] = energies();
		const heat = Math.max(0, E0 - ep - ek);
		const bx = px + Math.sin(th) * L;
		const by = py + Math.cos(th) * L;
		if (!drag) trail.push([bx, by]);
		if (trail.length > 50) trail.shift();

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		// Höhe-Nulllinie
		const low = py + L;
		ctx.strokeStyle = "rgba(255,255,255,0.08)";
		ctx.beginPath();
		ctx.moveTo(px - L, low);
		ctx.lineTo(px + L, low);
		ctx.stroke();
		// Starthöhe
		const startY = low - (E0 / g);
		if (E0 > 1) {
			ctx.setLineDash([5, 5]);
			ctx.strokeStyle = "rgba(107,184,255,0.45)";
			ctx.beginPath();
			ctx.moveTo(Math.max(0, px - L), startY);
			ctx.lineTo(px + L, startY);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = "rgba(107,184,255,0.7)";
			ctx.font = `10px ${FONT}`;
			ctx.textAlign = "left";
			ctx.fillText("Starthöhe", Math.max(6, px - L), startY - 5);
		}

		// Spur
		trail.forEach(([x, y], i) => {
			ctx.fillStyle = `rgba(198,241,107,${(i / trail.length) * 0.35})`;
			ctx.beginPath();
			ctx.arc(x, y, 3, 0, Math.PI * 2);
			ctx.fill();
		});

		// Aufhängung und Faden
		ctx.fillStyle = "#3a352f";
		ctx.fillRect(px - 50, py - 10, 100, 8);
		ctx.strokeStyle = "rgba(244,239,230,0.7)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(px, py);
		ctx.lineTo(bx, by);
		ctx.stroke();

		// Kugel: Farbe zeigt das Verhältnis Lage/Bewegung
		const r = Math.max(14, L * 0.09);
		const mix = ek / Math.max(1e-6, ep + ek);
		const glow = ctx.createRadialGradient(bx, by, r * 0.4, bx, by, r * 2.4);
		glow.addColorStop(0, `rgba(198,241,107,${0.35 * mix})`);
		glow.addColorStop(1, "rgba(198,241,107,0)");
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(bx, by, r * 2.4, 0, Math.PI * 2);
		ctx.fill();
		const ball = ctx.createRadialGradient(bx - r * 0.35, by - r * 0.35, r * 0.1, bx, by, r);
		ball.addColorStop(0, "#fff");
		ball.addColorStop(0.4, mix > 0.5 ? KIN : POT);
		ball.addColorStop(1, "#1c2430");
		ctx.fillStyle = ball;
		ctx.beginPath();
		ctx.arc(bx, by, r, 0, Math.PI * 2);
		ctx.fill();
		if (!drag && Math.abs(om) < 0.02 && Math.abs(th) < 0.02) {
			ctx.fillStyle = "rgba(244,239,230,0.6)";
			ctx.font = `12px ${FONT}`;
			ctx.textAlign = "center";
			ctx.fillText("Zieh mich zur Seite!", bx, by + r + 22);
		}

		// Balken
		const bw = Math.max(18, w * 0.045);
		energyBars(ctx, w - 3 * bw - 34, h * 0.12, h * 0.86, bw, [ep / E0, ek / E0, heat / E0]);

		if (drag) note.textContent = "Je höher du die Kugel ziehst, desto mehr Lageenergie steckt in ihr.";
		else if (heat / E0 > 0.9) note.textContent = "Fast alle Energie ist jetzt Wärme in Luft und Aufhängung. Verschwunden ist sie nicht, nur verteilt.";
		else if (ek / E0 > 0.85) note.textContent = "Ganz unten: fast nur Bewegungsenergie, hier ist die Kugel am schnellsten.";
		else if (ep / E0 > 0.85) note.textContent = "Umkehrpunkt: Die Kugel steht kurz still, alles ist Lageenergie.";
	});
})();

// =====================================================================
// 2 · Achterbahn-Baukasten
// =====================================================================
(() => {
	const canvas = document.getElementById("coasterCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 2.1));
	const out = document.getElementById("coasterOut");
	const note = document.getElementById("coasterNote");
	const btnRide = document.getElementById("btnRide");
	const btnFric = document.getElementById("btnCoastFric");

	const WORLD_H = 50; // Meter von unten bis oben
	const G = 9.81;
	const DEFAULT = [42, 6, 30, 10, 24, 4, 14, 8];
	let heights = DEFAULT.slice();
	let friction = true;
	let path = []; // [{x,y (m), s}]
	let total = 0;
	let cart = null;
	let drag = -1;
	let confetti = [];

	const marginX = () => size.w * 0.04;
	const mX = (i) => marginX() + (i / (heights.length - 1)) * (size.w - 2 * marginX());
	const k = () => (size.h - 30) / WORLD_H;
	const toY = (m) => size.h - 18 - m * k();

	function build() {
		// Catmull-Rom durch die Stützpunkte, in Metern
		const kk = k();
		const pts = heights.map((hm, i) => [mX(i) / kk, hm]);
		const ext = [[pts[0][0] - 1, pts[0][1]], ...pts, [pts[pts.length - 1][0] + 1, pts[pts.length - 1][1]]];
		path = [];
		for (let i = 1; i < ext.length - 2; i++) {
			const [p0, p1, p2, p3] = [ext[i - 1], ext[i], ext[i + 1], ext[i + 2]];
			for (let j = 0; j < 40; j++) {
				const t = j / 40;
				const t2 = t * t;
				const t3 = t2 * t;
				const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
				path.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: Math.max(0.5, f(p0[1], p1[1], p2[1], p3[1])) });
			}
		}
		const last = pts[pts.length - 1];
		path.push({ x: last[0], y: last[1] });
		total = 0;
		path[0].s = 0;
		for (let i = 1; i < path.length; i++) {
			total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
			path[i].s = total;
		}
	}
	function at(s) {
		s = clamp(s, 0, total);
		let lo = 0;
		let hi = path.length - 1;
		while (hi - lo > 1) {
			const m = (lo + hi) >> 1;
			if (path[m].s <= s) lo = m;
			else hi = m;
		}
		const a = path[lo];
		const b = path[hi];
		const t = (s - a.s) / Math.max(1e-9, b.s - a.s);
		const ds = Math.max(1e-9, b.s - a.s);
		return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), sin: (b.y - a.y) / ds, cos: (b.x - a.x) / ds };
	}

	function stop(msg) {
		cart = null;
		btnRide.textContent = "▶ Losfahren";
		if (msg) note.textContent = msg;
	}
	function start() {
		build();
		cart = { s: 0.3, v: 0.6, heat: 0, E0: G * at(0.3).y + 0.18, turns: 0, lastSign: 1, still: 0, maxV: 0, done: false };
		btnRide.textContent = "■ Anhalten";
		note.textContent = "Und los! Bergab wird der Wagen schneller, bergauf langsamer.";
	}
	btnRide.addEventListener("click", () => (cart && !cart.done ? stop("") : start()));
	btnFric.addEventListener("click", () => {
		friction = !friction;
		btnFric.setAttribute("aria-pressed", String(friction));
		note.textContent = friction
			? "Mit Reibung: Ein Teil der Energie wird bei jeder Fahrt zu Wärme."
			: "Ohne Reibung: In echt unmöglich, aber so siehst du die reine Energieerhaltung.";
	});
	document.getElementById("btnCoastReset").addEventListener("click", () => {
		heights = DEFAULT.slice();
		stop("Standardstrecke wiederhergestellt.");
		build();
	});
	document.getElementById("btnCoastRandom").addEventListener("click", () => {
		heights = heights.map((_, i) => (i === 0 ? 34 + Math.random() * 10 : 2 + Math.random() * 40));
		stop("Neue Strecke! Erkennst du schon vorher, wo der Wagen hängenbleibt?");
		build();
	});

	canvas.addEventListener("pointerdown", (e) => {
		const [x, y] = pointerAt(canvas, e);
		let best = -1;
		let bd = 36;
		heights.forEach((hm, i) => {
			const d = Math.hypot(x - mX(i), y - toY(hm));
			if (d < bd) {
				bd = d;
				best = i;
			}
		});
		if (best >= 0) {
			drag = best;
			canvas.setPointerCapture(e.pointerId);
			canvas.style.cursor = "grabbing";
			if (cart) stop("");
		}
	});
	canvas.addEventListener("pointermove", (e) => {
		if (drag < 0) return;
		const [, y] = pointerAt(canvas, e);
		heights[drag] = clamp((size.h - 18 - y) / k(), 1, WORLD_H - 3);
		build();
		const over = heights.slice(1).some((hm) => hm > heights[0]);
		note.textContent = over
			? "Achtung: Ein Hügel ragt über die Starthöhe (gestrichelte Linie). Da kommt der Wagen nie drüber!"
			: "Alle Hügel liegen unter der Starthöhe. Ob die Energie mit Reibung trotzdem reicht?";
	});
	const up = () => {
		drag = -1;
		canvas.style.cursor = "";
	};
	canvas.addEventListener("pointerup", up);
	canvas.addEventListener("pointercancel", up);

	let lastW = 0;
	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		if (w !== lastW) {
			lastW = w;
			build();
		}
		const kk = k();

		if (cart && !cart.done) {
			const sub = 20;
			for (let i = 0; i < sub; i++) {
				const d = (dt * 1.6) / sub;
				const p = at(cart.s);
				let a = -G * p.sin;
				if (friction) {
					const f = 0.025 * G * Math.abs(p.cos) + 0.0016 * cart.v * cart.v;
					a -= Math.sign(cart.v) * f;
					cart.heat += f * Math.abs(cart.v) * d;
				}
				cart.v += a * d;
				cart.s += cart.v * d;
				if (cart.s <= 0) {
					cart.s = 0;
					cart.v = Math.abs(cart.v) * 0.3;
				}
				if (cart.s >= total) {
					cart.s = total;
					cart.done = true;
					btnRide.textContent = "▶ Nochmal";
					note.textContent = `Geschafft! 🎉 Höchsttempo ${nf(cart.maxV * 3.6, 0)} km/h. ${friction ? `${Math.round((cart.heat / cart.E0) * 100)} % der Energie wurden unterwegs zu Wärme.` : ""}`;
					for (let c = 0; c < 70; c++)
						confetti.push({ x: mX(heights.length - 1), y: toY(heights[heights.length - 1]) - 20, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 300 - 60, c: [KIN, GOLD, POT, HEAT][c % 4], t: 0 });
					break;
				}
				const sg = Math.sign(cart.v);
				if (sg !== 0 && sg !== cart.lastSign) {
					cart.turns++;
					cart.lastSign = sg;
				}
				cart.maxV = Math.max(cart.maxV, Math.abs(cart.v));
			}
			if (!cart.done) {
				if (Math.abs(cart.v) < 0.25) cart.still += dt;
				else cart.still = 0;
				if (cart.turns >= 1 && cart.turns < 3) note.textContent = "Oh nein, der Wagen rollt zurück! Die Energie reicht nicht für diesen Hügel.";
				if (friction && cart.still > 1.2) {
					cart.done = true;
					btnRide.textContent = "▶ Nochmal";
					note.textContent = "Der Wagen hängt im Tal fest. Seine ganze Energie ist zu Wärme geworden. Mach die Hügel flacher oder den Start höher.";
				}
				if (!friction && cart.turns >= 4) note.textContent = "Ohne Reibung pendelt der Wagen ewig hin und her, ohne je über den Hügel zu kommen.";
			}
		}

		// Himmel
		const sky = ctx.createLinearGradient(0, 0, 0, h);
		sky.addColorStop(0, "#0d1626");
		sky.addColorStop(1, "#1a1420");
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = "#12100e";
		ctx.fillRect(0, h - 18, w, 18);

		// Höhenraster
		ctx.font = `10px ${FONT}`;
		ctx.textAlign = "left";
		for (let m = 10; m < WORLD_H; m += 10) {
			ctx.strokeStyle = "rgba(255,255,255,0.05)";
			ctx.beginPath();
			ctx.moveTo(0, toY(m));
			ctx.lineTo(w, toY(m));
			ctx.stroke();
			ctx.fillStyle = "rgba(255,255,255,0.3)";
			ctx.fillText(`${m} m`, 4, toY(m) - 3);
		}

		// Energiegrenze = Starthöhe
		const sy = toY(heights[0]);
		ctx.setLineDash([6, 6]);
		ctx.strokeStyle = "rgba(107,184,255,0.6)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(0, sy);
		ctx.lineTo(w, sy);
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.fillStyle = POT;
		ctx.textAlign = "right";
		ctx.fillText("Energie-Grenze: Starthöhe", w - 8, sy + 14);

		// Stützen
		ctx.strokeStyle = "rgba(244,239,230,0.12)";
		ctx.lineWidth = 2;
		for (let i = 0; i < path.length; i += 6) {
			const x = path[i].x * kk;
			ctx.beginPath();
			ctx.moveTo(x, toY(path[i].y) + 4);
			ctx.lineTo(x, h - 18);
			ctx.stroke();
		}

		// Schienen
		const draw = (off, col, lw) => {
			ctx.strokeStyle = col;
			ctx.lineWidth = lw;
			ctx.beginPath();
			path.forEach((p, i) => {
				const x = p.x * kk;
				const y = toY(p.y) + off;
				i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
			});
			ctx.stroke();
		};
		draw(4, "#5a4f44", 6);
		draw(0, "#d8d2c8", 3);
		ctx.strokeStyle = "rgba(90,79,68,0.9)";
		ctx.lineWidth = 2;
		for (let i = 0; i < path.length; i += 3) {
			const x = path[i].x * kk;
			const y = toY(path[i].y);
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x, y + 6);
			ctx.stroke();
		}

		// Ziel-Station
		const ex = mX(heights.length - 1);
		const ey = toY(heights[heights.length - 1]);
		ctx.fillStyle = "#2c3a22";
		ctx.fillRect(ex - 40, ey + 8, 44, h - 18 - ey - 8);
		for (let c = 0; c < 6; c++) {
			ctx.fillStyle = c % 2 ? INK : "#111";
			ctx.fillRect(ex - 40 + c * 7, ey - 34, 7, 7);
			ctx.fillStyle = c % 2 ? "#111" : INK;
			ctx.fillRect(ex - 40 + c * 7, ey - 27, 7, 7);
		}
		ctx.fillStyle = "rgba(244,239,230,0.4)";
		ctx.fillRect(ex - 41, ey - 34, 2, 42);

		// Stützpunkte
		heights.forEach((hm, i) => {
			const x = mX(i);
			const y = toY(hm);
			const bad = i > 0 && hm > heights[0];
			ctx.fillStyle = bad ? "#ff5a5a" : GOLD;
			ctx.strokeStyle = "#070605";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(x, y, drag === i ? 11 : 8, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			if (bad) {
				ctx.fillStyle = "#ff8a7a";
				ctx.font = `bold 11px ${FONT}`;
				ctx.textAlign = "center";
				ctx.fillText("zu hoch!", x, y - 16);
			}
			if (i === 0) {
				ctx.fillStyle = GOLD;
				ctx.font = `11px ${FONT}`;
				ctx.textAlign = "left";
				ctx.fillText("Start ↕", x + 4, y + 24);
			}
		});

		// Wagen
		const s = cart ? cart.s : 0.3;
		const p = at(s);
		const cx = p.x * kk;
		const cy = toY(p.y);
		const ang = -Math.atan2(p.sin, p.cos);
		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(ang);
		const cw = 34;
		ctx.fillStyle = "#e0453a";
		ctx.beginPath();
		ctx.roundRect(-cw / 2, -20, cw, 16, 5);
		ctx.fill();
		ctx.fillStyle = "#ffcf5a";
		ctx.fillRect(-cw / 2 + 3, -18, cw - 6, 3);
		const fast = cart && Math.abs(cart.v) > 14;
		for (const hx of [-8, 6]) {
			ctx.fillStyle = INK;
			ctx.beginPath();
			ctx.arc(hx, -25, 4, 0, Math.PI * 2);
			ctx.fill();
			if (fast) {
				ctx.strokeStyle = INK;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(hx - 3, -22);
				ctx.lineTo(hx - 6, -33);
				ctx.moveTo(hx + 3, -22);
				ctx.lineTo(hx + 6, -33);
				ctx.stroke();
			}
		}
		ctx.fillStyle = "#222";
		for (const wx of [-10, 10]) {
			ctx.beginPath();
			ctx.arc(wx, -3, 4, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();

		// Energie-Balken im Bild
		const E0 = cart ? cart.E0 : G * heights[0];
		const ep = G * p.y;
		const ek = cart ? 0.5 * cart.v * cart.v : 0;
		const heat = cart ? Math.max(0, E0 - ep - ek) : 0;
		const bwid = Math.min(220, w * 0.35);
		const bx = w - bwid - 14;
		const by = 30;
		const tot = ep + ek + heat || 1;
		let x = bx;
		for (const [v, c] of [
			[ep, POT],
			[ek, KIN],
			[heat, HEAT],
		]) {
			const ww = (v / tot) * bwid;
			ctx.fillStyle = c;
			ctx.fillRect(x, by + 14, ww, 10);
			x += ww;
		}
		ctx.strokeStyle = "rgba(255,255,255,0.25)";
		ctx.strokeRect(bx, by + 14, bwid, 10);
		ctx.fillStyle = "rgba(244,239,230,0.6)";
		ctx.font = `10px ${FONT}`;
		ctx.textAlign = "left";
		ctx.fillText("Energie des Wagens", bx, by + 8);

		out.textContent = cart ? `${nf(Math.abs(cart.v) * 3.6, 0)} km/h · ${nf(p.y, 0)} m hoch` : `Start auf ${nf(heights[0], 0)} m`;

		// Konfetti
		confetti = confetti.filter((c) => (c.t += dt) < 2.5);
		for (const c of confetti) {
			c.vy += 400 * dt;
			c.x += c.vx * dt;
			c.y += c.vy * dt;
			ctx.fillStyle = c.c;
			ctx.save();
			ctx.translate(c.x, c.y);
			ctx.rotate(c.t * 8 + c.vx);
			ctx.fillRect(-3, -1.5, 6, 3);
			ctx.restore();
		}
		void time;
	});
})();

// =====================================================================
// 3 · Wippe / Hebel
// =====================================================================
(() => {
	const canvas = document.getElementById("leverCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.1 : 1.45));
	const chips = document.getElementById("leverLoads");
	const out = document.getElementById("leverOut");
	const note = document.getElementById("leverNote");

	const LOADS = [
		{ name: "Hund", icon: "🐕", m: 20 },
		{ name: "Papa", icon: "🧔", m: 80 },
		{ name: "Klavier", icon: "🎹", m: 150 },
		{ name: "Elefant", icon: "🐘", m: 3000 },
	];
	const KID = 25;
	const DL = 1; // Abstand der Last
	const RMAX = 6; // Länge des rechten Arms
	let load = LOADS[1];
	let dr = 1.5;
	let tilt = 0;
	let vel = 0;
	let drag = false;
	let won = false;

	LOADS.forEach((l) => {
		const b = document.createElement("button");
		b.type = "button";
		b.className = "btn";
		b.textContent = `${l.icon} ${l.name} · ${nf(l.m)} kg`;
		b.setAttribute("aria-pressed", String(l === load));
		b.addEventListener("click", () => {
			load = l;
			won = false;
			[...chips.children].forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
		});
		chips.appendChild(b);
	});

	const geo = () => {
		const { w, h } = size;
		const scale = (w * 0.86) / (DL + 0.4 + RMAX + 0.3);
		const px = w * 0.07 + (DL + 0.4) * scale;
		const py = h * 0.66;
		return { scale, px, py };
	};
	const kidPos = () => {
		const { scale, px, py } = geo();
		return [px + Math.cos(tilt) * dr * scale, py + Math.sin(tilt) * dr * scale];
	};
	canvas.addEventListener("pointerdown", (e) => {
		const [x, y] = pointerAt(canvas, e);
		const [kx, ky] = kidPos();
		if (Math.hypot(x - kx, y - (ky - 24)) < 50) {
			drag = true;
			canvas.setPointerCapture(e.pointerId);
			canvas.style.cursor = "grabbing";
		}
	});
	canvas.addEventListener("pointermove", (e) => {
		if (!drag) return;
		const [x] = pointerAt(canvas, e);
		const { scale, px } = geo();
		dr = clamp((x - px) / scale / Math.cos(tilt), 0.3, RMAX);
	});
	const up = () => {
		drag = false;
		canvas.style.cursor = "";
	};
	canvas.addEventListener("pointerup", up);
	canvas.addEventListener("pointercancel", up);

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const { scale, px, py } = geo();
		const tl = load.m * DL;
		const tr = KID * dr;
		const ratio = tr / tl;
		const balanced = Math.abs(ratio - 1) < 0.04;
		const maxT = Math.asin(Math.min(0.95, (h - 22 - py) / (RMAX * scale)));
		const maxL = Math.asin(Math.min(0.95, (h - 22 - py) / ((DL + 0.4) * scale)));
		let target = balanced ? 0 : clamp((tl - tr) / Math.max(tl, tr), -1, 1) * 1.6;
		target = clamp(target, -maxL, maxT);
		// gedämpfte Feder zur Zielneigung
		vel += ((target - tilt) * 30 - vel * 7) * dt;
		tilt += vel * dt;
		tilt = clamp(tilt, -maxL, maxT);

		if (balanced && !won) won = true;
		if (!balanced) won = false;

		ctx.fillStyle = "#0a0c08";
		ctx.fillRect(0, 0, w, h);
		const grd = ctx.createLinearGradient(0, h - 22, 0, h);
		grd.addColorStop(0, "#2a3a1f");
		grd.addColorStop(1, "#141c0f");
		ctx.fillStyle = grd;
		ctx.fillRect(0, h - 22, w, 22);

		// Drehpunkt
		ctx.fillStyle = "#6b5f52";
		ctx.beginPath();
		ctx.moveTo(px, py + 4);
		ctx.lineTo(px - 26, h - 22);
		ctx.lineTo(px + 26, h - 22);
		ctx.fill();

		// Wegbögen, die die Enden bei vollem Kippen zurücklegen
		ctx.setLineDash([3, 5]);
		ctx.lineWidth = 1.5;
		for (const [d, col] of [
			[-DL, "rgba(255,122,89,0.45)"],
			[dr, "rgba(198,241,107,0.45)"],
		]) {
			ctx.strokeStyle = col;
			ctx.beginPath();
			const r = Math.abs(d) * scale;
			if (d < 0) ctx.arc(px, py, r, Math.PI - maxT, Math.PI + maxL);
			else ctx.arc(px, py, r, -maxL, maxT);
			ctx.stroke();
		}
		ctx.setLineDash([]);

		// Balken
		ctx.save();
		ctx.translate(px, py);
		ctx.rotate(tilt);
		const bl = (DL + 0.4) * scale;
		const br = (RMAX + 0.3) * scale;
		const wood = ctx.createLinearGradient(0, -6, 0, 6);
		wood.addColorStop(0, "#c49a6c");
		wood.addColorStop(1, "#7a5a3a");
		ctx.fillStyle = wood;
		ctx.beginPath();
		ctx.roundRect(-bl, -6, bl + br, 12, 4);
		ctx.fill();
		ctx.fillStyle = "rgba(0,0,0,0.35)";
		for (let m = -1; m <= RMAX; m++) {
			if (m === 0) continue;
			ctx.fillRect(m * scale - 1, -6, 2, 12);
		}
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.font = `10px ${FONT}`;
		ctx.textAlign = "center";
		for (let m = 1; m <= RMAX; m++) ctx.fillText(`${m} m`, m * scale, 20);

		// Last links, Größe nach Gewicht
		const sz = clamp(18 + Math.log10(load.m) * 14, 24, 74);
		ctx.font = `${sz}px serif`;
		ctx.textBaseline = "bottom";
		ctx.save();
		ctx.translate(-DL * scale, -6);
		ctx.rotate(-tilt);
		ctx.fillText(load.icon, 0, 2);
		ctx.restore();
		// Kind rechts
		ctx.save();
		ctx.translate(dr * scale, -6);
		ctx.rotate(-tilt);
		ctx.font = "34px serif";
		ctx.fillText("🧒", 0, 2);
		if (!drag) {
			ctx.font = `11px ${FONT}`;
			ctx.fillStyle = KIN;
			ctx.textBaseline = "alphabetic";
			ctx.fillText("↔ zieh mich", 0, -44);
		}
		ctx.restore();
		ctx.textBaseline = "alphabetic";
		ctx.restore();

		// Drehmoment-Anzeige
		const bwMax = w * 0.36;
		const big = Math.max(tl, tr);
		const yb = 44;
		ctx.font = `11px ${FONT}`;
		ctx.textAlign = "left";
		ctx.fillStyle = "rgba(244,239,230,0.6)";
		ctx.fillText(`${load.name}: ${nf(load.m)} kg × ${nf(DL, 1)} m`, 14, yb + 4);
		ctx.fillText(`Kind: ${KID} kg × ${nf(dr, 2)} m`, 14, yb + 30);
		ctx.fillStyle = HEAT;
		ctx.fillRect(14, yb + 9, (tl / big) * bwMax, 7);
		ctx.fillStyle = KIN;
		ctx.fillRect(14, yb + 35, (tr / big) * bwMax, 7);

		if (balanced) {
			ctx.fillStyle = "rgba(198,241,107,0.9)";
			ctx.font = `bold 15px ${FONT}`;
			ctx.textAlign = "center";
			ctx.fillText("⚖ Gleichgewicht!", w / 2, h * 0.2);
		}

		const need = (load.m * DL) / KID;
		out.textContent = balanced ? "⚖ im Gleichgewicht" : ratio < 1 ? "Last ist stärker" : "Kind ist stärker";
		if (need > RMAX) {
			note.textContent = `Für ${load.name === "Elefant" ? "den Elefanten" : "das " + load.name} müsste das Kind ${nf(need, 0)} m weit außen sitzen. Mit einer so langen Wippe ginge es tatsächlich, aber dann müsste das Kind ${nf(need, 0)}-mal so weit nach unten drücken, wie sich die Last hebt.`;
		} else if (balanced) {
			note.textContent = `Perfekt! Das Kind wiegt ${nf(load.m / KID, 1)}-mal weniger, sitzt dafür aber ${nf(dr / DL, 1)}-mal so weit außen. Wippt es, legt es auch einen ${nf(dr / DL, 1)}-mal so langen Weg zurück (gestrichelte Bögen).`;
		} else {
			note.textContent = ratio < 1 ? "Die Last gewinnt noch. Weiter nach außen!" : "Jetzt ist das Kind zu stark. Etwas weiter nach innen.";
		}
	});
})();

// =====================================================================
// 4 · Wasserkraftwerk
// =====================================================================
(() => {
	const canvas = document.getElementById("damCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1 : 1.3));
	const head = document.getElementById("head");
	const flow = document.getElementById("flow");
	const headOut = document.getElementById("headOut");
	const flowOut = document.getElementById("flowOut");
	const out = document.getElementById("damOut");
	const note = document.getElementById("damNote");

	const PER_HOUSE = 400; // W Durchschnittsverbrauch eines Haushalts
	const PER_ICON = 500;
	let rot = 0;
	let drops = [];
	let shown = 0;

	const power = () => 1000 * Number(flow.value) * 9.81 * Number(head.value) * 0.9;
	const fmtW = (p) => (p >= 1e6 ? `${nf(p / 1e6, 1)} MW` : `${nf(p / 1e3, 0)} kW`);
	function sync() {
		headOut.textContent = `${head.value} m`;
		flowOut.textContent = `${nf(Number(flow.value), 1)} m³`;
		const p = power();
		const houses = p / PER_HOUSE;
		out.textContent = `${fmtW(p)} · ${nf(houses, 0)} Haushalte`;
		note.textContent =
			p < 1
				? "Kein Wasser, kein Strom. Die Turbine steht still."
				: `${nf(Number(flow.value) * 1000, 0)} Liter fallen pro Sekunde ${head.value} m tief. Das reicht für etwa ${nf(houses, 0)} Haushalte oder ${nf(p / 2000, 0)} Wasserkocher gleichzeitig. Jedes Häuschen im Bild steht für ${PER_ICON} Haushalte.`;
	}
	head.addEventListener("input", sync);
	flow.addEventListener("input", sync);
	sync();

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const H = Number(head.value);
		const Q = Number(flow.value);
		const p = power();
		const ground = h * 0.88;
		const top = h * 0.12;
		const damX = w * 0.3;
		const lvl = lerp(ground - 20, top, H / 120);
		const tx = w * 0.46;
		const ty = ground - 22;

		rot += dt * Math.sqrt(p / 2e5) * 3;

		// Himmel und Berge
		const sky = ctx.createLinearGradient(0, 0, 0, h);
		sky.addColorStop(0, "#0c1a2c");
		sky.addColorStop(1, "#0f1712");
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = "#1a2618";
		ctx.beginPath();
		ctx.moveTo(0, top - 6);
		ctx.lineTo(damX * 0.4, top - 30);
		ctx.lineTo(damX, top - 8);
		ctx.lineTo(damX, h);
		ctx.lineTo(0, h);
		ctx.fill();

		// Stausee
		const water = ctx.createLinearGradient(0, lvl, 0, ground);
		water.addColorStop(0, "#3a8fd6");
		water.addColorStop(1, "#123a66");
		ctx.fillStyle = water;
		ctx.fillRect(0, lvl, damX, ground - lvl);
		ctx.strokeStyle = "rgba(255,255,255,0.35)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		for (let x = 0; x <= damX; x += 4) {
			const y = lvl + Math.sin(x * 0.08 + time * 2) * 1.5;
			x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
		}
		ctx.stroke();

		// Staumauer
		ctx.fillStyle = "#9a9590";
		ctx.beginPath();
		ctx.moveTo(damX - 4, top - 10);
		ctx.lineTo(damX + 12, top - 10);
		ctx.lineTo(damX + 40, ground);
		ctx.lineTo(damX - 4, ground);
		ctx.fill();

		// Fallhöhe
		ctx.strokeStyle = POT;
		ctx.fillStyle = POT;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(damX * 0.5, lvl);
		ctx.lineTo(damX * 0.5, ty);
		ctx.stroke();
		ctx.font = `12px ${FONT}`;
		ctx.textAlign = "center";
		ctx.fillText(`${H} m`, damX * 0.5 + 0.5, (lvl + ty) / 2 - 2);
		ctx.fillText("▲", damX * 0.5, lvl + 10);
		ctx.fillText("▼", damX * 0.5, ty);

		// Druckrohr
		ctx.strokeStyle = "#4a4e55";
		ctx.lineWidth = 12;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.moveTo(damX - 10, ground - 30);
		ctx.lineTo(tx, ty);
		ctx.stroke();
		ctx.lineCap = "butt";

		// Wassertropfen im Rohr und im Fluss
		const spawn = Q * 6 * dt;
		for (let i = 0; i < spawn + (Math.random() < spawn % 1 ? 1 : 0); i++) drops.push({ t: 0, j: Math.random() - 0.5 });
		const v = Math.sqrt(H) * 0.18;
		drops = drops.filter((d) => (d.t += dt * v) < 2.2);
		for (const d of drops) {
			let x, y;
			if (d.t < 1) {
				x = lerp(damX - 10, tx, d.t);
				y = lerp(ground - 30, ty, d.t) + d.j * 4;
			} else {
				x = lerp(tx, w + 10, (d.t - 1) / 1.2);
				y = ground + 6 + d.j * 6;
			}
			ctx.fillStyle = "rgba(143,211,255,0.9)";
			ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
		}
		// Fluss
		ctx.fillStyle = "rgba(58,143,214,0.35)";
		ctx.fillRect(tx, ground, w - tx, 12 * clamp(Q / 4, 0.1, 1));

		// Turbinenhaus mit Turbine
		ctx.fillStyle = "#2b2f36";
		ctx.fillRect(tx - 26, ty - 30, 52, 52);
		ctx.save();
		ctx.translate(tx, ty - 4);
		ctx.rotate(rot);
		ctx.fillStyle = GOLD;
		for (let i = 0; i < 6; i++) {
			ctx.rotate(Math.PI / 3);
			ctx.beginPath();
			ctx.ellipse(9, 0, 9, 3.5, 0.4, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = "#555";
		ctx.beginPath();
		ctx.arc(0, 0, 4, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.font = `10px ${FONT}`;
		ctx.fillText("Turbine", tx, ty + 34);

		// Stromleitung mit Funken
		const hx0 = w * 0.6;
		ctx.strokeStyle = "rgba(255,207,90,0.35)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(tx + 26, ty - 26);
		ctx.quadraticCurveTo((tx + hx0) / 2, ty - 70, hx0, ground - h * 0.5);
		ctx.stroke();
		if (p > 1) {
			for (let i = 0; i < 4; i++) {
				const t = (time * 0.8 + i / 4) % 1;
				const x = (1 - t) * (1 - t) * (tx + 26) + 2 * (1 - t) * t * ((tx + hx0) / 2) + t * t * hx0;
				const y = (1 - t) * (1 - t) * (ty - 26) + 2 * (1 - t) * t * (ty - 70) + t * t * (ground - h * 0.5);
				ctx.fillStyle = GOLD;
				ctx.beginPath();
				ctx.arc(x, y, 2.5, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		// Häuser-Raster
		const cols = 8;
		const rows = 6;
		const gw = w - hx0 - 12;
		const cell = Math.min(gw / cols, (ground - h * 0.2) / rows);
		const lit = p / PER_HOUSE / PER_ICON;
		shown = lerp(shown, lit, Math.min(1, dt * 4));
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const i = (rows - 1 - r) * cols + c;
				const x = hx0 + c * cell + cell * 0.15;
				const y = ground - (rows - r) * cell + cell * 0.2;
				const s = cell * 0.7;
				const on = clamp(shown - i, 0, 1);
				ctx.fillStyle = on > 0 ? `rgba(255,207,90,${0.15 + on * 0.25})` : "rgba(255,255,255,0.05)";
				ctx.beginPath();
				ctx.moveTo(x, y + s * 0.4);
				ctx.lineTo(x + s / 2, y);
				ctx.lineTo(x + s, y + s * 0.4);
				ctx.lineTo(x + s, y + s);
				ctx.lineTo(x, y + s);
				ctx.fill();
				if (on > 0) {
					ctx.fillStyle = `rgba(255,230,140,${on})`;
					ctx.fillRect(x + s * 0.2, y + s * 0.5, s * 0.22, s * 0.22);
					ctx.fillRect(x + s * 0.58, y + s * 0.5, s * 0.22, s * 0.22);
				}
			}
		}
		if (lit > cols * rows) {
			ctx.fillStyle = GOLD;
			ctx.font = `bold 12px ${FONT}`;
			ctx.textAlign = "center";
			ctx.fillText(`+ ${nf((lit - cols * rows) * PER_ICON, 0)} weitere`, hx0 + gw / 2, ground - rows * cell - 4);
		}
	});
})();

// =====================================================================
// 5 · Energie im Essen: wie hoch kommst du?
// =====================================================================
(() => {
	const canvas = document.getElementById("foodCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.85 : 2));
	const chips = document.getElementById("foods");
	const body = document.getElementById("body");
	const bodyOut = document.getElementById("bodyOut");
	const tag = document.getElementById("foodTag");
	const out = document.getElementById("foodOut");
	const note = document.getElementById("foodNote");

	const FOODS = [
		{ name: "Gummibärchen", icon: "🧸", kcal: 7 },
		{ name: "Apfel", icon: "🍎", kcal: 80 },
		{ name: "Banane", icon: "🍌", kcal: 105 },
		{ name: "Schokoriegel", icon: "🍫", kcal: 240 },
		{ name: "Pizza", icon: "🍕", kcal: 800 },
		{ name: "Handy-Akku", icon: "🔋", kcal: 13, note: "Kein Essen, aber spannend: Ein voller Handy-Akku (15 Wh) hat kaum mehr Energie als zwei Gummibärchen." },
		{ name: "1 Liter Benzin", icon: "⛽", kcal: 7600, note: "Benzin ist unglaublich energiereich. Deshalb fahren Autos mit einer Tankfüllung so weit." },
	];
	const LAND = [
		{ name: "Haus", h: 10 },
		{ name: "Kirchturm", h: 60 },
		{ name: "Eiffelturm", h: 330 },
		{ name: "Burj Khalifa", h: 828 },
		{ name: "Zugspitze", h: 2962 },
		{ name: "Mount Everest", h: 8849 },
		{ name: "Flugzeug", h: 11000 },
		{ name: "Wetterballon", h: 35000 },
	];
	const EFF = 0.25;
	let food = FOODS[0];
	let climb = 0; // aktuelle Höhe in m
	let view = 30; // sichtbare Höhe
	let t0 = 0;

	FOODS.forEach((f) => {
		const b = document.createElement("button");
		b.type = "button";
		b.className = "btn";
		b.textContent = `${f.icon} ${f.name}`;
		b.setAttribute("aria-pressed", String(f === food));
		b.addEventListener("click", () => {
			food = f;
			climb = 0;
			t0 = performance.now() / 1000;
			[...chips.children].forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
			sync();
		});
		chips.appendChild(b);
	});
	const target = () => (food.kcal * 4184 * EFF) / (Number(body.value) * 9.81);
	function sync() {
		bodyOut.textContent = `${body.value} kg`;
		tag.textContent = `${food.icon} ${food.name} · ${food.kcal} kcal`;
		const H = target();
		const next = LAND.find((l) => l.h > H);
		const prev = [...LAND].reverse().find((l) => l.h <= H);
		const floors = H / 3;
		let txt = `${food.kcal} kcal sind ${nf(food.kcal * 4.184, 0)} kJ. Ein Viertel davon wird zu Muskelarbeit, damit steigst du ${nf(H, 0)} m hoch`;
		txt += floors < 200 ? `, das sind ${nf(floors, 0)} Stockwerke.` : ".";
		if (prev) txt += ` Höher als ${prev.name === "Haus" ? "ein Haus" : prev.name === "Kirchturm" ? "ein Kirchturm" : prev.name === "Flugzeug" ? "ein Flugzeug" : prev.name === "Wetterballon" ? "ein Wetterballon" : `der ${prev.name}`}!`;
		else if (next) txt += ` Noch nicht ganz ${next.name === "Haus" ? "ein Haus" : next.name}.`;
		if (food.note) txt += ` ${food.note}`;
		note.textContent = txt;
	}
	body.addEventListener("input", () => {
		climb = Math.min(climb, target());
		sync();
	});
	sync();
	t0 = performance.now() / 1000;

	function landmark(l, x, base, k, w) {
		const hh = l.h * k;
		if (hh < 3) return;
		ctx.fillStyle = "rgba(255,255,255,0.09)";
		ctx.strokeStyle = "rgba(255,255,255,0.18)";
		ctx.lineWidth = 1;
		const s = Math.min(hh * 0.5, w);
		ctx.beginPath();
		if (l.name === "Zugspitze" || l.name === "Mount Everest") {
			ctx.moveTo(x - s, base);
			ctx.lineTo(x - s * 0.15, base - hh);
			ctx.lineTo(x + s * 0.1, base - hh * 0.93);
			ctx.lineTo(x + s, base);
		} else if (l.name === "Eiffelturm") {
			ctx.moveTo(x - s * 0.3, base);
			ctx.quadraticCurveTo(x - s * 0.04, base - hh * 0.5, x, base - hh);
			ctx.quadraticCurveTo(x + s * 0.04, base - hh * 0.5, x + s * 0.3, base);
		} else if (l.name === "Burj Khalifa") {
			ctx.moveTo(x - s * 0.1, base);
			ctx.lineTo(x - s * 0.03, base - hh * 0.8);
			ctx.lineTo(x, base - hh);
			ctx.lineTo(x + s * 0.03, base - hh * 0.8);
			ctx.lineTo(x + s * 0.1, base);
		} else if (l.name === "Kirchturm") {
			ctx.rect(x - s * 0.12, base - hh * 0.7, s * 0.24, hh * 0.7);
			ctx.moveTo(x - s * 0.14, base - hh * 0.7);
			ctx.lineTo(x, base - hh);
			ctx.lineTo(x + s * 0.14, base - hh * 0.7);
		} else if (l.name === "Haus") {
			ctx.rect(x - s * 0.5, base - hh * 0.7, s, hh * 0.7);
			ctx.moveTo(x - s * 0.6, base - hh * 0.7);
			ctx.lineTo(x, base - hh);
			ctx.lineTo(x + s * 0.6, base - hh * 0.7);
		} else {
			ctx.arc(x, base - hh, 5, 0, Math.PI * 2);
		}
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.font = `10px ${FONT}`;
		ctx.textAlign = "center";
		ctx.fillText(`${l.name} ${nf(l.h)} m`, x, base - hh - 8);
	}

	whenVisible(canvas, (dt, now) => {
		const { w, h } = size;
		const H = target();
		// Aufstieg dauert etwa 3 Sekunden, mit sanftem Abbremsen
		const p = clamp((now - t0) / 3, 0, 1);
		climb = H * (1 - Math.pow(1 - p, 3));
		const wantView = Math.max(25, climb * 1.35);
		view = lerp(view, wantView, Math.min(1, dt * 3));
		const base = h - 16;
		const k = (h - 40) / view;

		const sky = ctx.createLinearGradient(0, 0, 0, h);
		const high = clamp(Math.log10(view) / 4.5, 0, 1);
		sky.addColorStop(0, `rgb(${Math.round(lerp(40, 4, high))},${Math.round(lerp(80, 6, high))},${Math.round(lerp(140, 20, high))})`);
		sky.addColorStop(1, "#1a2430");
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, w, h);

		// Landmarken verteilt
		LAND.forEach((l, i) => l.h <= view * 0.95 && landmark(l, w * (0.4 + (i % 4) * 0.16), base, k, w * 0.12));

		// Hochhaus mit Stockwerken, in dem die Figur steigt
		const bx = w * 0.18;
		const bw = Math.min(70, w * 0.12);
		const bh = Math.max(climb, 3) * k;
		ctx.fillStyle = "#2a2f38";
		ctx.fillRect(bx - bw / 2, base - bh, bw, bh);
		const floorPx = 3 * k;
		if (floorPx > 4) {
			ctx.fillStyle = "rgba(255,230,140,0.4)";
			for (let f = 0; f * 3 < climb; f++) {
				const y = base - (f + 1) * floorPx;
				ctx.fillRect(bx - bw / 2 + 6, y + floorPx * 0.3, bw - 12, Math.max(1, floorPx * 0.35));
			}
		}
		// Höhenstrich
		ctx.strokeStyle = KIN;
		ctx.lineWidth = 2;
		ctx.setLineDash([4, 4]);
		ctx.beginPath();
		ctx.moveTo(bx + bw / 2 + 4, base - climb * k);
		ctx.lineTo(w - 8, base - climb * k);
		ctx.stroke();
		ctx.setLineDash([]);

		// Figur oben
		const fy = base - climb * k;
		ctx.font = "26px serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.fillText(p < 1 ? "🧗" : "🙌", bx, fy - 1);
		ctx.font = "18px serif";
		ctx.fillText(food.icon, bx + 26, fy - 4);
		ctx.textBaseline = "alphabetic";

		ctx.fillStyle = "#12100e";
		ctx.fillRect(0, base, w, h - base);

		ctx.fillStyle = KIN;
		ctx.font = `bold 15px ${FONT}`;
		ctx.textAlign = "left";
		ctx.fillText(`${nf(climb, climb < 100 ? 1 : 0)} m`, bx + bw / 2 + 10, Math.max(18, fy - 8));
		out.textContent = `${nf(H, 0)} m · ${H / 3 < 1000 ? `${nf(H / 3, 0)} Stockwerke` : `${nf(H / 1000, 1)} km`}`;
	});
})();
