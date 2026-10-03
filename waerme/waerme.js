"use strict";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const nf = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
const HOT = "#ff7a5c";
const COLD = "#5cc8ff";
const INK = "#f4efe6";
const FONT = "'Space Grotesk', sans-serif";

// Farbe zu einer Temperatur in °C
const TSTOPS = [
	[-273, [40, 60, 160]],
	[-50, [70, 140, 255]],
	[0, [140, 210, 255]],
	[25, [230, 230, 220]],
	[60, [255, 190, 110]],
	[100, [255, 130, 80]],
	[300, [255, 70, 50]],
	[600, [255, 220, 120]],
];
function tempRGB(t) {
	for (let i = 1; i < TSTOPS.length; i++) {
		if (t <= TSTOPS[i][0]) {
			const [t0, c0] = TSTOPS[i - 1];
			const [t1, c1] = TSTOPS[i];
			const f = clamp((t - t0) / (t1 - t0), 0, 1);
			return c0.map((c, j) => Math.round(lerp(c, c1[j], f)));
		}
	}
	return TSTOPS[TSTOPS.length - 1][1];
}
const tempCol = (t, a = 1) => {
	const [r, g, b] = tempRGB(t);
	return `rgba(${r},${g},${b},${a})`;
};

// Knopf, der wirkt, solange er gedrückt ist (Maus, Touch, Tastatur)
function holdButton(btn) {
	const st = { on: false };
	const set = (v) => {
		st.on = v;
		btn.classList.toggle("is-on", v);
	};
	btn.addEventListener("pointerdown", (e) => {
		btn.setPointerCapture(e.pointerId);
		set(true);
	});
	for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) btn.addEventListener(ev, () => set(false));
	btn.addEventListener("keydown", (e) => {
		if (e.key === " " || e.key === "Enter") {
			e.preventDefault();
			set(true);
		}
	});
	btn.addEventListener("keyup", () => set(false));
	btn.addEventListener("contextmenu", (e) => e.preventDefault());
	return st;
}

// Rayleigh-verteilte Geschwindigkeit (2D-Gas) mit zufälliger Richtung
function thermalUnit() {
	const s = Math.sqrt(-2 * Math.log(1 - Math.random()));
	const a = Math.random() * Math.PI * 2;
	return [Math.cos(a) * s, Math.sin(a) * s];
}

// =====================================================================
// 1 · Gas-Teilchen und Temperatur
// =====================================================================
(() => {
	const canvas = document.getElementById("gasCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.2));
	const temp = document.getElementById("temp");
	const tempOut = document.getElementById("tempOut");
	const out = document.getElementById("gasOut");
	const note = document.getElementById("gasNote");

	const N = 70;
	const P = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), u: thermalUnit() }));
	const BINS = 14;

	function sync() {
		const T = Number(temp.value);
		const K = T + 273.15;
		tempOut.textContent = `${T} °C`;
		const v = Math.sqrt((8 * 8.314 * K) / (Math.PI * 0.028));
		out.innerHTML = `${nf(K, 0)} Kelvin<br>Ø ${nf(v, 0)} m/s`;
		if (T <= -272) note.textContent = "Absoluter Nullpunkt! Die Teilchen stehen still. Kälter geht es nicht, weil es kein „noch weniger als stillstehen“ gibt.";
		else if (T < -150) note.textContent = "Eisig: Die Teilchen kriechen nur noch. So kalt wird flüssige Luft.";
		else if (T < 50) note.textContent = `Bei ${T} °C fliegen Luftteilchen im Schnitt mit ${nf(v * 3.6, 0)} km/h herum, schneller als ein Verkehrsflugzeug! Sie stoßen nur ständig zusammen und kommen deshalb kaum voran.`;
		else note.textContent = "Heiß: Die Teilchen rasen und prallen viel häufiger und härter gegen die Wände. Das spürst du als Hitze.";
	}
	temp.addEventListener("input", sync);
	sync();

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const T = Number(temp.value);
		const K = T + 273.15;
		const bw = w < 520 ? w - 24 : w * 0.6;
		const bh = w < 520 ? h * 0.55 : h - 40;
		const bx = 12;
		const by = w < 520 ? 34 : 28;
		const scale = Math.sqrt(K / 293) * 0.32; // Anteil der Boxbreite pro Sekunde

		for (const p of P) {
			p.x += p.u[0] * scale * dt;
			p.y += p.u[1] * scale * dt * (bw / bh);
			if (p.x < 0 || p.x > 1) {
				p.x = clamp(p.x, 0, 1);
				p.u[0] *= -1;
				if (Math.random() < 0.3) {
					const n = thermalUnit();
					p.u = [Math.abs(n[0]) * Math.sign(p.u[0]) || 0.1, n[1]];
				}
			}
			if (p.y < 0 || p.y > 1) {
				p.y = clamp(p.y, 0, 1);
				p.u[1] *= -1;
			}
		}

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		// Box mit Wandfarbe nach Temperatur
		ctx.strokeStyle = tempCol(T, 0.8);
		ctx.lineWidth = 3;
		ctx.strokeRect(bx, by, bw, bh);
		const glow = ctx.createRadialGradient(bx + bw / 2, by + bh / 2, 10, bx + bw / 2, by + bh / 2, bw * 0.7);
		glow.addColorStop(0, tempCol(T, 0.08));
		glow.addColorStop(1, "rgba(0,0,0,0)");
		ctx.fillStyle = glow;
		ctx.fillRect(bx, by, bw, bh);

		const r = Math.max(4, Math.min(bw, bh) * 0.018);
		for (const p of P) {
			const sp = Math.hypot(p.u[0], p.u[1]);
			const x = bx + r + p.x * (bw - 2 * r);
			const y = by + r + p.y * (bh - 2 * r);
			if (K > 5) {
				ctx.strokeStyle = tempCol(T, 0.25);
				ctx.lineWidth = r * 0.9;
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(x - p.u[0] * scale * 0.06 * bw, y - p.u[1] * scale * 0.06 * bw);
				ctx.stroke();
			}
			ctx.fillStyle = tempCol(lerp(T - 60, T + 60, clamp(sp / 2.5, 0, 1)));
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fill();
		}

		// Geschwindigkeits-Histogramm
		const hx = w < 520 ? 16 : bx + bw + 24;
		const hy0 = w < 520 ? by + bh + 30 : by + 64;
		const hw = w < 520 ? w - 32 : w - hx - 16;
		const hh = w < 520 ? h - hy0 - 28 : bh * 0.55;
		const counts = new Array(BINS).fill(0);
		const vmax = 3.2 * Math.sqrt(900 / 293);
		for (const p of P) {
			const s = Math.hypot(p.u[0], p.u[1]) * Math.sqrt(K / 293);
			counts[Math.min(BINS - 1, Math.floor((s / vmax) * BINS))]++;
		}
		const cmax = Math.max(8, ...counts);
		ctx.fillStyle = "rgba(244,239,230,0.55)";
		ctx.font = `10px ${FONT}`;
		ctx.textAlign = "left";
		ctx.fillText("Wie viele Teilchen wie schnell sind", hx, hy0 - 10);
		counts.forEach((c, i) => {
			const x = hx + (i / BINS) * hw;
			const bhh = (c / cmax) * hh;
			ctx.fillStyle = tempCol(lerp(-100, 500, i / BINS), 0.85);
			ctx.fillRect(x + 1, hy0 + hh - bhh, hw / BINS - 2, bhh);
		});
		ctx.strokeStyle = "rgba(255,255,255,0.25)";
		ctx.beginPath();
		ctx.moveTo(hx, hy0 + hh);
		ctx.lineTo(hx + hw, hy0 + hh);
		ctx.stroke();
		ctx.fillStyle = "rgba(244,239,230,0.45)";
		ctx.fillText("langsam", hx, hy0 + hh + 14);
		ctx.textAlign = "right";
		ctx.fillText("schnell", hx + hw, hy0 + hh + 14);

		// Thermometer
		if (w >= 520) {
			const tx = hx + hw / 2;
			const ty0 = hy0 + hh + 40;
			const ty1 = h - 30;
			ctx.fillStyle = "rgba(255,255,255,0.08)";
			ctx.beginPath();
			ctx.roundRect(tx - 6, ty0, 12, ty1 - ty0, 6);
			ctx.fill();
			const f = (T + 273) / (600 + 273);
			ctx.fillStyle = tempCol(T);
			ctx.beginPath();
			ctx.roundRect(tx - 4, ty1 - (ty1 - ty0) * f, 8, (ty1 - ty0) * f, 4);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(tx, ty1 + 4, 10, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = INK;
			ctx.font = `bold 13px ${FONT}`;
			ctx.textAlign = "left";
			ctx.fillText(`${T} °C`, tx + 18, ty1 - (ty1 - ty0) * f + 4);
		}
	});
})();

