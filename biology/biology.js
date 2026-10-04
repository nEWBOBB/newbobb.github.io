// Biologie: Räuber-Beute-Zyklus nach Lotka und Volterra
(() => {
	const canvas = document.getElementById("ecoCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.2 : 1.8));
	const ra = document.getElementById("ra");
	const rb = document.getElementById("rb");
	const out = document.getElementById("ecoOut");
	const note = document.getElementById("ecoNote");
	const btnRun = document.getElementById("btnRun");
	const HARE = "#c6e86a";
	const FOX = "#ff8a5c";
	const MAX_T = 60; // sichtbare Zeitspanne in „Jahren“
	const fmt = (v) => v.toFixed(1).replace(".", ",");

	let H;
	let F;
	let t;
	let data;
	let run = true;
	const a = () => Number(ra.value) / 10;
	const b = () => (Number(rb.value) / 10) * 0.05;
	const c = 0.01;
	const d = 0.6;

	function reset() {
		H = 40;
		F = 9;
		t = 0;
		data = [{ t, H, F }];
	}
	reset();

	ra.addEventListener("input", () => (document.getElementById("aOut").textContent = fmt(a())));
	rb.addEventListener("input", () => (document.getElementById("bOut").textContent = fmt(Number(rb.value) / 10)));
	btnRun.addEventListener("click", () => {
		run = !run;
		btnRun.setAttribute("aria-pressed", String(run));
		btnRun.textContent = run ? "⏸ Pause" : "▶ Weiter";
	});
	document.getElementById("btnEco").addEventListener("click", reset);

	// Runge-Kutta 4 für eine stabile Kurve
	const deriv = (h, f) => [a() * h - b() * h * f, c * h * f - d * f];
	function step(dt) {
		const k1 = deriv(H, F);
		const k2 = deriv(H + (dt / 2) * k1[0], F + (dt / 2) * k1[1]);
		const k3 = deriv(H + (dt / 2) * k2[0], F + (dt / 2) * k2[1]);
		const k4 = deriv(H + dt * k3[0], F + dt * k3[1]);
		H = Math.max(0.01, H + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]));
		F = Math.max(0.01, F + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]));
		t += dt;
	}

	function draw() {
		const { w, h } = size;
		ctx.clearRect(0, 0, w, h);
		const pad = 30;
		const t0 = Math.max(0, t - MAX_T);
		const top = Math.max(120, ...data.map((p) => Math.max(p.H, p.F))) * 1.1;
		const X = (tt) => pad + ((tt - t0) / MAX_T) * (w - pad - 10);
		const Y = (v) => h - 22 - (v / top) * (h - 52);

		ctx.strokeStyle = "rgba(255,255,255,0.08)";
		ctx.fillStyle = "rgba(244,239,230,0.35)";
		ctx.font = "11px JetBrains Mono, monospace";
		ctx.lineWidth = 1;
		for (let v = 0; v <= top; v += top > 400 ? 100 : 50) {
			ctx.beginPath();
			ctx.moveTo(pad, Y(v));
			ctx.lineTo(w - 10, Y(v));
			ctx.stroke();
			ctx.fillText(String(v), 2, Y(v) + 4);
		}
		ctx.fillText("Jahre →", w - 64, h - 6);

		for (const [key, col] of [["H", HARE], ["F", FOX]]) {
			ctx.strokeStyle = col;
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			let first = true;
			for (const p of data) {
				if (p.t < t0) continue;
				first ? ctx.moveTo(X(p.t), Y(p[key])) : ctx.lineTo(X(p.t), Y(p[key]));
				first = false;
			}
			ctx.stroke();
		}
		const last = data[data.length - 1];
		for (const [v, col, e] of [[last.H, HARE, "🐇"], [last.F, FOX, "🦊"]]) {
			ctx.fillStyle = col;
			ctx.beginPath();
			ctx.arc(X(last.t), Y(v), 5, 0, Math.PI * 2);
			ctx.fill();
			ctx.font = "16px sans-serif";
			ctx.fillText(e, Math.min(X(last.t) + 8, w - 22), Y(v) + 5);
		}
		out.textContent = `🐇 ${Math.round(H)} · 🦊 ${Math.round(F)}`;
	}

	let peakH = 0;
	let lastH = H;
	let rising = true;
	whenVisible(canvas, (dt) => {
		if (run) {
			const sim = dt * 2.5;
			for (let i = 0; i < 10; i++) step(sim / 10);
			data.push({ t, H, F });
			while (data.length && data[0].t < t - MAX_T - 1) data.shift();
			// Hinweis beim Gipfel der Hasen
			if (rising && H < lastH && H > 30) {
				peakH = t;
				note.textContent = `Hasen-Gipfel bei Jahr ${Math.round(peakH)}. Die Füchse steigen noch weiter.`;
			}
			rising = H >= lastH;
			lastH = H;
		}
		draw();
	});

	canvas.addEventListener("click", () => {
		F += 15;
		note.textContent = "15 Füchse ausgesetzt. Was passiert mit den Hasen?";
	});
})();
