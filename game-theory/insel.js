// Spielinsel der Spieltheorie: Inselkarte, Gegner-Figuren, Sterne, Endgegner-Fragen, Konfetti und die Auszahlungsmatrix.
// Die Level selbst stehen in levels-a/b/c.js und melden sich mit Arcade.register(n, init) an.

(() => {
	const KEY = "newbobb-spielhalle-v1";
	const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

	const WORLDS = [
		{ name: "Regel-Lagune", emo: "🏝️", color: "#2bb3ea", desc: "Was ein Spiel ist und wie man es aufschreibt." },
		{ name: "Dilemma-Dschungel", emo: "🌴", color: "#1fbf7a", desc: "Wenn kluge Einzelne gemeinsam schlecht dastehen, und wie man rauskommt." },
		{ name: "Taktik-Gipfel", emo: "⛰️", color: "#8b5cf6", desc: "Mischen, vorausdenken, drohen und bieten." },
		{ name: "Hafen der Vielen", emo: "⛵", color: "#ff8a3d", desc: "Fairness, Evolution und Spiele, die ein Leben lang dauern." },
	];
	// foe: Gegenüber im Level mit Farbe, Hut und erstem Satz
	const LEVELS = [
		{ t: "Schere, Stein, Papier", s: "Was ist ein Spiel?", w: 0, foe: ["Rocky", "#9b8ec4", "🧢", "Ich bin unschlagbar. Wirklich!"] },
		{ t: "Der Strand-Kiosk", s: "Die Auszahlungsmatrix", w: 0, foe: ["Gelato-Gil", "#ff8fb1", "🍦", "Mein Eis ist besser. Wo stellst du dich hin?"] },
		{ t: "Flucht vor dem Piraten", s: "Dominante Strategie", w: 0, foe: ["Käpt'n Kralle", "#ff6b5e", "🏴‍☠️", "Arrr! Irgendwo warte ich auf dich."] },
		{ t: "Der Konzert-Kalender", s: "Nash-Gleichgewicht", w: 0, foe: ["Die Dezibels", "#a77bff", "🎸", "Samstag ist unser Tag! Oder doch nicht?"] },
		{ t: "Das Verhör", s: "Gefangenendilemma", w: 1, foe: ["Ganove Gustav", "#7b88a8", "🕶️", "Ich halte dicht. Versprochen. Vielleicht."] },
		{ t: "Wer ist der Bot?", s: "Wiederholte Spiele", w: 1, foe: ["Mister X", "#ffb020", "❓", "Wer bin ich? Spiel zehn Runden, dann rate!"] },
		{ t: "Die Hirschjagd", s: "Koordination und Vertrauen", w: 1, foe: ["Jäger Jo", "#3fae5a", "🏹", "Ich jage den Hirsch, wenn ich dir vertrauen kann."] },
		{ t: "Mutprobe auf der Straße", s: "Feigling-Spiel und Selbstbindung", w: 1, foe: ["Hitzkopf Harry", "#ff7a2f", "🏎️", "Ich weiche nie aus. Na ja, fast nie."] },
		{ t: "Elfmeter", s: "Gemischte Strategien", w: 2, foe: ["Torwart Toni", "#22b8c9", "🧤", "Ich merke mir jeden deiner Schüsse."] },
		{ t: "Die letzte Münze", s: "Rückwärts denken", w: 2, foe: ["Nimbus", "#f2b51d", "🪙", "Ich rechne rückwärts. Du auch?"] },
		{ t: "Der Platzhirsch", s: "Drohungen und Versprechen", w: 2, foe: ["Herr Hirsch", "#b07a4f", "👑", "Komm nur her, dann gibt es Preiskrieg!"] },
		{ t: "Die stille Auktion", s: "Auktionen", w: 2, foe: ["Bieter-Bande", "#ef6aa8", "🔨", "Wir bieten, was es uns wert ist. Und du?"] },
		{ t: "Zehn Münzen teilen", s: "Ultimatum und Fairness", w: 3, foe: ["Fair-Frida", "#3fbfa3", "⚖️", "Teil fair, sonst gibt es gar nichts."] },
		{ t: "Haie, Lämmer, Spiegel", s: "Evolution der Kooperation", w: 3, foe: ["Professor Darwin", "#6f8cff", "🧬", "Mal sehen, wer am Ende übrig bleibt."] },
		{ t: "Lange Spiele", s: "Lange Spiele mit langen Partnern", w: 3, foe: ["Elefant Emil", "#9aa3c8", "🐘", "Ich vergesse nie. Im Guten wie im Schlechten."] },
	];

	// ---------- Fortschritt ----------
	let state = { m: {}, b: {}, name: "" };
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) state = { ...state, ...JSON.parse(raw) };
	} catch (e) {
		/* ohne Speicher geht es auch */
	}
	const save = () => {
		try {
			localStorage.setItem(KEY, JSON.stringify(state));
		} catch (e) {
			/* ignorieren */
		}
	};
	const starsOf = (n) => (state.m[n] ? 1 : 0) + (state.b[n] || 0);
	const totalStars = () => LEVELS.reduce((s, _, i) => s + starsOf(i + 1), 0);

	// ---------- Kleine Helfer ----------
	const $ = (sel, root = document) => root.querySelector(sel);
	const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
	const pad2 = (n) => String(n).padStart(2, "0");
	const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
	const fmt = (x, d = 2) => {
		let s = (Math.round(x * 10 ** d) / 10 ** d).toFixed(d);
		if (s.includes(".")) s = s.replace(/\.?0+$/, "");
		return (s === "-0" ? "0" : s).replace(".", ",").replace("-", "−");
	};

	// ---------- Figuren ----------
	const MOUTH = {
		neutral: '<path d="M50 84 Q60 88 70 84" stroke="#2b2350" stroke-width="4" fill="none" stroke-linecap="round"/>',
		happy: '<path d="M45 79 Q60 98 75 79 Z" fill="#2b2350"/><path d="M53 89 Q60 94 67 89 Q60 86 53 89Z" fill="#ff8aa0"/>',
		sad: '<path d="M48 90 Q60 79 72 90" stroke="#2b2350" stroke-width="4" fill="none" stroke-linecap="round"/>',
		wow: '<ellipse cx="60" cy="86" rx="7" ry="9" fill="#2b2350"/>',
		smug: '<path d="M48 85 Q62 90 73 79" stroke="#2b2350" stroke-width="4" fill="none" stroke-linecap="round"/>',
		angry: '<path d="M48 88 Q60 82 72 88" stroke="#2b2350" stroke-width="4" fill="none" stroke-linecap="round"/>',
	};
	const BROWS = {
		sad: '<path d="M36 42 L50 46 M84 42 L70 46" stroke="#2b2350" stroke-width="3.5" stroke-linecap="round"/>',
		angry: '<path d="M36 44 L51 50 M84 44 L69 50" stroke="#2b2350" stroke-width="4" stroke-linecap="round"/>',
		smug: '<path d="M37 46 L50 44 M70 42 L83 45" stroke="#2b2350" stroke-width="3.5" stroke-linecap="round"/>',
		wow: '<path d="M37 40 Q44 35 51 40 M69 40 Q76 35 83 40" stroke="#2b2350" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
	};
	let buddyCount = 0;
	function buddy(color, hat, mood = "neutral", label = "") {
		const el = document.createElement("span");
		el.className = "buddy";
		el.style.setProperty("--delay", `${(buddyCount++ % 7) * -0.45}s`);
		if (label) {
			el.setAttribute("role", "img");
			el.setAttribute("aria-label", label);
		} else el.setAttribute("aria-hidden", "true");
		const dark = `color-mix(in srgb, ${color} 72%, #2b2350)`;
		const draw = (m) => {
			const look = m === "smug" ? 3 : m === "sad" ? -1 : 0;
			el.innerHTML = `<svg viewBox="0 0 120 120">
				<ellipse cx="60" cy="112" rx="34" ry="6" fill="rgba(43,35,80,0.12)"/>
				<ellipse cx="42" cy="106" rx="12" ry="7" fill="${dark}"/><ellipse cx="78" cy="106" rx="12" ry="7" fill="${dark}"/>
				<path d="M60 18 C94 18 108 42 108 70 C108 98 88 108 60 108 C32 108 12 98 12 70 C12 42 26 18 60 18Z" fill="${color}"/>
				<ellipse cx="42" cy="40" rx="16" ry="10" fill="rgba(255,255,255,0.35)" transform="rotate(-25 42 40)"/>
				<ellipse cx="32" cy="76" rx="8" ry="5" fill="#ff8aa0" opacity="0.55"/><ellipse cx="88" cy="76" rx="8" ry="5" fill="#ff8aa0" opacity="0.55"/>
				<g class="eyes">
					<ellipse cx="45" cy="60" rx="11" ry="12" fill="#fff"/><ellipse cx="75" cy="60" rx="11" ry="12" fill="#fff"/>
					<circle cx="${46 + look}" cy="${62 - (m === "wow" ? 2 : 0)}" r="5.5" fill="#2b2350"/><circle cx="${76 + look}" cy="${62 - (m === "wow" ? 2 : 0)}" r="5.5" fill="#2b2350"/>
					<circle cx="${48 + look}" cy="59" r="1.8" fill="#fff"/><circle cx="${78 + look}" cy="59" r="1.8" fill="#fff"/>
				</g>
				${BROWS[m] || ""}${MOUTH[m] || MOUTH.neutral}
				${hat ? `<text x="60" y="24" font-size="30" text-anchor="middle">${hat}</text>` : ""}
			</svg>`;
		};
		draw(mood);
		el.mood = (m) => {
			draw(m);
			el.classList.remove("jump", "shake");
			void el.offsetWidth;
			el.classList.add(m === "angry" || m === "sad" ? "shake" : "jump");
		};
		return el;
	}

	// Gegenüber im Level: Figur mit Sprechblase
	const foes = {};
	function makeFoe(sec, n) {
		const [name, color, hat, hello] = LEVELS[n - 1].foe;
		const box = document.createElement("div");
		box.className = "foe";
		const b = buddy(color, hat, "smug", name);
		const bubble = document.createElement("div");
		bubble.className = "bubble";
		bubble.style.setProperty("--foe", `color-mix(in srgb, ${color} 60%, #2b2350)`);
		bubble.setAttribute("aria-live", "polite");
		bubble.innerHTML = `<small>${name}</small><span>${hello}</span>`;
		box.append(b, bubble);
		$(".brief", sec).before(box);
		foes[n] = {
			say(text, mood = "neutral") {
				$("span", bubble).textContent = text;
				b.mood(mood);
			},
		};
	}
	function foe(n) {
		return foes[n] || { say() {} };
	}

	// ---------- Meldung und Konfetti ----------
	const toastEl = document.createElement("div");
	toastEl.className = "toast";
	toastEl.setAttribute("role", "status");
	document.body.appendChild(toastEl);
	let toastT = 0;
	function toast(msg) {
		toastEl.textContent = msg;
		toastEl.classList.add("show");
		clearTimeout(toastT);
		toastT = setTimeout(() => toastEl.classList.remove("show"), 2800);
	}
	const COLORS = ["#2f7cf6", "#ff5d73", "#ffc23d", "#1fbf7a", "#8b5cf6", "#2bb3ea", "#ff8a3d"];
	function confetti(count = 70) {
		if (reduced) return;
		const box = document.createElement("div");
		box.className = "confetti";
		for (let i = 0; i < count; i++) {
			const p = document.createElement("i");
			p.style.left = `${Math.random() * 100}%`;
			p.style.background = pick(COLORS);
			p.style.setProperty("--t", `${1.6 + Math.random() * 1.4}s`);
			p.style.setProperty("--dl", `${Math.random() * 0.4}s`);
			p.style.setProperty("--dx", `${(Math.random() - 0.5) * 220}px`);
			p.style.setProperty("--rot", `${(Math.random() - 0.5) * 1080}deg`);
			if (Math.random() < 0.4) p.style.borderRadius = "50%";
			box.appendChild(p);
		}
		document.body.appendChild(box);
		setTimeout(() => box.remove(), 3400);
	}

	// Canvas an Breite und Pixeldichte anpassen; draw(ctx, w, h) bei jeder Änderung
	function fit(canvas, aspect, draw) {
		const ctx = canvas.getContext("2d");
		const s = { ctx, w: 0, h: 0, redraw };
		function redraw() {
			if (s.w) draw(ctx, s.w, s.h);
		}
		const apply = () => {
			const w = canvas.clientWidth;
			if (!w) return;
			const h = Math.round(typeof aspect === "function" ? aspect(w) : w * aspect);
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.style.height = `${h}px`;
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(h * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			s.w = w;
			s.h = h;
			redraw();
		};
		new ResizeObserver(apply).observe(canvas);
		queueMicrotask(apply);
		document.fonts?.ready.then(redraw);
		return s;
	}

	// Kurze Animation über dur Sekunden; bei reduzierter Bewegung sofort am Ende
	function animate(dur, step, done) {
		if (reduced) {
			step(1);
			done?.();
			return;
		}
		const t0 = performance.now();
		const tick = (t) => {
			const k = Math.min(1, (t - t0) / (dur * 1000));
			step(k);
			if (k < 1) requestAnimationFrame(tick);
			else done?.();
		};
		requestAnimationFrame(tick);
	}

	// ---------- Auszahlungsmatrix ----------
	// pay[r][c] = [deine Punkte, Punkte des Gegners]
	const fmtPay = (v) => (v < 0 ? `−${-v}` : String(v));
	const plain = (t) => String(t).replace(/&shy;/g, "");
	function matrix(host, o) {
		const R = o.rows.length;
		const C = o.cols.length;
		const you = o.youName || "Du";
		const opp = o.oppName || "Bot";
		host.classList.add("matrix");
		host.innerHTML = `
			<div class="mx-legend"><span><b class="you">${you}</b>: Zeile, linke Zahl</span>
				<span><b class="opp">${opp}</b>: Spalte, rechte Zahl</span></div>
			<div class="mx-grid" style="grid-template-columns: minmax(64px, 0.9fr) repeat(${C}, minmax(0, 1fr))"></div>`;
		const grid = $(".mx-grid", host);
		const colTag = o.onLens ? "button" : "div";
		const rowTag = o.onRow ? "button" : "div";
		const cellTag = o.onCell ? "button" : "div";
		let html = `<div class="mx-corner">${o.corner || ""}</div>`;
		o.cols.forEach((c, j) => {
			html += `<${colTag} class="mx-col" data-c="${j}"${o.onLens ? ' type="button" aria-pressed="false"' : ""}>${c}</${colTag}>`;
		});
		o.rows.forEach((r, i) => {
			html += `<${rowTag} class="mx-row" data-r="${i}"${o.onRow ? ' type="button"' : ""}>${r}</${rowTag}>`;
			o.cols.forEach((_, j) => {
				const [a, b] = o.pay[i][j];
				const label = `${you} ${plain(r)}, ${opp} ${plain(o.cols[j])}: ${a} für dich, ${b} für ${opp}`;
				html += `<${cellTag} class="mx-cell" data-r="${i}" data-c="${j}"${o.onCell ? ' type="button"' : ""} aria-label="${label}"><span class="a">${fmtPay(a)}</span><span class="sep">|</span><span class="b">${fmtPay(b)}</span></${cellTag}>`;
			});
		});
		grid.innerHTML = html;
		const cell = (r, c) => $(`.mx-cell[data-r="${r}"][data-c="${c}"]`, grid);
		const cells = () => $$(".mx-cell", grid);

		if (o.onRow) $$(".mx-row", grid).forEach((b) => b.addEventListener("click", () => o.onRow(Number(b.dataset.r))));
		if (o.onCell)
			cells().forEach((b) => b.addEventListener("click", () => o.onCell(Number(b.dataset.r), Number(b.dataset.c), b)));
		const seen = new Set();
		if (o.onLens)
			$$(".mx-col", grid).forEach((b) =>
				b.addEventListener("click", () => {
					const c = Number(b.dataset.c);
					const on = b.getAttribute("aria-pressed") !== "true";
					b.setAttribute("aria-pressed", String(on));
					const best = Math.max(...o.pay.map((row) => row[c][0]));
					for (let r = 0; r < R; r++) cell(r, c).classList.toggle("best-you", on && o.pay[r][c][0] === best);
					if (on) seen.add(c);
					o.onLens(c, seen, o.rows[o.pay.findIndex((row) => row[c][0] === best)]);
				})
			);

		return {
			cell,
			hit(r, c) {
				cells().forEach((x) => x.classList.remove("hit"));
				if (r != null) cell(r, c).classList.add("hit");
			},
			rowsDisabled(v) {
				$$("button.mx-row", grid).forEach((b) => (b.disabled = v));
			},
			clear() {
				cells().forEach((x) => x.classList.remove("hit", "best-you", "best-opp", "nash"));
				$$("button.mx-col", grid).forEach((b) => b.setAttribute("aria-pressed", "false"));
				seen.clear();
			},
		};
	}

	// ---------- Level anmelden und starten ----------
	const inits = {};
	const started = {};
	function register(n, init) {
		inits[n] = init;
	}

	function mission(n, msg) {
		const sec = $(`#l${n}`);
		$(".mission", sec)?.classList.add("done");
		$(".reveal-box", sec)?.classList.add("ready");
		if (state.m[n]) return;
		state.m[n] = true;
		save();
		updateStars();
		confetti();
		toast(msg || "🎉 Mission geschafft! +1 ★ Jetzt den Aha-Moment aufdecken.");
	}

	// Endgegner-Fragen: richtig beim ersten Versuch 2 Sterne, später 1 Stern
	function setupBoss(sec, n) {
		const boss = $(".boss", sec);
		if (!boss) return;
		$(".tag", boss).textContent = "Endgegner-Frage";
		const right = Number(boss.dataset.answer);
		const btns = $$(".opts button", boss);
		const why = document.createElement("p");
		why.className = "why";
		why.setAttribute("aria-live", "polite");
		boss.appendChild(why);
		let misses = 0;
		btns.forEach((b, i) =>
			b.addEventListener("click", () => {
				if (i === right) {
					btns.forEach((x) => (x.disabled = true));
					b.classList.add("right");
					why.textContent = `Richtig! ${boss.dataset.why}`;
					const pts = misses ? 1 : 2;
					if ((state.b[n] || 0) < pts) {
						state.b[n] = pts;
						save();
						updateStars();
					}
					confetti(misses ? 30 : 90);
					foe(n).say(misses ? "Na gut, am Ende hast du es gewusst." : "Wow, auf Anhieb! Respekt.", "wow");
					toast(misses ? "👑 Endgegner geschafft! +1 ★" : "👑 Beim ersten Versuch! +2 ★");
				} else {
					misses++;
					b.classList.add("wrong");
					b.disabled = true;
					why.textContent = `Knapp daneben. ${boss.dataset.hint || "Schau noch mal in den Aha-Moment."}`;
					foe(n).say("Hehe, versuch es noch mal!", "smug");
				}
			})
		);
	}

	// ---------- Ansichten ----------
	const selectView = $("#select");
	const levels = $$(".level");
	const hudMid = $(".hud-mid");
	const hudStars = $(".hud-stars");

	function buildHeads() {
		levels.forEach((sec) => {
			const n = Number(sec.dataset.n);
			const L = LEVELS[n - 1];
			const W = WORLDS[L.w];
			sec.style.setProperty("--isl", W.color);
			const head = document.createElement("header");
			head.className = "lv-head";
			head.innerHTML = `<span class="chip">${W.emo} ${W.name} · Level ${n}</span>
				<h2 tabindex="-1">${L.t}</h2><p class="lv-sub">${L.s}</p>`;
			sec.prepend(head);
			makeFoe(sec, n);
			const nav = document.createElement("nav");
			nav.className = "lv-nav";
			nav.setAttribute("aria-label", "Level wechseln");
			nav.innerHTML =
				(n > 1 ? `<a class="btn" href="#l${n - 1}">← Level ${n - 1}</a>` : `<span></span>`) +
				`<a class="btn" href="#start">🗺️ Karte</a>` +
				(n < LEVELS.length ? `<a class="btn you" href="#l${n + 1}">Level ${n + 1} →</a>` : `<a class="btn you" href="#rangliste">Rangliste →</a>`);
			sec.appendChild(nav);
			setupBoss(sec, n);
			if (state.m[n]) $(".mission", sec)?.classList.add("done");
		});
	}

	// Inselkarte mit Zickzack-Pfad
	const ZIG = [0.04, 0.72, 0.28, 0.96];
	function buildMap() {
		const host = $("#map");
		host.innerHTML = WORLDS.map(
			(w, wi) => `<section class="island" style="--isl:${w.color}" aria-labelledby="w${wi}">
				<div class="island-head"><span class="emo" aria-hidden="true">${w.emo}</span>
					<div><h2 id="w${wi}">${w.name}</h2><p>${w.desc}</p></div></div>
				<div class="path"><svg class="trail" aria-hidden="true"><path fill="none" stroke="${w.color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 14" opacity="0.6"/></svg>
				${LEVELS.map((L, i) => ({ L, n: i + 1 }))
					.filter((x) => x.L.w === wi)
					.map(
						({ L, n }, k) =>
							`<a class="stop${ZIG[k % 4] > 0.5 ? " flip" : ""}" href="#l${n}" data-n="${n}" style="--k:${ZIG[k % 4]}">
								<span class="stone">${n}</span>
								<span class="txt"><b>${L.t}</b><small>${L.s}</small><span class="stars" aria-label="0 von 3 Sternen"><i>★</i><i>★</i><i>★</i></span></span></a>`
					)
					.join("")}</div></section>`
		).join("");
		const trails = () =>
			$$(".path", host).forEach((p) => {
				const box = p.getBoundingClientRect();
				const pts = $$(".stone", p).map((s) => {
					const r = s.getBoundingClientRect();
					return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
				});
				let d = `M${pts[0][0]} ${pts[0][1]}`;
				for (let i = 1; i < pts.length; i++) {
					const [x0, y0] = pts[i - 1];
					const [x1, y1] = pts[i];
					const my = (y0 + y1) / 2;
					d += ` C${x0} ${my} ${x1} ${my} ${x1} ${y1}`;
				}
				$("svg.trail path", p).setAttribute("d", d);
			});
		new ResizeObserver(trails).observe(host);
		document.fonts?.ready.then(trails);
	}

	function buildHero() {
		const h1 = $(".hero h1");
		const word = h1.textContent.trim();
		h1.setAttribute("aria-label", word);
		const cols = ["#2f7cf6", "#ff5d73", "#ffb020", "#1fbf7a", "#8b5cf6", "#2bb3ea", "#ff8a3d", "#ef6aa8", "#3fae5a", "#6f8cff"];
		h1.innerHTML = [...word]
			.map((ch, i) =>
				ch === " "
					? " "
					: `<span aria-hidden="true" style="--c:${cols[i % cols.length]};--r:${i % 2 ? 4 : -4}deg;--d:${i * -0.3}s">${ch}</span>`
			)
			.join("");
		const crew = $(".crew");
		[1, 3, 8, 9, 11, 15].forEach((n) => {
			const [name, color, hat] = LEVELS[n - 1].foe;
			crew.appendChild(buddy(color, hat, n % 2 ? "happy" : "smug", name));
		});
	}

	const BOTS = [
		["Spiegel", "#6f8cff", "🪞", 3900],
		["Elefant", "#9aa3b8", "🐘", 3300],
		["Lamm", "#e9e2ff", "🐑", 2400],
		["Hai", "#ff6b8a", "🦈", 1500],
		["Würfel", "#ffc23d", "🎲", 700],
	];
	function updateStars() {
		const total = totalStars();
		hudStars.textContent = `★ ${total} / ${LEVELS.length * 3}`;
		let nextSet = false;
		$$(".stop").forEach((stop) => {
			const n = Number(stop.dataset.n);
			const s = starsOf(n);
			$$(".stars i", stop).forEach((i, k) => i.classList.toggle("on", k < s));
			$(".stars", stop).setAttribute("aria-label", `${s} von 3 Sternen`);
			stop.classList.toggle("done", !!state.m[n]);
			const isNext = !nextSet && !state.m[n];
			if (isNext) nextSet = true;
			stop.classList.toggle("next", isNext);
		});
		const me = [(state.name || "Du").toUpperCase(), "#ffc23d", "😎", total * 100, true];
		const rows = [...BOTS.map((b) => [...b, false]), me].sort((a, b) => b[3] - a[3]);
		const list = $("#scoreList");
		list.innerHTML = "";
		rows.forEach((r, i) => {
			const li = document.createElement("li");
			if (r[4]) li.className = "me";
			li.innerHTML = `<span class="pl">${i + 1}.</span><span class="av"></span><span>${r[0]}</span><span class="pts">${r[3]}</span>`;
			$(".av", li).appendChild(buddy(r[1], r[2], r[4] ? "happy" : "neutral"));
			list.appendChild(li);
		});
	}

	function show(hash) {
		const m = /^#l(\d+)$/.exec(hash);
		const n = m ? Number(m[1]) : 0;
		const target = n ? $(`#l${n}`) : null;
		levels.forEach((sec) => (sec.hidden = sec !== target));
		selectView.hidden = !!target;
		if (target) {
			hudMid.textContent = `${WORLDS[LEVELS[n - 1].w].emo} Level ${n} · ${LEVELS[n - 1].t}`;
			document.title = `Level ${n}: ${LEVELS[n - 1].t} · Spieltheorie, Newbobb Lab`;
			if (!started[n] && inits[n]) {
				started[n] = true;
				inits[n](target, n);
			}
			window.scrollTo(0, 0);
			$("h2", target).focus({ preventScroll: true });
		} else {
			hudMid.textContent = "🏝️ Spielinsel";
			document.title = "Spieltheorie: die Spielinsel · Newbobb Lab";
			const anchor = hash && hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
			if (anchor) anchor.scrollIntoView();
			else window.scrollTo(0, 0);
		}
	}

	window.Arcade = { register, mission, matrix, fit, animate, toast, confetti, foe, buddy, pick, fmt, reduced, $, $$ };

	document.addEventListener("DOMContentLoaded", () => {
		buildHero();
		buildMap();
		buildHeads();
		updateStars();
		const input = $("#initials");
		input.value = state.name || "";
		input.addEventListener("input", () => {
			state.name = input.value.replace(/[^A-Za-zÄÖÜäöü]/g, "").slice(0, 3);
			input.value = state.name;
			save();
			updateStars();
		});
		$("#resetAll").addEventListener("click", () => {
			if (!confirm("Alle Sterne löschen und von vorn anfangen?")) return;
			state = { m: {}, b: {}, name: state.name };
			save();
			location.reload();
		});
		window.addEventListener("hashchange", () => show(location.hash));
		show(location.hash);
	});
})();
