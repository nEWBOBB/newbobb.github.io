"use strict";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const nf = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });

// =====================================================================
// 1 · Zeilen: ein Bild wird Zeile für Zeile übertragen und gemalt
// =====================================================================
(() => {
	const canvas = document.getElementById("scanCanvas");
	const src = document.createElement("canvas");
	const low = document.createElement("canvas");
	const lctx = low.getContext("2d");
	let slow = true;
	let phase = 0;
	let lastN = 0;
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.1 : 1.33), drawSource);
	const slider = document.getElementById("lines");
	const out = document.getElementById("linesOut");
	const tag = document.getElementById("scanTag");
	const readout = document.getElementById("scanReadout");
	const note = document.getElementById("scanNote");
	const btnSlow = document.getElementById("btnSlow");
	const presetBox = document.getElementById("scanPresets");

	const MAXN = 1080;
	const toN = (v) => Math.round(8 * Math.pow(MAXN / 8, v / 100));
	const toV = (n) => (100 * Math.log(n / 8)) / Math.log(MAXN / 8);
	const PRESETS = [
		["Baird 1926 · 30", 30],
		["Röhre · 625", 625],
		["Full HD · 1080", 1080],
	];
	slider.min = 0;
	slider.max = 100;
	slider.step = 0.1;
	slider.value = toV(30);

	// Testbild: der Kopf einer Bauchrednerpuppe, wie bei Baird
	function drawSource(sz) {
		const { w, h } = sz;
		src.width = w;
		src.height = h;
		const c = src.getContext("2d");
		const g = c.createLinearGradient(0, 0, 0, h);
		g.addColorStop(0, "#3a3a3a");
		g.addColorStop(1, "#111");
		c.fillStyle = g;
		c.fillRect(0, 0, w, h);
		const cx = w / 2;
		const cy = h * 0.52;
		const s = Math.min(w, h) / 2.4;
		// Hals und Kragen
		c.fillStyle = "#555";
		c.fillRect(cx - s * 0.35, cy + s * 0.75, s * 0.7, s * 0.6);
		c.fillStyle = "#e8e8e8";
		c.beginPath();
		c.moveTo(cx - s * 0.9, h);
		c.lineTo(cx, cy + s * 1.0);
		c.lineTo(cx + s * 0.9, h);
		c.fill();
		// Ohren
		c.fillStyle = "#b5b5b5";
		c.beginPath();
		c.ellipse(cx - s * 0.78, cy, s * 0.14, s * 0.24, 0, 0, Math.PI * 2);
		c.ellipse(cx + s * 0.78, cy, s * 0.14, s * 0.24, 0, 0, Math.PI * 2);
		c.fill();
		// Kopf
		c.fillStyle = "#c9c9c9";
		c.beginPath();
		c.ellipse(cx, cy, s * 0.75, s * 0.92, 0, 0, Math.PI * 2);
		c.fill();
		// Haare
		c.fillStyle = "#1c1c1c";
		c.beginPath();
		c.ellipse(cx, cy - s * 0.62, s * 0.72, s * 0.38, 0, Math.PI, Math.PI * 2);
		c.fill();
		// Augen
		for (const k of [-1, 1]) {
			c.fillStyle = "#fff";
			c.beginPath();
			c.ellipse(cx + k * s * 0.3, cy - s * 0.12, s * 0.15, s * 0.11, 0, 0, Math.PI * 2);
			c.fill();
			c.fillStyle = "#111";
			c.beginPath();
			c.arc(cx + k * s * 0.3, cy - s * 0.1, s * 0.07, 0, Math.PI * 2);
			c.fill();
			c.strokeStyle = "#222";
			c.lineWidth = s * 0.05;
			c.beginPath();
			c.moveTo(cx + k * s * 0.15, cy - s * 0.32);
			c.lineTo(cx + k * s * 0.45, cy - s * 0.36);
			c.stroke();
		}
		// Nase und Mund
		c.fillStyle = "#9a9a9a";
		c.beginPath();
		c.moveTo(cx, cy - s * 0.02);
		c.lineTo(cx - s * 0.1, cy + s * 0.22);
		c.lineTo(cx + s * 0.1, cy + s * 0.22);
		c.fill();
		c.strokeStyle = "#333";
		c.lineWidth = s * 0.07;
		c.lineCap = "round";
		c.beginPath();
		c.arc(cx, cy + s * 0.3, s * 0.28, 0.2 * Math.PI, 0.8 * Math.PI);
		c.stroke();
		lastN = 0;
	}

	function update() {
		const n = toN(Number(slider.value));
		out.textContent = nf(n);
		[...presetBox.children].forEach((b, i) => b.setAttribute("aria-pressed", String(PRESETS[i][1] === n)));
		btnSlow.setAttribute("aria-pressed", String(slow));
		tag.textContent = n <= 60 ? "Mechanisches Fernsehen" : n <= 700 ? "Röhrenfernseher" : "Flachbildschirm";
		const shown = Math.min(n, Math.floor(size.h));
		note.textContent =
			n <= 40
				? "So sah Fernsehen 1926 aus: Man erkennt ein Gesicht, aber kaum mehr."
				: n > shown
					? `${nf(n)} Zeilen sind feiner, als dieser Kasten auf deinem Bildschirm zeigen kann. Ein echter Fernseher hat so viele Zeilen auf voller Bildhöhe.`
					: "Mit jeder Verdopplung der Zeilen wird das Bild deutlich schärfer.";
	}

	PRESETS.forEach(([label, n]) => {
		const b = document.createElement("button");
		b.type = "button";
		b.className = "btn";
		b.textContent = label;
		b.addEventListener("click", () => {
			slider.value = toV(n);
			slider.dispatchEvent(new Event("input"));
		});
		presetBox.appendChild(b);
	});
	slider.addEventListener("input", update);
	btnSlow.addEventListener("click", () => {
		slow = !slow;
		update();
	});
	update();

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const n = Math.min(toN(Number(slider.value)), Math.floor(h));
		if (n !== lastN) {
			low.height = n;
			low.width = Math.max(4, Math.round((n * w) / h));
			lctx.imageSmoothingEnabled = true;
			lctx.imageSmoothingQuality = "high";
			lctx.drawImage(src, 0, 0, low.width, low.height);
			lastN = n;
			phase = 0;
		}
		const rowH = h / n;
		ctx.imageSmoothingEnabled = false;
		ctx.fillStyle = "#050505";
		ctx.fillRect(0, 0, w, h);

		const frameTime = clamp(n * 0.12, 2.5, 9);
		if (slow) {
			phase = (phase + dt / frameTime) % 1;
			const pos = phase * n;
			const k = Math.floor(pos);
			const frac = pos - k;
			// Nachleuchten des letzten Bildes
			ctx.globalAlpha = 0.28;
			ctx.drawImage(low, 0, 0, w, h);
			ctx.globalAlpha = 1;
			if (k > 0) ctx.drawImage(low, 0, 0, low.width, k, 0, 0, w, k * rowH);
			const cw = Math.max(1, Math.floor(frac * low.width));
			ctx.drawImage(low, 0, k, cw, 1, 0, k * rowH, (cw / low.width) * w, rowH);
			// Strahl
			const bx = frac * w;
			const by = (k + 0.5) * rowH;
			const g = ctx.createRadialGradient(bx, by, 0, bx, by, 14);
			g.addColorStop(0, "rgba(220,250,255,1)");
			g.addColorStop(1, "rgba(159,231,255,0)");
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(bx, by, 14, 0, Math.PI * 2);
			ctx.fill();
			readout.textContent = `Zeile ${k + 1} von ${nf(n)}`;
		} else {
			ctx.drawImage(low, 0, 0, w, h);
			readout.textContent = "25 Bilder pro Sekunde";
		}
		// Zeilenstruktur sichtbar machen
		if (rowH >= 4) {
			ctx.fillStyle = "rgba(0,0,0,0.45)";
			for (let i = 1; i < n; i++) ctx.fillRect(0, i * rowH - 0.75, w, 1.5);
		}
		// Bläulicher Schimmer wie auf alten Bildröhren
		ctx.fillStyle = "rgba(159,231,255,0.06)";
		ctx.fillRect(0, 0, w, h);
		ctx.imageSmoothingEnabled = true;
	});
})();

