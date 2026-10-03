"use strict";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const nf = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
const SKY = "#8fd3ff";
const VIOLET = "#b78bff";
const INK = "#f4efe6";
const FONT = "'Space Grotesk', sans-serif";

const pointerAt = (canvas, e) => {
	const r = canvas.getBoundingClientRect();
	return [e.clientX - r.left, e.clientY - r.top];
};

function arrow(ctx, x0, y0, x1, y1, color, width = 2) {
	const a = Math.atan2(y1 - y0, x1 - x0);
	const len = Math.hypot(x1 - x0, y1 - y0);
	if (len < 2) return;
	const head = Math.min(8, len * 0.5);
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = width;
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x1 - Math.cos(a) * head * 0.6, y1 - Math.sin(a) * head * 0.6);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x1 - Math.cos(a - 0.45) * head, y1 - Math.sin(a - 0.45) * head);
	ctx.lineTo(x1 - Math.cos(a + 0.45) * head, y1 - Math.sin(a + 0.45) * head);
	ctx.fill();
}

// Ein fester Sternenhimmel pro Canvas
function makeStars(n) {
	const s = [];
	for (let i = 0; i < n; i++) s.push([Math.random(), Math.random(), Math.random() * 1.3 + 0.2, Math.random()]);
	return s;
}
function drawStars(ctx, stars, w, h, t = 0) {
	for (const [x, y, r, p] of stars) {
		ctx.fillStyle = `rgba(230,240,255,${0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + p * 20))})`;
		ctx.fillRect(x * w, y * h, r, r);
	}
}

