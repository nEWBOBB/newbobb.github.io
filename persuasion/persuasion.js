// Überzeugen: Cialdinis Prinzipien in Beispielsätzen erkennen
(() => {
	const P = ["Gegenseitigkeit", "Knappheit", "Autorität", "Konsistenz", "Sympathie", "Soziale Bewährtheit"];
	const CASES = [
		{ where: "Online-Shop", text: "Nur noch 2 Stück auf Lager! 14 Personen sehen sich diesen Artikel gerade an.", p: 1, why: "„Nur noch 2“ macht das Produkt knapp. (Die 14 Personen sind übrigens ein zweiter Hebel: soziale Bewährtheit.)" },
		{ where: "Zahnpasta-Werbung", text: "Von Zahnärzten empfohlen. Klinisch getestet.", p: 2, why: "Zahnärzte und „klinisch“ leihen dem Produkt die Glaubwürdigkeit von Experten." },
		{ where: "Supermarkt", text: "Probier doch mal ein Stück! Ist gratis.", p: 0, why: "Wer etwas geschenkt bekommt, fühlt sich verpflichtet. Viele kaufen danach die ganze Packung." },
		{ where: "Hotelzimmer", text: "75 % der Gäste in diesem Zimmer haben ihre Handtücher mehrfach verwendet.", p: 5, why: "Ein berühmtes Experiment: Dieser Satz wirkte besser als jeder Umwelt-Appell. Wir orientieren uns an anderen." },
		{ where: "Spendensammler", text: "Sie sind doch auch für Tierschutz, oder? … Dann unterschreiben Sie hier.", p: 3, why: "Erst ein kleines Ja, dann die große Bitte. Wir wollen zu dem stehen, was wir gerade gesagt haben." },
		{ where: "Influencer", text: "Ihr wisst, ich empfehle euch nur Sachen, die ich selbst liebe. 💛 Code: LENA10", p: 4, why: "Wer sich wie ein Freund anfühlt, dem glauben wir mehr. Sympathie schlägt Argumente." },
		{ where: "Newsletter", text: "Das Angebot endet um Mitternacht. Danach nie wieder zu diesem Preis.", p: 1, why: "Eine Frist macht das Angebot knapp. Der Zeitdruck soll verhindern, dass du in Ruhe nachdenkst." },
		{ where: "App-Store", text: "★★★★★ Über 2 Millionen Downloads. Die beliebteste App ihrer Art.", p: 5, why: "Viele Downloads und Sterne sagen: Die anderen haben schon geprüft, du kannst einfach folgen." },
	];
	const box = document.getElementById("principles");
	const card = document.getElementById("adCard");
	const where = document.getElementById("adWhere");
	const text = document.getElementById("adText");
	const out = document.getElementById("adOut");
	const note = document.getElementById("adNote");
	const btnNext = document.getElementById("btnNext");
	box.innerHTML = P.map((p, i) => `<button class="btn" type="button" data-i="${i}">${p}</button>`).join("");
	const buttons = [...box.querySelectorAll("button")];
	let i = 0;
	let right = 0;

	function show() {
		const c = CASES[i];
		card.classList.add("is-out");
		setTimeout(() => {
			where.textContent = c.where;
			text.textContent = c.text;
			card.classList.remove("is-out");
		}, 200);
		buttons.forEach((b) => {
			b.disabled = false;
			b.classList.remove("is-right", "is-wrong");
		});
		btnNext.hidden = true;
		out.textContent = `${i + 1} / ${CASES.length}`;
		note.textContent = "Wähle einen Hebel.";
	}

	box.addEventListener("click", (e) => {
		const b = e.target.closest("button");
		if (!b || b.disabled) return;
		const c = CASES[i];
		const pick = Number(b.dataset.i);
		buttons.forEach((x) => (x.disabled = true));
		buttons[c.p].classList.add("is-right");
		if (pick === c.p) right++;
		else b.classList.add("is-wrong");
		note.textContent = (pick === c.p ? "Richtig. " : `Nicht ganz, das ist ${P[c.p]}. `) + c.why;
		btnNext.hidden = false;
		btnNext.textContent = i + 1 < CASES.length ? "Weiter →" : "Ergebnis";
		btnNext.focus({ preventScroll: true });
	});

	btnNext.addEventListener("click", () => {
		if (i >= CASES.length) {
			i = 0;
			right = 0;
			return show();
		}
		i++;
		if (i < CASES.length) return show();
		where.textContent = "Ergebnis";
		text.textContent = `${right} von ${CASES.length} Tricks erkannt.`;
		note.textContent =
			right >= 6
				? "Stark. Dir macht so schnell keiner etwas vor. Achte trotzdem darauf: Die Hebel wirken auch, wenn man sie kennt."
				: "Kein Problem. Genau dafür ist die Übung da. Achte diese Woche mal darauf, wo dir diese Sätze begegnen.";
		btnNext.textContent = "↺ Nochmal";
	});
	show();
})();

