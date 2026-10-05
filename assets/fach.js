// Gemeinsame Daten und Bausteine der Fächer-Seiten (/math/, /physics/, …).
// Eine Quelle für Navigation, Spruch-Leiter, Projektliste und „Weiter“-Link.

window.FAECHER = [
	{ slug: "math", name: "Mathematik", short: "Mathe", color: "#b8a6ff", ladder: 0, naval: true },
	{ slug: "physics", name: "Physik", short: "Physik", color: "#8fb8ff", ladder: 1, naval: false },
	{ slug: "chemistry", name: "Chemie", short: "Chemie", color: "#7bdc9a", ladder: 2, naval: false },
	{ slug: "biology", name: "Biologie", short: "Biologie", color: "#c6e86a", ladder: 3, naval: false },
	{ slug: "psychology", name: "Psychologie", short: "Psychologie", color: "#ff9ec7", ladder: 4, naval: true },
	{ slug: "economics", name: "Mikroökonomie", short: "Ökonomie", color: "#ffd166", ladder: -1, naval: true },
	{ slug: "game-theory", name: "Spieltheorie", short: "Spieltheorie", color: "#ff8a5c", ladder: -1, naval: true },
	{ slug: "persuasion", name: "Überzeugen", short: "Überzeugen", color: "#ff6a8a", ladder: -1, naval: true },
	{ slug: "ethics", name: "Ethik", short: "Ethik", color: "#e8d3a0", ladder: -1, naval: true },
	{ slug: "computers", name: "Informatik", short: "Informatik", color: "#5ce1e6", ladder: -1, naval: true },
];

// Bestehende Projekte, ihrem Fach zugeordnet. Ein Projekt darf in mehreren Fächern stehen.
window.FACH_PROJEKTE = {
	math: [
		{ href: "schall", title: "Musik und Schall", desc: "Obertöne mischen: Fourier zum Anhören." },
		{ href: "schwerkraft", title: "Wie Schwerkraft funktioniert", desc: "Die Wurfparabel: eine quadratische Funktion, die fliegt." },
		{ href: "ki", title: "Wie Sprach-KI funktioniert", desc: "Wörter als Vektoren: mit Bedeutung rechnen." },
		{ href: "ml", title: "7 ML-Algorithmen zum Anfassen", desc: "Kleinste Quadrate, Gradientenabstieg und Entropie zum Ausprobieren." },
	],
	physics: [
		{ href: "schall", title: "Musik und Schall", desc: "Schallwellen, Hörtest, Obertöne, Saiten und Harmonie." },
		{ href: "auftrieb", title: "Warum Dinge schwimmen", desc: "Wasserdruck, Archimedes, Stahlschiffe und U-Boot." },
		{ href: "licht", title: "Licht und Farben", desc: "Wellenlänge, Prisma, Farbmischung und blauer Himmel." },
		{ href: "schwerkraft", title: "Wie Schwerkraft funktioniert", desc: "Freier Fall, Wurfparabel, Umlaufbahnen, Sandkasten." },
		{ href: "strom", title: "Wie Strom funktioniert", desc: "Stromkreis, Ohmsches Gesetz und ein Generator zum Kurbeln." },
		{ href: "magnet", title: "Wie Magnete funktionieren", desc: "Feldlinien, Ørsted und ein Elektromotor." },
		{ href: "energie", title: "Wie Energie funktioniert", desc: "Pendel, Achterbahn, Hebel und Wasserkraft." },
		{ href: "waerme", title: "Wie Wärme funktioniert", desc: "Teilchenbewegung, Schmelzen, Wärmeleitung." },
		{ href: "radio", title: "Wie Radio funktioniert", desc: "Antennen, Wellenlänge, AM und FM." },
		{ href: "atom", title: "Atome und Radioaktivität", desc: "Atomkern, Halbwertszeit und Kettenreaktion." },
		{ href: "ereignishorizont", title: "Ereignishorizont", desc: "Ein raygetracetes Schwarzes Loch im Browser." },
	],
	chemistry: [
		{ href: "feuer", title: "Wie Feuer funktioniert", desc: "Feuerdreieck, Flammenfarben und die Kettenreaktion der Moleküle." },
		{ href: "atom", title: "Atome und Radioaktivität", desc: "Protonen, Neutronen, Elektronen: Atome selbst bauen." },
		{ href: "waerme", title: "Wie Wärme funktioniert", desc: "Aggregatzustände und warum Eis beim Schmelzen nicht wärmer wird." },
	],
	biology: [],
	psychology: [
		{ href: "fernsehen", title: "Wie Fernsehen funktioniert", desc: "Warum dein Gehirn aus Standbildern Bewegung macht." },
	],
	economics: [],
	"game-theory": [],
	persuasion: [],
	ethics: [
		{ href: "agenten", title: "Wie KI-Agenten arbeiten", desc: "Prompt Injection: wem darf eine Maschine gehorchen?" },
	],
	computers: [
		{ href: "telegraf", title: "Wie der Telegraf funktioniert", desc: "Der erste Code: Morsen mit Live-Decoder." },
		{ href: "telefon", title: "Wie das Telefon funktioniert", desc: "Abtastrate und Bits: Stimme wird digital." },
		{ href: "fernsehen", title: "Wie Fernsehen funktioniert", desc: "Pixel, RGB und Videokompression." },
		{ href: "internet", title: "Wie das Internet funktioniert", desc: "Bits, Pakete, Router und DNS." },
		{ href: "ki", title: "Wie Sprach-KI funktioniert", desc: "Tokens, Attention und ein Mini-Modell zum Trainieren." },
		{ href: "agenten", title: "Wie KI-Agenten arbeiten", desc: "Agenten-Schleife, Werkzeuge und MCP." },
		{ href: "ml", title: "7 ML-Algorithmen zum Anfassen", desc: "Regression, Bäume, SVM, KNN und k-Means selbst trainieren." },
	],
};

