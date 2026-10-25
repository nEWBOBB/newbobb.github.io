"use strict";

// 20 ML-Algorithmen, Teil 1: Übersicht, Grundlagen und Kapitel 1 bis 10.

const { clamp, nf, sigmoid, PAL, classColor, rng, DATA, M, $ } = ML;

const ALGOS = [
	["a01", "Lineare Regression", "Regression", 25],
	["a02", "Logistische Regression", "Klassifikation", 205],
	["a03", "k-Nearest Neighbors", "Klassifikation", 205],
	["a04", "Naive Bayes", "Klassifikation", 205],
	["a05", "Entscheidungsbaum", "Klassifikation", 205],
	["a06", "Random Forest", "Ensemble", 100],
	["a07", "Gradient Boosting", "Ensemble", 100],
	["a08", "Support Vector Machine", "Klassifikation", 205],
	["a09", "k-Means", "Clustering", 320],
	["a10", "Hierarchisches Clustering", "Clustering", 320],
	["a11", "DBSCAN", "Clustering", 320],
	["a12", "PCA", "Dimensionen", 270],
	["a13", "t-SNE", "Dimensionen", 270],
	["a14", "LDA", "Klassifikation", 205],
	["a15", "QDA", "Klassifikation", 205],
	["a16", "KNN-Regression", "Regression", 25],
	["a17", "Neuronales Netz (MLP)", "Neuronale Netze", 48],
	["a18", "CNN", "Neuronale Netze", 48],
	["a19", "RNN / LSTM", "Neuronale Netze", 48],
	["a20", "Q-Learning", "Bestärkend", 165],
];

// =====================================================================
// Übersicht und Fortschritt: Ein Kapitel gilt als verstanden, wenn sein Quiz richtig beantwortet ist.
// =====================================================================
(() => {
	const KEY = "ml20-verstanden";
	let done = new Set();
	try {
		done = new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
	} catch (e) {
		/* Speicher nicht verfügbar */
	}
	const map = $("map");
	const score = $("mapScore");
	map.innerHTML = ALGOS.map(
		([id, name, fam, h], i) =>
			`<a href="#${id}" style="--h:${h}" data-id="${id}"><small>${String(i + 1).padStart(2, "0")} · ${fam}</small><b>${name}</b></a>`
	).join("");
	const paint = () => {
		map.querySelectorAll("a").forEach((a) => a.classList.toggle("done", done.has(a.dataset.id)));
		score.textContent = done.size
			? `${done.size} von 20 verstanden${done.size === 20 ? " – alle! 🎉" : ""}`
			: "Beantworte die Quizfrage eines Kapitels richtig, dann bekommt es hier einen Haken.";
	};
	paint();
	document.querySelectorAll("section.chapter[id^='a'] .quiz button").forEach((b) =>
		b.addEventListener("click", () =>
			setTimeout(() => {
				if (!b.classList.contains("is-right")) return;
				done.add(b.closest("section").id);
				try {
					localStorage.setItem(KEY, JSON.stringify([...done]));
				} catch (e) {
					/* Speicher nicht verfügbar */
				}
				paint();
			})
		)
	);

	// Spickzettel aus denselben Daten
	const CHEAT = {
		a01: ["Gerade mit kleinster Summe der Fehlerquadrate.", "einfach, deutbar", "nur linear, ausreißerempfindlich"],
		a02: ["Gerade durch die Sigmoid-Funktion ergibt eine Wahrscheinlichkeit.", "Wahrscheinlichkeiten, deutbar", "nur lineare Grenze"],
		a03: ["Die k nächsten gespeicherten Beispiele stimmen ab.", "kein Training, beliebige Grenzen", "langsam, Skalierung nötig"],
		a04: ["Bayes-Formel mit unabhängigen Merkmalen.", "sehr schnell, gut für Text", "Unabhängigkeit fast nie wahr"],
		a05: ["Eine Ja-Nein-Frage nach der anderen.", "erklärbar, nichtlinear", "overfittet schnell"],
		a06: ["Viele zufällige Bäume stimmen ab (Bagging).", "robust, genau", "schwer deutbar"],
		a07: ["Jeder neue Baum korrigiert die Fehler der vorherigen.", "Spitzenreiter bei Tabellen", "viele Parameter"],
		a08: ["Trennlinie mit breitestem Abstand, Kernel für Kurven.", "stark in hohen Dimensionen", "Kernel-Wahl, langsam bei vielen Daten"],
		a09: ["Zuordnen und Mittelpunkte verschieben, im Wechsel.", "schnell, einfach", "k vorgeben, nur runde Gruppen"],
		a10: ["Immer die zwei nächsten Gruppen verschmelzen.", "kein k nötig, Dendrogramm", "rechenaufwendig"],
		a11: ["Dichte Regionen werden Cluster, Rest ist Rauschen.", "beliebige Formen, Ausreißer", "empfindlich für ε"],
		a12: ["Neue Achsen entlang der größten Streuung.", "schnell, entfernt Redundanz", "nur linear"],
		a13: ["Nachbarschaften aus vielen Dimensionen in 2D nachbauen.", "zeigt Cluster", "nur zum Anschauen, Abstände trügen"],
		a14: ["Projektion, die Klassenmittel trennt und Klassen schmal hält.", "klassifiziert und reduziert", "gleiche Kovarianz angenommen"],
		a15: ["Jede Klasse eine eigene Glocke, gekrümmte Grenze.", "flexibler als LDA", "braucht mehr Daten"],
		a16: ["Durchschnitt der k ähnlichsten Beispiele.", "keine Formannahme", "kein Extrapolieren"],
		a17: ["Gestapelte Neuronen, Backpropagation.", "extrem flexibel", "datenhungrig, Blackbox"],
		a18: ["Filter gleiten über das Bild und erkennen Muster.", "ideal für Bilder", "rechenintensiv"],
		a19: ["Versteckter Zustand trägt Gedächtnis durch die Folge.", "für Sequenzen", "verschwindende Gradienten"],
		a20: ["Q-Tabelle aus Belohnung und Ausprobieren.", "lernt ohne Vorbild", "viele Versuche nötig"],
	};
	$("cheat").innerHTML = ALGOS.map(([id, name, fam, h], i) => {
		const [idea, plus, minus] = CHEAT[id];
		const use = document.querySelector(`#${id} .use`)?.textContent.replace(/^Einsatz/, "") || "";
		return `<article style="--h:${h}"><small>${String(i + 1).padStart(2, "0")} · ${fam}</small><h3><a href="#${id}">${name}</a></h3><p>${idea}</p><p><em>${use}</em></p><ul class="pc"><li class="plus">${plus}</li><li class="minus">${minus}</li></ul></article>`;
	}).join("");
})();

// Alltags-Detektiv: Karten umdrehen, um den Algorithmus dahinter zu sehen
(() => {
	const CASES = [
		["🎬", "„Das könnte dir auch gefallen“ bei Netflix", "a03", "Ähnliche Nutzer finden, wie bei k-Nearest Neighbors, oft kombiniert mit neuronalen Netzen."],
		["📧", "Spam landet von allein im Spamordner", "a04", "Klassisch Naive Bayes: Jedes Wort ist ein kleines Indiz für oder gegen Spam."],
		["🏦", "Die Bank lehnt deinen Kredit ab", "a07", "Häufig Gradient Boosting oder logistische Regression auf Tabellendaten."],
		["📱", "Das Handy entsperrt sich mit deinem Gesicht", "a18", "Ein CNN erkennt Kanten, Formen und schließlich dein Gesicht."],
		["🛒", "Der Shop schickt dir passende Angebote", "a09", "Kunden werden mit Clustering wie k-Means in Gruppen eingeteilt."],
		["💳", "Deine Karte wird nach einer seltsamen Zahlung gesperrt", "a11", "Ausreißer-Erkennung, etwa mit DBSCAN: Diese Zahlung passt zu keiner Gruppe."],
		["🎮", "Eine KI schlägt Weltmeister in Go und Atari-Spielen", "a20", "Bestärkendes Lernen wie Q-Learning, mit neuronalen Netzen als Gedächtnis."],
		["🏠", "Ein Portal schätzt den Wert deiner Wohnung", "a01", "Regression: Fläche, Lage und Baujahr werden zu einem Preis verrechnet."],
	];
	const box = $("detective");
	box.innerHTML = CASES.map(
		([ico, q, id, a]) =>
			`<div class="card-flip"><button type="button" class="front" aria-expanded="false"><i>${ico}</i>${q}</button><div class="back"><b>${ALGOS.find((x) => x[0] === id)[1]}</b>${a}<a href="#${id}">Zum Labor →</a></div></div>`
	).join("");
	box.querySelectorAll(".card-flip").forEach((card) => {
		const btn = card.querySelector(".front");
		const set = (open) => {
			card.classList.toggle("open", open);
			btn.setAttribute("aria-expanded", String(open));
			card.querySelector(".back a").tabIndex = open ? 0 : -1;
		};
		set(false);
		btn.addEventListener("click", () => set(true));
		card.querySelector(".back").addEventListener("click", (e) => !e.target.closest("a") && set(false));
	});
})();

