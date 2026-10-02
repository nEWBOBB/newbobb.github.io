"use strict";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const nf = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
const gauss = (x, mu, sig) => Math.exp(-0.5 * ((x - mu) / sig) ** 2);

// Wellenlänge (nm) → sichtbare Farbe als [r, g, b] von 0 bis 1 (nach Dan Bruton)
function spectral(l) {
	let r = 0;
	let g = 0;
	let b = 0;
	if (l >= 380 && l < 440) (r = -(l - 440) / 60), (b = 1);
	else if (l < 490) (g = (l - 440) / 50), (b = 1);
	else if (l < 510) (g = 1), (b = -(l - 510) / 20);
	else if (l < 580) (r = (l - 510) / 70), (g = 1);
	else if (l < 645) (r = 1), (g = -(l - 645) / 65);
	else if (l <= 750) r = 1;
	let f = 0;
	if (l >= 380 && l < 420) f = 0.3 + (0.7 * (l - 380)) / 40;
	else if (l >= 420 && l <= 700) f = 1;
	else if (l > 700 && l <= 750) f = 0.3 + (0.7 * (750 - l)) / 50;
	return [r * f, g * f, b * f];
}
const css = ([r, g, b], a = 1) => `rgba(${Math.round(clamp(r, 0, 1) * 255)},${Math.round(clamp(g, 0, 1) * 255)},${Math.round(clamp(b, 0, 1) * 255)},${a})`;

function colorName(l) {
	if (l < 380) return "Ultraviolett";
	if (l < 450) return "Violett";
	if (l < 495) return "Blau";
	if (l < 570) return "Grün";
	if (l < 590) return "Gelb";
	if (l < 620) return "Orange";
	if (l <= 750) return "Rot";
	return "Infrarot";
}

// Empfindlichkeit der drei Zapfen, grob als Glockenkurven
const CONES = [
	["kurz", 445, 24, "#5d8bff"],
	["mittel", 540, 40, "#6fe3a3"],
	["lang", 566, 46, "#ff6b6b"],
];

// =====================================================================
// 1 · Wellenlänge, Farbe und die drei Zapfen
// =====================================================================
(() => {
	const canvas = document.getElementById("waveCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.05 : 1.35));
	const slider = document.getElementById("lambda");
	const outA = document.getElementById("lambdaOut");
	const outB = document.getElementById("waveOut");
	const nameEl = document.getElementById("waveName");
	const note = document.getElementById("waveNote");

	function update() {
		const l = Number(slider.value);
		outA.textContent = `${l} nm`;
		outB.textContent = `${l} nm`;
		nameEl.textContent = colorName(l);
		const resp = CONES.map(([, mu, sig]) => gauss(l, mu, sig));
		if (l < 380) note.textContent = "Unsichtbar: Keiner der drei Sensoren reagiert. Trotzdem ist das Licht da. Ultraviolett macht zum Beispiel Sonnenbrand.";
		else if (l > 750) note.textContent = "Unsichtbar: Infrarot spürst du als Wärme auf der Haut, und deine Fernbedienung funkt damit.";
		else if (l >= 570 && l < 595)
			note.textContent = "Gelb: Der mittlere und der lange Sensor reagieren beide stark. Genau das macht ein Bildschirm nach, wenn er Rot und Grün gleichzeitig leuchten lässt.";
		else {
			const i = resp.indexOf(Math.max(...resp));
			note.textContent = `${colorName(l)}: Am stärksten reagiert der Sensor für ${CONES[i][0]}e Wellen. Dein Gehirn vergleicht alle drei und macht daraus diese Farbe.`;
		}
	}
	slider.addEventListener("input", update);
	update();

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const l = Number(slider.value);
		const col = spectral(l);
		const visible = l >= 380 && l <= 750;
		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		// Welle: Periode im Bild proportional zur Wellenlänge
		const mid = h * 0.28;
		const amp = h * 0.11;
		const period = l * (w < 520 ? 0.16 : 0.22);
		const shift = (time * 60) % period;
		ctx.strokeStyle = visible ? css(col) : "rgba(244,239,230,0.35)";
		ctx.setLineDash(visible ? [] : [5, 5]);
		ctx.lineWidth = 3;
		if (visible) {
			ctx.shadowColor = css(col);
			ctx.shadowBlur = 14;
		}
		ctx.beginPath();
		for (let x = 0; x <= w; x += 2) {
			const y = mid - Math.sin(((x + shift) / period) * Math.PI * 2) * amp;
			x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
		}
		ctx.stroke();
		ctx.shadowBlur = 0;
		ctx.setLineDash([]);

		// Spektrumstreifen mit Markierung
		const sy = h * 0.5;
		const sx0 = 20;
		const sx1 = w - 20;
		const X = (nm) => sx0 + ((nm - 300) / 550) * (sx1 - sx0);
		for (let nm = 300; nm < 850; nm += 2) {
			ctx.fillStyle = nm >= 380 && nm <= 750 ? css(spectral(nm)) : "#16130f";
			ctx.fillRect(X(nm), sy, X(nm + 2) - X(nm) + 0.5, 16);
		}
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.font = "11px 'Space Grotesk', sans-serif";
		ctx.textAlign = "center";
		ctx.fillText("UV", X(340), sy + 12);
		ctx.fillText("IR", X(800), sy + 12);
		ctx.fillText("380 nm", X(380), sy + 30);
		ctx.fillText("750 nm", X(750), sy + 30);
		const mx = X(l);
		ctx.fillStyle = "#fff";
		ctx.beginPath();
		ctx.moveTo(mx, sy - 2);
		ctx.lineTo(mx - 6, sy - 10);
		ctx.lineTo(mx + 6, sy - 10);
		ctx.fill();

		// Zapfen-Balken
		const by = h * 0.68;
		const bh = h * 0.24;
		const bw = Math.min(70, (w - 80) / 5);
		ctx.textAlign = "center";
		CONES.forEach(([name, mu, sig, c], i) => {
			const v = gauss(l, mu, sig);
			const x = w * 0.5 + (i - 1) * (bw + 26);
			ctx.fillStyle = "rgba(255,255,255,0.06)";
			ctx.fillRect(x - bw / 2, by, bw, bh);
			ctx.fillStyle = c;
			ctx.fillRect(x - bw / 2, by + bh * (1 - v), bw, bh * v);
			ctx.fillStyle = "rgba(244,239,230,0.65)";
			ctx.fillText(`Sensor ${name}`, x, by + bh + 16);
		});
		ctx.textAlign = "left";
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.fillText("Dein Auge:", 16, by + 12);
		// Farbfeld
		ctx.fillStyle = visible ? css(col) : "#16130f";
		ctx.beginPath();
		ctx.roundRect(16, by + 22, 54, 54, 10);
		ctx.fill();
		ctx.strokeStyle = "rgba(255,255,255,0.2)";
		ctx.stroke();
	});
})();

