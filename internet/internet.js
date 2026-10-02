"use strict";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const nf = (v, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// =====================================================================
// 1 · Text → Bytes → Bits → Licht
// =====================================================================
(() => {
	const canvas = document.getElementById("bitCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 2.2 : 3));
	const input = document.getElementById("bitText");
	const box = document.getElementById("bytes");
	const note = document.getElementById("bitNote");
	const enc = new TextEncoder();
	let bits = [];
	let offset = 0;

	function render() {
		box.textContent = "";
		bits = [];
		let bytes = 0;
		let chars = 0;
		for (const ch of input.value) {
			chars++;
			const b = [...enc.encode(ch)];
			bytes += b.length;
			const el = document.createElement("div");
			el.className = "char" + (b.length > 1 ? " multi" : "");
			const glyph = document.createElement("b");
			glyph.textContent = ch === " " ? "␣" : ch;
			el.appendChild(glyph);
			for (const byte of b) {
				const code = document.createElement("code");
				const bin = byte.toString(2).padStart(8, "0");
				code.textContent = bin;
				el.appendChild(code);
				for (const c of bin) bits.push(c === "1");
			}
			const small = document.createElement("small");
			small.textContent = b.length > 1 ? `${b.length} Bytes` : `Nr. ${b[0]}`;
			el.appendChild(small);
			box.appendChild(el);
		}
		const total = bytes * 8;
		const ns = (total / 100e6) * 1e9;
		note.textContent = chars
			? `${chars} Zeichen → ${bytes} Bytes → ${total} Bits. Mit 100 Mbit/s wären die in ${ns < 1000 ? `${nf(ns)} Nanosekunden` : `${nf(ns / 1000, 1)} Mikrosekunden`} durch die Leitung.`
			: "Tipp etwas ein.";
	}
	input.addEventListener("input", render);
	render();

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const bw = w < 520 ? 10 : 12;
		offset += dt * 60;
		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);

		// Glasfaser
		const fy = h * 0.76;
		const fh = h * 0.16;
		ctx.fillStyle = "#131a17";
		ctx.fillRect(0, fy - fh / 2, w, fh);
		if (!bits.length) return;
		const loop = bits.length + 12; // Pause zwischen Wiederholungen
		const start = Math.floor(offset / bw);
		ctx.globalCompositeOperation = "lighter";
		for (let x = -bw; x < w + bw; x += bw) {
			const idx = start + Math.floor(x / bw);
			const k = ((idx % loop) + loop) % loop;
			if (k >= bits.length || !bits[k]) continue;
			const px = x - (offset % bw);
			const g = ctx.createLinearGradient(0, fy - fh, 0, fy + fh);
			g.addColorStop(0, "rgba(111,227,163,0)");
			g.addColorStop(0.5, "rgba(111,227,163,0.9)");
			g.addColorStop(1, "rgba(111,227,163,0)");
			ctx.fillStyle = g;
			ctx.fillRect(px, fy - fh, bw - 1, fh * 2);
		}
		ctx.globalCompositeOperation = "source-over";

		// Rechteck-Signal darüber
		ctx.strokeStyle = "#6fe3a3";
		ctx.lineWidth = 2;
		ctx.beginPath();
		const hi = h * 0.3;
		const lo = h * 0.5;
		let prev = null;
		for (let x = -bw; x < w + bw; x += bw) {
			const idx = start + Math.floor(x / bw);
			const k = ((idx % loop) + loop) % loop;
			const v = k < bits.length && bits[k];
			const px = x - (offset % bw);
			const y = v ? hi : lo;
			if (prev === null) ctx.moveTo(px, y);
			else if (prev !== y) ctx.lineTo(px, y);
			ctx.lineTo(px + bw, y);
			prev = y;
		}
		ctx.stroke();
		ctx.fillStyle = "rgba(244,239,230,0.45)";
		ctx.font = "11px 'JetBrains Mono', monospace";
		ctx.textAlign = "left";
		ctx.fillText("1", 6, hi + 4);
		ctx.fillText("0", 6, lo + 4);
	});
})();

