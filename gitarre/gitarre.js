// Gitarre lernen: Saiten im Hero, Stimmgerät, Griffbrett, Akkorde, Ein-Minuten-Wechsel, Schlagmuster, Übeplan.

(() => {
	const M = window.Musik;
	const $ = (id) => document.getElementById(id);
	const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
	const ACC = css("--accent", "#f5b14c");
	const ACC2 = css("--accent-2", "#5fdcc2");
	const INK = "#f4efe6";
	const svgNS = "http://www.w3.org/2000/svg";
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	// Leere Saiten von der dicken tiefen E-Saite bis zur dünnen hohen: E2 A2 D3 G3 H3 E4
	const OPEN = [40, 45, 50, 55, 59, 64];
	const SNAME = ["E", "A", "D", "G", "H", "e"];

	const CHORDS = {
		Em: { name: "E-Moll", frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], tip: "Der leichteste Akkord überhaupt: zwei Finger, und alle sechs Saiten dürfen klingen." },
		Am: { name: "A-Moll", frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], tip: "Dieselbe Form wie E-Dur, nur eine Saite weiter. Die tiefe E-Saite bleibt still." },
		E: { name: "E-Dur", frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], tip: "E-Moll plus Zeigefinger auf der G-Saite. Ein Finger macht aus traurig fröhlich." },
		A: { name: "A-Dur", frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], tip: "Drei Finger nebeneinander im zweiten Bund. Eng, deshalb die Finger leicht schräg stellen." },
		D: { name: "D-Dur", frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], tip: "Nur die vier dünnen Saiten anschlagen. Die Finger bilden ein kleines Dreieck." },
		Dm: { name: "D-Moll", frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], tip: "Wie D-Dur, nur rutscht der höchste Ton einen Bund tiefer. Vier Saiten." },
		C: { name: "C-Dur", frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], tip: "Die Finger steigen wie eine Treppe ab: 3, 2, 1. Die tiefe E-Saite nicht anschlagen." },
		G: { name: "G-Dur", frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], tip: "Weit gespreizt. Viele greifen G später mit Mittel-, Zeige- und Ringfinger plus kleinem Finger, das erleichtert den Wechsel zu C." },
	};
	const ORDER = ["Em", "Am", "E", "A", "D", "Dm", "C", "G"];
	const chordNotes = (key) => CHORDS[key].frets.map((f, i) => (f < 0 ? null : OPEN[i] + f));

	const sv = (tag, attrs, parent) => {
		const e = document.createElementNS(svgNS, tag);
		for (const k in attrs) e.setAttribute(k, attrs[k]);
		if (parent) parent.appendChild(e);
		return e;
	};
	const chip = (label, parent, onClick) => {
		const b = document.createElement("button");
		b.type = "button";
		b.className = "btn";
		b.innerHTML = label;
		b.setAttribute("aria-pressed", "false");
		b.addEventListener("click", onClick);
		parent.appendChild(b);
		return b;
	};
	const choose = (list, b) => list.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
	const svgPoint = (svg, e) => {
		const p = svg.createSVGPoint();
		p.x = e.clientX;
		p.y = e.clientY;
		return p.matrixTransform(svg.getScreenCTM().inverse());
	};

	let unlocked = false;
	window.addEventListener("pointerdown", () => (unlocked = true), { capture: true, once: true });

	// ---------- Hero: sechs Saiten zum Anschlagen ----------
	(function hero() {
		const cv = $("heroCanvas");
		const { ctx, size } = fitCanvas(cv, (w) => (w < 640 ? 2.1 : 4.6));
		const amp = new Float32Array(6);
		const ph = new Float32Array(6);
		const yOf = (i) => size.h * (0.3 + i * 0.115);
		let lastY = null;
		let down = false;

		const hit = (i, v) => {
			amp[i] = Math.min(1, amp[i] + 0.9 * v);
			M.pluck(OPEN[i], { vel: 0.35 + 0.55 * v });
		};

		const move = (e) => {
			const r = cv.getBoundingClientRect();
			const y = e.clientY - r.top;
			if (lastY != null && (down || (e.pointerType === "mouse" && unlocked))) {
				const v = Math.min(1, Math.abs(y - lastY) / 18 + 0.3);
				for (let i = 0; i < 6; i++) {
					const s = yOf(i);
					if ((lastY - s) * (y - s) < 0) hit(i, v);
				}
			}
			lastY = y;
		};
		cv.addEventListener("pointerdown", (e) => {
			down = true;
			unlocked = true;
			M.audio();
			lastY = e.clientY - cv.getBoundingClientRect().top;
			cv.setPointerCapture(e.pointerId);
		});
		cv.addEventListener("pointermove", move);
		cv.addEventListener("pointerup", () => (down = false));
		cv.addEventListener("pointercancel", () => (down = false));
		cv.addEventListener("pointerleave", () => (lastY = null));

		$("heroStrum").addEventListener("click", () => {
			M.strum(chordNotes("G"));
			CHORDS.G.frets.forEach((f, i) => setTimeout(() => (amp[i] = 1), i * 14));
		});

		whenVisible(cv, (dt) => {
			const { w, h } = size;
			ctx.clearRect(0, 0, w, h);
			const bg = ctx.createLinearGradient(0, 0, w, 0);
			bg.addColorStop(0, "#0d0a07");
			bg.addColorStop(0.5, "#16100a");
			bg.addColorStop(1, "#0d0a07");
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, w, h);
			// Bundstäbchen im Hintergrund
			ctx.strokeStyle = "rgba(255,255,255,0.05)";
			ctx.lineWidth = 2;
			for (let n = 1; n < 14; n++) {
				const x = w * (1 - Math.pow(2, -n / 12)) * 1.6;
				if (x > w) break;
				ctx.beginPath();
				ctx.moveTo(x, h * 0.1);
				ctx.lineTo(x, h * 0.9);
				ctx.stroke();
			}
			for (let i = 0; i < 6; i++) {
				amp[i] *= Math.exp(-dt * 1.4);
				ph[i] += dt * (18 + i * 5);
				const y0 = yOf(i);
				const lw = 3.4 - i * 0.48;
				const a = reduced ? 0 : amp[i] * h * 0.05;
				if (amp[i] > 0.02) {
					ctx.strokeStyle = `rgba(245,177,76,${amp[i] * 0.35})`;
					ctx.lineWidth = lw + 10 * amp[i];
					ctx.beginPath();
					for (let x = 0; x <= w; x += 6) {
						const y = y0 + a * Math.sin((Math.PI * x) / w) * Math.sin(ph[i]);
						x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
					}
					ctx.stroke();
				}
				const g = ctx.createLinearGradient(0, y0 - lw, 0, y0 + lw);
				g.addColorStop(0, i < 3 ? "#e9c58f" : "#f2efe9");
				g.addColorStop(1, i < 3 ? "#7a5a30" : "#8c8780");
				ctx.strokeStyle = g;
				ctx.lineWidth = lw;
				ctx.beginPath();
				for (let x = 0; x <= w; x += 6) {
					const y = y0 + a * Math.sin((Math.PI * x) / w) * Math.sin(ph[i]);
					x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
				}
				ctx.stroke();
				ctx.fillStyle = amp[i] > 0.05 ? ACC : "rgba(244,239,230,0.35)";
				ctx.font = "600 12px 'JetBrains Mono', monospace";
				ctx.fillText(SNAME[i], 10, y0 - 6);
			}
		});
	})();

	// ---------- 1 Stimmgerät ----------
	(function tuner() {
		const cv = $("tunerCanvas");
		const { ctx, size } = fitCanvas(cv, (w) => (w < 500 ? 1.45 : 1.9));
		const out = $("tunerOut");
		const note = $("tunerNote");
		const btn = $("btnMic");
		const wrap = $("tunerStrings");
		let stream = null;
		let analyser = null;
		let data = null;
		let on = false;
		let frame = 0;
		let needle = 0;
		const view = { name: "E", sub: "tiefe E-Saite · 82,4 Hz", cents: 0, active: false, idx: 0, seen: 0 };

		const sbtns = OPEN.map((m, i) =>
			chip(`${SNAME[i]}`, wrap, () => {
				M.pluck(m, { vel: 0.9 });
				choose(sbtns, sbtns[i]);
				if (!on) {
					Object.assign(view, { name: SNAME[i], sub: `${i + 1}. von 6 · ${M.mtof(m).toFixed(1).replace(".", ",")} Hz`, cents: 0, active: false, idx: i });
					note.textContent = `Zielton der ${["tiefen E", "A", "D", "G", "H", "hohen E"][i]}-Saite. Zupf deine Saite direkt danach und vergleiche: Hörst du ein Wummern, liegen die Töne noch leicht auseinander.`;
				}
			})
		);
		choose(sbtns, sbtns[0]);

		async function start() {
			if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
				note.textContent = "Dieser Browser gibt hier kein Mikrofon frei. Stimm nach Gehör: Zielton antippen, Saite zupfen, vergleichen.";
				return;
			}
			try {
				const ac = M.audio();
				stream = await navigator.mediaDevices.getUserMedia({
					audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
				});
				const src = ac.createMediaStreamSource(stream);
				analyser = ac.createAnalyser();
				analyser.fftSize = 4096;
				src.connect(analyser);
				data = new Float32Array(analyser.fftSize);
				on = true;
				btn.setAttribute("aria-pressed", "true");
				btn.textContent = "■ Stimmgerät aus";
				out.textContent = "hört zu …";
				note.textContent = "Zupf eine leere Saite und lass sie ausklingen.";
			} catch (e) {
				note.textContent = "Kein Zugriff aufs Mikrofon. Du kannst trotzdem nach Gehör stimmen: Zielton antippen, Saite zupfen, vergleichen.";
			}
		}
		function stop() {
			on = false;
			if (stream) stream.getTracks().forEach((t) => t.stop());
			stream = null;
			btn.setAttribute("aria-pressed", "false");
			btn.textContent = "🎤 Stimmgerät an";
			out.textContent = "Mikrofon aus";
			view.active = false;
		}
		btn.addEventListener("click", () => (on ? stop() : start()));

		function analyse() {
			analyser.getFloatTimeDomainData(data);
			const r = M.detectPitch(data.subarray(0, 3072), M.audio().sampleRate, 65, 1000);
			const now = performance.now();
			if (!r) {
				if (now - view.seen > 1500) view.active = false;
				return;
			}
			const midi = M.ftom(r.freq);
			let best = 0;
			OPEN.forEach((m, i) => {
				if (Math.abs(midi - m) < Math.abs(midi - OPEN[best])) best = i;
			});
			let cents;
			let name;
			let sub;
			if (Math.abs(midi - OPEN[best]) <= 3.5) {
				cents = (midi - OPEN[best]) * 100;
				name = SNAME[best];
				sub = `${["tiefe E", "A", "D", "G", "H", "hohe E"][best]}-Saite`;
				choose(sbtns, sbtns[best]);
			} else {
				const m = Math.round(midi);
				cents = (midi - m) * 100;
				name = M.noteName(m);
				sub = "keine leere Saite";
				best = -1;
			}
			const same = view.active && view.idx === best && view.name === name;
			view.cents = same ? view.cents * 0.55 + cents * 0.45 : cents;
			Object.assign(view, { name, sub, idx: best, active: true, seen: now });
			out.textContent = `${r.freq.toFixed(1).replace(".", ",")} Hz`;
			const c = view.cents;
			if (best < 0) note.textContent = "Das ist keine leere Saite. Zupf eine Saite ohne zu greifen.";
			else if (Math.abs(c) <= 5) note.textContent = "✓ Gestimmt! Weiter zur nächsten Saite.";
			else if (c > 100) note.textContent = "Viel zu hoch. Vorsicht, nicht zu fest spannen, sonst reißt die Saite. Etwas lockern.";
			else if (c < -100) note.textContent = "Viel zu tief. Die Saite spannen, also den Wirbel langsam drehen.";
			else if (c < 0) note.textContent = `${Math.round(-c)} Cent zu tief: Saite etwas spannen.`;
			else note.textContent = `${Math.round(c)} Cent zu hoch: etwas lockern und dann von unten wieder heranstimmen.`;
		}

		whenVisible(cv, (dt) => {
			frame++;
			if (on && frame % 3 === 0) analyse();
			const { w, h } = size;
			ctx.clearRect(0, 0, w, h);
			const cx = w / 2;
			const cy = h * 0.86;
			const R = Math.min(w * 0.42, h * 0.72);
			const span = (Math.PI / 180) * 62;
			const target = view.active ? Math.max(-1, Math.min(1, view.cents / 50)) : 0;
			needle += (target - needle) * Math.min(1, dt * 10);
			const good = view.active && Math.abs(view.cents) <= 5;

			// Skala
			ctx.lineCap = "round";
			ctx.lineWidth = 10;
			ctx.strokeStyle = "rgba(255,255,255,0.08)";
			ctx.beginPath();
			ctx.arc(cx, cy, R, -Math.PI / 2 - span, -Math.PI / 2 + span);
			ctx.stroke();
			ctx.strokeStyle = good ? "#7bdc9a" : "rgba(123,220,154,0.45)";
			ctx.beginPath();
			ctx.arc(cx, cy, R, -Math.PI / 2 - span * 0.1, -Math.PI / 2 + span * 0.1);
			ctx.stroke();
			for (let c = -50; c <= 50; c += 10) {
				const a = -Math.PI / 2 + (c / 50) * span;
				const r1 = R - 16;
				const r2 = R - (c % 50 === 0 ? 30 : 24);
				ctx.strokeStyle = "rgba(244,239,230,0.35)";
				ctx.lineWidth = c === 0 ? 2.5 : 1.5;
				ctx.beginPath();
				ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
				ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
				ctx.stroke();
			}
			ctx.fillStyle = "rgba(244,239,230,0.45)";
			ctx.font = "500 12px 'Space Grotesk', sans-serif";
			ctx.textAlign = "center";
			ctx.fillText("zu tief", cx - R * 0.78, cy - R * 0.25);
			ctx.fillText("zu hoch", cx + R * 0.78, cy - R * 0.25);

			// Zeiger
			const a = -Math.PI / 2 + needle * span;
			ctx.strokeStyle = good ? "#7bdc9a" : view.active ? ACC : "rgba(244,239,230,0.3)";
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(cx + Math.cos(a) * (R * 0.66), cy + Math.sin(a) * (R * 0.66));
			ctx.lineTo(cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 8));
			ctx.stroke();
			ctx.fillStyle = ctx.strokeStyle;
			ctx.beginPath();
			ctx.arc(cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 8), 6, 0, Math.PI * 2);
			ctx.fill();

			// Tonname
			ctx.fillStyle = good ? "#7bdc9a" : INK;
			ctx.font = `800 ${Math.round(R * 0.42)}px Syne, sans-serif`;
			ctx.fillText(view.name, cx, cy - R * 0.2);
			ctx.fillStyle = "rgba(244,239,230,0.55)";
			ctx.font = "500 13px 'Space Grotesk', sans-serif";
			ctx.fillText(view.active ? `${view.sub} · ${view.cents > 0 ? "+" : ""}${Math.round(view.cents)} Cent` : view.sub, cx, cy + 4);
			ctx.textAlign = "start";
		});
	})();

	// ---------- 2 Griffbrett ----------
	(function fretboard() {
		const svg = $("fretSvg");
		svg.setAttribute("viewBox", "0 0 1000 320");
		const NUT = 70;
		const fx = (n) => NUT + (1 - Math.pow(2, -n / 12)) * 2 * 905;
		const sy = (s) => 42 + (5 - s) * 46;
		const cellX = (n) => (n === 0 ? NUT / 2 : (fx(n - 1) + fx(n)) / 2);
		const out = $("fretOut");
		const note = $("fretNote");

		const defs = sv("defs", {}, svg);
		const wood = sv("linearGradient", { id: "wood", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
		sv("stop", { offset: 0, "stop-color": "#2a1b10" }, wood);
		sv("stop", { offset: 0.5, "stop-color": "#3a2616" }, wood);
		sv("stop", { offset: 1, "stop-color": "#24170d" }, wood);
		sv("rect", { x: NUT, y: 18, width: fx(12) - NUT + 10, height: 256, fill: "url(#wood)", rx: 4 }, svg);
		[3, 5, 7, 9].forEach((n) => sv("circle", { cx: cellX(n), cy: 157, r: 9, fill: "rgba(244,239,230,0.22)" }, svg));
		sv("circle", { cx: cellX(12), cy: 111, r: 9, fill: "rgba(244,239,230,0.22)" }, svg);
		sv("circle", { cx: cellX(12), cy: 203, r: 9, fill: "rgba(244,239,230,0.22)" }, svg);
		sv("rect", { x: NUT - 6, y: 16, width: 8, height: 260, fill: "#e8e1d4", rx: 2 }, svg);
		for (let n = 1; n <= 12; n++) {
			sv("line", { x1: fx(n), y1: 18, x2: fx(n), y2: 274, stroke: "#b9b2a6", "stroke-width": 3 }, svg);
			const t = sv("text", { x: cellX(n), y: 304, "text-anchor": "middle", fill: "rgba(244,239,230,0.45)", "font-size": 16, "font-family": "JetBrains Mono, monospace" }, svg);
			t.textContent = n;
		}
		for (let s = 0; s < 6; s++) {
			sv("line", { x1: 0, y1: sy(s), x2: 1000, y2: sy(s), stroke: s < 3 ? "#d6b98c" : "#e6e2da", "stroke-width": 4.4 - s * 0.6, opacity: 0.9 }, svg);
			const t = sv("text", { x: 14, y: sy(s) - 8, fill: "rgba(244,239,230,0.6)", "font-size": 15, "font-family": "JetBrains Mono, monospace" }, svg);
			t.textContent = SNAME[s];
		}
		const labels = sv("g", {}, svg);
		const fx2 = sv("g", {}, svg);

		const NAT = [0, 2, 4, 5, 7, 9, 11];
		const PENTA = [9, 0, 2, 4, 7];
		const MODES = [
			{ k: "off", label: "Ohne Namen", show: () => false },
			{ k: "ea", label: "E- und A-Saite", show: (s, pc) => s <= 1 && NAT.includes(pc) },
			{ k: "nat", label: "Stammtöne", show: (s, pc) => NAT.includes(pc) },
			{ k: "all", label: "Alle Töne", show: () => true },
			{ k: "penta", label: "Pentatonik A-Moll", show: (s, pc) => PENTA.includes(pc) },
		];
		let mode = MODES[1];

		function drawLabels() {
			labels.innerHTML = "";
			for (let s = 0; s < 6; s++)
				for (let n = 0; n <= 12; n++) {
					const m = OPEN[s] + n;
					const pc = m % 12;
					if (!mode.show(s, pc)) continue;
					const root = mode.k === "penta" && pc === 9;
					const black = M.isBlack(m);
					sv("circle", { cx: cellX(n), cy: sy(s), r: 15, fill: root ? ACC2 : black ? "#3a332c" : ACC, stroke: "#0b0a09", "stroke-width": 2 }, labels);
					const t = sv("text", { x: cellX(n), y: sy(s) + 5, "text-anchor": "middle", "font-size": M.noteName(m).length > 1 ? 11 : 14, "font-weight": 700, fill: black && !root ? INK : "#1a1004", "font-family": "Space Grotesk, sans-serif" }, labels);
					t.textContent = M.noteName(m);
				}
		}

		const modeBtns = MODES.map((md) =>
			chip(md.label, $("fretModes"), () => {
				mode = md;
				choose(modeBtns, modeBtns[MODES.indexOf(md)]);
				drawLabels();
				if (md.k === "penta")
					note.textContent = "Die Moll-Pentatonik ist die Tonleiter für die ersten Solos. Grün sind die Grundtöne A. Die bekannteste Box liegt zwischen Bund 5 und 8.";
				else if (md.k === "ea") note.textContent = "Fang hier an: Die Töne auf der E- und A-Saite sind später die Grundtöne deiner Akkorde.";
			})
		);
		choose(modeBtns, modeBtns[1]);
		drawLabels();

		function flash(n, s, color) {
			const c = sv("circle", { cx: cellX(n), cy: sy(s), r: 18, fill: "none", stroke: color, "stroke-width": 4 }, fx2);
			c.style.transition = "opacity 0.9s, r 0.9s";
			requestAnimationFrame(() => {
				c.style.opacity = "0";
				c.setAttribute("r", 30);
			});
			setTimeout(() => c.remove(), 950);
		}

		// Tonsuche
		const game = { on: false, s: 0, pc: 0, n: 0, ok: 0, t0: 0, prevMode: null };
		const score = $("findScore");
		const btnFind = $("btnFind");
		function ask() {
			game.s = Math.random() < 0.5 ? 0 : 1;
			let pc;
			do pc = NAT[Math.floor(Math.random() * NAT.length)];
			while (pc === game.pc);
			game.pc = pc;
			note.textContent = `Finde ein ${M.noteName(pc)} auf der ${game.s === 0 ? "tiefen E" : "A"}-Saite.`;
			score.textContent = `${game.n + 1} / 10 · ${game.ok} richtig`;
		}
		btnFind.addEventListener("click", () => {
			if (game.on) return endGame(false);
			Object.assign(game, { on: true, n: 0, ok: 0, t0: performance.now(), prevMode: mode });
			mode = MODES[0];
			choose(modeBtns, modeBtns[0]);
			drawLabels();
			score.hidden = false;
			btnFind.textContent = "■ Abbrechen";
			ask();
		});
		function endGame(done) {
			game.on = false;
			btnFind.textContent = "🎯 Tonsuche starten";
			mode = game.prevMode || MODES[1];
			choose(modeBtns, modeBtns[MODES.indexOf(mode)]);
			drawLabels();
			if (done) {
				const sec = Math.round((performance.now() - game.t0) / 1000);
				note.textContent = `${game.ok} von 10 richtig in ${sec} Sekunden. ${game.ok >= 9 ? "Stark! Versuch morgen, schneller zu werden." : "Morgen nochmal, jeden Tag ein bisschen. Merkhilfe: E–F und H–C liegen direkt nebeneinander."}`;
				score.textContent = `${game.ok} / 10`;
			} else score.hidden = true;
		}

		svg.addEventListener("pointerdown", (e) => {
			const p = svgPoint(svg, e);
			let s = -1;
			for (let i = 0; i < 6; i++) if (Math.abs(p.y - sy(i)) < 23) s = i;
			if (s < 0 || p.x > fx(12) + 8) return;
			let n = 0;
			if (p.x > NUT) for (n = 1; n < 12 && p.x > fx(n); n++);
			const m = OPEN[s] + n;
			M.pluck(m, { vel: 0.9 });
			out.textContent = `${SNAME[s]}-Saite · Bund ${n} · ${M.noteName(m)}`;
			if (!game.on) {
				flash(n, s, ACC);
				return;
			}
			if (s === game.s && m % 12 === game.pc) {
				game.ok++;
				flash(n, s, "#7bdc9a");
			} else {
				flash(n, s, "#ff8a7a");
				const right = [...Array(13).keys()].find((k) => (OPEN[game.s] + k) % 12 === game.pc);
				setTimeout(() => flash(right, game.s, "#7bdc9a"), 250);
			}
			game.n++;
			if (game.n >= 10) endGame(true);
			else setTimeout(() => game.on && ask(), 450);
		});
	})();

	// ---------- Griffbild ----------
	function drawChord(svg, key, { label = false, hl = null, onString = null } = {}) {
		const c = CHORDS[key];
		svg.innerHTML = "";
		svg.setAttribute("viewBox", `0 0 260 ${label ? 362 : 320}`);
		const X = (i) => 40 + i * 36;
		const Y0 = 58;
		const FH = 56;
		for (let f = 1; f <= 4; f++) sv("line", { x1: X(0), y1: Y0 + f * FH, x2: X(5), y2: Y0 + f * FH, stroke: "rgba(244,239,230,0.35)", "stroke-width": 2 }, svg);
		sv("rect", { x: X(0) - 2, y: Y0 - 7, width: X(5) - X(0) + 4, height: 8, rx: 2, fill: "#e8e1d4" }, svg);
		const strings = [];
		for (let i = 0; i < 6; i++) {
			const muted = c.frets[i] < 0;
			strings.push(
				sv("line", { x1: X(i), y1: Y0, x2: X(i), y2: Y0 + 4 * FH, stroke: hl && hl.has(i) ? ACC2 : muted ? "rgba(244,239,230,0.25)" : "#cfc7b9", "stroke-width": 3.2 - i * 0.35 }, svg)
			);
			const ty = Y0 - 26;
			if (muted) {
				sv("path", { d: `M${X(i) - 7} ${ty - 7}L${X(i) + 7} ${ty + 7}M${X(i) + 7} ${ty - 7}L${X(i) - 7} ${ty + 7}`, stroke: "#ff8a7a", "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
			} else if (c.frets[i] === 0) {
				sv("circle", { cx: X(i), cy: ty, r: 8, fill: "none", stroke: INK, "stroke-width": 2.2 }, svg);
			}
			const nt = sv("text", { x: X(i), y: Y0 + 4 * FH + 22, "text-anchor": "middle", "font-size": 13, fill: "rgba(244,239,230,0.45)", "font-family": "JetBrains Mono, monospace" }, svg);
			nt.textContent = SNAME[i];
		}
		for (let i = 0; i < 6; i++) {
			const f = c.frets[i];
			if (f <= 0) continue;
			const cy = Y0 + (f - 0.5) * FH;
			sv("circle", { cx: X(i), cy, r: 15, fill: ACC }, svg);
			const t = sv("text", { x: X(i), y: cy + 5.5, "text-anchor": "middle", "font-size": 16, "font-weight": 700, fill: "#241404", "font-family": "Space Grotesk, sans-serif" }, svg);
			t.textContent = c.fingers[i];
		}
		if (label) {
			const t = sv("text", { x: 130, y: 354, "text-anchor": "middle", "font-size": 34, "font-weight": 800, fill: INK, "font-family": "Syne, sans-serif" }, svg);
			t.textContent = key;
		}
		if (onString)
			for (let i = 0; i < 6; i++) {
				const r = sv("rect", { x: X(i) - 18, y: 0, width: 36, height: Y0 + 4 * FH + 10, fill: "transparent" }, svg);
				r.addEventListener("pointerdown", () => onString(i));
			}
		return strings;
	}

	// ---------- 3 Akkorde ----------
	(function chords() {
		const svg = $("chordSvg");
		const note = $("chordNote");
		let cur = "Em";
		let strings = [];
		const glow = (i) => {
			const s = strings[i];
			if (!s) return;
			s.setAttribute("stroke", ACC2);
			setTimeout(() => s.setAttribute("stroke", CHORDS[cur].frets[i] < 0 ? "rgba(244,239,230,0.25)" : "#cfc7b9"), 380);
		};
		const pluckString = (i) => {
			const m = chordNotes(cur)[i];
			if (m == null) {
				note.textContent = `Die ${SNAME[i]}-Saite gehört nicht zum ${CHORDS[cur].name}. Beim Anschlagen auslassen oder mit einem Finger leicht abdämpfen.`;
				return;
			}
			M.pluck(m, { vel: 0.95 });
			glow(i);
			$("chordOut").textContent = `${SNAME[i]}-Saite · ${M.noteName(m)}`;
		};
		function show(key) {
			cur = key;
			strings = drawChord(svg, key, { onString: pluckString });
			$("chordTag").textContent = CHORDS[key].name;
			$("chordOut").textContent = chordNotes(key)
				.map((m) => (m == null ? "×" : M.noteName(m)))
				.join(" ");
			note.textContent = CHORDS[key].tip;
		}
		const btns = ORDER.map((k) =>
			chip(k, $("chordChips"), () => {
				choose(btns, btns[ORDER.indexOf(k)]);
				show(k);
				M.strum(chordNotes(k));
			})
		);
		choose(btns, btns[0]);
		show("Em");
		$("btnStrum").addEventListener("click", () => {
			M.strum(chordNotes(cur));
			chordNotes(cur).forEach((m, i) => m != null && setTimeout(() => glow(i), i * 14));
		});
		$("btnArp").addEventListener("click", () => {
			const ac = M.audio();
			let k = 0;
			chordNotes(cur).forEach((m, i) => {
				if (m == null) return;
				const when = ac.currentTime + 0.05 + k * 0.42;
				M.pluck(m, { when, vel: 0.9 });
				M.at(when, () => glow(i));
				k++;
			});
			note.textContent = "Jede Saite soll klar klingen. Schnarrt eine, rück den Finger näher ans Bundstäbchen. Klingt eine dumpf, berührt ein Finger sie aus Versehen.";
		});
	})();

	// ---------- 4 Ein-Minuten-Wechsel ----------
	(function changes() {
		const PAIRS = [
			["A", "D"], ["D", "E"], ["A", "E"], ["Em", "Am"], ["Am", "E"], ["C", "Am"], ["C", "G"], ["G", "D"], ["Am", "Dm"], ["Em", "C"],
		];
		const KEY = "newbobb-gitarre-wechsel";
		const results = M.store.get(KEY, {});
		const view = $("pairView");
		const tapper = $("tapper");
		const btn = $("btnMinute");
		const countOut = $("countOut");
		const timeOut = $("timeOut");
		const note = $("pairNote");
		const hist = $("history");
		let pair = PAIRS[0];
		let count = 0;
		let running = false;
		let t0 = 0;
		let timer = null;
		let lastBeep = 99;

		const id = () => pair.join("-");
		function drawPair() {
			view.innerHTML = "";
			const a = document.createElementNS(svgNS, "svg");
			const b = document.createElementNS(svgNS, "svg");
			const sw = document.createElement("span");
			sw.className = "swap";
			sw.textContent = "⇄";
			view.append(a, sw, b);
			drawChord(a, pair[0], { label: true });
			drawChord(b, pair[1], { label: true });
		}
		function drawHistory() {
			const list = results[id()] || [];
			const best = list.length ? Math.max(...list) : 0;
			$("pairBest").textContent = best ? `Rekord: ${best}` : "";
			hist.innerHTML = "";
			const top = Math.max(60, best);
			list.slice(-14).forEach((v) => {
				const i = document.createElement("i");
				i.style.height = `${Math.max(4, (v / top) * 100)}%`;
				i.title = `${v} Wechsel`;
				if (v === best) i.classList.add("best");
				hist.appendChild(i);
			});
			if (!list.length) note.textContent = "Noch kein Ergebnis für dieses Paar. Ziel für den Anfang: 30 saubere Wechsel in einer Minute.";
		}

		const btns = PAIRS.map((p, i) =>
			chip(`${p[0]} ⇄ ${p[1]}`, $("pairChips"), () => {
				if (running) return;
				pair = p;
				choose(btns, btns[i]);
				drawPair();
				drawHistory();
			})
		);
		choose(btns, btns[0]);
		drawPair();
		drawHistory();

		function tap() {
			if (!running) return;
			count++;
			countOut.textContent = count;
			M.strum(chordNotes(pair[count % 2]), { vel: 0.55, dur: 1.2 });
			tapper.classList.add("hit");
			setTimeout(() => tapper.classList.remove("hit"), 90);
			tapper.textContent = `Jetzt: ${pair[(count + 1) % 2]}`;
		}
		tapper.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			tap();
		});
		tapper.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				tap();
			}
		});
		document.addEventListener("keydown", (e) => {
			if (!running || e.code !== "Space" || e.repeat) return;
			const tag = (document.activeElement && document.activeElement.tagName) || "";
			if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
			e.preventDefault();
			tap();
		});

		function finish() {
			running = false;
			clearInterval(timer);
			tapper.disabled = true;
			tapper.textContent = "Erst die Minute starten";
			btn.textContent = "⏱ Nochmal";
			timeOut.textContent = "0:00";
			const list = results[id()] || [];
			const prev = list.length ? Math.max(...list) : 0;
			list.push(count);
			results[id()] = list.slice(-30);
			M.store.set(KEY, results);
			drawHistory();
			const ac = M.audio();
			M.piano(79, { when: ac.currentTime, vel: 0.6, dur: 0.5 });
			let msg = `${count} Wechsel. `;
			if (count > prev && prev > 0) msg = `Neuer Rekord: ${count} Wechsel (vorher ${prev}). `;
			if (count < 20) msg += "Guter Anfang. Sauber geht vor schnell, die Geschwindigkeit kommt von allein.";
			else if (count < 30) msg += "Fast bei 30, ab da gehen einfache Lieder.";
			else if (count < 60) msg += "Damit kannst du Lieder begleiten. Nächstes Ziel: 60.";
			else msg += "Flüssig! Nimm dir das nächste Paar vor.";
			note.textContent = msg;
		}

		btn.addEventListener("click", () => {
			if (running) {
				running = false;
				clearInterval(timer);
				tapper.disabled = true;
				btn.textContent = "⏱ Minute starten";
				note.textContent = "Abgebrochen, nichts gespeichert.";
				return;
			}
			M.audio();
			count = 0;
			countOut.textContent = "0";
			running = true;
			t0 = performance.now();
			lastBeep = 99;
			tapper.disabled = false;
			tapper.textContent = `Los! Greif ${pair[0]}, dann ${pair[1]} …`;
			tapper.focus({ preventScroll: true });
			btn.textContent = "■ Abbrechen";
			note.textContent = "Jeder saubere Wechsel zählt: greifen, einmal anschlagen, tippen.";
			M.click(0, true, 0.8);
			timer = setInterval(() => {
				const left = Math.max(0, 60 - (performance.now() - t0) / 1000);
				timeOut.textContent = `0:${String(Math.ceil(left)).padStart(2, "0")}`;
				const s = Math.ceil(left);
				if (s <= 3 && s > 0 && s < lastBeep) {
					lastBeep = s;
					M.click(0, false, 0.6);
				}
				if (left <= 0) finish();
			}, 100);
		});
	})();

	// ---------- 5 Schlagmuster ----------
	(function strumming() {
		const PATTERNS = [
			{ name: "Viertel", steps: "D-D-D-D-", tip: "Nur Abschläge auf 1, 2, 3, 4. Damit fängt jedes neue Lied an. Die Hand geht trotzdem auf den Unds wieder hoch." },
			{ name: "Achtel", steps: "DUDUDUDU", tip: "Ab auf den Zahlen, auf auf den Unds. Gleichmäßig wie ein Uhrwerk. Aufschläge treffen meist nur die hohen Saiten." },
			{ name: "Pop-Klassiker", steps: "D-DU-UDU", tip: "Ab · Ab-Auf · · Auf-Ab-Auf. Das Muster aus unzähligen Lagerfeuer- und Popliedern. Auf der 3 schwingt die Hand ins Leere." },
			{ name: "Folk", steps: "D-DUD-DU", tip: "Ab · Ab-Auf, Ab · Ab-Auf. Treibend und einfach. Betone die Abschläge auf 1 und 3." },
		];
		const PROGS = [
			{ name: "Em · Am", chords: ["Em", "Am"] },
			{ name: "A · D · E · A", chords: ["A", "D", "E", "A"] },
			{ name: "G · D · Em · C", chords: ["G", "D", "Em", "C"] },
			{ name: "C · Am · Dm · G", chords: ["C", "Am", "Dm", "G"] },
		];
		const COUNT = ["1", "+", "2", "+", "3", "+", "4", "+"];
		const cv = $("strumCanvas");
		const { ctx, size } = fitCanvas(cv, (w) => (w < 600 ? 1.15 : 2.5));
		const playBtn = $("btnPlay");
		const bpmIn = $("bpm");
		const gBtn = $("btnGuitar");
		const cBtn = $("btnClick");
		let pat = PATTERNS[2];
		let prog = PROGS[2];
		let guitar = true;
		let clickOn = true;
		const queue = [];
		const cur = { step: -1, time: 0, hit: -9 };

		const clock = M.createClock({
			bpm: 70,
			steps: 8 * prog.chords.length,
			perBeat: 2,
			onStep(step, time) {
				const e = step % 8;
				const key = prog.chords[Math.floor(step / 8) % prog.chords.length];
				const sym = pat.steps[e];
				if (clickOn && e % 2 === 0) M.click(time, e === 0);
				if (guitar && sym !== "-")
					M.strum(chordNotes(key), { when: time, dir: sym === "D" ? "down" : "up", vel: e === 0 ? 1 : 0.78, dur: Math.min(2.2, (60 / clock.bpm) * 2) });
				queue.push({ step, time, sym });
			},
		});
		clock.onAutoStop = () => setPlaying(false);

		function setPlaying(on) {
			playBtn.setAttribute("aria-pressed", String(on));
			playBtn.textContent = on ? "■ Stopp" : "▶ Start";
			if (on) {
				queue.length = 0;
				cur.step = -1;
				clock.setSteps(8 * prog.chords.length);
				clock.start();
			} else clock.stop();
		}
		playBtn.addEventListener("click", () => setPlaying(!clock.running));
		bpmIn.addEventListener("input", () => {
			clock.bpm = Number(bpmIn.value);
			$("bpmOut").textContent = `${bpmIn.value} BPM`;
		});
		const toggle = (b, fn) =>
			b.addEventListener("click", () => {
				const v = b.getAttribute("aria-pressed") !== "true";
				b.setAttribute("aria-pressed", String(v));
				fn(v);
			});
		toggle(gBtn, (v) => (guitar = v));
		toggle(cBtn, (v) => (clickOn = v));

		const pBtns = PATTERNS.map((p, i) =>
			chip(p.name, $("patternChips"), () => {
				pat = p;
				choose(pBtns, pBtns[i]);
				$("strumTag").textContent = p.name;
				$("strumNote").textContent = p.tip;
			})
		);
		choose(pBtns, pBtns[2]);
		$("strumTag").textContent = pat.name;
		$("strumNote").textContent = pat.tip;
		const gBtns = PROGS.map((p, i) =>
			chip(p.name, $("progChips"), () => {
				prog = p;
				choose(gBtns, gBtns[i]);
				if (clock.running) {
					clock.stop();
					setPlaying(true);
				}
			})
		);
		choose(gBtns, gBtns[2]);

		function roundRect(x, y, w, h, r) {
			ctx.beginPath();
			ctx.moveTo(x + r, y);
			ctx.arcTo(x + w, y, x + w, y + h, r);
			ctx.arcTo(x + w, y + h, x, y + h, r);
			ctx.arcTo(x, y + h, x, y, r);
			ctx.arcTo(x, y, x + w, y, r);
			ctx.closePath();
		}

		function arrow(x, y, s, up, alpha, color) {
			ctx.save();
			ctx.translate(x, y);
			if (up) ctx.scale(1, -1);
			ctx.globalAlpha = alpha;
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.moveTo(-s * 0.18, -s * 0.5);
			ctx.lineTo(s * 0.18, -s * 0.5);
			ctx.lineTo(s * 0.18, s * 0.05);
			ctx.lineTo(s * 0.42, s * 0.05);
			ctx.lineTo(0, s * 0.5);
			ctx.lineTo(-s * 0.42, s * 0.05);
			ctx.lineTo(-s * 0.18, s * 0.05);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}

		whenVisible(cv, () => {
			const { w, h } = size;
			const now = clock.running ? M.audio().currentTime : 0;
			while (queue.length && queue[0].time <= now) {
				const ev = queue.shift();
				cur.step = ev.step;
				cur.time = ev.time;
				if (ev.sym !== "-") cur.hit = ev.time;
			}
			const eighth = 60 / clock.bpm / 2;
			const playing = clock.running && cur.step >= 0;
			const phase = playing ? Math.min(1, (now - cur.time) / eighth) : 0;
			const e = playing ? cur.step % 8 : -1;
			const bar = playing ? Math.floor(cur.step / 8) % prog.chords.length : 0;

			ctx.clearRect(0, 0, w, h);
			const narrow = w < 600;
			const pad = 14;

			// Akkordfolge
			const n = prog.chords.length;
			const rowH = h * (narrow ? 0.2 : 0.26);
			const bw = (w - pad * 2 - (n - 1) * 8) / n;
			prog.chords.forEach((k, i) => {
				const x = pad + i * (bw + 8);
				const y = 34;
				const isCur = playing && i === bar;
				const isNext = playing && i === (bar + 1) % n && e >= 6 && n > 1;
				roundRect(x, y, bw, rowH - 34, 12);
				ctx.fillStyle = isCur ? "rgba(245,177,76,0.18)" : "rgba(255,255,255,0.04)";
				ctx.fill();
				ctx.lineWidth = isCur || isNext ? 2 : 1;
				ctx.strokeStyle = isCur ? ACC : isNext ? ACC2 : "rgba(255,255,255,0.1)";
				ctx.stroke();
				ctx.fillStyle = isCur ? INK : "rgba(244,239,230,0.6)";
				ctx.font = `800 ${Math.min(30, (rowH - 34) * 0.5)}px Syne, sans-serif`;
				ctx.textAlign = "center";
				ctx.fillText(k, x + bw / 2, y + (rowH - 34) * 0.66);
				if (isNext) {
					ctx.fillStyle = ACC2;
					ctx.font = "600 10px 'Space Grotesk', sans-serif";
					ctx.fillText("ALS NÄCHSTES", x + bw / 2, y + rowH - 34 - 6);
				}
			});

			// Pendel rechts (breit) oder unten (schmal)
			const top = rowH + 12;
			const pw = narrow ? w - pad * 2 : Math.min(190, w * 0.22);
			const slotsW = narrow ? w - pad * 2 : w - pad * 3 - pw;
			const slotsH = narrow ? (h - top) * 0.55 : h - top - pad;
			const sw = slotsW / 8;
			for (let i = 0; i < 8; i++) {
				const x = pad + i * sw;
				const sym = pat.steps[i];
				const active = i === e;
				roundRect(x + 3, top, sw - 6, slotsH - 26, 10);
				ctx.fillStyle = active ? "rgba(245,177,76,0.2)" : i % 2 === 0 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.025)";
				ctx.fill();
				if (active) {
					ctx.strokeStyle = ACC;
					ctx.lineWidth = 2;
					ctx.stroke();
				}
				const s = Math.min(sw * 0.75, (slotsH - 26) * 0.62) * (i % 2 === 0 ? 1 : 0.8);
				const cy = top + (slotsH - 26) / 2;
				if (sym === "-") {
					ctx.fillStyle = "rgba(244,239,230,0.25)";
					ctx.beginPath();
					ctx.arc(x + sw / 2, cy, 3.5, 0, Math.PI * 2);
					ctx.fill();
				} else arrow(x + sw / 2, cy, s, sym === "U", active ? 1 : 0.75, sym === "D" ? ACC : ACC2);
				ctx.fillStyle = active ? INK : i % 2 === 0 ? "rgba(244,239,230,0.75)" : "rgba(244,239,230,0.4)";
				ctx.font = `${i % 2 === 0 ? 700 : 500} 15px 'Space Grotesk', sans-serif`;
				ctx.fillText(COUNT[i], x + sw / 2, top + slotsH - 6);
			}

			// Pendel: die Hand schwingt durchgehend ab und auf
			const px = narrow ? pad : pad * 2 + slotsW;
			const py = narrow ? top + slotsH + 10 : top;
			const ph = narrow ? h - py - pad : slotsH - 26;
			roundRect(px, py, pw, ph, 12);
			ctx.fillStyle = "rgba(255,255,255,0.03)";
			ctx.fill();
			const mid = py + ph / 2;
			const flash = playing ? Math.max(0, 1 - (now - cur.hit) / 0.25) : 0;
			for (let i = 0; i < 6; i++) {
				const y = mid - ph * 0.22 + i * ph * 0.088;
				ctx.strokeStyle = flash > 0 ? `rgba(245,177,76,${0.35 + flash * 0.6})` : "rgba(230,226,218,0.45)";
				ctx.lineWidth = 2.6 - i * 0.3;
				ctx.beginPath();
				ctx.moveTo(px + 12, y);
				ctx.lineTo(px + pw - 12, y);
				ctx.stroke();
			}
			const amp = ph * 0.38;
			const pos = playing ? (cur.step % 2) + phase : 0;
			const yPick = mid + amp * Math.sin(Math.PI * pos);
			const ghost = playing && pat.steps[e] === "-";
			ctx.save();
			ctx.translate(px + pw / 2, yPick);
			ctx.globalAlpha = ghost ? 0.4 : 1;
			ctx.fillStyle = ACC;
			ctx.beginPath();
			ctx.moveTo(-15, -12);
			ctx.quadraticCurveTo(0, -20, 15, -12);
			ctx.quadraticCurveTo(10, 8, 0, 16);
			ctx.quadraticCurveTo(-10, 8, -15, -12);
			ctx.fill();
			ctx.restore();
			ctx.fillStyle = "rgba(244,239,230,0.45)";
			ctx.font = "500 11px 'Space Grotesk', sans-serif";
			ctx.fillText(ghost ? "Luftschlag" : "Pendel", px + pw / 2, py + ph - 8);
			ctx.textAlign = "start";

			$("strumOut").textContent = playing ? `Takt ${bar + 1}/${n} · ${CHORDS[prog.chords[bar]].name}` : "";
		});
	})();

	// ---------- 7 Tabs lesen ----------
	(function tabs() {
		// [Saite (0 = tiefe E), Bund, Dauer in Achteln]
		const N = { G3: [3, 0], C: [4, 1], D: [4, 3], E: [5, 0], F: [5, 1], G: [5, 3], A: [5, 5] };
		const parse = (str) =>
			str.split(" ").map((tok) => {
				const [, n, d] = tok.match(/^([A-H]\d?)(\d)$/);
				return [...N[n], Number(d)];
			});
		const SONGS = [
			{ name: "Ode an die Freude", notes: parse("E2 E2 F2 G2 G2 F2 E2 D2 C2 C2 D2 E2 E3 D1 D4 E2 E2 F2 G2 G2 F2 E2 D2 C2 C2 D2 E2 D3 C1 C4"), tip: "Beethoven, nur auf den zwei hohen Saiten. Achte auf den punktierten Rhythmus am Ende jeder Zeile: lang, kurz, lang." },
			{ name: "Bruder Jakob", notes: parse("C2 D2 E2 C2 C2 D2 E2 C2 E2 F2 G4 E2 F2 G4 G1 A1 G1 F1 E2 C2 G1 A1 G1 F1 E2 C2 C2 G32 C4 C2 G32 C4"), tip: "Der Kanon geht auch zu zweit: Die zweite Stimme fängt an, wenn die erste bei Takt 3 ist. Der tiefe Ton ist die leere G-Saite." },
			{ name: "Alle meine Entchen", notes: parse("C2 D2 E2 F2 G4 G4 A2 A2 A2 A2 G8 A2 A2 A2 A2 G8 F2 F2 F2 F2 E4 E4 D2 D2 D2 D2 C8"), tip: "Das A liegt im 5. Bund der e-Saite. Greif es mit dem kleinen Finger oder rutsch kurz mit dem Ringfinger hoch." },
			{ name: "Bass-Riff", notes: [[0, 0, 2], [0, 0, 1], [0, 3, 1], [0, 0, 1], [0, 5, 1], [0, 3, 2], [1, 0, 2], [1, 0, 1], [1, 3, 1], [1, 0, 1], [1, 5, 1], [1, 3, 2]], tip: "Ein Riff auf den zwei tiefen Saiten. Dämpf die anderen Saiten mit der Handfläche der Schlaghand leicht ab." },
		];
		const svg = $("tabSvg");
		const btn = $("btnTab");
		const bpmIn = $("tabBpm");
		const loopBtn = $("btnTabLoop");
		let song = SONGS[0];
		let starts = [];
		let total = 0;
		let cells = [];
		let loop = true;

		function layout() {
			starts = [];
			total = 0;
			song.notes.forEach((n) => {
				starts.push(total);
				total += n[2];
			});
			const W = Math.max(320, svg.clientWidth || 600);
			const bars = Math.ceil(total / 8);
			const perLine = Math.max(1, Math.min(4, Math.floor((W - 40) / 155)));
			const lines = Math.ceil(bars / perLine);
			const LH = 150;
			const H = lines * LH + 20;
			svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
			svg.innerHTML = "";
			cells = [];
			const x0 = 34;
			const barW = (W - x0 - 12) / perLine;
			for (let l = 0; l < lines; l++) {
				const top = 46 + l * LH;
				for (let s = 0; s < 6; s++) {
					const y = top + s * 18;
					sv("line", { x1: x0 - 6, x2: W - 12, y1: y, y2: y, stroke: "rgba(244,239,230,0.3)", "stroke-width": 1.2 }, svg);
					if (l === 0 || W > 0) {
						const t = sv("text", { x: 10, y: y + 4, "font-size": 11, fill: "rgba(244,239,230,0.5)", "font-family": "JetBrains Mono, monospace" }, svg);
						t.textContent = ["e", "H", "G", "D", "A", "E"][s];
					}
				}
				const nb = Math.min(perLine, bars - l * perLine);
				for (let b = 0; b <= nb; b++) {
					const x = x0 + b * barW - 4;
					sv("line", { x1: x, x2: x, y1: top, y2: top + 90, stroke: "rgba(244,239,230,0.45)", "stroke-width": 1.5 }, svg);
				}
			}
			song.notes.forEach((n, i) => {
				const st = starts[i];
				const bar = Math.floor(st / 8);
				const line = Math.floor(bar / perLine);
				const x = x0 + (bar % perLine) * barW + ((st % 8) / 8) * (barW - 8) + 10;
				const y = 46 + line * LH + (5 - n[0]) * 18;
				const bg = sv("rect", { x: x - 10, y: y - 10, width: 20, height: 20, rx: 6, fill: "#070605" }, svg);
				const t = sv("text", { x, y: y + 5, "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: INK, "font-family": "JetBrains Mono, monospace" }, svg);
				t.textContent = n[1];
				// Rhythmus als kleine Hälse unter dem Tab
				const ry = 46 + line * LH + 100;
				sv("line", { x1: x, x2: x, y1: ry, y2: ry + (n[2] >= 4 ? 8 : 18), stroke: "rgba(244,239,230,0.5)", "stroke-width": 1.4 }, svg);
				if (n[2] >= 4) sv("circle", { cx: x, cy: ry + 13, r: 4, fill: "none", stroke: "rgba(244,239,230,0.5)", "stroke-width": 1.4 }, svg);
				if (n[2] === 1) sv("line", { x1: x, x2: x + 8, y1: ry + 18, y2: ry + 12, stroke: "rgba(244,239,230,0.5)", "stroke-width": 1.4 }, svg);
				if (n[2] === 3) sv("circle", { cx: x + 6, cy: ry + 16, r: 1.6, fill: "rgba(244,239,230,0.6)" }, svg);
				cells.push({ bg, t });
			});
		}
		function mark(i) {
			cells.forEach((c, j) => {
				c.bg.setAttribute("fill", j === i ? ACC : "#070605");
				c.t.setAttribute("fill", j === i ? "#241404" : INK);
			});
		}

		const clock = M.createClock({
			bpm: 80,
			steps: 8,
			perBeat: 2,
			onStep(step, time) {
				const eighth = 60 / clock.bpm / 2;
				if (step % 2 === 0) M.click(time, step % 8 === 0, 0.25);
				const i = starts.indexOf(step);
				if (i >= 0) {
					const n = song.notes[i];
					M.pluck(OPEN[n[0]] + n[1], { when: time, vel: 0.95, dur: n[2] * eighth + 0.25 });
					M.at(time, () => {
						if (!clock.running) return;
						mark(i);
						$("tabOut").textContent = `${["tiefe E", "A", "D", "G", "H", "hohe e"][n[0]]}-Saite · Bund ${n[1]}`;
					});
				}
				if (step === total - 1 && !loop) M.at(time + eighth, () => setPlaying(false));
			},
		});
		clock.onAutoStop = () => setPlaying(false);
		function setPlaying(on) {
			btn.setAttribute("aria-pressed", String(on));
			btn.textContent = on ? "■ Stopp" : "▶ Play";
			if (on) {
				clock.setSteps(total);
				clock.start();
			} else {
				clock.stop();
				mark(-1);
			}
		}
		btn.addEventListener("click", () => setPlaying(!clock.running));
		bpmIn.addEventListener("input", () => {
			clock.bpm = Number(bpmIn.value);
			$("tabBpmOut").textContent = `${bpmIn.value} BPM`;
		});
		loopBtn.addEventListener("click", () => {
			loop = !loop;
			loopBtn.setAttribute("aria-pressed", String(loop));
		});
		const btns = SONGS.map((s, i) =>
			chip(s.name, $("tabSongs"), () => {
				setPlaying(false);
				song = s;
				choose(btns, btns[i]);
				$("tabTag").textContent = s.name;
				$("tabNote").textContent = s.tip;
				layout();
			})
		);
		choose(btns, btns[0]);
		$("tabNote").textContent = song.tip;
		layout();
		let rw = 0;
		window.addEventListener("resize", () => {
			if (Math.abs(svg.clientWidth - rw) < 20) return;
			rw = svg.clientWidth;
			layout();
		});
	})();

	// ---------- 8 Fingerpicking ----------
	(function picking() {
		const BASS = { Am: [1, 2], Em: [0, 2], C: [1, 2], G: [0, 2], D: [2, 1], Dm: [2, 1], A: [1, 2], E: [0, 2] };
		const PATTERNS = [
			{ name: "Arpeggio", steps: ["B", "i", "m", "a", "m", "i", "A", "i"], tip: "p i m a m i: Der Daumen beginnt, dann laufen die Finger hoch und wieder runter. Das klassische Lagerfeuer-Zupfen." },
			{ name: "Daumen und Griff", steps: ["B", "-", "X", "-", "A", "-", "X", "-"], tip: "Der Daumen spielt den Bass, dann zupfen i, m und a gleichzeitig. Ein guter erster Schritt, weil die Finger als Team arbeiten." },
			{ name: "Travis", steps: ["P", "m", "A", "i", "B", "m", "A", "i"], tip: "Wechselbass: Der Daumen springt auf jedem Schlag zwischen zwei Basssaiten, die Finger spielen auf den Unds. Erst den Daumen allein üben!" },
		];
		const PROGS = [
			{ name: "Am · Em", chords: ["Am", "Em"] },
			{ name: "C · Am · Dm · G", chords: ["C", "Am", "Dm", "G"] },
			{ name: "G · Em · C · D", chords: ["G", "Em", "C", "D"] },
		];
		const COUNT = ["1", "+", "2", "+", "3", "+", "4", "+"];
		const svg = $("pickSvg");
		const btn = $("btnPick");
		const bpmIn = $("pickBpm");
		let pat = PATTERNS[0];
		let prog = PROGS[0];
		let cols = [];
		const strOf = (tok, key) => {
			const [b, a] = BASS[key];
			return { B: [b], A: [a], i: [3], m: [4], a: [5], P: [b, 5], X: [3, 4, 5], "-": [] }[tok];
		};
		const fingerOf = (s, tok) => (s <= 2 ? "p" : { 3: "i", 4: "m", 5: "a" }[s]) + (tok === "-" ? "" : "");
		const noteOf = (key, s) => {
			const f = CHORDS[key].frets[s];
			return OPEN[s] + Math.max(0, f);
		};

		function draw(key) {
			svg.innerHTML = "";
			const X = (i) => 92 + i * 62;
			const Y = (s) => 40 + (5 - s) * 34;
			for (let s = 0; s < 6; s++) {
				sv("line", { x1: 50, x2: 590, y1: Y(s), y2: Y(s), stroke: s < 3 ? "#d6b98c" : "#e6e2da", "stroke-width": 3 - s * 0.35, opacity: 0.55 }, svg);
				const t = sv("text", { x: 18, y: Y(s) + 4, "font-size": 13, fill: "rgba(244,239,230,0.55)", "font-family": "JetBrains Mono, monospace" }, svg);
				t.textContent = ["E", "A", "D", "G", "H", "e"][s];
			}
			cols = [];
			pat.steps.forEach((tok, i) => {
				const hl = sv("rect", { x: X(i) - 24, y: 18, width: 48, height: 236, rx: 10, fill: "transparent" }, svg);
				const dots = [];
				strOf(tok, key).forEach((s) => {
					const p = s <= 2;
					const c = sv("circle", { cx: X(i), cy: Y(s), r: 14, fill: p ? ACC : ACC2 }, svg);
					const t = sv("text", { x: X(i), y: Y(s) + 5, "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: "#1a1004", "font-family": "Space Grotesk, sans-serif" }, svg);
					t.textContent = fingerOf(s, tok);
					dots.push(c);
				});
				const ct = sv("text", { x: X(i), y: 278, "text-anchor": "middle", "font-size": 15, "font-weight": i % 2 ? 500 : 700, fill: i % 2 ? "rgba(244,239,230,0.45)" : "rgba(244,239,230,0.8)", "font-family": "Space Grotesk, sans-serif" }, svg);
				ct.textContent = COUNT[i];
				cols.push({ hl, dots });
			});
		}
		function mark(i) {
			cols.forEach((c, j) => c.hl.setAttribute("fill", j === i ? "rgba(245,177,76,0.16)" : "transparent"));
		}

		let shownKey = null;
		const clock = M.createClock({
			bpm: 66,
			steps: 8 * prog.chords.length,
			perBeat: 2,
			onStep(step, time) {
				const key = prog.chords[Math.floor(step / 8) % prog.chords.length];
				const e = step % 8;
				const strs = strOf(pat.steps[e], key);
				const eighth = 60 / clock.bpm / 2;
				strs.forEach((s) => M.pluck(noteOf(key, s), { when: time, vel: s <= 2 ? 0.95 : 0.7, bright: 0.45, dur: eighth * 6 }));
				M.at(time, () => {
					if (!clock.running) return;
					if (shownKey !== key) {
						shownKey = key;
						draw(key);
					}
					mark(e);
					$("pickOut").textContent = `${CHORDS[key].name} · Daumen auf ${["E", "A", "D"][BASS[key][0]]}`;
				});
			},
		});
		clock.onAutoStop = () => setPlaying(false);
		function setPlaying(on) {
			btn.setAttribute("aria-pressed", String(on));
			btn.textContent = on ? "■ Stopp" : "▶ Start";
			if (on) {
				clock.setSteps(8 * prog.chords.length);
				clock.start();
			} else {
				clock.stop();
				mark(-1);
			}
		}
		btn.addEventListener("click", () => setPlaying(!clock.running));
		bpmIn.addEventListener("input", () => {
			clock.bpm = Number(bpmIn.value);
			$("pickBpmOut").textContent = `${bpmIn.value} BPM`;
		});
		const pBtns = PATTERNS.map((p, i) =>
			chip(p.name, $("pickPatterns"), () => {
				pat = p;
				choose(pBtns, pBtns[i]);
				$("pickTag").textContent = p.name;
				$("pickNote").textContent = p.tip;
				shownKey = prog.chords[0];
				draw(shownKey);
			})
		);
		const gBtns = PROGS.map((p, i) =>
			chip(p.name, $("pickProgs"), () => {
				prog = p;
				choose(gBtns, gBtns[i]);
				if (clock.running) {
					clock.stop();
					setPlaying(true);
				} else {
					shownKey = p.chords[0];
					draw(shownKey);
				}
			})
		);
		choose(pBtns, pBtns[0]);
		choose(gBtns, gBtns[0]);
		$("pickNote").textContent = pat.tip;
		shownKey = "Am";
		draw("Am");
	})();

	// ---------- 9 Barré ----------
	const SHAPES = [
		{ name: "E-Form Dur", root: 0, minor: false, frets: (b) => [b, b + 2, b + 2, b + 1, b, b], fingers: [1, 3, 4, 2, 1, 1] },
		{ name: "E-Form Moll", root: 0, minor: true, frets: (b) => [b, b + 2, b + 2, b, b, b], fingers: [1, 3, 4, 1, 1, 1] },
		{ name: "A-Form Dur", root: 1, minor: false, frets: (b) => [-1, b, b + 2, b + 2, b + 2, b], fingers: [0, 1, 2, 3, 4, 1] },
		{ name: "A-Form Moll", root: 1, minor: true, frets: (b) => [-1, b, b + 2, b + 2, b + 1, b], fingers: [0, 1, 3, 4, 2, 1] },
	];
	const shapeName = (sh, b) => {
		const n = M.noteName(OPEN[sh.root] + b);
		return sh.minor ? `${n.toLowerCase()}-Moll` : `${n}-Dur`;
	};
	const shapeNotes = (sh, b) => sh.frets(b).map((f, i) => (f < 0 ? null : OPEN[i] + f));

	(function barre() {
		const svg = $("barreSvg");
		const fretIn = $("barreFret");
		let shape = SHAPES[0];

		function draw() {
			const b = Number(fretIn.value);
			const frets = shape.frets(b);
			svg.innerHTML = "";
			const X = (i) => 50 + i * 34;
			const Y0 = 58;
			const FH = 56;
			for (let f = 0; f <= 4; f++) sv("line", { x1: X(0), y1: Y0 + f * FH, x2: X(5), y2: Y0 + f * FH, stroke: f === 0 && b === 1 ? "#e8e1d4" : "rgba(244,239,230,0.35)", "stroke-width": f === 0 && b === 1 ? 8 : 2 }, svg);
			for (let i = 0; i < 6; i++) {
				sv("line", { x1: X(i), y1: Y0, x2: X(i), y2: Y0 + 4 * FH, stroke: frets[i] < 0 ? "rgba(244,239,230,0.25)" : "#cfc7b9", "stroke-width": 3.2 - i * 0.35 }, svg);
				if (frets[i] < 0) sv("path", { d: `M${X(i) - 7} ${Y0 - 33}L${X(i) + 7} ${Y0 - 19}M${X(i) + 7} ${Y0 - 33}L${X(i) - 7} ${Y0 - 19}`, stroke: "#ff8a7a", "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
			}
			for (let r = 0; r < 4; r++) {
				const t = sv("text", { x: 22, y: Y0 + (r + 0.5) * FH + 5, "text-anchor": "middle", "font-size": 13, fill: r === 0 ? ACC : "rgba(244,239,230,0.4)", "font-family": "JetBrains Mono, monospace" }, svg);
				t.textContent = b + r;
			}
			// Barré-Balken
			const barS = frets.map((f, i) => (shape.fingers[i] === 1 && f === b ? i : -1)).filter((i) => i >= 0);
			const first = shape.root;
			const cy0 = Y0 + 0.5 * FH;
			sv("rect", { x: X(first) - 15, y: cy0 - 15, width: X(Math.max(...barS)) - X(first) + 30, height: 30, rx: 15, fill: ACC }, svg);
			const bt = sv("text", { x: X(first), y: cy0 + 5.5, "text-anchor": "middle", "font-size": 16, "font-weight": 700, fill: "#241404", "font-family": "Space Grotesk, sans-serif" }, svg);
			bt.textContent = "1";
			frets.forEach((f, i) => {
				if (f <= b || shape.fingers[i] === 1) return;
				const cy = Y0 + (f - b + 0.5) * FH;
				sv("circle", { cx: X(i), cy, r: 15, fill: ACC }, svg);
				const t = sv("text", { x: X(i), y: cy + 5.5, "text-anchor": "middle", "font-size": 16, "font-weight": 700, fill: "#241404", "font-family": "Space Grotesk, sans-serif" }, svg);
				t.textContent = shape.fingers[i];
			});
			sv("circle", { cx: X(shape.root), cy: Y0 + 4 * FH + 22, r: 4, fill: ACC2 }, svg);
			const name = shapeName(shape, b);
			$("barreOut").textContent = M.noteName(OPEN[shape.root] + b) + (shape.minor ? "m" : "");
			$("barreFretOut").textContent = b;
			$("barreNote").textContent = `${name}: Grundton ${M.noteName(OPEN[shape.root] + b)} im ${b}. Bund auf der ${shape.root === 0 ? "tiefen E" : "A"}-Saite (grüner Punkt).${shape.root === 1 ? " Die tiefe E-Saite bleibt still." : ""}${b === 5 && shape.root === 0 ? " Hier ist der beste Ort zum Üben." : ""}`;
		}
		const strumIt = () => M.strum(shapeNotes(shape, Number(fretIn.value)), { vel: 0.85 });
		const btns = SHAPES.map((sh, i) =>
			chip(sh.name, $("barreShapes"), () => {
				shape = sh;
				choose(btns, btns[i]);
				draw();
				strumIt();
			})
		);
		choose(btns, btns[0]);
		let last = 0;
		fretIn.addEventListener("input", () => {
			draw();
			const now = performance.now();
			if (now - last > 160) {
				last = now;
				strumIt();
			}
		});
		$("btnBarre").addEventListener("click", strumIt);
		draw();
	})();

	// ---------- 10 Gehörtraining ----------
	(function ear() {
		const cv = $("earCanvas");
		const { ctx, size } = fitCanvas(cv, (w) => (w < 500 ? 1.7 : 2.4));
		const note = $("earNote");
		const MODES = [
			{ name: "Dur oder Moll?", answers: ["Dur", "Moll"] },
			{ name: "Stufen in G-Dur", answers: ["I · G", "IV · C", "V · D", "vi · Em"] },
		];
		const STUFEN = ["G", "C", "D", "Em"];
		let mode = MODES[0];
		let q = null;
		let locked = true;
		let right = 0;
		let total = 0;
		let streak = 0;
		let pulse = 0;
		let shown = "?";
		let shownColor = INK;

		function play() {
			if (!q) return;
			const ac = M.audio();
			pulse = 1;
			if (mode === MODES[0]) {
				M.strum(q.notes, { vel: 0.9 });
				setTimeout(() => (pulse = 1), 900);
				M.strum(q.notes, { when: ac.currentTime + 0.9, vel: 0.7, spread: 0.12 });
			} else {
				M.strum(chordNotes("G"), { vel: 0.8 });
				M.strum(chordNotes(STUFEN[q.answer]), { when: ac.currentTime + 1.3, vel: 0.9 });
				setTimeout(() => (pulse = 1), 1300);
			}
		}
		function next() {
			if (mode === MODES[0]) {
				const minor = Math.random() < 0.5;
				const pool = SHAPES.filter((s) => s.minor === minor);
				const sh = pool[Math.floor(Math.random() * pool.length)];
				const b = 1 + Math.floor(Math.random() * 7);
				q = { answer: minor ? 1 : 0, notes: shapeNotes(sh, b), label: shapeName(sh, b) };
			} else {
				const a = Math.floor(Math.random() * 4);
				q = { answer: a, label: CHORDS[STUFEN[a]].name };
			}
			locked = false;
			shown = "?";
			shownColor = INK;
			ansBtns.forEach((b) => b.classList.remove("is-right", "is-wrong"));
			note.textContent = mode === MODES[0] ? "Klingt der Akkord hell oder dunkel?" : "Erst kommt G als Heimat, dann der gesuchte Akkord.";
			play();
		}
		let ansBtns = [];
		function buildAnswers() {
			$("earAnswers").innerHTML = "";
			ansBtns = mode.answers.map((a, i) => {
				const b = chip(a, $("earAnswers"), () => answer(i));
				b.removeAttribute("aria-pressed");
				return b;
			});
		}
		function answer(i) {
			if (locked || !q) return;
			locked = true;
			total++;
			if (i === q.answer) {
				right++;
				streak++;
				ansBtns[i].classList.add("is-right");
				shownColor = "#7bdc9a";
				note.textContent = `Richtig: ${q.label}.`;
				setTimeout(next, 1400);
			} else {
				streak = 0;
				ansBtns[i].classList.add("is-wrong");
				ansBtns[q.answer].classList.add("is-right");
				shownColor = "#ff8a7a";
				note.textContent = `Das war ${q.label}. Hör es dir mit 🔁 nochmal an und vergleiche, dann weiter mit ▶.`;
			}
			shown = mode.answers[q.answer].split(" · ")[0];
			$("earOut").textContent = `${right} von ${total} · Serie ${streak}`;
		}
		const mBtns = MODES.map((m, i) =>
			chip(m.name, $("earModes"), () => {
				mode = m;
				choose(mBtns, mBtns[i]);
				$("earTag").textContent = m.name;
				buildAnswers();
				q = null;
				locked = true;
				shown = "?";
				note.textContent = "Drück ▶, um zu starten.";
			})
		);
		choose(mBtns, mBtns[0]);
		buildAnswers();
		note.textContent = "Drück ▶, um zu starten. Am besten mit Kopfhörern.";
		$("btnEarPlay").addEventListener("click", next);
		$("btnEarAgain").addEventListener("click", play);

		whenVisible(cv, (dt, t) => {
			const { w, h } = size;
			ctx.clearRect(0, 0, w, h);
			pulse = Math.max(0, pulse - dt * 0.8);
			const cx = w / 2;
			const cy = h / 2;
			for (let k = 0; k < 4; k++) {
				const r = 40 + k * 26 + (reduced ? 0 : Math.sin(t * 2 + k) * 3) + pulse * 30;
				ctx.strokeStyle = `rgba(245,177,76,${0.08 + pulse * 0.25 - k * 0.015})`;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(cx, cy, r, 0, Math.PI * 2);
				ctx.stroke();
			}
			ctx.fillStyle = shownColor;
			ctx.textAlign = "center";
			ctx.font = `800 ${Math.min(64, h * 0.3)}px Syne, sans-serif`;
			ctx.fillText(shown, cx, cy + Math.min(64, h * 0.3) * 0.35);
			ctx.textAlign = "start";
		});
	})();

	// ---------- 11 Übeplan ----------
	M.practicePlan($("plan"), "gitarre", [
		{ min: 2, title: "Stimmen und lockern", tip: "Gitarre stimmen, Schultern kreisen, Hände ausschütteln." },
		{ min: 3, title: "Aufwärmen: 1-2-3-4", tip: "Auf jeder Saite Bund 1 bis 4, ein Finger pro Bund. Langsam, jeder Ton klar." },
		{ min: 5, title: "Ein-Minuten-Wechsel", tip: "Zwei Akkordpaare, je zwei Durchgänge. Ergebnis merken." },
		{ min: 4, title: "Rhythmus mit Metronom", tip: "Ein Schlagmuster, etwas langsamer als bequem. Der Fuß tippt mit." },
		{ min: 6, title: "Ein Lied spielen", tip: "Die schwierige Stelle einzeln üben, dann das Lied einmal ganz. Spaß zuletzt, damit du morgen wiederkommst." },
	]);
})();
