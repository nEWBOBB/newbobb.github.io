"use strict";

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fmt = (v) => Math.round(v).toLocaleString("de-DE");

// Weiche, eingefärbte Leuchtpunkte einmal vorrendern; das ist viel schneller als Gradienten pro Partikel.
function makeSprite(rgb, size = 64) {
	const c = document.createElement("canvas");
	c.width = c.height = size;
	const g = c.getContext("2d");
	const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
	grad.addColorStop(0, `rgba(${rgb},1)`);
	grad.addColorStop(0.35, `rgba(${rgb},0.55)`);
	grad.addColorStop(1, `rgba(${rgb},0)`);
	g.fillStyle = grad;
	g.fillRect(0, 0, size, size);
	return c;
}

const FLAME_SPRITES = ["255,250,225", "255,214,120", "255,150,50", "240,80,20", "150,30,10"].map((c) => makeSprite(c));
const BLUE_SPRITES = ["220,240,255", "120,170,255", "70,110,255", "60,60,220", "40,30,140"].map((c) => makeSprite(c));
const SMOKE_SPRITE = makeSprite("120,115,110");
const STEAM_SPRITE = makeSprite("230,240,250");

function drawParticles(ctx, list, sprites) {
	for (const p of list) {
		const t = p.life / p.max;
		const s = sprites[Math.min(sprites.length - 1, Math.floor(t * sprites.length))];
		const size = p.size * (1 - t * 0.55);
		ctx.globalAlpha = (1 - t) * p.alpha;
		ctx.drawImage(s, p.x - size / 2, p.y - size / 2, size, size);
	}
	ctx.globalAlpha = 1;
}

function stepParticles(list, dt, time, turbulence, lift) {
	for (let i = list.length - 1; i >= 0; i--) {
		const p = list[i];
		p.life += dt;
		if (p.life >= p.max) {
			list.splice(i, 1);
			continue;
		}
		p.vy -= lift * dt;
		p.vx += Math.sin(time * 4 + p.y * 0.04 + p.seed) * turbulence * dt;
		p.x += p.vx * dt;
		p.y += p.vy * dt;
	}
}

