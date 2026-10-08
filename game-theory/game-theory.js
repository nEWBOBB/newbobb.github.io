// Spieltheorie: Gefangenendilemma gegen eine geheime Strategie und Axelrods Turnier
(() => {
	const PAY = { CC: [3, 3], CD: [0, 5], DC: [5, 0], DD: [1, 1] };

	// Strategien: bekommen eigene und gegnerische Züge, liefern "C" oder "D"
	const STRATS = [
		{ name: "Tit for Tat", why: "Ich fange freundlich an und mache dann einfach deinen letzten Zug nach.", play: (me, op) => (op.length ? op[op.length - 1] : "C") },
		{ name: "Immer nett", why: "Ich kooperiere immer, egal was du tust. Ausnutzbar, oder?", play: () => "C" },
		{ name: "Immer fies", why: "Ich betrüge immer. Gegen mich hilft nur, selbst zu betrügen.", play: () => "D" },
		{ name: "Nachtragend", why: "Ich kooperiere, bis du mich einmal betrügst. Danach nie wieder.", play: (me, op) => (op.includes("D") ? "D" : "C") },
		{ name: "Zufall", why: "Ich werfe jede Runde eine Münze.", play: () => (Math.random() < 0.5 ? "C" : "D") },
		{ name: "Großzügig", why: "Wie Tit for Tat, aber ich verzeihe jeden dritten Betrug sofort.", play: (me, op) => (op.length && op[op.length - 1] === "D" && Math.random() > 0.33 ? "D" : "C") },
		{ name: "Pawlow", why: "Lief die letzte Runde gut, bleibe ich dabei. Sonst wechsle ich.", play: (me, op) => {
			if (!me.length) return "C";
			const last = me[me.length - 1];
			const good = op[op.length - 1] === "C";
			return good ? last : last === "C" ? "D" : "C";
		} },
	];

	// ---------- Teil 1: selbst spielen ----------
	const ROUNDS = 10;
	const rowMe = document.getElementById("rowMe");
	const rowThem = document.getElementById("rowThem");
	const meOut = document.getElementById("pdMe");
	const themOut = document.getElementById("pdThem");
	const roundOut = document.getElementById("pdRound");
	const note = document.getElementById("pdNote");
	const btnC = document.getElementById("btnC");
	const btnD = document.getElementById("btnD");
	let opp;
	let mine;
	let theirs;
	let sMe;
	let sThem;

	function newGame() {
		opp = STRATS[[0, 2, 3, 4, 6][Math.floor(Math.random() * 5)]];
		mine = [];
		theirs = [];
		sMe = sThem = 0;
		for (const row of [rowMe, rowThem]) {
			row.querySelectorAll("i").forEach((i) => i.remove());
			for (let k = 0; k < ROUNDS; k++) row.appendChild(document.createElement("i"));
		}
		meOut.textContent = themOut.textContent = "0";
		roundOut.textContent = `Runde 1 / ${ROUNDS}`;
		btnC.disabled = btnD.disabled = false;
		note.textContent = "Wer ist dein Gegner? Das verrate ich nach Runde 10.";
	}

	function move(m) {
		const t = opp.play(theirs, mine);
		mine.push(m);
		theirs.push(t);
		const [a, b] = PAY[m + t];
		sMe += a;
		sThem += b;
		const k = mine.length - 1;
		const mark = (row, x) => {
			const cell = row.querySelectorAll("i")[k];
			cell.className = x === "C" ? "c" : "d";
			cell.textContent = x === "C" ? "🤝" : "🗡";
		};
		mark(rowMe, m);
		mark(rowThem, t);
		meOut.textContent = sMe;
		themOut.textContent = sThem;
		if (mine.length >= ROUNDS) {
			btnC.disabled = btnD.disabled = true;
			roundOut.textContent = "Spiel vorbei";
			const verdict = sMe > sThem ? "Du hast mehr Punkte." : sMe < sThem ? "Der Gegner hat mehr Punkte." : "Unentschieden.";
			note.textContent = `${verdict} Dein Gegner war „${opp.name}“: ${opp.why} Bestmöglich zusammen wären 30 : 30.`;
		} else {
			roundOut.textContent = `Runde ${mine.length + 1} / ${ROUNDS}`;
			note.textContent = `Runde ${mine.length}: ${a} Punkte für dich, ${b} für den Gegner.`;
		}
	}
	btnC.addEventListener("click", () => move("C"));
	btnD.addEventListener("click", () => move("D"));
	document.getElementById("btnNew").addEventListener("click", newGame);
	newGame();

	// ---------- Teil 2: Turnier ----------
	const noise = document.getElementById("noise");
	const ranking = document.getElementById("ranking");
	const tourNote = document.getElementById("tourNote");
	const LEN = 200;
	noise.addEventListener("input", () => (document.getElementById("noiseOut").textContent = `${noise.value} %`));

	function match(A, B, err) {
		const ha = [];
		const hb = [];
		let sa = 0;
		let sb = 0;
		const flip = (x) => (Math.random() < err ? (x === "C" ? "D" : "C") : x);
		for (let r = 0; r < LEN; r++) {
			const a = flip(A.play(ha, hb));
			const b = flip(B.play(hb, ha));
			ha.push(a);
			hb.push(b);
			const [pa, pb] = PAY[a + b];
			sa += pa;
			sb += pb;
		}
		return [sa, sb];
	}

	function tournament() {
		const err = Number(noise.value) / 100;
		const total = STRATS.map(() => 0);
		const REPS = 5; // mehrfach spielen, damit der Zufall sich ausgleicht
		for (let rep = 0; rep < REPS; rep++) {
			for (let i = 0; i < STRATS.length; i++) {
				for (let j = i; j < STRATS.length; j++) {
					const [a, b] = match(STRATS[i], STRATS[j], err);
					total[i] += a;
					if (i !== j) total[j] += b;
				}
			}
		}
		const games = REPS * STRATS.length * LEN;
		const rows = STRATS.map((s, i) => ({ s, avg: total[i] / games })).sort((x, y) => y.avg - x.avg);
		ranking.innerHTML = rows
			.map((r, k) => `<li><span>${k + 1}</span><span>${r.s.name}</span><i style="width:0"></i><b>${r.avg.toFixed(2).replace(".", ",")}</b></li>`)
			.join("");
		requestAnimationFrame(() =>
			ranking.querySelectorAll("i").forEach((el, k) => (el.style.width = `${(rows[k].avg / 3) * 100}%`))
		);
		const place = (name) => rows.findIndex((r) => r.s.name === name) + 1;
		const head = `Platz 1: „${rows[0].s.name}“. Tit for Tat landet auf Platz ${place("Tit for Tat")}, Immer fies auf Platz ${place("Immer fies")}.`;
		tourNote.textContent = err
			? `${head} Mit ${noise.value} % Missverständnissen zerbricht Vertrauen schneller, Racheketten kosten alle Punkte, und Ausbeuten lohnt sich plötzlich mehr.`
			: `${head} Immer fies verliert kein einziges Duell und sammelt trotzdem wenig, weil es nie die 3 : 3 der Zusammenarbeit bekommt.`;
	}
	document.getElementById("btnTour").addEventListener("click", tournament);
	ranking.innerHTML = STRATS.map((s, k) => `<li><span>${k + 1}</span><span>${s.name}</span><i style="width:0"></i><b>–</b></li>`).join("");
})();

