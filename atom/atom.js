"use strict";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const nf = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
const LIME = "#d4ff3a";
const MINT = "#39ffb0";
const PROTON = "#ff5a5a";
const NEUTRON = "#b8bcc6";
const ELECTRON = "#5ab0ff";
const INK = "#f4efe6";
const FONT = "'Space Grotesk', sans-serif";

const pointerAt = (canvas, e) => {
	const r = canvas.getBoundingClientRect();
	return [e.clientX - r.left, e.clientY - r.top];
};

// Kugel mit Glanzlicht
function ball(ctx, x, y, r, col) {
	const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
	g.addColorStop(0, "#ffffff");
	g.addColorStop(0.3, col);
	g.addColorStop(1, "rgba(0,0,0,0.6)");
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
}

// Kern aus Protonen und Neutronen, dicht gepackt (Sonnenblumen-Spirale)
function nucleus(ctx, cx, cy, Z, N, r, jitter = 0, t = 0) {
	const n = Z + N;
	const list = [];
	// Protonen und Neutronen gleichmäßig mischen
	let p = 0;
	for (let i = 0; i < n; i++) {
		const wantP = Math.round(((i + 1) * Z) / n);
		list.push(wantP > p ? (p++, "p") : "n");
	}
	const pts = list.map((k, i) => {
		const rr = Math.sqrt(i) * r * 0.95;
		const a = i * 2.39996;
		return [cx + Math.cos(a) * rr + Math.sin(t * 40 + i) * jitter, cy + Math.sin(a) * rr + Math.cos(t * 37 + i * 2) * jitter, k];
	});
	pts.reverse().forEach(([x, y, k]) => ball(ctx, x, y, r, k === "p" ? PROTON : NEUTRON));
	return Math.sqrt(n) * r * 0.95 + r;
}

let audioCtx = null;
function getAudio() {
	if (!audioCtx) {
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return null;
		audioCtx = new AC();
	}
	if (audioCtx.state === "suspended") audioCtx.resume();
	return audioCtx;
}
let clickBuf = null;
function geigerClick() {
	const ac = getAudio();
	if (!ac) return;
	if (!clickBuf) {
		clickBuf = ac.createBuffer(1, Math.round(ac.sampleRate * 0.004), ac.sampleRate);
		const d = clickBuf.getChannelData(0);
		for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
	}
	const src = ac.createBufferSource();
	src.buffer = clickBuf;
	const g = ac.createGain();
	g.gain.value = 0.5;
	src.connect(g).connect(ac.destination);
	src.start();
}

