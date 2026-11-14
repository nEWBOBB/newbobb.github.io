/* Die Platine: Grundgerüst.
   Eine Baugruppe ist ein Objekt in PL.stufen:
   { id, gruppe, titel, kurz, auftrag (HTML), baue(api), blatt: { titel, text (HTML), merke, formel }, quiz: { frage, wahl, richtig, weil } }
   baue(api) baut die Werkbank. Meist über api.folge([{ ziel, baue(feld, weiter) }, …]): mehrere Aufträge nacheinander,
   weiter(text) meldet einen bestandenen Auftrag, der letzte schaltet Datenblatt und Prüffrage frei. */
(function () {
	"use strict";

	const KEY = "newbobb-informatik-platine-v1";
	const NS = "http://www.w3.org/2000/svg";
	const PL = (window.PL = { stufen: [] });
	PL.ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	PL.gruppen = {
		a: "Baugruppe A · Vom Schalter zum Rechner",
		b: "Baugruppe B · Vom Befehl zum Verfahren",
		c: "Baugruppe C · Vom Rechner zum Netz",
	};

	let stand = {};
	try {
		stand = JSON.parse(localStorage.getItem(KEY)) || {};
	} catch (e) {
		stand = {};
	}
	function merke() {
		try {
			localStorage.setItem(KEY, JSON.stringify(stand));
		} catch (e) { /* ohne Speicher geht es auch */ }
	}

	/* ---------- Elemente bauen ---------- */
	function setze(e, props, svg) {
		for (const k in props || {}) {
			const v = props[k];
			if (v == null || v === false) continue;
			if (k === "text") e.textContent = v;
			else if (k === "html") e.innerHTML = v;
			else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
			else if (k === "class" && !svg) e.className = v;
			else e.setAttribute(k, v);
		}
	}
	function haenge(e, kinder) {
		for (const k of kinder.flat(3)) if (k != null && k !== false) e.append(k);
	}
	function h(tag, props, ...kinder) {
		const e = document.createElement(tag);
		setze(e, props);
		haenge(e, kinder);
		return e;
	}
	function s(tag, props, ...kinder) {
		const e = document.createElementNS(NS, tag);
		setze(e, props, true);
		haenge(e, kinder);
		return e;
	}
	PL.h = h;
	PL.s = s;

	PL.knopf = function (text, fn, cls) {
		return h("button", { type: "button", class: "pad " + (cls || ""), text, onclick: fn });
	};

	PL.schalter = function (label, an, fn) {
		const b = h("button", { type: "button", class: "dip", "aria-pressed": String(!!an) }, h("i"), h("span", { text: label }));
		b.wert = () => b.getAttribute("aria-pressed") === "true";
		b.setze = (v) => b.setAttribute("aria-pressed", String(!!v));
		b.addEventListener("click", () => {
			b.setze(!b.wert());
			if (fn) fn(b.wert());
		});
		return b;
	};

	PL.led = function (farbe, an) {
		const l = h("span", { class: "led " + (farbe || "gruen") });
		l.an = (v) => l.classList.toggle("an", !!v);
		l.an(an);
		return l;
	};

	let lfd = 0;
	PL.regler = function (label, min, max, step, wert, fn, fmt) {
		const id = "r" + ++lfd;
		const aus = h("output", { for: id });
		const ein = h("input", { type: "range", id, min, max, step, value: wert });
		const zeig = () => (aus.textContent = fmt ? fmt(+ein.value) : ein.value);
		ein.addEventListener("input", () => {
			zeig();
			fn(+ein.value);
		});
		zeig();
		const box = h("div", { class: "regler" }, h("label", { for: id, text: label }), aus, ein);
		box.setze = (v) => {
			ein.value = v;
			zeig();
		};
		box.wert = () => +ein.value;
		return box;
	};

	/* SVG-Gruppe wie einen Knopf bedienbar machen */
	PL.taste = function (g, name, fn) {
		g.setAttribute("tabindex", "0");
		g.setAttribute("role", "button");
		g.setAttribute("aria-label", name);
		g.addEventListener("click", fn);
		g.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				fn(e);
			}
		});
		return g;
	};

	/* Leiterbahn mit 45-Grad-Knick */
	PL.bahn = function (x1, y1, x2, y2) {
		const dy = Math.abs(y2 - y1);
		let k = x2 - 12 - dy;
		if (k < x1 + 8) k = x1 + 8;
		const e = Math.min(k + dy, x2 - 4);
		return `M${x1} ${y1} H${k} L${e} ${y2} H${x2}`;
	};

	PL.leinwand = function (b, hoehe, name) {
		const c = h("canvas", { class: "bild", width: b * 2, height: hoehe * 2, role: "img", "aria-label": name });
		const g = c.getContext("2d");
		g.scale(2, 2);
		return { c, g, b, h: hoehe };
	};

	/* ---------- Schaltung mit Sockeln ---------- */
	const LOGIK = {
		UND: (a, b) => a & b,
		ODER: (a, b) => a | b,
		XOR: (a, b) => a ^ b,
		NAND: (a, b) => 1 - (a & b),
		NOR: (a, b) => 1 - (a | b),
		NICHT: (a) => 1 - a,
		DRAHT: (a) => a,
	};
	PL.LOGIK = LOGIK;

	/* def: { b, h, name, ein: [{id, name, x, y}], chips: [{id, x, y, von: [..], typ?, wahl?: [..]}], aus: [{id, name, von, x, y, rot?}] } */
	PL.schaltung = function (def, beiAenderung) {
		const wert = {};
		const typ = {};
		const drähte = [];
		let gewaehlt = null;
		const svg = s("svg", { viewBox: `0 0 ${def.b} ${def.h}`, class: "schaltung", role: "group", "aria-label": def.name || "Schaltung" });
		const gBahn = s("g");
		const gTeil = s("g");
		svg.append(gBahn, gTeil);
		const punkt = {};
		const einEl = {};
		const chipEl = {};
		const ausEl = {};

		def.ein.forEach((e) => {
			wert[e.id] = 0;
			punkt[e.id] = [e.x + 22, e.y];
			const g = s("g", { class: "ein" },
				s("rect", { x: e.x - 22, y: e.y - 11, width: 44, height: 22, rx: 4 }),
				s("rect", { class: "knauf", x: e.x - 19, y: e.y - 8, width: 18, height: 16, rx: 2 }),
				s("text", { x: e.x, y: e.y - 17, "text-anchor": "middle", text: e.name }));
			PL.taste(g, "Schalter " + e.name, () => {
				wert[e.id] = 1 - wert[e.id];
				neu();
			});
			g.setAttribute("aria-pressed", "false");
			einEl[e.id] = g;
			gTeil.append(g);
		});

		def.chips.forEach((c) => {
			typ[c.id] = c.typ || null;
			punkt[c.id] = [c.x + 34, c.y];
			const text = s("text", { x: c.x, y: c.y + 4, "text-anchor": "middle" });
			const g = s("g", { class: "ic" }, s("rect", { x: c.x - 34, y: c.y - 22, width: 68, height: 44, rx: 3 }), text,
				s("text", { class: "klein", x: c.x - 30, y: c.y - 26, text: c.id.toUpperCase() }));
			if (c.wahl) {
				g.classList.add("wahl");
				PL.taste(g, "Sockel " + c.id, () => {
					gewaehlt = c.id;
					neu();
				});
				if (!gewaehlt) gewaehlt = c.id;
			}
			chipEl[c.id] = { g, text };
			gTeil.append(g);
			const n = c.von.length;
			c.von.forEach((q, i) => {
				const py = n === 1 ? c.y : c.y - 11 + i * 22;
				drähte.push({ q, x: c.x - 34, y: py });
			});
		});

		def.aus.forEach((a) => {
			const kreis = s("circle", { class: "lampe" + (a.rot ? " rot" : ""), cx: a.x, cy: a.y, r: 11 });
			gTeil.append(kreis, s("text", { x: a.x, y: a.y - 17, "text-anchor": "middle", text: a.name }));
			ausEl[a.id] = kreis;
			drähte.push({ q: a.von, x: a.x - 11, y: a.y });
		});

		drähte.forEach((d) => {
			const [x, y] = punkt[d.q];
			d.el = s("path", { class: "bahn", d: PL.bahn(x, y, d.x, d.y) });
			gBahn.append(d.el, s("circle", { class: "via", cx: d.x, cy: d.y, r: 3 }));
		});

		const wahlChips = def.chips.filter((c) => c.wahl);
		const sorten = [...new Set(wahlChips.flatMap((c) => c.wahl))];
		const sortiment = h("div", { class: "sortiment" });
		if (sorten.length) {
			sortiment.append(h("p", { class: "druck", text: wahlChips.length > 1 ? "Sockel antippen, dann Baustein wählen" : "Baustein in den Sockel stecken" }));
			sorten.forEach((t) =>
				sortiment.append(PL.knopf(t, () => {
					const c = def.chips.find((x) => x.id === gewaehlt);
					if (!c || !c.wahl.includes(t)) return;
					typ[c.id] = t;
					const frei = wahlChips.find((x) => !typ[x.id]);
					if (frei) gewaehlt = frei.id;
					neu();
				})));
		}

		function rechne() {
			def.chips.forEach((c) => {
				const f = LOGIK[typ[c.id]];
				wert[c.id] = f ? f(...c.von.map((q) => wert[q] || 0)) : 0;
			});
		}

		function neu(still) {
			rechne();
			def.ein.forEach((e) => {
				const g = einEl[e.id];
				g.classList.toggle("an", !!wert[e.id]);
				g.setAttribute("aria-pressed", String(!!wert[e.id]));
				g.querySelector(".knauf").setAttribute("x", wert[e.id] ? e.x + 1 : e.x - 19);
			});
			def.chips.forEach((c) => {
				const el = chipEl[c.id];
				el.text.textContent = typ[c.id] || "?";
				el.g.classList.toggle("leer", !typ[c.id]);
				el.g.classList.toggle("gewaehlt", wahlChips.length > 1 && gewaehlt === c.id);
				if (c.wahl) el.g.setAttribute("aria-label", "Sockel " + c.id + ": " + (typ[c.id] || "leer"));
			});
			drähte.forEach((d) => d.el.classList.toggle("an", !!wert[d.q]));
			def.aus.forEach((a) => ausEl[a.id].classList.toggle("an", !!wert[a.von]));
			sortiment.querySelectorAll("button").forEach((b) => {
				const c = def.chips.find((x) => x.id === gewaehlt);
				b.disabled = !c || !c.wahl.includes(b.textContent);
			});
			if (!still && beiAenderung) beiAenderung();
		}

		const api = {
			el: h("div", null, svg, sortiment),
			voll: () => wahlChips.every((c) => typ[c.id]),
			typ: (id) => typ[id],
			setze(werte) {
				Object.assign(wert, werte);
				neu(true);
			},
			lies: () => Object.fromEntries(def.aus.map((a) => [a.id, wert[a.von]])),
			/* alle Eingangsmuster durchrechnen, ohne die Anzeige zu ändern */
			tabelle(soll) {
				const alt = { ...wert };
				const n = def.ein.length;
				const zeilen = [];
				for (let m = 0; m < 1 << n; m++) {
					const ein = {};
					def.ein.forEach((e, i) => (ein[e.id] = (m >> (n - 1 - i)) & 1));
					Object.assign(wert, ein);
					rechne();
					const ist = api.lies();
					const s2 = soll(ein);
					zeilen.push({ ein, ist, soll: s2, ok: api.voll() && def.aus.every((a) => ist[a.id] === s2[a.id]) });
				}
				Object.assign(wert, alt);
				rechne();
				return zeilen;
			},
		};
		neu(true);
		return api;
	};

	/* Ein Auftrag aus Schaltung, Wahrheitstabelle und Abnahmetest */
	PL.gatterAuftrag = function (api, feld, def, soll, weiter, lob) {
		const tab = h("table", { class: "tabelle" });
		const sch = PL.schaltung(def, zeig);
		let laeuft = false;
		function zeig(jetzt) {
			const z = sch.tabelle(soll);
			tab.replaceChildren(
				h("tr", null, def.ein.map((e) => h("th", { rowspan: 2, text: e.name })), def.aus.map((a) => h("th", { colspan: 2, text: a.name }))),
				h("tr", null, def.aus.map(() => [h("th", { text: "soll" }), h("th", { text: "ist" })])),
				...z.map((r, i) =>
					h("tr", { class: i === jetzt ? "jetzt" : "" },
						def.ein.map((e) => h("td", { text: r.ein[e.id] })),
						def.aus.map((a) => [
							h("td", { text: r.soll[a.id] }),
							h("td", { class: !sch.voll() ? "" : r.ist[a.id] === r.soll[a.id] ? "gut" : "schlecht", text: sch.voll() ? r.ist[a.id] : "–" }),
						]))));
			return z;
		}
		const test = PL.knopf("Abnahmetest starten", () => {
			if (laeuft) return;
			if (!sch.voll()) return api.sag("Ein Sockel ist noch leer. Steck erst einen Baustein hinein.", "fehler");
			const z = zeig();
			const ende = () => {
				laeuft = false;
				zeig();
				const falsch = z.filter((r) => !r.ok).length;
				if (!falsch) weiter(lob);
				else api.sag(falsch + " von " + z.length + " Zeilen stimmen nicht. Schau in die Tabelle: Wo weicht „ist“ von „soll“ ab?", "fehler");
			};
			if (PL.ruhig) return ende();
			laeuft = true;
			let i = 0;
			api.sag("Test läuft: alle Schalterstellungen der Reihe nach …", "info");
			const t = api.takt(() => {
				if (i >= z.length) {
					api.stopp(t);
					return ende();
				}
				sch.setze(z[i].ein);
				zeig(i);
				i++;
			}, 420);
		});
		feld.append(sch.el, tab, h("div", { class: "reihe mitte" }, test));
		zeig();
		return sch;
	};

	/* ---------- Seite ---------- */
	let uhren = [];
	function aufraeumen() {
		uhren.forEach((u) => {
			clearInterval(u);
			clearTimeout(u);
		});
		uhren = [];
	}

	function fertig(st) {
		const z = stand[st.id] || {};
		return z.bau && z.quiz ? 2 : z.bau ? 1 : 0;
	}

	function zeigeBrett() {
		const box = document.getElementById("gruppen");
		box.replaceChildren(
			...Object.keys(PL.gruppen).map((g) =>
				h("section", { class: "gruppe" }, h("h3", { text: PL.gruppen[g] }),
					h("ul", { class: "chips" },
						PL.stufen.filter((st) => st.gruppe === g).map((st) => {
							const f = fertig(st);
							const nr = PL.stufen.indexOf(st) + 1;
							return h("li", null,
								h("a", { class: "chip", href: "#" + st.id },
									h("span", { class: "nr", text: "U" + String(nr).padStart(2, "0") }),
									PL.led(f === 2 ? "gruen" : "gelb", f > 0),
									h("b", { text: st.titel }), h("small", { text: st.kurz }),
									h("span", { class: "nur-vorlesen", text: f === 2 ? " (fertig)" : f === 1 ? " (gebaut)" : "" })));
						})))));
		const n = PL.stufen.filter((st) => fertig(st) === 2).length;
		document.getElementById("zaehler").textContent = n + " / " + PL.stufen.length + " laufen";
	}

	function zeigeStufe(st) {
		const idx = PL.stufen.indexOf(st);
		const nr = String(idx + 1).padStart(2, "0");
		const z = (stand[st.id] = stand[st.id] || {});
		const werk = document.getElementById("werk");
		const lampe = PL.led("gelb");
		const zustand = h("span");
		const ziel = h("div", { class: "ziel", hidden: "" });
		const feld = h("div", { class: "feld" });
		const status = h("p", { class: "status", role: "status", "aria-live": "polite" });
		const weiterBox = h("div", { class: "weiter" });
		const blatt = h("section", { class: "datenblatt" });
		const pruef = h("section", { class: "pruefung" });

		function kopfNeu() {
			const f = fertig(st);
			lampe.className = "led " + (f === 2 ? "gruen" : "gelb");
			lampe.an(f > 0);
			zustand.textContent = f === 2 ? "läuft" : f === 1 ? "gebaut, Prüffrage offen" : "noch nicht bestückt";
			zeigeBrett();
		}

		function blattNeu() {
			if (!z.bau) {
				blatt.className = "datenblatt zu";
				blatt.replaceChildren(h("p", { text: "DATENBLATT U" + nr + " · versiegelt, bis der Abnahmetest besteht." }));
				pruef.hidden = true;
				return;
			}
			blatt.className = "datenblatt";
			blatt.replaceChildren(
				h("p", { class: "druck", text: "Datenblatt U" + nr + " · " + st.titel }),
				h("h2", { text: st.blatt.titel }),
				h("div", { class: "inhalt", html: st.blatt.text }),
				st.blatt.formel ? h("p", { class: "formel", html: st.blatt.formel }) : null,
				h("p", { class: "merke", text: st.blatt.merke }));
			pruef.hidden = false;
			const q = st.quiz;
			const urteil = h("p", { class: "status", role: "status", "aria-live": "polite" });
			pruef.replaceChildren(
				h("p", { class: "druck", text: "Prüffrage" }),
				h("h2", { text: q.frage }),
				h("div", { class: "optionen" },
					q.wahl.map((w, i) =>
						h("button", {
							type: "button", text: w,
							onclick(e) {
								if (i === q.richtig) {
									e.currentTarget.className = "richtig";
									urteil.className = "status ok";
									urteil.textContent = "Richtig. " + q.weil;
									z.quiz = true;
									merke();
									kopfNeu();
								} else {
									e.currentTarget.className = "falsch";
									urteil.className = "status fehler";
									urteil.textContent = "Noch nicht. Denk an das, was du gerade gebaut hast, und versuch es noch einmal.";
								}
							},
						}))),
				urteil);
			if (z.quiz) {
				pruef.querySelectorAll("button")[q.richtig].className = "richtig";
				urteil.className = "status ok";
				urteil.textContent = "Schon gelöst. " + q.weil;
			}
		}

		const api = {
			feld,
			ruhig: PL.ruhig,
			ziel(html, i, n) {
				ziel.hidden = false;
				ziel.replaceChildren(h("p", { class: "druck", text: n > 1 ? "Auftrag " + i + " von " + n : "Auftrag" }), h("p", { html }));
			},
			sag(text, art) {
				status.className = "status " + (art || "");
				status.textContent = text || "";
			},
			takt(fn, ms) {
				const u = setInterval(fn, ms);
				uhren.push(u);
				return u;
			},
			spaeter(fn, ms) {
				const u = setTimeout(fn, ms);
				uhren.push(u);
				return u;
			},
			stopp(u) {
				clearInterval(u);
				clearTimeout(u);
			},
			bestanden(text) {
				api.sag(text + " Abnahmetest bestanden: Das Datenblatt ist offen.", "ok");
				const neu = !z.bau;
				z.bau = true;
				merke();
				kopfNeu();
				if (neu) blattNeu();
				weiterBox.replaceChildren(h("a", { class: "pad hell", href: "#blatt-" + st.id, text: "Zum Datenblatt ↓", style: "display:inline-block;text-decoration:none" }));
			},
			folge(liste) {
				let i = 0;
				const los = () => {
					const a = liste[i];
					let durch = false;
					aufraeumen();
					api.ziel(a.ziel, i + 1, liste.length);
					api.sag("");
					weiterBox.replaceChildren();
					feld.replaceChildren();
					a.baue(feld, (text) => {
						if (durch) return;
						durch = true;
						if (i === liste.length - 1) return api.bestanden(text);
						api.sag(text, "ok");
						weiterBox.replaceChildren(PL.knopf("Nächster Auftrag →", () => {
							i++;
							los();
							ziel.scrollIntoView({ block: "nearest" });
						}, "hell"));
					});
				};
				los();
			},
		};

		const vor = PL.stufen[idx - 1];
		const nach = PL.stufen[idx + 1];
		const titel = h("h1", { tabindex: "-1", text: st.titel });
		blatt.id = "blatt-" + st.id;
		werk.replaceChildren(
			h("article", { class: "stufe" },
				h("header", { class: "stufe-kopf" },
					h("p", { class: "druck" }, h("span", { text: "U" + nr + " · " + PL.gruppen[st.gruppe].split(" · ")[0] }), lampe, zustand),
					titel),
				h("div", { class: "auftrag", html: st.auftrag }),
				h("section", { class: "werkbank", "aria-label": "Werkbank" }, ziel, feld, status, weiterBox),
				blatt, pruef,
				h("nav", { class: "blaettern", "aria-label": "Weitere Baugruppen" },
					vor ? h("a", { href: "#" + vor.id, text: "← " + vor.titel }) : h("span"),
					h("a", { href: "#platine", text: "Zur Hauptplatine" }),
					nach ? h("a", { class: "haupt", href: "#" + nach.id, text: nach.titel + " →" }) : h("span"))));
		kopfNeu();
		blattNeu();
		st.baue(api);
		return titel;
	}

	function weiche() {
		const id = location.hash.slice(1);
		if (id.indexOf("blatt-") === 0) {
			const b = document.getElementById(id);
			if (b) b.scrollIntoView();
			return;
		}
		aufraeumen();
		const st = PL.stufen.find((x) => x.id === id);
		const brett = document.getElementById("platine");
		const werk = document.getElementById("werk");
		brett.hidden = !!st;
		werk.hidden = !st;
		if (st) {
			document.title = st.titel + " · Die Platine — Newbobb Lab";
			const t = zeigeStufe(st);
			window.scrollTo(0, 0);
			t.focus({ preventScroll: true });
		} else {
			document.title = "Die Platine: Informatik — Newbobb Lab";
			werk.replaceChildren();
			zeigeBrett();
		}
	}

	PL.start = function () {
		const sw = document.getElementById("probe-sw");
		sw.addEventListener("click", () => {
			const an = sw.getAttribute("aria-pressed") !== "true";
			sw.setAttribute("aria-pressed", String(an));
			document.getElementById("probe-led").classList.toggle("an", an);
			sw.closest(".probe").classList.toggle("an", an);
			document.getElementById("probe-text").textContent = an
				? "An. Auf der Leitung liegt eine 1. Das war schon ein Bit."
				: "Aus. Auf der Leitung liegt eine 0.";
		});
		window.addEventListener("hashchange", weiche);
		weiche();
	};
})();