// =====================================================================
// 1 · Feuerdreieck
// =====================================================================
(() => {
	const canvas = document.getElementById("fireCanvas");
	const { ctx, size } = fitCanvas(canvas, 4 / 3);
	const ui = {
		match: document.getElementById("btnMatch"),
		fuel: document.getElementById("btnFuel"),
		oxygen: document.getElementById("btnOxygen"),
		water: document.getElementById("btnWater"),
		temp: document.getElementById("fireTemp"),
		note: document.getElementById("fireNote"),
	};
	const IGNITION = 300;
	const s = { fuel: true, oxygen: true, water: false, temp: 20, intensity: 0, match: 0, everBurned: false, dome: 0 };
	const flames = [];
	const smoke = [];
	const drops = [];
	const steam = [];

	const toggle = (btn, key) =>
		btn.addEventListener("click", () => {
			s[key] = !s[key];
			btn.setAttribute("aria-pressed", String(s[key]));
		});
	toggle(ui.fuel, "fuel");
	toggle(ui.oxygen, "oxygen");
	toggle(ui.water, "water");
	ui.match.addEventListener("click", () => (s.match = 1.6));

	let noteText = "";
	function setNote(t) {
		if (t !== noteText) ui.note.textContent = noteText = t;
	}

	function drawLogs(cx, gy, w) {
		if (!s.fuel) {
			ctx.fillStyle = "#2a2522";
			ctx.beginPath();
			ctx.ellipse(cx, gy - 3, w * 0.42, 6, 0, 0, Math.PI * 2);
			ctx.fill();
			return;
		}
		const glow = clamp((s.temp - 180) / 700, 0, 1);
		const logs = [
			[-0.32, -10, 0.2],
			[0.32, -10, -0.2],
			[0, -22, 0],
		];
		for (const [dx, dy, rot] of logs) {
			ctx.save();
			ctx.translate(cx + dx * w * 0.5, gy + dy);
			ctx.rotate(rot);
			ctx.fillStyle = "#4a2f1d";
			ctx.beginPath();
			ctx.roundRect(-w * 0.32, -9, w * 0.64, 18, 9);
			ctx.fill();
			if (glow > 0) {
				ctx.fillStyle = `rgba(255,${Math.round(90 + glow * 80)},30,${glow * 0.85})`;
				ctx.beginPath();
				ctx.roundRect(-w * 0.28, -3, w * 0.56, 6, 3);
				ctx.fill();
			}
			ctx.restore();
		}
	}

	function drawTriangle(x, y, r) {
		const pts = [
			[x, y - r],
			[x - r * 0.87, y + r * 0.5],
			[x + r * 0.87, y + r * 0.5],
		];
		const sides = [
			{ a: 0, b: 1, ok: s.fuel, label: "Brennstoff", lx: -1 },
			{ a: 0, b: 2, ok: s.oxygen, label: "Sauerstoff", lx: 1 },
			{ a: 1, b: 2, ok: s.temp >= IGNITION, label: "Wärme", lx: 0 },
		];
		ctx.lineWidth = 3;
		ctx.lineCap = "round";
		ctx.font = "11px 'Space Grotesk', sans-serif";
		ctx.textAlign = "center";
		for (const sd of sides) {
			const [ax, ay] = pts[sd.a];
			const [bx, by] = pts[sd.b];
			ctx.strokeStyle = sd.ok ? "#ffb04d" : "rgba(255,255,255,0.16)";
			ctx.beginPath();
			ctx.moveTo(ax, ay);
			ctx.lineTo(bx, by);
			ctx.stroke();
			const mx = (ax + bx) / 2 + sd.lx * 30;
			const my = (ay + by) / 2 + (sd.lx === 0 ? 16 : -2);
			ctx.fillStyle = sd.ok ? "#f4efe6" : "rgba(244,239,230,0.38)";
			ctx.fillText(sd.label, mx, my);
		}
	}

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const cx = w / 2;
		const gy = h * 0.84;
		const logW = Math.min(w * 0.5, 260);

		// --- Physik des Dreiecks ---
		if (s.match > 0) {
			s.match -= dt;
			if (s.fuel && s.oxygen && s.temp < 460) s.temp = Math.min(460, s.temp + 260 * dt);
		}
		const burning = s.fuel && s.oxygen && s.temp >= IGNITION && !s.water;
		if (burning) s.everBurned = true;
		const target = burning ? 1 : 0;
		s.intensity += (target - s.intensity) * dt * (target > s.intensity ? 1.1 : 2.2);
		const heatEq = 20 + 900 * s.intensity * (s.fuel ? 1 : 0);
		s.temp += (heatEq - s.temp) * dt * (heatEq > s.temp ? 0.9 : 0.32);
		if (s.water) s.temp = Math.max(20, s.temp - 380 * dt);
		s.dome += ((s.oxygen ? 0 : 1) - s.dome) * dt * 6;

		// --- Partikel ---
		const spawn = s.intensity * 190 * dt;
		for (let i = 0; i < spawn; i++) {
			flames.push({
				x: cx + rand(-0.38, 0.38) * logW * (0.5 + s.intensity * 0.5),
				y: gy - 24,
				vx: rand(-10, 10),
				vy: rand(-150, -80),
				life: 0,
				max: rand(0.6, 1.3) * (0.45 + s.intensity * 0.6),
				size: rand(40, 68) * (0.6 + s.intensity * 0.5),
				alpha: 0.32,
				seed: rand(0, 10),
			});
		}
		if (s.match > 0) {
			flames.push({ x: cx + logW * 0.42, y: gy - 50, vx: 0, vy: -40, life: 0, max: 0.35, size: 18, alpha: 0.9, seed: 0 });
		}
		const smokeRate = (s.intensity * 10 + (s.fuel && !burning && s.temp > 120 ? 40 : 0)) * dt;
		for (let i = 0; i < smokeRate; i++) {
			smoke.push({
				x: cx + rand(-0.25, 0.25) * logW,
				y: gy - 40 - s.intensity * 60,
				vx: rand(-8, 8),
				vy: rand(-40, -20),
				life: 0,
				max: rand(1.8, 3),
				size: rand(30, 60),
				alpha: 0.22,
				seed: rand(0, 10),
			});
		}
		if (s.water) {
			for (let i = 0; i < 70 * dt; i++) drops.push({ x: cx + rand(-0.5, 0.5) * logW, y: -10, vy: rand(380, 480) });
		}
		for (let i = drops.length - 1; i >= 0; i--) {
			const d = drops[i];
			d.y += d.vy * dt;
			if (d.y > gy - 20) {
				drops.splice(i, 1);
				if (s.temp > 100 && Math.random() < 0.6) {
					steam.push({ x: d.x, y: gy - 30, vx: rand(-20, 20), vy: rand(-60, -30), life: 0, max: rand(0.8, 1.4), size: rand(24, 44), alpha: 0.35, seed: rand(0, 9) });
				}
			}
		}
		stepParticles(flames, dt, time, 80, 280);
		// Flammenzungen: Aufsteigende heiße Gase ziehen sich zur Mitte zusammen
		for (const p of flames) p.vx += (cx - p.x) * 2.2 * dt;
		stepParticles(smoke, dt, time, 30, 10);
		stepParticles(steam, dt, time, 40, 20);

		// Glasglocke: Flammen bleiben darunter
		const domeTop = gy - h * 0.62;
		if (s.dome > 0.5) {
			for (const p of flames) if (p.y < domeTop + 30) p.life = p.max;
			for (const p of smoke) if (p.y < domeTop + 20) p.vy = Math.abs(p.vy) * 0.2;
		}

		// --- Zeichnen ---
		ctx.clearRect(0, 0, w, h);
		const bg = ctx.createRadialGradient(cx, gy - 60, 10, cx, gy - 60, w * 0.8);
		bg.addColorStop(0, `rgba(255,120,40,${0.18 * s.intensity})`);
		bg.addColorStop(1, "rgba(0,0,0,0)");
		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = "#15110e";
		ctx.fillRect(0, gy, w, h - gy);

		ctx.globalCompositeOperation = "source-over";
		drawParticles(ctx, smoke, [SMOKE_SPRITE]);
		drawLogs(cx, gy, logW);

		ctx.globalCompositeOperation = "lighter";
		drawParticles(ctx, flames, FLAME_SPRITES);
		ctx.globalCompositeOperation = "source-over";
		drawParticles(ctx, steam, [STEAM_SPRITE]);

		ctx.strokeStyle = "rgba(140,190,255,0.75)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		for (const d of drops) {
			ctx.moveTo(d.x, d.y);
			ctx.lineTo(d.x, d.y - 9);
		}
		ctx.stroke();

		if (s.match > 0) {
			ctx.strokeStyle = "#c9a36b";
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(cx + logW * 0.42, gy - 46);
			ctx.lineTo(cx + logW * 0.62, gy - 10);
			ctx.stroke();
		}

		if (s.dome > 0.02) {
			ctx.globalAlpha = s.dome;
			const dw = logW * 0.75;
			ctx.fillStyle = "rgba(180,210,230,0.07)";
			ctx.strokeStyle = "rgba(200,225,240,0.45)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(cx - dw, gy);
			ctx.lineTo(cx - dw, domeTop + dw * 0.6);
			ctx.quadraticCurveTo(cx - dw, domeTop, cx, domeTop);
			ctx.quadraticCurveTo(cx + dw, domeTop, cx + dw, domeTop + dw * 0.6);
			ctx.lineTo(cx + dw, gy);
			ctx.fill();
			ctx.stroke();
			ctx.globalAlpha = 1;
		}

		drawTriangle(w - 96, h - 64, 30);

		// --- Anzeige ---
		ui.temp.textContent = `${fmt(s.temp)} °C`;
		if (!s.fuel) setNote("Kein Brennstoff: Es gibt nichts mehr, das brennen könnte.");
		else if (s.water) setNote(`Wasser kühlt: Die Wärme-Seite bricht weg (${fmt(s.temp)} °C). Nimm das Wasser weg und schau, ob es von selbst wieder angeht.`);
		else if (!s.oxygen && s.temp >= IGNITION) setNote(`Kein Sauerstoff: Die Flamme erstickt. Die Glut ist noch heiß (${fmt(s.temp)} °C). Schnell wieder Luft, dann zündet sie neu!`);
		else if (!s.oxygen) setNote("Kein Sauerstoff, und jetzt ist auch die Glut abgekühlt.");
		else if (burning) setNote("Es brennt: Alle drei Seiten sind da, und die Flamme hält sich ihre Hitze selbst.");
		else if (s.match > 0) setNote("Das Streichholz heizt das Holz auf …");
		else if (s.everBurned) setNote(`Zu kalt (${fmt(s.temp)} °C). Holz und Luft sind da, aber ohne neuen Funken bleibt es aus.`);
		else setNote("Noch zu kalt. Holz entzündet sich erst bei etwa 300 °C.");
	});
})();