// =====================================================================
// 2 · Paketvermittlung durch ein Router-Netz
// =====================================================================
(() => {
	const canvas = document.getElementById("netCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 640 ? 1.05 : 2.4));
	const ui = {
		text: document.getElementById("netText"),
		send: document.getElementById("btnSendNet"),
		brk: document.getElementById("btnBreak"),
		repair: document.getElementById("btnRepair"),
		arrival: document.getElementById("arrivalSlots"),
		sorted: document.getElementById("sortedSlots"),
		note: document.getElementById("netNote"),
		readout: document.getElementById("netReadout"),
	};

	// Knoten: 0 = du, 10 = Server, 1–9 Router
	const NODES = [
		[0.05, 0.5, "Du"],
		[0.27, 0.18],
		[0.24, 0.5],
		[0.27, 0.82],
		[0.5, 0.12],
		[0.5, 0.5],
		[0.5, 0.88],
		[0.73, 0.18],
		[0.76, 0.5],
		[0.73, 0.82],
		[0.95, 0.5, "Server"],
	];
	const EDGES = [
		[0, 2], [2, 1], [2, 3], [1, 4], [1, 5], [2, 5], [3, 5], [3, 6], [4, 5], [5, 6],
		[4, 7], [5, 8], [6, 9], [7, 8], [8, 9], [5, 7], [5, 9], [7, 10], [8, 10], [9, 10],
	];
	const MOBILE_NODES = NODES.map(([x, y, l]) => [y, x, l]); // auf dem Handy von oben nach unten
	const nb = NODES.map(() => []);
	for (const [a, b] of EDGES) {
		nb[a].push(b);
		nb[b].push(a);
	}
	const broken = new Set();
	let packets = [];
	let msg = null;
	let stats = { sent: 0, lost: 0, resent: 0 };
	const SPEED = 0.42; // Anteil der Breite pro Sekunde
	const TIMEOUT = 4.5;

	const pos = (i) => {
		const { w, h } = size;
		const [x, y] = (w < 640 ? MOBILE_NODES : NODES)[i];
		return [lerp(28, w - 28, x), lerp(30, h - 30, y)];
	};

	function distances() {
		const d = NODES.map(() => Infinity);
		d[10] = 0;
		const q = [10];
		while (q.length) {
			const n = q.shift();
			for (const m of nb[n]) {
				if (broken.has(m) || d[m] !== Infinity) continue;
				d[m] = d[n] + 1;
				q.push(m);
			}
		}
		return d;
	}

	function nextHop(node) {
		const d = distances();
		const opts = nb[node].filter((m) => !broken.has(m) && d[m] === d[node] - 1);
		if (!opts.length) return null;
		// Gerne der Router, durch den gerade weniger Pakete laufen
		const load = (m) => packets.filter((p) => p.to === m && p.state === "fly").length;
		opts.sort((a, b) => load(a) - load(b) + (Math.random() - 0.5) * 1.5);
		return opts[0];
	}

	function launch(seq, resend = false) {
		const p = { seq, from: 0, to: nextHop(0), t: 0, wait: Math.random() * 0.15, state: "fly", born: performance.now() / 1000, path: [0] };
		if (p.to === null) p.state = "lost";
		packets.push(p);
		stats.sent++;
		if (resend) stats.resent++;
	}

	function send() {
		const text = ui.text.value || " ";
		const chunks = [];
		for (let i = 0; i < text.length; i += 2) chunks.push(text.slice(i, i + 2));
		msg = { chunks, got: new Map(), order: [], pending: new Map(), done: false };
		packets = [];
		stats = { sent: 0, lost: 0, resent: 0 };
		chunks.forEach((_, i) => setTimeout(() => {
			if (!msg || msg.chunks !== chunks) return;
			launch(i);
			msg.pending.set(i, performance.now() / 1000);
		}, i * 140));
		renderSlots();
	}
	ui.send.addEventListener("click", send);

	function toggle(i) {
		if (i === 0 || i === 10) return;
		if (broken.has(i)) broken.delete(i);
		else {
			broken.add(i);
			for (const p of packets) if (p.state === "fly" && (p.to === i || (p.from === i && p.t < 0.05))) p.state = "lost";
		}
	}
	ui.brk.addEventListener("click", () => {
		const cand = [1, 3, 4, 5, 6, 7, 8, 9].filter((i) => !broken.has(i));
		if (cand.length) toggle(cand[Math.floor(Math.random() * cand.length)]);
	});
	ui.repair.addEventListener("click", () => broken.clear());
	canvas.addEventListener("pointerdown", (e) => {
		const r = canvas.getBoundingClientRect();
		const x = e.clientX - r.left;
		const y = e.clientY - r.top;
		let best = -1;
		let bd = 30;
		NODES.forEach((_, i) => {
			const [nx, ny] = pos(i);
			const d = Math.hypot(nx - x, ny - y);
			if (d < bd) {
				bd = d;
				best = i;
			}
		});
		if (best >= 0) toggle(best);
	});

	const hue = (seq) => (seq * 47) % 360;
	function slot(text, seq, empty = false) {
		const el = document.createElement("span");
		el.className = "slot" + (empty ? " empty" : "");
		if (!empty) el.style.background = `hsl(${hue(seq)},70%,68%)`;
		el.textContent = empty ? "··" : text;
		if (!empty) {
			const s = document.createElement("sup");
			s.textContent = String(seq + 1);
			el.appendChild(s);
		}
		return el;
	}
	function renderSlots() {
		ui.arrival.textContent = "";
		ui.sorted.textContent = "";
		if (!msg) return;
		for (const seq of msg.order) ui.arrival.appendChild(slot(msg.chunks[seq], seq));
		msg.chunks.forEach((c, i) => ui.sorted.appendChild(msg.got.has(i) ? slot(c, i) : slot("", i, true)));
	}

	send();

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		const now = performance.now() / 1000;

		// Pakete bewegen
		for (const p of packets) {
			if (p.state !== "fly") continue;
			if (p.wait > 0) {
				p.wait -= dt;
				continue;
			}
			const [ax, ay] = pos(p.from);
			const [bx, by] = pos(p.to);
			const len = Math.hypot(bx - ax, by - ay) / w;
			p.t += (SPEED * dt) / Math.max(len, 0.01);
			if (p.t >= 1) {
				if (broken.has(p.to)) {
					p.state = "lost";
					continue;
				}
				p.path.push(p.to);
				if (p.to === 10) {
					p.state = "done";
					if (msg && !msg.got.has(p.seq)) {
						msg.got.set(p.seq, true);
						msg.order.push(p.seq);
						msg.pending.delete(p.seq);
						renderSlots();
					}
					continue;
				}
				const nxt = nextHop(p.to);
				if (nxt === null) {
					p.state = "lost";
					continue;
				}
				p.from = p.to;
				p.to = nxt;
				p.t = 0;
				p.wait = 0.05 + Math.random() * 0.3; // Warteschlange im Router
			}
		}
		for (const p of packets) if (p.state === "lost" && !p.lostAt) (p.lostAt = now), stats.lost++;

		// TCP: Was nach TIMEOUT nicht da ist, wird neu geschickt
		if (msg) {
			for (const [seq, at] of msg.pending) {
				if (now - at > TIMEOUT && !msg.got.has(seq)) {
					msg.pending.set(seq, now);
					launch(seq, true);
				}
			}
			if (!msg.done && msg.got.size === msg.chunks.length) msg.done = true;
		}

		// Zeichnen
		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		const d = distances();
		ctx.lineWidth = 2;
		for (const [a, b] of EDGES) {
			const [ax, ay] = pos(a);
			const [bx, by] = pos(b);
			const dead = broken.has(a) || broken.has(b);
			ctx.strokeStyle = dead ? "rgba(255,138,122,0.15)" : "rgba(111,227,163,0.22)";
			ctx.setLineDash(dead ? [4, 6] : []);
			ctx.beginPath();
			ctx.moveTo(ax, ay);
			ctx.lineTo(bx, by);
			ctx.stroke();
		}
		ctx.setLineDash([]);

		ctx.font = "11px 'Space Grotesk', sans-serif";
		ctx.textAlign = "center";
		NODES.forEach((n, i) => {
			const [x, y] = pos(i);
			const end = i === 0 || i === 10;
			const dead = broken.has(i);
			const r = end ? 18 : 13;
			ctx.fillStyle = end ? "#1d2a24" : dead ? "#2a1513" : "#141c18";
			ctx.strokeStyle = end ? "#6fe3a3" : dead ? "#ff8a7a" : d[i] === Infinity ? "rgba(255,255,255,0.2)" : "rgba(111,227,163,0.7)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = dead ? "#ff8a7a" : "rgba(244,239,230,0.75)";
			if (end) ctx.fillText(n[2], x, y + 4);
			else if (dead) {
				ctx.font = "bold 14px 'Space Grotesk', sans-serif";
				ctx.fillText("✕", x, y + 5);
				ctx.font = "11px 'Space Grotesk', sans-serif";
			} else {
				ctx.strokeStyle = "rgba(111,227,163,0.6)";
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(x - 6, y - 3);
				ctx.lineTo(x + 6, y - 3);
				ctx.moveTo(x - 6, y + 3);
				ctx.lineTo(x + 6, y + 3);
				ctx.stroke();
			}
		});

		for (const p of packets) {
			let x;
			let y;
			if (p.state === "fly") {
				const [ax, ay] = pos(p.from);
				const [bx, by] = pos(p.to);
				const t = p.wait > 0 ? 0 : clamp(p.t, 0, 1);
				x = lerp(ax, bx, t);
				y = lerp(ay, by, t);
			} else if (p.state === "lost" && now - p.lostAt < 1.2) {
				const [ax, ay] = pos(p.from);
				const [bx, by] = pos(p.to ?? p.from);
				const t = clamp(p.t, 0, 1);
				x = lerp(ax, bx, t);
				y = lerp(ay, by, t) + (now - p.lostAt) * 30;
				ctx.globalAlpha = 1 - (now - p.lostAt) / 1.2;
			} else continue;
			ctx.fillStyle = p.state === "lost" ? "#ff8a7a" : `hsl(${hue(p.seq)},70%,68%)`;
			ctx.beginPath();
			ctx.roundRect(x - 10, y - 8, 20, 16, 4);
			ctx.fill();
			ctx.fillStyle = "#0b0a09";
			ctx.font = "bold 10px 'JetBrains Mono', monospace";
			ctx.fillText(String(p.seq + 1), x, y + 4);
			ctx.font = "11px 'Space Grotesk', sans-serif";
			ctx.globalAlpha = 1;
		}

		ui.readout.textContent = `${stats.sent} gesendet · ${stats.lost} verloren · ${stats.resent} neu`;
		const reach = d[0] !== Infinity;
		if (!reach) ui.note.textContent = "Kein Weg mehr zum Server! Dein eigener Router ist die einzige Stelle ohne Umweg. Reparier etwas.";
		else if (msg && msg.done) {
			const inOrder = msg.order.every((v, i) => v === i);
			ui.note.textContent = inOrder
				? "Alles angekommen, diesmal sogar in der richtigen Reihenfolge."
				: "Alles angekommen, aber durcheinander! Der Empfänger sortiert die Pakete einfach nach ihrer Nummer.";
		} else if (stats.lost) ui.note.textContent = "Pakete verloren. Für sie kommt keine Empfangsbestätigung zurück, also schickt der Absender sie nach kurzer Zeit noch einmal.";
		else ui.note.textContent = "Die Pakete sind unterwegs. Jeder Router entscheidet selbst, wohin es weitergeht.";
	});
})();

