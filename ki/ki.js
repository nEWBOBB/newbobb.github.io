"use strict";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nf = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const softmax = (logits, temp = 1) => {
	const m = Math.max(...logits);
	const e = logits.map((l) => Math.exp((l - m) / temp));
	const s = e.reduce((a, b) => a + b, 0);
	return e.map((v) => v / s);
};

const pick = (probs) => {
	let r = Math.random();
	for (let i = 0; i < probs.length; i++) {
		r -= probs[i];
		if (r <= 0) return i;
	}
	return probs.length - 1;
};

// Balkenliste: rows = [{ label, p, cls }]
function renderBars(box, rows) {
	while (box.children.length > rows.length) box.lastChild.remove();
	rows.forEach((r, i) => {
		let row = box.children[i];
		if (!row) {
			row = document.createElement("div");
			row.innerHTML = '<span></span><div class="track"><div class="fill"></div></div><output></output>';
			box.appendChild(row);
		}
		row.className = "prob" + (r.cls ? ` ${r.cls}` : "");
		row.children[0].textContent = r.label;
		row.querySelector(".fill").style.width = `${(r.p * 100).toFixed(1)}%`;
		row.children[2].textContent = r.p >= 0.995 ? "100 %" : r.p < 0.001 ? "0 %" : `${nf(r.p * 100, r.p < 0.1 ? 1 : 0)} %`;
	});
}

// =====================================================================
// 1 · Tokenizer (vereinfacht, aber nach dem Prinzip echter Tokenizer)
// =====================================================================
(() => {
	const out = document.getElementById("tokens-out");
	const input = document.getElementById("tokText");
	const note = document.getElementById("tokNote");
	const enc = new TextEncoder();

	// Häufige Wörter sind ein einziges Token
	const WORDS = new Set(
		`der die das und ist in zu den dem von mit sich des auf für nicht ein eine einen einem als auch es an er so dass
		kann ich du wir ihr sie hat haben wird werden war sind mehr nach wie aber noch nur bei oder um aus wenn schon heute
		morgen hallo welt gut sehr ja nein was wer wo warum mein dein viele viel wort text sprache modell ki computer haus
		hund katze auto zeit jahr tag mensch frage antwort neu neue groß klein alle immer hier dort macht gibt geht kommt
		lerne lernen funktioniert hat the of and to is a that it for you hello world function return var let const if else`
			.split(/\s+/)
	);
	// Häufige Wortstücke, aus denen seltene Wörter zusammengesetzt werden
	const PIECES = new Set(
		`donau dampf schiff fahrt gesell schaft erd beere ver be ge ent zer un vor über unter auf aus ein an mit nach ab zu
		ungen ung keit heit lich isch ig en er el ern est st te ten sch ch ck ie ei au eu in ir or ar al il ol ul tion ität
		bar sam los chen werk zeug stadt land arbeit platz bahn bild schreib denk lern spiel fahr seh komm mach wirk stell
		halt bau teil func add ret urn sel ten wört`
			.split(/\s+/)
	);
	const MAXP = 7;

	const hash = (s) => {
		let h = 2166136261;
		for (const c of s) h = Math.imul(h ^ c.codePointAt(0), 16777619);
		return h >>> 0;
	};

	function split(word) {
		const parts = [];
		const low = word.toLowerCase();
		let i = 0;
		while (i < word.length) {
			let len = Math.min(MAXP, word.length - i);
			for (; len > 1; len--) if (PIECES.has(low.slice(i, i + len))) break;
			parts.push(word.slice(i, i + len));
			i += len;
		}
		return parts;
	}

	function tokenize(text) {
		const toks = [];
		const re = /( ?)([A-Za-zÄÖÜäöüß]+|[0-9]{1,3}|[^\sA-Za-zÄÖÜäöüß0-9]|\s)/gu;
		for (const [, sp, body] of text.matchAll(re)) {
			if (/^[A-Za-zÄÖÜäöüß]/.test(body)) {
				if (WORDS.has(body.toLowerCase())) toks.push({ text: sp + body, common: true });
				else split(body).forEach((p, i) => toks.push({ text: (i === 0 ? sp : "") + p }));
			} else if (/^[0-9]/.test(body)) {
				toks.push({ text: sp + body });
			} else if (/^\s$/.test(body)) {
				if (sp) toks.push({ text: sp, common: true });
				toks.push({ text: body, common: true });
			} else if (body.codePointAt(0) < 128) {
				toks.push({ text: sp + body, common: true });
			} else {
				// Seltene Zeichen und Emoji: jedes Byte ein eigenes Token
				for (const b of enc.encode(sp + body)) toks.push({ byte: b });
			}
		}
		return toks;
	}

	function render() {
		const toks = tokenize(input.value);
		out.textContent = "";
		for (const t of toks) {
			const key = t.byte !== undefined ? `<${t.byte}>` : t.text;
			const h = hash(key);
			const id = t.byte !== undefined ? t.byte : t.common ? 100 + (h % 4900) : 5000 + (h % 95000);
			const el = document.createElement("span");
			el.className = "tok" + (t.byte !== undefined ? " byte" : "");
			el.style.setProperty("--h", (h % 360).toString());
			const b = document.createElement("b");
			if (t.byte !== undefined) {
				b.textContent = t.byte === 32 ? "·" : t.byte.toString(16).toUpperCase().padStart(2, "0");
			} else {
				const lead = t.text.match(/^ */)[0].length;
				if (lead) {
					const i = document.createElement("i");
					i.textContent = "·";
					b.appendChild(i);
				}
				b.appendChild(document.createTextNode(t.text.slice(lead) || (lead ? "" : "↵")));
			}
			const code = document.createElement("code");
			code.textContent = id;
			el.append(b, code);
			out.appendChild(el);
		}
		const chars = [...input.value].length;
		note.textContent = chars
			? `${chars} Zeichen → ${toks.length} Tokens. Der Punkt · steht für ein Leerzeichen, das zum Token gehört. Gestrichelte Kästchen sind einzelne Bytes. Echte Tokenizer kennen 100 000 bis 200 000 solcher Stücke.`
			: "Tipp etwas ein.";
	}

	input.addEventListener("input", render);
	document.querySelectorAll("[data-tok]").forEach((b) =>
		b.addEventListener("click", () => {
			input.value = b.dataset.tok;
			render();
		})
	);
	render();
})();

