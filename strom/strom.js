"use strict";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const nf = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });

const COPPER_OFF = "#5d544a";
const COPPER_ON = "#d9a548";
const ELECTRON = "#59b8ff";

function makeGlow(rgb, size = 128) {
	const c = document.createElement("canvas");
	c.width = c.height = size;
	const g = c.getContext("2d");
	const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
	grad.addColorStop(0, `rgba(${rgb},0.9)`);
	grad.addColorStop(0.3, `rgba(${rgb},0.35)`);
	grad.addColorStop(1, `rgba(${rgb},0)`);
	g.fillStyle = grad;
	g.fillRect(0, 0, size, size);
	return c;
}
const GLOW = makeGlow("255,225,120");
const SPARK = makeGlow("255,170,90", 64);

// Pfad-Helfer: Liste von Punkten, Länge, Punkt bei Abstand d (mit Umlauf für geschlossene Pfade)
function makePath(points, closed = true) {
	const pts = closed ? [...points, points[0]] : points;
	const segs = [];
	let total = 0;
	for (let i = 0; i < pts.length - 1; i++) {
		const len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
		segs.push([pts[i], pts[i + 1], len]);
		total += len;
	}
	return {
		total,
		at(d) {
			d = ((d % total) + total) % total;
			for (const [a, b, len] of segs) {
				if (d <= len) return [a[0] + ((b[0] - a[0]) * d) / len, a[1] + ((b[1] - a[1]) * d) / len];
				d -= len;
			}
			return pts[pts.length - 1];
		},
	};
}

function strokePoly(ctx, points, closed = false) {
	ctx.beginPath();
	points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
	if (closed) ctx.closePath();
	ctx.stroke();
}

function drawElectrons(ctx, path, offset, gap, skip) {
	ctx.fillStyle = ELECTRON;
	for (let d = 0; d < path.total; d += gap) {
		const [x, y] = path.at(d + offset);
		if (skip && skip(x, y)) continue;
		ctx.beginPath();
		ctx.arc(x, y, 2.6, 0, Math.PI * 2);
		ctx.fill();
	}
}

function drawBattery(ctx, x, y, vertical, label) {
	ctx.save();
	ctx.translate(x, y);
	if (!vertical) ctx.rotate(-Math.PI / 2);
	ctx.fillStyle = "#0b0a09";
	ctx.fillRect(-16, -26, 32, 52);
	ctx.strokeStyle = "#e9e3d6";
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(-14, -6);
	ctx.lineTo(14, -6);
	ctx.stroke();
	ctx.lineWidth = 6;
	ctx.beginPath();
	ctx.moveTo(-7, 6);
	ctx.lineTo(7, 6);
	ctx.stroke();
	ctx.restore();
	ctx.font = "12px 'Space Grotesk', sans-serif";
	ctx.fillStyle = "rgba(244,239,230,0.75)";
	ctx.textAlign = "right";
	ctx.fillText("+", x - 20, y - 6);
	ctx.fillText("−", x - 20, y + 14);
	if (label) {
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.fillText(label, x - 20, y + 34);
	}
}

function drawBulb(ctx, x, y, brightness, r = 18, present = true) {
	ctx.fillStyle = "#2b2824";
	ctx.fillRect(x - r * 0.45, y + r * 0.7, r * 0.9, r * 0.6);
	if (!present) {
		ctx.strokeStyle = "rgba(255,255,255,0.25)";
		ctx.setLineDash([3, 3]);
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);
		return;
	}
	const b = clamp(brightness, 0, 1);
	if (b > 0.01) {
		ctx.globalCompositeOperation = "lighter";
		ctx.globalAlpha = b;
		const s = r * (3 + b * 5);
		ctx.drawImage(GLOW, x - s / 2, y - s / 2, s, s);
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = "source-over";
	}
	ctx.fillStyle = `rgba(${Math.round(lerp(60, 255, b))},${Math.round(lerp(58, 238, b))},${Math.round(lerp(55, 170, b))},${lerp(0.35, 0.95, b)})`;
	ctx.strokeStyle = "rgba(255,255,255,0.35)";
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	ctx.strokeStyle = b > 0.05 ? "#fff6d0" : "#8a7a66";
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(x - r * 0.4, y + r * 0.7);
	ctx.lineTo(x - r * 0.3, y);
	for (let i = 0; i <= 6; i++) ctx.lineTo(x - r * 0.3 + (i * r * 0.6) / 6, y + (i % 2 ? -4 : 0));
	ctx.lineTo(x + r * 0.4, y + r * 0.7);
	ctx.stroke();
}

