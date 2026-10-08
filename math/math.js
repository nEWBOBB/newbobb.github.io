// Mathematik: Einheitskreis, Sinuswelle und ein zweiter Kreis (Fourier-Idee)
(() => {
	const canvas = document.getElementById("circleCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.4 : 2));
	const out = document.getElementById("circleOut");
	const note = document.getElementById("circleNote");
	const btnSpin = document.getElementById("btnSpin");
	const btnSecond = document.getElementById("btnSecond");
	const kIn = document.getElementById("k");
	const rIn = document.getElementById("r2");
	const ACC = getComputedStyle(document.documentElement).getPropertyValue("--fach").trim();
	const SIN = "#ff9ec7";
	const COS = "#7bdc9a";

	let phi = 0;
	let spin = true;
	let second = false;
	let dragging = false;
	const fmt = (v) => v.toFixed(2).replace(".", ",").replace("-", "−");

	const layout = () => {
		const R = Math.min(size.h * 0.36, size.w * 0.2);
		const cx = R + 24;
		const cy = size.h / 2;
		return { R, cx, cy, x0: cx + R + 36 };
	};
	const k = () => Number(kIn.value);
	const r2 = () => (second ? Number(rIn.value) / 100 : 0);
	const height = (a) => Math.sin(a) + r2() * Math.sin(k() * a);

	function draw() {
		const { w, h } = size;
		const { R, cx, cy, x0 } = layout();
		const scale = R / (1 + r2());
		ctx.clearRect(0, 0, w, h);

		// Achsen
		ctx.strokeStyle = "rgba(255,255,255,0.1)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(8, cy);
		ctx.lineTo(w - 8, cy);
		ctx.moveTo(cx, cy - R - 12);
		ctx.lineTo(cx, cy + R + 12);
		ctx.stroke();

		// Kreis 1
		ctx.strokeStyle = "rgba(255,255,255,0.35)";
		ctx.beginPath();
		ctx.arc(cx, cy, scale, 0, Math.PI * 2);
		ctx.stroke();
		const p1x = cx + scale * Math.cos(phi);
		const p1y = cy - scale * Math.sin(phi);

		// Winkelbogen
		ctx.strokeStyle = ACC;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(cx, cy, 16, 0, -(((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)), true);
		ctx.stroke();

		// Radius
		ctx.strokeStyle = "rgba(255,255,255,0.7)";
		ctx.beginPath();
		ctx.moveTo(cx, cy);
		ctx.lineTo(p1x, p1y);
		ctx.stroke();

		let px = p1x;
		let py = p1y;
		if (second) {
			const rr = scale * r2();
			ctx.strokeStyle = "rgba(255,255,255,0.25)";
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.arc(p1x, p1y, rr, 0, Math.PI * 2);
			ctx.stroke();
			px = p1x + rr * Math.cos(k() * phi);
			py = p1y - rr * Math.sin(k() * phi);
			ctx.strokeStyle = "rgba(255,255,255,0.7)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(p1x, p1y);
			ctx.lineTo(px, py);
			ctx.stroke();
		} else {
			// Sinus und Kosinus als Strecken
			ctx.lineWidth = 3;
			ctx.strokeStyle = SIN;
			ctx.beginPath();
			ctx.moveTo(px, cy);
			ctx.lineTo(px, py);
			ctx.stroke();
			ctx.strokeStyle = COS;
			ctx.beginPath();
			ctx.moveTo(cx, cy);
			ctx.lineTo(px, cy);
			ctx.stroke();
		}

		// Welle: links die Gegenwart, nach rechts die Vergangenheit
		ctx.strokeStyle = SIN;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		for (let x = x0; x <= w - 8; x += 2) {
			const a = phi - (x - x0) / (scale * 0.9);
			const y = cy - scale * height(a);
			x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
		}
		ctx.stroke();

		// Verbindungslinie Punkt → Welle
		ctx.setLineDash([4, 5]);
		ctx.strokeStyle = "rgba(255,255,255,0.4)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(px, py);
		ctx.lineTo(x0, py);
		ctx.stroke();
		ctx.setLineDash([]);

		ctx.fillStyle = "#fff";
		ctx.beginPath();
		ctx.arc(px, py, 7, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = SIN;
		ctx.beginPath();
		ctx.arc(x0, py, 5, 0, Math.PI * 2);
		ctx.fill();

		const deg = Math.round((((phi * 180) / Math.PI) % 360 + 360) % 360);
		out.textContent = `φ = ${deg}°`;
		note.textContent = second
			? `Höhe = sin(φ) + ${fmt(r2())} · sin(${k()}φ) = ${fmt(height(phi))}`
			: `sin(${deg}°) = ${fmt(Math.sin(phi))} · cos(${deg}°) = ${fmt(Math.cos(phi))}`;
	}

	whenVisible(canvas, (dt) => {
		if (spin && !dragging) phi += dt * 1.1;
		draw();
	});

	const setFromPointer = (e) => {
		const r = canvas.getBoundingClientRect();
		const { cx, cy } = layout();
		phi = Math.atan2(cy - (e.clientY - r.top), e.clientX - r.left - cx);
	};
	canvas.addEventListener("pointerdown", (e) => {
		dragging = true;
		canvas.setPointerCapture(e.pointerId);
		setFromPointer(e);
	});
	canvas.addEventListener("pointermove", (e) => dragging && setFromPointer(e));
	canvas.addEventListener("pointerup", () => (dragging = false));
	canvas.addEventListener("pointercancel", () => (dragging = false));

	btnSpin.addEventListener("click", () => {
		spin = !spin;
		btnSpin.setAttribute("aria-pressed", String(spin));
	});
	btnSecond.addEventListener("click", () => {
		second = !second;
		btnSecond.setAttribute("aria-pressed", String(second));
	});
	kIn.addEventListener("input", () => (document.getElementById("kOut").textContent = `${kIn.value}×`));
	rIn.addEventListener("input", () => (document.getElementById("rOut").textContent = `${rIn.value} %`));
	draw();
})();

// Mathematik: lineares und exponentielles Wachstum
(() => {
	const canvas = document.getElementById("growCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.15 : 1.7));
	const rIn = document.getElementById("growR");
	const tIn = document.getElementById("growT");
	const btnLog = document.getElementById("btnLog");
	const out = document.getElementById("growOut");
	const note = document.getElementById("growNote");
	const ACC = getComputedStyle(document.documentElement).getPropertyValue("--fach").trim();
	const LIN = "#7bdc9a";
	const K0 = 1000;
	let log = false;
	const euro = (v) => `${Math.round(v).toLocaleString("de-DE")} €`;

	function draw() {
		const p = Number(rIn.value) / 100;
		const T = Number(tIn.value);
		const { w, h } = size;
		const L = 54;
		const R = 14;
		const top = 46;
		const bot = h - 30;
		const lin = (t) => K0 + K0 * p * t;
		const exp = (t) => K0 * (1 + p) ** t;
		const max = exp(T) * 1.08;
		const X = (t) => L + (t / T) * (w - L - R);
		const Y = log
			? (v) => bot - (Math.log10(v / K0) / Math.log10(max / K0)) * (bot - top)
			: (v) => bot - (v / max) * (bot - top);
		ctx.clearRect(0, 0, w, h);

		// Gitter mit Beschriftung
		ctx.font = "11px JetBrains Mono, monospace";
		ctx.fillStyle = "rgba(244,239,230,0.4)";
		ctx.strokeStyle = "rgba(255,255,255,0.08)";
		ctx.lineWidth = 1;
		ctx.textAlign = "right";
		const ticks = [];
		if (log) for (let v = K0; v <= max; v *= 10) ticks.push(v);
		else {
			const step = 10 ** Math.floor(Math.log10(max / 4));
			const s = max / step > 20 ? step * 5 : max / step > 8 ? step * 2 : step;
			for (let v = 0; v <= max; v += s) ticks.push(v);
		}
		for (const v of ticks) {
			const y = Y(Math.max(v, 1));
			ctx.beginPath();
			ctx.moveTo(L, y);
			ctx.lineTo(w - R, y);
			ctx.stroke();
			ctx.fillText(v >= 1e6 ? `${(v / 1e6).toLocaleString("de-DE")} Mio` : v >= 1000 ? `${v / 1000}k` : v, L - 6, y + 4);
		}
		ctx.textAlign = "center";
		for (let t = 0; t <= T; t += T > 30 ? 10 : 5) ctx.fillText(t, X(t), h - 10);

		const curve = (f, color, width) => {
			ctx.strokeStyle = color;
			ctx.lineWidth = width;
			ctx.beginPath();
			for (let i = 0; i <= 200; i++) {
				const t = (i / 200) * T;
				i ? ctx.lineTo(X(t), Y(f(t))) : ctx.moveTo(X(t), Y(f(t)));
			}
			ctx.stroke();
		};
		curve(lin, LIN, 2.5);
		curve(exp, ACC, 3);

		// Verdopplungen markieren
		const dbl = Math.log(2) / Math.log(1 + p);
		ctx.fillStyle = ACC;
		for (let k = 1; k * dbl <= T; k++) {
			ctx.beginPath();
			ctx.arc(X(k * dbl), Y(K0 * 2 ** k), 4, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.textAlign = "left";
		ctx.font = "600 12px Space Grotesk, sans-serif";
		ctx.fillStyle = ACC;
		ctx.fillText("exponentiell", L + 8, top + 4);
		ctx.fillStyle = LIN;
		ctx.fillText("linear", L + 8, top + 22);

		out.textContent = `Verdopplung alle ${dbl.toFixed(1).replace(".", ",")} Jahre`;
		document.getElementById("growROut").textContent = `${rIn.value} %`;
		document.getElementById("growTOut").textContent = T;
		const ratio = exp(T) / lin(T);
		note.textContent = `Nach ${T} Jahren: linear ${euro(lin(T))}, exponentiell ${euro(exp(T))}. Das ist ${ratio
			.toFixed(1)
			.replace(".", ",")}-mal so viel. Faustregel: 72 / ${rIn.value} ≈ ${(72 / rIn.value).toFixed(1).replace(".", ",")} Jahre.`;
	}
	[rIn, tIn].forEach((el) => el.addEventListener("input", draw));
	btnLog.addEventListener("click", () => {
		log = !log;
		btnLog.setAttribute("aria-pressed", log);
		draw();
	});
	window.addEventListener("resize", draw);
	draw();
})();

// Mathematik: Galton-Brett und Normalverteilung
(() => {
	const canvas = document.getElementById("galtonCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.35));
	const pIn = document.getElementById("galtonP");
	const out = document.getElementById("galtonOut");
	const note = document.getElementById("galtonNote");
	const ACC = getComputedStyle(document.documentElement).getPropertyValue("--fach").trim();
	const N = 12; // Nagelreihen
	const STEP = 0.07; // Sekunden pro Reihe
	let counts = new Array(N + 1).fill(0);
	let balls = [];
	let queue = 0;
	let spawn = 0;
	const P = () => Number(pIn.value) / 100;
	const binom = (n, k) => {
		let r = 1;
		for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
		return r;
	};

	const geo = () => {
		const { w, h } = size;
		const dx = Math.min((w - 40) / (N + 1), 34);
		const boardTop = 26;
		const dy = (h * 0.5) / N;
		return { cx: w / 2, dx, dy, boardTop, binTop: boardTop + N * dy + 14, bot: h - 8 };
	};
	const pegX = (g, r, k) => g.cx + (k - r / 2) * g.dx;

	function draw() {
		const { w } = size;
		const g = geo();
		ctx.clearRect(0, 0, w, size.h);

		// Nägel
		ctx.fillStyle = "rgba(255,255,255,0.35)";
		for (let r = 0; r < N; r++)
			for (let k = 0; k <= r; k++) {
				ctx.beginPath();
				ctx.arc(pegX(g, r, k), g.boardTop + r * g.dy, 2.2, 0, Math.PI * 2);
				ctx.fill();
			}

		// Fächer und Balken
		const total = counts.reduce((a, b) => a + b, 0);
		const expect = counts.map((_, k) => binom(N, k) * P() ** k * (1 - P()) ** (N - k));
		const maxShare = Math.max(...expect, ...counts.map((c) => (total ? c / total : 0)));
		const H = g.bot - g.binTop;
		ctx.strokeStyle = "rgba(255,255,255,0.12)";
		ctx.lineWidth = 1;
		for (let k = 0; k <= N; k++) {
			const x = pegX(g, N, k);
			const hh = total ? (counts[k] / total / maxShare) * H : 0;
			ctx.fillStyle = ACC;
			ctx.globalAlpha = 0.85;
			ctx.fillRect(x - g.dx / 2 + 2, g.bot - hh, g.dx - 4, hh);
			ctx.globalAlpha = 1;
		}
		ctx.beginPath();
		ctx.moveTo(pegX(g, N, 0) - g.dx / 2, g.bot);
		ctx.lineTo(pegX(g, N, N) + g.dx / 2, g.bot);
		ctx.stroke();

		// Erwartung
		ctx.setLineDash([4, 4]);
		ctx.strokeStyle = "#ff9ec7";
		ctx.lineWidth = 2;
		ctx.beginPath();
		for (let k = 0; k <= N; k++) {
			const x = pegX(g, N, k);
			const y = g.bot - (expect[k] / maxShare) * H;
			k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
		}
		ctx.stroke();
		ctx.setLineDash([]);

		// Kugeln
		ctx.fillStyle = "#f4efe6";
		for (const b of balls) {
			const x0 = pegX(g, b.r, b.k);
			const x1 = pegX(g, b.r + 1, b.k + b.dir);
			const y0 = g.boardTop + b.r * g.dy - 6;
			const x = x0 + (x1 - x0) * b.t;
			const y = y0 + g.dy * b.t - Math.sin(b.t * Math.PI) * g.dy * 0.35;
			ctx.beginPath();
			ctx.arc(x, y, 3.4, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	const add = () => balls.push({ r: 0, k: 0, t: 0, dir: Math.random() < P() ? 1 : 0 });

	whenVisible(canvas, (dt) => {
		if (queue > 0) {
			spawn += dt;
			while (spawn > 0.018 && queue > 0) {
				spawn -= 0.018;
				queue--;
				add();
			}
		}
		for (const b of balls) {
			b.t += dt / STEP;
			while (b.t >= 1 && !b.done) {
				b.t -= 1;
				b.k += b.dir;
				b.r++;
				if (b.r >= N) {
					counts[b.k]++;
					b.done = true;
				} else b.dir = Math.random() < P() ? 1 : 0;
			}
		}
		if (balls.some((b) => b.done)) {
			balls = balls.filter((b) => !b.done);
			const total = counts.reduce((a, c) => a + c, 0);
			out.textContent = `${total} Kugeln`;
			if (total >= 200 && !balls.length && !queue) {
				const mean = counts.reduce((a, c, k) => a + c * k, 0) / total;
				note.textContent = `Durchschnitt: Fach ${mean.toFixed(1).replace(".", ",")} von 0 bis ${N}. Vorhergesagt: ${(N * P())
					.toFixed(1)
					.replace(".", ",")}. Je mehr Kugeln, desto genauer passt die Glocke.`;
			}
		}
		draw();
	});

	document.getElementById("btnDrop").addEventListener("click", () => (queue += 500));
	document.getElementById("btnDrop1").addEventListener("click", add);
	const reset = () => {
		counts = new Array(N + 1).fill(0);
		balls = [];
		queue = 0;
		out.textContent = "0 Kugeln";
		note.textContent = "Die gestrichelte Linie zeigt, was die Mathematik vorhersagt.";
	};
	document.getElementById("btnGReset").addEventListener("click", reset);
	pIn.addEventListener("input", () => {
		document.getElementById("galtonPOut").textContent = `${pIn.value} %`;
		reset();
		note.textContent =
			P() === 0.5 ? "Ein gerades Brett: links und rechts gleich wahrscheinlich." : "Ein schiefes Brett: Die Glocke rückt zur Seite und wird schief.";
	});
})();
