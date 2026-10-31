// Spielhalle der Spieltheorie: Levelauswahl, Navigation, Sterne, Boss-Fragen und gemeinsame Bausteine.
// Die Level selbst stehen in levels-a/b/c.js und melden sich mit Arcade.register(n, init) an.

(() => {
	const KEY = "newbobb-spielhalle-v1";
	const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

	const LEVELS = [
		{ t: "Schere, Stein, Papier", s: "Was ist ein Spiel?", w: 0 },
		{ t: "Der Strand-Kiosk", s: "Die Auszahlungsmatrix", w: 0 },
		{ t: "Flucht vor dem Piraten", s: "Dominante Strategie", w: 0 },
		{ t: "Der Konzert-Kalender", s: "Nash-Gleichgewicht", w: 0 },
		{ t: "Das Verhör", s: "Gefangenendilemma", w: 1 },
		{ t: "Wer ist der Bot?", s: "Wiederholte Spiele", w: 1 },
		{ t: "Die Hirschjagd", s: "Koordination und Vertrauen", w: 1 },
		{ t: "Mutprobe auf der Straße", s: "Feigling-Spiel und Selbstbindung", w: 1 },
		{ t: "Elfmeter", s: "Gemischte Strategien", w: 2 },
		{ t: "Die letzte Münze", s: "Rückwärts denken", w: 2 },
		{ t: "Der Platzhirsch", s: "Drohungen und Versprechen", w: 2 },
		{ t: "Die stille Auktion", s: "Auktionen", w: 2 },
		{ t: "Zehn Münzen teilen", s: "Ultimatum und Fairness", w: 3 },
		{ t: "Haie, Lämmer, Spiegel", s: "Evolution der Kooperation", w: 3 },
		{ t: "Lange Spiele", s: "Lange Spiele mit langen Partnern", w: 3 },
	];
	const WORLDS = [
		{ name: "Welt 1 · Die Regeln", desc: "Was ein Spiel ist und wie man es aufschreibt." },
		{ name: "Welt 2 · Dilemmas", desc: "Wenn kluge Einzelne gemeinsam schlecht dastehen und wie man rauskommt." },
		{ name: "Welt 3 · Taktik", desc: "Mischen, vorausdenken, drohen und bieten." },
		{ name: "Welt 4 · Gesellschaft", desc: "Fairness, Evolution und die Spiele, die ein Leben lang dauern." },
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

	const toastEl = document.createElement("div");
	toastEl.className = "toast";
	toastEl.setAttribute("role", "status");
	document.body.appendChild(toastEl);
	let toastT = 0;
	function toast(msg) {
		toastEl.textContent = msg;
		toastEl.classList.add("show");
		clearTimeout(toastT);
		toastT = setTimeout(() => toastEl.classList.remove("show"), 2600);
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
	function matrix(host, o) {
		const R = o.rows.length;
		const C = o.cols.length;
		host.classList.add("matrix");
		host.innerHTML = `
			<div class="mx-legend"><span><b class="you">${o.youName || "Du"}</b> wählst die Zeile, linke Zahl</span>
				<span><b class="opp">${o.oppName || "Bot"}</b> wählt die Spalte, rechte Zahl</span></div>
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
				const strip = (t) => t.replace(/&shy;/g, "");
				const label = `${o.youName || "Du"} ${strip(r)}, ${o.oppName || "Bot"} ${strip(o.cols[j])}: ${a} für dich, ${b} für ${o.oppName || "den Bot"}`;
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
				cells().forEach((x) => x.classList.remove("hit", "best-you", "best-opp", "nash", "dim"));
				$$("button.mx-col", grid).forEach((b) => b.setAttribute("aria-pressed", "false"));
				seen.clear();
			},
		};
	}
	const fmtPay = (v) => (v < 0 ? `−${-v}` : String(v));

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
		toast(msg || "Mission geschafft! +1 ★  Jetzt: Strategie aufdecken");
	}

	// Boss-Fragen: richtig beim ersten Versuch 2 Sterne, später 1 Stern
	function setupBoss(sec, n) {
		const boss = $(".boss", sec);
		if (!boss) return;
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
					toast(misses ? "Boss besiegt! +1 ★" : "Boss besiegt beim ersten Versuch! +2 ★");
				} else {
					misses++;
					b.classList.add("wrong");
					b.disabled = true;
					why.textContent = `Daneben. ${boss.dataset.hint || "Lies noch mal im aufgedeckten Teil nach."}`;
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
			const head = document.createElement("header");
			head.className = "lv-head";
			head.innerHTML = `<p class="px">Level ${pad2(n)} · ${WORLDS[L.w].name}</p>
				<h2 tabindex="-1">${L.t}</h2><p class="lv-sub">${L.s}</p>`;
			sec.prepend(head);
			const nav = document.createElement("nav");
			nav.className = "lv-nav";
			nav.setAttribute("aria-label", "Level wechseln");
			nav.innerHTML =
				(n > 1 ? `<a class="btn" href="#l${n - 1}">◀ Level ${pad2(n - 1)}</a>` : `<span></span>`) +
				`<a class="btn" href="#start">Levelauswahl</a>` +
				(n < LEVELS.length ? `<a class="btn you" href="#l${n + 1}">Level ${pad2(n + 1)} ▶</a>` : `<a class="btn you" href="#highscore">Highscore ▶</a>`);
			sec.appendChild(nav);
			setupBoss(sec, n);
			if (state.m[n]) {
				$(".mission", sec)?.classList.add("done");
			}
		});
	}

	function buildSelect() {
		const host = $("#cabs");
		host.innerHTML = WORLDS.map(
			(w, wi) => `<section class="world" aria-labelledby="w${wi}"><h2 id="w${wi}">${w.name}</h2><p>${w.desc}</p>
			<div class="cabs">${LEVELS.map((L, i) => ({ L, n: i + 1 }))
				.filter((x) => x.L.w === wi)
				.map(
					({ L, n }) =>
						`<a class="cab" href="#l${n}" data-n="${n}"><span class="cab-n">Level ${pad2(n)}</span><b>${L.t}</b><small>${L.s}</small><span class="cab-stars" aria-label="0 von 3 Sternen"><i>★</i><i>★</i><i>★</i></span></a>`
				)
				.join("")}</div></section>`
		).join("");
	}

	const BOTS = [
		["SPG", "Spiegel", 3900],
		["ELE", "Elefant", 3300],
		["LAM", "Lamm", 2400],
		["HAI", "Hai", 1500],
		["WÜR", "Würfel", 700],
	];
	function updateStars() {
		const total = totalStars();
		hudStars.textContent = `★ ${total}/${LEVELS.length * 3}`;
		$$(".cab").forEach((cab) => {
			const n = Number(cab.dataset.n);
			const s = starsOf(n);
			$$(".cab-stars i", cab).forEach((i, k) => i.classList.toggle("on", k < s));
			$(".cab-stars", cab).setAttribute("aria-label", `${s} von 3 Sternen`);
			cab.classList.toggle("is-clear", s > 0 && !!state.m[n] && !!state.b[n]);
		});
		const me = [(state.name || "DU").toUpperCase(), "Du", total * 100, true];
		const rows = [...BOTS.map((b) => [...b, false]), me].sort((a, b) => b[2] - a[2]);
		$("#scoreList").innerHTML = rows
			.map(
				(r, i) =>
					`<li${r[3] ? ' class="me"' : ""}><span>${i + 1}.</span><span>${r[0]}${r[3] ? "" : ` <small>(${r[1]})</small>`}</span><span>${String(r[2]).padStart(5, "0")}</span></li>`
			)
			.join("");
	}

	function show(hash) {
		const m = /^#l(\d+)$/.exec(hash);
		const n = m ? Number(m[1]) : 0;
		const target = n ? $(`#l${n}`) : null;
		levels.forEach((sec) => (sec.hidden = sec !== target));
		selectView.hidden = !!target;
		if (target) {
			hudMid.textContent = `Level ${pad2(n)} · ${LEVELS[n - 1].s}`;
			document.title = `Level ${n}: ${LEVELS[n - 1].t} · Spieltheorie, Newbobb Lab`;
			if (!started[n] && inits[n]) {
				started[n] = true;
				inits[n](target, n);
			}
			window.scrollTo(0, 0);
			$("h2", target).focus({ preventScroll: true });
		} else {
			hudMid.textContent = "Spielhalle";
			document.title = "Spieltheorie: die Spielhalle · Newbobb Lab";
			const anchor = hash && hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
			if (anchor) anchor.scrollIntoView();
			else window.scrollTo(0, 0);
		}
	}

	window.Arcade = { register, mission, matrix, fit, animate, toast, pick, fmt, reduced, $, $$ };

	document.addEventListener("DOMContentLoaded", () => {
		buildSelect();
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