// =====================================================================
// 1 · Stromkreis: alle Elektronen bewegen sich gleichzeitig
// =====================================================================
(() => {
	const canvas = document.getElementById("circuitCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.05 : 1.35));
	const btnSwitch = document.getElementById("btnSwitch");
	const btnReal = document.getElementById("btnReal");
	const note = document.getElementById("circuitNote");
	const s = { closed: false, real: false, offset: 0, speed: 0, light: 0, lever: 0 };

	function updateNote() {
		if (!s.closed) note.textContent = "Der Kreis ist offen. Die Elektronen sind da, bewegen sich aber nicht.";
		else if (s.real)
			note.textContent =
				"Echte Geschwindigkeit: etwa 0,1 mm/s. Die Elektronen scheinen stillzustehen, und trotzdem leuchtet die Lampe. Das markierte Elektron bräuchte für einen Meter Kabel fast drei Stunden.";
		else note.textContent = "Strom fließt. Achte darauf: Alle Elektronen starten im selben Moment, auch die direkt an der Lampe.";
	}
	btnSwitch.addEventListener("click", () => {
		s.closed = !s.closed;
		btnSwitch.setAttribute("aria-pressed", String(s.closed));
		btnSwitch.textContent = s.closed ? "Schalter öffnen" : "Schalter schließen";
		updateNote();
	});
	btnReal.addEventListener("click", () => {
		s.real = !s.real;
		btnReal.setAttribute("aria-pressed", String(s.real));
		btnReal.textContent = s.real ? "Zeitlupe (schematisch)" : "Echte Geschwindigkeit";
		updateNote();
	});

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const L = w * 0.16;
		const R = w * 0.84;
		const T = h * 0.24;
		const B = h * 0.8;
		const midX = (L + R) / 2;
		// Startpunkt am Minuspol, Richtung der Elektronen: unten nach rechts, hoch, oben nach links, zum Pluspol
		const loop = [
			[L, (T + B) / 2 + 14],
			[L, B],
			[R, B],
			[R, T],
			[L, T],
			[L, (T + B) / 2 - 14],
		];
		const path = makePath(loop);
		const target = s.closed ? (s.real ? 0.004 : 60) : 0;
		s.speed += (target - s.speed) * Math.min(1, dt * 20);
		s.offset += s.speed * dt;
		s.light += ((s.closed ? 1 : 0) - s.light) * Math.min(1, dt * 18);
		s.lever += ((s.closed ? 1 : 0) - s.lever) * Math.min(1, dt * 14);

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		ctx.strokeStyle = s.closed ? COPPER_ON : COPPER_OFF;
		ctx.lineWidth = 6;
		ctx.lineJoin = "round";
		strokePoly(ctx, loop, true);

		// Schalter unten: Lücke + Hebel
		const swL = midX - 26;
		const swR = midX + 26;
		ctx.fillStyle = "#070605";
		ctx.fillRect(swL + 3, B - 6, swR - swL - 6, 12);
		const ang = lerp(-0.6, 0, s.lever);
		ctx.strokeStyle = "#e9e3d6";
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.moveTo(swL, B);
		ctx.lineTo(swL + Math.cos(ang) * (swR - swL), B + Math.sin(ang) * (swR - swL));
		ctx.stroke();
		for (const x of [swL, swR]) {
			ctx.fillStyle = "#e9e3d6";
			ctx.beginPath();
			ctx.arc(x, B, 4, 0, Math.PI * 2);
			ctx.fill();
		}

		// Elektronen (Lücken an Batterie und Schalter auslassen)
		const skip = (x, y) => (Math.abs(x - L) < 4 && Math.abs(y - (T + B) / 2) < 26) || (Math.abs(y - B) < 4 && x > swL + 4 && x < swR - 4 && !s.closed);
		drawElectrons(ctx, path, s.offset, 16, skip);
		// ein markiertes Elektron
		const [mx, my] = path.at(path.total * 0.12 + s.offset);
		ctx.fillStyle = "#ffe14d";
		ctx.beginPath();
		ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
		ctx.fill();

		drawBattery(ctx, L, (T + B) / 2, true, "Batterie");
		ctx.fillStyle = "#070605";
		ctx.fillRect(midX - 26, T - 8, 52, 16);
		drawBulb(ctx, midX, T - 8, s.light, Math.min(24, w * 0.04));

		ctx.font = "12px 'Space Grotesk', sans-serif";
		ctx.textAlign = "center";
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.fillText("Schalter", midX, B + 26);
		ctx.textAlign = "left";
		ctx.fillStyle = "rgba(89,184,255,0.85)";
		ctx.fillText("● Elektronen", 12, h - 12);
	});
})();

