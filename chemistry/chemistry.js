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

// Chemie: Titration von Salzsäure mit Natronlauge, Rotkohl als Indikator
(() => {
	const canvas = document.getElementById("phCanvas");
	const naoh = document.getElementById("naoh");
	const out = document.getElementById("phOut");
	const note = document.getElementById("phNote");
	const ACC = getComputedStyle(document.documentElement).getPropertyValue("--fach").trim();
	const VA = 50; // ml Säure
	const C = 0.1; // mol/l für Säure und Lauge
	const fmt = (v, d = 1) => v.toFixed(d).replace(".", ",");
	// Rotkohl: Farbe je pH-Wert
	const STOPS = [
		[1, [226, 40, 60]],
		[3, [214, 60, 120]],
		[5, [150, 70, 170]],
		[7, [100, 90, 200]],
		[8.5, [60, 125, 215]],
		[10, [40, 160, 160]],
		[12, [90, 195, 90]],
		[13.5, [220, 210, 60]],
	];
	const color = (ph) => {
		let i = STOPS.findIndex((s) => s[0] >= ph);
		if (i <= 0) return `rgb(${STOPS[i < 0 ? STOPS.length - 1 : 0][1]})`;
		const [p0, c0] = STOPS[i - 1];
		const [p1, c1] = STOPS[i];
		const f = (ph - p0) / (p1 - p0);
		return `rgb(${c0.map((v, k) => Math.round(v + (c1[k] - v) * f))})`;
	};
	const pH = (vb) => {
		const excess = (C * VA - C * vb) / (VA + vb); // überschüssige Säure in mol/l (negativ = Lauge)
		const h = (excess + Math.sqrt(excess * excess + 4e-14)) / 2;
		return -Math.log10(h);
	};
	const MARKS = [
		[1, "Magensäure"],
		[2.5, "Cola"],
		[5, "Kaffee"],
		[7, "Wasser"],
		[8.3, "Natron"],
		[10.5, "Seife"],
		[13.5, "Abflussreiniger"],
	];
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.05 : 1.6));

	function draw() {
		const { w, h } = size;
		if (!w) return;
		const vb = Number(naoh.value) / 20;
		const ph = pH(vb);
		ctx.clearRect(0, 0, w, h);

		// Becherglas
		const bw = Math.min(w * 0.26, 140);
		const bx = 18;
		const bTop = 40;
		const bBot = h - 70;
		const fill = bBot - (bBot - bTop) * (0.45 + 0.4 * (vb / 100));
		ctx.fillStyle = color(ph);
		ctx.globalAlpha = 0.85;
		ctx.fillRect(bx + 3, fill, bw - 6, bBot - fill);
		ctx.globalAlpha = 1;
		ctx.strokeStyle = "rgba(255,255,255,0.6)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(bx, bTop);
		ctx.lineTo(bx, bBot);
		ctx.lineTo(bx + bw, bBot);
		ctx.lineTo(bx + bw, bTop);
		ctx.stroke();
		ctx.fillStyle = "#f4efe6";
		ctx.font = "700 20px Syne, sans-serif";
		ctx.textAlign = "center";
		ctx.fillText(`pH ${fmt(ph)}`, bx + bw / 2, fill - 10);

		// Titrationskurve
		const L = bx + bw + 46;
		const R = w - 12;
		const top = 44;
		const bot = bBot;
		const X = (v) => L + (v / 100) * (R - L);
		const Y = (p) => bot - (p / 14) * (bot - top);
		ctx.font = "11px JetBrains Mono, monospace";
		ctx.fillStyle = "rgba(244,239,230,0.4)";
		ctx.strokeStyle = "rgba(255,255,255,0.08)";
		ctx.lineWidth = 1;
		ctx.textAlign = "right";
		for (let p = 0; p <= 14; p += 7) {
			ctx.beginPath();
			ctx.moveTo(L, Y(p));
			ctx.lineTo(R, Y(p));
			ctx.stroke();
			ctx.fillText(p, L - 6, Y(p) + 4);
		}
		ctx.textAlign = "center";
		[0, 50, 100].forEach((v) => ctx.fillText(`${v} ml`, X(v), bot + 16));
		ctx.strokeStyle = "rgba(255,255,255,0.35)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		for (let i = 0; i <= 400; i++) {
			const v = i / 4;
			i ? ctx.lineTo(X(v), Y(pH(v))) : ctx.moveTo(X(v), Y(pH(v)));
		}
		ctx.stroke();
		ctx.strokeStyle = ACC;
		ctx.lineWidth = 3;
		ctx.beginPath();
		for (let i = 0; i <= vb * 4; i++) {
			const v = i / 4;
			i ? ctx.lineTo(X(v), Y(pH(v))) : ctx.moveTo(X(v), Y(pH(v)));
		}
		ctx.stroke();
		ctx.fillStyle = color(ph);
		ctx.beginPath();
		ctx.arc(X(vb), Y(ph), 7, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#f4efe6";
		ctx.lineWidth = 2;
		ctx.stroke();

		// pH-Skala mit Alltagsbeispielen
		const sTop = h - 40;
		const sx = (p) => 18 + (p / 14) * (w - 36);
		for (let p = 0; p < 14; p += 0.25) {
			ctx.fillStyle = color(p);
			ctx.fillRect(sx(p), sTop, sx(0.26) - sx(0), 10);
		}
		ctx.fillStyle = "rgba(244,239,230,0.5)";
		ctx.font = "10px JetBrains Mono, monospace";
		MARKS.forEach(([p, name], k) => {
			if (w < 520 && k % 2) return;
			ctx.fillRect(sx(p) - 0.5, sTop + 10, 1, 4);
			ctx.fillText(name, Math.min(Math.max(sx(p), 34), w - 50), sTop + 26);
		});
		ctx.fillStyle = "#f4efe6";
		ctx.beginPath();
		ctx.moveTo(sx(ph), sTop - 2);
		ctx.lineTo(sx(ph) - 6, sTop - 10);
		ctx.lineTo(sx(ph) + 6, sTop - 10);
		ctx.fill();

		out.textContent = `pH ${fmt(ph)}`;
		document.getElementById("naohOut").textContent = `${fmt(vb, 2)} ml`;
		note.textContent =
			ph < 2
				? "Sehr sauer, wie Magensäure. Die Lauge wird sofort weggefangen."
				: ph < 6
					? "Fast alle Säure ist neutralisiert. Jetzt reicht wenig Lauge für einen großen Sprung."
					: ph <= 8
						? `Neutralpunkt erreicht: Säure und Lauge heben sich auf. Übrig bleibt Salzwasser. Nur ${fmt(vb, 2)} ml!`
						: ph < 12
							? "Ein Tropfen zu viel, und es wird basisch. Am Umschlagpunkt springt der pH-Wert um mehrere Stufen."
							: "Stark basisch, wie Abflussreiniger. Jetzt ist Lauge im Überschuss.";
	}
	naoh.addEventListener("input", draw);
	window.addEventListener("resize", draw);
	document.getElementById("btnDrip").addEventListener("click", () => {
		naoh.value = Math.min(2000, Number(naoh.value) + 1);
		naoh.dispatchEvent(new Event("input"));
	});
	draw();
})();

