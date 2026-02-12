const canvas = document.getElementById('viz');
const ctx = canvas.getContext('2d');

const player = document.getElementById('player');
const fileInput = document.getElementById('audio-file');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const effectSelect = document.getElementById('effect-select');
const trackName = document.getElementById('track-name');
const autoSwitch = document.getElementById('auto-switch');

const effects = ['rings', 'wave', 'particles'];
let effectIndex = 0;
let currentEffect = effects[0];
let nextEffect = currentEffect;
let transition = 1;
let autoSwitchTimer = 0;

let audioCtx;
let sourceNode;
let analyser;
let freqData;
let timeData;
let isReady = false;

const particles = Array.from({ length: 160 }, () => ({
  x: Math.random(),
  y: Math.random(),
  vx: (Math.random() - 0.5) * 0.0015,
  vy: (Math.random() - 0.5) * 0.0015,
  size: 1 + Math.random() * 2.4,
}));

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const box = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, Math.floor(box.width * ratio));
  canvas.height = Math.max(180, Math.floor(box.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function ensureAudioGraph() {
  if (audioCtx) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.85;

  sourceNode = audioCtx.createMediaElementSource(player);
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  freqData = new Uint8Array(analyser.frequencyBinCount);
  timeData = new Uint8Array(analyser.frequencyBinCount);
}

function setControlsEnabled(enabled) {
  [playBtn, pauseBtn, prevBtn, nextBtn, effectSelect].forEach((el) => {
    el.disabled = !enabled;
  });
}

function selectEffect(name) {
  if (name === nextEffect) return;
  currentEffect = transition < 1 ? currentEffect : nextEffect;
  nextEffect = name;
  transition = 0;
  effectSelect.value = name;
}

function cycleEffect(step) {
  effectIndex = (effectIndex + step + effects.length) % effects.length;
  selectEffect(effects[effectIndex]);
}

function avgBand(from, to) {
  let sum = 0;
  for (let i = from; i < to; i++) sum += freqData[i];
  return sum / Math.max(1, (to - from)) / 255;
}

function getLevels() {
  const n = freqData.length;
  return {
    bass: avgBand(2, Math.floor(n * 0.06)),
    mid: avgBand(Math.floor(n * 0.08), Math.floor(n * 0.24)),
    high: avgBand(Math.floor(n * 0.3), Math.floor(n * 0.55)),
    energy: avgBand(2, Math.floor(n * 0.55)),
  };
}

function drawRings(alpha, t, levels, w, h) {
  if (alpha <= 0.001) return;
  const cx = w * 0.5;
  const cy = h * 0.52;
  const base = Math.min(w, h) * 0.18;

  ctx.save();
  ctx.globalAlpha = alpha;

  for (let i = 0; i < 56; i++) {
    const a = (i / 56) * Math.PI * 2 + t * 0.15;
    const strength = freqData[Math.floor((i / 56) * (freqData.length - 1))] / 255;
    const burst = (0.4 + levels.bass * 1.2 + strength * 1.4) * base;

    const x0 = cx + Math.cos(a) * (base + levels.mid * 20);
    const y0 = cy + Math.sin(a) * (base + levels.mid * 20);
    const x1 = cx + Math.cos(a) * (base + burst);
    const y1 = cy + Math.sin(a) * (base + burst);

    ctx.strokeStyle = `hsla(${180 + i * 2.2 + levels.high * 120}, 95%, ${46 + strength * 24}%, ${0.45 + strength * 0.5})`;
    ctx.lineWidth = 1.5 + strength * 3;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  ctx.restore();
}

function drawWave(alpha, t, levels, w, h) {
  if (alpha <= 0.001) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  const yCenter = h * 0.5;

  for (let lane = 0; lane < 3; lane++) {
    const laneOffset = (lane - 1) * 38;
    ctx.beginPath();

    for (let x = 0; x <= w; x += 6) {
      const idx = Math.min(timeData.length - 1, Math.floor((x / w) * timeData.length));
      const sample = (timeData[idx] - 128) / 128;
      const wobble = Math.sin((x * 0.012) + t * (1.6 + lane * 0.25)) * 18 * (0.2 + levels.mid);
      const y = yCenter + laneOffset + sample * (66 + levels.bass * 120) + wobble;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.strokeStyle = `hsla(${28 + lane * 70 + levels.high * 110}, 92%, ${58 - lane * 8}%, ${0.72 - lane * 0.2})`;
    ctx.lineWidth = 2.4 - lane * 0.55;
    ctx.stroke();
  }

  ctx.restore();
}

function drawParticles(alpha, t, levels, w, h, dt) {
  if (alpha <= 0.001) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  const speed = 0.45 + levels.energy * 2.5;

  for (const p of particles) {
    p.x += p.vx * speed * dt * 60;
    p.y += p.vy * speed * dt * 60;

    if (p.x < 0) p.x = 1;
    if (p.x > 1) p.x = 0;
    if (p.y < 0) p.y = 1;
    if (p.y > 1) p.y = 0;

    const px = p.x * w;
    const py = p.y * h;
    const pulse = 0.6 + levels.high * 2.8 + Math.sin(t * 2 + p.x * 8) * 0.35;
    const r = p.size * pulse;

    ctx.fillStyle = `hsla(${200 + levels.mid * 80 + p.size * 18}, 95%, ${58 + levels.high * 20}%, 0.8)`;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBackdrop(levels, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `rgba(8, 18, 28, ${0.9 - levels.mid * 0.2})`);
  g.addColorStop(1, `rgba(3, 7, 12, ${0.98 - levels.high * 0.18})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = `rgba(255, 183, 3, ${0.05 + levels.bass * 0.18})`;
  ctx.beginPath();
  ctx.arc(w * 0.18, h * 0.2, 110 + levels.energy * 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(62, 193, 211, ${0.05 + levels.high * 0.2})`;
  ctx.beginPath();
  ctx.arc(w * 0.8, h * 0.76, 90 + levels.mid * 150, 0, Math.PI * 2);
  ctx.fill();
}

let lastTs = performance.now();
function frame(ts) {
  requestAnimationFrame(frame);

  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (!isReady || !analyser) {
    ctx.fillStyle = '#08111a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(234, 244, 255, 0.72)';
    ctx.font = '600 20px Sora';
    ctx.fillText('Lade eine Audiodatei, um zu starten.', 30, 50);
    return;
  }

  analyser.getByteFrequencyData(freqData);
  analyser.getByteTimeDomainData(timeData);

  const levels = getLevels();
  drawBackdrop(levels, w, h);

  if (autoSwitch.checked && !player.paused) {
    autoSwitchTimer += dt;
    if (autoSwitchTimer >= 14) {
      autoSwitchTimer = 0;
      cycleEffect(1);
    }
  }

  if (transition < 1) transition = Math.min(1, transition + dt * 1.6);

  const mixIn = transition;
  const mixOut = 1 - transition;
  const time = ts / 1000;

  const drawByName = (name, a) => {
    if (name === 'rings') drawRings(a, time, levels, w, h);
    if (name === 'wave') drawWave(a, time, levels, w, h);
    if (name === 'particles') drawParticles(a, time, levels, w, h, dt);
  };

  if (currentEffect !== nextEffect) {
    drawByName(currentEffect, mixOut);
    drawByName(nextEffect, mixIn);
    if (transition >= 1) currentEffect = nextEffect;
  } else {
    drawByName(currentEffect, 1);
  }
}

fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  ensureAudioGraph();
  const url = URL.createObjectURL(file);
  player.src = url;

  trackName.textContent = file.name;
  setControlsEnabled(true);
  isReady = true;

  try {
    await audioCtx.resume();
    await player.play();
  } catch {
    // Playback may remain blocked until user clicks play.
  }
});

playBtn.addEventListener('click', async () => {
  if (!isReady) return;
  await audioCtx.resume();
  await player.play();
});

pauseBtn.addEventListener('click', () => {
  if (!isReady) return;
  player.pause();
});

prevBtn.addEventListener('click', () => {
  autoSwitchTimer = 0;
  cycleEffect(-1);
});

nextBtn.addEventListener('click', () => {
  autoSwitchTimer = 0;
  cycleEffect(1);
});

effectSelect.addEventListener('change', (e) => {
  autoSwitchTimer = 0;
  effectIndex = effects.indexOf(e.target.value);
  if (effectIndex < 0) effectIndex = 0;
  selectEffect(e.target.value);
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
setControlsEnabled(false);
requestAnimationFrame(frame);
