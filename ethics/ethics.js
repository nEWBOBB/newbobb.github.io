// Ethik: sechs Dilemmas, jede Antwort zählt für eine der drei großen Denkschulen
(() => {
	// 0 = Folgen (Utilitarismus), 1 = Pflichten (Kant), 2 = Charakter (Tugendethik)
	const D = [
		{ title: "Die Weiche", text: "Eine Straßenbahn rast auf fünf Arbeiter zu. Du stehst an einer Weiche. Stellst du um, fährt sie auf ein Gleis, auf dem nur ein Arbeiter steht.", options: [["Umstellen. Einer statt fünf.", 0], ["Nicht eingreifen. Ich will niemanden aktiv töten.", 1]] },
		{ title: "Die Brücke", text: "Wieder rast die Bahn auf fünf Menschen zu. Diesmal stehst du auf einer Brücke neben einem sehr großen Mann. Stößt du ihn hinunter, stoppt er die Bahn. Er stirbt, die fünf leben.", options: [["Stoßen. Die Rechnung ist dieselbe wie bei der Weiche.", 0], ["Nicht stoßen. Ich darf einen Menschen nicht als Werkzeug benutzen.", 1], ["Nicht stoßen. So ein Mensch will ich nicht sein.", 2]] },
		{ title: "Der Mann an der Tür", text: "Dein Freund versteckt sich bei dir. Ein Mann mit Messer klingelt und fragt, ob er da ist.", options: [["Lügen: „Nein, er ist nicht hier.“ Das rettet ein Leben.", 0], ["Nicht lügen. Lügen ist immer falsch, egal warum.", 1], ["Tür zu, Polizei rufen. Klug handeln statt eine Regel befolgen.", 2]] },
		{ title: "Das Portemonnaie", text: "Du findest ein Portemonnaie mit 500 € und dem Ausweis eines sehr reichen Mannes. Er würde es kaum vermissen.", options: [["Das Geld einer Hilfsorganisation spenden. Dort bewirkt es mehr.", 0], ["Zurückgeben. Es gehört ihm, Punkt.", 1], ["Zurückgeben. Ich will ein ehrlicher Mensch sein, auch wenn es keiner sieht.", 2]] },
		{ title: "Das Essen", text: "Ein Freund hat zum ersten Mal für dich gekocht und strahlt. Es schmeckt wirklich nicht gut. Er fragt: „Und?“", options: [["„Super lecker!“ Er freut sich, niemand nimmt Schaden.", 0], ["Ehrlich sagen, dass es dir nicht schmeckt.", 1], ["Loben, was gut war, und freundlich einen Tipp geben.", 2]] },
		{ title: "Der Unfall", text: "Ein guter Freund hat betrunken ein parkendes Auto beschädigt und ist weitergefahren. Nur du weißt es. Er bittet dich zu schweigen.", options: [["Schweigen. Eine Anzeige zerstört sein Leben mehr, als sie nützt.", 0], ["Melden. Recht ist Recht, auch bei Freunden.", 1], ["Ihn überzeugen, sich selbst zu melden. Ein echter Freund hilft ihm, das Richtige zu tun.", 2]] },
	];
	const NAMES = ["Folgen", "Pflichten", "Charakter"];
	const ABOUT = [
		"Du denkst wie ein Utilitarist: Für dich zählt, was am Ende herauskommt. Stärke: pragmatisch und fair für viele. Risiko: Der Einzelne kann für die Mehrheit geopfert werden.",
		"Du denkst wie Kant: Für dich gibt es Grenzen, die man nicht überschreitet. Stärke: verlässlich und respektvoll gegenüber jedem Menschen. Risiko: Regeln können starr werden, auch wenn es schadet.",
		"Du denkst wie Aristoteles: Für dich zählt, was für ein Mensch du dabei bist. Stärke: klug und menschlich im Einzelfall. Risiko: Es ist schwer zu sagen, was „ein guter Mensch“ genau tun würde.",
	];
	const title = document.getElementById("dTitle");
	const text = document.getElementById("dText");
	const tag = document.getElementById("dTag");
	const choices = document.getElementById("choices");
	const lean = document.getElementById("lean");
	const note = document.getElementById("dNote");
	let i = 0;
	let score = [0, 0, 0];

	function show() {
		const d = D[i];
		title.textContent = d.title;
		text.textContent = d.text;
		tag.textContent = `Dilemma ${i + 1} / ${D.length}`;
		choices.hidden = false;
		lean.hidden = true;
		choices.innerHTML = d.options.map(([t, k]) => `<button class="btn" type="button" data-k="${k}">${t}</button>`).join("");
		note.textContent = "";
	}

	function finish() {
		const total = score.reduce((a, b) => a + b, 0);
		const top = score.indexOf(Math.max(...score));
		title.textContent = `Dein Schwerpunkt: ${NAMES[top]}`;
		text.textContent = ABOUT[top];
		tag.textContent = "Ergebnis";
		choices.innerHTML = `<button class="btn primary" type="button" data-restart>↺ Nochmal</button>`;
		lean.hidden = false;
		lean.querySelectorAll("div").forEach((row, k) => {
			row.querySelector("b").textContent = score[k];
			requestAnimationFrame(() => (row.querySelector("i").style.width = `${(score[k] / total) * 100}%`));
		});
		note.textContent = "Die meisten Menschen mischen alle drei. Spannend ist, wann du zwischen ihnen wechselst, zum Beispiel zwischen Weiche und Brücke.";
	}

	choices.addEventListener("click", (e) => {
		const b = e.target.closest("button");
		if (!b) return;
		if (b.hasAttribute("data-restart")) {
			i = 0;
			score = [0, 0, 0];
			lean.querySelectorAll("i").forEach((x) => (x.style.width = "0"));
			return show();
		}
		score[Number(b.dataset.k)]++;
		i++;
		i < D.length ? show() : finish();
	});
	show();
})();

