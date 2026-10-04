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