// =====================================================================
// 1 · Fallrohr: Feder und Kugel, mit und ohne Luft
// =====================================================================
(() => {
	const canvas = document.getElementById("fallCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.85 : 1.15));
	const btnDrop = document.getElementById("btnDrop");
	const btnAir = document.getElementById("btnAir");
	const btnStrobe = document.getElementById("btnStrobe");
	const out = document.getElementById("fallOut");
	const tag = document.getElementById("fallTag");
	const note = document.getElementById("fallNote");

	const H = 2; // Rohrhöhe in Metern
	const G = 9.81;
	const SLOW = 0.22; // Zeitlupe
	let vacuum = false;
	let air = 1; // sichtbare Luftdichte 0..1
	let strobe = true;
	let state = null;
	const dust = Array.from({ length: 70 }, () => [Math.random(), Math.random(), Math.random() * 6]);

	function reset() {
		state = {
			t: 0,
			running: false,
			ball: { y: 0, v: 0, done: false, tDone: 0 },
			feather: { y: 0, v: 0, done: false, tDone: 0, rot: 0 },
			ghosts: [],
			nextGhost: 0,
		};
	}
	reset();

	btnDrop.addEventListener("click", () => {
		reset();
		state.running = true;
		note.textContent = vacuum ? "Achte genau darauf, wer zuerst unten ist …" : "Die Luft bremst die leichte Feder viel stärker als die Kugel …";
	});
	btnAir.addEventListener("click", () => {
		vacuum = !vacuum;
		btnAir.setAttribute("aria-pressed", String(vacuum));
		btnAir.textContent = vacuum ? "💨 Luft reinlassen" : "💨 Luft abpumpen";
		tag.textContent = vacuum ? "Vakuum" : "Mit Luft";
		reset();
		note.textContent = vacuum
			? "Die Luft ist raus. Jetzt lass beide nochmal fallen!"
			: "Mit Luft wird die Feder stark gebremst.";
	});
	btnStrobe.addEventListener("click", () => {
		strobe = !strobe;
		btnStrobe.setAttribute("aria-pressed", String(strobe));
	});

	function step(o, dt, drag) {
		// Feder: Luftwiderstand mit Endgeschwindigkeit ~0,6 m/s
		const a = G - (drag ? (G / 0.36) * o.v * Math.abs(o.v) : 0);
		o.v += a * dt;
		o.y += o.v * dt;
	}

	function drawBall(x, y, r) {
		const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
		g.addColorStop(0, "#ffffff");
		g.addColorStop(0.35, "#c9d3df");
		g.addColorStop(1, "#4a5260");
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fill();
	}
	function drawFeather(x, y, s, rot, alpha = 1) {
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(rot);
		ctx.globalAlpha = alpha;
		ctx.strokeStyle = "#f4efe6";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(0, -s);
		ctx.quadraticCurveTo(s * 0.1, 0, 0, s * 1.1);
		ctx.stroke();
		const g = ctx.createLinearGradient(-s * 0.5, 0, s * 0.5, 0);
		g.addColorStop(0, "rgba(183,139,255,0.85)");
		g.addColorStop(1, "rgba(143,211,255,0.85)");
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.moveTo(0, -s);
		ctx.bezierCurveTo(s * 0.6, -s * 0.5, s * 0.5, s * 0.5, 0, s * 0.8);
		ctx.bezierCurveTo(-s * 0.5, s * 0.5, -s * 0.6, -s * 0.5, 0, -s);
		ctx.fill();
		ctx.strokeStyle = "rgba(255,255,255,0.35)";
		ctx.lineWidth = 0.8;
		for (let i = -3; i <= 3; i++) {
			ctx.beginPath();
			ctx.moveTo(0, i * s * 0.2);
			ctx.lineTo(Math.sign(i || 1) * s * 0.4, i * s * 0.2 - s * 0.15);
			ctx.moveTo(0, i * s * 0.2);
			ctx.lineTo(-Math.sign(i || 1) * s * 0.4, i * s * 0.2 - s * 0.15);
			ctx.stroke();
		}
		ctx.restore();
	}

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		air = lerp(air, vacuum ? 0 : 1, Math.min(1, dt * 2));
		const s = state;
		if (s.running) {
			const sdt = dt * SLOW;
			const sub = 8;
			for (let i = 0; i < sub; i++) {
				const d = sdt / sub;
				s.t += d;
				for (const [o, drag] of [
					[s.ball, false],
					[s.feather, !vacuum],
				]) {
					if (o.done) continue;
					step(o, d, drag);
					if (o.y >= H) {
						o.y = H;
						o.done = true;
						o.tDone = s.t;
					}
				}
				if (s.t >= s.nextGhost) {
					s.ghosts.push([s.ball.done ? null : s.ball.y, s.feather.done ? null : s.feather.y, s.feather.rot]);
					s.nextGhost += 0.06;
				}
			}
			s.feather.rot = vacuum ? 0 : Math.sin(s.t * 9) * 0.6;
			if (s.ball.done && s.feather.done) {
				s.running = false;
				const diff = Math.abs(s.ball.tDone - s.feather.tDone);
				note.textContent =
					diff < 0.005
						? `Gleichzeitig unten, nach ${nf(s.ball.tDone, 2)} s! Ohne Luft spielt das Gewicht keine Rolle.`
						: `Kugel nach ${nf(s.ball.tDone, 2)} s, Feder erst nach ${nf(s.feather.tDone, 2)} s. Jetzt pump die Luft ab!`;
			}
			// Feder bleibt nach ~6 s Zeitlupe nicht ewig hängen
			if (!vacuum && s.t > 4) s.running = false;
		}
		out.textContent = `${nf(s.t, 2)} s`;

		// Hintergrund
		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		const tx0 = w * 0.25;
		const tx1 = w * 0.75;
		const ty0 = h * 0.08;
		const ty1 = h * 0.9;
		const yOf = (m) => lerp(ty0 + 26, ty1 - 18, m / H);

		// Glasrohr
		const glass = ctx.createLinearGradient(tx0, 0, tx1, 0);
		glass.addColorStop(0, "rgba(143,211,255,0.16)");
		glass.addColorStop(0.15, "rgba(143,211,255,0.04)");
		glass.addColorStop(0.85, "rgba(143,211,255,0.04)");
		glass.addColorStop(1, "rgba(143,211,255,0.16)");
		ctx.fillStyle = glass;
		ctx.beginPath();
		ctx.roundRect(tx0, ty0, tx1 - tx0, ty1 - ty0, 18);
		ctx.fill();
		ctx.strokeStyle = "rgba(143,211,255,0.35)";
		ctx.lineWidth = 1.5;
		ctx.stroke();

		// Luft als Staubkörnchen
		for (const [x, y, p] of dust) {
			const a = air * 0.5;
			if (a < 0.02) break;
			ctx.fillStyle = `rgba(244,239,230,${a * (0.4 + 0.6 * Math.sin(time + p) ** 2)})`;
			const px = lerp(tx0 + 8, tx1 - 8, (x + Math.sin(time * 0.6 + p) * 0.02 + 1) % 1);
			const py = lerp(ty0 + 8, ty1 - 8, (y + time * 0.01) % 1);
			ctx.fillRect(px, py, 1.6, 1.6);
		}

		// Meterskala
		ctx.font = `11px ${FONT}`;
		ctx.textAlign = "right";
		for (let m = 0; m <= H + 0.001; m += 0.25) {
			const y = yOf(m);
			ctx.strokeStyle = m % 1 === 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)";
			ctx.beginPath();
			ctx.moveTo(tx0 - (m % 0.5 === 0 ? 12 : 6), y);
			ctx.lineTo(tx0, y);
			ctx.stroke();
			if (m % 0.5 === 0) {
				ctx.fillStyle = "rgba(244,239,230,0.45)";
				ctx.fillText(`${nf(m, 1)} m`, tx0 - 16, y + 4);
			}
		}

		const bx = lerp(tx0, tx1, 0.32);
		const fx = lerp(tx0, tx1, 0.68);
		const r = Math.max(8, w * 0.025);

		// Blitzlicht-Spuren
		if (strobe) {
			s.ghosts.forEach(([by, fy, rot], i) => {
				const a = 0.12 + 0.18 * (i / s.ghosts.length);
				if (by !== null) {
					ctx.fillStyle = `rgba(201,211,223,${a})`;
					ctx.beginPath();
					ctx.arc(bx, yOf(by), r, 0, Math.PI * 2);
					ctx.fill();
				}
				if (fy !== null) drawFeather(fx + Math.sin(rot) * 10, yOf(fy), r * 1.5, rot, a * 1.4);
			});
		}

		drawBall(bx, yOf(s.ball.y), r);
		drawFeather(fx + Math.sin(s.feather.rot) * 10, yOf(s.feather.y), r * 1.5, s.feather.rot);

		// Boden des Rohrs
		ctx.fillStyle = "rgba(143,211,255,0.25)";
		ctx.fillRect(tx0 + 6, ty1 - 6, tx1 - tx0 - 12, 3);

		// Pumpe
		ctx.fillStyle = "#2a2622";
		ctx.fillRect(tx1 + 12, ty1 - 40, 26, 40);
		ctx.strokeStyle = "#5a5f68";
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.moveTo(tx1, ty1 - 20);
		ctx.lineTo(tx1 + 12, ty1 - 20);
		ctx.stroke();
		ctx.fillStyle = vacuum ? SKY : "rgba(244,239,230,0.4)";
		ctx.font = `10px ${FONT}`;
		ctx.textAlign = "center";
		ctx.fillText("Pumpe", tx1 + 25, ty1 + 14);
		ctx.fillText(`${Math.round(air * 100)} %`, tx1 + 25, ty1 - 18);

		ctx.fillStyle = "rgba(244,239,230,0.6)";
		ctx.font = `12px ${FONT}`;
		ctx.fillText("Kugel 200 g", bx, ty1 + 18);
		ctx.fillText("Feder 1 g", fx, ty1 + 18);
	});
})();