// =====================================================================
// 2 · Ohmsches Gesetz: Wasser und Strom nebeneinander
// =====================================================================
(() => {
	const canvas = document.getElementById("ohmCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.85 : 1.15));
	const ui = {
		u: document.getElementById("u"),
		r: document.getElementById("r"),
		uOut: document.getElementById("uOut"),
		rOut: document.getElementById("rOut"),
		iOut: document.getElementById("iOut"),
		pOut: document.getElementById("pOut"),
		fuseOut: document.getElementById("fuseOut"),
		fuse: document.getElementById("btnFuse"),
	};
	const FUSE = 10; // Ampere
	const s = { blown: false, eOff: 0, wOff: 0, wheel: 0, heat: 0, sparkT: 0 };

	function values() {
		const U = Number(ui.u.value);
		const R = Number(ui.r.value);
		const I = s.blown ? 0 : U / R;
		return { U, R, I, P: U * I };
	}

	function update() {
		const { U, R } = values();
		if (!s.blown && U / R > FUSE) {
			s.blown = true;
			s.sparkT = 0.6;
			ui.fuse.hidden = false;
		}
		const { I, P } = values();
		ui.uOut.textContent = `${nf(U, U % 1 ? 1 : 0)} V`;
		ui.rOut.textContent = `${R} Ω`;
		ui.iOut.textContent = `${nf(I, 2)} A`;
		ui.pOut.textContent = `${nf(P, P < 10 ? 1 : 0)} W`;
		ui.fuseOut.textContent = s.blown ? "durch!" : I > FUSE * 0.7 ? "wird heiß" : "ok";
		ui.fuseOut.style.color = s.blown ? "var(--bad)" : I > FUSE * 0.7 ? "#ffb04d" : "";
	}
	ui.u.addEventListener("input", update);
	ui.r.addEventListener("input", update);
	ui.fuse.addEventListener("click", () => {
		s.blown = false;
		ui.fuse.hidden = true;
		const { U, R } = values();
		if (U / R > FUSE) {
			ui.r.value = Math.ceil(U / FUSE) + 1;
			ui.r.dispatchEvent(new Event("input"));
		}
		update();
	});
	update();

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const { U, R, I, P } = values();
		const flow = I * 22; // Bildschirm-Geschwindigkeit
		s.eOff += flow * dt;
		s.wOff += flow * dt;
		s.wheel += I * dt * 1.2;
		s.heat += (clamp(I / FUSE, 0, 1) - s.heat) * Math.min(1, dt * 3);
		s.sparkT = Math.max(0, s.sparkT - dt);

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		ctx.font = "12px 'Space Grotesk', sans-serif";

		// ---------- Wasser (obere Hälfte) ----------
		const top = 30;
		const half = h * 0.5;
		const tankX = w * 0.06;
		const tankW = w * 0.16;
		const tankTop = top + 6;
		const tankBot = half - 30;
		const level = tankBot - (tankBot - tankTop) * (U / 24);
		const pipeY = tankBot - 10;
		const pipeL = tankX + tankW;
		const pipeR = w * 0.78;
		const conX = w * 0.42;
		const conW = w * 0.14;
		const inner = lerp(18, 3, (R - 1) / 59);

		ctx.strokeStyle = "rgba(255,255,255,0.4)";
		ctx.lineWidth = 2;
		ctx.strokeRect(tankX, tankTop, tankW, tankBot - tankTop);
		ctx.fillStyle = "rgba(89,184,255,0.45)";
		ctx.fillRect(tankX + 2, level, tankW - 4, tankBot - level - 1);
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.textAlign = "center";
		ctx.fillText("Druck", tankX + tankW / 2, tankBot + 16);

		// Rohr mit Engstelle
		const pipeTopAt = (x) => {
			if (x < conX || x > conX + conW) return pipeY - 9;
			const t = Math.sin(((x - conX) / conW) * Math.PI);
			return pipeY - lerp(9, inner / 2, t);
		};
		ctx.fillStyle = "rgba(89,184,255,0.18)";
		ctx.beginPath();
		for (let x = pipeL; x <= pipeR; x += 4) ctx.lineTo(x, pipeTopAt(x));
		for (let x = pipeR; x >= pipeL; x -= 4) ctx.lineTo(x, 2 * pipeY - pipeTopAt(x));
		ctx.fill();
		ctx.strokeStyle = "rgba(255,255,255,0.45)";
		ctx.beginPath();
		for (let x = pipeL; x <= pipeR; x += 4) ctx.lineTo(x, pipeTopAt(x));
		ctx.stroke();
		ctx.beginPath();
		for (let x = pipeL; x <= pipeR; x += 4) ctx.lineTo(x, 2 * pipeY - pipeTopAt(x));
		ctx.stroke();
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.fillText("Engstelle", conX + conW / 2, pipeY + 26);

		// Wasserteilchen
		if (U > 0 && !s.blown) {
			ctx.fillStyle = "#9fd4ff";
			for (let x = pipeL + (s.wOff % 14); x < pipeR; x += 14) {
				const half2 = pipeY - pipeTopAt(x);
				for (const k of [-0.5, 0, 0.5]) {
					ctx.beginPath();
					ctx.arc(x, pipeY + k * half2, 1.8, 0, Math.PI * 2);
					ctx.fill();
				}
			}
		}

		// Wasserrad
		const wx = pipeR + w * 0.08;
		const wr = Math.min(w * 0.07, 34);
		ctx.strokeStyle = "#c8b89a";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(wx, pipeY, wr, 0, Math.PI * 2);
		ctx.stroke();
		for (let i = 0; i < 8; i++) {
			const a = s.wheel + (i * Math.PI) / 4;
			ctx.beginPath();
			ctx.moveTo(wx, pipeY);
			ctx.lineTo(wx + Math.cos(a) * wr, pipeY + Math.sin(a) * wr);
			ctx.stroke();
		}
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.fillText("Wasserrad", wx, pipeY + wr + 16);
		ctx.textAlign = "left";

		// Trennlinie
		ctx.strokeStyle = "rgba(255,255,255,0.08)";
		ctx.beginPath();
		ctx.moveTo(0, half);
		ctx.lineTo(w, half);
		ctx.stroke();
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.fillText("Strom", 12, half + 18);

		// ---------- Stromkreis (untere Hälfte) ----------
		const cL = w * 0.14;
		const cR = w * 0.86;
		const cT = half + h * 0.14;
		const cB = h - 26;
		const midY = (cT + cB) / 2;
		const loop = [
			[cL, midY + 14],
			[cL, cB],
			[cR, cB],
			[cR, cT],
			[cL, cT],
			[cL, midY - 14],
		];
		const path = makePath(loop);
		const hot = s.heat;
		const wire = s.blown ? COPPER_OFF : `rgb(${Math.round(lerp(217, 255, hot))},${Math.round(lerp(165, 80, hot))},${Math.round(lerp(72, 40, hot))})`;
		ctx.strokeStyle = U > 0 ? wire : COPPER_OFF;
		ctx.lineWidth = 5;
		ctx.lineJoin = "round";
		strokePoly(ctx, loop, true);

		// Widerstand oben (Zickzack wird mit R dichter)
		const rx1 = w * 0.36;
		const rx2 = w * 0.58;
		ctx.fillStyle = "#070605";
		ctx.fillRect(rx1, cT - 6, rx2 - rx1, 12);
		const zig = Math.round(lerp(3, 16, (R - 1) / 59));
		ctx.strokeStyle = "#e9e3d6";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(rx1, cT);
		for (let i = 0; i < zig; i++) {
			ctx.lineTo(rx1 + ((i + 0.5) * (rx2 - rx1)) / zig, cT + (i % 2 ? 7 : -7));
		}
		ctx.lineTo(rx2, cT);
		ctx.stroke();
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.textAlign = "center";
		ctx.fillText(`Widerstand ${R} Ω`, (rx1 + rx2) / 2, cT - 14);

		// Sicherung unten
		const fx = w * 0.5;
		ctx.fillStyle = "#070605";
		ctx.fillRect(fx - 20, cB - 6, 40, 12);
		ctx.strokeStyle = "rgba(255,255,255,0.4)";
		ctx.lineWidth = 1.5;
		ctx.strokeRect(fx - 18, cB - 7, 36, 14);
		ctx.strokeStyle = s.blown ? "#5a3a30" : U > 0 ? wire : COPPER_OFF;
		ctx.lineWidth = 2;
		ctx.beginPath();
		if (s.blown) {
			ctx.moveTo(fx - 18, cB);
			ctx.lineTo(fx - 5, cB + 2);
			ctx.moveTo(fx + 5, cB - 2);
			ctx.lineTo(fx + 18, cB);
		} else {
			ctx.moveTo(fx - 18, cB);
			ctx.lineTo(fx + 18, cB);
		}
		ctx.stroke();
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.fillText(`Sicherung ${FUSE} A`, fx, cB + 20);
		if (s.sparkT > 0) {
			ctx.globalCompositeOperation = "lighter";
			ctx.globalAlpha = s.sparkT / 0.6;
			ctx.drawImage(SPARK, fx - 40, cB - 40, 80, 80);
			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = "source-over";
		}

		const skip = (x, y) =>
			(Math.abs(x - cL) < 4 && Math.abs(y - midY) < 26) || (Math.abs(y - cB) < 4 && Math.abs(x - fx) < 20) || (Math.abs(y - cT) < 8 && x > rx1 && x < rx2);
		drawElectrons(ctx, path, s.eOff, 15, skip);

		drawBattery(ctx, cL, midY, true, `${nf(U, U % 1 ? 1 : 0)} V`);
		ctx.fillStyle = "#070605";
		ctx.fillRect(cR - 8, midY - 22, 16, 44);
		drawBulb(ctx, cR, midY - 6, Math.sqrt(clamp(P / 40, 0, 1)), Math.min(20, w * 0.035));
	});
})();

