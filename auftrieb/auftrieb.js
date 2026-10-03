"use strict";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const nf = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
const TEAL = "#4ee6c9";
const BLUE = "#3f8cff";
const RED = "#ff6a5a";
const INK = "#f4efe6";
const FONT = "'Space Grotesk', sans-serif";

const pointerAt = (canvas, e) => {
	const r = canvas.getBoundingClientRect();
	return [e.clientX - r.left, e.clientY - r.top];
};

function arrow(ctx, x0, y0, x1, y1, color, width = 3) {
	const a = Math.atan2(y1 - y0, x1 - x0);
	const len = Math.hypot(x1 - x0, y1 - y0);
	if (len < 3) return;
	const head = Math.min(10, len * 0.5);
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = width;
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x1 - Math.cos(a) * head * 0.7, y1 - Math.sin(a) * head * 0.7);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x1 - Math.cos(a - 0.5) * head, y1 - Math.sin(a - 0.5) * head);
	ctx.lineTo(x1 - Math.cos(a + 0.5) * head, y1 - Math.sin(a + 0.5) * head);
	ctx.fill();
}

function waterFill(ctx, x, y, w, h, top = "#2f8fd8", bottom = "#0b2a52") {
	const g = ctx.createLinearGradient(0, y, 0, y + h);
	g.addColorStop(0, top);
	g.addColorStop(1, bottom);
	ctx.fillStyle = g;
	ctx.fillRect(x, y, w, h);
}

function waveLine(ctx, x0, x1, y, t, amp = 1.5) {
	ctx.strokeStyle = "rgba(255,255,255,0.45)";
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	for (let x = x0; x <= x1; x += 4) {
		const yy = y + Math.sin(x * 0.07 + t * 2.2) * amp + Math.sin(x * 0.023 - t * 1.3) * amp * 0.6;
		x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
	}
	ctx.stroke();
}

