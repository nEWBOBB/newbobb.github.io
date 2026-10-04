// Psychologie: Stroop-Test mit Reaktionszeiten
(() => {
	const COLORS = [
		{ word: "ROT", css: "#ff6a6a" },
		{ word: "BLAU", css: "#6aa8ff" },
		{ word: "GRÜN", css: "#5fd68a" },
		{ word: "GELB", css: "#ffd84d" },
	];
	const TRIALS = 20;
	const word = document.getElementById("word");
	const hint = document.getElementById("hint");
	const out = document.getElementById("stroopOut");
	const note = document.getElementById("stroopNote");
	const inks = document.getElementById("inks");
	const btn = document.getElementById("btnStroop");
	const bars = document.getElementById("bars");

	inks.innerHTML = COLORS.map(
		(c, i) => `<button class="btn" type="button" data-i="${i}" style="--c:${c.css}" disabled>${c.word.toLowerCase()} <kbd>${i + 1}</kbd></button>`
	).join("");
	const buttons = [...inks.querySelectorAll("button")];

	let queue = [];
	let current = null;
	let shownAt = 0;
	let results = [];
	let active = false;

	function makeQueue() {
		const q = [];
		for (let i = 0; i < TRIALS; i++) {
			const ink = Math.floor(Math.random() * 4);
			let text = ink;
			if (i % 2) while (text === ink) text = Math.floor(Math.random() * 4);
			q.push({ ink, text, same: ink === text });
		}
		// mischen
		for (let i = q.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[q[i], q[j]] = [q[j], q[i]];
		}
		return q;
	}

	function next() {
		current = queue.shift();
		if (!current) return finish();
		word.textContent = "+";
		word.style.color = "var(--faint)";
		setTimeout(() => {
			if (!active) return;
			word.textContent = COLORS[current.text].word;
			word.style.color = COLORS[current.ink].css;
			shownAt = performance.now();
		}, 350 + Math.random() * 300);
	}

	function answer(i) {
		if (!active || !current || !shownAt) return;
		const ms = performance.now() - shownAt;
		shownAt = 0;
		const ok = i === current.ink;
		results.push({ same: current.same, ms, ok });
		out.textContent = `${results.length} / ${TRIALS}`;
		hint.textContent = ok ? "" : "Ups, das war die Bedeutung, nicht die Farbe.";
		next();
	}

	function finish() {
		active = false;
		buttons.forEach((b) => (b.disabled = true));
		btn.disabled = false;
		btn.textContent = "↺ Nochmal";
		const avg = (same) => {
			const r = results.filter((x) => x.same === same && x.ok);
			return r.length ? r.reduce((s, x) => s + x.ms, 0) / r.length : NaN;
		};
		const a = avg(true);
		const b = avg(false);
		const errors = results.filter((x) => !x.ok).length;
		bars.hidden = false;
		const max = Math.max(a || 0, b || 0, 1);
		document.getElementById("msSame").textContent = Number.isNaN(a) ? "–" : `${Math.round(a)} ms`;
		document.getElementById("msDiff").textContent = Number.isNaN(b) ? "–" : `${Math.round(b)} ms`;
		requestAnimationFrame(() => {
			document.getElementById("barSame").style.width = `${((a || 0) / max) * 100}%`;
			document.getElementById("barDiff").style.width = `${((b || 0) / max) * 100}%`;
		});
		word.textContent = "Fertig!";
		word.style.color = "var(--ink)";
		const diff = Math.round(b - a);
		hint.textContent = errors ? `${errors} Fehler, fast immer bei unpassenden Wörtern.` : "Kein einziger Fehler.";
		note.textContent =
			diff > 0
				? `Bei unpassenden Wörtern warst du ${diff} ms langsamer. Das ist der Stroop-Effekt: Dein Lesen hat dazwischengefunkt.`
				: "Diesmal kein Unterschied. Sehr selten! Probier es nochmal und achte nur auf die Farbe.";
	}

	btn.addEventListener("click", () => {
		queue = makeQueue();
		results = [];
		active = true;
		bars.hidden = true;
		btn.disabled = true;
		buttons.forEach((b) => (b.disabled = false));
		out.textContent = `0 / ${TRIALS}`;
		hint.textContent = "";
		note.textContent = "Nur die Farbe zählt. Nicht lesen!";
		next();
	});
	inks.addEventListener("click", (e) => {
		const b = e.target.closest("button");
		if (b) answer(Number(b.dataset.i));
	});
	document.addEventListener("keydown", (e) => {
		const n = Number(e.key);
		if (active && n >= 1 && n <= 4) {
			e.preventDefault();
			answer(n - 1);
		}
	});
})();
