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
