// AI Learning Lab · Plattform: lädt Katalog und Module aus content/, zeigt Karte, Einstufung, Module,
// Challenge, Tourenbuch und Leitstelle. Inhalte kommen vollständig aus content/, hier steht kein Lernstoff.
(() => {
	"use strict";
	const { esc, inline, render } = window.LabMd;
	const main = document.getElementById("inhalt");
	const $ = (s, el = document) => el.querySelector(s);
	const $$ = (s, el = document) => [...el.querySelectorAll(s)];
	const heute = () => new Date().toISOString().slice(0, 10);
	const datum = (iso) => (iso ? iso.slice(0, 10).split("-").reverse().join(".") : "–");
	const tageSeit = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
	const txt = (v) => (Array.isArray(v) ? v.join("\n") : v || "");

	// ---------- Fortschritt: nur in diesem Browser ----------
	const KEY = "ailab.v1";
	const leer = () => ({ profil: null, einstufung: null, stufe: null, module: {}, uebungen: {}, challenges: {}, feedback: {}, impulse: {}, events: [] });
	let S = leer();
	try {
		S = Object.assign(leer(), JSON.parse(localStorage.getItem(KEY) || "{}"));
	} catch {}
	const sichern = () => {
		try {
			localStorage.setItem(KEY, JSON.stringify(S));
		} catch {}
		kopfStand();
	};
	// Ereignisse sind die Grundlage für Abbruchstellen. Sie enthalten keine Namen und verlassen den Browser nicht.
	const merke = (typ, id, ok) => {
		S.events.push({ t: heute(), typ, id, ...(ok === undefined ? {} : { ok }) });
		if (S.events.length > 400) S.events.splice(0, S.events.length - 400);
	};

	// ---------- Inhalte ----------
	let K = null; // Katalog
	const M = {}; // Module nach id
	async function lade() {
		const hole = async (pfad, alsJson) => {
			const r = await fetch(pfad, { cache: "no-cache" });
			if (!r.ok) throw new Error(pfad + " (" + r.status + ")");
			return alsJson ? r.json() : r.text();
		};
		K = await hole("./content/katalog.json", true);
		const ids = K.stufen.flatMap((s) => s.module);
		const texte = await Promise.all(ids.map((id) => hole(`./content/module/${id}.md`).catch(() => null)));
		ids.forEach((id, i) => {
			if (!texte[i]) return;
			const m = window.LabMd.modul(texte[i]);
			m.id = id;
			m.stufe = K.stufen.find((s) => s.module.includes(id)).nr;
			m.uebungen = m.abschnitte.reduce((n, a) => n + (a.text.match(/^```uebung/gm) || []).length, 0);
			M[id] = m;
		});
	}
	const stufe = (nr) => K.stufen.find((s) => s.nr === Number(nr));
	const toolName = (id) => K.tools.find((t) => t.id === id)?.name || id;
	const klasse = (id) => K.schutzklassen.find((k) => k.id === id);
	// In Export Controlled und VS-NfD ist nur OpenCode mit selbst gehosteten Modellen erlaubt
	function meinTool() {
		const p = S.profil;
		if (!p) return K.tools[0].id;
		const erlaubt = klasse(p.klasse)?.tools || [];
		return erlaubt.includes(p.tool) ? p.tool : erlaubt[0] || p.tool;
	}
	const selbstGehostet = () => !!S.profil && S.profil.klasse !== "cloud";
	const modulFertig = (id) => !!S.module[id]?.erledigt;
	const challengeOk = (id) => !!S.challenges[id]?.ok;
	const abzeichen = (nr) => {
		const c = stufe(nr).challenge;
		return c && challengeOk(c.id) ? S.challenges[c.id].datum : null;
	};

	function kopfStand() {
		const el = $("#kopfStand");
		if (!K) return;
		el.innerHTML = S.stufe
			? `<a href="#/tourenbuch" title="Dein Stand: zum Tourenbuch"><b>P${S.stufe}</b>${S.profil ? ` · ${esc(toolName(meinTool()))} · ${esc(klasse(S.profil.klasse)?.name || "")}` : ""}</a>`
			: `<a href="#/einstufung">Noch nicht eingestuft</a>`;
	}

	// ---------- Karte (Startseite) ----------
	const ORTE = [
		{ x: 150, y: 452 },
		{ x: 345, y: 378 },
		{ x: 505, y: 268 },
		{ x: 648, y: 118 },
	];
	function karteSvg() {
		let linien = "";
		for (let k = 1; k <= 12; k++) {
			const r = k * 36;
			const cx = 648 - k * 15;
			const cy = 118 + k * 13;
			let d = "";
			for (let i = 0; i <= 72; i++) {
				const a = (i / 72) * Math.PI * 2;
				const rr = r * (1 + 0.16 * Math.sin(3 * a + k * 0.55) + 0.09 * Math.sin(5 * a + 1.3 + k * 0.3));
				d += `${i ? "L" : "M"}${(cx + rr * 1.45 * Math.cos(a)).toFixed(1)} ${(cy + rr * 0.78 * Math.sin(a)).toFixed(1)}`;
			}
			linien += `<path d="${d}Z" class="${k % 4 === 0 ? "hoehe hoehe-stark" : "hoehe"}" />`;
		}
		const lager = K.stufen
			.map((s, i) => {
				const o = ORTE[i];
				const zustand = abzeichen(s.nr) ? "geschafft" : S.stufe === s.nr ? "hier" : "";
				const links = i === 3;
				return `<a href="#/stufe/${s.nr}" class="lager ${zustand}" aria-label="P${s.nr} ${esc(s.name)}, ${esc(s.ort)}${zustand === "hier" ? ", dein Standort" : zustand ? ", geschafft" : ""}">
					<circle cx="${o.x}" cy="${o.y}" r="27" />
					<text x="${o.x}" y="${o.y + 9}" text-anchor="middle" class="lager-nr">P${s.nr}</text>
					<g class="lager-schild"><text x="${o.x + (links ? -40 : 40)}" y="${o.y - 6}" text-anchor="${links ? "end" : "start"}" class="lager-ort">${esc(s.ort)}</text>
					<text x="${o.x + (links ? -40 : 40)}" y="${o.y + 18}" text-anchor="${links ? "end" : "start"}" class="lager-name">${esc(s.name)}</text></g>
				</a>`;
			})
			.join("");
		return `<svg class="karte" viewBox="0 0 900 520" role="group" aria-label="Karte: der Weg von P1 im Basislager bis P4 auf dem Gipfel">
			<g aria-hidden="true">${linien}
			<path class="route" d="M40 486 Q105 474 150 452 C235 412 255 400 345 378 C435 356 445 300 505 268 C565 238 598 190 648 118" />
			<path class="fahne" d="M648 91V52l26 9-26 9" />
			<g class="nordpfeil" transform="translate(842 452)"><path d="M0 26V-22M0-22l-8 14M0-22l8 14" /><text y="-30" text-anchor="middle">N</text></g>
			<text x="40" y="508" class="massstab">Maßstab: 1 Modul ≈ 15–30 Minuten</text></g>
			${lager}
		</svg>`;
	}

	function zeigeStart() {
		const eingestuft = !!S.stufe;
		main.innerHTML = `
		<section class="held">
			<div class="held-text">
				<p class="marke">Agentic Maturity · P1 bis P4</p>
				<h1 tabindex="-1">Vom kurzen Zuruf bis zum Agent, der ohne dich arbeitet.</h1>
				<p class="vorspann">Vier Stufen, kurze Module, Übungen mit sofortiger Prüfung. Du steigst dort ein, wo du
					wirklich stehst, und kommst nur mit einer bestandenen Hands-on-Challenge eine Stufe höher.</p>
				<p class="held-knoepfe">
					${eingestuft ? `<a class="knopf" href="#/stufe/${S.stufe}">Weiter auf P${S.stufe} · ${esc(stufe(S.stufe).name)} →</a><a class="knopf knopf-leise" href="#/tourenbuch">Tourenbuch</a>` : `<a class="knopf" href="#/einstufung">Standort bestimmen · 10 Minuten →</a><a class="knopf knopf-leise" href="#stufen">Ich kenne meine Stufe</a>`}
				</p>
			</div>
			${karteSvg()}
		</section>
		<section class="stufen" id="stufen" aria-label="Die vier Stufen">
			${K.stufen
				.map(
					(s) => `<a class="stufenkarte ${S.stufe === s.nr ? "hier" : ""}" href="#/stufe/${s.nr}">
					<span class="stufen-nr">P${s.nr}</span>
					<span class="stufen-ort">${esc(s.ort)}${S.stufe === s.nr ? " · dein Standort" : ""}${abzeichen(s.nr) ? " · geschafft ✓" : ""}</span>
					<h2>${esc(s.name)}</h2>
					<p class="stufen-frage">„${esc(s.kernfrage)}“</p>
					<p>${esc(s.verhalten)}</p>
					${s.grenze ? `<p class="stufen-grenze"><b>Grenze:</b> ${esc(s.grenze)}</p>` : `<p class="stufen-grenze"><b>Ziel:</b> Agents arbeiten autonom im SDLC.</p>`}
				</a>`,
				)
				.join("")}
		</section>
		<section class="prinzipien" aria-label="So lernst du hier">
			<div><h3>Tun statt zuschauen</h3><p>Keine Videos. Jedes Modul hat eine Übung, die sofort geprüft wird und dir
				sagt, welches Kriterium fehlt.</p></div>
			<div><h3>Dein Tool, deine Schutzklasse</h3><p>Jedes Modul lässt sich zwischen Cursor, GitHub Copilot und
				OpenCode umschalten und zeigt, wo es gilt.</p></div>
			<div><h3>Aufstieg nur mit Nachweis</h3><p>Gelesene Module reichen nicht. Eine Challenge im echten Repo, geprüft
				von der Pipeline, öffnet die nächste Stufe.</p></div>
			<div><h3>Kein Modell in der Plattform</h3><p>Agent-Antworten hier sind vorgefertigt. Die echte Arbeit passiert
				in deinem Tool.</p></div>
		</section>`;
	}

	// ---------- Einstufung ----------
	let E = null; // Fragen
	async function zeigeEinstufung() {
		if (!E) E = await (await fetch("./content/einstufung.json", { cache: "no-cache" })).json();
		const antw = {};
		const kontext = { tool: S.profil?.tool, klasse: S.profil?.klasse, rolle: S.profil?.rolle };
		let schritt = 0; // 0 = Kontext, 1..n = Fragen, n+1 = Ergebnis
		const n = E.fragen.length;
		// Antwortoptionen in fester, aber gemischter Reihenfolge, damit die Stufe nicht an der Position hängt
		const gemischt = E.fragen.map((f, fi) => f.optionen.map((o, i) => ({ ...o, i })).sort((a, b) => ((a.i * 7 + fi * 3) % 5) - ((b.i * 7 + fi * 3) % 5) || a.i - b.i));

		const wahl = (name, liste, wert) =>
			`<fieldset class="wahl"><legend>${name}</legend>${liste.map((o) => `<label><input type="radio" name="${name}" value="${esc(o.id)}" ${wert === o.id ? "checked" : ""} /><span>${esc(o.name)}${o.kurz ? `<small>${esc(o.kurz)}</small>` : ""}</span></label>`).join("")}</fieldset>`;

		const zeichne = () => {
			if (schritt === 0) {
				main.innerHTML = `<section class="blatt schmal">
					<p class="marke">Standortbestimmung · Schritt 1 von ${n + 1}</p>
					<h1 tabindex="-1">Womit und woran arbeitest du?</h1>
					<p class="vorspann">Diese drei Angaben steuern später Beispiele und Hinweise. Danach kommen ${n} kurze
						Szenarien. Alles zusammen dauert höchstens zehn Minuten.</p>
					<form id="kontext">
						${wahl("Dein Tool", K.tools, kontext.tool)}
						${wahl("Schutzklasse deines Hauptprojekts", K.schutzklassen, kontext.klasse)}
						${wahl("Deine Rolle", E.rollen, kontext.rolle)}
						<p class="form-fehler" role="alert" hidden>Bitte wähle in allen drei Gruppen etwas aus.</p>
						<p><button class="knopf" type="submit">Weiter zu den Szenarien →</button></p>
					</form></section>`;
				$("#kontext").addEventListener("submit", (e) => {
					e.preventDefault();
					const v = (name) => $(`input[name="${name}"]:checked`)?.value;
					kontext.tool = v("Dein Tool");
					kontext.klasse = v("Schutzklasse deines Hauptprojekts");
					kontext.rolle = v("Deine Rolle");
					if (!kontext.tool || !kontext.klasse || !kontext.rolle) {
						$(".form-fehler").hidden = false;
						return;
					}
					schritt = 1;
					zeichne();
				});
			} else if (schritt <= n) {
				const fi = schritt - 1;
				const f = E.fragen[fi];
				main.innerHTML = `<section class="blatt schmal">
					<p class="marke">Standortbestimmung · Szenario ${schritt} von ${n}</p>
					<div class="fortschritt" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${fi}" aria-label="Fortschritt der Einstufung"><i style="width:${(fi / n) * 100}%"></i></div>
					<form id="frage"><fieldset class="wahl wahl-gross">
						<legend><h1 tabindex="-1">${inline(f.frage)}</h1><span class="wahl-hinweis">Wähle, was du tatsächlich tust, nicht was du für richtig hältst.</span></legend>
						${gemischt[fi].map((o) => `<label><input type="radio" name="a" value="${o.i}" ${antw[fi] === o.i ? "checked" : ""} /><span>${inline(o.text)}</span></label>`).join("")}
					</fieldset>
					<p class="form-fehler" role="alert" hidden>Bitte wähle eine Antwort.</p>
					<p class="knopfzeile"><button class="knopf knopf-leise" type="button" id="zurueck">← Zurück</button><button class="knopf" type="submit">${schritt === n ? "Auswerten" : "Weiter →"}</button></p></form></section>`;
				$("#zurueck").addEventListener("click", () => {
					schritt--;
					zeichne();
				});
				$("#frage").addEventListener("submit", (e) => {
					e.preventDefault();
					const v = $('input[name="a"]:checked');
					if (!v) {
						$(".form-fehler").hidden = false;
						return;
					}
					antw[fi] = Number(v.value);
					schritt++;
					zeichne();
				});
			} else ergebnis();
			main.querySelector("h1")?.focus({ preventScroll: true });
			window.scrollTo(0, 0);
		};

		const ergebnis = () => {
			const lvl = E.fragen.map((f, i) => Math.max(1, f.optionen[antw[i]].stufe));
			const roh = E.fragen.map((f, i) => f.optionen[antw[i]].stufe);
			// Eine Stufe gilt als erreicht, wenn mindestens 60 % der dafür aussagekräftigen Szenarien so beantwortet sind
			let empf = 1;
			for (let L = 2; L <= 4; L++) {
				const rel = E.fragen.map((f, i) => i).filter((i) => Math.max(...E.fragen[i].optionen.map((o) => o.stufe)) >= L);
				if (rel.filter((i) => lvl[i] >= L).length / rel.length >= 0.6) empf = L;
				else break;
			}
			const ziel = Math.min(4, empf + 1);
			const schon = E.fragen.filter((f, i) => lvl[i] >= (empf === 4 ? 4 : ziel)).map((f) => f.thema);
			const offen = E.fragen.filter((f, i) => lvl[i] < ziel && Math.max(...f.optionen.map((o) => o.stufe)) >= ziel).map((f) => f.thema);
			const kaum = roh.filter((r) => r === 0).length >= 3;
			const liste = (a) => (a.length > 1 ? a.slice(0, -1).join(", ") + " und " + a[a.length - 1] : a[0]);
			let grund = E.begruendung[empf];
			if (schon.length && empf < 4) grund += ` Bei ${liste(schon.slice(0, 3))} zeigst du schon das Verhalten von P${ziel}.`;
			if (offen.length) grund += ` Dein nächster Schritt liegt bei ${liste(offen.slice(0, 3))}.`;
			if (kaum) grund += " Du nutzt den Agent-Modus bisher kaum. Fang mit dem ersten Modul von P1 an, das dauert 20 Minuten.";
			const skip = K.stufen.filter((s) => s.nr < empf).flatMap((s) => s.module.map((id) => M[id]).filter(Boolean));
			S.profil = { ...kontext };
			S.einstufung = { datum: heute(), empfehlung: empf, antworten: roh };
			merke("einstufung", "p" + empf);
			sichern();
			const kl = klasse(kontext.klasse);
			const toolHinweis = !kl.tools.includes(kontext.tool) ? `<aside class="merke"><p>In <b>${esc(kl.name)}</b> ist ${esc(toolName(kontext.tool))} nicht erlaubt. Dort arbeitest du mit OpenCode und selbst gehosteten Modellen. Die Module zeigen dir deshalb zuerst die OpenCode-Variante.</p></aside>` : "";
			main.innerHTML = `<section class="blatt schmal">
				<p class="marke">Standortbestimmung · Ergebnis</p>
				<h1 tabindex="-1">Du steigst auf <span class="mark">P${empf} · ${esc(stufe(empf).name)}</span> ein.</h1>
				<p class="vorspann">${esc(grund)}</p>
				${toolHinweis}
				${skip.length ? `<h2>Diese Module kannst du überspringen</h2><ul class="skipliste">${skip.map((m) => `<li><a href="#/modul/${m.id}">P${m.stufe} · ${esc(m.meta.titel)}</a></li>`).join("")}</ul>` : `<p>Du überspringst nichts: P1 ist kurz und legt die Grundlage für alles Weitere.</p>`}
				${empf > 2 ? `<aside class="merke"><p>Im MVP sind P1 und P2 vollständig. Für P3 und P4 gibt es je ein Mustermodul, der Rest ist in Vorbereitung.</p></aside>` : ""}
				<p class="knopfzeile"><button class="knopf" data-ein="${empf}">Auf P${empf} einsteigen →</button></p>
				<h2>Lieber woanders einsteigen?</h2>
				<p>Die Empfehlung ist ein Vorschlag. Du darfst auf jeder Stufe einsteigen und die Einstufung jederzeit wiederholen.</p>
				<p class="knopfzeile">${K.stufen.filter((s) => s.nr !== empf).map((s) => `<button class="knopf knopf-leise" data-ein="${s.nr}">P${s.nr} · ${esc(s.name)}</button>`).join("")}</p>
				<p class="klein">Wer höher einsteigen will und es belegen möchte, legt direkt die <a href="#/challenge/${esc(stufe(1).challenge.id)}">Level-Up-Challenge</a> der Stufe darunter ab.</p>
			</section>`;
			main.onclick = (e) => {
				const b = e.target.closest("[data-ein]");
				if (!b) return;
				S.stufe = Number(b.dataset.ein);
				sichern();
				location.hash = "#/stufe/" + S.stufe;
			};
		};
		zeichne();
	}

	// ---------- Stufenseite ----------
	function pluginListe(s) {
		if (!s.plugins?.length) return "";
		return `<section><h2>Aus dem Marketplace</h2><ul class="plugins">${s.plugins
			.map((p) => `<li><b>${esc(p.name)}</b> <span class="chip">${esc(p.quelle)}</span>${p.vorbehalt ? ` <span class="chip chip-warn">${esc(p.vorbehalt)}</span>` : ""}<br />${esc(p.wozu)} ${p.url ? `<a href="${esc(p.url)}">Installieren →</a>` : `<span class="klein">Installationslink folgt aus dem internen Marketplace.</span>`}</li>`)
			.join("")}</ul></section>`;
	}
	function challengeKarte(s) {
		const c = s.challenge;
		if (!c) return "";
		const ok = challengeOk(c.id);
		return `<section class="challenge-karte ${ok ? "geschafft" : ""}">
			<p class="marke">Level-Up-Challenge · ${esc(c.von)}</p>
			<h2>${esc(c.titel)}</h2>
			<p>${esc(c.kurz)}</p>
			${c.verfuegbar ? `<p><a class="knopf" href="#/challenge/${esc(c.id)}">${ok ? "Bestanden ✓ · ansehen" : "Zur Challenge →"}</a></p>` : `<p><span class="chip">in Vorbereitung</span> Diese Challenge gehört zum Zielbild und folgt nach dem MVP.</p>`}
		</section>`;
	}
	function zeigeStufe(nr) {
		const s = stufe(nr);
		if (!s) return zeigeFehlt();
		const beitraege = K.galerie.filter((g) => g.stufe === s.nr);
		main.innerHTML = `<section class="blatt">
			<p class="pfad"><a href="#/">← Karte</a></p>
			<header class="stufenkopf">
				<span class="stufen-nr gross">P${s.nr}</span>
				<div><p class="marke">${esc(s.ort)}${S.stufe === s.nr ? " · dein Standort" : ""}</p>
				<h1 tabindex="-1">${esc(s.name)}</h1>
				<p class="stufen-frage">„${esc(s.kernfrage)}“</p></div>
			</header>
			<div class="zweispaltig">
				<section><h2>Lernziele</h2><ul>${s.lernziele.map((l) => `<li>${inline(l)}</li>`).join("")}</ul></section>
				<section><h2>Woran du die Stufe erkennst</h2><p>${esc(s.verhalten)}</p>
					${s.grenze ? `<p><b>Grenze, die zur nächsten Stufe führt:</b> ${esc(s.grenze)}</p>` : ""}
					${S.stufe !== s.nr ? `<p><button class="knopf knopf-leise" id="hierEin">Hier einsteigen</button></p>` : ""}</section>
			</div>
			<section><h2>Module</h2>
				<ol class="modulliste">
				${s.module
					.map((id) => M[id])
					.filter(Boolean)
					.map(
						(m) => `<li class="${modulFertig(m.id) ? "fertig" : ""}"><a href="#/modul/${m.id}">
						<span class="modul-status" aria-hidden="true">${modulFertig(m.id) ? "✓" : ""}</span>
						<span class="modul-titel">${esc(m.meta.titel)}<small>${esc(m.meta.lernziel || "")}</small></span>
						<span class="modul-dauer">${m.meta.dauer} min${modulFertig(m.id) ? " · erledigt" : ""}</span></a></li>`,
					)
					.join("")}
				${(s.geplant || []).map((g) => `<li class="geplant"><span><span class="modul-status" aria-hidden="true"></span><span class="modul-titel">${esc(g.titel)}<small>${esc(g.kern)}</small></span><span class="modul-dauer">in Vorbereitung</span></span></li>`).join("")}
				</ol>
				<p class="klein">Module sind empfohlen, nicht Pflicht. Wer die Challenge direkt besteht, steigt auf.</p>
			</section>
			${challengeKarte(s)}
			${pluginListe(s)}
			${beitraege.length ? `<section><h2>So arbeiten Kollegen auf dieser Stufe</h2><ul class="galerie-kurz">${beitraege.map((g) => `<li><a href="#/galerie">${esc(g.titel)}</a> <span class="klein">· ${esc(g.wer)}</span></li>`).join("")}</ul></section>` : ""}
		</section>`;
		$("#hierEin")?.addEventListener("click", () => {
			S.stufe = s.nr;
			sichern();
			zeigeStufe(nr);
		});
	}

	// ---------- Modul ----------
	const norm = (t) => t.toLowerCase().replace(/ü/g, "ue").replace(/[^a-z]/g, "");
	function zeigeModul(id) {
		const m = M[id];
		if (!m) return zeigeFehlt();
		const s = stufe(m.stufe);
		const meta = m.meta;
		const alter = meta.geprueft ? tageSeit(meta.geprueft) : null;
		const klassen = [].concat(meta.schutzklassen || []);
		const reihe = s.module.filter((x) => M[x]);
		const next = reihe[reihe.indexOf(id) + 1];
		let uNr = 0;
		const teile = m.abschnitte
			.map((a) => {
				const art = norm(a.titel);
				if (art === "indeinemtool") {
					const subs = window.LabMd.abschnitte(a.text, 3);
					const einleitung = subs.filter((x) => !x.titel).map((x) => render(x.text).html).join("");
					const tabs = K.tools.map((t) => ({ t, sub: subs.find((x) => norm(x.titel).startsWith(norm(t.name).slice(0, 6)) || norm(x.titel) === norm(t.id)) }));
					const eigen = subs.find((x) => /selbst/i.test(x.titel));
					const aktiv = meinTool();
					return `<section class="abschnitt" id="abschnitt-tool"><h2>So geht es in deinem Tool</h2>${einleitung}
						<div class="tabs" role="tablist" aria-label="Tool wählen">${tabs.map(({ t }) => `<button role="tab" id="tab-${t.id}" aria-controls="feld-${t.id}" aria-selected="${t.id === aktiv}" tabindex="${t.id === aktiv ? 0 : -1}">${esc(t.name)}${S.profil && t.id === aktiv ? " <small>dein Tool</small>" : ""}</button>`).join("")}</div>
						${tabs.map(({ t, sub }) => `<div role="tabpanel" id="feld-${t.id}" aria-labelledby="tab-${t.id}" tabindex="0" ${t.id === aktiv ? "" : "hidden"}>${sub ? render(sub.text).html : `<p>Für ${esc(t.name)} gibt es in diesem Modul noch keine eigene Anleitung.</p>`}</div>`).join("")}
						${eigen ? `<aside class="eigenhost ${selbstGehostet() ? "betont" : ""}"><h3>Tipp für selbst gehostete Modelle (Export Controlled, VS-NfD)</h3>${render(eigen.text).html}</aside>` : ""}
					</section>`;
				}
				const r = render(a.text);
				const html = r.html.replace(/data-slot="(\d+)"/g, (x, i) => `data-quelle="${esc(encodeURIComponent(r.slots[i]))}" data-nr="${uNr++}"`);
				const sid = { warum: "warum", konzept: "konzept", uebung: "uebung", transfer: "transfer" }[art] || art;
				return `<section class="abschnitt abschnitt-${sid}" id="abschnitt-${sid}"><h2>${esc(a.titel)}</h2>${html}</section>`;
			})
			.join("");
		const comm = K.communities[meta.community] || K.communities[meinTool()];
		const fb = S.feedback[id] || {};
		main.innerHTML = `<article class="blatt modul">
			<p class="pfad"><a href="#/stufe/${s.nr}">← P${s.nr} · ${esc(s.name)}</a></p>
			<header>
				<p class="marke">Modul · P${s.nr} · ${meta.dauer} Minuten${modulFertig(id) ? ' · <span class="ok">erledigt ✓</span>' : ""}</p>
				<h1 tabindex="-1">${esc(meta.titel)}</h1>
				<p class="vorspann"><b>Lernziel:</b> ${esc(meta.lernziel || "")}</p>
				<dl class="steckbrief">
					<div><dt>Gilt in</dt><dd>${K.schutzklassen.map((k) => `<span class="chip ${klassen.includes(k.id) ? "chip-ja" : "chip-nein"}">${klassen.includes(k.id) ? "✓" : "✗"} ${esc(k.name)}</span>`).join(" ")}</dd></div>
					<div><dt>Geprüft am</dt><dd>${datum(meta.geprueft)}${meta.status ? ` · <span class="chip chip-warn">${esc(meta.status)}</span>` : ""}</dd></div>
					<div><dt>Verantwortlich</dt><dd>${esc(meta.verantwortlich || "–")}</dd></div>
					<div><dt>Tool-Stand</dt><dd>${esc(meta.tool_versionen || "–")}</dd></div>
				</dl>
				${alter !== null && alter > K.veraltet_nach_tagen ? `<aside class="merke warnung"><p>Die letzte Überprüfung ist ${alter} Tage her. Tools ändern sich schnell: Prüfe Bedienhinweise gegen die offizielle Doku.</p></aside>` : ""}
				${meta.hinweis ? `<aside class="merke"><p>${inline(meta.hinweis)}</p></aside>` : ""}
			</header>
			${teile}
			<section class="abschnitt nachklapp">
				<h2>Weiter im Gespräch</h2>
				<p>${comm ? `Fragen und Erfahrungen zu diesem Modul: <b>${esc(comm.name)}</b> ${comm.url ? `<a href="${esc(comm.url)}">öffnen →</a>` : `<span class="klein">(Link wird in <code>content/katalog.json</code> eingetragen)</span>`}` : ""}</p>
				<div class="daumen" role="group" aria-label="Hat dir dieses Modul geholfen?">
					<span>Hat dir das Modul geholfen?</span>
					<button type="button" data-daumen="hoch" aria-pressed="${fb.daumen === "hoch"}">👍 Ja</button>
					<button type="button" data-daumen="runter" aria-pressed="${fb.daumen === "runter"}">👎 Nein</button>
				</div>
				<label class="daumen-text" ${fb.daumen ? "" : "hidden"}><span>Was sollen wir ändern? (freiwillig)</span><textarea rows="2">${esc(fb.text || "")}</textarea></label>
				${m.uebungen ? "" : `<p><button class="knopf" id="erledigt">${modulFertig(id) ? "Erledigt ✓" : "Als erledigt markieren"}</button></p>`}
				<p class="knopfzeile">${next ? `<a class="knopf" href="#/modul/${next}">Nächstes Modul: ${esc(M[next].meta.titel)} →</a>` : s.challenge?.verfuegbar ? `<a class="knopf" href="#/challenge/${esc(s.challenge.id)}">Zur Level-Up-Challenge →</a>` : `<a class="knopf" href="#/stufe/${s.nr}">Zurück zur Stufe P${s.nr}</a>`}</p>
			</section>
		</article>`;

		// Übungen starten
		const stand = () => {
			const alle = $$(".uebung", main).length;
			const ok = $$(".uebung.bestanden", main).length;
			if (alle && ok === alle && !modulFertig(id)) {
				S.module[id] = { erledigt: heute() };
				merke("modul_fertig", id);
				sichern();
				$(".modul .marke").insertAdjacentHTML("beforeend", ' · <span class="ok">erledigt ✓</span>');
			}
		};
		$$(".uebung", main).forEach((el) => {
			const key = id + "#" + el.dataset.nr;
			const markiere = () => {
				el.classList.add("bestanden");
				const st = $(".ue-status", el);
				if (st) st.hidden = false;
			};
			window.LabUebung.starte(el, decodeURIComponent(el.dataset.quelle), {
				id: key.replace(/[^a-z0-9]/gi, "-"),
				challengeOk,
				melde: (ok, still) => {
					const u = (S.uebungen[key] = S.uebungen[key] || { versuche: 0, ok: false });
					if (!still) {
						u.versuche++;
						merke("uebung", key, ok);
					}
					if (ok) {
						u.ok = true;
						markiere();
					}
					sichern();
					stand();
				},
			});
			if (S.uebungen[key]?.ok) markiere();
		});
		stand();

		// Sprung aus dem Feedback zurück zur passenden Stelle
		main.onclick = (e) => {
			const sp = e.target.closest("[data-sprung]");
			if (sp) {
				const ziel = $("#abschnitt-" + sp.dataset.sprung);
				if (ziel) {
					ziel.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
					ziel.classList.add("blink");
					setTimeout(() => ziel.classList.remove("blink"), 1600);
				}
				return;
			}
			const d = e.target.closest("[data-daumen]");
			if (d) {
				S.feedback[id] = { ...(S.feedback[id] || {}), daumen: d.dataset.daumen };
				$$("[data-daumen]").forEach((b) => b.setAttribute("aria-pressed", String(b === d)));
				$(".daumen-text").hidden = false;
				sichern();
			}
		};
		$(".daumen-text textarea").addEventListener("input", (e) => {
			S.feedback[id] = { ...(S.feedback[id] || {}), text: e.target.value };
			sichern();
		});
		$("#erledigt")?.addEventListener("click", (e) => {
			S.module[id] = { erledigt: heute() };
			sichern();
			e.target.textContent = "Erledigt ✓";
		});

		// Tool-Umschalter mit Pfeiltasten
		const tabs = $$('[role="tab"]', main);
		const waehle = (t, fokus) => {
			tabs.forEach((x) => {
				const an = x === t;
				x.setAttribute("aria-selected", String(an));
				x.tabIndex = an ? 0 : -1;
				$("#" + x.getAttribute("aria-controls")).hidden = !an;
			});
			if (fokus) t.focus();
		};
		tabs.forEach((t, i) => {
			t.addEventListener("click", () => waehle(t));
			t.addEventListener("keydown", (e) => {
				const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
				if (!d) return;
				e.preventDefault();
				waehle(tabs[(i + d + tabs.length) % tabs.length], true);
			});
		});
		if (!S.module[id]?.geoeffnet) {
			S.module[id] = { ...(S.module[id] || {}), geoeffnet: heute() };
			merke("modul_start", id);
			sichern();
		}
	}

	// ---------- Level-Up-Challenge ----------
	function sha256(text) {
		const bytes = new TextEncoder().encode(text);
		const K256 = [];
		const H = [];
		const bruch = (x) => ((x - Math.floor(x)) * 4294967296) | 0;
		for (let n = 2, c = 0; c < 64; n++) {
			let prim = true;
			for (let i = 2; i * i <= n; i++) if (n % i === 0) prim = false;
			if (!prim) continue;
			if (c < 8) H[c] = bruch(Math.sqrt(n));
			K256[c++] = bruch(Math.cbrt(n));
		}
		const l = bytes.length;
		const gesamt = ((l + 9 + 63) >> 6) << 6;
		const m = new Uint8Array(gesamt);
		m.set(bytes);
		m[l] = 0x80;
		const dv = new DataView(m.buffer);
		dv.setUint32(gesamt - 4, l * 8);
		const w = new Int32Array(64);
		const rot = (x, n) => (x >>> n) | (x << (32 - n));
		for (let o = 0; o < gesamt; o += 64) {
			for (let i = 0; i < 16; i++) w[i] = dv.getInt32(o + i * 4);
			for (let i = 16; i < 64; i++) {
				const a = w[i - 15];
				const b = w[i - 2];
				w[i] = (w[i - 16] + (rot(a, 7) ^ rot(a, 18) ^ (a >>> 3)) + w[i - 7] + (rot(b, 17) ^ rot(b, 19) ^ (b >>> 10))) | 0;
			}
			let [a, b, c, d, e, f, g, h] = H;
			for (let i = 0; i < 64; i++) {
				const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) | 0;
				const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
				h = g;
				g = f;
				f = e;
				e = (d + t1) | 0;
				d = c;
				c = b;
				b = a;
				a = (t1 + t2) | 0;
			}
			[a, b, c, d, e, f, g, h].forEach((v, i) => (H[i] = (H[i] + v) | 0));
		}
		return H.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
	}

	// Nachweis-Code aus der Pipeline: LL-<Kennung>-<Pipeline>-<Maske>-<Prüfsumme>
	function leseNachweis(code, c) {
		const m = /^LL-([A-Z0-9]+)-([A-Za-z0-9]+)-([0-9a-f]{2})-([0-9a-f]{8})$/i.exec(code.trim());
		if (!m) return { fehler: "Das sieht nicht nach einem Nachweis-Code aus. Er beginnt mit „LL-“ und steht am Ende des Pipeline-Logs." };
		if (m[1].toUpperCase() !== c.kennung) return { fehler: "Dieser Code gehört zu einer anderen Challenge." };
		const maske = m[3].toLowerCase();
		if (sha256(`ailab|${c.kennung}|${m[2]}|${maske}`).slice(0, 8) !== m[4].toLowerCase()) return { fehler: "Die Prüfsumme passt nicht. Kopiere den Code bitte vollständig aus dem Log." };
		const bits = parseInt(maske, 16);
		return { pipeline: m[2], bits, erfuellt: c.kriterien.map((k, i) => !!(bits & (1 << i))) };
	}

	function zeigeChallenge(id) {
		const s = K.stufen.find((x) => x.challenge?.id === id);
		const c = s?.challenge;
		if (!c || !c.verfuegbar) return zeigeFehlt();
		const st = S.challenges[id] || {};
		const tool = meinTool();
		main.innerHTML = `<article class="blatt modul">
			<p class="pfad"><a href="#/stufe/${s.nr}">← P${s.nr} · ${esc(s.name)}</a></p>
			<header>
				<p class="marke">Level-Up-Challenge · ${esc(c.von)} · Hands-on im echten Repo${st.ok ? ' · <span class="ok">bestanden ✓</span>' : ""}</p>
				<h1 tabindex="-1">${esc(c.titel)}</h1>
				<p class="vorspann">${esc(c.kurz)}</p>
			</header>
			<section class="abschnitt"><h2>Die Aufgabe</h2>${render(txt(c.aufgabe)).html}</section>
			<section class="abschnitt"><h2>So gehst du vor</h2>
				<ol class="schritte">${c.schritte.map((x) => `<li>${inline(x)}</li>`).join("")}</ol>
				<p><a class="knopf" href="${esc(c.repo)}" target="_blank" rel="noopener">Übungs-Repo öffnen ↗</a></p>
				<p class="klein">${inline(c.repo_hinweis || "")}</p>
				<div class="tabs" role="tablist" aria-label="Tool wählen">${K.tools.map((t) => `<button role="tab" id="tab-${t.id}" aria-controls="feld-${t.id}" aria-selected="${t.id === tool}" tabindex="${t.id === tool ? 0 : -1}">${esc(t.name)}</button>`).join("")}</div>
				${K.tools.map((t) => `<div role="tabpanel" id="feld-${t.id}" aria-labelledby="tab-${t.id}" tabindex="0" ${t.id === tool ? "" : "hidden"}>${render(txt(c.tooltipps[t.id])).html}</div>`).join("")}
			</section>
			<section class="abschnitt"><h2>Was die Pipeline prüft</h2>
				<ol class="kriterien">${c.kriterien.map((k, i) => `<li data-k="${i}"><b>${esc(k.name)}</b><br /><span>${inline(k.pruefung)}</span></li>`).join("")}</ol>
			</section>
			<section class="abschnitt abgabe"><h2>Ergebnis eintragen</h2>
				<p>Am Ende des Jobs <code>lab-pruefung</code> steht ein Nachweis-Code. Füge ihn hier ein, dann siehst du pro
					Kriterium, was erfüllt ist. Der Link zur Pipeline oder zum MR ist freiwillig und bleibt nur bei dir.</p>
				<form id="abgabe">
					<label><span>Nachweis-Code aus dem Pipeline-Log</span><input name="code" required autocomplete="off" spellcheck="false" placeholder="LL-${esc(c.kennung)}-…" value="${esc(st.code || "")}" /></label>
					<label><span>Link zur Pipeline oder zum MR (freiwillig)</span><input name="link" type="url" placeholder="https://…" value="${esc(st.link || "")}" /></label>
					<p><button class="knopf" type="submit">Auswerten</button></p>
				</form>
				<div class="ue-feedback" id="chErgebnis" role="status" aria-live="polite"></div>
				<div id="chDanach"></div>
			</section>
		</article>`;
		const tabs = $$('[role="tab"]', main);
		tabs.forEach((t) =>
			t.addEventListener("click", () =>
				tabs.forEach((x) => {
					x.setAttribute("aria-selected", String(x === t));
					x.tabIndex = x === t ? 0 : -1;
					$("#" + x.getAttribute("aria-controls")).hidden = x !== t;
				}),
			),
		);
		const danach = () => {
			if (!S.challenges[id]?.ok) return;
			$("#chDanach").innerHTML = `<div class="aufstieg">
				<div class="stempel">${abzeichenSvg(s.nr, S.challenges[id].datum)}</div>
				<div><h3>Aufstieg: Du stehst jetzt auf P${Math.min(4, s.nr + 1)}.</h3>
				<p>Das Abzeichen für P${s.nr} liegt in deinem <a href="#/tourenbuch">Tourenbuch</a>.</p>
				<label><span><b>Transfer-Impuls:</b> Was änderst du ab morgen in deinem Projekt?</span>
				<textarea rows="3" id="impuls">${esc(S.impulse[s.nr] || "")}</textarea></label>
				<p><a class="knopf" href="#/stufe/${Math.min(4, s.nr + 1)}">Weiter zu P${Math.min(4, s.nr + 1)} →</a></p></div></div>`;
			$("#impuls").addEventListener("input", (e) => {
				S.impulse[s.nr] = e.target.value;
				sichern();
			});
		};
		const auswerten = (code, link, neu) => {
			const r = leseNachweis(code, c);
			const box = $("#chErgebnis");
			if (r.fehler) {
				box.className = "ue-feedback ist-offen";
				box.innerHTML = `<p class="ue-urteil">↻ ${esc(r.fehler)}</p>`;
				return;
			}
			const ok = r.erfuellt.every(Boolean);
			box.className = "ue-feedback " + (ok ? "ist-gut" : "ist-offen");
			box.innerHTML = `<p class="ue-urteil">${ok ? "✓ Bestanden. Alle Kriterien sind erfüllt." : "↻ Noch nicht bestanden. " + r.erfuellt.filter((x) => !x).length + " von " + c.kriterien.length + " Kriterien fehlen."} <span class="klein">Pipeline ${esc(r.pipeline)}</span></p>
				<ul>${c.kriterien.map((k, i) => `<li class="${r.erfuellt[i] ? "gut" : "offen"}"><span aria-hidden="true">${r.erfuellt[i] ? "✓" : "✗"}</span><span><b>${esc(k.name)}</b>${r.erfuellt[i] ? "" : `: ${esc(k.hinweis)} <a class="sprung" href="#/modul/${esc(k.modul)}">Modul: ${esc(M[k.modul]?.meta.titel || k.modul)} →</a>`}</span></li>`).join("")}</ul>`;
			if (neu) {
				const alt = S.challenges[id] || {};
				S.challenges[id] = { ok: alt.ok || ok, code, link, datum: alt.ok ? alt.datum : heute(), versuche: (alt.versuche || 0) + 1 };
				merke("challenge", id, ok);
				if (ok && (S.stufe || 0) < s.nr + 1) S.stufe = Math.min(4, s.nr + 1);
				sichern();
			}
			danach();
		};
		$("#abgabe").addEventListener("submit", (e) => {
			e.preventDefault();
			const f = new FormData(e.target);
			auswerten(String(f.get("code")), String(f.get("link") || ""), true);
		});
		if (st.code) auswerten(st.code, st.link, false);
	}

	// ---------- Abzeichen ----------
	function abzeichenSvg(nr, tag) {
		const s = stufe(nr);
		const rund = `AI LEARNING LAB · ${s.ort.toUpperCase()} · ${s.name.toUpperCase()} · `;
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Abzeichen P${nr} ${esc(s.name)}${tag ? ", erreicht am " + datum(tag) : ", noch offen"}">
			<defs><path id="kreis${nr}" d="M100 100m-78 0a78 78 0 1 1 156 0a78 78 0 1 1-156 0" /></defs>
			<g fill="none" stroke="${tag ? "#b3391a" : "#8d8672"}" ${tag ? "" : 'stroke-dasharray="4 5"'}>
			<circle cx="100" cy="100" r="95" stroke-width="4" /><circle cx="100" cy="100" r="62" stroke-width="2" />
			<path d="M58 124l26-40 12 17 9-12 24 35z" stroke-width="3" stroke-linejoin="round" /></g>
			<g fill="${tag ? "#b3391a" : "#8d8672"}" font-family="'Barlow Condensed',Arial,sans-serif" font-weight="700">
			<text font-size="13.5" letter-spacing="1.6"><textPath href="#kreis${nr}">${esc(rund)}</textPath></text>
			<text x="100" y="78" text-anchor="middle" font-size="30">P${nr}</text>
			<text x="100" y="146" text-anchor="middle" font-size="13" letter-spacing="1">${tag ? datum(tag) : "OFFEN"}</text></g>
		</svg>`;
	}

	// ---------- Tourenbuch ----------
	function zeigeTourenbuch() {
		const p = S.profil || {};
		const auswahl = (name, liste, wert) => `<label><span>${name}</span><select data-profil="${name}">${wert ? "" : '<option value="">bitte wählen</option>'}${liste.map((o) => `<option value="${esc(o.id)}" ${o.id === wert ? "selected" : ""}>${esc(o.name)}</option>`).join("")}</select></label>`;
		main.innerHTML = `<section class="blatt">
			<p class="pfad"><a href="#/">← Karte</a></p>
			<p class="marke">Tourenbuch</p>
			<h1 tabindex="-1">${S.stufe ? `Du stehst auf P${S.stufe} · ${esc(stufe(S.stufe).name)}` : "Noch kein Standort"}</h1>
			<p class="vorspann">${S.einstufung ? `Eingestuft am ${datum(S.einstufung.datum)} (Empfehlung: P${S.einstufung.empfehlung}).` : "Du bist noch nicht eingestuft."} <a href="#/einstufung">Einstufung ${S.einstufung ? "wiederholen" : "starten"} →</a></p>
			<section><h2>Abzeichen</h2>
				<ul class="stempelreihe">${K.stufen
					.map((s) => {
						const tag = abzeichen(s.nr);
						return `<li class="${tag ? "da" : ""}">${abzeichenSvg(s.nr, tag)}<span>${tag ? `<button class="knopf knopf-leise" data-abz="${s.nr}">Als SVG speichern</button>` : s.challenge?.verfuegbar ? `<a href="#/challenge/${esc(s.challenge.id)}">Challenge ${esc(s.challenge.von)}</a>` : "Challenge in Vorbereitung"}</span></li>`;
					})
					.join("")}</ul>
				<p class="klein">Ein Abzeichen gibt es nur für eine bestandene Level-Up-Challenge. Die gespeicherte Datei kannst du im Teams-Profil oder in der Community zeigen.</p>
			</section>
			<section><h2>Module und Challenges</h2>
				${K.stufen
					.map((s) => {
						const mods = s.module.map((id) => M[id]).filter(Boolean);
						const fertig = mods.filter((m) => modulFertig(m.id)).length;
						const c = s.challenge;
						return `<div class="etappe"><h3><a href="#/stufe/${s.nr}">P${s.nr} · ${esc(s.name)}</a></h3>
						<div class="fortschritt" role="progressbar" aria-valuemin="0" aria-valuemax="${mods.length}" aria-valuenow="${fertig}" aria-label="Erledigte Module auf P${s.nr}"><i style="width:${mods.length ? (fertig / mods.length) * 100 : 0}%"></i></div>
						<p>${fertig} von ${mods.length} Modulen erledigt${s.geplant?.length ? ` (${s.geplant.length} weitere in Vorbereitung)` : ""} · Challenge: ${!c ? "–" : !c.verfuegbar ? "in Vorbereitung" : challengeOk(c.id) ? `bestanden am ${datum(S.challenges[c.id].datum)}` : S.challenges[c.id] ? "versucht, noch offen" : "offen"}</p>
						<ul class="haken">${mods.map((m) => `<li class="${modulFertig(m.id) ? "da" : ""}"><a href="#/modul/${m.id}">${esc(m.meta.titel)}</a>${modulFertig(m.id) ? ` <span class="klein">· ${datum(S.module[m.id].erledigt)}</span>` : ""}</li>`).join("")}</ul>
						${S.impulse[s.nr] ? `<p class="impuls"><b>Dein Transfer-Impuls:</b> ${esc(S.impulse[s.nr])}</p>` : ""}</div>`;
					})
					.join("")}
			</section>
			<section><h2>Dein Kontext</h2>
				<div class="profil">${auswahl("Tool", K.tools, p.tool)}${auswahl("Schutzklasse", K.schutzklassen, p.klasse)}</div>
				${S.profil && !klasse(p.klasse).tools.includes(p.tool) ? `<p class="klein">In ${esc(klasse(p.klasse).name)} zeigen die Module die OpenCode-Variante, weil dort nur OpenCode mit selbst gehosteten Modellen erlaubt ist.</p>` : ""}
			</section>
			<section><h2>Deine Daten</h2>
				<p>Alles hier liegt nur in diesem Browser. Es gibt kein Konto, keine Übertragung und keine Auswertung einzelner
					Personen. Die Datei unten zeigt genau, was gespeichert ist.</p>
				<p class="knopfzeile"><button class="knopf knopf-leise" id="export">Daten als JSON speichern</button><button class="knopf knopf-leise gefahr" id="loeschen">Fortschritt löschen</button></p>
			</section>
		</section>`;
		const speichere = (name, inhalt, typ) => {
			const a = document.createElement("a");
			a.href = URL.createObjectURL(new Blob([inhalt], { type: typ }));
			a.download = name;
			a.click();
			setTimeout(() => URL.revokeObjectURL(a.href), 1000);
		};
		main.onclick = (e) => {
			const b = e.target.closest("[data-abz]");
			if (b) speichere(`ai-learning-lab-p${b.dataset.abz}.svg`, abzeichenSvg(Number(b.dataset.abz), abzeichen(Number(b.dataset.abz))), "image/svg+xml");
		};
		$("#export").addEventListener("click", () => speichere("ai-learning-lab-fortschritt.json", JSON.stringify(S, null, 2), "application/json"));
		$("#loeschen").addEventListener("click", (e) => {
			if (e.target.dataset.sicher) {
				S = leer();
				sichern();
				zeigeTourenbuch();
			} else {
				e.target.dataset.sicher = "1";
				e.target.textContent = "Wirklich alles löschen? Noch einmal klicken";
			}
		});
		$$("[data-profil]").forEach((sel) =>
			sel.addEventListener("change", () => {
				S.profil = { ...(S.profil || { tool: K.tools[0].id, klasse: "cloud", rolle: "entwickler" }), [sel.dataset.profil === "Tool" ? "tool" : "klasse"]: sel.value };
				sichern();
				zeigeTourenbuch();
			}),
		);
	}

	// ---------- Galerie ----------
	function zeigeGalerie() {
		main.innerHTML = `<section class="blatt">
			<p class="pfad"><a href="#/">← Karte</a></p>
			<p class="marke">Galerie</p>
			<h1 tabindex="-1">So arbeite ich</h1>
			<p class="vorspann">Kurze Walkthroughs von Kollegen, bewusst ungeschliffen. Jeder Beitrag gehört zu einer Stufe.
				Echtheit zählt mehr als Politur.</p>
			<aside class="merke"><p>${esc(K.galerie_hinweis)}</p></aside>
			<div class="galerie">${K.galerie
				.map(
					(g) => `<article class="beitrag">
					<p class="marke"><a href="#/stufe/${g.stufe}">P${g.stufe} · ${esc(stufe(g.stufe).name)}</a> · ${esc(toolName(g.tool))}</p>
					<h2>${esc(g.titel)}</h2>
					<p class="klein">${esc(g.wer)}</p>
					${render(txt(g.text)).html}
				</article>`,
				)
				.join("")}</div>
			<section><h2>Use Cases mit sofortigem Nutzen</h2>
				<ul class="usecases">${K.usecases.map((u) => `<li><span class="stufen-nr klein-nr">P${u.stufe}</span><span><b>${esc(u.titel)}</b><br />${esc(u.text)}${u.modul && M[u.modul] ? ` <a href="#/modul/${u.modul}">Modul →</a>` : ""}</span></li>`).join("")}</ul>
			</section>
			<p><a class="knopf knopf-leise" href="#/mitmachen">Eigenen Beitrag einreichen →</a></p>
		</section>`;
	}

	// ---------- Mitmachen: Inhalte als Code ----------
	function zeigeMitmachen() {
		const q = K.quellen;
		const l = (pfad, name) => `<a href="${esc(q.basis + pfad)}" target="_blank" rel="noopener">${esc(name)} ↗</a>`;
		main.innerHTML = `<section class="blatt">
			<p class="pfad"><a href="#/">← Karte</a></p>
			<p class="marke">Für Content-Autoren und PG-Admins</p>
			<h1 tabindex="-1">Inhalte als Code</h1>
			<p class="vorspann">Module, Übungen, Lösungen und Prüfregeln sind Textdateien. Ein neues Modul ist ein Merge
				Request im Content-Ordner und braucht keine Änderung an der Plattform.</p>
			<div class="zweispaltig">
				<section><h2>In drei Schritten zum Modul</h2>
					<ol class="schritte">
						<li>Vorlage kopieren: ${l("content/vorlage/modul-vorlage.md", "modul-vorlage.md")} nach <code>content/module/&lt;id&gt;.md</code>.</li>
						<li>Oder den Coding Agent schreiben lassen: Der Skill ${l("skills/modul-erstellen/SKILL.md", "modul-erstellen")} erzeugt Modul und Übung im richtigen Format. Ein Mensch prüft.</li>
						<li>Die <code>id</code> in ${l("content/katalog.json", "katalog.json")} bei der Stufe eintragen und einen MR stellen.</li>
					</ol>
					<p>Das ganze Format steht in ${l("content/README.md", "content/README.md")}.</p></section>
				<section><h2>Was jedes Modul mitbringt</h2>
					<ul><li>Metadaten: Stufe, Tools, Schutzklassen, Dauer, Verantwortliche, Datum der letzten Überprüfung, Tool-Stand</li>
					<li>Fünf Abschnitte: Warum, Konzept, In deinem Tool, Übung, Transfer</li>
					<li>Mindestens eine automatisch geprüfte Übung in einem der fünf Formate</li></ul>
					<p>Module, deren Überprüfung länger als ${K.veraltet_nach_tagen} Tage her ist, erscheinen in der <a href="#/leitstelle">Leitstelle</a> als veraltet.</p></section>
			</div>
			<section><h2>Die fünf Übungsformate</h2>
				<div class="tabelle"><table><thead><tr><th scope="col">Format</th><th scope="col"><code>typ</code></th><th scope="col">Geprüft wird</th></tr></thead><tbody>
				<tr><td>Szenario-Entscheidung</td><td><code>entscheidung</code>, <code>reihenfolge</code></td><td>Auswahl oder Reihenfolge gegen die hinterlegte Lösung, mit Erklärung pro Option</td></tr>
				<tr><td>Simulierte Agent-Session</td><td><code>session</code></td><td>Ob der gewählte Prompt-Pfad zum guten Ergebnis führt</td></tr>
				<tr><td>Fehler finden</td><td><code>fehler</code></td><td>Markierte Zeilen gegen die Liste der versteckten Fehler</td></tr>
				<tr><td>Artefakt schreiben</td><td><code>artefakt</code></td><td>Regeln auf Pflichtbestandteile, ohne Sprachmodell</td></tr>
				<tr><td>Hands-on im echten Repo</td><td><code>handson</code></td><td>GitLab CI im Übungs-Repo, Rückmeldung per Nachweis-Code</td></tr>
				</tbody></table></div>
			</section>
			<section><h2>Galerie-Beiträge und Beispiele</h2>
				<p>„So arbeite ich“-Beiträge, Erfolgsgeschichten und Use Cases stehen ebenfalls in <code>katalog.json</code> und
					kommen per MR. Der Weg vom Entwurf zum offiziellen Modul folgt den Marketplace-Stufen: community,
					experimental, official.</p>
			</section>
		</section>`;
	}

	// ---------- Leitstelle: aggregierte Übersicht fürs Service-Team ----------
	async function zeigeLeitstelle() {
		let D;
		try {
			D = await (await fetch("./daten/aggregat.json", { cache: "no-cache" })).json();
		} catch {
			D = null;
		}
		const veraltet = Object.values(M)
			.map((m) => ({ m, tage: m.meta.geprueft ? tageSeit(m.meta.geprueft) : 9999 }))
			.sort((a, b) => b.tage - a.tage);
		const balken = (werte, namen) => {
			const max = Math.max(...werte, 1);
			const sum = werte.reduce((a, b) => a + b, 0) || 1;
			return `<ul class="balken">${werte.map((w, i) => `<li title="${esc(namen[i])}: ${w} (${Math.round((w / sum) * 100)} %)"><span class="balken-name">${esc(namen[i])}</span><span class="balken-spur"><i style="width:${(w / max) * 100}%"></i></span><span class="balken-wert">${w} <small>${Math.round((w / sum) * 100)} %</small></span></li>`).join("")}</ul>`;
		};
		const pNamen = K.stufen.map((s) => `P${s.nr} ${s.name}`);
		let daten = `<aside class="merke warnung"><p>Die aggregierten Daten konnten nicht geladen werden.</p></aside>`;
		if (D) {
			const gruppen = D.verteilung.gruppen.filter((g) => g.werte.reduce((a, b) => a + b, 0) >= D.mindestgroesse);
			const klein = D.verteilung.gruppen.length - gruppen.length;
			daten = `
			<aside class="merke warnung"><p><b>Beispieldaten.</b> ${esc(D.hinweis)}</p></aside>
			<p class="klein">Stand ${datum(D.stand)} · Zeitraum: ${esc(D.zeitraum)} · ${D.lernende} Lernende · Gruppen unter ${D.mindestgroesse} Personen werden nicht angezeigt.</p>
			<div class="kacheln">
				${D.aufstieg.map((a) => `<div class="kachel"><span class="kachel-name">Aufstiegsquote P${a.von} → P${a.von + 1}</span><span class="kachel-zahl">${Math.round((a.aufgestiegen / a.gestartet) * 100)} %</span><span class="kachel-sub">${a.aufgestiegen} von ${a.gestartet} · Median ${a.tage_median} Tage bis zum Aufstieg</span></div>`).join("")}
			</div>
			<section><h2>Verteilung P1–P4, gesamt</h2>${balken(D.verteilung.gesamt, pNamen)}</section>
			<section><h2>Verteilung pro Produktgruppe</h2>
				<div class="tabelle"><table class="zahlen"><thead><tr><th scope="col">Produktgruppe</th>${K.stufen.map((s) => `<th scope="col">P${s.nr}</th>`).join("")}<th scope="col">Anteil ab P2</th></tr></thead><tbody>
				${gruppen
					.map((g) => {
						const sum = g.werte.reduce((a, b) => a + b, 0);
						const ab2 = (sum - g.werte[0]) / sum;
						return `<tr><th scope="row">${esc(g.name)}</th>${g.werte.map((w) => `<td>${w}</td>`).join("")}<td><span class="mini" title="${Math.round(ab2 * 100)} % ab P2"><i style="width:${ab2 * 100}%"></i></span> ${Math.round(ab2 * 100)} %</td></tr>`;
					})
					.join("")}
				</tbody></table></div>
				${klein ? `<p class="klein">${klein} ${klein === 1 ? "Gruppe ist" : "Gruppen sind"} zu klein für eine Anzeige.</p>` : ""}
			</section>
			<section><h2>Abbruchstellen</h2>
				<p>Module und Übungen, an denen viele aufhören oder scheitern, sortiert nach Abschlussquote.</p>
				<div class="tabelle"><table class="zahlen"><thead><tr><th scope="col">Modul</th><th scope="col">Gestartet</th><th scope="col">Abgeschlossen</th><th scope="col">Abschlussquote</th><th scope="col">Fehlversuche je Übung</th></tr></thead><tbody>
				${D.abbruch
					.slice()
					.sort((a, b) => a.abgeschlossen / a.gestartet - b.abgeschlossen / b.gestartet)
					.map((a) => {
						const q = a.abgeschlossen / a.gestartet;
						return `<tr><th scope="row">${M[a.modul] ? `<a href="#/modul/${a.modul}">${esc(M[a.modul].meta.titel)}</a>` : esc(a.modul)}</th><td>${a.gestartet}</td><td>${a.abgeschlossen}</td><td><span class="mini" title="${Math.round(q * 100)} % schließen ab"><i style="width:${q * 100}%"></i></span> ${Math.round(q * 100)} %</td><td>${String(a.fehlversuche).replace(".", ",")}</td></tr>`;
					})
					.join("")}
				</tbody></table></div>
			</section>`;
		}
		main.innerHTML = `<section class="blatt">
			<p class="pfad"><a href="#/">← Karte</a></p>
			<p class="marke">Leitstelle · Service-Team Agentic Development</p>
			<h1 tabindex="-1">Wo stehen die Entwickler?</h1>
			<p class="vorspann">Verteilung, Aufstiegsquote, Zeit bis zum Aufstieg und Abbruchstellen. Nur aggregiert, nie als
				Bewertung einzelner Personen.</p>
			${daten}
			<section><h2>Inhaltspflege: letzte Überprüfung</h2>
				<p>Diese Tabelle ist echt: Sie liest die Metadaten der Module. Älter als ${K.veraltet_nach_tagen} Tage gilt als veraltet.</p>
				<div class="tabelle"><table class="zahlen"><thead><tr><th scope="col">Modul</th><th scope="col">Stufe</th><th scope="col">Geprüft am</th><th scope="col">Alter</th><th scope="col">Status</th></tr></thead><tbody>
				${veraltet.map(({ m, tage }) => `<tr><th scope="row"><a href="#/modul/${m.id}">${esc(m.meta.titel)}</a></th><td>P${m.stufe}</td><td>${datum(m.meta.geprueft)}</td><td>${tage} Tage</td><td>${tage > K.veraltet_nach_tagen ? '<span class="chip chip-warn">⚠ veraltet</span>' : esc(m.meta.status || "aktuell")}</td></tr>`).join("")}
				</tbody></table></div>
			</section>
		</section>`;
	}

	function zeigeFehlt() {
		main.innerHTML = `<section class="blatt schmal"><h1 tabindex="-1">Hier ist die Karte leer.</h1><p>Diese Seite gibt es nicht oder noch nicht.</p><p><a class="knopf" href="#/">Zurück zur Karte</a></p></section>`;
	}

	// ---------- Router ----------
	async function route() {
		const [, bereich = "", arg = ""] = (location.hash.replace(/^#/, "") || "/").split("/");
		main.onclick = null;
		const nav = { "": "start", stufe: "start", modul: "start", challenge: "start" }[bereich] || bereich;
		$$("[data-nav]").forEach((a) => (a.dataset.nav === nav ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
		if (bereich === "") zeigeStart();
		else if (bereich === "einstufung") await zeigeEinstufung();
		else if (bereich === "stufe") zeigeStufe(arg);
		else if (bereich === "modul") zeigeModul(arg);
		else if (bereich === "challenge") zeigeChallenge(arg);
		else if (bereich === "tourenbuch") zeigeTourenbuch();
		else if (bereich === "galerie") zeigeGalerie();
		else if (bereich === "mitmachen") zeigeMitmachen();
		else if (bereich === "leitstelle") await zeigeLeitstelle();
		else zeigeFehlt();
		window.scrollTo(0, 0);
		if (route.nichtErste) main.querySelector("h1")?.focus({ preventScroll: true });
		route.nichtErste = true;
		const h1 = main.querySelector("h1");
		document.title = (h1 && bereich ? h1.textContent.trim() + " · " : "") + "AI Learning Lab";
	}

	// Anker innerhalb der Startseite (#stufen) sollen nicht als Route gelten
	window.addEventListener("hashchange", () => {
		if (location.hash === "#stufen") {
			$("#stufen")?.scrollIntoView();
			return;
		}
		route();
	});

	lade()
		.then(() => {
			kopfStand();
			if (location.hash === "#stufen") history.replaceState(null, "", "#/");
			return route();
		})
		.catch((e) => {
			main.innerHTML = `<section class="blatt schmal"><h1>Die Inhalte konnten nicht geladen werden.</h1><p>Das Learning Lab liest seine Module aus dem Ordner <code>content/</code> und braucht dafür einen Webserver (zum Beispiel GitHub Pages oder <code>python3 -m http.server</code>).</p><p class="klein">${esc(e.message)}</p></section>`;
		});
})();
