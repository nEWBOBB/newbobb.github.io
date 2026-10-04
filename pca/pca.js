// Hauptkomponentenanalyse von null an: Projektion, Kovarianz, Eigenvektoren, Power-Iteration, 3D nach 2D.

(() => {
	const { fmt, rng, gauss, plot, editPoints, scheduler } = window.ML;
	const $ = (id) => document.getElementById(id);
	const ACC = "#9be564";
	const ACC2 = "#5cc8ff";
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	let ready = false;

	// ---------- Daten ----------
	let pts = [];
	function cloud(seed, s1 = 2.3, s2 = 0.65) {
		const r = rng(seed);
		const phi = (20 + r() * 50) * (Math.PI / 180);
		const c = Math.cos(phi);
		const s = Math.sin(phi);
		pts = Array.from({ length: 70 }, () => {
			const a = gauss(r) * s1;
			const b = gauss(r) * s2;
			return { x: 0.3 + a * c - b * s, y: 0.2 + a * s + b * c };
		});
	}
	cloud(3);

	// Kovarianz und Eigenzerlegung einer 2×2-Matrix in geschlossener Form
	function stats2(list) {
		const n = list.length || 1;
		let mx = 0, my = 0;
		for (const p of list) {
			mx += p.x / n;
			my += p.y / n;
		}
		let a = 0, b = 0, c = 0;
		for (const p of list) {
			const dx = p.x - mx;
			const dy = p.y - my;
			a += (dx * dx) / n;
			b += (dx * dy) / n;
			c += (dy * dy) / n;
		}
		const tr = (a + c) / 2;
		const disc = Math.sqrt(((a - c) / 2) ** 2 + b * b);
		const l1 = tr + disc;
		const l2 = Math.max(0, tr - disc);
		const th = 0.5 * Math.atan2(2 * b, a - c);
		return { mx, my, a, b, c, l1, l2, th };
	}
	let st = stats2(pts);

	// Isotropes Koordinatensystem: eine Einheit ist waagrecht und senkrecht gleich lang
	const iso = (P, half = 5) => {
		P.y = [-half, half];
		const k = P.size.w / P.size.h;
		P.x = [-half * k, half * k];
	};
	const varAlong = (th) => {
		const u = Math.cos(th);
		const v = Math.sin(th);
		return st.a * u * u + 2 * st.b * u * v + st.c * v * v;
	};

	function arrow(P, x0, y0, x1, y1, color, width = 3) {
		const c = P.ctx;
		const ax = P.sx(x0);
		const ay = P.sy(y0);
		const bx = P.sx(x1);
		const by = P.sy(y1);
		const ang = Math.atan2(by - ay, bx - ax);
		c.strokeStyle = color;
		c.fillStyle = color;
		c.lineWidth = width;
		c.beginPath();
		c.moveTo(ax, ay);
		c.lineTo(bx - Math.cos(ang) * 8, by - Math.sin(ang) * 8);
		c.stroke();
		c.beginPath();
		c.moveTo(bx, by);
		c.lineTo(bx - Math.cos(ang - 0.45) * 13, by - Math.sin(ang - 0.45) * 13);
		c.lineTo(bx - Math.cos(ang + 0.45) * 13, by - Math.sin(ang + 0.45) * 13);
		c.closePath();
		c.fill();
	}

	// ---------- Kapitel 1: Achse drehen ----------
	const pAxis = plot($("cvAxis"), { aspect: (w) => (w < 520 ? 1 : 1.3), pad: 0, onResize: () => { iso(pAxis); redrawAll(); } });
	iso(pAxis);
	const angIn = $("angIn");
	let theta = (Number(angIn.value) * Math.PI) / 180;
	let anim = null;

	function redrawAxis() {
		const P = pAxis;
		const c = P.ctx;
		P.clear();
		P.grid(1);
		const u = Math.cos(theta);
		const v = Math.sin(theta);
		const L = 20;
		// Achse
		c.strokeStyle = "rgba(155,229,100,0.55)";
		c.lineWidth = 2;
		c.beginPath();
		c.moveTo(P.sx(st.mx - u * L), P.sy(st.my - v * L));
		c.lineTo(P.sx(st.mx + u * L), P.sy(st.my + v * L));
		c.stroke();
		// Projektionen
		const proj = pts.map((p) => {
			const t = (p.x - st.mx) * u + (p.y - st.my) * v;
			return [st.mx + t * u, st.my + t * v];
		});
		c.strokeStyle = "rgba(244,239,230,0.16)";
		c.lineWidth = 1;
		c.beginPath();
		pts.forEach((p, i) => {
			c.moveTo(P.sx(p.x), P.sy(p.y));
			c.lineTo(P.sx(proj[i][0]), P.sy(proj[i][1]));
		});
		c.stroke();
		for (const p of pts) P.dot(p.x, p.y, 4, "rgba(244,239,230,0.9)");
		for (const q of proj) P.dot(q[0], q[1], 3.5, ACC, "rgba(7,8,6,0.6)");
		const va = varAlong(theta);
		const total = st.l1 + st.l2 || 1;
		const keep = va / total;
		const deg = ((theta * 180) / Math.PI + 180) % 180;
		$("angOut").textContent = `${fmt(deg, 1)}°`;
		$("keepBar").style.width = `${keep * 100}%`;
		$("keepOut").textContent = `${fmt(keep * 100, 0)} %`;
		$("axisReadout").textContent = `Varianz ${fmt(va)} von ${fmt(total)}`;
		const best = st.l1 / total;
		$("axisNote").textContent =
			pts.length < 3
				? "Setz ein paar Punkte mehr."
				: keep > best - 0.005
					? `Gefunden: Diese Achse behält ${fmt(best * 100, 0)} % der Streuung. Das ist die erste Hauptkomponente.`
					: `Das Maximum liegt bei ${fmt(best * 100, 0)} %. Dreh weiter.`;
	}

	function setTheta(t) {
		theta = t;
		const deg = (((t * 180) / Math.PI) % 180 + 180) % 180;
		angIn.value = deg;
		angIn.style.setProperty("--fill", `${(deg / 180) * 100}%`);
		redrawAxis();
	}
	angIn.addEventListener("input", () => {
		cancelAnimationFrame(anim);
		setTheta((Number(angIn.value) * Math.PI) / 180);
	});
	$("btnFind").addEventListener("click", () => {
		cancelAnimationFrame(anim);
		let target = st.th;
		// kürzesten Weg modulo 180° nehmen
		while (target - theta > Math.PI / 2) target -= Math.PI;
		while (target - theta < -Math.PI / 2) target += Math.PI;
		const from = theta;
		const t0 = performance.now();
		const dur = reduced ? 1 : 900;
		const step = (now) => {
			const k = Math.min(1, (now - t0) / dur);
			const e = 1 - Math.pow(1 - k, 3);
			setTheta(from + (target - from) * e);
			if (k < 1) anim = requestAnimationFrame(step);
		};
		anim = requestAnimationFrame(step);
	});
	$("btnNew").addEventListener("click", () => {
		cloud((Math.random() * 1e9) | 0);
		dataChanged();
	});
	$("btnRound").addEventListener("click", () => {
		cloud((Math.random() * 1e9) | 0, 1.5, 1.4);
		dataChanged();
	});

	// ---------- Kapitel 2: Eigenvektoren ----------
	const pEig = plot($("cvEig"), { aspect: (w) => (w < 520 ? 1 : 1.3), pad: 0, onResize: () => { iso(pEig); redrawEig(); } });
	iso(pEig);
	let rot = 0; // 0 = Original, 1 = in Hauptkomponenten gedreht
	let rotTarget = 0;

	function redrawEig() {
		const P = pEig;
		const c = P.ctx;
		P.clear();
		P.grid(1);
		const ang = -st.th * rot;
		const ca = Math.cos(ang);
		const sa = Math.sin(ang);
		const view = pts.map((p) => {
			const x = p.x - st.mx;
			const y = p.y - st.my;
			return { x: x * ca - y * sa, y: x * sa + y * ca };
		});
		const th = st.th + ang;
		const r1 = 2 * Math.sqrt(st.l1);
		const r2 = 2 * Math.sqrt(st.l2);
		// Ellipse (2 Standardabweichungen)
		c.save();
		c.translate(P.sx(0), P.sy(0));
		c.rotate(-th);
		const k = (P.sx(1) - P.sx(0));
		c.beginPath();
		c.ellipse(0, 0, Math.max(r1 * k, 1), Math.max(r2 * k, 1), 0, 0, Math.PI * 2);
		c.fillStyle = "rgba(155,229,100,0.06)";
		c.fill();
		c.strokeStyle = "rgba(155,229,100,0.35)";
		c.lineWidth = 1.5;
		c.stroke();
		c.restore();
		for (const p of view) P.dot(p.x, p.y, 4, "rgba(244,239,230,0.85)");
		if (pts.length >= 2) {
			arrow(P, 0, 0, Math.cos(th) * r1, Math.sin(th) * r1, ACC);
			arrow(P, 0, 0, -Math.sin(th) * r2, Math.cos(th) * r2, ACC2);
			c.font = "600 13px Space Grotesk, sans-serif";
			c.fillStyle = ACC;
			c.fillText("PC1", P.sx(Math.cos(th) * r1) + 8, P.sy(Math.sin(th) * r1) - 6);
			c.fillStyle = ACC2;
			c.fillText("PC2", P.sx(-Math.sin(th) * r2) + 8, P.sy(Math.cos(th) * r2) - 6);
		}
		// Kovarianz der gerade gezeigten Daten
		const sv = stats2(view);
		$("covM").innerHTML = [sv.a, sv.b, sv.b, sv.c].map((v) => `<span>${fmt(Math.abs(v) < 0.005 ? 0 : v)}</span>`).join("");
		$("eigVals").innerHTML = `λ₁ = <b style="color:${ACC}">${fmt(st.l1)}</b> · λ₂ = <b style="color:${ACC2}">${fmt(st.l2)}</b>`;
		const total = st.l1 + st.l2 || 1;
		$("explained").innerHTML = [
			["PC1", st.l1, ""],
			["PC2", st.l2, `background:${ACC2}`],
		]
			.map(([n, l, s]) => `<div class="prob"><span>${n}</span><div class="track"><div class="fill" style="width:${(l / total) * 100}%;${s}"></div></div><output>${fmt((l / total) * 100, 0)} %</output></div>`)
			.join("");
		$("eigTag").textContent = rot > 0.99 ? "In Hauptkomponenten gedreht" : rot < 0.01 ? "Zentrierte Daten" : "Drehen …";
	}

	const btnRotate = $("btnRotate");
	btnRotate.addEventListener("click", () => {
		rotTarget = rotTarget ? 0 : 1;
		btnRotate.setAttribute("aria-pressed", String(!!rotTarget));
		btnRotate.textContent = rotTarget ? "Zurück ins Original" : "In Hauptkomponenten drehen";
		const from = rot;
		const t0 = performance.now();
		const dur = reduced ? 1 : 1100;
		const step = (now) => {
			const k = Math.min(1, (now - t0) / dur);
			const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
			rot = from + (rotTarget - from) * e;
			redrawEig();
			if (k < 1) requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	});

	// ---------- Kapitel 3: Power-Iteration ----------
	const pPow = plot($("cvPow"), { aspect: (w) => (w < 520 ? 1 : 1.3), pad: 0, onResize: () => { iso(pPow); redrawPow(); } });
	iso(pPow);
	const R = 3.6;
	const pow = { v: [Math.cos(2.4), Math.sin(2.4)], trail: [], step: 0, auto: false };

	function powStep() {
		const [x, y] = pow.v;
		const w = [st.a * x + st.b * y, st.b * x + st.c * y];
		const len = Math.hypot(w[0], w[1]);
		if (len < 1e-12) return;
		pow.trail.push(pow.v);
		if (pow.trail.length > 12) pow.trail.shift();
		pow.v = [w[0] / len, w[1] / len];
		pow.step++;
	}

	function redrawPow() {
		const P = pPow;
		const c = P.ctx;
		P.clear();
		P.grid(1);
		const s = R / (2 * Math.sqrt(st.l1) || 1);
		// Wolke klein im Hintergrund
		for (const p of pts) P.dot((p.x - st.mx) * Math.min(1, s), (p.y - st.my) * Math.min(1, s), 2.5, "rgba(244,239,230,0.25)", "transparent");
		// PC1 als gestrichelte Linie
		c.setLineDash([6, 6]);
		c.strokeStyle = "rgba(155,229,100,0.4)";
		c.lineWidth = 1.5;
		c.beginPath();
		c.moveTo(P.sx(-Math.cos(st.th) * 20), P.sy(-Math.sin(st.th) * 20));
		c.lineTo(P.sx(Math.cos(st.th) * 20), P.sy(Math.sin(st.th) * 20));
		c.stroke();
		c.setLineDash([]);
		// Einheitskreis
		c.strokeStyle = "rgba(255,255,255,0.18)";
		c.beginPath();
		c.arc(P.sx(0), P.sy(0), P.sx(R) - P.sx(0), 0, Math.PI * 2);
		c.stroke();
		pow.trail.forEach((v, i) => {
			const a = (i + 1) / (pow.trail.length + 1);
			arrow(P, 0, 0, v[0] * R, v[1] * R, `rgba(92,200,255,${0.12 + a * 0.35})`, 2);
		});
		arrow(P, 0, 0, pow.v[0] * R, pow.v[1] * R, ACC2, 3.5);
		const cos = Math.abs(pow.v[0] * Math.cos(st.th) + pow.v[1] * Math.sin(st.th));
		const err = (Math.acos(Math.min(1, cos)) * 180) / Math.PI;
		const lam = st.a * pow.v[0] ** 2 + 2 * st.b * pow.v[0] * pow.v[1] + st.c * pow.v[1] ** 2;
		$("powStep").textContent = pow.step;
		$("powErr").textContent = `${fmt(err, err < 1 ? 3 : 1)}°`;
		$("powLam").textContent = fmt(lam);
		$("powReadout").textContent = `λ₁ = ${fmt(st.l1)}`;
		const ratio = st.l2 / (st.l1 || 1);
		$("powNote").textContent =
			err < 0.05
				? `Angekommen: Der Pfeil liegt auf PC1, und vᵀCv ergibt den Eigenwert λ₁.`
				: ratio > 0.85
					? "Die Wolke ist fast rund, beide Eigenwerte sind ähnlich groß. Dann dreht sich der Pfeil nur sehr langsam."
					: `Jede Runde schrumpft die Abweichung ungefähr um den Faktor λ₂/λ₁ = ${fmt(ratio)}.`;
		$("btnPowAuto").textContent = pow.auto ? "❚❚ Anhalten" : "▶ Automatisch";
	}

	$("btnPow").addEventListener("click", () => {
		powStep();
		redrawPow();
	});
	$("btnPowAuto").addEventListener("click", () => {
		pow.auto = !pow.auto;
		let last = 0;
		const loop = (t) => {
			if (!pow.auto) return;
			if (t - last > 380) {
				last = t;
				powStep();
				const cos = Math.abs(pow.v[0] * Math.cos(st.th) + pow.v[1] * Math.sin(st.th));
				if (cos > 0.9999999 || pow.step > 200) pow.auto = false;
				redrawPow();
			}
			requestAnimationFrame(loop);
		};
		redrawPow();
		requestAnimationFrame(loop);
	});
	function powReset(a = Math.random() * Math.PI * 2) {
		pow.v = [Math.cos(a), Math.sin(a)];
		pow.trail = [];
		pow.step = 0;
		pow.auto = false;
		redrawPow();
	}
	$("btnPowReset").addEventListener("click", () => {
		// nicht zu nah an PC1 starten, sonst gibt es nichts zu sehen
		powReset(st.th + Math.PI / 2 + (Math.random() - 0.5) * 0.6 + (Math.random() < 0.5 ? Math.PI : 0));
	});
	$("cvPow").addEventListener("pointerdown", (e) => {
		const r = e.currentTarget.getBoundingClientRect();
		const x = pPow.ix(e.clientX - r.left);
		const y = pPow.iy(e.clientY - r.top);
		if (Math.hypot(x, y) > 0.2) powReset(Math.atan2(y, x));
	});

	// ---------- Kapitel 4: 3D nach 2D ----------
	const COLORS = ["#ff8a5c", "#5cc8ff", "#9be564"];
	const thickIn = $("thickIn");
	let pts3 = [];
	let comps = [];
	const norm = (v) => {
		const l = Math.hypot(...v);
		return v.map((x) => x / l);
	};
	const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
	const u1 = norm([1, 0.35, 0.55]);
	let u2 = [-0.2, 1, 0.3];
	u2 = norm(u2.map((x, i) => x - dot(u2, u1) * u1[i]));
	const nrm = [u1[1] * u2[2] - u1[2] * u2[1], u1[2] * u2[0] - u1[0] * u2[2], u1[0] * u2[1] - u1[1] * u2[0]];
	const base3 = (() => {
		const r = rng(11);
		const centers = [[-2.6, -1.2], [2.4, -1.4], [0.2, 2.2]];
		const out = [];
		centers.forEach(([cx, cy], g) => {
			for (let i = 0; i < 45; i++) out.push({ a: cx + gauss(r) * 0.75, b: cy + gauss(r) * 0.75, n: gauss(r), g });
		});
		return out;
	})();

	function covariance(X) {
		const n = X.length;
		const d = X[0].length;
		const mean = Array(d).fill(0);
		X.forEach((r) => r.forEach((v, j) => (mean[j] += v / n)));
		const C = [...Array(d)].map(() => Array(d).fill(0));
		for (const r of X)
			for (let i = 0; i < d; i++)
				for (let j = 0; j < d; j++) C[i][j] += ((r[i] - mean[i]) * (r[j] - mean[j])) / n;
		return { C, mean };
	}
	function powerIteration(C, steps = 300) {
		let v = C.map((_, i) => 1 + i * 0.37);
		for (let s = 0; s < steps; s++) {
			const w = C.map((row) => row.reduce((a, c, j) => a + c * v[j], 0));
			const len = Math.hypot(...w) || 1;
			v = w.map((x) => x / len);
		}
		const Cv = C.map((row) => row.reduce((a, c, j) => a + c * v[j], 0));
		const lambda = Math.max(0, Cv.reduce((a, x, i) => a + x * v[i], 0));
		// Vorzeichen festlegen, damit das Bild nicht springt
		const big = v.reduce((m, x) => (Math.abs(x) > Math.abs(m) ? x : m), 0);
		if (big < 0) v = v.map((x) => -x);
		return { v, lambda };
	}

	function build3() {
		const t = (Number(thickIn.value) / 100) * 2.4;
		$("thickOut").textContent = fmt(t, 1);
		pts3 = base3.map((p) => ({
			p: [0, 1, 2].map((k) => p.a * u1[k] + p.b * u2[k] + p.n * t * nrm[k]),
			g: p.g,
		}));
		const X = pts3.map((q) => q.p);
		const { C, mean } = covariance(X);
		let M = C.map((r) => r.slice());
		comps = [];
		for (let k = 0; k < 3; k++) {
			const { v, lambda } = powerIteration(M);
			comps.push({ v, lambda });
			M = M.map((row, i) => row.map((x, j) => x - lambda * v[i] * v[j]));
		}
		pts3.forEach((q) => {
			const c = q.p.map((x, i) => x - mean[i]);
			q.pc = [dot(c, comps[0].v), dot(c, comps[1].v)];
		});
		const total = comps.reduce((s, c) => s + c.lambda, 0) || 1;
		const cols = [ACC, ACC2, "#ff8a7a"];
		$("explained3").innerHTML = comps
			.map((c, i) => `<div class="prob"><span>PC${i + 1}${i === 2 ? " (weg)" : ""}</span><div class="track"><div class="fill" style="width:${(c.lambda / total) * 100}%;background:${cols[i]}"></div></div><output>${fmt((c.lambda / total) * 100, 1)} %</output></div>`)
			.join("");
		draw2d();
	}

	const v3 = window.fitCanvas($("cv3d"), 1, () => ready && draw3d());
	const p2 = plot($("cv2d"), { aspect: 1, pad: 0, onResize: () => { iso(p2, 5.5); draw2d(); } });
	iso(p2, 5.5);
	const cam = { yaw: 0.6, pitch: 0.35, drag: null };

	function draw3d() {
		const c = v3.ctx;
		const { w, h } = v3.size;
		c.fillStyle = "#070806";
		c.fillRect(0, 0, w, h);
		const cy = Math.cos(cam.yaw);
		const sy = Math.sin(cam.yaw);
		const cp = Math.cos(cam.pitch);
		const sp = Math.sin(cam.pitch);
		const scale = w / 12;
		const proj = ([x, y, z]) => {
			// y nach oben: drehen um senkrechte Achse, dann kippen
			const x1 = x * cy - z * sy;
			const z1 = x * sy + z * cy;
			const y1 = y * cp - z1 * sp;
			const z2 = y * sp + z1 * cp;
			const f = 14 / (14 + z2);
			return [w / 2 + x1 * scale * f, h / 2 - y1 * scale * f, z2];
		};
		// Achsen
		const axes = [[[4, 0, 0], "x"], [[0, 4, 0], "y"], [[0, 0, 4], "z"]];
		c.lineWidth = 1;
		c.font = "12px Space Grotesk, sans-serif";
		for (const [a, name] of axes) {
			const o = proj([0, 0, 0]);
			const e = proj(a);
			const ne = proj(a.map((x) => -x));
			c.strokeStyle = "rgba(255,255,255,0.18)";
			c.beginPath();
			c.moveTo(ne[0], ne[1]);
			c.lineTo(e[0], e[1]);
			c.stroke();
			c.fillStyle = "rgba(244,239,230,0.45)";
			c.fillText(name, e[0] + 4, e[1] - 4);
			void o;
		}
		const list = pts3.map((q) => ({ s: proj(q.p), g: q.g })).sort((a, b) => b.s[2] - a.s[2]);
		for (const q of list) {
			const r = 3.6 * (14 / (14 + q.s[2]));
			c.beginPath();
			c.arc(q.s[0], q.s[1], r, 0, Math.PI * 2);
			c.fillStyle = COLORS[q.g];
			c.globalAlpha = 0.85;
			c.fill();
			c.globalAlpha = 1;
		}
	}

	function draw2d() {
		const P = p2;
		P.clear();
		P.grid(1);
		const c = P.ctx;
		c.font = "12px Space Grotesk, sans-serif";
		c.fillStyle = ACC;
		c.fillText("PC1 →", P.size.w - 52, P.sy(0) - 6);
		c.fillStyle = ACC2;
		c.fillText("PC2 ↑", P.sx(0) + 6, 16);
		for (const q of pts3) P.dot(q.pc[0], q.pc[1], 3.6, COLORS[q.g], "rgba(7,8,6,0.5)");
	}

	const c3 = $("cv3d");
	c3.addEventListener("pointerdown", (e) => {
		cam.drag = [e.clientX, e.clientY, cam.yaw, cam.pitch];
		c3.setPointerCapture(e.pointerId);
		c3.style.cursor = "grabbing";
	});
	c3.addEventListener("pointermove", (e) => {
		if (!cam.drag) return;
		cam.yaw = cam.drag[2] + (e.clientX - cam.drag[0]) * 0.01;
		cam.pitch = Math.max(-1.4, Math.min(1.4, cam.drag[3] + (e.clientY - cam.drag[1]) * 0.01));
		draw3d();
	});
	const endDrag = () => {
		cam.drag = null;
		c3.style.cursor = "";
	};
	c3.addEventListener("pointerup", endDrag);
	c3.addEventListener("pointercancel", endDrag);
	thickIn.addEventListener("input", () => {
		build3();
		draw3d();
	});
	if (!reduced)
		window.whenVisible(c3, (dt) => {
			if (cam.drag) return;
			cam.yaw += dt * 0.25;
			draw3d();
		});

	// ---------- Alles verbinden ----------
	function redrawAll() {
		if (!ready) return;
		redrawAxis();
		redrawEig();
		redrawPow();
	}
	const redrawSoon = scheduler(redrawAll);
	function dataChanged() {
		st = stats2(pts);
		redrawSoon();
	}
	editPoints($("cvAxis"), pAxis, { points: () => pts, onChange: dataChanged, minPoints: 2 });

	ready = true;
	setTheta(theta);
	redrawAll();
	build3();
	draw3d();
})();