// Bühnen, die höher als das Fenster sind, scrollen normal mit statt zu kleben
(() => {
	const fit = () =>
		document.querySelectorAll(".chapter:not(.wide) .stage").forEach((s) => {
			s.style.position = s.offsetHeight > window.innerHeight - 90 ? "relative" : "";
			s.style.top = s.style.position ? "0" : "";
		});
	window.addEventListener("resize", fit);
	window.addEventListener("load", fit);
	fit();
})();

// Kleines Liniendiagramm: series = [{ v: [...], color, dash, label }], xs = Beschriftungen
function lineChart(p, series, xs, opt = {}) {
	const ctx = p.ctx;
	const { w, h } = p.size;
	const L = 40;
	const R = 12;
	const T = 34;
	const Bm = 24;
	const max = opt.max ?? Math.max(...series.flatMap((s) => s.v)) * 1.08;
	const X = (i) => L + (i / Math.max(1, xs.length - 1)) * (w - L - R);
	const Y = (v) => h - Bm - (Math.min(v, max) / max) * (h - T - Bm);
	ctx.fillStyle = "#070605";
	ctx.fillRect(0, 0, w, h);
	ctx.font = '11px "Space Grotesk", sans-serif';
	ctx.fillStyle = "rgba(244,239,230,0.4)";
	ctx.textAlign = "center";
	xs.forEach((x, i) => {
		if (xs.length < 16 || i % 2 === 0) ctx.fillText(String(x), X(i), h - 7);
	});
	ML.line(ctx, L, h - Bm, w - R, h - Bm, "rgba(255,255,255,0.15)");
	if (opt.mark != null) ML.line(ctx, X(opt.mark), T - 6, X(opt.mark), h - Bm, "rgba(255,255,255,0.35)", 1, [3, 3]);
	series.forEach((s, si) => {
		ctx.save();
		ctx.strokeStyle = s.color;
		ctx.lineWidth = 2;
		if (s.dash) ctx.setLineDash(s.dash);
		ctx.beginPath();
		s.v.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
		ctx.stroke();
		ctx.restore();
		s.v.forEach((v, i) => {
			ctx.beginPath();
			ctx.arc(X(i), Y(v), i === opt.mark ? 4.5 : 2.5, 0, Math.PI * 2);
			ctx.fillStyle = s.color;
			ctx.fill();
		});
		if (s.label) {
			ctx.textAlign = "right";
			ctx.fillStyle = s.color;
			ctx.fillText(s.label, w - R, 14 + si * 14);
		}
	});
	if (v0(opt.topLabel)) {
		ctx.textAlign = "left";
		ctx.fillStyle = "rgba(244,239,230,0.4)";
		ctx.fillText(opt.topLabel, L, T - 12);
	}
}
const v0 = (x) => x !== undefined && x !== null;

// Lineares Gleichungssystem lösen (Gauß mit Pivotsuche)
function solve(A, b) {
	const n = b.length;
	const m = A.map((row, i) => [...row, b[i]]);
	for (let c = 0; c < n; c++) {
		let piv = c;
		for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
		[m[c], m[piv]] = [m[piv], m[c]];
		for (let r = 0; r < n; r++) {
			if (r === c) continue;
			const f = m[r][c] / m[c][c];
			for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
		}
	}
	return m.map((row, i) => row[n] / row[i]);
}

// =====================================================================
// 00 · Overfitting mit Polynomen
// =====================================================================
(() => {
	const p = ML.plot($("c00"), (w) => (w < 500 ? 1.3 : 1.6), { xmin: -1.05, xmax: 1.05, ymin: -1.4, ymax: 1.4 });
	const q = ML.plot($("c00b"), (w) => (w < 500 ? 2.6 : 3.4));
	let train = [];
	let test = [];
	let seed = 4;
	const truth = (x) => Math.sin(x * 2.6) * 0.75 + x * 0.2;
	const gen = () => {
		const r = rng(seed);
		train = Array.from({ length: 13 }, (_, i) => {
			const x = -0.97 + ((i + 0.2 + r() * 0.6) / 13) * 1.94;
			return { x, y: truth(x) + r.n() * 0.22 };
		});
		test = Array.from({ length: 50 }, () => {
			const x = -0.95 + r() * 1.9;
			return { x, y: truth(x) + r.n() * 0.22 };
		});
	};
	const fit = (d) => {
		const n = d + 1;
		const A = Array.from({ length: n }, () => new Array(n).fill(0));
		const b = new Array(n).fill(0);
		for (const pt of train) {
			const pw = [];
			for (let i = 0; i < n; i++) pw.push(pt.x ** i);
			for (let i = 0; i < n; i++) {
				b[i] += pw[i] * pt.y;
				for (let j = 0; j < n; j++) A[i][j] += pw[i] * pw[j];
			}
		}
		for (let i = 0; i < n; i++) A[i][i] += 1e-7;
		const c = solve(A, b);
		return (x) => c.reduce((s, ci, i) => s + ci * x ** i, 0);
	};
	const rmse = (f, pts) => Math.sqrt(pts.reduce((s, pt) => s + (f(pt.x) - pt.y) ** 2, 0) / pts.length);
	let curves = [];
	const recompute = () => {
		curves = [];
		for (let d = 1; d <= 14; d++) {
			const f = fit(d);
			curves.push({ f, tr: rmse(f, train), te: rmse(f, test) });
		}
	};
	const deg = ML.slider("deg00", (v) => String(v), () => draw());
	const draw = () => {
		const d = deg.get();
		const { f, tr, te } = curves[d - 1];
		const ctx = p.ctx;
		p.clear();
		ML.line(ctx, 0, p.Y(0), p.size.w, p.Y(0), "rgba(255,255,255,0.08)");
		ctx.save();
		ctx.strokeStyle = "rgba(255,255,255,0.18)";
		ctx.setLineDash([4, 4]);
		ctx.beginPath();
		for (let i = 0; i <= 200; i++) {
			const x = -1 + i / 100;
			i ? ctx.lineTo(p.X(x), p.Y(truth(x))) : ctx.moveTo(p.X(x), p.Y(truth(x)));
		}
		ctx.stroke();
		ctx.restore();
		ML.dots(p, test, { color: () => "rgba(94,200,255,0.75)", hollow: true, r: 3.5 });
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, 0, p.size.w, p.size.h);
		ctx.clip();
		ctx.strokeStyle = "#ff8a3d";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		for (let i = 0; i <= 300; i++) {
			const x = -1.05 + (i / 300) * 2.1;
			const y = clamp(f(x), -3, 3);
			i ? ctx.lineTo(p.X(x), p.Y(y)) : ctx.moveTo(p.X(x), p.Y(y));
		}
		ctx.stroke();
		ctx.restore();
		ML.dots(p, train, { color: () => "#ffd9bf", r: 4.5 });
		$("r00").innerHTML = `Training ${nf(tr, 2)}<br>Test ${nf(te, 2)}`;
		const best = curves.reduce((b, c, i) => (c.te < curves[b].te ? i : b), 0) + 1;
		$("n00").textContent =
			d <= 2
				? "Underfitting: Die Kurve ist zu simpel und verfehlt die Welle. Beide Fehler sind hoch."
				: d >= best + 4
				? `Overfitting: Der Trainingsfehler sinkt weiter, aber die Kurve schlängelt sich durch das Rauschen. Der Testfehler steigt. Am besten war Grad ${best}.`
				: d === best
				? `Grad ${best} hat hier den kleinsten Testfehler. Die gestrichelte Linie zeigt den echten Zusammenhang.`
				: "Die Kurve fängt die Welle ein. Vergleiche den Testfehler mit höheren Graden.";
		lineChart(
			q,
			[
				{ v: curves.map((c) => c.tr), color: "#ff8a3d", label: "Trainingsfehler" },
				{ v: curves.map((c) => c.te), color: "#5ec8ff", label: "Testfehler" },
			],
			curves.map((_, i) => i + 1),
			{ max: 0.9, mark: d - 1 }
		);
	};
	p.draw = q.draw = () => curves.length && draw();
	$("new00").addEventListener("click", () => {
		seed++;
		gen();
		recompute();
		draw();
	});
	gen();
	recompute();
	draw();
})();