// =====================================================================
// 2 · Kerze mit Thermometer
// =====================================================================
(() => {
	const canvas = document.getElementById("candleCanvas");
	const { ctx, size } = fitCanvas(canvas, 4 / 3);
	const ui = {
		blow: document.getElementById("btnBlow"),
		smoke: document.getElementById("btnSmoke"),
		temp: document.getElementById("candleTemp"),
		note: document.getElementById("candleNote"),
	};
	const s = { state: "burn", t: 0, probe: null, jump: 0 };
	const smoke = [];
	let geo = { fx: 0, base: 0, fh: 0, fw: 0, cx: 0, top: 0, cw: 0 };

	ui.blow.addEventListener("click", () => {
		if (s.state !== "burn") return;
		s.state = "smoke";
		s.t = 0;
		ui.smoke.disabled = false;
		ui.smoke.textContent = "🔥 Streichholz in den Rauch";
		ui.note.textContent = "Ausgepustet. Der weiße Rauch ist noch Wachsdampf. Schnell das Streichholz rein!";
	});
	ui.smoke.addEventListener("click", () => {
		if (s.state === "smoke" && s.t < 5) {
			s.state = "jump";
			s.jump = 0;
			ui.note.textContent = "Die Flamme läuft den Rauch hinunter bis zum Docht.";
		} else {
			s.state = "burn";
			ui.note.textContent = "Wieder angezündet.";
		}
		ui.smoke.disabled = true;
	});

	function setProbe(e) {
		const r = canvas.getBoundingClientRect();
		s.probe = { x: e.clientX - r.left, y: e.clientY - r.top };
	}
	canvas.addEventListener("pointermove", setProbe);
	canvas.addEventListener("pointerdown", setProbe);
	canvas.addEventListener("pointerleave", (e) => {
		if (e.pointerType === "mouse") s.probe = null;
	});
	canvas.style.touchAction = "pan-y";

	// Halbe Breite der Flamme (normiert) auf Höhe v (0 = Docht, 1 = Spitze)
	function radius(v) {
		if (v < 0 || v > 1) return 0;
		return v < 0.3 ? Math.sqrt(v / 0.3) : Math.pow(1 - (v - 0.3) / 0.7, 0.85);
	}

	function measure(x, y) {
		const { fx, base, fh, fw, cx, top, cw } = geo;
		const burning = s.state === "burn";
		const u = (x - fx) / (fw / 2);
		const v = (base - y) / fh;
		const r = radius(v);
		if (burning && r > 0) {
			const d = Math.abs(u) / r;
			if (d < 0.5 && v < 0.5) return [700, "Dunkler Kern: Wachsdampf, aber kaum Sauerstoff"];
			if (d < 0.88) return [lerp(1000, 1250, v), "Leuchtzone: glühender Ruß"];
			if (d < 1.12) return [1400, "Fast unsichtbarer Saum: hier ist es am heißesten"];
		}
		if (Math.abs(x - cx) < cw / 2 && y > top - 4 && y < top + 10) {
			return [burning ? 65 : 45, "Flüssiges Wachs"];
		}
		if (Math.abs(x - cx) < cw / 2 && y >= top + 10) return [24, "Festes Wachs"];
		if (Math.abs(x - fx) < 4 && y > base - 2 && y < top) return [burning ? 450 : 120, "Docht"];
		if (burning && v > 1 && v < 3 && Math.abs(u) < 1.6 + (v - 1)) {
			return [Math.max(80, 650 - (v - 1) * 280 - Math.abs(u) * 60), "Heiße Abgase steigen auf"];
		}
		return [22, "Raumluft"];
	}

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const cx = w / 2;
		const top = h * 0.66;
		const cw = Math.min(w * 0.16, 90);
		const fh = h * 0.3;
		const fw = fh * 0.34;
		const sway = Math.sin(time * 2.1) * 2 + Math.sin(time * 5.3) * 1;
		const base = top - 14;
		geo = { fx: cx + sway * 0.3, base, fh, fw, cx, top, cw };

		s.t += dt;
		if (s.state === "smoke" && s.t > 5 && !ui.smoke.disabled && ui.smoke.textContent.includes("Rauch")) {
			ui.smoke.textContent = "🔥 Anzünden";
			ui.note.textContent = "Zu spät: Der Wachsdampf ist verflogen. Jetzt hilft nur noch normales Anzünden.";
		}
		if (s.state === "jump") {
			s.jump += dt / 0.45;
			if (s.jump >= 1) {
				s.state = "burn";
				ui.note.textContent = "Zurückgesprungen! Der Rauch war Brennstoff.";
			}
		}

		if (s.state === "smoke" || s.state === "jump") {
			const rate = s.state === "smoke" ? clamp(40 * (1 - s.t / 5), 0, 40) : 20;
			for (let i = 0; i < rate * dt; i++) {
				smoke.push({ x: cx, y: base, vx: rand(-3, 3), vy: rand(-55, -40), life: 0, max: rand(2.2, 3), size: rand(10, 18), alpha: 0.5, seed: rand(0, 1) });
			}
		}
		stepParticles(smoke, dt, time, 18, 4);

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		const burning = s.state === "burn";
		if (burning) {
			const halo = ctx.createRadialGradient(cx, base - fh * 0.5, 0, cx, base - fh * 0.5, w * 0.55);
			halo.addColorStop(0, "rgba(255,170,80,0.22)");
			halo.addColorStop(1, "rgba(0,0,0,0)");
			ctx.fillStyle = halo;
			ctx.fillRect(0, 0, w, h);
		}

		// Kerze
		const body = ctx.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0);
		body.addColorStop(0, "#d8cbb5");
		body.addColorStop(0.5, "#f3ead9");
		body.addColorStop(1, "#c6b79e");
		ctx.fillStyle = body;
		ctx.fillRect(cx - cw / 2, top, cw, h - top);
		ctx.fillStyle = burning ? "rgba(255,200,120,0.55)" : "rgba(230,220,200,0.6)";
		ctx.beginPath();
		ctx.ellipse(cx, top, cw / 2, 6, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#1c1410";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.moveTo(cx, top);
		ctx.quadraticCurveTo(cx, base + 4, geo.fx + 1, base);
		ctx.stroke();

		ctx.globalCompositeOperation = "source-over";
		drawParticles(ctx, smoke, [STEAM_SPRITE]);

		if (s.state === "jump") {
			const y = lerp(base - h * 0.45, base, s.jump);
			ctx.globalCompositeOperation = "lighter";
			ctx.drawImage(FLAME_SPRITES[1], cx - 22, y - 22, 44, 44);
			ctx.globalCompositeOperation = "source-over";
		}

		if (burning) drawFlame(geo.fx, base, fw, fh, time);

		if (s.probe) {
			const [t, label] = measure(s.probe.x, s.probe.y);
			const { x, y } = s.probe;
			ctx.strokeStyle = "rgba(255,255,255,0.8)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(x, y, 6, 0, Math.PI * 2);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(x, y - 6);
			ctx.lineTo(x, y - 20);
			ctx.stroke();
			ui.temp.textContent = `${fmt(t)} °C · ${label}`;
		} else {
			ui.temp.textContent = "Zeig auf die Flamme";
		}
	});

	function drawFlame(fx, base, fw, fh, time) {
		const flick = 1 + Math.sin(time * 9) * 0.03 + Math.sin(time * 23) * 0.015;
		const H = fh * flick;
		const path = (scale) => {
			ctx.beginPath();
			const steps = 28;
			for (let i = 0; i <= steps; i++) {
				const v = i / steps;
				const r = radius(v) * (fw / 2) * scale;
				const bend = Math.sin(time * 3 + v * 3) * v * v * 4;
				const x = fx + r + bend;
				const y = base - v * H * scale;
				i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
			}
			for (let i = steps; i >= 0; i--) {
				const v = i / steps;
				const r = radius(v) * (fw / 2) * scale;
				const bend = Math.sin(time * 3 + v * 3) * v * v * 4;
				ctx.lineTo(fx - r + bend, base - v * H * scale);
			}
			ctx.closePath();
		};
		ctx.globalCompositeOperation = "lighter";
		// blauer Saum
		ctx.fillStyle = "rgba(70,110,255,0.35)";
		path(1.12);
		ctx.fill();
		// Leuchtzone
		const g = ctx.createLinearGradient(0, base, 0, base - H);
		g.addColorStop(0, "rgba(255,140,40,0.5)");
		g.addColorStop(0.3, "rgba(255,210,110,0.95)");
		g.addColorStop(0.8, "rgba(255,170,60,0.85)");
		g.addColorStop(1, "rgba(255,110,30,0)");
		ctx.fillStyle = g;
		path(1);
		ctx.fill();
		ctx.fillStyle = "rgba(255,250,220,0.55)";
		path(0.7);
		ctx.fill();
		ctx.globalCompositeOperation = "source-over";
		// dunkler Kern
		ctx.fillStyle = "rgba(90,40,20,0.55)";
		ctx.beginPath();
		ctx.ellipse(fx, base - H * 0.16, fw * 0.17, H * 0.17, 0, 0, Math.PI * 2);
		ctx.fill();
	}
})();

