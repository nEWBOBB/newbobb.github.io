const canvas = document.getElementById('viz');
const ctx = canvas.getContext('2d');

const ui = {
  player: document.getElementById('player'),
  file: document.getElementById('audio-file'),
  play: document.getElementById('play-btn'),
  pause: document.getElementById('pause-btn'),
  prev: document.getElementById('prev-scene-btn'),
  next: document.getElementById('next-scene-btn'),
  sceneSelect: document.getElementById('scene-select'),
  sceneChips: document.getElementById('scene-chips'),
  intensity: document.getElementById('intensity'),
  transition: document.getElementById('transition-speed'),
  glow: document.getElementById('glow'),
  autoCycle: document.getElementById('auto-cycle'),
  beatJump: document.getElementById('beat-jump'),
  trackName: document.getElementById('track-name'),
  sceneName: document.getElementById('scene-name'),
  sceneIndex: document.getElementById('scene-index'),
  energyLabel: document.getElementById('energy-label'),
  recordingState: document.getElementById('recording-state'),
  fps: document.getElementById('fps-select'),
  bitrate: document.getElementById('bitrate-select'),
  record: document.getElementById('record-btn'),
  stopRecord: document.getElementById('stop-record-btn'),
  download: document.getElementById('download-link'),
  recordingTime: document.getElementById('recording-time')
};

const sceneNames = [
  'Prism Bloom',
  'Spectrum Tunnel',
  'Pulse Grid',
  'Orbital Mesh',
  'Liquid Stripes',
  'Vortex Bloom',
  'Neon Skyline',
  'Fractal Petals',
  'Star Drift',
  'Ribbon Storm'
];

let audioCtx;
let analyser;
let source;
let mediaDest;
let freq;
let wave;
let ready = false;

const state = {
  currentScene: 0,
  targetScene: 0,
  transition: 1,
  autoTimer: 0,
  beatCooldown: 0,
  intensity: Number(ui.intensity.value),
  transitionSpeed: Number(ui.transition.value),
  glow: Number(ui.glow.value)
};

const rec = {
  recorder: null,
  chunks: [],
  stream: null,
  startAt: 0,
  timer: null,
  url: ''
};

const particles = Array.from({ length: 220 }, () => ({
  x: Math.random(),
  y: Math.random(),
  vx: (Math.random() - 0.5) * 0.002,
  vy: (Math.random() - 0.5) * 0.002,
  s: 1 + Math.random() * 2.8
}));

const stars = Array.from({ length: 260 }, () => ({
  x: Math.random(),
  y: Math.random(),
  z: 0.1 + Math.random() * 1.8,
  tw: Math.random() * Math.PI * 2
}));

const nodes = Array.from({ length: 44 }, (_, i) => ({
  a: (i / 44) * Math.PI * 2,
  r: 0.18 + Math.random() * 0.35,
  v: 0.2 + Math.random() * 0.8
}));

