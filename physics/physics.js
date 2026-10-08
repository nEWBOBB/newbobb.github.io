// Physik: Federpendel mit Zeitdiagramm
(() => {
	const canvas = document.getElementById("springCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.2 : 1.8));
	const stiff = document.getElementById("stiff");
	const mass = document.getElementById("mass");
	const damp = document.getElementById("damp");
	const out = document.getElementById("springOut");
	const note = document.getElementById("springNote");
	const ACC = getComputedStyle(document.documentElement).getPropertyValue("--fach").trim();
	const fmt = (v, d = 1) => v.toFixed(d).replace(".", ",");

	let x = 0.8; // Auslenkung in „Metern“, positiv = nach unten
	let v = 0;
	let held = false;
	const trace = [];
	const D = () => Number(stiff.value);
	const M = () => Number(mass.value) / 10;
	const B = () => Number(damp.value) / 10;

	const geo = () => {
		const top = 22;
		const rest = size.h * 0.5;
		const px = Math.min(size.w * 0.18, 110);
		const unit = size.h * 0.32; // Pixel pro Meter
		return { top, rest, px, unit, plot0: px * 2 + 10 };
	};

	function update() {
		const T = 2 * Math.PI * Math.sqrt(M() / D());
		out.textContent = `T = ${fmt(T, 2)} s`;
		document.getElementById("dOut").textContent = `${D()} N/m`;
		document.getElementById("mOut").textContent = `${fmt(M())} kg`;
		document.getElementById("bOut").textContent = fmt(B());
	}
	[stiff, mass, damp].forEach((el) => el.addEventListener("input", update));
	update();

	function draw() {
		const { w, h } = size;
		const { top, rest, px, unit, plot0 } = geo();
		ctx.clearRect(0, 0, w, h);
		const y = rest + x * unit;

		// Decke
		ctx.fillStyle = "rgba(255,255,255,0.25)";
		ctx.fillRect(px - 40, top - 6, 80, 6);

		// Feder als Zickzack
		const coils = 14;
		ctx.strokeStyle = "rgba(255,255,255,0.8)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(px, top);
		const len = y - 22 - top;
		for (let i = 1; i < coils * 2; i++) {
			const yy = top + 10 + ((len - 20) * i) / (coils * 2);
			ctx.lineTo(px + (i % 2 ? 14 : -14), yy);
		}
		ctx.lineTo(px, y - 22);
		ctx.stroke();

		// Gewicht: Größe wächst mit Masse
		const s = 16 + M() * 9;
		ctx.fillStyle = ACC;
		ctx.fillRect(px - s, y - 22, s * 2, 22 + s * 0.6);
		ctx.fillStyle = "#0b0a09";
		ctx.font = "600 12px Space Grotesk, sans-serif";
		ctx.textAlign = "center";
		ctx.fillText(`${fmt(M())} kg`, px, y - 4 + s * 0.3);

		// Ruhelage
		ctx.setLineDash([4, 5]);
		ctx.strokeStyle = "rgba(255,255,255,0.25)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(px - 60, rest);
		ctx.lineTo(w - 8, rest);
		ctx.stroke();
		ctx.setLineDash([]);

		// Zeitdiagramm: neueste Werte links, ältere wandern nach rechts
		ctx.strokeStyle = "#ff9ec7";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		for (let i = 0; i < trace.length; i++) {
			const xx = plot0 + i * 2;
			if (xx > w - 8) break;
			const yy = rest + trace[i] * unit;
			i === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
		}
		ctx.stroke();
		ctx.setLineDash([3, 4]);
		ctx.strokeStyle = "rgba(255,255,255,0.35)";
		ctx.beginPath();
		ctx.moveTo(px + s, y);
		ctx.lineTo(plot0, y);
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.fillStyle = "rgba(244,239,230,0.4)";
		ctx.textAlign = "right";
		ctx.font = "11px JetBrains Mono, monospace";
		ctx.fillText("← jetzt · Zeit →", w - 10, h - 10);
	}

	let acc = 0;
	whenVisible(canvas, (dt) => {
		if (!held) {
			// kleine Schritte für eine stabile Simulation
			const n = 8;
			for (let i = 0; i < n; i++) {
				const a = (-D() * x - B() * v) / M();
				v += a * (dt / n);
				x += v * (dt / n);
			}
			x = Math.max(-1.3, Math.min(1.3, x));
		}
		acc += dt;
		if (acc > 1 / 60) {
			acc = 0;
			trace.unshift(x);
			if (trace.length > 900) trace.pop();
		}
		draw();
	});

	const grab = (e) => {
		const r = canvas.getBoundingClientRect();
		const { rest, unit } = geo();
		x = Math.max(-1.2, Math.min(1.2, (e.clientY - r.top - rest) / unit));
		v = 0;
	};
	canvas.addEventListener("pointerdown", (e) => {
		held = true;
		canvas.setPointerCapture(e.pointerId);
		grab(e);
		note.textContent = "Loslassen, um zu schwingen.";
	});
	canvas.addEventListener("pointermove", (e) => held && grab(e));
	const release = () => {
		if (!held) return;
		held = false;
		note.textContent = "Die Spur rechts ist eine Sinuswelle, wie auf der Mathe-Seite.";
	};
	canvas.addEventListener("pointerup", release);
	canvas.addEventListener("pointercancel", release);
	document.getElementById("btnPull").addEventListener("click", () => {
		x = 1;
		v = 0;
		note.textContent = "Die Spur rechts ist eine Sinuswelle, wie auf der Mathe-Seite.";
	});
})();

// Physik: Interferenz zweier Kreiswellen
(() => {
	const canvas = document.getElementById("waveCanvas");
	const lam = document.getElementById("lam");
	const sep = document.getElementById("sep");
	const btn2 = document.getElementById("btnSrc2");
	const out = document.getElementById("waveOut");
	const note = document.getElementById("waveNote");
	const GW = 200; // Rechenraster, wird auf die Canvas hochskaliert
	let GH = 120;
	let two = false;
	const buf = document.createElement("canvas");
	const bctx = buf.getContext("2d");
	let img;
	let r1;
	let r2;
	let src = [];
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.1 : 1.6));

	function setup() {
		if (!size.w) return;
		GH = Math.round((GW * size.h) / size.w);
		buf.width = GW;
		buf.height = GH;
		img = bctx.createImageData(GW, GH);
		const L = Number(lam.value);
		const d = Number(sep.value) * L;
		const y = GH * 0.18;
		src = two ? [[GW / 2 - d / 2, y], [GW / 2 + d / 2, y]] : [[GW / 2, y]];
		r1 = new Float32Array(GW * GH);
		r2 = new Float32Array(GW * GH);
		for (let j = 0; j < GH; j++)
			for (let i = 0; i < GW; i++) {
				const n = j * GW + i;
				r1[n] = Math.hypot(i - src[0][0], j - src[0][1]);
				r2[n] = two ? Math.hypot(i - src[1][0], j - src[1][1]) : 0;
			}
		document.getElementById("lamOut").textContent = `${(L / 10).toFixed(1).replace(".", ",")} cm`;
		document.getElementById("sepOut").textContent = `${sep.value.replace(".", ",")} λ`;
		out.textContent = two ? "2 Quellen" : "1 Quelle";
		const lines = Math.floor(Number(sep.value) + 0.5) * 2;
		note.textContent = two
			? `Abstand ${sep.value.replace(".", ",")} λ: Es entstehen ${lines} ruhige Streifen, auf denen sich Berg und Tal auslöschen. Größerer Abstand, mehr Streifen.`
			: "Eine Quelle macht einfache Kreiswellen. Schalte die zweite dazu.";
	}

	whenVisible(canvas, (dt, t) => {
		if (!img) return;
		const k = (2 * Math.PI) / Number(lam.value);
		const wt = t * 5;
		const d = img.data;
		for (let n = 0; n < r1.length; n++) {
			let v = Math.sin(k * r1[n] - wt) / (1 + r1[n] * 0.012);
			if (two) v = (v + Math.sin(k * r2[n] - wt) / (1 + r2[n] * 0.012)) * 0.5;
			const b = 0.5 + 0.5 * v;
			const p = n * 4;
			d[p] = 20 + 130 * b;
			d[p + 1] = 22 + 165 * b;
			d[p + 2] = 34 + 221 * b;
			d[p + 3] = 255;
		}
		bctx.putImageData(img, 0, 0);
		ctx.imageSmoothingEnabled = true;
		ctx.drawImage(buf, 0, 0, size.w, size.h);
		ctx.fillStyle = "#ff9ec7";
		for (const [x, y] of src) {
			ctx.beginPath();
			ctx.arc((x / GW) * size.w, (y / GH) * size.h, 5, 0, Math.PI * 2);
			ctx.fill();
		}
	});

	[lam, sep].forEach((el) => el.addEventListener("input", setup));
	window.addEventListener("resize", setup);
	btn2.addEventListener("click", () => {
		two = !two;
		btn2.setAttribute("aria-pressed", two);
		setup();
	});
	setup();
})();

