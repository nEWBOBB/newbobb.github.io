"use strict";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
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

// =====================================================================
// 1 · Telefon: Schall → Strom → Schall
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
// 2 · Wählen: Impulse der Wählscheibe und Tonpaare der Tasten
// =====================================================================
(() => {
	const canvas = document.getElementById("dialCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.35 : 2.1));
	const tag = document.getElementById("dialTag");
	const readout = document.getElementById("dialReadout");
	const numEl = document.getElementById("dialNumber");
	const pad = document.getElementById("keypad");
	const note = document.getElementById("dialNote");
	const modeBtns = [...document.querySelectorAll("[data-dialmode]")];

	const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
	const ROW = [697, 770, 852, 941];
	const COL = [1209, 1336, 1477];
	const PULSE = 0.1; // 10 Impulse pro Sekunde
	const BREAK = 0.06; // davon 60 ms Unterbrechung
	const WINDOW = 3; // Sekunden auf dem Bildschirm
	const now = () => performance.now() / 1000;

	let mode = "puls";
	let digits = "";
	let events = []; // { t0, t1, kind: "break" | "tone" | "ring", key, group }
	let groups = []; // { t0, key, n }
	let busyUntil = 0;
	let nodes = [];
	let timers = [];

	const buttons = KEYS.map((k) => {
		const b = document.createElement("button");
		b.type = "button";
		b.className = "btn";
		b.textContent = k;
		b.addEventListener("click", () => press(k));
		pad.appendChild(b);
		return b;
	});

	function setNote() {
		note.textContent =
			mode === "puls"
				? "Achte auf die Lücken im Strom: Bei jeder Unterbrechung springt der Wähler im Amt einen Kontakt weiter."
				: "Jede Taste ist ein Paar aus einem tieferen Zeilenton und einem höheren Spaltenton.";
	}

	function hangUp() {
		nodes.forEach((n) => {
			try {
				n.stop();
			} catch {}
		});
		timers.forEach(clearTimeout);
		nodes = [];
		timers = [];
		digits = "";
		events = [];
		groups = [];
		busyUntil = 0;
		numEl.textContent = "";
		setNote();
	}

	function setMode(m) {
		mode = m;
		hangUp();
		modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.dialmode === m)));
		buttons.forEach((b, i) => (b.disabled = m === "puls" && (KEYS[i] === "*" || KEYS[i] === "#")));
		tag.textContent = m === "puls" ? "Leitung · Wählscheibe" : "Leitung · Tastentelefon";
	}

	function click(ac, at) {
		const len = Math.floor(ac.sampleRate * 0.012);
		const buf = ac.createBuffer(1, len, ac.sampleRate);
		const d = buf.getChannelData(0);
		for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
		const src = ac.createBufferSource();
		src.buffer = buf;
		const f = ac.createBiquadFilter();
		f.type = "bandpass";
		f.frequency.value = 1800;
		const g = ac.createGain();
		g.gain.value = 0.5;
		src.connect(f).connect(g).connect(ac.destination);
		src.start(at);
		nodes.push(src);
	}

	function tone(ac, freqs, at, dur, vol) {
		const g = ac.createGain();
		g.gain.setValueAtTime(0, at);
		g.gain.linearRampToValueAtTime(vol, at + 0.01);
		g.gain.setValueAtTime(vol, at + dur - 0.015);
		g.gain.linearRampToValueAtTime(0, at + dur);
		g.connect(ac.destination);
		for (const f of freqs) {
			const o = ac.createOscillator();
			o.frequency.value = f;
			o.connect(g);
			o.start(at);
			o.stop(at + dur + 0.02);
			nodes.push(o);
		}
	}

	function press(k) {
		if (digits.length >= 12) return;
		const ac = getAudio();
		const t = now();
		const start = Math.max(t, busyUntil);
		const off = start - t;
		digits += k;
		numEl.textContent = digits;
		if (mode === "puls") {
			const n = k === "0" ? 10 : Number(k);
			groups.push({ t0: start, key: k, n });
			for (let i = 0; i < n; i++) {
				const t0 = start + i * PULSE;
				events.push({ t0, t1: t0 + BREAK, kind: "break", key: k });
				if (ac) click(ac, ac.currentTime + off + i * PULSE);
			}
			busyUntil = start + n * PULSE + 0.6;
		} else {
			const i = KEYS.indexOf(k);
			const f = [ROW[Math.floor(i / 3)], COL[i % 3]];
			groups.push({ t0: start, key: k, f });
			events.push({ t0: start, t1: start + 0.18, kind: "tone", key: k, f });
			if (ac) tone(ac, f, ac.currentTime + off, 0.18, 0.12);
			busyUntil = start + 0.26;
		}
	}

	document.getElementById("btnCall").addEventListener("click", () => {
		if (digits.length < 3) {
			note.textContent = "Wähl zuerst eine Nummer mit mindestens drei Ziffern.";
			return;
		}
		const ac = getAudio();
		const t = now();
		const start = Math.max(t, busyUntil) + 0.4;
		const nr = digits;
		for (let r = 0; r < 2; r++) {
			const t0 = start + r * 2.5;
			events.push({ t0, t1: t0 + 1, kind: "ring" });
			if (ac) tone(ac, [425], ac.currentTime + (t0 - t), 1, 0.1);
		}
		busyUntil = start + 5;
		timers.push(setTimeout(() => (note.textContent = `Es klingelt bei ${nr}. Das Freizeichen ist ein Ton mit 425 Hz: eine Sekunde an, dann Pause.`), (start - t) * 1000));
		timers.push(setTimeout(() => (note.textContent = "Niemand geht ran. Leg auf und probier die andere Art zu wählen."), (start - t + 5) * 1000));
	});
	document.getElementById("btnHang").addEventListener("click", hangUp);
	modeBtns.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.dialmode)));
	setMode("puls");

	whenVisible(canvas, () => {
		const { w, h } = size;
		const t = now();
		const small = w < 520;
		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		events = events.filter((e) => e.t1 > t - WINDOW);

		const sw = Math.round(w * (small ? 0.56 : 0.6));
		const hi = h * 0.32;
		const lo = h * 0.72;
		const mid = (hi + lo) / 2;
		const xOf = (tt) => sw * (1 - (t - tt) / WINDOW);
		const at = (tt) => events.find((e) => e.t0 <= tt && tt < e.t1);

		// Leitung
		ctx.strokeStyle = "rgba(255,255,255,0.08)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, mid);
		ctx.lineTo(sw, mid);
		ctx.stroke();
		ctx.strokeStyle = "#ff8fb1";
		ctx.lineWidth = 2;
		ctx.beginPath();
		for (let x = 0; x <= sw; x += 1) {
			const tt = t - WINDOW * (1 - x / sw);
			const e = at(tt);
			let y;
			if (mode === "puls") {
				y = e && e.kind === "break" ? lo : e && e.kind === "ring" ? mid - Math.sin(x * 0.35) * (lo - hi) * 0.25 : hi;
			} else if (e && e.kind === "tone") {
				y = mid - ((Math.sin(x * e.f[0] / 900) + Math.sin(x * e.f[1] / 900)) / 2) * (lo - hi) * 0.48;
			} else if (e && e.kind === "ring") {
				y = mid - Math.sin(x * 0.35) * (lo - hi) * 0.25;
			} else {
				y = mid;
			}
			if (x === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
		ctx.font = `${small ? 10 : 11}px 'Space Grotesk', sans-serif`;
		ctx.fillStyle = "rgba(244,239,230,0.45)";
		ctx.textAlign = "left";
		if (mode === "puls") {
			ctx.fillText("Strom fließt", 8, hi - 8);
			ctx.fillText("unterbrochen", 8, lo + 16);
		} else {
			ctx.fillText("Tonpaare auf der Leitung (Zeitlupe)", 8, hi - 18);
		}

		// Trenner
		ctx.strokeStyle = "rgba(255,255,255,0.1)";
		ctx.beginPath();
		ctx.moveTo(sw + 0.5, 30);
		ctx.lineTo(sw + 0.5, h - 12);
		ctx.stroke();

		const g = [...groups].reverse().find((gr) => gr.t0 <= t);
		const live = events.find((e) => e.t0 <= t && t < e.t1 && e.kind !== "ring");
		buttons.forEach((b, i) => b.classList.toggle("is-on", !!live && live.key === KEYS[i]));

		const rx = sw + (w - sw) / 2;
		if (mode === "puls") {
			// Wähler: Arm springt pro Impuls einen Kontakt weiter
			const steps = g ? events.filter((e) => e.kind === "break" && e.key === g.key && e.t0 >= g.t0 && e.t0 <= t && e.t0 < g.t0 + g.n * PULSE).length : 0;
			const cy = h * 0.8;
			const r = Math.min((w - sw) / 2 - 20, h * 0.55);
			const ang = (i) => Math.PI + (i / 10) * Math.PI;
			for (let i = 0; i <= 10; i++) {
				const a = ang(i);
				ctx.fillStyle = i === steps && i > 0 ? "#ff8fb1" : "rgba(255,255,255,0.25)";
				ctx.beginPath();
				ctx.arc(rx + Math.cos(a) * r, cy + Math.sin(a) * r, i === 0 ? 3 : 5, 0, Math.PI * 2);
				ctx.fill();
				if (i > 0) {
					ctx.fillStyle = "rgba(244,239,230,0.55)";
					ctx.textAlign = "center";
					ctx.fillText(i === 10 ? "0" : String(i), rx + Math.cos(a) * (r + 14), cy + Math.sin(a) * (r + 14) + 4);
				}
			}
			const a = ang(steps);
			ctx.strokeStyle = "#ffc38f";
			ctx.lineWidth = 4;
			ctx.lineCap = "round";
			ctx.beginPath();
			ctx.moveTo(rx, cy);
			ctx.lineTo(rx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8));
			ctx.stroke();
			ctx.fillStyle = "#ffc38f";
			ctx.beginPath();
			ctx.arc(rx, cy, 6, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "rgba(244,239,230,0.5)";
			ctx.textAlign = "center";
			ctx.fillText("Wähler im Amt", rx, h - 8);
			readout.textContent = g && t < g.t0 + g.n * PULSE + 0.4 ? `Ziffer ${g.key} → ${steps} von ${g.n} Impulsen` : "";
		} else {
			// Tonraster: Zeilen- und Spaltenfrequenzen
			const cw = Math.min((w - sw - 70) / 3, 34);
			const ch = Math.min((h - 70) / 4, 30);
			const gx = rx - (cw * 3) / 2 + 22;
			const gy = h / 2 - (ch * 4) / 2 + 10;
			const ki = live ? KEYS.indexOf(live.key) : -1;
			ctx.font = `${small ? 9 : 10}px 'JetBrains Mono', monospace`;
			for (let r = 0; r < 4; r++) {
				ctx.fillStyle = ki >= 0 && Math.floor(ki / 3) === r ? "#ff8fb1" : "rgba(244,239,230,0.4)";
				ctx.textAlign = "right";
				ctx.fillText(ROW[r], gx - 6, gy + r * ch + ch / 2 + 3);
			}
			for (let c = 0; c < 3; c++) {
				ctx.fillStyle = ki >= 0 && ki % 3 === c ? "#ffc38f" : "rgba(244,239,230,0.4)";
				ctx.textAlign = "center";
				ctx.fillText(COL[c], gx + c * cw + cw / 2, gy - 8);
			}
			KEYS.forEach((k, i) => {
				const x = gx + (i % 3) * cw;
				const y = gy + Math.floor(i / 3) * ch;
				ctx.fillStyle = i === ki ? "#ff8fb1" : "rgba(255,255,255,0.06)";
				ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);
				ctx.fillStyle = i === ki ? "#2a0712" : "rgba(244,239,230,0.7)";
				ctx.font = `${small ? 11 : 13}px 'JetBrains Mono', monospace`;
				ctx.fillText(k, x + cw / 2, y + ch / 2 + 4);
				ctx.font = `${small ? 9 : 10}px 'JetBrains Mono', monospace`;
			});
			ctx.font = `${small ? 10 : 11}px 'Space Grotesk', sans-serif`;
			ctx.fillStyle = "rgba(244,239,230,0.5)";
			ctx.textAlign = "center";
			ctx.fillText("Frequenzen in Hz", rx, h - 8);
			readout.textContent = g && t < g.t0 + 1 ? `Taste ${g.key} → ${g.f[0]} Hz + ${g.f[1]} Hz` : "";
		}
	});
})();