// =====================================================================
// 2 · Wurfparabel mit Zielscheibe
// =====================================================================
(() => {
	const canvas = document.getElementById("throwCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.15 : 1.55));
	const ang = document.getElementById("ang");
	const spd = document.getElementById("spd");
	const angOut = document.getElementById("angOut");
	const spdOut = document.getElementById("spdOut");
	const btnThrow = document.getElementById("btnThrow");
	const btnVec = document.getElementById("btnVec");
	const hitsEl = document.getElementById("hits");
	const triesEl = document.getElementById("tries");
	const out = document.getElementById("throwOut");
	const note = document.getElementById("throwNote");

	const G = 9.81;
	const WORLD = 60; // Meter Breite
	const X0 = 2;
	const Y0 = 1.6;
	let showVec = true;
	let hits = 0;
	let tries = 0;
	let ball = null;
	let trails = []; // alte Würfe
	let target = null;
	let aiming = null;
	let flash = 0;

	function newTarget() {
		target = { x: 18 + Math.random() * 36, y: Math.random() < 0.5 ? 0 : 2 + Math.random() * 10, r: 1.6 };
	}
	newTarget();

	const sync = () => {
		angOut.textContent = `${ang.value}°`;
		spdOut.textContent = `${spd.value} m/s`;
	};
	ang.addEventListener("input", sync);
	spd.addEventListener("input", sync);
	sync();

	function setRange(r, v) {
		r.value = v;
		r.dispatchEvent(new Event("input"));
	}

	function launch() {
		const a = (Number(ang.value) * Math.PI) / 180;
		const v = Number(spd.value);
		if (ball) trails.push(ball);
		trails = trails.slice(-3);
		ball = { x: X0, y: Y0, vx: v * Math.cos(a), vy: v * Math.sin(a), t: 0, pts: [], marks: [], nextMark: 0, maxY: Y0, done: false };
		tries++;
		triesEl.textContent = tries;
		note.textContent = "";
	}
	btnThrow.addEventListener("click", launch);
	btnVec.addEventListener("click", () => {
		showVec = !showVec;
		btnVec.setAttribute("aria-pressed", String(showVec));
	});

	let scale = 1;
	let gy = 0;
	const sx = (m) => 24 + m * scale;
	const sy = (m) => gy - m * scale;

	canvas.addEventListener("pointerdown", (e) => {
		canvas.setPointerCapture(e.pointerId);
		const [x, y] = pointerAt(canvas, e);
		aiming = { x0: sx(X0), y0: sy(Y0), x, y };
	});
	canvas.addEventListener("pointermove", (e) => {
		if (!aiming) return;
		const [x, y] = pointerAt(canvas, e);
		aiming.x = x;
		aiming.y = y;
		const dx = x - aiming.x0;
		const dy = aiming.y0 - y;
		const a = clamp(Math.round((Math.atan2(dy, dx) * 180) / Math.PI), 5, 85);
		const v = clamp(Math.round(Math.hypot(dx, dy) / (scale * 0.55)), 5, 32);
		setRange(ang, a);
		setRange(spd, v);
	});
	canvas.addEventListener("pointerup", () => {
		if (aiming) launch();
		aiming = null;
	});
	canvas.addEventListener("pointercancel", () => (aiming = null));

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		scale = (w - 40) / WORLD;
		gy = h - 34;
		flash = Math.max(0, flash - dt);

		// Physik, leicht beschleunigt
		if (ball && !ball.done) {
			const sdt = dt * 1.4;
			const sub = 10;
			for (let i = 0; i < sub; i++) {
				const d = sdt / sub;
				const px = ball.x;
				const py = ball.y;
				ball.vy -= G * d;
				ball.x += ball.vx * d;
				ball.y += ball.vy * d;
				ball.t += d;
				ball.maxY = Math.max(ball.maxY, ball.y);
				if (ball.t >= ball.nextMark) {
					ball.marks.push({ x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy });
					ball.nextMark += 0.4;
				}
				ball.pts.push([ball.x, ball.y]);
				// Zielscheibe: Ring von oben getroffen
				if (ball.vy < 0 && py >= target.y && ball.y <= target.y && Math.abs(lerp(px, ball.x, (py - target.y) / (py - ball.y)) - target.x) <= target.r) {
					ball.y = target.y;
					ball.done = true;
					hits++;
					hitsEl.textContent = hits;
					flash = 1.2;
					note.textContent = `Treffer! 🎯 ${ang.value}° mit ${spd.value} m/s. Neues Ziel ist aufgetaucht.`;
					setTimeout(newTarget, 900);
					break;
				}
				const inBox = target.y > 0 && ball.y < target.y && Math.abs(ball.x - target.x) < target.r + 0.3;
				if (ball.y <= 0 || inBox) {
					ball.y = Math.max(0, ball.y);
					ball.done = true;
					const miss = ball.x - target.x;
					note.textContent = inBox
						? "Gegen die Plattform geknallt! Etwas höher werfen."
						: `${miss < 0 ? "Zu kurz" : "Zu weit"} um ${nf(Math.abs(miss), 1)} m. Höchster Punkt: ${nf(ball.maxY, 1)} m.`;
					break;
				}
				if (ball.x > WORLD + 5) {
					ball.done = true;
					note.textContent = "Über das Ziel hinaus, weit hinaus!";
					break;
				}
			}
			out.textContent = `Weite ${nf(ball.x - X0, 1)} m`;
		}

		// Himmel
		const sky = ctx.createLinearGradient(0, 0, 0, h);
		sky.addColorStop(0, "#0b1424");
		sky.addColorStop(1, "#151a22");
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, w, h);

		// Raster alle 10 m
		ctx.strokeStyle = "rgba(255,255,255,0.05)";
		ctx.lineWidth = 1;
		ctx.font = `10px ${FONT}`;
		ctx.fillStyle = "rgba(244,239,230,0.35)";
		ctx.textAlign = "center";
		for (let m = 0; m <= WORLD; m += 10) {
			ctx.beginPath();
			ctx.moveTo(sx(m), 0);
			ctx.lineTo(sx(m), gy);
			ctx.stroke();
			ctx.fillText(`${m} m`, sx(m), gy + 26);
		}
		for (let m = 10; m * scale < gy; m += 10) {
			ctx.beginPath();
			ctx.moveTo(0, sy(m));
			ctx.lineTo(w, sy(m));
			ctx.stroke();
		}

		// Boden
		ctx.fillStyle = "#1d2a1f";
		ctx.fillRect(0, gy, w, h - gy);
		ctx.fillStyle = "#3c6b45";
		ctx.fillRect(0, gy, w, 3);

		// Ziel
		const tx = sx(target.x);
		const ty = sy(target.y);
		if (target.y > 0) {
			ctx.fillStyle = "#3a332c";
			ctx.fillRect(tx - target.r * scale - 4, ty, target.r * scale * 2 + 8, gy - ty);
			ctx.fillStyle = "#5a4f44";
			ctx.fillRect(tx - target.r * scale - 6, ty, target.r * scale * 2 + 12, 4);
		}
		const pulse = 1 + Math.sin(time * 4) * 0.06;
		for (let k = 3; k >= 1; k--) {
			ctx.fillStyle = k % 2 ? (flash > 0 ? "#7bdc9a" : "#ff6a5a") : "#f4efe6";
			ctx.beginPath();
			ctx.ellipse(tx, ty - 2, ((target.r * scale * k) / 3) * pulse, ((target.r * scale * k) / 3) * 0.32 * pulse, 0, 0, Math.PI * 2);
			ctx.fill();
		}

		// alte Würfe
		trails.forEach((b, i) => {
			ctx.strokeStyle = `rgba(143,211,255,${0.1 + i * 0.06})`;
			ctx.lineWidth = 1.5;
			ctx.setLineDash([3, 5]);
			ctx.beginPath();
			b.pts.forEach(([x, y], j) => (j ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y))));
			ctx.stroke();
			ctx.setLineDash([]);
		});

		// Werfer
		const wx = sx(X0);
		const wy = sy(Y0);
		ctx.strokeStyle = INK;
		ctx.lineWidth = 3;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.arc(wx - 6, gy - 50, 7, 0, Math.PI * 2);
		ctx.moveTo(wx - 6, gy - 43);
		ctx.lineTo(wx - 6, gy - 20);
		ctx.lineTo(wx - 12, gy);
		ctx.moveTo(wx - 6, gy - 20);
		ctx.lineTo(wx, gy);
		ctx.moveTo(wx - 6, gy - 38);
		ctx.lineTo(wx, wy);
		ctx.stroke();

		// Zielhilfe: nur Abwurfrichtung, keine ganze Bahn
		const a = (Number(ang.value) * Math.PI) / 180;
		const v = Number(spd.value);
		arrow(ctx, wx, wy, wx + Math.cos(a) * v * scale * 0.55, wy - Math.sin(a) * v * scale * 0.55, "rgba(255,255,255,0.55)", 2);

		if (ball) {
			ctx.strokeStyle = SKY;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ball.pts.forEach(([x, y], j) => (j ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y))));
			ctx.stroke();
			const k = scale * 0.3;
			for (const m of ball.marks) {
				const mx = sx(m.x);
				const my = sy(m.y);
				ctx.fillStyle = "rgba(244,239,230,0.6)";
				ctx.beginPath();
				ctx.arc(mx, my, 3, 0, Math.PI * 2);
				ctx.fill();
				if (showVec) {
					arrow(ctx, mx, my, mx + m.vx * k, my, SKY, 2);
					arrow(ctx, mx, my, mx, my - m.vy * k, VIOLET, 2);
				}
			}
			const bx = sx(ball.x);
			const by = sy(ball.y);
			const g = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, 7);
			g.addColorStop(0, "#fff");
			g.addColorStop(1, "#ffb366");
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(bx, by, 6, 0, Math.PI * 2);
			ctx.fill();
		}

		if (showVec) {
			ctx.textAlign = "left";
			ctx.font = `11px ${FONT}`;
			ctx.fillStyle = SKY;
			ctx.fillText("→ waagerecht: bleibt gleich", 12, 44);
			ctx.fillStyle = VIOLET;
			ctx.fillText("↕ senkrecht: Schwerkraft ändert es", 12, 60);
		}
	});
})();

