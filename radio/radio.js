"use strict";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const nf = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const VIOLET = [199, 155, 255];
const PINK = [255, 111, 177];

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

let noiseBuffer = null;
function getNoise(ac) {
	if (!noiseBuffer) {
		noiseBuffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
		const d = noiseBuffer.getChannelData(0);
		for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
	}
	return noiseBuffer;
}

function formatLength(m) {
	if (m >= 1000) return `${nf(m / 1000, m >= 10000 ? 0 : 1)} km`;
	if (m >= 1) return `${nf(m, m >= 10 ? 0 : 1)} m`;
	if (m >= 0.01) return `${nf(m * 100, m >= 0.1 ? 0 : 1)} cm`;
	return `${nf(m * 1000, 1)} mm`;
}
function formatFreq(f) {
	if (f >= 1e9) return `${nf(f / 1e9, f >= 1e10 ? 0 : 2)} GHz`;
	if (f >= 1e6) return `${nf(f / 1e6, f >= 1e8 ? 0 : 1)} MHz`;
	return `${nf(f / 1e3, 0)} kHz`;
}

// =====================================================================
// 1 · Sender und Empfänger: Wellen breiten sich aus
// =====================================================================
(() => {
	const canvas = document.getElementById("waveCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1 : 1.45));
	const btn = document.getElementById("btnTx");
	const freq = document.getElementById("txFreq");
	const freqOut = document.getElementById("txFreqOut");
	const note = document.getElementById("waveNote");

	const RATE = 240;
	const hist = new Float32Array(RATE * 10);
	let pos = 0;
	let acc = 0;
	const s = { on: false, amp: 0, phase: 0, onAt: 0, offAt: -1, rx: 0 };
	const SPEED = 120; // px pro Sekunde

	const fOf = () => lerp(0.25, 1.6, Number(freq.value) / 100);
	freq.addEventListener("input", () => {
		const v = Number(freq.value);
		freqOut.textContent = v < 33 ? "langsam" : v < 66 ? "mittel" : "schnell";
	});
	btn.addEventListener("click", () => {
		s.on = !s.on;
		btn.setAttribute("aria-pressed", String(s.on));
		btn.textContent = s.on ? "Sender aus" : "Senden";
		if (s.on) s.onAt = performance.now() / 1000;
		else s.offAt = performance.now() / 1000;
	});

	function sample(delay) {
		const back = Math.round(delay * RATE);
		if (back >= hist.length) return 0;
		return hist[(pos - back + hist.length) % hist.length];
	}

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const now = performance.now() / 1000;
		s.amp += ((s.on ? 1 : 0) - s.amp) * Math.min(1, dt * 4);
		s.phase += Math.PI * 2 * fOf() * dt;
		const I = s.amp * Math.sin(s.phase);
		acc += dt * RATE;
		while (acc >= 1) {
			acc -= 1;
			pos = (pos + 1) % hist.length;
			hist[pos] = I;
		}

		const sx = w * 0.13;
		const rx = w * 0.87;
		const cy = h * 0.5;
		const ah = h * 0.26;

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		// Feld als Raster: Wert = Senderstrom von vor r/c Sekunden
		const cell = w < 520 ? 8 : 7;
		for (let y = cell / 2; y < h; y += cell) {
			for (let x = cell / 2; x < w; x += cell) {
				const r = Math.hypot(x - sx, (y - cy) * 1.1);
				if (r < 10) continue;
				const v = sample(r / SPEED) / Math.sqrt(Math.max(r, 40) / 40);
				const a = Math.min(1, Math.abs(v)) * 0.5;
				if (a < 0.02) continue;
				const c = v > 0 ? VIOLET : PINK;
				ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
				ctx.fillRect(x - cell / 2, y - cell / 2, cell - 1, cell - 1);
			}
		}

		const er = sample((rx - sx) / SPEED) / Math.sqrt((rx - sx) / 40);
		s.rx += (Math.abs(er) - s.rx) * Math.min(1, dt * 6);

		// Antennen mit Elektronen
		for (const [x, val, label] of [
			[sx, I, "Sender"],
			[rx, er * 2.2, "Empfänger"],
		]) {
			ctx.strokeStyle = "#9aa0a8";
			ctx.lineWidth = 5;
			ctx.beginPath();
			ctx.moveTo(x, cy - ah);
			ctx.lineTo(x, cy + ah);
			ctx.stroke();
			ctx.fillStyle = "#59b8ff";
			for (let i = 0; i < 7; i++) {
				const y = cy - ah * 0.8 + (i * ah * 1.6) / 6 + val * ah * 0.16;
				ctx.beginPath();
				ctx.arc(x, y, 3, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.fillStyle = "rgba(244,239,230,0.6)";
			ctx.font = "12px 'Space Grotesk', sans-serif";
			ctx.textAlign = "center";
			ctx.fillText(label, x, cy + ah + 22);
		}
		// Empfangs-Lämpchen
		const glow = clamp(s.rx * 3, 0, 1);
		ctx.fillStyle = `rgba(${Math.round(lerp(60, 199, glow))},${Math.round(lerp(55, 155, glow))},${Math.round(lerp(70, 255, glow))},1)`;
		ctx.shadowColor = "rgba(199,155,255,0.9)";
		ctx.shadowBlur = glow * 24;
		ctx.beginPath();
		ctx.arc(rx, cy - ah - 16, 7, 0, Math.PI * 2);
		ctx.fill();
		ctx.shadowBlur = 0;

		const travel = (rx - sx) / SPEED;
		if (s.on && now - s.onAt < travel) note.textContent = "Die Welle ist unterwegs. Am Empfänger ist noch nichts angekommen …";
		else if (s.on) note.textContent = "Angekommen! Die Elektronen im Empfänger schwingen im selben Takt mit, nur etwas später.";
		else if (s.offAt > 0 && now - s.offAt < travel + 0.5)
			note.textContent = "Der Sender ist schon still, aber die letzten Wellen sind noch unterwegs. Einmal abgeschickt, fliegen sie weiter.";
		else note.textContent = "Der Sender ist aus. Die Elektronen in beiden Antennen ruhen.";
	});
})();

// =====================================================================
// 2 · Frequenz und Wellenlänge
// =====================================================================
(() => {
	const canvas = document.getElementById("lambdaCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.1 : 1.5));
	const slider = document.getElementById("f");
	const fOut = document.getElementById("fOut");
	const lOut = document.getElementById("lambdaOut");
	const tag = document.getElementById("bandTag");
	const note = document.getElementById("lambdaNote");
	const C = 3e8;
	const MIN = Math.log10(5e4);
	const MAX = 10;
	const fOf = () => Math.pow(10, MIN + ((MAX - MIN) * Number(slider.value)) / 1000);

	const BANDS = [
		[4.9e4, 3e5, "Langwelle", "Funkuhren stellen sich nach dem Sender DCF77 bei Frankfurt (77,5 kHz). Seine Welle ist fast 4 km lang."],
		[5.26e5, 1.606e6, "Mittelwelle", "Klassisches AM-Radio. Nachts wird die Welle an der Ionosphäre zurückgeworfen und reicht über ganz Europa."],
		[3e6, 3e7, "Kurzwelle", "Weltempfänger und Funkamateure: Die Wellen springen zwischen Ionosphäre und Erde einmal um den Globus."],
		[8.75e7, 1.08e8, "UKW-Radio", "FM-Radio. Die Welle geht geradeaus und reicht ungefähr bis zum Horizont."],
		[1.74e8, 2.3e8, "DAB+", "Digitalradio: Mehrere Sender teilen sich ein Frequenzband und werden als Zahlen übertragen."],
		[2.4e9, 2.5e9, "WLAN · Mikrowelle", "WLAN, Bluetooth und dein Mikrowellenherd (2,45 GHz) nutzen dasselbe Band."],
		[5.15e9, 5.85e9, "WLAN 5 GHz", "Schnelleres WLAN mit kürzeren Wellen. Dafür kommt es schlechter durch Wände."],
		[7e8, 3.8e9, "Mobilfunk", "4G und 5G nutzen Bänder zwischen 700 MHz und 3,8 GHz."],
	];
	const OBJECTS = [
		["Kreditkarte", 0.086],
		["Handy", 0.15],
		["Fußball", 0.22],
		["Gitarre", 1.0],
		["Mensch", 1.8],
		["Linienbus", 12],
		["Kölner Dom", 157],
		["Fußballfeld", 105],
		["Berliner Fernsehturm", 368],
		["Zugspitze", 2962],
	];

	function band(f) {
		const b = BANDS.find(([a, z]) => f >= a && f <= z);
		if (b) return [b[2], b[3]];
		if (f < 3e6) return ["Mittel- und Langwellen", "Zwischen den Radiobändern funken Schiffe, Flugfunkfeuer und Behörden."];
		if (f < 3e7) return ["Kurzwellenbereich", "Hier funken Flugzeuge über dem Ozean, Militär und Wetterdienste."];
		if (f < 3e8) return ["UKW-Bereich", "Polizei, Feuerwehr, Flugfunk und Amateurfunk teilen sich diese Frequenzen."];
		if (f < 3e9) return ["Dezimeterwellen", "Fernsehen über Antenne, GPS (1,58 GHz) und Satellitentelefone."];
		return ["Zentimeterwellen", "Radar, Satellitenfernsehen und Richtfunk zwischen Funktürmen."];
	}

	function update() {
		const f = fOf();
		const lambda = C / f;
		fOut.textContent = formatFreq(f);
		lOut.textContent = `λ = ${formatLength(lambda)}`;
		const [name, text] = band(f);
		tag.textContent = name;
		note.textContent = `${text} Passende Antenne (λ/4): ${formatLength(lambda / 4)}.`;
	}
	slider.addEventListener("input", update);
	update();

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const f = fOf();
		const lambda = C / f;
		const pad = 18;
		const waves = 2;
		const pxPerM = (w - 2 * pad) / (waves * lambda);
		const mid = h * 0.36;
		const amp = h * 0.16;

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		// Welle läuft nach rechts
		const shift = (time * 0.35) % 1;
		ctx.strokeStyle = "#c79bff";
		ctx.lineWidth = 3;
		ctx.beginPath();
		for (let i = 0; i <= 300; i++) {
			const x = pad + ((w - 2 * pad) * i) / 300;
			const ph = (i / 300) * waves - shift;
			const y = mid - Math.sin(ph * Math.PI * 2) * amp;
			i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
		}
		ctx.stroke();

		// Wellenlänge zwischen zwei Bergen
		const crest = (k) => pad + ((k + 0.25 + shift) / waves) * (w - 2 * pad);
		const x1 = crest(shift > 0.75 ? -1 : 0);
		const x2 = x1 + lambda * pxPerM;
		ctx.strokeStyle = "rgba(255,111,177,0.9)";
		ctx.fillStyle = "rgba(255,111,177,0.9)";
		ctx.lineWidth = 1.5;
		const yb = mid - amp - 16;
		ctx.beginPath();
		ctx.moveTo(x1, yb);
		ctx.lineTo(x2, yb);
		ctx.moveTo(x1, yb - 6);
		ctx.lineTo(x1, yb + 6);
		ctx.moveTo(x2, yb - 6);
		ctx.lineTo(x2, yb + 6);
		ctx.stroke();
		ctx.font = "13px 'Space Grotesk', sans-serif";
		ctx.textAlign = "center";
		ctx.fillText(`eine Wellenlänge: ${formatLength(lambda)}`, (x1 + x2) / 2, yb - 8);

		// Größenvergleich: das Objekt, das am besten zur halben Wellenlänge passt
		let best = OBJECTS[0];
		let bestScore = Infinity;
		for (const o of OBJECTS) {
			const score = Math.abs(Math.log(o[1] / (lambda * 0.45)));
			if (score < bestScore) {
				bestScore = score;
				best = o;
			}
		}
		const rows = [
			[`${best[0]} · ${formatLength(best[1])}`, best[1], "#e9e3d6"],
			[`Antenne (λ/4) · ${formatLength(lambda / 4)}`, lambda / 4, "#59b8ff"],
		];
		rows.forEach(([label, len, col], i) => {
			const y = h * 0.68 + i * 38;
			const L = len * pxPerM;
			ctx.fillStyle = col;
			ctx.fillRect(pad, y, Math.max(2, Math.min(L, w - 2 * pad)), 10);
			ctx.fillStyle = "rgba(244,239,230,0.65)";
			ctx.textAlign = "left";
			ctx.fillText(label, pad, y - 6);
		});
	});
})();

