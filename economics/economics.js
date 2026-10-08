// Mikroökonomie: Angebot, Nachfrage, Gleichgewicht und Höchstpreis
(() => {
	const canvas = document.getElementById("marketCanvas");
	let ready = false;
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.05 : 1.45), () => ready && draw());
	const dem = document.getElementById("dem");
	const sup = document.getElementById("sup");
	const ceil = document.getElementById("ceil");
	const out = document.getElementById("marketOut");
	const note = document.getElementById("marketNote");
	const DEM = "#ffd166";
	const SUP = "#8fb8ff";
	// Preise intern 0…100 entsprechen 0…4 €; Mengen 0…100 entsprechen 0…1000 Kugeln am Tag
	const euro = (p) => `${(p / 25).toFixed(2).replace(".", ",")} €`;
	const kugeln = (q) => `${Math.round(q * 10)} Kugeln`;

	// Nachfrage: P = a − Q · Angebot: P = c + Q
	const model = () => {
		const a = Number(dem.value);
		const c = Number(sup.value);
		const q = Math.max(0, (a - c) / 2);
		const p = c + q;
		const cap = Number(ceil.value) > 100 ? null : Number(ceil.value);
		return { a, c, q, p, cap };
	};

	function draw() {
		const { w, h } = size;
		if (!w) return;
		const { a, c, q, p, cap } = model();
		const L = 46;
		const B = h - 34;
		const X = (qq) => L + (qq / 100) * (w - L - 16);
		const Y = (pp) => B - (pp / 110) * (B - 16);
		ctx.clearRect(0, 0, w, h);

		// Achsen
		ctx.strokeStyle = "rgba(255,255,255,0.3)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(L, 10);
		ctx.lineTo(L, B);
		ctx.lineTo(w - 8, B);
		ctx.stroke();
		ctx.fillStyle = "rgba(244,239,230,0.45)";
		ctx.font = "11px JetBrains Mono, monospace";
		ctx.textAlign = "right";
		for (let e = 0; e <= 4; e++) ctx.fillText(`${e} €`, L - 6, Y(e * 25) + 4);
		ctx.textAlign = "left";
		ctx.fillText("Menge →", w - 70, B + 22);

		// Renten als Flächen: Konsumenten oben, Produzenten unten
		const qSold = cap !== null && cap < p ? Math.max(0, cap - c) : q;
		const price = cap !== null && cap < p ? cap : p;
		ctx.fillStyle = "rgba(255,209,102,0.16)";
		ctx.beginPath();
		ctx.moveTo(X(0), Y(a));
		ctx.lineTo(X(qSold), Y(a - qSold));
		ctx.lineTo(X(qSold), Y(price));
		ctx.lineTo(X(0), Y(price));
		ctx.fill();
		ctx.fillStyle = "rgba(143,184,255,0.16)";
		ctx.beginPath();
		ctx.moveTo(X(0), Y(c));
		ctx.lineTo(X(qSold), Y(c + qSold));
		ctx.lineTo(X(qSold), Y(price));
		ctx.lineTo(X(0), Y(price));
		ctx.fill();

		// Kurven
		const line = (col, p0, slope, label) => {
			ctx.strokeStyle = col;
			ctx.lineWidth = 3;
			ctx.beginPath();
			let started = false;
			let lx = 0;
			let ly = 0;
			for (let qq = 0; qq <= 100; qq += 1) {
				const pp = p0 + slope * qq;
				if (pp < 0 || pp > 110) continue;
				started ? ctx.lineTo(X(qq), Y(pp)) : ctx.moveTo(X(qq), Y(pp));
				started = true;
				lx = X(qq);
				ly = Y(pp);
			}
			ctx.stroke();
			ctx.fillStyle = col;
			ctx.font = "600 12px Space Grotesk, sans-serif";
			ctx.textAlign = "right";
			ctx.fillText(label, Math.min(lx, w - 12), Math.max(ly + (slope < 0 ? -8 : 16), 46));
		};
		line(DEM, a, -1, "Nachfrage");
		line(SUP, c, 1, "Angebot");

		// Gleichgewicht
		ctx.setLineDash([4, 5]);
		ctx.strokeStyle = "rgba(255,255,255,0.4)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(L, Y(p));
		ctx.lineTo(X(q), Y(p));
		ctx.lineTo(X(q), B);
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.fillStyle = "#fff";
		ctx.beginPath();
		ctx.arc(X(q), Y(p), 6, 0, Math.PI * 2);
		ctx.fill();

		if (cap !== null) {
			ctx.strokeStyle = "#ff6a8a";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(L, Y(cap));
			ctx.lineTo(w - 10, Y(cap));
			ctx.stroke();
			ctx.fillStyle = "#ff6a8a";
			ctx.textAlign = "left";
			ctx.fillText("Höchstpreis", L + 6, Y(cap) - 6);
			if (cap < p) {
				const qs = Math.max(0, cap - c);
				const qd = Math.max(0, a - cap);
				ctx.fillStyle = "rgba(255,106,138,0.35)";
				ctx.fillRect(X(qs), Y(cap) - 5, X(qd) - X(qs), 10);
				ctx.fillStyle = "#ff6a8a";
				ctx.textAlign = "center";
				ctx.fillText("Mangel", (X(qs) + X(qd)) / 2, Y(cap) + 22);
			}
		}

		// Texte
		out.textContent = `Preis ${euro(price)} · ${kugeln(qSold)}`;
		if (cap !== null && cap < p) {
			const short = Math.max(0, a - cap) - Math.max(0, cap - c);
			note.textContent = `Beim Höchstpreis ${euro(cap)} wollen ${kugeln(Math.max(0, a - cap))} gekauft werden, aber nur ${kugeln(Math.max(0, cap - c))} werden hergestellt. Es fehlen ${kugeln(short)}: Die Schlange wird lang.`;
		} else if (cap !== null) {
			note.textContent = "Der Höchstpreis liegt über dem Marktpreis und ändert deshalb nichts.";
		} else {
			note.textContent = `Gleichgewicht: ${euro(p)} pro Kugel, ${kugeln(q)} am Tag. Gelb: Vorteil der Käufer. Blau: Vorteil der Anbieter.`;
		}
		const lvl = (v, n) => (v === n ? "normal" : v > n ? "höher" : "niedriger");
		document.getElementById("dOut").textContent = lvl(a, 100);
		document.getElementById("sOut").textContent = lvl(c, 20);
		document.getElementById("cOut").textContent = cap === null ? "aus" : euro(cap);
	}

	const paint = (r) => r.style.setProperty("--fill", `${((r.value - r.min) / (r.max - r.min)) * 100}%`);
	const set = (d, s) => {
		dem.value = d;
		sup.value = s;
		paint(dem);
		paint(sup);
		draw();
	};
	document.querySelectorAll("[data-scen]").forEach((b) =>
		b.addEventListener("click", () => {
			const k = b.dataset.scen;
			if (k === "heat") set(130, Number(sup.value));
			if (k === "milk") set(Number(dem.value), 45);
			if (k === "tech") set(Number(dem.value), 5);
			if (k === "reset") {
				ceil.value = 101;
				paint(ceil);
				set(100, 20);
			}
		})
	);
	[dem, sup, ceil].forEach((el) => el.addEventListener("input", draw));
	ready = true;
	draw();
})();