// =====================================================================
// 1 · Wasserdruck: Taucher und Flasche mit Löchern
// =====================================================================
(() => {
	const canvas = document.getElementById("pressCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.15));
	const out = document.getElementById("pressOut");
	const note = document.getElementById("pressNote");
	const btnHoles = document.getElementById("btnHoles");

	const DEPTH = 40; // Meter Tank
	let diver = { d: 6, x: 0.5 };
	let drag = false;
	let holes = false;
	let level = 0.95;
	let drops = [];

	btnHoles.addEventListener("click", () => {
		holes = !holes;
		btnHoles.setAttribute("aria-pressed", String(holes));
		btnHoles.textContent = holes ? "✋ Löcher zuhalten" : "💧 Löcher öffnen";
	});
	document.getElementById("btnRefill").addEventListener("click", () => (level = 0.95));

	const geo = () => {
		const { w, h } = size;
		const tx0 = 30;
		const tx1 = w * 0.58;
		const ty0 = 40;
		const ty1 = h - 16;
		return { tx0, tx1, ty0, ty1, k: (ty1 - ty0) / DEPTH };
	};
	const diverPos = () => {
		const { tx0, tx1, ty0, k } = geo();
		return [lerp(tx0 + 30, tx1 - 30, diver.x), ty0 + diver.d * k];
	};
	canvas.addEventListener("pointerdown", (e) => {
		const [x, y] = pointerAt(canvas, e);
		const [dx, dy] = diverPos();
		if (Math.hypot(x - dx, y - dy) < 50) {
			drag = true;
			canvas.setPointerCapture(e.pointerId);
			canvas.style.cursor = "grabbing";
		}
	});
	canvas.addEventListener("pointermove", (e) => {
		if (!drag) return;
		const [x, y] = pointerAt(canvas, e);
		const { tx0, tx1, ty0, k } = geo();
		diver.d = clamp((y - ty0) / k, 0, DEPTH - 1.5);
		diver.x = clamp((x - tx0 - 30) / (tx1 - tx0 - 60), 0, 1);
	});
	const up = () => {
		drag = false;
		canvas.style.cursor = "";
	};
	canvas.addEventListener("pointerup", up);
	canvas.addEventListener("pointercancel", up);

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const { tx0, tx1, ty0, ty1, k } = geo();
		const p = 1 + diver.d / 10;

		ctx.fillStyle = "#06090d";
		ctx.fillRect(0, 0, w, h);

		// Tank
		waterFill(ctx, tx0, ty0, tx1 - tx0, ty1 - ty0, "#2f8fd8", "#06172e");
		waveLine(ctx, tx0, tx1, ty0, time);
		// Lichtstrahlen
		for (let i = 0; i < 4; i++) {
			const x = tx0 + (tx1 - tx0) * (0.2 + i * 0.22) + Math.sin(time * 0.4 + i) * 10;
			const g = ctx.createLinearGradient(0, ty0, 0, ty0 + (ty1 - ty0) * 0.6);
			g.addColorStop(0, "rgba(180,230,255,0.10)");
			g.addColorStop(1, "rgba(180,230,255,0)");
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.moveTo(x - 10, ty0);
			ctx.lineTo(x + 10, ty0);
			ctx.lineTo(x + 40, ty0 + (ty1 - ty0) * 0.6);
			ctx.lineTo(x - 20, ty0 + (ty1 - ty0) * 0.6);
			ctx.fill();
		}
		// Tiefenskala
		ctx.font = `10px ${FONT}`;
		ctx.textAlign = "right";
		for (let m = 0; m <= DEPTH; m += 10) {
			const y = ty0 + m * k;
			ctx.fillStyle = "rgba(244,239,230,0.5)";
			ctx.fillText(`${m} m`, tx0 - 4, y + 3);
			ctx.strokeStyle = "rgba(255,255,255,0.12)";
			ctx.beginPath();
			ctx.moveTo(tx0, y);
			ctx.lineTo(tx0 + 8, y);
			ctx.stroke();
		}
		ctx.strokeStyle = "rgba(143,211,255,0.4)";
		ctx.lineWidth = 2;
		ctx.strokeRect(tx0, ty0 - 10, tx1 - tx0, ty1 - ty0 + 10);

		// Wassersäule über dem Taucher
		const [dx, dy] = diverPos();
		ctx.fillStyle = "rgba(78,230,201,0.12)";
		ctx.fillRect(dx - 18, ty0, 36, dy - ty0 - 10);
		ctx.strokeStyle = "rgba(78,230,201,0.45)";
		ctx.setLineDash([3, 4]);
		ctx.lineWidth = 1;
		ctx.strokeRect(dx - 18, ty0, 36, Math.max(0, dy - ty0 - 10));
		ctx.setLineDash([]);
		// Gewichtspfeile in der Säule
		for (let y = ty0 + 16; y < dy - 20; y += 22) arrow(ctx, dx, y, dx, y + 12, "rgba(78,230,201,0.6)", 2);

		// Ballon am Taucher schrumpft (Volumen ~ 1/Druck)
		const br = 16 / Math.cbrt(p);
		ctx.strokeStyle = "rgba(244,239,230,0.6)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(dx + 10, dy - 4);
		ctx.lineTo(dx + 26, dy - 26 - br);
		ctx.stroke();
		ctx.fillStyle = "#ff6aa8";
		ctx.beginPath();
		ctx.ellipse(dx + 26, dy - 26 - br * 2, br * 0.9, br, 0, 0, Math.PI * 2);
		ctx.fill();

		// Taucher
		ctx.font = "30px serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("🤿", dx, dy);
		ctx.textBaseline = "alphabetic";
		// Druck von allen Seiten
		const pl = 6 + p * 4;
		for (let a = 0; a < 8; a++) {
			const ang = (a / 8) * Math.PI * 2;
			const r0 = 26 + pl;
			arrow(ctx, dx + Math.cos(ang) * r0, dy + Math.sin(ang) * r0, dx + Math.cos(ang) * 24, dy + Math.sin(ang) * 24, `rgba(63,140,255,${clamp(0.3 + p * 0.1, 0, 0.9)})`, 2);
		}
		// Blasen
		if (Math.random() < dt * 3) drops.push({ bubble: true, x: dx - 6, y: dy - 10, r: 2 + Math.random() * 2 });

		// Flasche rechts (eigene Skala: 30 cm)
		const bx0 = w * 0.68;
		const bx1 = w * 0.84;
		const by0 = h * 0.18;
		const by1 = h * 0.72;
		ctx.fillStyle = "rgba(200,230,255,0.08)";
		ctx.strokeStyle = "rgba(200,230,255,0.5)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(bx0, by0, bx1 - bx0, by1 - by0, 10);
		ctx.fill();
		ctx.stroke();
		ctx.fillRect((bx0 + bx1) / 2 - 8, by0 - 18, 16, 18);
		const wl = lerp(by1, by0, level);
		waterFill(ctx, bx0 + 3, wl, bx1 - bx0 - 6, by1 - wl - 3, "#3fa0e8", "#0d3a6e");
		const HOLES = [0.15, 0.45, 0.75];
		const tableY = h - 16;
		ctx.fillStyle = "#2a2622";
		ctx.fillRect(bx0 - 20, by1, bx1 - bx0 + 40, 6);
		ctx.fillRect(bx0 - 10, by1 + 6, 6, tableY - by1 - 6);
		ctx.fillRect(bx1 + 4, by1 + 6, 6, tableY - by1 - 6);
		let outflow = 0;
		HOLES.forEach((hf, i) => {
			const hy = lerp(by1, by0, hf);
			ctx.fillStyle = "#111";
			ctx.beginPath();
			ctx.arc(bx1, hy, 3, 0, Math.PI * 2);
			ctx.fill();
			const head = level - hf;
			if (holes && head > 0) {
				const v = Math.sqrt(head) * 170;
				outflow += Math.sqrt(head);
				for (let n = 0; n < 2; n++) drops.push({ x: bx1 + 2, y: hy, vx: v * (0.95 + Math.random() * 0.1), vy: 0, hole: i });
			}
			ctx.fillStyle = "rgba(244,239,230,0.45)";
			ctx.font = `10px ${FONT}`;
			ctx.textAlign = "right";
			ctx.fillText(["unten", "Mitte", "oben"][i], bx0 - 6, hy + 3);
		});
		level = Math.max(0, level - outflow * dt * 0.012);
		drops = drops.filter((d) => {
			if (d.bubble) {
				d.y -= dt * 40;
				d.x += Math.sin(time * 5 + d.r) * 0.3;
				ctx.strokeStyle = "rgba(255,255,255,0.5)";
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
				ctx.stroke();
				return d.y > ty0;
			}
			d.vy += 700 * dt;
			d.x += d.vx * dt;
			d.y += d.vy * dt;
			ctx.fillStyle = "rgba(120,200,255,0.8)";
			ctx.fillRect(d.x - 1.5, d.y - 1.5, 3, 3);
			return d.y < tableY && d.x < w;
		});
		if (drops.length > 900) drops.splice(0, drops.length - 900);

		out.innerHTML = `${nf(diver.d, 1)} m tief<br><b>${nf(p, 2)} bar</b>`;
		if (drag) {
			note.textContent =
				diver.d < 1
					? "An der Oberfläche drückt nur die Luft: 1 bar."
					: `Über dem Taucher liegt eine ${nf(diver.d, 1)} m hohe Wassersäule (hellgrün). Ihr Gewicht drückt mit ${nf(p - 1, 2)} bar zusätzlich. Der Ballon wird zusammengequetscht.`;
		} else if (holes) {
			note.textContent =
				level > 0.2
					? "Der untere Strahl spritzt am weitesten: Dort lastet am meisten Wasser darüber, der Druck ist am größten."
					: "Der Wasserstand ist gesunken, und mit ihm der Druck. Die Strahlen werden schwächer.";
		}
	});
})();

