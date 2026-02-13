const canvas = document.getElementById('viz');
const ctx = canvas.getContext('2d');

const ui = {
  player: document.getElementById('player'),
  file: document.getElementById('audio-file'),
  play: document.getElementById('play-btn'),
  pause: document.getElementById('pause-btn'),
  prev: document.getElementById('prev-btn'),
  next: document.getElementById('next-btn'),
  sceneSelect: document.getElementById('scene-select'),
  addCue: document.getElementById('add-cue-btn'),
  removeCue: document.getElementById('remove-cue-btn'),
  clearCues: document.getElementById('clear-cues-btn'),
  sceneChips: document.getElementById('scene-chips'),
  intensity: document.getElementById('intensity'),
  transition: document.getElementById('transition'),
  glow: document.getElementById('glow'),
  scrubber: document.getElementById('scrubber'),
  rail: document.getElementById('rail'),
  cueList: document.getElementById('cue-list'),
  timeReadout: document.getElementById('time-readout'),
  trackName: document.getElementById('track-name'),
  sceneIndicator: document.getElementById('scene-indicator'),
  sceneName: document.getElementById('scene-name'),
  energy: document.getElementById('energy'),
};

const SCENES = [
  'Prism Cathedral',
  'Aurora Tunnel',
  'Pulse Mosaic',
  'Orbital Mesh',
  'Liquid Curtains',
  'Vortex Needles',
  'Neon Skyline',
  'Fractal Lotus',
  'Meteor Rain',
  'Ribbon Storm',
  'Hex Matrix',
  'Crystal Shards',
  'Sonar Echo',
  'Plasma Threads',
  'City Wireframe',
  'Particle Bloom',
  'Chromatic Wormhole',
  'Glyph Rain',
  'Ink Smoke',
  'Quantum Lattice',
];

let audioCtx;
let analyser;
let source;
let freq;
let wave;
let ready = false;
let duration = 0;

const state = {
  intensity: Number(ui.intensity.value),
  transitionSpeed: Number(ui.transition.value),
  glow: Number(ui.glow.value),
  currentScene: 0,
  targetScene: 0,
  morph: 1,
  cues: [{ time: 0, scene: 0 }],
  activeCueIndex: 0,
};

const particles = Array.from({ length: 260 }, () => ({
  x: Math.random(),
  y: Math.random(),
  vx: (Math.random() - 0.5) * 0.0018,
  vy: (Math.random() - 0.5) * 0.0018,
  s: 1 + Math.random() * 2.8,
}));

const stars = Array.from({ length: 280 }, () => ({
  x: Math.random(),
  y: Math.random(),
  z: 0.1 + Math.random() * 1.9,
  tw: Math.random() * Math.PI * 2,
}));

const nodes = Array.from({ length: 48 }, (_, i) => ({
  a: (i / 48) * Math.PI * 2,
  r: 0.18 + Math.random() * 0.36,
  v: 0.2 + Math.random() * 0.8,
}));

