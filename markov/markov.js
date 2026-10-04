// Markov-Ketten-Textgenerator von null an: Übergänge zählen, Graph mit Zufallsspaziergang, Generator mit Ordnung.

(() => {
	const { fmt } = window.ML;
	const K = window.KORPUS;
	const $ = (id) => document.getElementById(id);
	let ready = false;
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const tokenize = (t) => t.match(/[\p{L}\d]+|[.,!?:;]/gu) || [];
	const isPunct = (w) => /^[.,!?:;]$/.test(w);
	const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
	const join = (ws) => ws.join(" ").replace(/ ([.,!?:;])/g, "$1");
	const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

	// ---------- Kapitel 1: Übergänge zählen ----------
	const corpusView = $("corpusView");
	const ctoks = tokenize(K.maerchen);
	{
		// Text mit Absätzen darstellen, Wörter als anklickbare Spans
		let html = "";
		let ti = 0;
		const parts = K.maerchen.split(/(\n\n)/);
		for (const part of parts) {
			if (part === "\n\n") {
				html += "<br /><br />";
				continue;
			}
			for (const t of tokenize(part)) {
				if (isPunct(t)) html += t;
				else html += ` <span class="w" data-i="${ti}">${t}</span>`;
				ti++;
			}
		}
		corpusView.innerHTML = html;
	}
	const spans = [...corpusView.querySelectorAll(".w")];
	const spanAt = new Map(spans.map((s) => [Number(s.dataset.i), s]));

	function selectWord(word) {
		const key = word.toLowerCase();
		const counts = new Map();
		let total = 0;
		spans.forEach((s) => s.classList.remove("is-sel", "is-next"));
		for (let i = 0; i < ctoks.length - 1; i++) {
			if (ctoks[i].toLowerCase() !== key) continue;
			spanAt.get(i)?.classList.add("is-sel");
			const nx = ctoks[i + 1];
			spanAt.get(i + 1)?.classList.add("is-next");
			const k = isPunct(nx) ? `„${nx}“` : nx.toLowerCase();
			counts.set(k, (counts.get(k) || 0) + 1);
			total++;
		}
		const rows = [...counts].sort((a, b) => b[1] - a[1]);
		$("countNote").innerHTML = `„<b>${esc(word)}</b>“ kommt ${total}-mal vor, gefolgt von ${rows.length} verschiedenen ${rows.length === 1 ? "Wort" : "Wörtern"}.`;
		$("countProbs").innerHTML = rows
			.slice(0, 8)
			.map(([w, c]) => `<div class="prob"><span>${esc(w)}</span><div class="track"><div class="fill" style="width:${(c / total) * 100}%"></div></div><output>${c}× · ${fmt((c / total) * 100, 0)} %</output></div>`)
			.join("") + (rows.length > 8 ? `<p class="stage-note">… und ${rows.length - 8} weitere</p>` : "");
	}
	corpusView.addEventListener("click", (e) => {
		const s = e.target.closest(".w");
		if (s) selectWord(s.textContent);
	});
	selectWord("der");

	// ---------- Kapitel 2: Graph und Zufallsspaziergang ----------
	const gc = window.fitCanvas($("cvGraph"), (w) => (w < 520 ? 0.95 : 1.2), () => ready && drawGraph());
	let G = null;
	const walk = { cur: ".", words: [], last: null, flash: 0, running: false };

	function buildMini(i) {
		const toks = tokenize(K.mini[i]).map((t, k, a) => (k === 0 || a[k - 1] === "." ? t.toLowerCase() : t));
		const nodes = [...new Set(toks)];
		// Satzpunkt zuerst, damit er oben steht
		nodes.splice(nodes.indexOf("."), 1);
		nodes.unshift(".");
		const edges = new Map();
		for (let k = 0; k < toks.length; k++) {
			const a = toks[k];
			const b = toks[(k + 1) % toks.length]; // nach dem letzten Punkt geht es von vorne los
			const key = `${a}\u0001${b}`;
			edges.set(key, (edges.get(key) || 0) + 1);
		}
		const out = new Map(nodes.map((n) => [n, []]));
		for (const [key, c] of edges) {
			const [a, b] = key.split("\u0001");
			out.get(a).push({ to: b, c });
		}
		for (const list of out.values()) {
			const t = list.reduce((s, e) => s + e.c, 0);
			list.forEach((e) => (e.p = e.c / t));
		}
		G = { nodes, out };
		walk.cur = ".";
		walk.words = [];
		walk.last = null;
	}

	function layout() {
		const { w, h } = gc.size;
		const R = Math.min(w, h) / 2 - 42;
		const pos = new Map();
		G.nodes.forEach((n, i) => {
			const a = -Math.PI / 2 + (i / G.nodes.length) * Math.PI * 2;
			pos.set(n, [w / 2 + Math.cos(a) * R * (w > h ? 1.25 : 1), h / 2 + Math.sin(a) * R]);
		});
		return pos;
	}

	function drawGraph() {
		const c = gc.ctx;
		const { w, h } = gc.size;
		c.fillStyle = "#070806";
		c.fillRect(0, 0, w, h);
		const pos = layout();
		const r = Math.max(22, Math.min(32, w / 22));
		c.font = "12px Space Grotesk, sans-serif";
		c.textAlign = "center";
		c.textBaseline = "middle";
		for (const [a, list] of G.out) {
			for (const e of list) {
				const A = pos.get(a);
				const B = pos.get(e.to);
				const dx = B[0] - A[0];
				const dy = B[1] - A[1];
				const len = Math.hypot(dx, dy) || 1;
				const cx = (A[0] + B[0]) / 2 - (dy / len) * len * 0.14;
				const cy = (A[1] + B[1]) / 2 + (dx / len) * len * 0.14;
				const q = (t) => [
					(1 - t) * (1 - t) * A[0] + 2 * (1 - t) * t * cx + t * t * B[0],
					(1 - t) * (1 - t) * A[1] + 2 * (1 - t) * t * cy + t * t * B[1],
				];
				const t1 = Math.max(0.5, 1 - (r + 3) / len);
				const t0 = Math.min(0.5, (r + 1) / len);
				const hot = walk.last && walk.last[0] === a && walk.last[1] === e.to;
				const fromCur = a === walk.cur;
				c.strokeStyle = hot ? `rgba(155,229,100,${0.5 + walk.flash * 0.5})` : fromCur ? "rgba(92,200,255,0.7)" : "rgba(255,255,255,0.16)";
				c.lineWidth = hot ? 3 : fromCur ? 2 : 1.2;
				c.beginPath();
				const s = q(t0);
				c.moveTo(s[0], s[1]);
				for (let t = t0; t <= t1 + 1e-9; t += (t1 - t0) / 16) {
					const p = q(t);
					c.lineTo(p[0], p[1]);
				}
				c.stroke();
				const end = q(t1);
				const pre = q(t1 - 0.04);
				const ang = Math.atan2(end[1] - pre[1], end[0] - pre[0]);
				c.fillStyle = c.strokeStyle;
				c.beginPath();
				c.moveTo(end[0], end[1]);
				c.lineTo(end[0] - Math.cos(ang - 0.45) * 9, end[1] - Math.sin(ang - 0.45) * 9);
				c.lineTo(end[0] - Math.cos(ang + 0.45) * 9, end[1] - Math.sin(ang + 0.45) * 9);
				c.fill();
				if (e.p < 1 && (fromCur || hot)) {
					const m = q(0.5);
					const label = `${fmt(e.p * 100, 0)} %`;
					c.fillStyle = "#070806";
					c.fillRect(m[0] - 18, m[1] - 9, 36, 18);
					c.fillStyle = hot ? "#9be564" : "#5cc8ff";
					c.fillText(label, m[0], m[1]);
				}
			}
		}
		for (const n of G.nodes) {
			const [x, y] = pos.get(n);
			const cur = n === walk.cur;
			c.beginPath();
			c.arc(x, y, r, 0, Math.PI * 2);
			c.fillStyle = cur ? "#9be564" : "#141210";
			c.fill();
			c.lineWidth = 1.5;
			c.strokeStyle = cur ? "#9be564" : "rgba(255,255,255,0.3)";
			c.stroke();
			c.fillStyle = cur ? "#0d1a05" : "#f4efe6";
			c.font = `${cur ? 600 : 400} ${n.length > 6 ? 11 : 13}px Space Grotesk, sans-serif`;
			c.fillText(n === "." ? "• Satzende" : n, x, y);
		}
		// Text
		let html = "";
		let cap = true;
		walk.words.forEach((wd, i) => {
			if (wd === ".") {
				html += ".";
				cap = true;
				return;
			}
			const shown = cap ? wd[0].toUpperCase() + wd.slice(1) : wd;
			cap = false;
			html += ` ${i === walk.words.length - 1 ? `<b>${esc(shown)}</b>` : esc(shown)}`;
		});
		$("walkText").innerHTML = html || '<span style="color: var(--faint)">Hier entsteht der Text …</span>';
		const opts = G.out.get(walk.cur);
		$("walkNote").textContent = `Von „${walk.cur === "." ? "Satzende" : walk.cur}“ aus: ` + opts.map((e) => `${e.to === "." ? "Satzende" : e.to} ${fmt(e.p * 100, 0)} %`).join(" · ");
		$("btnWalkRun").textContent = walk.running ? "❚❚ Anhalten" : "▶ Laufen lassen";
	}

	function walkStep() {
		const opts = G.out.get(walk.cur);
		let r = Math.random();
		let e = opts[opts.length - 1];
		for (const o of opts) {
			if ((r -= o.p) <= 0) {
				e = o;
				break;
			}
		}
		walk.last = [walk.cur, e.to];
		walk.cur = e.to;
		walk.words.push(e.to);
		if (walk.words.length > 60) walk.words.splice(0, walk.words.indexOf(".") + 1);
		walk.flash = 1;
		const fade = () => {
			walk.flash = Math.max(0, walk.flash - 0.06);
			drawGraph();
			if (walk.flash > 0 && !reduced) requestAnimationFrame(fade);
		};
		fade();
	}
	$("btnWalkStep").addEventListener("click", () => {
		walk.running = false;
		walkStep();
	});
	$("btnWalkRun").addEventListener("click", () => {
		walk.running = !walk.running;
		drawGraph();
		const loop = () => {
			if (!walk.running) return;
			walkStep();
			setTimeout(loop, 650);
		};
		if (walk.running) loop();
	});
	$("btnWalkClear").addEventListener("click", () => {
		walk.words = [];
		walk.last = null;
		walk.cur = ".";
		drawGraph();
	});
	document.querySelectorAll("[data-mini]").forEach((b) =>
		b.addEventListener("click", () => {
			document.querySelectorAll("[data-mini]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
			buildMini(Number(b.dataset.mini));
			drawGraph();
		})
	);

	// ---------- Kapitel 3: Generator ----------
	const gen = { corpus: "maerchen", level: "word", order: 1 };
	const ordIn = $("ordIn");
	const ownText = $("ownText");
	let model = null;

	function sourceText() {
		return gen.corpus === "eigen" ? ownText.value : K[gen.corpus];
	}

	function buildModel() {
		const text = sourceText().replace(/\s+/g, " ").trim();
		const n = gen.order;
		const chain = new Map();
		let seq;
		if (gen.level === "word") seq = tokenize(text);
		else seq = [...text];
		for (let i = n; i < seq.length; i++) {
			const key = seq.slice(i - n, i).join(gen.level === "word" ? " " : "");
			if (!chain.has(key)) chain.set(key, []);
			chain.get(key).push(seq[i]);
		}
		model = { chain, seq, n };
	}

	function generate() {
		const out = $("genOut");
		out.classList.toggle("char", gen.level === "char");
		const { chain, seq, n } = model;
		if (seq.length < n + 10) {
			out.innerHTML = '<span style="color: var(--faint)">Zu wenig Text. Füge unten mindestens ein paar Sätze ein.</span>';
			$("gStates").textContent = "–";
			$("gBranch").textContent = "–";
			$("gChoice").textContent = "–";
			return;
		}
		const sep = gen.level === "word" ? " " : "";
		// Start an einem Satzanfang
		const starts = [];
		for (let i = 1; i < seq.length - n; i++) {
			if (gen.level === "word" ? seq[i - 1] === "." : seq[i - 1] === " " && seq[i - 2] === ".") starts.push(i);
		}
		const s0 = starts.length ? pick(starts) : 0;
		const res = seq.slice(s0, s0 + n).map((t) => ({ t, choice: false }));
		let choices = 0;
		let steps = 0;
		const limit = gen.level === "word" ? 90 : 520;
		const minLen = gen.level === "word" ? 55 : 360;
		while (res.length < limit) {
			const key = res.slice(-n).map((r) => r.t).join(sep);
			const next = chain.get(key);
			if (!next) break;
			const distinct = new Set(next).size;
			const t = pick(next);
			steps++;
			if (distinct > 1) choices++;
			res.push({ t, choice: distinct > 1 });
			if (res.length > minLen && t === ".") break;
		}
		if (gen.level === "word") {
			let html = "";
			for (const r of res) {
				const word = esc(r.t);
				const piece = r.choice ? `<mark>${word}</mark>` : word;
				html += isPunct(r.t) ? piece : ` ${piece}`;
			}
			out.innerHTML = html.trim();
		} else {
			out.textContent = res.map((r) => r.t).join("");
		}
		let branches = 0;
		for (const v of chain.values()) branches += new Set(v).size;
		const states = chain.size;
		const ratio = steps ? choices / steps : 0;
		$("gStates").textContent = states.toLocaleString("de-DE");
		$("gBranch").textContent = fmt(branches / states, 2);
		$("gChoice").textContent = `${fmt(ratio * 100, 0)} %`;
		$("genNote").textContent =
			gen.level === "char"
				? n <= 2
					? "Kauderwelsch: Mit so wenig Gedächtnis kennt die Kette nur Buchstabenpaare."
					: n <= 5
						? "Erfundene Wörter, die nach Deutsch klingen. Schau, ob du eins findest, das es gar nicht gibt."
						: "Bei so viel Gedächtnis kommen fast nur noch echte Wörter aus dem Text."
				: ratio < 0.15
					? `Nur ${fmt(ratio * 100, 0)} % der Schritte hatten eine echte Wahl. Die Kette schreibt fast nur noch ab.`
					: n === 1
						? "Ordnung 1: Jedes Wort passt zum vorigen, aber der Satz als Ganzes ergibt selten Sinn."
						: "Grün: Hier hatte die Kette mehrere Möglichkeiten und hat gewürfelt.";
	}

	function syncOrder() {
		ordIn.max = gen.level === "word" ? 4 : 8;
		if (Number(ordIn.value) > Number(ordIn.max)) ordIn.value = ordIn.max;
		gen.order = Number(ordIn.value);
		$("ordOut").textContent = `${gen.order} ${gen.level === "word" ? (gen.order === 1 ? "Wort" : "Wörter") : gen.order === 1 ? "Buchstabe" : "Buchstaben"}`;
		ordIn.style.setProperty("--fill", `${((ordIn.value - ordIn.min) / (ordIn.max - ordIn.min)) * 100}%`);
	}
	function refresh() {
		syncOrder();
		buildModel();
		generate();
	}
	ordIn.addEventListener("input", refresh);
	$("btnGen").addEventListener("click", generate);
	document.querySelectorAll("[data-corpus]").forEach((b) =>
		b.addEventListener("click", () => {
			gen.corpus = b.dataset.corpus;
			document.querySelectorAll("[data-corpus]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
			ownText.hidden = gen.corpus !== "eigen";
			if (gen.corpus === "eigen") ownText.focus();
			refresh();
		})
	);
	document.querySelectorAll("[data-level]").forEach((b) =>
		b.addEventListener("click", () => {
			gen.level = b.dataset.level;
			document.querySelectorAll("[data-level]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
			if (gen.level === "char" && Number(ordIn.value) < 3) ordIn.value = 4;
			refresh();
		})
	);
	let typing;
	ownText.addEventListener("input", () => {
		clearTimeout(typing);
		typing = setTimeout(refresh, 400);
	});

	ready = true;
	buildMini(0);
	drawGraph();
	refresh();
})();