// =====================================================================
// 3 · Newtons Kanonenkugel
// =====================================================================
(() => {
	const canvas = document.getElementById("cannonCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.15));
	const vIn = document.getElementById("vCannon");
	const vOut = document.getElementById("vOut");
	const out = document.getElementById("cannonOut");
	const note = document.getElementById("cannonNote");
	const stars = makeStars(140);

	const GM = 398600; // km³/s²
	const R = 6371;
	const ALT = 300; // Bergspitze, stark übertrieben gezeichnet
	const r0 = R + ALT;
	const vCirc = Math.sqrt(GM / r0);
	const vEsc = Math.sqrt((2 * GM) / r0);
	const TIME = 900; // Sekunden Simulation pro echter Sekunde
	let shots = [];

	const v = () => Number(vIn.value) / 10;
	function describe(val) {
		if (val < vCirc - 0.12) return "Die Kugel fällt zurück auf die Erde. Je schneller, desto weiter kommt sie vorher.";
		if (val <= vCirc + 0.12) return "Kreisbahn! Die Kugel fällt genauso schnell, wie sich die Erde unter ihr wegkrümmt. Sie umrundet die Erde in etwa 90 Minuten.";
		if (val < vEsc) return "Eine Ellipse: Die Kugel schwingt weit hinaus und kommt doch immer wieder zurück, wie ein Komet.";
		return "Fluchtgeschwindigkeit überschritten. Die Erde kann die Kugel nicht mehr zurückholen, sie fliegt ins All davon.";
	}
	function sync() {
		vOut.textContent = `${nf(v(), 1)} km/s`;
		out.textContent = `${nf(v(), 1)} km/s · ${nf(v() * 3600, 0)} km/h`;
		note.textContent = describe(v());
	}
	vIn.addEventListener("input", sync);
	sync();

	document.getElementById("btnFire").addEventListener("click", () => {
		const val = v();
		const hue = lerp(30, 280, clamp((val - 2) / 10, 0, 1));
		shots.push({ x: 0, y: r0, vx: val, vy: 0, pts: [[0, r0]], alive: true, angle: 0, hue, puff: 1 });
		shots = shots.slice(-7);
	});
	document.getElementById("btnClearOrbit").addEventListener("click", () => (shots = []));

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const cx = w / 2;
		const cy = h / 2 + h * 0.04;
		const k = (Math.min(w, h) * 0.24) / R; // px pro km
		const altVis = 2.6; // Berg optisch höher

		for (const s of shots) {
			s.puff = Math.max(0, s.puff - dt * 1.5);
			if (!s.alive) continue;
			const steps = 300;
			const d = (dt * TIME) / steps;
			for (let i = 0; i < steps; i++) {
				const r = Math.hypot(s.x, s.y);
				const a = -GM / (r * r * r);
				s.vx += a * s.x * d;
				s.vy += a * s.y * d;
				const ox = s.x;
				s.x += s.vx * d;
				s.y += s.vy * d;
				if (ox < 0 && s.x >= 0 && s.y > 0) s.angle++;
				const rn = Math.hypot(s.x, s.y);
				if (rn < R) {
					s.alive = false;
					s.crash = [s.x * (R / rn), s.y * (R / rn)];
					break;
				}
				if (s.angle >= 1 || rn > R * 9) {
					s.alive = false;
					break;
				}
			}
			s.pts.push([s.x, s.y]);
		}

		ctx.fillStyle = "#04050a";
		ctx.fillRect(0, 0, w, h);
		drawStars(ctx, stars, w, h, time);

		// Atmosphäre
		const rr = R * k;
		const atm = ctx.createRadialGradient(cx, cy, rr * 0.95, cx, cy, rr * 1.22);
		atm.addColorStop(0, "rgba(120,190,255,0.45)");
		atm.addColorStop(1, "rgba(120,190,255,0)");
		ctx.fillStyle = atm;
		ctx.beginPath();
		ctx.arc(cx, cy, rr * 1.22, 0, Math.PI * 2);
		ctx.fill();
		// Erde
		const earth = ctx.createRadialGradient(cx - rr * 0.35, cy - rr * 0.4, rr * 0.1, cx, cy, rr);
		earth.addColorStop(0, "#4aa3e0");
		earth.addColorStop(0.7, "#1d5b9a");
		earth.addColorStop(1, "#0b2747");
		ctx.fillStyle = earth;
		ctx.beginPath();
		ctx.arc(cx, cy, rr, 0, Math.PI * 2);
		ctx.fill();
		ctx.save();
		ctx.clip();
		ctx.fillStyle = "rgba(90,170,100,0.8)";
		for (const [ax, ay, ar] of [
			[-0.3, -0.2, 0.32],
			[0.25, 0.1, 0.28],
			[-0.05, 0.45, 0.22],
			[0.45, -0.45, 0.18],
			[-0.55, 0.3, 0.15],
		]) {
			ctx.beginPath();
			ctx.ellipse(cx + ax * rr, cy + ay * rr, ar * rr, ar * rr * 0.7, ax * 3, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();

		// Berg mit Kanone (oben)
		const peak = cy - (R + ALT * altVis) * k;
		ctx.fillStyle = "#6b5f52";
		ctx.beginPath();
		ctx.moveTo(cx - rr * 0.22, cy - rr * 0.975);
		ctx.lineTo(cx - 4, peak);
		ctx.lineTo(cx + 4, peak);
		ctx.lineTo(cx + rr * 0.22, cy - rr * 0.975);
		ctx.fill();
		ctx.fillStyle = "#f4efe6";
		ctx.beginPath();
		ctx.moveTo(cx - 10, peak + 8);
		ctx.lineTo(cx - 4, peak);
		ctx.lineTo(cx + 4, peak);
		ctx.lineTo(cx + 10, peak + 8);
		ctx.fill();
		ctx.fillStyle = "#2a2622";
		ctx.fillRect(cx - 4, peak - 9, 18, 7);
		ctx.beginPath();
		ctx.arc(cx - 2, peak - 2, 4, 0, Math.PI * 2);
		ctx.fill();

		// Flugbahnen
		const P = ([x, y]) => {
			const r = Math.hypot(x, y);
			const f = (R + (r - R) * altVis) / r;
			return [cx + x * f * k, cy - y * f * k];
		};
		for (const s of shots) {
			ctx.strokeStyle = `hsla(${s.hue},90%,70%,0.85)`;
			ctx.lineWidth = 2;
			ctx.beginPath();
			s.pts.forEach((p, i) => {
				const [x, y] = P(p);
				i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
			});
			ctx.stroke();
			const [hx, hy] = P(s.pts[s.pts.length - 1]);
			if (s.alive) {
				ctx.fillStyle = "#fff";
				ctx.beginPath();
				ctx.arc(hx, hy, 4, 0, Math.PI * 2);
				ctx.fill();
			} else if (s.crash) {
				const [ex, ey] = P(s.crash);
				ctx.fillStyle = `hsla(${s.hue},90%,65%,0.9)`;
				ctx.beginPath();
				ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
				ctx.fill();
			}
			if (s.puff > 0) {
				ctx.fillStyle = `rgba(255,220,160,${s.puff * 0.7})`;
				ctx.beginPath();
				ctx.arc(cx + 16, peak - 6, 6 + (1 - s.puff) * 16, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		// Legende
		ctx.font = `11px ${FONT}`;
		ctx.textAlign = "left";
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.fillText(`Kreisbahn ≈ ${nf(vCirc, 1)} km/s`, 12, h - 28);
		ctx.fillText(`Flucht ≈ ${nf(vEsc, 1)} km/s`, 12, h - 12);
	});
})();

// =====================================================================
// 4 · Springen auf anderen Himmelskörpern
// =====================================================================
(() => {
	const canvas = document.getElementById("jumpCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.9 : 1.2));
	const chips = document.getElementById("worlds");
	const mass = document.getElementById("mass");
	const massOut = document.getElementById("massOut");
	const tag = document.getElementById("jumpTag");
	const out = document.getElementById("jumpOut");
	const note = document.getElementById("jumpNote");

	const WORLDS = [
		{ name: "Erde", g: 9.81, ground: "#3c6b45", soil: "#2a3a2a", sky: ["#2a5d9a", "#89b8e6"], note: "Zuhause. Ein guter Sprung bringt dich etwa einen halben Meter hoch." },
		{ name: "Mond", g: 1.62, ground: "#8d8a86", soil: "#55524e", sky: ["#020205", "#0a0a12"], note: "Sechsmal schwächere Schwerkraft: Du schwebst sekundenlang. Astronauten hüpften hier wie Kängurus." },
		{ name: "Mars", g: 3.71, ground: "#c0643a", soil: "#7a3a20", sky: ["#6e3a2a", "#d9a07a"], note: "Gut ein Drittel der Erdschwere. Ein Basketballkorb wäre hier kein Problem." },
		{ name: "Jupiter", g: 24.79, ground: "#c9a27a", soil: "#8a6a4a", sky: ["#7a5a3a", "#e0c090"], note: "Zweieinhalbmal so stark wie auf der Erde. Jeder Schritt wäre wie mit einem schweren Rucksack. (Einen festen Boden hat Jupiter übrigens gar nicht.)" },
		{ name: "Pluto", g: 0.62, ground: "#d8cfc4", soil: "#9a8f84", sky: ["#020205", "#14101c"], note: "Winzige Schwerkraft. Mit einem Sprung kämst du über ein zweistöckiges Haus." },
	];
	let world = WORLDS[0];
	const V0 = 3.1; // Absprunggeschwindigkeit m/s
	const VIEW = 9; // sichtbare Höhe in Metern
	let jump = null;
	let crouch = 0;

	WORLDS.forEach((wd) => {
		const b = document.createElement("button");
		b.type = "button";
		b.className = "btn";
		b.textContent = `${wd.name} · ${nf(wd.g, 2)}`;
		b.setAttribute("aria-pressed", String(wd === world));
		b.addEventListener("click", () => {
			world = wd;
			jump = null;
			[...chips.children].forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
			sync();
		});
		chips.appendChild(b);
	});
	function sync() {
		const m = Number(mass.value);
		massOut.textContent = `${m} kg`;
		tag.textContent = world.name;
		const feels = (m * world.g) / 9.81;
		out.innerHTML = `Waage zeigt <b>${nf(feels, 1)} kg</b><br>Sprunghöhe ${nf((V0 * V0) / (2 * world.g), 2)} m`;
		note.textContent = `${world.note} Deine Masse bleibt ${m} kg, aber die Waage zeigt ${nf(feels, 1)} kg an (Gewichtskraft ${nf(m * world.g, 0)} Newton).`;
	}
	mass.addEventListener("input", sync);
	sync();

	document.getElementById("btnJump").addEventListener("click", () => {
		if (jump && !jump.landed) return;
		jump = { t: -0.25, y: 0, landed: false, peak: 0 };
	});

	function figure(x, y, s, squat, arms) {
		ctx.strokeStyle = INK;
		ctx.lineWidth = Math.max(2.5, s * 0.06);
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		const hip = y - s * (0.48 - squat * 0.14);
		const neck = hip - s * 0.34;
		ctx.beginPath();
		ctx.arc(x, neck - s * 0.1, s * 0.09, 0, Math.PI * 2);
		ctx.moveTo(x, neck);
		ctx.lineTo(x, hip);
		const knee = s * (0.24 - squat * 0.08);
		ctx.moveTo(x, hip);
		ctx.lineTo(x - s * 0.08 - squat * s * 0.1, hip + knee);
		ctx.lineTo(x - s * 0.06, y);
		ctx.moveTo(x, hip);
		ctx.lineTo(x + s * 0.08 + squat * s * 0.1, hip + knee);
		ctx.lineTo(x + s * 0.06, y);
		const ay = neck + s * 0.06;
		ctx.moveTo(x, ay);
		ctx.lineTo(x - s * 0.18, ay + s * 0.2 * (1 - arms * 2));
		ctx.moveTo(x, ay);
		ctx.lineTo(x + s * 0.18, ay + s * 0.2 * (1 - arms * 2));
		ctx.stroke();
	}

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const gy = h - 42;
		const k = (gy - 16) / VIEW;
		const g = world.g;

		let squat = 0;
		let arms = 0;
		if (jump && !jump.landed) {
			jump.t += dt;
			if (jump.t < 0) {
				squat = 1 + jump.t / 0.25;
			} else {
				jump.y = V0 * jump.t - 0.5 * g * jump.t * jump.t;
				jump.peak = Math.max(jump.peak, jump.y);
				arms = clamp(jump.y / 0.5, 0, 1);
				if (jump.y <= 0 && jump.t > 0.05) {
					jump.y = 0;
					jump.landed = true;
					jump.flight = jump.t;
					crouch = 1;
				}
			}
		}
		crouch = Math.max(0, crouch - dt * 4);
		squat = Math.max(squat, crouch * 0.7);

		const sky = ctx.createLinearGradient(0, 0, 0, gy);
		sky.addColorStop(0, world.sky[0]);
		sky.addColorStop(1, world.sky[1]);
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, w, h);
		if (world.name === "Mond" || world.name === "Pluto") {
			for (let i = 0; i < 40; i++) {
				ctx.fillStyle = `rgba(255,255,255,${0.2 + ((i * 37) % 10) / 20})`;
				ctx.fillRect((i * 97.3) % w, (i * 53.7) % (gy * 0.8), 1.4, 1.4);
			}
		}
		if (world.name === "Mond") {
			ctx.fillStyle = "#2a6fb8";
			ctx.beginPath();
			ctx.arc(w * 0.82, h * 0.18, 18, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "rgba(90,170,100,0.9)";
			ctx.beginPath();
			ctx.arc(w * 0.82 - 4, h * 0.18 - 3, 7, 0, Math.PI * 2);
			ctx.fill();
		}

		// Höhenskala und Haus zum Vergleich
		ctx.font = `10px ${FONT}`;
		ctx.textAlign = "left";
		for (let m = 1; m < VIEW; m++) {
			const y = gy - m * k;
			ctx.strokeStyle = "rgba(255,255,255,0.12)";
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(18, y);
			ctx.stroke();
			ctx.fillStyle = "rgba(255,255,255,0.45)";
			ctx.fillText(`${m} m`, 22, y + 3);
		}
		const hx = w * 0.7;
		const hw = Math.min(w * 0.2, 120);
		const hh = 6 * k;
		ctx.fillStyle = "rgba(0,0,0,0.28)";
		ctx.fillRect(hx, gy - hh, hw, hh);
		ctx.beginPath();
		ctx.moveTo(hx - 8, gy - hh);
		ctx.lineTo(hx + hw / 2, gy - hh - 1.6 * k);
		ctx.lineTo(hx + hw + 8, gy - hh);
		ctx.fill();
		ctx.fillStyle = "rgba(255,230,160,0.18)";
		for (let fl = 0; fl < 2; fl++) {
			ctx.fillRect(hx + hw * 0.15, gy - hh + fl * hh * 0.5 + hh * 0.12, hw * 0.25, hh * 0.22);
			ctx.fillRect(hx + hw * 0.6, gy - hh + fl * hh * 0.5 + hh * 0.12, hw * 0.25, hh * 0.22);
		}
		// Basketballkorb
		const bx = w * 0.42;
		ctx.strokeStyle = "rgba(255,255,255,0.35)";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(bx, gy);
		ctx.lineTo(bx, gy - 3.05 * k - 20);
		ctx.stroke();
		ctx.strokeStyle = "#ff8a4a";
		ctx.beginPath();
		ctx.ellipse(bx + 16, gy - 3.05 * k, 12, 4, 0, 0, Math.PI * 2);
		ctx.stroke();

		// Boden
		ctx.fillStyle = world.soil;
		ctx.fillRect(0, gy, w, h - gy);
		ctx.fillStyle = world.ground;
		ctx.fillRect(0, gy, w, 4);

		// Figur, 1,4 m groß
		const fx = w * 0.24;
		const y = jump ? jump.y : 0;
		const fy = gy - y * k;
		ctx.fillStyle = "rgba(0,0,0,0.35)";
		ctx.beginPath();
		ctx.ellipse(fx, gy + 3, 18 / (1 + y), 4 / (1 + y), 0, 0, Math.PI * 2);
		ctx.fill();
		figure(fx, fy, 1.4 * k, squat, arms);

		// Höchster Punkt
		if (jump && jump.peak > 0.02) {
			const py = gy - jump.peak * k - 1.4 * k;
			ctx.setLineDash([4, 4]);
			ctx.strokeStyle = SKY;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(fx - 40, gy - jump.peak * k);
			ctx.lineTo(fx + 40, gy - jump.peak * k);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = SKY;
			ctx.font = `12px ${FONT}`;
			ctx.textAlign = "center";
			ctx.fillText(`${nf(jump.peak, 2)} m`, fx, Math.max(14, py - 8));
			if (jump.landed) ctx.fillText(`Flugzeit ${nf(jump.flight, 2)} s`, fx, gy + 22);
		}
		void time;
	});
})();

// =====================================================================
// 5 · Gravitations-Sandkasten
// =====================================================================
(() => {
	const canvas = document.getElementById("sandCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.85 : 1.9));
	const out = document.getElementById("sandOut");
	const note = document.getElementById("sandNote");
	const sunIn = document.getElementById("sunMass");
	const sunOut = document.getElementById("sunOut");
	const btnSun2 = document.getElementById("btnSun2");
	const stars = makeStars(220);

	const COLORS = ["#8fd3ff", "#b78bff", "#7bdc9a", "#ffb366", "#ff8aa8", "#ffe14d", "#6be8e0"];
	let planets = [];
	let suns = [];
	let binary = false;
	let drag = null;
	let ci = 0;
	let bursts = [];

	// Einheiten: Längen relativ zu U = halbe kürzere Seite
	const U = () => Math.min(size.w, size.h) / 2;
	const gm = () => 0.1 * Math.pow(U(), 3) * (Number(sunIn.value) / 100);

	function makeSuns() {
		const cx = size.w / 2;
		const cy = size.h / 2;
		if (!binary) {
			suns = [{ x: cx, y: cy, vx: 0, vy: 0, m: 1 }];
		} else {
			const d = U() * 0.18;
			const v = Math.sqrt((gm() * 0.5) / (4 * d));
			suns = [
				{ x: cx - d, y: cy, vx: 0, vy: -v, m: 0.5 },
				{ x: cx + d, y: cy, vx: 0, vy: v, m: 0.5 },
			];
		}
	}
	makeSuns();

	function addPlanet(x, y, vx, vy) {
		planets.push({ x, y, vx, vy, c: COLORS[ci++ % COLORS.length], trail: [] });
		if (planets.length > 24) planets.shift();
	}
	function preset() {
		planets = [];
		const cx = size.w / 2;
		const cy = size.h / 2;
		for (const f of [0.28, 0.45, 0.62, 0.85]) {
			const r = U() * f;
			const a = Math.random() * Math.PI * 2;
			const v = Math.sqrt(gm() / r);
			addPlanet(cx + Math.cos(a) * r, cy + Math.sin(a) * r, -Math.sin(a) * v, Math.cos(a) * v);
		}
		note.textContent = "Vier Planeten auf Kreisbahnen. Sieh genau hin: Die inneren laufen viel schneller als die äußeren.";
	}

	sunIn.addEventListener("input", () => {
		sunOut.textContent = `${sunIn.value} %`;
		const m = Number(sunIn.value);
		note.textContent =
			m > 140
				? "Schwerere Sonne: Die Planeten werden stärker angezogen und stürzen nach innen oder rasen auf engeren Bahnen."
				: m < 60
					? "Leichtere Sonne: Die Planeten sind jetzt zu schnell für ihre Bahn und fliegen nach außen davon."
					: "Ändere die Masse der Sonne und beobachte die Bahnen.";
	});
	btnSun2.addEventListener("click", () => {
		binary = !binary;
		btnSun2.setAttribute("aria-pressed", String(binary));
		makeSuns();
		note.textContent = binary
			? "Zwei Sonnen umkreisen sich gegenseitig. Planeten-Bahnen werden hier oft chaotisch, probier es aus!"
			: "Eine Sonne in der Mitte.";
	});
	document.getElementById("btnPreset").addEventListener("click", preset);
	document.getElementById("btnClearSand").addEventListener("click", () => {
		planets = [];
		makeSuns();
	});

	const VK = 2.2; // Zuglänge → Geschwindigkeit
	canvas.addEventListener("pointerdown", (e) => {
		canvas.setPointerCapture(e.pointerId);
		const [x, y] = pointerAt(canvas, e);
		drag = { x0: x, y0: y, x, y };
	});
	canvas.addEventListener("pointermove", (e) => {
		if (!drag) return;
		[drag.x, drag.y] = pointerAt(canvas, e);
	});
	canvas.addEventListener("pointerup", () => {
		if (!drag) return;
		addPlanet(drag.x0, drag.y0, (drag.x - drag.x0) * VK, (drag.y - drag.y0) * VK);
		drag = null;
	});
	canvas.addEventListener("pointercancel", () => (drag = null));

	function accel(x, y, list) {
		let ax = 0;
		let ay = 0;
		const G = gm();
		const soft = U() * 0.02;
		for (const s of list) {
			const dx = s.x - x;
			const dy = s.y - y;
			const r2 = dx * dx + dy * dy + soft * soft;
			const f = (G * s.m) / (r2 * Math.sqrt(r2));
			ax += dx * f;
			ay += dy * f;
		}
		return [ax, ay];
	}

	let lastW = size.w;
	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		if (lastW !== w) {
			lastW = w;
			makeSuns();
			planets = [];
		}
		const sunR = U() * 0.07;
		const sub = 12;
		const d = dt / sub;
		for (let i = 0; i < sub; i++) {
			if (binary) {
				for (const s of suns) {
					const others = suns.filter((o) => o !== s);
					const [ax, ay] = accel(s.x, s.y, others);
					s.vx += ax * d;
					s.vy += ay * d;
				}
				for (const s of suns) {
					s.x += s.vx * d;
					s.y += s.vy * d;
				}
			}
			for (const p of planets) {
				const [ax, ay] = accel(p.x, p.y, suns);
				p.vx += ax * d;
				p.vy += ay * d;
				p.x += p.vx * d;
				p.y += p.vy * d;
			}
			planets = planets.filter((p) => {
				for (const s of suns) {
					if (Math.hypot(p.x - s.x, p.y - s.y) < sunR * Math.sqrt(s.m) * 0.9) {
						bursts.push({ x: p.x, y: p.y, t: 0, c: p.c });
						return false;
					}
				}
				return Math.hypot(p.x - w / 2, p.y - h / 2) < Math.hypot(w, h) * 1.5;
			});
		}
		for (const p of planets) {
			p.trail.push([p.x, p.y]);
			if (p.trail.length > 260) p.trail.shift();
		}
		out.textContent = `${planets.length} ${planets.length === 1 ? "Planet" : "Planeten"}`;

		ctx.fillStyle = "#04040a";
		ctx.fillRect(0, 0, w, h);
		drawStars(ctx, stars, w, h, time);

		// Schwerkraft-Mulde als Ringe
		for (const s of suns) {
			for (let r = 1; r <= 6; r++) {
				ctx.strokeStyle = `rgba(183,139,255,${0.09 - r * 0.012})`;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.arc(s.x, s.y, U() * 0.15 * r * r * 0.35 + sunR, 0, Math.PI * 2);
				ctx.stroke();
			}
		}

		// Bahnen
		for (const p of planets) {
			const n = p.trail.length;
			for (let i = 1; i < n; i++) {
				ctx.strokeStyle = p.c;
				ctx.globalAlpha = (i / n) * 0.75;
				ctx.lineWidth = 1.6;
				ctx.beginPath();
				ctx.moveTo(p.trail[i - 1][0], p.trail[i - 1][1]);
				ctx.lineTo(p.trail[i][0], p.trail[i][1]);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
			const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
			g.addColorStop(0, p.c);
			g.addColorStop(1, "rgba(0,0,0,0)");
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "#fff";
			ctx.beginPath();
			ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
			ctx.fill();
		}

		// Sonnen
		for (const s of suns) {
			const r = sunR * Math.sqrt(s.m) * Math.sqrt(Number(sunIn.value) / 100);
			const glow = ctx.createRadialGradient(s.x, s.y, r * 0.3, s.x, s.y, r * 4);
			glow.addColorStop(0, "rgba(255,210,120,0.6)");
			glow.addColorStop(1, "rgba(255,120,60,0)");
			ctx.fillStyle = glow;
			ctx.beginPath();
			ctx.arc(s.x, s.y, r * 4, 0, Math.PI * 2);
			ctx.fill();
			const core = ctx.createRadialGradient(s.x - r * 0.3, s.y - r * 0.3, r * 0.1, s.x, s.y, r);
			core.addColorStop(0, "#fffbe8");
			core.addColorStop(0.6, "#ffd166");
			core.addColorStop(1, "#ff8a3d");
			ctx.fillStyle = core;
			ctx.beginPath();
			ctx.arc(s.x, s.y, r * (1 + Math.sin(time * 3) * 0.02), 0, Math.PI * 2);
			ctx.fill();
		}

		// Explosionen
		bursts = bursts.filter((b) => (b.t += dt) < 0.8);
		for (const b of bursts) {
			ctx.strokeStyle = b.c;
			ctx.globalAlpha = 1 - b.t / 0.8;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(b.x, b.y, 4 + b.t * 40, 0, Math.PI * 2);
			ctx.stroke();
			ctx.globalAlpha = 1;
		}

		// Zielen mit Vorschau
		if (drag) {
			let x = drag.x0;
			let y = drag.y0;
			let vx = (drag.x - drag.x0) * VK;
			let vy = (drag.y - drag.y0) * VK;
			ctx.fillStyle = "rgba(255,255,255,0.5)";
			const pd = 1 / 120;
			for (let i = 0; i < 360; i++) {
				const [ax, ay] = accel(x, y, suns);
				vx += ax * pd;
				vy += ay * pd;
				x += vx * pd;
				y += vy * pd;
				if (i % 4 === 0) ctx.fillRect(x - 1, y - 1, 2, 2);
				if (suns.some((s) => Math.hypot(x - s.x, y - s.y) < sunR)) break;
			}
			arrow(ctx, drag.x0, drag.y0, drag.x, drag.y, COLORS[ci % COLORS.length], 2.5);
			ctx.fillStyle = COLORS[ci % COLORS.length];
			ctx.beginPath();
			ctx.arc(drag.x0, drag.y0, 5, 0, Math.PI * 2);
			ctx.fill();
		}

		if (!planets.length && !drag) {
			ctx.fillStyle = "rgba(244,239,230,0.55)";
			ctx.font = `14px ${FONT}`;
			ctx.textAlign = "center";
			ctx.fillText("Ziehe irgendwo neben der Sonne, um einen Planeten zu starten", w / 2, h - 22);
		}
	});
})();
