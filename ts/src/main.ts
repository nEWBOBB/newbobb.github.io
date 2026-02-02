import "./style.css";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App container missing");
}

app.innerHTML = `
  <div class="frame">
    <header>
      <div class="logo">Signal Field</div>
      <nav class="nav">
        <a href="/">Start</a>
        <a href="/audio">Audio</a>
        <a href="/vierte">Vierte</a>
      </nav>
    </header>
    <section class="hero">
      <div>
        <h1>TypeScript. Klarer Code. Mehr Kontrolle.</h1>
        <p>
          Dieses Feld reagiert auf deine Mausbewegung. Vite liefert Hot Reload, TypeScript schützt
          vor Fehlern.
        </p>
        <div class="controls">
          <button type="button" data-action="boost">Boost</button>
          <button type="button" data-action="reset">Reset</button>
        </div>
      </div>
      <div class="panel">
        <canvas id="field" width="640" height="380"></canvas>
        <div class="badge">TS + Vite</div>
      </div>
    </section>
    <section class="cards">
      <article>
        <h3>Typed Motion</h3>
        <p>Das Partikel-System ist komplett typisiert und gut wartbar.</p>
      </article>
      <article>
        <h3>Fast Refresh</h3>
        <p>Vite beschleunigt die Entwicklung mit Live Reload.</p>
      </article>
      <article>
        <h3>Saubere Struktur</h3>
        <p>Dateien, Assets, Styles — alles klar getrennt.</p>
      </article>
    </section>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#field");
if (!canvas) {
  throw new Error("Canvas missing");
}

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("2D context missing");
}

const particles: Particle[] = [];
const total = 80;
let energy = 1;
let mouseX = 0;
let mouseY = 0;
let tick = 0;

function resizeCanvas() {
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function spawnParticles() {
  particles.length = 0;
  for (let i = 0; i < total; i += 1) {
    particles.push({
      x: Math.random() * canvas.clientWidth,
      y: Math.random() * canvas.clientHeight,
      vx: (Math.random() - 0.5) * 0.9,
      vy: (Math.random() - 0.5) * 0.9,
      size: 2 + Math.random() * 3,
      hue: 170 + Math.random() * 90
    });
  }
}

function step() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);

  tick += 0.01 * energy;

  particles.forEach((p) => {
    const dx = mouseX - p.x;
    const dy = mouseY - p.y;
    const dist = Math.max(Math.hypot(dx, dy), 40);
    const pull = (120 / dist) * 0.006;
    p.vx += dx * pull;
    p.vy += dy * pull;

    p.x += p.vx * energy;
    p.y += p.vy * energy;
    p.vx *= 0.98;
    p.vy *= 0.98;

    if (p.x < 0 || p.x > width) p.vx *= -1;
    if (p.y < 0 || p.y > height) p.vy *= -1;

    ctx.beginPath();
    ctx.fillStyle = `hsla(${p.hue + Math.sin(tick) * 20}, 80%, 60%, 0.8)`;
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(step);
}

function setEnergy(value: number) {
  energy = value;
}

document.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = event.clientX - rect.left;
  mouseY = event.clientY - rect.top;
});

document.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (action === "boost") {
      setEnergy(1.6);
    }
    if (action === "reset") {
      setEnergy(1);
      spawnParticles();
    }
  });
});

window.addEventListener("resize", () => {
  resizeCanvas();
  spawnParticles();
});

resizeCanvas();
spawnParticles();
step();