// =====================================================================
// 3 · AM und FM, mit und ohne Gewitter
// =====================================================================
(() => {
	const canvas = document.getElementById("modCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.9 : 1.2));
	const btnAM = document.getElementById("btnAM");
	const btnFM = document.getElementById("btnFM");
	const btnStorm = document.getElementById("btnStorm");
	const btnPlay = document.getElementById("btnModPlay");
	const tag = document.getElementById("modTag");
	const note = document.getElementById("modNote");
	const s = { fm: false, storm: false, t0: 0 };

	const hash = (k, salt) => {
		const x = Math.sin(k * 127.1 + salt * 311.7) * 43758.5453;
		return x - Math.floor(x);
	};
	const m = (t) => 0.6 * Math.sin(2 * Math.PI * 1.5 * t) + 0.3 * Math.sin(2 * Math.PI * 3.1 * t + 1);
	const mInt = (t) => (-0.6 * Math.cos(2 * Math.PI * 1.5 * t)) / (2 * Math.PI * 1.5) - (0.3 * Math.cos(2 * Math.PI * 3.1 * t + 1)) / (2 * Math.PI * 3.1);
	const CARRIER = 28;
	const STEP = 0.13;
	function strike(t) {
		let v = 0;
		let env = 0;
		const k0 = Math.floor(t / STEP);
		for (let k = k0 - 1; k <= k0 + 1; k++) {
			if (hash(k, 1) > 0.45) continue;
			const A = 0.6 + hash(k, 2) * 0.9;
			const d = t - (k * STEP + hash(k, 3) * STEP);
			const e = A * Math.exp(-Math.abs(d) * 45);
			env += e;
			v += e * Math.sin(d * 900);
		}
		return [v, env];
	}

	function setMode(fm) {
		s.fm = fm;
		btnAM.setAttribute("aria-pressed", String(!fm));
		btnFM.setAttribute("aria-pressed", String(fm));
		tag.textContent = fm ? "FM" : "AM";
		updateNote();
	}
	function updateNote() {
		if (!s.fm && !s.storm) note.textContent = "AM: Die Umrisse der Welle (die Hüllkurve) haben genau die Form der Musik.";
		else if (s.fm && !s.storm) note.textContent = "FM: Die Welle bleibt gleich stark, wird aber im Takt der Musik dichter und lockerer.";
		else if (!s.fm) note.textContent = "Jeder Blitz verändert die Stärke der Welle, und genau die liest der AM-Empfänger aus. Es knackt.";
		else note.textContent = "Die Blitze verändern nur die Stärke. Der FM-Empfänger achtet aber nur auf den Takt der Schwingung und schneidet die Stärke einfach ab.";
	}
	btnAM.addEventListener("click", () => setMode(false));
	btnFM.addEventListener("click", () => setMode(true));
	btnStorm.addEventListener("click", () => {
		s.storm = !s.storm;
		btnStorm.setAttribute("aria-pressed", String(s.storm));
		updateNote();
	});
	updateNote();

	function lane(y, h, title, fn, color, n = 300) {
		const { w } = size;
		ctx.save();
		ctx.beginPath();
		ctx.rect(10, y, w - 20, h);
		ctx.clip();
		ctx.fillStyle = "rgba(255,255,255,0.03)";
		ctx.fillRect(10, y, w - 20, h);
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.font = "12px 'Space Grotesk', sans-serif";
		ctx.textAlign = "left";
		ctx.fillText(title, 18, y + 15);
		ctx.strokeStyle = color;
		ctx.lineWidth = 1.6;
		ctx.beginPath();
		const mid = y + h * 0.58;
		for (let i = 0; i <= n; i++) {
			const u = i / n;
			const v = fn(s.t0 + u);
			const x = 10 + (w - 20) * u;
			const yy = mid - v * h * 0.36;
			i === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
		}
		ctx.stroke();
		ctx.restore();
	}

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		s.t0 += dt * 0.12;
		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		const gap = 6;
		const y0 = 34;
		const lh = (h - y0 - 10 - gap * 3) / 4;
		const sent = (t) => {
			const base = s.fm ? Math.cos(2 * Math.PI * (CARRIER * t + CARRIER * 0.35 * mInt(t))) : ((1 + 0.75 * m(t)) / 1.75) * Math.cos(2 * Math.PI * CARRIER * t);
			return s.storm ? base + strike(t)[0] * 0.9 : base;
		};
		const received = (t) => {
			if (s.fm) return m(t);
			return s.storm ? m(t) + strike(t)[1] * 1.6 : m(t);
		};
		lane(y0, lh, "1 · Musik", m, "#ffe14d", 200);
		lane(y0 + lh + gap, lh, "2 · Trägerwelle", (t) => Math.cos(2 * Math.PI * CARRIER * t), "rgba(244,239,230,0.6)", 700);
		lane(y0 + 2 * (lh + gap), lh, `3 · Gesendet: ${s.fm ? "FM" : "AM"}${s.storm ? " + Blitze" : ""}`, sent, "#c79bff", 900);
		lane(y0 + 3 * (lh + gap), lh, "4 · Beim Empfänger herausgeholt", received, s.storm && !s.fm ? "#ff8a7a" : "#7bdc9a", 300);
	});

	// Hörprobe: „Ode an die Freude“, als AM (schmalbandig, im Gewitter knackend) oder FM
	let playing = null;
	btnPlay.addEventListener("click", () => {
		const ac = getAudio();
		if (!ac) return;
		if (playing) {
			playing.stop();
			return;
		}
		const sr = ac.sampleRate;
		const notes = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62];
		const beat = 0.24;
		const len = Math.round(sr * (notes.length * beat + 0.4));
		const buf = ac.createBuffer(1, len, sr);
		const d = buf.getChannelData(0);
		notes.forEach((n, k) => {
			const f = midi(n);
			const start = Math.round(k * beat * sr);
			const dur = Math.round((k === notes.length - 1 ? beat * 2 : beat) * sr);
			for (let i = 0; i < dur && start + i < len; i++) {
				const t = i / sr;
				const env = Math.min(1, t / 0.01) * Math.exp(-t * 3.5);
				let v = 0;
				for (let hN = 1; hN <= 6; hN++) v += Math.sin(2 * Math.PI * f * hN * t) / (hN * 1.4);
				d[start + i] += v * env * 0.22;
			}
		});
		if (!s.fm) {
			// Mittelwelle ist schmal: Tiefpass bei etwa 4,5 kHz, zweistufig
			const a = Math.exp((-2 * Math.PI * 4500) / sr);
			let y1 = 0;
			let y2 = 0;
			for (let i = 0; i < len; i++) {
				y1 = (1 - a) * d[i] + a * y1;
				y2 = (1 - a) * y1 + a * y2;
				d[i] = y2;
			}
		}
		const hiss = s.fm ? 0.004 : 0.012;
		for (let i = 0; i < len; i++) d[i] += (Math.random() * 2 - 1) * hiss;
		if (s.storm && !s.fm) {
			for (let c = 0; c < len / sr * 9; c++) {
				const at = Math.floor(Math.random() * len);
				const blen = Math.floor(sr * (0.004 + Math.random() * 0.05));
				const A = 0.2 + Math.random() * 0.5;
				for (let i = 0; i < blen && at + i < len; i++) d[at + i] += (Math.random() * 2 - 1) * A * Math.exp((-i / blen) * 4);
			}
		}
		const src = ac.createBufferSource();
		src.buffer = buf;
		src.connect(ac.destination);
		src.start();
		playing = src;
		btnPlay.textContent = "■ Stopp";
		src.onended = () => {
			playing = null;
			btnPlay.textContent = "▶ Anhören";
		};
	});
})();