// =====================================================================
// 1 · Zoom von der Hand bis in den Kern
// =====================================================================
(() => {
	const canvas = document.getElementById("zoomCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.15));
	const zoom = document.getElementById("zoomRange");
	const lvl = document.getElementById("zoomLvl");
	const tag = document.getElementById("zoomTag");
	const out = document.getElementById("zoomOut");
	const note = document.getElementById("zoomNote");
	const btn = document.getElementById("btnZoom");

	const W0 = 0.3; // Bildbreite am Anfang in Metern
	const DEC = 13.9;
	let auto = 0;

	btn.addEventListener("click", () => {
		if (auto) {
			auto = 0;
			btn.textContent = "🔍 Reinzoomen";
			return;
		}
		if (Number(zoom.value) >= 1000) zoom.value = 0;
		auto = 1;
		btn.textContent = "⏸ Anhalten";
	});

	const fmtLen = (m) => {
		const U = [
			[1, "m"],
			[1e-2, "cm"],
			[1e-3, "mm"],
			[1e-6, "µm"],
			[1e-9, "nm"],
			[1e-12, "pm"],
			[1e-15, "fm"],
		];
		for (const [f, u] of U) if (m >= f * 0.999) return `${nf(m / f, m / f < 10 ? 1 : 0)} ${u}`;
		return `${nf(m / 1e-15, 2)} fm`;
	};
	const fade = (px, a, b) => clamp((px - a) / a, 0, 1) * clamp((b - px) / (b * 0.5), 0, 1);

	const STAGES = [
		[0.15, "Hand", "Deine Hand, etwa 15 cm groß. Ab jetzt wird jeder Schritt zehnmal kleiner."],
		[0.004, "Fingerabdruck", "Die Rillen deines Fingerabdrucks, je etwa einen halben Millimeter breit."],
		[3e-5, "Hautzellen", "Hautzellen! Jede ist etwa 30 Mikrometer groß, du hast rund 30 Billionen Zellen im Körper."],
		[6e-6, "Zellkern", "Der Zellkern. In ihm liegt deine Erbsubstanz, die DNA, zusammengeknäult zu zwei Metern Faden."],
		[2e-8, "DNA", "Die DNA-Doppelhelix, nur 2 Nanometer dick. Jede Sprosse ist ein Buchstabe deines Bauplans."],
		[3e-10, "Atom", "Ein einzelnes Kohlenstoffatom, 0,15 Nanometer. Siehst du die Elektronenwolke? Das Atom ist fast leer, der Kern ist noch winzig."],
		[2e-14, "Atomkern", "Endstation: Der Atomkern, 100 000-mal kleiner als das Atom. Hier stecken 99,97 % der Masse. 6 Protonen (rot) und 6 Neutronen (grau)."],
	];

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		if (auto) {
			zoom.value = Math.min(1000, Number(zoom.value) + dt * 70);
			zoom.dispatchEvent(new Event("input"));
			if (Number(zoom.value) >= 1000) {
				auto = 0;
				btn.textContent = "🔍 Nochmal";
			}
		}
		const z = Number(zoom.value) / 1000;
		const Wm = W0 * Math.pow(10, -z * DEC);
		const px = (m) => (m / Wm) * w;
		const cx = w / 2;
		const cy = h / 2;
		lvl.textContent = `${nf(Math.pow(10, z * DEC), 0)}×`;
		out.textContent = `Bildbreite ${fmtLen(Wm)}`;
		const st = STAGES.reduce((best, s) => (Math.abs(Math.log10(s[0] / Wm)) < Math.abs(Math.log10(best[0] / Wm)) ? s : best));
		tag.textContent = st[1];
		note.textContent = st[2];

		// Hintergrund: Haut → Zelle → Leere
		const skin = clamp((px(0.15) - w * 1.2) / w, 0, 1) * (1 - clamp((px(3e-5) - w * 0.5) / w, 0, 1));
		const cellBg = clamp((px(3e-5) - w * 0.5) / w, 0, 1) * (1 - clamp((px(2e-9) - w * 0.3) / w, 0, 1));
		ctx.fillStyle = "#060508";
		ctx.fillRect(0, 0, w, h);
		if (skin > 0) {
			ctx.fillStyle = `rgba(214,160,130,${skin})`;
			ctx.fillRect(0, 0, w, h);
		}
		if (cellBg > 0) {
			ctx.fillStyle = `rgba(90,40,70,${cellBg})`;
			ctx.fillRect(0, 0, w, h);
		}

		// Hand
		const hp = px(0.15);
		const ha = fade(hp, 4, w * 2.2);
		if (ha > 0 && hp < w * 3) {
			ctx.globalAlpha = ha;
			ctx.font = `${hp}px serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("✋", cx, cy + hp * 0.05);
			ctx.textBaseline = "alphabetic";
			ctx.globalAlpha = 1;
		}

		// Fingerabdruck-Rillen
		const rp = px(5e-4);
		const ra = fade(rp, 3, w * 0.6) * skin;
		if (ra > 0.01) {
			ctx.strokeStyle = `rgba(140,80,60,${ra * 0.8})`;
			ctx.lineWidth = Math.max(1, rp * 0.35);
			const n = Math.min(80, Math.ceil(Math.hypot(w, h) / rp));
			for (let i = 1; i < n; i++) {
				ctx.beginPath();
				ctx.ellipse(cx + rp * 3, cy + rp * 5, i * rp, i * rp * 1.3, 0.3, 0, Math.PI * 2);
				ctx.stroke();
			}
		}

		// Zellen als Waben
		const cp = px(3e-5);
		const ca = fade(cp, 5, w * 3);
		if (ca > 0.01 && cp > 5) {
			const rr = cp / 2;
			const cols = Math.ceil(w / (rr * 1.75)) + 2;
			const rows = Math.ceil(h / (rr * 1.5)) + 2;
			if (cols * rows < 4000) {
				for (let r = -Math.ceil(rows / 2); r <= Math.ceil(rows / 2); r++) {
					for (let c = -Math.ceil(cols / 2); c <= Math.ceil(cols / 2); c++) {
						const x = cx + c * rr * 1.75 + (r % 2 ? rr * 0.875 : 0);
						const y = cy + r * rr * 1.5;
						if (x < -rr || x > w + rr || y < -rr || y > h + rr) continue;
						ctx.fillStyle = `rgba(240,170,170,${ca * 0.35})`;
						ctx.strokeStyle = `rgba(255,210,200,${ca * 0.6})`;
						ctx.lineWidth = Math.max(1, rr * 0.04);
						ctx.beginPath();
						for (let k = 0; k < 6; k++) {
							const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
							const xx = x + Math.cos(a) * rr * 0.98;
							const yy = y + Math.sin(a) * rr * 0.98;
							k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
						}
						ctx.closePath();
						ctx.fill();
						ctx.stroke();
						// Zellkern
						ctx.fillStyle = `rgba(150,70,170,${ca * 0.8})`;
						ctx.beginPath();
						ctx.arc(x + rr * 0.1, y - rr * 0.05, rr * 0.22, 0, Math.PI * 2);
						ctx.fill();
					}
				}
			}
		}

		// DNA-Knäuel im Zellkern und dann die Doppelhelix
		const kp = px(6e-6);
		const dp = px(2e-9);
		const ka = fade(kp, 30, w * 40);
		if (ka > 0.01 && dp < w) {
			ctx.strokeStyle = `rgba(230,180,255,${ka * 0.5})`;
			ctx.lineWidth = Math.max(1, dp * 4);
			const s = Math.min(kp, w * 3) / 2;
			ctx.beginPath();
			for (let i = 0; i < 260; i++) {
				const a = i * 0.37;
				const x = cx + Math.sin(a * 1.3) * s * 0.4 + Math.sin(a * 0.31) * s * 0.3;
				const y = cy + Math.cos(a * 1.1) * s * 0.4 + Math.cos(a * 0.23) * s * 0.3;
				i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
			}
			ctx.stroke();
		}
		const da = fade(dp, 6, w * 1.6);
		if (da > 0.01) {
			const amp = dp / 2;
			const pitch = px(3.4e-9);
			const ph = (x) => ((x - cx) / pitch) * Math.PI * 2 + time * 0.3;
			// Sprossen (Basenpaare)
			const step = pitch / 10;
			const off = (((cx - time * 0.3 * pitch / (Math.PI * 2)) % step) + step) % step;
			ctx.lineWidth = Math.max(1.5, step * 0.35);
			ctx.lineCap = "round";
			const BASES = ["#ffd166", "#7bdc9a", "#ff8a5a", "#b78bff"];
			let bi = Math.floor((cx - off) / step);
			for (let x = off - step; x < w + step; x += step, bi++) {
				const y1 = cy + Math.sin(ph(x)) * amp;
				const y2 = cy - Math.sin(ph(x)) * amp;
				ctx.strokeStyle = BASES[((bi % 4) + 4) % 4];
				ctx.globalAlpha = da * 0.85;
				ctx.beginPath();
				ctx.moveTo(x, y1);
				ctx.lineTo(x, (y1 + y2) / 2);
				ctx.stroke();
				ctx.strokeStyle = BASES[((bi + 2) % 4 + 4) % 4];
				ctx.beginPath();
				ctx.moveTo(x, (y1 + y2) / 2);
				ctx.lineTo(x, y2);
				ctx.stroke();
			}
			// zwei Stränge
			ctx.lineWidth = Math.max(2, amp * 0.22);
			for (const [sg, col] of [
				[1, "#5ab0ff"],
				[-1, "#ff7aa8"],
			]) {
				ctx.strokeStyle = col;
				ctx.globalAlpha = da;
				ctx.beginPath();
				for (let x = -4; x <= w + 4; x += 3) {
					const y = cy + sg * Math.sin(ph(x)) * amp;
					x === -4 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
				}
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
			ctx.lineCap = "butt";
		}

		// Atom mit Elektronenwolke
		const ap = px(1.5e-10);
		const aa = fade(ap, 6, w * 40);
		if (aa > 0.01) {
			const R = ap / 2;
			if (R < w * 4) {
				const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.2);
				g.addColorStop(0, `rgba(90,176,255,${aa * 0.55})`);
				g.addColorStop(0.5, `rgba(90,176,255,${aa * 0.25})`);
				g.addColorStop(1, "rgba(90,176,255,0)");
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(cx, cy, R * 1.2, 0, Math.PI * 2);
				ctx.fill();
				for (let i = 0; i < 6; i++) {
					const a = time * (0.8 + i * 0.13) + i * 1.7;
					const rr = R * (i < 2 ? 0.35 : 0.8);
					ctx.fillStyle = `rgba(160,210,255,${aa})`;
					ctx.beginPath();
					ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a * 1.3) * rr * 0.8, Math.max(2, R * 0.03), 0, Math.PI * 2);
					ctx.fill();
				}
			}
			// Kern als Punkt, bis man ihn sieht
			const np = px(5e-15);
			if (np < 6) {
				ctx.fillStyle = `rgba(255,120,100,${aa})`;
				ctx.beginPath();
				ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
				ctx.fill();
				if (ap > w * 0.6) {
					ctx.strokeStyle = "rgba(255,120,100,0.6)";
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.arc(cx, cy, 10, 0, Math.PI * 2);
					ctx.stroke();
					ctx.fillStyle = "rgba(255,160,140,0.85)";
					ctx.font = `11px ${FONT}`;
					ctx.textAlign = "left";
					ctx.fillText("← hier ist der Kern", cx + 14, cy + 4);
				}
			} else {
				nucleus(ctx, cx, cy, 6, 6, np / 7.5, np * 0.01, time);
			}
		}

		// Maßstab
		const bar = w * 0.25;
		ctx.strokeStyle = INK;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(16, h - 18);
		ctx.lineTo(16 + bar, h - 18);
		ctx.moveTo(16, h - 23);
		ctx.lineTo(16, h - 13);
		ctx.moveTo(16 + bar, h - 23);
		ctx.lineTo(16 + bar, h - 13);
		ctx.stroke();
		ctx.fillStyle = INK;
		ctx.font = `12px ${FONT}`;
		ctx.textAlign = "left";
		ctx.fillText(fmtLen(Wm * 0.25), 16, h - 28);
	});
})();

// =====================================================================
// 2 · Atom-Baukasten
// =====================================================================
(() => {
	const canvas = document.getElementById("buildCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.15));
	const note = document.getElementById("buildNote");
	const goalsEl = document.getElementById("goals");

	const EL = [
		null,
		["H", "Wasserstoff"],
		["He", "Helium"],
		["Li", "Lithium"],
		["Be", "Beryllium"],
		["B", "Bor"],
		["C", "Kohlenstoff"],
		["N", "Stickstoff"],
		["O", "Sauerstoff"],
		["F", "Fluor"],
		["Ne", "Neon"],
		["Na", "Natrium"],
		["Mg", "Magnesium"],
		["Al", "Aluminium"],
		["Si", "Silizium"],
		["P", "Phosphor"],
		["S", "Schwefel"],
		["Cl", "Chlor"],
		["Ar", "Argon"],
		["K", "Kalium"],
		["Ca", "Calcium"],
	];
	// stabile Neutronenzahlen je Protonenzahl
	const STABLE = {
		1: [0, 1],
		2: [1, 2],
		3: [3, 4],
		4: [5],
		5: [5, 6],
		6: [6, 7],
		7: [7, 8],
		8: [8, 9, 10],
		9: [10],
		10: [10, 11, 12],
		11: [12],
		12: [12, 13, 14],
		13: [14],
		14: [14, 15, 16],
		15: [16],
		16: [16, 17, 18, 20],
		17: [18, 20],
		18: [18, 20, 22],
		19: [20, 22],
		20: [20, 22, 23, 24, 26, 28],
	};
	const SPECIAL = {
		"1-1": "Schwerer Wasserstoff (Deuterium). Steckt in winzigen Mengen in jedem Wasser.",
		"1-2": "Tritium: radioaktiver Wasserstoff, leuchtet in manchen Uhrzeigern.",
		"2-2": "Helium-4: Genau so ein Kern fliegt als Alpha-Strahlung aus radioaktiven Stoffen.",
		"6-6": "Kohlenstoff-12: das Atom, aus dem alles Leben gebaut ist.",
		"6-8": "Kohlenstoff-14: radioaktiv mit 5730 Jahren Halbwertszeit. Damit misst man das Alter von Fossilien.",
		"8-8": "Sauerstoff-16: Den atmest du gerade ein.",
		"19-21": "Kalium-40: leicht radioaktiv, steckt in jeder Banane!",
	};
	let Z = 1;
	let N = 0;
	let E = 1;
	const GOALS = [
		{ txt: "Helium-4 (neutral)", ok: () => Z === 2 && N === 2 && E === 2 },
		{ txt: "Kohlenstoff-12 (neutral)", ok: () => Z === 6 && N === 6 && E === 6 },
		{ txt: "ein Ion", ok: () => E !== Z },
		{ txt: "ein radioaktives Isotop", ok: () => !(STABLE[Z] || []).includes(N) },
		{ txt: "Sauerstoff-16 (neutral)", ok: () => Z === 8 && N === 8 && E === 8 },
		{ txt: "das Bananen-Atom Kalium-40", ok: () => Z === 19 && N === 21 },
	];
	const done = new Set();
	GOALS.forEach((g) => {
		const li = document.createElement("li");
		li.textContent = g.txt;
		goalsEl.appendChild(li);
	});
	let flash = 0;

	function sync() {
		document.getElementById("nP").textContent = Z;
		document.getElementById("nN").textContent = N;
		document.getElementById("nE").textContent = E;
		GOALS.forEach((g, i) => {
			if (g.ok() && !done.has(i)) {
				done.add(i);
				flash = 1;
			}
			goalsEl.children[i].classList.toggle("done", done.has(i));
		});
		const stable = (STABLE[Z] || []).includes(N);
		const name = EL[Z][1];
		const charge = Z - E;
		let txt = `${name}-${Z + N}: ${Z} ${Z === 1 ? "Proton macht" : "Protonen machen"} es zu ${name}. `;
		txt += stable ? "Der Kern ist stabil. " : N < Math.min(...STABLE[Z]) ? "Zu wenige Neutronen: Der Kern ist instabil und radioaktiv. " : "Zu viele Neutronen: Der Kern ist instabil und radioaktiv. ";
		if (charge > 0) txt += `Es fehlen ${charge} Elektron${charge > 1 ? "en" : ""}, also ein positives Ion. `;
		if (charge < 0) txt += `${-charge} Elektron${charge < -1 ? "en" : ""} zu viel, also ein negatives Ion. `;
		if (SPECIAL[`${Z}-${N}`]) txt += SPECIAL[`${Z}-${N}`];
		note.textContent = txt;
	}
	document.querySelectorAll(".builder button").forEach((b) =>
		b.addEventListener("click", () => {
			const d = Number(b.dataset.d);
			if (b.dataset.k === "p") Z = clamp(Z + d, 1, 20);
			if (b.dataset.k === "n") N = clamp(N + d, 0, 30);
			if (b.dataset.k === "e") E = clamp(E + d, 0, 22);
			sync();
		})
	);
	sync();

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const stable = (STABLE[Z] || []).includes(N);
		flash = Math.max(0, flash - dt);
		const cx = w * 0.56;
		const cy = h * 0.54;
		const maxR = Math.min(w * 0.42, h * 0.44);

		ctx.fillStyle = "#060508";
		ctx.fillRect(0, 0, w, h);

		// Schalen
		const shells = [2, 8, 8, 4];
		const radii = [0.36, 0.58, 0.8, 0.98].map((f) => f * maxR);
		let left = E;
		shells.forEach((cap, s) => {
			ctx.strokeStyle = "rgba(90,176,255,0.18)";
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.arc(cx, cy, radii[s], 0, Math.PI * 2);
			ctx.stroke();
			const n = Math.min(cap, left);
			left -= n;
			for (let i = 0; i < n; i++) {
				const a = (i / n) * Math.PI * 2 + time * (0.9 - s * 0.18);
				const x = cx + Math.cos(a) * radii[s];
				const y = cy + Math.sin(a) * radii[s];
				const g = ctx.createRadialGradient(x, y, 0, x, y, 12);
				g.addColorStop(0, "rgba(90,176,255,0.5)");
				g.addColorStop(1, "rgba(90,176,255,0)");
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(x, y, 12, 0, Math.PI * 2);
				ctx.fill();
				ball(ctx, x, y, 5, ELECTRON);
			}
		});

		// Kern
		const r = clamp(maxR * 0.045, 5, 10);
		const jit = stable ? 0.3 : 1.8;
		if (!stable) {
			const pulse = 0.5 + 0.5 * Math.sin(time * 6);
			const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.3);
			g.addColorStop(0, `rgba(212,255,58,${0.25 + pulse * 0.2})`);
			g.addColorStop(1, "rgba(212,255,58,0)");
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(cx, cy, maxR * 0.3, 0, Math.PI * 2);
			ctx.fill();
		}
		nucleus(ctx, cx, cy, Z, N, r, jit, time);

		// Elementkarte
		const kx = 14;
		const ky = 34;
		const kw = Math.min(118, w * 0.28);
		const kh = kw * 1.15;
		ctx.fillStyle = flash > 0 ? `rgba(123,220,154,${0.15 + flash * 0.3})` : "rgba(255,255,255,0.05)";
		ctx.strokeStyle = stable ? "rgba(255,255,255,0.25)" : LIME;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.roundRect(kx, ky, kw, kh, 10);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = "rgba(244,239,230,0.6)";
		ctx.font = `11px ${FONT}`;
		ctx.textAlign = "left";
		ctx.fillText(String(Z), kx + 8, ky + 16);
		ctx.textAlign = "right";
		ctx.fillText(String(Z + N), kx + kw - 8, ky + 16);
		ctx.fillStyle = INK;
		ctx.textAlign = "center";
		ctx.font = `800 ${kw * 0.36}px Syne, sans-serif`;
		ctx.fillText(EL[Z][0], kx + kw / 2, ky + kh * 0.6);
		ctx.font = `11px ${FONT}`;
		ctx.fillStyle = "rgba(244,239,230,0.75)";
		ctx.fillText(EL[Z][1], kx + kw / 2, ky + kh * 0.78);
		const charge = Z - E;
		ctx.fillStyle = stable ? "#7bdc9a" : LIME;
		ctx.fillText(stable ? "stabil" : "☢ radioaktiv", kx + kw / 2, ky + kh * 0.93);
		if (charge) {
			ctx.fillStyle = charge > 0 ? PROTON : ELECTRON;
			ctx.font = `bold 14px ${FONT}`;
			ctx.textAlign = "left";
			ctx.fillText(`${Math.abs(charge) > 1 ? Math.abs(charge) : ""}${charge > 0 ? "+" : "−"}`, kx + kw + 6, ky + 18);
		}
	});
})();

// =====================================================================
// 3 · Halbwertszeit
// =====================================================================
(() => {
	const canvas = document.getElementById("decayCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.75 : 1.1));
	const btn = document.getElementById("btnDecay");
	const btnGeiger = document.getElementById("btnGeiger");
	const half = document.getElementById("half");
	const halfOut = document.getElementById("halfOut");
	const out = document.getElementById("decayOut");
	const note = document.getElementById("decayNote");

	const G = 20;
	const N0 = G * G;
	let atoms = [];
	let t = 0;
	let running = false;
	let hist = [];
	let geiger = false;
	let rays = [];

	function reset() {
		atoms = Array.from({ length: N0 }, () => ({ alive: true, flash: 0 }));
		t = 0;
		hist = [[0, N0]];
		running = false;
		rays = [];
		btn.textContent = "▶ Start";
		note.textContent = "Jedes Atom würfelt in jedem Moment, ob es zerfällt. Keins weiß vom anderen.";
	}
	reset();
	btn.addEventListener("click", () => {
		running = !running;
		btn.textContent = running ? "⏸ Pause" : "▶ Weiter";
		if (geiger) getAudio();
	});
	document.getElementById("btnDecayReset").addEventListener("click", reset);
	btnGeiger.addEventListener("click", () => {
		geiger = !geiger;
		btnGeiger.setAttribute("aria-pressed", String(geiger));
		if (geiger) getAudio();
	});
	half.addEventListener("input", () => {
		halfOut.textContent = `${half.value} s`;
		reset();
	});

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const T = Number(half.value);
		const narrow = w < 520;
		const alive = atoms.filter((a) => a.alive).length;
		if (running && alive > 0) {
			t += dt;
			const p = 1 - Math.pow(2, -dt / T);
			let clicks = 0;
			atoms.forEach((a, i) => {
				if (a.alive && Math.random() < p) {
					a.alive = false;
					a.flash = 1;
					const ang = Math.random() * Math.PI * 2;
					rays.push({ i, a: ang, t: 0 });
					if (geiger && clicks++ < 8) setTimeout(geigerClick, Math.random() * dt * 1000);
				}
			});
			hist.push([t, atoms.filter((a) => a.alive).length]);
		}
		if (alive === 0 && running) {
			running = false;
			btn.textContent = "▶ Start";
			note.textContent = `Alle zerfallen nach ${nf(t, 1)} s, das sind etwa ${nf(t / T, 1)} Halbwertszeiten. Bei echten Stoffen mit Billionen Atomen dauert das viel länger.`;
		}
		const now = atoms.filter((a) => a.alive).length;
		out.innerHTML = `${now} von ${N0} übrig<br>${nf(t, 1)} s · ${nf(t / T, 2)} HWZ`;
		if (running) {
			const k = Math.floor(t / T);
			if (k >= 1 && k <= 4) note.textContent = `Nach ${k} Halbwertszeit${k > 1 ? "en" : ""} erwartet: ${nf(N0 / 2 ** k, 0)} Atome. Tatsächlich: ${now}. Der Zufall wackelt ein bisschen, aber das Muster stimmt!`;
		}

		ctx.fillStyle = "#060508";
		ctx.fillRect(0, 0, w, h);

		// Atom-Gitter
		const gs = narrow ? Math.min(w - 32, h * 0.48) : Math.min(w * 0.46, h - 60);
		const gx = narrow ? (w - gs) / 2 : 18;
		const gy = narrow ? 34 : (h - gs) / 2 + 8;
		const cell = gs / G;
		atoms.forEach((a, i) => {
			const x = gx + (i % G) * cell + cell / 2;
			const y = gy + Math.floor(i / G) * cell + cell / 2;
			a.flash = Math.max(0, a.flash - dt * 2);
			if (a.alive) {
				ctx.fillStyle = LIME;
				ctx.shadowColor = LIME;
				ctx.shadowBlur = 6;
			} else {
				ctx.fillStyle = a.flash > 0 ? `rgba(255,255,255,${a.flash})` : "#2a2e33";
				ctx.shadowBlur = 0;
			}
			ctx.beginPath();
			ctx.arc(x, y, cell * 0.32 + a.flash * cell * 0.2, 0, Math.PI * 2);
			ctx.fill();
		});
		ctx.shadowBlur = 0;
		rays = rays.filter((r) => (r.t += dt) < 0.5);
		for (const r of rays) {
			const x = gx + (r.i % G) * cell + cell / 2;
			const y = gy + Math.floor(r.i / G) * cell + cell / 2;
			const d = r.t * 120;
			ctx.strokeStyle = `rgba(57,255,176,${1 - r.t * 2})`;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(x + Math.cos(r.a) * d, y + Math.sin(r.a) * d);
			ctx.lineTo(x + Math.cos(r.a) * (d + 8), y + Math.sin(r.a) * (d + 8));
			ctx.stroke();
		}

		// Kurve
		const px0 = narrow ? 44 : gx + gs + 46;
		const px1 = w - 14;
		const py0 = narrow ? gy + gs + 26 : gy;
		const py1 = narrow ? h - 26 : gy + gs;
		const tMax = T * 5;
		const X = (tt) => lerp(px0, px1, tt / tMax);
		const Y = (n) => lerp(py1, py0, n / N0);
		ctx.strokeStyle = "rgba(255,255,255,0.15)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(px0, py0);
		ctx.lineTo(px0, py1);
		ctx.lineTo(px1, py1);
		ctx.stroke();
		ctx.font = `10px ${FONT}`;
		for (let k = 0; k <= 4; k++) {
			const n = N0 / 2 ** k;
			ctx.setLineDash([3, 4]);
			ctx.strokeStyle = "rgba(212,255,58,0.25)";
			ctx.beginPath();
			ctx.moveTo(px0, Y(n));
			ctx.lineTo(X(k * T), Y(n));
			ctx.lineTo(X(k * T), py1);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = "rgba(244,239,230,0.5)";
			ctx.textAlign = "right";
			ctx.fillText(k === 0 ? "400" : `${["", "½", "¼", "⅛", "1/16"][k]}`, px0 - 5, Y(n) + 3);
			ctx.textAlign = "center";
			if (k > 0) ctx.fillText(`${k}×`, X(k * T), py1 + 13);
		}
		ctx.textAlign = "right";
		ctx.fillText("Zeit in Halbwertszeiten →", px1, py1 + 27);
		// Theorie
		ctx.strokeStyle = "rgba(255,255,255,0.3)";
		ctx.beginPath();
		for (let i = 0; i <= 100; i++) {
			const tt = (i / 100) * tMax;
			(i ? ctx.lineTo : ctx.moveTo).call(ctx, X(tt), Y(N0 * Math.pow(2, -tt / T)));
		}
		ctx.stroke();
		// Messung
		ctx.strokeStyle = LIME;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		hist.forEach(([tt, n], i) => {
			if (tt > tMax) return;
			i ? ctx.lineTo(X(tt), Y(n)) : ctx.moveTo(X(tt), Y(n));
		});
		ctx.stroke();
	});
})();

// =====================================================================
// 4 · Kettenreaktion
// =====================================================================
(() => {
	const canvas = document.getElementById("chainCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.15));
	const dens = document.getElementById("dens");
	const rods = document.getElementById("rods");
	const densOut = document.getElementById("densOut");
	const rodsOut = document.getElementById("rodsOut");
	const out = document.getElementById("chainOut");
	const note = document.getElementById("chainNote");

	let nuclei = [];
	let neutrons = [];
	let frags = [];
	let flashes = [];
	let fissions = 0;
	let produced = 0;
	let hits = 0;
	let resolved = 0;
	let spark = [];
	let bucket = 0;
	let bucketT = 0;
	let started = false;
	let ended = false;

	function seed() {
		const { w, h } = size;
		const n = Math.round((Number(dens.value) / 100) * (w * h) / 900);
		nuclei = [];
		let tries = 0;
		while (nuclei.length < n && tries++ < n * 30) {
			const x = 12 + Math.random() * (w - 24);
			const y = 30 + Math.random() * (h - 60);
			if (nuclei.every((o) => Math.hypot(o.x - x, o.y - y) > 18)) nuclei.push({ x, y, ph: Math.random() * 6 });
		}
		neutrons = [];
		frags = [];
		flashes = [];
		fissions = produced = hits = resolved = 0;
		spark = [];
		started = ended = false;
		note.textContent = "Tippe irgendwo ins Bild, um das erste Neutron abzuschießen.";
	}
	const densWord = (v) => (v < 40 ? "dünn" : v < 75 ? "mittel" : "dicht");
	const rodsWord = (v) => (v < 5 ? "draußen" : v < 50 ? "etwas drin" : v < 90 ? "weit drin" : "ganz drin");
	dens.addEventListener("input", () => {
		densOut.textContent = densWord(Number(dens.value));
		seed();
	});
	rods.addEventListener("input", () => (rodsOut.textContent = rodsWord(Number(rods.value))));
	document.getElementById("btnChainReset").addEventListener("click", seed);
	setTimeout(seed, 0);

	canvas.addEventListener("pointerdown", (e) => {
		const [x, y] = pointerAt(canvas, e);
		let best = null;
		let bd = Infinity;
		for (const n of nuclei) {
			const d = Math.hypot(n.x - x, n.y - y);
			if (d < bd) {
				bd = d;
				best = n;
			}
		}
		const a = best ? Math.atan2(best.y - y, best.x - x) : Math.random() * Math.PI * 2;
		neutrons.push({ x, y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, t: 0, parent: false });
		started = true;
		ended = false;
	});

	const rodsGeo = () => {
		const { w, h } = size;
		const n = 4;
		const depth = (Number(rods.value) / 100) * h;
		return Array.from({ length: n }, (_, i) => ({ x: ((i + 0.5) / n) * w - 6, w: 12, h: depth }));
	};

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		if (!nuclei.length && !started) seed();
		const R = 7;
		const RG = rodsGeo();

		// Neutronen bewegen
		for (const nt of neutrons) {
			nt.x += nt.vx * dt;
			nt.y += nt.vy * dt;
			nt.t += dt;
			if (RG.some((r) => nt.x > r.x && nt.x < r.x + r.w && nt.y < r.h)) {
				nt.dead = true;
				if (nt.parent) resolved++;
				flashes.push({ x: nt.x, y: nt.y, t: 0, c: "rgba(120,170,255," });
				continue;
			}
			if (nt.x < -10 || nt.x > w + 10 || nt.y < -10 || nt.y > h + 10 || nt.t > 5) {
				nt.dead = true;
				if (nt.parent) resolved++;
				continue;
			}
			for (let i = 0; i < nuclei.length; i++) {
				const n = nuclei[i];
				if (Math.hypot(n.x - nt.x, n.y - nt.y) < R + 3) {
					nt.dead = true;
					if (nt.parent) {
						hits++;
						resolved++;
					}
					nuclei.splice(i, 1);
					fissions++;
					bucket++;
					flashes.push({ x: n.x, y: n.y, t: 0, c: "rgba(255,240,170," , big: true });
					const fa = Math.random() * Math.PI * 2;
					frags.push({ x: n.x, y: n.y, vx: Math.cos(fa) * 60, vy: Math.sin(fa) * 60, t: 0, c: "#ff8a5a" });
					frags.push({ x: n.x, y: n.y, vx: -Math.cos(fa) * 60, vy: -Math.sin(fa) * 60, t: 0, c: "#ffd166" });
					const k = Math.random() < 0.5 ? 2 : 3;
					produced += k;
					for (let j = 0; j < k; j++) {
						const a = Math.random() * Math.PI * 2;
						neutrons.push({ x: n.x, y: n.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, t: 0, parent: true });
					}
					break;
				}
			}
		}
		neutrons = neutrons.filter((n) => !n.dead);
		if (neutrons.length > 500) neutrons.splice(0, neutrons.length - 500);

		bucketT += dt;
		if (bucketT > 0.2) {
			spark.push(bucket);
			if (spark.length > 80) spark.shift();
			bucket = 0;
			bucketT = 0;
		}

		ctx.fillStyle = "#05070a";
		ctx.fillRect(0, 0, w, h);

		// Kerne
		for (const n of nuclei) {
			const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, R * 2);
			g.addColorStop(0, "rgba(57,255,176,0.25)");
			g.addColorStop(1, "rgba(57,255,176,0)");
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(n.x, n.y, R * 2, 0, Math.PI * 2);
			ctx.fill();
			ball(ctx, n.x + Math.sin(time * 3 + n.ph) * 0.4, n.y, R, "#3fbf7f");
		}
		// Steuerstäbe
		for (const r of RG) {
			if (r.h < 1) continue;
			const g = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
			g.addColorStop(0, "#3a3f48");
			g.addColorStop(0.5, "#8a93a3");
			g.addColorStop(1, "#3a3f48");
			ctx.fillStyle = g;
			ctx.fillRect(r.x, 0, r.w, r.h);
		}
		// Bruchstücke
		frags = frags.filter((f) => (f.t += dt) < 1.2);
		for (const f of frags) {
			f.x += f.vx * dt;
			f.y += f.vy * dt;
			ctx.globalAlpha = 1 - f.t / 1.2;
			ball(ctx, f.x, f.y, 4.5, f.c);
			ctx.globalAlpha = 1;
		}
		// Blitze
		flashes = flashes.filter((f) => (f.t += dt) < 0.4);
		for (const f of flashes) {
			const r = (f.big ? 20 : 8) * (f.t / 0.4) + 4;
			ctx.fillStyle = `${f.c}${(1 - f.t / 0.4) * (f.big ? 0.8 : 0.6)})`;
			ctx.beginPath();
			ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
			ctx.fill();
		}
		// Neutronen
		for (const n of neutrons) {
			ctx.strokeStyle = "rgba(255,255,255,0.35)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(n.x, n.y);
			ctx.lineTo(n.x - n.vx * 0.05, n.y - n.vy * 0.05);
			ctx.stroke();
			ctx.fillStyle = "#fff";
			ctx.beginPath();
			ctx.arc(n.x, n.y, 2.6, 0, Math.PI * 2);
			ctx.fill();
		}

		// Spaltungen pro Zeit
		const sx0 = 12;
		const sw = Math.min(160, w * 0.35);
		const sy = h - 12;
		const smax = Math.max(4, ...spark);
		ctx.strokeStyle = LIME;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		spark.forEach((v, i) => {
			const x = sx0 + (i / 79) * sw;
			const y = sy - (v / smax) * 34;
			i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
		});
		ctx.stroke();
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.font = `10px ${FONT}`;
		ctx.textAlign = "left";
		ctx.fillText("Spaltungen pro Zeit", sx0, sy - 40);

		const k = resolved > 0 ? hits / resolved : 0;
		out.innerHTML = `${fissions} Spaltungen<br>${neutrons.length} Neutronen`;
		if (started && !neutrons.length && !ended) {
			ended = true;
			const total = fissions + nuclei.length;
			const share = fissions / Math.max(1, total);
			if (fissions <= 3) note.textContent = "Die Kette ist sofort abgebrochen. Zu wenig Uran oder zu viele Steuerstäbe: Die Neutronen fliegen ins Leere.";
			else if (share > 0.6) note.textContent = `Lawine! ${fissions} Kerne gespalten, ${Math.round(share * 100)} % des Urans. Jede Spaltung hat im Schnitt mehr als eine neue ausgelöst (k = ${nf(k, 2)}). Unkontrolliert ist das eine Atombombe.`;
			else note.textContent = `${fissions} Spaltungen, dann ist die Kette ausgestorben. Im Schnitt hat jede Spaltung ${nf(k, 2)} neue ausgelöst. Kleiner als 1 heißt: Die Reaktion stirbt aus. Ein Kraftwerk hält genau 1.`;
		} else if (started && neutrons.length && resolved >= 6) {
			note.textContent = `Läuft … Jede Spaltung löst im Schnitt ${nf(k, 2)} weitere aus. ${k > 1.05 ? "Mehr als 1: Die Reaktion wächst!" : k < 0.95 ? "Weniger als 1: Sie wird schwächer." : "Ziemlich genau 1: gleichmäßig wie im Kraftwerk."}`;
		}
	});
})();

// =====================================================================
// 5 · Alpha, Beta, Gamma abschirmen
// =====================================================================
(() => {
	const canvas = document.getElementById("rayCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 2.3));
	const raysEl = document.getElementById("rays");
	const shieldsEl = document.getElementById("shields");
	const tag = document.getElementById("rayTag");
	const out = document.getElementById("rayOut");
	const note = document.getElementById("rayNote");

	const RAYS = [
		{ key: "a", name: "Alpha α", col: "#ff6a5a", r: 5, v: 160, pass: { paper: 0, alu: 0, lead: 0 }, txt: "Alpha-Teilchen sind schwere Heliumkerne. Sie stoßen sofort überall an und verlieren ihre Energie. Ein Blatt Papier reicht als Schutz." },
		{ key: "b", name: "Beta β", col: "#5ab0ff", r: 2.5, v: 330, pass: { paper: 0.9, alu: 0.03, lead: 0 }, txt: "Beta-Teilchen sind schnelle Elektronen. Papier hält sie kaum auf, ein paar Millimeter Aluminium schon." },
		{ key: "g", name: "Gamma γ", col: "#ffe14d", r: 0, v: 520, pass: { paper: 1, alu: 0.92, lead: 0.3 }, txt: "Gamma-Strahlung ist sehr energiereiches Licht. Sie kommt durch Papier und Aluminium, und selbst dickes Blei lässt noch einen Teil durch." },
	];
	const SHIELDS = [
		{ key: "paper", name: "📄 Papier", x: 0.38, w: 4, col: "#efe6d4" },
		{ key: "alu", name: "🥫 Aluminium 5 mm", x: 0.53, w: 10, col: "#b8c0cc" },
		{ key: "lead", name: "🧱 Blei 5 cm", x: 0.68, w: 26, col: "#5a6070" },
	];
	let ray = RAYS[0];
	const on = { paper: false, alu: false, lead: false };
	let parts = [];
	let stops = [];
	let det = [];
	let acc = 0;

	RAYS.forEach((r) => {
		const b = document.createElement("button");
		b.type = "button";
		b.className = "btn";
		b.textContent = r.name;
		b.setAttribute("aria-pressed", String(r === ray));
		b.addEventListener("click", () => {
			ray = r;
			parts = [];
			det = [];
			[...raysEl.children].forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
			sync();
		});
		raysEl.appendChild(b);
	});
	SHIELDS.forEach((s) => {
		const b = document.createElement("button");
		b.type = "button";
		b.className = "btn toggle";
		b.textContent = s.name;
		b.setAttribute("aria-pressed", "false");
		b.addEventListener("click", () => {
			on[s.key] = !on[s.key];
			b.setAttribute("aria-pressed", String(on[s.key]));
			det = [];
			sync();
		});
		shieldsEl.appendChild(b);
	});
	function expected() {
		let p = 1;
		for (const s of SHIELDS) if (on[s.key]) p *= ray.pass[s.key];
		return p;
	}
	function sync() {
		tag.textContent = `${ray.name.split(" ")[0]}-Strahlung`;
		const p = expected();
		const any = SHIELDS.some((s) => on[s.key]);
		note.textContent = `${ray.txt} ${any ? (p === 0 ? "Mit dieser Abschirmung kommt nichts mehr durch." : `Es kommen etwa ${Math.round(p * 100)} % durch.`) : "Noch steht nichts im Weg."}`;
	}
	sync();

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const sx = w * 0.1;
		const dx = w * 0.88;
		const cy = h * 0.5;

		acc += dt * 26;
		while (acc > 1) {
			acc--;
			const spread = (Math.random() - 0.5) * h * 0.5;
			parts.push({ x: sx + 18, y: cy + spread * 0.2, vy: spread * 0.25, t: 0, done: false, ph: Math.random() * 6 });
		}
		for (const p of parts) {
			const px = p.x;
			p.x += ray.v * dt;
			p.y += p.vy * dt + (ray.key === "b" ? Math.sin(time * 20 + p.ph) * 0.8 : 0);
			p.t += dt;
			for (const s of SHIELDS) {
				const x = w * s.x;
				if (on[s.key] && px < x && p.x >= x && !p.passed?.[s.key]) {
					if (Math.random() < ray.pass[s.key]) {
						p.passed = { ...(p.passed || {}), [s.key]: true };
					} else {
						p.done = true;
						stops.push({ x, y: p.y, t: 0 });
					}
				}
			}
			if (!p.done && p.x >= dx - 10) {
				p.done = true;
				if (Math.abs(p.y - cy) < h * 0.22) det.push(time);
			}
		}
		parts = parts.filter((p) => !p.done && p.x < w);
		det = det.filter((t) => time - t < 2);
		const rate = det.length / 2;

		ctx.fillStyle = "#06070a";
		ctx.fillRect(0, 0, w, h);

		// Quelle
		ctx.fillStyle = "#2a2e33";
		ctx.fillRect(sx - 26, cy - 34, 44, 68);
		ctx.fillStyle = LIME;
		ctx.font = "26px serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("☢", sx - 4, cy);
		ctx.textBaseline = "alphabetic";
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.font = `10px ${FONT}`;
		ctx.fillText("Quelle", sx - 4, cy + 50);

		// Abschirmungen
		for (const s of SHIELDS) {
			const x = w * s.x;
			ctx.fillStyle = on[s.key] ? s.col : "rgba(255,255,255,0.05)";
			ctx.strokeStyle = on[s.key] ? "transparent" : "rgba(255,255,255,0.15)";
			ctx.setLineDash(on[s.key] ? [] : [4, 4]);
			ctx.beginPath();
			ctx.rect(x, cy - h * 0.38, s.w, h * 0.76);
			ctx.fill();
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = on[s.key] ? "rgba(244,239,230,0.75)" : "rgba(244,239,230,0.3)";
			ctx.fillText(s.name.split(" ")[1], x + s.w / 2, cy + h * 0.38 + 14);
		}

		// Teilchen
		for (const p of parts) {
			if (ray.key === "g") {
				ctx.strokeStyle = ray.col;
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				for (let k = 0; k < 18; k++) {
					const x = p.x - k;
					const y = p.y + Math.sin((x + time * 300) * 0.6) * 3;
					k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
				}
				ctx.stroke();
			} else {
				ball(ctx, p.x, p.y, ray.r, ray.col);
			}
		}
		stops = stops.filter((s) => (s.t += dt) < 0.35);
		for (const s of stops) {
			ctx.fillStyle = `rgba(255,255,255,${0.6 - s.t * 1.7})`;
			ctx.beginPath();
			ctx.arc(s.x, s.y, 2 + s.t * 14, 0, Math.PI * 2);
			ctx.fill();
		}

		// Zähler
		ctx.fillStyle = "#1c2026";
		ctx.beginPath();
		ctx.roundRect(dx - 10, cy - h * 0.22, 34, h * 0.44, 8);
		ctx.fill();
		const hot = clamp(rate / 20, 0, 1);
		ctx.fillStyle = `rgba(212,255,58,${0.15 + hot * 0.7})`;
		ctx.fillRect(dx - 4, cy - h * 0.2, 22, h * 0.4);
		ctx.fillStyle = INK;
		ctx.font = `bold 13px ${FONT}`;
		ctx.textAlign = "center";
		ctx.fillText(nf(rate, 0), dx + 7, cy - h * 0.22 - 22);
		ctx.font = `10px ${FONT}`;
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.fillText("Treffer/s", dx + 7, cy - h * 0.22 - 8);
		out.textContent = `Zähler: ${nf(rate, 0)} pro Sekunde`;
	});
})();
