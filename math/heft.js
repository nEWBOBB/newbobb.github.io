// Mathe-Heft: gemeinsame Helfer für Canvas, Ziehen, Prüfaufgaben und den Lernpfad.

(() => {
	const KEY = "newbobb-mathe-heft-v1";
	const C = {
		ink: "#1d3a86",
		inkSoft: "#3f5aa6",
		text: "#26262b",
		muted: "#7a766f",
		red: "#c8352e",
		green: "#22783e",
		orange: "#c8661a",
		hl: "#fff07a",
		hlPink: "#ffc2dc",
		blue: "#8fb1ff",
		grid: "rgba(54, 96, 160, 0.16)",
		gridStrong: "rgba(54, 96, 160, 0.32)",
		paper: "#fbf8ef",
	};
	const HAND = '"Caveat", "Comic Sans MS", cursive';
	const MONO = '"JetBrains Mono", ui-monospace, monospace';
	const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

	// Zahl mit deutschem Komma, Minus als echtes Minuszeichen
	const fmt = (x, d = 2) => {
		let s = (Math.round(x * 10 ** d) / 10 ** d).toFixed(d);
		if (s.includes(".")) s = s.replace(/\.?0+$/, "");
		return (s === "-0" ? "0" : s).replace(".", ",").replace("-", "−");
	};
	const num = (s) => Number(String(s).trim().replace(/\s/g, "").replace("−", "-").replace(",", "."));

	// Canvas an Breite und Pixeldichte anpassen; draw(ctx, w, h) bei jeder Änderung
	function stage(canvas, aspect, draw) {
		const ctx = canvas.getContext("2d");
		const s = { ctx, w: 0, h: 0, redraw };
		function redraw() {
			if (s.w) draw(ctx, s.w, s.h);
		}
		const fit = () => {
			const w = canvas.clientWidth;
			if (!w) return;
			const h = Math.round(typeof aspect === "function" ? aspect(w) : w * aspect);
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.style.height = `${h}px`;
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(h * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			s.w = w;
			s.h = h;
			redraw();
		};
		new ResizeObserver(fit).observe(canvas);
		// erst nach dem restlichen Aufbau der Stufe zeichnen
		queueMicrotask(fit);
		document.fonts?.ready.then(redraw);
		return s;
	}

	// Zeiger in CSS-Pixeln relativ zum Canvas; down() gibt true zurück, wenn etwas gegriffen wurde
	function drag(canvas, { down, move, up }) {
		let active = false;
		const pos = (e) => {
			const r = canvas.getBoundingClientRect();
			return { x: e.clientX - r.left, y: e.clientY - r.top };
		};
		canvas.addEventListener("pointerdown", (e) => {
			if (down(pos(e), e) === false) return;
			active = true;
			canvas.setPointerCapture(e.pointerId);
			e.preventDefault();
		});
		canvas.addEventListener("pointermove", (e) => {
			if (active) move(pos(e), e);
		});
		const end = () => {
			if (!active) return;
			active = false;
			up?.();
		};
		canvas.addEventListener("pointerup", end);
		canvas.addEventListener("pointercancel", end);
	}

	// Animationsschleife, die nur läuft, solange das Element sichtbar ist
	function loop(el, tick) {
		let on = false;
		let last = 0;
		let raf = 0;
		const step = (t) => {
			const dt = Math.min(0.05, (t - last) / 1000 || 0);
			last = t;
			if (tick(dt) === false) {
				on = false;
				return;
			}
			raf = requestAnimationFrame(step);
		};
		const api = {
			start() {
				if (on) return;
				on = true;
				last = performance.now();
				raf = requestAnimationFrame(step);
			},
			stop() {
				on = false;
				cancelAnimationFrame(raf);
			},
		};
		new IntersectionObserver(([en]) => (en.isIntersecting ? api.start() : api.stop())).observe(el);
		return api;
	}

	// Zeichenhelfer
	const pen = {
		line(ctx, x1, y1, x2, y2, color = C.ink, w = 2, dash) {
			ctx.save();
			ctx.strokeStyle = color;
			ctx.lineWidth = w;
			ctx.lineCap = "round";
			if (dash) ctx.setLineDash(dash);
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
			ctx.restore();
		},
		dot(ctx, x, y, r = 6, fill = C.ink, stroke) {
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fillStyle = fill;
			ctx.fill();
			if (stroke) {
				ctx.strokeStyle = stroke;
				ctx.lineWidth = 2;
				ctx.stroke();
			}
		},
		text(ctx, s, x, y, { size = 20, color = C.ink, align = "center", base = "middle", font = HAND, weight = 700 } = {}) {
			ctx.font = `${weight} ${size}px ${font}`;
			ctx.fillStyle = color;
			ctx.textAlign = align;
			ctx.textBaseline = base;
			ctx.fillText(s, x, y);
		},
		mono(ctx, s, x, y, opts = {}) {
			pen.text(ctx, s, x, y, { size: 12, weight: 500, font: MONO, color: C.text, ...opts });
		},
		arrow(ctx, x1, y1, x2, y2, color = C.ink, w = 2.5) {
			pen.line(ctx, x1, y1, x2, y2, color, w);
			const a = Math.atan2(y2 - y1, x2 - x1);
			const L = 9;
			ctx.save();
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.moveTo(x2, y2);
			ctx.lineTo(x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45));
			ctx.lineTo(x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45));
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		},
	};

	// Koordinatensystem: Welt → Pixel
	function axes(w, h, { xmin, xmax, ymin, ymax, pad = 18 }) {
		const sx = (w - 2 * pad) / (xmax - xmin);
		const sy = (h - 2 * pad) / (ymax - ymin);
		return {
			X: (x) => pad + (x - xmin) * sx,
			Y: (y) => h - pad - (y - ymin) * sy,
			ix: (px) => xmin + (px - pad) / sx,
			iy: (py) => ymin + (h - pad - py) / sy,
			sx,
			sy,
			xmin,
			xmax,
			ymin,
			ymax,
		};
	}

	function drawAxes(ctx, A, { step = 1, labels = true, every = 1 } = {}) {
		ctx.save();
		ctx.lineWidth = 1;
		ctx.strokeStyle = C.grid;
		for (let x = Math.ceil(A.xmin / step) * step; x <= A.xmax + 1e-9; x += step) {
			ctx.beginPath();
			ctx.moveTo(A.X(x), A.Y(A.ymin));
			ctx.lineTo(A.X(x), A.Y(A.ymax));
			ctx.stroke();
		}
		for (let y = Math.ceil(A.ymin / step) * step; y <= A.ymax + 1e-9; y += step) {
			ctx.beginPath();
			ctx.moveTo(A.X(A.xmin), A.Y(y));
			ctx.lineTo(A.X(A.xmax), A.Y(y));
			ctx.stroke();
		}
		ctx.restore();
		if (A.ymin <= 0 && A.ymax >= 0) pen.line(ctx, A.X(A.xmin), A.Y(0), A.X(A.xmax), A.Y(0), C.text, 1.5);
		if (A.xmin <= 0 && A.xmax >= 0) pen.line(ctx, A.X(0), A.Y(A.ymin), A.X(0), A.Y(A.ymax), C.text, 1.5);
		if (!labels) return;
		for (let x = Math.ceil(A.xmin / step) * step; x <= A.xmax + 1e-9; x += step) {
			const k = Math.round(x / step);
			if (Math.abs(x) < 1e-9 || k % every) continue;
			pen.mono(ctx, fmt(x), A.X(x), A.Y(Math.max(A.ymin, Math.min(A.ymax, 0))) + 11, { size: 10, color: C.muted });
		}
		for (let y = Math.ceil(A.ymin / step) * step; y <= A.ymax + 1e-9; y += step) {
			const k = Math.round(y / step);
			if (Math.abs(y) < 1e-9 || k % every) continue;
			pen.mono(ctx, fmt(y), A.X(Math.max(A.xmin, Math.min(A.xmax, 0))) - 5, A.Y(y), { size: 10, color: C.muted, align: "right" });
		}
	}

	// ---------- Fortschritt ----------
	let done = new Set();
	try {
		done = new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
	} catch {
		/* ohne Speicher geht es auch */
	}
	const save = () => {
		try {
			localStorage.setItem(KEY, JSON.stringify([...done]));
		} catch {
			/* egal */
		}
	};

	const tasksOf = (n) => [...document.querySelectorAll(`.pruef[data-task^="${n}"]`)].filter((t) => parseInt(t.dataset.task, 10) === n);
	const stufeDone = (n) => {
		const t = tasksOf(n);
		return t.length > 0 && t.every((x) => done.has(x.dataset.task));
	};

	function refreshPath() {
		const stufen = [...document.querySelectorAll(".stufe")];
		let count = 0;
		stufen.forEach((s) => {
			const n = Number(s.dataset.n);
			const ok = stufeDone(n);
			if (ok) count++;
			document.querySelector(`.path a[href="#s${n}"]`)?.classList.toggle("done", ok);
		});
		const bar = document.querySelector(".meter b");
		if (bar) bar.style.width = `${(count / stufen.length) * 100}%`;
		const lbl = document.querySelector(".meter span");
		if (lbl) lbl.textContent = `${count} / ${stufen.length}`;
	}

	function mark(task, msg) {
		const el = document.querySelector(`.pruef[data-task="${task}"]`);
		if (!el) return;
		el.classList.add("solved");
		if (msg) feedback(el, msg, true);
		if (!done.has(task)) {
			done.add(task);
			save();
			refreshPath();
		}
	}

	function feedback(el, msg, ok) {
		const f = el.querySelector(".feedback");
		if (!f) return;
		f.textContent = msg;
		f.className = `feedback ${ok ? "ok" : "no"}`;
	}

	// Eingabeaufgaben: <form data-answer="182" data-tol="0" data-ok="…" data-hint="…">
	function wireForms() {
		document.querySelectorAll(".pruef form[data-answer]").forEach((form) => {
			const box = form.closest(".pruef");
			form.addEventListener("submit", (e) => {
				e.preventDefault();
				const v = num(form.querySelector("input").value);
				const answers = form.dataset.answer.split("|").map(Number);
				const tol = Number(form.dataset.tol || 0) + 1e-9;
				if (!Number.isFinite(v)) return feedback(box, "Schreib eine Zahl hinein.", false);
				if (answers.some((a) => Math.abs(v - a) <= tol)) mark(box.dataset.task, `Richtig! ${form.dataset.ok || ""}`);
				else {
					const a = answers[0];
					const dir = v < a ? "Etwas zu klein." : "Etwas zu groß.";
					feedback(box, `Noch nicht. ${form.dataset.dir === "0" ? "" : dir} ${form.dataset.hint || ""}`, false);
				}
			});
		});
	}

	// Auswahlaufgaben: <div class="choices" data-right="2" data-ok="…" data-no="…"> mit Buttons
	function wireChoices() {
		document.querySelectorAll(".pruef .choices[data-right]").forEach((wrap) => {
			const box = wrap.closest(".pruef");
			const right = Number(wrap.dataset.right);
			[...wrap.querySelectorAll("button")].forEach((b, i) =>
				b.addEventListener("click", () => {
					if (i === right) {
						wrap.querySelectorAll("button").forEach((x) => x.classList.remove("wrong"));
						b.classList.add("right");
						mark(box.dataset.task, `Richtig! ${wrap.dataset.ok || ""}`);
					} else {
						b.classList.add("wrong");
						feedback(box, `Nicht ganz. ${wrap.dataset.no || ""}`, false);
					}
				})
			);
		});
	}

	function buildPath() {
		const host = document.querySelector("[data-path]");
		if (!host) return;
		const groups = new Map();
		document.querySelectorAll(".stufe").forEach((s) => {
			const g = s.dataset.group;
			if (!groups.has(g)) groups.set(g, []);
			groups.get(g).push(s);
		});
		host.innerHTML = [...groups]
			.map(
				([g, list]) => `<div class="path-group"><h3>${g}</h3><ol>${list
					.map((s) => {
						const t = s.querySelector("h2").textContent;
						return `<li><a href="#s${s.dataset.n}" aria-label="Stufe ${s.dataset.n}: ${t}">${s.dataset.n}<span class="tip" aria-hidden="true">${t}</span></a></li>`;
					})
					.join("")}</ol></div>`
			)
			.join("");
	}

	function restore() {
		done.forEach((t) => document.querySelector(`.pruef[data-task="${t}"]`)?.classList.add("solved"));
		refreshPath();
		document.querySelector("[data-reset]")?.addEventListener("click", () => {
			done.clear();
			save();
			document.querySelectorAll(".pruef.solved").forEach((p) => p.classList.remove("solved"));
			refreshPath();
		});
	}

	window.H = { C, HAND, MONO, reduced, fmt, num, stage, drag, loop, pen, axes, drawAxes, mark, feedback, isDone: (t) => done.has(t) };

	document.addEventListener("DOMContentLoaded", () => {
		buildPath();
		wireForms();
		wireChoices();
		restore();
	});
})();