// =====================================================================
// 2 · Bildfrequenz: ein Ball als Daumenkino
// =====================================================================
(() => {
	const canvas = document.getElementById("fpsCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.15 : 1.5));
	const slider = document.getElementById("fps");
	const out = document.getElementById("fpsOut");
	const readout = document.getElementById("fpsReadout");
	const note = document.getElementById("fpsNote");

	// Ball hüpft hin und her, Position als Funktion der Zeit
	const ball = (t) => {
		const u = (t * 0.22) % 2;
		const x = u < 1 ? u : 2 - u;
		const y = Math.abs(Math.sin(t * Math.PI * 0.9));
		return { x, y };
	};

	function update() {
		const f = Number(slider.value);
		out.textContent = f;
		readout.textContent = `${f} ${f === 1 ? "Bild" : "Bilder"} pro Sekunde`;
		note.textContent =
			f < 8
				? "Das ruckelt deutlich: Du siehst einzelne Standbilder."
				: f < 16
					? "Schon fast eine Bewegung, aber noch unruhig, wie bei sehr alten Filmen."
					: f < 30
						? "Flüssig. So viele Bilder zeigen Kino (24) und Fernsehen (25)."
						: "Sehr flüssig, wie bei Sportübertragungen oder Videospielen.";
	}
	slider.addEventListener("input", update);
	document.querySelectorAll("[data-fps]").forEach((b) =>
		b.addEventListener("click", () => {
			slider.value = b.dataset.fps;
			slider.dispatchEvent(new Event("input"));
		})
	);
	update();

	whenVisible(canvas, (dt, t) => {
		const { w, h } = size;
		const f = Number(slider.value);
		const small = w < 520;
		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		const stripH = small ? 54 : 64;
		const floor = h - stripH - 26;
		const top = 40;
		const r = small ? 14 : 18;
		ctx.strokeStyle = "rgba(255,255,255,0.18)";
		ctx.beginPath();
		ctx.moveTo(20, floor + r);
		ctx.lineTo(w - 20, floor + r);
		ctx.stroke();

		const tq = Math.floor(t * f) / f;
		const pos = (tt) => {
			const b = ball(tt);
			return [lerp(20 + r, w - 20 - r, b.x), floor - b.y * (floor - top - r)];
		};
		const [bx, by] = pos(tq);
		const g = ctx.createRadialGradient(bx - r / 3, by - r / 3, 1, bx, by, r);
		g.addColorStop(0, "#ffffff");
		g.addColorStop(1, "#9fe7ff");
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(bx, by, r, 0, Math.PI * 2);
		ctx.fill();

		// Filmstreifen der letzten Bilder
		const n = small ? 6 : 8;
		const fw = (w - 40) / n;
		const sy = h - stripH - 8;
		for (let i = 0; i < n; i++) {
			const tt = tq - (n - 1 - i) / f;
			const x = 20 + i * fw;
			ctx.fillStyle = i === n - 1 ? "rgba(159,231,255,0.12)" : "rgba(255,255,255,0.04)";
			ctx.fillRect(x + 3, sy, fw - 6, stripH);
			ctx.strokeStyle = i === n - 1 ? "#9fe7ff" : "rgba(255,255,255,0.15)";
			ctx.strokeRect(x + 3.5, sy + 0.5, fw - 7, stripH - 1);
			const b = ball(tt);
			ctx.fillStyle = "#9fe7ff";
			ctx.beginPath();
			ctx.arc(x + 3 + 6 + b.x * (fw - 18), sy + stripH - 8 - b.y * (stripH - 18), 4, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = "rgba(244,239,230,0.45)";
		ctx.font = "11px 'Space Grotesk', sans-serif";
		ctx.textAlign = "left";
		ctx.fillText("Die letzten Einzelbilder", 22, sy - 6);
	});
})();

// =====================================================================
// 3 · Rot, Grün, Blau: Farbmischung und Pixel unter der Lupe
// =====================================================================
(() => {
	const canvas = document.getElementById("rgbCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.2 : 2));
	const ch = ["r", "g", "b"].map((k) => document.getElementById(k));
	const outs = ["rOut", "gOut", "bOut"].map((k) => document.getElementById(k));
	const zoom = document.getElementById("zoom");
	const zoomOut = document.getElementById("zoomOut");
	const tag = document.getElementById("rgbTag");
	const note = document.getElementById("rgbNote");

	const val = () => ch.map((c) => Number(c.value));
	const pixelSize = () => lerp(3, 96, Math.pow(Number(zoom.value), 2));

	function colorName([r, g, b]) {
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		if (max < 40) return "Schwarz";
		if (min > 215) return "Weiß";
		if (max - min < 30) return "Grau";
		const hi = (v) => v > max * 0.6;
		if (hi(r) && hi(g) && !hi(b)) return g > r * 0.72 ? "Gelb" : "Orange";
		if (hi(r) && hi(b) && !hi(g)) return r > b ? "Pink" : "Lila";
		if (hi(g) && hi(b) && !hi(r)) return "Türkis";
		if (hi(r) && !hi(g) && !hi(b)) return g > r * 0.35 ? "Orange" : "Rot";
		if (hi(g)) return "Grün";
		return b > r ? "Blau" : "Lila";
	}

	function update() {
		const v = val();
		v.forEach((x, i) => (outs[i].textContent = x));
		const p = pixelSize();
		zoomOut.textContent = `${nf(p / 3, 0)}×`;
		tag.textContent = p < 8 ? "Aus normalem Abstand" : "Unter der Lupe";
		note.textContent = `Rot ${v[0]} + Grün ${v[1]} + Blau ${v[2]} ergibt für dein Auge: ${colorName(v)}.`;
	}
	ch.forEach((c) => c.addEventListener("input", update));
	zoom.addEventListener("input", update);
	document.querySelectorAll("[data-rgb]").forEach((b) =>
		b.addEventListener("click", () => {
			b.dataset.rgb.split(",").forEach((x, i) => {
				ch[i].value = x;
				ch[i].dispatchEvent(new Event("input"));
			});
		})
	);
	update();

	whenVisible(canvas, () => {
		const { w, h } = size;
		const [r, g, b] = val();
		const small = w < 520;
		ctx.fillStyle = "#050505";
		ctx.fillRect(0, 0, w, h);

		// links bzw. oben: die Mischfarbe, wie das Auge sie sieht
		const sw = small ? w : w * 0.32;
		const sh = small ? h * 0.3 : h;
		ctx.fillStyle = `rgb(${r},${g},${b})`;
		ctx.fillRect(0, 0, sw, sh);
		ctx.fillStyle = r + g + b > 450 ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.7)";
		ctx.font = "12px 'Space Grotesk', sans-serif";
		ctx.textAlign = "left";
		ctx.fillText("Was du siehst", 12, sh - 12);

		// rechts bzw. unten: die Pixel aus der Nähe
		const ox = small ? 0 : sw;
		const oy = small ? sh : 0;
		const zw = w - ox;
		const zh = h - oy;
		const p = pixelSize();
		ctx.save();
		ctx.beginPath();
		ctx.rect(ox, oy, zw, zh);
		ctx.clip();
		const cols = Math.ceil(zw / p) + 1;
		const rows = Math.ceil(zh / p) + 1;
		if (p < 8) {
			ctx.fillStyle = `rgb(${r},${g},${b})`;
			ctx.fillRect(ox, oy, zw, zh);
		} else {
			const gap = Math.max(1, p * 0.06);
			const sub = (p - gap * 4) / 3;
			for (let j = 0; j < rows; j++)
				for (let i = 0; i < cols; i++) {
					const x = ox + i * p;
					const y = oy + j * p;
					[[r, "255,60,60"], [g, "60,255,90"], [b, "70,120,255"]].forEach(([v, c], k) => {
						ctx.fillStyle = `rgba(${c},${0.06 + (v / 255) * 0.94})`;
						ctx.fillRect(x + gap + k * (sub + gap), y + gap, sub, p - gap * 2);
					});
				}
		}
		ctx.restore();
	});
})();

// =====================================================================
// 4 · Kompression: nur übertragen, was sich ändert
// =====================================================================
(() => {
	const canvas = document.getElementById("codecCanvas");
	const scene = document.createElement("canvas");
	const sctx = scene.getContext("2d");
	const small = document.createElement("canvas");
	const smctx = small.getContext("2d");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.2 : 2.4));
	const btnDiff = document.getElementById("btnDiff");
	const qual = document.getElementById("qual");
	const qualOut = document.getElementById("qualOut");
	const readout = document.getElementById("codecReadout");
	const note = document.getElementById("codecNote");

	const BLOCK = 16;
	let diff = false;
	let prev = [];

	const block = () => Math.round(lerp(22, 1, (Number(qual.value) - 1) / 9));

	function update() {
		btnDiff.setAttribute("aria-pressed", String(diff));
		btnDiff.textContent = diff ? "Ganzes Bild zeigen" : "Nur Änderungen zeigen";
		const q = Number(qual.value);
		qualOut.textContent = q >= 8 ? "hoch" : q >= 5 ? "mittel" : "niedrig";
		note.textContent =
			q <= 4
				? "Zu wenig Daten: Das Bild wird in grobe Klötzchen zerlegt, wie bei schlechtem Internet."
				: diff
					? "Nur die markierten Blöcke müssen neu übertragen werden. Der Rest wird vom letzten Bild übernommen."
					: "Ein ganzes Bild ist teuer. Schalte die Änderungen ein und schau, wie wenig sich wirklich bewegt.";
	}
	btnDiff.addEventListener("click", () => {
		diff = !diff;
		update();
	});
	qual.addEventListener("input", update);
	update();

	// Bewegte Dinge mit ihren Rechtecken
	function movers(t, w, h) {
		const gy = h * 0.78;
		const carX = ((t * 0.12) % 1.3) * (w + 160) - 120;
		const ballX = w * 0.18 + Math.sin(t * 0.9) * w * 0.08;
		const ballY = gy - 12 - Math.abs(Math.sin(t * 3)) * h * 0.3;
		const birdX = w - (((t * 0.07) % 1.2) * (w + 80)) + 40;
		const birdY = h * 0.2 + Math.sin(t * 2) * 8;
		return [
			{ kind: "car", x: carX, y: gy - 34, w: 110, h: 40 },
			{ kind: "ball", x: ballX - 12, y: ballY - 12, w: 24, h: 24 },
			{ kind: "bird", x: birdX - 14, y: birdY - 8, w: 28, h: 16, wing: Math.sin(t * 12) },
		];
	}

	function draw(c, t, w, h) {
		const sky = c.createLinearGradient(0, 0, 0, h);
		sky.addColorStop(0, "#2b5f8f");
		sky.addColorStop(1, "#9fd0e8");
		c.fillStyle = sky;
		c.fillRect(0, 0, w, h);
		c.fillStyle = "#ffe08a";
		c.beginPath();
		c.arc(w * 0.85, h * 0.18, h * 0.08, 0, Math.PI * 2);
		c.fill();
		const gy = h * 0.78;
		c.fillStyle = "#4f8f4a";
		c.fillRect(0, gy, w, h - gy);
		c.fillStyle = "#555";
		c.fillRect(0, gy + 6, w, 14);
		// Haus
		const hx = w * 0.55;
		c.fillStyle = "#e9d8b8";
		c.fillRect(hx, gy - h * 0.3, h * 0.36, h * 0.3);
		c.fillStyle = "#b5483b";
		c.beginPath();
		c.moveTo(hx - 10, gy - h * 0.3);
		c.lineTo(hx + h * 0.18, gy - h * 0.48);
		c.lineTo(hx + h * 0.36 + 10, gy - h * 0.3);
		c.fill();
		c.fillStyle = "#5b7fa6";
		c.fillRect(hx + h * 0.05, gy - h * 0.22, h * 0.09, h * 0.08);
		c.fillRect(hx + h * 0.22, gy - h * 0.22, h * 0.09, h * 0.08);
		c.fillStyle = "#6b4a2f";
		c.fillRect(hx + h * 0.14, gy - h * 0.12, h * 0.08, h * 0.12);
		// Baum
		c.fillStyle = "#6b4a2f";
		c.fillRect(w * 0.36, gy - h * 0.2, 10, h * 0.2);
		c.fillStyle = "#2f6f3a";
		c.beginPath();
		c.arc(w * 0.36 + 5, gy - h * 0.26, h * 0.11, 0, Math.PI * 2);
		c.fill();

		for (const m of movers(t, w, h)) {
			if (m.kind === "car") {
				c.fillStyle = "#e0443e";
				c.fillRect(m.x, m.y + 12, m.w, 20);
				c.fillRect(m.x + 22, m.y, 56, 16);
				c.fillStyle = "#cfe8ff";
				c.fillRect(m.x + 28, m.y + 3, 20, 10);
				c.fillRect(m.x + 52, m.y + 3, 20, 10);
				c.fillStyle = "#111";
				c.beginPath();
				c.arc(m.x + 24, m.y + 34, 7, 0, Math.PI * 2);
				c.arc(m.x + 86, m.y + 34, 7, 0, Math.PI * 2);
				c.fill();
			} else if (m.kind === "ball") {
				c.fillStyle = "#ffd23f";
				c.beginPath();
				c.arc(m.x + 12, m.y + 12, 12, 0, Math.PI * 2);
				c.fill();
			} else {
				c.strokeStyle = "#1c1c1c";
				c.lineWidth = 2.5;
				c.beginPath();
				c.moveTo(m.x, m.y + 8 - m.wing * 6);
				c.lineTo(m.x + 14, m.y + 8);
				c.lineTo(m.x + 28, m.y + 8 - m.wing * 6);
				c.stroke();
			}
		}
	}

	whenVisible(canvas, (dt, t) => {
		const { w, h } = size;
		if (scene.width !== Math.round(w) || scene.height !== Math.round(h)) {
			scene.width = Math.round(w);
			scene.height = Math.round(h);
		}
		draw(sctx, t, w, h);

		// Qualität: gröber speichern = Klötzchen
		const bs = block();
		if (bs > 1) {
			small.width = Math.max(1, Math.round(w / bs));
			small.height = Math.max(1, Math.round(h / bs));
			smctx.imageSmoothingEnabled = true;
			smctx.drawImage(scene, 0, 0, small.width, small.height);
			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(small, 0, 0, w, h);
			ctx.imageSmoothingEnabled = true;
		} else {
			ctx.drawImage(scene, 0, 0, w, h);
		}

		// Welche Blöcke haben sich geändert? Alles, was ein bewegtes Ding jetzt oder eben berührt
		const cur = movers(t, w, h);
		const cols = Math.ceil(w / BLOCK);
		const rows = Math.ceil(h / BLOCK);
		const changed = new Set();
		for (const m of [...cur, ...prev]) {
			const x0 = clamp(Math.floor(m.x / BLOCK), 0, cols - 1);
			const x1 = clamp(Math.floor((m.x + m.w) / BLOCK), 0, cols - 1);
			const y0 = clamp(Math.floor(m.y / BLOCK), 0, rows - 1);
			const y1 = clamp(Math.floor((m.y + m.h + 8) / BLOCK), 0, rows - 1);
			if (m.x + m.w < 0 || m.x > w) continue;
			for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) changed.add(y * cols + x);
		}
		prev = cur;
		const pct = (changed.size / (cols * rows)) * 100;

		if (diff) {
			ctx.fillStyle = "rgba(5,5,5,0.72)";
			for (let y = 0; y < rows; y++)
				for (let x = 0; x < cols; x++)
					if (!changed.has(y * cols + x)) ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
			ctx.strokeStyle = "#9fe7ff";
			ctx.lineWidth = 1;
			for (const k of changed) ctx.strokeRect((k % cols) * BLOCK + 0.5, Math.floor(k / cols) * BLOCK + 0.5, BLOCK - 1, BLOCK - 1);
			readout.textContent = `Neu übertragen: ${nf(pct, 0)} % des Bildes`;
		} else {
			readout.textContent = bs > 1 ? `Klötzchen: ${bs} × ${bs} Pixel` : "Volles Bild";
		}
	});
})();