// =====================================================================
// 01 · Lineare Regression mit Fehlerquadraten und Gradientenabstieg
// =====================================================================
(() => {
	const p = ML.plot($("c01"), (w) => (w < 500 ? 1.1 : 1.45), { xmin: 10, xmax: 170, ymin: -50, ymax: 850 }, { l: 40, r: 12, t: 30, b: 26 });
	let pts = [];
	let seed = 2;
	const gen = () => {
		const r = rng(seed);
		pts = Array.from({ length: 14 }, () => {
			const x = 30 + r() * 120;
			return { x, y: 40 + 3.6 * x + r.n() * 45 };
		});
	};
	const slope = ML.slider("s01", (v) => nf(v, 2), () => draw());
	const icpt = ML.slider("i01", (v) => nf(v, 0), () => draw());
	const mse = (s, i) => pts.reduce((a, q) => a + (q.y - (i + s * q.x)) ** 2, 0) / (pts.length || 1);
	const optimum = () => {
		const n = pts.length;
		const mx = pts.reduce((a, q) => a + q.x, 0) / n;
		const my = pts.reduce((a, q) => a + q.y, 0) / n;
		let sxy = 0;
		let sxx = 0;
		for (const q of pts) {
			sxy += (q.x - mx) * (q.y - my);
			sxx += (q.x - mx) ** 2;
		}
		const s = sxx ? sxy / sxx : 0;
		return { s, i: my - s * mx, mx, my, sx: Math.sqrt(sxx / n) || 1, sy: Math.sqrt(pts.reduce((a, q) => a + (q.y - my) ** 2, 0) / n) || 1 };
	};
	const draw = () => {
		const ctx = p.ctx;
		const s = slope.get();
		const i = icpt.get();
		p.clear();
		ctx.font = '11px "Space Grotesk", sans-serif';
		ctx.fillStyle = "rgba(244,239,230,0.35)";
		for (let gx = 25; gx <= 150; gx += 25) {
			ML.line(ctx, p.X(gx), p.Y(-50), p.X(gx), p.Y(850), "rgba(255,255,255,0.05)");
			ctx.textAlign = "center";
			ctx.fillText(gx, p.X(gx), p.size.h - 8);
		}
		for (let gy = 0; gy <= 800; gy += 200) {
			ML.line(ctx, p.X(10), p.Y(gy), p.X(170), p.Y(gy), "rgba(255,255,255,0.05)");
			ctx.textAlign = "right";
			ctx.fillText(gy, 34, p.Y(gy) + 4);
		}
		for (const q of pts) {
			const y0 = p.Y(q.y);
			const y1 = p.Y(i + s * q.x);
			const side = Math.abs(y1 - y0);
			const x0 = p.X(q.x);
			ctx.fillStyle = "rgba(255,138,61,0.14)";
			ctx.strokeStyle = "rgba(255,138,61,0.55)";
			ctx.lineWidth = 1;
			ctx.fillRect(x0, Math.min(y0, y1), side, side);
			ctx.strokeRect(x0, Math.min(y0, y1), side, side);
		}
		ML.line(ctx, p.X(10), p.Y(i + s * 10), p.X(170), p.Y(i + s * 170), "#f4efe6", 2.5);
		ML.dots(p, pts, { color: () => "#ff8a3d", r: 5 });
		const e = mse(s, i);
		const o = optimum();
		const best = mse(o.s, o.i);
		$("r01").innerHTML = `MSE ${nf(e, 0)}<br>⌀ Fehler ±${nf(Math.sqrt(e), 0)} Tsd. €`;
		const ratio = e / Math.max(best, 1e-9);
		$("n01").textContent =
			ratio < 1.01
				? `Optimal: Steigung ${nf(o.s, 2)} Tsd. € pro m². Kleiner wird die Fläche der Quadrate nicht.`
				: `Deine Quadrate sind zusammen ${nf(ratio, ratio < 10 ? 1 : 0)}-mal so groß wie beim Optimum.`;
	};
	let anim = 0;
	$("gd01").addEventListener("click", () => {
		cancelAnimationFrame(anim);
		const o = optimum();
		const n = pts.length;
		let b = (slope.get() * o.sx) / o.sy;
		let a = (icpt.get() + slope.get() * o.mx - o.my) / o.sy;
		let k = 0;
		const step = () => {
			for (let rep = 0; rep < 2; rep++) {
				let ga = 0;
				let gb = 0;
				for (const q of pts) {
					const xn = (q.x - o.mx) / o.sx;
					const err = a + b * xn - (q.y - o.my) / o.sy;
					ga += (2 * err) / n;
					gb += (2 * err * xn) / n;
				}
				a -= 0.04 * ga;
				b -= 0.04 * gb;
			}
			const s = (o.sy * b) / o.sx;
			slope.set(clamp(s, 0, 7));
			icpt.set(clamp(o.my + o.sy * a - s * o.mx, -200, 400));
			draw();
			if (++k < 140 && Math.abs(slope.get() - o.s) + Math.abs(icpt.get() - o.i) / 100 > 0.002) anim = requestAnimationFrame(step);
		};
		step();
	});
	$("out01").addEventListener("click", () => {
		pts.push({ x: 150 + Math.random() * 10, y: 40 + Math.random() * 40 });
		draw();
	});
	$("new01").addEventListener("click", () => {
		seed++;
		gen();
		draw();
	});
	ML.pointer(p, {
		tap(x, y) {
			const hit = pts.findIndex((q) => Math.hypot(p.X(q.x) - p.X(x), p.Y(q.y) - p.Y(y)) < 10);
			if (hit >= 0) pts.splice(hit, 1);
			else if (x > 10 && x < 170 && y > -50 && y < 850) pts.push({ x, y });
			draw();
		},
	});
	p.draw = () => pts.length && draw();
	gen();
	draw();
})();