// =====================================================================
// 3 · Bunsenbrenner und Glühfarben
// =====================================================================

// Näherung für die Farbe eines glühenden Körpers (nach Tanner Helland)
function kelvinToRgb(k) {
	const t = k / 100;
	let r, g, b;
	if (t <= 66) {
		r = 255;
		g = 99.47 * Math.log(t) - 161.12;
		b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
	} else {
		r = 329.7 * Math.pow(t - 60, -0.1332);
		g = 288.12 * Math.pow(t - 60, -0.0755);
		b = 255;
	}
	return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
}

(() => {
	const canvas = document.getElementById("burnerCanvas");
	const { ctx, size } = fitCanvas(canvas, 4 / 3);
	const air = document.getElementById("air");
	const airOut = document.getElementById("airOut");
	const readout = document.getElementById("burnerTemp");
	const glow = document.getElementById("glow");
	const glowOut = document.getElementById("glowOut");
	const swatch = document.getElementById("glowSwatch");
	const glowText = document.getElementById("glowText");
	const flames = [];
	const soot = [];
	let a = Number(air.value) / 100;
	let shown = a;

	function updateAir() {
		a = Number(air.value) / 100;
		airOut.textContent = `${air.value} %`;
	}
	air.addEventListener("input", updateAir);
	updateAir();

	const GLOW_STEPS = [
		[550, "Kaum sichtbar: Erst ab etwa 500 °C beginnt Glut zu leuchten."],
		[750, "Dunkelrot: die erste sichtbare Glut."],
		[950, "Kirschrot: Glut im Kaminfeuer."],
		[1150, "Orange: so glüht Ruß in einer Kerzenflamme."],
		[1500, "Gelb: Stahl beim Schmieden."],
		[2100, "Hellgelb bis weiß: flüssiges Eisen."],
		[9999, "Weißglut: der Draht einer Glühbirne (etwa 2500 °C)."],
	];
	function updateGlow() {
		const c = Number(glow.value);
		glowOut.textContent = `${fmt(c)} °C`;
		const [r, g, b] = kelvinToRgb(c + 273);
		const bright = clamp((c - 420) / 900, 0.06, 1);
		const col = `rgb(${Math.round(r * bright)},${Math.round(g * bright)},${Math.round(b * bright)})`;
		swatch.style.background = col;
		swatch.style.color = col;
		glowText.textContent = GLOW_STEPS.find(([max]) => c < max)[1];
	}
	glow.addEventListener("input", updateGlow);
	updateGlow();

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		shown += (a - shown) * dt * 5;
		const cx = w / 2;
		const tubeTop = h * 0.66;
		const tubeW = Math.min(w * 0.07, 34);
		const H = lerp(h * 0.52, h * 0.26, shown);
		const life = lerp(0.95, 0.32, shown);
		const turb = lerp(55, 6, shown);

		const n = lerp(130, 220, shown) * dt;
		for (let i = 0; i < n; i++) {
			const blue = Math.random() < shown * shown * 1.1;
			flames.push({
				x: cx + rand(-0.4, 0.4) * tubeW,
				y: tubeTop - 2,
				vx: rand(-6, 6),
				vy: -(H / life) * rand(0.75, 1.1),
				life: 0,
				max: life * rand(0.6, 1),
				size: lerp(30, 18, shown) * rand(0.8, 1.2),
				alpha: blue ? 0.6 : 0.8,
				seed: rand(0, 10),
				blue,
			});
		}
		if (shown < 0.35) {
			for (let i = 0; i < (0.35 - shown) * 60 * dt; i++) {
				soot.push({ x: cx + rand(-8, 8), y: tubeTop - H, vx: rand(-6, 6), vy: rand(-45, -25), life: 0, max: rand(1.5, 2.5), size: rand(18, 34), alpha: 0.3, seed: rand(0, 9) });
			}
		}
		stepParticles(flames, dt, time, turb, -10);
		stepParticles(soot, dt, time, 20, 6);

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		ctx.globalCompositeOperation = "source-over";
		drawParticles(ctx, soot, [SMOKE_SPRITE]);

		// Brenner
		ctx.fillStyle = "#6d7178";
		ctx.fillRect(cx - tubeW / 2, tubeTop, tubeW, h * 0.26);
		ctx.fillStyle = "#4a4d52";
		ctx.fillRect(cx - tubeW * 1.6, h * 0.92, tubeW * 3.2, h * 0.05);
		const ringY = h * 0.84;
		ctx.fillStyle = "#8c9097";
		ctx.fillRect(cx - tubeW * 0.7, ringY, tubeW * 1.4, 14);
		ctx.fillStyle = "#0b0a09";
		const hole = 2 + shown * 8;
		ctx.fillRect(cx - tubeW * 0.35 - hole / 2, ringY + 7 - hole / 2, hole, hole);
		ctx.fillRect(cx + tubeW * 0.35 - hole / 2, ringY + 7 - hole / 2, hole, hole);
		ctx.strokeStyle = "#5b4636";
		ctx.lineWidth = 6;
		ctx.beginPath();
		ctx.moveTo(cx + tubeW * 1.5, h * 0.94);
		ctx.quadraticCurveTo(w * 0.8, h * 0.97, w, h * 0.9);
		ctx.stroke();

		// Luft-Pfeile ins Ventil
		if (shown > 0.05) {
			ctx.strokeStyle = `rgba(150,200,255,${shown * 0.8})`;
			ctx.lineWidth = 1.5;
			for (const side of [-1, 1]) {
				const off = ((time * 40) % 24) * side;
				ctx.beginPath();
				ctx.moveTo(cx + side * (tubeW * 2.4) - off, ringY + 7);
				ctx.lineTo(cx + side * (tubeW * 0.9), ringY + 7);
				ctx.stroke();
			}
		}

		ctx.globalCompositeOperation = "lighter";
		drawParticles(ctx, flames.filter((p) => !p.blue), FLAME_SPRITES);
		drawParticles(ctx, flames.filter((p) => p.blue), BLUE_SPRITES);

		// innerer Kegel
		if (shown > 0.45) {
			const k = (shown - 0.45) / 0.55;
			const ch = H * 0.36;
			const g = ctx.createLinearGradient(0, tubeTop, 0, tubeTop - ch);
			g.addColorStop(0, `rgba(160,220,255,${0.75 * k})`);
			g.addColorStop(1, `rgba(120,200,255,${0.15 * k})`);
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.moveTo(cx - tubeW * 0.45, tubeTop);
			ctx.quadraticCurveTo(cx - tubeW * 0.2, tubeTop - ch * 0.6, cx, tubeTop - ch);
			ctx.quadraticCurveTo(cx + tubeW * 0.2, tubeTop - ch * 0.6, cx + tubeW * 0.45, tubeTop);
			ctx.fill();
		}
		ctx.globalCompositeOperation = "source-over";

		const temp = lerp(1000, 1500, shown);
		readout.textContent =
			shown < 0.3 ? `≈ ${fmt(temp)} °C · gelb, rußt` : shown < 0.7 ? `≈ ${fmt(temp)} °C · Übergang` : `≈ ${fmt(temp)} °C · blau, rauscht`;
	});
})();

