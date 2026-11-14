// Der Marktbote, drittes Buch: Die Stadt und die lange Sicht (Ausgaben 10 bis 14).
(() => {
	"use strict";
	const MB = window.MB;

	// ---------- 10 · Externalitäten ----------
	MB.ausgabe({
		rubrik: "Nachbarschaft",
		titel: "Dein Rauch, ihre Wäsche",
		kurz: "Externalitäten: Kosten, die bei anderen landen",
		frage: "Du räucherst jetzt auch Forellen. Der Rauch zieht in die Wäscherei nebenan. Wie viel räucherst du, wenn dich das nichts kostet?",
		szene: `<p>Räucherfisch läuft gut. Jede Ladung bringt dir Gewinn, aber jede weitere etwas weniger, weil du die
			besten Kunden zuerst bedienst:</p>
			<table><tr><th>Ladung</th><td>1.</td><td>2.</td><td>3.</td><td>4.</td><td>5.</td><td>6.</td><td>7.</td><td>8.</td></tr>
			<tr><th>Gewinn</th><td>16</td><td>13</td><td>10</td><td>7</td><td>4</td><td>1</td><td>−2</td><td>−5</td></tr></table>
			<p><b>Erst</b> entscheidest du als Räucherer, wie viele Ladungen du machst. <b>Dann</b> wechselst du in den
			Marktrat und legst eine Abgabe je Ladung fest. Der Räucherer rechnet danach neu.</p>`,
		spiel(api) {
			const { Z, F } = api;
			const M = [16, 13, 10, 7, 4, 1, -2, -5], SCHADEN = 8;
			const gew = (n) => M.slice(0, n).reduce((a, b) => a + b, 0);
			let phase = 1, aus = false, best = -99, versuche = 0, nAkt = 6;
			const lage = api.text("<b>Du bist der Räucherer.</b> Wie viele Ladungen heute?");
			const bild = api.bild(0.56, (g, W, H) => {
				const { X, t, b } = api.achsen(g, W, H, { xmax: 8, ymax: 1, xs: 1, ys: 2, xl: "Ladung", yl: "Gewinn dieser Ladung", xf: (x) => (x ? `${x}.` : "") });
				const Y = (v) => t + ((18 - v) / 26) * (H - t - b);
				const bw = (X(1) - X(0)) * 0.74, n = phase === 1 ? rn.w : nAkt;
				Z.linie(g, X(0), Y(0), X(8), Y(0), { b: 1.5 });
				M.forEach((m, i) => {
					const xx = X(i) + (X(1) - X(0) - bw) / 2, an = i < n;
					const y0 = Math.min(Y(m), Y(0)), h = Math.abs(Y(m) - Y(0));
					if (an) Z.schraff(g, Z.recht(xx, y0, bw, h), { fl: F.t, d: 99 });
					else Z.pfad(g, Z.recht(xx, y0, bw, h), { zu: true, b: 1.5, f: F.b });
					Z.text(g, api.de(m), xx + bw / 2, m >= 0 ? Y(m) - 5 : Y(m) + 15, { aus: "center", fett: an, f: an ? F.t : F.b });
				});
				if (phase === 2) {
					Z.linie(g, X(0), Y(SCHADEN), X(8), Y(SCHADEN), { f: F.r, b: 2, s: [6, 4] });
					Z.text(g, "Schaden in der Wäscherei: 8 je Ladung", X(8) - 2, Y(SCHADEN) - 5, { aus: "right", f: F.r, fett: true, gr: W < 400 ? 11 : 13 });
					if (ra.w > 0) {
						Z.linie(g, X(0), Y(ra.w), X(8), Y(ra.w), { f: F.g, b: 2 });
						Z.text(g, `Abgabe ${ra.w}`, X(0) + 5, Y(ra.w) + (ra.w >= SCHADEN ? -5 : 14), { f: F.g, fett: true });
					}
				}
			}, "Balken: Gewinn jeder einzelnen Ladung Räucherfisch, von 16 Talern fallend bis minus 5.");
			const k = api.kasten();
			const rn = api.regler({ l: "Ladungen räuchern", min: 0, max: 8, w: 3, f: (n) => `${n} Ladungen · Gewinn ${gew(n)}`, on: () => bild.neu() });
			const ra = api.regler({ l: "Abgabe je Ladung", min: 0, max: 12, w: 0, f: (x) => `${x} Taler`, on: () => bild.neu() });
			ra.el.hidden = true;
			k.hidden = true;
			const buch = api.buch(["Regel", "Ladungen", "Räucherei", "Wäscherei", "Platz gesamt"]);
			const kn = api.knopf("Räuchern", () => {
				if (aus) return;
				if (phase === 1) {
					const n = rn.w, g1 = gew(n), s = SCHADEN * n;
					buch.zeile(["keine", String(n), `+${g1}`, `−${s}`, `<b>${api.de(g1 - s)}</b>`]);
					api.eil(n === 0 ? "Räucherofen bleibt kalt" : `Wäscherin klagt: „${n} Ladungen Rauch, meine Laken sind grau“`,
						`Dein Gewinn: ${g1} Taler. Ihr Schaden: ${s} Taler, denn jede Ladung kostet sie 8 Taler an verdorbener Wäsche. Für den Platz zusammen bleibt ${api.de(g1 - s)}.`);
					phase = 2; nAkt = n;
					rn.el.hidden = true; ra.el.hidden = false; k.hidden = false;
					kn.textContent = "Abgabe beschließen";
					lage.innerHTML = "<b>Jetzt sitzt du im Marktrat.</b> Leg eine Abgabe je Ladung fest. Der Räucherer macht danach jede Ladung, die ihm nach Abgabe noch etwas bringt. Dein Ziel: das beste Ergebnis für den ganzen Platz. Du hast vier Versuche.";
					k.innerHTML = "<p>Die Abgabe fließt in die Stadtkasse. Sie geht dem Platz also nicht verloren. Für das Gesamtergebnis zählen der Gewinn aus dem Räuchern und der Schaden an der Wäsche.</p>";
					bild.neu();
					return;
				}
				const a = ra.w, n = M.filter((m) => m >= a && m > 0).length, g1 = gew(n), s = SCHADEN * n, sum = g1 - s;
				nAkt = n; versuche++; best = Math.max(best, sum);
				buch.zeile([`Abgabe ${a}`, String(n), `+${g1 - a * n}`, `−${s}`, `<b>${api.de(sum)}</b>`], sum === 15 ? "best" : "");
				k.innerHTML = api.werte([["Ladungen", String(n)], ["Stadtkasse", `+${a * n}`], ["Schaden Wäsche", `−${s}`], ["Platz gesamt", api.de(sum), sum === 15 ? "gruen" : "rot"]]);
				if (sum === 15) api.eil(`Rauchabgabe von ${a} Talern: Räucherer macht noch ${n} Ladungen, der Platz steht am besten da`, "Er räuchert jetzt nur noch, was mehr bringt, als es nebenan zerstört.");
				else if (n > 3) api.eil(`Abgabe von ${a} Talern: weiter ${n} Ladungen Rauch`, `Die ${n}. Ladung bringt ihm ${M[n - 1]} Taler und richtet 8 Taler Schaden an. Die Abgabe ist zu niedrig, um das zu stoppen.`);
				else api.eil(`Abgabe von ${a} Talern: nur noch ${n} ${n === 1 ? "Ladung" : "Ladungen"}`, `Die ${n + 1}. Ladung hätte ${M[n]} Taler gebracht und nur 8 Taler Schaden gemacht. Die Abgabe ist zu hoch und verhindert auch nützlichen Fisch.`);
				bild.neu();
				if (sum === 15 || versuche === 4) {
					aus = true; kn.disabled = true; ra.aus(true);
					api.fertig(best >= 15 ? 3 : best >= 13 ? 2 : 1, best >= 15
						? "Mit einer Abgabe in Höhe des Schadens, also 8 Talern je Ladung, entscheidet der Räucherer von selbst so, wie es für alle am besten ist."
						: `Bestes Ergebnis für den Platz: ${api.de(best)} Taler. Möglich sind 15, mit einer Abgabe von 8 Talern: genau so hoch wie der Schaden je Ladung.`);
				}
			});
		},
		schlagzeile: "Wer nicht alle Kosten trägt, macht zu viel davon",
		artikel: `<p>Als Räucherer hast du richtig gerechnet, nur mit unvollständigen Zahlen. Die sechste Ladung brachte
			dir noch einen Taler, also hast du sie gemacht. Dass sie nebenan 8 Taler Wäsche verdirbt, stand in keiner
			deiner Rechnungen. Solche Kosten, die bei Unbeteiligten landen, heißen <strong>externe Kosten</strong>
			oder negative Externalitäten.</p>
			<p>Das Ergebnis ist kein böser Wille, sondern ein Fehler im Preis. Rauch ist für dich umsonst, also
			verbrauchst du zu viel saubere Luft. Für den Platz insgesamt wären drei Ladungen am besten gewesen: Bis
			dahin bringt jede Ladung mehr, als sie zerstört.</p>
			<p>Die Abgabe repariert den Preis. Ist sie so hoch wie der Schaden, rechnest du plötzlich mit den vollen
			Kosten und landest von selbst bei drei Ladungen. Der Ökonom Arthur Pigou hat das um 1920 vorgeschlagen,
			deshalb heißt sie <strong>Pigou-Steuer</strong>. Ein Preis auf den Ausstoß von Kohlendioxid folgt
			derselben Logik. Ein Verbot wäre hier schlechter gewesen: Die ersten drei Ladungen nützen mehr, als sie
			schaden.</p>
			<p>Es gibt auch den umgekehrten Fall. Die Imkerin am Stadtrand bestäubt nebenbei alle Obstgärten, ohne dafür
			bezahlt zu werden. Von solchen <strong>positiven Externalitäten</strong> gibt es zu wenig, solange niemand
			dafür zahlt. Zuschüsse für Impfungen oder Forschung haben hier ihren Grund.</p>`,
		merke: "Stimmt der Preis, weil er alle Kosten enthält, dann stimmt auch die Entscheidung. Die Abgabe sollte so hoch sein wie der Schaden.",
		formel: "Räuchern, solange: Gewinn der nächsten Ladung ≥ Schaden bei anderen (8)",
		quiz: {
			f: "Eine Fabrik leitet Abwasser in den Fluss. Flussabwärts sterben die Fische eines Fischers. Warum produziert die Fabrik aus Sicht aller zu viel?",
			a: ["Weil Fabriken immer zu viel produzieren.", "Weil der Schaden des Fischers in ihrer Rechnung nicht vorkommt. Ihre Kosten sind kleiner als die wahren Kosten.", "Weil der Fischer zu wenig fängt."],
			r: 1,
			w: "Richtig. Die Fabrik vergleicht ihren Erlös nur mit ihren eigenen Kosten. Müsste sie für den Schaden zahlen, würde sie weniger einleiten oder filtern.",
		},
	});

	// ---------- 11 · Öffentliche Güter ----------
	MB.ausgabe({
		rubrik: "Gemeinsinn",
		titel: "Wer zahlt die Laternen?",
		kurz: "Öffentliche Güter: warum Freiwilligkeit bei manchen Dingen nicht reicht",
		frage: "Laternen locken abends Kundschaft auf den Markt. Alle vier Stände profitieren, auch wer nichts dazugibt. Wie viel legst du in den Topf?",
		szene: `<p>Vier Stände, jeder hat am Abend 10 Taler übrig: du, Hanne, Kunz und Mette. Jeder legt verdeckt etwas in
			den Laternentopf. Jeder Taler im Topf bringt dem Markt 2 Taler zusätzliche Einnahmen, und die verteilen sich
			gleichmäßig auf alle vier Stände. Auf dich entfällt also ein halber Taler für jeden Taler, den irgendwer
			einzahlt.</p><p>Fünf Abende lang ist alles freiwillig. Danach stimmt der Markt über einen Pflichtbeitrag ab.</p>`,
		spielname: "Fünf Abende am Laternentopf",
		spiel(api) {
			const { Z, F } = api;
			let bots = [6, 5, 7], runde = 0, summe = 0, aus = false;
			const verlauf = [];
			const bild = api.bild(0.46, (g, W, H) => {
				const { X, Y } = api.achsen(g, W, H, { xmax: 5, ymax: 40, xs: 1, ys: 10, xl: "Abend", yl: "Taler im Topf", xf: (x) => (x ? `${x}.` : "") });
				const bw = (X(1) - X(0)) * 0.6;
				verlauf.forEach((v, i) => {
					const xx = X(i) + (X(1) - X(0) - bw) / 2;
					Z.schraff(g, Z.recht(xx, Y(v.a), bw, Y(0) - Y(v.a)), { fl: F.t, d: 99 });
					if (v.du) Z.schraff(g, Z.recht(xx, Y(v.a + v.du), bw, Y(v.a) - Y(v.a + v.du)), { f: F.r, fl: F.p, d: 5 });
					Z.text(g, String(v.a + v.du), xx + bw / 2, Y(v.a + v.du) - 5, { aus: "center", fett: true });
				});
				Z.text(g, "schwarz: die anderen · rot: du", X(5), Y(40) + 2, { aus: "right", gr: 12, f: F.b });
			}, "Balken: Taler im Laternentopf an jedem Abend, aufgeteilt in deinen Beitrag und den der anderen.");
			const r = api.regler({ l: "Dein Beitrag", min: 0, max: 10, w: 5, f: (x) => `${x} in den Topf, ${10 - x} behalten` });
			const buch = api.buch(["Abend", "Du gibst", "Die anderen", "Du verdienst", "Hanne verdient"]);
			const kn = api.knopf("Topf öffnen", () => {
				if (aus || runde >= 5) return;
				const c = r.w, a = bots.reduce((x, y) => x + y, 0), topf = a + c;
				const ich = 10 - c + topf / 2, hanne = 10 - bots[0] + topf / 2;
				runde++; summe += ich;
				verlauf.push({ du: c, a });
				buch.zeile([`${runde}.`, String(c), bots.join(" + "), `<b>${api.T(ich)}</b>`, api.T(hanne)]);
				if (c === 0) api.eil(`Ein Stand gibt nichts und verdient am meisten: ${api.T(ich)} Taler`, "Die Laternen brennen auch für dich. Die anderen haben es gesehen.");
				else if (c < a / 3 - 1) api.eil(`Du gibst ${c}, die anderen im Schnitt ${api.T(Math.round(a / 3 * 10) / 10)}`, `Du verdienst ${api.T(ich)} Taler, mehr als die Großzügigen. Die merken sich das.`);
				else if (c >= 9) api.eil(`Du gibst ${c} Taler und verdienst ${api.T(ich)}, weniger als alle anderen`, "Dein Taler im Topf bringt dir selbst nur einen halben zurück. Den Rest bekommen die Nachbarn.");
				else api.eil(`${topf} Taler im Topf, du verdienst ${api.T(ich)}`, "Hätten alle 10 gegeben, hätte jeder 20 verdient.");
				// Die anderen geben, was sie zuletzt im Schnitt bei den übrigen gesehen haben, etwas weniger.
				const alle = [c, ...bots];
				bots = bots.map((b, j) => {
					const rest = alle.filter((_, i) => i !== j + 1);
					return api.klemm(Math.round((rest.reduce((x, y) => x + y, 0) / 3) * 0.85), 0, 10);
				});
				bild.neu();
				if (runde === 5) {
					kn.hidden = true; r.el.hidden = true;
					const letzter = verlauf[4].a + verlauf[4].du;
					api.text(`<b>Abstimmung.</b> Am ersten Abend lagen ${verlauf[0].a + verlauf[0].du} Taler im Topf, am fünften noch ${letzter}. Mette beantragt: Jeder Stand zahlt künftig 10 Taler Pflichtbeitrag. Wie stimmst du?`);
					api.wahl(["Dafür: Pflichtbeitrag für alle", "Dagegen: freiwillig lassen"], (i, b, bs) => {
						if (aus) return;
						aus = true;
						bs.forEach((x) => { x.disabled = true; });
						b.classList.add("an");
						const frei = 10 - r.w + (bots.reduce((x, y) => x + y, 0) + r.w) / 2;
						if (i === 0) {
							api.eil("Markt beschließt Laternenbeitrag: Jeder zahlt 10, jeder verdient 20", `Im Schnitt der fünf freiwilligen Abende hast du ${api.T(Math.round(summe / 5 * 10) / 10)} Taler verdient. Mit der Pflicht stehen alle besser da, auch die, die vorher nichts gaben.`);
							api.fertig(3, "Mit dem Pflichtbeitrag verdient jeder Stand 20 Taler am Abend. Freiwillig hat der Markt das nicht geschafft, obwohl es alle wollten.");
						} else {
							api.eil("Antrag abgelehnt: Die Laternen gehen nach und nach aus", `Am sechsten Abend geben die anderen noch ${bots.join(", ")} Taler. Du würdest etwa ${api.T(frei)} verdienen. Mit dem Pflichtbeitrag wären es 20 gewesen, für jeden.`);
							api.fertig(2, "Ohne Pflicht schrumpft der Topf weiter, weil jeder hofft, dass die anderen zahlen. Mit dem Beitrag hätte jeder 20 Taler am Abend verdient.");
						}
					}, { label: "Abstimmung" });
				}
			});
		},
		schlagzeile: "Was allen nützt und keinen ausschließt, bezahlt freiwillig fast niemand",
		artikel: `<p>Laternenlicht hat zwei Eigenschaften, die es von einer Brezel unterscheiden. Niemand kann davon
			ausgeschlossen werden: Es scheint auch für den, der nichts gezahlt hat. Und es wird nicht weniger, wenn
			noch jemand hinsieht. Solche Güter heißen <strong>öffentliche Güter</strong>.</p>
			<p>Für den Einzelnen ist die Rechnung klar. Ein Taler im Topf bringt mir selbst einen halben zurück, also
			verliere ich beim Einzahlen. Für alle zusammen bringt derselbe Taler zwei. Was für die Gruppe gut ist,
			lohnt sich für keinen Einzelnen. Wer nicht zahlt und trotzdem profitiert, ist ein
			<strong>Trittbrettfahrer</strong>.</p>
			<p>Am Anfang geben viele aus Anstand. Dann sehen sie, dass andere weniger geben, und ziehen nach. Der Topf
			schrumpft von Abend zu Abend. Genau dieses Muster zeigen auch Experimente mit echten Menschen und echtem
			Geld.</p>
			<p>Der Ausweg ist, sich gemeinsam zu binden. Ein Pflichtbeitrag, eine Gebühr oder eine Steuer nimmt jedem
			die Sorge, der Dumme zu sein. Deshalb werden Straßenlicht, Deiche, Landesverteidigung und Grundlagenforschung
			fast überall aus Steuern bezahlt. In kleinen Gruppen, in denen jeder jeden kennt, klappt es oft auch
			ohne Staat: mit Regeln, die sich die Gruppe selbst gibt. Dafür bekam Elinor Ostrom 2009 den Nobelpreis.</p>`,
		merke: "Bei öffentlichen Gütern lohnt sich Trittbrettfahren für jeden Einzelnen, und am Ende fehlt das Gut allen.",
		formel: "Dein Abend = 10 − dein Beitrag + ½ × Topf",
		quiz: {
			f: "Welches dieser Dinge ist ein öffentliches Gut im Sinn der Ökonomen?",
			a: ["Ein Brot beim Bäcker.", "Der Deich, der das ganze Dorf vor Hochwasser schützt.", "Ein Platz im Kino."],
			r: 1,
			w: "Richtig. Der Deich schützt jeden im Dorf, auch den, der nichts gezahlt hat, und er schützt nicht schlechter, wenn ein Haus dazukommt. Brot und Kinoplatz kann immer nur einer nutzen, und wer nicht zahlt, bekommt sie nicht.",
		},
	});

	// ---------- 12 · Information und Anreize ----------
	MB.ausgabe({
		rubrik: "Gebrauchtmarkt",
		titel: "„Läuft tadellos“, sagt jeder Verkäufer",
		kurz: "Information und Anreize: wenn einer mehr weiß als der andere",
		frage: "Du willst gebrauchte Backöfen kaufen. Jeder zweite ist Schrott, und von außen sehen alle gleich aus. Wie viel bietest du?",
		szene: `<p>Sechs Leute bieten dir nacheinander einen gebrauchten Ofen an. Die Hälfte der Öfen ist gut, die andere
			Hälfte taugt wenig. Der Verkäufer weiß es, du nicht.</p>
			<table><tr><th></th><th>dir wert</th><th>Verkäufer gibt ihn her ab</th></tr>
			<tr><td>Guter Ofen</td><td>100</td><td>70</td></tr><tr><td>Schlechter Ofen</td><td>30</td><td>20</td></tr></table>
			<p>Du machst ein Gebot. Der Verkäufer nimmt an oder winkt ab. Erst zu Hause beim Anheizen merkst du, was du
			gekauft hast.</p>`,
		spielname: "Sechs Öfen",
		spiel(api) {
			const FOLGE = ["g", "s", "s", "g", "s", "g"];
			const WERT = { g: 100, s: 30 }, AB = { g: 70, s: 20 };
			let i = 0, gewinn = 0, phase = 1, aus = false, g2 = 0, gekauftGut = 0;
			const lage = api.text("");
			const r = api.regler({ l: "Dein Gebot", min: 10, max: 100, st: 5, w: 50, f: (x) => `${x} Taler` });
			const buch = api.buch(["Ofen", "Gebot", "Verkäufer", "Beim Anheizen", "Dein Gewinn"]);
			const sag = () => {
				if (phase === 1) lage.innerHTML = `<b>Ofen ${i + 1} von 6.</b> Der Verkäufer sagt: „Läuft tadellos.“`;
				else lage.innerHTML = i === 0
					? "<b>Neuer Ofen, neuer Verkäufer.</b> Dieser sagt: „Läuft tadellos. Und wenn er im ersten Jahr kaputtgeht, bekommst du dein Geld zurück, schriftlich.“"
					: "<b>Noch ein Ofen.</b> Der Verkäufer sagt: „Läuft tadellos.“ Auf die Frage nach einer Garantie schaut er weg.";
			};
			sag();
			const kn = api.knopf("Bieten", () => {
				if (aus) return;
				const b = r.w;
				if (phase === 1) {
					const t = FOLGE[i], ja = b >= AB[t];
					const gw = ja ? WERT[t] - b : 0;
					gewinn += gw;
					if (ja && t === "g") gekauftGut++;
					buch.zeile([`${i + 1}.`, String(b), ja ? "nimmt an" : "winkt ab", ja ? (t === "g" ? "heizt prächtig" : "qualmt und zieht nicht") : "–", ja ? `<b>${api.de(gw)}</b>` : "0"]);
					if (!ja) api.eil(`Gebot von ${b} Talern abgelehnt`, b < 20 ? "Für so wenig gibt niemand etwas her." : "Wer bei diesem Preis abwinkt, hat vermutlich etwas Besseres in der Hand. Wer annimmt, eher nicht.");
					else if (t === "s") api.eil(`Für ${b} Taler einen Ofen gekauft, der qualmt`, b > 30 ? `Er ist dir 30 Taler wert. ${b - 30} Taler Verlust.` : `Schrott, aber billig genug: ${30 - b} Taler Gewinn.`);
					else api.eil(`Guter Ofen für ${b} Taler`, `${100 - b} Taler Gewinn. Aber rechne nach, was du bei diesem Gebot im Schnitt bekommst.`);
					i++;
					if (i === 6) {
						phase = 2; i = 0;
						api.eil(`Sechs Angebote, ${gekauftGut} gute Öfen gekauft, Ergebnis ${api.de(gewinn)} Taler`, "Bei Geboten unter 70 Talern bekommst du nur Schrott. Bei 70 und mehr bekommst du alles, und im Schnitt ist ein Ofen nur 65 wert. Jetzt kommt ein Verkäufer mit einer Garantie.");
					}
					sag();
					return;
				}
				const t = i === 0 ? "g" : "s", ja = b >= AB[t], gw = ja ? WERT[t] - b : 0;
				g2 += gw;
				buch.zeile([i === 0 ? "mit Garantie" : "ohne", String(b), ja ? "nimmt an" : "winkt ab", ja ? (t === "g" ? "heizt prächtig" : "qualmt") : "–", ja ? `<b>${api.de(gw)}</b>` : "0"]);
				if (i === 0) api.eil(ja ? `Ofen mit Garantie für ${b} Taler: Er hält, was versprochen war` : "Verkäufer mit Garantie winkt ab", ja ? "Die Garantie hat dir gesagt, was du nicht sehen konntest. Ein Verkäufer mit Schrott könnte sie sich nicht leisten." : "Sein Ofen ist gut, und er weiß es. Unter 70 Talern gibt er ihn nicht her.");
				else api.eil(ja ? (b > 30 ? `Ohne Garantie gekauft: Er qualmt. ${b - 30} Taler Verlust` : `Schrott für ${b} Taler: ${30 - b} Taler Gewinn`) : "Der Verkäufer ohne Garantie winkt ab", "Wer keine Garantie gibt, obwohl andere es tun, verrät damit auch etwas.");
				i++;
				if (i === 2) {
					aus = true; kn.disabled = true; r.aus(true);
					lage.innerHTML = "<b>Alle Öfen durch.</b>";
					api.fertig(gewinn >= 0 ? 3 : gewinn >= -40 ? 2 : 1, `Ohne Garantie: ${api.de(gewinn)} Taler aus sechs Angeboten. Verluste vermeidet dort nur, wer wenig bietet, und dann wechselt kein guter Ofen mehr den Besitzer. Mit Garantie: ${api.de(g2)} Taler aus zwei Angeboten.`);
				} else sag();
			});
		},
		schlagzeile: "Wenn Käufer die Qualität nicht sehen, verschwinden die guten Angebote zuerst",
		artikel: `<p>Der Verkäufer kennt seinen Ofen, du nicht. Das heißt <strong>asymmetrische Information</strong>. Du
			rechnest also mit dem Durchschnitt: halb gut, halb schlecht, im Mittel 65 Taler wert. Mehr als 65 bietest
			du nicht. Die Besitzer guter Öfen verlangen aber 70 und winken ab. Übrig bleiben die, die froh sind, ihren
			Schrott loszuwerden.</p>
			<p>Jetzt weißt du: Wer annimmt, hat einen schlechten Ofen. Also bietest du höchstens 30. Die guten Öfen sind
			vom Markt verschwunden, obwohl es für jeden einen Käufer gäbe, der mehr zahlen würde, als der Besitzer
			verlangt. George Akerlof hat das 1970 an Gebrauchtwagen gezeigt, den „Zitronen“. Der Vorgang heißt
			<strong>adverse Selektion</strong>.</p>
			<p>Märkte helfen sich mit <strong>Signalen</strong>. Eine Garantie ist für den Besitzer eines guten Ofens
			billig und für den Besitzer von Schrott ruinös. Deshalb ist sie glaubwürdig, anders als der Satz „läuft
			tadellos“, den jeder umsonst sagen kann. Ähnlich wirken Prüfsiegel, Probezeiten, Bewertungen und ein guter
			Ruf, den man verlieren kann.</p>
			<p>Das zweite Problem entsteht nach dem Handschlag. Zahlst du deinem Gehilfen einen festen Lohn, verdient er
			gleich viel, ob er zwölf Brezeln verkauft oder dreißig. Du kannst nicht den ganzen Tag danebenstehen. Mit
			einem Anteil an jeder verkauften Brezel hat er denselben Wunsch wie du. Das ist die Frage nach den
			<strong>Anreizen</strong>: Menschen tun, wofür sie belohnt werden. Wer ein Ergebnis will, sollte genau
			hinschauen, was er tatsächlich belohnt.</p>`,
		merke: "Ein Signal ist nur glaubwürdig, wenn es für Schwindler zu teuer wäre. Und: Menschen folgen den Anreizen, nicht den Absichten.",
		formel: "Durchschnittswert = ½ × 100 + ½ × 30 = 65 < 70",
		quiz: {
			f: "Eine Krankenversicherung bietet allen denselben Tarif an, ohne Gesundheitsfragen. Wer schließt ihn vor allem ab, und was folgt daraus?",
			a: ["Vor allem Gesunde, der Tarif wird billiger.", "Vor allem Leute, die wissen, dass sie oft krank sind. Der Tarif wird teurer, und die Gesunden springen ab.", "Alle gleichermaßen, es ändert sich nichts."],
			r: 1,
			w: "Richtig. Das ist adverse Selektion mit vertauschten Rollen: Hier weiß der Käufer mehr als der Verkäufer. Eine Versicherungspflicht ist eine der Antworten darauf.",
		},
	});

	// ---------- 13 · Zinseszins ----------
	MB.ausgabe({
		rubrik: "Geldanlage",
		titel: "Zwölf Jahre, eine Entscheidung, zwölfmal",
		kurz: "Zinseszins: warum Wachstum auf Wachstum alles andere schlägt",
		frage: "Dein Stand wirft jedes Jahr ein Viertel seines Werts als Gewinn ab. Nimmst du das Geld heraus oder steckst du es wieder hinein?",
		szene: `<p>Dein Stand ist 100 Taler wert und bringt jedes Jahr 25 Prozent Gewinn. Kunz nebenan hat denselben Stand
			und nimmt seinen Gewinn jedes Jahr heraus. Du entscheidest jedes Jahr neu.</p>
			<p>Nach zwölf Jahren wird gezählt: Wert des Stands plus alles, was du herausgenommen hast.</p>
			<p><b>Vorher eine Schätzung:</b> 100 Taler, jedes Jahr 10 Prozent dazu, und der Zuwachs bleibt liegen. Wie viel
			ist es nach 30 Jahren?</p>`,
		spielname: "Zwölf Jahre am Stand",
		spiel(api) {
			const { Z, F } = api;
			let K = 100, kasse = 0, jahr = 0, aus = false;
			const pfad = [100];
			let wette = null;
			api.wahl(["400 Taler", "rund 700 Taler", "rund 1.750 Taler", "rund 5.000 Taler"], (i, b, bs) => {
				if (wette != null) return;
				wette = i;
				bs.forEach((x) => { x.disabled = true; });
				b.classList.add(i === 2 ? "gut" : "schlecht");
				bs[2].classList.add("gut");
				api.eil(i === 2 ? "Richtig geschätzt: rund 1.745 Taler" : "Es sind rund 1.745 Taler", "Ohne Zins auf den Zins wären es 400. Jetzt zu deinem Stand.");
				spielfeld.hidden = false;
				bild.neu();
			}, { label: "Schätzung" });
			const spielfeld = api.kasten("feld");
			spielfeld.hidden = true;
			const ansage = api.el("p");
			spielfeld.append(ansage);
			const stich = api.el("div", { class: "stich" });
			const cv = api.el("canvas", { role: "img", "aria-label": "Schaubild: dein Vermögen und das von Kunz über zwölf Jahre." });
			stich.append(cv);
			spielfeld.append(stich);
			const g = cv.getContext("2d");
			const bild = {
				neu() {
					if (spielfeld.hidden) return;
					const W = Math.max(220, stich.clientWidth), H = Math.round(api.klemm(W * 0.56, 170, 400)), d = Math.min(2, window.devicePixelRatio || 1);
					cv.width = Math.round(W * d); cv.height = Math.round(H * d); cv.style.height = H + "px";
					g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
					const { X, Y } = api.achsen(g, W, H, { xmax: 12, ymax: 1500, xs: 1, ys: 250, xl: "Jahr", yl: "Vermögen in Talern" });
					const kz = Array.from({ length: 13 }, (_, t) => [X(t), Y(100 + 25 * t)]);
					Z.pfad(g, kz, { f: F.r, b: 2 });
					Z.text(g, "Kunz", X(12) - 2, Y(400) - 8, { aus: "right", f: F.r, fett: true });
					Z.pfad(g, pfad.map((v, t) => [X(t), Y(v)]), { b: 3 });
					pfad.forEach((v, t) => Z.punkt(g, X(t), Y(v), { r: 3 }));
					Z.text(g, `Du: ${api.de(Math.round(pfad[pfad.length - 1]))}`, X(pfad.length - 1) + (pfad.length > 9 ? -8 : 8), Y(pfad[pfad.length - 1]) - 8, { aus: pfad.length > 9 ? "right" : "left", fett: true });
				},
			};
			new ResizeObserver(() => bild.neu()).observe(stich);
			const reihe = api.el("div", { class: "reihe" });
			spielfeld.append(reihe);
			const sag = () => {
				ansage.innerHTML = jahr < 12
					? `<b>Jahr ${jahr + 1} von 12.</b> Stand ist ${api.de(Math.round(K))} Taler wert und wirft ${Math.round(K * 0.25)} Taler ab. Herausgenommen bisher: ${Math.round(kasse)}.`
					: `<b>Zwölf Jahre vorbei.</b> Stand ${api.de(Math.round(K))} Taler, herausgenommen ${Math.round(kasse)} Taler.`;
			};
			const zug = (rein) => {
				if (aus) return;
				const gw = K * 0.25;
				if (rein) K += gw; else kasse += gw;
				jahr++;
				pfad.push(K + kasse);
				if (jahr === 12) ende();
			};
			const ende = () => {
				aus = true;
				reihe.querySelectorAll("button").forEach((b) => { b.disabled = true; });
				const v = Math.round(K + kasse);
				api.eil(v >= 1400 ? `Aus 100 Talern werden ${api.de(v)}: Brezelstand wächst Kunz davon` : `Nach zwölf Jahren: du ${api.de(v)} Taler, Kunz 400`,
					v >= 1400 ? "Dein Gewinn im zwölften Jahr war mit 291 Talern fast so groß wie alles, was Kunz in zwölf Jahren herausgenommen hat."
						: "Kunz hat jedes Jahr 25 Taler herausgenommen. Wer alles wieder hineinsteckt, kommt auf 1.455 Taler.");
				api.text("<b>Zum Ausprobieren:</b> Was machen ein anderer Zinssatz und eine andere Laufzeit aus 100 Talern?");
				const out = api.kasten();
				const upd = () => {
					const z = rz.w, n = rj.w, mit = 100 * Math.pow(1 + z / 100, n), ohne = 100 + z * n;
					out.innerHTML = api.werte([["Mit Zinseszins", api.de(Math.round(mit)), "gruen"], ["Ohne", String(Math.round(ohne))], ["Verdoppelt sich etwa alle", `${api.de(72 / z, 1)} Jahre`]]);
				};
				const rz = api.regler({ l: "Zins im Jahr", min: 1, max: 20, w: 10, f: (x) => `${x} %`, on: upd });
				const rj = api.regler({ l: "Laufzeit", min: 1, max: 50, w: 30, f: (x) => `${x} Jahre`, on: upd });
				upd();
				api.fertig(v >= 1400 ? 3 : v >= 800 ? 2 : 1, v >= 1400
					? `${api.de(v)} Taler gegen 400 bei Kunz, aus demselben Stand. Der Unterschied entsteht fast ganz in den letzten Jahren.`
					: `${api.de(v)} Taler. Wer zwölf Jahre lang alles wieder hineinsteckt, kommt auf 1.455. Jedes Herausnehmen am Anfang fehlt später vielfach.`);
			};
			const knopf = (t, fn, neben) => {
				const b = api.el("button", { type: "button", class: neben ? "neben" : "haupt" }, t);
				b.addEventListener("click", () => { fn(); sag(); bild.neu(); });
				reihe.append(b);
			};
			knopf("Gewinn hineinstecken", () => zug(true));
			knopf("Gewinn herausnehmen", () => zug(false), true);
			knopf("Bis zum Ende hineinstecken", () => { while (!aus) zug(true); }, true);
			sag();
		},
		schlagzeile: "Geduld ist der Hebel, den jeder hat",
		artikel: `<p>Kunz bekommt jedes Jahr 25 Taler. Sein Vermögen wächst wie eine Treppe mit gleichen Stufen:
			<strong>lineares Wachstum</strong>. Bei dir wächst der Stand, und im nächsten Jahr wirft der größere Stand
			mehr ab. Der Gewinn bringt selbst wieder Gewinn. Das ist der <strong>Zinseszins</strong>, und die Kurve
			dazu wird immer steiler: <strong>exponentielles Wachstum</strong>, wie beim Papierfalten im
			<a href="../math/#stufe-7">Mathe-Heft, Stufe 7</a>.</p>
			<p>Tückisch ist der Anfang. In den ersten Jahren liegt ihr fast gleichauf, und Kunz hat sein Geld schon in
			der Tasche. Der große Abstand entsteht erst spät. Deshalb unterschätzen Menschen solches Wachstum
			regelmäßig, so wie vermutlich auch bei der Schätzfrage: Aus 100 werden bei 10 Prozent in 30 Jahren nicht
			400, sondern rund 1.745.</p>
			<p>Eine Faustregel hilft beim Überschlagen: <strong>72 geteilt durch den Zinssatz</strong> ergibt ungefähr
			die Jahre bis zur Verdopplung. Bei 6 Prozent sind es zwölf Jahre, bei 3 Prozent vierundzwanzig.</p>
			<p>Dieselbe Rechnung arbeitet gegen dich, wenn du Schulden hast. 20 Prozent Zinsen auf dem Kartenkonto
			verdoppeln die Schuld in weniger als vier Jahren. Und sie gilt nicht nur für Geld. Naval Ravikant
			überträgt sie auf Wissen, Beziehungen und Ruf: Alles, was auf sich selbst aufbaut, belohnt den, der
			lange dabeibleibt.</p>`,
		merke: "Zinseszins wirkt spät. Wer früh anfängt und nichts herausnimmt, lässt die Zeit für sich arbeiten.",
		formel: "Endwert = Startwert × (1 + Zins)<sup>Jahre</sup> · 100 × 1,25<sup>12</sup> ≈ 1.455",
		quiz: {
			f: "Dein Geld bringt 8 Prozent im Jahr, und du lässt alles liegen. Wie lange dauert es ungefähr, bis es sich verdoppelt hat?",
			a: ["Etwa 9 Jahre.", "Etwa 12,5 Jahre.", "Etwa 25 Jahre."],
			r: 0,
			n: "Noch nicht. Denk an die Faustregel mit der 72.",
			w: "Richtig: 72 ÷ 8 = 9. Ohne Zinseszins wären es 12,5 Jahre.",
		},
	});

	// ---------- 14 · Hebel und Spezialwissen ----------
	MB.ausgabe({
		rubrik: "Zum Schluss: Naval",
		titel: "Zehn Jahre, und du hast nur zwei Hände",
		kurz: "Hebel und Spezialwissen: warum Stunden verkaufen eine Obergrenze hat",
		frage: "Du kannst am Stand stehen und Brezeln verkaufen. Oder du baust etwas, das auch ohne deine Hände verkauft. Was machst du mit zehn Jahren?",
		szene: `<p>Jedes Jahr hat einen Schwerpunkt. Du wählst ihn aus fünf Möglichkeiten. Was du aufgebaut hast, arbeitet
			in den folgenden Jahren weiter, auch wenn du etwas anderes tust.</p>
			<p>Am Ende zählt, was in zehn Jahren zusammengekommen ist. Zum Vergleich: Wer zehn Jahre nur am Stand steht,
			kommt auf 400 Taler.</p>`,
		spielname: "Zehn Jahre",
		spiel(api) {
			const { Z, F } = api;
			let jahr = 0, wissen = 0, helfer = 0, staende = 1, buchDa = false, kasse = 0, aus = false;
			const eink = [];
			const q = () => 1 + 0.5 * wissen;
			const passiv = () => helfer * 15 * q() + (staende - 1) * 30 * q() + (buchDa ? 25 * wissen * wissen : 0);
			const ansage = api.text("");
			const bild = api.bild(0.5, (g, W, H) => {
				const max = Math.max(200, ...eink) * 1.15, ys = max > 600 ? 200 : max > 300 ? 100 : 50;
				const { X, Y } = api.achsen(g, W, H, { xmax: 10, ymax: max, xs: 1, ys, xl: "Jahr", yl: "Einkommen im Jahr", xf: (x) => (x ? `${x}.` : "") });
				const bw = (X(1) - X(0)) * 0.7;
				eink.forEach((e, i) => {
					const xx = X(i) + (X(1) - X(0) - bw) / 2;
					Z.schraff(g, Z.recht(xx, Y(e), bw, Math.max(1, Y(0) - Y(e))), { fl: F.t, d: 99 });
					if (W > 380 || i === eink.length - 1) Z.text(g, String(Math.round(e)), xx + bw / 2, Y(e) - 5, { aus: "center", fett: true, gr: 12 });
				});
				Z.linie(g, X(0), Y(40), X(10), Y(40), { f: F.r, b: 1.5, s: [6, 4] });
				Z.text(g, "nur Stunden: 40", X(10) - 2, Y(40) - 5, { aus: "right", f: F.r, fett: true, gr: 12 });
			}, "Balken: dein Einkommen in jedem der zehn Jahre. Die gestrichelte Linie zeigt 40 Taler, das Einkommen aus reiner Standarbeit.");
			const k = api.kasten();
			const OPT = [
				["Am Stand stehen", "Stunden gegen Geld. Bringt sofort am meisten, hinterlässt nichts."],
				["Am eigenen Rezept tüfteln", "Spezialwissen. Dieses Jahr fast kein Einkommen. Danach ist alles, was du tust, mehr wert."],
				["Gehilfen anlernen", "Hebel Arbeit. Dieses Jahr wenig. Danach verkauft jemand mit, jedes Jahr."],
				["Zweiten Stand kaufen", "Hebel Kapital. Kostet 120 Taler aus der Kasse. Danach verdient der Stand mit."],
				["Rezeptbuch drucken", "Hebel ohne Grenzkosten. Dieses Jahr nichts. Danach verkauft sich jedes Exemplar ohne dein Zutun."],
			];
			const w = api.wahl(OPT.map(([a, b]) => `<b>${a}</b><br><small>${b}</small>`), (i) => {
				if (aus) return;
				const p = passiv(), qq = q();
				let aktiv = 0, was = OPT[i][0];
				if (i === 0) aktiv = 40 * qq;
				if (i === 1) { aktiv = 10; wissen++; }
				if (i === 2) { aktiv = 10; helfer++; }
				if (i === 3) { aktiv = 20; kasse -= 120; staende++; }
				if (i === 4) { aktiv = 0; buchDa = true; }
				const e = p + aktiv;
				kasse += e; jahr++;
				eink.push(e);
				buch.zeile([`${jahr}.`, was, String(Math.round(aktiv)), String(Math.round(p)), `<b>${Math.round(e)}</b>`]);
				if (i === 0) api.eil(`Jahr ${jahr}: ${Math.round(e)} Taler, davon ${Math.round(p)} ohne dein Zutun`, p === 0 ? "Hörst du auf zu stehen, hört das Geld auf zu fließen." : "Der Teil, der ohne dich läuft, bleibt dir auch nächstes Jahr.");
				if (i === 1) api.eil(`Ein Jahr in der Backstube: Dein Rezept hat jetzt Stufe ${wissen}`, wissen === 3 ? "Diese Brezel gibt es nur bei dir. Mehr lernst du hier nicht, jetzt kommt es auf den Hebel an." : "Eine Stunde von dir ist ab jetzt mehr wert, und alles, was auf deinem Wissen aufbaut, auch.");
				if (i === 2) api.eil(`Gehilfe Nummer ${helfer} eingestellt`, "Ab nächstem Jahr verkauft er mit. Mehr als drei kannst du nicht anleiten.");
				if (i === 3) api.eil("Zweiter Stand gekauft: 120 Taler für einen Platz am Südtor", "Ab nächstem Jahr verdient dein Geld mit, ohne dass du dort stehst.");
				if (i === 4) api.eil("„Die Brezel nach Art des Hauses“ geht in Druck", `Einmal geschrieben, beliebig oft verkauft. Bei Rezeptstufe ${wissen} bringt das Buch ${25 * wissen * wissen} Taler im Jahr.`);
				if (jahr === 10) {
					aus = true;
					w.bs.forEach((b) => { b.disabled = true; });
					ansage.innerHTML = `<b>Zehn Jahre vorbei.</b> In der Kasse: ${api.de(Math.round(kasse))} Taler.`;
					k.hidden = true;
					api.fertig(kasse >= 1200 ? 3 : kasse >= 600 ? 2 : 1, kasse >= 1200
						? `${api.de(Math.round(kasse))} Taler in zehn Jahren, gegen 400 mit reiner Standarbeit. Das meiste davon kam aus Dingen, die ohne deine Hände weiterlaufen.`
						: `${api.de(Math.round(kasse))} Taler in zehn Jahren. Reine Standarbeit bringt 400. Deutlich über 1.200 kommt, wer früh am eigenen Rezept tüftelt und es dann vervielfältigt, etwa als Buch.`);
				} else zeige();
				bild.neu();
			}, { spalte: true, label: "Schwerpunkt des Jahres" });
			const buch = api.buch(["Jahr", "Schwerpunkt", "Eigene Arbeit", "Läuft von selbst", "Einkommen"]);
			const zeige = () => {
				ansage.innerHTML = `<b>Jahr ${jahr + 1} von 10.</b> Womit verbringst du es?`;
				k.innerHTML = api.werte([["Kasse", String(Math.round(kasse))], ["Rezeptstufe", `${wissen} von 3`], ["Gehilfen", `${helfer} von 3`], ["Stände", String(staende)], ["Läuft von selbst", `${Math.round(passiv())} im Jahr`, "gruen"]]);
				w.bs[1].disabled = wissen >= 3;
				w.bs[2].disabled = helfer >= 3;
				w.bs[3].disabled = kasse < 120;
				w.bs[4].disabled = buchDa || wissen < 1;
			};
			zeige();
		},
		schlagzeile: "Reich wird nicht, wer mehr Stunden arbeitet, sondern wer seine Stunden vervielfacht",
		artikel: `<p>Am Stand tauschst du Stunden gegen Taler. Das Jahr hat eine feste Zahl davon, also hat dein
			Einkommen eine Decke. Naval Ravikant sagt es so: Wer seine Zeit vermietet, wird nicht reich. Damit die
			Decke verschwindet, muss dein Ertrag sich von deinen Stunden lösen. Dafür brauchst du einen
			<strong>Hebel</strong>.</p>
			<p>Naval nennt drei. <strong>Arbeit:</strong> Andere arbeiten für dich. Das ist der älteste Hebel und der
			mühsamste, weil Menschen geführt werden wollen. <strong>Kapital:</strong> Geld arbeitet für dich, wie beim
			zweiten Stand. Dafür musst du es erst haben. <strong>Produkte ohne Grenzkosten:</strong> Bücher, Software,
			Aufnahmen. Das zweite Exemplar kostet fast nichts, das tausendste auch nicht. Für diesen Hebel brauchst du
			niemandes Erlaubnis.</p>
			<p>Ein Hebel vergrößert, was da ist. Ein Rezeptbuch ohne besonderes Rezept verkauft sich kaum. Deshalb kommt
			zuerst das <strong>Spezialwissen</strong>: etwas, das du besser kannst als fast alle und das man nicht in
			einem Kurs lernt. Naval beschreibt es als das, was sich für dich wie Spiel anfühlt und für andere wie
			Arbeit aussieht. Was jeder lernen kann, kann jeder anbieten, und dann drückt der Wettbewerb aus Ausgabe 9
			den Preis.</p>
			<p>Hier treffen sich die Ausgaben. Die Jahre in der Backstube kosten Einkommen: Opportunitätskosten wie in
			Ausgabe 1. Sie zahlen sich später aus, weil alles Weitere darauf aufbaut: Zinseszins wie in Ausgabe 13. Und
			das Buch hat fixe Kosten und fast keine Grenzkosten, das Gegenteil der Bleche aus Ausgabe 8.</p>
			<p>Eine ehrliche Einschränkung gehört dazu. In diesem Spiel gelingt jedes Vorhaben. In Wirklichkeit floppen
			Bücher, und Stände brennen ab. Ein Hebel vergrößert auch Fehler. Die Richtung stimmt trotzdem.</p>`,
		merke: "Bau zuerst etwas auf, das nur du so kannst. Dann such den Hebel, der es vervielfacht, ohne dass du danebenstehen musst.",
		formel: "Ertrag = Spezialwissen × Hebel × Zeit",
		quiz: {
			f: "Welche dieser Tätigkeiten hat einen Hebel ohne Grenzkosten?",
			a: ["Eine Ärztin behandelt mehr Patienten, indem sie länger arbeitet.", "Ein Lehrer nimmt seine beste Erklärung auf, und zehntausend Leute sehen sie sich an.", "Ein Taxifahrer fährt auch nachts."],
			r: 1,
			w: "Richtig. Die Aufnahme entsteht einmal und kann beliebig oft angesehen werden, ohne dass der Lehrer noch eine Stunde dafür arbeitet. Ärztin und Taxifahrer verkaufen weiter Stunden.",
		},
	});
})();
