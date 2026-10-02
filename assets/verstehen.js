// Gemeinsame Helfer der Reihe „Verstehen“: Lesefortschritt, Einblenden, Quiz, Schieberegler, Canvas.

(() => {
	const bar = document.querySelector(".v-progress");
	if (bar) {
		const update = () => {
			const max = document.documentElement.scrollHeight - window.innerHeight;
			bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
		};
		window.addEventListener("scroll", update, { passive: true });
		update();
	}

	const io = new IntersectionObserver(
		(entries) =>
			entries.forEach((en) => {
				if (!en.isIntersecting) return;
				en.target.classList.add("is-in");
				io.unobserve(en.target);
			}),
		{ rootMargin: "0px 0px -8% 0px" }
	);
	document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

	// Quiz: <div class="quiz" data-answer="1" data-why="..."> mit Buttons in .quiz-options
	document.querySelectorAll(".quiz").forEach((quiz) => {
		const right = Number(quiz.dataset.answer);
		const buttons = [...quiz.querySelectorAll(".quiz-options button")];
		const why = document.createElement("p");
		why.className = "quiz-why";
		why.setAttribute("aria-live", "polite");
		quiz.appendChild(why);
		buttons.forEach((b, i) =>
			b.addEventListener("click", () => {
				buttons.forEach((x, j) => {
					x.disabled = true;
					if (j === right) x.classList.add("is-right");
				});
				if (i !== right) b.classList.add("is-wrong");
				why.textContent = (i === right ? "Richtig. " : "Nicht ganz. ") + quiz.dataset.why;
			})
		);
	});

	// Füllstand der Schieberegler für WebKit
	const paint = (r) => {
		const p = ((r.value - r.min) / (r.max - r.min)) * 100;
		r.style.setProperty("--fill", `${p}%`);
	};
	document.querySelectorAll('input[type="range"]').forEach((r) => {
		paint(r);
		r.addEventListener("input", () => paint(r));
	});
})();

// Canvas an CSS-Größe und Pixeldichte anpassen. aspect ist eine Zahl oder eine Funktion der Breite.
// Gibt { ctx, size } zurück; size.w und size.h sind CSS-Pixel und werden bei Resize aktualisiert.
window.fitCanvas = function fitCanvas(canvas, aspect, onResize) {
	const ctx = canvas.getContext("2d");
	const size = { w: 0, h: 0 };
	const apply = () => {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = canvas.parentElement.clientWidth;
		const h = Math.round(w / (typeof aspect === "function" ? aspect(w) : aspect));
		canvas.style.height = `${h}px`;
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		size.w = w;
		size.h = h;
		if (onResize) onResize(size);
	};
	apply();
	window.addEventListener("resize", apply);
	return { ctx, size };
};

// Animationsschleife, die nur läuft, solange das Element sichtbar ist.
window.whenVisible = function whenVisible(el, tick) {
	let running = false;
	let last = 0;
	const loop = (t) => {
		if (!running) return;
		const dt = Math.min((t - last) / 1000, 0.05);
		last = t;
		tick(dt, t / 1000);
		requestAnimationFrame(loop);
	};
	new IntersectionObserver(([en]) => {
		if (en.isIntersecting && !running) {
			running = true;
			last = performance.now();
			requestAnimationFrame(loop);
		} else if (!en.isIntersecting) {
			running = false;
		}
	}).observe(el);
};
