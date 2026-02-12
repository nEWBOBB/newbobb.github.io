const canvas = document.getElementById('viz');
const ctx = canvas.getContext('2d');

const player = document.getElementById('player');
const fileInput = document.getElementById('audio-file');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const sceneSelect = document.getElementById('scene-select');
const intensitySlider = document.getElementById('intensity');
const autoCycle = document.getElementById('auto-cycle');
const beatJump = document.getElementById('beat-jump');
const trackName = document.getElementById('track-name');
const chipList = document.getElementById('chip-list');
const hudName = document.getElementById('hud-name');
const hudEnergy = document.getElementById('hud-energy');
const sceneLabel = document.getElementById('scene-label');

const scenes = [
  'Prism Bloom',
  'Spectrum Tunnel',
  'Pulse Grid',
  'Orbital Nodes',
  'Liquid Stripes',
  'Vortex Field',
  'Neon Bars',
  'Fractal Flower',
  'Starfall',
  'Ribbon Storm'
];

let audioCtx;
let analyser;
let sourceNode;
let freqData;
let timeData;
let ready = false;
let intensity = Number(intensitySlider.value);

let activeScene = 0;
let targetScene = 0;
let morph = 1;
let autoTimer = 0;
let beatCooldown = 0;

const particles = Array.from({ length: 180 }, () => ({
  x: Math.random(),
  y: Math.random(),
  vx: (Math.random() - 0.5) * 0.0018,
  vy: (Math.random() - 0.5) * 0.0018,
  s: 1 + Math.random() * 3.3,
}));

const nodes = Array.from({ length: 40 }, (_, i) => {
  const a = (i / 40) * Math.PI * 2;
  return { a, r: 0.18 + Math.random() * 0.38, v: 0.2 + Math.random() * 0.8 };
});

const stars = Array.from({ length: 220 }, () => ({
  x: Math.random(),
  y: Math.random(),
  z: 0.15 + Math.random() * 1.4,
  tw: Math.random() * Math.PI * 2,
}));

function setupUI() {
  scenes.forEach((name, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = `${idx + 1}. ${name}`;
    sceneSelect.appendChild(opt);

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.textContent = `${idx + 1}`;
    chip.title = name;
    chip.addEventListener('click', () => selectScene(idx));
    chipList.appendChild(chip);
  });
  refreshSceneUI();
}

function setControls(state) {
  [playBtn, pauseBtn, prevBtn, nextBtn, sceneSelect].forEach((el) => { el.disabled = !state; });
}

function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.83;

  sourceNode = audioCtx.createMediaElementSource(player);
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  freqData = new Uint8Array(analyser.frequencyBinCount);
  timeData = new Uint8Array(analyser.frequencyBinCount);
}

