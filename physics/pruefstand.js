// Prüfstand Physik: Gerüst für alle Blätter.
// Ein Versuch ist ein Objekt mit Frage, Vorhersage, baue(api), Erklärung und Prüffrage.
// baue(api) liefert { zeichne(g, W, H), schritt(dt), start() } zurück.
(() => {
	"use strict";

	const KEY = "newbobb-physik-v1";
	let stand = { tipp: {}, quiz: {} };
	try {
		const s = JSON.parse(localStorage.getItem(KEY));
		if (s && s.tipp && s.quiz) stand = s;
	} catch { /* ohne Speicher geht es auch */ }
	const sichern = () => {
		try { localStorage.setItem(KEY, JSON.stringify(stand)); } catch { /* egal */ }
	};

	const de = (x, n = 1) => x.toFixed(n).replace(".", ",");
	const klemm = (x, a, b) => Math.max(a, Math.min(b, x));
	const zwei = (n) => String(n).padStart(2, "0");
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

	// ---------- Zeichenwerkzeug ----------
	const C = {
		l: "#eef4ff", z: "rgba(238,244,255,.55)", zz: "rgba(238,244,255,.2)",
		r: "#ff9076", g: "#ffd95e", b: "#123f86", bd: "#0c2f6b",
	};
	let g = null;
	const SCHRIFT = '"Sofia Sans Condensed", "Arial Narrow", sans-serif';
	const HAND = "Kalam, cursive";
	const Z = {
		nimm(ctx) { g = ctx; },
		linie(x1, y1, x2, y2, o = {}) {
			g.save();
			g.strokeStyle = o.f || C.l; g.lineWidth = o.b || 1.5; g.lineCap = "round";
			if (o.s) g.setLineDash(o.s);
			g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
			g.restore();
		},
		pfad(p, o = {}) {
			if (p.length < 2) return;
			g.save();
			g.strokeStyle = o.f || C.l; g.lineWidth = o.b || 1.5; g.lineJoin = "round"; g.lineCap = "round";
			if (o.s) g.setLineDash(o.s);
			g.beginPath(); g.moveTo(p[0][0], p[0][1]);
			for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]);
			if (o.zu) g.closePath();
			if (o.fl) { g.fillStyle = o.fl; g.fill(); }
			g.stroke();
			g.restore();
		},
		pfeil(x1, y1, x2, y2, o = {}) {
			const d = Math.hypot(x2 - x1, y2 - y1);
			if (d < 2) return;
			const a = Math.atan2(y2 - y1, x2 - x1), k = Math.min(9, d * 0.6);
			Z.linie(x1, y1, x2, y2, o);
			g.save();
			g.fillStyle = o.f || C.l;
			g.beginPath(); g.moveTo(x2, y2);
			g.lineTo(x2 - k * Math.cos(a - 0.4), y2 - k * Math.sin(a - 0.4));
			g.lineTo(x2 - k * Math.cos(a + 0.4), y2 - k * Math.sin(a + 0.4));
			g.closePath(); g.fill();
			g.restore();
		},
		// Bemaßung: Maßlinie mit Endstrichen und Zahl
		mass(x1, y1, x2, y2, txt, o = {}) {
			const f = o.f || C.z, a = Math.atan2(y2 - y1, x2 - x1);
			const nx = -Math.sin(a) * 5, ny = Math.cos(a) * 5;
			Z.linie(x1, y1, x2, y2, { f, b: 1 });
			Z.linie(x1 - nx, y1 - ny, x1 + nx, y1 + ny, { f, b: 1 });
			Z.linie(x2 - nx, y2 - ny, x2 + nx, y2 + ny, { f, b: 1 });
			const senk = Math.abs(Math.cos(a)) < 0.5;
			Z.text(txt, (x1 + x2) / 2 + (senk ? (o.seite || 8) : 0), (y1 + y2) / 2 - (senk ? 0 : 6),
				{ f: o.tf || C.l, aus: senk ? (o.seite < 0 ? "right" : "left") : "center", gr: o.gr, hand: o.hand });
		},
		text(s, x, y, o = {}) {
			g.save();
			g.font = `${o.fett ? 700 : 500} ${o.gr || 13}px ${o.hand ? HAND : SCHRIFT}`;
			g.fillStyle = o.f || C.l; g.textAlign = o.aus || "left"; g.textBaseline = o.basis || "alphabetic";
			g.fillText(s, x, y);
			g.restore();
		},
		kreis(x, y, r, o = {}) {
			g.save();
			g.beginPath(); g.arc(x, y, Math.max(0, r), 0, 7);
			if (o.fl) { g.fillStyle = o.fl; g.fill(); }
			if (o.f !== null) {
				g.strokeStyle = o.f || C.l; g.lineWidth = o.b || 1.5;
				if (o.s) g.setLineDash(o.s);
				g.stroke();
			}
			g.restore();
		},
		recht(x, y, w, h, o = {}) {
			g.save();
			if (o.fl) { g.fillStyle = o.fl; g.fillRect(x, y, w, h); }
			if (o.f !== null) {
				g.strokeStyle = o.f || C.l; g.lineWidth = o.b || 1.5;
				if (o.s) g.setLineDash(o.s);
				g.strokeRect(x, y, w, h);
			}
			g.restore();
		},
		// Boden: Linie mit Schraffur darunter
		boden(x1, x2, y, o = {}) {
			Z.linie(x1, y, x2, y, { b: 2, f: o.f });
			g.save();
			g.strokeStyle = C.zz; g.lineWidth = 1;
			g.beginPath();
			for (let x = x1 + 4; x < x2; x += 9) { g.moveTo(x, y + 2); g.lineTo(x - 7, y + 10); }
			g.stroke();
			g.restore();
		},
		kreuz(x, y, o = {}) {
			const k = o.k || 7, f = o.f || C.r;
			Z.linie(x - k, y - k, x + k, y + k, { f, b: 2.5 });
			Z.linie(x - k, y + k, x + k, y - k, { f, b: 2.5 });
		},
		// Kurve im Kasten: Achsen plus Linie, für kleine Diagramme
		diagramm(x, y, w, h, o = {}) {
			Z.linie(x, y, x, y + h, { f: C.z, b: 1 });
			Z.linie(x, y + h, x + w, y + h, { f: C.z, b: 1 });
			if (o.xa) Z.text(o.xa, x + w, y + h + 13, { aus: "right", gr: 11, f: C.z });
			if (o.ya) Z.text(o.ya, x + 4, y + 9, { gr: 11, f: C.z });
		},
	};

	function leinwand(cv, hoehe) {
		const L = { g: cv.getContext("2d"), W: 300, H: 200 };
		const passe = () => {
			const w = Math.max(240, cv.parentElement.clientWidth);
			const h = hoehe ? hoehe(w) : (w < 560 ? Math.round(w * 0.82) : Math.round(Math.min(w * 0.52, 470)));
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			L.W = w; L.H = h; L.dpr = dpr;
			cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
			cv.style.height = h + "px";
		};
		L.klar = () => {
			const { g: c, W, H } = L;
			c.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
			c.clearRect(0, 0, W, H);
			c.strokeStyle = "rgba(238,244,255,.07)"; c.lineWidth = 1;
			c.beginPath();
			for (let x = 0.5; x < W; x += 20) { c.moveTo(x, 0); c.lineTo(x, H); }
			for (let y = 0.5; y < H; y += 20) { c.moveTo(0, y); c.lineTo(W, y); }
			c.stroke();
		};
		passe();
		const ro = new ResizeObserver(passe);
		ro.observe(cv.parentElement);
		L.weg = () => ro.disconnect();
		return L;
	}

	function zeiger(cv, h) {
		let aktiv = false;
		const pos = (e) => {
			const r = cv.getBoundingClientRect();
			return [e.clientX - r.left, e.clientY - r.top];
		};
		cv.addEventListener("pointerdown", (e) => {
			const [x, y] = pos(e);
			if (h.down && h.down(x, y) === false) return;
			aktiv = true;
			try { cv.setPointerCapture(e.pointerId); } catch { /* egal */ }
			e.preventDefault();
		});
		cv.addEventListener("pointermove", (e) => {
			if (!aktiv || !h.move) return;
			const [x, y] = pos(e);
			h.move(x, y);
		});
		const ende = () => { if (aktiv) { aktiv = false; if (h.up) h.up(); } };
		cv.addEventListener("pointerup", ende);
		cv.addEventListener("pointercancel", ende);
	}

	// ---------- Versuche ----------
	const V = [];
	const GRUPPEN = [
		["Mechanik", 0, 7], ["Schwingungen und Wellen", 7, 9], ["Materie und Wärme", 9, 11],
		["Strom, Magnete und Licht", 11, 14], ["Moderne Physik", 14, 16],
	];

	let offen = null; // { raf, L, sim }

	function schliesse() {
		if (!offen) return;
		cancelAnimationFrame(offen.raf);
		offen.L.weg();
		offen = null;
	}

	function zaehler() {
		const gepr = V.filter((v) => stand.quiz[v.id]).length;
		const treff = V.filter((v) => stand.tipp[v.id] === true).length;
		const getippt = V.filter((v) => v.id in stand.tipp).length;
		return { gepr, treff, getippt };
	}

	function meter() {
		const z = zaehler();
		const m = document.querySelector(".meter");
		if (m) m.innerHTML = `<span>Geprüft <b>${z.gepr}</b> / ${V.length}</span><span>Treffer <b>${z.treff}</b> / ${z.getippt}</span>`;
	}

	function verzeichnis() {
		const ziel = document.getElementById("liste");
		ziel.innerHTML = "";
		for (const [name, a, b] of GRUPPEN) {
			const sec = el("section", { class: "gruppe" });
			sec.append(el("h3", {}, name));
			const ol = el("ol", { start: a + 1 });
			for (let i = a; i < b && i < V.length; i++) {
				const v = V[i];
				const t = v.id in stand.tipp ? (stand.tipp[v.id] ? "Tipp: Treffer" : "Tipp: daneben") : "noch offen";
				const li = el("li");
				li.innerHTML = `<a href="#blatt-${i + 1}">
					<span class="nr">${zwei(i + 1)}</span>
					<span class="t"><b>${v.titel}</b><small>${v.kurz}</small></span>
					<span class="st${v.id in stand.tipp ? (stand.tipp[v.id] ? " ja" : " nein") : ""}">${t}</span>
					${stand.quiz[v.id] ? '<span class="stempel klein">Geprüft</span>' : ""}
				</a>`;
				ol.append(li);
			}
			sec.append(ol);
			ziel.append(sec);
		}
	}

	function oeffne(i) {
		schliesse();
		const v = V[i];
		const ziel = document.getElementById("blatt");
		ziel.innerHTML = "";
		const vor = i > 0 ? `<a href="#blatt-${i}" rel="prev">Blatt ${zwei(i)}</a>` : "<span></span>";
		const nach = i < V.length - 1 ? `<a href="#blatt-${i + 2}" rel="next">Blatt ${zwei(i + 2)}</a>` : "<span></span>";
		ziel.append(el("nav", { class: "blattnav", "aria-label": "Blätter" },
			`<a href="#verzeichnis" class="zurueck">Blattverzeichnis</a>${vor}${nach}`));

		const kopf = el("header", { class: "blattkopf" });
		kopf.innerHTML = `<h2 id="bt" tabindex="-1"><span class="bnr">${zwei(i + 1)}</span> ${v.titel}</h2><p class="frage">${v.frage}</p>`;
		ziel.append(kopf);

		const rahmen = el("div", { class: "rahmen" });
		const cv = el("canvas", { role: "img", "aria-label": v.bild });
		rahmen.append(cv);
		ziel.append(rahmen);
		const L = leinwand(cv);

		// Vorhersage
		const tippBox = el("section", { class: "schritt tipp", "aria-labelledby": "h-tipp" });
		tippBox.append(el("h3", { id: "h-tipp" }, "Deine Vorhersage"));
		tippBox.append(el("p", { class: "auftrag" }, v.vorhersage.text));
		const startKnopf = el("button", { class: "haupt", type: "button", disabled: true }, "Versuch starten");
		const urteil = el("p", { class: "urteil", role: "status", "aria-live": "polite" });

		const frei = el("section", { class: "schritt frei", hidden: true, "aria-labelledby": "h-frei" });
		frei.append(el("h3", { id: "h-frei" }, "Jetzt du: dreh an allem"));
		if (v.freitext) frei.append(el("p", { class: "auftrag" }, v.freitext));
		const regler = el("div", { class: "reglerfeld" });
		const werte = el("div", { class: "werte", "aria-live": "off" });
		frei.append(regler, werte);

		const api = {
			get W() { return L.W; }, get H() { return L.H; },
			tipp: null, laeuft: false, messlauf: false,
			phase: v.id in stand.tipp ? "frei" : "tipp",
			ruhig: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
			setTipp(x) {
				const p = v.vorhersage;
				x = klemm(Math.round(x / p.st) * p.st, p.min, p.max);
				api.tipp = x;
				if (api.tippRegler) { api.tippRegler.value = x; api.tippAus.textContent = p.fmt(x); }
				startKnopf.disabled = false;
			},
			zeiger(h) { cv.style.touchAction = h.achse === "x" ? "pan-y" : "none"; zeiger(cv, h); },
			regler(o) {
				const id = "r" + regler.children.length;
				const box = el("div", { class: "regler" });
				const aus = el("output", { for: id }, o.fmt(o.w));
				const lab = el("label", { for: id }, o.n);
				const inp = el("input", { type: "range", id, min: o.min, max: o.max, step: o.st, value: o.w });
				inp.addEventListener("input", () => { aus.textContent = o.fmt(+inp.value); o.auf(+inp.value); });
				box.append(lab, aus, inp);
				regler.append(box);
				return { set(x) { inp.value = x; aus.textContent = o.fmt(+inp.value); } };
			},
			schalter(o) {
				const box = el("div", { class: "schalter", role: "group", "aria-label": o.n });
				box.append(el("span", { class: "sn" }, o.n));
				const ks = o.opt.map((name, k) => {
					const b = el("button", { type: "button", "aria-pressed": k === o.w ? "true" : "false" }, name);
					b.addEventListener("click", () => {
						ks.forEach((x, j) => x.setAttribute("aria-pressed", j === k ? "true" : "false"));
						o.auf(k);
					});
					box.append(b);
					return b;
				});
				regler.append(box);
			},
			knopf(name, fn) {
				const b = el("button", { type: "button", class: "neben" }, name);
				b.addEventListener("click", fn);
				regler.append(b);
				return b;
			},
			wert(name) {
				const box = el("div", { class: "mw" }, `<span>${name}</span><b>–</b>`);
				werte.append(box);
				const b = box.querySelector("b");
				return (s) => { if (b.textContent !== s) b.textContent = s; };
			},
			fertig(wahr, text) {
				if (!api.messlauf) return;
				api.messlauf = false;
				const p = v.vorhersage;
				let treffer, satz;
				if (p.art === "wahl") {
					treffer = api.tipp === p.richtig;
					satz = treffer ? "Treffer." : `Daneben. Richtig war: „${p.opt[p.richtig].replace(/^… /, "").replace(/\.$/, "")}“.`;
				} else {
					treffer = Math.abs(api.tipp - wahr) <= p.tol;
					satz = `${treffer ? "Treffer." : "Daneben."} Dein Tipp: ${p.fmt(api.tipp)}. Gemessen: ${p.fmt(wahr)}.`;
				}
				if (!(v.id in stand.tipp)) { stand.tipp[v.id] = treffer; sichern(); }
				urteil.className = "urteil " + (treffer ? "ja" : "nein");
				urteil.innerHTML = `<b>${satz}</b> ${text || ""}${treffer ? "" : " <i>Ein falscher Tipp zeigt dir, wo deine Erwartung von der Messung abweicht.</i>"}`;
				startKnopf.textContent = "Versuch wiederholen";
				startKnopf.disabled = false;
				oeffneRest(true);
				meter(); schrift();
			},
		};

		const p = v.vorhersage;
		if (p.art === "wahl") {
			const gr = el("div", { class: "wahl", role: "group", "aria-label": "Antworten" });
			p.opt.forEach((name, k) => {
				const b = el("button", { type: "button", "aria-pressed": "false" }, name);
				b.addEventListener("click", () => {
					gr.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
					api.tipp = k;
					startKnopf.disabled = false;
				});
				gr.append(b);
			});
			tippBox.append(gr);
		} else {
			const box = el("div", { class: "regler rot" });
			const aus = el("output", { for: "tr" }, "noch kein Tipp");
			const inp = el("input", { type: "range", id: "tr", min: p.min, max: p.max, step: p.st, value: p.start });
			inp.addEventListener("input", () => api.setTipp(+inp.value));
			box.append(el("label", { for: "tr" }, p.n), aus, inp);
			tippBox.append(box);
			api.tippRegler = inp; api.tippAus = aus;
		}
		tippBox.append(startKnopf, urteil);
		ziel.append(tippBox, frei);

		// Erklärung und Prüffrage
		const warum = el("section", { class: "schritt warum", hidden: true, "aria-labelledby": "h-warum" });
		warum.innerHTML = `<h3 id="h-warum">Was dahinter steckt</h3>${v.warum}
			<p class="formel"><b>${v.formel}</b><span>${v.formelText}</span></p>` +
			(v.mehr ? `<p class="mehr">Tiefer rein: ${v.mehr.map(([h, t]) => `<a href="../${h}/">${t}</a>`).join(" · ")}</p>` : "");
		const pruef = el("section", { class: "schritt pruef", hidden: true, "aria-labelledby": "h-pruef" });
		pruef.innerHTML = `<h3 id="h-pruef">Prüffrage</h3><p class="auftrag">${v.quiz.frage}</p>`;
		const qw = el("div", { class: "wahl", role: "group", "aria-label": "Antworten" });
		const qf = el("p", { class: "urteil", role: "status", "aria-live": "polite" });
		v.quiz.opt.forEach((name, k) => {
			const b = el("button", { type: "button" }, name);
			b.addEventListener("click", () => {
				if (k === v.quiz.richtig) {
					qw.querySelectorAll("button").forEach((x) => { x.disabled = true; });
					b.classList.add("richtig");
					qf.className = "urteil ja";
					qf.innerHTML = `<b>Stimmt.</b> ${v.quiz.warum}` +
						(i < V.length - 1 ? ` <a class="weiter" href="#blatt-${i + 2}">Weiter zu Blatt ${zwei(i + 2)}: ${V[i + 1].titel}</a>`
							: ' <a class="weiter" href="#verzeichnis">Alle Blätter ansehen</a>');
					const neu = !stand.quiz[v.id];
					stand.quiz[v.id] = true; sichern(); meter(); schrift(neu);
				} else {
					b.classList.add("falsch"); b.disabled = true;
					qf.className = "urteil nein";
					qf.innerHTML = `<b>Noch nicht.</b> ${v.quiz.tipp}`;
				}
			});
			qw.append(b);
		});
		pruef.append(qw, qf);
		ziel.append(warum, pruef);

		// Schriftfeld
		const feld = el("footer", { class: "schriftfeld" });
		ziel.append(feld);
		function schrift(neu) {
			const t = v.id in stand.tipp ? (stand.tipp[v.id] ? "Treffer" : "daneben") : "offen";
			feld.innerHTML = `<div class="zelle breit"><span>Benennung</span><b>${v.titel}</b></div>
				<div class="zelle"><span>Blatt</span><b>${zwei(i + 1)} / ${V.length}</b></div>
				<div class="zelle"><span>Maßstab</span><b>${v.massstab}</b></div>
				<div class="zelle"><span>Vorhersage</span><b>${t}</b></div>
				<div class="zelle stempelzelle"><span>Prüfvermerk</span>${stand.quiz[v.id] ? `<i class="stempel${neu ? " neu" : ""}">Geprüft</i>` : "<b>offen</b>"}</div>`;
		}
		schrift();

		function oeffneRest(neu) {
			const warZu = frei.hidden;
			frei.hidden = false; warum.hidden = false; pruef.hidden = false;
			api.phase = "frei";
			if (warZu && sim.frei) sim.frei();
			if (neu && warZu && !api.ruhig) frei.classList.add("auf");
		}

		const sim = v.baue(api);
		startKnopf.addEventListener("click", () => {
			if (api.tipp == null) return;
			urteil.textContent = ""; urteil.className = "urteil";
			api.messlauf = true;
			startKnopf.disabled = true;
			sim.start();
			if (window.innerWidth < 700) rahmen.scrollIntoView({ block: "nearest", behavior: api.ruhig ? "auto" : "smooth" });
		});
		if (api.phase === "frei") oeffneRest(false);

		let zuletzt = 0;
		const bild = (t) => {
			offen.raf = requestAnimationFrame(bild);
			const dt = Math.min(0.033, (t - zuletzt) / 1000 || 0);
			zuletzt = t;
			if (document.hidden) return;
			if (api.laeuft) sim.schritt(dt);
			L.klar();
			Z.nimm(L.g);
			sim.zeichne(L.g, L.W, L.H);
		};
		offen = { raf: 0, L, sim };
		offen.raf = requestAnimationFrame(bild);
	}

	function weiche(erst) {
		const m = /^#blatt-(\d+)$/.exec(location.hash);
		const i = m ? +m[1] - 1 : -1;
		const blatt = document.getElementById("blatt");
		if (i >= 0 && i < V.length) {
			document.body.classList.add("offen");
			blatt.hidden = false;
			oeffne(i);
			document.title = `${V[i].titel} · Prüfstand Physik — Newbobb Lab`;
			window.scrollTo(0, 0);
			if (!erst) document.getElementById("bt").focus({ preventScroll: true });
		} else {
			schliesse();
			document.body.classList.remove("offen");
			blatt.hidden = true; blatt.innerHTML = "";
			document.title = "Prüfstand Physik — Newbobb Lab";
			verzeichnis();
			if (location.hash === "#verzeichnis" && !erst) document.getElementById("verzeichnis").scrollIntoView();
		}
		meter();
	}

	// ---------- Auftakt: die Kugel vom Tisch ----------
	function auftakt() {
		const cv = document.getElementById("auftakt");
		if (!cv) return;
		const L = leinwand(cv, (w) => Math.round(klemm(w * 0.62, 230, 360)));
		const inp = document.getElementById("auftakt-tipp");
		const aus = document.getElementById("auftakt-aus");
		const knopf = document.getElementById("auftakt-los");
		const sagt = document.getElementById("auftakt-sagt");
		const HOEHE = 1.25, G = 9.81, TF = Math.sqrt(2 * HOEHE / G), BREIT = 3.2;
		let v = 3, tipp = null, t = -1, fertig = false, runde = 0;
		const geom = () => {
			const W = L.W, H = L.H, by = H - 26, x0 = W * 0.2, m = (W - x0 - 14) / BREIT;
			return { W, H, by, x0, m, ty: by - HOEHE * m };
		};
		const setze = (x) => {
			if (t >= 0 && !fertig) return;
			if (fertig) { fertig = false; t = -1; sagt.textContent = ""; }
			tipp = klemm(Math.round(x * 20) / 20, 0.2, 3);
			inp.value = tipp; aus.textContent = de(tipp, 2) + " m";
			knopf.disabled = false; knopf.textContent = "Kugel los";
		};
		inp.addEventListener("input", () => setze(+inp.value));
		zeiger(cv, { down(x) { const q = geom(); setze((x - q.x0) / q.m); }, move(x) { const q = geom(); setze((x - q.x0) / q.m); } });
		cv.style.touchAction = "pan-y";
		knopf.addEventListener("click", () => {
			if (fertig) {
				runde++; v = [3, 2, 4, 2.5, 3.5][runde % 5];
				fertig = false; t = -1; tipp = null; aus.textContent = "noch kein Tipp";
				knopf.disabled = true; knopf.textContent = "Kugel los"; sagt.textContent = "";
				return;
			}
			if (tipp == null) return;
			t = 0; knopf.disabled = true;
		});
		let zuletzt = 0;
		const bild = (zeit) => {
			requestAnimationFrame(bild);
			const dt = Math.min(0.033, (zeit - zuletzt) / 1000 || 0);
			zuletzt = zeit;
			if (document.hidden || document.body.classList.contains("offen")) return;
			const q = geom(), ROLL = 0.5;
			if (t >= 0 && !fertig) {
				t += dt;
				if (t >= ROLL + TF) {
					fertig = true;
					const wahr = v * TF, d = Math.abs(tipp - wahr);
					sagt.innerHTML = `<b>${d < 0.12 ? "Treffer." : "Daneben."}</b> Dein Tipp: ${de(tipp, 2)} m. Gelandet: ${de(wahr, 2)} m. Die Kugel fällt genauso lang wie eine, die du einfach loslässt: ${de(TF, 2)} s. In der Zeit kommt sie ${de(v, 1)} m/s × ${de(TF, 2)} s weit.`;
					knopf.disabled = false; knopf.textContent = "Neue Kugel, anderes Tempo";
				}
			}
			L.klar(); Z.nimm(L.g);
			Z.boden(8, q.W - 8, q.by);
			Z.recht(8, q.ty, q.x0 - 8, 7, { fl: C.zz });
			Z.linie(q.x0 - 14, q.ty + 7, q.x0 - 14, q.by, { b: 2 });
			Z.linie(22, q.ty + 7, 22, q.by, { b: 2 });
			Z.mass(q.x0 + 12, q.ty, q.x0 + 12, q.by, "1,25 m");
			for (let k = 0; k <= 6; k++) {
				const x = q.x0 + k * 0.5 * q.m;
				Z.linie(x, q.by, x, q.by + 6, { b: 1 });
				if (k % 2 === 0) Z.text(k / 2 + " m", x, q.by + 20, { aus: "center", gr: 12, f: C.z });
			}
			const r = 8;
			let bx, by2;
			const tt = fertig ? ROLL + TF : t;
			if (tt < 0) { bx = q.x0 - v * ROLL * q.m * 0.5; by2 = q.ty - r; }
			else if (tt < ROLL) { bx = q.x0 - v * (ROLL - tt) * q.m * 0.5; by2 = q.ty - r; }
			else {
				const f = tt - ROLL;
				bx = q.x0 + v * f * q.m; by2 = q.ty - r + 0.5 * G * f * f * q.m;
				const spur = [];
				for (let s = 0; s <= f; s += 0.02) spur.push([q.x0 + v * s * q.m, q.ty - r + 0.5 * G * s * s * q.m]);
				Z.pfad(spur, { f: C.z, s: [3, 5] });
			}
			Z.kreis(bx, Math.min(by2, q.by - r), r, { fl: C.l });
			if (tt < ROLL) Z.pfeil(bx + 12, q.ty - r - 16, bx + 12 + v * 9, q.ty - r - 16, { f: C.g });
			if (tt < ROLL) Z.text(de(v, 1) + " m/s", bx + 12, q.ty - r - 23, { f: C.g, gr: 13, fett: true });
			if (tipp != null) {
				const x = q.x0 + tipp * q.m;
				Z.kreuz(x, q.by - 1);
				Z.text("dein Tipp", x, q.by - 14, { hand: true, f: C.r, aus: "center", gr: 15 });
			} else {
				Z.text("Wo landet sie?", q.x0 + 34, q.by - 30, { hand: true, f: C.r, gr: 17 });
				Z.text("Tipp auf den Boden.", q.x0 + 34, q.by - 11, { hand: true, f: C.r, gr: 17 });
			}
		};
		requestAnimationFrame(bild);
	}

	window.PS = {
		C, Z, de, klemm,
		neu(v) { V.push(v); },
	};

	document.addEventListener("DOMContentLoaded", () => {
		auftakt();
		weiche(true);
		window.addEventListener("hashchange", () => weiche(false));
	});
})();
