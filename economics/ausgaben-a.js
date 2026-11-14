// Der Marktbote, erstes Buch: Dein Stand (Ausgaben 1 bis 4).
(() => {
	"use strict";
	const MB = window.MB;

	// ---------- 1 · Knappheit und Opportunitätskosten ----------
	MB.ausgabe({
		rubrik: "Zeit und Geld",
		titel: "Acht Stunden, zwei Möglichkeiten",
		kurz: "Knappheit und Opportunitätskosten: was eine Stunde wirklich kostet",
		frage: "Dein Samstag hat acht Stunden. Was kostet dich eine Stunde am Stand?",
		szene: `<p>Du hast einen Brezelstand auf dem Wochenmarkt. Morgens stehen die Leute Schlange, nachmittags wird es
			ruhig. Nebenan sucht der Gemüsehändler jemanden für Botengänge: 7 Taler die Stunde, so viele Stunden du willst.</p>
			<p>Teil deine acht Stunden auf. Du hast vier Samstage, um die beste Aufteilung zu finden. Was eine Stunde am
			Stand bringt, siehst du erst, wenn du sie dort verbracht hast.</p>`,
		spiel(api) {
			const { Z, F } = api;
			const STAND = [14, 12, 10, 8, 6, 4, 2, 1], BOTE = 7;
			let tag = 0, best = 0, bekannt = 0, aus = false;
			const bild = api.bild(0.5, (g, W, H) => {
				const { X, Y } = api.achsen(g, W, H, { xmax: 8, ymax: 16, xs: 1, ys: 4, xl: "Stunde des Tages", yl: "Taler in dieser Stunde", xf: (x) => (x ? `${x}.` : "") });
				const s = r.w, bw = (X(1) - X(0)) * 0.78;
				for (let i = 0; i < 8; i++) {
					const xx = X(i) + (X(1) - X(0) - bw) / 2;
					if (i >= s) {
						Z.schraff(g, Z.recht(xx, Y(BOTE), bw, Y(0) - Y(BOTE)), { f: F.r, fl: F.p, d: 6 });
					} else if (i < bekannt) {
						Z.schraff(g, Z.recht(xx, Y(STAND[i]), bw, Y(0) - Y(STAND[i])), { fl: F.t, rand: true, d: 99 });
						Z.text(g, String(STAND[i]), xx + bw / 2, Y(STAND[i]) - 5, { aus: "center", fett: true });
					} else {
						Z.pfad(g, Z.recht(xx, Y(11), bw, Y(0) - Y(11)), { zu: true, s: [4, 4], b: 1.5, f: F.b });
						Z.text(g, "?", xx + bw / 2, Y(5), { aus: "center", gr: 20, fett: true, f: F.b });
					}
				}
				Z.linie(g, X(0), Y(BOTE), X(8), Y(BOTE), { f: F.r, b: 1.5, s: [6, 4] });
				Z.text(g, "Botengang: 7", X(8) - 2, Y(BOTE) - 5, { aus: "right", f: F.r, fett: true });
			}, "Balken für acht Stunden: schwarze Balken zeigen, was eine Stunde am Stand bringt, rot schraffierte Stunden sind Botengänge für 7 Taler.");
			const r = api.regler({
				l: "Stunden am Stand", min: 0, max: 8, w: 8,
				f: (x) => `${x} am Stand, ${8 - x} Botengänge`, on: () => bild.neu(),
			});
			const buch = api.buch(["Samstag", "Stand", "Botengänge", "Summe"]);
			const kn = api.knopf("Samstag abrechnen", () => {
				if (aus) return;
				const s = r.w;
				const st = STAND.slice(0, s).reduce((a, b) => a + b, 0), bo = BOTE * (8 - s), sum = st + bo;
				tag++; bekannt = Math.max(bekannt, s); best = Math.max(best, sum);
				buch.zeile([`${tag}.`, `${s} Std. = ${st}`, `${8 - s} Std. = ${bo}`, `<b>${sum} Taler</b>`], sum === best ? "best" : "");
				bild.neu();
				if (sum === 72) api.eil("72 Taler: Brezelstand schließt mittags, danach Botengänge", "Besser geht es nicht. Jede Stunde ist dort gelandet, wo sie am meisten bringt.");
				else if (s === 8) api.eil("Bis zum Abend am Stand: Die letzte Stunde bringt 1 Taler", `Summe ${sum} Taler. In derselben Stunde hätte ein Botengang 7 gebracht.`);
				else if (s === 0) api.eil("Brezelstand bleibt zu, Kundschaft enttäuscht", `Summe ${sum} Taler. Was hätte die erste Stunde am Stand gebracht? Du weißt es noch nicht.`);
				else if (STAND[s - 1] < BOTE) api.eil(`${sum} Taler: Die ${s}. Stunde am Stand brachte nur ${STAND[s - 1]}`, "Schau auf die rote Linie. Welche Stunden liegen darunter?");
				else api.eil(`${sum} Taler in der Kasse`, `Die ${s}. Stunde am Stand brachte ${STAND[s - 1]} Taler. Und die nächste?`);
				if (sum === 72 || tag === 4) {
					aus = true; kn.disabled = true; r.aus(true);
					api.fertig(best >= 72 ? 3 : best >= 70 ? 2 : 1, best >= 72
						? "Bester Samstag: 72 Taler. Vier Stunden am Stand, vier Stunden Botengänge."
						: `Bester Samstag: ${best} Taler. Möglich wären 72 gewesen, mit vier Stunden am Stand.`);
				}
			});
		},
		schlagzeile: "Der Preis einer Stunde ist die Stunde, die du dafür aufgibst",
		artikel: `<p>Deine Zeit ist knapp. Acht Stunden kannst du nur einmal vergeben, und jede Stunde am Stand ist eine
			Stunde, in der du keine Botengänge machst. Ökonomen nennen das, was du aufgibst, die
			<strong>Opportunitätskosten</strong>: den Wert der besten Möglichkeit, auf die du verzichtest.</p>
			<p>Die fünfte Stunde am Stand bringt 6 Taler. Das klingt nach Gewinn. Sie kostet dich aber 7 Taler, denn so
			viel hättest du als Bote verdient. Unterm Strich verlierst du einen Taler, obwohl Geld in die Kasse kommt.</p>
			<p>Entschieden wird deshalb <strong>an der Grenze</strong>: Es zählt, was die nächste Stunde bringt. Der
			Durchschnitt des ganzen Tages hilft dir dabei nicht. Solange die nächste Stunde am Stand mehr bringt als 7
			Taler, bleibst du. Danach wechselst du.</p>
			<p>Das gilt weit über den Markt hinaus. Ein geschenkter Abend im Kino kostet dich den Abend, den du sonst
			gehabt hättest. Ein Jahr Studium kostet neben den Gebühren auch das Gehalt, das du in dem Jahr verdient
			hättest.</p>`,
		merke: "Was etwas kostet, steht selten auf dem Preisschild. Es kostet das Beste, worauf du dafür verzichtest.",
		formel: "Opportunitätskosten = Wert der besten Alternative, die du aufgibst",
		quiz: {
			f: "Du bekommst eine Konzertkarte für Samstag geschenkt. Am Stand würdest du in dieser Zeit 45 Taler verdienen. Was kostet dich das Konzert?",
			a: ["Nichts, die Karte war geschenkt.", "45 Taler, weil du auf die Einnahmen verzichtest.", "So viel, wie auf der Karte steht."],
			r: 1,
			w: "Richtig. Bezahlt hast du nichts, aber du gibst 45 Taler auf. Das Konzert lohnt sich, wenn es dir mehr wert ist als das.",
		},
	});

	// ---------- 2 · Tausch und komparativer Vorteil ----------
	MB.ausgabe({
		rubrik: "Handel",
		titel: "Warum du mit Hanne tauschst, obwohl du alles besser kannst",
		kurz: "Tausch und komparativer Vorteil: Arbeitsteilung mit der Nachbarin",
		frage: "Du backst schneller und presst schneller Saft als deine Nachbarin. Lohnt sich das Tauschen trotzdem?",
		szene: `<p>Auf dem Markt wird Frühstück verkauft: immer eine Brezel und ein Becher Saft zusammen. Du und deine
			Nachbarin Hanne arbeitet jeweils acht Stunden.</p>
			<table><tr><th>In einer Stunde</th><th>Brezeln</th><th>oder Saft</th></tr>
			<tr><td>Du</td><td>6</td><td>2 Becher</td></tr><tr><td>Hanne</td><td>1</td><td>1 Becher</td></tr></table>
			<p>Erst wirtschaftet jeder für sich. Dann schlägt Hanne vor, die Arbeit aufzuteilen und zu tauschen. Finde
			in beiden Fällen die Aufteilung mit den meisten Frühstücken.</p>`,
		spiel(api) {
			let tausch = false, bestAllein = 0, bestTausch = 0, nAllein = 0, nTausch = 0, aus = false;
			const rechne = () => {
				const x = du.w, y = ha.w;
				const b1 = 6 * x, s1 = 2 * (8 - x), b2 = y, s2 = 8 - y;
				const fr = tausch ? Math.min(b1 + b2, s1 + s2) : Math.min(b1, s1) + Math.min(b2, s2);
				return { b1, s1, b2, s2, fr };
			};
			const modus = api.wahl(["Jeder für sich", "Mit Tausch"], (i, b, bs) => {
				if (aus || bs[i].disabled) return;
				tausch = i === 1;
				bs.forEach((k, j) => k.classList.toggle("an", j === i));
				zeige();
			}, { label: "Wirtschaftsform" });
			modus.bs[0].classList.add("an");
			modus.bs[1].disabled = true;
			const du = api.regler({ l: "Deine Stunden fürs Backen", min: 0, max: 8, w: 4, f: (x) => `${x} backen, ${8 - x} pressen`, on: () => zeige() });
			const ha = api.regler({ l: "Hannes Stunden fürs Backen", min: 0, max: 8, w: 4, f: (x) => `${x} backen, ${8 - x} pressen`, on: () => zeige() });
			const k = api.kasten();
			const zeige = () => {
				const e = rechne();
				k.innerHTML = api.werte([
					["Du", `${e.b1} Brezeln, ${e.s1} Saft`],
					["Hanne", `${e.b2} Brezeln, ${e.s2} Saft`],
					[tausch ? "Frühstücke zusammen" : "Frühstücke (jeder für sich)", String(e.fr), "rot"],
				]) + (tausch ? "" : `<p class="klein">Ohne Tausch zählt bei jedem nur, was er selbst als Paar zusammenbekommt.</p>`);
			};
			zeige();
			const buch = api.buch(["Tag", "Form", "Du backst", "Hanne backt", "Frühstücke"]);
			let tag = 0;
			const kn = api.knopf("Tag abrechnen", () => {
				if (aus) return;
				const e = rechne();
				tag++;
				buch.zeile([`${tag}.`, tausch ? "Tausch" : "allein", `${du.w} Std.`, `${ha.w} Std.`, `<b>${e.fr}</b>`]);
				if (!tausch) {
					nAllein++; bestAllein = Math.max(bestAllein, e.fr);
					if (bestAllein === 16) api.eil("16 Frühstücke: Mehr schafft keiner, solange jeder alles selbst macht", "Hanne klopft an: Wollen wir die Arbeit aufteilen?");
					else api.eil(`${e.fr} Frühstücke, und am Abend bleibt Ware übrig`, "Wer Brezeln ohne Saft hat, verkauft kein Frühstück. Achte darauf, dass bei jedem beides aufgeht.");
					if (bestAllein === 16 || nAllein >= 3) modus.bs[1].disabled = false;
					if (nAllein >= 3 && bestAllein < 16) api.eil(`Bisher höchstens ${bestAllein} Frühstücke`, "Möglich sind allein 16. Hanne schlägt trotzdem schon vor zu tauschen. Du kannst jetzt umschalten.");
				} else {
					nTausch++; bestTausch = Math.max(bestTausch, e.fr);
					if (e.fr === 18) api.eil("18 Frühstücke: Hanne presst nur noch Saft, der Markt hat mehr zu essen", "Zwei mehr als ohne Tausch, bei gleicher Arbeitszeit. Niemand hat länger gearbeitet.");
					else if (e.fr > 16) api.eil(`${e.fr} Frühstücke: Der Tausch bringt schon etwas`, "Wer sollte ganz beim Saft bleiben? Schau, was Hanne für einen Becher aufgibt.");
					else api.eil(`${e.fr} Frühstücke: Der Tausch verpufft`, "So aufgeteilt macht jeder das, was den anderen mehr kosten würde.");
					if (e.fr === 18 || nTausch >= 4) {
						aus = true; kn.disabled = true; du.aus(true); ha.aus(true);
						api.fertig(bestTausch >= 18 ? 3 : bestTausch >= 17 ? 2 : 1, bestTausch >= 18
							? "Mit Tausch 18 Frühstücke statt 16. Hanne presst acht Stunden Saft, du backst drei Stunden und presst fünf."
							: `Mit Tausch ${bestTausch} Frühstücke. Möglich sind 18, wenn Hanne nur Saft presst und du drei Stunden backst.`);
					}
				}
			});
		},
		schlagzeile: "Es zählt, was dich eine Sache kostet, und das ist bei jedem anders",
		artikel: `<p>Du bist in beidem schneller als Hanne. Das heißt <strong>absoluter Vorteil</strong>. Für die Frage,
			wer was machen soll, spielt er keine Rolle. Entscheidend ist, worauf jeder verzichtet.</p>
			<p>Presst du einen Becher Saft, backst du in der Zeit drei Brezeln nicht. Dein Saft kostet also drei Brezeln.
			Hanne gibt für einen Becher nur eine Brezel auf. Ihr Saft ist billiger hergestellt, gemessen in Brezeln. Das
			ist ihr <strong>komparativer Vorteil</strong>.</p>
			<p>Sobald Hanne den Saft übernimmt und du mehr backst, entsteht aus derselben Arbeitszeit mehr Frühstück.
			Diesen Zuwachs könnt ihr teilen, sodass beide besser dastehen als vorher. Tauschen ist deshalb kein
			Nullsummenspiel.</p>
			<p>David Ricardo hat das 1817 für England und Portugal vorgerechnet, mit Tuch und Wein. Es erklärt, warum
			eine Chirurgin ihre Praxis nicht selbst putzt, auch wenn sie es schneller könnte, und warum Länder handeln,
			selbst wenn eines in allem produktiver ist.</p>`,
		merke: "Jeder sollte das herstellen, wofür er am wenigsten aufgeben muss. Dann gibt es für alle mehr.",
		formel: "Dein Saft kostet 6 ÷ 2 = 3 Brezeln · Hannes Saft kostet 1 ÷ 1 = 1 Brezel",
		quiz: {
			f: "Eine Anwältin tippt doppelt so schnell wie ihr Assistent. Soll sie ihre Briefe selbst tippen?",
			a: ["Ja, sie ist schließlich schneller.", "Nein. Jede Stunde Tippen kostet sie eine Stunde Anwaltsarbeit, und die ist viel mehr wert.", "Das hängt nur davon ab, wie viel der Assistent verdient."],
			r: 1,
			w: "Genau. Sie hat den absoluten Vorteil beim Tippen, der Assistent aber den komparativen. Ihre Opportunitätskosten sind zu hoch.",
		},
	});

	// ---------- 3 · Nachfrage ----------
	MB.ausgabe({
		rubrik: "Kundschaft",
		titel: "Hundert Leute, hundert Schmerzgrenzen",
		kurz: "Nachfrage: wie aus einzelnen Menschen eine Kurve wird",
		frage: "Jeden Tag kommen dieselben hundert Leute an deinem Stand vorbei. Wie viele kaufen, wenn du den Preis änderst?",
		szene: `<p>Du hast fünf Markttage. An jedem setzt du einen Preis und zählst, wie viele Brezeln weggehen. Brezeln
			hast du genug. Dein Ziel: der Tag mit den höchsten Einnahmen.</p>
			<p>Jeder Tag hinterlässt einen Punkt im Schaubild. Schau zu, was die Punkte zusammen ergeben.</p>`,
		spiel(api) {
			const { Z, F } = api;
			const tage = [];
			let aus = false;
			const leute = api.kasten("leute");
			leute.setAttribute("role", "img");
			const ks = MB.GRENZEN.map(() => { const i = api.el("i"); leute.append(i); return i; });
			const malLeute = () => {
				const p = r.w;
				ks.forEach((k, j) => k.classList.toggle("kauft", MB.GRENZEN[(j * 37) % 100] >= p - 1e-9));
				leute.setAttribute("aria-label", `${MB.nachfrage(p)} von 100 Leuten kaufen bei ${api.T(p)} Talern.`);
			};
			const r = api.regler({ l: "Preis je Brezel", min: 0.5, max: 6.5, st: 0.25, w: 1, f: (x) => `${api.T(x)} Taler`, on: () => { malLeute(); bild.neu(); } });
			const bild = api.bild(0.62, (g, W, H) => {
				const { X, Y } = api.achsen(g, W, H, { xmax: 100, ymax: 7, xs: 10, ys: 1, xl: "verkaufte Brezeln", yl: "Preis in Talern" });
				if (aus) {
					const b = tage.reduce((a, t) => (t.e > a.e ? t : a));
					Z.schraff(g, Z.recht(X(0), Y(b.p), X(b.q) - X(0), Y(0) - Y(b.p)), { f: F.b, d: 7 });
					Z.text(g, `Einnahmen ${api.T(b.e)}`, X(b.q / 2), Y(b.p / 2) + 4, { aus: "center", fett: true });
					Z.linie(g, X(0), Y(6.5), X(100), Y(0), { f: F.r, b: 2.5 });
					Z.text(g, "Nachfrage", X(72), Y(2.4), { f: F.r, fett: true, gr: 14 });
				}
				Z.linie(g, X(0), Y(r.w), X(100), Y(r.w), { f: F.b, s: [4, 4], b: 1 });
				tage.forEach((t, i) => {
					Z.punkt(g, X(t.q), Y(t.p));
					Z.text(g, `${i + 1}`, X(t.q) + 8, Y(t.p) - 6, { gr: 12, fett: true });
				});
			}, "Schaubild: waagerecht die verkauften Brezeln, senkrecht der Preis. Jeder Markttag ist ein Punkt.");
			malLeute();
			const buch = api.buch(["Tag", "Preis", "Verkauft", "Einnahmen"]);
			const kn = api.knopf("Markttag öffnen", () => {
				if (aus) return;
				const p = r.w, q = MB.nachfrage(p), e = p * q;
				tage.push({ p, q, e });
				const best = Math.max(...tage.map((t) => t.e));
				buch.zeile([`${tage.length}.`, `${api.T(p)}`, String(q), `<b>${api.T(e)} Taler</b>`], e === best ? "best" : "");
				if (q > 80) api.eil(`Brezeln für ${api.T(p)} Taler: ${q} Stück weg, aber nur ${api.T(e)} Taler in der Kasse`, "Viele Käufer, wenig Geld pro Kopf.");
				else if (q < 25) api.eil(`Nur ${q} Leute zahlen ${api.T(p)} Taler`, `Einnahmen ${api.T(e)} Taler. Viel pro Brezel, aber kaum Käufer.`);
				else api.eil(`${q} Brezeln zu ${api.T(p)} Talern: ${api.T(e)} Taler Einnahmen`, tage.length < 5 ? "Liegt das Beste höher oder tiefer? Du hast noch Tage übrig." : "");
				if (tage.length === 5) {
					aus = true; kn.disabled = true; r.aus(true);
					bild.neu();
					api.fertig(best >= 160 ? 3 : best >= 140 ? 2 : 1, `Dein bester Tag: ${api.T(best)} Taler. Das Höchste sind 162,50 Taler bei 3,25 Talern je Brezel. Deine fünf Punkte liegen alle auf einer Linie.`);
				} else bild.neu();
			});
		},
		schlagzeile: "Die Nachfragekurve ist eine Schlange von Menschen, sortiert nach Schmerzgrenze",
		artikel: `<p>Jeder der hundert Leute hat im Kopf eine Grenze: bis zu diesem Preis kaufe ich, darüber gehe ich
			weiter. Ökonomen nennen sie <strong>Zahlungsbereitschaft</strong>. Bei manchen liegt sie bei 6 Talern, bei
			anderen bei 50 Pfennig.</p>
			<p>Setzt du den Preis hoch, kaufen nur die mit hoher Grenze. Senkst du ihn, kommen Schritt für Schritt
			weitere dazu. Deshalb fällt die Linie: <strong>je niedriger der Preis, desto größer die nachgefragte
			Menge</strong>. Das ist das Gesetz der Nachfrage.</p>
			<p>Die Kurve ist also keine Erfindung aus dem Lehrbuch. Stell die Leute nach ihrer Schmerzgrenze in eine
			Reihe, die Großzügigsten zuerst, und du hast sie vor dir. Ökonomen zeichnen dabei den Preis nach oben und
			die Menge nach rechts. Das wirkt verdreht, ist aber seit über hundert Jahren so üblich.</p>
			<p>Deine Einnahmen sind das Rechteck unter deinem Punkt: Preis mal Menge. Ganz oben ist es schmal, ganz
			unten flach. Das größte Rechteck liegt bei dieser Kurve in der Mitte.</p>
			<p>Ändert sich etwas anderes als der Preis, etwa das Wetter, die Mode oder das Einkommen der Leute, dann
			wandert die ganze Kurve. Das kommt in Ausgabe 5.</p>`,
		merke: "Hinter jedem Punkt der Nachfragekurve steht ein Mensch, dem die Brezel genau so viel wert ist.",
		formel: "Einnahmen = Preis × Menge · hier: Menge ≈ 100 × (1 − Preis ÷ 6,50)",
		quiz: {
			f: "Du erhöhst den Preis von 3 auf 4 Taler. Was passiert auf der Nachfragekurve?",
			a: ["Die ganze Kurve rutscht nach links.", "Du wanderst auf derselben Kurve nach oben, zu einer kleineren Menge.", "Nichts. Wer Hunger hat, kauft immer."],
			r: 1,
			w: "Richtig. Ein neuer Preis ist ein anderer Punkt auf derselben Kurve. Die Kurve selbst verschiebt sich nur, wenn sich die Leute ändern, zum Beispiel ihr Hunger oder ihr Geldbeutel.",
		},
	});

	// ---------- 4 · Angebot ----------
	MB.ausgabe({
		rubrik: "Backstube",
		titel: "Das achte Blech ist das teuerste",
		kurz: "Angebot: warum ein höherer Preis mehr Ware auf den Markt bringt",
		frage: "Heute verkaufst du an einen Großhändler, der den Preis vorgibt. Wie viele Bleche backst du?",
		szene: `<p>Die ersten Bleche backst du im eigenen Ofen, das geht billig. Für mehr brauchst du Überstunden, dann
			einen Gehilfen, am Ende den gemieteten Ofen des Nachbarn. Jedes weitere Blech kostet mehr als das davor:</p>
			<table><tr><th>Blech</th><td>1.</td><td>2.</td><td>3.</td><td>4.</td><td>5.</td><td>6.</td><td>7.</td><td>8.</td></tr>
			<tr><th>kostet</th><td>10</td><td>15</td><td>20</td><td>25</td><td>35</td><td>45</td><td>60</td><td>80</td></tr></table>
			<p>An vier Tagen nennt dir der Großhändler einen Preis je Blech. Er nimmt, so viel du bringst. Du entscheidest
			nur die Menge.</p>`,
		spiel(api) {
			const { Z, F } = api;
			const MC = [10, 15, 20, 25, 35, 45, 60, 80], PREISE = [30, 50, 70, 22];
			const kosten = (n) => MC.slice(0, n).reduce((a, b) => a + b, 0);
			const optimal = (p) => MC.filter((c) => c <= p).length;
			const tage = [];
			let aus = false, summe = 0;
			const ansage = api.text("");
			const bild = api.bild(0.6, (g, W, H) => {
				const { X, Y } = api.achsen(g, W, H, { xmax: 8, ymax: 90, xs: 1, ys: 20, xl: "Bleche", yl: "Preis je Blech" });
				const p = PREISE[Math.min(tage.length, 3)];
				if (aus) {
					const st = [[X(0), Y(MC[0])]];
					MC.forEach((c, i) => { st.push([X(i), Y(c)], [X(i + 1), Y(c)]); });
					Z.pfad(g, st, { f: F.r, b: 2.5 });
					Z.text(g, "Angebot = Kosten des nächsten Blechs", X(0.2), Y(84), { f: F.r, fett: true, gr: 13 });
				} else {
					Z.linie(g, X(0), Y(p), X(8), Y(p), { f: F.r, b: 1.5, s: [6, 4] });
					Z.text(g, `Preis heute: ${p}`, X(8) - 2, Y(p) - 5, { aus: "right", f: F.r, fett: true });
					Z.linie(g, X(r.w), Y(0), X(r.w), Y(p), { f: F.b, b: 1, s: [3, 3] });
				}
				tage.forEach((t, i) => {
					Z.punkt(g, X(t.n), Y(t.p), { hohl: t.n !== optimal(t.p) });
					Z.text(g, `${i + 1}`, X(t.n) + 8, Y(t.p) - 6, { gr: 12, fett: true });
				});
			}, "Schaubild: waagerecht die Zahl der Bleche, senkrecht der Preis. Jeder Tag ist ein Punkt.");
			const r = api.regler({
				l: "Bleche backen", min: 0, max: 8, w: 4,
				f: (n) => (n < 8 ? `${n} · das nächste kostet ${MC[n]}` : "8 · mehr passt nicht"),
				on: () => bild.neu(),
			});
			const buch = api.buch(["Tag", "Preis", "Bleche", "Kosten", "Gewinn"]);
			const sag = () => {
				ansage.innerHTML = `<b>Tag ${tage.length + 1} von 4:</b> Der Großhändler zahlt heute <b>${PREISE[tage.length]} Taler</b> je Blech.`;
			};
			sag();
			const kn = api.knopf("Backen und liefern", () => {
				if (aus) return;
				const p = PREISE[tage.length], n = r.w, gw = p * n - kosten(n), opt = optimal(p), gopt = p * opt - kosten(opt);
				tage.push({ p, n });
				summe += gw;
				buch.zeile([`${tage.length}.`, String(p), String(n), String(kosten(n)), `<b>${gw}</b>`], n === opt ? "best" : "");
				if (n === opt) api.eil(`${n} Bleche bei ${p} Talern: ${gw} Taler Gewinn, mehr war nicht drin`, n < 8 ? `Das ${n + 1}. Blech hätte ${MC[n]} gekostet und nur ${p} gebracht.` : "");
				else if (n > opt) api.eil(`Zu viel gebacken: Das ${n}. Blech kostete ${MC[n - 1]}, brachte aber nur ${p}`, `Gewinn ${gw} Taler. Mit ${opt} Blechen wären es ${gopt} gewesen.`);
				else api.eil(`Geld liegen gelassen: Das ${n + 1}. Blech hätte ${MC[n]} gekostet und ${p} gebracht`, `Gewinn ${gw} Taler. Mit ${opt} Blechen wären es ${gopt} gewesen.`);
				if (tage.length === 4) {
					aus = true; kn.disabled = true; r.aus(true);
					ansage.innerHTML = "<b>Vier Tage, vier Punkte.</b> Die rote Treppe zeigt, was das jeweils nächste Blech kostet.";
					bild.neu();
					api.fertig(summe >= 476 ? 3 : summe >= 400 ? 2 : 1, `Gewinn in vier Tagen: ${summe} Taler von höchstens 501. Bei höherem Preis lohnen sich mehr Bleche.`);
				} else { sag(); bild.neu(); }
			});
		},
		schlagzeile: "Ein hoher Preis ist eine Einladung, auch das teure Blech noch zu backen",
		artikel: `<p>Du hast an jedem Tag dieselbe Rechnung gemacht, ob bewusst oder nicht: Lohnt sich das nächste Blech?
			Es lohnt sich, solange es weniger kostet, als der Großhändler dafür zahlt. Was das nächste Stück zusätzlich
			kostet, heißt <strong>Grenzkosten</strong>.</p>
			<p>Bei 30 Talern backst du vier Bleche, denn das fünfte würde 35 kosten. Steigt der Preis auf 50, lohnen sich
			plötzlich auch das fünfte und sechste. Bei 70 sogar das siebte, für das du den Ofen des Nachbarn mieten
			musst.</p>
			<p>Trägst du für jeden Preis ein, wie viel du lieferst, entsteht die <strong>Angebotskurve</strong>. Sie
			steigt, weil mehr Ware nur mit immer teureren Mitteln zu haben ist: Überstunden, zusätzliche Leute,
			schlechtere Äcker, tiefere Bohrlöcher.</p>
			<p>Die Kurve eines Bäckers ist also einfach seine Kostentreppe. Die Angebotskurve des ganzen Marktes ist die
			Summe aller Bäcker. Bei jedem Preis liefert jeder so viel, wie sich für ihn gerade noch lohnt.</p>`,
		merke: "Angeboten wird jedes Stück, das weniger kostet, als es einbringt. Deshalb bringt ein höherer Preis mehr Ware hervor.",
		formel: "Backe weiter, solange: Grenzkosten ≤ Preis",
		quiz: {
			f: "Der Großhändler zahlt 40 Taler je Blech. Wie viele Bleche backst du?",
			a: ["4, denn bei den ersten vier ist der Gewinn je Blech am größten.", "5, denn das fünfte kostet 35 und bringt 40. Das sechste würde 45 kosten.", "8, denn im Durchschnitt liegen die Kosten unter 40."],
			r: 1,
			n: "Noch nicht. Geh die Tabelle Blech für Blech durch: Bringt es mehr, als es kostet?",
			w: "Richtig, fünf. Der Durchschnitt führt in die Irre: Das siebte und achte Blech kosten 60 und 80 und bringen nur 40.",
		},
	});
})();