// Ethik: Rawls' Schleier des Nichtwissens
(() => {
	const WORLDS = [
		{ name: "Gleichland", desc: "Alle bekommen genau gleich viel.", q: [20, 20, 20, 20, 20] },
		{ name: "Leistungsland", desc: "Wer mehr leistet, bekommt deutlich mehr.", q: [10, 20, 35, 60, 125] },
		{ name: "Netzland", desc: "Ungleich, aber mit starkem Sicherheitsnetz.", q: [24, 30, 38, 50, 68] },
		{ name: "Jackpotland", desc: "Wenige werden sehr reich, viele bleiben arm.", q: [3, 10, 18, 40, 230] },
	];
	const MAX = 230;
	const box = document.getElementById("worlds");
	const btn = document.getElementById("btnVeil");
	const out = document.getElementById("veilOut");
	const note = document.getElementById("veilNote");
	const avg = (q) => q.reduce((a, b) => a + b, 0) / q.length;
	let pick = -1;

	box.innerHTML = WORLDS.map(
		(w, i) => `<button class="world" type="button" data-i="${i}" aria-pressed="false">
			<b>${w.name}</b><small>${w.desc} Schnitt ${Math.round(avg(w.q))}</small>
			<span class="q">${w.q.map((v) => `<span style="height:${Math.sqrt(v / MAX) * 100}%"><em>${v}</em></span>`).join("")}</span>
		</button>`
	).join("");
	const cards = [...box.querySelectorAll(".world")];

	box.addEventListener("click", (e) => {
		const c = e.target.closest(".world");
		if (!c) return;
		pick = Number(c.dataset.i);
		cards.forEach((x) => x.setAttribute("aria-pressed", x === c));
		box.querySelectorAll(".q span.me").forEach((s) => s.classList.remove("me"));
		btn.disabled = false;
		btn.textContent = "🎭 Schleier lüften";
		out.textContent = WORLDS[pick].name;
		note.textContent =
			pick === 0
				? "Niemand fällt tief, aber alle bleiben ärmer, weil sich Anstrengung nicht lohnt."
				: pick === 1
					? "Hoher Schnitt, aber das unterste Fünftel hat nur halb so viel wie in Gleichland."
					: pick === 2
						? "Das wäre Rawls' Wahl: Den Ärmsten geht es hier besser als in jeder anderen Welt."
						: "Der höchste Durchschnitt, der Utilitarist wäre zufrieden. Aber unten wird es sehr eng.";
	});

	btn.addEventListener("click", () => {
		if (pick < 0) return;
		const w = WORLDS[pick];
		const bars = [...cards[pick].querySelectorAll(".q span")];
		let k = 0;
		let n = 0;
		btn.disabled = true;
		const spin = () => {
			bars.forEach((b) => b.classList.remove("me"));
			k = Math.floor(Math.random() * 5);
			bars[k].classList.add("me");
			if (++n < 14) return setTimeout(spin, 60 + n * 12);
			btn.disabled = false;
			btn.textContent = "🎲 Nochmal geboren werden";
			const worst = Math.min(...w.q);
			out.textContent = `Du: ${w.q[k]} T€`;
			note.textContent =
				worst === Math.max(...w.q)
					? `Egal wo du landest: ${w.q[k]} Tausend Euro, wie alle anderen. Sicher, aber alle haben weniger als das ärmste Fünftel in Netzland.`
					: k === 0
						? `Du bist im untersten Fünftel gelandet: ${w.q[k]} Tausend Euro im Jahr. ${worst >= 24 ? "Zum Glück hast du die Welt mit dem besten Boden gewählt." : "Würdest du jetzt noch genauso wählen?"}`
						: k === 4
							? `Glück gehabt: oberstes Fünftel mit ${w.q[k]} Tausend Euro. Aber jeder Fünfte hier lebt mit ${worst}.`
							: `Du landest in der Mitte mit ${w.q[k]} Tausend Euro. Das unterste Fünftel hat ${worst}.`;
		};
		spin();
	});
})();