function resize() {
  const ratio = window.devicePixelRatio || 1;
  const box = canvas.getBoundingClientRect();
  canvas.width = Math.max(360, Math.floor(box.width * ratio));
  canvas.height = Math.max(220, Math.floor(box.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function ensureAudioGraph() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.85;

  source = audioCtx.createMediaElementSource(ui.player);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  freq = new Uint8Array(analyser.frequencyBinCount);
  wave = new Uint8Array(analyser.frequencyBinCount);
}

function avg(start, end) {
  let sum = 0;
  for (let i = start; i < end; i++) sum += freq[i];
  return (sum / Math.max(1, end - start)) / 255;
}

function sampleFreq(norm) {
  const i = Math.max(0, Math.min(freq.length - 1, Math.floor(norm * (freq.length - 1))));
  return freq[i] / 255;
}

function sampleWave(norm) {
  const i = Math.max(0, Math.min(wave.length - 1, Math.floor(norm * (wave.length - 1))));
  return (wave[i] - 128) / 128;
}

function levels() {
  const n = freq.length;
  const bass = avg(2, Math.floor(n * 0.08));
  const mid = avg(Math.floor(n * 0.08), Math.floor(n * 0.3));
  const high = avg(Math.floor(n * 0.3), Math.floor(n * 0.68));
  const energy = avg(2, Math.floor(n * 0.68));
  return {
    bass,
    mid,
    high,
    energy,
    pulse: (bass * 0.55 + mid * 0.3 + high * 0.15) * state.intensity,
  };
}

function formatTime(sec) {
  const total = Math.max(0, Math.floor(sec));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function setPlaybackEnabled(enabled) {
  [ui.play, ui.pause, ui.prev, ui.next, ui.sceneSelect, ui.addCue, ui.removeCue, ui.clearCues, ui.scrubber].forEach((el) => {
    el.disabled = !enabled;
  });
}

function sortCues() {
  state.cues.sort((a, b) => a.time - b.time || a.scene - b.scene);
}

function sceneFromTime(sec) {
  let idx = 0;
  for (let i = 0; i < state.cues.length; i++) {
    if (state.cues[i].time <= sec) idx = i;
    else break;
  }
  state.activeCueIndex = idx;
  return state.cues[idx].scene;
}

function applyScene(scene) {
  if (scene === state.targetScene) return;
  state.currentScene = state.morph < 1 ? state.currentScene : state.targetScene;
  state.targetScene = scene;
  state.morph = 0;
  updateSceneMeta();
}

function updateSceneMeta() {
  ui.sceneIndicator.textContent = `Scene ${state.targetScene + 1} / ${SCENES.length}`;
  ui.sceneName.textContent = SCENES[state.targetScene];
  ui.sceneSelect.value = String(state.targetScene);

  Array.from(ui.sceneChips.children).forEach((chip, i) => {
    chip.classList.toggle('active', i === state.targetScene);
  });
}

function renderCueRail() {
  ui.rail.innerHTML = '';
  const max = Math.max(0.001, duration || 1);

  state.cues.forEach((cue, i) => {
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'marker';
    if (i === state.activeCueIndex) marker.classList.add('active');
    marker.dataset.index = String(i);
    marker.style.left = `${(cue.time / max) * 100}%`;
    marker.style.background = `hsl(${(cue.scene / SCENES.length) * 360}, 90%, 62%)`;
    marker.title = `${formatTime(cue.time)} - ${SCENES[cue.scene]}`;
    marker.addEventListener('click', () => {
      ui.player.currentTime = cue.time;
      syncTimelineUI();
      applyScene(sceneFromTime(cue.time));
      renderCueRail();
      renderCueList();
    });
    ui.rail.appendChild(marker);
  });
}

function renderCueList() {
  ui.cueList.innerHTML = '';

  state.cues.forEach((cue, i) => {
    const li = document.createElement('li');
    li.dataset.index = String(i);
    if (i === state.activeCueIndex) li.classList.add('active');
    const left = document.createElement('span');
    const right = document.createElement('span');

    left.textContent = `${formatTime(cue.time)} -> ${SCENES[cue.scene]}`;
    right.textContent = i === state.activeCueIndex ? 'active' : '';

    li.appendChild(left);
    li.appendChild(right);
    ui.cueList.appendChild(li);
  });
}

function updateCueHighlights() {
  Array.from(ui.rail.children).forEach((el, i) => {
    el.classList.toggle('active', i === state.activeCueIndex);
  });
  Array.from(ui.cueList.children).forEach((el, i) => {
    const active = i === state.activeCueIndex;
    el.classList.toggle('active', active);
    const right = el.lastElementChild;
    if (right) right.textContent = active ? 'active' : '';
  });
}

function setCueAtCurrentTime(scene) {
  if (!ready) return;
  const t = Number(ui.player.currentTime.toFixed(2));
  const hit = state.cues.find((cue) => Math.abs(cue.time - t) <= 0.12);

  if (hit) hit.scene = scene;
  else state.cues.push({ time: t, scene });

  sortCues();
  state.activeCueIndex = state.cues.findIndex((c) => c.time === t && c.scene === scene);
  if (state.activeCueIndex < 0) state.activeCueIndex = Math.max(0, state.cues.length - 1);

  applyScene(sceneFromTime(ui.player.currentTime));
  renderCueRail();
  renderCueList();
}

function removeCueAtCurrentTime() {
  if (!ready) return;
  const t = ui.player.currentTime;
  state.cues = state.cues.filter((cue) => !(Math.abs(cue.time - t) <= 0.15 && cue.time > 0.001));
  if (!state.cues.some((c) => c.time === 0)) state.cues.unshift({ time: 0, scene: 0 });
  sortCues();
  applyScene(sceneFromTime(ui.player.currentTime));
  renderCueRail();
  renderCueList();
}

function resetCues() {
  state.cues = [{ time: 0, scene: 0 }];
  state.activeCueIndex = 0;
  applyScene(0);
  renderCueRail();
  renderCueList();
}

function syncTimelineUI() {
  if (!ready || !duration) return;
  const cur = ui.player.currentTime || 0;
  ui.scrubber.value = String((cur / duration) * 100);
  ui.timeReadout.textContent = `${formatTime(cur)} / ${formatTime(duration)}`;
}

function drawBackground(lv, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `rgba(4, 9, 16, ${0.88 - lv.high * 0.16})`);
  g.addColorStop(1, `rgba(3, 5, 12, ${0.98 - lv.mid * 0.15})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const glow = 140 + lv.energy * 260;
  const alpha = state.glow;

  ctx.fillStyle = `rgba(77, 224, 255, ${(0.05 + lv.high * 0.16) * alpha})`;
  ctx.beginPath();
  ctx.arc(w * 0.18, h * 0.2, glow, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 94, 191, ${(0.05 + lv.bass * 0.2) * alpha})`;
  ctx.beginPath();
  ctx.arc(w * 0.82, h * 0.78, glow * 0.75, 0, Math.PI * 2);
  ctx.fill();
}

function withAlpha(alpha, drawFn) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  drawFn();
  ctx.restore();
}

function s0(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  for (let r = 0; r < 8; r++) {
    const base = Math.min(w, h) * (0.08 + r * 0.045) * (1 + lv.bass * 0.3);
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const n = sampleFreq(i / 120);
      const rad = base * (1 + n * 0.35 + Math.sin(a * 5 + t * 1.8 + r) * 0.07);
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${180 + r * 20 + lv.high * 90}, 95%, ${42 + r * 4}%, ${0.22 + lv.energy * 0.42})`;
    ctx.lineWidth = 1 + r * 0.35;
    ctx.stroke();
  }
}

function s1(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  for (let i = 0; i < 90; i++) {
    const p = i / 90;
    const z = (p + t * (0.1 + lv.mid * 0.2)) % 1;
    const rad = Math.max(6, z * Math.min(w, h) * 0.64);
    const a = p * Math.PI * 8 + t * 0.8;
    const x = cx + Math.cos(a) * rad * 0.2;
    const y = cy + Math.sin(a) * rad * 0.2;
    ctx.strokeStyle = `hsla(${200 + p * 170 + lv.high * 90}, 95%, ${46 + p * 22}%, ${0.08 + z * 0.62})`;
    ctx.lineWidth = 1 + (1 - z) * 2.2;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function s2(lv, t, w, h) {
  const cols = 30;
  const rows = 18;
  const cw = w / cols;
  const ch = h / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const n = sampleFreq((x + y * cols) / (cols * rows));
      const s = (0.25 + n * 1.3 + lv.pulse * 0.45) * Math.min(cw, ch);
      const ox = Math.sin(t * 1.5 + x * 0.35) * 2;
      const oy = Math.cos(t * 1.2 + y * 0.5) * 2;
      ctx.fillStyle = `hsla(${130 + n * 210}, 94%, ${36 + n * 34}%, ${0.1 + n * 0.72})`;
      ctx.fillRect(x * cw + cw * 0.5 - s * 0.3 + ox, y * ch + ch * 0.5 - s * 0.3 + oy, s * 0.6, s * 0.6);
    }
  }
}

function s3(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const pts = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const a = n.a + t * n.v * (0.3 + lv.mid);
    const r = Math.min(w, h) * n.r * (1 + lv.bass * 0.25);
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a * 1.3) * r * 0.68, i });
  }
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 150 + lv.energy * 120) {
        ctx.strokeStyle = `rgba(120,220,255,${0.02 + (1 - d / 250) * 0.28})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
  for (const p of pts) {
    ctx.fillStyle = `hsla(${180 + (p.i % 8) * 22 + lv.high * 80}, 94%, 64%, 0.9)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5 + lv.bass * 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function s4(lv, t, w, h) {
  const bands = 22;
  for (let i = 0; i < bands; i++) {
    const y = (i + 0.5) * (h / bands);
    ctx.beginPath();
    for (let x = 0; x <= w; x += 7) {
      const p = x / w;
      const sample = sampleWave(p);
      const wobble = Math.sin(x * 0.015 + t * (1.1 + i * 0.04) + i * 0.8);
      const amp = 9 + lv.mid * 30 + i * 0.3;
      const yy = y + sample * amp + wobble * (6 + lv.bass * 18);
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = `hsla(${188 + i * 8 + lv.high * 90}, 95%, ${35 + i * 1.5}%, ${0.23 + lv.energy * 0.34})`;
    ctx.lineWidth = 1 + i * 0.05;
    ctx.stroke();
  }
}

function s5(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  for (let i = 0; i < 320; i++) {
    const p = i / 320;
    const a = p * Math.PI * 20 + t * (0.7 + lv.high * 2.2);
    const r = p * Math.min(w, h) * 0.6;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const size = 0.6 + lv.bass * 2.7 + p * 1.2;
    ctx.fillStyle = `hsla(${250 + p * 120 + lv.mid * 90}, 95%, ${46 + p * 24}%, ${0.12 + (1 - p) * 0.62})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function s6(lv, t, w, h) {
  const bars = 100;
  const bw = w / bars;
  for (let i = 0; i < bars; i++) {
    const n = sampleFreq(i / bars);
    const bh = (0.07 + n * (0.95 + lv.energy)) * h;
    const x = i * bw;
    const y = h - bh;
    ctx.fillStyle = `hsla(${320 - i * 2.1 + lv.high * 130}, 95%, ${40 + n * 34}%, ${0.22 + n * 0.7})`;
    ctx.fillRect(x + 1, y, Math.max(1, bw - 2), bh);
    ctx.fillStyle = `rgba(255,255,255,${0.18 + n * 0.62})`;
    ctx.fillRect(x + 1, y - 3 + Math.sin(t * 7 + i) * 1.7, Math.max(1, bw - 2), 2);
  }
}

function s7(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const petals = 30;
  for (let layer = 0; layer < 5; layer++) {
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 + t * (0.14 + layer * 0.08);
      const n = sampleFreq(i / petals);
      const len = Math.min(w, h) * (0.11 + layer * 0.06) * (1 + n * 0.7 + lv.bass * 0.35);
      const x = cx + Math.cos(a) * len;
      const y = cy + Math.sin(a) * len;
      ctx.strokeStyle = `hsla(${36 + layer * 68 + i * 2 + lv.high * 100}, 95%, ${38 + layer * 11}%, ${0.18 + n * 0.66})`;
      ctx.lineWidth = 1 + n * 2.2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo((cx + x) * 0.5 + Math.sin(t + i) * 18, (cy + y) * 0.5 + Math.cos(t + i) * 18, x, y);
      ctx.stroke();
    }
  }
}

function s8(lv, t, w, h, dt) {
  for (const s of stars) {
    s.y += (0.08 + lv.energy * 0.52) * s.z * dt;
    s.x += Math.sin(t * 0.5 + s.tw) * 0.0002;
    if (s.y > 1.06) { s.y = -0.03; s.x = Math.random(); }
    const x = s.x * w;
    const y = s.y * h;
    const l = 9 + s.z * 32 + lv.bass * 24;
    const a = 0.16 + Math.sin(t * 2 + s.tw) * 0.1 + lv.high * 0.42;
    ctx.strokeStyle = `rgba(170,224,255,${a})`;
    ctx.lineWidth = 1 + s.z * 0.76;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - l * 0.22, y - l);
    ctx.stroke();
  }
}

function s9(lv, t, w, h, dt) {
  const ribbons = 14;
  for (let r = 0; r < ribbons; r++) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 10) {
      const p = x / w;
      const sample = sampleWave(p);
      const y = h * 0.5 + Math.sin(p * 16 + t * (1.4 + r * 0.08) + r) * (40 + lv.mid * 90) + sample * (38 + lv.bass * 110) + (r - ribbons / 2) * 17;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `hsla(${140 + r * 16 + lv.high * 100}, 95%, ${45 + r * 1.2}%, ${0.18 + lv.energy * 0.36})`;
    ctx.lineWidth = 1.2 + r * 0.11;
    ctx.stroke();
  }

  for (const p of particles) {
    p.x += p.vx * (0.9 + lv.energy * 2.2) * dt * 60;
    p.y += p.vy * (0.9 + lv.energy * 2.2) * dt * 60;
    if (p.x > 1) p.x = 0; if (p.x < 0) p.x = 1;
    if (p.y > 1) p.y = 0; if (p.y < 0) p.y = 1;
    ctx.fillStyle = `rgba(205,244,255,${0.18 + lv.high * 0.5})`;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, p.s * (0.4 + lv.bass * 1.4), 0, Math.PI * 2);
    ctx.fill();
  }
}

