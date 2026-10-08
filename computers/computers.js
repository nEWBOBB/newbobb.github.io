// Informatik: acht Bits, Dezimal, Hex, ASCII und Text in Binärcode
(() => {
	const bitsBox = document.getElementById("bits");
	const dec = document.getElementById("dec");
	const hex = document.getElementById("hex");
	const chr = document.getElementById("chr");
	const note = document.getElementById("byteNote");
	const textIn = document.getElementById("textIn");
	const binary = document.getElementById("binary");
	let value = 0;

	bitsBox.innerHTML = [7, 6, 5, 4, 3, 2, 1, 0]
		.map((b) => `<div class="bit"><button type="button" data-b="${b}" aria-pressed="false" aria-label="Bit mit Wert ${2 ** b}">0</button><small>${2 ** b}</small></div>`)
		.join("");
	const buttons = [...bitsBox.querySelectorAll("button")];

	const show = (c) => (c === 32 ? "␣" : c < 32 || c === 127 ? "–" : c < 127 ? String.fromCharCode(c) : "–");

	function render() {
		buttons.forEach((btn) => {
			const on = (value >> Number(btn.dataset.b)) & 1;
			btn.setAttribute("aria-pressed", on ? "true" : "false");
			btn.textContent = on;
		});
		dec.textContent = value;
		hex.textContent = value.toString(16).toUpperCase().padStart(2, "0");
		chr.textContent = show(value);
		const parts = buttons.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => 2 ** Number(b.dataset.b));
		if (value === 65) note.textContent = "Geschafft: 64 + 1 = 65 ist im ASCII-Code ein „A“.";
		else if (value === 255) note.textContent = "Alle Schalter an: 255, die größte Zahl, die in ein Byte passt.";
		else if (value > 127) note.textContent = `${parts.join(" + ")} = ${value}. Über 127 ist ASCII zu Ende, dort beginnen Umlaute und andere Zeichensätze.`;
		else note.textContent = parts.length ? `${parts.join(" + ")} = ${value}` : "Alle Schalter aus: 0.";
	}

	bitsBox.addEventListener("click", (e) => {
		const b = e.target.closest("button");
		if (!b) return;
		value ^= 1 << Number(b.dataset.b);
		render();
	});
	document.getElementById("btnPlus").addEventListener("click", () => {
		value = (value + 1) % 256;
		render();
	});
	document.getElementById("btnClear").addEventListener("click", () => {
		value = 0;
		render();
	});

	function translate() {
		const bytes = new TextEncoder().encode(textIn.value);
		const chars = [...textIn.value];
		let k = 0;
		binary.innerHTML = chars
			.map((ch) => {
				const n = new TextEncoder().encode(ch).length;
				const bits = [...bytes.slice(k, k + n)].map((x) => x.toString(2).padStart(8, "0")).join(" ");
				k += n;
				const label = ch === " " ? "␣" : ch.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
				return `<span><b>${label}</b>${bits}</span>`;
			})
			.join("");
		if (!chars.length) binary.textContent = "Tipp etwas ein …";
		else binary.insertAdjacentHTML("beforeend", `<br />${bytes.length} Bytes = ${bytes.length * 8} Bits`);
	}
	textIn.addEventListener("input", translate);
	translate();
	render();
})();

// Informatik: Halbaddierer aus XOR- und UND-Gatter
(() => {
	const svg = document.getElementById("adder");
	const btnA = document.getElementById("btnA");
	const btnB = document.getElementById("btnB");
	const out = document.getElementById("addOut");
	const note = document.getElementById("addNote");
	const rows = [...document.querySelectorAll("#truth tr")].slice(1);
	let a = 0;
	let b = 0;

	function render() {
		const s = a ^ b;
		const c = a & b;
		const on = { a, b, s, c };
		svg.querySelectorAll("[data-w]").forEach((el) => el.classList.toggle("on", !!on[el.dataset.w]));
		btnA.textContent = `A = ${a}`;
		btnB.textContent = `B = ${b}`;
		btnA.setAttribute("aria-pressed", !!a);
		btnB.setAttribute("aria-pressed", !!b);
		rows.forEach((r, k) => r.classList.toggle("is-now", k === a * 2 + b));
		out.textContent = `${a} + ${b} = ${c}${s}₂`;
		note.textContent =
			a && b
				? "1 + 1 = 2, im Zweiersystem 10: Die Summe ist 0, und der Übertrag 1 wandert eine Stelle nach links. Genau wie bei 5 + 5 = 10."
				: a || b
					? "Genau ein Eingang ist an: XOR leuchtet, UND bleibt aus. 1 + 0 = 1."
					: "Beide aus: 0 + 0 = 0.";
	}
	btnA.addEventListener("click", () => {
		a ^= 1;
		render();
	});
	btnB.addEventListener("click", () => {
		b ^= 1;
		render();
	});
	render();
})();

