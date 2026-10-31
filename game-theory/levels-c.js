// Level 11 bis 15: Spielbaum mit Drohung, Zweitpreisauktion, Ultimatum, Evolution, Schatten der Zukunft.

(() => {
	const { register, mission, fit, animate, foe, $, $$, fmt, reduced } = window.Arcade;

	// ---------- Level 11: Der Platzhirsch, Spielbaum und Rückwärtsinduktion ----------
	register(11, (sec, n) => {
		const svg = $("#treeSvg", sec);
		const screen = $("#trScreen", sec);
		const btnC = $("#trContract", sec);
		let contract = false;
		let path = null; // "out" | "fight" | "share"
		let solved = false;
		const okNormal = { v: false };
		const okContract = { v: false };
		// Auszahlungen [Neuling, Platzhirsch]
		const P = () => ({ out: [0, 10], fight: [-3, -1], share: [4, contract ? -3 : 5] });
		const best = () => (P().fight[1] > P().share[1] ? "fight" : "share");

		function draw() {
			const p = P();
			const b = best();
			const on = (k) => path === k || (path === "in" && false);
			const sol = (k) => solved && ((k === "share" || k === "fight") ? b === k : k === "in" ? p[b][0] > 0 : p[b][0] <= 0);
			const edge = (x1, y1, x2, y2, key, label, lx, ly) => {
				const active = on(key) || (key === "in" && (path === "fight" || path === "share"));
				const stroke = active ? "#ffb020" : sol(key) ? "#1fbf7a" : "#ddd3f0";
				return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${active || sol(key) ? 5 : 3}" />
					<text x="${lx}" y="${ly}" fill="#5c5580" font-size="22" text-anchor="middle" font-family="Nunito, sans-serif">${label}</text>`;
			};
			const leaf = (x, y, pay, key) =>
				`<rect x="${x - 70}" y="${y}" width="140" height="54" rx="8" fill="${path === key ? "rgba(255,176,32,0.18)" : "#ffffff"}" stroke="${path === key ? "#ffb020" : "#ddd3f0"}" stroke-width="2" />
				<text x="${x - 34}" y="${y + 35}" fill="#2f7cf6" font-size="20" text-anchor="middle" font-family="Fredoka, sans-serif">${fmtN(pay[0])}</text>
				<text x="${x}" y="${y + 35}" fill="#8a84a8" font-size="20" text-anchor="middle">|</text>
				<text x="${x + 34}" y="${y + 35}" fill="#ff5d73" font-size="20" text-anchor="middle" font-family="Fredoka, sans-serif">${fmtN(pay[1])}</text>`;
			const node = (x, y, color, label) =>
				`<circle cx="${x}" cy="${y}" r="26" fill="${color}" /><text x="${x}" y="${y + 7}" font-size="18" text-anchor="middle" fill="#ffffff" font-weight="700" font-family="Nunito, sans-serif">${label}</text>`;
			svg.innerHTML = `
				${edge(260, 40, 110, 150, "out", "draußen", 135, 85)}
				${edge(260, 40, 420, 150, "in", "eröffnen", 395, 80)}
				${edge(420, 150, 300, 260, "fight", "Preiskampf", 300, 205)}
				${edge(420, 150, 525, 260, "share", "teilen", 528, 205)}
				${node(260, 40, "#2f7cf6", "Du")}
				${node(420, 150, "#ff5d73", "PH")}
				${leaf(110, 165, p.out, "out")}
				${leaf(290, 272, p.fight, "fight")}
				${leaf(520, 272, p.share, "share")}
				${contract ? `<text x="560" y="140" fill="#ffb020" font-size="20" text-anchor="end" font-family="Nunito, sans-serif">📜 Strafe 8</text>` : ""}
				<text x="8" y="365" fill="#5c5580" font-size="19" font-family="Nunito, sans-serif">links: du · rechts: Platzhirsch (PH)</text>`;
		}
		const fmtN = (v) => (v < 0 ? `−${-v}` : String(v));

		function enter() {
			const b = best();
			path = b;
			const p = P();
			screen.innerHTML = `Du eröffnest. Der Platzhirsch wählt <b class="opp">${b === "share" ? "Teilen" : "Preiskampf"}</b>, weil ${
				b === "share" ? `5 für ihn mehr ist als −1` : `−1 für ihn besser ist als −3 mit Vertragsstrafe`
			}. Ergebnis: ${fmtN(p[b][0])} für dich.`;
			foe(n).say(b === "share" ? "Na gut … dann teilen wir eben." : "Preiskampf! Ich hab's ja gesagt.", b === "share" ? "sad" : "angry");
			check(p[b][0] > 0);
			draw();
		}
		function stay() {
			path = "out";
			screen.innerHTML = `Du bleibst draußen: 0 für dich, 10 für den Platzhirsch. ${
				contract ? "Mit dem Vertrag war das klug." : "Hättest du ihm die Drohung wirklich glauben sollen?"
			}`;
			foe(n).say("Mein Markt bleibt meiner!", "happy");
			check(P()[best()][0] <= 0);
			draw();
		}
		function check(right) {
			if (!right) return;
			(contract ? okContract : okNormal).v = true;
			if (okNormal.v && okContract.v) {
				screen.innerHTML += " Beide Welten richtig gelöst!";
				mission(n);
			} else {
				screen.innerHTML += contract ? " Jetzt probier es ohne Vertrag." : " Jetzt schalte den Vertrag ein.";
			}
		}
		$("#trIn", sec).addEventListener("click", enter);
		$("#trOut", sec).addEventListener("click", stay);
		$("#trSolve", sec).addEventListener("click", () => {
			solved = true;
			path = null;
			const b = best();
			const p = P();
			screen.innerHTML = `Rückwärts: Unten wählt der Platzhirsch <b class="opp">${b === "share" ? "Teilen" : "Preiskampf"}</b> (${fmtN(
				p.share[1]
			)} gegen ${fmtN(p.fight[1])}). Also bringt Eröffnen dir ${fmtN(p[b][0])}, Draußenbleiben 0. Die grünen Linien zeigen das Ergebnis.`;
			draw();
		});
		btnC.addEventListener("click", () => {
			contract = !contract;
			btnC.setAttribute("aria-pressed", String(contract));
			foe(n).say(contract ? "Unterschrieben! Jetzt muss ich kämpfen." : "Kein Vertrag. Aber ich meine es ernst!", "smug");
			path = null;
			solved = false;
			screen.textContent = contract
				? "Der Platzhirsch hat einen Vertrag unterschrieben: Lässt er einen Neuling ohne Preiskampf herein, zahlt er 8 Strafe."
				: "Kein Vertrag. Der Platzhirsch droht nur mit Worten.";
			draw();
		});
		screen.textContent = "Der Platzhirsch droht mit Preiskampf. Eröffnest du?";
		draw();
	});

	// ---------- Level 12: Zweitpreisauktion ----------
	register(12, (sec, n) => {
		let value = 0;
		let sum = 0;
		let count = 0;
		const bidIn = $("#aucBid", sec);
		const screen = $("#aucScreen", sec);
		const newValue = () => {
			value = 20 + Math.floor(Math.random() * 81);
			$("#aucValue", sec).innerHTML = `Der goldene Joystick ist dir <b class="you">${value} Münzen</b> wert. Drei Bots bieten mit. Was sie bieten, siehst du erst danach.`;
		};
		bidIn.addEventListener("input", () => ($("#aucBidOut", sec).textContent = bidIn.value));
		$("#aucGo", sec).addEventListener("click", () => {
			const bid = Number(bidIn.value);
			const bots = [0, 0, 0].map(() => Math.floor(Math.random() * 101));
			const top = Math.max(...bots);
			const win = bid > top;
			const gain = win ? value - top : 0;
			sum += gain;
			count++;
			screen.innerHTML = `Gebote der Bots: <b class="opp">${bots.join(", ")}</b>. ${
				win
					? `Du gewinnst mit ${bid} und zahlst das zweithöchste Gebot: ${top}. Gewinn: dein Wert ${value} − ${top} = <b class="${gain >= 0 ? "you" : "opp"}">${fmtN(gain)}</b>.${gain < 0 ? " Autsch, mehr bezahlt, als er dir wert ist." : ""}`
					: `Ein Bot gewinnt mit ${top}. Dein Wert war ${value}.${top < value ? ` Schade: Mit einem Gebot von ${value} hättest du für ${top} gewonnen und ${value - top} verdient.` : " Gut so, das wäre zu teuer gewesen."}`
			}`;
			foe(n).say(...(win ? (gain < 0 ? ["Hehe, zu teuer bezahlt!", "smug"] : ["Glückwunsch zum Joystick.", "sad"]) : ["Unser Joystick!", "happy"]));
			$("#aucSum", sec).textContent = fmtN(sum);
			$("#aucN", sec).textContent = count;
			newValue();
		});
		const fmtN = (v) => (v < 0 ? `−${-v}` : String(v));
		newValue();

		// Simulator mit festem Zufall, damit die Kurve ruhig steht
		let seed = 7;
		const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
		const N = 4000;
		const sims = Array.from({ length: N }, () => [rnd() * 100, Math.max(rnd(), rnd(), rnd()) * 100]);
		const profit = (f) => sims.reduce((s, [v, top]) => s + (f * v > top ? v - top : 0), 0) / N;
		const fs = [];
		for (let f = 0.4; f <= 1.6001; f += 0.02) fs.push([f, profit(f)]);
		const fIn = $("#aucF", sec);
		const simScreen = $("#aucSim", sec);
		const cv = fit($("#aucCv", sec), (w) => (w < 520 ? 200 : 230), (ctx, w, h) => {
			ctx.clearRect(0, 0, w, h);
			const pad = { l: 36, r: 12, t: 14, b: 28 };
			const maxP = 6;
			const minP = -1;
			const X = (f) => pad.l + ((f - 0.4) / 1.2) * (w - pad.l - pad.r);
			const Y = (p) => pad.t + ((maxP - p) / (maxP - minP)) * (h - pad.t - pad.b);
			ctx.font = "11px 'Nunito', sans-serif";
			ctx.textAlign = "right";
			for (let p = -1; p <= 6; p++) {
				ctx.strokeStyle = p === 0 ? "rgba(43,35,80,0.25)" : "rgba(43,35,80,0.08)";
				ctx.beginPath();
				ctx.moveTo(pad.l, Y(p));
				ctx.lineTo(w - pad.r, Y(p));
				ctx.stroke();
				if (p % 2 === 0) {
					ctx.fillStyle = "rgba(43,35,80,0.6)";
					ctx.fillText(String(p), pad.l - 6, Y(p) + 4);
				}
			}
			ctx.textAlign = "center";
			[0.5, 1, 1.5].forEach((f) => ctx.fillText(`× ${fmt(f, 1)}`, X(f), h - 8));
			ctx.strokeStyle = "rgba(255,176,32,0.5)";
			ctx.setLineDash([4, 4]);
			ctx.beginPath();
			ctx.moveTo(X(1), pad.t);
			ctx.lineTo(X(1), h - pad.b);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.strokeStyle = "#2f7cf6";
			ctx.lineWidth = 3;
			ctx.beginPath();
			fs.forEach(([f, p], i) => (i ? ctx.lineTo(X(f), Y(p)) : ctx.moveTo(X(f), Y(p))));
			ctx.stroke();
			const f = Number(fIn.value) / 100;
			ctx.fillStyle = "#2b2350";
			ctx.beginPath();
			ctx.arc(X(f), Y(profit(f)), 7, 0, Math.PI * 2);
			ctx.fill();
		});
		const updSim = () => {
			const f = Number(fIn.value) / 100;
			$("#aucFOut", sec).textContent = fmt(f);
			simScreen.innerHTML = `Bietest du immer das ${fmt(f)}-fache deines Werts, verdienst du im Schnitt <b class="you">${fmt(
				profit(f)
			)} Münzen</b> pro Auktion.${
				f < 0.95 ? " Du verlierst zu oft Auktionen, die sich gelohnt hätten." : f > 1.05 ? " Du gewinnst zu oft Auktionen, bei denen du draufzahlst." : " Genau dein Wert: besser geht es nicht."
			}`;
			if (f >= 0.95 && f <= 1.05) mission(n);
			cv.redraw();
		};
		fIn.addEventListener("input", updSim);
		updSim();
	});

	// ---------- Level 13: Ultimatum ----------
	register(13, (sec, n) => {
		const offerIn = $("#ultOffer", sec);
		const screen = $("#ultScreen", sec);
		const strip = $("#ultStrip", sec);
		let thresholds;
		let k;
		let sum;
		const reset = () => {
			thresholds = [1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
			k = 0;
			sum = 0;
			strip.innerHTML = "";
			$("#ultGo", sec).disabled = false;
			$("#ultWho", sec).textContent = "Person 1 von 5";
			$("#ultSum", sec).textContent = 0;
		};
		const updOffer = () => {
			const v = Number(offerIn.value);
			$("#ultOut", sec).textContent = `${v} ${v === 1 ? "Münze" : "Münzen"} (du behältst ${10 - v})`;
		};
		offerIn.addEventListener("input", updOffer);
		$("#ultGo", sec).addEventListener("click", () => {
			if (k >= 5) return;
			const v = Number(offerIn.value);
			const ok = v >= thresholds[k];
			if (ok) sum += 10 - v;
			const i = document.createElement("i");
			i.className = ok ? "w" : "l";
			i.textContent = ok ? "✓" : "✗";
			i.title = ok ? "angenommen" : "abgelehnt";
			strip.appendChild(i);
			screen.innerHTML = ok
				? `Person ${k + 1} nimmt an: ${v} für sie, <b class="you">${10 - v} für dich</b>.`
				: `Person ${k + 1} lehnt ab: „${v === 0 ? "Gar nichts? Vergiss es." : "So wenig? Dann bekommst du auch nichts."}“ Beide gehen leer aus.`;
			foe(n).say(ok ? "Das ist fair, abgemacht!" : "So wenig? Nein danke!", ok ? "happy" : "angry");
			k++;
			$("#ultSum", sec).textContent = sum;
			if (k === 5) {
				$("#ultGo", sec).disabled = true;
				$("#ultWho", sec).textContent = "Runde vorbei";
				screen.innerHTML += ` <br>Ergebnis: ${sum} Münzen. Die Schmerzgrenzen waren ${thresholds.join(", ")}.`;
				if (sum >= 24) mission(n);
			} else {
				$("#ultWho", sec).textContent = `Person ${k + 1} von 5`;
			}
		});
		$("#ultReset", sec).addEventListener("click", () => {
			reset();
			screen.textContent = "Fünf neue Personen. Stell dein Angebot ein.";
		});

		// Rollentausch
		let offer = 0;
		const role = $("#ultRole", sec);
		const acc = $("#ultAcc", sec);
		const rej = $("#ultRej", sec);
		const nextOffer = () => {
			offer = 1 + Math.floor(Math.random() * 4);
			role.innerHTML = `Ein Bot hat 10 Münzen und bietet dir <b class="you">${offer}</b>. Er behält <b class="opp">${10 - offer}</b>. Nimmst du an?`;
			acc.disabled = rej.disabled = false;
		};
		acc.addEventListener("click", () => {
			role.innerHTML = `Angenommen: ${offer} für dich, ${10 - offer} für den Bot. Rein rechnerisch die richtige Wahl.`;
			acc.disabled = rej.disabled = true;
		});
		rej.addEventListener("click", () => {
			role.innerHTML = `Abgelehnt: Ihr bekommt beide 0. Du hast ${offer} ${offer === 1 ? "Münze" : "Münzen"} bezahlt, damit der Bot seine ${10 - offer} nicht bekommt. Das tun echte Menschen ständig.`;
			acc.disabled = rej.disabled = true;
		});
		$("#ultNext", sec).addEventListener("click", nextOffer);
		reset();
		updOffer();
		nextOffer();
	});

	// ---------- Level 14: Evolution der Kooperation ----------
	register(14, (sec, n) => {
		// Punkte nach 10 Runden: Zeile gegen Spalte; Reihenfolge Lamm, Hai, Spiegel
		const P = [
			[30, 0, 30],
			[50, 10, 14],
			[30, 9, 30],
		];
		const COL = ["#b49ce8", "#ff5d73", "#2f7cf6"];
		const NAMES = ["Lämmer", "Haie", "Spiegel"];
		const G = 60;
		const ins = ["#evoA", "#evoB", "#evoC"].map((s) => $(s, sec));
		const outs = ["#evoAO", "#evoBO", "#evoCO"].map((s) => $(s, sec));
		const screen = $("#evoScreen", sec);
		let hist = [];
		let shown = 0;
		let running = false;
		const start = () => {
			const raw = ins.map((i) => Number(i.value));
			const tot = raw.reduce((a, b) => a + b, 0) || 1;
			return raw.map((v) => v / tot);
		};
		const simulate = (x0) => {
			const h = [x0];
			let x = x0;
			for (let g = 0; g < G; g++) {
				const f = P.map((row) => row.reduce((s, v, j) => s + v * x[j], 0));
				const avg = f.reduce((s, v, i) => s + v * x[i], 0) || 1;
				x = x.map((v, i) => (v * f[i]) / avg);
				h.push(x);
			}
			return h;
		};
		const cv = fit($("#evoCv", sec), (w) => (w < 520 ? 220 : 260), (ctx, w, h) => {
			ctx.clearRect(0, 0, w, h);
			const pad = { l: 38, r: 12, t: 30, b: 26 };
			const X = (g) => pad.l + (g / G) * (w - pad.l - pad.r);
			const Y = (v) => pad.t + (1 - v) * (h - pad.t - pad.b);
			ctx.font = "11px 'Nunito', sans-serif";
			ctx.textAlign = "right";
			for (let v = 0; v <= 1.001; v += 0.25) {
				ctx.strokeStyle = "rgba(43,35,80,0.08)";
				ctx.beginPath();
				ctx.moveTo(pad.l, Y(v));
				ctx.lineTo(w - pad.r, Y(v));
				ctx.stroke();
				ctx.fillStyle = "rgba(43,35,80,0.6)";
				ctx.fillText(`${Math.round(v * 100)} %`, pad.l - 6, Y(v) + 4);
			}
			ctx.textAlign = "center";
			ctx.fillText("Generationen →", w / 2, h - 6);
			const data = hist.length ? hist.slice(0, shown + 1) : [start()];
			for (let i = 0; i < 3; i++) {
				ctx.strokeStyle = COL[i];
				ctx.lineWidth = 3;
				ctx.beginPath();
				data.forEach((x, g) => (g ? ctx.lineTo(X(g), Y(x[i])) : ctx.moveTo(X(g), Y(x[i]))));
				ctx.stroke();
				const last = data[data.length - 1];
				ctx.fillStyle = COL[i];
				ctx.beginPath();
				ctx.arc(X(data.length - 1), Y(last[i]), 4, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.textAlign = "left";
			NAMES.forEach((nm, i) => {
				ctx.fillStyle = COL[i];
				ctx.fillText(`● ${nm}`, pad.l + i * 74, 14);
			});
		});
		const pct = (v) => `${Math.round(v * 100)} %`;
		const report = () => {
			const s = hist[0];
			const e = hist[hist.length - 1];
			const peakHai = Math.max(...hist.map((x) => x[1]));
			const win = e.indexOf(Math.max(...e));
			screen.innerHTML = `Nach ${G} Generationen: Lämmer ${pct(e[0])}, Haie ${pct(e[1])}, Spiegel ${pct(e[2])}. ${
				peakHai > s[1] + 0.05 && peakHai > e[1] + 0.05 ? `Die Haie wuchsen zuerst bis auf ${pct(peakHai)}. ` : ""
			}Es setzen sich die <b style="color:${COL[win]}">${NAMES[win]}</b> durch.`;
			foe(n).say(...(win === 2 ? ["Faszinierend: Die Spiegel übernehmen!", "wow"] : win === 1 ? ["Die Haie fressen alles leer …", "sad"] : ["Hm, interessant.", "neutral"]));
			if (s[2] <= 0.1 + 1e-9 && e[2] > 0.5) {
				screen.innerHTML += " Aus einer kleinen Insel ist eine Mehrheit geworden!";
				mission(n);
			}
		};
		const run = () => {
			if (running) return;
			hist = simulate(start());
			running = true;
			if (reduced) {
				shown = G;
				cv.redraw();
				running = false;
				report();
				return;
			}
			animate(
				3,
				(k) => {
					shown = Math.round(k * G);
					cv.redraw();
				},
				() => {
					running = false;
					report();
				}
			);
		};
		const syncOut = () => {
			const x = start();
			outs.forEach((o, i) => (o.textContent = `${Math.round(x[i] * 100)} %`));
			hist = [];
			shown = 0;
			cv.redraw();
		};
		ins.forEach((i) => i.addEventListener("input", syncOut));
		$$("[data-preset]", sec).forEach((b) =>
			b.addEventListener("click", () => {
				b.dataset.preset.split(",").forEach((v, i) => (ins[i].value = v));
				syncOut();
				run();
			})
		);
		$("#evoGo", sec).addEventListener("click", run);
		syncOut();
	});

	// ---------- Level 15: Schatten der Zukunft ----------
	register(15, (sec, n) => {
		const dIn = $("#longD", sec);
		const screen = $("#longScreen", sec);
		const honest = (d) => 3 / (1 - d);
		const cheat = (d) => 5 + d / (1 - d);
		const cv = fit($("#longCv", sec), (w) => (w < 520 ? 220 : 250), (ctx, w, h) => {
			ctx.clearRect(0, 0, w, h);
			const pad = { l: 36, r: 12, t: 14, b: 28 };
			const maxD = 0.95;
			const maxV = 40;
			const X = (d) => pad.l + (d / maxD) * (w - pad.l - pad.r);
			const Y = (v) => pad.t + (1 - Math.min(v, maxV) / maxV) * (h - pad.t - pad.b);
			ctx.font = "11px 'Nunito', sans-serif";
			ctx.textAlign = "right";
			for (let v = 0; v <= maxV; v += 10) {
				ctx.strokeStyle = "rgba(43,35,80,0.08)";
				ctx.beginPath();
				ctx.moveTo(pad.l, Y(v));
				ctx.lineTo(w - pad.r, Y(v));
				ctx.stroke();
				ctx.fillStyle = "rgba(43,35,80,0.6)";
				ctx.fillText(String(v), pad.l - 6, Y(v) + 4);
			}
			ctx.textAlign = "center";
			[0, 0.25, 0.5, 0.75].forEach((d) => ctx.fillText(`${d * 100} %`, X(d), h - 8));
			// Bereich, in dem Ehrlichkeit gewinnt
			ctx.fillStyle = "rgba(31,191,122,0.1)";
			ctx.fillRect(X(0.5), pad.t, X(maxD) - X(0.5), h - pad.t - pad.b);
			const line = (f, color) => {
				ctx.strokeStyle = color;
				ctx.lineWidth = 3;
				ctx.beginPath();
				for (let i = 0; i <= 190; i++) {
					const d = (i / 190) * maxD;
					i ? ctx.lineTo(X(d), Y(f(d))) : ctx.moveTo(X(d), Y(f(d)));
				}
				ctx.stroke();
			};
			line(honest, "#1fbf7a");
			line(cheat, "#ff5d73");
			const d = Number(dIn.value) / 100;
			[
				[honest(d), "#1fbf7a"],
				[cheat(d), "#ff5d73"],
			].forEach(([v, c]) => {
				ctx.fillStyle = c;
				ctx.beginPath();
				ctx.arc(X(d), Y(v), 6, 0, Math.PI * 2);
				ctx.fill();
			});
			ctx.textAlign = "left";
			ctx.fillStyle = "#1fbf7a";
			ctx.fillText("● immer ehrlich", pad.l + 8, pad.t + 12);
			ctx.fillStyle = "#ff5d73";
			ctx.fillText("● einmal betrügen", pad.l + 120, pad.t + 12);
		});
		const upd = () => {
			const d = Number(dIn.value) / 100;
			$("#longOut", sec).textContent = `${dIn.value} %`;
			const rounds = 1 / (1 - d);
			const h = honest(d);
			const c = cheat(d);
			screen.innerHTML = `Ihr spielt im Schnitt ${fmt(rounds, 1)} Runden. Ehrlich: <b style="color:var(--good)">${fmt(h, 1)}</b> Punkte. Einmal betrügen: <b class="opp">${fmt(
				c,
				1
			)}</b> Punkte. ${h > c + 1e-9 ? "Ehrlichkeit lohnt sich." : h + 1e-9 >= c ? "Genau gleich: die Grenze!" : "Hier lohnt sich Betrug."}`;
			foe(n).say(...(h > c + 1e-9 ? ["Bleib ehrlich, dann bleib ich auch.", "happy"] : h + 1e-9 >= c ? ["Genau auf der Kippe!", "wow"] : ["Kurze Spiele locken Betrüger …", "sad"]));
			if (Math.abs(d - 0.5) < 1e-9) mission(n, "Grenze gefunden: 50 %! +1 ★");
			cv.redraw();
		};
		dIn.addEventListener("input", upd);
		upd();
	});
})();
