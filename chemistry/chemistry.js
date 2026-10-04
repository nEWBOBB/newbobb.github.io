// Chemie: Stoßtheorie mit Temperatur, Aktivierungsenergie und Katalysator
(() => {
	const canvas = document.getElementById("chemCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.1 : 1.6));
	const temp = document.getElementById("temp");
	const btnCat = document.getElementById("btnCat");
	const out = document.getElementById("chemOut");
	const note = document.getElementById("chemNote");
	const COL = { A: "#8fb8ff", B: "#ff8a7a", AB: "#7bdc9a" };
	const N = 40; // Teilchen pro Sorte
	const R = 6;
	const V = 60; // Pixel pro Sekunde bei 20 °C

	let parts = [];
	let flashes = [];
	let cat = false;
	let hits = 0;
	let wins = 0;
	let made = 0;
	let history = [];
	let clock = 0;

	// mittleres Tempo wächst mit √T (in Kelvin)
	const speed = () => V * Math.sqrt((Number(temp.value) + 273) / 293);
	const barrier = () => (cat ? 1.3 : 4.2) * V * V; // Schwelle für die Stoßenergie

	function fill() {
		parts = [];
		const s = speed();
		for (const kind of ["A", "B"]) {
			for (let i = 0; i < N; i++) {
				const a = Math.random() * Math.PI * 2;
				const sp = s * (0.4 + Math.random() * 1.2);
				parts.push({ kind, x: R + Math.random() * (size.w - 2 * R), y: R + Math.random() * (size.h - 2 * R), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: R });
			}
		}
		hits = wins = made = 0;
		history = [];
		clock = 0;
	}

	function rescale() {
		// neue Temperatur: Geschwindigkeiten so skalieren, dass das Mittel passt
		const target = speed();
		const mean = parts.reduce((s, p) => s + Math.hypot(p.vx, p.vy), 0) / parts.length || 1;
		const f = target / mean;
		parts.forEach((p) => {
			p.vx *= f;
			p.vy *= f;
		});
	}

	temp.addEventListener("input", () => {
		document.getElementById("tOut").textContent = `${temp.value} °C`;
		rescale();
	});
	btnCat.addEventListener("click", () => {
		cat = !cat;
		btnCat.setAttribute("aria-pressed", String(cat));
	});
	document.getElementById("btnReset").addEventListener("click", fill);

	function step(dt) {
		const { w, h } = size;
		for (const p of parts) {
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			if (p.x < p.r) (p.x = p.r), (p.vx = Math.abs(p.vx));
			if (p.x > w - p.r) (p.x = w - p.r), (p.vx = -Math.abs(p.vx));
			if (p.y < p.r) (p.y = p.r), (p.vy = Math.abs(p.vy));
			if (p.y > h - p.r) (p.y = h - p.r), (p.vy = -Math.abs(p.vy));
		}
		for (let i = 0; i < parts.length; i++) {
			for (let j = i + 1; j < parts.length; j++) {
				const a = parts[i];
				const b = parts[j];
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const d = Math.hypot(dx, dy);
				const min = a.r + b.r;
				if (d >= min || d === 0) continue;
				const nx = dx / d;
				const ny = dy / d;
				const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
				if (rel <= 0) continue;
				const pair = (a.kind === "A" && b.kind === "B") || (a.kind === "B" && b.kind === "A");
				if (pair) {
					hits++;
					if (rel * rel > barrier()) {
						// Reaktion: beide verschmelzen, Impuls bleibt erhalten
						a.kind = "AB";
						a.r = R * 1.35;
						a.x = (a.x + b.x) / 2;
						a.y = (a.y + b.y) / 2;
						a.vx = (a.vx + b.vx) / 2;
						a.vy = (a.vy + b.vy) / 2;
						b.dead = true;
						wins++;
						made++;
						flashes.push({ x: a.x, y: a.y, t: 0, ok: true });
						continue;
					}
					flashes.push({ x: a.x + nx * a.r, y: a.y + ny * a.r, t: 0, ok: false });
				}
				// elastischer Stoß, gleiche Massen
				a.vx -= rel * nx;
				a.vy -= rel * ny;
				b.vx += rel * nx;
				b.vy += rel * ny;
				const push = (min - d) / 2;
				a.x -= nx * push;
				a.y -= ny * push;
				b.x += nx * push;
				b.y += ny * push;
			}
		}
		if (parts.some((p) => p.dead)) parts = parts.filter((p) => !p.dead);
	}

	function draw() {
		const { w, h } = size;
		ctx.clearRect(0, 0, w, h);

		// Verlauf: Anteil Produkt über die Zeit
		if (history.length > 1) {
			ctx.strokeStyle = "rgba(123,220,154,0.35)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			history.forEach((v, i) => {
				const x = (i / 300) * w;
				const y = h - 8 - v * (h * 0.5);
				i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
			});
			ctx.stroke();
		}

		for (const f of flashes) {
			ctx.strokeStyle = f.ok ? `rgba(123,220,154,${1 - f.t * 2})` : `rgba(255,255,255,${0.6 - f.t * 1.2})`;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(f.x, f.y, 4 + f.t * (f.ok ? 50 : 20), 0, Math.PI * 2);
			ctx.stroke();
		}
		for (const p of parts) {
			ctx.fillStyle = COL[p.kind];
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
			ctx.fill();
			if (p.kind === "AB") {
				ctx.fillStyle = COL.A;
				ctx.beginPath();
				ctx.arc(p.x - 3, p.y, 3, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = COL.B;
				ctx.beginPath();
				ctx.arc(p.x + 3, p.y, 3, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}

	fill();
	let sample = 0;
	whenVisible(canvas, (dt) => {
		step(dt);
		flashes.forEach((f) => (f.t += dt));
		flashes = flashes.filter((f) => f.t < 0.5);
		clock += dt;
		sample += dt;
		if (sample > 0.2 && history.length < 300) {
			sample = 0;
			history.push(made / N);
		}
		draw();
		const pct = Math.round((made / N) * 100);
		out.textContent = `${pct} % umgesetzt · ${clock.toFixed(0)} s`;
		note.textContent = `Stöße A↔B: ${hits}, davon erfolgreich: ${wins}${hits ? ` (${Math.round((wins / hits) * 100)} %)` : ""}`;
	});
})();
