"use strict";

// Ereignishorizont — Echtzeit-Raytracing eines Schwarzschild-Lochs.
// Einheiten: Schwarzschild-Radius Rs = 1. Photonensphäre bei 1.5, ISCO bei 3.

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;
uniform float uDiskTime;
uniform vec3 uCamPos;
uniform vec3 uCamF;
uniform vec3 uCamR;
uniform vec3 uCamU;
uniform float uGravity;
uniform float uDoppler;
uniform float uStep;
uniform float uFar;
uniform float uFocal;

const float INNER = 2.6;
const float OUTER = 15.0;

float hash(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float hash3(vec3 p) {
	p = fract(p * 0.3183099 + 0.1);
	p *= 17.0;
	return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
		mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
	float v = 0.0;
	float a = 0.5;
	mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
	for (int i = 0; i < 5; i++) {
		v += a * noise(p);
		p = m * p;
		a *= 0.5;
	}
	return v;
}

float noise3(vec3 p) {
	vec3 i = floor(p);
	vec3 f = fract(p);
	vec3 u = f * f * (3.0 - 2.0 * f);
	float a = mix(hash3(i), hash3(i + vec3(1, 0, 0)), u.x);
	float b = mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), u.x);
	float c = mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), u.x);
	float d = mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), u.x);
	return mix(mix(a, b, u.y), mix(c, d, u.y), u.z);
}

float fbm3(vec3 p) {
	float v = 0.0;
	float a = 0.5;
	for (int i = 0; i < 4; i++) {
		v += a * noise3(p);
		p = p * 2.03 + 11.7;
		a *= 0.5;
	}
	return v;
}

mat2 rot(float a) {
	float c = cos(a);
	float s = sin(a);
	return mat2(c, -s, s, c);
}

// Grobe Schwarzkörper-Rampe: rot -> orange -> weiß -> bläulich
vec3 blackbody(float t) {
	t = max(t, 0.0);
	vec3 c = vec3(1.0, 0.16, 0.02) * smoothstep(0.0, 0.3, t);
	c = mix(c, vec3(1.0, 0.5, 0.16), smoothstep(0.22, 0.55, t));
	c = mix(c, vec3(1.0, 0.86, 0.68), smoothstep(0.5, 0.95, t));
	c = mix(c, vec3(0.72, 0.84, 1.0), smoothstep(0.95, 1.6, t));
	return c;
}

vec4 disk(vec3 p, vec3 rd) {
	float r = length(p.xz);
	float edge = smoothstep(INNER, INNER + 0.45, r) * (1.0 - smoothstep(OUTER - 6.0, OUTER, r));
	if (edge <= 0.0) return vec4(0.0);

	// Kepler-Rotation; zwei Phasen überblenden, damit die Scherung nicht unendlich wächst
	float omega = pow(r, -1.5) * 2.2;
	float period = 9.0;
	float tA = fract(uDiskTime / period);
	float tB = fract(uDiskTime / period + 0.5);
	float wA = 1.0 - abs(1.0 - 2.0 * tA);
	vec2 qa = rot(omega * tA * period) * p.xz;
	vec2 qb = rot(omega * tB * period) * p.xz;
	float na = fbm(qa * 0.85 + 3.1);
	float nb = fbm(qb * 0.85 + 17.3);
	float n = mix(nb, na, wA);

	float rings = 0.82 + 0.18 * sin(r * 6.0 + n * 9.0);
	float dens = edge * pow(INNER / r, 1.5) * (0.12 + 1.9 * n * n * n * 1.6) * rings;

	// Relativistischer Doppler + Gravitationsrotverschiebung
	float beta = clamp(sqrt(0.5 / max(r - 1.0, 0.05)), 0.0, 0.9);
	vec3 vdir = normalize(vec3(-p.z, 0.0, p.x));
	float cosT = dot(vdir, -rd);
	float gam = inversesqrt(1.0 - beta * beta);
	float D = 1.0 / (gam * (1.0 - beta * cosT));
	D = mix(1.0, D, uDoppler);
	float g = mix(1.0, sqrt(max(1.0 - 1.0 / r, 0.0)) * 1.2, uDoppler);

	float temp = pow(INNER / r, 0.65) * 0.92 * D * g;
	float boost = mix(1.0, pow(D, 2.6), uDoppler);
	vec3 col = blackbody(temp) * dens * boost * 1.9;
	float alpha = clamp(dens * 1.25, 0.0, 0.9);
	return vec4(col, alpha);
}