// =====================================================================
// 4 · Molekül-Simulation der Kettenreaktion
// =====================================================================
(() => {
	const canvas = document.getElementById("molCanvas");
	const ui = {
		spark: document.getElementById("btnSpark"),
		mix: document.getElementById("btnMix"),
		ratio: document.getElementById("mix"),
		ratioOut: document.getElementById("mixOut"),
		readout: document.getElementById("molReadout"),
		note: document.getElementById("molNote"),
	};
	// Arten: 0 = CH4, 1 = CH4 mit erstem O2 (Zwischenstufe), 2 = O2, 3 = CO2, 4 = H2O
	const R = 6;
	const THRESHOLD = 165;
	const KICK = 150;
	const THERMAL = 26;
	let mols = [];
	let reactions = 0;
	let recent = 0;
	let flashes = [];
	let phase = "cold";
	let sparkAge = 0;
	let fuelStart = 0;
	// Bei Größenänderung nur in das neue Feld zurückschieben, nicht neu mischen
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 640 ? 1 : 2.1), ({ w, h }) => {
		for (const m of mols) {
			m.x = clamp(m.x, R, w - R);
			m.y = clamp(m.y, R, h - R);
		}
	});

	const glowSprite = makeSprite("255,150,50", 48);

	function gauss() {
		return (Math.random() + Math.random() + Math.random() - 1.5) * 1.4;
	}

	function mixUp() {
		const { w, h } = size;
		if (!w) return;
		const n = Math.round(clamp((w * h) / 1500, 70, 240));
		const share = Number(ui.ratio.value) / 100;
		mols = [];
		for (let i = 0; i < n; i++) {
			mols.push({
				x: rand(R, w - R),
				y: rand(R, h - R),
				vx: gauss() * THERMAL,
				vy: gauss() * THERMAL,
				k: Math.random() < share ? 0 : 2,
				a: rand(0, Math.PI),
			});
		}
		reactions = 0;
		recent = 0;
		phase = "cold";
		fuelStart = mols.filter((m) => m.k === 0).length;
		ui.note.textContent = "Alles kalt. Die Moleküle prallen nur voneinander ab.";
	}

	function spark(x, y) {
		for (const m of mols) {
			const d = Math.hypot(m.x - x, m.y - y);
			if (d < 55) {
				const ang = rand(0, Math.PI * 2);
				const sp = rand(320, 420);
				m.vx = Math.cos(ang) * sp;
				m.vy = Math.sin(ang) * sp;
			}
		}
		flashes.push({ x, y, t: 0 });
		phase = "lit";
		sparkAge = 0;
	}

	ui.spark.addEventListener("click", () => spark(size.w * 0.2, size.h * 0.5));
	ui.mix.addEventListener("click", mixUp);
	ui.ratio.addEventListener("input", () => (ui.ratioOut.textContent = `${ui.ratio.value} %`));
	ui.ratio.addEventListener("change", mixUp);
	canvas.addEventListener("pointerdown", (e) => {
		const r = canvas.getBoundingClientRect();
		spark(e.clientX - r.left, e.clientY - r.top);
	});
	mixUp();

	function react(a, b) {
		const fuel = a.k <= 1 ? a : b;
		const ox = a.k === 2 ? a : b;
		ox.k = 4;
		fuel.k = fuel.k === 0 ? 1 : 3;
		reactions++;
		recent += 1;
		for (const m of [a, b]) {
			const sp = Math.hypot(m.vx, m.vy) || 1;
			const ang = Math.atan2(m.vy, m.vx) + rand(-0.6, 0.6);
			m.vx = Math.cos(ang) * (sp + KICK);
			m.vy = Math.sin(ang) * (sp + KICK);
		}
		flashes.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: 0 });
	}

	function drawMol(m) {
		const { x, y } = m;
		if (m.k === 2) {
			const dx = Math.cos(m.a) * 3.6;
			const dy = Math.sin(m.a) * 3.6;
			ctx.fillStyle = "#5fa8ff";
			ctx.beginPath();
			ctx.arc(x - dx, y - dy, 4, 0, Math.PI * 2);
			ctx.arc(x + dx, y + dy, 4, 0, Math.PI * 2);
			ctx.fill();
			return;
		}
		ctx.fillStyle = m.k <= 1 ? "#ffb04d" : m.k === 3 ? "#8a8a8a" : "#e8f3ff";
		ctx.beginPath();
		ctx.arc(x, y, m.k === 4 ? 4.5 : R, 0, Math.PI * 2);
		ctx.fill();
		if (m.k === 1) {
			ctx.strokeStyle = "#5fa8ff";
			ctx.lineWidth = 2;
			ctx.stroke();
		}
	}

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const sub = 2;
		const h2 = dt / sub;
		for (let s = 0; s < sub; s++) {
			for (const m of mols) {
				m.x += m.vx * h2;
				m.y += m.vy * h2;
				m.a += h2 * 2;
				// Wände: elastisch, aber sie nehmen etwas Wärme mit
				let hit = false;
				if (m.x < R) (m.x = R), (m.vx = Math.abs(m.vx)), (hit = true);
				if (m.x > w - R) (m.x = w - R), (m.vx = -Math.abs(m.vx)), (hit = true);
				if (m.y < R) (m.y = R), (m.vy = Math.abs(m.vy)), (hit = true);
				if (m.y > h - R) (m.y = h - R), (m.vy = -Math.abs(m.vy)), (hit = true);
				if (hit && m.vx * m.vx + m.vy * m.vy > THERMAL * THERMAL * 4) {
					m.vx *= 0.9;
					m.vy *= 0.9;
				}
			}
			for (let i = 0; i < mols.length; i++) {
				const a = mols[i];
				for (let j = i + 1; j < mols.length; j++) {
					const b = mols[j];
					const dx = b.x - a.x;
					const dy = b.y - a.y;
					const d2 = dx * dx + dy * dy;
					if (d2 > 4 * R * R || d2 === 0) continue;
					const d = Math.sqrt(d2);
					const nx = dx / d;
					const ny = dy / d;
					const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
					if (rel <= 0) continue;
					// elastischer Stoß gleicher Massen
					a.vx -= rel * nx;
					a.vy -= rel * ny;
					b.vx += rel * nx;
					b.vy += rel * ny;
					const overlap = 2 * R - d;
					a.x -= nx * overlap * 0.5;
					a.y -= ny * overlap * 0.5;
					b.x += nx * overlap * 0.5;
					b.y += ny * overlap * 0.5;
					const pair = (a.k <= 1 && b.k === 2) || (b.k <= 1 && a.k === 2);
					if (pair && rel > THRESHOLD) react(a, b);
				}
			}
		}

		recent *= Math.exp(-dt * 3);
		sparkAge += dt;
		let e = 0;
		let fuelLeft = 0;
		let oxLeft = 0;
		for (const m of mols) {
			e += m.vx * m.vx + m.vy * m.vy;
			if (m.k <= 1) fuelLeft++;
			if (m.k === 2) oxLeft++;
		}
		const meanSq = e / Math.max(mols.length, 1);
		const temp = 20 + Math.max(0, meanSq - 2 * THERMAL * THERMAL) * 0.045;

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		ctx.globalCompositeOperation = "lighter";
		for (const m of mols) {
			const sp = Math.hypot(m.vx, m.vy);
			if (sp > 110) {
				const g = clamp((sp - 110) / 260, 0, 1);
				ctx.globalAlpha = g * 0.8;
				const s = 18 + g * 22;
				ctx.drawImage(glowSprite, m.x - s / 2, m.y - s / 2, s, s);
			}
		}
		flashes = flashes.filter((f) => (f.t += dt) < 0.35);
		for (const f of flashes) {
			ctx.globalAlpha = 1 - f.t / 0.35;
			ctx.drawImage(FLAME_SPRITES[0], f.x - 20, f.y - 20, 40, 40);
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = "source-over";
		for (const m of mols) drawMol(m);

		ui.readout.textContent = `≈ ${fmt(temp)} °C · ${reactions} Reaktionen`;

		if (phase === "lit" && recent > 0.6) phase = "burning";
		if (phase === "burning" && recent < 0.05) phase = "done";
		if (phase === "lit" && sparkAge > 1.2 && recent < 0.05) phase = "fizzled";

		if (phase === "burning") ui.note.textContent = "Es brennt! Jede Reaktion macht die Nachbarn schneller, und die Welle läuft weiter.";
		else if (phase === "fizzled")
			ui.note.textContent = "Nur ein kurzes Aufflackern: Der Funke war zu klein oder es fehlte ein Partner in der Nähe.";
		else if (phase === "done") {
			if (fuelLeft === 0) ui.note.textContent = "Alles verbrannt. Übrig sind CO₂ und Wasser, und das Gas ist jetzt heiß.";
			else if (oxLeft === 0) ui.note.textContent = "Sauerstoff aufgebraucht, aber es ist noch Gas übrig: Das Gemisch war zu fett.";
			else {
				const burnt = Math.round((1 - fuelLeft / Math.max(fuelStart, 1)) * 100);
				ui.note.textContent =
					burnt >= 90
						? `Fast alles verbrannt (${burnt} %). Übrig sind vor allem CO₂ und Wasser.`
						: `Erloschen, nur ${burnt} % verbrannt: Die Wärme ging an die Wände verloren, bevor sie den nächsten Brennstoff erreichte.`;
			}
		}
	});
})();
