// Level 6 bis 10: wiederholtes Dilemma, Hirschjagd, Feigling-Spiel, Elfmeter, Münzen-Nim.

(() => {
	const { register, mission, matrix, fit, animate, $, $$, reduced } = window.Arcade;
	const PD = { cc: [3, 3], cd: [0, 5], dc: [5, 0], dd: [1, 1] };

	// ---------- Level 6: Wer ist der Bot? ----------
	register(6, (sec, n) => {
		const BOTS = [
			{ id: "spiegel", name: "🪞 Spiegel", move: (h) => (h.length ? h[h.length - 1][0] : "c") },
			{ id: "elefant", name: "🐘 Elefant", move: (h) => (h.some((x) => x[0] === "d") ? "d" : "c") },
			{ id: "hai", name: "🦈 Hai", move: () => "d" },
			{ id: "lamm", name: "🐑 Lamm", move: () => "c" },
			{ id: "wuerfel", name: "🎲 Würfel", move: () => (Math.random() < 0.5 ? "c" : "d") },
		];
		let bot;
		let hist;
		let you;
		let opp;
		const screen = $("#rpScreen", sec);
		const sy = $("#rpStripYou", sec);
		const sb = $("#rpStripBot", sec);
		const guess = $("#rpGuess", sec);
		const gb = $("#rpGuessBtns", sec);
		const moveBtns = $$("[data-pd]", sec);
		const chip = (host, m) => {
			const i = document.createElement("i");
			i.className = m;
			i.textContent = m === "c" ? "🤝" : "🗡️";
			i.title = m === "c" ? "kooperiert" : "verraten";
			host.appendChild(i);
		};
		function reset() {
			bot = BOTS[Math.floor(Math.random() * BOTS.length)];
			hist = [];
			you = opp = 0;
			sy.innerHTML = sb.innerHTML = "";
			guess.hidden = true;
			moveBtns.forEach((b) => (b.disabled = false));
			screen.textContent = "Ein neuer Bot sitzt dir gegenüber. Runde 1: Was spielst du?";
			upd();
		}
		const upd = () => {
			$("#rpYou", sec).textContent = you;
			$("#rpOpp", sec).textContent = opp;
			$("#rpN", sec).textContent = hist.length;
		};
		moveBtns.forEach((b) =>
			b.addEventListener("click", () => {
				if (hist.length >= 10) return;
				const me = b.dataset.pd;
				const it = bot.move(hist);
				const [a, c] = PD[me + it];
				you += a;
				opp += c;
				hist.push([me, it]);
				chip(sy, me);
				chip(sb, it);
				screen.innerHTML = `Runde ${hist.length}: Du <b class="you">${me === "c" ? "kooperierst" : "verrätst"}</b>, der Bot <b class="opp">${
					it === "c" ? "kooperiert" : "verrät"
				}</b>. ${a} zu ${c}.`;
				if (hist.length === 10) {
					moveBtns.forEach((x) => (x.disabled = true));
					screen.innerHTML += " Zehn Runden gespielt. Wer war es?";
					guess.hidden = false;
				}
				upd();
			})
		);
		gb.innerHTML = BOTS.map((b) => `<button class="btn" type="button" data-bot="${b.id}">${b.name}</button>`).join("");
		$$("[data-bot]", gb).forEach((b) =>
			b.addEventListener("click", () => {
				const ok = b.dataset.bot === bot.id;
				// Würfel und andere können zufällig gleich aussehen; dann zählt jede passende Erklärung
				const fits = BOTS.filter((x) => x.id !== "wuerfel" && x.id === b.dataset.bot).some((x) => {
					const replay = [];
					return hist.every(([me, it]) => {
						const m = x.move(replay);
						replay.push([me, it]);
						return m === it;
					});
				});
				if (ok || fits) {
					screen.innerHTML = `Richtig, es war ${ok ? bot.name : `${bot.name}, aber ${b.textContent} hätte genau so gespielt`}! Spiel ruhig noch ein paar Bots durch.`;
					mission(n);
				} else {
					screen.innerHTML = `Nein, es war ${bot.name}. Schau die beiden Reihen an: Wie hat der Bot auf deine Züge reagiert?`;
				}
				guess.hidden = true;
			})
		);
		$("#rpReset", sec).addEventListener("click", reset);
		reset();
	});

	// ---------- Level 7: Hirschjagd mit Vertrauen ----------
	register(7, (sec, n) => {
		const ROWS = ["🦌 Hirsch", "🐇 Hase"];
		const pay = [
			[[4, 4], [0, 2]],
			[[2, 0], [2, 2]],
		];
		let trust = 0.5;
		let you = 0;
		let opp = 0;
		let run = 0;
		const screen = $("#stagScreen", sec);
		const strip = $("#stagStrip", sec);
		const mx = matrix($("#stagMx", sec), {
			rows: ROWS,
			cols: ["Mitjäger: Hirsch", "Mitjäger: Hase"],
			pay,
			oppName: "Mitjäger",
			corner: "Du ↓",
			onRow(r) {
				const c = Math.random() < trust ? 0 : 1;
				const [a, b] = pay[r][c];
				you += a;
				opp += b;
				mx.hit(r, c);
				run = r === 0 && c === 0 ? run + 1 : 0;
				trust = Math.max(0, Math.min(1, trust + (r === 0 ? 0.25 : -0.35)));
				const i = document.createElement("i");
				i.className = r === 0 && c === 0 ? "w" : a === 0 ? "l" : "";
				i.textContent = r === 0 && c === 0 ? "🦌" : a === 0 ? "✗" : "🐇";
				strip.appendChild(i);
				screen.innerHTML =
					r === 0 && c === 0
						? "Ihr erlegt gemeinsam einen Hirsch! 4 für jeden."
						: r === 0
							? "Du wartest am Hirsch, aber dein Mitjäger jagt Hasen. Du gehst leer aus."
							: c === 0
								? "Dein Mitjäger wartet am Hirsch, du jagst Hasen. Er geht leer aus und merkt sich das."
								: "Ihr jagt beide Hasen. Sicher, aber nur 2 für jeden.";
				if (run >= 3) {
					screen.innerHTML += " Drei Hirsche in Folge: Vertrauen zahlt sich aus.";
					mission(n);
				}
				$("#stagYou", sec).textContent = you;
				$("#stagOpp", sec).textContent = opp;
				$("#stagRun", sec).textContent = run;
				$("#stagTrust", sec).textContent = Math.round(trust * 100);
			},
		});
		$("#stagReset", sec).addEventListener("click", () => {
			trust = 0.5;
			you = opp = run = 0;
			strip.innerHTML = "";
			mx.hit(null);
			["#stagYou", "#stagOpp", "#stagRun"].forEach((s) => ($(s, sec).textContent = 0));
			$("#stagTrust", sec).textContent = 50;
			screen.textContent = "Ein neuer Mitjäger. Er kennt dich noch nicht.";
		});
	});

	// ---------- Level 8: Feigling-Spiel ----------
	register(8, (sec, n) => {
		const screen = $("#chickenScreen", sec);
		const bS = $("#chSwerve", sec);
		const bG = $("#chStraight", sec);
		const bW = $("#chWheel", sec);
		let botCommit = false;
		let you = 0;
		let opp = 0;
		let wins = 0;
		let busy = false;
		// Darstellung: t von 0 bis 1, yourOff / botOff = seitliches Ausweichen am Ende
		let view = { t: 0, ys: false, bs: false, crash: false, wheelYou: false, wheelBot: false };
		const st = fit($("#chickenCv", sec), (w) => (w < 520 ? 150 : 180), (ctx, w, h) => {
			ctx.clearRect(0, 0, w, h);
			ctx.fillStyle = "#1b1730";
			ctx.fillRect(0, h * 0.25, w, h * 0.5);
			ctx.strokeStyle = "#ffe14d";
			ctx.setLineDash([14, 12]);
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(0, h / 2);
			ctx.lineTo(w, h / 2);
			ctx.stroke();
			ctx.setLineDash([]);
			const meet = w / 2;
			const t = view.t;
			const swerve = (k, s) => (s ? Math.max(0, (k - 0.55) / 0.45) * h * 0.2 : 0);
			const stopAt = view.crash ? 0.92 : 1;
			const k = Math.min(t, stopAt);
			const xY = 24 + (meet - 46) * k;
			const xB = w - 24 - (meet - 46) * k;
			const car = (x, y, color, flip, wheel) => {
				ctx.save();
				ctx.translate(x, y);
				if (flip) ctx.scale(-1, 1);
				ctx.fillStyle = color;
				ctx.fillRect(-22, -11, 44, 22);
				ctx.fillStyle = "#07050f";
				ctx.fillRect(2, -8, 12, 16);
				ctx.fillStyle = "#ffe14d";
				ctx.fillRect(18, -9, 4, 5);
				ctx.fillRect(18, 4, 4, 5);
				ctx.restore();
				if (wheel) {
					ctx.font = "16px sans-serif";
					ctx.textAlign = "center";
					ctx.fillText("🛞", x + (flip ? 10 : -10), y - 22);
				}
			};
			car(xY, h / 2 + 12 + swerve(t, view.ys), "#3ef0ff", false, view.wheelYou);
			car(xB, h / 2 - 12 - swerve(t, view.bs), "#ff5cae", true, view.wheelBot);
			if (view.crash && t > 0.9) {
				ctx.font = `${Math.round(h * 0.35)}px sans-serif`;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText("💥", meet, h / 2);
				ctx.textBaseline = "alphabetic";
			}
			ctx.font = "12px 'Chakra Petch', sans-serif";
			ctx.fillStyle = "#3ef0ff";
			ctx.textAlign = "left";
			ctx.fillText("DU", 8, h - 10);
			ctx.fillStyle = "#ff5cae";
			ctx.textAlign = "right";
			ctx.fillText("HITZKOPF", w - 8, 18);
		});
		function newRound() {
			botCommit = Math.random() < 0.4;
			view = { t: 0, ys: false, bs: false, crash: false, wheelYou: false, wheelBot: botCommit };
			screen.innerHTML = botCommit
				? "Der Hitzkopf hat sein Lenkrad aus dem Fenster geworfen! 🛞 Er <b class='opp'>kann nicht mehr ausweichen</b>."
				: "Der Hitzkopf hält sein Lenkrad noch fest. Was tust du?";
			[bS, bG, bW].forEach((b) => (b.disabled = false));
			busy = false;
			st.redraw();
		}
		function play(choice) {
			if (busy) return;
			busy = true;
			[bS, bG, bW].forEach((b) => (b.disabled = true));
			const youStraight = choice !== "swerve";
			const youWheel = choice === "wheel";
			let botStraight;
			if (botCommit) botStraight = true;
			else if (youWheel) botStraight = false;
			else botStraight = Math.random() < 0.5;
			const crash = youStraight && botStraight;
			const [a, b] = crash ? [-10, -10] : youStraight ? [1, -1] : botStraight ? [-1, 1] : [0, 0];
			you += a;
			opp += b;
			if (crash) wins = 0;
			else if (a === 1) wins++;
			view = { t: 0, ys: !youStraight, bs: !botStraight, crash, wheelYou: youWheel, wheelBot: botCommit };
			animate(
				1.4,
				(k) => {
					view.t = k;
					st.redraw();
				},
				() => {
					const msg = crash
						? youWheel && botCommit
							? "💥 Beide ohne Lenkrad. Der Crash war sicher. −10 für jeden."
							: "💥 Keiner weicht aus. −10 für jeden."
						: youWheel
							? "Er sieht dein Lenkrad fliegen und weicht aus. +1 für dich."
							: youStraight
								? "Du fährst geradeaus, er weicht aus. Glück gehabt! +1."
								: botStraight
									? "Du weichst aus, er fährt durch. −1, Feigling."
									: "Beide weichen aus. 0 für jeden.";
					$("#chYou", sec).textContent = you;
					$("#chOpp", sec).textContent = opp;
					$("#chWins", sec).textContent = Math.min(wins, 3);
					screen.innerHTML = `${msg} <br><small>Gleich geht es weiter …</small>`;
					if (wins >= 3) mission(n);
					setTimeout(newRound, reduced ? 900 : 1700);
				}
			);
		}
		bS.addEventListener("click", () => play("swerve"));
		bG.addEventListener("click", () => play("straight"));
		bW.addEventListener("click", () => play("wheel"));
		newRound();
	});

	// ---------- Level 9: Elfmeter mit lernendem Torwart ----------
	register(9, (sec, n) => {
		// Trefferquote: [deine Seite][Torwart-Seite]
		const Q = [
			[0.5, 0.9],
			[0.9, 0.2],
		];
		const shots = [];
		let goals = 0;
		let view = null;
		const screen = $("#penScreen", sec);
		const pen = fit($("#penCv", sec), (w) => (w < 520 ? 160 : 200), (ctx, w, h) => {
			ctx.clearRect(0, 0, w, h);
			ctx.fillStyle = "#0f3a1e";
			ctx.fillRect(0, h * 0.72, w, h * 0.28);
			const gw = Math.min(w * 0.8, 420);
			const gx = (w - gw) / 2;
			const gy = h * 0.12;
			const gh = h * 0.6;
			ctx.strokeStyle = "rgba(255,255,255,0.15)";
			ctx.lineWidth = 1;
			for (let x = gx; x <= gx + gw; x += 14) {
				ctx.beginPath();
				ctx.moveTo(x, gy);
				ctx.lineTo(x, gy + gh);
				ctx.stroke();
			}
			ctx.strokeStyle = "#f4f0ff";
			ctx.lineWidth = 5;
			ctx.beginPath();
			ctx.moveTo(gx, gy + gh);
			ctx.lineTo(gx, gy);
			ctx.lineTo(gx + gw, gy);
			ctx.lineTo(gx + gw, gy + gh);
			ctx.stroke();
			const k = view ? view.t : 0;
			// Torwart
			const kx = w / 2 + (view ? (view.keeper ? 1 : -1) * gw * 0.3 * Math.min(1, k * 1.4) : 0);
			ctx.fillStyle = "#ff5cae";
			ctx.fillRect(kx - 14, gy + gh - 64, 28, 64);
			ctx.fillRect(kx - 30, gy + gh - 58, 60, 10);
			// Ball
			const sx = w / 2;
			const sy = h * 0.92;
			let bx = sx;
			let by = sy;
			if (view) {
				const tx = w / 2 + (view.shot ? 1 : -1) * gw * (view.goal ? 0.36 : 0.3);
				const ty = gy + gh * (view.goal ? 0.3 : 0.55);
				bx = sx + (tx - sx) * k;
				by = sy + (ty - sy) * k;
			}
			ctx.fillStyle = "#fff";
			ctx.beginPath();
			ctx.arc(bx, by, 8, 0, Math.PI * 2);
			ctx.fill();
			if (view && k >= 1) {
				ctx.font = "bold 18px 'Press Start 2P', monospace";
				ctx.textAlign = "center";
				ctx.fillStyle = view.goal ? "#5dff95" : "#ff6b6b";
				ctx.fillText(view.goal ? "TOR!" : "GEHALTEN", w / 2, gy - 4 > 20 ? gy - 4 : 22);
			}
		});
		$$("[data-shot]", sec).forEach((b) =>
			b.addEventListener("click", () => {
				const s = Number(b.dataset.shot);
				// Torwart schätzt deine Links-Quote aus den letzten 8 Schüssen und springt dahin, wo du schlechter bist
				const recent = shots.slice(-8);
				const pL = (recent.filter((x) => x === 0).length + 1) / (recent.length + 2);
				const ifL = pL * Q[0][0] + (1 - pL) * Q[1][0];
				const ifR = pL * Q[0][1] + (1 - pL) * Q[1][1];
				let keeper = ifL < ifR ? 0 : 1;
				if (Math.random() < 0.15) keeper = 1 - keeper;
				const goal = Math.random() < Q[s][keeper];
				shots.push(s);
				if (goal) goals++;
				view = { shot: s, keeper, goal, t: 0 };
				$$("[data-shot]", sec).forEach((x) => (x.disabled = true));
				animate(
					0.7,
					(k) => {
						view.t = k;
						pen.redraw();
					},
					() => {
						$$("[data-shot]", sec).forEach((x) => (x.disabled = false));
						const left = Math.round((shots.filter((x) => x === 0).length / shots.length) * 100);
						$("#penGoals", sec).textContent = goals;
						$("#penShots", sec).textContent = shots.length;
						$("#penLeft", sec).textContent = left;
						screen.innerHTML = `Du schießt <b class="you">${s ? "rechts" : "links"}</b>, der Torwart springt <b class="opp">${
							keeper ? "rechts" : "links"
						}</b>. ${goal ? "Tor!" : "Gehalten."} Quote: ${Math.round((goals / shots.length) * 100)} %.`;
					}
				);
			})
		);

		// Mischmaschine
		const pIn = $("#mixP", sec);
		const mixScreen = $("#mixScreen", sec);
		const lineL = (p) => p * Q[0][0] + (1 - p) * Q[1][0];
		const lineR = (p) => p * Q[0][1] + (1 - p) * Q[1][1];
		const pStar = (Q[1][1] - Q[1][0]) / (Q[0][0] - Q[1][0] - Q[0][1] + Q[1][1]);
		const mix = fit($("#mixCv", sec), (w) => (w < 520 ? 200 : 230), (ctx, w, h) => {
			ctx.clearRect(0, 0, w, h);
			const pad = { l: 40, r: 12, t: 14, b: 28 };
			const X = (p) => pad.l + p * (w - pad.l - pad.r);
			const Y = (q) => pad.t + (1 - q) * (h - pad.t - pad.b);
			ctx.font = "11px 'Chakra Petch', sans-serif";
			ctx.fillStyle = "rgba(255,255,255,0.55)";
			ctx.strokeStyle = "rgba(255,255,255,0.08)";
			ctx.textAlign = "right";
			for (let q = 0; q <= 1.001; q += 0.25) {
				ctx.beginPath();
				ctx.moveTo(pad.l, Y(q));
				ctx.lineTo(w - pad.r, Y(q));
				ctx.stroke();
				ctx.fillText(`${Math.round(q * 100)} %`, pad.l - 6, Y(q) + 4);
			}
			ctx.textAlign = "center";
			ctx.fillText("immer rechts", X(0) + 30, h - 8);
			ctx.fillText("immer links", X(1) - 28, h - 8);
			const line = (f, color, wd, dash) => {
				ctx.strokeStyle = color;
				ctx.lineWidth = wd;
				ctx.setLineDash(dash || []);
				ctx.beginPath();
				for (let i = 0; i <= 100; i++) {
					const p = i / 100;
					i ? ctx.lineTo(X(p), Y(f(p))) : ctx.moveTo(X(p), Y(f(p)));
				}
				ctx.stroke();
				ctx.setLineDash([]);
			};
			line(lineL, "rgba(255,92,174,0.7)", 2, [5, 4]);
			line(lineR, "rgba(255,225,77,0.7)", 2, [5, 4]);
			line((p) => Math.min(lineL(p), lineR(p)), "#3ef0ff", 4);
			const p = Number(pIn.value) / 100;
			const v = Math.min(lineL(p), lineR(p));
			ctx.fillStyle = "#fff";
			ctx.beginPath();
			ctx.arc(X(p), Y(v), 7, 0, Math.PI * 2);
			ctx.fill();
			ctx.textAlign = "left";
			ctx.fillStyle = "#ff5cae";
			ctx.fillText("Torwart springt links", X(0.02), Y(lineL(0.02)) - 8);
			ctx.fillStyle = "#ffe14d";
			ctx.fillText("Torwart springt rechts", X(0.02), Y(lineR(0.02)) + 16);
		});
		const updMix = () => {
			const p = Number(pIn.value) / 100;
			$("#mixOut", sec).textContent = `${pIn.value} %`;
			const l = lineL(p);
			const r = lineR(p);
			const v = Math.min(l, r);
			mixScreen.innerHTML = `Springt er links: ${Math.round(l * 100)} % Tore. Springt er rechts: ${Math.round(
				r * 100
			)} %. Ein kluger Torwart wählt ${l < r ? "links" : l > r ? "rechts" : "egal"}, also bleiben dir <b class="you">${Math.round(v * 100)} %</b>.`;
			if (Math.abs(p - pStar) <= 0.03) {
				mixScreen.innerHTML += " Beide Ecken sind für ihn gleich gut. Mehr geht nicht!";
				mission(n);
			}
			mix.redraw();
		};
		pIn.addEventListener("input", updMix);
		updMix();
	});

	// ---------- Level 10: Münzen-Nim, wer die letzte nimmt, gewinnt ----------
	register(10, (sec, n) => {
		let coins = 21;
		let yourTurn = true;
		let help = false;
		let w = 0;
		let l = 0;
		const screen = $("#nimScreen", sec);
		const take = $$("[data-take]", sec);
		const st = fit($("#nimCv", sec), (cw) => (cw < 520 ? 200 : 190), (ctx, W, H) => {
			ctx.clearRect(0, 0, W, H);
			// Münzen
			const per = W < 520 ? 7 : 11;
			const r = Math.min(16, (W - 20) / per / 2 - 3);
			for (let i = 0; i < coins; i++) {
				const x = 14 + r + (i % per) * (r * 2 + 6);
				const y = 14 + r + Math.floor(i / per) * (r * 2 + 6);
				ctx.fillStyle = "#ffe14d";
				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = "#b38a00";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
				ctx.stroke();
			}
			// Zahlenleiste 0 bis 21
			const ty = H - 30;
			const cell = (W - 16) / 22;
			ctx.font = `${Math.max(9, Math.min(12, cell * 0.5))}px 'Chakra Petch', sans-serif`;
			ctx.textAlign = "center";
			for (let k = 0; k <= 21; k++) {
				const x = 8 + cell * (k + 0.5);
				const lose = help && k % 4 === 0 && k > 0;
				ctx.fillStyle = k === coins ? "#3ef0ff" : lose ? "rgba(255,107,107,0.55)" : "rgba(255,255,255,0.08)";
				ctx.fillRect(x - cell / 2 + 1, ty, cell - 2, 22);
				ctx.fillStyle = k === coins ? "#07050f" : "rgba(255,255,255,0.75)";
				ctx.fillText(String(k), x, ty + 15);
			}
		});
		const upd = () => {
			take.forEach((b) => (b.disabled = !yourTurn || Number(b.dataset.take) > coins || coins === 0));
			$("#nimW", sec).textContent = w;
			$("#nimL", sec).textContent = l;
			st.redraw();
		};
		take.forEach((b) =>
			b.addEventListener("click", () => {
				if (!yourTurn) return;
				const k = Number(b.dataset.take);
				coins -= k;
				if (coins === 0) {
					w++;
					screen.innerHTML = "Du nimmst die letzte Münze. <b class='you'>Gewonnen!</b>";
					mission(n);
					yourTurn = false;
					upd();
					return;
				}
				yourTurn = false;
				screen.innerHTML = `Du nimmst ${k}. Es liegen noch ${coins} da. Der Bot überlegt …`;
				upd();
				setTimeout(() => {
					// Perfekter Bot: hinterlasse ein Vielfaches von 4, sonst nimm zufällig
					let t = coins % 4;
					if (t === 0) t = 1 + Math.floor(Math.random() * Math.min(3, coins));
					coins -= t;
					if (coins === 0) {
						l++;
						screen.innerHTML = `Der Bot nimmt ${t} und damit die letzte Münze. <b class='opp'>Verloren.</b> Tipp: die Rückwärts-Brille.`;
					} else {
						screen.innerHTML = `Der Bot nimmt ${t}. Es liegen ${coins} da. Du bist dran.`;
						yourTurn = true;
					}
					upd();
				}, reduced ? 200 : 700);
			})
		);
		$("#nimHelp", sec).addEventListener("click", (e) => {
			help = !help;
			e.currentTarget.setAttribute("aria-pressed", String(help));
			upd();
		});
		$("#nimReset", sec).addEventListener("click", () => {
			coins = 21;
			yourTurn = true;
			screen.textContent = "Neues Spiel, 21 Münzen. Du fängst an.";
			upd();
		});
		upd();
	});
})();