// Informatik: Sortieralgorithmen im Vergleich
(() => {
	const canvas = document.getElementById("sortCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.3 : 2));
	const speed = document.getElementById("speed");
	const out = document.getElementById("sortOut");
	const tag = document.getElementById("sortTag");
	const note = document.getElementById("sortNote");
	const ACC = getComputedStyle(document.documentElement).getPropertyValue("--fach").trim();
	const N = 60;
	const STEPS = [1, 2, 4, 10, 30];
	const SPEED = ["sehr langsam", "langsam", "mittel", "schnell", "sehr schnell"];
	const NAMES = { bubble: "Bubble Sort", quick: "Quicksort", merge: "Mergesort" };
	let arr = [];
	let run = null;
	let name = "";
	let cmp = 0;
	let hi = [];
	let done = false;
	const results = {};

	function* bubble(a) {
		for (let end = a.length - 1; end > 0; end--) {
			let swapped = false;
			for (let i = 0; i < end; i++) {
				yield ["cmp", i, i + 1];
				if (a[i] > a[i + 1]) {
					[a[i], a[i + 1]] = [a[i + 1], a[i]];
					swapped = true;
				}
			}
			if (!swapped) return;
		}
	}
	function* quick(a, lo = 0, hiI = a.length - 1) {
		if (lo >= hiI) return;
		const pivot = a[hiI];
		let i = lo;
		for (let j = lo; j < hiI; j++) {
			yield ["cmp", j, hiI];
			if (a[j] < pivot) {
				[a[i], a[j]] = [a[j], a[i]];
				i++;
			}
		}
		[a[i], a[hiI]] = [a[hiI], a[i]];
		yield* quick(a, lo, i - 1);
		yield* quick(a, i + 1, hiI);
	}
	function* merge(a, lo = 0, hiI = a.length) {
		if (hiI - lo < 2) return;
		const mid = (lo + hiI) >> 1;
		yield* merge(a, lo, mid);
		yield* merge(a, mid, hiI);
		const left = a.slice(lo, mid);
		const right = a.slice(mid, hiI);
		let i = 0;
		let j = 0;
		let k = lo;
		while (i < left.length && j < right.length) {
			yield ["cmp", lo + i, mid + j];
			a[k++] = left[i] <= right[j] ? left[i++] : right[j++];
		}
		while (i < left.length) a[k++] = left[i++];
		while (j < right.length) a[k++] = right[j++];
	}
	const ALGOS = { bubble, quick, merge };

	const shuffle = () => {
		arr = Array.from({ length: N }, (_, i) => i + 1);
		for (let i = N - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		run = null;
		cmp = 0;
		hi = [];
		done = false;
		out.textContent = "0 Vergleiche";
		tag.textContent = `${N} Zahlen`;
	};

	function draw() {
		const { w, h } = size;
		ctx.clearRect(0, 0, w, h);
		const bw = (w - 20) / N;
		for (let i = 0; i < N; i++) {
			const bh = (arr[i] / N) * (h - 46);
			ctx.fillStyle = hi.includes(i) ? "#ff6a8a" : done ? ACC : "rgba(92,225,230,0.55)";
			ctx.fillRect(10 + i * bw + 1, h - 10 - bh, Math.max(1, bw - 2), bh);
		}
	}

	whenVisible(canvas, () => {
		if (run) {
			for (let s = 0; s < STEPS[speed.value - 1]; s++) {
				const r = run.next();
				if (r.done) {
					run = null;
					hi = [];
					done = true;
					results[name] = cmp;
					const parts = Object.entries(results).map(([k, v]) => `${NAMES[k]} ${v}`);
					note.textContent = `Fertig! ${NAMES[name]} brauchte ${cmp} Vergleiche. ${
						parts.length > 1 ? `Bisher: ${parts.join(" · ")}.` : "Misch neu und probier einen anderen Algorithmus."
					} Zum Vergleich: n² / 2 = ${(N * N) / 2}, n · log₂ n ≈ ${Math.round(N * Math.log2(N))}.`;
					break;
				}
				cmp++;
				hi = [r.value[1], r.value[2]];
			}
			out.textContent = `${cmp} Vergleiche`;
		}
		draw();
	});

	document.querySelectorAll("[data-sort]").forEach((b) =>
		b.addEventListener("click", () => {
			if (done || run) shuffle();
			name = b.dataset.sort;
			cmp = 0;
			run = ALGOS[name](arr);
			tag.textContent = NAMES[name];
			note.textContent = "Rot: wird gerade verglichen.";
		})
	);
	document.getElementById("btnShuffle").addEventListener("click", () => {
		shuffle();
		note.textContent = "Neu gemischt. Wähle einen Algorithmus.";
	});
	speed.addEventListener("input", () => (document.getElementById("speedOut").textContent = SPEED[speed.value - 1]));
	shuffle();
})();
