// Die Platine: Gerüst für alle Baustufen des Informatik-Kurses.
// Eine Stufe ist ein Objekt mit id, zone, name, kurz, frage, bau(api), warum, merke, quiz und optional mehr (Links).
// bau(api) baut die Werkbank in api.feld und ruft api.fertig(text), sobald der Auftrag erfüllt ist.
(() => {
	"use strict";

	const KEY = "newbobb-platine-v1";
	let stand = { bau: {}, quiz: {} };
	try {
		const s = JSON.parse(localStorage.getItem(KEY));
		if (s && s.bau && s.quiz) stand = s;
	} catch { /* ohne Speicher geht es auch */ }
	const sichern = () => {
		try { localStorage.setItem(KEY, JSON.stringify(stand)); } catch { /* egal */ }
	};

	const RUHIG = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const NS = "http://www.w3.org/2000/svg";

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
	const sv = (tag, attrs = {}, eltern) => {
		const e = document.createElementNS(NS, tag);
		for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
		if (eltern) eltern.appendChild(e);
		return e;
	};
	const de = (x) => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	const zwei = (n) => String(n).padStart(2, "0");

	// ---------- Bausteine der Werkbank ----------

	// Ein Schiebeschalter. Liefert { el, an, setze(wert) }.
	function schalter(name, an, beiWechsel, opt = {}) {
		const b = el("button", { type: "button", class: "sw" + (opt.klein ? " klein" : ""), "aria-pressed": an ? "true" : "false" });
		b.innerHTML = `<span class="sw-bahn"><span class="sw-knopf"></span></span><span class="sw-wert">${an ? 1 : 0}</span>` +
			(opt.unten != null ? `<span class="sw-name">${opt.unten}</span>` : "");
		b.setAttribute("aria-label", name);
		const s = {
			el: b,
			an: !!an,
			setze(w) {
				s.an = !!w;
				b.setAttribute("aria-pressed", s.an ? "true" : "false");
				b.querySelector(".sw-wert").textContent = s.an ? 1 : 0;
			},
		};
		b.addEventListener("click", () => {
			if (b.disabled) return;
			s.setze(!s.an);
			beiWechsel && beiWechsel(s.an);
		});
		return s;
	}

	// Eine Reihe Schalter. Liefert { el, bits(), setze(array), wert() }.
	function reihe(n, opt = {}) {
		const box = el("div", { class: "sw-reihe", style: `--n:${n}` });
		const liste = [];
		for (let i = 0; i < n; i++) {
			const unten = opt.unten ? opt.unten[i] : null;
			const name = opt.namen ? opt.namen[i] : `Schalter ${i + 1}`;
			const s = schalter(name, opt.start ? opt.start[i] : 0, () => opt.wechsel && opt.wechsel(r), { unten, klein: n > 5 });
			liste.push(s);
			box.appendChild(s.el);
		}
		const r = {
			el: box,
			liste,
			bits: () => liste.map((s) => (s.an ? 1 : 0)),
			setze(a) { liste.forEach((s, i) => s.setze(a[i])); },
			wert: () => liste.reduce((w, s) => w * 2 + (s.an ? 1 : 0), 0),
			sperre(zu) { liste.forEach((s) => { s.el.disabled = zu; }); },
		};
		return r;
	}

	function knopf(text, fn, klasse = "") {
		const b = el("button", { type: "button", class: "knopf " + klasse }, text);
		b.addEventListener("click", fn);
		return b;
	}

	// Statuszeile, die Screenreader mitlesen.
	function meld(text = "") {
		const p = el("p", { class: "meld", role: "status", "aria-live": "polite" });
		p.sag = (t, art = "") => {
			p.innerHTML = t;
			p.dataset.art = art;
		};
		p.sag(text);
		return p;
	}

	// Liste von Aufträgen mit Lötpunkten zum Abhaken.
	function auftraege(texte) {
		const ol = el("ol", { class: "aufg" });
		const li = texte.map((t) => {
			const l = el("li", {}, `<i aria-hidden="true"></i><span>${t}</span>`);
			ol.appendChild(l);
			return l;
		});
		const a = {
			el: ol,
			i: 0,
			ab(k) {
				li[k].dataset.ok = "1";
				li[k].setAttribute("aria-label", li[k].textContent + " (erledigt)");
				while (a.i < li.length && li[a.i].dataset.ok) a.i++;
				li.forEach((l, j) => l.classList.toggle("jetzt", j === a.i));
			},
			ok: (k) => !!li[k].dataset.ok,
			alle: () => a.i >= li.length,
			text(k, t) { li[k].querySelector("span").innerHTML = t; },
		};
		li[0].classList.add("jetzt");
		return a;
	}

	function regler(o) {
		const id = "r" + Math.random().toString(36).slice(2, 8);
		const box = el("div", { class: "regler" });
		const lab = el("label", { for: id }, o.name);
		const aus = el("output", { for: id });
		const inp = el("input", { type: "range", id, min: o.min, max: o.max, step: o.step || 1, value: o.wert });
		const zeig = () => { aus.textContent = o.fmt ? o.fmt(+inp.value) : inp.value; };
		inp.addEventListener("input", () => { zeig(); o.bei && o.bei(+inp.value); });
		zeig();
		box.append(lab, aus, inp);
		return { el: box, inp, wert: () => +inp.value, setze(w) { inp.value = w; zeig(); }, zeig };
	}

	// ---------- Steckbrett: Gatter verdrahten ----------
	const GATTER = {
		UND: { n: 2, f: (a, b) => a & b },
		ODER: { n: 2, f: (a, b) => a | b },
		NICHT: { n: 1, f: (a) => 1 - a },
		NAND: { n: 2, f: (a, b) => 1 - (a & b) },
		NOR: { n: 2, f: (a, b) => 1 - (a | b) },
		XOR: { n: 2, f: (a, b) => a ^ b },
	};

	// o: { ein: ["A","B"], gatter: [{typ,x,y}], aus: ["Q"], fest: [[quelle, senke]], taster, ziel(bits) -> bits, bei(zustand) }
	// Quellen heißen "e0", "g0"; Senken "g0a", "g0b", "a0".
	function steckbrett(o) {
		const B = 326, H = o.hoehe || 220;
		const box = el("div", { class: "brett" });
		const svg = sv("svg", { viewBox: `0 0 ${B} ${H}`, role: "group", "aria-label": o.titel || "Steckbrett" }, box);
		const gDraht = sv("g", { class: "draehte" }, svg);
		const gTeil = sv("g", {}, svg);
		const status = meld(o.taster ? "Tippe S oder R an. Der Taster federt von selbst zurück." : "Tippe erst einen goldenen Ausgang an, dann einen Eingang. So ziehst du einen Draht.");
		const fest = !!o.fest && !o.frei;

		const ypos = (n, i) => (n === 1 ? H / 2 : H * 0.3 + (H * 0.4 * i) / (n - 1));
		const ein = o.ein.map((name, i) => ({ name, y: ypos(o.ein.length, i), wert: 0 }));
		const aus = o.aus.map((name, i) => ({ name, y: ypos(o.aus.length, i), wert: 0 }));
		const gat = o.gatter.map((g) => ({ ...g, wert: g.start || 0 }));
		const draht = {}; // senke -> quelle
		(o.fest || []).forEach(([q, s]) => { draht[s] = q; });
		let gewaehlt = null;

		const quellen = {}, senken = {};
		ein.forEach((e, i) => { quellen["e" + i] = { x: 52, y: e.y, name: `Ausgang von ${e.name}` }; });
		gat.forEach((g, i) => {
			quellen["g" + i] = { x: g.x + 36, y: g.y, name: `Ausgang von ${g.typ} ${i + 1}` };
			if (GATTER[g.typ].n === 1) senken[`g${i}a`] = { x: g.x - 36, y: g.y, name: `Eingang von ${g.typ} ${i + 1}` };
			else {
				senken[`g${i}a`] = { x: g.x - 36, y: g.y - 12, name: `oberer Eingang von ${g.typ} ${i + 1}` };
				senken[`g${i}b`] = { x: g.x - 36, y: g.y + 12, name: `unterer Eingang von ${g.typ} ${i + 1}` };
			}
		});
		aus.forEach((a, i) => { senken["a" + i] = { x: 284, y: a.y, name: `Lampe ${a.name}` }; });

		const wertVon = (q) => (q == null ? 0 : q[0] === "e" ? ein[+q.slice(1)].wert : gat[+q.slice(1)].wert);

		// Rechnet die Schaltung durch. Rückkopplungen pendeln sich in wenigen Runden ein.
		function rechne() {
			for (let r = 0; r < 8; r++) {
				gat.forEach((g, i) => {
					const a = wertVon(draht[`g${i}a`]);
					const b = wertVon(draht[`g${i}b`]);
					g.wert = GATTER[g.typ].f(a, b);
				});
			}
			aus.forEach((a, i) => { a.wert = wertVon(draht["a" + i]); });
		}

		// Prüft alle Eingangsmuster gegen das Ziel. Liefert Zeilen für die Wahrheitstafel.
		function pruefe() {
			if (!o.ziel) return null;
			const merk = ein.map((e) => e.wert), gm = gat.map((g) => g.wert);
			const zeilen = [];
			let ok = true;
			for (let m = 0; m < 1 << ein.length; m++) {
				ein.forEach((e, i) => { e.wert = (m >> (ein.length - 1 - i)) & 1; });
				gat.forEach((g) => { g.wert = 0; });
				rechne();
				const soll = o.ziel(ein.map((e) => e.wert));
				const ist = aus.map((a) => a.wert);
				const passt = soll.every((s, i) => s === ist[i]);
				if (!passt) ok = false;
				zeilen.push({ ein: ein.map((e) => e.wert), soll, ist, passt });
			}
			ein.forEach((e, i) => { e.wert = merk[i]; });
			gat.forEach((g, i) => { g.wert = gm[i]; });
			rechne();
			return { zeilen, ok };
		}

		const pinEl = {};
		function pin(id, p, art) {
			const g = sv("g", { class: `pin ${art}`, tabindex: fest ? null : 0, role: fest ? null : "button", "aria-label": p.name }, gTeil);
			sv("circle", { cx: p.x, cy: p.y, r: 13, class: "pin-feld" }, g);
			sv("circle", { cx: p.x, cy: p.y, r: 5.5, class: "pin-pad" }, g);
			sv("circle", { cx: p.x, cy: p.y, r: 2, class: "pin-loch" }, g);
			if (!fest) {
				const tu = () => (art === "quelle" ? waehleQuelle(id) : waehleSenke(id));
				g.addEventListener("click", tu);
				g.addEventListener("keydown", (ev) => {
					if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); tu(); }
				});
			}
			pinEl[id] = g;
		}

		function waehleQuelle(id) {
			gewaehlt = gewaehlt === id ? null : id;
			status.sag(gewaehlt ? `${quellen[id].name} gewählt. Tippe jetzt einen Eingang an.` : "Auswahl aufgehoben.");
			male();
		}
		function waehleSenke(id) {
			if (gewaehlt) {
				draht[id] = gewaehlt;
				status.sag(`Draht gezogen: ${quellen[gewaehlt].name} → ${senken[id].name}.`);
				gewaehlt = null;
			} else if (draht[id]) {
				delete draht[id];
				status.sag(`Draht an „${senken[id].name}“ gelöst.`);
			} else {
				status.sag("Wähle zuerst einen Ausgang. Das sind die Lötpunkte rechts an Schaltern und Chips.");
			}
			neu();
		}

		// feste Teile zeichnen
		const einEl = ein.map((e, i) => {
			const g = sv("g", { class: "b-ein", tabindex: 0, role: "button" }, gTeil);
			sv("rect", { x: 6, y: e.y - 17, width: 34, height: 34, rx: 5, class: "b-schalter" }, g);
			const t = sv("text", { x: 23, y: e.y + 1, class: "b-wert" }, g);
			const n = sv("text", { x: 23, y: e.y - 23, class: "b-name" }, g);
			n.textContent = e.name;
			sv("line", { x1: 40, y1: e.y, x2: 52, y2: e.y, class: "b-bein" }, g);
			const tu = () => {
				if (o.taster) {
					if (e.wert) return;
					e.wert = 1; neu();
					setTimeout(() => { e.wert = 0; neu(); o.losgelassen && o.losgelassen(i, z()); }, RUHIG ? 500 : 800);
				} else { e.wert = 1 - e.wert; neu(); }
			};
			g.addEventListener("click", tu);
			g.addEventListener("keydown", (ev) => {
				if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); tu(); }
			});
			return { g, t };
		});
		const gatEl = gat.map((g) => {
			const gg = sv("g", { class: "b-chip" }, gTeil);
			const zwei = GATTER[g.typ].n === 2;
			if (zwei) {
				sv("line", { x1: g.x - 36, y1: g.y - 12, x2: g.x - 24, y2: g.y - 12, class: "b-bein" }, gg);
				sv("line", { x1: g.x - 36, y1: g.y + 12, x2: g.x - 24, y2: g.y + 12, class: "b-bein" }, gg);
			} else sv("line", { x1: g.x - 36, y1: g.y, x2: g.x - 24, y2: g.y, class: "b-bein" }, gg);
			sv("line", { x1: g.x + 24, y1: g.y, x2: g.x + 36, y2: g.y, class: "b-bein" }, gg);
			sv("rect", { x: g.x - 24, y: g.y - 22, width: 48, height: 44, rx: 4, class: "b-gehaeuse" }, gg);
			sv("circle", { cx: g.x - 17, cy: g.y - 15, r: 2.2, class: "b-kerbe" }, gg);
			const t = sv("text", { x: g.x, y: g.y + 1, class: "b-typ" }, gg);
			t.textContent = g.typ;
			return gg;
		});
		const ausEl = aus.map((a) => {
			const g = sv("g", { class: "b-aus" }, gTeil);
			sv("line", { x1: 284, y1: a.y, x2: 296, y2: a.y, class: "b-bein" }, g);
			const l = sv("circle", { cx: 308, cy: a.y, r: 12, class: "b-lampe" }, g);
			const n = sv("text", { x: 308, y: a.y - 20, class: "b-name" }, g);
			n.textContent = a.name;
			return l;
		});
		for (const id in quellen) pin(id, quellen[id], "quelle");
		for (const id in senken) pin(id, senken[id], "senke");

		function male() {
			gDraht.textContent = "";
			for (const s in draht) {
				const q = quellen[draht[s]], z2 = senken[s];
				const rueck = z2.x < q.x + 10;
				const k = rueck ? 70 : Math.max(18, (z2.x - q.x) * 0.5);
				const dy = rueck ? (z2.y < q.y ? -34 : 34) : 0;
				const d = rueck
					? `M${q.x} ${q.y} C${q.x + k} ${q.y - dy} ${z2.x - k} ${z2.y + dy * 1.6} ${z2.x} ${z2.y}`
					: `M${q.x} ${q.y} C${q.x + k} ${q.y} ${z2.x - k} ${z2.y} ${z2.x} ${z2.y}`;
				sv("path", { d, class: "draht" + (wertVon(draht[s]) ? " an" : "") }, gDraht);
			}
			ein.forEach((e, i) => {
				einEl[i].t.textContent = e.wert;
				einEl[i].g.classList.toggle("an", !!e.wert);
				einEl[i].g.setAttribute("aria-label", `${o.taster ? "Taster" : "Schalter"} ${e.name}, steht auf ${e.wert}`);
			});
			gat.forEach((g, i) => gatEl[i].classList.toggle("an", !!g.wert));
			aus.forEach((a, i) => ausEl[i].classList.toggle("an", !!a.wert));
			for (const id in pinEl) {
				pinEl[id].classList.toggle("gewaehlt", id === gewaehlt);
				const an = id in quellen ? wertVon(id) : wertVon(draht[id]);
				pinEl[id].classList.toggle("an", !!an);
			}
			svg.classList.toggle("sucht", !!gewaehlt);
		}
		const z = () => ({ ein: ein.map((e) => e.wert), aus: aus.map((a) => a.wert), gat: gat.map((g) => g.wert) });
		function neu() {
			rechne();
			male();
			o.bei && o.bei(z(), pruefe());
		}

		box.appendChild(status);
		rechne(); male();
		return { el: box, pruefe, zustand: z, neu };
	}

	// Wahrheitstafel zum Steckbrett
	function tafel(namenEin, namenAus) {
		const t = el("table", { class: "wt" });
		t.zeig = (p) => {
			let h = `<thead><tr>${namenEin.map((n) => `<th>${n}</th>`).join("")}${namenAus.map((n) => `<th>${n} soll</th><th>${n} ist</th>`).join("")}<th><span class="sr">passt</span></th></tr></thead><tbody>`;
			p.zeilen.forEach((z2) => {
				h += `<tr class="${z2.passt ? "gut" : ""}">${z2.ein.map((b) => `<td>${b}</td>`).join("")}` +
					z2.soll.map((s, i) => `<td>${s}</td><td class="ist">${z2.ist[i]}</td>`).join("") +
					`<td class="hak">${z2.passt ? "✓" : "·"}</td></tr>`;
			});
			t.innerHTML = h + "</tbody>";
		};
		return t;
	}

	// ---------- Stufen, Seitenwechsel ----------
	const stufen = [];
	const ZONEN = [
		{ name: "Hardware", text: "Vom Schalter zum Rechner. Du baust alles aus dem einen Teil, das du gerade umgelegt hast." },
		{ name: "Software", text: "Der Rechner steht. Jetzt sagst du ihm, was er tun soll, und zwar so, dass es schnell geht." },
		{ name: "Vernetzt", text: "Rechner reden miteinander, halten Geheimnisse und lernen aus Beispielen." },
	];
	let raeumer = [];
	const aufraeumen = () => { raeumer.forEach((f) => f()); raeumer = []; };

	function malePlatine() {
		const ziel = document.getElementById("platine");
		ziel.textContent = "";
		ZONEN.forEach((zone, zi) => {
			const sec = el("section", { class: "zone" });
			sec.appendChild(el("h3", {}, zone.name));
			sec.appendChild(el("p", {}, zone.text));
			const ol = el("ol", { class: "chips" });
			stufen.forEach((s, i) => {
				if (s.zone !== zi) return;
				const z = stand.quiz[s.id] ? "geprueft" : stand.bau[s.id] ? "gebaut" : "leer";
				const wort = { geprueft: "eingelötet und geprüft", gebaut: "gebaut, Prüfung offen", leer: "noch nicht gebaut" }[z];
				const li = el("li");
				li.appendChild(el("a", { class: "chip", href: "#" + s.id, "data-z": z },
					`<span class="ref">U${zwei(i + 1)}</span><b>${s.name}</b><small>${s.kurz}</small><i class="led" aria-hidden="true"></i><span class="sr">, ${wort}</span>`));
				ol.appendChild(li);
			});
			sec.appendChild(ol);
			ziel.appendChild(sec);
		});
		const n = stufen.filter((s) => stand.quiz[s.id]).length;
		document.querySelectorAll(".zaehler").forEach((e) => { e.textContent = `${n} von ${stufen.length} Bausteinen geprüft`; });
		const fertig = document.getElementById("bestueckt");
		if (fertig) fertig.hidden = n < stufen.length;
	}

	function zeige() {
		aufraeumen();
		const id = location.hash.slice(1);
		const i = stufen.findIndex((s) => s.id === id);
		const titel = document.getElementById("titelseite");
		const art = document.getElementById("stufe");
		if (i < 0) {
			titel.hidden = false; art.hidden = true;
			malePlatine();
			document.title = "Die Platine: Informatik — Newbobb Lab";
			if (id === "platine") document.getElementById("platine-kopf").scrollIntoView();
			return;
		}
		const s = stufen[i];
		titel.hidden = true; art.hidden = false;
		art.textContent = "";
		document.title = `${s.name} · Die Platine — Newbobb Lab`;

		const kopf = el("header", { class: "s-kopf" });
		kopf.innerHTML = `<p class="s-weg"><a href="#platine">← zur Platine</a><span>${ZONEN[s.zone].name} · U${zwei(i + 1)} von ${stufen.length}</span></p><h1 tabindex="-1">${s.name}</h1>`;
		art.appendChild(kopf);
		art.appendChild(el("section", { class: "auftrag" }, s.frage));

		const bank = el("section", { class: "bank", "aria-labelledby": "h-bank" });
		bank.appendChild(el("h2", { id: "h-bank" }, "Werkbank"));
		const feld = el("div", { class: "feld" });
		bank.appendChild(feld);
		const gebaut = el("p", { class: "gebaut", role: "status", "aria-live": "polite", hidden: true });
		bank.appendChild(gebaut);
		art.appendChild(bank);

		const blatt = el("section", { class: "blatt", "aria-labelledby": "h-blatt" });
		art.appendChild(blatt);
		const pruef = el("section", { class: "pruef", "aria-labelledby": "h-pruef" });
		art.appendChild(pruef);

		function oeffne() {
			blatt.classList.remove("zu");
			blatt.innerHTML = `<p class="b-zeile"><span>Datenblatt U${zwei(i + 1)}</span><span>Newbobb Lab</span></p><h2 id="h-blatt">${s.blatt || "Was du gerade gebaut hast"}</h2>${s.warum}<p class="merke"><b>Merke</b> ${s.merke}</p>${s.mehr ? `<p class="mehr">${s.mehr}</p>` : ""}`;
			pruef.classList.remove("zu");
			pruef.textContent = "";
			pruef.appendChild(el("h2", { id: "h-pruef" }, "Prüfung"));
			pruef.appendChild(el("p", { class: "p-frage" }, s.quiz.f));
			const wahl = el("div", { class: "p-wahl" });
			const aus = meld(stand.quiz[s.id] ? "Schon bestanden. Die Lampe an diesem Baustein leuchtet." : "");
			if (stand.quiz[s.id]) aus.dataset.art = "gut";
			s.quiz.a.forEach((a, k) => {
				const b = knopf(a, () => {
					wahl.querySelectorAll("button").forEach((x) => x.removeAttribute("data-r"));
					if (k === s.quiz.r) {
						b.dataset.r = "ja";
						stand.quiz[s.id] = true; sichern();
						aus.sag(`<b>Richtig.</b> ${s.quiz.e} Der Baustein ist eingelötet.`, "gut");
						weiter.classList.add("bereit");
					} else {
						b.dataset.r = "nein";
						aus.sag("Noch nicht. Schau noch einmal ins Datenblatt oder probier es an der Werkbank aus.", "schlecht");
					}
				}, "wahl");
				wahl.appendChild(b);
			});
			pruef.append(wahl, aus);
		}
		function versiegle() {
			blatt.classList.add("zu");
			blatt.innerHTML = `<h2 id="h-blatt">Datenblatt</h2><p>Liegt bereit, sobald dein Aufbau an der Werkbank funktioniert.</p>`;
			pruef.classList.add("zu");
			pruef.innerHTML = `<h2 id="h-pruef">Prüfung</h2><p>Kommt nach dem Datenblatt.</p>`;
		}

		const nav = el("nav", { class: "s-nav", "aria-label": "Baustufen" });
		const vor = stufen[i - 1], nach = stufen[i + 1];
		nav.innerHTML = (vor ? `<a href="#${vor.id}">← ${vor.name}</a>` : `<a href="#platine">← zur Platine</a>`) +
			(nach ? `<a class="weiter" href="#${nach.id}">${nach.name} →</a>` : `<a class="weiter" href="#platine">Fertige Platine ansehen →</a>`);
		art.appendChild(nav);
		const weiter = nav.querySelector(".weiter");
		if (stand.quiz[s.id]) weiter.classList.add("bereit");

		if (stand.bau[s.id]) oeffne(); else versiegle();

		const api = {
			feld,
			fertig(text) {
				gebaut.hidden = false;
				gebaut.innerHTML = `<b>Funktioniert.</b> ${text || ""} <a href="#h-blatt">Zum Datenblatt</a>`;
				if (!stand.bau[s.id]) { stand.bau[s.id] = true; sichern(); oeffne(); }
			},
			spaeter(fn, ms) { const t = setTimeout(fn, ms); raeumer.push(() => clearTimeout(t)); return t; },
			takt(fn, ms) { const t = setInterval(fn, ms); raeumer.push(() => clearInterval(t)); return t; },
			raeume(fn) { raeumer.push(fn); },
		};
		s.bau(api);
		window.scrollTo(0, 0);
		kopf.querySelector("h1").focus({ preventScroll: true });
	}

	// ---------- Auftakt: der erste Schalter ----------
	function auftakt() {
		const ort = document.getElementById("ur");
		if (!ort) return;
		const lampe = el("span", { class: "ur-lampe", "aria-hidden": "true" });
		const text = el("p", { class: "ur-text", role: "status", "aria-live": "polite" });
		const s = schalter("Der erste Schalter", 0, (an) => {
			lampe.classList.toggle("an", an);
			document.body.classList.toggle("strom", an);
			text.innerHTML = an
				? "<b>An. Das ist die 1.</b> Mehr als an und aus kann ein Computer nicht unterscheiden. Alles andere baust du jetzt daraus."
				: "<b>Aus. Das ist die 0.</b> Leg den Schalter um.";
		});
		s.el.classList.add("gross");
		text.innerHTML = "<b>Aus. Das ist die 0.</b> Leg den Schalter um.";
		const zeile = el("div", { class: "ur-zeile" });
		zeile.append(s.el, el("span", { class: "ur-bahn", "aria-hidden": "true" }), lampe);
		ort.append(zeile, text);
	}

	window.PL = {
		stufe: (s) => stufen.push(s),
		el, sv, de, schalter, reihe, knopf, meld, auftraege, regler, steckbrett, tafel, GATTER, RUHIG,
	};

	document.addEventListener("DOMContentLoaded", () => {
		auftakt();
		zeige();
		window.addEventListener("hashchange", zeige);
	});
})();
