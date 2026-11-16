// Der Baukasten: Gerüst für alle Stufen des Chemie-Kurses.
// Eine Stufe ist ein Objekt mit titel, kachel, frage, bau(api), warum, merke, quiz und optional formel, mehr.
// bau(api) baut den Stecktisch in api.feld und ruft api.fertig(text), sobald alle Aufträge erfüllt sind.
(() => {
	"use strict";

	const KEY = "newbobb-baukasten-v1";
	let stand = { b: {}, p: {} };
	try {
		const s = JSON.parse(localStorage.getItem(KEY));
		if (s && s.b && s.p) stand = s;
	} catch { /* ohne Speicher geht es auch */ }
	const sichern = () => {
		try { localStorage.setItem(KEY, JSON.stringify(stand)); } catch { /* egal */ }
	};

	const RUHIG = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const NS = "http://www.w3.org/2000/svg";

	const setze = (e, a) => {
		for (const k in a) {
			const v = a[k];
			if (v == null || v === false) continue;
			if (k === "class") e.setAttribute("class", v);
			else if (k === "html") e.innerHTML = v;
			else if (k === "text") e.textContent = v;
			else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
			else e.setAttribute(k, v === true ? "" : v);
		}
	};
	const fuege = (e, kinder) => {
		for (const k of kinder.flat(3)) {
			if (k == null || k === false) continue;
			e.appendChild(typeof k === "object" ? k : document.createTextNode(String(k)));
		}
		return e;
	};
	const h = (tag, a = {}, ...kinder) => {
		const e = document.createElement(tag);
		setze(e, a);
		return fuege(e, kinder);
	};
	const sv = (tag, a = {}, ...kinder) => {
		const e = document.createElementNS(NS, tag);
		setze(e, a);
		return fuege(e, kinder);
	};
	const komma = (x, n = 1) => x.toFixed(n).replace(".", ",").replace("-", "−");
	const minus = (x) => String(x).replace("-", "−");

	// Formel als HTML: H2O → H₂O, Mg^2+ → Mg²⁺
	const f = (s) => s.replace(/([A-Za-z)])(\d+)/g, "$1<sub>$2</sub>").replace(/\^(\d*[+−-])/g, "<sup>$1</sup>").replace(/-(?=<\/sup>)/g, "−");

	// ---------- Elemente: Name, Kugelfarbe, Schriftfarbe, Bindungshände ----------
	const E = {
		H: ["Wasserstoff", "#fbfaf4", "#17150f", 1],
		He: ["Helium", "#f7c6d9", "#17150f", 0],
		Li: ["Lithium", "#b54fb0", "#fff", 1],
		Be: ["Beryllium", "#5a8f3c", "#fff", 2],
		B: ["Bor", "#e9a07a", "#17150f", 3],
		C: ["Kohlenstoff", "#26262b", "#fff", 4],
		N: ["Stickstoff", "#2449c9", "#fff", 3],
		O: ["Sauerstoff", "#dd3220", "#fff", 2],
		F: ["Fluor", "#9bd84a", "#17150f", 1],
		Ne: ["Neon", "#ff9d6e", "#17150f", 0],
		Na: ["Natrium", "#7a45c9", "#fff", 1],
		Mg: ["Magnesium", "#0f8f72", "#fff", 2],
		Al: ["Aluminium", "#aab3bb", "#17150f", 3],
		Si: ["Silicium", "#a58b5a", "#17150f", 4],
		P: ["Phosphor", "#f08a1c", "#17150f", 3],
		S: ["Schwefel", "#f4c600", "#17150f", 2],
		Cl: ["Chlor", "#198a45", "#fff", 1],
		Ar: ["Argon", "#8fd3e8", "#17150f", 0],
		K: ["Kalium", "#9a3fb5", "#fff", 1],
		Ca: ["Calcium", "#6f7f2a", "#fff", 2],
		Fe: ["Eisen", "#b8531b", "#fff", 3],
		Cu: ["Kupfer", "#c0703a", "#17150f", 2],
		Zn: ["Zink", "#7c8ea3", "#17150f", 2],
		Ag: ["Silber", "#d3d8dc", "#17150f", 1],
	};
	const REIHE = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca"];
	const FUND = [
		"das häufigste Element im Weltall",
		"trägt Ballons und reagiert mit nichts",
		"das leichteste Metall, es steckt in deinem Akku",
		"gibt dem Smaragd sein Gerüst",
		"macht Glas hitzefest",
		"Diamant und Bleistiftmine zugleich",
		"vier Fünftel der Luft",
		"ein Fünftel der Luft, ohne ihn brennt nichts",
		"das Element, das am heftigsten reagiert",
		"leuchtet rot in Reklameröhren",
		"weich wie Butter und die Hälfte vom Kochsalz",
		"brennt gleißend weiß und sitzt mitten im Blattgrün",
		"das häufigste Metall der Erdkruste",
		"Sand und Computerchips",
		"sitzt in der Reibfläche der Streichholzschachtel und in deiner DNA",
		"gelb, und mit Wasserstoff riecht er nach faulen Eiern",
	];
	const GRUPPEN = { 1: "Stoffe und Atome", 2: "Bindungen", 3: "Reaktionen", 4: "Stoffklassen" };

	const kugel = (sym, cls = "") => h("span", { class: "kugel " + cls, style: `--k:${E[sym][1]};--kt:${E[sym][2]}`, text: sym });
	// Kleines Molekülbild aus Kugeln: mol("H O H")
	const mol = (spec, cls = "") => h("span", { class: "mol " + cls, "aria-hidden": "true" }, spec.split(" ").map((s) => kugel(s, s === "H" ? "kl" : "")));
	// Kugel im SVG
	const ball = (sym, x, y, r, extra = {}) => sv("g", { transform: `translate(${x} ${y})`, ...extra },
		sv("circle", { r, fill: E[sym][1], stroke: "#17150f", "stroke-width": 2 }),
		sv("circle", { cx: -r * 0.32, cy: -r * 0.36, r: r * 0.22, fill: "#fff", opacity: 0.55 }),
		sv("text", { y: r * 0.36, "text-anchor": "middle", "font-size": r * 0.95, "font-weight": 700, fill: E[sym][2], text: sym }));

	// ---------- Bedienteile ----------
	const knopf = (text, bei, cls = "") => h("button", { type: "button", class: "knopf " + cls, html: text, onclick: bei });

	// Schieberegler. Liefert { el, wert(), setze(v) }.
	function regler(o) {
		const aus = h("output");
		const inp = h("input", { type: "range", min: o.min, max: o.max, step: o.step || 1, value: o.wert, "aria-label": o.name });
		const zeig = () => { aus.textContent = o.zeige ? o.zeige(Number(inp.value)) : inp.value; };
		inp.addEventListener("input", () => { zeig(); o.bei && o.bei(Number(inp.value)); });
		zeig();
		return {
			el: h("label", { class: "regler" }, h("span", { class: "regler-kopf" }, h("span", { text: o.name }), aus), inp),
			wert: () => Number(inp.value),
			setze(v) { inp.value = v; zeig(); },
		};
	}

	// Auswahl aus mehreren Knöpfen. optionen: [[wert, html], …]. Liefert { el, wert(), setze(w), knoepfe }.
	function wahl(name, optionen, start, bei) {
		let w = start;
		const knoepfe = optionen.map(([wert, html]) => h("button", {
			type: "button", html, "aria-pressed": String(wert === w),
			onclick: () => { r.setze(wert); bei && bei(wert); },
		}));
		const r = {
			el: h("div", { class: "wahl", role: "group", "aria-label": name }, h("span", { class: "wahl-name", text: name }), h("div", { class: "wahl-reihe" }, knoepfe)),
			knoepfe,
			wert: () => w,
			setze(neu) { w = neu; knoepfe.forEach((k, i) => k.setAttribute("aria-pressed", String(optionen[i][0] === w))); },
		};
		return r;
	}

	// Zähler mit Minus und Plus. Liefert { el, wert(), setze(v) }.
	function zaehler(name, start, min, max, bei) {
		let w = start;
		const aus = h("output", { text: w });
		const klar = name.replace(/<[^>]+>/g, "");
		const mk = (d, z) => h("button", { type: "button", "aria-label": `${klar} ${d > 0 ? "mehr" : "weniger"}`, text: z, onclick: () => { r.setze(w + d); bei && bei(w); } });
		const a = mk(-1, "−");
		const b = mk(1, "+");
		const r = {
			el: h("div", { class: "zaehler" }, h("span", { class: "zaehler-name", html: name }), h("div", { class: "zaehler-teil" }, a, aus, b)),
			wert: () => w,
			setze(v) { w = Math.max(min, Math.min(max, v)); aus.textContent = w; a.disabled = w <= min; b.disabled = w >= max; },
		};
		r.setze(w);
		return r;
	}

	// Leinwand mit fester Rechengröße, skaliert per CSS.
	function leinwand(w, hoehe, name) {
		const c = h("canvas", { width: w * 2, height: hoehe * 2, class: "leinwand", role: "img", "aria-label": name, style: `aspect-ratio:${w}/${hoehe}` });
		const ctx = c.getContext("2d");
		ctx.scale(2, 2);
		return { el: c, ctx, w, h: hoehe };
	}

	// ---------- Der Stecker: Atome mit freien Händen zu Molekülen verbinden ----------
	function stecker(api, o) {
		const W = 340, H = 250, MAX = o.max || 12;
		let atome = [], bindungen = [], gewaehlt = null, nr = 0;
		const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, class: "bild stecker", role: "group", "aria-label": "Stecktisch für Moleküle" });
		const zeile = h("p", { class: "ablese", "aria-live": "polite" });
		const frei = (a) => E[a.e][3] - bindungen.reduce((s, b) => s + (b.a === a.id || b.b === a.id ? b.n : 0), 0);
		const finde = (id) => atome.find((a) => a.id === id);

		function ordne() {
			for (let it = 0; it < 220; it++) {
				for (const a of atome) { a.fx = (W / 2 - a.x) * 0.012; a.fy = (H / 2 - a.y) * 0.016; }
				for (let i = 0; i < atome.length; i++) for (let j = i + 1; j < atome.length; j++) {
					const a = atome[i], b = atome[j];
					let dx = b.x - a.x, dy = b.y - a.y;
					const d = Math.max(4, Math.hypot(dx, dy));
					const k = 700 / (d * d);
					dx /= d; dy /= d;
					a.fx -= dx * k; a.fy -= dy * k; b.fx += dx * k; b.fy += dy * k;
				}
				for (const b of bindungen) {
					const p = finde(b.a), q = finde(b.b);
					const soll = p.e === "H" || q.e === "H" ? 36 : 50;
					const dx = q.x - p.x, dy = q.y - p.y, d = Math.max(1, Math.hypot(dx, dy));
					const k = (d - soll) * 0.12;
					p.fx += (dx / d) * k; p.fy += (dy / d) * k; q.fx -= (dx / d) * k; q.fy -= (dy / d) * k;
				}
				for (const a of atome) {
					a.x = Math.max(22, Math.min(W - 22, a.x + Math.max(-6, Math.min(6, a.fx))));
					a.y = Math.max(22, Math.min(H - 22, a.y + Math.max(-6, Math.min(6, a.fy))));
				}
			}
		}

		function info() {
			const zahl = {};
			atome.forEach((a) => { zahl[a.e] = (zahl[a.e] || 0) + 1; });
			const ordnung = Object.keys(zahl).sort((x, y) => (zahl.C ? (x === "C" ? -2 : x === "H" ? -1 : 0) - (y === "C" ? -2 : y === "H" ? -1 : 0) : 0) || x.localeCompare(y));
			const formel = ordnung.map((e) => e + (zahl[e] > 1 ? zahl[e] : "")).join("");
			const nachbarn = {};
			atome.forEach((a) => { nachbarn[a.id] = []; });
			bindungen.forEach((b) => { nachbarn[b.a].push({ zu: finde(b.b), n: b.n }); nachbarn[b.b].push({ zu: finde(b.a), n: b.n }); });
			const gesehen = new Set();
			const lauf = (id) => { if (gesehen.has(id)) return; gesehen.add(id); nachbarn[id].forEach((x) => lauf(x.zu.id)); };
			if (atome.length) lauf(atome[0].id);
			const offen = atome.reduce((s, a) => s + frei(a), 0);
			const ganz = gesehen.size === atome.length;
			return { atome, bindungen, zahl, formel, nachbarn, offen, ganz, fertig: atome.length > 1 && ganz && offen === 0, maxBindung: Math.max(0, ...bindungen.map((b) => b.n)) };
		}

		function tippe(a) {
			if (gewaehlt == null) gewaehlt = a.id;
			else if (gewaehlt === a.id) gewaehlt = null;
			else {
				const p = finde(gewaehlt);
				if (frei(p) < 1 || frei(a) < 1) {
					api.sag(`${E[frei(p) < 1 ? p.e : a.e][0]} hat keine Hand mehr frei.`, "warn");
				} else {
					const b = bindungen.find((x) => (x.a === p.id && x.b === a.id) || (x.a === a.id && x.b === p.id));
					if (b) b.n++; else bindungen.push({ a: p.id, b: a.id, n: 1 });
					api.sag("");
				}
				gewaehlt = null;
			}
			neu();
		}

		function male() {
			svg.replaceChildren();
			for (const b of bindungen) {
				const p = finde(b.a), q = finde(b.b);
				const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
				const nx = -dy / d, ny = dx / d;
				for (let i = 0; i < b.n; i++) {
					const v = (i - (b.n - 1) / 2) * 6;
					svg.appendChild(sv("line", { x1: p.x + nx * v, y1: p.y + ny * v, x2: q.x + nx * v, y2: q.y + ny * v, stroke: "#17150f", "stroke-width": 3.5, "stroke-linecap": "round" }));
				}
				svg.appendChild(sv("line", {
					x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: "transparent", "stroke-width": 18, class: "st-bindung",
					onclick: () => { b.n--; if (b.n < 1) bindungen = bindungen.filter((x) => x !== b); gewaehlt = null; neu(); },
				}));
			}
			for (const a of atome) {
				const r = a.e === "H" ? 13 : 18, fr = frei(a);
				const g = ball(a.e, a.x, a.y, r, {
					class: "st-atom" + (gewaehlt === a.id ? " an" : ""), tabindex: 0, role: "button",
					"aria-label": `${E[a.e][0]}, ${fr} freie ${fr === 1 ? "Hand" : "Hände"}${gewaehlt === a.id ? ", ausgewählt" : ""}`,
					onclick: () => tippe(a),
					onkeydown: (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); tippe(a); const z = svg.querySelector(`[data-id="${a.id}"]`); z && z.focus(); } },
					"data-id": a.id,
				});
				if (gewaehlt === a.id) g.insertBefore(sv("circle", { r: r + 5, fill: "none", stroke: "#17150f", "stroke-width": 2.5, "stroke-dasharray": "4 4" }), g.firstChild);
				for (let i = 0; i < fr; i++) {
					const w = -Math.PI / 2 + (i * Math.PI * 2) / Math.max(fr, 3) + a.id;
					g.appendChild(sv("circle", { cx: Math.cos(w) * (r + 6), cy: Math.sin(w) * (r + 6), r: 3.2, fill: "#fff", stroke: "#17150f", "stroke-width": 1.6 }));
				}
				svg.appendChild(g);
			}
			if (!atome.length) svg.appendChild(sv("text", { x: W / 2, y: H / 2, "text-anchor": "middle", class: "st-leer", text: "Tippe unten auf eine Kugel." }));
		}

		function neu() {
			ordne();
			male();
			const i = info();
			weg.disabled = gewaehlt == null;
			if (auf) auf.disabled = !i.offen || !atome.length;
			let t = "";
			if (atome.length) {
				const n = i.fertig && o.name ? o.name(i) : null;
				t = `<b>${f(n && n.formel ? n.formel : i.formel)}</b> · `;
				if (i.fertig) t += `<span class="gut">alle Hände belegt</span>${n ? ` · <b>${n.name}</b>${n.zusatz ? ` · ${n.zusatz}` : ""}` : " · steht nicht in unserer Liste"}`;
				else if (i.offen) t += `noch ${i.offen} freie ${i.offen === 1 ? "Hand" : "Hände"}`;
				else t += "das sind mehrere einzelne Teile";
			}
			zeile.innerHTML = t;
			o.bei && o.bei(i);
		}

		function dazu(e, an) {
			if (atome.length >= MAX) return api.sag(`Mehr als ${MAX} Kugeln passen nicht auf den Tisch.`, "warn");
			const w = Math.random() * 6.28;
			const a = { id: ++nr, e, x: (an ? an.x : W / 2) + Math.cos(w) * 30, y: (an ? an.y : H / 2) + Math.sin(w) * 30 };
			atome.push(a);
			return a;
		}

		const weg = knopf("Gewählte Kugel weglegen", () => {
			atome = atome.filter((a) => a.id !== gewaehlt);
			bindungen = bindungen.filter((b) => b.a !== gewaehlt && b.b !== gewaehlt);
			gewaehlt = null;
			neu();
		});
		const auf = o.fuellen ? knopf("Freie Hände mit H füllen", () => {
			for (const a of atome.slice()) {
				for (let n = frei(a); n > 0 && a.e !== "H"; n--) {
					const x = dazu("H", a);
					if (!x) break;
					bindungen.push({ a: a.id, b: x.id, n: 1 });
				}
			}
			gewaehlt = null;
			neu();
		}) : null;
		const kasten = h("div", { class: "kasten", role: "group", "aria-label": "Kugeln im Kasten" },
			o.atome.map((e) => h("button", { type: "button", class: "kasten-fach", "aria-label": `${E[e][0]} auf den Tisch legen`, onclick: () => { dazu(e); neu(); } },
				kugel(e), h("span", { html: `${E[e][0]}<small>${E[e][3]} ${E[e][3] === 1 ? "Hand" : "Hände"}</small>` }))));
		api.feld.append(svg, zeile, kasten, h("div", { class: "knopf-reihe" }, auf, weg, knopf("Tisch abräumen", () => { atome = []; bindungen = []; gewaehlt = null; neu(); })),
			h("p", { class: "hinweis", text: "Tippe erst eine Kugel an, dann eine zweite: Sie geben sich die Hand. Noch einmal dasselbe Paar ergibt eine Doppelbindung. Ein Tipp auf den Strich löst die Bindung wieder." }));
		neu();
		return { info };
	}

	// ---------- Seiten ----------
	const stufen = [];
	const titelseite = document.getElementById("titelseite");
	const blatt = document.getElementById("stufe");
	let aufraeumen = [];

	function raeume() {
		aufraeumen.forEach((x) => x());
		aufraeumen = [];
	}

	const ORT = [[1, 1], [1, 8], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6]];

	function kachel(i, gross) {
		const s = stufen[i];
		const z = stand.p[i] ? "geprueft" : stand.b[i] ? "gebaut" : "leer";
		const innen = [h("span", { class: "k-nr", text: i + 1 }), h("span", { class: "k-sym", text: REIHE[i] }), h("span", { class: "k-name", text: gross ? E[REIHE[i]][0] : s.kachel })];
		if (gross) return h("div", { class: "kachel gross", "data-g": s.g, "data-z": z, "aria-hidden": "true" }, innen);
		return h("a", {
			class: "kachel", href: `#s-${i + 1}`, "data-g": s.g, "data-z": z, style: `--r:${ORT[i][0]};--c:${ORT[i][1]}`,
			"aria-label": `Stufe ${i + 1}: ${s.titel}. ${z === "geprueft" ? "Element gesammelt" : z === "gebaut" ? "gebaut, Probe offen" : "noch offen"}`,
		}, innen, z === "geprueft" ? h("span", { class: "k-ok", text: "✓" }) : null);
	}

	function zeigeTafel() {
		const t = document.getElementById("tafel");
		t.replaceChildren(...stufen.map((s, i) => kachel(i)),
			h("div", { class: "kachel frei", style: "--r:3;--c:7", "aria-hidden": "true" }, h("span", { class: "k-nr", text: 17 }), h("span", { class: "k-sym", text: "Cl" })),
			h("div", { class: "kachel frei", style: "--r:3;--c:8", "aria-hidden": "true" }, h("span", { class: "k-nr", text: 18 }), h("span", { class: "k-sym", text: "Ar" })));
		const n = stufen.filter((s, i) => stand.p[i]).length;
		document.querySelector(".zaehlwerk").textContent = `${n} / ${stufen.length} Elemente`;
		document.getElementById("voll").hidden = n < stufen.length;
		const weiter = stufen.findIndex((s, i) => !stand.p[i]);
		const los = document.getElementById("los");
		if (weiter >= 0) {
			los.hidden = false;
			los.href = `#s-${weiter + 1}`;
			los.textContent = n || stand.b[0] ? `Weiter mit Stufe ${weiter + 1}: ${stufen[weiter].titel}` : "Mit Stufe 1 anfangen";
		} else los.hidden = true;
	}

	function zeigeStufe(i) {
		const s = stufen[i];
		const feld = h("div", { class: "feld" });
		const liste = h("ol", { class: "auftraege" });
		const sag = h("p", { class: "sag", "aria-live": "polite" });
		const geschafft = h("p", { class: "geschafft", hidden: true });
		const etikett = h("section", { class: "etikett", hidden: true });
		const probe = h("section", { class: "probe", hidden: true });

		const api = {
			feld, h, sv,
			sag(html, art) { sag.innerHTML = html || ""; sag.dataset.art = art || ""; },
			spaeter(fn, ms) { const t = setTimeout(fn, ms); aufraeumen.push(() => clearTimeout(t)); return t; },
			takt(fn) {
				let id, alt = performance.now(), an = true;
				const lauf = (t) => { if (!an) return; const dt = Math.min(0.05, (t - alt) / 1000); alt = t; fn(dt, t / 1000); id = requestAnimationFrame(lauf); };
				id = requestAnimationFrame(lauf);
				aufraeumen.push(() => { an = false; cancelAnimationFrame(id); });
			},
			// Liste von Aufträgen. Sind alle abgehakt, ist die Stufe gebaut.
			auftraege(texte, schluss) {
				const punkte = texte.map((t) => h("li", {}, h("span", { html: t })));
				liste.replaceChildren(...punkte);
				const erledigt = texte.map(() => false);
				return {
					ist: (n) => erledigt[n],
					ab(n) {
						if (erledigt[n]) return;
						erledigt[n] = true;
						punkte[n].classList.add("ab");
						if (erledigt.every(Boolean)) api.fertig(schluss);
					},
				};
			},
			// Vorhersage vor dem Versuch. dann(ok) läuft nach dem Tipp.
			tipp(frage, antworten, richtig, dann) {
				const box = h("div", { class: "tipp" }, h("p", { class: "tipp-frage", html: frage }));
				const kn = antworten.map((a, n) => h("button", {
					type: "button", class: "knopf", html: a, onclick: () => {
						kn.forEach((k) => { k.disabled = true; });
						kn[n].classList.add("mein");
						t.ok = n === richtig;
						dann && dann(t.ok);
					},
				}));
				box.appendChild(h("div", { class: "knopf-reihe" }, kn));
				const t = { el: box, ok: null, loese(text) { kn[richtig].classList.add("stimmt"); box.appendChild(h("p", { class: "tipp-urteil", html: (t.ok ? "<b>Dein Tipp stimmt.</b> " : "<b>Anders als getippt.</b> ") + (text || "") })); } };
				return t;
			},
			fertig(text) {
				const neu = !stand.b[i];
				stand.b[i] = 1;
				sichern();
				geschafft.hidden = false;
				geschafft.innerHTML = `<b>Hält.</b> ${text || ""}`;
				etikett.hidden = false;
				probe.hidden = false;
				if (neu) document.querySelector(".zaehlwerk").classList.add("neu");
			},
		};

		fuege(etikett, [h("h2", { text: "Das Etikett" }), h("div", { class: "etikett-text", html: s.warum }),
			s.formel ? h("p", { class: "formel", html: s.formel }) : null, h("p", { class: "merke", html: `<b>Merke</b> ${s.merke}` }),
			s.mehr ? h("p", { class: "mehr", html: s.mehr }) : null]);

		const q = s.quiz;
		const urteil = h("p", { class: "urteil", "aria-live": "polite" });
		const fund = h("div", { class: "fund", hidden: true }, kachel(i, true),
			h("p", { html: `<b>Element ${i + 1} gesammelt: ${E[REIHE[i]][0]}.</b> ${FUND[i][0].toUpperCase() + FUND[i].slice(1)}.` }));
		const zeigeFund = () => {
			fund.hidden = false;
			fund.querySelector(".kachel").dataset.z = "geprueft";
			kopfKachel.dataset.z = "geprueft";
		};
		const ant = q.a.map((a, n) => h("button", {
			type: "button", class: "knopf antwort", html: a, onclick: () => {
				if (n === q.r) {
					ant.forEach((k) => { k.disabled = true; });
					ant[n].classList.add("stimmt");
					urteil.innerHTML = `<b>Richtig.</b> ${q.w}`;
					stand.p[i] = 1;
					sichern();
					zeigeFund();
				} else {
					ant[n].disabled = true;
					ant[n].classList.add("falsch");
					urteil.innerHTML = "<b>Noch nicht.</b> Schau noch einmal auf den Stecktisch und probier eine andere Antwort.";
				}
			},
		}));
		probe.append(h("h2", { text: "Die Probe" }), h("p", { class: "probe-frage", html: q.f }), h("div", { class: "antworten" }, ant), urteil, fund);

		const kopfKachel = kachel(i, true);
		const titel = h("h1", { tabindex: -1, html: s.titel });
		blatt.dataset.g = s.g;
		blatt.replaceChildren(
			h("header", { class: "s-kopf" }, kopfKachel,
				h("div", {}, h("p", { class: "s-nr", text: `Stufe ${i + 1} von ${stufen.length} · ${GRUPPEN[s.g]}` }), titel, h("p", { class: "s-frage", html: s.frage }))),
			h("section", { class: "tisch" }, h("h2", { text: "Am Stecktisch" }), liste, feld, sag, geschafft),
			etikett, probe,
			h("nav", { class: "s-nav", "aria-label": "Stufen" },
				i > 0 ? h("a", { href: `#s-${i}`, html: `← ${i}. ${stufen[i - 1].titel}` }) : h("span"),
				h("a", { href: "#tafel", text: "Zur Tafel" }),
				i < stufen.length - 1 ? h("a", { href: `#s-${i + 2}`, html: `${i + 2}. ${stufen[i + 1].titel} →` }) : h("span")));
		s.bau(api);
		if (stand.b[i]) {
			etikett.hidden = false;
			probe.hidden = false;
			geschafft.hidden = false;
			geschafft.innerHTML = "<b>Schon gebaut.</b> Etikett und Probe liegen unten bereit. Am Tisch kannst du frei weiterprobieren.";
		}
		if (stand.p[i]) zeigeFund();
		return titel;
	}

	function weiche() {
		raeume();
		const m = /^#s-(\d+)$/.exec(location.hash);
		const i = m ? Number(m[1]) - 1 : -1;
		if (i >= 0 && i < stufen.length) {
			titelseite.hidden = true;
			blatt.hidden = false;
			const t = zeigeStufe(i);
			document.title = `${stufen[i].titel.replace(/<[^>]+>|­/g, "")} · Der Baukasten Chemie`;
			window.scrollTo(0, 0);
			t.focus({ preventScroll: true });
		} else {
			blatt.hidden = true;
			blatt.replaceChildren();
			titelseite.hidden = false;
			document.title = "Der Baukasten: Chemie — Newbobb Lab";
			zeigeTafel();
			if (location.hash === "#tafel") document.getElementById("tafel-kopf").scrollIntoView();
			else window.scrollTo(0, 0);
		}
	}

	window.CH = { add: (...s) => stufen.push(...s), h, sv, f, E, REIHE, RUHIG, komma, minus, kugel, mol, ball, knopf, regler, wahl, zaehler, leinwand, stecker };
	window.addEventListener("hashchange", weiche);
	window.addEventListener("DOMContentLoaded", weiche);
})();