// Chemie: dynamisches Gleichgewicht A ⇌ B und Le Chatelier
(() => {
	const canvas = document.getElementById("eqCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.4));
	const kf = document.getElementById("kf");
	const kb = document.getElementById("kb");
	const out = document.getElementById("eqOut");
	const note = document.getElementById("eqNote");
	const COL = { A: "#8fb8ff", B: "#7bdc9a" };
	const word = (v) => (v <= 3 ? "langsam" : v <= 7 ? "mittel" : "schnell");
	let parts = [];
	let hist = [];
	let acc = 0;
	let calm = 0;

	const spawn = (n, type) => {
		for (let i = 0; i < n && parts.length < 400; i++) {
			const a = Math.random() * Math.PI * 2;
			parts.push({ x: Math.random(), y: Math.random(), vx: Math.cos(a) * 0.12, vy: Math.sin(a) * 0.12, t: type });
		}
	};
	const reset = () => {
		parts = [];
		hist = [];
		calm = 0;
		spawn(120, "A");
		note.textContent = "Am Anfang gibt es nur A.";
	};
	reset();

	const label = () => {
		document.getElementById("kfOut").textContent = word(Number(kf.value));
		document.getElementById("kbOut").textContent = word(Number(kb.value));
		calm = 0;
	};
	[kf, kb].forEach((el) => el.addEventListener("input", label));
	label();

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const rf = Number(kf.value) * 0.06;
		const rb = Number(kb.value) * 0.06;
		for (const p of parts) {
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			if (p.x < 0 || p.x > 1) p.vx *= -1;
			if (p.y < 0 || p.y > 1) p.vy *= -1;
			p.x = Math.min(1, Math.max(0, p.x));
			p.y = Math.min(1, Math.max(0, p.y));
			if (p.t === "A" && Math.random() < rf * dt) p.t = "B";
			else if (p.t === "B" && Math.random() < rb * dt) p.t = "A";
		}
		const nA = parts.filter((p) => p.t === "A").length;
		const nB = parts.length - nA;
		acc += dt;
		if (acc > 0.1) {
			acc = 0;
			hist.push([nA, nB]);
			if (hist.length > 300) hist.shift();
			calm += 0.1;
			const K = Number(kf.value) / Number(kb.value);
			if (calm > 8)
				note.textContent = `Gleichgewicht: B / A ≈ ${(nB / Math.max(nA, 1)).toFixed(1).replace(".", ",")}. Vorhergesagt: K = ${K
					.toFixed(1)
					.replace(".", ",")}. Es wird weiter umgebaut, nur gleich oft in beide Richtungen.`;
		}

		ctx.clearRect(0, 0, w, h);
		const boxH = h * 0.58;
		ctx.strokeStyle = "rgba(255,255,255,0.15)";
		ctx.strokeRect(10.5, 34.5, w - 21, boxH - 34);
		for (const p of parts) {
			ctx.fillStyle = COL[p.t];
			ctx.beginPath();
			ctx.arc(18 + p.x * (w - 36), 42 + p.y * (boxH - 50), 4, 0, Math.PI * 2);
			ctx.fill();
		}

		// Zeitverlauf
		const top = boxH + 14;
		const bot = h - 12;
		const max = Math.max(150, ...hist.map(([a, b]) => Math.max(a, b)));
		for (const [k, c] of [
			[0, COL.A],
			[1, COL.B],
		]) {
			ctx.strokeStyle = c;
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			hist.forEach((v, i) => {
				const x = 10 + (i / 299) * (w - 20);
				const y = bot - (v[k] / max) * (bot - top);
				i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
			});
			ctx.stroke();
		}
		ctx.font = "600 12px Space Grotesk, sans-serif";
		ctx.fillStyle = COL.A;
		ctx.fillText("A", w - 40, top + 10);
		ctx.fillStyle = COL.B;
		ctx.fillText("B", w - 24, top + 10);
		out.textContent = `A ${nA} · B ${nB}`;
	});

	document.getElementById("btnAddA").addEventListener("click", () => {
		spawn(60, "A");
		calm = 0;
		note.textContent = "Mehr A heißt: Die Hinreaktion läuft öfter. Das System baut den Überschuss in B um.";
	});
	document.getElementById("btnTakeB").addEventListener("click", () => {
		let n = Math.floor(parts.filter((p) => p.t === "B").length / 2);
		parts = parts.filter((p) => !(p.t === "B" && n-- > 0));
		calm = 0;
		note.textContent = "B fehlt jetzt. Die Rückreaktion wird seltener, und es entsteht neues B. Le Chatelier in Aktion.";
	});
	document.getElementById("btnEqReset").addEventListener("click", reset);
})();