// Spieltheorie: Errate zwei Drittel des Durchschnitts
(() => {
	const canvas = document.getElementById("guessCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.2 : 1.8));
	const my = document.getElementById("myGuess");
	const depth = document.getElementById("depth");
	const out = document.getElementById("guessOut");
	const note = document.getElementById("guessNote");
	const ACC = getComputedStyle(document.documentElement).getPropertyValue("--fach").trim();
	const DEPTH = ["naiv", "normal", "schlau", "sehr schlau", "nur Profis"];
	// Anteile der Denkstufen 0 (zufällig), 1, 2, 3, 4 und Nash (0)
	const MIX = [
		[0.7, 0.2, 0.1, 0, 0, 0],
		[0.25, 0.35, 0.25, 0.08, 0.02, 0.05],
		[0.1, 0.25, 0.35, 0.15, 0.05, 0.1],
		[0.05, 0.1, 0.25, 0.3, 0.15, 0.15],
		[0, 0.05, 0.1, 0.2, 0.25, 0.4],
	];
	let others = null;
	let result = null;
	const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

	function play() {
		const mix = MIX[Number(depth.value)];
		others = Array.from({ length: 99 }, () => {
			let r = Math.random();
			let k = mix.findIndex((m) => (r -= m) < 0);
			if (k < 0) k = 5;
			if (k === 0) return Math.round(Math.random() * 100);
			if (k === 5) return Math.round(Math.random() * 2);
			return Math.round(Math.min(100, Math.max(0, 50 * (2 / 3) ** k * (1 + gauss() * 0.18))));
		});
		const me = Number(my.value);
		const all = [...others, me];
		const mean = all.reduce((a, b) => a + b, 0) / 100;
		const target = (mean * 2) / 3;
		const dist = all.map((g) => Math.abs(g - target));
		const best = Math.min(...dist);
		const rank = 1 + dist.filter((d) => d < dist[99]).length;
		result = { mean, target, best: all[dist.indexOf(best)], rank };
		out.textContent = rank === 1 ? "🏆 Gewonnen!" : `Platz ${rank} von 100`;
		const r = (v) => v.toFixed(1).replace(".", ",");
		note.textContent = `Durchschnitt ${r(mean)}, zwei Drittel davon: ${r(target)}. ${
			rank === 1 ? "Du lagst am nächsten dran!" : `Am nächsten lag die ${result.best}.`
		} ${me === 0 ? "Die 0 ist das Nash-Gleichgewicht, aber nur, wenn alle anderen auch perfekt rechnen." : ""}`;
		draw();
	}

	function draw() {
		const { w, h } = size;
		const L = 14;
		const R = w - 14;
		const bot = h - 26;
		const X = (v) => L + (v / 100) * (R - L);
		ctx.clearRect(0, 0, w, h);
		ctx.font = "11px JetBrains Mono, monospace";
		ctx.fillStyle = "rgba(244,239,230,0.4)";
		ctx.textAlign = "center";
		for (let v = 0; v <= 100; v += 10) ctx.fillText(v, X(v), h - 8);
		if (others) {
			const bins = new Array(51).fill(0);
			others.forEach((g) => bins[Math.floor(g / 2)]++);
			const max = Math.max(...bins, 5);
			const bw = (R - L) / 51;
			ctx.fillStyle = "rgba(244,239,230,0.35)";
			bins.forEach((n, k) => {
				const hh = (n / max) * (bot - 40);
				ctx.fillRect(L + k * bw + 1, bot - hh, bw - 2, hh);
			});
			const line = (v, color, label, y) => {
				ctx.strokeStyle = color;
				ctx.lineWidth = 2;
				ctx.setLineDash([4, 4]);
				ctx.beginPath();
				ctx.moveTo(X(v), 18);
				ctx.lineTo(X(v), bot);
				ctx.stroke();
				ctx.setLineDash([]);
				ctx.fillStyle = color;
				ctx.textAlign = X(v) > w - 80 ? "right" : "left";
				ctx.fillText(label, X(v) + (ctx.textAlign === "left" ? 5 : -5), y);
			};
			line(result.mean, "rgba(244,239,230,0.6)", "Schnitt", 30);
			line(result.target, "#ff9ec7", "Ziel ⅔", 46);
		}
		ctx.fillStyle = ACC;
		ctx.beginPath();
		ctx.moveTo(X(Number(my.value)), bot - 2);
		ctx.lineTo(X(Number(my.value)) - 8, bot - 16);
		ctx.lineTo(X(Number(my.value)) + 8, bot - 16);
		ctx.fill();
		ctx.textAlign = "center";
		ctx.font = "600 12px Space Grotesk, sans-serif";
		ctx.fillText("du", X(Number(my.value)), bot - 20);
	}

	my.addEventListener("input", () => {
		document.getElementById("myOut").textContent = my.value;
		out.textContent = `Dein Tipp: ${my.value}`;
		others = null;
		draw();
	});
	depth.addEventListener("input", () => {
		document.getElementById("depthOut").textContent = DEPTH[depth.value];
		others = null;
		out.textContent = `Dein Tipp: ${my.value}`;
		draw();
	});
	document.getElementById("btnGuess").addEventListener("click", play);
	window.addEventListener("resize", draw);
	draw();
})();

// Spieltheorie: Falken und Tauben, Replikatordynamik
(() => {
	const canvas = document.getElementById("hawkCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.1 : 1.7));
	const vIn = document.getElementById("valV");
	const cIn = document.getElementById("costC");
	const out = document.getElementById("hawkOut");
	const note = document.getElementById("hawkNote");
	const HAWK = "#ff8a5c";
	const DOVE = "#f4efe6";
	let x = 0.1;
	let hist = [];
	let acc = 0;
	const V = () => Number(vIn.value);
	const C = () => Number(cIn.value);
	const ess = () => (C() > V() ? V() / C() : 1);

	function label() {
		document.getElementById("vvOut").textContent = V();
		document.getElementById("ccOut").textContent = C();
		note.textContent =
			C() > V()
				? `Vorhersage: ${Math.round(ess() * 100)} % Falken (V / C = ${V()} / ${C()}). Gibt es mehr, verletzen sie sich zu oft. Gibt es weniger, lohnt sich Kämpfen.`
				: "Die Beute ist mehr wert als jede Verletzung. Dann lohnt sich Kämpfen immer, und die Tauben sterben aus.";
	}
	[vIn, cIn].forEach((el) => el.addEventListener("input", label));
	label();

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const fH = x * (V() - C()) / 2 + (1 - x) * V();
		const fD = (1 - x) * (V() / 2);
		x += x * (1 - x) * (fH - fD) * (4 / Math.max(V(), C())) * dt;
		x = Math.min(0.999, Math.max(0.001, x));
		acc += dt;
		if (acc > 0.05) {
			acc = 0;
			hist.push(x);
			if (hist.length > 400) hist.shift();
		}
		ctx.clearRect(0, 0, w, h);

		// 100 Vögel als Punkte
		const n = Math.round(x * 100);
		const cols = 25;
		const cell = Math.min((w - 20) / cols, 18);
		for (let i = 0; i < 100; i++) {
			ctx.fillStyle = i < n ? HAWK : DOVE;
			ctx.globalAlpha = i < n ? 1 : 0.55;
			ctx.beginPath();
			ctx.arc(10 + (i % cols) * cell + cell / 2, 36 + Math.floor(i / cols) * cell + cell / 2, cell * 0.34, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;

		// Verlauf
		const top = 46 + cell * 4;
		const bot = h - 12;
		const Y = (v) => bot - v * (bot - top);
		ctx.strokeStyle = "rgba(255,255,255,0.1)";
		ctx.strokeRect(10.5, top + 0.5, w - 21, bot - top);
		if (C() > V()) {
			ctx.setLineDash([4, 5]);
			ctx.strokeStyle = "rgba(244,239,230,0.5)";
			ctx.beginPath();
			ctx.moveTo(10, Y(ess()));
			ctx.lineTo(w - 10, Y(ess()));
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = "rgba(244,239,230,0.6)";
			ctx.font = "11px JetBrains Mono, monospace";
			ctx.textAlign = "right";
			ctx.fillText(`V/C = ${Math.round(ess() * 100)} %`, w - 16, Y(ess()) - 6);
		}
		ctx.strokeStyle = HAWK;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		hist.forEach((v, i) => {
			const xx = 10 + (i / 399) * (w - 20);
			i ? ctx.lineTo(xx, Y(v)) : ctx.moveTo(xx, Y(v));
		});
		ctx.stroke();
		out.textContent = `${Math.round(x * 100)} % Falken`;
	});

	const restart = (v) => {
		x = v;
		hist = [];
	};
	document.getElementById("btnHawk").addEventListener("click", () => restart(0.1));
	document.getElementById("btnHawk90").addEventListener("click", () => restart(0.9));
})();

// Spieltheorie: Tragik der Allmende am Fischsee
(() => {
	const canvas = document.getElementById("lakeCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1 : 1.6));
	const catchIn = document.getElementById("catch");
	const btnFish = document.getElementById("btnFish");
	const btnQuota = document.getElementById("btnQuota");
	const tag = document.getElementById("lakeTag");
	const out = document.getElementById("lakeOut");
	const note = document.getElementById("lakeNote");
	const SEASONS = 10;
	const QUOTA = 3;
	const FISHERS = ["Du", "Fair", "Nachahmer", "Gierig"];
	const COLORS = ["#ff8a5c", "#7bdc9a", "#8fb8ff", "#ff6a8a"];
	let quota = false;
	let stock;
	let season;
	let hist;
	let total;
	let last;
	let fish = [];

	const reset = () => {
		stock = 100;
		season = 0;
		hist = [{ stock: 100, c: [0, 0, 0, 0] }];
		total = [0, 0, 0, 0];
		last = 3;
		btnFish.disabled = false;
		tag.textContent = `Saison 1 / ${SEASONS}`;
		out.textContent = "Dein Fang: 0";
		note.textContent = quota
			? `Fangquote: Niemand darf mehr als ${QUOTA} Fische pro Saison fangen. Alle halten sich daran, weil kontrolliert wird.`
			: "Im See schwimmen 100 Fische. Mehr passen nicht hinein. Die anderen: einer fair, einer macht dich nach, einer ist gierig.";
		fish = Array.from({ length: 100 }, () => ({ x: Math.random(), y: Math.random(), p: Math.random() * 6 }));
	};

	function season1() {
		const me = Number(catchIn.value);
		let c = [me, 3, season ? last + 1 : 3, 7];
		if (quota) c = c.map((v) => Math.min(v, QUOTA));
		const want = c.reduce((a, b) => a + b, 0);
		const f = want > stock ? stock / want : 1;
		c = c.map((v) => v * f);
		stock -= want * f;
		stock += 0.5 * stock * (1 - stock / 100); // Nachwuchs, am meisten bei halbvollem See
		c.forEach((v, k) => (total[k] += v));
		last = me;
		season++;
		hist.push({ stock, c });
		out.textContent = `Dein Fang: ${Math.round(total[0])}`;
		const r = Math.round;
		if (stock < 1) {
			stock = 0;
			btnFish.disabled = true;
			tag.textContent = `Saison ${season}: See leer`;
			note.textContent = `Der See ist leer gefischt. Du hast ${r(total[0])} Fische, der Gierige ${r(total[3])}. Ab jetzt fängt niemand mehr etwas, für immer.`;
		} else if (season >= SEASONS) {
			btnFish.disabled = true;
			tag.textContent = "Geschafft";
			const all = r(total.reduce((a, b) => a + b, 0));
			note.textContent =
				stock > 40
					? `Nach 10 Saisons leben noch ${r(stock)} Fische. Zusammen wurden ${all} gefangen, und der See liefert weiter. ${quota ? "Die Regel hat den Gierigen gebremst." : ""}`
					: `Nur noch ${r(stock)} Fische. Der See kippt bald. Du hast ${r(total[0])} gefangen, der Gierige ${r(total[3])}. ${quota ? "" : "Probier es mit Fangquote."}`;
		} else {
			tag.textContent = `Saison ${season + 1} / ${SEASONS}`;
			note.textContent = `Gefangen: du ${r(c[0])}, Fair ${r(c[1])}, Nachahmer ${r(c[2])}, Gierig ${r(c[3])}. Es schwimmen noch ${r(stock)} Fische. ${
				want > 12.5 && !quota ? "Mehr als 12 pro Saison wachsen nicht nach." : ""
			}`;
		}
	}

	whenVisible(canvas, (dt, t) => {
		const { w, h } = size;
		const lakeH = h * 0.5;
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = "rgba(90,140,220,0.18)";
		ctx.beginPath();
		ctx.roundRect(10, 34, w - 20, lakeH - 34, 18);
		ctx.fill();
		const n = Math.round(stock);
		ctx.fillStyle = "#c8dcff";
		for (let i = 0; i < n; i++) {
			const f = fish[i];
			const x = 26 + ((f.x + Math.sin(t * 0.4 + f.p) * 0.03 + 1) % 1) * (w - 52);
			const y = 46 + f.y * (lakeH - 58);
			const dir = Math.cos(t * 0.4 + f.p) > 0 ? 1 : -1;
			ctx.beginPath();
			ctx.ellipse(x, y, 5, 2.4, 0, 0, Math.PI * 2);
			ctx.moveTo(x - 5 * dir, y);
			ctx.lineTo(x - 9 * dir, y - 3);
			ctx.lineTo(x - 9 * dir, y + 3);
			ctx.fill();
		}

		// Fänge pro Saison als gestapelte Balken, Bestand als Linie
		const top = lakeH + 18;
		const bot = h - 20;
		const bw = (w - 20) / SEASONS;
		const Y = (v) => bot - (v / 100) * (bot - top);
		hist.slice(1).forEach((s, k) => {
			let y = bot;
			s.c.forEach((v, j) => {
				const hh = (v / 100) * (bot - top) * 2.5;
				ctx.fillStyle = COLORS[j];
				ctx.fillRect(10 + k * bw + bw * 0.25, y - hh, bw * 0.5, hh);
				y -= hh;
			});
		});
		ctx.strokeStyle = "#c8dcff";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		hist.forEach((s, k) => {
			const x = 10 + k * bw;
			k ? ctx.lineTo(x, Y(s.stock)) : ctx.moveTo(x, Y(s.stock));
		});
		ctx.stroke();
		ctx.font = "11px JetBrains Mono, monospace";
		ctx.textAlign = "left";
		FISHERS.forEach((name, k) => {
			ctx.fillStyle = COLORS[k];
			ctx.fillText(name, 12 + k * Math.min(90, (w - 24) / 4), h - 4);
		});
	});

	catchIn.addEventListener("input", () => {
		const v = Number(catchIn.value);
		document.getElementById("catchOut").textContent = `${v} ${v === 1 ? "Fisch" : "Fische"}${quota && v > QUOTA ? ` (erlaubt: ${QUOTA})` : ""}`;
	});
	btnFish.addEventListener("click", season1);
	btnQuota.addEventListener("click", () => {
		quota = !quota;
		btnQuota.setAttribute("aria-pressed", quota);
		reset();
		catchIn.dispatchEvent(new Event("input"));
	});
	document.getElementById("btnLakeReset").addEventListener("click", reset);
	reset();
})();
