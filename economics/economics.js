// Mikroökonomie: Angebot, Nachfrage, Gleichgewicht und Höchstpreis
(() => {
	const canvas = document.getElementById("marketCanvas");
	let ready = false;
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.05 : 1.45), () => ready && draw());
	const dem = document.getElementById("dem");
	const sup = document.getElementById("sup");
	const ceil = document.getElementById("ceil");
	const out = document.getElementById("marketOut");
	const note = document.getElementById("marketNote");
	const DEM = "#ffd166";
	const SUP = "#8fb8ff";
	// Preise intern 0…100 entsprechen 0…4 €; Mengen 0…100 entsprechen 0…1000 Kugeln am Tag
	const euro = (p) => `${(p / 25).toFixed(2).replace(".", ",")} €`;
	const kugeln = (q) => `${Math.round(q * 10)} Kugeln`;

	// Nachfrage: P = a − Q · Angebot: P = c + Q
	const model = () => {
		const a = Number(dem.value);
		const c = Number(sup.value);
		const q = Math.max(0, (a - c) / 2);
		const p = c + q;
		const cap = Number(ceil.value) > 100 ? null : Number(ceil.value);
		return { a, c, q, p, cap };
	};

	function draw() {
		const { w, h } = size;
		if (!w) return;
		const { a, c, q, p, cap } = model();
		const L = 46;
		const B = h - 34;
		const X = (qq) => L + (qq / 100) * (w - L - 16);
		const Y = (pp) => B - (pp / 110) * (B - 16);
		ctx.clearRect(0, 0, w, h);

		// Achsen
		ctx.strokeStyle = "rgba(255,255,255,0.3)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(L, 10);
		ctx.lineTo(L, B);
		ctx.lineTo(w - 8, B);
		ctx.stroke();
		ctx.fillStyle = "rgba(244,239,230,0.45)";
		ctx.font = "11px JetBrains Mono, monospace";
		ctx.textAlign = "right";
		for (let e = 0; e <= 4; e++) ctx.fillText(`${e} €`, L - 6, Y(e * 25) + 4);
		ctx.textAlign = "left";
		ctx.fillText("Menge →", w - 70, B + 22);

		// Renten als Flächen: Konsumenten oben, Produzenten unten
		const qSold = cap !== null && cap < p ? Math.max(0, cap - c) : q;
		const price = cap !== null && cap < p ? cap : p;
		ctx.fillStyle = "rgba(255,209,102,0.16)";
		ctx.beginPath();
		ctx.moveTo(X(0), Y(a));
		ctx.lineTo(X(qSold), Y(a - qSold));
		ctx.lineTo(X(qSold), Y(price));
		ctx.lineTo(X(0), Y(price));
		ctx.fill();
		ctx.fillStyle = "rgba(143,184,255,0.16)";
		ctx.beginPath();
		ctx.moveTo(X(0), Y(c));
		ctx.lineTo(X(qSold), Y(c + qSold));
		ctx.lineTo(X(qSold), Y(price));
		ctx.lineTo(X(0), Y(price));
		ctx.fill();

		// Kurven
		const line = (col, p0, slope, label) => {
			ctx.strokeStyle = col;
			ctx.lineWidth = 3;
			ctx.beginPath();
			let started = false;
			let lx = 0;
			let ly = 0;
			for (let qq = 0; qq <= 100; qq += 1) {
				const pp = p0 + slope * qq;
				if (pp < 0 || pp > 110) continue;
				started ? ctx.lineTo(X(qq), Y(pp)) : ctx.moveTo(X(qq), Y(pp));
				started = true;
				lx = X(qq);
				ly = Y(pp);
			}
			ctx.stroke();
			ctx.fillStyle = col;
			ctx.font = "600 12px Space Grotesk, sans-serif";
			ctx.textAlign = "right";
			ctx.fillText(label, Math.min(lx, w - 12), Math.max(ly + (slope < 0 ? -8 : 16), 46));
		};
		line(DEM, a, -1, "Nachfrage");
		line(SUP, c, 1, "Angebot");

		// Gleichgewicht
		ctx.setLineDash([4, 5]);
		ctx.strokeStyle = "rgba(255,255,255,0.4)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(L, Y(p));
		ctx.lineTo(X(q), Y(p));
		ctx.lineTo(X(q), B);
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.fillStyle = "#fff";
		ctx.beginPath();
		ctx.arc(X(q), Y(p), 6, 0, Math.PI * 2);
		ctx.fill();

		if (cap !== null) {
			ctx.strokeStyle = "#ff6a8a";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(L, Y(cap));
			ctx.lineTo(w - 10, Y(cap));
			ctx.stroke();
			ctx.fillStyle = "#ff6a8a";
			ctx.textAlign = "left";
			ctx.fillText("Höchstpreis", L + 6, Y(cap) - 6);
			if (cap < p) {
				const qs = Math.max(0, cap - c);
				const qd = Math.max(0, a - cap);
				ctx.fillStyle = "rgba(255,106,138,0.35)";
				ctx.fillRect(X(qs), Y(cap) - 5, X(qd) - X(qs), 10);
				ctx.fillStyle = "#ff6a8a";
				ctx.textAlign = "center";
				ctx.fillText("Mangel", (X(qs) + X(qd)) / 2, Y(cap) + 22);
			}
		}

		// Texte
		out.textContent = `Preis ${euro(price)} · ${kugeln(qSold)}`;
		if (cap !== null && cap < p) {
			const short = Math.max(0, a - cap) - Math.max(0, cap - c);
			note.textContent = `Beim Höchstpreis ${euro(cap)} wollen ${kugeln(Math.max(0, a - cap))} gekauft werden, aber nur ${kugeln(Math.max(0, cap - c))} werden hergestellt. Es fehlen ${kugeln(short)}: Die Schlange wird lang.`;
		} else if (cap !== null) {
			note.textContent = "Der Höchstpreis liegt über dem Marktpreis und ändert deshalb nichts.";
		} else {
			note.textContent = `Gleichgewicht: ${euro(p)} pro Kugel, ${kugeln(q)} am Tag. Gelb: Vorteil der Käufer. Blau: Vorteil der Anbieter.`;
		}
		const lvl = (v, n) => (v === n ? "normal" : v > n ? "höher" : "niedriger");
		document.getElementById("dOut").textContent = lvl(a, 100);
		document.getElementById("sOut").textContent = lvl(c, 20);
		document.getElementById("cOut").textContent = cap === null ? "aus" : euro(cap);
	}

	const paint = (r) => r.style.setProperty("--fill", `${((r.value - r.min) / (r.max - r.min)) * 100}%`);
	const set = (d, s) => {
		dem.value = d;
		sup.value = s;
		paint(dem);
		paint(sup);
		draw();
	};
	document.querySelectorAll("[data-scen]").forEach((b) =>
		b.addEventListener("click", () => {
			const k = b.dataset.scen;
			if (k === "heat") set(130, Number(sup.value));
			if (k === "milk") set(Number(dem.value), 45);
			if (k === "tech") set(Number(dem.value), 5);
			if (k === "reset") {
				ceil.value = 101;
				paint(ceil);
				set(100, 20);
			}
		})
	);
	[dem, sup, ceil].forEach((el) => el.addEventListener("input", draw));
	ready = true;
	draw();
})();