// Physik: Lichtuhren und Zeitdilatation
(() => {
	const canvas = document.getElementById("relCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1 : 1.6));
	const vel = document.getElementById("vel");
	const out = document.getElementById("relOut");
	const note = document.getElementById("relNote");
	const ACC = getComputedStyle(document.documentElement).getPropertyValue("--fach").trim();
	const T0 = 1.2; // Sekunden pro Tick der ruhenden Uhr
	const fmt = (v, d = 2) => v.toFixed(d).replace(".", ",");
	let t = 0;
	let x = 0;
	let trail = [];
	const beta = () => Number(vel.value) / 100;
	const gamma = () => 1 / Math.sqrt(1 - beta() ** 2);
	const tri = (p) => 1 - Math.abs(1 - 2 * p);

	function update() {
		const g = gamma();
		out.textContent = `γ = ${fmt(g)}`;
		document.getElementById("vOut").textContent = `${vel.value} % von c`;
		note.textContent = `Bei ${vel.value} % der Lichtgeschwindigkeit: Während auf der Erde 10 Jahre vergehen, altern die Reisenden nur ${fmt(
			10 / g,
			1
		)} Jahre.`;
	}
	vel.addEventListener("input", () => {
		trail = [];
		update();
	});
	update();

	function clock(cx, base, Lc, py, label, ticks, color) {
		ctx.fillStyle = "rgba(255,255,255,0.55)";
		ctx.fillRect(cx - 18, base - Lc - 4, 36, 4);
		ctx.fillRect(cx - 18, base, 36, 4);
		ctx.fillStyle = color;
		ctx.shadowColor = color;
		ctx.shadowBlur = 14;
		ctx.beginPath();
		ctx.arc(cx, py, 5, 0, Math.PI * 2);
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.fillStyle = "rgba(244,239,230,0.55)";
		ctx.font = "11px JetBrains Mono, monospace";
		ctx.textAlign = "left";
		ctx.fillText(label, 12, base - Lc - 16);
		ctx.textAlign = "right";
		ctx.fillStyle = "#f4efe6";
		ctx.font = "700 22px Syne, sans-serif";
		ctx.fillText(`${ticks} ${ticks === 1 ? "Tick" : "Ticks"}`, size.w - 12, base - Lc / 2 + 8);
	}

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const lane = h / 2;
		const Lc = lane * 0.52;
		const c = (2 * Lc) / T0; // Lichtgeschwindigkeit in Pixel pro Sekunde
		const g = gamma();
		t += dt;
		x += beta() * c * dt;
		const start = 40;
		const end = w * 0.72;
		if (start + x > end) {
			x = 0;
			trail = [];
		}
		ctx.clearRect(0, 0, w, h);

		// Ruhende Uhr oben
		const b1 = lane - 22;
		clock(start + 30, b1, Lc, b1 - Lc * tri((t / T0) % 1), "Uhr auf der Erde · ruht", Math.floor(t / T0), "#ff9ec7");

		// Bewegte Uhr unten: Das Licht läuft im Zickzack
		const b2 = h - 22;
		const cx = start + 30 + x;
		const py = b2 - Lc * tri((t / (T0 * g)) % 1);
		trail.push([cx, py]);
		if (trail.length > 400) trail.shift();
		ctx.strokeStyle = ACC;
		ctx.globalAlpha = 0.55;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		trail.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
		ctx.stroke();
		ctx.globalAlpha = 1;
		clock(cx, b2, Lc, py, `Uhr in der Rakete · ${vel.value} % von c`, Math.floor(t / (T0 * g)), ACC);

		ctx.strokeStyle = "rgba(255,255,255,0.08)";
		ctx.beginPath();
		ctx.moveTo(0, lane + 2);
		ctx.lineTo(w, lane + 2);
		ctx.stroke();
	});

	document.getElementById("btnRelReset").addEventListener("click", () => {
		t = 0;
		x = 0;
		trail = [];
	});
})();