// =====================================================================
// 3 · Reihen- und Parallelschaltung
// =====================================================================
(() => {
	const canvas = document.getElementById("seriesCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.05 : 1.35));
	const btnMode = document.getElementById("btnMode");
	const btnBulb = document.getElementById("btnBulb");
	const tag = document.getElementById("seriesTag");
	const note = document.getElementById("seriesNote");
	const s = { parallel: false, bulb2: true, b1: 0, b2: 0, o1: 0, o2: 0 };

	function currents() {
		// Batterie 12 V, jede Lampe 12 Ω
		if (s.parallel) return { i1: 1, i2: s.bulb2 ? 1 : 0 };
		const i = s.bulb2 ? 12 / 24 : 0;
		return { i1: i, i2: i };
	}
	function updateText() {
		tag.textContent = s.parallel ? "Parallel" : "In Reihe";
		btnMode.textContent = s.parallel ? "Auf Reihe umbauen" : "Auf parallel umbauen";
		btnBulb.textContent = s.bulb2 ? "Lampe 2 herausdrehen" : "Lampe 2 eindrehen";
		btnBulb.setAttribute("aria-pressed", String(s.bulb2));
		if (!s.parallel && s.bulb2) note.textContent = "Beide teilen sich die 12 V: je 6 V und nur 3 W pro Lampe. Darum leuchten sie schwach.";
		else if (!s.parallel) note.textContent = "Kreis unterbrochen! Auch Lampe 1 geht aus, weil der Strom durch Lampe 2 hätte fließen müssen.";
		else if (s.bulb2) note.textContent = "Jede Lampe bekommt die vollen 12 V und leuchtet mit 12 W. Dafür liefert die Batterie doppelt so viel Strom: 2 A.";
		else note.textContent = "Lampe 1 leuchtet weiter: Sie hat ihren eigenen Weg zur Batterie.";
	}
	btnMode.addEventListener("click", () => {
		s.parallel = !s.parallel;
		updateText();
	});
	btnBulb.addEventListener("click", () => {
		s.bulb2 = !s.bulb2;
		updateText();
	});
	updateText();

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const { i1, i2 } = currents();
		const P1 = i1 * i1 * 12;
		const P2 = i2 * i2 * 12;
		s.b1 += (Math.sqrt(P1 / 12) - s.b1) * Math.min(1, dt * 12);
		s.b2 += ((s.bulb2 ? Math.sqrt(P2 / 12) : 0) - s.b2) * Math.min(1, dt * 12);
		s.o1 += i1 * 50 * dt;
		s.o2 += i2 * 50 * dt;

		const L = w * 0.14;
		const R = w * 0.86;
		const T = h * 0.24;
		const B = h * 0.8;
		const midY = (T + B) / 2;
		const br = Math.min(22, w * 0.04);

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		ctx.lineWidth = 5;
		ctx.lineJoin = "round";

		const bulbs = [];
		if (!s.parallel) {
			const loop = [
				[L, midY + 14],
				[L, B],
				[R, B],
				[R, T],
				[L, T],
				[L, midY - 14],
			];
			ctx.strokeStyle = i1 > 0 ? COPPER_ON : COPPER_OFF;
			strokePoly(ctx, loop, true);
			const x1 = lerp(L, R, 0.36);
			const x2 = lerp(L, R, 0.68);
			bulbs.push([x1, T, s.b1, true, "Lampe 1"], [x2, T, s.b2, s.bulb2, "Lampe 2"]);
			const path = makePath(loop);
			drawElectrons(ctx, path, s.o1, 16, (x, y) => (Math.abs(x - L) < 4 && Math.abs(y - midY) < 26) || (Math.abs(y - T) < 4 && (Math.abs(x - x1) < br || Math.abs(x - x2) < br)));
		} else {
			const x1 = lerp(L, R, 0.45);
			const x2 = R;
			const loop1 = [
				[L, midY + 14],
				[L, B],
				[x1, B],
				[x1, T],
				[L, T],
				[L, midY - 14],
			];
			const loop2 = [
				[L, midY + 14],
				[L, B],
				[x2, B],
				[x2, T],
				[L, T],
				[L, midY - 14],
			];
			ctx.strokeStyle = i1 > 0 ? COPPER_ON : COPPER_OFF;
			strokePoly(ctx, loop1, true);
			ctx.strokeStyle = i2 > 0 ? COPPER_ON : COPPER_OFF;
			strokePoly(ctx, [
				[x1, B],
				[x2, B],
				[x2, T],
				[x1, T],
			]);
			bulbs.push([x1, midY, s.b1, true, "Lampe 1"], [x2, midY, s.b2, s.bulb2, "Lampe 2"]);
			const skipFor = (bx) => (x, y) => (Math.abs(x - L) < 4 && Math.abs(y - midY) < 26) || (Math.abs(x - bx) < 4 && Math.abs(y - midY) < br + 4);
			drawElectrons(ctx, makePath(loop1), s.o1, 18, skipFor(x1));
			if (i2 > 0) drawElectrons(ctx, makePath(loop2), s.o2 + 9, 18, skipFor(x2));
		}

		drawBattery(ctx, L, midY, true, "12 V");
		ctx.font = "12px 'Space Grotesk', sans-serif";
		ctx.textAlign = "center";
		for (const [x, y, b, present, label] of bulbs) {
			ctx.fillStyle = "#070605";
			ctx.fillRect(x - br - 2, y - br - 2, br * 2 + 4, br * 2 + 4);
			drawBulb(ctx, x, y - 4, b, br, present);
			ctx.fillStyle = "rgba(244,239,230,0.55)";
			ctx.fillText(label, x, y + br + 24);
		}
	});
})();

