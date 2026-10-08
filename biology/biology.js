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

// Biologie: natürliche Selektion beim Birkenspanner, der Spieler ist der Vogel
(() => {
	const canvas = document.getElementById("mothCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.9 : 1.4));
	const btnSoot = document.getElementById("btnSoot");
	const btnAuto = document.getElementById("btnAuto");
	const tag = document.getElementById("mothTag");
	const out = document.getElementById("mothOut");
	const note = document.getElementById("mothNote");
	const N = 30;
	const EAT = 15;
	const bark = document.createElement("canvas");
	let soot = false;
	let moths = [];
	let eaten = 0;
	let gen = 1;
	let busy = false;
	const shade = (g) => Math.round(28 + g * 200); // 0 = dunkel, 1 = hell
	const bg = () => (soot ? 0.12 : 0.85);
	const clamp = (v) => Math.min(1, Math.max(0, v));

	function paintBark() {
		const { w, h } = size;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		bark.width = w * dpr;
		bark.height = h * dpr;
		const b = bark.getContext("2d");
		b.setTransform(dpr, 0, 0, dpr, 0, 0);
		const base = shade(bg());
		b.fillStyle = `rgb(${base},${base},${base - 6})`;
		b.fillRect(0, 0, w, h);
		let seed = 7;
		const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
		for (let i = 0; i < 900; i++) {
			const v = Math.max(0, Math.min(255, base + (rnd() - 0.5) * 120));
			b.fillStyle = `rgba(${v},${v},${v - 6},0.55)`;
			b.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 22, 1 + rnd() * 3);
		}
	}

	const place = (g) => ({
		g,
		x: 20 + Math.random() * (size.w - 40),
		y: 20 + Math.random() * (size.h - 70),
		a: (Math.random() - 0.5) * 0.8,
		alive: true,
	});
	const reset = () => {
		moths = Array.from({ length: N }, () => place(Math.random()));
		eaten = 0;
		gen = 1;
		update();
	};

	function update() {
		tag.textContent = `Generation ${gen}`;
		out.textContent = `${EAT - eaten} übrig`;
		draw();
	}

	function draw() {
		const { w, h } = size;
		ctx.clearRect(0, 0, w, h);
		ctx.drawImage(bark, 0, 0, w, h);
		for (const m of moths) {
			if (!m.alive) continue;
			const v = shade(m.g);
			ctx.save();
			ctx.translate(m.x, m.y);
			ctx.rotate(m.a);
			ctx.fillStyle = `rgb(${v},${v},${v - 4})`;
			ctx.beginPath();
			ctx.ellipse(-6, 0, 8, 5, -0.5, 0, Math.PI * 2);
			ctx.ellipse(6, 0, 8, 5, 0.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = `rgb(${v - 20},${v - 20},${v - 24})`;
			ctx.fillRect(-1.2, -5, 2.4, 10);
			ctx.restore();
		}
		// Verteilung der Helligkeit unten
		const bins = new Array(10).fill(0);
		moths.forEach((m) => m.alive && bins[Math.min(9, Math.floor(m.g * 10))]++);
		const bw = (w - 20) / 10;
		ctx.fillStyle = "rgba(11,10,9,0.72)";
		ctx.fillRect(0, h - 44, w, 44);
		bins.forEach((n, k) => {
			const v = shade((k + 0.5) / 10);
			ctx.fillStyle = `rgb(${v},${v},${v - 4})`;
			const hh = (n / N) * 90;
			ctx.fillRect(10 + k * bw + 2, h - 6 - Math.min(hh, 34), bw - 4, Math.min(hh, 34));
		});
	}

	function nextGen() {
		const alive = moths.filter((m) => m.alive);
		const kids = [];
		while (kids.length < N) {
			const p = alive[kids.length % alive.length];
			kids.push(place(clamp(p.g + (Math.random() - 0.5) * 0.16)));
		}
		moths = kids;
		eaten = 0;
		gen++;
		const mean = moths.reduce((a, m) => a + m.g, 0) / N;
		note.textContent = `Generation ${gen}: Die Falter sind im Schnitt zu ${Math.round(mean * 100)} % hell. ${
			Math.abs(mean - bg()) < 0.2 ? "Sie passen sich der Rinde an, ohne es zu wollen." : "Die Tarnung ist noch schlecht. Weiter fressen!"
		}`;
		update();
	}

	const eat = (m) => {
		m.alive = false;
		eaten++;
		if (eaten >= EAT) nextGen();
		else update();
	};

	canvas.addEventListener("pointerdown", (e) => {
		if (busy) return;
		const r = canvas.getBoundingClientRect();
		const x = e.clientX - r.left;
		const y = e.clientY - r.top;
		let best = null;
		let bd = 18;
		for (const m of moths) {
			const d = Math.hypot(m.x - x, m.y - y);
			if (m.alive && d < bd) {
				bd = d;
				best = m;
			}
		}
		if (best) eat(best);
	});

	// Automatischer Vogel: Je stärker der Kontrast zur Rinde, desto eher wird ein Falter entdeckt
	btnAuto.addEventListener("click", () => {
		if (busy) return;
		busy = true;
		btnAuto.disabled = true;
		let left = 10;
		const step = () => {
			while (eaten < EAT) {
				const alive = moths.filter((m) => m.alive);
				const wts = alive.map((m) => (Math.abs(m.g - bg()) + 0.04) ** 2);
				let r = Math.random() * wts.reduce((a, b) => a + b, 0);
				const k = wts.findIndex((v) => (r -= v) <= 0);
				alive[k < 0 ? 0 : k].alive = false;
				eaten++;
			}
			nextGen();
			if (--left > 0) setTimeout(step, 380);
			else {
				busy = false;
				btnAuto.disabled = false;
			}
		};
		step();
	});

	btnSoot.addEventListener("click", () => {
		soot = !soot;
		btnSoot.setAttribute("aria-pressed", soot);
		btnSoot.textContent = soot ? "🌳 Saubere Bäume" : "🏭 Ruß auf die Bäume";
		paintBark();
		draw();
		note.textContent = soot
			? "Die Bäume sind schwarz. Plötzlich fallen die hellen Falter auf."
			: "Die Luft ist wieder sauber, die Rinde hell. Jetzt sind die dunklen in Gefahr.";
	});
	document.getElementById("btnMothReset").addEventListener("click", reset);
	window.addEventListener("resize", () => {
		paintBark();
		moths.forEach((m) => {
			m.x = Math.min(m.x, size.w - 20);
			m.y = Math.min(m.y, size.h - 50);
		});
		draw();
	});
	paintBark();
	reset();
})();

// Biologie: Mendels Regeln mit Kreuzungsquadrat
(() => {
	const punnett = document.getElementById("punnett");
	const peas = document.getElementById("peas");
	const out = document.getElementById("peaOut");
	const note = document.getElementById("peaNote");
	const YEL = "#f2d64b";
	const GRN = "#7bc043";
	const parents = ["Gg", "Gg"];
	const color = (gt) => (gt.includes("G") ? YEL : GRN);
	const sort = (a, b) => (a === "G" ? a + b : b + a);
	peas.innerHTML = "<i></i>".repeat(100);

	function render() {
		const [m, f] = parents;
		let html = "<b></b>" + [...f].map((x) => `<b>${x}</b>`).join("");
		let yellow = 0;
		for (const a of m) {
			html += `<b>${a}</b>`;
			for (const b of f) {
				const gt = sort(a, b);
				if (gt.includes("G")) yellow++;
				html += `<span style="--pea:${color(gt)}">${gt}</span>`;
			}
		}
		punnett.innerHTML = html;
		const green = 4 - yellow;
		out.textContent = !green ? "Erwartet: alle gelb" : !yellow ? "Erwartet: alle grün" : `Erwartet ${yellow} : ${green}`;
		const hidden = parents.filter((p) => p === "Gg").length;
		note.textContent =
			m === "Gg" && f === "Gg"
				? "Beide Eltern sind gelb, tragen aber versteckt ein g."
				: !green
					? "Mindestens ein Elternteil gibt sicher ein G weiter. Grün bleibt unsichtbar, kann aber weitervererbt werden."
					: hidden
						? "Ein Elternteil ist grün, der andere trägt ein verstecktes g: Halbe-halbe."
						: "Nur g-Anlagen da: Alle Nachkommen sind grün.";
		peas.querySelectorAll("i").forEach((i) => {
			i.className = "";
			i.style.background = "";
		});
	}

	document.querySelectorAll(".parent").forEach((row) =>
		row.addEventListener("click", (e) => {
			const b = e.target.closest("button");
			if (!b) return;
			row.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
			parents[Number(row.dataset.parent)] = b.dataset.g;
			render();
		})
	);

	document.getElementById("btnHarvest").addEventListener("click", () => {
		const cells = [...peas.querySelectorAll("i")];
		let y = 0;
		cells.forEach((cell, k) => {
			const gt = sort(parents[0][Math.random() < 0.5 ? 0 : 1], parents[1][Math.random() < 0.5 ? 0 : 1]);
			if (gt.includes("G")) y++;
			cell.className = "";
			setTimeout(() => {
				cell.style.background = color(gt);
				cell.className = "on";
			}, k * 12);
		});
		setTimeout(() => {
			out.textContent = `Geerntet ${y} gelb : ${100 - y} grün`;
			note.textContent =
				y && y < 100
					? `Das sind ${(y / Math.max(100 - y, 1)).toFixed(1).replace(".", ",")} : 1. Der Zufall schwankt, aber das Quadrat sagt den Schnitt voraus. Ernte nochmal!`
					: "Jede Erbse hat dieselbe Farbe, genau wie das Quadrat sagt.";
		}, 1250);
	});
	render();
})();