function s10(lv, t, w, h) {
  const size = Math.max(28, Math.min(w, h) / 16);
  const cols = Math.ceil(w / size) + 1;
  const rows = Math.ceil(h / size) + 1;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * size;
      const py = y * size;
      const n = sampleFreq(((x + y) % cols) / cols);
      const r = size * (0.2 + n * 0.58 + lv.bass * 0.2);
      const phase = (x * 0.7 + y * 0.5 + t * 1.6);
      ctx.strokeStyle = `hsla(${190 + n * 150 + lv.high * 80}, 95%, ${40 + n * 35}%, ${0.16 + n * 0.52})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k + phase * 0.06;
        const hx = px + Math.cos(a) * r;
        const hy = py + Math.sin(a) * r;
        if (k === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
}

function s11(lv, t, w, h) {
  const count = 120;
  const cx = w * 0.5;
  const cy = h * 0.5;
  for (let i = 0; i < count; i++) {
    const p = i / count;
    const a = p * Math.PI * 2 + t * 0.4;
    const rad = Math.min(w, h) * (0.12 + p * 0.5);
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a * 1.2) * rad * 0.7;
    const n = sampleFreq(p);
    const len = 12 + n * 50 + lv.bass * 40;
    ctx.strokeStyle = `hsla(${180 + p * 220}, 95%, ${48 + n * 28}%, ${0.2 + n * 0.62})`;
    ctx.lineWidth = 1 + n * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a + t) * len, y + Math.sin(a - t) * len);
    ctx.stroke();
  }
}

function s12(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  for (let i = 0; i < 14; i++) {
    const r = Math.min(w, h) * (0.05 + i * 0.055) * (1 + lv.bass * 0.3);
    ctx.strokeStyle = `hsla(${180 + i * 15 + lv.high * 80}, 95%, ${42 + i * 2.5}%, ${0.18 + lv.energy * 0.38})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 56; i++) {
    const a = (i / 56) * Math.PI * 2 + t;
    const n = sampleFreq(i / 56);
    const len = Math.min(w, h) * (0.16 + n * 0.3 + lv.mid * 0.25);
    ctx.strokeStyle = `rgba(210,242,255,${0.14 + n * 0.6})`;
    ctx.lineWidth = 1.1 + n * 2.4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    ctx.stroke();
  }
}

