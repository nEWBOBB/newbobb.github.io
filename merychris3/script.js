const weddingDate = new Date("2026-06-27T12:00:00+02:00").getTime();
const countdownIds = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
};

function updateCountdown() {
  const now = Date.now();
  let distance = weddingDate - now;

  if (distance < 0) distance = 0;

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((distance / (1000 * 60)) % 60);
  const seconds = Math.floor((distance / 1000) % 60);

  countdownIds.days.textContent = String(days);
  countdownIds.hours.textContent = String(hours);
  countdownIds.minutes.textContent = String(minutes);
  countdownIds.seconds.textContent = String(seconds);
}

updateCountdown();
setInterval(updateCountdown, 1000);

const photoFrame = document.getElementById("photoFrame");
const couplePhoto = document.getElementById("couplePhoto");
if (couplePhoto && photoFrame) {
  const markMissingImage = () => photoFrame.classList.add("missing-image");
  if (couplePhoto.complete && couplePhoto.naturalWidth === 0) markMissingImage();
  couplePhoto.addEventListener("error", markMissingImage);
}

const music = document.getElementById("backgroundMusic");
const musicToggle = document.getElementById("musicToggle");
const topbar = document.querySelector(".topbar");
const heroSection = document.getElementById("start");

const sections = [...document.querySelectorAll(".section-observe")];
const navLinks = [...document.querySelectorAll(".nav-link")];

// Browser erlauben Ton erst nach einer echten Geste (Tippen, Klicken, Taste).
// Solange der Gast die Musik nicht bewusst ausschaltet, versuchen wir bei jeder Geste zu starten.
let wantsMusic = true;

function syncMusicUi() {
  if (!musicToggle || !music) return;
  const silent = music.paused || music.muted;
  musicToggle.classList.toggle("muted", silent);
  musicToggle.classList.toggle("waiting", wantsMusic && music.paused);
  musicToggle.setAttribute("aria-label", silent ? "Musik abspielen" : "Musik stummschalten");
  musicToggle.setAttribute("aria-pressed", String(!silent));
}

async function startMusic() {
  if (!music) return;
  music.muted = false;
  try {
    await music.play();
  } catch {
    // Noch keine Geste erlaubt; beim nächsten Tippen erneut versuchen.
  }
  syncMusicUi();
}

const gestureEvents = ["click", "touchend", "keydown"];

function onGesture(event) {
  if (!wantsMusic || !music.paused) return;
  if (musicToggle && musicToggle.contains(event.target)) return;
  startMusic().then(() => {
    if (!music.paused) gestureEvents.forEach((e) => document.removeEventListener(e, onGesture));
  });
}

if (music) {
  music.addEventListener("play", syncMusicUi);
  music.addEventListener("pause", syncMusicUi);
  startMusic();
  gestureEvents.forEach((e) => document.addEventListener(e, onGesture, { passive: true }));
}

if (musicToggle && music) {
  musicToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (music.paused || music.muted) {
      wantsMusic = true;
      startMusic();
    } else {
      wantsMusic = false;
      music.pause();
      syncMusicUi();
    }
  });
}

syncMusicUi();

if (topbar && heroSection) {
  const heroObserver = new IntersectionObserver(
    ([entry]) => {
      topbar.classList.toggle("visible", !entry.isIntersecting);
    },
    // Der Streifen hinter der Leiste zählt nicht: Ist nur er noch Foto, gilt das Bild als vorbei.
    { threshold: 0, rootMargin: "-96px 0px 0px 0px" }
  );
  heroObserver.observe(heroSection);
}

// Aktiv ist der letzte Abschnitt, dessen Oberkante das obere Drittel erreicht hat.
let activeId = "";

function updateActiveSection() {
  const line = window.innerHeight * 0.35;
  let current = sections[0] ? sections[0].id : "";
  sections.forEach((section) => {
    if (section.getBoundingClientRect().top <= line) current = section.id;
  });
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 && sections.length) {
    current = sections[sections.length - 1].id;
  }
  if (current === activeId) return;
  activeId = current;
  navLinks.forEach((link) => {
    const isActive = link.dataset.section === current;
    link.classList.toggle("active", isActive);
    if (isActive) link.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  });
}

let activeTicking = false;
window.addEventListener(
  "scroll",
  () => {
    if (activeTicking) return;
    activeTicking = true;
    requestAnimationFrame(() => {
      activeTicking = false;
      updateActiveSection();
    });
  },
  { passive: true }
);
window.addEventListener("resize", updateActiveSection);
updateActiveSection();

const form = document.getElementById("rsvp-form");
const status = document.getElementById("form-status");
const storageKey = "merychris3-rsvp";

const saved = localStorage.getItem(storageKey);
if (saved && form) {
  try {
    const data = JSON.parse(saved);
    if (data.guestName) form.guestName.value = data.guestName;
    if (data.guestCount) form.guestCount.value = data.guestCount;
    if (data.attendance) {
      const radio = form.querySelector(`input[name="attendance"][value="${data.attendance}"]`);
      if (radio) radio.checked = true;
    }
    if (data.message) form.message.value = data.message;
  } catch {
    localStorage.removeItem(storageKey);
  }
}

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const guestName = String(formData.get("guestName") || "").trim();
    const guestCount = String(formData.get("guestCount") || "").trim();
    const attendance = String(formData.get("attendance") || "").trim();
    const message = String(formData.get("message") || "").trim();

    const payload = { guestName, guestCount, attendance, message };
    localStorage.setItem(storageKey, JSON.stringify(payload));

    const subject = encodeURIComponent("Rückmeldung Hochzeit Meryem & Christopher");
    const body = encodeURIComponent(
      [
        `Name: ${guestName}`,
        `Anzahl Personen: ${guestCount}`,
        `Antwort: ${attendance}`,
        `Nachricht: ${message || "-"}`,
      ].join("\n")
    );

    window.location.href = `mailto:meryem-und-christopher@example.com?subject=${subject}&body=${body}`;
    if (status) status.textContent = "Rückmeldung gespeichert. E-Mail-Entwurf wurde geöffnet.";
  });
}