function resize() {
  const ratio = window.devicePixelRatio || 1;
  const b = canvas.getBoundingClientRect();
  canvas.width = Math.max(360, Math.floor(b.width * ratio));
  canvas.height = Math.max(220, Math.floor(b.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function setupAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.84;

  mediaDest = audioCtx.createMediaStreamDestination();
  source = audioCtx.createMediaElementSource(ui.player);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  analyser.connect(mediaDest);

  freq = new Uint8Array(analyser.frequencyBinCount);
  wave = new Uint8Array(analyser.frequencyBinCount);
}

function setPlaybackEnabled(enabled) {
  [ui.play, ui.pause, ui.prev, ui.next, ui.sceneSelect, ui.record].forEach((el) => {
    el.disabled = !enabled;
  });
}

function avg(start, end) {
  let sum = 0;
  for (let i = start; i < end; i++) sum += freq[i];
  return (sum / Math.max(1, end - start)) / 255;
}

function levels() {
  const n = freq.length;
  const bass = avg(2, Math.floor(n * 0.08));
  const mid = avg(Math.floor(n * 0.08), Math.floor(n * 0.3));
  const high = avg(Math.floor(n * 0.3), Math.floor(n * 0.65));
  const energy = avg(2, Math.floor(n * 0.65));
  return { bass, mid, high, energy, pulse: (bass * 0.55 + mid * 0.3 + high * 0.15) * state.intensity };
}

function setScene(index) {
  const length = sceneNames.length;
  const next = (index + length) % length;
  if (next === state.targetScene) return;
  state.currentScene = state.transition < 1 ? state.currentScene : state.targetScene;
  state.targetScene = next;
  state.transition = 0;
  state.autoTimer = 0;
  renderSceneUI();
}

function renderSceneUI() {
  ui.sceneSelect.value = String(state.targetScene);
  ui.sceneName.textContent = sceneNames[state.targetScene];
  ui.sceneIndex.textContent = `${state.targetScene + 1} / ${sceneNames.length}`;
  Array.from(ui.sceneChips.children).forEach((el, i) => {
    el.classList.toggle('active', i === state.targetScene);
  });
}

function drawBackground(lv, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `rgba(5, 10, 18, ${0.86 - lv.high * 0.16})`);
  g.addColorStop(1, `rgba(3, 6, 12, ${0.98 - lv.mid * 0.15})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const glow = 120 + lv.energy * 220;
  const alpha = state.glow;
  ctx.fillStyle = `rgba(69, 224, 255, ${(0.05 + lv.high * 0.15) * alpha})`;
  ctx.beginPath();
  ctx.arc(w * 0.16, h * 0.2, glow, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 93, 199, ${(0.05 + lv.bass * 0.18) * alpha})`;
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

function scene0(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  for (let layer = 0; layer < 8; layer++) {
    const base = Math.min(w, h) * (0.08 + layer * 0.045) * (1 + lv.bass * 0.3);
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const idx = Math.floor((i / 120) * (freq.length - 1));
      const n = freq[idx] / 255;
      const r = base * (1 + n * 0.34 + Math.sin(a * 5 + t * 1.7 + layer) * 0.06);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${170 + layer * 24 + lv.high * 90}, 95%, ${42 + layer * 4}%, ${0.22 + lv.energy * 0.48})`;
    ctx.lineWidth = 1 + layer * 0.36;
    ctx.stroke();
  }
}

function scene1(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  for (let i = 0; i < 90; i++) {
    const p = i / 90;
    const z = (p + t * (0.1 + lv.mid * 0.2)) % 1;
    const rad = Math.max(6, z * Math.min(w, h) * 0.64);
    const a = p * Math.PI * 7 + t * 0.8;
    const x = cx + Math.cos(a) * rad * 0.22;
    const y = cy + Math.sin(a) * rad * 0.22;
    ctx.strokeStyle = `hsla(${200 + p * 160 + lv.high * 90}, 96%, ${48 + p * 20}%, ${0.08 + z * 0.6})`;
    ctx.lineWidth = 1 + (1 - z) * 2.2;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function scene2(lv, t, w, h) {
  const cols = 30;
  const rows = 18;
  const cw = w / cols;
  const ch = h / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) % freq.length;
      const n = freq[i] / 255;
      const s = (0.2 + n * 1.2 + lv.pulse * 0.5) * Math.min(cw, ch);
      const ox = Math.sin(t * 1.4 + x * 0.4) * 2;
      const oy = Math.cos(t * 1.2 + y * 0.5) * 2;
      ctx.fillStyle = `hsla(${130 + n * 210}, 95%, ${35 + n * 36}%, ${0.1 + n * 0.7})`;
      ctx.fillRect(x * cw + cw * 0.5 - s * 0.3 + ox, y * ch + ch * 0.5 - s * 0.3 + oy, s * 0.6, s * 0.6);
    }
  }
}

function scene3(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const points = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const a = n.a + t * n.v * (0.3 + lv.mid);
    const r = Math.min(w, h) * n.r * (1 + lv.bass * 0.3);
    points.push({
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a * 1.2) * r * 0.7,
      i
    });
  }

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i];
      const b = points[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 150 + lv.energy * 90) {
        ctx.strokeStyle = `rgba(120,220,255,${0.03 + (1 - d / 240) * 0.28})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  for (const p of points) {
    ctx.fillStyle = `hsla(${180 + (p.i % 9) * 18 + lv.high * 80}, 95%, 64%, 0.9)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5 + lv.bass * 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function scene4(lv, t, w, h) {
  const bands = 20;
  for (let i = 0; i < bands; i++) {
    const y = (i + 0.5) * (h / bands);
    ctx.beginPath();
    for (let x = 0; x <= w; x += 7) {
      const idx = Math.floor((x / w) * (wave.length - 1));
      const sample = (wave[idx] - 128) / 128;
      const wob = Math.sin(x * 0.014 + t * (1.1 + i * 0.04) + i * 0.8);
      const amp = 8 + lv.mid * 30 + i * 0.25;
      const yy = y + sample * amp + wob * (6 + lv.bass * 18);
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = `hsla(${190 + i * 8 + lv.high * 80}, 95%, ${36 + i * 1.7}%, ${0.24 + lv.energy * 0.33})`;
    ctx.lineWidth = 1 + i * 0.06;
    ctx.stroke();
  }
}

function scene5(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  for (let i = 0; i < 300; i++) {
    const p = i / 300;
    const a = p * Math.PI * 18 + t * (0.8 + lv.high * 2.3);
    const r = p * Math.min(w, h) * 0.6;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    ctx.fillStyle = `hsla(${250 + p * 120 + lv.mid * 100}, 95%, ${45 + p * 24}%, ${0.12 + (1 - p) * 0.62})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.7 + lv.bass * 2.8 + p * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function scene6(lv, t, w, h) {
  const bars = 96;
  const bw = w / bars;
  for (let i = 0; i < bars; i++) {
    const n = freq[Math.floor((i / bars) * (freq.length - 1))] / 255;
    const bh = (0.08 + n * (0.9 + lv.energy)) * h;
    const x = i * bw;
    const y = h - bh;
    ctx.fillStyle = `hsla(${320 - i * 2.2 + lv.high * 130}, 95%, ${38 + n * 34}%, ${0.24 + n * 0.68})`;
    ctx.fillRect(x + 1, y, Math.max(1, bw - 2), bh);
    ctx.fillStyle = `rgba(255,255,255,${0.2 + n * 0.6})`;
    ctx.fillRect(x + 1, y - 3 + Math.sin(t * 6 + i) * 1.5, Math.max(1, bw - 2), 2);
  }
}

function scene7(lv, t, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const petals = 28;
  for (let layer = 0; layer < 5; layer++) {
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 + t * (0.15 + layer * 0.08);
      const idx = Math.floor((i / petals) * (freq.length - 1));
      const n = freq[idx] / 255;
      const len = Math.min(w, h) * (0.12 + layer * 0.06) * (1 + n * 0.68 + lv.bass * 0.35);
      const x = cx + Math.cos(a) * len;
      const y = cy + Math.sin(a) * len;
      ctx.strokeStyle = `hsla(${38 + layer * 68 + i * 2 + lv.high * 100}, 95%, ${38 + layer * 12}%, ${0.18 + n * 0.66})`;
      ctx.lineWidth = 1 + n * 2.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo((cx + x) * 0.5 + Math.sin(t + i) * 20, (cy + y) * 0.5 + Math.cos(t + i) * 20, x, y);
      ctx.stroke();
    }
  }
}

function scene8(lv, t, w, h, dt) {
  for (const s of stars) {
    s.y += (0.08 + lv.energy * 0.5) * s.z * dt;
    s.x += Math.sin(t * 0.4 + s.tw) * 0.00018;
    if (s.y > 1.06) { s.y = -0.03; s.x = Math.random(); }
    const x = s.x * w;
    const y = s.y * h;
    const len = 9 + s.z * 30 + lv.bass * 26;
    const a = 0.16 + Math.sin(t * 2 + s.tw) * 0.1 + lv.high * 0.4;
    ctx.strokeStyle = `rgba(168,223,255,${a})`;
    ctx.lineWidth = 1 + s.z * 0.75;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * 0.24, y - len);
    ctx.stroke();
  }
}

function scene9(lv, t, w, h, dt) {
  const ribbons = 14;
  for (let r = 0; r < ribbons; r++) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 10) {
      const p = x / w;
      const idx = Math.floor(p * (wave.length - 1));
      const sample = (wave[idx] - 128) / 128;
      const y = h * 0.5
        + Math.sin(p * 16 + t * (1.4 + r * 0.08) + r) * (42 + lv.mid * 90)
        + sample * (36 + lv.bass * 108)
        + (r - ribbons / 2) * 18;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `hsla(${140 + r * 16 + lv.high * 100}, 95%, ${46 + r * 1.1}%, ${0.18 + lv.energy * 0.36})`;
    ctx.lineWidth = 1.3 + r * 0.11;
    ctx.stroke();
  }

  for (const p of particles) {
    p.x += p.vx * (0.8 + lv.energy * 2.2) * dt * 60;
    p.y += p.vy * (0.8 + lv.energy * 2.2) * dt * 60;
    if (p.x > 1) p.x = 0;
    if (p.x < 0) p.x = 1;
    if (p.y > 1) p.y = 0;
    if (p.y < 0) p.y = 1;
    const x = p.x * w;
    const y = p.y * h;
    ctx.fillStyle = `rgba(200,244,255,${0.18 + lv.high * 0.56})`;
    ctx.beginPath();
    ctx.arc(x, y, p.s * (0.42 + lv.bass * 1.4), 0, Math.PI * 2);
    ctx.fill();
  }
}

const scenes = [scene0, scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8, scene9];

function pickMimeType() {
  const preferred = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm'
  ];
  for (const type of preferred) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

function clearDownloadUrl() {
  if (rec.url) {
    URL.revokeObjectURL(rec.url);
    rec.url = '';
  }
  ui.download.classList.add('disabled');
  ui.download.setAttribute('aria-disabled', 'true');
  ui.download.href = '#';
}

function updateRecordingTime() {
  const secs = Math.max(0, Math.floor((performance.now() - rec.startAt) / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  ui.recordingTime.textContent = `Recording ${mm}:${ss}`;
}

function stopRecording() {
  if (!rec.recorder) return;
  if (rec.recorder.state !== 'inactive') rec.recorder.stop();
}

function startRecording() {
  if (!ready || !mediaDest) return;
  if (!window.MediaRecorder) {
    ui.recordingTime.textContent = 'MediaRecorder wird in diesem Browser nicht unterstuetzt.';
    return;
  }

  const mimeType = pickMimeType();
  if (!mimeType) {
    ui.recordingTime.textContent = 'Kein passendes Videoformat verfuegbar.';
    return;
  }

  clearDownloadUrl();

  const fps = Number(ui.fps.value);
  const bitrate = Number(ui.bitrate.value);
  const videoStream = canvas.captureStream(fps);
  const output = new MediaStream();
  videoStream.getVideoTracks().forEach((t) => output.addTrack(t));
  mediaDest.stream.getAudioTracks().forEach((t) => output.addTrack(t));

  rec.chunks = [];
  rec.stream = output;

  rec.recorder = new MediaRecorder(output, {
    mimeType,
    videoBitsPerSecond: bitrate
  });

  rec.recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) rec.chunks.push(e.data);
  };

  rec.recorder.onstop = () => {
    clearInterval(rec.timer);
    rec.timer = null;
    ui.stopRecord.disabled = true;
    ui.record.disabled = false;
    ui.recordingState.classList.remove('live');
    ui.recordingState.textContent = 'Idle';

    const blob = new Blob(rec.chunks, { type: mimeType });
    rec.url = URL.createObjectURL(blob);

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    ui.download.href = rec.url;
    ui.download.download = `audio-director-${stamp}.webm`;
    ui.download.classList.remove('disabled');
    ui.download.removeAttribute('aria-disabled');
    ui.recordingTime.textContent = `Export bereit (${Math.round(blob.size / 1024 / 1024 * 10) / 10} MB)`;

    if (rec.stream) {
      rec.stream.getTracks().forEach((t) => t.stop());
      rec.stream = null;
    }
  };

  rec.recorder.start(250);
  rec.startAt = performance.now();
  ui.stopRecord.disabled = false;
  ui.record.disabled = true;
  ui.recordingState.classList.add('live');
  ui.recordingState.textContent = 'Recording';
  rec.timer = setInterval(updateRecordingTime, 250);
  updateRecordingTime();
}

function setupSceneControls() {
  sceneNames.forEach((name, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `${i + 1}. ${name}`;
    ui.sceneSelect.appendChild(option);

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.textContent = String(i + 1);
    chip.title = name;
    chip.addEventListener('click', () => setScene(i));
    ui.sceneChips.appendChild(chip);
  });

  renderSceneUI();
}

let lastTs = performance.now();
function frame(ts) {
  requestAnimationFrame(frame);

  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (!ready || !analyser) {
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(237,245,255,0.8)';
    ctx.font = '600 21px Manrope';
    ctx.fillText('Audio-Datei laden, dann Szenen bauen und exportieren.', 28, 46);
    return;
  }

  analyser.getByteFrequencyData(freq);
  analyser.getByteTimeDomainData(wave);

  const lv = levels();
  const t = ts / 1000;
  ui.energyLabel.textContent = `Energy ${Math.round(lv.energy * 100)}%`;

  drawBackground(lv, w, h);

  if (ui.autoCycle.checked && !ui.player.paused) {
    state.autoTimer += dt;
    if (state.autoTimer > 15) {
      state.autoTimer = 0;
      setScene(state.targetScene + 1);
    }
  }

  state.beatCooldown -= dt;
  if (
    ui.beatJump.checked &&
    state.beatCooldown <= 0 &&
    lv.bass > 0.78 &&
    lv.energy > 0.45 &&
    ui.player.currentTime > 1.4
  ) {
    state.beatCooldown = 1.2;
    setScene(state.targetScene + 1);
  }

  if (state.transition < 1) {
    state.transition = Math.min(1, state.transition + dt * state.transitionSpeed);
  }

  const a = state.currentScene;
  const b = state.targetScene;

  withAlpha(a === b ? 1 : 1 - state.transition, () => scenes[a](lv, t, w, h, dt));
  withAlpha(state.transition, () => scenes[b](lv, t, w, h, dt));

  if (state.transition >= 1) state.currentScene = state.targetScene;

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.25, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, `rgba(0,0,0,${0.22 + state.glow * 0.2})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

ui.file.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setupAudio();
  ui.player.src = URL.createObjectURL(file);
  ui.trackName.textContent = file.name;
  setPlaybackEnabled(true);
  ready = true;

  try {
    await audioCtx.resume();
    await ui.player.play();
  } catch {
    // User can press play manually if autoplay is blocked.
  }
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

ui.prev.addEventListener('click', () => setScene(state.targetScene - 1));
ui.next.addEventListener('click', () => setScene(state.targetScene + 1));
ui.sceneSelect.addEventListener('change', (e) => setScene(Number(e.target.value)));
ui.intensity.addEventListener('input', () => { state.intensity = Number(ui.intensity.value); });
ui.transition.addEventListener('input', () => { state.transitionSpeed = Number(ui.transition.value); });
ui.glow.addEventListener('input', () => { state.glow = Number(ui.glow.value); });
ui.record.addEventListener('click', startRecording);
ui.stopRecord.addEventListener('click', stopRecording);

window.addEventListener('resize', resize);

setupSceneControls();
setPlaybackEnabled(false);
ui.stopRecord.disabled = true;
resize();
requestAnimationFrame(frame);
