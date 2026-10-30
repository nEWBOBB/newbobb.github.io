// Heft 1: Stellenwert, Fläche, Brüche, negative Zahlen, Gleichungen
(() => {
const { C, fmt, stage, drag, loop, pen, mark, feedback } = window.H;

// ---------- Stufe 1: Zahlen bauen ----------
(() => {
	const host = document.getElementById("places");
	const out = document.getElementById("placeNum");
	const targetEl = document.getElementById("placeTarget");
	const box = document.querySelector('[data-task="1a"]');
	const st = { h: 0, z: 0, e: 0 };
	const MAX = 19;
	let target = 347;
	let fresh = null;

	const cols = [
		{ k: "h", name: "Hunderter", cls: "h" },
		{ k: "z", name: "Zehner", cls: "z", up: "h" },
		{ k: "e", name: "Einer", cls: "e", up: "z" },
	];
	host.innerHTML = cols
		.map(
			(c) => `<div class="place ${c.cls}"><h4>${c.name}</h4><div class="pile" data-pile="${c.k}"></div>
			<div><div class="pm"><button class="btn" type="button" data-k="${c.k}" data-d="-1" aria-label="Ein ${c.name}-Teil weniger">−</button><button class="btn" type="button" data-k="${c.k}" data-d="1" aria-label="Ein ${c.name}-Teil mehr">+</button></div>
			${c.up ? `<p style="margin:6px 0 0;text-align:center"><button class="btn bundle" type="button" data-bundle="${c.k}" hidden>10 bündeln ↑</button></p>` : ""}</div></div>`
		)
		.join("");

	function render() {
		cols.forEach((c) => {
			const pile = host.querySelector(`[data-pile="${c.k}"]`);
			pile.innerHTML = Array.from(
				{ length: st[c.k] },
				(_, i) => `<span class="blk ${c.cls}${fresh && fresh.k === c.k && i >= st[c.k] - fresh.n ? " pop" : ""}"></span>`
			).join("");
			const b = host.querySelector(`[data-bundle="${c.k}"]`);
			if (b) b.hidden = st[c.k] < 10;
			host.querySelector(`[data-k="${c.k}"][data-d="1"]`).disabled = st[c.k] >= MAX;
			host.querySelector(`[data-k="${c.k}"][data-d="-1"]`).disabled = st[c.k] <= 0;
		});
		fresh = null;
		const v = st.h * 100 + st.z * 10 + st.e;
		out.innerHTML = `${v}<small>${st.h}·100 + ${st.z}·10 + ${st.e}·1</small>`;
		check(v);
	}

	function check(v) {
		const t = [Math.floor(target / 100), Math.floor(target / 10) % 10, target % 10];
		if (st.h === t[0] && st.z === t[1] && st.e === t[2]) mark("1a", `Richtig! ${target} = ${t[0]} Hunderter, ${t[1]} Zehner, ${t[2]} Einer.`);
		else if (v === target) feedback(box, "Die Menge stimmt schon! Aber du kannst noch bündeln, bis überall höchstens 9 liegen.", false);
		else if (!box.classList.contains("solved")) feedback(box, "", true);
	}

	host.addEventListener("click", (e) => {
		const b = e.target.closest("button");
		if (!b) return;
		if (b.dataset.k) {
			const k = b.dataset.k;
			st[k] = Math.max(0, Math.min(MAX, st[k] + Number(b.dataset.d)));
			if (b.dataset.d === "1") fresh = { k, n: 1 };
		} else if (b.dataset.bundle) {
			const k = b.dataset.bundle;
			const up = cols.find((c) => c.k === k).up;
			if (st[k] >= 10 && st[up] < MAX) {
				st[k] -= 10;
				st[up] += 1;
				fresh = { k: up, n: 1 };
			}
		}
		render();
	});

	document.getElementById("placeNew").addEventListener("click", () => {
		target = 100 + Math.floor(Math.random() * 900);
		targetEl.textContent = target;
		box.classList.remove("solved");
		render();
	});
	render();
})();

// ---------- Stufe 2: Malnehmen ist Fläche ----------
(() => {
	const cv = document.getElementById("areaCv");
	const out = document.getElementById("areaOut");
	const note = document.getElementById("areaNote");
	const btnSplit = document.getElementById("areaSplit");
	const MAXC = 20;
	const MAXR = 15;
	let a = 4; // Breite
	let b = 3; // Höhe
	let split = false;
	const PAD = 26;
	const cellOf = (w) => Math.min(24, (w - PAD - 8) / MAXC);

	const S = stage(cv, (w) => PAD + MAXR * cellOf(w) + 8, draw);

	function draw(ctx, w, h) {
		const c = cellOf(w);
		ctx.clearRect(0, 0, w, h);
		const X = (i) => PAD + i * c;
		const Y = (j) => PAD + j * c;
		// Gitter
		ctx.strokeStyle = C.grid;
		ctx.lineWidth = 1;
		for (let i = 0; i <= MAXC; i++) pen.line(ctx, X(i), Y(0), X(i), Y(MAXR), C.grid, 1);
		for (let j = 0; j <= MAXR; j++) pen.line(ctx, X(0), Y(j), X(MAXC), Y(j), C.grid, 1);

		const parts = (n) => (split && n > 10 ? [10, n - 10] : [n]);
		const pa = parts(a);
		const pb = parts(b);
		const fills = ["rgba(143,177,255,0.55)", "rgba(255,240,122,0.8)", "rgba(255,194,220,0.75)", "rgba(123,220,154,0.55)"];
		let k = 0;
		let y0 = 0;
		pb.forEach((hh) => {
			let x0 = 0;
			pa.forEach((ww) => {
				ctx.fillStyle = fills[split ? k % 4 : 0];
				ctx.fillRect(X(x0), Y(y0), ww * c, hh * c);
				if (split && (pa.length > 1 || pb.length > 1)) {
					const fs = Math.max(13, Math.min(26, Math.min(ww, hh) * c * 0.5));
					pen.text(ctx, `${hh}·${ww}=${hh * ww}`, X(x0 + ww / 2), Y(y0 + hh / 2), { size: fs });
				}
				x0 += ww;
				k++;
			});
			y0 += hh;
		});
		// Kästchenlinien im Rechteck
		for (let i = 0; i <= a; i++) pen.line(ctx, X(i), Y(0), X(i), Y(b), "rgba(29,58,134,0.35)", 1);
		for (let j = 0; j <= b; j++) pen.line(ctx, X(0), Y(j), X(a), Y(j), "rgba(29,58,134,0.35)", 1);
		ctx.strokeStyle = C.ink;
		ctx.lineWidth = 2.5;
		ctx.strokeRect(X(0), Y(0), a * c, b * c);
		if (split) {
			if (a > 10) pen.line(ctx, X(10), Y(0), X(10), Y(b), C.red, 2.5, [6, 4]);
			if (b > 10) pen.line(ctx, X(0), Y(10), X(a), Y(10), C.red, 2.5, [6, 4]);
		}
		// Seitenbeschriftung
		pen.text(ctx, String(a), X(a / 2), PAD / 2, { size: 20 });
		pen.text(ctx, String(b), PAD / 2, Y(b / 2), { size: 20 });
		// Griff
		pen.dot(ctx, X(a), Y(b), 9, C.orange, "#fff");
	}

	function update() {
		const prod = a * b;
		out.textContent = `${b} · ${a} = ${prod}`;
		if (split && (a > 10 || b > 10)) {
			const pa = a > 10 ? [10, a - 10] : [a];
			const pb = b > 10 ? [10, b - 10] : [b];
			const terms = [];
			pb.forEach((y) => pa.forEach((x) => terms.push(y * x)));
			note.textContent = `${terms.join(" + ")} = ${prod}`;
		} else if (split) note.textContent = "Zerlegen lohnt sich erst, wenn eine Seite länger als 10 ist.";
		else note.textContent = `${b} Reihen mit je ${a} Kästchen = ${prod} Kästchen.`;
		S.redraw();
	}

	drag(cv, {
		down: (p) => set(p),
		move: (p) => set(p),
	});
	function set(p) {
		const c = cellOf(S.w);
		a = Math.max(1, Math.min(MAXC, Math.round((p.x - PAD) / c)));
		b = Math.max(1, Math.min(MAXR, Math.round((p.y - PAD) / c)));
		update();
	}
	btnSplit.addEventListener("click", () => {
		split = !split;
		btnSplit.setAttribute("aria-pressed", String(split));
		update();
	});
	document.getElementById("area1314").addEventListener("click", () => {
		a = 13;
		b = 14;
		split = true;
		btnSplit.setAttribute("aria-pressed", "true");
		update();
	});
	update();
})();

// ---------- Stufe 3: Brüche ----------
(() => {
	const cv = document.getElementById("fracCv");
	const out = document.getElementById("fracOut");
	const note = document.getElementById("fracNote");
	const ids = ["fa1", "fa2", "fb1", "fb2"];
	const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
	const gcd = (x, y) => (y ? gcd(y, x % y) : x);
	const lcm = (x, y) => (x * y) / gcd(x, y);
	const box = document.querySelector('[data-task="3a"]');

	const S = stage(cv, (w) => (w < 480 ? 150 : 170), draw);
	const vals = () => ({ a: +el.fa1.value, b: +el.fa2.value, c: +el.fb1.value, d: +el.fb2.value });

	function bar(ctx, x, y, W, H, z, n, color) {
		const seg = W / n;
		for (let i = 0; i < n; i++) {
			ctx.fillStyle = i < z ? color : "#fff";
			ctx.fillRect(x + i * seg, y, seg, H);
		}
		ctx.strokeStyle = C.ink;
		ctx.lineWidth = 1.5;
		for (let i = 1; i < n; i++) pen.line(ctx, x + i * seg, y, x + i * seg, y + H, C.ink, 1.2);
		ctx.lineWidth = 2.5;
		ctx.strokeRect(x, y, W, H);
	}

	function draw(ctx, w, h) {
		const { a, b, c, d } = vals();
		ctx.clearRect(0, 0, w, h);
		const x = 52;
		const W = w - x - 16;
		const H = 40;
		pen.text(ctx, `${a}/${b}`, 26, 34 + H / 2 - 10, { size: 26 });
		bar(ctx, x, 14, W, H, a, b, C.blue);
		pen.text(ctx, `${c}/${d}`, 26, h - 34 - H / 2 + 10, { size: 26 });
		bar(ctx, x, h - 14 - H, W, H, c, d, C.hlPink);
		// Endmarken
		const ya = 14 + H;
		const yb = h - 14 - H;
		pen.line(ctx, x + (W * a) / b, ya, x + (W * a) / b, yb, C.ink, 1.5, [4, 4]);
		pen.line(ctx, x + (W * c) / d, ya, x + (W * c) / d, yb, C.red, 1.5, [4, 4]);
		pen.mono(ctx, "0", x, (ya + yb) / 2, { color: C.muted });
		pen.mono(ctx, "1 Ganzes", x + W, (ya + yb) / 2, { color: C.muted, align: "right" });
	}

	function update() {
		// Zähler darf nicht größer werden als der Nenner
		el.fa1.max = el.fa2.value;
		el.fb1.max = el.fb2.value;
		if (+el.fa1.value > +el.fa2.value) el.fa1.value = el.fa2.value;
		if (+el.fb1.value > +el.fb2.value) el.fb1.value = el.fb2.value;
		ids.forEach((id) => (document.getElementById(`${id}o`).textContent = el[id].value));
		const { a, b, c, d } = vals();
		const L = a * d;
		const R = c * b;
		const rel = L === R ? "=" : L > R ? ">" : "<";
		out.textContent = `${a}/${b} ${rel} ${c}/${d}`;
		const m = lcm(b, d);
		const pct = (v) => fmt(v * 100, 1);
		note.textContent = `${a}/${b} = ${fmt(a / b, 3)} = ${pct(a / b)} % · ${c}/${d} = ${fmt(c / d, 3)} = ${pct(c / d)} % · gemeinsamer Nenner ${m}: ${(a * m) / b}/${m} und ${(c * m) / d}/${m}`;
		S.redraw();
		if (L === R && b !== d && a > 0) mark("3a", `Genau: ${a}/${b} = ${c}/${d}. Erweitert auf ${m}tel sind beide ${(a * m) / b}/${m}.`);
		else if (!box.classList.contains("solved")) feedback(box, L === R && b === d ? "Gleich lang, aber mit demselben Nenner. Nimm verschiedene!" : "", false);
	}
	ids.forEach((id) => el[id].addEventListener("input", update));
	update();
})();

// ---------- Stufe 4: Negative Zahlen ----------
(() => {
	const cv = document.getElementById("frogCv");
	const out = document.getElementById("frogOut");
	const note = document.getElementById("frogNote");
	const sIn = document.getElementById("fs");
	const nIn = document.getElementById("fn");
	const bPlus = document.getElementById("fopPlus");
	const bMinus = document.getElementById("fopMinus");
	const R = 14;
	let minus = false;
	const frog = { x: 2, face: 1, flip: 1, hop: 0 };
	let queue = [];
	let cur = null;

	const S = stage(cv, (w) => (w < 480 ? 140 : 160), draw);
	const X = (v) => 20 + ((v + R) / (2 * R)) * (S.w - 40);
	const show = (v) => (v < 0 ? `(−${-v})` : String(v));
	const expr = () => `${String(+sIn.value).replace("-", "−")} ${minus ? "−" : "+"} ${show(+nIn.value)}`;

	function draw(ctx, w, h) {
		ctx.clearRect(0, 0, w, h);
		const y = h - 40;
		pen.line(ctx, 14, y, w - 14, y, C.text, 2);
		const unit = (w - 40) / (2 * R);
		const every = unit > 22 ? 1 : 2;
		for (let v = -R; v <= R; v++) {
			const big = v % every === 0;
			pen.line(ctx, X(v), y - (big ? 7 : 4), X(v), y + (big ? 7 : 4), v === 0 ? C.text : C.muted, v === 0 ? 2 : 1);
			if (big) pen.mono(ctx, String(v).replace("-", "−"), X(v), y + 20, { size: 11, color: v < 0 ? C.red : v > 0 ? C.ink : C.text });
		}
		// Frosch
		const fx = X(frog.x);
		const fy = y - 18 - Math.sin(frog.hop * Math.PI) * Math.min(40, unit * 2 + 12);
		ctx.save();
		ctx.translate(fx, fy);
		ctx.scale(frog.flip, 1);
		ctx.fillStyle = "#3f9a52";
		ctx.strokeStyle = "#1f5a2c";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
		// Augen in Blickrichtung
		pen.dot(ctx, 7, -10, 5, "#fff", "#1f5a2c");
		pen.dot(ctx, 9, -10, 2.2, "#111");
		pen.dot(ctx, -3, -11, 4.5, "#fff", "#1f5a2c");
		pen.dot(ctx, -1, -11, 2, "#111");
		ctx.beginPath();
		ctx.strokeStyle = "#1f5a2c";
		ctx.arc(8, 2, 5, 0.2, 1.4);
		ctx.stroke();
		ctx.restore();
		// Blickpfeil
		if (Math.abs(frog.flip) > 0.9) pen.arrow(ctx, fx + frog.face * 22, fy - 30, fx + frog.face * 40, fy - 30, C.orange, 2);
	}

	function plan() {
		const s = +sIn.value;
		const n = +nIn.value;
		frog.x = s;
		frog.face = 1;
		frog.flip = 1;
		frog.hop = 0;
		queue = [];
		const look = n >= 0 ? 1 : -1;
		if (look !== frog.face) queue.push({ t: "turn", to: look, msg: `${show(n)} ist negativ: Blick nach links.` });
		else queue.push({ t: "wait", msg: n === 0 ? "Null: kein Sprung." : `${show(n)} ist positiv: Blick nach rechts.` });
		let face = look;
		if (minus) {
			face = -face;
			queue.push({ t: "turn", to: face, msg: "Minus: umdrehen!" });
		}
		for (let i = 0; i < Math.abs(n); i++) queue.push({ t: "hop", dir: face, msg: `Springen … ${i + 1}` });
		const res = minus ? s - n : s + n;
		queue.push({ t: "done", msg: `${expr()} = ${String(res).replace("-", "−")}` });
		cur = null;
		note.textContent = "";
		out.textContent = `${expr()} = ?`;
		anim.start();
	}

	const anim = loop(cv, (dt) => {
		if (!cur) {
			cur = queue.shift();
			if (!cur) {
				S.redraw();
				return false;
			}
			cur.p = 0;
			cur.from = frog.x;
			cur.fFrom = frog.flip;
			note.textContent = cur.msg;
			if (cur.t === "done") out.textContent = cur.msg;
		}
		const speed = H.reduced ? 99 : cur.t === "hop" ? 3.2 : cur.t === "turn" ? 2.5 : 1.6;
		cur.p = Math.min(1, cur.p + dt * speed);
		if (cur.t === "hop") {
			frog.x = cur.from + cur.dir * cur.p;
			frog.hop = cur.p;
		} else if (cur.t === "turn") {
			frog.flip = cur.fFrom + (cur.to - cur.fFrom) * cur.p;
			if (cur.p >= 1) frog.face = cur.to;
		}
		S.redraw();
		if (cur.p >= 1) {
			if (cur.t === "hop") {
				frog.x = Math.round(frog.x);
				frog.hop = 0;
			}
			cur = null;
		}
	});
	anim.stop();

	const setOp = (m) => {
		minus = m;
		bPlus.setAttribute("aria-pressed", String(!m));
		bMinus.setAttribute("aria-pressed", String(m));
		reset();
	};
	function reset() {
		document.getElementById("fsO").textContent = sIn.value.replace("-", "−");
		document.getElementById("fnO").textContent = nIn.value.replace("-", "−");
		queue = [];
		cur = null;
		anim.stop();
		frog.x = +sIn.value;
		frog.face = 1;
		frog.flip = 1;
		frog.hop = 0;
		out.textContent = `${expr()} = ?`;
		note.textContent = "Drück „Springen!“";
		S.redraw();
	}
	bPlus.addEventListener("click", () => setOp(false));
	bMinus.addEventListener("click", () => setOp(true));
	sIn.min = nIn.min = -6;
	sIn.max = nIn.max = 6;
	sIn.addEventListener("input", reset);
	nIn.addEventListener("input", reset);
	document.getElementById("frogGo").addEventListener("click", plan);
	reset();
})();

// ---------- Stufe 5: Gleichungen als Waage ----------
(() => {
	const cv = document.getElementById("scaleCv");
	const out = document.getElementById("scaleOut");
	const note = document.getElementById("scaleNote");
	const count = document.getElementById("scaleCount");
	const PUZ = [
		{ L: { x: 3, n: 2 }, R: { x: 0, n: 11 }, x: 3 },
		{ L: { x: 2, n: 5 }, R: { x: 0, n: 13 }, x: 4 },
		{ L: { x: 5, n: 1 }, R: { x: 2, n: 10 }, x: 3 },
		{ L: { x: 4, n: 3 }, R: { x: 1, n: 12 }, x: 3 },
	];
	const solved = new Set();
	let idx = 0;
	let st;
	let cheated = false;
	let tilt = 0;
	let lock = false;

	const S = stage(cv, (w) => (w < 480 ? 230 : 260), draw);
	const weight = (side) => side.x * PUZ[idx].x + side.n;
	const side = (s) => [s.x ? `${s.x === 1 ? "" : s.x}x` : "", s.n ? String(s.n) : ""].filter(Boolean).join(" + ") || "0";

	function load(i) {
		idx = i;
		st = { L: { ...PUZ[i].L }, R: { ...PUZ[i].R } };
		cheated = false;
		lock = false;
		note.textContent = "Nimm erst lose Gewichte oder Kisten auf beiden Seiten weg.";
		update();
	}

	function drawPan(ctx, cx, cy, s, pw) {
		// Gehänge
		pen.line(ctx, cx, cy, cx - pw / 2 + 6, cy + 34, C.muted, 1.2);
		pen.line(ctx, cx, cy, cx + pw / 2 - 6, cy + 34, C.muted, 1.2);
		const py = cy + 34;
		ctx.fillStyle = C.ink;
		ctx.fillRect(cx - pw / 2, py, pw, 5);
		// Inhalt von unten nach oben stapeln
		const items = [...Array(s.x).fill("x"), ...Array(s.n).fill("1")];
		const wr = Math.max(18, Math.min(24, pw / 9));
		const bx = Math.round(wr * 1.35);
		let x = cx - pw / 2 + 4;
		let y = py;
		let rowH = 0;
		items.forEach((it) => {
			const iw = it === "x" ? bx : wr;
			if (x + iw > cx + pw / 2 - 2) {
				x = cx - pw / 2 + 4;
				y -= rowH + 2;
				rowH = 0;
			}
			if (it === "x") {
				ctx.fillStyle = C.hl;
				ctx.fillRect(x, y - bx, bx, bx);
				ctx.strokeStyle = C.ink;
				ctx.lineWidth = 2;
				ctx.strokeRect(x, y - bx, bx, bx);
				pen.text(ctx, "x", x + bx / 2, y - bx / 2 - 1, { size: bx * 0.8 });
				rowH = Math.max(rowH, bx);
			} else {
				pen.dot(ctx, x + wr / 2, y - wr / 2, wr / 2 - 1, "#cfd8ea", C.ink);
				pen.mono(ctx, "1", x + wr / 2, y - wr / 2 + 0.5, { size: 10, weight: 700 });
				rowH = Math.max(rowH, wr);
			}
			x += iw + 2;
		});
	}

	function draw(ctx, w, h) {
		ctx.clearRect(0, 0, w, h);
		const cx = w / 2;
		const top = 70 + Math.min(60, h * 0.15);
		const pw = Math.min(w * 0.34, 220);
		const half = Math.min((w - pw) / 2 - 8, 280);
		// Ständer
		ctx.fillStyle = C.muted;
		ctx.beginPath();
		ctx.moveTo(cx, top);
		ctx.lineTo(cx - 26, h - 8);
		ctx.lineTo(cx + 26, h - 8);
		ctx.closePath();
		ctx.fill();
		// Balken
		const dx = Math.cos(tilt) * half;
		const dy = Math.sin(tilt) * half;
		pen.line(ctx, cx - dx, top + dy, cx + dx, top - dy, C.text, 5);
		pen.dot(ctx, cx, top, 6, C.text);
		drawPan(ctx, cx - dx, top + dy, st.L, pw);
		drawPan(ctx, cx + dx, top - dy, st.R, pw);
		if (cheated) pen.text(ctx, "kippt!", cx, 22, { size: 26, color: C.red });
	}

	function update() {
		const ok = !cheated && weight(st.L) === weight(st.R);
		out.textContent = `${side(st.L)} ${ok ? "=" : "≠"} ${side(st.R)}`;
		count.textContent = `${solved.size} von ${PUZ.length} gelöst.`;
		anim.start();
		if (ok && st.L.x === 1 && st.L.n === 0 && st.R.x === 0 && !lock) {
			lock = true;
			solved.add(idx);
			count.textContent = `${solved.size} von ${PUZ.length} gelöst.`;
			note.textContent = `Gelöst: x = ${st.R.n}. Jede Kiste wiegt ${st.R.n}.`;
			if (solved.size === PUZ.length) mark("5a", "Alle vier Waagen gelöst! Du hast Gleichungen gelöst wie in der Schule, nur mit Gewichten.");
			setTimeout(() => {
				const next = PUZ.findIndex((_, i) => !solved.has(i));
				if (next >= 0) load(next);
			}, 1600);
		}
	}

	const anim = loop(cv, (dt) => {
		const diff = cheated ? weight(st.L) - weight(st.R) - 0.0001 : 0;
		const target = Math.max(-0.22, Math.min(0.22, -diff * 0.06));
		tilt += (target - tilt) * Math.min(1, dt * (H.reduced ? 99 : 6));
		S.redraw();
		if (Math.abs(target - tilt) < 0.001) return false;
	});

	document.querySelectorAll("[data-op]").forEach((b) =>
		b.addEventListener("click", () => {
			if (lock) return;
			const op = b.dataset.op;
			const { L, R } = st;
			if (op === "reset") return load(idx);
			if (cheated && op !== "reset") {
				note.textContent = "Die Waage ist schon gekippt. Drück „Neu“, um die Gleichung wiederherzustellen.";
				return;
			}
			if (op === "sub1") {
				if (L.n > 0 && R.n > 0) {
					L.n--;
					R.n--;
					note.textContent = "Beide Seiten 1 leichter: Die Waage bleibt gerade.";
				} else note.textContent = "Auf einer Seite liegt kein Gewicht mehr.";
			} else if (op === "subx") {
				if (L.x > 0 && R.x > 0) {
					L.x--;
					R.x--;
					note.textContent = "Auf beiden Seiten eine Kiste weg: bleibt gerade.";
				} else note.textContent = "Dafür muss auf beiden Seiten eine Kiste liegen.";
			} else if (op === "div") {
				const k = L.x;
				if (R.x === 0 && L.n === 0 && k > 1 && R.n % k === 0) {
					note.textContent = `Beide Seiten durch ${k}: eine Kiste links, ${R.n / k} Gewichte rechts.`;
					L.x = 1;
					R.n /= k;
				} else if (L.n > 0) note.textContent = "Teilen geht erst gut, wenn links nur noch Kisten liegen.";
				else if (R.x > 0) note.textContent = "Erst müssen die Kisten rechts weg.";
				else note.textContent = "Hier gibt es nichts mehr zu teilen.";
			} else if (op === "cheat") {
				if (L.n > 0) {
					L.n--;
					cheated = true;
					note.textContent = "Nur links weggenommen: Die Seiten sind nicht mehr gleich. Das ist keine Gleichung mehr.";
				} else note.textContent = "Links liegt kein Gewicht.";
			}
			update();
		})
	);
	load(0);
})();
})();
