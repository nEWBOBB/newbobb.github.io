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

// Psychologie: Zahlenspanne des Arbeitsgedächtnisses
(() => {
	const digit = document.getElementById("spanDigit");
	const hint = document.getElementById("spanHint");
	const out = document.getElementById("spanOut");
	const note = document.getElementById("spanNote");
	const btn = document.getElementById("btnSpan");
	const input = document.getElementById("spanIn");
	const ok = document.getElementById("btnSpanOk");
	let len = 3;
	let fails = 0;
	let best = 0;
	let seq = "";
	let timer;

	function show() {
		seq = "";
		for (let i = 0; i < len; i++) {
			let d;
			do d = String(Math.floor(Math.random() * 10));
			while (d === seq[seq.length - 1]);
			seq += d;
		}
		btn.disabled = true;
		input.disabled = ok.disabled = true;
		input.value = "";
		hint.textContent = `${len} Ziffern · gut merken`;
		let i = 0;
		const tick = () => {
			if (i < seq.length) {
				digit.textContent = seq[i++];
				timer = setTimeout(() => {
					digit.textContent = "";
					timer = setTimeout(tick, 220);
				}, 700);
			} else {
				digit.textContent = "?";
				hint.textContent = "Jetzt eintippen";
				input.disabled = ok.disabled = false;
				input.focus({ preventScroll: true });
			}
		};
		digit.textContent = "";
		timer = setTimeout(tick, 500);
	}

	function check() {
		if (input.disabled) return;
		const right = input.value.replace(/\D/g, "") === seq;
		input.disabled = ok.disabled = true;
		if (right) {
			best = Math.max(best, len);
			out.textContent = `Bestwert ${best}`;
			fails = 0;
			digit.textContent = "✓";
			len++;
			hint.textContent = `Richtig! Weiter mit ${len} Ziffern`;
			timer = setTimeout(show, 1100);
		} else {
			fails++;
			digit.textContent = "✗";
			hint.textContent = `Es war ${seq}`;
			if (fails >= 2) {
				btn.disabled = false;
				btn.textContent = "↺ Nochmal";
				note.textContent = best
					? `Deine Zahlenspanne: ${best} Ziffern. ${
							best >= 8 ? "Weit über dem Durchschnitt! Hast du Päckchen gebildet?" : best >= 6 ? "Genau im typischen Bereich von 7 ± 2." : "Etwas unter dem Schnitt. Versuch beim nächsten Mal, Paare zu bilden: „47“ statt „4, 7“."
						}`
					: "Gleich nochmal versuchen, beim ersten Mal ist man oft nervös.";
				len = 3;
				fails = 0;
			} else timer = setTimeout(show, 1600);
		}
	}

	btn.addEventListener("click", () => {
		clearTimeout(timer);
		best = 0;
		out.textContent = "Bestwert –";
		note.textContent = "Nach zwei Fehlern hintereinander ist Schluss.";
		show();
	});
	ok.addEventListener("click", check);
	input.addEventListener("keydown", (e) => e.key === "Enter" && check());
})();

// Psychologie: Basisraten-Fehler mit 1000 Menschen
(() => {
	const canvas = document.getElementById("bayesCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.25 : 1.6));
	const prev = document.getElementById("prev");
	const sens = document.getElementById("sens");
	const fpr = document.getElementById("fpr");
	const out = document.getElementById("bayesOut");
	const note = document.getElementById("bayesNote");
	const TP = "#ff9ec7";
	const FP = "#ffd166";
	const pct = (v) => `${v.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;

	function draw() {
		const { w, h } = size;
		const p = Number(prev.value) / 1000;
		const sick = Math.round(1000 * p);
		const tp = Math.round(sick * (Number(sens.value) / 100));
		const fn = sick - tp;
		const fp = Math.round((1000 - sick) * (Number(fpr.value) / 100));
		const cols = 40;
		const rows = 1000 / cols;
		const cell = Math.min((w - 20) / cols, (h - 46) / rows);
		const ox = (w - cell * cols) / 2;
		const oy = 36 + (h - 46 - cell * rows) / 2;
		ctx.clearRect(0, 0, w, h);
		for (let i = 0; i < 1000; i++) {
			const x = ox + (i % cols) * cell + cell / 2;
			const y = oy + Math.floor(i / cols) * cell + cell / 2;
			ctx.beginPath();
			ctx.arc(x, y, cell * 0.36, 0, Math.PI * 2);
			if (i < tp) ctx.fillStyle = TP;
			else if (i < tp + fn) ctx.fillStyle = "rgba(255,158,199,0.35)";
			else if (i < tp + fn + fp) ctx.fillStyle = FP;
			else ctx.fillStyle = "rgba(255,255,255,0.12)";
			ctx.fill();
		}
		const share = tp + fp ? (tp / (tp + fp)) * 100 : 0;
		out.textContent = `${Math.round(share)} % wirklich krank`;
		document.getElementById("prevOut").textContent = pct(p * 100);
		document.getElementById("sensOut").textContent = `${sens.value} %`;
		document.getElementById("fprOut").textContent = `${fpr.value} %`;
		note.textContent = `${tp + fp} Menschen werden positiv getestet. Davon sind ${tp} wirklich krank und ${fp} sind gesund und haben einen Fehlalarm. Ein positiver Test heißt hier: ${Math.round(
			share
		)} % Risiko, nicht ${sens.value} %.`;
	}
	[prev, sens, fpr].forEach((el) => el.addEventListener("input", draw));
	window.addEventListener("resize", draw);
	draw();
})();