// =====================================================================
// 2 · Prisma: Strahlverfolgung mit wellenlängenabhängiger Brechung
// =====================================================================
(() => {
	const canvas = document.getElementById("prismCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1 : 1.3));
	const btnWhite = document.getElementById("btnWhite");
	const btnLaser = document.getElementById("btnLaser");
	const note = document.getElementById("prismNote");
	const s = { laser: false, srcY: 0.66, drag: false };
	const nOf = (l) => 1.6 + 14000 / (l * l); // stark streuendes Flintglas

	const setMode = (laser) => {
		s.laser = laser;
		btnWhite.setAttribute("aria-pressed", String(!laser));
		btnLaser.setAttribute("aria-pressed", String(laser));
	};
	btnWhite.addEventListener("click", () => setMode(false));
	btnLaser.addEventListener("click", () => setMode(true));
	const setY = (e) => {
		const r = canvas.getBoundingClientRect();
		s.srcY = clamp((e.clientY - r.top) / size.h, 0.15, 0.92);
	};
	canvas.addEventListener("pointerdown", (e) => {
		s.drag = true;
		canvas.setPointerCapture(e.pointerId);
		setY(e);
	});
	canvas.addEventListener("pointermove", (e) => s.drag && setY(e));
	canvas.addEventListener("pointerup", () => (s.drag = false));
	canvas.addEventListener("pointercancel", () => (s.drag = false));

	function prism(w, h) {
		const side = Math.min(w * 0.42, h * 0.62);
		const cx = w * 0.52;
		const cy = h * 0.56;
		const hgt = (side * Math.sqrt(3)) / 2;
		return [
			[cx, cy - (hgt * 2) / 3],
			[cx + side / 2, cy + hgt / 3],
			[cx - side / 2, cy + hgt / 3],
		];
	}

	function intersect(o, d, a, b) {
		const ex = b[0] - a[0];
		const ey = b[1] - a[1];
		const den = d[0] * ey - d[1] * ex;
		if (Math.abs(den) < 1e-9) return null;
		const t = ((a[0] - o[0]) * ey - (a[1] - o[1]) * ex) / den;
		const u = ((a[0] - o[0]) * d[1] - (a[1] - o[1]) * d[0]) / den;
		if (t > 1e-6 && u >= 0 && u <= 1) return t;
		return null;
	}
	function refract(d, n, eta) {
		// d und n normiert, n zeigt gegen d
		const cosi = -(d[0] * n[0] + d[1] * n[1]);
		const k = 1 - eta * eta * (1 - cosi * cosi);
		if (k < 0) return null;
		const f = eta * cosi - Math.sqrt(k);
		return [eta * d[0] + f * n[0], eta * d[1] + f * n[1]];
	}

	function trace(o, d, tri, n) {
		const pts = [o];
		let inside = false;
		let tir = false;
		for (let bounce = 0; bounce < 5; bounce++) {
			let best = null;
			for (let i = 0; i < 3; i++) {
				const a = tri[i];
				const b = tri[(i + 1) % 3];
				const t = intersect(o, d, a, b);
				if (t !== null && (!best || t < best.t)) best = { t, a, b };
			}
			if (!best) break;
			const p = [o[0] + d[0] * best.t, o[1] + d[1] * best.t];
			pts.push(p);
			let nx = best.b[1] - best.a[1];
			let ny = -(best.b[0] - best.a[0]);
			const nl = Math.hypot(nx, ny);
			nx /= nl;
			ny /= nl;
			if (nx * d[0] + ny * d[1] > 0) (nx = -nx), (ny = -ny);
			const nd = refract(d, [nx, ny], inside ? n : 1 / n);
			if (nd) {
				d = nd;
				inside = !inside;
			} else {
				const dot = d[0] * nx + d[1] * ny;
				d = [d[0] - 2 * dot * nx, d[1] - 2 * dot * ny];
				tir = true;
			}
			o = [p[0] + d[0] * 0.01, p[1] + d[1] * 0.01];
			if (!inside) break;
		}
		pts.push([o[0] + d[0] * 3000, o[1] + d[1] * 3000]);
		return { pts, tir, inside };
	}

	whenVisible(canvas, () => {
		const { w, h } = size;
		const tri = prism(w, h);
		const src = [w * 0.07, s.srcY * h];
		const target = [(tri[0][0] + tri[2][0]) / 2, (tri[0][1] + tri[2][1]) / 2];
		let dx = target[0] - src[0];
		let dy = target[1] - src[1];
		const dl = Math.hypot(dx, dy);
		dx /= dl;
		dy /= dl;

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		const lambdas = s.laser ? [650] : Array.from({ length: 31 }, (_, i) => 400 + i * 10);
		let anyTir = false;
		const results = lambdas.map((l) => {
			const r = trace(src, [dx, dy], tri, nOf(l));
			if (r.tir) anyTir = true;
			return [l, r];
		});

		// Einfallender Strahl
		const hit = results[0][1].pts[1];
		ctx.strokeStyle = s.laser ? "rgba(255,60,40,0.95)" : "rgba(255,255,255,0.95)";
		ctx.lineWidth = s.laser ? 3 : 5;
		ctx.shadowColor = ctx.strokeStyle;
		ctx.shadowBlur = 14;
		ctx.beginPath();
		ctx.moveTo(src[0], src[1]);
		ctx.lineTo(hit[0], hit[1]);
		ctx.stroke();
		ctx.shadowBlur = 0;

		// Farbige Strahlen im und hinter dem Prisma
		ctx.globalCompositeOperation = "lighter";
		for (const [l, r] of results) {
			const c = s.laser ? [1, 0.2, 0.15] : spectral(l);
			for (let i = 1; i < r.pts.length - 1; i++) {
				const [x1, y1] = r.pts[i];
				const [x2, y2] = r.pts[i + 1];
				const outside = i === r.pts.length - 2 && !r.inside;
				ctx.strokeStyle = css(c, s.laser ? 0.95 : outside ? 0.55 : 0.28);
				ctx.lineWidth = s.laser ? 3 : outside ? 4 : 2;
				ctx.beginPath();
				ctx.moveTo(x1, y1);
				ctx.lineTo(x2, y2);
				ctx.stroke();
			}
		}
		ctx.globalCompositeOperation = "source-over";

		// Prisma
		ctx.fillStyle = "rgba(170,210,240,0.1)";
		ctx.strokeStyle = "rgba(200,230,255,0.55)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		tri.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		// Taschenlampe
		ctx.save();
		ctx.translate(src[0], src[1]);
		ctx.rotate(Math.atan2(dy, dx));
		ctx.fillStyle = s.laser ? "#3a1a18" : "#4a4f56";
		ctx.beginPath();
		ctx.roundRect(-34, -9, 34, 18, 4);
		ctx.fill();
		ctx.fillStyle = s.laser ? "#ff3c28" : "#fff6d0";
		ctx.fillRect(-3, -7, 4, 14);
		ctx.restore();
		ctx.fillStyle = "rgba(244,239,230,0.45)";
		ctx.font = "11px 'Space Grotesk', sans-serif";
		ctx.textAlign = "left";
		ctx.fillText("↕ ziehen", 8, clamp(src[1] + 26, 20, h - 8));

		note.textContent = s.laser
			? "Ein Laser hat nur eine einzige Farbe. Er wird abgelenkt, aber nicht aufgefächert, weil es nichts zu sortieren gibt."
			: anyTir
				? "Bei diesem Winkel wird ein Teil des Lichts im Glas gespiegelt statt herausgelassen. Das heißt Totalreflexion, so funktionieren auch Glasfaserkabel."
				: "Violett knickt am stärksten ab, Rot am wenigsten. Hinter dem Prisma fächert sich das Weiß in alle Regenbogenfarben auf.";
	});
})();

// =====================================================================
// 3 · Additive und subtraktive Farbmischung
// =====================================================================
(() => {
	const canvas = document.getElementById("mixCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1 : 1.3));
	const btnAdd = document.getElementById("btnAdd");
	const btnSub = document.getElementById("btnSub");
	const tag = document.getElementById("mixTag");
	const note = document.getElementById("mixNote");
	let sub = false;
	let circles = [];
	let drag = null;

	const ADD = [
		["Rot", [255, 0, 0]],
		["Grün", [0, 255, 0]],
		["Blau", [0, 0, 255]],
	];
	const SUB = [
		["Cyan", [0, 255, 255]],
		["Magenta", [255, 0, 255]],
		["Gelb", [255, 255, 0]],
	];
	const PAIRS_ADD = { "0-1": "Rot + Grün = Gelb", "1-2": "Grün + Blau = Cyan", "0-2": "Rot + Blau = Magenta" };
	const PAIRS_SUB = { "0-1": "Cyan + Magenta = Blau", "1-2": "Magenta + Gelb = Rot", "0-2": "Cyan + Gelb = Grün" };

	function reset() {
		const { w, h } = size;
		const r = Math.min(w, h) * 0.2;
		circles = [
			{ x: w * 0.22, y: h * 0.3, r },
			{ x: w * 0.78, y: h * 0.3, r },
			{ x: w * 0.5, y: h * 0.76, r },
		];
	}
	reset();
	document.getElementById("btnMixReset").addEventListener("click", reset);
	const setMode = (v) => {
		sub = v;
		btnAdd.setAttribute("aria-pressed", String(!v));
		btnSub.setAttribute("aria-pressed", String(v));
		tag.textContent = v ? "Malfarbe (Drucker)" : "Licht (Bildschirm)";
	};
	btnAdd.addEventListener("click", () => setMode(false));
	btnSub.addEventListener("click", () => setMode(true));

	const at = (e) => {
		const r = canvas.getBoundingClientRect();
		return [e.clientX - r.left, e.clientY - r.top];
	};
	canvas.addEventListener("pointerdown", (e) => {
		const [x, y] = at(e);
		for (let i = circles.length - 1; i >= 0; i--) {
			const c = circles[i];
			if (Math.hypot(x - c.x, y - c.y) < c.r) {
				drag = { i, dx: x - c.x, dy: y - c.y };
				canvas.setPointerCapture(e.pointerId);
				return;
			}
		}
	});
	canvas.addEventListener("pointermove", (e) => {
		if (!drag) return;
		const [x, y] = at(e);
		const c = circles[drag.i];
		c.x = clamp(x - drag.dx, 0, size.w);
		c.y = clamp(y - drag.dy, 0, size.h);
	});
	canvas.addEventListener("pointerup", () => (drag = null));
	canvas.addEventListener("pointercancel", () => (drag = null));

	whenVisible(canvas, () => {
		const { w, h } = size;
		const set = sub ? SUB : ADD;
		ctx.globalCompositeOperation = "source-over";
		ctx.fillStyle = sub ? "#f4efe6" : "#000";
		ctx.fillRect(0, 0, w, h);
		ctx.globalCompositeOperation = sub ? "multiply" : "lighter";
		circles.forEach((c, i) => {
			const [r, g, b] = set[i][1];
			ctx.fillStyle = `rgb(${r},${g},${b})`;
			ctx.beginPath();
			ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
			ctx.fill();
		});
		ctx.globalCompositeOperation = "source-over";
		ctx.font = "600 13px 'Space Grotesk', sans-serif";
		ctx.textAlign = "center";
		circles.forEach((c, i) => {
			const dx = c.x - w / 2;
			const dy = c.y - h / 2;
			const d = Math.hypot(dx, dy) || 1;
			ctx.fillStyle = sub ? "rgba(20,15,10,0.7)" : "rgba(0,0,0,0.65)";
			ctx.fillText(set[i][0], c.x + (dx / d) * c.r * 0.55, c.y + (dy / d) * c.r * 0.55 + 4);
		});

		const ov = (a, b) => Math.hypot(circles[a].x - circles[b].x, circles[a].y - circles[b].y) < circles[a].r + circles[b].r - 6;
		const pairs = ["0-1", "1-2", "0-2"].filter((k) => ov(+k[0], +k[2]));
		const all = pairs.length === 3;
		if (all) note.textContent = sub ? "Alle drei Farben zusammen schlucken fast das ganze Licht: In der Mitte wird es schwarz." : "Alle drei Lichter zusammen ergeben in der Mitte Weiß!";
		else if (pairs.length) note.textContent = pairs.map((k) => (sub ? PAIRS_SUB : PAIRS_ADD)[k]).join(" · ");
		else note.textContent = sub ? "Malfarben auf weißem Papier. Schieb sie übereinander." : "Drei farbige Scheinwerfer im Dunkeln. Schieb sie übereinander.";
	});
})();

// =====================================================================
// 4 · Körperfarben unter verschiedenen Lampen
// =====================================================================
(() => {
	const canvas = document.getElementById("appleCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.3));
	const lampsBox = document.getElementById("lamps");
	const tag = document.getElementById("lampTag");
	const note = document.getElementById("appleNote");
	const LAMPS = [
		["Weiß", [1, 1, 1], "Weißes Licht enthält alle Farben. Jedes Ding wirft seinen Teil davon zurück."],
		["Rot", [1, 0, 0], "Nur rotes Licht: Apfel und Papier leuchten rot, Blatt und Blaubeeren werden fast schwarz, weil sie Rot schlucken."],
		["Grün", [0, 1, 0], "Nur grünes Licht: Jetzt leuchtet das Blatt, und der Apfel wird dunkel."],
		["Blau", [0, 0, 1], "Unter blauem Licht wird der rote Apfel dunkel: Es ist nichts Rotes da, das er zurückwerfen könnte."],
		["Straßenlaterne", [1, 0.62, 0], "Natriumlampen-Orange: Blau fehlt völlig. Blaubeeren sehen schwarz aus, alles wirkt orange-grau."],
	];
	// Wie viel Rot, Grün und Blau jedes Ding zurückwirft
	const THINGS = [
		["Apfel", [0.85, 0.08, 0.07]],
		["Banane", [0.9, 0.78, 0.12]],
		["Blatt", [0.1, 0.6, 0.12]],
		["Blaubeeren", [0.16, 0.2, 0.62]],
		["Papier", [0.93, 0.93, 0.93]],
	];
	let lamp = 0;
	LAMPS.forEach(([name, rgb], i) => {
		const b = document.createElement("button");
		b.className = "btn";
		b.type = "button";
		b.setAttribute("aria-pressed", String(i === 0));
		b.innerHTML = `<i style="background:${css(rgb)}"></i>${name}`;
		b.addEventListener("click", () => {
			lamp = i;
			lampsBox.querySelectorAll("button").forEach((x, j) => x.setAttribute("aria-pressed", String(j === i)));
		});
		lampsBox.appendChild(b);
	});

	const lit = (refl, L, k = 1) => refl.map((v, i) => Math.pow(v * L[i] * k, 1 / 1.6));

	function shape(name, x, y, s, c) {
		ctx.fillStyle = css(c);
		ctx.strokeStyle = "rgba(0,0,0,0.25)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		if (name === "Apfel") {
			ctx.arc(x - s * 0.2, y, s * 0.42, 0, Math.PI * 2);
			ctx.arc(x + s * 0.2, y, s * 0.42, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = "rgba(60,40,20,0.8)";
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(x, y - s * 0.35);
			ctx.lineTo(x + s * 0.08, y - s * 0.62);
			ctx.stroke();
		} else if (name === "Banane") {
			ctx.ellipse(x, y - s * 0.1, s * 0.62, s * 0.5, 0, 0.15 * Math.PI, 0.85 * Math.PI);
			ctx.ellipse(x, y - s * 0.32, s * 0.6, s * 0.42, 0, 0.85 * Math.PI, 0.15 * Math.PI, true);
			ctx.fill();
		} else if (name === "Blatt") {
			ctx.ellipse(x, y, s * 0.6, s * 0.28, -0.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = "rgba(0,0,0,0.25)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(x - s * 0.5 * Math.cos(-0.5), y - s * 0.5 * Math.sin(-0.5));
			ctx.lineTo(x + s * 0.5 * Math.cos(-0.5), y + s * 0.5 * Math.sin(-0.5));
			ctx.stroke();
		} else if (name === "Blaubeeren") {
			for (const [dx, dy] of [
				[-0.25, 0.1],
				[0.22, 0.12],
				[0, -0.22],
			]) {
				ctx.beginPath();
				ctx.arc(x + dx * s, y + dy * s, s * 0.24, 0, Math.PI * 2);
				ctx.fill();
			}
		} else {
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(0.08);
			ctx.fillRect(-s * 0.4, -s * 0.52, s * 0.8, s * 1.04);
			ctx.restore();
		}
	}

	whenVisible(canvas, () => {
		const { w, h } = size;
		const [name, L, text] = LAMPS[lamp];
		tag.textContent = `Lampe: ${name}`;
		note.textContent = text;
		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		// Lichtkegel
		const g = ctx.createRadialGradient(w / 2, -h * 0.2, 0, w / 2, -h * 0.2, h * 1.3);
		g.addColorStop(0, css(L, 0.28));
		g.addColorStop(1, css(L, 0));
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = css(L);
		ctx.shadowColor = css(L);
		ctx.shadowBlur = 30;
		ctx.beginPath();
		ctx.ellipse(w / 2, 10, 40, 8, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.shadowBlur = 0;

		const narrow = w < 520;
		const cols = narrow ? 3 : 5;
		const cellW = w / cols;
		const s = Math.min(cellW * 0.7, 90);
		ctx.font = "12px 'Space Grotesk', sans-serif";
		ctx.textAlign = "center";
		THINGS.forEach(([thing, refl], i) => {
			const row = Math.floor(i / cols);
			const col = i % cols;
			const inRow = Math.min(cols, THINGS.length - row * cols);
			const x = (w - inRow * cellW) / 2 + (col + 0.5) * cellW;
			const y = narrow ? h * (0.3 + row * 0.38) : h * 0.45;
			shape(thing, x, y, s, lit(refl, L));
			ctx.fillStyle = "rgba(244,239,230,0.65)";
			ctx.fillText(thing, x, y + s * 0.72);
			// Was zurückkommt: drei Mini-Balken
			const bw = 9;
			const bh = 26;
			["#ff5a5a", "#5fe08a", "#5d8bff"].forEach((c, k) => {
				const v = refl[k] * L[k];
				const bx = x - 16 + k * 12;
				const by = y + s * 0.82;
				ctx.fillStyle = "rgba(255,255,255,0.07)";
				ctx.fillRect(bx, by, bw, bh);
				ctx.fillStyle = c;
				ctx.fillRect(bx, by + bh * (1 - v), bw, bh * v);
			});
		});
		ctx.fillStyle = "rgba(244,239,230,0.4)";
		ctx.textAlign = "left";
		ctx.fillText("Balken: wie viel Rot, Grün und Blau zurückkommt", 12, h - 10);
	});
})();

// =====================================================================
// 5 · Himmelsfarbe durch Rayleigh-Streuung
// =====================================================================
(() => {
	const canvas = document.getElementById("skyCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 640 ? 1.05 : 2.2));
	const slider = document.getElementById("sun");
	const sunOut = document.getElementById("sunOut");
	const tag = document.getElementById("skyTag");
	const out = document.getElementById("skyOut");
	const note = document.getElementById("skyNote");
	const btn = document.getElementById("btnSunset");
	// Optische Dicke der Luft senkrecht nach oben für Rot, Grün, Blau
	const TAU = [0.045, 0.098, 0.22];
	let anim = null;
	const skyBuf = document.createElement("canvas");
	let skyKey = "";

	// Luftmasse: wie viel Luft das Licht bei Höhe e (Grad) durchquert, senkrecht = 1
	function airmass(e) {
		if (e < -2) return 40 + (-2 - e) * 18;
		const r = (Math.max(e, -1.9) * Math.PI) / 180;
		return 1 / (Math.sin(r) + 0.15 * Math.pow(Math.max(e, -1.9) + 3.885, -1.253));
	}

	function update() {
		const e = Number(slider.value);
		sunOut.textContent = `${nf(e, e % 1 ? 1 : 0)}°`;
		const km = airmass(e) * 8;
		out.textContent = e > -2 ? `Weg durch die Luft ≈ ${nf(km)} km` : "Sonne unter dem Horizont";
		if (e > 35) (tag.textContent = "Mittag"), (note.textContent = "Kurzer Weg durch die Luft. Das gestreute Blau kommt von überall her, der Himmel ist kräftig blau, die Sonne fast weiß.");
		else if (e > 12) (tag.textContent = "Nachmittag"), (note.textContent = "Der Weg wird länger. Am Horizont sieht man schon mehr Luft hintereinander, dort wird der Himmel heller und weißlicher.");
		else if (e > 3) (tag.textContent = "Goldene Stunde"), (note.textContent = "Ein großer Teil des Blaus wird jetzt unterwegs herausgestreut. Das Sonnenlicht wird gelb bis orange.");
		else if (e > -1) (tag.textContent = "Sonnenuntergang"), (note.textContent = "Das Licht reist fast 40-mal so weit durch die Luft wie mittags. Blau kommt kaum noch durch, übrig bleiben Orange und Rot.");
		else (tag.textContent = "Dämmerung"), (note.textContent = "Die Sonne ist weg, beleuchtet aber noch die hohen Luftschichten. Oben wird es dunkelblau, am Horizont glüht es nach.");
	}
	slider.addEventListener("input", () => {
		anim = null;
		btn.textContent = "▶ Sonnenuntergang abspielen";
		update();
	});
	btn.addEventListener("click", () => {
		if (anim) {
			anim = null;
			btn.textContent = "▶ Sonnenuntergang abspielen";
			return;
		}
		if (Number(slider.value) < 0) slider.value = 60;
		anim = { from: Number(slider.value), t: 0 };
		btn.textContent = "■ Anhalten";
	});
	update();

	const tone = (v) => 1 - Math.exp(-v * 5.5);
	function sky(viewElev, sunElev, dist) {
		const mv = airmass(Math.max(viewElev, 0.3));
		const ms = airmass(sunElev);
		const day = clamp((sunElev + 6) / 8, 0, 1);
		return TAU.map((t, i) => {
			const scatter = 1 - Math.exp(-t * mv);
			const trans = Math.exp(-t * ms * 0.75);
			const halo = Math.exp(-dist * 3.5) * 0.9;
			const amb = [0.012, 0.03, 0.075][i] * day;
			return tone(scatter * trans * (1 + halo) + amb);
		});
	}

	whenVisible(canvas, (dt) => {
		if (anim) {
			anim.t += dt / 10;
			slider.value = lerp(anim.from, -5, Math.min(anim.t, 1));
			update();
			slider.style.setProperty("--fill", `${((Number(slider.value) + 6) / 76) * 100}%`);
			if (anim.t >= 1) {
				anim = null;
				btn.textContent = "▶ Sonnenuntergang abspielen";
			}
		}
		const { w, h } = size;
		const e = Number(slider.value);
		const horizon = h * 0.78;
		const sunX = w * 0.68;
		const sunY = horizon - (e / 72) * (horizon - 20);
		const topElev = 55;

		// Himmel in ein kleines Bild rechnen und weich hochskalieren (nur bei Änderung)
		const key = `${e}|${w}|${h}`;
		if (key !== skyKey) {
			skyKey = key;
			const gw = 96;
			const gh = 64;
			skyBuf.width = gw;
			skyBuf.height = gh;
			const g = skyBuf.getContext("2d");
			const img = g.createImageData(gw, gh);
			for (let j = 0; j < gh; j++) {
				const y = ((j + 0.5) / gh) * horizon;
				const v = ((horizon - y) / horizon) * topElev;
				for (let i = 0; i < gw; i++) {
					const x = ((i + 0.5) / gw) * w;
					const dist = Math.hypot((x - sunX) / w, (y - sunY) / h) * 2.2;
					const c = sky(v, e, dist);
					const k = (j * gw + i) * 4;
					img.data[k] = c[0] * 255;
					img.data[k + 1] = c[1] * 255;
					img.data[k + 2] = c[2] * 255;
					img.data[k + 3] = 255;
				}
			}
			g.putImageData(img, 0, 0);
		}
		ctx.imageSmoothingEnabled = true;
		ctx.drawImage(skyBuf, 0, 0, w, horizon + 2);
		// Sonne
		if (e > -1.5) {
			const ms = airmass(e);
			const sc = TAU.map((t) => Math.exp(-t * ms));
			const m = Math.max(...sc);
			const sun = sc.map((v) => v / m);
			ctx.save();
			ctx.beginPath();
			ctx.rect(0, 0, w, horizon);
			ctx.clip();
			ctx.fillStyle = css(sun);
			ctx.shadowColor = css(sun);
			ctx.shadowBlur = 40;
			ctx.beginPath();
			ctx.arc(sunX, sunY, Math.min(w, h) * 0.045, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
		// Landschaft
		const groundLight = sky(2, e, 1);
		ctx.fillStyle = css(groundLight.map((v) => v * 0.18));
		ctx.beginPath();
		ctx.moveTo(0, h);
		ctx.lineTo(0, horizon);
		for (let x = 0; x <= w; x += 10) ctx.lineTo(x, horizon - 8 - Math.sin(x * 0.012) * 10 - Math.sin(x * 0.031 + 1) * 6);
		ctx.lineTo(w, h);
		ctx.fill();

		// Kleines Schema: Weg durch die Lufthülle
		const bw = Math.min(210, w * 0.42);
		const bh = bw * 0.62;
		const bx = 12;
		const by = 36;
		ctx.fillStyle = "rgba(7,6,5,0.72)";
		ctx.beginPath();
		ctx.roundRect(bx, by, bw, bh, 10);
		ctx.fill();
		const ecx = bx + bw / 2;
		const ecy = by + bh + bw * 1.3;
		const er = bw * 1.6;
		const ar = er + bh * 0.42;
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(bx, by, bw, bh, 10);
		ctx.clip();
		ctx.fillStyle = "rgba(90,150,255,0.22)";
		ctx.beginPath();
		ctx.arc(ecx, ecy, ar, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#1d3a2a";
		ctx.beginPath();
		ctx.arc(ecx, ecy, er, 0, Math.PI * 2);
		ctx.fill();
		// Beobachter und Sonnenstrahl
		const ox = ecx;
		const oy = ecy - er;
		const ang = (Math.max(e, -1) * Math.PI) / 180;
		const ux = Math.cos(ang);
		const uy = -Math.sin(ang);
		// Länge bis zum Rand der Lufthülle
		const px = ox - ecx;
		const py = oy - ecy;
		const bq = px * ux + py * uy;
		const cq = px * px + py * py - ar * ar;
		const t = -bq + Math.sqrt(Math.max(bq * bq - cq, 0));
		ctx.strokeStyle = "rgba(255,225,120,0.9)";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.moveTo(ox, oy);
		ctx.lineTo(ox + ux * t, oy + uy * t);
		ctx.stroke();
		ctx.strokeStyle = "rgba(255,225,120,0.35)";
		ctx.beginPath();
		ctx.moveTo(ox + ux * t, oy + uy * t);
		ctx.lineTo(ox + ux * (t + 200), oy + uy * (t + 200));
		ctx.stroke();
		// Abzweigende blaue Streuung entlang des Wegs
		ctx.strokeStyle = "rgba(110,170,255,0.9)";
		ctx.lineWidth = 1.5;
		const n = Math.round(clamp(t / 14, 2, 14));
		for (let i = 1; i <= n; i++) {
			const q = (i / (n + 1)) * t;
			const sx = ox + ux * q;
			const sy = oy + uy * q;
			const side = i % 2 ? 1 : -1;
			ctx.beginPath();
			ctx.moveTo(sx, sy);
			ctx.lineTo(sx - uy * 9 * side + ux * 3, sy + ux * 9 * side + uy * 3);
			ctx.stroke();
		}
		ctx.fillStyle = "#fff";
		ctx.beginPath();
		ctx.arc(ox, oy, 3.5, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		ctx.fillStyle = "rgba(244,239,230,0.7)";
		ctx.font = "11px 'Space Grotesk', sans-serif";
		ctx.textAlign = "left";
		ctx.fillText("Du", ox + 7, oy - 4 > by + 12 ? oy - 4 : by + 12);
		ctx.fillText("Weg durch die Luft", bx + 10, by + 16);
		ctx.fillStyle = "rgba(110,170,255,0.95)";
		ctx.fillText("blau wird abgelenkt", bx + 10, by + bh - 10);
	});
})();
