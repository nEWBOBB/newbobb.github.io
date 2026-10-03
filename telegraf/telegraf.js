"use strict";

const lerp = (a, b, t) => a + (b - a) * t;

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