// Überzeugen: Framing-Effekt nach Tversky und Kahneman
(() => {
	const FRAMES = [
		{
			key: "gain",
			name: "Gewinn-Frame",
			text: "Eine neue Seuche bedroht 600 Menschen. Zwei Programme stehen zur Wahl.",
			opts: ["Programm A: 200 Menschen werden sicher gerettet.", "Programm B: Mit 1/3 Wahrscheinlichkeit werden alle 600 gerettet, mit 2/3 niemand."],
		},
		{
			key: "loss",
			name: "Verlust-Frame",
			text: "Eine neue Seuche bedroht 600 Menschen. Zwei Programme stehen zur Wahl.",
			opts: ["Programm C: 400 Menschen werden sicher sterben.", "Programm D: Mit 1/3 Wahrscheinlichkeit stirbt niemand, mit 2/3 sterben alle 600."],
		},
	];
	const STUDY = { gain: 72, loss: 22 }; // Anteil „sicher“ in der Originalstudie von 1981
	const card = document.getElementById("frCard");
	const where = document.getElementById("frWhere");
	const text = document.getElementById("frText");
	const tag = document.getElementById("frTag");
	const choices = document.getElementById("frChoices");
	const result = document.getElementById("frResult");
	const note = document.getElementById("frNote");
	let order;
	let step;
	let picks;

	function start() {
		order = Math.random() < 0.5 ? [0, 1] : [1, 0];
		step = 0;
		picks = {};
		result.hidden = true;
		show();
	}

	function show() {
		const f = FRAMES[order[step]];
		card.classList.add("is-out");
		setTimeout(() => {
			where.textContent = step ? "Szenario, ein paar Tage später" : "Szenario";
			text.textContent = f.text;
			card.classList.remove("is-out");
		}, 200);
		tag.textContent = `Frage ${step + 1} / 2`;
		choices.hidden = false;
		choices.innerHTML = f.opts.map((o, k) => `<button class="btn" type="button" data-k="${k}">${o}</button>`).join("");
		note.textContent = step ? "Kommt dir das bekannt vor? Entscheide trotzdem spontan." : "Es gibt keine falsche Antwort.";
	}

	function finish() {
		choices.innerHTML = `<button class="btn primary" type="button" data-again>↺ Nochmal</button>`;
		where.textContent = "Auflösung";
		text.textContent = "A und C sind dasselbe: 200 leben, 400 sterben. B und D sind auch dasselbe. Nur die Worte sind anders.";
		tag.textContent = "Ergebnis";
		const same = picks.gain === picks.loss;
		result.hidden = false;
		result.innerHTML = `
			<div style="--c:#7bdc9a"><span>„gerettet“: sicher</span><i></i><b>${STUDY.gain} %</b></div>
			<div style="--c:#ff6a8a"><span>„sterben“: sicher</span><i></i><b>${STUDY.loss} %</b></div>`;
		requestAnimationFrame(() =>
			result.querySelectorAll("i").forEach((el, k) => (el.style.width = `${k ? STUDY.loss : STUDY.gain}%`))
		);
		const word = (k) => (k === 0 ? "sicher" : "riskant");
		note.textContent = same
			? `Du hast beide Male ${word(picks.gain)} gewählt. Konsequent! In der Studie von 1981 kippte die Mehrheit: 72 % wählten bei „gerettet“ sicher, aber nur 22 % bei „sterben“.`
			: `Du hast bei „gerettet“ ${word(picks.gain)} und bei „sterben“ ${word(picks.loss)} gewählt, obwohl es dieselbe Entscheidung war. So ging es auch den meisten in der Studie.`;
	}

	choices.addEventListener("click", (e) => {
		const b = e.target.closest("button");
		if (!b) return;
		if (b.hasAttribute("data-again")) return start();
		picks[FRAMES[order[step]].key] = Number(b.dataset.k);
		step++;
		step < 2 ? show() : finish();
	});
	start();
})();