// =====================================================================
// 2 · Archimedes-Becken
// =====================================================================
(() => {
	const canvas = document.getElementById("tankCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.8 : 2.15));
	const out = document.getElementById("tankOut");
	const tag = document.getElementById("tankTag");
	const note = document.getElementById("tankNote");
	const btnSalt = document.getElementById("btnSalt");

	const THINGS = [
		{ name: "Styropor", icon: "☁️", rho: 0.03, col: "#e8e8ea" },
		{ name: "Holz", icon: "🪵", rho: 0.6, col: "#a0703f" },
		{ name: "Eis", icon: "🧊", rho: 0.92, col: "#bfe6ff" },
		{ name: "Ei", icon: "🥚", rho: 1.08, col: "#f2e2c4" },
		{ name: "Stein", icon: "🪨", rho: 2.6, col: "#7d7f86" },
		{ name: "Eisen", icon: "🔩", rho: 7.9, col: "#5a6270" },
	];
	let rhoW = 1;
	let objs = [];
	let drag = null;
	let sel = null;

	function reset() {
		objs = THINGS.map((t, i) => ({ ...t, slot: i, inTank: false, x: 0, y: 0, vy: 0 }));
		sel = null;
	}
	reset();
	btnSalt.addEventListener("click", () => {
		rhoW = rhoW === 1 ? 1.2 : 1;
		btnSalt.setAttribute("aria-pressed", String(rhoW > 1));
		btnSalt.textContent = rhoW > 1 ? "💧 Süßwasser" : "🧂 Salz ins Wasser";
		tag.textContent = rhoW > 1 ? "Salzwasser wie im Toten Meer" : "Süßwasser";
		note.textContent =
			rhoW > 1
				? "Das salzige Wasser ist schwerer. Jetzt verdrängt jedes Ding schwereres Wasser und bekommt mehr Auftrieb. Schau dir das Ei an!"
				: "Normales Wasser: 1 Gramm pro Kubikzentimeter.";
	});
	document.getElementById("btnTankReset").addEventListener("click", reset);

	const geo = () => {
		const { w, h } = size;
		const S = clamp(Math.min(w, h * 2) * 0.075, 34, 64);
		const shelfY = 34 + S + 16;
		const tx0 = w * 0.08;
		const tx1 = w * 0.92;
		const ty0 = shelfY + 26;
		const ty1 = h - 14;
		const baseLevel = lerp(ty0, ty1, 0.32);
		return { S, shelfY, tx0, tx1, ty0, ty1, baseLevel };
	};
	const slotX = (i) => {
		const { w } = size;
		const { S } = geo();
		return w / 2 + (i - (THINGS.length - 1) / 2) * (S + Math.min(36, w * 0.04)) - S / 2;
	};
	function level() {
		const { S, tx0, tx1, baseLevel } = geo();
		let lv = baseLevel;
		// Wasserspiegel steigt um das verdrängte Volumen (zwei Durchgänge genügen)
		for (let it = 0; it < 2; it++) {
			let disp = 0;
			for (const o of objs) if (o.inTank) disp += clamp((o.y + S - lv) / S, 0, 1) * S * S;
			lv = baseLevel - disp / (tx1 - tx0);
		}
		return lv;
	}

	canvas.addEventListener("pointerdown", (e) => {
		const [x, y] = pointerAt(canvas, e);
		const { S } = geo();
		for (let i = objs.length - 1; i >= 0; i--) {
			const o = objs[i];
			const ox = o.inTank ? o.x : slotX(o.slot);
			const oy = o.inTank ? o.y : 34;
			if (x >= ox - 6 && x <= ox + S + 6 && y >= oy - 6 && y <= oy + S + 6) {
				drag = { o, dx: x - ox, dy: y - oy };
				o.inTank = true;
				o.x = ox;
				o.y = oy;
				o.vy = 0;
				sel = o;
				objs.splice(i, 1);
				objs.push(o);
				canvas.setPointerCapture(e.pointerId);
				canvas.style.cursor = "grabbing";
				return;
			}
		}
	});
	canvas.addEventListener("pointermove", (e) => {
		if (!drag) return;
		const [x, y] = pointerAt(canvas, e);
		const { S, ty1 } = geo();
		drag.o.x = clamp(x - drag.dx, 0, size.w - S);
		drag.o.y = clamp(y - drag.dy, 0, ty1 - S);
	});
	const up = () => {
		if (!drag) return;
		const o = drag.o;
		const { S, tx0, tx1 } = geo();
		if (o.x + S / 2 < tx0 || o.x + S / 2 > tx1) o.inTank = false;
		else o.x = clamp(o.x, tx0 + 3, tx1 - S - 3);
		drag = null;
		canvas.style.cursor = "";
	};
	canvas.addEventListener("pointerup", up);
	canvas.addEventListener("pointercancel", up);

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const { S, shelfY, tx0, tx1, ty0, ty1 } = geo();
		const G = 900; // px/s²

		// Physik
		const sub = 16;
		for (let i = 0; i < sub; i++) {
			const d = dt / sub;
			const lv = level();
			for (const o of objs) {
				if (!o.inTank || (drag && drag.o === o)) continue;
				const f = clamp((o.y + S - lv) / S, 0, 1);
				let a = G * (1 - (rhoW * f) / o.rho);
				a = clamp(a, -G * 6, G);
				const damp = f > 0 ? 6 + 10 * f : 0.5;
				o.vy += (a - damp * o.vy) * d;
				o.y += o.vy * d;
				if (o.y + S > ty1) {
					o.y = ty1 - S;
					o.vy = 0;
				}
			}
		}
		const lv = level();

		ctx.fillStyle = "#06090d";
		ctx.fillRect(0, 0, w, h);

		// Regal
		ctx.fillStyle = "#2a2622";
		ctx.fillRect(slotX(0) - 20, shelfY - 2, slotX(THINGS.length - 1) - slotX(0) + S + 40, 6);

		// Becken
		ctx.fillStyle = "rgba(143,211,255,0.04)";
		ctx.fillRect(tx0, ty0, tx1 - tx0, ty1 - ty0);
		waterFill(ctx, tx0, lv, tx1 - tx0, ty1 - lv, rhoW > 1 ? "#3fbfb0" : "#2f8fd8", rhoW > 1 ? "#0b3b40" : "#0b2a52");
		// Markierung des Ausgangsniveaus
		const { baseLevel } = geo();
		ctx.setLineDash([4, 4]);
		ctx.strokeStyle = "rgba(255,255,255,0.25)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(tx1 - 70, baseLevel);
		ctx.lineTo(tx1, baseLevel);
		ctx.stroke();
		ctx.setLineDash([]);
		if (baseLevel - lv > 1) {
			ctx.fillStyle = TEAL;
			ctx.font = `10px ${FONT}`;
			ctx.textAlign = "right";
			ctx.fillText(`+${nf(baseLevel - lv, 0)} px verdrängt`, tx1 - 6, lv - 6);
		}
		waveLine(ctx, tx0, tx1, lv, time, 1.2);
		ctx.strokeStyle = "rgba(143,211,255,0.45)";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(tx0, ty0);
		ctx.lineTo(tx0, ty1);
		ctx.lineTo(tx1, ty1);
		ctx.lineTo(tx1, ty0);
		ctx.stroke();

		// Gegenstände
		for (const o of objs) {
			const x = o.inTank ? o.x : slotX(o.slot);
			const y = o.inTank ? o.y : 34;
			const g = ctx.createLinearGradient(x, y, x + S, y + S);
			g.addColorStop(0, o.col);
			g.addColorStop(1, `${o.col}99`);
			ctx.fillStyle = g;
			ctx.globalAlpha = o.name === "Eis" ? 0.8 : 1;
			ctx.beginPath();
			ctx.roundRect(x, y, S, S, 6);
			ctx.fill();
			ctx.globalAlpha = 1;
			ctx.strokeStyle = sel === o ? TEAL : "rgba(0,0,0,0.35)";
			ctx.lineWidth = sel === o ? 2.5 : 1;
			ctx.stroke();
			ctx.font = `${S * 0.45}px serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(o.icon, x + S / 2, y + S * 0.44);
			ctx.textBaseline = "alphabetic";
			ctx.font = `10px ${FONT}`;
			ctx.fillStyle = "#111";
			ctx.fillText(nf(o.rho, 2), x + S / 2, y + S - 5);
			if (!o.inTank) {
				ctx.fillStyle = "rgba(244,239,230,0.6)";
				ctx.fillText(o.name, x + S / 2, shelfY + 16);
			}
		}

		// Kräfte für Dinge im Wasser
		for (const o of objs) {
			if (!o.inTank) continue;
			const f = clamp((o.y + S - lv) / S, 0, 1);
			const cx = o.x + S / 2;
			const cy = o.y + S / 2;
			const K = 34;
			const wLen = Math.min(o.rho * K, 120);
			const bLen = Math.min(rhoW * f * K, 120);
			arrow(ctx, cx - 7, cy, cx - 7, cy + wLen, RED, 3);
			if (bLen > 2) arrow(ctx, cx + 7, cy, cx + 7, cy - bLen, BLUE, 3);
		}

		// Legende
		ctx.font = `11px ${FONT}`;
		ctx.textAlign = "left";
		ctx.fillStyle = RED;
		ctx.fillText("↓ Gewicht", tx0 + 8, ty1 - 24);
		ctx.fillStyle = "#8fb8ff";
		ctx.fillText("↑ Auftrieb", tx0 + 8, ty1 - 8);

		if (sel) {
			const f = sel.inTank ? clamp((sel.y + S - lv) / S, 0, 1) : 0;
			const floats = sel.rho < rhoW;
			out.innerHTML = `${sel.icon} ${sel.name}<br>Dichte ${nf(sel.rho, 2)} g/cm³`;
			if (sel.inTank && !drag && f > 0) {
				note.textContent = floats
					? `${sel.name} ist leichter als Wasser und schwimmt. Es taucht zu ${Math.round((sel.rho / rhoW) * 100)} % ein, genau so weit, bis das verdrängte Wasser so viel wiegt wie ${sel.name === "Ei" ? "das Ei" : "der Würfel"}.`
					: `${sel.name} ist ${nf(sel.rho / rhoW, 1)}-mal so schwer wie die gleiche Menge Wasser. Der Auftrieb (blau) ist kleiner als das Gewicht (rot), also sinkt ${sel.name === "Ei" ? "es" : "er"}.`;
			}
		} else {
			out.textContent = "";
		}
	});
})();

// =====================================================================
// 3 · Stahlschiff formen und beladen
// =====================================================================
(() => {
	const canvas = document.getElementById("shipCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1 : 1.3));
	const shape = document.getElementById("shape");
	const shapeOut = document.getElementById("shapeOut");
	const out = document.getElementById("shipOut");
	const note = document.getElementById("shipNote");

	const AS = 0.5; // m² Stahl im Querschnitt (pro Meter Schiffslänge)
	const RHO_S = 7.85; // t/m³
	const MS = AS * RHO_S; // t pro Meter
	const CRATE = 1; // t
	let crates = 0;
	let y = 0; // aktueller Tiefgang (m), animiert
	let sunk = 0; // 0..1 Untergangs-Animation
	let flood = 0;

	function hull() {
		const u = Number(shape.value) / 100;
		const side = Math.sqrt(AS);
		const b = lerp(side, 6, u);
		const H = lerp(side, 2, u);
		const t = (b + 2 * H - Math.sqrt((b + 2 * H) ** 2 - 8 * AS)) / 4;
		return { b, H, t, u };
	}
	function state() {
		const { b, H } = hull();
		const M = MS + crates * CRATE;
		const d = M / b; // Tiefgang in Süßwasser (1 t/m³)
		const cap = b * H - MS;
		return { M, d, sinks: d >= H, cap };
	}
	function sync() {
		const { u, b, H } = hull();
		shapeOut.textContent = u < 0.05 ? "Klumpen" : u < 0.5 ? "dicke Wanne" : u < 0.9 ? "Schale" : "dünnes Schiff";
		const s = state();
		if (s.sinks) {
			flood = 1;
		} else if (flood > 0 && !s.sinks) {
			flood = 0;
			sunk = 0;
		}
		out.innerHTML = `Stahl ${nf(MS, 1)} t + Ladung ${crates} t<br>verdrängt max. ${nf(b * H, 1)} t Wasser`;
		if (u < 0.05) note.textContent = `Ein massiver Stahlklumpen verdrängt nur ${nf(AS, 1)} t Wasser, wiegt aber ${nf(MS, 1)} t. Er geht unter wie ein Stein.`;
		else if (s.sinks && crates === 0) note.textContent = "Schon dünner und breiter, aber noch zu wenig Luft im Rumpf. Weiter formen!";
		else if (s.sinks) note.textContent = `Zu viel Ladung! Das Wasser ist über den Rand geschwappt, und ohne die Luft im Rumpf sinkt der Stahl. ${Math.max(0, Math.floor(s.cap))} Kisten hätte es getragen.`;
		else note.textContent = `Es schwimmt! Der Rumpf ist ${nf(b, 1)} m breit und taucht ${nf(s.d, 2)} m tief ein. Platz für ${Math.max(0, Math.floor(s.cap) - crates)} weitere Kisten à 1 t.`;
	}
	shape.addEventListener("input", sync);
	document.getElementById("btnCrate").addEventListener("click", () => {
		crates++;
		sync();
	});
	document.getElementById("btnUnload").addEventListener("click", () => {
		crates = 0;
		sunk = 0;
		sync();
	});
	sync();

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const { b, H, t } = hull();
		const s = state();
		const k = Math.min((w * 0.8) / 6.5, (h * 0.5) / 2.6);
		const surf = h * 0.42;
		const bottom = h - 14;
		const cx = w / 2;

		if (s.sinks) {
			sunk = Math.min(1, sunk + dt * 0.5);
		}
		const targetD = s.sinks ? H : s.d;
		y = lerp(y, targetD, Math.min(1, dt * 3));
		const bob = Math.sin(time * 1.6) * 0.03 * (1 - sunk);
		const keel = surf + (y + bob) * k + sunk * (bottom - surf - (y * k));

		// Himmel und Wasser
		const sky = ctx.createLinearGradient(0, 0, 0, surf);
		sky.addColorStop(0, "#0d1a2e");
		sky.addColorStop(1, "#24476b");
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, w, surf);

		// Schiff (hinter Wasser-Transparenz)
		const X0 = cx - (b / 2) * k;
		const X1 = cx + (b / 2) * k;
		const Y1 = keel;
		const Y0 = keel - H * k;
		const T = Math.max(2, t * k);
		ctx.fillStyle = "#6a7480";
		if (hull().u < 0.05) {
			ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
		} else {
			ctx.beginPath();
			ctx.moveTo(X0, Y0);
			ctx.lineTo(X0, Y1);
			ctx.lineTo(X1, Y1);
			ctx.lineTo(X1, Y0);
			ctx.lineTo(X1 - T, Y0);
			ctx.lineTo(X1 - T, Y1 - T);
			ctx.lineTo(X0 + T, Y1 - T);
			ctx.lineTo(X0 + T, Y0);
			ctx.closePath();
			ctx.fill();
			// Luft im Rumpf
			ctx.fillStyle = s.sinks ? "rgba(47,143,216,0.45)" : "rgba(200,230,255,0.07)";
			ctx.fillRect(X0 + T, Y0, X1 - X0 - 2 * T, Y1 - Y0 - T);
			// Kisten
			const cs = 0.62 * k;
			const per = Math.max(1, Math.floor((X1 - X0 - 2 * T) / (cs + 2)));
			for (let i = 0; i < crates; i++) {
				const col = i % per;
				const row = Math.floor(i / per);
				const x = X0 + T + 2 + col * (cs + 2);
				const yy = Y1 - T - (row + 1) * (cs + 1);
				ctx.fillStyle = "#c4893f";
				ctx.fillRect(x, yy, cs, cs);
				ctx.strokeStyle = "#7a5222";
				ctx.lineWidth = 1.5;
				ctx.strokeRect(x + 2, yy + 2, cs - 4, cs - 4);
				ctx.beginPath();
				ctx.moveTo(x + 2, yy + 2);
				ctx.lineTo(x + cs - 2, yy + cs - 2);
				ctx.stroke();
			}
		}

		// Wasser darüber, halbtransparent
		const water = ctx.createLinearGradient(0, surf, 0, h);
		water.addColorStop(0, "rgba(47,143,216,0.72)");
		water.addColorStop(1, "rgba(6,23,46,0.95)");
		ctx.fillStyle = water;
		ctx.fillRect(0, surf, w, h - surf);
		waveLine(ctx, 0, w, surf, time, 2);
		ctx.fillStyle = "#1a1612";
		ctx.fillRect(0, bottom, w, h - bottom);

		// Tiefgang-Markierung
		if (!s.sinks && hull().u >= 0.05) {
			ctx.strokeStyle = TEAL;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(X1 + 10, surf);
			ctx.lineTo(X1 + 10, Y1);
			ctx.stroke();
			ctx.fillStyle = TEAL;
			ctx.font = `11px ${FONT}`;
			ctx.textAlign = "left";
			ctx.fillText(`Tiefgang ${nf(s.d, 2)} m`, X1 + 16, (surf + Y1) / 2 + 4);
			// verdrängtes Wasser hervorheben
			ctx.fillStyle = "rgba(78,230,201,0.12)";
			ctx.fillRect(X0, surf, X1 - X0, Y1 - surf);
		}

		// Waage-Vergleich
		const barW = Math.min(w * 0.4, 220);
		const disp = s.sinks ? b * H : s.M;
		const maxv = Math.max(s.M, b * H, 8);
		ctx.font = `10px ${FONT}`;
		ctx.textAlign = "left";
		ctx.fillStyle = "rgba(244,239,230,0.6)";
		ctx.fillText("Gewicht Schiff + Ladung", 12, 46);
		ctx.fillText(s.sinks ? "verdrängtes Wasser (max.)" : "verdrängtes Wasser", 12, 72);
		ctx.fillStyle = RED;
		ctx.fillRect(12, 50, (s.M / maxv) * barW, 8);
		ctx.fillStyle = BLUE;
		ctx.fillRect(12, 76, (Math.min(disp, b * H) / maxv) * barW, 8);
	});
})();

// =====================================================================
// 4 · U-Boot mit Ballasttanks
// =====================================================================
(() => {
	const canvas = document.getElementById("subCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.85 : 1.1));
	const ballast = document.getElementById("ballast");
	const bOut = document.getElementById("ballastOut");
	const out = document.getElementById("subOut");
	const note = document.getElementById("subNote");
	const scoreEl = document.getElementById("subScore");
	const bestEl = document.getElementById("subBest");

	const DEPTH = 120;
	let fill = 0;
	let d = 0;
	let v = 0;
	let score = 0;
	let best = 0;
	let bubbles = [];
	const fish = Array.from({ length: 7 }, (_, i) => ({ x: Math.random(), d: 15 + Math.random() * 95, s: 0.03 + Math.random() * 0.04, dir: i % 2 ? 1 : -1 }));

	ballast.addEventListener("input", () => (bOut.textContent = `${ballast.value} %`));

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const target = Number(ballast.value) / 100;
		const prev = fill;
		fill += clamp(target - fill, -0.18 * dt, 0.18 * dt);
		if (fill < prev - 1e-4) for (let i = 0; i < 2; i++) bubbles.push({ x: 0, y: 0, rel: true, t: 0, j: Math.random() });

		// Dichte des U-Boots relativ zu Wasser
		const rho = 0.96 + 0.08 * fill;
		let a = (rho - 1) * 9.81 * 0.9 - 0.9 * v * Math.abs(v) - 0.3 * v;
		if (d < 0) a += -d * 30 - v * 4; // Oberfläche
		v += a * dt;
		d += v * dt;
		if (d > DEPTH - 4) {
			d = DEPTH - 4;
			if (v > 0.5) {
				note.textContent = "Rumms, Grundberührung! Tanks ausblasen, um wieder aufzusteigen.";
				score = 0;
			}
			v = 0;
		}
		d = Math.max(d, -1.5);

		// Zielbereich schwankt langsam
		const zc = 60 + Math.sin(time * 0.11) * 28 + Math.sin(time * 0.27) * 8;
		const zh = 9;
		const inZone = Math.abs(d - zc) < zh;
		if (inZone) {
			score += dt;
			if (score > best) best = score;
		} else score = Math.max(0, score - dt * 0.5);
		scoreEl.textContent = `${nf(score, 1)} s`;
		bestEl.textContent = `${nf(best, 1)} s`;

		const top = h * 0.1;
		const k = (h - top - 10) / DEPTH;
		const Y = (m) => top + m * k;

		// Himmel / Meer
		ctx.fillStyle = "#0d1a2e";
		ctx.fillRect(0, 0, w, top);
		const sea = ctx.createLinearGradient(0, top, 0, h);
		sea.addColorStop(0, "#1f7cc4");
		sea.addColorStop(0.5, "#0a3566");
		sea.addColorStop(1, "#020c1c");
		ctx.fillStyle = sea;
		ctx.fillRect(0, top, w, h - top);
		waveLine(ctx, 0, w, top, time, 2);

		// Zielbereich
		ctx.fillStyle = inZone ? "rgba(123,220,154,0.22)" : "rgba(123,220,154,0.1)";
		ctx.fillRect(0, Y(zc - zh), w, zh * 2 * k);
		ctx.strokeStyle = "rgba(123,220,154,0.6)";
		ctx.setLineDash([6, 6]);
		ctx.beginPath();
		ctx.moveTo(0, Y(zc - zh));
		ctx.lineTo(w, Y(zc - zh));
		ctx.moveTo(0, Y(zc + zh));
		ctx.lineTo(w, Y(zc + zh));
		ctx.stroke();
		ctx.setLineDash([]);

		// Tiefen
		ctx.font = `10px ${FONT}`;
		ctx.textAlign = "left";
		for (let m = 20; m < DEPTH; m += 20) {
			ctx.fillStyle = "rgba(244,239,230,0.35)";
			ctx.fillText(`${m} m`, 6, Y(m) + 3);
		}

		// Fische
		for (const f of fish) {
			f.x += f.s * f.dir * dt;
			if (f.x > 1.1) f.x = -0.1;
			if (f.x < -0.1) f.x = 1.1;
			ctx.save();
			ctx.translate(f.x * w, Y(f.d) + Math.sin(time * 2 + f.d) * 3);
			ctx.scale(f.dir, 1);
			ctx.fillStyle = "rgba(255,200,120,0.55)";
			ctx.beginPath();
			ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2);
			ctx.moveTo(-8, 0);
			ctx.lineTo(-14, -5);
			ctx.lineTo(-14, 5);
			ctx.fill();
			ctx.restore();
		}

		// Meeresgrund
		ctx.fillStyle = "#2a2418";
		ctx.beginPath();
		ctx.moveTo(0, h);
		for (let x = 0; x <= w; x += 20) ctx.lineTo(x, Y(DEPTH - 2) + Math.sin(x * 0.05) * 4);
		ctx.lineTo(w, h);
		ctx.fill();

		// U-Boot
		const sx = w * 0.55;
		const sy = Y(d);
		const L = Math.min(w * 0.36, 200);
		const R = L * 0.16;
		ctx.save();
		ctx.translate(sx, sy);
		ctx.rotate(clamp(v * 0.05, -0.15, 0.15));
		ctx.fillStyle = "#e0b33a";
		ctx.beginPath();
		ctx.roundRect(-L / 2, -R, L, R * 2, R);
		ctx.fill();
		ctx.fillRect(-L * 0.08, -R * 1.9, L * 0.2, R);
		ctx.fillRect(L * 0.02, -R * 2.4, 3, R * 0.6);
		// Tanks
		const tw = L * 0.22;
		for (const tx of [-L * 0.4, L * 0.18]) {
			ctx.fillStyle = "rgba(10,20,30,0.85)";
			ctx.fillRect(tx, -R * 0.6, tw, R * 1.2);
			ctx.fillStyle = "#2f8fd8";
			ctx.fillRect(tx, -R * 0.6 + R * 1.2 * (1 - fill), tw, R * 1.2 * fill);
			ctx.strokeStyle = "rgba(255,255,255,0.4)";
			ctx.lineWidth = 1;
			ctx.strokeRect(tx, -R * 0.6, tw, R * 1.2);
		}
		ctx.fillStyle = "#a9d8ff";
		for (const px of [-L * 0.1, L * 0.02]) {
			ctx.beginPath();
			ctx.arc(px, 0, R * 0.25, 0, Math.PI * 2);
			ctx.fill();
		}
		// Propeller
		ctx.fillStyle = "#888";
		ctx.fillRect(-L / 2 - 8, -R * 0.5 * Math.abs(Math.sin(time * 12)), 4, R * Math.abs(Math.sin(time * 12)));
		ctx.restore();

		// Blasen beim Ausblasen
		bubbles = bubbles.filter((b) => {
			if (b.rel) {
				b.x = sx + (b.j - 0.5) * L * 0.6;
				b.y = sy - R;
				b.rel = false;
			}
			b.t += dt;
			b.y -= dt * 60;
			b.x += Math.sin(b.t * 6 + b.j * 10) * 0.4;
			ctx.strokeStyle = "rgba(255,255,255,0.6)";
			ctx.beginPath();
			ctx.arc(b.x, b.y, 2 + b.j * 2, 0, Math.PI * 2);
			ctx.stroke();
			return b.y > top;
		});

		out.innerHTML = `${nf(Math.max(0, d), 0)} m · ${nf(1 + Math.max(0, d) / 10, 1)} bar<br>${v > 0.15 ? "sinkt ↓" : v < -0.15 ? "steigt ↑" : "schwebt ≈"}`;
		if (!note.textContent.startsWith("Rumms") || v < -0.3) {
			note.textContent =
				fill < 0.45
					? "Wenig Wasser in den Tanks: Das U-Boot ist leichter als das Wasser, das es verdrängt. Es steigt."
					: fill > 0.55
						? "Viel Wasser in den Tanks: Das U-Boot ist schwerer als das verdrängte Wasser. Es sinkt."
						: "Fast genau so schwer wie das verdrängte Wasser: Das U-Boot schwebt. Die Tanks brauchen etwas Zeit, also plane voraus!";
			if (Math.abs(target - fill) > 0.02) note.textContent += target > fill ? " (Tanks werden geflutet …)" : " (Druckluft bläst die Tanks aus …)";
		}
	});
})();

// =====================================================================
// 5 · Mit Ballons abheben
// =====================================================================
(() => {
	const canvas = document.getElementById("balloonCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.8 : 2));
	const gases = document.getElementById("gases");
	const loads = document.getElementById("loads");
	const count = document.getElementById("count");
	const countOut = document.getElementById("countOut");
	const tag = document.getElementById("balloonTag");
	const out = document.getElementById("balloonOut");
	const note = document.getElementById("balloonNote");

	const AIR = 1.2; // kg/m³
	const VOL = 0.014; // m³ Partyballon
	const RUBBER = 3; // g
	const GASES = [
		{ name: "Helium", rho: 0.18, note: "Helium ist siebenmal leichter als Luft und brennt nicht. Darum steckt es in Partyballons." },
		{ name: "Wasserstoff", rho: 0.09, note: "Noch leichter als Helium, aber brennbar. 1937 explodierte das Luftschiff Hindenburg, seitdem fliegt man lieber mit Helium." },
		{ name: "Luft", rho: 1.2, note: "Luft im Ballon wiegt genauso viel wie die Luft drumherum. Kein Auftrieb, und die Gummihülle zieht den Ballon nach unten." },
		{ name: "Heiße Luft", rho: 0.95, note: "Heiße Luft ist nur ein bisschen leichter. Bei so kleinen Ballons reicht das nicht einmal für die Gummihülle. Heißluftballons sind darum riesig." },
	];
	const LOADS = [
		{ name: "Brief", icon: "✉️", g: 20 },
		{ name: "Handy", icon: "📱", g: 200 },
		{ name: "Katze", icon: "🐈", g: 4000 },
		{ name: "Kind", icon: "🧒", g: 30000 },
	];
	let gas = GASES[0];
	let load = LOADS[1];
	let alt = 0;
	let vy = 0;
	const COLORS = ["#ff5a7a", "#ffcf5a", "#4ee6c9", "#3f8cff", "#b78bff", "#ff9f6b", "#7bdc9a"];

	const n = () => {
		const s = Number(count.value) / 1000;
		return s === 0 ? 0 : Math.round(Math.pow(10, s * 4.7));
	};
	const liftPer = () => (AIR - gas.rho) * VOL * 1000 - RUBBER; // g
	function mkChips(el, list, get, set, label) {
		list.forEach((it) => {
			const b = document.createElement("button");
			b.type = "button";
			b.className = "btn";
			b.textContent = label(it);
			b.setAttribute("aria-pressed", String(it === get()));
			b.addEventListener("click", () => {
				set(it);
				[...el.children].forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
				alt = 0;
				vy = 0;
				sync();
			});
			el.appendChild(b);
		});
	}
	mkChips(gases, GASES, () => gas, (g) => (gas = g), (g) => `🎈 ${g.name}`);
	mkChips(loads, LOADS, () => load, (l) => (load = l), (l) => `${l.icon} ${l.name} · ${l.g >= 1000 ? `${nf(l.g / 1000)} kg` : `${l.g} g`}`);
	function sync() {
		const N = n();
		countOut.textContent = nf(N);
		tag.textContent = gas.name;
		const lp = liftPer();
		const total = lp * N;
		const fmt = (g) => (Math.abs(g) >= 1000 ? `${nf(g / 1000, 1)} kg` : `${nf(g, 0)} g`);
		out.innerHTML = `Auftrieb ${fmt(total)}<br>Last ${fmt(load.g)}`;
		const need = lp > 0 ? Math.ceil(load.g / lp) : Infinity;
		let txt = `Jeder ${gas.name}-Ballon trägt ${lp > 0 ? `${nf(lp, 1)} g` : "nichts, er zieht sogar nach unten"}. `;
		txt += lp > 0 ? `Für ${load.name === "Kind" || load.name === "Handy" ? "das" : load.name === "Katze" ? "die" : "den"} ${load.name} brauchst du ${nf(need)} Ballons. ` : "";
		txt += gas.note;
		note.textContent = txt;
	}
	count.addEventListener("input", sync);
	sync();

	whenVisible(canvas, (dt, time) => {
		const { w, h } = size;
		const N = n();
		const total = liftPer() * N;
		const excess = total - load.g;
		const ground = h - 18;
		if (excess > 0) {
			vy = lerp(vy, clamp(Math.log10(1 + excess / Math.max(1, load.g) * 10) * 60, 10, 140), dt);
			alt += vy * dt;
		} else {
			vy = 0;
			alt = Math.max(0, alt - dt * 200);
		}

		// Himmel wird mit der Höhe dunkler
		const hi = clamp(alt / 4000, 0, 1);
		const sky = ctx.createLinearGradient(0, 0, 0, h);
		sky.addColorStop(0, `rgb(${Math.round(lerp(60, 8, hi))},${Math.round(lerp(120, 14, hi))},${Math.round(lerp(190, 40, hi))})`);
		sky.addColorStop(1, `rgb(${Math.round(lerp(150, 20, hi))},${Math.round(lerp(190, 40, hi))},${Math.round(lerp(230, 80, hi))})`);
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, w, h);
		// Wolken ziehen beim Steigen vorbei
		for (let i = 0; i < 6; i++) {
			const cy = ((i * 173 + alt * 0.6) % (h + 120)) - 60;
			const cx = ((i * 311 + time * 8) % (w + 200)) - 100;
			ctx.fillStyle = "rgba(255,255,255,0.35)";
			for (const [ox, oy, r] of [
				[0, 0, 22],
				[20, -8, 18],
				[40, 0, 20],
				[18, 6, 16],
			]) {
				ctx.beginPath();
				ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		// Boden rutscht weg
		const gy = ground + alt;
		if (gy < h + 40) {
			ctx.fillStyle = "#2f5a2a";
			ctx.fillRect(0, gy, w, h - gy + 50);
			ctx.fillStyle = "#3f7a38";
			ctx.fillRect(0, gy, w, 4);
		}

		// Last
		const lx = w / 2;
		const ly = Math.min(ground, ground - Math.min(alt, h * 0.35));
		ctx.font = "34px serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.fillText(load.icon, lx, ly);
		ctx.textBaseline = "alphabetic";

		// Ballontraube
		const shown = Math.min(N, 260);
		const br = Math.max(7, Math.min(18, 160 / Math.sqrt(shown + 4)));
		const cy = ly - 34 - Math.min(h * 0.38, 70 + Math.sqrt(shown) * br * 0.6);
		const pts = [];
		for (let i = 0; i < shown; i++) {
			const r = Math.sqrt(i + 0.5) * br * 0.95;
			const a = i * 2.39996;
			pts.push([lx + Math.cos(a) * r + Math.sin(time * 1.5 + i) * 1.5, cy + Math.sin(a) * r * 0.75 + Math.cos(time * 1.3 + i) * 1.5, i]);
		}
		ctx.strokeStyle = "rgba(255,255,255,0.35)";
		ctx.lineWidth = 0.7;
		ctx.beginPath();
		for (let i = 0; i < pts.length; i += Math.max(1, Math.floor(pts.length / 40))) {
			ctx.moveTo(lx, ly - 30);
			ctx.lineTo(pts[i][0], pts[i][1] + br);
		}
		ctx.stroke();
		for (const [x, y, i] of pts.sort((a, b) => a[1] - b[1])) {
			const c = COLORS[i % COLORS.length];
			const g = ctx.createRadialGradient(x - br * 0.3, y - br * 0.4, br * 0.1, x, y, br);
			g.addColorStop(0, "#ffffffcc");
			g.addColorStop(0.3, c);
			g.addColorStop(1, `${c}aa`);
			ctx.fillStyle = gas.name === "Luft" ? `${c}88` : g;
			ctx.beginPath();
			ctx.ellipse(x, y, br * 0.85, br, 0, 0, Math.PI * 2);
			ctx.fill();
		}
		if (N > shown) {
			ctx.fillStyle = "rgba(255,255,255,0.85)";
			ctx.font = `12px ${FONT}`;
			ctx.textAlign = "center";
			ctx.fillText(`(${nf(N)} Ballons, ${nf(shown)} gezeichnet)`, lx, Math.max(16, cy - Math.sqrt(shown) * br - 8));
		}

		// Höhe
		ctx.fillStyle = INK;
		ctx.font = `bold 14px ${FONT}`;
		ctx.textAlign = "left";
		ctx.fillText(excess > 0 ? `↑ ${nf(alt / 10, 0)} m` : "am Boden", 14, h - 28);
	});
})();
