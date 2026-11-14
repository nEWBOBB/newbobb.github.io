// Der Marktbote: Gerüst für alle Ausgaben.
// Eine Ausgabe ist ein Objekt mit rubrik, titel, kurz, frage, szene, spiel(api), schlagzeile, artikel, merke, quiz.
// spiel(api) baut das Rollenspiel in api.feld und ruft am Ende api.fertig(taler 1 bis 3, text).
(() => {
	"use strict";

	const KEY = "newbobb-markt-v1";
	let stand = { taler: {}, quiz: {} };
	try {
		const s = JSON.parse(localStorage.getItem(KEY));
		if (s && s.taler && s.quiz) stand = s;
	} catch { /* ohne Speicher geht es auch */ }
	const sichern = () => {
		try { localStorage.setItem(KEY, JSON.stringify(stand)); } catch { /* egal */ }
	};

	const de = (x, n = 0) => x.toFixed(n).replace(".", ",").replace("-", "−").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	// Taler mit Komma nur, wenn nötig
	const T = (x) => de(x, Math.abs(x - Math.round(x)) < 0.005 ? 0 : 2);
	const klemm = (x, a, b) => Math.max(a, Math.min(b, x));
	const el = (tag, attrs = {}, html = "") => {
		const e = document.createElement(tag);
		for (const k in attrs) {
			if (k === "class") e.className = attrs[k];
			else if (attrs[k] === true) e.setAttribute(k, "");
			else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
		}
		if (html) e.innerHTML = html;
		return e;
	};

	// ---------- Zeichnen wie im Holzschnitt ----------
	const F = { t: "#211c17", r: "#a3271c", g: "#1d5c57", b: "rgba(33,28,23,.4)", bb: "rgba(33,28,23,.16)", p: "#fbeee1" };
	const SCHMAL = '"Barlow Condensed", "Arial Narrow", sans-serif';
	const Z = {
		linie(g, x1, y1, x2, y2, o = {}) {
			g.save();
			g.strokeStyle = o.f || F.t; g.lineWidth = o.b || 1.5; g.lineCap = "round";
			if (o.s) g.setLineDash(o.s);
			g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
			g.restore();
		},
		pfad(g, p, o = {}) {
			if (p.length < 2) return;
			g.save();
			g.strokeStyle = o.f || F.t; g.lineWidth = o.b || 2; g.lineJoin = "round"; g.lineCap = "round";
			if (o.s) g.setLineDash(o.s);
			g.beginPath(); g.moveTo(p[0][0], p[0][1]);
			for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]);
			if (o.zu) g.closePath();
			if (o.fl) { g.fillStyle = o.fl; g.fill(); }
			g.stroke();
			g.restore();
		},
		text(g, s, x, y, o = {}) {
			g.save();
			g.font = `${o.fett ? 700 : 600} ${o.gr || 13}px ${SCHMAL}`;
			g.fillStyle = o.f || F.t; g.textAlign = o.aus || "left"; g.textBaseline = o.basis || "alphabetic";
			g.fillText(s, x, y);
			g.restore();
		},
		punkt(g, x, y, o = {}) {
			g.save();
			g.beginPath(); g.arc(x, y, o.r || 4.5, 0, 7);
			g.fillStyle = o.hohl ? F.p : (o.f || F.t); g.fill();
			g.strokeStyle = o.f || F.t; g.lineWidth = 2; g.stroke();
			g.restore();
		},
		// Schraffur in einem Vieleck
		schraff(g, p, o = {}) {
			if (p.length < 3) return;
			g.save();
			g.beginPath(); g.moveTo(p[0][0], p[0][1]);
			for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]);
			g.closePath();
			if (o.fl) { g.fillStyle = o.fl; g.fill(); }
			g.clip();
			const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
			const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
			const h = y1 - y0, d = o.d || 6, r = o.gegen ? -1 : 1;
			g.strokeStyle = o.f || F.t; g.lineWidth = o.b || 1;
			g.beginPath();
			for (let x = x0 - h; x < x1 + h; x += d) {
				g.moveTo(x, r > 0 ? y1 : y0); g.lineTo(x + h, r > 0 ? y0 : y1);
			}
			g.stroke();
			g.restore();
			if (o.rand !== false) Z.pfad(g, p, { f: o.f || F.t, b: 1.5, zu: true });
		},
		recht(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; },
	};

	// Achsenkreuz. Liefert Umrechner X und Y.
	function achsen(g, W, H, o) {
		const l = 36, r = 14, t = 20, b = 34;
		const X = (x) => l + (x / o.xmax) * (W - l - r), Y = (y) => H - b - (y / o.ymax) * (H - t - b);
		g.save();
		g.strokeStyle = F.bb; g.lineWidth = 1;
		g.beginPath();
		for (let y = o.ys; y <= o.ymax + 1e-9; y += o.ys) { g.moveTo(l, Y(y)); g.lineTo(W - r, Y(y)); }
		g.stroke();
		g.restore();
		Z.pfad(g, [[l, t - 6], [l, H - b], [W - r, H - b]], { b: 2 });
		const jx = Math.ceil((o.xmax / o.xs) / Math.max(2, Math.floor((W - l - r) / 44)));
		for (let i = 0, x = 0; x <= o.xmax + 1e-9; x += o.xs, i++) {
			Z.linie(g, X(x), H - b, X(x), H - b + 4);
			if (i % jx === 0) Z.text(g, o.xf ? o.xf(x) : de(x), X(x), H - b + 17, { aus: "center", gr: 12 });
		}
		for (let y = o.ys; y <= o.ymax + 1e-9; y += o.ys) {
			Z.linie(g, l - 4, Y(y), l, Y(y));
			Z.text(g, de(y), l - 7, Y(y) + 4, { aus: "right", gr: 12 });
		}
		Z.text(g, o.xl, W - r, H - 3, { aus: "right", gr: 12, f: F.b, fett: true });
		Z.text(g, o.yl, 4, 11, { gr: 12, f: F.b, fett: true });
		return { X, Y, l, r, t, b };
	}

	// Leinwand, die sich an die Breite anpasst. verh = Höhe geteilt durch Breite.
	function Bild(cv, verh, zeichne) {
		const g = cv.getContext("2d");
		const neu = () => {
			if (!cv.isConnected) return;
			const W = Math.max(220, cv.parentElement.clientWidth);
			const H = Math.round(klemm(W * verh, 170, 400));
			const d = Math.min(2, window.devicePixelRatio || 1);
			if (cv.width !== Math.round(W * d) || cv.height !== Math.round(H * d)) {
				cv.width = Math.round(W * d); cv.height = Math.round(H * d);
				cv.style.height = H + "px";
			}
			g.setTransform(d, 0, 0, d, 0, 0);
			g.clearRect(0, 0, W, H);
			zeichne(g, W, H);
		};
		new ResizeObserver(neu).observe(cv.parentElement);
		// Erst zeichnen, wenn das Spiel fertig aufgebaut ist
		Promise.resolve().then(neu);
		return { neu };
	}

	// ---------- Ausgaben ----------
	const A = [];
	const TEILE = [
		["Erstes Buch: Dein Stand", 0, 4],
		["Zweites Buch: Der Markt", 4, 9],
		["Drittes Buch: Die Stadt und die lange Sicht", 9, 14],
	];
	const muenzen = (n, gelesen) =>
		`<span class="muenzen${gelesen ? " gelesen" : ""}" role="img" aria-label="${n} von 3 Talern${gelesen ? ", Leserfrage gelöst" : ""}">` +
		[1, 2, 3].map((i) => `<i${i <= n ? ' class="da"' : ""}></i>`).join("") + "</span>";

	function kasse() {
		const t = A.reduce((s, a) => s + (stand.taler[a.nr] || 0), 0);
		const q = A.filter((a) => stand.quiz[a.nr]).length;
		const k = document.querySelector(".kasse");
		if (k) k.innerHTML = `Kasse <b>${t}</b> von ${A.length * 3} Talern · Leserfragen <b>${q}</b> von ${A.length}`;
	}

	function liste() {
		const ziel = document.getElementById("liste");
		ziel.innerHTML = "";
		for (const [name, a, b] of TEILE) {
			const sec = el("section", { class: "buchteil" });
			sec.append(el("h3", {}, name));
			const ol = el("ol");
			for (const s of A.slice(a, b)) {
				const li = el("li");
				li.innerHTML = `<a href="#nr-${s.nr}"><span class="nr">${s.nr}</span>
					<span><b>${s.titel}</b><small>${s.kurz}</small></span>
					${muenzen(stand.taler[s.nr] || 0, stand.quiz[s.nr])}</a>`;
				ol.append(li);
			}
			sec.append(ol);
			ziel.append(sec);
		}
	}

	let zaehl = 0;
	function baueApi(feld, eil, beiFertig) {
		const api = {
			feld, Z, F, achsen, de, T, klemm, el,
			text(html, cls) { const p = el("p", { class: cls || "" }, html); feld.append(p); return p; },
			kasten(cls) { const d = el("div", { class: cls || "kasten" }); feld.append(d); return d; },
			werte(paare) {
				return `<dl class="werte">${paare.map(([k, v, c]) => `<div><dt>${k}</dt><dd${c ? ` class="${c}"` : ""}>${v}</dd></div>`).join("")}</dl>`;
			},
			regler(o) {
				const id = "r" + (++zaehl);
				const w = el("div", { class: "regler" });
				w.innerHTML = `<label for="${id}">${o.l}</label><output for="${id}"></output>
					<input type="range" id="${id}" min="${o.min}" max="${o.max}" step="${o.st || 1}" value="${o.w}" />`;
				const inp = w.querySelector("input"), out = w.querySelector("output");
				const f = o.f || ((x) => de(x));
				const upd = () => { out.textContent = f(+inp.value); };
				inp.addEventListener("input", () => { upd(); if (o.on) o.on(+inp.value); });
				upd();
				(o.in || feld).append(w);
				return {
					el: w, inp, upd,
					get w() { return +inp.value; },
					set w(v) { inp.value = v; upd(); },
					aus(b) { inp.disabled = b; },
				};
			},
			knopf(t, fn, o = {}) {
				const b = el("button", { type: "button", class: o.neben ? "neben" : "haupt" }, t);
				b.addEventListener("click", fn);
				(o.in || feld).append(b);
				return b;
			},
			reihe() { const d = el("div", { class: "reihe" }); feld.append(d); return d; },
			wahl(optionen, fn, o = {}) {
				const d = el("div", { class: "wahl" + (o.spalte ? " spalte" : ""), role: "group", "aria-label": o.label || "Auswahl" });
				const bs = optionen.map((t, i) => {
					const b = el("button", { type: "button" }, t);
					b.addEventListener("click", () => fn(i, b, bs));
					d.append(b);
					return b;
				});
				(o.in || feld).append(d);
				return { el: d, bs };
			},
			buch(kopf, titel) {
				const r = el("div", { class: "buchrahmen" });
				r.innerHTML = `<table class="buch"><caption>${titel || "Kassenbuch"}</caption><thead><tr>${kopf.map((k) => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody></tbody></table>`;
				feld.append(r);
				const tb = r.querySelector("tbody");
				return {
					el: r,
					zeile(z, cls) {
						const tr = el("tr", { class: cls || "" });
						tr.innerHTML = z.map((c) => `<td>${c}</td>`).join("");
						tb.append(tr);
						return tr;
					},
				};
			},
			bild(verh, zeichne, label) {
				const r = el("div", { class: "stich" });
				const c = el("canvas", { role: "img", "aria-label": label });
				r.append(c);
				feld.append(r);
				return Bild(c, verh, zeichne);
			},
			eil(h, u) {
				eil.querySelector("b").textContent = h;
				eil.querySelector("i").textContent = u || "";
			},
			fertig(taler, text) { beiFertig(klemm(Math.round(taler), 1, 3), text); },
		};
		return api;
	}

	function oeffne(i) {
		const a = A[i];
		const ziel = document.getElementById("ausgabe");
		ziel.innerHTML = "";
		document.getElementById("titelseite").hidden = true;
		ziel.hidden = false;

		const vor = i > 0 ? `<a href="#nr-${i}" rel="prev">← Nr. ${i}</a>` : "";
		const nach = i < A.length - 1 ? `<a href="#nr-${i + 2}" rel="next">Nr. ${i + 2} →</a>` : "";
		ziel.append(el("nav", { class: "ausnav", "aria-label": "Ausgaben" },
			`<a href="#inhalt">Titelseite</a><span>${vor}${vor && nach ? " · " : ""}${nach}</span>`));

		const kopf = el("header", { class: "auskopf" });
		kopf.innerHTML = `<p class="rubrik">Ausgabe Nr. ${a.nr} · ${a.rubrik}</p>
			<h2 id="aus-h" tabindex="-1">${a.titel}</h2><p class="vorspann">${a.frage}</p>`;
		ziel.append(kopf);
		ziel.append(el("div", { class: "szene" }, a.szene));

		// Markttag
		const tag = el("section", { "aria-labelledby": "h-tag" });
		tag.append(el("h3", { id: "h-tag" }, a.spielname || "Dein Markttag"));
		const eil = el("div", { class: "eil", role: "status", "aria-live": "polite" }, "<span>Eilmeldung</span><b></b><i></i>");
		const feld = el("div", { class: "feld" });
		const abr = el("div", { class: "abrechnung", hidden: true });
		tag.append(feld, eil, abr);
		ziel.append(tag);

		const leit = el("section", { class: "leit", "aria-labelledby": "h-leit" });
		leit.append(el("h3", { id: "h-leit" }, "Leitartikel"));
		const leitInnen = el("div");
		leit.append(leitInnen);
		ziel.append(leit);

		const frage = el("section", { class: "leserfrage", "aria-labelledby": "h-frage", hidden: true });
		ziel.append(frage);

		const zeigeLeit = () => {
			leitInnen.innerHTML = `<h4>${a.schlagzeile}</h4><div class="spalten">${a.artikel}
				<p class="merke"><span>Merke</span>${a.merke}</p>${a.formel ? `<p class="formel">${a.formel}</p>` : ""}</div>`;
			frage.hidden = false;
		};
		const sperre = () => {
			leitInnen.innerHTML = '<p class="gesperrt">Der Leitartikel erscheint, sobald dein Markttag abgerechnet ist. Erst erleben, dann benennen.</p>';
		};

		const starte = () => {
			feld.innerHTML = "";
			abr.hidden = true;
			eil.querySelector("b").textContent = a.auftakt || "Der Markt wartet auf dich";
			eil.querySelector("i").textContent = "";
			a.spiel(baueApi(feld, eil, (taler, text) => {
				const neuBest = Math.max(stand.taler[a.nr] || 0, taler);
				stand.taler[a.nr] = neuBest;
				sichern(); kasse();
				abr.hidden = false;
				abr.innerHTML = `${muenzen(taler)}<p><b>${taler} von 3 Talern.</b> ${text}</p>`;
				const nochmal = el("button", { type: "button", class: "neben" }, "Noch einmal spielen");
				nochmal.addEventListener("click", () => { starte(); kopf.scrollIntoView({ block: "start" }); });
				abr.append(nochmal);
				zeigeLeit();
			}));
		};

		// Leserfrage
		frage.append(el("h3", { id: "h-frage" }, "Leserfrage"));
		frage.append(el("p", { class: "f" }, a.quiz.f));
		const wahl = el("div", { class: "wahl spalte", role: "group", "aria-label": "Antworten" });
		const urteil = el("p", { class: "urteil", role: "status", "aria-live": "polite" });
		const geloest = () => {
			urteil.innerHTML = `<span class="stempel">Gelesen</span>${a.quiz.w}`;
			wahl.querySelectorAll("button").forEach((b, j) => {
				b.disabled = true;
				if (j === a.quiz.r) b.classList.add("gut");
			});
		};
		a.quiz.a.forEach((t, j) => {
			const b = el("button", { type: "button" }, t);
			b.addEventListener("click", () => {
				if (j === a.quiz.r) {
					stand.quiz[a.nr] = true;
					sichern(); kasse();
					geloest();
				} else {
					b.classList.add("schlecht");
					b.disabled = true;
					urteil.textContent = a.quiz.n || "Noch nicht. Denk an deinen Markttag und versuch es noch einmal.";
				}
			});
			wahl.append(b);
		});
		frage.append(wahl, urteil);

		ziel.append(el("nav", { class: "weiter", "aria-label": "Weiterblättern" },
			`<a href="#inhalt">Alle Ausgaben</a>${i < A.length - 1 ? `<a href="#nr-${i + 2}" rel="next">Weiter: ${A[i + 1].titel} →</a>` : '<a href="../#faecher">Zum Hub →</a>'}`));

		if (a.nr in stand.taler) zeigeLeit(); else sperre();
		if (stand.quiz[a.nr]) geloest();
		starte();
		window.scrollTo(0, 0);
		document.getElementById("aus-h").focus({ preventScroll: true });
	}

	function weiche() {
		const m = /^#nr-(\d+)$/.exec(location.hash);
		const i = m ? +m[1] - 1 : -1;
		if (i >= 0 && i < A.length) { oeffne(i); return; }
		document.getElementById("ausgabe").hidden = true;
		document.getElementById("ausgabe").innerHTML = "";
		document.getElementById("titelseite").hidden = false;
		liste();
		if (location.hash === "#inhalt") document.getElementById("inhalt").scrollIntoView();
		else window.scrollTo(0, 0);
	}

	// ---------- Aufmacher: der Brezelpreis ----------
	// 100 Leute, jeder mit einer eigenen Schmerzgrenze zwischen 0 und 6,50 Talern.
	const GRENZEN = Array.from({ length: 100 }, (_, i) => 6.5 * (1 - (i + 0.5) / 100));
	const nachfrage = (p) => GRENZEN.filter((w) => w >= p - 1e-9).length;

	function figur(g, x, y, h, o = {}) {
		const f = o.f || F.t, k = h * 0.17;
		g.save();
		g.strokeStyle = f; g.fillStyle = o.voll ? f : F.p; g.lineWidth = 1.6; g.lineJoin = "round";
		g.beginPath(); g.arc(x, y - h + k, k, 0, 7); g.fill(); g.stroke();
		g.beginPath();
		g.moveTo(x - k * 0.9, y - h + 2 * k + 1); g.lineTo(x + k * 0.9, y - h + 2 * k + 1);
		g.lineTo(x + k * 1.5, y); g.lineTo(x - k * 1.5, y); g.closePath();
		g.fill(); g.stroke();
		g.restore();
	}

	function brezel(g, x, y, r, f) {
		g.save();
		g.strokeStyle = f || F.t; g.lineWidth = Math.max(2, r * 0.22); g.lineCap = "round";
		g.beginPath();
		g.moveTo(x - r * 0.55, y + r * 0.75);
		g.bezierCurveTo(x + r * 1.5, y - r * 0.2, x + r * 0.9, y - r * 1.2, x, y - r * 0.55);
		g.bezierCurveTo(x - r * 0.9, y - r * 1.2, x - r * 1.5, y - r * 0.2, x + r * 0.55, y + r * 0.75);
		g.stroke();
		g.restore();
	}

	function auftakt() {
		const cv = document.getElementById("auftakt"), inp = document.getElementById("auftakt-preis");
		const aus = document.getElementById("auftakt-aus"), h = document.getElementById("auftakt-h"), u = document.getElementById("auftakt-u");
		const VORRAT = 60, KOSTEN = 1;
		let p = +inp.value;
		const bild = Bild(cv, 0.46, (g, W, H) => {
			const boden = H - 26, q = nachfrage(p), verk = Math.min(q, VORRAT);
			Z.schraff(g, Z.recht(0, boden, W, 26), { f: F.b, d: 7, rand: false });
			Z.linie(g, 0, boden, W, boden, { b: 2 });
			// Stand
			const sw = Math.min(150, W * 0.36), sx = 12, sh = Math.min(120, H * 0.6);
			Z.pfad(g, [[sx + 8, boden], [sx + 8, boden - sh]], { b: 2.5 });
			Z.pfad(g, [[sx + sw - 8, boden], [sx + sw - 8, boden - sh]], { b: 2.5 });
			const dach = [[sx - 4, boden - sh + 22], [sx + 10, boden - sh - 8], [sx + sw - 10, boden - sh - 8], [sx + sw + 4, boden - sh + 22]];
			Z.schraff(g, dach, { fl: F.p, f: F.r, d: 8 });
			Z.schraff(g, Z.recht(sx, boden - sh * 0.38, sw, sh * 0.38), { fl: F.p, d: 5, gegen: true });
			brezel(g, sx + sw / 2, boden - sh * 0.62, Math.min(17, sh * 0.15), F.t);
			Z.text(g, `${T(p)} Taler`, sx + sw / 2, boden - sh * 0.38 - 5, { aus: "center", gr: 13, fett: true, f: F.r });
			// Schlange: eine Figur je vier Käufer
			const n = Math.round(q / 4), platz = W - sx - sw - 16, abst = klemm(platz / Math.max(n, 1), 11, 26);
			const fh = Math.min(54, H * 0.3);
			for (let i = 0; i < n; i++) {
				const x = sx + sw + 14 + i * abst;
				if (x > W - 8) break;
				figur(g, x, boden, fh - (i % 3) * 3, { voll: i * 4 < verk });
			}
			if (n === 0) Z.text(g, "Niemand bleibt stehen.", sx + sw + 16, boden - 14, { gr: 14, f: F.b });
		});
		const zeige = () => {
			p = +inp.value;
			const q = nachfrage(p), verk = Math.min(q, VORRAT), gewinn = (p - KOSTEN) * verk;
			aus.textContent = `${T(p)} Taler`;
			if (p <= KOSTEN) h.textContent = "Brezeln zum Selbstkostenpreis: Stand überrannt, Kasse leer";
			else if (q > VORRAT) h.textContent = `Ausverkauft um zehn Uhr: ${q - VORRAT} Hungrige gehen leer aus`;
			else if (gewinn >= 110) h.textContent = `Brezelstand verdient ${T(gewinn)} Taler: bester Tag der Saison`;
			else if (p >= 5) h.textContent = `${T(p)} Taler für eine Brezel? Kundschaft geht kopfschüttelnd weiter`;
			else h.textContent = `${verk} Brezeln verkauft, ${T(gewinn)} Taler Gewinn`;
			u.textContent = `${q} von 100 Leuten wollen zu diesem Preis kaufen. Du hast ${VORRAT} Brezeln gebacken, jede kostet dich 1 Taler.`;
			bild.neu();
		};
		inp.addEventListener("input", zeige);
		zeige();
	}

	window.MB = {
		ausgabe(a) { a.nr = A.length + 1; A.push(a); },
		GRENZEN, nachfrage, figur, brezel,
	};

	window.addEventListener("DOMContentLoaded", () => {
		auftakt();
		kasse();
		weiche();
		window.addEventListener("hashchange", weiche);
		if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => window.dispatchEvent(new Event("resize")));
	});
})();