// =====================================================================
// 4 · Radio zum Abstimmen mit vier erzeugten Sendern
// =====================================================================
(() => {
	const canvas = document.getElementById("tuneCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 640 ? 1.5 : 3.1));
	const ui = {
		power: document.getElementById("btnRadio"),
		tune: document.getElementById("tune"),
		tuneOut: document.getElementById("tuneFreqOut"),
		readout: document.getElementById("tuneOut"),
		vol: document.getElementById("vol"),
		volOut: document.getElementById("volOut"),
		note: document.getElementById("tuneNote"),
	};
	const FMIN = 87.5;
	const FMAX = 108;
	const WIDTH = 0.14;
	const STATIONS = [
		{ f: 89.3, name: "Klassik 89", desc: "ein Klavier-Arpeggio" },
		{ f: 93.7, name: "Funkamateur", desc: "jemand morst „CQ CQ DE NEWBOBB“, also: Ruf an alle" },
		{ f: 98.4, name: "Lab FM", desc: "elektronische Musik mit 124 Schlägen pro Minute" },
		{ f: 102.6, name: "Nachrichten", desc: "eine (sehr erfundene) Stimme" },
	];
	const visited = new Uint8Array(420);
	const found = new Set();
	let radio = null;
	let on = false;
	let drag = null;

	const freq = () => Number(ui.tune.value);
	const matchOf = (f) => STATIONS.map((st) => Math.exp(-Math.pow((f - st.f) / WIDTH, 2)));

	function setFreq(f) {
		ui.tune.value = clamp(f, FMIN, FMAX);
		ui.tune.dispatchEvent(new Event("input"));
	}
	ui.tune.addEventListener("input", () => {
		ui.tuneOut.textContent = `${nf(freq(), 1)} MHz`;
		const idx = Math.round(((freq() - FMIN) / (FMAX - FMIN)) * (visited.length - 1));
		for (let i = idx - 3; i <= idx + 3; i++) if (i >= 0 && i < visited.length) visited[i] = 1;
	});
	ui.vol.addEventListener("input", () => {
		ui.volOut.textContent = `${ui.vol.value} %`;
		if (radio && on) radio.master.gain.setTargetAtTime((Number(ui.vol.value) / 100) * 0.8, radio.ac.currentTime, 0.05);
	});

	const xOf = (f, w) => 30 + ((f - FMIN) / (FMAX - FMIN)) * (w - 60);
	canvas.addEventListener("pointerdown", (e) => {
		drag = { x: e.clientX, f: freq() };
		canvas.setPointerCapture(e.pointerId);
	});
	canvas.addEventListener("pointermove", (e) => {
		if (!drag) return;
		const df = ((e.clientX - drag.x) / (size.w - 60)) * (FMAX - FMIN) * 0.6;
		setFreq(drag.f + df);
	});
	const end = () => (drag = null);
	canvas.addEventListener("pointerup", end);
	canvas.addEventListener("pointercancel", end);

	// ---------- Audio ----------
	function buildRadio() {
		const ac = getAudio();
		if (!ac) return null;
		const r = { ac, gains: [], next: [], step: [0, 0, 0, 0] };
		r.master = ac.createGain();
		r.master.gain.value = 0;
		const hp = ac.createBiquadFilter();
		hp.type = "highpass";
		hp.frequency.value = 120;
		const lp = ac.createBiquadFilter();
		lp.type = "lowpass";
		lp.frequency.value = 7500;
		r.master.connect(hp).connect(lp).connect(ac.destination);

		const noise = ac.createBufferSource();
		noise.buffer = getNoise(ac);
		noise.loop = true;
		const nf2 = ac.createBiquadFilter();
		nf2.type = "bandpass";
		nf2.frequency.value = 2500;
		nf2.Q.value = 0.4;
		r.staticGain = ac.createGain();
		r.staticGain.gain.value = 0.4;
		noise.connect(nf2).connect(r.staticGain).connect(r.master);
		noise.start();

		for (let i = 0; i < STATIONS.length; i++) {
			const g = ac.createGain();
			g.gain.value = 0;
			g.connect(r.master);
			r.gains.push(g);
			r.next.push(ac.currentTime + 0.1);
		}

		// Nachrichten-Stimme: Sägezahn durch drei wandernde Formant-Filter
		const vo = ac.createOscillator();
		vo.type = "sawtooth";
		vo.frequency.value = 120;
		r.voiceGate = ac.createGain();
		r.voiceGate.gain.value = 0;
		r.formants = [800, 1200, 2500].map((f, i) => {
			const bp = ac.createBiquadFilter();
			bp.type = "bandpass";
			bp.frequency.value = f;
			bp.Q.value = 8;
			const a = ac.createGain();
			a.gain.value = [1.6, 1.1, 0.5][i];
			vo.connect(bp).connect(a).connect(r.voiceGate);
			return bp;
		});
		r.voiceOsc = vo;
		r.voiceGate.connect(r.gains[3]);
		vo.start();
		return r;
	}

	function tone(r, out, f, t, dur, type, vol) {
		const o = r.ac.createOscillator();
		o.type = type;
		o.frequency.value = f;
		const g = r.ac.createGain();
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(vol, t + 0.008);
		g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
		o.connect(g).connect(out);
		o.start(t);
		o.stop(t + dur + 0.02);
	}

	const CHORDS = [
		[60, 64, 67, 72],
		[57, 60, 64, 69],
		[53, 57, 60, 65],
		[55, 59, 62, 67],
	];
	const MORSE = { C: "-.-.", Q: "--.-", D: "-..", E: ".", N: "-.", W: ".--", B: "-...", O: "---", K: "-.-" };
	const morseEvents = (() => {
		const u = 0.075;
		const ev = [];
		let t = 0;
		for (const ch of "CQ CQ DE NEWBOBB K") {
			if (ch === " ") {
				t += u * 4;
				continue;
			}
			[...MORSE[ch]].forEach((sym, j) => {
				if (j) t += u;
				const d = sym === "." ? u : 3 * u;
				ev.push([t, d]);
				t += d;
			});
			t += u * 3;
		}
		return { ev, total: t + 1.6 };
	})();
	const BASS = [36, 36, 48, 36, 39, 36, 43, 41];
	const VOWELS = [
		[800, 1200, 2500],
		[500, 1900, 2600],
		[300, 2300, 3000],
		[500, 900, 2400],
		[350, 800, 2300],
	];

	function schedule(r) {
		const ahead = r.ac.currentTime + 0.3;
		// Klassik: Arpeggio
		while (r.next[0] < ahead) {
			const k = r.step[0]++;
			const chord = CHORDS[Math.floor(k / 8) % 4];
			const pat = [0, 1, 2, 3, 2, 1, 2, 3];
			tone(r, r.gains[0], midi(chord[pat[k % 8]]), r.next[0], 0.9, "triangle", 0.22);
			if (k % 8 === 0) tone(r, r.gains[0], midi(chord[0] - 12), r.next[0], 1.6, "sine", 0.18);
			r.next[0] += 0.19;
		}
		// Morse
		while (r.next[1] < ahead) {
			for (const [t, d] of morseEvents.ev) {
				const at = r.next[1] + t;
				const o = r.ac.createOscillator();
				o.frequency.value = 680;
				const g = r.ac.createGain();
				g.gain.setValueAtTime(0, at);
				g.gain.linearRampToValueAtTime(0.25, at + 0.005);
				g.gain.setValueAtTime(0.25, at + d - 0.005);
				g.gain.linearRampToValueAtTime(0, at + d);
				o.connect(g).connect(r.gains[1]);
				o.start(at);
				o.stop(at + d + 0.01);
			}
			r.next[1] += morseEvents.total;
		}
		// Lab FM: Kick, Hi-Hat, Bass auf Sechzehnteln
		while (r.next[2] < ahead) {
			const k = r.step[2]++;
			const t = r.next[2];
			if (k % 4 === 0) {
				const o = r.ac.createOscillator();
				o.frequency.setValueAtTime(150, t);
				o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
				const g = r.ac.createGain();
				g.gain.setValueAtTime(0.6, t);
				g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
				o.connect(g).connect(r.gains[2]);
				o.start(t);
				o.stop(t + 0.3);
			}
			if (k % 4 === 2) {
				const n = r.ac.createBufferSource();
				n.buffer = getNoise(r.ac);
				const hpf = r.ac.createBiquadFilter();
				hpf.type = "highpass";
				hpf.frequency.value = 7000;
				const g = r.ac.createGain();
				g.gain.setValueAtTime(0.18, t);
				g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
				n.connect(hpf).connect(g).connect(r.gains[2]);
				n.start(t, Math.random());
				n.stop(t + 0.06);
			}
			if (k % 2 === 0) tone(r, r.gains[2], midi(BASS[(k / 2) % 8]), t, 0.11, "sawtooth", 0.12);
			r.next[2] += 60 / 124 / 4;
		}
		// Nachrichten: Silben mit wechselnden Vokalen
		while (r.next[3] < ahead) {
			const t = r.next[3];
			const k = r.step[3]++;
			const pause = k % 7 === 6;
			const dur = 0.11 + Math.random() * 0.1;
			const v = VOWELS[Math.floor(Math.random() * VOWELS.length)];
			r.formants.forEach((bp, i) => bp.frequency.setTargetAtTime(v[i], t, 0.02));
			r.voiceOsc.frequency.setTargetAtTime(110 + Math.random() * 30 - (k % 7) * 2, t, 0.03);
			r.voiceGate.gain.setTargetAtTime(pause ? 0 : 0.5, t, 0.015);
			r.voiceGate.gain.setTargetAtTime(0, t + dur, 0.02);
			r.next[3] += pause ? 0.35 : dur + 0.04;
		}
	}

	let timer = null;
	ui.power.addEventListener("click", () => {
		if (!radio) radio = buildRadio();
		if (!radio) return;
		on = !on;
		const t = radio.ac.currentTime;
		ui.power.setAttribute("aria-pressed", String(on));
		ui.power.textContent = on ? "⏻ Radio ausschalten" : "⏻ Radio einschalten";
		radio.master.gain.setTargetAtTime(on ? (Number(ui.vol.value) / 100) * 0.8 : 0, t, 0.08);
		if (on) {
			radio.next = radio.next.map(() => radio.ac.currentTime + 0.05);
			schedule(radio);
			timer = setInterval(() => schedule(radio), 100);
		} else {
			clearInterval(timer);
		}
	});

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const f = freq();
		const match = matchOf(f);
		const best = Math.max(...match);
		const bi = match.indexOf(best);

		if (radio && on) {
			const t = radio.ac.currentTime;
			match.forEach((mv, i) => radio.gains[i].gain.setTargetAtTime(mv * 0.9, t, 0.04));
			radio.staticGain.gain.setTargetAtTime(0.03 + 0.5 * Math.pow(1 - best, 1.5), t, 0.04);
		}
		if (best > 0.6 && on) found.add(bi);

		// Gehäuse
		ctx.fillStyle = "#130f0c";
		ctx.fillRect(0, 0, w, h);
		const scaleTop = h * 0.2;
		const scaleH = h * 0.56;
		const panel = ctx.createLinearGradient(0, scaleTop, 0, scaleTop + scaleH);
		panel.addColorStop(0, on ? "#2b2117" : "#1b1712");
		panel.addColorStop(1, on ? "#1d160f" : "#14110e");
		ctx.fillStyle = panel;
		ctx.beginPath();
		ctx.roundRect(14, scaleTop, w - 28, scaleH, 12);
		ctx.fill();
		if (on) {
			ctx.fillStyle = "rgba(255,190,110,0.06)";
			ctx.fillRect(14, scaleTop, w - 28, scaleH);
		}

		// Skala
		ctx.strokeStyle = on ? "rgba(255,220,170,0.75)" : "rgba(255,255,255,0.3)";
		ctx.fillStyle = on ? "rgba(255,220,170,0.85)" : "rgba(255,255,255,0.35)";
		ctx.lineWidth = 1;
		ctx.font = `${w < 640 ? 10 : 12}px 'JetBrains Mono', monospace`;
		ctx.textAlign = "center";
		const base = scaleTop + scaleH * 0.62;
		for (let v = 88; v <= 108; v += 0.5) {
			const x = xOf(v, w);
			const major = v % 2 === 0;
			ctx.beginPath();
			ctx.moveTo(x, base);
			ctx.lineTo(x, base - (major ? 14 : 7));
			ctx.stroke();
			if (major && (w >= 640 || v % 4 === 0)) ctx.fillText(String(v), x, base + 16);
		}
		ctx.fillText("MHz", w - 34, scaleTop + 18);

		// Bereits abgesuchtes Spektrum
		ctx.strokeStyle = "rgba(199,155,255,0.8)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		let pen = false;
		for (let i = 0; i < visited.length; i++) {
			const fv = FMIN + (i / (visited.length - 1)) * (FMAX - FMIN);
			const x = xOf(fv, w);
			const y = base - 22 - Math.max(...matchOf(fv)) * scaleH * 0.32 - Math.sin(i * 1.7 + time * 9) * 1.2;
			if (visited[i]) {
				pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
				pen = true;
			} else pen = false;
		}
		ctx.stroke();

		// Zeiger
		const nx = xOf(f, w);
		ctx.strokeStyle = "#ff5a3d";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.moveTo(nx, scaleTop + 8);
		ctx.lineTo(nx, scaleTop + scaleH - 8);
		ctx.stroke();

		// Signalstärke
		const bars = 8;
		const lit = on ? Math.round(best * bars) : 0;
		for (let i = 0; i < bars; i++) {
			ctx.fillStyle = i < lit ? "#7bdc9a" : "rgba(255,255,255,0.1)";
			ctx.fillRect(24 + i * 9, scaleTop + 10 + (bars - i) * 2, 6, 18 - (bars - i) * 2 + bars * 2 - 16);
		}
		// Lautsprechergitter
		ctx.fillStyle = "rgba(255,255,255,0.05)";
		for (let x = 24; x < w - 24; x += 8) {
			for (let y = scaleTop + scaleH + 12; y < h - 8; y += 8) {
				const pulse = on ? (best > 0.3 ? Math.abs(Math.sin(time * 8 + x * 0.05)) * 0.08 * best : 0) : 0;
				ctx.fillStyle = `rgba(255,255,255,${0.05 + pulse})`;
				ctx.beginPath();
				ctx.arc(x, y, 1.6, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		const st = STATIONS[bi];
		ui.readout.textContent = on && best > 0.6 ? `${nf(f, 1)} MHz · ${st.name}` : `${nf(f, 1)} MHz`;
		if (!on) ui.note.textContent = "Vier Sender sind irgendwo auf der Skala versteckt. Schalte das Radio ein.";
		else if (best > 0.6)
			ui.note.textContent = `Gefunden: ${st.name} auf ${nf(st.f, 1)} MHz, ${st.desc}. Der Schwingkreis schwingt jetzt genau im Takt dieses Senders. (${found.size} von 4)`;
		else if (best > 0.08) ui.note.textContent = "Da ist etwas! Dreh langsam weiter, bis das Rauschen verschwindet.";
		else ui.note.textContent = `Nur Rauschen: die Wärmebewegung der Elektronen im Empfänger und Störungen aus der Umgebung. (${found.size} von 4 gefunden)`;
	});
})();
