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
