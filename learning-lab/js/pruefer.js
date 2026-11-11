// AI Learning Lab · Übungsformate mit automatischer Prüfung.
// Alles läuft im Browser gegen hinterlegte Lösungen und Regeln. Es wird kein Sprachmodell aufgerufen.
window.LabUebung = (() => {
	"use strict";
	const { esc, inline, render } = window.LabMd;
	const txt = (v) => (Array.isArray(v) ? v.join("\n") : v || "");

	// ---------- Prüf-Baustein für Artefakte ----------
	// Schnittstelle: (text, regeln) -> [{ name, ok, hinweis, verweis }]
	// Standard ist regelbasiert. Eine spätere LLM-Bewertung ersetzt nur diese eine Funktion.
	function pruefeArtefaktRegelbasiert(text, regeln) {
		return regeln.map((r) => {
			let ok = true;
			if (r.art === "muster" || r.art === "verboten") {
				const treffer = (text.match(new RegExp(r.muster, "gim")) || []).length;
				ok = r.art === "muster" ? treffer >= (r.min || 1) : treffer === 0;
			} else if (r.art === "laenge") {
				const woerter = text.trim().split(/\s+/).filter(Boolean).length;
				const zeilen = text.split(/\n/).filter((z) => z.trim()).length;
				if (r.minWoerter && woerter < r.minWoerter) ok = false;
				if (r.maxWoerter && woerter > r.maxWoerter) ok = false;
				if (r.maxZeilen && zeilen > r.maxZeilen) ok = false;
			}
			return { name: r.name, ok, hinweis: r.hinweis, verweis: r.verweis };
		});
	}
	const bausteine = { artefakt: pruefeArtefaktRegelbasiert };

	// ---------- Gemeinsames ----------
	function zufall(seed) {
		let a = 0;
		for (const c of seed) a = (Math.imul(a, 31) + c.charCodeAt(0)) | 0;
		return () => {
			a = (a + 0x6d2b79f5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	function mischen(liste, seed) {
		const r = zufall(seed);
		const a = liste.slice();
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(r() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	const NAMEN = {
		entscheidung: "Szenario-Entscheidung",
		reihenfolge: "Reihenfolge",
		session: "Simulierte Agent-Session",
		fehler: "Fehler finden",
		artefakt: "Artefakt schreiben",
		handson: "Hands-on im echten Repo",
	};

	function verweisHtml(v) {
		if (!v) return "";
		if (v.startsWith("modul:")) return ` <a class="sprung" href="#/modul/${esc(v.slice(6))}">Zum passenden Modul →</a>`;
		const name = { warum: "Warum", konzept: "Konzept", tool: "So geht es in deinem Tool" }[v] || v;
		return ` <button type="button" class="sprung" data-sprung="${esc(v)}">Nachlesen: ${esc(name)} ↑</button>`;
	}

	function feedback(el, ok, kopf, punkte) {
		const box = el.querySelector(".ue-feedback");
		box.className = "ue-feedback " + (ok ? "ist-gut" : "ist-offen");
		box.innerHTML =
			`<p class="ue-urteil">${ok ? "✓" : "↻"} ${esc(kopf)}</p>` +
			(punkte && punkte.length
				? `<ul>${punkte
						.map((p) => `<li class="${p.ok ? "gut" : "offen"}"><span aria-hidden="true">${p.ok ? "✓" : "✗"}</span><span>${p.html || inline(p.text)}${p.ok ? "" : verweisHtml(p.verweis)}</span></li>`)
						.join("")}</ul>`
				: "");
	}

	function rahmen(el, def) {
		el.innerHTML = `<div class="ue-kopf"><span class="ue-typ">Übung · ${esc(NAMEN[def.typ] || def.typ)}</span><span class="ue-status" hidden>bestanden</span></div>
			<h3>${inline(def.titel || "Übung")}</h3>
			${def.aufgabe ? `<div class="ue-aufgabe">${render(txt(def.aufgabe)).html}</div>` : ""}
			<div class="ue-koerper"></div>
			<div class="ue-aktionen"></div>
			<div class="ue-feedback" role="status" aria-live="polite"></div>`;
		return { koerper: el.querySelector(".ue-koerper"), aktionen: el.querySelector(".ue-aktionen") };
	}

	// ---------- Szenario-Entscheidung ----------
	function entscheidung(el, def, ctx) {
		const { koerper, aktionen } = rahmen(el, def);
		const fragen = def.fragen.map((f, fi) => ({ ...f, opts: mischen(f.optionen.map((o, oi) => ({ ...o, oi })), ctx.id + fi) }));
		koerper.innerHTML = fragen
			.map(
				(f, fi) => `<fieldset class="ue-frage" data-f="${fi}">
				<legend>${fragen.length > 1 ? `<b>${fi + 1}.</b> ` : ""}${inline(f.frage)}${f.mehrfach ? " <em>(mehrere möglich)</em>" : ""}</legend>
				${f.opts
					.map(
						(o, k) => `<label class="ue-opt"><input type="${f.mehrfach ? "checkbox" : "radio"}" name="${ctx.id}-f${fi}" value="${k}" />
					<span><span class="ue-opt-text">${inline(o.text)}</span><span class="ue-erkl" hidden></span></span></label>`,
					)
					.join("")}
			</fieldset>`,
			)
			.join("");
		aktionen.innerHTML = `<button type="button" class="knopf">Prüfen</button>`;
		aktionen.firstChild.addEventListener("click", () => {
			let alleOk = true;
			let offen = 0;
			const punkte = [];
			fragen.forEach((f, fi) => {
				const fs = koerper.querySelector(`[data-f="${fi}"]`);
				const inputs = [...fs.querySelectorAll("input")];
				const gewaehlt = inputs.filter((x) => x.checked).map((x) => Number(x.value));
				if (!gewaehlt.length) {
					offen++;
					alleOk = false;
					return;
				}
				const richtig = f.opts.every((o, k) => !!o.richtig === gewaehlt.includes(k));
				if (!richtig) alleOk = false;
				inputs.forEach((inp, k) => {
					const o = f.opts[k];
					const lab = inp.closest("label");
					const zeigen = gewaehlt.includes(k) || richtig;
					lab.classList.toggle("ist-richtig", zeigen && !!o.richtig);
					lab.classList.toggle("ist-falsch", gewaehlt.includes(k) && !o.richtig);
					const erkl = lab.querySelector(".ue-erkl");
					erkl.hidden = !(zeigen && o.erklaerung);
					erkl.innerHTML = o.erklaerung ? inline(o.erklaerung) : "";
				});
				if (!richtig)
					punkte.push({
						ok: false,
						text: `${fragen.length > 1 ? `Frage ${fi + 1}: ` : ""}${f.mehrfach ? "Die Auswahl stimmt noch nicht ganz." : "Diese Wahl führt nicht zum besten Ergebnis."} Lies die Erklärung an deiner Antwort und wähle neu.`,
						verweis: f.verweis || def.verweis,
					});
			});
			if (offen) punkte.unshift({ ok: false, text: `${offen === 1 ? "Eine Frage ist" : offen + " Fragen sind"} noch unbeantwortet.` });
			feedback(el, alleOk, alleOk ? def.fazit || "Richtig. Die Erklärungen stehen jetzt an allen Optionen." : "Noch nicht ganz.", punkte);
			ctx.melde(alleOk);
		});
	}

	// ---------- Reihenfolge ----------
	function reihenfolge(el, def, ctx) {
		const { koerper, aktionen } = rahmen(el, def);
		let liste = mischen(def.schritte.map((t, i) => ({ t, i })), ctx.id);
		if (liste.every((x, k) => x.i === k)) liste.reverse();
		const zeichne = (fokus) => {
			koerper.innerHTML = `<ol class="ue-reihe">${liste
				.map(
					(x, k) => `<li data-k="${k}"><span class="ue-reihe-text">${inline(x.t)}</span>
					<span class="ue-reihe-knoepfe"><button type="button" data-dir="-1" aria-label="Schritt ${k + 1} nach oben" ${k === 0 ? "disabled" : ""}>↑</button><button type="button" data-dir="1" aria-label="Schritt ${k + 1} nach unten" ${k === liste.length - 1 ? "disabled" : ""}>↓</button></span></li>`,
				)
				.join("")}</ol>`;
			if (fokus) {
				const b = koerper.querySelector(`li[data-k="${fokus.k}"] button[data-dir="${fokus.dir}"]`);
				(b && !b.disabled ? b : koerper.querySelector(`li[data-k="${fokus.k}"] button:not([disabled])`))?.focus();
			}
		};
		koerper.addEventListener("click", (e) => {
			const b = e.target.closest("button[data-dir]");
			if (!b) return;
			const k = Number(b.closest("li").dataset.k);
			const dir = Number(b.dataset.dir);
			[liste[k], liste[k + dir]] = [liste[k + dir], liste[k]];
			zeichne({ k: k + dir, dir });
		});
		zeichne();
		aktionen.innerHTML = `<button type="button" class="knopf">Prüfen</button>`;
		aktionen.firstChild.addEventListener("click", () => {
			const falsch = liste.findIndex((x, k) => x.i !== k);
			const ok = falsch < 0;
			[...koerper.querySelectorAll("li")].forEach((li, k) => li.classList.toggle("ist-richtig", liste[k].i === k));
			feedback(
				el,
				ok,
				ok ? def.fazit || "Die Reihenfolge stimmt." : "Die Reihenfolge stimmt noch nicht.",
				ok ? [] : [{ ok: false, text: `Ab Position ${falsch + 1} passt es nicht mehr. ${def.tipp || ""}`, verweis: def.verweis }],
			);
			ctx.melde(ok);
		});
	}

	// ---------- Simulierte Agent-Session ----------
	function session(el, def, ctx) {
		const { koerper, aktionen } = rahmen(el, def);
		koerper.innerHTML = `<div class="ue-session" role="log" aria-live="polite" aria-label="Simulierte Agent-Session"></div><div class="ue-wahl"></div>`;
		const log = koerper.firstChild;
		const wahl = koerper.lastChild;
		const zeige = (id) => {
			const k = def.knoten[id];
			log.insertAdjacentHTML("beforeend", `<div class="sitz sitz-agent"><span class="sitz-wer">Agent · vorgefertigt</span>${render(txt(k.agent)).html}</div>`);
			if (k.ende) {
				const gut = k.ende === "gut";
				wahl.innerHTML = "";
				feedback(el, gut, gut ? "Dieser Weg führt zu einem guten Ergebnis." : "Dieser Weg endet in einer Sackgasse.", [{ ok: gut, text: k.fazit || "", verweis: k.verweis || def.verweis }]);
				aktionen.innerHTML = `<button type="button" class="knopf ${gut ? "knopf-leise" : ""}">${gut ? "Andere Wege ausprobieren" : "Noch einmal von vorn"}</button>`;
				aktionen.firstChild.addEventListener("click", start);
				ctx.melde(gut);
				return;
			}
			const opts = mischen(k.optionen, ctx.id + id);
			wahl.innerHTML = `<p class="ue-wahl-titel">Dein nächster Prompt:</p>${opts.map((o, i) => `<button type="button" class="ue-prompt" data-i="${i}">${inline(o.prompt)}</button>`).join("")}`;
			wahl.onclick = (e) => {
				const b = e.target.closest(".ue-prompt");
				if (!b) return;
				const o = opts[Number(b.dataset.i)];
				log.insertAdjacentHTML("beforeend", `<div class="sitz sitz-du"><span class="sitz-wer">Du</span><p>${inline(o.prompt)}</p></div>`);
				if (o.kommentar) log.insertAdjacentHTML("beforeend", `<p class="sitz-notiz">${inline(o.kommentar)}</p>`);
				zeige(o.ziel);
				wahl.querySelector("button")?.focus();
			};
		};
		function start() {
			log.innerHTML = "";
			aktionen.innerHTML = "";
			const fb = el.querySelector(".ue-feedback");
			fb.innerHTML = "";
			fb.className = "ue-feedback";
			zeige(def.start);
		}
		start();
	}

	// ---------- Fehler finden ----------
	function fehler(el, def, ctx) {
		const { koerper, aktionen } = rahmen(el, def);
		let nr = 0;
		const zeilen = def.zeilen.map((z) => {
			const istFehler = z.startsWith("!!");
			return { t: istFehler ? z.slice(2).replace(/^ /, "") : z, f: istFehler ? def.fehler[nr++] : null };
		});
		const anzahl = zeilen.filter((z) => z.f).length;
		koerper.innerHTML = `<p class="ue-hinweis">Markiere jede Zeile, die gegen die Kriterien verstößt. Es sind <b>${anzahl}</b> Stellen versteckt.</p>
			<div class="ue-zeilen" role="group" aria-label="${esc(def.titel || "Agent-Output")}">${zeilen
				.map((z, i) => (z.t.trim() ? `<button type="button" class="ue-zeile" aria-pressed="false" data-i="${i}"><span class="ue-znr" aria-hidden="true">${i + 1}</span><code>${esc(z.t)}</code></button>` : `<span class="ue-zeile ue-leer" aria-hidden="true"></span>`))
				.join("")}</div>`;
		koerper.addEventListener("click", (e) => {
			const b = e.target.closest("button.ue-zeile");
			if (!b) return;
			b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true");
			b.classList.remove("ist-richtig", "ist-falsch");
		});
		let versuche = 0;
		const pruefe = (aufloesen) => {
			versuche++;
			const punkte = [];
			let gefunden = 0;
			let daneben = 0;
			koerper.querySelectorAll("button.ue-zeile").forEach((b) => {
				const z = zeilen[Number(b.dataset.i)];
				const an = b.getAttribute("aria-pressed") === "true";
				b.classList.remove("ist-richtig", "ist-falsch", "ist-loesung");
				if (an && z.f) {
					gefunden++;
					b.classList.add("ist-richtig");
					punkte.push({ ok: true, text: `Zeile ${Number(b.dataset.i) + 1}: ${z.f.warum}` });
				} else if (an && !z.f) {
					daneben++;
					b.classList.add("ist-falsch");
				} else if (aufloesen && z.f) {
					b.classList.add("ist-loesung");
					punkte.push({ ok: false, text: `Zeile ${Number(b.dataset.i) + 1} (übersehen): ${z.f.warum}`, verweis: z.f.verweis || def.verweis });
				}
			});
			const ok = gefunden === anzahl && daneben <= (def.toleranz ?? 1);
			if (!ok && !aufloesen) {
				const fehlt = anzahl - gefunden;
				if (fehlt) {
					const tipps = zeilen.filter((z) => z.f && z.f.tipp).map((z) => z.f.tipp);
					punkte.push({ ok: false, text: `${fehlt === 1 ? "Eine Stelle fehlt" : fehlt + " Stellen fehlen"} noch.${def.tipp ? " " + def.tipp : tipps.length ? " Tipp: " + tipps[(versuche - 1) % tipps.length] : ""}`, verweis: def.verweis });
				}
				if (daneben) punkte.push({ ok: false, text: `${daneben === 1 ? "Eine markierte Zeile ist" : daneben + " markierte Zeilen sind"} in Ordnung (rot umrandet). Zu viel zu beanstanden kostet im Review genauso Zeit.` });
			}
			feedback(el, ok, ok ? def.fazit || "Alle Stellen gefunden." : aufloesen ? "Auflösung: So hätte ein gründlicher Blick ausgesehen." : `${gefunden} von ${anzahl} gefunden.`, punkte);
			if (!aufloesen) ctx.melde(ok);
			if (!ok && versuche >= 2 && !aktionen.querySelector(".knopf-leise")) {
				aktionen.insertAdjacentHTML("beforeend", `<button type="button" class="knopf knopf-leise">Auflösung zeigen</button>`);
				aktionen.lastChild.addEventListener("click", () => pruefe(true));
			}
		};
		aktionen.innerHTML = `<button type="button" class="knopf">Prüfen</button>`;
		aktionen.firstChild.addEventListener("click", () => pruefe(false));
	}

	// ---------- Artefakt schreiben ----------
	function artefakt(el, def, ctx) {
		const { koerper, aktionen } = rahmen(el, def);
		const key = "ailab.entwurf." + ctx.id;
		let start = txt(def.vorlage);
		try {
			start = localStorage.getItem(key) ?? start;
		} catch {}
		koerper.innerHTML = `<label class="ue-editor"><span>${esc(def.dateiname || "Dein Text")}</span>
			<textarea rows="${def.zeilen || 14}" spellcheck="false" aria-describedby="${ctx.id}-regeln"></textarea></label>
			<details class="ue-regeln" id="${ctx.id}-regeln"><summary>Was geprüft wird (${def.regeln.length} Regeln, ohne Sprachmodell)</summary><ul>${def.regeln.map((r) => `<li>${inline(r.name)}</li>`).join("")}</ul></details>`;
		const ta = koerper.querySelector("textarea");
		ta.value = start;
		ta.addEventListener("input", () => {
			try {
				localStorage.setItem(key, ta.value);
			} catch {}
		});
		aktionen.innerHTML = `<button type="button" class="knopf">Prüfen</button><button type="button" class="knopf knopf-leise">Zurücksetzen</button>`;
		aktionen.lastChild.addEventListener("click", () => {
			ta.value = txt(def.vorlage);
			ta.dispatchEvent(new Event("input"));
			ta.focus();
		});
		aktionen.firstChild.addEventListener("click", () => {
			const ergebnis = bausteine.artefakt(ta.value, def.regeln);
			const ok = ergebnis.every((r) => r.ok);
			const offen = ergebnis.filter((r) => !r.ok).length;
			feedback(
				el,
				ok,
				ok ? def.fazit || "Alle Pflichtbestandteile sind da." : `${offen === 1 ? "Ein Kriterium fehlt" : offen + " Kriterien fehlen"} noch.`,
				ergebnis.map((r) => ({ ok: r.ok, text: r.ok ? r.name : `**${r.name}:** ${r.hinweis}`, verweis: r.verweis })),
			);
			ctx.melde(ok);
		});
	}

	// ---------- Hands-on: Verweis auf die Challenge im echten Repo ----------
	function handson(el, def, ctx) {
		const { koerper } = rahmen(el, def);
		koerper.innerHTML = `<p>${inline(def.text || "Diese Übung löst du mit deinem eigenen Tool in einem geforkten Übungs-Repo. Die Pipeline im Repo prüft das Ergebnis.")}</p>
			<p><a class="knopf" href="#/challenge/${esc(def.challenge)}">Zur Hands-on-Aufgabe →</a></p>`;
		if (ctx.challengeOk && ctx.challengeOk(def.challenge)) ctx.melde(true, true);
	}

	const TYPEN = { entscheidung, reihenfolge, session, fehler, artefakt, handson };

	function starte(el, quelle, ctx) {
		let def;
		try {
			def = JSON.parse(quelle);
		} catch (e) {
			el.innerHTML = `<p class="ue-defekt">Diese Übung lässt sich nicht lesen (JSON-Fehler: ${esc(e.message)}).</p>`;
			return null;
		}
		const fn = TYPEN[def.typ];
		if (!fn) {
			el.innerHTML = `<p class="ue-defekt">Unbekanntes Übungsformat „${esc(def.typ)}“.</p>`;
			return null;
		}
		fn(el, def, ctx);
		return def;
	}

	return { starte, bausteine, NAMEN };
})();