// =====================================================================
// 2 · Eis, Wasser, Dampf mit Heizkurve
// =====================================================================
(() => {
	const canvas = document.getElementById("phaseCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.75 : 2.1));
	const heat = holdButton(document.getElementById("btnHeat"));
	const cool = holdButton(document.getElementById("btnCool"));
	const tag = document.getElementById("phaseTag");
	const out = document.getElementById("phaseOut");
	const note = document.getElementById("phaseNote");

	// kJ pro kg, Start bei −20 °C Eis
	const Q1 = 2.1 * 20;
	const Q2 = Q1 + 334;
	const Q3 = Q2 + 4.19 * 100;
	const Q4 = Q3 + 2257;
	const Q5 = Q4 + 2.0 * 50;
	const RATE = 280; // kJ/s beim Heizen
	let Q = 0;
	let hist = [];

	function T(q) {
		if (q < Q1) return -20 + q / 2.1;
		if (q < Q2) return 0;
		if (q < Q3) return (q - Q2) / 4.19;
		if (q < Q4) return 100;
		return 100 + (q - Q4) / 2.0;
	}
	const fm = () => clamp((Q - Q1) / (Q2 - Q1), 0, 1);
	const fb = () => clamp((Q - Q3) / (Q4 - Q3), 0, 1);
	document.getElementById("btnPhaseReset").addEventListener("click", () => {
		Q = 0;
		hist = [];
	});

	const N = 84;
	const P = Array.from({ length: N }, () => ({ x: 0, y: 0, vx: 0, vy: 0, a: Math.random() * 6, init: false }));

	function describe() {
		const t = T(Q);
		if (Q < Q1) return ["Eis", "Festes Eis: Die Moleküle halten sich an den Händen (Linien) und zittern auf ihrem Platz. Je wärmer, desto heftiger."];
		if (Q < Q2) return ["Eis schmilzt", `Das Eis schmilzt! Die Temperatur bleibt bei 0 °C stehen. Die Energie geht ins Lösen der Bindungen, nicht ins Schnellerwerden. ${Math.round(fm() * 100)} % geschmolzen.`];
		if (Q < Q3) return ["Wasser", `Flüssiges Wasser, ${nf(t, 0)} °C: Die Moleküle gleiten aneinander vorbei, kleben aber noch zusammen.`];
		if (Q < Q4) return ["Wasser kocht", `Das Wasser kocht! Wieder steht die Temperatur, diesmal bei 100 °C, und zwar sehr lange: Verdampfen braucht fast siebenmal so viel Energie wie Schmelzen. ${Math.round(fb() * 100)} % verdampft.`];
		return ["Dampf", "Wasserdampf: Die Moleküle sind frei und fliegen durch den ganzen Raum. Jetzt wird es wieder heißer."];
	}

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const narrow = w < 520;
		if (heat.on) Q = Math.min(Q5, Q + RATE * dt);
		if (cool.on) Q = Math.max(0, Q - RATE * dt);
		if ((heat.on || cool.on) && (hist.length === 0 || Math.abs(hist[hist.length - 1] - Q) > 4)) hist.push(Q);
		const t = T(Q);
		const K = t + 273;
		const [name, txt] = describe();
		tag.textContent = name;
		out.textContent = `${nf(t, 0)} °C`;
		note.textContent = txt;

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		// --- Becher mit Molekülen ---
		const bx0 = 16;
		const bx1 = narrow ? w - 16 : w * 0.42;
		const by0 = 34;
		const by1 = narrow ? h * 0.58 : h - 34;
		const sp = Math.min((bx1 - bx0) / 13, (by1 - by0) / 11);
		ctx.strokeStyle = "rgba(200,230,255,0.4)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(bx0, by0);
		ctx.lineTo(bx0, by1);
		ctx.lineTo(bx1, by1);
		ctx.lineTo(bx1, by0);
		ctx.stroke();
		// Herdplatte
		const plate = heat.on ? HOT : cool.on ? COLD : "#3a332c";
		ctx.fillStyle = plate;
		ctx.shadowColor = plate;
		ctx.shadowBlur = heat.on || cool.on ? 18 : 0;
		ctx.fillRect(bx0 + 10, by1 + 6, bx1 - bx0 - 20, 6);
		ctx.shadowBlur = 0;

		const nGas = Math.round(N * fb());
		const nSolid = Math.round(N * (1 - fm()));
		const cols = 12;
		const lat = (i) => {
			// höhere Indizes liegen unten; der Eisblock schmilzt von oben
			const r = Math.floor((N - 1 - i) / cols);
			const c = (N - 1 - i) % cols;
			const rows = Math.ceil(N / cols);
			return [bx0 + (bx1 - bx0) / 2 + (c - (cols - 1) / 2) * sp + (r % 2 ? sp / 2 : 0) - sp / 4, by1 - sp * 0.7 - (rows - 1 - r) * sp * 0.88];
		};
		const liqCount = N - nGas;
		const liqTop = by1 - Math.ceil(liqCount / (cols + 1)) * sp * 0.9 - sp * 0.4;
		const jig = Math.sqrt(K / 273) * sp * 0.08;
		const vT = Math.sqrt(K / 273);

		P.forEach((p, i) => {
			if (!p.init) {
				[p.x, p.y] = lat(i);
				p.init = true;
			}
			p.state = i < nGas ? "gas" : i >= N - nSolid ? "solid" : "liquid";
			if (p.state === "solid") {
				const [lx, ly] = lat(i);
				p.x = lerp(p.x, lx + Math.sin(time * 23 + i) * jig, 0.3);
				p.y = lerp(p.y, ly + Math.cos(time * 19 + i * 2) * jig, 0.3);
				p.vx = p.vy = 0;
			} else {
				const speed = p.state === "gas" ? 260 * vT : 50 * vT;
				p.vx += (Math.random() - 0.5) * speed * (p.state === "gas" ? 0.6 : 4) * dt * 10;
				p.vy += (Math.random() - 0.5) * speed * (p.state === "gas" ? 0.6 : 4) * dt * 10;
				if (p.state === "liquid") p.vy += 120 * dt;
				const s = Math.hypot(p.vx, p.vy) || 1;
				const k = speed / s;
				p.vx = lerp(p.vx, p.vx * k, 0.2);
				p.vy = lerp(p.vy, p.vy * k, 0.2);
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				const top = p.state === "gas" ? by0 - 30 : liqTop;
				const r = sp * 0.3;
				if (p.x < bx0 + r) (p.x = bx0 + r), (p.vx = Math.abs(p.vx));
				if (p.x > bx1 - r) (p.x = bx1 - r), (p.vx = -Math.abs(p.vx));
				if (p.y > by1 - r) (p.y = by1 - r), (p.vy = -Math.abs(p.vy));
				if (p.y < top) (p.y = top), (p.vy = Math.abs(p.vy));
			}
			p.a += dt * (p.state === "gas" ? 6 : p.state === "liquid" ? 2 : 0.2);
		});

		// Bindungen
		ctx.lineWidth = 2;
		for (let i = 0; i < N; i++) {
			for (let j = i + 1; j < N; j++) {
				const a = P[i];
				const b = P[j];
				if (a.state === "gas" || b.state === "gas") continue;
				const d = Math.hypot(a.x - b.x, a.y - b.y);
				const lim = a.state === "solid" && b.state === "solid" ? sp * 1.1 : sp * 0.95;
				if (d < lim) {
					ctx.strokeStyle = a.state === "solid" && b.state === "solid" ? "rgba(140,210,255,0.45)" : "rgba(140,210,255,0.15)";
					ctx.beginPath();
					ctx.moveTo(a.x, a.y);
					ctx.lineTo(b.x, b.y);
					ctx.stroke();
				}
			}
		}
		// Moleküle: O mit zwei H
		const r = sp * 0.26;
		for (const p of P) {
			ctx.fillStyle = "#e8eef5";
			for (const da of [-0.9, 0.9]) {
				ctx.beginPath();
				ctx.arc(p.x + Math.cos(p.a + da) * r * 1.1, p.y + Math.sin(p.a + da) * r * 1.1, r * 0.55, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.fillStyle = tempCol(lerp(-80, 320, (t + 20) / 170));
			ctx.beginPath();
			ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
			ctx.fill();
		}

		// --- Heizkurve ---
		const gx0 = narrow ? 40 : w * 0.5;
		const gx1 = w - 18;
		const gy0 = narrow ? by1 + 40 : 40;
		const gy1 = h - 30;
		const X = (q) => lerp(gx0, gx1, q / Q5);
		const Y = (tt) => lerp(gy1, gy0, (tt + 20) / 170);
		ctx.strokeStyle = "rgba(255,255,255,0.15)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(gx0, gy0);
		ctx.lineTo(gx0, gy1);
		ctx.lineTo(gx1, gy1);
		ctx.stroke();
		ctx.font = `10px ${FONT}`;
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.textAlign = "right";
		for (const tt of [-20, 0, 50, 100, 150]) {
			ctx.fillText(`${tt} °C`, gx0 - 5, Y(tt) + 3);
			ctx.strokeStyle = "rgba(255,255,255,0.05)";
			ctx.beginPath();
			ctx.moveTo(gx0, Y(tt));
			ctx.lineTo(gx1, Y(tt));
			ctx.stroke();
		}
		ctx.textAlign = "center";
		ctx.fillText("zugeführte Energie →", (gx0 + gx1) / 2, gy1 + 18);
		// Bereiche einfärben
		for (const [a, b, c, lab] of [
			[Q1, Q2, COLD, "schmelzen"],
			[Q3, Q4, HOT, "verdampfen"],
		]) {
			ctx.fillStyle = c === COLD ? "rgba(92,200,255,0.07)" : "rgba(255,122,92,0.07)";
			ctx.fillRect(X(a), gy0, X(b) - X(a), gy1 - gy0);
			ctx.fillStyle = c;
			ctx.fillText(lab, (X(a) + X(b)) / 2, gy0 + 12);
		}
		// volle Kurve blass
		ctx.strokeStyle = "rgba(255,255,255,0.18)";
		ctx.setLineDash([4, 4]);
		ctx.beginPath();
		for (let q = 0; q <= Q5; q += 10) (q ? ctx.lineTo : ctx.moveTo).call(ctx, X(q), Y(T(q)));
		ctx.stroke();
		ctx.setLineDash([]);
		// gelaufene Kurve
		ctx.lineWidth = 3;
		for (let q = 0; q < Q; q += 8) {
			ctx.strokeStyle = tempCol(T(q));
			ctx.beginPath();
			ctx.moveTo(X(q), Y(T(q)));
			ctx.lineTo(X(Math.min(Q, q + 8)), Y(T(Math.min(Q, q + 8))));
			ctx.stroke();
		}
		ctx.fillStyle = INK;
		ctx.beginPath();
		ctx.arc(X(Q), Y(t), 6, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = tempCol(t);
		ctx.beginPath();
		ctx.arc(X(Q), Y(t), 4, 0, Math.PI * 2);
		ctx.fill();
		void hist;
	});
})();

// =====================================================================
// 3 · Wärmeleitung durch einen Stab
// =====================================================================
(() => {
	const canvas = document.getElementById("rodCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.25));
	const chips = document.getElementById("materials");
	const btnFlame = document.getElementById("btnFlame");
	const tag = document.getElementById("rodTag");
	const out = document.getElementById("rodOut");
	const note = document.getElementById("rodNote");

	const MATS = [
		{ name: "Kupfer", a: 1.1e-4, col: [205, 120, 70], txt: "Kupfer ist einer der besten Wärmeleiter. Darum sind gute Kochtöpfe oft aus Kupfer." },
		{ name: "Stahl", a: 1.2e-5, col: [150, 155, 165], txt: "Stahl leitet etwa zehnmal schlechter als Kupfer, aber die Wärme kommt trotzdem an." },
		{ name: "Glas", a: 3.4e-7, col: [170, 210, 220], txt: "Glas leitet kaum. Die Wärme schafft es nur ein kleines Stück, dann verliert sie sich an die Luft." },
		{ name: "Holz", a: 1.5e-7, col: [150, 105, 65], txt: "Holz ist ein Isolator. Darum haben Kochlöffel und Pfannengriffe so oft Holz." },
	];
	const NC = 60;
	const TIME = 400;
	const LEN = 0.3;
	const FLAME = 520;
	let mat = MATS[0];
	let Tc = new Array(NC).fill(20);
	let flame = false;
	let melted = 0;
	let tOn = 0;

	function reset() {
		Tc = new Array(NC).fill(20);
		melted = 0;
		tOn = 0;
	}
	MATS.forEach((m) => {
		const b = document.createElement("button");
		b.type = "button";
		b.className = "btn";
		b.textContent = m.name;
		b.setAttribute("aria-pressed", String(m === mat));
		b.addEventListener("click", () => {
			mat = m;
			reset();
			tag.textContent = m.name;
			[...chips.children].forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
		});
		chips.appendChild(b);
	});
	btnFlame.addEventListener("click", () => {
		flame = !flame;
		btnFlame.setAttribute("aria-pressed", String(flame));
		btnFlame.textContent = flame ? "💨 Kerze aus" : "🕯️ Kerze an";
	});
	document.getElementById("btnRodReset").addEventListener("click", reset);

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const dx = LEN / NC;
		const D = (mat.a * TIME) / (dx * dx);
		const sub = Math.max(1, Math.ceil(dt * D * 2.4));
		const d = dt / sub;
		const loss = 0.05;
		for (let s = 0; s < sub; s++) {
			const nt = Tc.slice();
			for (let i = 0; i < NC; i++) {
				const l = i > 0 ? Tc[i - 1] : Tc[i];
				const r = i < NC - 1 ? Tc[i + 1] : Tc[i];
				nt[i] = Tc[i] + (D * (l - 2 * Tc[i] + r) - loss * (Tc[i] - 20)) * d;
			}
			if (flame) for (let i = 0; i < 5; i++) nt[i] += (FLAME - nt[i]) * Math.min(1, 6 * d);
			Tc = nt;
		}
		if (flame) tOn += dt;
		const tEnd = Tc[NC - 1];
		if (tEnd > 32) melted = Math.min(1, melted + dt * (tEnd - 32) * 0.02);

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		const x0 = w * 0.1;
		const x1 = w * 0.84;
		const ry = h * 0.5;
		const rh = Math.max(12, h * 0.045);
		const cw = (x1 - x0) / NC;

		// Stab, Farbe = Material gemischt mit Glühfarbe
		for (let i = 0; i < NC; i++) {
			const t = Tc[i];
			const f = clamp((t - 30) / 250, 0, 1);
			const [r, g, b] = tempRGB(t);
			const c = mat.col.map((v, j) => Math.round(lerp(v, [r, g, b][j], f)));
			ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
			ctx.fillRect(x0 + i * cw, ry, cw + 0.6, rh);
			if (t > 250) {
				ctx.fillStyle = tempCol(t, clamp((t - 250) / 400, 0, 0.5));
				ctx.fillRect(x0 + i * cw - 2, ry - 4, cw + 4, rh + 8);
			}
		}
		ctx.fillStyle = "rgba(255,255,255,0.2)";
		ctx.fillRect(x0, ry + 2, x1 - x0, 2);

		// Halterung rechts
		ctx.fillStyle = "#2a2622";
		ctx.fillRect(x1 + 4, ry - 6, 10, h * 0.5);

		// Kerze links
		const kx = x0 + cw * 2.5;
		const ky = ry + rh + h * 0.2;
		ctx.fillStyle = "#efe6d4";
		ctx.fillRect(kx - 10, ky, 20, h - ky - 10);
		ctx.strokeStyle = "#222";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(kx, ky);
		ctx.lineTo(kx, ky - 6);
		ctx.stroke();
		if (flame) {
			const fh = ky - 6 - (ry + rh) + Math.sin(time * 20) * 2;
			const g = ctx.createRadialGradient(kx, ky - fh * 0.4, 2, kx, ky - fh * 0.5, fh * 0.7);
			g.addColorStop(0, "rgba(255,255,220,1)");
			g.addColorStop(0.4, "rgba(255,190,80,0.9)");
			g.addColorStop(1, "rgba(255,90,40,0)");
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.ellipse(kx + Math.sin(time * 7) * 1.5, ky - 6 - fh / 2, 9, fh / 2 + 2, 0, 0, Math.PI * 2);
			ctx.fill();
		}

		// Butter am rechten Ende
		const bs = Math.max(20, h * 0.08);
		const bx = x1 - bs - 4;
		const bh = bs * (1 - melted * 0.85);
		ctx.fillStyle = "#ffe58a";
		ctx.beginPath();
		ctx.roundRect(bx + melted * 4, ry - bh, bs - melted * 8, bh, 3 + melted * 6);
		ctx.fill();
		if (melted > 0.02) {
			ctx.fillStyle = "rgba(255,229,138,0.85)";
			ctx.beginPath();
			ctx.ellipse(bx + bs / 2, ry + rh + 2, bs * 0.3 + melted * 10, 3, 0, 0, Math.PI * 2);
			ctx.fill();
			for (let k = 0; k < 3; k++) {
				const yy = ry + rh + ((time * 60 + k * 30) % (h - ry - rh - 20));
				ctx.beginPath();
				ctx.arc(bx + bs * (0.3 + k * 0.2), yy, 2.5, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		ctx.fillStyle = "rgba(244,239,230,0.55)";
		ctx.font = `10px ${FONT}`;
		ctx.textAlign = "center";
		ctx.fillText("Butter", bx + bs / 2, ry - bh - 6);

		// Temperaturkurve entlang des Stabs
		const gy0 = 56;
		const gy1 = ry - 46;
		ctx.strokeStyle = "rgba(255,255,255,0.12)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(x0, gy1);
		ctx.lineTo(x1, gy1);
		ctx.stroke();
		ctx.lineWidth = 2.5;
		for (let i = 0; i < NC - 1; i++) {
			ctx.strokeStyle = tempCol(Tc[i]);
			ctx.beginPath();
			ctx.moveTo(x0 + (i + 0.5) * cw, lerp(gy1, gy0, (Tc[i] - 20) / (FLAME - 20)));
			ctx.lineTo(x0 + (i + 1.5) * cw, lerp(gy1, gy0, (Tc[i + 1] - 20) / (FLAME - 20)));
			ctx.stroke();
		}
		ctx.fillStyle = "rgba(244,239,230,0.45)";
		ctx.textAlign = "left";
		ctx.fillText("Temperatur entlang des Stabs ↓", x0, gy0 - 10);

		out.innerHTML = `Ende: <b>${nf(tEnd, 0)} °C</b>`;
		if (melted >= 1) note.textContent = `Die Butter ist geschmolzen! ${mat.name} hat die Wärme in ${nf(tOn, 1)} Sekunden (im Zeitraffer) über den ganzen Stab geleitet.`;
		else if (melted > 0) note.textContent = "Die Butter fängt an zu schmelzen …";
		else if (flame && tOn > 8 && tEnd < 25) note.textContent = `${mat.txt} Die Butter bleibt fest.`;
		else if (flame) note.textContent = `${mat.txt}`;
		else note.textContent = "Zünde die Kerze an. Die Kurve unten zeigt, wie warm der Stab an jeder Stelle ist.";
	});
})();

// =====================================================================
// 4 · Heißluftballon
// =====================================================================
(() => {
	const canvas = document.getElementById("hotCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.8 : 1.05));
	const burner = holdButton(document.getElementById("btnBurner"));
	const out = document.getElementById("hotOut");
	const note = document.getElementById("hotNote");

	const V = 2800; // m³
	const M = 600; // kg Hülle, Korb, Passagiere
	let Tin = 20;
	let alt = 0;
	let v = 0;
	const inside = [];
	const NMAX = 70;
	for (let i = 0; i < NMAX; i++) inside.push({ x: (Math.random() - 0.5) * 0.9, y: (Math.random() - 0.5) * 0.9, vx: 0, vy: 0, out: false });
	const outside = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random() }));

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const Tout = 20 - 6.5 * (alt / 1000);
		if (burner.on) Tin = Math.min(125, Tin + 22 * dt);
		Tin -= (Tin - Tout) * 0.035 * dt;
		const rhoOut = 1.2 * Math.exp(-alt / 8500) * (293 / (Tout + 273));
		const rhoIn = (rhoOut * (Tout + 273)) / (Tin + 273);
		const netKg = (rhoOut - rhoIn) * V - M;
		const drag = 0.5 * rhoOut * 0.5 * 200 * v * Math.abs(v);
		let a = (netKg * 9.81 - drag) / (M + rhoIn * V);
		if (alt <= 0 && a < 0) {
			a = 0;
			v = Math.max(0, v);
			alt = 0;
		}
		v += a * dt;
		alt = Math.max(0, alt + v * dt * 3);
		if (alt === 0 && v < 0) v = 0;

		// Himmel
		const hi = clamp(alt / 3000, 0, 1);
		const sky = ctx.createLinearGradient(0, 0, 0, h);
		sky.addColorStop(0, `rgb(${Math.round(lerp(255, 30, hi))},${Math.round(lerp(170, 60, hi))},${Math.round(lerp(110, 130, hi))})`);
		sky.addColorStop(1, `rgb(${Math.round(lerp(255, 120, hi))},${Math.round(lerp(220, 170, hi))},${Math.round(lerp(170, 220, hi))})`);
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, w, h);

		// Boden (sinkt beim Steigen weg)
		const groundY = h - 20 + alt * 0.4;
		if (groundY < h) {
			ctx.fillStyle = "#3a5a2a";
			ctx.beginPath();
			ctx.moveTo(0, groundY);
			for (let x = 0; x <= w; x += 30) ctx.lineTo(x, groundY - 10 - Math.sin(x * 0.02) * 8);
			ctx.lineTo(w, h);
			ctx.lineTo(0, h);
			ctx.fill();
		}

		// Luftteilchen draußen (kühl)
		for (const p of outside) {
			p.x = (p.x + (Math.random() - 0.5) * 0.004 + 1) % 1;
			p.y = (p.y + (Math.random() - 0.5) * 0.004 + 0.0005 * v + 1) % 1;
			ctx.fillStyle = tempCol(Tout, 0.5);
			ctx.beginPath();
			ctx.arc(p.x * w, p.y * h, 2.2, 0, Math.PI * 2);
			ctx.fill();
		}

		// Ballon bleibt in der Bildmitte, steigt nur am Anfang sichtbar
		const cx = w / 2;
		const cy = h * 0.36 + Math.max(0, h * 0.22 - alt * 0.4) - Math.sin(time) * 2;
		const R = Math.min(w * 0.3, h * 0.27);
		// Hülle
		const env = () => {
			ctx.beginPath();
			ctx.moveTo(cx - R * 0.28, cy + R * 1.05);
			ctx.bezierCurveTo(cx - R * 1.25, cy + R * 0.35, cx - R * 1.15, cy - R * 1.05, cx, cy - R * 1.05);
			ctx.bezierCurveTo(cx + R * 1.15, cy - R * 1.05, cx + R * 1.25, cy + R * 0.35, cx + R * 0.28, cy + R * 1.05);
			ctx.closePath();
		};
		ctx.save();
		env();
		ctx.clip();
		for (let i = -5; i <= 5; i++) {
			ctx.fillStyle = i % 2 ? "#e0453a" : "#ffcf5a";
			ctx.beginPath();
			ctx.ellipse(cx, cy, Math.abs(i) * R * 0.22 + R * 0.11, R * 1.2, 0, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = "rgba(10,8,8,0.62)";
		ctx.fillRect(cx - R * 1.3, cy - R * 1.2, R * 2.6, R * 2.4);
		ctx.restore();
		ctx.strokeStyle = "rgba(255,207,90,0.8)";
		ctx.lineWidth = 2;
		env();
		ctx.stroke();

		// Teilchen innen: Anzahl ~ Dichte, Tempo ~ Temperatur
		const want = Math.round(NMAX * (rhoIn / (1.2 * Math.exp(-alt / 8500) * (293 / (Tout + 273)))) * 0.98);
		let have = inside.filter((p) => !p.out).length;
		for (const p of inside) {
			if (have > want && !p.out && p.y > 0.25) {
				p.out = true;
				have--;
			} else if (have < want && p.out) {
				p.out = false;
				p.x = (Math.random() - 0.5) * 0.3;
				p.y = 1.1;
				have++;
			}
		}
		const sp = 0.25 * Math.sqrt((Tin + 273) / 293);
		for (const p of inside) {
			if (p.out) {
				p.vy = Math.abs(p.vy) + 0.3 * dt;
				p.y += p.vy * dt * 2;
				p.x += p.vx * dt * 0.3;
			} else {
				const n = thermalUnit();
				p.vx = lerp(p.vx, n[0] * sp, 0.15);
				p.vy = lerp(p.vy, n[1] * sp, 0.15);
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				const rr = Math.hypot(p.x, p.y * 0.95);
				if (rr > 0.82) {
					p.x *= 0.82 / rr;
					p.y *= 0.82 / rr;
					p.vx *= -1;
					p.vy *= -1;
				}
			}
			if (p.out && p.y > 3) continue;
			ctx.fillStyle = tempCol(Tin);
			ctx.beginPath();
			ctx.arc(cx + p.x * R, cy + p.y * R, 3, 0, Math.PI * 2);
			ctx.fill();
		}

		// Seile, Korb, Brenner
		const ky = cy + R * 1.35;
		ctx.strokeStyle = "rgba(60,40,30,0.9)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(cx - R * 0.28, cy + R * 1.05);
		ctx.lineTo(cx - R * 0.17, ky);
		ctx.moveTo(cx + R * 0.28, cy + R * 1.05);
		ctx.lineTo(cx + R * 0.17, ky);
		ctx.stroke();
		ctx.fillStyle = "#8a5a2a";
		ctx.fillRect(cx - R * 0.2, ky, R * 0.4, R * 0.25);
		ctx.strokeStyle = "#5a3a1a";
		ctx.strokeRect(cx - R * 0.2, ky, R * 0.4, R * 0.25);
		if (burner.on) {
			const fh = R * 0.3 + Math.sin(time * 30) * 4;
			const g = ctx.createLinearGradient(0, ky, 0, ky - fh);
			g.addColorStop(0, "rgba(120,170,255,0.95)");
			g.addColorStop(0.4, "rgba(255,200,80,0.95)");
			g.addColorStop(1, "rgba(255,90,40,0)");
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.moveTo(cx - 6, ky);
			ctx.quadraticCurveTo(cx, ky - fh * 1.2, cx + 6, ky);
			ctx.fill();
		}

		out.innerHTML = `${nf(alt, 0)} m hoch<br>innen <b>${nf(Tin, 0)} °C</b> · außen ${nf(Tout, 0)} °C`;
		note.textContent =
			netKg > 0
				? `Die heiße Luft im Ballon ist ${nf((1 - rhoIn / rhoOut) * 100, 0)} % leichter als die Luft draußen. Der Auftrieb ist ${nf(netKg, 0)} kg größer als das Gewicht von Hülle, Korb und Passagieren: Der Ballon steigt!`
				: Tin > 25
					? `Die Luft innen ist warm, aber noch nicht leicht genug. Es fehlen ${nf(-netKg, 0)} kg Auftrieb. ${burner.on ? "Weiter heizen!" : "Der Ballon sinkt."}`
					: "Innen und außen gleich warm: Gleich viele Teilchen, gleich schwer, kein Auftrieb. Halte den Brenner gedrückt!";
	});
})();

// =====================================================================
// 5 · Badewasser mischen
// =====================================================================
(() => {
	const canvas = document.getElementById("tubCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 2.2));
	const hot = holdButton(document.getElementById("btnHot"));
	const cold = holdButton(document.getElementById("btnCold"));
	const out = document.getElementById("tubOut");
	const note = document.getElementById("tubNote");

	const TH = 60;
	const TC = 12;
	const waterCol = (t, a) => {
		const f = clamp((t - TC) / (TH - TC), 0, 1);
		return `rgba(${Math.round(lerp(70, 255, f))},${Math.round(lerp(170, 110, f))},${Math.round(lerp(255, 80, f))},${a})`;
	};
	const FULL = 150;
	const MAX = 200;
	const RATE = 12; // Liter pro Sekunde
	let Vh = 0;
	let Vc = 0;
	let drain = false;
	let won = false;
	let dots = [];

	document.getElementById("btnDrain").addEventListener("click", () => {
		drain = true;
		won = false;
	});

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		if (hot.on) Vh += RATE * dt;
		if (cold.on) Vc += RATE * dt;
		if (hot.on || cold.on) drain = false;
		let V = Vh + Vc;
		if (drain && V > 0) {
			const f = Math.max(0, V - 40 * dt) / V;
			Vh *= f;
			Vc *= f;
			V = Vh + Vc;
			if (V < 0.5) {
				Vh = Vc = 0;
				drain = false;
				dots = [];
			}
		}
		if (V > MAX) {
			const f = MAX / V;
			Vh *= f;
			Vc *= f;
			V = MAX;
		}
		const T = V > 0 ? (Vh * TH + Vc * TC) / V : null;

		ctx.fillStyle = "#0b0d10";
		ctx.fillRect(0, 0, w, h);
		// Fliesen
		ctx.strokeStyle = "rgba(255,255,255,0.04)";
		for (let x = 0; x < w; x += 28) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
			ctx.stroke();
		}
		for (let y = 0; y < h; y += 28) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(w, y);
			ctx.stroke();
		}

		const tx0 = w * 0.12;
		const tx1 = w * 0.76;
		const ty0 = h * 0.32;
		const ty1 = h - 22;
		const lvl = (vol) => lerp(ty1 - 6, ty0 + 10, vol / MAX);

		// Wasser
		if (V > 0) {
			const wy = lvl(V);
			const g = ctx.createLinearGradient(0, wy, 0, ty1);
			g.addColorStop(0, waterCol(T, 0.75));
			g.addColorStop(1, waterCol(T, 0.45));
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.moveTo(tx0 + 8, wy);
			for (let x = tx0 + 8; x <= tx1 - 8; x += 6) ctx.lineTo(x, wy + Math.sin(x * 0.06 + time * 3) * 1.5);
			ctx.lineTo(tx1 - 8, ty1 - 6);
			ctx.lineTo(tx0 + 8, ty1 - 6);
			ctx.fill();
			// Ente
			ctx.font = "26px serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "bottom";
			ctx.fillText("🦆", lerp(tx0, tx1, 0.65) + Math.sin(time * 0.7) * 20, wy + 8 + Math.sin(time * 2) * 2);
			ctx.textBaseline = "alphabetic";
			// Dampf bei heißem Wasser
			if (T > 42) {
				for (let i = 0; i < 5; i++) {
					const sx = lerp(tx0 + 30, tx1 - 30, i / 4);
					const sy = wy - 10 - ((time * 20 + i * 13) % 40);
					ctx.strokeStyle = `rgba(255,255,255,${0.12 * clamp((T - 42) / 15, 0, 1)})`;
					ctx.lineWidth = 3;
					ctx.beginPath();
					ctx.moveTo(sx, sy + 10);
					ctx.quadraticCurveTo(sx + 6, sy + 5, sx, sy);
					ctx.stroke();
				}
			}
		}
		// Teilchen, die sich angleichen
		for (const d of dots) {
			d.t = lerp(d.t, T ?? d.t, Math.min(1, dt * 0.9));
			d.x += (Math.random() - 0.5) * 30 * dt;
			d.y += (Math.random() - 0.5) * 30 * dt;
			d.x = clamp(d.x, tx0 + 14, tx1 - 14);
			d.y = clamp(d.y, lvl(V) + 6, ty1 - 10);
			ctx.fillStyle = waterCol(d.t, 0.95);
			ctx.beginPath();
			ctx.arc(d.x, d.y, 3, 0, Math.PI * 2);
			ctx.fill();
		}
		const want = Math.round(V * 0.5);
		while (dots.length > want) dots.shift();

		// Wanne
		ctx.strokeStyle = "#e8eef5";
		ctx.lineWidth = 6;
		ctx.lineJoin = "round";
		ctx.beginPath();
		ctx.moveTo(tx0, ty0);
		ctx.lineTo(tx0 + 8, ty1 - 6);
		ctx.quadraticCurveTo(tx0 + 10, ty1, tx0 + 30, ty1);
		ctx.lineTo(tx1 - 30, ty1);
		ctx.quadraticCurveTo(tx1 - 10, ty1, tx1 - 8, ty1 - 6);
		ctx.lineTo(tx1, ty0);
		ctx.stroke();
		// Füllstrich
		const fy = lvl(FULL);
		ctx.setLineDash([6, 5]);
		ctx.strokeStyle = "rgba(123,220,154,0.8)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(tx0 + 6, fy);
		ctx.lineTo(tx1 - 6, fy);
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.fillStyle = "#7bdc9a";
		ctx.font = `11px ${FONT}`;
		ctx.textAlign = "left";
		ctx.fillText(`${FULL} Liter`, tx1 + 6, fy + 4);

		// Wasserhähne
		const taps = [
			[tx0 + (tx1 - tx0) * 0.18, HOT, hot.on, TH],
			[tx0 + (tx1 - tx0) * 0.32, COLD, cold.on, TC],
		];
		for (const [x, col, on, tt] of taps) {
			ctx.fillStyle = "#9aa0a8";
			ctx.fillRect(x - 4, ty0 - 70, 8, 34);
			ctx.fillRect(x - 4, ty0 - 70, 26, 8);
			ctx.fillStyle = col;
			ctx.beginPath();
			ctx.arc(x, ty0 - 74, 8, 0, Math.PI * 2);
			ctx.fill();
			if (on) {
				ctx.fillStyle = waterCol(tt, 0.7);
				ctx.fillRect(x + 16, ty0 - 62, 5, lvl(V) - (ty0 - 62));
				if (Math.random() < 0.7) dots.push({ x: x + 18 + (Math.random() - 0.5) * 20, y: lvl(V) + 8 + Math.random() * 10, t: tt });
			}
		}

		// Thermometer
		const thx = w * 0.88;
		const th0 = h * 0.12;
		const th1 = h - 40;
		const Y = (t) => lerp(th1, th0, (t - 10) / 55);
		ctx.fillStyle = "rgba(255,255,255,0.08)";
		ctx.beginPath();
		ctx.roundRect(thx - 7, th0, 14, th1 - th0, 7);
		ctx.fill();
		ctx.fillStyle = "rgba(123,220,154,0.25)";
		ctx.fillRect(thx - 18, Y(37.5), 36, Y(36.5) - Y(37.5));
		ctx.fillStyle = "#7bdc9a";
		ctx.font = `11px ${FONT}`;
		ctx.textAlign = "left";
		ctx.fillText("37 °C", thx + 20, Y(37) + 4);
		if (T !== null) {
			ctx.fillStyle = waterCol(T, 1);
			ctx.beginPath();
			ctx.roundRect(thx - 4, Y(T), 8, th1 - Y(T), 4);
			ctx.fill();
		}
		ctx.beginPath();
		ctx.fillStyle = T !== null ? waterCol(T, 1) : "rgba(255,255,255,0.2)";
		ctx.arc(thx, th1 + 8, 11, 0, Math.PI * 2);
		ctx.fill();

		out.innerHTML = T === null ? "leer" : `<b>${nf(T, 1)} °C</b> · ${nf(V, 0)} Liter`;
		const ok = T !== null && Math.abs(T - 37) <= 0.5 && V >= FULL - 6 && V <= FULL + 12;
		if (ok && !won && !hot.on && !cold.on) won = true;
		if (won) note.textContent = `Perfekt! 🛁 ${nf(Vh, 0)} Liter heiß und ${nf(Vc, 0)} Liter kalt ergeben ${nf(T, 1)} °C. Ab in die Wanne!`;
		else if (T === null) note.textContent = "Tipp: Rechne vorher! Wie viel heißes und wie viel kaltes Wasser brauchst du ungefähr?";
		else if (V > FULL + 12) note.textContent = "Zu voll! Zieh den Stöpsel und versuch es nochmal.";
		else
			note.textContent = `(${nf(Vh, 0)} L × 60 °C + ${nf(Vc, 0)} L × 12 °C) ÷ ${nf(V, 0)} L = ${nf(T, 1)} °C. ${T > 37.5 ? "Zu heiß, mehr kaltes Wasser!" : T < 36.5 ? "Zu kalt, mehr heißes Wasser!" : "Temperatur passt!"}${V < FULL - 6 ? " Die Wanne ist noch nicht voll." : ""}`;
		if (won && (hot.on || cold.on)) won = false;
	});
})();