// =====================================================================
// 02 · Logistische Regression in 1D
// =====================================================================
(() => {
	const p = ML.plot($("c02"), (w) => (w < 500 ? 1.2 : 1.6), { xmin: 0, xmax: 10, ymin: -0.08, ymax: 1.08 }, { l: 34, r: 14, t: 30, b: 26 });
	let pts = [];
	let seed = 5;
	const gen = () => {
		const r = rng(seed);
		pts = Array.from({ length: 26 }, () => {
			const x = 0.3 + r() * 9.4;
			return { x, c: r() < sigmoid(1.3 * (x - 5.2)) ? 1 : 0, j: r.n() * 0.018 };
		});
	};
	const w = ML.slider("w02", (v) => nf(v, 2), () => draw());
	const t = ML.slider("t02", (v) => `${nf(v, 1)} h`, () => draw());
	const loss = (wv, tv) =>
		pts.reduce((a, q) => {
			const pr = clamp(sigmoid(wv * (q.x - tv)), 1e-6, 1 - 1e-6);
			return a - (q.c ? Math.log(pr) : Math.log(1 - pr));
		}, 0) / (pts.length || 1);
	const fitBest = () => {
		let A = 1;
		let Bc = 0;
		for (let k = 0; k < 3000; k++) {
			let gA = 0;
			let gB = 0;
			for (const q of pts) {
				const xn = (q.x - 5) / 2.5;
				const e = sigmoid(A * xn + Bc) - q.c;
				gA += e * xn;
				gB += e;
			}
			A -= (0.5 * gA) / pts.length;
			Bc -= (0.5 * gB) / pts.length;
		}
		return { A, Bc };
	};
	const draw = () => {
		const ctx = p.ctx;
		const wv = w.get();
		const tv = t.get();
		p.clear();
		ctx.font = '11px "Space Grotesk", sans-serif';
		ctx.fillStyle = "rgba(244,239,230,0.35)";
		for (let gx = 0; gx <= 10; gx += 2) {
			ctx.textAlign = "center";
			ctx.fillText(`${gx} h`, p.X(gx), p.size.h - 8);
		}
		[0, 0.5, 1].forEach((gy) => {
			ML.line(ctx, p.X(0), p.Y(gy), p.X(10), p.Y(gy), "rgba(255,255,255,0.07)");
			ctx.textAlign = "right";
			ctx.fillText(`${gy * 100} %`, 30, p.Y(gy) + 4);
		});
		ML.line(ctx, p.X(tv), p.Y(-0.08), p.X(tv), p.Y(1.08), "rgba(255,255,255,0.35)", 1, [4, 4]);
		for (const q of pts) {
			const pr = sigmoid(wv * (q.x - tv));
			const l = -Math.log(clamp(q.c ? pr : 1 - pr, 1e-6, 1));
			ML.line(ctx, p.X(q.x), p.Y(q.c + q.j), p.X(q.x), p.Y(pr), `rgba(255,93,93,${clamp(0.15 + l * 0.3, 0, 0.9)})`, 1 + Math.min(l, 3));
		}
		ctx.strokeStyle = "#f4efe6";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		for (let i = 0; i <= 200; i++) {
			const x = i / 20;
			i ? ctx.lineTo(p.X(x), p.Y(sigmoid(wv * (x - tv)))) : ctx.moveTo(p.X(x), p.Y(sigmoid(wv * (x - tv))));
		}
		ctx.stroke();
		ML.dots(p, pts.map((q) => ({ x: q.x, y: q.c + q.j, c: q.c ? 0 : 1 })), { r: 5 });
		ML.label(p, "bestanden", p.X(0) + 4, p.Y(1) + 18, { color: "#ff8a3d", size: 11 });
		ML.label(p, "durchgefallen", p.X(10) - 4, p.Y(0) - 12, { color: "#5ec8ff", size: 11, align: "right" });
		const acc = pts.reduce((a, q) => a + ((q.x >= tv ? 1 : 0) === q.c ? 1 : 0), 0) / (pts.length || 1);
		const l = loss(wv, tv);
		$("r02").innerHTML = `Log-Loss ${nf(l, 3)}<br>Genauigkeit ${ML.pct(acc)}`;
		$("n02").textContent = `Rote Linien zeigen die Strafe je Punkt: Je sicherer das Modell falsch liegt, desto dicker. Wer ${nf(tv, 1)} Stunden lernt, besteht laut Modell mit 50 %.`;
	};
	let anim = 0;
	$("fit02").addEventListener("click", () => {
		cancelAnimationFrame(anim);
		const target = fitBest();
		let A = w.get() * 2.5;
		let Bc = A * ((5 - t.get()) / 2.5);
		let k = 0;
		const step = () => {
			for (let rep = 0; rep < 6; rep++) {
				let gA = 0;
				let gB = 0;
				for (const q of pts) {
					const xn = (q.x - 5) / 2.5;
					const e = sigmoid(A * xn + Bc) - q.c;
					gA += e * xn;
					gB += e;
				}
				A -= (0.6 * gA) / pts.length;
				Bc -= (0.6 * gB) / pts.length;
			}
			const wv = clamp(A / 2.5, 0.1, 6);
			w.set(wv);
			t.set(clamp(5 - (Bc * 2.5) / Math.max(A, 1e-3), 0, 10));
			draw();
			if (++k < 160 && Math.abs(A - target.A) + Math.abs(Bc - target.Bc) > 0.01) anim = requestAnimationFrame(step);
		};
		step();
	});
	$("new02").addEventListener("click", () => {
		seed++;
		gen();
		draw();
	});
	ML.pointer(p, {
		tap(x, y) {
			const hit = pts.findIndex((q) => Math.hypot(p.X(q.x) - p.X(x), p.Y(q.c + q.j) - p.Y(y)) < 10);
			if (hit >= 0) pts.splice(hit, 1);
			else if (x > 0 && x < 10) pts.push({ x, c: y > 0.5 ? 1 : 0, j: 0 });
			draw();
		},
	});
	p.draw = () => draw();
	gen();
	draw();
})();