vec3 starLayer(vec3 d, float scale, float threshold) {
	vec3 p = d * scale;
	vec3 cell = floor(p);
	vec3 f = fract(p) - 0.5;
	float h = hash3(cell);
	if (h < threshold) return vec3(0.0);
	vec3 off = vec3(hash3(cell + 1.3), hash3(cell + 2.7), hash3(cell + 4.1)) - 0.5;
	float dist = length(f - off * 0.5);
	float b = pow(max(0.0, 1.0 - dist * 2.6), 4.0) * (h - threshold) / (1.0 - threshold);
	float tint = hash3(cell + 7.7);
	vec3 c = mix(vec3(1.0, 0.78, 0.6), vec3(0.7, 0.82, 1.0), tint);
	return c * b * 3.0;
}

vec3 background(vec3 d) {
	vec3 col = vec3(0.0);
	col += starLayer(d, 70.0, 0.975);
	col += starLayer(d, 180.0, 0.985) * 0.7;

	float n = fbm3(d * 2.2);
	vec3 band = normalize(vec3(0.35, 1.0, 0.25));
	float milky = exp(-pow(dot(d, band), 2.0) * 10.0);
	col += vec3(0.32, 0.16, 0.5) * pow(n, 3.0) * 0.55;
	col += vec3(0.08, 0.16, 0.3) * pow(n, 2.0) * 0.25;
	col += milky * (0.04 + 0.22 * n * n) * vec3(0.75, 0.62, 0.9);
	col += milky * starLayer(d, 320.0, 0.94) * 0.6;
	return col;
}

