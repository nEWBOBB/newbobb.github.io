const envelope = document.getElementById("envelope");
const seal = document.getElementById("seal");

if (envelope && seal) {
  let opened = false;

  const openEnvelope = () => {
    if (opened) return;
    opened = true;
    envelope.classList.add("open");
    seal.setAttribute("aria-label", "Siegel geöffnet");
  };

  seal.addEventListener("click", openEnvelope);
  seal.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openEnvelope();
    }
  });

  window.addEventListener("pointermove", (event) => {
    if (opened) return;
    const { innerWidth, innerHeight } = window;
    const x = (event.clientX / innerWidth - 0.5) * 6;
    const y = (event.clientY / innerHeight - 0.5) * -6;
    envelope.style.setProperty("--tilt-y", `${x.toFixed(2)}deg`);
    envelope.style.setProperty("--tilt-x", `${y.toFixed(2)}deg`);
  });

  window.addEventListener("pointerleave", () => {
    envelope.style.setProperty("--tilt-x", "0deg");
    envelope.style.setProperty("--tilt-y", "0deg");
  });
}
