"use strict";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const nf = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
const ORANGE = "#ff9f6b";
const LIME = "#b5e86b";
const NAMES = ["C", "Cis", "D", "Dis", "E", "F", "Fis", "G", "Gis", "A", "B", "H"];
function noteName(f) {
	const m = Math.round(69 + 12 * Math.log2(f / 440));
	return `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
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

// Ein Dauerton, der sich weich ein- und ausblenden lässt
function makeVoice(type = "sine") {
	const ac = getAudio();
	if (!ac) return null;
	const osc = ac.createOscillator();
	osc.type = type;
	const gain = ac.createGain();
	gain.gain.value = 0;
	osc.connect(gain).connect(ac.destination);
	osc.start();
	return {
		osc,
		gain,
		set(f, g) {
			const t = ac.currentTime;
			osc.frequency.setTargetAtTime(f, t, 0.02);
			gain.gain.setTargetAtTime(g, t, 0.04);
		},
	};
}

function playBuffer(fill, seconds) {
	const ac = getAudio();
	if (!ac) return null;
	const sr = ac.sampleRate;
	const buf = ac.createBuffer(1, Math.round(sr * seconds), sr);
	fill(buf.getChannelData(0), sr);
	const src = ac.createBufferSource();
	src.buffer = buf;
	src.connect(ac.destination);
	src.start();
	return src;
}

// =====================================================================
// 1 · Luftteilchen vor einem Lautsprecher
// =====================================================================
(() => {
	const canvas = document.getElementById("airCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1 : 1.35));
	const btn = document.getElementById("btnAirSound");
	const fIn = document.getElementById("airF");
	const aIn = document.getElementById("airA");
	const fOut = document.getElementById("airFOut");
	const aOut = document.getElementById("airAOut");
	const note = document.getElementById("airNote");
	let voice = null;
	let on = false;
	let phase = 0;
	const C = 150; // sichtbare Schallgeschwindigkeit in px/s
	const jitter = [];

	const word = (v) => (v < 33 ? "tief" : v < 66 ? "mittel" : "hoch");
	const wordA = (v) => (v < 33 ? "leise" : v < 66 ? "mittel" : "laut");
	const audioF = () => 110 * Math.pow(2, (Number(fIn.value) / 100) * 3);
	function sync() {
		fOut.textContent = word(Number(fIn.value));
		aOut.textContent = wordA(Number(aIn.value));
		if (voice) voice.set(audioF(), on ? Math.pow(Number(aIn.value) / 100, 2) * 0.25 : 0);
		note.textContent =
			Number(fIn.value) > 66
				? "Hoher Ton: Die dichten Stellen kommen öfter vorbei und liegen enger beieinander. Das rote Teilchen wackelt schneller, reist aber trotzdem nicht mit."
				: "Das rote Teilchen wackelt nur ein Stück vor und zurück. Weiter nach rechts läuft nur das Drängeln, die Welle.";
	}
	fIn.addEventListener("input", sync);
	aIn.addEventListener("input", sync);
	btn.addEventListener("click", () => {
		if (!voice) voice = makeVoice("sine");
		on = !on;
		btn.setAttribute("aria-pressed", String(on));
		btn.textContent = on ? "🔇 Ton aus" : "🔊 Ton an";
		sync();
	});
	sync();

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const fv = lerp(0.35, 1.8, Number(fIn.value) / 100);
		const A = lerp(0, 13, Number(aIn.value) / 100);
		phase += dt * fv * Math.PI * 2;
		const k = (Math.PI * 2 * fv) / C;
		const xs = w * 0.13;
		const cols = w < 520 ? 24 : 38;
		const rows = 11;
		const gx0 = w * 0.17;
		const gx1 = w - 12;
		const gy0 = h * 0.08;
		const gy1 = h * 0.66;
		if (jitter.length !== cols * rows) {
			jitter.length = 0;
			for (let i = 0; i < cols * rows; i++) jitter.push([(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, Math.random() * 6]);
		}
		const disp = (x) => A * Math.sin(phase - k * (x - xs));
		const dens = (x) => A * k * Math.cos(phase - k * (x - xs)); // Verdichtung

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		// Lautsprecher
		const cone = disp(xs) * 0.8;
		ctx.fillStyle = "#2a2622";
		ctx.fillRect(4, gy0 + (gy1 - gy0) * 0.15, xs - 22, (gy1 - gy0) * 0.7);
		ctx.strokeStyle = "#9aa0a8";
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.moveTo(xs - 16 + cone, gy0 + (gy1 - gy0) * 0.08);
		ctx.quadraticCurveTo(xs - 4 + cone, (gy0 + gy1) / 2, xs - 16 + cone, gy1 - (gy1 - gy0) * 0.08);
		ctx.stroke();

		// Teilchen
		const red = { c: Math.round(cols * 0.42), r: Math.floor(rows / 2) };
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const [jx, jy, jp] = jitter[r * cols + c];
				const x0 = lerp(gx0, gx1, c / (cols - 1)) + jx;
				const y = lerp(gy0, gy1, r / (rows - 1)) + jy + Math.sin(phase * 3 + jp) * 0.6;
				const x = x0 + disp(x0);
				const isRed = c === red.c && r === red.r;
				if (isRed) {
					ctx.strokeStyle = "rgba(255,90,90,0.5)";
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.moveTo(x0 - A, y);
					ctx.lineTo(x0 + A, y);
					ctx.stroke();
					ctx.fillStyle = "#ff5a5a";
					ctx.beginPath();
					ctx.arc(x, y, 5.5, 0, Math.PI * 2);
					ctx.fill();
					continue;
				}
				const d = clamp(dens(x0) * 3, -1, 1);
				ctx.fillStyle = `rgba(${Math.round(lerp(150, 255, (d + 1) / 2))},${Math.round(lerp(170, 220, (d + 1) / 2))},${Math.round(lerp(200, 170, (d + 1) / 2))},${0.45 + d * 0.4})`;
				ctx.beginPath();
				ctx.arc(x, y, 2.6, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		// Druck-Kurve
		const py = h * 0.84;
		const pa = h * 0.09;
		ctx.strokeStyle = "rgba(255,255,255,0.1)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(gx0, py);
		ctx.lineTo(gx1, py);
		ctx.stroke();
		ctx.strokeStyle = ORANGE;
		ctx.lineWidth = 2;
		ctx.beginPath();
		for (let x = gx0; x <= gx1; x += 3) {
			const y = py - clamp(dens(x) * 3, -1.2, 1.2) * pa;
			x === gx0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
		}
		ctx.stroke();
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.font = "11px 'Space Grotesk', sans-serif";
		ctx.textAlign = "left";
		ctx.fillText("Luftdruck", 8, py - pa - 4);
		ctx.fillText("dicht ↑", 8, py - 4);
		ctx.fillText("dünn ↓", 8, py + 14);
	});
})();

// =====================================================================
// 2 · Tongenerator, Oszilloskop und Hörtest
// =====================================================================
(() => {
	const canvas = document.getElementById("scopeCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.4 : 1.9));
	const btn = document.getElementById("btnTone");
	const fIn = document.getElementById("freq");
	const vIn = document.getElementById("vol");
	const fOut = document.getElementById("freqOut");
	const vOut = document.getElementById("volOut");
	const out = document.getElementById("toneOut");
	const note = document.getElementById("toneNote");
	const btnHear = document.getElementById("btnHear");
	const hearText = document.getElementById("hearText");
	let voice = null;
	let on = false;
	let test = null;
	let shownF = 440;

	const freq = () => 20 * Math.pow(1000, Number(fIn.value) / 1000);
	const gainOf = () => Math.pow(Number(vIn.value) / 100, 2) * 0.3;
	function describe(f) {
		if (f < 60) return "Tiefer Bass: eher gefühlt als gehört, wie das Wummern im Club.";
		if (f < 300) return "Bereich von Männerstimmen, Bassgitarre und Tuba.";
		if (f < 1000) return "Bereich von Frauen- und Kinderstimmen, Geige und Flöte.";
		if (f < 4000) return "Pfeifen und Vogelgezwitscher. Hier ist dein Ohr am empfindlichsten, darum sind Alarmtöne oft genau hier.";
		if (f < 12000) return "Zischen und Rauschen: Becken, S-Laute, Blätterrascheln.";
		return "Sehr hoch: Viele Erwachsene hören das schon nicht mehr.";
	}
	function sync() {
		const f = freq();
		fOut.textContent = `${nf(f, f < 100 ? 1 : 0)} Hz`;
		vOut.textContent = `${vIn.value} %`;
		out.textContent = `${nf(f, f < 100 ? 1 : 0)} Hz · ${noteName(f)}`;
		note.textContent = describe(f);
		if (voice && !test) voice.set(f, on ? gainOf() : 0);
	}
	fIn.addEventListener("input", sync);
	vIn.addEventListener("input", sync);
	btn.addEventListener("click", () => {
		if (!voice) voice = makeVoice("sine");
		if (test) stopTest(false);
		on = !on;
		btn.setAttribute("aria-pressed", String(on));
		btn.textContent = on ? "🔇 Ton aus" : "🔊 Ton an";
		sync();
	});
	sync();

	function stopTest(record) {
		const f = test ? test.f : 0;
		test = null;
		voice.set(freq(), on ? gainOf() : 0);
		btnHear.textContent = "👂 Hörtest starten";
		if (!record) return;
		let verdict;
		if (f > 17000) verdict = "typisch für Kinder und Jugendliche.";
		else if (f > 15000) verdict = "typisch für junge Erwachsene.";
		else if (f > 12000) verdict = "typisch ab etwa 40 Jahren.";
		else verdict = "typisch ab etwa 50 Jahren. Oder dein Lautsprecher schafft keine höheren Töne, probier es mit Kopfhörern.";
		hearText.innerHTML = `Du hörst bis etwa <strong>${nf(Math.round(f / 100) * 100)} Hz</strong>: ${verdict}`;
	}
	btnHear.addEventListener("click", () => {
		if (!voice) voice = makeVoice("sine");
		if (test) return stopTest(true);
		test = { t: 0, f: 8000 };
		btnHear.textContent = "✋ Jetzt höre ich nichts mehr";
		hearText.textContent = "Hör genau hin …";
	});

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		if (test) {
			test.t += dt;
			test.f = 8000 * Math.pow(20000 / 8000, Math.min(test.t / 24, 1));
			voice.set(test.f, Math.min(gainOf(), 0.06) + 0.01);
			hearText.textContent = `${nf(Math.round(test.f / 100) * 100)} Hz …`;
			if (test.t > 24) stopTest(true);
		}
		const f = test ? test.f : freq();
		shownF = f;
		const amp = (Number(vIn.value) / 100) * h * 0.38;
		const active = on || test;

		ctx.fillStyle = "#06100a";
		ctx.fillRect(0, 0, w, h);
		ctx.strokeStyle = "rgba(181,232,107,0.08)";
		ctx.lineWidth = 1;
		for (let x = 0; x <= w; x += w / 10) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
			ctx.stroke();
		}
		for (let y = 0; y <= h; y += h / 6) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(w, y);
			ctx.stroke();
		}
		// 10 ms Fenster: so viele Schwingungen, wie in 10 ms passen
		const cycles = f * 0.01;
		ctx.strokeStyle = active ? LIME : "rgba(181,232,107,0.35)";
		ctx.shadowColor = LIME;
		ctx.shadowBlur = active ? 8 : 0;
		ctx.lineWidth = 2;
		ctx.beginPath();
		const n = Math.min(4000, Math.max(400, cycles * 24));
		for (let i = 0; i <= n; i++) {
			const x = (i / n) * w;
			const y = h / 2 - Math.sin((i / n) * cycles * Math.PI * 2) * (active ? amp : amp * 0.15);
			i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
		}
		ctx.stroke();
		ctx.shadowBlur = 0;
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.font = "11px 'Space Grotesk', sans-serif";
		ctx.textAlign = "right";
		ctx.fillText(`10 Millisekunden · ${nf(cycles, cycles < 10 ? 1 : 0)} Schwingungen`, w - 10, h - 10);
	});
})();

// =====================================================================
// 3 · Obertöne mischen
// =====================================================================
(() => {
	const canvas = document.getElementById("harmCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1 : 1.35));
	const btn = document.getElementById("btnHarm");
	const presetsBox = document.getElementById("presets");
	const note = document.getElementById("harmNote");
	const N = 8;
	const BASE = 220;
	const PRESETS = [
		["Reiner Sinus", [1, 0, 0, 0, 0, 0, 0, 0], "Nur der Grundton. So klingt kein echtes Instrument, eher ein Messgerät oder ein alter Wecker."],
		["Flöte", [1, 0.14, 0.05, 0.02, 0, 0, 0, 0], "Fast nur der Grundton: weich, rein, etwas hauchig."],
		["Klarinette", [1, 0, 0.55, 0, 0.35, 0, 0.18, 0], "Nur die ungeraden Obertöne (3., 5., 7.): hohl und holzig."],
		["Geige", [1, 0.5, 0.33, 0.25, 0.2, 0.17, 0.14, 0.12], "Alle Obertöne, jeder etwas leiser als der vorige: hell und singend."],
		["Trompete", [0.7, 0.9, 0.85, 0.65, 0.5, 0.35, 0.22, 0.12], "Die Obertöne sind teils lauter als der Grundton: strahlend, fast schneidend."],
		["Orgel", [1, 0.75, 0, 0.55, 0, 0, 0, 0.4], "Ausgewählte Oktaven übereinander, wie bei Orgelregistern: voll und feierlich."],
	];
	let amps = PRESETS[3][1].slice();
	let current = 3;
	let voice = null;
	let on = false;
	let drag = null;

	function applyWave() {
		if (!voice) return;
		const ac = audioCtx;
		const real = new Float32Array(N + 1);
		const imag = new Float32Array(N + 1);
		amps.forEach((a, i) => (imag[i + 1] = a));
		voice.osc.setPeriodicWave(ac.createPeriodicWave(real, imag));
		const sum = amps.reduce((s, a) => s + a, 0) || 1;
		voice.set(BASE, on ? 0.16 / Math.max(1, sum * 0.6) : 0);
	}
	function choose(i) {
		current = i;
		amps = PRESETS[i][1].slice();
		presetsBox.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
		note.textContent = PRESETS[i][2];
		applyWave();
	}
	PRESETS.forEach(([name], i) => {
		const b = document.createElement("button");
		b.className = "btn";
		b.type = "button";
		b.textContent = name;
		b.addEventListener("click", () => choose(i));
		presetsBox.appendChild(b);
	});
	btn.addEventListener("click", () => {
		if (!voice) voice = makeVoice("sine");
		on = !on;
		btn.setAttribute("aria-pressed", String(on));
		btn.textContent = on ? "🔇 Ton aus" : "🔊 Ton an";
		applyWave();
	});
	choose(3);

	const bars = () => {
		const { w, h } = size;
		const top = 50;
		const bottom = h * 0.52;
		const gap = 8;
		const bw = (w - 32 - gap * (N - 1)) / N;
		return { top, bottom, bw, gap, x: (i) => 16 + i * (bw + gap) };
	};
	function setFrom(e) {
		const r = canvas.getBoundingClientRect();
		const x = e.clientX - r.left;
		const y = e.clientY - r.top;
		const b = bars();
		const i = drag !== null ? drag : Math.floor((x - 16) / (b.bw + b.gap));
		if (i < 0 || i >= N) return;
		drag = i;
		amps[i] = clamp((b.bottom - y) / (b.bottom - b.top), 0, 1);
		current = -1;
		presetsBox.querySelectorAll("button").forEach((bt) => bt.setAttribute("aria-pressed", "false"));
		note.textContent = "Dein eigenes Instrument! Achte darauf: Der Ton bleibt gleich hoch, nur der Klang ändert sich.";
		applyWave();
	}
	canvas.addEventListener("pointerdown", (e) => {
		const r = canvas.getBoundingClientRect();
		if (e.clientY - r.top > bars().bottom + 20) return;
		drag = null;
		canvas.setPointerCapture(e.pointerId);
		setFrom(e);
	});
	canvas.addEventListener("pointermove", (e) => drag !== null && setFrom(e));
	canvas.addEventListener("pointerup", () => (drag = null));
	canvas.addEventListener("pointercancel", () => (drag = null));

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		const b = bars();
		ctx.font = `${w < 520 ? 10 : 11}px 'Space Grotesk', sans-serif`;
		ctx.textAlign = "center";
		amps.forEach((a, i) => {
			const x = b.x(i);
			ctx.fillStyle = "rgba(255,255,255,0.05)";
			ctx.fillRect(x, b.top, b.bw, b.bottom - b.top);
			const g = ctx.createLinearGradient(0, b.bottom, 0, b.top);
			g.addColorStop(0, ORANGE);
			g.addColorStop(1, LIME);
			ctx.fillStyle = g;
			const hh = (b.bottom - b.top) * a;
			ctx.fillRect(x, b.bottom - hh, b.bw, hh);
			ctx.fillStyle = "rgba(244,239,230,0.7)";
			ctx.fillText(`${i + 1}×`, x + b.bw / 2, b.bottom + 14);
			ctx.fillStyle = "rgba(244,239,230,0.4)";
			ctx.fillText(`${BASE * (i + 1)}`, x + b.bw / 2, b.bottom + 27);
		});
		ctx.textAlign = "left";
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.fillText("Grundton und Obertöne · ziehen zum Ändern", 16, 42);

		// Entstehende Welle: zwei Perioden
		const wy = h * 0.79;
		const wa = h * 0.13;
		const sum = amps.reduce((s, a) => s + a, 0) || 1;
		const drift = time * 0.4;
		ctx.strokeStyle = "rgba(244,239,230,0.18)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		for (let i = 0; i <= 400; i++) {
			const u = (i / 400) * 2;
			const y = wy - Math.sin((u + drift) * Math.PI * 2) * wa * 0.6;
			i === 0 ? ctx.moveTo(16 + (i / 400) * (w - 32), y) : ctx.lineTo(16 + (i / 400) * (w - 32), y);
		}
		ctx.stroke();
		ctx.strokeStyle = ORANGE;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		for (let i = 0; i <= 600; i++) {
			const u = (i / 600) * 2 + drift;
			let v = 0;
			amps.forEach((a, k) => (v += a * Math.sin(u * Math.PI * 2 * (k + 1))));
			const y = wy - (v / Math.max(sum * 0.7, 1)) * wa;
			const x = 16 + (i / 600) * (w - 32);
			i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
		}
		ctx.stroke();
		ctx.fillStyle = "rgba(244,239,230,0.45)";
		ctx.fillText("grau: nur Grundton · orange: was du hörst", 16, h - 10);
	});
})();

// =====================================================================
// 4 · Gitarrensaite zum Zupfen
// =====================================================================
(() => {
	const canvas = document.getElementById("stringCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.25 : 2.1));
	const fretsBox = document.getElementById("frets");
	const out = document.getElementById("stringOut");
	const note = document.getElementById("stringNote");
	const OPEN = 110;
	const FRETS = [
		["Ganze Saite", 1, "Leere Saite: 110 Hz, ein tiefes A."],
		["½ · Oktave", 1 / 2, "Halbe Saite: doppelte Frequenz (220 Hz), genau eine Oktave höher."],
		["⅔ · Quinte", 2 / 3, "Zwei Drittel der Länge: 1,5-fache Frequenz (165 Hz), eine Quinte höher."],
		["¾ · Quarte", 3 / 4, "Drei Viertel der Länge: Frequenz mal 4/3 (147 Hz), eine Quarte höher."],
		["⅘ · Terz", 4 / 5, "Vier Fünftel der Länge: Frequenz mal 5/4 (138 Hz), eine große Terz höher."],
	];
	let frac = 1;
	let fretText = FRETS[0][2];
	let modes = [];
	let t0 = 0;
	let lastP = 0.5;

	FRETS.forEach(([label, f, text], i) => {
		const b = document.createElement("button");
		b.className = "btn";
		b.type = "button";
		b.textContent = label;
		b.setAttribute("aria-pressed", String(i === 0));
		b.addEventListener("click", () => {
			frac = f;
			fretText = text;
			fretsBox.querySelectorAll("button").forEach((x, j) => x.setAttribute("aria-pressed", String(j === i)));
			out.textContent = `${nf(OPEN / f)} Hz · ${noteName(OPEN / f)}`;
			pluck(0.25);
		});
		fretsBox.appendChild(b);
	});
	out.textContent = `${OPEN} Hz · ${noteName(OPEN)}`;

	function pluck(p) {
		p = clamp(p, 0.03, 0.97);
		lastP = p;
		// Dreieckige Auslenkung an Stelle p → Anteile der Eigenschwingungen
		modes = [];
		for (let n = 1; n <= 16; n++) modes.push((2 / (n * n * Math.PI * Math.PI * p * (1 - p))) * Math.sin(n * Math.PI * p));
		t0 = performance.now() / 1000;
		const f0 = OPEN / frac;
		playBuffer((d, sr) => {
			for (let n = 1; n <= 24; n++) {
				const fn = f0 * n;
				if (fn > 9000) break;
				const a = (2 / (n * n * Math.PI * Math.PI * p * (1 - p))) * Math.sin(n * Math.PI * p);
				if (Math.abs(a) < 1e-4) continue;
				const decay = 1.1 + n * 0.55;
				const wv = (2 * Math.PI * fn) / sr;
				for (let i = 0; i < d.length; i++) d[i] += a * Math.exp((-decay * i) / sr) * Math.sin(wv * i);
			}
			let m = 0;
			for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
			const g = 0.5 / (m || 1);
			for (let i = 0; i < d.length; i++) d[i] *= g * Math.min(1, i / 60);
		}, 2.6);
		const edge = p < 0.15 || p > 0.85;
		const mid = p > 0.38 && p < 0.62;
		note.textContent = `${fretText} ${mid ? "In der Mitte gezupft: kaum Obertöne, der Klang ist weich und rund." : edge ? "Nah am Rand gezupft: viele Obertöne, der Klang wird hell und drahtig." : "Probier auch die Mitte und den Rand."}`;
	}

	function geo() {
		const { w, h } = size;
		const x0 = w * 0.05;
		const x1 = w * 0.95;
		const xf = x1 - (x1 - x0) * frac;
		return { x0, x1, xf, y: h * 0.36 };
	}
	canvas.addEventListener("pointerdown", (e) => {
		const r = canvas.getBoundingClientRect();
		const x = e.clientX - r.left;
		const { xf, x1 } = geo();
		pluck((x - xf) / (x1 - xf));
	});

	whenVisible(canvas, () => {
		const { w, h } = size;
		const { x0, x1, xf, y } = geo();
		const t = performance.now() / 1000 - t0;
		const fv = 1.3 / frac; // Zeitlupe
		const amp = h * 0.13;

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		// Griffbrett
		ctx.fillStyle = "#2a1c12";
		ctx.fillRect(x0, y - 26, x1 - x0, 52);
		ctx.strokeStyle = "rgba(220,200,170,0.25)";
		ctx.lineWidth = 2;
		for (const f of [1 / 2, 2 / 3, 3 / 4, 4 / 5]) {
			const x = x1 - (x1 - x0) * f;
			ctx.beginPath();
			ctx.moveTo(x, y - 26);
			ctx.lineTo(x, y + 26);
			ctx.stroke();
		}
		ctx.fillStyle = "#e9e3d6";
		ctx.fillRect(x0 - 4, y - 28, 6, 56);
		ctx.fillRect(x1 - 2, y - 28, 6, 56);

		const shape = (u) => {
			let v = 0;
			modes.forEach((a, k) => {
				const n = k + 1;
				v += a * Math.sin(n * Math.PI * u) * Math.cos(2 * Math.PI * n * fv * t) * Math.exp(-t * (0.5 + n * 0.25));
			});
			return v;
		};
		// toter Teil der Saite (hinter dem Finger)
		ctx.strokeStyle = "rgba(220,220,230,0.4)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(x0, y);
		ctx.lineTo(xf, y);
		ctx.stroke();
		// schwingender Teil
		ctx.strokeStyle = "#e6e9ef";
		ctx.lineWidth = 2.5;
		ctx.shadowColor = ORANGE;
		ctx.shadowBlur = 6;
		ctx.beginPath();
		for (let i = 0; i <= 200; i++) {
			const u = i / 200;
			const x = lerp(xf, x1, u);
			const yy = y - shape(u) * amp;
			i === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
		}
		ctx.stroke();
		ctx.shadowBlur = 0;
		if (frac < 1) {
			ctx.fillStyle = ORANGE;
			ctx.beginPath();
			ctx.arc(xf, y, 9, 0, Math.PI * 2);
			ctx.fill();
		}

		// Die ersten drei Eigenschwingungen einzeln
		const my0 = h * 0.66;
		const mh = h * 0.1;
		ctx.font = "11px 'Space Grotesk', sans-serif";
		ctx.textAlign = "left";
		["Grundton", "2. Teilton", "3. Teilton"].forEach((label, k) => {
			const yy = my0 + k * (mh + 4);
			const a = modes[k] ? Math.abs(modes[k]) : 0;
			const n = k + 1;
			const env = Math.exp(-t * (0.5 + n * 0.25));
			ctx.fillStyle = "rgba(244,239,230,0.45)";
			ctx.fillText(`${label}${modes.length ? ` · ${nf(a * 100)} %` : ""}`, 12, yy + 4);
			ctx.strokeStyle = `rgba(255,159,107,${0.25 + clamp(a * env, 0, 1) * 0.75})`;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			const xa = w * 0.32;
			const xb = w * 0.95;
			for (let i = 0; i <= 120; i++) {
				const u = i / 120;
				const v = Math.sin(n * Math.PI * u) * Math.cos(2 * Math.PI * n * fv * t) * a * env;
				const x = lerp(xa, xb, u);
				const y2 = yy - v * mh * 1.6;
				i === 0 ? ctx.moveTo(x, y2) : ctx.lineTo(x, y2);
			}
			ctx.stroke();
		});
	});
})();

// =====================================================================
// 5 · Intervalle und Schwebung
// =====================================================================
(() => {
	const canvas = document.getElementById("intCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 640 ? 1.15 : 2.6));
	const box = document.getElementById("intervals");
	const tag = document.getElementById("intTag");
	const note = document.getElementById("intNote");
	const btn = document.getElementById("btnInt");
	const INTERVALS = [
		["Oktave", 2, 1, "Das Muster wiederholt sich nach jeder Schwingung des tiefen Tons. Beide Töne verschmelzen fast zu einem: Deshalb heißen sie gleich (A und A)."],
		["Quinte", 3, 2, "Wiederholung nach 2 Schwingungen: sehr stabil, offen und kraftvoll. Der „Power-Chord“ fast jedes Rocksongs."],
		["Quarte", 4, 3, "Wiederholung nach 3 Schwingungen: noch rund, etwas schwebender. Steckt im Anfang von „Here Comes the Bride“."],
		["Große Terz", 5, 4, "Wiederholung nach 4 Schwingungen: warm und fröhlich. Sie macht einen Dur-Akkord hell."],
		["Halbton", 16, 15, "Das Muster wiederholt sich erst nach 15 Schwingungen: Für das Ohr ist das kein Muster mehr, es reibt und kratzt (Hai-Musik aus „Der weiße Hai“)."],
		["Tritonus", 45, 32, "Ein krummes Verhältnis ohne erkennbares Muster: spannungsgeladen und unheimlich. Im Mittelalter nannte man ihn „Teufel in der Musik“."],
		["Fast gleich", 51, 50, "Zwei fast gleiche Töne: Mal verstärken sie sich, mal löschen sie sich aus. Es wummert langsam, das ist die Schwebung."],
	];
	let cur = 1;
	let playing = null;

	INTERVALS.forEach(([name], i) => {
		const b = document.createElement("button");
		b.className = "btn";
		b.type = "button";
		b.textContent = name;
		b.setAttribute("aria-pressed", String(i === cur));
		b.addEventListener("click", () => {
			cur = i;
			box.querySelectorAll("button").forEach((x, j) => x.setAttribute("aria-pressed", String(j === i)));
			update();
			play();
		});
		box.appendChild(b);
	});
	function update() {
		const [name, p, q, text] = INTERVALS[cur];
		tag.textContent = `${name} · ${p} : ${q}`;
		note.textContent = text;
	}
	function play() {
		if (playing) playing.stop();
		const [, p, q] = INTERVALS[cur];
		const f1 = 220;
		const f2 = (f1 * p) / q;
		const dur = cur === 6 ? 4 : 2;
		playing = playBuffer((d, sr) => {
			for (let i = 0; i < d.length; i++) {
				const t = i / sr;
				const env = Math.min(1, t / 0.05) * Math.min(1, (dur - t) / 0.3);
				let v = 0;
				for (let n = 1; n <= 3; n++) v += (Math.sin(2 * Math.PI * f1 * n * t) + Math.sin(2 * Math.PI * f2 * n * t)) / (n * n);
				d[i] = v * env * 0.16;
			}
		}, dur);
	}
	btn.addEventListener("click", play);
	update();

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const [, p, q] = INTERVALS[cur];
		const ratio = p / q;
		const beats = cur === 6;
		const periods = beats ? 60 : 8; // Schwingungen des tiefen Tons im Bild
		const drift = beats ? time * 2 : time * 0.6;
		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		const lanes = [
			["tiefer Ton", (u) => Math.sin(2 * Math.PI * u), "rgba(244,239,230,0.6)"],
			["hoher Ton", (u) => Math.sin(2 * Math.PI * u * ratio), "#ff9f6b"],
			["beide zusammen", (u) => (Math.sin(2 * Math.PI * u) + Math.sin(2 * Math.PI * u * ratio)) / 2, "#ffe14d"],
		];
		const lh = (h - 52) / 3;
		ctx.font = "11px 'Space Grotesk', sans-serif";
		lanes.forEach(([label, fn, col], k) => {
			const y = 36 + k * lh + lh / 2;
			ctx.fillStyle = "rgba(244,239,230,0.45)";
			ctx.textAlign = "left";
			ctx.fillText(label, 12, y - lh * 0.36);
			ctx.strokeStyle = col;
			ctx.lineWidth = k === 2 ? 2.5 : 1.6;
			ctx.beginPath();
			const n = beats ? 2400 : 800;
			for (let i = 0; i <= n; i++) {
				const u = (i / n) * periods + drift;
				const x = 12 + (i / n) * (w - 24);
				const yy = y - fn(u) * lh * 0.34;
				i === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
			}
			ctx.stroke();
		});
		// Markierungen: hier beginnt das Muster von vorn
		if (q <= 8 && !beats) {
			const off = ((-drift % q) + q) % q;
			ctx.strokeStyle = "rgba(255,225,77,0.35)";
			ctx.setLineDash([3, 4]);
			ctx.lineWidth = 1;
			for (let m = off; m <= periods; m += q) {
				const x = 12 + (m / periods) * (w - 24);
				ctx.beginPath();
				ctx.moveTo(x, 20);
				ctx.lineTo(x, h - 12);
				ctx.stroke();
			}
			ctx.setLineDash([]);
			ctx.fillStyle = "rgba(255,225,77,0.8)";
			ctx.textAlign = "right";
			ctx.fillText("┆ hier wiederholt sich das Muster", w - 12, h - 4);
		}
	});
})();
