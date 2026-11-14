// Der Marktbote, zweites Buch: Der Markt (Ausgaben 5 bis 9).
(() => {
	"use strict";
	const MB = window.MB;

	// ---------- 5 · Gleichgewicht ----------
	MB.ausgabe({
		rubrik: "Marktbericht",
		titel: "Der Preis, bei dem niemand übrig bleibt",
		kurz: "Gleichgewicht: Käufer und Bäcker finden zusammen, ohne dass jemand plant",
		frage: "Heute bist du der Ausrufer. Welchen Preis musst du rufen, damit jede Brezel einen Käufer findet und jeder Käufer eine Brezel?",
		szene: `<p>Auf dem Markt stehen viele Bäcker und viele Hungrige. Du rufst einen Preis aus. Die Käufer sagen, wie
			viele Brezeln sie zu diesem Preis wollen. Die Bäcker sagen, wie viele sie dafür liefern.</p>
			<p>Passt es nicht, rufst du einen neuen Preis. Mit möglichst wenigen Rufen sollst du den Preis treffen, bei
			dem es aufgeht. Danach passiert etwas in der Stadt, und du musst noch einmal ran.</p>`,
		spielname: "Dein Tag als Ausrufer",
		spiel(api) {
			const { Z, F } = api;
			let D0 = 140, phase = 1, rufe = 0, aus = false;
			const alt = [], pkt = [];
			const qd = (p) => Math.max(0, D0 - 20 * p), qs = (p) => Math.max(0, 20 * p - 20);
			const lage = api.text("<b>Gewöhnlicher Markttag.</b> Ruf einen Preis aus.");
			const bild = api.bild(0.62, (g, W, H) => {
				const { X, Y } = api.achsen(g, W, H, { xmax: 140, ymax: 8, xs: 20, ys: 1, xl: "Brezeln", yl: "Preis" });
				alt.forEach((t) => { Z.punkt(g, X(t.d), Y(t.p), { f: F.b, r: 3 }); });
				if (phase > 1) Z.linie(g, X(140), Y(0), X(0), Y(7), { f: F.b, b: 1.5, s: [5, 4] });
				if (aus) {
					Z.linie(g, X(140), Y(2), X(40), Y(7), { f: F.r, b: 2.5 });
					Z.linie(g, X(0), Y(1), X(140), Y(8), { b: 2.5 });
					Z.text(g, "Nachfrage", X(112), Y(3.6), { f: F.r, fett: true, gr: 14 });
					Z.text(g, "Angebot", X(96), Y(6.5), { fett: true, gr: 14, aus: "right" });
				}
				pkt.forEach((t) => {
					Z.linie(g, X(t.d), Y(t.p), X(t.s), Y(t.p), { f: F.b, b: 1 });
					Z.punkt(g, X(t.s), Y(t.p));
					Z.punkt(g, X(t.d), Y(t.p), { f: F.r });
				});
				Z.linie(g, X(0), Y(r.w), X(140), Y(r.w), { f: F.b, s: [3, 4], b: 1 });
				Z.punkt(g, W - 96, 12, { f: F.r, r: 3.5 }); Z.text(g, "wollen kaufen", W - 88, 16, { gr: 12 });
				Z.punkt(g, W - 96, 27, { r: 3.5 }); Z.text(g, "wird geliefert", W - 88, 31, { gr: 12 });
			}, "Schaubild: Für jeden ausgerufenen Preis ein roter Punkt für die gewünschte Menge und ein schwarzer für die gelieferte.");
			const r = api.regler({ l: "Preis ausrufen", min: 1, max: 7, st: 0.25, w: 2, f: (x) => `${api.T(x)} Taler`, on: () => bild.neu() });
			const buch = api.buch(["Ruf", "Preis", "Wollen", "Liefern", "Folge"], "Protokoll des Ausrufers");
			const kn = api.knopf("Preis ausrufen", () => {
				if (aus) return;
				const p = r.w, d = qd(p), s = qs(p);
				rufe++;
				pkt.push({ p, d, s });
				const folge = d > s ? `${d - s} gehen leer aus` : d < s ? `${s - d} bleiben liegen` : "geht auf";
				buch.zeile([`${rufe}.`, api.T(p), String(d), String(s), d === s ? `<b>${folge}</b>` : folge], d === s ? "best" : "");
				if (d > s) api.eil(`Gedränge bei ${api.T(p)} Talern: ${d - s} Hungrige bekommen nichts`, "Zu billig. Die Käufer überbieten sich schon, der Preis will nach oben.");
				else if (d < s) api.eil(`Bei ${api.T(p)} Talern bleiben ${s - d} Brezeln liegen`, "Zu teuer. Die Bäcker fangen an, sich zu unterbieten, der Preis will nach unten.");
				else if (phase === 1) {
					phase = 2;
					alt.push(...pkt); pkt.length = 0;
					D0 = 180;
					lage.innerHTML = "<b>Stadtfest!</b> Die Stadt ist voller Fremder, alle hungrig. Die Bäcker sind dieselben. Finde den neuen Preis.";
					api.eil(`Markt geräumt: ${d} Brezeln zu ${api.T(p)} Talern, niemand geht leer aus`, "Und jetzt: Stadtfest. Bei jedem Preis wollen 40 Leute mehr eine Brezel als vorher.");
				} else {
					aus = true; kn.disabled = true; r.aus(true);
					lage.innerHTML = "<b>Feierabend.</b> Die Linien zeigen, was hinter den Antworten steckte.";
					api.eil(`Stadtfest treibt Brezelpreis auf ${api.T(p)} Taler, Bäcker liefern ${d} Stück`, "Mehr Nachfrage hat den Preis gehoben und zugleich mehr Ware auf den Markt gebracht.");
					api.fertig(rufe <= 8 ? 3 : rufe <= 12 ? 2 : 1, `Du hast ${rufe} Rufe gebraucht. Erst 4 Taler und 60 Brezeln, nach dem Stadtfest 5 Taler und 80 Brezeln.`);
				}
				bild.neu();
			});
		},
		schlagzeile: "Niemand legt den Preis fest, und trotzdem findet ihn der Markt",
		artikel: `<p>Ist der Preis zu niedrig, wollen mehr Leute kaufen, als Ware da ist. Das nennt man
			<strong>Knappheit</strong> oder Nachfrageüberhang. Wer leer ausgeht, bietet mehr, und der Preis steigt. Ist
			er zu hoch, bleibt Ware liegen: ein <strong>Überschuss</strong>. Die Bäcker gehen mit dem Preis runter, um
			nicht auf ihren Brezeln zu sitzen.</p>
			<p>Nur an einem Punkt drückt nichts mehr: dort, wo sich Nachfrage- und Angebotskurve kreuzen. Das ist der
			<strong>Gleichgewichtspreis</strong>. Als Ausrufer hast du dich dorthin getastet. Auf einem echten Markt
			tun das viele Käufer und Verkäufer gleichzeitig, jeder nur mit Blick auf den eigenen Vorteil.</p>
			<p>Beim Stadtfest hat sich die Nachfragekurve nach rechts verschoben. Der alte Preis passte nicht mehr, es
			gab wieder Gedränge. Der neue Preis liegt höher, und die Bäcker liefern mehr. Sie wandern auf ihrer
			Angebotskurve nach oben und backen jetzt auch die teuren Bleche aus Ausgabe 4.</p>
			<p>Der Preis arbeitet dabei als Signal. Er sagt allen Bäckern „mehr backen“ und allen Käufern „überleg, ob
			es dir das wert ist“, ohne dass jemand die ganze Stadt überblicken muss. Friedrich Hayek hat darin die
			eigentliche Leistung von Märkten gesehen: Sie nutzen Wissen, das auf viele Köpfe verteilt ist.</p>`,
		merke: "Im Gleichgewicht ist die gewünschte Menge gleich der gelieferten. Jeder Preis daneben erzeugt Druck zurück dorthin.",
		formel: "140 − 20 · Preis = 20 · Preis − 20  →  Preis = 4, Menge = 60",
		quiz: {
			f: "Die Mehlpreise steigen stark. Backen wird für alle Bäcker teurer. Was passiert mit Brezelpreis und verkaufter Menge?",
			a: ["Preis steigt, Menge steigt.", "Preis steigt, Menge sinkt.", "Preis sinkt, Menge sinkt."],
			r: 1,
			n: "Noch nicht. Überleg, welche Kurve sich verschiebt: die der Bäcker oder die der Käufer?",
			w: "Richtig. Diesmal verschiebt sich das Angebot nach oben. Der neue Kreuzungspunkt liegt bei höherem Preis und kleinerer Menge. Beim Stadtfest stiegen beide, weil sich dort die Nachfrage verschob.",
		},
	});

	// ---------- 6 · Elastizität ----------
	MB.ausgabe({
		rubrik: "Preispolitik",
		titel: "Rauf oder runter? Kommt auf die Ware an",
		kurz: "Elastizität: wie stark Käufer auf den Preis reagieren",
		frage: "Du willst mehr Umsatz. Bei welcher Ware hilft ein höherer Preis, bei welcher ein niedrigerer?",
		szene: `<p>Dein Stand ist gewachsen. Du verkaufst jetzt vier Dinge. Bei jedem darfst du den Preis einmal um ein
			Fünftel ändern: 20 Prozent rauf oder 20 Prozent runter. Ziel ist jedes Mal ein höherer Umsatz, also mehr Geld
			in der Kasse.</p><p>Überleg vor jedem Klick: Wie leicht können die Leute auf diese Ware verzichten oder
			ausweichen?</p>`,
		spielname: "Vier Preisschilder",
		spiel(api) {
			const { Z, F } = api;
			const WAREN = [
				{ n: "Salz", p: 1, q: 80, e: 0.2, w: "Salz braucht jeder, und niemand würzt doppelt, weil es billiger ist. Die Menge bewegt sich kaum." },
				{ n: "Erdbeertörtchen", p: 4, q: 30, e: 1.8, w: "Ein Törtchen ist ein Luxus. Wird es teurer, lassen es viele einfach weg." },
				{ n: "Brot", p: 3, q: 60, e: 0.5, w: "Brot ist Alltag. Ein paar Leute kaufen weniger, die meisten zahlen den Aufpreis." },
				{ n: "Brezeln, seit Kunz nebenan dieselben verkauft", p: 2, q: 50, e: 3, w: "Die gleiche Brezel gibt es drei Schritte weiter. Schon ein kleiner Aufpreis schickt die Leute zu Kunz." },
			];
			let i = 0, richtig = 0, wahl = 0;
			const kopf = api.text("");
			const bild = api.bild(0.6, (g, W, H) => {
				const w = WAREN[i];
				const { X, Y } = api.achsen(g, W, H, { xmax: w.q * 2, ymax: w.p * 2, xs: w.q / 5, ys: w.p / 2, xl: "Menge", yl: "Preis" });
				const kurve = [];
				for (let p = w.p * 2; p >= w.p * 0.35; p -= w.p * 0.02) {
					const q = w.q * Math.pow(p / w.p, -w.e);
					if (q <= w.q * 2) kurve.push([X(q), Y(p)]);
				}
				if (wahl) {
					const p2 = w.p * (1 + 0.2 * wahl), q2 = w.q * Math.pow(p2 / w.p, -w.e);
					Z.schraff(g, Z.recht(X(0), Y(p2), X(q2) - X(0), Y(0) - Y(p2)), { f: F.r, d: 7, gegen: true });
					Z.text(g, `neu: ${api.T(Math.round(p2 * q2 * 10) / 10)}`, X(q2) - 6, Y(p2) + 15, { aus: "right", f: F.r, fett: true });
				}
				Z.schraff(g, Z.recht(X(0), Y(w.p), X(w.q) - X(0), Y(0) - Y(w.p)), { f: F.b, d: 7 });
				Z.text(g, `bisher: ${api.T(w.p * w.q)}`, X(0) + 6, Y(0) - 7, { fett: true });
				Z.pfad(g, kurve, { b: 2.5 });
				Z.punkt(g, X(w.q), Y(w.p));
			}, "Schaubild: Nachfragekurve der Ware. Das schraffierte Rechteck unter dem Punkt ist der Umsatz.");
			const kn = api.wahl(["Preis 20 % rauf", "Preis 20 % runter"], (j, b, bs) => {
				if (wahl) return;
				const w = WAREN[i];
				wahl = j === 0 ? 1 : -1;
				const f = Math.pow(1 + 0.2 * wahl, 1 - w.e), gut = f > 1;
				if (gut) richtig++;
				bs.forEach((k) => { k.disabled = true; });
				b.classList.add(gut ? "gut" : "schlecht");
				const alt = w.p * w.q, neu = Math.round(alt * f * 10) / 10;
				const mg = Math.round((Math.pow(1 + 0.2 * wahl, -w.e) - 1) * 100);
				api.eil(gut ? `${w.n.split(",")[0]}: Umsatz steigt von ${api.T(alt)} auf ${api.T(neu)} Taler` : `${w.n.split(",")[0]}: Umsatz fällt von ${api.T(alt)} auf ${api.T(neu)} Taler`,
					`Preis ${wahl > 0 ? "+" : "−"}20 %, Menge ${mg > 0 ? "+" : "−"}${Math.abs(mg)} %. ${w.w}`);
				weiter.hidden = false;
				weiter.textContent = i < WAREN.length - 1 ? "Nächste Ware" : "Abrechnen";
				bild.neu();
			}, { label: "Preis ändern" });
			const weiter = api.knopf("Nächste Ware", () => {
				if (i < WAREN.length - 1) { i++; wahl = 0; zeige(); return; }
				weiter.disabled = true;
				api.fertig(richtig === 4 ? 3 : richtig === 3 ? 2 : 1, `${richtig} von 4 Preisschildern haben den Umsatz erhöht. Bei Salz und Brot hilft rauf, bei Törtchen und den Brezeln neben Kunz hilft runter.`);
			});
			const zeige = () => {
				const w = WAREN[i];
				wahl = 0;
				kopf.innerHTML = `<b>Ware ${i + 1} von 4: ${w.n}.</b> Bisher ${api.T(w.p)} Taler, ${w.q} Stück am Tag, Umsatz ${api.T(w.p * w.q)} Taler.`;
				kn.bs.forEach((k) => { k.disabled = false; k.className = ""; });
				weiter.hidden = true;
				bild.neu();
			};
			zeige();
		},
		schlagzeile: "Ob ein höherer Preis mehr Geld bringt, entscheidet die Kundschaft",
		artikel: `<p>Ein höherer Preis hat immer zwei Folgen. Du bekommst mehr pro Stück, und du verkaufst weniger
			Stücke. Welche Folge überwiegt, hängt davon ab, wie empfindlich die Käufer reagieren. Dieses Maß heißt
			<strong>Preiselastizität der Nachfrage</strong>.</p>
			<p>Bei Salz fällt die Menge um etwa 4 Prozent, wenn der Preis um 20 Prozent steigt. Die Nachfrage ist
			<strong>unelastisch</strong>: Der Aufpreis schlägt den Mengenverlust, der Umsatz steigt. Beim Törtchen
			fällt die Menge um 28 Prozent. Die Nachfrage ist <strong>elastisch</strong>, und der höhere Preis kostet
			dich Geld.</p>
			<p>Die Grenze liegt bei genau 1: Sinkt die Menge prozentual so stark, wie der Preis steigt, bleibt der
			Umsatz gleich.</p>
			<p>Elastisch ist die Nachfrage vor allem dann, wenn es Ersatz gibt. Deine Brezel neben Kunz ist das beste
			Beispiel. Dazu kommen Dinge, auf die man verzichten kann, und alles, was einen großen Teil des Geldbeutels
			ausmacht. Mit der Zeit werden Käufer außerdem beweglicher: Wer heute tanken muss, tankt. In fünf Jahren
			fährt er vielleicht ein anderes Auto.</p>`,
		merke: "Unelastisch: Preis rauf bringt mehr Umsatz. Elastisch: Preis runter bringt mehr Umsatz.",
		formel: "Elastizität = Änderung der Menge in % ÷ Änderung des Preises in %",
		quiz: {
			f: "Eine Stadt verdoppelt die Parkgebühren in der Innenstadt, und die Einnahmen aus Parkscheinen steigen deutlich. Was sagt das über die Nachfrage nach Parkplätzen dort?",
			a: ["Sie ist elastisch.", "Sie ist unelastisch: Die meisten parken trotzdem.", "Darüber sagt es nichts."],
			r: 1,
			w: "Richtig. Steigt der Umsatz bei höherem Preis, ist die Menge weniger stark gefallen, als der Preis gestiegen ist. Das ist unelastische Nachfrage.",
		},
	});

	// ---------- 7 · Steuern und Preisdeckel ----------
	MB.ausgabe({
		rubrik: "Aus dem Rathaus",
		titel: "Wer zahlt die Brezelsteuer wirklich?",
		kurz: "Steuern und Preisdeckel: was passiert, wenn der Marktrat eingreift",
		frage: "Du sitzt im Marktrat. Der neue Brunnen kostet 80 Taler am Tag. Wie hoch setzt du die Steuer, und wer trägt sie am Ende?",
		szene: `<p>Du kennst den Markt aus Ausgabe 5: Ohne Eingriff kostet die Brezel 4 Taler, 60 Stück gehen weg. Jetzt
			sollen die Bäcker für jede verkaufte Brezel eine Steuer an die Stadt abführen.</p>
			<p><b>Erster Beschluss:</b> Hol mindestens 80 Taler Steuern am Tag herein. Dabei soll so wenig Handel wie
			möglich verloren gehen. <b>Zweiter Beschluss:</b> Danach verlangt der Rat billigere Brezeln, und du
			probierst einen Höchstpreis aus.</p>`,
		spielname: "Deine Sitzung im Marktrat",
		spiel(api) {
			const { Z, F } = api;
			let phase = 1, aus = false, taler = 1, deckelGesehen = false;
			const qd = (p) => Math.max(0, 140 - 20 * p), qs = (p) => Math.max(0, 20 * p - 20);
			const lage = api.text("<b>Erster Beschluss: die Brezelsteuer.</b> Schieb den Regler und schau, wer was zahlt.");
			const bild = api.bild(0.64, (g, W, H) => {
				const { X, Y } = api.achsen(g, W, H, { xmax: 140, ymax: 8, xs: 20, ys: 1, xl: "Brezeln", yl: "Preis" });
				Z.linie(g, X(140), Y(0), X(0), Y(7), { f: F.r, b: 2.5 });
				Z.linie(g, X(0), Y(1), X(140), Y(8), { b: 2.5 });
				if (phase === 1) {
					const t = rt.w, q = 60 - 10 * t, pk = 4 + t / 2, pv = 4 - t / 2;
					if (t > 0) {
						Z.linie(g, X(0), Y(1 + t), X(140 - 20 * t), Y(8), { b: 1.5, s: [5, 4] });
						Z.schraff(g, Z.recht(X(0), Y(pk), X(q) - X(0), Y(pv) - Y(pk)), { f: F.g, d: 6, fl: F.p });
						Z.schraff(g, [[X(q), Y(pk)], [X(60), Y(4)], [X(q), Y(pv)]], { f: F.r, d: 4, gegen: true, fl: F.p });
						Z.text(g, "Steuer", X(q / 2), Y(4) + 4, { aus: "center", f: F.g, fett: true, gr: 14 });
						if (W > 420) Z.text(g, "verlorener Handel", X(62), Y(4) + 4, { f: F.r, fett: true });
					}
					Z.punkt(g, X(q), Y(pk), { f: F.r });
					Z.punkt(g, X(q), Y(pv));
				} else {
					const c = rc.w, s = Math.min(qs(c), qd(c)), d = qd(c);
					Z.linie(g, X(0), Y(c), X(140), Y(c), { f: F.g, b: 2 });
					Z.text(g, `Höchstpreis ${api.T(c)}`, X(138), Y(c) + 15, { aus: "right", f: F.g, fett: true });
					if (c < 4) {
						Z.schraff(g, Z.recht(X(s), Y(c) - 12, X(d) - X(s), 12), { f: F.r, d: 5 });
						Z.text(g, `${d - s} gehen leer aus`, X((s + d) / 2), Y(c) - 17, { aus: "center", f: F.r, fett: true });
						Z.punkt(g, X(d), Y(c), { f: F.r });
					}
					Z.punkt(g, X(s), Y(c));
				}
				Z.text(g, "Nachfrage", X(8), Y(7.2), { f: F.r, fett: true });
				Z.text(g, "Angebot", X(136), Y(7.3), { aus: "right", fett: true });
			}, "Schaubild: Nachfrage und Angebot auf dem Brezelmarkt, dazu die Wirkung von Steuer oder Höchstpreis.");
			const k = api.kasten();
			const zeige = () => {
				if (phase === 1) {
					const t = rt.w, q = 60 - 10 * t, pk = 4 + t / 2, pv = 4 - t / 2;
					k.innerHTML = api.werte([
						["Käufer zahlen", `${api.T(pk)}`], ["Bäcker behalten", `${api.T(pv)}`],
						["Verkauft", `${q} von 60`], ["Steuer am Tag", `${api.T(t * q)}`, t * q >= 80 ? "gruen" : "rot"],
					]);
				} else {
					const c = rc.w, s = Math.min(qs(c), qd(c)), d = qd(c);
					k.innerHTML = api.werte([
						["Wollen kaufen", String(d)], ["Bäcker liefern", String(s)],
						["Bekommen eine", `${s} von ${d}`, d > s ? "rot" : "gruen"], ["Gehen leer aus", String(d - s), d > s ? "rot" : ""],
					]);
				}
				bild.neu();
			};
			const rt = api.regler({ l: "Steuer je Brezel", min: 0, max: 5, st: 0.5, w: 0, f: (x) => `${api.T(x)} Taler`, on: zeige });
			const rc = api.regler({ l: "Höchstpreis", min: 1.5, max: 5, st: 0.25, w: 5, f: (x) => `${api.T(x)} Taler`, on: zeige });
			rc.el.hidden = true;
			const buch = api.buch(["Beschluss", "Folge für Käufer", "Verkauft", "Für die Stadt"], "Ratsprotokoll");
			const kn = api.knopf("Steuer beschließen", () => {
				if (aus) return;
				if (phase === 1) {
					const t = rt.w, q = 60 - 10 * t, ein = t * q, pk = 4 + t / 2;
					buch.zeile([`Steuer ${api.T(t)}`, `zahlen ${api.T(pk)}`, `${q}`, `${api.T(ein)} Taler`], ein >= 80 ? "best" : "");
					if (ein < 80) {
						api.eil(`Brezelsteuer bringt nur ${api.T(ein)} Taler: Brunnen bleibt trocken`, t > 4 ? "So hoch besteuert, wird kaum noch gehandelt. Von wenig Brezeln gibt es wenig Steuer." : "Das reicht nicht. Versuch einen anderen Satz.");
						return;
					}
					taler = t === 2 ? 3 : 2;
					phase = 2;
					rt.el.hidden = true; rc.el.hidden = false;
					kn.textContent = "Höchstpreis verordnen";
					lage.innerHTML = "<b>Zweiter Beschluss: der Höchstpreis.</b> Die Steuer ist für diesen Versuch ausgesetzt. Die Brezel soll billiger werden. Stell einen Höchstpreis ein und verordne ihn.";
					api.eil(`Brunnen finanziert: ${api.T(t)} Taler Steuer, Käufer zahlen ${api.T(pk)}, Bäcker behalten ${api.T(4 - t / 2)}`,
						t === 2 ? "Die Steuer zahlen dem Namen nach die Bäcker. Getragen wird sie je zur Hälfte von Käufern und Bäckern. 20 Brezeln werden nicht mehr gehandelt."
							: `Der Brunnen steht, aber ${10 * t} Brezeln am Tag werden nicht mehr gehandelt. Mit 2 Talern Steuer wären dieselben 80 Taler bei nur 20 verlorenen Brezeln zusammengekommen.`);
					zeige();
				} else {
					const c = rc.w, s = Math.min(qs(c), qd(c)), d = qd(c);
					if (c >= 4) {
						api.eil(`Höchstpreis von ${api.T(c)} Talern: Niemand merkt etwas`, "Der Marktpreis liegt bei 4 Talern. Ein Deckel darüber greift nicht. Setz ihn tiefer.");
						return;
					}
					buch.zeile([`Deckel ${api.T(c)}`, `zahlen ${api.T(c)}`, `${s}`, `${d - s} ohne Brezel`]);
					api.eil(`Brezel für ${api.T(c)} Taler: Schlange um den ganzen Platz, ${d - s} gehen leer aus`,
						`Vorher bekamen 60 Leute eine Brezel, jetzt nur noch ${s}. Zum niedrigen Preis wollen mehr kaufen und weniger backen.`);
					if (!deckelGesehen) {
						deckelGesehen = true;
						aus = true; kn.disabled = true;
						api.fertig(taler, taler === 3
							? "2 Taler Steuer bringen die 80 Taler mit dem kleinsten Schaden. Der Höchstpreis hat die Brezel billiger gemacht und zugleich knapper. Du kannst den Deckel weiter verschieben."
							: "Der Brunnen ist bezahlt, aber mit 2 Talern Steuer wäre weniger Handel verloren gegangen. Der Höchstpreis hat die Brezel billiger und zugleich knapper gemacht.");
					}
				}
			});
			zeige();
		},
		schlagzeile: "Wer die Steuer abführt und wer sie trägt, sind zwei verschiedene Fragen",
		artikel: `<p>Die Bäcker überweisen die Steuer. Trotzdem ist die Brezel für die Käufer teurer geworden, bei 2
			Talern Steuer um einen Taler. Den anderen Taler tragen die Bäcker, die pro Brezel weniger behalten. Diese
			Aufteilung heißt <strong>Steuerinzidenz</strong>. Sie hängt nicht davon ab, wer das Geld ans Rathaus
			trägt.</p>
			<p>Entscheidend ist, wer schlechter ausweichen kann. Hier reagieren beide Seiten gleich stark, also teilen
			sie sich die Last. Wären die Käufer auf Brezeln angewiesen, also unelastisch wie beim Salz aus Ausgabe 6,
			trügen sie fast alles.</p>
			<p>Die Steuer treibt einen Keil zwischen den Preis der Käufer und den Erlös der Bäcker. Geschäfte, die
			beiden etwas gebracht hätten, kommen nicht mehr zustande. Dieser <strong>verlorene Handel</strong> nützt
			niemandem, auch der Stadt nicht. Er wächst schneller als die Steuer selbst: Bei 4 Talern gehen doppelt so
			viele Brezeln verloren wie bei 2, und die Einnahmen sind dieselben.</p>
			<p>Ein <strong>Höchstpreis</strong> unter dem Marktpreis wirkt anders. Er macht die Ware billiger und
			zugleich knapper: Mehr Leute wollen kaufen, weniger Bäcker backen. Wer eine Brezel bekommt, entscheidet
			dann die Schlange, das Glück oder die Bekanntschaft mit dem Bäcker. Mietpreisbremsen und Benzinpreisdeckel
			zeigen dasselbe Muster. Ob der Eingriff trotzdem richtig ist, ist eine politische Frage. Die Nebenwirkung
			gehört aber in die Rechnung.</p>`,
		merke: "Steuern landen bei der Seite, die schlechter ausweichen kann. Preisdeckel machen billiger und knapper zugleich.",
		formel: "Steuereinnahmen = Steuer × Menge = t × (60 − 10 · t)",
		quiz: {
			f: "Die Stadt beschließt, dass ab morgen die Käufer die 2 Taler Steuer an der Kasse zahlen und nicht mehr die Bäcker. Was ändert sich für die Käufer?",
			a: ["Sie zahlen jetzt insgesamt 6 Taler statt 5.", "Nichts. Sie zahlen 3 an den Bäcker und 2 Steuer, zusammen 5 wie vorher.", "Sie zahlen weniger, weil die Bäcker entlastet werden."],
			r: 1,
			w: "Richtig. Der Preis am Stand fällt auf 3 Taler, dazu kommen 2 Taler Steuer. Wer die Steuer abführt, ändert nichts daran, wer sie trägt.",
		},
	});

	// ---------- 8 · Kosten und Grenzkosten ----------
	MB.ausgabe({
		rubrik: "Buchhaltung",
		titel: "Die Miete ist weg, egal was du tust",
		kurz: "Kosten und Grenzkosten: fixe Kosten, variable Kosten und die Frage, ob du heute aufmachst",
		frage: "Es regnet, die Leute zahlen wenig. Machst du den Stand trotzdem auf?",
		szene: `<p>Du hast den Standplatz samt Ofen für den ganzen Monat gemietet: 60 Taler am Tag, im Voraus bezahlt.
			Dazu kommen Teig und Holz für jedes Blech, und wie immer wird jedes weitere Blech teurer:</p>
			<table><tr><th>Blech</th><td>1.</td><td>2.</td><td>3.</td><td>4.</td><td>5.</td><td>6.</td><td>7.</td><td>8.</td></tr>
			<tr><th>Zutaten</th><td>10</td><td>12</td><td>14</td><td>18</td><td>24</td><td>32</td><td>42</td><td>56</td></tr></table>
			<p>Drei Tage, dreimal anderes Wetter. Du entscheidest jeden Morgen, wie viele Bleche du backst. Null Bleche
			heißt: Der Stand bleibt zu.</p>`,
		spiel(api) {
			const { Z, F } = api;
			const MC = [10, 12, 14, 18, 24, 32, 42, 56], MIETE = 60;
			const TAGE = [["Sonne", 40], ["Regen", 20], ["Sturm", 9]];
			const vk = (n) => MC.slice(0, n).reduce((a, b) => a + b, 0);
			const erg = (p, n) => p * n - vk(n) - MIETE;
			const opt = (p) => MC.filter((c) => c <= p).length;
			let tag = 0, summe = 0, aus = false;
			const ansage = api.text("");
			const bild = api.bild(0.56, (g, W, H) => {
				const { X, Y } = api.achsen(g, W, H, { xmax: 8, ymax: 60, xs: 1, ys: 10, xl: "Blech", yl: "Zutaten für dieses Blech", xf: (x) => (x ? `${x}.` : "") });
				const p = TAGE[Math.min(tag, 2)][1], bw = (X(1) - X(0)) * 0.74;
				MC.forEach((c, i) => {
					const xx = X(i) + (X(1) - X(0) - bw) / 2, an = i < r.w;
					if (an) Z.schraff(g, Z.recht(xx, Y(c), bw, Y(0) - Y(c)), { fl: c <= p ? F.t : F.r, f: c <= p ? F.t : F.r, d: 99 });
					else Z.pfad(g, Z.recht(xx, Y(c), bw, Y(0) - Y(c)), { zu: true, b: 1.5, f: F.b });
					Z.text(g, String(c), xx + bw / 2, Y(c) - 5, { aus: "center", fett: an, f: an ? F.t : F.b });
				});
				Z.linie(g, X(0), Y(p), X(8), Y(p), { f: F.g, b: 2, s: [6, 4] });
				Z.text(g, `Preis heute: ${p}`, X(0) + 6, Y(p) - 5, { f: F.g, fett: true });
			}, "Balken: Zutatenkosten jedes Blechs. Die gestrichelte Linie ist der heutige Preis je Blech.");
			const k = api.kasten();
			const zeige = () => {
				const p = TAGE[Math.min(tag, 2)][1], n = r.w, e = erg(p, n);
				k.innerHTML = api.werte([
					["Einnahmen", String(p * n)], ["Zutaten", `−${vk(n)}`], ["Miete", `−${MIETE}`],
					["Ergebnis", api.de(e), e < 0 ? "rot" : "gruen"],
				]);
				bild.neu();
			};
			const r = api.regler({ l: "Bleche backen", min: 0, max: 8, w: 4, f: (n) => (n ? `${n} Bleche` : "Stand bleibt zu"), on: zeige });
			const buch = api.buch(["Tag", "Preis", "Bleche", "Ergebnis"]);
			const sag = () => {
				const [w, p] = TAGE[tag];
				ansage.innerHTML = `<b>Tag ${tag + 1} von 3: ${w}.</b> Ein Blech Brezeln bringt heute <b>${p} Taler</b>.`;
			};
			sag();
			const kn = api.knopf("Tag abrechnen", () => {
				if (aus) return;
				const [w, p] = TAGE[tag], n = r.w, e = erg(p, n), o = opt(p), eo = erg(p, o);
				summe += e;
				buch.zeile([`${tag + 1}. ${w}`, String(p), n ? String(n) : "zu", `<b>${api.de(e)}</b>`], n === o ? "best" : "");
				if (tag === 0) {
					if (n === o) api.eil(`Sonnentag: ${n} Bleche, ${e} Taler Gewinn nach Miete`, "Das siebte Blech hätte 42 gekostet und 40 gebracht.");
					else api.eil(`Sonnentag endet mit ${api.de(e)} Talern`, `Mit ${o} Blechen wären es ${eo} gewesen: backen, solange das nächste Blech weniger kostet als 40.`);
				} else if (tag === 1) {
					if (n === 0) api.eil("Stand bleibt bei Regen zu: 60 Taler Verlust", "Die Miete läuft weiter. Mit vier Blechen hättest du 26 Taler davon wieder hereingeholt und nur 34 verloren.");
					else if (n === o) api.eil("Regentag: 34 Taler Verlust, und trotzdem richtig entschieden", "Zu Hause geblieben wären es 60 gewesen. Die vier Bleche haben 26 Taler zur Miete beigesteuert.");
					else api.eil(`Regentag: ${api.de(e)} Taler`, `Mit ${o} Blechen wäre der Verlust auf 34 Taler geschrumpft. Verlust heißt nicht automatisch: zumachen.`);
				} else {
					if (n === 0) api.eil("Sturm: Stand bleibt zu, 60 Taler Miete verloren", "Richtig so. Schon das erste Blech kostet 10 Taler Zutaten und bringt nur 9.");
					else api.eil(`Im Sturm gebacken: ${api.de(e)} Taler`, "Jedes Blech hat heute mehr Zutaten gekostet, als es eingebracht hat. Zu Hause wären es nur 60 Verlust gewesen.");
				}
				tag++;
				if (tag === 3) {
					aus = true; kn.disabled = true; r.aus(true);
					ansage.innerHTML = "<b>Drei Tage abgerechnet.</b>";
					api.fertig(summe >= -26 ? 3 : summe >= -45 ? 2 : 1, `Ergebnis der drei Tage: ${api.de(summe)} Taler. Das Beste wären −24 gewesen: sechs Bleche bei Sonne, vier bei Regen, keins bei Sturm.`);
				} else { sag(); zeige(); }
			});
			zeige();
		},
		schlagzeile: "Bezahltes Geld ist kein Grund, weiterzumachen, und kein Grund, aufzuhören",
		artikel: `<p>Deine Kosten bestehen aus zwei Sorten. <strong>Fixe Kosten</strong> fallen an, egal wie viel du
			backst: die Miete. <strong>Variable Kosten</strong> wachsen mit jedem Blech: Teig und Holz. Für die Frage
			„wie viel backe ich heute?“ zählen nur die variablen. Die Miete ist bezahlt und kommt nicht zurück, was
			auch immer du tust. Ökonomen sagen dazu <strong>versunkene Kosten</strong>.</p>
			<p>Am Regentag hast du Verlust gemacht, egal wie du es anstellst. Trotzdem war Backen richtig: Vier Bleche
			bringen 80 Taler und kosten 54 an Zutaten. Die 26 Taler Unterschied nennt man
			<strong>Deckungsbeitrag</strong>, weil sie einen Teil der Miete decken. Zumachen hätte den Verlust größer
			gemacht.</p>
			<p>Am Sturmtag liegt der Preis unter den Zutaten für das erste Blech. Jedes Blech vergrößert den Verlust,
			also bleibt der Ofen kalt. Die Regel für heute lautet: Mach auf, solange der Preis die variablen Kosten
			deckt.</p>
			<p>Auf lange Sicht sieht es anders aus. Wenn der Mietvertrag ausläuft, ist die Miete wieder eine
			Entscheidung. Reichen die Einnahmen übers Jahr nicht für alle Kosten, verlängerst du nicht. Deshalb fahren
			Restaurants auch an schwachen Abenden weiter, und manche schließen trotzdem am Jahresende.</p>
			<p>Der Denkfehler lauert überall: „Ich habe die Karte bezahlt, also gehe ich hin, obwohl ich krank bin.“
			Das Geld ist in beiden Fällen weg. Es zählt nur, was ab jetzt besser ist.</p>`,
		merke: "Versunkene Kosten gehören nicht in die Entscheidung. Es zählt nur, was sich ab jetzt noch ändern lässt.",
		formel: "Gewinn = Einnahmen − variable Kosten − fixe Kosten · Heute aufmachen, wenn Preis ≥ variable Kosten des ersten Blechs",
		quiz: {
			f: "Du hast 30 Taler für ein Kochbuch bezahlt und merkst nach zwei Rezepten: Es taugt nichts. Ein Freund sagt: „Koch es durch, sonst waren die 30 Taler umsonst.“ Was stimmt?",
			a: ["Er hat recht, sonst ist das Geld verschwendet.", "Die 30 Taler sind weg, ob du weiterkochst oder nicht. Es zählt nur, ob dir die nächsten Rezepte etwas bringen.", "Du solltest genau die Hälfte kochen."],
			r: 1,
			w: "Richtig. Das ist der Trugschluss der versunkenen Kosten. Schlechtes Essen macht die 30 Taler nicht wieder gut.",
		},
	});

	// ---------- 9 · Wettbewerb und Monopol ----------
	MB.ausgabe({
		rubrik: "Konkurrenz",
		titel: "Kunz macht nebenan auf",
		kurz: "Wettbewerb und Monopol: allein am Markt und dann nicht mehr",
		frage: "Du bist der einzige Brezelstand der Stadt. Welchen Preis nimmst du, und was bleibt davon, wenn ein zweiter Stand aufmacht?",
		szene: `<p>Eine Brezel kostet dich in der Herstellung 2 Taler. Je teurer du sie verkaufst, desto weniger Leute
			kaufen: Bei 2 Talern wären es 80 Stück, mit jedem Taler mehr zehn weniger.</p>
			<p><b>Drei Tage</b> gehört dir der Markt allein. Finde den Preis mit dem höchsten Gewinn. Dann eröffnet Kunz
			direkt neben dir, mit denselben Brezeln und denselben Kosten. Die Leute kaufen beim Billigeren. <b>Sechs
			Tage</b> Preiskampf.</p>`,
		spiel(api) {
			const { Z, F } = api;
			const K = 2, q = (p) => Math.max(0, 100 - 10 * p);
			const tage = [];
			let aus = false, bestMono = 0, kunz = null, letzter = 0;
			const ansage = api.text("<b>Tag 1 von 9.</b> Du bist allein am Markt.");
			const bild = api.bild(0.5, (g, W, H) => {
				const { X, Y } = api.achsen(g, W, H, { xmax: 9, ymax: 10, xs: 1, ys: 2, xl: "Tag", yl: "Preis" });
				Z.linie(g, X(0), Y(K), X(9), Y(K), { f: F.b, b: 1.5, s: [5, 4] });
				Z.text(g, "Kosten je Brezel", X(9) - 2, Y(K) + 15, { aus: "right", f: F.b, fett: true, gr: 12 });
				Z.linie(g, X(3.5), Y(0), X(3.5), Y(10), { f: F.b, b: 1, s: [2, 4] });
				Z.text(g, "Kunz eröffnet", X(3.6), Y(9.4), { gr: 12, f: F.r, fett: true });
				Z.pfad(g, tage.map((t, i) => [X(i + 1), Y(t.p)]), { b: 2.5 });
				Z.pfad(g, tage.filter((t) => t.k != null).map((t) => [X(tage.indexOf(t) + 1), Y(t.k)]), { b: 2.5, f: F.r });
				tage.forEach((t, i) => {
					Z.punkt(g, X(i + 1), Y(t.p));
					if (t.k != null) Z.punkt(g, X(i + 1), Y(t.k), { f: F.r });
				});
			}, "Schaubild: dein Preis (schwarz) und der Preis von Kunz (rot) über neun Tage.");
			const r = api.regler({ l: "Dein Preis", min: 2, max: 10, st: 0.5, w: 4, f: (x) => `${api.T(x)} Taler` });
			const buch = api.buch(["Tag", "Du", "Kunz", "Du verkaufst", "Dein Gewinn"]);
			const kn = api.knopf("Stand öffnen", () => {
				if (aus) return;
				const p = r.w, n = tage.length + 1;
				if (n <= 3) {
					const gw = (p - K) * q(p);
					bestMono = Math.max(bestMono, gw);
					tage.push({ p, k: null });
					buch.zeile([`${n}.`, api.T(p), "–", String(q(p)), `<b>${api.T(gw)}</b>`], gw === bestMono ? "best" : "");
					if (gw === 160) api.eil("Einziger Brezelstand der Stadt verdient 160 Taler am Tag", "Mehr geht nicht: 6 Taler je Brezel, 40 Stück. Bei 2 Talern hätten 80 Leute eine Brezel bekommen.");
					else api.eil(`${q(p)} Brezeln zu ${api.T(p)} Talern: ${api.T(gw)} Taler Gewinn`, p < 6 ? "Du bist allein. Was hindert dich, mehr zu verlangen?" : "Zu teuer wird es auch dem Hungrigsten. Etwas weniger?");
					letzter = p;
					if (n === 3) {
						ansage.innerHTML = "<b>Tag 4 von 9: Kunz ist da.</b> Er hat gestern dein Preisschild gesehen. Seinen Preis erfährst du erst, wenn du deinen gesetzt hast.";
					} else ansage.innerHTML = `<b>Tag ${n + 1} von 9.</b> Du bist allein am Markt.`;
				} else {
					kunz = Math.max(2.5, Math.min(kunz == null ? 99 : kunz, letzter) - 0.5);
					const menge = p < kunz ? q(p) : p === kunz ? q(p) / 2 : 0, gw = (p - K) * menge;
					tage.push({ p, k: kunz });
					buch.zeile([`${n}.`, api.T(p), api.T(kunz), String(menge), `<b>${api.T(gw)}</b>`]);
					if (p > kunz) api.eil(`Kunz verlangt ${api.T(kunz)} Taler, du ${api.T(p)}: Dein Stand bleibt leer`, "Gleiche Brezel, niedrigerer Preis. Alle gehen zu Kunz.");
					else if (p === kunz) api.eil(`Beide Stände bei ${api.T(p)} Talern: Kundschaft teilt sich auf`, `Du verkaufst ${menge} Brezeln und verdienst ${api.T(gw)} Taler.`);
					else api.eil(`Du unterbietest Kunz: ${menge} Brezeln, ${api.T(gw)} Taler Gewinn`, "Kunz hat es gesehen. Morgen geht er unter deinen Preis.");
					letzter = p;
					if (n === 9) {
						aus = true; kn.disabled = true; r.aus(true);
						ansage.innerHTML = "<b>Neun Tage vorbei.</b>";
						api.eil(`Preiskampf am Brezelstand: Die Brezel kostet nur noch ${api.T(Math.min(p, kunz))} Taler, die Kundschaft jubelt`, "Als du allein warst, lag der Preis bei 6 Talern. Jetzt liegt er knapp über den Kosten.");
						api.fertig(bestMono >= 160 ? 3 : bestMono >= 150 ? 2 : 1, `Allein hast du bis zu ${api.T(bestMono)} Taler am Tag verdient (möglich: 160 bei 6 Talern). Mit Kunz nebenan ist der Gewinn fast verschwunden.`);
					} else ansage.innerHTML = `<b>Tag ${n + 1} von 9.</b> Kunz stand gestern bei ${api.T(kunz)} Talern.`;
				}
				bild.neu();
			});
		},
		schlagzeile: "Der Gewinn des einen Stands ist die Einladung an den nächsten",
		artikel: `<p>Allein am Markt bist du ein <strong>Monopolist</strong>. Du nimmst den Preis nicht hin, du setzt
			ihn. Dabei wägst du ab: Jeder Taler mehr bringt mehr pro Brezel und kostet Käufer. Dein Gewinn war bei 6
			Talern am größten, dem Dreifachen deiner Kosten. Verkauft hast du nur 40 Brezeln, obwohl 80 Leute bereit
			gewesen wären, mindestens die Kosten zu zahlen. Ein Monopol hält die Menge knapp, um den Preis hochzuhalten.</p>
			<p>Mit Kunz ändert sich die Rechnung. Wer einen halben Taler billiger ist, bekommt alle Käufer. Also
			unterbietet ihr euch, bis keiner mehr tiefer kann: bis knapp über die Kosten. Im
			<strong>vollkommenen Wettbewerb</strong> ist der Preis gleich den Grenzkosten, und der Gewinn über die
			Kosten hinaus verschwindet.</p>
			<p>Für dich ist das bitter, für die Stadt ein Gewinn. Fast doppelt so viele Leute bekommen eine Brezel, und jeder
			zahlt weniger. Hohe Gewinne wirken auf Märkten wie ein Leuchtfeuer: Sie ziehen Nachahmer an, bis sie weg
			sind.</p>
			<p>Deshalb versuchen Firmen, dem reinen Preiskampf zu entkommen: mit einer Brezel, die es nur bei ihnen gibt,
			mit einer Marke, einem Patent oder einem besseren Platz. Und deshalb sind <strong>Preisabsprachen</strong>
			verboten. Hättet ihr euch beide auf 6 Taler geeinigt, hättet ihr die Kundschaft gemeinsam geschröpft.
			Warum solche Absprachen von selbst wackeln, zeigt das Gefangenendilemma in der
			<a href="../game-theory/#level-5">Spielhalle</a>.</p>`,
		merke: "Wettbewerb drückt den Preis auf die Kosten. Dauerhaft Gewinn macht nur, wer etwas hat, das andere nicht einfach nachmachen können.",
		formel: "Monopolgewinn = (Preis − 2) × (100 − 10 · Preis) · am größten bei Preis = 6",
		quiz: {
			f: "In einer Stadt machen alle fünf Eisdielen dauerhaft hohe Gewinne, und trotzdem eröffnet nie eine sechste. Was ist die wahrscheinlichste Erklärung?",
			a: ["Die Leute dort mögen Eis besonders gern.", "Irgendetwas hält neue Anbieter fern, zum Beispiel fehlende Standplätze oder eine Genehmigung, die keiner mehr bekommt.", "Die Eisdielen sind besonders fleißig."],
			r: 1,
			w: "Richtig. Ohne Hürde würden die Gewinne Nachahmer anziehen, bis sie verschwinden. Dauerhafte Gewinne brauchen eine Eintrittsschranke.",
		},
	});
})();