// Ökonomie: komparativer Vorteil auf der Insel
(() => {
	const robH = document.getElementById("robH");
	const friH = document.getElementById("friH");
	const out = document.getElementById("tradeOut");
	const note = document.getElementById("tradeNote");
	const BASE = { fish: 20, coco: 12 };
	const MAX = { fish: 40, coco: 24 };
	document.querySelectorAll(".tot u").forEach((u, k) => (u.style.left = `${(k ? BASE.coco / MAX.coco : BASE.fish / MAX.fish) * 100}%`));

	function update() {
		const r = Number(robH.value);
		const f = Number(friH.value);
		const rob = [r * 4, (8 - r) * 2];
		const fri = [f, 8 - f];
		const fish = rob[0] + fri[0];
		const coco = rob[1] + fri[1];
		document.getElementById("robHOut").textContent = `${r} h`;
		document.getElementById("friHOut").textContent = `${f} h`;
		document.getElementById("robOut").textContent = `${rob[0]} 🐟 · ${rob[1]} 🥥`;
		document.getElementById("friOut").textContent = `${fri[0]} 🐟 · ${fri[1]} 🥥`;
		document.getElementById("fishOut").textContent = fish;
		document.getElementById("cocoOut").textContent = coco;
		document.getElementById("fishBar").style.width = `${(fish / MAX.fish) * 100}%`;
		document.getElementById("cocoBar").style.width = `${(coco / MAX.coco) * 100}%`;
		const df = fish - BASE.fish;
		const dc = coco - BASE.coco;
		const sign = (v) => (v > 0 ? `+${v}` : v ? `${v}`.replace("-", "−") : "±0");
		if (df >= 0 && dc >= 0 && df + dc > 0) {
			out.textContent = `${sign(df)} 🐟 · ${sign(dc)} 🥥`;
			note.textContent = `Gewonnen! Zusammen gibt es mehr von allem als ohne Handel, aus denselben 16 Stunden. ${
				f === 0 ? "Freitag pflückt nur noch Kokosnüsse, da ist er am günstigsten." : ""
			} Jetzt tauschen sie, und beide sind besser dran.`;
		} else if (df === 0 && dc === 0) {
			out.textContent = "wie ohne Handel";
			note.textContent = "Der Strich in den Balken zeigt, wie viel es ohne Handel gibt.";
		} else {
			out.textContent = `${sign(df)} 🐟 · ${sign(dc)} 🥥`;
			note.textContent =
				f > 4 && r < 4
					? "Andersherum wird es schlechter: Freitag fischt, obwohl Robinson das viel günstiger kann."
					: "Von einer Sache gibt es jetzt weniger als vorher. Wer sollte die Kokosnüsse pflücken?";
		}
	}
	[robH, friH].forEach((el) => el.addEventListener("input", update));
	document.getElementById("btnSpec").addEventListener("click", () => {
		robH.value = 5;
		friH.value = 0;
		[robH, friH].forEach((el) => el.dispatchEvent(new Event("input")));
	});
	update();
})();

