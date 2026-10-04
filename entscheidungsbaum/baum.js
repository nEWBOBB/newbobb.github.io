// Entscheidungsbaum von null an: Gini, bester Schnitt, rekursiver Aufbau (CART) und Überanpassung.

(() => {
	const { fmt, rng, gauss, plot, editPoints, scheduler } = window.ML;
	const $ = (id) => document.getElementById(id);
	const COL = ["#ff8a5c", "#5cc8ff", "#9be564"];
	const RGB = [[255, 138, 92], [92, 200, 255], [155, 229, 100]];
	const ACC = "#9be564";
	const F = ["x", "y"];
	let ready = false;

	// ---------- CART ----------
	function counts(points, k = 3) {
		const c = new Array(k).fill(0);
		for (const p of points) c[p.c]++;
		return c;
	}
	const giniOf = (c, n) => (n ? 1 - c.reduce((s, v) => s + (v / n) ** 2, 0) : 0);
	const argmax = (c) => c.reduce((b, v, i) => (v > c[b] ? i : b), 0);

	// Schneller bester Schnitt: pro Achse sortieren und Zählungen mitschieben
	function bestSplit(points) {
		const n = points.length;
		let best = null;
		for (const f of F) {
			const sorted = [...points].sort((a, b) => a[f] - b[f]);
			const L = [0, 0, 0];
			const R = counts(points);
			for (let i = 0; i < n - 1; i++) {
				L[sorted[i].c]++;
				R[sorted[i].c]--;
				if (sorted[i][f] === sorted[i + 1][f]) continue;
				const nl = i + 1;
				const score = (nl * giniOf(L, nl) + (n - nl) * giniOf(R, n - nl)) / n;
				if (!best || score < best.score - 1e-12) best = { f, thr: (sorted[i][f] + sorted[i + 1][f]) / 2, score };
			}
		}
		return best;
	}

	function grow(points, depth, maxDepth) {
		const c = counts(points);
		const node = { counts: c, n: points.length, pred: argmax(c), depth, gini: giniOf(c, points.length) };
		if (depth >= maxDepth || node.gini === 0 || points.length < 2) return node;
		const s = bestSplit(points);
		if (!s || s.score >= node.gini - 1e-12) return node;
		node.f = s.f;
		node.thr = s.thr;
		node.left = grow(points.filter((p) => p[s.f] <= s.thr), depth + 1, maxDepth);
		node.right = grow(points.filter((p) => p[s.f] > s.thr), depth + 1, maxDepth);
		return node;
	}
	const isLeaf = (n) => !n.left;
	function leafFor(node, p) {
		while (!isLeaf(node)) node = p[node.f] <= node.thr ? node.left : node.right;
		return node;
	}
	const accuracy = (tree, pts) => (pts.length ? pts.filter((p) => leafFor(tree, p).pred === p.c).length / pts.length : 0);

	// Rechtecke der Blätter einfärben und Schnittlinien zeichnen
	function drawPartition(P, node, b = [P.x[0], P.x[1], P.y[0], P.y[1]], hot = null, alpha = 0.2) {
		const c = P.ctx;
		if (isLeaf(node)) {
			const [r, g, bl] = RGB[node.pred];
			const a = node === hot ? alpha + 0.2 : alpha * (node.n ? 0.4 + 0.6 * (1 - node.gini) : 0.3);
			c.fillStyle = `rgba(${r},${g},${bl},${a})`;
			c.fillRect(P.sx(b[0]), P.sy(b[3]), P.sx(b[1]) - P.sx(b[0]), P.sy(b[2]) - P.sy(b[3]));
			return;
		}
		if (node.f === "x") {
			drawPartition(P, node.left, [b[0], node.thr, b[2], b[3]], hot, alpha);
			drawPartition(P, node.right, [node.thr, b[1], b[2], b[3]], hot, alpha);
		} else {
			drawPartition(P, node.left, [b[0], b[1], b[2], node.thr], hot, alpha);
			drawPartition(P, node.right, [b[0], b[1], node.thr, b[3]], hot, alpha);
		}
		c.strokeStyle = "rgba(244,239,230,0.55)";
		c.lineWidth = Math.max(1, 2.4 - node.depth * 0.35);
		c.beginPath();
		if (node.f === "x") {
			c.moveTo(P.sx(node.thr), P.sy(b[2]));
			c.lineTo(P.sx(node.thr), P.sy(b[3]));
		} else {
			c.moveTo(P.sx(b[0]), P.sy(node.thr));
			c.lineTo(P.sx(b[1]), P.sy(node.thr));
		}
		c.stroke();
	}

	const clamp = (v) => Math.max(0.2, Math.min(9.8, v));

	// ---------- Kapitel 1: ein Schnitt ----------
	let sPts = [];
	function splitData(seed) {
		const r = rng(seed);
		const cx = 3.5 + r() * 3;
		sPts = Array.from({ length: 44 }, (_, i) => {
			const c = i % 2;
			return { x: clamp((c ? cx + 2 : cx - 2) + gauss(r) * 1.3), y: clamp(5 + gauss(r) * 2.3 + (c ? 0.8 : -0.8)), c };
		});
	}
	splitData(4);
	const pSplit = plot($("cvSplit"), { aspect: (w) => (w < 520 ? 1.1 : 1.35), x: [0, 10], y: [0, 10], onResize: () => ready && drawSplit() });
	const giniC = window.fitCanvas($("cvGini"), (w) => (w < 520 ? 3 : 4.2), () => ready && drawSplit());
	let axis = 0;
	const thrIn = $("thrIn");

	function splitScore(f, thr) {
		const L = sPts.filter((p) => p[f] <= thr);
		const R = sPts.filter((p) => p[f] > thr);
		const gl = giniOf(counts(L), L.length);
		const gr = giniOf(counts(R), R.length);
		return { L, R, gl, gr, w: (L.length * gl + R.length * gr) / (sPts.length || 1) };
	}

	function drawSplit() {
		const P = pSplit;
		const c = P.ctx;
		const f = F[axis];
		const thr = Number(thrIn.value);
		const s = splitScore(f, thr);
		P.clear();
		const tint = (pts, x0, x1, y0, y1) => {
			if (!pts.length) return;
			const cc = counts(pts);
			const [r, g, b] = RGB[argmax(cc)];
			c.fillStyle = `rgba(${r},${g},${b},${0.08 + 0.2 * (1 - giniOf(cc, pts.length) * 2)})`;
			c.fillRect(P.sx(x0), P.sy(y1), P.sx(x1) - P.sx(x0), P.sy(y0) - P.sy(y1));
		};
		if (axis === 0) {
			tint(s.L, 0, thr, 0, 10);
			tint(s.R, thr, 10, 0, 10);
		} else {
			tint(s.L, 0, 10, 0, thr);
			tint(s.R, 0, 10, thr, 10);
		}
		P.grid(1);
		c.strokeStyle = "#f4efe6";
		c.lineWidth = 2.5;
		c.setLineDash([8, 6]);
		c.beginPath();
		if (axis === 0) {
			c.moveTo(P.sx(thr), P.sy(0));
			c.lineTo(P.sx(thr), P.sy(10));
		} else {
			c.moveTo(P.sx(0), P.sy(thr));
			c.lineTo(P.sx(10), P.sy(thr));
		}
		c.stroke();
		c.setLineDash([]);
		for (const p of sPts) P.dot(p.x, p.y, 5, COL[p.c]);

		// Kurve der gewichteten Unreinheit
		const g = giniC.ctx;
		const { w, h } = giniC.size;
		g.fillStyle = "#070806";
		g.fillRect(0, 0, w, h);
		const N = 200;
		const vals = [];
		let minV = Infinity;
		let minT = 0;
		for (let i = 0; i <= N; i++) {
			const t = (i / N) * 10;
			const v = splitScore(f, t).w;
			vals.push(v);
			if (v < minV - 1e-9) {
				minV = v;
				minT = t;
			}
		}
		const X = (t) => P.sx(t) * (w / P.size.w);
		const Y = (v) => h - 10 - (v / 0.55) * (h - 20);
		g.strokeStyle = "rgba(255,255,255,0.12)";
		g.beginPath();
		g.moveTo(0, Y(0.5));
		g.lineTo(w, Y(0.5));
		g.stroke();
		g.fillStyle = "rgba(244,239,230,0.4)";
		g.font = "11px Space Grotesk, sans-serif";
		g.fillText("0,5", 6, Y(0.5) - 4);
		g.strokeStyle = ACC;
		g.lineWidth = 2;
		g.beginPath();
		vals.forEach((v, i) => {
			const x = X((i / N) * 10);
			if (i === 0) g.moveTo(x, Y(v));
			else g.lineTo(x, Y(v));
		});
		g.stroke();
		g.fillStyle = "#f4efe6";
		g.beginPath();
		g.arc(X(thr), Y(s.w), 5, 0, Math.PI * 2);
		g.fill();
		g.fillStyle = "rgba(244,239,230,0.6)";
		g.fillText("▲ Minimum", Math.min(w - 70, Math.max(4, X(minT) - 8)), Y(minV) + 16 > h ? Y(minV) - 8 : Y(minV) + 16);

		const label = axis === 0 ? ["links", "rechts"] : ["unten", "oben"];
		$("splitQ").textContent = `Ist ${f} ≤ ${fmt(thr, 2)}?`;
		$("thrOut").textContent = `${s.L.length} ja · ${s.R.length} nein`;
		$("gL").textContent = fmt(s.gl, 3);
		$("gR").textContent = fmt(s.gr, 3);
		$("gW").textContent = fmt(s.w, 3);
		$("splitReadout").textContent = `Unreinheit ${fmt(s.w, 3)}`;
		const best = bestSplit(sPts);
		$("splitNote").textContent = !best
			? "Zu wenige Punkte."
			: s.w <= best.score + 0.002
				? `Bester Schnitt gefunden: ${label[0]} ${s.L.length} Punkte, ${label[1]} ${s.R.length} Punkte, gewichtete Unreinheit ${fmt(s.w, 3)}.`
				: `Der beste Schnitt überhaupt liegt bei ${fmt(best.score, 3)}${best.f !== f ? `, und zwar auf der ${best.f}-Achse` : ""}.`;
	}

	function setThr(v) {
		thrIn.value = v;
		thrIn.style.setProperty("--fill", `${(v / 10) * 100}%`);
		drawSplit();
	}
	thrIn.addEventListener("input", drawSplit);
	document.querySelectorAll("[data-axis]").forEach((b) =>
		b.addEventListener("click", () => {
			axis = Number(b.dataset.axis);
			document.querySelectorAll("[data-axis]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
			drawSplit();
		})
	);
	$("btnBest").addEventListener("click", () => {
		const best = bestSplit(sPts);
		if (!best) return;
		axis = F.indexOf(best.f);
		document.querySelectorAll("[data-axis]").forEach((x) => x.setAttribute("aria-pressed", String(Number(x.dataset.axis) === axis)));
		setThr(best.thr);
	});
	$("btnSplitNew").addEventListener("click", () => {
		splitData((Math.random() * 1e9) | 0);
		drawSplit();
	});

	// ---------- Kapitel 2: ganzer Baum ----------
	let tPts = [];
	function treeData(seed) {
		const r = rng(seed);
		const centers = [[2.6, 7], [7.2, 7.4], [5, 2.6]];
		const sh = centers.map(([x, y]) => [x + (r() - 0.5) * 2, y + (r() - 0.5) * 2]);
		tPts = Array.from({ length: 66 }, (_, i) => {
			const c = i % 3;
			return { x: clamp(sh[c][0] + gauss(r) * 1.25), y: clamp(sh[c][1] + gauss(r) * 1.25), c };
		});
	}
	treeData(8);
	const pTree = plot($("cvTree"), { aspect: 1, x: [0, 10], y: [0, 10], onResize: () => ready && drawTree() });
	const depthIn = $("depthIn");
	const svg = $("treeSvg");
	let tree = null;
	let hotLeaf = null;
	let curCls = 0;

	function rebuildTree() {
		tree = grow(tPts, 0, Number(depthIn.value));
		drawTree();
	}

	function pathTo(leaf) {
		const path = new Set();
		const walk = (n) => {
			if (n === leaf) {
				path.add(n);
				return true;
			}
			if (isLeaf(n)) return false;
			if (walk(n.left) || walk(n.right)) {
				path.add(n);
				return true;
			}
			return false;
		};
		if (leaf) walk(tree);
		return path;
	}

	function drawTree() {
		const P = pTree;
		P.clear();
		drawPartition(P, tree, undefined, hotLeaf, 0.22);
		for (const p of tPts) P.dot(p.x, p.y, 4.5, COL[p.c]);
		const acc = accuracy(tree, tPts);
		$("treeReadout").textContent = tPts.length ? `${fmt(acc * 100, 0)} % richtig` : "";
		$("depthOut").textContent = depthIn.value;

		// Baumdiagramm
		let leaves = 0;
		let maxD = 0;
		const place = (n) => {
			maxD = Math.max(maxD, n.depth);
			if (isLeaf(n)) {
				n._x = leaves++;
				return;
			}
			place(n.left);
			place(n.right);
			n._x = (n.left._x + n.right._x) / 2;
		};
		place(tree);
		const colW = 74;
		const rowH = 74;
		const W = Math.max(420, leaves * colW);
		const H = 40 + maxD * rowH + 50;
		const X = (n) => (W - leaves * colW) / 2 + (n._x + 0.5) * colW;
		const Y = (n) => 28 + n.depth * rowH;
		const path = pathTo(hotLeaf);
		let s = "";
		const edges = (n) => {
			if (isLeaf(n)) return;
			for (const [ch, lab] of [[n.left, "ja"], [n.right, "nein"]]) {
				const hot = path.has(ch);
				s += `<line x1="${X(n)}" y1="${Y(n) + 14}" x2="${X(ch)}" y2="${Y(ch) - 14}" stroke="${hot ? ACC : "rgba(255,255,255,0.25)"}" stroke-width="${hot ? 3 : 1.5}"/>`;
				s += `<text x="${(X(n) + X(ch)) / 2 + (lab === "ja" ? -10 : 10)}" y="${(Y(n) + Y(ch)) / 2}" fill="rgba(244,239,230,0.45)" font-size="10" text-anchor="middle">${lab}</text>`;
				edges(ch);
			}
		};
		const nodes = (n) => {
			const hot = path.has(n);
			if (isLeaf(n)) {
				s += `<circle cx="${X(n)}" cy="${Y(n)}" r="14" fill="${COL[n.pred]}" fill-opacity="${hot ? 1 : 0.75}" stroke="${hot ? "#fff" : "#070806"}" stroke-width="2"/>`;
				s += `<text x="${X(n)}" y="${Y(n) + 30}" fill="rgba(244,239,230,0.6)" font-size="10" text-anchor="middle">${n.counts.join("/")}</text>`;
				return;
			}
			const label = `${n.f} ≤ ${fmt(n.thr, 1)}`;
			s += `<rect x="${X(n) - 36}" y="${Y(n) - 14}" width="72" height="28" rx="8" fill="#141210" stroke="${hot ? ACC : "rgba(255,255,255,0.3)"}" stroke-width="${hot ? 2.5 : 1}"/>`;
			s += `<text x="${X(n)}" y="${Y(n) + 4}" fill="#f4efe6" font-size="11.5" text-anchor="middle">${label}</text>`;
			nodes(n.left);
			nodes(n.right);
		};
		edges(tree);
		nodes(tree);
		svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
		svg.innerHTML = s;
		svg.style.minWidth = `${Math.min(W, Math.max(420, leaves * 52))}px`;

		const nLeaves = leaves;
		$("treeNote").textContent = !tPts.length
			? "Setz ein paar Punkte."
			: depthIn.value === "0"
				? "Tiefe 0: keine einzige Frage. Der Baum rät für alles die häufigste Farbe."
				: `${nLeaves} Blätter, also ${nLeaves} Rechtecke. Unter jedem Blatt: Anzahl orange/blau/grün darin.`;
	}

	depthIn.addEventListener("input", () => {
		hotLeaf = null;
		rebuildTree();
	});
	document.querySelectorAll("[data-cls]").forEach((b) =>
		b.addEventListener("click", () => {
			curCls = Number(b.dataset.cls);
			document.querySelectorAll("[data-cls]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
		})
	);
	$("btnTreeNew").addEventListener("click", () => {
		treeData((Math.random() * 1e9) | 0);
		hotLeaf = null;
		rebuildTree();
	});
	$("btnTreeClear").addEventListener("click", () => {
		tPts = [];
		hotLeaf = null;
		rebuildTree();
	});
	const rebuildSoon = scheduler(rebuildTree);
	editPoints($("cvTree"), pTree, {
		points: () => tPts,
		make: (x, y) => ({ x, y, c: curCls }),
		onChange: () => {
			hotLeaf = null;
			rebuildSoon();
		},
	});
	$("cvTree").addEventListener("pointermove", (e) => {
		if (e.buttons || e.pointerType !== "mouse") return;
		const r = e.currentTarget.getBoundingClientRect();
		const leaf = leafFor(tree, { x: pTree.ix(e.clientX - r.left), y: pTree.iy(e.clientY - r.top) });
		if (leaf !== hotLeaf) {
			hotLeaf = leaf;
			drawTree();
		}
	});
	$("cvTree").addEventListener("pointerleave", () => {
		hotLeaf = null;
		drawTree();
	});

	// ---------- Kapitel 3: Überanpassung ----------
	let train = [];
	let test = [];
	let trees = [];
	let curve = [];
	const pOver = plot($("cvOver"), { aspect: (w) => (w < 520 ? 1.1 : 1.35), x: [0, 10], y: [0, 10], onResize: () => ready && drawOver() });
	const curveC = window.fitCanvas($("cvCurve"), (w) => (w < 520 ? 2.4 : 3.4), () => ready && drawOver());
	const odIn = $("odIn");
	const MAXD = 14;

	function overData(seed) {
		const r = rng(seed);
		const cx = 4 + r() * 2;
		const cy = 4 + r() * 2;
		const make = () => {
			const x = r() * 10;
			const y = r() * 10;
			// wahre Grenze: eine Ellipse, dazu 15 % falsch beschriftete Punkte
			let c = Math.hypot(x - cx, (y - cy) * 1.3) < 3 ? 1 : 0;
			if (r() < 0.15) c = 1 - c;
			return { x, y, c };
		};
		train = Array.from({ length: 200 }, make);
		test = Array.from({ length: 200 }, make);
		trees = [];
		curve = [];
		for (let d = 1; d <= MAXD; d++) {
			const t = grow(train, 0, d);
			trees.push(t);
			curve.push([accuracy(t, train), accuracy(t, test)]);
		}
	}
	overData(5);

	function drawOver() {
		const d = Number(odIn.value);
		const t = trees[d - 1];
		const P = pOver;
		P.clear();
		drawPartition(P, t, undefined, null, 0.26);
		const c = P.ctx;
		for (const p of test) {
			c.beginPath();
			c.arc(P.sx(p.x), P.sy(p.y), 3.5, 0, Math.PI * 2);
			c.strokeStyle = COL[p.c];
			c.lineWidth = 1.5;
			c.stroke();
		}
		for (const p of train) P.dot(p.x, p.y, 3.5, COL[p.c], "rgba(7,8,6,0.8)");
		const [atr, ate] = curve[d - 1];
		$("odOut").textContent = d;
		$("overReadout").textContent = `Training ${fmt(atr * 100, 0)} % · Test ${fmt(ate * 100, 0)} %`;

		// Kurve
		const g = curveC.ctx;
		const { w, h } = curveC.size;
		g.fillStyle = "#070806";
		g.fillRect(0, 0, w, h);
		const X = (i) => 34 + (i / (MAXD - 1)) * (w - 50);
		const Y = (v) => 28 + (1 - (v - 0.5) / 0.5) * (h - 48);
		g.font = "11px Space Grotesk, sans-serif";
		g.fillStyle = "rgba(244,239,230,0.4)";
		g.strokeStyle = "rgba(255,255,255,0.08)";
		for (const v of [0.5, 0.75, 1]) {
			g.beginPath();
			g.moveTo(34, Y(v));
			g.lineTo(w - 16, Y(v));
			g.stroke();
			g.fillText(`${v * 100}%`, 2, Y(v) + 4);
		}
		g.textAlign = "center";
		for (let i = 0; i < MAXD; i += 1) if (i % 2 === 0 || w > 500) g.fillText(String(i + 1), X(i), h - 4);
		g.textAlign = "left";
		g.strokeStyle = "rgba(255,255,255,0.35)";
		g.setLineDash([4, 4]);
		g.beginPath();
		g.moveTo(X(d - 1), 6);
		g.lineTo(X(d - 1), h - 18);
		g.stroke();
		g.setLineDash([]);
		[[0, ACC], [1, "#ffc777"]].forEach(([k, col]) => {
			g.strokeStyle = col;
			g.lineWidth = 2.2;
			g.beginPath();
			curve.forEach((v, i) => (i ? g.lineTo(X(i), Y(v[k])) : g.moveTo(X(i), Y(v[k]))));
			g.stroke();
			g.fillStyle = col;
			curve.forEach((v, i) => {
				g.beginPath();
				g.arc(X(i), Y(v[k]), i === d - 1 ? 5 : 2.5, 0, Math.PI * 2);
				g.fill();
			});
		});
		const bestD = curve.reduce((b, v, i) => (v[1] > curve[b][1] ? i : b), 0) + 1;
		$("overNote").textContent =
			d === bestD
				? `Tiefe ${d} ist hier am besten: ${fmt(ate * 100, 0)} % auf Daten, die der Baum nie gesehen hat.`
				: d > bestD
					? `Überangepasst: Das Training steigt auf ${fmt(atr * 100, 0)} %, der Test fällt auf ${fmt(ate * 100, 0)} %. Am besten war Tiefe ${bestD}.`
					: `Noch zu grob: Der Baum erkennt die Form nicht. Am besten wäre Tiefe ${bestD}.`;
	}
	odIn.addEventListener("input", drawOver);
	$("btnOverNew").addEventListener("click", () => {
		overData((Math.random() * 1e9) | 0);
		drawOver();
	});

	ready = true;
	setThr(2.5);
	rebuildTree();
	drawOver();
})();
