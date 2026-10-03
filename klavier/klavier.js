// Klavier lernen: fallende Noten im Hero, Klaviaturen, Tastenjagd, Fingerübungen, Notentrainer,
// Akkorde mit Umkehrungen, Tonleiter mit Daumenuntersatz, Tempo-Leiter und Übeplan.

(() => {
	const M = window.Musik;
	const $ = (id) => document.getElementById(id);
	const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
	const ACC = css("--accent", "#b3a4ff");
	const ACC2 = css("--accent-2", "#ffcf6b");
	const INK = "#f4efe6";
	const svgNS = "http://www.w3.org/2000/svg";
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
	const sv = (tag, attrs, parent) => {
		const e = document.createElementNS(svgNS, tag);
		for (const k in attrs) e.setAttribute(k, attrs[k]);
		if (parent) parent.appendChild(e);
		return e;
	};
	const label = (m) => M.noteName(m) + (m === 60 ? " · Mittel-C" : "");

	// ---------- Klaviatur ----------
	// Physische Tastenpositionen (e.code), damit es auf QWERTZ und QWERTY gleich liegt.
	const KEYMAP = { KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyZ: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16 };
	const boards = [];
	const ratios = new Map();
	let active = null;
	const seen = new IntersectionObserver(
		(entries) => {
			entries.forEach((en) => ratios.set(en.target, en.intersectionRatio));
			let best = null;
			let r = 0.25;
			boards.forEach((b) => {
				const v = ratios.get(b.root) || 0;
				if (v > r) {
					r = v;
					best = b;
				}
			});
			if (best) active = best;
		},
		{ threshold: [0, 0.25, 0.5, 0.75, 1] }
	);

	function Keyboard(root, { from, to, base = 60, labels = "c", onDown = null }) {
		const inner = document.createElement("div");
		inner.className = "kb-inner";
		root.appendChild(inner);
		let nW = 0;
		for (let m = from; m <= to; m++) if (!M.isBlack(m)) nW++;
		const ww = 100 / nW;
		const keys = new Map();
		let wi = 0;
		for (let m = from; m <= to; m++) {
			const k = document.createElement("div");
			const black = M.isBlack(m);
			k.className = `kb-key ${black ? "b" : "w"}`;
			k.dataset.m = m;
			if (!black) {
				k.style.left = `${wi * ww}%`;
				k.style.width = `${ww}%`;
				wi++;
			} else {
				const bw = ww * 0.6;
				k.style.left = `${wi * ww - bw / 2}%`;
				k.style.width = `${bw}%`;
			}
			k.innerHTML = '<span class="fing" hidden></span><span class="lbl"></span><span class="pc"></span>';
			inner.appendChild(k);
			keys.set(m, k);
		}
		const size = () => {
			const w = inner.clientWidth;
			inner.style.height = `${Math.round(Math.max(120, Math.min(220, (w / nW) * 4.6)))}px`;
		};
		size();
		window.addEventListener("resize", size);

		const held = new Map();
		const api = { root, keys, from, to, base };

		api.setLabels = (mode) => {
			keys.forEach((k, m) => {
				const show = mode === "all" || (mode === "c" && m % 12 === 0);
				k.querySelector(".lbl").textContent = show && !(M.isBlack(m) && mode !== "all") ? M.noteName(m) : "";
				k.querySelector(".pc").textContent = m === 60 && mode !== "none" ? "Mitte" : "";
			});
		};
		api.tag = (m, text) => {
			const k = keys.get(m);
			if (k) k.querySelector(".lbl").textContent = text;
		};
		api.light = (m, cls = "lit", on = true) => {
			const k = keys.get(m);
			if (k) k.classList.toggle(cls, on);
		};
		api.clear = (cls) => keys.forEach((k) => k.classList.remove(cls));
		api.flash = (m, cls, ms) => {
			api.light(m, cls, true);
			setTimeout(() => api.light(m, cls, false), ms);
		};
		api.finger = (m, n) => {
			const k = keys.get(m);
			if (!k) return;
			const f = k.querySelector(".fing");
			f.hidden = n == null;
			f.textContent = n == null ? "" : n;
		};
		api.clearFingers = () => keys.forEach((k) => (k.querySelector(".fing").hidden = true));
		api.press = (m) => {
			if (held.has(m) || !keys.has(m)) return;
			keys.get(m).classList.add("down");
			held.set(m, M.piano(m, { vel: 0.8 }));
			active = api;
			if (onDown) onDown(m);
		};
		api.release = (m) => {
			if (m == null || !held.has(m)) return;
			const v = held.get(m);
			held.delete(m);
			keys.get(m).classList.remove("down");
			v.release();
		};

		const ptr = new Map();
		const keyAt = (e) => {
			const el = document.elementFromPoint(e.clientX, e.clientY);
			const k = el && el.closest(".kb-key");
			return k && inner.contains(k) ? Number(k.dataset.m) : null;
		};
		root.addEventListener("pointerdown", (e) => {
			const m = keyAt(e);
			if (m == null) return;
			e.preventDefault();
			M.audio();
			ptr.set(e.pointerId, m);
			api.press(m);
		});
		root.addEventListener("pointermove", (e) => {
			if (!ptr.has(e.pointerId)) return;
			const m = keyAt(e);
			const old = ptr.get(e.pointerId);
			if (m === old) return;
			api.release(old);
			ptr.set(e.pointerId, m);
			if (m != null) api.press(m);
		});
		const up = (e) => {
			if (!ptr.has(e.pointerId)) return;
			api.release(ptr.get(e.pointerId));
			ptr.delete(e.pointerId);
		};
		window.addEventListener("pointerup", up);
		window.addEventListener("pointercancel", up);

		api.setLabels(labels);
		boards.push(api);
		seen.observe(root);
		return api;
	}

	const codes = new Map();
	document.addEventListener("keydown", (e) => {
		if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || !active) return;
		const tag = (document.activeElement && document.activeElement.tagName) || "";
		if (tag === "TEXTAREA" || (tag === "INPUT" && document.activeElement.type === "text")) return;
		const off = KEYMAP[e.code];
		if (off == null) return;
		const m = active.base + off;
		if (!active.keys.has(m)) return;
		e.preventDefault();
		active.press(m);
		codes.set(e.code, [active, m]);
	});
	document.addEventListener("keyup", (e) => {
		const hit = codes.get(e.code);
		if (!hit) return;
		hit[0].release(hit[1]);
		codes.delete(e.code);
	});

	// ---------- Nachspielen mit Fingersatz ----------
	function Follow(kb, { seqEl, noteEl, outEl, hand = () => 1, done }) {
		let seq = [];
		let i = 0;
		let errors = 0;
		let t0 = 0;
		let token = 0;
		let voices = [];
		let demoing = false;

		function crossing(j) {
			if (j < 1) return "";
			const a = seq[j - 1];
			const b = seq[j];
			const s = hand() * Math.sign(b.m - a.m);
			if (Math.sign(b.f - a.f) === s || b.f === a.f) return "";
			return b.f === 1 ? "Daumen unter!" : `${b.f} über den Daumen!`;
		}
		function render() {
			seqEl.innerHTML = seq
				.map((s, j) => `<span class="${j < i ? "done" : j === i ? "now" : ""}">${M.noteName(s.m)}<small>${s.f}</small></span>`)
				.join("");
			kb.clear("hint");
			kb.clearFingers();
			if (i < seq.length && !demoing) {
				kb.light(seq[i].m, "hint");
				kb.finger(seq[i].m, seq[i].f);
				const c = crossing(i);
				if (c) noteEl.textContent = `Jetzt: ${c}`;
			}
		}
		function stopDemo() {
			token++;
			demoing = false;
			voices.forEach((v) => v.release());
			voices = [];
			kb.clear("lit");
		}
		const api = {
			set(s) {
				seq = s;
				api.reset();
			},
			reset() {
				stopDemo();
				i = 0;
				errors = 0;
				t0 = 0;
				outEl.textContent = "";
				render();
			},
			key(m) {
				if (demoing || i >= seq.length) return;
				if (!t0) t0 = performance.now();
				if (m === seq[i].m) {
					i++;
					if (i >= seq.length) {
						const sec = ((performance.now() - t0) / 1000).toFixed(1).replace(".", ",");
						outEl.textContent = `${errors} Fehler · ${sec} s`;
						done(errors, sec);
					} else if (!crossing(i)) noteEl.textContent = `Weiter mit Finger ${seq[i].f}.`;
					render();
				} else {
					errors++;
					kb.flash(m, "bad", 320);
					noteEl.textContent = `Das war ${M.noteName(m)}. Gesucht ist ${M.noteName(seq[i].m)} mit Finger ${seq[i].f}.`;
				}
			},
			demo(bpm) {
				stopDemo();
				const my = token;
				demoing = true;
				render();
				const ac = M.audio();
				const beat = 60 / bpm;
				const start = ac.currentTime + 0.15;
				seq.forEach((s, j) => {
					const when = start + j * beat;
					voices.push(M.piano(s.m, { when, vel: 0.75, dur: beat * 0.95 }));
					M.at(when, () => {
						if (my !== token) return;
						kb.clear("lit");
						kb.clearFingers();
						kb.light(s.m, "lit");
						kb.finger(s.m, s.f);
						const c = crossing(j);
						noteEl.textContent = c || `Finger ${s.f} · ${M.noteName(s.m)}`;
					});
				});
				M.at(start + seq.length * beat, () => {
					if (my !== token) return;
					demoing = false;
					voices = [];
					kb.clear("lit");
					i = 0;
					noteEl.textContent = "Jetzt du. Die Übung wartet, bis du die richtige Taste triffst.";
					render();
				});
			},
		};
		return api;
	}

	// ---------- Hero: Für Elise als fallende Noten ----------
	(function hero() {
		const cv = $("heroCanvas");
		const { ctx, size } = fitCanvas(cv, (w) => (w < 640 ? 1.35 : 3.3));
		const btn = $("heroSound");
		const S = 0.17;
		const RH = [[0, 76], [1, 75], [2, 76], [3, 75], [4, 76], [5, 71], [6, 74], [7, 72], [8, 69, 2], [11, 60], [12, 64], [13, 69], [14, 71, 2], [17, 64], [18, 68], [19, 71], [20, 72, 2], [23, 64], [24, 76], [25, 75], [26, 76], [27, 75], [28, 76], [29, 71], [30, 74], [31, 72], [32, 69, 2], [35, 60], [36, 64], [37, 69], [38, 71, 2], [41, 64], [42, 72], [43, 71], [44, 69, 4]];
		const LH = [[8, 45], [9, 52], [10, 57], [14, 40], [15, 52], [16, 56], [20, 45], [21, 52], [22, 57], [32, 45], [33, 52], [34, 57], [38, 40], [39, 52], [40, 56], [44, 45], [45, 52], [46, 57]];
		const notes = [
			...RH.map(([t, m, l = 1]) => ({ t, m, l, rh: true })),
			...LH.map(([t, m]) => ({ t, m, l: 1, rh: false })),
		];
		const LOOP = 52 * S;
		const LO = 40;
		const HI = 77;
		const whites = [];
		for (let m = LO; m <= HI; m++) if (!M.isBlack(m)) whites.push(m);
		let sound = false;
		let base = performance.now() / 1000;
		let lastSched = -1;

		btn.addEventListener("click", () => {
			sound = !sound;
			btn.setAttribute("aria-pressed", String(sound));
			btn.textContent = sound ? "🔇 Ton aus" : "🔊 Mit Ton";
			if (sound) {
				base = M.audio().currentTime + 0.4;
				lastSched = -1;
			} else base = performance.now() / 1000;
		});

		function keyGeom(m, w) {
			const ww = w / whites.length;
			if (!M.isBlack(m)) return { x: whites.indexOf(m) * ww, w: ww, black: false };
			const left = whites.indexOf(m - 1) + 1;
			return { x: left * ww - ww * 0.3, w: ww * 0.6, black: true };
		}

		whenVisible(cv, () => {
			const { w, h } = size;
			const ac = sound ? M.audio() : null;
			const now = sound ? ac.currentTime - base : reduced ? 1.4 : performance.now() / 1000 - base;
			if (sound) {
				const horizon = now + 0.25;
				const k0 = Math.floor(Math.max(0, now) / LOOP);
				for (const k of [k0, k0 + 1])
					for (const n of notes) {
						const T = k * LOOP + n.t * S;
						if (T > lastSched && T <= horizon)
							M.piano(n.m, { when: base + T, vel: n.rh ? 0.62 : 0.42, dur: n.rh ? n.l * S * 1.4 : S * 5 });
					}
				lastSched = horizon;
			}
			const kbTop = h * 0.76;
			const lead = 2.2;
			const v = kbTop / lead;
			ctx.clearRect(0, 0, w, h);
			ctx.fillStyle = "#08070b";
			ctx.fillRect(0, 0, w, h);
			// Hilfslinien je C
			for (const m of whites)
				if (m % 12 === 0) {
					const g = keyGeom(m, w);
					ctx.fillStyle = "rgba(179,164,255,0.07)";
					ctx.fillRect(g.x, 0, 1, kbTop);
				}
			const lit = new Map();
			const t = ((now % LOOP) + LOOP) % LOOP;
			for (const k of [-1, 0, 1])
				for (const n of notes) {
					const T = n.t * S + k * LOOP;
					const dt = T - t;
					const len = (n.rh ? n.l : 1) * S;
					if (dt > lead + 0.1 || dt + len < -0.05) continue;
					if (dt <= 0 && dt + len > 0) lit.set(n.m, n.rh);
					const g = keyGeom(n.m, w);
					const yb = kbTop - dt * v;
					const yt = yb - len * v + 2;
					const color = n.rh ? ACC : ACC2;
					ctx.fillStyle = color;
					ctx.globalAlpha = 0.9;
					ctx.shadowColor = color;
					ctx.shadowBlur = 12;
					const pad = g.w * 0.12;
					ctx.beginPath();
					ctx.roundRect ? ctx.roundRect(g.x + pad, yt, g.w - pad * 2, Math.max(4, yb - yt), 4) : ctx.rect(g.x + pad, yt, g.w - pad * 2, Math.max(4, yb - yt));
					ctx.fill();
					ctx.shadowBlur = 0;
					ctx.globalAlpha = 1;
				}
			// Tastatur
			const kh = h - kbTop;
			for (const m of whites) {
				const g = keyGeom(m, w);
				ctx.fillStyle = lit.has(m) ? (lit.get(m) ? ACC : ACC2) : "#ece6dc";
				ctx.fillRect(g.x + 0.5, kbTop, g.w - 1, kh);
			}
			for (let m = LO; m <= HI; m++) {
				if (!M.isBlack(m)) continue;
				const g = keyGeom(m, w);
				ctx.fillStyle = lit.has(m) ? (lit.get(m) ? ACC : ACC2) : "#1b1820";
				ctx.fillRect(g.x, kbTop, g.w, kh * 0.62);
			}
			const glow = ctx.createLinearGradient(0, kbTop - 30, 0, kbTop);
			glow.addColorStop(0, "rgba(179,164,255,0)");
			glow.addColorStop(1, lit.size ? "rgba(179,164,255,0.25)" : "rgba(179,164,255,0.06)");
			ctx.fillStyle = glow;
			ctx.fillRect(0, kbTop - 30, w, 30);
			ctx.fillStyle = "rgba(244,239,230,0.55)";
			ctx.font = "500 11px 'Space Grotesk', sans-serif";
			ctx.fillStyle = ACC;
			ctx.fillText("● rechte Hand", 12, 40);
			ctx.fillStyle = ACC2;
			ctx.fillText("● linke Hand", 12, 56);
		});
	})();

	// ---------- 1 Landkarte und Tastenjagd ----------
	(function map() {
		const out = $("mapOut");
		const note = $("mapNote");
		const score = $("huntScore");
		const btn = $("btnHunt");
		const HINT = {
			0: "C liegt links neben den zwei schwarzen Tasten.",
			2: "D liegt zwischen den zwei schwarzen Tasten.",
			4: "E liegt rechts neben den zwei schwarzen Tasten.",
			5: "F liegt links neben den drei schwarzen Tasten.",
			7: "G liegt zwischen der ersten und zweiten der drei schwarzen Tasten.",
			9: "A liegt zwischen der zweiten und dritten der drei schwarzen Tasten.",
			11: "H liegt rechts neben den drei schwarzen Tasten.",
		};
		const PCS = [0, 2, 4, 5, 7, 9, 11];
		const game = { on: false, pc: -1, n: 0, ok: 0, t0: 0 };
		let mode = "c";

		const kb = Keyboard($("kbMap"), {
			from: 48,
			to: 71,
			base: 60,
			labels: "c",
			onDown(m) {
				if (!game.on) {
					out.textContent = label(m);
					return;
				}
				if (m % 12 === game.pc) {
					game.ok++;
					out.textContent = `✓ ${M.noteName(m)}`;
				} else {
					kb.flash(m, "bad", 350);
					out.textContent = `✗ ${M.noteName(m)}`;
					note.textContent = `Das war ${M.noteName(m)}. ${HINT[game.pc]}`;
				}
				game.n++;
				if (game.n >= 10) return end(true);
				setTimeout(() => game.on && ask(), 380);
			},
		});

		const MODES = [
			["c", "Nur C"],
			["all", "Alle Namen"],
			["none", "Ohne Namen"],
		];
		const btns = MODES.map(([k, l]) =>
			chip(l, $("mapLabels"), () => {
				mode = k;
				choose(btns, btns[MODES.findIndex((x) => x[0] === k)]);
				if (!game.on) kb.setLabels(k);
			})
		);
		choose(btns, btns[0]);
		note.textContent = "Tippe oder wische über die Tasten. Achte auf die Gruppen aus zwei und drei schwarzen Tasten.";

		function ask() {
			let pc;
			do pc = PCS[Math.floor(Math.random() * PCS.length)];
			while (pc === game.pc);
			game.pc = pc;
			note.textContent = `Finde ein ${M.noteName(pc)}! Irgendeins.`;
			score.textContent = `${game.n + 1} / 10 · ${game.ok} richtig`;
		}
		function end(done) {
			game.on = false;
			btn.textContent = "🎯 Tastenjagd starten";
			kb.setLabels(mode);
			if (done) {
				const sec = Math.round((performance.now() - game.t0) / 1000);
				score.textContent = `${game.ok} / 10`;
				note.textContent = `${game.ok} von 10 in ${sec} Sekunden. ${game.ok === 10 ? "Perfekt! Nächstes Ziel: unter 15 Sekunden." : "Merk dir die Regel mit den schwarzen Tasten und versuch es nochmal."}`;
			} else score.hidden = true;
		}
		btn.addEventListener("click", () => {
			if (game.on) return end(false);
			Object.assign(game, { on: true, n: 0, ok: 0, t0: performance.now(), pc: -1 });
			kb.setLabels("none");
			score.hidden = false;
			btn.textContent = "■ Abbrechen";
			ask();
		});
	})();

	// ---------- 2 Finger und C-Lage ----------
	(function fingers() {
		const RH = { 60: 1, 62: 2, 64: 3, 65: 4, 67: 5 };
		const LH = { 48: 5, 50: 4, 52: 3, 53: 2, 55: 1 };
		const rh = (ms) => ms.map((m) => ({ m, f: RH[m] }));
		const lh = (ms) => ms.map((m) => ({ m, f: LH[m] }));
		const EX = [
			{ name: "Fünf Finger", hand: 1, seq: rh([60, 62, 64, 65, 67, 65, 64, 62, 60]), tip: "Jeder Finger einmal hoch und wieder runter. Hand gewölbt, Finger rund." },
			{ name: "Dreiklang", hand: 1, seq: rh([60, 64, 67, 64, 60]), tip: "Finger 1, 3, 5: Das ist schon ein C-Dur-Akkord, nacheinander gespielt." },
			{ name: "Daumen-Partner", hand: 1, seq: rh([60, 62, 60, 64, 60, 65, 60, 67]), tip: "Der Daumen bleibt der Anker, jeder andere Finger spielt im Wechsel mit ihm. Gut für die schwachen Finger 4 und 5." },
			{ name: "Ode an die Freude", hand: 1, seq: rh([64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62]), tip: "Beethovens Melodie passt komplett in die C-Lage. Dein erstes Stück!" },
			{ name: "Linke Hand", hand: -1, seq: lh([48, 50, 52, 53, 55, 53, 52, 50, 48]), tip: "Links liegt der kleine Finger auf dem C, der Daumen auf dem G. Die Zahlen laufen also rückwärts." },
		];
		const note = $("fingerNote");
		let cur = EX[0];
		const kb = Keyboard($("kbFinger"), { from: 48, to: 72, base: 60, labels: "c", onDown: (m) => follow.key(m) });
		const follow = Follow(kb, {
			seqEl: $("fingerSeq"),
			noteEl: note,
			outEl: $("fingerOut"),
			hand: () => cur.hand,
			done(errors) {
				note.textContent =
					errors === 0
						? "Fehlerfrei! Profi-Regel: Erst wenn es dreimal hintereinander klappt, sitzt es. Dann die nächste Übung."
						: `Geschafft, mit ${errors} ${errors === 1 ? "Fehler" : "Fehlern"}. Nochmal, diesmal langsamer. Ziel: dreimal fehlerfrei.`;
			},
		});
		const btns = EX.map((ex, i) =>
			chip(ex.name, $("fingerEx"), () => {
				cur = ex;
				choose(btns, btns[i]);
				follow.set(ex.seq);
				note.textContent = ex.tip;
			})
		);
		choose(btns, btns[0]);
		follow.set(cur.seq);
		note.textContent = cur.tip;
		$("btnFingerDemo").addEventListener("click", () => follow.demo(cur.name === "Ode an die Freude" ? 110 : 96));
		$("btnFingerReset").addEventListener("click", () => {
			follow.reset();
			note.textContent = cur.tip;
		});
	})();

	// ---------- 3 Noten lesen ----------
	(function staff() {
		const svg = $("staffSvg");
		const note = $("staffNote");
		const out = $("staffOut");
		const LET = ["C", "D", "E", "F", "G", "A", "H"];
		const OFF = [0, 2, 4, 5, 7, 9, 11];
		const toMidi = (d) => (Math.floor(d / 7) + 1) * 12 + OFF[d % 7];
		const CLEF = {
			treble: { bottom: 30, lo: 28, hi: 40, name: "Violinschlüssel", marks: [[28, "Mittel-C"], [32, "Violin-G"], [35, "C im dritten Fach"], [39, "G über dem System"]] },
			bass: { bottom: 18, lo: 16, hi: 28, name: "Bassschlüssel", marks: [[17, "F unter dem System"], [21, "C im zweiten Fach"], [24, "Bass-F"], [28, "Mittel-C"]] },
		};
		const MODES = [
			["marks", "Landmarken"],
			["treble", "Violinschlüssel"],
			["bass", "Bassschlüssel"],
			["mix", "Gemischt"],
		];
		let mode = "marks";
		let q = null;
		let streak = 0;
		let right = 0;
		let total = 0;
		let lock = false;

		const Y0 = 140;
		const GAP = 16;
		const yOf = (clef, d) => Y0 - (d - CLEF[clef].bottom) * (GAP / 2);

		function draw(clef, d, color = INK) {
			svg.innerHTML = "";
			for (let i = 0; i < 5; i++) sv("line", { x1: 30, x2: 380, y1: Y0 - i * GAP, y2: Y0 - i * GAP, stroke: "rgba(244,239,230,0.55)", "stroke-width": 1.6 }, svg);
			// Schlüssel als Schriftzeichen; Größe und Lage nach dem tatsächlich gerenderten Umriss ausrichten,
			// damit es mit jeder Notenschrift passt.
			const t = sv("text", { x: 40, y: Y0, "font-size": 64, "font-family": "'Noto Music', 'Bravura', 'Segoe UI Symbol', 'Apple Symbols', serif", fill: INK }, svg);
			t.textContent = clef === "treble" ? "\u{1D11E}" : "\u{1D122}";
			const top = Y0 - 4 * GAP;
			const want = clef === "treble" ? { y: top - 1.7 * GAP, h: 7.4 * GAP } : { y: top - 0.1 * GAP, h: 3.3 * GAP };
			try {
				let bb = t.getBBox();
				if (bb.height > 0) {
					t.setAttribute("font-size", (64 * want.h) / bb.height);
					bb = t.getBBox();
					t.setAttribute("y", Y0 + (want.y - bb.y));
				}
			} catch (e) {
				/* nicht sichtbar, Standardlage bleibt */
			}
			if (d == null) return;
			const c = CLEF[clef];
			const x = 235;
			const y = yOf(clef, d);
			for (let ld = c.bottom - 2; ld >= d; ld -= 2) sv("line", { x1: x - 18, x2: x + 18, y1: yOf(clef, ld), y2: yOf(clef, ld), stroke: "rgba(244,239,230,0.75)", "stroke-width": 1.6 }, svg);
			for (let ld = c.bottom + 10; ld <= d; ld += 2) sv("line", { x1: x - 18, x2: x + 18, y1: yOf(clef, ld), y2: yOf(clef, ld), stroke: "rgba(244,239,230,0.75)", "stroke-width": 1.6 }, svg);
			const up = d < c.bottom + 4;
			sv("line", { x1: up ? x + 8.2 : x - 8.2, x2: up ? x + 8.2 : x - 8.2, y1: y, y2: up ? y - 52 : y + 52, stroke: color, "stroke-width": 1.8 }, svg);
			sv("ellipse", { cx: x, cy: y, rx: 9.4, ry: 6.6, fill: color, transform: `rotate(-22 ${x} ${y})` }, svg);
		}

		function pick() {
			let clef;
			let d;
			if (mode === "marks") {
				clef = Math.random() < 0.5 ? "treble" : "bass";
				const marks = CLEF[clef].marks;
				d = marks[Math.floor(Math.random() * marks.length)][0];
			} else {
				clef = mode === "mix" ? (Math.random() < 0.5 ? "treble" : "bass") : mode;
				const c = CLEF[clef];
				d = c.lo + Math.floor(Math.random() * (c.hi - c.lo + 1));
			}
			if (q && q.clef === clef && q.d === d) return pick();
			return { clef, d };
		}

		function next() {
			q = pick();
			lock = false;
			answers.forEach((b) => b.classList.remove("is-right", "is-wrong"));
			$("staffTag").textContent = CLEF[q.clef].name;
			draw(q.clef, q.d);
		}

		function stat() {
			out.textContent = total ? `Serie ${streak} · ${Math.round((right / total) * 100)} %` : "";
		}

		const answers = LET.map((l, i) =>
			chip(l, $("staffAnswers"), () => {
				if (lock || !q) return;
				lock = true;
				total++;
				const truth = q.d % 7;
				M.piano(toMidi(q.d), { vel: 0.7, dur: 0.9 });
				if (i === truth) {
					right++;
					streak++;
					answers[i].classList.add("is-right");
					draw(q.clef, q.d, "#7bdc9a");
					const mark = CLEF[q.clef].marks.find((mk) => mk[0] === q.d);
					note.textContent = mark ? `Richtig, das ist das ${mark[1]}.` : `Richtig: ${l}.`;
					stat();
					setTimeout(next, 750);
				} else {
					streak = 0;
					answers[i].classList.add("is-wrong");
					answers[truth].classList.add("is-right");
					draw(q.clef, q.d, "#ff8a7a");
					const marks = CLEF[q.clef].marks;
					const near = marks.reduce((a, b) => (Math.abs(b[0] - q.d) < Math.abs(a[0] - q.d) ? b : a));
					const steps = q.d - near[0];
					note.textContent =
						steps === 0
							? `Das ist ${LET[truth]}, die Landmarke ${near[1]}. Präg sie dir ein!`
							: `Das ist ${LET[truth]}. Weg dorthin: ${Math.abs(steps)} ${Math.abs(steps) === 1 ? "Stufe" : "Stufen"} ${steps > 0 ? "über" : "unter"} dem ${near[1]} (${LET[near[0] % 7]}).`;
					stat();
					setTimeout(next, 2400);
				}
			})
		);
		answers.forEach((b) => b.removeAttribute("aria-pressed"));

		const mBtns = MODES.map(([k, l], i) =>
			chip(l, $("staffModes"), () => {
				mode = k;
				choose(mBtns, mBtns[i]);
				streak = 0;
				next();
			})
		);
		choose(mBtns, mBtns[0]);
		next();
		if (document.fonts && document.fonts.load) document.fonts.load("64px 'Noto Music'", "\u{1D11E}\u{1D122}").then(() => q && !lock && draw(q.clef, q.d));
	})();

	// ---------- 4 Akkorde ----------
	(function chords() {
		const ROOTS = [["C", 60], ["D", 62], ["E", 64], ["F", 65], ["G", 67], ["A", 69], ["H", 71]];
		const SPELL = {
			"C-Dur": ["C", "E", "G"], "D-Dur": ["D", "Fis", "A"], "E-Dur": ["E", "Gis", "H"], "F-Dur": ["F", "A", "C"], "G-Dur": ["G", "H", "D"], "A-Dur": ["A", "Cis", "E"], "H-Dur": ["H", "Dis", "Fis"],
			"c-Moll": ["C", "Es", "G"], "d-Moll": ["D", "F", "A"], "e-Moll": ["E", "G", "H"], "f-Moll": ["F", "As", "C"], "g-Moll": ["G", "B", "D"], "a-Moll": ["A", "C", "E"], "h-Moll": ["H", "D", "Fis"],
		};
		const note = $("chordNote");
		const out = $("chordOut");
		const tag = $("chordTag");
		const kb = Keyboard($("kbChord"), { from: 55, to: 79, base: 60, labels: "none" });
		let root = ROOTS[0];
		let major = true;
		let inv = false;

		function showKeys(ms, names) {
			kb.clear("lit");
			kb.setLabels("none");
			ms.forEach((m, i) => {
				kb.light(m, "lit");
				kb.tag(m, names[i]);
			});
		}
		function build(play = true) {
			const name = major ? `${root[0]}-Dur` : `${root[0].toLowerCase()}-Moll`;
			const ms = major ? [root[1], root[1] + 4, root[1] + 7] : [root[1], root[1] + 3, root[1] + 7];
			showKeys(ms, SPELL[name]);
			tag.textContent = name;
			out.textContent = SPELL[name].join(" · ");
			note.textContent = major
				? `Grundton ${root[0]}, 4 Halbtöne hoch zu ${SPELL[name][1]}, nochmal 3 hoch zu ${SPELL[name][2]}. Dur klingt hell.`
				: `Grundton ${root[0]}, nur 3 Halbtöne hoch zu ${SPELL[name][1]}, dann 4 zu ${SPELL[name][2]}. Moll klingt dunkler.`;
			if (!play) return;
			const ac = M.audio();
			ms.forEach((m, i) => M.piano(m, { when: ac.currentTime + i * 0.22, vel: 0.65, dur: 0.5 }));
			ms.forEach((m) => M.piano(m, { when: ac.currentTime + 0.85, vel: 0.7, dur: 1.6 }));
		}
		const rBtns = ROOTS.map((r, i) =>
			chip(r[0], $("rootChips"), () => {
				stopProg();
				root = r;
				choose(rBtns, rBtns[i]);
				build();
			})
		);
		const qBtns = [
			chip("Dur", $("qualChips"), () => {
				stopProg();
				major = true;
				choose(qBtns, qBtns[0]);
				build();
			}),
			chip("Moll", $("qualChips"), () => {
				stopProg();
				major = false;
				choose(qBtns, qBtns[1]);
				build();
			}),
		];
		choose(rBtns, rBtns[0]);
		choose(qBtns, qBtns[0]);
		build(false);

		// Die vier Akkorde
		const PROG = [
			{ n: "C", bass: 48, root: [60, 64, 67], inv: [60, 64, 67], names: [["C", "E", "G"], ["C", "E", "G"]] },
			{ n: "G", bass: 43, root: [67, 71, 74], inv: [59, 62, 67], names: [["G", "H", "D"], ["H", "D", "G"]] },
			{ n: "Am", bass: 45, root: [69, 72, 76], inv: [60, 64, 69], names: [["A", "C", "E"], ["C", "E", "A"]] },
			{ n: "F", bass: 41, root: [65, 69, 72], inv: [60, 65, 69], names: [["F", "A", "C"], ["C", "F", "A"]] },
		];
		const voice = (c) => (inv ? c.inv : c.root);
		const move = (a, b) => a.reduce((s, m, i) => s + Math.abs(m - b[i]), 0);
		const loopMove = () => PROG.reduce((s, c, i) => s + move(voice(c), voice(PROG[(i + 1) % 4])), 0);
		const progBtn = $("btnProg");
		const invBtn = $("btnVoicing");
		const clock = M.createClock({
			bpm: 84,
			steps: 16,
			perBeat: 1,
			onStep(step, time) {
				const b = step % 4;
				if (b !== 0 && b !== 2) return;
				const i = Math.floor(step / 4);
				const c = PROG[i];
				const beat = 60 / clock.bpm;
				if (b === 0) M.piano(c.bass, { when: time, vel: 0.6, dur: beat * 3.8 });
				voice(c).forEach((m) => M.piano(m, { when: time, vel: b === 0 ? 0.6 : 0.42, dur: beat * 1.9 }));
				if (b === 0)
					M.at(time, () => {
						if (!clock.running) return;
						const prev = PROG[(i + 3) % 4];
						showKeys(voice(c), c.names[inv ? 1 : 0]);
						tag.textContent = c.n === "Am" ? "a-Moll" : `${c.n}-Dur`;
						out.textContent = `Finger wandern: ${move(voice(prev), voice(c))} Halbtöne`;
					});
			},
		});
		clock.onAutoStop = () => stopProg();
		function stopProg() {
			if (!clock.running) return;
			clock.stop();
			progBtn.setAttribute("aria-pressed", "false");
			progBtn.textContent = "▶ C · G · Am · F";
		}
		progBtn.addEventListener("click", () => {
			if (clock.running) return stopProg();
			clock.start();
			progBtn.setAttribute("aria-pressed", "true");
			progBtn.textContent = "■ Stopp";
			note.textContent = `Eine Runde: ${loopMove()} Halbtöne Weg für deine rechte Hand. ${inv ? "Mit Umkehrungen bleibt die Hand fast an einem Ort, und es klingt sogar weicher." : "Schalte die Umkehrungen ein und vergleiche."} Links spielt der kleine Finger den Grundton.`;
		});
		invBtn.addEventListener("click", () => {
			inv = !inv;
			invBtn.setAttribute("aria-pressed", String(inv));
			invBtn.textContent = `Umkehrungen: ${inv ? "an" : "aus"}`;
			note.textContent = `Eine Runde: ${loopMove()} Halbtöne Weg für deine rechte Hand${inv ? " statt 52. Gleiche Akkorde, viel weniger Bewegung." : "."}`;
			if (!clock.running) showKeys(voice(PROG[0]), PROG[0].names[inv ? 1 : 0]);
		});
	})();

	// ---------- 5 Tonleiter ----------
	(function scale() {
		const HANDS = [
			{ name: "Rechte Hand", tag: "C-Dur · rechte Hand", hand: 1, seq: [[60, 1], [62, 2], [64, 3], [65, 1], [67, 2], [69, 3], [71, 4], [72, 5], [71, 4], [69, 3], [67, 2], [65, 1], [64, 3], [62, 2], [60, 1]] },
			{ name: "Linke Hand", tag: "C-Dur · linke Hand", hand: -1, seq: [[48, 5], [50, 4], [52, 3], [53, 2], [55, 1], [57, 3], [59, 2], [60, 1], [59, 2], [57, 3], [55, 1], [53, 2], [52, 3], [50, 4], [48, 5]] },
		];
		let cur = HANDS[0];
		const note = $("scaleNote");
		const bpm = $("scaleBpm");
		bpm.addEventListener("input", () => ($("scaleBpmOut").textContent = `${bpm.value} BPM`));
		const kb = Keyboard($("kbScale"), { from: 48, to: 72, base: 60, labels: "c", onDown: (m) => follow.key(m) });
		const follow = Follow(kb, {
			seqEl: $("scaleSeq"),
			noteEl: note,
			outEl: $("scaleOut"),
			hand: () => cur.hand,
			done(errors) {
				note.textContent =
					errors === 0
						? "Sauber! Jetzt das Ganze mit Metronom, erst 60 BPM, dann in kleinen Schritten schneller."
						: `${errors} Fehler. Achte besonders auf den Daumen: Er bereitet sich schon vor, während die anderen Finger spielen.`;
			},
		});
		const btns = HANDS.map((h, i) =>
			chip(h.name, $("scaleHands"), () => {
				cur = h;
				choose(btns, btns[i]);
				$("scaleTag").textContent = h.tag;
				kb.base = h.hand === 1 ? 60 : 48;
				follow.set(h.seq.map(([m, f]) => ({ m, f })));
				note.textContent = h.hand === 1 ? "Rechts aufwärts: 1 2 3, Daumen unter, 1 2 3 4 5." : "Links aufwärts: 5 4 3 2 1, dann greift der Mittelfinger über den Daumen: 3 2 1.";
			})
		);
		choose(btns, btns[0]);
		follow.set(cur.seq.map(([m, f]) => ({ m, f })));
		note.textContent = "Rechts aufwärts: 1 2 3, Daumen unter, 1 2 3 4 5.";
		$("btnScaleDemo").addEventListener("click", () => follow.demo(Number(bpm.value) * 1.5));
		$("btnScaleReset").addEventListener("click", () => {
			follow.reset();
			note.textContent = "Spiel die leuchtende Taste mit dem angezeigten Finger.";
		});
	})();

	// ---------- 6 Tempo-Leiter ----------
	(function ladder() {
		const KEY = "newbobb-klavier-tempo";
		const cv = $("ladderCanvas");
		const { ctx, size } = fitCanvas(cv, (w) => (w < 500 ? 1.3 : 1.9));
		const startIn = $("ladStart");
		const goalIn = $("ladGoal");
		const note = $("ladderNote");
		const btn = $("btnMetro");
		const STEP = 4;
		const st = { start: 60, goal: 100, bpm: 60, clean: 0, miss: 0, best: 60 };
		const pulses = [];
		let beat = { t: -9, i: 0 };

		const saved = M.store.get(KEY, null);
		if (saved && saved.reached) {
			const s = Math.max(40, Math.min(140, Math.round((saved.reached - 8) / 2) * 2));
			startIn.value = s;
			if (saved.goal) goalIn.value = saved.goal;
			note.textContent = `Letztes Mal hast du ${saved.reached} BPM erreicht. Profis starten am nächsten Tag etwas darunter, deshalb geht es heute bei ${s} los.`;
		} else note.textContent = "Stell den Start so langsam ein, dass du deine Stelle sicher fehlerfrei spielst. Lieber zu langsam.";

		function sync() {
			st.start = Number(startIn.value);
			st.goal = Math.max(st.start + STEP, Number(goalIn.value));
			goalIn.value = st.goal;
			st.bpm = st.start;
			st.best = st.start;
			st.clean = 0;
			st.miss = 0;
			$("ladStartOut").textContent = `${st.start} BPM`;
			$("ladGoalOut").textContent = `${st.goal} BPM`;
			clock.bpm = st.bpm;
			[startIn, goalIn].forEach((r) => r.style.setProperty("--fill", `${((r.value - r.min) / (r.max - r.min)) * 100}%`));
		}
		const clock = M.createClock({
			bpm: 60,
			steps: 4,
			perBeat: 1,
			onStep(step, time) {
				M.click(time, step === 0, 0.7);
				pulses.push({ time, i: step });
			},
		});
		clock.onAutoStop = () => {
			btn.setAttribute("aria-pressed", "false");
			btn.textContent = "▶ Metronom";
		};
		startIn.addEventListener("input", sync);
		goalIn.addEventListener("input", sync);
		sync();

		btn.addEventListener("click", () => {
			if (clock.running) {
				clock.stop();
				btn.setAttribute("aria-pressed", "false");
				btn.textContent = "▶ Metronom";
			} else {
				clock.start();
				btn.setAttribute("aria-pressed", "true");
				btn.textContent = "■ Metronom";
			}
		});
		function save() {
			M.store.set(KEY, { reached: st.best, goal: st.goal, at: Date.now() });
		}
		$("btnClean").addEventListener("click", () => {
			st.miss = 0;
			st.clean++;
			if (st.bpm >= st.goal && st.clean >= 3) {
				note.textContent = `🎉 Ziel erreicht: ${st.goal} BPM, dreimal sauber! Für heute reicht das. Morgen festigt sich das von selbst.`;
				st.clean = 3;
			} else if (st.clean >= 3) {
				st.bpm = Math.min(st.goal, st.bpm + STEP);
				st.best = Math.max(st.best, st.bpm);
				st.clean = 0;
				clock.bpm = st.bpm;
				note.textContent = `Dreimal sauber! Eine Stufe höher: ${st.bpm} BPM.`;
			} else note.textContent = `Sauber. Noch ${3 - st.clean}-mal bei ${st.bpm} BPM.`;
			save();
		});
		$("btnMiss").addEventListener("click", () => {
			st.clean = 0;
			st.miss++;
			if (st.miss >= 2 && st.bpm > st.start) {
				st.bpm = Math.max(st.start, st.bpm - STEP);
				st.miss = 0;
				clock.bpm = st.bpm;
				note.textContent = `Zwei Fehler hintereinander: eine Stufe zurück auf ${st.bpm} BPM. Kein Rückschritt, sondern genau richtig.`;
			} else note.textContent = "Fehler passieren. Zähler auf null, gleiches Tempo, nochmal. Konzentrier dich auf die Stelle, die gehakt hat.";
		});

		whenVisible(cv, () => {
			const { w, h } = size;
			const now = clock.running ? M.audio().currentTime : 0;
			while (pulses.length && pulses[0].time <= now) beat = { t: pulses[0].time, i: pulses.shift().i };
			ctx.clearRect(0, 0, w, h);
			const rungs = [];
			for (let b = st.start; b < st.goal; b += STEP) rungs.push(b);
			rungs.push(st.goal);
			const top = 36;
			const bottom = h - 14;
			const lx = 24;
			const lw = Math.min(w * 0.42, 220);
			const rh = (bottom - top) / rungs.length;
			rungs.forEach((b, i) => {
				const y = bottom - (i + 1) * rh;
				const isCur = b === st.bpm || (i === rungs.length - 1 && st.bpm >= st.goal);
				const done = b < st.bpm;
				ctx.fillStyle = isCur ? ACC : done ? "rgba(179,164,255,0.35)" : "rgba(255,255,255,0.06)";
				const hh = Math.max(3, rh - 4);
				ctx.beginPath();
				ctx.roundRect ? ctx.roundRect(lx, y + 2, lw, hh, Math.min(6, hh / 2)) : ctx.rect(lx, y + 2, lw, hh);
				ctx.fill();
				if (rh > 14 || isCur || i === 0 || i === rungs.length - 1) {
					ctx.fillStyle = isCur ? "#140c33" : "rgba(244,239,230,0.6)";
					ctx.font = `${isCur ? 700 : 500} ${Math.min(13, Math.max(10, rh * 0.55))}px 'Space Grotesk', sans-serif`;
					ctx.fillText(`${b}`, lx + 10, y + 2 + hh / 2 + 4);
				}
			});
			const rx = lx + lw + Math.max(20, w * 0.06);
			const cx = rx + (w - rx) / 2;
			ctx.textAlign = "center";
			ctx.fillStyle = INK;
			ctx.font = `800 ${Math.min(64, (w - rx) * 0.32)}px Syne, sans-serif`;
			ctx.fillText(String(st.bpm), cx, h * 0.38);
			ctx.fillStyle = "rgba(244,239,230,0.55)";
			ctx.font = "500 12px 'Space Grotesk', sans-serif";
			ctx.fillText(`BPM · Ziel ${st.goal}`, cx, h * 0.38 + 20);
			// Drei saubere Durchgänge
			for (let i = 0; i < 3; i++) {
				ctx.beginPath();
				ctx.arc(cx + (i - 1) * 30, h * 0.58, 10, 0, Math.PI * 2);
				ctx.fillStyle = i < st.clean ? "#7bdc9a" : "rgba(255,255,255,0.08)";
				ctx.fill();
			}
			ctx.fillStyle = "rgba(244,239,230,0.45)";
			ctx.fillText("3 × sauber = schneller", cx, h * 0.58 + 28);
			// Schlag
			const age = clock.running ? now - beat.t : 9;
			for (let i = 0; i < 4; i++) {
				const on = i === beat.i && age < 0.18;
				ctx.beginPath();
				ctx.arc(cx + (i - 1.5) * 24, h * 0.84, on ? 8 : 5, 0, Math.PI * 2);
				ctx.fillStyle = on ? (i === 0 ? ACC2 : ACC) : "rgba(255,255,255,0.12)";
				ctx.fill();
			}
			ctx.textAlign = "start";
			$("ladderOut").textContent = st.best > st.start ? `Heute bis ${st.best} BPM` : "";
		});
	})();

	// ---------- 7 Rhythmus klopfen ----------
	(function rhythm() {
		const svg = $("rhySvg");
		const note = $("rhyNote");
		const out = $("rhyOut");
		const tapper = $("rhyTap");
		const bpmIn = $("rhyBpm");
		const LEVELS = [
			{ name: "Stufe 1 · Ganze, Halbe, Viertel", units: ["w", "h", "q"] },
			{ name: "Stufe 2 · mit Achteln", units: ["h", "q", "ee"] },
			{ name: "Stufe 3 · Punkte und Pausen", units: ["h", "q", "ee", "dq", "r"] },
		];
		const LEN = { w: 4, h: 2, q: 1, ee: 1, dq: 2, r: 1 };
		let level = LEVELS[0];
		let bar = [];
		let onsets = [];
		let state = "idle";
		let t0 = 0;
		let taps = [];
		let raf = 0;
		let marks = null;

		function generate() {
			let left = 4;
			const out = [];
			while (left > 0) {
				const fit = level.units.filter((u) => LEN[u] <= left && !(u === "w" && Math.random() < 0.7));
				const u = fit[Math.floor(Math.random() * fit.length)] || "q";
				out.push(u);
				left -= LEN[u];
			}
			if (out.every((u) => u === "r")) out[0] = "q";
			bar = out;
			onsets = [];
			let b = 0;
			bar.forEach((u) => {
				if (u === "ee") onsets.push(b, b + 0.5);
				else if (u === "dq") onsets.push(b, b + 1.5);
				else if (u !== "r") onsets.push(b);
				b += LEN[u];
			});
			marks = null;
			draw(-1);
		}

		const X = (beat) => 104 + beat * 114;
		function head(x, filled) {
			sv("ellipse", { cx: x, cy: 110, rx: 10, ry: 7, fill: filled ? INK : "none", stroke: INK, "stroke-width": 2, transform: `rotate(-22 ${x} 110)` }, svg);
		}
		function stem(x) {
			sv("line", { x1: x + 9, x2: x + 9, y1: 108, y2: 56, stroke: INK, "stroke-width": 2 }, svg);
		}
		function draw(playBeat) {
			svg.innerHTML = "";
			sv("line", { x1: 40, x2: 570, y1: 110, y2: 110, stroke: "rgba(244,239,230,0.35)", "stroke-width": 1.5 }, svg);
			[40, 570].forEach((x) => sv("line", { x1: x, x2: x, y1: 90, y2: 130, stroke: "rgba(244,239,230,0.6)", "stroke-width": 2 }, svg));
			const ts = sv("text", { x: 48, y: 104, "font-size": 18, "font-weight": 700, fill: "rgba(244,239,230,0.7)", "font-family": "Syne, sans-serif" }, svg);
			ts.textContent = "4";
			const ts2 = sv("text", { x: 48, y: 126, "font-size": 18, "font-weight": 700, fill: "rgba(244,239,230,0.7)", "font-family": "Syne, sans-serif" }, svg);
			ts2.textContent = "4";
			let b = 0;
			bar.forEach((u) => {
				const x = X(b);
				if (u === "w") head(x, false);
				else if (u === "h") {
					head(x, false);
					stem(x);
				} else if (u === "q") {
					head(x, true);
					stem(x);
				} else if (u === "ee") {
					const x2 = X(b + 0.5);
					head(x, true);
					stem(x);
					head(x2, true);
					stem(x2);
					sv("rect", { x: x + 8, y: 54, width: x2 - x + 2, height: 7, fill: INK }, svg);
				} else if (u === "dq") {
					const x2 = X(b + 1.5);
					head(x, true);
					stem(x);
					sv("circle", { cx: x + 18, cy: 106, r: 2.6, fill: INK }, svg);
					head(x2, true);
					stem(x2);
					sv("path", { d: `M${x2 + 9} 56 q 4 14 14 20 q -6 -4 -14 -6`, fill: INK }, svg);
				} else if (u === "r") {
					const t = sv("text", { x: x - 8, y: 124, "font-size": 46, fill: INK, "font-family": "'Noto Music', serif" }, svg);
					t.textContent = "\u{1D13D}";
				}
				b += LEN[u];
			});
			for (let i = 0; i < 8; i++) {
				const t = sv("text", { x: X(i / 2), y: 172, "text-anchor": "middle", "font-size": i % 2 ? 13 : 15, "font-weight": i % 2 ? 500 : 700, fill: i % 2 ? "rgba(244,239,230,0.4)" : "rgba(244,239,230,0.8)", "font-family": "Space Grotesk, sans-serif" }, svg);
				t.textContent = i % 2 ? "+" : String(i / 2 + 1);
			}
			if (marks) {
				marks.hits.forEach((m) => sv("circle", { cx: X(m.beat), cy: 28, r: 8, fill: m.color }, svg));
				marks.taps.forEach((tb) => sv("line", { x1: X(tb), x2: X(tb), y1: 140, y2: 152, stroke: ACC2, "stroke-width": 3, "stroke-linecap": "round" }, svg));
			}
			if (playBeat >= 0) sv("line", { x1: X(playBeat), x2: X(playBeat), y1: 40, y2: 156, stroke: ACC, "stroke-width": 2, opacity: 0.8 }, svg);
		}

		const beatLen = () => 60 / Number(bpmIn.value);
		function animate() {
			if (state !== "count" && state !== "play" && state !== "listen") return draw(-1);
			const now = M.audio().currentTime;
			const beat = (now - t0) / beatLen();
			if (beat < 0) {
				out.textContent = `Vorzählen … ${4 + Math.floor(beat) + 1}`;
				draw(-1);
			} else {
				if (state === "count") state = "play";
				out.textContent = state === "listen" ? "Hör zu" : "Jetzt klopfen!";
				draw(Math.min(4, beat));
			}
			raf = requestAnimationFrame(animate);
		}

		function schedule(withNotes) {
			const ac = M.audio();
			const bl = beatLen();
			t0 = ac.currentTime + 0.2 + 4 * bl;
			for (let i = -4; i < 4; i++) M.click(t0 + i * bl, i === -4 || i === 0, 0.5);
			if (withNotes) onsets.forEach((o) => M.piano(72, { when: t0 + o * bl, vel: 0.6, dur: 0.25 }));
		}
		$("btnRhy").addEventListener("click", () => {
			if (state !== "idle") return;
			marks = null;
			taps = [];
			state = "count";
			schedule(false);
			note.textContent = "Klopf genau auf den Notenanfang. Bei langen Noten einmal klopfen und weiterzählen.";
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(animate);
			setTimeout(evaluate, (0.2 + 8.6 * beatLen()) * 1000);
		});
		$("btnRhyListen").addEventListener("click", () => {
			if (state !== "idle") return;
			state = "listen";
			marks = null;
			schedule(true);
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(animate);
			setTimeout(() => {
				state = "idle";
				out.textContent = "";
			}, (0.2 + 8.3 * beatLen()) * 1000);
		});
		$("btnRhyNew").addEventListener("click", () => state === "idle" && generate());
		bpmIn.addEventListener("input", () => ($("rhyBpmOut").textContent = `${bpmIn.value} BPM`));

		function tap() {
			if (state !== "count" && state !== "play") return;
			const ac = M.audio();
			const lat = ac.outputLatency || ac.baseLatency || 0;
			taps.push((ac.currentTime - lat - t0) / beatLen());
			tapper.classList.add("hit");
			setTimeout(() => tapper.classList.remove("hit"), 90);
		}
		tapper.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			tap();
		});
		document.addEventListener("keydown", (e) => {
			if ((state === "count" || state === "play") && e.code === "Space" && !e.repeat) {
				e.preventDefault();
				tap();
			}
		});

		function evaluate() {
			if (state !== "play" && state !== "count") return;
			state = "idle";
			cancelAnimationFrame(raf);
			const valid = taps.filter((t) => t > -0.4 && t < 4.4);
			const used = new Set();
			let good = 0;
			let sum = 0;
			let n = 0;
			const hits = onsets.map((o) => {
				let best = -1;
				valid.forEach((t, i) => {
					if (used.has(i) || Math.abs(t - o) > 0.35) return;
					if (best < 0 || Math.abs(t - o) < Math.abs(valid[best] - o)) best = i;
				});
				if (best < 0) return { beat: o, color: "#ff8a7a" };
				used.add(best);
				const err = valid[best] - o;
				sum += err;
				n++;
				const a = Math.abs(err);
				if (a < 0.12) good++;
				return { beat: o, color: a < 0.12 ? "#7bdc9a" : a < 0.22 ? ACC2 : "#ff8a7a" };
			});
			const extra = valid.length - used.size;
			marks = { hits, taps: valid.map((t) => Math.max(-0.2, Math.min(4.2, t))) };
			draw(-1);
			const score = Math.round((good / (onsets.length + extra)) * 100);
			out.textContent = `${score} % im Takt`;
			const ms = n ? Math.round((sum / n) * beatLen() * 1000) : 0;
			let msg = `${good} von ${onsets.length} Noten genau getroffen${extra ? `, ${extra} ${extra === 1 ? "Schlag" : "Schläge"} zu viel` : ""}. `;
			if (n && Math.abs(ms) > 35) msg += ms < 0 ? `Du bist im Schnitt ${-ms} ms zu früh: typisch, wenn man eilt. Zähl ruhig mit.` : `Du bist im Schnitt ${ms} ms zu spät. Klopf mutiger auf den Schlag.`;
			else if (score >= 90) msg += "Stark! Neuer Takt oder etwas schneller.";
			else msg += "Hör dir den Takt mit 👂 an, zähl laut mit und versuch es nochmal.";
			note.textContent = msg;
		}

		const lBtns = LEVELS.map((l, i) =>
			chip(l.name, $("rhyLevels"), () => {
				if (state !== "idle") return;
				level = l;
				choose(lBtns, lBtns[i]);
				$("rhyTag").textContent = l.name.split(" · ")[0];
				generate();
			})
		);
		choose(lBtns, lBtns[0]);
		generate();
		note.textContent = "Die Punkte oben zeigen nach dem Klopfen: grün genau, gelb knapp, rot daneben.";
		if (document.fonts && document.fonts.load) document.fonts.load("46px 'Noto Music'", "\u{1D13D}").then(() => state === "idle" && draw(-1));
	})();

	// ---------- 8 Begleitmuster ----------
	(function accompaniment() {
		const CH = [
			{ n: "C-Dur", root: 48, third: 4, rh: [60, 64, 67] },
			{ n: "G-Dur", root: 43, third: 4, rh: [59, 62, 67] },
			{ n: "a-Moll", root: 45, third: 3, rh: [60, 64, 69] },
			{ n: "F-Dur", root: 41, third: 4, rh: [60, 65, 69] },
		];
		const PATTERNS = [
			{ name: "Grundton", steps: [[0, 0, 8]], tip: "Nur der Grundton, mit dem kleinen Finger, eine ganze Note lang. Klingt schlicht und trägt trotzdem das ganze Lied." },
			{ name: "Grundton + Quinte", steps: [[0, 0, 4], [7, 4, 4]], tip: "Kleiner Finger auf den Grundton, Daumen auf die Quinte. Die Hand bleibt in derselben Form und wandert nur mit." },
			{ name: "Oktaven", steps: [[0, 0, 2], [12, 2, 2], [0, 4, 2], [12, 6, 2]], tip: "Finger 5 und 1 im Wechsel, eine Oktave auseinander. Treibt nach vorne, typisch für Pop und Rock." },
			{ name: "Gebrochen 1-5-8-5", steps: [[0, 0, 2], [7, 2, 2], [12, 4, 2], [7, 6, 2]], tip: "Grundton, Quinte, Oktave, Quinte. Fließend und weich, der Klassiker für Balladen. Fingersatz 5 2 1 2." },
			{ name: "Alberti-Bass", steps: "A", tip: "Unten, oben, Mitte, oben: 5 1 3 1. Der Bass aus Mozarts Sonaten. Gleichmäßig und leise spielen, die Melodie ist die Hauptsache." },
		];
		const out = $("accOut");
		const btn = $("btnAcc");
		const bpmIn = $("accBpm");
		const rhBtn = $("btnAccRH");
		let pat = PATTERNS[1];
		let rh = true;
		const kb = Keyboard($("kbAccomp"), { from: 41, to: 76, base: 48, labels: "c" });
		const stepsOf = (c) =>
			pat.steps === "A" ? [0, 7, c.third, 7, 0, 7, c.third, 7].map((o, i) => [o, i, 1]) : pat.steps;

		const clock = M.createClock({
			bpm: 76,
			steps: 32,
			perBeat: 2,
			onStep(step, time) {
				const bar = Math.floor(step / 8);
				const e = step % 8;
				const c = CH[bar];
				const eighth = 60 / clock.bpm / 2;
				if (rh && e % 4 === 0) c.rh.forEach((m) => M.piano(m, { when: time, vel: 0.42, dur: eighth * 3.8 }));
				stepsOf(c)
					.filter((s) => s[1] === e)
					.forEach(([o, , l]) => {
						const m = c.root + o;
						M.piano(m, { when: time, vel: 0.62, dur: Math.max(eighth * l * 0.95, eighth * 1.5) });
						M.at(time, () => {
							if (!clock.running) return;
							kb.clear("hint");
							kb.light(m, "hint");
							if (e === 0) {
								kb.clear("lit");
								if (rh) c.rh.forEach((r) => kb.light(r, "lit"));
								out.textContent = c.n;
							}
						});
					});
			},
		});
		clock.onAutoStop = () => setPlaying(false);
		function setPlaying(on) {
			btn.setAttribute("aria-pressed", String(on));
			btn.textContent = on ? "■ Stopp" : "▶ Start";
			if (on) clock.start();
			else {
				clock.stop();
				kb.clear("hint");
				kb.clear("lit");
				out.textContent = "";
			}
		}
		btn.addEventListener("click", () => setPlaying(!clock.running));
		bpmIn.addEventListener("input", () => {
			clock.bpm = Number(bpmIn.value);
			$("accBpmOut").textContent = `${bpmIn.value} BPM`;
		});
		rhBtn.addEventListener("click", () => {
			rh = !rh;
			rhBtn.setAttribute("aria-pressed", String(rh));
			if (!rh) kb.clear("lit");
		});
		const pBtns = PATTERNS.map((p, i) =>
			chip(p.name, $("accPatterns"), () => {
				pat = p;
				choose(pBtns, pBtns[i]);
				$("accNote").textContent = p.tip;
			})
		);
		choose(pBtns, pBtns[1]);
		$("accNote").textContent = pat.tip;
	})();

	// ---------- 9 Intervalle ----------
	(function intervals() {
		const INT = {
			1: ["kleine Sekunde", "den Hai aus „Der weiße Hai“"],
			2: ["große Sekunde", "„Alle meine Entchen“"],
			3: ["kleine Terz", "„Greensleeves“"],
			4: ["große Terz", "„When the Saints Go Marching In“"],
			5: ["Quarte", "„O Tannenbaum“"],
			6: ["Tritonus", "„Maria“ aus der West Side Story"],
			7: ["Quinte", "„Morgen kommt der Weihnachtsmann“ (von „-gen“ zu „kommt“)"],
			9: ["große Sexte", "„My Bonnie Is Over the Ocean“"],
			12: ["Oktave", "„Somewhere Over the Rainbow“"],
		};
		const LEVELS = [
			{ name: "Stufe 1", set: [4, 7, 12] },
			{ name: "Stufe 2", set: [2, 4, 5, 7, 12] },
			{ name: "Stufe 3", set: [1, 2, 3, 4, 5, 6, 7, 9, 12] },
		];
		const note = $("intNote");
		const out = $("intOut");
		const harmBtn = $("btnIntHarm");
		const kb = Keyboard($("kbInt"), { from: 55, to: 79, base: 60, labels: "c" });
		let level = LEVELS[0];
		let q = null;
		let locked = true;
		let harm = false;
		let right = 0;
		let total = 0;
		let streak = 0;
		let ans = [];

		function play() {
			if (!q) return;
			const ac = M.audio();
			const t = ac.currentTime + 0.05;
			M.piano(q.lo, { when: t, vel: 0.7, dur: harm ? 1.6 : 0.8 });
			M.piano(q.lo + q.iv, { when: harm ? t : t + 0.8, vel: 0.7, dur: harm ? 1.6 : 1.1 });
		}
		function next() {
			const iv = level.set[Math.floor(Math.random() * level.set.length)];
			const lo = 55 + Math.floor(Math.random() * (79 - 55 - iv + 1));
			q = { iv, lo };
			locked = false;
			kb.clear("hint");
			kb.setLabels("c");
			ans.forEach((b) => b.classList.remove("is-right", "is-wrong"));
			note.textContent = "Wie weit liegen die zwei Töne auseinander? Sing das erste Lied, das dir einfällt, im Kopf mit.";
			play();
		}
		function build() {
			$("intAnswers").innerHTML = "";
			ans = level.set.map((iv) => {
				const b = chip(INT[iv][0], $("intAnswers"), () => answer(iv, b));
				b.removeAttribute("aria-pressed");
				return b;
			});
		}
		function answer(iv, b) {
			if (locked || !q) return;
			locked = true;
			total++;
			[q.lo, q.lo + q.iv].forEach((m) => {
				kb.light(m, "hint");
				kb.tag(m, M.noteName(m));
			});
			const truth = ans[level.set.indexOf(q.iv)];
			if (iv === q.iv) {
				right++;
				streak++;
				b.classList.add("is-right");
				note.textContent = `Richtig: ${INT[iv][0]}, ${q.iv} Halbtöne, wie bei ${INT[iv][1]}.`;
				setTimeout(next, 1800);
			} else {
				streak = 0;
				b.classList.add("is-wrong");
				truth.classList.add("is-right");
				note.textContent = `Das war eine ${INT[q.iv][0]} (${q.iv} Halbtöne). Denk an ${INT[q.iv][1]}. Mit 🔁 nochmal hören, dann ▶.`;
			}
			out.textContent = `${right} von ${total} · Serie ${streak}`;
		}
		const lBtns = LEVELS.map((l, i) =>
			chip(l.name, $("intLevels"), () => {
				level = l;
				choose(lBtns, lBtns[i]);
				build();
				q = null;
				locked = true;
				note.textContent = `${l.set.map((iv) => INT[iv][0]).join(", ")}. Drück ▶.`;
			})
		);
		choose(lBtns, lBtns[0]);
		build();
		note.textContent = "Stufe 1: große Terz, Quinte und Oktave. Drück ▶.";
		$("btnIntNew").addEventListener("click", next);
		$("btnIntAgain").addEventListener("click", play);
		harmBtn.addEventListener("click", () => {
			harm = !harm;
			harmBtn.setAttribute("aria-pressed", String(harm));
			if (q) play();
		});
	})();

	// ---------- 10 Übeplan ----------
	M.practicePlan($("plan"), "klavier", [
		{ min: 3, title: "Aufwärmen", tip: "Fünf-Finger-Übung und C-Dur-Tonleiter, Hände getrennt, langsam und gleichmäßig." },
		{ min: 3, title: "Noten lesen", tip: "Landmarken-Trainer oder ein leichtes, neues Stück einmal durchspielen, ohne anzuhalten." },
		{ min: 4, title: "Akkorde", tip: "C · G · Am · F mit Umkehrungen, links der Grundton." },
		{ min: 10, title: "Dein Stück", tip: "Die schwierigste Stelle mit der Tempo-Leiter. Erst Hände getrennt, dann zusammen." },
		{ min: 5, title: "Einfach spielen", tip: "Das Stück einmal komplett oder frei improvisieren. Spaß zuletzt." },
	]);
})();