vec3 aces(vec3 x) {
	return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
	vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
	vec3 rd = normalize(uCamF * uFocal + uCamR * uv.x + uCamU * uv.y);

	vec3 pos = uCamPos;
	vec3 vel = rd;
	vec3 hv = cross(pos, vel);
	float h2 = dot(hv, hv);

	vec3 col = vec3(0.0);
	float alpha = 0.0;
	bool captured = false;
	vec3 glow = vec3(0.0);

	for (int i = 0; i < 320; i++) {
		float r2 = dot(pos, pos);
		float r = sqrt(r2);
		if (r < 1.0) { captured = true; break; }

		float dt = clamp(0.065 * r, 0.02, 2.5) * uStep;
		vec3 acc = -1.5 * h2 * pos / (r2 * r2 * r) * uGravity;
		vel += acc * dt;
		vec3 np = pos + vel * dt;

		if (pos.y * np.y < 0.0) {
			float t = pos.y / (pos.y - np.y);
			vec3 hp = mix(pos, np, t);
			vec4 dk = disk(hp, normalize(vel));
			col += (1.0 - alpha) * dk.rgb;
			alpha += (1.0 - alpha) * dk.a;
			if (alpha > 0.985) break;
		}

		glow += exp(-(r - 1.0) * 2.4) * dt * vec3(1.0, 0.55, 0.25);
		pos = np;
		if (r > uFar && dot(pos, vel) > 0.0) break;
	}

	if (!captured) col += (1.0 - alpha) * background(normalize(vel));
	if (!captured) col += glow * 0.028 * (1.0 - alpha) * uGravity;

	col = aces(col * 0.95);
	col = pow(col, vec3(1.0 / 2.2));

	vec2 q = gl_FragCoord.xy / uRes;
	col *= 0.55 + 0.45 * pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.18);
	col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) / 255.0;

	gl_FragColor = vec4(col, 1.0);
}
`;

// ---------- Setup ----------

const canvas = document.getElementById("scene");
const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, powerPreference: "high-performance" });

if (!gl) {
	document.getElementById("fallback").hidden = false;
	throw new Error("WebGL nicht verfügbar");
}

function compile(type, src) {
	const s = gl.createShader(type);
	gl.shaderSource(s, src);
	gl.compileShader(s);
	if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
		throw new Error(gl.getShaderInfoLog(s));
	}
	return s;
}

const program = gl.createProgram();
gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
	document.getElementById("fallback").hidden = false;
	throw new Error(gl.getProgramInfoLog(program));
}
gl.useProgram(program);

const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
const aPos = gl.getAttribLocation(program, "aPos");
gl.enableVertexAttribArray(aPos);
gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

const U = {};
["uRes", "uTime", "uDiskTime", "uCamPos", "uCamF", "uCamR", "uCamU", "uGravity", "uDoppler", "uStep", "uFar", "uFocal"].forEach(
	(n) => (U[n] = gl.getUniformLocation(program, n))
);

const isCoarse = window.matchMedia("(pointer: coarse)").matches;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const maxScale = Math.min(window.devicePixelRatio || 1, isCoarse ? 1.25 : 1.5);
let renderScale = isCoarse ? 0.5 : 0.75;
const stepScale = isCoarse ? 1.35 : 1.0;

function resize() {
	const w = Math.max(1, Math.floor(canvas.clientWidth * renderScale));
	const h = Math.max(1, Math.floor(canvas.clientHeight * renderScale));
	if (canvas.width !== w || canvas.height !== h) {
		canvas.width = w;
		canvas.height = h;
		gl.viewport(0, 0, w, h);
	}
}
window.addEventListener("resize", resize);

// ---------- Kamera ----------

const MIN_DIST = 1.9;
const MAX_DIST = 40;
const cam = { yaw: 0.9, pitch: 0.09, dist: 19 };
const target = { ...cam };
let lastInteraction = -10;
let flight = null;

function clampTargets() {
	target.pitch = Math.max(-1.45, Math.min(1.45, target.pitch));
	target.dist = Math.max(MIN_DIST, Math.min(MAX_DIST, target.dist));
}

const pointers = new Map();
let pinchStart = 0;
let pinchDist = 0;

function interacted() {
	lastInteraction = performance.now() / 1000;
	if (flight) stopFlight();
	fadeIntro();
}

canvas.addEventListener("pointerdown", (e) => {
	canvas.setPointerCapture(e.pointerId);
	pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
	canvas.classList.add("dragging");
	if (pointers.size === 2) {
		const [a, b] = [...pointers.values()];
		pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
		pinchDist = target.dist;
	}
	interacted();
});

canvas.addEventListener("pointermove", (e) => {
	const p = pointers.get(e.pointerId);
	if (!p) return;
	const dx = e.clientX - p.x;
	const dy = e.clientY - p.y;
	p.x = e.clientX;
	p.y = e.clientY;
	if (pointers.size === 1) {
		const k = 3.2 / Math.max(canvas.clientHeight, 1);
		target.yaw -= dx * k;
		target.pitch += dy * k;
	} else if (pointers.size === 2) {
		const [a, b] = [...pointers.values()];
		const d = Math.hypot(a.x - b.x, a.y - b.y);
		if (pinchStart > 0) target.dist = pinchDist * (pinchStart / d);
	}
	clampTargets();
	lastInteraction = performance.now() / 1000;
});

function endPointer(e) {
	pointers.delete(e.pointerId);
	if (pointers.size < 2) pinchStart = 0;
	if (pointers.size === 0) canvas.classList.remove("dragging");
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);

canvas.addEventListener(
	"wheel",
	(e) => {
		e.preventDefault();
		target.dist *= Math.exp(e.deltaY * 0.0012);
		clampTargets();
		interacted();
	},
	{ passive: false }
);

window.addEventListener("keydown", (e) => {
	const step = 0.08;
	if (e.key === "ArrowLeft") target.yaw += step;
	else if (e.key === "ArrowRight") target.yaw -= step;
	else if (e.key === "ArrowUp") target.pitch += step;
	else if (e.key === "ArrowDown") target.pitch -= step;
	else if (e.key === "+" || e.key === "=") target.dist *= 0.9;
	else if (e.key === "-") target.dist *= 1.1;
	else return;
	clampTargets();
	interacted();
});

// ---------- Kinoflug ----------

const btnFlight = document.getElementById("btnFlight");
const FLIGHT_DURATION = 36;

function startFlight() {
	flight = { start: performance.now() / 1000, yaw0: target.yaw };
	btnFlight.classList.add("is-on");
	btnFlight.lastChild.textContent = "Flug läuft…";
	fadeIntro();
}

function stopFlight() {
	flight = null;
	btnFlight.classList.remove("is-on");
	btnFlight.lastChild.textContent = "Kinoflug";
}

btnFlight.addEventListener("click", () => (flight ? stopFlight() : startFlight()));

function updateFlight(now) {
	if (!flight) return;
	const t = (now - flight.start) / FLIGHT_DURATION;
	if (t >= 1) {
		stopFlight();
		lastInteraction = now;
		return;
	}
	const far = 0.5 + 0.5 * Math.cos(t * Math.PI * 2);
	target.dist = 2.9 + 25 * Math.pow(far, 1.6);
	target.pitch = 0.03 + 0.42 * Math.pow(far, 1.2) + 0.05 * Math.sin(t * Math.PI * 6);
	target.yaw = flight.yaw0 + t * Math.PI * 1.4;
}

// ---------- Schalter ----------

const state = { gravity: 1, doppler: 1 };
const shown = { gravity: 1, doppler: 1 };

function bindToggle(id, key) {
	const btn = document.getElementById(id);
	btn.addEventListener("click", () => {
		state[key] = state[key] ? 0 : 1;
		btn.classList.toggle("is-on", !!state[key]);
		btn.setAttribute("aria-pressed", String(!!state[key]));
	});
}
bindToggle("btnGravity", "gravity");
bindToggle("btnDoppler", "doppler");

const info = document.getElementById("info");
const btnInfo = document.getElementById("btnInfo");
function setInfo(open) {
	info.hidden = !open;
	btnInfo.setAttribute("aria-expanded", String(open));
	btnInfo.classList.toggle("is-on", open);
}
btnInfo.addEventListener("click", () => setInfo(info.hidden));
document.getElementById("btnInfoClose").addEventListener("click", () => setInfo(false));

// ---------- Intro ----------

const intro = document.getElementById("intro");
let introFaded = false;
function fadeIntro() {
	if (introFaded) return;
	introFaded = true;
	intro.classList.add("is-faded");
}
setTimeout(fadeIntro, 9000);

// ---------- Ton: Drone, der mit der Zeitdilatation tiefer wird ----------

const btnSound = document.getElementById("btnSound");
let audio = null;

function createAudio() {
	const AC = window.AudioContext || window.webkitAudioContext;
	if (!AC) return null;
	const ctx = new AC();
	const master = ctx.createGain();
	master.gain.value = 0;

	const delay = ctx.createDelay(2);
	delay.delayTime.value = 0.42;
	const feedback = ctx.createGain();
	feedback.gain.value = 0.42;
	const wet = ctx.createGain();
	wet.gain.value = 0.35;
	delay.connect(feedback).connect(delay);
	delay.connect(wet).connect(master);
	master.connect(ctx.destination);

	const filter = ctx.createBiquadFilter();
	filter.type = "lowpass";
	filter.frequency.value = 320;
	filter.Q.value = 5;
	filter.connect(master);
	filter.connect(delay);

	const lfo = ctx.createOscillator();
	lfo.frequency.value = 0.06;
	const lfoGain = ctx.createGain();
	lfoGain.gain.value = 140;
	lfo.connect(lfoGain).connect(filter.frequency);
	lfo.start();

	const voices = [
		{ type: "sine", ratio: 0.5, detune: 0, gain: 0.5 },
		{ type: "sawtooth", ratio: 1, detune: -7, gain: 0.16 },
		{ type: "sawtooth", ratio: 1, detune: 7, gain: 0.16 },
		{ type: "triangle", ratio: 1.5, detune: 3, gain: 0.12 },
		{ type: "sine", ratio: 3, detune: -4, gain: 0.05 },
	].map((v) => {
		const o = ctx.createOscillator();
		o.type = v.type;
		o.detune.value = v.detune;
		const g = ctx.createGain();
		g.gain.value = v.gain;
		o.connect(g).connect(filter);
		o.start();
		return { osc: o, ratio: v.ratio };
	});

	const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
	const data = noiseBuf.getChannelData(0);
	for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
	const noise = ctx.createBufferSource();
	noise.buffer = noiseBuf;
	noise.loop = true;
	const band = ctx.createBiquadFilter();
	band.type = "bandpass";
	band.frequency.value = 500;
	band.Q.value = 0.6;
	const noiseGain = ctx.createGain();
	noiseGain.gain.value = 0.05;
	noise.connect(band).connect(noiseGain).connect(master);
	noise.start();

	return { ctx, master, filter, voices, band, noiseGain, on: false };
}

btnSound.addEventListener("click", () => {
	if (!audio) audio = createAudio();
	if (!audio) return;
	audio.on = !audio.on;
	if (audio.ctx.state === "suspended") audio.ctx.resume();
	const now = audio.ctx.currentTime;
	audio.master.gain.cancelScheduledValues(now);
	audio.master.gain.setTargetAtTime(audio.on ? 0.32 : 0, now, audio.on ? 0.8 : 0.25);
	btnSound.classList.toggle("is-on", audio.on);
	btnSound.setAttribute("aria-pressed", String(audio.on));
});

function updateAudio(r) {
	if (!audio || !audio.on) return;
	const dil = Math.sqrt(Math.max(1 - 1 / r, 0.02));
	const now = audio.ctx.currentTime;
	const base = 55 * dil;
	for (const v of audio.voices) v.osc.frequency.setTargetAtTime(base * v.ratio, now, 0.15);
	audio.filter.frequency.setTargetAtTime(220 + 2600 / r, now, 0.2);
	audio.band.frequency.setTargetAtTime(300 + 2400 / r, now, 0.2);
	audio.noiseGain.gain.setTargetAtTime(0.03 + 0.12 / r, now, 0.2);
}

// ---------- HUD ----------

const hudDist = document.getElementById("hudDist");
const hudTime = document.getElementById("hudTime");
const hudEscape = document.getElementById("hudEscape");
const hudBar = document.getElementById("hudBar");
const hudNote = document.getElementById("hudNote");
const RS_KM = 1.27e7; // Schwarzschild-Radius von Sagittarius A*
const fmt1 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const fmt2 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const fmt0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
let hudTimer = 0;

function formatDuration(hours) {
	if (hours < 1.995) return `${fmt2.format(hours)} h draußen`;
	if (hours < 48) return `${fmt1.format(hours)} h draußen`;
	return `${fmt1.format(hours / 24)} Tage draußen`;
}

function updateHud(r) {
	const km = r * RS_KM;
	const distText = km > 1e9 ? `${fmt1.format(km / 1e9)} Mrd. km` : `${fmt0.format(km / 1e6)} Mio. km`;
	hudDist.textContent = `${fmt1.format(r)} Rs · ${distText}`;
	const dil = Math.sqrt(Math.max(1 - 1 / r, 1e-6));
	hudTime.textContent = formatDuration(1 / dil);
	hudEscape.textContent = `${fmt0.format(Math.min(Math.sqrt(1 / r), 1) * 100)} % c`;
	hudBar.style.width = `${(1 - dil) * 100}%`;
	if (r < 1.5) {
		hudNote.textContent = "Innerhalb der Photonensphäre: Licht kann hier im Kreis laufen.";
		hudNote.classList.add("is-danger");
	} else if (r < 3) {
		hudNote.textContent = "Keine stabile Umlaufbahn mehr möglich. Nur mit Triebwerk kommst du wieder weg.";
		hudNote.classList.add("is-danger");
	} else {
		hudNote.textContent = "Maßstab: Sagittarius A*, Zentrum der Milchstraße";
		hudNote.classList.remove("is-danger");
	}
}

// ---------- Renderloop ----------

let last = performance.now() / 1000;
let diskTime = 0;
let frameAcc = 0;
let frameCount = 0;
const startTime = last;

function lerpFactor(dt, speed) {
	return 1 - Math.exp(-dt * speed);
}

function frame() {
	const now = performance.now() / 1000;
	const dt = Math.min(now - last, 0.1);
	last = now;

	// Adaptive Auflösung für flüssige Framerate
	frameAcc += dt;
	frameCount++;
	if (frameCount >= 24) {
		const avg = frameAcc / frameCount;
		if (avg > 1 / 40 && renderScale > 0.3) renderScale = Math.max(0.3, renderScale * 0.85);
		else if (avg < 1 / 58 && renderScale < maxScale) renderScale = Math.min(maxScale, renderScale * 1.06);
		frameAcc = 0;
		frameCount = 0;
	}
	resize();

	updateFlight(now);
	if (!flight && now - lastInteraction > 5 && !reducedMotion) target.yaw += dt * 0.035;

	const k = lerpFactor(dt, flight ? 2.2 : 6);
	cam.yaw += (target.yaw - cam.yaw) * k;
	cam.pitch += (target.pitch - cam.pitch) * k;
	cam.dist += (target.dist - cam.dist) * k;

	const kt = lerpFactor(dt, 2.5);
	shown.gravity += (state.gravity - shown.gravity) * kt;
	shown.doppler += (state.doppler - shown.doppler) * kt;

	const cp = Math.cos(cam.pitch);
	const pos = [cam.dist * cp * Math.cos(cam.yaw), cam.dist * Math.sin(cam.pitch), cam.dist * cp * Math.sin(cam.yaw)];
	const f = [-pos[0] / cam.dist, -pos[1] / cam.dist, -pos[2] / cam.dist];
	let rgt = [-f[2], 0, f[0]]; // cross(f, up)
	const rl = Math.hypot(rgt[0], rgt[2]) || 1;
	rgt = [rgt[0] / rl, 0, rgt[2] / rl];
	const up = [rgt[1] * f[2] - rgt[2] * f[1], rgt[2] * f[0] - rgt[0] * f[2], rgt[0] * f[1] - rgt[1] * f[0]];

	diskTime += dt * (reducedMotion ? 0.25 : 1);

	gl.uniform2f(U.uRes, canvas.width, canvas.height);
	gl.uniform1f(U.uTime, now - startTime);
	gl.uniform1f(U.uDiskTime, diskTime);
	gl.uniform3fv(U.uCamPos, pos);
	gl.uniform3fv(U.uCamF, f);
	gl.uniform3fv(U.uCamR, rgt);
	gl.uniform3fv(U.uCamU, up);
	gl.uniform1f(U.uGravity, shown.gravity);
	gl.uniform1f(U.uDoppler, shown.doppler);
	gl.uniform1f(U.uStep, stepScale);
	gl.uniform1f(U.uFar, Math.max(cam.dist + 6, 30));
	// Weitwinkel in der Nähe, damit der Schatten nicht das ganze Bild schluckt
	const near = Math.min(Math.max((cam.dist - 2) / 14, 0), 1);
	gl.uniform1f(U.uFocal, 0.62 + 0.93 * near * near * (3 - 2 * near));
	gl.drawArrays(gl.TRIANGLES, 0, 3);

	hudTimer -= dt;
	if (hudTimer <= 0) {
		updateHud(cam.dist);
		updateAudio(cam.dist);
		hudTimer = 0.1;
	}

	requestAnimationFrame(frame);
}

resize();
updateHud(cam.dist);
requestAnimationFrame(frame);