// Überzeugen: Ethos, Pathos und Logos erkennen
(() => {
	const P = ["Ethos", "Pathos", "Logos"];
	const CASES = [
		{ where: "Arzt im Fernsehen", text: "Ich behandle seit 30 Jahren Herzpatienten. Glauben Sie mir: Bewegung ist die beste Medizin.", p: 0, why: "Er überzeugt mit seiner Erfahrung und seinem Ansehen, nicht mit Daten." },
		{ where: "Spendenaufruf", text: "Mia ist sieben. Jeden Morgen läuft sie zwei Stunden, um Wasser zu holen. Statt zur Schule.", p: 1, why: "Ein einzelnes Kind mit Namen berührt uns viel stärker als jede Statistik." },
		{ where: "Stadtrat", text: "Der neue Radweg kostet 2 Mio. €. Er spart jährlich 300 000 € Unfallkosten. Nach 7 Jahren hat er sich bezahlt.", p: 2, why: "Zahlen und eine klare Rechnung: reiner Verstand." },
		{ where: "Werbung", text: "Stell dir vor, wie stolz du bist, wenn du endlich die Ziellinie überquerst.", p: 1, why: "Hier wird ein Gefühl gemalt: Stolz, Triumph. Ein Argument kommt nicht vor." },
		{ where: "Bewerbung", text: "Als Kapitänin meines Teams habe ich gelernt, Verantwortung zu übernehmen, auch wenn es schwierig wurde.", p: 0, why: "Sie baut Vertrauen in ihren Charakter auf. Das ist Ethos." },
		{ where: "Debatte", text: "Wenn alle Menschen sterblich sind und Sokrates ein Mensch ist, dann ist Sokrates sterblich.", p: 2, why: "Ein klassischer logischer Schluss, das Lieblingsbeispiel von Aristoteles selbst." },
		{ where: "Wahlkampf", text: "Sie nehmen uns unsere Jobs, unsere Zukunft und die Zukunft unserer Kinder!", p: 1, why: "Angst und Wut sind starke Gefühle. Pathos ohne Logos ist das Werkzeug von Demagogen." },
		{ where: "Produktvergleich", text: "Akku A hält 18 Stunden, Akku B nur 11. A kostet dabei nur 5 € mehr.", p: 2, why: "Ein nachprüfbarer Vergleich in Zahlen." },
		{ where: "Werbespot", text: "Ich bin seit zehn Jahren Profisportler. Und ich vertraue nur auf diese Schuhe.", p: 0, why: "Er leiht den Schuhen seine Glaubwürdigkeit. (Ob er dafür bezahlt wird, sagt er nicht.)" },
	];
	const box = document.getElementById("rhButtons");
	const card = document.getElementById("rhCard");
	const where = document.getElementById("rhWhere");
	const text = document.getElementById("rhText");
	const out = document.getElementById("rhOut");
	const note = document.getElementById("rhNote");
	const btnNext = document.getElementById("rhNext");
	box.innerHTML = P.map((p, i) => `<button class="btn" type="button" data-i="${i}">${p}</button>`).join("");
	const buttons = [...box.querySelectorAll("button")];
	let i = 0;
	let right = 0;

	function show() {
		const c = CASES[i];
		card.classList.add("is-out");
		setTimeout(() => {
			where.textContent = c.where;
			text.textContent = c.text;
			card.classList.remove("is-out");
		}, 200);
		buttons.forEach((b) => {
			b.disabled = false;
			b.classList.remove("is-right", "is-wrong");
		});
		btnNext.hidden = true;
		out.textContent = `${i + 1} / ${CASES.length}`;
		note.textContent = "Wähle Ethos, Pathos oder Logos.";
	}

	box.addEventListener("click", (e) => {
		const b = e.target.closest("button");
		if (!b || b.disabled) return;
		const c = CASES[i];
		const pick = Number(b.dataset.i);
		buttons.forEach((x) => (x.disabled = true));
		buttons[c.p].classList.add("is-right");
		if (pick === c.p) right++;
		else b.classList.add("is-wrong");
		note.textContent = (pick === c.p ? "Richtig. " : `Nicht ganz, das ist ${P[c.p]}. `) + c.why;
		btnNext.hidden = false;
		btnNext.textContent = i + 1 < CASES.length ? "Weiter →" : "Ergebnis";
	});

	btnNext.addEventListener("click", () => {
		if (i >= CASES.length) {
			i = 0;
			right = 0;
			return show();
		}
		i++;
		if (i < CASES.length) return show();
		where.textContent = "Ergebnis";
		text.textContent = `${right} von ${CASES.length} richtig erkannt.`;
		note.textContent =
			right >= 7
				? "Sehr gut. Du durchschaust, womit eine Botschaft arbeitet. Probier es bei der nächsten Werbung oder Rede aus."
				: "Ein guter Anfang. Tipp: Frag nach dem Wer (Ethos), dem Gefühl (Pathos) und dem Beweis (Logos).";
		btnNext.textContent = "↺ Nochmal";
	});
	show();
})();