// =====================================================================
// 3 · DNS-Anfrage als Ablaufdiagramm
// =====================================================================
(() => {
	const canvas = document.getElementById("dnsCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 0.95 : 1.15));
	const input = document.getElementById("dnsName");
	const btn = document.getElementById("btnDns");
	const log = document.getElementById("dnsLog");
	const readout = document.getElementById("dnsReadout");
	const cache = new Map();
	let run = null;

	function ipFor(domain) {
		if (domain === "github.io" || domain.endsWith(".github.io")) return "185.199.108.153";
		let h = 2166136261;
		for (const c of domain) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
		return `${(h >>> 24) % 200 + 20}.${(h >>> 16) & 255}.${(h >>> 8) & 255}.${h & 255}`;
	}

	function start() {
		const domain = input.value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "") || "newbobb.github.io";
		const labels = domain.split(".").filter(Boolean);
		const tld = labels.length ? labels[labels.length - 1] : "de";
		const zone = labels.slice(-2).join(".");
		const ip = ipFor(domain);
		const cached = cache.has(domain);
		const cols = ["Browser", "Provider", "Root", `.${tld}`, zone];
		const steps = cached
			? [
					[0, 1, `Wo ist ${domain}?`],
					[1, 0, `${ip} (aus dem Gedächtnis)`],
				]
			: [
					[0, 1, `Wo ist ${domain}?`],
					[1, 2, `Wer kennt .${tld}?`],
					[2, 1, `Frag die .${tld}-Server`],
					[1, 3, `Wer kennt ${zone}?`],
					[3, 1, `Frag den Nameserver von ${zone}`],
					[1, 4, `Welche Nummer hat ${domain}?`],
					[4, 1, ip],
					[1, 0, `${ip}, merk ich mir`],
				];
		const ms = cached ? [1, 1] : [4, 12, 12, 18, 18, 22, 22, 4];
		log.textContent = "";
		run = { cols, steps, ms, i: 0, t: 0, cached, ip, domain, total: 0 };
		readout.textContent = "";
		btn.disabled = true;
	}
	btn.addEventListener("click", start);
	input.addEventListener("keydown", (e) => e.key === "Enter" && start());

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		const cols = run ? run.cols : ["Browser", "Provider", "Root", ".io", "github.io"];
		const n = cols.length;
		const colX = (i) => lerp(w * 0.1, w * 0.9, i / (n - 1));
		const top = 66;
		const fs = w < 520 ? 10 : 12;
		ctx.font = `${fs}px 'Space Grotesk', sans-serif`;
		ctx.textAlign = "center";
		cols.forEach((c, i) => {
			const x = colX(i);
			ctx.fillStyle = i === 0 ? "#6fe3a3" : "rgba(244,239,230,0.75)";
			ctx.fillText(c.length > 14 ? c.slice(0, 13) + "…" : c, x, top - 14);
			ctx.strokeStyle = "rgba(255,255,255,0.12)";
			ctx.setLineDash([3, 5]);
			ctx.beginPath();
			ctx.moveTo(x, top);
			ctx.lineTo(x, h - 12);
			ctx.stroke();
			ctx.setLineDash([]);
		});
		if (!run) return;

		const rowH = Math.min(40, (h - top - 24) / Math.max(run.steps.length, 4));
		const drawArrow = (k, prog) => {
			const [a, b, label] = run.steps[k];
			const y = top + 18 + k * rowH;
			const x1 = colX(a);
			const x2 = colX(b);
			const xe = lerp(x1, x2, prog);
			ctx.strokeStyle = b < a ? "#59d0ff" : "#6fe3a3";
			ctx.fillStyle = ctx.strokeStyle;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(x1, y);
			ctx.lineTo(xe, y);
			ctx.stroke();
			const dir = Math.sign(x2 - x1);
			ctx.beginPath();
			ctx.moveTo(xe, y);
			ctx.lineTo(xe - dir * 7, y - 4);
			ctx.lineTo(xe - dir * 7, y + 4);
			ctx.fill();
			if (prog >= 1) {
				ctx.fillStyle = "rgba(244,239,230,0.7)";
				const text = label.length > 30 ? label.slice(0, 29) + "…" : label;
				ctx.fillText(text, (x1 + x2) / 2, y - 6);
			}
		};
		for (let k = 0; k < run.i; k++) drawArrow(k, 1);
		if (run.i < run.steps.length) {
			run.t += dt / 0.7;
			drawArrow(run.i, ease(clamp(run.t, 0, 1)));
			if (run.t >= 1) {
				const li = document.createElement("li");
				const [a, b, label] = run.steps[run.i];
				li.textContent = `${run.cols[a]} → ${run.cols[b]}: ${label}`;
				log.appendChild(li);
				run.total += run.ms[run.i];
				run.i++;
				run.t = 0;
				if (run.i === run.steps.length) {
					cache.set(run.domain, run.ip);
					btn.disabled = false;
					btn.textContent = "Nochmal fragen";
					readout.textContent = run.cached ? `${run.ip} · ≈ 1 ms` : `${run.ip} · ≈ ${run.total} ms`;
				}
			}
		}
	});
	input.addEventListener("input", () => (btn.textContent = "Nachschlagen"));
})();

