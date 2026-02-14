const envelope = document.getElementById("envelope");
const seal = document.getElementById("seal");

if (envelope && seal) {
  let opened = false;

  const openEnvelope = () => {
    if (opened) return;
    opened = true;
    envelope.classList.add("is-unsealing");
    seal.setAttribute("aria-label", "Siegel geöffnet");

    window.setTimeout(() => {
      envelope.classList.add("is-opening");
    }, 180);

    window.setTimeout(() => {
      envelope.classList.add("is-open");
    }, 780);
  };

  seal.addEventListener("click", openEnvelope);
  seal.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openEnvelope();
    }
  });
}