// Ökonomie: Gewinn, Konsumentenrente und verlorener Handel am Limonadenstand
(() => {
	const canvas = document.getElementById("priceCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.05 : 1.5));
	const price = document.getElementById("price");
	const cost = document.getElementById("cost");
	const out = document.getElementById("priceOut");
	const note = document.getElementById("priceNote");
	const ACC = getComputedStyle(document.documentElement).getPropertyValue("--fach").trim();
	const euro = (v) => `${v.toFixed(2).replace(".", ",")} €`;
	const Q = (p) => Math.max(0, 100 - 10 * p);
	let anim;

	function draw() {
		const { w, h } = size;
		const P = Number(price.value) / 10;
		const k = Number(cost.value) / 10;
		const q = Q(P);
		const L = 46;
		const R = w - 14;
		const top = 40;
		const bot = h - 34;
		const X = (qq) => L + (qq / 100) * (R - L);
		const Y = (pp) => bot - (pp / 10) * (bot - top);
		ctx.clearRect(0, 0, w, h);

		// Achsen
		ctx.font = "11px JetBrains Mono, monospace";
		ctx.fillStyle = "rgba(244,239,230,0.4)";
		ctx.strokeStyle = "rgba(255,255,255,0.08)";
		ctx.textAlign = "right";
		for (let p = 0; p <= 10; p += 2) {
			ctx.beginPath();
			ctx.moveTo(L, Y(p));
			ctx.lineTo(R, Y(p));
			ctx.stroke();
			ctx.fillText(`${p} €`, L - 6, Y(p) + 4);
		}
		ctx.textAlign = "center";
		for (let qq = 0; qq <= 100; qq += 25) ctx.fillText(qq, X(qq), bot + 16);
		ctx.fillText("Becher pro Tag", (L + R) / 2, h - 4);

		const poly = (pts, fill) => {
			ctx.fillStyle = fill;
			ctx.beginPath();
			pts.forEach(([a, b], i) => (i ? ctx.lineTo(X(a), Y(b)) : ctx.moveTo(X(a), Y(b))));
			ctx.closePath();
			ctx.fill();
		};
		// Konsumentenrente: zwischen Nachfrage und Preis
		if (q > 0) poly([[0, 10], [0, P], [q, P]], "rgba(123,220,154,0.3)");
		// Kosten und Gewinn
		if (q > 0) {
			poly([[0, 0], [q, 0], [q, Math.min(k, P)], [0, Math.min(k, P)]], "rgba(255,255,255,0.13)");
			if (P > k) poly([[0, k], [q, k], [q, P], [0, P]], ACC);
			else poly([[0, P], [q, P], [q, k], [0, k]], "rgba(255,106,138,0.45)");
		}
		// Verlorener Handel: Käufer, die mehr als die Kosten zahlen würden, aber nicht kaufen
		const qk = Q(k);
		if (P > k && qk > q) poly([[q, P], [qk, k], [q, k]], "rgba(255,138,122,0.45)");

		// Nachfragelinie und Kostenlinie
		ctx.strokeStyle = "#f4efe6";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.moveTo(X(0), Y(10));
		ctx.lineTo(X(100), Y(0));
		ctx.stroke();
		ctx.setLineDash([5, 5]);
		ctx.strokeStyle = "rgba(244,239,230,0.55)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(L, Y(k));
		ctx.lineTo(R, Y(k));
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.fillStyle = "rgba(244,239,230,0.6)";
		ctx.textAlign = "right";
		ctx.fillText("Kosten", R, Y(k) - 6);
		ctx.textAlign = "left";
		ctx.fillText("Nachfrage", X(4), Y(9.6) + 14);

		const profit = (P - k) * q;
		const best = (10 + k) / 2;
		const maxProfit = (best - k) * Q(best);
		out.textContent = `Gewinn ${Math.round(profit)} €`;
		document.getElementById("pOut").textContent = euro(P);
		document.getElementById("kOut").textContent = euro(k);
		note.textContent =
			profit < 0
				? `Unter den Kosten verkauft: Jeder Becher macht ${euro(k - P)} Verlust.`
				: Math.abs(P - best) < 0.06
					? `Bester Preis: ${euro(best)}, genau in der Mitte zwischen Kosten und dem Preis, bei dem keiner mehr kauft. ${Math.round(q)} Becher, ${Math.round(profit)} € Gewinn. Der rote Keil sind Käufer, die leer ausgehen.`
					: `${Math.round(q)} Becher, ${Math.round(profit)} € Gewinn. Möglich wären ${Math.round(maxProfit)} €. ${P < best ? "Etwas teurer lohnt sich." : "Etwas billiger lohnt sich."}`;
	}
	[price, cost].forEach((el) => el.addEventListener("input", () => {
		cancelAnimationFrame(anim);
		draw();
	}));
	document.getElementById("btnBest").addEventListener("click", () => {
		const target = Math.round((100 + Number(cost.value)) / 2);
		const stepTo = () => {
			const v = Number(price.value);
			if (v === target) return;
			price.value = v + Math.sign(target - v);
			price.style.setProperty("--fill", `${price.value}%`);
			draw();
			anim = requestAnimationFrame(stepTo);
		};
		stepTo();
	});
	window.addEventListener("resize", draw);
	draw();
})();