// =====================================================================
// 2 · Bedeutungsraum mit Nachbarn und Rechnen mit Wörtern
// =====================================================================
(() => {
	const canvas = document.getElementById("embedCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.4));
	const note = document.getElementById("embedNote");
	const buttons = [...document.querySelectorAll("[data-analogy]")];

	const GROUPS = {
		tier: "#ffb36b",
		essen: "#c6f16b",
		fahr: "#6bd0ff",
		ort: "#b59cff",
		mensch: "#ff7ad9",
	};
	const W = [
		["Hund", 0.12, 0.16, "tier"], ["Katze", 0.21, 0.11, "tier"], ["Maus", 0.28, 0.2, "tier"],
		["Pferd", 0.07, 0.28, "tier"], ["Löwe", 0.2, 0.28, "tier"],
		["Apfel", 0.73, 0.11, "essen"], ["Banane", 0.85, 0.15, "essen"], ["Brot", 0.69, 0.24, "essen"],
		["Käse", 0.8, 0.27, "essen"], ["Pizza", 0.92, 0.3, "essen"],
		["Auto", 0.12, 0.78, "fahr"], ["Bus", 0.22, 0.88, "fahr"], ["Zug", 0.07, 0.92, "fahr"],
		["Fahrrad", 0.24, 0.72, "fahr"],
		["Berlin", 0.33, 0.47, "ort"], ["Paris", 0.455, 0.475, "ort"], ["Rom", 0.565, 0.455, "ort"],
		["Deutschland", 0.32, 0.61, "ort"], ["Frankreich", 0.44, 0.63, "ort"], ["Italien", 0.56, 0.6, "ort"],
		["König", 0.67, 0.55, "mensch"], ["Königin", 0.685, 0.78, "mensch"], ["Mann", 0.87, 0.57, "mensch"],
		["Frau", 0.88, 0.8, "mensch"], ["Junge", 0.77, 0.4, "mensch"], ["Mädchen", 0.785, 0.635, "mensch"],
	].map(([name, x, y, g]) => ({ name, x, y, g }));
	const byName = Object.fromEntries(W.map((w) => [w.name, w]));
	const ANALOGIES = [
		["König", "Mann", "Frau"],
		["Berlin", "Deutschland", "Frankreich"],
		["Junge", "Mann", "Frau"],
	];

	let selected = null;
	let analogy = null; // { a, b, c, res, hit, t }

	const pad = () => ({ x: size.w < 520 ? 34 : 50, y: 30 });
	const toPx = (p) => {
		const P = pad();
		return [P.x + p.x * (size.w - 2 * P.x), P.y + p.y * (size.h - 2 * P.y)];
	};
	const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
	const sim = (d) => Math.round(100 * Math.exp(-d * 4.2));

	function neighbours(w, n = 3, skip = []) {
		return W.filter((o) => o !== w && !skip.includes(o))
			.map((o) => ({ o, d: dist(w, o) }))
			.sort((a, b) => a.d - b.d)
			.slice(0, n);
	}

	function select(w) {
		analogy = null;
		buttons.forEach((b) => b.classList.remove("primary"));
		selected = w;
		const nb = neighbours(w);
		note.textContent = `Nächste Nachbarn von „${w.name}“: ${nb.map(({ o, d }) => `${o.name} (${sim(d)} % ähnlich)`).join(", ")}.`;
	}

	function runAnalogy(i) {
		const [a, b, c] = ANALOGIES[i].map((n) => byName[n]);
		const res = { x: a.x - b.x + c.x, y: a.y - b.y + c.y };
		const hit = neighbours(res, 1, [a, b, c])[0].o;
		selected = null;
		analogy = { a, b, c, res, hit, t: 0 };
		buttons.forEach((x, j) => x.classList.toggle("primary", j === i));
		note.textContent = `${a.name} − ${b.name} + ${c.name}: Nimm den Weg von „${b.name}“ zu „${a.name}“ und geh ihn ab „${c.name}“ noch einmal …`;
	}

	buttons.forEach((b, i) => b.addEventListener("click", () => runAnalogy(i)));
	canvas.addEventListener("pointerdown", (e) => {
		const r = canvas.getBoundingClientRect();
		const mx = e.clientX - r.left;
		const my = e.clientY - r.top;
		let best = null;
		let bd = 34;
		for (const w of W) {
			const [x, y] = toPx(w);
			const d = Math.hypot(x - mx, y - my);
			if (d < bd) {
				bd = d;
				best = w;
			}
		}
		if (best) select(best);
	});

	function arrow(x1, y1, x2, y2, color, dashed) {
		ctx.save();
		ctx.strokeStyle = color;
		ctx.fillStyle = color;
		ctx.lineWidth = 2.5;
		if (dashed) ctx.setLineDash([6, 5]);
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
		ctx.setLineDash([]);
		const ang = Math.atan2(y2 - y1, x2 - x1);
		ctx.beginPath();
		ctx.moveTo(x2, y2);
		ctx.lineTo(x2 - 11 * Math.cos(ang - 0.4), y2 - 11 * Math.sin(ang - 0.4));
		ctx.lineTo(x2 - 11 * Math.cos(ang + 0.4), y2 - 11 * Math.sin(ang + 0.4));
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	runAnalogy(0);

	whenVisible(canvas, (dt, t) => {
		const { w, h } = size;
		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		// Raster
		ctx.strokeStyle = "rgba(255,255,255,0.04)";
		ctx.lineWidth = 1;
		for (let x = 0; x < w; x += 40) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
			ctx.stroke();
		}
		for (let y = 0; y < h; y += 40) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(w, y);
			ctx.stroke();
		}

		const small = w < 520;
		const focus = new Set();

		if (selected) {
			const [sx, sy] = toPx(selected);
			focus.add(selected);
			for (const { o, d } of neighbours(selected)) {
				focus.add(o);
				const [ox, oy] = toPx(o);
				ctx.strokeStyle = `rgba(255,122,217,${0.25 + sim(d) / 140})`;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(sx, sy);
				ctx.lineTo(ox, oy);
				ctx.stroke();
			}
		}

		if (analogy) {
			const A = analogy;
			A.t = Math.min(1, A.t + dt * 0.5);
			const k1 = ease(clamp(A.t / 0.45, 0, 1));
			const k2 = ease(clamp((A.t - 0.5) / 0.45, 0, 1));
			const [bx, by] = toPx(A.b);
			const [ax, ay] = toPx(A.a);
			const [cx, cy] = toPx(A.c);
			[A.a, A.b, A.c].forEach((o) => focus.add(o));
			if (k1 > 0) arrow(bx, by, bx + (ax - bx) * k1, by + (ay - by) * k1, "rgba(155,140,255,0.9)", true);
			if (k2 > 0) arrow(cx, cy, cx + (ax - bx) * k2, cy + (ay - by) * k2, "#ff7ad9", false);
			if (A.t >= 1) {
				focus.add(A.hit);
				const [rx, ry] = toPx(A.res);
				const pulse = 14 + Math.sin(t * 4) * 3;
				ctx.strokeStyle = "rgba(255,122,217,0.7)";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(rx, ry, pulse, 0, Math.PI * 2);
				ctx.stroke();
				if (!A.done) {
					A.done = true;
					note.textContent = `${A.a.name} − ${A.b.name} + ${A.c.name} landet fast genau bei „${A.hit.name}“. Die Richtung von „${A.b.name}“ zu „${A.a.name}“ steht für eine Bedeutung, die sich übertragen lässt.`;
				}
			}
		}

		// Punkte und Beschriftung
		ctx.font = `${small ? 11 : 13}px 'Space Grotesk', sans-serif`;
		ctx.textAlign = "center";
		for (const o of W) {
			const [x, y] = toPx(o);
			const on = focus.size === 0 || focus.has(o);
			ctx.globalAlpha = on ? 1 : 0.32;
			ctx.fillStyle = GROUPS[o.g];
			ctx.beginPath();
			ctx.arc(x, y, o === selected || (analogy && o === analogy.hit && analogy.t >= 1) ? 7 : 4.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = on ? "#f4efe6" : "rgba(244,239,230,0.7)";
			ctx.fillText(o.name, x, y - 10);
		}
		ctx.globalAlpha = 1;
	});
})();

// =====================================================================
// 3 · Attention zwischen den Wörtern eines Satzes
// =====================================================================
(() => {
	const canvas = document.getElementById("attnCanvas");
	const ROWS = 14;
	const rowH = (w) => (w < 520 ? 24 : 27);
	const { ctx, size } = fitCanvas(canvas, (w) => w / (ROWS * rowH(w) + 40));
	const note = document.getElementById("attnNote");
	const box = document.getElementById("attnSentences");

	const S = [
		{
			label: "Bank am Fluss",
			words: ["Am", "Fluss", "setzte", "ich", "mich", "auf", "die", "Bank", "."],
			focus: 7,
			attn: { 7: { 1: 0.42, 2: 0.18, 4: 0.07, 6: 0.09, 7: 0.14 } },
			note: { 7: "„Bank“ achtet vor allem auf „Fluss“ und „setzte“. Gemeint ist also eine Sitzbank." },
		},
		{
			label: "Bank und Kredit",
			words: ["Für", "einen", "Kredit", "ging", "ich", "zur", "Bank", "."],
			focus: 6,
			attn: { 6: { 2: 0.48, 3: 0.13, 5: 0.12, 6: 0.15 } },
			note: { 6: "„Bank“ achtet vor allem auf „Kredit“. Gemeint ist also ein Geldinstitut." },
		},
		{
			label: "Pokal zu groß",
			words: ["Der", "Pokal", "passt", "nicht", "in", "den", "Koffer", ",", "weil", "er", "zu", "groß", "ist", "."],
			focus: 11,
			attn: {
				9: { 1: 0.3, 6: 0.28, 8: 0.12, 9: 0.12 },
				11: { 1: 0.36, 9: 0.22, 2: 0.1, 6: 0.06, 10: 0.08, 11: 0.1 },
			},
			note: {
				9: "Bei „er“ ist noch offen, wer gemeint ist: Pokal und Koffer bekommen fast gleich viel Aufmerksamkeit.",
				11: "„groß“ achtet auf „Pokal“ und „er“. Zu groß ist also der Pokal.",
			},
		},
		{
			label: "Koffer zu klein",
			words: ["Der", "Pokal", "passt", "nicht", "in", "den", "Koffer", ",", "weil", "er", "zu", "klein", "ist", "."],
			focus: 11,
			attn: {
				9: { 1: 0.3, 6: 0.28, 8: 0.12, 9: 0.12 },
				11: { 6: 0.37, 9: 0.22, 3: 0.09, 1: 0.07, 10: 0.08, 11: 0.1 },
			},
			note: {
				9: "Bei „er“ ist noch offen, wer gemeint ist: Pokal und Koffer bekommen fast gleich viel Aufmerksamkeit.",
				11: "Ein Wort getauscht, und „klein“ achtet jetzt auf „Koffer“. Zu klein ist also der Koffer.",
			},
		},
	];
	let si = 0;
	let sel = S[0].focus;
	let shown = []; // animierte Gewichte

	function weights(s, i) {
		const out = new Array(s.words.length).fill(0);
		const given = s.attn[i] || { [i]: 0.32, ...(i > 0 ? { [i - 1]: 0.26 } : {}) };
		let sum = 0;
		for (const [j, v] of Object.entries(given)) {
			out[j] = v;
			sum += v;
		}
		// Rest verteilt sich schwach auf die übrigen früheren Wörter
		const rest = [];
		for (let j = 0; j <= i; j++) if (!(j in given)) rest.push(j);
		const rw = rest.map((j) => 1 / (i - j + 1));
		const rs = rw.reduce((a, b) => a + b, 0);
		rest.forEach((j, k) => (out[j] = rs ? ((1 - sum) * rw[k]) / rs : 0));
		if (!rest.length) out[i] += 1 - sum;
		return out;
	}

	function update() {
		const s = S[si];
		const word = s.words[sel];
		note.textContent =
			s.note[sel] ||
			`„${word}“ achtet vor allem auf sich selbst und seine direkten Nachbarn. Spannend wird es bei Wörtern, deren Bedeutung vom Rest abhängt.`;
		[...box.children].forEach((b, i) => b.setAttribute("aria-pressed", String(i === si)));
	}

	S.forEach((s, i) => {
		const b = document.createElement("button");
		b.type = "button";
		b.className = "btn";
		b.textContent = s.label;
		b.addEventListener("click", () => {
			si = i;
			sel = s.focus;
			update();
		});
		box.appendChild(b);
	});
	update();

	const layout = () => {
		const { w, h } = size;
		const s = S[si];
		const rh = rowH(w);
		const top = (h - s.words.length * rh) / 2 + rh / 2;
		return { s, rh, top, lx: w * 0.36, rx: w * 0.64 };
	};

	canvas.addEventListener("pointerdown", (e) => {
		const r = canvas.getBoundingClientRect();
		const my = e.clientY - r.top;
		const { s, rh, top } = layout();
		const i = Math.round((my - top) / rh);
		if (i >= 0 && i < s.words.length) {
			sel = i;
			update();
		}
	});

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const { s, rh, top, lx, rx } = layout();
		const target = weights(s, sel);
		if (shown.length !== target.length) shown = target.map(() => 0);
		shown = shown.map((v, j) => v + (target[j] - v) * Math.min(1, dt * 8));

		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		const small = w < 520;

		// Linien
		const y0 = top + sel * rh;
		for (let j = 0; j <= sel; j++) {
			const a = shown[j];
			if (a < 0.005) continue;
			const y1 = top + j * rh;
			ctx.strokeStyle = `rgba(255,122,217,${0.12 + a * 0.88})`;
			ctx.lineWidth = 0.8 + a * 16;
			ctx.lineCap = "round";
			ctx.beginPath();
			ctx.moveTo(lx + 8, y0);
			ctx.bezierCurveTo((lx + rx) / 2, y0, (lx + rx) / 2, y1, rx - 8, y1);
			ctx.stroke();
		}

		ctx.font = `${small ? 13 : 15}px 'Space Grotesk', sans-serif`;
		ctx.textBaseline = "middle";
		const pctX = rx + Math.max(...s.words.map((wd) => ctx.measureText(wd).width)) + (small ? 10 : 16);
		s.words.forEach((word, i) => {
			const y = top + i * rh;
			const future = i > sel;
			// links: Wörter, die schauen
			ctx.textAlign = "right";
			if (i === sel) {
				const tw = ctx.measureText(word).width;
				ctx.fillStyle = "#ff7ad9";
				ctx.beginPath();
				ctx.roundRect(lx - tw - 10, y - rh / 2 + 3, tw + 18, rh - 6, 8);
				ctx.fill();
				ctx.fillStyle = "#2a0420";
			} else {
				ctx.fillStyle = "rgba(244,239,230,0.75)";
			}
			ctx.fillText(word, lx, y);
			// rechts: Wörter, auf die geschaut wird
			ctx.textAlign = "left";
			ctx.fillStyle = future ? "rgba(244,239,230,0.18)" : `rgba(244,239,230,${0.45 + shown[i] * 1.5})`;
			ctx.fillText(word, rx, y);
			if (!future && shown[i] >= 0.06) {
				ctx.fillStyle = "rgba(255,122,217,0.9)";
				ctx.font = `${small ? 10 : 11}px 'JetBrains Mono', monospace`;
				ctx.fillText(`${Math.round(shown[i] * 100)} %`, pctX, y);
				ctx.font = `${small ? 13 : 15}px 'Space Grotesk', sans-serif`;
			}
		});
		ctx.textBaseline = "alphabetic";
	});
})();