// =====================================================================
// 4 · Ping: Lichtpuls hin und zurück
// =====================================================================
(() => {
	const canvas = document.getElementById("pingCanvas");
	const { ctx, size } = fitCanvas(canvas, (w) => (w < 520 ? 1.2 : 1.6));
	const destBox = document.getElementById("dest");
	const out = document.getElementById("pingOut");
	const note = document.getElementById("pingNote");
	// Entfernung in km; Glasfaser: 200 000 km/s und Umwege; Funk im All: 300 000 km/s
	const DEST = [
		{ name: "Berlin", km: 420, fiber: true, real: 12 },
		{ name: "New York", km: 6200, fiber: true, real: 85 },
		{ name: "São Paulo", km: 9800, fiber: true, real: 190 },
		{ name: "Tokio", km: 9350, fiber: true, real: 230 },
		{ name: "Sydney", km: 16500, fiber: true, real: 280 },
		{ name: "Mond", km: 384400, fiber: false },
		{ name: "Mars", km: 225e6, fiber: false },
	];
	let cur = null;

	function rttMs(d) {
		return d.fiber ? ((2 * d.km) / 200000) * 1000 : ((2 * d.km) / 300000) * 1000;
	}
	function fmtTime(ms) {
		if (ms < 1000) return `${nf(ms)} ms`;
		if (ms < 120000) return `${nf(ms / 1000, 1)} s`;
		return `${nf(ms / 60000, 0)} min`;
	}

	DEST.forEach((d) => {
		const b = document.createElement("button");
		b.className = "btn";
		b.type = "button";
		b.textContent = d.name;
		b.addEventListener("click", () => {
			destBox.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
			cur = { d, t: 0 };
			const min = rttMs(d);
			if (d.fiber)
				note.textContent = `${nf(d.km)} km Luftlinie. Selbst auf direktem Weg braucht das Licht hin und zurück ${fmtTime(min)}. Echte Pings liegen eher bei ${d.real} ms, weil Kabel Umwege machen und jeder Router kurz nachdenkt.`;
			else if (d.name === "Mond")
				note.textContent = `Funk zum Mond und zurück: ${fmtTime(min)}. Die Apollo-Astronauten antworteten deshalb immer mit spürbarer Pause.`;
			else note.textContent = `Im Mittel 225 Millionen km: Eine Antwort braucht ${fmtTime(min)}. Zwischen 6 und 44 Minuten, je nachdem, wo Erde und Mars gerade stehen.`;
		});
		destBox.appendChild(b);
	});

	whenVisible(canvas, (dt) => {
		const { w, h } = size;
		ctx.fillStyle = "#070605";
		ctx.fillRect(0, 0, w, h);
		const pad = 24;
		const y = h * 0.42;
		const logMax = Math.log10(225e6 * 2);
		const logMin = Math.log10(100);
		const X = (km) => pad + ((Math.log10(Math.max(km, 100)) - logMin) / (logMax - logMin)) * (w - 2 * pad);

		ctx.strokeStyle = "rgba(255,255,255,0.15)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(pad, y);
		ctx.lineTo(w - pad, y);
		ctx.stroke();
		ctx.font = `${w < 520 ? 10 : 11}px 'Space Grotesk', sans-serif`;
		ctx.textAlign = "center";
		DEST.forEach((d, i) => {
			const x = X(d.km);
			const active = cur && cur.d === d;
			ctx.fillStyle = active ? "#6fe3a3" : "rgba(244,239,230,0.45)";
			ctx.beginPath();
			ctx.arc(x, y, active ? 5 : 3, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillText(d.name, x, y + (i % 2 ? 30 : -14));
		});
		ctx.fillStyle = "#59d0ff";
		ctx.beginPath();
		ctx.arc(pad, y, 5, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "rgba(244,239,230,0.45)";
		ctx.textAlign = "left";
		ctx.fillText("Entfernung, logarithmisch", pad, h - 14);

		// Zeitleiste mit Vergleich
		const ty = h * 0.72;
		const tMax = 1000;
		const TX = (ms) => pad + clamp(ms / tMax, 0, 1) * (w - 2 * pad);
		ctx.fillStyle = "rgba(255,255,255,0.06)";
		ctx.fillRect(pad, ty - 8, w - 2 * pad, 16);
		ctx.fillStyle = "rgba(255,225,77,0.4)";
		ctx.fillRect(TX(100), ty - 8, TX(400) - TX(100), 16);
		ctx.fillStyle = "rgba(244,239,230,0.55)";
		ctx.textAlign = "center";
		ctx.fillText("ein Wimpernschlag", (TX(100) + TX(400)) / 2, ty + 24);
		ctx.textAlign = "left";
		ctx.fillText("0", pad, ty - 14);
		ctx.textAlign = "right";
		ctx.fillText("1 Sekunde", w - pad, ty - 14);

		if (!cur) {
			out.textContent = "";
			return;
		}
		const ms = rttMs(cur.d);
		// Zeitlupe: Erde langsam sichtbar machen, All zeitlich gerafft
		const dur = cur.d.fiber ? 1.6 + ms / 200 : 3;
		cur.t = Math.min(cur.t + dt / dur, 1.6);
		const prog = Math.min(cur.t, 1);
		const there = prog < 0.5 ? prog * 2 : 2 - prog * 2;
		const px = lerp(pad, X(cur.d.km), there);
		ctx.globalCompositeOperation = "lighter";
		const g = ctx.createRadialGradient(px, y, 0, px, y, 18);
		g.addColorStop(0, "rgba(111,227,163,1)");
		g.addColorStop(1, "rgba(111,227,163,0)");
		ctx.fillStyle = g;
		ctx.fillRect(px - 18, y - 18, 36, 36);
		ctx.globalCompositeOperation = "source-over";
		const shown = ms * prog;
		ctx.fillStyle = "#6fe3a3";
		ctx.fillRect(pad, ty - 8, TX(shown) - pad, 16);
		out.textContent = `${cur.d.name}: ${fmtTime(shown)}${prog >= 1 ? "" : " …"}`;
		if (ms > tMax && prog > 0) {
			ctx.fillStyle = "#6fe3a3";
			ctx.textAlign = "right";
			ctx.fillText(`→ ${fmtTime(ms)}`, w - pad, ty + 24);
		}
	});
})();
