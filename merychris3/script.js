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

const sections = [...document.querySelectorAll(".section-observe")];
const navLinks = [...document.querySelectorAll(".nav-link")];

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach((link) => {
        link.classList.toggle("active", link.dataset.section === id);
      });
    });
  },
  {
    threshold: 0.38,
  }
);

sections.forEach((section) => observer.observe(section));

const form = document.getElementById("rsvp-form");
const status = document.getElementById("form-status");
const storageKey = "merychris3-rsvp";

const saved = localStorage.getItem(storageKey);
if (saved) {
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
  status.textContent = "Rückmeldung gespeichert. E-Mail-Entwurf wurde geöffnet.";
});
