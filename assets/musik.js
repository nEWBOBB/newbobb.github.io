// Gemeinsame Helfer der Reihe „Spielen lernen“: Klangerzeugung, Metronom-Uhr, Tonhöhenerkennung,
// Speichern im Browser und ein Übeplan mit Timer und Serie.

(() => {
	let ctx = null;
	let bus = null;

	// AudioContext erst beim ersten Tippen erzeugen (Browser verlangen eine Geste).
	function audio() {
		if (!ctx) {
			ctx = new (window.AudioContext || window.webkitAudioContext)();
			const comp = ctx.createDynamicsCompressor();
			comp.threshold.value = -14;
			comp.knee.value = 12;
			comp.ratio.value = 4;
			comp.attack.value = 0.004;
			comp.release.value = 0.2;
			bus = ctx.createGain();
			bus.gain.value = 0.85;
			bus.connect(comp);
			comp.connect(ctx.destination);
		}
		if (ctx.state === "suspended") ctx.resume();
		return ctx;
	}

	const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
	const ftom = (f) => 69 + 12 * Math.log2(f / 440);

	// Deutsche Tonnamen: H statt B, B ist das erniedrigte H.
	const NAMES = ["C", "Cis", "D", "Dis", "E", "F", "Fis", "G", "Gis", "A", "B", "H"];
	const noteName = (m, withOctave = false) =>
		NAMES[((m % 12) + 12) % 12] + (withOctave ? String(Math.floor(m / 12) - 1) : "");
	const isBlack = (m) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);

	// ---------- Gitarre: Karplus-Strong ----------
	// Ein Rauschstoß läuft durch eine Verzögerung mit Tiefpass, genau wie eine Saite, die hin- und herschwingt.
	const pluckCache = new Map();
	function pluckBuffer(midi) {
		const ac = audio();
		if (pluckCache.has(midi)) return pluckCache.get(midi);
		const sr = ac.sampleRate;
		const f = mtof(midi);
		const N = Math.max(2, Math.floor(sr / f - 0.5));
		const len = Math.floor(sr * 3.2);
		const out = new Float32Array(len);
		const line = new Float32Array(N);
		for (let i = 0; i < N; i++) line[i] = Math.random() * 2 - 1;
		// Anschlag etwas weicher machen: zweimal glätten
		for (let pass = 0; pass < 2; pass++) for (let i = 1; i < N; i++) line[i] = (line[i] + line[i - 1]) * 0.5;
		let mean = 0;
		for (let i = 0; i < N; i++) mean += line[i] / N;
		for (let i = 0; i < N; i++) line[i] -= mean;
		const t60 = 4.2 - (midi - 40) * 0.06;
		const damp = Math.pow(0.001, 1 / (f * Math.max(1.2, t60)));
		let idx = 0;
		let peak = 0;
		for (let i = 0; i < len; i++) {
			const a = line[idx];
			const b = line[idx + 1 === N ? 0 : idx + 1];
			line[idx] = (a + b) * 0.5 * damp;
			out[i] = a;
			if (Math.abs(a) > peak) peak = Math.abs(a);
			idx = idx + 1 === N ? 0 : idx + 1;
		}
		const fade = Math.floor(sr * 0.05);
		for (let i = 0; i < fade; i++) out[len - 1 - i] *= i / fade;
		const gain = 0.5 / (peak || 1);
		for (let i = 0; i < len; i++) out[i] *= gain;
		const buf = ac.createBuffer(1, len, sr);
		buf.copyToChannel(out, 0);
		// Die Mittelung verzögert um eine halbe Probe; Abspielrate korrigiert die Tonhöhe exakt.
		const item = { buf, rate: sr / f / (N + 0.5) };
		pluckCache.set(midi, item);
		return item;
	}

	function pluck(midi, { when = 0, vel = 1, bright = 0.6, dur = 3 } = {}) {
		const ac = audio();
		const { buf, rate } = pluckBuffer(midi);
		const src = ac.createBufferSource();
		src.buffer = buf;
		src.playbackRate.value = rate;
		const lp = ac.createBiquadFilter();
		lp.type = "lowpass";
		lp.frequency.value = 1800 + bright * 6000;
		lp.Q.value = 0.4;
		const body = ac.createBiquadFilter();
		body.type = "peaking";
		body.frequency.value = 110;
		body.gain.value = 4;
		body.Q.value = 1;
		const g = ac.createGain();
		const t = Math.max(ac.currentTime, when || ac.currentTime);
		g.gain.setValueAtTime(vel, t);
		g.gain.setTargetAtTime(0, t + dur, 0.08);
		src.connect(lp).connect(body).connect(g).connect(bus);
		src.start(t);
		src.stop(t + dur + 0.6);
		return { stop: (at) => g.gain.setTargetAtTime(0, at || ac.currentTime, 0.04) };
	}

	// Akkord anschlagen. notes: MIDI-Nummern von der tiefen zur hohen Saite, null = nicht anschlagen.
	function strum(notes, { when = 0, dir = "down", vel = 1, spread = 0.014, dur = 2.6 } = {}) {
		const ac = audio();
		const t0 = Math.max(ac.currentTime, when || ac.currentTime);
		let list = notes.map((m, i) => ({ m, i })).filter((n) => n.m != null);
		if (dir === "up") list = list.reverse().slice(0, Math.max(3, list.length - 2));
		list.forEach((n, k) =>
			pluck(n.m, { when: t0 + k * spread, vel: vel * (dir === "up" ? 0.7 : 0.9), bright: dir === "up" ? 0.75 : 0.55, dur })
		);
	}

	// ---------- Klavier: additive Synthese ----------
	// Mehrere Teiltöne mit leichter Inharmonizität, höhere klingen schneller ab. Dazu ein kurzer Hammerschlag.
	function piano(midi, { when = 0, vel = 0.8, dur = null } = {}) {
		const ac = audio();
		const t = Math.max(ac.currentTime, when || ac.currentTime);
		const f = mtof(midi);
		const out = ac.createGain();
		out.gain.value = 0;
		out.connect(bus);
		const high = Math.max(0, (midi - 48) / 40);
		const sustain = 3.4 - high * 2.2;
		const B = 0.00035;
		const nodes = [];
		for (let n = 1; n <= 8; n++) {
			const fn = n * f * Math.sqrt(1 + B * n * n);
			if (fn > 9000) break;
			const amp = (n === 1 ? 1 : 0.7 / Math.pow(n, 1.35)) * (1 - high * 0.4 * Math.min(1, n / 3));
			for (const det of n <= 2 ? [-0.6, 0.6] : [0]) {
				const o = ac.createOscillator();
				o.frequency.value = fn * Math.pow(2, det / 1200);
				const g = ac.createGain();
				const a = (amp * vel * 0.32) / (n <= 2 ? 2 : 1);
				g.gain.setValueAtTime(0, t);
				g.gain.linearRampToValueAtTime(a, t + 0.004);
				g.gain.setTargetAtTime(a * 0.45, t + 0.004, 0.08 / (0.6 + n * 0.25));
				g.gain.setTargetAtTime(0, t + 0.12, sustain / (1 + n * 0.5));
				o.connect(g).connect(out);
				o.start(t);
				o.stop(t + 6);
				nodes.push(o);
			}
		}
		// Hammer
		const len = Math.floor(ac.sampleRate * 0.03);
		const nb = ac.createBuffer(1, len, ac.sampleRate);
		const d = nb.getChannelData(0);
		for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
		const ns = ac.createBufferSource();
		ns.buffer = nb;
		const bp = ac.createBiquadFilter();
		bp.type = "bandpass";
		bp.frequency.value = Math.min(6000, f * 4);
		bp.Q.value = 1.2;
		const ng = ac.createGain();
		ng.gain.value = 0.12 * vel;
		ns.connect(bp).connect(ng).connect(out);
		ns.start(t);
		out.gain.setValueAtTime(1, t);
		const release = (at) => {
			const r = Math.max(ac.currentTime, at || ac.currentTime);
			out.gain.cancelScheduledValues(r);
			out.gain.setValueAtTime(out.gain.value || 1, r);
			out.gain.setTargetAtTime(0, r, 0.09);
			nodes.forEach((o) => {
				try {
					o.stop(r + 0.8);
				} catch (e) {
					/* schon gestoppt */
				}
			});
		};
		if (dur != null) release(t + dur);
		return { release };
	}

	// ---------- Metronom-Klick ----------
	function click(when, accent = false, vol = 0.5) {
		const ac = audio();
		const t = Math.max(ac.currentTime, when || ac.currentTime);
		const o = ac.createOscillator();
		o.type = "square";
		o.frequency.value = accent ? 1760 : 1180;
		const g = ac.createGain();
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(vol * (accent ? 0.35 : 0.22), t + 0.001);
		g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
		const hp = ac.createBiquadFilter();
		hp.type = "highpass";
		hp.frequency.value = 600;
		o.connect(hp).connect(g).connect(bus);
		o.start(t);
		o.stop(t + 0.06);
	}

	// ---------- Uhr mit Vorausplanung ----------
	// Der Browser-Timer ist ungenau, die Audio-Uhr nicht: Wir planen immer ein Stück im Voraus.
	function createClock({ bpm = 80, steps = 4, perBeat = 1, onStep }) {
		let timer = null;
		let next = 0;
		let step = 0;
		const api = {
			bpm,
			running: false,
			start() {
				const ac = audio();
				step = 0;
				next = ac.currentTime + 0.1;
				api.running = true;
				clearInterval(timer);
				timer = setInterval(tick, 25);
				tick();
			},
			stop() {
				clearInterval(timer);
				api.running = false;
			},
			setSteps(n) {
				steps = n;
				step %= n;
			},
		};
		function tick() {
			const ac = audio();
			while (next < ac.currentTime + 0.12) {
				onStep(step, next);
				next += 60 / api.bpm / perBeat;
				step = (step + 1) % steps;
			}
		}
		document.addEventListener("visibilitychange", () => {
			if (document.hidden && api.running) {
				api.stop();
				if (api.onAutoStop) api.onAutoStop();
			}
		});
		return api;
	}

	// Zu einem Zeitpunkt der Audio-Uhr etwas auf dem Bildschirm tun.
	function at(time, fn) {
		const ac = audio();
		setTimeout(fn, Math.max(0, (time - ac.currentTime) * 1000));
	}

	// ---------- Tonhöhe erkennen (normierte Autokorrelation nach McLeod) ----------
	function detectPitch(buf, sr, minF = 60, maxF = 1100) {
		const n = buf.length;
		let rms = 0;
		for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
		rms = Math.sqrt(rms / n);
		if (rms < 0.008) return null;
		const minLag = Math.floor(sr / maxF);
		const maxLag = Math.min(Math.floor(sr / minF), Math.floor(n / 2));
		const nsdf = new Float32Array(maxLag + 2);
		for (let lag = minLag; lag <= maxLag + 1; lag++) {
			let r = 0;
			let m = 0;
			for (let i = 0; i < n - lag; i++) {
				const a = buf[i];
				const b = buf[i + lag];
				r += a * b;
				m += a * a + b * b;
			}
			nsdf[lag] = m > 0 ? (2 * r) / m : 0;
		}
		// Gipfel sammeln, den ersten nehmen, der fast so hoch ist wie der höchste
		const peaks = [];
		let max = 0;
		for (let lag = minLag + 1; lag <= maxLag; lag++) {
			if (nsdf[lag] > 0 && nsdf[lag] > nsdf[lag - 1] && nsdf[lag] >= nsdf[lag + 1]) {
				peaks.push(lag);
				if (nsdf[lag] > max) max = nsdf[lag];
			}
		}
		if (max < 0.6) return null;
		const lag = peaks.find((p) => nsdf[p] >= max * 0.9);
		const a = nsdf[lag - 1];
		const b = nsdf[lag];
		const c = nsdf[lag + 1];
		const shift = (a - c) / (2 * (a - 2 * b + c) || 1);
		return { freq: sr / (lag + shift), clarity: b, rms };
	}

	// ---------- Speichern (kann in privaten Fenstern fehlen) ----------
	const store = {
		get(key, fallback) {
			try {
				const v = localStorage.getItem(key);
				return v == null ? fallback : JSON.parse(v);
			} catch (e) {
				return fallback;
			}
		},
		set(key, value) {
			try {
				localStorage.setItem(key, JSON.stringify(value));
			} catch (e) {
				/* ohne Speicher geht es auch */
			}
		},
	};

	const dayKey = (d = new Date()) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

	// ---------- Übeplan mit Timer ----------
	// blocks: [{ min, title, tip }]
	function practicePlan(root, key, blocks) {
		const storeKey = `newbobb-ueben-${key}`;
		const data = store.get(storeKey, { days: [] });
		root.innerHTML = `
			<div class="plan"></div>
			<div class="row">
				<button class="btn primary" type="button" data-act="go">▶ Übe-Session starten</button>
				<button class="btn" type="button" data-act="skip" hidden>Weiter ⏭</button>
				<button class="btn" type="button" data-act="done">✓ Heute geübt</button>
				<span class="pill" data-out="total"></span>
			</div>
			<div class="streak" aria-label="Die letzten 14 Tage"></div>
			<p class="stage-note" data-out="note" aria-live="polite"></p>`;
		const list = root.querySelector(".plan");
		const goBtn = root.querySelector('[data-act="go"]');
		const skipBtn = root.querySelector('[data-act="skip"]');
		const doneBtn = root.querySelector('[data-act="done"]');
		const streakEl = root.querySelector(".streak");
		const note = root.querySelector('[data-out="note"]');
		const total = blocks.reduce((s, b) => s + b.min, 0);
		root.querySelector('[data-out="total"]').textContent = `${total} Minuten am Tag`;

		const els = blocks.map((b) => {
			const el = document.createElement("div");
			el.className = "plan-block";
			el.innerHTML = `<div class="min">${b.min}<small>MIN</small></div>
				<div class="what"><strong>${b.title}</strong><span>${b.tip}</span></div>
				<div class="left"></div>`;
			list.appendChild(el);
			return el;
		});

		function renderStreak() {
			streakEl.innerHTML = "";
			const set = new Set(data.days);
			const today = new Date();
			for (let i = 13; i >= 0; i--) {
				const d = new Date(today);
				d.setDate(today.getDate() - i);
				const k = dayKey(d);
				const dot = document.createElement("i");
				if (set.has(k)) dot.classList.add("on");
				if (i === 0) dot.classList.add("today");
				dot.title = d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "numeric" });
				streakEl.appendChild(dot);
			}
			let run = 0;
			const d = new Date(today);
			if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
			while (set.has(dayKey(d))) {
				run++;
				d.setDate(d.getDate() - 1);
			}
			const doneToday = set.has(dayKey());
			doneBtn.setAttribute("aria-pressed", String(doneToday));
			if (!running)
				note.textContent =
					run > 0
						? `Serie: ${run} ${run === 1 ? "Tag" : "Tage"} am Stück${doneToday ? ", heute erledigt." : ". Heute noch nicht geübt."}`
						: "Noch keine Serie. Jeder Tag zählt, auch ein kurzer.";
		}

		function markToday() {
			const k = dayKey();
			if (!data.days.includes(k)) data.days.push(k);
			data.days = data.days.slice(-120);
			store.set(storeKey, data);
			renderStreak();
		}

		let running = false;
		let idx = 0;
		let left = 0;
		let timer = null;
		const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

		function show() {
			els.forEach((el, i) => {
				el.classList.toggle("now", running && i === idx);
				el.classList.toggle("done", running && i < idx);
				el.querySelector(".left").textContent = running && i === idx ? fmt(left) : "";
				const p = running && i === idx ? 1 - left / (blocks[i].min * 60) : running && i < idx ? 1 : 0;
				el.style.setProperty("--p", p.toFixed(3));
			});
		}

		function chime() {
			const ac = audio();
			[0, 0.12, 0.24].forEach((d, i) => piano([72, 76, 79][i], { when: ac.currentTime + d, vel: 0.5, dur: 0.6 }));
		}

		function nextBlock() {
			idx++;
			if (idx >= blocks.length) return finish(true);
			left = blocks[idx].min * 60;
			chime();
			note.textContent = `Jetzt: ${blocks[idx].title}.`;
			show();
		}

		function finish(complete) {
			running = false;
			clearInterval(timer);
			goBtn.textContent = "▶ Übe-Session starten";
			skipBtn.hidden = true;
			show();
			if (complete) {
				chime();
				markToday();
				note.textContent = "Geschafft! Session erledigt und im Kalender eingetragen. Morgen wieder, das zählt mehr als lange Sessions.";
			} else renderStreak();
		}

		goBtn.addEventListener("click", () => {
			if (running) return finish(false);
			audio();
			running = true;
			idx = 0;
			left = blocks[0].min * 60;
			goBtn.textContent = "■ Abbrechen";
			skipBtn.hidden = false;
			note.textContent = `Jetzt: ${blocks[0].title}.`;
			show();
			timer = setInterval(() => {
				left--;
				if (left <= 0) nextBlock();
				else show();
			}, 1000);
		});
		skipBtn.addEventListener("click", () => running && nextBlock());
		doneBtn.addEventListener("click", () => {
			const k = dayKey();
			if (data.days.includes(k)) data.days = data.days.filter((d) => d !== k);
			else data.days.push(k);
			store.set(storeKey, data);
			renderStreak();
		});
		show();
		renderStreak();
	}

	window.Musik = {
		audio,
		mtof,
		ftom,
		noteName,
		isBlack,
		NAMES,
		pluck,
		strum,
		piano,
		click,
		createClock,
		at,
		detectPitch,
		store,
		practicePlan,
	};
})();
