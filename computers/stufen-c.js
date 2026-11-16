// Zone 3, Vernetzt: Rechner reden, schweigen und lernen (U15 bis U17).
(() => {
	"use strict";
	const { el, sv, knopf, meld, auftraege, regler, RUHIG } = PL;

	// ---------- U15 Netzwerke ----------
	PL.stufe({
		id: "netz", zone: 2, name: "Netzwerke", kurz: "Pakete suchen sich ihren Weg",
		frage: `<p>Ein Rechner allein ist ein Werkzeug. Milliarden verbundene Rechner sind das Internet. Aber wie kommt eine Nachricht ans andere Ende der Welt, wenn unterwegs ständig Leitungen ausfallen und niemand das ganze Netz überblickt?</p>
			<p>Die Antwort: Man zerlegt sie in kleine <b>Pakete</b> mit Nummer und Adresse. Jedes Paket reist für sich, von Router zu Router. Schick eine Nachricht los und leg dann Router lahm, indem du sie antippst.</p>`,
		bau(api) {
			const auf = auftraege(["Schick die Nachricht los.", "Schalte einen Router aus und schick sie noch einmal.", "Finde heraus: Wie viele Router müssen <b>mindestens</b> ausfallen, damit nichts mehr ankommt?"]);
			const K = { Du: [24, 110], R1: [98, 46], R2: [98, 174], R3: [165, 110], R4: [232, 46], R5: [232, 174], Ziel: [306, 110] };
			const KANTEN = [["Du", "R1"], ["Du", "R2"], ["R1", "R3"], ["R2", "R3"], ["R1", "R4"], ["R2", "R5"], ["R3", "R4"], ["R3", "R5"], ["R4", "Ziel"], ["R5", "Ziel"]];
			const TEILE = ["BIT ", "FÜR ", "BIT ", "ANS ", "ZIEL"];
			const aus = new Set();
			const svg = sv("svg", { viewBox: "0 0 330 220", class: "graph netz", role: "group", "aria-label": "Netz aus fünf Routern zwischen dir und dem Ziel" });
			const kEl = {};
			KANTEN.forEach(([a, b]) => { kEl[a + b] = kEl[b + a] = sv("line", { x1: K[a][0], y1: K[a][1], x2: K[b][0], y2: K[b][1], class: "kante" }, svg); });
			const gPak = sv("g", {});
			const nEl = {};
			for (const n in K) {
				const router = n[0] === "R";
				const g = sv("g", { class: "knoten" + (router ? "" : " end"), tabindex: router ? 0 : null, role: router ? "button" : null }, svg);
				if (router) sv("rect", { x: K[n][0] - 17, y: K[n][1] - 14, width: 34, height: 28, rx: 5 }, g);
				else sv("circle", { cx: K[n][0], cy: K[n][1], r: 19 }, g);
				const t = sv("text", { x: K[n][0], y: K[n][1] + 1 }, g); t.textContent = n;
				if (router) {
					const tu = () => {
						if (unterwegs) return;
						aus.has(n) ? aus.delete(n) : aus.add(n);
						male();
						status.sag(`${n} ist ${aus.has(n) ? "ausgefallen" : "wieder da"}. ${aus.size} von 5 Routern sind aus.`);
					};
					g.addEventListener("click", tu);
					g.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); tu(); } });
				}
				nEl[n] = g;
			}
			svg.appendChild(gPak);
			const status = meld("Tippe Router an, um sie aus- und einzuschalten.");
			const eingang = el("div", { class: "eingang" });
			let unterwegs = false;
			function male() {
				for (const n in nEl) {
					nEl[n].classList.toggle("aus", aus.has(n));
					if (n[0] === "R") nEl[n].setAttribute("aria-label", `Router ${n}, ${aus.has(n) ? "ausgefallen" : "in Betrieb"}`);
				}
				KANTEN.forEach(([a, b]) => kEl[a + b].classList.toggle("tot", aus.has(a) || aus.has(b)));
			}
			// Kürzester Weg über laufende Router. Bei gleich langen Wegen entscheidet der Zufall.
			function wegSuche() {
				const vor = { Du: null }, reihe = ["Du"];
				while (reihe.length) {
					const u = reihe.shift();
					if (u === "Ziel") break;
					const nachbarn = KANTEN.filter((k) => k.includes(u)).map((k) => (k[0] === u ? k[1] : k[0])).sort(() => Math.random() - 0.5);
					nachbarn.forEach((v) => { if (!(v in vor) && !aus.has(v)) { vor[v] = u; reihe.push(v); } });
				}
				if (!("Ziel" in vor)) return null;
				const p = ["Ziel"];
				while (vor[p[0]]) p.unshift(vor[p[0]]);
				return p;
			}
			let takt = null;
			api.raeume(() => clearInterval(takt));
			const send = knopf("Nachricht senden", () => {
				if (unterwegs) return;
				unterwegs = true; send.disabled = true;
				gPak.textContent = "";
				const da = [];
				const zeig = () => {
					const sortiert = da.slice().sort((a, b) => a - b);
					eingang.innerHTML = `<p class="rl">Angekommen in dieser Reihenfolge</p><div>${da.map((i) => `<span>${i + 1}</span>`).join("") || "<i>noch nichts</i>"}</div>
						<p class="rl">Nach Nummern sortiert und zusammengesetzt</p><p class="nachricht">${sortiert.map((i) => TEILE[i]).join("") || "…"}</p>`;
				};
				zeig();
				const pakete = TEILE.map((_, i) => {
					const weg = wegSuche();
					const g = sv("g", { class: "paket" }, gPak);
					sv("circle", { r: 9 }, g);
					const t = sv("text", { y: 1 }, g); t.textContent = i + 1;
					return { i, weg, g, t: -(i * 0.45 + Math.random() * 0.5), tempo: 0.035 + Math.random() * 0.03, fertig: false };
				});
				if (!pakete[0].weg) {
					gPak.textContent = "";
					unterwegs = false; send.disabled = false;
					if (auf.ok(1) && aus.size === 2 && !auf.ok(2)) {
						auf.ab(2);
						status.sag("Kein Weg mehr frei, und dafür haben zwei Router gereicht: die beiden direkt bei dir oder die beiden direkt am Ziel. Jeder einzelne Ausfall lässt sich umgehen.", "gut");
						api.fertig("Du hast gesehen, wie Pakete Ausfälle umgehen und wo das Netz verwundbar ist.");
					} else if (aus.size > 2) status.sag(`Nichts kommt an. Aber du hast ${aus.size} Router ausgeschaltet. Geht es mit weniger?`, "schlecht");
					else status.sag("Nichts kommt an: Es gibt keinen Weg mehr zum Ziel.", "schlecht");
					return;
				}
				status.sag("Fünf Pakete sind unterwegs. Jedes sucht sich selbst einen Weg.");
				takt = setInterval(() => {
					let alle = true;
					pakete.forEach((p) => {
						if (p.fertig) return;
						p.t += p.tempo * (RUHIG ? 4 : 1);
						alle = false;
						if (p.t < 0) { p.g.setAttribute("transform", `translate(${K.Du[0]} ${K.Du[1]})`); return; }
						const s = Math.floor(p.t);
						if (s >= p.weg.length - 1) { p.fertig = true; p.g.remove(); da.push(p.i); zeig(); return; }
						const a = K[p.weg[s]], b = K[p.weg[s + 1]], f = p.t - s;
						p.g.setAttribute("transform", `translate(${a[0] + (b[0] - a[0]) * f} ${a[1] + (b[1] - a[1]) * f})`);
					});
					if (alle) {
						clearInterval(takt);
						unterwegs = false; send.disabled = false;
						const wege = new Set(pakete.map((p) => p.weg.join(" "))).size;
						if (!auf.ok(0)) { auf.ab(0); status.sag(`Alle fünf Pakete sind da, über ${wege} verschiedene ${wege === 1 ? "Weg" : "Wege"}. Die Reihenfolge der Ankunft ist egal, denn jedes Paket trägt seine Nummer.`, "gut"); }
						else if (aus.size > 0 && !auf.ok(1)) { auf.ab(1); status.sag("Die Nachricht ist trotzdem vollständig angekommen. Die Pakete haben den Ausfall einfach umgangen.", "gut"); }
						else status.sag(`Angekommen über ${wege} ${wege === 1 ? "Weg" : "Wege"}. ${aus.size} Router sind aus.`);
					}
				}, 30);
			});
			const an = knopf("Alle Router einschalten", () => { if (unterwegs) return; aus.clear(); male(); status.sag("Alle fünf Router laufen."); }, "leise");
			const leiste = el("div", { class: "zeile" });
			leiste.append(send, an);
			api.feld.append(auf.el, svg, leiste, status, eingang);
			male();
		},
		warum: `<p>Das Verfahren heißt <b>Paketvermittlung</b>. Jedes Paket trägt die Adresse des Empfängers, die des Absenders und eine laufende Nummer. Ein <b>Router</b> kennt nicht den ganzen Weg. Er weiß nur, an welchen Nachbarn er ein Paket für eine bestimmte Gegend weiterreichen soll. Fällt ein Nachbar aus, nimmt er den nächsten.</p>
			<p>Deshalb gibt es im Internet keine Zentrale, die ausfallen könnte. Das war Absicht: Die Vorläufer des Internets wurden in den 1960er-Jahren so entworfen, dass sie weiterarbeiten, wenn Teile des Netzes zerstört werden. Verwundbar wird ein Netz nur an Engstellen, wie du sie bei den beiden Routern direkt neben dir gefunden hast.</p>
			<p>Die Arbeit ist auf zwei Abmachungen verteilt, sogenannte <b>Protokolle</b>. <b>IP</b> sorgt für Adressen und das Weiterreichen. <b>TCP</b> sitzt bei Absender und Empfänger: Es nummeriert die Pakete, setzt sie in der richtigen Reihenfolge zusammen und fordert verlorene noch einmal an. Darüber liegen Protokolle für bestimmte Zwecke, etwa HTTP für Webseiten.</p>
			<p>Auch hier hilft das Denken in Schichten, das du vom Steckbrett kennst. Wer eine Webseite baut, muss nichts über Glasfasern wissen. Jede Schicht verlässt sich darauf, dass die darunter ihre Arbeit tut.</p>`,
		merke: "Nachrichten reisen als nummerierte Pakete, jedes auf eigenem Weg. Router reichen nur weiter. Weil es keine Zentrale gibt, übersteht das Netz Ausfälle.",
		mehr: `Mehr dazu: <a href="../internet/">Wie das Internet funktioniert</a> mit DNS, Routern und Paketen im Detail.`,
		quiz: { f: "Paket 4 kommt vor Paket 2 an. Was passiert?", a: ["Die Nachricht ist verloren", "Der Empfänger sortiert nach den Nummern und setzt richtig zusammen", "Alle Pakete werden neu gesendet", "Paket 2 wird gelöscht"], r: 1, e: "Dafür trägt jedes Paket seine Nummer. Das erledigt TCP." },
	});

	// ---------- U16 Verschlüsselung ----------
	const modpot = (g, x, p) => { let r = 1; for (let i = 0; i < x; i++) r = (r * g) % p; return r; };
	PL.stufe({
		id: "krypto", zone: 2, name: "Verschlüsselung", kurz: "Geheimnisse auf offener Leitung",
		frage: `<p>Deine Pakete laufen über fremde Router. Jeder von ihnen kann mitlesen. Trotzdem tippst du Passwörter ein und bezahlst online. Das geht nur, weil die Pakete verschlüsselt sind.</p>
			<p>Fang als Angreifer an. Du hast diese Nachricht abgefangen. Sie wurde mit dem ältesten Verfahren der Welt verschlüsselt: Jeder Buchstabe ist im Alphabet um eine feste Zahl verschoben. Die Zahl ist der Schlüssel.</p>`,
		bau(api) {
			const auf = auftraege(["Knack die abgefangene Nachricht.", "Vereinbare mit dem Bot einen gemeinsamen Schlüssel.", "Wechsle die Seite: Finde als Lauscher die geheime Zahl des Bots."]);
			const klar = "TREFFEN UM ACHT AM ALTEN TURM";
			const schieb = (t, k) => t.replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 65 + k + 26) % 26) + 65));
			const geheim = schieb(klar, 7);
			const status = meld();
			const t1 = el("div");
			const zeig = el("p", { class: "chiffre", "aria-live": "polite" });
			const r = regler({ name: "Schlüssel: zurückschieben um", min: 0, max: 25, wert: 0, fmt: (v) => v + (v === 1 ? " Stelle" : " Stellen"), bei: (v) => { zeig.textContent = schieb(geheim, -v); } });
			zeig.textContent = geheim;
			const ja = knopf("Das ist die Nachricht", () => {
				if (r.wert() === 7) {
					if (!auf.ok(0)) auf.ab(0);
					status.sag("Geknackt mit Schlüssel 7. Es gibt nur 25 mögliche Schlüssel. Einfach alle durchzuprobieren dauert Sekunden.", "gut");
					t2.hidden = false;
				} else status.sag("Das ergibt noch keinen deutschen Satz. Schieb weiter.", "schlecht");
			});
			const z1 = el("div", { class: "zeile" });
			z1.appendChild(ja);
			t1.append(el("p", { class: "klein-titel" }, "Abgefangen"), zeig, r.el, z1);

			// Schlüsseltausch nach Diffie und Hellman
			const P = 23, G = 5;
			const b = 3 + Math.floor(Math.random() * 17);
			const B = modpot(G, b, P);
			const t2 = el("div", { class: "werk", hidden: true });
			const tafel = el("div", { class: "dh" });
			const ra = regler({ name: "Deine geheime Zahl a", min: 2, max: 20, wert: 6, bei: () => { getauscht = false; maleDH(); } });
			let getauscht = false;
			function maleDH() {
				const a = ra.wert(), A = modpot(G, a, P), s = modpot(B, a, P);
				tafel.innerHTML = `<div class="offen"><small>Öffentlich, jeder darf es sehen</small><p>Primzahl p = <b>${P}</b> · Basis g = <b>${G}</b></p><p>Du schickst A = ${G}<sup>a</sup> mod ${P} = <b>${getauscht ? A : "?"}</b></p><p>Der Bot schickt B = ${G}<sup>b</sup> mod ${P} = <b>${getauscht ? B : "?"}</b></p></div>
					<div><small>Nur bei dir</small><p>a = <b>${a}</b></p><p>Schlüssel = B<sup>a</sup> mod ${P} = <b>${getauscht ? s : "?"}</b></p></div>
					<div><small>Nur beim Bot</small><p>b = <b>geheim</b></p><p>Schlüssel = A<sup>b</sup> mod ${P} = <b>${getauscht ? modpot(A, b, P) : "?"}</b></p></div>`;
			}
			const tausch = knopf("Austauschen", () => {
				getauscht = true; maleDH();
				if (!auf.ok(1)) auf.ab(1);
				status.sag(`Ihr habt beide den Schlüssel ${modpot(B, ra.wert(), P)} ausgerechnet, obwohl er nie über die Leitung ging. Übertragen wurden nur A und B.`, "gut");
				t3.hidden = false;
			});
			const z2 = el("div", { class: "zeile" });
			z2.appendChild(tausch);
			t2.append(el("p", { class: "klein-titel" }, "Schlüsseltausch vor aller Augen"), el("p", { class: "rl" }, "„mod 23“ heißt: durch 23 teilen und nur den Rest behalten."), ra.el, z2, tafel);

			// Lauscher
			const t3 = el("div", { class: "werk", hidden: true });
			const probe = el("p", { class: "chiffre klein", "aria-live": "polite" });
			let versuche = new Set();
			const rx = regler({
				name: "Probier für b die Zahl", min: 1, max: 22, wert: 1,
				bei: (x) => {
					versuche.add(x);
					const w = modpot(G, x, P);
					probe.innerHTML = `${G}<sup>${x}</sup> mod ${P} = <b>${w}</b> ${w === B ? "= B. Treffer." : `≠ ${B}`}`;
					if (w === B && !auf.ok(2)) {
						auf.ab(2);
						status.sag(`Gefunden: b = ${x}, nach ${versuche.size} Versuchen. Bei p = 23 gibt es nur 22 Möglichkeiten. Echte Verfahren nehmen Zahlen mit über 600 Stellen. Dann reicht die Lebensdauer des Universums nicht zum Durchprobieren.`, "gut");
						api.fertig("Du hast eine Verschlüsselung geknackt und einen Schlüssel sicher vereinbart.");
					}
				},
			});
			probe.innerHTML = `Du kennst p, g, A und B = <b>${B}</b>. Gesucht ist b mit ${G}<sup>b</sup> mod ${P} = ${B}.`;
			t3.append(el("p", { class: "klein-titel" }, "Jetzt bist du der Lauscher"), probe, rx.el);
			api.feld.append(auf.el, t1, t2, t3, status);
			maleDH();
		},
		warum: `<p>Die Verschiebung heißt <b>Caesar-Chiffre</b>, weil Julius Caesar sie benutzt haben soll. Sie hat zwei Schwächen. Es gibt zu wenige Schlüssel, und beide Seiten müssen denselben Schlüssel kennen. Wie soll man ihn übergeben, wenn die Leitung abgehört wird?</p>
			<p>Die zweite Frage galt lange als unlösbar. 1976 fanden Whitfield Diffie und Martin Hellman die Antwort, die du gerade nachgespielt hast. Sie beruht auf einer <b>Einwegrechnung</b>: 5<sup>b</sup> mod 23 auszurechnen geht schnell. Aus dem Ergebnis auf b zurückzuschließen geht nur durch Probieren. Bei kleinen Zahlen ist das kein Hindernis. Bei Zahlen mit Hunderten Stellen ist es praktisch unmöglich.</p>
			<p class="formel">(g<sup>a</sup>)<sup>b</sup> = (g<sup>b</sup>)<sup>a</sup>, deshalb rechnen beide denselben Schlüssel aus</p>
			<p>Ein Bild dazu: Beide einigen sich offen auf Gelb. Jeder mischt seine geheime Farbe hinein und schickt die Mischung. Dann mischt jeder in die empfangene Mischung noch einmal die eigene geheime Farbe. Beide haben am Ende denselben Ton. Wer nur die Mischungen sieht, kann sie nicht wieder trennen.</p>
			<p>Das Schloss in der Adresszeile deines Browsers bedeutet genau das: Dein Gerät und der Server haben per Schlüsseltausch einen Schlüssel vereinbart, den kein Router dazwischen kennt. Damit wird alles Weitere verschlüsselt, mit einem Verfahren, das 2<sup>256</sup> mögliche Schlüssel hat statt 25.</p>`,
		merke: "Sichere Verschlüsselung beruht auf Rechnungen, die in eine Richtung leicht und in die andere praktisch unmöglich sind. So lässt sich ein Schlüssel sogar auf abgehörter Leitung vereinbaren.",
		quiz: { f: "Ein Lauscher hat p, g, A und B mitgeschnitten. Warum kennt er den Schlüssel trotzdem nicht?", a: ["Weil A und B verschlüsselt übertragen wurden", "Weil er dafür a oder b bräuchte, und die lassen sich bei großen Zahlen nicht zurückrechnen", "Weil der Schlüssel jede Sekunde wechselt", "Weil er die Primzahl nicht kennt"], r: 1, e: "Die geheimen Zahlen haben die Geräte nie verlassen." },
	});

	// ---------- U17 Lernende Maschinen ----------
	PL.stufe({
		id: "lernen", zone: 2, name: "Lernende Maschinen", kurz: "Regeln aus Beispielen statt von Hand",
		frage: `<p>Bisher hast du der Maschine jede Regel selbst vorgegeben. Für manche Aufgaben kennt aber niemand die Regel. Woran genau erkennst du eine Katze auf einem Foto? Versuch das einmal als Folge, Schleife und Bedingung aufzuschreiben.</p>
			<p>Der Ausweg: Die Maschine bekommt Beispiele mit der richtigen Antwort und sucht die Regel selbst. Auf dem Förderband liegen Äpfel und Zitronen. Die Waage misst das Gewicht, die Kamera den Rotanteil. Zieh zuerst selbst die Trennlinie.</p>`,
		bau(api) {
			const auf = auftraege(["Stell die Linie so ein, dass sie alle Früchte richtig trennt.", "Lass die Maschine die Linie selbst lernen.", "Gib ihr neue Früchte und lass sie noch einmal lernen."]);
			const B = 300, H = 240;
			const svg = sv("svg", { viewBox: `0 0 ${B} ${H}`, class: "plot", role: "img" });
			sv("rect", { x: 1, y: 1, width: B - 2, height: H - 2, rx: 6, class: "p-rahmen" }, svg);
			const seite = sv("path", { class: "p-seite" }, svg);
			const linie = sv("line", { class: "p-linie" }, svg);
			const gP = sv("g", {}, svg);
			const tx = sv("text", { x: B - 8, y: H - 8, class: "p-achse", "text-anchor": "end" }, svg); tx.textContent = "Gewicht →";
			const ty = sv("text", { x: 8, y: 16, class: "p-achse" }, svg); ty.textContent = "↑ Rotanteil";
			let punkte = [], w = [0, 0, 0], hand = true;
			function neueDaten() {
				const th = Math.random() * Math.PI, n = [Math.cos(th), Math.sin(th)], off = (Math.random() - 0.5) * 0.2;
				punkte = [];
				while (punkte.length < 26) {
					const x = 0.08 + Math.random() * 0.84, y = 0.08 + Math.random() * 0.84;
					const d = (x - 0.5) * n[0] + (y - 0.5) * n[1] - off;
					if (Math.abs(d) < 0.07) continue;
					const kl = d > 0 ? 1 : -1;
					if (punkte.filter((p) => p.kl === kl).length >= 13) continue;
					punkte.push({ x, y, kl });
				}
				// Rot nach oben: Äpfel sind die Klasse mit dem höheren mittleren Rotanteil
				const my = (k) => punkte.filter((p) => p.kl === k).reduce((s, p) => s + p.y, 0);
				if (my(1) < my(-1)) punkte.forEach((p) => { p.kl = -p.kl; });
			}
			const wert = (p) => w[0] * (p.x - 0.5) + w[1] * (p.y - 0.5) + w[2];
			const fehler = () => punkte.filter((p) => wert(p) * p.kl <= 0).length;
			function male() {
				gP.textContent = "";
				punkte.forEach((p) => {
					const falsch = wert(p) * p.kl <= 0;
					sv("circle", { cx: p.x * B, cy: (1 - p.y) * H, r: 6.5, class: (p.kl > 0 ? "apfel" : "zitrone") + (falsch ? " falsch" : "") }, gP);
				});
				// Linie w0·x + w1·y + w2 = 0 quer durchs Bild
				const len = Math.hypot(w[0], w[1]);
				if (len < 1e-9) { linie.setAttribute("opacity", 0); seite.setAttribute("d", ""); }
				else {
					const nx = w[0] / len, ny = w[1] / len, c = -w[2] / len;
					const px = 0.5 + nx * c, py = 0.5 + ny * c, L = 2;
					const a = [px - ny * L, py + nx * L], b = [px + ny * L, py - nx * L];
					linie.setAttribute("opacity", 1);
					linie.setAttribute("x1", a[0] * B); linie.setAttribute("y1", (1 - a[1]) * H);
					linie.setAttribute("x2", b[0] * B); linie.setAttribute("y2", (1 - b[1]) * H);
					const q = (p, k) => `${(p[0] + nx * k) * B} ${(1 - (p[1] + ny * k)) * H}`;
					seite.setAttribute("d", `M${q(a, 0)} L${q(b, 0)} L${q(b, 3)} L${q(a, 3)} Z`);
				}
				const f = fehler();
				zeile.innerHTML = `<span class="leg apfel"></span> Apfel <span class="leg zitrone"></span> Zitrone · getönte Seite: „Apfel“ · <b>${f} ${f === 1 ? "Frucht" : "Früchte"} falsch</b>`;
				svg.setAttribute("aria-label", `Streubild mit 13 Äpfeln und 13 Zitronen und einer Trennlinie. ${f} Früchte liegen auf der falschen Seite.`);
				return f;
			}
			const zeile = el("p", { class: "rl" });
			const status = meld("Dreh und verschieb die Linie mit den beiden Reglern.");
			const vonHand = () => {
				if (!hand) return;
				const th = (rw.wert() * Math.PI) / 180;
				w = [Math.cos(th), Math.sin(th), -rv.wert() / 100];
				const f = male();
				if (f === 0 && !auf.ok(0)) {
					auf.ab(0);
					status.sag("Kein Fehler mehr. Du hast zwei Zahlen eingestellt: Winkel und Lage. Genau diese Zahlen soll die Maschine jetzt selbst finden.", "gut");
					lern.hidden = false;
				}
			};
			const rw = regler({ name: "Winkel", min: 0, max: 359, wert: 90, fmt: (v) => v + "°", bei: vonHand });
			const rv = regler({ name: "Verschiebung", min: -45, max: 45, wert: 0, bei: vonHand });
			let takt = null;
			api.raeume(() => clearInterval(takt));
			const lern = knopf("Lernen lassen", () => {
				clearInterval(takt);
				hand = false; rw.inp.disabled = rv.inp.disabled = true;
				w = [0, 0, 0];
				let korr = 0, i = 0, ruhe = 0;
				male();
				status.sag("Die Maschine fängt ohne Linie an und geht die Früchte der Reihe nach durch.");
				takt = setInterval(() => {
					// Perzeptron-Regel: bei einem Fehler die Linie ein Stück zur falsch einsortierten Frucht drehen
					let gefunden = false;
					for (let n = 0; n < punkte.length && !gefunden; n++) {
						const p = punkte[i]; i = (i + 1) % punkte.length;
						if (wert(p) * p.kl <= 0) {
							w[0] += p.kl * (p.x - 0.5); w[1] += p.kl * (p.y - 0.5); w[2] += p.kl * 0.25;
							korr++; gefunden = true;
						}
					}
					const f = male();
					if (!gefunden || korr > 3000) {
						clearInterval(takt);
						const zweite = auf.ok(1);
						if (!zweite) { auf.ab(1); neu.hidden = false; }
						status.sag(`Fertig nach ${korr} Korrekturen, ${f} Fehler. Niemand hat der Maschine gesagt, wo die Linie liegt. Sie hat sie nur aus den Beispielen gefunden.${zweite ? " Dasselbe Programm, andere Daten, andere Linie." : ""}`, "gut");
						if (zweite && neueDa && !auf.ok(2)) { auf.ab(2); api.fertig("Die Maschine hat zweimal aus Beispielen gelernt."); }
					} else if (++ruhe % 3 === 0) status.sag(`Korrektur ${korr}: Eine Frucht lag falsch, die Linie rückt ein Stück in ihre Richtung. Noch ${f} falsch.`);
				}, RUHIG ? 30 : 90);
			});
			lern.hidden = true;
			let neueDa = false;
			const neu = knopf("Neue Früchte", () => {
				clearInterval(takt);
				neueDaten(); neueDa = true; w = [0, 0, 0]; male();
				status.sag("Eine neue Lieferung, andere Sorten. Die alte Linie passt nicht mehr. Lass die Maschine neu lernen.");
			}, "leise");
			neu.hidden = true;
			const leiste = el("div", { class: "zeile" });
			leiste.append(lern, neu);
			api.feld.append(auf.el, svg, zeile, rw.el, rv.el, leiste, status);
			neueDaten(); vonHand();
		},
		blatt: "Was die Maschine gelernt hat",
		warum: `<p>Die Maschine hat eine sehr einfache Regel befolgt: Geh die Beispiele durch. Liegt eines auf der falschen Seite, dreh die Linie ein Stück in seine Richtung. Wiederhole das, bis nichts mehr falsch liegt. Dieses Verfahren von 1958 heißt <b>Perzeptron</b>. Es ist das Urmodell des künstlichen Neurons.</p>
			<p class="formel">Apfel, wenn w₁ · Gewicht + w₂ · Rotanteil + b &gt; 0</p>
			<p>Die Zahlen w₁, w₂ und b heißen <b>Gewichte</b>. Am Anfang sind sie null, am Ende stecken in ihnen die Erfahrungen aus allen Beispielen. Das ist mit „Lernen“ gemeint: Zahlen so lange nachstellen, bis die Fehler verschwinden. Das Programm selbst ändert sich dabei nie. Mit anderen Daten findet es eine andere Linie.</p>
			<p>Ein einzelnes Neuron kann nur eine gerade Linie ziehen. Schaltet man aber viele hintereinander, sodass die Ausgänge der einen Schicht die Eingänge der nächsten sind, entstehen beliebig verwinkelte Grenzen. Das kennst du: Auch ein einzelnes Gatter konnte wenig, und verdrahtet wurde daraus ein Prozessor. Ein Sprachmodell wie die, mit denen du chattest, hat viele Milliarden Gewichte. Gelernt werden sie im Kern genauso: Beispiel ansehen, Fehler messen, Gewichte ein kleines Stück nachstellen.</p>
			<p>Und worauf läuft das alles? Auf Addierern und Speicherzellen, gebaut aus Gattern, gebaut aus Schaltern. Vom ersten Bit bis hierher ist nichts dazugekommen außer geschickter Verdrahtung und guten Ideen. Damit ist deine Platine fertig.</p>`,
		merke: "Maschinelles Lernen heißt: Gewichte nachstellen, bis die Fehler auf den Beispielen verschwinden. Die Regel steckt danach in den Zahlen, nicht im Programmtext.",
		mehr: `Weiter geht es hier: <a href="../ml/">20 ML-Algorithmen zum Anfassen</a>, <a href="../ki/">Wie Sprach-KI funktioniert</a> und <a href="../agenten/">Wie KI-Agenten arbeiten</a>.`,
		quiz: { f: "Was ändert sich, während das Perzeptron lernt?", a: ["Der Programmtext wird umgeschrieben", "Die Beispiele werden verschoben", "Die Gewichte, also die Zahlen, die Lage und Winkel der Linie festlegen", "Die Zahl der Früchte"], r: 2, e: "Das Programm bleibt gleich. Gelernt wird in den Zahlen." },
	});
})();