// =====================================================================
// 3 · Digitalisierung: Abtastrate und Bits
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

// =====================================================================
// 4 · Funkzellen: Masten, Handover und überlastete Zellen
// =====================================================================
(() => {
	const canvas = document.getElementById("cellCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.9 : 2.1));
	const btnWalk = document.getElementById("btnWalk");
	const btnCrowd = document.getElementById("btnCrowd");
	const btnSmall = document.getElementById("btnSmall");
	const readout = document.getElementById("cellReadout");
	const note = document.getElementById("cellNote");

	const CAPACITY = 40;
	const S3 = Math.sqrt(3);
	let walk = false;
	let crowd = false;
	let smallCells = false;
	let phone = { x: 0.3, y: 0.45 }; // relativ zur Fläche
	let walkT = 0;
	let serving = -1;
	let handovers = 0;
	let dragging = false;
	// Konzertbesucher als Versatz um die Bildmitte, in Vielfachen der großen Zellgröße
	const CROWD = Array.from({ length: 60 }, (_, i) => {
		const a = i * 2.39996;
		const r = 0.62 * Math.sqrt((i + 0.5) / 60);
		return { dx: Math.cos(a) * r, dy: Math.sin(a) * r };
	});

	const bigR = () => clamp(size.w / 8, 46, 92);
	const cellR = () => bigR() * (smallCells ? 0.5 : 1);

	function towers(R = cellR()) {
		const { w, h } = size;
		const list = [];
		for (let c = -1; c * 1.5 * R < w + R; c++)
			for (let r = -1; r * S3 * R < h + R; r++)
				list.push({ x: c * 1.5 * R + R * 0.4, y: r * S3 * R + (c & 1 ? (S3 / 2) * R : 0) + R * 0.3 });
		return list;
	}

	const nearest = (list, x, y) => {
		let best = 0;
		let bd = Infinity;
		list.forEach((t, i) => {
			const d = Math.hypot(t.x - x, t.y - y);
			if (d < bd) {
				bd = d;
				best = i;
			}
		});
		return { i: best, d: bd };
	};

	function update() {
		btnWalk.setAttribute("aria-pressed", String(walk));
		btnWalk.textContent = walk ? "⏸ Stehen bleiben" : "🚶 Spazieren gehen";
		btnCrowd.setAttribute("aria-pressed", String(crowd));
		btnSmall.setAttribute("aria-pressed", String(smallCells));
		btnSmall.textContent = smallCells ? "Große Zellen" : "Kleinere Zellen bauen";
		serving = -1;
	}

	btnWalk.addEventListener("click", () => {
		walk = !walk;
		update();
	});
	btnCrowd.addEventListener("click", () => {
		crowd = !crowd;
		update();
	});
	btnSmall.addEventListener("click", () => {
		smallCells = !smallCells;
		update();
	});

	const setPhone = (e) => {
		const r = canvas.getBoundingClientRect();
		phone = { x: clamp((e.clientX - r.left) / r.width, 0.02, 0.98), y: clamp((e.clientY - r.top) / r.height, 0.04, 0.96) };
	};
	canvas.addEventListener("pointerdown", (e) => {
		dragging = true;
		walk = false;
		update();
		canvas.setPointerCapture(e.pointerId);
		setPhone(e);
	});
	canvas.addEventListener("pointermove", (e) => dragging && setPhone(e));
	canvas.addEventListener("pointerup", () => (dragging = false));
	update();

	function hexPath(x, y, R) {
		ctx.beginPath();
		for (let k = 0; k < 6; k++) {
			const a = (Math.PI / 3) * k;
			const px = x + Math.cos(a) * R;
			const py = y + Math.sin(a) * R;
			if (k) ctx.lineTo(px, py);
			else ctx.moveTo(px, py);
		}
		ctx.closePath();
	}

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const R = cellR();
		const small = w < 520;
		if (walk) {
			walkT += dt;
			phone = { x: 0.5 + 0.42 * Math.sin(walkT * 0.23), y: 0.5 + 0.36 * Math.sin(walkT * 0.37 + 1) };
		}
		const T = towers();
		const px = phone.x * w;
		const py = phone.y * h;

		// Verbindung mit Hysterese: erst wechseln, wenn ein anderer Mast deutlich näher ist
		const best = nearest(T, px, py);
		if (serving < 0 || serving >= T.length) serving = best.i;
		else if (best.i !== serving) {
			const dCur = Math.hypot(T[serving].x - px, T[serving].y - py);
			if (dCur > best.d * 1.2) {
				serving = best.i;
				handovers++;
			}
		}

		// Besucher der Zellen zählen. Das Konzert liegt mitten in einer großen Zelle.
		const big = towers(bigR());
		const center = big[nearest(big, w / 2, h / 2).i];
		const load = new Map();
		const people = crowd
			? CROWD.map((c) => {
					const x = center.x + c.dx * bigR() * 1.3;
					const y = center.y + c.dy * bigR() * 1.3;
					const t = nearest(T, x, y).i;
					const n = (load.get(t) || 0) + 1;
					load.set(t, n);
					return { x, y, ok: n <= CAPACITY };
			  })
			: [];
		const myLoad = (load.get(serving) || 0) + 1;
		const overloaded = myLoad > CAPACITY;

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		// Zellen
		T.forEach((t, i) => {
			hexPath(t.x, t.y, R);
			const n = load.get(i) || 0;
			if (i === serving) {
				ctx.fillStyle = overloaded ? "rgba(255,138,122,0.16)" : "rgba(255,143,177,0.14)";
				ctx.fill();
			} else if (n > CAPACITY) {
				ctx.fillStyle = "rgba(255,138,122,0.1)";
				ctx.fill();
			}
			ctx.strokeStyle = "rgba(255,255,255,0.09)";
			ctx.lineWidth = 1;
			ctx.stroke();
		});

		// Masten
		T.forEach((t, i) => {
			const on = i === serving;
			ctx.strokeStyle = on ? "#ff8fb1" : "rgba(244,239,230,0.35)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(t.x - 5, t.y + 7);
			ctx.lineTo(t.x, t.y - 8);
			ctx.lineTo(t.x + 5, t.y + 7);
			ctx.stroke();
			if (on) {
				const ring = ((time * 0.8) % 1) * R * 0.6;
				ctx.strokeStyle = `rgba(255,143,177,${0.5 * (1 - ring / (R * 0.6))})`;
				ctx.beginPath();
				ctx.arc(t.x, t.y - 8, ring, 0, Math.PI * 2);
				ctx.stroke();
			}
		});

		// Konzert
		people.forEach((p) => {
			ctx.fillStyle = p.ok ? "rgba(255,195,143,0.8)" : "#ff8a7a";
			ctx.beginPath();
			ctx.arc(p.x, p.y, small ? 2 : 2.6, 0, Math.PI * 2);
			ctx.fill();
		});

		// Funkverbindung
		const st = T[serving];
		ctx.setLineDash([5, 5]);
		ctx.lineDashOffset = -time * 30;
		ctx.strokeStyle = overloaded ? "rgba(255,138,122,0.6)" : "rgba(255,143,177,0.85)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(px, py);
		ctx.lineTo(st.x, st.y - 8);
		ctx.stroke();
		ctx.setLineDash([]);

		// Handy
		ctx.fillStyle = "#f4efe6";
		ctx.beginPath();
		ctx.roundRect(px - 7, py - 12, 14, 24, 3);
		ctx.fill();
		ctx.fillStyle = overloaded ? "#ff8a7a" : "#ff8fb1";
		ctx.fillRect(px - 5, py - 9, 10, 15);

		const d = Math.hypot(st.x - px, st.y - py) / R;
		const bars = d < 0.45 ? 4 : d < 0.75 ? 3 : d < 1 ? 2 : 1;
		readout.textContent = `${overloaded ? "Kein Netz: Zelle voll" : `Empfang ${"▮".repeat(bars)}${"▯".repeat(4 - bars)}`} · ${handovers} Übergaben`;
		if (crowd) {
			const full = [...load.values()].filter((n) => n > CAPACITY).length;
			note.textContent = full
				? `${CROWD.length} Handys wollen in eine Zelle, die nur ${CAPACITY} schafft. Rote Punkte bekommen kein Netz. Bau kleinere Zellen!`
				: `Mit kleineren Zellen verteilen sich die ${CROWD.length} Handys auf mehrere Masten. Jetzt haben alle Netz.`;
		} else {
			note.textContent = walk
				? "Achte auf den Moment, in dem die Linie zum nächsten Mast springt: Das ist ein Handover."
				: "Zieh das Handy mit dem Finger oder der Maus über die Karte.";
		}
	});
})();