function s13(lv, t, w, h) {
  const lines = 48;
  for (let i = 0; i < lines; i++) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const p = x / w;
      const n = sampleFreq((p + i / lines) % 1);
      const sample = sampleWave((p * 1.3 + i * 0.02) % 1);
      const y = h * (i / lines) + Math.sin(p * 18 + t * (1.2 + i * 0.02)) * (18 + lv.mid * 34) + sample * (24 + lv.bass * 45) + n * 16;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `hsla(${220 + i * 3 + lv.high * 110}, 95%, ${35 + i * 0.8}%, ${0.08 + lv.energy * 0.24})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function s14(lv, t, w, h) {
  const cols = 34;
  const rows = 20;
  const cw = w / cols;
  const ch = h / rows;
  for (let y = 0; y < rows; y++) {
    ctx.beginPath();
    for (let x = 0; x < cols; x++) {
      const p = x / cols;
      const n = sampleFreq((p + y / rows) % 1);
      const yy = h * 0.25 + y * ch * 0.9 + Math.sin(p * 8 + t + y * 0.2) * (3 + lv.mid * 12) - n * (18 + lv.bass * 28);
      const xx = x * cw;
      if (x === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.strokeStyle = `hsla(${170 + y * 4 + lv.high * 60}, 88%, ${38 + y * 0.8}%, ${0.12 + lv.energy * 0.26})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function s15(lv, t, w, h, dt) {
  for (const p of particles) {
    p.x += p.vx * (0.7 + lv.energy * 2.8) * dt * 60;
    p.y += p.vy * (0.7 + lv.energy * 2.8) * dt * 60;
    if (p.x > 1) p.x = 0; if (p.x < 0) p.x = 1;
    if (p.y > 1) p.y = 0; if (p.y < 0) p.y = 1;

    const x = p.x * w;
    const y = p.y * h;
    const radius = p.s * (0.45 + lv.bass * 1.6 + Math.sin(t * 2 + p.x * 8) * 0.25);
    ctx.fillStyle = `hsla(${200 + lv.mid * 100 + p.s * 14}, 95%, ${58 + lv.high * 18}%, ${0.2 + lv.energy * 0.6})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function s16(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const layers = 120;
  for (let i = 0; i < layers; i++) {
    const p = i / layers;
    const a = p * Math.PI * 10 + t * (0.8 + lv.mid * 1.4);
    const r = Math.pow(p, 1.2) * Math.min(w, h) * 0.68;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const size = 1 + (1 - p) * 4 + lv.bass * 2;
    ctx.fillStyle = `hsla(${280 + p * 140 + lv.high * 80}, 95%, ${46 + p * 30}%, ${0.1 + (1 - p) * 0.7})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function s17(lv, t, w, h) {
  const cols = 22;
  const rows = 12;
  const cw = w / cols;
  const ch = h / rows;
  const chars = '[]{}<>/\\|=+-*#?@';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const p = (x + y * cols) / (cols * rows);
      const n = sampleFreq(p);
      const chIndex = Math.floor((n * (chars.length - 1) + t * 3 + x + y) % chars.length);
      const glyph = chars[chIndex];
      const size = 10 + n * 20 + lv.mid * 10;
      ctx.font = `700 ${size}px Manrope`;
      ctx.fillStyle = `hsla(${180 + p * 180 + lv.high * 90}, 95%, ${45 + n * 35}%, ${0.14 + n * 0.7})`;
      ctx.fillText(glyph, x * cw + cw * 0.5, y * ch + ch * 0.5 + Math.sin(t * 2 + x) * 2);
    }
  }
}

function s18(lv, t, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const blobs = 20;
  for (let i = 0; i < blobs; i++) {
    const p = i / blobs;
    const n = sampleFreq(p);
    const x = w * (0.1 + 0.8 * ((Math.sin(t * 0.5 + i) + 1) / 2));
    const y = h * (0.1 + 0.8 * ((Math.cos(t * 0.45 + i * 0.7) + 1) / 2));
    const r = 40 + n * 120 + lv.bass * 80;
    ctx.fillStyle = `hsla(${220 + p * 120 + lv.high * 80}, 95%, ${32 + n * 24}%, ${0.05 + n * 0.18})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function s19(lv, t, w, h) {
  const step = 26;
  for (let y = 0; y <= h; y += step) {
    for (let x = 0; x <= w; x += step) {
      const p = ((x / w) + (y / h)) * 0.5;
      const n = sampleFreq((p + t * 0.05) % 1);
      const waveVal = sampleWave((p * 1.5 + t * 0.1) % 1);
      const dx = Math.sin(t + y * 0.02) * (3 + lv.mid * 7);
      const dy = Math.cos(t + x * 0.02) * (3 + lv.mid * 7);
      const size = 1 + n * 4 + lv.bass * 2;

      ctx.strokeStyle = `hsla(${160 + n * 220 + lv.high * 70}, 95%, ${35 + n * 35}%, ${0.12 + lv.energy * 0.35})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + dx, y + dy);
      ctx.lineTo(x + dx + waveVal * 18, y + dy - step * 0.65);
      ctx.lineTo(x + dx + step * 0.65, y + dy + waveVal * 12);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = `rgba(220,245,255,${0.05 + n * 0.35})`;
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

const RENDERERS = [
  s0, s1, s2, s3, s4, s5, s6, s7, s8, s9,
  s10, s11, s12, s13, s14, s15, s16, s17, s18, s19,
];

function renderFrame(now, dt) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (!ready || !analyser) {
    ctx.fillStyle = '#050a13';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(237,245,255,0.8)';
    ctx.font = '600 20px Manrope';
    ctx.fillText('Lade eine Audio-Datei und setze dann Cue-Marker auf der Timeline.', 26, 44);
    return;
  }

  analyser.getByteFrequencyData(freq);
  analyser.getByteTimeDomainData(wave);
  const lv = levels();
  const t = now / 1000;

  ui.energy.textContent = `Energy ${Math.round(lv.energy * 100)}%`;

  drawBackground(lv, w, h);

  const desired = sceneFromTime(ui.player.currentTime || 0);
  applyScene(desired);

  if (state.morph < 1) {
    state.morph = Math.min(1, state.morph + dt * state.transitionSpeed);
  }

  const a = state.currentScene;
  const b = state.targetScene;

  withAlpha(a === b ? 1 : 1 - state.morph, () => RENDERERS[a](lv, t, w, h, dt));
  withAlpha(state.morph, () => RENDERERS[b](lv, t, w, h, dt));

  if (state.morph >= 1) state.currentScene = state.targetScene;

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const vg = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.25, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(0,0,0,${0.24 + state.glow * 0.2})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function initSceneUI() {
  SCENES.forEach((name, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `${i + 1}. ${name}`;
    ui.sceneSelect.appendChild(option);

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.textContent = String(i + 1);
    chip.title = name;
    chip.addEventListener('click', () => {
      ui.sceneSelect.value = String(i);
    });
    ui.sceneChips.appendChild(chip);
  });

  updateSceneMeta();
  renderCueRail();
  renderCueList();
}

let lastTs = performance.now();
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;

  renderFrame(ts, dt);
  syncTimelineUI();
  updateCueHighlights();
}

ui.file.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  ensureAudioGraph();
  ui.player.src = URL.createObjectURL(file);
  ui.trackName.textContent = file.name;
  ready = true;
  setPlaybackEnabled(true);

  try {
    await audioCtx.resume();
    await ui.player.play();
  } catch {
    // Browser may block autoplay until user interacts.
  }
});