(() => {
	const all = window.FAECHER;
	const slug = document.body.dataset.fach;
	const me = all.find((f) => f.slug === slug);
	if (!me) return;
	const i = all.indexOf(me);
	const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

	// Navigation über alle Fächer
	const nav = document.querySelector("[data-fach-nav]");
	if (nav) {
		nav.innerHTML = all
			.map((f) => `<a href="../${f.slug}/"${f === me ? ' aria-current="page"' : ""}>${esc(f.short)}</a>`)
			.join("");
		nav.querySelector("[aria-current]")?.scrollIntoView({ block: "nearest", inline: "center" });
	}

	// Die beiden Sprüche, das aktuelle Fach hervorgehoben
	const quote = document.querySelector("[data-fach-quote]");
	if (quote) {
		const ladder = all.filter((f) => f.ladder >= 0).sort((a, b) => a.ladder - b.ladder);
		const steps = ladder
			.map((f, k) => {
				const next = ladder[k + 1];
				const goal = next ? `<a href="../${next.slug}/">${esc(next.name)}</a>` : "<b>Menschen</b>";
				return `<li${f === me ? ' class="is-me"' : ""}>Lerne <a href="../${f.slug}/">${esc(f.name)}</a>, um ${goal} zu verstehen.</li>`;
			})
			.join("");
		const navalList = all
			.filter((f) => f.naval)
			.map((f) => `<a href="../${f.slug}/"${f === me ? ' class="is-me"' : ""} style="--c:${f.color}">${esc(f.name)}</a>`)
			.join("");
		quote.innerHTML = `
			<figure class="f-quote${me.ladder >= 0 ? " is-active" : ""}">
				<figcaption>Die Leiter${me.ladder >= 0 ? ` · Stufe ${me.ladder + 1} von 5` : ""}</figcaption>
				<ol class="f-ladder">${steps}</ol>
			</figure>
			<figure class="f-quote${me.naval ? " is-active" : ""}">
				<figcaption>Naval Ravikant · die Grundlagen${me.naval ? " · dieses Fach gehört dazu" : ""}</figcaption>
				<blockquote lang="en">„Microeconomics, game theory, psychology, persuasion, ethics, mathematics, and computers.“</blockquote>
				<p class="f-chips">${navalList}</p>
			</figure>`;
	}

	// Bestehende Projekte in diesem Fach
	const list = document.querySelector("[data-fach-projects]");
	if (list) {
		const items = window.FACH_PROJEKTE[slug] || [];
		list.innerHTML = items.length
			? items
				.map(
					(p) =>
						`<a class="f-card reveal" href="../${p.href}/"><b>${esc(p.title)}</b><span>${esc(p.desc)}</span><i aria-hidden="true">→</i></a>`
				)
				.join("")
			: `<p class="f-empty">Hier entstehen gerade die ersten Projekte. Bis dahin: das Experiment oben.</p>`;
		const io = new IntersectionObserver((entries) =>
			entries.forEach((en) => {
				if (!en.isIntersecting) return;
				en.target.classList.add("is-in");
				io.unobserve(en.target);
			})
		);
		list.querySelectorAll(".reveal").forEach((el) => io.observe(el));
	}

	// Weiter zum nächsten Fach
	const next = document.querySelector("[data-fach-next]");
	if (next) {
		const n = all[(i + 1) % all.length];
		const label =
			me.ladder >= 0 && n.ladder >= 0 ? "Nächste Stufe der Leiter" : n.ladder === 0 ? "Zurück zum Anfang" : "Nächstes Fach";
		next.innerHTML = `<p>${label} · ${i + 2 > all.length ? 1 : i + 2} von ${all.length}</p><a href="../${n.slug}/">${esc(n.name)} <span>→</span></a>`;
	}
})();