// Ethik: Kants Universalisierung am Trampelpfad
(() => {
	const canvas = document.getElementById("lawnCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.15 : 1.7));
	const share = document.getElementById("share");
	const out = document.getElementById("lawnOut");
	const note = document.getElementById("lawnNote");
	const GW = 64;
	const GH = 38;
	let grass = new Float32Array(GW * GH).fill(1);
	let walkers = [];
	let spawn = 0;
	let acc = 0;

	const label = () => {
		document.getElementById("shareOut").textContent = `${share.value} %`;
	};
	share.addEventListener("input", label);
	label();

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const rate = (Number(share.value) / 100) * 12; // Menschen pro Sekunde
		spawn += rate * dt;
		while (spawn >= 1) {
			spawn--;
			walkers.push({ t: 0, off: (Math.random() + Math.random() + Math.random() - 1.5) * 2.2, v: 0.22 + Math.random() * 0.06 });
		}
		// Gras wächst nach
		for (let i = 0; i < grass.length; i++) grass[i] = Math.min(1, grass[i] + 0.05 * dt);
		// Menschen gehen diagonal und zertreten das Gras unter sich
		const pos = (p) => {
			const x = 4 + p.t * (GW - 8);
			const y = GH - 4 - p.t * (GH - 8);
			// senkrecht zur Laufrichtung versetzt
			return [x + p.off * 0.5, y + p.off * 0.85];
		};
		for (const p of walkers) {
			p.t += p.v * dt;
			const [x, y] = pos(p);
			const i = Math.round(x);
			const j = Math.round(y);
			if (i >= 0 && i < GW && j >= 0 && j < GH) grass[j * GW + i] = Math.max(0, grass[j * GW + i] - 0.9 * dt);
		}
		walkers = walkers.filter((p) => p.t < 1);

		ctx.clearRect(0, 0, w, h);
		const cw = w / GW;
		const ch = h / GH;
		let dead = 0;
		for (let j = 0; j < GH; j++)
			for (let i = 0; i < GW; i++) {
				const g = grass[j * GW + i];
				if (g < 0.5) dead++;
				ctx.fillStyle = `rgb(${Math.round(120 - 50 * g)},${Math.round(90 + 90 * g)},${Math.round(50 + 10 * g)})`;
				ctx.fillRect(i * cw, j * ch, cw + 0.5, ch + 0.5);
			}
		// Wege an den Rändern
		ctx.fillStyle = "rgba(200,190,170,0.35)";
		ctx.fillRect(0, h - ch * 2, w, ch * 2);
		ctx.fillRect(w - cw * 2, 0, cw * 2, h);
		ctx.fillStyle = "#f4efe6";
		for (const p of walkers) {
			const [x, y] = pos(p);
			ctx.beginPath();
			ctx.arc(x * cw, y * ch, 3, 0, Math.PI * 2);
			ctx.fill();
		}

		acc += dt;
		if (acc > 0.5) {
			acc = 0;
			const pathCells = 280; // ungefähre Fläche des möglichen Pfads
			const pct = Math.min(100, Math.round((dead / pathCells) * 100));
			out.textContent = `Pfad: ${pct} %`;
			const s = Number(share.value);
			note.textContent =
				s === 0
					? "Alle nehmen den Umweg. Der Rasen bleibt perfekt."
					: pct < 10
						? `${s} % laufen quer, und man sieht fast nichts. Für jeden Einzelnen scheint es harmlos.`
						: pct < 50
							? "Jetzt kippt es: Das Gras kommt nicht mehr hinterher. Ein Pfad entsteht."
							: "Ein brauner Trampelpfad. Kein Einzelner war schuld, aber die Regel „Ich darf das“ für alle zerstört den Rasen.";
		}
	});

	document.getElementById("btnLawn").addEventListener("click", () => grass.fill(1));
})();