ui.player.addEventListener('loadedmetadata', () => {
  duration = Number.isFinite(ui.player.duration) ? ui.player.duration : 0;
  syncTimelineUI();
  renderCueRail();
  renderCueList();
});

ui.play.addEventListener('click', async () => {
  if (!ready) return;
  await audioCtx.resume();
  await ui.player.play();
});

ui.pause.addEventListener('click', () => {
  if (!ready) return;
  ui.player.pause();
});

ui.prev.addEventListener('click', () => {
  const next = (Number(ui.sceneSelect.value) - 1 + SCENES.length) % SCENES.length;
  ui.sceneSelect.value = String(next);
  setCueAtCurrentTime(next);
});

ui.next.addEventListener('click', () => {
  const next = (Number(ui.sceneSelect.value) + 1) % SCENES.length;
  ui.sceneSelect.value = String(next);
  setCueAtCurrentTime(next);
});

ui.sceneSelect.addEventListener('change', () => {
  // Selection only; cue placement is explicit via Add Cue button.
});

ui.addCue.addEventListener('click', () => {
  if (!ready) return;
  setCueAtCurrentTime(Number(ui.sceneSelect.value));
});

ui.removeCue.addEventListener('click', removeCueAtCurrentTime);
ui.clearCues.addEventListener('click', resetCues);

ui.scrubber.addEventListener('input', () => {
  if (!ready || !duration) return;
  ui.player.currentTime = (Number(ui.scrubber.value) / 100) * duration;
  applyScene(sceneFromTime(ui.player.currentTime));
  renderCueRail();
  renderCueList();
  syncTimelineUI();
});

ui.intensity.addEventListener('input', () => { state.intensity = Number(ui.intensity.value); });
ui.transition.addEventListener('input', () => { state.transitionSpeed = Number(ui.transition.value); });
ui.glow.addEventListener('input', () => { state.glow = Number(ui.glow.value); });

window.addEventListener('resize', resize);

initSceneUI();
setPlaybackEnabled(false);
resize();
requestAnimationFrame(loop);
