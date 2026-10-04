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
