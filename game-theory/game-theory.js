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