// =====================================================================
// 4 · Generator: Magnet drehen, Wechselstrom sehen
// =====================================================================
(() => {
	const canvas = document.getElementById("genCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.9 : 1.1));
	const turb = document.getElementById("turb");
	const turbOut = document.getElementById("turbOut");
	const readout = document.getElementById("genReadout");
	const note = document.getElementById("genNote");
	const s = { angle: 0, omega: 0, drag: null, emf: 0, light: 0, eOff: 0, hist: new Float32Array(240), histI: 0, histT: 0 };
	let geo = { cx: 0, cy: 0 };

	turb.addEventListener("input", () => {
		const v = Number(turb.value);
		turbOut.textContent = v === 0 ? "aus" : `${nf((v / 100) * 3, 1)} U/s`;
	});

	const angleAt = (e) => {
		const r = canvas.getBoundingClientRect();
		return Math.atan2(e.clientY - r.top - geo.cy, e.clientX - r.left - geo.cx);
	};
	canvas.style.touchAction = "none";
	canvas.addEventListener("pointerdown", (e) => {
		canvas.setPointerCapture(e.pointerId);
		const a = angleAt(e);
		s.drag = { last: a, t: e.timeStamp };
	});
	canvas.addEventListener("pointermove", (e) => {
		if (!s.drag) return;
		const a = angleAt(e);
		let d = a - s.drag.last;
		if (d > Math.PI) d -= Math.PI * 2;
		if (d < -Math.PI) d += Math.PI * 2;
		const dt = Math.max((e.timeStamp - s.drag.t) / 1000, 0.008);
		s.angle += d;
		s.omega = lerp(s.omega, d / dt, 0.4);
		s.drag.last = a;
		s.drag.t = e.timeStamp;
	});
	const end = () => (s.drag = null);
	canvas.addEventListener("pointerup", end);
	canvas.addEventListener("pointercancel", end);

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const cx = w / 2;
		const cy = h * 0.4;
		geo = { cx, cy };
		const target = (Number(turb.value) / 100) * 3 * Math.PI * 2;
		if (!s.drag) {
			if (target > 0) s.omega += (target - s.omega) * Math.min(1, dt * 1.5);
			else s.omega *= Math.exp(-dt * 0.6);
			s.angle += s.omega * dt;
		} else if (performance.now() - s.drag.t > 80) {
			s.omega *= Math.exp(-dt * 8);
		}
		// Induzierte Spannung ∝ Änderung des Magnetflusses durch die Spulen: Φ ∝ cos(θ)
		const K = 1.1;
		s.emf = K * s.omega * Math.sin(s.angle);
		const power = s.emf * s.emf;
		s.light += (clamp(Math.sqrt(power) / 9, 0, 1) - s.light) * Math.min(1, dt * 25);
		s.eOff += s.emf * dt * 10;

		s.histT += dt;
		while (s.histT > 1 / 120) {
			s.histT -= 1 / 120;
			s.hist[s.histI] = s.emf;
			s.histI = (s.histI + 1) % s.hist.length;
		}

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		ctx.font = "12px 'Space Grotesk', sans-serif";

		const rad = Math.min(w * 0.17, h * 0.2);
		const coilX = rad * 1.75;

		// Leitungen von den Spulen zur Lampe
		const bulbY = h * 0.08 + 14;
		const wires = [
			[
				[cx - coilX - 26, cy - 18],
				[cx - coilX - 26, bulbY],
				[cx - 14, bulbY],
			],
			[
				[cx + coilX + 26, cy - 18],
				[cx + coilX + 26, bulbY],
				[cx + 14, bulbY],
			],
		];
		ctx.strokeStyle = Math.abs(s.emf) > 0.3 ? COPPER_ON : COPPER_OFF;
		ctx.lineWidth = 3;
		for (const wl of wires) strokePoly(ctx, wl);
		// Elektronen pendeln mit der Spannung hin und her
		for (const [i, wl] of wires.entries()) {
			const p = makePath(wl, false);
			ctx.fillStyle = ELECTRON;
			for (let d = 0; d < p.total; d += 16) {
				const [x, y] = p.at(d + (i ? -1 : 1) * s.eOff);
				ctx.beginPath();
				ctx.arc(x, y, 2.3, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		drawBulb(ctx, cx, bulbY - 4, s.light, Math.min(18, w * 0.035));

		// Spulen links und rechts
		for (const side of [-1, 1]) {
			const x = cx + side * coilX;
			ctx.fillStyle = "#4b5056";
			ctx.fillRect(x - 22, cy - 16, 44, 32);
			ctx.strokeStyle = Math.abs(s.emf) > 0.3 ? "#ffb36b" : "#8b5a32";
			ctx.lineWidth = 2.5;
			for (let i = -18; i <= 18; i += 4.5) {
				ctx.beginPath();
				ctx.moveTo(x + i, cy - 20);
				ctx.lineTo(x + i + 2, cy + 20);
				ctx.stroke();
			}
			ctx.fillStyle = "rgba(244,239,230,0.5)";
			ctx.textAlign = "center";
			ctx.fillText("Spule", x, cy + 38);
		}

		// Magnet
		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(s.angle);
		const mw = rad * 1.05;
		const mh = Math.max(16, rad * 0.32);
		ctx.fillStyle = "#e0484f";
		ctx.fillRect(0, -mh / 2, mw, mh);
		ctx.fillStyle = "#4f7fd9";
		ctx.fillRect(-mw, -mh / 2, mw, mh);
		ctx.fillStyle = "#fff";
		ctx.font = "bold 13px 'Space Grotesk', sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("N", mw * 0.7, 0);
		ctx.fillText("S", -mw * 0.7, 0);
		ctx.restore();
		ctx.textBaseline = "alphabetic";
		ctx.fillStyle = "#c9a36b";
		ctx.beginPath();
		ctx.arc(cx, cy, 4, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "rgba(255,255,255,0.07)";
		ctx.setLineDash([3, 6]);
		ctx.beginPath();
		ctx.arc(cx, cy, mw + 6, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);

		// Spannungskurve
		const gy = h * 0.66;
		const gh = h * 0.28;
		const gm = gy + gh / 2;
		ctx.fillStyle = "rgba(255,255,255,0.03)";
		ctx.fillRect(10, gy, w - 20, gh);
		ctx.strokeStyle = "rgba(255,255,255,0.1)";
		ctx.beginPath();
		ctx.moveTo(10, gm);
		ctx.lineTo(w - 10, gm);
		ctx.stroke();
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.textAlign = "left";
		ctx.fillText("Spannung", 16, gy + 14);
		ctx.fillText("+", w - 22, gy + 14);
		ctx.fillText("−", w - 22, gy + gh - 6);
		const peak = Math.max(10, ...s.hist.map(Math.abs));
		ctx.save();
		ctx.beginPath();
		ctx.rect(10, gy, w - 20, gh);
		ctx.clip();
		ctx.strokeStyle = "#ffe14d";
		ctx.lineWidth = 2;
		ctx.beginPath();
		const n = s.hist.length;
		for (let i = 0; i < n; i++) {
			const v = s.hist[(s.histI + i) % n];
			const x = 10 + ((w - 20) * i) / (n - 1);
			const y = gm - (v / peak) * gh * 0.44;
			i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
		}
		ctx.stroke();
		ctx.restore();

		const rps = Math.abs(s.omega) / (Math.PI * 2);
		readout.textContent = `${nf(rps, 1)} Umdrehungen/s`;
		if (rps < 0.05) note.textContent = "Zieh den Magneten im Kreis herum oder schalte die Turbine ein. Steht er still, fließt kein Strom.";
		else if (rps < 0.8) note.textContent = "Siehst du die Welle? Die Spannung wechselt bei jeder halben Drehung die Richtung: Wechselstrom. Dreh schneller!";
		else note.textContent = `${nf(rps, 1)} Umdrehungen pro Sekunde: Je schneller sich das Magnetfeld ändert, desto mehr Spannung. Im Kraftwerk sind es 50 pro Sekunde.`;
	});
})();