function resize() {
  const ratio = window.devicePixelRatio || 1;
  const box = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, Math.floor(box.width * ratio));
  canvas.height = Math.max(180, Math.floor(box.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function avg(a, b) {
  let sum = 0;
  for (let i = a; i < b; i++) sum += freqData[i];
  return (sum / Math.max(1, b - a)) / 255;
}

function levels() {
  const n = freqData.length;
  const bass = avg(2, Math.floor(n * 0.08));
  const mid = avg(Math.floor(n * 0.08), Math.floor(n * 0.28));
  const high = avg(Math.floor(n * 0.3), Math.floor(n * 0.62));
  const energy = avg(2, Math.floor(n * 0.62));
  return { bass, mid, high, energy, pulse: (bass * 0.6 + mid * 0.3 + high * 0.1) * intensity };
}

function background(lv, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `rgba(5, 10, 18, ${0.84 - lv.high * 0.18})`);
  g.addColorStop(1, `rgba(2, 4, 10, ${0.97 - lv.mid * 0.18})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const glow = 160 + lv.energy * 280;
  ctx.fillStyle = `rgba(90, 240, 255, ${0.05 + lv.high * 0.13})`;
  ctx.beginPath();
  ctx.arc(w * 0.16, h * 0.2, glow, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 70, 175, ${0.04 + lv.bass * 0.18})`;
  ctx.beginPath();
  ctx.arc(w * 0.82, h * 0.78, glow * 0.78, 0, Math.PI * 2);
  ctx.fill();
}

function withAlpha(alpha, fn) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  fn();
  ctx.restore();
}

function drawPrismBloom(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const rings = 7;
  for (let r = 0; r < rings; r++) {
    const rad = Math.min(w, h) * (0.1 + r * 0.07) * (1 + lv.bass * 0.25);
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const a = (i / 100) * Math.PI * 2;
      const idx = Math.floor((i / 100) * (freqData.length - 1));
      const n = freqData[idx] / 255;
      const bump = 1 + n * 0.35 + Math.sin(a * 6 + t * 1.6 + r) * 0.06;
      const x = cx + Math.cos(a) * rad * bump;
      const y = cy + Math.sin(a) * rad * bump;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${170 + r * 26 + lv.high * 80}, 95%, ${45 + r * 4}%, ${0.25 + lv.energy * 0.4})`;
    ctx.lineWidth = 1.2 + r * 0.45;
    ctx.stroke();
  }
}

function drawSpectrumTunnel(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const count = 84;
  for (let i = 0; i < count; i++) {
    const p = i / count;
    const z = ((p + t * (0.1 + lv.mid * 0.14)) % 1);
    const rad = Math.max(8, z * Math.min(w, h) * 0.62);
    const a = p * Math.PI * 8 + t * 0.7;
    const x = cx + Math.cos(a) * rad * 0.18;
    const y = cy + Math.sin(a) * rad * 0.18;
    ctx.strokeStyle = `hsla(${200 + p * 170 + lv.high * 80}, 98%, ${50 + p * 22}%, ${0.07 + z * 0.6})`;
    ctx.lineWidth = 1 + (1 - z) * 2.8;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPulseGrid(lv, t, w, h) {
  const cols = 26;
  const rows = 16;
  const cw = w / cols;
  const ch = h / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = (x + y * cols) % freqData.length;
      const n = freqData[idx] / 255;
      const px = x * cw;
      const py = y * ch;
      const s = (0.2 + n * 1.35 + lv.pulse * 0.4) * Math.min(cw, ch);
      const jitter = Math.sin(t * 2.4 + x * 0.8 + y * 0.4) * 2;
      ctx.fillStyle = `hsla(${140 + n * 200}, 94%, ${38 + n * 34}%, ${0.1 + n * 0.64})`;
      ctx.fillRect(px + cw * 0.5 - s * 0.32, py + ch * 0.5 - s * 0.32 + jitter, s * 0.64, s * 0.64);
    }
  }
}

function drawOrbitalNodes(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const pts = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const a = n.a + t * n.v * (0.2 + lv.mid);
    const r = Math.min(w, h) * n.r * (1 + lv.bass * 0.22);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a * 1.3) * r * 0.66;
    pts.push({ x, y, i });
  }

  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    for (let j = i + 1; j < pts.length; j++) {
      const b = pts[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d < 120 + lv.energy * 120) {
        ctx.strokeStyle = `rgba(120, 220, 255, ${0.02 + (1 - d / 240) * 0.24})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  for (const p of pts) {
    ctx.fillStyle = `hsla(${180 + (p.i % 7) * 26 + lv.high * 80}, 95%, 66%, 0.84)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.8 + lv.bass * 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLiquidStripes(lv, t, w, h) {
  const bands = 18;
  for (let i = 0; i < bands; i++) {
    const y = (i + 0.5) * (h / bands);
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const idx = Math.floor((x / w) * (timeData.length - 1));
      const sample = (timeData[idx] - 128) / 128;
      const wave = Math.sin(x * 0.015 + t * (1.1 + i * 0.03) + i * 0.7);
      const amp = 10 + lv.mid * 32 + i * 0.24;
      const yy = y + sample * amp + wave * (6 + lv.bass * 20);
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = `hsla(${190 + i * 9 + lv.high * 90}, 95%, ${36 + i * 1.8}%, ${0.25 + lv.energy * 0.3})`;
    ctx.lineWidth = 1.1 + i * 0.05;
    ctx.stroke();
  }
}

function drawVortexField(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const count = 280;
  for (let i = 0; i < count; i++) {
    const p = i / count;
    const a = p * Math.PI * 18 + t * (0.8 + lv.high * 2.1);
    const r = p * Math.min(w, h) * 0.58;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const size = 0.7 + lv.bass * 2.8 + p * 1.4;
    ctx.fillStyle = `hsla(${260 + p * 120 + lv.mid * 90}, 95%, ${45 + p * 25}%, ${0.15 + (1 - p) * 0.65})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNeonBars(lv, t, w, h) {
  const bars = 80;
  const bw = w / bars;
  for (let i = 0; i < bars; i++) {
    const n = freqData[Math.floor((i / bars) * (freqData.length - 1))] / 255;
    const bh = (0.05 + n * (0.8 + lv.energy)) * h;
    const x = i * bw;
    const y = h - bh;
    ctx.fillStyle = `hsla(${300 - i * 2.1 + lv.high * 140}, 96%, ${40 + n * 34}%, ${0.24 + n * 0.7})`;
    ctx.fillRect(x + 1, y, Math.max(1, bw - 2), bh);

    const capY = y - (4 + Math.sin(t * 8 + i) * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.2 + n * 0.7})`;
    ctx.fillRect(x + 1, capY, Math.max(1, bw - 2), 2);
  }
}

function drawFractalFlower(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const petals = 24;
  for (let layer = 0; layer < 4; layer++) {
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 + t * (0.15 + layer * 0.08);
      const idx = Math.floor((i / petals) * (freqData.length - 1));
      const n = freqData[idx] / 255;
      const len = Math.min(w, h) * (0.14 + layer * 0.08) * (1 + n * 0.65 + lv.bass * 0.35);
      const x = cx + Math.cos(a) * len;
      const y = cy + Math.sin(a) * len;
      ctx.strokeStyle = `hsla(${40 + layer * 80 + i * 2 + lv.high * 120}, 95%, ${40 + layer * 10}%, ${0.2 + n * 0.6})`;
      ctx.lineWidth = 1.2 + n * 2.2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo((cx + x) * 0.5 + Math.sin(t + i) * 20, (cy + y) * 0.5 + Math.cos(t + i) * 20, x, y);
      ctx.stroke();
    }
  }
}

function drawStarfall(lv, t, w, h, dt) {
  for (const s of stars) {
    s.y += (0.08 + lv.energy * 0.46) * s.z * dt;
    s.x += Math.sin(t * 0.5 + s.tw) * 0.0002;
    if (s.y > 1.05) { s.y = -0.02; s.x = Math.random(); }

    const x = s.x * w;
    const y = s.y * h;
    const l = 10 + s.z * 34 + lv.bass * 28;
    const a = 0.2 + Math.sin(t * 2 + s.tw) * 0.12 + lv.high * 0.4;

    ctx.strokeStyle = `rgba(170,220,255,${a})`;
    ctx.lineWidth = 1 + s.z * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - l * 0.2, y - l);
    ctx.stroke();
  }
}

function drawRibbonStorm(lv, t, w, h) {
  const ribbons = 14;
  for (let r = 0; r < ribbons; r++) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 10) {
      const p = x / w;
      const idx = Math.floor(p * (timeData.length - 1));
      const sample = (timeData[idx] - 128) / 128;
      const y = h * 0.5
        + Math.sin(p * 16 + t * (1.4 + r * 0.08) + r) * (42 + lv.mid * 90)
        + sample * (40 + lv.bass * 110)
        + (r - ribbons / 2) * 18;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `hsla(${140 + r * 16 + lv.high * 100}, 95%, ${46 + r * 1.2}%, ${0.18 + lv.energy * 0.35})`;
    ctx.lineWidth = 1.4 + r * 0.1;
    ctx.stroke();
  }

  for (const p of particles) {
    p.x += p.vx * (0.8 + lv.energy * 2.2);
    p.y += p.vy * (0.8 + lv.energy * 2.2);
    if (p.x > 1) p.x = 0; if (p.x < 0) p.x = 1;
    if (p.y > 1) p.y = 0; if (p.y < 0) p.y = 1;
    const x = p.x * w;
    const y = p.y * h;
    ctx.fillStyle = `rgba(200,240,255,${0.2 + lv.high * 0.5})`;
    ctx.beginPath();
    ctx.arc(x, y, p.s * (0.4 + lv.bass * 1.4), 0, Math.PI * 2);
    ctx.fill();
  }
}

const renderers = [
  drawPrismBloom,
  drawSpectrumTunnel,
  drawPulseGrid,
  drawOrbitalNodes,
  drawLiquidStripes,
  drawVortexField,
  drawNeonBars,
  drawFractalFlower,
  drawStarfall,
  drawRibbonStorm,
];

function refreshSceneUI() {
  sceneSelect.value = String(targetScene);
  hudName.textContent = scenes[targetScene];
  sceneLabel.textContent = `Scene ${targetScene + 1} / ${scenes.length}`;
  Array.from(chipList.children).forEach((c, i) => c.classList.toggle('active', i === targetScene));
}

function selectScene(index) {
  if (index === targetScene) return;
  activeScene = morph < 1 ? activeScene : targetScene;
  targetScene = (index + scenes.length) % scenes.length;
  morph = 0;
  autoTimer = 0;
  refreshSceneUI();
}

function stepScene(step) {
  selectScene(targetScene + step);
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (!ready || !analyser) {
    ctx.fillStyle = '#050b14';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(229,241,255,0.8)';
    ctx.font = '600 20px "Plus Jakarta Sans"';
    ctx.fillText('Bitte Audiodatei laden.', 28, 44);
    return;
  }

  analyser.getByteFrequencyData(freqData);
  analyser.getByteTimeDomainData(timeData);
  const lv = levels();
  const t = now / 1000;

  hudEnergy.textContent = `Energy ${Math.round(lv.energy * 100)}%`;
  background(lv, w, h);

  if (autoCycle.checked && !player.paused) {
    autoTimer += dt;
    if (autoTimer > 17) {
      autoTimer = 0;
      stepScene(1);
    }
  }

  beatCooldown -= dt;
  if (beatJump.checked && beatCooldown <= 0 && lv.bass > 0.78 && lv.energy > 0.48 && player.currentTime > 1.5) {
    beatCooldown = 1.2;
    stepScene(1);
  }

  if (morph < 1) morph = Math.min(1, morph + dt * 1.4);

  withAlpha(activeScene === targetScene ? 1 : 1 - morph, () => renderers[activeScene](lv, t, w, h, dt));
  withAlpha(morph, () => renderers[targetScene](lv, t, w, h, dt));
  if (morph >= 1) activeScene = targetScene;

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const vg = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.24, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  ensureAudio();
  player.src = URL.createObjectURL(file);
  trackName.textContent = file.name;
  ready = true;
  setControls(true);

  try {
    await audioCtx.resume();
    await player.play();
  } catch {
    // Browser policy may block autoplay until button click.
  }
});

playBtn.addEventListener('click', async () => {
  if (!ready) return;
  await audioCtx.resume();
  await player.play();
});

pauseBtn.addEventListener('click', () => {
  if (!ready) return;
  player.pause();
});

prevBtn.addEventListener('click', () => stepScene(-1));
nextBtn.addEventListener('click', () => stepScene(1));
sceneSelect.addEventListener('change', (e) => selectScene(Number(e.target.value)));
intensitySlider.addEventListener('input', () => { intensity = Number(intensitySlider.value); });

window.addEventListener('resize', resize);
setupUI();
setControls(false);
resize();
requestAnimationFrame(frame);
