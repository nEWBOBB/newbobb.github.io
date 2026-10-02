"use strict";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const nf = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });

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

const MORSE = {
	A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---",
	K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-",
	U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
	0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
};
const DECODE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
const pretty = (code) => code.replace(/\./g, "·").replace(/-/g, "−");

// =====================================================================
// 1 · Telegraf mit Morse-Decoder
// =====================================================================
(() => {
	const canvas = document.getElementById("telCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 640 ? 1.15 : 2));
	const ui = {
		key: document.getElementById("btnKey"),
		text: document.getElementById("morseText"),
		current: document.getElementById("morseCurrent"),
		send: document.getElementById("btnSend"),
		input: document.getElementById("sendText"),
		sound: document.getElementById("btnSound"),
		clear: document.getElementById("btnClear"),
		table: document.getElementById("morseTable"),
	};

	// Morse-Tabelle aufbauen
	const cells = {};
	for (const [ch, code] of Object.entries(MORSE)) {
		const d = document.createElement("div");
		d.innerHTML = `<b>${ch}</b><span>${pretty(code)}</span>`;
		ui.table.appendChild(d);
		cells[ch] = d;
	}

	const TAPE_SPEED = 70; // px pro Sekunde
	const s = {
		down: false,
		arm: 0, // 0 = oben, 1 = unten
		tapeX: 0,
		marks: [], // [start, ende] in Streifen-Koordinaten
		markStart: null,
		symbol: "",
		lastUp: 0,
		downAt: 0,
		wordDone: true,
		auto: null,
		beep: true,
		flow: 0,
	};
	const MANUAL = { dotMax: 240, letterGap: 650, wordGap: 1600 };
	const AUTO_UNIT = 110;
	const AUTO = { dotMax: AUTO_UNIT * 2, letterGap: AUTO_UNIT * 2, wordGap: AUTO_UNIT * 5 };
	let timing = MANUAL;

	// --- Klang ---
	let tone = null;
	function soundDown() {
		const ac = getAudio();
		if (!ac) return;
		const t = ac.currentTime;
		if (s.beep) {
			if (!tone) {
				const o = ac.createOscillator();
				o.frequency.value = 640;
				const g = ac.createGain();
				g.gain.value = 0;
				o.connect(g).connect(ac.destination);
				o.start();
				tone = g;
			}
			tone.gain.cancelScheduledValues(t);
			tone.gain.setTargetAtTime(0.18, t, 0.004);
		} else click(ac, 2200, 0.5);
	}
	function soundUp() {
		const ac = audioCtx;
		if (!ac) return;
		if (s.beep && tone) {
			tone.gain.cancelScheduledValues(ac.currentTime);
			tone.gain.setTargetAtTime(0, ac.currentTime, 0.006);
		} else if (!s.beep) click(ac, 1300, 0.25);
	}
	function click(ac, freq, vol) {
		const len = Math.round(ac.sampleRate * 0.02);
		const buf = ac.createBuffer(1, len, ac.sampleRate);
		const d = buf.getChannelData(0);
		for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
		const src = ac.createBufferSource();
		src.buffer = buf;
		const f = ac.createBiquadFilter();
		f.type = "bandpass";
		f.frequency.value = freq;
		f.Q.value = 2;
		const g = ac.createGain();
		g.gain.value = vol;
		src.connect(f).connect(g).connect(ac.destination);
		src.start();
	}

	// --- Taste ---
	// at: Zeitpunkt der Eingabe (event.timeStamp), damit Verzögerungen beim Abspielen nicht mitgemessen werden
	function press(fromAuto = false, at = performance.now()) {
		if (s.down || (s.auto && !fromAuto)) return;
		s.down = true;
		s.downAt = at;
		s.markStart = s.tapeX;
		ui.key.classList.add("is-down");
		soundDown();
	}
	function release(fromAuto = false, at = performance.now()) {
		if (!s.down || (s.auto && !fromAuto)) return;
		s.down = false;
		const now = at;
		const dur = now - s.downAt;
		s.marks.push([s.markStart, s.tapeX]);
		s.markStart = null;
		s.symbol += dur < timing.dotMax ? "." : "-";
		s.lastUp = now;
		s.wordDone = false;
		ui.key.classList.remove("is-down");
		soundUp();
		renderText();
	}

	ui.key.addEventListener("pointerdown", (e) => {
		e.preventDefault();
		ui.key.setPointerCapture(e.pointerId);
		press(false, e.timeStamp);
	});
	ui.key.addEventListener("pointerup", (e) => release(false, e.timeStamp));
	ui.key.addEventListener("pointercancel", (e) => release(false, e.timeStamp));
	ui.key.addEventListener("contextmenu", (e) => e.preventDefault());
	canvas.addEventListener("pointerdown", (e) => {
		canvas.setPointerCapture(e.pointerId);
		press(false, e.timeStamp);
	});
	canvas.addEventListener("pointerup", (e) => release(false, e.timeStamp));
	canvas.addEventListener("pointercancel", (e) => release(false, e.timeStamp));
	canvas.addEventListener("contextmenu", (e) => e.preventDefault());

	const typing = () => document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName);
	let stageVisible = false;
	new IntersectionObserver(([en]) => (stageVisible = en.isIntersecting)).observe(canvas);
	window.addEventListener("keydown", (e) => {
		if (e.code !== "Space" || typing() || !stageVisible) return;
		e.preventDefault();
		if (!e.repeat) press(false, e.timeStamp);
	});
	window.addEventListener("keyup", (e) => {
		if (e.code !== "Space" || typing()) return;
		release(false, e.timeStamp);
	});

	ui.sound.addEventListener("click", () => {
		s.beep = !s.beep;
		ui.sound.textContent = s.beep ? "Ton: Piepen" : "Ton: Klacken (wie 1850)";
	});
	ui.clear.addEventListener("click", () => {
		s.marks = [];
		decoded = "";
		s.symbol = "";
		renderText();
	});

	// --- Automatisch morsen ---
	ui.send.addEventListener("click", () => {
		if (s.auto) return;
		const text = ui.input.value.toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim();
		if (!text) return;
		getAudio();
		const events = [];
		let t = 0;
		const u = AUTO_UNIT;
		[...text].forEach((ch, i) => {
			if (ch === " ") {
				t += u * 4; // zusammen mit der Buchstabenpause 7 Einheiten
				return;
			}
			[...MORSE[ch]].forEach((sym, j) => {
				if (j > 0) t += u;
				events.push([t, true]);
				t += sym === "." ? u : u * 3;
				events.push([t, false]);
			});
			if (i < text.length - 1) t += u * 3;
		});
		if (decoded && !decoded.endsWith(" ")) decoded += " ";
		timing = AUTO;
		s.auto = { start: performance.now(), events, i: 0 };
		ui.send.disabled = true;
		ui.key.disabled = true;
	});

	function runAuto(now) {
		const a = s.auto;
		if (!a) return;
		const t = now - a.start;
		while (a.i < a.events.length && a.events[a.i][0] <= t) {
			a.events[a.i][1] ? press(true) : release(true);
			a.i++;
		}
		if (a.i >= a.events.length && now - s.lastUp > AUTO.wordGap + 50) {
			s.auto = null;
			timing = MANUAL;
			ui.send.disabled = false;
			ui.key.disabled = false;
		}
	}

	// --- Decoder ---
	let decoded = "";
	let lastHit = null;
	function renderText() {
		ui.text.textContent = decoded.slice(-40);
		ui.current.textContent = pretty(s.symbol);
	}
	function decodeTick(now) {
		if (s.down) return;
		if (s.symbol && now - s.lastUp > timing.letterGap) {
			const ch = DECODE[s.symbol] || "?";
			decoded += ch;
			s.symbol = "";
			if (lastHit) lastHit.classList.remove("is-hit");
			lastHit = cells[ch] || null;
			if (lastHit) lastHit.classList.add("is-hit");
			renderText();
		}
		if (!s.wordDone && !s.symbol && now - s.lastUp > timing.wordGap) {
			s.wordDone = true;
			if (decoded && !decoded.endsWith(" ")) decoded += " ";
			renderText();
		}
	}

	// --- Zeichnen ---
	function circuit(W, H) {
		const L = {
			lineY: H * 0.17,
			bx: W * 0.07,
			batTop: H * 0.3,
			batBot: H * 0.5,
			keyL: W * 0.17,
			keyR: W * 0.3,
			coilX: W * 0.81,
			coilTop: H * 0.36,
			coilBot: H * 0.52,
			groundY: H * 0.62,
			tapeY: H * 0.8,
			tapeH: Math.max(16, H * 0.09),
		};
		L.sx = L.coilX - W * 0.15;
		// Pfad des Stroms: + Pol, Leitung, Taste, Spule, Erde, - Pol
		L.path = [
			[L.bx, L.batTop],
			[L.bx, L.lineY],
			[L.keyL, L.lineY],
			[L.keyR, L.lineY],
			[L.coilX, L.lineY],
			[L.coilX, L.coilTop],
			[L.coilX, L.groundY],
			[L.bx, L.groundY],
			[L.bx, L.batBot],
		];
		return L;
	}

	function pointOnPath(path, d) {
		for (let i = 0; i < path.length - 1; i++) {
			const [ax, ay] = path[i];
			const [bx, by] = path[i + 1];
			const len = Math.hypot(bx - ax, by - ay);
			if (d <= len) return [ax + ((bx - ax) * d) / len, ay + ((by - ay) * d) / len];
			d -= len;
		}
		return path[path.length - 1];
	}
	function pathLength(path) {
		let l = 0;
		for (let i = 0; i < path.length - 1; i++) l += Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
		return l;
	}

	function label(text, x, y, align = "center", color = "rgba(244,239,230,0.55)") {
		ctx.fillStyle = color;
		ctx.textAlign = align;
		ctx.fillText(text, x, y);
	}

	whenVisible(canvas, (dt) => {
		const now = performance.now();
		runAuto(now);
		decodeTick(now);
		const { w: W, h: H } = size;
		const L = circuit(W, H);
		const fs = W < 640 ? 10 : 12;
		ctx.font = `${fs}px 'Space Grotesk', sans-serif`;

		s.tapeX += TAPE_SPEED * dt;
		s.arm += ((s.down ? 1 : 0) - s.arm) * Math.min(1, dt * (s.down ? 40 : 18));
		s.flow += (s.down ? 1 : 0) * dt;

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, W, H);

		const on = s.down;
		const wire = on ? "#e7b25a" : "#5d544a";

		// Leitung oben, Spule, Erde
		ctx.lineWidth = 2;
		ctx.strokeStyle = wire;
		ctx.beginPath();
		ctx.moveTo(L.bx, L.batTop);
		ctx.lineTo(L.bx, L.lineY);
		ctx.lineTo(L.keyL, L.lineY);
		ctx.moveTo(L.keyR, L.lineY);
		ctx.lineTo(L.coilX, L.lineY);
		ctx.lineTo(L.coilX, L.coilTop);
		ctx.moveTo(L.coilX, L.coilBot);
		ctx.lineTo(L.coilX, L.groundY);
		ctx.stroke();

		// Erde als Rückweg
		ctx.setLineDash([4, 5]);
		ctx.strokeStyle = on ? "rgba(231,178,90,0.7)" : "rgba(120,100,80,0.5)";
		ctx.beginPath();
		ctx.moveTo(L.coilX, L.groundY);
		ctx.lineTo(L.bx, L.groundY);
		ctx.lineTo(L.bx, L.batBot);
		ctx.stroke();
		ctx.setLineDash([]);
		for (const gx of [L.bx, L.coilX]) {
			ctx.strokeStyle = "#7a6a58";
			for (let i = 0; i < 3; i++) {
				ctx.beginPath();
				ctx.moveTo(gx - 10 + i * 3, L.groundY + 6 + i * 4);
				ctx.lineTo(gx + 10 - i * 3, L.groundY + 6 + i * 4);
				ctx.stroke();
			}
		}
		label("Rückweg durch die Erde", (L.bx + L.coilX) / 2, L.groundY - 6);

		// Masten
		const poles = W < 640 ? 2 : 4;
		for (let i = 0; i < poles; i++) {
			const px = lerp(L.keyR + W * 0.08, L.coilX - W * 0.1, poles === 1 ? 0.5 : i / (poles - 1));
			ctx.strokeStyle = "#3b322a";
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(px, L.lineY - 6);
			ctx.lineTo(px, L.lineY + H * 0.12);
			ctx.moveTo(px - 8, L.lineY - 2);
			ctx.lineTo(px + 8, L.lineY - 2);
			ctx.stroke();
		}
		label("Leitung · 290 km", (L.keyR + L.coilX) / 2, L.lineY - 10);

		// Batterie
		ctx.fillStyle = "#2a2622";
		ctx.fillRect(L.bx - 12, L.batTop, 24, L.batBot - L.batTop);
		ctx.fillStyle = "#c9a36b";
		ctx.fillRect(L.bx - 12, L.batTop, 24, 6);
		label("+", L.bx + 20, L.batTop + 10, "left", "#e7b25a");
		label("Batterie", L.bx + 18, L.batBot - 2, "left");

		// Taste
		const contactY = L.lineY;
		ctx.fillStyle = "#3a332c";
		ctx.fillRect(L.keyL - 6, L.lineY + 4, L.keyR - L.keyL + 12, 7);
		ctx.fillStyle = "#c9a36b";
		ctx.beginPath();
		ctx.arc(L.keyL + 4, contactY + 1, 3, 0, Math.PI * 2);
		ctx.fill();
		const leverEndY = lerp(L.lineY - 16, L.lineY - 3, on ? 1 : 0);
		ctx.strokeStyle = on ? "#e7b25a" : "#9d8a72";
		ctx.lineWidth = 4;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.moveTo(L.keyR, L.lineY - 2);
		ctx.lineTo(L.keyL, leverEndY);
		ctx.stroke();
		ctx.fillStyle = "#1f1b17";
		ctx.strokeStyle = "#9d8a72";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(L.keyL + 6, leverEndY - 8, 9, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
		ctx.lineCap = "butt";
		label("Taste · Berlin", (L.keyL + L.keyR) / 2, L.lineY + 28);

		// Elektromagnet (zwei Spulen) und Anker
		const cw = W * 0.022;
		for (const off of [-1, 1]) {
			const x = L.coilX + off * cw * 1.5;
			ctx.fillStyle = "#555a60";
			ctx.fillRect(x - cw * 0.35, L.coilTop, cw * 0.7, L.coilBot - L.coilTop);
			ctx.strokeStyle = on ? "#ffb36b" : "#8b5a32";
			ctx.lineWidth = 2;
			for (let y = L.coilTop + 4; y < L.coilBot - 2; y += 4) {
				ctx.beginPath();
				ctx.moveTo(x - cw * 0.6, y);
				ctx.lineTo(x + cw * 0.6, y + 2);
				ctx.stroke();
			}
		}
		ctx.fillStyle = "#3a3f45";
		ctx.fillRect(L.coilX - cw * 2.6, L.coilBot, cw * 5.2, 6);
		if (on) {
			ctx.strokeStyle = "rgba(79,214,192,0.45)";
			ctx.lineWidth = 1.2;
			for (let i = 1; i <= 3; i++) {
				ctx.beginPath();
				ctx.ellipse(L.coilX, L.coilTop - 2, cw * 1.5 + i * 6, i * 7, 0, Math.PI, 0);
				ctx.stroke();
			}
		}
		const pivotX = L.coilX + cw * 3.4;
		const pivotY = L.coilTop - 10;
		const tipY = lerp(L.coilTop - 26, L.coilTop - 4, s.arm);
		ctx.strokeStyle = "#8f959c";
		ctx.lineWidth = 6;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.moveTo(pivotX, pivotY);
		ctx.lineTo(L.sx, tipY);
		ctx.stroke();
		ctx.lineCap = "butt";
		ctx.fillStyle = "#c9a36b";
		ctx.beginPath();
		ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2);
		ctx.fill();
		label("Elektromagnet · Hamburg", L.coilX, L.coilBot + 22);

		// Schreibstift bis zum Streifen
		const penBottom = L.tapeY - 2 + s.arm * 6;
		ctx.strokeStyle = "#6c7177";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(L.sx, tipY);
		ctx.lineTo(L.sx, penBottom);
		ctx.stroke();
		ctx.fillStyle = "#16120f";
		ctx.beginPath();
		ctx.moveTo(L.sx - 4, penBottom - 6);
		ctx.lineTo(L.sx + 4, penBottom - 6);
		ctx.lineTo(L.sx, penBottom);
		ctx.fill();

		// Papierstreifen
		const ty = L.tapeY;
		const th = L.tapeH;
		ctx.fillStyle = "#e9dfc8";
		ctx.fillRect(0, ty, W, th);
		ctx.fillStyle = "#1c1612";
		const midY = ty + th / 2;
		const toScreen = (x) => L.sx - (s.tapeX - x);
		for (const [a, b] of s.marks) {
			const x1 = toScreen(a);
			const x2 = toScreen(b);
			if (x2 < 0) continue;
			ctx.fillRect(x1, midY - 2, Math.max(3, x2 - x1), 4);
		}
		if (s.markStart !== null) ctx.fillRect(toScreen(s.markStart), midY - 2, Math.max(3, L.sx - toScreen(s.markStart)), 4);
		s.marks = s.marks.filter(([, b]) => toScreen(b) > -20);
		const fade = ctx.createLinearGradient(0, 0, W * 0.15, 0);
		fade.addColorStop(0, "#070605");
		fade.addColorStop(1, "rgba(7,6,5,0)");
		ctx.fillStyle = fade;
		ctx.fillRect(0, ty - 1, W * 0.15, th + 2);
		label("Papierstreifen in Hamburg", W - 8, ty + th + fs + 6, "right");

		// Elektronen
		if (on) {
			const total = pathLength(L.path);
			ctx.fillStyle = "#4fd6c0";
			const gap = 22;
			const offset = (s.flow * 90) % gap;
			for (let d = offset; d < total; d += gap) {
				const [x, y] = pointOnPath(L.path, d);
				ctx.beginPath();
				ctx.arc(x, y, 2.4, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	});
})();

// =====================================================================
// 3 · Telefon: Schall → Strom → Schall
// =====================================================================
(() => {
	const canvas = document.getElementById("phoneCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.85 : 1.25));
	const ui = {
		voice: document.getElementById("btnVoice"),
		mic: document.getElementById("btnMic"),
		pitch: document.getElementById("pitch"),
		pitchOut: document.getElementById("pitchOut"),
		line: document.getElementById("line"),
		lineOut: document.getElementById("lineOut"),
		note: document.getElementById("phoneNote"),
	};
	let graph = null;
	let mode = null; // "voice" | "mic" | null
	const bufIn = new Float32Array(1024);
	const bufLine = new Float32Array(1024);
	let phase = 0;

	function lineParams() {
		const km = Number(ui.line.value);
		return { km, gain: Math.exp(-km / 30), noise: 0.006 * Math.pow(km, 0.75) };
	}

	function build() {
		const ac = getAudio();
		if (!ac) return null;
		const g = {};
		g.input = ac.createGain();
		g.analyserIn = ac.createAnalyser();
		g.analyserIn.fftSize = 2048;
		g.input.connect(g.analyserIn);

		// Leitung: Dämpfung und Rauschen
		g.lineGain = ac.createGain();
		g.analyserIn.connect(g.lineGain);
		const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
		const nd = nb.getChannelData(0);
		for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
		g.noise = ac.createBufferSource();
		g.noise.buffer = nb;
		g.noise.loop = true;
		g.noiseGain = ac.createGain();
		g.noiseGain.gain.value = 0;
		g.noise.connect(g.noiseGain);
		g.noise.start();
		g.lineOut = ac.createGain();
		g.lineGain.connect(g.lineOut);
		g.noiseGain.connect(g.lineOut);
		g.analyserLine = ac.createAnalyser();
		g.analyserLine.fftSize = 2048;
		g.lineOut.connect(g.analyserLine);
		g.speaker = ac.createGain();
		g.speaker.gain.value = 0;
		g.analyserLine.connect(g.speaker).connect(ac.destination);

		// Stimme: Sägezahn durch zwei Formant-Filter klingt nach einem „aaa“
		g.osc = ac.createOscillator();
		g.osc.type = "sawtooth";
		g.osc.frequency.value = Number(ui.pitch.value);
		const vib = ac.createOscillator();
		vib.frequency.value = 5;
		const vibG = ac.createGain();
		vibG.gain.value = 3;
		vib.connect(vibG).connect(g.osc.frequency);
		vib.start();
		g.voiceGain = ac.createGain();
		g.voiceGain.gain.value = 0;
		const syll = ac.createOscillator();
		syll.frequency.value = 3.2;
		const syllG = ac.createGain();
		syllG.gain.value = 0.35;
		syll.connect(syllG).connect(g.voiceGain.gain);
		syll.start();
		for (const [f, q, amp] of [
			[750, 6, 1],
			[1200, 8, 0.6],
			[2500, 10, 0.25],
		]) {
			const bp = ac.createBiquadFilter();
			bp.type = "bandpass";
			bp.frequency.value = f;
			bp.Q.value = q;
			const a = ac.createGain();
			a.gain.value = amp * 2.2;
			g.osc.connect(bp).connect(a).connect(g.voiceGain);
		}
		g.voiceGain.connect(g.input);
		g.osc.start();
		applyLine(g);
		return g;
	}

	function applyLine(g = graph) {
		const p = lineParams();
		ui.lineOut.textContent = `${nf(p.km)} km`;
		if (!g) return;
		const t = audioCtx.currentTime;
		g.lineGain.gain.setTargetAtTime(p.gain, t, 0.05);
		g.noiseGain.gain.setTargetAtTime(mode ? p.noise : 0, t, 0.05);
	}

	function setMode(m) {
		if (!graph) graph = build();
		if (!graph) return;
		const t = audioCtx.currentTime;
		if (mode === "mic" && graph.micStream) {
			graph.micSource.disconnect();
			graph.micStream.getTracks().forEach((tr) => tr.stop());
			graph.micStream = null;
		}
		mode = m;
		graph.voiceGain.gain.cancelScheduledValues(t);
		graph.voiceGain.gain.setTargetAtTime(m === "voice" ? 0.5 : 0, t, 0.03);
		graph.speaker.gain.setTargetAtTime(m === "voice" ? 0.5 : 0, t, 0.05);
		ui.voice.setAttribute("aria-pressed", String(m === "voice"));
		ui.voice.textContent = m === "voice" ? "■ Stimme stoppen" : "▶ Stimme senden";
		ui.mic.setAttribute("aria-pressed", String(m === "mic"));
		applyLine();
	}

	ui.voice.addEventListener("click", () => setMode(mode === "voice" ? null : "voice"));
	ui.mic.addEventListener("click", async () => {
		if (mode === "mic") return setMode(null);
		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
			ui.note.textContent = "Dein Browser erlaubt hier keinen Mikrofonzugriff.";
			return;
		}
		try {
			if (!graph) graph = build();
			const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true } });
			setMode("mic");
			graph.micStream = stream;
			graph.micSource = audioCtx.createMediaStreamSource(stream);
			graph.micSource.connect(graph.input);
			ui.note.textContent = "Sprich, pfeif oder sing. Aus Rücksicht auf Rückkopplungen bleibt der Hörer stumm, du siehst aber alles.";
		} catch {
			ui.note.textContent = "Kein Mikrofonzugriff erlaubt. „Stimme senden“ funktioniert trotzdem.";
		}
	});
	ui.pitch.addEventListener("input", () => {
		ui.pitchOut.textContent = `${ui.pitch.value} Hz`;
		if (graph) graph.osc.frequency.setTargetAtTime(Number(ui.pitch.value), audioCtx.currentTime, 0.03);
	});
	ui.line.addEventListener("input", () => applyLine());
	applyLine();

	function rms(buf) {
		let s = 0;
		for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
		return Math.sqrt(s / buf.length);
	}

	function lane(y, h, buf, color, title, bias = 0, scale = 1) {
		const { w } = size;
		ctx.save();
		ctx.beginPath();
		ctx.rect(10, y, w - 20, h);
		ctx.clip();
		ctx.fillStyle = "rgba(255,255,255,0.03)";
		ctx.fillRect(10, y, w - 20, h);
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.textAlign = "left";
		ctx.fillText(title, 18, y + 14);
		const mid = y + h * (bias ? 0.75 : 0.55);
		ctx.strokeStyle = "rgba(255,255,255,0.08)";
		ctx.beginPath();
		ctx.moveTo(10, mid);
		ctx.lineTo(w - 10, mid);
		ctx.stroke();
		ctx.strokeStyle = color;
		ctx.lineWidth = 1.6;
		ctx.beginPath();
		const n = 512;
		for (let i = 0; i < n; i++) {
			const v = mode ? buf[i] : 0;
			const x = 10 + ((w - 20) * i) / (n - 1);
			const yy = mid - (bias + v * scale) * h * 0.4;
			i === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
		}
		ctx.stroke();
		ctx.restore();
	}

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		if (graph && mode) {
			graph.analyserIn.getFloatTimeDomainData(bufIn);
			graph.analyserLine.getFloatTimeDomainData(bufLine);
		}
		const p = lineParams();
		const levelIn = mode ? clamp(rms(bufIn) * 4, 0, 1) : 0;
		const levelLine = mode ? clamp(rms(bufLine) * 4, 0, 1) : 0;
		phase += dt * Math.PI * 2 * 2.5;
		const fs = w < 520 ? 10 : 12;
		ctx.font = `${fs}px 'Space Grotesk', sans-serif`;

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		// --- Schema oben ---
		const top = h * 0.06;
		const sh = h * 0.36;
		const midY = top + sh * 0.5;
		const micX = w * 0.16;
		const recX = w * 0.84;
		const dispIn = Math.sin(phase) * levelIn * 8;
		const dispOut = Math.sin(phase) * levelLine * 8;

		// Schallwellen links
		ctx.strokeStyle = `rgba(79,214,192,${0.2 + levelIn * 0.6})`;
		ctx.lineWidth = 1.5;
		for (let i = 0; i < 3; i++) {
			const r = 10 + ((phase * 4 + i * 14) % 42);
			ctx.beginPath();
			ctx.arc(micX - 52, midY, r, -0.5, 0.5);
			ctx.stroke();
		}
		ctx.fillStyle = "rgba(244,239,230,0.55)";
		ctx.textAlign = "center";
		ctx.fillText("Stimme", micX - 50, midY + sh * 0.42);

		// Mikrofon: Membran + Kohlekörnchen
		const boxW = 26 - dispIn * 0.8;
		ctx.strokeStyle = "#c9a36b";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(micX - 14 + dispIn, midY - sh * 0.3);
		ctx.quadraticCurveTo(micX - 14 + dispIn * 2.2, midY, micX - 14 + dispIn, midY + sh * 0.3);
		ctx.stroke();
		ctx.fillStyle = "#2c2622";
		ctx.fillRect(micX - 10 + dispIn, midY - sh * 0.2, boxW, sh * 0.4);
		ctx.fillStyle = "#6b6460";
		for (let i = 0; i < 18; i++) {
			const gx = micX - 7 + dispIn + ((i * 7) % Math.max(boxW - 6, 6));
			const gy = midY - sh * 0.16 + ((i * 11) % (sh * 0.32));
			ctx.beginPath();
			ctx.arc(gx, gy, 2.2, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = "rgba(244,239,230,0.55)";
		ctx.fillText("Mikrofon", micX + 4, midY + sh * 0.42);

		// Hörer: Elektromagnet + Membran
		ctx.fillStyle = "#555a60";
		ctx.fillRect(recX - 4, midY - sh * 0.12, 22, sh * 0.24);
		ctx.strokeStyle = mode ? "#ffb36b" : "#8b5a32";
		ctx.lineWidth = 2;
		for (let y = midY - sh * 0.12 + 3; y < midY + sh * 0.12; y += 4) {
			ctx.beginPath();
			ctx.moveTo(recX - 6, y);
			ctx.lineTo(recX + 20, y + 2);
			ctx.stroke();
		}
		ctx.strokeStyle = "#9aa0a8";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(recX + 26 - dispOut, midY - sh * 0.3);
		ctx.quadraticCurveTo(recX + 26 - dispOut * 2.2, midY, recX + 26 - dispOut, midY + sh * 0.3);
		ctx.stroke();
		ctx.strokeStyle = `rgba(79,214,192,${0.15 + levelLine * 0.6})`;
		ctx.lineWidth = 1.5;
		for (let i = 0; i < 3; i++) {
			const r = 10 + ((phase * 4 + i * 14) % 42);
			ctx.beginPath();
			ctx.arc(recX + 34, midY, r, Math.PI - 0.5, Math.PI + 0.5, false);
			ctx.stroke();
		}
		ctx.fillStyle = "rgba(244,239,230,0.55)";
		ctx.fillText("Hörer", recX + 10, midY + sh * 0.42);

		// Leitung mit Batterie
		const wy1 = midY - sh * 0.1;
		const wy2 = midY + sh * 0.1;
		ctx.strokeStyle = mode ? "#e7b25a" : "#5d544a";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(micX + 18, wy1);
		ctx.lineTo(recX - 6, wy1);
		ctx.moveTo(micX + 18, wy2);
		ctx.lineTo(w * 0.47, wy2);
		ctx.moveTo(w * 0.53, wy2);
		ctx.lineTo(recX - 6, wy2);
		ctx.stroke();
		ctx.fillStyle = "#2a2622";
		ctx.fillRect(w * 0.47, wy2 - 9, w * 0.06, 18);
		ctx.fillStyle = "rgba(244,239,230,0.55)";
		ctx.fillText(`Leitung · ${nf(p.km)} km`, w / 2, wy1 - 8);
		ctx.fillText("Batterie", w / 2, wy2 + 24);
		if (mode) {
			const speed = 30 + levelIn * 140 * p.gain;
			ctx.fillStyle = "#4fd6c0";
			const len = recX - micX - 24;
			for (let d = (performance.now() / 1000) * speed % 18; d < len; d += 18) {
				ctx.beginPath();
				ctx.arc(micX + 18 + d, wy1, 2, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		// --- Kurven unten ---
		const ly = top + sh + h * 0.04;
		const lh = (h - ly - 10) / 3 - 6;
		lane(ly, lh, bufIn, "#4fd6c0", "1 · Luftdruck am Mikrofon", 0, 2.2);
		lane(ly + lh + 6, lh, bufLine, "#e7b25a", "2 · Strom in der Leitung (nie negativ)", 0.55, 2.2);
		lane(ly + 2 * (lh + 6), lh, bufLine, "#9fb4ff", "3 · Bewegung der Hörer-Membran", 0, 2.2);

		if (mode) {
			const sig = Math.round(p.gain * 100);
			ui.note.textContent =
				mode === "mic" && levelIn < 0.02
					? "Mikrofon ist an. Sag etwas!"
					: `Am anderen Ende kommen noch ${sig} % des Signals an${p.km > 40 ? ". Das Rauschen frisst die Stimme auf: Ohne Verstärker war hier Schluss." : "."}`;
		}
	});
})();

// =====================================================================
// 4 · Digitalisierung: Abtastrate und Bits
// =====================================================================
(() => {
	const canvas = document.getElementById("digCanvas");
	let ctx;
	let size;
	// Bei jeder Größenänderung neu zeichnen (beim allerersten Aufruf existiert ctx noch nicht)
	({ ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.05 : 1.45), () => ctx && draw()));
	const ui = {
		rate: document.getElementById("rate"),
		rateOut: document.getElementById("rateOut"),
		bits: document.getElementById("bits"),
		bitsOut: document.getElementById("bitsOut"),
		play: document.getElementById("btnPlayDig"),
		note: document.getElementById("digNote"),
	};
	const WINDOW = 0.005; // 5 ms
	const PARTIALS = [
		[440, 0.55, 0],
		[1320, 0.25, 0.5],
		[2640, 0.15, 1],
	];
	const sig = (t, base = 440) => PARTIALS.reduce((s, [f, a, ph]) => s + a * Math.sin(2 * Math.PI * f * (base / 440) * t + ph), 0);
	const rateOf = (v) => Math.round((1000 * Math.pow(48, v / 100)) / 100) * 100;
	const sliderOf = (rate) => (Math.log(rate / 1000) / Math.log(48)) * 100;
	const quant = (x, bits) => {
		const L = Math.pow(2, bits) - 1;
		return (Math.round(((clamp(x, -1, 1) + 1) / 2) * L) / L) * 2 - 1;
	};

	function params() {
		return { rate: rateOf(Number(ui.rate.value)), bits: Number(ui.bits.value) };
	}

	function setOutputs() {
		const { rate, bits } = params();
		ui.rateOut.textContent = `${nf(rate)} Hz`;
		ui.bitsOut.textContent = `${bits} Bit · ${nf(Math.pow(2, bits))} Stufen`;
		const kbit = (rate * bits) / 1000;
		let note = `${nf(rate)} Messungen × ${bits} Bit = ${nf(kbit, kbit < 10 ? 1 : 0)} kbit/s.`;
		if (Math.abs(rate - 8000) < 150 && bits === 8) note += " Genau das ist ein ISDN-Telefonkanal: 64 kbit/s.";
		else if (Math.abs(rate - 44100) < 150 && bits === 16) note += " So speichert eine Audio-CD jeden Kanal.";
		if (rate < 2 * 2640) note += ` Der höchste Oberton (2.640 Hz) braucht über ${nf(5280)} Messungen pro Sekunde und wird jetzt verfälscht.`;
		ui.note.textContent = note;
		draw();
	}

	document.querySelectorAll("[data-preset]").forEach((b) =>
		b.addEventListener("click", () => {
			const [rate, bits] = b.dataset.preset.split(",").map(Number);
			ui.rate.value = sliderOf(rate);
			ui.bits.value = bits;
			ui.rate.dispatchEvent(new Event("input"));
			ui.bits.dispatchEvent(new Event("input"));
		})
	);
	ui.rate.addEventListener("input", setOutputs);
	ui.bits.addEventListener("input", setOutputs);

	function draw() {
		const { w, h } = size;
		if (!w) return;
		const { rate, bits } = params();
		const pad = 14;
		const mid = h / 2;
		const amp = h * 0.42;
		const X = (t) => pad + ((w - 2 * pad) * t) / WINDOW;
		const Y = (v) => mid - (v / 1) * amp;

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		// Quantisierungsstufen
		const levels = Math.pow(2, bits);
		if (levels <= 64) {
			ctx.strokeStyle = "rgba(255,255,255,0.05)";
			ctx.lineWidth = 1;
			for (let i = 0; i < levels; i++) {
				const y = Y((i / (levels - 1)) * 2 - 1);
				ctx.beginPath();
				ctx.moveTo(pad, y);
				ctx.lineTo(w - pad, y);
				ctx.stroke();
			}
		}

		// Original
		ctx.strokeStyle = "rgba(244,239,230,0.35)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		for (let i = 0; i <= 400; i++) {
			const t = (WINDOW * i) / 400;
			const y = Y(sig(t));
			i === 0 ? ctx.moveTo(X(t), y) : ctx.lineTo(X(t), y);
		}
		ctx.stroke();

		// Abgetastet und gehalten
		const n = Math.floor(rate * WINDOW);
		const dtS = 1 / rate;
		ctx.strokeStyle = "#4fd6c0";
		ctx.lineWidth = 2;
		ctx.beginPath();
		for (let i = 0; i <= n; i++) {
			const t = i * dtS;
			const v = quant(sig(t), bits);
			const x1 = X(t);
			const x2 = X(Math.min(WINDOW, t + dtS));
			i === 0 ? ctx.moveTo(x1, Y(v)) : ctx.lineTo(x1, Y(v));
			ctx.lineTo(x2, Y(v));
		}
		ctx.stroke();
		if (n <= 120) {
			for (let i = 0; i <= n; i++) {
				const t = i * dtS;
				const v = quant(sig(t), bits);
				ctx.strokeStyle = "rgba(79,214,192,0.35)";
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(X(t), mid);
				ctx.lineTo(X(t), Y(v));
				ctx.stroke();
				ctx.fillStyle = "#d9a548";
				ctx.beginPath();
				ctx.arc(X(t), Y(v), n > 60 ? 2 : 3.5, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		ctx.font = "12px 'Space Grotesk', sans-serif";
		ctx.textAlign = "right";
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.fillText(`${n + 1} Messungen in 5 ms`, w - pad, h - 10);
		ctx.textAlign = "left";
		ctx.fillStyle = "rgba(244,239,230,0.35)";
		ctx.fillText("grau: Original", pad, h - 10);
	}

	// Kleine Melodie abtasten, quantisieren und abspielen
	let playing = null;
	ui.play.addEventListener("click", () => {
		const ac = getAudio();
		if (!ac) return;
		if (playing) {
			playing.stop();
			return;
		}
		const { rate, bits } = params();
		const sr = ac.sampleRate;
		const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25];
		const noteLen = 0.28;
		const len = Math.round(sr * notes.length * noteLen);
		const buf = ac.createBuffer(1, len, sr);
		const d = buf.getChannelData(0);
		let held = 0;
		let nextSample = 0;
		for (let i = 0; i < len; i++) {
			const t = i / sr;
			if (t >= nextSample) {
				const k = Math.floor(t / noteLen);
				const local = t - k * noteLen;
				const env = Math.min(1, local / 0.01) * Math.exp(-local * 5);
				held = quant(sig(t, notes[k]) * env * 0.9, bits);
				nextSample += 1 / rate;
			}
			d[i] = held * 0.35;
		}
		const src = ac.createBufferSource();
		src.buffer = buf;
		src.connect(ac.destination);
		src.start();
		playing = src;
		ui.play.textContent = "■ Stopp";
		src.onended = () => {
			playing = null;
			ui.play.textContent = "▶ Anhören";
		};
	});

	setOutputs();
})();
