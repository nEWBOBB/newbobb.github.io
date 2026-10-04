// Neuronales Netz von null an: ein Neuron, ein trainierbares Netz, versteckte Merkmale, Backpropagation zum Durchklicken.

(() => {
	const { fmt, rng, gauss, plot } = window.ML;
	const $ = (id) => document.getElementById(id);
	const BG = [7, 8, 6];
	const ORANGE = [255, 138, 92];
	const BLUE = [92, 200, 255];
	const C0 = "#ff8a5c";
	const C1 = "#5cc8ff";
	const sigmoid = (z) => 1 / (1 + Math.exp(-z));
	let ready = false;

	// ---------- Datensätze in [-5, 5]², Klasse 0 = orange, 1 = blau ----------
	function makeData(kind, seed = 5, n = 240) {
		const r = rng(seed);
		const u = () => r() * 10 - 5;
		const out = [];
		const push = (x, y, c) => out.push({ x: Math.max(-4.9, Math.min(4.9, x)), y: Math.max(-4.9, Math.min(4.9, y)), c });
		for (let i = 0; i < n; i++) {
			const c = i % 2;
			if (kind === "circle") {
				const rad = c ? r() * 2 : 3 + r() * 1.8;
				const a = r() * Math.PI * 2;
				push(Math.cos(a) * rad + gauss(r) * 0.2, Math.sin(a) * rad + gauss(r) * 0.2, c);
			} else if (kind === "xor") {
				let x = u();
				let y = u();
				x += Math.sign(x) * 0.3;
				y += Math.sign(y) * 0.3;
				push(x, y, x * y > 0 ? 1 : 0);
			} else if (kind === "moons") {
				const t = r() * Math.PI;
				if (c) push(Math.cos(t) * 3 - 1.5 + gauss(r) * 0.3, Math.sin(t) * 3 - 0.8 + gauss(r) * 0.3, 1);
				else push(1.5 - Math.cos(t) * 3 + gauss(r) * 0.3, 0.8 - Math.sin(t) * 3 + gauss(r) * 0.3, 0);
			} else if (kind === "spiral") {
				const t = r();
				const rad = 0.3 + t * 4.4;
				const a = t * 1.6 * Math.PI * 2 + c * Math.PI;
				push(Math.cos(a) * rad + gauss(r) * 0.18, Math.sin(a) * rad + gauss(r) * 0.18, c);
			} else if (kind === "blobs") {
				push((c ? -1.8 : 1.8) + gauss(r) * 1.1, (c ? 1.2 : -1.2) + gauss(r) * 1.1, c);
			} else {
				const x = u();
				const y = u();
				push(x, y, x * 0.8 + y + gauss(r) * 0.8 > 0 ? 1 : 0);
			}
		}
		return out;
	}

	function colorFor(p, strength = 0.6) {
		const col = p > 0.5 ? BLUE : ORANGE;
		const a = Math.min(1, Math.abs(p - 0.5) * 2) * strength;
		return [BG[0] + (col[0] - BG[0]) * a, BG[1] + (col[1] - BG[1]) * a, BG[2] + (col[2] - BG[2]) * a];
	}
	function drawPoints(P, data) {
		for (const d of data) P.dot(d.x, d.y, 4, d.c ? C1 : C0, "rgba(7,8,6,0.9)");
	}

	// ---------- Kapitel 1: ein Neuron ----------
	const pN = plot($("cvNeuron"), { aspect: (w) => (w < 520 ? 1 : 1.25), x: [-5, 5], y: [-5, 5], pad: 0, onResize: () => ready && drawNeuron() });
	const isoN = () => {
		const k = pN.size.w / pN.size.h;
		pN.x = [-5 * k, 5 * k];
	};
	isoN();
	const nImg = document.createElement("canvas");
	nImg.width = 80;
	nImg.height = 64;
	let nData = makeData("blobs", 2, 80);
	const neuron = { w1: 0.4, w2: -0.8, b: 0 };
	let learning = false;
	const sliders = { w1: $("w1In"), w2: $("w2In"), b: $("bIn") };

	function drawNeuron() {
		isoN();
		const g = nImg.getContext("2d");
		const img = g.createImageData(nImg.width, nImg.height);
		for (let j = 0; j < nImg.height; j++) {
			for (let i = 0; i < nImg.width; i++) {
				const x = pN.x[0] + ((i + 0.5) / nImg.width) * (pN.x[1] - pN.x[0]);
				const y = 5 - ((j + 0.5) / nImg.height) * 10;
				const [r, gg, b] = colorFor(sigmoid(neuron.w1 * x + neuron.w2 * y + neuron.b));
				const k = (j * nImg.width + i) * 4;
				img.data[k] = r;
				img.data[k + 1] = gg;
				img.data[k + 2] = b;
				img.data[k + 3] = 255;
			}
		}
		g.putImageData(img, 0, 0);
		const c = pN.ctx;
		c.imageSmoothingEnabled = true;
		c.drawImage(nImg, 0, 0, pN.size.w, pN.size.h);
		pN.grid(1);
		// Grenze z = 0
		const { w1, w2, b } = neuron;
		c.strokeStyle = "rgba(244,239,230,0.85)";
		c.lineWidth = 2;
		c.beginPath();
		if (Math.abs(w2) > 1e-6) {
			const X0 = pN.x[0];
			const X1 = pN.x[1];
			c.moveTo(pN.sx(X0), pN.sy(-(w1 * X0 + b) / w2));
			c.lineTo(pN.sx(X1), pN.sy(-(w1 * X1 + b) / w2));
		} else if (Math.abs(w1) > 1e-6) {
			c.moveTo(pN.sx(-b / w1), 0);
			c.lineTo(pN.sx(-b / w1), pN.size.h);
		}
		c.stroke();
		drawPoints(pN, nData);
		let ok = 0;
		for (const d of nData) if ((sigmoid(w1 * d.x + w2 * d.y + b) > 0.5 ? 1 : 0) === d.c) ok++;
		const acc = ok / nData.length;
		$("neuronReadout").textContent = `${fmt(acc * 100, 0)} % richtig`;
		$("w1Out").textContent = fmt(w1);
		$("w2Out").textContent = fmt(w2);
		$("bOut").textContent = fmt(b);
		const xor = $("btnNeuronXor").getAttribute("aria-pressed") === "true";
		$("neuronNote").textContent = xor
			? acc > 0.8
				? "Moment, das sollte unmöglich sein …"
				: "Egal wie du drehst: Eine Gerade schafft bei XOR nie viel mehr als drei Viertel. Dafür braucht es mehrere Neuronen."
			: acc === 1
				? "Perfekt getrennt. Die weiße Linie ist dort, wo z = 0 und das Neuron genau 50 % sagt."
				: "Die weiße Linie ist die Entscheidungsgrenze: Dort ist z = 0 und das Neuron unentschieden.";
	}

	function setNeuronSliders() {
		for (const k of ["w1", "w2", "b"]) {
			const s = sliders[k];
			s.value = neuron[k];
			s.style.setProperty("--fill", `${((s.value - s.min) / (s.max - s.min)) * 100}%`);
		}
	}
	for (const k of ["w1", "w2", "b"])
		sliders[k].addEventListener("input", () => {
			learning = false;
			neuron[k] = Number(sliders[k].value);
			drawNeuron();
		});

	$("btnNeuronLearn").addEventListener("click", () => {
		learning = !learning;
		$("btnNeuronLearn").textContent = learning ? "❚❚ Anhalten" : "Selbst lernen lassen";
		let steps = 0;
		const loop = () => {
			if (!learning) return;
			for (let s = 0; s < 4; s++) {
				let g1 = 0;
				let g2 = 0;
				let gb = 0;
				for (const d of nData) {
					const e = sigmoid(neuron.w1 * d.x + neuron.w2 * d.y + neuron.b) - d.c;
					g1 += (e * d.x) / nData.length;
					g2 += (e * d.y) / nData.length;
					gb += e / nData.length;
				}
				neuron.w1 = Math.max(-3, Math.min(3, neuron.w1 - 0.15 * g1));
				neuron.w2 = Math.max(-3, Math.min(3, neuron.w2 - 0.15 * g2));
				neuron.b = Math.max(-5, Math.min(5, neuron.b - 0.6 * gb));
			}
			setNeuronSliders();
			drawNeuron();
			if (++steps > 260) {
				learning = false;
				$("btnNeuronLearn").textContent = "Selbst lernen lassen";
				return;
			}
			requestAnimationFrame(loop);
		};
		requestAnimationFrame(loop);
	});
	function neuronData(kind) {
		learning = false;
		$("btnNeuronLearn").textContent = "Selbst lernen lassen";
		nData = kind === "xor" ? makeData("xor", 9, 80) : makeData("blobs", 2, 80);
		$("btnNeuronLinear").setAttribute("aria-pressed", String(kind !== "xor"));
		$("btnNeuronXor").setAttribute("aria-pressed", String(kind === "xor"));
		drawNeuron();
	}
	$("btnNeuronLinear").addEventListener("click", () => neuronData("linear"));
	$("btnNeuronXor").addEventListener("click", () => neuronData("xor"));

	// ---------- Kapitel 2: das Netz ----------
	const ACTS = {
		tanh: { f: Math.tanh, d: (a) => 1 - a * a, norm: (v) => v },
		relu: { f: (z) => (z > 0 ? z : 0), d: (a) => (a > 0 ? 1 : 0), norm: null },
		sigmoid: { f: sigmoid, d: (a) => a * (1 - a), norm: (v) => v * 2 - 1 },
	};
	const S = 5; // Eingaben werden durch 5 geteilt
	let dataset = "circle";
	let data = makeData(dataset);
	let net = null;
	let act = ACTS.tanh;
	let actName = "tanh";
	let epoch = 0;
	let lossHist = [];
	let training = false;
	let seed = 1;

	function makeNet(sizes) {
		const r = rng(seed);
		const W = [];
		const B = [];
		for (let l = 1; l < sizes.length; l++) {
			const s = Math.sqrt((actName === "relu" && l < sizes.length - 1 ? 2 : 1) / sizes[l - 1]) * 1.4;
			W.push(Array.from({ length: sizes[l] }, () => Array.from({ length: sizes[l - 1] }, () => (r() * 2 - 1) * s)));
			B.push(Array.from({ length: sizes[l] }, () => (actName === "relu" ? 0.1 : 0)));
		}
		return { sizes, W, B };
	}

	function forward(x) {
		const A = [x];
		const L = net.W.length;
		for (let l = 0; l < L; l++) {
			const Wl = net.W[l];
			const prev = A[l];
			const out = new Array(Wl.length);
			for (let j = 0; j < Wl.length; j++) {
				let z = net.B[l][j];
				const row = Wl[j];
				for (let i = 0; i < row.length; i++) z += row[i] * prev[i];
				out[j] = l === L - 1 ? sigmoid(z) : act.f(z);
			}
			A.push(out);
		}
		return A;
	}

	// Eine Epoche Mini-Batch-Gradientenabstieg mit Backpropagation
	function trainEpoch(lr) {
		const order = data.map((_, i) => i);
		for (let i = order.length - 1; i > 0; i--) {
			const j = (Math.random() * (i + 1)) | 0;
			[order[i], order[j]] = [order[j], order[i]];
		}
		const L = net.W.length;
		const BS = 10;
		for (let s = 0; s < order.length; s += BS) {
			const gW = net.W.map((Wl) => Wl.map((row) => row.map(() => 0)));
			const gB = net.B.map((bl) => bl.map(() => 0));
			const batch = order.slice(s, s + BS);
			for (const idx of batch) {
				const d = data[idx];
				const A = forward([d.x / S, d.y / S]);
				let delta = [A[L][0] - d.c];
				for (let l = L - 1; l >= 0; l--) {
					const Wl = net.W[l];
					const a = A[l];
					for (let j = 0; j < delta.length; j++) {
						gB[l][j] += delta[j];
						for (let i = 0; i < a.length; i++) gW[l][j][i] += delta[j] * a[i];
					}
					if (l > 0) {
						const prev = new Array(a.length);
						for (let i = 0; i < a.length; i++) {
							let sum = 0;
							for (let j = 0; j < delta.length; j++) sum += delta[j] * Wl[j][i];
							prev[i] = sum * act.d(a[i]);
						}
						delta = prev;
					}
				}
			}
			const k = lr / batch.length;
			for (let l = 0; l < L; l++)
				for (let j = 0; j < net.W[l].length; j++) {
					net.B[l][j] -= k * gB[l][j];
					for (let i = 0; i < net.W[l][j].length; i++) net.W[l][j][i] -= k * gW[l][j][i];
				}
		}
		epoch++;
		const { loss } = evaluate();
		lossHist.push(loss);
		if (lossHist.length > 1500) lossHist = lossHist.filter((_, i) => i % 2 === 0);
	}

	function evaluate() {
		let loss = 0;
		let ok = 0;
		for (const d of data) {
			const A = forward([d.x / S, d.y / S]);
			const p = Math.min(1 - 1e-7, Math.max(1e-7, A[A.length - 1][0]));
			loss -= d.c ? Math.log(p) : Math.log(1 - p);
			if ((p > 0.5 ? 1 : 0) === d.c) ok++;
		}
		return { loss: loss / data.length, acc: ok / data.length };
	}

	// Raster mit allen Aktivierungen: für Fläche, Netzbild und Merkmalskarten
	const G = 40;
	let grid = null;
	function computeGrid() {
		grid = [];
		for (let j = 0; j < G; j++)
			for (let i = 0; i < G; i++) {
				const x = -5 + ((i + 0.5) / G) * 10;
				const y = 5 - ((j + 0.5) / G) * 10;
				grid.push(forward([x / S, y / S]));
			}
	}
	// Karte eines Neurons als Bild
	function nodeImage(l, n, canvas) {
		canvas.width = G;
		canvas.height = G;
		const g = canvas.getContext("2d");
		const img = g.createImageData(G, G);
		const last = l === net.W.length;
		let max = 1e-6;
		if (!last && l > 0 && !act.norm) for (const A of grid) max = Math.max(max, A[l][n]);
		for (let k = 0; k < grid.length; k++) {
			const v = grid[k][l][n];
			let p;
			if (last) p = v;
			else if (l === 0) p = 0.5 + v / 2;
			else p = act.norm ? 0.5 + act.norm(v) / 2 : 0.5 + v / max / 2;
			const [r, gg, b] = colorFor(p, last ? 0.6 : 0.85);
			img.data[k * 4] = r;
			img.data[k * 4 + 1] = gg;
			img.data[k * 4 + 2] = b;
			img.data[k * 4 + 3] = 255;
		}
		g.putImageData(img, 0, 0);
		return canvas;
	}

	const pNet = plot($("cvNet"), { aspect: 1, x: [-5, 5], y: [-5, 5], pad: 0, onResize: () => ready && drawNet() });
	const dia = window.fitCanvas($("cvDiagram"), 1, () => ready && drawNet());
	const lossC = window.fitCanvas($("cvNetLoss"), (w) => (w < 520 ? 3 : 6), () => ready && drawNet());
	const feat = window.fitCanvas($("cvFeatures"), (w) => (w < 520 ? 0.9 : 1.1), () => ready && drawNet());
	const scratch = [];
	const scratchCanvas = (k) => scratch[k] || (scratch[k] = document.createElement("canvas"));

	function drawNet() {
		computeGrid();
		const L = net.W.length;
		// Fläche
		const c = pNet.ctx;
		c.imageSmoothingEnabled = true;
		c.drawImage(nodeImage(L, 0, scratchCanvas(0)), 0, 0, pNet.size.w, pNet.size.h);
		pNet.grid(1);
		drawPoints(pNet, data);

		// Netzbild
		const d = dia.ctx;
		const { w, h } = dia.size;
		d.fillStyle = "#070806";
		d.fillRect(0, 0, w, h);
		const sizes = net.sizes;
		const cols = sizes.length;
		const maxN = Math.max(...sizes);
		const box = Math.min(46, (h - 40) / maxN - 8, (w - 40) / cols - 30);
		const colX = (l) => 26 + box / 2 + (l / (cols - 1)) * (w - 52 - box);
		const rowY = (l, n) => h / 2 + (n - (sizes[l] - 1) / 2) * (box + 8);
		for (let l = 0; l < L; l++)
			for (let j = 0; j < sizes[l + 1]; j++)
				for (let i = 0; i < sizes[l]; i++) {
					const wt = net.W[l][j][i];
					const a = Math.min(1, Math.abs(wt) / 2.5);
					d.strokeStyle = wt > 0 ? `rgba(92,200,255,${0.15 + a * 0.75})` : `rgba(255,138,92,${0.15 + a * 0.75})`;
					d.lineWidth = 0.5 + a * 3.5;
					d.beginPath();
					d.moveTo(colX(l) + box / 2, rowY(l, i));
					d.lineTo(colX(l + 1) - box / 2, rowY(l + 1, j));
					d.stroke();
				}
		d.imageSmoothingEnabled = true;
		let k = 1;
		for (let l = 0; l < cols; l++)
			for (let n = 0; n < sizes[l]; n++) {
				const x = colX(l) - box / 2;
				const y = rowY(l, n) - box / 2;
				d.drawImage(nodeImage(l, n, scratchCanvas(k++)), x, y, box, box);
				d.strokeStyle = "rgba(255,255,255,0.35)";
				d.lineWidth = 1;
				d.strokeRect(x + 0.5, y + 0.5, box - 1, box - 1);
			}
		d.fillStyle = "rgba(244,239,230,0.5)";
		d.font = "11px Space Grotesk, sans-serif";
		d.textAlign = "center";
		d.fillText("x₁", colX(0), rowY(0, 0) - box / 2 - 6);
		d.fillText("x₂", colX(0), rowY(0, 1) + box / 2 + 14);
		d.fillText("Ausgabe", colX(cols - 1), rowY(cols - 1, 0) + box / 2 + 14);

		// Fehlerkurve
		const lc = lossC.ctx;
		const LW = lossC.size.w;
		const LH = lossC.size.h;
		lc.fillStyle = "#070806";
		lc.fillRect(0, 0, LW, LH);
		if (lossHist.length > 1) {
			const top = Math.max(0.75, ...lossHist);
			lc.strokeStyle = "#9be564";
			lc.lineWidth = 2;
			lc.beginPath();
			lossHist.forEach((v, i) => {
				const x = 6 + (i / (lossHist.length - 1)) * (LW - 12);
				const y = 8 + (1 - v / top) * (LH - 16);
				if (i === 0) lc.moveTo(x, y);
				else lc.lineTo(x, y);
			});
			lc.stroke();
		}

		// Merkmalskarten
		const f = feat.ctx;
		const FW = feat.size.w;
		const FH = feat.size.h;
		f.fillStyle = "#070806";
		f.fillRect(0, 0, FW, FH);
		const hidden = sizes.slice(1, -1);
		const rows = hidden.length;
		const per = Math.max(...hidden);
		const cell = Math.min((FW - 24) / per - 8, (FH - 50) / rows - 26);
		const top = Math.max(30, (FH - rows * (cell + 26)) / 2);
		f.font = "11px Space Grotesk, sans-serif";
		f.textAlign = "left";
		hidden.forEach((cnt, r) => {
			const y = top + r * (cell + 26);
			f.fillStyle = "rgba(244,239,230,0.45)";
			f.fillText(`Schicht ${r + 1}`, 12, y + 10);
			for (let n = 0; n < cnt; n++) {
				const x = 12 + n * (cell + 8);
				f.drawImage(nodeImage(r + 1, n, scratchCanvas(k++)), x, y + 16, cell, cell);
				f.strokeStyle = "rgba(255,255,255,0.25)";
				f.strokeRect(x + 0.5, y + 16.5, cell - 1, cell - 1);
			}
		});

		const { loss, acc } = evaluate();
		$("nEpoch").textContent = epoch.toLocaleString("de-DE");
		$("nLoss").textContent = fmt(loss, 3);
		$("nAcc").textContent = `${fmt(acc * 100, 0)} %`;
		$("nAcc").className = acc > 0.97 ? "good" : "";
		$("netReadout").textContent = `${fmt(acc * 100, 0)} % richtig`;
		const params = net.W.reduce((s, Wl, l) => s + Wl.length * Wl[0].length + net.B[l].length, 0);
		$("nParams").textContent = params;
		$("netNote").textContent =
			acc > 0.98
				? `Gelernt nach ${epoch} Epochen. Alle ${params} Zahlen im Netz wurden nur durch Backpropagation eingestellt.`
				: epoch > 600 && acc < 0.9
					? "Kommt nicht weiter? Mehr Neuronen oder Schichten geben dem Netz mehr Möglichkeiten. Oder neu würfeln: Jeder Start ist anders."
					: training
						? "Training läuft …"
						: "Eine Epoche heißt: Das Netz hat jeden Trainingspunkt einmal gesehen.";
		$("btnTrain").textContent = training ? "❚❚ Anhalten" : "▶ Trainieren";
	}

	const layIn = $("layIn");
	const neuIn = $("neuIn");
	const nlrIn = $("nlrIn");
	const lrOf = () => 0.001 * Math.pow(10, (Number(nlrIn.value) / 100) * 3);
	function rebuild() {
		const hidden = Array(Number(layIn.value)).fill(Number(neuIn.value));
		net = makeNet([2, ...hidden, 1]);
		epoch = 0;
		lossHist = [evaluate().loss];
		$("layOut").textContent = layIn.value;
		$("neuOut").textContent = neuIn.value;
		$("nlrOut").textContent = fmt(lrOf(), 3);
		drawNet();
	}
	layIn.addEventListener("input", rebuild);
	neuIn.addEventListener("input", rebuild);
	nlrIn.addEventListener("input", () => ($("nlrOut").textContent = fmt(lrOf(), 3)));
	$("actIn").addEventListener("change", (e) => {
		actName = e.target.value;
		act = ACTS[actName];
		rebuild();
	});
	document.querySelectorAll("[data-set]").forEach((b) =>
		b.addEventListener("click", () => {
			dataset = b.dataset.set;
			document.querySelectorAll("[data-set]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
			data = makeData(dataset);
			rebuild();
		})
	);
	$("btnNetReset").addEventListener("click", () => {
		seed = (Math.random() * 1e9) | 0;
		rebuild();
	});
	$("btnEpoch").addEventListener("click", () => {
		training = false;
		trainEpoch(lrOf());
		drawNet();
	});
	$("btnTrain").addEventListener("click", () => {
		training = !training;
		drawNet();
		const loop = () => {
			if (!training) return;
			const t0 = performance.now();
			let n = 0;
			while (performance.now() - t0 < 10 && n < 8) {
				trainEpoch(lrOf());
				n++;
			}
			drawNet();
			if (epoch > 5000) training = false;
			requestAnimationFrame(loop);
		};
		requestAnimationFrame(loop);
	});

	// ---------- Kapitel 4: Backpropagation zum Durchklicken ----------
	const svg = $("bpSvg");
	const X = [1, 0];
	const Y = 1;
	const LR = 1;
	let bp;
	function bpReset() {
		bp = {
			W1: [[0.5, -0.4], [0.3, 0.8]],
			b1: [0, 0],
			W2: [-0.6, 0.4],
			b2: 0,
			phase: 0, // 0 bereit, 1 vorwärts gerechnet, 2 rückwärts gerechnet
			round: 0,
		};
		bpRender();
	}
	function bpForward() {
		bp.z1 = bp.W1.map((row, j) => row[0] * X[0] + row[1] * X[1] + bp.b1[j]);
		bp.h = bp.z1.map(sigmoid);
		bp.out = sigmoid(bp.W2[0] * bp.h[0] + bp.W2[1] * bp.h[1] + bp.b2);
		bp.loss = -(Y * Math.log(bp.out) + (1 - Y) * Math.log(1 - bp.out));
	}
	function bpBackward() {
		bp.dOut = bp.out - Y;
		bp.gW2 = bp.h.map((h) => bp.dOut * h);
		bp.dH = bp.h.map((h, j) => bp.dOut * bp.W2[j] * h * (1 - h));
		bp.gW1 = bp.dH.map((d) => X.map((x) => d * x));
	}
	function bpUpdate() {
		bp.W2 = bp.W2.map((w, j) => w - LR * bp.gW2[j]);
		bp.b2 -= LR * bp.dOut;
		bp.W1 = bp.W1.map((row, j) => row.map((w, i) => w - LR * bp.gW1[j][i]));
		bp.b1 = bp.b1.map((b, j) => b - LR * bp.dH[j]);
		bp.round++;
	}
	function bpAdvance() {
		if (bp.phase === 0) {
			bpForward();
			bp.phase = 1;
		} else if (bp.phase === 1) {
			bpBackward();
			bp.phase = 2;
		} else {
			bpUpdate();
			bpForward();
			bp.phase = 1;
		}
	}
	function bpRender() {
		const N = (v) => fmt(Math.abs(v) < 0.005 ? 0 : v, 2);
		const inp = [[70, 90], [70, 230]];
		const hid = [[260, 90], [260, 230]];
		const out = [450, 160];
		const showF = bp.phase >= 1;
		const showB = bp.phase === 2;
		let s = "";
		const edge = (a, b, w, g, t = 0.42) => {
			const mx = a[0] + (b[0] - a[0]) * t;
			const my = a[1] + (b[1] - a[1]) * t;
			const col = w > 0 ? "#5cc8ff" : "#ff8a5c";
			s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${col}" stroke-opacity="0.6" stroke-width="${1 + Math.min(4, Math.abs(w) * 3)}"/>`;
			s += `<rect x="${mx - 30}" y="${my - 12}" width="60" height="${showB ? 36 : 20}" rx="6" fill="#070806" stroke="rgba(255,255,255,0.12)"/>`;
			s += `<text x="${mx}" y="${my + 2}" fill="#f4efe6" font-size="12" text-anchor="middle">w ${N(w)}</text>`;
			if (showB) s += `<text x="${mx}" y="${my + 18}" fill="#ff8a7a" font-size="11" text-anchor="middle">∂ ${N(g)}</text>`;
		};
		for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) edge(inp[i], hid[j], bp.W1[j][i], showB ? bp.gW1[j][i] : 0, i === j ? 0.55 : 0.3);
		for (let j = 0; j < 2; j++) edge(hid[j], out, bp.W2[j], showB ? bp.gW2[j] : 0);
		const node = (p, label, val, delta) => {
			s += `<circle cx="${p[0]}" cy="${p[1]}" r="30" fill="#141210" stroke="#9be564" stroke-width="2"/>`;
			s += `<text x="${p[0]}" y="${p[1] - 36}" fill="rgba(244,239,230,0.55)" font-size="11" text-anchor="middle">${label}</text>`;
			s += `<text x="${p[0]}" y="${p[1] + 5}" fill="#f4efe6" font-size="14" text-anchor="middle">${val}</text>`;
			if (delta !== undefined) s += `<text x="${p[0]}" y="${p[1] + 50}" fill="#ff8a7a" font-size="11" text-anchor="middle">δ ${N(delta)}</text>`;
		};
		node(inp[0], "x₁", X[0]);
		node(inp[1], "x₂", X[1]);
		hid.forEach((p, j) => node(p, `h${j + 1}`, showF ? N(bp.h[j]) : "?", showB ? bp.dH[j] : undefined));
		node(out, "Ausgabe", showF ? N(bp.out) : "?", showB ? bp.dOut : undefined);
		s += `<text x="${out[0]}" y="${out[1] + 80}" fill="rgba(244,239,230,0.55)" font-size="11" text-anchor="middle">Ziel: ${Y}</text>`;
		svg.innerHTML = s;
		$("bpRound").textContent = bp.round;
		$("bpOut").textContent = showF ? N(bp.out) : "–";
		$("bpLoss").textContent = showF ? fmt(bp.loss, 3) : "–";
		const phases = [
			["", "Drück „Vorwärts“: Die Eingabe (1, 0) läuft durchs Netz."],
			["VORWÄRTS ·", `Das Netz sagt ${N(bp.out)}, richtig wäre 1. Jetzt rückwärts: Wer ist schuld?`],
			["RÜCKWÄRTS ·", "Rot steht der Gradient jedes Gewichts. Er ist das Produkt aus Fehler des Ziel-Neurons (δ) und dem Eingangswert. Bei x₂ = 0 ist er null: Dieses Gewicht hatte keinen Einfluss."],
		];
		$("bpPhase").textContent = phases[bp.phase][0];
		$("bpNote").textContent = phases[bp.phase][1];
		$("btnBp").textContent = ["Vorwärts", "Rückwärts", "Anpassen + vorwärts"][bp.phase];
	}
	$("btnBp").addEventListener("click", () => {
		bpAdvance();
		bpRender();
	});
	$("btnBpFast").addEventListener("click", () => {
		if (bp.phase === 0) bpForward();
		for (let i = 0; i < 10; i++) {
			bpBackward();
			bpUpdate();
			bpForward();
		}
		bp.phase = 1;
		bpRender();
	});
	$("btnBpReset").addEventListener("click", bpReset);

	ready = true;
	setNeuronSliders();
	drawNeuron();
	rebuild();
	bpReset();
})();
