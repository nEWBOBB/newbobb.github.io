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
