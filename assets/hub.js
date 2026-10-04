// Newbobb Lab · Hub: Sternbild, Zeitreise, Befehlspalette, Archiv und kleine Effekte.
(() => {
	"use strict";

	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const lerp = (a, b, t) => a + (b - a) * t;
	const $ = (s, el = document) => el.querySelector(s);
	const $$ = (s, el = document) => [...el.querySelectorAll(s)];
	const CAT = {
		learn: { name: "Verstehen", color: "#ffb366" },
		play: { name: "Spielen lernen", color: "#b3a4ff" },
		audio: { name: "Audio & Visuals", color: "#5ce1e6" },
		lab: { name: "Experimente", color: "#ff6ad5" },
		fach: { name: "Fach", color: "#b8a6ff" },
	};

	$("#year").textContent = new Date().getFullYear();

	// ---------- Projekte aus dem Archiv lesen (eine Quelle für alles) ----------
	const cards = $$("#grid .card");
	const projects = [];
	const seen = new Set();
	for (const c of cards) {
		const href = c.getAttribute("href");
		if (seen.has(href)) continue;
		seen.add(href);
		projects.push({
			href,
			cat: c.dataset.cat,
			title: $("h3", c).textContent.trim(),
			desc: $("p", c)?.textContent.trim() ?? "",
			meta: $(".card-meta span", c)?.textContent.trim() ?? "",
			year: $$(".card-meta span", c)[1]?.textContent.trim() ?? "",
		});
	}
	$("#statAll").textContent = projects.length;
	// Fächer-Seiten tauchen nur in der Suche auf, nicht im Sternbild
	const palSource = projects.concat(
		$$(".fx-tile").map((t) => ({
			href: t.getAttribute("href"),
			cat: "fach",
			title: $("b", t).textContent.trim(),
			desc: $("small", t)?.textContent.trim() ?? "",
			meta: "Fach",
			year: "",
		}))
	);

	// ---------- Cursor-Licht und Fußzeilen-Glanz ----------
	if (finePointer && !reduced) {
		const cur = $(".cursor");
		let tx = innerWidth / 2;
		let ty = innerHeight / 2;
		let cx = tx;
		let cy = ty;
		window.addEventListener("pointermove", (e) => {
			tx = e.clientX;
			ty = e.clientY;
			document.body.classList.add("has-pointer");
		}, { passive: true });
		const loop = () => {
			cx = lerp(cx, tx, 0.12);
			cy = lerp(cy, ty, 0.12);
			cur.style.transform = `translate(${cx}px, ${cy}px)`;
			requestAnimationFrame(loop);
		};
		loop();
	}
	const footWord = $(".foot-word");
	footWord.addEventListener("pointermove", (e) => {
		const r = footWord.getBoundingClientRect();
		footWord.style.setProperty("--fx", `${e.clientX - r.left}px`);
		footWord.style.setProperty("--fy", `${e.clientY - r.top}px`);
	});
	footWord.addEventListener("pointerleave", () => footWord.style.setProperty("--fx", "-999px"));
	footWord.style.setProperty("--fx", "-999px");

	// ---------- Dock: ausblenden beim Runterscrollen, aktiver Abschnitt ----------
	const dock = $("#dock");
	let lastY = scrollY;
	window.addEventListener("scroll", () => {
		const y = scrollY;
		dock.classList.toggle("is-hidden", y > lastY && y > 300 && !palOpen());
		lastY = y;
	}, { passive: true });
	const spyLinks = $$("[data-spy]");
	const spy = new IntersectionObserver((entries) => {
		for (const en of entries) {
			if (!en.isIntersecting) continue;
			spyLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.spy === en.target.id));
		}
	}, { rootMargin: "-45% 0px -50% 0px" });
	["faecher", "verstehen", "spielen", "neu", "archiv"].forEach((id) => spy.observe(document.getElementById(id)));

	// ---------- Wechselndes Wort im Titel ----------
	const rot = $(".rotator");
	const WORDS = ["Anfassen.", "Ausprobieren.", "Verstehen.", "Hören.", "Staunen."];
	if (!reduced) {
		let wi = 0;
		setInterval(() => {
			const old = $("span", rot);
			old.classList.add("out");
			setTimeout(() => {
				wi = (wi + 1) % WORDS.length;
				const s = document.createElement("span");
				s.className = "in";
				s.textContent = WORDS[wi];
				rot.replaceChildren(s);
			}, 380);
		}, 2800);
	}

	// ---------- Magnetische Buttons ----------
	if (finePointer && !reduced) {
		for (const b of $$(".magnetic")) {
			b.addEventListener("pointermove", (e) => {
				const r = b.getBoundingClientRect();
				const x = e.clientX - r.left - r.width / 2;
				const y = e.clientY - r.top - r.height / 2;
				b.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
			});
			b.addEventListener("pointerleave", () => (b.style.transform = ""));
		}
	}

	// ---------- 3D-Neigung und Lichtfleck auf Karten ----------
	for (const el of $$(".lesson, .card")) {
		el.addEventListener("pointermove", (e) => {
			const r = el.getBoundingClientRect();
			const px = (e.clientX - r.left) / r.width;
			const py = (e.clientY - r.top) / r.height;
			el.style.setProperty("--mx", `${px * 100}%`);
			el.style.setProperty("--my", `${py * 100}%`);
			if (finePointer && !reduced && el.classList.contains("lesson")) {
				el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 7}deg) rotateY(${(px - 0.5) * 9}deg) translateY(-6px)`;
			}
		});
		el.addEventListener("pointerleave", () => {
			if (el.classList.contains("lesson")) el.style.transform = "";
		});
	}

	// ---------- Einblenden ----------
	const io = new IntersectionObserver((entries) => entries.forEach((en) => {
		if (!en.isIntersecting) return;
		en.target.classList.add("is-in");
		io.unobserve(en.target);
	}), { rootMargin: "0px 0px -6% 0px" });
	$$(".reveal").forEach((el, i) => {
		el.style.transitionDelay = `${(i % 4) * 60}ms`;
		io.observe(el);
	});

	// =====================================================================
	// Sternbild: jeder Stern ist ein Projekt
	// =====================================================================
	const sky = $("#sky");
	const tip = $("#skyTip");
	const sctx = sky.getContext("2d");
	let SW = 0;
	let SH = 0;
	let stars = [];
	let dust = [];
	let hover = null;
	let spot = null; // automatisch hervorgehobener Stern
	let shooting = null;
	const mouse = { x: -1e4, y: -1e4, px: 0, py: 0, in: false };

	// reproduzierbarer Zufall, damit das Sternbild bei jedem Besuch gleich aussieht
	let seed = 7;
	const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

	function layoutSky() {
		const dpr = Math.min(devicePixelRatio || 1, 2);
		const r = sky.getBoundingClientRect();
		SW = r.width;
		SH = r.height;
		sky.width = Math.round(SW * dpr);
		sky.height = Math.round(SH * dpr);
		sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		seed = 7;
		const wide = SW > 820;
		const learn = projects.filter((p) => p.cat === "learn");
		const quad = (t, a, b, c) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
		// Verstehen als Zeitbogen in der Reihenfolge der Entdeckung
		const P = wide ? [[0.5, 0.9], [0.6, 0.12], [0.97, 0.26]] : [[0.06, 0.5], [0.4, 0.04], [0.95, 0.18]];
		const clusters = wide
			? { audio: [0.86, 0.72, 0.075], lab: [0.7, 0.62, 0.06], play: [0.5, 0.2, 0.04] }
			: { audio: [0.78, 0.44, 0.1], lab: [0.48, 0.38, 0.08], play: [0.18, 0.2, 0.06] };
		stars = projects.map((p) => {
			let x;
			let y;
			if (p.cat === "learn") {
				const t = learn.indexOf(p) / Math.max(1, learn.length - 1);
				x = quad(t, P[0][0], P[1][0], P[2][0]) + (rnd() - 0.5) * 0.025;
				y = quad(t, P[0][1], P[1][1], P[2][1]) + (rnd() - 0.5) * 0.04;
			} else {
				const [cx, cy, rr] = clusters[p.cat] || [0.8, 0.3, 0.06];
				const a = rnd() * Math.PI * 2;
				const d = Math.sqrt(rnd()) * rr;
				x = cx + Math.cos(a) * d * (SH / SW) * 1.6;
				y = cy + Math.sin(a) * d * 1.6;
			}
			return { p, x: clamp(x, 0.03, 0.97), y: clamp(y, 0.1, 0.95), r: p.cat === "learn" ? 3 : 2.4, tw: rnd() * 6, ox: 0, oy: 0, glow: 0 };
		});
		dust = Array.from({ length: Math.round((SW * SH) / 5200) }, () => ({ x: rnd(), y: rnd(), z: rnd(), s: rnd() * 1.2 + 0.2, tw: rnd() * 6 }));
	}

	function starPos(s) {
		const par = 14 * (s.p.cat === "learn" ? 1 : 0.7);
		return [s.x * SW + s.ox - mouse.px * par, s.y * SH + s.oy - mouse.py * par];
	}

	function findStar(x, y) {
		let best = null;
		let bd = 26;
		for (const s of stars) {
			const [sx, sy] = starPos(s);
			const d = Math.hypot(sx - x, sy - y);
			if (d < bd) {
				bd = d;
				best = s;
			}
		}
		return best;
	}

	function showTip(s) {
		if (!s) {
			tip.classList.remove("is-on");
			return;
		}
		const [x, y] = starPos(s);
		const c = CAT[s.p.cat];
		tip.innerHTML = `<b></b><small></small>`;
		tip.firstChild.textContent = s.p.title;
		tip.lastChild.textContent = `${c.name}${s.p.cat === "learn" && s.p.year ? ` · ${s.p.year}` : ""}`;
		tip.style.setProperty("--tip-c", c.color);
		const tw = tip.offsetWidth || 200;
		const left = clamp(x + 16, 8, SW - tw - 8);
		const top = clamp(y - 56, 70, SH - 60);
		tip.style.left = `${left}px`;
		tip.style.top = `${top}px`;
		tip.classList.add("is-on");
	}

	sky.addEventListener("pointermove", (e) => {
		const r = sky.getBoundingClientRect();
		mouse.x = e.clientX - r.left;
		mouse.y = e.clientY - r.top;
		mouse.in = true;
		const s = findStar(mouse.x, mouse.y);
		if (s !== hover) {
			hover = s;
			sky.style.cursor = s ? "pointer" : "";
			showTip(s);
		} else if (s) showTip(s);
	});
	sky.addEventListener("pointerleave", () => {
		mouse.in = false;
		mouse.x = mouse.y = -1e4;
		hover = null;
		showTip(null);
	});
	sky.addEventListener("click", (e) => {
		const r = sky.getBoundingClientRect();
		const s = findStar(e.clientX - r.left, e.clientY - r.top);
		if (s) location.href = s.p.href;
	});

	// Ab und zu stellt sich ein Stern von selbst vor
	let spotT = 0;
	function tickSpot(dt) {
		spotT -= dt;
		if (hover || mouse.in) return;
		if (spotT <= 0) {
			spot = stars[Math.floor(Math.random() * stars.length)];
			spotT = 3.2;
			showTip(spot);
		} else if (spotT < 0.6 && spot) {
			showTip(null);
			spot = null;
		}
	}

	let skyVisible = true;
	let last = performance.now();
	function drawSky(now) {
		if (!skyVisible) return;
		const dt = Math.min(0.05, (now - last) / 1000);
		last = now;
		const t = now / 1000;
		const tx = mouse.in ? (mouse.x / SW - 0.5) : 0;
		const ty = mouse.in ? (mouse.y / SH - 0.5) : 0;
		mouse.px = lerp(mouse.px, tx, 0.05);
		mouse.py = lerp(mouse.py, ty, 0.05);
		if (!reduced) tickSpot(dt);

		sctx.clearRect(0, 0, SW, SH);

		// Sternenstaub mit Parallaxe
		for (const d of dust) {
			const x = (d.x * SW - mouse.px * 40 * d.z + (reduced ? 0 : t * 3 * d.z)) % SW;
			const y = d.y * SH - mouse.py * 40 * d.z;
			const a = 0.15 + 0.35 * d.z * (0.6 + 0.4 * Math.sin(t * 1.3 + d.tw));
			sctx.fillStyle = `rgba(230,235,255,${a})`;
			sctx.fillRect(x < 0 ? x + SW : x, y, d.s, d.s);
		}

		// Sternschnuppe
		if (!reduced && !shooting && Math.random() < dt * 0.12) {
			shooting = { x: Math.random() * SW * 0.8 + SW * 0.2, y: Math.random() * SH * 0.3, t: 0 };
		}
		if (shooting) {
			shooting.t += dt;
			const k = shooting.t / 0.9;
			const x = shooting.x - k * 260;
			const y = shooting.y + k * 130;
			const g = sctx.createLinearGradient(x, y, x + 90, y - 45);
			g.addColorStop(0, `rgba(255,255,255,${0.8 * (1 - k)})`);
			g.addColorStop(1, "rgba(255,255,255,0)");
			sctx.strokeStyle = g;
			sctx.lineWidth = 1.5;
			sctx.beginPath();
			sctx.moveTo(x, y);
			sctx.lineTo(x + 90, y - 45);
			sctx.stroke();
			if (k >= 1) shooting = null;
		}

		// Sterne weichen dem Mauszeiger leicht aus (wie eine Gravitationslinse)
		for (const s of stars) {
			const bx = s.x * SW;
			const by = s.y * SH;
			let fx = 0;
			let fy = 0;
			if (mouse.in && !reduced) {
				const dx = bx - mouse.x;
				const dy = by - mouse.y;
				const d = Math.hypot(dx, dy) || 1;
				if (d < 140) {
					const f = (1 - d / 140) * 16;
					fx = (dx / d) * f;
					fy = (dy / d) * f;
				}
			}
			s.ox = lerp(s.ox, fx, 0.1);
			s.oy = lerp(s.oy, fy, 0.1);
			s.glow = lerp(s.glow, s === hover || s === spot ? 1 : 0, 0.15);
		}

		// Linien: Verstehen als chronologische Kette, sonst nächster Nachbar in der Gruppe
		sctx.lineWidth = 1;
		for (const cat of Object.keys(CAT)) {
			const group = stars.filter((s) => s.p.cat === cat);
			const col = CAT[cat].color;
			for (let i = 0; i < group.length; i++) {
				let j;
				if (cat === "learn") j = i + 1;
				else {
					let bd = Infinity;
					for (let k = 0; k < group.length; k++) {
						if (k === i) continue;
						const d = Math.hypot(group[k].x - group[i].x, group[k].y - group[i].y);
						if (d < bd && k > i) {
							bd = d;
							j = k;
						}
					}
				}
				if (j === undefined || j >= group.length) continue;
				const [x1, y1] = starPos(group[i]);
				const [x2, y2] = starPos(group[j]);
				const lit = Math.max(group[i].glow, group[j].glow);
				sctx.strokeStyle = col;
				sctx.globalAlpha = 0.16 + lit * 0.5;
				sctx.beginPath();
				sctx.moveTo(x1, y1);
				sctx.lineTo(x2, y2);
				sctx.stroke();
			}
		}
		sctx.globalAlpha = 1;

		// Wandernder Lichtpunkt auf dem Zeitbogen
		const learn = stars.filter((s) => s.p.cat === "learn");
		if (learn.length > 1 && !reduced) {
			const u = (t * 0.06) % 1;
			const f = u * (learn.length - 1);
			const i = Math.floor(f);
			const [x1, y1] = starPos(learn[i]);
			const [x2, y2] = starPos(learn[i + 1]);
			const x = lerp(x1, x2, f - i);
			const y = lerp(y1, y2, f - i);
			const g = sctx.createRadialGradient(x, y, 0, x, y, 14);
			g.addColorStop(0, "rgba(255,210,150,0.9)");
			g.addColorStop(1, "rgba(255,179,102,0)");
			sctx.fillStyle = g;
			sctx.beginPath();
			sctx.arc(x, y, 14, 0, Math.PI * 2);
			sctx.fill();
		}

		// Sterne
		for (const s of stars) {
			const [x, y] = starPos(s);
			const col = CAT[s.p.cat].color;
			const tw = 0.75 + 0.25 * Math.sin(t * 2 + s.tw);
			const R = s.r * (1 + s.glow * 0.8);
			const halo = sctx.createRadialGradient(x, y, 0, x, y, R * (6 + s.glow * 6));
			halo.addColorStop(0, col);
			halo.addColorStop(1, "rgba(0,0,0,0)");
			sctx.globalAlpha = 0.28 * tw + s.glow * 0.4;
			sctx.fillStyle = halo;
			sctx.beginPath();
			sctx.arc(x, y, R * (6 + s.glow * 6), 0, Math.PI * 2);
			sctx.fill();
			sctx.globalAlpha = 1;
			sctx.fillStyle = "#fff";
			sctx.beginPath();
			sctx.arc(x, y, R * tw, 0, Math.PI * 2);
			sctx.fill();
			if (s.glow > 0.05) {
				sctx.strokeStyle = col;
				sctx.globalAlpha = s.glow;
				sctx.lineWidth = 1.2;
				sctx.beginPath();
				sctx.arc(x, y, R + 8 + Math.sin(t * 4) * 1.5, 0, Math.PI * 2);
				sctx.stroke();
				// Kreuzstrahlen
				sctx.beginPath();
				sctx.moveTo(x - 18, y);
				sctx.lineTo(x + 18, y);
				sctx.moveTo(x, y - 18);
				sctx.lineTo(x, y + 18);
				sctx.globalAlpha = s.glow * 0.4;
				sctx.stroke();
				sctx.globalAlpha = 1;
			}
		}
		requestAnimationFrame(drawSky);
	}
	layoutSky();
	window.addEventListener("resize", () => {
		layoutSky();
	});
	new IntersectionObserver(([en]) => {
		const was = skyVisible;
		skyVisible = en.isIntersecting;
		if (skyVisible && !was) {
			last = performance.now();
			requestAnimationFrame(drawSky);
		}
	}).observe(sky);
	requestAnimationFrame(drawSky);

	// Überrasch mich: zufälliger Stern leuchtet auf, dann geht es los
	$("#btnRandom").addEventListener("click", () => {
		const s = stars[Math.floor(Math.random() * stars.length)];
		spot = s;
		spotT = 99;
		showTip(s);
		setTimeout(() => (location.href = s.p.href), reduced ? 0 : 900);
	});

	// =====================================================================
	// Zeitreise: horizontale Fahrt durch die Reihe Verstehen
	// =====================================================================
	const tl = $("#verstehen");
	const pin = $("#tlPin");
	const viewport = $("#tlViewport");
	const track = $("#tlTrack");
	const yearEl = $("#tlYear");
	const fill = $("#tlFill");
	const ticksEl = $("#tlTicks");
	const lessons = $$(".lesson", track);
	const years = lessons.map((l) => {
		const t = $(".lesson-num", l).textContent;
		return t.includes("·") ? t.split("·")[1].trim() : t;
	});
	const shortYear = (y) => y.replace("vor 400 000 Jahren", "−400 000").replace("um ", "").replace(" v. Chr.", " v. C.");
	const ticks = lessons.map((l, i) => {
		const b = document.createElement("button");
		b.type = "button";
		b.style.left = `${(i / (lessons.length - 1)) * 100}%`;
		b.setAttribute("aria-label", `${$("h3", l).textContent} (${years[i]})`);
		const sp = document.createElement("span");
		sp.textContent = shortYear(years[i]);
		b.appendChild(sp);
		b.addEventListener("click", () => goTo(i));
		ticksEl.appendChild(b);
		return b;
	});

	let pinned = false;
	let maxX = 0;
	function setupTimeline() {
		pinned = !reduced && innerWidth >= 900 && innerHeight >= 640;
		tl.classList.toggle("is-pinned", pinned);
		track.style.transform = "";
		if (pinned) {
			maxX = Math.max(0, track.scrollWidth - innerWidth);
			pin.style.height = `${maxX + innerHeight}px`;
		} else {
			pin.style.height = "";
		}
		updateTimeline();
	}
	function progress() {
		if (pinned) {
			const top = pin.getBoundingClientRect().top;
			return clamp(-top / Math.max(1, pin.offsetHeight - innerHeight), 0, 1);
		}
		const m = viewport.scrollWidth - viewport.clientWidth;
		return m > 0 ? viewport.scrollLeft / m : 0;
	}
	let cur = -1;
	function updateTimeline() {
		const p = progress();
		if (pinned) track.style.transform = `translate3d(${-p * maxX}px,0,0)`;
		fill.style.transform = `scaleX(${p})`;
		const i = Math.round(p * (lessons.length - 1));
		if (i !== cur) {
			cur = i;
			yearEl.textContent = shortYear(years[i]);
			yearEl.classList.remove("flip");
			void yearEl.offsetWidth;
			yearEl.classList.add("flip");
			ticks.forEach((t, k) => {
				t.classList.toggle("is-past", k < i);
				t.classList.toggle("is-current", k === i);
			});
		}
	}
	function goTo(i) {
		const p = i / (lessons.length - 1);
		if (pinned) {
			const top = pin.getBoundingClientRect().top + scrollY;
			scrollTo({ top: top + p * (pin.offsetHeight - innerHeight), behavior: reduced ? "auto" : "smooth" });
		} else {
			lessons[i].scrollIntoView({ behavior: reduced ? "auto" : "smooth", inline: "center", block: "nearest" });
		}
	}
	window.addEventListener("scroll", () => pinned && updateTimeline(), { passive: true });
	viewport.addEventListener("scroll", () => !pinned && updateTimeline(), { passive: true });
	window.addEventListener("resize", setupTimeline);
	// Mausrad im ungepinnten Modus horizontal nutzen
	window.addEventListener("load", setupTimeline);
	setupTimeline();

	// =====================================================================
	// Archiv: Filter und Suche
	// =====================================================================
	const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");
	const filterBtns = $$("[data-filter]");
	const search = $("#archiveSearch");
	const countEl = $("#resultCount");
	const emptyEl = $("#empty");
	let filter = "all";
	filterBtns.forEach((b) => {
		const f = b.dataset.filter;
		$("sup", b).textContent = f === "all" ? cards.length : cards.filter((c) => c.dataset.cat === f).length;
		b.addEventListener("click", () => setFilter(f));
	});
	function setFilter(f) {
		filter = f;
		filterBtns.forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.filter === f)));
		applyArchive();
	}
	function applyArchive() {
		const q = norm(search.value.trim());
		const words = q.split(/\s+/).filter(Boolean);
		let n = 0;
		for (const c of cards) {
			const hay = norm(c.textContent + " " + (CAT[c.dataset.cat]?.name ?? ""));
			const ok = (filter === "all" || c.dataset.cat === filter) && words.every((w) => hay.includes(w));
			c.classList.toggle("is-hidden", !ok);
			if (ok) {
				n++;
				c.classList.add("is-in");
			}
		}
		countEl.textContent = `${n} ${n === 1 ? "Projekt" : "Projekte"}`;
		emptyEl.hidden = n > 0;
	}
	search.addEventListener("input", applyArchive);
	$$("[data-jump-filter]").forEach((a) => a.addEventListener("click", () => setFilter(a.dataset.jumpFilter)));
	applyArchive();

	// =====================================================================
	// Befehlspalette (⌘K / Strg+K / „/“)
	// =====================================================================
	const pal = $("#pal");
	const palInput = $("#palInput");
	const palList = $("#palList");
	let palItems = [];
	let palSel = 0;
	let lastFocus = null;
	const palOpen = () => !pal.hidden;
	const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
	const ORDER = { fach: 0, learn: 1, play: 2, lab: 3, audio: 4 };

	function renderPal() {
		const q = norm(palInput.value.trim());
		const words = q.split(/\s+/).filter(Boolean);
		palItems = palSource
			.map((p) => {
				const t = norm(p.title);
				const hay = norm(`${p.title} ${p.desc} ${p.meta} ${CAT[p.cat].name}`);
				if (!words.every((w) => hay.includes(w))) return null;
				let score = 0;
				for (const w of words) score += t.startsWith(w) ? 4 : t.includes(w) ? 2 : 1;
				return { p, score };
			})
			.filter(Boolean)
			.sort((a, b) => b.score - a.score || ORDER[a.p.cat] - ORDER[b.p.cat]);
		palSel = 0;
		if (!palItems.length) {
			palList.innerHTML = `<li class="pal-empty" role="option" aria-disabled="true">Nichts gefunden. Vielleicht „Feuer“, „KI“ oder „Audio“?</li>`;
			return;
		}
		palList.innerHTML = palItems
			.map(({ p }, i) => {
				let title = esc(p.title);
				for (const w of words) {
					const idx = norm(p.title).indexOf(w);
					if (idx >= 0) {
						title = `${esc(p.title.slice(0, idx))}<mark>${esc(p.title.slice(idx, idx + w.length))}</mark>${esc(p.title.slice(idx + w.length))}`;
						break;
					}
				}
				return `<li role="option" id="pal-${i}" aria-selected="${i === 0}" data-i="${i}" style="--c:${CAT[p.cat].color}"><span class="dot"></span><span><b>${title}</b><small>${esc(p.desc)}</small></span><span class="cat">${esc(CAT[p.cat].name)}</span></li>`;
			})
			.join("");
		palInput.setAttribute("aria-activedescendant", "pal-0");
	}
	function selectPal(i) {
		if (!palItems.length) return;
		palSel = (i + palItems.length) % palItems.length;
		$$("li", palList).forEach((li, k) => li.setAttribute("aria-selected", String(k === palSel)));
		const li = $(`#pal-${palSel}`);
		li?.scrollIntoView({ block: "nearest" });
		palInput.setAttribute("aria-activedescendant", `pal-${palSel}`);
	}
	function openPal() {
		lastFocus = document.activeElement;
		pal.hidden = false;
		dock.classList.remove("is-hidden");
		palInput.value = "";
		renderPal();
		document.documentElement.style.overflow = "hidden";
		requestAnimationFrame(() => palInput.focus());
	}
	function closePal() {
		pal.hidden = true;
		document.documentElement.style.overflow = "";
		lastFocus?.focus?.();
	}
	palInput.addEventListener("input", renderPal);
	palInput.addEventListener("keydown", (e) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			selectPal(palSel + 1);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			selectPal(palSel - 1);
		} else if (e.key === "Enter" && palItems[palSel]) {
			location.href = palItems[palSel].p.href;
		}
	});
	palList.addEventListener("pointermove", (e) => {
		const li = e.target.closest("li[data-i]");
		if (li && Number(li.dataset.i) !== palSel) selectPal(Number(li.dataset.i));
	});
	palList.addEventListener("click", (e) => {
		const li = e.target.closest("li[data-i]");
		if (li) location.href = palItems[Number(li.dataset.i)].p.href;
	});
	$$("[data-open-palette]").forEach((b) => b.addEventListener("click", openPal));
	$$("[data-close-palette]").forEach((b) => b.addEventListener("click", closePal));
	pal.addEventListener("keydown", (e) => {
		if (e.key === "Escape") closePal();
		if (e.key === "Tab") {
			e.preventDefault();
			palInput.focus();
		}
	});
	window.addEventListener("keydown", (e) => {
		const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
		if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			palOpen() ? closePal() : openPal();
		} else if (e.key === "/" && !typing && !palOpen()) {
			e.preventDefault();
			openPal();
		}
	});
	// Kürzel passend zum System anzeigen
	if (!/Mac|iPhone|iPad/.test(navigator.platform)) $$(".dock-search kbd, .linklike kbd").forEach((k) => (k.textContent = "Strg K"));

	// =====================================================================
	// Teaser: kleines Schwarzes Loch in 2D
	// =====================================================================
	const cv = $("#teaser");
	const ctx = cv.getContext("2d");
	let W = 0;
	let H = 0;
	let visible = true;
	const parts = Array.from({ length: 1100 }, () => {
		const r = 1.35 + Math.pow(Math.random(), 1.6) * 1.9;
		return { r, a: Math.random() * Math.PI * 2, s: 0.6 + Math.random() * 0.8 };
	});
	function size() {
		const dpr = Math.min(devicePixelRatio || 1, 2);
		const rect = cv.getBoundingClientRect();
		W = rect.width;
		H = rect.height;
		cv.width = Math.round(W * dpr);
		cv.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}
	function color(r, bright) {
		const t = Math.max(0, Math.min(1, (3.2 - r) / 1.9));
		return `hsla(${22 + t * 18}, 100%, ${55 + t * 35}%, ${bright})`;
	}
	function draw(time) {
		if (!visible) return;
		const R = Math.min(W, H) * 0.16;
		const cx = W * 0.5;
		const cy = H * 0.52;
		const tilt = 0.2 + Math.sin(time * 0.00015) * 0.04;
		ctx.globalCompositeOperation = "source-over";
		ctx.fillStyle = "rgba(0,0,0,0.35)";
		ctx.fillRect(0, 0, W, H);
		const halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 3.2);
		halo.addColorStop(0, "rgba(255,150,70,0.10)");
		halo.addColorStop(1, "rgba(0,0,0,0)");
		ctx.fillStyle = halo;
		ctx.fillRect(0, 0, W, H);
		ctx.globalCompositeOperation = "lighter";
		const front = [];
		for (const p of parts) {
			if (!reduced) p.a += (0.004 * p.s) / Math.pow(p.r, 1.5);
			const ca = Math.cos(p.a);
			const sa = Math.sin(p.a);
			const dop = 0.55 + 0.45 * ca;
			const x = cx - ca * p.r * R;
			const y = cy + sa * p.r * R * tilt;
			if (sa < 0) {
				const rr = R * (1.05 + (p.r - 1.35) * 0.42);
				ctx.fillStyle = color(p.r, 0.35 * dop);
				ctx.fillRect(cx - ca * rr, cy + sa * rr * 0.98, 1.6, 1.6);
				ctx.fillStyle = color(p.r, 0.55 * dop);
				ctx.fillRect(x, y, 1.4, 1.4);
			} else {
				front.push(x, y, p.r, dop);
				const rr = R * (1.02 + (p.r - 1.35) * 0.12);
				ctx.fillStyle = color(p.r, 0.12 * dop);
				ctx.fillRect(cx - ca * rr, cy + sa * rr, 1.2, 1.2);
			}
		}
		ctx.globalCompositeOperation = "source-over";
		ctx.fillStyle = "#000";
		ctx.beginPath();
		ctx.arc(cx, cy, R, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "rgba(255,225,190,0.55)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(cx, cy, R * 1.015, 0, Math.PI * 2);
		ctx.stroke();
		ctx.globalCompositeOperation = "lighter";
		for (let i = 0; i < front.length; i += 4) {
			ctx.fillStyle = color(front[i + 2], 0.75 * front[i + 3]);
			ctx.fillRect(front[i], front[i + 1], 1.8, 1.8);
		}
		requestAnimationFrame(draw);
	}
	size();
	window.addEventListener("resize", size);
	new IntersectionObserver(([en]) => {
		const was = visible;
		visible = en.isIntersecting;
		if (visible && !was) requestAnimationFrame(draw);
	}).observe(cv);
	requestAnimationFrame(draw);
})();
