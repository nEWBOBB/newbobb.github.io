// Zone 2, Software: dem Rechner sagen, was er tun soll (U09 bis U14).
(() => {
	"use strict";
	const { el, sv, de, knopf, meld, auftraege, regler, RUHIG } = PL;

	// ---------- U09 Programmieren ----------
	const RICHT = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // Ost, Süd, West, Nord
	const BLOCK = {
		vor: "geh vor", links: "dreh links", rechts: "dreh rechts",
		rep: "wiederhole", sol: "solange nicht am Ziel", wl: "wenn Wand vorn: dreh links", ende: "Ende der Schleife",
	};
	PL.stufe({
		id: "programm", zone: 1, name: "Programmieren", kurz: "Folge, Schleife, Bedingung",
		frage: `<p>Befehle wie LADE und SPRING0 versteht die Maschine, aber Menschen schreiben damit nur mühsam. Deshalb gibt es <b>Programmiersprachen</b>. Sie bieten Befehle, die näher an unseren Gedanken liegen, und ein Übersetzer macht daraus Maschinenbefehle.</p>
			<p>Fast jedes Programm der Welt besteht aus drei Bauformen. Du lernst sie kennen, indem du einen Lötkäfer über die Platine zum goldenen Lötpunkt schickst. Die Zahl der Bausteine ist begrenzt.</p>`,
		bau(api) {
			const raetsel = [
				{ t: "<b>Folge:</b> Bring den Käfer mit höchstens 8 Bausteinen ans Ziel.", b: 5, h: 4, start: [0, 3, 0], ziel: [3, 1], wand: ["1,2", "2,2", "1,1", "2,1", "4,2"], max: 8, pal: ["vor", "links", "rechts"] },
				{ t: "<b>Schleife:</b> Die Treppe hinauf mit höchstens 5 Bausteinen.", b: 5, h: 5, start: [0, 4, 0], ziel: [4, 0], wand: ["2,4", "3,4", "4,4", "3,3", "4,3", "4,2", "0,3", "0,2", "1,2", "0,1", "1,1", "2,1", "0,0", "1,0", "2,0", "3,0"], max: 5, pal: ["vor", "links", "rechts", "rep", "ende"] },
				{ t: "<b>Bedingung:</b> Durch den Gang mit höchstens 3 Bausteinen. Der Käfer muss selbst merken, wo er abbiegt.", b: 5, h: 5, start: [0, 4, 0], ziel: [2, 2], wand: ["0,3", "1,3", "2,3", "3,3", "1,1", "2,1", "3,1", "3,2"], max: 3, pal: ["vor", "links", "sol", "wl", "ende"] },
			];
			const auf = auftraege(raetsel.map((r) => r.t));
			const ort = el("div"), status = meld();
			api.feld.append(auf.el, ort, status);
			let laeuft = null;
			api.raeume(() => clearInterval(laeuft));

			function lade(k) {
				const R = raetsel[k];
				clearInterval(laeuft);
				ort.textContent = "";
				let prog = [], pos, geloest = false;
				const Z = 44;
				const svg = sv("svg", { viewBox: `0 0 ${R.b * Z + 4} ${R.h * Z + 4}`, class: "gelaende", role: "img" });
				for (let y = 0; y < R.h; y++) for (let x = 0; x < R.b; x++) {
					const w = R.wand.includes(`${x},${y}`);
					sv("rect", { x: x * Z + 3, y: y * Z + 3, width: Z - 2, height: Z - 2, rx: 4, class: w ? "g-wand" : "g-feld" }, svg);
					if (w) { const t = sv("text", { x: x * Z + Z / 2 + 2, y: y * Z + Z / 2 + 3, class: "g-ic" }, svg); t.textContent = "IC"; }
				}
				sv("circle", { cx: R.ziel[0] * Z + Z / 2 + 2, cy: R.ziel[1] * Z + Z / 2 + 2, r: 11, class: "g-ziel" }, svg);
				sv("circle", { cx: R.ziel[0] * Z + Z / 2 + 2, cy: R.ziel[1] * Z + Z / 2 + 2, r: 4, class: "g-loch" }, svg);
				const kaefer = sv("g", { class: "kaefer" }, svg);
				sv("path", { d: "M-13 -10 L14 0 L-13 10 L-7 0 Z" }, kaefer);
				const stell = () => {
					kaefer.setAttribute("transform", `translate(${pos[0] * Z + Z / 2 + 2} ${pos[1] * Z + Z / 2 + 2}) rotate(${pos[2] * 90})`);
					svg.setAttribute("aria-label", `Platine mit ${R.b} mal ${R.h} Feldern. Der Käfer steht in Spalte ${pos[0] + 1}, Zeile ${pos[1] + 1}. Das Ziel liegt in Spalte ${R.ziel[0] + 1}, Zeile ${R.ziel[1] + 1}.`);
				};
				const anfang = () => { pos = R.start.slice(); stell(); };
				const frei = (x, y) => x >= 0 && y >= 0 && x < R.b && y < R.h && !R.wand.includes(`${x},${y}`);
				const vorn = () => [pos[0] + RICHT[pos[2]][0], pos[1] + RICHT[pos[2]][1]];
				const amZiel = () => pos[0] === R.ziel[0] && pos[1] === R.ziel[1];

				const liste = el("ol", { class: "code", "aria-label": "Dein Programm" });
				const zahl = el("p", { class: "rl" });
				const pal = el("div", { class: "palette", role: "group", "aria-label": "Bausteine" });
				R.pal.forEach((t) => pal.appendChild(knopf(BLOCK[t] + (t === "rep" ? " …" : ""), () => {
					if (t !== "ende" && anzahl() >= R.max) { status.sag(`Mehr als ${R.max} Bausteine passen nicht. Tippe einen Baustein im Programm an, um ihn zu entfernen.`, "schlecht"); return; }
					prog.push(t === "rep" ? { t, n: 4 } : { t });
					maleProg();
				}, "block b-" + t)));
				const anzahl = () => prog.filter((p) => p.t !== "ende").length;
				function maleProg() {
					liste.textContent = "";
					let tiefe = 0;
					prog.forEach((p, i) => {
						if (p.t === "ende") tiefe = Math.max(0, tiefe - 1);
						const li = el("li", { style: `--t:${tiefe}`, class: "b-" + p.t });
						li.appendChild(el("span", {}, BLOCK[p.t]));
						if (p.t === "rep") {
							const n = knopf(`${p.n} ×`, () => { p.n = p.n >= 6 ? 2 : p.n + 1; maleProg(); }, "mal");
							n.setAttribute("aria-label", `${p.n} mal wiederholen. Antippen ändert die Zahl.`);
							li.appendChild(n);
						}
						const x = knopf("entfernen", () => { prog.splice(i, 1); maleProg(); }, "weg");
						x.setAttribute("aria-label", `Baustein ${i + 1} (${BLOCK[p.t]}) entfernen`);
						li.appendChild(x);
						liste.appendChild(li);
						if (p.t === "rep" || p.t === "sol") tiefe++;
					});
					if (!prog.length) liste.appendChild(el("li", { class: "leer" }, "Noch leer. Tippe unten Bausteine an."));
					zahl.textContent = `${anzahl()} von ${R.max} Bausteinen`;
				}
				// Macht aus der flachen Liste einen Baum. Offene Schleifen enden am Programmende.
				function baum() {
					const wurzel = [], stapel = [wurzel];
					prog.forEach((p) => {
						if (p.t === "ende") { if (stapel.length > 1) stapel.pop(); return; }
						const k = { t: p.t, n: p.n, in: [] };
						stapel[stapel.length - 1].push(k);
						if (p.t === "rep" || p.t === "sol") stapel.push(k.in);
					});
					return wurzel;
				}
				function* lauf(liste2) {
					for (const k of liste2) {
						if (k.t === "rep") { for (let i = 0; i < k.n; i++) yield* lauf(k.in); }
						else if (k.t === "sol") { while (!amZiel()) { if (!k.in.length) { yield "leer"; return; } yield* lauf(k.in); } }
						else yield k.t;
					}
				}
				const los = knopf("Start", () => {
					clearInterval(laeuft);
					anfang();
					const it = lauf(baum());
					let n = 0;
					status.sag("Der Käfer läuft …");
					laeuft = setInterval(() => {
						const s = it.next();
						const halt = (text, art) => { clearInterval(laeuft); status.sag(text, art); };
						if (amZiel()) return gewonnen();
						if (s.done) return halt("Das Programm ist zu Ende, aber der Käfer steht nicht auf dem Ziel.", "schlecht");
						if (++n > 200) return halt("Nach 200 Schritten abgebrochen. Der Käfer dreht sich im Kreis.", "schlecht");
						if (s.value === "leer") return halt("Die Schleife ist leer. Der Käfer würde ewig auf der Stelle stehen.", "schlecht");
						if (s.value === "links") pos[2] = (pos[2] + 3) % 4;
						else if (s.value === "rechts") pos[2] = (pos[2] + 1) % 4;
						else if (s.value === "wl") { const [x, y] = vorn(); if (!frei(x, y)) pos[2] = (pos[2] + 3) % 4; }
						else if (s.value === "vor") {
							const [x, y] = vorn();
							if (!frei(x, y)) return halt("Angestoßen. Der Käfer ist gegen ein Bauteil oder den Rand gelaufen.", "schlecht");
							pos[0] = x; pos[1] = y;
						}
						stell();
						if (amZiel()) gewonnen();
					}, RUHIG ? 60 : 230);
				});
				function gewonnen() {
					clearInterval(laeuft);
					if (geloest) return;
					geloest = true;
					auf.ab(k);
					if (k < raetsel.length - 1) {
						status.sag(`Am Ziel mit ${anzahl()} Bausteinen.`, "gut");
						status.appendChild(document.createTextNode(" "));
						status.appendChild(knopf("Nächste Aufgabe", () => { status.sag(""); lade(k + 1); }));
					} else {
						status.sag("Am Ziel. Dieses Programm kennt den Weg gar nicht. Es findet ihn, weil es bei jedem Schritt nachsieht.", "gut");
						api.fertig("Du hast Folge, Schleife und Bedingung benutzt.");
					}
				}
				const leer = knopf("Leeren", () => { clearInterval(laeuft); prog = []; maleProg(); anfang(); status.sag(""); }, "leise");
				const leiste = el("div", { class: "zeile" });
				leiste.append(los, leer);
				const spalten = el("div", { class: "kspalten" });
				const rechts = el("div");
				rechts.append(zahl, liste, pal, leiste);
				spalten.append(svg, rechts);
				ort.appendChild(spalten);
				anfang(); maleProg();
			}
			lade(0);
		},
		warum: `<p>Du hast die drei Bauformen benutzt, aus denen Programme bestehen.</p>
			<p>Die <b>Folge</b>: Befehle werden der Reihe nach ausgeführt. Die <b>Schleife</b>: Ein Stück Programm läuft mehrmals, statt dass du es mehrmals hinschreibst. Die <b>Bedingung</b>: Das Programm prüft etwas und tut je nach Ergebnis das eine oder das andere.</p>
			<p>Schau dir den Unterschied zwischen der ersten und der letzten Aufgabe an. Das erste Programm ist eine Wegbeschreibung, die nur auf genau dieser Platine stimmt. Das letzte ist eine <b>Regel</b>: „Solange du nicht da bist: Wenn vorn eine Wand ist, dreh dich. Geh vor.“ Sie funktioniert in jedem Gang, der nur nach links abbiegt, egal wie lang er ist. Gute Programme beschreiben die Regel hinter dem Weg.</p>
			<p>Unter der Haube wird aus „solange“ ein SPRING0 und ein SPRING, wie du sie im Prozessor gesehen hast. Diese Übersetzung erledigt ein Programm namens <b>Compiler</b>. In Python sähe dein letztes Programm so aus:</p>
			<pre><code>while not am_ziel():
    if wand_vorn():
        dreh_links()
    geh_vor()</code></pre>`,
		merke: "Programme bestehen aus Folge, Schleife und Bedingung. Ein gutes Programm beschreibt eine Regel, die in vielen Fällen stimmt.",
		quiz: { f: "Dein Programm für den Gang hat drei Bausteine. Der Gang wird doppelt so lang. Was musst du ändern?", a: ["Doppelt so viele Bausteine einsetzen", "Die Wiederholungszahl erhöhen", "Nichts. Die Schleife läuft, bis das Ziel erreicht ist", "Den Käfer schneller machen"], r: 2, e: "„Solange nicht am Ziel“ passt sich der Länge von selbst an." },
	});

	// ---------- U10 Suchen ----------
	PL.stufe({
		id: "suchen", zone: 1, name: "Suchen", kurz: "Halbieren schlägt Durchblättern",
		frage: `<p>Ein Programm, das funktioniert, ist erst die halbe Miete. Die andere Hälfte ist die Frage, wie viele Schritte es braucht. Ein Rezept für eine Aufgabe heißt <b>Algorithmus</b>, und für dieselbe Aufgabe gibt es gute und schlechte.</p>
			<p>Die Maschine hat sich eine Zahl von 1 bis 100 gemerkt. Du darfst fragen, sie antwortet nur mit „größer“, „kleiner“ oder „getroffen“. Schaffst du es mit höchstens 7 Fragen?</p>`,
		bau(api) {
			const auf = auftraege(["Finde die Zahl mit höchstens <b>7 Fragen</b>."]);
			const spur = el("div", { class: "spur", role: "img" });
			const status = meld();
			let geheim, lo, hi, fragen;
			const r = regler({ name: "Deine Frage: Ist es die …", min: 1, max: 100, wert: 50, bei: () => {} });
			const frag = knopf("Fragen", () => {
				const g = r.wert();
				fragen++;
				if (g === geheim) {
					if (fragen <= 7) {
						auf.ab(0);
						status.sag(`Getroffen: die ${geheim}, mit ${fragen} ${fragen === 1 ? "Frage" : "Fragen"}. Wer immer die Mitte fragt, braucht nie mehr als 7.`, "gut");
						teil2.hidden = false;
						api.fertig("Du hast die Zahl durch Halbieren gefunden.");
					} else status.sag(`Getroffen: die ${geheim}, aber erst mit ${fragen} Fragen. Tipp: Frag immer die Mitte des Bereichs, der noch übrig ist.`, "schlecht");
					frag.disabled = true;
					neuK.hidden = false;
					lo = hi = geheim; male();
					return;
				}
				if (g < geheim) { lo = Math.max(lo, g + 1); status.sag(`Frage ${fragen}: Die Zahl ist <b>größer</b> als ${g}.`); }
				else { hi = Math.min(hi, g - 1); status.sag(`Frage ${fragen}: Die Zahl ist <b>kleiner</b> als ${g}.`); }
				r.inp.min = lo; r.inp.max = hi;
				r.setze(Math.min(hi, Math.max(lo, g)));
				male();
			});
			const neuK = knopf("Neue Zahl", neu, "leise");
			function male() {
				spur.innerHTML = `<span style="left:${lo - 1}%;width:${hi - lo + 1}%"></span><i style="left:0">1</i><i style="right:0">100</i>`;
				spur.setAttribute("aria-label", `Die Zahl liegt zwischen ${lo} und ${hi}. Noch ${hi - lo + 1} Möglichkeiten.`);
				info.textContent = `Noch möglich: ${lo} bis ${hi} (${hi - lo + 1} ${hi === lo ? "Zahl" : "Zahlen"}) · ${fragen} ${fragen === 1 ? "Frage" : "Fragen"} gestellt`;
			}
			const info = el("p", { class: "rl" });
			function neu() {
				geheim = 1 + Math.floor(Math.random() * 100); lo = 1; hi = 100; fragen = 0;
				r.inp.min = 1; r.inp.max = 100; r.setze(50);
				frag.disabled = false; neuK.hidden = true;
				status.sag("Schieb den Regler auf deine Zahl und frag.");
				male();
			}
			const leiste = el("div", { class: "zeile" });
			leiste.append(frag, neuK);

			// Teil 2: Schritte im Vergleich
			const teil2 = el("div", { class: "werk", hidden: true });
			const balken = el("div", { class: "vergleich" });
			const r2 = regler({
				name: "Länge der sortierten Liste", min: 1, max: 9, wert: 2, fmt: (k) => de(10 ** k) + " Einträge",
				bei: zeig2,
			});
			function zeig2(k) {
				const n = 10 ** k, lin = n, bin = Math.ceil(Math.log2(n + 1));
				balken.innerHTML = `<div><small>Der Reihe nach durchblättern, im schlimmsten Fall</small><b>${de(lin)} Schritte</b><span style="--w:${(k / 9) * 100}%"></span></div>
					<div><small>Immer in der Mitte teilen, im schlimmsten Fall</small><b>${bin} Schritte</b><span class="gut" style="--w:${Math.max(1.5, (Math.log10(bin) / 9) * 100)}%"></span></div>`;
			}
			teil2.append(el("p", { class: "klein-titel" }, "Und bei längeren Listen?"), r2.el, balken, el("p", { class: "rl" }, "Die Balken sind gestaucht: Jeder Schritt nach rechts bedeutet das Zehnfache."));
			zeig2(2);
			api.feld.append(auf.el, spur, info, r.el, leiste, status, teil2);
			neu();
		},
		warum: `<p>Jede kluge Frage halbiert den Bereich, in dem die Zahl noch liegen kann: 100, 50, 25, 13, 7, 4, 2, 1. Nach sieben Fragen bleibt nur eine Zahl übrig. Dieses Verfahren heißt <b>binäre Suche</b>. Es funktioniert nur, wenn die Liste sortiert ist, denn nur dann sagt dir „kleiner“, dass du die ganze obere Hälfte wegwerfen darfst.</p>
			<p>Wer dagegen der Reihe nach fragt („Ist es die 1? Die 2?“), braucht im schlimmsten Fall 100 Fragen. Bei 100 Einträgen ist das ärgerlich, bei einer Milliarde unbrauchbar. Die binäre Suche braucht dort 30 Schritte.</p>
			<p class="formel">Durchblättern: n Schritte · Halbieren: log₂ n Schritte</p>
			<p>Informatiker beschreiben das mit der <b>O-Notation</b>. O(n) heißt: Die Arbeit wächst im Gleichschritt mit der Größe der Eingabe. O(log n) heißt: Verdoppelt sich die Eingabe, kommt ein einziger Schritt dazu. Es geht nicht um Sekunden, sondern darum, wie die Arbeit wächst. Ein guter Algorithmus auf einem alten Rechner schlägt einen schlechten auf dem schnellsten Rechner der Welt, sobald die Eingabe groß genug ist. Den Logarithmus kennst du aus dem <a href="../math/">Mathe-Heft</a>, Stufe 8.</p>`,
		merke: "Binäre Suche halbiert bei jedem Schritt und braucht nur log₂ n Schritte. Entscheidend ist, wie die Arbeit mit der Eingabe wächst.",
		quiz: { f: "Ein sortiertes Telefonbuch hat eine Million Einträge. Wie viele Blicke braucht die binäre Suche höchstens?", a: ["etwa 20", "etwa 1.000", "500.000", "eine Million"], r: 0, e: "2²⁰ ist etwas mehr als eine Million. Zwanzigmal halbieren reicht." },
	});

	// ---------- U11 Sortieren ----------
	PL.stufe({
		id: "sortieren", zone: 1, name: "Sortieren", kurz: "Ordnung schaffen mit Vergleichen",
		frage: `<p>Die binäre Suche braucht eine sortierte Liste. Also muss jemand sortieren. Ein Rechner sieht dabei nie die ganze Liste auf einmal wie du. Er kann immer nur zwei Einträge vergleichen und sie, wenn nötig, vertauschen.</p>
			<p>Versuch es selbst unter diesen Bedingungen. Sechs Chips liegen verdeckt auf der Bank. Tippe zwischen zwei Nachbarn: Die Maschine vergleicht sie und tauscht, wenn der linke schwerer ist. Fertig bist du, wenn alle fünf Nachbarpaare stimmen.</p>`,
		bau(api) {
			const auf = auftraege(["Sortiere die sechs Chips von leicht nach schwer.", "Lass zwei Verfahren gegeneinander antreten."]);
			const bank = el("div", { class: "sortbank" });
			const status = meld("Jeder Tipp ist ein Vergleich. Zähl mit, wie viele du brauchst.");
			let werte, ok, zahl, fertig;
			function neu() {
				werte = [2, 3, 5, 7, 8, 9].sort(() => Math.random() - 0.5);
				if (werte.every((w, i) => !i || werte[i - 1] < w)) werte.reverse();
				ok = [0, 0, 0, 0, 0]; zahl = 0; fertig = false;
				male();
			}
			function male(blitz) {
				bank.textContent = "";
				werte.forEach((w, i) => {
					bank.appendChild(el("span", { class: "sc" + (fertig ? " offen" : ""), style: fertig ? `--h:${w}` : "" }, fertig ? w + " g" : "?"));
					if (i < 5) {
						const b = el("button", { type: "button", class: "luecke" + (ok[i] ? " ok" : "") + (blitz === i ? " blitz" : ""), "aria-label": `Chip ${i + 1} und ${i + 2} vergleichen${ok[i] ? " (stehen richtig)" : ""}`, disabled: fertig }, ok[i] ? "&lt;" : "?");
						b.addEventListener("click", () => vergleich(i));
						bank.appendChild(b);
					}
				});
			}
			function vergleich(i) {
				zahl++;
				let text;
				if (werte[i] > werte[i + 1]) {
					[werte[i], werte[i + 1]] = [werte[i + 1], werte[i]];
					if (i > 0) ok[i - 1] = 0;
					if (i < 4) ok[i + 1] = 0;
					text = `Vergleich ${zahl}: Der linke war schwerer. Getauscht. Die Paare daneben sind jetzt wieder offen.`;
				} else text = `Vergleich ${zahl}: Die beiden standen schon richtig.`;
				ok[i] = 1;
				if (ok.every(Boolean)) {
					fertig = true;
					male();
					auf.ab(0);
					status.sag(`Sortiert mit ${zahl} Vergleichen. Wer stur von links nach rechts durchgeht, bis nichts mehr tauscht, braucht bis zu 15. Das beste Verfahren kommt bei sechs Chips mit 10 aus.`, "gut");
					rennen.hidden = false;
					return;
				}
				male(i);
				status.sag(text);
			}
			// Rennen: Blasen gegen Mischen
			const rennen = el("div", { class: "werk", hidden: true });
			const N = 40;
			const bahnen = ["Nachbarn tauschen (Bubblesort)", "Teilen und mischen (Mergesort)"].map((name) => {
				const box = el("div", { class: "bahn" });
				const kopf = el("p", { class: "rl" }, name);
				const zaehler = el("b", {}, "0 Vergleiche");
				kopf.appendChild(zaehler);
				const stangen = el("div", { class: "stangen", "aria-hidden": "true" });
				for (let i = 0; i < N; i++) stangen.appendChild(el("i"));
				box.append(kopf, stangen);
				rennen.appendChild(box);
				return { stangen, zaehler };
			});
			function plan(start) {
				// Bubblesort: jeder Vergleich ein Schritt
				const a = start.slice(), sa = [];
				for (let e = N - 1; e > 0; e--) {
					let get = false;
					for (let i = 0; i < e; i++) {
						const s = { v: [i, i + 1], w: [] };
						if (a[i] > a[i + 1]) { [a[i], a[i + 1]] = [a[i + 1], a[i]]; s.w.push([i, a[i]], [i + 1, a[i + 1]]); get = true; }
						sa.push(s);
					}
					if (!get) break;
				}
				// Mergesort
				const b = start.slice(), sb = [];
				(function ms(l, r) {
					if (r - l < 1) return;
					const m = (l + r) >> 1;
					ms(l, m); ms(m + 1, r);
					const L = b.slice(l, m + 1), R2 = b.slice(m + 1, r + 1);
					let i = 0, j = 0, k = l;
					while (i < L.length && j < R2.length) {
						const s = { v: [l + i, m + 1 + j], w: [] };
						if (L[i] <= R2[j]) { b[k] = L[i++]; } else { b[k] = R2[j++]; }
						s.w.push([k, b[k]]); k++;
						sb.push(s);
					}
					const rest = sb[sb.length - 1];
					while (i < L.length) { b[k] = L[i++]; rest.w.push([k, b[k]]); k++; }
					while (j < R2.length) { b[k] = R2[j++]; rest.w.push([k, b[k]]); k++; }
				})(0, N - 1);
				return [sa, sb];
			}
			let raf = 0;
			api.raeume(() => cancelAnimationFrame(raf));
			const startK = knopf("Rennen starten", () => {
				cancelAnimationFrame(raf);
				const start = Array.from({ length: N }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
				const plaene = plan(start);
				const pos = [0, 0];
				bahnen.forEach((b) => [...b.stangen.children].forEach((s, i) => { s.style.height = (start[i] / N) * 100 + "%"; s.className = ""; }));
				const tick = () => {
					let offen = false;
					bahnen.forEach((b, k) => {
						const p = plaene[k], kinder = b.stangen.children;
						const n = RUHIG ? p.length : 3;
						for (let q = 0; q < n && pos[k] < p.length; q++) {
							const s = p[pos[k]++];
							s.w.forEach(([i, v]) => { kinder[i].style.height = (v / N) * 100 + "%"; });
							[...b.stangen.querySelectorAll(".v")].forEach((x) => x.classList.remove("v"));
							if (pos[k] < p.length) s.v.forEach((i) => kinder[i].classList.add("v"));
						}
						b.zaehler.textContent = `${pos[k]} Vergleiche`;
						if (pos[k] < p.length) offen = true; else b.stangen.classList.add("fertig");
					});
					if (offen) raf = requestAnimationFrame(tick);
					else {
						if (!auf.ok(1)) auf.ab(1);
						status.sag(`Beide Listen sind sortiert. Bubblesort brauchte ${plaene[0].length} Vergleiche, Mergesort ${plaene[1].length}. Bei 40 Stangen ist das der Faktor ${Math.round(plaene[0].length / plaene[1].length)}, bei einer Million Einträgen wäre es der Faktor 25.000.`, "gut");
						api.fertig("Du hast von Hand sortiert und zwei Verfahren verglichen.");
					}
				};
				bahnen.forEach((b) => b.stangen.classList.remove("fertig"));
				tick();
			});
			const zl = el("div", { class: "zeile" });
			zl.appendChild(startK);
			rennen.prepend(el("p", { class: "klein-titel" }, "40 Stangen, zwei Verfahren, dieselbe Unordnung"));
			rennen.appendChild(zl);
			api.feld.append(auf.el, bank, status, rennen);
			neu();
		},
		warum: `<p>Was du von Hand gemacht hast, heißt <b>Bubblesort</b>: Nachbarn vergleichen, tauschen, wiederholen. Große Werte steigen dabei wie Blasen nach rechts. Das Verfahren ist leicht zu verstehen, aber langsam. Im schlimmsten Fall wird jedes Element mit jedem anderen verglichen, das sind rund n² / 2 Vergleiche.</p>
			<p><b>Mergesort</b> geht anders vor. Es teilt die Liste in zwei Hälften, sortiert jede Hälfte für sich und mischt die beiden sortierten Hälften dann wie zwei Kartenstapel zusammen: immer die kleinere der beiden obersten Karten nehmen. Das Mischen kostet nur n Vergleiche, und halbieren kann man log₂ n mal.</p>
			<p class="formel">Bubblesort: etwa n² / 2 · Mergesort: etwa n · log₂ n</p>
			<p>Bei einer Million Einträgen sind das 500 Milliarden Vergleiche gegen 20 Millionen. Auf einem heutigen Rechner bedeutet das einige Minuten gegen einen Wimpernschlag. Wie Mergesort „jede Hälfte für sich sortiert“? Mit sich selbst. Dieser Kniff heißt Rekursion und kommt im übernächsten Baustein.</p>`,
		merke: "Sortieren kostet Vergleiche. Einfache Verfahren brauchen etwa n², kluge etwa n · log n. Bei großen Listen ist das ein Unterschied wie Tage gegen Sekunden.",
		quiz: { f: "Eine Liste wird zehnmal so lang. Wie viel mehr Vergleiche braucht Bubblesort ungefähr?", a: ["10-mal so viele", "20-mal so viele", "100-mal so viele", "gleich viele"], r: 2, e: "n² wächst mit dem Quadrat: 10 · 10 = 100." },
	});

	// ---------- U12 Datenstrukturen ----------
	PL.stufe({
		id: "strukturen", zone: 1, name: "Datenstrukturen", kurz: "Stapel und Schlange",
		frage: `<p>Programme jonglieren mit vielen Daten. Wie man sie ablegt, entscheidet darüber, was sich schnell wiederfinden lässt. Eine solche Ablageform heißt <b>Datenstruktur</b>.</p>
			<p>Zwei der einfachsten unterscheiden sich nur in einer Regel: Wer kommt als Nächstes raus? Leg drei Chips in beide hinein und sag vorher, was passiert.</p>`,
		bau(api) {
			const auf = auftraege(["Leg A, B und C hinein.", "Tipp ab: Was kommt beim <b>Stapel</b> zuerst heraus?", "Hol alle drei Chips wieder heraus.", "Ordne vier Alltagsfälle zu."]);
			const stapel = [], schlange = [];
			let naechster = 0, tipp = null, rausS = [], rausQ = [];
			const bild = el("div", { class: "ds" });
			const status = meld("„Rein“ legt denselben Chip in beide Strukturen.");
			const rein = knopf("Rein", () => {
				if (naechster > 2) return;
				const c = "ABC"[naechster++];
				stapel.push(c); schlange.push(c);
				if (naechster === 3) { auf.ab(0); rein.disabled = true; tw.hidden = false; status.sag("Alle drei liegen drin. Beim Stapel liegt C obenauf, in der Schlange steht A vorn."); }
				male();
			});
			const raus = knopf("Raus", () => {
				if (!stapel.length) return;
				rausS.push(stapel.pop()); rausQ.push(schlange.shift());
				male();
				if (!stapel.length) {
					auf.ab(2);
					raus.disabled = true;
					status.sag(`Der Stapel gab ${rausS.join(", ")} zurück, die Schlange ${rausQ.join(", ")}. ${tipp === "C" ? "Dein Tipp stimmte." : "Beim Stapel kommt der letzte Chip zuerst."}`, "gut");
					faelle.hidden = false;
				}
			});
			raus.disabled = true;
			const tw = el("div", { class: "p-wahl", hidden: true });
			["A", "B", "C"].forEach((c) => tw.appendChild(knopf(`Chip ${c}`, (ev) => {
				tipp = c;
				tw.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
				ev.currentTarget.setAttribute("aria-pressed", "true");
				if (!auf.ok(1)) auf.ab(1);
				raus.disabled = false;
				status.sag("Tipp notiert. Hol die Chips jetzt heraus.");
			}, "wahl")));
			function male() {
				const chips = (a) => a.map((c) => `<span>${c}</span>`).join("");
				bild.innerHTML = `<div><p class="rl">Stapel: zuletzt rein, zuerst raus</p><div class="st">${chips(stapel)}</div><p class="rl">heraus: <b>${rausS.join(" ") || "–"}</b></p></div>
					<div><p class="rl">Schlange: zuerst rein, zuerst raus</p><div class="qu">${chips(schlange)}</div><p class="rl">heraus: <b>${rausQ.join(" ") || "–"}</b></p></div>`;
			}
			const leiste = el("div", { class: "zeile" });
			leiste.append(rein, raus);

			const faelle = el("div", { class: "werk", hidden: true });
			faelle.appendChild(el("p", { class: "klein-titel" }, "Stapel oder Schlange?"));
			const liste = [
				["Die Rückgängig-Taste im Schreibprogramm", 0, "Rückgängig nimmt immer die letzte Änderung zurück."],
				["Druckaufträge im Büro", 1, "Wer zuerst abschickt, wird zuerst gedruckt."],
				["Der Zurück-Knopf im Browser", 0, "Zurück führt zur zuletzt besuchten Seite."],
				["Nachrichten, die auf den Versand warten", 1, "Sie sollen in der Reihenfolge ankommen, in der du sie geschrieben hast."],
			];
			let offen = liste.length;
			liste.forEach(([text, r, warum]) => {
				const z = el("div", { class: "fall" });
				z.appendChild(el("p", {}, text));
				const w = el("div", { class: "seg" });
				const s = el("p", { class: "fall-s", "aria-live": "polite" });
				["Stapel", "Schlange"].forEach((n, k) => w.appendChild(knopf(n, (ev) => {
					if (z.dataset.ok) return;
					if (k === r) {
						z.dataset.ok = "1"; ev.currentTarget.setAttribute("aria-pressed", "true");
						s.textContent = warum;
						if (--offen === 0) { auf.ab(3); api.fertig("Du weißt, wann ein Stapel passt und wann eine Schlange."); }
					} else s.textContent = "Überleg: Welcher Eintrag soll als Nächster drankommen, der älteste oder der neueste?";
				}, "segk")));
				z.append(w, s);
				faelle.appendChild(z);
			});
			api.feld.append(auf.el, bild, leiste, tw, status, faelle);
			male();
		},
		warum: `<p>Ein <b>Stapel</b> arbeitet wie ein Tellerstapel: Du legst oben drauf und nimmst oben weg. Der Prozessor selbst benutzt einen, um sich zu merken, wohin er nach einem Unterprogramm zurückkehren muss. Eine <b>Schlange</b> arbeitet wie die Kasse im Supermarkt: Hinten anstellen, vorn drankommen. Jeder Server, der Anfragen der Reihe nach abarbeitet, benutzt eine.</p>
			<p>Es gibt mehr davon, und jede ist für eine Frage besonders schnell:</p>
			<table class="wt"><thead><tr><th>Struktur</th><th>Gut für</th></tr></thead><tbody>
			<tr><td>Feld (Array)</td><td>„Gib mir den Eintrag Nummer 5.000“: ein Schritt</td></tr>
			<tr><td>Verkettete Liste</td><td>mittendrin einfügen, ohne alles zu verschieben</td></tr>
			<tr><td>Wörterbuch (Hashtabelle)</td><td>„Was gehört zu diesem Namen?“: fast immer ein Schritt</td></tr>
			<tr><td>Baum</td><td>sortiert bleiben, obwohl ständig etwas dazukommt</td></tr>
			<tr><td>Graph</td><td>Dinge mit Verbindungen: Straßen, Freundschaften, Links</td></tr></tbody></table>
			<p>Die Wahl der Struktur entscheidet oft mehr über die Geschwindigkeit als jede Feinarbeit am Programm. Ein Telefonbuch als unsortierter Zettelhaufen bleibt langsam, egal wie schnell du blätterst.</p>`,
		merke: "Stapel: zuletzt rein, zuerst raus. Schlange: zuerst rein, zuerst raus. Die passende Datenstruktur macht ein Programm schnell.",
		quiz: { f: "Du legst nacheinander 1, 2, 3 auf einen Stapel und nimmst dann zweimal etwas herunter. Was liegt noch drauf?", a: ["die 1", "die 2", "die 3", "nichts"], r: 0, e: "Erst geht die 3, dann die 2. Die 1 lag zuunterst." },
	});

	// ---------- U13 Rekursion ----------
	PL.stufe({
		id: "rekursion", zone: 1, name: "Rekursion", kurz: "Ein Problem löst sich mit sich selbst",
		frage: `<p>Manche Aufgaben sehen riesig aus, bestehen aber aus kleineren Ausgaben derselben Aufgabe. Wer das erkennt, braucht nur noch zwei Dinge: die Lösung für den kleinsten Fall und eine Regel, wie man einen großen Fall auf einen kleineren zurückführt.</p>
			<p>Das berühmteste Beispiel sind die Türme von Hanoi. Bring den Turm vom linken auf den rechten Stab. Es darf immer nur eine Scheibe bewegt werden, und nie darf eine größere auf einer kleineren liegen.</p>`,
		bau(api) {
			const auf = auftraege(["Bring den Turm aus 3 Scheiben nach rechts.", "Lass die Maschine 4 Scheiben vorführen."]);
			const feld = el("div", { class: "hanoi" });
			const status = meld("Tippe einen Stab an, um die oberste Scheibe aufzunehmen. Tippe dann den Zielstab an.");
			let staebe, hand, zuege, n, laeuft = null;
			api.raeume(() => clearInterval(laeuft));
			const namen = ["links", "Mitte", "rechts"];
			function setz(k) { n = k; staebe = [[], [], []]; for (let i = k; i >= 1; i--) staebe[0].push(i); hand = null; zuege = 0; male(); }
			function male() {
				feld.textContent = "";
				staebe.forEach((s, i) => {
					const b = el("button", { type: "button", class: "stab" + (hand === i ? " hand" : ""), disabled: !!laeuft, "aria-label": `Stab ${namen[i]}: ${s.length ? "Scheiben " + s.join(", ") + " von unten nach oben" : "leer"}${hand === i ? ". Oberste Scheibe ist aufgenommen" : ""}` });
					s.forEach((d, j) => b.appendChild(el("span", { class: "scheibe" + (hand === i && j === s.length - 1 ? " hoch" : ""), style: `--d:${d};--n:${n}` })));
					b.addEventListener("click", () => tipp(i));
					feld.appendChild(b);
				});
				zeile.textContent = `${zuege} ${zuege === 1 ? "Zug" : "Züge"} · kürzeste Lösung: ${2 ** n - 1}`;
			}
			function tipp(i) {
				if (hand === null) {
					if (!staebe[i].length) { status.sag("Auf diesem Stab liegt nichts."); return; }
					hand = i; status.sag(`Scheibe ${staebe[i].at(-1)} aufgenommen. Wohin damit?`);
				} else if (hand === i) { hand = null; status.sag("Zurückgelegt."); }
				else {
					const d = staebe[hand].at(-1), z = staebe[i].at(-1);
					if (z && z < d) { status.sag("Das geht nicht: Eine größere Scheibe darf nicht auf einer kleineren liegen.", "schlecht"); return; }
					staebe[i].push(staebe[hand].pop()); hand = null; zuege++;
					status.sag(`Zug ${zuege}: Scheibe ${d} nach ${namen[i]}.`);
					if (staebe[2].length === n) {
						if (n === 3 && !auf.ok(0)) {
							auf.ab(0);
							status.sag(`Geschafft in ${zuege} Zügen${zuege === 7 ? ", kürzer geht es nicht" : ". Die kürzeste Lösung hat 7"}. Achte bei der Vorführung darauf, wo dein Turm aus 3 Scheiben wieder auftaucht.`, "gut");
							vor.hidden = false;
						}
					}
				}
				male();
			}
			const zeile = el("p", { class: "rl" });
			const vor = knopf("4 Scheiben vorführen", () => {
				clearInterval(laeuft);
				setz(4);
				const plan = [];
				(function zieh(k, von, nach, frei) {
					if (k === 0) return;
					zieh(k - 1, von, frei, nach);
					plan.push([von, nach, k]);
					zieh(k - 1, frei, nach, von);
				})(4, 0, 2, 1);
				let i = 0;
				laeuft = 1; male();
				laeuft = setInterval(() => {
					const [a, b, k] = plan[i++];
					staebe[b].push(staebe[a].pop()); zuege++;
					status.sag(i <= 7 ? `Zug ${i}: Erst muss der Turm aus 3 Scheiben in die Mitte. Das kannst du schon.` : i === 8 ? "Zug 8: Die größte Scheibe wandert nach rechts. Ein einziger Zug." : `Zug ${i}: Jetzt der Turm aus 3 Scheiben obendrauf. Wieder dieselbe Aufgabe.`);
					if (i === plan.length) {
						clearInterval(laeuft); laeuft = null;
						if (!auf.ok(1)) auf.ab(1);
						status.sag("15 Züge: 7 für den kleinen Turm, 1 für die große Scheibe, 7 für den kleinen Turm. Die Lösung für 4 besteht aus zweimal der Lösung für 3.", "gut");
						api.fertig("Du hast gesehen, wie sich die Aufgabe selbst enthält.");
					}
					male();
				}, RUHIG ? 250 : 650);
			});
			vor.hidden = true;
			const neuK = knopf("Neu aufbauen", () => { clearInterval(laeuft); laeuft = null; setz(3); status.sag("Drei Scheiben, von vorn."); }, "leise");
			const leiste = el("div", { class: "zeile" });
			leiste.append(vor, neuK);
			api.feld.append(auf.el, feld, zeile, leiste, status);
			setz(3);
		},
		warum: `<p>Die Lösung für n Scheiben hat drei Schritte. Bring den Turm aus n − 1 Scheiben auf den freien Stab. Leg die größte Scheibe ans Ziel. Bring den Turm aus n − 1 Scheiben obendrauf. Für den ersten und dritten Schritt gilt dieselbe Anleitung noch einmal, nur mit einer Scheibe weniger, bis irgendwann gar keine Scheibe mehr übrig ist. Das ist <b>Rekursion</b>: eine Anleitung, die sich selbst aufruft.</p>
			<pre><code>def zieh(n, von, nach, frei):
    if n == 0:
        return  # kleinster Fall
    zieh(n - 1, von, frei, nach)
    lege_scheibe(n, von, nach)
    zieh(n - 1, frei, nach, von)</code></pre>
			<p>Sechs Zeilen lösen den Turm für jede Höhe. Damit die Maschine nicht den Faden verliert, legt sie bei jedem Aufruf einen Merkzettel auf einen Stapel, genau die Datenstruktur aus dem letzten Baustein.</p>
			<p class="formel">Züge für n Scheiben = 2 · (Züge für n − 1) + 1 = 2<sup>n</sup> − 1</p>
			<p>Die Zahl der Züge verdoppelt sich mit jeder Scheibe. Bei 64 Scheiben wären es 18 Trillionen. Bei einem Zug pro Sekunde dauert das 585 Milliarden Jahre. Auch das gehört zur Informatik: Manche Aufgaben sind leicht zu beschreiben und trotzdem für jeden Rechner zu groß.</p>
			<p>Mergesort aus dem Sortier-Baustein funktioniert genauso: Sortiere die linke Hälfte, sortiere die rechte Hälfte, misch beide zusammen.</p>`,
		merke: "Rekursion führt ein Problem auf eine kleinere Ausgabe desselben Problems zurück. Sie braucht einen kleinsten Fall, bei dem Schluss ist.",
		quiz: { f: "Wie viele Züge braucht die kürzeste Lösung für 5 Scheiben?", a: ["10", "25", "31", "32"], r: 2, e: "2 · 15 + 1 = 31, also 2⁵ − 1." },
	});

	// ---------- U14 Graphen ----------
	PL.stufe({
		id: "graphen", zone: 1, name: "Graphen und Wege", kurz: "Der kürzeste Weg durchs Netz",
		frage: `<p>Straßenkarten, Schienennetze, Freundschaften, Links im Internet: Vieles besteht aus Punkten und Verbindungen dazwischen. Informatiker nennen so etwas einen <b>Graphen</b>. Die Punkte heißen Knoten, die Verbindungen Kanten.</p>
			<p>Auf dieser Platine steht an jeder Leiterbahn ihre Länge. Finde den kürzesten Weg von <b>S</b> nach <b>Z</b>. Tippe die Knoten der Reihe nach an.</p>`,
		bau(api) {
			const auf = auftraege(["Finde den kürzesten Weg von S nach Z.", "Sieh zu, wie die Maschine ihn findet."]);
			const K = { S: [26, 120], A: [100, 46], B: [100, 194], C: [170, 120], D: [240, 46], E: [240, 194], Z: [304, 120] };
			const KANTEN = [["S", "A", 4], ["S", "B", 7], ["A", "C", 2], ["A", "D", 9], ["B", "C", 3], ["B", "E", 4], ["C", "D", 6], ["C", "E", 3], ["D", "Z", 3], ["E", "Z", 8]];
			const laenge = (a, b) => (KANTEN.find((k) => (k[0] === a && k[1] === b) || (k[0] === b && k[1] === a)) || [])[2];
			const svg = sv("svg", { viewBox: "0 0 330 240", class: "graph", role: "group", "aria-label": "Graph mit sieben Knoten" });
			const kEl = {}, nEl = {}, dEl = {};
			KANTEN.forEach(([a, b, w]) => {
				const l = sv("line", { x1: K[a][0], y1: K[a][1], x2: K[b][0], y2: K[b][1], class: "kante" }, svg);
				kEl[a + b] = kEl[b + a] = l;
				const mx = (K[a][0] + K[b][0]) / 2, my = (K[a][1] + K[b][1]) / 2;
				sv("circle", { cx: mx, cy: my, r: 9, class: "kw-bg" }, svg);
				const t = sv("text", { x: mx, y: my + 1, class: "kw" }, svg); t.textContent = w;
			});
			for (const n in K) {
				const g = sv("g", { class: "knoten", tabindex: 0, role: "button" }, svg);
				sv("circle", { cx: K[n][0], cy: K[n][1], r: 16 }, g);
				const t = sv("text", { x: K[n][0], y: K[n][1] + 1 }, g); t.textContent = n;
				const d = sv("text", { x: K[n][0], y: K[n][1] + (K[n][1] > 150 ? 32 : -24), class: "dist" }, svg);
				g.addEventListener("click", () => tipp(n));
				g.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); tipp(n); } });
				nEl[n] = g; dEl[n] = d;
			}
			const status = meld();
			const info = el("p", { class: "rl" });
			let weg = ["S"], modus = "selbst";
			const summe = () => weg.slice(1).reduce((s, n, i) => s + laenge(weg[i], n), 0);
			function male() {
				for (const k in kEl) kEl[k].classList.remove("an", "fest");
				for (const n in nEl) { nEl[n].classList.toggle("an", weg.includes(n)); nEl[n].setAttribute("aria-label", `Knoten ${n}${weg.includes(n) ? ", liegt auf deinem Weg" : ""}`); }
				weg.slice(1).forEach((n, i) => kEl[weg[i] + n].classList.add("an"));
				info.textContent = `Dein Weg: ${weg.join(" → ")} · Länge ${summe()}`;
			}
			function tipp(n) {
				if (modus !== "selbst") return;
				const letzter = weg.at(-1);
				if (n === letzter && weg.length > 1) { weg.pop(); status.sag("Einen Schritt zurück."); }
				else if (weg.includes(n)) { status.sag("Dort warst du schon. Tippe den letzten Knoten an, um einen Schritt zurückzugehen."); return; }
				else if (!laenge(letzter, n)) { status.sag(`Von ${letzter} führt keine Leiterbahn direkt nach ${n}.`, "schlecht"); return; }
				else { weg.push(n); status.sag(`${letzter} → ${n}, das sind ${laenge(letzter, n)}.`); }
				male();
				if (weg.at(-1) === "Z") {
					const s = summe();
					if (s === 15) {
						auf.ab(0);
						status.sag("Länge 15. Kürzer geht es nicht. Aber woher weißt du das sicher? Du müsstest alle Wege prüfen. Die Maschine hat dafür ein Verfahren.", "gut");
						dk.hidden = false;
					} else status.sag(`Angekommen mit Länge ${s}. Es gibt einen kürzeren Weg. Der Weg mit den wenigsten Stationen ist nicht immer der kürzeste.`, "schlecht");
				}
			}
			const neuK = knopf("Weg löschen", () => { if (modus !== "selbst") return; weg = ["S"]; male(); status.sag("Start bei S."); }, "leise");

			// Dijkstra Schritt für Schritt
			let dist, festN, vorg;
			const dk = knopf("Maschine: nächster Schritt", () => {
				if (modus === "selbst") {
					modus = "dijkstra"; weg = [];
					for (const k in kEl) kEl[k].classList.remove("an");
					for (const n in nEl) nEl[n].classList.remove("an");
					dist = { S: 0 }; festN = new Set(); vorg = {};
					for (const n in K) dEl[n].textContent = n === "S" ? "0" : "∞";
					info.textContent = "Über jedem Knoten steht die kürzeste bisher bekannte Strecke ab S.";
					status.sag("Die Maschine kennt am Anfang nur einen Wert sicher: Von S nach S sind es 0. Alle anderen Knoten gelten als unerreichbar weit.");
					neuK.hidden = true;
					return;
				}
				let u = null;
				for (const n in dist) if (!festN.has(n) && (u === null || dist[n] < dist[u])) u = n;
				if (u === null) return;
				festN.add(u);
				nEl[u].classList.add("fest");
				if (vorg[u]) kEl[vorg[u] + u].classList.add("fest");
				const neu = [];
				KANTEN.forEach(([a, b, w]) => {
					const v = a === u ? b : b === u ? a : null;
					if (!v || festN.has(v)) return;
					if (dist[v] === undefined || dist[u] + w < dist[v]) { dist[v] = dist[u] + w; vorg[v] = u; neu.push(`${v} = ${dist[v]}`); dEl[v].textContent = dist[v]; }
				});
				if (u === "Z") {
					const pfad = ["Z"];
					while (vorg[pfad[0]]) pfad.unshift(vorg[pfad[0]]);
					for (const k in kEl) kEl[k].classList.remove("fest");
					pfad.slice(1).forEach((n, i) => kEl[pfad[i] + n].classList.add("an"));
					status.sag(`Z steht fest mit Länge ${dist.Z}. Der Weg: ${pfad.join(" → ")}. Die Maschine hat keinen einzigen Weg ausprobiert. Sie hat nur sechsmal den nächstgelegenen Knoten festgeschrieben.`, "gut");
					dk.disabled = true;
					if (!auf.ok(1)) auf.ab(1);
					api.fertig("Du und die Maschine habt denselben kürzesten Weg gefunden.");
				} else status.sag(`<b>${u}</b> ist der nächste noch offene Knoten (Strecke ${dist[u]}). Näher kommt man nicht mehr heran, also steht er fest. ${neu.length ? "Von dort aus verbessert: " + neu.join(", ") + "." : "Von dort aus wird nichts kürzer."}`);
			});
			dk.hidden = true;
			const leiste = el("div", { class: "zeile" });
			leiste.append(dk, neuK);
			api.feld.append(auf.el, svg, info, leiste, status);
			male();
			status.sag("Start bei S. Tippe einen Nachbarknoten an.");
		},
		warum: `<p>Das Verfahren der Maschine stammt von Edsger Dijkstra aus dem Jahr 1956. Die Idee: Unter allen Knoten, deren Strecke noch nicht feststeht, nimm den mit der kürzesten bekannten Strecke. Zu ihm kann es keinen kürzeren Weg mehr geben, denn jeder Umweg müsste über einen Knoten führen, der schon jetzt weiter weg ist. Also schreib ihn fest und schau, ob seine Nachbarn über ihn schneller erreichbar sind.</p>
			<p>Das wiederholt sich, bis das Ziel feststeht. Die Maschine muss dabei nie alle Wege aufzählen. Bei sieben Knoten wäre das noch möglich, bei den Millionen Kreuzungen einer Landkarte nicht. Dort gibt es mehr mögliche Wege als Atome im Weltall. Dijkstras Verfahren (mit ein paar Verfeinerungen) rechnet die Route trotzdem in Sekundenbruchteilen aus. Jedes Navi arbeitet so.</p>
			<p>Graphen stecken überall. Im Internet sind die Router die Knoten. In sozialen Netzen sind es Menschen. Auf einer Platine sind es die Bauteile, und die Leiterbahnen sind die Kanten. Welche Seite eine Suchmaschine zuerst zeigt, ist eine Frage an den Graphen aller Links.</p>`,
		merke: "Ein Graph besteht aus Knoten und Kanten. Dijkstra findet den kürzesten Weg, indem er immer den nächstgelegenen offenen Knoten festschreibt.",
		quiz: { f: "Warum darf Dijkstras Verfahren den nächstgelegenen offenen Knoten sofort festschreiben?", a: ["Weil er die wenigsten Nachbarn hat", "Weil jeder andere Weg dorthin über einen Knoten führen müsste, der schon weiter entfernt ist", "Weil er im Alphabet zuerst kommt", "Weil die Maschine vorher alle Wege durchprobiert hat"], r: 1, e: "Ein Umweg über etwas Entfernteres kann nicht kürzer sein, solange keine Kante eine negative Länge hat." },
	});
})();