// =====================================================================
// 03 · k-Nearest Neighbors
// =====================================================================
(() => {
	const p = ML.plot($("c03"), (w) => (w < 500 ? 1.05 : 1.3));
	const bg = ML.layer(p);
	let pts = [];
	let seed = 9;
	let q = { x: 0.5, y: 0.52 };
	let showRegion = true;
	const gen = () => {
		const r = rng(seed);
		pts = DATA.blobs(r, 70, 0.15, 0.3);
		bg.dirty = true;
	};
	const k = ML.slider("k03", (v) => String(v), () => {
		bg.dirty = true;
		draw();
	});
	const draw = () => {
		const ctx = p.ctx;
		const kv = k.get();
		bg.render((L) => {
			L.clear();
			if (showRegion) ML.region(L, M.knn(pts, kv).predict, 120);
		});
		const near = pts
			.map((pt) => ({ pt, d: Math.hypot(pt.x - q.x, pt.y - q.y) }))
			.sort((a, b) => a.d - b.d)
			.slice(0, kv);
		const rad = near.length ? near[near.length - 1].d : 0;
		ctx.save();
		ctx.strokeStyle = "rgba(255,255,255,0.4)";
		ctx.setLineDash([4, 4]);
		ctx.beginPath();
		ctx.ellipse(p.X(q.x), p.Y(q.y), Math.abs(p.X(rad) - p.X(0)), Math.abs(p.Y(rad) - p.Y(0)), 0, 0, Math.PI * 2);
		ctx.stroke();
		ctx.restore();
		for (const n of near) ML.line(ctx, p.X(q.x), p.Y(q.y), p.X(n.pt.x), p.Y(n.pt.y), classColor(n.pt.c, 0.7), 1.5);
		ML.dots(p, pts, { r: 4 });
		for (const n of near) {
			ctx.beginPath();
			ctx.arc(p.X(n.pt.x), p.Y(n.pt.y), 7.5, 0, Math.PI * 2);
			ctx.strokeStyle = "#fff";
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}
		const b = near.filter((n) => n.pt.c).length;
		const a = near.length - b;
		ctx.beginPath();
		ctx.arc(p.X(q.x), p.Y(q.y), 7, 0, Math.PI * 2);
		ctx.fillStyle = "#fff";
		ctx.fill();
		ctx.strokeStyle = classColor(b > a ? 1 : 0);
		ctx.lineWidth = 3;
		ctx.stroke();
		$("r03").innerHTML = `<span style="color:#ff8a3d">${a} × A</span> · <span style="color:#5ec8ff">${b} × B</span>`;
		$("n03").textContent =
			kv === 1
				? "k = 1: Jeder einzelne Punkt bestimmt sein Gebiet, auch Ausreißer bekommen Inseln. Klassisches Overfitting."
				: kv > 30
				? "Großes k: Die Grenze wird sehr glatt. Feinheiten gehen verloren (Underfitting)."
				: `Der neue Punkt wird ${b > a ? "B" : "A"}, weil ${Math.max(a, b)} von ${kv} Nachbarn dafür stimmen (${ML.pct(Math.max(a, b) / kv)}).`;
	};
	ML.pointer(p, {
		move(x, y) {
			q = { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
			draw();
		},
		tap(x, y) {
			q = { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
			draw();
		},
	});
	$("reg03").addEventListener("click", (e) => {
		showRegion = !showRegion;
		e.currentTarget.setAttribute("aria-pressed", String(showRegion));
		bg.dirty = true;
		draw();
	});
	$("new03").addEventListener("click", () => {
		seed++;
		gen();
		draw();
	});
	p.draw = () => pts.length && draw();
	gen();
	draw();
})();

// =====================================================================
// 04 · Naive Bayes als Spamfilter
// =====================================================================
(() => {
	const SPAM = [
		"Gratis Gewinn! Jetzt klicken und Geld sichern",
		"Sie haben gewonnen! Gratis Handy jetzt abholen",
		"Exklusives Angebot: nur heute 90 Prozent Rabatt",
		"Schnell Geld verdienen von zu Hause, jetzt klicken",
		"Ihr Konto wurde gesperrt, klicken Sie hier zur Bestätigung",
		"Gewinnspiel: Gratis Urlaub, jetzt Angebot sichern",
		"Billige Medikamente ohne Rezept, jetzt bestellen",
		"Letzte Chance: Ihr Gewinn wartet, hier klicken",
		"Geld zurück garantiert, Angebot nur heute gültig",
	];
	const HAM = [
		"Hallo, sehen wir uns morgen zum Mittagessen?",
		"Kannst du mir die Unterlagen für das Meeting schicken?",
		"Danke für das Geschenk, hat mich sehr gefreut",
		"Das Meeting ist auf morgen um zehn verschoben",
		"Hast du heute Abend Zeit zum Kochen?",
		"Hier sind die Fotos vom Urlaub, schöne Grüße",
		"Bitte denk an den Termin beim Arzt morgen",
		"Ich bin gleich zu Hause, soll ich Brot mitbringen?",
		"Wie war dein Wochenende? Erzähl mal",
	];
	const words = (s) => (s.toLowerCase().match(/[a-zäöüß]{2,}/g) || []);
	const cnt = [new Map(), new Map()];
	const tot = [0, 0];
	const docs = [0, 0];
	const learn = (text, c) => {
		docs[c]++;
		for (const w of words(text)) {
			cnt[c].set(w, (cnt[c].get(w) || 0) + 1);
			tot[c]++;
		}
	};
	SPAM.forEach((s) => learn(s, 1));
	HAM.forEach((s) => learn(s, 0));
	const input = $("t04");
	const prior = ML.slider("p04", (v) => ML.pct(v), () => render());
	const render = () => {
		const vocab = new Set([...cnt[0].keys(), ...cnt[1].keys()]);
		const V = vocab.size;
		const ws = words(input.value);
		let lo = Math.log(prior.get() / (1 - prior.get()));
		const rows = ['<div class="nb-head"><span>← spricht für normal</span><span>Spam →</span></div>'];
		for (const w of ws.slice(0, 12)) {
			if (!vocab.has(w)) {
				rows.push(`<div class="nbw unknown"><span>${w}</span><div class="axis"></div><output>unbekannt</output></div>`);
				continue;
			}
			const ps = ((cnt[1].get(w) || 0) + 1) / (tot[1] + V);
			const ph = ((cnt[0].get(w) || 0) + 1) / (tot[0] + V);
			const lr = Math.log(ps / ph);
			lo += lr;
			const width = Math.min(Math.abs(lr) / 3, 1) * 50;
			const left = lr >= 0 ? 50 : 50 - width;
			const col = lr >= 0 ? "#ff8a3d" : "#7bdc9a";
			const f = Math.exp(Math.abs(lr));
			rows.push(
				`<div class="nbw"><span>${w}</span><div class="axis"><div class="bar" style="left:${left}%;width:${width}%;background:${col}"></div></div><output style="color:${col}">×${nf(f, 1)}</output></div>`
			);
		}
		for (const w of ws.slice(12)) {
			if (!vocab.has(w)) continue;
			lo += Math.log((((cnt[1].get(w) || 0) + 1) / (tot[1] + V)) / (((cnt[0].get(w) || 0) + 1) / (tot[0] + V)));
		}
		if (!ws.length) rows.push('<div class="nbw unknown"><span>…</span><div class="axis"></div><output></output></div>');
		$("w04").innerHTML = rows.join("");
		const ps = sigmoid(lo);
		$("v04").innerHTML = `<div class="vbar"><i style="width:${ps * 100}%"></i><span><b>Spam ${ML.pct(ps)}</b><b>normal ${ML.pct(1 - ps)}</b></span></div><p>Urteil: <strong>${ps >= 0.5 ? "Spam" : "kein Spam"}</strong></p>`;
		$("n04").textContent = `Gelernt aus ${docs[1]} Spam- und ${docs[0]} normalen Nachrichten, ${V} verschiedene Wörter. Unbekannte Wörter werden ignoriert.`;
	};
	input.addEventListener("input", render);
	document.querySelectorAll("#a04 [data-msg]").forEach((b) =>
		b.addEventListener("click", () => {
			input.value = b.dataset.msg;
			render();
		})
	);
	$("ls04").addEventListener("click", () => {
		learn(input.value, 1);
		render();
	});
	$("lh04").addEventListener("click", () => {
		learn(input.value, 0);
		render();
	});
	render();
})();

// =====================================================================
// 05 · Entscheidungsbaum
// =====================================================================
function drawTree(p, root, opt = {}) {
	const ctx = p.ctx;
	const rec = (n, x0, x1, y0, y1) => {
		if (n.leaf) {
			const conf = Math.abs(n.p - 0.5) * 2;
			const c = n.p >= 0.5 ? ML.B : ML.A;
			ctx.fillStyle = ML.rgb(c, 0.1 + conf * 0.3);
			const X0 = p.X(x0);
			const Y1 = p.Y(y1);
			ctx.fillRect(X0, Y1, p.X(x1) - X0, p.Y(y0) - Y1);
			return;
		}
		if (n.f === "x") {
			rec(n.left, x0, n.t, y0, y1);
			rec(n.right, n.t, x1, y0, y1);
			if (opt.lines) ML.line(ctx, p.X(n.t), p.Y(y0), p.X(n.t), p.Y(y1), "rgba(255,255,255,0.45)", 1);
		} else {
			rec(n.left, x0, x1, y0, n.t);
			rec(n.right, x0, x1, n.t, y1);
			if (opt.lines) ML.line(ctx, p.X(x0), p.Y(n.t), p.X(x1), p.Y(n.t), "rgba(255,255,255,0.45)", 1);
		}
	};
	rec(root, 0, 1, 0, 1);
}

(() => {
	const p = ML.plot($("c05"), (w) => (w < 500 ? 1.1 : 1.4));
	let train = [];
	let test = [];
	let seed = 11;
	const gen = () => {
		const r = rng(seed);
		train = DATA.moons(r, 160, 0.07);
		test = DATA.moons(r, 160, 0.07).map((q) => ({ ...q, test: true }));
	};
	const depth = ML.slider("d05", (v) => String(v), () => draw());
	const leafs = (n) => (n.leaf ? 1 : leafs(n.left) + leafs(n.right));
	const text = (n, pre, lvl, out) => {
		if (out.length > 26) return;
		if (n.leaf) {
			const isB = n.p >= 0.5;
			out[out.length - 1] += ` <b class="${isB ? "b" : "a"}">● ${isB ? "B" : "A"}</b> (${n.n} Punkte, ${ML.pct(isB ? n.p : 1 - n.p)} rein)`;
			return;
		}
		out[out.length - 1] += ` <b>${n.f} &lt; ${nf(n.t, 2)}?</b>`;
		out.push(`${pre}├─ ja:`);
		text(n.left, pre + "│  ", lvl + 1, out);
		out.push(`${pre}└─ nein:`);
		text(n.right, pre + "   ", lvl + 1, out);
	};
	const draw = () => {
		const d = depth.get();
		const t = M.tree(train, d, 1);
		p.clear();
		drawTree(p, t.root, { lines: true });
		ML.dots(p, test, { r: 3.2 });
		ML.dots(p, train, { r: 4 });
		const tr = ML.accuracy(t, train);
		const te = ML.accuracy(t, test);
		$("r05").innerHTML = `Training ${ML.pct(tr)}<br>Test ${ML.pct(te)}`;
		const out = ["Start:"];
		text(t.root, "", 0, out);
		if (out.length > 26) out.splice(26, out.length, "… und viele weitere Fragen");
		$("tree05").innerHTML = out.join("\n");
		const nl = leafs(t.root);
		$("n05").textContent =
			tr > 0.995
				? `${nl} Blätter: Der Baum hat jeden Trainingspunkt auswendig gelernt. Achte auf die Testgenauigkeit und die kleinen Inseln.`
				: `${nl} Blätter. Jede Frage schneidet die Fläche senkrecht oder waagerecht.`;
	};
	$("new05").addEventListener("click", () => {
		seed++;
		gen();
		draw();
	});
	p.draw = () => train.length && draw();
	gen();
	draw();
})();

// =====================================================================
// 06 · Random Forest
// =====================================================================
(() => {
	const p = ML.plot($("c06"), (w) => (w < 500 ? 1.1 : 1.45));
	const minis = ["c06a", "c06b", "c06c"].map((id) => ML.plot($(id), 1));
	let train = [];
	let test = [];
	let forest = null;
	let seed = 21;
	const gen = () => {
		const r = rng(seed);
		train = DATA.moons(r, 200, 0.1);
		test = DATA.moons(r, 300, 0.1).map((q) => ({ ...q, test: true }));
		forest = M.forest(train, 80, 12, seed);
	};
	const n = ML.slider("n06s", (v) => String(v), () => draw());
	const draw = () => {
		const k = n.get();
		p.clear();
		ML.region(p, (x, y) => forest.predict(x, y, k), k === 1 ? 110 : 64);
		ML.dots(p, train, { r: 3.6 });
		minis.forEach((m, i) => {
			m.clear();
			drawTree(m, forest.trees[i].root);
			ML.dots(m, train, { r: 1.6 });
		});
		const acc = (upto) => test.reduce((a, q) => a + ((forest.predict(q.x, q.y, upto) >= 0.5 ? 1 : 0) === q.c ? 1 : 0), 0) / test.length;
		const one = test.reduce((a, q) => a + ((forest.trees[0].predict(q.x, q.y) >= 0.5 ? 1 : 0) === q.c ? 1 : 0), 0) / test.length;
		const all = acc(k);
		$("r06").innerHTML = `Wald: Test ${ML.pct(all)}<br>Baum 1 allein: ${ML.pct(one)}`;
		$("n06").textContent =
			k === 1
				? "Ein einzelner unbegrenzter Baum: zackig, voller Inseln, jeder Ausreißer bekommt ein Kästchen."
				: k < 10
				? `${k} Bäume stimmen ab. Die Grenze wird schon ruhiger.`
				: `${k} Bäume: Die Ausreißer einzelner Bäume werden überstimmt. Helle Farbe heißt, die Bäume sind sich uneinig.`;
	};
	$("new06").addEventListener("click", () => {
		seed++;
		gen();
		draw();
	});
	p.draw = () => forest && draw();
	minis.forEach((m) => (m.draw = p.draw));
	gen();
	draw();
})();

// =====================================================================
// 07 · Gradient Boosting in 1D
// =====================================================================
(() => {
	const p = ML.plot($("c07"), (w) => (w < 500 ? 0.95 : 1.25));
	let train = [];
	let test = [];
	let seed = 3;
	let f0 = 0;
	let trees = [];
	const truth = (x) => Math.sin(x * 2 * Math.PI) * 0.8 + 0.4 * x;
	const gen = () => {
		const r = rng(seed);
		const mk = () => {
			const x = r();
			return { x, y: truth(x) + r.n() * 0.22 };
		};
		train = Array.from({ length: 60 }, mk);
		test = Array.from({ length: 80 }, mk);
		reset();
	};
	const reset = () => {
		f0 = train.reduce((a, q) => a + q.y, 0) / train.length;
		trees = [];
	};
	const lr = ML.slider("lr07", (v) => nf(v, 2), () => draw());
	const depth = ML.slider("d07", (v) => String(v), () => draw());
	const F = (x) => trees.reduce((s, t) => s + t.lr * t.tree.at([x]), f0);
	const nextTree = () => {
		const X = train.map((q) => [q.x]);
		const R = train.map((q) => q.y - F(q.x));
		return M.regTree(X, R, depth.get(), 3);
	};
	const add = (n) => {
		for (let i = 0; i < n; i++) trees.push({ tree: nextTree(), lr: lr.get() });
		draw();
	};
	const mse = (pts) => pts.reduce((a, q) => a + (q.y - F(q.x)) ** 2, 0) / pts.length;
	const draw = () => {
		const ctx = p.ctx;
		const { w, h } = p.size;
		const split = h * 0.6;
		const X = (x) => 12 + x * (w - 24);
		const Yt = (y) => 26 + ((1.5 - y) / 3) * (split - 36);
		const Yb = (y) => split + 16 + ((0.9 - y) / 1.8) * (h - split - 26);
		p.clear();
		ML.line(ctx, 0, split, w, split, "rgba(255,255,255,0.12)");
		ML.line(ctx, 0, Yb(0), w, Yb(0), "rgba(255,255,255,0.12)", 1, [3, 3]);
		for (const q of test) {
			ctx.beginPath();
			ctx.arc(X(q.x), Yt(q.y), 2.5, 0, Math.PI * 2);
			ctx.strokeStyle = "rgba(94,200,255,0.5)";
			ctx.stroke();
		}
		for (const q of train) {
			ctx.beginPath();
			ctx.arc(X(q.x), Yt(q.y), 3.5, 0, Math.PI * 2);
			ctx.fillStyle = "#ffd9bf";
			ctx.fill();
		}
		const path = (f, Y, color, width, dash) => {
			ctx.save();
			ctx.strokeStyle = color;
			ctx.lineWidth = width;
			if (dash) ctx.setLineDash(dash);
			ctx.beginPath();
			for (let i = 0; i <= 400; i++) {
				const x = i / 400;
				i ? ctx.lineTo(X(x), Y(f(x))) : ctx.moveTo(X(x), Y(f(x)));
			}
			ctx.stroke();
			ctx.restore();
		};
		path(F, Yt, "#ff8a3d", 2.5);
		for (const q of train) {
			const r = clamp(q.y - F(q.x), -0.9, 0.9);
			ML.line(ctx, X(q.x), Yb(0), X(q.x), Yb(r), "rgba(255,93,93,0.5)", 1);
			ctx.beginPath();
			ctx.arc(X(q.x), Yb(r), 3, 0, Math.PI * 2);
			ctx.fillStyle = "#ff8f8f";
			ctx.fill();
		}
		const nt = nextTree();
		path((x) => clamp(nt.at([x]), -0.9, 0.9), Yb, "#f4efe6", 2, [5, 4]);
		ML.label(p, "Residuen · gestrichelt: der nächste Baum", 12, split + 14, { size: 11 });
		const tr = mse(train);
		const te = mse(test);
		$("r07").innerHTML = `${trees.length} ${trees.length === 1 ? "Baum" : "Bäume"}<br>Training ${nf(tr, 3)} · Test ${nf(te, 3)}`;
		$("n07").textContent = !trees.length
			? "Start: Die Vorhersage ist nur der Mittelwert. Unten siehst du, wie weit jeder Punkt danebenliegt."
			: tr < 0.03
			? "Die Residuen sind fast nur noch Rauschen. Weitere Bäume lernen jetzt das Rauschen auswendig, schau auf den Testfehler."
			: `Jeder Baum korrigiert einen Teil der Restfehler, gedämpft mit Lernrate ${nf(lr.get(), 2)}.`;
	};
	$("add07").addEventListener("click", () => add(1));
	$("add07x").addEventListener("click", () => add(20));
	$("rst07").addEventListener("click", () => {
		reset();
		draw();
	});
	p.draw = () => train.length && draw();
	gen();
	draw();
})();

// =====================================================================
// 08 · Support Vector Machine
// =====================================================================
(() => {
	const p = ML.plot($("c08"), (w) => (w < 500 ? 1.05 : 1.35));
	let pts = [];
	let kind = "sep";
	let kernel = "linear";
	let cls = 0;
	const gen = () => {
		const r = rng(kind.length * 7 + 1);
		pts = kind === "sep" ? DATA.blobs(r, 36, 0.075, 0.42) : kind === "over" ? DATA.blobs(r, 50, 0.12, 0.3) : DATA.circle(r, 60, 0.02);
	};
	const C = ML.slider("C08", (v) => nf(10 ** v, 10 ** v < 1 ? 2 : 0), () => draw());
	const g = ML.slider("g08", (v) => String(v), () => draw());
	const draw = () => {
		const ctx = p.ctx;
		const m = M.svm(pts, { C: 10 ** C.get(), kernel, gamma: g.get() });
		p.clear();
		ML.region(p, m.predict, 64, 0.9);
		ML.contour(p, m.decision, 0, 70, { width: 2.2 });
		ML.contour(p, m.decision, 1, 70, { width: 1.2, dash: [5, 5], color: "rgba(94,200,255,0.9)" });
		ML.contour(p, m.decision, -1, 70, { width: 1.2, dash: [5, 5], color: "rgba(255,138,61,0.9)" });
		ML.dots(p, pts, { r: 4.5 });
		for (const s of m.sv) {
			ctx.beginPath();
			ctx.arc(p.X(s.x), p.Y(s.y), 9, 0, Math.PI * 2);
			ctx.strokeStyle = "#fff";
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}
		const acc = ML.accuracy(m, pts);
		const width = m.w ? 2 / Math.hypot(m.w[0], m.w[1]) : null;
		$("r08").innerHTML = `${m.sv.length} Stützvektoren<br>Genauigkeit ${ML.pct(acc)}`;
		$("n08").textContent =
			kind === "ring" && kernel === "linear"
				? "Eine gerade Straße kann einen Ring nicht trennen. Schalte den RBF-Kernel ein."
				: kernel === "rbf"
				? `RBF-Kernel: Jeder Stützvektor wirkt wie ein Hügel mit Reichweite γ = ${g.get()}. Großes γ macht kleine Inseln (Overfitting), kleines γ glatte Grenzen.`
				: `Straßenbreite ${nf(width, 2)}. Kleines C macht die Straße breiter und duldet Punkte darin, großes C macht sie streng.`;
	};
	ML.chips($("ds08"), (v) => {
		kind = v;
		gen();
		draw();
	});
	ML.chips($("k08"), (v) => {
		kernel = v;
		draw();
	});
	ML.chips($("cl08"), (v) => (cls = Number(v)));
	ML.pointer(p, {
		tap(x, y) {
			ML.togglepoint(p, pts, x, y, cls);
			draw();
		},
	});
	p.draw = () => pts.length && draw();
	gen();
	draw();
})();

// =====================================================================
// 09 · k-Means
// =====================================================================
function kmeansRun(pts, k, r, pp) {
	const cents = initCents(pts, k, r, pp);
	let as = new Array(pts.length).fill(-1);
	for (let it = 0; it < 50; it++) {
		let ch = 0;
		pts.forEach((q, i) => {
			const a = nearest(cents, q);
			if (a !== as[i]) ch++;
			as[i] = a;
		});
		moveCents(pts, as, cents);
		if (!ch) break;
	}
	return { cents, as, inertia: inertia(pts, as, cents) };
}
function initCents(pts, k, r, pp) {
	if (!pp) {
		const idx = new Set();
		while (idx.size < Math.min(k, pts.length)) idx.add(r.int(pts.length));
		return [...idx].map((i) => ({ x: pts[i].x, y: pts[i].y }));
	}
	const cents = [{ ...pts[r.int(pts.length)] }];
	while (cents.length < k) {
		const d = pts.map((q) => Math.min(...cents.map((c) => (c.x - q.x) ** 2 + (c.y - q.y) ** 2)));
		const s = d.reduce((a, b) => a + b, 0);
		let u = r() * s;
		let i = 0;
		while (i < d.length - 1 && (u -= d[i]) > 0) i++;
		cents.push({ x: pts[i].x, y: pts[i].y });
	}
	return cents.map((c) => ({ x: c.x, y: c.y }));
}
function nearest(cents, q) {
	let best = 0;
	let bd = Infinity;
	cents.forEach((c, j) => {
		const d = (c.x - q.x) ** 2 + (c.y - q.y) ** 2;
		if (d < bd) {
			bd = d;
			best = j;
		}
	});
	return best;
}
function moveCents(pts, as, cents) {
	cents.forEach((c, j) => {
		let sx = 0;
		let sy = 0;
		let n = 0;
		pts.forEach((q, i) => {
			if (as[i] === j) {
				sx += q.x;
				sy += q.y;
				n++;
			}
		});
		if (n) {
			c.x = sx / n;
			c.y = sy / n;
		}
	});
}
function inertia(pts, as, cents) {
	return pts.reduce((s, q, i) => (as[i] < 0 ? s : s + (cents[as[i]].x - q.x) ** 2 + (cents[as[i]].y - q.y) ** 2), 0);
}

(() => {
	const p = ML.plot($("c09"), (w) => (w < 500 ? 1.1 : 1.4));
	const q = ML.plot($("c09b"), (w) => (w < 500 ? 3 : 4));
	let pts = [];
	let seed = 31;
	let cents = [];
	let shown = [];
	let as = [];
	let phase = "assign";
	let iter = 0;
	let done = false;
	let pp = false;
	let elbow = [];
	let runTimer = 0;
	const r = rng(77);
	const gen = () => {
		const g = rng(seed);
		const nc = 3 + g.int(3);
		pts = [];
		const centers = [];
		while (centers.length < nc) {
			const c = [0.2 + g() * 0.6, 0.2 + g() * 0.6];
			if (centers.every((d) => Math.hypot(d[0] - c[0], d[1] - c[1]) > 0.27)) centers.push(c);
		}
		for (const m of centers) {
			const s = 0.035 + g() * 0.035;
			pts.push(...DATA.gauss(g, Math.round(220 / nc), m, [s, s * (0.6 + g() * 0.8)], g() * 3, 0));
		}
		elbow = [];
		for (let kk = 1; kk <= 8; kk++) {
			let best = Infinity;
			for (let t = 0; t < 6; t++) best = Math.min(best, kmeansRun(pts, kk, r, true).inertia);
			elbow.push(best);
		}
	};
	const kS = ML.slider("k09", (v) => String(v), () => restart());
	const restart = () => {
		clearInterval(runTimer);
		cents = initCents(pts, kS.get(), r, pp);
		shown = cents.map((c) => ({ ...c }));
		as = new Array(pts.length).fill(-1);
		phase = "assign";
		iter = 0;
		done = false;
		draw();
	};
	const step = () => {
		if (done) return false;
		if (phase === "assign") {
			let ch = 0;
			pts.forEach((pt, i) => {
				const a = nearest(cents, pt);
				if (a !== as[i]) ch++;
				as[i] = a;
			});
			if (!ch && iter > 0) done = true;
			phase = "update";
		} else {
			const from = cents.map((c) => ({ ...c }));
			moveCents(pts, as, cents);
			iter++;
			phase = "assign";
			const t0 = performance.now();
			const anim = (t) => {
				const u = Math.min(1, (t - t0) / 350);
				shown = from.map((f, j) => ({ x: f.x + (cents[j].x - f.x) * u, y: f.y + (cents[j].y - f.y) * u }));
				draw();
				if (u < 1) requestAnimationFrame(anim);
			};
			requestAnimationFrame(anim);
		}
		draw();
		return !done;
	};
	const draw = () => {
		const ctx = p.ctx;
		p.clear();
		if (shown.length) ML.regionMulti(p, (x, y) => nearest(shown, { x, y }), 80, 0.13);
		if (phase === "update" && !done)
			pts.forEach((pt, i) => as[i] >= 0 && ML.line(ctx, p.X(pt.x), p.Y(pt.y), p.X(shown[as[i]].x), p.Y(shown[as[i]].y), PAL[as[i] % PAL.length] + "30", 1));
		ML.dots(p, pts, { r: 3.4, color: (pt) => (as[pts.indexOf(pt)] >= 0 ? PAL[as[pts.indexOf(pt)] % PAL.length] : "rgba(244,239,230,0.45)") });
		shown.forEach((c, j) => {
			const x = p.X(c.x);
			const y = p.Y(c.y);
			ctx.beginPath();
			ctx.arc(x, y, 11, 0, Math.PI * 2);
			ctx.fillStyle = "#0b0a09";
			ctx.fill();
			ctx.lineWidth = 3;
			ctx.strokeStyle = PAL[j % PAL.length];
			ctx.stroke();
			ML.line(ctx, x - 5, y, x + 5, y, "#fff", 2);
			ML.line(ctx, x, y - 5, x, y + 5, "#fff", 2);
		});
		const inr = as[0] >= 0 ? inertia(pts, as, cents) : null;
		$("ph09").textContent = done ? "Fertig: nichts bewegt sich mehr" : iter === 0 && as[0] < 0 ? "Start: zufällige Mittelpunkte" : phase === "update" ? "Als Nächstes: Verschieben" : "Als Nächstes: Zuordnen";
		$("r09").innerHTML = `Runde ${iter}${inr != null ? `<br>Streuung ${nf(inr, 2)}` : ""}`;
		$("n09").textContent = done
			? inr != null && inr > elbow[kS.get() - 1] * 1.15
				? `Fertig, aber nicht optimal: Die beste bekannte Lösung hat Streuung ${nf(elbow[kS.get() - 1], 2)}. Ein schlechter Start hat k-Means in einem lokalen Minimum gefangen. Starte neu oder nimm k-Means++.`
				: "Fertig. Die Zuordnung ändert sich nicht mehr, also bewegen sich auch die Mittelpunkte nicht mehr."
			: phase === "update"
			? "Jeder Punkt hat die Farbe seines nächsten Mittelpunkts. Jetzt wandert jeder Mittelpunkt in die Mitte seiner Punkte."
			: "Jeder Punkt sucht sich den nächsten Mittelpunkt.";
		lineChart(q, [{ v: elbow, color: "#ff8a3d" }], elbow.map((_, i) => `k=${i + 1}`), { mark: kS.get() - 1 });
	};
	$("st09").addEventListener("click", () => {
		clearInterval(runTimer);
		step();
	});
	$("run09").addEventListener("click", () => {
		clearInterval(runTimer);
		runTimer = setInterval(() => {
			if (!step()) clearInterval(runTimer);
		}, 420);
	});
	$("rs09").addEventListener("click", restart);
	$("pp09").addEventListener("click", (e) => {
		pp = !pp;
		e.currentTarget.setAttribute("aria-pressed", String(pp));
		restart();
	});
	$("new09").addEventListener("click", () => {
		seed++;
		gen();
		restart();
	});
	p.draw = q.draw = () => pts.length && draw();
	gen();
	restart();
})();

// =====================================================================
// 10 · Hierarchisches Clustering mit Dendrogramm
// =====================================================================
(() => {
	const p = ML.plot($("c10"), (w) => (w < 500 ? 1.3 : 1.7));
	const q = ML.plot($("c10b"), (w) => (w < 500 ? 1.9 : 2.6));
	let pts = [];
	let seed = 41;
	let link = "average";
	let merges = [];
	let maxH = 1;
	let m = 0;
	const gen = () => {
		const r = rng(seed);
		pts = [
			...DATA.gauss(r, 6, [0.25, 0.7], [0.06, 0.05], 0, 0),
			...DATA.gauss(r, 6, [0.7, 0.72], [0.05, 0.07], 0, 0),
			...DATA.gauss(r, 5, [0.5, 0.25], [0.07, 0.05], 0, 0),
			{ x: 0.9, y: 0.2, c: 0 },
		];
	};
	const build = () => {
		const D = pts.map((a) => pts.map((b) => Math.hypot(a.x - b.x, a.y - b.y)));
		let clusters = pts.map((_, i) => ({ id: i, mem: [i] }));
		merges = [];
		let next = pts.length;
		const dist = (A, B) => {
			let mn = Infinity;
			let mx = 0;
			let s = 0;
			for (const i of A.mem)
				for (const j of B.mem) {
					mn = Math.min(mn, D[i][j]);
					mx = Math.max(mx, D[i][j]);
					s += D[i][j];
				}
			return link === "single" ? mn : link === "complete" ? mx : s / (A.mem.length * B.mem.length);
		};
		const cent = (C) => ({ x: C.mem.reduce((s, i) => s + pts[i].x, 0) / C.mem.length, y: C.mem.reduce((s, i) => s + pts[i].y, 0) / C.mem.length });
		while (clusters.length > 1) {
			let best = [0, 1];
			let bd = Infinity;
			for (let a = 0; a < clusters.length; a++)
				for (let b = a + 1; b < clusters.length; b++) {
					const d = dist(clusters[a], clusters[b]);
					if (d < bd) {
						bd = d;
						best = [a, b];
					}
				}
			const A = clusters[best[0]];
			const Bc = clusters[best[1]];
			const N = { id: next++, mem: [...A.mem, ...Bc.mem] };
			merges.push({ a: A.id, b: Bc.id, id: N.id, h: Math.max(bd, merges.length ? merges[merges.length - 1].h : 0), ca: cent(A), cb: cent(Bc) });
			clusters = clusters.filter((_, i) => i !== best[0] && i !== best[1]);
			clusters.push(N);
		}
		maxH = merges[merges.length - 1].h || 1;
	};
	const hS = ML.slider("h10", (v) => nf(v * maxH * 1.05, 2), (v) => {
		m = merges.filter((g) => g.h <= v * maxH * 1.05).length;
		draw();
	});
	const groups = () => {
		const parent = pts.map((_, i) => i);
		const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
		const rep = new Map(pts.map((_, i) => [i, i]));
		for (let k = 0; k < m; k++) {
			const g = merges[k];
			const ra = rep.get(g.a);
			const rb = rep.get(g.b);
			parent[find(rb)] = find(ra);
			rep.set(g.id, ra);
		}
		return pts.map((_, i) => find(i));
	};
	const draw = () => {
		const ctx = p.ctx;
		const g = groups();
		const sizes = new Map();
		g.forEach((r) => sizes.set(r, (sizes.get(r) || 0) + 1));
		const order = [...new Set(g)].filter((r) => sizes.get(r) > 1).sort((a, b) => a - b);
		const color = (i) => (sizes.get(g[i]) > 1 ? PAL[order.indexOf(g[i]) % PAL.length] : "rgba(244,239,230,0.5)");
		p.clear();
		for (let k = 0; k < m; k++) {
			const s = merges[k];
			ML.line(ctx, p.X(s.ca.x), p.Y(s.ca.y), p.X(s.cb.x), p.Y(s.cb.y), k === m - 1 ? "#ffc23d" : "rgba(255,255,255,0.22)", k === m - 1 ? 2.5 : 1.2);
		}
		ML.dots(p, pts, { r: 6, color: (pt) => color(pts.indexOf(pt)) });
		const nC = new Set(g).size;
		$("r10").innerHTML = `${nC} Cluster<br>${m} von ${merges.length} Verschmelzungen`;
		$("n10").textContent =
			m === 0
				? "Am Anfang ist jeder Punkt sein eigener Cluster."
				: m === merges.length
				? "Alles ist zu einem Cluster verschmolzen. Der oberste Strich im Dendrogramm ist die letzte Verschmelzung."
				: `Zuletzt verschmolzen bei Abstand ${nf(merges[m - 1].h, 3)} (gelb). ${link === "single" ? "Single Linkage verbindet schon über den kürzesten Einzelabstand, das gibt gern Ketten." : ""}`;
		// Dendrogramm
		const dc = q.ctx;
		const { w, h } = q.size;
		q.clear();
		const leafOrder = [];
		const kids = new Map(merges.map((s) => [s.id, [s.a, s.b]]));
		const dfs = (id) => (kids.has(id) ? kids.get(id).forEach(dfs) : leafOrder.push(id));
		dfs(merges[merges.length - 1].id);
		const xs = new Map();
		const ys = new Map();
		const Ly = (v) => h - 18 - (v / (maxH * 1.05)) * (h - 34);
		leafOrder.forEach((id, i) => {
			xs.set(id, 16 + ((i + 0.5) / leafOrder.length) * (w - 32));
			ys.set(id, 0);
		});
		merges.forEach((s, k) => {
			const xa = xs.get(s.a);
			const xb = xs.get(s.b);
			xs.set(s.id, (xa + xb) / 2);
			ys.set(s.id, s.h);
			const on = k < m;
			dc.strokeStyle = on ? (k === m - 1 ? "#ffc23d" : "rgba(244,239,230,0.8)") : "rgba(244,239,230,0.18)";
			dc.lineWidth = on ? 1.8 : 1;
			dc.beginPath();
			dc.moveTo(xa, Ly(ys.get(s.a)));
			dc.lineTo(xa, Ly(s.h));
			dc.lineTo(xb, Ly(s.h));
			dc.lineTo(xb, Ly(ys.get(s.b)));
			dc.stroke();
		});
		leafOrder.forEach((id) => {
			dc.beginPath();
			dc.arc(xs.get(id), Ly(0), 4, 0, Math.PI * 2);
			dc.fillStyle = color(id);
			dc.fill();
		});
		const cut = m < merges.length ? (m ? (merges[m - 1].h + merges[m].h) / 2 : merges[0].h / 2) : maxH * 1.03;
		ML.line(dc, 0, Ly(cut), w, Ly(cut), "#ff8a3d", 1.5, [6, 4]);
		ML.label(q, "Schnitt", w - 8, Ly(cut) - 6, { align: "right", color: "#ff8a3d", size: 11 });
	};
	ML.chips($("l10"), (v) => {
		link = v;
		build();
		draw();
	});
	$("st10").addEventListener("click", () => {
		m = m >= merges.length ? 0 : m + 1;
		hS.set(m ? Math.min(1, (merges[m - 1].h + (m < merges.length ? merges[m].h : merges[m - 1].h * 1.02)) / 2 / (maxH * 1.05)) : 0);
		draw();
	});
	$("new10").addEventListener("click", () => {
		seed++;
		gen();
		build();
		m = 0;
		hS.set(0);
		draw();
	});
	p.draw = q.draw = () => merges.length && draw();
	gen();
	build();
	draw();
})();
