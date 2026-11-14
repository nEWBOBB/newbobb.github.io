// Spielhalle Spieltheorie: Grundgerüst (Spielstand, Bots, Matrix, Level-Ablauf)
window.Arcade = (() => {
	"use strict";

	const KEY = "newbobb-spielhalle-v1";
	const TOTAL = 15;
	const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
	let state = { played: {}, done: {}, best: {} };
	try {
		const s = JSON.parse(localStorage.getItem(KEY));
		if (s) state = { played: s.played || {}, done: s.done || {}, best: s.best || {} };
	} catch (e) { /* ohne Speicher geht es auch */ }
	const save = () => {
		try {
			localStorage.setItem(KEY, JSON.stringify(state));
		} catch (e) { /* egal */ }
	};

	// ---------- kleine Helfer ----------
	function el(spec, props, ...kids) {
		const [tag, ...cls] = spec.split(".");
		const n = document.createElement(tag || "div");
		if (cls.length) n.className = cls.join(" ");
		if (props) {
			for (const [k, v] of Object.entries(props)) {
				if (k === "text") n.textContent = v;
				else if (k === "html") n.innerHTML = v;
				else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
				else if (v === true) n.setAttribute(k, "");
				else if (v !== false && v != null) n.setAttribute(k, v);
			}
		}
		for (const k of kids.flat()) if (k != null) n.append(k);
		return n;
	}
	const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
	const ri = (a, b) => Math.floor(rnd(a, b + 1));
	const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
	const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
	const fmt = (n) => (n < 0 ? "−" + -n : String(n));
	const pad = (n, w = 2) => String(n).padStart(w, "0");
	const komma = (x, d = 1) => x.toFixed(d).replace(".", ",");

	// ---------- die Bots ----------
	const BOTS = {
		logo: { name: "LOGO", color: "#9fd0ff", says: "Ich rechne alles durch. Gefühle sind Rundungsfehler.",
			px: ["...##...", ".######.", ".#o##o#.", ".######.", ".#kkkk#.", ".######.", "..#..#..", ".##..##."] },
		echo: { name: "ECHO", color: "#2ff3ff", says: "Wie du mir, so ich dir. Ich fange freundlich an.",
			px: [".#....#.", "..####..", ".######.", ".#o##o#.", ".######.", ".#k##k#.", "..#kk#..", "...##..."] },
		engel: { name: "ENGEL", color: "#ffe14d", says: "Ich bin immer nett. Zu jedem. Immer.",
			px: ["..aaaa..", "........", "..####..", ".#o##o#.", ".######.", ".#k##k#.", "..#kk#..", "..####.."] },
		hai: { name: "HAI", color: "#ff6b7d", says: "Ich nehme mir, was ich kriegen kann.",
			px: ["....#...", "...##...", ".######.", "#k####k#", "########", "#owowow#", ".######.", "..#..#.."] },
		groll: { name: "GROLL", color: "#b388ff", says: "Einmal betrogen, nie verziehen.",
			px: ["........", ".######.", "#k####k#", "##o##o##", "########", "##kkkk##", "#k####k#", ".######."] },
		wurf: { name: "WÜRFEL", color: "#5dff8f", says: "Ich würfle. Vielleicht. Oder auch nicht.",
			px: ["########", "#o####o#", "########", "###oo###", "###oo###", "########", "#o####o#", "########"] },
		pawlow: { name: "PAWLOW", color: "#ff9f43", says: "Lief es gut, mach ich weiter so. Sonst wechsle ich.",
			px: ["##....##", "##....##", ".######.", ".#o##o#.", ".######.", ".##kk##.", ".#k##k#.", "..####.."] },
		goenner: { name: "GÖNNER", color: "#ff8ad8", says: "Wie Echo, aber ich drücke öfter ein Auge zu.",
			px: ["..aaaa..", ".aaaaaa.", ".######.", ".#o##o#.", ".######.", ".#k##k#.", "..#kk#..", "...##..."] },
		kumpel: { name: "KUMPEL", color: "#7df9c1", says: "Wir sind ein Team. Hauptsache, wir machen dasselbe.",
			px: ["........", "..####..", ".######.", ".#o##o#.", ".######.", ".#kkkk#.", "..####..", ".#....#."] },
	};

	function sprite(id, size = 48) {
		const b = BOTS[id];
		const col = { "#": b.color, o: "#ffffff", w: "#ffffff", k: "#07041a", a: "#ffffff" };
		let r = "";
		b.px.forEach((row, y) => {
			[...row].forEach((ch, x) => {
				if (ch !== ".") r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${col[ch]}"/>`;
			});
		});
		const s = document.createElement("span");
		s.innerHTML = `<svg viewBox="0 0 8 8" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
		return s.firstChild;
	}

	// ---------- Gefangenendilemma: Punkte und Strategien ----------
	const PAY = { CC: [3, 3], CD: [0, 5], DC: [5, 0], DD: [1, 1] };
	const last = (a) => a[a.length - 1];
	const STRATS = {
		echo: (me, op) => (op.length ? last(op) : "C"),
		engel: () => "C",
		hai: () => "D",
		groll: (me, op) => (op.includes("D") ? "D" : "C"),
		wurf: () => (Math.random() < 0.5 ? "C" : "D"),
		pawlow: (me, op) => {
			if (!me.length) return "C";
			return last(op) === "C" ? last(me) : last(me) === "C" ? "D" : "C";
		},
		goenner: (me, op) => (op.length && last(op) === "D" && Math.random() > 0.33 ? "D" : "C"),
	};

	// ---------- Auszahlungsmatrix ----------
	// o: rows, cols, pay[r][c] = [du, bot], bot (Name), onRow, onCol, onCell, rowCls, colCls, cellCls, pressed
	function matrix(o) {
		const t = el("table.mx");
		const hr = el("tr", null, el("th", null, el("span.mx-corner", { html: `<span class="me">Du ↓</span><br><span class="op">${o.bot} →</span>` })));
		o.cols.forEach((c, j) => {
			const th = el("th", { scope: "col", class: o.colCls ? o.colCls(j) : "" });
			th.append(o.onCol
				? el("button", { type: "button", text: c, "aria-label": `Spalte ${c} von ${o.bot}`, onclick: () => o.onCol(j) })
				: el("span.op", { text: c }));
			hr.append(th);
		});
		t.append(el("thead", null, hr));
		const tb = el("tbody");
		o.rows.forEach((r, i) => {
			const tr = el("tr");
			const th = el("th", { scope: "row", class: o.rowCls ? o.rowCls(i) : "" });
			th.append(o.onRow
				? el("button", { type: "button", text: r, "aria-label": `Deine Zeile ${r}`, onclick: () => o.onRow(i) })
				: el("span.me", { text: r }));
			tr.append(th);
			o.cols.forEach((c, j) => {
				const [a, b] = o.pay[i][j];
				const td = el("td", { class: o.cellCls ? o.cellCls(i, j) : "" });
				const inner = `<span class="me">${fmt(a)}</span><span class="op">${fmt(b)}</span>`;
				td.append(o.onCell
					? el("button", { type: "button", html: inner, "aria-pressed": o.pressed && o.pressed(i, j) ? "true" : "false",
						"aria-label": `${r}, ${c}: du ${fmt(a)}, ${o.bot} ${fmt(b)}`, onclick: () => o.onCell(i, j) })
					: el("span", { html: inner }));
				tr.append(td);
			});
			tb.append(tr);
		});
		t.append(tb);
		return el("div.mx-wrap", null, t,
			el("p.mx-legend", { html: `In jedem Feld: <span class="me">deine Punkte</span> | <span class="op">Punkte von ${o.bot}</span>` }));
	}

	// Zugverlauf für das wiederholte Gefangenendilemma
	function history(n, botName) {
		const rows = [el("div", null, el("span", { text: "Du" })), el("div", null, el("span", { text: botName }))];
		rows.forEach((r) => {
			for (let k = 0; k < n; k++) r.append(el("i"));
		});
		const node = el("div.hist", null, rows);
		return {
			node,
			set(k, a, b) {
				[a, b].forEach((m, idx) => {
					const c = rows[idx].children[k + 1];
					c.className = m;
					c.textContent = m === "C" ? "🤝" : "🗡";
				});
			},
		};
	}

	// ---------- Level-Verwaltung ----------
	const levels = [];
	const HALLS = [["Halle 1 · Grundlagen", 1, 5], ["Halle 2 · Klassiker", 6, 10], ["Halle 3 · Profi-Liga", 11, 15]];
	const RANKS = [[0, "Münzeinwerfer"], [1500, "Flipper-Lehrling"], [4000, "Stammgast"], [7000, "Taktiker"], [10000, "Hallenmeister"], [12500, "Nash persönlich"]];
	const $ = (id) => document.getElementById(id);
	const total = () => Object.values(state.best).reduce((a, b) => a + b, 0);
	const doneCount = () => Object.keys(state.done).length;

	function hud() {
		$("hudLevel").textContent = `${doneCount()}/${TOTAL}`;
		$("hudScore").textContent = pad(total(), 5);
	}

	function renderLobby() {
		const grid = $("grid");
		grid.innerHTML = "";
		for (const [name, from, to] of HALLS) {
			const ul = el("ul.cabs");
			levels.filter((l) => l.id >= from && l.id <= to).forEach((l) => {
				const b = BOTS[l.bots[0]];
				ul.append(el("li", null, el("a", { href: `#level-${l.id}`, class: "cab" + (state.done[l.id] ? " done" : ""), style: `--c:${b.color}`,
					"aria-label": `Level ${l.id}: ${l.title}${state.done[l.id] ? ", geschafft" : ""}` },
				el("span.cab-no", { text: `LEVEL ${pad(l.id)}` }), sprite(l.bots[0], 56), el("b", { text: l.title }), el("small", { text: l.tag }),
				el("span.cab-score", { text: state.played[l.id] ? `★ ${pad(state.best[l.id] || 0, 4)}` : "NOCH NICHT GESPIELT" }))));
			});
			grid.append(el("h2", { text: name }), ul);
		}
		const list = $("boardList");
		list.innerHTML = "";
		levels.forEach((l) => {
			list.append(el("li", { class: state.done[l.id] ? "done" : state.played[l.id] ? "played" : "" },
				el("span", { text: pad(l.id) }), el("span.n", { text: l.title }), el("span", { text: pad(state.best[l.id] || 0, 4) }),
				el("span", { text: state.done[l.id] ? "✔" : "·", "aria-label": state.done[l.id] ? "geschafft" : "offen" })));
		});
		const t = total();
		const rank = [...RANKS].reverse().find((r) => t >= r[0])[1];
		$("boardRank").innerHTML = `${pad(t, 5)} PUNKTE<br>RANG: ${rank.toUpperCase()}`;
		const next = levels.find((l) => !state.done[l.id]) || levels[0];
		const sb = $("startBtn");
		sb.href = `#level-${next.id}`;
		sb.textContent = doneCount() === 0 && !Object.keys(state.played).length ? "▶ Münze einwerfen" : doneCount() === TOTAL ? "▶ Nochmal von vorn" : `▶ Weiter mit Level ${next.id}`;
		hud();
	}

	function botCard(id) {
		const b = BOTS[id];
		return el("div.bot", { style: `--c:${b.color}` }, sprite(id, 44), el("div", null, el("b", { text: b.name }), el("span", { text: b.says })));
	}

	function open(id) {
		const L = levels.find((l) => l.id === id);
		const stage = $("stage");
		if (!L) return lobby();
		document.body.dataset.view = "level";
		document.title = `Level ${id}: ${L.title} — Spielhalle Spieltheorie`;
		stage.innerHTML = "";
		const memo = {};
		const title = el("h2", { text: L.title, tabindex: "-1" });
		const gameRoot = el("div.crt-in");
		const result = el("div.result", { "aria-live": "polite" });
		const after = el("div");

		function mountGame() {
			gameRoot.innerHTML = "";
			result.innerHTML = "";
			L.play({ root: gameRoot, memo, finish });
		}

		function finish(points, html) {
			points = Math.max(0, Math.round(points));
			const rec = points > (state.best[id] || 0);
			const first = !state.played[id];
			state.played[id] = true;
			if (rec) state.best[id] = points;
			save();
			hud();
			result.innerHTML = "";
			result.append(el("div.result-box", null,
				el("p.pts", { text: `+${points} PUNKTE${rec && !first ? " · NEUER REKORD" : ""}` }),
				el("div", { html: html || "" }),
				el("button.btn", { type: "button", text: "↺ Nochmal spielen", onclick: () => { mountGame(); gameRoot.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }); } })));
			if (first) renderAfter();
		}

		function renderAfter() {
			after.innerHTML = "";
			if (!state.played[id]) {
				after.append(el("div.locked", null, el("b", { text: "🔒 STRATEGIE AUFGEDECKT" }),
					"Spiel erst einmal bis zum Ende. Danach zeige ich dir, was hinter dem Spiel steckt, und der Bosskampf wird freigeschaltet."));
				return;
			}
			const rev = el("div", { html: L.reveal });
			after.append(el("section.reveal", null, el("h3", { text: "STRATEGIE AUFGEDECKT" }), rev));
			if (L.after) L.after(rev);
			const fb = el("p.quiz-fb", { "aria-live": "polite" });
			const clearBox = el("div");
			const opts = el("div.quiz-opts");
			L.quiz.a.forEach(([text, why, ok]) => {
				const b = el("button.btn", { type: "button", text });
				b.addEventListener("click", () => {
					if (ok) {
						[...opts.children].forEach((x) => (x.disabled = true));
						b.classList.add("ok");
						fb.innerHTML = `<span class="good">Richtig.</span> ${why}`;
						state.done[id] = true;
						save();
						hud();
						showClear(clearBox, true);
					} else {
						b.classList.add("no");
						b.disabled = true;
						fb.innerHTML = `<span class="bad">Nicht ganz.</span> ${why}`;
					}
				});
				opts.append(b);
			});
			after.append(el("section.quiz", null, el("h3", { text: "BOSSKAMPF" }), el("p.quiz-q", { html: L.quiz.q }), opts, fb), clearBox);
			if (state.done[id]) showClear(clearBox, false);
		}

		function showClear(box, fresh) {
			box.innerHTML = "";
			const nxt = levels.find((l) => l.id === id + 1);
			box.append(el("div.clear", null,
				el("b", { text: id === TOTAL ? "★ DURCHGESPIELT ★" : "★ LEVEL CLEAR ★" }),
				nxt ? el("a.btn.primary", { href: `#level-${nxt.id}`, text: `Weiter zu Level ${nxt.id}: ${nxt.title} →` })
					: el("a.btn.primary", { href: "#halle", text: "Zur Highscore-Tafel →" })));
			if (fresh) box.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
		}

		stage.append(
			el("header.lv-head", null, el("a.back", { href: "#halle", text: "← Alle Level" }),
				el("p.lv-no", { text: `LEVEL ${pad(id)} / ${TOTAL}` }), title, el("p.lv-tag", { text: L.tag })),
			el("div.cast", null, L.bots.map(botCard)),
			el("div.lv-intro", { html: L.intro }),
			el("div.crt", null, gameRoot), result, after,
			el("nav.lv-nav", { "aria-label": "Level wechseln" },
				id > 1 ? el("a", { href: `#level-${id - 1}`, text: `← Level ${id - 1}` }) : el("span"),
				id < TOTAL ? el("a", { href: `#level-${id + 1}`, text: `Level ${id + 1} →` }) : el("span")));
		mountGame();
		renderAfter();
		window.scrollTo(0, 0);
		title.focus({ preventScroll: true });
	}

	function lobby() {
		document.body.dataset.view = "lobby";
		document.title = "Spielhalle Spieltheorie — Newbobb Lab";
		$("stage").innerHTML = "";
		renderLobby();
	}

	function route() {
		const m = /^#level-(\d+)$/.exec(location.hash);
		if (m) return open(+m[1]);
		lobby();
		if (location.hash === "#halle") $("halle").scrollIntoView();
		else window.scrollTo(0, 0);
	}

	function start() {
		levels.sort((a, b) => a.id - b.id);
		$("resetBtn").addEventListener("click", () => {
			if (!confirm("Wirklich alle Punkte und geschafften Level löschen?")) return;
			state = { played: {}, done: {}, best: {} };
			save();
			renderLobby();
		});
		window.addEventListener("hashchange", route);
		route();
	}

	return { add: (l) => levels.push(l), start, el, rnd, ri, pick, clamp, fmt, pad, komma, sprite, matrix, history, BOTS, PAY, STRATS, reduce };
})();