// =====================================================================
// 4 · Training: ein Mini-Modell lernt aus Beispielen
// =====================================================================
(() => {
	const canvas = document.getElementById("lossCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 2.2 : 3));
	const box = document.getElementById("trainProbs");
	const sample = document.getElementById("trainSample");
	const readout = document.getElementById("trainReadout");

	const OPT = ["blau", "grau", "bewölkt", "grün", "laut"];
	const DATA = [0.55, 0.28, 0.17, 0, 0];
	const START = [0.1, -0.15, 0.05, 0.2, 0.0];
	const LR = 0.3;
	let logits = [...START];
	let losses = [];
	let seen = 0;
	let last = -1;
	let batch = 0;

	function render() {
		const p = softmax(logits);
		renderBars(
			box,
			OPT.map((label, i) => ({ label, p: p[i], cls: i === last ? "is-target" : "" }))
		);
		const recent = losses.slice(-30);
		const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
		readout.textContent = seen ? `${nf(seen)} Beispiele · Fehler Ø ${nf(avg, 2)}` : "";
	}

	function step() {
		const k = pick(DATA);
		const p = softmax(logits);
		losses.push(-Math.log(p[k]));
		if (losses.length > 600) losses.shift();
		logits = logits.map((l, j) => l + LR * ((j === k ? 1 : 0) - p[j]));
		seen++;
		last = k;
		return k;
	}

	function showSample(k) {
		sample.innerHTML = `Beispiel ${nf(seen)}: „Der Himmel ist heute <b>${OPT[k]}</b>.“`;
		if (seen >= 150)
			sample.innerHTML += " Der Fehler sinkt nicht auf null: Weil der Himmel mal blau und mal grau ist, bleibt immer etwas Unsicherheit.";
	}

	document.getElementById("btnTrain1").addEventListener("click", () => {
		showSample(step());
		render();
	});
	document.getElementById("btnTrain100").addEventListener("click", () => {
		batch += 100;
	});
	document.getElementById("btnTrainReset").addEventListener("click", () => {
		logits = [...START];
		losses = [];
		seen = 0;
		last = -1;
		batch = 0;
		sample.textContent = "Alles vergessen. Das Modell rät wieder ungefähr gleichmäßig.";
		render();
	});
	render();

	whenVisible(canvas, () => {
		if (batch > 0) {
			const n = Math.min(batch, 4);
			let k = 0;
			for (let i = 0; i < n; i++) k = step();
			batch -= n;
			showSample(k);
			render();
		}
		const { w, h } = size;
		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		const top = 34;
		const bottom = h - 18;
		const maxL = 3;
		const y = (l) => bottom - (Math.min(l, maxL) / maxL) * (bottom - top);

		// Untergrenze: Unsicherheit der Daten selbst
		const ent = -DATA.filter((d) => d > 0).reduce((a, d) => a + d * Math.log(d), 0);
		ctx.strokeStyle = "rgba(123,220,154,0.5)";
		ctx.setLineDash([4, 5]);
		ctx.beginPath();
		ctx.moveTo(0, y(ent));
		ctx.lineTo(w, y(ent));
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.font = "11px 'Space Grotesk', sans-serif";
		ctx.textAlign = "right";
		const lw = ctx.measureText("bestmöglich").width;
		ctx.fillStyle = "#070605";
		ctx.fillRect(w - lw - 16, y(ent) - 8, lw + 12, 16);
		ctx.fillStyle = "rgba(123,220,154,0.85)";
		ctx.fillText("bestmöglich", w - 10, y(ent) + 4);

		if (!losses.length) return;
		const n = losses.length;
		const dx = w / Math.max(60, n);
		ctx.fillStyle = "rgba(155,140,255,0.45)";
		losses.forEach((l, i) => ctx.fillRect(i * dx, y(l) - 1.5, Math.max(2, dx - 1), 3));
		// gleitender Mittelwert
		ctx.strokeStyle = "#ff7ad9";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		let acc = 0;
		losses.forEach((l, i) => {
			acc += l;
			if (i >= 20) acc -= losses[i - 20];
			const m = acc / Math.min(i + 1, 20);
			if (i === 0) ctx.moveTo(i * dx, y(m));
			else ctx.lineTo(i * dx, y(m));
		});
		ctx.stroke();
	});
})();

// =====================================================================
// 5 · Das nächste Wort: Wahrscheinlichkeiten und Temperatur
// =====================================================================
(() => {
	const story = document.getElementById("story");
	const box = document.getElementById("nextProbs");
	const temp = document.getElementById("temp");
	const tempOut = document.getElementById("tempOut");
	const note = document.getElementById("storyNote");
	const btnNext = document.getElementById("btnNext");
	const btnSentence = document.getElementById("btnSentence");

	const START = ["Es", "war", "einmal"];
	const GENDER = {
		Drache: "m", Roboter: "m", König: "m", Junge: "m", Mann: "m", Toaster: "m", Stein: "m", Computer: "m",
		Prinzessin: "f", Katze: "f", Hexe: "f", Ente: "f", Waschmaschine: "f",
	};
	const PLACE = [["ein", 2.4], ["eine", 2.0], ["lebte", 1.5]];
	const NOUN = [[",", 3.2], ["und", 0.9], [".", 0.6]];
	const VERB = [[".", 3.0], ["und", 1.2]];
	const AFTER_TIME = [["tanzte", 1.8], ["sang", 1.6], ["Kuchen", 1.5], ["schlief", 0.8]];
	const NEXT = {
		einmal: [["ein", 3], ["eine", 2.6], ["vor", 1.4], ["im", 1.0], ["Pizza", -2.5]],
		vor: [["langer", 2.6], ["vielen", 2.2]],
		langer: [["Zeit", 3.6], ["Nacht", 0.8]],
		vielen: [["Jahren", 3.6], ["Nudeln", -1.5]],
		zeit: PLACE, nacht: PLACE, jahren: PLACE,
		im: [["Wald", 3], ["Schloss", 2.2], ["Weltall", 0.9], ["Kühlschrank", -0.8]],
		wald: PLACE, schloss: PLACE, weltall: PLACE, kühlschrank: PLACE,
		lebte: [["ein", 2.6], ["eine", 2.2]],
		ein: [["kleiner", 2.4], ["alter", 2.1], ["König", 1.6], ["Drache", 1.5], ["Roboter", 1.3], ["Toaster", -0.8], ["Stein", -1.4]],
		eine: [["Prinzessin", 2.4], ["Katze", 2.0], ["Hexe", 1.8], ["kleine", 1.6], ["Ente", 0.7], ["Waschmaschine", -1.3]],
		kleine: [["Katze", 2.2], ["Prinzessin", 2], ["Hexe", 1.5], ["Ente", 1.2], ["Waschmaschine", -1]],
		kleiner: [["Junge", 2.3], ["Drache", 2.1], ["Roboter", 1.6], ["Stein", -0.6]],
		alter: [["König", 2.5], ["Mann", 2.1], ["Drache", 1.4], ["Computer", 0.3], ["Toaster", -1.2]],
		",m": [["der", 3.5]],
		",f": [["die", 3.5]],
		der: [["gerne", 2.2], ["nie", 1.5], ["jeden", 1.2], ["heimlich", 1.1], ["Nudeln", -1.6]],
		gerne: [["tanzte", 2.0], ["Kuchen", 1.8], ["sang", 1.6], ["Witze", 1.2], ["programmierte", 0.4], ["Steine", -1]],
		nie: [["schlief", 1.8], ["lachte", 1.7], ["aufgab", 1.4], ["Kuchen", 0.6]],
		jeden: [["Tag", 3.0], ["Morgen", 2.2], ["Dienstag", 0.6]],
		heimlich: [["tanzte", 1.6], ["sang", 1.4], ["Kuchen", 1.3], ["Witze", 0.8]],
		tag: AFTER_TIME, morgen: AFTER_TIME, dienstag: AFTER_TIME,
		kuchen: [["aß", 2.8], ["backte", 2.6], ["verschenkte", 1]],
		witze: [["erzählte", 3.2], ["sammelte", 1]],
		steine: [["sammelte", 2.5], ["aß", -0.5]],
		nudeln: [["aß", 2.6], ["kochte", 2]],
		und: [["sang", 1.6], ["tanzte", 1.5], ["lachte", 1.4], ["schlief", 1.0], ["Kuchen", 0.5], ["Toaster", -2]],
	};
	NEXT.die = NEXT.der;
	for (const v of ["tanzte", "sang", "schlief", "lachte", "aufgab", "programmierte", "aß", "backte", "verschenkte", "erzählte", "sammelte", "kochte"])
		NEXT[v] = VERB;
	for (const n of Object.keys(GENDER)) NEXT[n.toLowerCase()] = NOUN;

	let words = [...START];
	let auto = null;

	const options = () => {
		const lastW = words[words.length - 1];
		if (lastW === ".") return [];
		let key = lastW.toLowerCase();
		if (lastW === ",") key = `,${GENDER[words[words.length - 2]] || "m"}`;
		return NEXT[key] || [[".", 2], ["und", 1]];
	};
	const T = () => Number(temp.value);

	function render() {
		story.textContent = "";
		words.forEach((wd, i) => {
			const span = document.createElement("span");
			if (i >= START.length) span.className = "gen";
			span.textContent = (i > 0 && !/^[.,]$/.test(wd) ? " " : "") + wd;
			story.appendChild(span);
		});
		const opts = options();
		if (opts.length) {
			const c = document.createElement("span");
			c.className = "cursor";
			story.appendChild(c);
		}
		const p = softmax(opts.map((o) => o[1]), T());
		const rows = opts
			.map((o, i) => ({ label: o[0], p: p[i] }))
			.sort((a, b) => b.p - a.p);
		renderBars(box, rows.length ? rows : [{ label: "Ende", p: 1 }]);
		btnNext.disabled = btnSentence.disabled = !opts.length;
		const t = T();
		if (!opts.length) note.textContent = "Fertig. Fang neu an oder ändere vorher die Temperatur.";
		else if (t < 0.35) note.textContent = "Fast kein Zufall: Es gewinnt praktisch immer das wahrscheinlichste Wort.";
		else if (t > 1.4) note.textContent = "Sehr heiß: Auch unwahrscheinliche Wörter kommen jetzt oft dran.";
		else note.textContent = "Ausgewogen: meistens plausibel, manchmal überraschend.";
	}

	function next() {
		const opts = options();
		if (!opts.length) return false;
		const p = softmax(opts.map((o) => o[1]), T());
		const i = pick(p);
		words.push(opts[i][0]);
		render();
		return options().length > 0;
	}

	function stopAuto() {
		clearInterval(auto);
		auto = null;
	}

	btnNext.addEventListener("click", () => {
		stopAuto();
		next();
	});
	btnSentence.addEventListener("click", () => {
		stopAuto();
		auto = setInterval(() => {
			if (!next()) stopAuto();
		}, 380);
	});
	document.getElementById("btnRestart").addEventListener("click", () => {
		stopAuto();
		words = [...START];
		render();
	});
	temp.addEventListener("input", () => {
		tempOut.textContent = nf(T(), 1);
		render();
	});
	render();
})();
