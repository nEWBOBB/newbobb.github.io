// Level 1 bis 5: Schere-Stein-Papier, Auszahlungsmatrix, Dominanz, Nash-Gleichgewicht, Gefangenendilemma.

(() => {
	const { register, mission, matrix, fit, $, $$ } = window.Arcade;
	const SYM = ["✊", "✋", "✌️"];
	const NAME = ["Stein", "Papier", "Schere"];

	// ---------- Level 1: Rocky zählt durch ----------
	register(1, (sec, n) => {
		let round = 0;
		let you = 0;
		let opp = 0;
		const screen = $("#rpsScreen", sec);
		const strip = $("#rpsStrip", sec);
		const btns = $$("[data-move]", sec);
		const upd = () => {
			$("#rpsYou", sec).textContent = you;
			$("#rpsOpp", sec).textContent = opp;
			$("#rpsRound", sec).textContent = round;
			btns.forEach((b) => (b.disabled = round >= 10));
		};
		btns.forEach((b) =>
			b.addEventListener("click", () => {
				if (round >= 10) return;
				const me = Number(b.dataset.move);
				const rocky = round % 3; // Stein, Papier, Schere, …
				round++;
				// a schlägt b, wenn a = b + 1 (mod 3): Papier schlägt Stein, Schere schlägt Papier, Stein schlägt Schere
				const res = me === rocky ? 0 : me === (rocky + 1) % 3 ? 1 : -1;
				if (res > 0) you++;
				if (res < 0) opp++;
				const i = document.createElement("i");
				i.className = res > 0 ? "w" : res < 0 ? "l" : "";
				i.textContent = SYM[rocky];
				i.title = NAME[rocky];
				strip.appendChild(i);
				screen.innerHTML = `Du: <b class="you">${SYM[me]} ${NAME[me]}</b> · Rocky: <b class="opp">${SYM[rocky]} ${NAME[rocky]}</b> → ${
					res > 0 ? "Gewonnen!" : res < 0 ? "Verloren." : "Unentschieden."
				}`;
				if (round === 10) {
					screen.innerHTML += ` <br>Partie vorbei: ${you} Siege.${you >= 6 ? " Rocky ist geschlagen!" : " Schau dir Rockys Züge unten noch mal an."}`;
					if (you >= 6) mission(n);
				}
				upd();
			})
		);
		$("#rpsReset", sec).addEventListener("click", () => {
			round = you = opp = 0;
			strip.innerHTML = "";
			screen.textContent = "Neue Partie. Wähl deinen Zug.";
			upd();
		});
	});

	// ---------- Level 2: Kiosk am Strand ----------
	register(2, (sec, n) => {
		const POS = [1 / 6, 1 / 2, 5 / 6];
		const ROWS = ["Links", "Mitte", "Rechts"];
		const share = (a, b) => {
			if (a === b) return 50;
			const mid = (POS[a] + POS[b]) / 2;
			return Math.round((POS[a] < POS[b] ? mid : 1 - mid) * 100);
		};
		const pay = ROWS.map((_, r) => ROWS.map((_, c) => [share(r, c), share(c, r)]));
		let day = 0;
		let sum = 0;
		let last = null;
		const screen = $("#beachScreen", sec);
		const cv = $("#beachCv", sec);
		const st = fit(cv, (w) => (w < 520 ? 150 : 170), (ctx, w, h) => {
			ctx.clearRect(0, 0, w, h);
			// Wasser und Sand
			ctx.fillStyle = "#123a6b";
			ctx.fillRect(0, 0, w, h * 0.3);
			ctx.fillStyle = "#3b2f1a";
			ctx.fillRect(0, h * 0.3, w, h * 0.7);
			const N = 36;
			for (let i = 0; i < N; i++) {
				const x = ((i + 0.5) / N) * w;
				const y = h * 0.42 + ((i * 37) % 5) * (h * 0.07);
				let col = "#c8bfa6";
				if (last) {
					const t = (i + 0.5) / N;
					const dy = Math.abs(t - POS[last[0]]);
					const db = Math.abs(t - POS[last[1]]);
					col = dy < db ? "#3ef0ff" : db < dy ? "#ff5cae" : i % 2 ? "#3ef0ff" : "#ff5cae";
				}
				ctx.fillStyle = col;
				ctx.beginPath();
				ctx.arc(x, y, Math.max(3, w / 140), 0, Math.PI * 2);
				ctx.fill();
			}
			// Kioske
			const kiosk = (p, color, label, dy) => {
				const x = p * w;
				ctx.fillStyle = color;
				ctx.fillRect(x - 14, h * 0.82 + dy, 28, 18);
				ctx.fillStyle = "#07050f";
				ctx.font = "bold 11px 'Chakra Petch', sans-serif";
				ctx.textAlign = "center";
				ctx.fillText(label, x, h * 0.82 + dy + 13);
			};
			ctx.fillStyle = "rgba(255,255,255,0.5)";
			ctx.font = "11px 'Chakra Petch', sans-serif";
			ctx.textAlign = "center";
			POS.forEach((p, i) => ctx.fillText(ROWS[i], p * w, h * 0.36));
			if (last) {
				const same = last[0] === last[1];
				kiosk(POS[last[0]], "#3ef0ff", "DU", same ? -10 : 0);
				kiosk(POS[last[1]], "#ff5cae", "BOT", same ? 10 : 0);
			}
		});
		const mx = matrix($("#beachMx", sec), {
			rows: ROWS,
			cols: ROWS,
			pay,
			oppName: "Bot",
			corner: "Du ↓ · Bot →",
			onRow(r) {
				if (day >= 5) return;
				const c = Math.floor(Math.random() * 3);
				day++;
				const [a, b] = pay[r][c];
				sum += a;
				last = [r, c];
				mx.hit(r, c);
				st.redraw();
				screen.innerHTML = `Tag ${day}: Du stehst <b class="you">${ROWS[r]}</b>, der Bot <b class="opp">${ROWS[c]}</b>. Du bekommst ${a} %, er ${b} %.`;
				if (day === 5) {
					screen.innerHTML += ` Woche vorbei: ${sum} %.${sum >= 280 ? " Starke Woche!" : " Welche Zeile ist nie schlecht?"}`;
					if (sum >= 280) mission(n);
					mx.rowsDisabled(true);
				}
				$("#beachSum", sec).textContent = sum;
				$("#beachDay", sec).textContent = day;
			},
		});
		$("#beachReset", sec).addEventListener("click", () => {
			day = sum = 0;
			last = null;
			mx.hit(null);
			mx.rowsDisabled(false);
			st.redraw();
			$("#beachSum", sec).textContent = 0;
			$("#beachDay", sec).textContent = 0;
			screen.textContent = "Neue Woche. Tippe links auf eine Zeile.";
		});
	});

	// ---------- Level 3: Dominanter Kurs ----------
	register(3, (sec, n) => {
		const ROWS = ["Nebel", "Felsen", "Hyper&shy;raum"];
		const COLS = ["lauert am Nebel", "lauert bei den Felsen", "lauert am Hyperraum"];
		const HEAD = ["Pirat am Nebel", "Pirat bei den Felsen", "Pirat am Hyper&shy;raum"];
		const mine = [
			[2, 5, 4],
			[4, 3, 5],
			[5, 6, 6],
		];
		const pay = mine.map((row) => row.map((v) => [v, 8 - v]));
		let sum = 0;
		let flights = 0;
		let streak = 0;
		let lensDone = false;
		const screen = $("#pirScreen", sec);
		const mx = matrix($("#pirMx", sec), {
			rows: ROWS,
			cols: HEAD,
			pay,
			oppName: "Pirat",
			corner: "Kurs ↓",
			onLens(c, seen, best) {
				screen.innerHTML = `Wenn der Pirat ${COLS[c]}, dann ist <b class="you">${best.replace("&shy;", "")}</b> dein bester Kurs.${
					seen.size === 3 ? " Alle drei geprüft. Fällt dir etwas auf?" : ` (${seen.size} von 3 geprüft)`
				}`;
				if (seen.size === 3) lensDone = true;
			},
			onRow(r) {
				const c = Math.floor(Math.random() * 3);
				const v = mine[r][c];
				sum += v;
				flights++;
				streak = r === 2 ? streak + 1 : 0;
				mx.hit(r, c);
				screen.innerHTML = `Kurs <b class="you">${ROWS[r].replace("&shy;", "")}</b>, der Pirat ${COLS[c]} → ${v} Ladung gerettet.`;
				if (lensDone && streak >= 3) {
					screen.innerHTML += " Dreimal Hyperraum, und zwar mit Plan!";
					mission(n);
				} else if (!lensDone && streak >= 3) {
					screen.innerHTML += " Gutes Gespür! Prüf mit der Lupe, ob das Zufall war.";
				}
				$("#pirSum", sec).textContent = sum;
				$("#pirN", sec).textContent = flights;
			},
		});
	});

	// ---------- Level 4: Beste Antworten markieren, Nash finden ----------
	register(4, (sec, n) => {
		const DAYS = ["Freitag", "Samstag", "Sonntag"];
		const pay = [
			[[2, 2], [4, 6], [3, 3]],
			[[6, 4], [3, 3], [5, 2]],
			[[3, 3], [2, 5], [1, 1]],
		];
		const screen = $("#nashScreen", sec);
		const stepEl = $("#nashStep", sec);
		const task = $("#nashTask", sec);
		let step = 1;
		let doneCols = new Set();
		let doneRows = new Set();
		const bestYou = (c) => Math.max(...pay.map((row) => row[c][0]));
		const bestOpp = (r) => Math.max(...pay[r].map((x) => x[1]));
		const mx = matrix($("#nashMx", sec), {
			rows: DAYS,
			cols: DAYS,
			pay,
			youName: "Deine Band",
			oppName: "Andere Band",
			corner: "Du ↓ · Sie →",
			onCell(r, c, el) {
				if (step === 1) {
					if (doneCols.has(c)) return;
					if (pay[r][c][0] === bestYou(c)) {
						el.classList.add("best-you");
						doneCols.add(c);
						screen.innerHTML = `Richtig: Spielt die andere Band <b class="opp">${DAYS[c]}</b>, ist <b class="you">${DAYS[r]}</b> deine beste Antwort.`;
						if (doneCols.size === 3) {
							step = 2;
							stepEl.textContent = "Schritt 2 · Die besten Antworten der anderen Band";
							task.innerHTML = 'Jetzt die Zeilen: Tippe in jeder Zeile die Zelle mit der höchsten <b style="color:var(--opp)">rechten</b> Zahl.';
						}
					} else wrong(el, "In dieser Spalte gibt es eine höhere linke Zahl.");
				} else if (step === 2) {
					if (doneRows.has(r)) return;
					if (pay[r][c][1] === bestOpp(r)) {
						el.classList.add("best-opp");
						doneRows.add(r);
						screen.innerHTML = `Richtig: Spielst du <b class="you">${DAYS[r]}</b>, nimmt die andere Band am besten <b class="opp">${DAYS[c]}</b>.`;
						if (doneRows.size === 3) finish();
					} else wrong(el, "In dieser Zeile gibt es eine höhere rechte Zahl.");
				}
			},
		});
		function wrong(el, msg) {
			el.classList.remove("shake");
			void el.offsetWidth;
			el.classList.add("shake");
			screen.textContent = msg;
		}
		function finish() {
			step = 3;
			let found = [];
			for (let r = 0; r < 3; r++)
				for (let c = 0; c < 3; c++) {
					const el = mx.cell(r, c);
					if (el.classList.contains("best-you") && el.classList.contains("best-opp")) {
						el.classList.add("nash");
						found.push(`du ${DAYS[r]}, sie ${DAYS[c]}`);
					}
				}
			stepEl.textContent = "Geschafft · Zwei Sterne in einer Zelle";
			task.textContent = "Die grünen Zellen sind stabil: Dort spielt jede Band schon die beste Antwort auf die andere.";
			screen.innerHTML = `Gleichgewichte gefunden: <b>${found.join("</b> und <b>")}</b>.`;
			mission(n);
		}
		$("#nashReset", sec).addEventListener("click", () => {
			step = 1;
			doneCols = new Set();
			doneRows = new Set();
			mx.clear();
			stepEl.textContent = "Schritt 1 · Deine besten Antworten";
			task.innerHTML = 'Geh die Spalten durch: Tippe in jeder Spalte die Zelle mit der höchsten <b style="color:var(--you)">linken</b> Zahl.';
			screen.textContent = "";
		});
	});

	// ---------- Level 5: Gefangenendilemma, einmalig ----------
	register(5, (sec, n) => {
		const ROWS = ["Schweigen", "Verraten"];
		const pay = [
			[[3, 3], [0, 5]],
			[[5, 0], [1, 1]],
		];
		let k = 0;
		let you = 0;
		let opp = 0;
		let lens = false;
		const screen = $("#pdScreen", sec);
		const NAMES = ["Kurt", "Mia", "Ole", "Pia", "Sam"];
		const mx = matrix($("#pdMx", sec), {
			rows: ROWS,
			cols: ["Komplize schweigt", "Komplize verrät"],
			pay,
			oppName: "Komplize",
			corner: "Du ↓",
			onLens(c, seen, best) {
				screen.innerHTML = `${c ? "Verrät" : "Schweigt"} der Komplize, dann ist <b class="you">${best}</b> für dich besser.${
					seen.size === 2 ? " Und das in beiden Fällen." : ""
				}`;
				if (seen.size === 2) lens = true;
			},
			onRow(r) {
				if (k >= 5) return;
				// Fremde verraten mal so, mal so
				const c = Math.random() < 0.55 ? 1 : 0;
				const [a, b] = pay[r][c];
				you += a;
				opp += b;
				mx.hit(r, c);
				screen.innerHTML = `${NAMES[k]} ${c ? "<b class='opp'>verrät</b>" : "<b class='opp'>schweigt</b>"}, du <b class="you">${
					r ? "verrätst" : "schweigst"
				}</b>: ${a} für dich, ${b} für ${NAMES[k]}.`;
				k++;
				if (k === 5) {
					screen.innerHTML += ` Alle Verhöre vorbei. Du hast ${you} Punkte, deine Komplizen zusammen ${opp}.`;
					mx.rowsDisabled(true);
					if (lens) mission(n);
					else screen.innerHTML += " Nimm noch die Lupe für beide Spalten.";
				}
				$("#pdYou", sec).textContent = you;
				$("#pdOpp", sec).textContent = opp;
				$("#pdN", sec).textContent = k;
			},
		});
		// Mission auch, wenn die Lupe nach den Verhören benutzt wird
		$$("button.mx-col", sec).forEach((b) => b.addEventListener("click", () => lens && k >= 5 && mission(n)));
		$("#pdReset", sec).addEventListener("click", () => {
			k = you = opp = 0;
			mx.hit(null);
			mx.rowsDisabled(false);
			["#pdYou", "#pdOpp", "#pdN"].forEach((s) => ($(s, sec).textContent = 0));
			screen.textContent = "Neue Verhöre. Schweigen oder Verraten?";
		});
	});
})();
